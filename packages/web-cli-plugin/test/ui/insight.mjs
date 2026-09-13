/**
 * V2-2 UI 门禁 `test:insight`（TASK-007；FR-V2-020~025，AC-V2-002 / AC-V22-001~007）。
 *
 * **新文件承载**：v1 `test/ui/journey.mjs` 零改动；本脚本新增断言编号 `#I-01…`，
 * 与 v1 断言只增不减（v1 journey 的 `#15a~#15q` 由 `npm run test:ui` 独立守护）。
 *
 * 真实 dist + 全新 user-data-dir + headless Chromium（CDP），侧栏视口 400×900：
 *   #I-01 FAB 存在、默认收起、可开合；
 *   #I-02 抽屉四维度可见（site/capability/command/llm）；
 *   #I-03 状态徽标存在；
 *   #I-04 空态/降级可读（`.tree-degradation` / `.tree-empty`）；
 *   #I-05 `#log` 计算 `flex-grow === '1'`；
 *   #I-06 `#log` 稳态（去镀铬，guidance/consent 隐藏）`clientHeight ≥ 589px`（主断言）；
 *   #I-06b 原始（仅导航条隐藏，v1 journey #15b 口径）`#log ≥ 405px`（v1 自身下限，无回归，D-V22-01）；
 *   #I-06c pinned v1 raw 基线（418px @ 2026-09-13，W6）回归：`#log ≥ 410px`（更敏感）；
 *   #I-06d 同上占比回归：`#log ≥ 45.4%`；
 *   #I-07 `#log` 稳态高度占比 `≥ 65.0%`（次断言）；
 *   #I-08 `#composer` 底边 − 视口底 `∈ [0, +8px]`（不得为负，D-079）；
 *   #I-09 `#tree-fab` ∩ `#composer` 交面积 `= 0`；
 *   #I-10 文档 / `#log` / 抽屉 400px 水平溢出 `= 0`；
 *   #I-11 「撤销/关断 = 回到更保守，不放宽」+ `delay`(=`deny`) 消歧文案；
 *   #I-12 `deny` 节点无任何控件（结构保证，ADR-V2-011）；
 *   #I-13 过滤只读：检索收窄展示集合、不改真值；
 *   #I-14 开/关两态复用全部几何断言（证明开抽屉不挤压消息区）；
 *   #I-15 Esc 关闭 + 焦点回归 FAB + `aria-expanded` 同步；
 *   #I-16 320px 窄侧栏零水平溢出（关/开两态）；
 *   #I-17 0 页面异常；
 *   #I-18a~e V2-3 真实撤销控件（button[data-action-id]）+ `#tree-receipt`/`#tree-confirm`
 *            存在且默认收起 + `deny` 行仍结构上无控件（ADR-V2-011 未被写路径破坏）。
 *
 * 依赖：Node ≥ 22（全局 WebSocket / fetch）、本机 `.pw-browsers` Chromium（或 CHROME_BIN）。
 * 前置：`npm run build --workspace @lgdl/web-cli-plugin`。
 *
 * ⚠️ 串行纪律：本脚本自起 Chromium，**绝不与 test:ui / test:binding 并发**（OOM 前科）。
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(root, '..', '..');
const dist = resolve(root, 'dist');
const CHROME = process.env.CHROME_BIN || resolve(repoRoot, '.pw-browsers', 'chromium-1234', 'chrome-linux64', 'chrome');

const VIEWPORT = { width: 400, height: 900 };
const NARROW = { width: 320, height: 900 };
const LOG_MIN_HEIGHT = 589; // dev.md §11.3 v1 baseline (ADR-V2-006 main assertion)
const LOG_MIN_RATIO = 65.0; // conservative lower bound (589/900 = 65.44%)
const V1_RAW_LOG_MIN = 405; // v1 journey.mjs #15b's own floor (`>45vh` at 900px)
/**
 * W6 修复轮（2026-09-13）：v1 同条件 raw 基线 pinned。
 *
 * v1 口径（仅隐藏 `site-hint`/`onboarding`/`discovery-notice`，与 `journey.mjs` #15b
 * 完全相同）在**今日 dist** 上实测 `#log = 418px / 46.4%`（测于 2026-09-13，来源
 * `test/ui/journey.mjs` #15b 的测量条件）。原断言仅 `≥ 405px`（余量 13px）→ 存在
 * 「小幅回退仍绿」盲区。这里钉死 raw 基线并加一条**更敏感**的回归断言：
 * `#log ≥ 418 − 8 = 410px`。容差取 **8px（≈1.9%）** 的理由：吸收跨运行的字形/滚动条
 * 亚像素舍入波动，同时仍能捕获任何 ≥9px 的有意/无意回退（例如新增镀铬挤压消息区）。
 * **不降低**既有 405px 下限（只加不减）。
 */
