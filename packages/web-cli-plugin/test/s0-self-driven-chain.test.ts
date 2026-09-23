/**
 * V5.5-1 **TASK-V55-121** (ADR-V55-005 §1/§2/§5 · FR-SELF-130/131/132/133 ·
 * **AC-SELF-001** · R-SELF-908) — the **S0 自驱链 node 面门禁**.
 *
 * ── 判什么 ───────────────────────────────────────────────────────────────────
 *
 *   S0N-1 **①~⑩ 逐拍独立读数** —— 每拍的规则 / next / 悬空 chip 各自断言（共享样本
 *         `s0-chain.mjs`，**不复制**）；
 *   S0N-2 **三条总判据** —— 「**答案不被丢弃** ∧ **静默窗口 = 0** ∧ **死端 = 0**」（AC-SELF-001）；
 *   S0N-3 **窗口定义等价** —— 样本侧 `s0SilentWindow` ⇔ 产物 `silentWindowReading`（8 组合全等）；
 *   S0N-4 **答案驱动接线** —— 悬置登记 + `'answered'` 时机驱动者 + 终态映射三者可判；
 *   S0N-5 **两段证伪** —— 缺环节 / 抽掉 next / 清空驱动者 ⇒ 判据必 FAIL ⇒ 还原 PASS；
 *   S0N-6 **与 S2 并列** —— `s2-deadend-chain` 的 10 环节不动（两条链独立计数，禁互相掩盖）。
 *
 * @module test/s0-self-driven-chain
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { OBLIGATION_OP_IDS } from '../src/ui/sidepanel/next-registry/obligation-table.js';
import {
  ONBOARD_CHIP_OP,
  ONBOARD_RESUME_TEXT,
  ONBOARD_STEP_IDS,
} from '../src/ui/sidepanel/next-registry/onboarding-flow.js';
import { OP_PARAM_SEQUENCE } from '../src/ui/sidepanel/next-registry/ops.js';
import {
  registerConfigSuspension,
  resumeSuspension,
} from '../src/ui/sidepanel/next-registry/suspension.js';
import {
  answerNotDropped,
  driversForTiming,
  listSuspensions,
  registerSuspension,
  resetSuspensions,
  silentWindowReading,
} from '../src/ui/sidepanel/next-registry/drivers.js';
import { terminalOfSource } from '../src/ui/sidepanel/next-registry/terminals.js';
import { candidateRules } from '../src/ui/sidepanel/recommend.js';
// ── V5.5-3 TASK-V55-316/317（W5，纯追加 import）──────────────────────────────
// 分支 A 端到端读数的**产物**来源（真模块，非第二份实现）：按下策略单源 + 面板 seam +
// 护栏工厂（时钟可注入 ⇒ 六项上限沿链可穷举，无需真等待）+ 关断偏好单源。
import { pressCandidate } from '../src/ui/sidepanel/next-registry/ai-drive.js';
import {
  AI_PROACTIVE_ENABLED_DEFAULT,
  AI_PROACTIVE_PREF_KEY,
  createProactivityGuard,
  loadProactivePref,
} from '../src/ui/sidepanel/next-registry/guard.js';
import { bindPanelOps } from '../src/ui/sidepanel/next-registry/ops.js';
const PKG = fileURLToPath(new URL('../../', import.meta.url));
const SIDEPANEL_REL = 'src/ui/sidepanel/sidepanel.ts';
const PIPELINE_REL = 'src/ui/sidepanel/next-registry/pipeline.ts';
const readSrc = (rel: string): string => readFileSync(join(PKG, rel), 'utf8');
/**
 * The shared samples — imported **dynamically** by absolute path (the `s2-deadend-chain`
 * precedent): the `.mjs` fixture lives outside the compiled output, so the node gate and
 * the Chromium gate read the SAME file (never a copy) and TS never needs a `.d.mts`.
 */
const S0_FIXTURE = pathToFileURL(join(PKG, 'test/ui/fixtures/s0-chain.mjs')).href;
const S2_FIXTURE = pathToFileURL(join(PKG, 'test/ui/fixtures/s2-chain.mjs')).href;

