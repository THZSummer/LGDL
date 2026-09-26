/**
 * V5.5-1 **TASK-V55-120** (ADR-V55-005 §1/§2 · FR-SELF-130/131/132/133 · AC-SELF-001 ·
 * R-SELF-908 / R-V55-111) — the **S0 自驱链共享样本 + 驱动 seam**.
 *
 * ── 为什么是「纯 `.mjs` + 注入式依赖」（沿用 `s2-chain.mjs` 的先例形态）──────────
 *
 * S0（真机 22:49 序列：绑定 → 拾取引用 → ask 已答「原地翻译为中文」→ **彻底静默**）是本
 * Feature 的验收锚，地位与 v5 之 S2 等价。它在**两处**被判定：
 *
 *   · node 判官 `test/s0-self-driven-chain.test.ts`（TASK-V55-121）；
 *   · Chromium 判官 `test/ui/s0-self-driven.mjs`（TASK-V55-122，真面板）。
 *
 * 两面**共用同一份样本**（禁第二份样本）：链的 id / 顺序 / 答案文本 / A·B 分支分类 /
 * 三条总判据都在本文件里，生产能力（候选 / op 表 / 驱动者声明 / 悬置登记 / 答案判据）由
 * 调用方**注入**。零 DOM、零 chrome、零 `import` —— 浏览器门禁与编译后的 node 门禁都能引入。
 *
 * ── 三条总判据（AC-SELF-001 逐字；窗口定义见 {@link s0SilentWindow}）────────────
 *
 *   ① **答案不被丢弃** = ⑤ 的答案文本作为「悬置任务输入 ∨ 回合输入」**可判命中**，
 *      且 `commandSends` 递增**不足以**满足（判据只认输入，不认计数）；
 *   ② **静默窗口 = 0** = ⑤ 之后任一可判拍都存在「驱动者归因 ∨ 终态事实 ∨ 可达 next」；
 *   ③ **死端 = 0** = 每拍的 `nextOf` 非空且无悬空 chip。
 *
 * @module test/ui/fixtures/s0-chain
 */

/** The 10 beats of the S0 chain, in order (id + human label). 顺序即真机序列。 */
export const S0_CHAIN = Object.freeze([
  { id: 'bind', label: '① 绑定当前标签页' },
  { id: 'probe', label: '② 自动探测（声明 / 稳态）' },
  { id: 'pick-ref', label: '③ 拾取引用（① 出生有效，validCount ≥ 1）' },
  { id: 'ask-registered', label: '④ ask 卡登记（openAsks ∋ ref-round-<refId>）' },
  { id: 'answered', label: '⑤ 用户作答「原地翻译为中文」且卡已结算' },
  { id: 'drive-produced', label: '⑥ 答案产生驱动（★ 本 Feature 的题眼）' },
  { id: 'branch', label: '⑦ 分支：A 已配置 LLM / B 未配置 LLM' },
  { id: 'auto-round', label: '⑧ 分支 A：答案可作回合输入（机制侧，不含无按键端到端）' },
  { id: 'onboard-resume', label: '⑨ 分支 B：未配置被识别为终态 + 有驱动者（引导内容属 v55-2）' },
  { id: 'terminal', label: '⑩ 终局（回合结束）：静默窗口 = 0 ∧ 死端 = 0' },
]);

/** ⑤ 的用户原话（真机 22:49 逐字）。答案文本是「答案不被丢弃」判据的被判对象。 */
export const S0_ANSWER = '原地翻译为中文';
/** ③ 拾取的引用 id。 */
export const S0_REF_ID = 'ref_1';
/** ④ 登记的引用回合 ask 的 requestId（`REF_ROUND_PREFIX` + refId）。 */
export const S0_ASK_REQUEST_ID = `ref-round-${S0_REF_ID}`;
/** ⑦ 的两条分支（唯一分流依据 = 配置探测判据；本叶只做 A 机制侧 / B 识别侧）。 */
export const S0_BRANCHES = Object.freeze(['A-configured', 'B-unconfigured']);
/** B 分支的阻塞事实（`llm.unconfigured` 的派生风险 id，与 `providers.ts#LLM_BLOCKED_RISK` 同值）。 */
export const S0_LLM_BLOCKED_RISK = 'llmBlocked';

/** 7-源 ctx（与 `recommend.ts#RecommendInput` 同形；`over` 合并 ⇒ 单拍不必重述 7 源）。 */
export function s0Ctx(over = {}) {
  return {
    ref: { validCount: 0, staleCount: 0 },
    session: { openAsks: 0, busy: false },
    site: { authorized: false, trust: 'untrusted' },
    catalog: { toolCount: 0, subcommandCount: 0 },
    probe: { phase: 'idle', steady: false },
    risks: [],
    onboarding: { firstRun: false, pendingSteps: [] },
    now: 1_000_000,
    ...over,
  };
}

/** 已授权 + 探测稳态的「拾取后」基底 ctx。 */
function pickedCtx(over = {}) {
  return s0Ctx({
    ref: { validCount: 1, staleCount: 0, latestRefNum: 1 },
    site: { authorized: true, trust: 'trusted' },
    probe: { phase: 'ready', steady: true },
    ...over,
  });
}

/**
 * 逐拍样本（**纯数据**）。`settled` = 已过 ⑤（静默窗口判据的适用范围）；
 * `source` = 该拍的「已表达的话」来源键（终态事实的判定输入）；`branch` ∈ S0_BRANCHES。
 */
export function s0Beats() {
  return [
    { id: 'bind', ctx: s0Ctx({ site: { authorized: false, trust: 'untrusted' } }), settled: false, source: null, branch: null, expectRule: 'risk-recovery' },
    { id: 'probe', ctx: s0Ctx({ site: { authorized: false, trust: 'untrusted' }, probe: { phase: 'probing', steady: false } }), settled: false, source: null, branch: null, expectRule: 'risk-recovery' },
    { id: 'pick-ref', ctx: pickedCtx(), settled: false, source: null, branch: null, expectRule: 'ref-action' },
    { id: 'ask-registered', ctx: pickedCtx({ session: { openAsks: 1, busy: false } }), settled: false, source: null, branch: null, expectRule: 'capability-discovery' },
    { id: 'answered', ctx: pickedCtx(), settled: true, source: 'ref', branch: 'A-configured', expectRule: 'ref-action' },
    { id: 'drive-produced', ctx: pickedCtx(), settled: true, source: 'ref', branch: 'A-configured', expectRule: 'ref-action' },
    { id: 'branch', ctx: pickedCtx(), settled: true, source: 'ref', branch: 'A-configured', expectRule: 'ref-action' },
    { id: 'auto-round', ctx: pickedCtx(), settled: true, source: 'ref', branch: 'A-configured', expectRule: 'ref-action' },
    {
      id: 'onboard-resume',
      ctx: pickedCtx({ ref: { validCount: 0, staleCount: 0 }, risks: [S0_LLM_BLOCKED_RISK] }),
      settled: true,
      source: 'ref',
      branch: 'B-unconfigured',
      expectRule: 'risk-recovery',
      expectOp: 'op.llm-config',
    },
    { id: 'terminal', ctx: pickedCtx(), settled: true, source: 'ref', branch: 'A-configured', expectRule: 'ref-action' },
  ];
}

/** 引用回合的 requestId（与 `REF_ROUND_PREFIX` 单源同形）。 */
export function s0AskId(refId = S0_REF_ID) {
  return `ref-round-${refId}`;
}

/**
 * chip 的权威 opId：`act` 是义务表内的 opId ⇒ op-direct（`op.llm-config` 等）；
 * 否则查 `act → opId` 表。**与 `s2-chain.mjs#chipOpId` 同口径**（两面共用一份判据）。
 */
export function chipOpId(deps, act) {
  if (deps.opIds.includes(act)) return act;
  return deps.actToOp[act] ?? null;
}

/**
 * **静默窗口判据**（FR-SELF-133，S0 判官侧的单源实现）。
 *
 * 窗口 = 「既无驱动者归因、又无终态事实、又无可达 next」的区间；`settled=false` ⇒ `'n/a'`
 * （既非 PASS 也非 FAIL，**不与 PASS 混池**）。node 判官会把本函数与产物
 * `drivers.ts#silentWindowReading` 的输出**逐组合比对**（等价性机核，不是第二份定义）。
 */
