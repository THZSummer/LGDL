import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webOpHelp } from './help.js';

test('webOpHelp: top-level lists UI operations', () => {
  const text = webOpHelp();
  assert.ok(text.includes('lgdl-web-op-cli ——'));
  assert.ok(text.includes('preview-zoom'));
  assert.ok(text.includes('next-actions'));
  assert.ok(text.includes('apply-source') === false || text.includes('不存在 apply-source'));
});

test('webOpHelp: single operation shows args', () => {
  const text = webOpHelp('preview-zoom');
  assert.ok(text.includes('preview-zoom ——'));
  assert.ok(text.includes('--factor'));
  assert.ok(text.includes('--direction'));
});

test('webOpHelp: export alias is documented', () => {
  const text = webOpHelp('export');
  assert.ok(text.includes('export ——'));
  assert.ok(text.includes('--format'));
  assert.ok(text.includes('别名'));
});
