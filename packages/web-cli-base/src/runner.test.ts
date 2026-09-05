import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAgentRunner } from './runner.js';
import type { AgentRunnerOptions, AgentRunnerEvents, AgentRun, RunOutcome } from './runner.js';
import type { ChatResult, ChatTurn, WebCliToolCall } from './llm.js';

test('runner.ts has zero react import (NFR-008/AC-011)', () => {
  const src = readFileSync(fileURLToPath(new URL('../src/runner.ts', import.meta.url)), 'utf8');
  assert.ok(!/from\s+['"]react['"]/.test(src), 'runner.ts must not import react');
});

let callSeq = 0;
function toolCall(name: string, subcommand = '', args: Record<string, string> = {}): WebCliToolCall {
  callSeq += 1;
  return { id: `call-${callSeq}`, name, subcommand, args, rawArguments: JSON.stringify({ subcommand, args }) };
}

type Seen = { turns: ChatTurn[]; system: string };
type EventLog = Array<{ type: string; payload?: unknown }>;

interface Harness {
  log: EventLog;
  seen: Seen[];
  dispatchCalls: WebCliToolCall[];
  toolDone: Array<{ tc: WebCliToolCall; result: unknown }>;
}

/** 构造测试 runner：chat 脚本 = 依次返回 ChatResult 或 throw Error。 */
function makeRunner(
  script: Array<ChatResult | Error>,
  opts: Partial<Omit<AgentRunnerOptions, 'user' | 'chat'>> & { user?: string } = {},
): { run: AgentRun; h: Harness } {
  const h: Harness = { log: [], seen: [], dispatchCalls: [], toolDone: [] };
  const events: AgentRunnerEvents = {
    onAssistantText: (t) => h.log.push({ type: 'assistantText', payload: t }),
    onCommandLine: (c) => h.log.push({ type: 'commandLine', payload: c }),
    onToolOutput: (o) => h.log.push({ type: 'toolOutput', payload: o }),
    onRoundLimit: (m) => h.log.push({ type: 'roundLimit', payload: m }),
    onEmptyReply: () => h.log.push({ type: 'emptyReply' }),
    onLLMError: (m, w) => h.log.push({ type: 'llmError', payload: { message: m, willRetry: w } }),
    onFailAggregate: () => h.log.push({ type: 'failAggregate' }),
    onFinish: (o) => h.log.push({ type: 'finish', payload: o }),
  };
  let idx = 0;
  const run = createAgentRunner({
    user: opts.user ?? 'hello',
    system: async () => 'SYS',
    chat: async (turns, system) => {
      h.seen.push({ turns: JSON.parse(JSON.stringify(turns)), system });
      const s = script[Math.min(idx, script.length - 1)];
      idx += 1;
      if (s instanceof Error) throw s;
      return s;
    },
    dispatch: async (tc) => {
      h.dispatchCalls.push(tc);
      return { ok: true, output: `${tc.name}:out` };
    },
    deriveCommand: (tc) => `cmd:${tc.name}`,
    events,
    maxRounds: opts.maxRounds ?? 1000,
    ...opts,
  });
  return { run, h };
}

function text(content: string, toolCalls: WebCliToolCall[] = []): ChatResult {
  return { content, toolCalls, model: 'test' };
}

test('runner: text-only conversation completes with assistant event', async () => {
  const { run, h } = makeRunner([text('Hi there')]);
  const outcome = await run.run();
  assert.equal(outcome, 'completed');
  assert.deepEqual(h.log, [
    { type: 'assistantText', payload: 'Hi there' },
    { type: 'finish', payload: 'completed' },
  ]);
  // turns 初始化 [user] + assistant 回填
  assert.equal(h.seen[0].turns.length, 1);
  assert.deepEqual(h.seen[0].turns[0], { role: 'user', content: 'hello' });
  assert.equal(h.seen[0].system, 'SYS');
});

test('runner: empty reply without tool calls → onEmptyReply + empty outcome', async () => {
  const { run, h } = makeRunner([text('   ')]);
  const outcome = await run.run();
  assert.equal(outcome, 'empty');
  assert.deepEqual(h.log, [
    { type: 'emptyReply' },
    { type: 'finish', payload: 'empty' },
  ]);
});

test('runner: tool result is backfilled with the matching toolCallId (FR-006)', async () => {
  const tc1 = toolCall('demo', 'run', { a: '1' });
  const { run, h } = makeRunner([
    text('Let me run that', [tc1]),
    text('Done'),
  ]);
  const outcome = await run.run();
  assert.equal(outcome, 'completed');
  assert.deepEqual(h.log.map((l) => l.type), [
    'assistantText', 'commandLine', 'toolOutput', 'assistantText', 'finish',
  ]);
  // 第二轮 turns：user + assistant(含 toolCalls) + tool(按 toolCallId 回填)
  const second = h.seen[1].turns;
  assert.equal(second.length, 3);
  assert.deepEqual(second[1], {
    role: 'assistant',
    content: 'Let me run that',
    toolCalls: [{ id: tc1.id, name: 'demo', arguments: tc1.rawArguments }],
  });
  assert.deepEqual(second[2], { role: 'tool', content: 'demo:out', toolCallId: tc1.id });
  assert.equal(h.dispatchCalls.length, 1);
  // deriveCommand 注入：命令文本 = cmd:demo
  assert.deepEqual(h.log[1], { type: 'commandLine', payload: 'cmd:demo' });
});

test('runner: multi toolCalls execute in order; single failure does not swallow later calls (EC-006)', async () => {
  const tc1 = toolCall('a');
  const tc2 = toolCall('b');
  const tc3 = toolCall('c');
  const dispatchOutcomes: Record<string, { ok: boolean; output: string }> = {
    a: { ok: false, output: '✖ a failed' },
    b: { ok: true, output: 'b ok' },
    c: { ok: true, output: 'c ok' },
  };
  const h: Harness = { log: [], seen: [], dispatchCalls: [], toolDone: [] };
  const events: AgentRunnerEvents = {
    onCommandLine: (c) => h.log.push({ type: 'commandLine', payload: c }),
    onToolOutput: (o) => h.log.push({ type: 'toolOutput', payload: o }),
    onFailAggregate: () => h.log.push({ type: 'failAggregate' }),
    onAssistantText: (t) => h.log.push({ type: 'assistantText', payload: t }),
    onFinish: (o) => h.log.push({ type: 'finish', payload: o }),
  };
  const run = createAgentRunner({
    user: 'go',
    system: async () => 'SYS',
    chat: async (turns, system) => {
      h.seen.push({ turns: JSON.parse(JSON.stringify(turns)), system });
      return h.seen.length === 1 ? text('', [tc1, tc2, tc3]) : text('fixed');
    },
    dispatch: async (tc) => dispatchOutcomes[tc.name],
    deriveCommand: (tc) => tc.name,
    events,
  });
  const outcome = await run.run();
  assert.equal(outcome, 'completed');
  // 三条都执行（失败不吞后续）；失败聚合在全部结果之后
  assert.deepEqual(h.log, [
    { type: 'commandLine', payload: 'a' },
    { type: 'toolOutput', payload: '✖ a failed' },
    { type: 'commandLine', payload: 'b' },
    { type: 'toolOutput', payload: 'b ok' },
    { type: 'commandLine', payload: 'c' },
    { type: 'toolOutput', payload: 'c ok' },
    { type: 'failAggregate' },
    { type: 'assistantText', payload: 'fixed' },
    { type: 'finish', payload: 'completed' },
  ]);
  // 失败后 runner 内部 push 纠正 user turn（第二轮可见）
  const second = h.seen[1].turns;
  const correction = second[second.length - 1];
  assert.equal(correction.role, 'user');
  assert.match(correction.content, /上一条命令执行失败/);
});

test('runner: max-rounds limit fires onRoundLimit and stops (EC-008)', async () => {
  const { run, h } = makeRunner(
    [text('', [toolCall('t')]), text('', [toolCall('t')]), text('', [toolCall('t')])],
    { maxRounds: 2 },
  );
  const outcome = await run.run();
  assert.equal(outcome, 'max-rounds');
  const types = h.log.map((l) => l.type);
  assert.ok(types.includes('roundLimit'));
  assert.deepEqual(h.log[h.log.length - 1], { type: 'finish', payload: 'max-rounds' });
  assert.equal((h.log.find((l) => l.type === 'roundLimit')?.payload as number), 2);
});

test('runner: stop() after the current tool completes exits before later calls', async () => {
  const tc1 = toolCall('slow');
  const tc2 = toolCall('later');
  let runRef: AgentRun | undefined;
  const dispatched: string[] = [];
  const events: AgentRunnerEvents = {
    onCommandLine: () => {},
    onToolOutput: () => {},
    onFinish: (o) => {},
  };
  runRef = createAgentRunner({
    user: 'go',
    system: async () => 'SYS',
    chat: async () => text('', [tc1, tc2]),
    dispatch: async (tc) => {
      dispatched.push(tc.name);
      if (tc.name === 'slow') runRef!.stop(); // 当前工具执行期间请求停止
      return { ok: true, output: `${tc.name}:out` };
    },
    events,
  });
  const outcome = await runRef.run();
  assert.equal(outcome, 'stopped');
  assert.deepEqual(dispatched, ['slow']); // 剩余工具不执行
});

test('runner: LLM error retries once with a correction turn, then completes', async () => {
  const err = new Error('network down');
  const h: Harness = { log: [], seen: [], dispatchCalls: [], toolDone: [] };
  const events: AgentRunnerEvents = {
    onAssistantText: (t) => h.log.push({ type: 'assistantText', payload: t }),
    onLLMError: (m, w) => h.log.push({ type: 'llmError', payload: { message: m, willRetry: w } }),
    onFinish: (o) => h.log.push({ type: 'finish', payload: o }),
  };
  let call = 0;
  const run = createAgentRunner({
    user: 'go',
    system: async () => 'SYS',
    chat: async (turns, system) => {
      h.seen.push({ turns: JSON.parse(JSON.stringify(turns)), system });
      call += 1;
      if (call === 1) throw err;
      return text('recovered');
    },
    dispatch: async () => ({ ok: true, output: 'x' }),
    events,
  });
  const outcome = await run.run();
  assert.equal(outcome, 'completed');
  assert.deepEqual(h.log, [
    { type: 'llmError', payload: { message: 'network down', willRetry: true } },
    { type: 'assistantText', payload: 'recovered' },
    { type: 'finish', payload: 'completed' },
  ]);
  // 重试轮 turns 含纠错 user turn
  const retry = h.seen[1].turns;
  const correction = retry[retry.length - 1];
  assert.equal(correction.role, 'user');
  assert.match(correction.content, /上一步调用出错：network down/);
});

test('runner: two consecutive LLM errors stop with llm-failed (no further retry)', async () => {
  const h: Harness = { log: [], seen: [], dispatchCalls: [], toolDone: [] };
  const events: AgentRunnerEvents = {
    onLLMError: (m, w) => h.log.push({ type: 'llmError', payload: { message: m, willRetry: w } }),
    onFinish: (o) => h.log.push({ type: 'finish', payload: o }),
  };
  let call = 0;
  const run = createAgentRunner({
    user: 'go',
    system: async () => 'SYS',
    chat: async () => {
      call += 1;
      throw new Error(`boom-${call}`);
    },
    dispatch: async () => ({ ok: true, output: 'x' }),
    events,
  });
  const outcome = await run.run();
  assert.equal(outcome, 'llm-failed');
  assert.deepEqual(h.log, [
    { type: 'llmError', payload: { message: 'boom-1', willRetry: true } },
    { type: 'llmError', payload: { message: 'boom-2', willRetry: false } },
    { type: 'finish', payload: 'llm-failed' },
  ]);
});

test('runner: onToolDone hook receives the tool call and result (changed/source)', async () => {
  const tc1 = toolCall('lgdl-web-cli', 'add-node', { id: 'x' });
  const done: Array<{ tc: string; result: { ok: boolean; changed?: boolean; source?: string } }> = [];
  let calls = 0;
  const run = createAgentRunner({
    user: 'add node',
    system: async () => 'SYS',
    chat: async () => {
      calls += 1;
      return calls === 1 ? text('', [tc1]) : text('added');
    },
    dispatch: async () => ({ ok: true, output: '✓ added', changed: true, source: 'new-source' }),
    events: {},
    hooks: {
      onToolDone: (tc, result) => {
        done.push({ tc: tc.name, result });
      },
    },
  });
  const outcome = await run.run();
  assert.equal(outcome, 'completed');
  assert.equal(done.length, 1);
  assert.equal(done[0].tc, 'lgdl-web-cli');
  assert.equal(done[0].result.changed, true);
  assert.equal(done[0].result.source, 'new-source');
});

test('runner: intercept short-circuits dispatch with a synthetic ToolResult', async () => {
  const tc1 = toolCall('lgdl-web-op-cli', 'next-actions', { actions: '[{"label":"a","prompt":"p"}]' });
  const dispatched: string[] = [];
  let calls = 0;
  const run = createAgentRunner({
    user: 'finish',
    system: async () => 'SYS',
    chat: async () => {
      calls += 1;
      return calls === 1 ? text('done', [tc1]) : text('wrapped');
    },
    dispatch: async (t) => {
      dispatched.push(t.name);
      return { ok: true, output: 'dispatched' };
    },
    events: {},
    hooks: {
      intercept: async (tc) => {
        if (tc.name === 'lgdl-web-op-cli' && tc.subcommand === 'next-actions') {
          return { ok: true, output: '✓ 已展示 1 个推荐动作' };
        }
        return null;
      },
    },
  });
  const outcome = await run.run();
  assert.equal(outcome, 'completed');
  assert.deepEqual(dispatched, []); // 被拦截，未进 dispatch
});

test('runner: dispatch/intercept throw is contained — ok:false copy, aggregate, onFinish still fires (IMP-2)', async () => {
  const tc1 = toolCall('boom-tool');
  const tc2 = toolCall('ok-tool');
  const h: Harness = { log: [], seen: [], dispatchCalls: [], toolDone: [] };
  const events: AgentRunnerEvents = {
    onCommandLine: (c) => h.log.push({ type: 'commandLine', payload: c }),
    onToolOutput: (o) => h.log.push({ type: 'toolOutput', payload: o }),
    onFailAggregate: () => h.log.push({ type: 'failAggregate' }),
    onAssistantText: (t) => h.log.push({ type: 'assistantText', payload: t }),
    onFinish: (o) => h.log.push({ type: 'finish', payload: o }),
  };
  let calls = 0;
  const run = createAgentRunner({
    user: 'go',
    system: async () => 'SYS',
    chat: async (turns) => {
      h.seen.push({ turns: JSON.parse(JSON.stringify(turns)), system: 'SYS' });
      calls += 1;
      return calls === 1 ? text('', [tc1, tc2]) : text('recovered');
    },
    dispatch: async (tc) => {
      if (tc.name === 'boom-tool') throw new Error('intercept-level boom detail');
      return { ok: true, output: 'ok-tool:out' };
    },
    deriveCommand: (tc) => tc.name,
    events,
  });
  const outcome = await run.run();
  // 异常不炸循环：后一工具继续执行，失败聚合触发，onFinish 必达
  assert.equal(outcome, 'completed');
  assert.deepEqual(h.log.map((l) => l.type), [
    'commandLine', 'toolOutput', 'commandLine', 'toolOutput', 'failAggregate', 'assistantText', 'finish',
  ]);
  const firstOut = h.log[1].payload as string;
  assert.equal(firstOut, '✖ 工具 "boom-tool" 执行异常'); // 稳定文案（EC-012 风格）
  assert.equal(h.log[3].payload, 'ok-tool:out');
  // 失败 tool 结果按 toolCallId 回填 + 纠正 user turn 在第二轮可见
  const second = h.seen[1].turns;
  assert.equal(second[2].role, 'tool');
  assert.equal(second[2].toolCallId, tc1.id);
  const correction = second[second.length - 1];
  assert.equal(correction.role, 'user');
  assert.match(correction.content, /上一条命令执行失败/);
});

test('runner: onToolDone throw does not break the loop or suppress onFinish (IMP-2)', async () => {
  const tc1 = toolCall('demo');
  const h: Harness = { log: [], seen: [], dispatchCalls: [], toolDone: [] };
  const events: AgentRunnerEvents = {
    onCommandLine: (c) => h.log.push({ type: 'commandLine', payload: c }),
    onToolOutput: (o) => h.log.push({ type: 'toolOutput', payload: o }),
    onAssistantText: (t) => h.log.push({ type: 'assistantText', payload: t }),
    onFinish: (o) => h.log.push({ type: 'finish', payload: o }),
  };
  let calls = 0;
  const run = createAgentRunner({
    user: 'go',
    system: async () => 'SYS',
    chat: async () => {
      calls += 1;
      return calls === 1 ? text('', [tc1]) : text('done-ok');
    },
    dispatch: async () => ({ ok: true, output: 'demo:out', changed: true, source: 'new-src' }),
    deriveCommand: (tc) => tc.name,
    events,
    hooks: {
      onToolDone: () => {
        throw new Error('onApply write-back boom');
      },
    },
  });
  const outcome = await run.run();
  assert.equal(outcome, 'completed'); // onToolDone 异常被吞掉，结果仍回填
  assert.deepEqual(h.log.map((l) => l.type), [
    'commandLine', 'toolOutput', 'assistantText', 'finish',
  ]);
  assert.equal(h.log[1].payload, 'demo:out');
  assert.deepEqual(h.log[h.log.length - 1], { type: 'finish', payload: 'completed' });
});
