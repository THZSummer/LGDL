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
import { mkdirSync, writeFileSync } from 'node:fs';
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
// ── V3-1 (registered supersession V31-S2): L1/fallback pre-steps ─────────────
// v3-1 made the toolbar an L1 disclosure and the composer hidden-until-used. These
// two helpers step through the product's own controller so every pre-existing
// assertion below keeps its exact selector and expectation (one extra interaction
// in front, nothing weakened).
const v3OpenStatusDetails = async (page) => {
  await evaluate(page, 'window.__v3 && window.__v3.testing && window.__v3.testing.openStatusDetails(); true');
  await sleep(250);
};
/**
 * Fold every L1/L2 layer again. The L1 status panel is tall (toolbar + consent +
 * auto-auth + risk controls); leaving it open would push the composer out of a
 * short viewport and break unrelated later assertions, so every pre-step closes
 * what it opened.
 */
const v3Collapse = async (page) => {
  await evaluate(page, 'window.__v3 && window.__v3.testing && window.__v3.testing.collapseAll(); true');
  await sleep(200);
};
const revealFallbackInput = async (page) => {
  await evaluate(page, 'window.__v3 && window.__v3.testing && window.__v3.testing.revealFallback(); true');
  await sleep(300);
  const state = await evaluate(
    page,
    `JSON.stringify({ composerHidden: document.getElementById('composer').hidden, inputDisabled: document.getElementById('input').disabled })`,
  );
  console.log(`  · [v3] fallback reveal（ADR-V3-014 §5）→ ${state}`);
};

const failures = [];
const observations = [];

/**
 * R2 修复轮 T4：失败诊断（完整栈 + 失败时面板/DOM 快照摘要）。
 *
 * 2/3 flake（`#33B1` / `#3d`）判为环境抖动但频率偏高；这里**只加诊断与就绪等待**，
 * **不放宽任何断言**（失败仍 `process.exit(1)`）。诊断落盘到 `R2_LOG_DIR`（默认
 * `/tmp/opencode/r2-3/logs`），便于下次定位「是渲染未就绪还是真回归」。
 */
const R2_LOG_DIR = process.env.R2_LOG_DIR || '/tmp/opencode/r2-3/logs';
const diagnostics = [];
const diagnosticContexts = new Map();

function stackOf() {
  const raw = new Error().stack ?? '';
  return raw.split('\n').slice(2, 7).map((l) => l.trim()).join(' | ');
}

let passes = 0;
function check(cond, label, detail) {
  if (cond) {
    passes += 1;
    console.log(`  ✔ ${label}`);
  } else {
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
    diagnostics.push({ label, detail: detail === undefined ? '' : String(detail), at: new Date().toISOString(), stack: stackOf() });
  }
}
function observe(text) {
  observations.push(text);
  console.log(`  · [观测] ${text}`);
}

/** 注册 CDP 上下文（失败时抓取 DOM 摘要；不改变任何断言）。 */
function registerContext(name, cdp) {
  diagnosticContexts.set(name, cdp);
}

const DIAG_SELECTORS = ['tree-fab', 'tree-drawer', 'settings-view', 'panel-main', 'status', 'log', 'composer', 'tree-breadcrumb'];

async function captureRuntimeSummary() {
  const out = {};
  for (const [name, cdp] of diagnosticContexts) {
    out[name] = await evaluate(
      cdp,
      `(() => ({
        url: location.href,
        ready: document.readyState,
        keyNodes: ${JSON.stringify(DIAG_SELECTORS)}.map((id) => id + ':' + (document.getElementById(id) ? '1' : '0')).join(','),
        treeNodes: document.querySelectorAll('#tree-drawer li.tree-node').length,
        bodyLen: ((document.body && document.body.innerText) || '').length,
      }))()`,
      8000,
    ).catch((e) => `ERR:${e instanceof Error ? e.message : String(e)}`);
  }
  return out;
}

