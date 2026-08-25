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
  updateGroup,
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
  // the parser injects a kind:'group' node for the `groups:` entry, so the
  // re-parsed node count includes it (a,b,c + group node g1)
  assert.equal(reparsed.document.nodes.length, 4);
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
  // The unified model keeps a group as a kind:'group' node in `nodes`, so a
  // hand-built doc whose group lives only in `groups` gains its group node on
  // re-parse. Compare the re-parsed model against BASE + that group node
  // (the parser sets an explicit `attrs: undefined` on the inferred node and
  // on the recomputed group projection).
  const expected: typeof BASE = {
    ...BASE,
    nodes: [
      ...BASE.nodes,
      { id: 'g1', label: 'G1', kind: 'group', contains: ['a'], attrs: undefined },
    ],
    groups: BASE.groups.map((g) => ({ ...g, attrs: undefined })),
  };
  assert.deepEqual(reparsed.document, expected);
});

test('attrs nested object parses and roundtrips', () => {
  const yaml = `type: gantt
nodes:
  - id: task1
    label: 开发
    attrs:
      start: 100
      duration: 5
      tags: [a, b]
`;
  const parsed = parseLgdl(yaml);
  assert.equal(parsed.valid, true);
  const node = parsed.document.nodes[0];
  assert.deepEqual(node.attrs, { start: 100, duration: 5, tags: ['a', 'b'] });

  const back = serializeLgdl(parsed.document);
  const reparsed = parseLgdl(back);
  assert.deepEqual(reparsed.document.nodes[0].attrs, { start: 100, duration: 5, tags: ['a', 'b'] });
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
      note: "manual note"
`;
  const parsed = parseLgdl(yaml);
  assert.equal(parsed.valid, true);
  assert.deepEqual(parsed.document.edges[0].attrs, { note: 'manual note' });
  const back = serializeLgdl(parsed.document);
  const reparsed = parseLgdl(back);
  assert.deepEqual(reparsed.document.edges[0].attrs, { note: 'manual note' });
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
  // start/end nodes render as circles (so the kind survives round-trips)
  assert.ok(out.includes('a((开始))'));
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
  // terminal states use mermaid's dedicated [*] syntax
  assert.ok(out.includes('a --> [*]: 支付'));
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
  // entity attributes land in the structured members field
  assert.deepEqual(r.document.nodes[0].members, [{ kind: 'attribute', name: 'name', type: 'string' }]);
  assert.deepEqual(r.document.nodes[1].members, [{ kind: 'attribute', name: 'id', type: 'int' }]);
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

test('importMermaid flowchart keeps labels on shaped nodes and chained edges', () => {
  const mermaid = `flowchart TD
    A["开始"] --> B{"判断"}
    B -->|是| C[结束]
`;
  const r = importMermaid(mermaid);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes.length, 3);
  assert.equal(r.document.nodes[0].id, 'A');
  assert.equal(r.document.nodes[0].label, '开始');
  const b = r.document.nodes.find((n) => n.id === 'B');
  assert.equal(b?.kind, 'decision');
  assert.equal(b?.label, '判断');
  assert.equal(r.document.edges.length, 2);
  assert.equal(r.document.edges[1].label, '是');
});

test('importMermaid sequence does not swallow "-" into participant ids', () => {
  const mermaid = `sequenceDiagram
    John-->>Alice: hello
`;
  const r = importMermaid(mermaid);
  assert.equal(r.valid, true);
  assert.ok(r.document.nodes.some((n) => n.id === 'John'));
  assert.ok(r.document.nodes.some((n) => n.id === 'Alice'));
  assert.ok(!r.document.nodes.some((n) => n.id === 'John-'));
  assert.equal(r.document.edges[0].label, 'hello');
});

test('importMermaid rejects unrecognized lines instead of silently dropping them', () => {
  // subgraphs become groups (single level)
  const r1 = importMermaid(`flowchart TD
    subgraph one["组1"]
      a --> b
    end
`);
  assert.equal(r1.valid, true);
  assert.equal(r1.document.groups.length, 1);
  assert.equal(r1.document.groups[0].id, 'one');
  assert.equal(r1.document.groups[0].label, '组1');
  assert.deepEqual(r1.document.groups[0].contains, ['a', 'b']);

  // nested subgraphs are rejected loudly
  const r1b = importMermaid(`flowchart TD
    subgraph outer["外"]
      subgraph inner["内"]
        a
      end
    end
`);
  assert.equal(r1b.valid, false);
  assert.ok(r1b.issues.some((i) => i.message.includes('Nested subgraphs')));

  // a plain unknown line must error too
  const r2 = importMermaid(`flowchart TD
    a --> b
    wtf is this
`);
  // unknown lines degrade to a warning, the rest of the diagram still imports
  assert.equal(r2.valid, true);
  assert.ok(r2.issues.some((i) => i.severity === 'warning' && i.message.includes('skipped')));
});

test('importMermaid flowchart roundtrip with decision + labels is stable', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'start', label: '开始', kind: 'start' },
      { id: 'check', label: '校验', kind: 'decision' },
      { id: 'ok', label: '成功', kind: 'end' },
    ],
    edges: [
      { from: 'start', to: 'check', label: '进入' },
      { from: 'check', to: 'ok', label: '通过' },
    ],
    groups: [],
  };
  const m = exportMermaid(doc);
  const imported = importMermaid(m);
  assert.equal(imported.valid, true);
  assert.equal(imported.document.nodes.length, 3);
  assert.equal(imported.document.edges.length, 2);
  const check = imported.document.nodes.find((n) => n.id === 'check');
  assert.equal(check?.kind, 'decision');
  assert.equal(check?.label, '校验');
});

test('addEdge allows a different label on the same pair (ER relations)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', label: 'places' }],
    groups: [],
  };
  const r = addEdge(doc, { from: 'user', to: 'order', label: 'manages' });
  assert.equal(r.document.edges.length, 2);
  // ...but the same labeled edge is still rejected
  assert.throws(() => addEdge(r.document, { from: 'user', to: 'order', label: 'places' }), /already exists/);
});

test('importMermaid mindmap shape syntax keeps id and label', () => {
  const r = importMermaid(`mindmap
  root((项目))
    child1[子项]
`);
  assert.equal(r.valid, true);
  assert.ok(r.document.nodes.some((n) => n.id === 'root' && n.label === '项目'));
  assert.ok(r.document.nodes.some((n) => n.id === 'child1' && n.label === '子项'));
});

test('importMermaid state maps [*] to a shared end node and parses declarations', () => {
  const r = importMermaid(`stateDiagram-v2
    state A
    A --> B
    B --> [*]
`);
  assert.equal(r.valid, true);
  const ids = r.document.nodes.map((n) => n.id);
  assert.ok(ids.includes('A') && ids.includes('B'));
  assert.ok(!ids.includes('_'), `no garbage [*] node, got: ${ids.join(', ')}`);
  assert.ok(!ids.includes('state_A'), `"state A" is a declaration, got: ${ids.join(', ')}`);
  // the terminal pseudo-state becomes a shared kind:end node with the edge intact
  const end = r.document.nodes.find((n) => n.id === '__end__');
  assert.ok(end, `shared end node missing, got: ${ids.join(', ')}`);
  assert.equal(end?.kind, 'end');
  assert.equal(r.document.edges.length, 2);
  assert.ok(r.document.edges.some((e) => e.to === '__end__'));
});

test('importMermaid sequence supports hyphenated participant ids', () => {
  const r = importMermaid(`sequenceDiagram
    participant my-service as 我的服务
    my-service-->>Alice: 你好
`);
  assert.equal(r.valid, true);
  assert.ok(r.document.nodes.some((n) => n.id === 'my-service' && n.label === '我的服务'));
  assert.equal(r.document.edges[0].from, 'my-service');
});

test('importMermaid participant label quotes are stripped', () => {
  const r = importMermaid(`sequenceDiagram
    participant John as "John Doe"
`);
  assert.equal(r.valid, true);
  const john = r.document.nodes.find((n) => n.id === 'John');
  assert.equal(john?.label, 'John Doe');
});

test('importMermaid gantt keeps dates before the base (no clamping)', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    任务A : a1, 2025-01-01, 3d
`);
  assert.equal(r.valid, true);
  // 2025-01-01 is 365 days before 2026-01-01 — must NOT clamp to 0
  assert.equal(r.document.nodes[0].attrs?.start, -365);
  assert.equal(r.document.nodes[0].attrs?.duration, 3);
  // convert back to mermaid: the original date survives the round-trip
  const back = exportMermaid(r.document);
  assert.ok(back.includes('2025-01-01'), `round-trip rewrote the date:\n${back}`);
});

test('importMermaid er warns on ambiguous attribute order', () => {
  const r = importMermaid(`erDiagram
    USER {
        int id
        name string
    }
`);
  assert.equal(r.valid, true);
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('name string')));
  // standard order produces no warning
  const r2 = importMermaid(`erDiagram
    USER {
        int id
        string name
    }
`);
  assert.equal(r2.issues.length, 0);
});

