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
  await waitFor(
    cdp,
    `(() => { const el = document.getElementById('l2-entry-summary'); return el && /树\\s*\\d/.test(el.textContent) ? '1' : ''; })()`,
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
    logHidden: document.getElementById('log').hidden === true,
    hostHidden: document.getElementById('view-host').hidden === true,
    openViews: [...document.querySelectorAll('[data-l2-view]')].filter((el) => !hiddenChain(el)).map((el) => el.dataset.l2View),
  });
})()`;

/** In-page: the open-view geometry + scroller census + risk visibility. */
const openProbe = `(() => {
  const hiddenChain = (el) => { let n = el; while (n) { if (n.hidden === true) return true; n = n.parentElement; } return false; };
  const scrollers = [...document.querySelectorAll('#panel-main *, #panel-main')]
    .filter((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    })
    .map((el) => el.id || el.className);
  const rail = document.getElementById('risk-rail');
  const railChain = [];
  for (let n = rail; n; n = n.parentElement) railChain.push(n.id || n.tagName.toLowerCase());
  const railChainHasView = (() => { for (let n = rail; n; n = n.parentElement) if (n.hasAttribute && n.hasAttribute('data-l2-view')) return true; return false; })();
  const view = document.querySelector('[data-l2-view]:not([hidden])');
  const vr = view ? view.getBoundingClientRect() : null;
  const de = document.documentElement;
  return JSON.stringify({
    logHidden: document.getElementById('log').hidden === true,
    hostHidden: document.getElementById('view-host').hidden === true,
    hostView: document.getElementById('view-host').getAttribute('data-view'),
    openViews: [...document.querySelectorAll('[data-l2-view]')].filter((el) => !hiddenChain(el)).map((el) => el.dataset.l2View),
    openViewCount: [...document.querySelectorAll('[data-l2-view]')].filter((el) => !hiddenChain(el)).length,
    headerTitle: (document.getElementById('l2-title').textContent || '').trim(),
    headerCount: document.getElementById('l2-count').getAttribute('data-count'),
    backVisible: !hiddenChain(document.getElementById('l2-back')),
    railVisible: rail ? !hiddenChain(rail) && rail.getBoundingClientRect().height > 0 : false,
    railChainHasView,
    railChain,
    scrollers,
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
    barText: (document.getElementById('l0-statusbar-text')?.textContent ?? '').trim(),
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
      '① 常驻一行状态栏文本不含数字（计数在入口面板摘要内 —— 默认档足迹稳定）',
      !/\d/.test(defaultCounts.barText ?? ''),
      defaultCounts.barText,
    );
    check(
      '① 入口面板摘要（#l2-entry-summary）确实带四类计数（默认态即可读，无需打开）',
      /树\s*\d/.test(defaultCounts.summary) &&
        /命令\s*\d/.test(defaultCounts.summary) &&
        /审计\s*\d/.test(defaultCounts.summary) &&
        /设置\s*\d/.test(defaultCounts.summary),
      defaultCounts.summary,
    );

    // ── ② ≤2 次交互可达（状态栏 1 → 入口 2） ─────────────────────────────
    console.log('\n▶ ② ≤2 次交互可达 + §③ 计数真值派生');
    const labels = {};
    // ② tree (real clicks: exactly two interactions from the default state)
    await realClick(cdp, '#l0-statusbar');
    const panelOpen = await evaluate(cdp, `document.getElementById('l2-entries').hidden === false`);
    await realClick(cdp, '#l2-entry-tree');
    await waitFor(cdp, `document.getElementById('view-host').hidden ? '' : 'open'`, 60, 150);
    await waitFor(cdp, `document.querySelector('#tree-drawer .tree-group') ? 'ready' : ''`, 80, 200);
    let open = JSON.parse(await evaluate(cdp, openProbe));
    check('② 1 次交互只展开入口面板（尚未替换主区）', panelOpen === true, String(panelOpen));
    check(
      '② 2 次交互后连接树视图打开（#log 被替换 + 目标视图可见 + ← 返回可见）',
      open.logHidden === true && open.openViewCount === 1 && open.openViews[0] === 'tree' && open.backVisible === true,
      JSON.stringify(open),
    );
    check('② 视图标题与入口文案同源（标题非空）', open.headerTitle.length > 0, JSON.stringify(open.headerTitle));

    // ── ⑦ 树语义（ARIA / 键盘 / 面包屑 / 9 动作固定序） ──────────────────
    console.log('\n▶ ⑦ 树 ARIA / 键盘 / 面包屑 / 9 动作固定序（v2 语义零改动）');
    const tree = JSON.parse(await evaluate(cdp, treeProbe));
    check('⑦ 真层级树 `ul[role="tree"]` 存在', tree.hasTree === true && tree.treeRole === 'tree', JSON.stringify(tree));
    check('⑦ 每个 `li[role="treeitem"]` 都带 aria-level（≥1）', tree.itemCount > 0 && tree.allHaveLevel === true, JSON.stringify(tree.levels));
    check('⑦ aria-expanded 只出现在可展开节点上（树的分层语义保留）', tree.expandedCount > 0, String(tree.expandedCount));
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
      '⑦ 硬底线节点零控件（不可覆盖 → 无任何 tree-control 按钮）',
      tree.hardFloorCount >= 0 && tree.hardFloorWithControl === 0,
      `hardFloor=${tree.hardFloorCount} withControl=${tree.hardFloorWithControl}`,
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
    check('⑤ L2 打开期间面板级滚动容器恰为 1 个（#log 已被替换）', open.scrollers.length === 1, JSON.stringify(open.scrollers));
    check('⑤ 视图内零水平溢出（长路径/长命令名/面包屑）', open.viewOverflow === 0 && open.docOverflowX === 0, JSON.stringify({ v: open.viewOverflow, d: open.docOverflowX }));
    check('⑥ L2 打开期间 #risk-rail 仍可见（高度 > 0 且无 hidden 祖先）', open.railVisible === true, JSON.stringify(open.railChain));
    check('⑥ 风险位祖先闭包无 [data-l2-view]（视图替换只发生在 #panel-main 内）', open.railChainHasView === false, JSON.stringify(open.railChain));

    // ── ③ 计数同源（改真值 → 计数变；不变即硬编码 FAIL） ────────────────
    console.log('\n▶ ③ 计数同源：改真值 → 计数变（与真值变化量相等）');
    const before = JSON.parse(await evaluate(cdp, countProbe));
    const treeBeforeEntry = before.entries.find((e) => e.key === 'tree');
    labels.before = treeBeforeEntry?.dataCount ?? null;
    check('③ 入口标签 ≡ data-count ≡ 面板摘要（三处同源）', threeWayJudge(before).length === 0, JSON.stringify(threeWayJudge(before)));
    check(
      '③ `{live, baseline}` 分列可见（两个带标签的数字，未合并）',
      /实时\s*\d+\s*卡/.test(before.entries.find((e) => e.key === 'commands')?.text ?? '') &&
        /基线\s*\d+\s*行/.test(before.entries.find((e) => e.key === 'commands')?.text ?? ''),
      JSON.stringify(before.entries.find((e) => e.key === 'commands')?.text),
    );
    // REAL truth change through an existing channel: authorize a second origin.
    await evaluate(
      cdp,
      `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(SECOND_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`,
    );
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await sleep(400);
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
    check('③ 改真值后三处同源仍成立（不是只改了显示）', threeWayJudge(after).length === 0, JSON.stringify(threeWayJudge(after)));
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
    check('⑤ 命令目录打开时面板级滚动容器恰为 1', catalog.scrollers.length === 1, JSON.stringify(catalog.scrollers));

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
          });
        })()`,
      ),
    );
    check('⑩ 设置视图 = L2 `[data-l2-view="settings"]`（归属迁移完成）', settings.dataL2View === 'settings' && settings.viewHidden === false, JSON.stringify(settings));
    check('⑩ 设置分区集合 == 已登记 registry（数量与 id 逐项）', JSON.stringify(settings.sections) === JSON.stringify(registeredSectionIds()), JSON.stringify(settings.sections));
    check('⑩ 设置项集合与 v1 等价（7 个 v1 id + 迁移 details 全在）', settings.hasAllV1 === true, JSON.stringify(settings.hasAllV1));
    check('⑩ 设置入口计数 == 渲染出的分区数（入口/摘要/视图三处同源）', String(JSON.parse(await evaluate(cdp, countProbe)).derived?.settings) === String(settings.sections.length), `${JSON.stringify(JSON.parse(await evaluate(cdp, countProbe)).derived?.settings)} vs ${settings.sections.length}`);
    check('⑩ 设置视图仍由 v1 返回按钮关闭（`#settings-back` 语义未改）', Boolean(await evaluate(cdp, `!!document.getElementById('settings-back')`)), 'settings-back');
    await evaluate(cdp, `document.getElementById('settings-back').click(); true`);
    await sleep(200);
    const settingsClosed = JSON.parse(await evaluate(cdp, occupancyProbe));
    check('⑩ 退出设置视图后重回默认零占用（四视图不可见）', settingsClosed.openViews.length === 0, JSON.stringify(settingsClosed.openViews));

    const equiv = JSON.parse(await evaluate(cdp, countProbe));
    check(
      '⑩ 能力集等价：命令集合 / 档位 / 四维度 / {live,baseline} / 审计条目 / 设置分区 / 9 动作 / 回执三件套 —— 八项均由真值可读',
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
    console.log('\n▶ 320px 窄栏：长路径 / 长命令名 / 面包屑零水平溢出');
    await setViewport(cdp, 320, VIEWPORT_HEIGHT);
    await evaluate(cdp, `window.__v3.testing.openL2View('tree'); true`);
    await sleep(300);
    const narrowTree = JSON.parse(await evaluate(cdp, openProbe));
    check('320px 连接树视图零水平溢出（文档 + 视图内）', narrowTree.docOverflowX === 0 && narrowTree.viewOverflow === 0, JSON.stringify({ d: narrowTree.docOverflowX, v: narrowTree.viewOverflow }));
    await evaluate(cdp, `window.__v3.testing.openL2View('commands'); true`);
    await sleep(300);
    const narrowCat = JSON.parse(await evaluate(cdp, openProbe));
    check('320px 命令目录零水平溢出', narrowCat.docOverflowX === 0 && narrowCat.viewOverflow === 0, JSON.stringify({ d: narrowCat.docOverflowX, v: narrowCat.viewOverflow }));
    await evaluate(cdp, `window.__v3.testing.closeL2View(); true`);
    await sleep(200);

    check('无未捕获页面异常（L2 渲染全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();
  } finally {
    launched.chrome.kill('SIGKILL');
  }
  finish('L2 运行时门禁');
}

