/**
 * V5-1 TASK-V5-107~113 (ADR-V5-001 / ADR-V5-002 机制侧) — the op **pipeline** +
 * **thin-dispatch** gate: `runOp` 四态 / `pendingOps` FIFO 仲裁 / 快照·回滚语义位 /
 * R5 失败三级 + `ACT_TO_OP`（6） + 集 A（8） + `handleCardAction` **per-op 分支 = 0**
 * + `op.execute(` **恰 1 调用点** + `data-act` 零分发读取 + 兜底字面零残留.
 *
 * 每条判据声明 `expectFailPattern`；源文本判据导出其判据函数（供伪造反证）。
 *
 * @module test/next-pipeline
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { BLOCKED_TERMINALS } from '../src/ui/sidepanel/next-registry/definition.js';
import {
  ACT_TO_OP,
  CHIP_ACTION_ALIASES,
  SET_A_PROTOCOL_ACTIONS,
  dispatchChipAction,
} from '../src/ui/sidepanel/next-registry/dispatch.js';
import {
  OPS_BY_ID,
  PARAMS_REJECTED,
  bindPanelOps,
  drainOne,
  enqueuePending,
  isMutating,
  queueLength,
  resolvePending,
  runOp,
} from '../src/ui/sidepanel/next-registry/pipeline.js';
import type { NextOp, OpCtx } from '../src/ui/sidepanel/next-registry/definition.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));
const SIDE_DIR = join(PKG, 'src/ui/sidepanel');
const SIDEPANEL_SRC = readFileSync(join(SIDE_DIR, 'sidepanel.ts'), 'utf8');
const DISPATCH_SRC = readFileSync(join(SIDE_DIR, 'next-registry/dispatch.ts'), 'utf8');
const NEXTSTEP_SRC = readFileSync(join(SIDE_DIR, 'cards/nextstep.ts'), 'utf8');

export interface Judgement {
  readonly id: string;
  readonly expectFailPattern: string;
}
export const JUDGEMENTS: readonly Judgement[] = [
  { id: 'NP-1-runop-four-states', expectFailPattern: 'runOp 四态：管线分支未按语义结算' },
  { id: 'NP-2-default-no-ask', expectFailPattern: '缺省语义：无 params/consent 仍插卡' },
  { id: 'NP-3-unknown-op-loud', expectFailPattern: '未知 opId 必须 loud' },
  { id: 'NP-4-pending-fifo', expectFailPattern: 'pendingOps 队列必须 FIFO 且不静默丢弃' },
  { id: 'NP-5-snapshot-rollback', expectFailPattern: '快照/回滚：多表结构或整体回滚失效' },
  { id: 'NP-6-act-to-op', expectFailPattern: 'ACT_TO_OP 必须恰 6 行且逐字' },
  { id: 'NP-7-two-set', expectFailPattern: '两集模型：集 A 与 ACT_TO_OP 键集不得相交' },
  { id: 'NP-8-zero-per-op-branch', expectFailPattern: '集 B per-op 分支必须为 0' },
  { id: 'NP-9-single-execute', expectFailPattern: 'op.execute( 调用点必须恰 1 处' },
  { id: 'NP-10-dataop-single-source', expectFailPattern: 'chip data-op 必须由 ACT_TO_OP 派生' },
];

/* ── source-text judges ── */
function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walkTs(abs, out);
    else if (name.endsWith('.ts')) out.push(abs);
  }
  return out;
}
/** Count `op.execute(` / `.execute(` call sites under `src/ui/sidepanel/**`. */
export function executeCallSites(): string[] {
  const out: string[] = [];
  for (const abs of walkTs(SIDE_DIR)) {
    readFileSync(abs, 'utf8').split('\n').forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
      if (/\.execute\s*\(/.test(line)) out.push(`${abs}:${i + 1}: ${t}`);
    });
  }
  return out;
}
/** The set-B action strings found as `if (action === '<x>')` branches in a source. */
const SET_B = ['next', 'repick', 'describe', 'describe-submit', 'rebind', 'help', 'authorize'] as const;
export function perOpBranches(source: string, acts: readonly string[]): string[] {
  return acts.filter((a) => new RegExp(`if \\(action === '${a}'\\)`).test(source));
}

/* ── synthetic ops for the four-state drive ── */
const synth = (over: Partial<NextOp> = {}): NextOp => ({
  opId: 'op.synthetic',
  risk: 'low',
  layer: 'panel',
  execute: async () => ({ ok: true }),
  ...over,
});

test('NP-1 runOp 四态：params → consent → execute → receipt（成功结算 completed）', async () => {
  const states: string[] = [];
  const out = await runOp(
    'op.synthetic',
    { value: 'x' },
    {
      ops: { 'op.synthetic': synth({ params: { prompt: 'p' }, consent: { prompt: 'c' } }) },
      collectParams: async () => 'answer',
      collectConsent: async () => 'allow',
      settle: async (_o, s) => void states.push(s),
    },
  );
  assert.equal(out.ok, true);
  assert.deepEqual(states, ['completed'], 'runOp 四态：管线分支未按语义结算');
});

