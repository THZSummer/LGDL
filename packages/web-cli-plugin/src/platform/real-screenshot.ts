/**
 * Real-pixel screenshot provider + native history navigation — plugin host layer
 * (D1/D2/D6, base zero-change).
 *
 * WHY: the base `chrome` tool ran through `env.dom.ops` — the page-context
 * `createBrowserDomOps()` implementation, which is a `foreignObject + canvas`
 * **approximation** (external images / CSS variables / scroll state are not
 * faithful; the page world cannot reach the extension surface either). The plugin
 * is now an **extension host**, so `chrome.tabs.captureVisibleTab` yields **real
 * pixels** (D1) and `chrome.tabs.goBack/goForward` give **tab-level** history (D6)
 * — both with **zero new permission**.
 *
 * This module is the plugin-side provider that wraps `env.dom.ops` (via a
 * transparent `Proxy`) and overrides only `screenshot` + `historyNav`:
 *   - `mode=viewport` → `captureVisibleTab(windowId, {format:'png'})`.
 *   - `mode=element`  → read the target element's bounding rect from the page
 *     (the existing `dom-op` channel), then crop in the SW with
 *     `OffscreenCanvas` / `createImageBitmap`.
 *   - `mode=fullpage` → D2: scroll the page screen-by-screen, capture each with
 *     `captureVisibleTab` and **stitch** them in the SW `OffscreenCanvas`. Throttled
 *     to `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` (Chrome's hard rate limit),
 *     bounded by a screen/pixel budget, and the original scroll position is always
 *     restored. The output states the stitching is an **approximation** (fixed /
 *     sticky elements repeat per screen, lazy content may be unloaded, animations /
 *     carousels may be inconsistent) — never a「完整/无损整页」claim.
 *   - `historyNav(±1)` → D6: `chrome.tabs.goBack/goForward(tabId)` (tab-level,
 *     cross-navigation reliable); on failure (no permission / no history /
 *     restricted page) it falls back to the base page `history.back/forward` and
 *     labels which path actually ran. Native navigation can leave the bound origin
 *     — that consequence is disclosed readably, never silent.
 *
 * HONESTY (never silently claim "real"): the real path is only taken when the
 * bound tab's origin actually holds the host permission. No host permission /
 * restricted page / capture failure / rate limit / over budget → the call degrades
 * readably and records the concrete reason so the tool output can label which path
 * actually ran.
 *
 * CONTRACT UNCHANGED: `screenshot` still yields
 * `PlatformDomOpResult{ok,output,dataUrl}`; the viewport/element output summary /
 * auto-download chain / `--include-dataurl` / "dataURL does not enter the context"
 * policies all stay in the base `deliverScreenshot`. Fullpage is delivered by the
 * plugin `chrome-host` wrapper because the base executor short-circuits
 * `fullpage` before `ops.screenshot` is reached (base source untouched — see
 * `docs/dev.md` §13.8).
 *
 * TRANSPARENCY (critical): `browser-tools.ts` decides whether to register
 * `wait` / `extract` / `export` from the *presence* of `ops.waitFor` /
 * `ops.extractData`. The wrapper is therefore a `Proxy` whose `get` delegates
 * everything except `screenshot` / `historyNav` to the base ops, so every other
 * method/property stays visible (asserted in tests).
 *
 * Type-only base imports keep the base package out of the content bundle.
 */
import type { PlatformDomOpResult, PlatformDomOps, PlatformScreenshotOptions } from '@lgdl/web-cli-base';

/**
 * Symbol under which the per-env screenshot path metadata is attached to the
 * `PlatformEnv`. The plugin chrome-tool wrapper reads it after the base executor
 * returns to annotate the result honestly (the base `deliverScreenshot` builds
 * its own output and does not echo `ops.screenshot`'s `output`).
 */
export const SCREENSHOT_PATH_META = Symbol.for('wcli.screenshotPathMeta');

/** Chrome hard limit: `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` = 2 calls/s. */
export const MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 2;

/** Minimum spacing between two `captureVisibleTab` calls derived from the limit. */
export const MIN_CAPTURE_INTERVAL_MS = Math.ceil(1000 / MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND);

