import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, resolveAsk, resolveConfirm } from '../src/ui/sidepanel/chat-state.js';
import { CAPABILITY_BOUNDARY, CONSENT_RISKS, consentSummary } from '../src/ui/sidepanel/sidepanel.js';

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

test('sidepanel ask-user: pending question resolves with answer or cancel (FR-017 / R7)', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'ask', requestId: 'a1', kind: 'choice', prompt: '继续吗？', options: ['是', '否'] });
  assert.equal(s.ask?.requestId, 'a1');
  assert.deepEqual(s.ask?.options, ['是', '否']);
  assert.deepEqual(resolveAsk(s, '是', false), { requestId: 'a1', value: '是', canceled: false });
  // cancel / empty answer → canceled (never a silent default)
  assert.deepEqual(resolveAsk(s, undefined, true), { requestId: 'a1', canceled: true });
  assert.deepEqual(resolveAsk(s, '   ', false), { requestId: 'a1', canceled: true });
  s = reduce(s, { type: 'ask-resolved' });
  assert.equal(s.ask, null);
  assert.equal(resolveAsk(s, 'x', false), null);
});

test('sidepanel consent: informed-consent risks and capability boundary are readable (FR-031/NFR-008)', () => {
  const risks = CONSENT_RISKS.join('\n');
  assert.match(risks, /账号风控/);
  assert.match(risks, /条款/);
  assert.match(risks, /数据外泄/);

  const boundary = CAPABILITY_BOUNDARY.join('\n');
  assert.match(boundary, /授权/);
  assert.match(boundary, /二次确认/);
  assert.match(boundary, /fail-closed|拒绝/);

  const summary = consentSummary();
  assert.match(summary, /知情同意/);
  assert.match(summary, /账号风控/);
});
