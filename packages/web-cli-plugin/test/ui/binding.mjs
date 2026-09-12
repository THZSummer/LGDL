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

/** FR-049: find a real tool-result content captured in any LLM request. */
function findToolResult(substr) {
  for (let i = llmRequests.length - 1; i >= 0; i -= 1) {
    for (const m of llmRequests[i].messages ?? []) {
      if (m.role === 'tool' && typeof m.content === 'string' && m.content.includes(substr)) return m.content;
    }
  }
  return undefined;
}
async function waitForToolResult(substr, tries = 150, gapMs = 100) {
  for (let i = 0; i < tries; i += 1) {
    const hit = findToolResult(substr);
    if (hit) return hit;
    await sleep(gapMs);
  }
  return undefined;
}

// ── mock LLM (OpenAI-compatible, non-streaming) ──────────────────────────────
/** Every request body seen by the mock, so the test can inspect the real `tools`. */
const llmRequests = [];

/**
 * FR-050 / EC-023: a REAL local origin that is deliberately **not** covered by
 * the extension's host_permissions — the "unauthorized domain". If the fixed
 * extension ever sends the request (instead of refusing up-front), this server
 * records the hit (CORS blocks the *response*, not the request), so a non-empty
 * `unauthHits` is hard proof the pre-flight gate failed.
 */
