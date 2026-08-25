import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation,
  applyOperations,
  describeOperation,
  type LgdlOperation,
} from './operations.js';
import { parseLgdl } from './parser.js';

const BASE = `title: ops
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
groups:
  - id: g
    label: G
    contains: [a]
`;

function doc() {
  const r = parseLgdl(BASE);
  assert.ok(r.valid, r.issues.map((i) => i.message).join('; '));
  return r.document;
}

test('applyOperation: add-node inserts a node', () => {
  const r = applyOperation(doc(), { op: 'add-node', id: 'c', label: 'C' });
  assert.ok(r.document.nodes.some((n) => n.id === 'c' && n.label === 'C'));
  assert.match(r.summary, /added node "c"/);
});

test('applyOperation: update-node renames and rewrites edges', () => {
  const r = applyOperation(doc(), { op: 'update-node', id: 'a', newId: 'a2' });
  const d = r.document;
  assert.ok(d.nodes.some((n) => n.id === 'a2'));
  assert.ok(d.edges.some((e) => e.from === 'a2' && e.to === 'b'));
  assert.ok(d.groups.some((g) => g.contains.includes('a2')));
});

test('applyOperation: remove-edge with label picks the parallel edge', () => {
  const d = doc();
  // add a second parallel edge, then remove only the labeled one
  const withSecond = applyOperation(d, { op: 'add-edge', from: 'a', to: 'b', label: 'other' });
  assert.equal(withSecond.document.edges.length, 2);
  const r = applyOperation(withSecond.document, { op: 'remove-edge', from: 'a', to: 'b', label: 'dep' });
  assert.equal(r.document.edges.length, 1);
  assert.equal(r.document.edges[0].label, 'other');
});

test('applyOperation: add-group places members', () => {
  const r = applyOperation(doc(), { op: 'add-group', id: 'g2', label: 'G2', contains: ['b'] });
  const g = r.document.groups.find((x) => x.id === 'g2');
  assert.ok(g);
  assert.deepEqual(g.contains, ['b']);
});

test('applyOperation: unknown target throws a clear error', () => {
  assert.throws(
    () => applyOperation(doc(), { op: 'update-node', id: 'nope', label: 'X' }),
    /Node not found: "nope"/,
  );
});

test('applyOperations: applies a sequence and reports summaries', () => {
  const ops: LgdlOperation[] = [
    { op: 'add-node', id: 'c', label: 'C' },
    { op: 'add-edge', from: 'b', to: 'c', label: 'next' },
    { op: 'update-node', id: 'a', label: 'A1' },
  ];
  const r = applyOperations(doc(), ops);
  assert.equal(r.failedIndex, -1);
  assert.equal(r.error, null);
  assert.equal(r.results.length, 3);
  assert.ok(r.document.nodes.some((n) => n.id === 'c'));
  assert.ok(r.document.edges.some((e) => e.from === 'b' && e.to === 'c'));
});

test('applyOperations: stops at the first failure, keeps partial result', () => {
  const ops: LgdlOperation[] = [
    { op: 'add-node', id: 'c' },
    { op: 'update-node', id: 'ghost', label: 'X' }, // fails
    { op: 'add-node', id: 'd' }, // never reached
  ];
  const r = applyOperations(doc(), ops);
  assert.equal(r.failedIndex, 1);
  assert.match(r.error ?? '', /Node not found/);
  assert.equal(r.results.length, 3);
  assert.ok(r.results[0]);
  assert.equal(r.results[1], null);
  assert.equal(r.results[2], null);
  // partial result: c was added, d was not
  assert.ok(r.document.nodes.some((n) => n.id === 'c'));
  assert.ok(!r.document.nodes.some((n) => n.id === 'd'));
});

test('applyOperations: empty sequence is a no-op', () => {
  const r = applyOperations(doc(), []);
  assert.equal(r.failedIndex, -1);
  assert.deepEqual(r.results, []);
  // doc() is parseLgdl(BASE) — the `groups:` entry becomes a kind:'group'
  // node in `nodes`, so the count is a,b + group node g = 3
  assert.equal(r.document.nodes.length, 3);
});

test('describeOperation: every variant has a readable label', () => {
  const ops: LgdlOperation[] = [
    { op: 'add-node', id: 'x' },
    { op: 'remove-node', id: 'x' },
    { op: 'update-node', id: 'x' },
    { op: 'add-edge', from: 'a', to: 'b' },
    { op: 'remove-edge', from: 'a', to: 'b' },
    { op: 'update-edge', from: 'a', to: 'b' },
    { op: 'add-group', id: 'g' },
    { op: 'remove-group', id: 'g' },
    { op: 'update-group', id: 'g' },
  ];
  for (const op of ops) {
    assert.match(describeOperation(op), /^(add|remove|update)-(node|edge|group)/);
  }
});