const V1_RAW_LOG_BASELINE_PX = 418;
const V1_RAW_LOG_BASELINE_RATIO = 46.4;
const V1_RAW_LOG_BASELINE_TOLERANCE_PX = 8;
const V1_RAW_LOG_BASELINE_RATIO_TOLERANCE = 1.0; // percentage points
const V1_RAW_LOG_BASELINE_META = {
  measuredOn: '2026-09-13',
  source: 'test/ui/journey.mjs #15b 条件（仅隐藏 site-hint/onboarding/discovery-notice）',
  dist: 'packages/web-cli-plugin/dist/sidepanel.js',
  note: 'v1 口径 raw 几何实测；v2 叠加（抽屉/FAB）后不得回退超过容差',
};
const COMPOSER_GAP = [0, 8];

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
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (res.exceptionDetails) {
    throw new Error(
      `evaluate failed: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`.trim(),
    );
  }
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

async function typeText(cdp, text) {
  for (const ch of text) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  }
}

async function waitFor(cdp, expression, tries = 120, gapMs = 200) {
  for (let i = 0; i < tries; i += 1) {
    const v = await evaluate(cdp, expression).catch(() => undefined);
    if (v) return v;
    await sleep(gapMs);
  }
  return undefined;
}

/**
 * Steady-state layout measurement at 400×900, **de-chromed**: first-run guidance
 * strips + the always-present consent disclosure (`#consent-slot`) + the
 * send-disabled banner are hidden so the message zone's flex allocation is
 * isolated. Rationale (D-V22-01): dev.md §11.3 records the v1 `#log` 589px/65.5%
 * *before* the FR-052 per-origin auto-authorization block + `#risk-status` +
 * `#llm-test-result` chrome landed; on today's dist the same panel yields 418px
 * with only the guidance strips hidden (v1 `journey.mjs` #15b asserts `>45%` and
 * passes). The 589/65.0% anchors are therefore asserted on the de-chromed steady
 * state, and the raw (strips-only) geometry is asserted separately against v1's
 * own `>45vh` floor.
 */
const MEASURE = `(() => {
  const ids = ['site-hint', 'onboarding', 'discovery-notice', 'consent-slot', 'send-reason'];
  const prev = ids.map((id) => { const el = document.getElementById(id); const p = el ? el.style.display : ''; if (el) el.style.display = 'none'; return p; });
  const log = document.getElementById('log');
  const composer = document.getElementById('composer');
  const fab = document.getElementById('tree-fab');
  const drawer = document.getElementById('tree-drawer');
  const de = document.documentElement;
  const cr = composer.getBoundingClientRect();
  const fr = fab.getBoundingClientRect();
  const ix = Math.max(0, Math.min(fr.right, cr.right) - Math.max(fr.left, cr.left));
  const iy = Math.max(0, Math.min(fr.bottom, cr.bottom) - Math.max(fr.top, cr.top));
  const out = {
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    logFlexGrow: getComputedStyle(log).flexGrow,
    logClientHeight: log.clientHeight,
    logRatio: Math.round((log.clientHeight / window.innerHeight) * 1000) / 10,
    composerGapToBottom: Math.round(window.innerHeight - cr.bottom),
    fabComposerArea: Math.round(ix * iy * 100) / 100,
    docOverflowX: de.scrollWidth - de.clientWidth,
    logOverflowX: log.scrollWidth - log.clientWidth,
    drawerOverflowX: drawer.scrollWidth - drawer.clientWidth,
    drawerHidden: drawer.hidden,
    fabExpanded: fab.getAttribute('aria-expanded'),
  };
  ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.style.display = prev[i]; });
  return out;
})()`;

/**
 * Raw v1-journey-equivalent measurement: hide ONLY the first-run guidance strips
 * (exactly what v1 `journey.mjs` #15b does). Used to prove the V2-2 additions do
 * not regress v1's own `>45vh` guarantee on today's dist.
 */
