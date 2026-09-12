/**
 * R8 — real-browser full-chain E2E harness (content → background → host → RPC).
 *
 * Runs the **real built `dist/`** in headless Chromium via CDP and drives the
 * full chain with a mock LLM. Two scenarios:
 *
 *   A. generic non-LGDL fixture site (AC-010) — read / write+confirm / re-read.
 *   B. LGDL Workbench real build (AC-009) — `site_lgdl-web-cli status` read.
 *
 * Chain: real content.js → background discovery (real host) → authorize →
 * chat tool_call → router policy → host dispatch → postMessage RPC → page
 * bridge → result → session; writes go through the real confirmation gate
 * (auto-allowed by the driving extension page here).
 *
 * ── DOCUMENTED DEVIATIONS (test copy only) ───────────────────────────────────
 * The manifest copy loaded by this harness (a) appends the local fixture/LGDL/LLM
 * origins to `host_permissions` (the dist JS is byte-identical to the release
 * build) because `chrome.permissions.request` for `optional_host_permissions`
 * needs a real user gesture + native prompt, which headless cannot synthesize
 * (validate V9b), and (b) adds `<all_urls>` because `chrome.tabs.captureVisibleTab`
 * (D1 real pixels) requires `activeTab` OR `<all_urls>` — the product ships
 * `activeTab` (granted by the real toolbar-icon click, also un-synthesizable) and
 * MUST NOT ship `<all_urls>`. Everything else — background.js, content.js,
 * sidepanel.js — is the real product. This harness therefore proves the
 * **mechanism** full chain, NOT the gesture-driven permission UX; the latter stays
 * a documented manual item (`docs/smoke-checklist.md` H0/H2/H6/H8/H10).
 *
 * A second (D6) deviation: headless Chrome for Testing 151's
 * `chrome.tabs.goBack/goForward` rejects「Cannot find a next page in history」even
 * when the tab really has ≥2 history entries (verified by probing
 * `history.length`). The D6 e2e therefore proves the **native path is attempted
 * first** (the readable fallback carries the native API failure reason) and that
 * the fallback is labeled; a *successful* native navigation is covered by
 * `test/fullpage-screenshot.test.ts` with an injected host-nav seam.
 *
 * Usage: `npm run test:e2e --workspace @lgdl/web-cli-plugin`
 * Exit code 0 = PASS; non-zero = FAIL (with a readable reason).
 */
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(root, '..', '..');
const dist = resolve(root, 'dist');
const fixtureDir = resolve(root, 'test', 'fixtures', 'site');
const lgdlDist = resolve(root, '..', 'lgdl-web', 'dist');
const CHROME = process.env.CHROME_BIN || resolve(repoRoot, '.pw-browsers', 'chromium-1234', 'chrome-linux64', 'chrome');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

// ── mock LLM (OpenAI-compatible, non-streaming) ──────────────────────────────

function mockResponse(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  // A trailing tool result means the runner fed the tool output back → finish.
  const last = messages[messages.length - 1];
  if (last?.role === 'tool') return completion({ content: `完成：${last.content}` });
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const userText = typeof lastUser?.content === 'string' ? lastUser.content : '';
  // FR-051 / TASK-029: real-page browser capability tools (dom / chrome).
  if (/domread|读页面/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_dom_read', name: 'dom', subcommand: 'read-state', args: {} }] });
  }
  if (/domclick/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_dom_click', name: 'dom', subcommand: 'click', args: { selector: '#notes' } }] });
  }
  // D2/D6: fullpage stitch + native back/forward (placed BEFORE the generic shot branch).
  if (/fullpage|整页/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_fullpage', name: 'chrome', subcommand: 'screenshot', args: { mode: 'fullpage' } }] });
  }
  if (/go forward|前进/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_fwd', name: 'chrome', subcommand: 'forward', args: {} }] });
  }
  if (/go back|后退/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_back', name: 'chrome', subcommand: 'back', args: {} }] });
  }
  if (/shot|截图/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_shot', name: 'chrome', subcommand: 'screenshot', args: { mode: 'viewport' } }] });
  }
  if (/lgdl/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_lgdl', name: 'site_lgdl-web-cli', subcommand: 'status', args: {} }] });
  }
  if (/add|添加|写入/i.test(userText)) {
    return completion({ toolCalls: [{ id: 'call_add', name: 'site_notes-add', args: { text: 'from-e2e' } }] });
  }
  return completion({ toolCalls: [{ id: 'call_list', name: 'site_notes-list', args: {} }] });
}

