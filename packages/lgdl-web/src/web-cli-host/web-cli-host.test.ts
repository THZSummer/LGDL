/**
 * web-cli-host tests (TASK-010 / FR-020 / FR-041 / FR-042).
 *
 * Covers the LGDL site protocol exposure: declaration generation, retained
 * router dispatch, and the page-world bridge (probe / invoke / write-back
 * validation / isolation). No browser required — the bridge takes an injectable
 * `target` window and the router takes an injectable op registry.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformEventHub, ToolResult, WebCliToolCall } from '@lgdl/web-cli-base';
import { createOpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import { createAiSession } from '../ai/session.js';
import type { AiSessionDeps } from '../ai/session.js';
import type { ProviderSettings } from '../ai/provider.js';
import { buildDeclaration, WEB_CLI_CHANNEL, WEB_CLI_PROTOCOL_VERSION } from './declaration.js';
import { createWebCliHostRouter } from './host-router.js';
import {
  startWebCliBridge,
  WEB_CLI_DESCRIPTOR,
  WEB_CLI_EVENT,
  WEB_CLI_EVENT_RESULT,
  WEB_CLI_INVOKE,
  WEB_CLI_PROBE,
  WEB_CLI_RESULT,
  type WebCliBridgeDeps,
} from './bridge.js';

const SRC = 'type: flowchart\nnodes:\n  - id: a\n    label: A\n';

function makeRouter(): ReturnType<typeof createWebCliHostRouter> {
  const ops = createOpHandlerRegistry();
  ops.register('copy', () => ({ ok: true, output: 'copied' }));
  return createWebCliHostRouter({ docId: 'doc-1', getSource: () => SRC, opRegistry: ops });
}

/** Minimal fake window capturing posted messages and exposing the listener. */
function fakeWindow() {
  const posted: unknown[] = [];
  const listeners: Array<(event: { data: unknown; source: unknown }) => void> = [];
  const win = {
    postMessage(message: unknown) {
      posted.push(message);
    },
    addEventListener(type: string, handler: (event: { data: unknown; source: unknown }) => void) {
      if (type === 'message') listeners.push(handler);
    },
    removeEventListener() {
      /* no-op for the fake */
    },
  };
  return {
    posted,
    win,
    emit(data: unknown, source: unknown) {
      for (const h of listeners) h({ data, source });
    },
  };
}

test('web-cli-host declaration: site-neutral descriptor from retained router tools', () => {
  const host = makeRouter();
  const decl = buildDeclaration(host.router);
  assert.equal(decl.protocolVersion, WEB_CLI_PROTOCOL_VERSION);
  assert.equal(decl.transport.channel, WEB_CLI_CHANNEL);
  const ids = decl.tools.map((t) => t.id);
  assert.equal(ids.includes('lgdl-web-cli'), true);
  assert.equal(ids.includes('lgdl-web-op-cli'), true);
});

test('web-cli-host router: dispatches a graph read command through the retained router', async () => {
  const host = makeRouter();
  const result = await host.dispatch({
    id: 'c1',
    name: 'lgdl-web-cli',
    subcommand: 'status',
    args: {},
    rawArguments: '{}',
  });
  assert.equal(result.ok, true);
  assert.match(result.output, /nodes/);
});

test('web-cli-host router: dispatches a UI op through the injected registry', async () => {
  const host = makeRouter();
  const result = await host.dispatch({
    id: 'c2',
    name: 'lgdl-web-op-cli',
    subcommand: 'copy',
    args: {},
    rawArguments: '{}',
  });
  assert.equal(result.ok, true);
  assert.equal(result.output, 'copied');
});

function bridgeDeps(
  dispatch: (tc: WebCliToolCall) => Promise<ToolResult>,
  target: unknown,
  onApply: (source: string) => void = () => {},
): WebCliBridgeDeps {
  return {
    router: { dispatch } as unknown as WebCliBridgeDeps['router'],
    descriptor: () => ({ protocolVersion: WEB_CLI_PROTOCOL_VERSION, siteName: 'LGDL Web Workbench', tools: [], transport: { kind: 'page-message', channel: WEB_CLI_CHANNEL } }),
    onApply,
    target: target as Window,
  };
}

