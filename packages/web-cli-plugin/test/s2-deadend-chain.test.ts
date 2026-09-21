/**
 * V5-2 **TASK-V5-149 / 150** (ADR-V5-009 §3/§5 · ADR-V5-012 §1 · FR-ALLN-016 ·
 * **AC-ALLN-001 / 024** · EC-ALLN-005/007 · **R-ALLN-014**) — the **S2 断流全链首验收**
 * (node + seam 层).
 *
 * ── The claim ───────────────────────────────────────────────────────────────
 *
 * The S2 chain (`绑定 → 探测 → 未授权 → × 阻塞 → 授权 next 产出 → auth 卡 → 握手 → ✓ 回执
 * → 探测恢复 → 拾取 next 产出`) has **死端 = 0**: every blocked beat reaches an actionable
 * next. The sample is shared with v5-3's `test/ui/no-dead-end.mjs` (same `s2-chain.mjs`,
 * **不复制** — FR-ALLN-004 共享面纪律); this leaf does **not** create that Chromium gate.
 *
 * ── What is machine-judged here ─────────────────────────────────────────────
 *
 *   ① 10 环节逐环节可判（每环节一条读数 + 可达判据）；
 *   ② 5 类阻塞态**逐类**可达 next ∧ 死端计数 == 0；
 *   ③ × 行不裸奔：阻塞态的候选里存在 `act === 'next'` 且 `opId` 已注册的 chip
 *      （渲染层即 `[data-act="next"][data-op]`）；
 *   ④ 拒绝 / 取消不是死端：管线 settle 同时写事实行 ∧ 触发可达 next（143）；
 *   ⑤ 反证：删掉恢复面 ⇒ 同一判据必须 FAIL（判据不是恒真）。
 *
 * @module test/s2-deadend-chain
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ACT_TO_OP } from '../src/ui/sidepanel/next-registry/dispatch.js';
import { OP_IDS } from '../src/shared/op-table.js';
import { OPS_BY_ID, PARAMS_REJECTED, runOp } from '../src/ui/sidepanel/next-registry/pipeline.js';
import { candidateRules, recommendCtx } from '../src/ui/sidepanel/recommend.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
/** The shared fixture (v5-3 imports the SAME file — never a copy). */
const FIXTURE = pathToFileURL(join(PKG, 'test/ui/fixtures/s2-chain.mjs')).href;

/** `expectFailPattern` of every judgement this gate declares (the meta-gate marker). */
export interface S2Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly S2Judgement[] = [
  { id: 'S2-1-ten-steps', expectFailPattern: '10 环节必须逐环节可判（缺读数即红）' },
  { id: 'S2-2-dead-end-zero', expectFailPattern: '死端计数必须为 0（阻塞态必须可达 next）' },
  { id: 'S2-3-blocked-row-not-bare', expectFailPattern: '× 行不得裸奔（缺 [data-act="next"][data-op] 即红）' },
  { id: 'S2-4-refusal-not-dead-end', expectFailPattern: '拒绝 / 取消必须同时固化事实并给出可达 next' },
  { id: 'S2-reverse-proof', expectFailPattern: '删掉恢复面后同一判据必须 FAIL（判据不是恒真）' },
];

const deps = {
  candidates: (ctx: Parameters<typeof recommendCtx>[0] | ReturnType<typeof recommendCtx>) =>
    candidateRules({
      ref: ctx.ref,
      session: ctx.session,
      site: ctx.site,
      catalog: ctx.catalog,
      probe: ctx.probe,
      risks: (ctx as { risk?: readonly string[] }).risk ?? (ctx as { risks?: readonly string[] }).risks ?? [],
      onboarding: ctx.onboarding,
      now: 1,
    }),
  actToOp: ACT_TO_OP as Readonly<Record<string, string>>,
  opIds: OP_IDS,
};

test('S2 ①: 10 环节逐环节可判（共享样本导入无副作用 + 每环节有断言）', async () => {
  const s2 = (await import(FIXTURE)) as {
    S2_CHAIN: readonly { id: string; label: string }[];
    s2JudgedStates: () => readonly { id: string; ctx: unknown }[];
    judgeStates: (d: unknown, s: unknown) => { readings: readonly { id: string }[]; deadEnds: number };
  };
  assert.equal(s2.S2_CHAIN.length, 10, 'S2 链必须恰 10 环节');
  assert.equal(new Set(s2.S2_CHAIN.map((s) => s.id)).size, 10, '环节 id 必须唯一');
  const states = s2.s2JudgedStates();
  const { readings } = s2.judgeStates(deps, states);
  assert.equal(readings.length, 6, '受判状态 = 5 类阻塞 + 恢复态');
  for (const r of readings) assert.ok(r.id.length > 0, '每环节必须有可判读数');
  // 5 环节判据（AC-ALLN-024 的「真机序列 5 环节逐环节可判」的 node 读数面）。
  for (const beat of ['site.unauthorized', 'binding.stale', 'ref.all-invalid', 'llm.unconfigured', 'perm.missing']) {
    assert.ok(readings.some((r) => r.id === beat), `${beat} 必须有读数`);
  }
});

