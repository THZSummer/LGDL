import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locateIssue } from './locate.js';

// Line numbers (1-based) are referenced in the assertions below.
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
  '', // 18
  'edges:', // 19
  '  - from: user', // 20
  '    to: order', // 21
  '    label: 拥有', // 22
  '', // 23
  'groups:', // 24
  '  - id: g1', // 25
  '    contains: [user, order]', // 26
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

test('locateIssue: edges[i] and groups[i] resolve to item lines', () => {
  assert.deepEqual(locateIssue(SRC, 'edges[0]'), lineSpan(SRC, 20));
  assert.deepEqual(locateIssue(SRC, 'groups[0]'), lineSpan(SRC, 25));
});

test('locateIssue: groups[i].contains[j] resolves inside the inline list', () => {
  const span = locateIssue(SRC, 'groups[0].contains[1]');
  assert.ok(span);
  assert.equal(SRC.slice(span.from, span.to), 'order');
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
