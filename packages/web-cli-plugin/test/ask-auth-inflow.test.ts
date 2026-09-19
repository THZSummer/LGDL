/**
 * V4-3 TASK-708 (leaf `specs-tree-v4-3-ask-auth-inflow`) — the **ask/auth inflow**
 * gate (node, zero Chromium).
 *
 * Five groups, each mapped to a TASK-701 / 705 / 706 / 708 acceptance clause:
 *
 *   ① 全终态矩阵（答 / 取消（用户/超时/取代）/ 批准 / 拒绝）—— 每条都有留痕
 *   ② `MAX_OPEN_ASKS = 2` 不变量 + 引用回合优先 + supersede 不静默
 *   ③ 无「永远处理中」：不答 + 不取消 + 等超时 ⇒ `pending` 回落
 *   ④ 零明文：正例（固化文案 / 系统行）通过；反向用例（URL query / 命令参数体）抛错
 *   ⑤ R1 语义等价：拾取覆盖后台 ask ⇒ `cancelled(superseded)` 留痕（不是静默覆盖）
 *
 * The gate drives the REAL reducer + projection (no shadow implementation).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASK_CANCEL_REASONS,
  MAX_OPEN_ASKS,
  REF_ROUND_PREFIX,
  arbitrateOpenAsks,
  formatClock,
  openAskEntries,
  project,
} from '../src/ui/sidepanel/stream-model.js';
import {
  createInitialState,
  reduce,
  resolveAsk,
  resolveConfirm,
  supersededAsk,
} from '../src/ui/sidepanel/chat-state.js';
import type { SidepanelState } from '../src/ui/sidepanel/chat-state.js';
import { ASK_COPY, assertStreamPlaintext, label } from '../src/ui/sidepanel/stream-plaintext.js';
import { authFixedText, decisionState } from '../src/ui/sidepanel/cards/auth.js';
import { digestEntryOf } from '../src/ui/sidepanel/stream-digest.js';

const OPEN = (s: SidepanelState) => openAskEntries(s.stream);
const TERMINALS = (s: SidepanelState) => project(s.stream, { includeAllSessions: true }).filter((v) => v.kind === 'askuser' || v.kind === 'auth');

/** Drive a background ask through the reducer (the real `ask-user-request` path). */
function ask(s: SidepanelState, requestId: string, options = ['甲', '乙', '丙']): SidepanelState {
  return reduce(s, { type: 'ask', requestId, kind: 'choice', prompt: `问题 ${requestId}`, options });
}

/** Drive a destructive confirmation through the reducer (the real `confirm-request` path). */
function confirm(s: SidepanelState, requestId: string, summary = 'tabs：关闭敏感标签页'): SidepanelState {
  return reduce(s, { type: 'confirm', requestId, summary });
}

// ── ① 全终态矩阵 ─────────────────────────────────────────────────────────────

