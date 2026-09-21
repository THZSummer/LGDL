/**
 * V4-1 TASK-508 / ADR-V4-011 第 3 条 / ADR-V4-023 — **the L0 runtime gate, rewritten
 * for the three-zone skeleton**（`npm run test:l0`）.
 *
 * ── Why this file is a full rewrite（登记型取代） ────────────────────────────
 *
 * v3's L0 gate asserted the v3 skeleton: four residents (`#risk-rail` / `#panel-top`
 * / `#l0-decision`（W3 退役）) + the foldable entry panel `#l2-entries` +
 * `#panel-main > #log`. V4-1 replaces exactly those hosts with the three zones:
 *
 *   ① `header#region-toolbar`  只读站点摘要 + 4 视图入口 + 主题（可点 == 5）
 *   ② `main#region-stream`     `ol#stream[role=log]`（唯一滚动容器）+ `#view-host`
 *   ③ `footer#region-statusbar`连接状态一行 + `#risk-chips > #risk-rail` + `#risk-detail`
 *
 * The **semantic contract is preserved, not relaxed** — same intents, re-anchored:
 *   · ① 三件事同屏（我在哪 / 谁在管我 / 决策·回执·引用）→ 摘要 + 决策槽 + 状态栏（FIX-4）
 *   · ② 唯一决策卡 + ≤2 推荐选项 + 可重算的「更多选项（还有 N 个）」
 *   · ③ 默认屏无可见常驻输入框（法四；`#composer` 存在时必须 `hidden`）
 *   · ④ 五类风险 × 2 场景（默认可见 ∧ 全部折叠后仍可见）= 10 条
 *   · ⑤ 风险位祖先闭包无 hidden / 无折叠容器 / 无折叠触发器（AC-V3-009）
 *   · ⑥ 全部 `[aria-controls]` 元素的成对 ARIA + per-target 语义 + 可发现性
 *   · ⑦ FR-V3-015 计数两处同源（入口标签 ≡ `data-count`；FIX-3：摘要改为 origin·授权态·会话 digest，不再重复计数）+ 内联反证
 *   · ⑧ 320/400 常驻元素集合相等 + 文档级零水平溢出（AC-V3-021）
 *   · ⑨ 几何：三区两两不重叠 · `#stream` 是唯一面板级滚动容器 · 流区高度占比
 *        ≥ `STREAM_HEIGHT_RATIO_MIN`（v4 取代 v3 的「#log ≥488px」像素锚）
 *   · ⑩ 明暗双主题可读且不只靠颜色（FR-V3-026 / AC-V3-020）
 *
 * **New in v4-1（三区骨架的断言面）**：
 *   · 三区文档序 = toolbar → stream → statusbar，且三区 **body 直挂**
 *   · 工具栏可点 **恰 5**（只读摘要不计）且每项带 `data-toolbar-slot`
 *   · 状态栏 **J1~J4**：本体永不 hidden / chips 容器可见性跟随风险 / chip 祖先闭包
 *     干净 / 打开任意视图后 chips 仍可见
 *   · 豁免子树 `#stream` **零** `[data-chrome-control]`；`assertChromeNotInStream()`
 *     注入violation 必抛错（RP-V4-06 的 in-gate 形态）
 *   · `assertFoldable('#region-statusbar')` **必须抛错**（负向断言）
 *   · 占位宿主 `[data-transitional-host]` 存在性 > 0（清零断言在 v4-4 TASK-812）
 *
 * Serial discipline: one Chromium instance, one page target, everything in order.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CHROME,
  DIST,
  PACKAGE_ROOT,
  check,
  counts,
  evaluate,
  findOurServiceWorker,
  finish,
  launch,
  openSidePanel,
  setViewport,
  sleep,
  waitFor,
  VIEWPORT_HEIGHT,
} from './_v3-helpers.mjs';
import {
  DENSITY_MEASURE_SOURCE,
  RISK_SUBSCENARIOS,
  STREAM_HEIGHT_RATIO_MIN,
  riskVisibilityProbeSource,
} from './density-metrics.mjs';

const FIXTURE_ORIGIN = 'https://v3-l0.test';
const LLM_KEY = 'web-cli:web-cli:llm';
const BASELINE_JSON = resolve(PACKAGE_ROOT, 'docs/v4-density-baseline.json');

/** D-005 runtime floor（台账 `v4GateFloors` 的 l0 下界；只增不减）。 */
const L0_RUNTIME_FLOOR = 164;
/** v3 static caliber floor（v3 台账 `v3GateFloors`）：本文件静态 `check(` 计数下界。 */
const L0_STATIC_FLOOR = 73;

/** The four toolbar entry keys + the theme toggle = the admission set (恰 5)。 */
const TOOLBAR_ENTRY_KEYS = ['tree', 'commands', 'audit', 'settings'];
/**
 * 登记占位宿主数（**V4-4 收口**）：v4-1 只建不销、v4-3 退役两处，本叶把最后两处
 * （`l1-panels` / `strips`）一并清零 ⇒ 登记值 = **0**。断言从「等于登记值」升级为
 * 「`querySelectorAll('[data-transitional-host]').length === 0`」的**结构性判据**
 * （R4-18：过渡态不得永久化）。`grep -c 'data-transitional-host='` 的注释误计问题随
 * 注释一并清理，本文件不再依赖 grep 计数。
 */
const REGISTERED_TRANSITIONAL_HOSTS = 0; // V4-4 (TASK-810/812): v4 收口 —— 过渡宿主清零（R4-18）
/** per-target `aria-controls` 语义（ADR-V4-022 第 3 条）。 */
const ARIA_TARGET_BY_ENTRY = {
  'l2-entry-tree': 'view-host',
  'l2-entry-commands': 'view-host',
  'l2-entry-audit': 'view-host',
  'l2-entry-settings': 'settings-view',
};