/**
 * Bounded backoff delays applied when `captureVisibleTab` rejects with the Chrome
 * rate-limit error. The 2/s quota is enforced per one-second window and a plain
 * 500ms spacing can land 3 starts inside one window under jitter, so a
 * rate-limited screen is retried (bounded) instead of failing the whole stitch.
 */
export const CAPTURE_RATE_LIMIT_BACKOFFS_MS = [700, 1500];

/** True for the Chrome capture rate-limit rejection (retryable). */
export function isCaptureRateLimitError(err: unknown): boolean {
  return /MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND|quota|exceed/i.test(errText(err));
}

/** D2 upper bound: never stitch more than this many screens (unbounded = refused). */
export const MAX_FULLPAGE_SCREENS = 20;

/** D2 upper bound: device-pixel budget for the stitched canvas (≈40 MP). */
export const MAX_FULLPAGE_PIXELS = 40_000_000;

/** Which pixel path actually ran for the last screenshot call. */
export type ScreenshotPathKind = 'real' | 'approx' | 'fullpage';

/** D2: evidence of a successful fullpage stitch (screen count + CSS dimensions). */
export interface FullpageMeta {
  /** Number of `captureVisibleTab` calls stitched. */
  screens: number;
  /** Document width in CSS px (may exceed the viewport → horizontal clipping). */
  width: number;
  /** Document height in CSS px. */
  height: number;
  /** Viewport width in CSS px. */
  viewportWidth: number;
  /** Viewport height in CSS px. */
  viewportHeight: number;
  /** Whether the original scroll position was restored (false → `restoreError` set). */
  restored: boolean;
  /** Why the original scroll position could not be restored (never silent). */
  restoreError?: string;
}

/** Mutable per-env record of the last screenshot path decision (evidence for the tool output). */
export interface ScreenshotPathMeta {
  kind: ScreenshotPathKind;
  /** true once a provider decision was made for the in-flight call (false → no annotation). */
  decided: boolean;
  /** Why the real path was not taken (approx only). */
  reason?: string;
  /** Real path was cropped to an element in the SW. */
  cropped?: boolean;
  /** Origin the decision applied to (evidence). */
  origin?: string;
  /** D2: fullpage stitch evidence (kind === 'fullpage'). */
  fullpage?: FullpageMeta;
  /** D2: true when the requested mode was fullpage (success or readable refusal). */
  fullpageAttempt?: boolean;
}

/** Structured element geometry read from the page for the SW crop. */
export interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
  dpr: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Element geometry reply from the page (dom-op channel). */
export interface ElementRectReply {
  ok: boolean;
  rect?: ElementRect;
  /** Readable failure reason (never silent). */
  reason?: string;
}

/** D2: document / viewport / scroll metrics read from the page (dom-op channel). */
export interface FullpageMetrics {
  scrollWidth: number;
  scrollHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  dpr: number;
}

/** D2: metrics reply from the page (dom-op channel). */
export interface FullpageMetricsReply {
  ok: boolean;
  metrics?: FullpageMetrics;
  /** Readable failure reason (never silent). */
  reason?: string;
}

/** D2: scroll reply from the page (actual settled position; never silent). */
export interface ScrollToReply {
  ok: boolean;
  scrollX?: number;
  scrollY?: number;
  /** Readable failure reason (never silent). */
  reason?: string;
}

/** D2: one captured screen (dataURL + its CSS-px y offset in the document). */
export interface FullpagePart {
  dataUrl: string;
  y: number;
}

/** D2: stitched canvas layout (CSS px document size + device pixel ratio). */
export interface FullpageLayout {
  width: number;
  height: number;
  dpr: number;
}

/** D2: outcome of the scroll-stitch capture (success or readable refusal). */
export interface FullpageCaptureResult {
  ok: boolean;
  dataUrl?: string;
  screens?: number;
  width?: number;
  height?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  /** Number of screens captured before an in-flight failure (evidence). */
  capturedScreens?: number;
  /** Set when the original scroll position could not be restored (never silent). */
  restoreError?: string;
  /** Readable failure reason (never silent). */
  reason?: string;
}