test('v4-3 ① 六类终态：答 / 取消（用户·超时·取代）/ 批准 / 拒绝，逐类固化留痕', () => {
  // answered
  let s = ask(createInitialState(), 'a1');
  s = reduce(s, { type: 'ask-resolved', requestId: 'a1', answer: '甲', canceled: false });
  const answered = TERMINALS(s)[0];
  assert.equal(answered.terminal, 'answered');
  assert.equal(answered.payload.answer, '甲');

  // cancelled(user)
  s = ask(s, 'a2');
  const res = resolveAsk(s, '甲', false);
  assert.equal(res?.requestId, 'a2');
  s = reduce(s, { type: 'ask-resolved', requestId: 'a2', canceled: true, reason: 'user' });
  const userCancel = TERMINALS(s).find((v) => v.payload.requestId === 'a2')!;
  assert.equal(userCancel.terminal, 'cancelled');
  assert.equal(userCancel.payload.cancelReason, 'user');

  // cancelled(timeout) — driven by the turn-end projection
  s = ask(s, 'a3');
  s = reduce(s, { type: 'pending', value: false });
  const timeout = TERMINALS(s).find((v) => v.payload.requestId === 'a3')!;
  assert.equal(timeout.terminal, 'cancelled');
  assert.equal(timeout.payload.cancelReason, 'timeout');
  assert.ok(
    project(s.stream).some((v) => v.kind === 'system' && (v.payload.label ?? '').includes('超时')),
    '超时必须有一条系统行',
  );

  // approved / rejected
  s = confirm(s, 'c1');
  s = reduce(s, { type: 'confirm-resolved', requestId: 'c1', allow: true });
  const approved = TERMINALS(s).find((v) => v.kind === 'auth')!;
  assert.equal(approved.terminal, 'approved');
  s = confirm(s, 'c2');
  s = reduce(s, { type: 'confirm-resolved', requestId: 'c2', allow: false });
  const rejected = TERMINALS(s).filter((v) => v.kind === 'auth').at(-1)!;
  assert.equal(rejected.terminal, 'rejected');

  // The four-terminal vocabulary is closed and fully exercised.
  const observed = [...new Set(TERMINALS(s).map((v) => v.terminal))];
  assert.deepEqual(observed.sort(), ['answered', 'approved', 'cancelled', 'rejected']);
});

test('v4-3 ① 终态卡不可二次：终态投影的 `frozen` = true，后续事件不得改写', () => {
  let s = ask(createInitialState(), 'z1');
  s = reduce(s, { type: 'ask-resolved', requestId: 'z1', answer: '甲', canceled: false });
  const before = project(s.stream).length;
  // A late "second answer" must not rewrite the card (terminal freeze).
  s = reduce(s, { type: 'ask-resolved', requestId: 'z1', answer: '乙', canceled: false });
  assert.equal(project(s.stream).filter((v) => v.payload.requestId === 'z1').length, 1, '同一 requestId 只有一张卡');
  assert.equal(project(s.stream).find((v) => v.payload.requestId === 'z1')?.payload.answer, '甲', '终态冻结不得被后续事件改写');
  assert.ok(project(s.stream).length >= before);
});

// ── ② 上限 + 仲裁 ────────────────────────────────────────────────────────────

test('v4-3 ② MAX_OPEN_ASKS=2：第 3 张到达必 supersede 最旧并留痕，openAsks 恒 ≤ 2', () => {
  assert.equal(MAX_OPEN_ASKS, 2);
  let s = ask(createInitialState(), 'x1');
  s = ask(s, 'x2');
  assert.equal(OPEN(s).length, 2);
  s = ask(s, 'x3');
  assert.equal(OPEN(s).length, 2, '第 3 张到达后 openAsks 必须仍 ≤ 2');
  const x1 = TERMINALS(s).find((v) => v.payload.requestId === 'x1')!;
  assert.equal(x1.terminal, 'cancelled');
  assert.equal(x1.payload.cancelReason, 'superseded');
  assert.ok(
    project(s.stream).some((v) => v.kind === 'system' && (v.payload.label ?? '').includes('取代')),
    'supersede 不得静默：必须有一条系统行',
  );
});

test('v4-3 ② 引用回合优先：ref-round- 到达先 supersede 全部后台 ask', () => {
  let s = ask(createInitialState(), 'bg1');
  s = ask(s, 'bg2');
  s = ask(s, `${REF_ROUND_PREFIX}ref_9`);
  const ids = OPEN(s).map((e) => e.requestId);
  assert.deepEqual(ids, [`${REF_ROUND_PREFIX}ref_9`], '两张后台 ask 必须都被引用回合取代');
  for (const rid of ['bg1', 'bg2']) {
    const card = TERMINALS(s).find((v) => v.payload.requestId === rid)!;
    assert.equal(card.payload.cancelReason, 'superseded');
  }
});

test('v4-3 ② 仲裁是纯函数（不改变输入 state）且遵守上限', () => {
  let s = ask(createInitialState(), 'p1');
  s = ask(s, 'p2');
  const snapshot = s.stream.events.length;
  const picked = arbitrateOpenAsks(s.stream, 'p3');
  assert.equal(picked.length, 1);
  assert.equal(s.stream.events.length, snapshot, '仲裁不得写入');
  assert.equal(arbitrateOpenAsks(s.stream, 'p3')[0].requestId, 'p1');
});

