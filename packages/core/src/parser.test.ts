import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLgdl, validate, serializeLgdl } from './index.js';

const VALID_DOC = `title: 用户登录流程
type: flowchart

nodes:
  - id: start
    label: 用户访问
    kind: start
  - id: login
    label: 输入账号密码
    kind: process
  - id: verify
    label: 验证凭据
    kind: decision
  - id: ok
    label: 登录成功
    kind: end

edges:
  - from: start
    to: login
    label: 打开页面
  - from: login
    to: verify
  - from: verify
    to: ok
    label: 通过

groups:
  - id: frontend
    label: 前端层
    contains: [start, login]
`;

test('parses a valid document', () => {
  const result = parseLgdl(VALID_DOC);
  assert.equal(result.valid, true);
  assert.equal(result.issues.length, 0);
  assert.equal(result.document.type, 'flowchart');
  assert.equal(result.document.title, '用户登录流程');
  assert.equal(result.document.nodes.length, 4);
  assert.equal(result.document.edges.length, 3);
  assert.equal(result.document.groups.length, 1);
  assert.equal(result.document.nodes[0].id, 'start');
  assert.equal(result.document.nodes[0].kind, 'start');
  assert.deepEqual(result.document.groups[0].contains, ['start', 'login']);
});

test('rejects duplicate node ids', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
  - id: a
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('Duplicate node id')));
});

test('rejects edge referencing unknown node', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
edges:
  - from: a
    to: ghost
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('unknown target node')));
});

test('rejects unknown diagram type', () => {
  const result = parseLgdl(`type: circuit
nodes:
  - id: a
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('Unsupported diagram type')));
});

test('warns on unknown node kind but still valid', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
    kind: rocket
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.severity === 'error' && i.message.includes('Unknown node kind')));
});

test('validate works on hand-built documents', () => {
  const result = validate({
    type: 'mindmap',
    nodes: [{ id: 'root', kind: 'start' }],
    edges: [],
    groups: [],
  });
  assert.equal(result.valid, true);
});

test('inline list parsing works', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
groups:
  - id: g1
    contains: [a, b]
`);
  // 'b' doesn't exist -> error, but list itself parsed as array
  assert.ok(result.issues.some((i) => i.message.includes('contains unknown node')));
  assert.equal(result.document.groups[0].contains.length, 2);
});

test('numeric node ids stay strings (id is an identifier)', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: 1111
    label: 数字节点
    kind: entity
  - id: oss
edges:
  - from: 1111
    to: oss
groups:
  - id: g1
    contains: [1111, oss]
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
  assert.equal(typeof result.document.nodes[0].id, 'string');
  assert.equal(result.document.nodes[0].id, '1111');
  // edge reference works
  assert.equal(result.document.edges[0].from, '1111');
  // group contains works
  assert.deepEqual(result.document.groups[0].contains, ['1111', 'oss']);
});

test('numeric attrs values stay numbers', () => {
  const result = parseLgdl(`type: gantt
nodes:
  - id: task
    label: 任务
    attrs:
      start: 6
      duration: 8
`);
  assert.equal(result.valid, true);
  assert.equal(result.document.nodes[0].attrs?.start, 6);
  assert.equal(typeof result.document.nodes[0].attrs?.duration, 'number');
});

test('nested groups are valid (group contains another group id)', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
  - id: b
groups:
  - id: inner
    label: 内层
    contains: [a, b]
  - id: outer
    label: 外层
    contains: [inner]
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.document.groups[1].contains, ['inner']);
});

test('group may reference a group declared later in the list', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
groups:
  - id: outer
    contains: [inner]
  - id: inner
    contains: [a]
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
});

test('group contains unknown id (neither node nor group) is an error', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
groups:
  - id: g1
    contains: [ghost]
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('contains unknown node or group')));
});

test('duplicate group id is an error', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
groups:
  - id: g1
    contains: [a]
  - id: g1
    contains: [a]
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('Duplicate group id')));
});