export function s0SilentWindow(f) {
  if (!f || f.settled !== true) return 'n/a';
  const hasDriver = typeof f.driverAttribution === 'string' && f.driverAttribution.length > 0;
  const hasTerminal = typeof f.terminalFact === 'string' && f.terminalFact.length > 0;
  const hasNext = typeof f.next === 'string' && f.next.length > 0;
  return hasDriver || hasTerminal || hasNext ? 'ok' : 'silent';
}

/** Judge one beat through the injected capabilities (the ONE beat judge, both faces). */
export function judgeBeat(deps, beat) {
  const cards = deps.candidates(beat.ctx) || [];
  const card = cards[0];
  const rows = (card ? card.chips : []).map((c) => ({ text: c.text, act: c.act, opId: chipOpId(deps, c.act) }));
  const unreachable = rows.filter((r) => !r.opId);
  const next = rows.find((r) => r.opId)?.opId ?? null;
  const silent = (deps.silentWindow || s0SilentWindow)({
    settled: beat.settled === true,
    driverAttribution: beat.settled === true ? ((deps.driversForTiming('answered') || [])[0] ?? null) : null,
    terminalFact: beat.settled === true && beat.source ? (deps.terminalOfSource(beat.source) ?? null) : null,
    next,
  });
  return {
    id: beat.id,
    rule: card ? card.rule : null,
    chips: rows,
    unreachable: unreachable.map((r) => r.text),
    next,
    deadEnd: next === null || unreachable.length > 0,
    silent,
  };
}

/**
 * The three total judgements over a set of per-beat readings (the ONE aggregator, both faces).
 *
 * `readings` 是 `judgeBeat` 的输出（node 面）**或**同一形状的 DOM 读数（Chromium 面）：
 * 两面独立计数，但**计数口径来自同一处**（禁互相掩盖，R-V55-111）。
 */
export function aggregateChain(readings) {
  const beats = readings.map((r) => ({ id: r.id, ok: r.deadEnd === false, silent: r.silent, next: r.next ?? null, rule: r.rule ?? null }));
  return {
    perBeat: beats,
    // 静默窗口只统计 `'ok' | 'silent'` 两态（`'n/a'` 单独计数，禁与 PASS 混池）。
    silentWindows: beats.filter((b) => b.silent === 'silent').length,
    silentOk: beats.filter((b) => b.silent === 'ok').length,
    silentNa: beats.filter((b) => b.silent === 'n/a').length,
    deadEnds: beats.filter((b) => b.ok === false).length,
  };
}

/**
 * The full chain judge: `{ readings, silentWindows, deadEnds, answerNotDropped, answerCaliber }`.
 *
 * `deps`（注入面）= `{ candidates, opIds, actToOp, driversForTiming, terminalOfSource,
 * suspensions, turnInput?, answerNotDropped, silentWindow? }`。
 *
 * `answerNotDropped` 由注入的判据给出（产物 `drivers.ts#answerNotDropped` 单源），因此
 * 「`sends` 递增不足以满足」这件事是**判据本体**，不是一句注释。
 */
export function judgeChain(deps, beats = s0Beats()) {
  const readings = beats.map((b) => judgeBeat(deps, b));
  const agg = aggregateChain(readings);
  const suspensions = typeof deps.suspensions === 'function' ? deps.suspensions() : [];
  return {
    readings,
    ...agg,
    answerNotDropped: deps.answerNotDropped(suspensions, S0_ANSWER, deps.turnInput) === true,
  };
}

/** The `next`-act chip predicate（渲染成 `[data-act="next"][data-op]` 的那一枚）。 */
export function s0NextChipsOf(readings) {
  const out = [];
  for (const r of readings) for (const c of r.chips) if (c.act === 'next' && c.opId) out.push({ id: r.id, opId: c.opId });
  return out;
}

