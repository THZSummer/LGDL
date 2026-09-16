/**
 * V3-1 TASK-110 / ADR-V3-006 / ADR-V3-007 / ADR-V3-008 — the L0 runtime gate.
 *
 * `npm run test:l0` — the runtime half of the L0 contract. It exercises the real
 * `dist/` product and asserts:
 *
 *   ① the three things (我在哪 / 谁在管我 / 下一步做什么) are visible together;
 *   ② the decision card is UNIQUE, has ≤2 recommended options and a recomputable
 *      「更多选项（还有 N 个）」 count (FR-V3-011/012/013);
 *   ③ no permanently resident text input in the default state (FR-V3-013);
 *   ④ AC-V3-008: 5 risk classes × 2 scenarios = **10 assertions** — each class must
 *      be visible in the default viewport, AND still visible after every L1/L2
 *      disclosure is collapsed;
 *   ⑤ AC-V3-009: no risk row has a foldable ancestor, and the destructive
 *      confirmation options never sit inside a foldable container (FR-V3-018);
 *   ⑥ AC-V3-010: **every** `[aria-controls]` element (not a hand-picked subset)
 *      has non-empty text + a paired `aria-expanded`/`aria-controls` whose target
 *      holds a non-empty summary or count; L1 is ≤1 interaction and L2 is ≤2
 *      interactions away;
 *   ⑦ AC-V3-021: the resident element set is identical at 320 and 400 (nothing is
 *      deleted on a narrow panel) and there is zero horizontal overflow;
 *   ⑧ the geometry contract inherited from the v2 insight gate: the four L0 zones
 *      are pairwise non-overlapping (6 pairs), `#log` is the ONLY panel-level
 *      scroller, `#log` keeps its first-round measured floor, and the composer sits
 *      flush at the bottom in the fallback state without being occluded;
 *   ⑨ both themes (`prefers-color-scheme`) keep every L0 state readable and never
 *      rely on colour alone (FR-V3-026 / AC-V3-020): the theme tokens must resolve
 *      to DIFFERENT values per theme, and the three channels must survive with the
 *      paint properties stripped;
 *
 * Serial discipline: one Chromium instance, one page target, everything in order.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CHROME,
  DIST,
  PACKAGE_ROOT,
  check,
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
import { LOG_CLIENT_HEIGHT_FLOOR, RISK_SUBSCENARIOS, riskVisibilityProbeSource } from './density-metrics.mjs';

const FIXTURE_ORIGIN = 'https://v3-l0.test';
const LLM_KEY = 'web-cli:web-cli:llm';
const BASELINE_JSON = resolve(PACKAGE_ROOT, 'docs/v3-density-baseline.json');

/** v1's own floor for the message zone (kept by the v2 insight gate).
 *  v3-1 migrates this anchor to `LOG_CLIENT_HEIGHT_FLOOR` (first-round measured
 *  value for the default tier WITH a pending decision card) — see the caliber
 *  module's comment for the measurement and the registered 10px allowance. */
const LOG_MIN_HEIGHT_V1 = LOG_CLIENT_HEIGHT_FLOOR;

/** Default-state fixture (same state definition as the density gate's default tier). */
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

/** In-page: the resident element id set + overflow probe at the current viewport. */
const residentProbe = `(() => {
  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id).sort();
  const visibleIds = [...document.querySelectorAll('[id]')]
    .filter((el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; })
    .map((el) => el.id)
    .sort();
  const de = document.documentElement;
  return { all: ids, visible: visibleIds, overflowX: de.scrollWidth - de.clientWidth };
})()`;

/** In-page: pairwise intersection area of the four L0 zones + scroller census. */
const geometryProbe = `(() => {
  const zones = ['risk-rail', 'panel-top', 'l0-decision', 'l0-statusbar'].map((id) => document.getElementById(id));
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
  const scrollers = [...document.querySelectorAll('#panel-main *, #panel-main')]
    .filter((el) => {
      const style = getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    })
    .map((el) => el.id || el.className);
  const log = document.getElementById('log');
  const composer = document.getElementById('composer');
  const cr = composer.getBoundingClientRect();
  const lr = log.getBoundingClientRect();
  const zonesBottom = Math.max(...zones.map((el) => el.getBoundingClientRect().bottom));
  const zoneHeights = ['risk-rail', 'panel-top', 'l0-decision', 'log', 'view-host', 'l0-statusbar', 'l2-entries', 'panel-bottom', 'settings-view']
    .map((id) => ({ id, h: Math.round((document.getElementById(id) || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height), hidden: document.getElementById(id)?.hidden ?? null }));
  return {
    pairs,
    zoneHeights,
    expanded: {
      more: document.getElementById('l1-more').hidden,
      ref: document.getElementById('l1-ref').hidden,
      topbar: document.getElementById('topbar').hidden,
      viewHost: document.getElementById('view-host').hidden,
      entries: document.getElementById('l2-entries').hidden,
      fallback: document.getElementById('ask-fallback').hidden,
      composer: document.getElementById('composer').hidden,
    },
    panelScrollers: scrollers,
    logClientHeight: log.clientHeight,
    logFlexGrow: getComputedStyle(log).flexGrow,
    composerGapToBottom: Math.round(window.innerHeight - cr.bottom),
    composerOverlapsLog: Math.max(0, Math.min(cr.bottom, lr.bottom) - Math.max(cr.top, lr.top)) > 0 && cr.top < lr.bottom,
    zonesBottom,
    composerTop: Math.round(cr.top),
  };
})()`;

