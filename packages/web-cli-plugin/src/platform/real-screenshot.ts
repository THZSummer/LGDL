/**
 * Real-pixel screenshot provider — plugin host layer (D1, base zero-change).
 *
 * WHY: the base `chrome` tool's `screenshot` runs through `env.dom.ops.screenshot`
 * — the page-context `createBrowserDomOps()` implementation, which is a
 * `foreignObject + canvas` **approximation** (external images / CSS variables /
 * scroll state are not faithful; the page world cannot reach the extension
 * surface either). The plugin is now an **extension host**, so
 * `chrome.tabs.captureVisibleTab` is available and yields **real pixels**, and an
 * already-authorized origin already holds the host permission — **zero new
 * permission**.
 *
 * This module is the plugin-side provider that wraps `env.dom.ops` (via a
 * transparent `Proxy`) and overrides only `screenshot`:
 *   - `mode=viewport` → `captureVisibleTab(windowId, {format:'png'})`.
 *   - `mode=element`  → read the target element's bounding rect from the page
 *     (the existing `dom-op` channel), then crop in the SW with
 *     `OffscreenCanvas` / `createImageBitmap`.
 *   - `mode=fullpage` → left to the base (still returns its「不支持」；D2 is a
 *     separate round — deliberately NOT implemented here).
 *
 * HONESTY (never silently claim "real"): the real path is only taken when the
 * bound tab's origin actually holds the host permission. No host permission /
 * restricted page / capture failure / rate limit → **fall back to the existing
 * page-context approximation**, and the call records the concrete reason so the
 * tool output can label which path actually ran
 * (`真实像素（captureVisibleTab）` vs `近似（canvas，原因：…）`).
 *
 * CONTRACT UNCHANGED: the result is still `PlatformDomOpResult{ok,output,dataUrl}`;
 * the output summary / auto-download chain / `--include-dataurl` / "dataURL does
 * not enter the context" policies all stay in the base `deliverScreenshot`
 * (this module only supplies the `dataUrl` + an honest path note).
 *
 * TRANSPARENCY (critical): `browser-tools.ts` decides whether to register
 * `wait` / `extract` / `export` from the *presence* of `ops.waitFor` /
 * `ops.extractData`. The wrapper is therefore a `Proxy` whose `get` delegates
 * everything except `screenshot` to the base ops, so every other method/property
 * stays visible (asserted in tests).
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

/** Which pixel path actually ran for the last screenshot call. */
export type ScreenshotPathKind = 'real' | 'approx';

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
 * Wrap `base` so only `screenshot` is overridden; every other method/property
 * (including optional `waitFor` / `extractData`) stays delegated & visible.
 */
export function createRealScreenshotOps(base: PlatformDomOps, deps: RealScreenshotDeps): PlatformDomOps {
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

    // fullpage stays with the base (its honest「不支持」；D2 is a separate round).
    if (mode === 'fullpage') {
      deps.meta.decided = false;
      return baseShot.call(base, opts);
    }

    let target: { tabId?: number; origin?: string } | undefined;
    try {
      target = deps.target();
    } catch (err) {
      return fallback(`标签页状态读取失败：${errText(err)}`);
    }
    if (!target || target.tabId === undefined) return fallback('无活跃/已绑定标签页，无法走宿主页真实像素');
    if (!isCapturableOrigin(target.origin)) return fallback(`当前页面非 http(s)（${target.origin ?? '未知'}），真实像素捕获不可用`, target.origin);

    let allowed: boolean;
    try {
      allowed = await deps.hasHostPermission(target.origin as string);
    } catch (err) {
      return fallback(`host 权限判定失败：${errText(err)}`, target.origin);
    }
    if (!allowed) return fallback(`当前站点未授予站点访问权限（${target.origin}），captureVisibleTab 不可用`, target.origin);

    let dataUrl: string;
    try {
      dataUrl = await deps.capture(target.tabId);
    } catch (err) {
      // Rate limit (MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND) / not-active / API error → readable degrade.
      return fallback(`captureVisibleTab 失败：${errText(err)}`, target.origin);
    }
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return fallback('captureVisibleTab 返回空/非法 dataURL', target.origin);
    }

    let cropped = false;
    if (mode === 'element') {
      const selector = (opts.selector ?? '').trim();
      if (!selector) return fallback('mode=element 缺少 selector', target.origin);
      let rectReply: ElementRectReply;
      try {
        rectReply = await deps.elementRect(target.tabId, selector);
      } catch (err) {
        return fallback(`元素几何读取失败：${errText(err)}`, target.origin);
      }
      if (!rectReply.ok || !rectReply.rect) return fallback(`元素几何读取失败：${rectReply.reason ?? '未知'}`, target.origin);
      const cropFn = deps.crop ?? cropDataUrlToRect;
      try {
        dataUrl = await cropFn(dataUrl, rectReply.rect);
        cropped = true;
      } catch (err) {
        return fallback(`元素裁剪失败：${errText(err)}`, target.origin);
      }
    }

    decide('real', undefined, cropped, target.origin);
    return { ok: true, output: realPathSummary(mode, cropped), dataUrl };
  };

  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'screenshot') return screenshot;
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Append an honest pixel-path note to a `chrome screenshot` result (D1).
 *
 * For the real path we also replace the base's hard-coded「近似」claims (they
 * only describe the page-context implementation) so the output cannot contradict
 * the actual pixel source. The `approx` path keeps the base wording and only adds
 * the concrete fallback reason.
 */
export function annotateScreenshotPath(output: string, meta: ScreenshotPathMeta): string {
  if (!meta.decided) return output;
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