// ── ③ 无「永远处理中」 ───────────────────────────────────────────────────────

test('v4-3 ③ 不答 + 不取消 + 等超时 ⇒ pending 最终回落（无出口状态不存在）', () => {
  let s = reduce(createInitialState(), { type: 'user', text: '开始' });
  s = ask(s, 't1');
  assert.equal(s.pending, true);
  assert.equal(OPEN(s).length, 1);
  // The turn ends (60 s ask-bridge timeout → the tool returns → `done`).
  s = reduce(s, { type: 'pending', value: false });
  assert.equal(s.pending, false, 'pending 必须能回落');
  assert.equal(OPEN(s).length, 0, '超时后无未终态卡');
  assert.equal(TERMINALS(s).find((v) => v.payload.requestId === 't1')?.payload.cancelReason, 'timeout');
});

test('v4-3 ③ 会话切换：未终态卡结算 cancelled(superseded) 且 pending=false', () => {
  let s = ask(createInitialState(), 's1');
  s = reduce(s, { type: 'history', entries: [], sessionId: 'https://next.test', sessionLabel: 'next' });
  assert.equal(s.pending, false);
  assert.equal(OPEN(s).length, 0);
  assert.equal(TERMINALS(s).find((v) => v.payload.requestId === 's1')?.payload.cancelReason, 'superseded');
});

// ── ④ 零明文 ─────────────────────────────────────────────────────────────────

test('v4-3 ④ 零明文正例：固化文案 / 系统行全部通过白名单扫描', () => {
  for (const copy of Object.values(ASK_COPY)) assert.doesNotThrow(() => assertStreamPlaintext(copy));
  assert.equal(label(['已答', '甲']), '已答 · 甲');
  let s = ask(createInitialState(), 'n1');
  s = reduce(s, { type: 'ask-resolved', requestId: 'n1', answer: '甲', canceled: false });
  // Every persisted/whitelisted string a row exposes must pass the scan.
  for (const view of project(s.stream)) {
    if (view.payload.label !== undefined) assert.doesNotThrow(() => assertStreamPlaintext(view.payload.label!));
  }
});

test('v4-3 ④ 反向用例：URL query / 命令参数体 / 密钥 / 原始标记 ⇒ 必须抛错', () => {
  assert.throws(() => assertStreamPlaintext('https://a.test/x?token=abc'), /URL query/);
  assert.throws(() => assertStreamPlaintext('--password=secret'), /命令参数/);
  assert.throws(() => assertStreamPlaintext('sk-ABCDEFGHIJKL'), /密钥/);
  assert.throws(() => assertStreamPlaintext('<b>hi</b>'), /原始标记/);
  assert.throws(() => label(['x', 'sk-ABCDEFGHIJKL']), /密钥/, 'label 工厂必须同样 fail-closed');
});

test('v4-3 ④ 摘要白名单：答案文本永不落摘要（结构上无自由文本字段）', () => {
  let s = ask(createInitialState(), 'd1');
  s = reduce(s, { type: 'ask-resolved', requestId: 'd1', answer: '我的密码是 hunter2', canceled: false });
  const card = project(s.stream).find((v) => v.payload.requestId === 'd1')!;
  assert.equal(card.payload.answer, '我的密码是 hunter2', '流内可显示用户自己的话');
  // The digest projection never reads `answer` — the persisted whitelist has no such
  // field, so the user's own answer structurally cannot reach storage.
  const entry = digestEntryOf({
    cardId: card.cardId, kind: card.kind, ts: card.ts, firstSeq: card.firstSeq, payload: card.payload,
    ...(card.terminal !== undefined ? { terminal: card.terminal } : {}),
  });
  assert.equal('answer' in entry, false);
  assert.ok(!Object.values(entry).includes('我的密码是 hunter2'), '摘要不得含答案明文');
  assert.equal(entry.askRequestId, 'd1', '摘要只存 askRequestId（业务键）');
});