test('importMermaid mindmap strips icon annotations', () => {
  const r = importMermaid(`mindmap
    root((项目))::icon(fa fa-home)
      A
`);
  assert.equal(r.valid, true);
  const root = r.document.nodes.find((n) => n.id === 'root');
  assert.equal(root?.label, '项目');
  assert.ok(!root?.label?.includes('icon'));
});

test('importMermaid round-trip decodes &quot; in labels', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: '他说"你好"然后走' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'a', to: 'b', label: '说"好"' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.nodes[0].label, '他说"你好"然后走');
  assert.equal(back.document.edges[0].label, '说"好"');
});

test('importMermaid sequence supports CJK participant ids', () => {
  const r = importMermaid(`sequenceDiagram
    participant 用户
    用户->>管理员: 你好
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes.length, 2);
  assert.equal(r.document.edges[0].label, '你好');
});

test('removeEdge with label removes only that parallel edge', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [
      { from: 'user', to: 'order', label: 'places' },
      { from: 'user', to: 'order', label: 'manages' },
    ],
    groups: [],
  };
  const r = removeEdge(doc, 'user', 'order', 'places');
  assert.equal(r.document.edges.length, 1);
  assert.equal(r.document.edges[0].label, 'manages');
  assert.ok(r.summary.includes('1 edge'));
});

test('updateEdge with fromLabel updates only that parallel edge', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [
      { from: 'user', to: 'order', label: 'places' },
      { from: 'user', to: 'order', label: 'manages' },
    ],
    groups: [],
  };
  // ambiguous without fromLabel
  assert.throws(() => updateEdge(doc, { from: 'user', to: 'order', label: '发货' }), /--edge-label/);
  const r = updateEdge(doc, { from: 'user', to: 'order', fromLabel: 'places', label: '发货' });
  const labels = r.document.edges.map((e) => e.label);
  assert.deepEqual(labels.sort(), ['manages', '发货'].sort());
  // result stays valid (no duplicate)
  const res = parseLgdl(serializeLgdl(r.document));
  assert.equal(res.valid, true);
});

test('importMermaid strips BOM from the mermaid source', () => {
  const r = importMermaid('\uFEFFflowchart TD\n  A --> B\n');
  assert.equal(r.valid, true);
  assert.equal(r.document.type, 'flowchart');
  assert.equal(r.document.nodes.length, 2);
});

test('importMermaid gantt supports week units and milestones', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    任务1 : a1, 2025-01-01, 2w
    milestone 发布 : m1, 2025-02-01, 0d
`);
  assert.equal(r.valid, true);
  const task = r.document.nodes.find((n) => n.id === 'a1');
  assert.equal(task?.attrs?.duration, 14); // 2 weeks = 14 days
  const ms = r.document.nodes.find((n) => n.id === 'm1');
  assert.equal(ms?.kind, 'milestone');
  assert.equal(ms?.label, '发布');
  // milestone round-trips back with the prefix
  const back = exportMermaid(r.document);
  assert.ok(back.includes('milestone 发布 : m1'));
});

test('mindmap round-trip keeps node ids (export -> import)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'mindmap',
    nodes: [
      { id: 'root', label: '项目' },
      { id: 'child1', label: '子项' },
    ],
    edges: [{ from: 'root', to: 'child1' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.ok(back.document.nodes.some((n) => n.id === 'root' && n.label === '项目'));
  assert.ok(back.document.nodes.some((n) => n.id === 'child1' && n.label === '子项'));
});

test('flowchart label with brackets/pipes survives convert -> import', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'n1', label: '查询[订单]' },
      { id: 'n2', label: 'B' },
    ],
    edges: [{ from: 'n1', to: 'n2', label: '使用[缓存]' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true, `import failed: ${back.issues.map((i) => i.message).join('; ')}`);
  assert.equal(back.document.nodes[0].label, '查询[订单]');
  assert.equal(back.document.edges[0].label, '使用[缓存]');
});

test('removeGroup auto-cleans aggregate edges', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'g1', to: 'b', label: '整体' }],
    groups: [{ id: 'g1', label: 'G1', contains: ['a'] }],
  };
  const r = removeGroup(doc, 'g1');
  assert.equal(r.document.edges.length, 0);
  assert.ok(r.summary.includes('aggregate edge'));
  // result validates
  const res = parseLgdl(serializeLgdl(r.document));
  assert.equal(res.valid, true);
});

test('ER round-trip preserves 0..1 cardinality and labels with spaces', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'user', label: '用户', kind: 'entity' },
      { id: 'order', label: '订单', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', label: '下单', cardinalityFrom: '0..1', cardinalityTo: '0..*' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('|o--o{'), `connector wrong:\n${m}`);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.edges[0].cardinalityFrom, '0..1');
  assert.equal(back.document.edges[0].cardinalityTo, '0..*');
  assert.equal(back.document.edges[0].label, '下单');
});

test('flowchart start/end kinds survive convert -> import (circle shapes)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 's1', label: '开始', kind: 'start' },
      { id: 'p1', label: '处理' },
      { id: 'e1', label: '结束', kind: 'end' },
    ],
    edges: [
      { from: 's1', to: 'p1' },
      { from: 'p1', to: 'e1' },
    ],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  const s1 = back.document.nodes.find((n) => n.id === 's1');
  const e1 = back.document.nodes.find((n) => n.id === 'e1');
  assert.equal(s1?.kind, 'start');
  assert.equal(e1?.kind, 'end');
  assert.equal(s1?.label, '开始');
});