/** D6: native tab-level history navigation outcome (`chrome.tabs.goBack/goForward`). */
export interface HostHistoryNavResult {
  ok: boolean;
  /** Origin the tab ended on (readable via the `tabs` permission). */
  originAfter?: string;
  /** Full URL the tab ended on (evidence; may be undefined on restricted pages). */
  urlAfter?: string;
  /** Readable failure reason when the native path could not run (never silent). */
  reason?: string;
}

/**
 * D2 honest limitation notice — mandatory on every successful fullpage stitch.
 * The stitched image is an **approximation**, never a「完整/无损整页」.
 */
export const FULLPAGE_LIMITATION_NOTICE =
  '局限声明（整页拼接为近似，非「完整/无损」整页）：position:fixed / sticky 元素会在每屏重复出现；' +
  '懒加载内容可能尚未加载；动画/轮播状态在不同屏可能不一致。';

/** D2: honest pixel-path line for a stitched fullpage image. */
export function fullpagePathLine(screens: number): string {
  return `像素路径：真实像素（captureVisibleTab ×${screens} 屏拼接）`;
}

/** D6: honest path line when `chrome.tabs.goBack/goForward` ran. */
export function nativeHistoryPathLine(delta: number): string {
  return `历史路径：原生（${delta < 0 ? 'tabs.goBack' : 'tabs.goForward'}）`;
}

/** D6: honest path line when the page-context `history` fallback ran. */
export function fallbackHistoryPathLine(reason: string): string {
  return `历史路径：页面 history（回退，原因：${reason}）`;
}

/** D2: readable explanation for the「整页已捕获范围」on an over-budget refusal. */
export function fullpageRangeNote(capturedScreens: number | undefined): string {
  if (capturedScreens === undefined) return '已捕获范围：0 屏（未开始捕获）';
  return `已捕获范围：${capturedScreens} 屏（已丢弃，不返回不完整整页图像）`;
}

/** Dependencies of the real-pixel provider (all injectable → node-testable). */
export interface RealScreenshotDeps {
  /** Resolve the tab to capture (undefined when nothing is bound). */
  target(): { tabId?: number; origin?: string } | undefined;
  /** Whether the given origin currently holds the (optional) host permission. */
  hasHostPermission(origin: string): Promise<boolean>;
  /** Capture the visible area of the tab's window as a PNG dataURL. */
  capture(tabId: number): Promise<string>;
  /** Read the target element's bounding rect through the page (`dom-op` channel). */
  elementRect(tabId: number, selector: string): Promise<ElementRectReply>;
  /** Crop the dataURL to the element rect. Default = SW OffscreenCanvas impl. */
  crop?(dataUrl: string, rect: ElementRect): Promise<string>;
  /** Per-env path record written by the provider (read by the chrome-tool wrapper). */
  meta: ScreenshotPathMeta;
  // ---- D2: fullpage scroll-stitch seams (omitted → fullpage refused readably) ----
  /** Read document/viewport/scroll metrics through the page (`dom-op` channel). */
  fullpageMetrics?(tabId: number): Promise<FullpageMetricsReply>;
  /** Scroll the page to (x,y) and settle; returns the actual position. */
  scrollTo?(tabId: number, x: number, y: number): Promise<ScrollToReply>;
  /** Compose the captured screens into one PNG. Default = SW OffscreenCanvas impl. */
  stitch?(parts: FullpagePart[], layout: FullpageLayout): Promise<string>;
  /** Delay between captures (rate-limit throttle). Default = setTimeout. */
  sleep?(ms: number): Promise<void>;
  /** Monotonic ms clock (throttle accounting). Default = Date.now. */
  now?(): number;
  // ---- D6: native tab-level history navigation (omitted → page-history fallback) ----
  /** `chrome.tabs.goBack` / `chrome.tabs.goForward` for the given tab. */
  hostHistoryNav?(delta: number, tabId: number): Promise<HostHistoryNavResult>;
}

const HTTP_ORIGIN = /^https?:\/\//i;

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** True for an http(s) origin that can hold a host permission and be captured. */
export function isCapturableOrigin(origin: string | undefined): boolean {
  return typeof origin === 'string' && HTTP_ORIGIN.test(origin.trim());
}

