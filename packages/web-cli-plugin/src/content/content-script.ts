/**
 * Content script entry (FR-007 / FR-011, ADR-002/004).
 *
 * Injected on demand via `chrome.scripting` (no static content_scripts), runs in
 * the isolated world, and acts as the data plane: protocol discovery + page RPC.
 * It never attaches globals to `window`, never modifies prototypes, and holds no
 * keys / makes no authorization decisions.
 *
 * Discovery fetch placement (R9-6 / D-021): channels ① (well-known) and ②
 * (html-link) are fetched from the content script using the page's own network
 * context. This is a deliberate P0 decision over plan §3.2's "background
 * privileged fetch": the optional host permission is requested only on explicit
 * authorization (FR-006), so a background fetch would be unavailable at first
 * discovery and would fail-closed on every fresh origin. Fetch failures degrade
 * readably (never silent) via `discover()`; a background privileged fetch is a
 * wave-2 optimization once the host permission is held.
 */
import { discover, type DiscoveryFetchResult } from '../discovery/discovery.js';
import { parseHtmlDeclaration } from '../discovery/static-declaration.js';
import { errorResponse, isPluginMessage, makeMessage, okResponse } from '../background/messaging.js';
import { createPageBridge, type BridgeIo, type WebCliEventOp } from './page-bridge.js';
import { createBrowserDomOps, type PlatformDomOpResult } from '@lgdl/web-cli-base';

const CHANNEL = 'web-cli';

/**
 * FR-051 / TASK-029: the generic DOM tool face runs here, in the page's isolated
 * world (the only place with real DOM access). `createBrowserDomOps()` is the
 * base browser implementation; the background hosts a remote proxy of it, so the
 * `dom` / `chrome` / `wait` / `extract` tools work on any authorized site
 * without a page-world `env.dom` implementation.
 */
const browserDomOps = createBrowserDomOps();

/** Anchor-download persistence (no `downloads` permission needed). */
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;

function triggerAnchorDownload(filename: string, data: string | Blob): void {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    if (typeof data !== 'string') URL.revokeObjectURL(url);
  }, 0);
}

/**
 * D1: structured element geometry for the host-side real-pixel element crop.
 *
 * The background cannot read the DOM, so element-crop screenshots ask the page
 * (already-authorized content script) for the target's `getBoundingClientRect`
 * plus the device pixel ratio / viewport size. Reuses the base `readElement` op
 * so the full locator syntax (`css:` / bare CSS / `text=` / `text*=`) is honored;
 * the geometry is returned as JSON so the SW can crop without text parsing.
 */
async function screenshotTargetRect(selector: string): Promise<PlatformDomOpResult> {
  const wanted = (selector ?? '').trim();
  if (!wanted) return { ok: false, output: '✖ element 截图缺少 selector', error: 'missing-selector' };
  const table = browserDomOps as unknown as Record<string, ((...a: unknown[]) => Promise<PlatformDomOpResult>) | undefined>;
  const readElement = table.readElement;
  if (typeof readElement !== 'function') {
    return { ok: false, output: '✖ 当前页面不支持元素几何读取（readElement 缺省）', error: 'read-element-unsupported' };
  }
  let probe: PlatformDomOpResult;
  try {
    probe = await readElement.call(browserDomOps, { selector: wanted, fields: { geometry: true } });
  } catch (err) {
    return { ok: false, output: `✖ 元素几何读取失败：${err instanceof Error ? err.message : String(err)}`, error: 'geometry-failed' };
  }
  if (!probe.ok) return probe;
  const m = /rect\{x:(-?\d+),y:(-?\d+),w:(\d+),h:(\d+)\}[\s\S]*?inViewport:(\w+)/.exec(probe.output);
  if (!m) return { ok: false, output: '✖ 元素几何输出无法解析（页面可能已变化）', error: 'geometry-unparsable' };
  const payload = {
    x: Number(m[1]),
    y: Number(m[2]),
    width: Number(m[3]),
    height: Number(m[4]),
    dpr: window.devicePixelRatio || 1,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    inViewport: m[5] !== 'false',
  };
  return { ok: true, output: JSON.stringify(payload) };
}

/**
 * D2: document / viewport / scroll metrics for the host-side fullpage stitch.
 * The background cannot read the DOM, so the page reports the document size plus
 * the current scroll position and device pixel ratio (JSON so the SW parses no text).
 */
async function fullpageMetrics(): Promise<PlatformDomOpResult> {
  const se = document.scrollingElement ?? document.documentElement;
  const doc = document.documentElement;
  const payload = {
    scrollWidth: Math.max(se?.scrollWidth ?? 0, doc?.scrollWidth ?? 0, window.innerWidth),
    scrollHeight: Math.max(se?.scrollHeight ?? 0, doc?.scrollHeight ?? 0, window.innerHeight),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    dpr: window.devicePixelRatio || 1,
  };
  return { ok: true, output: JSON.stringify(payload) };
}

