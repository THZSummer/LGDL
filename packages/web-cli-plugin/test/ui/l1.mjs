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

const FIXTURE_ORIGIN = 'https://v3-l1.test';
const LLM_KEY = 'web-cli:web-cli:llm';
const CLASSES = [
  'l1-status',
  'l1-consequences',
  'l1-ref-evidence',
  'l1-local-tree',
  'l1-history',
  'l1-receipt',
  'l1-gestures',
  'l1-more',
];
/** class → the L0 trigger whose ONE click must reveal it (ADR-V3-021 §2). */
const ENTRY = {
  'l1-status': 'l0-status-band',
  'l1-consequences': 'l0-more',
  'l1-ref-evidence': 'l0-ref-toggle',
  'l1-local-tree': 'l0-status-band',
  'l1-history': 'l0-status-band',
  'l1-receipt': 'l0-status-band',
  'l1-gestures': 'l0-status-band',
  'l1-more': 'l0-more',
};
/** class → the class's OWN labelled trigger (`data-count` lives there). */
const TRIGGER = {
  'l1-status': 'l0-status-band',
  'l1-consequences': 'l1-consequences-toggle',
  'l1-ref-evidence': 'l0-ref-toggle',
  'l1-local-tree': 'l1-local-tree-toggle',
  'l1-history': 'l1-history-toggle',
  'l1-receipt': 'l1-receipt-toggle',
  'l1-gestures': 'l1-gestures-toggle',
  'l1-more': 'l0-more',
};
/** The verbatim readable reasons (plan §2.3(4)) — the renderer must match. */
const REASON = {
  'dom-gone': '引用 1 的目标元素已不存在（选择器解析失败或元素被替换）',
  'origin-changed': '引用 1 属于 https://v3-l1.test，当前站点已是 https://other.test —— 跨站引用不可用',
  navigated: '引用 1 捕获后页面已导航（含单页路由切换），目标可能已重建',
  'declaration-changed': '引用 1 捕获后站点声明已变化（decl-1 → decl-2），目标语义可能已改变',
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
    console.log('\n▶ ① 八类 L1 内容：可枚举 + 逐类 ≤1 次交互');
    const enumerated = await evaluate(
      cdp,
      `(() => {
        const panels = [...document.querySelectorAll('[data-l1-panel]')];
        return JSON.stringify({
          ids: panels.map((p) => p.getAttribute('data-l1-panel')),
          allHidden: panels.every((p) => p.hidden === true),
          dataIds: panels.map((p) => p.id),
        });
      })()`,
    );
    const en = JSON.parse(enumerated);
    check('① 恰好 8 个 [data-l1-panel] 且 id 集合与契约一致', JSON.stringify([...en.ids].sort()) === JSON.stringify([...CLASSES].sort()), enumerated);
    check('① 8 个 L1 面板默认全部 hidden（折叠只用 hidden 属性）', en.allHidden === true, enumerated);

    for (const cls of CLASSES) {
      const probe = await evaluate(
        cdp,
        `(() => {
          window.__v3.testing.collapseAll();
          const panel = [...document.querySelectorAll('[data-l1-panel]')].find((p) => p.getAttribute('data-l1-panel') === ${JSON.stringify(cls)});
          const trigger = document.getElementById(${JSON.stringify(ENTRY[cls])});
          const before = panel ? panel.hidden : null;
          trigger.click();
          const visible = ${VISIBLE};
          return JSON.stringify({
            before,
            afterHidden: panel ? panel.hidden : null,
            visible: panel ? visible(panel) : false,
            text: panel ? (panel.textContent || '').trim().length : 0,
            aria: trigger.getAttribute('aria-expanded'),
          });
        })()`,
      );
      const p = JSON.parse(probe);
      check(`① ${cls}：默认 hidden → 1 次点击（${ENTRY[cls]}）后可见且有非空内容`, p.before === true && p.afterHidden === false && p.visible === true && p.text > 0, probe);
    }
    // the status group opens all five classes with that ONE click (not just one)
    const groupOpen = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.collapseAll();
        document.getElementById('l0-status-band').click();
        const ids = ['topbar', 'l1-local-tree', 'l1-history', 'l1-receipt', 'l1-gestures'];
        return JSON.stringify(ids.map((id) => [id, document.getElementById(id).hidden]));
      })()`,
    );
    check('① 一次点击 #l0-status-band 同时展开 ①④⑤⑥⑦ 五类（L0 可点预算 7/7 满额，故入口复用）', JSON.parse(groupOpen).every(([, hidden]) => hidden === false), groupOpen);

    // ── ② expanded L1 does not occlude L0 (FR-V3-030) ───────────────────────
    console.log('\n▶ ② 展开不遮挡：风险位与决策卡仍在视口内且与展开区不交叠');
    const geo = await evaluate(
      cdp,
      `(() => {
        const open = () => { window.__v3.testing.collapseAll(); document.getElementById('l0-status-band').click(); };
        open();
        const rail = document.getElementById('risk-rail').getBoundingClientRect();
        const card = document.getElementById('l0-decision').getBoundingClientRect();
        const group = document.getElementById('topbar').getBoundingClientRect();
        const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const inView = (r) => r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0;
        const scrollers = [...document.querySelectorAll('#panel-main *, #panel-main')]
          .filter((el) => { const s = getComputedStyle(el); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight; })
          .map((el) => el.id || el.className);
        return JSON.stringify({
          railInView: inView(rail), cardInView: inView(card),
          railCard: inter(rail, card), railGroup: inter(rail, group), cardGroup: inter(card, group),
          panelScrollers: scrollers,
          logId: document.getElementById('log').id,
        });
      })()`,
    );
    const g = JSON.parse(geo);
    check('② 展开后 #risk-rail 仍在视口内', g.railInView === true, geo);
    check('② 展开后决策卡（#l0-decision）仍在视口内', g.cardInView === true, geo);
    check('② 展开区与风险位 / 决策卡交面积 = 0', g.railGroup === 0 && g.cardGroup === 0, geo);
    check('② 展开后 #panel-main 内滚动容器仍只有 #log（L1 的滚动块在 #panel-top 内）', g.panelScrollers.every((id) => id === 'log'), JSON.stringify(g.panelScrollers));

    // ── ③ consequences: two paragraphs each + irreversibility ───────────────
    console.log('\n▶ ③ 后果说明与影响预演：每选项两段必填 + 破坏性选项不可逆声明');
    await evaluate(cdp, `window.__v3.testing.collapseAll(); document.getElementById('l0-more').click(); true`);
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
          return JSON.stringify({ exists: Boolean(row), text: row ? (row.querySelector('.risk-text')?.textContent || '').trim() : '', badge: row ? (row.querySelector('.risk-badge')?.textContent || '').trim() : '', icon: row ? Boolean(row.querySelector('.risk-icon')) : false, aria: document.getElementById('l0-ref-toggle').getAttribute('aria-disabled'), repick: document.getElementById('l0-pick').textContent });
        })()`,
      );
      const r = JSON.parse(rail);
      const ordinal = Number(/^ref_(\d+)$/.exec(rec.refId)?.[1]);
      const expected = REASON[dimension].replace('引用 1 ', `引用 ${ordinal} `);
      check(`⑦ ${dimension} → 风险位常驻该行且三通道齐备（文字+徽标+图标）`, r.exists && r.text.length > 0 && r.badge.length > 0 && r.icon, rail);
      check(`⑦ ${dimension} → 可读原因指到该维（逐字）`, r.text === expected, `${r.text} ≠ ${expected}`);
      check(`⑦ ${dimension} → chip 标记失效 + 「从页面拾取」改写为「重新拾取」`, r.aria === 'true' && /^重新拾取/.test(r.repick), rail);
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
        document.getElementById('l0-ref-toggle').click();
        const actionsVisible = document.getElementById('l1-ref-actions').hidden === false;
        const reason = document.getElementById('l1-ref-reason').textContent || '';
        const badgeVisible = document.getElementById('l0-ref-badge').hidden === false;
        document.getElementById('l1-ref-describe').click();
        const fallbackOpen = document.getElementById('ask-fallback').hidden === false;
        window.__v3.testing.l1('repick');
        const after = window.__v3.testing.l1('report');
        return JSON.stringify({
          beforeStale: before.stale, actionsVisible, reason, badgeVisible, fallbackOpen,
          beforeIds: before.refs.map((r) => r.refId), afterIds: after.refs.map((r) => r.refId),
          verdicts: after.refs.map((r) => r.verdict), stale: after.stale,
          repickCount: after.refs.length,
        });
      })()`,
    );
    const rec9 = JSON.parse(recovery);
    check('⑨ 失效态下恢复路径可见 + 可读原因给出', rec9.actionsVisible === true && rec9.reason.length > 0, recovery);
    check('⑨ chip 侧失效徽标可见（三通道之一）', rec9.badgeVisible === true, recovery);
    check('⑨ 「改用描述」走既有 #ask 兜底输入（不新造输入框）', rec9.fallbackOpen === true, recovery);
    check('⑨ 「重新拾取」产生 NEW id（失效 id 不重用）', rec9.repickCount === rec9.beforeIds.length + 1 && !rec9.beforeIds.includes(rec9.afterIds[rec9.afterIds.length - 1]), recovery);
    check('⑨ 恢复后引用回到 valid 态（判据重跑，不是缓存）', rec9.verdicts[rec9.verdicts.length - 1] === 'valid' && rec9.stale === 0, recovery);

    // ── ⑩ receipt triple + real re-pull ───────────────────────────────────
    console.log('\n▶ ⑩ 回执三件套：摘要常驻 L0 + 证据/审计出口在 L1 + 重拉实测');
    const receipt = await evaluate(
      cdp,
      `(async () => {
        const first = await window.__v3.testing.l1('receipt', { ok: true, text: '✓ 已完成', actionId: 'revoke-origin', command: 'revoke', ms: 42, auditId: 'audit-7', tool: 'bookmarks' });
        const second = await window.__v3.testing.l1('receipt', { ok: true, text: '✓ 已完成', actionId: 'revoke-origin', command: 'revoke', ms: 50, auditId: 'audit-8', tool: 'bookmarks' });
        document.getElementById('l0-statusbar').click();
        document.getElementById('l2-entry-audit').click();
        const out = {
          seq1: first.refreshSeq, seq2: second.refreshSeq,
          pieces: window.__v3.testing.l1('report').pieces,
          summaryHidden: document.getElementById('l0-receipt-summary').hidden,
          summaryText: document.getElementById('l0-receipt-summary').textContent || '',
          rows: [...document.querySelectorAll('#l1-receipt-rows .l1-row')].map((r) => r.textContent),
          auditLabel: document.getElementById('l1-receipt-audit').textContent,
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
    check('⑩ 摘要在默认态常驻可见（L0 常驻位）', rc.summaryHidden === false && /回执：/.test(rc.summaryText), receipt);
    check('⑩ 完整证据 ≤1 次交互可达（8 行白名单字段）', rc.rows.length === 8, JSON.stringify(rc.rows));
    check('⑩ 审计出口指向 L2 审计视图（2 次交互可达）', /查看审计/.test(rc.auditLabel) && rc.viewHost === true, receipt);
    check('⑩ 零明文：证据/回执不出现 URL 查询串 / apiKey', !/\?[A-Za-z0-9_]+=/.test(rc.evidenceText) && !/api[-_]?key/i.test(rc.evidenceText), rc.evidenceText);

    // ── ③③④⑤ discoverability + counts + evidence read-only + local tree ──
    console.log('\n▶ ⑪ 可发现性（非空文字 + 真值计数）+ 证据层只读 + 局部树 ≤3 + 历史可复算');
    const discover = await evaluate(
      cdp,
      `(() => {
        const map = ${JSON.stringify(TRIGGER)};
        const out = {};
        for (const cls of Object.keys(map)) {
          const panel = [...document.querySelectorAll('[data-l1-panel]')].find((p) => p.getAttribute('data-l1-panel') === cls);
          const trigger = document.getElementById(map[cls]);
          out[cls] = { text: (trigger.textContent || '').trim(), count: trigger.getAttribute('data-count'), label: trigger.getAttribute('aria-label') };
        }
        const refRows = document.getElementById('l1-ref-rows');
        const writeControls = [...document.querySelectorAll('#l1-ref-rows button, #l1-ref-rows input, #l1-ref-rows select, #l1-ref-rows textarea')].length;
        const allWrite = [...document.querySelectorAll('[data-l1-panel] [data-write-op]')].length;
        return JSON.stringify({
          entries: out, writeControls, allWrite,
          evidenceRows: [...refRows.querySelectorAll('.l1-row')].map((r) => r.textContent),
          localTree: window.__v3.testing.l1('report').localTree,
          globalEntry: Boolean(document.getElementById('l1-local-tree-global')),
          globalLabel: document.getElementById('l1-local-tree-global').textContent,
          historyCount: window.__v3.testing.l1('report').historyCount,
          historyLabel: document.getElementById('l1-history-toggle').textContent,
          gestureRows: document.querySelectorAll('#l1-gestures tbody tr').length,
          gestures: window.__v3.testing.l1('report').gestures,
          consequencesToggle: document.getElementById('l1-consequences-toggle').textContent,
        });
      })()`,
    );
    const d = JSON.parse(discover);
    check('⑪ 8 个 L1 入口都有非空文字标签 + data-count（无「只有图标」入口）', Object.values(d.entries).every((e) => e.text.length > 0 && /^\d+$/.test(e.count)), discover);
    check('⑪ 计数与真值同源（手势表行数 ≡ 常量 ≡ 触发器等）', d.gestureRows === d.gestures && /4 个手势/.test(d.entries['l1-gestures'].text), discover);
    check('⑪ 后果面板计数 = 真实选项数（4）', d.entries['l1-consequences'].count === '4' && /4 个选项/.test(d.consequencesToggle), discover);
    check('⑪ 回执证据计数 = 真实行数（8）', d.entries['l1-receipt'].count === '8', discover);
    check('⑪ 证据层写入控件 = 0（只读投影，含零提权控件）', d.writeControls === 0 && d.allWrite === 0, discover);
    check('⑪ 证据四要素齐备（选择器 / 语义路径 / 文本摘要 / 捕获时间）', ['稳定选择器', '语义路径', '文本摘要', '捕获时间'].every((k) => d.evidenceRows.some((r) => r.includes(k))), JSON.stringify(d.evidenceRows));
    check('⑪ 局部树节点数 ≤3（硬上限）', d.localTree <= 3, String(d.localTree));
    check('⑪ 「查看全局树」入口存在且指向 L2（2 次交互可达）', d.globalEntry === true && /全局树/.test(d.globalLabel), discover);
    check('⑪ 局部树注入：≤3 节点且含父链（由 ⑫ 的注入断言覆盖）', true, '见下方 inject 段');

    // local tree injection (real v2 snapshot shape) + history round-trip
    const treeHist = await evaluate(
      cdp,
      `(() => {
        const leaf = (id, label, path, cross) => ({
          id: 'n-' + id, kind: 'capability', label, nodeId: id, ariaLevel: path.length, path,
          mainOwner: 'capability', crossRefCount: (cross || []).length, crossRefLabels: cross || [], crossTargets: [], badgeSummary: [], children: [],
        });
        const root = { id: 'root', kind: 'root', label: '连接树', ariaLevel: 1, path: ['连接树'], mainOwner: 'root', crossRefCount: 0, crossRefLabels: [], crossTargets: [], badgeSummary: [], children: [] };
        const cap = { ...leaf('cap', '能力面', ['连接树', '能力面']), kind: 'face', children: [] };
        const site = { ...leaf('site', '站点面', ['连接树', '站点面']), kind: 'face', children: [] };
        const target = leaf('cmd', 'bookmarks.create', ['连接树', '能力面', '浏览器能力', 'bookmarks.create'], ['依赖权限']);
        const browser = { ...leaf('browser', '浏览器能力', ['连接树', '能力面', '浏览器能力']), kind: 'group', children: [target] };
        cap.children = [browser];
        root.children = [cap, site];
        const view = window.__v3.testing.l1('tree', { root }, 'cmd');
        const rows = [...document.querySelectorAll('#l1-local-tree-rows .l1-row')].map((r) => r.textContent);
        // history: answer the current round through the real product path, then re-ask.
        window.__v3.testing.l1('history');
        const beforeHistory = window.__v3.testing.l1('report').historyCount;
        document.querySelector('#ask-options button').click();
        const afterFirst = window.__v3.testing.l1('report').historyCount;
        window.__v3.testing.ask('这一步先做什么？', ['查看站点声明', '列出可用命令']);
        document.querySelector('#ask-options button').click();
        const afterSecond = window.__v3.testing.l1('report').historyCount;
        const rounds = window.__v3.testing.l1('report').rounds;
        const execBefore = JSON.stringify(window.__v3.testing.l1('report').refs);
        document.getElementById('l0-status-band').click();
        const execAfter = JSON.stringify(window.__v3.testing.l1('report').refs);
        return JSON.stringify({ view, rows, beforeHistory, afterFirst, afterSecond, rounds, execStable: execBefore === execAfter, label: document.getElementById('l1-history-toggle').textContent });
      })()`,
    );
    const th = JSON.parse(treeHist);
    check('⑪ 注入快照后局部树 ≤3 节点且含当前节点与父链', th.view.count <= 3 && th.view.labels.length === th.view.count && th.rows.length === th.view.count, JSON.stringify(th.view));
    check('⑪ 交叉引用以徽标呈现（不复制节点）', th.view.crossRefs.length > 0, JSON.stringify(th.view));
    check('⑪ 「已决策 N 步」的 N 可复算（1 → 2，与 rounds 数组长度一致）', th.afterFirst === th.beforeHistory + 1 && th.afterSecond === th.afterFirst + 1 && th.rounds.length === th.afterSecond, treeHist);
    check('⑪ 改选被标记（同一 prompt 二次决策 → changed=true）', th.rounds.some((r) => r.changed === true), JSON.stringify(th.rounds));
    check('⑪ 回看历史零副作用（展开前后已执行动作/引用态逐字不变）', th.execStable === true, treeHist);
    check('⑪ 历史入口标签含真实步数', new RegExp(`已决策 ${th.afterSecond} 步`).test(th.label), th.label);

    // ── ⑫ density does not regress after an expand/collapse round trip ─────
    console.log('\n▶ ⑫ 密度不回归：展开/收起往返后默认档仍达标（三视口，复用 v3-1 口径）');
    await resetFixture(cdp);
    await evaluate(
      cdp,
      `(() => {
        const openAll = () => { document.getElementById('l0-status-band').click(); document.getElementById('l0-more').click(); document.getElementById('l0-ref-toggle').click(); };
        const closeAll = () => { document.getElementById('l0-status-band').click(); document.getElementById('l0-more').click(); document.getElementById('l0-ref-toggle').click(); };
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
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('L1 运行时门禁');
}

main().catch((err) => {
  console.error(`✖ L1 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
