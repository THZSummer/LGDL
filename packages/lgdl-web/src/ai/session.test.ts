import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAiSession } from './session.js';
import type { AiSessionDeps } from './session.js';
import { createOpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import type { OpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import type { ProviderSettings } from './provider.js';
import type { WebCliToolCall } from '@lgdl/web-cli-base';

const SRC = `title: t
type: flowchart
nodes:
  - id: a
    label: A
  - id: b
    label: B
edges:
  - from: a
    to: b
    label: dep
`;

function makeDeps(overrides: Partial<AiSessionDeps> = {}): AiSessionDeps {
  const opRegistry: OpHandlerRegistry = createOpHandlerRegistry();
  opRegistry.register('copy-source', () => ({ ok: true, output: '✓ 源码已复制到剪贴板' }));
  const settings: ProviderSettings = { providerId: 'deepseek', apiKey: 'test-key', model: 'x' };
  return {
    docId: 'main',
    getSource: () => SRC,
    onApply: () => {},
    opRegistry,
    settings: () => settings,
    ...overrides,
  };
}

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

test('session: schema derivation order = business + builtins (AC-006, 承接 provider.test 旧顺序断言)', () => {
  const session = createAiSession(makeDeps());
  assert.deepEqual(
    session.router.deriveTools().map((t) => t.name),
    ['lgdl-web-cli', 'lgdl-web-op-cli', 'web-fetch', 'sleep', 'web-cli-help'],
  );
});

test('session: router is configured with scene default delayMs=600 (FR-015/AC-005)', () => {
  const session = createAiSession(makeDeps());
  assert.equal(session.router.delayMs, 600);
  assert.deepEqual(session.router.warnings, []);
});

test('session: assembled registry contains all 5 tools (single assembly point AC-007)', () => {
  const session = createAiSession(makeDeps());
  assert.deepEqual(session.router.names(), [
    'lgdl-web-cli',
    'lgdl-web-op-cli',
    'web-fetch',
    'sleep',
    'web-cli-help',
  ]);
});

test('session: web-fetch dispatches through the router — data: URL success (承接 lgdl-web.test 例 1)', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('web-fetch', { path: 'data:text/plain,skill%20doc' }));
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, false);
  assert.ok(r.output.includes('skill doc'));
});

test('session: web-fetch without path is an explicit error (承接 lgdl-web.test 例 2)', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('web-fetch', {}));
  assert.equal(r.ok, false);
  assert.equal(r.changed, false);
  assert.match(r.error ?? '', /--path/);
});

test('session: lgdl-web-cli business tool executes through the router with ctx source', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('lgdl-web-cli', {}, 'status'), { source: SRC, docId: 'main' });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, false);
  assert.ok(r.output.includes('a -> b'));
});

test('session: lgdl-web-cli mutation returns changed+source for the scene to apply', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(
    tc('lgdl-web-cli', { id: 'c', label: 'C' }, 'add-node'),
    { source: SRC, docId: 'main' },
  );
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, true);
  assert.ok(r.source && r.source.includes('- id: c'));
});

test('session: lgdl-web-op-cli entry forwards the injected registry handlers (FR-019)', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('lgdl-web-op-cli', {}, 'copy-source'));
  assert.equal(r.ok, true);
  assert.equal(r.output, '✓ 源码已复制到剪贴板');
});

test('session: help listing is registration-derived and lists business + builtins (FR-010)', async () => {
  const session = createAiSession(makeDeps());
  const list = session.router.listHelp();
  assert.ok(list.includes('可用工具（4 个）：'));
  assert.ok(list.includes('lgdl-web-cli：图内容操作'));
  assert.ok(list.includes('lgdl-web-op-cli：UI 操作'));
  assert.ok(list.includes('web-fetch：'));
  assert.ok(list.includes('sleep：'));
  assert.ok(!list.includes('web-cli-help：'));
});