test('NP-1 runOp 拒绝：params REJECTED ⇒ cancelled；consent reject ⇒ rejected（不执行 execute）', async () => {
  const states: string[] = [];
  let executed = 0;
  const op = synth({ params: { prompt: 'p' }, consent: { prompt: 'c' }, execute: async () => { executed += 1; return { ok: true }; } });
  const a = await runOp('op.synthetic', {}, { ops: { 'op.synthetic': op }, collectParams: async () => PARAMS_REJECTED, settle: async (_o, s) => void states.push(s) });
  assert.equal(a.ok, false);
  assert.deepEqual(states, ['cancelled']);
  const b = await runOp('op.synthetic', {}, { ops: { 'op.synthetic': op }, collectConsent: async () => 'reject', settle: async (_o, s) => void states.push(s) });
  assert.equal(b.ok, false);
  assert.deepEqual(states, ['cancelled', 'rejected']);
  assert.equal(executed, 0, '拒绝路径不得执行 execute');
});

test('NP-2 缺省语义：无 params ⇒ 零 ask；无 consent ⇒ 零 auth', async () => {
  let paramsCalls = 0;
  let consentCalls = 0;
  const out = await runOp('op.synthetic', {}, {
    ops: { 'op.synthetic': synth() },
    collectParams: async () => { paramsCalls += 1; return undefined; },
    collectConsent: async () => { consentCalls += 1; return 'allow'; },
  });
  assert.equal(out.ok, true);
  assert.equal(paramsCalls, 0, '缺省语义：无 params/consent 仍插卡');
  assert.equal(consentCalls, 0, '缺省语义：无 params/consent 仍插卡');
});

test('NP-3 未知 opId ⇒ loud failure（不入注册表者不可分发）', async () => {
  const out = await runOp('op.nope', {});
  assert.equal(out.ok, false);
  assert.match(String(out.reason), /unknown-op/, '未知 opId 必须 loud');
});

test('NP-4 pendingOps FIFO + MAX_OPEN_ASKS 仲裁（达上限不新开 ask，入队 + 系统行）', () => {
  while (queueLength() > 0) drainOne();
  const notices: string[] = [];
  bindPanelOps({ notice: (t) => void notices.push(t) });
  // 达上限（openAsks == 2）⇒ 入队 + 通知；返回 queued。
  return runOp('op.turn', {}, { ops: { 'op.turn': synth({ params: { prompt: 'p' } }) }, openAsks: 2 }).then((out) => {
    assert.equal(out.ok, false);
    assert.equal(out.reason, 'queued');
    assert.equal(queueLength(), 1, 'pendingOps 队列必须 FIFO 且不静默丢弃');
    assert.ok(notices.some((t) => t.includes('待答')), '必须追加系统行告知剩余待答');
    // FIFO：再入队一个，先出队的是先入的。
    enqueuePending('op.pick');
    assert.equal(drainOne(), 'op.turn');
    // ask-resolved：幂等（同一 requestId 二次 resolve 被拒且不再 drain）。
    assert.equal(queueLength(), 1);
    assert.equal(resolvePending('req-1'), true);
    assert.equal(queueLength(), 0);
    assert.equal(resolvePending('req-1'), false, '同一 ask 不得二次 resolve');
    // 本地回合（ref-round-*）不入队。
    assert.equal(enqueuePending('op.turn', 'ref-round-9'), 0);
    bindPanelOps({});
  });
});

