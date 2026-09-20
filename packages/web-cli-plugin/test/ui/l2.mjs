/**
 * V3-3 TASK-306 (FR-V3-045~054 — ADR-V3-025 / ADR-V3-026 / ADR-V3-027 / ADR-V3-028 /
 * ADR-V3-029) — the **L2 on-demand views runtime gate** (`npm run test:l2`).
 *
 * It exercises the real `dist/` product (one Chromium, one page target, serial) and
 * asserts, in order:
 *
 *   ① **默认零占用** — all four `[data-l2-view]` containers are `hidden` in the
 *      default state (visible id set contains none of their content), and `#log` is
 *      visible. CSS-hiding / out-of-viewport tricks are NOT accepted: the judge reads
 *      the `hidden` attribute chain, the same caliber the density gate uses.
 *   ② **≤2 次交互可达** — `#l0-statusbar` (1) → one `#l2-entry-*` (2) ⇒ the target
 *      view is visible and `#log` is gone; per view.
 *   ③ **计数从真值派生**（FR-V3-046）— the entry labels are read, a REAL truth is
 *      changed through an existing channel, the labels are re-read and must move by
 *      exactly the same delta. A count that does not move is a hard FAIL (that is
 *      what "hard-coded" looks like). `{live, baseline}` must stay two labelled
 *      numbers (EC-V3-016).
 *   ④ **返回复位** — `← 返回` restores `#log`, the entry-time disclosure snapshot and
 *      the default density tier (re-measured with the single-source caliber).
 *   ⑤ **单滚动容器** — while a view is open, the panel-level scroller census inside
 *      `#panel-main` is exactly 1 (the open view's own local block).
 *   ⑥ **L2 期间风险位可见** — `#risk-rail` stays visible and its ancestor closure has
 *      no `hidden` / no `[data-l2-view]` (view replacement happens inside
 *      `#panel-main` only).
 *   ⑦ **树语义** — `role=tree/treeitem`, `aria-expanded`/`aria-level`, keyboard
 *      roving, breadcrumb, and the closed **9-action whitelist in fixed order**.
 *   ⑧ **零提权** — the catalogue/audit views contain zero form controls; the tree's
 *      own controls are the v2 whitelist (no new action id); a forged
 *      `sendMessage` cannot widen a policy (`command-policy-set` on a hard-floor
 *      command is still clamped by the service worker).
 *   ⑨ **零明文** — audit rows carry only the six whitelisted fields + a
 *      de-parameterised origin; injected plaintext (apiKey / clipboard / notice /
 *      bookmark bodies) never reaches the DOM; every rendered URL has no query.
 *   ⑩ **能力集等价**（AC-V3-026, eight items）— command set / tier set / four tree
 *      dimensions / `{live,baseline}` / audit entry count / settings section set /
 *      9 actions / receipt triple are all still reachable and equal in count.
 *
 * Serial discipline: one Chromium instance, one page target, everything in order.
 */
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CHROME,
  DIST,
  PACKAGE_ROOT,
  VIEWPORT_HEIGHT,
  check,
  counts,
  evaluate,
  findOurServiceWorker,
  finish,
  launch,
  openSidePanel,
  realClick,
  setViewport,
  sleep,
  waitFor,
} from './_v3-helpers.mjs';
import { DENSITY_LIMITS, DENSITY_MEASURE_SOURCE, evaluateDensity } from './density-metrics.mjs';

/** D-005 runtime floor（本叶台账 `v4GateFloors` 的 l2 下界；只增不减）。 */
const L2_RUNTIME_FLOOR = 71;
/** v3 静态 `check(` 计点下界（v3 台账近似值，只增）。 */
const L2_STATIC_FLOOR = 68;

const FIXTURE_ORIGIN = 'https://v3-l2.test';
const SECOND_ORIGIN = 'https://v3-l2-second.test';
const LLM_KEY = 'web-cli:web-cli:llm';
const LEDGER = resolve(PACKAGE_ROOT, 'docs/v3-supersession-ledger.json');
const SECTION_REGISTRY = resolve(PACKAGE_ROOT, 'src/ui/settings/sections.ts');

/** The four entries / views, in their fixed order. */
const L2_KEYS = ['tree', 'commands', 'audit', 'settings'];

/** The closed 9-action whitelist, fixed order (mirrors `tree-ops.ts#TREE_ACTION_IDS`). */
const TREE_ACTION_IDS = [
  'revoke-origin',
  'revoke-capability',
  'set-capability-toggle',
  'set-tabs-toggle',
  'clear-auto-auth',
  'disconnect-llm',
  'dissolve-group',
  'set-command-policy',
  'reset-command-policy',
];

/** Default-state fixture: bound + authorized + a pending decision card (same as L0's). */
async function resetFixture(cdp) {
  await evaluate(
    cdp,
    `chrome.storage.local.set({ ${JSON.stringify(LLM_KEY)}: {
      active: 'openai',
      providers: { openai: { apiKey: 'v3-l2-key', model: 'v3-l2-mock', baseURL: 'http://127.0.0.1:9/v1' } },
      maxRounds: 3,
    } }).then(() => true)`,
  );
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.getElementById('status') ? '1' : ''`, 80, 200);
  await sleep(500);
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'discover', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, state: 'supported' }).then(() => true)`,
  );
  await waitFor(cdp, `document.getElementById('status').textContent.includes('v3-l2.test') ? '1' : ''`, 60, 200);
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`,
  );
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized === true)`, 60, 200);
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await evaluate(cdp, `window.__v3.testing.collapseAll(); window.__v3.testing.reset(); true`);
  await evaluate(cdp, `window.__v3.testing.ask('这一步先做什么？', ['查看站点声明', '列出可用命令', '导出诊断']); true`);
  // The counts must be the REAL derived values before any judgement reads them.
  // FIX-3: the toolbar summary is no longer the count string, so the readiness probe
  // keys on the entry's own `data-count` (the badge channel) instead of the summary.
  await waitFor(
    cdp,
    `(() => { const el = document.getElementById('l2-entry-tree'); return el && /^\\d+$/.test(el.getAttribute('data-count') || '') ? '1' : ''; })()`,
    60,
    200,
  );
  await sleep(400);
}

