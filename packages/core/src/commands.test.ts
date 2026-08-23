import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMANDS,
  buildOperation,
  requireParams,
  assertChangeRequested,
  parseAttrsSpec,
  parseMemberSpec,
  defaultKindFor,
} from './commands.js';

test('COMMANDS covers all 9 incremental commands', () => {
  assert.deepEqual(Object.keys(COMMANDS).sort(), [
    'add-edge',
    'add-group',
    'add-node',
    'remove-edge',
    'remove-group',
    'remove-node',
    'update-edge',
    'update-group',
    'update-node',
  ]);
});

test('buildOperation: add-node with default kind by doc type', () => {
  const op = buildOperation('add-node', { id: 'u', label: '用户' }, 'er');
  assert.equal(op.op, 'add-node');
  if (op.op === 'add-node') {
    assert.equal(op.id, 'u');
    assert.equal(op.kind, 'entity');
  }
  // 无 docType → process
  const plain = buildOperation('add-node', { id: 'x' });
  if (plain.op === 'add-node') assert.equal(plain.kind, 'process');
});

test('buildOperation: add-node parses members and attrs', () => {
  const op = buildOperation('add-node', {
    id: 'cls',
    kind: 'entity',
    member: 'kind=attribute,name=name,type=string',
    attrs: 'start=0,duration=3',
  });
  assert.equal(op.op, 'add-node');
  if (op.op === 'add-node') {
    assert.deepEqual(op.members, [{ kind: 'attribute', name: 'name', type: 'string' }]);
    assert.deepEqual(op.attrs, { start: 0, duration: 3 });
  }
});

test('buildOperation: update-node requires a change', () => {
  assert.throws(() => buildOperation('update-node', { id: 'x' }), /no change requested/);
  const op = buildOperation('update-node', { id: 'x', label: '新名' });
  assert.equal(op.op, 'update-node');
  if (op.op === 'update-node') assert.equal(op.label, '新名');
});

test('buildOperation: missing required param throws', () => {
  assert.throws(() => buildOperation('add-edge', { from: 'a' }), /缺少必填参数 --to/);
});

test('buildOperation: remove-edge uses edge-label fallback to label', () => {
  const op = buildOperation('remove-edge', { from: 'a', to: 'b', label: '依赖' });
  assert.equal(op.op, 'remove-edge');
  if (op.op === 'remove-edge') assert.equal(op.label, '依赖');
});

test('buildOperation: unknown command throws with supported list', () => {
  assert.throws(() => buildOperation('explode', { id: 'x' }), /未知子命令/);
});

test('buildOperation: update-edge no-change guard', () => {
  assert.throws(
    () => buildOperation('update-edge', { from: 'a', to: 'b' }),
    /no change requested/,
  );
});

test('parseAttrsSpec: numbers keep their original form (1.10, 080)', () => {
  assert.deepEqual(parseAttrsSpec('version=1.10,port=080,flag=true,label="a b"'), {
    version: '1.10',
    port: '080',
    flag: true,
    label: 'a b',
  });
});

test('parseAttrsSpec: plain numbers become numbers', () => {
  assert.deepEqual(parseAttrsSpec('start=0,duration=3'), { start: 0, duration: 3 });
});

test('parseMemberSpec: parses a structured member', () => {
  assert.deepEqual(parseMemberSpec('kind=method,name=checkout,params="(items: list)",visibility=public'), {
    kind: 'method',
    name: 'checkout',
    params: '(items: list)',
    visibility: 'public',
  });
});

test('parseMemberSpec: missing name throws', () => {
  assert.throws(() => parseMemberSpec('kind=attribute'), /name/);
});

test('requireParams and assertChangeRequested helpers', () => {
  const spec = COMMANDS['add-edge'];
  assert.throws(() => requireParams(spec, { from: 'a' }), /--to/);
  const up = COMMANDS['update-node'];
  assert.throws(() => assertChangeRequested(up, { id: 'x' }), /no change requested/);
});

test('defaultKindFor maps doc types to semantic roles', () => {
  assert.equal(defaultKindFor('er'), 'entity');
  assert.equal(defaultKindFor('uml-class'), 'entity');
  assert.equal(defaultKindFor('state'), 'state');
  assert.equal(defaultKindFor('flowchart'), 'process');
  assert.equal(defaultKindFor(undefined), 'process');
});