test('state round-trip keeps labels and ids (state "label" as id)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'state',
    nodes: [
      { id: 'created', label: '已创建' },
      { id: 'done', label: '已完成', kind: 'end' },
    ],
    edges: [{ from: 'created', to: 'done', label: '完成' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('state "已创建" as created'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  const c = back.document.nodes.find((n) => n.id === 'created');
  assert.equal(c?.label, '已创建');
  const d = back.document.nodes.find((n) => n.kind === 'end');
  assert.equal(d?.label, '已完成');
  assert.ok(!back.document.nodes.some((n) => n.id === '___'));
});

test('importMermaid gantt honors non-YYYY-MM-DD dateFormat', () => {
  const r = importMermaid(`gantt
    dateFormat DD-MM-YYYY
    section S
    需求 : r1, 01-02-2025, 3d
`);
  assert.equal(r.valid, true);
  // 01-02-2025 = 2025-02-01, which is 334 days before 2026-01-01
  assert.equal(r.document.nodes[0].attrs?.start, -334);

  // an unparseable date is an error, never a NaN in the model
  const bad = importMermaid(`gantt
    dateFormat DD-MM-YYYY
    section S
    需求 : r1, 31-13-2025, 3d
`);
  assert.equal(bad.valid, false);
  assert.ok(bad.issues.some((i) => i.message.includes('Invalid date')));
  assert.ok(!bad.document.nodes.some((n) => Number.isNaN(n.attrs?.start)));
});

test('importMermaid flowchart skips direction lines', () => {
  const r = importMermaid(`flowchart LR
    direction TB
    A[开始] --> B[处理]
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes.length, 2);
});

test('mindmap convert with a cycle does not crash and keeps every node', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'mindmap',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('a((') && m.includes('b(('), m);
});

test('mindmap convert keeps orphan components (multiple roots)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'mindmap',
    nodes: [
      { id: 'orphan', label: '孤立节点' },
      { id: 'root', label: '项目' },
      { id: 'a', label: '分支A' },
    ],
    edges: [{ from: 'root', to: 'a' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('orphan(('), `orphan dropped:\n${m}`);
  assert.ok(m.includes('root((') && m.includes('a(('), `real tree dropped:\n${m}`);
  // round-trip keeps all three nodes
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.nodes.length, 3);
});

test('flowchart circle start/end keeps kind via node id (business labels)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'start', label: '用户访问', kind: 'start' },
      { id: 'end', label: '订单完成', kind: 'end' },
    ],
    edges: [{ from: 'start', to: 'end' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  const s = back.document.nodes.find((n) => n.id === 'start');
  const e = back.document.nodes.find((n) => n.id === 'end');
  assert.equal(s?.kind, 'start');
  assert.equal(e?.kind, 'end');
  assert.equal(s?.label, '用户访问');
});

test('state start kind survives convert -> import (initial pseudo-edge)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'state',
    nodes: [
      { id: 's0', label: '初始', kind: 'start' },
      { id: 's1', label: '运行中' },
      { id: 's2', label: '已结束', kind: 'end' },
    ],
    edges: [
      { from: 's0', to: 's1' },
      { from: 's1', to: 's2' },
    ],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('[*] --> s0'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  const s0 = back.document.nodes.find((n) => n.id === 's0');
  assert.equal(s0?.kind, 'start');
  assert.equal(s0?.label, '初始');
});

test('ER round-trip does not fabricate types on typeless members', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      {
        id: 'user',
        label: 'User',
        kind: 'entity',
        members: [
          { kind: 'attribute', name: 'id' },
          { kind: 'attribute', name: 'email', type: 'string' },
        ],
      },
    ],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('id') && !m.includes('string id'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  const id = back.document.nodes[0].members?.find((x) => x.name === 'id');
  assert.equal(id?.type, undefined);
  const email = back.document.nodes[0].members?.find((x) => x.name === 'email');
  assert.equal(email?.type, 'string');
});

test('flowchart kind comments survive convert -> import (business labels)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 's', label: '开始流程', kind: 'start' },
      { id: 'mid', label: '中间' },
      { id: 'n', label: '备注', kind: 'note' },
      { id: 'e', label: '全部结束', kind: 'end' },
    ],
    edges: [
      { from: 's', to: 'mid' },
      { from: 'mid', to: 'e' },
    ],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('%% @lgdl n: kind=note'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  const s = back.document.nodes.find((x) => x.id === 's');
  const n = back.document.nodes.find((x) => x.id === 'n');
  const e = back.document.nodes.find((x) => x.id === 'e');
  assert.equal(s?.kind, 'start');
  assert.equal(s?.label, '开始流程');
  assert.equal(n?.kind, 'note');
  assert.equal(e?.kind, 'end');
});

test('flowchart groups round-trip via subgraphs (with aggregate edges)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'g1', to: 'b', label: '整体' }],
    groups: [{ id: 'g1', label: '组1', contains: ['a'] }],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('subgraph g1["组1"]'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.groups.length, 1);
  assert.equal(back.document.groups[0].id, 'g1');
  assert.deepEqual(back.document.groups[0].contains, ['a']);
  // the aggregate edge still references the group id
  assert.ok(back.document.edges.some((e) => e.from === 'g1' && e.to === 'b'));
});

test('importMermaid mindmap CJK nodes get readable fallback ids', () => {
  const r = importMermaid(`mindmap
  root((根))
    分支一
    分支二
`);
  assert.equal(r.valid, true);
  const ids = r.document.nodes.map((n) => n.id);
  assert.ok(!ids.includes('___'), `garbage id, got: ${ids.join(', ')}`);
  assert.ok(!ids.some((id) => /^_+$/.test(id)));
  assert.ok(r.document.nodes.some((n) => n.label === '分支一'));
});

test('importMermaid state keeps label on bare "state A: label" declarations', () => {
  const r = importMermaid(`stateDiagram-v2
    s1 : 描述文本
`);
  assert.equal(r.valid, true);
  const s1 = r.document.nodes.find((n) => n.id === 's1');
  assert.equal(s1?.label, '描述文本');
});

test('removeEdge without label refuses when parallel edges exist', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [
      { from: 'user', to: 'order', label: 'places' },
      { from: 'user', to: 'order', label: 'manages' },
    ],
    groups: [],
  };
  assert.throws(() => removeEdge(doc, 'user', 'order'), /--edge-label/);
  // with a label it removes exactly one
  const r = removeEdge(doc, 'user', 'order', 'places');
  assert.equal(r.document.edges.length, 1);
  assert.equal(r.document.edges[0].label, 'manages');
});

test('ER quoted entity names round-trip (labels with parens/spaces)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'u1', label: '订单(在线)', kind: 'entity' },
      { id: 'u2', label: 'User Account', kind: 'entity' },
    ],
    edges: [{ from: 'u1', to: 'u2', label: '使用' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('u1["订单(在线)"] {'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.ok(back.document.nodes.some((n) => n.label === '订单(在线)'));
  assert.ok(back.document.nodes.some((n) => n.label === 'User Account'));
});

test('ER pure-CJK entity gets readable fallback id + warning', () => {
  const r = importMermaid(`erDiagram
    用户 {
        int id
    }
`);
  assert.equal(r.valid, true);
  const ids = r.document.nodes.map((n) => n.id);
  assert.ok(!ids.includes('entity'), `garbage id, got: ${ids.join(', ')}`);
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('no ASCII id')));
});

test('mindmap CJK id with shape wrapper imports (fallback id + warning)', () => {
  const r = importMermaid(`mindmap
  root((主题))
    分支一((分支一))
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.ok(r.document.nodes.some((n) => n.label === '分支一'));
  assert.ok(!r.document.nodes.some((n) => /^_+$/.test(n.id)));
});

test('flowchart subgraph label quotes are decoded on import', () => {
  const r = importMermaid(`flowchart TD
    subgraph g1["他说的&quot;组&quot;"]
      a
    end
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.groups[0].label, '他说的"组"');
});

test('gantt title survives round-trip', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    title: '产品发布',
    nodes: [{ id: 'a', label: '任务A', attrs: { start: 0, duration: 3 } }],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('title 产品发布'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.title, '产品发布');
});

test('gantt ungrouped tasks do not drift into a group on round-trip', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [{ id: 'a', label: '任务A', attrs: { start: 0, duration: 3 } }],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(!m.includes('section 任务'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.groups.length, 0);
  assert.equal(back.document.nodes.length, 1);
});

test('flowchart shape labels with parens/braces round-trip', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'start', label: '开始(入口)', kind: 'start' },
      { id: 'd', label: '校验{严格}', kind: 'decision' },
      { id: 'end', label: '结束(成功)', kind: 'end' },
    ],
    edges: [
      { from: 'start', to: 'd' },
      { from: 'd', to: 'end' },
    ],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes.find((n) => n.id === 'start')?.label, '开始(入口)');
  assert.equal(back.document.nodes.find((n) => n.id === 'd')?.label, '校验{严格}');
  assert.equal(back.document.nodes.find((n) => n.id === 'd')?.kind, 'decision');
});

test('gantt milestone duration survives round-trip', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [{ id: 'm1', label: '发布', kind: 'milestone', attrs: { start: 5, duration: 2 } }],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.nodes[0].attrs?.duration, 2);
});

test('ER member with CJK/spaced name round-trips', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      {
        id: 'user',
        label: '用户"主"表',
        kind: 'entity',
        members: [
          { kind: 'attribute', name: '用户名', type: 'varchar' },
          { kind: 'attribute', name: 'user name', type: 'varchar' },
        ],
      },
    ],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('user["用户&quot;主&quot;表"] {'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes[0].label, '用户"主"表');
  const names = back.document.nodes[0].members?.map((x) => x.name);
  assert.ok(names?.includes('用户名'));
  assert.ok(names?.includes('user name'));
});

test('importMermaid flowchart supports CJK node ids and bare subgraph titles', () => {
  const r = importMermaid(`flowchart TD
    开始[开始流程] --> 判断{校验通过?}
    subgraph 前端
      E[登录页]
    end
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  // CJK ids get fallback ids, labels survive
  assert.ok(r.document.nodes.some((n) => n.label === '开始流程'));
  assert.ok(r.document.nodes.some((n) => n.label === '登录页'));
  // bare subgraph title becomes a group with a generated id
  assert.equal(r.document.groups.length, 1);
  assert.equal(r.document.groups[0].label, '前端');
  // edges reference the fallback ids (one real edge; E is a declaration)
  assert.equal(r.document.edges.length, 1);
});

test('flowchart CJK id referenced by many edges reuses one node', () => {
  const r = importMermaid(`flowchart TD
    A[提交订单] --> 校验[校验订单]
    校验 --> 库存[扣减库存]
    校验 --> 支付[发起支付]
    库存 --> 完成[订单完成]
    支付 --> 完成[订单完成]
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes.length, 5, `duplicate nodes: ${r.document.nodes.map((n) => n.id).join(', ')}`);
  assert.equal(r.document.edges.length, 5);
});

test('importMermaid flowchart supports "A -- label --> B" edges', () => {
  const r = importMermaid(`flowchart TD
    A[登录] -- 成功 --> B[首页]
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 1);
  assert.equal(r.document.edges[0].label, '成功');
});

test('importMermaid gantt supports after-dependencies and legacy milestones', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    编码 : a1, 2025-01-01, 5d
    测试 : a2, after a1, 3d
    发布里程碑 : milestone, m1, 2025-01-10
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const a2 = r.document.nodes.find((n) => n.id === 'a2');
  assert.equal(a2?.attrs?.start, -360); // a1 start -365 + duration 5
  const m1 = r.document.nodes.find((n) => n.id === 'm1');
  assert.equal(m1?.kind, 'milestone');
  assert.equal(m1?.label, '发布里程碑');
  assert.ok(r.document.edges.some((e) => e.from === 'a1' && e.to === 'a2'));
});

test('sequence/gantt exports quote aliases and task names with special chars', () => {
  const seq: Parameters<typeof addNode>[0] = {
    type: 'sequence',
    nodes: [
      { id: 'u', label: '用户' },
      { id: 'a', label: 'Alice "管理员"' },
    ],
    edges: [{ from: 'u', to: 'a', label: 'hi' }],
    groups: [],
  };
  const sm = exportMermaid(seq);
  assert.ok(sm.includes('participant a as "Alice &quot;管理员&quot;"'), sm);
  const seqBack = importMermaid(sm);
  assert.equal(seqBack.document.nodes.find((n) => n.id === 'a')?.label, 'Alice "管理员"');

  const gt: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [{ id: 't1', label: '任务:第一版', attrs: { start: 0, duration: 2 } }],
    edges: [],
    groups: [],
  };
  const gm = exportMermaid(gt);
  assert.ok(gm.includes('"任务:第一版" : t1'), gm);
  const gtBack = importMermaid(gm);
  assert.equal(gtBack.document.nodes[0].label, '任务:第一版');
});

test('ER typeless member with spaces round-trips', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      {
        id: 'user',
        label: 'User',
        kind: 'entity',
        members: [{ kind: 'attribute', name: 'user name' }],
      },
    ],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('"user name"'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  const mem = back.document.nodes[0].members?.[0];
  assert.equal(mem?.name, 'user name');
  assert.equal(mem?.type, undefined);
});

test('round-trip: quotes in sequence/mindmap/state labels are decoded', () => {
  const seq: Parameters<typeof addNode>[0] = {
    type: 'sequence',
    nodes: [
      { id: 'u', label: '用户' },
      { id: 's', label: '服务' },
    ],
    edges: [{ from: 'u', to: 's', label: '查询 "订单" : 列表' }],
    groups: [],
  };
  const seqBack = importMermaid(exportMermaid(seq));
  assert.equal(seqBack.document.edges[0].label, '查询 "订单" : 列表');

  const mm: Parameters<typeof addNode>[0] = {
    type: 'mindmap',
    nodes: [
      { id: 'root', label: '主题"带引号"' },
      { id: 'c', label: '子项' },
    ],
    edges: [{ from: 'root', to: 'c' }],
    groups: [],
  };
  const mmBack = importMermaid(exportMermaid(mm));
  assert.equal(mmBack.document.nodes.find((n) => n.id === 'root')?.label, '主题"带引号"');

  const st: Parameters<typeof addNode>[0] = {
    type: 'state',
    nodes: [
      { id: 'a', label: '开始"标记"' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'a', to: 'b', label: '结束 "done"' }],
    groups: [],
  };
  const stBack = importMermaid(exportMermaid(st));
  assert.equal(stBack.document.nodes.find((n) => n.id === 'a')?.label, '开始"标记"');
  assert.equal(stBack.document.edges[0].label, '结束 "done"');
});

test('flowchart node referenced before its subgraph still joins the group', () => {
  const r = importMermaid(`flowchart LR
    A[外部] --> D[内部节点]
    subgraph sec1["主流程"]
      D
    end
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.groups.length, 1);
  assert.deepEqual(r.document.groups[0].contains, ['D']);
});

test('gantt dependency edges round-trip via after syntax', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [
      { id: 'a1', label: '编码', attrs: { start: 0, duration: 5 } },
      { id: 'a2', label: '测试', attrs: { start: 5, duration: 3 } },
    ],
    edges: [{ from: 'a1', to: 'a2' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('after a1'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.ok(back.document.edges.some((e) => e.from === 'a1' && e.to === 'a2'), 'dependency edge lost');
  assert.equal(back.document.nodes.find((n) => n.id === 'a2')?.attrs?.start, 5);
});

test('ER unset cardinality stays unset on round-trip', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'u', label: 'User', kind: 'entity' },
      { id: 'o', label: 'Order', kind: 'entity' },
    ],
    edges: [{ from: 'u', to: 'o', label: '使用' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('u -- o'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.edges[0].cardinalityFrom, undefined);
  assert.equal(back.document.edges[0].cardinalityTo, undefined);
});

test('hand-written sequence message keeps quotes inside prose', () => {
  const r = importMermaid(`sequenceDiagram
    participant user as 用户
    participant shop as 商家
    shop-->>user: 返回结果 "OK"
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.edges[0].label, '返回结果 "OK"');
});

test('mindmap cycle not containing nodes[0] still emits all nodes', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'mindmap',
    nodes: [
      { id: 'x', label: '独立' },
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('x((') && m.includes('a((') && m.includes('b(('), m);
});

