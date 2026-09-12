/**
 * UI 旅程测试（TASK-018，`npm run test:ui`）——真实用户点击路径的可重复门禁。
 *
 * 为什么需要它：既有的 node 单测覆盖机制层，R8 `test:e2e` 覆盖 content→background
 * 全链，但都**不经过 options 页的真实输入与点击**。用户实测反馈的「填 Key 没法保存 /
 * 没有测试连接」恰好落在这一段盲区。本脚本用**全新 user-data-dir + 真实 `dist/`**
 * 加 CDP `Input.dispatchKeyEvent` / `Input.dispatchMouseEvent` 真实键入与点击，把
 * 「保存 → 读回 storage → 刷新回显 → 测试连接」纳入可重复门禁。
 *
 * 覆盖断言：
 *  1. 全新 profile 加载真实 dist，找到 web-cli plugin service worker；
 *  2. options 页真实打开、无 load 期异常；
 *  3. 真实键入 provider / apiKey / model / baseURL；
 *  4. 真实点击「保存」→ #saved 出现「已保存」、#apiKey 被清空、#key-warning 消失；
 *  5. 从 SW 上下文 `chrome.storage.local` 读回 → 键名 `web-cli:web-cli:llm`、值结构正确；
 *  6. 刷新 options → 回显当前配置（厂商 · 模型 · Key 已配）；
 *  7. 「测试连接」真实点击 → 经 background 打本地 mock OpenAI 端点 → 出现可读结果（含 ms）；
 *  8. 全程 0 页面异常 / 0 console error，否则打印并**非零退出**。
 *
 * TASK-020 追加（缺陷修复实证）：
 *  9. 保存后 `#key-state`=「Key ✅ 已写入（不回显）」且 `#apiKey` placeholder=「已保存（不回显）…」，
 *     `#saved` 为成功色（不再把「成功」做成「空框」）；
 * 10. 侧栏 LLM 行含 `Key ✅`；
 * 11. 「无活跃站点」显示具体原因 + 下一步动作 + 「重新绑定当前标签页」按钮，且发送禁用原因在输入框旁可见；
 * 12. 侧栏「测试连接」可点并复用 `llm-test`（stored config）给出可读结果（含 ms）。
 *
 * 依赖：Node ≥ 22（全局 WebSocket / fetch）、本机 `.pw-browsers` Chromium（或 CHROME_BIN）。
 * 前置：`npm run build --workspace @lgdl/web-cli-plugin`。
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(root, '..', '..');
const dist = resolve(root, 'dist');
const CHROME = process.env.CHROME_BIN || resolve(repoRoot, '.pw-browsers', 'chromium-1234', 'chrome-linux64', 'chrome');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── assertions ───────────────────────────────────────────────────────────────
const failures = [];
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

// ── minimal CDP client (raw WebSocket, no dependency) ────────────────────────
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
  const res = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
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

async function boxOf(cdp, selector) {
  return evaluate(
    cdp,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`,
  );
}

async function realClick(cdp, selector) {
  const box = await boxOf(cdp, selector);
  if (!box) throw new Error(`selector not found: ${selector}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
}

/** Real per-character typing (`keyDown` carries text + matching `keyUp`). */
async function typeText(cdp, text) {
  for (const ch of text) {
    // NB: do NOT set `windowsVirtualKeyCode` from the code point — e.g. '.' is 46
    // (VK_DELETE), which makes Chrome treat the keystroke as Delete. For printable
    // text, the `text` field alone drives insertion.
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  }
}

/** Focus (real click) + triple-click select-all + real type (replaces content). */
async function fillSelector(cdp, selector, text) {
  await realClick(cdp, selector);
  const box = await boxOf(cdp, selector);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 3 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 3 });
  await typeText(cdp, text);
}

