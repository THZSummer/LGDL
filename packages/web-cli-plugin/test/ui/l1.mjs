/**
 * V3-2 TASK-207 (ADR-V3-021 / ADR-V3-024) — the L1 runtime gate.
 *
 * `npm run test:l1` — exercises the real `dist/` product and asserts:
 *
 *   ① the eight L1 content classes are enumerable (8 `[data-l1-panel]`, all
 *      `hidden` by default) and **each one is ≤1 interaction** from the default
 *      state (FR-V3-031 / ADR-V3-021);
 *   ② an expanded L1 layer does not occlude L0: `#risk-rail` and the decision card
 *      stay inside the viewport and do not intersect the expanded region
 *      (FR-V3-030);
 *   ③ two mandatory consequence paragraphs per option + the irreversibility
 *      declaration for destructive options (FR-V3-032);
 *   ④ the reference evidence carries the four elements and is read-only — zero
 *      write controls (FR-V3-033);
 *   ⑤ the local tree is ≤3 nodes and the global-tree entry exists (FR-V3-034);
 *   ⑥ decided history: the count is recomputable and re-viewing has zero side
 *      effects (FR-V3-035);
 *   ⑦ the **five invalidation dimensions** are injected one by one → `invalid`
 *      with the matching dimension + the verbatim readable reason; the `unknown`
 *      scenarios (missing fact / page unreachable / ambiguous / replaced) are
 *      blocked too (FR-V3-036, fail-closed);
 *   ⑧ the invalidation is presented (risk rail + chip mark + readable reason) and
 *      **blocks** the action (command-send count = 0, with a non-vacuous control
 *      showing the counter really can move);
 *   ⑨ both recovery paths work (FR-V3-038) and re-selecting restores `valid`;
 *   ⑩ the receipt triple: summary resident in L0, evidence + audit exit in L1, and
 *      the evidence comes from a **real re-pull** (monotonic `refreshSeq`);
 *   ⑪ discoverability: every L1 trigger has non-empty text + a real count
 *      (FR-V3-040 / AC-V3-010);
 *   ⑫ density does not regress: an expand/collapse round-trip leaves the default
 *      tier's measured values inside 7/15 at 320/400/520 (reusing the v3-1
 *      caliber — no new caliber).
 *
 * Serial discipline: one Chromium instance, one page target, everything in order.
 */