test('web-cli-host bridge: answers a runtime probe with the descriptor', async () => {
  const { posted, win } = fakeWindow();
  const bridge = startWebCliBridge(bridgeDeps(async () => ({ ok: true, output: '' }), win));
  await bridge.handle({ type: WEB_CLI_PROBE, channel: WEB_CLI_CHANNEL, id: 'p1' });
  assert.equal(posted.length, 1);
  const reply = posted[0] as { type: string; id: string; descriptor?: { protocolVersion?: string } };
  assert.equal(reply.type, WEB_CLI_DESCRIPTOR);
  assert.equal(reply.id, 'p1');
  assert.equal(reply.descriptor?.protocolVersion, WEB_CLI_PROTOCOL_VERSION);
  bridge.dispose();
});

test('web-cli-host bridge: invokes a tool and posts a trust:external result', async () => {
  const { posted, win } = fakeWindow();
  let seen: WebCliToolCall | undefined;
  const bridge = startWebCliBridge(
    bridgeDeps(async (tc) => {
      seen = tc;
      return { ok: true, output: 'listed' };
    }, win),
  );
  await bridge.handle({ type: WEB_CLI_INVOKE, channel: WEB_CLI_CHANNEL, id: 'i1', tool: 'lgdl-web-cli', subcommand: 'status', args: { a: 1 } });
  assert.equal(seen?.name, 'lgdl-web-cli');
  assert.equal(seen?.subcommand, 'status');
  assert.deepEqual(seen?.args, { a: '1' });
  const reply = posted[0] as { type: string; ok: boolean; output: string; trust?: string };
  assert.equal(reply.type, WEB_CLI_RESULT);
  assert.equal(reply.ok, true);
  assert.equal(reply.output, 'listed');
  assert.equal(reply.trust, 'external');
  bridge.dispose();
});

test('web-cli-host bridge: write-back applies only after parseLgdl validation', async () => {
  const { posted, win } = fakeWindow();
  const applied: string[] = [];
  const bridge = startWebCliBridge(
    bridgeDeps(async () => ({ ok: true, output: 'ok', changed: true, source: 'invalid: [unclosed' }), win, (s) => applied.push(s)),
  );
  await bridge.handle({ type: WEB_CLI_INVOKE, channel: WEB_CLI_CHANNEL, id: 'w1', tool: 'lgdl-web-cli', subcommand: 'add-node', args: {} });
  assert.deepEqual(applied, []); // invalid write-back is rejected, not applied
  const reply = posted[0] as { ok: boolean; output: string };
  assert.equal(reply.ok, false);
  assert.match(reply.output, /校验失败/);
  bridge.dispose();
});

test('web-cli-host bridge: valid write-back calls onApply exactly once', async () => {
  const { win } = fakeWindow();
  const applied: string[] = [];
  const bridge = startWebCliBridge(
    bridgeDeps(async () => ({ ok: true, output: 'ok', changed: true, source: SRC }), win, (s) => applied.push(s)),
  );
  await bridge.handle({ type: WEB_CLI_INVOKE, channel: WEB_CLI_CHANNEL, id: 'w2', tool: 'lgdl-web-cli', subcommand: 'add-node', args: {} });
  assert.deepEqual(applied, [SRC]);
  bridge.dispose();
});

test('web-cli-host bridge: ignores other channels and foreign sources (isolation)', async () => {
  const { posted, win } = fakeWindow();
  const bridge = startWebCliBridge(bridgeDeps(async () => ({ ok: true, output: 'nope' }), win));
  await bridge.handle({ type: WEB_CLI_INVOKE, channel: 'other', id: 'x', tool: 't', subcommand: '', args: {} });
  await bridge.handle({ type: WEB_CLI_INVOKE, channel: WEB_CLI_CHANNEL, id: 'x', tool: 't', subcommand: '', args: {} }, { other: true });
  assert.equal(posted.length, 0);
  bridge.dispose();
});

test('web-cli-host bridge: dispatcher exception becomes a readable failed result', async () => {
  const { posted, win } = fakeWindow();
  const bridge = startWebCliBridge(
    bridgeDeps(async () => {
      throw new Error('boom');
    }, win),
  );
  await bridge.handle({ type: WEB_CLI_INVOKE, channel: WEB_CLI_CHANNEL, id: 'e1', tool: 't', subcommand: '', args: {} });
  const reply = posted[0] as { ok: boolean; output: string };
  assert.equal(reply.ok, false);
  assert.match(reply.output, /boom/);
  bridge.dispose();
});

