/**
 * decision ② / FR-048 — side-panel session view-model + reducer unit tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce } from '../src/ui/sidepanel/chat-state.js';
import { currentSessionLabel, historyEntries, sortSessions } from '../src/ui/sidepanel/view-model.js';

test('session view: currentSessionLabel is readable for group / origin / unbound', () => {
  assert.match(currentSessionLabel(null), /无活跃站点/);
  assert.equal(currentSessionLabel({ sessionId: 'https://a.test', label: 'https://a.test' }), '会话：https://a.test');
  assert.equal(
    currentSessionLabel({ sessionId: 'group:g1', label: '工作（2 个域名）', origins: [] }),
    '会话：工作（2 个域名）',
  );
});

test('session view: sortSessions pins the current session first then recency', () => {
  const list = [
    { sessionId: 'a', label: 'a', origins: [], lastActiveAt: 10 },
    { sessionId: 'b', label: 'b', origins: [], lastActiveAt: 30 },
    { sessionId: 'c', label: 'c', origins: [], lastActiveAt: 20 },
  ];
  assert.deepEqual(sortSessions(list, 'c').map((s) => s.sessionId), ['c', 'b', 'a']);
  assert.deepEqual(sortSessions(list, null).map((s) => s.sessionId), ['b', 'c', 'a']);
  assert.deepEqual(sortSessions(undefined, 'x'), []);
});

test('session view: historyEntries whitelists roles and drops empties', () => {
  const entries = historyEntries([
    { role: 'user', text: 'hi' },
    { role: 'assistant', text: '' },
    { role: 'tool', text: 'out' },
    { role: 'hacker', text: 'x' },
  ]);
  assert.deepEqual(entries, [
    { role: 'user', text: 'hi' },
    { role: 'tool', text: 'out' },
  ]);
});

test('session reducer: history replaces the whole conversation and never mixes sessions', () => {
  let state = createInitialState();
  state = reduce(state, { type: 'user', text: 'session-A-msg' });
  state = reduce(state, { type: 'assistant', text: 'session-A-reply' });
  assert.equal(state.entries.length, 2);

  state = reduce(state, {
    type: 'history',
    entries: [
      { role: 'user', text: 'session-B-msg' },
      { role: 'assistant', text: 'session-B-reply' },
    ],
  });
  assert.deepEqual(state.entries.map((e) => e.text), ['session-B-msg', 'session-B-reply']);
  assert.equal(state.pending, false, 'a switch clears any pending indicator');
  assert.deepEqual(state.entries.map((e) => e.id), [1, 2], 'ids restart so re-render is deterministic');
  assert.equal(state.nextId, 3);
});

test('session reducer: an empty history yields the empty-log state', () => {
  let state = createInitialState();
  state = reduce(state, { type: 'user', text: 'x' });
  state = reduce(state, { type: 'history', entries: [] });
  assert.equal(state.entries.length, 0);
  assert.equal(state.nextId, 1);
});