// ── ⑤ R1 语义等价 ────────────────────────────────────────────────────────────

test('v4-3 ⑤ R1 等价：拾取覆盖后台 ask ⇒ cancelled(superseded) 留痕（不是静默覆盖）', () => {
  let s = ask(createInitialState(), 'ask-7');
  const before = s.stream.events.length;
  const sup = supersededAsk(s);
  assert.equal(sup?.requestId, 'ask-7');
  assert.equal(sup?.mustTrace, true);
  assert.ok(sup?.cardId, '必须给出被取代卡 id');
  // The caller dispatches the terminal with `reason:'superseded'`.
  s = reduce(s, { type: 'ask-resolved', requestId: 'ask-7', canceled: true, reason: 'superseded' });
  assert.ok(s.stream.events.length > before, '取代必须追加事件（不是静默覆盖）');
  const card = TERMINALS(s).find((v) => v.payload.requestId === 'ask-7')!;
  assert.equal(card.terminal, 'cancelled');
  assert.equal(card.payload.cancelReason, 'superseded');
  // Behavioural equivalence: the background still learns it was canceled (fail-closed).
  const res = resolveAsk(ask(createInitialState(), 'ask-8'), undefined, true);
  assert.deepEqual(res, { requestId: 'ask-8', canceled: true });
  // The panel's own reference round is never superseded (R1's discriminator kept).
  let r = ask(createInitialState(), `${REF_ROUND_PREFIX}ref_1`);
  assert.equal(supersededAsk(r), null);
});

test('v4-3 常量单源：REF_ROUND_PREFIX / MAX_OPEN_ASKS / 四条 cancel reason', () => {
  assert.equal(REF_ROUND_PREFIX, 'ref-round-');
  assert.equal(MAX_OPEN_ASKS, 2);
  // I-06: the error-ended turn needs its own reason (never a fake timeout).
  assert.deepEqual([...ASK_CANCEL_REASONS].sort(), ['aborted', 'superseded', 'timeout', 'user']);
  // `formatClock` stays the single `.ts` format.
  assert.match(formatClock(Date.UTC(2026, 0, 1, 12, 34, 56)), /^\d{2}:\d{2}:\d{2}$/);
});

// ── ⑥ BLOCK-01 回归：auth 卡的 cancelled 终态绝不得渲染成「已批准」────────────

test('BLOCK-01 假批准回归：三条真实路径都造出 auth cancelled ⇒ 渲染「已取消」而非「已批准」', () => {
  const authViewOf = (s: SidepanelState, requestId: string) =>
    TERMINALS(s).find((v) => v.kind === 'auth' && v.payload.requestId === requestId)!;

  // ① 会话切换（chat-state 的 history 分支）
  let a = confirm(createInitialState(), 'cf-1');
  a = reduce(a, { type: 'history', entries: [], sessionId: 'https://next.test', sessionLabel: 'next' });
  const switched = authViewOf(a, 'cf-1');
  assert.equal(switched.terminal, 'cancelled');
  assert.equal(switched.payload.cancelReason, 'superseded');
  assert.equal(decisionState(switched), 'cancelled', '会话切换后不得渲染成 pending/approved');
  assert.equal(authFixedText(switched), ASK_COPY.authCancelled);
  assert.notEqual(authFixedText(switched), ASK_COPY.approved, '取消绝不得渲染「已批准」');

  // ② 被新 ask/上限取代（stream-model 的仲裁）
  let b = confirm(createInitialState(), 'cf-2');
  b = confirm(b, 'cf-3');
  b = confirm(b, 'cf-4');
  const superseded = authViewOf(b, 'cf-2');
  assert.equal(superseded.terminal, 'cancelled');
  assert.equal(superseded.payload.cancelReason, 'superseded');
  assert.equal(decisionState(superseded), 'cancelled');
  assert.equal(authFixedText(superseded), ASK_COPY.authCancelled);

  // ③ 回合结束（真实 60 s 到期投影）
  let c = confirm(createInitialState(), 'cf-5');
  c = reduce(c, { type: 'pending', value: false });
  const timedOut = authViewOf(c, 'cf-5');
  assert.equal(timedOut.terminal, 'cancelled');
  assert.equal(timedOut.payload.cancelReason, 'timeout');
  assert.equal(decisionState(timedOut), 'cancelled');
  assert.equal(authFixedText(timedOut), ASK_COPY.authCancelled);

  // 正向对照（非恒真）：真正批准/拒绝的卡仍然按原语义渲染。
  const approvedState = confirm(createInitialState(), 'cf-6');
  const approved = authViewOf(reduce(approvedState, { type: 'confirm-resolved', requestId: 'cf-6', allow: true }), 'cf-6');
  assert.equal(decisionState(approved), 'approved');
  assert.equal(authFixedText(approved), ASK_COPY.approved);
});

