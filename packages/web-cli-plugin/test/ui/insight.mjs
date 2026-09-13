/**
 * V2-2 UI 门禁 `test:insight`（TASK-007；FR-V2-020~025，AC-V2-002 / AC-V22-001~007）。
 *
 * **新文件承载**：v1 `test/ui/journey.mjs` 零改动；本脚本新增断言编号 `#I-01…`，
 * 与 v1 断言只增不减（v1 journey 的 `#15a~#15q` 由 `npm run test:ui` 独立守护）。
 *
 * 真实 dist + 全新 user-data-dir + headless Chromium（CDP），侧栏视口 400×900：
 *   #I-01 FAB 存在、默认收起、可开合；站点夹具发现完成（#I-01g）；
 *   #I-02 抽屉真层级树：根 + 四维度面默认展开（R2 取代 S16）；四维度可见；
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
 *   #I-11 R2 两通路文案 + 归属层级树声明 + `delay`(=`deny`) 消歧（取代 S13）；
 *   #I-12a/b R2 deny 分层：硬底线零控件 + 原因可读；可覆盖行 allow/ask/deny（取代 S14）；
 *   #I-13 过滤只读：检索收窄展示集合、不改真值；
 *   #I-14 开/关两态复用全部几何断言（证明开抽屉不挤压消息区）；
 *   #I-15 Esc 关闭 + 焦点回归 FAB + `aria-expanded` 同步；
 *   #I-16 320px 窄侧栏零水平溢出（关/开两态，深展开状态下同样成立）；
 *   #I-17 0 页面异常；
 *   #I-18a~d V2-3 真实动作控件（button[data-action-id]）+ `#tree-receipt`/`#tree-confirm`
 *            存在且默认收起；#I-18e R2 分层（取代 S15）；
 *   #I-19a~h V2-4 档案子视图（只读过滤 + P0 红线：零 `.tree-control`/`button[data-action-id]`）；
 *   #I-20a~k R2（AC-V2-020~023 / AC-V22-008~011）：作者两例在真实 DOM 逐层展开/收起 +
 *            惰性渲染 + 面包屑 + 键盘（方向键/Home/End）+ 覆盖即时生效 + 多状态布局守卫；
 *   #I-21a~e R2-V24-04：档案卡分层 + 默认/生效分列 + 同一 tree-ops 写路径。
 *
 * 依赖：Node ≥ 22（全局 WebSocket / fetch）、本机 `.pw-browsers` Chromium（或 CHROME_BIN）。
 * 前置：`npm run build --workspace @lgdl/web-cli-plugin`。
 *
 * ⚠️ 串行纪律：本脚本自起 Chromium，**绝不与 test:ui / test:binding 并发**（OOM 前科）。
 */
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
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

/**
 * R2 (AC-V22-008 / FR-V2-070): a tiny local fixture site so the **author example ①**
 * path (`连接树 → 授权的站点 → 站点 xxx → 支持的命令 → 工具 → 子命令`) can be
 * drilled in the real dist DOM. The manifest of a temp dist copy is pre-granted
 * `http://127.0.0.1/*` (JS byte-identical; headless has no native permission
 * prompt — same disclosure as `test:binding`), the origin is pre-seeded as
 * authorized, and the site declares one read tool with two subcommands.
 */
const INSIGHT_SITE_DESCRIPTOR = {
  protocolVersion: '1.0',
  siteName: 'R2 Insight Fixture',
  tools: [
    {
      id: 'notes',
      summary: 'Fixture notes (read-only).',
      subcommands: ['list', 'show'],
      riskHint: 'read',
    },
  ],
  transport: { kind: 'page-message', channel: 'web-cli' },
};