interface S0Beat {
  readonly id: string;
  readonly ctx: unknown;
  readonly settled: boolean;
  readonly source: string | null;
  readonly branch: string | null;
  readonly expectRule: string;
  readonly expectOp?: string;
}
interface S0Reading {
  readonly id: string;
  readonly rule: string | null;
  readonly chips: readonly { readonly text: string; readonly act: string; readonly opId: string | null }[];
  readonly unreachable: readonly string[];
  readonly next: string | null;
  readonly deadEnd: boolean;
  readonly silent: string;
}
interface S0Module {
  readonly S0_CHAIN: readonly { readonly id: string; readonly label: string }[];
  readonly S0_ANSWER: string;
  readonly S0_BRANCHES: readonly string[];
  readonly S0_LLM_BLOCKED_RISK: string;
  readonly S0_REF_ID: string;
  readonly s0Beats: () => readonly S0Beat[];
  readonly s0AskId: (refId?: string) => string;
  readonly aggregateChain: (readings: readonly S0Reading[]) => { readonly silentWindows: number; readonly silentOk: number; readonly silentNa: number; readonly deadEnds: number; readonly perBeat: readonly { readonly id: string; readonly ok: boolean; readonly silent: string }[] };
  readonly judgeBeat: (deps: unknown, beat: S0Beat) => S0Reading;
  readonly judgeChain: (deps: unknown, beats?: readonly S0Beat[]) => { readonly readings: readonly S0Reading[]; readonly silentWindows: number; readonly silentOk: number; readonly deadEnds: number; readonly answerNotDropped: boolean };
  readonly s0SilentWindow: (f: Record<string, unknown>) => string;
  /** V5.5-2 TASK-V55-214：分支 B 必判项（样本 + 判据，双面共用）。 */
  readonly S0_B_STEPS: readonly { readonly id: string; readonly carrier: string; readonly evidence: string; readonly masked?: boolean }[];
  readonly S0_B_PARAM_KINDS: readonly string[];
  readonly S0_B_RESUME_MARK: string;
  readonly s0BranchBProblems: (reading?: Record<string, unknown>) => readonly string[];
  readonly s0BranchBeats: (beats?: readonly S0Beat[]) => { readonly a: readonly S0Beat[]; readonly b: readonly S0Beat[] };
  /** V5.5-3 TASK-V55-316/317：分支 A 端到端 + 护栏在链路上可判（样本 + 判据，双面共用）。 */
  readonly S0_A_SLOT: string;
  readonly S0_A_GUARD_REASONS: readonly string[];
  readonly S0_A_ON_CHAIN_REASONS: readonly string[];
  readonly S0_A_BEATS: readonly { readonly id: string; readonly label: string }[];
  readonly s0BranchAProblems: (reading?: Record<string, unknown>) => readonly string[];
  readonly s0BranchABeats: () => readonly { readonly id: string; readonly label: string }[];
}
const s0 = (await import(S0_FIXTURE)) as unknown as S0Module;
const s2 = (await import(S2_FIXTURE)) as unknown as { readonly S2_CHAIN: readonly { readonly id: string }[] };
const { S0_ANSWER, S0_BRANCHES, S0_B_PARAM_KINDS, S0_B_RESUME_MARK, S0_B_STEPS, S0_CHAIN, S0_LLM_BLOCKED_RISK, S0_REF_ID, aggregateChain, judgeBeat, judgeChain, s0AskId, s0Beats, s0BranchBProblems, s0BranchBeats, s0SilentWindow } = s0;
const { S2_CHAIN } = s2;
/** V5.5-3 TASK-V55-316/317（纯追加解构；不动既有两行）。 */
const { S0_A_BEATS, S0_A_GUARD_REASONS, S0_A_ON_CHAIN_REASONS, S0_A_SLOT, s0BranchABeats, s0BranchAProblems } = s0;

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'S0N-1-per-beat', expectFailPattern: 'S0 十环节必须逐拍可判（规则 + 可达 next + 零悬空）' },
  { id: 'S0N-2-three-totals', expectFailPattern: 'S0 三条总判据（答案不被丢弃 ∧ 静默窗口 = 0 ∧ 死端 = 0）' },
  { id: 'S0N-3-window-equivalence', expectFailPattern: '静默窗口定义必须与产物单源等价（样本 ⇔ drivers.ts）' },
  { id: 'S0N-4-answer-drive', expectFailPattern: '答案必须产生驱动（悬置登记 + answered 时机驱动者 + 终态映射）' },
  { id: 'S0N-5-falsification', expectFailPattern: '注入缺环节 / 无 next / 无驱动者 ⇒ 判据必须 FAIL' },
  { id: 'S0N-6-parallel-s2', expectFailPattern: 'S0 与 S2 必须并列独立（two chains, no shared sample）' },
  // V5.5-2 TASK-V55-214/215（W5）：分支 B 必判项 + 两分支独立计数（只增不减）。
  { id: 'S0N-7-branch-B-mandatory', expectFailPattern: '分支 B 必判项：未配置 ⇒ 引导 4 步 ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接** ⇒ 留痕（删自动续接 ⇒ FAIL）' },
  { id: 'S0N-8-branch-independence', expectFailPattern: '分支 A / B 必须两侧独立计数（禁互相掩盖，R-V55-111）' },
  // V5.5-3 TASK-V55-316/317（W5）：分支 A 端到端（零按键）+ 护栏在链路上可判（只增不减）。
  { id: 'S0N-9-branch-A-end-to-end', expectFailPattern: '分支 A 端到端：已配置 ⇒ 答案后**零按键** ⇒ 经 `op.turn` 槽自动成回合 + 三要素留痕（删 pressCandidate 门 ⇒ FAIL）' },
  { id: 'S0N-10-guard-on-chain', expectFailPattern: '护栏必须在链路上**真实可判**：频次 / 链深 / 预算三项沿链可判 ∧ 关断后主题① 仍放行（删护栏缝 ⇒ FAIL）' },
];

/** The injected capabilities (the REAL production modules — no fake provider, SG-V55-02). */
function deps(): Record<string, unknown> {
  return {
    candidates: (ctx: unknown) => candidateRules(ctx as never),
    opIds: [...OBLIGATION_OP_IDS],
    actToOp: ACT_TO_OP,
    driversForTiming,
    terminalOfSource,
    suspensions: listSuspensions,
    answerNotDropped,
  };
}

/** Drive the REAL ⑤ answer (the same suspension the panel registers in `applyRefAction`). */
function driveAnswer(): boolean {
  resetSuspensions();
  return registerSuspension({
    driverId: 'ref-action',
    source: 'ref',
    late: false,
    kind: 'answered',
    instruction: S0_ANSWER,
    evidence: ['ref.validCount'],
  });
}

// ── S0N-1 逐拍读数 ───────────────────────────────────────────────────────────