test('group cannot contain itself directly', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
groups:
  - id: g1
    contains: [g1, a]
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('cycle')));
});

test('group containment cycle (a -> b -> a) is an error', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
  - id: b
groups:
  - id: g1
    contains: [g2]
  - id: g2
    contains: [g1]
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('cycle')));
});

test('group in two groups is an error', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
groups:
  - id: g1
    contains: [g3]
  - id: g2
    contains: [g3]
  - id: g3
    contains: [a]
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('belongs to both')));
});

test('inline comments are stripped from values', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
  - id: b
groups:
  - id: g1
    label: 前端层 # 说明文字
    contains: [a, b]   # 成员列表
edges:
  - from: a
    to: b
    label: 下一步 # 边注释
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
  assert.equal(result.document.groups[0].label, '前端层');
  assert.deepEqual(result.document.groups[0].contains, ['a', 'b']);
  assert.equal(result.document.edges[0].label, '下一步');
});

test('hash inside quotes is preserved, hash without leading space is kept', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
    label: "say # hi"
  - id: b
    label: url#fragment
`);
  assert.equal(result.valid, true);
  assert.equal(result.document.nodes[0].label, 'say # hi');
  assert.equal(result.document.nodes[1].label, 'url#fragment');
});

test('edges may reference group ids (aggregate edges)', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
  - id: b
edges:
  - from: g1
    to: g2
    label: 整体调用
groups:
  - id: g1
    contains: [a]
  - id: g2
    contains: [b]
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
  assert.equal(result.document.edges[0].from, 'g1');
  assert.equal(result.document.edges[0].to, 'g2');
});

test('mixed edges: node -> group and group -> node are valid', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: g2
  - from: g1
    to: b
groups:
  - id: g1
    contains: [a]
  - id: g2
    contains: [b]
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
});

test('edge referencing an id that is neither node nor group is an error', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: a
edges:
  - from: ghost
    to: a
groups:
  - id: g1
    contains: [a]
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('unknown source node or group')));
});

// ---- members: the explicit class-member field ----

const UML_DOC = `title: 订单系统类图
type: uml-class

nodes:
  - id: cart
    label: Cart
    kind: entity
    members:
      - kind: attribute
        name: items
        type: list
        visibility: private
      - kind: method
        name: addItem
        type: void
        params: "(item)"
        visibility: public
`;

test('uml-class entity with structured members parses valid', () => {
  const result = parseLgdl(UML_DOC);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
  const cart = result.document.nodes[0];
  assert.equal(cart.members?.length, 2);
  assert.deepEqual(cart.members?.[0], {
    kind: 'attribute',
    name: 'items',
    type: 'list',
    visibility: 'private',
  });
  assert.deepEqual(cart.members?.[1], {
    kind: 'method',
    name: 'addItem',
    type: 'void',
    params: '(item)',
    visibility: 'public',
  });
});

test('members on a non-entity kind is an error', () => {
  const result = parseLgdl(`type: uml-class
nodes:
  - id: x
    kind: process
    members:
      - kind: attribute
        name: a
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('only valid on kind: entity')));
});

test('members outside uml-class diagrams is an error', () => {
  const result = parseLgdl(`type: flowchart
nodes:
  - id: x
    kind: entity
    members:
      - kind: attribute
        name: a
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('only supported in uml-class')));
});

test('unknown member kind is an error', () => {
  const result = parseLgdl(`type: uml-class
nodes:
  - id: x
    kind: entity
    members:
      - kind: property
        name: a
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('Unknown member kind')));
});

test('member without a name is an error', () => {
  const result = parseLgdl(`type: uml-class
nodes:
  - id: x
    kind: entity
    members:
      - kind: attribute
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('Member name is required')));
});

test('attribute member with params is an error', () => {
  const result = parseLgdl(`type: uml-class
nodes:
  - id: x
    kind: entity
    members:
      - kind: attribute
        name: a
        params: "(x)"
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('must not have "params"')));
});

