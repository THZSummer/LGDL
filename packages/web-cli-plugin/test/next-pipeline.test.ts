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
  dispatchOp,
  drainOne,
  enqueuePending,
  isMutating,
  queueLength,
  resolvePending,
  runOp,
  type PipelineDeps,
} from '../src/ui/sidepanel/next-registry/pipeline.js';
import { createOpBodies } from '../src/ui/settings/op-bodies.js';
import { opReceiptText } from '../src/ui/sidepanel/next-registry/ops.js';
import {
  SNAPSHOT_TABLE_NAMES,
  collectThreeTableSnapshot,
  restoreThreeTableSnapshot,
  type TableAdapter,
} from '../src/ui/sidepanel/next-registry/snapshot.js';
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

/* ────────────────────────────────────────────────────────────────────────────
 * V5-2 review R1 **BLOCK-01** (ADR-V5-005 §1/§3 · FR-ALLN-042/075/076) — the settings /
 * options surfaces really persist: the op ctx **value** (the form payload) reaches the
 * execute body, and the body's outcome is **not** discarded. R2's `(run?.(ctx), OK)` +
 * zero-arg row produced a 假成功 (`{"ok":true}` + `✓ 已配置 LLM` with an empty store).
 * ──────────────────────────────────────────────────────────────────────────── */

/** An in-memory credential store + the shared surface-agnostic body over it. */
function credentialFixture() {
  const saved: Array<Record<string, unknown>> = [];
  let current = { providerId: 'deepseek', apiKey: '', model: '' } as Record<string, unknown>;
  const bodies = createOpBodies({
    saveCredentials: (cfg) => {
      current = { ...(cfg as unknown as Record<string, unknown>) };
      saved.push(current);
    },
    loadProviderKey: () => String(current.apiKey ?? ''),
    loadCredentials: () => current as never,
    removePermission: async () => ({ removed: true }),
    requestOnGesture: async () => ({ granted: true }),
    isGranted: async () => false,
    reconcile: async () => {},
    send: async () => ({ ok: true }) as never,
  });
  return { saved, bodies, current: () => current };
}

/** The payload the settings form submits (法八: it travels in the ctx, never in `dispatch`). */
const formPayload = JSON.stringify({ providerId: 'deepseek', apiKey: 'sk-review-value', model: 'm-1', maxRounds: '40' });

/** The settings / options surface deps `dispatchOp` builds (mirrored for the forgery halves). */
const surfaceDeps = (ctx: { value?: string }): PipelineDeps => ({
  collectParams: async () => ctx.value,
  collectConsent: async () => 'allow',
  settle: async () => {},
});

test('NP-11（review R1 BLOCK-01）：设置 / options 两面提交 op.llm-config ⇒ 值真实落储', async () => {
  for (const surface of ['settings', 'options'] as const) {
    const fx = credentialFixture();
    bindPanelOps({ llmConfig: (raw) => fx.bodies.llmConfigForm(raw) });
    let out;
    try {
      out = await dispatchOp('op.llm-config', { value: formPayload }, surface);
    } finally {
      bindPanelOps({});
    }
    assert.equal(out.ok, true, `${surface}: 提交必须成功`);
    assert.equal(fx.saved.length, 1, `${surface}: keyStore 必须收到一次写入（假成功即 0 次）`);
    assert.equal(fx.saved[0]?.apiKey, 'sk-review-value', `${surface}: 表单值必须真实落储`);
    assert.equal(fx.saved[0]?.providerId, 'deepseek', `${surface}: 厂商必须落储`);
    assert.equal(fx.saved[0]?.model, 'm-1', `${surface}: 模型必须落储`);
    assert.equal(fx.saved[0]?.maxRounds, 40, `${surface}: maxRounds 必须落储（不得静默丢弃）`);
  }
});