/** Readable summary returned by the real path (dataURL stays in its own field). */
export function realPathSummary(mode: string, cropped: boolean): string {
  const label = mode === 'element' ? '元素级' : '视口级';
  return (
    `✓ chrome screenshot：${label}真实像素截图完成（captureVisibleTab${cropped ? ' + SW 元素裁剪' : ''}）。` +
    '像素来自插件宿主层（chrome.tabs.captureVisibleTab），非 foreignObject/canvas 近似；' +
    'dataURL 已放独立字段，下载/落盘由 chrome screenshot 工具层处理。'
  );
}

/**
 * D2 — scroll the page screen-by-screen, capture each screen, stitch in the SW.
 *
 * Discipline:
 *   - `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` (Chrome hard limit) → a minimum
 *     spacing of `MIN_CAPTURE_INTERVAL_MS` between capture **starts**.
 *   - bounded: screens > `MAX_FULLPAGE_SCREENS` or device pixels >
 *     `MAX_FULLPAGE_PIXELS` → readable refusal **before** any capture (no unbounded
 *     grabbing); the required/available ranges are reported.
 *   - the original scroll position is restored on every exit path; a restore
 *     failure is disclosed in the result (never silent).
 */
export async function captureFullpageViaScreens(
  tabId: number,
  deps: RealScreenshotDeps,
): Promise<FullpageCaptureResult> {
  if (!deps.fullpageMetrics || !deps.scrollTo) {
    return { ok: false, reason: '宿主层未注入整页几何/滚动通道（fullpage 拼接不可用）' };
  }
  const scrollTo = deps.scrollTo;
  let metricsReply: FullpageMetricsReply;
  try {
    metricsReply = await deps.fullpageMetrics(tabId);
  } catch (err) {
    return { ok: false, reason: `整页几何读取失败：${errText(err)}` };
  }
  if (!metricsReply.ok || !metricsReply.metrics) {
    return { ok: false, reason: `整页几何读取失败：${metricsReply.reason ?? '未知'}` };
  }
  const m = metricsReply.metrics;
  const vw = Math.max(1, Math.round(m.viewportWidth));
  const vh = Math.max(1, Math.round(m.viewportHeight));
  const cw = Math.max(1, Math.round(m.scrollWidth || vw));
  const ch = Math.max(1, Math.round(m.scrollHeight || vh));
  const dpr = m.dpr > 0 ? m.dpr : 1;
  const screens = Math.max(1, Math.ceil(ch / vh));
  const devicePixels = Math.ceil(cw * dpr) * Math.ceil(ch * dpr);

  if (screens > MAX_FULLPAGE_SCREENS) {
    return {
      ok: false,
      screens,
      width: cw,
      height: ch,
      viewportWidth: vw,
      viewportHeight: vh,
      reason:
        `整页超出上限：页高 ${ch}px ≈ ${screens} 屏 > 上限 ${MAX_FULLPAGE_SCREENS} 屏；` +
        `${fullpageRangeNote(undefined)}。可改用 --mode viewport 分次截取`,
    };
  }
  if (devicePixels > MAX_FULLPAGE_PIXELS) {
    return {
      ok: false,
      screens,
      width: cw,
      height: ch,
      viewportWidth: vw,
      viewportHeight: vh,
      reason:
        `整页像素预算超限：${cw}×${ch}px @dpr${dpr} ≈ ${(devicePixels / 1e6).toFixed(1)}MP > ` +
        `${(MAX_FULLPAGE_PIXELS / 1e6).toFixed(0)}MP；${fullpageRangeNote(undefined)}。可改用 --mode viewport 分次截取`,
    };
  }

  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const nowFn = deps.now ?? (() => Date.now());
  const origX = m.scrollX;
  const origY = m.scrollY;
  const parts: FullpagePart[] = [];
  let lastCaptureStart = Number.NEGATIVE_INFINITY;
  let restoreError: string | undefined;

  /** Always restore the original scroll position (never leave the page at the bottom). */
  const restore = async (): Promise<void> => {
    try {
      const r = await scrollTo(tabId, origX, origY);
      if (!r.ok) restoreError = r.reason ?? '页面未确认恢复滚动位置';
    } catch (err) {
      restoreError = errText(err);
    }
  };
  const finish = async (r: FullpageCaptureResult): Promise<FullpageCaptureResult> => {
    await restore();
    return restoreError ? { ...r, restoreError } : r;
  };

  for (let i = 0; i < screens; i += 1) {
    const targetY = Math.min(i * vh, Math.max(0, ch - vh));
    let scrollReply: ScrollToReply;
    try {
      scrollReply = await scrollTo(tabId, 0, targetY);
    } catch (err) {
      return finish({ ok: false, reason: `滚动到第 ${i + 1}/${screens} 屏失败：${errText(err)}`, capturedScreens: parts.length, screens, width: cw, height: ch, viewportWidth: vw, viewportHeight: vh });
    }
    if (!scrollReply.ok) {
      return finish({ ok: false, reason: `滚动到第 ${i + 1}/${screens} 屏失败：${scrollReply.reason ?? '未知'}`, capturedScreens: parts.length, screens, width: cw, height: ch, viewportWidth: vw, viewportHeight: vh });
    }
    const y = typeof scrollReply.scrollY === 'number' ? scrollReply.scrollY : targetY;
    // Throttle capture *starts* to the Chrome hard limit (2 calls/s → ≥500ms), and
    // retry a rate-limited screen with a bounded backoff instead of failing the stitch.
    let dataUrl: string | undefined;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= CAPTURE_RATE_LIMIT_BACKOFFS_MS.length; attempt += 1) {
      const elapsed = nowFn() - lastCaptureStart;
      if (elapsed < MIN_CAPTURE_INTERVAL_MS) await sleep(MIN_CAPTURE_INTERVAL_MS - elapsed);
      lastCaptureStart = nowFn();
      try {
        dataUrl = await deps.capture(tabId);
        break;
      } catch (err) {
        lastErr = err;
        if (isCaptureRateLimitError(err) && attempt < CAPTURE_RATE_LIMIT_BACKOFFS_MS.length) {
          await sleep(CAPTURE_RATE_LIMIT_BACKOFFS_MS[attempt]);
          continue;
        }
        return finish({ ok: false, reason: `第 ${i + 1}/${screens} 屏捕获失败：${errText(err)}`, capturedScreens: parts.length, screens, width: cw, height: ch, viewportWidth: vw, viewportHeight: vh });
      }
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      const detail = lastErr ? errText(lastErr) : '返回空/非法 dataURL';
      return finish({ ok: false, reason: `第 ${i + 1}/${screens} 屏捕获失败：${detail}`, capturedScreens: parts.length, screens, width: cw, height: ch, viewportWidth: vw, viewportHeight: vh });
    }
    parts.push({ dataUrl, y });
  }

  let stitched: string;
  try {
    const stitch = deps.stitch ?? stitchFullpageParts;
    stitched = await stitch(parts, { width: cw, height: ch, dpr });
  } catch (err) {
    return finish({ ok: false, reason: `整页拼接失败：${errText(err)}`, capturedScreens: parts.length, screens, width: cw, height: ch, viewportWidth: vw, viewportHeight: vh });
  }
  return finish({ ok: true, dataUrl: stitched, screens, width: cw, height: ch, viewportWidth: vw, viewportHeight: vh });
}

