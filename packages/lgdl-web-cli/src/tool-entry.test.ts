import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLgdlWebCliTool } from './tool-entry.js';
import { WEB_CLI_TOOL } from './tools.js';

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

const entry = createLgdlWebCliTool();

test('tool-entry: schema maps WEB_CLI_TOOL byte-for-byte (AC-002)', () => {
  assert.equal(entry.name, 'lgdl-web-cli');
  assert.equal(entry.schema.name, WEB_CLI_TOOL.function.name);
  assert.equal(entry.schema.description, WEB_CLI_TOOL.function.description);
  assert.deepEqual(entry.schema.parameters, WEB_CLI_TOOL.function.parameters);
  assert.equal(entry.prefix, 'lgdl-web-cli');
  assert.ok(entry.summary);
  assert.ok(typeof entry.help === 'function');
  const help = entry.help?.();
  assert.ok(help && help.includes('lgdl-web-cli ——'));
  assert.ok(help && help.includes('子命令：'));
});

test('tool-entry: executor runs a read-only subcommand (status) without changing source', async () => {
  const r = await entry.executor!({ subcommand: 'status', args: {} }, { source: SRC, docId: 'main' });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.output.includes('a -> b'));
});

test('tool-entry: executor runs a mutating subcommand returning changed+source', async () => {
  const r = await entry.executor!({ subcommand: 'add-node', args: { id: 'c', label: 'C' } }, { source: SRC, docId: 'main' });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, true);
  assert.ok(r.source && r.source.includes('- id: c'));
  assert.notEqual(r.source, SRC);
});

test('tool-entry: executor failure maps to ok:false with descriptive error', async () => {
  const r = await entry.executor!({ subcommand: 'update-node', args: { id: 'ghost', label: 'X' } }, { source: SRC, docId: 'main' });
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /ghost/);
});

test('tool-entry: empty source context behaves like the executor path (no doc)', async () => {
  // 空源码 + status → 与 executeSubcommand 直接路径一致（当前实现：空文档可解析为有效空图）
  const r = await entry.executor!({ subcommand: 'status', args: {} }, {});
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, false);
});