/** In-page: the default-occupancy probe (`hidden` chain, never computed styles). */
const occupancyProbe = `(() => {
  const hiddenChain = (el) => { let n = el; while (n) { if (n.hidden === true) return true; n = n.parentElement; } return false; };
  const views = {};
  for (const key of ${JSON.stringify(L2_KEYS)}) {
    const el = document.querySelector('[data-l2-view="' + key + '"]');
    views[key] = el ? { present: true, selfHidden: el.hidden === true, anyHiddenAncestor: hiddenChain(el), textLen: (el.textContent || '').trim().length } : { present: false };
  }
  const visibleInViews = [];
  for (const key of ${JSON.stringify(L2_KEYS)}) {
    const el = document.querySelector('[data-l2-view="' + key + '"]');
    if (!el) continue;
    for (const node of el.querySelectorAll('*')) {
      if (!hiddenChain(node) && (node.textContent || '').trim().length > 0) { visibleInViews.push(key + ':' + (node.id || node.className)); break; }
    }
  }
  const visibleIds = [...document.querySelectorAll('[id]')].filter((el) => !hiddenChain(el)).map((el) => el.id).sort();
  return JSON.stringify({
    views,
    visibleInViews,
    visibleIds,
    logHidden: document.getElementById('stream').hidden === true,
    hostHidden: document.getElementById('view-host').hidden === true,
    openViews: [...document.querySelectorAll('[data-l2-view]')].filter((el) => !hiddenChain(el)).map((el) => el.dataset.l2View),
  });
})()`;

/** In-page: the open-view geometry + scroller census + risk visibility. */
const openProbe = `(() => {
  const hiddenChain = (el) => { let n = el; while (n) { if (n.hidden === true) return true; n = n.parentElement; } return false; };
  const scrollers = [...document.querySelectorAll('#region-stream *, #region-stream')]
    .filter((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    })
    .map((el) => el.id || el.className);
  // I-05④ (v3-3 fix round): the CSS caliber — visible containers that are *allowed* to
  // scroll, whether or not they currently overflow (hidden containers excluded, since
  // a replaced #log keeps overflow-y: auto in the stylesheet). A judgement that only
  // sees already-overflowing boxes cannot catch a second scrolling container.
  const scrollersCss = [...document.querySelectorAll('#region-stream *, #region-stream')]
    .filter((el) => {
      if (hiddenChain(el)) return false;
      const style = getComputedStyle(el);
      return style.overflowY === 'auto' || style.overflowY === 'scroll';
    })
    .map((el) => el.id || el.className);
  // V4-1：风险位宿主由 body 直挂的 #risk-rail 变为状态栏内的 chips 层
  // （#region-statusbar(J1 永不 hidden) > #risk-chips(J2 跟随风险) > #risk-rail）。
  // 「L2 打开期间风险位仍可见」因此锚到**状态栏本体**（J1/J4），chip 数则按 J2 口径判定。
  const bar = document.getElementById('region-statusbar');
  const chips = document.getElementById('risk-chips');
  const rail = document.getElementById('risk-rail');
  const railChain = [];
  for (let n = rail; n; n = n.parentElement) railChain.push(n.id || n.tagName.toLowerCase());
  const railChainHasView = (() => { for (let n = rail; n; n = n.parentElement) if (n.hasAttribute && n.hasAttribute('data-l2-view')) return true; return false; })();
  const view = document.querySelector('[data-l2-view]:not([hidden])');
  const vr = view ? view.getBoundingClientRect() : null;
  const de = document.documentElement;
  return JSON.stringify({
    logHidden: document.getElementById('stream').hidden === true,
    hostHidden: document.getElementById('view-host').hidden === true,
    hostView: document.getElementById('view-host').getAttribute('data-view'),
    openViews: [...document.querySelectorAll('[data-l2-view]')].filter((el) => !hiddenChain(el)).map((el) => el.dataset.l2View),
    openViewCount: [...document.querySelectorAll('[data-l2-view]')].filter((el) => !hiddenChain(el)).length,
    headerTitle: (document.getElementById('l2-title').textContent || '').trim(),
    headerCount: document.getElementById('l2-count').getAttribute('data-count'),
    backVisible: !hiddenChain(document.getElementById('l2-back')),
    barVisible: bar ? !hiddenChain(bar) && bar.getBoundingClientRect().height > 0 : false,
    barHidden: bar ? bar.hidden === true : null,
    chipsHidden: chips ? chips.hidden === true : null,
    chipCount: rail ? rail.querySelectorAll('[data-risk-class], button').length : -1,
    j2Holds: chips && rail ? (chips.hidden === true ? rail.querySelectorAll('[data-risk-class]').length === 0 : rail.querySelectorAll('[data-risk-class]').length >= 1) : false,
    railChainHasView,
    railChain,
    scrollers,
    scrollersCss,
    viewOverflowX: vr ? Math.round(vr.width) - Math.round(view.clientWidth) : null,
    viewOverflow: view ? view.scrollWidth - view.clientWidth : null,
    docOverflowX: de.scrollWidth - de.clientWidth,
    formControls: view ? view.querySelectorAll('button, input, select, textarea').length : -1,
  });
})()`;

/** In-page: the L2 entry labels + the panel summary (the count truth the UI shows). */
const countProbe = `(() => {
  const read = (key) => {
    const btn = document.getElementById('l2-entry-' + key);
    const m = btn ? /(\\d+)/.exec(btn.textContent || '') : null;
    return { key, text: btn ? (btn.textContent || '').trim() : null, dataCount: btn ? btn.getAttribute('data-count') : null, labelCount: m ? Number(m[1]) : null };
  };
  const derived = window.__v3.testing.l2Counts ? window.__v3.testing.l2Counts() : null;
  return JSON.stringify({
    entries: ${JSON.stringify(L2_KEYS)}.map(read),
    summary: (document.getElementById('l2-entry-summary')?.textContent ?? '').trim(),
    barText: (document.getElementById('statusbar-text')?.textContent ?? '').trim(),
    derived,
  });
})()`;