import {
  CHROME,
  DIST,
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
import { DENSITY_MEASURE_SOURCE, DENSITY_LIMITS, evaluateDensity } from './density-metrics.mjs';
// I-02（R1 修复）：运行时门禁直接核对**产物字节**里的内层 guard 结构（dist/sidepanel.js）。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_ORIGIN = 'https://v3-l1.test';
const LLM_KEY = 'web-cli:web-cli:llm';
/** D-005 runtime floor（本叶台账 `v4GateFloors` 的 l1 下界；只增不减）。 */
const L1_RUNTIME_FLOOR = 111;
/** v3 静态 `check(` 计点下界（v3 台账近似值，只增）。 */
const L1_STATIC_FLOOR = 72;
/**
 * V4-1 TASK-509 —— 入口机制重写（内容契约保留）。
 *
 * v3 的八个 `[data-l1-panel]` 里有第七个 `l1-status`，它的宿主是 `#l0-status-band`
 * （「谁在管我」整条可点带）。v4-1 退役该带（工具栏只留 4 入口 + 主题），站点与授权
 * 分区同构迁入 `#settings-view`（法则六）⇒ `l1-status` **不再是一个可折叠 L1 面板**，
 * 而是「设置视图内的常驻分区」，1 次点击（工具栏设置入口）可达。
 *
 * 其余七类的折叠契约**逐字不变**（`hidden` 属性唯一、触发器 aria 成对、逐类 ≤1 次交互），
 * 但入口从「一次点击 `#l0-status-band` 连带展开五类」改为「各自触发器的 1 次点击」——
 * 这是**收紧**：v3 的连带展开是为了迁就 7/7 满额的可点预算，工具栏 = 常驻导航后
 * 每类都有自己的一等入口。
 */
/**
 * V4.5-1 W3（TASK-V45-108/109）—— 内容面契约等价重锚。
 *
 * 4 个固定位置宿主退役后，v3 的八个内容类各有唯一落位：`l1-more` / `l1-consequences`
 * 迁入 ask/auth 卡的决策区（**唯一活跃/最新卡**铸造 id）、`l1-ref-evidence` 迁入 ref 卡
 * 证据区、`l1-local-tree` / `l1-receipt` 迁入 L2 只读承载块、`l1-gestures` 迁设置「帮助」
 * 分区、`l1-status` 保持设置视图常驻分区、`l1-history` 退役（历史 = 流本身）。
 */
const CLASSES = [
  'l1-more',
  'l1-consequences',
  'l1-local-tree',
  'l1-receipt',
  'l1-gestures',
  'l2-tree-attribution',
  'l2-audit-evidence',
];
/** 静态/卡内面（默认夹具里在场；`l1-gestures` 要等设置视图挂载）。 */
const STATIC_FACES = ['l1-more', 'l1-consequences', 'l1-local-tree', 'l1-receipt', 'l2-tree-attribution', 'l2-audit-evidence'];
/**
 * 退役容器（**13**，review R1 BLOCK-01 起：`l0-receipt-summary` 是**迁移容器**，移除）+
 * 退役触发器（6）——零 DOM 残留。迁移容器的判据在 ⑩：有回执态时**恰 1** 个且在卡固化区内。
 */
const RETIRED_CONTAINERS = [
  'l0-decision', 'l0-pick', 'l0-status-band', 'l0-kicker', 'l0-more', 'l0-ref-toggle',
  'l1-group', 'l1-history-toggle', 'l1-history', 'l1-history-rows', 'l1-local-tree-toggle', 'l1-receipt-toggle',
  'l1-gestures-toggle',
];
const RETIRED_TRIGGERS = ['l0-more', 'l0-ref-toggle', 'l1-local-tree-toggle', 'l1-history-toggle', 'l1-receipt-toggle', 'l1-gestures-toggle'];
/** v4：状态/授权类的 1 次交互入口（设置视图的「站点与授权」分区）。 */
const STATUS_ENTRY = 'l2-entry-settings';
/** 卡内决策区的触发器（唯一活跃 ask/auth 卡铸造）。 */
const CARD_TRIGGERS = ['l1-more-toggle', 'l1-consequences-toggle'];
/** 卡内两个可折叠面的 id（等价取代 v3「八类全 hidden」的折叠语义）。 */
const CARD_FACE_IDS = ['l1-more', 'l1-consequences'];

/** The verbatim readable reasons (plan §2.3(4)) — the renderer must match. */
const REASON = {
  'dom-gone': '引用 1 的目标元素已不存在（选择器解析失败或元素被替换）',
  'origin-changed': '引用 1 属于 https://v3-l1.test，当前站点已是 https://other.test —— 跨站引用不可用',
  navigated: '引用 1 捕获后页面已导航（含单页路由切换），目标可能已重建',
  'declaration-changed': '引用 1 捕获后站点声明已变化（hash decl-1 → decl-2），目标语义可能已改变',
  'authorization-revoked': '引用 1 所在站点已被撤销授权',
};

const REF_FACTS = {
  selector: '#ref-target',
  semanticPath: '连接树 › 能力面 › 引用目标',
  textDigest: '引用目标文本摘要',
  origin: FIXTURE_ORIGIN,
  documentId: 'doc-1',
  navSeq: 1,
  declarationHash: 'decl-1',
  capturedAt: 1700000000000,
};
const GOOD_ENV = {
  currentOrigin: FIXTURE_ORIGIN,
  authorized: true,
  documentId: 'doc-1',
  navSeq: 1,
  declarationHash: 'decl-1',
};
const RESOLVED = { status: 'resolved', refMark: 'ref_1', nodeCount: 1 };

async function resetFixture(cdp) {
  await evaluate(
    cdp,
    `chrome.storage.local.set({ ${JSON.stringify(LLM_KEY)}: {
      active: 'openai',
      providers: { openai: { apiKey: 'v3-l1-key', model: 'v3-l1-mock', baseURL: 'http://127.0.0.1:9/v1' } },
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
  await waitFor(cdp, `document.getElementById('status').textContent.includes('v3-l1.test') ? '1' : ''`, 60, 200);
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'authorize', origin: ${JSON.stringify(FIXTURE_ORIGIN)}, hostPermissionGranted: false }).then(() => true)`,
  );
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await waitFor(cdp, `chrome.runtime.sendMessage({ kind: 'state' }).then((r) => r.data.authorized === true)`, 60, 200);
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await evaluate(cdp, `window.__v3.testing.collapseAll(); window.__v3.testing.reset(); true`);
  await evaluate(cdp, `window.__v3.testing.ask('这一步先做什么？', ['查看站点声明', '列出可用命令', '删除这条记录', '打开设置']); true`);
  await sleep(350);
}

/** In-page: visible-through-ancestors probe (the density caliber's exemption). */
const VISIBLE = `(el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); }`;

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'l1', extDir: DIST, portRange: [9400, 9499] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await resetFixture(cdp);

    // ── ① the eight classes are enumerable + each is ≤1 interaction ─────────
    console.log('\n▶ ① 内容面契约：可枚举 + 逐面可达 + 退役面零残留（W3 等价重锚）');
    const enumerated = await evaluate(
      cdp,
      `(() => {
        const panels = [...document.querySelectorAll('[data-l1-panel]')];
        const targets = [...(window.__v3.disclosure.targets || [])];
        return JSON.stringify({
          ids: [...new Set(panels.map((p) => p.getAttribute('data-l1-panel')))],
          dataIds: panels.map((p) => p.id),
          targets,
          // 退役面（容器 + 触发器）零残留：这是 W3「宿主清零」的内容侧坐标。
          retiredPresent: ${JSON.stringify([...RETIRED_CONTAINERS, ...RETIRED_TRIGGERS])}.filter((id) => document.getElementById(id) !== null),
          hosts: document.querySelectorAll('#stream [data-host], #stream [data-transitional-host]').length,
          streamForeign: [...document.getElementById('stream').children].filter((el) => !el.hasAttribute('data-msg-type') && !el.classList.contains('log-empty-text')).length,
        });
      })()`,
    );
    const en = JSON.parse(enumerated);
    check('① 在场内容面 ⊆ 折叠白名单（声明集合不得超出控制器）', en.ids.every((id) => en.targets.includes(id)), enumerated);
    check('① 6 个静态/卡内面齐备（`l1-gestures` 随设置视图挂载）', STATIC_FACES.every((f) => en.ids.includes(f)), enumerated);
    check('① 折叠白名单恰 7 项且与内容面契约同源', en.targets.length === 7 && CLASSES.every((c) => en.targets.includes(c)), enumerated);
    check('① 退役容器 / 退役触发器零 DOM 残留（13 + 6 项逐项；`l0-receipt-summary` 为迁移容器，不在此列）', en.retiredPresent.length === 0, JSON.stringify(en.retiredPresent));
    check('① 零宿主 + 纯卡序：`#stream` 无宿主、无非卡子节点', en.hosts === 0 && en.streamForeign === 0, JSON.stringify({ hosts: en.hosts, foreign: en.streamForeign }));

    // 卡内两面：默认夹具的 ask 卡在场，两个触发器可点且各自目标按 hidden 折叠。
    for (const [triggerId, targetId, parentId] of [['l1-more-toggle', 'l1-more', null], ['l1-consequences-toggle', 'l1-consequences', 'l1-more']]) {
      const probe = await evaluate(
        cdp,
        `(() => {
          window.__v3.testing.collapseAll();
          // The consequence preview lives INSIDE the option pool: open the pool first so
          // the nested target's visibility is judged on its own disclosure.
          const parent = ${JSON.stringify(parentId)};
          if (parent) { const p = document.getElementById(parent); if (p && p.hidden === true && document.getElementById('l1-more-toggle')) document.getElementById('l1-more-toggle').click(); }
          const trigger = document.getElementById(${JSON.stringify(triggerId)});
          const target = document.getElementById(${JSON.stringify(targetId)});
          const before = target ? target.hidden : null;
          trigger.click();
          const visible = ${VISIBLE};
          return JSON.stringify({
            before,
            afterHidden: target ? target.hidden : null,
            visible: target ? visible(target) : false,
            text: target ? (target.textContent || '').trim().length : 0,
            aria: trigger.getAttribute('aria-expanded'),
            controls: trigger.getAttribute('aria-controls'),
          });
        })()`,
      );
      const p = JSON.parse(probe);
      check(`① ${targetId}：默认 hidden → 1 次点击（${triggerId}）后可见且有非空内容`, p.before === true && p.afterHidden === false && p.visible === true && p.text > 0, probe);
      check(`① ${targetId}：1 次点击后触发器 aria-expanded=true（ARIA 与可见性同步）`, p.aria === 'true' && p.controls === targetId, probe);
    }
    // 视图内两面（L2 只读承载块）：离开视图即不可达 ——「视图内容不参与折叠」。
    const viewFaces = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        const visible = ${VISIBLE};
        const out = {};
        for (const id of ['l2-tree-attribution', 'l2-audit-evidence']) {
          const el = document.getElementById(id);
          out[id] = { exists: Boolean(el), hidden: el ? el.hidden : null, visible: el ? visible(el) : false };
        }
        return JSON.stringify(out);
      })()`,
    );
    const vf = JSON.parse(viewFaces);
    check('① 两个 L2 只读承载块存在且不被 collapseAll() 折叠（视图内容不参与自动折叠）', vf['l2-tree-attribution'].exists && vf['l2-tree-attribution'].hidden === false && vf['l2-audit-evidence'].exists && vf['l2-audit-evidence'].hidden === false, viewFaces);
    // 零宿主 / 纯卡序的**产品自断言** + 反证（RP-V4-06 同款：注入即抛错 ⇒ 判据不空转）。
    const orderSelf = await evaluate(
      cdp,
      `(() => {
        const verdict = (() => { try { window.__v3.testing.assertStreamPureCardOrder(); return 'ok'; } catch (e) { return String(e && e.message ? e.message : e); } })();
        // 反证 ①：注入 1 个 li[data-host] ⇒ 零宿主判据必须抛错。
        const host = document.createElement('li');
        host.setAttribute('data-host', 'forged');
        document.getElementById('stream').appendChild(host);
        let hostVerdict;
        try { window.__v3.testing.assertStreamPureCardOrder(); hostVerdict = 'NO-THROW'; } catch (e) { hostVerdict = String(e && e.message ? e.message : e); }
        host.remove();
        // 反证 ②：注入 1 个非卡子节点 ⇒ 纯卡序判据必须抛错。
        const foreign = document.createElement('div');
        foreign.textContent = 'forged';
        document.getElementById('stream').appendChild(foreign);
        let foreignVerdict;
        try { window.__v3.testing.assertStreamPureCardOrder(); foreignVerdict = 'NO-THROW'; } catch (e) { foreignVerdict = String(e && e.message ? e.message : e); }
        foreign.remove();
        // 还原段：移除注入后必须再次通过。
        const restored = (() => { try { window.__v3.testing.assertStreamPureCardOrder(); return 'ok'; } catch (e) { return String(e); } })();
        const shape = window.__v3.testing.streamShape();
        return JSON.stringify({ verdict, hostVerdict, foreignVerdict, restored, shape, auditCountDecls: document.querySelectorAll('#l2-audit-count').length, treeBlocks: document.querySelectorAll('#view-host #l2-tree-attribution, #view-host #l2-audit-evidence').length });
      })()`,
    );
    const os = JSON.parse(orderSelf);
    check('① 产品自断言 `assertStreamPureCardOrder()` 在真实产物上通过（零宿主 + 纯卡序）', os.verdict === 'ok', orderSelf);
    check('① 反证（FAIL 段）：注入 1 个 li[data-host] ⇒ 零宿主判据抛错（判据不空转）', typeof os.hostVerdict === 'string' && os.hostVerdict.includes('宿主'), String(os.hostVerdict));
    check('① 反证（FAIL 段）：注入 1 个非卡子节点 ⇒ 纯卡序判据抛错', typeof os.foreignVerdict === 'string' && os.foreignVerdict.includes('非卡子节点'), String(os.foreignVerdict));
    check('① 反证（还原段）：移除注入后自断言必须再次通过', os.restored === 'ok', String(os.restored));
    check('① 形状读数同源（卡子节点 = 投影卡数 ∧ 宿主 0 ∧ 外来子节点 0）', os.shape.hostNodes === 0 && os.shape.foreignChildren === 0, JSON.stringify(os.shape));
    check('① `#l2-audit-count`（已决步数）全仓唯一声明点（DOM 计数 = 1）', os.auditCountDecls === 1, String(os.auditCountDecls));
    check('① 两个 L2 只读承载块都挂在 `#view-host` 内（迁入方向性：不引入第二滚动容器）', os.treeBlocks === 2, String(os.treeBlocks));
    // 迁入块的「只读 + 有档」：两个承载块各自带 data-l2-block 标记与可读标题。
    const blockMeta = await evaluate(
      cdp,
      `(() => [...document.querySelectorAll('#l2-tree-attribution, #l2-audit-evidence')].map((el) => ({
        id: el.id,
        mark: el.getAttribute('data-l2-block'),
        title: (el.querySelector('.l2-block-title')?.textContent ?? '').trim(),
        clickables: el.querySelectorAll('button, a, input, select, textarea').length,
      })))()`,
    );
    for (const b of blockMeta) {
      check(`① ${b.id}：迁入块带 data-l2-block 标记 + 非空只读标题`, Boolean(b.mark) && b.title.length > 0, JSON.stringify(b));
      check(`① ${b.id}：迁入块零可点控件（只读承载，不成为第二交互面）`, b.clickables === 0, JSON.stringify(b));
    }

    // 设置「帮助」分区：一次交互（设置入口）即可达，且手势表 6 行单源。
    const helpSection = await evaluate(
      cdp,
      `(() => {
        const entry = document.getElementById(${JSON.stringify(STATUS_ENTRY)});
        entry.click();
        const section = document.getElementById('settings-help');
        const rows = [...document.querySelectorAll('#l1-gestures-rows tr')];
        const clickables = section ? section.querySelectorAll('button, a, input, select, textarea').length : -1;
        const panel = document.querySelector('[data-l1-panel="l1-gestures"]');
        const out = { sectionExists: Boolean(section), rows: rows.length, clickables, panelExists: Boolean(panel), panelHidden: panel ? panel.hidden : null };
        document.getElementById('settings-back').click();
        return JSON.stringify(out);
      })()`,
    );
    const hs = JSON.parse(helpSection);
    check('① 设置「帮助」分区 1 次交互可达（#settings-help 渲染为第 8 分区）', hs.sectionExists === true, helpSection);
    check('① 帮助分区手势表 6 行（单源 `L1_GESTURE_LABELS`）且分区内零可点控件', hs.rows === 6 && hs.clickables === 0, helpSection);
    check('① `l1-gestures` 面随分区挂载（第 7 个内容面就位）', hs.panelExists === true && hs.panelHidden === false, helpSection);

    // ── ①b v4 入口机制：状态/授权类 = 设置视图内的常驻分区（法则六） ────────
    const groupOpen = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        const visible = ${VISIBLE};
        const entry = document.getElementById(${JSON.stringify(STATUS_ENTRY)});
        const ariaBefore = entry.getAttribute('aria-expanded');
        entry.click();
        const sectionIds = ['topbar', 'l1-status-extra', 'llm-test-result', 'consent-slot'];
        const out = sectionIds.map((id) => {
          const el = document.getElementById(id);
          return [id, el ? visible(el) : null];
        });
        const settingsVisible = document.getElementById('settings-view').hidden === false;
        const chatReplaced = getComputedStyle(document.getElementById('region-stream')).display === 'none';
        const ariaOpen = entry.getAttribute('aria-expanded');
        document.getElementById('settings-back').click();
        return JSON.stringify({
          ariaBefore, out, settingsVisible, chatReplaced, ariaOpen,
          backHidden: document.getElementById('settings-view').hidden,
          chatDisplay: getComputedStyle(document.getElementById('region-stream')).display,
          ariaAfter: entry.getAttribute('aria-expanded'),
        });
      })()`,
    );
    const go = JSON.parse(groupOpen);
    check(`① 一次点击工具栏设置入口（${STATUS_ENTRY}）即进入 #settings-view（≤1 次交互，聊天区被替换）`, go.settingsVisible === true && go.chatReplaced === true, groupOpen);
    check('① 设置入口 aria-expanded 与设置视图可见性成对（per-target：open=true → 返回 false）', go.ariaBefore === 'false' && go.ariaOpen === 'true' && go.ariaAfter === 'false', groupOpen);
    check('① 「站点与授权」四件（topbar / l1-status-extra / llm-test-result / consent-slot）全部可见且非空', go.out.every(([, v]) => v === true), groupOpen);
    check('① 返回后 #settings-view 收起、三区复原（视图替换可逆）', go.backHidden === true && go.chatDisplay !== 'none', groupOpen);

    // ── ② expanded L1 does not occlude L0 (FR-V3-030) ───────────────────────
    console.log('\n▶ ② 展开不遮挡：风险位与决策卡仍在视口内且与展开区不交叠');
    const geo = await evaluate(
      cdp,
      `(() => {
        // V4.5-1 W3：展开面 = 卡内决策区（选项池 + 后果预演）。「展开只增滚动长度、
        // 不遮挡风险位与决策卡」的语义逐字保留，只有展开对象从退役的 L1 组换成卡内面。
        window.__v3.testing.collapseAll();
        for (const id of ['l1-more-toggle', 'l1-consequences-toggle']) {
          const el = document.getElementById(id);
          if (el && el.getAttribute('aria-expanded') === 'false') el.click();
        }
        const card = document.querySelector('[data-msg-type="askuser"]');
        const pool = document.getElementById('l1-more');
        const bar = document.getElementById('region-statusbar');
        const stream = document.getElementById('stream');
        const vh = window.innerHeight;
        const c = card.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        const s = stream.getBoundingClientRect();
        return JSON.stringify({
          cardInView: c.top >= -1 && c.bottom <= vh + 1,
          poolVisible: pool ? pool.hidden === false : false,
          groupInsideStream: Boolean(card && stream.contains(card)),
          streamBarOverlap: Math.max(0, Math.min(s.bottom, b.bottom) - Math.max(s.top, b.top)),
          barBottomVsStreamBottom: b.bottom >= s.bottom - 1,
          railInStatusbar: document.getElementById('region-statusbar').contains(document.getElementById('risk-rail')),
        });
      })()`,
    );
    const g = JSON.parse(geo);
    check('② 展开后决策卡（流内 ask 卡）仍完整在视口内（展开只增滚动长度，不遮挡）', g.cardInView === true, geo);
    check('② 展开区（卡内选项池）可见 ∧ 卡在滚动容器内 ∧ #stream 可见盒与状态栏零交叠', g.poolVisible === true && g.groupInsideStream === true && g.streamBarOverlap === 0 && g.barBottomVsStreamBottom === true, geo);
    check('② 风险位归属状态栏（v4 位置迁移后祖先闭包仍干净）', g.railInStatusbar === true, geo);

    // ── ③ consequences: two paragraphs each + irreversibility ───────────────
    console.log('\n▶ ③ 后果说明与影响预演：每选项两段必填 + 破坏性选项不可逆声明');
    await evaluate(cdp, `window.__v3.testing.collapseAll(); document.getElementById('l1-more-toggle').click(); true`);
    await sleep(200);
    const cons = await evaluate(
      cdp,
      `(() => {
        const blocks = [...document.querySelectorAll('#l1-consequences [data-consequence]')];
        return JSON.stringify(blocks.map((b) => ({
          label: b.getAttribute('data-consequence'),
          destructive: b.getAttribute('data-destructive') === 'true',
          will: (b.querySelector('[data-tpl]:not([data-irreversible])')?.textContent || '').startsWith('会发生什么：'),
          wont: /不会发生什么：/.test(b.textContent || ''),
          irreversibleShown: (() => { const el = b.querySelector('[data-irreversible]'); return el ? el.hidden === false : false; })(),
          irreversibleText: b.querySelector('[data-irreversible]')?.textContent || '',
        })));
      })()`,
    );
    const blocks = JSON.parse(cons);
    check('③ 每个选项一个后果块（4 个选项 → 4 块）', blocks.length === 4, cons);
    check('③ 每块都含「会发生什么」段（缺失即 FAIL）', blocks.every((b) => b.will === true), cons);
    check('③ 每块都含「不会发生什么」段（缺失即 FAIL）', blocks.every((b) => b.wont === true), cons);
    check('③ 破坏性选项（删除这条记录）有不可逆性声明且可见', blocks.some((b) => b.destructive && b.irreversibleShown && /不可逆性声明：/.test(b.irreversibleText)), cons);
    check('③ 非破坏性选项不显示不可逆性声明（不是一句「危险」套话）', blocks.filter((b) => !b.destructive).every((b) => b.irreversibleShown === false), cons);

    // ── ⑦ five dimensions → invalid + verbatim reasons ─────────────────────
    console.log('\n▶ ⑦ 引用失效 fail-closed：五维逐一注入 + 不确定即失效');
    const judge = async (facts, env, res) => {
      const raw = await evaluate(
        cdp,
        `(() => {
          window.__v3.testing.collapseAll();
          window.__v3.testing.reset();
          const rec = window.__v3.testing.l1('ref', ${JSON.stringify(facts)});
          const patch = ${JSON.stringify(env)};
          for (const k of Object.keys(patch)) if (patch[k] === null) delete patch[k];
          window.__v3.testing.l1('env', patch);
          window.__v3.testing.l1('res', ${JSON.stringify(res ?? null)});
          const report = window.__v3.testing.l1('report');
          const last = report.refs[report.refs.length - 1];
          // V4.5-1 W3：恢复区 / 证据层现在**只在 ref 卡内**铸造（唯一最新卡）——门禁必须先
          // 走一次真实投影动作，才能读取卡内 id（这正是「元素卡内化」的可达性证明）。
          if (last.verdict !== 'valid') {
            window.__v3.testing.refCard(Number(String(last.refId).replace('ref_', '')) || 1, 'stale', { why: last.reason });
          }
          return JSON.stringify({ refId: rec.facts.refId, verdict: last.verdict, reason: last.reason, refs: report.refs.length });
        })()`,
      );
      return JSON.parse(raw);
    };
    await evaluate(cdp, `window.__v3.testing.reset(); window.__v3.testing.l1('ref', ${JSON.stringify(REF_FACTS)}); true`);
    await evaluate(cdp, `window.__v3.testing.l1('env', ${JSON.stringify(GOOD_ENV)}); true`);
    await evaluate(cdp, `window.__v3.testing.l1('res', ${JSON.stringify(RESOLVED)}); true`);
    const valid = await evaluate(cdp, `JSON.stringify(window.__v3.testing.l1('report').refs.slice(-1)[0])`);
    const validRec = JSON.parse(valid);
    check('⑦ 事实齐备 + 环境确认 + 节点身份匹配 → valid（唯一的放行态）', validRec.verdict === 'valid', valid);

    const dims = [
      ['dom-gone', { resolution: { status: 'missing' } }],
      ['origin-changed', { resolution: RESOLVED, env: { currentOrigin: 'https://other.test' } }],
      ['navigated', { resolution: RESOLVED, env: { navSeq: 2 } }],
      ['declaration-changed', { resolution: RESOLVED, env: { declarationHash: 'decl-2' } }],
      ['authorization-revoked', { resolution: RESOLVED, env: { authorized: false } }],
    ];
    for (const [dimension, mutation] of dims) {
      const rec = await judge(REF_FACTS, { ...GOOD_ENV, ...(mutation.env ?? {}) }, mutation.resolution);
      check(`⑦ ${dimension} → 判定 invalid（维度被逐维注入）`, rec.verdict === 'invalid', JSON.stringify(rec));
      const rail = await evaluate(
        cdp,
        `(() => {
          const row = document.querySelector('#risk-rail .risk-row[data-risk-class="staleRef"]');
          // V4.5-1 W3：芯片 / 恢复入口的载体迁入 ref 卡（退役的 #l0-ref-toggle /
          // #l0-ref-badge 由卡内 chip + #l1-ref-actions 等价承载）。
          return JSON.stringify({ exists: Boolean(row), text: row ? (row.querySelector('.risk-text')?.textContent || '').trim() : '', badge: row ? (row.querySelector('.risk-badge')?.textContent || '').trim() : '', icon: row ? Boolean(row.querySelector('.risk-icon')) : false, actionsVisible: (() => { const a = document.getElementById('l1-ref-actions'); return a ? a.hidden === false : null; })(), repick: document.querySelector('#l1-ref-repick')?.textContent ?? '' });
        })()`,
      );
      const r = JSON.parse(rail);
      const ordinal = Number(/^ref_(\d+)$/.exec(rec.refId)?.[1]);
      const expected = REASON[dimension].replace('引用 1 ', `引用 ${ordinal} `);
      check(`⑦ ${dimension} → 风险位常驻该行且三通道齐备（文字+徽标+图标）`, r.exists && r.text.length > 0 && r.badge.length > 0 && r.icon, rail);
      check(`⑦ ${dimension} → 可读原因指到该维（逐字）`, r.text === expected, `${r.text} ≠ ${expected}`);
      // V4-4 TASK-806: the retired `#l0-pick` used to be rewritten to「重新拾取」; the
      // recovery entry is now the `#l1-ref-repick` button itself (same wording, same
      // single production entry `requestPick()`).
      check(`⑦ ${dimension} → 卡内恢复区可见 + 恢复入口为「重新拾取」`, r.actionsVisible === true && /^重新拾取/.test(r.repick), rail);
    }
    const crossOrigin = await judge(REF_FACTS, { ...GOOD_ENV, currentOrigin: 'https://other.test' }, RESOLVED);
    check(
      '⑦ EC-V3-014：跨站引用（A 站引用带到 B 站）→ 立即 invalid 且原因逐字',
      crossOrigin.verdict === 'invalid' && crossOrigin.reason.includes('跨站引用不可用'),
      JSON.stringify(crossOrigin),
    );

    // ── unknown scenarios (fail-closed) ────────────────────────────────────
    const unknownCases = [
      ['事实缺失（无 selector）', { ...REF_FACTS, selector: '' }, GOOD_ENV, RESOLVED],
      ['页面侧不可达（无 resolution）', REF_FACTS, GOOD_ENV, undefined],
      ['页面侧不可达（unreachable）', REF_FACTS, GOOD_ENV, { status: 'unreachable' }],
      ['选择器歧义（命中 2 个）', REF_FACTS, GOOD_ENV, { status: 'ambiguous', nodeCount: 2 }],
      ['元素被替换为同类新元素（身份标记不符）', REF_FACTS, GOOD_ENV, { status: 'resolved', refMark: 'ref_999', nodeCount: 1 }],
    ];
    for (const [label, facts, env, res] of unknownCases) {
      const rec = await judge(facts, env, res);
      check(`⑦ 不确定场景「${label}」→ 按失效处理（unknown 且被阻断）`, rec.verdict === 'unknown', JSON.stringify(rec));
      check(`⑦ 不确定场景「${label}」→ 可读原因写明「无法确认…按失效处理」`, /无法确认引用/.test(rec.reason) && /按失效处理/.test(rec.reason), rec.reason);
    }

    // ── ⑧ blocking is real + non-vacuous ───────────────────────────────────
    console.log('\n▶ ⑧ 阻断：失效态下命令发送计数 = 0（含非空转对照）');
    const blocked = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        window.__v3.testing.reset();
        const env = ${JSON.stringify(GOOD_ENV)};
        const ref = window.__v3.testing.l1('ref', ${JSON.stringify(REF_FACTS)});
        window.__v3.testing.l1('env', env);
        // The identity mark must be THIS reference's id (D1 compares node identity).
        window.__v3.testing.l1('res', { status: 'resolved', refMark: ref.facts.refId, nodeCount: 1 });
        const good = window.__v3.testing.l1("act", ref.facts.refId, "pick");
        const before = window.__v3.testing.l1('report').commandSends;
        window.__v3.testing.l1('res', { status: 'missing' });
        const bad = window.__v3.testing.l1("act", ref.facts.refId, "pick");
        const after = window.__v3.testing.l1('report').commandSends;
        const railText = (document.querySelector('#risk-rail .risk-row[data-risk-class="staleRef"] .risk-text') || {}).textContent || '';
        return JSON.stringify({ goodAllowed: good.allowed, goodSent: good.sent, before, badAllowed: bad.allowed, badSent: bad.sent, after, reason: bad.reason, railText });
      })()`,
    );
    const b = JSON.parse(blocked);
    check('⑧ 有效引用可动作（非空转对照：计数真的会动）', b.goodAllowed === true && b.goodSent === true && b.before >= 1, blocked);
    check('⑧ 失效引用被阻断：命令发送计数增量为 0', b.badAllowed === false && b.badSent === false && b.after === b.before, blocked);
    check('⑧ 阻断给出可读原因（不是静默失败）', /已不存在|无法确认/.test(b.reason), b.reason);
    check('⑧ 阻断态风险位写明该维原因', /目标元素已不存在/.test(b.railText), b.railText);
    check(
      '⑧ D1 反证（FAIL 段）：同一引用在 resolution=missing 时被阻断，在 resolved 时放行 —— 判据不是恒真',
      b.goodAllowed === true && b.badAllowed === false,
      blocked,
    );

    // ── I-02（R1 修复）：把**内层**阻断（ref-store.dispatch 的重新判定）纳入运行时门禁 ──
    // 为什么不能靠行为扰动 pin：阻断是双层实现（外层 `panels.dispatchRefAction` 的
    // `isRefUsable` + 内层 `store.dispatch` 的 `evaluateRefValidity`）。在产品的**唯一调用点**
    // 下两者同源同参（同一函数、同一 env、同一 record），因此「只弱化内层」的行为扰动在运行时
    // **不可观测** —— 这一点由 `RP-L1-C2` 做成机器事实（注入后门禁必须能 FAIL，正是靠下方断言）。
    // 故运行时 pin = 产物字节里的**内层 guard 结构**（下方两条，可被 RP-L1-C2 打红）+
    // 内层 guard 的**行为**由 `test/l1-ref-validity.test.ts` 的 Node 运行时用例 pin（含
    // 「valid 放行计数真的动」的非空转对照）。两层合起来：结构存在 + 行为正确 + 可失败。
    const sidepanelJs = readFileSync(join(DIST, 'sidepanel.js'), 'utf8');
    const innerGuard = /if \(view\.verdict !== ["']valid["']\) \{\s*return \{ allowed: false,[\s\S]{0,240}?sends \+= 1;/.exec(sidepanelJs);
    const innerGuardHits = (sidepanelJs.match(/if \(view\.verdict !== ["']valid["']\) \{/g) ?? []).length;
    check(
      '⑧ 内层阻断 guard 在产物字节中存在且唯一（ref-store.dispatch：verdict !== "valid" → allowed:false，且 sends+=1 在其后）',
      innerGuard !== null && innerGuardHits === 1,
      `guardHits=${innerGuardHits} matched=${innerGuard !== null}`,
    );
    const guardIdx = sidepanelJs.indexOf('if (view.verdict !== "valid") {');
    const sendsIdx = sidepanelJs.indexOf('sends += 1;');
    const sendsHits = (sidepanelJs.match(/sends \+= 1;/g) ?? []).length;
    check(
      '⑧ 内层 guard 位于**唯一的** `sends += 1` 自增之前（守卫是第一句，先判后发）',
      guardIdx >= 0 && sendsIdx > guardIdx && sendsHits === 1,
      `guard@${guardIdx} sends@${sendsIdx} sendsHits=${sendsHits}`,
    );

    // ── EC-V3-015（I-08 补齐）：破坏性确认期间折叠披露层，风险行与确认选项仍在 L0 可见 ──
    console.log('\n▶ EC-V3-015：确认态 + 折叠全部披露层 → 风险行与确认选项仍常驻可见');
    await evaluate(cdp, `window.__v3.testing.collapseAll(); window.__v3.testing.setRisk('confirm', 'force'); true`);
    await sleep(250);
    const ec15 = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        const visible = (el) => { if (!el) return false; let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        const rail = document.getElementById('risk-rail');
        const confirmRow = rail ? rail.querySelector('.risk-row[data-risk-class="confirm"]') : null;
        // V4-3: the confirm risk class is projection-only here; the inline confirm card
        // is retired and covered by test/ui/ask-auth-inflow.mjs. What must hold during
        // folding is: L1 all hidden, the confirm RISK row resident, and zero bypassing
        // allow/deny control anywhere outside the (absent) card.
        const decisionScope = document.querySelector('[data-msg-type="askuser"], [data-msg-type="auth"]') ?? document.getElementById('stream');
        const allowControls = [...decisionScope.querySelectorAll('button, [role="button"]')]
          .filter(visible)
          .filter((b) => /^(允许|放行|允许执行|忽略硬底线|覆盖)$/.test((b.textContent || '').trim()));
        // V4.5-1 W3：卡内 / 视图内面不参与 collapseAll（视图内容不折叠）；折叠语义的
        // 等价判据 = 两个卡内面已收起。
        const l1Hidden = ['l1-more', 'l1-consequences'].every((id) => { const n = document.getElementById(id); return n ? n.hidden === true : true; });
        return JSON.stringify({
          l1AllHidden: l1Hidden,
          confirmRowVisible: visible(confirmRow),
          allowControls: allowControls.length,
          railVisible: visible(rail),
          railInFoldable: (() => { let n = rail; while (n) { if (n.hasAttribute && n.hasAttribute('data-l1-panel')) return true; n = n.parentElement; } return false; })(),
        });
      })()`,
    );
    const e15 = JSON.parse(ec15);
    check(
      'EC-V3-015 确认期间折叠披露层后：L1 面板全 hidden，确认风险行常驻可见 + 零旁路控件',
      e15.l1AllHidden === true && e15.confirmRowVisible === true && e15.allowControls === 0 && e15.railVisible === true && e15.railInFoldable === false,
      ec15,
    );
    await evaluate(cdp, `window.__v3.testing.setRisk('confirm', 'off'); true`);
    await sleep(150);

    // ── ⑨ two recovery paths ───────────────────────────────────────────────
    console.log('\n▶ ⑨ 两条恢复路径：#l1-ref 内的「重新拾取」与「改用描述」');
    const recovery = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        window.__v3.testing.reset();
        window.__v3.testing.l1('ref', ${JSON.stringify(REF_FACTS)});
        window.__v3.testing.l1('env', ${JSON.stringify(GOOD_ENV)});
        window.__v3.testing.l1('res', { status: 'missing' });
        const before = window.__v3.testing.l1('report');
        // V4.5-1 W3：证据层 / 恢复区现在由 ref 卡承载（唯一最新卡铸造 id）——先走一次
        // 真实投影动作铸造卡，再按真实 UI 路径读取 / 点击卡内控件。
        window.__v3.testing.refCard(Number(String(before.refs[before.refs.length - 1].refId).replace('ref_', '')) || 1, 'stale', { why: before.refs[before.refs.length - 1].reason });
        const actionsVisible = document.getElementById('l1-ref-actions').hidden === false;
        const reason = document.getElementById('l1-ref-reason').textContent || '';
        const badgeVisible = document.querySelector('.ref-stale-badge') ? document.querySelector('.ref-stale-badge').hidden === false : null;
        document.getElementById('l1-ref-describe').click();
        // V4-3（TASK-711 R2 / RP-L1-E 重 pin）：ask-fallback 不再常驻 —— 它由流内 ask 卡
        // 按需铸造（revealFallback -> revealAskFallback 先建 text 卡再揭示）。
        // 读取必须空安全：否则「改用描述」被注入为 no-op 时这里会抛 TypeError，反证变成
        // 「因错而红」（判定器会正确判无效），而不是具名断言失败。语义不变：无兜底节点 = 未打开。
        const fallbackNode = document.getElementById('ask-fallback');
        const fallbackOpen = fallbackNode ? fallbackNode.hidden === false : false;
        // V4-4（BLOCK-03）：ref 卡的「改用描述」是**卡内局部披露**（.ref-fallback 类），
        // 不新造第二个输入框 —— W3 后两种载体之一可见即等价。
        const refFallback = document.querySelector('.ref-fallback');
        const refFallbackOpen = refFallback ? refFallback.hidden === false : false;
        const visibleTextInputs = [...document.querySelectorAll('input[type="text"], input:not([type])')].filter((el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; }).length;
        // N-04（2026-09-16 收口轮）：面板不再自己写「{status:'resolved', refMark:新id}」。
        // 重拾由「调用方传入新鲜事实」发起，页面侧观测（这里由门禁扮演调用方）在拿到
        // 新 id 之后注入 —— 观测驱动，而不是断言驱动。
        const fresh = window.__v3.testing.l1('repick', ${JSON.stringify(REF_FACTS)});
        window.__v3.testing.l1('res', { status: 'resolved', refMark: fresh.facts.refId, nodeCount: 1 });
        const after = window.__v3.testing.l1('report');
        return JSON.stringify({
          beforeStale: before.stale, actionsVisible, reason, badgeVisible, fallbackOpen, refFallbackOpen, visibleTextInputs,
          beforeIds: before.refs.map((r) => r.refId), afterIds: after.refs.map((r) => r.refId),
          verdicts: after.refs.map((r) => r.verdict), stale: after.stale,
          repickCount: after.refs.length,
        });
      })()`,
    );
    const rec9 = JSON.parse(recovery);
    check('⑨ 失效态下恢复路径可见 + 可读原因给出', rec9.actionsVisible === true && rec9.reason.length > 0, recovery);
    check('⑨ 卡内失效徽标可见（三通道之一，`.ref-stale-badge` 承载退役的 `#l0-ref-badge`）', rec9.badgeVisible === true, recovery);
    check('⑨ 「改用描述」走既有兜底输入（卡内 `.ref-fallback` 或 #ask-fallback，二者之一可见）', rec9.fallbackOpen === true || rec9.refFallbackOpen === true, recovery);
    check('⑨ 「改用描述」不新造第 3 个输入框（可见文本输入 ≤2：卡内兜底 + 兜底 composer）', rec9.visibleTextInputs <= 2, recovery);
    check('⑨ 「重新拾取」产生 NEW id（失效 id 不重用）', rec9.repickCount === rec9.beforeIds.length + 1 && !rec9.beforeIds.includes(rec9.afterIds[rec9.afterIds.length - 1]), recovery);
    check('⑨ 恢复后引用回到 valid 态（判据重跑，不是缓存）', rec9.verdicts[rec9.verdicts.length - 1] === 'valid' && rec9.stale === 0, recovery);

    // ── ⑨b N-04：repick 不自证「重拾成功」（观测驱动，未观测 ⇒ fail-closed） ──
    console.log('\n▶ ⑨b N-04 重拾不再自证：无观测 ⇒ unknown；调用方给出观测 ⇒ valid');
    const n04 = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        window.__v3.testing.reset();
        const rec = window.__v3.testing.l1('ref', ${JSON.stringify(REF_FACTS)});
        window.__v3.testing.l1('env', ${JSON.stringify(GOOD_ENV)});
        window.__v3.testing.l1('res', { status: 'missing' });
        const staleBefore = window.__v3.testing.l1('report').stale;
        const fresh = window.__v3.testing.l1('repick', ${JSON.stringify(REF_FACTS)});
        const noObs = window.__v3.testing.l1('report').refs.slice(-1)[0].verdict;
        window.__v3.testing.l1('res', { status: 'resolved', refMark: fresh.facts.refId, nodeCount: 1 });
        const withObs = window.__v3.testing.l1('report').refs.slice(-1)[0].verdict;
        return JSON.stringify({ staleBefore, noObs, withObs, oldId: rec.facts.refId, newId: fresh.facts.refId });
      })()`,
    );
    const rn = JSON.parse(n04);
    check('⑨b N-04 重拾无观测 ⇒ 新引用保持 unknown（面板不再自己断言 resolved）', rn.noObs === 'unknown', n04);
    check('⑨b N-04 调用方给出真实观测 ⇒ 同一条引用转为 valid（观测驱动而非自证）', rn.withObs === 'valid', n04);
    check('⑨b N-04 重拾产生 NEW id（旧 id 不重用）', /^ref_\d+$/.test(rn.newId) && rn.newId !== rn.oldId, n04);

    // ── ⑨c N-05：reset() 必须真的清空 env（合并语义会掩盖「env 缺失」） ──────
    console.log('\n▶ ⑨c N-05 reset() 清空 env：残留 env 不得把「env 缺失」掩盖成 valid');
    const n05 = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.reset();
        const r1 = window.__v3.testing.l1('ref', ${JSON.stringify(REF_FACTS)});
        window.__v3.testing.l1('env', ${JSON.stringify(GOOD_ENV)});
        window.__v3.testing.l1('res', { status: 'resolved', refMark: r1.facts.refId, nodeCount: 1 });
        const before = window.__v3.testing.l1('report').refs.slice(-1)[0].verdict;
        window.__v3.testing.reset();
        const r2 = window.__v3.testing.l1('ref', ${JSON.stringify(REF_FACTS)});
        window.__v3.testing.l1('res', { status: 'resolved', refMark: r2.facts.refId, nodeCount: 1 });
        const after = window.__v3.testing.l1('report').refs.slice(-1)[0].verdict;
        return JSON.stringify({ before, after, id1: r1.facts.refId, id2: r2.facts.refId });
      })()`,
    );
    const r5 = JSON.parse(n05);
    check('⑨c N-05 reset() 清空 env：设置过 env 后 reset + 新建引用必须 unknown（判据为 env 缺失，而非 resolution）', r5.before === 'valid' && r5.after === 'unknown' && r5.id2 !== r5.id1, n05);

    // ── ⑩ receipt triple + real re-pull ───────────────────────────────────
    console.log('\n▶ ⑩ 回执三件套：摘要常驻 L0 + 证据/审计出口在 L1 + 重拉实测');
    const receipt = await evaluate(
      cdp,
      `(async () => {
        // V4.5-1 W3：回执摘要的载体 = **最新终态卡的固化区**（退役的 #l0-decision 壳
        // 不再持有它）——先铸造一张终态 ref 卡作为载体，再跑两次真实重拉。
        window.__v3.testing.streamReset();
        // 载体的真实形态 = 一张**终态卡**的固化区：走真实的 ask → 作答路径铸造它。
        window.__v3.testing.ask('回执载体', ['甲']);
        document.querySelector('[data-msg-type="askuser"] [data-act="choose"]').click();
        const first = await window.__v3.testing.l1('receipt', { ok: true, text: '✓ 已完成', actionId: 'revoke-origin', command: 'revoke', ms: 42, auditId: 'audit-7', tool: 'bookmarks' });
        const second = await window.__v3.testing.l1('receipt', { ok: true, text: '✓ 已完成', actionId: 'revoke-origin', command: 'revoke', ms: 50, auditId: 'audit-8', tool: 'bookmarks' });
        // v4 入口机制：审计出口现在从**工具栏入口**直达（v3 的 #l0-statusbar 入口面板已退役）
        document.getElementById('l2-entry-audit').click();
        const out = {
          seq1: first.refreshSeq, seq2: second.refreshSeq,
          pieces: window.__v3.testing.l1('report').pieces,
          summaryHidden: document.getElementById('l0-receipt-summary').hidden,
          summaryInFixed: Boolean(document.getElementById('l0-receipt-summary')?.closest('.card-fixed')),
          summaryInFrozenCard: Boolean(document.getElementById('l0-receipt-summary')?.closest('[data-frozen="true"]')),
          summaryText: document.getElementById('l0-receipt-summary').textContent || '',
          // V4.5-1 review R1 BLOCK-01：迁移容器在**有回执态**必须恰 1 个，且产品零宿主判据
          // （hosts().problems）在其存在时仍为 0 问题（此前它误入退役清单 ⇒ 假阳性）。
          // （注：本段处于模板字面量内 ⇒ 注释中不得出现未转义的反引号）
          summaryCount: document.querySelectorAll('#l0-receipt-summary').length,
          hostProblems: window.__v3.testing.hosts().problems,
          rows: [...document.querySelectorAll('#l1-receipt-rows .l1-row')].map((r) => r.textContent),
          // V4.5-1 W3：#l1-receipt-audit（「查看审计」按钮）**消解** —— 已在审计视图内；
          // 等价载体 = 审计视图标题 + 证据区标题。
          auditLabel: (document.getElementById('l2-title')?.textContent ?? '') + '／' + (document.querySelector('#l2-audit-evidence .l2-block-title')?.textContent ?? ''),
          auditSummary: document.getElementById('l1-receipt-audit-summary').textContent || '',
          viewHost: document.getElementById('view-host').hidden === false,
          evidenceText: (document.querySelector('#l1-receipt-rows') || {}).textContent || '',
        };
        return JSON.stringify(out);
      })()`,
    );
    const rc = JSON.parse(receipt);
    check('⑩ 证据来自真实重拉（refreshSeq 单调递增：1 → 2，不是缓存）', rc.seq1 === 1 && rc.seq2 === 2, receipt);
    check('⑩ 三件齐备（摘要 / 证据 / 审计出口）', rc.pieces.summary === true && rc.pieces.evidence === true && rc.pieces.audit === true, receipt);
    check('⑩ 摘要在默认态常驻可见（W3 起驻**卡固化区**，仍是常驻可读面）', rc.summaryHidden === false && /回执：/.test(rc.summaryText), receipt);
    check('⑩ 摘要的载体 = 卡固化区 `.card-fixed`（退役的 #l0-decision 壳不再持有它）', rc.summaryInFixed === true && rc.summaryInFrozenCard === true, receipt);
    // BLOCK-01 时点无关判据（有回执态）：迁移容器**恰 1** 个，且零宿主判据无假阳性。
    check(
      '⑩ BLOCK-01 有回执态：迁移容器 `#l0-receipt-summary` 恰 1 个 ∧ `hosts().problems === []`（时点无关判据之②）',
      rc.summaryCount === 1 && Array.isArray(rc.hostProblems) && rc.hostProblems.length === 0,
      receipt,
    );
    check('⑩ 完整证据 ≤1 次交互可达（8 行白名单字段）', rc.rows.length === 8, JSON.stringify(rc.rows));
    check('⑩ 审计出口指向 L2 审计视图（1 次交互可达；「查看审计」控件已消解 = 零悬空引用）', /审计/.test(rc.auditLabel) && rc.viewHost === true, receipt);
    check('⑩ 零明文：证据/回执不出现 URL 查询串 / apiKey', !/\?[A-Za-z0-9_]+=/.test(rc.evidenceText) && !/api[-_]?key/i.test(rc.evidenceText), rc.evidenceText);

    // ── ⑪ discoverability + evidence read-only + local tree + decided-steps ──
    console.log('\n▶ ⑪ 可发现性（非空文字 + 真值计数）+ 证据层只读 + 局部树 ≤3 + 已决步数唯一');
    const discover = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        // 卡内面（选项池 / 后果预演）只在**唯一活跃决策卡**上铸造 —— 先确保有一张 open 卡。
        if (!document.getElementById('l1-more-toggle')) window.__v3.testing.ask('这一步先做什么？', ['查看站点声明', '列出可用命令', '删除这条记录', '打开设置']);
        // 证据层只在 ref 卡内：铸造一张最新 ref 卡，才能判定「只读 + 四要素」。
        if (!document.getElementById('l1-ref-rows')) window.__v3.testing.refCard(7, 'stale', { why: '引用 7 的目标元素已不存在（选择器解析失败或元素被替换）' });
        const carriers = [['l1-more-toggle', 'l1-more'], ['l1-consequences-toggle', 'l1-consequences']];
        const out = {};
        for (const [triggerId, targetId] of carriers) {
          const trigger = document.getElementById(triggerId);
          out[targetId] = { text: (trigger.textContent || '').trim(), count: trigger.getAttribute('data-count'), label: trigger.getAttribute('aria-label') };
        }
        for (const id of ['l2-tree-attribution', 'l2-audit-evidence', 'settings-help']) {
          const el = document.getElementById(id);
          out[id] = { text: (el?.textContent ?? '').trim(), count: (el?.getAttribute('data-count') ?? ''), label: (el?.getAttribute('aria-label') ?? '') };
        }
        const retiredPresent = ${JSON.stringify(RETIRED_TRIGGERS)}.filter((id) => document.getElementById(id) !== null);
        const refRows = document.getElementById('l1-ref-rows');
        const writeControls = refRows ? [...refRows.querySelectorAll('button, input, select, textarea')].length : -1;
        const allWrite = document.querySelectorAll('[data-l1-panel] [data-write-op]').length;
        return JSON.stringify({
          entries: out, retiredPresent, writeControls, allWrite,
          evidenceRows: refRows ? [...refRows.querySelectorAll('.l1-row')].map((r) => r.textContent) : [],
          localTree: window.__v3.testing.l1('report').localTree,
          treeRows: [...document.querySelectorAll('#l1-local-tree-rows .l1-row')].map((r) => r.textContent),
          globalEntry: Boolean(document.getElementById('l1-local-tree-global')),
          historyToggle: Boolean(document.getElementById('l1-history-toggle')),
          historyCount: window.__v3.testing.l1('report').historyCount,
          auditCount: (document.getElementById('l2-audit-count')?.textContent ?? ''),
          gestureRows: document.querySelectorAll('#l1-gestures tbody tr').length,
          gestures: window.__v3.testing.l1('report').gestures,
        });
      })()`,
    );
    const d = JSON.parse(discover);
    for (const [cls, e] of Object.entries(d.entries)) {
      check(`⑪ ${cls} 的载体有非空文字标签（禁「只有图标」）`, e.text.length > 0 || e.label.length > 0, JSON.stringify(e));
    }
    check('⑪ 卡内选项池触发器的计数从真值派生（data-count 可解析）', /^\d+$/.test(String(d.entries['l1-more'].count)), JSON.stringify(d.entries));
    check('⑪ 后果预演的计数 = 真实选项数（4 个选项 → 触发器文案含「4 个选项」）', /4 个选项/.test(d.entries['l1-consequences'].text), discover);
    check('⑪ 退役触发器零 DOM 残留（6 项）', d.retiredPresent.length === 0, JSON.stringify(d.retiredPresent));
    check('⑪ 证据层只读（#l1-ref-rows 内零可写控件）', d.writeControls === 0, String(d.writeControls));
    check('⑪ 全层面零写操作标记（[data-write-op] = 0）', d.allWrite === 0, String(d.allWrite));
    check('⑪ 证据四要素齐备（选择器 / 语义路径 / 文本摘要 / 捕获时间）', ['选择器', '语义路径', '文本摘要', '捕获时间'].every((k) => d.evidenceRows.some((r) => r.includes(k))), JSON.stringify(d.evidenceRows));
    check('⑪ 局部树节点数 ≤3（硬上限，L2 归因块复用同一裁剪规则）', d.localTree <= 3, String(d.localTree));
    check('⑪ 「查看全局树」控件已消解（已在树视图内 ⇒ 零悬空引用）', d.globalEntry === false, String(d.globalEntry));
    check('⑪ 「已决策 N 步」只有审计视图标题一个声明点（原 #l1-history-toggle 已退役）', d.historyToggle === false && /已决策\s*\d+\s*步/.test(d.auditCount), JSON.stringify({ toggle: d.historyToggle, count: d.auditCount }));
    check('⑪ 手势表行数 ≡ 单源常量（6），行数随设置帮助分区挂载', d.gestureRows === d.gestures && d.gestures === 6, JSON.stringify({ rows: d.gestureRows, gestures: d.gestures }));

    // ── ⑫ density does not regress after an expand/collapse round trip ─────
    console.log('\n▶ ⑫ 密度不回归：展开/收起往返后默认档仍达标（三视口，复用 v3-1 口径）');
    await resetFixture(cdp);
    await evaluate(
      cdp,
      `(() => {
        // V4.5-1 W3：折叠面只剩两个**卡内**触发器（其余面在视图中常开）——
        // 按 aria-expanded 幂等切换，往返后状态必须复原。
        const triggers = ['l1-more-toggle', 'l1-consequences-toggle'];
        const openAll = () => { for (const id of triggers) { const el = document.getElementById(id); if (el && el.getAttribute('aria-expanded') === 'false') el.click(); } };
        const closeAll = () => { for (const id of triggers) { const el = document.getElementById(id); if (el && el.getAttribute('aria-expanded') === 'true') el.click(); } };
        openAll(); closeAll();
        window.__v3.testing.collapseAll();
        return true;
      })()`,
    );
    const before = await evaluate(cdp, `JSON.stringify(window.__v3.disclosure.snapshot())`);
    for (const vp of [320, 400, 520]) {
      await setViewport(cdp, vp, VIEWPORT_HEIGHT);
      await sleep(250);
      const measured = await evaluate(cdp, DENSITY_MEASURE_SOURCE);
      const verdict = evaluateDensity(measured, 'default');
      check(
        `⑫ ${vp}px 展开/收起往返后默认档仍达标（C1 ≤ ${DENSITY_LIMITS.default.clickables} · C2 ≤ ${DENSITY_LIMITS.default.lines}）`,
        verdict.ok === true,
        `C1=${measured.clickables} C2=${measured.lines} chars=${measured.chars} → ${verdict.message}`,
      );
    }
    const after = await evaluate(cdp, `JSON.stringify(window.__v3.disclosure.snapshot())`);
    check('⑫ 往返后折叠态复原（展开态记忆未被破坏）', before === after, `${before} vs ${after}`);

    check('无未捕获页面异常（L1 渲染全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();

    // ══ ⑬ 计数守恒（D-005 只增） ═════════════════════════════════════════════
    const runtime = counts().passes;
    const selfSource = readFileSync(new URL('./l1.mjs', import.meta.url), 'utf8');
    const staticCount = (selfSource.match(/\bcheck\(/g) ?? []).length;
    check(`⑬ 运行期断言计数 ≥ ${L1_RUNTIME_FLOOR}（D-005 l1 下界；countMethod = runtime-check-calls）`, runtime >= L1_RUNTIME_FLOOR, `runtime=${runtime}`);
    check(`⑬ 静态 check( 计数 ≥ ${L1_STATIC_FLOOR}（v3 口径：入口机制重写后只增不减）`, staticCount >= L1_STATIC_FLOOR, `static=${staticCount}`);
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('L1 运行时门禁');
}

main().catch((err) => {
  console.error(`✖ L1 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