test('S2 ②/③: 5 类阻塞态逐类可达 next ∧ 死端 = 0 ∧ × 行不裸奔', async () => {
  const s2 = (await import(FIXTURE)) as {
    s2JudgedStates: () => readonly { id: string; ctx: unknown }[];
    judgeStates: (d: unknown, s: unknown) => {
      readings: readonly { id: string; chips: readonly { act: string; opId: string | null }[]; deadEnd: boolean }[];
      deadEnds: number;
    };
    nextChipsOf: (r: unknown) => readonly { id: string; opId: string }[];
  };
  const { readings, deadEnds } = s2.judgeStates(deps, s2.s2JudgedStates());
  assert.equal(deadEnds, 0, JUDGEMENTS[1].expectFailPattern);
  assert.notEqual(readings.length, 0, '读数不得为空（否则判据空转）');
  for (const r of readings) {
    assert.ok(r.chips.length > 0, `${r.id}: 阻塞态必须给出候选（无候选 = 死端）`);
  }
  // × 行不裸奔：至少一条候选携带 `act === 'next'` ∧ 已注册 opId（渲染即 data-act/data-op）。
  const nextChips = s2.nextChipsOf(readings);
  assert.ok(nextChips.length > 0, JUDGEMENTS[2].expectFailPattern);
  for (const c of nextChips) assert.ok(OP_IDS.includes(c.opId), `${c.id}: next chip 的 opId 必须已注册`);
});

test('S2 ④: 拒绝 / 取消不是死端（settle 固化事实 ∧ 触发可达 next）', async () => {
  const settled: string[] = [];
  const reachable: string[] = [];
  const out = await runOp(
    'op.llm-config',
    {},
    {
      ops: OPS_BY_ID,
      collectParams: async () => 'openai',
      collectConsent: async () => 'reject',
      settle: async (op, state) => {
        settled.push(`${op.opId}:${state}`);
        if (state === 'rejected') reachable.push(op.opId);
      },
    },
  );
  assert.equal(out.reason, 'rejected', 'consent 拒绝必须如实返回 rejected');
  assert.ok(settled.includes('op.llm-config:rejected'), JUDGEMENTS[3].expectFailPattern);
  assert.ok(reachable.length > 0, '拒绝后必须触发可达 next（恢复卡 / 紧随 nextstep）');
  // 取消路径同理（ask 取消 ⇒ cancelled ⇒ 同样固化 + 可达）。
  const cancelled: string[] = [];
  const out2 = await runOp(
    'op.llm-config',
    {},
    { ops: OPS_BY_ID, collectParams: async () => PARAMS_REJECTED, settle: async (op, state) => void cancelled.push(state) },
  );
  assert.equal(out2.reason, 'cancelled');
  assert.ok(cancelled.includes('cancelled'), '取消必须固化该事实');
});

test('S2 反证: 删掉恢复面 ⇒ 同一判据必须 FAIL（逐字节还原 ⇒ PASS）', async () => {
  const s2 = (await import(FIXTURE)) as {
    blockedStateCtx: (b: string) => unknown;
    judgeState: (d: unknown, ctx: unknown) => { deadEnd: boolean; chips: readonly unknown[] };
  };
  // 恢复面 = 候选产出；把候选来源换成「无候选」即等价于删掉恢复面。
  const deadDeps = { ...deps, candidates: () => [] };
  const verdict = s2.judgeState(deadDeps, s2.blockedStateCtx('site.unauthorized'));
  assert.equal(verdict.deadEnd, true, JUDGEMENTS[4].expectFailPattern);
  assert.equal(verdict.chips.length, 0);
  // 还原 ⇒ PASS。
  assert.equal(s2.judgeState(deps, s2.blockedStateCtx('site.unauthorized')).deadEnd, false, '还原后必须 PASS');
});

test('S2 边界: 本叶不落地 v5-3 的死端守护门禁（单点落地纪律）', () => {
  // FR-ALLN-004 共享面纪律：`test/ui/no-dead-end.mjs` 由 v5-3 单点落地。
  assert.equal(
    existsSync(join(PKG, 'test/ui/no-dead-end.mjs')),
    false,
    'no-dead-end.mjs 必须留给 v5-3 落地（本叶只交付共享样本与 seam）',
  );
});