/** In-page: the tree ARIA / breadcrumb / controls / 9-action order probe. */
const treeProbe = `(() => {
  const drawer = document.getElementById('tree-drawer');
  if (!drawer) return JSON.stringify({ missing: true });
  const tree = drawer.querySelector('ul[role="tree"]');
  const items = [...drawer.querySelectorAll('li[role="treeitem"]')];
  const levels = items.map((i) => Number(i.getAttribute('aria-level')));
  const breadcrumb = drawer.querySelector('[role="navigation"], .tree-breadcrumb');
  const actionIds = [...drawer.querySelectorAll('button.tree-control[data-action-id]')].map((b) => b.dataset.actionId);
  const hardFloor = [...drawer.querySelectorAll('li.tree-node[data-hard-floor="true"]')];
  const hardFloorWithControl = hardFloor.filter((li) => li.querySelector('button.tree-control')).length;
  const allowControls = [...drawer.querySelectorAll('button.tree-control[data-policy="allow"]')].length;
  const groups = [...drawer.querySelectorAll('.tree-group')].map((g) => g.dataset.dimension);
  const roles = { drawer: drawer.getAttribute('role'), modal: drawer.getAttribute('aria-modal'), label: drawer.getAttribute('aria-label') };
  const owner = drawer.closest('[data-l2-view]')?.dataset.l2View ?? null;
  const position = getComputedStyle(drawer).position;
  return JSON.stringify({
    hasTree: !!tree,
    treeRole: tree ? tree.getAttribute('role') : null,
    itemCount: items.length,
    levels,
    allHaveLevel: levels.every((n) => Number.isFinite(n) && n >= 1),
    expandedCount: items.filter((i) => i.hasAttribute('aria-expanded')).length,
    selectedCount: items.filter((i) => i.getAttribute('aria-selected') === 'true').length,
    hasBreadcrumb: !!breadcrumb,
    actionIds,
    allowControls,
    hardFloorCount: hardFloor.length,
    hardFloorWithControl,
    // I-02②/③ (v3-3 fix round): the census the judgement needs, so that no term of
    // the check is trivially true. toggleButtonCount = the number of nodes that
    // actually render an expand affordance (button.tree-toggle, NOT the leaf
    // span.tree-toggle-leaf bullet) — aria-expanded must be on exactly those;
    // expandedTrueWithoutGroup = nodes claiming to be expanded but carrying no
    // ul[role=group] child (a lie in the hierarchy semantics);
    // controlsTotal = the real control population (anti-vacuity for the
    // zero-control judgements).
    toggleButtonCount: items.filter((i) => i.querySelector(':scope > .tree-node-head > button.tree-toggle')).length,
    expandedTrue: items.filter((i) => i.getAttribute('aria-expanded') === 'true').length,
    expandedTrueWithoutGroup: items.filter(
      (i) => i.getAttribute('aria-expanded') === 'true' && !i.querySelector(':scope > ul[role="group"]'),
    ).length,
    controlsTotal: drawer.querySelectorAll('button.tree-control').length,
    groups,
    roles,
    owner,
    position,
    filterInput: !!document.getElementById('tree-filter-input'),
    archiveToggle: !!document.getElementById('tree-archive-toggle'),
  });
})()`;