test('BLOCK-01 反向：`cancelled` 不是 `auth` 之外的终态语义 —— ask 卡仍走 answeredState', () => {
  let s = ask(createInitialState(), 'b1');
  s = reduce(s, { type: 'ask-resolved', requestId: 'b1', canceled: true, reason: 'user' });
  const card = TERMINALS(s).find((v) => v.payload.requestId === 'b1')!;
  assert.equal(card.terminal, 'cancelled');
  assert.equal(authFixedText(card), ASK_COPY.authCancelled, '同一投影上两个渲染器读同一份文案源（单源）');
});

// ── ⑦ BLOCK-02 回归：回合结束 ≠ 60 s 超时（面板自有 ask 不被误结算）────────

test('BLOCK-02 真超时：后台 ask（有 60 s ask-bridge）在回合结束时结算 cancelled(timeout)', () => {
  let s = ask(createInitialState(), 'bg-1');
  s = reduce(s, { type: 'pending', value: false });
  const card = TERMINALS(s).find((v) => v.payload.requestId === 'bg-1')!;
  assert.equal(card.terminal, 'cancelled');
  assert.equal(card.payload.cancelReason, 'timeout', '后台 ask 的回合结束 = 真实 60 s 到期的可观测形态');
  assert.ok(
    project(s.stream).some((v) => v.kind === 'system' && (v.payload.label ?? '').includes('超时')),
    '真实超时必须留一条超时系统行',
  );
});

test('BLOCK-02 回归：面板自有 ref-round ask 在回合结束时**不结算、不写假超时**，且留痕', () => {
  // repro1.mjs 的同源路径：后台 ask → 被取代 → 引用回合 ask → done
  let s = ask(createInitialState(), 'ask-7');
  const sup = supersededAsk(s);
  s = reduce(s, { type: 'ask-resolved', requestId: sup!.requestId, canceled: true, reason: 'superseded' });
  s = reduce(s, {
    type: 'ask',
    requestId: `${REF_ROUND_PREFIX}ref_1`,
    kind: 'choice',
    prompt: '已捕获引用 ref_1：要用它做什么？',
    options: ['纳入下一步', '作为操作目标', '先看证据'],
  });
  assert.equal(OPEN(s).length, 1);
  // The background turn ends while the panel-owned question is on screen.
  s = reduce(s, { type: 'pending', value: false });

  const refCard = TERMINALS(s).find((v) => v.payload.requestId === `${REF_ROUND_PREFIX}ref_1`)!;
  assert.equal(refCard.frozen, false, '面板自有 ask 不随回合结束冻结（否则拾取 → 选择用途的链路断掉）');
  assert.equal(refCard.payload.cancelReason, undefined, '不得写入任何假取消原因');
  assert.equal(OPEN(s).length, 1, '卡必须仍可答');
  const labels = project(s.stream).filter((v) => v.kind === 'system').map((v) => v.payload.label ?? '');
  assert.ok(!labels.some((l) => l.includes('超时')), '绝不得出现「提问超时未答」的系统行（假超时）');
  assert.ok(labels.some((l) => l.includes('引用提问仍在等待你的选择')), '回合结束必须留下可读痕迹（留痕，不是静默）');
});

