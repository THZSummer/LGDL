/**
 * decision ② / FR-048 — controller sessionId, state projection and ask-bridge
 * cancellation (session-switch must not leave interactions hanging).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../src/background/controller.js';
import { createAskBridge } from '../src/background/ask-bridge.js';
import { buildStateMessage } from '../src/background/state-message.js';

test('controller: bindTab defaults sessionId to the origin and accepts a group id', () => {
  const c = createController();
  c.bindTab(1, 'https://a.test');
  assert.equal(c.get()?.sessionId, 'https://a.test');
  c.bindTab(2, 'https://a.test', 'group:g1');
  assert.equal(c.get()?.sessionId, 'group:g1');
});

test('controller: setSessionId re-points without touching origin/descriptor', () => {
  const c = createController();
  c.bindTab(1, 'https://a.test');
  c.setDiscovery('supported', { protocolVersion: '1.0', tools: [] } as never);
  c.setSessionId('group:g2');
  const s = c.get();
  assert.equal(s?.sessionId, 'group:g2');
  assert.equal(s?.origin, 'https://a.test');
  assert.ok(s?.descriptor);
});

test('controller: snapshot/restore keep the sessionId', () => {
  const c = createController();
  c.bindTab(1, 'https://a.test', 'group:g9');
  const snap = c.snapshot();
  assert.equal(snap.sessionId, 'group:g9');
  const c2 = createController();
  c2.restore({ ...snap, sessionId: snap.sessionId });
  assert.equal(c2.get()?.sessionId, 'group:g9');
  // Back-compat: a legacy snapshot without sessionId falls back to the origin.
  const c3 = createController();
  c3.restore({ tabId: 1, origin: 'https://b.test', invalidated: false, updatedAt: 1 });
  assert.equal(c3.get()?.sessionId, 'https://b.test');
});

test('state payload: the current session projection is carried (or explicit null)', async () => {
  const payload = await buildStateMessage({
    active: { tabId: 1, origin: 'https://a.test', invalidated: false },
    tools: [],
    isAuthorized: async () => true,
    session: { sessionId: 'group:g1', label: '工作（2 个域名）', origins: ['https://a.test', 'https://b.test'], authorized: true },
  });
  assert.equal(payload.session?.sessionId, 'group:g1');
  assert.equal(payload.session?.label, '工作（2 个域名）');

  const none = await buildStateMessage({ active: null, tools: [], isAuthorized: async () => false });
  assert.equal(none.session, null);
});

test('ask-bridge: cancelAll resolves every pending question as canceled (no hang)', async () => {
  let seq = 0;
  const bridge = createAskBridge({ requestId: (p) => `${p}-${(seq += 1)}`, deliver: () => undefined });
  const a = bridge.askUser({ kind: 'text', prompt: 'q1' } as never);
  const b = bridge.askUser({ kind: 'text', prompt: 'q2' } as never);
  assert.equal(bridge.pendingCount(), 2);
  const canceled = bridge.cancelAll();
  assert.equal(canceled, 2);
  assert.equal(bridge.pendingCount(), 0);
  assert.deepEqual(await a, { ok: false, canceled: true });
  assert.deepEqual(await b, { ok: false, canceled: true });
  assert.equal(bridge.cancelAll(), 0, 'cancelling again is a readable no-op');
});

test('ask-bridge: settle after cancelAll returns false (no double-resolve)', async () => {
  const bridge = createAskBridge({ requestId: (p) => `${p}-1`, deliver: () => undefined });
  const pending = bridge.askUser({ kind: 'text', prompt: 'q' } as never);
  bridge.cancelAll();
  assert.equal(bridge.settle('ask-1', { ok: true, value: 'late' }), false);
  assert.deepEqual(await pending, { ok: false, canceled: true });
});
