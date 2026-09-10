import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatTurn } from '@lgdl/web-cli-base';
import { CHAT_HISTORY_KEY, MAX_SESSION_TURNS, createChatSession } from '../src/background/chat-session.js';
import { runChatTurn, type ChatTurnDeps } from '../src/background/chat-runner.js';

test('chat-session: commit / prefix / snapshot / restore / clear', () => {
  const s = createChatSession();
  assert.equal(s.size(), 0);
  s.commit([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }]);
  assert.equal(s.size(), 2);
  assert.deepEqual(s.prefix([{ role: 'user', content: 'c' }]).map((t) => t.content), ['a', 'b', 'c']);

  const snap = s.snapshot();
  snap[0]!.content = 'mutated'; // snapshot is a copy
  assert.equal(s.snapshot()[0]!.content, 'a');

  const s2 = createChatSession();
  s2.restore(s.snapshot());
  assert.deepEqual(s2.snapshot().map((t) => t.content), ['a', 'b']);
  s2.clear();
  assert.equal(s2.size(), 0);
});

test('chat-session: bounded history starts at a user turn', () => {
  const many: ChatTurn[] = [];
  for (let i = 0; i < 100; i += 1) many.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` });
  const s = createChatSession(many);
  assert.ok(s.size() <= MAX_SESSION_TURNS);
  assert.equal(s.snapshot()[0]!.role, 'user');
  s.commit([{ role: 'user', content: 'tail' }]);
  assert.ok(s.size() <= MAX_SESSION_TURNS);
  assert.equal(s.snapshot()[0]!.role, 'user');
});

test('chat-runner: second turn carries the first exchange (FR-017 multi-turn)', async () => {
  const session = createChatSession();
  const seen: ChatTurn[][] = [];
  const deps: ChatTurnDeps = {
    session,
    system: 'sys',
    chat: async (turns) => {
      seen.push(turns.map((t) => ({ ...t })));
      return { content: `reply ${seen.length}`, toolCalls: [], model: 'test' };
    },
    dispatch: async () => ({ ok: true, output: 'ok' }),
  };

  await runChatTurn('first', deps);
  await runChatTurn('second', deps);

  assert.deepEqual(seen[0]!.map((t) => t.content), ['first']);
  // the second LLM call sees user1 → assistant1 → user2 (session continuity)
  assert.deepEqual(seen[1]!.map((t) => t.content), ['first', 'reply 1', 'second']);
  assert.equal(session.size(), 4);
});

test('chat-runner: navigation reset drops the conversation (EC-011)', async () => {
  const session = createChatSession();
  const seen: ChatTurn[][] = [];
  const deps: ChatTurnDeps = {
    session,
    system: 'sys',
    chat: async (turns) => {
      seen.push(turns.map((t) => ({ ...t })));
      return { content: 'ok', toolCalls: [], model: 'test' };
    },
    dispatch: async () => ({ ok: true, output: 'ok' }),
  };
  await runChatTurn('before-nav', deps);
  session.clear();
  await runChatTurn('after-nav', deps);
  assert.deepEqual(seen[1]!.map((t) => t.content), ['after-nav']);
});

test('chat-runner: maxRounds from settings is enforced (EC-013)', async () => {
  const limits: number[] = [];
  const deps: ChatTurnDeps = {
    session: createChatSession(),
    system: 'sys',
    maxRounds: 1,
    chat: async () => ({
      content: '',
      toolCalls: [{ id: 't1', name: 'site.notes-list', subcommand: '', args: {}, rawArguments: '{}' }],
      model: 'test',
    }),
    dispatch: async () => ({ ok: true, output: 'ok' }),
    events: { onRoundLimit: (n) => limits.push(n) },
  };
  await runChatTurn('go', deps);
  assert.deepEqual(limits, [1]);
});

test('chat-session: storage key is session-scoped and stable', () => {
  assert.equal(CHAT_HISTORY_KEY, 'chat-history');
});