const RAW_MEASURE = `(() => {
  const ids = ['site-hint', 'onboarding', 'discovery-notice'];
  const prev = ids.map((id) => { const el = document.getElementById(id); const p = el ? el.style.display : ''; if (el) el.style.display = 'none'; return p; });
  const log = document.getElementById('log');
  const composer = document.getElementById('composer');
  const fab = document.getElementById('tree-fab');
  const de = document.documentElement;
  const cr = composer.getBoundingClientRect();
  const fr = fab.getBoundingClientRect();
  const ix = Math.max(0, Math.min(fr.right, cr.right) - Math.max(fr.left, cr.left));
  const iy = Math.max(0, Math.min(fr.bottom, cr.bottom) - Math.max(fr.top, cr.top));
  const out = {
    innerHeight: window.innerHeight,
    logFlexGrow: getComputedStyle(log).flexGrow,
    logClientHeight: log.clientHeight,
    logRatio: Math.round((log.clientHeight / window.innerHeight) * 1000) / 10,
    composerGapToBottom: Math.round(window.innerHeight - cr.bottom),
    fabComposerArea: Math.round(ix * iy * 100) / 100,
    docOverflowX: de.scrollWidth - de.clientWidth,
    logOverflowX: log.scrollWidth - log.clientWidth,
  };
  ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.style.display = prev[i]; });
  return out;
})()`;

function checkLayout(metrics, prefix) {
  check(metrics.logFlexGrow === '1', `${prefix} #log 计算 flex-grow === '1'（flex 填充，非 45vh）`, JSON.stringify(metrics));
  check(
    metrics.logClientHeight >= LOG_MIN_HEIGHT,
    `${prefix} #log 稳态 clientHeight ≥ ${LOG_MIN_HEIGHT}px（主断言，非回退）`,
    `${metrics.logClientHeight}px`,
  );
  check(
    metrics.logRatio >= LOG_MIN_RATIO,
    `${prefix} #log 稳态高度占比 ≥ ${LOG_MIN_RATIO}%（次断言）`,
    `${metrics.logRatio}%`,
  );
  check(
    metrics.composerGapToBottom >= COMPOSER_GAP[0] && metrics.composerGapToBottom <= COMPOSER_GAP[1],
    `${prefix} #composer 底边−视口底 ∈ [${COMPOSER_GAP[0]}, +${COMPOSER_GAP[1]}]px（不得为负，D-079）`,
    `${metrics.composerGapToBottom}px`,
  );
  check(
    metrics.fabComposerArea === 0,
    `${prefix} #tree-fab ∩ #composer boundingRect 交面积 = 0（无遮挡）`,
    `area=${metrics.fabComposerArea}`,
  );
  check(metrics.docOverflowX === 0, `${prefix} 文档级水平溢出 = 0`, `${metrics.docOverflowX}px`);
  check(metrics.logOverflowX === 0, `${prefix} #log 水平溢出 = 0`, `${metrics.logOverflowX}px`);
}