/**
 * Wrap `base` so only `screenshot` / `historyNav` are overridden; every other
 * method/property (including optional `waitFor` / `extractData`) stays delegated
 * & visible.
 */
export function createRealScreenshotOps(base: PlatformDomOps, deps: RealScreenshotDeps): PlatformDomOps {
  /** Resolve + gate the bound tab (shared by screenshot + fullpage). */
  const gate = async (): Promise<
    { ok: true; tabId: number; origin: string } | { ok: false; reason: string; origin?: string }
  > => {
    let target: { tabId?: number; origin?: string } | undefined;
    try {
      target = deps.target();
    } catch (err) {
      return { ok: false, reason: `标签页状态读取失败：${errText(err)}` };
    }
    if (!target || target.tabId === undefined) return { ok: false, reason: '无活跃/已绑定标签页，无法走宿主页真实像素' };
    if (!isCapturableOrigin(target.origin)) {
      return { ok: false, reason: `当前页面非 http(s)（${target.origin ?? '未知'}），真实像素捕获不可用`, origin: target.origin };
    }
    let allowed: boolean;
    try {
      allowed = await deps.hasHostPermission(target.origin as string);
    } catch (err) {
      return { ok: false, reason: `host 权限判定失败：${errText(err)}`, origin: target.origin };
    }
    if (!allowed) {
      return { ok: false, reason: `当前站点未授予站点访问权限（${target.origin}），captureVisibleTab 不可用`, origin: target.origin };
    }
    return { ok: true, tabId: target.tabId, origin: target.origin as string };
  };

  const screenshot = async (opts: PlatformScreenshotOptions): Promise<PlatformDomOpResult> => {
    const mode = opts.mode ?? 'viewport';
    const baseShot = base.screenshot;
    if (typeof baseShot !== 'function') {
      return { ok: false, output: '✖ chrome screenshot 实现未注入（env.dom.ops.screenshot 缺省）', error: 'screenshot not injected' };
    }

    const decide = (kind: ScreenshotPathKind, reason: string | undefined, cropped: boolean, origin: string | undefined): void => {
      deps.meta.kind = kind;
      deps.meta.decided = true;
      deps.meta.reason = reason;
      deps.meta.cropped = cropped;
      deps.meta.origin = origin;
    };
    const fallback = async (reason: string, origin?: string): Promise<PlatformDomOpResult> => {
      decide('approx', reason, false, origin);
      return baseShot.call(base, opts);
    };

    // ---- D2: fullpage scroll-stitch (plugin host path; base近似面本身不支持整页) ----
    if (mode === 'fullpage') {
      deps.meta.fullpageAttempt = true;
      const g = await gate();
      const refusal = (reason: string, extra?: Partial<FullpageCaptureResult>): PlatformDomOpResult => {
        decide('approx', reason, false, g.ok ? g.origin : undefined);
        const range = extra?.capturedScreens !== undefined ? `；${fullpageRangeNote(extra.capturedScreens)}` : '';
        const restore = extra?.restoreError ? `；⚠ 原滚动位置恢复失败：${extra.restoreError}` : '';
        return {
          ok: false,
          output:
            `✖ chrome screenshot：整页拼接不可用 —— ${reason}${range}${restore}。` +
            '零静默：未返回任何整页图像（页面上下文近似面本身不支持整页）。',
          error: 'fullpage unavailable',
        };
      };
      if (!g.ok) return refusal(g.reason);
      const r = await captureFullpageViaScreens(g.tabId, deps);
      if (!r.ok || !r.dataUrl) return refusal(r.reason ?? '未知', r);
      decide('fullpage', undefined, false, g.origin);
      deps.meta.fullpage = {
        screens: r.screens ?? 0,
        width: r.width ?? 0,
        height: r.height ?? 0,
        viewportWidth: r.viewportWidth ?? 0,
        viewportHeight: r.viewportHeight ?? 0,
        restored: r.restoreError === undefined,
        ...(r.restoreError ? { restoreError: r.restoreError } : {}),
      };
      return {
        ok: true,
        output:
          `✓ chrome screenshot：整页拼接截图完成（captureVisibleTab ×${r.screens} 屏，文档 ${r.width}×${r.height}px CSS，视口 ${r.viewportWidth}×${r.viewportHeight}px）。` +
          (r.restoreError ? `\n⚠ 原滚动位置恢复失败：${r.restoreError}` : '\n滚动位置已恢复（未把页面留在底部）。') +
          `\n${fullpagePathLine(r.screens ?? 0)}\n${FULLPAGE_LIMITATION_NOTICE}`,
        dataUrl: r.dataUrl,
      };
    }

    const g = await gate();
    if (!g.ok) return fallback(g.reason, g.origin);

    let dataUrl: string;
    try {
      dataUrl = await deps.capture(g.tabId);
    } catch (err) {
      // Rate limit (MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND) / not-active / API error → readable degrade.
      return fallback(`captureVisibleTab 失败：${errText(err)}`, g.origin);
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return fallback('captureVisibleTab 返回空/非法 dataURL', g.origin);
    }

    let cropped = false;
    if (mode === 'element') {
      const selector = (opts.selector ?? '').trim();
      if (!selector) return fallback('mode=element 缺少 selector', g.origin);
      let rectReply: ElementRectReply;
      try {
        rectReply = await deps.elementRect(g.tabId, selector);
      } catch (err) {
        return fallback(`元素几何读取失败：${errText(err)}`, g.origin);
      }
      if (!rectReply.ok || !rectReply.rect) return fallback(`元素几何读取失败：${rectReply.reason ?? '未知'}`, g.origin);
      const cropFn = deps.crop ?? cropDataUrlToRect;
      try {
        dataUrl = await cropFn(dataUrl, rectReply.rect);
        cropped = true;
      } catch (err) {
        return fallback(`元素裁剪失败：${errText(err)}`, g.origin);
      }
    }

    decide('real', undefined, cropped, g.origin);
    return { ok: true, output: realPathSummary(mode, cropped), dataUrl };
  };

  /**
   * D6: native tab-level history navigation, with an honest page-history fallback.
   * `delta` = -1 (back) / +1 (forward); base risk tiers are untouched.
   */
  const historyNav = async (delta: number): Promise<PlatformDomOpResult> => {
    const baseNav = base.historyNav;
    const viaPageHistory = async (reason: string): Promise<PlatformDomOpResult> => {
      if (typeof baseNav !== 'function') {
        return {
          ok: false,
          output: `✖ chrome back/forward 不可用：宿主页原生导航不可用（${reason}），页面上下文也未注入 historyNav`,
          error: 'historyNav not injected',
        };
      }
      const r = await baseNav.call(base, delta);
      return { ...r, output: `${r.output}\n${fallbackHistoryPathLine(reason)}` };
    };
    if (!deps.hostHistoryNav) return viaPageHistory('宿主层未注入原生导航（chrome.tabs.goBack/goForward）');
    let target: { tabId?: number; origin?: string } | undefined;
    try {
      target = deps.target();
    } catch (err) {
      return viaPageHistory(`标签页状态读取失败：${errText(err)}`);
    }
    if (!target || target.tabId === undefined) return viaPageHistory('无活跃/已绑定标签页');
    if (!isCapturableOrigin(target.origin)) {
      return viaPageHistory(`当前页面非 http(s)（${target.origin ?? '未知'}），原生导航不适用`);
    }
    let nav: HostHistoryNavResult;
    try {
      nav = await deps.hostHistoryNav(delta, target.tabId);
    } catch (err) {
      return viaPageHistory(`原生导航异常：${errText(err)}`);
    }
    if (!nav.ok) return viaPageHistory(nav.reason ?? '原生导航失败（无历史/受限页）');

    const originBefore = target.origin;
    let semantics: string;
    if (nav.originAfter === undefined) {
      semantics = '⚠ 导航后新地址不可读（无 tabs 权限/受限页）：绑定是否仍有效未知，请在面板确认当前站点。';
    } else if (originBefore && nav.originAfter !== originBefore) {
      semantics =
        `⚠ 原生 back/forward 是标签页级历史：本次已离开绑定 origin ${originBefore} → ${nav.originAfter}。` +
        '插件按 origin 绑定/授权——原 origin 的会话与站点授权不适用于新站点；插件会在导航完成后重新探测当前标签页，' +
        '已授权则自动绑定，未授权需点插件图标绑定并授权（不会静默把会话带到新站点）。';
    } else {
      semantics = `仍停留在绑定 origin（${nav.originAfter ?? originBefore}），绑定不变。`;
    }
    return {
      ok: true,
      output: `✓ 已执行原生历史导航 delta=${delta}（${delta < 0 ? 'back' : 'forward'}）。\n${nativeHistoryPathLine(delta)}\n${semantics}`,
    };
  };

  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'screenshot') return screenshot;
      if (prop === 'historyNav') return historyNav;
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Append an honest pixel-path note to a `chrome screenshot` result (D1/D2).
 *
 * For the real path we also replace the base's hard-coded「近似」claims (they
 * only describe the page-context implementation) so the output cannot contradict
 * the actual pixel source. The `approx` path keeps the base wording and only adds
 * the concrete fallback reason.
 */