test('BLOCK-02 反向：会话切换时面板自有 ask 仍按 cancelled(superseded) 留痕结算（口径未放宽）', () => {
  let s = ask(createInitialState(), `${REF_ROUND_PREFIX}ref_2`);
  s = reduce(s, { type: 'history', entries: [], sessionId: 'https://next.test', sessionLabel: 'next' });
  assert.equal(OPEN(s).length, 0);
  const card = TERMINALS(s).find((v) => v.payload.requestId === `${REF_ROUND_PREFIX}ref_2`)!;
  assert.equal(card.payload.cancelReason, 'superseded');
});

// ── ⑧ I-06 / I-07 回归：error 收尾结算 + requestId fail-closed ─────────────

test('I-06 回归：回合以 `error` 收尾时未终态的后台 ask 按 `aborted` 结算（不是不管，也不是假超时）', () => {
  let s = ask(createInitialState(), 'er-1');
  s = reduce(s, { type: 'error', text: 'LLM 失败' });
  assert.equal(s.pending, false);
  assert.equal(OPEN(s).length, 0, 'error 收尾后不得留下未终态卡');
  const card = TERMINALS(s).find((v) => v.payload.requestId === 'er-1')!;
  assert.equal(card.terminal, 'cancelled');
  assert.equal(card.payload.cancelReason, 'aborted');
  const labels = project(s.stream).filter((v) => v.kind === 'system').map((v) => v.payload.label ?? '');
  assert.ok(labels.some((l) => l.includes('回合因错误结束')), 'error 路径必须有自己的可读留痕');
  assert.ok(!labels.some((l) => l.includes('超时')), 'error 不是超时（原因不得混用）');
});

test('I-07 回归：未知 requestId / 已终态卡 ⇒ 结算必须 fail-closed（不得静默结错卡）', () => {
  // ① 未知 requestId：什么也不结算
  let s = ask(createInitialState(), 'ok-1');
  const ghost = reduce(s, { type: 'ask-resolved', requestId: 'ghost', canceled: true, reason: 'user' });
  assert.equal(OPEN(ghost).length, 1, '未知 requestId 不得回退到「最后一张同 kind 的卡」');
  assert.equal(ghost.stream.events.length, s.stream.events.length, '未知 requestId 不得追加任何事件');

  // ② 已终态卡的 requestId：不得改结算另一张未终态卡
  let t = ask(createInitialState(), 'ok-2');
  t = ask(t, 'ok-3');
  t = reduce(t, { type: 'ask-resolved', requestId: 'ok-2', answer: '甲', canceled: false });
  assert.equal(OPEN(t).length, 1);
  const late = reduce(t, { type: 'ask-resolved', requestId: 'ok-2', canceled: true, reason: 'user' });
  assert.equal(OPEN(late).length, 1, '已终态卡的 requestId 不得把 ok-3 结掉');
  const ok3 = TERMINALS(late).find((v) => v.payload.requestId === 'ok-3')!;
  assert.equal(ok3.frozen, false);
});

test('I-07 回归：`clearAsk` 的 kind 集遍历契约（askuser 与 auth 都必须能被结算）', () => {
  // 模型侧等价：显式命名 requestId 的结算必须覆盖两种 kind。
  let s = ask(createInitialState(), 'ca-1');
  s = confirm(s, 'ca-2');
  assert.equal(OPEN(s).length, 2);
  s = reduce(s, { type: 'ask-resolved', requestId: 'ca-1', canceled: true, reason: 'user' });
  assert.equal(OPEN(s).length, 1);
  s = reduce(s, { type: 'confirm-resolved', requestId: 'ca-2', allow: false });
  assert.equal(OPEN(s).length, 0, 'auth 卡必须由 confirm-resolved 结算（ask-resolved 永远结不了它）');
});