function completion({ content = null, toolCalls } = {}) {
  const message = { role: 'assistant', content };
  if (toolCalls) {
    message.tool_calls = toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: JSON.stringify({ subcommand: tc.subcommand ?? '', args: tc.args ?? {} }) },
    }));
  }
  return {
    id: 'chatcmpl-e2e',
    object: 'chat.completion',
    created: 0,
    model: 'e2e-mock',
    choices: [{ index: 0, message, finish_reason: toolCalls ? 'tool_calls' : 'stop' }],
  };
}

function handleLlm(req, res) {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch {
      /* tolerate */
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(mockResponse(body)));
  });
}

// ── servers ──────────────────────────────────────────────────────────────────

async function listen(handler) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}` };
}

async function startFixtureServer() {
  const [indexHtml, declaration, rpcJs] = await Promise.all([
    readFile(join(fixtureDir, 'index.html'), 'utf8'),
    readFile(join(fixtureDir, 'web-cli.json'), 'utf8'),
    readFile(join(fixtureDir, 'rpc.js'), 'utf8'),
  ]);
  return listen((req, res) => {
    if (req.method === 'POST' && req.url === '/v1/chat/completions') return handleLlm(req, res);
    const map = { '/': indexHtml, '/index.html': indexHtml, '/web-cli.json': declaration, '/rpc.js': rpcJs };
    const body = map[req.url?.split('?')[0] ?? ''];
    if (body === undefined) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const type = req.url.endsWith('.js') ? 'text/javascript' : req.url.endsWith('.json') ? 'application/json' : 'text/html';
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8` });
    res.end(body);
  });
}

/** Generic static server for the built LGDL Workbench (SPA fallback to index.html). */
async function startLgdlServer() {
  return listen(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/chat/completions') return handleLlm(req, res);
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const file = resolve(lgdlDist, rel);
    try {
      if ((await stat(file)).isFile()) {
        res.writeHead(200, { 'content-type': `${MIME[extname(file)] ?? 'application/octet-stream'}; charset=utf-8` });
        createReadStream(file).pipe(res);
        return;
      }
    } catch {
      /* fall through to SPA index */
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(lgdlDist, 'index.html')));
  });
}

// ── CDP client (raw WebSocket; Node ≥ 22 global WebSocket) ──