const unauthHits = [];
let UNAUTH_URL = '';
function startUnauthTarget() {
  const server = createServer((req, res) => {
    unauthHits.push(req.url || '/');
    res.writeHead(200, { 'access-control-allow-origin': '*' });
    res.end('SECRET-UNAUTH-BODY');
  });
  return new Promise((resolveListen) => {
    server.listen(0, '127.0.0.1', () => resolveListen({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

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
        let message = { role: 'assistant', content: '' };
        try {
          const body = JSON.parse(raw);
          // Capture the actual tools array the plugin sent (name legality gate).
          const messages = Array.isArray(body.messages) ? body.messages : [];
          llmRequests.push({ tools: Array.isArray(body.tools) ? body.tools : [], messages });
          const lastUser = [...messages].reverse().find((m) => m.role === 'user');
          user = typeof lastUser?.content === 'string' ? lastUser.content : '';
          // FR-049: drive the real `tabs` tool through the real chat loop. The
          // marker is only in the user text; a follow-up round ends with a `tool`
          // message and always falls back to a plain assistant reply (the session
          // history also carries earlier tool messages, so check the LAST role).
          const lastIsTool = messages[messages.length - 1]?.role === 'tool';
          if (!lastIsTool && user.includes('__TABS_LIST_FULL__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_list_full', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'list', args: { full: 'true' } }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_LIST__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_list', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'list', args: {} }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_SWITCH__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_switch', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'switch', args: { match: 'localhost:5173' } }) } }],
            };
          } else if (!lastIsTool && user.includes('__WEBFETCH_UNAUTH__')) {
            // FR-050: ask the real web-fetch to read an UNauthorized origin.
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_wf_unauth', type: 'function', function: { name: 'web-fetch', arguments: JSON.stringify({ args: { path: UNAUTH_URL } }) } }],
            };
          } else if (!lastIsTool && user.includes('__WEBFETCH_SAME__')) {
            // FR-050 (C): same-origin read of the bound site (page-context path).
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_wf_same', type: 'function', function: { name: 'web-fetch', arguments: JSON.stringify({ args: { path: '.well-known/web-cli.json' } }) } }],
            };
          } else {
            message = { role: 'assistant', content: `收到 ${user}（binding mock）` };
          }
        } catch {
          message = { role: 'assistant', content: `收到 ${user}（binding mock）` };
        }
        res.writeHead(200, { ...cors, 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'chatcmpl-binding',
            object: 'chat.completion',
            created: 0,
            model: 'binding-mock',
            choices: [{ index: 0, message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }],
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

    // FR-050 (D): verify there is no REAL extension LOAD error (SW registration /
    // manifest / syntax). Capture the SW's console errors + uncaught exceptions
    // while the extension starts up, then report truthfully.
    await sw.send('Runtime.enable');
    await sw.send('Log.enable');
    const swErrors = [];
    sw.on('Runtime.exceptionThrown', (p) => swErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? 'exception'));
    sw.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') swErrors.push(p.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    });
    sw.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error') swErrors.push(p.entry.text);
    });
    await sleep(800);
    const loadErrors = swErrors.filter((e) => /Uncaught|SyntaxError|Failed to load|Manifest|Service worker registration/i.test(e));
    check(loadErrors.length === 0, '#0h 无扩展加载错误（未捕获异常 / 语法 / SW 注册 / manifest 错误）', loadErrors.join(' | '));
    if (swErrors.length) observe(`#0i SW 启动期错误/异常观测（如实记录，可能含运行期而非加载期）：${swErrors.join(' | ')}`);
    else observe('#0i SW 启动期 0 错误/异常');

    const runtime = await evaluate(
      sw,
      `(async () => {
        const m = chrome.runtime.getManifest();
        const behavior = await chrome.sidePanel.getPanelBehavior().catch((e) => ({ error: String(e) }));
        return {
          optionalHost: m.optional_host_permissions ?? [],
          minChrome: m.minimum_chrome_version,
          tabsPermission: (m.permissions ?? []).includes('tabs'),
          permissions: [...(m.permissions ?? [])].sort(),
          behavior,
          hasOpen: typeof chrome.sidePanel.open,
        };
      })()`,
    );
    check(runtime.optionalHost.includes('http://*/*'), '#0a optional_host_permissions 含 http://*/*（http 开发站可申请权限）', JSON.stringify(runtime.optionalHost));
    check(Number(runtime.minChrome) >= 116, '#0b minimum_chrome_version ≥ 116（sidePanel.open 需要）', runtime.minChrome);
    check(runtime.behavior?.openPanelOnActionClick === false, '#0c 运行时 openPanelOnActionClick=false（action.onClicked 可触发=绑定链路不再死代码）', JSON.stringify(runtime.behavior));
    check(runtime.hasOpen === 'function', '#0d chrome.sidePanel.open 可用（可在同一手势内开侧栏）');
    // Author decision ③ (2026-09-12) approved the `tabs` permission. The
    // assertion was repurposed from the old "no tabs" red line to pin the exact
    // approved permission set (no other escalation).
    check(runtime.tabsPermission === true, '#0e 已按作者决策③新增 tabs 权限（标签页工具；唯一新增）');
    check(
      JSON.stringify(runtime.permissions) === JSON.stringify(['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs']),
      '#0e2 permissions 逐项 = 已批准集合（无其他新增）',
      JSON.stringify(runtime.permissions),
    );

    // FR-049 user-perceivable change: with the approved `tabs` permission the
    // background can now read `tab.url` directly (previously it was `undefined`
    // without a host grant — that unreadability was the old root cause). This
    // assertion is the positive counterpart, not a downgrade.
    const tabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(SITE_ORIGIN)} }).then((t) => t.id)`);
    await sleep(2000);
    const tabUrl = await evaluate(sw, `chrome.tabs.query({ active: true, currentWindow: true }).then((ts) => (ts[0]?.url === undefined ? '(undefined)' : ts[0].url))`);
    check(String(tabUrl).includes('localhost:5173'), '#0f 有 tabs 权限后 background 可直接读取 tab.url（用户可感知差异；原「无 URL」根因消失）', String(tabUrl));
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

    // FR-050 (D): capture SW console/errors so the web-fetch step can prove no
    // CORS entry is produced after the fix (and so any real load error is visible).
    await sw.send('Runtime.enable');
    await sw.send('Log.enable');
    const swConsoleErrors = [];
    sw.on('Runtime.exceptionThrown', (p) => swConsoleErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text ?? 'exception'));
    sw.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') swConsoleErrors.push(p.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    });
    sw.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error') swConsoleErrors.push(p.entry.text);
    });

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

    // FR-050 (D): a real message round-trip proves the SW is registered and the
    // router is live (not merely that a CDP target exists).
    const pong = await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'ping' }).then((r) => (r && r.ok ? 'pong' : 'no-pong')).catch((e) => 'ERR:' + String(e))`);
    check(pong === 'pong', '#1d SW 已注册并响应消息（真实 ping 往返）', String(pong));

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
    // TASK-028: the side panel auto-tests on load (no standalone button) and shows
    // the readable status — this reload happens after the mock LLM config is stored.
    const spAutoTest = await waitFor(
      ext,
      `(() => {
        const t = document.getElementById('llm-test-result')?.textContent ?? '';
        return /^✓ .+ 连接正常（模型 binding-mock，\\d+ ms，最小 ping 请求）$/.test(t) ? t : '';
      })()`,
      120,
      200,
    );
    check(Boolean(spAutoTest), '#6-1 侧栏加载即自动测试当前模型配置（mock LLM 最小 ping）并显示可读状态', spAutoTest ?? 'no auto status');
    const spTestBtnAbsent = await evaluate(ext, `document.getElementById('llm-test') === null`);
    check(spTestBtnAbsent === true, '#6-2 侧栏不存在独立「测试连接」按钮（按钮已移除）', String(spTestBtnAbsent));
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

    // ── FR-049: real `tabs list` / `tabs switch` through the real chat loop ──
    check(sentTools.includes('tabs'), '#7a 工具面已含插件级 tabs（作者决策③）', JSON.stringify(sentTools));

    // A "leak" tab carries a secret query so the privacy default can be asserted.
    const leakTabId = await evaluate(
      sw,
      `chrome.tabs.create({ url: ${JSON.stringify(`${SITE_ORIGIN}/?secretmarker=TOPSECRET#frag`)} }).then((t) => t.id)`,
    );
    await sleep(1500);

    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_LIST__' }).then(() => true)`);
    const listResult = await waitForToolResult('标签页（');
    check(Boolean(listResult), '#7 真实调用 tabs list（mock LLM 工具调用 → 真实 chrome.tabs.query）', (listResult ?? '').slice(0, 200));
    check((listResult ?? '').includes('localhost:5173'), '#7b tabs list 返回真实站点标签页', (listResult ?? '').slice(0, 300));
    check(!(listResult ?? '').includes('TOPSECRET'), '#7c tabs list 默认去除 query（TOPSECRET 未进入 LLM 上下文）', (listResult ?? '').slice(0, 300));
    observe(`#7 tabs list 工具结果（前 240 字符）：${(listResult ?? '').replace(/\n/g, ' | ').slice(0, 240)}`);

    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_LIST_FULL__' }).then(() => true)`);
    const listFullResult = await waitForToolResult('--full 模式');
    check(Boolean(listFullResult), '#7d tabs list --full 显式返回完整 URL', (listFullResult ?? '').slice(0, 200));
    check((listFullResult ?? '').includes('TOPSECRET'), '#7e --full 模式下 query 可见（显式选项，已披露）', (listFullResult ?? '').slice(0, 300));

    // ── FR-050 / EC-023: web-fetch pre-flight gate (real extension + real network) ──
    // The mock LLM asks the real web-fetch to read a REAL local origin that is NOT
    // in host_permissions. The fixed seam must refuse readably and send ZERO
    // requests (the target server records any hit → hard evidence).
    const wfErrStart = swConsoleErrors.length;
    const unauthBefore = unauthHits.length;
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__WEBFETCH_UNAUTH__' }).then(() => true)`);
    // NB: a distinctive substring — `未授权` alone also appears in the earlier
    // tabs-list output, which would make the wait return before this call runs.
    const wfRefusal = await waitForToolResult('web-fetch 拒绝访问');
    check(Boolean(wfRefusal), '#7f 未授权域名 web-fetch 返回可读拒绝（非裸 CORS 文本）', (wfRefusal ?? '').slice(0, 260));
    check(/授权当前站点/.test(wfRefusal ?? '') && /tabs open/.test(wfRefusal ?? ''), '#7g 拒绝文案含两条可执行授权指引', (wfRefusal ?? '').slice(0, 260));
    check(unauthHits.length === unauthBefore, '#7h 未授权域名零请求（真实本地目标服务器未收到任何命中）', JSON.stringify(unauthHits.slice(unauthBefore)));
    const wfCorsErrors = swConsoleErrors.slice(wfErrStart).filter((e) => /CORS|Access to fetch|blocked by CORS/i.test(e));
    check(wfCorsErrors.length === 0, '#7i 修复后未产生 CORS 错误条目（SW 控制台/错误列表）', wfCorsErrors.join(' | '));

    // Let the previous turn fully finish (a new `chat` while busy is rejected).
    await sleep(900);

    // FR-050 (C): same-origin relative read truly works via the page context.
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__WEBFETCH_SAME__' }).then(() => true)`);
    const sameRead = await waitForToolResult('protocolVersion');
    check(Boolean(sameRead), '#7j 同源相对路径经页面上下文真实读取成功（绑定站点自身资源）', (sameRead ?? '').slice(0, 200));
    check(/LGDL Web Workbench|protocolVersion/.test(sameRead ?? ''), '#7k 同源读取内容为站点真实声明（非空/非占位）', (sameRead ?? '').slice(0, 200));
    await sleep(900);

    // Close the leak tab so `switch --match localhost:5173` is unambiguous.
    await evaluate(sw, `chrome.tabs.remove(${leakTabId}).then(() => true)`);
    await sleep(400);

    // Bind a DIFFERENT origin first so the subsequent switch proves a session change.
    const otherTabId = await evaluate(sw, `chrome.tabs.create({ url: 'http://127.0.0.1:1/' }).then((t) => t.id).catch(() => -1)`);
    check(otherTabId !== -1, '#8 打开第二个 origin 标签页（用于证明会话切换）', String(otherTabId));
    await evaluate(sw, `chrome.tabs.update(${otherTabId}, { active: true }).then(() => true)`);
    await sleep(500);
    const rebound = await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'rebind' }).then((r) => JSON.stringify(r)).catch((e) => 'ERR:' + String(e))`);
    const rb = JSON.parse(rebound);
    check(rb.ok === true && rb.data?.origin === 'http://127.0.0.1:1', '#8b 预先绑定第二个 origin（当前会话切换为它）', rebound);

    // Now real `tabs switch --match localhost:5173` → confirm → session switches back.
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_SWITCH__' }).then(() => true)`);
    const confirmShown = await waitFor(
      ext,
      `(() => { const s = document.getElementById('confirm-summary').textContent; return /tabs/.test(s) ? s : ''; })()`,
      80,
      150,
    );
    check(Boolean(confirmShown), '#8d tabs switch（ui 档）触发二次确认', confirmShown ?? 'no confirm');
    const allowVisible = await waitFor(
      ext,
      `(() => { const el = document.getElementById('confirm-allow'); const r = el.getBoundingClientRect(); return r.width > 0 ? String(r.width) : ''; })()`,
      40,
      100,
    );
    check(Boolean(allowVisible), '#8e 确认按钮真实可见可点');
    await realClick(ext, '#confirm-allow');
    const switchResult = await waitForToolResult('已切到');
    check(Boolean(switchResult), '#8f 真实调用 tabs switch（用户确认后执行）', (switchResult ?? '').slice(0, 200));
    check((switchResult ?? '').includes('localhost:5173'), '#8g tabs switch 回执说明切到 localhost:5173', (switchResult ?? '').slice(0, 200));
    const afterSwitch = await waitFor(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const sid = r?.data?.session?.sessionId;
        return sid === ${JSON.stringify(SITE_ORIGIN)} ? JSON.stringify({ session: r.data.session, active: r.data.active }) : '';
      })()`,
      80,
      150,
    );
    check(Boolean(afterSwitch), `#8h tabs switch 后会话随之切换到 ${SITE_ORIGIN}`, afterSwitch ?? 'session unchanged');
    const asw = afterSwitch ? JSON.parse(afterSwitch) : {};
    check(asw.active?.origin === SITE_ORIGIN, '#8i tabs switch 后 active.origin 为站点', JSON.stringify(asw.active));

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