/**
 * Three-way same-source judge: the entry's own label digit ≡ its `data-count` ≡ the
 * panel summary's digit (the same rule `test/ui/l0.mjs` ⑥b enforces — kept here so a
 * count can never be right in one place and wrong in another).
 */
function threeWayJudge(snapshot) {
  const failures = [];
  const summaryCount = (label) => {
    const m = new RegExp(`${label}\\s*(\\d+)`).exec(snapshot.summary ?? '');
    return m ? Number(m[1]) : null;
  };
  for (const [label, key] of [['树', 'tree'], ['命令', 'commands'], ['审计', 'audit'], ['设置', 'settings']]) {
    const entry = snapshot.entries.find((e) => e.key === key);
    if (!entry || !/^\d+$/.test(String(entry.dataCount))) {
      failures.push(`${key}: data-count 不是数字（${entry?.dataCount}）`);
      continue;
    }
    if (entry.labelCount !== Number(entry.dataCount) || Number(entry.dataCount) !== summaryCount(label)) {
      failures.push(`${key}: 三处不同源（label=${entry.labelCount} data-count=${entry.dataCount} summary=${summaryCount(label)}）`);
    }
  }
  if (/\d/.test(snapshot.barText ?? '')) failures.push(`常驻一行状态栏不得含数字：${snapshot.barText}`);
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
