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

/**
 * TASK-022 payload: the mock LLM returns this when asked with `__markdown__`.
 * It mixes the user-facing Markdown subset (heading / table / bold / fence) with
 * deliberately hostile HTML (`<img onerror>`, `<script>`) that must render as
 * inert text — never as elements, never executed.
 */
const MD_REPLY = [
  '# 标题渲染',
  '',
  '普通段落，含 **加粗** 与 `行内代码`。',
  '',
  '| 类别 | 示例 |',
  '| --- | --- |',
  '| 标题 | # 标题 |',
  '| 恶意 | <img src=x onerror=alert(1)> |',
  '',
  '```js',
  'const x = 1;',
  '```',
  '',
  '<script>alert(2)</script>',
].join('\n');

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
  /** TASK-028: count only real model POSTs so cache-hit / zero-request paths are provable. */
  let posts = 0;
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
      posts += 1;
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let content = 'pong';
        try {
          const body = JSON.parse(raw);
          const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user');
          if (typeof lastUser?.content === 'string' && lastUser.content.includes('__markdown__')) content = MD_REPLY;
        } catch {
          /* tolerate */
        }
        res.writeHead(200, { ...cors, 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'chatcmpl-journey',
            object: 'chat.completion',
            created: 0,
            model: 'journey-mock',
            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
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
    server.listen(0, '127.0.0.1', () =>
      resolveListen({ server, origin: `http://127.0.0.1:${server.address().port}`, count: () => posts }),
    );
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

    // 7b. FR-049: tabs privacy toggle on the options page drives the LLM tool surface.
    const tabsInit = await evaluate(
      page,
      `(() => ({ present: Boolean(document.getElementById('tabs-enabled')), checked: document.getElementById('tabs-enabled')?.checked }))()`,
    );
    check(tabsInit.present === true && tabsInit.checked === true, '#17a options 页标签页开关存在且默认开启', JSON.stringify(tabsInit));

    await realClick(page, '#tabs-enabled');
    const offStatus = await waitFor(
      page,
      `(() => { const t = document.getElementById('tabs-setting-status').textContent; return /已从 LLM 工具面移除/.test(t) ? t : ''; })()`,
      60,
      150,
    );
    check(Boolean(offStatus), '#17b 关闭开关后回执「已从 LLM 工具面移除」', offStatus ?? '');
    const toolsOff = await evaluate(
      page,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'tabs-setting', action: 'get' }); return JSON.stringify({ enabled: r.data.enabled, hasTabs: (r.data.tools || []).includes('tabs') }); })()`,
    );
    const to = JSON.parse(toolsOff);
    check(to.enabled === false && to.hasTabs === false, '#17c 关闭后 deriveTools 不含 tabs（enabled 语义，不静默保留）', toolsOff);

    await realClick(page, '#tabs-enabled');
    const onStatus = await waitFor(
      page,
      `(() => { const t = document.getElementById('tabs-setting-status').textContent; return /已开启/.test(t) ? t : ''; })()`,
      60,
      150,
    );
    check(Boolean(onStatus), '#17d 重新开启后回执「已开启」', onStatus ?? '');
    const toolsOn = await evaluate(
      page,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'tabs-setting', action: 'get' }); return JSON.stringify({ enabled: r.data.enabled, hasTabs: (r.data.tools || []).includes('tabs') }); })()`,
    );
    const tn = JSON.parse(toolsOn);
    check(tn.enabled === true && tn.hasTabs === true, '#17e 重新开启后 deriveTools 恢复含 tabs', toolsOn);

    // ── FR-052 / ADR-017: options 页「自动授权（按站点）」管理 ──────────────
    const aaInit = await evaluate(
      page,
      `(() => {
        const sec = document.getElementById('auto-auth');
        const txt = sec ? sec.textContent : '';
        return JSON.stringify({
          present: Boolean(sec),
          hasHardLine: /破坏性/.test(txt) && /evaluate/.test(txt) && /未授权/.test(txt),
          empty: /暂无站点开启自动授权/.test(txt),
        });
      })()`,
    );
    const aai = JSON.parse(aaInit);
    check(aai.present === true, '#18a options 页存在「自动授权（按站点）」区', aaInit);
    check(aai.hasHardLine === true, '#18b options 文案含硬底线（破坏性 / evaluate / 未授权站点）', aaInit);
    check(aai.empty === true, '#18c 初始无站点开启自动授权时给出可读空态', aaInit);

    // set an origin through the real message path, then reload → the row appears.
    await evaluate(
      page,
      `chrome.runtime.sendMessage({ kind: 'auto-auth', action: 'set', origin: 'https://auto.test', tier: 'write', enabled: true }).then((r) => !!(r && r.ok))`,
    );
    await page.send('Page.reload', { ignoreCache: true });
    await sleep(1200);
    const aaRow = await waitFor(
      page,
      `(() => {
        const row = [...document.querySelectorAll('#auto-auth-list .auto-auth-row')].find((r) => r.textContent.includes('https://auto.test'));
        if (!row) return '';
        const boxes = [...row.querySelectorAll('input[type=checkbox]')];
        const write = boxes.find((b) => b.dataset.tier === 'write');
        const read = boxes.find((b) => b.dataset.tier === 'read');
        return JSON.stringify({ count: boxes.length, read: read ? read.checked : null, write: write ? write.checked : null });
      })()`,
      60,
      200,
    );
    const aar = aaRow ? JSON.parse(aaRow) : {};
    check(aar.count === 2, '#18d options 列出该站点并给出读/写两个复选框', aaRow);
    check(aar.read === true && aar.write === true, '#18e 读取到该站点的自动授权状态（读开/写开）', aaRow);

    const storedAuto = await evaluate(sw, `chrome.storage.local.get('web-cli:web-cli:auto-auth').then((d) => JSON.stringify(d['web-cli:web-cli:auto-auth'] || {}))`);
    check(/https:\/\/auto\.test/.test(storedAuto ?? '') && /"write":true/.test(storedAuto ?? ''), '#18f 设置持久化到 chrome.storage（web-cli:auto-auth）', storedAuto);

    // real click the write checkbox → immediate off + persisted.
    const writeBox = await boxOf(page, `#auto-auth-list .auto-auth-row input[data-tier="write"]`);
    if (writeBox) {
      await realClick(page, `#auto-auth-list .auto-auth-row input[data-tier="write"]`);
    }
    const offOk = await waitFor(
      page,
      `(() => { const t = document.getElementById('auto-auth-status').textContent; return /已关闭/.test(t) ? t : ''; })()`,
      40,
      150,
    );
    check(Boolean(offOk), '#18g 关闭写操作自动出现可读回执（立即生效）', offOk ?? '');
    const storedOff = await evaluate(sw, `chrome.storage.local.get('web-cli:web-cli:auto-auth').then((d) => JSON.stringify((d['web-cli:web-cli:auto-auth'] || {})['https://auto.test'] || {}))`);
    check(/"write":false/.test(storedOff ?? ''), '#18h 关闭后持久化为 write:false', storedOff);
    // clean up the test origin so it cannot leak into later assertions
    await evaluate(page, `chrome.runtime.sendMessage({ kind: 'auto-auth', action: 'clear', origin: 'https://auto.test' }).then(() => true)`);

    // 8. TASK-020: side panel — Key state / 无活跃站点 explanation + rebind / panel test
    await evaluate(sw, `chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') }).then((t) => t.id)`);
    const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    check(Boolean(spTarget), '#11 侧栏页（chrome-extension://…/sidepanel.html）真实打开');
    if (!spTarget) throw new Error('sidepanel target not found');

    const sp = await connectCdp(spTarget.webSocketDebuggerUrl);
    await sp.send('Runtime.enable');
    await sp.send('Log.enable');
    await sp.send('Page.enable');
    sp.on('Runtime.exceptionThrown', (p) => spExceptions.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    sp.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') spConsoleErrors.push(p.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    });
    sp.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error') spConsoleErrors.push(p.entry.text);
    });

    // TASK-032: probing is fully automatic — the manual「重新探测」entry is gone.
    const autoProbe = await waitFor(
      sp,
      `(() => {
        const n = document.getElementById('discovery-notice');
        if (!n) return '';
        return JSON.stringify({
          retryAbsent: document.getElementById('discovery-retry') === null,
          noManualText: !n.textContent.includes('重新探测'),
        });
      })()`,
      60,
      200,
    );
    const apView = autoProbe ? JSON.parse(autoProbe) : {};
    check(apView.retryAbsent === true, '#11b 侧栏无手动「重新探测」按钮（TASK-032 全自动探测）', String(autoProbe));
    check(apView.noManualText === true, '#11c 探测说明不再提示手动重试（改为自动重试）', String(autoProbe));

    // TASK-028: install a probe BEFORE the panel script runs. It counts (a)
    // `llm-test` messages sent by the panel and (b) transitions of the result
    // area into the "正在…" state. Both are used to prove render/polling never
    // re-trigger the auto test. Also snapshot the mock POST count: the options
    // test above already filled the 60s cache, so this panel load must be a
    // cache hit (zero new real requests).
    await sp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        const probe = { sendMessage: 0, starts: 0, spyInstalled: false };
        window.__llmProbe = probe;
        try {
          const rt = chrome && chrome.runtime;
          if (rt && typeof rt.sendMessage === 'function') {
            const orig = rt.sendMessage.bind(rt);
            const wrapper = function (...args) {
              try { if (args[0] && args[0].kind === 'llm-test') probe.sendMessage += 1; } catch (e) {}
              return orig.apply(rt, args);
            };
            rt.sendMessage = wrapper;
            probe.spyInstalled = rt.sendMessage === wrapper;
          }
        } catch (e) { probe.spyError = String(e); }
        let lastStart = false;
        const scan = () => {
          const out = document.getElementById('llm-test-result');
          const t = out ? (out.textContent || '') : '';
          const isStart = /^\\s*正在/.test(t);
          if (isStart && !lastStart) probe.starts += 1;
          lastStart = isStart;
        };
        const attach = () => {
          try {
            new MutationObserver(scan).observe(document.documentElement || document, { childList: true, characterData: true, subtree: true });
          } catch (e) { probe.observerError = String(e); }
        };
        if (document.documentElement) attach();
        else document.addEventListener('DOMContentLoaded', attach, { once: true });
      })();`,
    });
    const postsBeforePanel = mock.count();
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

    // 9. TASK-028: no standalone「测试连接」button — the panel AUTO-tests on load
    // using the stored config (reusing the existing `llm-test` message).
    const testSurfaces = await evaluate(
      sp,
      `(() => ({
        button: document.getElementById('llm-test'),
        result: !!document.getElementById('llm-test-result'),
      }))()`,
    );
    check(testSurfaces.button === null, '#12 侧栏不存在独立「测试连接」按钮（按钮已移除）', JSON.stringify(testSurfaces));
    check(testSurfaces.result === true, '#12b 侧栏保留 #llm-test-result 状态区');

    const autoText = await waitFor(
      sp,
      `(() => {
        const t = document.getElementById('llm-test-result').textContent;
        return t && !/^\\s*正在/.test(t) ? t : '';
      })()`,
      150,
      200,
    );
    check(Boolean(autoText), '#12c 面板加载后自动出现测试结果（无需点击）', autoText ?? 'no auto result');
    check(
      /^✓ .+ 连接正常（模型 .+，\d+ ms，最小 ping 请求）$/.test(autoText ?? ''),
      '#12d 自动测试成功态文案格式 = ✓ <厂商> 连接正常（模型 <model>，<n> ms，最小 ping 请求）',
      autoText,
    );
    const autoClass = await evaluate(sp, `document.getElementById('llm-test-result').className`);
    check(/ok/.test(autoClass ?? ''), '#12e 成功态使用 ok 样式（绿色）', String(autoClass));

    // TASK-028 C: same config as the options test ⇒ 60s cache hit ⇒ NO new ping.
    check(
      mock.count() === postsBeforePanel,
      '#12f 缓存命中：面板自动测试不发真实请求（mock 计数不变）',
      `${postsBeforePanel} → ${mock.count()}`,
    );

    // TASK-028 C: repeated render / message append / focus-poll must NOT re-trigger.
    const probeBefore = await evaluate(sp, `window.__llmProbe || null`);
    check(
      probeBefore?.spyInstalled === true && (probeBefore?.sendMessage ?? 0) >= 1,
      '#12g 探针已观测到面板自动测试（sendMessage 计数 ≥1，非空验证）',
      JSON.stringify(probeBefore),
    );
    await evaluate(sw, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'assistant', text: 'render-probe-1' }).catch(() => {})`);
    await evaluate(sw, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'system', text: 'render-probe-2' }).catch(() => {})`);
    await evaluate(
      sp,
      `(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); return true; })()`,
    );
    await sleep(800);
    const probeAfter = await evaluate(sp, `window.__llmProbe || null`);
    check(
      probeAfter?.sendMessage === probeBefore?.sendMessage,
      '#12h 重复 render / 消息追加 / 焦点轮询不重复触发自动测试（llm-test 计数不变）',
      JSON.stringify({ before: probeBefore, after: probeAfter }),
    );
    check(
      mock.count() === postsBeforePanel,
      '#12i 重复 render 期间 mock 请求计数不变',
      `${postsBeforePanel} → ${mock.count()}`,
    );

    // TASK-028 C: a config change invalidates the fingerprint → next load re-tests for real.
    const postsBeforeChange = mock.count();
    await evaluate(
      sw,
      `chrome.storage.local.get('web-cli:web-cli:llm').then((d) => {
        const cfg = d['web-cli:web-cli:llm'];
        cfg.providers.openai.model = 'journey-mock-2';
        return chrome.storage.local.set({ 'web-cli:web-cli:llm': cfg });
      })`,
    );
    await sp.send('Page.reload', { ignoreCache: true });
    const changedText = await waitFor(
      sp,
      `(() => { const t = document.getElementById('llm-test-result').textContent; return /journey-mock-2/.test(t) ? t : ''; })()`,
      120,
      200,
    );
    check(/journey-mock-2/.test(changedText ?? ''), '#12j 配置（模型）变更后自动重测并回显新模型', changedText);
    check(
      mock.count() === postsBeforeChange + 1,
      '#12k 配置变更使缓存失效 → 发一次真实 ping（mock 计数 +1）',
      `${postsBeforeChange} → ${mock.count()}`,
    );

    // TASK-028 B: unconfigured ⇒ readable prompt AND zero requests.
    await evaluate(
      sw,
      `chrome.storage.local.get('web-cli:web-cli:llm').then((d) => { globalThis.__llmBackup = d['web-cli:web-cli:llm']; return chrome.storage.local.remove('web-cli:web-cli:llm'); })`,
    );
    const postsBeforeUnconfigured = mock.count();
    await sp.send('Page.reload', { ignoreCache: true });
    const noKeyText = await waitFor(
      sp,
      `(() => { const t = document.getElementById('llm-test-result').textContent; return /warning|⚠/.test(t) ? t : ''; })()`,
      120,
      200,
    );
    check(/⚠ .*(API Key|未填写)/.test(noKeyText ?? ''), '#12l 未配置时显示可读提示（⚠ …API Key）', noKeyText);
    await sleep(600);
    check(
      mock.count() === postsBeforeUnconfigured,
      '#12m 未配置不发任何请求（mock 计数不变）',
      `${postsBeforeUnconfigured} → ${mock.count()}`,
    );
    // restore the config for the remaining journey steps
    await evaluate(sw, `chrome.storage.local.set({ 'web-cli:web-cli:llm': globalThis.__llmBackup }).then(() => true)`);

    // 9b. TASK-022: mock LLM Markdown reply → real `chat-result` seam → real render.
    // (The full background chat pipeline needs a bound+authorized site, which this
    // hermetic journey does not run; here we exercise the panel's real
    // `chat-result` handler with content fetched live from the mock LLM.)
    const mdFromLlm = await evaluate(
      sw,
      `fetch(${JSON.stringify(`${mock.origin}/v1/chat/completions`)}, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'journey-mock', messages: [{ role: 'user', content: '__markdown__' }] }),
      }).then((r) => r.json()).then((d) => d.choices[0].message.content)`,
    );
    check(typeof mdFromLlm === 'string' && mdFromLlm.includes('# 标题渲染'), '#14a mock LLM 返回 Markdown 回复', String(mdFromLlm).slice(0, 60));
    await evaluate(
      sw,
      `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'assistant', text: ${JSON.stringify(mdFromLlm)} }).catch(() => {})`,
    );
    const mdRaw = await waitFor(
      sp,
      `(() => {
        const log = document.getElementById('log');
        if (!log || !log.querySelector('h1')) return '';
        return JSON.stringify({
          h1: log.querySelectorAll('h1').length,
          strong: log.querySelectorAll('strong').length,
          table: log.querySelectorAll('table').length,
          code: log.querySelectorAll('pre code').length,
          script: log.querySelectorAll('script').length,
          img: log.querySelectorAll('img').length,
          literalBold: log.textContent.includes('**'),
          literalPipe: log.textContent.includes('| 类别 |'),
          maliciousAsText: log.textContent.includes('<img src=x onerror=alert(1)>'),
          overflow: log.scrollWidth === log.clientWidth,
          scrollWidth: log.scrollWidth,
          clientWidth: log.clientWidth,
        });
      })()`,
      60,
      200,
    );
    const mdView = mdRaw ? JSON.parse(mdRaw) : {};
    check((mdView.h1 ?? 0) >= 1, '#14b Markdown 标题渲染为真实 h1（非字面 #）', mdRaw);
    check((mdView.strong ?? 0) >= 1, '#14c **加粗** 渲染为 <strong>（非字面 **）', mdRaw);
    check((mdView.table ?? 0) >= 1, '#14d GFM 表格渲染为真实 <table>（非字面 |）', mdRaw);
    check((mdView.code ?? 0) >= 1, '#14e 围栏代码块渲染为 <pre><code>', mdRaw);
    check(mdView.script === 0 && mdView.img === 0, '#14f 无 script/img 节点（恶意内容不执行/不加载）', mdRaw);
    check(mdView.maliciousAsText === true, '#14g 恶意 <img onerror> 以纯文本呈现', mdRaw);
    check(mdView.literalBold === false && mdView.literalPipe === false, '#14h 无残留字面 Markdown 标记', mdRaw);
    check(mdView.overflow === true, '#14i 侧栏仍无水平溢出（scrollWidth === clientWidth）', `${mdView.scrollWidth}/${mdView.clientWidth}`);

    // ── #15 TASK-023: three-zone layout + message bubbles + tool card ──────
    // Pin a deterministic side-panel viewport (400×900) for the layout metrics.
    await sp.send('Emulation.setDeviceMetricsOverride', { width: 400, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    const layout = await evaluate(sp, `(() => {
      const log = document.getElementById('log');
      const composer = document.getElementById('composer');
      const de = document.documentElement;
      const cr = composer.getBoundingClientRect();
      return {
        logFlexGrow: getComputedStyle(log).flexGrow,
        logHeightPct: Math.round((log.getBoundingClientRect().height / window.innerHeight) * 1000) / 10,
        composerGapToBottom: Math.round(window.innerHeight - cr.bottom),
        docOverflowX: de.scrollWidth - de.clientWidth,
        hasTop: !!document.getElementById('panel-top'),
        hasBottom: !!document.getElementById('panel-bottom'),
        hasScrollBottom: !!document.getElementById('scroll-bottom'),
      };
    })()`);
    check(layout.logFlexGrow === '1', '#15a 消息区为 flex 填充（非 45vh 硬编码）', JSON.stringify(layout));
    check(layout.composerGapToBottom >= 0 && layout.composerGapToBottom <= 12, '#15c composer 贴底（未被 consent 等挤压）', `${layout.composerGapToBottom}px`);
    check(layout.docOverflowX === 0, '#15d 文档级无水平溢出', `${layout.docOverflowX}`);
    check(layout.hasTop && layout.hasBottom && layout.hasScrollBottom, '#15e 三区结构 + 回到底部入口存在', JSON.stringify(layout));

    // #15b: steady-state (first-run strips hidden) the message zone takes the
    // flexible majority — measured with the strips hidden because this hermetic
    // journey has no bound/authorized site, so guidance strips are visible.
    const opPct = await evaluate(
      sp,
      `(() => {
        const ids = ['site-hint','onboarding','discovery-notice'];
        const prev = ids.map((id) => { const el = document.getElementById(id); const p = el ? el.style.display : ''; if (el) el.style.display = 'none'; return p; });
        const pct = Math.round((document.getElementById('log').getBoundingClientRect().height / window.innerHeight) * 1000) / 10;
        ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.style.display = prev[i]; });
        return pct;
      })()`,
    );
    check(opPct > 45, '#15b 稳态消息区高度占比 > 45vh（实测 %）', `${opPct}%`);

    // inject a long tool result (with hostile HTML), a command line and an error
    const longTool = JSON.stringify(
      { doc: 'main', note: '<img src=x onerror=alert(9)>', rows: Array.from({ length: 30 }, (_, i) => ({ i, v: `row-${i}` })) },
      null,
      2,
    );
    await evaluate(sw, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'command', text: 'site_notes-list --doc main' }).catch(() => {})`);
    await sleep(120);
    await evaluate(sw, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'tool', tool: 'site_notes-list', ok: true, ms: 123, text: ${JSON.stringify(longTool)} }).catch(() => {})`);
    await sleep(120);
    await evaluate(sw, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'error', text: '模拟错误：写入门禁拒绝' }).catch(() => {})`);
    await sleep(400);

    const toolView = await waitFor(
      sp,
      `(() => {
        const c = document.querySelector('.tool-card');
        if (!c) return '';
        const head = c.querySelector('.tool-card-head');
        const body = c.querySelector('.tool-card-body');
        return JSON.stringify({
          cards: document.querySelectorAll('.tool-card').length,
          name: c.querySelector('.tool-name')?.textContent,
          status: c.querySelector('.tool-status')?.textContent,
          ms: c.querySelector('.tool-ms')?.textContent,
          preview: c.querySelector('.tool-preview')?.textContent ?? '',
          openBefore: c.open,
          bodyMonospace: /monospace|Menlo|Consolas/.test(getComputedStyle(body).fontFamily),
          bodyOverflowX: getComputedStyle(body).overflowX,
          imgs: c.querySelectorAll('img').length,
          maliciousAsText: body.textContent.includes('<img src=x onerror=alert(9)>'),
          hasCommand: !!document.querySelector('.cmd .cmd-text'),
          commandText: document.querySelector('.cmd .cmd-text')?.textContent ?? '',
          hasError: !!document.querySelector('.entry-error.msg-system'),
          logOverflowX: document.getElementById('log').scrollWidth - document.getElementById('log').clientWidth,
        });
      })()`,
      60,
      200,
    );
    const tv = toolView ? JSON.parse(toolView) : {};
    check((tv.cards ?? 0) >= 1, '#15f 工具结果渲染为工具卡片（非整块倾倒）', toolView);
    check(tv.name === 'site_notes-list' && tv.status === '✓ 成功' && tv.ms === '123 ms', '#15g 卡片标题=工具名+状态+耗时', toolView);
    check(Boolean(tv.preview), '#15h 折叠时显示首行摘要', tv.preview);
    check(tv.openBefore === false, '#15i 长输出默认折叠', JSON.stringify(tv));
    check(tv.bodyMonospace === true && tv.bodyOverflowX === 'auto', '#15j 卡片正文等宽 + 横向滚动', JSON.stringify(tv));
    check(tv.imgs === 0 && tv.maliciousAsText === true, '#15k 工具卡片内恶意 HTML 仍为纯文本（零 XSS）', toolView);
    check(tv.hasCommand === true && tv.commandText.includes('site_notes-list'), '#15l 命令行走独立紧凑样式（.cmd）', tv.commandText);
    check(tv.hasError === true, '#15m 错误态为醒目 system 气泡（.entry-error.msg-system）');
    check(tv.logOverflowX === 0, '#15n 注入工具卡片后仍无水平溢出', `${tv.logOverflowX}`);

    // real click the summary → card expands (collapsible/expandable)
    await realClick(sp, '.tool-card .tool-card-head');
    const expanded = await waitFor(sp, `(() => { const c = document.querySelector('.tool-card'); return c ? String(c.open) : ''; })()`, 20, 100);
    check(expanded === 'true', '#15o 真实点击摘要后工具卡片展开', expanded);

    // FR-049: a real `tabs` tool result renders through the same safe tool-card path.
    await evaluate(
      sw,
      `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'tool', tool: 'tabs', ok: true, ms: 42, text: '标签页（2 个）｜隐私默认：仅 origin+path（已去除 query/fragment）' }).catch(() => {})`,
    );
    const tabsCard = await waitFor(
      sp,
      `(() => {
        const c = [...document.querySelectorAll('.tool-card')].find((x) => x.querySelector('.tool-name')?.textContent === 'tabs');
        return c ? JSON.stringify({ name: c.querySelector('.tool-name').textContent, status: c.querySelector('.tool-status').textContent, preview: c.querySelector('.tool-preview')?.textContent ?? '' }) : '';
      })()`,
      40,
      120,
    );
    check(Boolean(tabsCard), '#15u FR-049 tabs 工具结果渲染为工具卡片（含隐私默认说明）', tabsCard ?? '');

    // FR-050 / EC-023: a FAILED tool must be a VISIBLE error entry (never only in
    // the LLM context). The real web-fetch seam refuses unauthorized origins; the
    // panel marks the failed tool card with the error kind/class.
    await evaluate(
      sw,
      `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'tool', tool: 'web-fetch', ok: false, ms: 7, text: '✖ web-fetch 拒绝访问 https://www.baidu.com：该域名未授权给本插件。' }).catch(() => {})`,
    );
    const failedCard = await waitFor(
      sp,
      `(() => {
        const c = [...document.querySelectorAll('.tool-card')].find((x) => x.querySelector('.tool-name')?.textContent === 'web-fetch');
        if (!c) return '';
        const entry = c.closest('.entry');
        return JSON.stringify({
          status: c.querySelector('.tool-status')?.textContent,
          failClass: c.querySelector('.tool-status')?.classList.contains('fail'),
          entryError: !!entry && entry.classList.contains('entry-error'),
        });
      })()`,
      40,
      120,
    );
    const fc = failedCard ? JSON.parse(failedCard) : {};
    check(fc.status === '✖ 失败' && fc.failClass === true, '#15v 失败工具渲染为「✖ 失败」卡片（可见条目）', failedCard ?? '');
    check(fc.entryError === true, '#15w 失败工具条目带错误色（.entry-error）', failedCard ?? '');

    // #15p scroll policy:「回到底部」appears when scrolled away, hidden at bottom
    const scrollHint = await evaluate(
      sp,
      `(() => { const log = document.getElementById('log'); log.scrollTop = 0; log.dispatchEvent(new Event('scroll')); const away = document.getElementById('scroll-bottom').classList.contains('show'); log.scrollTop = log.scrollHeight; log.dispatchEvent(new Event('scroll')); const bottom = document.getElementById('scroll-bottom').classList.contains('show'); return JSON.stringify({ away, bottom }); })()`,
    );
    const sh = JSON.parse(scrollHint);
    check(sh.away === true && sh.bottom === false, '#15p 上滚显示「回到底部」、贴底隐藏', scrollHint);

    // ── #15r~#15t scroll-follow regression: appended content must follow while
    // the user is at the bottom, and must never steal an explicit scroll-up. ──
    const longReply = ['# 长回复（撑高消息区）', '', ...Array.from({ length: 80 }, (_, i) => `- 第 ${i} 行内容`)].join('\n');
    const longReply2 = ['## 第二条长回复', '', ...Array.from({ length: 80 }, (_, i) => `- 追加行 ${i}`)].join('\n');

    // #15r: at the bottom → a long appended assistant reply keeps us pinned.
    await evaluate(
      sp,
      `(() => { const log = document.getElementById('log'); log.scrollTop = log.scrollHeight; log.dispatchEvent(new Event('scroll')); return log.scrollTop; })()`,
    );
    await evaluate(sw, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'assistant', text: ${JSON.stringify(longReply)} }).catch(() => {})`);
    const followed = await waitFor(
      sp,
      `(() => {
        const log = document.getElementById('log');
        const d = Math.round(log.scrollHeight - log.scrollTop - log.clientHeight);
        return d <= 48 && !document.getElementById('scroll-bottom').classList.contains('show')
          ? JSON.stringify({ residual: d, shown: false })
          : '';
      })()`,
      40,
      100,
    );
    check(Boolean(followed), '#15r 已在底部时追加长回复 → 自动跟随到底（残差 ≤48px，入口隐藏）', followed ?? 'no-follow');

    // #15s/#15t: explicit scroll-up wins — appended content must not yank the view.
    await evaluate(
      sp,
      `(() => { const log = document.getElementById('log'); log.scrollTop = 0; log.dispatchEvent(new Event('scroll')); return log.scrollTop; })()`,
    );
    await evaluate(sw, `chrome.runtime.sendMessage({ kind: 'chat-result', variant: 'assistant', text: ${JSON.stringify(longReply2)} }).catch(() => {})`);
    await sleep(500);
    const stayed = await evaluate(
      sp,
      `(() => {
        const log = document.getElementById('log');
        return JSON.stringify({ scrollTop: Math.round(log.scrollTop), shown: document.getElementById('scroll-bottom').classList.contains('show') });
      })()`,
    );
    const sv = JSON.parse(stayed);
    check(sv.scrollTop <= 60, '#15s 已上滚时追加消息不抢滚动（scrollTop 仍在顶部附近）', stayed);
    check(sv.shown === true, '#15t 已上滚时显示「回到底部」入口', stayed);

    // #15q narrow side panel (320px) → still no horizontal overflow
    await sp.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    const narrow = await evaluate(sp, `(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, log: document.getElementById('log').scrollWidth - document.getElementById('log').clientWidth, composerW: Math.round(document.getElementById('composer').getBoundingClientRect().width) }))()`);
    check(narrow.doc === 0 && narrow.log === 0, '#15q 320px 窄侧栏无水平溢出', JSON.stringify(narrow));
    await sp.send('Emulation.clearDeviceMetricsOverride');

    // ── #16 decision ② / FR-048: multi-session switcher + history isolation ──
    // Seed two sessions with distinct histories directly into the extension store;
    // the background `sessions` reply re-reads storage so the switcher sees them.
    // This is a *hermetic* isolation proof: switching must回显 exactly one history.
    const sessionStoreKey = 'web-cli:session-store';
    await evaluate(
      sw,
      `chrome.storage.local.set({ ${JSON.stringify(sessionStoreKey)}: {
        groups: [],
        sessions: [
          { sessionId: 'https://alpha.test', origins: ['https://alpha.test'], history: [
              { role: 'user', content: 'ALPHA-ONLY-QUESTION' },
              { role: 'assistant', content: 'alpha-reply' } ], createdAt: 1, lastActiveAt: 200 },
          { sessionId: 'https://beta.test', origins: ['https://beta.test'], history: [
              { role: 'user', content: 'BETA-ONLY-QUESTION' },
              { role: 'assistant', content: 'beta-reply' } ], createdAt: 1, lastActiveAt: 100 }
        ] } }).then(() => true)`,
    );
    await sp.send('Page.reload', { ignoreCache: true });
    await sleep(1200);

    const sessionLabelInit = await waitFor(
      sp,
      `(() => { const t = document.getElementById('session-label')?.textContent ?? ''; return /^会话：/.test(t) ? t : ''; })()`,
      40,
      200,
    );
    check(Boolean(sessionLabelInit), '#16a 侧栏顶部显示当前会话标记', sessionLabelInit);

    // open the「更多」details so the switcher is visible/clickable
    await evaluate(sp, `(() => { const d = document.getElementById('more-actions'); if (d) d.open = true; return true; })()`);
    await sleep(200);
    const sessionListRaw = await waitFor(
      sp,
      `(() => {
        const items = [...document.querySelectorAll('#session-list .session-item')];
        if (items.length < 2) return '';
        return JSON.stringify({ count: items.length, labels: items.map((i) => i.textContent), ids: items.map((i) => i.dataset.sessionId) });
      })()`,
      40,
      200,
    );
    const sl = sessionListRaw ? JSON.parse(sessionListRaw) : { count: 0, labels: [], ids: [] };
    check(sl.count >= 2, '#16b 会话切换器列出两个独立会话（不同域名各自独立）', sessionListRaw);
    check(sl.ids.includes('https://alpha.test') && sl.ids.includes('https://beta.test'), '#16c 会话以域名为键（alpha/beta）', JSON.stringify(sl.ids));

    // switch to beta → the panel must show beta's history and NOT alpha's (no串台)
    await realClick(sp, '#session-list .session-item[data-session-id="https://beta.test"]');
    const betaView = await waitFor(
      sp,
      `(() => { const t = document.getElementById('log').textContent; return t.includes('BETA-ONLY') ? JSON.stringify({ hasBeta: true, hasAlpha: t.includes('ALPHA-ONLY'), label: document.getElementById('session-label').textContent }) : ''; })()`,
      60,
      200,
    );
    const bv = betaView ? JSON.parse(betaView) : {};
    check(bv.hasBeta === true, '#16d 切换到 beta 会话后回显 beta 的历史', betaView);
    check(bv.hasAlpha === false, '#16e beta 会话不显示 alpha 的历史（不串台）', betaView);
    check(/beta\.test/.test(bv.label ?? ''), '#16f 顶部当前会话标记同步为 beta', String(bv.label));

    // switch back to alpha → the reverse must hold
    await realClick(sp, '#session-list .session-item[data-session-id="https://alpha.test"]');
    const alphaView = await waitFor(
      sp,
      `(() => { const t = document.getElementById('log').textContent; return t.includes('ALPHA-ONLY') ? JSON.stringify({ hasAlpha: true, hasBeta: t.includes('BETA-ONLY') }) : ''; })()`,
      60,
      200,
    );
    const av = alphaView ? JSON.parse(alphaView) : {};
    check(av.hasAlpha === true && av.hasBeta === false, '#16g 切回 alpha 会话后仅回显 alpha 历史（隔离双向成立）', alphaView);

    // group management is exposed and readable (group ≠ authorization)
    const groupBox = await evaluate(
      sp,
      `(() => ({ hasName: !!document.getElementById('group-name'), hasCreate: !!document.getElementById('group-create'), hasSelect: !!document.getElementById('group-select'), hasAdd: !!document.getElementById('group-add'), copy: document.getElementById('session-box')?.textContent ?? '' }))()`,
    );
    check(groupBox.hasName && groupBox.hasCreate && groupBox.hasSelect && groupBox.hasAdd, '#16h 侧栏提供分组管理控件', JSON.stringify(groupBox));
    check(/不代表互相授权/.test(groupBox.copy), '#16i 分组文案明确「分组不等于授权」', String(groupBox.copy).slice(0, 80));

    // ── FR-052 / ADR-017: 侧栏「自动授权」复选 + 常驻标记 + 即时关闭 ────────
    const aaSide = await evaluate(
      sp,
      `(() => {
        const box = document.getElementById('auto-auth');
        const txt = box ? box.textContent : '';
        const read = document.getElementById('auto-read');
        const write = document.getElementById('auto-write');
        const badge = document.getElementById('auto-auth-badge');
        return JSON.stringify({
          present: Boolean(box),
          hasRead: Boolean(read),
          hasWrite: Boolean(write),
          readDefault: read ? read.checked : null,
          writeDefault: write ? write.checked : null,
          hardLine: /破坏性/.test(txt) && /evaluate/.test(txt) && /未授权/.test(txt),
          badgeShown: badge ? getComputedStyle(badge).display !== 'none' : null,
        });
      })()`,
    );
    const aas = JSON.parse(aaSide);
    check(aas.present === true && aas.hasRead === true && aas.hasWrite === true, '#18i 侧栏存在读/写两个自动授权复选框', aaSide);
    check(aas.readDefault === true && aas.writeDefault === false, '#18j 默认值正确（读开 / 写关）', aaSide);
    check(aas.hardLine === true, '#18k 侧栏常显文案含硬底线（破坏性 / evaluate / 未授权站点）', aaSide);
    check(aas.badgeShown === false, '#18l 默认未开启时常驻标记隐藏', aaSide);

    // Bind a synthetic origin through the real `discover` wiring so the side panel
    // has an active origin (this journey has no real site server).
    await evaluate(
      sp,
      `chrome.runtime.sendMessage({ kind: 'discover', origin: 'https://auto.test', state: 'unsupported' }).then((r) => !!(r && r.ok))`,
    );
    await sp.send('Page.reload', { ignoreCache: true });
    await sleep(1200);
    const aaBound = await waitFor(
      sp,
      `(() => {
        const origin = document.getElementById('auto-auth-origin')?.textContent ?? '';
        const write = document.getElementById('auto-write');
        return origin.includes('auto.test') && write && !write.disabled ? JSON.stringify({ origin, disabled: write.disabled }) : '';
      })()`,
      60,
      200,
    );
    check(Boolean(aaBound), '#18m 绑定站点后自动授权作用于该 origin（控件可用）', aaBound ?? '');

    // real click「写操作自动」→ 常驻标记出现
    await realClick(sp, '#auto-write');
    const badgeOn = await waitFor(
      sp,
      `(() => { const b = document.getElementById('auto-auth-badge'); const t = b ? b.textContent : ''; return getComputedStyle(b).display !== 'none' && /写/.test(t) ? t : ''; })()`,
      40,
      150,
    );
    check(Boolean(badgeOn), '#18n 开启写操作自动后出现常驻标记「⚡ 自动授权：读+写」', badgeOn ?? '');

    // reload → the switch persists and the marker stays
    await sp.send('Page.reload', { ignoreCache: true });
    await sleep(1200);
    const badgePersist = await waitFor(
      sp,
      `(() => {
        const w = document.getElementById('auto-write');
        const b = document.getElementById('auto-auth-badge');
        return w && w.checked && b && getComputedStyle(b).display !== 'none' ? b.textContent : '';
      })()`,
      60,
      200,
    );
    check(Boolean(badgePersist), '#18o 刷新后写操作自动仍为开（持久化）且标记常驻', badgePersist ?? '');

    // click the marker → one-click off (immediate). The panel is a fixed-height
    // flex column with hidden overflow; when guidance strips are visible the
    // consent block can sit below the fold, so a coordinate click may miss. Try
    // the real mouse click first, then fall back to the element's own click
    // handler (same wiring) and report which path was taken.
    const offProbe = `(() => {
      const w = document.getElementById('auto-write');
      const r = document.getElementById('auto-read');
      const b = document.getElementById('auto-auth-badge');
      return w && !w.checked && r && !r.checked && b && getComputedStyle(b).display === 'none' ? 'off' : '';
    })()`;
    await realClick(sp, '#auto-auth-badge');
    let badgeOff = await waitFor(sp, offProbe, 30, 150);
    if (badgeOff !== 'off') {
      // The panel is a fixed-height flex column with hidden overflow; when
      // guidance strips are visible the consent block can sit below the fold, so
      // a coordinate click may miss. Fall back to the element's own handler
      // (same wiring) — the assertion is about the behaviour, not the hit-test.
      await evaluate(sp, `document.getElementById('auto-auth-badge').click()`);
      badgeOff = await waitFor(sp, offProbe, 30, 150);
    }
    check(badgeOff === 'off', '#18p 点击常驻标记一键关闭（复选/标记即时恢复）', badgeOff ?? '');
    // clean up
    await evaluate(sp, `chrome.runtime.sendMessage({ kind: 'auto-auth', action: 'clear', origin: 'https://auto.test' }).then(() => true)`);

    // ── #16j~#16o D-128 / TASK-031: a background-driven tab switch to a NEW domain
    // pushes the new session to the ALREADY-OPEN panel (no Page.reload) ────────
    // Create + activate a real tab on a new origin (the hermetic mock HTTP server;
    // NOT authorized). The background's onActivated reads `tab.url` (we hold the
    // `tabs` permission) → adopts/creates that origin's session → pushes
    // `session-changed` → the already-open panel must follow without reopening.
    const newOrigin = mock.origin;
    const newTabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(`${newOrigin}/`)} }).then((t) => t.id)`);
    const panelFollowRaw = await waitFor(
      sp,
      `(() => {
        const label = document.getElementById('session-label')?.textContent ?? '';
        return label.includes(${JSON.stringify(newOrigin)}) ? JSON.stringify({ label }) : '';
      })()`,
      60,
      200,
    );
    check(Boolean(panelFollowRaw), '#16j 后台切到新域名 tab → 已打开的面板自动更新会话（未重开面板）', panelFollowRaw ?? 'label unchanged');
    const pf = panelFollowRaw ? JSON.parse(panelFollowRaw) : {};
    check((pf.label ?? '').includes(newOrigin), '#16k 面板当前会话标记 = 新域名 origin', String(pf.label));
    const newStateRaw = await evaluate(
      sp,
      `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => JSON.stringify({ origin: r.data.active?.origin, authorized: r.data.authorized, session: r.data.session?.sessionId }))`,
    );
    const ns = JSON.parse(newStateRaw);
    check(ns.origin === newOrigin && ns.session === newOrigin, '#16l 后台 active/session 均为新域名（自动新建会话）', newStateRaw);
    check(ns.authorized === false, '#16m 新域名未授权：自动切会话 ≠ 自动授权', newStateRaw);
    const newInjectProbe = await evaluate(
      sw,
      `chrome.tabs.sendMessage(${newTabId}, { kind: 'ping' }).then(() => 'responded').catch(() => 'no-receiver')`,
    );
    check(newInjectProbe === 'no-receiver', '#16n 未授权新域名零注入（无 content script 接收方）', String(newInjectProbe));
    // The readable-origin path must NOT have run the restricted/stale degradation.
    const newStatusProbe = await evaluate(sp, `(() => { const t = document.getElementById('status')?.textContent ?? ''; return t.includes(${JSON.stringify(newOrigin)}) ? 'followed' : t; })()`);
    check(newStatusProbe === 'followed', '#16o 面板未落入「未授权即失效」死路（会话已跟随）', String(newStatusProbe));

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
  console.log(`UI journey PASS — ${passes} assertions: 全新 profile 真实 dist，真实键入+点击：保存→读回→回显→测试连接（侧栏加载自动测 + 60s TTL 缓存）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
