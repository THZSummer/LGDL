import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOpHandlerRegistry } from './handlers.js';

test('OpHandlerRegistry: registers and executes a handler', () => {
  const reg = createOpHandlerRegistry();
  reg.register('copy-source', () => ({ ok: true, output: '✓ 源码已复制到剪贴板' }));
  assert.equal(reg.has('copy-source'), true);
  const r = reg.execute('copy-source', {});
  assert.deepEqual(r, { ok: true, output: '✓ 源码已复制到剪贴板' });
});

test('OpHandlerRegistry: passes args through to the handler', () => {
  const reg = createOpHandlerRegistry();
  reg.register('preview-zoom', (args) => ({
    ok: true,
    output: `factor=${args.factor ?? 'none'}`,
  }));
  const r = reg.execute('preview-zoom', { factor: '1.2' });
  assert.equal(r.output, 'factor=1.2');
});

test('OpHandlerRegistry: unregistered subcommand returns the App-consistent error', () => {
  const reg = createOpHandlerRegistry();
  const r = reg.execute('explode', {});
  assert.equal(r.ok, false);
  assert.equal(r.output, '✖ 未知操作 "explode"');
  assert.equal(reg.has('explode'), false);
});
