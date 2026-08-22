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
  importMermaid,
  convert,
  listFormats,
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
  assert.throws(() => addEdge(BASE, { from: 'zzz', to: 'a' }), /Source node or group not found/);
  assert.throws(() => addEdge(BASE, { from: 'a', to: 'zzz' }), /Target node or group not found/);
  assert.throws(() => addEdge(BASE, { from: 'a', to: 'b' }), /already exists/);
  assert.throws(() => addEdge(BASE, { from: 'a', to: 'a' }), /Self-loop/);
});

test('addEdge supports group ids (aggregate edges)', () => {
  const { document, summary } = addEdge(BASE, { from: 'g1', to: 'a', label: '组到节点' });
  assert.equal(document.edges.length, 2);
  assert.equal(document.edges[1].from, 'g1');
  assert.equal(document.edges[1].to, 'a');
  assert.ok(summary.includes('added edge g1 -> a'));
  // resulting document validates
  const res = parseLgdl(serializeLgdl(document));
  assert.equal(res.valid, true, res.issues.map((i) => i.message).join('; '));
});

test('addEdge rejects unknown group references', () => {
  assert.throws(() => addEdge(BASE, { from: 'nope', to: 'a' }), /Source node or group not found/);
  assert.throws(() => addEdge(BASE, { from: 'a', to: 'nope' }), /Target node or group not found/);
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
  assert.throws(() => addGroup(BASE, { id: 'g2', contains: ['ghost'] }), /unknown node or group/);
});

test('addGroup supports nested groups (group id in contains)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    ...BASE,
    groups: [{ id: 'inner', label: '内层', contains: ['a'] }],
  };
  const { document, summary } = addGroup(doc, { id: 'outer', label: '外层', contains: ['inner', 'b'] });
  assert.equal(document.groups.length, 2);
  assert.deepEqual(document.groups[1].contains, ['inner', 'b']);
  assert.ok(summary.includes('added group "outer"'));
  // resulting document is valid (nesting is legal)
  const res = parseLgdl(serializeLgdl(document));
  assert.equal(res.valid, true, res.issues.map((i) => i.message).join('; '));
});

test('addGroup rejects member already in another group', () => {
  assert.throws(() => addGroup(BASE, { id: 'g2', contains: ['a'] }), /already belongs to group "g1"/);
});

test('addGroup rejects a group already nested in another group', () => {
  const doc: Parameters<typeof addNode>[0] = {
    ...BASE,
    groups: [
      { id: 'g1', label: 'G1', contains: ['a'] },
      { id: 'g2', label: 'G2', contains: ['b'] },
      { id: 'g3', label: 'G3', contains: ['g2'] },
    ],
  };
  assert.throws(() => addGroup(doc, { id: 'g4', contains: ['g2'] }), /already belongs to group "g3"/);
});

test('addGroup rejects self-containment', () => {
  assert.throws(() => addGroup(BASE, { id: 'g2', contains: ['g2'] }), /cannot contain itself/);
});

test('addGroup rejects invalid id chars', () => {
  assert.throws(() => addGroup(BASE, { id: 'bad group!' }), /Invalid group id/);
});

test('removeGroup detaches it from parent groups (nested)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    ...BASE,
    groups: [
      { id: 'inner', contains: ['a'] },
      { id: 'outer', contains: ['inner', 'b'] },
    ],
  };
  const { document } = removeGroup(doc, 'inner');
  assert.equal(document.groups.length, 1);
  assert.deepEqual(document.groups[0].contains, ['b'], 'outer no longer references removed group');
  const res = parseLgdl(serializeLgdl(document));
  assert.equal(res.valid, true, res.issues.map((i) => i.message).join('; '));
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

test('importMermaid flowchart', () => {
  const mermaid = `flowchart TD
    a["开始"]
    b["处理"]
    a -->|"下一步"| b
`;
  const r = importMermaid(mermaid);
  assert.equal(r.valid, true);
  assert.equal(r.document.type, 'flowchart');
  assert.equal(r.document.nodes.length, 2);
  assert.equal(r.document.edges[0].label, '下一步');
});