async function dumpDiagnostics(reason) {
  // F-01 ②（2026-09-16）：诊断是 best-effort，**绝不允许**阻塞退出路径。这条 15s
  // 硬上限让被 await 的调用**自带终点**（即便仍有某处 CDP 往返挂住也会以失败退出，
  // 且此时 `process.exitCode` 已被调用方提前置 1）。
  const __hardStop = setTimeout(() => {
    console.error('✖ binding 诊断超时（15s 硬上限）→ 立即以失败退出（退出码已定）');
    process.exit(1);
  }, 15_000);
  try {
    mkdirSync(R2_LOG_DIR, { recursive: true });
    const summary = await captureRuntimeSummary();
    const file = `${R2_LOG_DIR}/binding-diagnostics-${Date.now()}.log`;
    writeFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), reason, passes, failures: [...failures], diagnostics, contexts: summary }, null, 2)}\n`);
    console.error(`✖ binding 诊断已落盘（完整栈 + DOM 摘要）：${file}`);
    console.error(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error('binding 诊断落盘失败（不影响断言结论）:', err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(__hardStop);
  }
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
  // F-01 ③（2026-09-16）：socket 关闭必须**立刻**拒结所有 pending。此前对 CLOSED
  // socket 调 `send()` 时消息永不到达（`ws.send()` 也不抛），Promise **永不 settle**，
  // 于是调用方的 `await` 永久挂起、失败无法传进退出码（虚绿的根因之一）。
  ws.addEventListener('close', () => {
    for (const [, p] of pending) p.reject(new Error('CDP socket closed'));
    pending.clear();
  });
  return {
    send(method, params = {}) {
      return new Promise((res, rej) => {
        // F-01 ③：非 OPEN 直接拒答（不挂起）+ 20s 往返硬上限（超时拒答）。
        if (ws.readyState !== 1 /* WebSocket.OPEN */) {
          rej(new Error(`CDP socket not open (readyState=${ws.readyState}): ${method}`));
          return;
        }
        const id = ++seq;
        pending.set(id, { resolve: res, reject: rej });
        // 计时器 `unref()`：settle 后不再持有事件循环；超时只在真的没答复时生效。
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            rej(new Error(`CDP timeout 20000ms: ${method}`));
          }
        }, 20000).unref?.();
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

/** Total tool-role messages seen by the mock LLM (monotonic within a run). */
function toolMessageCount() {
  let n = 0;
  for (const r of llmRequests) for (const m of r.messages ?? []) if (m.role === 'tool') n += 1;
  return n;
}
/** Wait until a NEW tool result lands (proves the tool actually executed). */
async function waitForNewToolMessage(base, tries = 150, gapMs = 100) {
  for (let i = 0; i < tries; i += 1) {
    if (toolMessageCount() > base) return true;
    await sleep(gapMs);
  }
  return false;
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
          const bkRemove = /__BOOKMARKS_REMOVE__:(\d+)/.exec(user);
          if (!lastIsTool && user.includes('__BOOKMARKS_LIST__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_bk_list', type: 'function', function: { name: 'bookmarks', arguments: JSON.stringify({ subcommand: 'list', args: {} }) } }],
            };
          } else if (!lastIsTool && bkRemove) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_bk_remove', type: 'function', function: { name: 'bookmarks', arguments: JSON.stringify({ subcommand: 'remove', args: { id: bkRemove[1] } }) } }],
            };
          } else if (!lastIsTool && user.includes('__DOWNLOADS_LIST__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_dl_list', type: 'function', function: { name: 'downloads', arguments: JSON.stringify({ subcommand: 'list', args: {} }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_LIST_FULL__')) {
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
          } else if (!lastIsTool && user.includes('__SITE_WRITE__')) {
            // FR-052: a NON-destructive write-tier site subcommand (status).
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_site_write', type: 'function', function: { name: 'site_lgdl-web-cli', arguments: JSON.stringify({ subcommand: 'status', args: {} }) } }],
            };
          } else if (!lastIsTool && user.includes('__SITE_DESTRUCTIVE__')) {
            // FR-052 hard floor: a destructive subcommand must keep asking.
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_site_destr', type: 'function', function: { name: 'site_lgdl-web-cli', arguments: JSON.stringify({ subcommand: 'remove-node', args: { id: 'n1' } }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_CLOSE_ALL__')) {
            // Author reversal (2026-09-13): batch close must be refused readably.
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_close_all', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'close', args: { all: 'true' } }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_MUTE__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_mute', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'mute', args: { match: 'disposable-mute', muted: 'true' } }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_PIN__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_pin', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'pin', args: { match: 'disposable-pin', pinned: 'true' } }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_MOVE__')) {
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_move', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'move', args: { match: 'disposable-move', index: '0' } }) } }],
            };
          } else if (!lastIsTool && user.includes('__TABS_CLOSE__')) {
            // A disposable self-created tab carries a secret query: close must
            // show the stripped URL in the confirm summary and never the secret.
            message = {
              role: 'assistant',
              content: '',
              tool_calls: [{ id: 'call_tabs_close', type: 'function', function: { name: 'tabs', arguments: JSON.stringify({ subcommand: 'close', args: { match: 'disposable-close' } }) } }],
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
  if (sw) registerContext('sw', sw);
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
      registerContext('unauth-page', page);
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

      // ── TASK-040: real `permissions.remove` (optional permission) → tool leaves
      // the LLM surface + `optional-permission/revoked` audit. The native grant
      // prompt (and thus a granted→onRemoved transition) stays a MANUAL item —
      // headless cannot synthesize it; disclosed, never faked as PASS.
      const bkBefore = await evaluate(page, `chrome.permissions.contains({ permissions: ['bookmarks'] }).then((v) => v)`);
      check(bkBefore === false, '#0j 真实 dist（未改动 manifest）：bookmarks 未授予（contains=false，optional_permissions）', String(bkBefore));
      const capToolsBefore = await evaluate(
        page,
        `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'capabilities', action: 'status' }); return JSON.stringify(r?.data?.tools || []); })()`,
      );
      check(/bookmarks/.test(capToolsBefore ?? ''), '#0k 撤销前工具面包含 bookmarks（未请求权限 ≠ 静默移除；调用会得到可读提示）', String(capToolsBefore));
      const removed = await evaluate(page, `chrome.permissions.remove({ permissions: ['bookmarks'] }).then((v) => 'RESOLVED:' + v).catch((e) => 'ERR:' + e.message)`);
      check(String(removed) === 'RESOLVED:true', '#0l 真实 chrome.permissions.remove({permissions:[bookmarks]}) 解析为 true（可选权限，无需手势）', String(removed));
      const afterRemoveContains = await evaluate(page, `chrome.permissions.contains({ permissions: ['bookmarks'] }).then((v) => v)`);
      check(afterRemoveContains === false, '#0m remove 后 contains=false（Chrome 权限已移除）', String(afterRemoveContains));
      // The exact reconcile the in-product「撤销」button sends.
      await evaluate(page, `chrome.runtime.sendMessage({ kind: 'capabilities', action: 'permission-changed', capability: 'bookmarks' }).then(() => true)`);
      const capToolsAfter = await evaluate(
        page,
        `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'capabilities', action: 'status' }); return JSON.stringify(r?.data?.tools || []); })()`,
      );
      check(!/bookmarks/.test(capToolsAfter ?? ''), '#0n 撤销对账后工具面不再含 bookmarks（工具从 deriveTools 移除，非仅 UI）', String(capToolsAfter));
      const auditEvents = await evaluate(page, `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'audit-export' }); return JSON.stringify(r?.data || []); })()`);
      const revokedAudit = (() => {
        try {
          return (JSON.parse(auditEvents ?? '[]') || []).some((e) => e.type === 'optional-permission' && e.tool === 'bookmarks' && e.decision === 'revoked');
        } catch {
          return false;
        }
      })();
      check(revokedAudit, '#0o 撤销写入 optional-permission/revoked 审计（零明文：仅工具名/决策/可读原因）', String(auditEvents).slice(0, 240));

      // ── T1 (2026-09-13 fix round): tree-side capability-revoke SUCCESS path, best effort.
      // The tree `revoke-capability` action calls the REAL `chrome.permissions.remove`;
      // success requires the optional capability to be GRANTED first. Headless cannot
      // synthesize the native `permissions.request` prompt (#0g above proves it stays
      // PENDING), so this probe attempts a real grant via `Runtime.evaluate` with
      // `userGesture:true` and only asserts the success path when it genuinely
      // resolves. Otherwise it records the limitation truthfully and keeps the existing
      // (failure-path) disclosure. It is NEVER faked as PASS.
      const v23Grant = await evaluate(
        page,
        `Promise.race([
           chrome.permissions.request({ permissions: ['bookmarks'] }).then((v) => 'RESOLVED:' + v).catch((e) => 'ERR:' + String(e)),
           new Promise((r) => setTimeout(() => r('PENDING_TIMEOUT'), 4000)),
         ])`,
        9000,
      );
      if (String(v23Grant) === 'RESOLVED:true') {
        await evaluate(page, `chrome.runtime.sendMessage({ kind: 'capabilities', action: 'permission-changed', capability: 'bookmarks' }).then(() => true)`);
        await sleep(500);
        const v23Fab = await evaluate(page, `(() => { const f = document.getElementById('tree-fab'); if (!f) return 'no-fab'; f.click(); return 'clicked'; })()`);
        const v23CapBtn = await waitFor(
          page,
          `(() => { const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="revoke-capability"]'); return b ? JSON.stringify({ label: b.textContent }) : ''; })()`,
          40,
          150,
        );
        check(v23Fab === 'clicked' && Boolean(v23CapBtn), '#21o 能力授予后树渲染真实 revoke-capability 控件（撤销成功路径前置）', String(v23CapBtn ?? v23Fab));
        await evaluate(page, `(() => { const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="revoke-capability"]'); if (!b) return false; b.click(); return true; })()`);
        await waitFor(page, `(() => { const c = document.getElementById('tree-confirm'); return c && !c.hidden ? 'shown' : ''; })()`, 40, 150);
        await evaluate(page, `(() => { const b = document.getElementById('tree-confirm-accept'); if (!b) return false; b.click(); return true; })()`);
        const v23OkReceipt = await waitFor(
          page,
          `(() => { const r = document.getElementById('tree-receipt'); if (!r || r.hidden) return ''; const t = r.textContent || ''; return /书签|撤销|已移除|成功|失败/.test(t) ? t : ''; })()`,
          60,
          200,
        );
        check(
          /已移除|撤销成功|成功/.test(v23OkReceipt ?? '') && !/失败|仍保留/.test(v23OkReceipt ?? ''),
          '#21o2 能力撤销成功回执可读（如实「已移除」，非失败文案）',
          String(v23OkReceipt).slice(0, 220),
        );
        const v23OkTools = await evaluate(
          page,
          `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'capabilities', action: 'status' }); return JSON.stringify(r?.data?.tools || []); })()`,
        );
        check(!/bookmarks/.test(v23OkTools ?? ''), '#21o3 撤销成功 → 工具即时移出 deriveTools()', String(v23OkTools));
        const v23OkAudit = await evaluate(page, `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'audit-export' }); return JSON.stringify(r?.data || []); })()`);
        const v23OkRevoked = (() => {
          try {
            return (JSON.parse(v23OkAudit ?? '[]') || []).some((e) => e.type === 'optional-permission' && e.tool === 'bookmarks' && e.decision === 'revoked');
          } catch {
            return false;
          }
        })();
        check(v23OkRevoked, '#21o4 撤销成功写入 optional-permission/revoked 审计（可经 audit-export 查证）', String(v23OkAudit).slice(0, 240));
      } else {
        observe(
          `#21o/#21o2/#21o3/#21o4 跳过（如实记录，不伪造 PASS）：headless 无法合成原生 grant 手势 → chrome.permissions.request = ${String(v23Grant)}；树侧「能力撤销成功」端到端因此保持人工面 V2-H-4，失败路径已由 #21j/#21k 覆盖。`,
        );
      }
      observe('TASK-040 披露：原生授权弹窗（request）与「已授权→onRemoved」过渡在 headless 不可合成；本节用真实可撤销的可选权限 + 真实 remove + 真实对账/审计取证，prompt 仍归人工面。');
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
  // FR-054 / FR-055 disclosure: the product keeps these capabilities in
  // `optional_permissions`; headless cannot synthesize the gesture-driven
  // `chrome.permissions.request` prompt, so this test copy moves them into static
  // `permissions` to prove the real chrome.bookmarks/downloads/notifications and
  // clipboard paths work when the permission is present (the gesture grant itself
  // stays a manual item). dist JS is byte-identical to the release build.
  const PRE_GRANTED_PERMISSIONS = ['bookmarks', 'downloads', 'notifications', 'clipboardRead', 'clipboardWrite'];
  manifest.permissions = [...manifest.permissions, ...PRE_GRANTED_PERMISSIONS];
  manifest.optional_permissions = (manifest.optional_permissions ?? []).filter((p) => !PRE_GRANTED_PERMISSIONS.includes(p));
  await writeFile(join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  observe(`临时 dist：host_permissions += ${SITE_PATTERN}；permissions += ${PRE_GRANTED_PERMISSIONS.join('/')}（FR-054/FR-055；JS 字节未改；见披露②）`);

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
    registerContext('panel', ext);
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
      // T4: readiness window widened (60→120 × 300ms) — an explicit wait for the
      // discovery signal, NOT a relaxation of the assertion.
      120,
      300,
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
    // V3-1 pre-step (registered): the authorize button now lives in the L1 status panel.
    await v3OpenStatusDetails(ext);
    await realClick(ext, '#authorize');
    await v3Collapse(ext);
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

    // ── TASK-033: the panel settings view does everything IN the panel ────────
    // (real dist + real extension: config read / test connection / auto-auth,
    //  with zero tab switches and zero options.html navigation)
    const listPages = async () =>
      (await fetch(`${base}/json/list`).then((r) => r.json()).catch(() => [])).filter((t) => t.type === 'page');
    const pagesBefore = (await listPages()).length;
    const optsBefore = (await listPages()).filter((t) => t.url.includes('options.html')).length;
    await evaluate(
      ext,
      `(() => {
        window.__ooCalled = 0;
        try {
          const orig = chrome.runtime.openOptionsPage.bind(chrome.runtime);
          chrome.runtime.openOptionsPage = (...a) => { window.__ooCalled += 1; return orig(...a); };
          window.__ooWrapped = true;
        } catch { window.__ooWrapped = false; }
        return window.__ooWrapped;
      })()`,
    );
    // T4: explicit readiness wait for the settings entry before clicking (so the
    // click lands on a wired control under load); the assertion below is unchanged.
    await waitFor(ext, `document.getElementById('open-settings') ? '1' : ''`, 60, 150);
    // V3-1 pre-step (registered): #open-settings is an L1 entry now.
    await v3OpenStatusDetails(ext);
    await realClick(ext, '#open-settings');
    await v3Collapse(ext);
    const settingsView = await waitFor(
      ext,
      `(() => {
        const v = document.getElementById('settings-view');
        const provider = document.getElementById('settings-provider');
        const model = document.getElementById('settings-model');
        if (!v || !v.classList.contains('show') || !provider || !model) return '';
        const sections = ['settings-llm','settings-auto-auth','settings-tabs','settings-sessions','settings-diagnostics','settings-compliance','settings-migration'];
        return JSON.stringify({
          url: location.href,
          chatHidden: getComputedStyle(document.getElementById('panel-main')).display === 'none',
          sections: sections.every((id) => !!document.getElementById(id)),
          provider: provider.value,
          providerOptions: provider.options.length,
          model: model.value,
          keyState: document.getElementById('settings-key-state').textContent,
        });
      })()`,
      // T4: readiness window widened (60→120 × 250ms) — wait for the real render.
      120,
      250,
    );
    const svp = settingsView ? JSON.parse(settingsView) : {};
    check(Boolean(settingsView), '#33B1 面板内设置视图真实渲染（真实 dist + 真实扩展，零跳转）', settingsView ?? 'no settings view');
    check(svp.chatHidden === true && /sidepanel\.html/.test(svp.url ?? ''), '#33B2 设置视图在同一面板内（聊天区仅隐藏；URL 仍 sidepanel.html）', String(svp.url));
    check(svp.sections === true, '#33B3 设置视图覆盖全部分区', settingsView);
    check(svp.providerOptions === 8 && svp.provider === 'openai' && svp.model === 'binding-mock', '#33B4 面板设置读取到已存配置（厂商/模型/8 选项）', JSON.stringify({ provider: svp.provider, model: svp.model }));
    check(/已写入/.test(svp.keyState ?? ''), '#33B5 面板设置显示 Key 已存状态（零明文）', String(svp.keyState));

    await realClick(ext, '#settings-test');
    const panelTest = await waitFor(
      ext,
      `(() => { const t = document.getElementById('settings-test-result').textContent; return t && !/正在/.test(t) ? t : ''; })()`,
      150,
      200,
    );
    check(/连接正常|测试连接失败/.test(panelTest ?? ''), '#33B6 面板设置内「测试连接」可用并回显可读结果（mock LLM）', String(panelTest).slice(0, 160));

    // auto-authorization checkbox, in the panel, through the existing channel
    await evaluate(ext, `(() => { const el = document.getElementById('settings-auto-write'); if (el) el.scrollIntoView({ block: 'center' }); return !!el; })()`);
    await sleep(200);
    await realClick(ext, '#settings-auto-write');
    const aaWriteOn = await waitFor(
      ext,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'auto-auth', action: 'get' }); const rec = (r.data.origins || []).find((x) => x.origin === 'http://localhost:5173'); return rec && rec.write === true ? JSON.stringify(rec) : ''; })()`,
      40,
      150,
    );
    check(Boolean(aaWriteOn), '#33B7 面板设置内勾选「写操作自动」经既有 auto-auth 通道即时持久化', aaWriteOn ?? '');
    await evaluate(ext, `document.getElementById('settings-auto-write').click()`);
    const aaWriteOff = await waitFor(
      ext,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'auto-auth', action: 'get' }); const rec = (r.data.origins || []).find((x) => x.origin === 'http://localhost:5173'); return rec && rec.write === false ? 'off' : ''; })()`,
      40,
      150,
    );
    check(aaWriteOff === 'off', '#33B8 面板设置内取消勾选立即关闭（持久化恢复）', String(aaWriteOff));

    await realClick(ext, '#settings-back');
    const backToChat = await waitFor(
      ext,
      `(() => { const v = document.getElementById('settings-view'); return v && !v.classList.contains('show') && getComputedStyle(document.getElementById('panel-main')).display !== 'none' ? 'chat' : ''; })()`,
      40,
      200,
    );
    check(backToChat === 'chat', '#33B9 「← 返回对话」回到聊天视图', String(backToChat));
    const ooCalled = await evaluate(ext, `window.__ooCalled`);
    const pagesAfter = (await listPages()).length;
    const optsAfter = (await listPages()).filter((t) => t.url.includes('options.html')).length;
    check(ooCalled === 0, '#33B10 面板设置入口零 openOptionsPage 调用（页面内计数=0）', String(ooCalled));
    check(pagesAfter === pagesBefore && optsAfter === optsBefore, '#33B11 面板设置全程零标签页跳转（page/options target 数不变）', `${pagesBefore}→${pagesAfter} / ${optsBefore}→${optsAfter}`);

    // V3-1 pre-step (registered): the composer is hidden-until-used disclosure; the
    // fallback state reveals it (ADR-V3-014 §5) before the unchanged real typing.
    await revealFallbackInput(ext);
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
    await revealFallbackInput(ext);
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
    // D-136 (TASK-033 harness robustness): a freshly created tab can still be
    // `loading` with an EMPTY `tab.url`, and binding legitimately refuses that
    // (address unreadable). Wait until Chrome exposes the address before rebinding
    // so this step proves the session switch rather than racing the loader.
    await waitFor(
      sw,
      `chrome.tabs.query({ active: true, currentWindow: true }).then((ts) => (ts[0] && typeof ts[0].url === 'string' && ts[0].url.length > 0 ? 'readable' : ''))`,
      60,
      250,
    );
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

    // ── author reversal (2026-09-13): real `tabs mute` / `pin` / `move` / `close`
    // through the real chat loop + confirm UI. Every target is a SELF-CREATED,
    // NON-ACTIVE tab (never the user's / the panel's tab), so mutating or closing
    // it cannot disturb the bound site or the side panel. `close` also proves the
    // confirm summary names the tab (title + stripped URL) and warns 不可逆. ────
    const unauthOrigin = new URL(UNAUTH_URL).origin;
    const mkDisposable = async (path) =>
      evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(`${unauthOrigin}${path}`)}, active: false }).then((t) => t.id)`);
    const muteTabId = await mkDisposable('/disposable-mute?x=1');
    const pinTabId = await mkDisposable('/disposable-pin?x=1');
    const moveTabId = await mkDisposable('/disposable-move?x=1');
    const closeTabId = await mkDisposable('/disposable-close?secretmarker=CLOSESECRET#frag');
    check([muteTabId, pinTabId, moveTabId, closeTabId].every((id) => typeof id === 'number' && id > 0), '#7m 已创建 4 个自建非激活标签页（互不干扰，可安全改动/关闭）', JSON.stringify([muteTabId, pinTabId, moveTabId, closeTabId]));
    // 既有 harness 时序 flake 修复（非产品逻辑）：产品侧 `chrome.tabs.onUpdated(status==='complete')`
    // → `followActiveTab` → `switchSession`，而**会话切换会把待决的二次确认按「拒绝」取消**
    // （FR-048 / EC-019）。自建标签页为 `active:false` 但加载完成事件仍会触发该跟随；若在它们
    // 尚未加载完时就发起 mute/move，迟到的 complete 事件可能在确认窗口内切换会话并取消确认 →
    // `#7m3/#7m4/#7o/#7o2` 偶发失败（与 AP#5b 同类：harness 时序，非产品缺陷）。先等 4 个标签页
    // status 全部 `complete`，再留一个会话稳定窗，使首次会话切换先于 mute/move 完成。
    const disposableIds = [muteTabId, pinTabId, moveTabId, closeTabId];
    for (let i = 0; i < 120; i += 1) {
      const allDone = await evaluate(
        sw,
        `Promise.all(${JSON.stringify(disposableIds)}.map((id) => chrome.tabs.get(id).then((t) => t.status === 'complete').catch(() => true))).then((a) => a.every(Boolean))`,
      );
      if (allDone === true) break;
      await sleep(250);
    }
    await sleep(900);

    // (1) real mute
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_MUTE__' }).then(() => true)`);
    const muteConfirm = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /disposable-mute/.test(s) ? s : ''; })()`,
      80,
      150,
    );
    check(Boolean(muteConfirm) && /目标标签页/.test(muteConfirm ?? ''), '#7m2 tabs mute（write 档）触发二次确认且摘要含具体目标', muteConfirm ?? 'no confirm');
    await realClick(ext, '#confirm-allow');
    check(Boolean(await waitForToolResult('已静音')), '#7m3 真实调用 tabs mute（用户确认后执行）');
    const mutedNow = await evaluate(sw, `chrome.tabs.get(${muteTabId}).then((t) => Boolean(t.mutedInfo && t.mutedInfo.muted === true)).catch(() => false)`);
    check(mutedNow === true, '#7m4 chrome.tabs 真实静音状态生效（mutedInfo.muted=true）', String(mutedNow));
    await sleep(900);

    // (2) real move (BEFORE pin: Chrome refuses to move a tab before a pinned tab)
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_MOVE__' }).then(() => true)`);
    await waitFor(ext, `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /disposable-move/.test(s) ? 'shown' : ''; })()`, 80, 150);
    await realClick(ext, '#confirm-allow');
    check(Boolean(await waitForToolResult('已移动')), '#7o 真实调用 tabs move（用户确认后执行）');
    const movedIndex = await evaluate(sw, `chrome.tabs.get(${moveTabId}).then((t) => t.index).catch(() => -1)`);
    check(movedIndex === 0, '#7o2 chrome.tabs 真实位置变更生效（index=0）', String(movedIndex));
    await sleep(900);

    // (3) real pin
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_PIN__' }).then(() => true)`);
    await waitFor(ext, `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /disposable-pin/.test(s) ? 'shown' : ''; })()`, 80, 150);
    await realClick(ext, '#confirm-allow');
    check(Boolean(await waitForToolResult('已固定')), '#7n 真实调用 tabs pin（用户确认后执行）');
    const pinnedNow = await evaluate(sw, `chrome.tabs.get(${pinTabId}).then((t) => t.pinned === true).catch(() => false)`);
    check(pinnedNow === true, '#7n2 chrome.tabs 真实固定状态生效（pinned=true）', String(pinnedNow));
    await sleep(900);

    // (4) real close — the confirmation MUST name the tab + stripped URL + 不可逆
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_CLOSE__' }).then(() => true)`);
    const closeConfirm = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /disposable-close/.test(s) ? s : ''; })()`,
      80,
      150,
    );
    check(Boolean(closeConfirm) && /不可逆/.test(closeConfirm ?? ''), '#7p close 确认摘要含「不可逆」提示', closeConfirm ?? 'no confirm');
    check(/disposable-close/.test(closeConfirm ?? '') && /127\.0\.0\.1/.test(closeConfirm ?? ''), '#7p2 close 摘要显示被测标签页的标题/去参 URL', closeConfirm ?? '');
    check(!/CLOSESECRET|secretmarker/.test(closeConfirm ?? ''), '#7p3 close 摘要不含 query/fragment（零明文）', closeConfirm ?? '');
    await realClick(ext, '#confirm-allow');
    check(Boolean(await waitForToolResult('已关闭')), '#7q 真实调用 tabs close（用户确认后执行，单个标签页）');
    const closeGone = await evaluate(sw, `chrome.tabs.get(${closeTabId}).then(() => false).catch(() => true)`);
    check(closeGone === true, '#7q2 被关闭的目标标签页确实消失（chrome.tabs.get 失败）', String(closeGone));
    const tabsAudit = await evaluate(
      ext,
      `chrome.runtime.sendMessage({ kind: 'audit-export' }).then((r) => JSON.stringify((r.data || []).filter((e) => e.type === 'tabs' && e.subcommand === 'close')))`,
    );
    check(/不可逆/.test(tabsAudit ?? ''), '#7r close 写入可读审计（含不可逆说明）', (tabsAudit ?? '').slice(0, 240));
    check(!/CLOSESECRET|secretmarker/.test(tabsAudit ?? ''), '#7r2 close 审计零明文（URL 已去 query/fragment）', (tabsAudit ?? '').slice(0, 240));
    await sleep(900);

    // (5) batch close is refused readably (never closes anything)
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_CLOSE_ALL__' }).then(() => true)`);
    await waitFor(ext, `(() => { const c = document.getElementById('confirm'); return c && getComputedStyle(c).display !== 'none' ? 'shown' : ''; })()`, 80, 150);
    await realClick(ext, '#confirm-allow');
    const batchRefusal = await waitForToolResult('禁止批量');
    check(Boolean(batchRefusal), '#7s close --all 被可读拒绝（禁止批量关闭）', (batchRefusal ?? '').slice(0, 200));
    check((batchRefusal ?? '').includes('禁止批量'), '#7s2 拒绝文案明确说明「禁止批量」', (batchRefusal ?? '').slice(0, 200));
    await sleep(900);

    // cleanup self-created disposable tabs (mute/pin/move; close already gone)
    await evaluate(sw, `chrome.tabs.remove([${muteTabId}, ${pinTabId}, ${moveTabId}]).catch(() => true)`);
    await sleep(400);

    // The D-128 URL-driven follower rebinds on ANY tab's `onUpdated(complete)`, so
    // creating the disposable tabs above (a different, unauthorized origin) moved
    // the active session to it. Re-activate + rebind the real site tab so the
    // downstream assertions keep their original baseline (a harness restore, not a
    // behaviour change).
    await evaluate(sw, `chrome.tabs.update(${siteTabId}, { active: true }).then(() => true)`);
    await sleep(300);
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'rebind' }).then(() => true)`);
    const restored = await waitFor(
      ext,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'state' }); return r?.data?.active?.origin === ${JSON.stringify(SITE_ORIGIN)} ? 'ok' : ''; })()`,
      80,
      150,
    );
    check(restored === 'ok', '#7t 清理自建标签页后已将绑定还原到站点（后续断言基线不变）', String(restored));

    // ── FR-054: optional-permission capabilities (bookmarks read+write, downloads read-only) ──
    // The test-copy manifest moves the optional capabilities into static
    // `permissions` (headless cannot show the gesture-driven prompt); with the
    // permission present the real chrome.bookmarks/downloads paths must work.
    const capPerms = await evaluate(
      sw,
      `Promise.all([chrome.permissions.contains({ permissions: ['bookmarks'] }), chrome.permissions.contains({ permissions: ['downloads'] })]).then(([b, d]) => JSON.stringify({ b, d }))`,
    );
    const cp = JSON.parse(capPerms ?? '{}');
    check(cp.b === true && cp.d === true, '#54B1 test-copy 静态 bookmarks/downloads 权限确实授予（contains=true）', String(capPerms));
    const capTools = [...new Set(llmRequests.flatMap((r) => (r.tools ?? []).map((t) => t?.function?.name)))].filter((n) => typeof n === 'string');
    check(
      capTools.includes('bookmarks') && capTools.includes('downloads'),
      '#54B2 权限在时真实发给 LLM 的工具面包含 bookmarks / downloads',
      JSON.stringify(capTools),
    );

    // ── FR-055: notify / clipboard optional-permission capabilities ──────────
    const capPerms2 = await evaluate(
      sw,
      `Promise.all([chrome.permissions.contains({ permissions: ['notifications'] }), chrome.permissions.contains({ permissions: ['clipboardRead'] }), chrome.permissions.contains({ permissions: ['clipboardWrite'] })]).then(([n, r, w]) => JSON.stringify({ n, r, w }))`,
    );
    const cp2 = JSON.parse(capPerms2 ?? '{}');
    check(cp2.n === true && cp2.r === true && cp2.w === true, '#54B11 test-copy 静态 notifications/clipboardRead/clipboardWrite 权限确实授予（contains=true）', String(capPerms2));
    check(
      capTools.includes('notify') && capTools.includes('clipboard'),
      '#54B12 FR-055 权限在时真实发给 LLM 的工具面包含 notify / clipboard',
      JSON.stringify(capTools),
    );
    const notifyLevel = await evaluate(
      sw,
      `(async () => { try { return await chrome.notifications.getPermissionLevel(); } catch (e) { return 'ERR:' + e.message; } })()`,
    );
    check(notifyLevel === 'granted', '#54B13 FR-055 真实 chrome.notifications.getPermissionLevel() = granted（宿主通知 API 可用）', String(notifyLevel));
    const clipApi = await evaluate(
      ext,
      `JSON.stringify({ read: typeof navigator.clipboard?.readText === 'function', write: typeof navigator.clipboard?.writeText === 'function' })`,
    );
    const ca = JSON.parse(clipApi ?? '{}');
    check(ca.read === true && ca.write === true, '#54B14 FR-055 侧栏扩展页 navigator.clipboard 读/写 API 可达（真实剪贴板往返归人工面）', String(clipApi));
    // Non-assertive disclosure: whether a real round-trip works headlessly depends
    // on panel focus; never silently reported as a pass/fail gate.
    const clipRoundTrip = await evaluate(
      ext,
      `(async () => { try { await navigator.clipboard.writeText('wc-clip-probe'); return 'ok:' + (await navigator.clipboard.readText()); } catch (e) { return 'ERR:' + e.message; } })()`,
    );
    observe(`FR-055 剪贴板真实往返（headless 侧栏，非门禁断言，焦点相关）：${String(clipRoundTrip).slice(0, 120)}`);

    const bkId = await evaluate(
      sw,
      `chrome.bookmarks.create({ url: 'https://binding.test/page?secretmarker=BINDSECRET', title: 'binding-bookmark' }).then((n) => n.id)`,
    );
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__BOOKMARKS_LIST__' }).then(() => true)`);
    const bkList = await waitForToolResult('书签');
    check(Boolean(bkList) && !/BINDSECRET/.test(bkList ?? ''), '#54B3 真实读取书签且默认去 query/fragment（零明文）', (bkList ?? '').slice(0, 200));

    // Destructive remove stays gated; the confirm summary must name it + disclose irreversibility.
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'capabilities', action: 'set', capability: 'bookmarks', scope: 'write', enabled: true }).then(() => true)`);
    let bkToolBase = toolMessageCount();
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__BOOKMARKS_REMOVE__:${bkId}' }).then(() => true)`);
    const bkConfirm = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /binding-bookmark/.test(s) ? s : ''; })()`,
      80,
      150,
    );
    check(Boolean(bkConfirm) && /不可逆/.test(bkConfirm ?? ''), '#54B4 破坏性 bookmarks remove 触发二次确认且摘要含标题+「不可逆」', (bkConfirm ?? '').slice(0, 200));
    check(!/BINDSECRET/.test(bkConfirm ?? ''), '#54B5 remove 确认摘要零明文（去 query/fragment）', (bkConfirm ?? '').slice(0, 200));
    await realClick(ext, '#confirm-allow');
    check(await waitForNewToolMessage(bkToolBase), '#54B6 用户确认后真实删除书签（新工具结果进入 LLM 上下文）');
    const bkGone = await evaluate(sw, `chrome.bookmarks.get(${JSON.stringify(bkId)}).then(() => false).catch(() => true)`);
    check(bkGone === true, '#54B7 chrome.bookmarks 目标书签确实删除', String(bkGone));

    // HARD FLOOR: with write-auto ON for the origin, a destructive remove STILL asks.
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'auto-auth', action: 'set', origin: ${JSON.stringify(SITE_ORIGIN)}, tier: 'write', enabled: true }).then(() => true)`);
    const bk2Id = await evaluate(sw, `chrome.bookmarks.create({ url: 'https://binding.test/page2', title: 'binding-bookmark-2' }).then((n) => n.id)`);
    bkToolBase = toolMessageCount();
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__BOOKMARKS_REMOVE__:${bk2Id}' }).then(() => true)`);
    const stillAsk = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /binding-bookmark-2/.test(s) ? s : ''; })()`,
      60,
      150,
    );
    check(Boolean(stillAsk), '#54B8 【写操作自动开启时删书签仍弹确认】破坏性硬底线（不自动放行）', (stillAsk ?? '').slice(0, 200));
    await realClick(ext, '#confirm-allow');
    check(await waitForNewToolMessage(bkToolBase), '#54B9 确认后才真正删除第二个书签（未被自动放行）');
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'auto-auth', action: 'set', origin: ${JSON.stringify(SITE_ORIGIN)}, tier: 'write', enabled: false }).then(() => true)`);

    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__DOWNLOADS_LIST__' }).then(() => true)`);
    const dlList = await waitForToolResult('下载记录');
    check(Boolean(dlList), '#54B10 真实读取下载记录（只读；permission 在时可用）', (dlList ?? '').slice(0, 160));
    // Let the panel finish the in-flight chat before the next block reloads it.
    await sleep(1200);

    // ── FR-052 / ADR-017: real auto-authorization (write on/off + destructive) ──
    // Reload the panel so it reflects the current (site) origin + default switches.
    await ext.send('Page.reload', { ignoreCache: true });
    // D-064/FR-052: wait until the reloaded panel has actually rendered the bound
    // origin (the element exists in static HTML, so existence alone races the async
    // `state` reply). Strengthens determinism; the #19a/#19a2 assertions are unchanged.
    await waitFor(ext, `(() => { const o = document.getElementById('auto-auth-origin'); return o && /localhost:5173/.test(o.textContent || '') ? 'ready' : ''; })()`, 80, 150);
    await evaluate(ext, `(() => { const d = document.getElementById('more-actions'); if (d) d.open = true; return true; })()`);
    const aaDefault = await evaluate(
      ext,
      `(() => { const w = document.getElementById('auto-write'); const b = document.getElementById('auto-auth-badge'); const origin = document.getElementById('auto-auth-origin')?.textContent ?? ''; return JSON.stringify({ origin, write: w ? w.checked : null, disabled: w ? w.disabled : null, badgeHidden: b ? getComputedStyle(b).display === 'none' : null, badgeText: b ? b.textContent : null }); })()`,
    );
    const aad = JSON.parse(aaDefault);
    check(aad.origin.includes('localhost:5173'), '#19a 侧栏自动授权作用于当前站点 origin', aad.origin);
    check(aad.disabled === false, '#19a2 绑定站点后自动授权控件可用', aaDefault);
    // read auto defaults ON (matches the existing read→allow baseline), so the
    // marker may already show「读」; the write tier must be OFF and not in it.
    check(aad.write === false && !/写/.test(aad.badgeText ?? ''), '#19b 写操作自动默认关（标记不含「写」）', aaDefault);

    // (1) write auto OFF → the non-destructive site write asks for confirmation.
    let toolBaseBefore = toolMessageCount();
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__SITE_WRITE__' }).then(() => true)`);
    const confirmOff = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /lgdl-web-cli/.test(s) ? s : ''; })()`,
      80,
      150,
    );
    check(Boolean(confirmOff), '#19c 关闭写操作自动：站点写档调用触发二次确认', confirmOff ?? 'no confirm');
    await realClick(ext, '#confirm-allow');
    check(await waitForNewToolMessage(toolBaseBefore), '#19d 人工确认后站点工具真实执行（新工具结果进入 LLM 上下文）');
    await sleep(900);

    // (2) enable write auto via the real checkbox → marker appears, no more prompt.
    // V3-1 pre-step (registered): the auto-auth switches are「谁在管我」→ L1.
    await v3OpenStatusDetails(ext);
    await realClick(ext, '#auto-write');
    await v3Collapse(ext);
    await v3Collapse(ext);
    const badgeOn = await waitFor(
      ext,
      `(() => { const b = document.getElementById('auto-auth-badge'); const t = b ? b.textContent : ''; return b && getComputedStyle(b).display !== 'none' && /写/.test(t) ? t : ''; })()`,
      40,
      150,
    );
    check(Boolean(badgeOn), '#19e 开启写操作自动后出现常驻标记', badgeOn ?? '');

    toolBaseBefore = toolMessageCount();
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__SITE_WRITE__' }).then(() => true)`);
    await sleep(1500);
    const confirmOn = await evaluate(
      ext,
      `(() => { const c = document.getElementById('confirm'); return c && getComputedStyle(c).display !== 'none' ? document.getElementById('confirm-summary').textContent : ''; })()`,
    );
    check(!confirmOn, '#19f 写操作自动：非破坏性站点写档调用不再弹确认', confirmOn ?? '');
    check(await waitForNewToolMessage(toolBaseBefore), '#19g 非破坏性站点写档调用免确认直接执行（新工具结果）');
    const autoAudit = await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'audit-export' }).then((r) => JSON.stringify((r.data || []).filter((e) => e.type === 'auto-authorize' && e.decision === 'allow').slice(-3)))`);
    check(/自动授权（用户设置）/.test(autoAudit ?? '') && /site_lgdl-web-cli/.test(autoAudit ?? ''), '#19h 审计写入可辨的「自动授权（用户设置）」放行记录', (autoAudit ?? '').slice(0, 300));
    await sleep(900);

    // (3) destructive subcommand still asks even with write auto ON (hard floor).
    toolBaseBefore = toolMessageCount();
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__SITE_DESTRUCTIVE__' }).then(() => true)`);
    const confirmDestructive = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /lgdl-web-cli/.test(s) ? s : ''; })()`,
      80,
      150,
    );
    check(Boolean(confirmDestructive), '#19i 破坏性操作（remove-node）即使写操作自动开启仍弹确认', confirmDestructive ?? 'no confirm');
    await realClick(ext, '#confirm-deny');
    check((await waitForNewToolMessage(toolBaseBefore)) === true, '#19j 破坏性操作拒绝后仍产生可读工具结果（未静默）');
    await sleep(900);

    // (4) turn write auto off (real click) → the ask path returns immediately.
    await v3OpenStatusDetails(ext);
    await realClick(ext, '#auto-write');
    await v3Collapse(ext);
    const badgeOff = await waitFor(
      ext,
      `(() => { const w = document.getElementById('auto-write'); const b = document.getElementById('auto-auth-badge'); return w && !w.checked && b && !/写/.test(b.textContent) ? 'off' : ''; })()`,
      40,
      150,
    );
    check(badgeOff === 'off', '#19k 关闭写操作自动后标记不再含「写」（即时生效）');
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__SITE_WRITE__' }).then(() => true)`);
    const confirmBack = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); const s = document.getElementById('confirm-summary').textContent; return c && getComputedStyle(c).display !== 'none' && /lgdl-web-cli/.test(s) ? s : ''; })()`,
      80,
      150,
    );
    check(Boolean(confirmBack), '#19l 关闭后同一调用立即恢复二次确认', confirmBack ?? 'no confirm');
    await realClick(ext, '#confirm-deny');
    await sleep(600);

    // ── #20a~#20f D-128 / TASK-031: switching to a NEW-domain tab auto-switches
    // the session (URL-driven; `tabs` permission) and the already-open panel
    // follows — no icon click, no rebind, no reopen. The new origin is the mock
    // HTTP server (a real http origin, NOT authorized). ──────────────────────
    const newOrigin = mock.origin;
    const newTabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(`${newOrigin}/`)} }).then((t) => t.id)`, 20000);
    const switchedByUrl = await waitFor(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const d = r?.data;
        return d?.active?.origin === ${JSON.stringify(newOrigin)} &&
          d?.session?.sessionId === ${JSON.stringify(newOrigin)} &&
          d?.active?.invalidated === false
          ? JSON.stringify({ origin: d.active.origin, session: d.session.sessionId, authorized: d.authorized, invalidated: d.active.invalidated })
          : '';
      })()`,
      80,
      150,
    );
    const su = switchedByUrl ? JSON.parse(switchedByUrl) : {};
    check(Boolean(switchedByUrl), '#20a 切到新域名 tab → 会话自动切换/新建（tab.url 驱动，未 rebind/未点图标）', switchedByUrl ?? 'session unchanged');
    check(su.invalidated === false, '#20b 新域名会话有效（未落入 markStale 死路）', switchedByUrl ?? '');
    check(su.authorized === false, '#20c 新域名未授权：自动切会话 ≠ 自动授权', switchedByUrl ?? '');

    // The already-open panel must follow via the background `session-changed` push
    // (no Page.reload between the tab switch above and this assertion).
    const panelFollow = await waitFor(
      ext,
      `(() => {
        const label = document.getElementById('session-label')?.textContent ?? '';
        const status = document.getElementById('status')?.textContent ?? '';
        return label.includes(${JSON.stringify(newOrigin)}) && status.includes(${JSON.stringify(newOrigin)})
          ? JSON.stringify({ label, status })
          : '';
      })()`,
      80,
      150,
    );
    check(Boolean(panelFollow), '#20d 已打开面板自动跟随新域名会话（收到后台推送后更新，未重开）', panelFollow ?? 'panel not updated');
    check(/未授权/.test((panelFollow ? JSON.parse(panelFollow).status : '') ?? ''), '#20e 面板显示新域名「未授权」+ 可点授权路径', panelFollow ?? '');

    // Zero injection for the unauthorized origin: no content script receiver.
    const injectProbe = await evaluate(sw, `chrome.tabs.sendMessage(${newTabId}, { kind: 'ping' }).then(() => 'responded').catch(() => 'no-receiver')`);
    check(injectProbe === 'no-receiver', '#20f 未授权新域名零注入（无 content script 接收方）', String(injectProbe));
    await sleep(300);

    // ── #21a~#21n V2-3 revocation chain (TASK-008): driven through the REAL tree
    // drawer controls (`tree-ops.run`) on the real bound site. Append-only: the
    // existing #19*//#20* numbering is untouched (TD-V23-01: #21* avoids the
    // already-occupied #19a~#19l / #20a~#20f).
    //
    // The side panel is emulated at its real dimensions (400×1000) so the
    // overlay drawer gets a real height (a wide/short tab collapses `#panel-main`
    // to 0px and the drawer becomes un-clickable — a harness geometry artifact,
    // not a product state). All tree interactions use atomic DOM clicks: the side
    // panel tab is not the active tab here and headless CDP real-mouse input is
    // dropped for background tabs (`test:insight` covers the real FAB click;
    // revocation itself needs no user gesture). ───────────────────────────────
    await ext.send('Emulation.setDeviceMetricsOverride', { width: 400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    await evaluate(sw, `chrome.tabs.update(${siteTabId}, { active: true }).then((t) => t.id)`);
    const v23Back = await waitFor(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const d = r?.data;
        return d?.active?.origin === ${JSON.stringify(SITE_ORIGIN)} && (d.tools || []).includes('site_lgdl-web-cli')
          ? JSON.stringify({ authorized: d.authorized, hasSite: true })
          : '';
      })()`,
      80,
      200,
    );
    check(Boolean(v23Back), '#21a 切回已授权站点：工具面含 site_lgdl-web-cli（撤销链基线）', v23Back ?? 'no baseline');

    // Open the floating tree. (DOM click: the side panel tab is not the active
    // tab at this point, and headless CDP real-mouse input is dropped for a
    // background tab; `test:insight` already proves the FAB via a real click.)
    await evaluate(ext, `document.getElementById('tree-fab').click(), true`);
    const v23TreeOpen = await waitFor(
      ext,
      `(() => {
        const d = document.getElementById('tree-drawer');
        return d && d.hidden === false && d.querySelectorAll('.tree-group').length >= 4 ? 'open' : '';
      })()`,
      100,
      200,
    );
    check(v23TreeOpen === 'open', '#21a2 点击 FAB 打开树抽屉（四维度可见；真实鼠标点击由 test:insight 覆盖）', String(v23TreeOpen));

    const v23RevokeBtn = await evaluate(
      ext,
      `(() => {
        const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="revoke-origin"]');
        return b ? JSON.stringify({ tag: b.tagName, label: b.textContent, kind: b.dataset.kind }) : '';
      })()`,
    );
    check(Boolean(v23RevokeBtn), '#21b 站点行渲染真实撤销控件（button，非只读 span）', v23RevokeBtn ?? 'no control');

    // Deny the confirmation → zero operation (site still authorized, tool present,
    // no origin-revoke audit).
    await evaluate(
      ext,
      `(() => { const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="revoke-origin"]'); if (!b) return false; b.click(); return true; })()`,
    );
    const v23Confirm = await waitFor(
      ext,
      `(() => {
        const c = document.getElementById('tree-confirm');
        if (!c || c.hidden) return '';
        const t = c.textContent || '';
        return /作用对象/.test(t) && /后果/.test(t) && /不可逆/.test(t) ? t : '';
      })()`,
      40,
      150,
    );
    check(Boolean(v23Confirm), '#21c 不可逆动作弹出 #tree-confirm（含作用对象/后果/不可逆说明）', String(v23Confirm).slice(0, 200));
    await evaluate(ext, `(() => { const b = document.getElementById('tree-confirm-deny'); if (!b) return false; b.click(); return true; })()`);
    await sleep(500);
    const v23AfterDeny = await evaluate(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const a = await chrome.runtime.sendMessage({ kind: 'audit-export' });
        const events = JSON.stringify(a?.data || []);
        return JSON.stringify({ authorized: r?.data?.authorized, hasSite: (r?.data?.tools || []).includes('site_lgdl-web-cli'), revokeAudit: /origin-revoke/.test(events) });
      })()`,
    );
    const v23Deny = JSON.parse(v23AfterDeny ?? '{}');
    check(
      v23Deny.authorized === true && v23Deny.hasSite === true && v23Deny.revokeAudit === false,
      '#21d 拒绝二次确认 = 零操作（站点仍授权 / 工具仍在 / 无 origin-revoke 审计）',
      v23AfterDeny ?? '',
    );

    // Accept → real revoke through the tree (`tree-ops.run` → existing `revoke`).
    await evaluate(
      ext,
      `(() => { const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="revoke-origin"]'); if (!b) return false; b.click(); return true; })()`,
    );
    await waitFor(ext, `(() => { const c = document.getElementById('tree-confirm'); return c && !c.hidden ? 'shown' : ''; })()`, 40, 150);
    await evaluate(ext, `(() => { const b = document.getElementById('tree-confirm-accept'); if (!b) return false; b.click(); return true; })()`);
    const v23Receipt = await waitFor(
      ext,
      `(() => {
        const r = document.getElementById('tree-receipt');
        if (!r || r.hidden) return '';
        const t = r.textContent || '';
        return t.includes(${JSON.stringify(SITE_ORIGIN)}) ? t : '';
      })()`,
      80,
      200,
    );
    check(Boolean(v23Receipt), '#21e 撤销后 #tree-receipt 三件套回执可读（含 origin + 实测证据 + 审计入口）', String(v23Receipt).slice(0, 260));
    check(/重拉实测|已不在工具面/.test(v23Receipt ?? ''), '#21e2 回执 ② 来自重拉实测（非文案声称）', String(v23Receipt).slice(0, 260));

    const v23Revoked = await evaluate(
      ext,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const a = await chrome.runtime.sendMessage({ kind: 'audit-export' });
        const t = await chrome.runtime.sendMessage({ kind: 'insight-tree' });
        const g = (t?.data?.groups || []).find((x) => x.dimension === 'command');
        const present = (g?.children || []).filter((n) => n.presentInSurface && !n.subcommand).map((n) => n.name);
        const sites = (t?.data?.groups || []).find((x) => x.dimension === 'site')?.children || [];
        const site = sites.find((n) => n.origin === ${JSON.stringify(SITE_ORIGIN)});
        return JSON.stringify({
          authorized: r?.data?.authorized,
          hasSite: (r?.data?.tools || []).includes('site_lgdl-web-cli'),
          toolPresent: present.includes('site_lgdl-web-cli'),
          siteAuthorizedInTree: site ? site.authorized : null,
          revokeAudit: /origin-revoke/.test(JSON.stringify(a?.data || [])),
        });
      })()`,
    );
    const v23 = JSON.parse(v23Revoked ?? '{}');
    check(v23.authorized === false, '#21f 站点取消授权即时生效（state.authorized=false，无需重载）', v23Revoked ?? '');
    check(v23.hasSite === false, '#21g 站点工具即时移出 deriveTools()（不等待重启/重载）', v23Revoked ?? '');
    check(v23.toolPresent === false, '#21i 重拉实测（insight-tree）：站点工具已不在工具面（证据来自实测）', v23Revoked ?? '');
    check(v23.siteAuthorizedInTree === false, '#21i2 重拉实测：站点节点如实呈现「未授权」', v23Revoked ?? '');
    check(v23.revokeAudit === true, '#21h 撤销写入 origin-revoke 审计（可经 audit-export 查证）', v23Revoked ?? '');

    // Capability revoke FAILURE path (EC-V23-003): in this temp dist the capability
    // is pre-granted as a STATIC permission, so the real `permissions.remove`
    // cannot remove it → the tree must show a readable error and NOT fake removal.
    const v23CapBtn = await evaluate(
      ext,
      `(() => {
        const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="revoke-capability"]');
        return b ? JSON.stringify({ label: b.textContent }) : '';
      })()`,
    );
    if (v23CapBtn) {
      await evaluate(
        ext,
        `(() => { const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="revoke-capability"]'); if (!b) return false; b.click(); return true; })()`,
      );
      await waitFor(ext, `(() => { const c = document.getElementById('tree-confirm'); return c && !c.hidden ? 'shown' : ''; })()`, 40, 150);
      await evaluate(ext, `(() => { const b = document.getElementById('tree-confirm-accept'); if (!b) return false; b.click(); return true; })()`);
      const v23CapReceipt = await waitFor(
        ext,
        `(() => { const r = document.getElementById('tree-receipt'); if (!r || r.hidden) return ''; const t = r.textContent || ''; return /书签|撤销.*权限|失败/.test(t) ? t : ''; })()`,
        60,
        200,
      );
      check(/失败|仍保留|可重试/.test(v23CapReceipt ?? ''), '#21j 能力撤销失败可读（不假成功、如实「权限仍保留」）', String(v23CapReceipt).slice(0, 220));
      const v23CapTools = await evaluate(
        ext,
        `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'capabilities', action: 'status' }); return JSON.stringify(r?.data?.tools || []); })()`,
      );
      check(/bookmarks/.test(v23CapTools ?? ''), '#21k 撤销失败后工具面未变更（不假装已移出）', String(v23CapTools));
    } else {
      observe('#21j/#21k 跳过：当前没有已授予的可选能力撤销控件（无 granted 可选能力）——如实记录，不伪造 PASS');
    }

    // Reversible toggle (FR-V2-032): closing `tabs` removes the tool immediately;
    // re-opening restores it. No confirmation (reversible).
    const v23ToggleOff = await evaluate(
      ext,
      `(() => {
        const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="set-tabs-toggle"]');
        if (!b) return 'no-button';
        b.click();
        return 'clicked';
      })()`,
    );
    const v23TabsOff = await waitFor(
      ext,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'tabs-setting', action: 'get' }); return r?.data?.enabled === false ? 'off' : ''; })()`,
      60,
      200,
    );
    check(v23ToggleOff === 'clicked' && v23TabsOff === 'off', '#21l 开关关断即时生效（tabs 开关关闭，无二次确认）', `${v23ToggleOff}/${v23TabsOff}`);
    const v23TabsTools = await evaluate(
      ext,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'tabs-setting', action: 'get' }); return JSON.stringify({ enabled: r?.data?.enabled, hasTabs: (r?.data?.tools || []).includes('tabs') }); })()`,
    );
    const v23tt = JSON.parse(v23TabsTools ?? '{}');
    check(v23tt.hasTabs === false, '#21m 开关关断 → deriveTools() 即时移出 tabs（enabled 语义）', v23TabsTools ?? '');
    // Wait for the re-render to expose the「开启」control, then re-open.
    const v23ReopenReady = await waitFor(
      ext,
      `(() => {
        const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="set-tabs-toggle"]');
        return b && /开启/.test(b.textContent || '') ? 'ready' : '';
      })()`,
      40,
      150,
    );
    const v23TabsOn = v23ReopenReady
      ? await evaluate(
          ext,
          `(() => {
            const b = document.querySelector('#tree-drawer button.tree-control[data-action-id="set-tabs-toggle"]');
            if (!b) return '';
            b.click();
            return 'clicked';
          })()`,
        )
      : '';
    const v23TabsBack = await waitFor(
      ext,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'tabs-setting', action: 'get' }); return r?.data?.enabled === true && (r?.data?.tools || []).includes('tabs') ? 'on' : ''; })()`,
      60,
      200,
    );
    check(v23TabsOn === 'clicked' && v23TabsBack === 'on', '#21n 机关再开启 → deriveTools() 恢复 tabs（可逆）', `${v23TabsOn}/${v23TabsBack}`);

    // ── #22a~#22j V2-3 R2 command-level override chain (R2-V23-07; AC-V2-024) ──
    // UI (tree policy buttons) → tree-ops (unique write path) → command-policy-set →
    // real dispatch effect → reset → persistence. Existing #0/#19/#20/#21 numbering
    // is untouched (append only).
    /** Newest tool-result content seen by the mock LLM. */
    const lastToolResult = () => {
      for (let i = llmRequests.length - 1; i >= 0; i -= 1) {
        const msgs = llmRequests[i].messages ?? [];
        for (let j = msgs.length - 1; j >= 0; j -= 1) {
          if (msgs[j].role === 'tool' && typeof msgs[j].content === 'string') return msgs[j].content;
        }
      }
      return '';
    };
    // Ensure the drawer is open, then use the read-only filter to locate the
    // overridable command node (the filter auto-expands the hit path — R2).
    await evaluate(
      ext,
      `(() => { const d = document.getElementById('tree-drawer'); if (d.hidden) document.getElementById('tree-fab').click(); return true; })()`,
    );
    await waitFor(ext, `document.getElementById('tree-drawer').hidden ? '' : 'open'`, 60, 150);
    await evaluate(
      ext,
      `(() => { const i = document.getElementById('tree-filter-input'); if (!i) return false; i.value = 'tabs list'; i.dispatchEvent(new Event('input')); return true; })()`,
    );
    const tabsListReady = await waitFor(
      ext,
      `(() => [...document.querySelectorAll('#tree-drawer li.tree-node')].some((n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'tabs list') ? 'ready' : '')()`,
      40,
      150,
    );
    check(
      tabsListReady === 'ready',
      '#22a 树内检索定位到可覆盖命令节点 tabs list（真实 DOM，逐层可操作）',
      String(tabsListReady),
    );

    const clickPolicy = (policy) =>
      evaluate(
        ext,
        `(() => {
          const leaf = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
            (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'tabs list',
          );
          if (!leaf) return 'no-node';
          const btn = leaf.querySelector('button[data-policy=${policy}]');
          if (!btn) return 'no-button';
          btn.click();
          return 'clicked';
        })()`,
      );

    const dispatchTabsList = async () => {
      const base = toolMessageCount();
      await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_LIST__' }).then(() => true)`);
      const landed = await waitForNewToolMessage(base);
      await sleep(400);
      return landed;
    };
    const policyEntry = async (commandId, expected) => {
      const raw = await waitFor(
        ext,
        `chrome.runtime.sendMessage({ kind: 'command-policy' }).then((r) => {
          const e = (r.data.entries || []).find((x) => x.commandId === '${commandId}');
          return e && e.action === '${expected}' ? JSON.stringify(e) : '';
        })`,
        60,
        200,
      );
      return raw ?? 'null';
    };

    // Baseline: tabs list is dispatchable with no override.
    await dispatchTabsList();
    check(
      !lastToolResult().includes('权限被拒'),
      '#22b 基线：无覆盖时 tabs list 正常 dispatch（探测链起点）',
      lastToolResult().slice(0, 140),
    );

    // Tier 1 — deny: store persists the override AND the real dispatch is refused.
    const denyClick = await clickPolicy('deny');
    const denyEntryRaw = await policyEntry('cmd:tabs#list', 'deny');
    const denyEntry = JSON.parse(denyEntryRaw);
    check(
      denyClick === 'clicked' && denyEntry && denyEntry.action === 'deny',
      '#22c 树内设 deny → command-policy 落盘（UI → tree-ops 唯一写路径；非本地假装）',
      `${denyClick} / ${denyEntryRaw}`,
    );
    const denyPersisted = await evaluate(
      ext,
      `chrome.storage.local.get('web-cli:web-cli:command-policy').then((v) => JSON.stringify(v))`,
    );
    check(
      /cmd:tabs#list/.test(denyPersisted ?? '') && /"action":"deny"/.test(denyPersisted ?? ''),
      '#22d deny 覆盖持久化到 chrome.storage 单键（进程重启仍生效）',
      String(denyPersisted).slice(0, 220),
    );
    await dispatchTabsList();
    check(
      lastToolResult().includes('权限被拒'),
      '#22e 覆盖 deny 真实影响 dispatch（工具结果「权限被拒」，非仅 UI 状态）',
      lastToolResult().slice(0, 180),
    );

    // Tier 2 — ask: dispatch now requires the real interactive confirmation.
    const askClick = await clickPolicy('ask');
    const askEntryRaw = await policyEntry('cmd:tabs#list', 'ask');
    check(
      askClick === 'clicked' && JSON.parse(askEntryRaw)?.action === 'ask',
      '#22f 树内设 ask → command-policy 落盘',
      `${askClick} / ${askEntryRaw}`,
    );
    const askBase = toolMessageCount();
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_LIST__' }).then(() => true)`);
    const confirmAsk = await waitFor(
      ext,
      `(() => { const c = document.getElementById('confirm'); return c && getComputedStyle(c).display !== 'none' ? (document.getElementById('confirm-summary')?.textContent ?? 'confirm') : ''; })()`,
      80,
      150,
    );
    check(
      Boolean(confirmAsk),
      '#22g 覆盖 ask 真实影响 dispatch（弹出二次确认，未自动放行）',
      String(confirmAsk).slice(0, 160),
    );
    await realClick(ext, '#confirm-deny');
    check(await waitForNewToolMessage(askBase), '#22h 拒绝确认 = 零操作但产生可读工具结果（不静默、不假成功）');

    // Tier 3 — allow: dispatch proceeds with no confirmation.
    const allowClick = await clickPolicy('allow');
    const allowEntryRaw = await policyEntry('cmd:tabs#list', 'allow');
    check(
      allowClick === 'clicked' && JSON.parse(allowEntryRaw)?.action === 'allow',
      '#22i 树内设 allow → command-policy 落盘',
      `${allowClick} / ${allowEntryRaw}`,
    );
    const allowBase = toolMessageCount();
    await evaluate(ext, `chrome.runtime.sendMessage({ kind: 'chat', user: '__TABS_LIST__' }).then(() => true)`);
    const landedAllow = await waitForNewToolMessage(allowBase);
    const confirmVisible = await evaluate(
      ext,
      `(() => { const c = document.getElementById('confirm'); return c && getComputedStyle(c).display !== 'none' ? 'visible' : ''; })()`,
    );
    // Poll until the NEW tool result (not the earlier ask-denied one) lands.
    let allowResult = '';
    for (let i = 0; i < 40; i += 1) {
      const latest = lastToolResult();
      if (latest && !latest.includes('权限被拒')) {
        allowResult = latest;
        break;
      }
      await sleep(150);
    }
    check(
      landedAllow === true && !confirmVisible && allowResult.length > 0,
      '#22j 覆盖 allow 真实影响 dispatch（不再弹确认且真实执行，工具结果进入 LLM 上下文）',
      `confirm=${confirmVisible} / ${allowResult.slice(0, 140)}`,
    );

    // Reset via the tree row's「恢复默认」button → entry gone → dispatch back to baseline.
    const resetClick = await evaluate(
      ext,
      `(() => {
        const leaf = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'tabs list',
        );
        const btn = leaf?.querySelector('button[data-action-id="reset-command-policy"]');
        if (!btn) return 'no-button';
        btn.click();
        return 'clicked';
      })()`,
    );
    const clearedRaw = await waitFor(
      ext,
      `chrome.runtime.sendMessage({ kind: 'command-policy' }).then((r) => { const e = r.data.entries || []; return e.length === 0 ? '[]' : ''; })`,
      60,
      200,
    );
    check(resetClick === 'clicked' && clearedRaw === '[]', '#22k 树内「恢复默认」清空覆盖（可逆、幂等）', `${resetClick}/${clearedRaw}`);
    const resetLanded = await dispatchTabsList();
    check(
      resetLanded === true && !lastToolResult().includes('权限被拒'),
      '#22l 恢复默认后 dispatch 回到基线（无残留覆盖）',
      lastToolResult().slice(0, 140),
    );

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
 *   4. tab switching follows `tab.url` (tabs permission) and re-binds — the
 *      `whoami` handshake remains only an unreadable-URL fallback;
 *   5. an unauthorized new origin auto-adopts its own session with **zero
 *      injection** and stays readable (no exception) — never a stale dead end.
 *
 * Disclosure ①/② from phase 0 still apply (no scriptable icon click; headless has
 * no native permission prompt → the temp manifest pre-grants the host permission,
 * dist JS byte-identical).
 */