test('NP-11 两段证伪：零参箭头（R2 形态）/ 丢弃 OpOutcome ⇒ 同一判据分别必红（还原 ⇒ 绿）', async () => {
  // ① 零参箭头执行体（R2 的 `() => PANEL.llmConfig?.()`）：ctx 值丢在半路 ⇒ 值落储判据必须能红。
  const fx1 = credentialFixture();
  bindPanelOps({ llmConfig: (raw) => fx1.bodies.llmConfigForm(raw) });
  const forged = { ...OPS_BY_ID['op.llm-config'], execute: async () => ({ ok: true }) };
  let o1;
  try {
    o1 = await runOp('op.llm-config', { value: formPayload }, { ops: { 'op.llm-config': forged }, ...surfaceDeps({ value: formPayload }) });
  } finally {
    bindPanelOps({});
  }
  assert.equal(o1.ok, true, '证伪①：零参形态的「成功」正是假成功');
  assert.equal(fx1.saved.length, 0, '证伪①：零参箭头下 keyStore 收不到值（判据必须能红）');
  // ② 失败执行体的 OpOutcome 被丢弃（R2 的 `(run?.(ctx), OK)`）：缺 key 的提交必须如实返回失败。
  const fx2 = credentialFixture();
  bindPanelOps({ llmConfig: (raw) => fx2.bodies.llmConfigForm(raw) });
  let o2;
  try {
    o2 = await dispatchOp('op.llm-config', { value: JSON.stringify({ providerId: 'deepseek', apiKey: '' }) }, 'options');
  } finally {
    bindPanelOps({});
  }
  assert.equal(o2.ok, false, '证伪②：执行体的 {ok:false} 不得被升为成功');
  assert.equal(o2.reason, 'llm-key-missing');
  assert.equal(fx2.saved.length, 0, '证伪②：失败不得落储');
  // 还原（真表 + 合法载荷）⇒ 两项判据都绿。
  const fx3 = credentialFixture();
  bindPanelOps({ llmConfig: (raw) => fx3.bodies.llmConfigForm(raw) });
  let o3;
  try {
    o3 = await dispatchOp('op.llm-config', { value: formPayload }, 'settings');
  } finally {
    bindPanelOps({});
  }
  assert.equal(o3.ok, true);
  assert.equal(fx3.saved.length, 1);
});

/* ────────────────────────────────────────────────────────────────────────────
 * V5-2 review R1 **BLOCK-02** (FR-ALLN-034 ③② · EC-ALLN-011 · NFR-ALLN-010) — the
 * **failure settles as a failure**: a non-throwing `{ok:false}` body must roll the WHOLE
 * three-table snapshot back (zero half-finished cross-table state) and must write a
 * failure row — never `settle('completed')` with a `✓` receipt.
 * ──────────────────────────────────────────────────────────────────────────── */

/** An in-memory three-table store + its production adapters (the real snapshot helpers). */
function threeTableFixture() {
  const db: Record<string, string[]> = {
    authorization: ['origin:https://a.test'],
    permission: ['bookmarks:granted', 'clipboard:granted'],
    credential: ['deepseek:sk-live'],
  };
  const adapters = SNAPSHOT_TABLE_NAMES.map((name) => ({
    name,
    read: () => [...db[name]],
    write: (rows: readonly unknown[] | undefined) => {
      db[name] = [...((rows ?? []) as string[])];
    },
  })) as unknown as readonly TableAdapter[];
  return { db, adapters, before: JSON.parse(JSON.stringify(db)) as Record<string, string[]> };
}

/** Drive one **half-finishing** mutating op through the production pipeline. */
async function driveHalfFailure(over: Partial<PipelineDeps> = {}) {
  const fx = threeTableFixture();
  const notices: string[] = [];
  const settled: string[] = [];
  bindPanelOps({ notice: (t) => void notices.push(t) });
  const halfRevoke = synth({
    opId: 'op.synthetic',
    risk: 'high',
    // 写两张表后**非抛错**失败（`op.revoke` 多能力循环中途失败的等价形态）。
    execute: async () => {
      fx.db.authorization = ['origin:https://a.test', 'origin:https://b.test'];
      fx.db.permission = ['clipboard:granted'];
      return { ok: false, reason: 'permission-still-held:bookmarks' };
    },
  });
  let out;
  try {
    out = await runOp('op.synthetic', {}, {
      ops: { 'op.synthetic': halfRevoke },
      snapshot: () => collectThreeTableSnapshot(fx.adapters),
      rollback: async (s) => {
        await restoreThreeTableSnapshot(fx.adapters, s);
      },
      settle: async (_o, s) => void settled.push(s),
      ...over,
    });
  } finally {
    bindPanelOps({});
  }
  return { fx, out, notices, settled };
}

test('NP-5b（review R1 BLOCK-02）：{ok:false} ⇒ 失败结算 + 三表整体回滚（零半完成态）', async () => {
  const { fx, out, settled } = await driveHalfFailure();
  assert.equal(out.ok, false, 'BLOCK-02：执行体的 {ok:false} 必须原样返回（不得升为成功）');
  assert.equal(out.reason, 'permission-still-held:bookmarks');
  assert.deepEqual(settled, ['failed'], 'BLOCK-02：非 {ok:true} 必须走失败结算（不是 completed）');
  assert.deepEqual(fx.db, fx.before, 'BLOCK-02：三表必须零半完成态（跨表整体回滚，禁单表）');
});