/**
 * D2: scroll the page to (x, y) and settle before the next `captureVisibleTab`.
 * Settling waits two rAFs (repaint) with a bounded timeout fallback so a throttled
 * frame loop cannot hang the capture. Returns the **actual** settled position so
 * the stitcher draws each screen at its real offset (never an assumed one).
 */
async function scrollToAndSettle(x: unknown, y: unknown): Promise<PlatformDomOpResult> {
  const tx = Number.isFinite(Number(x)) ? Number(x) : 0;
  const ty = Number.isFinite(Number(y)) ? Number(y) : 0;
  try {
    window.scrollTo(tx, ty);
  } catch (err) {
    return { ok: false, output: `✖ 页面滚动失败：${err instanceof Error ? err.message : String(err)}`, error: 'scroll-failed' };
  }
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = (): void => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    try {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    } catch {
      finish();
    }
    setTimeout(finish, 250);
  });
  return { ok: true, output: JSON.stringify({ scrollX: window.scrollX, scrollY: window.scrollY }) };
}

const io: BridgeIo = {
  post(message) {
    window.postMessage(message, '*');
  },
  subscribe(handler) {
    const listener = (event: MessageEvent) => {
      if (event.source !== window) return;
      handler(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  },
};

const bridge = createPageBridge(io, {
  channel: CHANNEL,
  // FR-021: page-world event pushes are forwarded to the background event
  // channel. Best-effort: a missing background receiver must not break the page.
  onEvent: (message) => {
    void chrome.runtime
      .sendMessage(makeMessage('site-event-push', { channel: message.channel, subId: message.subId, events: message.events }))
      .catch(() => {});
  },
});

async function fetchText(url: string): Promise<DiscoveryFetchResult> {
  try {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status, text: await res.text() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * FR-050 / EC-023: same-origin page-context read for the controlled `web-fetch`
 * seam. The content script runs with the page's own origin, so this fetch is a
 * same-origin request (no extension CORS). Cross-origin URLs are refused readably
 * — the extension host fetch (host permission) is the only cross-origin path.
 */
async function fetchSameOriginText(
  url: string,
): Promise<{ ok: boolean; status?: number; text?: string; error?: string }> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { ok: false, error: `URL 无法解析：${url}` };
  }
  if (target.origin !== location.origin) {
    return {
      ok: false,
      error: `跨源拒绝：页面上下文仅能读取当前站点同源资源（${location.origin}），收到 ${target.origin}`,
    };
  }
  try {
    const res = await fetch(target.toString(), { credentials: 'omit', cache: 'no-store' });
    const text = await res.text();
    return res.ok ? { ok: true, status: res.status, text } : { ok: false, status: res.status, text, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run discovery and return the report payload (TASK-019 任务 B: also reused by
 * the side panel's explicit 「重新探测」 entry). Always reports to the background
 * so the controller/state stay authoritative; the payload is returned so a
 * `reprobe` sender can render the fresh reason without a second round trip.
 */
async function runDiscovery(): Promise<Record<string, unknown>> {
  const result = await discover({
    origin: location.origin,
    fetchText,
    readHtmlHref: async () => parseHtmlDeclaration(document.documentElement.outerHTML, location.href),
    handshake: () => bridge.handshake(),
  });
  const payload: Record<string, unknown> = {
    origin: location.origin,
    state: result.state,
    failure: result.failure,
    reason: result.reason,
  };
  if (result.state === 'supported' && result.descriptor) {
    payload.descriptor = result.descriptor;
    // R9-7: bind the descriptor-declared transport channel/types for subsequent
    // invoke/event/handshake messages (defaults are used until discovery).
    bridge.bindTransport(result.descriptor.transport);
  }
  // EC-014 / FR-013: carry the version negotiation outcome so the background can
  // audit unknown / incompatible versions (never a silent accept).
  if (result.version) payload.version = result.version;
  try {
    await chrome.runtime.sendMessage(makeMessage('discover', payload));
  } catch (err) {
    console.warn('[web-cli-plugin] discovery report failed:', err);
  }
  return payload;
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isPluginMessage(raw)) return undefined;
  if (raw.kind === 'site-invoke') {
    const tool = typeof raw.tool === 'string' ? raw.tool : '';
    const subcommand = typeof raw.subcommand === 'string' ? raw.subcommand : '';
    const args = (raw.args && typeof raw.args === 'object' ? raw.args : {}) as Record<string, string>;
    void bridge.invoke(tool, subcommand, args).then(
      (result) => sendResponse(okResponse(result)),
      (err) => sendResponse(errorResponse(err instanceof Error ? err.message : String(err))),
    );
    return true;
  }
  if (raw.kind === 'site-event') {
    // FR-021: proxy the page-world `env.events` hub for the background.
    const op = (typeof raw.op === 'string' ? raw.op : 'status') as WebCliEventOp;
    const params = (raw.params && typeof raw.params === 'object' ? raw.params : {}) as Record<string, unknown>;
    void bridge.events.request(op, params).then(
      (result) => sendResponse(okResponse(result)),
      (err) => sendResponse(errorResponse(err instanceof Error ? err.message : String(err))),
    );
    return true;
  }
  if (raw.kind === 'dom-op') {
    // FR-051 / TASK-029: remote proxy target for the background `env.dom.ops`
    // (dom/chrome/wait/extract). Args arrive as an array matching the base ops
    // signature; unknown methods return a readable refusal (never throw).
    const method = typeof raw.method === 'string' ? raw.method : '';
    const args = Array.isArray(raw.args) ? raw.args : [];
    // D1: plugin-specific geometry op (not part of the base ops table) for the
    // host-side real-pixel element crop.
    if (method === 'wcliScreenshotRect') {
      void screenshotTargetRect(String(args[0] ?? '')).then(
        (result) => sendResponse(okResponse(result)),
        (err) => sendResponse(okResponse({ ok: false, output: `✖ 元素几何读取失败：${err instanceof Error ? err.message : String(err)}`, error: 'geometry-failed' })),
      );
      return true;
    }
    // D2: plugin-specific fullpage geometry / scroll ops (not part of the base ops table).
    if (method === 'wcliFullpageMetrics') {
      void fullpageMetrics().then(
        (result) => sendResponse(okResponse(result)),
        (err) => sendResponse(okResponse({ ok: false, output: `✖ 整页几何读取失败：${err instanceof Error ? err.message : String(err)}`, error: 'fullpage-metrics-failed' })),
      );
      return true;
    }
    if (method === 'wcliScrollTo') {
      void scrollToAndSettle(args[0], args[1]).then(
        (result) => sendResponse(okResponse(result)),
        (err) => sendResponse(okResponse({ ok: false, output: `✖ 页面滚动失败：${err instanceof Error ? err.message : String(err)}`, error: 'scroll-failed' })),
      );
      return true;
    }
    const table = browserDomOps as unknown as Record<string, ((...a: unknown[]) => Promise<PlatformDomOpResult>) | undefined>;
    const fn = method ? table[method] : undefined;
    if (typeof fn !== 'function') {
      sendResponse(okResponse({ ok: false, output: `✖ DOM 操作 "${method}" 在当前页面不可用`, error: 'dom-op-unsupported' }));
      return true;
    }
    void Promise.resolve(fn.apply(browserDomOps, args)).then(
      (result) => sendResponse(okResponse(result)),
      (err) => sendResponse(okResponse({ ok: false, output: `✖ DOM 操作 "${method}" 失败：${err instanceof Error ? err.message : String(err)}`, error: 'dom-op-failed' })),
    );
    return true;
  }
  if (raw.kind === 'file-save') {
    // FR-051: page-context anchor download (no `downloads` permission). A size
    // guard keeps a runaway payload from being pushed through the message bus.
    const filename = typeof raw.filename === 'string' ? raw.filename : 'download';
    const data = raw.data as string | Blob;
    const size = typeof data === 'string' ? data.length : typeof data === 'object' && data !== null && 'size' in data ? (data as Blob).size : 0;
    if (size > MAX_DOWNLOAD_BYTES) {
      sendResponse(okResponse({ ok: false, error: `文件过大（${size} B > ${MAX_DOWNLOAD_BYTES} B 上限），已拒绝以免阻塞页面` }));
      return true;
    }
    try {
      triggerAnchorDownload(filename, data);
      sendResponse(okResponse({ ok: true }));
    } catch (err) {
      sendResponse(okResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    }
    return true;
  }
  if (raw.kind === 'reprobe') {
    // TASK-019 任务 B: an explicit re-probe requested by the side panel. Re-runs
    // discovery, reports the fresh result to the background, and returns it so
    // the panel can render the readable reason immediately.
    void runDiscovery().then(
      (result) => sendResponse(okResponse(result)),
      (err) => sendResponse(errorResponse(err instanceof Error ? err.message : String(err))),
    );
    return true;
  }
  if (raw.kind === 'whoami') {
    // decision ① / FR-047: the background asks a tab who it is on tab switch.
    // Answering with our own `location.origin` lets it auto-bind without
    // `tabs` permission / `tab.url` / a user gesture.
    sendResponse(okResponse({ origin: location.origin }));
    return true;
  }
  if (raw.kind === 'fetch-text') {
    // FR-050 / EC-023: same-origin read served by the page context (the controlled
    // web-fetch seam prefers this transport for the bound origin's own resources).
    const url = typeof raw.url === 'string' ? raw.url : '';
    void fetchSameOriginText(url).then(
      (result) => sendResponse(okResponse(result)),
      (err) => sendResponse(errorResponse(err instanceof Error ? err.message : String(err))),
    );
    return true;
  }
  return undefined;
});

void runDiscovery();

// decision ① / FR-047: proactive auto-handshake. Under declarative injection the
// content script loads automatically after the first authorization, so it
// announces itself; the background binds this tab immediately (no icon click).
// Best-effort: a missing background receiver must never break the page.
void chrome.runtime
  .sendMessage(makeMessage('hello', { origin: location.origin }))
  .catch(() => {});