test('NP-5 快照/回滚：多表结构 + 失败整体回滚（errorWithRecovery）', async () => {
  const rolled: unknown[] = [];
  const bad = synth({ risk: 'mid', execute: async () => { throw new Error('boom'); } });
  const out = await runOp('op.synthetic', {}, {
    ops: { 'op.synthetic': bad },
    snapshot: async () => ({ tables: [{ name: 'a', rows: [] }, { name: 'b', rows: [] }, { name: 'c', rows: [] }] }),
    rollback: async (s) => void rolled.push(s),
    errorWithRecovery: async (_o, boundary) => ({ ok: false, reason: boundary }),
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'card-boundary');
  assert.equal(rolled.length, 1, '快照/回滚：多表结构或整体回滚失效');
  // 多表结构（≥1 / ≥3 表可登记）。
  const snap = await runOp('op.synthetic', {}, {
    ops: { 'op.synthetic': synth({ risk: 'high' }) },
    snapshot: async () => ({ tables: [{ name: 'x', rows: [] }] }),
  });
  assert.equal(snap.ok, true);
});

test('NP-5 isMutating：risk !== low ⇒ 改状态（快照）', () => {
  assert.equal(isMutating({ risk: 'mid' }), true);
  assert.equal(isMutating({ risk: 'high' }), true);
  assert.equal(isMutating({ risk: 'low' }), false);
  assert.equal(isMutating(OPS_BY_ID['op.pick']), false);
  assert.equal(isMutating(OPS_BY_ID['op.help']), false);
  assert.equal(isMutating(OPS_BY_ID['op.turn']), false);
});

test('NP-6/7 ACT_TO_OP 恰 6 行 ∧ 集 A 恰 8 项 ∧ 两集键集不相交', () => {
  assert.deepEqual(Object.keys(ACT_TO_OP), ['next', 'repick', 'describe', 'authorize', 'rebind', 'help'], 'ACT_TO_OP 必须恰 6 行且逐字');
  assert.deepEqual(
    { ...ACT_TO_OP },
    { next: 'op.turn', repick: 'op.pick', describe: 'op.describe', authorize: 'op.authorize', rebind: 'op.rebind', help: 'op.help' },
  );
  assert.equal(SET_A_PROTOCOL_ACTIONS.length, 8);
  assert.deepEqual([...SET_A_PROTOCOL_ACTIONS], ['answer', 'choose', 'cancel', 'approve', 'reject', 'audit', 'hover', 'reanchor']);
  const keys = new Set(Object.keys(ACT_TO_OP));
  for (const a of SET_A_PROTOCOL_ACTIONS) assert.ok(!keys.has(a), `两集模型：集 A 与 ACT_TO_OP 键集不得相交（${a}）`);
  assert.equal(CHIP_ACTION_ALIASES['describe-submit'], 'op.describe');
});

test('NP-8 集 B per-op 分支 = 0（handleCardAction）', () => {
  const found = perOpBranches(SIDEPANEL_SRC, SET_B);
  assert.deepEqual(found, [], `集 B per-op 分支必须为 0（实测 ${found.join(', ')}）`);
  // 集 A 分支必须仍在（8 项保留；`approve`/`reject` 为复合条件）。
  for (const a of SET_A_PROTOCOL_ACTIONS) {
    assert.ok(new RegExp(`action === '${a}'`).test(SIDEPANEL_SRC), `集 A 的 '${a}' 判据必须保留`);
  }
});

test('NP-8 反证：加一个 per-op 分支 ⇒ 判据必红', () => {
  const forged = `${SIDEPANEL_SRC}\n  if (action === 'rebind') { return; }\n`;
  assert.ok(perOpBranches(forged, SET_B).includes('rebind'), '伪造 per-op 分支必须被判红');
});

test('NP-8 单次查表：handleCardAction 中 dispatchChipAction 恰 1 调用点 ∧ 零分发表', () => {
  const calls = SIDEPANEL_SRC.split('\n').filter((l) => /dispatchChipAction\s*\(/.test(l) && !/^\s*import\b/.test(l));
  assert.equal(calls.length, 1, `dispatchChipAction 必须恰 1 个调用点（实测 ${calls.length}）`);
  assert.ok(!/getAttribute\('data-act'\)/.test(SIDEPANEL_SRC), '`data-act` 零分发读取');
  assert.ok(!/将在 v4-3/.test(SIDEPANEL_SRC), '旧「将在 v4-3 / v4-4 落地」兜底字面零残留');
  // dispatch.ts 自身零 per-op 分支（一次查表）。
  assert.ok(!/if\s*\(action ===/.test(DISPATCH_SRC), 'dispatch.ts 不得出现 per-op if 分支');
});

test('NP-9 op.execute( 在 src/ui/sidepanel/** 恰 1 调用点（pipeline.ts runOp）', () => {
  const sites = executeCallSites();
  assert.equal(sites.length, 1, `op.execute( 调用点必须恰 1 处，实测 ${sites.length}：${sites.join(' | ')}`);
  assert.match(sites[0], /pipeline\.ts/, '唯一调用点必须在 pipeline.ts');
});

test('NP-10 chip data-op 由 ACT_TO_OP 派生（不硬编码 6 条映射）', () => {
  assert.match(NEXTSTEP_SRC, /setAttribute\('data-op'/, 'chip 必须带 data-op');
  assert.match(NEXTSTEP_SRC, /ACT_TO_OP/, 'data-op 必须由 ACT_TO_OP 派生');
  assert.ok(!/'op\.turn'|'op\.pick'|'op\.rebind'/.test(NEXTSTEP_SRC), 'nextstep.ts 不得硬编码 opId 映射');
});

test('NP-10 BLOCKED_TERMINALS 恰 5 项且在 definition.ts 声明（跨源「声明恰一次」扫描归 TASK-V5-120）', () => {
  assert.equal(BLOCKED_TERMINALS.length, 5);
  const def = readFileSync(join(SIDE_DIR, 'next-registry/definition.ts'), 'utf8');
  for (const t of BLOCKED_TERMINALS) assert.ok(def.includes(`'${t}'`), `definition.ts 必须声明 ${t}`);
});

test('NP-10 分发可用：dispatchChipAction 解析 6 act + describe-submit 别名 + 未知 ⇒ false', () => {
  bindPanelOps({ turn: () => {}, pick: () => {}, describe: () => {}, rebind: () => {}, help: () => {}, authorize: () => {} });
  for (const a of Object.keys(ACT_TO_OP)) assert.equal(dispatchChipAction(a), true, `${a} 必须可分发`);
  assert.equal(dispatchChipAction('describe-submit', 'v'), true, 'describe-submit 必须经别名落到 op.describe');
  assert.equal(dispatchChipAction('totally-unknown'), false, '未知 action 必须返回 false（不静默吞掉）');
  bindPanelOps({});
  void (0 as unknown as OpCtx);
});
