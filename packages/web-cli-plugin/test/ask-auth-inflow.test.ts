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

test('v4-3 常量单源：REF_ROUND_PREFIX / MAX_OPEN_ASKS / 三条 cancel reason', () => {
  assert.equal(REF_ROUND_PREFIX, 'ref-round-');
  assert.equal(MAX_OPEN_ASKS, 2);
  // `formatClock` stays the single `.ts` format.
  assert.match(formatClock(Date.UTC(2026, 0, 1, 12, 34, 56)), /^\d{2}:\d{2}:\d{2}$/);
});
