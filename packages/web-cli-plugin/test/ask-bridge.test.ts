import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAskBridge } from '../src/background/ask-bridge.js';

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
