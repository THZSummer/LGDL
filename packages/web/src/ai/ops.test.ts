import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCommands, executeCommands } from './ops.js';

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

test('extractCommands: parses a ```lgdl-web-cli protocol block', () => {
  const text = '我来修改：\n\n```lgdl-web-cli\nlgdl add-node --doc main --id c --label C\n```\n\n完成。';
  assert.equal(extractCommands(text), 'lgdl add-node --doc main --id c --label C\n');
});

test('extractCommands: ignores commands in other code fences (bash/code)', () => {
  // bash 块只是表达，不是执行协议 → 不提取
  assert.equal(extractCommands('```bash\nlgdl add-node --id c\n```'), null);
  assert.equal(extractCommands('```lgdl\ntitle: x\n```'), null);
  assert.equal(extractCommands('```lgdl-cli\nlgdl status --doc main\n```'), null);
});

test('extractCommands: null when no protocol block', () => {
  assert.equal(extractCommands('没有协议块'), null);
});

test('executeCommands: applies add-node then add-edge', () => {
  const r = executeCommands(SRC, 'lgdl add-node --doc main --id c --label C\nlgdl add-edge --doc main --from b --to c --label next', 'main');
  assert.ok(r.ok, r.error);
  assert.ok(r.changed);
  assert.ok(r.source.includes('- id: c'));
  assert.ok(r.source.includes('to: c'));
  assert.equal(r.lines.filter((l) => l.startsWith('✓')).length, 2);
});

test('executeCommands: status outputs the graph and does not modify', () => {
  const r = executeCommands(SRC, 'lgdl status --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.lines.some((l) => l.includes('# t [flowchart]')));
  assert.ok(r.lines.some((l) => l.includes('a -> b')));
});

test('executeCommands: failed op reports which command and why', () => {
  const r = executeCommands(SRC, 'lgdl update-node --doc main --id ghost --label X', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /ghost/);
});

test('executeCommands: parse error stops the batch', () => {
  const r = executeCommands(SRC, 'lgdl add-node --doc main --id c\nlgdl explode --doc main --all', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /未知子命令/);
  assert.equal(r.changed, false);
});

test('executeCommands: rejects when the current source is invalid', () => {
  const r = executeCommands('nodes:\n  - id: a\n    - oops', 'lgdl add-node --doc main --id x', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /source invalid/);
});

test('executeCommands: empty command text is a no-op', () => {
  const r = executeCommands(SRC, '', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
});

test('executeCommands: validate reports syntax ok on valid source', () => {
  const r = executeCommands(SRC, 'lgdl validate --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.ok(r.lines.some((l) => l.includes('语法正确')));
});

test('executeCommands: validate reports errors on invalid source', () => {
  const r = executeCommands('nodes:\n  - id: a\n    - oops', 'lgdl validate --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.ok(r.lines.some((l) => l.includes('✖') || l.includes('⚠')));
});

test('executeCommands: --doc mismatch with current doc is rejected', () => {
  const r = executeCommands(SRC, 'lgdl status --doc other', 'main');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /doc mismatch/);
  assert.equal(r.changed, false);
});

test('executeCommands: init replaces the doc with the default template', () => {
  const r = executeCommands(SRC, 'lgdl init --doc main', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, true);
  assert.ok(r.source.includes('kind: start'));
  assert.ok(r.lines.some((l) => l.includes('已初始化')));
});

test('executeCommands: convert exports mermaid without modifying the doc', () => {
  const r = executeCommands(SRC, 'lgdl convert --doc main --to mermaid', 'main');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.lines.some((l) => l.includes('flowchart')));
});

test('executeCommands: convert to unknown format is an error', () => {
  const r = executeCommands(SRC, 'lgdl convert --doc main --to nope', 'main');
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.includes('未知格式')));
});