test('importMermaid sequence', () => {
  const mermaid = `sequenceDiagram
    participant user as 用户
    participant srv as 服务
    user->>srv: 请求
`;
  const r = importMermaid(mermaid);
  assert.equal(r.document.type, 'sequence');
  assert.equal(r.document.nodes.length, 2);
  assert.equal(r.document.nodes[0].label, '用户');
  assert.equal(r.document.edges[0].label, '请求');
});

test('importMermaid mindmap', () => {
  const mermaid = `mindmap
  root
    child1
    child2
`;
  const r = importMermaid(mermaid);
  assert.equal(r.document.type, 'mindmap');
  assert.equal(r.document.nodes.length, 3);
  assert.equal(r.document.edges.length, 2);
});

test('importMermaid state', () => {
  const mermaid = `stateDiagram-v2
    a --> b: 支付
    b --> [完成]
`;
  const r = importMermaid(mermaid);
  assert.equal(r.document.type, 'state');
  assert.equal(r.document.nodes.length, 3);
  assert.ok(r.document.nodes.some((n) => n.kind === 'end'));
});

test('importMermaid er', () => {
  const mermaid = `erDiagram
    用户 {
        string name
    }
    订单 {
        int id
    }
    用户 ||--o{ 订单 : 拥有
`;
  const r = importMermaid(mermaid);
  assert.equal(r.document.type, 'er');
  assert.equal(r.document.nodes.length, 2);
  // mermaid connectors map to the explicit cardinality fields
  assert.equal(r.document.edges[0].cardinalityFrom, '1'); // ||
  assert.equal(r.document.edges[0].cardinalityTo, '0..*'); // o{
});

test('importMermaid gantt', () => {
  const mermaid = `gantt
    dateFormat YYYY-MM-DD
    section 任务
    开发 : dev, 2026-01-01, 3d
`;
  const r = importMermaid(mermaid);
  assert.equal(r.document.type, 'gantt');
  assert.equal(r.document.nodes.length, 1);
  assert.equal(r.document.nodes[0].attrs?.duration, 3);
});

test('importMermaid roundtrip: export -> import -> export is stable', () => {
  // start from an LGDL doc, export, import, re-export: structure preserved
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: '开始', kind: 'start' },
      { id: 'b', label: '处理' },
    ],
    edges: [{ from: 'a', to: 'b', label: '下一步' }],
    groups: [],
  };
  const m1 = exportMermaid(doc);
  const imported = importMermaid(m1);
  assert.equal(imported.valid, true);
  assert.equal(imported.document.nodes.length, 2);
  assert.equal(imported.document.edges.length, 1);
  // labels survive
  const a = imported.document.nodes.find((n) => n.id === 'a');
  assert.equal(a?.label, '开始');
  const m2 = exportMermaid(imported.document);
  assert.ok(m2.includes('开始'));
  assert.ok(m2.includes('下一步'));
});

test('importMermaid rejects unsupported type', () => {
  const r = importMermaid('pie\n  "A" : 1');
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((i) => i.message.includes('Unsupported Mermaid diagram type')));
});

test('convert to plantuml produces activity diagram with if/else fork', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: '开始', kind: 'start' },
      { id: 'b', label: '判断', kind: 'decision' },
      { id: 'c', label: '成功', kind: 'end' },
      { id: 'd', label: '失败', kind: 'end' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c', label: '通过' },
      { from: 'b', to: 'd', label: '失败' },
    ],
    groups: [],
  };
  const out = convert(doc, 'plantuml');
  assert.ok(out.startsWith('@startuml'));
  assert.ok(out.includes('start'));
  assert.ok(out.includes('if (判断) then (通过)'));
  assert.ok(out.includes('else (失败)'));
  assert.ok(out.endsWith('@enduml'));
});

