import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  serializeLgdl,
  parseLgdl,
} from './index.js';

const BASE: Parameters<typeof addNode>[0] = {
  type: 'flowchart',
  title: 'test',
  nodes: [
    { id: 'a', label: 'A', kind: 'start' },
    { id: 'b', label: 'B' },
  ],
  edges: [{ from: 'a', to: 'b', label: 'go' }],
  groups: [{ id: 'g1', label: 'G1', contains: ['a'] }],
};

test('addNode appends node and optional group membership', () => {
  const { document, summary } = addNode(BASE, { id: 'c', label: 'C', kind: 'decision', group: 'g1' });
  assert.equal(document.nodes.length, 3);
  assert.equal(document.nodes[2].id, 'c');
  assert.deepEqual(document.groups[0].contains, ['a', 'c']);
  assert.ok(summary.includes('added node "c"'));
});

test('addNode rejects duplicate id', () => {
  assert.throws(() => addNode(BASE, { id: 'a' }), /already exists/);
});

test('addNode rejects invalid id chars', () => {
  assert.throws(() => addNode(BASE, { id: 'bad-id!' }), /Invalid node id/);
});

test('removeNode cleans attached edges and group membership', () => {
  const { document } = removeNode(BASE, 'a');
  assert.equal(document.nodes.length, 1);
  assert.equal(document.edges.length, 0); // a->b removed
  assert.deepEqual(document.groups[0].contains, []); // a removed from g1
});

test('removeNode throws on missing node', () => {
  assert.throws(() => removeNode(BASE, 'zzz'), /not found/);
});

test('addEdge appends edge', () => {
  const { document } = addEdge(BASE, { from: 'b', to: 'a', label: 'back' });
  assert.equal(document.edges.length, 2);
  assert.equal(document.edges[1].label, 'back');
});

test('addEdge rejects unknown nodes / duplicates / self-loops', () => {
  assert.throws(() => addEdge(BASE, { from: 'zzz', to: 'a' }), /Source node not found/);
  assert.throws(() => addEdge(BASE, { from: 'a', to: 'zzz' }), /Target node not found/);
  assert.throws(() => addEdge(BASE, { from: 'a', to: 'b' }), /already exists/);
  assert.throws(() => addEdge(BASE, { from: 'a', to: 'a' }), /Self-loop/);
});

test('removeEdge removes only the matching edge', () => {
  const doc = { ...BASE, edges: [...BASE.edges, { from: 'b', to: 'a' }] };
  const { document } = removeEdge(doc, 'a', 'b');
  assert.equal(document.edges.length, 1);
  assert.equal(document.edges[0].from, 'b');
});

test('updateNode changes label/kind', () => {
  const { document } = updateNode(BASE, { id: 'b', label: 'Bee', kind: 'entity' });
  const b = document.nodes.find((n) => n.id === 'b');
  assert.equal(b?.label, 'Bee');
  assert.equal(b?.kind, 'entity');
});

test('serialize -> parse roundtrip preserves the document', () => {
  const { document } = addNode(BASE, { id: 'c', label: 'C', kind: 'decision' });
  const yaml = serializeLgdl(document);
  const reparsed = parseLgdl(yaml);
  assert.equal(reparsed.valid, true, reparsed.issues.map((i) => i.message).join('; '));
  assert.equal(reparsed.document.nodes.length, 3);
  assert.equal(reparsed.document.edges.length, 1);
  assert.equal(reparsed.document.groups.length, 1);
});

test('serialize produces stable output (deterministic)', () => {
  const a = serializeLgdl(BASE);
  const b = serializeLgdl(BASE);
  assert.equal(a, b);
});

test('serialized output can be re-parsed to identical model', () => {
  const yaml = serializeLgdl(BASE);
  const reparsed = parseLgdl(yaml);
  assert.deepEqual(reparsed.document, BASE);
});