/**
 * In-page: the risk row probe (visibility + foldable ancestors + 3 channels).
 *
 * Closeout round (F7): the implementation is the single-source
 * `riskVisibilityProbeSource()` from `test/ui/density-metrics.mjs`. It used to be a
 * local copy, and it accepted a `visibility:hidden` / `opacity:0` ancestor as
 * "visible" (neither changes `getBoundingClientRect()`), while the density caliber
 * C1 explicitly refuses to exempt those properties. One probe, one meaning of
 * "visible".
 */
const riskProbe = (cls) => riskVisibilityProbeSource(cls);

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

    // ── ① three things visible + ② unique decision card + ③ no resident input ──
    console.log('\n▶ ① 三件事 + ② 唯一决策卡 + ③ 无常驻输入框');
    const skeleton = await evaluate(
      cdp,
      `(() => {
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };
        const band = document.getElementById('l0-status-band');
        const decision = document.getElementById('l0-decision');
        const statusbar = document.getElementById('l0-statusbar');
        const asks = [...document.querySelectorAll('#l0-decision #ask, #panel-bottom #ask')].filter(visible);
        const options = [...document.querySelectorAll('#ask-options button, #ask-options [role="radio"]')];
        const residentInputs = [...document.querySelectorAll('input[type="text"], input:not([type]), textarea')].filter(visible);
        return {
          bandVisible: visible(band),
          decisionVisible: visible(decision),
          statusbarVisible: visible(statusbar),
          bandText: band ? band.textContent : '',
          decisionCards: asks.length,
          visibleOptions: options.length,
          moreText: document.getElementById('l0-more').textContent,
          moreCount: Number(document.getElementById('l0-more').getAttribute('data-count')),
          moreHidden: document.getElementById('l0-more').hidden,
          residentInputs: residentInputs.map((el) => el.id || el.tagName),
          fallbackHidden: document.getElementById('ask-fallback').hidden,
          composerHidden: document.getElementById('composer').hidden,
          pickText: document.getElementById('l0-pick').textContent,
          refText: document.getElementById('l0-ref-toggle').textContent,
        };
      })()`,
    );
    check('① 我在哪 / 谁在管我（#l0-status-band）默认态可见', skeleton.bandVisible === true);
    check('① ③ 下一步做什么（#l0-decision）默认态可见', skeleton.decisionVisible === true);
    check('① 一行状态栏（#l0-statusbar）默认态可见', skeleton.statusbarVisible === true);
    check('① 状态带文字含 origin 站点名（可读，非纯图标）', skeleton.bandText.includes('v3-l0.test'), skeleton.bandText.slice(0, 80));
    check('② 默认态决策卡数 = 1', skeleton.decisionCards === 1, String(skeleton.decisionCards));
    check('② 可见推荐选项 ≤ 2', skeleton.visibleOptions <= 2 && skeleton.visibleOptions >= 1, String(skeleton.visibleOptions));
    check(
      '② 「更多选项（还有 N 个）」的 N 从真值派生（4 个选项 → 2 可见 + 2 收起，N = 2 + 1 末项）',
      skeleton.moreCount === 3 && skeleton.moreText === '更多选项（还有 3 个）',
      `${skeleton.moreText} / data-count=${skeleton.moreCount}`,
    );
    check('③ 默认态可见文本输入框计数 = 0（含 input:not([type]) / textarea）', skeleton.residentInputs.length === 0, skeleton.residentInputs.join(','));
    check('③ 末项兜底输入框默认 hidden', skeleton.fallbackHidden === true);
    check('③ 完整输入框（#composer）默认 hidden（ADR-V3-014 §5）', skeleton.composerHidden === true);
    check('① 「从页面拾取」入口存在（替代输入框）', /从页面拾取/.test(skeleton.pickText));
    check('① 引用条入口存在（含计数）', /引用\s*\d+\s*条/.test(skeleton.refText), skeleton.refText);

    // N must follow the real option list (change truth → change N)
    await evaluate(cdp, `window.__v3.testing.ask('换一轮', ['甲', '乙', '丙', '丁', '戊']); true`);
    await sleep(250);
    const moreAgain = await evaluate(cdp, `document.getElementById('l0-more').getAttribute('data-count') + '|' + document.getElementById('l0-more').textContent`);
    check('② 真实选项数变化 → N 随之变化（硬编码即 FAIL）', moreAgain === '4|更多选项（还有 4 个）', moreAgain);
    // I2: the mandated terminal copy must be asserted on the RENDERED text, not only
    // on a module constant (the two `OTHER_OPTION_LABEL` copies could drift apart
    // without any gate noticing — the unit test only pinned the non-product one).
    const terminalText = await evaluate(
      cdp,
      `(() => { const pool = document.getElementById('l1-more-options'); const btns = [...pool.querySelectorAll('button')]; return btns.length ? btns[btns.length - 1].textContent : ''; })()`,
    );
    check(
      '② FR-V3-012 末项文案逐字（渲染态 DOM 文本 = 「其他…（我来描述）」）',
      terminalText === '其他…（我来描述）',
      JSON.stringify(terminalText),
    );
    await evaluate(cdp, `window.__v3.testing.clearAsk(); true`);
    await sleep(200);
    const noAsk = await evaluate(cdp, `JSON.stringify({ askHidden: document.getElementById('ask').hidden, moreHidden: document.getElementById('l0-more').hidden })`);
    check('② 无待答回合时决策卡整体 hidden（不留空卡）', noAsk === '{"askHidden":true,"moreHidden":true}', noAsk);
    // ── I1 FAIL-able assertion ────────────────────────────────────────────────
    // 无卡态的**第二次** render 必须保持 `#l0-more` hidden。修复前的 early-return
    // 分支写的是 `foldedCount <= 0`，而 `foldedCount = foldedOptions.length + 1 ≥ 1`
    // 恒真 → 同一个无卡状态再渲染一次就把「更多选项（还有 1 个）」点亮成悬空入口。
    await evaluate(cdp, `window.__v3.testing.refresh(); true`);
    await sleep(250);
    const noAskAgain = await evaluate(
      cdp,
      `JSON.stringify({
        moreHidden: document.getElementById('l0-more').hidden,
        moreText: document.getElementById('l0-more').textContent,
        moreCount: document.getElementById('l0-more').getAttribute('data-count'),
        askHidden: document.getElementById('ask').hidden,
      })`,
    );
    const noAskAgainParsed = JSON.parse(noAskAgain);
    check(
      '② I1：无卡态第二次 render 后 #l0-more 仍 hidden（不得复活悬空入口）',
      noAskAgainParsed.moreHidden === true && noAskAgainParsed.askHidden === true,
      noAskAgain,
    );
    check(
      '② I1：无卡态 #l0-more 文案 / data-count 如实归零（不得写「还有 1 个」）',
      noAskAgainParsed.moreText === '更多选项（还有 0 个）' && noAskAgainParsed.moreCount === '0',
      noAskAgain,
    );
    await resetFixture(cdp);

    // ── ④ AC-V3-008: 5 classes × 2 scenarios ────────────────────────────────
    console.log('\n▶ ④ AC-V3-008：5 类风险 × 2 场景（默认视口可见 + 全折叠后仍可见）');
    // Make the fixture coherent for the「未授权」class: revoke through the real message
    // (the origin store is authoritative), then re-authorize after the loop.
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
      const visibleProbe = await evaluate(cdp, riskProbe(sub.key));
      check(`④ ${sub.label}：默认视口内可见且三通道齐备`, visibleProbe.ok === true, JSON.stringify(visibleProbe));
      await evaluate(cdp, `window.__v3.testing.collapseAll(); true`);
      await sleep(200);
      const collapsedProbe = await evaluate(cdp, riskProbe(sub.key));
      check(`④ ${sub.label}：全部 L1/L2 收起后仍可见（永不折叠）`, collapsedProbe.ok === true, JSON.stringify(collapsedProbe));
      await evaluate(cdp, `window.__v3.testing.setRisk(${JSON.stringify(sub.key)}, 'off'); true`);
      await sleep(150);
    }
    await evaluate(cdp, `window.__v3.testing.setRisk('unauthorized', 'natural'); window.__v3.testing.setRisk('hardline', 'force'); true`);
    await sleep(250);

    // ── ⑤ AC-V3-009: ancestor chain + destructive options never folded ─────
    console.log('\n▶ ⑤ AC-V3-009：祖先链 + 破坏性确认不参与折叠');
    const ancestor = await evaluate(
      cdp,
      `(() => {
        const rail = document.getElementById('risk-rail');
        const chain = [];
        let n = rail;
        while (n) { chain.push({ tag: n.tagName, id: n.id, hidden: n.hidden, l1: n.hasAttribute('data-l1-panel'), l2: n.hasAttribute('data-l2-view'), disclose: n.hasAttribute('data-disclose-panel') }); n = n.parentElement; }
        return JSON.stringify({
          chain,
          railDirectChildOfBody: rail.parentElement === document.body,
          foldTriggerInRail: rail.querySelectorAll('[aria-expanded]').length,
          riskRowsInFoldable: [...rail.querySelectorAll('.risk-row')].filter((r) => r.closest('[data-l1-panel],[data-l2-view],[data-disclose-panel]')).length,
        });
      })()`,
    );
    const chain = JSON.parse(ancestor);
    check('⑤ 风险位祖先链无 hidden 元素', chain.chain.every((n) => n.hidden !== true), ancestor);
    check('⑤ 风险位祖先链无 L1/L2/披露容器', chain.chain.every((n) => !n.l1 && !n.l2 && !n.disclose), ancestor);
    check('⑤ 风险位是 body 直接子元素（独立分区）', chain.railDirectChildOfBody === true);
    check('⑤ 风险位内不存在折叠触发器', chain.foldTriggerInRail === 0, String(chain.foldTriggerInRail));
    check('⑤ 风险行不位于任何折叠容器内', chain.riskRowsInFoldable === 0, String(chain.riskRowsInFoldable));

    // I14: the duplicate `setRisk('confirm','force')` + `void confirm` block is gone
    // (the probe below re-applies it through the same hook, once).
    await evaluate(cdp, `window.__v3.testing.setRisk('confirm', 'force'); true`);
    await sleep(250);
    const confirmProbe = await evaluate(
      cdp,
      `(() => {
        const card = document.getElementById('confirm');
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        const buttons = [...card.querySelectorAll('button')];
        const chain = [];
        let n = card;
        while (n) { chain.push({ id: n.id, hidden: n.hidden, l1: n.hasAttribute('data-l1-panel'), l2: n.hasAttribute('data-l2-view') }); n = n.parentElement; }
        const moreOptions = document.getElementById('l1-more-options');
        return JSON.stringify({
          cardVisible: visible(card),
          inDecisionDirect: card.parentElement?.id === 'l0-decision',
          buttons: buttons.map((b) => b.textContent),
          chainClean: chain.every((x) => x.hidden !== true && !x.l1 && !x.l2),
          destructiveMarked: card.hasAttribute('data-destructive-option') && buttons.every((b) => b.hasAttribute('data-destructive-option')),
          noneInMorePool: moreOptions ? [...moreOptions.querySelectorAll('button')].filter((b) => b.hasAttribute('data-destructive-option')).length : 0,
        });
      })()`,
    );
    const cp = JSON.parse(confirmProbe);
    check('⑤ 破坏性确认卡在 #l0-decision 直系且可见', cp.cardVisible === true && cp.inDecisionDirect === true, confirmProbe);
    check('⑤ 破坏性确认选项的祖先链无折叠容器（不参与折叠）', cp.chainClean === true, confirmProbe);
    check('⑤ 破坏性确认选项带 data-destructive-option（结构可判定）', cp.destructiveMarked === true, confirmProbe);
    check('⑤ 破坏性确认选项不进入「更多选项」池', cp.noneInMorePool === 0, confirmProbe);
    await evaluate(cdp, `window.__v3.testing.setRisk('confirm', 'off'); true`);

    // ── FR-V3-019: hardline → zero allow controls ──────────────────────────
    await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'force'); true`);
    await sleep(250);
    const hardline = await evaluate(
      cdp,
      `(() => {
        const visible = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return true; };
        const scope = [document.getElementById('risk-rail'), document.getElementById('l0-decision')];
        const labels = scope
          .flatMap((root) => [...root.querySelectorAll('button, [role="button"]')])
          .filter(visible)
          .map((b) => (b.textContent || '').trim());
        const railText = document.getElementById('risk-rail').textContent;
        return JSON.stringify({ labels, hasAllow: labels.some((l) => /^(允许|放行|允许执行|忽略硬底线|覆盖)$/.test(l)), railText: railText.slice(0, 120) });
      })()`,
    );
    const hl = JSON.parse(hardline);
    check('FR-V3-019 硬底线被拦时「允许 / 放行」控件计数 = 0', hl.hasAllow === false, hl.labels.join(' / '));
    check('FR-V3-019 风险位写明 evaluate 永不自动放行', /evaluate/.test(hl.railText) && /不提供「允许」选项/.test(hl.railText), hl.railText);
    await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'off'); true`);
    await sleep(200);

    // ── ⑥ AC-V3-010: discoverability + reachability ────────────────────────
    console.log('\n▶ ⑥ AC-V3-010：可发现性（入口文字 + ARIA 成对 + 目标含摘要/计数）+ L1 ≤1 / L2 ≤2');
    // I5 fix round: re-establish the default fixture so the probe sees the same
    // state the contract describes (a pending card + all disclosures folded).
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
    // The check may not be narrowed to a hand-picked subset (the old version
    // filtered to 4 L0 triggers, which hid the four `#l2-entry-*` buttons that had
    // `aria-controls` but no `aria-expanded`). Every `[aria-controls]` element in
    // the real product must pass; the list below is a *completeness* assertion
    // (a superset check), never a filter.
    const EXPECTED_TRIGGERS = [
      'l0-status-band',
      'l0-more',
      'l0-ref-toggle',
      'l0-statusbar',
      'l2-entry-tree',
      'l2-entry-commands',
      'l2-entry-audit',
      'l2-entry-settings',
      'tree-fab',
      'ask-other',
    ];
    check('⑥ 遍历范围 = 全部 [aria-controls] 元素（未被白名单缩窄）', entries.length >= EXPECTED_TRIGGERS.length, `实测 ${entries.length} 个：${entries.map((e) => e.trigger).join(', ')}`);
    for (const trigger of EXPECTED_TRIGGERS) {
      check(`⑥ ${trigger} 在遍历范围内（可见性契约不得被漏检）`, entries.some((e) => e.trigger === trigger), entries.map((e) => e.trigger).join(', '));
    }
    // V3-3: the v3-1 skeleton-phase exemption is **REMOVED**, exactly as its
    // registered `removalCondition` required (ledger `v3SkeletonExemptions`):
    // `#view-host` now carries the four real views, so it has a readable summary
    // like every other target and no target is exempt any more. The set is kept as
    // an explicitly-empty constant (and asserted empty) so a future "temporary"
    // exemption cannot be reintroduced silently.
    const SKELETON_EXEMPT_TARGETS = [];
    check(
      '⑥ 骨架期豁免集合已按登记条件清空（v3-3 用真实视图填充 #view-host 后不得再豁免）',
      JSON.stringify(SKELETON_EXEMPT_TARGETS) === JSON.stringify([]),
      JSON.stringify(SKELETON_EXEMPT_TARGETS),
    );
    for (const entry of entries) {
      check(`⑥ ${entry.trigger}：有非空文字标签（禁「只有图标」）`, entry.text.length > 0 || entry.label.length > 0, JSON.stringify(entry));
      check(`⑥ ${entry.trigger}：aria-expanded + aria-controls 成对`, entry.hasExpanded === true && Boolean(entry.targetId), JSON.stringify(entry));
      check(`⑥ ${entry.trigger}：aria-controls 指向存在的元素`, entry.targetExists === true, JSON.stringify(entry));
      if (SKELETON_EXEMPT_TARGETS.includes(entry.targetId)) {
        // Exempt from "target holds a readable summary", NOT from discoverability:
        check(`⑥ ${entry.trigger}：骨架期宿主必须默认 hidden`, entry.targetHidden === true, JSON.stringify(entry));
        check(`⑥ ${entry.trigger}：骨架期豁免下入口必须自带计数/标签（可发现性不豁免）`, entry.countInTarget !== '' || entry.text.length > 0, JSON.stringify(entry));
        continue;
      }
      check(`⑥ ${entry.trigger}：目标含非空摘要或计数`, entry.summaryInTarget === true || entry.countInTarget !== '', JSON.stringify(entry));
      // V3-3: the v3-1 exempt branch additionally required the skeleton host to be
      // `hidden` by default. That requirement is NOT dropped — it is now asserted
      // for BOTH L2 view targets (FR-V3-045 默认零占用: a view that is resident in
      // the default state would be a regression no matter how good its summary is).
      if (entry.targetId === 'view-host' || entry.targetId === 'settings-view') {
        check(
          `⑥ ${entry.trigger}：L2 视图目标默认 hidden（FR-V3-045 默认零占用）`,
          entry.targetHidden === true,
          JSON.stringify(entry),
        );
      }
    }
    const emptyTargets = [...new Set(entries.filter((e) => !e.summaryInTarget && e.countInTarget === '').map((e) => e.targetId))];
    check(
      '⑥ 空摘要目标集合必须被骨架期豁免集合完全覆盖，且不得超出登记数量（豁免不得扩大）',
      emptyTargets.every((id) => SKELETON_EXEMPT_TARGETS.includes(id)) && emptyTargets.length <= SKELETON_EXEMPT_TARGETS.length,
      JSON.stringify(emptyTargets),
    );

    // ── ⑥b FR-V3-015: each of the ≤4 L2 entries must carry a REAL count ──────
    // Closeout round (validate R1 F6): the old assertion for an exempt *target*
    // was `countInTarget !== '' || text.length > 0` — a one-of-two disjunction that
    // is trivially satisfied by any non-empty label, so「≤4 入口**各带计数**」had no
    // failing assertion at all (`#l2-entry-settings` shipped `data-count="n/a"` and
    // no digit, and the gate still passed). The count now has to be *derived*: the
    // digit in the entry's own label, its `data-count` attribute and the L1
    // one-line status-bar summary all come from the same `l0ViewModel()` values, so
    // the three must agree — and a missing count must be an explicitly REGISTERED
    // exemption — V3-3 removed it: `#l2-entry-settings` now derives its count from
    // the rendered-section registry (`src/ui/settings/sections.ts`), so all four
    // entries participate in the three-way same-source judgement.
    const L2_KEYS = ['tree', 'commands', 'audit', 'settings'];
    /**
     * V3-3: no L2 entry is exempt any more (the settings count is derived from
     * `settings/sections.ts#SETTINGS_SECTION_IDS`, cross-checked against the
     * rendered `.wc-section` set by `test/ui/l2.mjs`). Empty set, asserted empty.
     */
    const L2_COUNT_EXEMPT = [];
    const l2ProbeExpr = `(() => {
      const entries = ${JSON.stringify(L2_KEYS)}.map((key) => {
        const btn = document.getElementById('l2-entry-' + key);
        if (!btn) return { key, missing: true };
        const m = /(\\d+)/.exec(btn.textContent || '');
        return {
          key,
          text: (btn.textContent || '').trim(),
          dataCount: btn.getAttribute('data-count'),
          labelCount: m ? Number(m[1]) : null,
          ariaControls: btn.getAttribute('aria-controls'),
        };
      });
      // V3-3: the COUNTS live in the entry panel's own summary line
      // (#l2-entry-summary); the one-line bar above is deliberately count-free
      // (its text is part of the measured default tier, and the audit count is a
      // live number — see view-model.ts#L2_BAR_TEXT). The three-way judgement is
      // unchanged: entry label ≡ data-count ≡ the summary the panel shows.
      const summaryEl = document.getElementById('l2-entry-summary');
      const bar = document.getElementById('l0-statusbar-text');
      return JSON.stringify({
        entries,
        summary: summaryEl ? (summaryEl.textContent || '').trim() : '',
        barText: bar ? (bar.textContent || '').trim() : '',
      });
    })()`;
    /**
     * The FR-V3-015 judge, as a pure function so the counter-proof below can drive
     * it with a perturbed snapshot instead of a perturbed product.
     */
    const l2CountJudge = (l2) => {
      const failures = [];
      const summaryCount = (label) => {
        const m = new RegExp(`${label}\\s*(\\d+)`).exec(l2.summary ?? '');
        return m ? Number(m[1]) : null;
      };
      if (l2.entries.length !== 4 || l2.entries.some((e) => e.missing === true)) failures.push('L2 入口数 ≠ 4');
      for (const [label, key] of [['树', 'tree'], ['命令', 'commands'], ['审计', 'audit'], ['设置', 'settings']]) {
        const entry = l2.entries.find((e) => e.key === key);
        if (!/^\d+$/.test(String(entry?.dataCount))) failures.push(`${key}: data-count 不是数字（${entry?.dataCount}）`);
        else if (entry.labelCount !== Number(entry.dataCount) || Number(entry.dataCount) !== summaryCount(label)) {
          failures.push(`${key}: 三处不同源（label=${entry?.labelCount} data-count=${entry?.dataCount} summary=${summaryCount(label)}）`);
        }
      }
      const unCounted = l2.entries.filter((e) => !/^\d+$/.test(String(e.dataCount))).map((e) => e.key);
      if (!unCounted.every((k) => L2_COUNT_EXEMPT.includes(k)) || unCounted.length > L2_COUNT_EXEMPT.length) {
        failures.push(`无计数入口超出登记豁免集合：${JSON.stringify(unCounted)}`);
      }
      // V3-3 (was the registered `settings-count` exemption): the settings entry
      // must carry a REAL, numeric count that equals the rendered-section registry
      // length — the exemption's removal condition, now enforced.
      const settingsCount = Number(l2.entries.find((e) => e.key === 'settings')?.dataCount);
      if (!Number.isInteger(settingsCount) || settingsCount <= 0) {
        failures.push(`settings: data-count 必须是可派生的正整数（实测 ${l2.entries.find((e) => e.key === 'settings')?.dataCount}）`);
      }
      return failures;
    };
    const l2Raw = await evaluate(cdp, l2ProbeExpr);
    const l2Parsed = JSON.parse(l2Raw);
    // V3-3 (F2/K-1 determinism): the resident one-line bar must carry NO digits —
    // the audit ring grows while the panel is used, so a count-bearing resident line
    // would make the density caliber's "one steady state ⇒ identical cells" rule
    // unprovable. The counts are one interaction away, in the panel summary.
    check(
      '⑥ 常驻一行状态栏文本不含数字（计数在入口面板摘要内，默认档足迹稳定）',
      !/\d/.test(l2Parsed.barText ?? ''),
      JSON.stringify(l2Parsed.barText),
    );
    check(
      '⑥ 入口面板摘要（#l2-entry-summary）确实带着四类计数（不是空的摘要）',
      /树\s*\d/.test(l2Parsed.summary ?? '') &&
        /命令\s*\d/.test(l2Parsed.summary ?? '') &&
        /审计\s*\d/.test(l2Parsed.summary ?? '') &&
        /设置\s*\d/.test(l2Parsed.summary ?? ''),
      JSON.stringify(l2Parsed.summary),
    );
    const l2Failures = l2CountJudge(l2Parsed);
    check(
      '⑥ FR-V3-015 ≤4 个 L2 入口**各带真值计数**（入口标签 ≡ data-count ≡ 状态栏摘要，三处同源）',
      l2Failures.length === 0,
      `${JSON.stringify(l2Failures)} | ${l2Raw}`,
    );
    // 反证（内联，实跑 FAIL → 还原 → PASS）：篡改真 DOM 的 `data-count` → 同一条判据
    // 必须给出失败；还原后必须再次为空。这证明该判据**不是恒真**（旧判据在同样
    // 篡改下仍然 PASS —— 因为「计数或标签」二选一被标签满足）。
    //
    // ── V3-2 fix round (2026-09-16, ledger V32-S11) — **纯插入，不改判据** ──────
    // 下面的反证会篡改真实 DOM 并**立刻**复读。在 CPU 争用下它曾与一次**尚未完成
    // 的重渲染**赛跑（侧栏把常驻计数重新写回，篡改属性在复读前被还原）→ 产生
    // **负载相关的假红**（`[]`，在 v3-2 修复轮的串行链中实测出现 1 次，单跑 3/3 绿）。
    // 这里只先等 DOM 静默（有硬上限，绝不挂死），判据本体与断言均未改动/未削弱。
    await evaluate(
      cdp,
      `new Promise((res) => {
        const root = document.getElementById('l0-statusbar') ?? document.body;
        let t = null;
        const done = () => { clearTimeout(t); clearTimeout(cap); mo.disconnect(); res(true); };
        const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(done, 200); });
        const cap = setTimeout(done, 1500);
        t = setTimeout(done, 200);
        mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
      })`,
    );
    // V3-3: the restore value is the entry's OWN pre-tamper value, not a literal
    // `0` — the v3-1 skeleton shipped zeros, so "restore to 0" used to be the same
    // thing as "restore to truth". With real derived counts that would silently
    // turn the restore segment into a second tamper (and it must stay a genuine
    // restore: read → perturb → restore the captured value → judge empty again).
    const l2Before = JSON.parse(await evaluate(cdp, l2ProbeExpr));
    const l2TrueTreeCount = l2Before.entries.find((e) => e.key === 'tree')?.dataCount ?? '';
    await evaluate(cdp, `document.getElementById('l2-entry-tree').setAttribute('data-count', '99'); true`);
    const l2Tampered = l2CountJudge(JSON.parse(await evaluate(cdp, l2ProbeExpr)));
    check(
      '⑥ FR-V3-015 反证（FAIL 段）：篡改 data-count → 「三处同源」判据必须检出',
      l2Tampered.some((f) => f.includes('tree')),
      JSON.stringify(l2Tampered),
    );
    check(
      '⑥ FR-V3-015 反证用的真值确实来自运行期派生（不是 0 / 不是空值）',
      /^\d+$/.test(String(l2TrueTreeCount)) && Number(l2TrueTreeCount) > 0,
      `tree data-count=${l2TrueTreeCount} | ${JSON.stringify(l2Before.entries)}`,
    );
    await evaluate(
      cdp,
      `document.getElementById('l2-entry-tree').setAttribute('data-count', ${JSON.stringify(String(l2TrueTreeCount))}); true`,
    );
    const l2Restored = l2CountJudge(JSON.parse(await evaluate(cdp, l2ProbeExpr)));
    check(
      '⑥ FR-V3-015 反证（还原段）：还原真值后判据必须再次为空',
      l2Restored.length === 0,
      JSON.stringify(l2Restored),
    );

    const reach = await evaluate(
      cdp,
      `(() => {
        // L1 ≤1：默认态点击一次 #l0-status-band 即展开 #topbar
        const band = document.getElementById('l0-status-band');
        band.click();
        const l1Open = document.getElementById('topbar').hidden === false && band.getAttribute('aria-expanded') === 'true';
        band.click();
        const l1Closed = document.getElementById('topbar').hidden === true;
        // L2 ≤2：状态栏（1）+ 入口（2）→ 视图宿主可见
        const bar = document.getElementById('l0-statusbar');
        bar.click();
        const panelOpen = document.getElementById('l2-entries').hidden === false;
        document.getElementById('l2-entry-tree').click();
        const viewOpen = document.getElementById('view-host').hidden === false && document.getElementById('tree-fab').hidden === false;
        bar.click();
        return JSON.stringify({ l1Open, l1Closed, panelOpen, viewOpen });
      })()`,
    );
    const rl = JSON.parse(reach);
    check('⑥ L1 ≤1 次交互可达（一次点击展开，再点收起）', rl.l1Open === true && rl.l1Closed === true, reach);
    check('⑥ L2 ≤2 次交互可达（状态栏 → 入口 → 视图宿主可见）', rl.panelOpen === true && rl.viewOpen === true, reach);
    await evaluate(cdp, `window.__v3.testing.collapseAll(); true`);

    // ── ⑦ AC-V3-021: 320 / 400 resident sets identical + zero overflow ─────
    console.log('\n▶ ⑦ AC-V3-021：320/400 常驻元素集合相等 + 零水平溢出');
    // ⑦/⑧ measure the DEFAULT tier: re-establish the default fixture (the risk
    // section above deliberately revoked the origin to make「未授权」coherent).
    await resetFixture(cdp);
    const sets = {};
    for (const vp of [400, 320]) {
      await setViewport(cdp, vp, VIEWPORT_HEIGHT);
      await sleep(300);
      sets[vp] = await evaluate(cdp, residentProbe);
      check(`⑦ ${vp}px 文档级零水平溢出`, sets[vp].overflowX === 0, `overflowX=${sets[vp].overflowX}`);
    }
    check(
      '⑦ 320px 常驻可见元素 id 集合 == 400px（320 下不删任何常驻元素）',
      JSON.stringify(sets[320].visible) === JSON.stringify(sets[400].visible),
      `only400=${sets[400].visible.filter((i) => !sets[320].visible.includes(i)).join(',')} only320=${sets[320].visible.filter((i) => !sets[400].visible.includes(i)).join(',')}`,
    );
    check(
      '⑦ 320px 下五个常驻分区元素仍全部存在（含风险位与状态栏）',
      ['risk-rail', 'panel-top', 'l0-decision', 'l0-statusbar', 'panel-bottom'].every((id) => sets[320].all.includes(id)),
      JSON.stringify(sets[320].all.filter((i) => ['risk-rail', 'panel-top', 'l0-decision', 'l0-statusbar', 'panel-bottom'].includes(i))),
    );

    // ── ⑧ geometry contract (enhanced replacement for the v2 insight metrics) ──
    console.log('\n▶ ⑧ 几何契约：四区两两不重叠 + #log 唯一滚动 + composer 贴底不遮挡');
    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await sleep(300);
    const geoHidden = await evaluate(cdp, geometryProbe);
    check('⑧ L0 四常驻区两两交面积 = 0（6 组）', geoHidden.pairs.every((a) => a === 0), JSON.stringify(geoHidden.pairs));
    // I13: `length <= 1 && (arr[0] ?? 'log') === 'log'` also passed on an EMPTY
    // array (the only scroller having vanished counted as success — a vacuum PASS).
    // The non-vacuous form: (a) the *idle* census must contain no foreign scroller,
    // (b) with real overflow inside `#log`, the census must be exactly `['log']`.
    check(
      '⑧ 静止态面板内不得存在非 #log 的滚动容器',
      geoHidden.panelScrollers.every((id) => id === 'log'),
      JSON.stringify(geoHidden.panelScrollers),
    );
    const scrollerProof = await evaluate(
      cdp,
      `(() => {
        const log = document.getElementById('log');
        const filler = document.createElement('div');
        filler.id = 'l0-scroller-probe';
        filler.textContent = 'overflow-probe';
        // #log is a column flex container: a default flex item would be SHRUNK back
        // to the free space (no overflow -> no scroller), so the probe item must be
        // non-shrinkable to actually overflow the box.
        filler.style.flex = '0 0 3000px';
        filler.style.height = '3000px';
        log.appendChild(filler);
        const census = [...document.querySelectorAll('#panel-main *, #panel-main')]
          .filter((el) => {
            const style = getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
          })
          .map((el) => el.id || el.className);
        const logScrolls = log.scrollHeight > log.clientHeight;
        filler.remove();
        return JSON.stringify({ census, logScrolls });
      })()`,
    );
    const sp = JSON.parse(scrollerProof);
    check('⑧ 注入溢出后 #log 确实可滚（唯一的面板级滚动容器不是空集）', sp.logScrolls === true, scrollerProof);
    check(
      '⑧ 注入溢出后面板级滚动容器恰为 1 个且是 #log',
      sp.census.length === 1 && sp.census[0] === 'log',
      scrollerProof,
    );
    check('⑧ #log flex-grow = 1（flex 填充，非硬编码高度）', geoHidden.logFlexGrow === '1', geoHidden.logFlexGrow);
    const baselineFloor = existsSync(BASELINE_JSON)
      ? JSON.parse(readFileSync(BASELINE_JSON, 'utf8')).logClientHeightFloor ?? 0
      : 0;
    const floor = Math.max(LOG_MIN_HEIGHT_V1, baselineFloor);
    console.log(`    L0 几何：${JSON.stringify(geoHidden.zoneHeights)} | 展开态 ${JSON.stringify(geoHidden.expanded)}`);
    check(
      `⑧ #log clientHeight ≥ ${floor}px（v1 下界与首轮实测下界取严者）`,
      geoHidden.logClientHeight >= floor,
      `${geoHidden.logClientHeight}px（基线 ${baselineFloor}）| zones=${JSON.stringify(geoHidden.zoneHeights)} | expanded=${JSON.stringify(geoHidden.expanded)}`,
    );
    await evaluate(cdp, `window.__v3.testing.revealFallback(); true`);
    await sleep(350);
    const geoRevealed = await evaluate(cdp, geometryProbe);
    check('⑧ 兜底展开态 #composer 贴底（gap ∈ [0, +12]）', geoRevealed.composerGapToBottom >= 0 && geoRevealed.composerGapToBottom <= 12, `${geoRevealed.composerGapToBottom}px`);
    check('⑧ 兜底展开态 #composer 不被常驻区遮挡', geoRevealed.composerTop >= geoRevealed.zonesBottom - 1, `composerTop=${geoRevealed.composerTop} zonesBottom=${geoRevealed.zonesBottom}`);
    check('⑧ 兜底展开态 #composer 与 #log 不重叠', geoRevealed.composerOverlapsLog === false, JSON.stringify(geoRevealed));
    const fallbackState = await evaluate(
      cdp,
      `JSON.stringify({ fallback: document.getElementById('ask-fallback').hidden, composer: document.getElementById('composer').hidden, input: !document.getElementById('input').disabled })`,
    );
    check('⑧ 兜底展开后 #ask-fallback 与 #composer 均可见且输入可用', fallbackState === '{"fallback":false,"composer":false,"input":true}', fallbackState);
    await evaluate(cdp, `window.__v3.testing.hideFallback(); true`);
    await sleep(250);
    const collapsedAgain = await evaluate(
      cdp,
      `JSON.stringify({ fallback: document.getElementById('ask-fallback').hidden, composer: document.getElementById('composer').hidden })`,
    );
    check('⑧ 收起兜底后两者回到 hidden（FR-V3-012）', collapsedAgain === '{"fallback":true,"composer":true}', collapsedAgain);

    // ── ⑨ both themes readable, never colour-only ─────────────────────────
    console.log('\n▶ ⑨ 明暗双主题：状态可读且不只靠颜色');
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
          // "not colour-only": strip every inline paint property, then re-read the
          // three channels — text / badge / icon must survive without any colour.
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
          return JSON.stringify({
            text, badge, hasIcon: Boolean(row.querySelector('.risk-icon')),
            color: style ? style.color : '',
            background: style ? style.backgroundColor : '',
            badgeColor: badgeStyle ? badgeStyle.color : '',
            badgeBackground: badgeStyle ? badgeStyle.backgroundColor : '',
            tokens,
            survivors,
            badges: [...document.querySelectorAll('#l0-status-band .l0-band-badge, #risk-rail .risk-badge')].length,
          });
        })()`,
      );
      const tp = JSON.parse(themeProbe);
      themeData[theme] = tp;
      check(`⑨ ${theme} 主题：风险行文字非空（不只靠颜色）`, tp.text.length > 0, themeProbe);
      check(`⑨ ${theme} 主题：风险行徽标 + 图标齐备`, tp.badge.length > 0 && tp.hasIcon === true, themeProbe);
      check(`⑨ ${theme} 主题：文字颜色与背景均解析成功`, tp.color.length > 0 && tp.background.length > 0, themeProbe);
      // I12: the old assertions only checked "the computed string is non-empty",
      // which passes even if the two themes paint identically (i.e. the dark
      // tokens are dead). Assert the theme tokens really resolve AND really differ.
      for (const token of THEME_TOKENS) {
        check(`⑨ ${theme} 主题：语义 token ${token} 解析为非空值`, (tp.tokens[token] ?? '').length > 0, `${token}=${JSON.stringify(tp.tokens[token])}`);
      }
      check(
        `⑨ ${theme} 主题：去掉颜色后三通道仍可读（不只靠颜色）`,
        tp.survivors?.text === true && tp.survivors?.badge === true && tp.survivors?.icon === true,
        JSON.stringify(tp.survivors),
      );
      await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'off'); true`);
      await sleep(150);
    }
    check(
      '⑨ 明暗两套的主题 token 值确实不同（暗色不是死 token；非同一套颜色）',
      THEME_TOKENS.every((token) => themeData.light.tokens[token] !== themeData.dark.tokens[token]),
      JSON.stringify({
        light: themeData.light.tokens,
        dark: themeData.dark.tokens,
      }),
    );
    check(
      '⑨ 明暗两套的风险行文字 / 行背景 / 徽标文字色确实不同（主题切换真实生效）',
      themeData.light.color !== themeData.dark.color &&
        themeData.light.background !== themeData.dark.background &&
        themeData.light.badgeColor !== themeData.dark.badgeColor,
      JSON.stringify({
        light: [themeData.light.color, themeData.light.background, themeData.light.badgeColor, themeData.light.badgeBackground],
        dark: [themeData.dark.color, themeData.dark.background, themeData.dark.badgeColor, themeData.dark.badgeBackground],
      }),
    );
    // The badge paint is deliberately transparent in both themes (it inherits the
    // row background), so it is *registered* as a diagnostic rather than asserted
    // to differ — what must differ is its text colour (above) and the row paint.
    check(
      '⑨ 徽标底色为继承（两主题均透明）——不得因此判定主题未生效（登记项）',
      themeData.light.badgeBackground === 'rgba(0, 0, 0, 0)' && themeData.dark.badgeBackground === 'rgba(0, 0, 0, 0)',
      JSON.stringify([themeData.light.badgeBackground, themeData.dark.badgeBackground]),
    );
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });

    check('无未捕获页面异常（渲染全链路干净）', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('L0 运行时门禁');
}

main().catch((err) => {
  console.error(`✖ L0 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