test('unknown member visibility is an error', () => {
  const result = parseLgdl(`type: uml-class
nodes:
  - id: x
    kind: entity
    members:
      - kind: attribute
        name: a
        visibility: internal
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('Unknown member visibility')));
});

test('serialize roundtrip preserves structured members', () => {
  const parsed = parseLgdl(UML_DOC);
  const reparsed = parseLgdl(serializeLgdl(parsed.document));
  assert.equal(reparsed.valid, true, reparsed.issues.map((i) => i.message).join('; '));
  assert.deepEqual(reparsed.document.nodes[0].members, parsed.document.nodes[0].members);
});

// ---- cardinality: explicit multiplicity fields on edges ----

test('cardinality fields parse as strings (quoted and bare)', () => {
  const result = parseLgdl(`type: er
nodes:
  - id: user
  - id: order
edges:
  - from: user
    to: order
    label: 拥有
    cardinalityFrom: "1"
    cardinalityTo: "*"
  - from: order
    to: user
    cardinalityFrom: 1
    cardinalityTo: 0..1
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
  const e0 = result.document.edges[0];
  assert.equal(e0.label, '拥有');
  assert.equal(e0.cardinalityFrom, '1');
  assert.equal(e0.cardinalityTo, '*');
  // bare `1` and `0..1` must stay strings, not numbers
  assert.equal(result.document.edges[1].cardinalityFrom, '1');
  assert.equal(result.document.edges[1].cardinalityTo, '0..1');
});

test('non-string cardinality (hand-built doc) is an error', () => {
  const result = validate({
    type: 'er',
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ from: 'a', to: 'b', cardinalityFrom: 1 as never }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('cardinalityFrom must be a string')));
});

test('serialize roundtrip preserves cardinality fields', () => {
  const parsed = parseLgdl(`type: er
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: b
    label: 拥有
    cardinalityFrom: "1"
    cardinalityTo: "*"
`);
  const reparsed = parseLgdl(serializeLgdl(parsed.document));
  assert.equal(reparsed.valid, true, reparsed.issues.map((i) => i.message).join('; '));
  assert.equal(reparsed.document.edges[0].label, '拥有');
  assert.equal(reparsed.document.edges[0].cardinalityFrom, '1');
  assert.equal(reparsed.document.edges[0].cardinalityTo, '*');
});

// ---- strict legacy rejection: no old-writing compatibility ----

test('members are allowed in er diagrams too', () => {
  const result = parseLgdl(`type: er
nodes:
  - id: user
    label: 用户
    kind: entity
    members:
      - kind: attribute
        name: id
      - kind: attribute
        name: name
`);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join('; '));
  assert.deepEqual(result.document.nodes[0].members, [
    { kind: 'attribute', name: 'id' },
    { kind: 'attribute', name: 'name' },
  ]);
});

test('entity label with newline-packed members is rejected (uml-class)', () => {
  const result = parseLgdl(`type: uml-class
nodes:
  - id: cart
    label: "Cart\\n- items: list\\n+ addItem()"
    kind: entity
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('newline-packed members')), result.issues.map((i) => i.message).join('; '));
});

test('entity label with newline-packed attributes is rejected (er)', () => {
  const result = parseLgdl(`type: er
nodes:
  - id: user
    label: "用户\\n- id\\n- name"
    kind: entity
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('newline-packed members')));
});

test('edge label mixing multiplicity is rejected (er)', () => {
  const result = parseLgdl(`type: er
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: b
    label: "拥有 1..*"
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('mixes a multiplicity')), result.issues.map((i) => i.message).join('; '));
});

test('edge label mixing multiplicity is rejected (uml-class)', () => {
  const result = parseLgdl(`type: uml-class
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: b
    label: "发起 1..1"
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('mixes a multiplicity')));
});

test('attrs.cardinality escape hatch is rejected (er)', () => {
  const result = parseLgdl(`type: er
nodes:
  - id: a
  - id: b
edges:
  - from: a
    to: b
    label: 拥有
    attrs:
      cardinality: "1..*"
`);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((i) => i.message.includes('attrs.cardinality')));
});
