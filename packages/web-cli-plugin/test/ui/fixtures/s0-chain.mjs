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
