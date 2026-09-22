import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAskBridge } from '../src/background/ask-bridge.js';
import { lateSettleOutcome, settleOutcome } from '../src/background/ask-bridge.js';

const PKG = fileURLToPath(new URL('../../', import.meta.url));

const question = { kind: 'text' as const, prompt: '继续吗？' };

test('ask-bridge: delivers a question and resolves with the user answer (FR-017 / R7)', async () => {
  const delivered: Array<{ rid: string; prompt: string }> = [];
  const bridge = createAskBridge({
    requestId: () => 'ask-1',
    deliver: (rid, q) => {
      delivered.push({ rid, prompt: q.prompt });
    },
  });
  const promise = bridge.askUser(question);
  assert.equal(bridge.pendingCount(), 1);
  assert.deepEqual(delivered, [{ rid: 'ask-1', prompt: '继续吗？' }]);
  assert.equal(bridge.settle('ask-1', { ok: true, value: '是' }), true);
  assert.deepEqual(await promise, { ok: true, value: '是' });
  assert.equal(bridge.pendingCount(), 0);
});

test('ask-bridge: timeout resolves as canceled (fail-closed, no hang)', async () => {
  const bridge = createAskBridge({
    requestId: () => 'ask-2',
    deliver: () => {},
    timeoutMs: 1,
  });
  const answer = await bridge.askUser(question);
  assert.equal(answer.ok, false);
  assert.equal(answer.canceled, true);
  assert.equal(bridge.pendingCount(), 0);
});

test('ask-bridge: a delivery failure resolves as canceled', async () => {
  const bridge = createAskBridge({
    requestId: () => 'ask-3',
    deliver: () => Promise.reject(new Error('no side panel')),
  });
  const answer = await bridge.askUser(question);
  assert.equal(answer.canceled, true);
});

test('ask-bridge: settling an unknown request is refused readably', () => {
  const bridge = createAskBridge({ requestId: () => 'ask-4', deliver: () => {} });
  assert.equal(bridge.settle('missing', { ok: true, value: 'x' }), false);
  assert.equal(bridge.pendingCount(), 0);
});

/* ── V5.5-1 TASK-V55-117（ADR-V55-004 §3 · FR-SELF-028 · EC-SELF-008）──────────
 *
 * 后台 ask **迟到**作答（回合已结束）过去得到裸 `errorResponse` ⇒ 用户的答案被静默丢弃。
 * 现在：「未命中」= **事实**（`{settled:false, late:true}`），不是错误；面板侧据此固化事实
 * 并给出可达 next。**不伪造「接住」**（`settled` 仍如实为 `false`）。
 * ──────────────────────────────────────────────────────────────────────────── */

test('ask-bridge: 迟到作答是**事实**不是错误（late outcome，零裸 errorResponse）', () => {
  const bridge = createAskBridge({ requestId: () => 'ask-late', deliver: () => {} });
  // 回合已结束（无 pending）⇒ 迟到口径。
  assert.deepEqual(settleOutcome(bridge, 'ask-late', { ok: true, value: '原地翻译为中文' }), {
    settled: false,
    late: true,
    requestId: 'ask-late',
  });
  assert.deepEqual(lateSettleOutcome('ask-late'), { settled: false, late: true, requestId: 'ask-late' });
  // 真接住 ⇒ settled:true, late:false（对照：判据不得恒为 late）。
  const pending = bridge.askUser({ kind: 'text', prompt: '继续吗？' });
  assert.deepEqual(settleOutcome(bridge, 'ask-late', { ok: true, value: '是' }), { settled: true, late: false, requestId: 'ask-late' });
  assert.equal(bridge.pendingCount(), 0);
  void Promise.resolve(pending).then((answer) => assert.deepEqual(answer, { ok: true, value: '是' }));
});

test('ask-bridge: 迟到路径**不记「已答」**（口径④）且 SW 不再返回裸错误', () => {
  // ① 迟到 outcome 的 `settled === false` ⇒ 面板只会固化事实、不写 `answered-bg` 终态。
  assert.equal(lateSettleOutcome('r1').settled, false);
  // ② SW 侧接线：`ask-user-response` 必须经 `settleOutcome` 回 okResponse（不得裸 errorResponse）。
  const sw = readFileSync(join(PKG, 'src/background/service-worker.ts'), 'utf8');
  const branch = sw.slice(sw.indexOf("case 'ask-user-response':"), sw.indexOf('default:\n      return errorResponse(`未知消息类型'));
  assert.match(branch, /settleOutcome\(s\.askBridge, rid,/, 'SW 必须经 settleOutcome 收口');
  assert.ok(!/errorResponse\(`无待回答的 ask-user 请求/.test(sw), '迟到不得再走裸 errorResponse（答案不得被静默丢弃）');
  assert.match(branch, /late: outcome\.late/, '响应必须如实回 late 事实');
  // ③ 不伪造「接住」：`settled` 直接来自 settle 的返回值。
  assert.match(branch, /settled: outcome\.settled/);
});