test('web-cli-host bridge: unregistered tool fails readably before dispatch (FR-019/FR-014)', async () => {
  const { posted, win } = fakeWindow();
  const router = makeRouter();
  let called = false;
  const bridge = startWebCliBridge({
    router: {
      router: router.router,
      dispatch: async () => {
        called = true;
        return { ok: true, output: 'should not run' };
      },
    } as unknown as WebCliBridgeDeps['router'],
    descriptor: () => buildDeclaration(router.router),
    onApply: () => {},
    target: win as unknown as Window,
  });
  await bridge.handle({ type: WEB_CLI_INVOKE, channel: WEB_CLI_CHANNEL, id: 'u1', tool: 'ghost-tool', subcommand: '', args: {} });
  const reply = posted[0] as { ok: boolean; output: string };
  assert.equal(reply.ok, false);
  assert.match(reply.output, /未注册工具/);
  assert.equal(called, false);
  bridge.dispose();
});

test('web-cli-host bridge: proxies env.events with a bounded summary (FR-021)', async () => {
  const { posted, win } = fakeWindow();
  const events = Array.from({ length: 14 }, (_, i) => ({ seq: i + 1, ts: 0, kind: 'dom' as const }));
  const hub = {
    subscribe: async () => ({ ok: true, subId: 's1' }),
    unsubscribe: async () => ({ ok: true }),
    pull: async () => ({ ok: true, events, lastId: 14, dropped: 0, delivered: 14, bufferSize: 0, autoPaused: false }),
    status: async () => ({ enabled: false, subscriptionCount: 0, totalBuffered: 0, disabledDropped: 0, rateDropped: 0, subscriptions: [] }),
  } as unknown as PlatformEventHub;
  const bridge = startWebCliBridge({
    router: makeRouter() as unknown as WebCliBridgeDeps['router'],
    descriptor: () => ({}),
    onApply: () => {},
    target: win as unknown as Window,
    events: hub,
  });
  await bridge.handle({ type: WEB_CLI_EVENT, channel: WEB_CLI_CHANNEL, id: 'ev1', op: 'pull', params: { subId: 's1' } });
  const reply = posted[0] as { type: string; ok: boolean; data?: { events?: unknown[]; note?: string } };
  assert.equal(reply.type, WEB_CLI_EVENT_RESULT);
  assert.equal(reply.ok, true);
  assert.equal(reply.data?.events?.length, 10);
  assert.match(reply.data?.note ?? '', /上下文预算截断/);
  bridge.dispose();
});

/**
 * EC-012 / FR-004 — transition-period coexistence of the two tool faces.
 *
 * The built-in assistant (`createAiSession`) and the plugin protocol exposure
 * (`createWebCliHostRouter`) are deliberately independent routers that share the
 * same domain tool NAMES but never a registry. This test pins: no duplicate
 * registration, no double execution of one RPC, and readable name separation
 * (plugin tools are namespaced `site.*`, assistant tools are plain).
 */
test('EC-012 dual tool face: assistant + host routers coexist without double execution', async () => {
  const opRegistry = createOpHandlerRegistry();
  const settings: ProviderSettings = { providerId: 'deepseek', apiKey: 'k', model: 'm' };
  const deps: AiSessionDeps = {
    docId: 'doc-1',
    getSource: () => SRC,
    onApply: () => {},
    opRegistry,
    settings: () => settings,
  };
  const assistant = createAiSession(deps);

  let sourceReads = 0;
  const host = createWebCliHostRouter({
    docId: 'doc-1',
    getSource: () => {
      sourceReads += 1;
      return SRC;
    },
    opRegistry,
  });

  // Two independent routers: no shared registry, hence no double registration.
  assert.notEqual(assistant.router, host.router);

  const assistantNames = assistant.router.query().map((e) => e.name);
  const hostNames = host.router.query().map((e) => e.name);
  for (const name of ['lgdl-web-cli', 'lgdl-web-op-cli']) {
    assert.equal(assistantNames.filter((n) => n === name).length, 1, `${name} registered once (assistant)`);
    assert.equal(hostNames.filter((n) => n === name).length, 1, `${name} registered once (host)`);
  }

  // The plugin face is namespaced (`site.*`), so the two faces never collide on
  // a tool name; the page-side host router only carries the plain domain tools.
  assert.equal(hostNames.some((n) => n.startsWith('site.')), false);
  assert.equal(assistantNames.some((n) => n.startsWith('site.')), false);

  // One dispatch through the host router executes the domain tool exactly once.
  const result = await host.dispatch({ id: 'x1', name: 'lgdl-web-cli', subcommand: 'status', args: {}, rawArguments: '{}' });
  assert.equal(result.ok, true);
  assert.equal(sourceReads, 1);
});