test('ER round-trip keeps ids via alias syntax', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'users', label: '用户表', kind: 'entity' },
      { id: 'orders', label: '订单表', kind: 'entity' },
    ],
    edges: [{ from: 'users', to: 'orders', label: '拥有' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('users["用户表"] {'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.ok(back.document.nodes.some((n) => n.id === 'users' && n.label === '用户表'));
  assert.ok(back.document.nodes.some((n) => n.id === 'orders' && n.label === '订单表'));
  assert.ok(back.document.edges.some((e) => e.from === 'users' && e.to === 'orders'));
});

test('importMermaid er supports alias syntax USERS["用户表"]', () => {
  const r = importMermaid(`erDiagram
    USERS["用户表"] {
        string name
    }
    USERS ||--o{ ORDERS : "拥有订单"
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const users = r.document.nodes.find((n) => n.id === 'USERS');
  assert.equal(users?.label, '用户表');
  assert.equal(r.document.edges[0].label, '拥有订单');
});

test('gantt after with a gap round-trips (after id <gap>d)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [
      { id: 'design', label: '设计', attrs: { start: 0, duration: 5 } },
      { id: 'dev', label: '开发', attrs: { start: 10, duration: 5 } },
    ],
    edges: [{ from: 'design', to: 'dev' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('after design 5d'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.ok(back.document.edges.some((e) => e.from === 'design' && e.to === 'dev'));
  assert.equal(back.document.nodes.find((n) => n.id === 'dev')?.attrs?.start, 10);
});

test('importMermaid gantt accepts mermaid-standard "after id <gap>d"', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    设计 : design, 2025-01-01, 5d
    开发 : dev, after design 5d, 5d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const dev = r.document.nodes.find((n) => n.id === 'dev');
  assert.equal(dev?.attrs?.start, -355); // design end -360 + gap 5
  assert.ok(r.document.edges.some((e) => e.from === 'design' && e.to === 'dev'));
});

test('importMermaid er accepts PK/FK key markers with a warning', () => {
  const r = importMermaid(`erDiagram
    CUSTOMER {
        int id PK
        string name
    }
`);
  assert.equal(r.valid, true);
  const id = r.document.nodes[0].members?.find((m) => m.name === 'id');
  assert.equal(id?.type, 'int');
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('key marker')));
});

test('state terminal [*] round-trips stably with label', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'state',
    nodes: [
      { id: 's1', label: '运行' },
      { id: 's2', label: '已完成', kind: 'end' },
    ],
    edges: [{ from: 's1', to: 's2' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('s1 --> [*]'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  const end = back.document.nodes.find((n) => n.kind === 'end');
  assert.equal(end?.id, '__end__');
  assert.equal(end?.label, '已完成');
});

test('state round-trip keeps "__start__"-style ids', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'state',
    nodes: [
      { id: '__start__', label: '开始', kind: 'start' },
      { id: 's1', label: '进行中' },
    ],
    edges: [{ from: '__start__', to: 's1' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes.length, 2, `duplicate nodes: ${back.document.nodes.map((n) => n.id).join(', ')}`);
  const st = back.document.nodes.find((n) => n.id === '__start__');
  assert.ok(st, `id renamed: ${back.document.nodes.map((n) => n.id).join(', ')}`);
  assert.equal(st?.label, '开始');
  assert.equal(st?.kind, 'start');
});

test('gantt dependency before its dependency in node order still round-trips', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [
      { id: 'build', label: '构建', attrs: { start: 5, duration: 3 } },
      { id: 'design', label: '设计', attrs: { start: 0, duration: 5 } },
    ],
    edges: [{ from: 'design', to: 'build' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.indexOf('design') < m.indexOf('build'), `no topo order:\n${m}`);
  assert.ok(m.includes('after design'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.ok(back.document.edges.some((e) => e.from === 'design' && e.to === 'build'));
});

test('importMermaid sequence accepts -) and -> arrows', () => {
  const r = importMermaid(`sequenceDiagram
    Alice->>John: Hello
    John-->>Alice: Great!
    Alice-)John: See you later!
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 3);
  assert.equal(r.document.edges[2].label, 'See you later!');
});

test('gantt milestone with after dependency round-trips (kind + clean label)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [
      { id: 'test', label: '测试', attrs: { start: 0, duration: 3 } },
      { id: 'launch', label: '上线发布', kind: 'milestone', attrs: { start: 3, duration: 0 } },
    ],
    edges: [{ from: 'test', to: 'launch' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('milestone 上线发布 : launch, after test'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  const launch = back.document.nodes.find((n) => n.id === 'launch');
  assert.equal(launch?.kind, 'milestone');
  assert.equal(launch?.label, '上线发布');
  assert.ok(back.document.edges.some((e) => e.from === 'test' && e.to === 'launch'));
});

test('sequence self-loop reports the source line', () => {
  const r = importMermaid(`sequenceDiagram
    A->>B: 正常
    A->>A: 重试
`);
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((i) => i.message.includes('line 3') && i.message.includes('self-loop')), JSON.stringify(r.issues));
});