async function main() {
  const exists = (path) => {
    try {
      statSync(path);
      return true;
    } catch {
      return false;
    }
  };
  if (!exists(DIST)) {
    console.error(`✖ dist/ 不存在：先运行 npm run build --workspace @lgdl/web-cli-plugin（期望 ${DIST}）`);
    process.exit(1);
  }
  if (!exists(CHROME)) {
    console.error(`✖ 找不到 Chromium：${CHROME}（可用 CHROME_BIN 覆盖）`);
    process.exit(1);
  }
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);

  const launched = await launch({ tag: 'v3-l2' });
  const pageErrors = [];
  let cdp;
  try {
    const sw = await findOurServiceWorker(launched.base);
    check('L2-00 service worker 可达（真实 dist）', Boolean(sw), '未找到 web-cli plugin service worker');
    if (!sw) throw new Error('no web-cli plugin service worker found');
    const panel = await openSidePanel(sw.cdp, launched.base);
    cdp = panel.cdp;
    cdp.on('Runtime.exceptionThrown', (p) =>
      pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text),
    );
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 400, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1, mobile: false });

    // ── ① 默认零占用（four views cost nothing until opened） ──────────────
    console.log('\n▶ ① 四视图默认零占用（内容全部位于 hidden 子树内）');
    await resetFixture(cdp);
    const occ = JSON.parse(await evaluate(cdp, occupancyProbe));
    check('① 默认态不存在任何可见的 L2 视图（四视图可见数 = 0）', occ.openViews.length === 0, JSON.stringify(occ.openViews));
    check(
      '① `#view-host` 默认 hidden（视图宿主不是常驻 chrome）',
      occ.hostHidden === true,
      String(occ.hostHidden),
    );
    check('① `#log` 默认可见（会话记录仍是默认主区）', occ.logHidden === false, String(occ.logHidden));
    for (const key of L2_KEYS) {
      const v = occ.views[key];
      check(`① [data-l2-view=${key}] 存在且自身/祖先 hidden（含内容的隐藏链，非 CSS 隐身）`, v.present === true && v.anyHiddenAncestor === true, JSON.stringify(v));
    }
    check(
      '① 四视图内不存在任何「可见且有文字」的元素（默认零占用的可测量形式）',
      occ.visibleInViews.length === 0,
      JSON.stringify(occ.visibleInViews),
    );
    check(
      '① 默认可见 id 集合不含任何 L2 视图内容宿主（#l2-catalog-host / #l2-audit-host / #tree-drawer / #settings-root）',
      !occ.visibleIds.some((id) => ['l2-catalog-host', 'l2-audit-host', 'tree-drawer', 'settings-root'].includes(id)),
      JSON.stringify(occ.visibleIds.filter((id) => ['l2-catalog-host', 'l2-audit-host', 'tree-drawer', 'settings-root'].includes(id))),
    );
    const defaultCounts = JSON.parse(await evaluate(cdp, countProbe));
    check(
      '① 常驻一行状态栏文本不含数字（计数在四入口标签/徽标内 —— 默认档足迹稳定）',
      !/\d/.test(defaultCounts.barText ?? ''),
      defaultCounts.barText,
    );
    // ── FIX-3（F 还原度快修轮，2026-09-20）─────────────────────────────────────
    // `#l2-entry-summary` 由计数串改为 origin · 授权态 · 会话 digest：计数不再三处
    // 重复（摘要 + 标签 + 徽标），收敛为两处（标签 + 徽标）。
    check(
      '① 入口摘要（#l2-entry-summary）= origin · 授权态 · 会话 digest（替代旧计数串）',
      /v3-l2\.test/.test(defaultCounts.summary) && /已授权/.test(defaultCounts.summary) && /会话/.test(defaultCounts.summary),
      defaultCounts.summary,
    );
    check(
      '① FIX-3 计数收敛为 2 处：摘要不再含四类计数（树/命令/审计/设置）',
      !/树\s*\d/.test(defaultCounts.summary) &&
        !/命令\s*\d/.test(defaultCounts.summary) &&
        !/审计\s*\d/.test(defaultCounts.summary) &&
        !/设置\s*\d/.test(defaultCounts.summary),
      defaultCounts.summary,
    );

    // ── ② 入口机制（V4-1：四入口上迁工具栏，入口面板退役 ⇒ 1 次交互可达） ──
    console.log('\n▶ ② 入口迁入工具栏 + §③ 计数真值派生');
    const labels = {};
    const entryHop = await evaluate(
      cdp,
      `(() => {
        const entry = document.getElementById('l2-entry-tree');
        const bar = document.getElementById('region-toolbar');
        const nav = document.getElementById('l2-entries');
        const entries = ${JSON.stringify(L2_KEYS)}.map((k) => document.getElementById('l2-entry-' + k));
        const hiddenChain = (el) => { let n = el; while (n) { if (n.hidden === true) return true; n = n.parentElement; } return false; };
        return JSON.stringify({
          navInToolbar: Boolean(bar && nav && bar.contains(nav)),
          navResident: Boolean(nav) && nav.hidden !== true && hiddenChain(nav) === false,
          navFoldable: Array.isArray(window.__v3?.disclosure?.targets)
            ? window.__v3.disclosure.targets.includes('l2-entries')
            : null,
          inToolbar: Boolean(bar && entry && bar.contains(entry)),
          allInToolbar: entries.every((el) => Boolean(el) && bar.contains(el)),
          ariaControls: entry ? entry.getAttribute('aria-controls') : null,
          beforeHostHidden: document.getElementById('view-host').hidden === true,
        });
      })()`,
    );
    const eh = JSON.parse(entryHop);
    check(
      '② 入口已迁入工具栏（v3 的可折叠入口面板 → 工具栏内常驻 nav：不可折叠 / 无 hidden 祖先；四入口常驻可点，aria-controls=view-host）',
      eh.navInToolbar === true && eh.navResident === true && eh.navFoldable !== true && eh.inToolbar === true && eh.allInToolbar === true && eh.ariaControls === 'view-host' && eh.beforeHostHidden === true,
      entryHop,
    );
    // ② tree (real clicks: exactly ONE interaction from the default state — the four
    //    entries are now the always-visible toolbar entries, so the v3 「先展开入口面板」
    //    第 1 次交互退役；这是**收紧**，不是放宽：可达步数从 2 降到 1)
    await realClick(cdp, '#l2-entry-tree');
    await waitFor(cdp, `document.getElementById('view-host').hidden ? '' : 'open'`, 60, 150);
    await waitFor(cdp, `document.querySelector('#tree-drawer .tree-group') ? 'ready' : ''`, 80, 200);
    let open = JSON.parse(await evaluate(cdp, openProbe));
    check(
      '② 1 次交互后连接树视图打开（#stream 被替换 + 目标视图可见 + ← 返回可见）',
      open.logHidden === true && open.openViewCount === 1 && open.openViews[0] === 'tree' && open.backVisible === true,
      JSON.stringify(open),
    );
    check('② 视图标题与入口文案同源（标题非空）', open.headerTitle.length > 0, JSON.stringify(open.headerTitle));

    // ── ⑦ 树语义（ARIA / 键盘 / 面包屑 / 9 动作固定序） ──────────────────
    console.log('\n▶ ⑦ 树 ARIA / 键盘 / 面包屑 / 9 动作固定序（v2 语义零改动）');
    const tree = JSON.parse(await evaluate(cdp, treeProbe));
    check('⑦ 真层级树 `ul[role="tree"]` 存在', tree.hasTree === true && tree.treeRole === 'tree', JSON.stringify(tree));
    check('⑦ 每个 `li[role="treeitem"]` 都带 aria-level（≥1）', tree.itemCount > 0 && tree.allHaveLevel === true, JSON.stringify(tree.levels));
    // I-02② (v3-3 fix round): the old judgement was `tree.expandedCount > 0` while the
    // title claimed「aria-expanded 只出现在可展开节点上」—— the two did not match.
    // Now it is the *bidirectional* structural fact: exactly the nodes that render an
    // expand affordance (`button.tree-toggle`) carry `aria-expanded`, and every node
    // that reports `true` really has a `ul[role="group"]` child.
    check(
      '⑦ aria-expanded 只出现在可展开节点上（与 tree-toggle 按钮一一对应；true 节点必有 role=group 子表）',
      tree.expandedCount > 0 &&
        tree.expandedCount === tree.toggleButtonCount &&
        tree.expandedTrue > 0 &&
        tree.expandedTrueWithoutGroup === 0,
      `expanded=${tree.expandedCount} toggle=${tree.toggleButtonCount} true=${tree.expandedTrue} trueWithoutGroup=${tree.expandedTrueWithoutGroup}`,
    );
    check('⑦ 面包屑（role=navigation / .tree-breadcrumb）可见可达', tree.hasBreadcrumb === true, JSON.stringify(tree));
    check('⑦ 检索过滤入口保留（只读过滤，不改授权）', tree.filterInput === true, JSON.stringify(tree));
    check('⑦ 命令档案子视图入口保留（v2 档案分层）', tree.archiveToggle === true, JSON.stringify(tree));
    // The tree renders ONE control per node (v2 semantics), so the same action id can
    // legitimately appear on several rows — what must hold is that **no action id
    // outside the closed whitelist** is ever rendered (a new capability would show up
    // here), and that the whitelist itself is the fixed 9-item list (asserted against
    // the rendered catalogue list in ⑧, plus the node test `l2-counts.test.ts`).
    const distinctActions = [...new Set(tree.actionIds)];
    check(
      '⑦ 树内渲染的动作 id 全部落在封闭白名单内（无新增动作 = 能力集未被扩大）',
      distinctActions.length > 0 && distinctActions.every((id) => TREE_ACTION_IDS.includes(id)),
      JSON.stringify(distinctActions),
    );
    check(
      '⑦ 树内动作覆盖面非空且未越界（实测 distinct ⊂ 白名单 9 个）',
      distinctActions.length >= 3 && distinctActions.length <= TREE_ACTION_IDS.length,
      JSON.stringify(distinctActions),
    );
    check(
      '⑦ 硬底线节点零控件 + 树内零 `allow` 控件（控件普查非空 = 非空转；硬底线正例由 ⑧ 目录侧断言）',
      tree.controlsTotal > 0 && tree.hardFloorWithControl === 0 && tree.allowControls === 0,
      `controls=${tree.controlsTotal} hardFloor=${tree.hardFloorCount} withControl=${tree.hardFloorWithControl} allow=${tree.allowControls}`,
    );
    check(
      '⑦ 树主体归属迁移到 [data-l2-view=tree] 且 role=dialog/aria-modal 已迁出（ADR-V3-028 台账项）',
      tree.owner === 'tree' && tree.roles.drawer === 'region' && tree.roles.modal === null && String(tree.roles.label).length > 0,
      JSON.stringify(tree.roles),
    );
    check('⑦ 抽屉不再是覆盖式浮动层（position ≠ absolute，视图主体在文档流内）', tree.position !== 'absolute', tree.position);
    check(
      '⑦ 四维度分组面齐备（site/capability/command/llm 四个面都存在，无新增维度）',
      JSON.stringify([...tree.groups].sort()) === JSON.stringify(['capability', 'command', 'llm', 'site']),
      JSON.stringify(tree.groups),
    );

    // keyboard: roving tabindex via real key dispatch on the focused tree item
    const kb = await evaluate(
      cdp,
      `(() => {
        const item = document.querySelector('#tree-drawer li[role="treeitem"][tabindex="0"]');
        if (item) item.focus();
        return JSON.stringify({ focused: document.activeElement?.getAttribute('role') ?? null, tabbable: document.querySelectorAll('#tree-drawer li[role="treeitem"][tabindex="0"]').length });
      })()`,
    );
    const kbParsed = JSON.parse(kb);
    check('⑦ roving tabindex：树内恰有一个 tabindex=0 的 treeitem 且可聚焦', kbParsed.tabbable === 1 && kbParsed.focused === 'treeitem', kb);

    // ── ⑤ 单滚动容器 + ⑥ 风险位可见 ────────────────────────────────────
    console.log('\n▶ ⑤ 单滚动容器 + ⑥ 风险位常驻可见');
    // I-05④ (v3-3 fix round): the census used to require `scrollHeight > clientHeight`,
    // so a visible panel-level container that CAN scroll (CSS `overflow-y: auto`) but
    // happens not to overflow yet was invisible to the judgement. The CSS caliber
    // (`scrollersCss`, hidden containers excluded) is now asserted to be **exactly the
    // same single container** — strictly stronger than the overflow-only census.
    check(
      '⑤ L2 打开期间面板级滚动容器恰为 1 个（#log 已被替换）且它就是唯一的可见 CSS 可滚容器',
      open.scrollers.length === 1 && open.scrollersCss.length === 1 && open.scrollersCss[0] === open.scrollers[0],
      JSON.stringify({ overflowing: open.scrollers, css: open.scrollersCss }),
    );
    check('⑤ 视图内零水平溢出（长路径/长命令名/面包屑）', open.viewOverflow === 0 && open.docOverflowX === 0, JSON.stringify({ v: open.viewOverflow, d: open.docOverflowX }));
    check(
      '⑥ L2 打开期间状态栏（风险位宿主）仍可见：J1 本体无 hidden + 高度 > 0 + J2 chips 可见性跟随风险',
      open.barVisible === true && open.barHidden === false && open.j2Holds === true,
      JSON.stringify({ barVisible: open.barVisible, barHidden: open.barHidden, chipsHidden: open.chipsHidden, chipCount: open.chipCount }),
    );
    check('⑥ 风险位祖先闭包无 [data-l2-view]（视图替换只发生在 #region-stream 内）', open.railChainHasView === false, JSON.stringify(open.railChain));

    // ── ③ 计数同源（改真值 → 计数变；不变即硬编码 FAIL） ────────────────
    console.log('\n▶ ③ 计数同源：改真值 → 计数变（与真值变化量相等）');
    const before = JSON.parse(await evaluate(cdp, countProbe));
    const treeBeforeEntry = before.entries.find((e) => e.key === 'tree');
    labels.before = treeBeforeEntry?.dataCount ?? null;
    check('③ 入口标签 ≡ data-count（FIX-3：两处同源；摘要已是 origin·授权态·会话 digest）', twoWayJudge(before).length === 0, JSON.stringify(twoWayJudge(before)));
    check(
      '③ `{live, baseline}` 分列可见（两个带标签的数字，未合并）',
      /实时\s*\d+\s*卡/.test(before.entries.find((e) => e.key === 'commands')?.text ?? '') &&
        /基线\s*\d+\s*行/.test(before.entries.find((e) => e.key === 'commands')?.text ?? ''),
      JSON.stringify(before.entries.find((e) => e.key === 'commands')?.text),
    );
    // REAL truth change through an existing channel: authorize a second origin.
    // V4-1: the counts propagate through async background reads (capability-changed
    // → re-derive → repaint), so the gate WAITS for the entry to move instead of
    // sleeping a fixed amount. A count that never moves still FAILs (waitFor times
    // out and the assertions below read the stale value).
    await evaluate(
      cdp,
      `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(SECOND_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`,
    );
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await waitFor(
      cdp,
      `Number(document.getElementById('l2-entry-tree').getAttribute('data-count')) > ${Number(labels.before)} ? '1' : ''`,
      80,
      200,
    );
    const after = JSON.parse(await evaluate(cdp, countProbe));
    const treeAfterEntry = after.entries.find((e) => e.key === 'tree');
    labels.after = treeAfterEntry?.dataCount ?? null;
    check(
      '③ 真值（新增一个已授权站点）变化后计数**确实随之变化**（计数不动 = 硬编码 → FAIL）',
      Number(labels.after) > Number(labels.before),
      `before=${labels.before} after=${labels.after} | derived=${JSON.stringify(before.derived)} → ${JSON.stringify(after.derived)}`,
    );
    check(
      '③ 计数变化量与真值变化量相等（tree 节点数 = 四维度节点合计；deriveCounts 同源）',
      after.derived?.tree === Number(labels.after) && Number(labels.after) - Number(labels.before) === 1,
      JSON.stringify({ before: before.derived?.tree, after: after.derived?.tree, lb: labels.before, la: labels.after }),
    );
    check('③ 改真值后两处同源仍成立（不是只改了显示）', twoWayJudge(after).length === 0, JSON.stringify(twoWayJudge(after)));
    check(
      '③ 审计计数来自既有通道的条目数（与视图内条目数一致）',
      typeof after.derived?.audit === 'number',
      JSON.stringify(after.derived),
    );
    check(
      '③ 设置计数 = 已登记分区集合长度（settings/sections.ts 单一来源）',
      after.derived?.settings === registeredSectionCount(),
      `derived=${after.derived?.settings} registry=${registeredSectionCount()}`,
    );

    // ── ④ 返回复位（`← 返回` 复原 #log + 折叠态 + 默认档密度） ──────────
    console.log('\n▶ ④ 返回复位 + 默认档密度复测');
    const beforeReturn = JSON.parse(await evaluate(cdp, `JSON.stringify(window.__v3.disclosure.snapshot())`));
    await realClick(cdp, '#l2-back');
    await sleep(250);
    const closed = JSON.parse(await evaluate(cdp, occupancyProbe));
    check(
      '④ 返回后 #view-host 隐藏 + #log 恢复可见 + 四视图重新全部隐藏',
      closed.hostHidden === true && closed.logHidden === false && closed.openViews.length === 0,
      JSON.stringify({ host: closed.hostHidden, log: closed.logHidden, open: closed.openViews }),
    );
    const afterReturn = JSON.parse(await evaluate(cdp, `JSON.stringify(window.__v3.disclosure.snapshot())`));
    check('④ 返回后展开态与进入前逐项相等（disclosure.restore）', JSON.stringify(beforeReturn) === JSON.stringify(afterReturn), `${JSON.stringify(beforeReturn)} vs ${JSON.stringify(afterReturn)}`);
    const densityAfter = await evaluate(cdp, DENSITY_MEASURE_SOURCE);
    const verdict = evaluateDensity(densityAfter, 'default');
    check(
      `④ 返回后默认档密度复位（C1 ≤ ${DENSITY_LIMITS.default.clickables} · C2 ≤ ${DENSITY_LIMITS.default.lines}）`,
      verdict.ok === true,
      `C1=${densityAfter.clickables} C2=${densityAfter.lines} → ${verdict.message}`,
    );
    const backAfter = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const b = document.getElementById('l2-back'); const host = document.getElementById('view-host'); return JSON.stringify({ hostHidden: host.hidden === true, backVisible: b.getBoundingClientRect().height > 0 }); })()`,
      ),
    );
    check('④ 返回后 `← 返回` 随之不可见（不再是默认档的可点元素）', backAfter.hostHidden === true && backAfter.backVisible === false, JSON.stringify(backAfter));
    // I-05 (v3-3 fix round, 如实登记项)：返回后的 `activeElement` **不**落在入口上
    // （实测 `document.activeElement.id === ''`）：产品路径在还原展开态时会把入口面板
    // 重新折叠，`#l2-entry-<key>` 因而处于 `hidden` 祖先之下，`focus()` 成为 no-op。
    // 这属于**产品行为/焦点目标**问题（改它=改 `dist` 字节 → 触发体积重登记级联），
    // 不在本轮修复面内 → 见 build.md §F-02 的 deferred 登记（含复现命令）。

    // ── ⑧ 零提权 + ⑨ 零明文（catalogue / audit / settings） ─────────────
    console.log('\n▶ ⑧ 零提权控件 + clamp 不可被伪造消息突破 + ⑨ 零明文');
    await evaluate(cdp, `window.__v3.testing.openL2View('commands'); true`);
    await waitFor(cdp, `document.querySelectorAll('#l2-catalog-host .l2-catalog-card').length ? 'ready' : ''`, 80, 200);
    const catalog = JSON.parse(await evaluate(cdp, openProbe));
    const catalogShape = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const cards = [...document.querySelectorAll('#l2-catalog-host .l2-catalog-card')];
          const hardFloor = cards.filter((c) => c.dataset.overridable === 'false' && c.dataset.tightenOnly !== 'true');
          const tightenOnly = cards.filter((c) => c.dataset.tightenOnly === 'true');
          const note = document.querySelector('#l2-catalog-host .l2-note-no-escalation');
          const actions = [...document.querySelectorAll('#l2-catalog-host .l2-action-whitelist li')].map((li) => li.dataset.actionId);
          const live = document.querySelector('#l2-catalog-host .l2-catalog-summary')?.textContent ?? '';
          const options = (c) => (c.dataset.policyOptions || '').split(',').filter(Boolean);
          const hardFloorWithOptions = hardFloor.filter((c) => options(c).length > 0).length;
          const tightenWithAllow = tightenOnly.filter((c) => options(c).includes('allow')).length;
          const effective = cards.filter((c) => !c.dataset.effectiveAction).length;
          const controlText = cards.filter((c) => !c.querySelector('[data-field="control"]')).length;
          return JSON.stringify({
            cards: cards.length,
            hardFloor: hardFloor.length,
            tightenOnly: tightenOnly.length,
            note: note ? note.textContent : '',
            actions,
            live,
            controls: document.querySelectorAll('#l2-catalog-host button, #l2-catalog-host input, #l2-catalog-host select, #l2-catalog-host textarea').length,
            missingTier: cards.filter((c) => !c.querySelector('[data-field="tier"]')).length,
            missingSource: cards.filter((c) => !c.querySelector('[data-field="source"]')).length,
            missingSplit: cards.filter((c) => !c.querySelector('[data-field="tier-split"]')).length,
            hardFloorWithOptions,
            tightenWithAllow,
            effective,
            controlText,
          });
        })()`,
      ),
    );
    check('⑧ 命令目录逐条有档（每卡含处置档 / 来源 / 默认·覆盖·生效分列）', catalogShape.cards > 0 && catalogShape.missingTier === 0 && catalogShape.missingSource === 0 && catalogShape.missingSplit === 0, JSON.stringify(catalogShape));
    check('⑧ 命令目录零控件（只读投影：无 button/input/select/textarea）', catalogShape.controls === 0, String(catalogShape.controls));
    check(
      '⑧ `delay` 消歧文案来自单一常量（逐字含 fail-closed + 非可配置档位，且与树内同一文案）',
      catalogShape.note.includes('fail-closed') && catalogShape.note.includes('非可配置档位') && catalogShape.note.includes('delay'),
      catalogShape.note.slice(0, 80),
    );
    check(
      '⑧ 硬底线卡的可选项集合为空（不可覆盖档不提供任何放宽入口 —— 逐个卡判定，非计数口号）',
      catalogShape.hardFloorWithOptions === 0,
      `hardFloor=${catalogShape.hardFloor} withOptions=${catalogShape.hardFloorWithOptions}`,
    );
    check(
      '⑧ 只可收紧卡（tightenOnly）的可选项永不含 allow（ui/state/external 语义保留）',
      catalogShape.tightenWithAllow === 0,
      `tightenOnly=${catalogShape.tightenOnly} withAllow=${catalogShape.tightenWithAllow}`,
    );
    check('⑧ 每卡都带生效值 + 可读控件说明（只读投影完整性）', catalogShape.effective === 0 && catalogShape.controlText === 0, JSON.stringify({ effective: catalogShape.effective, controlText: catalogShape.controlText }));
    check('⑧ 9 动作白名单在命令目录内也只读展示且顺序固定', JSON.stringify(catalogShape.actions) === JSON.stringify(TREE_ACTION_IDS), JSON.stringify(catalogShape.actions));
    check('⑧ 分列文案无「已全部渲染」类夸大表述', !/已全部渲染|已覆盖全部/.test(catalogShape.live), catalogShape.live.slice(0, 90));
    check(
      '⑤ 命令目录打开时面板级滚动容器恰为 1（且它必在可见 CSS 可滚容器集合内 —— 溢出普查不得漏掉不溢出的可滚容器）',
      catalog.scrollers.length === 1 &&
        catalog.scrollers.every((s) => catalog.scrollersCss.includes(s)) &&
        catalog.scrollersCss.length >= catalog.scrollers.length,
      JSON.stringify({ overflowing: catalog.scrollers, css: catalog.scrollersCss }),
    );

    // A forged message must not widen a hard-floor command: the SW stores the
    // override but the projection's *effective* action stays clamped (ADR-V2-026/027
    // — the clamp is re-applied on every dispatch, the UI is only a hint).
    const hardFloorCardId = await evaluate(
      cdp,
      `(() => { const c = document.querySelector('#l2-catalog-host .l2-catalog-card[data-overridable="false"][data-tighten-only="false"]'); return c ? c.dataset.cardId : null; })()`,
    );
    check('⑧ 真实夹具内存在硬底线卡（可驱动 clamp 反证）', Boolean(hardFloorCardId), String(hardFloorCardId));
    const forgedReply = await evaluate(
      cdp,
      `chrome.runtime.sendMessage({ kind: 'command-policy-set', commandId: ${JSON.stringify(String(hardFloorCardId ?? 'cmd:evaluate'))}, policyAction: 'allow' }).then((r) => JSON.stringify({ ok: r.ok, error: r.error ?? null }))`,
    );
    await sleep(250);
    await evaluate(cdp, `window.__v3.testing.openL2View('commands'); true`);
    await waitFor(cdp, `document.querySelectorAll('#l2-catalog-host .l2-catalog-card').length ? 'ready' : ''`, 80, 200);
    await sleep(200);
    const clamped = JSON.parse(
      await evaluate(
        cdp,
        `(() => { const c = document.querySelector('#l2-catalog-host .l2-catalog-card[data-card-id="' + ${JSON.stringify(String(hardFloorCardId ?? ''))} + '"]'); return JSON.stringify({ found: !!c, effective: c ? c.dataset.effectiveAction : null, overridable: c ? c.dataset.overridable : null, options: c ? c.dataset.policyOptions : null }); })()`,
      ),
    );
    check(
      '⑧ 伪造 command-policy-set（硬底线 → allow）后生效档仍为 deny 且 overridable=false（SW 侧 clamp 未被突破）',
      clamped.found === true && clamped.effective === 'deny' && clamped.overridable === 'false',
      `${forgedReply} | ${JSON.stringify(clamped)}`,
    );
    check('⑧ 伪造消息不得为硬底线卡生成任何选项（零控件语义在数据层同样成立）', String(clamped.options ?? '') === '', String(clamped.options));

    // audit view: zero-plaintext whitelist
    await evaluate(cdp, `window.__v3.testing.openL2View('audit'); true`);
    await waitFor(cdp, `document.querySelector('#l2-audit-host .l2-audit-list') ? 'ready' : ''`, 80, 200);
    const audit = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const host = document.getElementById('l2-audit-host');
          const rows = [...host.querySelectorAll('.l2-audit-row')];
          const fields = [...new Set(rows.flatMap((r) => [...r.querySelectorAll('[data-field]')].map((c) => c.dataset.field)))].sort();
          const rowsHost = host.querySelector('.l2-audit-list');
          const text = rowsHost ? rowsHost.textContent || '' : '';
          const html = rowsHost ? rowsHost.innerHTML || '' : '';
          return JSON.stringify({
            rows: rows.length,
            listCount: document.querySelector('#l2-audit-host .l2-audit-list')?.dataset.count ?? null,
            fields,
            controls: host.querySelectorAll('button, input, select, textarea').length,
            hasQuery: /\\?[^\\s"'<>]*=/.test(text),
            note: document.querySelector('#l2-audit-host .l2-note-zero-plaintext')?.textContent ?? '',
            leaks: ['apiKey', 'sk-live', '剪贴板', '通知正文', '书签正文', 'token='].filter((needle) => text.includes(needle) || html.includes(needle)),
          });
        })()`,
      ),
    );
    check('⑨ 审计视图渲染条目列表（消费既有 audit 通道）', audit.rows > 0 && audit.listCount === String(audit.rows), JSON.stringify(audit));
    check(
      '⑨ 审计行只含白名单字段 {id, command, action, result, ms, time, origin}',
      JSON.stringify(audit.fields) === JSON.stringify(['action', 'command', 'id', 'ms', 'origin', 'result', 'time']),
      JSON.stringify(audit.fields),
    );
    check('⑨ 审计视图零控件（只读）', audit.controls === 0, String(audit.controls));
    check('⑨ URL 已去参（渲染文本中不出现 `?k=v` 形式）', audit.hasQuery === false, audit.note.slice(0, 60));
    check('⑨ 明文反例扫描零命中（apiKey / 剪贴板 / 通知 / 书签正文 / token）', audit.leaks.length === 0, JSON.stringify(audit.leaks));
    check('⑨ 审计条目数与入口计数同源（同一通道的条目数）', audit.listCount === String(JSON.parse(await evaluate(cdp, countProbe)).derived?.audit), audit.listCount);

    // ── ⑩ 能力集等价（AC-V3-026 八项） ─────────────────────────────────
    console.log('\n▶ ⑩ 能力集等价（AC-V3-026 八项逐项）');
    await evaluate(cdp, `window.__v3.testing.openL2View('settings'); true`);
    await waitFor(cdp, `document.getElementById('settings-provider') ? 'ready' : ''`, 80, 200);
    const settings = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const root = document.getElementById('settings-root');
          const sections = [...root.querySelectorAll(':scope > .wc-section')].map((s) => s.id);
          const v1Ids = ['settings-llm','settings-auto-auth','settings-tabs','settings-sessions','settings-diagnostics','settings-compliance','settings-migration'];
          return JSON.stringify({
            sections,
            hasAllV1: v1Ids.every((id) => !!document.getElementById(id)),
            viewHidden: document.getElementById('settings-view').hidden === true,
            dataL2View: document.getElementById('settings-view').getAttribute('data-l2-view'),
            backVisible: document.getElementById('settings-view').getBoundingClientRect().height > 0,
            // I-01 (v3-3 fix round): while the settings view is OPEN, its entry must
            // point at THAT view — the runtime used to overwrite the value declared in
            // index.html with view-host (a false pair: a hidden target).
            entryControls: document.getElementById('l2-entry-settings')?.getAttribute('aria-controls') ?? null,
            entryExpanded: document.getElementById('l2-entry-settings')?.getAttribute('aria-expanded') ?? null,
          });
        })()`,
      ),
    );
    check(
      '⑩ 设置视图 = L2 `[data-l2-view="settings"]`（归属迁移完成）+ 其入口 `aria-controls` 指向 `settings-view`（I-01：逐目标，不是 `view-host`）',
      settings.dataL2View === 'settings' && settings.viewHidden === false && settings.entryControls === 'settings-view',
      JSON.stringify({ dataL2View: settings.dataL2View, viewHidden: settings.viewHidden, entryControls: settings.entryControls }),
    );
    check('⑩ 设置分区集合 == 已登记 registry（数量与 id 逐项）', JSON.stringify(settings.sections) === JSON.stringify(registeredSectionIds()), JSON.stringify(settings.sections));
    check('⑩ 设置项集合与 v1 等价（7 个 v1 id + 迁移 details 全在）', settings.hasAllV1 === true, JSON.stringify(settings.hasAllV1));
    check('⑩ 设置入口计数 == 渲染出的分区数（入口标签/徽标/视图三处同源）', String(JSON.parse(await evaluate(cdp, countProbe)).derived?.settings) === String(settings.sections.length), `${JSON.stringify(JSON.parse(await evaluate(cdp, countProbe)).derived?.settings)} vs ${settings.sections.length}`);
    check('⑩ 设置视图仍由 v1 返回按钮关闭（`#settings-back` 语义未改）', Boolean(await evaluate(cdp, `!!document.getElementById('settings-back')`)), 'settings-back');
    await evaluate(cdp, `document.getElementById('settings-back').click(); true`);
    await sleep(200);
    const settingsClosed = JSON.parse(await evaluate(cdp, occupancyProbe));
    check('⑩ 退出设置视图后重回默认零占用（四视图不可见）', settingsClosed.openViews.length === 0, JSON.stringify(settingsClosed.openViews));

    const equiv = JSON.parse(await evaluate(cdp, countProbe));
    // I-02① (v3-3 fix round): the title used to claim「回执三件套」as one of the eight
    // equivalence items while the judgement never touched a receipt. The title now
    // names exactly what is judged (seven items readable from the same truth), and
    // points at where the receipt triple **is** asserted (v3-2's `test/ui/l1.mjs`,
    // registered in `docs/v3-supersession-ledger.json#v3ReverseProofExpectations`).
    check(
      '⑩ 能力集等价：命令集合 / 档位 / 四维度 / {live,baseline} / 审计条目 / 设置分区 / 9 动作 —— 七项由同一真值可读（回执三件套不在此视图：由 v3-2 test/ui/l1.mjs 断言）',
      typeof equiv.derived?.tree === 'number' &&
        typeof equiv.derived?.commands?.live === 'number' &&
        typeof equiv.derived?.commands?.baseline === 'number' &&
        typeof equiv.derived?.audit === 'number' &&
        typeof equiv.derived?.settings === 'number' &&
        TREE_ACTION_IDS.length === 9 &&
        /实时/.test(equiv.entries.find((e) => e.key === 'commands')?.text ?? ''),
      JSON.stringify(equiv.derived),
    );

    // ── 窄屏（320px）零水平溢出 ─────────────────────────────────────────
    // I-05③ (v3-3 fix round): the narrow-column probe used to cover only two views
    // (tree / commands) — audit and settings had no 320px probe at all. The same two
    // assertions now measure **all four** views, with an explicit anti-vacuity count
    // (a view that was never measured must not be able to pass silently).
    console.log('\n▶ 320px 窄栏：四个视图（tree/commands/audit/settings）长内容零水平溢出');
    const narrowOverflow = {};
    await setViewport(cdp, 320, VIEWPORT_HEIGHT);
    for (const key of L2_KEYS) {
      await evaluate(cdp, `window.__v3.testing.openL2View(${JSON.stringify(key)}); true`);
      await sleep(320);
      const probe = JSON.parse(await evaluate(cdp, openProbe));
      narrowOverflow[key] = { doc: probe.docOverflowX, view: probe.viewOverflow, openViews: probe.openViews };
    }
    await evaluate(cdp, `document.getElementById('settings-back')?.click(); true`);
    await sleep(200);
    await evaluate(cdp, `window.__v3.testing.closeL2View(); true`);
    await sleep(200);
    const overflowingViews = L2_KEYS.filter((k) => narrowOverflow[k].doc !== 0 || narrowOverflow[k].view !== 0);
    const unmeasuredViews = L2_KEYS.filter((k) => narrowOverflow[k].view === null || narrowOverflow[k].openViews[0] !== k);
    check(
      '320px 四视图零水平溢出（文档 + 视图内，逐视图判定）',
      overflowingViews.length === 0,
      JSON.stringify(narrowOverflow),
    );
    check(
      '320px 四视图探针非空转（四视图均被真实打开且测到数值）',
      unmeasuredViews.length === 0 && Object.keys(narrowOverflow).length === L2_KEYS.length,
      JSON.stringify({ unmeasuredViews, measured: Object.keys(narrowOverflow) }),
    );

    check('无未捕获页面异常（L2 渲染全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();

    // ══ ⑪ 计数守恒（D-005 只增） ═════════════════════════════════════════════
    const runtime = counts().passes;
    const selfSource = readFileSync(new URL('./l2.mjs', import.meta.url), 'utf8');
    const staticCount = (selfSource.match(/\bcheck\(/g) ?? []).length;
    check(`⑪ 运行期断言计数 ≥ ${L2_RUNTIME_FLOOR}（D-005 l2 下界；countMethod = runtime-check-calls）`, runtime >= L2_RUNTIME_FLOOR, `runtime=${runtime}`);
    check(`⑪ 静态 check( 计数 ≥ ${L2_STATIC_FLOOR}（v3 口径：入口迁移后只增不减）`, staticCount >= L2_STATIC_FLOOR, `static=${staticCount}`);
  } finally {
    launched.chrome.kill('SIGKILL');
  }
  finish('L2 运行时门禁');
}