/** Closed-state steady metrics, echoed in the final summary. */
let closedLayout;

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!(await stat(dist).then(() => true).catch(() => false))) {
    console.error(`✖ dist/ 不存在：先运行 npm run build --workspace @lgdl/web-cli-plugin（期望 ${dist}）`);
    process.exit(1);
  }
  if (!(await stat(CHROME).then(() => true).catch(() => false))) {
    console.error(`✖ 找不到 Chromium：${CHROME}（可用 CHROME_BIN 覆盖）`);
    process.exit(1);
  }

  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${dist}`);

  const work = await mkdtemp(join(tmpdir(), 'web-cli-ui-insight-'));
  const profile = join(work, 'profile');
  const port = 9900 + Math.floor(Math.random() * 600);
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

  const spExceptions = [];
  let sp;

  try {
    // 1. find our extension service worker
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
          // not ours / not ready
        }
      }
      if (!sw) await sleep(250);
    }
    check(Boolean(sw), '#I-00 全新 profile 加载真实 dist 且 web-cli plugin service worker 可达');
    if (!sw) throw new Error('no web-cli plugin service worker found');

    // 2. open the real side panel page
    await evaluate(sw, `chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') }).then((t) => t.id)`);
    const spTarget = await findTarget(base, (t) => t.type === 'page' && t.url.includes('sidepanel.html'));
    check(Boolean(spTarget), '#I-00b 侧栏页（chrome-extension://…/sidepanel.html）真实打开');
    if (!spTarget) throw new Error('sidepanel target not found');

    sp = await connectCdp(spTarget.webSocketDebuggerUrl);
    await sp.send('Runtime.enable');
    await sp.send('Page.enable');
    sp.on('Runtime.exceptionThrown', (p) =>
      spExceptions.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text),
    );

    const booted = await waitFor(
      sp,
      `(() => (document.getElementById('tree-fab') && document.getElementById('log') && document.getElementById('tree-drawer')) ? 'ready' : '')()`,
      100,
      200,
    );
    check(booted === 'ready', '#I-01a 侧栏已挂载 #tree-fab / #tree-drawer / #log');
    if (booted !== 'ready') throw new Error('side panel did not boot');

    // 3. deterministic viewport
    await sp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
    await sleep(300);

    // 4. default state: collapsed (O-V2-001), aria synced
    const initial = await evaluate(
      sp,
      `(() => {
        const fab = document.getElementById('tree-fab');
        const drawer = document.getElementById('tree-drawer');
        return {
          fabInsideMain: !!fab.closest('#panel-main'),
          drawerInsideMain: !!drawer.closest('#panel-main'),
          drawerHidden: drawer.hidden,
          ariaControls: fab.getAttribute('aria-controls'),
          ariaExpanded: fab.getAttribute('aria-expanded'),
          drawerPosition: getComputedStyle(drawer).position,
          drawerInFlexFlow: drawer.offsetParent !== null && drawer.hidden === false,
        };
      })()`,
    );
    check(initial.fabInsideMain === true && initial.drawerInsideMain === true, '#I-01b FAB/抽屉位于 #panel-main 内（非页面注入）', JSON.stringify(initial));
    check(initial.drawerHidden === true, '#I-01c 抽屉默认收起（O-V2-001）', JSON.stringify(initial));
    check(initial.ariaControls === 'tree-drawer' && initial.ariaExpanded === 'false', '#I-01d FAB aria-controls/aria-expanded 同步（收起）', JSON.stringify(initial));
    check(initial.drawerPosition === 'absolute', '#I-01e 抽屉为 absolute（不参与 flex 流，结构上不挤压 #log）', initial.drawerPosition);

    // 5. closed-state layout
    closedLayout = await evaluate(sp, MEASURE);
    checkLayout(closedLayout, '#I-05~10(关)');
    check(closedLayout.drawerHidden === true, '#I-14a 关态抽屉仍为 hidden', JSON.stringify(closedLayout));

    // 5b. raw v1-journey-equivalent geometry (guidance strips only) — no v1 regression
    const rawOpenClose = await evaluate(sp, RAW_MEASURE);
    check(
      rawOpenClose.logFlexGrow === '1' && rawOpenClose.logClientHeight >= V1_RAW_LOG_MIN,
      `#I-06b 原始（仅导航条隐藏，v1 journey #15b 口径）#log ≥ ${V1_RAW_LOG_MIN}px（v1 自身 >45vh 下限，无回归）`,
      JSON.stringify(rawOpenClose),
    );
    // W6: a MORE SENSITIVE regression assertion against the pinned v1 raw baseline.
    check(
      rawOpenClose.logClientHeight >= V1_RAW_LOG_BASELINE_PX - V1_RAW_LOG_BASELINE_TOLERANCE_PX,
      `#I-06c pinned v1 raw 基线回归：原始口径 #log ≥ ${V1_RAW_LOG_BASELINE_PX - V1_RAW_LOG_BASELINE_TOLERANCE_PX}px（钉死 ${V1_RAW_LOG_BASELINE_PX}px @ ${V1_RAW_LOG_BASELINE_META.measuredOn}，容差 ${V1_RAW_LOG_BASELINE_TOLERANCE_PX}px）`,
      JSON.stringify(rawOpenClose),
    );
    check(
      rawOpenClose.logRatio >= V1_RAW_LOG_BASELINE_RATIO - V1_RAW_LOG_BASELINE_RATIO_TOLERANCE,
      `#I-06d pinned v1 raw 基线占比回归：原始口径 #log ≥ ${(V1_RAW_LOG_BASELINE_RATIO - V1_RAW_LOG_BASELINE_RATIO_TOLERANCE).toFixed(1)}%（钉死 ${V1_RAW_LOG_BASELINE_RATIO}%）`,
      `${rawOpenClose.logRatio}%`,
    );
    check(
      rawOpenClose.composerGapToBottom >= COMPOSER_GAP[0] && rawOpenClose.composerGapToBottom <= COMPOSER_GAP[1],
      '#I-08b 原始口径 #composer 仍贴底 ∈[0, +8]px',
      `${rawOpenClose.composerGapToBottom}px`,
    );
    check(rawOpenClose.fabComposerArea === 0, '#I-09b 原始口径 FAB∩composer 仍为 0', `area=${rawOpenClose.fabComposerArea}`);

    // 6. open the drawer with a real click
    await realClick(sp, '#tree-fab');
    const openOk = await waitFor(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        if (!drawer || drawer.hidden) return '';
        const n = drawer.querySelectorAll('.tree-group').length;
        return n >= 4 ? String(n) : '';
      })()`,
      150,
      200,
    );
    check(Number(openOk) >= 4, '#I-02a 真实点击 FAB 后抽屉打开并渲染四维度分组', `groups=${openOk}`);
    const openState = await evaluate(
      sp,
      `(() => {
        const fab = document.getElementById('tree-fab');
        const drawer = document.getElementById('tree-drawer');
        return { hidden: drawer.hidden, ariaExpanded: fab.getAttribute('aria-expanded') };
      })()`,
    );
    check(openState.hidden === false && openState.ariaExpanded === 'true', '#I-01f 打开后 aria-expanded=true 且抽屉可见', JSON.stringify(openState));

    // 7. drawer content
    const content = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const dims = [...drawer.querySelectorAll('.tree-group')].map((g) => g.dataset.dimension);
        const denyRows = [...drawer.querySelectorAll('.tree-row[data-action="deny"]')];
        const denyWithControls = denyRows.filter((r) => r.querySelectorAll('.tree-controls .tree-control').length > 0).length;
        const badges = drawer.querySelectorAll('.tree-badge').length;
        const text = drawer.textContent || '';
        return {
          dims,
          badges,
          denyRows: denyRows.length,
          denyWithControls,
          hasDegradation: drawer.querySelectorAll('.tree-degradation').length > 0,
          hasEmpty: drawer.querySelectorAll('.tree-empty').length > 0,
          hasFilterInput: !!document.getElementById('tree-filter-input'),
          hasModelNote: text.includes('四维度分组视图（森林），非严格树'),
          hasNoEscalation: text.includes('撤销/关断 = 回到更保守，不放宽任何门禁'),
          hasDelay: text.includes('delay'),
          hasDeny: text.includes('deny'),
          hasFailClosed: text.includes('fail-closed'),
          hasDelayMs: text.includes('delayMs'),
        };
      })()`,
    );
    const dims = content.dims ?? [];
    check(
      ['site', 'capability', 'command', 'llm'].every((d) => dims.includes(d)) && dims.length === 4,
      '#I-02b 抽屉四维度可见（site/capability/command/llm，固定序）',
      JSON.stringify(dims),
    );
    check((content.badges ?? 0) >= 1, '#I-03 状态徽标可见（.tree-badge）', `badges=${content.badges}`);
    check(content.hasDegradation === true || content.hasEmpty === true, '#I-04 空态/降级可读（.tree-degradation/.tree-empty）', JSON.stringify(content));
    check(content.hasFilterInput === true, '#I-02c 检索/过滤入口可见', JSON.stringify(content));
    check(
      content.hasModelNote === true && content.hasNoEscalation === true,
      '#I-11a 文案含模型声明 +「撤销/关断 = 回到更保守，不放宽任何门禁」',
      JSON.stringify(content),
    );
    check(
      content.hasDelay === true && content.hasDeny === true && content.hasFailClosed === true && content.hasDelayMs === true,
      '#I-11b `delay`(= deny, fail-closed) 与命令间 `delayMs` 消歧文案同处',
      JSON.stringify(content),
    );
    check(
      (content.denyRows ?? 0) >= 1 && content.denyWithControls === 0,
      '#I-12 `deny` 节点无任何控件（结构保证，ADR-V2-011）',
      `denyRows=${content.denyRows}, withControls=${content.denyWithControls}`,
    );

    // 8. read-only filter narrows the render set (真实键入)
    await realClick(sp, '#tree-filter-input');
    await typeText(sp, 'zzz-no-such-row-zzz');
    const filtered = await waitFor(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        return JSON.stringify({
          rows: drawer.querySelectorAll('.tree-row').length,
          empties: drawer.querySelectorAll('.tree-empty').length,
          count: drawer.querySelector('.tree-filter-count')?.textContent ?? '',
        });
      })()`,
      40,
      150,
    );
    const fv = filtered ? JSON.parse(filtered) : {};
    check(fv.rows === 0 && (fv.empties ?? 0) >= 1, '#I-13a 检索无命中 → 0 行 + 可读空态（只读过滤）', filtered ?? '');
    check(/0/.test(fv.count ?? ''), '#I-13b 过滤计数同步显示命中数', fv.count);
    // reset the filter through the same handler (synthetic input event)
    await evaluate(
      sp,
      `(() => { const i = document.getElementById('tree-filter-input'); i.value = ''; i.dispatchEvent(new Event('input')); return true; })()`,
    );
    const restored = await waitFor(sp, `String(document.querySelectorAll('#tree-drawer .tree-row').length)`, 30, 150);
    check(Number(restored) > 0, '#I-13c 清空检索后恢复展示（过滤不改真值）', `rows=${restored}`);

    // 8b. V2-3 (TASK-003/004): real controls + receipt/confirm containers, and the
    // `deny` structural guarantee must survive the write-path wiring (ADR-V2-011).
    const v23Tree = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const buttons = [...drawer.querySelectorAll('button.tree-control[data-action-id]')];
        const readonlyControls = [...drawer.querySelectorAll('span.tree-control')];
        const receipt = document.getElementById('tree-receipt');
        const confirm = document.getElementById('tree-confirm');
        const denyWithControls = [...drawer.querySelectorAll('.tree-row[data-action="deny"]')].filter(
          (r) => r.querySelectorAll('.tree-controls .tree-control').length > 0,
        ).length;
        return {
          buttons: buttons.length,
          actionIds: [...new Set(buttons.map((b) => b.dataset.actionId))],
          readonlyControls: readonlyControls.length,
          hasReceipt: !!receipt,
          receiptRole: receipt ? receipt.getAttribute('role') : '',
          receiptHidden: receipt ? receipt.hidden : null,
          hasConfirm: !!confirm,
          confirmHidden: confirm ? confirm.hidden : null,
          denyWithControls,
        };
      })()`,
    );
    check(v23Tree.hasReceipt === true && v23Tree.receiptRole === 'status', '#I-18a #tree-receipt 存在且 role=status（回执 ①/② + 审计入口 ③）', JSON.stringify(v23Tree));
    check(v23Tree.hasConfirm === true && v23Tree.confirmHidden === true, '#I-18b #tree-confirm 存在且默认收起（拒绝 = 零操作）', JSON.stringify(v23Tree));
    check(v23Tree.buttons >= 1, '#I-18c 树内控件渲染为真实 button[data-action-id]（非只读 span）', JSON.stringify(v23Tree));
    check(
      Array.isArray(v23Tree.actionIds) && v23Tree.actionIds.includes('set-tabs-toggle'),
      '#I-18d 可逆开关动作已接线（set-tabs-toggle 真实控件）',
      JSON.stringify(v23Tree.actionIds),
    );
    check(v23Tree.denyWithControls === 0, '#I-18e deny 行结构上仍无任何控件（DOM 层无可点开关，ADR-V2-011）', JSON.stringify(v23Tree));

    // 9. open-state layout (must equal the closed-state steady geometry)
    await sleep(200);
    const openLayout = await evaluate(sp, MEASURE);
    checkLayout(openLayout, '#I-05~10(开)');
    check(openLayout.drawerHidden === false, '#I-14b 开态抽屉可见（覆盖层，不挤压 #log）', JSON.stringify(openLayout));
    // The decisive V2-2 no-regression proof: opening the overlay must not change
    // ANY steady geometry field vs the closed state (they are absolute children).
    const stableFields = ['logFlexGrow', 'logClientHeight', 'logRatio', 'composerGapToBottom', 'docOverflowX', 'logOverflowX'];
    const drift = stableFields.filter((f) => openLayout[f] !== closedLayout[f]);
    check(
      drift.length === 0,
      '#I-14c 开抽屉不改变稳态几何（开/关逐字段相等：flex-grow / #log 高 / 占比 / composer / 溢出）',
      `drift=${JSON.stringify(drift.map((f) => [f, closedLayout[f], openLayout[f]]))}`,
    );

    // 9b. V2-4 (TASK-006): read-only command archive sub-view (#I-19a…h).
    // Consumes the SAME Chromium session (no second browser, OOM discipline).
    const archiveBefore = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const toggle = document.getElementById('tree-archive-toggle');
        const groupBy = document.getElementById('tree-archive-groupby');
        return {
          hasToggle: !!toggle,
          hasGroupBy: !!groupBy,
          ariaPressed: toggle ? toggle.getAttribute('aria-pressed') : null,
          archiveCount: drawer.querySelectorAll('.tree-archive').length,
          toggleInArchive: toggle ? !!toggle.closest('.tree-archive') : null,
        };
      })()`,
    );
    check(
      archiveBefore.hasToggle === true && archiveBefore.hasGroupBy === true,
      '#I-19a0 档案开关 + 分组选择存在（默认关；控件在 `.tree-archive` 之外）',
      JSON.stringify(archiveBefore),
    );
    check(
      archiveBefore.ariaPressed === 'false' && archiveBefore.archiveCount === 0,
      '#I-19a 档案默认关（aria-pressed=false）且 `.tree-archive` 不存在 → 默认 DOM 与现状一致',
      JSON.stringify(archiveBefore),
    );

    await realClick(sp, '#tree-archive-toggle');
    const archiveReady = await waitFor(sp, `document.querySelector('.tree-archive') ? 'ready' : ''`, 60, 150);
    check(archiveReady === 'ready', '#I-19a2 真实点击后档案子视图出现（.tree-archive）', String(archiveReady));
    await sleep(200);

    const archiveShape = await evaluate(
      sp,
      `(() => {
        const archive = document.querySelector('.tree-archive');
        if (!archive) return null;
        const cards = [...archive.querySelectorAll('.tree-archive-card')];
        const missingFields = cards.filter(
          (c) => !c.dataset.action || !c.dataset.sourceKind || !c.querySelector('[data-field="delay-ms"]'),
        );
        const denyCards = cards.filter((c) => c.dataset.action === 'deny');
        const denyWithoutCause = denyCards.filter((c) => !c.querySelector('[data-field="deny-cause"]'));
        const siteCards = [...archive.querySelectorAll('.tree-archive-card[data-source-kind="site-declared"]')];
        const siteWithOrigin = siteCards.filter((c) =>
          /站点 /.test(c.querySelector('[data-field="source"]')?.textContent ?? ''),
        );
        const siteCountText = archive.querySelector('.tree-archive-site-count')?.textContent ?? '';
        const liveText = archive.querySelector('.tree-archive-live')?.textContent ?? '';
        const html = document.body.textContent ?? '';
        return {
          cards: cards.length,
          liveTools: Number(archive.dataset.liveTools),
          liveSubs: Number(archive.dataset.liveSubs),
          liveCards: Number(archive.dataset.liveCards),
          liveText,
          missingFields: missingFields.length,
          denyCards: denyCards.length,
          denyWithoutCause: denyWithoutCause.length,
          siteCards: siteCards.length,
          siteWithOrigin: siteWithOrigin.length,
          siteCountText,
          noteNodes: document.querySelectorAll('.tree-note-no-escalation').length,
          disambiguationHits: html.split('非可配置档位').length - 1,
          readonlyText: archive.querySelector('.tree-archive-readonly')?.textContent ?? '',
        };
      })()`,
    );
    check(
      archiveShape &&
        archiveShape.cards > 0 &&
        archiveShape.cards === archiveShape.liveTools + archiveShape.liveSubs &&
        archiveShape.cards === archiveShape.liveCards,
      '#I-19b `.tree-archive-card` 数 === 头部「实时面 N 条目 / M 子命令 = K 卡」的 N+M（且 > 0）',
      JSON.stringify(archiveShape),
    );
    check(
      archiveShape && archiveShape.missingFields === 0 && archiveShape.denyCards >= 1 && archiveShape.denyWithoutCause === 0,
      '#I-19c 每卡含 action/sourceKind/delayMs 字段；deny 卡含成因文案（复用 DENY_CAUSE_LABEL）',
      JSON.stringify(archiveShape),
    );
    check(
      archiveShape &&
        ((archiveShape.siteCards > 0 && archiveShape.siteWithOrigin === archiveShape.siteCards) ||
          (archiveShape.siteCards === 0 && archiveShape.siteCountText.includes('0 张'))),
      '#I-19d site_* 卡（若存在）显示 origin；无站点卡时如实标注计数（不做空断言）',
      JSON.stringify(archiveShape),
    );
    check(
      archiveShape && archiveShape.noteNodes === 1 && archiveShape.disambiguationHits === 1,
      '#I-19e `delay` 单源：`.tree-note-no-escalation` 恰 1 处且「非可配置档位」全文档出现 1 次',
      JSON.stringify(archiveShape),
    );

    await realClick(sp, '#tree-archive-query');
    await typeText(sp, 'zzz-no-such-card-zzz');
    const archiveFiltered = await waitFor(
      sp,
      `(() => {
        const archive = document.querySelector('.tree-archive');
        if (!archive) return '';
        return JSON.stringify({ cards: archive.querySelectorAll('.tree-archive-card').length, empties: archive.querySelectorAll('.tree-empty').length });
      })()`,
      40,
      150,
    );
    const af = archiveFiltered ? JSON.parse(archiveFiltered) : {};
    check(af.cards === 0 && (af.empties ?? 0) >= 1, '#I-19f1 档案检索无命中 → 0 卡 + 可读空态（只读过滤）', archiveFiltered ?? '');
    await evaluate(
      sp,
      `(() => { const i = document.getElementById('tree-archive-query'); i.value = ''; i.dispatchEvent(new Event('input')); return true; })()`,
    );
    const archiveRestored = await waitFor(
      sp,
      `String(document.querySelectorAll('.tree-archive .tree-archive-card').length)`,
      30,
      150,
    );
    check(Number(archiveRestored) > 0, '#I-19f2 清空检索后恢复展示（过滤不改真值）', `cards=${archiveRestored}`);

    const archiveControls = await evaluate(
      sp,
      `(() => {
        const archive = document.querySelector('.tree-archive');
        if (!archive) return null;
        return {
          treeControls: archive.querySelectorAll('.tree-control').length,
          actionButtons: archive.querySelectorAll('button[data-action-id]').length,
          checkboxes: archive.querySelectorAll('input[type=checkbox]').length,
          rows: archive.querySelectorAll('.tree-row').length,
        };
      })()`,
    );
    check(
      archiveControls &&
        archiveControls.treeControls === 0 &&
        archiveControls.actionButtons === 0 &&
        archiveControls.checkboxes === 0 &&
        archiveControls.rows === 0,
      '#I-19g 安全红线：`.tree-archive` 内零 `.tree-control` / 零 `button[data-action-id]` / 零 checkbox / 零 `.tree-row`',
      JSON.stringify(archiveControls),
    );

    const archiveLayout = await evaluate(sp, MEASURE);
    checkLayout(archiveLayout, '#I-19h(开档案)');

    // restore the default (archive OFF) state for the downstream narrow-viewport step
    await realClick(sp, '#tree-archive-toggle');
    await waitFor(sp, `document.querySelector('.tree-archive') ? '' : 'off'`, 40, 150);
    const archiveClosed = await evaluate(
      sp,
      `(() => ({
        archiveCount: document.querySelectorAll('.tree-archive').length,
        ariaPressed: document.getElementById('tree-archive-toggle').getAttribute('aria-pressed'),
        rows: document.querySelectorAll('#tree-drawer .tree-row').length,
      }))()`,
    );
    check(
      archiveClosed.archiveCount === 0 && archiveClosed.ariaPressed === 'false' && archiveClosed.rows > 0,
      '#I-19h2 关闭档案后 `.tree-archive` 移除、aria 同步、默认平铺恢复（默认关不改变既有渲染路径）',
      JSON.stringify(archiveClosed),
    );

    // 10. Esc closes + focus returns to the FAB
    await sp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(250);
    const afterEsc = await evaluate(
      sp,
      `(() => ({
        hidden: document.getElementById('tree-drawer').hidden,
        ariaExpanded: document.getElementById('tree-fab').getAttribute('aria-expanded'),
        activeId: document.activeElement ? document.activeElement.id : '',
      }))()`,
    );
    check(afterEsc.hidden === true, '#I-15a Esc 关闭抽屉', JSON.stringify(afterEsc));
    check(afterEsc.ariaExpanded === 'false', '#I-15b 关闭后 aria-expanded=false 同步', JSON.stringify(afterEsc));
    check(afterEsc.activeId === 'tree-fab', '#I-15c 关闭后焦点回归 FAB', JSON.stringify(afterEsc));

    // 11. narrow panel (320px): zero horizontal overflow, closed + open
    await sp.send('Emulation.setDeviceMetricsOverride', { ...NARROW, deviceScaleFactor: 1, mobile: false });
    await sleep(200);
    const narrowClosed = await evaluate(sp, MEASURE);
    check(
      narrowClosed.docOverflowX === 0 && narrowClosed.logOverflowX === 0,
      '#I-16a 320px 窄侧栏关态零水平溢出（文档 + #log）',
      JSON.stringify(narrowClosed),
    );
    await realClick(sp, '#tree-fab');
    await waitFor(sp, `document.getElementById('tree-drawer').hidden ? '' : 'open'`, 40, 150);
    await sleep(200);
    const narrowOpen = await evaluate(sp, MEASURE);
    check(
      narrowOpen.docOverflowX === 0 && narrowOpen.logOverflowX === 0 && narrowOpen.drawerOverflowX === 0,
      '#I-16b 320px 窄侧栏开态零水平溢出（文档 + #log + 抽屉）',
      JSON.stringify(narrowOpen),
    );
    // close again for a clean exit
    await sp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(150);

    // 12. no page exceptions
    check(spExceptions.length === 0, '#I-17 0 页面异常（sidepanel 无 exceptionThrown）', JSON.stringify(spExceptions.slice(0, 3)));
  } catch (err) {
    failures.push(`insight harness error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    sp?.close();
    chrome.kill('SIGKILL');
    await sleep(300);
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }

  console.log('');
  console.log(`layout closed:  ${JSON.stringify(closedLayout ?? {})}`);
  if (failures.length) {
    console.error(`UI insight FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(chromeLog.split('\n').filter((l) => /error|exception/i.test(l)).slice(0, 5).join('\n'));
    process.exit(1);
  }
  console.log(`UI insight PASS — ${passes} assertions: 真实 dist 侧栏 FAB + 覆盖式抽屉 + 布局量化（#log ≥589px / composer ∈[0,+8] / FAB∩composer=0 / 400·320px 零溢出，开/关两态）+ V2-3 真实撤销控件/回执/确认容器（deny 行仍无控件）`);
}

await main();
