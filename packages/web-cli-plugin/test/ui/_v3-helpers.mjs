/**
 * v3 gate helper — the minimal shared底座 for the three-piece v3 density gate.
 *
 * ADR-V3-003 (5th clause) — **deliberate duplication, explicitly registered**:
 * the four pre-existing gates (`test/ui/{journey,insight,binding,hardening}.mjs`)
 * each carry their own inlined copy of these primitives. Extracting a shared
 * module would force byte-level edits into those four files, which would violate
 * NFR-V3-014 (assertions only ever grow; protected ranges are byte-hash pinned)
 * and would manufacture pointless supersession-ledger entries. So v3 keeps its
 * own ~100 line copy. Cost: ~100 duplicated lines. Benefit: the four existing
 * gate files stay byte-identical.
 *
 * Design constraints (serial-gate discipline, NFR-V3-012):
 *   - `launch()` starts exactly ONE Chromium instance.
 *   - `connectCdp()` connects to exactly ONE page target at a time.
 *   - `check()` NEVER swallows a failure: the first false condition is recorded,
 *     and `summary()`/`finish()` exit non-zero (a gate that cannot fail is not a
 *     gate — NFR-V3-013).
 *
 * Zero external dependencies: only `node:*` builtins and the global WebSocket
 * (Node >= 22), so `node test/ui/*.mjs` runs on this machine without installing
 * anything (NFR-V3-017).
 */
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** `packages/web-cli-plugin/` — the gate lives two levels below the package root. */
export const PACKAGE_ROOT = resolve(HERE, '..', '..');
export const DIST = resolve(PACKAGE_ROOT, 'dist');
export const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..');
export const CHROME = process.env.CHROME_BIN || resolve(REPO_ROOT, '.pw-browsers', 'chromium-1234', 'chrome-linux64', 'chrome');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The three L0 viewports (width × 900), spec §9.2. */
export const VIEWPORTS = [320, 400, 520];
export const VIEWPORT_HEIGHT = 900;

// ── assertions ───────────────────────────────────────────────────────────────
const failures = [];
let passes = 0;

/**
 * Record one assertion. `cond === false` is a hard failure — `finish()` exits 1.
 * Returns the condition so callers can branch on it.
 */
export function check(name, cond, detail) {
  if (cond) {
    passes += 1;
    console.log(`  ✔ ${name}`);
  } else {
    console.log(`  ✖ ${name}${detail === undefined ? '' : ` — ${detail}`}`);
    failures.push(name);
  }
  return Boolean(cond);
}

export const counts = () => ({ passes, failures: failures.length, labels: [...failures] });
export const failed = () => failures.length > 0;

/** Print the summary and exit non-zero on any failure (never swallow). */
export function finish(title = 'v3 gate') {
  console.log(`\n▶ ${title}: ${passes} passed / ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`   ✖ ${f}`);
    process.exit(1);
  }
  console.log(`✔ ${title} PASS`);
  process.exit(0);
}

// ── CDP client (raw WebSocket, no dependency) ────────────────────────────────
export async function connectCdp(wsUrl) {
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
      return () => {
        const arr = listeners.get(method) ?? [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      };
    },
    close() {
      ws.close();
    },
  };
}

/** `Runtime.evaluate` with `awaitPromise` + `returnByValue`. */
export async function evaluate(cdp, expression, timeoutMs = 30000) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
    timeout: timeoutMs,
  });
  if (res.exceptionDetails) {
    throw new Error(
      `evaluate failed: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`.trim(),
    );
  }
  return res.result?.value;
}

/** Poll an expression until it is truthy (or give up and return undefined). */
export async function waitFor(cdp, expression, tries = 100, gapMs = 200) {
  for (let i = 0; i < tries; i += 1) {
    const v = await evaluate(cdp, expression).catch(() => undefined);
    if (v) return v;
    await sleep(gapMs);
  }
  return undefined;
}

/** Viewport-relative centre of `selector` (null when absent). */
export async function realBox(cdp, selector) {
  return evaluate(
    cdp,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    })()`,
  );
}

