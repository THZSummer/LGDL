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

test('extractCommands: parses a ```bash block', () => {
  const text = '我来修改：\n\n```bash\nlgdl add-node --id c --label C\n```\n\n完成。';
  assert.equal(extractCommands(text), 'lgdl add-node --id c --label C\n');
});

test('extractCommands: null when no command block', () => {
  assert.equal(extractCommands('没有命令'), null);
});

test('executeCommands: applies add-node then add-edge', () => {
  const r = executeCommands(SRC, 'lgdl add-node --id c --label C\nlgdl add-edge --from b --to c --label next');
  assert.ok(r.ok, r.error);
  assert.ok(r.changed);
  assert.ok(r.source.includes('- id: c'));
  assert.ok(r.source.includes('to: c'));
  assert.equal(r.lines.filter((l) => l.startsWith('✓')).length, 2);
});

test('executeCommands: status outputs the graph and does not modify', () => {
  const r = executeCommands(SRC, 'lgdl status');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.lines.some((l) => l.includes('# t [flowchart]')));
  assert.ok(r.lines.some((l) => l.includes('a -> b')));
});

test('executeCommands: failed op reports which command and why', () => {
  const r = executeCommands(SRC, 'lgdl update-node --id ghost --label X');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /ghost/);
});

test('executeCommands: parse error stops the batch', () => {
  const r = executeCommands(SRC, 'lgdl add-node --id c\nlgdl explode --all');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /未知子命令/);
  assert.equal(r.changed, false);
});

test('executeCommands: rejects when the current source is invalid', () => {
  const r = executeCommands('nodes:\n  - id: a\n    - oops', 'lgdl add-node --id x');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /source invalid/);
});

test('executeCommands: empty command text is a no-op', () => {
  const r = executeCommands(SRC, '');
  assert.ok(r.ok);
  assert.equal(r.changed, false);
});