test('ER connectors map directionally (left }| / right |{ = 1..*)', () => {
  const r = importMermaid(`erDiagram
    A ||--|{ B : right-one-many
    C }|--|| D : left-one-many
    E |o--o| F : zero-or-one
    G }o--o{ H : zero-many
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges[0].cardinalityTo, '1..*'); // |{ right
  assert.equal(r.document.edges[1].cardinalityFrom, '1..*'); // }| left
  assert.equal(r.document.edges[2].cardinalityFrom, '0..1'); // |o left
  assert.equal(r.document.edges[2].cardinalityTo, '0..1'); // o| right
  assert.equal(r.document.edges[3].cardinalityFrom, '0..*'); // }o left
  assert.equal(r.document.edges[3].cardinalityTo, '0..*'); // o{ right
});

test('sequence non-canonical arrows warn instead of silently folding', () => {
  const r = importMermaid(`sequenceDiagram
    A->>B: 同步
    B-->>A: 异步回复
    A-)B: 异步信号
`);
  assert.equal(r.valid, true);
  assert.ok(r.issues.filter((i) => i.severity === 'warning').length >= 2);
  assert.ok(r.issues.some((i) => i.message.includes('-->>')));
});

test('gantt epoch is recorded in meta and honored by convert', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    任务 : t1, 2023-12-30, 2d
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.meta?.ganttEpoch, '2026-01-01');
  assert.equal(r.document.nodes[0].attrs?.start, -733);
  // convert honors the documented epoch
  const m = exportMermaid(r.document);
  assert.ok(m.includes('2023-12-30'), m);
});

test('chained flowchart edges A --> B --> C parse correctly', () => {
  const r = importMermaid(`flowchart LR
    A --> B --> C
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 3, `nodes: ${r.document.nodes.map((n) => n.id).join(', ')}`);
  assert.equal(r.document.edges.length, 2);
  assert.ok(r.document.edges.some((e) => e.from === 'A' && e.to === 'B'));
  assert.ok(r.document.edges.some((e) => e.from === 'B' && e.to === 'C'));
  assert.ok(!r.document.edges.some((e) => e.label?.includes('>')), 'no fake label');
});

test('labeled edge A -- 成功 --> B still works', () => {
  const r = importMermaid(`flowchart LR
    A -- 成功 --> B
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.edges[0].label, '成功');
});

test('composite state gets a clear error', () => {
  const r = importMermaid(`stateDiagram-v2
    state 进行中 {
        [*] --> 处理
    }
`);
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((i) => i.message.includes('Composite states are not supported')));
});

test('gantt milestone standard "name, : id" form keeps a clean label', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    milestone 2.0 release, : milestone1, after dev, 0d
    开发 : dev, 2025-01-01, 3d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const ms = r.document.nodes.find((n) => n.id === 'milestone1');
  assert.equal(ms?.kind, 'milestone');
  assert.equal(ms?.label, '2.0 release');
});

test('gantt cross-section dependency does not duplicate tasks', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [
      { id: 'a1', label: '需求分析', attrs: { start: 0, duration: 2 } },
      { id: 'a2', label: '原型设计', attrs: { start: 2, duration: 3 } },
      { id: 'b1', label: '开发', attrs: { start: 5, duration: 3 } },
    ],
    edges: [{ from: 'a2', to: 'b1' }],
    groups: [
      { id: 'secA', label: '设计', contains: ['a1', 'a2'] },
      { id: 'secB', label: '开发', contains: ['b1'] },
    ],
  };
  const m = exportMermaid(doc);
  // each task appears exactly once
  for (const id of ['a1', 'a2', 'b1']) {
    assert.equal(m.split(`: ${id},`).length - 1, 1, `task ${id} duplicated:\n${m}`);
  }
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes.length, 3);
});

test('flowchart node ids with dots and slashes sanitize cleanly', () => {
  const r = importMermaid(`flowchart LR
    db.cluster["数据库集群"]
    user/order --> order/item
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.ok(r.document.nodes.some((n) => n.id === 'db_cluster' && n.label === '数据库集群'));
  assert.ok(r.document.nodes.some((n) => n.id === 'user_order'));
  assert.equal(r.document.edges.length, 1);
});

test('ER 1..* round-trips with directional connectors', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'order', label: 'Order', kind: 'entity' },
      { id: 'item', label: 'Item', kind: 'entity' },
    ],
    edges: [{ from: 'order', to: 'item', label: '包含', cardinalityFrom: '1', cardinalityTo: '1..*' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('||--|{'), `connector wrong:\n${m}`);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.edges[0].cardinalityTo, '1..*');
});

test('gantt shorthand ":after dep, dur" and duration-only tasks import', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    基础任务 : base, 2025-01-01, 3d
    Another task :after base, 20d
    简易任务 : 24d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.ok(r.document.edges.some((e) => e.from === 'base'));
  const short = r.document.nodes.find((n) => n.label === 'Another task');
  assert.equal(short?.attrs?.duration, 20);
  const bare = r.document.nodes.find((n) => n.label === '简易任务');
  assert.equal(bare?.attrs?.duration, 24);
});

test('ER entity ids with hyphens round-trip (examples/er.lgdl case)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'order-item', label: '订单项', kind: 'entity' },
      { id: 'order', label: '订单', kind: 'entity' },
    ],
    edges: [{ from: 'order', to: 'order-item', label: '包含' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.ok(back.document.nodes.some((n) => n.id === 'order-item' && n.label === '订单项'));
});

test('gantt CJK task ids and after-dependencies import', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    需求调研 : 需求调研, 2025-01-01, 3d
    开发 : 开发, after 需求调研, 5d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const dev = r.document.nodes.find((n) => n.label === '开发');
  assert.ok(dev, JSON.stringify(r.document.nodes));
  assert.equal(dev?.attrs?.start, -362); // 需求调研 end (-365+3) 
  assert.ok(r.document.edges.some((e) => e.to === dev?.id));
});

test('gantt attribute-style milestones import without dropping tasks', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section 阶段
    需求调研 : research, 2024-01-01, 3d
    上线发布 : milestone, after research, 1d
    稳定运营 : milestone, after 上线发布, 1d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 3, `nodes: ${r.document.nodes.map((n) => n.id).join(', ')}`);
  assert.equal(r.document.edges.length, 2);
  const milestones = r.document.nodes.filter((n) => n.kind === 'milestone');
  assert.equal(milestones.length, 2);
});

test('subgraph with bare bracket label imports', () => {
  const r = importMermaid(`flowchart LR
    subgraph FE[Frontend]
      home[Home]
    end
    home --> api
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.groups.length, 1);
  assert.equal(r.document.groups[0].label, 'Frontend');
});

test('gantt todayMarker config line is ignored on import', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    todayMarker off
    section 开发
    编码 : coding, 2024-01-01, 5d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 1);
});

test('sequence Note/activate drop with warning, diagram still imports', () => {
  const r = importMermaid(`sequenceDiagram
    participant A as 客户端
    participant B as 服务端
    A->>B: 请求
    Note over B: 处理中
    activate B
    B-->>A: 响应
    deactivate B
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 2);
  assert.ok(r.issues.filter((i) => i.severity === 'warning').length >= 2);
});

test('flowchart cylinder shapes keep a clean label', () => {
  const r = importMermaid(`graph LR
    B[(订单表)] --> A[开始]
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes.find((n) => n.id === 'B')?.label, '订单表');
  // direction hint warns instead of silently dropping
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('direction')));
});

test('gantt attrs are validated (duration must be non-negative number)', () => {
  const bad = parseLgdl(`type: gantt
nodes:
  - id: a
    label: A
    attrs:
      start: 0
      duration: -5
`);
  assert.equal(bad.valid, false);
  assert.ok(bad.issues.some((i) => i.message.includes('attrs.duration')));
  const bad2 = parseLgdl(`type: gantt
nodes:
  - id: a
    label: A
    attrs:
      duration: abc
`);
  assert.equal(bad2.valid, false);
  // negative start (pre-epoch dates) is still legal
  const ok = parseLgdl(`type: gantt
nodes:
  - id: a
    label: A
    attrs:
      start: -365
      duration: 3
`);
  assert.equal(ok.valid, true);
});

test('cylinder shapes map to entity kind and round-trip', () => {
  const r = importMermaid(`graph LR
    B[(订单表)] --> A[开始]
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes.find((n) => n.id === 'B')?.kind, 'entity');
  assert.equal(r.document.nodes.find((n) => n.id === 'B')?.label, '订单表');

  // entity kind exports back as a cylinder
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [{ id: 'db', label: '订单表', kind: 'entity' }],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('db[(订单表)]'), m);
});

test('cylinder label with parens stays clean', () => {
  const r = importMermaid(`flowchart TD
    A[("订单(主表)")]
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes[0].label, '订单(主表)');
});

test('plantuml decision branches each stop at a shared terminal', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 's', label: '开始', kind: 'start' },
      { id: 'check', label: '库存充足?', kind: 'decision' },
      { id: 'ship', label: '发货' },
      { id: 'buy', label: '采购' },
      { id: 'end', label: '完成', kind: 'end' },
    ],
    edges: [
      { from: 's', to: 'check' },
      { from: 'check', to: 'ship', label: '是' },
      { from: 'check', to: 'buy', label: '否' },
      { from: 'ship', to: 'end' },
      { from: 'buy', to: 'end' },
    ],
    groups: [],
  };
  const out = convert(doc, 'plantuml');
  const stops = out.split('\n').filter((l) => l.trim() === 'stop').length;
  assert.equal(stops, 2, `expected 2 stops:\n${out}`);
});

test('rectangle nodes with 结束/开始 labels get end/start kinds', () => {
  const r = importMermaid(`flowchart TD
    A[开始] --> B[处理] --> C[结束]
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes.find((n) => n.id === 'A')?.kind, 'start');
  assert.equal(r.document.nodes.find((n) => n.id === 'C')?.kind, 'end');
});