async function phase2(mock) {
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
    registerContext('panel-phase1', ext);
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

    // #A5 tab-switch back to the authorized site re-binds (URL-driven; the
    // declarative content script is already registered).
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
    check(Boolean(switched), '#A5 切走再切回站点标签页 → 按 tab.url 自动重新绑定', switched ?? 'no rebind');

    // #A6 D-128 / TASK-031: an unauthorized origin no longer degrades to a stale
    // dead end — the URL-driven follow auto-adopts its OWN session, performs zero
    // injection and stays readable (never an error). The origin is the reachable
    // mock HTTP server (real http origin, NOT in host_permissions).
    const strangerOrigin = mock.origin;
    const stranger = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(`${strangerOrigin}/`)} }).then((t) => t.id).catch(() => -1)`);
    if (stranger !== -1) {
      const strangerState = await waitFor(
        ext,
        `(async () => {
          const r = await chrome.runtime.sendMessage({ kind: 'state' });
          const d = r && r.data;
          return d && d.active && d.active.origin === ${JSON.stringify(strangerOrigin)} && d.active.invalidated === false
            ? JSON.stringify({ origin: d.active.origin, session: d.session?.sessionId, authorized: d.authorized })
            : '';
        })()`,
        60,
        200,
      );
      const ss = strangerState ? JSON.parse(strangerState) : {};
      check(Boolean(strangerState), '#A6 未授权新域名 → 自动切换/新建会话（URL 驱动，不再走 markStale 死路）', strangerState ?? 'no session switch');
      check(ss.session === strangerOrigin && ss.authorized === false, '#A6b 未授权新域名会话有效且未授权（自动切会话 ≠ 自动授权）', strangerState ?? '');
      const strangerInject = await evaluate(sw, `chrome.tabs.sendMessage(${stranger}, { kind: 'ping' }).then(() => 'responded').catch(() => 'no-receiver')`);
      check(strangerInject === 'no-receiver', '#A6c 未授权新域名零注入（静默降级，不抛错）', String(strangerInject));
      observe(`#A6 未授权新域名 state = ${strangerState}`);
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