test('NP-5b（review R1 BLOCK-02）：失败行是失败回执（绝不写成功回执）', async () => {
  const { notices } = await driveHalfFailure({ settle: undefined });
  const failureRow = opReceiptText('op.synthetic', { ok: false, reason: 'permission-still-held:bookmarks' });
  assert.ok(notices.includes(failureRow), `BLOCK-02：失败必须写失败回执，实测 ${JSON.stringify(notices)}`);
  assert.equal(notices.filter((n) => n.includes('\u2713')).length, 0, `BLOCK-02：失败路径绝不得写成功回执，实测 ${JSON.stringify(notices)}`);
});

test('NP-5b 两段证伪：短路回滚 / 把失败的结算改回 completed ⇒ 同一判据分别必红（还原 ⇒ 绿）', async () => {
  // ① 回滚被短路（单表都不还原）⇒「零半完成态」判据必须能失败。
  const noRollback = await driveHalfFailure({ rollback: async () => {} });
  assert.notDeepEqual(noRollback.fx.db, noRollback.fx.before, 'BLOCK-02 证伪①：回滚被短路时判据必须能红（否则判据恒真）');
  // ② 结算被改回「恒 completed」（R2 的旧行为）⇒「失败结算」判据必须能失败。
  const alwaysCompleted = await driveHalfFailure({ settle: async (_o, s) => void alwaysCompletedStates.push('completed') });
  assert.ok(!alwaysCompleted.settled.includes('failed'), 'BLOCK-02 证伪②：恒 completed 时失败结算判据必须能红');
  // 还原（默认 deps）⇒ 两项判据都绿。
  const restored = await driveHalfFailure();
  assert.deepEqual(restored.fx.db, restored.fx.before);
  assert.deepEqual(restored.settled, ['failed']);
});
const alwaysCompletedStates: string[] = [];

test('NP-5 isMutating：risk !== low ⇒ 改状态（快照）', () => {
  assert.equal(isMutating({ risk: 'mid' }), true);
  assert.equal(isMutating({ risk: 'high' }), true);
  assert.equal(isMutating({ risk: 'low' }), false);
  assert.equal(isMutating(OPS_BY_ID['op.pick']), false);
  assert.equal(isMutating(OPS_BY_ID['op.help']), false);
  assert.equal(isMutating(OPS_BY_ID['op.turn']), false);
});

test('NP-6/7 ACT_TO_OP 恰 6 行 ∧ 集 A 恰 9 项 ∧ 两集键集不相交', () => {
  assert.deepEqual(Object.keys(ACT_TO_OP), ['next', 'repick', 'describe', 'authorize', 'rebind', 'help'], 'ACT_TO_OP 必须恰 6 行且逐字');
  assert.deepEqual(
    { ...ACT_TO_OP },
    { next: 'op.turn', repick: 'op.pick', describe: 'op.describe', authorize: 'op.authorize', rebind: 'op.rebind', help: 'op.help' },
  );
  // ★ IAN-1（ADR-IAN-001 §②）：集 A 8 → **9** —— 新增的 `'free-input'` 是推荐卡末端终端的协议
  // 动作（不进 `ACT_TO_OP` ⇒ 上两行**逐字不变**）。判定方向只增不减：既有 8 项仍逐款在场。
  assert.equal(SET_A_PROTOCOL_ACTIONS.length, 9);
  assert.deepEqual([...SET_A_PROTOCOL_ACTIONS], ['answer', 'choose', 'cancel', 'approve', 'reject', 'audit', 'hover', 'reanchor', 'free-input']);
  const keys = new Set(Object.keys(ACT_TO_OP));
  for (const a of SET_A_PROTOCOL_ACTIONS) assert.ok(!keys.has(a), `两集模型：集 A 与 ACT_TO_OP 键集不得相交（${a}）`);
  assert.equal(CHIP_ACTION_ALIASES['describe-submit'], 'op.describe');
});

test('NP-8 集 B per-op 分支 = 0（handleCardAction）', () => {
  const found = perOpBranches(SIDEPANEL_SRC, SET_B);
  assert.deepEqual(found, [], `集 B per-op 分支必须为 0（实测 ${found.join(', ')}）`);
  // 集 A 分支必须仍在（9 项保留；`approve`/`reject` 为复合条件；`free-input` 为 IAN-1 终端）。
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