/** Real mouse click at the element centre (no `el.click()` shortcut). */
export async function realClick(cdp, selector) {
  const box = await realBox(cdp, selector);
  if (!box) throw new Error(`selector not found: ${selector}`);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
}

/** Real per-character typing (keyDown carries text + matching keyUp). */
export async function typeText(cdp, text) {
  for (const ch of text) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  }
}

/** Focus + triple-click select-all + real type (replaces content). */
export async function fill(cdp, selector, text) {
  await realClick(cdp, selector);
  const box = await realBox(cdp, selector);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 3 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 3 });
  await typeText(cdp, text);
}

/** Pin the viewport (320/400/520 × 900) for a measurement cell. */
export async function setViewport(cdp, width, height = VIEWPORT_HEIGHT) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await sleep(150);
}

/** Poll `/json/list` for a target matching `predicate`. */
export async function findTarget(base, predicate, tries = 120, gapMs = 250) {
  for (let i = 0; i < tries; i += 1) {
    const list = await fetch(`${base}/json/list`).then((r) => r.json()).catch(() => []);
    const t = list.find(predicate);
    if (t) return t;
    await sleep(gapMs);
  }
  return undefined;
}

/**
 * Start ONE headless Chromium with the built extension loaded.
 * Returns `{ chrome, base, work, profile, port, log() }` — callers must
 * `chrome.kill('SIGKILL')` (and optionally remove `work`) in a `finally`.
 */
export async function launch({ extDir = DIST, extraArgs = [], tag = 'v3', portRange = [9500, 9900] } = {}) {
  if (!existsSync(CHROME)) throw new Error(`Chromium not found: ${CHROME} (CHROME_BIN overrides)`);
  if (!existsSync(extDir)) throw new Error(`dist not found: ${extDir} — run \`npm run build\` first`);
  const work = await mkdtemp(join(tmpdir(), `web-cli-${tag}-`));
  const profile = join(work, 'profile');
  const [lo, hi] = portRange;
  const port = lo + Math.floor(Math.random() * (hi - lo));
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
      ...extraArgs,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let buf = '';
  chrome.stdout.on('data', (d) => (buf += d));
  chrome.stderr.on('data', (d) => (buf += d));
  const base = `http://127.0.0.1:${port}`;
  return { chrome, base, work, profile, port, log: () => buf };
}

/** Wait for OUR extension service worker (Chrome starts built-in ones too). */
export async function findOurServiceWorker(base, tries = 120, gapMs = 250) {
  for (let i = 0; i < tries; i += 1) {
    const list = await fetch(`${base}/json/list`).then((r) => r.json()).catch(() => []);
    for (const t of list) {
      if (t.type !== 'service_worker' || !t.url.startsWith('chrome-extension://')) continue;
      try {
        const probe = await connectCdp(t.webSocketDebuggerUrl);
        await probe.send('Runtime.enable');
        if ((await evaluate(probe, `chrome.runtime.getManifest().name`)) === 'web-cli plugin') return { cdp: probe, target: t };
        probe.close();
      } catch {
        /* not ours / not ready yet */
      }
    }
    await sleep(gapMs);
  }
  return undefined;
}

/** Open the side panel page as a real extension page target and connect to it. */
export async function openSidePanel(sw, base, tries = 120) {
  const url = await evaluate(sw, `chrome.runtime.getURL('sidepanel.html')`);
  await evaluate(sw, `chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') }).then((t) => t.id)`);
  const target = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'), tries, 250);
  if (!target) throw new Error('sidepanel target not found');
  const cdp = await connectCdp(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  await sleep(900);
  return { cdp, url };
}

/** The in-memory risk/disclosure test hooks are namespaced `window.__v3`. */
export const V3_HOOK = '__v3';