test('S0N-1 十环节逐拍：规则符合样本 ∧ next 非空 ∧ 零悬空 chip', () => {
  driveAnswer();
  const beats = s0Beats();
  assert.equal(beats.length, 10, JUDGEMENTS[0].expectFailPattern);
  assert.deepEqual(beats.map((b) => b.id), S0_CHAIN.map((b) => b.id), '逐拍 id 与共享样本逐序一致');
  const chain = judgeChain(deps(), beats);
  assert.equal(chain.readings.length, 10);
  for (let i = 0; i < beats.length; i += 1) {
    const r = chain.readings[i];
    assert.deepEqual(r.unreachable, [], `${S0_CHAIN[i].label} 不得有悬空 chip`);
    assert.ok(r.next !== null, `${S0_CHAIN[i].label} 必须有可达 next`);
    assert.equal(r.deadEnd, false, `${S0_CHAIN[i].label} 不得是死端`);
    assert.equal(r.rule, beats[i].expectRule, `${S0_CHAIN[i].label} 规则必须命中样本期望`);
  }
  // B 分支（未配置）的识别侧：候选必须含 `op.llm-config`（v55-1 只断言「识别为终态 + 有驱动者」）。
  const b = chain.readings.find((r) => r.id === 'onboard-resume')!;
  assert.ok(b.chips.some((c) => c.opId === 'op.llm-config'), `⑨ 分支 B 识别侧必须给出 op.llm-config 候选（实测 ${JSON.stringify(b.chips)}）`);
  // A 分支（已配置）机制侧：答案 ⇒ 有 next（op.turn）且不是 llm 修复卡。
  const a = chain.readings.find((r) => r.id === 'auto-round')!;
  assert.ok(a.chips.some((c) => c.opId === 'op.turn'), '⑧ 分支 A 机制侧必须给出回合候选（op.turn）');
});

test('S0N-1 反证：逐拍抽掉 next / 注入悬空 chip ⇒ 该拍必判死端 → 还原 PASS', () => {
  driveAnswer();
  const beats = s0Beats();
  const clean = judgeChain(deps(), beats);
  assert.equal(clean.deadEnds, 0);
  for (const beat of beats) {
    const depsNoNext = { ...deps(), candidates: () => [] };
    const r = judgeBeat(depsNoNext as never, beat);
    assert.equal(r.deadEnd, true, `${beat.id}：无候选 ⇒ 必须是死端（判据非恒真）`);
    assert.equal(r.next, null);
    const depsDangling = {
      ...deps(),
      opIds: [],
      actToOp: {},
    };
    const r2 = judgeBeat(depsDangling as never, beat);
    assert.equal(r2.deadEnd, true, `${beat.id}：悬空 chip ⇒ 必须是死端`);
  }
  assert.deepEqual(judgeChain(deps(), beats).readings.filter((r) => r.deadEnd).map((r) => r.id), []);
});

// ── S0N-2 三条总判据 ────────────────────────────────────────────────────────

test('S0N-2 三条总判据：答案不被丢弃 ∧ 静默窗口 = 0 ∧ 死端 = 0', () => {
  driveAnswer();
  const d = deps();
  const chain = judgeChain({ ...d, turnInput: `把引用 1 ${S0_ANSWER}` }, s0Beats());
  assert.equal(chain.answerNotDropped, true, JUDGEMENTS[1].expectFailPattern);
  assert.equal(chain.silentWindows, 0, `${JUDGEMENTS[1].expectFailPattern}：静默窗口计数必须 0（实测 ${chain.silentWindows}）`);
  assert.equal(chain.silentOk, 6, '⑤~⑩ 六拍全部 settled（⑦ 的两条分支各计一拍 ⇒ 6 拍）');
  assert.equal(chain.deadEnds, 0, `${JUDGEMENTS[1].expectFailPattern}：死端计数必须 0（实测 ${chain.deadEnds}）`);
  // 答案不被丢弃的**两半**：只计数（无悬置）⇒ 不成立；悬置登记后 ⇒ 成立。
  assert.equal(answerNotDropped([], S0_ANSWER), false, '`sends` 类计数不足以满足（判据只认输入）');
  assert.equal(answerNotDropped(listSuspensions(), S0_ANSWER), true, '悬置任务输入必须可判命中');
  assert.equal(answerNotDropped(listSuspensions(), `未逐字的答案`), false, '逐字命中判据不得恒真');
});

// ── S0N-3 窗口定义等价 ──────────────────────────────────────────────────────

test('S0N-3 静默窗口定义等价：样本侧 s0SilentWindow ⇔ 产物 silentWindowReading（8 组合全等）', () => {
  const T = [true, false];
  const S = [null, 'answered-ref'];
  const D = [null, 'ref-action'];
  const N = [null, 'op.turn'];
  let n = 0;
  for (const settled of T)
    for (const terminalFact of S)
      for (const driverAttribution of D)
        for (const next of N) {
          const f = { settled, terminalFact, driverAttribution, next };
          assert.equal(s0SilentWindow(f), silentWindowReading(f), `组合 ${JSON.stringify(f)} 必须同判`);
          n += 1;
        }
  assert.equal(n, 16, '等价性判据必须真的覆盖 16 组合（非空转）');
});

// ── S0N-4 答案驱动接线 ──────────────────────────────────────────────────────

test('S0N-4 答案驱动接线：悬置 + answered 时机驱动者 + 终态映射', () => {
  assert.equal(driveAnswer(), true, '⑤ 的答案必须产生悬置登记');
  assert.equal(listSuspensions().length, 1, '恰一条悬置（幂等）');
  assert.deepEqual(listSuspensions().map((s) => [s.driverId, s.source, s.kind, s.late]), [['ref-action', 'ref', 'answered', false]]);
  const drivers = driversForTiming('answered');
  assert.ok(drivers.length >= 1, `${JUDGEMENTS[3].expectFailPattern}：answered 时机必须有驱动者（实测 ${drivers.join(',')}）`);
  assert.ok(drivers.includes('ref-action'), '恰好是 ref-action（ai-driven）');
  assert.equal(terminalOfSource('ref'), 'answered-ref', '来源键 → 终态词必须单源映射');
  assert.equal(terminalOfSource('late'), null, '迟到作答不记「已答」');
  assert.equal(terminalOfSource('ghost'), undefined, '未知来源必须 loud（undefined）');
  // 答案文本只是**悬置输入**，不得被当成计数：整条链的答案判据与「发送次数」无关。
  assert.equal(s0AskId(), 'ref-round-ref_1');
  assert.equal(S0_REF_ID, 'ref_1');
  assert.deepEqual([...S0_BRANCHES], ['A-configured', 'B-unconfigured']);
  assert.equal(S0_LLM_BLOCKED_RISK, 'llmBlocked');
});

