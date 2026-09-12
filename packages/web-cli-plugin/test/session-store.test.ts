/**
 * decision ② / FR-048 — multi-session store unit tests.
 *
 * Covers: session-key derivation (origin / group), per-session history isolation
 * (no串台), grouping (merge / remove / delete), the LRU cap with readable
 * eviction, bounded history and persistence.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatTurn } from '@lgdl/web-cli-base';
import type { PluginKv } from '../src/security/origin-store.js';
import {
  MAX_SESSIONS,
  SESSION_STORE_KEY,
  createSessionStore,
  normalizeSessionOrigin,
  projectHistory,
  sessionIdForOrigin,
  sessionLabel,
} from '../src/background/session-store.js';

function memoryKv(): PluginKv & { raw: Map<string, unknown> } {
  const raw = new Map<string, unknown>();
  return {
    raw,
    async get<T>(key: string) {
      return raw.get(key) as T | undefined;
    },
    async set(key: string, value: unknown) {
      raw.set(key, value);
    },
    async remove(key: string) {
      raw.delete(key);
    },
  };
}

const user = (c: string): ChatTurn => ({ role: 'user', content: c });
const assistant = (c: string): ChatTurn => ({ role: 'assistant', content: c });

// ── session key derivation ───────────────────────────────────────────────────

test('session-store: default session id is the origin; grouping switches it to group:<id>', () => {
  assert.equal(sessionIdForOrigin('https://a.test', []), 'https://a.test');
  const groups = [{ groupId: 'g1', name: '工作', origins: ['https://a.test', 'https://b.test'], createdAt: 1 }];
  assert.equal(sessionIdForOrigin('HTTPS://A.test/', groups), 'group:g1');
  assert.equal(sessionIdForOrigin('https://c.test', groups), 'https://c.test');
});

test('session-store: normalizeSessionOrigin is stable for grouping/lookup', () => {
  assert.equal(normalizeSessionOrigin(' https://A.test/ '), 'https://a.test');
});

// ── per-origin isolation ─────────────────────────────────────────────────────

test('session-store: each origin gets its own session with an isolated history (no串台)', async () => {
  const kv = memoryKv();
  const store = createSessionStore(kv, { now: () => 1000 });
  await store.load();

  const a = await store.activate('https://a.test');
  const b = await store.activate('https://b.test');
  assert.notEqual(a.session.sessionId, b.session.sessionId);

  await store.setHistory(a.session.sessionId, [user('a-1'), assistant('a-2')]);
  await store.setHistory(b.session.sessionId, [user('b-1')]);

  assert.deepEqual(
    store.historyOf(a.session.sessionId).map((t) => t.content),
    ['a-1', 'a-2'],
  );
  assert.deepEqual(
    store.historyOf(b.session.sessionId).map((t) => t.content),
    ['b-1'],
  );

  await store.clearHistory(a.session.sessionId);
  assert.equal(store.historyOf(a.session.sessionId).length, 0);
  assert.equal(store.historyOf(b.session.sessionId).length, 1, 'clearing A must not touch B');
});

test('session-store: same origin re-activates the same session (同域名共享)', async () => {
  const store = createSessionStore(memoryKv(), { now: () => 1000 });
  await store.load();
  const first = await store.activate('https://a.test');
  await store.setHistory(first.session.sessionId, [user('shared')]);
  const again = await store.activate('https://a.test');
  assert.equal(again.session.sessionId, first.session.sessionId);
  assert.deepEqual(store.historyOf(again.session.sessionId).map((t) => t.content), ['shared']);
  assert.equal(store.list().length, 1);
});

// ── grouping ─────────────────────────────────────────────────────────────────

test('session-store: merging origins into a group shares one session/history, keeps them reversible', async () => {
  const store = createSessionStore(memoryKv(), { now: () => 1000 });
  await store.load();
  const a = await store.activate('https://a.test');
  const b = await store.activate('https://b.test');
  await store.setHistory(a.session.sessionId, [user('a-own')]);
  await store.setHistory(b.session.sessionId, [user('b-own')]);

  const group = await store.createGroup('工作');
  const merged = await store.addOriginToGroup(group.groupId, 'https://a.test');
  await store.addOriginToGroup(group.groupId, 'https://b.test');

  const groupSessionId = `group:${group.groupId}`;
  assert.equal(store.sessionIdForOrigin('https://a.test'), groupSessionId);
  assert.equal(store.sessionIdForOrigin('https://b.test'), groupSessionId);
  const mergedGroup = store.groups().find((g) => g.groupId === group.groupId)!;
  assert.deepEqual([...mergedGroup.origins].sort(), ['https://a.test', 'https://b.test']);
  assert.equal(merged.group.groupId, group.groupId);
  assert.equal(sessionLabel(store.find(groupSessionId)!), '工作（2 个域名）');

  // The group session starts empty — it must not silently absorb a member's history.
  await store.setHistory(groupSessionId, [user('shared-in-group')]);
  assert.deepEqual(store.historyOf(groupSessionId).map((t) => t.content), ['shared-in-group']);

  // Removing a member points it back at its own (preserved) standalone session.
  await store.removeOrigin('https://a.test');
  assert.equal(store.sessionIdForOrigin('https://a.test'), 'https://a.test');
  assert.deepEqual(store.historyOf('https://a.test').map((t) => t.content), ['a-own']);
  assert.equal(store.sessionIdForOrigin('https://b.test'), groupSessionId);

  // Deleting the group drops the group session; remaining origins revert.
  const deleted = await store.deleteGroup(group.groupId);
  assert.deepEqual(deleted.removedOrigins, ['https://b.test']);
  assert.equal(store.sessionIdForOrigin('https://b.test'), 'https://b.test');
  assert.equal(store.find(groupSessionId), undefined, 'group session removed with the group');
});

// ── cap / LRU ────────────────────────────────────────────────────────────────

test('session-store: LRU cap evicts the least-recently-active and discloses it', async () => {
  let clock = 0;
  const store = createSessionStore(memoryKv(), { now: () => (clock += 1000), maxSessions: 3 });
  await store.load();
  await store.activate('https://a.test');
  await store.activate('https://b.test');
  await store.activate('https://c.test');
  // touch a so b is the coldest
  await store.touch('https://a.test');
  const fourth = await store.activate('https://d.test');
  assert.deepEqual(fourth.evicted, ['https://b.test']);
  assert.ok(store.list().length <= 3, 'cap is enforced');
  assert.equal(store.find('https://b.test'), undefined);
  assert.ok(store.find('https://d.test'), 'the newest session survives');
  assert.ok(MAX_SESSIONS >= 3);
});

// ── bounded history + projection ─────────────────────────────────────────────

test('session-store: persisted history is bounded and starts at a user turn', async () => {
  const store = createSessionStore(memoryKv(), { now: () => 1000 });
  await store.load();
  const s = await store.activate('https://a.test');
  const many: ChatTurn[] = [];
  for (let i = 0; i < 100; i += 1) many.push(i % 2 === 0 ? user(`m${i}`) : assistant(`m${i}`));
  await store.setHistory(s.session.sessionId, many);
  const hist = store.historyOf(s.session.sessionId);
  assert.ok(hist.length <= 40);
  assert.equal(hist[0]?.role, 'user');
});

test('session-store: projectHistory keeps text roles and drops empties', () => {
  const projected = projectHistory([
    user('hi'),
    { role: 'assistant', content: '' },
    assistant('ok'),
    { role: 'tool', content: 'toolout' },
  ]);
  assert.deepEqual(projected, [
    { role: 'user', text: 'hi' },
    { role: 'assistant', text: 'ok' },
    { role: 'tool', text: 'toolout' },
  ]);
});

test('session-store: state survives a reload (persistence)', async () => {
  const kv = memoryKv();
  const store = createSessionStore(kv, { now: () => 1000 });
  await store.load();
  const group = await store.createGroup('跨重启');
  const s = await store.activate('https://a.test');
  await store.addOriginToGroup(group.groupId, 'https://a.test');
  await store.setHistory(`group:${group.groupId}`, [user('persisted')]);
  assert.ok(kv.raw.has(SESSION_STORE_KEY));

  const store2 = createSessionStore(kv, { now: () => 2000 });
  await store2.load();
  assert.equal(store2.sessionIdForOrigin('https://a.test'), `group:${group.groupId}`);
  assert.deepEqual(store2.historyOf(`group:${group.groupId}`).map((t) => t.content), ['persisted']);
  assert.ok(s.session.origins.length >= 1);
});
