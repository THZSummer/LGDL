import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  updateEdge,
  addGroup,
  removeGroup,
  serializeLgdl,
  parseLgdl,
  exportMermaid,
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

test('attrs nested object parses and roundtrips', () => {
  const yaml = `type: gantt
nodes:
  - id: task1
    label: 开发
    attrs:
      start: 2026-09-01
      duration: 5
      tags: [a, b]
`;
  const parsed = parseLgdl(yaml);
  assert.equal(parsed.valid, true);
  const node = parsed.document.nodes[0];
  assert.deepEqual(node.attrs, { start: '2026-09-01', duration: 5, tags: ['a', 'b'] });

  const back = serializeLgdl(parsed.document);
  const reparsed = parseLgdl(back);
  assert.deepEqual(reparsed.document.nodes[0].attrs, { start: '2026-09-01', duration: 5, tags: ['a', 'b'] });
});

test('edge attrs parse and roundtrip', () => {
  const yaml = `type: er
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: b
    label: 拥有
    attrs:
      cardinality: "1..*"
`;
  const parsed = parseLgdl(yaml);
  assert.equal(parsed.valid, true);
  assert.deepEqual(parsed.document.edges[0].attrs, { cardinality: '1..*' });
  const back = serializeLgdl(parsed.document);
  const reparsed = parseLgdl(back);
  assert.deepEqual(reparsed.document.edges[0].attrs, { cardinality: '1..*' });
});

test('new diagram types are accepted', () => {
  for (const type of ['er', 'state', 'gantt']) {
    const result = parseLgdl(`type: ${type}\nnodes:\n  - id: a\n`);
    assert.equal(result.valid, true, `${type} should be valid: ${result.issues.map((i) => i.message).join('; ')}`);
  }
});

test('new node kinds are accepted', () => {
  const result = parseLgdl(`type: state
nodes:
  - id: s1
    kind: state
  - id: m1
    kind: milestone
`);
  assert.equal(result.valid, true);
});

test('addNode supports attrs (gantt start/duration)', () => {
  const { document } = addNode(BASE, { id: 'task', attrs: { start: 3, duration: 5 } });
  const node = document.nodes.find((n) => n.id === 'task');
  assert.deepEqual(node?.attrs, { start: 3, duration: 5 });
  const yaml = serializeLgdl(document);
  const reparsed = parseLgdl(yaml);
  assert.deepEqual(reparsed.document.nodes.find((n) => n.id === 'task')?.attrs, { start: 3, duration: 5 });
});

test('addEdge supports attrs (ER cardinality)', () => {
  const { document } = addEdge(BASE, { from: 'b', to: 'a', label: '拥有', attrs: { cardinality: '1..*' } });
  const edge = document.edges.find((e) => e.from === 'b' && e.to === 'a');
  assert.deepEqual(edge?.attrs, { cardinality: '1..*' });
});

test('updateNode merges attrs', () => {
  const doc = { ...BASE, nodes: [{ id: 'a', label: 'A', attrs: { x: 1 } }] };
  const { document } = updateNode(doc, { id: 'a', attrs: { y: 2 } });
  assert.deepEqual(document.nodes[0].attrs, { x: 1, y: 2 });
});

test('updateEdge merges attrs', () => {
  const doc = { ...BASE, edges: [{ from: 'a', to: 'b', label: 'go', attrs: { k: 1 } }] };
  const { document } = updateEdge(doc, { from: 'a', to: 'b', attrs: { cardinality: '1..1' } });
  assert.deepEqual(document.edges[0].attrs, { k: 1, cardinality: '1..1' });
});

test('addGroup creates group with members', () => {
  const { document, summary } = addGroup(BASE, { id: 'g2', label: 'G2', contains: ['b'] });
  assert.equal(document.groups.length, 2);
  assert.deepEqual(document.groups[1].contains, ['b']);
  assert.ok(summary.includes('added group "g2"'));
});

test('addGroup rejects unknown member', () => {
  assert.throws(() => addGroup(BASE, { id: 'g2', contains: ['ghost'] }), /unknown node/);
});

test('removeGroup removes group', () => {
  const { document } = removeGroup(BASE, 'g1');
  assert.equal(document.groups.length, 0);
});

test('removeGroup throws on missing', () => {
  assert.throws(() => removeGroup(BASE, 'nope'), /not found/);
});

test('exportMermaid flowchart', () => {
  const doc = {
    type: 'flowchart' as const,
    nodes: [
      { id: 'a', label: '开始', kind: 'start' as const },
      { id: 'b', label: '处理' },
    ],
    edges: [{ from: 'a', to: 'b', label: '下一步' }],
    groups: [],
  };
  const out = exportMermaid(doc);
  assert.ok(out.startsWith('flowchart TD'));
  assert.ok(out.includes('a["开始"]'));
  assert.ok(out.includes('b["处理"]'));
  assert.ok(out.includes('a -->|"下一步"| b'));
});

test('exportMermaid sequence', () => {
  const doc = {
    type: 'sequence' as const,
    nodes: [
      { id: 'user', label: '用户', kind: 'start' as const },
      { id: 'srv', label: '服务' },
    ],
    edges: [{ from: 'user', to: 'srv', label: '请求' }],
    groups: [],
  };
  const out = exportMermaid(doc);
  assert.ok(out.startsWith('sequenceDiagram'));
  assert.ok(out.includes('participant user as 用户'));
  assert.ok(out.includes('user->>srv: 请求'));
});

test('exportMermaid mindmap', () => {
  const doc = {
    type: 'mindmap' as const,
    nodes: [
      { id: 'root', label: '主题' },
      { id: 'c1', label: '分支1' },
      { id: 'c2', label: '分支2' },
    ],
    edges: [
      { from: 'root', to: 'c1' },
      { from: 'root', to: 'c2' },
    ],
    groups: [],
  };
  const out = exportMermaid(doc);
  assert.ok(out.startsWith('mindmap'));
  assert.ok(out.includes('主题'));
  assert.ok(out.includes('分支1'));
});

test('exportMermaid state', () => {
  const doc = {
    type: 'state' as const,
    nodes: [
      { id: 'a', label: '待支付', kind: 'state' as const },
      { id: 'b', label: '已完成', kind: 'end' as const },
    ],
    edges: [{ from: 'a', to: 'b', label: '支付' }],
    groups: [],
  };
  const out = exportMermaid(doc);
  assert.ok(out.startsWith('stateDiagram-v2'));
  assert.ok(out.includes('a --> [已完成]: 支付'));
});

test('exportMermaid gantt', () => {
  const doc = {
    type: 'gantt' as const,
    nodes: [
      { id: 't1', label: '开发', attrs: { start: 0, duration: 3 } },
    ],
    edges: [],
    groups: [],
  };
  const out = exportMermaid(doc);
  assert.ok(out.startsWith('gantt'));
  assert.ok(out.includes('dateFormat YYYY-MM-DD'));
  assert.ok(out.includes('开发 : t1, 2026-01-01, 3d'));
});

test('exportMermaid quotes are escaped', () => {
  const doc = {
    type: 'flowchart' as const,
    nodes: [{ id: 'a', label: 'say "hi"' }],
    edges: [],
    groups: [],
  };
  const out = exportMermaid(doc);
  assert.ok(out.includes('say &quot;hi&quot;'));
});
