import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLgdl, validate } from './index.js';

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
  assert.equal(result.valid, true);
  assert.ok(result.issues.some((i) => i.severity === 'warning' && i.message.includes('Unknown node kind')));
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
