import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOpCliToolEntry } from './tool-entry.js';
import { WEB_OP_TOOL } from './tool.js';
import { createOpHandlerRegistry, type OpHandlerRegistry } from './handlers.js';

test('tool-entry: schema maps WEB_OP_TOOL + fixed prefix (AC-002)', () => {
  const reg = createOpHandlerRegistry();
  const entry = createOpCliToolEntry(reg);
  assert.equal(entry.name, 'lgdl-web-op-cli');
  assert.equal(entry.schema.name, WEB_OP_TOOL.function.name);
  assert.equal(entry.schema.description, WEB_OP_TOOL.function.description);
  assert.deepEqual(entry.schema.parameters, WEB_OP_TOOL.function.parameters);
  assert.equal(entry.prefix, 'lgdl-web-op-cli');
  const help = entry.help?.();
  assert.ok(help && help.includes('lgdl-web-op-cli ——'));
  assert.ok(help && help.includes('子命令：'));
});

test('tool-entry: executor forwards registered handlers (FR-019)', async () => {
  const reg: OpHandlerRegistry = createOpHandlerRegistry();
  reg.register('copy-source', () => ({ ok: true, output: '✓ 源码已复制到剪贴板' }));
  reg.register('preview-zoom', (args) => {
    const f = parseFloat(args.factor ?? '0');
    return f > 0 ? { ok: true, output: `✓ 已缩放 ${f}` } : { ok: false, output: '✖ factor 非法' };
  });
  const entry = createOpCliToolEntry(reg);
  const a = await entry.executor!({ subcommand: 'copy-source', args: {} }, {});
  assert.equal(a.ok, true);
  assert.equal(a.output, '✓ 源码已复制到剪贴板');
  assert.equal(a.error, undefined);
  const b = await entry.executor!({ subcommand: 'preview-zoom', args: { factor: '1.2' } }, {});
  assert.equal(b.ok, true);
  assert.equal(b.output, '✓ 已缩放 1.2');
  const c = await entry.executor!({ subcommand: 'preview-zoom', args: { factor: 'abc' } }, {});
  assert.equal(c.ok, false);
  assert.equal(c.output, '✖ factor 非法');
  assert.equal(c.error, '✖ factor 非法');
});

test('tool-entry: unregistered subcommand maps to ok:false (registry semantics)', async () => {
  const reg = createOpHandlerRegistry();
  reg.register('real', () => ({ ok: true, output: 'ok' }));
  const entry = createOpCliToolEntry(reg);
  const r = await entry.executor!({ subcommand: 'ghost-op', args: {} }, {});
  assert.equal(r.ok, false);
  assert.equal(r.output, '✖ 未知操作 "ghost-op"');
});

test('tool-entry: next-actions is NOT special-cased in the entry (scene intercept owns it)', async () => {
  // next-actions 语义由场景 runner hooks.intercept 承接：未在 registry 注册时
  // 本条目按普通未注册子命令处理（ok:false），不引入任何 next-actions 解析逻辑
  const reg = createOpHandlerRegistry();
  const entry = createOpCliToolEntry(reg);
  const r = await entry.executor!({ subcommand: 'next-actions', args: { actions: '[{"label":"a","prompt":"p"}]' } }, {});
  assert.equal(r.ok, false);
  assert.match(r.output, /未知操作/);
});
