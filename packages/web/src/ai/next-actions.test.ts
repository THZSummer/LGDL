import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNextActions } from './next-actions.js';

test('parseNextActions: parses a JSON array of {label, prompt}', () => {
  const raw = '[{"label":"增加配色分组","prompt":"给当前图增加配色分组"},{"label":"补充节点","prompt":"补充 2 个业务节点"}]';
  const actions = parseNextActions(raw);
  assert.equal(actions.length, 2);
  assert.deepEqual(actions[0], { label: '增加配色分组', prompt: '给当前图增加配色分组' });
  assert.equal(actions[1].label, '补充节点');
});

test('parseNextActions: tolerates extra fields and mixed types (keeps only valid)', () => {
  const raw = '[{"label":"A","prompt":"p","extra":1},{"label":"B"},42,"x",{"prompt":"no-label"}]';
  const actions = parseNextActions(raw);
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0], { label: 'A', prompt: 'p' });
});

test('parseNextActions: empty / malformed / non-array inputs return []', () => {
  assert.deepEqual(parseNextActions(''), []);
  assert.deepEqual(parseNextActions('   '), []);
  assert.deepEqual(parseNextActions('not json'), []);
  assert.deepEqual(parseNextActions('{"label":"A"}'), []);
  assert.deepEqual(parseNextActions('[]'), []);
});

test('parseNextActions: unicode escapes decode', () => {
  const raw = '[{"label":"\\u589e\\u8272","prompt":"\\u7ed9\\u5f53\\u524d\\u56fe\\u589e\\u52a0\\u914d\\u8272"}]';
  const actions = parseNextActions(raw);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].label, '增色');
  assert.equal(actions[0].prompt, '给当前图增加配色');
});