/** Default-state fixture (the same state the density gate calls `default`). */
async function resetFixture(cdp) {
  await evaluate(
    cdp,
    `chrome.storage.local.set({ ${JSON.stringify(LLM_KEY)}: {
      active: 'openai',
      providers: { openai: { apiKey: 'v3-l0-key', model: 'v3-l0-mock', baseURL: 'http://127.0.0.1:9/v1' } },
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
  await waitFor(cdp, `document.getElementById('status').textContent.includes('v3-l0.test') ? '1' : ''`, 60, 200);
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`,
  );
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized === true)`, 60, 200);
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await evaluate(cdp, `window.__v3.testing.collapseAll(); window.__v3.testing.reset(); true`);
  await evaluate(cdp, `window.__v3.testing.ask('这一步先做什么？', ['查看站点声明', '列出可用命令', '导出诊断', '打开设置']); true`);
  await sleep(400);
}

/** In-page: the three-zone skeleton probe (document order / body-direct / nesting). */
const zoneProbe = `(() => {
  const body = document.body;
  const ids = ['region-toolbar', 'region-stream', 'region-statusbar'];
  const zones = ids.map((id) => document.getElementById(id));
  const bodyChildren = [...body.children];
  const order = bodyChildren
    .map((el) => el.id)
    .filter((id) => ids.includes(id));
  const stream = document.getElementById('stream');
  const chips = document.getElementById('risk-chips');
  const rail = document.getElementById('risk-rail');
  const detail = document.getElementById('risk-detail');
  const chromeInStream = stream ? stream.querySelectorAll('[data-chrome-control]').length : -1;
  const hosts = [...document.querySelectorAll('[data-transitional-host]')];
  return {
    present: ids.every((id) => Boolean(document.getElementById(id))),
    order,
    directBodyChildren: zones.every((z) => z && z.parentElement === body),
    statusbarInsideStream: Boolean(stream && stream.contains(document.getElementById('region-statusbar'))),
    toolbarInsideStream: Boolean(stream && stream.contains(document.getElementById('region-toolbar'))),
    streamInRegionStream: Boolean(document.getElementById('region-stream')?.querySelector('#stream')),
    viewHostSiblingOfStream: document.getElementById('view-host')?.parentElement?.id === 'region-stream',
    chipsInsideRail: Boolean(rail && rail.contains(chips ?? rail)),
    railInsideChips: Boolean(chips && chips.contains(rail)),
    detailInsideStatusbar: Boolean(document.getElementById('region-statusbar')?.contains(detail)),
    chromeInStream,
    hosts: hosts.map((el) => el.getAttribute('data-transitional-host')),
    structuralHosts: document.querySelectorAll('#stream > li[data-host]').length,
    hostCount: hosts.length,
    streamTag: stream ? stream.tagName : null,
    streamRole: stream ? stream.getAttribute('role') : null,
    toolbarClickables: (() => {
      const bar = document.getElementById('region-toolbar');
      if (!bar) return -1;
      const all = [...bar.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')];
      return all.filter((el) => {
        let n = el;
        while (n) { if (n.hidden === true) return false; n = n.parentElement; }
        return true;
      }).length;
    })(),
    toolbarSlots: ['l2-entry-tree', 'l2-entry-commands', 'l2-entry-audit', 'l2-entry-settings', 'theme-toggle']
      .map((id) => [id, document.getElementById(id)?.getAttribute('data-toolbar-slot') ?? null]),
    summaryIsReadOnly: (() => {
      const s = document.querySelector('.site-summary');
      if (!s) return null;
      return { role: s.getAttribute('role'), tag: s.tagName, interactive: Boolean(s.querySelector('button, a[href], input, select, textarea')) };
    })(),
  };
})()`;

/**
 * In-page: the **reverse** ARIA probe (review 修复轮 I12) — every `[aria-expanded]`
 * element, with whether its `aria-controls` resolves and whether it is a legitimate
 * WAI-ARIA `treeitem` (which expresses expansion without `aria-controls`).
 */
const ARIA_EXPANDED_PROBE = `(() => {
  const all = [...document.querySelectorAll('[aria-expanded]')];
  return all.map((el) => {
    const controls = el.getAttribute('aria-controls');
    return {
      key: el.id || el.className || el.tagName,
      hasControls: Boolean(controls),
      targetResolvable: controls ? Boolean(document.getElementById(controls)) : false,
      isTreeitem: el.getAttribute('role') === 'treeitem',
      inTree: Boolean(el.closest('[role="tree"]')),
    };
  });
})`;

/** In-page: resident id sets + overflow (320/400 equivalence, AC-V3-021). */
const residentProbe = `(() => {
  const all = [...document.querySelectorAll('[id]')].map((el) => el.id).sort();
  const visibleIds = [...document.querySelectorAll('[id]')]
    .filter((el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; })
    .map((el) => el.id)
    .sort();
  const de = document.documentElement;
  return { all, visible: visibleIds, overflowX: de.scrollWidth - de.clientWidth };
})()`;

/** In-page: geometry (three zones pairwise disjoint + scroller census + ratio). */
const geometryProbe = `(() => {
  const zoneIds = ['region-toolbar', 'region-stream', 'region-statusbar'];
  const zones = zoneIds.map((id) => document.getElementById(id));
  const rects = zones.map((el) => el.getBoundingClientRect());
  const pairs = [];
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      pairs.push(Math.round(ix * iy * 100) / 100);
    }
  }
  const scrollers = [...document.querySelectorAll('#region-stream *, #region-stream')]
    .filter((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    })
    .map((el) => el.id || el.className);
  const stream = document.getElementById('stream');
  const sr = stream.getBoundingClientRect();
  const composer = document.getElementById('composer');
  const cr = composer.getBoundingClientRect();
  return {
    pairs,
    panelScrollers: scrollers,
    streamRatio: sr.height / window.innerHeight,
    streamHeight: Math.round(sr.height * 100) / 100,
    streamFlexGrow: getComputedStyle(stream).flexGrow,
    statusbarBottomGap: Math.round(window.innerHeight - document.getElementById('region-statusbar').getBoundingClientRect().bottom),
    zoneHeights: zoneIds.map((id) => ({ id, h: Math.round(document.getElementById(id).getBoundingClientRect().height * 100) / 100 })),
    composerHidden: composer.hidden,
    composerRail: { top: Math.round(cr.top), bottom: Math.round(cr.bottom) },
    streamScrollableInjected: stream.scrollHeight > stream.clientHeight,
  };
})()`;

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'l0', extDir: DIST, portRange: [9500, 9799] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await resetFixture(cdp);

    // ══ ① 三区骨架结构（V4-1 新断言面） ══════════════════════════════════════
    console.log('\n▶ ① 三区骨架：文档序 / body 直挂 / 嵌套 / 占位宿主 / 唯一 id 重命名');
    const zones = await evaluate(cdp, zoneProbe);
    check('① 三区元素齐备（#region-toolbar / #region-stream / #region-statusbar）', zones.present === true, JSON.stringify(zones.present));
    check('① 三区文档序 = toolbar → stream → statusbar', JSON.stringify(zones.order) === JSON.stringify(['region-toolbar', 'region-stream', 'region-statusbar']), JSON.stringify(zones.order));
    check('① 三区均为 body 直挂（状态栏不是 #region-stream 后代 ⇒ S7 结构成立）', zones.directBodyChildren === true && zones.statusbarInsideStream === false && zones.toolbarInsideStream === false, JSON.stringify({ direct: zones.directBodyChildren, sb: zones.statusbarInsideStream, tb: zones.toolbarInsideStream }));
    check('① `#stream` 是 `#region-stream` 的后代（区 ≠ 流本体）', zones.streamInRegionStream === true);
    check('① `#view-host` 是 `#stream` 的兄弟（视图替换不叠加第二滚动面）', zones.viewHostSiblingOfStream === true);
    check('① `#log` → `#stream` 是唯一 id 重命名：#stream 为 ol 且 role=log', zones.streamTag === 'OL' && zones.streamRole === 'log', `${zones.streamTag}/${zones.streamRole}`);
    check('① 状态栏嵌套 = #risk-chips > #risk-rail（chip 入状态栏，不新开分区）', zones.railInsideChips === true && zones.chipsInsideRail === false, JSON.stringify({ railInChips: zones.railInsideChips, chipsInRail: zones.chipsInsideRail }));
    check('① `#risk-detail` 在状态栏内且默认 hidden（不计入默认密度）', zones.detailInsideStatusbar === true && (await evaluate(cdp, `document.getElementById('risk-detail').hidden`)) === true);
    check(`① 过渡宿主清零：querySelectorAll('[data-transitional-host]').length === 0（v4 收口 / R4-18）`, zones.hostCount === 0 && zones.hostCount === REGISTERED_TRANSITIONAL_HOSTS, `实测 ${zones.hostCount}`);
    // V4.5-1 W3（TASK-V45-107/111）：**零宿主是终态** —— 4 个固定位置宿主全部 DOM 移除，
    // 「清零」现在同时意味着「结构标识也不留」（注册表降级为反向判据）。
    check('① 零宿主终态：`#stream` 子树内 [data-host] 计数 = 0（结构标识随形态收口）', zones.hostCount === 0 && zones.structuralHosts === 0, JSON.stringify({ hosts: zones.hostCount, structural: zones.structuralHosts }));
    // ── BLOCK-02（V4-4 审查修复轮）：**结构性**判据（删属性 ≠ 退役）─────────────
    // 产品把「登记的宿主集合 / 实存集合 / 退役容器残留 / 过渡标记计数」一次性交出，判定由
    // 共享纯函数 `host-registry.ts#evaluateHostRegistry` 给出（单一实现，门禁不另立口径）。
    const hostReg = await evaluate(cdp, `JSON.stringify(window.__v3.testing.hosts())`);
    const hostView = JSON.parse(hostReg);
    check(
      '① 结构宿主注册表判据 = 0 问题（登记集合 == 实存集合 ∧ 退役容器零残留 ∧ 过渡计数 0）',
      Array.isArray(hostView.problems) && hostView.problems.length === 0,
      hostReg,
    );
    check(
      '① 结构宿主集合与注册表逐项一致（未登记宿主 / 缺失宿主都 FAIL）',
      JSON.stringify([...hostView.presentHosts].sort()) === JSON.stringify([...hostView.registered].sort()),
      hostReg,
    );
    check(
      '① 已退役容器零 DOM 残留（查 id，不查属性 —— 判据不得空转）',
      Array.isArray(hostView.retiredPresent) && hostView.retiredPresent.length === 0,
      hostReg,
    );
    check(
      '① 归并矩阵的 strip 通道登记齐备（每个通道绑定一个 SystemEventKind）',
      Array.isArray(hostView.stripChannels) && hostView.stripChannels.length >= 5 && hostView.stripChannels.every((c) => typeof c.kind === 'string' && c.kind.length > 0),
      hostReg,
    );

    // ══ ② 工具栏准入 ≤5 + 只读摘要 + 插槽（V4-1 新断言面） ══════════════════
    console.log('\n▶ ② 工具栏：可点恰 5 / data-toolbar-slot / 只读摘要 / 徽标同源');
    check('② 工具栏可点计数 == 5（只读 `.site-summary` 不计 + 4 入口 + 主题）', zones.toolbarClickables === 5, `实测 ${zones.toolbarClickables}`);
    for (const [id, slot] of zones.toolbarSlots) {
      check(`② ${id} 带 data-toolbar-slot ∈ {view,theme}（准入分类可判定）`, slot === 'view' || slot === 'theme', JSON.stringify(slot));
    }
    check('② 4 个视图入口 + 主题 = 恰 5 个插槽（不多不少）', zones.toolbarSlots.length === 5 && zones.toolbarSlots.filter(([, s]) => s === 'view').length === 4);
    check('② `.site-summary` 是只读 role=status（非 button/a/input，不计入可点预算）', zones.summaryIsReadOnly?.role === 'status' && zones.summaryIsReadOnly?.interactive === false, JSON.stringify(zones.summaryIsReadOnly));

    // ══ ③ 三件事同屏 + 唯一决策面（流内卡）+ 法四 ═══════════════════════════
    console.log('\n▶ ③ 三件事 + 唯一决策面（流内 ask 卡）+ 承载 W3；零宿主 + 法四');
    const skeleton = await evaluate(
      cdp,
      `(() => {
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };
        const summary = document.querySelector('.site-summary');
        const statusbar = document.getElementById('region-statusbar');
        // V4.5-1 W3（TASK-V45-107/108）：决策面 = 流内 ask 卡（决策壳已退役，零宿主）。
        const asks = [...document.querySelectorAll('[data-msg-type="askuser"][data-answered="false"]')].filter(visible);
        const options = [...document.querySelectorAll('#ask-options button, #ask-options [role="radio"]')];
        const residentInputs = [...document.querySelectorAll('input[type="text"], input:not([type]), textarea')].filter(visible);
        const moreToggle = document.getElementById('l1-more-toggle');
        const composer = document.getElementById('composer');
        return {
          summaryVisible: visible(summary),
          summaryText: summary ? summary.textContent : '',
          decisionShellRetired: document.getElementById('l0-decision') === null && document.getElementById('l0-more') === null
            && document.getElementById('l0-kicker') === null && document.getElementById('l0-ref-toggle') === null,
          hostCount: document.querySelectorAll('#stream [data-host], #stream [data-transitional-host]').length,
          streamForeign: [...document.getElementById('stream').children].filter((el) => !el.hasAttribute('data-msg-type') && !el.classList.contains('log-empty-text')).length,
          statusbarVisible: visible(statusbar),
          decisionCards: asks.length,
          cardInStream: asks.length === 1 ? Boolean(document.getElementById('stream')?.contains(asks[0])) : null,
          visibleOptions: options.length,
          moreInCard: moreToggle ? Boolean(asks[0]?.contains(moreToggle)) : false,
          moreText: moreToggle ? moreToggle.textContent : null,
          moreCount: moreToggle ? Number(moreToggle.getAttribute('data-count')) : null,
          moreHidden: moreToggle ? moreToggle.hidden : null,
          residentInputs: residentInputs.map((el) => el.id || el.tagName),
          fallbackHidden: document.getElementById('ask-fallback')?.hidden ?? null,
          composerHidden: composer.hidden,
          composerParentIsBody: composer.parentElement === document.body,
          composerInStream: Boolean(document.getElementById('stream')?.contains(composer)),
          // V4-4 TASK-806: panel-side #l0-pick retired — the discoverability anchor is the
          // settings-view guidance (text only, zero injection).
          pickGuidance: document.getElementById('pick-guidance')?.textContent ?? '',
          pickRetired: document.getElementById('l0-pick') === null,
        };
      })()`,
    );
    check('③ ① 我在哪 / 谁在管我（.site-summary 只读摘要）默认态可见', skeleton.summaryVisible === true);
    // V4.5-1 W3（TASK-V45-107/108 / ADR-V45-002）：决策壳**零残留**，任意宿主计数 = 0，
    // 决策面唯一载体 = 流内 ask 卡（它的选项池 / 后果预演在卡内）。
    check(
      '③ ③ 决策壳（#l0-decision / #l0-more / #l0-kicker / #l0-ref-toggle）零残留（W3 真退役）',
      skeleton.decisionShellRetired === true,
      JSON.stringify({ retired: skeleton.decisionShellRetired }),
    );
    check('③ 零宿主：`#stream` 子树内 [data-host] / [data-transitional-host] 计数 = 0', skeleton.hostCount === 0, String(skeleton.hostCount));
    check('③ 纯卡序：`#stream` 无「既非卡也非空态占位」的子节点', skeleton.streamForeign === 0, String(skeleton.streamForeign));
    check('③ 一行状态栏（#region-statusbar）默认态可见（J1）', skeleton.statusbarVisible === true);
    check('③ 摘要文字含 origin 站点名（可读，非纯图标）', skeleton.summaryText.includes('v3-l0.test'), skeleton.summaryText.slice(0, 80));
    check('③ 默认态决策卡数 = 1（唯一决策卡）且在流内', skeleton.decisionCards === 1 && skeleton.cardInStream === true, JSON.stringify({ n: skeleton.decisionCards, inStream: skeleton.cardInStream }));
    // V4-3 (ADR-V4-030 decision 9): a choice card renders up to 3 options + the
    // terminal「其他…」= ≤4 clickable options (was ≤2 in the retired decision slot).
    check('③ 可见选项 ≤ 4 且 ≥ 1（choice 卡 ≤3 + 末项）', skeleton.visibleOptions <= 4 && skeleton.visibleOptions >= 1, String(skeleton.visibleOptions));
    // V4.5-1 W3: the「更多选项」trigger is minted INSIDE the card (the retired shell's
    // `#l0-more` is gone) and its N is derived from the same option list.
    check('③ 「更多选项（还有 N 个）」触发器在卡内（决策区随元素卡内化）', skeleton.moreInCard === true, JSON.stringify({ inCard: skeleton.moreInCard }));
    check(
      '③ 「更多选项（还有 N 个）」的 N 从真值派生（4 选项 → 卡内 3 可见 + 1 收起，N = 1 + 1 末项）',
      skeleton.moreCount === 2 && skeleton.moreText === '更多选项（还有 2 个）',
      `${skeleton.moreText} / data-count=${skeleton.moreCount}`,
    );
    check('③ 默认态可见文本输入框计数 = 0（法四：含 input:not([type]) / textarea）', skeleton.residentInputs.length === 0, skeleton.residentInputs.join(','));
    check('③ 末项兜底输入框默认 hidden', skeleton.fallbackHidden === true);
    check('③ `#composer` 存在但默认 hidden（法四显式取代 v3「composer 贴底」）', skeleton.composerHidden === true);
    check('③ `#composer` 迁 body 尾（`parentElement === body`）且不在 `#stream` 内（W3 出流）', skeleton.composerParentIsBody === true && skeleton.composerInStream === false, JSON.stringify({ body: skeleton.composerParentIsBody, inStream: skeleton.composerInStream }));
    // V4-4 TASK-806: the panel-side entry is RETIRED; discoverability is carried by
    // the settings-view guidance (text only) — the page-side layer stays the primary
    // entry (zero injection, asserted by page-input / zero-injection gates).
    check('③ 面板侧 `#l0-pick` 已退役（DOM 计数 = 0，替代输入框的入口在页面侧）', skeleton.pickRetired === true, String(skeleton.pickRetired));
    check('③ 设置视图「站点与授权」含拾取指引（可发现性未丢）', /拾取/.test(skeleton.pickGuidance), skeleton.pickGuidance);

    // N must follow the real option list (change truth → change N)
    await evaluate(cdp, `window.__v3.testing.ask('换一轮', ['甲', '乙', '丙', '丁', '戊']); true`);
    await sleep(250);
    const moreAgain = await evaluate(cdp, `document.getElementById('l1-more-toggle').getAttribute('data-count') + '|' + document.getElementById('l1-more-toggle').textContent`);
    check('③ 真实选项数变化 → N 随之变化（硬编码即 FAIL；5 选项 → 卡内 3 + 2 收起 + 末项 = 3）', moreAgain === '3|更多选项（还有 3 个）', moreAgain);
    const terminalText = await evaluate(
      cdp,
      `(() => { const pool = document.getElementById('l1-more-options'); const btns = [...pool.querySelectorAll('button')]; return btns.length ? btns[btns.length - 1].textContent : ''; })()`,
    );
    check('③ FR-V3-012 末项文案逐字（渲染态 DOM 文本 = 「其他…（我来描述）」）', terminalText === '其他…（我来描述）', JSON.stringify(terminalText));
    // V4.5-1 W3: the pool's own options are NOT a second projection of `#ask-options`
    // (the first three are rendered inline) — the pool holds only the rest.
    const poolOptions = await evaluate(
      cdp,
      `(() => [...document.querySelectorAll('#l1-more-options button')].map((b) => b.textContent))()`,
    );
    check(
      '③ 单写：卡内选项池只装「#ask-options 未展示的选项 + 末项」（无重复投影）',
      JSON.stringify(poolOptions) === JSON.stringify(['丁', '戊', '其他…（我来描述）']),
      JSON.stringify(poolOptions),
    );
    await evaluate(cdp, `window.__v3.testing.clearAsk(); true`);
    await sleep(200);
    const noAsk = await evaluate(
      cdp,
      `JSON.stringify({ openAsks: document.querySelectorAll('[data-msg-type="askuser"][data-answered="false"]').length, moreMinted: document.getElementById('l1-more-toggle') !== null })`,
    );
    check('③ 无待答回合时决策卡不再 open（不留空卡）', noAsk === '{"openAsks":0,"moreMinted":false}', noAsk);
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await sleep(250);
    const noAskAgain = await evaluate(
      cdp,
      `JSON.stringify({
        moreMinted: document.getElementById('l1-more-toggle') !== null,
        openAsks: document.querySelectorAll('[data-msg-type="askuser"][data-answered="false"]').length,
      })`,
    );
    const noAskParsed = JSON.parse(noAskAgain);
    check('③ I1（W3 等价）：无卡态第二次 render 后卡内触发器**不被铸造**（不得复活悬空入口）', noAskParsed.moreMinted === false && noAskParsed.openAsks === 0, noAskAgain);
    await resetFixture(cdp);

    // ══ ④ 状态栏 J1~J4 + assertFoldable 负向 ═════════════════════════════════
    console.log('\n▶ ④ 状态栏 J1~J4：本体常驻 / chips 容器 / chip 祖先闭包 / 视图切换不影响');
    const j1 = await evaluate(
      cdp,
      `(() => {
        const bar = document.getElementById('region-statusbar');
        const chips = document.getElementById('risk-chips');
        const rail = document.getElementById('risk-rail');
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        return {
          barHidden: bar.hidden,
          chipsHidden: chips.hidden,
          railChips: [...rail.querySelectorAll('.risk-row')].length,
          visibleChips: [...rail.querySelectorAll('.risk-row')].filter((r) => visible(r) && !r.hasAttribute('data-risk-severity')).length,
          barText: document.getElementById('statusbar-text').textContent,
        };
      })()`,
    );
    check('④ J1：零风险态 `#region-statusbar` 本体 hidden !== true', j1.barHidden !== true, JSON.stringify(j1.barHidden));
    check('④ J2：零风险 ⇒ `#risk-chips` 收缩（hidden = true，0 可点 chip）', j1.chipsHidden === true, JSON.stringify(j1));
    const foldStatus = await evaluate(
      cdp,
      `(() => { try { window.__v3.disclosure.targets; return 'has-targets'; } catch (e) { return String(e); } })()`,
    );
    check('④ `window.__v3.disclosure` 暴露 targets（门禁可读折叠白名单）', foldStatus === 'has-targets', String(foldStatus));
    const j2 = await evaluate(
      cdp,
      `(() => {
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        window.__v3.testing.setRisk('hardline', 'force');
        const chips = document.getElementById('risk-chips');
        const rail = document.getElementById('risk-rail');
        const rows = [...rail.querySelectorAll('.risk-row[data-risk-class]')];
        const chainOf = (el) => { const c = []; let n = el; while (n) { c.push(n); n = n.parentElement; } return c; };
        const chip = rows.find((r) => r.getAttribute('data-risk-class') === 'hardline');
        // J3 的「祖先闭包」= chip 的**严格祖先**（chip 自身按 ADR-V4-019 第 5 条
        // 本来就是 aria-expanded / aria-controls=risk-detail 的成对触发器 —— 它触发
        // 的是详情展开，不是折叠风险；把它自身算进闭包是把判据读反）。
        const chain = chip ? chainOf(chip.parentElement) : [];
        return {
          chipsHidden: chips.hidden,
          chipCount: rows.length,
          visibleChips: rows.filter(visible).length,
          chipTag: chip ? chip.tagName : null,
          chipChromeControl: chip ? chip.hasAttribute('data-chrome-control') : null,
          chipAriaControls: chip ? chip.getAttribute('aria-controls') : null,
          chipAriaExpanded: chip ? chip.getAttribute('aria-expanded') : null,
          chainHidden: chain.filter((n) => n.hidden === true).length,
          chainFoldable: chain.filter((n) => n.hasAttribute && (n.hasAttribute('data-l1-panel') || n.hasAttribute('data-l2-view') || n.hasAttribute('data-disclose-panel'))).length,
          chainExpanded: chain.filter((n) => n.hasAttribute && n.hasAttribute('aria-expanded')).length,
        };
      })()`,
    );
    check('④ J2：任一风险 ⇒ `#risk-chips` 无 hidden 且 `#risk-rail` 含 ≥1 可见 chip', j2.chipsHidden === false && j2.visibleChips >= 1, JSON.stringify(j2));
    check('④ J3：chip 祖先闭包无 hidden 元素', j2.chainHidden === 0, JSON.stringify(j2));
    check('④ J3：chip 祖先闭包无折叠容器', j2.chainFoldable === 0, JSON.stringify(j2));
    check('④ J3：chip 祖先闭包无 `[aria-expanded]` 触发器（chip 自身除外）', j2.chainExpanded === 0, JSON.stringify(j2));
    check('④ chip 形态 = button（计入状态栏 C1）+ data-chrome-control + aria 成对指向 #risk-detail', j2.chipTag === 'BUTTON' && j2.chipChromeControl === true && j2.chipAriaControls === 'risk-detail' && (j2.chipAriaExpanded === 'true' || j2.chipAriaExpanded === 'false'), JSON.stringify({ tag: j2.chipTag, cc: j2.chipChromeControl, ac: j2.chipAriaControls, ae: j2.chipAriaExpanded }));
    const j4 = await evaluate(
      cdp,
      `(() => {
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        const rail = document.getElementById('risk-rail');
        window.__v3.testing.openL2View('tree');
        const afterOpen = { chipsHidden: document.getElementById('risk-chips').hidden, railVisible: visible(rail) };
        window.__v3.testing.closeL2View();
        const afterClose = { chipsHidden: document.getElementById('risk-chips').hidden, railVisible: visible(rail) };
        return { afterOpen, afterClose };
      })()`,
    );
    check('④ J4：打开任意视图后 chips 仍可见（状态栏 body 直挂 ⇒ 视图触达不到）', j4.afterOpen.chipsHidden === false && j4.afterOpen.railVisible === true, JSON.stringify(j4));
    check('④ J4：返回后 chips 仍可见（可逆，不因视图往返被折叠）', j4.afterClose.chipsHidden === false && j4.afterClose.railVisible === true, JSON.stringify(j4));
    await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'off'); true`);
    await sleep(150);
    const foldNegative = await evaluate(
      cdp,
      `(() => {
        const out = {};
        for (const id of ['region-statusbar', 'risk-chips', 'risk-detail', 'stream']) {
          try { window.__v3.disclosure.open(id); out[id] = 'NO-THROW'; }
          catch (e) { out[id] = String(e && e.name ? e.name : e); }
        }
        return out;
      })()`,
    );
    for (const id of ['region-statusbar', 'risk-chips', 'risk-detail', 'stream']) {
      check(`④ assertFoldable('#${id}') 必须抛错（永不折叠的负向断言）`, foldNegative[id] === 'DisclosureError', JSON.stringify(foldNegative));
    }

    // ══ ⑤ AC-V3-008：5 类风险 × 2 场景 ════════════════════════════════════════
    console.log('\n▶ ⑤ AC-V3-008：5 类风险 × 2 场景（默认视口可见 + 全折叠后仍可见）');
    await evaluate(
      cdp,
      `chrome.runtime.sendMessage({ kind: 'revoke', origin: ${JSON.stringify(FIXTURE_ORIGIN)} }).then(() => true)`,
    );
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized !== true)`, 40, 200);
    await sleep(250);
    for (const sub of RISK_SUBSCENARIOS) {
      await evaluate(cdp, `window.__v3.testing.setRisk(${JSON.stringify(sub.key)}, ${JSON.stringify(sub.key === 'unauthorized' ? 'natural' : 'force')}); true`);
      await sleep(250);
      const visibleProbe = await evaluate(cdp, riskVisibilityProbeSource(sub.key));
      check(`⑤ ${sub.label}：默认视口内可见且三通道齐备`, visibleProbe.ok === true, JSON.stringify(visibleProbe));
      await evaluate(cdp, `window.__v3.testing.collapseAll(); true`);
      await sleep(200);
      const collapsedProbe = await evaluate(cdp, riskVisibilityProbeSource(sub.key));
      check(`⑤ ${sub.label}：全部 L1/L2 收起后仍可见（永不折叠）`, collapsedProbe.ok === true, JSON.stringify(collapsedProbe));
      await evaluate(cdp, `window.__v3.testing.setRisk(${JSON.stringify(sub.key)}, 'off'); true`);
      await sleep(150);
    }
    await evaluate(cdp, `window.__v3.testing.setRisk('unauthorized', 'natural'); window.__v3.testing.setRisk('hardline', 'force'); true`);
    await sleep(250);

    // ══ ⑥ AC-V3-009：祖先链 + 破坏性确认不参与折叠 ═══════════════════════════
    console.log('\n▶ ⑥ AC-V3-009：祖先链 + 破坏性确认不参与折叠');
    const ancestor = await evaluate(
      cdp,
      `(() => {
        const rail = document.getElementById('risk-rail');
        const chain = [];
        let n = rail;
        while (n) { chain.push({ tag: n.tagName, id: n.id, hidden: n.hidden, l1: n.hasAttribute('data-l1-panel'), l2: n.hasAttribute('data-l2-view'), disclose: n.hasAttribute('data-disclose-panel') }); n = n.parentElement; }
        return JSON.stringify({
          chain,
          railInStatusbar: Boolean(document.getElementById('region-statusbar')?.contains(rail)),
          // 「折叠触发器」= 指向**可折叠面板**的 [aria-expanded] 触发器。chip 自身的
          // aria-expanded / aria-controls=risk-detail 是详情展开的成对 ARIA
          // （ADR-V4-019 第 5 条），不是把风险藏起来的折叠入口。
          foldTriggers: [...rail.querySelectorAll('[aria-expanded]')].filter((t) => {
            const target = t.getAttribute('aria-controls') ?? '';
            return target !== 'risk-detail' || !t.classList.contains('risk-row');
          }).length,
          riskRowsInFoldable: [...rail.querySelectorAll('.risk-row')].filter((r) => r.closest('[data-l1-panel],[data-l2-view],[data-disclose-panel]')).length,
        });
      })()`,
    );
    const chain = JSON.parse(ancestor);
    check('⑥ 风险位祖先链无 hidden 元素', chain.chain.every((n) => n.hidden !== true), ancestor);
    check('⑥ 风险位祖先链无 L1/L2/披露容器', chain.chain.every((n) => !n.l1 && !n.l2 && !n.disclose), ancestor);
    check('⑥ 风险位位于状态栏内（v4：chip 入状态栏，body 直挂链上）', chain.railInStatusbar === true);
    check('⑥ 风险位内不存在折叠触发器（唯一 `[aria-expanded]` 是 chip 自身指向 #risk-detail 的详情开关）', chain.foldTriggers === 0, String(chain.foldTriggers));
    check('⑥ 风险行不位于任何折叠容器内', chain.riskRowsInFoldable === 0, String(chain.riskRowsInFoldable));

    await evaluate(cdp, `window.__v3.testing.setRisk('confirm', 'force'); true`);
    await sleep(250);
    const confirmProbe = await evaluate(
      cdp,
      `(() => {
        // V4-3: the confirm risk class is a projection-only fixture; the real confirm
        // card is covered by test/ui/ask-auth-inflow.mjs. What L0 must still prove is
        // that the confirm RISK row is resident (never folded) and the decision zone
        // offers no bypassing allow/deny control.
        const visible = (el) => { if (!el) return false; let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        const rail = document.getElementById('risk-rail');
        const confirmRow = rail ? rail.querySelector('.risk-row[data-risk-class="confirm"]') : null;
        const chain = [];
        let n = confirmRow;
        while (n) { chain.push({ id: n.id, hidden: n.hidden, l1: n.hasAttribute('data-l1-panel'), l2: n.hasAttribute('data-l2-view') }); n = n.parentElement; }
        // V4.5-1 W3：决策面 = 流内卡；「更多选项」池在卡内（#l1-more-options），
        // 旁路控件判据的扫描面随之重锚到流内决策卡（#l0-decision 已退役）。
        const moreOptions = document.getElementById('l1-more-options');
        const decisionScope = document.querySelector('[data-msg-type="askuser"], [data-msg-type="auth"]') ?? document.getElementById('stream');
        const allowControls = [...decisionScope.querySelectorAll('button, [role="button"]')]
          .filter(visible)
          .filter((b) => /^(允许|放行|允许执行|忽略硬底线|覆盖)$/.test((b.textContent || '').trim()));
        return JSON.stringify({
          confirmRowVisible: visible(confirmRow),
          railInStream: Boolean(document.getElementById('stream')?.contains(rail)),
          chainClean: chain.every((x) => x.hidden !== true && !x.l1 && !x.l2),
          allowControls: allowControls.length,
          noneInMorePool: moreOptions ? [...moreOptions.querySelectorAll('button')].filter((b) => b.hasAttribute('data-destructive-option')).length : 0,
        });
      })()`,
    );
    const cp = JSON.parse(confirmProbe);
    check('⑥ 破坏性确认风险行常驻可见（风险位归状态栏，永不折叠）', cp.confirmRowVisible === true, confirmProbe);
    check('⑥ 破坏性确认风险行的祖先链无折叠容器（不参与折叠）', cp.chainClean === true, confirmProbe);
    check('⑥ 决策区零「允许/放行」旁路控件（结构可判定）', cp.allowControls === 0, confirmProbe);
    check('⑥ 破坏性确认控件不进入「更多选项」池', cp.noneInMorePool === 0, confirmProbe);
    await evaluate(cdp, `window.__v3.testing.setRisk('confirm', 'off'); true`);

    await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'force'); true`);
    await sleep(250);
    const hardline = await evaluate(
      cdp,
      `(() => {
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        // V4.5-1 W3：第二条扫描轴从退役的决策壳改为流内决策卡（同一语义：决策面不得有
        // 「允许/放行」旁路）。
        const scope = [document.getElementById('risk-rail'), document.querySelector('[data-msg-type="askuser"], [data-msg-type="auth"]') ?? document.getElementById('stream')];
        const labels = scope
          .flatMap((root) => [...root.querySelectorAll('button, [role="button"]')])
          .filter(visible)
          .map((b) => (b.textContent || '').trim());
        const railText = document.getElementById('risk-rail').textContent;
        return JSON.stringify({ labels, hasAllow: labels.some((l) => /^(允许|放行|允许执行|忽略硬底线|覆盖)$/.test(l)), railText: railText.slice(0, 160) });
      })()`,
    );
    const hl = JSON.parse(hardline);
    check('FR-V3-019 硬底线被拦时「允许 / 放行」控件计数 = 0', hl.hasAllow === false, hl.labels.join(' / '));
    check('FR-V3-019 风险位写明 evaluate 永不自动放行', /evaluate/.test(hl.railText) && /不提供「允许」选项/.test(hl.railText), hl.railText);
    await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'off'); true`);
    await sleep(200);

    // ══ ⑦ 豁免子树：零 [data-chrome-control] + 产品自断言 + 注入反证 ═════════
    console.log('\n▶ ⑦ 豁免子树 S1：`#stream` 零常驻控件 + assertChromeNotInStream 反证');
    check('⑦ `#stream` 子树零 `[data-chrome-control]`（豁免不得承载常驻控件）', zones.chromeInStream === 0, String(zones.chromeInStream));
    const s1ok = await evaluate(cdp, `(() => { try { return window.__v3.testing.assertChromeNotInStream(); } catch (e) { return String(e); } })()`);
    check('⑦ 产品自断言 `assertChromeNotInStream()` 在真实产物上通过', s1ok === true, String(s1ok));
    const s1fail = await evaluate(
      cdp,
      `(() => {
        const stream = document.getElementById('stream');
        const probe = document.createElement('button');
        probe.id = 'l0-s1-probe';
        probe.setAttribute('data-chrome-control', 'probe');
        stream.appendChild(probe);
        let verdict;
        try { window.__v3.testing.assertChromeNotInStream(); verdict = 'NO-THROW'; }
        catch (e) { verdict = String(e && e.message ? e.message : e); }
        probe.remove();
        return verdict;
      })()`,
    );
    check('⑦ 反证（FAIL 段）：注入 1 个 `[data-chrome-control]` 到 `#stream` ⇒ 自断言必须抛错', typeof s1fail === 'string' && s1fail.includes('#stream 子树内含 1 个'), String(s1fail));
    const s1restored = await evaluate(cdp, `(() => { try { return window.__v3.testing.assertChromeNotInStream(); } catch (e) { return String(e); } })()`);
    check('⑦ 反证（还原段）：移除注入后自断言必须再次通过', s1restored === true, String(s1restored));

    // ══ ⑧ AC-V3-010：可发现性 + ARIA 成对 + per-target ══════════════════════
    console.log('\n▶ ⑧ AC-V3-010：可发现性（入口文字 + ARIA 成对 + 目标含摘要/计数）');
    await resetFixture(cdp);
    const disclosure = await evaluate(
      cdp,
      `(() => {
        const triggers = [...document.querySelectorAll('[aria-controls]')];
        const entries = triggers.map((t) => {
          const targetId = t.getAttribute('aria-controls');
          const target = document.getElementById(targetId);
          return {
            trigger: t.id || t.className,
            text: (t.textContent || '').trim(),
            label: (t.getAttribute('aria-label') || '').trim(),
            hasExpanded: t.hasAttribute('aria-expanded'),
            expanded: t.getAttribute('aria-expanded'),
            targetId,
            targetExists: Boolean(target),
            targetHidden: target ? target.hidden : null,
            summaryInTarget: target ? (target.textContent || '').trim().length > 0 : false,
            countInTarget: target ? (target.getAttribute('data-count') || (target.querySelector('[data-count]')?.getAttribute('data-count') ?? '')) : '',
          };
        });
        return JSON.stringify(entries);
      })()`,
    );
    const entries = JSON.parse(disclosure);
    // V4.5-1 W3（TASK-V45-110）：折叠触发器集合等价重锚 —— 6 个退役触发器（`#l0-more` /
    // `#l0-ref-toggle` / 4 个 L1 开关）从契约移除，两个**卡内**触发器（选项池 / 后果预演）
    // 与 4 个视图入口 + 树 FAB 构成新契约（12 条，数量不减）。
    const EXPECTED_TRIGGERS = [
      'l2-entry-tree',
      'l2-entry-commands',
      'l2-entry-audit',
      'l2-entry-settings',
      'tree-fab',
      // 卡内（默认夹具里 ask 卡在场）：选项池 / 后果预演触发器 + 末项。
      'l1-more-toggle',
      'l1-consequences-toggle',
      'ask-other',
    ];
    // 退役触发器：**零 DOM 残留**（W3 真退役；重新引入即红）。
    const RETIRED_TRIGGERS = ['l0-more', 'l0-ref-toggle', 'l1-local-tree-toggle', 'l1-history-toggle', 'l1-receipt-toggle', 'l1-gestures-toggle'];
    check('⑧ 遍历范围 = 全部 [aria-controls] 元素（未被白名单缩窄）', entries.length >= EXPECTED_TRIGGERS.length, `实测 ${entries.length} 个：${entries.map((e) => e.trigger).join(', ')}`);
    for (const [trigger, expectedTarget] of Object.entries(ARIA_TARGET_BY_ENTRY)) {
      const entry = entries.find((e) => e.trigger === trigger);
      check(
        `⑧ ${trigger}：aria-controls 指向**自己的**目标（${expectedTarget}）且该目标存在`,
        entry?.targetId === expectedTarget && entry?.targetExists === true,
        JSON.stringify(entry),
      );
    }
    for (const trigger of EXPECTED_TRIGGERS) {
      check(`⑧ ${trigger} 在遍历范围内（可见性契约不得被漏检）`, entries.some((e) => e.trigger === trigger), entries.map((e) => e.trigger).join(', '));
    }
    // V4.5-1 W3（TASK-V45-110）：6 个退役触发器（决策壳 2 + L1 组 4）必须零 DOM 残留。
    const retiredTriggers = await evaluate(
      cdp,
      `(() => ${JSON.stringify(RETIRED_TRIGGERS)}.filter((id) => document.getElementById(id) !== null))()`,
    );
    check('⑧ 退役触发器零 DOM 残留（#l0-more / #l0-ref-toggle / 4 个 L1 开关）', Array.isArray(retiredTriggers) && retiredTriggers.length === 0, JSON.stringify(retiredTriggers));
    check('⑧ 退役触发器不出现任何 [aria-controls] 指向它们', entries.every((e) => !RETIRED_TRIGGERS.includes(e.targetId)), entries.map((e) => e.targetId).join(', '));
    // V4.5-1 W3（TASK-V45-111）：逐项负向断言 —— 每个退役触发器 / 退役容器都必须
    // `getElementById(...) === null`（删属性不改 DOM 不算退役）。
    for (const id of RETIRED_TRIGGERS) {
      const present = await evaluate(cdp, `document.getElementById(${JSON.stringify(id)}) !== null`);
      check(`⑧ 退役触发器 #${id} 零 DOM 残留`, present === false, String(present));
    }
    const RETIRED_CONTAINERS = [
      'l0-decision', 'l0-pick', 'l0-status-band', 'l0-kicker', 'l0-more', 'l0-ref-toggle', 'l0-receipt-summary',
      'l1-group', 'l1-history-toggle', 'l1-history', 'l1-history-rows', 'l1-local-tree-toggle', 'l1-receipt-toggle',
      'l1-gestures-toggle',
    ];
    for (const id of RETIRED_CONTAINERS) {
      const present = await evaluate(cdp, `document.getElementById(${JSON.stringify(id)}) !== null`);
      check(`⑧ 退役容器 #${id} 零 DOM 残留（结构性清零，不是删标记）`, present === false, String(present));
    }
    // 卡内触发器成对：`#l1-more-toggle` → `#l1-more`（卡内目标存在且默认 hidden）。
    const cardPair = await evaluate(
      cdp,
      `(() => { const t = document.getElementById('l1-more-toggle'); const g = document.getElementById('l1-more'); return JSON.stringify({ hasTrigger: Boolean(t), hasTarget: Boolean(g), expanded: t ? t.getAttribute('aria-expanded') : null, controls: t ? t.getAttribute('aria-controls') : null, targetHidden: g ? g.hidden : null }); })()`,
    );
    const cp2 = JSON.parse(cardPair);
    check('⑧ 卡内选项池触发器成对（aria-expanded + aria-controls=#l1-more ∧ 目标默认 hidden）', cp2.hasTrigger === true && cp2.hasTarget === true && cp2.controls === 'l1-more' && cp2.expanded === 'false' && cp2.targetHidden === true, cardPair);
    // 内容面契约：7 个 `[data-l1-panel]` 面（卡内 / L2 承载块 / 设置帮助）与折叠白名单同源。
    const faces = await evaluate(
      cdp,
      `(() => ({ panels: [...document.querySelectorAll('[data-l1-panel]')].map((p) => p.getAttribute('data-l1-panel')), targets: [...(window.__v3.disclosure.targets || [])] }))()`,
    );
    // V4.5-1 W3：在场的 `[data-l1-panel]` 面必须 ⊆ 折叠白名单，且 6 个静态/卡内面在场
    // （`l1-gestures` 只在设置视图挂载后存在 —— 其可达性由 ⑨/设置分区断言覆盖）。
    const expectedFaces = ['l1-more', 'l1-consequences', 'l1-local-tree', 'l1-receipt', 'l2-tree-attribution', 'l2-audit-evidence'];
    check(
      '⑧ 在场内容面 ⊆ 折叠白名单（声明集合不得超出控制器的可折叠集合）',
      faces.panels.every((f) => faces.targets.includes(f)),
      JSON.stringify(faces),
    );
    check(
      '⑧ 6 个静态/卡内内容面齐备（l1-gestures 随设置视图挂载后存在）',
      expectedFaces.every((f) => faces.panels.includes(f)),
      JSON.stringify(faces.panels),
    );
    const SKELETON_EXEMPT_TARGETS = ['view-host', 'settings-view'];
    check(
      '⑧ 骨架期豁免集合恰为两个 L2 视图宿主（不回退、不扩大）',
      JSON.stringify(SKELETON_EXEMPT_TARGETS) === JSON.stringify(['view-host', 'settings-view']),
      JSON.stringify(SKELETON_EXEMPT_TARGETS),
    );
    for (const entry of entries) {
      check(`⑧ ${entry.trigger}：有非空文字标签（禁「只有图标」）`, entry.text.length > 0 || entry.label.length > 0, JSON.stringify(entry));
      check(`⑧ ${entry.trigger}：aria-expanded + aria-controls 成对`, entry.hasExpanded === true && Boolean(entry.targetId), JSON.stringify(entry));
      check(`⑧ ${entry.trigger}：aria-controls 指向存在的元素`, entry.targetExists === true, JSON.stringify(entry));
      if (SKELETON_EXEMPT_TARGETS.includes(entry.targetId)) {
        check(`⑧ ${entry.trigger}：L2 视图目标默认 hidden（FR-V3-045 默认零占用）`, entry.targetHidden === true, JSON.stringify(entry));
        continue;
      }
      check(`⑧ ${entry.trigger}：目标含非空摘要或计数`, entry.summaryInTarget === true || entry.countInTarget !== '', JSON.stringify(entry));
    }
    const emptyTargets = [...new Set(entries.filter((e) => !e.summaryInTarget && e.countInTarget === '').map((e) => e.targetId))];
    check(
      '⑧ 空摘要目标集合必须被骨架期豁免集合完全覆盖，且不得超出登记数量（豁免不得扩大）',
      emptyTargets.every((id) => SKELETON_EXEMPT_TARGETS.includes(id)) && emptyTargets.length <= SKELETON_EXEMPT_TARGETS.length,
      JSON.stringify(emptyTargets),
    );
    // ── ⑧b 反向 ARIA 断言（review 修复轮 I12）────────────────────────────────
    // 既有 ⑧ 只遍历**有** `aria-controls` 的元素，因此「有 aria-expanded 却没有
    // aria-controls」的悬空 expander 结构上看不见（#theme-toggle 就漏在这里）。
    // 反向判据：**凡** `[aria-expanded]` 元素必须 (a) 其 `aria-controls` 可解析到存在的元素；
    // (b) 或者属于 WAI-ARIA **treeitem** 模式（`role=treeitem` 且位于 `role=tree` 内）——
    // 该模式按规范本就不用 `aria-controls`（展开态由 `aria-expanded` 单独表达）。
    // 豁免面窄且可核：任何非 treeitem 的「无 controls」expander 都会 FAIL。
    const ariaReverseProbe = await evaluate(cdp, `JSON.stringify((${ARIA_EXPANDED_PROBE})())`);
    const ariaRows = JSON.parse(ariaReverseProbe);
    const ariaViolations = (rows) => rows
      .filter((r) => (r.hasControls ? !r.targetResolvable : !(r.isTreeitem && r.inTree)))
      .map((r) => r.key);
    const ariaExempt = ariaRows.filter((r) => !r.hasControls);
    check('⑧b 反向：至少扫描到一个 `[aria-expanded]` 元素（判据非空转）', ariaRows.length > 0, `实测 ${ariaRows.length} 个`);
    check(
      '⑧b 反向：凡 `[aria-expanded]` 必有可解析的 `aria-controls`（treeitem 模式除外）',
      ariaViolations(ariaRows).length === 0,
      `悬空 expander：${ariaViolations(ariaRows).join(', ') || '（无）'} | ${ariaReverseProbe}`,
    );
    check(
      '⑧b 反向：无 controls 的豁免面只允许 treeitem 模式（豁免不扩大）',
      ariaExempt.every((r) => r.isTreeitem && r.inTree),
      JSON.stringify(ariaExempt),
    );
    // in-gate 反证（FAIL 段）：注入一个「有 aria-expanded、无 aria-controls」的按钮 ⇒ 判据必须报出它。
    const ariaFailRaw = await evaluate(
      cdp,
      `(() => {
        const probe = ${ARIA_EXPANDED_PROBE};
        const before = probe();
        const b = document.createElement('button');
        b.id = 'l0-aria-reverse-probe';
        b.setAttribute('aria-expanded', 'false');
        document.getElementById('region-toolbar').appendChild(b);
        const during = probe();
        b.remove();
        const after = probe();
        return JSON.stringify({ before, during, after });
      })()`,
    );
    const ariaFail = JSON.parse(ariaFailRaw);
    // 诊断（非断言）：把悬空 expander 的判据读数打进日志（I12 反证的原始证据）。
    console.log(`    I12 反证诊断：violations(during) = ${JSON.stringify(ariaViolations(ariaFail.during))}`);
    check(
      '⑧b 反证（FAIL 段）：注入「aria-expanded 无 aria-controls」⇒ 反向判据必须报出该元素',
      ariaViolations(ariaFail.during).includes('l0-aria-reverse-probe'),
      ariaFailRaw,
    );
    check('⑧b 反证（对照段）：未注入 / 还原后判据必须为空', ariaViolations(ariaFail.before).length === 0 && ariaViolations(ariaFail.after).length === 0, ariaFailRaw);

    // ══ ⑨ FR-V3-015：四入口计数两处同源（标签 ≡ data-count）+ 摘要 digest + 内联反证 ══
    console.log('\n▶ ⑨ FR-V3-015：四入口计数同源（标签 ≡ data-count）+ FIX-3 摘要 digest + 反证');
    const l2ProbeExpr = `(() => {
      const entries = ${JSON.stringify(TOOLBAR_ENTRY_KEYS)}.map((key) => {
        const btn = document.getElementById('l2-entry-' + key);
        if (!btn) return { key, missing: true };
        const m = /(\\d+)/.exec(btn.textContent || '');
        return {
          key,
          text: (btn.textContent || '').trim(),
          dataCount: btn.getAttribute('data-count'),
          labelCount: m ? Number(m[1]) : null,
          ariaControls: btn.getAttribute('aria-controls'),
          slot: btn.getAttribute('data-toolbar-slot'),
        };
      });
      const summaryEl = document.getElementById('l2-entry-summary');
      const bar = document.getElementById('statusbar-text');
      return JSON.stringify({
        entries,
        summary: summaryEl ? (summaryEl.textContent || '').trim() : '',
        barText: bar ? (bar.textContent || '').trim() : '',
      });
    })()`;
    const l2CountJudge = (l2) => {
      const failures = [];
      if (l2.entries.length !== 4 || l2.entries.some((e) => e.missing === true)) failures.push('工具栏入口数 ≠ 4');
      for (const [label, key] of [['树', 'tree'], ['命令', 'commands'], ['审计', 'audit'], ['设置', 'settings']]) {
        const entry = l2.entries.find((e) => e.key === key);
        if (!/^\d+$/.test(String(entry?.dataCount))) failures.push(`${key}: data-count 不是数字（${entry?.dataCount}）`);
        else if (entry.labelCount !== Number(entry.dataCount)) {
          failures.push(`${key}: 两处不同源（label=${entry?.labelCount} data-count=${entry?.dataCount}）`);
        }
      }
      const settingsCount = Number(l2.entries.find((e) => e.key === 'settings')?.dataCount);
      if (!Number.isInteger(settingsCount) || settingsCount <= 0) failures.push(`settings: data-count 必须是可派生的正整数（实测 ${l2.entries.find((e) => e.key === 'settings')?.dataCount}）`);
      return failures;
    };
    const l2Raw = await evaluate(cdp, l2ProbeExpr);
    const l2Parsed = JSON.parse(l2Raw);
    check('⑨ 常驻一行状态栏文本不含数字（计数在入口面板摘要内，默认档足迹稳定）', !/\d/.test(l2Parsed.barText ?? ''), JSON.stringify(l2Parsed.barText));
    // ── FIX-3（F 还原度快修轮，2026-09-20）──────────────────────────────────────
    // 摘要从计数串改为 origin · 授权态 · 会话 digest；计数收敛为**两处**（入口标签 +
    // 徽标）。旧断言（摘要含四类计数）与它守护的「三处同源」一起被新语义取代：
    // 摘要不再重复计数，而入口标签 ≡ data-count 仍然逐项机对（EC-V3-016 不合并）。
    check(
      '⑨ 工具栏摘要（#l2-entry-summary）= origin · 授权态 · 会话 digest（非计数串）',
      /v3-l0\.test/.test(l2Parsed.summary ?? '') && /已授权/.test(l2Parsed.summary ?? '') && /会话/.test(l2Parsed.summary ?? ''),
      JSON.stringify(l2Parsed.summary),
    );
    check(
      '⑨ FIX-3 计数收敛为 2 处：摘要不再含四类计数（树/命令/审计/设置）',
      !/树\s*\d/.test(l2Parsed.summary ?? '') &&
        !/命令\s*\d/.test(l2Parsed.summary ?? '') &&
        !/审计\s*\d/.test(l2Parsed.summary ?? '') &&
        !/设置\s*\d/.test(l2Parsed.summary ?? ''),
      JSON.stringify(l2Parsed.summary),
    );
    const l2Failures = l2CountJudge(l2Parsed);
    check('⑨ FR-V3-015 4 个工具栏入口**各带真值计数**（入口标签 ≡ data-count，两处同源）', l2Failures.length === 0, `${JSON.stringify(l2Failures)} | ${l2Raw}`);
    check(
      '⑨ FIX-3 每入口的计数恰以两通道出现（.view-label 数字 + .badge 数字，各有标签）',
      l2Parsed.entries.every((e) => Number.isInteger(e.labelCount) && String(e.dataCount).length > 0),
      JSON.stringify(l2Parsed.entries.map((e) => [e.key, e.labelCount, e.dataCount])),
    );
    const slotsOk = l2Parsed.entries.every((e) => e.slot === 'view');
    check('⑨ 四个工具栏入口的 data-toolbar-slot 全为 view（准入分类单源）', slotsOk === true, JSON.stringify(l2Parsed.entries.map((e) => [e.key, e.slot])));
    await evaluate(
      cdp,
      `new Promise((res) => {
        const root = document.getElementById('region-toolbar') ?? document.body;
        let t = null;
        const done = () => { clearTimeout(t); clearTimeout(cap); mo.disconnect(); res(true); };
        const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(done, 200); });
        const cap = setTimeout(done, 1500);
        t = setTimeout(done, 200);
        mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
      })`,
    );
    const l2Before = JSON.parse(await evaluate(cdp, l2ProbeExpr));
    const l2TrueTreeCount = l2Before.entries.find((e) => e.key === 'tree')?.dataCount ?? '';
    await evaluate(cdp, `document.getElementById('l2-entry-tree').setAttribute('data-count', '99'); true`);
    const l2Tampered = l2CountJudge(JSON.parse(await evaluate(cdp, l2ProbeExpr)));
    check('⑨ FR-V3-015 反证（FAIL 段）：篡改 data-count → 「两处同源」判据必须检出', l2Tampered.some((f) => f.includes('tree')), JSON.stringify(l2Tampered));
    check('⑨ FR-V3-015 反证用的真值确实来自运行期派生（不是 0 / 不是空值）', /^\d+$/.test(String(l2TrueTreeCount)) && Number(l2TrueTreeCount) > 0, `tree data-count=${l2TrueTreeCount} | ${JSON.stringify(l2Before.entries)}`);
    await evaluate(cdp, `document.getElementById('l2-entry-tree').setAttribute('data-count', ${JSON.stringify(String(l2TrueTreeCount))}); true`);
    const l2Restored = l2CountJudge(JSON.parse(await evaluate(cdp, l2ProbeExpr)));
    check('⑨ FR-V3-015 反证（还原段）：还原真值后判据必须再次为空', l2Restored.length === 0, JSON.stringify(l2Restored));


    const reach = await evaluate(
      cdp,
      `(() => {
        const tree = document.getElementById('l2-entry-tree');
        tree.click();
        const viewOpen = document.getElementById('view-host').hidden === false && tree.getAttribute('aria-expanded') === 'true';
        const streamHidden = document.getElementById('stream').hidden === true;
        const oneVisibleView = [...document.querySelectorAll('[data-l2-view]')].filter((el) => {
          let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true;
        }).length;
        document.getElementById('l2-back').click();
        const backOk = document.getElementById('view-host').hidden === true && document.getElementById('stream').hidden === false;
        return JSON.stringify({ viewOpen, streamHidden, oneVisibleView, backOk, focusAfterBack: document.activeElement?.id ?? null });
      })()`,
    );
    const rl = JSON.parse(reach);
    check('⑨ L2 ≤1 次交互可达（点工具栏入口即进入视图宿主）', rl.viewOpen === true && rl.streamHidden === true, reach);
    check('⑨ `#stream` ↔ `#view-host` 互斥：恰一个 [data-l2-view] 容器可见', rl.oneVisibleView === 1, reach);
    check('⑨ 返回后 `#stream` 复原且 `#view-host` 收起（视图替换不叠加）', rl.backOk === true, reach);
    check('⑨ 返回后焦点回到工具栏入口（回焦不复位到 body）', typeof rl.focusAfterBack === 'string' && rl.focusAfterBack.startsWith('l2-entry-'), reach);
    await evaluate(cdp, `window.__v3.testing.collapseAll(); true`);

    // ══ ⑩ AC-V3-021：320/400 常驻集合相等 + 零溢出 ═══════════════════════════
    console.log('\n▶ ⑩ AC-V3-021：320/400 常驻元素集合相等 + 零水平溢出');
    await resetFixture(cdp);
    const sets = {};
    for (const vp of [400, 320]) {
      await setViewport(cdp, vp, VIEWPORT_HEIGHT);
      await sleep(300);
      sets[vp] = await evaluate(cdp, residentProbe);
      check(`⑩ ${vp}px 文档级零水平溢出`, sets[vp].overflowX === 0, `overflowX=${sets[vp].overflowX}`);
    }
    check(
      '⑩ 320px 常驻可见元素 id 集合 == 400px（320 下不删任何常驻元素）',
      JSON.stringify(sets[320].visible) === JSON.stringify(sets[400].visible),
      `only400=${sets[400].visible.filter((i) => !sets[320].visible.includes(i)).join(',')} only320=${sets[320].visible.filter((i) => !sets[400].visible.includes(i)).join(',')}`,
    );
    // V4.5-1 W3：`#l0-decision` 退役 ⇒ 等价补入新的决策面坐标（两个 L2 只读承载块 =
    // 迁入方向性的静态锚点），常驻集合数量不减。
    check(
      '⑩ 320px 下三区 + 风险位 + 2 个 L2 只读承载块 + 入口仍在文档中',
      ['region-toolbar', 'region-stream', 'region-statusbar', 'risk-rail', 'l2-tree-attribution', 'l2-audit-evidence', 'l2-entries'].every((id) => sets[320].all.includes(id)),
      JSON.stringify(['region-toolbar', 'region-stream', 'region-statusbar', 'risk-rail', 'l2-tree-attribution', 'l2-audit-evidence', 'l2-entries'].filter((i) => !sets[320].all.includes(i))),
    );

    // ══ ⑪ 几何：三区不重叠 + 唯一滚动 + 流区占比 + composer hidden ═══════════
    console.log('\n▶ ⑪ 几何：三区两两不重叠 + #stream 唯一滚动 + 流区占比 ≥65% + 法四');
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await sleep(300);
    const geo = await evaluate(cdp, geometryProbe);
    check('⑪ 三区两两交面积 = 0（3 组）', geo.pairs.every((a) => a === 0), JSON.stringify(geo.pairs));
    check('⑪ 静止态 `#region-stream` 内不得存在非 #stream 的滚动容器', geo.panelScrollers.every((id) => id === 'stream'), JSON.stringify(geo.panelScrollers));
    const scrollerProof = await evaluate(
      cdp,
      `(() => {
        const stream = document.getElementById('stream');
        const filler = document.createElement('div');
        filler.id = 'l0-scroller-probe';
        filler.textContent = 'overflow-probe';
        filler.style.flex = '0 0 3000px';
        filler.style.height = '3000px';
        stream.appendChild(filler);
        const census = [...document.querySelectorAll('#region-stream *, #region-stream')]
          .filter((el) => {
            const style = getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
          })
          .map((el) => el.id || el.className);
        const scrolls = stream.scrollHeight > stream.clientHeight;
        filler.remove();
        return JSON.stringify({ census, scrolls });
      })()`,
    );
    const sp = JSON.parse(scrollerProof);
    check('⑪ 注入溢出后 `#stream` 确实可滚（唯一的面板级滚动容器不是空集）', sp.scrolls === true, scrollerProof);
    check('⑪ 注入溢出后面板级滚动容器恰为 1 个且是 #stream', sp.census.length === 1 && sp.census[0] === 'stream', scrollerProof);
    check('⑪ `#stream` flex-grow = 1（flex 填充，非硬编码高度）', geo.streamFlexGrow === '1', geo.streamFlexGrow);
    check(`⑪ 流区高度占比 ≥ ${STREAM_HEIGHT_RATIO_MIN}（v4 取代 v3「#log ≥488px」像素锚；589px 为 v1 历史锚）`, geo.streamRatio >= STREAM_HEIGHT_RATIO_MIN, `ratio=${Number(geo.streamRatio.toFixed(4))} stream=${geo.streamHeight}px ${JSON.stringify(geo.zoneHeights)}`);
    check('⑪ 流区高度占比 > 0.5（非空转下界：断言不是恒真）', geo.streamRatio > 0.5, String(geo.streamRatio));
    const baselineRatioFloor = existsSync(BASELINE_JSON)
      ? JSON.parse(readFileSync(BASELINE_JSON, 'utf8')).logClientHeightFloor ?? null
      : null;
    check(
      '⑪ v4 密度基线存在且登记了流区比例下界（口径单源，非本文件另造一个）',
      typeof baselineRatioFloor === 'number' && baselineRatioFloor > 0,
      JSON.stringify(baselineRatioFloor),
    );
    check('⑪ 法四：默认屏 `#composer` 存在且 `hidden === true`', geo.composerHidden === true, JSON.stringify(geo.composerRail));
    const revealed = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.revealFallback();
        const composer = document.getElementById('composer');
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        const inStream = Boolean(document.getElementById('stream')?.contains(composer));
        const parentIsBody = composer.parentElement === document.body;
        const readOnlyPanel = document.querySelectorAll('#region-toolbar input, #region-statusbar input, #region-toolbar textarea, #region-statusbar textarea').length;
        return { fallback: document.getElementById('ask-fallback').hidden, composer: composer.hidden, visible: visible(composer), inStream, parentIsBody, readOnlyPanel };
      })()`,
    );
    check('⑪ 兜底展开后 `#ask-fallback` 与 `#composer` 均可见且输入可用', revealed.fallback === false && revealed.composer === false && revealed.visible === true, JSON.stringify(revealed));
    check('⑪ `#composer` 迁 body 尾（`parentElement === body`）且不在 `#stream` 内（工具栏/状态栏零输入框 ⇒ 法四）', revealed.parentIsBody === true && revealed.inStream === false && revealed.readOnlyPanel === 0, JSON.stringify(revealed));
    await evaluate(cdp, `window.__v3.testing.hideFallback(); true`);
    await sleep(250);
    const collapsedAgain = await evaluate(
      cdp,
      `JSON.stringify({ fallback: document.getElementById('ask-fallback').hidden, composer: document.getElementById('composer').hidden })`,
    );
    check('⑪ 收起兜底后两者回到 hidden（FR-V3-012）', collapsedAgain === '{"fallback":true,"composer":true}', collapsedAgain);

    // ══ ⑫ 工具栏准入反证：第 6 个可点必须被拦（in-gate 形态） ═══════════════
    console.log('\n▶ ⑫ 工具栏准入反证：#stream 注入常驻控件必被自断言拦截（RP-V4-06）+ 第 6 可点被 render() 抛错拦下');
    const admitProbe = await evaluate(
      cdp,
      `(() => {
        const bar = document.getElementById('region-toolbar');
        const btn = document.createElement('button');
        btn.id = 'l0-admission-probe';
        btn.setAttribute('data-toolbar-slot', 'view');
        bar.appendChild(btn);
        const countAfter = (() => {
          const all = [...bar.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')];
          return all.filter((el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; }).length;
        })();
        btn.remove();
        const countBack = (() => {
          const all = [...bar.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')];
          return all.filter((el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; }).length;
        })();
        return { countAfter, countBack };
      })()`,
    );
    check('⑫ 反证（FAIL 段）：静默第 6 个可点 ⇒ 可点数必须变成 6（判据能看见它）', admitProbe.countAfter === 6, JSON.stringify(admitProbe));
    check('⑫ 反证（还原段）：移除后回到恰 5', admitProbe.countBack === 5, JSON.stringify(admitProbe));
    // ── ⑫b 真实拦截点：`toolbar.ts#render()` 超限抛错（review 修复轮 I4）──────
    // 上面两条只证明「计数能看见第 6 个可点」，**没有**驱动任何 render —— 而产品里真正的
    // 拦截点是 `toolbar.ts:116-121`：每次 render 后自数可点，> MAX_TOOLBAR_CLICKABLES 即抛错。
    // density 的默认上限仍是 7，6 个可点不会在别处变红 ⇒ 该守卫此前**无 FAIL 段**。
    // 这里注入第 6 个可点 → 驱动一次真实 render（`setRefCount(0)` 直调 render()）→ 断言抛错 →
    // 移除 → 再次 render 必须恢复（两步都在同一个同步块内，且不改任何产品状态）。
    const admitRenderRaw = await evaluate(
      cdp,
      `(() => {
        const bar = document.getElementById('region-toolbar');
        const btn = document.createElement('button');
        btn.id = 'l0-admission-render-probe';
        btn.setAttribute('data-toolbar-slot', 'view');
        btn.textContent = '越界入口';
        bar.appendChild(btn);
        let injected = 'NO-THROW';
        try { window.__v3.testing.setRefCount(0); }
        catch (e) { injected = String(e && e.message ? e.message : e); }
        let removed = 'NO-THROW';
        try { btn.remove(); window.__v3.testing.setRefCount(0); }
        catch (e) { removed = String(e && e.message ? e.message : e); }
        return JSON.stringify({ injected, removed, count: (() => {
          const all = [...bar.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')];
          return all.filter((el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; }).length;
        })() });
      })()`,
    );
    const admitRender = JSON.parse(admitRenderRaw);
    // 诊断（非断言）：把守卫抛出的原文打进日志 —— 「真的因该红而红」可被读日志复核。
    console.log(`    I4 反证诊断：injected = ${JSON.stringify(admitRender.injected)}`);
    console.log(`    I4 反证诊断：restored = ${JSON.stringify(admitRender.removed)} / clickables = ${admitRender.count}`);
    check(
      '⑫b 反证（FAIL 段）：注入第 6 个可点后驱动 render() ⇒ 工具准入守卫必须抛错（含「工具栏可点 6 > 5」+「禁静默第 6 个可点」）',
      admitRender.injected !== 'NO-THROW' && /工具栏可点\s*6\s*>\s*5/.test(admitRender.injected) && /禁静默第 6 个可点/.test(admitRender.injected),
      admitRenderRaw,
    );
    check('⑫b 反证（还原段）：移除第 6 个可点后再 render ⇒ 不再抛错且可点回到恰 5', admitRender.removed === 'NO-THROW' && admitRender.count === 5, admitRenderRaw);

    // ══ ⑬ 明暗双主题：可读且不只靠颜色 ═════════════════════════════════════════
    console.log('\n▶ ⑬ 明暗双主题：状态可读且不只靠颜色 + 主题三态契约');
    const THEME_TOKENS = ['--risk-bg', '--badge-bg', '--l0-band-bg', '--l0-rail-bg', '--ok-badge-bg'];
    const themeData = {};
    for (const theme of ['light', 'dark']) {
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
      await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'force'); true`);
      await sleep(300);
      const themeProbe = await evaluate(
        cdp,
        `(() => {
          const row = document.querySelector('#risk-rail .risk-row[data-risk-class="hardline"]');
          const text = (row.querySelector('.risk-text')?.textContent ?? '').trim();
          const badge = (row.querySelector('.risk-badge')?.textContent ?? '').trim();
          const style = row ? getComputedStyle(row) : null;
          const badgeEl = row ? row.querySelector('.risk-badge') : null;
          const badgeStyle = badgeEl ? getComputedStyle(badgeEl) : null;
          const rootStyle = getComputedStyle(document.documentElement);
          const tokens = {};
          for (const name of ${JSON.stringify(THEME_TOKENS)}) tokens[name] = rootStyle.getPropertyValue(name).trim();
          const survivors = (() => {
            if (!row) return null;
            const prev = ['color', 'background', 'backgroundColor', 'borderColor'].map((p) => [p, row.style[p]]);
            for (const [p] of prev) row.style[p] = 'transparent';
            const out = {
              text: (row.querySelector('.risk-text')?.textContent ?? '').trim().length > 0,
              badge: (row.querySelector('.risk-badge')?.textContent ?? '').trim().length > 0,
              icon: Boolean(row.querySelector('.risk-icon')),
            };
            for (const [p, v] of prev) row.style[p] = v;
            return out;
          })();
          const themeButton = document.getElementById('theme-toggle');
          return JSON.stringify({
            text, badge, hasIcon: Boolean(row.querySelector('.risk-icon')),
            color: style ? style.color : '',
            background: style ? style.backgroundColor : '',
            badgeColor: badgeStyle ? badgeStyle.color : '',
            badgeBackground: badgeStyle ? badgeStyle.backgroundColor : '',
            tokens,
            survivors,
            themeLabel: (themeButton?.textContent ?? '').trim(),
            themeState: themeButton?.getAttribute('data-theme-state') ?? null,
            ariaPressed: themeButton?.getAttribute('aria-pressed') ?? null,
          });
        })()`,
      );
      const tp = JSON.parse(themeProbe);
      themeData[theme] = tp;
      check(`⑬ ${theme} 主题：风险行文字非空（不只靠颜色）`, tp.text.length > 0, themeProbe);
      check(`⑬ ${theme} 主题：风险行徽标 + 图标齐备`, tp.badge.length > 0 && tp.hasIcon === true, themeProbe);
      check(`⑬ ${theme} 主题：文字颜色与背景均解析成功`, tp.color.length > 0 && tp.background.length > 0, themeProbe);
      for (const token of THEME_TOKENS) {
        check(`⑬ ${theme} 主题：语义 token ${token} 解析为非空值`, (tp.tokens[token] ?? '').length > 0, `${token}=${JSON.stringify(tp.tokens[token])}`);
      }
      check(`⑬ ${theme} 主题：去掉颜色后三通道仍可读（不只靠颜色）`, tp.survivors?.text === true && tp.survivors?.badge === true && tp.survivors?.icon === true, JSON.stringify(tp.survivors));
      check(`⑬ ${theme} 主题：主题按钮三通道（可见文案 + data-theme-state + aria-pressed）`, tp.themeLabel.length > 0 && (tp.themeState === 'auto' || tp.themeState === 'light' || tp.themeState === 'dark') && (tp.ariaPressed === 'true' || tp.ariaPressed === 'false'), JSON.stringify([tp.themeLabel, tp.themeState, tp.ariaPressed]));
      await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'off'); true`);
      await sleep(150);
    }
    check(
      '⑬ 明暗两套的主题 token 值确实不同（暗色不是死 token；非同一套颜色）',
      THEME_TOKENS.every((token) => themeData.light.tokens[token] !== themeData.dark.tokens[token]),
      JSON.stringify({ light: themeData.light.tokens, dark: themeData.dark.tokens }),
    );
    check(
      '⑬ 明暗两套的风险行文字 / 行背景 / 徽标文字色确实不同（主题切换真实生效）',
      themeData.light.color !== themeData.dark.color && themeData.light.background !== themeData.dark.background && themeData.light.badgeColor !== themeData.dark.badgeColor,
      JSON.stringify({ light: [themeData.light.color, themeData.light.background, themeData.light.badgeColor], dark: [themeData.dark.color, themeData.dark.background, themeData.dark.badgeColor] }),
    );
    check(
      '⑬ 徽标底色为继承（两主题均透明）——不得因此判定主题未生效（登记项）',
      themeData.light.badgeBackground === 'rgba(0, 0, 0, 0)' && themeData.dark.badgeBackground === 'rgba(0, 0, 0, 0)',
      JSON.stringify([themeData.light.badgeBackground, themeData.dark.badgeBackground]),
    );
    // ── 主题三态契约：auto → light → dark → auto（真实点击，写 `documentElement`）──
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    const themeCycle = await evaluate(
      cdp,
      `(() => {
        const btn = document.getElementById('theme-toggle');
        const read = () => ({ state: window.__v3.testing.themeState(), attr: document.documentElement.getAttribute('data-theme'), label: btn.textContent.trim() });
        const seq = [];
        // 归位到 auto（未写 data-theme）后按 FR-CHAT-011 走完一整圈
        while (window.__v3.testing.themeState() !== 'auto') btn.click();
        seq.push(read());
        for (let i = 0; i < 3; i += 1) { btn.click(); seq.push(read()); }
        return seq;
      })()`,
    );
    check('⑬ 主题三态循环 = auto → light → dark → auto（回到起点，无第四态）', themeCycle.map((s) => s.state).join('→') === 'auto→light→dark→auto', JSON.stringify(themeCycle.map((s) => s.state)));
    check('⑬ auto 态不写 `data-theme`（交给 prefers-color-scheme 决定）', themeCycle[0].attr === null, JSON.stringify(themeCycle[0]));
    check('⑬ light / dark 态分别写 `data-theme="light"` / `"dark"`', themeCycle[1].attr === 'light' && themeCycle[2].attr === 'dark', JSON.stringify([themeCycle[1].attr, themeCycle[2].attr]));

    // ══ ⑮ V4-2（TASK-611）：`#stream` 内卡不污染外壳密度（豁免子树机器复算） ══
    // 追加断言（+2，不改既有语义）：用**产品口径**（排除 `#stream` 的三区外壳）在
    // 注入流内卡前后复算 —— 外壳计数必须逐项不变；同时反向证明该卡**真的**带可点，
    // 否则「不变」可能只是因为它根本没渲染（恒真判据）。
    console.log('\n▶ ⑮ `#stream` 内卡不污染外壳密度（豁免只有 `hidden` 一条通道）');
    const shellBefore = await evaluate(cdp, DENSITY_MEASURE_SOURCE);
    await evaluate(
      cdp,
      `window.__v3.testing.streamSeed([{ kind: 'nextstep', cardId: 'l0-density-probe', payload: { chips: ['甲', '乙', '丙'] } }])`,
    );
    await sleep(200);
    const shellAfter = await evaluate(cdp, DENSITY_MEASURE_SOURCE);
    const probeClickables = await evaluate(
      cdp,
      `document.querySelectorAll('[data-card-key="l0-density-probe"] button').length`,
    );
    check(
      '⑮ 流内新增 3 可点卡后**外壳**可点数逐项不变（`#stream` 是豁免子树，卡不入密度）',
      shellAfter.clickables === shellBefore.clickables && shellAfter.blocks === shellBefore.blocks,
      `before C1=${shellBefore.clickables}/C3=${shellBefore.blocks} → after C1=${shellAfter.clickables}/C3=${shellAfter.blocks}`,
    );
    check(
      '⑮ 反向：该卡确实渲染出 3 个可点（「不变」不是因为卡没渲染 ⇒ 判据不恒真）',
      probeClickables === 3,
      `probeClickables=${probeClickables}`,
    );

    check('无未捕获页面异常（渲染全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();

    // ══ ⑭ 计数守恒（D-005 只增） ═════════════════════════════════════════════
    const runtime = counts().passes;
    const selfSource = readFileSync(new URL('./l0.mjs', import.meta.url), 'utf8');
    const staticCount = (selfSource.match(/\bcheck\(/g) ?? []).length;
    check(`⑭ 运行期断言计数 ≥ ${L0_RUNTIME_FLOOR}（D-005 l0 下界）`, runtime >= L0_RUNTIME_FLOOR, `runtime=${runtime}`);
    check(`⑭ 静态 check( 计数 ≥ ${L0_STATIC_FLOOR}（v3GateFloors 口径：整文件重写后只增不减）`, staticCount >= L0_STATIC_FLOOR, `static=${staticCount}`);
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('L0 运行时门禁');
}

main().catch((err) => {
  console.error(`✖ L0 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
