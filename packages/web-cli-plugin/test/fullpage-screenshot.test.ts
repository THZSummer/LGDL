/**
 * D2 fullpage scroll-stitch + D6 native back/forward tests (base zero-change).
 *
 * Pins the discipline that cannot be verified in a plain unit test of the tool
 * face:
 *   D2 — screen count math, the 2/s rate-limit throttle, the screen/pixel upper
 *        bounds (readable refusal, zero capture), mid-way failure degradation with
 *        the captured range, and the **guaranteed scroll restoration** (including
 *        a disclosed restore failure).
 *   D6 — native `chrome.tabs.goBack/goForward` preference, the readable page
 *        `history` fallback with the concrete reason, and the honest disclosure
 *        when native navigation left the bound origin.
 *   TRANSPARENCY — only `screenshot`/`historyNav` are overridden; `waitFor` /
 *        `extractData` / `printPage` / `reloadPage` stay identical & visible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformDomOps, PlatformDomOpResult } from '@lgdl/web-cli-base';
import {
  captureFullpageViaScreens,
  createRealScreenshotOps,
  FULLPAGE_LIMITATION_NOTICE,
  MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND,
  MAX_FULLPAGE_SCREENS,
  MIN_CAPTURE_INTERVAL_MS,
  type FullpageMetrics,
  type RealScreenshotDeps,
  type ScreenshotPathMeta,
} from '../src/platform/real-screenshot.js';

const STITCHED = 'data:image/png;base64,U1RJVENIRUQ=';
const APPROX = 'data:image/png;base64,QUJD';

const METRICS: FullpageMetrics = {
  scrollWidth: 800,
  scrollHeight: 2000,
  viewportWidth: 800,
  viewportHeight: 600,
  scrollX: 0,
  scrollY: 0,
  dpr: 1,
};

interface FakeBase {
  ops: PlatformDomOps;
  readonly baseShots: number;
  readonly baseNavs: number[];
}

function fakeBaseOps(): FakeBase {
  const state = { baseShots: 0, baseNavs: [] as number[] };
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
    printPage: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'base print' }),
    reloadPage: async (): Promise<PlatformDomOpResult> => ({ ok: true, output: 'base reload' }),
    historyNav: async (delta: number): Promise<PlatformDomOpResult> => {
      state.baseNavs.push(delta);
      return { ok: true, output: `✓ 已执行会话内历史导航 delta=${delta}（${delta < 0 ? 'back' : 'forward'}；SPA 路由内可用）` };
    },
    screenshot: async (): Promise<PlatformDomOpResult> => {
      state.baseShots += 1;
      return { ok: true, output: '✓ chrome screenshot：视口级近似截图完成', dataUrl: APPROX };
    },
  } as unknown as PlatformDomOps;
  return {
    ops,
    get baseShots() {
      return state.baseShots;
    },
    get baseNavs() {
      return state.baseNavs;
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
    capture: async () => STITCHED,
    elementRect: async () => ({ ok: false, reason: 'not used' }),
    meta: meta(),
    fullpageMetrics: async () => ({ ok: true, metrics: METRICS }),
    scrollTo: async (_tabId, _x, y) => ({ ok: true, scrollX: 0, scrollY: y }),
    stitch: async () => STITCHED,
    sleep: async () => {},
    now: () => 0,
    ...overrides,
  };
}

interface Trace {
  scrolls: Array<[number, number]>;
  captures: number;
  sleeps: number[];
}

function tracedDeps(overrides: Partial<RealScreenshotDeps> = {}): { d: RealScreenshotDeps; trace: Trace } {
  const trace: Trace = { scrolls: [], captures: 0, sleeps: [] };
  const d = deps(overrides);
  const origScroll = d.scrollTo!;
  const origCapture = d.capture;
  d.scrollTo = async (tabId, x, y) => {
    trace.scrolls.push([x, y]);
    return origScroll(tabId, x, y);
  };
  d.capture = async (tabId) => {
    trace.captures += 1;
    return origCapture(tabId);
  };
  d.sleep = async (ms) => {
    trace.sleeps.push(ms);
  };
  return { d, trace };
}

// ── D2: success path, math, throttle, restore, honest limitation label ──

test('fullpage: stitches ceil(h/vh) screens, throttles to the 2/s limit, restores scroll, labels the approximation', async () => {
  const base = fakeBaseOps();
  const { d, trace } = tracedDeps();
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });

  assert.equal(res.ok, true);
  assert.equal(res.dataUrl, STITCHED);
  assert.equal(base.baseShots, 0, 'the base approximation must not run on the fullpage path');
  assert.equal(d.meta.kind, 'fullpage');
  assert.equal(d.meta.fullpageAttempt, true);
  assert.deepEqual(d.meta.fullpage, {
    screens: 4,
    width: 800,
    height: 2000,
    viewportWidth: 800,
    viewportHeight: 600,
    restored: true,
  });
  assert.equal(trace.captures, 4, 'ceil(2000/600) = 4 screens');
  assert.equal(trace.sleeps.length, 3, 'one throttle wait between each pair of captures');
  assert.deepEqual([...new Set(trace.sleeps)], [MIN_CAPTURE_INTERVAL_MS]);
  assert.equal(MIN_CAPTURE_INTERVAL_MS, 1000 / MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND);
  assert.deepEqual(trace.scrolls[0], [0, 0]);
  assert.deepEqual(trace.scrolls[trace.scrolls.length - 1], [0, 0], 'the original scroll position must be restored');
  assert.equal(trace.scrolls.length, 5, '4 screen scrolls + 1 restore');

  assert.match(res.output, /像素路径：真实像素（captureVisibleTab ×4 屏拼接）/);
  assert.ok(res.output.includes(FULLPAGE_LIMITATION_NOTICE), 'the limitation notice must be present');
  assert.match(res.output, /position:fixed \/ sticky 元素会在每屏重复出现/);
  assert.match(res.output, /懒加载内容可能尚未加载/);
  assert.match(res.output, /动画\/轮播状态在不同屏可能不一致/);
  assert.match(res.output, /非「完整\/无损」整页/);
});

test('fullpage: scroll position is restored from a non-zero original position', async () => {
  const base = fakeBaseOps();
  const { d, trace } = tracedDeps({
    fullpageMetrics: async () => ({ ok: true, metrics: { ...METRICS, scrollX: 0, scrollY: 37 } }),
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, true);
  assert.deepEqual(trace.scrolls[trace.scrolls.length - 1], [0, 37], 'restore to the captured original offset');
});

// ── D2: bounded (no unbounded grabbing) ──

test('fullpage: page taller than the screen bound is refused readably BEFORE any capture, with the range', async () => {
  const base = fakeBaseOps();
  const { d, trace } = tracedDeps({
    fullpageMetrics: async () => ({ ok: true, metrics: { ...METRICS, scrollHeight: (MAX_FULLPAGE_SCREENS + 5) * 600 } }),
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, false);
  assert.equal(trace.captures, 0, 'must not capture at all when over the screen bound');
  assert.equal(trace.scrolls.length, 0, 'must not scroll at all when over the screen bound');
  assert.match(res.output, /整页超出上限/);
  assert.match(res.output, new RegExp(`上限 ${MAX_FULLPAGE_SCREENS} 屏`));
  assert.match(res.output, /已捕获范围：0 屏（未开始捕获）/);
  assert.match(d.meta.reason ?? '', /整页超出上限/);
});

test('fullpage: over the device-pixel budget is refused readably BEFORE any capture', async () => {
  const base = fakeBaseOps();
  const { d, trace } = tracedDeps({
    fullpageMetrics: async () => ({
      ok: true,
      metrics: { ...METRICS, scrollWidth: 10000, scrollHeight: 10000, viewportWidth: 1000, viewportHeight: 600 },
    }),
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, false);
  assert.equal(trace.captures, 0);
  assert.match(res.output, /整页像素预算超限/);
  assert.match(res.output, /已捕获范围：0 屏/);
});

// ── D2: in-flight failure degradation (never silent, still restores) ──

test('fullpage: a mid-way capture failure reports the captured range and still restores the scroll', async () => {
  const base = fakeBaseOps();
  let n = 0;
  const { d, trace } = tracedDeps({
    capture: async () => {
      n += 1;
      if (n === 2) throw new Error('capture pipeline crashed');
      return STITCHED;
    },
    fullpageMetrics: async () => ({ ok: true, metrics: { ...METRICS, scrollY: 10 } }),
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, false);
  assert.equal(res.dataUrl, undefined, 'no truncated image may be returned');
  assert.match(d.meta.reason ?? '', /第 2\/4 屏捕获失败：capture pipeline crashed/);
  assert.match(res.output, /已捕获范围：1 屏/);
  assert.deepEqual(trace.scrolls[trace.scrolls.length - 1], [0, 10], 'restore still runs after a failure');
});

test('fullpage: a rate-limited screen is retried with a bounded backoff instead of failing the stitch', async () => {
  const base = fakeBaseOps();
  let n = 0;
  const { d, trace } = tracedDeps({
    capture: async () => {
      n += 1;
      if (n === 1) throw new Error('This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.');
      return STITCHED;
    },
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, true, 'a transient rate limit must not fail the whole stitch');
  assert.equal(trace.captures, 5, '1 rate-limited attempt + 4 successful screens');
  assert.ok(trace.sleeps.includes(700), `bounded backoff must be applied: ${JSON.stringify(trace.sleeps)}`);
});

test('fullpage: a restore failure is disclosed, never silent', async () => {
  const base = fakeBaseOps();
  let scrolls = 0;
  const d = deps({
    scrollTo: async (_tabId, _x, y) => {
      scrolls += 1;
      if (scrolls === 5) throw new Error('restore boom');
      return { ok: true, scrollX: 0, scrollY: y };
    },
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, true);
  assert.match(res.output, /原滚动位置恢复失败：restore boom/);
});

// ── D2: not capturable / metrics failure → readable refusal, zero capture ──

test('fullpage: an unauthorized origin is refused readably with zero capture', async () => {
  const base = fakeBaseOps();
  const { d, trace } = tracedDeps({ hasHostPermission: async () => false });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, false);
  assert.equal(trace.captures, 0);
  assert.match(res.output, /整页拼接不可用/);
  assert.match(res.output, /未授予站点访问权限/);
});

test('fullpage: a page-metrics failure degrades readably', async () => {
  const base = fakeBaseOps();
  const { d, trace } = tracedDeps({ fullpageMetrics: async () => ({ ok: false, reason: '页面已导航' }) });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.screenshot!({ mode: 'fullpage' });
  assert.equal(res.ok, false);
  assert.equal(trace.captures, 0);
  assert.match(res.output, /整页几何读取失败：页面已导航/);
});

test('captureFullpageViaScreens: missing scroll-stitch seams is a readable refusal (never throws)', async () => {
  const r = await captureFullpageViaScreens(7, {
    ...deps(),
    fullpageMetrics: undefined,
    scrollTo: undefined,
  });
  assert.equal(r.ok, false);
  assert.match(r.reason ?? '', /未注入整页几何\/滚动通道/);
});

// ── D6: native first, readable page-history fallback, origin-leave disclosure ──

test('back: native tabs.goBack runs and the output labels the native path + unchanged binding', async () => {
  const base = fakeBaseOps();
  const calls: number[] = [];
  const d = deps({
    hostHistoryNav: async (delta) => {
      calls.push(delta);
      return { ok: true, originAfter: 'https://example.com' };
    },
  });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.historyNav!(-1);
  assert.equal(res.ok, true);
  assert.deepEqual(calls, [-1]);
  assert.equal(base.baseNavs.length, 0, 'the page-context fallback must not run when native succeeds');
  assert.match(res.output, /历史路径：原生（tabs\.goBack）/);
  assert.match(res.output, /仍停留在绑定 origin（https:\/\/example\.com）/);
});

test('forward: native tabs.goForward is labelled as such', async () => {
  const base = fakeBaseOps();
  const d = deps({ hostHistoryNav: async () => ({ ok: true, originAfter: 'https://example.com' }) });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.historyNav!(1);
  assert.match(res.output, /历史路径：原生（tabs\.goForward）/);
  assert.match(res.output, /delta=1（forward）/);
});

test('back: native navigation leaving the bound origin is disclosed (no silent cross-site session)', async () => {
  const base = fakeBaseOps();
  const d = deps({ hostHistoryNav: async () => ({ ok: true, originAfter: 'https://other.example' }) });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.historyNav!(-1);
  assert.equal(res.ok, true);
  assert.match(res.output, /已离开绑定 origin https:\/\/example\.com → https:\/\/other\.example/);
  assert.match(res.output, /原 origin 的会话与站点授权不适用于新站点/);
  assert.match(res.output, /不会静默把会话带到新站点/);
});

test('back: native failure falls back to the page history with the concrete reason', async () => {
  const base = fakeBaseOps();
  const d = deps({ hostHistoryNav: async () => ({ ok: false, reason: 'Cannot find a next page in history.' }) });
  const ops = createRealScreenshotOps(base.ops, d);
  const res = await ops.historyNav!(-1);
  assert.equal(res.ok, true, 'the page-history fallback still returns the base result');
  assert.deepEqual(base.baseNavs, [-1], 'the base page history must be the fallback');
  assert.match(res.output, /历史路径：页面 history（回退，原因：Cannot find a next page in history\.）/);
});

test('back: no host nav seam / no bound tab / non-http origin all fall back readably', async () => {
  const noSeam = createRealScreenshotOps(fakeBaseOps().ops, deps({ hostHistoryNav: undefined }));
  const r1 = await noSeam.historyNav!(-1);
  assert.match(r1.output, /历史路径：页面 history（回退，原因：宿主层未注入原生导航/);

  const noTab = createRealScreenshotOps(
    fakeBaseOps().ops,
    deps({ target: () => undefined, hostHistoryNav: async () => ({ ok: true }) }),
  );
  const r2 = await noTab.historyNav!(-1);
  assert.match(r2.output, /历史路径：页面 history（回退，原因：无活跃\/已绑定标签页/);

  const restricted = createRealScreenshotOps(
    fakeBaseOps().ops,
    deps({ target: () => ({ tabId: 3, origin: 'chrome://settings' }), hostHistoryNav: async () => ({ ok: true }) }),
  );
  const r3 = await restricted.historyNav!(-1);
  assert.match(r3.output, /页面 history（回退，原因：当前页面非 http\(s\)/);
});

test('back: with no base historyNav at all the refusal is readable (never throws)', async () => {
  const ops = createRealScreenshotOps(
    { readState: async () => ({ ok: true, output: 's' }) } as unknown as PlatformDomOps,
    deps({ target: () => undefined, hostHistoryNav: undefined }),
  );
  const res = await ops.historyNav!(-1);
  assert.equal(res.ok, false);
  assert.match(res.output, /页面上下文也未注入 historyNav/);
});

// ── TRANSPARENCY ──

test('wrapper transparency: only screenshot/historyNav are overridden; waitFor/extractData/printPage/reloadPage stay identical', () => {
  const base = fakeBaseOps();
  const ops = createRealScreenshotOps(base.ops, deps());
  assert.notEqual(ops.screenshot, base.ops.screenshot);
  assert.notEqual(ops.historyNav, base.ops.historyNav);
  for (const method of ['readState', 'snapshot', 'waitFor', 'extractData', 'printPage', 'reloadPage', 'click', 'hover', 'scroll', 'zoom', 'fullscreen'] as const) {
    assert.equal(ops[method], base.ops[method], `${method} must stay identical through the wrapper`);
  }
});
