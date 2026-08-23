import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeSubcommand, executeCommands } from './ops.js';

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

test('executeCommands: applies add-node then add-edge', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli add-node --doc main --id c --label C\nlgdl-web-cli add-edge --doc main --from b --to c --label next', 'main');
  assert.ok(r.ok, r.error);
  assert.ok(r.changed);
  assert.ok(r.source.includes('- id: c'));
  assert.ok(r.source.includes('to: c'));
  assert.equal(r.lines.filter((l) => l.startsWith('✓')).length, 2);
});

test('executeCommands: status outputs the graph and does not modify', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli status --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.lines.some((l) => l.includes('# t [flowchart]')));
  assert.ok(r.lines.some((l) => l.includes('a -> b')));
});

test('executeCommands: failed op reports which command and why', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli update-node --doc main --id ghost --label X', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /ghost/);
});

test('executeCommands: unknown subcommand stops the batch after prior lines', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli add-node --doc main --id c\nlgdl-web-cli explode --doc main --all', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /未知子命令/);
  // 第一行 add-node 已执行（逐行执行语义），第二行失败即停
  assert.equal(r.changed, true);
});

test('executeCommands: rejects when the current source is invalid', async () => {
  const r = await executeCommands('nodes:\n  - id: a\n    - oops', 'lgdl-web-cli add-node --doc main --id x', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /source invalid/);
});

test('executeCommands: empty command text is a no-op', async () => {
  const r = await executeCommands(SRC, '', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
});

test('executeCommands: validate reports syntax ok on valid source', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli validate --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.ok(r.lines.some((l) => l.includes('语法正确')));
});

test('executeCommands: validate reports errors on invalid source', async () => {
  const r = await executeCommands('nodes:\n  - id: a\n    - oops', 'lgdl-web-cli validate --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.ok(r.lines.some((l) => l.includes('✖') || l.includes('⚠')));
});

test('executeCommands: --doc mismatch with current doc is rejected', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli status --doc other', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /doc mismatch/);
  assert.equal(r.changed, false);
});

test('executeCommands: init replaces the doc with the default template', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli init --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, true);
  assert.ok(r.source.includes('kind: start'));
  assert.ok(r.lines.some((l) => l.includes('已初始化')));
});

test('executeCommands: convert exports mermaid without modifying the doc', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli convert --doc main --to mermaid', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.lines.some((l) => l.includes('flowchart')));
});

test('executeCommands: convert to unknown format is an error', async () => {
  const r = await executeCommands(SRC, 'lgdl-web-cli convert --doc main --to nope', 'main');
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.includes('未知格式')));
});

test('executeSubcommand: status returns graph text without modifying', async () => {
  const r = await executeSubcommand(SRC, 'status', {}, 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.lines.some((l) => l.includes('a -> b')));
});

test('executeSubcommand: add-node via structured args', async () => {
  const r = await executeSubcommand(SRC, 'add-node', { id: 'c', label: 'C' }, 'main');
  assert.ok(r.ok, r.error);
  assert.equal(r.changed, true);
  assert.ok(r.source.includes('- id: c'));
});

test('executeSubcommand: validate reports errors', async () => {
  const r = await executeSubcommand('nodes:\n  - id: a\n    - oops', 'validate', {}, 'main');
  assert.ok(r.ok);
  assert.ok(r.lines.some((l) => l.includes('✖') || l.includes('⚠')));
});

test('executeSubcommand: init replaces doc with default template', async () => {
  const r = await executeSubcommand(SRC, 'init', {}, 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, true);
  assert.ok(r.source.includes('kind: start'));
});

test('executeSubcommand: unknown subcommand fails clearly', async () => {
  const r = await executeSubcommand(SRC, 'explode', {}, 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /未知子命令|参数无效/);
});