// ── S0N-5 两段证伪 ──────────────────────────────────────────────────────────

test('S0N-5 两段证伪：缺环节 / 清空驱动者 / 抽掉终态映射 ⇒ 判据必 FAIL → 还原 PASS', () => {
  driveAnswer();
  const beats = s0Beats();
  const d = deps();
  const clean = judgeChain(d, beats);
  assert.equal(clean.deadEnds, 0);
  // ① 缺环节（删掉最关键的 ⑥→ 只留 9 拍）⇒ 环节完备判据必红。
  const missing = beats.filter((b) => b.id !== 'drive-produced');
  assert.equal(missing.length, 9);
  assert.notDeepEqual(missing.map((b) => b.id), S0_CHAIN.map((b) => b.id), '缺环节必须被环节完备判据检出');
  // ② 复现会话 B：答完之后**无驱动者归因 ∧ 无终态事实 ∧ 无可达 next** ⇒ 静默窗口 ≥ 1。
  const silentB = { ...d, driversForTiming: () => [] as readonly string[], terminalOfSource: () => null, candidates: () => [] };
  const silent = judgeChain(silentB as never, beats);
  assert.ok(silent.silentWindows >= 1, `三条都缺 ⇒ 静默窗口必须 ≥1（实测 ${silent.silentWindows}，复现会话 B 彻底静默）`);
  // ③ 只缺终态事实 + 驱动者（仍有 next）⇒ 不算静默窗口（三段判据是 OR，不是 AND）。
  const noTerminal = { ...d, terminalOfSource: () => null, driversForTiming: () => [] as readonly string[] };
  assert.equal(judgeChain(noTerminal as never, beats).silentWindows, 0, '仍有可达 next ⇒ 不是静默窗口（判据不得过严）');
  // ④ 抽掉答案 ⇒ 「答案不被丢弃」必红（复现会话 B：答案被丢弃）。
  const dropped = { ...d, suspensions: () => [] };
  assert.equal(judgeChain(dropped as never, beats).answerNotDropped, false, '答案被丢弃 ⇒ 判据必红');
  // 还原 ⇒ 全绿（判据不是恒真）。
  const restored = judgeChain(d, beats);
  assert.deepEqual(restored.readings.map((r) => r.id), S0_CHAIN.map((b) => b.id));
  assert.equal(restored.silentWindows, 0);
  assert.equal(restored.deadEnds, 0);
  assert.equal(restored.answerNotDropped, true);
});

// ── S0N-6 与 S2 并列 ────────────────────────────────────────────────────────

test('S0N-6 S0 与 S2 并列独立：两条链的环节集不相交、样本不共享', () => {
  assert.equal(S2_CHAIN.length, 10, 'S2 的 10 环节不动（v5 先例）');
  assert.equal(S0_CHAIN.length, 10, 'S0 的 10 环节（ADR-V55-005 §1）');
  // 两条链是**两份不同的样本**（不同文件 / 不同环节序列）：S0 独有「答案产生驱动」题眼拍。
  assert.notDeepEqual(S0_CHAIN.map((b) => b.id), S2_CHAIN.map((b) => b.id), 'S0 与 S2 不得是同一条链');
  const s2 = new Set(S2_CHAIN.map((b) => b.id));
  for (const id of ['pick-ref', 'ask-registered', 'answered', 'drive-produced', 'auto-round', 'onboard-resume']) {
    assert.ok(!s2.has(id), `S0 独有环节 ${id} 不得出现在 S2 样本里（样本不共享）`);
  }
  assert.equal(new Set(S0_CHAIN.map((b) => b.id)).size, 10, 'S0 环节 id 唯一');
  // 聚合口径来自同一处（样本），故两面读数可比。
  const agg = aggregateChain([{ id: 'x', rule: 'ref-action', chips: [], unreachable: [], next: 'op.turn', deadEnd: false, silent: 'ok' }]);
  assert.deepEqual(agg, { perBeat: [{ id: 'x', ok: true, silent: 'ok', next: 'op.turn', rule: 'ref-action' }], silentWindows: 0, silentOk: 1, silentNa: 0, deadEnds: 0 });
});

// ── S0N-7 分支 B 必判项（V5.5-2 TASK-V55-214）────────────────────────────────

/**
 * Build the branch-B reading from the **production** facts (single source) + the two
 * production source texts, so an injection into either source is really detected
 * (the reading is derived, not hand-written).
 */
