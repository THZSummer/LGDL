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
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { OBLIGATION_OP_IDS } from '../src/ui/sidepanel/next-registry/obligation-table.js';
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
const PKG = fileURLToPath(new URL('../../', import.meta.url));
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
}
const s0 = (await import(S0_FIXTURE)) as unknown as S0Module;
const s2 = (await import(S2_FIXTURE)) as unknown as { readonly S2_CHAIN: readonly { readonly id: string }[] };
const { S0_ANSWER, S0_BRANCHES, S0_CHAIN, S0_LLM_BLOCKED_RISK, S0_REF_ID, aggregateChain, judgeBeat, judgeChain, s0AskId, s0Beats, s0SilentWindow } = s0;
const { S2_CHAIN } = s2;

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

test('S0N 元判据：每条 judgement 声明非占位 expectFailPattern', () => {
  assert.ok(JUDGEMENTS.length >= 6);
  for (const j of JUDGEMENTS) assert.ok(j.expectFailPattern.trim().length >= 8 && !j.expectFailPattern.includes('TODO'), `${j.id} 的 expectFailPattern 不得占位`);
});
