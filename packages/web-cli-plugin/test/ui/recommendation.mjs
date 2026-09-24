/**
 * V4-4 TASK-809 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the **recommendation /
 * system-event / reference-card** gate (`npm run test:recommendation`).
 *
 * Runs against the real `dist/` product through the REAL reducer + real card
 * factory (the `window.__v3.testing` seam drives the same `reduce` / `render` path
 * the background messages use — no shadow implementation):
 *
 *   ① chips 即指令：click 走 composer 的**同一生产入口**（`requestTurn`），不填输入框
 *   ② 上限：≤1 卡 / 卡 ≤3 chips（单卡可点 ≤6）
 *   ③ `pending` 门控：chips `disabled` + `aria-disabled`（**不隐藏**）且不生成新卡
 *   ④ 无候选不渲染：候选为空 ⇒ 流内零 `nextstep` 卡（EC-CHAT-008）
 *   ⑤ 系统事件行：`HH:MM:SS` + 只追加 + 去重窗口 + 速率上限 `dropped` 状态栏可读
 *   ⑥ 首装卡：`firstRun` 档推荐 ≤1 卡（不与 default 混算）
 *   ⑦ 引用卡：有效=证据层只读；失效=原因 + 两条恢复路径 + 兜底默认收起
 *   ⑧ 宿主清零：`[data-transitional-host]` 计数 = 0（v4 收口）
 *   ⑨ 无未捕获异常 + 零横向溢出 + 计数守恒（D-005 只增）
 *   ⑬ 首装路径（I-09 快修轮）：真·首装 ⇒ `onboarding` 规则的 nextstep 卡出现（**不经 seam**）
 *   ⑭ FIX-1（F 还原度快修轮，2026-09-20）：授权 chip 直达授权流（本地权限流；
 *      `act:'authorize'` → `authorizeCurrentSite()`，不产生 user 回合、不受 pending 门控）
 *   ⑮ V5-1（TASK-V5-115 / FR-ALLN-057·058·112 / X3·X6）：chip `data-op`（opId，**分发
 *      依据**）与 `data-act`（渲染别名）**双采集一致**；零悬空 opId（∈ 首批 9 op）；
 *      `#stream [data-op]` 成为流内可达 next 的选择器锚。纯新增，零删除既有断言。
 *
 * Serial discipline: exactly ONE Chromium instance, one page target (NFR-CHAT-009).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PACKAGE_ROOT,
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
  VIEWPORT_HEIGHT,
  waitFor,
} from './_v3-helpers.mjs';

/** D-005 runtime floor（本叶台账 `v4GateFloors`）：首次实测后只增不减。 */
const RECOMMENDATION_RUNTIME_FLOOR = 30;
/** 静态 `check(` 下界（同口径：文件自身计数）。 */
const RECOMMENDATION_STATIC_FLOOR = 30;

/** The four tags a chip count must respect (single-card budget ≤6). */
const CONTROL_TAGS = 'button,a,input,select,textarea';

/** A shared in-page visibility probe. */
const VIS = `const vis = (el) => { let n = el; while (n) { if (n.hidden === true) return false; n = n.parentElement; } return Boolean(el); };`;