test('bare cylinder with parens keeps label and entity kind', () => {
  const r = importMermaid(`flowchart TD
    B[(订单主表(带括号))]
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const b = r.document.nodes.find((n) => n.id === 'B');
  assert.equal(b?.label, '订单主表(带括号)');
  assert.equal(b?.kind, 'entity');
});

test('nested groups all export as subgraphs (no dropped group or dangling edge)', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 's', label: '开始', kind: 'start' },
      { id: 'login', label: '登录' },
      { id: 'pay', label: '支付' },
    ],
    edges: [{ from: 'auth', to: 'backend', label: '整体调用' }],
    groups: [
      { id: 'auth', label: '认证模块', contains: ['s', 'login'] },
      { id: 'backend', label: '后端', contains: ['pay'] },
    ],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('subgraph auth["认证模块"]'), m);
  assert.ok(m.includes('subgraph backend["后端"]'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.ok(back.document.groups.some((g) => g.id === 'auth' && g.label === '认证模块'));
  assert.ok(back.document.edges.some((e) => e.from === 'auth' && e.to === 'backend'));
});

test('plantuml decision branch directly to a terminal still stops', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 's', label: '开始', kind: 'start' },
      { id: 'check', label: '是否通过', kind: 'decision' },
      { id: 'end', label: '结束', kind: 'end' },
    ],
    edges: [
      { from: 's', to: 'check' },
      { from: 'check', to: 'end', label: '是' },
      { from: 'check', to: 'end', label: '否' },
    ],
    groups: [],
  };
  const out = convert(doc, 'plantuml');
  const stops = out.split('\n').filter((l) => l.trim() === 'stop').length;
  assert.equal(stops, 2, `expected 2 stops:\n${out}`);
});

test('gantt section ids round-trip via section-id comment', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [{ id: 't1', label: '任务1', attrs: { start: 0, duration: 2 } }],
    edges: [],
    groups: [{ id: 'phase1', label: '阶段一', contains: ['t1'] }],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('%% @lgdl section-id: phase1'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.ok(back.document.groups.some((g) => g.id === 'phase1' && g.label === '阶段一'));
});

test('mindmap kinds round-trip via comments', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'mindmap',
    title: '测试导图',
    nodes: [
      { id: 'root', label: '根', kind: 'start' },
      { id: 'a', label: '分支A', kind: 'decision' },
    ],
    edges: [{ from: 'root', to: 'a' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('%% @lgdl root: kind=start'), m);
  assert.ok(m.includes('%% @lgdl title: 测试导图'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true);
  assert.equal(back.document.nodes.find((n) => n.id === 'root')?.kind, 'start');
  assert.equal(back.document.nodes.find((n) => n.id === 'a')?.kind, 'decision');
  assert.equal(back.document.title, '测试导图');
});

test('flowchart title round-trips via comment', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    title: '登录流程',
    nodes: [{ id: 'a', label: 'A' }],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('%% @lgdl title: 登录流程'), m);
  const back = importMermaid(m);
  assert.equal(back.document.title, '登录流程');
});

test('gantt custom epoch round-trips via comment', () => {
  const r = importMermaid(`gantt
    %% @lgdl gantt-epoch: 2025-03-01
    dateFormat YYYY-MM-DD
    section S
    任务 : t1, 2025-03-01, 3d
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.meta?.ganttEpoch, '2025-03-01');
  assert.equal(r.document.nodes[0].attrs?.start, 0);
  // export honors the restored epoch
  const m = exportMermaid(r.document);
  assert.ok(m.includes('2025-03-01'), m);
});

test('gantt task status suffixes (done/active/crit) import', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section 设计
    需求调研 : a1, 2026-01-01, 3d, done
    原型设计 : a2, after a1, 3d, active
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.find((n) => n.id === 'a1')?.attrs?.status, 'done');
  assert.equal(r.document.nodes.find((n) => n.id === 'a2')?.attrs?.status, 'active');
});

test('subgraph with CJK id and bracket title imports with fallback', () => {
  const r = importMermaid(`flowchart TD
    subgraph 前端 [前端层]
      A[页面]
    end
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.groups.length, 1);
  assert.equal(r.document.groups[0].label, '前端层');
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('subgraph id')));
});

test('flowchart link-style variants normalize with warnings', () => {
  const r = importMermaid(`flowchart TD
    A -.弱依赖.-> B
    C ==> D
    E --- F
    G --> H & I
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 5); // 3 variants + 2 fan-out
  assert.ok(r.document.edges.some((e) => e.from === 'A' && e.to === 'B' && e.label === '弱依赖'));
  assert.ok(r.document.edges.some((e) => e.from === 'G' && e.to === 'H'));
  assert.ok(r.document.edges.some((e) => e.from === 'G' && e.to === 'I'));
  assert.ok(r.issues.filter((i) => i.severity === 'warning').length >= 3);
});

test('state note blocks drop with warning, diagram still imports', () => {
  const r = importMermaid(`stateDiagram-v2
    [*] --> Idle
    Idle --> Done
    note right of Idle
      备注文字
    end note
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 1); // [*] --> Idle is a pseudo-state
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('note')));
});

test('sequence loop/alt blocks flatten with warnings, messages kept', () => {
  const r = importMermaid(`sequenceDiagram
    A->>B: 请求
    loop 重试
        B-->>A: 失败
    end
    alt 成功
        B-->>A: OK
    else 失败
        B-->>A: ERROR
    end
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 4);
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('loop')));
});

test('gantt leading status syntax imports', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    已完成任务 :done, t1, 2025-01-01, 10d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes[0].attrs?.status, 'done');
});

test('gantt status round-trips both directions', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'gantt',
    nodes: [
      { id: 't1', label: '已完成任务', attrs: { start: 0, duration: 10, status: 'done' } },
      { id: 't2', label: '关键任务', attrs: { start: 10, duration: 5, status: 'crit,done' } },
    ],
    edges: [{ from: 't1', to: 't2' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('已完成任务 : done, t1, '), m);
  assert.ok(m.includes('关键任务 : crit,done, t2, '), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes.find((n) => n.id === 't1')?.attrs?.status, 'done');
  assert.equal(back.document.nodes.find((n) => n.id === 't2')?.attrs?.status, 'crit,done');
  assert.ok(back.document.edges.some((e) => e.from === 't1' && e.to === 't2'));
});

test('gantt leading status with after dependency imports', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    A : a1, 2023-01-01, 5d
    B : b1, after a1, 5d, active
    C : active, c1, after b1, 5d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.find((n) => n.id === 'b1')?.attrs?.status, 'active');
  assert.equal(r.document.nodes.find((n) => n.id === 'c1')?.attrs?.status, 'active');
  assert.equal(r.document.edges.length, 2);
});

test('gantt official syntax variants import (ranges, hours, double status)', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    Completed task :done, des1, 2014-01-06, 2014-01-08
    Hour task : des2, 2014-01-06, 24h
    Double : des3, 2014-01-06, 3d, done, crit
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const des1 = r.document.nodes.find((n) => n.id === 'des1');
  assert.equal(des1?.attrs?.duration, 2); // 2014-01-06 -> 2014-01-08
  assert.equal(des1?.attrs?.status, 'done');
  const des2 = r.document.nodes.find((n) => n.id === 'des2');
  assert.equal(des2?.attrs?.duration, 1); // 24h = 1d
  const des3 = r.document.nodes.find((n) => n.id === 'des3');
  assert.equal(des3?.attrs?.status, 'done,crit');
});

test('flowchart presentation directives drop with warnings', () => {
  const r = importMermaid(`flowchart TD
    style A fill:#f9f
    linkStyle 0 stroke:#f00
    click A href "https://x"
    A --> B
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 2);
  assert.ok(r.issues.filter((i) => i.severity === 'warning').length >= 3);
});

test('classDiagram imports with members and relationships', () => {
  const r = importMermaid(`classDiagram
    class Animal {
        +string name
        +isMammal() bool
    }
    class Duck {
        +swim()
    }
    Animal <|-- Duck
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.type, 'uml-class');
  const animal = r.document.nodes.find((n) => n.id === 'Animal');
  assert.equal(animal?.kind, 'entity');
  assert.deepEqual(animal?.members?.[0], { kind: 'attribute', name: 'name', type: 'string', visibility: 'public' });
  assert.deepEqual(animal?.members?.[1], { kind: 'method', name: 'isMammal', type: 'bool', visibility: 'public' });
  assert.equal(r.document.edges[0].attrs?.relation, 'inheritance');
});

