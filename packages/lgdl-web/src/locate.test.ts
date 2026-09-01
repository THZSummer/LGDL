import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locateIssue } from './locate.js';
import { parseLgdl } from '@lgdl/lgdl-core';

// Line numbers (1-based) are referenced in the assertions below.
// Modern syntax (V2 group-as-node): groups are `kind: group` nodes inside
// `nodes:` — there is NO top-level `groups:` section anymore.
const SRC = [
  'type: uml-class', // 1
  'title: 示例', // 2
  '', // 3
  'nodes:', // 4
  '  - id: user', // 5
  '    label: 用户', // 6
  '    kind: entity', // 7
  '    members:', // 8
  '      - kind: attribute', // 9
  '        name: id', // 10
  '        type: int', // 11
  '      - kind: method', // 12
  '        name: login', // 13
  '        params: "(pwd: string)"', // 14
  '  - id: order', // 15
  '    label: 订单', // 16
  '    kind: entity', // 17
  '  - id: g1', // 18
  '    kind: group', // 19
  '    contains: [user, order]', // 20
  '', // 21
  'edges:', // 22
  '  - from: user', // 23
  '    to: order', // 24
  '    label: 拥有', // 25
].join('\n');

function lineSpan(src: string, line: number): { from: number; to: number } {
  const lines = src.split('\n');
  let off = 0;
  for (let i = 0; i < line - 1; i++) off += lines[i].length + 1;
  return { from: off, to: off + lines[line - 1].length };
}

test('locateIssue: "type" resolves to the value after the colon', () => {
  const span = locateIssue(SRC, 'type');
  assert.ok(span);
  const seg = SRC.slice(span.from, span.to);
  assert.equal(seg, 'uml-class');
});

test('locateIssue: nodes[i] resolves to the i-th node item line', () => {
  const span = locateIssue(SRC, 'nodes[0]');
  assert.deepEqual(span, lineSpan(SRC, 5));
  const span2 = locateIssue(SRC, 'nodes[1]');
  assert.deepEqual(span2, lineSpan(SRC, 15));
});

test('locateIssue: nested members items are NOT counted as section items (regression)', () => {
  // without the item-indent fix, nodes[1] would resolve to the first
  // "- kind: method" member row of node 0
  const span = locateIssue(SRC, 'nodes[1]');
  assert.deepEqual(span, lineSpan(SRC, 15));
});

test('locateIssue: nodes[i].members[j] resolves to the j-th member item line', () => {
  assert.deepEqual(locateIssue(SRC, 'nodes[0].members[0]'), lineSpan(SRC, 9));
  assert.deepEqual(locateIssue(SRC, 'nodes[0].members[1]'), lineSpan(SRC, 12));
});

test('locateIssue: deep member paths resolve to the nearest supported prefix', () => {
  assert.deepEqual(locateIssue(SRC, 'nodes[0].members[1].kind'), lineSpan(SRC, 12));
  assert.deepEqual(locateIssue(SRC, 'nodes[0].members[0].name'), lineSpan(SRC, 9));
});

test('locateIssue: field values resolve to the value span', () => {
  const label = locateIssue(SRC, 'nodes[0].label');
  assert.ok(label);
  assert.equal(SRC.slice(label.from, label.to), '用户');
  const rel = locateIssue(SRC, 'edges[0].label');
  assert.ok(rel);
  assert.equal(SRC.slice(rel.from, rel.to), '拥有');
});

test('locateIssue: edges[i] and nodes[i] resolve to item lines (groups are nodes)', () => {
  assert.deepEqual(locateIssue(SRC, 'edges[0]'), lineSpan(SRC, 23));
  // g1 is a `kind: group` node — the 3rd node (document index 2)
  assert.deepEqual(locateIssue(SRC, 'nodes[2]'), lineSpan(SRC, 18));
});

test('locateIssue: nodes[i].contains[j] resolves inside the inline list', () => {
  const span = locateIssue(SRC, 'nodes[2].contains[1]');
  assert.ok(span);
  assert.equal(SRC.slice(span.from, span.to), 'order');
  const first = locateIssue(SRC, 'nodes[2].contains[0]');
  assert.ok(first);
  assert.equal(SRC.slice(first.from, first.to), 'user');
});

test('locateIssue: modern fixture is accepted by the parser (no top-level groups:)', () => {
  const parsed = parseLgdl(SRC);
  assert.equal(parsed.valid, true);
  const g1 = parsed.document.nodes.find((n) => n.id === 'g1');
  assert.ok(g1);
  assert.equal(g1.kind, 'group');
  assert.deepEqual(g1.contains, ['user', 'order']);
});

test('locateIssue: "line N" highlights the whole line', () => {
  assert.deepEqual(locateIssue(SRC, 'line 2'), lineSpan(SRC, 2));
  assert.equal(locateIssue(SRC, 'line 99'), null);
});

test('locateIssue: unlocatable / unknown locations return null', () => {
  assert.equal(locateIssue(SRC, undefined), null);
  assert.equal(locateIssue(SRC, 'doc'), null);
  assert.equal(locateIssue(SRC, 'runtime'), null);
  assert.equal(locateIssue(SRC, 'nodes[9]'), null);
  assert.equal(locateIssue(SRC, 'bogus'), null);
});
