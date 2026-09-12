/**
 * D-064/D-065 — 站点绑定链路真站点实证（`npm run test:binding`）。
 *
 * 为什么必须单独有它：`test:ui` 只证明「保存/测试连接」；`test:e2e` 用临时 manifest
 * 预授权本地站点、**绕过**了「点插件图标→绑定」这一段。用户真实故障（配置正常、站点
 * 正确，却恒「无活跃站点」）恰好落在这个盲区。本脚本用：
 *   - 真实扩展 `dist/`（JS 字节与发布一致）
 *   - 真实站点 `http://localhost:5173`（lgdl-web：`/.well-known/web-cli.json` + `<link rel="web-cli">`）
 *   - 真实 Chromium（`.pw-browsers`，headless=new）
 *   - 本地 mock LLM（绝不打真实厂商）
 * 逐步取证 6 步全链：绑定 → 注入 → 发现 supported → 授权（http host permission 路径）
 *   → 发送按钮可用 → 输入 `11111` 跑通一轮对话。
 *
 * ── 两处如实披露（不是静默降级） ─────────────────────────────────────────────
 * ① **无法脚本触发 `chrome.action.onClicked`**：Chrome 没有暴露程序化点击工具栏图标的
 *    API。本脚本改用与 `onClicked` **同一个 `bindTab()`** 的等价绑定消息（`rebind`），
 *    并另行**实时断言**修复后的关键运行时事实：`openPanelOnActionClick === false`
 *    （这是让 `onClicked` 能触发的根因修复）+ `chrome.sidePanel.open` 可用（Chrome 116+）。
 *    图标点击→绑定 的 wiring 由 `test/binding-wiring.test.ts` 静态钉住。
 * ② **headless 无法合成原生权限弹窗**：`chrome.permissions.request` 对**未授权**的
 *    optional host 会一直 pending（阶段 0 用 4s race 如实记录为 TIMEOUT）。因此主链在
 *    临时 dist 副本里把 `http://localhost:5173/*` 预先加入 `host_permissions`（**JS
 *    字节零改动**），从而让真实的 `#authorize` 点击路径里 `permissions.request` 立即
 *    `true`（已授权不弹窗）——覆盖 http origin pattern 与授权回执的真实代码路径。
 *
 * 依赖：Node ≥ 22（全局 WebSocket / fetch）、`.pw-browsers` Chromium（或 CHROME_BIN）。
 * 前置：`npm run build --workspace @lgdl/web-cli-plugin` + `packages/lgdl-web/dist` 已构建。
 * 站点：优先复用已在 `:5173` 运行的 lgdl-web；否则用 `vite preview` 起本仓 dist。
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(root, '..', '..');
const dist = resolve(root, 'dist');
const lgdlDist = resolve(root, '..', 'lgdl-web', 'dist');
const CHROME = process.env.CHROME_BIN || resolve(repoRoot, '.pw-browsers', 'chromium-1234', 'chrome-linux64', 'chrome');
const SITE_ORIGIN = 'http://localhost:5173';
const SITE_PATTERN = `${SITE_ORIGIN}/*`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── assertions ───────────────────────────────────────────────────────────────
const failures = [];
const observations = [];
let passes = 0;
function check(cond, label, detail) {
  if (cond) {
    passes += 1;
    console.log(`  ✔ ${label}`);
  } else {
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
  }
}
function observe(text) {
  observations.push(text);
  console.log(`  · [观测] ${text}`);
}

// ── CDP client ───────────────────────────────────────────────────────────────
async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject: rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
      return;
    }
    if (msg.method) for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
  });
  return {
    send(method, params = {}) {
      return new Promise((res, rej) => {
        const id = ++seq;
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, fn) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(fn);
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(cdp, expression, timeoutMs = 30000) {
  const res = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true, timeout: timeoutMs });
  if (res.exceptionDetails) throw new Error(`evaluate failed: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`.trim());
  return res.result?.value;
}

async function findTarget(base, predicate, tries = 120, gapMs = 250) {
  for (let i = 0; i < tries; i += 1) {
    const list = await fetch(`${base}/json/list`).then((r) => r.json()).catch(() => []);
    const t = list.find(predicate);
    if (t) return t;
    await sleep(gapMs);
  }
  return undefined;
}

async function waitFor(cdp, expression, tries = 100, gapMs = 200) {
  for (let i = 0; i < tries; i += 1) {
    const v = await evaluate(cdp, expression).catch(() => undefined);
    if (v) return v;
    await sleep(gapMs);
  }
  return undefined;
}

async function boxOf(cdp, selector) {
  return evaluate(
    cdp,
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null;
      el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
  );
}
async function realClick(cdp, selector) {
  const box = await boxOf(cdp, selector);
  if (!box) throw new Error(`selector not found: ${selector}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
}
async function typeText(cdp, text) {
  for (const ch of text) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  }
}

// ── mock LLM (OpenAI-compatible, non-streaming) ──────────────────────────────
/** Every request body seen by the mock, so the test can inspect the real `tools`. */
const llmRequests = [];
function startMockLlm() {
  const server = createServer((req, res) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': req.headers['access-control-request-headers'] || 'authorization, content-type',
      'access-control-allow-private-network': 'true',
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let user = '';
        try {
          const body = JSON.parse(raw);
          // Capture the actual tools array the plugin sent (name legality gate).
          llmRequests.push({ tools: Array.isArray(body.tools) ? body.tools : [], messages: body.messages ?? [] });
          const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user');
          user = typeof lastUser?.content === 'string' ? lastUser.content : '';
        } catch {
          /* tolerate */
        }
        res.writeHead(200, { ...cors, 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'chatcmpl-binding',
            object: 'chat.completion',
            created: 0,
            model: 'binding-mock',
            choices: [{ index: 0, message: { role: 'assistant', content: `收到 ${user}（binding mock）` }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      });
      return;
    }
    res.writeHead(404, cors);
    res.end('not found');
  });
  return new Promise((resolveListen) => {
    server.listen(0, '127.0.0.1', () => resolveListen({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

// ── real lgdl-web site on :5173 ──────────────────────────────────────────────
async function siteReachable() {
  try {
    const res = await fetch(`${SITE_ORIGIN}/.well-known/web-cli.json`);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureSite() {
  if (await siteReachable()) {
    observe(`站点复用已在 ${SITE_ORIGIN} 运行的 lgdl-web（真实 dev/preview 服务）`);
    return { proc: null, origin: SITE_ORIGIN };
  }
  if (!(await stat(join(lgdlDist, 'index.html')).then(() => true).catch(() => false))) {
    console.error(`✖ ${SITE_ORIGIN} 未运行，且 ${lgdlDist} 不存在：请先 npm run build --workspace @lgdl/lgdl-web（或手动起 vite dev）`);
    process.exit(1);
  }
  const viteBin = resolve(repoRoot, 'node_modules', '.bin', 'vite');
  const proc = spawn(viteBin, ['preview', '--port', '5173', '--strictPort'], { cwd: resolve(root, '..', 'lgdl-web'), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i += 1) {
    if (await siteReachable()) {
      observe(`站点由本脚本用 vite preview 起在 ${SITE_ORIGIN}（本仓 lgdl-web/dist）`);
      return { proc, origin: SITE_ORIGIN };
    }
    await sleep(250);
  }
  console.error(`✖ 无法在 ${SITE_ORIGIN} 起 lgdl-web：\n${log.slice(-1000)}`);
  proc.kill('SIGKILL');
  process.exit(1);
}

// ── chrome launch helpers ────────────────────────────────────────────────────
async function launchChrome(extDir, tag) {
  const work = await mkdtemp(join(tmpdir(), `web-cli-binding-${tag}-`));
  const profile = join(work, 'profile');
  const port = 9800 + Math.floor(Math.random() * 500);
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--user-data-dir=${profile}`,
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let log = '';
  chrome.stdout.on('data', (d) => (log += d));
  chrome.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  let sw;
  for (let i = 0; i < 120 && !sw; i += 1) {
    const list = await fetch(`${base}/json/list`).then((r) => r.json()).catch(() => []);
    for (const t of list) {
      if (t.type !== 'service_worker' || !t.url.startsWith('chrome-extension://')) continue;
      try {
        const probe = await connectCdp(t.webSocketDebuggerUrl);
        await probe.send('Runtime.enable');
        if ((await evaluate(probe, `chrome.runtime.getManifest().name`)) === 'web-cli plugin') {
          sw = probe;
          break;
        }
        probe.close();
      } catch {
        /* not ours */
      }
    }
    if (!sw) await sleep(250);
  }
  return { work, chrome, base, sw, log: () => log };
}

// ── phase 0: real dist — reproduce the root cause & assert the wiring fix ─────
async function phase0() {
  console.log(`\n▶ 阶段 0：真实 dist（未改动 manifest）复现根因 + 断言运行时修复`);
  const { work, chrome, base, sw, log } = await launchChrome(dist, 'real');
  try {
    check(Boolean(sw), '#0 service worker 加载且可达');
    if (!sw) return;

    const runtime = await evaluate(
      sw,
      `(async () => {
        const m = chrome.runtime.getManifest();
        const behavior = await chrome.sidePanel.getPanelBehavior().catch((e) => ({ error: String(e) }));
        return {
          optionalHost: m.optional_host_permissions ?? [],
          minChrome: m.minimum_chrome_version,
          tabsPermission: (m.permissions ?? []).includes('tabs'),
          behavior,
          hasOpen: typeof chrome.sidePanel.open,
        };
      })()`,
    );
    check(runtime.optionalHost.includes('http://*/*'), '#0a optional_host_permissions 含 http://*/*（http 开发站可申请权限）', JSON.stringify(runtime.optionalHost));
    check(Number(runtime.minChrome) >= 116, '#0b minimum_chrome_version ≥ 116（sidePanel.open 需要）', runtime.minChrome);
    check(runtime.behavior?.openPanelOnActionClick === false, '#0c 运行时 openPanelOnActionClick=false（action.onClicked 可触发=绑定链路不再死代码）', JSON.stringify(runtime.behavior));
    check(runtime.hasOpen === 'function', '#0d chrome.sidePanel.open 可用（可在同一手势内开侧栏）');
    check(runtime.tabsPermission === false, '#0e 未新增 tabs 权限（最小权限红线）');

    // Reproduce the exact root cause: without tabs/host grant the active tab URL is
    // unreadable → projectActiveTab('') → old misleading reason.
    const tabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(SITE_ORIGIN)} }).then((t) => t.id)`);
    await sleep(2000);
    const tabUrl = await evaluate(sw, `chrome.tabs.query({ active: true, currentWindow: true }).then((ts) => (ts[0]?.url === undefined ? '(undefined)' : ts[0].url))`);
    check(tabUrl === '(undefined)', '#0f 复现根因：无 host 授权时 tab.url 为 undefined（旧「没有可读取的地址」的真因）', String(tabUrl));
    observe(`#0f tab ${tabId} 的 url 观测值 = ${tabUrl}`);

    const extId = await evaluate(sw, `chrome.runtime.id`);
    await evaluate(sw, `chrome.tabs.create({ url: 'chrome-extension://${extId}/sidepanel.html' }).then((t) => t.id)`);
    const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    if (spTarget) {
      const page = await connectCdp(spTarget.webSocketDebuggerUrl);
      await page.send('Runtime.enable');
      await sleep(800);
      // headless 无法合成原生权限弹窗：未授权的 optional host 请求会一直 pending。
      const attempted = await evaluate(
        page,
        `Promise.race([
          chrome.permissions.request({ origins: [${JSON.stringify(SITE_PATTERN)}] }).then((v) => 'RESOLVED:' + v).catch((e) => 'ERR:' + String(e)),
          new Promise((r) => setTimeout(() => r('PENDING_TIMEOUT'), 4000)),
        ])`,
        9000,
      );
      observe(`#0g 未授权头下 chrome.permissions.request(${SITE_PATTERN}) = ${attempted}（headless 无原生弹窗 → 主链改用临时 dist 预授权，见披露②）`);
      check(attempted === 'PENDING_TIMEOUT' || String(attempted).startsWith('ERR:'), '#0g 如实记录：未授权请求在 headless 不可合成（非静默失败）', String(attempted));
      page.close();
    }
    sw.close();
  } catch (err) {
    failures.push(`阶段 0 harness error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('✖ 阶段 0 harness error:', err);
    if (process.env.BINDING_DEBUG) console.error(log().slice(-2000));
  } finally {
    chrome.kill('SIGKILL');
    await sleep(300);
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

// ── phase 1: full chain on the real site ─────────────────────────────────────
async function phase1(mock) {
  console.log(`\n▶ 阶段 1：真站点全链路（绑定 → 注入 → 发现 → 授权 → 发送可用 → mock 对话）`);
  const work = await mkdtemp(join(tmpdir(), 'web-cli-binding-ext-'));
  const extDir = join(work, 'ext');
  await cp(dist, extDir, { recursive: true });
  // DISCLOSURE ②: pre-grant the site host permission in a temp manifest copy so
  // the *real* #authorize click path can be exercised (headless cannot show the
  // native prompt). dist JS is byte-identical to the release build.
  const manifest = JSON.parse(await readFile(join(extDir, 'manifest.json'), 'utf8'));
  manifest.host_permissions = [...manifest.host_permissions, SITE_PATTERN];
  await writeFile(join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  observe(`临时 dist：host_permissions += ${SITE_PATTERN}（JS 字节未改；仅用于绕过 headless 无原生弹窗，见披露②）`);

  const { work: chromeWork, chrome, base, sw, log } = await launchChrome(extDir, 'chain');
  try {
    check(Boolean(sw), '#1 service worker 可达');
    if (!sw) throw new Error('no sw');

    const siteTabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(SITE_ORIGIN)} }).then((t) => t.id)`, 20000);
    await sleep(2500);
    const extId = await evaluate(sw, `chrome.runtime.id`);
    const spTabId = await evaluate(sw, `chrome.tabs.create({ url: 'chrome-extension://${extId}/sidepanel.html' }).then((t) => t.id)`);
    const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    if (!spTarget) throw new Error('sidepanel target not found');
    const ext = await connectCdp(spTarget.webSocketDebuggerUrl);
    await ext.send('Runtime.enable');
    await ext.send('Log.enable');
    await ext.send('Page.enable');
    const spExceptions = [];
    const spConsoleErrors = [];
    ext.on('Runtime.exceptionThrown', (p) => spExceptions.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    ext.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') spConsoleErrors.push(p.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    });
    ext.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error') spConsoleErrors.push(p.entry.text);
    });

    // #3 the site really declares web-cli (well-known + html link)
    const siteTarget = await findTarget(base, (t) => t.type === 'page' && t.url.startsWith(SITE_ORIGIN));
    check(Boolean(siteTarget), '#3 真实站点页打开（http://localhost:5173）');
    if (siteTarget) {
      const site = await connectCdp(siteTarget.webSocketDebuggerUrl);
      await site.send('Runtime.enable');
      const declaration = await evaluate(
        site,
        `(async () => {
          const wellKnown = await fetch('/.well-known/web-cli.json').then((r) => ({ status: r.status, ok: r.ok })).catch((e) => ({ status: 0, ok: false, error: String(e) }));
          const link = document.querySelector('link[rel="web-cli"]');
          return { wellKnown, href: link ? link.getAttribute('href') : null };
        })()`,
      );
      check(declaration.wellKnown.ok === true, '#3b 站点 /.well-known/web-cli.json 可读取', JSON.stringify(declaration.wellKnown));
      check(Boolean(declaration.href), '#3c 站点 index.html 含 <link rel="web-cli">', String(declaration.href));
      site.close();
    }

    // #2 the exact activeTab/host pattern Chrome accepts for this http origin
    const contains = await evaluate(ext, `chrome.permissions.contains({ origins: [${JSON.stringify(SITE_PATTERN)}] }).then(String)`);
    check(contains === 'true', `#2 ${SITE_PATTERN} 是 Chrome 认可的 origin pattern（contains=true）`, contains);

    // #1 bind (equivalent to the icon click: same bindTab() code path)
    await evaluate(sw, `chrome.tabs.update(${siteTabId}, { active: true }).then((t) => t.id)`);
    await sleep(500);
    const rebind = await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'rebind' }).then((r) => JSON.stringify(r)).catch((e) => 'ERR:' + String(e))`);
    const rebindRes = JSON.parse(rebind);
    check(rebindRes.ok === true, '#1 绑定成功（等价 action.onClicked 的 bindTab）', rebind);
    check(rebindRes.data?.origin === SITE_ORIGIN, `#1b 绑定 origin = ${SITE_ORIGIN}`, JSON.stringify(rebindRes.data));
    check(rebindRes.data?.tabId === siteTabId, '#1c 绑定 tabId 与目标标签页一致');
    check(rebindRes.data?.contentInjected === true, '#2b content.js 注入成功');

    // #3 discovery reaches supported
    const state = await waitFor(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const d = r?.data;
        return d?.active?.discoveryState === 'supported' ? JSON.stringify({ active: d.active, tools: d.tools }) : '';
      })()`,
      60,
      250,
    );
    check(Boolean(state), '#3d discovery 走到 supported（well-known / html-link / handshake）', String(state).slice(0, 160));
    const parsed = state ? JSON.parse(state) : { tools: [] };
    check(parsed.active?.origin === SITE_ORIGIN, '#3e 活跃站点 origin 正确', JSON.stringify(parsed.active));
    check((parsed.tools ?? []).includes('site_lgdl-web-cli'), '#3f 站点工具面已装配（site_lgdl-web-cli）', JSON.stringify(parsed.tools));

    // bring the panel to the front + reload so it re-reads state for this origin
    // #9 (onActivated): activating the panel tab is itself "switching away" from
    // the bound tab → the session must be marked stale with a readable prompt.
    await evaluate(sw, `chrome.tabs.update(${spTabId}, { active: true }).then((t) => t.id)`);
    await sleep(700);
    const switched = await evaluate(
      ext,
      `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => JSON.stringify({ invalidated: r.data.active?.invalidated, notice: r.data.panelNotice }))`,
    );
    const sw2 = JSON.parse(switched);
    check(sw2.invalidated === true, '#9 切走绑定标签页后会话被标记失效（invalidated=true）', switched);
    check(/已切换标签页/.test(sw2.notice ?? ''), '#9b 侧栏可读提示「已切换标签页，请点插件图标」', sw2.notice);

    await ext.send('Page.reload', { ignoreCache: true });
    await sleep(1200);
    const status = await waitFor(ext, `(() => { const s = document.getElementById('status').textContent; return s.includes('localhost:5173') ? s : ''; })()`, 40, 250);
    check(Boolean(status), '#4 侧栏读到活跃站点（不再恒「无活跃站点」）', status);

    // #4 authorize via the REAL button → requestOriginPermissionDetailed → http pattern
    await realClick(ext, '#authorize');
    const authNotice = await waitFor(ext, `(() => { const t = document.getElementById('notice').textContent; return /已授权/.test(t) ? t : ''; })()`, 40, 200);
    check(Boolean(authNotice), '#4b 【授权当前站点】真实点击后出现可读回执', authNotice);
    check(/站点访问权限|activeTab|未获得持久站点权限/.test(authNotice ?? ''), '#4c 授权回执说明站点权限结果/回退', authNotice);
    const authorized = await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized)`);
    check(authorized === true, '#4d 授权已写入 OriginStore（state.authorized=true）');

    // #5 send button becomes enabled
    const composer = await evaluate(
      ext,
      `(() => ({ sendDisabled: document.getElementById('send').disabled, reason: document.getElementById('send-reason').textContent }))()`,
    );
    check(composer.sendDisabled === false, '#5 发送按钮变为可用（sendDisabled=false）', JSON.stringify(composer));
    check(!composer.reason, '#5b 发送禁用原因已清空', composer.reason);

    // #6 mock LLM round trip with "11111"
    await evaluate(
      sw,
      `chrome.storage.local.set({ 'web-cli:web-cli:llm': { active: 'openai', providers: { openai: { apiKey: 'binding-key', model: 'binding-mock', baseURL: ${JSON.stringify(`${mock.origin}/v1`)} } }, maxRounds: 3 } }).then(() => true)`,
    );
    await ext.send('Page.reload', { ignoreCache: true });
    await sleep(1000);
    await realClick(ext, '#input');
    await typeText(ext, '11111');
    const typed = await evaluate(ext, `document.getElementById('input').value`);
    check(typed === '11111', '#6a 真实键入 11111 进入输入框', typed);
    await realClick(ext, '#send');
    const reply = await waitFor(
      ext,
      `(() => { const els = [...document.querySelectorAll('.entry-assistant')]; return els.map((e) => e.textContent).find((t) => t.includes('11111')) || ''; })()`,
      120,
      250,
    );
    check(Boolean(reply), '#6 输入 11111 跑通一轮对话（mock LLM 真实往返）', reply);
    const errors = await evaluate(ext, `[...document.querySelectorAll('.entry-error')].map((e) => e.textContent).join(' | ')`);
    check(!errors, '#6b 对话过程无错误条目', errors);

    // ── #6h TASK-023: the real user message renders as a distinguished bubble ──
    const userBubble = await evaluate(
      ext,
      `(() => {
        const row = document.querySelector('.entry.msg-user');
        const bubble = row ? row.querySelector('.msg-content') : null;
        if (!row || !bubble) return JSON.stringify({ present: false });
        const cs = getComputedStyle(bubble);
        return JSON.stringify({
          present: true,
          text: bubble.textContent,
          bg: cs.backgroundColor,
          align: getComputedStyle(row).justifyContent,
          radius: cs.borderBottomRightRadius,
        });
      })()`,
    );
    const ub = JSON.parse(userBubble);
    check(ub.present === true && ub.text === '11111', '#6h 真实用户消息渲染为独立用户气泡', userBubble);
    check(ub.bg === 'rgb(79, 70, 229)', '#6i 用户气泡为用户色（indigo，明显区分于助手）', ub.bg);
    check(ub.align === 'flex-end', '#6j 用户气泡右对齐（与助手左对齐区分）', ub.align);

    // ── #6k~#6l scroll-follow regression: a user send is unconditional ────────
    // Push a long reply into the real panel so the message list is scrollable.
    const longMsg = ['# 撑高消息区', '', ...Array.from({ length: 80 }, (_, i) => `- 第 ${i} 行`)].join('\n');
    await evaluate(
      sw,
      `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'assistant', text: ${JSON.stringify(longMsg)} }).catch(() => {})`,
    );
    await sleep(400);
    const away = await evaluate(
      ext,
      `(() => {
        const log = document.getElementById('log');
        log.scrollTop = 0; log.dispatchEvent(new Event('scroll'));
        return JSON.stringify({
          scrollable: log.scrollHeight > log.clientHeight + 100,
          shown: document.getElementById('scroll-bottom').classList.contains('show'),
        });
      })()`,
    );
    const aw = JSON.parse(away);
    check(aw.scrollable === true, '#6k 消息区可滚动（长回复已撑高）', away);
    check(aw.shown === true, '#6k2 上滚后「回到底部」入口出现', away);
    await realClick(ext, '#input');
    await typeText(ext, '22222');
    await realClick(ext, '#send');
    const pinned = await waitFor(
      ext,
      `(() => {
        const log = document.getElementById('log');
        const d = Math.round(log.scrollHeight - log.scrollTop - log.clientHeight);
        return d <= 48 && !document.getElementById('scroll-bottom').classList.contains('show') ? String(d) : '';
      })()`,
      60,
      100,
    );
    check(pinned !== undefined, '#6l 用户发送后无条件滚到底（无需手动点「回到底部」）', `residual=${pinned}`);

    // ── #6c 直接复现本次事故：捕获真实发给 LLM 的 tools 数组并断言名字合法 ──
    const lastReq = llmRequests[llmRequests.length - 1];
    const sentTools = (lastReq?.tools ?? []).map((t) => t?.function?.name).filter((n) => typeof n === 'string');
    observe(`发给 LLM 的 tools（${sentTools.length} 个）：${sentTools.join(', ')}`);
    check(sentTools.length > 0, '#6c 捕获到真实发给 LLM 的 tools 数组', JSON.stringify(sentTools));
    const ILLEGAL = sentTools.filter((n) => !/^[a-zA-Z0-9_-]+$/.test(n));
    check(ILLEGAL.length === 0, '#6d 全部 tools 名字匹配 ^[a-zA-Z0-9_-]+$（本次 400 事故硬门禁）', JSON.stringify(ILLEGAL));
    check(sentTools.includes('site_lgdl-web-cli'), '#6e 站点工具以扁平合法名出现（site_lgdl-web-cli）', JSON.stringify(sentTools));
    check(sentTools.some((n) => n.startsWith('admin_')), '#6f 管理工具以扁平合法名出现（admin_*）', JSON.stringify(sentTools));
    check(sentTools.every((n) => !n.includes('.')), '#6g 发给 LLM 的工具名零点号', JSON.stringify(sentTools.filter((n) => n.includes('.'))));

    check(spExceptions.length === 0, '#10 侧栏页 0 未捕获异常', spExceptions.join(' | '));
    check(spConsoleErrors.length === 0, '#10b 侧栏页 0 console error', spConsoleErrors.join(' | '));

    ext.close();
    sw.close();
  } catch (err) {
    failures.push(`阶段 1 harness error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('✖ 阶段 1 harness error:', err);
    if (process.env.BINDING_DEBUG) console.error(log().slice(-3000));
  } finally {
    chrome.kill('SIGKILL');
    await rm(chromeWork, { recursive: true, force: true }).catch(() => {});
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  if (!(await stat(dist).then(() => true).catch(() => false))) {
    console.error(`✖ dist/ 不存在：先运行 npm run build --workspace @lgdl/web-cli-plugin（期望 ${dist}）`);
    process.exit(1);
  }
  if (!(await stat(CHROME).then(() => true).catch(() => false))) {
    console.error(`✖ 找不到 Chromium：${CHROME}（可用 CHROME_BIN 覆盖）`);
    process.exit(1);
  }
  const site = await ensureSite();
  const mock = await startMockLlm();
  console.log(`▶ site:   ${site.origin}`);
  console.log(`▶ mock:   ${mock.origin}`);
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${dist}`);

  try {
    await phase0();
    await phase1(mock);
  } finally {
    mock.server.close();
    if (site.proc) site.proc.kill('SIGKILL');
  }

  console.log('\n──── 观测汇总（如实） ────');
  for (const o of observations) console.log(`  · ${o}`);

  console.log('');
  if (failures.length) {
    console.error(`binding FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`binding PASS — ${passes} assertions：真实 dist + 真实 http://localhost:5173 + mock LLM，6 步全链（绑定→注入→发现→授权→发送可用→对话）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
