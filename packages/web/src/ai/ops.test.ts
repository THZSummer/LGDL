import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractOperations, applyOpsToSource } from './ops.js';

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

test('extractOperations: parses a valid ```ops block', () => {
  const text = '好的，我来修改：\n\n```ops\n[{"op":"add-node","id":"c","label":"C"}]\n```\n\n完成。';
  const ops = extractOperations(text);
  assert.ok(ops);
  assert.deepEqual(ops, [{ op: 'add-node', id: 'c', label: 'C' }]);
});

test('extractOperations: null when no ops block', () => {
  assert.equal(extractOperations('没有任何操作'), null);
});

test('extractOperations: null when the block is not an array of known ops', () => {
  assert.equal(extractOperations('```ops\n{"op":"add-node"}\n```'), null);
  assert.equal(extractOperations('```ops\n[{"op":"explode"}]\n```'), null);
  assert.equal(extractOperations('```ops\nnot json\n```'), null);
});

test('applyOpsToSource: applies a sequence and returns the new source', () => {
  const r = applyOpsToSource(SRC, [
    { op: 'add-node', id: 'c', label: 'C' },
    { op: 'add-edge', from: 'b', to: 'c', label: 'next' },
  ]);
  assert.ok(r.ok);
  assert.ok(r.source);
  assert.ok(r.source.includes('- id: c'));
  assert.ok(r.source.includes('to: c'));
  assert.equal(r.summaries?.length, 2);
});

test('applyOpsToSource: failed op reports which op and why', () => {
  const r = applyOpsToSource(SRC, [{ op: 'update-node', id: 'ghost', label: 'X' }]);
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /update-node ghost 失败/);
});

test('applyOpsToSource: rejects when the current source is invalid', () => {
  const r = applyOpsToSource('nodes:\n  - id: a\n    - oops', [{ op: 'add-node', id: 'x' }]);
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /当前源码有/);
});