async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject: rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    }
  });
  return {
    send(method, params = {}) {
      return new Promise((res, rej) => {
        const id = ++seq;
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(cdp, expression, timeoutMs = 30000) {
  const res = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(`evaluate failed: ${res.exceptionDetails.text}`);
  return res.result?.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findTarget(list, predicate) {
  return list.find(predicate);
}

// ── assertions ──

const failures = [];
function check(cond, label) {
  if (cond) console.log(`  ✔ ${label}`);
  else {
    console.log(`  ✖ ${label}`);
    failures.push(label);
  }
}

// ── one scenario ──
// scenario = { name, origin, path, tools, expect } ; drives read → write → read for fixture,
// or a single lgdl read for the LGDL build.
async function runScenario({ name, origin, path, expectTool, chatSteps }) {
  console.log(`\n▶ scenario ${name} (${origin}${path})`);
  const work = await mkdtemp(join(tmpdir(), 'web-cli-e2e-'));
  const profile = join(work, 'profile');
  const extDir = EXT_DIR;
  const debugPort = 9000 + Math.floor(Math.random() * 900);
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
      `--remote-debugging-port=${debugPort}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let chromeLog = '';
  chrome.stdout.on('data', (d) => (chromeLog += d));
  chrome.stderr.on('data', (d) => (chromeLog += d));
  const cdpBase = `http://127.0.0.1:${debugPort}`;
  let swCdp;
  let optionsCdp;
  try {
    // find our extension service worker (Chrome starts built-in ones too)
    let found = false;
    for (let i = 0; i < 120 && !found; i += 1) {
      let list = [];
      try {
        list = await (await fetch(`${cdpBase}/json/list`)).json();
      } catch {
        /* not ready */
      }
      for (const t of list) {
        if (t.type !== 'service_worker' || !t.url.startsWith('chrome-extension://')) continue;
        try {
          const probe = await connectCdp(t.webSocketDebuggerUrl);
          await probe.send('Runtime.enable');
          if ((await evaluate(probe, `chrome.runtime.getManifest().name`)) === 'web-cli plugin') {
            swCdp = probe;
            found = true;
            break;
          }
          probe.close();
        } catch {
          /* not ours / not ready */
        }
      }
      if (!found) await sleep(250);
    }
    if (!found) throw new Error('no "web-cli plugin" service_worker target found');
    await swCdp.send('Runtime.enable');

    // configure the mock LLM to this scenario's origin
    await evaluate(
      swCdp,
      `(async () => {
        await chrome.storage.local.set({ 'web-cli:web-cli:llm': {
          active: 'deepseek',
          providers: { deepseek: { apiKey: 'e2e-key', model: 'e2e-mock', baseURL: '${origin}/v1' } },
          maxRounds: 5,
        }});
        return true;
      })()`,
    );

    // open the page + inject the real content script
    const pageTabId = await evaluate(
      swCdp,
      `(async () => {
        const tab = await chrome.tabs.create({ url: '${origin}${path}' });
        await new Promise((r) => setTimeout(r, 2500));
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        return tab.id;
      })()`,
    );

    // open the options page as the driving extension context
    await evaluate(swCdp, `chrome.tabs.create({ url: chrome.runtime.getURL('options.html') }).then((t) => t.id)`);
    let optionsTarget;
    for (let i = 0; i < 60 && !optionsTarget; i += 1) {
      optionsTarget = findTarget(await (await fetch(`${cdpBase}/json/list`)).json(), (t) => t.type === 'page' && t.url.includes('options.html'));
      if (!optionsTarget) await sleep(150);
    }
    if (!optionsTarget) throw new Error('options page target not found');
    optionsCdp = await connectCdp(optionsTarget.webSocketDebuggerUrl);
    await optionsCdp.send('Runtime.enable');
    await evaluate(
      optionsCdp,
      `(() => {
        window.__msgs = [];
        chrome.runtime.onMessage.addListener((m) => {
          window.__msgs.push(m);
          if (m && m.kind === 'confirm-request') {
            chrome.runtime.sendMessage({ kind: 'confirm-response', requestId: m.requestId, allow: true }).catch(() => {});
          }
          return undefined;
        });
        return true;
      })()`,
    );

    // D1: make the bound page tab the visible one so `captureVisibleTab` targets
    // the real page (the driving options tab would otherwise be the visible one).
    await evaluate(swCdp, `chrome.tabs.update(${pageTabId}, { active: true }).then(() => true)`);
    // D1 evidence: confirm the MV3 SW promise form of captureVisibleTab and that
    // it yields a real PNG (not a stub). This is the documented实测结论.
    const capProbe = await evaluate(
      swCdp,
      `(async () => {
        const tab = await chrome.tabs.get(${pageTabId});
        const form = chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        const isPromise = !!(form && typeof form.then === 'function');
        try {
          const dataUrl = await form;
          return { isPromise, ok: typeof dataUrl === 'string' && dataUrl.startsWith('data:image/'), len: dataUrl.length };
        } catch (err) {
          return { isPromise, ok: false, err: err && err.message ? err.message : String(err) };
        }
      })()`,
    );
    check(capProbe?.isPromise === true, `captureVisibleTab returns a Promise in this MV3 SW (${JSON.stringify(capProbe)})`);
    check(capProbe?.ok === true && (capProbe?.len ?? 0) > 1000, `captureVisibleTab yields a real PNG dataURL (${JSON.stringify(capProbe)})`);

    // discovery → site tools assembled
    const state = await evaluate(
      optionsCdp,
      `(async () => {
        for (let i = 0; i < 60; i++) {
          const res = await chrome.runtime.sendMessage({ kind: 'state' });
          const tools = res?.data?.tools ?? [];
          if (tools.includes('${expectTool}')) return res.data;
          await new Promise((r) => setTimeout(r, 250));
        }
        return null;
      })()`,
    );
    check(state !== null, `${name}: discovered site + assembled ${expectTool}`);
    check((state?.active?.origin ?? '') === origin, `${name}: active origin bound`);

    const auth = await evaluate(optionsCdp, `chrome.runtime.sendMessage({ kind: 'authorize', origin: '${origin}', hostPermissionGranted: true })`);
    check(auth?.ok === true, `${name}: per-origin authorization succeeds`);

    for (const step of chatSteps) {
      if (step.pre) await step.pre({ swCdp, optionsCdp, pageTabId });
      const msgs = await evaluate(
        optionsCdp,
        `(async () => {
          window.__msgs.length = 0;
          await chrome.runtime.sendMessage({ kind: 'chat', user: ${JSON.stringify(step.user)} });
          for (let i = 0; i < 240; i++) {
            if (window.__msgs.some((m) => m.kind === 'chat-result' && m.variant === 'done')) break;
            await new Promise((r) => setTimeout(r, 100));
          }
          return window.__msgs.map((m) => ({ kind: m.kind, variant: m.variant, text: m.text }));
        })()`,
        30000,
      );
      const text = msgs.map((m) => m.text ?? '').join('\n');
      if (process.env.E2E_DEBUG) console.log(`DEBUG ${name} "${step.user}":`, JSON.stringify(msgs));
      check(step.test(text), `${name}: ${step.label}`);
      if (step.post) await step.post({ swCdp, optionsCdp, pageTabId, text });
    }

    const audit = await evaluate(optionsCdp, `chrome.runtime.sendMessage({ kind: 'audit-export' })`);
    const events = Array.isArray(audit?.data) ? audit.data : [];
    check(events.length > 0, `${name}: audit trail recorded (${events.length} events)`);
  } catch (err) {
    failures.push(`${name} harness error: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`✖ ${name} harness error:`, err);
  } finally {
    swCdp?.close();
    optionsCdp?.close();
    chrome.kill('SIGKILL');
    await rm(work, { recursive: true, force: true }).catch(() => {});
    if (failures.length && chromeLog && process.env.E2E_DEBUG) console.error(chromeLog.slice(-1500));
  }
}

let EXT_DIR = '';

async function main() {
  const fixture = await startFixtureServer();
  const lgdl = await startLgdlServer();
  console.log(`▶ fixture+LLM server: ${fixture.origin}`);
  console.log(`▶ LGDL+LLM server:    ${lgdl.origin}`);

  const work = await mkdtemp(join(tmpdir(), 'web-cli-e2e-ext-'));
  EXT_DIR = join(work, 'ext');
  await cp(dist, EXT_DIR, { recursive: true });

  // DEVIATIONS (test copy only; the dist JS and the product manifest are unchanged):
  //  1. append local origins to host_permissions — `chrome.permissions.request`
  //     for `optional_host_permissions` needs a real user gesture + native prompt,
  //     which headless cannot synthesize (validate V9b).
  //  2. add `<all_urls>` — `chrome.tabs.captureVisibleTab` (D1 real pixels)
  //     explicitly requires `activeTab` OR `<all_urls>`; the product ships
  //     `activeTab` (granted by the real toolbar-icon click, which headless cannot
  //     synthesize either) and MUST NOT ship `<all_urls>`, so the harness grants it
  //     here to exercise the real-pixel path end to end.
  const manifest = JSON.parse(await readFile(join(EXT_DIR, 'manifest.json'), 'utf8'));
  manifest.host_permissions = [
    ...manifest.host_permissions,
    '<all_urls>',
    `${fixture.origin}/*`,
    `${lgdl.origin}/*`,
  ];
  await writeFile(join(EXT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`▶ extension copy (deviations: host_permissions += <all_urls>, ${fixture.origin}/*, ${lgdl.origin}/*)`);
  console.log(`▶ chrome: ${CHROME}`);

  try {
    // D2 shared state: a tall page is injected before the fullpage step; the post
    // hook proves the original scroll position was restored.
    const fpState = { viewportHeight: 0, originalScrollY: -1, restoredScrollY: -1, historyLength: 0 };
    const scrollProbe = `(async () => { const r = await chrome.scripting.executeScript({ target: { tabId: __TAB__ }, func: () => ({ y: window.scrollY, h: window.innerHeight }) }); return r[0].result; })()`;
    await runScenario({
      name: 'A/fixture(non-LGDL)',
      origin: fixture.origin,
      path: '/',
      expectTool: 'site_notes-list',
      chatSteps: [
        { user: 'list notes', label: 'read full chain returned page data (welcome)', test: (t) => /welcome/.test(t) },
        { user: 'add a note now', label: 'write ran through the confirmation gate', test: (t) => /note added|from-e2e/.test(t) },
        { user: 'list notes', label: 'second read observes the persisted write', test: (t) => /from-e2e/.test(t) },
        // FR-051 / TASK-029 — the two author-named missing capabilities, on a real page:
        { user: 'domread', label: 'dom read-state ran on the real page DOM (was missing)', test: (t) => /url:|Fixture Notes/.test(t) },
        { user: 'domclick now', label: 'dom click ran through the confirmation gate', test: (t) => /click|✓/.test(t) },
        { user: 'take a screenshot', label: 'chrome screenshot used REAL pixels (captureVisibleTab) via the page download chain', test: (t) => /chrome screenshot/.test(t) && /真实像素（captureVisibleTab）/.test(t) && !/近似（canvas/.test(t) },
        // D2 — real fullpage scroll-stitch on a ≥2-screen page.
        {
          user: 'take a fullpage shot',
          label: 'fullpage stitched ≥2 screens with captureVisibleTab and declared the approximation limits',
          pre: async ({ swCdp, pageTabId }) => {
            await evaluate(
              swCdp,
              `(async () => {
                await chrome.scripting.executeScript({ target: { tabId: ${pageTabId} }, func: () => {
                  document.body.style.minHeight = '4200px';
                  for (let i = 0; i < 60; i += 1) {
                    const p = document.createElement('p');
                    p.textContent = 'fullpage-line-' + i + ' ' + 'x'.repeat(60);
                    document.body.appendChild(p);
                  }
                  window.scrollTo(0, 0);
                } });
                await chrome.tabs.update(${pageTabId}, { active: true });
                return true;
              })()`,
            );
            const probe = await evaluate(swCdp, scrollProbe.replace('__TAB__', String(pageTabId)));
            fpState.viewportHeight = Number(probe?.h ?? 0);
            fpState.originalScrollY = Number(probe?.y ?? 0);
            return true;
          },
          test: (t) => {
            const m = /像素路径：真实像素（captureVisibleTab ×(\d+) 屏拼接）/.exec(t);
            const screens = m ? Number(m[1]) : 0;
            const dims = /尺寸: (\d+)×(\d+)px/.exec(t);
            const height = dims ? Number(dims[2]) : 0;
            const multi = screens >= 2;
            const taller = fpState.viewportHeight > 0 && height > fpState.viewportHeight;
            return (
              /chrome screenshot/.test(t) &&
              /整页拼接截图完成/.test(t) &&
              multi &&
              taller &&
              /position:fixed \/ sticky 元素会在每屏重复出现/.test(t) &&
              /滚动位置：已恢复（未把页面留在底部）/.test(t) &&
              /非「完整\/无损」整页/.test(t)
            );
          },
          post: async ({ swCdp, pageTabId }) => {
            const probe = await evaluate(swCdp, scrollProbe.replace('__TAB__', String(pageTabId)));
            fpState.restoredScrollY = Number(probe?.y ?? -1);
            check(
              fpState.restoredScrollY === fpState.originalScrollY,
              `A/fixture(non-LGDL): fullpage restored the original scroll position (${fpState.originalScrollY} → ${fpState.restoredScrollY})`,
            );
          },
        },
        {
          user: 'take a screenshot again',
          label: 'screenshot honestly falls back to canvas + reason when the target tab is not visible',
          pre: ({ swCdp }) => evaluate(swCdp, `chrome.tabs.query({ url: chrome.runtime.getURL('options.html') }).then((tabs) => tabs[0] && chrome.tabs.update(tabs[0].id, { active: true })).then(() => true)`),
          test: (t) => /近似（canvas，原因：/.test(t) && /captureVisibleTab/.test(t),
        },
        // D6 — native tab-level history is attempted first; when the environment's
        // native API cannot run, the page-context history fallback is labeled
        // readably with the concrete native failure reason (never silent).
        {
          user: 'go forward',
          label: 'back/forward prefers native tabs.goForward and labels the readable fallback with its reason',
          test: (t) => /历史路径：页面 history（回退，原因：Cannot find a next page in history\.）/.test(t),
        },
        {
          user: 'go back',
          label: 'back/forward attempts native tabs.goBack with real history (headless fallback labeled; see deviation)',
          pre: async ({ swCdp, pageTabId }) => {
            // Seed real cross-document history so the native path has a target.
            await evaluate(swCdp, `chrome.tabs.update(${pageTabId}, { active: true }).then(() => true)`);
            await sleep(300);
            await evaluate(swCdp, `chrome.tabs.update(${pageTabId}, { url: '${fixture.origin}/' }).then(() => true)`);
            await sleep(1200);
            await evaluate(
              swCdp,
              `chrome.scripting.executeScript({ target: { tabId: ${pageTabId} }, func: (u) => { location.href = u; }, args: ['${fixture.origin}/index.html'] }).then(() => true)`,
            );
            await sleep(1500);
            const lenRes = await evaluate(
              swCdp,
              `chrome.scripting.executeScript({ target: { tabId: ${pageTabId} }, func: () => history.length }).then((r) => r[0].result)`,
            );
            fpState.historyLength = Number(lenRes ?? 0);
            return true;
          },
          test: (t) =>
            // Native is attempted first. In headless Chrome for Testing 151 the
            // `chrome.tabs.goBack/goForward` API rejects even with real history
            // (history.length=2) — a documented headless deviation — so the honest
            // fallback label carrying the native failure reason is the observable
            // evidence that the native path was preferred.
            /历史路径：页面 history（回退，原因：Cannot find a next page in history\.）/.test(t),
          post: async () => {
            check(
              fpState.historyLength >= 2,
              `A/fixture(non-LGDL): native back was attempted with ≥2 real history entries (history.length=${fpState.historyLength}) — the fallback is the headless tabs API, not missing history`,
            );
          },
        },
      ],
    });

    if (await stat(lgdlDist).then(() => true).catch(() => false)) {
      await runScenario({
        name: 'B/LGDL Workbench',
        origin: lgdl.origin,
        path: '/',
        expectTool: 'site_lgdl-web-cli',
        chatSteps: [
          { user: 'lgdl status', label: 'LGDL graph read full chain returned nodes', test: (t) => /nodes/.test(t) },
        ],
      });
    } else {
      console.log('⚠ packages/lgdl-web/dist not built — skipping AC-009 scenario (run root build first)');
    }
  } finally {
    fixture.server.close();
    lgdl.server.close();
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }

  console.log('');
  if (failures.length) {
    console.error(`R8 E2E FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('R8 E2E PASS — real dist full chain: fixture (AC-010) + LGDL Workbench (AC-009)');
  console.log('deviations: host_permissions pre-granted for local origins + <all_urls> (gesture-driven permission UX = manual)');
  console.log(
    'deviation (D6): headless Chrome for Testing 151 chrome.tabs.goBack/goForward rejects「Cannot find a next page in history」even with real history (history.length=2) — the e2e proves native is attempted first + the readable fallback; native success is covered by test/fullpage-screenshot.test.ts (injected host nav)',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
