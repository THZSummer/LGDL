import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, resolveAsk, resolveConfirm } from '../src/ui/sidepanel/chat-state.js';
import { CAPABILITY_BOUNDARY, CONSENT_RISKS, consentSummary } from '../src/ui/sidepanel/sidepanel.js';
import {
  BOTTOM_THRESHOLD_PX,
  createScrollFollow,
  distanceFromBottom,
  isNearBottom,
} from '../src/ui/sidepanel/scroll-policy.js';

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

test('TASK-033: a repeated invalidated refresh does not clobber a newer notice', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'state', origin: 'https://a.test', invalidated: true });
  assert.match(s.notice ?? '', /导航/);
  // The user acts (authorize receipt) …
  s = reduce(s, { type: 'notice', text: '已授权 https://a.test' });
  // … then the automatic probe push refreshes state with the SAME invalidated bit.
  s = reduce(s, { type: 'state', origin: 'https://a.test', invalidated: true });
  assert.equal(s.notice, '已授权 https://a.test', 'stale invalidation must not overwrite the receipt');
  // A genuine false→true transition still announces it.
  s = reduce(s, { type: 'state', invalidated: false });
  s = reduce(s, { type: 'state', invalidated: true });
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

// ── TASK-023: tool-card metadata / command entries / trust ──────────────────

test('TASK-023: tool actions carry name/status/duration into the entry', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'tool', text: '{"nodes":[]}', tool: 'site_notes-list', ok: true, ms: 318 });
  const tool = s.entries[0];
  assert.equal(tool.role, 'tool');
  assert.equal(tool.kind, 'tool');
  assert.equal(tool.tool, 'site_notes-list');
  assert.equal(tool.ok, true);
  assert.equal(tool.ms, 318);
});

test('TASK-023: tool metadata is optional (legacy/notice tool entries stay valid)', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'tool', text: '⚠ 重试中…' });
  const tool = s.entries[0];
  assert.equal(tool.role, 'tool');
  assert.equal('tool' in tool, false);
  assert.equal('ok' in tool, false);
  assert.equal('ms' in tool, false);
});

test('TASK-023: command entries render as assistant/command (not a chat bubble)', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'command', text: 'site_notes-list --doc main' });
  const cmd = s.entries[0];
  assert.equal(cmd.role, 'assistant');
  assert.equal(cmd.kind, 'command');
  assert.equal(cmd.text, 'site_notes-list --doc main');
});

test('TASK-023: trust is tracked through the state action', () => {
  let s = createInitialState();
  s = reduce(s, { type: 'state', origin: 'https://a.test', authorized: true, trust: 'trusted' });
  assert.equal(s.trust, 'trusted');
  s = reduce(s, { type: 'state', trust: 'untrusted' });
  assert.equal(s.trust, 'untrusted');
  // a state update without trust must not silently flip the previous value
  s = reduce(s, { type: 'state', authorized: false });
  assert.equal(s.trust, 'untrusted');
});

// ── scroll-follow regression: messages must auto-scroll to the newest ─────────

test('scroll: the bottom threshold is generous (>=48px), not the old 8/24px', () => {
  assert.ok(BOTTOM_THRESHOLD_PX >= 48, `threshold=${BOTTOM_THRESHOLD_PX}`);
  assert.equal(isNearBottom({ scrollHeight: 1000, scrollTop: 660, clientHeight: 300 }), true, 'residual 40 ≤ 48');
  assert.equal(isNearBottom({ scrollHeight: 1000, scrollTop: 652, clientHeight: 300 }), true, 'residual exactly 48');
  assert.equal(isNearBottom({ scrollHeight: 1000, scrollTop: 651, clientHeight: 300 }), false, 'residual 49 > 48');
});

test('scroll: distance from bottom clamps over-scroll to 0', () => {
  assert.equal(distanceFromBottom({ scrollHeight: 1000, scrollTop: 750, clientHeight: 300 }), 0);
  assert.equal(distanceFromBottom({ scrollHeight: 1000, scrollTop: 500, clientHeight: 300 }), 200);
});

test('scroll: user send always follows to the bottom, even when scrolled far up', () => {
  const p = createScrollFollow();
  p.observe({ scrollHeight: 5000, scrollTop: 0, clientHeight: 300 }); // reading at the top
  assert.equal(p.anchored, false);
  p.userSent();
  assert.equal(p.shouldFollow(), true, 'send → unconditional pin');
  // forced follow is one-shot; afterwards the (still true) anchor governs
  assert.equal(p.shouldFollow(), true);
});

test('scroll: at the bottom → appended content follows', () => {
  const p = createScrollFollow();
  p.observe({ scrollHeight: 1000, scrollTop: 670, clientHeight: 300 }); // residual 30
  assert.equal(p.anchored, true);
  assert.equal(p.shouldFollow(), true);
});

test('scroll: scrolled up → append does not jump, and the hint is shown', () => {
  const p = createScrollFollow();
  p.observe({ scrollHeight: 5000, scrollTop: 0, clientHeight: 300 });
  assert.equal(p.anchored, false, 'anchor lost → 「回到底部」shown');
  assert.equal(p.shouldFollow(), false, 'append must not steal the reading position');
  assert.equal(p.shouldFollow(), false, 'stays stable across repeated appends');
});

test('scroll: returning to the bottom re-anchors', () => {
  const p = createScrollFollow();
  p.observe({ scrollHeight: 5000, scrollTop: 0, clientHeight: 300 });
  assert.equal(p.anchored, false);
  p.returnedToBottom();
  assert.equal(p.anchored, true);
  assert.equal(p.shouldFollow(), true);
});

test('scroll: a fresh panel starts anchored (empty list)', () => {
  const p = createScrollFollow();
  assert.equal(p.anchored, true);
  assert.equal(p.shouldFollow(), true);
});
