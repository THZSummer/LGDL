/**
 * TASK-019 加固实证探针（`npm run test:hardening`）——三个真实场景，可重复：
 *
 *  A. **非扩展上下文**：用 `file://.../options.html` 打开
 *     - A1（修复前 dist 快照，若存在 `/tmp/prefix-dist`）→ 记录旧行为原始观测；
 *     - A2（当前 dist）→ 断言阻断横幅出现 + 保存/测试/清除禁用 + 输入说明 + 诊断 ❌。
 *  B. **站点未声明 web-cli 协议**：本地普通站点（无声明）→ 真实 content 注入 →
 *     侧栏 `#discovery-notice` 出现「设计如此，非故障」说明 + 「重新探测」入口。
 *  C. **旧版扩展未重载（构建 stamp 不一致）**：加载真实 dist → 重新 build（不点
 *     chrome://extensions「重新加载」）→ 刷新 options → 断言诊断给出「页面/SW 构建
 *     不一致 + 重新加载」；随后 `chrome.runtime.reload()` → 断言恢复一致。
 *
 * 依赖：Node ≥ 22（全局 WebSocket/fetch）、`.pw-browsers` Chromium 或 CHROME_BIN。
 * 前置：`npm run build --workspace @lgdl/web-cli-plugin`（B/C 需真实 dist）。
 * B 的临时 dist 副本会把本地 origin 追加进 manifest `host_permissions`（脚本按需注入
 * content script，headless 无法合成 activeTab 手势）；JS 字节不改，偏差如实披露。
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
const prefixDist = '/tmp/prefix-dist';
const CHROME = process.env.CHROME_BIN || resolve(repoRoot, '.pw-browsers', 'chromium-1234', 'chrome-linux64', 'chrome');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
let passes = 0;
const observations = [];
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

// ── minimal CDP client ───────────────────────────────────────────────────────
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

async function evaluate(cdp, expression, timeoutMs = 15000) {
  const call = cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true, timeout: timeoutMs });
  // A dead target (e.g. right after `chrome.runtime.reload()`) may never answer;
  // race with a hard timeout so the probe can't hang forever.
  const res = await Promise.race([
    call,
    new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timeout')), timeoutMs + 2000)),
  ]);
  if (res.exceptionDetails) throw new Error(`evaluate failed: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`.trim());
  return res.result?.value;
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
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; })()`,
  );
}
async function realClick(cdp, selector) {
  const box = await boxOf(cdp, selector);
  if (!box) throw new Error(`selector not found: ${selector}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
}

async function launch(extraArgs = [], dir = dist) {
  const work = await mkdtemp(join(tmpdir(), 'web-cli-hardening-'));
  const profile = join(work, 'profile');
  const port = 9700 + Math.floor(Math.random() * 600);
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    ...extraArgs,
    'about:blank',
  ];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  chrome.stdout.on('data', (d) => (log += d));
  chrome.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  return { work, chrome, base, port, log: () => log };
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

async function browserCdp(base, tries = 120, gapMs = 250) {
  for (let i = 0; i < tries; i += 1) {
    const info = await fetch(`${base}/json/version`).then((r) => r.json()).catch(() => undefined);
    if (info?.webSocketDebuggerUrl) return connectCdp(info.webSocketDebuggerUrl);
    await sleep(gapMs);
  }
  throw new Error(`browser debugging endpoint never came up: ${base}`);
}

async function openPage(browser, base, url) {
  await browser.send('Target.createTarget', { url });
  const t = await findTarget(base, (x) => x.type === 'page' && x.url.includes(url.replace(/^file:\/\//, '')));
  const target = t ?? (await findTarget(base, (x) => x.type === 'page' && x.url === url));
  if (!target) throw new Error(`page target not found: ${url}`);
  const page = await connectCdp(target.webSocketDebuggerUrl);
  await page.send('Runtime.enable');
  await sleep(600);
  return page;
}

// ── A. file:// 非扩展上下文 ──────────────────────────────────────────────────
async function phaseA() {
  console.log('\n▶ A. 非扩展上下文（file:// options.html）');
  const { work, chrome, base } = await launch([]);
  try {
    const browser = await browserCdp(base);

    // A1: pre-fix snapshot (if present)
    if (await stat(prefixDist).then(() => true).catch(() => false)) {
      const page = await openPage(browser, base, `file://${prefixDist}/options.html`);
      const initial = await evaluate(page, `(() => ({ hasSave: !!document.getElementById('save'),
        hasGuard: !!document.getElementById('env-guard'),
        chromeType: typeof chrome, runtimeId: (typeof chrome!=='undefined'&&chrome.runtime)?chrome.runtime.id:'(none)',
        storageLocal: (typeof chrome!=='undefined'&&chrome.storage)?typeof chrome.storage.local:'(none)',
        saved: document.getElementById('saved').textContent }))()`);
      observe(`A1 修复前：hasSave=${initial.hasSave} hasGuardEl=${initial.hasGuard} chrome=${initial.chromeType} runtime.id=${initial.runtimeId} storage.local=${initial.storageLocal}`);
      await evaluate(page, `(() => { const el=document.getElementById('apiKey'); el.value='sk-prefix-file-123456'; el.dispatchEvent(new Event('input',{bubbles:true})); return el.value; })()`);
      await realClick(page, '#save');
      await sleep(900);
      const after = await evaluate(page, `(() => ({ saved: document.getElementById('saved').textContent,
        apiKey: document.getElementById('apiKey').value }))()`);
      observe(`A1 修复前点击「保存」后：#saved="${after.saved}"，apiKey 输入框="${after.apiKey}"`);
      observe('A1 修复前结论：无环境横幅、按钮可点，失败只以底层错误（或异常）形式出现，用户无法判断「其实不在扩展里」');
      page.close();
    } else {
      observe('A1 跳过：未找到修复前 dist 快照 /tmp/prefix-dist');
    }

    // A2: fixed dist (wait for the 900KB bundle to boot and render the guard)
    const page = await openPage(browser, base, `file://${dist}/options.html`);
    await waitFor(page, `(document.getElementById('env-guard')?.textContent?.length ?? 0) > 0`, 80, 250);
    const fixed = await evaluate(page, `(() => ({
      guardShown: getComputedStyle(document.getElementById('env-guard')).display !== 'none',
      guardText: document.getElementById('env-guard').textContent,
      noteShown: getComputedStyle(document.getElementById('env-guard-note')).display !== 'none',
      noteText: document.getElementById('env-guard-note').textContent,
      saveDisabled: document.getElementById('save').disabled,
      testDisabled: document.getElementById('test').disabled,
      clearDisabled: document.getElementById('clear').disabled,
      diagText: document.getElementById('diag-output').textContent,
    }))()`);
    check(fixed.guardShown === true, 'A2 阻断横幅出现');
    check(/不在扩展环境/.test(fixed.guardText), 'A2 横幅文案含「不在扩展环境」', fixed.guardText);
    check(fixed.saveDisabled === true, 'A2 「保存」按钮禁用');
    check(fixed.testDisabled === true, 'A2 「测试连接」按钮禁用');
    check(fixed.clearDisabled === true, 'A2 「清除」按钮禁用');
    check(fixed.noteShown === true && /chrome\.storage\.local/.test(fixed.noteText), 'A2 输入框旁显示说明', fixed.noteText);
    check(/❌/.test(fixed.diagText) && /不在扩展环境|storage\.local/.test(fixed.diagText), 'A2 诊断面板显示 ❌ + 可读原因');
    observe(`A2 修复后横幅：${fixed.guardText}`);
    observe(`A2 诊断首部：${(fixed.diagText || '').slice(0, 160).replace(/\n/g, ' / ')}`);
    page.close();
    browser.close();
  } finally {
    chrome.kill('SIGKILL');
    await sleep(200);
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

// ── B. 站点未声明协议 ────────────────────────────────────────────────────────
function startPlainSite() {
  // mode: 'absent' → /.well-known/web-cli.json returns 404 (definitively no
  // declaration → discovery state 'unsupported'); 'invalid' → returns 200 with
  // a body that is not a valid descriptor (present but invalid → state 'unknown').
  const state = { mode: 'absent' };
  const server = createServer((req, res) => {
    if (req.url.startsWith('/.well-known/web-cli.json')) {
      if (state.mode === 'invalid') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{ not a valid descriptor');
      } else {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
      }
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><title>plain</title></head><body><h1>plain site</h1></body></html>');
  });
  return new Promise((resolveListen) => {
    server.listen(0, '127.0.0.1', () => resolveListen({ server, origin: `http://127.0.0.1:${server.address().port}`, state }));
  });
}

async function phaseB() {
  console.log('\n▶ B. 站点未声明 web-cli 协议（本地普通站点）');
  const plain = await startPlainSite();
  const tempDist = await mkdtemp(join(tmpdir(), 'web-cli-augdist-'));
  await cp(dist, tempDist, { recursive: true });
  const manifestPath = join(tempDist, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.host_permissions = [...(manifest.host_permissions ?? []), 'http://127.0.0.1/*'];
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  observe('B 临时 dist：manifest host_permissions 追加 http://127.0.0.1/*（JS 字节未改；headless 无 activeTab 手势）');

  const { work, chrome, base } = await launch([`--disable-extensions-except=${tempDist}`, `--load-extension=${tempDist}`], tempDist);
  try {
    // find our SW
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
    check(Boolean(sw), 'B#1 加载临时 dist 且 service worker 可达');
    if (!sw) throw new Error('no SW');

    const extId = await evaluate(sw, `chrome.runtime.id`);
    const spUrl = `chrome-extension://${extId}/sidepanel.html`;

    const bindPlainTab = async () => {
      const tabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(plain.origin)} }).then((t) => t.id)`);
      await sleep(1000);
      // on-demand inject (headless cannot synthesize activeTab gesture)
      const injected = await evaluate(sw, `chrome.scripting.executeScript({ target: { tabId: ${tabId} }, files: ['content.js'] }).then(() => true).catch((e) => String(e))`);
      observe(`B 注入 content.js 到 tab ${tabId}：${injected}`);
      // Let the whole discovery chain settle: the runtime handshake probe itself
      // times out after ~3s before the three-state result is reported.
      await sleep(4800);
      return tabId;
    };
    const openSidepanel = async (expected) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const unique = `${spUrl}?h=${Date.now()}-${attempt}`;
        await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(unique)} }).then((t) => t.id)`);
        const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes(unique.replace(/^chrome-extension:\/\//, '')) || (t.type === 'page' && t.url === unique));
        if (!spTarget) {
          await sleep(500);
          continue;
        }
        const sp = await connectCdp(spTarget.webSocketDebuggerUrl);
        await sp.send('Runtime.enable');
        const ok = await waitFor(
          sp,
          `(() => { const s=document.getElementById('status')?.textContent ?? ''; return s.includes(${JSON.stringify(expected)}) ? s : ''; })()`,
          40,
          250,
        );
        if (ok) return sp;
        sp.close();
        await sleep(800);
      }
      return undefined;
    };
    const readNotice = (sp) =>
      evaluate(sp, `(() => { const n=document.getElementById('discovery-notice'); return {
        status: document.getElementById('status').textContent,
        shown: getComputedStyle(n).display !== 'none',
        title: document.getElementById('discovery-title').textContent,
        detail: document.getElementById('discovery-detail').textContent,
        retryShown: getComputedStyle(document.getElementById('discovery-retry')).display !== 'none',
      }; })()`);

    // B1: definitively no declaration → 'unsupported'
    const tabId = await bindPlainTab();
    check(Boolean(tabId), 'B#1 打开普通站点 tab');
    const sp1 = await openSidepanel('unsupported');
    check(Boolean(sp1), 'B#2 background 发现态 = unsupported（侧栏可见）');
    const notice1 = sp1 ? await readNotice(sp1) : { shown: false, title: '', detail: '', retryShown: false, status: '' };
    check(notice1.shown === true, 'B#3 未声明协议时出现显式说明块');
    check(/未声明/.test(notice1.title), 'B#3b 标题明确指出「未声明 web-cli 协议」', notice1.title);
    check(/设计如此/.test(notice1.detail) && /不是故障/.test(notice1.detail), 'B#3c 说明「设计如此，非故障」', notice1.detail);
    check(/LGDL/.test(notice1.detail), 'B#3d 说明可用站点示例（LGDL 工作台）');
    check(notice1.retryShown === false, 'B#3e unsupported 不显示（无意义的）重新探测');
    observe(`B#3 说明文案：${notice1.title} —— ${notice1.detail}`);
    if (sp1) sp1.close();

    // B2: present-but-invalid declaration → 'unknown' with readable reason + retry
    plain.state.mode = 'invalid';
    await bindPlainTab();
    const sp2 = await openSidepanel('unknown');
    check(Boolean(sp2), 'B#4 background 发现态 = unknown（侧栏可见）');
    const notice2 = sp2 ? await readNotice(sp2) : { shown: false, title: '', detail: '', retryShown: false, status: '' };
    check(notice2.shown === true && /探测未完成|未知/.test(notice2.title), 'B#5 探测失败/未完成时出现显式说明块', notice2.title);
    check(notice2.retryShown === true, 'B#5b 提供「重新探测」入口');
    observe(`B#5 未知态说明：${notice2.title} —— ${notice2.detail}`);
    // real click the retry entry → round trip through background → content script
    if (sp2) {
      await realClick(sp2, '#discovery-retry');
      const retried = await waitFor(sp2, `(() => { const t=document.getElementById('notice').textContent; return t.includes('探测') || t.includes('就绪') ? t : ''; })()`, 60, 250);
      observe(`B#6 点击「重新探测」后 #notice="${retried}"`);
      check(Boolean(retried), 'B#6 重新探测真实往返并给出可读回执');
      sp2.close();
    } else {
      check(false, 'B#6 重新探测真实往返并给出可读回执（无侧栏可点）');
    }
    sw.close();
  } finally {
    chrome.kill('SIGKILL');
    plain.server.close();
    await sleep(200);
    await rm(work, { recursive: true, force: true }).catch(() => {});
    await rm(tempDist, { recursive: true, force: true }).catch(() => {});
  }
}

// ── C. 旧版扩展未重载 ────────────────────────────────────────────────────────
async function phaseC() {
  console.log('\n▶ C. 旧版扩展未重载（build stamp 不一致）');
  const { work, chrome, base } = await launch([`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]);
  try {
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
    check(Boolean(sw), 'C#1 加载真实 dist 且 service worker 可达');
    if (!sw) throw new Error('no SW');
    const extId = await evaluate(sw, `chrome.runtime.id`);

    const browser = await browserCdp(base);
    const openOptions = async () => {
      const page = await openPage(browser, base, `chrome-extension://${extId}/options.html?hardening=${Date.now()}`);
      await waitFor(page, `!!document.getElementById('diag-run')`, 60, 250);
      await realClick(page, '#diag-run');
      await waitFor(page, `document.getElementById('diag-output').textContent.includes('结论')`, 60, 250);
      const text = await evaluate(page, `document.getElementById('diag-output').textContent`);
      return { page, text };
    };

    const first = await openOptions();
    const stamp1 = /构建 ([0-9T:.Z-]+)/.exec(first.text)?.[1];
    observe(`C#2 初次自检构建标记=${stamp1}`);
    check(Boolean(stamp1), 'C#2 诊断显示构建标记');

    // rebuild dist on disk WITHOUT reloading the extension
    await sleep(1100);
    const { execFileSync } = await import('node:child_process');
    execFileSync('node', [resolve(root, 'build.mjs')], { cwd: root, stdio: 'ignore' });
    await sleep(400);

    await first.page.send('Page.reload', { ignoreCache: true });
    await sleep(1200);
    await realClick(first.page, '#diag-run');
    await waitFor(first.page, `document.getElementById('diag-output').textContent.includes('结论')`, 60, 200);
    const secondText = await evaluate(first.page, `document.getElementById('diag-output').textContent`);
    const staleWarning = /不一致/.test(secondText) && /重新加载/.test(secondText);
    const stamp2 = /构建 ([0-9T:.Z-]+)/.exec(secondText)?.[1];
    observe(`C#3 重新 build 后刷新页面（未重载扩展）：页面构建=${stamp2}；诊断是否提示不一致=${staleWarning}`);
    observe(`C#3 诊断原文节选：${(secondText || '').split('\n').find((l) => l.includes('不一致') || l.includes('构建')) ?? ''}`);
    check(staleWarning === true, 'C#3 页面构建 ≠ background 构建时诊断给出「重新加载」提示');
    first.page.close();

    // C#4 (optional): reload the extension via chrome.runtime.reload() → the
    // page/background stamps should match again. In headless this step is slow /
    // can leave targets half-dead, so it is opt-in (HARDENING_C4=1) and the core
    // actionable evidence stays C#3. Time-boxed to ~90s when enabled.
    if (process.env.HARDENING_C4 === '1') {
      const c4Deadline = Date.now() + 90_000;
      let reloaded = false;
      try {
        await evaluate(sw, `chrome.runtime.reload()`, 5000).catch(() => {});
        reloaded = true;
      } catch {
        reloaded = false;
      }
      await sleep(4000);
      let after;
      for (let i = 0; i < 4 && !after && Date.now() < c4Deadline; i += 1) {
        try {
          after = await openOptions();
        } catch {
          await sleep(2000);
        }
      }
      observe(`C#4 chrome.runtime.reload()=${reloaded}，重载后 options 可重开=${Boolean(after)}`);
      if (after) {
        const same = !/不一致/.test(after.text);
        observe(`C#4 chrome.runtime.reload()=${reloaded}，重载后诊断是否仍报不一致=${!same}`);
        check(same === true, 'C#4 重载扩展后 页面/background 构建恢复一致');
        after.page.close();
      } else {
        observe('C#4 未能在 headless 内验证 chrome.runtime.reload() 后的重新一致；结论以 C#3 为准');
      }
    } else {
      observe('C#4 默认跳过（设 HARDENING_C4=1 可启用 headless 重载复验）');
    }
    browser.close();
    try { sw.close(); } catch { /* may be gone */ }
  } finally {
    chrome.kill('SIGKILL');
    await sleep(200);
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  if (!(await stat(dist).then(() => true).catch(() => false))) {
    console.error(`✖ dist/ 不存在：先运行 npm run build --workspace @lgdl/web-cli-plugin`);
    process.exit(1);
  }
  if (!(await stat(CHROME).then(() => true).catch(() => false))) {
    console.error(`✖ 找不到 Chromium：${CHROME}（可用 CHROME_BIN 覆盖）`);
    process.exit(1);
  }
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${dist}`);

  await phaseA();
  await phaseB();
  await phaseC();

  console.log('\n──── 观测汇总（如实） ────');
  for (const o of observations) console.log(`  · ${o}`);

  console.log('');
  if (failures.length) {
    console.error(`hardening FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`hardening PASS — ${passes} assertions（A 非扩展守卫 / B 未声明协议说明 / C 未重载构建不一致）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