export function annotateScreenshotPath(output: string, meta: ScreenshotPathMeta): string {
  if (!meta.decided) return output;
  if (meta.kind === 'fullpage') {
    const out = output
      .replace(/视口级近似截图完成/g, '整页拼接截图完成')
      .replace(
        /近似度声明（ADR-003）：[^\n]*/g,
        '像素来源（真实路径）：chrome.tabs.captureVisibleTab 逐屏捕获 + SW OffscreenCanvas 拼接（非 foreignObject/canvas 近似）',
      );
    return `${out}\n${fullpagePathLine(meta.fullpage?.screens ?? 0)}\n${FULLPAGE_LIMITATION_NOTICE}`;
  }
  if (meta.kind === 'real') {
    const out = output
      .replace(/近似截图完成/g, '真实像素截图完成（captureVisibleTab）')
      .replace(
        /近似度声明（ADR-003）：[^\n]*/g,
        '像素来源（真实路径）：chrome.tabs.captureVisibleTab 视口真实像素（外部图片/CSS 变量/滚动态保真，无 foreignObject/canvas 近似）',
      );
    return `${out}\n像素路径：真实像素（captureVisibleTab）${meta.cropped ? ' + SW 元素裁剪' : ''}`;
  }
  return `${output}\n像素路径：近似（canvas，原因：${meta.reason ?? '未知'}）`;
}