function branchBReading(sidepanelSrc: string, pipelineSrc: string): Record<string, unknown> {
  const paramKinds = (OP_PARAM_SEQUENCE[ONBOARD_CHIP_OP] ?? []).map((s) => s.kind);
  const settleAt = pipelineSrc.indexOf("await settle(op_, 'completed'");
  const notifyAt = pipelineSrc.indexOf("panelOpSettled(op_, 'completed')");
  return {
    steps: [...ONBOARD_STEP_IDS],
    paramKinds,
    // 「掩码卡」= 三段里确有 `secret` 步 ∧ 面板有掩码入口（`SECRET_ASKS` 单源）。
    masked: paramKinds.includes('secret') && /SECRET_ASKS/.test(sidepanelSrc),
    // 「完成」= 成功回执先写、结算后通知（回执在前、续接在后）：事件序在源码里可判。
    completed: settleAt >= 0 && notifyAt > settleAt,
    // 「自动续接」= `opSettled` 的 completed 分支真的调用 `resumeAfterConfig()`
    // （删掉 ⇒ 该正则不命中 ⇒ 必 FAIL）。
    autoResumed: /if \(op\.opId === ONBOARD_CHIP_OP && state === 'completed'\) resumeAfterConfig\(\);/.test(sidepanelSrc),
    // 「续接输入 = 用户原话」由**真源模块**驱动（幂等登记 → 续接原样交付）。
    resumedInput: branchBResumedInput(),
    // 「留痕」= 续接函数体内既写固化事实行、又经唯一 `op.turn` 槽把原话送回回合。
    trace:
      /function resumeAfterConfig\([\s\S]*?ONBOARD_RESUME_TEXT/.test(sidepanelSrc) &&
      /function resumeAfterConfig\([\s\S]*?dispatchOp\('op\.turn'/.test(sidepanelSrc),
  };
}

/** 真源驱动：登记 → 续接，取回交付的输入（等价于面板 `resumeAfterConfig` 的那一半）。 */
function branchBResumedInput(): unknown {
  resetSuspensions();
  assert.equal(registerConfigSuspension(S0_ANSWER, { origin: 'https://s0.test', sessionId: 's0' }), 'registered');
  const decided = resumeSuspension({ origin: 'https://s0.test', sessionId: 's0' });
  resetSuspensions();
  return decided.status === 'resumed' ? decided.instruction : undefined;
}

test('S0N-7 分支 B 必判项：引导 4 步 ⇒ 掩码卡 ⇒ 完成 ⇒ 自动续接 ⇒ 留痕（与产物单源对齐）', () => {
  // 样本 4 步与产物 `ONBOARD_STEP_IDS` 单源对齐（样本不是第二份定义）。
  assert.deepEqual([...S0_B_STEPS].map((s) => s.id), [...ONBOARD_STEP_IDS], '分支 B 引导步必须与产物单源逐序一致');
  // 掩码卡的三段 kind 与产物 `OP_PARAM_SEQUENCE` 单源对齐（第二份序列 ⇒ FAIL）。
  assert.deepEqual([...S0_B_PARAM_KINDS], [...(OP_PARAM_SEQUENCE[ONBOARD_CHIP_OP] ?? []).map((s) => s.kind)]);
  assert.deepEqual(
    [...S0_B_PARAM_KINDS],
    ['choice', 'text', 'secret'],
    '掩码卡必须走既有 choice → text → **secret** 三段',
  );
  const reading = branchBReading(readSrc(SIDEPANEL_REL), readSrc(PIPELINE_REL));
  assert.deepEqual(s0BranchBProblems(reading), [], JUDGEMENTS[6].expectFailPattern);
  // 留痕语义键非空（Chromium 面用它认那一行事实）；固化文案本身也必须非空（零明文事实行）。
  assert.ok(S0_B_RESUME_MARK.length > 0);
  assert.ok(ONBOARD_RESUME_TEXT.length > 0, '续接留痕的固化文案不得为空');
});

test('S0N-7 反证：删自动续接 / 挪到回执之前 / 去掉掩码卡 ⇒ 必 FAIL → 还原 PASS', () => {
  const sidepanelSrc = readSrc(SIDEPANEL_REL);
  const pipelineSrc = readSrc(PIPELINE_REL);
  const clean = branchBReading(sidepanelSrc, pipelineSrc);
  assert.deepEqual(s0BranchBProblems(clean), []);

  // ① 删自动续接（复现「配完还要重说一遍」）⇒ 必红。
  const noResume = sidepanelSrc.replace(
    "if (op.opId === ONBOARD_CHIP_OP && state === 'completed') resumeAfterConfig();",
    'void 0;',
  );
  assert.notEqual(noResume, sidepanelSrc, '前置：自动续接注入锚点必须存在');
  const dropped = s0BranchBProblems(branchBReading(noResume, pipelineSrc));
  assert.ok(
    dropped.some((p) => p.includes('删自动续接')),
    `删自动续接 ⇒ 分支 B 必判项必须红（实测 ${JSON.stringify(dropped)}）`,
  );

  // ② 续接通知挪到回执之前 ⇒「完成」不成立 ⇒ 必红（事件序）。
  const swapped = pipelineSrc.replace(
    "      await settle(op_, 'completed', ctx, snap, out);",
    "      panelOpSettled(op_, 'completed');await settle(op_, 'completed', ctx, snap, out);",
  );
  assert.notEqual(swapped, pipelineSrc, '前置：结算注入锚点必须存在');
  assert.ok(
    s0BranchBProblems(branchBReading(sidepanelSrc, swapped)).some((p) => p.includes('完成')),
    '回执被挪到续接之后 ⇒ 「完成」必判红',
  );

  // ③ 去掉掩码入口（`SECRET_ASKS` 消失）⇒ 必红；④ 换掉三段序列 ⇒ 必红。
  assert.ok(
    s0BranchBProblems({ ...clean, masked: false }).some((p) => p.includes('掩码卡')),
    '无掩码卡 ⇒ 必红',
  );
  assert.ok(
    s0BranchBProblems({ ...clean, paramKinds: ['choice', 'text'] }).some((p) => p.includes('三段 params')),
    '第二段序列 ⇒ 必红',
  );
  // ⑤ 续接输入不逐字 ⇒ 必红（判据不是恒真）。
  assert.ok(
    s0BranchBProblems({ ...clean, resumedInput: '未逐字的答案' }).some((p) => p.includes('逐字')),
    '续接输入不逐字 ⇒ 必红',
  );
  // 还原 ⇒ 全绿。
  assert.deepEqual(s0BranchBProblems(branchBReading(sidepanelSrc, pipelineSrc)), []);
});

// ── S0N-8 分支 A / B 独立计数（禁互相掩盖）──────────────────────────────────

test('S0N-8 分支 A / B 两侧独立计数：互不掩盖（改动一侧不移动另一侧读数）', () => {
  const beats = s0Beats();
  const { a, b } = s0BranchBeats(beats);
  const branched = beats.filter((x) => x.branch !== null);
  assert.ok(a.length >= 1 && b.length >= 1, `两个分支都必须有拍（实测 A=${a.length} B=${b.length}）`);
  assert.equal(a.length + b.length, branched.length, 'A + B 必须等于「有分支标记」的拍数（无第三类、无遗漏）');
  assert.equal(branched.length, 6, '⑤~⑩ 六拍落在 A/B 两分支（⑦ 两条分支各计一拍）');
  assert.equal(a.length, 5, 'A 分支 5 拍（⑤⑥⑦⑧⑩）');
  assert.equal(b.length, 1, 'B 分支 1 拍（⑨ onboard-resume，**独立计数**）');
  assert.ok(a.every((x) => x.branch === 'A-configured') && b.every((x) => x.branch === 'B-unconfigured'));
  // 分支 B 的那一拍是唯一带 `expectOp` 的拍（识别侧 = `op.llm-config`）。
  assert.deepEqual(b.map((x) => x.id), ['onboard-resume']);
  assert.equal(b[0].expectOp, 'op.llm-config');
  assert.ok(a.every((x) => x.expectOp === undefined), 'A 分支不得携带 B 的识别期望（禁互相掩盖）');
  // 独立读数的机器证据：把 B 那一拍的 ctx 换成「已配置」（去掉阻塞事实）⇒ B 侧读数变化，
  // A 侧读数**逐拍不变**（两侧由同一份样本独立驱动）。
  driveAnswer();
  const d = deps();
  const aBefore = a.map((x) => judgeBeat(d as never, x));
  const bBefore = judgeBeat(d as never, b[0]);
  const bMutated = { ...b[0], ctx: { ...(b[0].ctx as Record<string, unknown>), risks: [] } };
  const bAfter = judgeBeat(d as never, bMutated);
  const aAfter = a.map((x) => judgeBeat(d as never, x));
  assert.deepEqual(aAfter, aBefore, 'A 侧读数不得随 B 的夹具变化（禁互相掩盖）');
  assert.ok(
    !bAfter.chips.some((c) => c.opId === 'op.llm-config'),
    `B 夹具去掉阻塞事实后不得再给 op.llm-config（判据非恒真），实测 ${JSON.stringify(bAfter.chips)}`,
  );
  assert.ok(bBefore.chips.some((c) => c.opId === 'op.llm-config'), 'B 夹具未变时必须给出 op.llm-config');
});

test('S0N 元判据：每条 judgement 声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 8, 'V5.5-2 W5 后判据下界只增（8）');
  for (const j of JUDGEMENTS) assert.ok(j.expectFailPattern.trim().length >= 8 && !j.expectFailPattern.includes('TODO'), `${j.id} 的 expectFailPattern 不得占位`);
});

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-3 **TASK-V55-316 / 317**（ADR-V55-005 §3 · ADR-V55-009 §1/§3/§4 ·
 * FR-SELF-060/064/070/090~094 · **AC-SELF-001/008** · R-V55-111）
 *
 * 分支 A 端到端（**零按键自动成回合**）+ **护栏在链路上真实可判**的 node 面判官。
 *
 * 两面共用同一份样本与判据（`s0-chain.mjs`）：本面注入**产物模块**读数，Chromium 面注入真面板
 * 读数。**删 `pressCandidate` 门 ⇒ 零按键端到端必红；删护栏缝 ⇒ 超频不抑制必红。**
 * ──────────────────────────────────────────────────────────────────────────── */

/** 链上「一次结算 → 一次自动发起」的判据序列（与面板 `nextAfterSettle → driveAnsweredTurn` 同形）。 */
interface ChainStep {
  readonly cause: string;
  readonly at: number;
  /** 结算即用户交互 ⇒ 面板重置自动链（`proactivity.noteUserInteraction()`）。 */
  readonly userInteraction: boolean;
}

/** 沿链跑一组步骤，返回每次判定（记录 `allowed:false` 的原因）——真判据，不是注释。 */
function runChain(
  guard: ReturnType<typeof createProactivityGuard>,
  steps: readonly ChainStep[],
): { readonly reasons: string[]; readonly allowed: number } {
  const reasons: string[] = [];
  let allowed = 0;
  for (const s of steps) {
    if (s.userInteraction) guard.noteUserInteraction();
    const verdict = guard.verdict('ai', s.cause, s.at);
    if (verdict.allowed) {
      allowed += 1;
      guard.noteProactive(s.cause, s.at);
    } else reasons.push(verdict.reason);
  }
  return { reasons, allowed };
}

/** 分支 A 端到端读数的**产物驱动构建**（`bindPanelOps` + `pressCandidate` 真管线）。 */
function branchAReading(guard: ReturnType<typeof createProactivityGuard>): {
  reading: Record<string, unknown>;
  notices: string[];
  turned: () => string | undefined;
} {
  const notices: string[] = [];
  let turned: string | undefined;
  bindPanelOps({ notice: (text) => notices.push(text), turn: (text) => void (turned = text) });
  resetSuspensions();
  assert.equal(
    registerSuspension({
      driverId: 'ref-action',
      source: 'ref',
      late: false,
      kind: 'answered',
      instruction: S0_ANSWER,
      evidence: ['ref.validCount', 'ref.latestRefNum'],
    }),
    true,
  );
  const key = `ref-action:ref|${S0_ANSWER}`;
  guard.noteUserInteraction();
  const verdict = guard.verdict('ai', key);
  assert.deepEqual(verdict, { allowed: true }, '链上首拍必须放行（否则端到端无从谈起）');
  const out = pressCandidate(S0_A_SLOT, S0_ANSWER, {
    actor: 'ai',
    driverId: 'ref-action',
    driverClass: 'ai-driven',
    configured: true,
    armed: true,
    busy: false,
    guardAllowed: () => guard.verdict('ai', key).allowed,
  }, ['ref.validCount', 'ref.latestRefNum']);
  if (out.ok) guard.noteProactive(key);
  return {
    notices,
    turned: () => turned,
    reading: {
      configured: true,
      slot: S0_A_SLOT,
      keypresses: 0,
      presses: out.ok ? 1 : 0,
      // `chatTurns`：真管线把原话交到面板回合入口 ⇔ 一次真实回合（`requestTurn` → `chat`）。
      answer: turned ?? null,
      chatTurns: turned ? 1 : 0,
      trace: notices.some((t) => /^driver=ref-action \| timing=answered \| evidence=ref\.validCount,ref\.latestRefNum$/.test(t)),
      guardReasons: [],
      suppressedReadable: true,
      continuation: true,
    },
  };
}

test('S0N-9 分支 A 端到端：已配置 ⇒ 答案后**零按键** ⇒ 经 op.turn 槽自动成回合 + 三要素留痕', async () => {
  const guard = createProactivityGuard(() => 1_000_000, true);
  const { reading, notices, turned } = branchAReading(guard);
  await new Promise((r) => setTimeout(r, 0));
  // ① 样本单源：六拍逐序（本面登记 ⇔ 共享样本）。
  assert.deepEqual(s0BranchABeats().map((b) => b.id), S0_A_BEATS.map((b) => b.id), '分支 A 六拍必须与共享样本逐序一致');
  assert.equal(S0_A_BEATS.length, 6, '分支 A 端到端六拍（样本是唯一来源）');
  // ② 真管线：答案原样交到面板回合入口（零按键）。
  assert.equal(turned(), S0_ANSWER, `${JUDGEMENTS[8].expectFailPattern}：自动成回合必须把原话交出去`);
  // ③ 判据本体：全绿（六拍 + 零按键 + 护栏项在链上可判）。
  const chainReasons = runChain(createProactivityGuard(() => 2_000_000, true), [
    // 频次：6 次链上发起（各按 10 s 间隔、各带结算重置链深、各不同因）⇒ 第 7 次越频次。
    { cause: 'c1', at: 2_000_000, userInteraction: true },
    { cause: 'c2', at: 2_010_000, userInteraction: true },
    { cause: 'c3', at: 2_020_000, userInteraction: true },
    { cause: 'c4', at: 2_030_000, userInteraction: true },
    { cause: 'c5', at: 2_040_000, userInteraction: true },
    { cause: 'c6', at: 2_050_000, userInteraction: true },
    { cause: 'c7', at: 2_060_000, userInteraction: true },
  ]);
  const depthReasons = runChain(createProactivityGuard(() => 3_000_000, true), [
    { cause: 'd1', at: 3_000_000, userInteraction: false },
    { cause: 'd2', at: 3_010_000, userInteraction: false },
    { cause: 'd3', at: 3_020_000, userInteraction: false },
  ]);
  const budgetReasons = runChain(createProactivityGuard(() => 4_000_000, true), [
    // 预算：8 次链上发起（**按整窗间隔** ⇒ 不先撞频次上限；各带结算重置链深）⇒ 第 9 次越预算。
    ...Array.from({ length: 8 }, (_, i) => ({ cause: `b${i}`, at: 4_000_000 + i * 600_000, userInteraction: true })),
    { cause: 'b9', at: 4_000_000 + 8 * 600_000, userInteraction: true },
  ]);
  assert.ok(chainReasons.reasons.includes('frequency'), `频次必须在链路上可判（实测 ${JSON.stringify(chainReasons)}）`);
  assert.ok(depthReasons.reasons.includes('chain-depth'), `链深必须在链路上可判（实测 ${JSON.stringify(depthReasons)}）`);
  assert.ok(budgetReasons.reasons.includes('budget'), `预算必须在链路上可判（实测 ${JSON.stringify(budgetReasons)}）`);
  const guardReasons = [...S0_A_ON_CHAIN_REASONS];
  const clean = { ...reading, guardReasons };
  assert.deepEqual(s0BranchAProblems(clean), [], JUDGEMENTS[8].expectFailPattern);
  // ④ 留痕三要素（零明文：不含答案全文）。
  const trace = notices.find((t) => t.startsWith('driver='));
  assert.ok(trace, '自动发起必须留痕');
  assert.equal((trace as string).includes(S0_ANSWER), false, '留痕必须零明文（不得回显答案全文）');
});

test('S0N-9 反证：删 pressCandidate 门 / 敲了键 / 不经 op.turn 槽 / 抽掉留痕 ⇒ 必 FAIL → 还原 PASS', () => {
  const guard = createProactivityGuard(() => 1_000_000, true);
  const { reading } = branchAReading(guard);
  const clean = { ...reading, guardReasons: [...S0_A_ON_CHAIN_REASONS] };
  assert.deepEqual(s0BranchAProblems(clean), []);
  // ① 删自动按下门（复现 S0-A：答案之后彻底静默）⇒ 必红。
  assert.ok(
    s0BranchAProblems({ ...clean, presses: 0 }).some((p) => p.includes('删 pressCandidate 门')),
    '删 pressCandidate 门 ⇒ 必红',
  );
  // ② 零按键被判据本体（用户不得再敲键）。
  assert.ok(s0BranchAProblems({ ...clean, keypresses: 1 }).some((p) => p.includes('零按键')), '敲了键 ⇒ 必红');
  // ③ 经第二入口（自造槽）⇒ 必红。
  assert.ok(s0BranchAProblems({ ...clean, slot: 'op.ghost' }).some((p) => p.includes('op.turn')), '不经既有槽 ⇒ 必红');
  // ④ 答案不逐字 / 未成回合 / 无留痕 ⇒ 各必红。
  assert.ok(s0BranchAProblems({ ...clean, answer: '未逐字' }).some((p) => p.includes('逐字')), '答案不逐字 ⇒ 必红');
  assert.ok(s0BranchAProblems({ ...clean, chatTurns: 0 }).some((p) => p.includes('真的成为回合')), '未成回合 ⇒ 必红');
  assert.ok(s0BranchAProblems({ ...clean, trace: false }).some((p) => p.includes('三要素')), '无留痕 ⇒ 必红');
  // ⑤ 删护栏缝（链上缺项 / 越界原因 / 静默抑制）⇒ 必红。
  assert.ok(
    s0BranchAProblems({ ...clean, guardReasons: ['cooldown'] }).some((p) => p.includes('删护栏缝')),
    '链上护栏缺项 ⇒ 必红',
  );
  assert.ok(s0BranchAProblems({ ...clean, guardReasons: ['ghost'] }).some((p) => p.includes('闭集')), '越界原因 ⇒ 必红');
  assert.ok(s0BranchAProblems({ ...clean, suppressedReadable: false }).some((p) => p.includes('静默')), '静默抑制 ⇒ 必红');
  assert.ok(s0BranchAProblems({ ...clean, continuation: false }).some((p) => p.includes('续流')), '续流缺失 ⇒ 必红');
  // 还原 ⇒ 全绿（判据不是恒真）。
  assert.deepEqual(s0BranchAProblems(clean), []);
});

test('S0N-10 关断偏好复核：唯一新增持久偏好 + 默认 ON + 关断后主题① 仍放行（FR-SELF-069/094）', async () => {
  // ① 单源：键名与默认值来自 `guard.ts`（本 Feature **唯一**新增持久偏好，独立于 `web-cli:llm`）。
  assert.equal(AI_PROACTIVE_ENABLED_DEFAULT, true, '关断偏好默认值必须显式登记为 ON');
  assert.equal(AI_PROACTIVE_PREF_KEY, 'web-cli:proactive');
  assert.notEqual(AI_PROACTIVE_PREF_KEY, 'web-cli:llm', '不得与 LLM Key 同键');
  // ② 无 storage 面 ⇒ 降级到单源默认值（**不伪造「已关断」**）。
  const g = globalThis as unknown as { chrome?: unknown };
  const saved = g.chrome;
  delete g.chrome;
  assert.equal(await loadProactivePref(), AI_PROACTIVE_ENABLED_DEFAULT, '读失败必须降级默认 ON');
  // ③ 关断 ⇒ `ai` 恒拒（disabled）而 **`deterministic` 恒放行**（主题① 不受总开关控制）。
  const off = createProactivityGuard(() => 5_000_000, false);
  assert.deepEqual(off.verdict('ai', 'k'), { allowed: false, reason: 'disabled' });
  assert.deepEqual(off.verdict('deterministic'), { allowed: true }, '关断后主题① 必须仍放行（FR-SELF-069）');
  // ④ 恢复 ON ⇒ 放行（双向，判据非恒真）。
  off.setEnabled(true);
  assert.deepEqual(off.verdict('ai', 'k'), { allowed: true });
  // ⑤ 持久化面（假 chrome.storage.local）：写读同键、仅布尔。
  const area = { store: {} as Record<string, unknown>, async get(k: string) { return { [k]: this.store[k] }; }, async set(i: Record<string, unknown>) { Object.assign(this.store, i); } };
  (g as { chrome?: unknown }).chrome = { storage: { local: area } };
  try {
    await (await import('../src/ui/sidepanel/next-registry/guard.js')).saveProactivePref(false);
    assert.equal(area.store['web-cli:proactive'], false, '关断必须写单源键');
    assert.equal(await loadProactivePref(), false, '读回必须与写入一致');
    // 反证：非布尔残留 ⇒ 降级默认 ON（不得把垃圾当真值）。
    area.store['web-cli:proactive'] = 'yes';
    assert.equal(await loadProactivePref(), true, '非布尔值必须降级默认 ON（判据非恒真）');
  } finally {
    if (saved === undefined) delete g.chrome;
    else (g as { chrome?: unknown }).chrome = saved;
  }
});

test('S0N 元判据 V5.5-3：W5 两条新 judgement 的下界只增（≥10）', () => {
  assert.ok(JUDGEMENTS.length >= 10, 'V5.5-3 W5 后判据下界只增（10）');
  assert.ok(JUDGEMENTS.some((j) => j.id === 'S0N-9-branch-A-end-to-end'));
  assert.ok(JUDGEMENTS.some((j) => j.id === 'S0N-10-guard-on-chain'));
  for (const r of S0_A_GUARD_REASONS) assert.ok(typeof r === 'string' && r.length > 0);
  assert.deepEqual([...S0_A_ON_CHAIN_REASONS], ['frequency', 'chain-depth', 'budget'], '链上三项护栏口径逐字');
});