/**
 * Phase 2 — decision ① / FR-047 real auto-detection proof.
 *
 * The user requirement: after the **one-time** per-site authorization the plugin
 * must bind automatically (no more icon clicks). This phase proves it on the real
 * site with a fresh Chrome:
 *   1. baseline: no declarative registration exists;
 *   2. `authorize` (hostPermissionGranted=true) registers a declarative content
 *      script for `${SITE_ORIGIN}/*` via `chrome.scripting.registerContentScripts`;
 *   3. **reload the site tab** → the injected content script self-reports `hello`
 *      → the background auto-binds `active.origin === SITE_ORIGIN` and completes
 *      discovery — with **no rebind and no icon click** (proved by #A4: the initial
 *      state is captured *before* any rebind call is made);
 *   4. tab switching re-binds via the `whoami` handshake;
 *   5. an unauthorized origin degrades **silently** to the readable "unbound"
 *      state (no exception, readable notice).
 *
 * Disclosure ①/② from phase 0 still apply (no scriptable icon click; headless has
 * no native permission prompt → the temp manifest pre-grants the host permission,
 * dist JS byte-identical).
 */
async function phase2() {
  console.log(`\n▶ 阶段 2：自动探测（授权后免点图标自动绑定）`);
  const work = await mkdtemp(join(tmpdir(), 'web-cli-binding-auto-'));
  const extDir = join(work, 'ext');
  await cp(dist, extDir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(extDir, 'manifest.json'), 'utf8'));
  manifest.host_permissions = [...manifest.host_permissions, SITE_PATTERN];
  await writeFile(join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const { work: chromeWork, chrome, base, sw, log } = await launchChrome(extDir, 'auto');
  try {
    check(Boolean(sw), '#A0 service worker 可达');
    if (!sw) throw new Error('no sw');

    const extId = await evaluate(sw, `chrome.runtime.id`);
    const siteTabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(SITE_ORIGIN)} }).then((t) => t.id)`, 20000);
    await sleep(2000);
    const spTabId = await evaluate(sw, `chrome.tabs.create({ url: 'chrome-extension://${extId}/sidepanel.html' }).then((t) => t.id)`);
    const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    if (!spTarget) throw new Error('sidepanel target not found');
    const ext = await connectCdp(spTarget.webSocketDebuggerUrl);
    await ext.send('Runtime.enable');
    await ext.send('Log.enable');
    const extExceptions = [];
    ext.on('Runtime.exceptionThrown', (p) => extExceptions.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    // #A1 baseline: no declarative site script before authorization.
    const before = await evaluate(
      sw,
      `chrome.scripting.getRegisteredContentScripts().then((list) => list.filter((s) => String(s.id).startsWith('wcliSite_')).length)`,
    );
    check(before === 0, '#A1 授权前无声明式注入注册（基线）', String(before));

    // #A2 authorize → declarative registration (the ONE-TIME gate).
    const authRes = await evaluate(
      ext,
      `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(SITE_ORIGIN)}, hostPermissionGranted: true }).then((r) => JSON.stringify(r)).catch((e) => 'ERR:' + String(e))`,
    );
    const auth = JSON.parse(authRes);
    check(auth.ok === true, '#A2 authorize 成功', authRes);
    check(auth.data?.contentScript?.ok === true, '#A2b authorize 回执含声明式注入注册成功', JSON.stringify(auth.data?.contentScript));
    check(auth.data?.contentScript?.pattern === SITE_PATTERN, `#A2c 注册匹配式 = ${SITE_PATTERN}`, JSON.stringify(auth.data?.contentScript));

    const registered = await evaluate(
      sw,
      `chrome.scripting.getRegisteredContentScripts().then((list) => JSON.stringify(list.filter((s) => String(s.id).startsWith('wcliSite_')).map((s) => ({ id: s.id, matches: s.matches, runAt: s.runAt, persist: s.persistAcrossSessions }))))`,
    );
    const regs = JSON.parse(registered);
    check(regs.length === 1 && regs[0].matches.includes(SITE_PATTERN), '#A3 chrome.scripting 已注册声明式注入（真实 API）', registered);
    check(regs[0]?.persist === true && regs[0]?.runAt === 'document_idle', '#A3b persistAcrossSessions=true + document_idle', registered);

    // #A4 THE KEY PROOF: reload the site tab → auto-inject → hello → auto-bind.
    // No `rebind` message and no icon click are issued anywhere in this phase.
    await evaluate(sw, `chrome.tabs.reload(${siteTabId}).then(() => true)`);
    const autoState = await waitFor(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const d = r && r.data;
        if (d && d.active && d.active.origin === ${JSON.stringify(SITE_ORIGIN)} && d.active.invalidated === false) {
          return JSON.stringify({ origin: d.active.origin, discovery: d.active.discoveryState, tools: d.tools });
        }
        return '';
      })()`,
      100,
      250,
    );
    check(Boolean(autoState), '#A4 免点图标自动绑定：页面加载后 content script 自上报 hello 并自动绑定', autoState ?? 'no auto-bind');
    const as = autoState ? JSON.parse(autoState) : { tools: [] };
    check(as.origin === SITE_ORIGIN, `#A4b 自动绑定 origin = ${SITE_ORIGIN}（未调用 rebind / 未点图标）`, String(as.origin));

    // #A4c/#A4d: discovery completes asynchronously right after the auto-bind
    // (hello binds first, then the content script's own `discover` report lands).
    const autoDiscover = await waitFor(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const d = r && r.data;
        return d && d.active && d.active.discoveryState === 'supported'
          ? JSON.stringify({ discovery: d.active.discoveryState, tools: d.tools }) : '';
      })()`,
      80,
      250,
    );
    const ad = autoDiscover ? JSON.parse(autoDiscover) : { tools: [] };
    check(Boolean(autoDiscover), '#A4c 自动绑定后 discovery 达到 supported', autoDiscover ?? 'not-supported');
    check((ad.tools ?? []).includes('site_lgdl-web-cli'), '#A4d 站点工具面随自动绑定装配', JSON.stringify(ad.tools));

    // #A5 tab-switch re-bind via the `whoami` handshake (no tabs permission).
    await evaluate(sw, `chrome.tabs.update(${spTabId}, { active: true }).then(() => true)`);
    await sleep(600);
    await evaluate(sw, `chrome.tabs.update(${siteTabId}, { active: true }).then(() => true)`);
    const switched = await waitFor(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const d = r && r.data;
        return d && d.active && d.active.origin === ${JSON.stringify(SITE_ORIGIN)} && d.active.invalidated === false
          ? JSON.stringify({ origin: d.active.origin, invalidated: d.active.invalidated }) : '';
      })()`,
      60,
      250,
    );
    check(Boolean(switched), '#A5 切走再切回站点标签页 → whoami 握手自动重新绑定', switched ?? 'no rebind');

    // #A6 unauthorized origin degrades silently to a readable "unbound" state.
    const stranger = await evaluate(sw, `chrome.tabs.create({ url: 'http://127.0.0.1:1/' }).then((t) => t.id).catch(() => -1)`);
    if (stranger !== -1) {
      await evaluate(sw, `chrome.tabs.update(${stranger}, { active: true }).then(() => true)`);
      await sleep(700);
      const degraded = await evaluate(
        ext,
        `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => JSON.stringify({ invalidated: r.data.active ? r.data.active.invalidated : null, notice: r.data.panelNotice }))`,
      );
      const dg = JSON.parse(degraded);
      check(dg.invalidated === true || dg.invalidated === null, '#A6 未授权标签页 → 静默降级（不抛错）', degraded);
      observe(`#A6 未授权标签页 state = ${degraded}（未在注册表中 → content script 不注入 → autoBind 静默返回 false）`);
    } else {
      observe('#A6 跳过：无法创建未授权标签页（headless 环境限制）');
    }
    check(extExceptions.length === 0, '#A7 自动探测全程侧栏 0 未捕获异常', extExceptions.join(' | '));

    ext.close();
    sw.close();
  } catch (err) {
    failures.push(`阶段 2 harness error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('✖ 阶段 2 harness error:', err);
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
  const unauth = await startUnauthTarget();
  UNAUTH_URL = `${unauth.origin}/secret`;
  console.log(`▶ site:   ${site.origin}`);
  console.log(`▶ mock:   ${mock.origin}`);
  console.log(`▶ 未授权域名目标服务器（不在 host_permissions）: ${unauth.origin}`);
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${dist}`);

  try {
    await phase0();
    await phase1(mock);
    await phase2();
  } finally {
    mock.server.close();
    unauth.server.close();
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
  console.log(`binding PASS — ${passes} assertions：真实 dist + 真实 http://localhost:5173 + mock LLM，6 步全链（绑定→注入→发现→授权→发送可用→对话）+ 阶段 2 自动探测（授权后免点图标自动绑定）+ FR-049 标签页工具（真实 tabs list --full/默认 与 tabs switch → 会话随之切换）+ FR-050 web-fetch 预校验（未授权域名零请求 + 可读拒绝；同源经页面上下文真实读取；SW ping 往返 + 无加载/CORS 错误）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