test('convert to json roundtrips structure', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A', kind: 'start' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'a', to: 'b', label: 'x' }],
    groups: [],
  };
  const out = convert(doc, 'json');
  const parsed = JSON.parse(out);
  assert.equal(parsed.type, 'flowchart');
  assert.equal(parsed.nodes.length, 2);
  assert.equal(parsed.edges[0].label, 'x');
});

test('convert unknown format throws with available list', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [{ id: 'a' }],
    edges: [],
    groups: [],
  };
  assert.throws(() => convert(doc, 'bogus'), /Unknown output format/);
  const formats = listFormats();
  assert.ok(formats.includes('mermaid'));
  assert.ok(formats.includes('plantuml'));
  assert.ok(formats.includes('json'));
});

// ---- members: structured class members via mutations ----

test('addNode supports structured members', () => {
  const { document } = addNode({ ...BASE, type: 'uml-class' }, {
    id: 'cart',
    label: 'Cart',
    kind: 'entity',
    members: [
      { kind: 'attribute', name: 'items', type: 'list', visibility: 'private' },
      { kind: 'method', name: 'addItem', type: 'void', params: '()', visibility: 'public' },
    ],
  });
  const cart = document.nodes.find((n) => n.id === 'cart');
  assert.equal(cart?.members?.length, 2);
  assert.deepEqual(cart?.members?.[0], {
    kind: 'attribute',
    name: 'items',
    type: 'list',
    visibility: 'private',
  });
});

test('addNode rejects malformed members', () => {
  assert.throws(
    () => addNode({ ...BASE, type: 'uml-class' }, { id: 'x', kind: 'entity', members: [{ kind: 'property', name: 'a' }] as never }),
    /unknown member kind/,
  );
  assert.throws(
    () => addNode({ ...BASE, type: 'uml-class' }, { id: 'x', kind: 'entity', members: [{ kind: 'attribute', name: '' }] }),
    /member name is required/,
  );
});

test('updateNode memberAdd appends and memberRemove deletes', () => {
  let doc = { ...BASE, type: 'uml-class' as const, nodes: [
    { id: 'cart', label: 'Cart', kind: 'entity' as const, members: [{ kind: 'attribute' as const, name: 'items', type: 'list' }] },
  ]};
  let r = updateNode(doc, { id: 'cart', memberAdd: { kind: 'method', name: 'checkout', type: 'void' } });
  assert.deepEqual(r.document.nodes[0].members, [
    { kind: 'attribute', name: 'items', type: 'list' },
    { kind: 'method', name: 'checkout', type: 'void' },
  ]);
  r = updateNode(r.document, { id: 'cart', memberRemove: 'items' });
  assert.deepEqual(r.document.nodes[0].members, [{ kind: 'method', name: 'checkout', type: 'void' }]);
});

test('updateNode memberRemove of a missing member throws', () => {
  assert.throws(
    () => updateNode({ ...BASE, type: 'uml-class', nodes: [{ id: 'x', kind: 'entity' }] }, { id: 'x', memberRemove: 'ghost' }),
    /Member not found/,
  );
});

// ---- cardinality: explicit multiplicity fields via mutations ----

test('addEdge supports cardinalityFrom/To', () => {
  const { document } = addEdge(BASE, { from: 'b', to: 'a', label: '拥有', cardinalityFrom: '1', cardinalityTo: '*' });
  const e = document.edges[document.edges.length - 1];
  assert.equal(e.label, '拥有');
  assert.equal(e.cardinalityFrom, '1');
  assert.equal(e.cardinalityTo, '*');
});

test('updateEdge sets cardinality fields', () => {
  const r = updateEdge(BASE, { from: 'a', to: 'b', cardinalityFrom: '0..1', cardinalityTo: '*' });
  const e = r.document.edges[0];
  assert.equal(e.cardinalityFrom, '0..1');
  assert.equal(e.cardinalityTo, '*');
});