function startInsightSite() {
  const server = createServer((req, res) => {
    if (req.url.startsWith('/.well-known/web-cli.json')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(INSIGHT_SITE_DESCRIPTOR));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><title>R2 insight fixture</title></head><body><h1>R2 insight fixture</h1></body></html>');
  });
  return new Promise((resolveListen) => {
    server.listen(0, '127.0.0.1', () => resolveListen({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

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

  // R2: a temp dist copy with a pre-granted host permission for the local fixture
  // site (JS byte-identical; headless has no native permission prompt → same
  // disclosure as `test:binding`). Used ONLY to drill the author example ①.
  const site = await startInsightSite();
  const extDir = join(work, 'ext');
  await cp(dist, extDir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(extDir, 'manifest.json'), 'utf8'));
  manifest.host_permissions = [...manifest.host_permissions, 'http://127.0.0.1/*'];
  await writeFile(join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`▶ fixture site: ${site.origin}（临时 dist copy：host_permissions += http://127.0.0.1/*；JS 字节未改）`);

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
        const groups = [...drawer.querySelectorAll('.tree-group')];
        const root = drawer.querySelector('li[role="treeitem"][data-node-id="root"]');
        const ok =
          groups.length >= 4 &&
          Boolean(root) &&
          root.getAttribute('aria-expanded') === 'true' &&
          // Root + level-1 default expanded: every expandable face is expanded; an
          // empty face is simply a leaf (no aria-expanded), which is correct.
          groups.every((g) => g.getAttribute('aria-expanded') === 'true' || !g.hasAttribute('aria-expanded'));
        return ok ? JSON.stringify({ groups: groups.length, rootExpanded: root.getAttribute('aria-expanded') }) : '';
      })()`,
      150,
      200,
    );
    // R2 supersession S16: four-dimension visibility is now asserted on the real
    // root + faces of the nested tree (root + level-1 default expanded).
    check(
      Boolean(openOk),
      '#I-02a 真实点击 FAB 后抽屉打开：真层级树根 + 四维度面（可展开面默认展开；R2 取代 S16）',
      String(openOk),
    );
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
        const badges = drawer.querySelectorAll('.tree-badge').length;
        const text = drawer.textContent || '';
        return {
          dims,
          badges,
          hasDegradation: drawer.querySelectorAll('.tree-degradation').length > 0,
          hasEmpty: drawer.querySelectorAll('.tree-empty').length > 0,
          hasFilterInput: !!document.getElementById('tree-filter-input'),
          hasOwnershipNote: text.includes('按归属的层级树'),
          hasForestWording: text.includes('森林'),
          hasTwoPathways: text.includes('命令级覆盖 = 用户显式、被审计的放宽'),
          hasHardFloorClause: text.includes('硬底线不可覆盖'),
          hasDelayDisambiguation: text.includes('非可配置档位'),
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
    // R2 supersession S13: wording rewritten to the ownership hierarchy (deviation gone).
    check(
      content.hasOwnershipNote === true && content.hasForestWording === false,
      '#I-11a 文案为「按归属的层级树」（偏差文案「森林/非严格树」零命中）',
      JSON.stringify(content),
    );
    check(
      content.hasTwoPathways === true && content.hasHardFloorClause === true,
      '#I-11b 两通路（撤销=收紧 / 命令级覆盖=显式放宽但硬底线不可覆盖）',
      JSON.stringify(content),
    );
    check(
      content.hasDelayDisambiguation === true &&
        content.hasDelay === true &&
        content.hasDeny === true &&
        content.hasFailClosed === true &&
        content.hasDelayMs === true,
      '#I-11c `delay`(= deny, fail-closed, 非可配置档位) 与命令间 `delayMs` 消歧文案同处',
      JSON.stringify(content),
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
        return {
          buttons: buttons.length,
          actionIds: [...new Set(buttons.map((b) => b.dataset.actionId))],
          readonlyControls: readonlyControls.length,
          hasReceipt: !!receipt,
          receiptRole: receipt ? receipt.getAttribute('role') : '',
          receiptHidden: receipt ? receipt.hidden : null,
          hasConfirm: !!confirm,
          confirmHidden: confirm ? confirm.hidden : null,
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
    // #I-18e (deny rows have no controls) is superseded by the R2 layered form below
    // (hard-floor deny ⇒ zero controls; overridable ⇒ allow/ask/deny controls).

    // ── 8c. R2 (AC-V2-020~023 / AC-V22-008~011): author examples drilled layer by
    // layer in the REAL DOM, keyboard + breadcrumb + layered controls, session
    // persistence. Supersedes S14 (#I-12) / S15 (#I-18e) / S16 (#I-02a).
    const toggleByLabel = async (label) =>
      evaluate(
        sp,
        `(() => {
          const li = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
            (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === ${JSON.stringify(label)},
          );
          if (!li) return 'not-found';
          const btn = li.querySelector(':scope > .tree-node-head > .tree-toggle');
          if (!btn || btn.disabled) return 'no-toggle';
          btn.click();
          return 'clicked';
        })()`,
      );

    const expandNode = async (label, tries = 30) => {
      for (let i = 0; i < tries; i += 1) {
        const state = await evaluate(
          sp,
          `(() => {
            const li = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
              (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === ${JSON.stringify(label)},
            );
            return li ? li.getAttribute('aria-expanded') : 'missing';
          })()`,
        );
        if (state === 'true') return true;
        if (state === 'missing') {
          await sleep(150);
          continue;
        }
        await toggleByLabel(label);
        await sleep(150);
      }
      return false;
    };

    // Author example ① (connection tree → authorized site → site xxx → its commands →
    // tool → subcommand) is exercised at the END of this script: the local fixture site
    // is bound last so it cannot perturb the AC-V2-002 layout guards measured above
    // (binding a site legitimately changes the panel chrome height, which would
    // otherwise consume the 589px budget). Example ② follows immediately (no site).

    // Example ②: 连接树 → 支持的命令 → 系统内置命令 → dom → dom read-state
    await expandNode('系统内置命令');
    await expandNode('dom');
    const drill2 = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const labels = [...drawer.querySelectorAll('li.tree-node .tree-label')].map((n) => n.textContent);
        const commandFace = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === '支持的命令',
        );
        const dom = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom',
        );
        const leaf = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom read-state',
        );
        return {
          hasCommandFace: labels.includes('支持的命令'),
          hasBuiltin: labels.includes('系统内置命令'),
          hasDom: labels.includes('dom'),
          hasLeaf: labels.includes('dom read-state'),
          commandFaceLevel: commandFace ? commandFace.getAttribute('aria-level') : null,
          commandFaceExpanded: commandFace ? commandFace.getAttribute('aria-expanded') : null,
          domLevel: dom ? dom.getAttribute('aria-level') : null,
          domExpanded: dom ? dom.getAttribute('aria-expanded') : null,
          leafHasExpanded: leaf ? leaf.hasAttribute('aria-expanded') : null,
          leafRole: leaf ? leaf.getAttribute('role') : null,
        };
      })()`,
    );
    check(
      drill2.hasCommandFace === true &&
        drill2.hasBuiltin === true &&
        drill2.hasDom === true &&
        drill2.hasLeaf === true &&
        drill2.commandFaceExpanded === 'true' &&
        drill2.leafHasExpanded === false &&
        drill2.leafRole === 'treeitem',
      '#I-20b 作者示例② 逐层展开：连接树→支持的命令→系统内置命令→dom→dom read-state（真实 DOM）',
      JSON.stringify(drill2),
    );

    // Lazy rendering: collapsing `dom` removes its subcommands from the DOM entirely.
    await toggleByLabel('dom');
    await sleep(150);
    const collapsed = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const dom = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom',
        );
        const labels = [...drawer.querySelectorAll('li.tree-node .tree-label')].map((n) => n.textContent);
        return { domExpanded: dom ? dom.getAttribute('aria-expanded') : null, hasLeaf: labels.includes('dom read-state') };
      })()`,
    );
    check(
      collapsed.domExpanded === 'false' && collapsed.hasLeaf === false,
      '#I-20c 收起 dom → 子命令不在 DOM（惰性渲染，不虚拟化）',
      JSON.stringify(collapsed),
    );
    await expandNode('dom');

    // R2 supersession S14: hard-floor rows carry zero action controls + a readable
    // clamp reason; overridable rows carry allow/ask/deny policy controls.
    const layered = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const hardFloor = [...drawer.querySelectorAll('li.tree-node[data-hard-floor="true"]')];
        const hardFloorWithControls = hardFloor.filter((r) => r.querySelector('[data-action-id]')).length;
        const hardFloorWithReason = hardFloor.filter((r) => r.querySelector('.tree-clamp-reason')).length;
        const overridable = [...drawer.querySelectorAll('li.tree-node[data-overridable="true"]')];
        const withThree = overridable.filter((r) => r.querySelectorAll('button[data-policy]').length === 3).length;
        const uiRow = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom click',
        );
        const readRow = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom read-state',
        );
        return {
          hardFloor: hardFloor.length,
          hardFloorWithControls,
          hardFloorWithReason,
          overridable: overridable.length,
          withThree,
          uiHasControls: uiRow ? uiRow.querySelectorAll('[data-action-id]').length : -1,
          uiReason: uiRow ? (uiRow.querySelector('.tree-clamp-reason')?.textContent ?? '') : '',
          readPolicies: readRow ? [...readRow.querySelectorAll('button[data-policy]')].map((b) => b.dataset.policy) : [],
          readSelected: readRow ? readRow.querySelector('button[data-policy][aria-pressed="true"]')?.dataset.policy : null,
        };
      })()`,
    );
    check(
      layered.hardFloor >= 1 && layered.hardFloorWithControls === 0 && layered.hardFloorWithReason === layered.hardFloor,
      '#I-12a 硬底线行零 [data-action-id] 且每行有可读 .tree-clamp-reason（R2 取代 S14）',
      JSON.stringify(layered),
    );
    check(
      layered.overridable >= 1 && layered.withThree >= 1 && layered.readPolicies.join(',') === 'allow,ask,deny',
      '#I-12b 可覆盖行渲染 allow/ask/deny 三档控件（R2 取代 S14）',
      JSON.stringify(layered),
    );
    check(
      layered.uiHasControls === 0 && /ui 档/.test(layered.uiReason) && layered.readSelected === 'allow',
      '#I-20d dom click（ui 硬底线）零控件 + 原因可读；dom read-state 当前生效档 allow',
      JSON.stringify(layered),
    );
    check(
      layered.hardFloorWithControls === 0 && layered.withThree >= 1,
      '#I-18e deny 分层：硬底线行零控件 且 可覆盖行有控件（R2 取代 S15）',
      JSON.stringify(layered),
    );

    // Breadcrumb follows the focused node's hierarchy path (FR-V2-073).
    const breadcrumb = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const leaf = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom read-state',
        );
        if (!leaf) return '';
        leaf.focus();
        leaf.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        return document.getElementById('tree-breadcrumb')?.textContent ?? '';
      })()`,
    );
    check(
      typeof breadcrumb === 'string' &&
        breadcrumb.includes('连接树') &&
        breadcrumb.includes('支持的命令') &&
        breadcrumb.includes('系统内置命令') &&
        breadcrumb.includes('dom') &&
        breadcrumb.includes('dom read-state'),
      '#I-20e 面包屑显示当前节点层级路径（连接树 › 支持的命令 › 系统内置命令 › dom › dom read-state）',
      String(breadcrumb),
    );

    // Keyboard: Home/End/ArrowUp/ArrowDown move focus among visible treeitems;
    // ArrowLeft collapses/navigates to parent; Enter toggles.
    const keyProbe = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const leaf = [...drawer.querySelectorAll('li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom read-state',
        );
        if (!leaf) return '';
        leaf.focus();
        return 'focused';
      })()`,
    );
    const dispatchKey = async (key, code, vk) => {
      await sp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk });
      await sp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
      await sleep(80);
    };
    let keyboardEvidence = null;
    if (keyProbe === 'focused') {
      await dispatchKey('ArrowLeft', 'ArrowLeft', 37);
      const afterLeft = await evaluate(sp, `document.activeElement?.querySelector(':scope > .tree-node-head > .tree-label')?.textContent ?? ''`);
      await dispatchKey('ArrowRight', 'ArrowRight', 39);
      const afterRight = await evaluate(sp, `document.activeElement?.querySelector(':scope > .tree-node-head > .tree-label')?.textContent ?? ''`);
      await dispatchKey('Home', 'Home', 36);
      const afterHome = await evaluate(sp, `document.activeElement?.querySelector(':scope > .tree-node-head > .tree-label')?.textContent ?? ''`);
      await dispatchKey('End', 'End', 35);
      const afterEnd = await evaluate(sp, `document.activeElement?.querySelector(':scope > .tree-node-head > .tree-label')?.textContent ?? ''`);
      await dispatchKey('ArrowUp', 'ArrowUp', 38);
      const afterUp = await evaluate(sp, `document.activeElement?.querySelector(':scope > .tree-node-head > .tree-label')?.textContent ?? ''`);
      keyboardEvidence = { afterLeft, afterRight, afterHome, afterEnd, afterUp };
      // leave focus back on the leaf for the later sections
      await evaluate(
        sp,
        `(() => {
          const leaf = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
            (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom read-state',
          );
          leaf?.focus();
          return true;
        })()`,
      );
    }
    check(
      keyboardEvidence !== null &&
        keyboardEvidence.afterLeft === 'dom' &&
        keyboardEvidence.afterRight === 'dom read-state' &&
        keyboardEvidence.afterHome === '连接树' &&
        keyboardEvidence.afterEnd !== '' &&
        keyboardEvidence.afterUp !== '',
      '#I-20f 键盘可达：Home/End/ArrowLeft（回父）/ArrowRight/ArrowUp 移动焦点（roving tabindex）',
      JSON.stringify(keyboardEvidence),
    );

    // Session persistence + override live update: a policy push re-projects the
    // tree but keeps the expanded/collapsed session state.
    const beforePush = await evaluate(
      sp,
      `(() => {
        const drawer = document.getElementById('tree-drawer');
        const labels = [...drawer.querySelectorAll('li.tree-node .tree-label')].map((n) => n.textContent);
        return { hasLeaf: labels.includes('dom read-state') };
      })()`,
    );
    const setRes = await evaluate(
      sp,
      `chrome.runtime.sendMessage({ kind: 'command-policy-set', commandId: 'cmd:dom#read-state', policyAction: 'deny' }).then((r) => JSON.stringify(r))`,
    );
    const applied = await waitFor(
      sp,
      `(() => {
        const leaf = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom read-state',
        );
        if (!leaf) return '';
        const selected = leaf.querySelector('button[data-policy][aria-pressed="true"]')?.dataset.policy;
        return selected === 'deny' ? JSON.stringify({ effective: leaf.dataset.effectiveAction, selected }) : '';
      })()`,
      60,
      200,
    );
    check(
      beforePush.hasLeaf === true && applied !== undefined,
      '#I-20g 覆盖后重投影：展开态会话保持（dom read-state 仍在 DOM）且生效档即时变 deny',
      `${setRes} / applied=${applied}`,
    );
    const resetRes = await evaluate(
      sp,
      `chrome.runtime.sendMessage({ kind: 'command-policy-reset', commandId: 'cmd:dom#read-state' }).then((r) => JSON.stringify(r))`,
    );
    const resetApplied = await waitFor(
      sp,
      `(() => {
        const leaf = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
          (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'dom read-state',
        );
        if (!leaf) return '';
        const selected = leaf.querySelector('button[data-policy][aria-pressed="true"]')?.dataset.policy;
        return selected === 'allow' ? 'allow' : '';
      })()`,
      60,
      200,
    );
    check(
      resetApplied === 'allow',
      '#I-20h 恢复默认后生效档即时回到 allow（可逆、无残留覆盖）',
      `${resetRes} / applied=${resetApplied}`,
    );

    // ── Multi-state layout guard (AC-V2-002): deep-expanded + collapsed states must
    // keep the exact same steady geometry as the closed state (absolute overlay).
    const deepExpanded = await evaluate(sp, MEASURE);
    checkLayout(deepExpanded, '#I-20i(树深展开)');
    const deepDrift = ['logFlexGrow', 'logClientHeight', 'logRatio', 'composerGapToBottom', 'docOverflowX', 'logOverflowX'].filter(
      (f) => deepExpanded[f] !== closedLayout[f],
    );
    check(
      deepDrift.length === 0,
      '#I-20j 树深展开（站点面 + 命令面 + dom 子树）不改变稳态几何（drift=0）',
      `drift=${JSON.stringify(deepDrift.map((f) => [f, closedLayout[f], deepExpanded[f]]))}`,
    );
    // Collapse a mid-level group → still zero drift.
    await toggleByLabel('系统内置命令');
    await sleep(150);
    const collapsedState = await evaluate(sp, MEASURE);
    checkLayout(collapsedState, '#I-20k(树收起)');
    const collapsedDrift = ['logFlexGrow', 'logClientHeight', 'logRatio', 'composerGapToBottom', 'docOverflowX', 'logOverflowX'].filter(
      (f) => collapsedState[f] !== closedLayout[f],
    );
    check(
      collapsedDrift.length === 0,
      '#I-20k 树收起（一级分组折叠）不改变稳态几何（drift=0）',
      `drift=${JSON.stringify(collapsedDrift.map((f) => [f, closedLayout[f], collapsedState[f]]))}`,
    );
    // Re-expand for the downstream steps (session state keeps the explicit expand).
    await expandNode('系统内置命令');
    await expandNode('dom');

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

    // ── R2-V24-04 (AC-V24-004/008; supersession S11): archive cards are layered
    // (hard-floor ⇒ no policy control + readable clamp reason; overridable ⇒
    // allow/ask/deny) and split default vs effective. The P0 red line above still
    // holds because the archive uses its own classes / attributes (no `.tree-control`,
    // no `button[data-action-id]`) and writes through the SAME tree-ops path.
    const archiveLayered = await evaluate(
      sp,
      `(() => {
        const archive = document.querySelector('.tree-archive');
        if (!archive) return null;
        const cards = [...archive.querySelectorAll('.tree-archive-card')];
        const hardFloor = cards.filter((c) => c.dataset.hardFloor === 'true');
        const overridable = cards.filter((c) => c.dataset.overridable === 'true');
        return {
          cards: cards.length,
          hardFloor: hardFloor.length,
          overridable: overridable.length,
          hardFloorWithPolicy: hardFloor.filter((c) => c.querySelector('[data-policy]')).length,
          hardFloorWithReason: hardFloor.filter((c) => c.querySelector('[data-field="clamp-reason"]')).length,
          overridableWithThree: overridable.filter((c) => c.querySelectorAll('[data-policy]').length === 3).length,
          withDefaultField: cards.filter((c) => c.querySelector('[data-field="default-action"]')).length,
          withEffectiveField: cards.filter((c) => c.querySelector('[data-field="effective-action"]')).length,
          treeControls: archive.querySelectorAll('.tree-control').length,
          actionButtons: archive.querySelectorAll('button[data-action-id]').length,
        };
      })()`,
    );
    check(
      archiveLayered &&
        archiveLayered.hardFloor >= 1 &&
        archiveLayered.hardFloorWithPolicy === 0 &&
        archiveLayered.hardFloorWithReason === archiveLayered.hardFloor,
      '#I-21a 档案硬底线卡零 [data-policy] 且 clamp 原因可读（R2 取代 S11）',
      JSON.stringify(archiveLayered),
    );
    check(
      archiveLayered && archiveLayered.overridable >= 1 && archiveLayered.overridableWithThree >= 1,
      '#I-21b 档案可覆盖卡渲染 allow/ask/deny 三档 [data-policy] 控件',
      JSON.stringify(archiveLayered),
    );
    check(
      archiveLayered &&
        archiveLayered.withDefaultField === archiveLayered.cards &&
        archiveLayered.withEffectiveField === archiveLayered.cards,
      '#I-21c 每卡默认档 vs 生效档分列（[data-field=default-action|effective-action]）',
      JSON.stringify(archiveLayered),
    );
    check(
      archiveLayered && archiveLayered.treeControls === 0 && archiveLayered.actionButtons === 0,
      '#I-21d 档案内仍无 .tree-control / button[data-action-id]（P0 红线保持）',
      JSON.stringify(archiveLayered),
    );

    // Same tree-ops write path: a tightening click (allow → deny) applies immediately
    // without confirmation and lands in the command-policy store.
    const archiveWriteTarget = await evaluate(
      sp,
      `(() => {
        const archive = document.querySelector('.tree-archive');
        const card = [...archive.querySelectorAll('.tree-archive-card[data-overridable="true"]')].find(
          (c) => c.dataset.action === 'allow' && c.querySelector('button[data-policy="deny"]'),
        );
        if (!card) return 'no-allow-card';
        card.querySelector('button[data-policy="deny"]').click();
        return card.dataset.cardId;
      })()`,
    );
    const archiveWritten = await waitFor(
      sp,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'command-policy' });
        const entries = (r && r.data && r.data.entries) || [];
        const hit = entries.find((e) => e.action === 'deny');
        return hit ? JSON.stringify(hit) : '';
      })()`,
      60,
      200,
    );
    check(
      typeof archiveWriteTarget === 'string' && archiveWriteTarget.startsWith('cmd:') && Boolean(archiveWritten),
      '#I-21e 档案卡写入走同一 tree-ops 路径（command-policy 落盘；无第二写入口）',
      `${archiveWriteTarget} / ${archiveWritten}`,
    );
    await evaluate(sp, `chrome.runtime.sendMessage({ kind: 'command-policy-reset', all: true }).then((r) => JSON.stringify(r))`);
    await sleep(200);

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

    // 12. Author example ① (real DOM): 连接树 → 授权的站点 → 站点 xxx → 支持的命令 → 工具.
    // The local fixture site is bound LAST so it cannot perturb the AC-V2-002 layout
    // guards measured above (binding a site legitimately changes the panel chrome
    // height; those guards are pinned against the no-site baseline).
    const normSite = site.origin.toLowerCase();
    await evaluate(
      sw,
      `chrome.storage.local.set({ ${JSON.stringify('web-cli:web-cli:origins')}: { ${JSON.stringify(normSite)}: { origin: ${JSON.stringify(normSite)}, authorized: true, trust: 'untrusted', authorizedAt: Date.now(), updatedAt: Date.now() } } }).then(() => true)`,
    );
    await evaluate(sw, `chrome.tabs.create({ url: ${JSON.stringify(site.origin)} }).then((t) => t.id)`);
    const siteReady = await waitFor(
      sp,
      `(async () => {
        const r = await chrome.runtime.sendMessage({ kind: 'state' });
        const d = r && r.data;
        return d && Array.isArray(d.tools) && d.tools.includes('site_notes') && d.active && d.active.origin === ${JSON.stringify(site.origin)}
          ? JSON.stringify({ tools: d.tools }) : '';
      })()`,
      120,
      250,
    );
    check(
      Boolean(siteReady),
      '#I-20a0 站点夹具发现完成（site_notes 进入工具面；作者示例①前置）',
      siteReady ?? 'no site tool',
    );

    await sp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
    await sleep(200);
    await evaluate(
      sp,
      `(() => { const f = document.getElementById('tree-fab'); if (document.getElementById('tree-drawer').hidden) f.click(); return true; })()`,
    );
    await waitFor(sp, `document.getElementById('tree-drawer').hidden ? '' : 'open'`, 60, 150);
    await sleep(250);

    const siteLabel = `站点 ${site.origin}`;
    let siteDrill = null;
    if (siteReady) {
      await expandNode(siteLabel);
      await expandNode('支持的命令');
      await expandNode('site_notes');
      siteDrill = await evaluate(
        sp,
        `(() => {
          const labels = [...document.querySelectorAll('#tree-drawer li.tree-node .tree-label')].map((n) => n.textContent);
          const site = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
            (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === ${JSON.stringify(siteLabel)},
          );
          const tool = [...document.querySelectorAll('#tree-drawer li.tree-node')].find(
            (n) => n.querySelector(':scope > .tree-node-head > .tree-label')?.textContent === 'site_notes',
          );
          return {
            siteAuthorized: site?.querySelector('.tree-badge[data-kind="authorized"]')?.textContent ?? '',
            hasSite: labels.includes(${JSON.stringify(siteLabel)}),
            hasSupport: labels.includes('支持的命令'),
            hasTool: labels.includes('site_notes'),
            toolRole: tool ? tool.getAttribute('role') : null,
            toolLevel: tool ? tool.getAttribute('aria-level') : null,
          };
        })()`,
      );
    }
    check(
      siteDrill !== null &&
        siteDrill.hasSite === true &&
        siteDrill.hasSupport === true &&
        siteDrill.hasTool === true &&
        siteDrill.siteAuthorized === '已授权' &&
        siteDrill.toolRole === 'treeitem',
      '#I-20a 作者示例① 逐层展开：连接树→授权的站点→站点 xxx→支持的命令→工具（真实 DOM）',
      JSON.stringify(siteDrill),
    );

    // 12b. no page exceptions
    check(spExceptions.length === 0, '#I-17 0 页面异常（sidepanel 无 exceptionThrown）', JSON.stringify(spExceptions.slice(0, 3)));
  } catch (err) {
    failures.push(`insight harness error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    sp?.close();
    chrome.kill('SIGKILL');
    site.server.close();
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
  console.log(
    `UI insight PASS — ${passes} assertions: 真实 dist 侧栏 FAB + R2 真层级树逐层展开/收起（作者两例）+ 键盘/面包屑/aria-expanded + deny 分层三态控件 + 覆盖即时生效 + 多状态布局守卫（#log ≥589px / composer ∈[0,+8] / FAB∩composer=0 / 400·320px 零溢出；关/开/深展开/收起 drift=0）+ V2-3 动作控件/回执/确认 + V2-4 档案分层/分列`,
  );
}

await main();
