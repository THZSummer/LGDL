import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, resolveConfirm } from '../src/ui/sidepanel/chat-state.js';

test('sidepanel state: appends entries in order and tracks pending', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'user', text: 'hello' });
  assert.equal(s.pending, true);
  s = reduce(s, { type: 'assistant', text: 'hi' });
  s = reduce(s, { type: 'tool', text: 'ran tool' });
  s = reduce(s, { type: 'error', text: 'boom' });
  assert.equal(s.entries.length, 4);
  assert.equal(s.entries[0].role, 'user');
  assert.equal(s.entries[3].kind, 'error');
  assert.equal(s.pending, false);
});

test('sidepanel state: navigation shows an explicit invalidation notice (EC-011)', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'state', origin: 'https://a.test', discoveryState: 'supported', invalidated: false });
  assert.equal(s.activeOrigin, 'https://a.test');
  s = reduce(s, { type: 'state', invalidated: true });
  assert.equal(s.invalidated, true);
  assert.match(s.notice ?? '', /导航/);
});

test('sidepanel confirm: pending confirm resolves to allow/deny', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'confirm', requestId: 'r1', summary: 'site.x write', risk: 'write' });
  assert.equal(s.confirm?.requestId, 'r1');
  assert.deepEqual(resolveConfirm(s, false), { requestId: 'r1', allow: false });
  assert.deepEqual(resolveConfirm(s, true), { requestId: 'r1', allow: true });
  s = reduce(s, { type: 'confirm-resolved', allow: false });
  assert.equal(s.confirm, null);
});

test('sidepanel confirm: timeout/cancel (no pending confirm) yields nothing to send = deny semantics', () => {
  const s = createInitialState();
  assert.equal(resolveConfirm(s, true), null);
});