/** Convert a Blob to a base64 dataURL (SW-safe; no FileReader dependency). */
async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

/**
 * D2 default compositor — stitch the captured screens into one PNG in the SW.
 * Each screen is drawn at its **actual** settled y offset (device px), clipped to
 * the remaining canvas height so an overlapping last screen cannot overflow.
 */
export async function stitchFullpageParts(parts: FullpagePart[], layout: FullpageLayout): Promise<string> {
  if (parts.length === 0) throw new Error('无可拼接的屏（0 屏）');
  const dpr = layout.dpr > 0 ? layout.dpr : 1;
  const first = await createImageBitmap(await (await fetch(parts[0].dataUrl)).blob());
  const width = first.width;
  const height = Math.max(1, Math.round(layout.height * dpr));
  if (typeof first.close === 'function') first.close();
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2d 上下文不可用');
  for (const part of parts) {
    const bitmap = await createImageBitmap(await (await fetch(part.dataUrl)).blob());
    try {
      const dy = Math.max(0, Math.round(part.y * dpr));
      if (dy >= height) continue;
      const sh = Math.min(bitmap.height, height - dy);
      const sw = Math.min(bitmap.width, width);
      ctx.drawImage(bitmap, 0, 0, sw, sh, 0, dy, sw, sh);
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close();
    }
  }
  return await blobToDataUrl(await canvas.convertToBlob({ type: 'image/png' }));
}

/**
 * Crop a captured PNG dataURL to an element rect in the service worker.
 * `scale` is derived from the captured bitmap vs. the page viewport (robust to
 * device pixel ratio). Throws a readable error when the element is outside the
 * visible viewport (→ caller falls back honestly).
 */
export async function cropDataUrlToRect(dataUrl: string, rect: ElementRect): Promise<string> {
  const source = await fetch(dataUrl);
  const blob = await source.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = rect.viewportWidth > 0 ? bitmap.width / rect.viewportWidth : rect.dpr > 0 ? rect.dpr : 1;
    const sx = Math.max(0, Math.round(rect.x * scale));
    const sy = Math.max(0, Math.round(rect.y * scale));
    const sw = Math.min(bitmap.width - sx, Math.round(rect.width * scale));
    const sh = Math.min(bitmap.height - sy, Math.round(rect.height * scale));
    if (sw <= 0 || sh <= 0) throw new Error('目标元素不在可见视口内（裁剪区域为空）');
    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2d 上下文不可用');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    return await blobToDataUrl(await canvas.convertToBlob({ type: 'image/png' }));
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
  }
}