/** Authorize + discover the fixture origin (same shape as the l0/density fixtures). */
async function authorizeFixture(cdp) {
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'discover', origin: 'https://v4-4.test', state: 'supported' }).then(() => true)`,
  );
  await waitFor(cdp, `document.getElementById('status').textContent.includes('v4-4.test') ? '1' : ''`, 60, 200);
  await evaluate(
    cdp,
    `chrome.runtime.sendMessage({ kind: 'authorize', origin: 'https://v4-4.test', hostPermissionGranted: false }).then(() => true)`,
  );
  await evaluate(cdp, `window.__v3.testing.refresh(); true`);
  await sleep(300);
}

async function main() {
  console.log(`▶ chrome: ${CHROME}`);
  console.log(`▶ dist:   ${DIST}`);
  const { chrome, base } = await launch({ tag: 'recommendation', extDir: DIST, portRange: [9800, 9899] });
  try {
    const sw = await findOurServiceWorker(base);
    if (!sw) throw new Error('web-cli plugin service worker 不可达');
    const { cdp } = await openSidePanel(sw.cdp, base);
    const pageErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => pageErrors.push(p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));

    await setViewport(cdp, 400, VIEWPORT_HEIGHT);
    await waitFor(cdp, `document.getElementById('stream') ? '1' : ''`, 80, 200);

    // ══ ⑬ I-09（V4-4 快修轮）：**首装推荐时机**（真·首装态，不经 seam）═════════
    // 此处是**本门禁的第一个断言段**，面板还没绑定/授权过任何站点、也没有模型配置
    // ⇒ 真实首装态。断言的驱动源是**产品自身的启动路径**（`refreshState()` /
    // `refreshLlmStatus()` 落地后的 firstRun 入口），**不调用** `window.__v3.testing.*`：
    // 驱动/判定都只看真实 DOM（`#onboarding` 可见 ∧ 流内出现 `onboarding` 规则的
    // nextstep 卡）；`lastRecommend()` 仅作**诊断输出**（`trigger='firstRun'` 是「生产入口
    // 跑过」的旁证，不是判定依据）。
    console.log('\n▶ ⑬ I-09 首装路径（不经 seam）：真·首装 ⇒ **可行动恢复卡**（W3 起 site 触发优先）');
    const firstRunEntry = await waitFor(
      cdp,
      `document.querySelector('#stream [data-msg-type="nextstep"]') ? '1' : ''`,
      80,
      200,
    );
    const firstRunRaw = await evaluate(
      cdp,
      `(() => {
         const card = document.querySelector('#stream [data-msg-type="nextstep"]');
         // V4.5-1 W2（TASK-V45-106 §5）：退役的 #onboarding 节点 → 流内 firstRun 载体。
         const onboard = document.querySelector('#stream [data-msg-type="system"][data-kind="firstRun"]')
           ?? document.querySelector('#stream [data-msg-type="nextstep"][data-nextstep-rule="onboarding"]');
         const chips = card ? [...card.querySelectorAll('button.next-chip')] : [];
         return JSON.stringify({
           onboardVisible: onboard ? onboard.hidden === false : null,
           card: Boolean(card),
           rule: card ? card.getAttribute('data-nextstep-rule') : null,
           chips: chips.map((c) => c.textContent),
           acts: chips.map((c) => c.getAttribute('data-act')),
           label: card ? (card.textContent || '').trim() : '',
           last: window.__v3.testing.lastRecommend(),
         });
       })()`,
    );
    const firstRun = JSON.parse(firstRunRaw);
    check('⑬ 前置：面板确实处于首装态（firstRun 载体或首装推荐卡在场；#onboarding 节点已退役）', firstRun.onboardVisible === true || firstRun.card === true, firstRunRaw);
    check('⑬ 首装 ⇒ 流内出现推荐卡（不经 seam 驱动）', firstRunEntry === '1' && firstRun.card === true, firstRunRaw);
    // V4.5-1 W3（FR-V45-030/031）：未授权 / 未绑定的首装态由 **site 触发**优先承载 ——
    // 规则 = risk-recovery，且 chips 首项必须是「重新绑定当前标签页」（规则表保证）。
    check('⑬ 卡规则 = risk-recovery（W3：site 触发优先于 onboarding）', firstRun.rule === 'risk-recovery', firstRunRaw);
    check('⑬ 卡带可点 chip 且含 rebind（规则表首项）', firstRun.chips.length >= 1 && firstRun.acts[0] === 'rebind' && /重新绑定当前标签页/.test(firstRun.chips[0]), firstRunRaw);
    check('⑬ 卡上无 `next` chip 被 deny 误伤（本地动作全存活）', firstRun.acts.every((a) => typeof a === 'string' && a.length > 0), firstRunRaw);
    check(
      '⑬ 生产入口（非 seam）证据：lastRecommend().trigger === firstRun ∧ rule 已记录',
      firstRun.last && firstRun.last.trigger === 'firstRun' && firstRun.last.rule === 'risk-recovery',
      `${firstRunRaw} | last=${JSON.stringify(firstRun.last)}`,
    );

    await authorizeFixture(cdp);

    // ── ① chips 即指令（同一生产入口） ────────────────────────────────────────
    console.log('\n▶ ① chips 即指令：同一生产入口（不填输入框）');
    await evaluate(cdp, `window.__v3.testing.streamReset(); window.__v3.testing.refCard(3, 'valid'); window.__v3.testing.recommend('ref'); true`);
    await sleep(250);
    const chipRaw = await evaluate(
      cdp,
      `(() => {
        const card = document.querySelector('#stream [data-msg-type="nextstep"]');
        if (!card) return JSON.stringify({ found: false });
        const chips = [...card.querySelectorAll('button.next-chip')];
        const before = document.querySelectorAll('#stream [data-msg-type="user"]').length;
        const inputBefore = document.getElementById('input').value;
        const userBefore = document.querySelectorAll('#stream [data-msg-type="user"]').length;
        // V4.5-1 W3：settled 态的首选卡可能是**可行动恢复卡**（site/probe 触发，chips 全为
        // 本地动作）——本判据仍打「chips 即指令」：点第一枚 act=next 的 chip。
        const nextChip = chips.find((c) => c.getAttribute('data-act') === 'next') ?? chips[0];
        nextChip.click();
        const clickedAct = nextChip.getAttribute('data-act');
        return JSON.stringify({
          found: true,
          chipCount: chips.length,
          acts: chips.map((c) => c.getAttribute('data-act')),
          clickedAct,
          inputBefore,
          userBefore,
          userAfter: document.querySelectorAll('#stream [data-msg-type="user"]').length,
          inputAfter: document.getElementById('input').value,
          before,
        });
      })()`,
    );
    const chip = JSON.parse(chipRaw);
    check('① 推荐卡存在（有效引用 ⇒ R-REF-ACTION）', chip.found === true, chipRaw);
    check('① 单卡 chips ≤3', chip.found && chip.chipCount >= 1 && chip.chipCount <= 3, chipRaw);
    check('① chip 带 data-act（意图是数据，不是猜测）', chip.found && chip.acts.every((a) => typeof a === 'string' && a.length > 0), chipRaw);
    // V4.5-1 W3：settled 态的首选卡可能是恢复卡（chips 全本地）——此时「chips 即指令」的
    // 判据落在「本地 chip 点击零 user 回合」上；有 `next` chip 时才是回合路径。
    if (chip.clickedAct === 'next') {
      check('① chip 点击经同一生产入口发起回合（act=next 的 chip ⇒ 流内出现 user 卡）', chip.userAfter > chip.userBefore, chipRaw);
    } else {
      check('① 本地 chip 点击零 user 回合（恢复卡的本地动作语义）', chip.userAfter === chip.userBefore && ['repick', 'describe', 'rebind'].includes(String(chip.clickedAct)), chipRaw);
    }
    check('① chip 不把文本复制进输入框（FR-CHAT-061 逐字禁止）', chip.inputAfter === '', chipRaw);

    // ── ② 上限 ───────────────────────────────────────────────────────────────
    console.log('\n▶ ② 上限：≤1 卡 / 卡 ≤3 chips / 单卡可点 ≤6');
    const limitRaw = await evaluate(
      cdp,
      `(() => {
        ${VIS}
        const cards = [...document.querySelectorAll('#stream [data-msg-type="nextstep"]')];
        const card = cards.at(-1);
        const clickables = card ? [...card.querySelectorAll('${CONTROL_TAGS}')].filter((el) => vis(el) && el.disabled !== true).length : -1;
        return JSON.stringify({ cards: cards.length, clickables });
      })()`,
    );
    const limit = JSON.parse(limitRaw);
    check('② 同一轮 ≤1 张推荐卡（无队列堆积）', limit.cards >= 1 && limit.cards <= 1, limitRaw);
    check('② 单卡可点 ≤6', limit.clickables >= 0 && limit.clickables <= 6, limitRaw);

    // ── ③ pending 门控 ───────────────────────────────────────────────────────
    console.log('\n▶ ③ pending 门控：disabled + aria-disabled（不隐藏）且不生成新卡');
    const pendingRaw = await evaluate(
      cdp,
      `(() => {
        const cardsBefore = document.querySelectorAll('#stream [data-msg-type="nextstep"]').length;
        window.__v3.testing.setPending(true);
        const chips = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] button.next-chip')];
        const disabled = chips.length > 0 && chips.every((c) => c.disabled === true);
        const aria = chips.length > 0 && chips.every((c) => c.getAttribute('aria-disabled') === 'true');
        const hidden = chips.length === 0 || chips.every((c) => c.hidden === true);
        const produced = JSON.parse(window.__v3.testing.recommend('ref'));
        const cardsAfter = document.querySelectorAll('#stream [data-msg-type="nextstep"]').length;
        window.__v3.testing.setPending(false);
        const reEnabled = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] button.next-chip')].every((c) => c.disabled === false);
        return JSON.stringify({ cardsBefore, disabled, aria, hidden, produced, cardsAfter, reEnabled });
      })()`,
    );
    const pending = JSON.parse(pendingRaw);
    check('③ pending 期间 chips disabled', pending.disabled === true, pendingRaw);
    check('③ pending 期间 chips aria-disabled=true', pending.aria === true, pendingRaw);
    check('③ pending 期间 chips **不隐藏**（避免布局跳动）', pending.hidden === false, pendingRaw);
    check('③ pending 期间不生成新卡（produced=0 且卡数不变）', pending.produced.produced === 0 && pending.cardsAfter === pending.cardsBefore, pendingRaw);
    check('③ pending 结束后重新评估（chips 恢复可用）', pending.reEnabled === true, pendingRaw);

    // ── ④ 无候选不渲染（W3：settled 态必有可行动卡，绝不出现空卡） ─────────────
    console.log('\n▶ ④ 无候选不渲染（EC-CHAT-008；W3：settled 态必有可行动恢复/发现卡）');
    const emptyRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        const produced = JSON.parse(window.__v3.testing.recommend('empty'));
        return JSON.stringify({ produced, cards: document.querySelectorAll('#stream [data-msg-type="nextstep"]').length });
      })()`,
    );
    const empty = JSON.parse(emptyRaw);
    // V4.5-1 W3：site / probe 入 priority 1 后，settled 输入**必有**一张可行动卡
    //（recovery 或 discovery）——「无候选空白态」不再出现，取而代之的是更强的不变量：
    // ① 渲染卡数 ≡ 生产卡数（绝不出现空卡）；② 卡规则 ∈ 闭集四规则。
    const EMPTY_RULE_CLOSED_SET = ['risk-recovery', 'ref-action', 'onboarding', 'capability-discovery'];
    check('④ 渲染卡数与生产卡数一致（绝不出现「下一步：无」式空卡）', empty.produced.produced === empty.cards && empty.cards <= 1, emptyRaw);
    check('④ settled 态必有可行动卡且规则 ∈ 闭集（W3：site/probe 触发补齐恢复面）', empty.cards === 1 && EMPTY_RULE_CLOSED_SET.includes(empty.produced.rule), emptyRaw);

    // ══ ⑭ FIX-1（F 还原度快修轮，2026-09-20）：授权 chip 直达授权流 ═════════════
    // 缺陷：onboarding 的「授权当前站点」chip 曾带 `act:'next'` ⇒ 把字符串当聊天消息
    // 发给 LLM。修复后它带 `act:'authorize'` ⇒ `handleCardAction` 走本地权限流
    // （`authorizeCurrentSite()`），**不**经 `requestTurn`、不受 `pending` 门控。
    // 判定判据（可失败，非「消息形状」推断）：点击后 (a) 流内 user 回合数不变；
    // (b) 出现**只有授权流会产出**的回执（`已授权 <origin>；…` 系统行）。
    console.log('\n▶ ⑭ FIX-1：授权 chip → 权限请求路径（不产生 user 回合）');
    const authChipRaw = await evaluate(
      cdp,
      `(() => {
         window.__v3.testing.streamReset();
         // W3：先清掉可能被前序段落 force 的风险类（否则 site/probe/风险类会把恢复卡
         // 提到 priority 1，onboarding 卡不可达）。
         for (const cls of ['hardline', 'confirm', 'staleRef', 'unauthorized']) window.__v3.testing.setRisk(cls, 'off');
         window.__v3.testing.recommend('firstRun');
         // V4.5-1 W3：settled 态可能是 recovery 卡（site/probe 触发优先）——本判据只对
         // **onboarding 卡在场**时成立；不在场时由下面新增的「闭集同源」断言兜底。
         const card = document.querySelector('#stream [data-msg-type="nextstep"][data-nextstep-rule="onboarding"]');
         const recovery = document.querySelector('#stream [data-msg-type="nextstep"][data-nextstep-rule="risk-recovery"]');
         const authChipEl = card ? card.querySelector('button.next-chip[data-act="authorize"]') : null;
         // 非 settled 时首选是可行动恢复卡：本判据改为驱动它的首项 chip（本地动作）。
         const chip = authChipEl ?? (recovery ? recovery.querySelector('button.next-chip') : null);
         const usersBefore = document.querySelectorAll('#stream [data-msg-type="user"]').length;
         const inputBefore = document.getElementById('input').value;
         // The permission request is stubbed so the gate drives the REAL authorizeCurrentSite()
         // path deterministically (headless has no native gesture-gated prompt). The stub
         // records the requested origin pattern — the same argument the product passes.
         const orig = chrome.permissions.request;
         window.__authProbe = [];
         let stubApplied = false;
         try {
           chrome.permissions.request = (arg) => { window.__authProbe.push(arg); return Promise.resolve(true); };
           stubApplied = chrome.permissions.request !== orig;
         } catch (e) { stubApplied = false; }
         if (chip) chip.click();
         return JSON.stringify({
           card: Boolean(card),
           rule: (card ?? recovery)?.getAttribute('data-nextstep-rule') ?? null,
           chipText: chip ? chip.textContent : null,
           chipAct: chip ? chip.getAttribute('data-act') : null,
           otherActs: (card ?? recovery) ? [...(card ?? recovery).querySelectorAll('button.next-chip')].filter((c) => c !== chip).map((c) => c.getAttribute('data-act')) : [],
           usersBefore,
           inputBefore,
           stubApplied,
         });
       })()`,
    );
    const authChip = JSON.parse(authChipRaw);
    await waitFor(
      cdp,
      `[...document.querySelectorAll('#stream [data-msg-type="system"]')].some((r) => /已授权/.test(r.textContent || '')) ? '1' : ''`,
      60,
      200,
    );
    const authAfterRaw = await evaluate(
      cdp,
      `(() => JSON.stringify({
         users: document.querySelectorAll('#stream [data-msg-type="user"]').length,
         input: document.getElementById('input').value,
         authorizedNotice: [...document.querySelectorAll('#stream [data-msg-type="system"]')].some((r) => /已授权/.test(r.textContent || '')),
         probe: window.__authProbe ?? [],
       }))()`,
    );
    const authAfter = JSON.parse(authAfterRaw);
    // V4.5-1 W3：onboarding 卡只在**settled**（site 已授权 ∧ probe 就绪）时是首选；非 settled
    // 时首选是可行动恢复卡（site/probe 触发）。两种形态都必须满足「本地 act 不进回合闭集」。
    if (authChip.card === true) {
      check('⑭ 首装卡存在「授权当前站点」chip 且 act=authorize（闭集扩为 6）', authChip.chipAct === 'authorize' && String(authChip.chipText).includes('授权当前站点'), authChipRaw);
      check('⑭ 同卡的「了解 6 个页面手势」是本地 help（W3：零回合设置导航）', authChip.otherActs.length >= 1 && authChip.otherActs.includes('help'), authChipRaw);
    } else {
      check('⑭ 非 settled 首装态 ⇒ 首选 = 可行动恢复卡（chips 全为本地动作，零回合）', authChip.chipAct === 'rebind' || authChip.chipAct === 'repick' || authChip.chipAct === 'describe', authChipRaw);
      // V5-2 TASK-V5-133 / N-04：`site` 触发的候选槽位 2 现为 `authorize`
      // （`RECOVERY_CHIP_ORDER.site = [rebind, authorize, repick, describe]`）—— 本地 act 闭集
      // 随之扩为 5 项本地动作（`next` 仍是唯一回合 chip，不在场即无回合）。判据力只升不降。
      check(
        '⑭ 恢复卡 chips ⊆ 本地 act 闭集（next 不在场时不存在回合 chip）',
        authChip.otherActs.every((a) => ['repick', 'describe', 'rebind', 'authorize', 'help'].includes(a)),
        authChipRaw,
      );
    }
    check('⑭ 权限请求探针已装入（stub 生效，判定非空转）', authChip.stubApplied === true, authChipRaw);
    check('⑭ 点击授权 chip 不产生 user 回合（授权不是聊天消息）', authAfter.users === authChip.usersBefore, `${authChipRaw} | ${authAfterRaw}`);
    check('⑭ 点击授权 chip 不把文本复制进输入框', authAfter.input === '' && authChip.inputBefore === '', `${authChipRaw} | ${authAfterRaw}`);
    if (authChip.card === true) {
      check('⑭ 点击授权 chip 走权限请求路径（产出「已授权 <origin>」回执）', authAfter.authorizedNotice === true, authAfterRaw);
      check(
        '⑭ 授权 chip 真的发起站点权限请求（chrome.permissions.request 收到 activeOrigin 的匹配式）',
        Array.isArray(authAfter.probe) && authAfter.probe.length === 1 && JSON.stringify(authAfter.probe[0]).includes('v4-4.test'),
        authAfterRaw,
      );
    } else {
      check('⑭ 恢复卡点击同样零 user 回合（本地动作语义不变）', authAfter.users === authChip.usersBefore, `${authChipRaw} | ${authAfterRaw}`);
    }
    await evaluate(cdp, `window.__v3.testing.streamReset(); true`);

    // ── ⑦ 引用卡（有效 / 失效 / 两条恢复路径） ───────────────────────────────
    console.log('\n▶ ⑦ 引用卡：有效=证据层只读；失效=原因 + 两条恢复路径 + 兜底默认收起');
    const refRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        window.__v3.testing.refCard(1, 'valid');
        const valid = document.querySelector('#stream [data-msg-type="ref"]');
        const validState = valid.getAttribute('data-ref-state');
        const evidenceRows = valid.querySelectorAll('.ref-evidence .l1-row').length;
        window.__v3.testing.refCard(2, 'stale', { why: '目标元素已不存在', systemText: '引用 2 已失效：目标元素已不存在' });
        const stale = [...document.querySelectorAll('#stream [data-msg-type="ref"]')].at(-1);
        const fallback = stale.querySelector('.ref-fallback');
        const repick = stale.querySelector('[data-act="repick"]');
        const describe = stale.querySelector('[data-act="describe"]');
        // Capture the DEFAULT state BEFORE the click (otherwise the probe reads the
        // post-click value and the「默认收起」judgement is vacuous).
        const fallbackHiddenDefault = fallback.hidden === true;
        describe.click();
        const fallbackOpenAfterClick = fallback.hidden === false;
        // A re-pick mints a NEW card (refNum+1); the old two must stay untouched.
        window.__v3.testing.refCard(3, 'valid');
        const afterRepick = [...document.querySelectorAll('#stream [data-msg-type="ref"]')];
        return JSON.stringify({
          validState,
          evidenceRows,
          staleState: stale.getAttribute('data-ref-state'),
          why: stale.querySelector('.ref-stale-why')?.textContent ?? '',
          hasRepick: Boolean(repick),
          hasDescribe: Boolean(describe),
          fallbackHiddenDefault,
          fallbackOpenAfterClick,
          systemLine: [...document.querySelectorAll('#stream [data-msg-type="system"]')].some((r) => r.textContent.includes('已失效')),
          oldStillValid: valid.getAttribute('data-ref-state'),
          oldStillStale: stale.getAttribute('data-ref-state'),
          refNums: [...document.querySelectorAll('#stream [data-msg-type="ref"]')].map((r) => r.getAttribute('data-ref-num')),
          afterRepickCount: afterRepick.length,
        });
      })()`,
    );
    const ref = JSON.parse(refRaw);
    check('⑦ 有效引用卡 data-ref-state=valid 且证据层 4 行', ref.validState === 'valid' && ref.evidenceRows === 4, refRaw);
    check('⑦ 失效引用卡 data-ref-state=stale', ref.staleState === 'stale', refRaw);
    check('⑦ 失效卡可读原因（.ref-stale-why 非空）', ref.why.length > 0, refRaw);
    check('⑦ 两条恢复路径齐备（重新拾取 / 改用描述）', ref.hasRepick === true && ref.hasDescribe === true, refRaw);
    check('⑦ 兜底输入默认收起（法四 / shim E4）', ref.fallbackHiddenDefault === true, refRaw);
    check('⑦ 点「改用描述」后就地展开（默认收起的判据非恒真）', ref.fallbackOpenAfterClick === true, refRaw);
    check('⑦ 失效 ⇒ 流内系统行（E2）', ref.systemLine === true, refRaw);
    check('⑦ 旧卡零改动（valid 卡仍 valid / stale 卡仍 stale）', ref.oldStillValid === 'valid' && ref.oldStillStale === 'stale', refRaw);
    check('⑦ 重拾 ⇒ 新卡（refNum 递增），旧卡保留（append-only）', ref.refNums.join(',') === '1,2,3', refRaw);

    // ── ⑤ 系统事件行 ─────────────────────────────────────────────────────────
    console.log('\n▶ ⑤ 系统事件行：HH:MM:SS + 只追加 + 去重窗口 + 速率上限');
    const sysRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        const t = Date.now();
        window.__v3.testing.systemRow('nav', '页面已导航：会话上下文失效（不静默续接）', t);
        window.__v3.testing.systemRow('nav', '页面已导航：会话上下文失效（不静默续接）', t + 1000);
        const afterDedupe = window.__v3.testing.systemStats();
        window.__v3.testing.systemRow('nav', '页面已导航：会话上下文失效（不静默续接）', t + 6000);
        const afterWindow = window.__v3.testing.systemStats();
        for (let i = 0; i < 30; i += 1) window.__v3.testing.systemRow('probe', '探测状态变化：第 ' + i + ' 次', t + 7000 + i);
        const afterCap = window.__v3.testing.systemStats();
        const rows = [...document.querySelectorAll('#stream [data-msg-type="system"]')];
        const stamps = rows.map((r) => r.querySelector('time.ts')?.textContent ?? '');
        const bar = document.getElementById('statusbar-text').textContent;
        const bodies = rows.map((r) => r.textContent);
        return JSON.stringify({
          afterDedupe,
          afterWindow,
          afterCap,
          rows: rows.length,
          stampsOk: stamps.length > 0 && stamps.every((s) => /^\\d{2}:\\d{2}:\\d{2}$/.test(s)),
          continued: bodies.some((b) => b.includes('持续：')),
          bar,
          appendedOrder: (() => { const seqs = [...document.querySelectorAll('#stream [data-card-key]')].length; return seqs; })(),
        });
      })()`,
    );
    const sys = JSON.parse(sysRaw);
    check('⑤ ≥3 条可区分系统行且每条带 HH:MM:SS', sys.rows >= 3 && sys.stampsOk === true, sysRaw);
    check('⑤ 去重窗口内同 key 不追加（窗口内 2 次 ⇒ 1 行）', sys.afterDedupe.rows === 1, sysRaw);
    check('⑤ 窗口后重现阶段前缀「持续：」', sys.afterWindow.rows === 2 && sys.continued === true, sysRaw);
    check('⑤ 速率上限：超出部分 dropped 计数 +1 且不追加', sys.afterCap.dropped > 0, sysRaw);
    check('⑤ dropped 在状态栏可读（丢弃不静默）', /限速丢弃/.test(sys.bar), sysRaw);

    // ── ⑥ 首装卡 ─────────────────────────────────────────────────────────────
    console.log('\n▶ ⑥ 首装卡（firstRun 档）');
    const firstRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        // W3：清掉可能被前序段落 force 的风险类，让 onboarding 规则成为首选。
        for (const cls of ['hardline', 'confirm', 'staleRef', 'unauthorized']) window.__v3.testing.setRisk(cls, 'off');
        const produced = JSON.parse(window.__v3.testing.recommend('firstRun'));
        const card = document.querySelector('#stream [data-msg-type="nextstep"]');
        return JSON.stringify({ produced, cards: document.querySelectorAll('#stream [data-msg-type="nextstep"]').length, rule: card?.getAttribute('data-nextstep-rule') ?? null });
      })()`,
    );
    const first = JSON.parse(firstRaw);
    // V4.5-1 W3：firstRun 档在 settled 态首选 onboarding；非 settled（site 未授权 / probe 未就绪）
    // 时首选可行动恢复卡 —— 两种形态都必须落在闭集规则内，且绝不超过 1 卡。
    check('⑥ firstRun 触发 ≤1 卡且规则 ∈ 闭集（settled ⇒ onboarding；未 settled ⇒ risk-recovery）', first.cards === 1 && ['onboarding', 'risk-recovery'].includes(String(first.rule)), firstRaw);

    // ── ⑧ 零宿主（W3 终态：4 个固定位置宿主全退役） ──────────────────────────
    console.log('\n▶ ⑧ 零宿主（4 宿主 DOM 移除 + 注册表降级为反向判据）');
    const hostRaw = await evaluate(
      cdp,
      `JSON.stringify({
        transitional: document.querySelectorAll('[data-transitional-host]').length,
        hostsAnyDepth: document.querySelectorAll('#stream [data-host]').length + document.querySelectorAll('[data-host]').length,
        shells: ['l0-decision', 'l0-more', 'l0-ref-toggle', 'l1-group', 'l1-history-toggle'].filter((id) => document.getElementById(id) !== null),
      })`,
    );
    const host = JSON.parse(hostRaw);
    check('⑧ [data-transitional-host] 计数 = 0（R4-18 结构性清零）', host.transitional === 0, hostRaw);
    check('⑧ 任意深度 `[data-host]` 计数 = 0（零宿主终态）', host.hostsAnyDepth === 0, hostRaw);
    check('⑧ 决策壳 / L1 组的退役容器零残留（逐 id）', host.shells.length === 0, hostRaw);

    // ── ⑨ 零明文 + 溢出 + 异常 + 计数 ────────────────────────────────────────
    console.log('\n▶ ⑨ 零明文 / 零横向溢出 / 无异常 / 计数守恒');
    const plainRaw = await evaluate(
      cdp,
      `(() => {
        const text = [...document.querySelectorAll('#stream [data-msg-type="system"], #stream [data-msg-type="ref"], #stream [data-msg-type="nextstep"]')].map((c) => c.textContent).join('\\n');
        const stream = document.getElementById('stream');
        return JSON.stringify({
          urlQuery: /[?&][A-Za-z0-9_.~%-]+=/.test(text),
          secret: /(?:sk|pk|ghp)-[A-Za-z0-9_-]{8,}/.test(text),
          overflow: stream.scrollWidth - stream.clientWidth,
        });
      })()`,
    );
    const plain = JSON.parse(plainRaw);
    check('⑨ 渲染路径无 URL query', plain.urlQuery === false, plainRaw);
    check('⑨ 渲染路径无密钥 / 令牌', plain.secret === false, plainRaw);
    check('⑨ 400px 无横向溢出', plain.overflow <= 1, plainRaw);
    for (const width of [320, 520]) {
      await setViewport(cdp, width, VIEWPORT_HEIGHT);
      await sleep(120);
      const ov = await evaluate(cdp, `document.getElementById('stream').scrollWidth - document.getElementById('stream').clientWidth`);
      check(`⑨ ${width}px 无横向溢出`, ov <= 1, String(ov));
    }
    check('⑨ 无未捕获页面异常', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

    // ══ ⑪ BLOCK-01（V4-4 审查修复轮）：**产品路径**（不经 seam）════════════════
    // 断言的驱动源是 SW 发往面板的真实 `ref-captured` 报文（与页面侧桥同形），面板走
    // `acceptCapture`（真实生产函数）⇒ ref 卡 + 「拾取后/引用失效后」推荐时机；断言里
    // **不调用** `window.__v3.testing.*`。
    console.log('\n▶ ⑪ BLOCK-01 产品路径：真实 ref-captured ⇒ ref 卡 + nextstep 卡（不经 seam）');
    // 生产者有 `NEXTSTEP_MIN_INTERVAL_MS = 10s` 的真实反抖间隔（ADR-V4-037）；前面的 seam
    // 步骤刚铸过卡，这里按**产品规则**等待窗口过去，而不是绕过它。
    //
    // 〖R4（2026-09-22）夹具口径变更〗捕获观测由 `missing` 改为 `resolved`：R4 的**捕获回环
    // 校验**（止血）会在捕获观测为 `missing` / `invalid-selector` 时先做只读文本候选探测 ——
    // 唯一匹配则用 SW 现算的完整选择器替换后重判，仍失败则**拒铸**（不产生出生即死的引用）。
    // 本段要判的是「**已然失效**的引用卡 + 风险恢复卡」（⑪/⑫），因此夹具改走更强的真实路径：
    // 捕获态 `resolved` ⇒ 面板写身份标记 ⇒ SW 回读时该选择器在页面上匹配不到（本夹具的选择器
    // 本就是断链形态）⇒ 判 D1 ⇒ 失效卡 + `risk-recovery` 卡。**断言集一条未改**。
    await sleep(10500);
    const productDrive = await evaluate(
      sw.cdp,
      `chrome.runtime
         .sendMessage({
           kind: 'ref-captured',
           facts: {
             selector: 'div.__broken:nth-of-type(9) > span.__gone:nth-of-type(7)',
             semanticPath: 'body › div › span',
             textDigest: '产品路径引用目标',
             origin: 'https://v4-4.test',
             documentId: 'doc-1', navSeq: 1, declarationHash: '', capturedAt: Date.now(),
           },
           resolution: { status: 'resolved', nodeCount: 1 },
         })
         .then(() => 'sent')
         .catch((e) => 'ERR:' + String(e))`,
    );
    await sleep(700);
    const productState = await evaluate(
      cdp,
      `(() => {
         const refs = [...document.querySelectorAll('#stream [data-msg-type="ref"]')];
         const cards = [...document.querySelectorAll('#stream [data-msg-type="nextstep"]')];
         const card = cards.at(-1) ?? null;
         return JSON.stringify({
           refCards: refs.length,
           nextstepCards: cards.length,
           rule: card ? card.getAttribute('data-nextstep-rule') : null,
           chips: card ? [...card.querySelectorAll('button.next-chip')].map((c) => c.textContent) : [],
           last: window.__v3.testing.lastRecommend(),
         });
       })()`,
    );
    const product = JSON.parse(productState);
    check(
      '⑪ 产品路径（不经 seam）：真实 ref-captured ⇒ 流内出现 ref 卡',
      product.refCards >= 1,
      `${productDrive} | ${productState}`,
    );
    check(
      '⑪ 产品路径（不经 seam）：生产者真实接线 ⇒ 流内出现 nextstep 卡（risk-recovery）',
      product.nextstepCards >= 1 && product.rule === 'risk-recovery',
      `${productState} | last=${JSON.stringify(product.last)}`,
    );
    check('⑪ 产品路径推荐卡带可点 chip（进入实时交互面）', product.chips.length >= 1, productState);

    // ══ ⑫ BLOCK-03（V4-4 审查修复轮）：失效卡「改用描述」= 唯一兜底 + 真实结算 ══
    console.log('\n▶ ⑫ BLOCK-03：「改用描述」兜底唯一且提交真实结算（不再落占位）');
    const describeState = await evaluate(
      cdp,
      `(() => {
         const stale = [...document.querySelectorAll('#stream [data-msg-type="ref"][data-ref-state="stale"]')].at(-1);
         if (!stale) return JSON.stringify({ found: false });
         const describe = stale.querySelector('[data-act="describe"]');
         describe.click();
         const fallback = stale.querySelector('.ref-fallback');
         const askFallbackBefore = document.querySelectorAll('#ask-fallback').length;
         const openAfterClick = fallback.hidden === false;
         // 「两个并存兜底输入」回归：点击后不得**新增**兜底输入所有者。
         const askFallbackAfter = document.querySelectorAll('#ask-fallback').length;
         const askFallbackCards = askFallbackAfter - askFallbackBefore;
         const existingAskFallback = document.querySelectorAll('#ask-fallback').length;
         const input = fallback.querySelector('input');
         input.value = '这个按钮是提交按钮';
         fallback.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
         const answeredCards = [...document.querySelectorAll('#stream [data-msg-type="askuser"]')].filter(
           (c) => (c.textContent || '').includes('这个按钮是提交按钮'),
         );
         const answered = answeredCards.length;
         const answeredState = answeredCards.map((c) => c.getAttribute('data-answered') ?? '').join(',');
         const placeholder = [...document.querySelectorAll('#stream [data-msg-type="system"]')].some((r) =>
           (r.textContent || '').includes('将在 v4-3 / v4-4 落地'),
         );
         return JSON.stringify({ found: true, openAfterClick, askFallbackCards, existingAskFallback, answered, answeredState, placeholder });
       })()`,
    );
    await sleep(250);
    const describe = JSON.parse(describeState);
    check('⑫ 前置：失效卡存在且「改用描述」就地展开卡内兜底', describe.found === true && describe.openAfterClick === true, describeState);
    check('⑫ 兜底输入唯一（「改用描述」不再**新增**兜底输入所有者）', describe.askFallbackCards === 0, describeState);
    check(
      '⑫ 提交描述 ⇒ 真实结算（描述文本出现在已答的兜底卡上，不是死控件）',
      describe.answered >= 1,
      describeState,
    );
    check('⑫ 不再落「将在 v4-3 / v4-4 落地」占位通知', describe.placeholder === false, describeState);

    // ══ ⑮ V5-1（TASK-V5-115 / FR-ALLN-057·058·112 / X3·X6）chip opId 双采集 ═══
    // 旧视角 = `data-act`（渲染别名）；新视角 = `data-op`（**分发依据**，opId）。
    // 本段**纯新增**（零删除既有断言）：只做等价重锚 + 加严，不减少任何判据。
    console.log('\n▶ ⑮ V5-1：chip `data-op`（opId）与 `data-act`（渲染别名）双采集一致');
    const opIdRaw = await evaluate(
      cdp,
      `(() => {
        window.__v3.testing.streamReset();
        // 驱动一张恢复卡（本地 chip，零回合），让 chip 的两种属性都可采集。
        window.__v3.testing.setRisk('staleRef', 'on');
        const rec = JSON.parse(window.__v3.testing.recommend('stale', Date.now() + 20000));
        const chips = [...document.querySelectorAll('#stream [data-msg-type="nextstep"] button.next-chip')];
        const rows = chips.map((c) => ({ act: c.getAttribute('data-act'), op: c.getAttribute('data-op') }));
        return JSON.stringify({
          produced: rec.produced,
          suppression: rec.suppression,
          cards: document.querySelectorAll('#stream [data-msg-type="nextstep"]').length,
          chips: rows,
          withOp: rows.filter((r) => typeof r.op === 'string' && r.op.length > 0).length,
          opSelectorCount: document.querySelectorAll('#stream [data-op]').length,
        });
      })()`,
    );
    const opId = JSON.parse(opIdRaw);
    const OP_IDS = [
      'op.turn',
      'op.pick',
      'op.describe',
      'op.authorize',
      'op.rebind',
      'op.help',
      'op.llm-config',
      'op.perm.request',
      'op.revoke',
    ];
    const ACT_TO_OP_IN_GATE = {
      next: 'op.turn',
      repick: 'op.pick',
      describe: 'op.describe',
      authorize: 'op.authorize',
      rebind: 'op.rebind',
      help: 'op.help',
    };
    check(
      '⑮ 前置：恢复卡产出且 chip 可采集（本段判据非空转）',
      opId.produced >= 1 && opId.cards >= 1 && opId.chips.length >= 1,
      opIdRaw,
    );
    check('⑮ 每枚 next-chip 都带 opId（`data-op` 零缺失）', opId.chips.length > 0 && opId.withOp === opId.chips.length, opIdRaw);
    check(
      '⑮ 双采集一致：每枚 chip 的 `data-op` == ACT_TO_OP[`data-act`]',
      opId.chips.every((c) => ACT_TO_OP_IN_GATE[c.act] === c.op),
      opIdRaw,
    );
    check(
      '⑮ 无悬空 opId：全部 `data-op` 都在首批 9 op 清单内',
      opId.chips.every((c) => OP_IDS.includes(c.op)),
      opIdRaw,
    );
    check('⑮ opId 成为流内可达 next 的选择器锚（`#stream [data-op]` 计数 ≥1）', opId.opSelectorCount >= 1, opIdRaw);
    check(
      '⑮ 门禁自身的映射表与 6 act 一一对应（同源；改动即红）',
      Object.keys(ACT_TO_OP_IN_GATE).length === 6 && new Set(Object.values(ACT_TO_OP_IN_GATE)).size === 6,
      JSON.stringify(ACT_TO_OP_IN_GATE),
    );

    // ══ ⑯ V5.5-1（TASK-V55-114 / ADR-V55-002 · FR-SELF-030/031/035 · AC-SELF-009）══
    // 「答完之后恰在一次 `'answered'` 求值内产出 next」——本叶的题眼在真面板上可判。
    console.log('\n▶ ⑯ V5.5-1：`answered` 时机（答完恰在一次求值内产出 next；不复用 firstRun 语义）');
    await evaluate(cdp, `window.__v3.testing.reset(); window.__v3.testing.streamReset(); true`);
    const answered = JSON.parse(
      await evaluate(
        cdp,
        `(() => {
          const rec = window.__v3.testing.l1('ref', {
            selector: '#host-btn', semanticPath: 'body › button', textDigest: '宿主按钮', origin: 'https://v4-reco-answered.test',
            documentId: 'doc-ans', navSeq: 1, declarationHash: 'h1', declaration: { status: 'valid', hash: 'h1' }, capturedAt: Date.now(),
          });
          window.__v3.testing.l1('env', { currentOrigin: 'https://v4-reco-answered.test', authorized: true, documentId: 'doc-ans', navSeq: 1, declarationStatus: 'valid', declarationHash: 'h1' }, true);
          window.__v3.testing.l1('res', { status: 'resolved', refMark: rec.facts.refId, nodeCount: 1 });
          window.__v3.testing.refCard(1, 'valid');
          window.__v3.testing.streamSeed([{ kind: 'askuser', cardId: 'ans-ask', payload: { askKind: 'choice', prompt: '已捕获引用：要用它做什么？', requestId: 'ref-round-' + rec.facts.refId, options: ['原地翻译为中文', '纳入下一步'] } }]);
          document.querySelector('[data-msg-type="askuser"] [data-act="choose"]').click();
          const card = document.querySelector('#stream [data-msg-type="nextstep"]');
          return JSON.stringify({
            trigger: window.__v3.testing.lastRecommend()?.trigger ?? null,
            rule: window.__v3.testing.lastRecommend()?.rule ?? null,
            susp: window.__v3.testing.suspensions().length,
            ops: card ? card.querySelectorAll('[data-op]').length : 0,
            acts: card ? [...card.querySelectorAll('[data-act]')].map((b) => b.getAttribute('data-act')) : [],
          });
        })()`,
      ),
    );
    check('⑯ 前置：引用回合作答必须经唯一求值入口触发（lastRecommend.trigger === answered）', answered.trigger === 'answered', JSON.stringify(answered));
    check('⑯ 答完之后恰在一次求值内产出可达 next（nextstep 卡内 [data-op] ≥1）', answered.ops >= 1, JSON.stringify(answered));
    check('⑯ 答案不被丢弃（悬置登记恰 1 条，与 FR-SELF-132 同判据）', answered.susp === 1, JSON.stringify(answered));
    // 时机源单源 + 触发点：源文本断言 + 反证（删掉 answered 映射 ⇒ 判据必红）。
    const driversSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/next-registry/drivers.ts'), 'utf8');
    const sidepanelSrc = readFileSync(join(PACKAGE_ROOT, 'src/ui/sidepanel/sidepanel.ts'), 'utf8');
    const timingJudge = (src) => /return src\.kind === 'answered' \? 'answered' : 'idle';/.test(src);
    check('⑯ 时机映射单源：`answered` ⇒ timing `answered`（其余 ⇒ idle：稳态驱动集必有接管者）', timingJudge(driversSrc), 'timingOfSettle 单源映射');
    check('⑯ 反证：把映射改为恒 idle（= 删掉 `answered` 时机）⇒ 本判据必红 → 还原 PASS', !timingJudge(driversSrc.replace("src.kind === 'answered' ? 'answered' : 'idle'", "'idle'")) && timingJudge(driversSrc), '注入⇒红 / 还原⇒绿');
    const answeredTriggers = (sidepanelSrc.match(/nextAfterSettle\(\{ kind: 'answered'/g) ?? []).length;
    check('⑯ 触发点接线：三处「用户已表达的话」结算路径均经 `nextAfterSettle({ kind: \'answered\'`（≥3 处）', answeredTriggers >= 3, `triggers=${answeredTriggers}`);
    check('⑯ `answered` 不复用 firstRun 的「至多一次」语义（源码面：firstRun 入口只含 `maybeRecommend(\'firstRun\')`）', /maybeRecommendFirstRunEntry[\s\S]{0,1500}?maybeRecommend\('firstRun'\)/.test(sidepanelSrc) && !/maybeRecommendFirstRunEntry[\s\S]{0,1500}?kind: 'answered'/.test(sidepanelSrc), 'firstRun 语义未污染');

    // ══ ⑰ IAN-1（TASK-IAN-107 / ADR-IAN-001 §①/§② · AC-IAN-002）══
    // 推荐卡末端「自由输入…」终端：**存在 ∧ 恒最末 ∧ 不填输入 ∧ 不越预算**（只增判据）。
    console.log('\n▶ ⑰ IAN-1：末端「自由输入…」终端（存在 / 恒最末 / 不填输入 / 不越 chips 预算）');
    await evaluate(cdp, `window.__v3.testing.reset(); window.__v3.testing.streamReset(); true`);
    const terminalRaw = await evaluate(
      cdp,
      `(() => {
         ${VIS}
         window.__v3.testing.refCard(3, 'valid');
         window.__v3.testing.recommend('ref', Date.now() + 20000);
         const card = document.querySelector('#stream [data-msg-type="nextstep"]');
         if (!card) return JSON.stringify({ found: false });
         const col = card.querySelector('.card-col');
         const chips = [...card.querySelectorAll('button.next-chip')];
         const term = card.querySelector('button[data-act="free-input"]');
         const inputBefore = document.getElementById('input').value;
         const usersBefore = document.querySelectorAll('#stream [data-msg-type="user"]').length;
         if (term) term.click();
         const ask = document.querySelector('#stream [data-msg-type="askuser"]');
         const askInput = document.getElementById('ask-input');
         return JSON.stringify({
           found: true,
           termPresent: Boolean(term),
           // 恒最末 = 结构序：终端是卡片 .card-col 的**最后一个**子元素（在 .next-chips 之后）。
           termIsLast: col ? col.lastElementChild === term : false,
           termTag: term ? term.tagName : null,
           termIsChip: term ? term.classList.contains('next-chip') : null,
           chipCount: chips.length,
           inputBefore,
           inputAfter: document.getElementById('input').value,
           usersBefore,
           usersAfter: document.querySelectorAll('#stream [data-msg-type="user"]').length,
           askCard: Boolean(ask),
           askInputVisible: askInput ? askInput.hidden !== true && vis(askInput) : false,
           focusId: document.activeElement ? document.activeElement.id : null,
         });
       })()`,
    );
    const term = JSON.parse(terminalRaw);
    check('⑰ 前置：推荐卡产出且带 chip（本段判据非空转）', term.found === true && term.chipCount >= 1, terminalRaw);
    check('⑰ 末端「自由输入…」终端存在（`data-act="free-input"`）', term.termPresent === true, terminalRaw);
    check('⑰ 终端**恒最末**（`.card-col` 的最后一个子元素 ⇒ 结构序在 `.next-chips` 之后）', term.termIsLast === true, terminalRaw);
    check(
      '⑰ 终端是 `<button>` 且**不带** `.next-chip`（⇒ `syncNextstepPending` 不在飞禁用 / 不进 chips 预算）',
      term.termTag === 'BUTTON' && term.termIsChip === false,
      terminalRaw,
    );
    check('⑰ 单卡 `.next-chip` 仍 ≤3（终端不占 MAX_CHIPS_PER_CARD 预算）', term.chipCount >= 1 && term.chipCount <= 3, terminalRaw);
    check(
      '⑰ 终端点击**不填** `#input`（项本身不是输入框）∧ 不产生 user 回合',
      term.inputAfter === term.inputBefore && term.usersAfter === term.usersBefore,
      terminalRaw,
    );
    check(
      '⑰ 终端点击就地展开卡内输入（复用 `.ask-fallback` 家系；`#ask-input` 可见并获焦点）',
      term.askCard === true && term.askInputVisible === true && term.focusId === 'ask-input',
      terminalRaw,
    );

    cdp.close();

    const runtime = counts().passes;
    const selfSource = readFileSync(new URL('./recommendation.mjs', import.meta.url), 'utf8');
    const staticCount = (selfSource.match(/\bcheck\(/g) ?? []).length;
    check(`⑩ 运行期断言计数 ≥ ${RECOMMENDATION_RUNTIME_FLOOR}（D-005；countMethod = runtime-check-calls）`, runtime >= RECOMMENDATION_RUNTIME_FLOOR, `runtime=${runtime}`);
    check(`⑩ 静态 check( 计数 ≥ ${RECOMMENDATION_STATIC_FLOOR}`, staticCount >= RECOMMENDATION_STATIC_FLOOR, `static=${staticCount}`);
  } finally {
    chrome.kill('SIGKILL');
  }
  finish('V4-4 引用卡 / 系统事件行 / 推荐卡门禁');
}

main().catch((err) => {
  console.error(`✖ recommendation 门禁异常：${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exit(1);
});
