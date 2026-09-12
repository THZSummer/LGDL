/**
 * Real-pixel screenshot provider tests (D1, base zero-change).
 *
 * These pin the **path selection** and the **honest labeling**:
 *   - authorized origin            → captureVisibleTab real pixels (never base)
 *   - no host permission / no tab  → base canvas fallback + readable reason
 *   - restricted (non http(s))     → fallback + readable reason
 *   - capture failure (rate limit) → fallback + the concrete reason
 *   - element mode                 → rect read + SW crop
 *   - fullpage                     → left to the base (no path annotation)
 *   - TRANSPARENCY                 → every other op (waitFor/extractData/…) stays
 *                                    visible so `wait`/`extract`/`export` keep registering.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformDomOps, PlatformEnv, PlatformDomOpResult } from '@lgdl/web-cli-base';
import {
  annotateScreenshotPath,
  createRealScreenshotOps,
  isCapturableOrigin,
  SCREENSHOT_PATH_META,
  type ElementRect,
  type RealScreenshotDeps,
  type ScreenshotPathMeta,
} from '../src/platform/real-screenshot.js';
import { createExtensionBrowserEnv } from '../src/platform/browser-env.js';
import { createBrowserToolEntries } from '../src/tools/browser-tools.js';

const APPROX_DATAURL = 'data:image/png;base64,QUJD'; // "ABC"
const REAL_DATAURL = 'data:image/png;base64,UkVBTA=='; // "REAL"

interface FakeBase {
  ops: PlatformDomOps;
  baseShots: number;
}

function fakeBaseOps(): FakeBase {
  const state = { baseShots: 0 };
  const ops = {
    readState: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'state' }),
    click: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'click' }),
    hover: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'hover' }),
    scroll: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'scroll' }),
    zoom: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'zoom' }),
    fullscreen: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'fullscreen' }),
    snapshot: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'snapshot' }),
    waitFor: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'wait' }),
    extractData: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: '[]' }),
    screenshot: async (): Promise<PlatformDomOpResult> => {
      state.baseShots += 1;
      return { ok: true, output: '✓ chrome screenshot：视口级近似截图完成 · 摘要 {…}', dataUrl: APPROX_DATAURL };
    },
  } as unknown as PlatformDomOps;
  return {
    ops,
    get baseShots() {
      return state.baseShots;
    },
  };
}

function meta(): ScreenshotPathMeta {
  return { kind: 'approx', decided: false };
}

function deps(overrides: Partial<RealScreenshotDeps> = {}): RealScreenshotDeps {
  return {
    target: () => ({ tabId: 7, origin: 'https://example.com' }),
    hasHostPermission: async () => true,
    capture: async () => REAL_DATAURL,
    elementRect: async () => ({ ok: true, rect: { x: 10, y: 20, width: 100, height: 50, dpr: 1, viewportWidth: 800, viewportHeight: 600 } }),
    meta: meta(),
    ...overrides,
  };
}

test('real screenshot: authorized origin takes captureVisibleTab and never calls the base approximation', async () => {
  const base = fakeBaseOps();
  const d = deps();
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'viewport' });
  assert.equal(res.ok, true);
  assert.equal(res.dataUrl, REAL_DATAURL);
  assert.equal(base.baseShots, 0, 'base canvas path must not run on the real path');
  assert.equal(d.meta.kind, 'real');
  assert.equal(d.meta.decided, true);
  assert.match(res.output, /真实像素截图完成（captureVisibleTab）/);
});

test('real screenshot: missing host permission falls back to the base canvas path with the reason recorded', async () => {
  const base = fakeBaseOps();
  const d = deps({ hasHostPermission: async () => false });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'viewport' });
  assert.equal(res.dataUrl, APPROX_DATAURL);
  assert.equal(base.baseShots, 1);
  assert.equal(d.meta.kind, 'approx');
  assert.match(d.meta.reason ?? '', /未授予站点访问权限/);
  const labeled = annotateScreenshotPath(res.output, d.meta);
  assert.match(labeled, /像素路径：近似（canvas，原因：.*未授予站点访问权限/);
  assert.doesNotMatch(labeled, /真实像素/);
});

test('real screenshot: restricted (non http(s)) origin is refused before any capture', async () => {
  const base = fakeBaseOps();
  let captured = 0;
  const d = deps({
    target: () => ({ tabId: 3, origin: 'chrome://extensions' }),
    capture: async () => {
      captured += 1;
      return REAL_DATAURL;
    },
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'viewport' });
  assert.equal(captured, 0, 'restricted pages must not attempt a capture');
  assert.equal(d.meta.kind, 'approx');
  assert.match(d.meta.reason ?? '', /非 http\(s\)/);
  assert.equal(res.ok, true);
});

test('real screenshot: no bound tab degrades readably', async () => {
  const base = fakeBaseOps();
  const d = deps({ target: () => undefined });
  const ops = createRealScreenshotOps(base.ops, d);
  await ops.screenshot!({ mode: 'viewport' });
  assert.equal(d.meta.kind, 'approx');
  assert.match(d.meta.reason ?? '', /无活跃|已绑定/);
});

test('real screenshot: captureVisibleTab failure (rate limit) degrades readably, never silently', async () => {
  const base = fakeBaseOps();
  const d = deps({
    capture: async () => {
      throw new Error('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota exceeded');
    },
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'viewport' });
  assert.equal(base.baseShots, 1);
  assert.equal(d.meta.kind, 'approx');
  assert.match(d.meta.reason ?? '', /MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/);
  assert.match(res.output, /近似/);
});

test('real screenshot: element mode reads the rect from the page and crops in the SW', async () => {
  const base = fakeBaseOps();
  const cropCalls: Array<{ dataUrl: string; rect: ElementRect }> = [];
  const d = deps({
    elementRect: async () => ({ ok: true, rect: { x: 5, y: 6, width: 30, height: 40, dpr: 2, viewportWidth: 400, viewportHeight: 300 } }),
    crop: async (dataUrl, rect) => {
      cropCalls.push({ dataUrl, rect });
      return 'data:image/png;base64,Q1JPUA==';
    },
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'element', selector: '#chart' });
  assert.equal(res.ok, true);
  assert.equal(res.dataUrl, 'data:image/png;base64,Q1JPUA==');
  assert.equal(cropCalls.length, 1);
  assert.deepEqual(cropCalls[0]?.rect, { x: 5, y: 6, width: 30, height: 40, dpr: 2, viewportWidth: 400, viewportHeight: 300 });
  assert.equal(d.meta.cropped, true);
  assert.match(res.output, /元素级真实像素截图完成（captureVisibleTab \+ SW 元素裁剪）/);
});

test('real screenshot: element rect failure falls back with a readable reason', async () => {
  const base = fakeBaseOps();
  const d = deps({ elementRect: async () => ({ ok: false, reason: '元素不在可见视口内' }) });
  const ops = createRealScreenshotOps(base.ops, d);
  await ops.screenshot!({ mode: 'element', selector: '#chart' });
  assert.equal(base.baseShots, 1);
  assert.equal(d.meta.kind, 'approx');
  assert.match(d.meta.reason ?? '', /元素不在可见视口内/);
});

test('real screenshot: crop failure falls back rather than returning a truncated image', async () => {
  const base = fakeBaseOps();
  const d = deps({ crop: async () => { throw new Error('裁剪区域为空'); } });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'element', selector: '#chart' });
  assert.equal(res.dataUrl, APPROX_DATAURL);
  assert.match(d.meta.reason ?? '', /裁剪区域为空/);
});

test('real screenshot: fullpage without scroll-stitch seams is refused readably (D2 provider owns it, base untouched)', async () => {
  const base = fakeBaseOps();
  const d = deps();
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, false);
  assert.equal(base.baseShots, 0, 'fullpage must not fall through to the base「不支持」executor path');
  assert.equal(d.meta.kind, 'approx');
  assert.equal(d.meta.fullpageAttempt, true);
  assert.match(res.output, /整页拼接不可用/);
  assert.match(d.meta.reason ?? '', /未注入整页几何\/滚动通道/);
});

test('real screenshot: `historyNav` is overridden by the host wrapper but every other op stays identical & visible', async () => {
  const base = fakeBaseOps();
  const baseOps = base.ops as unknown as Record<string, unknown> & { historyNav?: unknown };
  baseOps.historyNav = async () => ({ ok: true, output: 'base history' });
  baseOps.printPage = async () => ({ ok: true, output: 'base print' });
  baseOps.reloadPage = async () => ({ ok: true, output: 'base reload' });
  const d = deps({ hostHistoryNav: async () => ({ ok: true, originAfter: 'https://example.com' }) });
  const ops = createRealScreenshotOps(base.ops, d);
  assert.notEqual(ops.screenshot, base.ops.screenshot);
  assert.notEqual(ops.historyNav, baseOps.historyNav, 'D6 must override historyNav');
  assert.equal(ops.printPage, baseOps.printPage, 'printPage must stay identical');
  assert.equal(ops.reloadPage, baseOps.reloadPage, 'reloadPage must stay identical');
  assert.equal(ops.waitFor, base.ops.waitFor);
  assert.equal(ops.extractData, base.ops.extractData);
  const res = await ops.historyNav!(-1);
  assert.equal(res.ok, true);
  assert.match(res.output, /历史路径：原生（tabs\.goBack）/);
});

test('real screenshot: fullpage meta reset helper keeps the annotated「近似」wording for the approx path', () => {
  const labeled = annotateScreenshotPath('base✓', { kind: 'approx', decided: true, reason: 'x' });
  assert.match(labeled, /像素路径：近似（canvas，原因：x）/);
});

test('real screenshot: TRANSPARENCY — only screenshot is overridden; every other op stays identical & visible', async () => {
  const base = fakeBaseOps();
  const ops = createRealScreenshotOps(base.ops, deps());
  assert.equal(ops.readState, base.ops.readState);
  assert.equal(ops.snapshot, base.ops.snapshot);
  assert.equal(ops.waitFor, base.ops.waitFor, 'waitFor must stay visible (wait tool registration)');
  assert.equal(ops.extractData, base.ops.extractData, 'extractData must stay visible (extract/export registration)');
  assert.notEqual(ops.screenshot, base.ops.screenshot);
  assert.equal(typeof ops.waitFor, 'function');
  assert.equal(typeof ops.extractData, 'function');
});

test('real screenshot: annotateScreenshotPath rewrites the base「近似」claims on the real path', async () => {
  const real = annotateScreenshotPath('✓ chrome screenshot：视口级近似截图完成 · 摘要 {x}\n近似度声明（ADR-003）：不保真', {
    kind: 'real',
    decided: true,
    cropped: true,
  });
  assert.match(real, /真实像素截图完成（captureVisibleTab）/);
  assert.match(real, /像素来源（真实路径）/);
  assert.match(real, /像素路径：真实像素（captureVisibleTab） \+ SW 元素裁剪/);
  assert.doesNotMatch(real, /近似截图完成/);
});

test('real screenshot: isCapturableOrigin only accepts http(s)', () => {
  assert.equal(isCapturableOrigin('https://example.com'), true);
  assert.equal(isCapturableOrigin('http://127.0.0.1:5173'), true);
  assert.equal(isCapturableOrigin('chrome://extensions'), false);
  assert.equal(isCapturableOrigin('file:///x'), false);
  assert.equal(isCapturableOrigin(undefined), false);
});

test('extension env: realScreenshot deps are used and wait/extract/export stay registered through the wrapper', async () => {
  const env = createExtensionBrowserEnv({
    currentTabId: () => 7,
    sendDomOp: async () => ({ ok: true, output: 'ok' }),
    sendFileSave: async () => ({ ok: true }),
    realScreenshot: {
      target: () => ({ tabId: 7, origin: 'https://example.com' }),
      hasHostPermission: async () => true,
      capture: async () => REAL_DATAURL,
      elementRect: async () => ({ ok: true, rect: { x: 0, y: 0, width: 10, height: 10, dpr: 1, viewportWidth: 10, viewportHeight: 10 } }),
    },
  });
  const names = createBrowserToolEntries({ env }).map((e) => e.name);
  for (const n of ['dom', 'chrome', 'wait', 'extract', 'export']) {
    assert.ok(names.includes(n), `missing tool ${n} after the screenshot wrapper`);
  }
  const res = await env.dom!.ops!.screenshot!({ mode: 'viewport' });
  assert.equal(res.dataUrl, REAL_DATAURL, 'the provider supplied the real dataURL');
  const attached = (env as unknown as Record<symbol, ScreenshotPathMeta | undefined>)[SCREENSHOT_PATH_META];
  assert.ok(attached, 'the env carries the screenshot path record');
  assert.equal(attached.kind, 'real');
});

test('extension env: without realScreenshot deps the base path is used unchanged', async () => {
  const env = createExtensionBrowserEnv({
    currentTabId: () => 7,
    sendDomOp: async (_tabId, method) => {
      if (method === 'screenshot') return { ok: true, output: 'base', dataUrl: APPROX_DATAURL };
      return { ok: true, output: 'ok' };
    },
    sendFileSave: async () => ({ ok: true }),
  });
  const res = await env.dom!.ops!.screenshot!({ mode: 'viewport' });
  assert.equal(res.dataUrl, APPROX_DATAURL);
});

test('extension env: fullpage is delivered through the host wrapper with the honest limitation label + native back/forward', async () => {
  const saves: string[] = [];
  const env = createExtensionBrowserEnv({
    currentTabId: () => 7,
    sendDomOp: async () => ({ ok: true, output: 'ok' }),
    sendFileSave: async (_tabId, filename) => {
      saves.push(filename);
      return { ok: true };
    },
    realScreenshot: {
      target: () => ({ tabId: 7, origin: 'https://example.com' }),
      hasHostPermission: async () => true,
      capture: async () => 'data:image/png;base64,QUJD',
      elementRect: async () => ({ ok: false, reason: 'n/a' }),
      fullpageMetrics: async () => ({
        ok: true,
        metrics: { scrollWidth: 800, scrollHeight: 2000, viewportWidth: 800, viewportHeight: 600, scrollX: 0, scrollY: 0, dpr: 1 },
      }),
      scrollTo: async (_tabId, _x, y) => ({ ok: true, scrollX: 0, scrollY: y }),
      stitch: async () => 'data:image/png;base64,U1RJVA==',
      sleep: async () => {},
      now: () => 0,
      hostHistoryNav: async () => ({ ok: true, originAfter: 'https://example.com' }),
    },
  });
  const chrome = createBrowserToolEntries({ env }).find((e) => e.name === 'chrome');
  assert.ok(chrome, 'chrome entry must exist');

  const shot = await chrome!.executor(
    { id: 't', name: 'chrome', subcommand: 'screenshot', args: { mode: 'fullpage' } } as never,
    {} as never,
  );
  assert.equal(shot.ok, true);
  assert.match(shot.output, /整页拼接截图完成/);
  assert.match(shot.output, /像素路径：真实像素（captureVisibleTab ×4 屏拼接）/);
  assert.match(shot.output, /position:fixed \/ sticky 元素会在每屏重复出现/);
  assert.ok(saves.some((f) => f.includes('screenshot-fullpage')), 'the stitched image must go through the download chain');

  const back = await chrome!.executor(
    { id: 't', name: 'chrome', subcommand: 'back', args: {} } as never,
    {} as never,
  );
  assert.equal(back.ok, true);
  assert.match(back.output, /历史路径：原生（tabs\.goBack）/);
});