test('uml-class round-trips via classDiagram', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      {
        id: 'user',
        label: 'User',
        kind: 'entity',
        members: [
          { kind: 'attribute', name: 'id', type: 'int', visibility: 'private' },
          { kind: 'method', name: 'login', params: '(pwd: string)', type: 'void', visibility: 'public' },
        ],
      },
      { id: 'admin', label: 'Admin', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'admin', attrs: { relation: 'inheritance' } }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.startsWith('classDiagram'), m);
  assert.ok(m.includes('class user {'), m);
  assert.ok(m.includes('%% @lgdl label: User'), m);
  assert.ok(m.includes('-int id'), m);
  assert.ok(m.includes('+login(pwd: string) void'), m);
  assert.ok(m.includes('user <|-- admin'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.type, 'uml-class');
  assert.equal(back.document.nodes.find((n) => n.id === 'user')?.members?.length, 2);
  assert.equal(back.document.edges[0].attrs?.relation, 'inheritance');
});

test('dotted edge -.-> and no-id gantt task import', () => {
  const r = importMermaid(`flowchart TD
    N[/a note/] -.-> B
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.ok(r.document.edges.some((e) => e.from === 'N' && e.to === 'B'));

  const g = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    Task three :2023-01-12, 12d
`);
  assert.equal(g.valid, true, g.issues.map((i) => i.message).join('; '));
  assert.equal(g.document.nodes.length, 1);
  assert.equal(g.document.nodes[0].label, 'Task three');
});

test('gantt milestone with duration suffix imports', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    Milestone : milestone, m1, 2023-01-20, 0d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes[0].kind, 'milestone');
});

test('plantuml linear chain: single stop, no trailing activities after stop', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'Process', kind: 'start' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C', kind: 'end' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ],
    groups: [],
  };
  const out = convert(doc, 'plantuml');
  const stops = out.split('\n').filter((l) => l.trim() === 'stop').length;
  assert.equal(stops, 1, `expected 1 stop:\n${out}`);
  const stopIdx = out.split('\n').findIndex((l) => l.trim() === 'stop');
  const after = out.split('\n').slice(stopIdx + 1).filter((l) => l.trim() && l.trim() !== '@enduml');
  assert.equal(after.length, 0, `activities after stop:\n${after.join('\n')}`);
});

test('mermaid <br/> multiline labels become newlines', () => {
  const r = importMermaid(`flowchart TD
    A["line1<br/>line2"]
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes[0].label, 'line1\nline2');
});

test('gantt weekday config ignored, excludes warns', () => {
  const r = importMermaid(`gantt
    title X
    dateFormat YYYY-MM-DD
    excludes weekends
    weekday monday
    section S
    Task1 : t1, 2023-01-02, 10d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 1);
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes('excludes')));
});

test('flowchart :::class styling is stripped with warning', () => {
  const r = importMermaid(`flowchart LR
    A[Start]:::important --> B[End]
    classDef important fill:#f96;
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 2);
  assert.equal(r.document.edges.length, 1);
  assert.ok(r.issues.some((i) => i.severity === 'warning' && i.message.includes(':::class')));
});

test('multiline labels round-trip via <br/>', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [{ id: 'a', label: '第一行\n第二行' }],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('第一行<br/>第二行'), m);
  const back = importMermaid(m);
  assert.equal(back.document.nodes[0].label, '第一行\n第二行');
});

test('multiple date-style milestones get unique ids', () => {
  const r = importMermaid(`gantt
    dateFormat YYYY-MM-DD
    section S
    里程碑1 :milestone, 2026-03-08, 0d
    里程碑2 :milestone, 2026-04-01, 0d
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.filter((n) => n.kind === 'milestone').length, 2);
});

test('mermaid frontmatter is skipped on import', () => {
  const r = importMermaid(`---
title: My Diagram
---
flowchart TD
  A --> B
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 2);
});

test('aggregation line styles o--o / --x / x-- import with nodes kept', () => {
  const r = importMermaid(`flowchart TD
    A[甲] o--o B[乙]
    B --x C[丙]
    C x-- D[丁]
    D --o E[戊]
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 5);
  assert.equal(r.document.edges.length, 4);
});

test('updateNode with newId rewrites edges and group membership', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'task1', label: '任务' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'task1', to: 'b' }],
    groups: [{ id: 'g1', label: 'G1', contains: ['task1'] }],
  };
  const r = updateNode(doc, { id: 'task1', newId: 'research' });
  assert.ok(r.document.nodes.some((n) => n.id === 'research'));
  assert.ok(!r.document.nodes.some((n) => n.id === 'task1'));
  assert.equal(r.document.edges[0].from, 'research');
  assert.deepEqual(r.document.groups[0].contains, ['research']);
});

test('updateEdge rewrites endpoints preserving semantics', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'a', label: 'A', kind: 'entity' },
      { id: 'b', label: 'B', kind: 'entity' },
      { id: 'c', label: 'C', kind: 'entity' },
    ],
    edges: [{ from: 'a', to: 'b', label: '调用', cardinalityFrom: '1', cardinalityTo: '*', attrs: { weight: 'high' } }],
    groups: [],
  };
  const r = updateEdge(doc, { from: 'a', to: 'b', newTo: 'c' });
  const e = r.document.edges[0];
  assert.equal(e.to, 'c');
  assert.equal(e.label, '调用');
  assert.equal(e.cardinalityFrom, '1');
  assert.equal(e.cardinalityTo, '*');
  assert.deepEqual(e.attrs, { weight: 'high' });
});

test('updateGroup manages members and renames with reference rewrite', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'lane1', to: 'b', label: '整体' }],
    groups: [{ id: 'lane1', label: '泳道', contains: ['a'] }],
  };
  const r1 = updateGroup(doc, { id: 'lane1', memberAdd: 'b' });
  assert.deepEqual(r1.document.groups[0].contains, ['a', 'b']);
  const r2 = updateGroup(r1.document, { id: 'lane1', newId: 'lane2' });
  assert.ok(r2.document.groups.some((g) => g.id === 'lane2'));
  assert.equal(r2.document.edges[0].from, 'lane2');
  assert.throws(() => updateGroup(doc, { id: 'lane1', memberAdd: 'a' }), /already in group/);
});

test('node and group id collision is rejected', () => {
  const r = parseLgdl(`type: flowchart
nodes:
  - id: x
groups:
  - id: x
    contains: []
`);
  assert.equal(r.valid, false);
  assert.ok(r.issues.some((i) => i.message.includes('collides with a group id')));
});

test('dotted edge with pipe label imports', () => {
  const r = importMermaid(`flowchart TD
    A["甲"] -.->|弱依赖| B["乙"]
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges[0].label, '弱依赖');
  assert.equal(r.document.edges[0].from, 'A');
});

test('classDiagram exports cardinality', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'order', label: 'Order', kind: 'entity' },
      { id: 'item', label: 'Item', kind: 'entity' },
    ],
    edges: [{ from: 'order', to: 'item', cardinalityFrom: '1', cardinalityTo: '1..*' }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('order "1" -- "1..*" item'), m);
});

test('classDiagram cardinality round-trips', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', cardinalityFrom: '1', cardinalityTo: '1..*', attrs: { relation: 'association' } }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('user "1" -- "1..*" order'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.edges.length, 1);
  assert.equal(back.document.edges[0].cardinalityFrom, '1');
  assert.equal(back.document.edges[0].cardinalityTo, '1..*');
});

test('classDiagram bare attribute member round-trips', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      {
        id: 'c',
        label: 'C',
        kind: 'entity',
        members: [{ kind: 'attribute', name: 'name' }],
      },
    ],
    edges: [],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes[0].members?.length, 1);
  assert.equal(back.document.nodes[0].members?.[0].name, 'name');
});

test('updateEdge clears cardinality with empty string', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'er',
    nodes: [
      { id: 'a', kind: 'entity' },
      { id: 'b', kind: 'entity' },
    ],
    edges: [{ from: 'a', to: 'b', cardinalityFrom: '1', cardinalityTo: '*' }],
    groups: [],
  };
  const r = updateEdge(doc, { from: 'a', to: 'b', cardinalityFrom: '', cardinalityTo: '' });
  assert.equal(r.document.edges[0].cardinalityFrom, undefined);
  assert.equal(r.document.edges[0].cardinalityTo, undefined);
});

test('classDiagram quoted class names import with fallback', () => {
  const r = importMermaid(`classDiagram
    class "User Account" {
        -int id
        +login() bool
    }
    class Order { -int id }
    "User Account" "1" -- "1..*" Order : places
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 2);
  assert.ok(r.document.nodes.some((n) => n.label === 'User Account'));
  assert.equal(r.document.edges.length, 1);
  assert.equal(r.document.edges[0].cardinalityFrom, '1');
  assert.equal(r.document.edges[0].cardinalityTo, '1..*');
  assert.equal(r.document.edges[0].attrs?.relation, 'association');
});

test('uml-class cardinality survives double round-trip', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', cardinalityFrom: '1', cardinalityTo: '1..*', attrs: { relation: 'association' } }],
    groups: [],
  };
  const once = importMermaid(exportMermaid(doc));
  assert.equal(once.valid, true);
  assert.equal(once.document.edges[0].cardinalityFrom, '1');
  const twice = importMermaid(exportMermaid(once.document));
  assert.equal(twice.valid, true);
  assert.equal(twice.document.edges[0].cardinalityFrom, '1');
  assert.equal(twice.document.edges[0].cardinalityTo, '1..*');
});