/** Real keyboard selection of a `<select>` option (typeahead, then ArrowDown fallback). */
async function selectByKeyboard(cdp, selector, targetValue) {
  await realClick(cdp, selector);
  const first = String(targetValue).slice(0, 1);
  const code = first.toUpperCase().charCodeAt(0);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: first, unmodifiedText: first, key: first, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', text: first, unmodifiedText: first, key: first, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  let value = await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).value`);
  if (value === targetValue) return value;
  // Fallback: walk the options with ArrowDown (still real keyboard input).
  const opts = await evaluate(cdp, `[...document.querySelector(${JSON.stringify(selector)}).options].map(o=>o.value)`);
  const delta = opts.indexOf(targetValue) - opts.indexOf(value);
  for (let i = 0; i < Math.abs(delta); i += 1) {
    const key = delta > 0 ? 'ArrowDown' : 'ArrowUp';
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: delta > 0 ? 40 : 38 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: delta > 0 ? 40 : 38 });
  }
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  return evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).value`);
}

async function waitFor(cdp, expression, tries = 100, gapMs = 200) {
  for (let i = 0; i < tries; i += 1) {
    const v = await evaluate(cdp, expression).catch(() => undefined);
    if (v) return v;
    await sleep(gapMs);
  }
  return undefined;
}

// ── hermetic mock OpenAI endpoint ────────────────────────────────────────────
function startMockLlm() {
  const server = createServer((req, res) => {
    if (process.env.UI_DEBUG) console.log(`  [mock] ${req.method} ${req.url}`);
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      // Echo the preflight's requested headers: the OpenAI SDK adds
      // x-stainless-* headers, and a static allow-list would fail the preflight.
      'access-control-allow-headers': req.headers['access-control-request-headers'] || 'authorization, content-type',
      // Private Network Access: the extension SW (a non-private origin) fetching
      // 127.0.0.1 needs this on the preflight, otherwise Chrome blocks it.
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
        res.writeHead(200, { ...cors, 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'chatcmpl-journey',
            object: 'chat.completion',
            created: 0,
            model: 'journey-mock',
            choices: [{ index: 0, message: { role: 'assistant', content: 'pong' }, finish_reason: 'stop' }],
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

// ── main journey ─────────────────────────────────────────────────────────────
async function main() {
  if (!(await stat(dist).then(() => true).catch(() => false))) {
    console.error(`✖ dist/ 不存在：先运行 npm run build --workspace @lgdl/web-cli-plugin（期望 ${dist}）`);
    process.exit(1);
  }
  if (!(await stat(CHROME).then(() => true).catch(() => false))) {
    console.error(`✖ 找不到 Chromium：${CHROME}（可用 CHROME_BIN 覆盖）`);
    process.exit(1);
  }

  const mock = await startMockLlm();
  console.log(`▶ mock LLM: ${mock.origin}`);
  console.log(`▶ chrome:   ${CHROME}`);
  console.log(`▶ dist:     ${dist}`);

  const work = await mkdtemp(join(tmpdir(), 'web-cli-ui-journey-'));
  const profile = join(work, 'profile');
  const port = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--user-data-dir=${profile}`,
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      `--remote-debugging-port=${port}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let chromeLog = '';
  chrome.stdout.on('data', (d) => (chromeLog += d));
  chrome.stderr.on('data', (d) => (chromeLog += d));
  const base = `http://127.0.0.1:${port}`;

  const pageExceptions = [];
  const pageConsoleErrors = [];
  const spExceptions = [];
  const spConsoleErrors = [];

  try {
    // 1. our extension service worker (Chrome also starts built-in SWs)
    let sw, swTarget;
    for (let i = 0; i < 120 && !sw; i += 1) {
      const list = await fetch(`${base}/json/list`).then((r) => r.json()).catch(() => []);
      for (const t of list) {
        if (t.type !== 'service_worker' || !t.url.startsWith('chrome-extension://')) continue;
        try {
          const probe = await connectCdp(t.webSocketDebuggerUrl);
          await probe.send('Runtime.enable');
          if ((await evaluate(probe, `chrome.runtime.getManifest().name`)) === 'web-cli plugin') {
            sw = probe;
            swTarget = t;
            break;
          }
          probe.close();
        } catch {
          /* not ours / not ready */
        }
      }
      if (!sw) await sleep(250);
    }
    check(Boolean(sw), '#1 全新 profile 加载真实 dist 且 web-cli plugin service worker 可达');
    if (!sw) throw new Error('no web-cli plugin service worker found');

    // 2. open the real options page + capture load-time errors
    await evaluate(sw, `chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }).then(t=>t.id)`);
    const optTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('options.html'));
    check(Boolean(optTarget), '#2 options 页（chrome-extension://…/options.html）真实打开');
    if (!optTarget) throw new Error('options target not found');

    const page = await connectCdp(optTarget.webSocketDebuggerUrl);
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Page.enable');
    page.on('Runtime.exceptionThrown', (p) => pageExceptions.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    page.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') pageConsoleErrors.push(p.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    });
    page.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error') pageConsoleErrors.push(p.entry.text);
    });
    await page.send('Page.reload', { ignoreCache: true });
    await sleep(1200);

    const initial = await evaluate(page, `(() => ({
      hasForm: !!document.getElementById('form'),
      hasKey: !!document.getElementById('apiKey'),
      hasModel: !!document.getElementById('model'),
      hasSave: !!document.getElementById('save'),
      hasTest: !!document.getElementById('test'),
      warningShown: document.getElementById('key-warning').classList.contains('show'),
    }))()`);
    check(initial.hasForm && initial.hasKey && initial.hasModel && initial.hasSave, '#3 表单元素齐全（form/#apiKey/#model/#save）');
    check(initial.hasTest === true, '#3b 「测试连接」按钮存在');
    check(initial.warningShown === true, '#3c 全新安装显示「尚未配置 API Key」提示');

    // 3. real input: provider via keyboard, fields via typing
    const providerValue = await selectByKeyboard(page, '#provider', 'openai');
    check(providerValue === 'openai', '#4 真实键盘切换厂商 → openai', `got=${providerValue}`);
    await fillSelector(page, '#apiKey', 'sk-journey-test-123456');
    await fillSelector(page, '#model', 'journey-mock');
    await fillSelector(page, '#baseURL', `${mock.origin}/v1`);
    const typed = await evaluate(page, `(() => ({
      apiKey: document.getElementById('apiKey').value,
      model: document.getElementById('model').value,
      baseURL: document.getElementById('baseURL').value,
    }))()`);
    check(typed.apiKey === 'sk-journey-test-123456', '#5 真实键入 API Key 未被装饰', `got=${typed.apiKey}`);
    check(typed.model === 'journey-mock', '#5b 真实键入模型名正确', `got=${typed.model}`);
    check(typed.baseURL === `${mock.origin}/v1`, '#5c 真实键入 Base URL 正确', `got=${typed.baseURL}`);

    // 4. real click save
    await realClick(page, '#save');
    await waitFor(page, `document.getElementById('saved').textContent.includes('已保存')`);
    const afterSave = await evaluate(page, `(() => ({
      apiKey: document.getElementById('apiKey').value,
      placeholder: document.getElementById('apiKey').placeholder,
      keyState: document.getElementById('key-state').textContent,
      saved: document.getElementById('saved').textContent,
      savedClass: document.getElementById('saved').className,
      warningShown: document.getElementById('key-warning').classList.contains('show'),
    }))()`);
    check(/已保存/.test(afterSave.saved), '#6 真实点击「保存」出现成功回执', afterSave.saved);
    check(afterSave.apiKey === '', '#6b 保存成功后 #apiKey 被真正清空', `got='${afterSave.apiKey}'`);
    check(afterSave.warningShown === false, '#6c 保存成功后未配置警告消失');
    // TASK-020 A: an empty box must read as "saved (not echoed)", not as failure.
    check(/已写入/.test(afterSave.keyState), '#6d 保存后 #key-state 显示「Key ✅ 已写入（不回显）」', afterSave.keyState);
    check(/已保存（不回显）/.test(afterSave.placeholder), '#6e 保存后 placeholder 变为「已保存（不回显）…」', afterSave.placeholder);
    check(/msg-ok/.test(afterSave.savedClass), '#6f 成功回执使用成功色（msg-ok）', afterSave.savedClass);

    // 5. read back from the SW (authoritative storage)
    const stored = await evaluate(sw, `chrome.storage.local.get(null).then((d) => d)`);
    const entry = stored['web-cli:web-cli:llm'];
    check(Boolean(entry), '#7 chrome.storage.local 存在键 web-cli:web-cli:llm');
    check(entry?.active === 'openai', '#7b 落库 active=openai', JSON.stringify(entry));
    check(entry?.providers?.openai?.apiKey === 'sk-journey-test-123456', '#7c 落库 apiKey 与键入一致');
    check(entry?.providers?.openai?.model === 'journey-mock', '#7d 落库 model 与键入一致');
    check(entry?.providers?.openai?.baseURL === `${mock.origin}/v1`, '#7e 落库 baseURL 与键入一致');

    // 6. reload → echo
    await page.send('Page.reload', { ignoreCache: true });
    await sleep(1200);
    const afterReload = await evaluate(page, `(() => ({
      provider: document.getElementById('provider').value,
      model: document.getElementById('model').value,
      saved: document.getElementById('saved').textContent,
      keyState: document.getElementById('key-state').textContent,
      placeholder: document.getElementById('apiKey').placeholder,
      warningShown: document.getElementById('key-warning').classList.contains('show'),
    }))()`);
    check(afterReload.provider === 'openai' && afterReload.model === 'journey-mock', '#8 刷新后回显厂商/模型', JSON.stringify(afterReload));
    check(/当前配置/.test(afterReload.saved) && /Key ✅/.test(afterReload.saved), '#8b 刷新后回显配置摘要（含 Key ✅）', afterReload.saved);
    check(afterReload.warningShown === false, '#8c 刷新后不再提示未配置');
    check(/已写入/.test(afterReload.keyState) && /已保存（不回显）/.test(afterReload.placeholder), '#8d 刷新后仍显示「已写入」+ 已保存 placeholder', `${afterReload.keyState} | ${afterReload.placeholder}`);

    // 7. test connection (real click → background → mock endpoint)
    await realClick(page, '#test');
    const testText = await waitFor(
      page,
      `(() => { const t = document.getElementById('test-result').textContent; return t && !t.includes('正在向') ? t : ''; })()`,
      150,
      200,
    );
    check(Boolean(testText), '#9 「测试连接」真实点击后产生可读结果');
    check(/连接正常/.test(testText ?? ''), '#9b 连接本地 mock 端点成功', testText);
    check(/ms/.test(testText ?? ''), '#9c 成功结果包含延迟 ms', testText);

    // 8. TASK-020: side panel — Key state / 无活跃站点 explanation + rebind / panel test
    await evaluate(sw, `chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') }).then((t) => t.id)`);
    const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    check(Boolean(spTarget), '#11 侧栏页（chrome-extension://…/sidepanel.html）真实打开');
    if (!spTarget) throw new Error('sidepanel target not found');

    const sp = await connectCdp(spTarget.webSocketDebuggerUrl);
    await sp.send('Runtime.enable');
    await sp.send('Log.enable');
    sp.on('Runtime.exceptionThrown', (p) => spExceptions.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    sp.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') spConsoleErrors.push(p.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    });
    sp.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error') spConsoleErrors.push(p.entry.text);
    });
    await sp.send('Page.reload', { ignoreCache: true });
    await sleep(1200);

    const llmLine = await waitFor(
      sp,
      `(() => { const t = document.getElementById('llm-status')?.textContent ?? ''; return /Key ✅/.test(t) ? t : ''; })()`,
      60,
      250,
    );
    check(/Key ✅/.test(llmLine ?? ''), '#11b 侧栏 LLM 行含 Key ✅', llmLine);

    const site = await evaluate(sp, `(() => {
      const h = document.getElementById('site-hint');
      return {
        shown: getComputedStyle(h).display !== 'none',
        title: document.getElementById('site-hint-title').textContent,
        action: document.getElementById('site-hint-action').textContent,
        rebind: !!document.getElementById('rebind'),
        sendDisabled: document.getElementById('send').disabled,
        sendReason: document.getElementById('send-reason').textContent,
      };
    })()`);
    check(site.shown === true, '#11c 无活跃站点时显示可解释块（不再只有「无活跃站点」）', JSON.stringify(site));
    check(/不可注入|尚未绑定|没有可用标签页/.test(site.title), '#11d 显示具体原因文案', site.title);
    check(/重新绑定当前标签页/.test(site.action), '#11e 给出下一步动作', site.action);
    check(site.rebind === true, '#11f 「重新绑定当前标签页」按钮存在');
    check(site.sendDisabled === true && /发送已禁用/.test(site.sendReason), '#11g 发送禁用原因在输入框附近可见', site.sendReason);

    // 9. panel-side test connection (reuses `llm-test` with the stored config)
    await realClick(sp, '#llm-test');
    const spTestText = await waitFor(
      sp,
      `(() => { const t = document.getElementById('llm-test-result').textContent; return t && !t.includes('正在') ? t : ''; })()`,
      150,
      200,
    );
    check(Boolean(spTestText), '#12 侧栏「测试连接」可点并产生可读结果');
    check(/连接正常/.test(spTestText ?? ''), '#12b 侧栏连接本地 mock 端点成功', spTestText);
    check(/ms/.test(spTestText ?? ''), '#12c 侧栏成功结果含延迟 ms', spTestText);
    check(spExceptions.length === 0, '#13 侧栏页 0 未捕获异常', spExceptions.join(' | '));
    check(spConsoleErrors.length === 0, '#13b 侧栏页 0 console error', spConsoleErrors.join(' | '));

    // 10. error surface
    check(pageExceptions.length === 0, '#10 options 页 0 未捕获异常', pageExceptions.join(' | '));
    check(pageConsoleErrors.length === 0, '#10b options 页 0 console error', pageConsoleErrors.join(' | '));

    sw.close();
    page.close();
    sp.close();
  } catch (err) {
    failures.push(`journey harness error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('✖ journey harness error:', err);
    if (process.env.UI_DEBUG) console.error(chromeLog.slice(-3000));
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    mock.server.close();
    await sleep(300);
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }

  console.log('');
  if (failures.length) {
    console.error(`UI journey FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    if (pageExceptions.length) console.error('page exceptions:', pageExceptions);
    if (pageConsoleErrors.length) console.error('console errors:', pageConsoleErrors);
    process.exit(1);
  }
  console.log(`UI journey PASS — ${passes} assertions: 全新 profile 真实 dist，真实键入+点击：保存→读回→回显→测试连接`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