/** 每拍的真实驱动者归因（`'answered'` 时机）——静默窗口的「有归因」证据面。 */
export function s0DriverAttribution(deps) {
  return (deps.driversForTiming('answered') || []).slice();
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-2 **TASK-V55-214**（ADR-V55-005 §3 · FR-SELF-131 · AC-SELF-001 · R-V55-111）——
 * **分支 B 必判项**：未配置 ⇒ 引导 4 步 ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接** ⇒ 留痕。
 *
 * 样本与判据都在本文件（node 面 + Chromium 面**共用同一份**，禁第二份样本）；
 * 「删自动续接 ⇒ 必 FAIL」是判据本体（`s0BranchBProblems`），不是一句注释。
 *
 * 引导 4 步的 id 与产物 `onboarding-flow.ts#ONBOARD_STEP_IDS` 单源对齐（由 node 面机核）；
 * 三段 params 的 kind 与 `ops.ts#OP_PARAM_SEQUENCE['op.llm-config']` 单源对齐。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 分支 B 的引导 4 步（逐序；`masked` 标出「掩码卡」所在步）。 */
export const S0_B_STEPS = Object.freeze([
  { id: 'detect', carrier: 'system-row', evidence: 'llm.unconfigured' },
  { id: 'guide', carrier: 'nextstep-card', evidence: 'op.llm-config' },
  { id: 'collect', carrier: 'ask-cards', evidence: 'op.llm-config:params', masked: true },
  { id: 'complete', carrier: 'system-row + resume', evidence: 'op.llm-config:receipt(ok=true)' },
]);

/** ④ `collect` 的既有三段 params（`choice → text → secret`；第二段序列 ⇒ FAIL）。 */
export const S0_B_PARAM_KINDS = Object.freeze(['choice', 'text', 'secret']);

/** ⑤ 自动续接的留痕标记（Chromium 面用它认「续接后回合」那一行事实）。 */
export const S0_B_RESUME_MARK = 'onboard:resume-after-config';

/**
 * **分支 B 的必判项判据**（纯函数，双面共用）。
 *
 * `reading` = `{ steps, paramKinds, masked, completed, autoResumed, resumedInput, trace }`。
 * **删自动续接（`autoResumed !== true`）⇒ 必 FAIL** —— 复现「配完还要重说一遍」。
 */
export function s0BranchBProblems(reading = {}) {
  const problems = [];
  const steps = (reading.steps ?? []).map((s) => (typeof s === 'string' ? s : s.id));
  const expected = S0_B_STEPS.map((s) => s.id);
  if (steps.join('|') !== expected.join('|')) {
    problems.push(`分支 B 引导必须逐序为 ${expected.join('|')}（实测 ${steps.join('|') || '<空>'}）`);
  }
  const kinds = reading.paramKinds ?? [];
  if (kinds.join('|') !== S0_B_PARAM_KINDS.join('|')) {
    problems.push(`掩码卡必须走既有三段 params（${S0_B_PARAM_KINDS.join('|')}），实测 ${kinds.join('|') || '<空>'}`);
  }
  if (reading.masked !== true) problems.push('掩码卡判据缺失（`secret` 步的输入必须是掩码卡，零明文）');
  if (reading.completed !== true) problems.push('配置必须真的完成（成功回执）——否则续接无从谈起');
  if (reading.autoResumed !== true) {
    problems.push('**删自动续接 ⇒ FAIL**：配置完成必须自动续接悬置任务（复现「配完还要重说一遍」）');
  }
  if (reading.resumedInput !== S0_ANSWER) {
    problems.push(`续接输入必须逐字为用户原话「${S0_ANSWER}」（实测 ${String(reading.resumedInput)}）`);
  }
  if (reading.trace !== true) problems.push('续接后必须留痕（流内出现续接事实行 ∧ 回合输入）');
  return problems;
}

/**
 * ⑦ 的 A/B 两分支**独立读数**（禁互相掩盖，R-V55-111）：两面用**同一处**计数口径。
 */
export function s0BranchBeats(beats = s0Beats()) {
  return {
    a: beats.filter((b) => b.branch === 'A-configured'),
    b: beats.filter((b) => b.branch === 'B-unconfigured'),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-3 **TASK-V55-316 / 317**（ADR-V55-005 §3 · ADR-V55-009 §1/§3 · FR-SELF-060 /
 * 064 / 070 / 090~094 · **AC-SELF-001/008** · R-V55-111）
 *
 * **分支 A 端到端（零按键自动成回合）+ 护栏在链路上真实可判** 的样本与判据。
 *
 * 与 `s0BranchBProblems` 对称：样本 + 判据都在本文件，node 面与 Chromium 面**共用同一份**
 * （禁第二份样本、禁第二份判据）。区别只在读数来源：node 面注入**产物模块**（`pressCandidate` /
 * `createProactivityGuard` / `bindPanelOps`），Chromium 面注入**真面板读数**（DOM + 消息探针）。
 *
 * ── 三条判据的力（删任一条 ⇒ 必 FAIL，不是注释）────────────────────────────
 *
 *   · **零按键**：`keypresses === 0`（用户作答之后**不再敲任何键**）——删掉 `pressCandidate`
 *     那一次按下（`presses !== 1`）⇒ 必红（复现 S0-A 静默）；
 *   · **经既有槽**：`slot === 'op.turn'` —— AI 不得自造第二回合入口（`requestTurn(` 仍恰 2）；
 *   · **护栏生效**：`guardReasons` 必须覆盖 `S0_A_ON_CHAIN_REASONS`（**频次 / 链深 / 预算**
 *     三项在链路上真实可判）+ `suppressedReadable`（抑制走**可读留痕**，不是静默 return）。
 *     删掉护栏缝 ⇒ 超频不抑制 ⇒ 必红（复现"越限无感"）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 分支 A 自动成回合**唯一**允许的槽（既有 op，`auto` 档；AI 不得自造第二入口）。 */
export const S0_A_SLOT = 'op.turn';

/** 护栏原因的**闭集**（`guard.ts#GuardBlockReason` 单源同形；本样本不新增第二份词汇）。 */
export const S0_A_GUARD_REASONS = Object.freeze([
  'disabled',
  'frequency',
  'same-cause',
  'silence',
  'cooldown',
  'chain-depth',
  'budget',
]);

/**
 * 必须在**链路上**真实可判的三项护栏（用户可感的越限面：打扰频次 / 自触发环 / 成本预算）。
 * 其余四项（关断 / 同因 / 静默 / 冷却）由 `S0_A_GUARD_REASONS` 覆盖、按面分别举证。
 */
export const S0_A_ON_CHAIN_REASONS = Object.freeze(['frequency', 'chain-depth', 'budget']);

/** 分支 A 端到端的六拍（id + 人读标签；顺序即真机时序）。 */
export const S0_A_BEATS = Object.freeze([
  { id: 'configured', label: '① 已配置（主题② 前提，v55-2 唯一分流依据）' },
  { id: 'pressed', label: '② 答案 ⇒ `pressCandidate` 自动按下（恰 1 次）' },
  { id: 'slot', label: '③ 经**既有** `op.turn` 槽成回合（**零按键**）' },
  { id: 'stream', label: '④ 思考 / 命令行进入流内（答案原文成回合输入）' },
  { id: 'guarded', label: '⑤ 护栏在链路上可判（频次 / 链深 / 预算 + 抑制留痕可读）' },
  { id: 'continuation', label: '⑥ 续流收口（回合结束：无死端 ∧ 无开口 ask）' },
]);

/**
 * **分支 A 端到端的必判项判据**（纯函数，双面共用）。
 *
 * `reading`（注入读数）:
 * ```
 * {
 *   configured: boolean,          // 已配置（前提）
 *   slot: string | null,          // 实际使用的槽（必须 === S0_A_SLOT）
 *   keypresses: number,           // 作答之后用户敲键数（必须 0）
 *   presses: number,              // pressCandidate 成功按下次数（必须 1）
 *   answer: string | null,        // 成为回合输入的原文（必须逐字 = S0_ANSWER）
 *   chatTurns: number,            // 真实回合（`chat`）发出次数（≥1）
 *   trace: boolean,               // 三要素留痕行（driver / timing / evidence，零明文）
 *   guardReasons: string[],       // **链路上**真实可判的护栏原因集
 *   suppressedReadable: boolean,  // 被抑制时走可读留痕（非静默 return）
 *   continuation: boolean,        // 思考 / 命令 ⇒ 续流 ⇒ 收口
 * }
 * ```
 * **删 `pressCandidate` 门 ⇒ `presses:0` ⇒ 必 FAIL；删护栏缝 ⇒ `guardReasons` 缺项 ⇒ 必 FAIL。**
 */
export function s0BranchAProblems(reading = {}) {
  const problems = [];
  if (reading.configured !== true) {
    problems.push('分支 A 前提不成立：必须**已配置**（未配置 ⇒ 零 AI 主动发起，应走分支 B）');
  }
  if (reading.presses !== 1) {
    problems.push(
      `**删 pressCandidate 门 ⇒ FAIL**：答案后的自动按下必须恰 1 次（实测 ${String(reading.presses)}）`,
    );
  }
  if (reading.keypresses !== 0) {
    problems.push(`自动成回合必须是**零按键**（实测用户作答后又敲了 ${String(reading.keypresses)} 次）`);
  }
  if (reading.slot !== S0_A_SLOT) {
    problems.push(`自动成回合必须经**既有** \`${S0_A_SLOT}\` 槽（实测 ${String(reading.slot)}；AI 不得自造第二回合入口）`);
  }
  if (reading.answer !== S0_ANSWER) {
    problems.push(`回合输入必须是用户原话逐字「${S0_ANSWER}」（实测 ${String(reading.answer)}）`);
  }
  if (!(typeof reading.chatTurns === 'number' && reading.chatTurns >= 1)) {
    problems.push(`答案必须真的成为回合（\`chat\` 至少发出 1 次，实测 ${String(reading.chatTurns)}）`);
  }
  if (reading.trace !== true) {
    problems.push('自动发起必须留下三要素（driver / timing / evidence）可读行，且零明文');
  }
  const reasons = Array.isArray(reading.guardReasons) ? reading.guardReasons : [];
  const unknown = reasons.filter((r) => !S0_A_GUARD_REASONS.includes(r));
  if (unknown.length > 0) problems.push(`护栏原因必须取自闭集（实测越界：${unknown.join(',')}）`);
  const missing = S0_A_ON_CHAIN_REASONS.filter((r) => !reasons.includes(r));
  if (missing.length > 0) {
    problems.push(
      `**删护栏缝 ⇒ FAIL**：频次 / 链深 / 预算必须**在链路上**真实可判（缺 ${missing.join(',')}）`,
    );
  }
  if (reading.suppressedReadable !== true) {
    problems.push('越限必须**留痕**（`suppressed=<reason>` 可读行）——静默 return 即 FAIL');
  }
  if (reading.continuation !== true) {
    problems.push('续流缺失：思考 / 命令行之后的回合结束必须可达（无死端 ∧ 无开口 ask）');
  }
  return problems;
}

/**
 * **分支 A 的逐拍读数**（本面登记 + 收尾覆盖机核用；与 `S0_A_BEATS` 逐序对齐）。
 * 两面各自登记自己**真的**驱动的拍，收尾断言「登记了却没读 / 读了却没登记」都必红。
 */
export function s0BranchABeats() {
  return S0_A_BEATS.map((b) => ({ id: b.id, label: b.label }));
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5F-1 **TASK-V55F-122**（ADR-SGO-006 §1/§2/§4 · FR-SGO-090/091/092 ·
 * **AC-SGO-013/014** · R-SGO-909）
 *
 * **S0′ 范围内核拍 + 判据**（node 面与 Chromium 面**共用同一份**，禁第二份样本）。
 *
 * `ty.md` 1963 行原案重放：拾取引用 ①（refNum=1）→ 答「原地翻译为中文」→ 自动成回合
 * （载荷含引用事实）→ SW 系统段 = 基座 + 追加段 → 范围读数 = `in-scope` → 只改写引用目标
 * **恰 1 处**（改写处数 ≤ 引用数）→ 完成交代如实 → 留痕行独立成行且含范围读数字段名。
 *
 * **决定性反证**：去掉范围注入 ⇒ 读数 `no-ref` ⇒ 必红（AI 已读到 `data-wcli-ref="ref_1"`
 * 且恰 1 命中**仍未锚定**，故必须证「范围受限」而不是「AI 恰好好心」）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** ③ 拾取后的引用序号（与 chip 文案同词汇；`ty.md` 原案 = 1）。 */
export const S0P_REF_NUM = 1;
/** 合成锚选择器（与 `src/tools/dom-anchor.ts#anchorSelectorFor` 同口径）。 */
export const S0P_ANCHOR_SELECTOR = `[data-wcli-ref="ref_${S0P_REF_NUM}"]`;

/** S0′ 范围内核的 5 拍（id + 人读标签；顺序即 `ty.md` 原案序列）。 */
export const S0P_BEATS = Object.freeze([
  { id: 'ref-in-turn', label: '③′ 自动成回合：载荷含引用事实（refNum=1 / refState=valid / selector 非空）' },
  { id: 'scope-inject', label: '④′ SW 系统段 = 基座 + 追加段（引用事实 + 法则引导）' },
  { id: 'read-in-scope', label: '⑤′ 范围读数 = in-scope（本次目标 = 引用目标）' },
  { id: 'write-1', label: '⑥′ 只改写引用目标**恰 1 处**（改写处数 ≤ 引用数）' },
  { id: 'no-injection', label: '⑦′ **反证拍**：去掉范围注入 ⇒ 读数 = no-ref' },
]);

/** S0′ 八条必判项（`expectFailPattern` 逐字来自 ADR-SGO-006 §2）。 */
export const S0P_ITEMS = Object.freeze([
  { id: 'S0P-1-refs-in-turn', expectFailPattern: 'S0′：回合载荷必须含引用事实且可判命中' },
  { id: 'S0P-2-system-append', expectFailPattern: 'S0′：系统段必须为基座 + 追加段；无引用必须逐字等于基座' },
  { id: 'S0P-3-read-in-scope', expectFailPattern: 'S0′：引用目标内的写必须判 in-scope' },
  { id: 'S0P-4-writes-le-refs', expectFailPattern: 'S0′：未授权时改写处数不得超过引用数' },
  { id: 'S0P-5-authorized-branch', expectFailPattern: 'S0′：扩围必须由用户批准产生 out-of-scope-authorized 且入留痕' },
  { id: 'S0P-6-trace', expectFailPattern: 'S0′：留痕必须独立成行且含范围读数字段名（不含用户内容值）' },
  { id: 'S0P-7-bidirectional', expectFailPattern: 'S0′ 双向反证：去掉范围注入后读数必须为空 / no-ref（否则必红）' },
  { id: 'S0P-8-honest-report', expectFailPattern: 'S0′：完成交代必须如实（清单条数 == 实际改写处数）' },
]);

/**
 * **S0′ 必判项判据**（纯函数，双面共用）。`reading`（注入读数）:
 * ```
 * {
 *   refFact: { refNum, refState, selector } | null,  // ③′ 回合载荷的引用事实
 *   systemBase: string,            // 基座（5 条条款逐字）
 *   systemWithRefs: string,        // 实际 system（有引用）
 *   systemWithoutRefs: string,     // 零引用时的 system
 *   scopeReading: string,          // ⑤′ 读数（in-scope / out-of-scope-* / no-ref）
 *   refCount: number,              // 引用数
 *   writeCount: number,            // 改写处数
 *   authorized: boolean,           // 扩围是否已获用户批准（输入事实）
 *   authorizedReading: string,     // 扩围分支读数
 *   trace: string,                 // 留痕行（独立成行）
 *   noInjectionReading: string,    // ⑦′ 去注入后的读数
 *   reportedWrites: number,        // 完成交代里的清单条数
 *   userValues: string[],          // 不得出现在留痕里的用户内容值
 * }
 * ```
 * **删范围注入 ⇒ `noInjectionReading` 必须为 `no-ref`；改写处数 > 引用数（未授权）⇒ 必红。**
 */
export function s0pProblems(reading = {}) {
  const problems = [];
  const item = (id) => S0P_ITEMS.find((x) => x.id === id);
  const f = reading.refFact;
  if (!f || f.refNum !== S0P_REF_NUM || f.refState !== 'valid' || !String(f.selector ?? '').trim()) {
    problems.push(`${item('S0P-1-refs-in-turn').id} ${item('S0P-1-refs-in-turn').expectFailPattern}（实测 ${JSON.stringify(f)}）`);
  }
  const base = String(reading.systemBase ?? '');
  const withRefs = String(reading.systemWithRefs ?? '');
  const withoutRefs = String(reading.systemWithoutRefs ?? '');
  const append = withRefs.startsWith(base) ? withRefs.slice(base.length) : '';
  if (base.length === 0 || !withRefs.startsWith(base) || append.trim().length === 0 || !append.startsWith('\n\n')) {
    problems.push(`${item('S0P-2-system-append').id} ${item('S0P-2-system-append').expectFailPattern}（追加段实测 ${JSON.stringify(append.slice(0, 40))}）`);
  }
  if (withoutRefs !== base) {
    problems.push(`${item('S0P-2-system-append').id} ${item('S0P-2-system-append').expectFailPattern}：零引用必须逐字等于基座`);
  }
  if (reading.scopeReading !== 'in-scope') {
    problems.push(`${item('S0P-3-read-in-scope').id} ${item('S0P-3-read-in-scope').expectFailPattern}（实测 ${String(reading.scopeReading)}）`);
  }
  const refCount = Number(reading.refCount ?? 0);
  const writeCount = Number(reading.writeCount ?? 0);
  if (reading.authorized !== true && writeCount > refCount) {
    problems.push(`${item('S0P-4-writes-le-refs').id} ${item('S0P-4-writes-le-refs').expectFailPattern}（改写 ${writeCount} > 引用 ${refCount}）`);
  }
  if (reading.authorized === true) {
    if (reading.authorizedReading !== 'out-of-scope-authorized') {
      problems.push(`${item('S0P-5-authorized-branch').id} ${item('S0P-5-authorized-branch').expectFailPattern}：扩围必须产生 out-of-scope-authorized`);
    }
    if (!String(reading.trace ?? '').includes('scope.authorized=user')) {
      problems.push(`${item('S0P-5-authorized-branch').id} ${item('S0P-5-authorized-branch').expectFailPattern}：扩围事实必须入留痕`);
    }
  }
  const trace = String(reading.trace ?? '');
  // 留痕行**独立成行**的机器格式：`scope.reading=<enum> | scope.authorized=<actor>`。
  if (!/^scope\.reading=[a-z-]+ \| scope\.authorized=(user|none)$/.test(trace)) {
    problems.push(`${item('S0P-6-trace').id} ${item('S0P-6-trace').expectFailPattern}（实测 ${JSON.stringify(trace)}）`);
  }
  for (const value of reading.userValues ?? []) {
    if (String(value).length > 0 && trace.includes(String(value))) {
      problems.push(`${item('S0P-6-trace').id} ${item('S0P-6-trace').expectFailPattern}：留痕不得含用户内容值`);
    }
  }
  if (reading.noInjectionReading !== 'no-ref') {
    problems.push(`${item('S0P-7-bidirectional').id} ${item('S0P-7-bidirectional').expectFailPattern}（实测 ${String(reading.noInjectionReading)}）`);
  }
  if (Number(reading.reportedWrites ?? -1) !== writeCount) {
    problems.push(`${item('S0P-8-honest-report').id} ${item('S0P-8-honest-report').expectFailPattern}（交代 ${String(reading.reportedWrites)} ≠ 实际 ${writeCount}）`);
  }
  return problems;
}

/** S0′ 逐拍读数（两面各自登记自己真的驱动的拍；收尾机核「登记 ⇔ 读数」）。 */
export function s0PChain() {
  return S0P_BEATS.map((b) => ({ id: b.id, label: b.label }));
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5F-2 **TASK-V55F-214**（ADR-SGO-006 §2/§3 · FR-SGO-093 · AC-SGO-015/016）——
 * S0′ **批量段（S0P-B1~B3）**：一次手势覆盖计划内全部 + 计划外回落 + 二择 + 中止。
 *
 * 样本单源（node 面与 Chromium 面共用**这一份**；禁第二份样本）；判据纯函数，两面注入
 * 各自真读数。存在性反证：每一拍的读数被置否 ⇒ 必红（见 `s0pBProblems`）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** S0′ 批量段的 3 拍（顺序即语义序；`S0P_B_ITEMS` 与之一一对应）。 */
export const S0P_B_BEATS = Object.freeze([
  { id: 'batch-one-gesture', label: 'B1′ 一次手势覆盖计划内全部 ∧ 计划外逐条回落' },
  { id: 'batch-writes-le-refs', label: 'B2′ 批量改写处数 ≤ 引用数（授权读数例外）' },
  { id: 'batch-widen-abort', label: 'B3′ 二择路径 ∧ 中止可判（cancelled + 部分完成留痕，零死端）' },
]);

/** S0′ 批量段三条必判项（`expectFailPattern` 逐字来自任务 214 / FR-SGO-093）。 */
export const S0P_B_ITEMS = Object.freeze([
  {
    id: 'S0P-B1-one-gesture',
    expectFailPattern: 'S0′ 批量：一次手势必须覆盖计划内全部；计划外必须逐条回落（一次点击不得放开无限写）',
  },
  {
    id: 'S0P-B2-writes-le-refs',
    expectFailPattern: 'S0′ 批量：未授权时批量改写处数不得超过引用数（授权读数例外 ⇒ out-of-scope-authorized）',
  },
  {
    id: 'S0P-B3-widen-abort',
    expectFailPattern: 'S0′ 批量：扩围必须经二择 ∧ 中止必须可判（cancelled + 部分完成留痕，零死端）',
  },
]);

/**
 * S0′ 批量段判据（纯函数，双面共用）。`reading`（注入读数）:
 * ```
 * {
 *   planEntries: number,          // 计划内条目数（buildPlan 的 entries）
 *   admittedOnOneGesture: number, // 一次手势（一次批准）之后被放行的计划内条目数
 *   outOfPlanCount: number,       // 计划外条目数（探针）
 *   fallbackCount: number,        // 其中被逐条回落的条目数
 *   refCount: number,             // 本回合引用数
 *   writeCount: number,           // 批量计划将要改写处数
 *   authorized: boolean,          // 是否经二择获用户批准扩围
 *   authorizedReading: string,    // 授权分支读数（须 out-of-scope-authorized）
 *   choiceOffered: boolean,       // 越界是否经**既有** askuser 二择（choiceOffered）
 *   abortJudged: boolean,         // 中止：cancelled 终态 ∧ 计划内拒执行 ∧ 部分完成留痕
 *   trace: string,                // 批量留痕行（零明文：指纹摘要 + 条目数 + 手势 + 计数）
 *   userValues: string[],         // 不得出现在留痕里的用户内容值
 * }
 * ```
 */
export function s0pBProblems(reading = {}) {
  const problems = [];
  const item = (id) => S0P_B_ITEMS.find((x) => x.id === id);
  const planEntries = Number(reading.planEntries ?? 0);
  const admitted = Number(reading.admittedOnOneGesture ?? 0);
  const outOfPlan = Number(reading.outOfPlanCount ?? 0);
  const fallback = Number(reading.fallbackCount ?? 0);
  // B1：N≥2 才出计划卡；一次手势覆盖**全部**计划内条目；计划外**恰**逐条回落。
  if (planEntries < 2) {
    problems.push(`${item('S0P-B1-one-gesture').id} ${item('S0P-B1-one-gesture').expectFailPattern}（计划内 ${planEntries} < 2）`);
  }
  if (admitted !== planEntries) {
    problems.push(`${item('S0P-B1-one-gesture').id} ${item('S0P-B1-one-gesture').expectFailPattern}：一次手势放行 ${admitted} ≠ 计划内 ${planEntries}`);
  }
  if (fallback !== outOfPlan) {
    problems.push(`${item('S0P-B1-one-gesture').id} ${item('S0P-B1-one-gesture').expectFailPattern}：计划外回落 ${fallback} ≠ 计划外 ${outOfPlan}`);
  }
  // B2：未授权时 改写处数 ≤ 引用数；授权例外 ⇒ 读数必须转 out-of-scope-authorized。
  const refCount = Number(reading.refCount ?? 0);
  const writeCount = Number(reading.writeCount ?? 0);
  if (reading.authorized !== true && writeCount > refCount) {
    problems.push(`${item('S0P-B2-writes-le-refs').id} ${item('S0P-B2-writes-le-refs').expectFailPattern}（改写 ${writeCount} > 引用 ${refCount}）`);
  }
  if (reading.authorized === true && reading.authorizedReading !== 'out-of-scope-authorized') {
    problems.push(`${item('S0P-B2-writes-le-refs').id} ${item('S0P-B2-writes-le-refs').expectFailPattern}：授权例外必须产生 out-of-scope-authorized`);
  }
  // B3：扩围必须经既有 askuser 二择；中止必须可判（cancelled + 部分完成留痕 ⇒ 零死端）。
  if (reading.choiceOffered !== true) {
    problems.push(`${item('S0P-B3-widen-abort').id} ${item('S0P-B3-widen-abort').expectFailPattern}：扩围未提二择`);
  }
  if (reading.abortJudged !== true) {
    problems.push(`${item('S0P-B3-widen-abort').id} ${item('S0P-B3-widen-abort').expectFailPattern}：中止不可判（cancelled + 部分完成留痕缺失）`);
  }
  const trace = String(reading.trace ?? '');
  if (!/^batch\.plan=sha256:[0-9a-f]+ \| batch\.entries=\d+ \| batch\.gesture=(user|none) \| batch\.results=\d+\/\d+$/.test(trace)) {
    problems.push(`${item('S0P-B3-widen-abort').id} ${item('S0P-B3-widen-abort').expectFailPattern}（批量留痕格式不可判：${JSON.stringify(trace)}）`);
  }
  for (const value of reading.userValues ?? []) {
    if (String(value).length > 0 && trace.includes(String(value))) {
      problems.push(`${item('S0P-B3-widen-abort').id} ${item('S0P-B3-widen-abort').expectFailPattern}：留痕不得含用户内容值`);
    }
  }
  return problems;
}

/** S0′ 批量段逐拍读数（两面各自登记自己真的驱动的拍）。 */
export function s0pBChain() {
  return S0P_B_BEATS.map((b) => ({ id: b.id, label: b.label }));
}


/* ────────────────────────────────────────────────────────────────────────────
 * ★ IAN-2 **TASK-IAN-222**（ADR-IAN-009 §② · ADR-IAN-007 · FR-IAN-070/072/073/074 ·
 * **AC-IAN-022/023** · N-IAN-025 · R-IAN-902）
 *
 * **S0''-B 终态保护** 的样本 + 判据：node 面与 Chromium 面**共用同一份**
 * （禁第二份样本 / 第二份判据）。决定性问题 = **ian-2 真退役后旧面零可达**：
 *   · `#composer` / `#input` / `#send` 三 id **DOM 零命中**（元素不存在，**非** `hidden`）；
 *   · 唯一输入面 = 流内 free-input 卡内 `.ask-fallback`（`submitFreeInput` → `op.turn` 槽）；
 *   · `requestTurn(` **恰 1**（唯一生产输入提交点）；`busy-rejected` **唯一回填载体**（流内）；
 *   · 法四新条文（输入即 next / 流外零输入面）；driver 两值可判；零新增载体 + 三冻结面零容差。
 *
 * 读数来源分工（诚实登记，禁脚本绿冒充链路可判）：
 *   · **node 面**（`s0-self-driven-chain.test.ts`）注入：新入口经**真管线**（`bindPanelOps` +
 *     `dispatchOp('op.turn')`）成回合的真读数 + 旧面零可达 / 回填 / 红线的**生产源码切片**读数；
 *   · **Chromium 面**（`s0-self-driven.mjs`）注入**真面板 DOM**读数（真点末端项 → 真键入 →
 *     真提交 → 流内 `user` 行；三 id 零命中；注入 `<form id=composer hidden>` ⇒ 必红）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** S0''-B 十环节（id + 人读标签；顺序即 `ADR-IAN-009 §②` 的 1~10 步切片）。 */
export const S0PP_CHAIN = Object.freeze([
  { id: 'pick-ref', label: "S0''-B-1 拾取引用（validCount ≥ 1）" },
  { id: 'answer', label: "S0''-B-2 作答（ask 卡结算 ∧ 原话可读）" },
  { id: 'terminal', label: "S0''-B-3 推荐区「自由输入…」末端项 → 卡内输入就地展开" },
  { id: 'submit', label: "S0''-B-4 提交 ⇒ 成回合（经 op.turn 槽）" },
  { id: 'queued', label: "S0''-B-5 在飞再输入 ⇒ queued" },
  { id: 'rejected', label: "S0''-B-6 队满 ⇒ busy-rejected ⇒ 流内回填（仅当为空）" },
  { id: 'no-outside-input', label: "S0''-B-7 流外零输入面（三 id 真退役 ⇒ DOM 零命中）" },
  { id: 'terminal-state', label: "S0''-B-8 终态：旧面零可达（元素不存在非 hidden）" },
  { id: 'driver', label: "S0''-B-9 留痕 driver 区分（manual vs AI 声明 id）" },
  { id: 'carrier', label: "S0''-B-10 零新增载体 + 红线不撞" },
]);

/** 退役三 id（ian-2 终态：**必须 DOM 零命中**；N-IAN-025 / R-IAN-902）。 */
export const S0PP_LEGACY_IDS = Object.freeze(['composer', 'input', 'send']);
/** 唯一回填载体（终态：流内卡内输入；流外写点零命中）。 */
export const S0PP_BACKFILL_CARRIERS = Object.freeze(['card#ask-input']);
/** 队满被拒的用户原话（回填判据的被判对象）。 */
export const S0PP_REJECTED_TEXT = '把这段原文放回输入处';

/** S0''-B 七条必判项（`expectFailPattern` 逐字来自 ADR-IAN-009 §② / IAN-2 台账）。 */
export const S0PP_ITEMS = Object.freeze([
  { id: 'S0PP-B1-single-entry', expectFailPattern: "S0''-B：唯一入口（卡内输入经 op.turn 槽成恰 1 回合；双入口/零回合 ⇒ FAIL）" },
  { id: 'S0PP-B2-legacy-ids-gone', expectFailPattern: "S0''-B：#composer / #input / #send 三 id DOM 零命中（真退役 ≠ hidden；注入即 FAIL）" },
  { id: 'S0PP-B3-single-slot', expectFailPattern: "S0''-B：`requestTurn(` 恰 1（唯一生产输入提交点 = op.turn 槽）" },
  { id: 'S0PP-B4-single-backfill', expectFailPattern: "S0''-B：唯一回填载体（流内卡内输入；流外写点零命中 ∧ 不覆盖非空）" },
  { id: 'S0PP-B5-driver', expectFailPattern: "S0''-B：留痕 driver 两值可判（手输 manual ∧ AI 不写 manual）" },
  { id: 'S0PP-B6-carrier-redline', expectFailPattern: "S0''-B：零新增载体 + 红线（KIND_SET 40 / 12 kind / 零宿主 / ACT_TO_OP 6 / NEXTSTEP_PRIORITY 4）" },
  { id: 'S0PP-B7-freeze', expectFailPattern: "S0''-B：三冻结面零容差（content.js 177,076 B / pick-layer.js 34,358 B）" },
]);

/** S0''-B 逐拍读数（两面各自登记自己真的驱动的拍；收尾机核「登记 ⇔ 读数」）。 */
export function s0ppChain() {
  return S0PP_CHAIN.map((b) => ({ id: b.id, label: b.label }));
}

/**
 * **S0''-B 必判项判据**（纯函数，双面共用）。
 *
 * `reading`:
 * ```
 * {
 *   legacyIdsGone: string[],           // 三 id 中**仍残留**的（必须空 ⇒ 零命中）
 *   composerInjected: boolean,         // 注入 `<form id=composer hidden>` 是否被检出（生产必须 false）
 *   cardTurns: number,                 // 唯一入口经 op.turn 槽成回合的次数（必须 1）
 *   submitSlot: string | null,         // 实际槽（必须 'op.turn'）
 *   requestTurnCallSites: number,      // 终态恰 1
 *   backfillInput: boolean,            // 流外写点是否残留（必须 false）
 *   backfillCard: string | null,       // 流内回填值（必须逐字 = S0PP_REJECTED_TEXT）
 *   backfillOverwrote: boolean,        // 是否覆盖了非空输入（必须 false）
 *   driverManual: boolean,             // 手输留痕 driver=manual 可判
 *   aiWritesManual: boolean,           // AI 路径是否误写 manual（必须 false）
 *   kindSetSize: number, kindCount: number, hostsEmpty: boolean,
 *   actToOpSize: number, nextstepPrioritySize: number,
 *   freeze: { contentBytes: number, pickBytes: number },
 *   driverTrace: string, userValues: string[],
 * }
 * ```
 * **`legacyIdsGone` 非空 或 `composerInjected === true` ⇒ 必红**（真退役被实现成 hidden / 残留）；
 * **`backfillInput === true` 或 `backfillOverwrote === true` ⇒ 必红**（流外写点回流 / 覆盖非空）。
 */
export function s0ppProblems(reading = {}) {
  const problems = [];
  const item = (id) => S0PP_ITEMS.find((x) => x.id === id);
  // ① 唯一入口：卡内输入经 op.turn 槽成恰 1 回合。
  if (reading.cardTurns !== 1) {
    problems.push(`${item('S0PP-B1-single-entry').id} 唯一入口必须经槽成恰 1 回合（实测 ${String(reading.cardTurns)}）`);
  }
  if (reading.submitSlot !== 'op.turn') {
    problems.push(`${item('S0PP-B3-single-slot').id} 提交必须经既有 \`op.turn\` 槽（实测 ${String(reading.submitSlot)}）`);
  }
  if (reading.requestTurnCallSites !== 1) {
    problems.push(`${item('S0PP-B3-single-slot').id} \`requestTurn(\` 终态恰 1（实测 ${String(reading.requestTurnCallSites)}）`);
  }
  // ② 旧面零可达：三 id DOM 零命中 ∧ 不得被 hidden 冒充。
  const leftover = Array.isArray(reading.legacyIdsGone) ? reading.legacyIdsGone : [];
  for (const id of leftover) {
    problems.push(`${item('S0PP-B2-legacy-ids-gone').id} **真退役 ⇒ FAIL**：#${id} 必须 DOM 零命中（元素不存在，非 hidden）`);
  }
  if (reading.composerInjected === true) {
    problems.push(`${item('S0PP-B2-legacy-ids-gone').id} **注入 \`<form id=composer hidden>\` ⇒ FAIL**（真退役被实现成 hidden）`);
  }
  // ③ 唯一回填载体（流内）+ 流外零写点 + 不覆盖非空。
  if (reading.backfillInput === true) {
    problems.push(`${item('S0PP-B4-single-backfill').id} 流外 \`#input\` 写点必须零命中（载体唯一化到流内）`);
  }
  if (reading.backfillCard !== S0PP_REJECTED_TEXT) {
    problems.push(`${item('S0PP-B4-single-backfill').id} 流内卡内输入回填必须逐字 = 被拒原话（实测 ${String(reading.backfillCard)}）`);
  }
  if (reading.backfillOverwrote === true) {
    problems.push(`${item('S0PP-B4-single-backfill').id} **回填覆盖非空 ⇒ FAIL**：仅当输入处为空（不覆盖用户新输入）`);
  }
  // ④ 留痕 driver 区分。
  if (reading.driverManual !== true) problems.push(`${item('S0PP-B5-driver').id} 手输留痕必须写 driver=manual（两值可判）`);
  if (reading.aiWritesManual === true) problems.push(`${item('S0PP-B5-driver').id} AI 路径不得写 manual（两值不得混同）`);
  // ⑤ 零新增载体 + 红线。
  if (reading.kindSetSize !== 40) problems.push(`${item('S0PP-B6-carrier-redline').id} KIND_SET 必须仍 40（实测 ${String(reading.kindSetSize)}）`);
  if (reading.kindCount !== 12) problems.push(`${item('S0PP-B6-carrier-redline').id} 12 kind 契约不动（实测 ${String(reading.kindCount)}）`);
  if (reading.hostsEmpty !== true) problems.push(`${item('S0PP-B6-carrier-redline').id} REGISTERED_STRUCTURAL_HOSTS 必须仍为空`);
  if (reading.actToOpSize !== 6) problems.push(`${item('S0PP-B6-carrier-redline').id} ACT_TO_OP 必须仍恰 6（实测 ${String(reading.actToOpSize)}）`);
  if (reading.nextstepPrioritySize !== 4) problems.push(`${item('S0PP-B6-carrier-redline').id} NEXTSTEP_PRIORITY 必须仍恰 4（实测 ${String(reading.nextstepPrioritySize)}）`);
  // ⑥ 三冻结面零容差（只读双锚）。
  const freeze = reading.freeze ?? {};
  if (freeze.contentBytes !== 177076) problems.push(`${item('S0PP-B7-freeze').id} content.js 必须冻结在 177,076 B（实测 ${String(freeze.contentBytes)}）`);
  if (freeze.pickBytes !== 34358) problems.push(`${item('S0PP-B7-freeze').id} pick-layer.js 必须冻结在 34,358 B（实测 ${String(freeze.pickBytes)}）`);
  // ⑦ 留痕零用户内容值（法八）。
  const trace = String(reading.driverTrace ?? '');
  for (const v of reading.userValues ?? []) {
    if (String(v).length > 0 && trace.includes(String(v))) {
      problems.push(`${item('S0PP-B5-driver').id} 留痕不得含用户内容值（法八）`);
    }
  }
  return problems;
}

/* ────────────────────────────────────────────────────────────────────────────
 * ★ F-36 / ADN-1 **TASK-ADN-124 / 125**（ADR-ADN-007 §①②③ · FR-ADN-080/081/082/083/084/085 ·
 * **AC-ADN-001/013** · R-ADN-908）—— **S0''' 四支线**（A 合法采纳 / B 被拦 / C 未产出 /
 * D 未配置）的样本 + 判据。node 面与 Chromium 面**共用同一份**（禁第二份样本 / 第二份判据）；
 * 生产读数由调用方注入（node 面注入**产物模块**，Chromium 面注入**真面板 DOM + `testing.aiNext` 缝**）。
 *
 * ── 四支线 ──────────────────────────────────────────────────────────────────
 *
 *   · **A 合法采纳**：已产出 ∧ 合法（`opId ∈ OP_IDS` ∧ 档位 ≠ `gesture`）⇒ 注入候选**替换**既有
 *     确定性候选（同 `ref-action` 规则位），单卡 ≤3 chips，终端恒最末；
 *   · **B 被拦**：五类注入（gesture / 幻觉 op / 越界 ref / 越界 param / label 含凭据）逐类
 *     `blocked=<code>` ∧ **可读留痕** ∧ **不渲染为 chip** ⇒ 注册表兜底候选照旧可见；
 *   · **C 未产出**：零 `aiNext` ⇒ 确定性注册表产卡（含零死端 floor），行为与现状逐字一致；
 *   · **D 未配置**：未配置 ⇒ **零候选产出（零网络）** + 纯确定性 + 终端恒在。
 *
 * ── 反证（判据不得恒真）─────────────────────────────────────────────────────
 *
 *   · 「未校验候选进 chips」⇒ `blockedNotRendered === false` ⇒ 必红（B 支线的核心断言）；
 *   · 「AI 在场却未替换」⇒ `replaced === false` ⇒ 必红（A 支线的核心断言）；
 *   · 「终端不在场 / 不在最末」⇒ `terminalLast === false` ⇒ 必红（四支线共同底线）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** S0''' 的四支线（唯一分流依据；与 `S0_BRANCHES` 正交，不共用词表）。 */
export const S0PPP_BRANCHES = Object.freeze(['A-accepted', 'B-blocked', 'C-not-produced', 'D-unconfigured']);

/** 围栏块的 info 串（与 `background/ai-next.ts#AI_NEXT_FENCE_INFO` 同字面；样本不新增第二词汇）。 */
export const S0PPP_FENCE_INFO = 'next';

/** A 支线的合法候选（`op.turn` = `auto` 档；label 走零明文白名单）。 */
export const S0PPP_ACCEPTED = Object.freeze({ opId: 'op.turn', label: '把这页图改成架构图' });
/** A 支线要**替换**的既有确定性候选（`ref-action` 规则位的静态文案，用于「替换」判据对照）。 */
export const S0PPP_STALE_LABEL = '用引用 1 做原地翻译';

/** B 支线的五类注入（逐类期望 `blocked=<code>`；码集与 `AI_NEXT_BLOCKED_CODES` 同字面）。 */
export const S0PPP_BLOCKED_CASES = Object.freeze([
  { name: 'gesture', candidate: Object.freeze({ opId: 'op.authorize', label: '授权当前站点' }), code: 'tier' },
  { name: 'hallucination', candidate: Object.freeze({ opId: 'op.delete-everything', label: '删除' }), code: 'unknown-op' },
  { name: 'out-of-range-ref', candidate: Object.freeze({ opId: 'op.turn', label: '继续', ref: 'ref_999' }), code: 'ref' },
  { name: 'out-of-range-param', candidate: Object.freeze({ opId: 'op.turn', label: '继续', params: 'x' }), code: 'param' },
  { name: 'label-credential', candidate: Object.freeze({ opId: 'op.turn', label: 'sk-ABCDEFGHIJKLMNOP' }), code: 'label' },
]);

/** ⑨ confirm 分层：`op.llm-config`（可接受 ⇒ 可见提案；**不可自动按下**）。 */
export const S0PPP_CONFIRM = Object.freeze({ opId: 'op.llm-config', label: '配置 LLM 凭据' });

/** D 支线的阻塞事实（`llm.unconfigured` 的派生风险 id，与 `providers.ts#LLM_BLOCKED_RISK` 同值）。 */
export const S0PPP_UNCONFIGURED_RISK = 'llmBlocked';

/** 终端按钮的选择器（`cards/nextstep.ts` 的渲染契约：`.next-terminal[data-act="free-input"]`）。 */
export const S0PPP_TERMINAL_SELECTOR = '.next-terminal[data-act="free-input"]';
/** 终端文案（与 `dispatch.ts#FREE_INPUT_LABEL` 同字面）。 */
export const S0PPP_TERMINAL_LABEL = '自由输入…';

/** S0''' 的十环节（id + 人读标签；顺序即判据序）。 */
export const S0PPP_CHAIN = Object.freeze([
  { id: 'structure', label: "S0'''-1 尾随 next 围栏块 + 严格 JSON 数组（结构可判）" },
  { id: 'registry-op', label: "S0'''-2 opId ∈ OP_IDS ∧ 档位 ≠ gesture" },
  { id: 'blocked', label: "S0'''-3 五类注入各 admit=false + 可读行 + 不渲染为 chip" },
  { id: 'accepted', label: "S0'''-4 A 合法被采纳（替换陈旧候选 + ≤3 + 单卡）" },
  { id: 'terminal', label: "S0'''-5 终端恒在场且最末（四支线）" },
  { id: 'unconfigured', label: "S0'''-6 D 未配置（零候选 + 零网络 + 纯确定性）" },
  { id: 'not-produced', label: "S0'''-7 C 未产出（零 aiNext ⇒ 确定性产卡含 floor）" },
  { id: 'carrier', label: "S0'''-8 零新增载体（KIND_SET 40 / 12 kind / 零宿主 / ACT_TO_OP 6）" },
  { id: 'confirm', label: "S0'''-9 confirm admit=true ∧ press=blocked:tier（不代答）" },
  { id: 'proposal-budget', label: "S0'''-10 提案不耗预算 + 留痕三要素 + 零明文" },
]);

/** S0''' 的十条必判项（`expectFailPattern` 逐字；node / Chromium 两面共用）。 */
export const S0PPP_ITEMS = Object.freeze([
  { id: 'S0PPP-1-structure', expectFailPattern: "S0'''：尾随 next 围栏块 + 严格 JSON 数组必须可判（结构可判）" },
  { id: 'S0PPP-2-registry-op', expectFailPattern: "S0'''：合法候选 opId 必须在册且档位 ≠ gesture（AI 不得触达特权面）" },
  { id: 'S0PPP-3-blocked', expectFailPattern: "S0'''：五类注入必须逐类被拦（blocked=<code>）+ 可读留痕 + 不渲染为 chip" },
  { id: 'S0PPP-4-accepted', expectFailPattern: "S0'''：A 合法被采纳（替换既有确定性候选 + 单卡 ≤3 chips）" },
  { id: 'S0PPP-5-terminal', expectFailPattern: "S0'''：终端必须恒在场且恒最末（四支线共同底线）" },
  { id: 'S0PPP-6-unconfigured', expectFailPattern: "S0'''：D 未配置 ⇒ 零候选产出（零网络）+ 纯确定性（现状逐字）" },
  { id: 'S0PPP-7-not-produced', expectFailPattern: "S0'''：C 未产出 ⇒ 零 aiNext ⇒ 确定性注册表产卡（含零死端 floor）" },
  { id: 'S0PPP-8-carrier', expectFailPattern: "S0'''：零新增载体（KIND_SET 40 / 12 kind / 零宿主 / ACT_TO_OP 6）" },
  { id: 'S0PPP-9-confirm', expectFailPattern: "S0'''：confirm 可接受（可见）但不得自动按下（AI 不代答 consent）" },
  { id: 'S0PPP-10-proposal-budget', expectFailPattern: "S0'''：提案不耗护栏预算 + 留痕三要素可读 + 零明文" },
]);

/** S0''' 逐拍读数（两面各自登记自己真的驱动的拍；收尾机核「登记 ⇔ 读数」）。 */
export function s0pppChain() {
  return S0PPP_CHAIN.map((b) => ({ id: b.id, label: b.label }));
}

/**
 * **S0''' 四支线必判项判据**（纯函数，双面共用）。`reading`（注入读数）:
 * ```
 * {
 *   structure: boolean,             // ① 尾随 next 围栏块 + 严格 JSON 数组
 *   acceptedOpIds: string[],        // ② 合法候选 opId 集（∈ OP_IDS）
 *   tierNonGesture: boolean,        // ② 合法候选档位 ≠ gesture
 *   blockedCodes: string[],         // ③ 五类逐类 blocked 码（逐序）
 *   blockedReadable: boolean,       // ③ 可读留痕（blocked=<code> 行）
 *   blockedNotRendered: boolean,    // ③ 被拦候选未渲染为 chip
 *   replaced: boolean,              // ④ A：注入候选替换既有确定性候选
 *   chipCount: number,              // ④ 单卡 chips（≤3）
 *   cardCount: number,              // ④ 单卡（恰 1）
 *   terminalLast: boolean,          // ⑤ 终端恒在场且最末
 *   unconfiguredCandidates: number, // ⑥ D：零候选
 *   unconfiguredNetwork: number,    // ⑥ D：零网络
 *   unconfiguredDeterministic: boolean, // ⑥ D：纯确定性
 *   notProducedDeterministic: boolean,  // ⑦ C：确定性产卡
 *   floorCard: boolean,             // ⑦ C：含零死端 floor
 *   kindSetSize: number, kindCount: number, hostsEmpty: boolean, actToOpSize: number, // ⑧
 *   confirmAdmit: boolean, confirmPress: string | null, // ⑨
 *   proposalBudget: number,         // ⑩ 提案耗预算（必须 0）
 *   trace: string,                  // ⑩ 留痕三要素
 *   userValues: string[],           // ⑩ 零明文被判对象
 *   freeze?: { contentBytes: number, pickBytes: number }, // 只读双锚（可选）
 * }
 * ```
 * **「未校验候选进 chips」（`blockedNotRendered=false`）/「终端不在最末」（`terminalLast=false`）
 * ⇒ 必 FAIL** —— 这是 S0''' 的核心安全面，不是注释。
 */
export function s0pppProblems(reading = {}) {
  const problems = [];
  const item = (id) => S0PPP_ITEMS.find((x) => x.id === id);
  const fail = (id, msg) => problems.push(`${item(id).id} ${item(id).expectFailPattern}：${msg}`);
  // ① 结构可判。
  if (reading.structure !== true) fail('S0PPP-1-structure', '尾随 next 围栏块 + 严格 JSON 数组必须可判');
  // ② 在册 ∧ 非 gesture。
  const opIds = Array.isArray(reading.acceptedOpIds) ? reading.acceptedOpIds : [];
  if (opIds.length === 0) fail('S0PPP-2-registry-op', '合法候选 opId 集不得为空（判据不得空转）');
  if (reading.tierNonGesture !== true) fail('S0PPP-2-registry-op', '合法候选档位必须 ≠ gesture');
  // ③ 五类被拦 + 可读 + 不渲染。
  const codes = Array.isArray(reading.blockedCodes) ? reading.blockedCodes : [];
  const expected = S0PPP_BLOCKED_CASES.map((c) => c.code);
  if (codes.join('|') !== expected.join('|')) fail('S0PPP-3-blocked', `五类注入必须逐序被拦（实测 ${codes.join('|') || '<空>'}）`);
  if (reading.blockedReadable !== true) fail('S0PPP-3-blocked', '被拦必须留可读行（blocked=<code>）');
  if (reading.blockedNotRendered !== true) fail('S0PPP-3-blocked', '**未校验候选进 chips ⇒ FAIL**：被拦候选不得渲染为 chip');
  // ④ A 合法采纳。
  if (reading.replaced !== true) fail('S0PPP-4-accepted', 'AI 在场必须替换既有确定性候选（注入 chips）');
  if (!(Number(reading.chipCount) <= 3)) fail('S0PPP-4-accepted', `单卡 chips 必须 ≤3（实测 ${String(reading.chipCount)}）`);
  if (Number(reading.cardCount) !== 1) fail('S0PPP-4-accepted', `必须单卡（实测 ${String(reading.cardCount)}）`);
  // ⑤ 终端恒最末。
  if (reading.terminalLast !== true) fail('S0PPP-5-terminal', '终端必须恒在场且恒最末');
  // ⑥ D 未配置。
  if (Number(reading.unconfiguredCandidates) !== 0) fail('S0PPP-6-unconfigured', `未配置 ⇒ 零候选（实测 ${String(reading.unconfiguredCandidates)}）`);
  if (Number(reading.unconfiguredNetwork) !== 0) fail('S0PPP-6-unconfigured', `未配置 ⇒ 零网络（实测 ${String(reading.unconfiguredNetwork)}）`);
  if (reading.unconfiguredDeterministic !== true) fail('S0PPP-6-unconfigured', '未配置 ⇒ 纯确定性（注册表产卡）');
  // ⑦ C 未产出。
  if (reading.notProducedDeterministic !== true) fail('S0PPP-7-not-produced', '零 aiNext ⇒ 确定性注册表产卡');
  if (reading.floorCard !== true) fail('S0PPP-7-not-produced', '零候选 ⇒ 含零死端 floor（终端恒在）');
  // ⑧ 零新增载体。
  if (Number(reading.kindSetSize) !== 40) fail('S0PPP-8-carrier', `KIND_SET 必须仍 40（实测 ${String(reading.kindSetSize)}）`);
  if (Number(reading.kindCount) !== 12) fail('S0PPP-8-carrier', `12 kind 契约不动（实测 ${String(reading.kindCount)}）`);
  if (reading.hostsEmpty !== true) fail('S0PPP-8-carrier', 'REGISTERED_STRUCTURAL_HOSTS 必须仍为空');
  if (Number(reading.actToOpSize) !== 6) fail('S0PPP-8-carrier', `ACT_TO_OP 必须仍恰 6（实测 ${String(reading.actToOpSize)}）`);
  // ⑨ confirm 分层。
  if (reading.confirmAdmit !== true) fail('S0PPP-9-confirm', 'confirm 必须可接受（可见提案）');
  if (reading.confirmPress !== 'tier') fail('S0PPP-9-confirm', `confirm 不得自动按下（press=${String(reading.confirmPress)}）`);
  // ⑩ 提案不耗预算 + 留痕 + 零明文。
  if (Number(reading.proposalBudget) !== 0) fail('S0PPP-10-proposal-budget', `提案不得耗护栏预算（实测 ${String(reading.proposalBudget)}）`);
  const trace = String(reading.trace ?? '');
  if (!/^driver=ai-next \| timing=idle \| evidence=session\.aiNext$/.test(trace)) {
    fail('S0PPP-10-proposal-budget', `留痕必须三要素（driver/timing/evidence）可读（实测 ${JSON.stringify(trace)}）`);
  }
  for (const v of reading.userValues ?? []) {
    if (String(v).length > 0 && trace.includes(String(v))) fail('S0PPP-10-proposal-budget', '留痕必须零明文（法八）');
  }
  return problems;
}
