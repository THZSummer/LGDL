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
 *   ⑥ AC-V3-010: every disclosure entry has non-empty text + a paired
 *      `aria-expanded`/`aria-controls` whose target holds a non-empty summary or
 *      count; L1 is ≤1 interaction and L2 is ≤2 interactions away;
 *   ⑦ AC-V3-021: the resident element set is identical at 320 and 400 (nothing is
 *      deleted on a narrow panel) and there is zero horizontal overflow;
 *   ⑧ the geometry contract inherited from the v2 insight gate: the four L0 zones
 *      are pairwise non-overlapping (6 pairs), `#log` is the ONLY panel-level
 *      scroller, `#log` keeps its first-round measured floor, and the composer sits
 *      flush at the bottom in the fallback state without being occluded;
 *   ⑨ both themes (`prefers-color-scheme`) keep every L0 state readable and never
 *      rely on colour alone (FR-V3-026 / AC-V3-020).
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
import { LOG_CLIENT_HEIGHT_FLOOR, RISK_SUBSCENARIOS } from './density-metrics.mjs';

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

/** In-page: the risk row probe (visibility + foldable ancestors + 3 channels). */
const riskProbe = (cls) => `(() => {
  const row = document.querySelector('#risk-rail .risk-row[data-risk-class="${cls}"]');
  if (!row) return { ok: false, why: '不存在' };
  const chain = [];
  let node = row;
  while (node) { chain.push(node); node = node.parentElement; }
  const hiddenAncestor = chain.find((n) => n.hidden === true);
  if (hiddenAncestor) return { ok: false, why: 'hidden 祖先 ' + (hiddenAncestor.id || hiddenAncestor.tagName) };
  const folded = chain.find((n) => n.hasAttribute('data-l1-panel') || n.hasAttribute('data-l2-view') || n.hasAttribute('data-disclose-panel'));
  if (folded) return { ok: false, why: '折叠容器祖先 ' + (folded.id || folded.className) };
  const rect = row.getBoundingClientRect();
  if (!(rect.height > 0)) return { ok: false, why: '高度 0' };
  if (rect.top < 0 || rect.bottom > window.innerHeight) return { ok: false, why: '不在默认视口内' };
  const text = (row.querySelector('.risk-text')?.textContent ?? '').trim();
  const badge = (row.querySelector('.risk-badge')?.textContent ?? '').trim();
  const icon = row.querySelector('.risk-icon');
  if (!text || !badge || !icon) return { ok: false, why: '三通道不齐备' };
  return { ok: true, text, badge, hasText: true, hasBadge: true, hasIcon: true, height: Math.round(rect.height) };
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
    await evaluate(cdp, `window.__v3.testing.clearAsk(); true`);
    await sleep(200);
    const noAsk = await evaluate(cdp, `JSON.stringify({ askHidden: document.getElementById('ask').hidden, moreHidden: document.getElementById('l0-more').hidden })`);
    check('② 无待答回合时决策卡整体 hidden（不留空卡）', noAsk === '{"askHidden":true,"moreHidden":true}', noAsk);
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

    const confirm = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.setRisk('confirm', 'force');
        return true;
      })()`,
    );
    void confirm;
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
    const wired = entries.filter((e) => ['l0-status-band', 'l0-more', 'l0-ref-toggle', 'l0-statusbar'].includes(e.trigger));
    check('⑥ 四个 L0 折叠入口齐备', wired.length === 4, JSON.stringify(entries.map((e) => e.trigger)));
    for (const entry of wired) {
      check(`⑥ ${entry.trigger}：有非空文字标签（禁「只有图标」）`, entry.text.length > 0 || entry.label.length > 0, JSON.stringify(entry));
      check(`⑥ ${entry.trigger}：aria-expanded + aria-controls 成对`, entry.hasExpanded === true && Boolean(entry.targetId), JSON.stringify(entry));
      check(`⑥ ${entry.trigger}：aria-controls 指向存在的元素`, entry.targetExists === true, JSON.stringify(entry));
      check(`⑥ ${entry.trigger}：目标含非空摘要或计数`, entry.summaryInTarget === true, JSON.stringify(entry));
    }
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
    check('⑧ #log 仍是唯一的面板级滚动容器', geoHidden.panelScrollers.length <= 1 && (geoHidden.panelScrollers[0] ?? 'log') === 'log', JSON.stringify(geoHidden.panelScrollers));
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
          return JSON.stringify({
            text, badge, hasIcon: Boolean(row.querySelector('.risk-icon')),
            color: style ? style.color : '',
            background: style ? style.backgroundColor : '',
            badges: [...document.querySelectorAll('#l0-status-band .l0-band-badge, #risk-rail .risk-badge')].length,
          });
        })()`,
      );
      const tp = JSON.parse(themeProbe);
      check(`⑨ ${theme} 主题：风险行文字非空（不只靠颜色）`, tp.text.length > 0, themeProbe);
      check(`⑨ ${theme} 主题：风险行徽标 + 图标齐备`, tp.badge.length > 0 && tp.hasIcon === true, themeProbe);
      check(`⑨ ${theme} 主题：文字颜色与背景均解析成功`, tp.color.length > 0 && tp.background.length > 0, themeProbe);
      await evaluate(cdp, `window.__v3.testing.setRisk('hardline', 'off'); true`);
      await sleep(150);
    }
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
