import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliCommand, parseCommandBatch, tokenize } from './cli-parser.js';
import { formatStatus } from './status.js';
import { parseLgdl } from './parser.js';

test('tokenize: splits on whitespace, respects quotes', () => {
  assert.deepEqual(tokenize('lgdl add-node --id x --label "hello world"'), [
    'lgdl',
    'add-node',
    '--id',
    'x',
    '--label',
    'hello world',
  ]);
});

test('parseCliCommand: add-node with lgdl prefix', () => {
  const r = parseCliCommand('lgdl add-node --id user --label 用户 --kind entity');
  assert.equal(r.kind, 'op');
  if (r.kind === 'op') {
    assert.equal(r.op.op, 'add-node');
    assert.equal(r.op.id, 'user');
    assert.equal(r.op.label, '用户');
    assert.equal(r.op.kind, 'entity');
  }
});

test('parseCliCommand: works without lgdl prefix too', () => {
  const r = parseCliCommand('add-edge --from a --to b --label 依赖');
  assert.equal(r.kind, 'op');
  if (r.kind === 'op') {
    assert.equal(r.op.op, 'add-edge');
    assert.equal(r.op.from, 'a');
    assert.equal(r.op.to, 'b');
    assert.equal(r.op.label, '依赖');
  }
});

test('parseCliCommand: update-node with new-id and attrs', () => {
  const r = parseCliCommand('lgdl update-node --id old --new-id new --attrs start=0,duration=3');
  assert.equal(r.kind, 'op');
  if (r.kind === 'op') {
    assert.equal(r.op.op, 'update-node');
    assert.equal(r.op.newId, 'new');
    assert.deepEqual(r.op.attrs, { start: 0, duration: 3 });
  }
});

test('parseCliCommand: status', () => {
  assert.deepEqual(parseCliCommand('lgdl status'), { kind: 'status' });
});

test('parseCliCommand: unknown command is an error', () => {
  const r = parseCliCommand('lgdl explode --all');
  assert.equal(r.kind, 'error');
});

test('parseCliCommand: missing required arg is an error', () => {
  const r = parseCliCommand('lgdl add-node --label 只有标签');
  assert.equal(r.kind, 'error');
  if (r.kind === 'error') assert.match(r.message, /--id/);
});

test('parseCommandBatch: multiple commands, stops at first error', () => {
  const r = parseCommandBatch(
    'lgdl status\nlgdl add-node --id a --label A\nlgdl add-node --id b\nlgdl remove-node', // remove-node 缺 --id → 解析失败
  );
  assert.equal(r.ops.length, 2);
  assert.equal(r.wantsStatus, true);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].index, 3);
  assert.match(r.errors[0].message, /--id/);
});

test('parseCommandBatch: error message names the failing command', () => {
  const r = parseCommandBatch('lgdl update-edge --from a --to b');
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /no change requested/);
});

test('formatStatus: renders nodes/edges/groups like lgdl status', () => {
  const src = `title: demo
type: flowchart
nodes:
  - id: start
    kind: start
    label: 开始
  - id: task
    label: 处理
edges:
  - from: start
    to: task
groups:
  - id: g1
    label: G
    contains: [start]
`;
  const parsed = parseLgdl(src);
  assert.ok(parsed.valid);
  const text = formatStatus(parsed.document);
  assert.match(text, /# demo \[flowchart\]/);
  assert.match(text, /start \(开始\) :start/);
  assert.match(text, /task \(处理\)/);
  assert.match(text, /start -> task/);
  assert.match(text, /g1 \(G\): start/);
});