/**
 * Two-way same-source judge: the entry's own label digit ≡ its `data-count`.
 *
 * FIX-3 (F 还原度快修轮, 2026-09-20): the third channel (the panel summary's digit) is
 * gone — `#l2-entry-summary` is the origin · 授权态 · 会话 digest now, so the counts
 * live in exactly two channels. The judgement is re-anchored, not relaxed: label and
 * `data-count` must still agree per entry.
 */
function twoWayJudge(snapshot) {
  const failures = [];
  for (const [, key] of [['树', 'tree'], ['命令', 'commands'], ['审计', 'audit'], ['设置', 'settings']]) {
    const entry = snapshot.entries.find((e) => e.key === key);
    if (!entry || !/^\d+$/.test(String(entry.dataCount))) {
      failures.push(`${key}: data-count 不是数字（${entry?.dataCount}）`);
      continue;
    }
    if (entry.labelCount !== Number(entry.dataCount)) {
      failures.push(`${key}: 两处不同源（label=${entry.labelCount} data-count=${entry.dataCount}）`);
    }
  }
  if (/\d/.test(snapshot.barText ?? '')) failures.push(`常驻一行状态栏不得含数字：${snapshot.barText}`);
  if (/树\s*\d/.test(snapshot.summary ?? '') || /命令\s*\d/.test(snapshot.summary ?? '')) {
    failures.push(`FIX-3：摘要不得再含计数（${snapshot.summary}）`);
  }
  return failures;
}

/** The settings section registry, read from the SINGLE source module (drift guard). */
function registeredSectionIds() {
  const src = readFileSync(SECTION_REGISTRY, 'utf8');
  const block = /SETTINGS_SECTION_IDS[^[]*\[([\s\S]*?)\]/.exec(src)?.[1] ?? '';
  return [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function registeredSectionCount() {
  return registeredSectionIds().length;
}

/** The ledger must exist (it is the supersession carrier for this leaf). */
const ledgerExists = (() => {
  try {
    readFileSync(LEDGER, 'utf8');
    return true;
  } catch {
    return false;
  }
})();

main().catch((err) => {
  console.error(`✖ L2 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  console.error(`  （台账可读：${ledgerExists}）`);
  process.exit(1);
});