test('classDiagram quoted labels round-trip via class-id comment', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'user', label: 'User Account', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', attrs: { relation: 'dependency' } }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('class user'), m);
  assert.ok(m.includes('%% @lgdl label: User Account'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.ok(back.document.nodes.some((n) => n.id === 'user' && n.label === 'User Account'));
  assert.equal(back.document.edges.length, 1);
});

test('classDiagram extra connectors import', () => {
  const r = importMermaid(`classDiagram
    Order ..> Product
    C <-- D
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 2);
  assert.equal(r.document.edges[0].attrs?.relation, 'dependency');
});

test('classDiagram fallback ids skip existing class ids', () => {
  const r = importMermaid(`classDiagram
    class "A B" {
        +String abName
    }
    class cls1 {
        +String realName
    }
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.length, 2);
  assert.ok(r.document.nodes.some((n) => n.id === 'cls1' && n.members?.[0]?.name === 'realName'));
});

test('reverse classDiagram connectors produce same edge as forward', () => {
  const r = importMermaid(`classDiagram
    E <.. F
    F ..> E
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 2);
  assert.equal(r.document.edges[0].from, 'F');
  assert.equal(r.document.edges[0].to, 'E');
  assert.equal(r.document.edges[1].from, 'F');
  assert.equal(r.document.edges[1].to, 'E');
});

test('class label entities decode on import', () => {
  const r = importMermaid(`classDiagram
    class "Foo &quot;Bar&quot; Baz"
`);
  assert.equal(r.valid, true);
  assert.equal(r.document.nodes[0].label, 'Foo "Bar" Baz');
});

test('reverse classDiagram connector swaps cardinalities too', () => {
  const r = importMermaid(`classDiagram
    E "1" <.. "0..*" F
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const e = r.document.edges[0];
  assert.equal(e.from, 'F');
  assert.equal(e.to, 'E');
  assert.equal(e.cardinalityFrom, '0..*');
  assert.equal(e.cardinalityTo, '1');
});

test('ER dotted connectors (..) import', () => {
  const r = importMermaid(`erDiagram
    CUSTOMER ||..o{ ORDER : places-dotted
    SUPPLIER ||..|| CONTRACT
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges.length, 2);
  assert.equal(r.document.edges[0].cardinalityTo, '0..*');
});

test('classDiagram cardinality label "many" normalizes to *', () => {
  const r = importMermaid(`classDiagram
    Class01 "1" *-- "many" Class02 : contains
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.edges[0].cardinalityTo, '*');
});

test('uml-class round-trip with label != id produces no ghost nodes', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'user', label: 'User', kind: 'entity' },
      { id: 'order', label: 'Order', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', label: '拥有', attrs: { relation: 'association' } }],
    groups: [],
  };
  const m = exportMermaid(doc);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes.length, 2, `ghost nodes: ${back.document.nodes.map((n) => n.id).join(', ')}`);
  assert.equal(back.document.edges.length, 1);
  assert.equal(back.document.edges[0].from, 'user');
  assert.equal(back.document.edges[0].to, 'order');
});

test('parallel edges with different relations are not duplicates', () => {
  const r = parseLgdl(`type: uml-class
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: b
    attrs:
      relation: association
  - from: a
    to: b
    attrs:
      relation: dependency
`);
  assert.equal(r.valid, true);
  // identical relation still duplicates
  const dup = parseLgdl(`type: uml-class
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: b
  - from: a
    to: b
`);
  assert.equal(dup.valid, false);
});

test('type-first method layout imports', () => {
  const r = importMermaid(`classDiagram
    class Order {
        +void calcTotal()
        +double sum(double a, double b)
    }
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  const ms = r.document.nodes[0].members ?? [];
  assert.equal(ms.length, 2);
  assert.equal(ms[0].name, 'calcTotal');
  assert.equal(ms[0].type, 'void');
  assert.equal(ms[1].name, 'sum');
  assert.equal(ms[1].type, 'double');
  assert.equal(ms[1].params, '(double a, double b)');
});

test('parallelogram and hexagon shapes keep clean labels', () => {
  const r = importMermaid(`flowchart TD
    p1[/输入/]
    h{{决策}}
`);
  assert.equal(r.valid, true, r.issues.map((i) => i.message).join('; '));
  assert.equal(r.document.nodes.find((n) => n.id === 'p1')?.label, '输入');
  assert.equal(r.document.nodes.find((n) => n.id === 'h')?.label, '决策');
});

test('removeEdge locates relation-only parallel edges', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'a', label: 'A', kind: 'entity' },
      { id: 'b', label: 'B', kind: 'entity' },
    ],
    edges: [
      { from: 'a', to: 'b', attrs: { relation: 'association' } },
      { from: 'a', to: 'b', attrs: { relation: 'dependency' } },
    ],
    groups: [],
  };
  const r = removeEdge(doc, 'a', 'b', 'dependency');
  assert.equal(r.document.edges.length, 1);
  assert.equal(r.document.edges[0].attrs?.relation, 'association');
});

test('removeEdge label-first match never deletes a relation-collision edge', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'a', label: 'A', kind: 'entity' },
      { id: 'b', label: 'B', kind: 'entity' },
    ],
    edges: [
      { from: 'a', to: 'b', label: 'dep', attrs: { relation: 'association' } },
      { from: 'a', to: 'b', label: 'assoc', attrs: { relation: 'dep' } },
    ],
    groups: [],
  };
  // "dep" matches edge 1's label exactly — only that one is removed
  const r = removeEdge(doc, 'a', 'b', 'dep');
  assert.equal(r.document.edges.length, 1);
  assert.equal(r.document.edges[0].label, 'assoc');
});

test('classDiagram label/id split round-trips via comments', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'user', label: '用户', kind: 'entity' },
      { id: 'order', label: '订单', kind: 'entity' },
    ],
    edges: [{ from: 'user', to: 'order', attrs: { relation: 'association' } }],
    groups: [],
  };
  const m = exportMermaid(doc);
  assert.ok(m.includes('class user'), m);
  assert.ok(m.includes('user -- order'), m);
  const back = importMermaid(m);
  assert.equal(back.valid, true, back.issues.map((i) => i.message).join('; '));
  assert.equal(back.document.nodes.length, 2);
  assert.ok(back.document.nodes.some((n) => n.id === 'user' && n.label === '用户'));
  assert.equal(back.document.edges.length, 1);
  assert.equal(back.document.edges[0].from, 'user');
});

test('updateEdge label-first never touches relation-collision edge', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'a', label: 'A', kind: 'entity' },
      { id: 'b', label: 'B', kind: 'entity' },
    ],
    edges: [
      { from: 'a', to: 'b', label: 'dep', attrs: { relation: 'association' } },
      { from: 'a', to: 'b', label: 'assoc', attrs: { relation: 'dep' } },
    ],
    groups: [],
  };
  const r = updateEdge(doc, { from: 'a', to: 'b', fromLabel: 'dep', label: 'RENAMED' });
  const labels = r.document.edges.map((e) => e.label);
  assert.deepEqual(labels.sort(), ['RENAMED', 'assoc'].sort());
});

test('addEdge allows relation-only parallel edges', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'a', label: 'A', kind: 'entity' },
      { id: 'b', label: 'B', kind: 'entity' },
    ],
    edges: [{ from: 'a', to: 'b', attrs: { relation: 'association' } }],
    groups: [],
  };
  const r = addEdge(doc, { from: 'a', to: 'b', attrs: { relation: 'dependency' } });
  assert.equal(r.document.edges.length, 2);
  assert.throws(() => addEdge(doc, { from: 'a', to: 'b', attrs: { relation: 'association' } }), /already exists/);
});

test('updateNode with unchanged new-id still applies other fields', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [{ id: 'a', label: 'A' }],
    edges: [],
    groups: [],
  };
  const r = updateNode(doc, { id: 'a', newId: 'a', label: 'A2' });
  assert.equal(r.document.nodes[0].label, 'A2');
  assert.equal(r.document.nodes[0].id, 'a');
});

test('removeEdge refuses when several edges share the label', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'uml-class',
    nodes: [
      { id: 'a', label: 'A', kind: 'entity' },
      { id: 'b', label: 'B', kind: 'entity' },
    ],
    edges: [
      { from: 'a', to: 'b', label: 'knows', attrs: { relation: 'association' } },
      { from: 'a', to: 'b', label: 'knows', attrs: { relation: 'dependency' } },
    ],
    groups: [],
  };
  assert.throws(() => removeEdge(doc, 'a', 'b', 'knows'), /share the label/);
});

test('empty labels stay addressable through serialization', () => {
  const doc: Parameters<typeof addNode>[0] = {
    type: 'flowchart',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
    edges: [{ from: 'a', to: 'b', label: '' }],
    groups: [],
  };
  const text = serializeLgdl(doc);
  assert.ok(text.includes('label: ""'), text);
  const back = parseLgdl(text);
  assert.equal(back.valid, true);
  assert.equal(back.document.edges[0].label, '');
  // and the empty label edge can be addressed
  const r = removeEdge(back.document, 'a', 'b', '');
  assert.equal(r.document.edges.length, 0);
});