// ── phase 3: TASK-032 automatic probe + bounded backoff (delayed readiness) ───
/**
 * A local site whose `/.well-known/web-cli.json` returns 503 for the first
 * `failures` requests and only then serves a valid descriptor. Proves the
 * discovery probe is **fully automatic**: the panel never clicks anything, the
 * background retries with a bounded backoff, and the tool surface appears once
 * the site becomes ready.
 */
function startDelayedSite(failures) {
  let remaining = failures;
  const descriptor = {
    protocolVersion: '1.0',
    tools: [{ id: 'delayed-status', summary: 'delayed status', riskHint: 'read' }],
    transport: { kind: 'page-message', channel: 'web-cli' },
  };
  const server = createServer((req, res) => {
    if (req.url.startsWith('/.well-known/web-cli.json')) {
      if (remaining > 0) {
        remaining -= 1;
        res.writeHead(503, { 'content-type': 'text/plain' });
        res.end('not ready');
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(descriptor));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><title>delayed</title></head><body><h1>delayed site</h1></body></html>');
  });
  return new Promise((resolveListen) => {
    server.listen(0, '127.0.0.1', () => resolveListen({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function phaseAutoProbe() {
  console.log('\n▶ 阶段 3：自动探测 + 有界退避重试（延迟就绪；全程无需点击）');
  const delayed = await startDelayedSite(3);
  const work = await mkdtemp(join(tmpdir(), 'web-cli-autoprobe-'));
  const extDir = join(work, 'ext');
  await cp(dist, extDir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(extDir, 'manifest.json'), 'utf8'));
  manifest.host_permissions = [...manifest.host_permissions, 'http://127.0.0.1/*'];
  await writeFile(join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  observe('阶段 3 临时 dist：host_permissions += http://127.0.0.1/*（JS 字节未改；headless 无原生弹窗）');

  const { work: chromeWork, chrome, base, sw } = await launchChrome(extDir, 'autoprobe');
  try {
    check(Boolean(sw), 'AP#1 service worker 可达');
    if (!sw) throw new Error('no sw');

    // Pre-authorize the delayed origin (no click): the OriginStore reads storage on
    // every access, so this is byte-for-byte the persisted state the authorize path writes.
    const norm = delayed.origin.toLowerCase();
    await evaluate(
      sw,
      `chrome.storage.local.set({ ${JSON.stringify('web-cli:web-cli:origins')}: { ${JSON.stringify(norm)}: { origin: ${JSON.stringify(norm)}, authorized: true, trust: 'untrusted', authorizedAt: Date.now(), updatedAt: Date.now() } } }).then(() => true)`,
    );

    const tabId = await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(delayed.origin)} }).then((t) => t.id)`, 20000);
    check(Boolean(tabId), 'AP#2 打开延迟就绪站点标签页');

    const extId = await evaluate(sw, `chrome.runtime.id`);
    await evaluate(sw, `chrome.tabs.create({ url: 'chrome-extension://${extId}/sidepanel.html' }).then((t) => t.id)`);
    const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    check(Boolean(spTarget), 'AP#3 侧栏打开（面板关注该 origin）');
    if (!spTarget) throw new Error('no sidepanel target');
    const sp = await connectCdp(spTarget.webSocketDebuggerUrl);
    registerContext('panel-autoprobe', sp);
    await sp.send('Runtime.enable');
    const spExceptions = [];
    sp.on('Runtime.exceptionThrown', (p) => spExceptions.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    // The manual「重新探测」entry must not exist at all.
    const retryAbsent = await evaluate(sp, `document.getElementById('discovery-retry') === null`);
    check(retryAbsent === true, 'AP#4 侧栏不存在手动「重新探测」按钮（用户无需手动探测）');
    const manualTextAbsent = await evaluate(sp, `!document.getElementById('discovery-notice').textContent.includes('重新探测')`);
    check(manualTextAbsent === true, 'AP#4b 探测说明文案不含「重新探测」');

    // Failure → automatic backoff retry, observed via the real state projection.
    //
    // 相位语义（收紧谓词，修既有 flake 根因）：产品快照仅当 `phase === 'waiting'`
    // （已排定下一次退避定时器）时才输出 `nextDelayMs`（src/discovery/auto-probe.ts:136）；
    // 进入 `phase === 'probing'`（第 2 次尝试 in-flight）时该字段被清空（:175）。
    // 因此轮询谓词必须限定 `phase === 'waiting'`，否则会命中 probing 窗口 → 快照无
    // `nextDelayMs` → `#AP#5b` 偶发误报（验证方 R 已定位）。编号沿用 `#AP#5b`，不放宽断言。
    const retrying = await waitFor(
      sp,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'state' }); const p = r && r.data && r.data.probe; return p && p.phase === 'waiting' && p.retries >= 1 && p.lastClass === 'temporary' ? JSON.stringify(p) : ''; })()`,
      150,
      250,
    );
    check(Boolean(retrying), 'AP#5 探测失败后自动进入退避重试（零点击）', String(retrying));
    const rp = retrying ? JSON.parse(retrying) : {};
    check(typeof rp.nextDelayMs === 'number' && rp.nextDelayMs >= 500, 'AP#5b 退避为有界序列（500ms 起，封顶 15s）', JSON.stringify(rp));

    // Site heals → automatic success, still with zero clicks.
    const ready = await waitFor(
      sp,
      `(async () => { const r = await chrome.runtime.sendMessage({ kind: 'state' }); const d = r && r.data; return d && d.active && d.active.discoveryState === 'supported' ? JSON.stringify({ active: d.active, tools: d.tools }) : ''; })()`,
      180,
      250,
    );
    check(Boolean(ready), 'AP#6 站点延迟就绪后自动探测到 supported（全程零点击）', String(ready).slice(0, 160));
    const rr = ready ? JSON.parse(ready) : { tools: [] };
    check((rr.tools ?? []).includes('site_delayed-status'), 'AP#7 延迟就绪后站点工具面自动装配', JSON.stringify(rr.tools));
    check(spExceptions.length === 0, 'AP#8 自动探测全程侧栏 0 未捕获异常', spExceptions.join(' | '));

    sp.close();
    sw.close();
  } catch (err) {
    failures.push(`阶段 3 harness error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('✖ 阶段 3 harness error:', err);
  } finally {
    chrome.kill('SIGKILL');
    delayed.server.close();
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
    await phase2(mock);
    await phaseAutoProbe();
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
    // F-01 ①（2026-09-16）：退出码必须在**任何可能挂死的 await 之前**定死。
    // 此前 `await dumpDiagnostics(...)` 在前，挂在 CLOSED 的 CDP socket 上 ⇒
    // `process.exit(1)` 不可达 ⇒ 事件循环耗尽后 Node 以 0 自然退出 ⇒ 失败被打成绿。
    process.exitCode = 1;
    // T4: full stacks + failure-time DOM/panel snapshot for the next triage.
    await dumpDiagnostics('main: assertions failed');
    process.exit(1);
  }
  console.log(`binding PASS — ${passes} assertions：真实 dist + 真实 http://localhost:5173 + mock LLM，6 步全链（绑定→注入→发现→授权→发送可用→对话）+ 阶段 2 自动探测（授权后免点图标自动绑定）+ FR-049 标签页工具（真实 tabs list --full/默认 与 tabs switch → 会话随之切换）+ FR-050 web-fetch 预校验（未授权域名零请求 + 可读拒绝；同源经页面上下文真实读取；SW ping 往返 + 无加载/CORS 错误）+ TASK-032 自动探测（延迟就绪 + 有界退避重试，全程零点击，无手动「重新探测」按钮）`);
}

main().catch(async (err) => {
  console.error(err);
  // F-01 ①（2026-09-16）：与断言失败分支同一漏洞 —— 退出码先定死，再跑诊断。
  process.exitCode = 1;
  await dumpDiagnostics(`main: uncaught ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
