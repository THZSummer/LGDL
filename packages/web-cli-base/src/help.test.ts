import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webCliHelp } from './help.js';

test('webCliHelp: top-level lists all subcommands with summaries', () => {
  const text = webCliHelp();
  assert.ok(text.includes('lgdl-web-cli ——'));
  assert.ok(text.includes('add-node'));
  assert.ok(text.includes('status'));
  assert.ok(text.includes('convert'));
  assert.ok(text.includes('--help'));
});

test('webCliHelp: incremental command shows required/optional args and example', () => {
  const text = webCliHelp('add-node');
  assert.ok(text.includes('add-node ——'));
  assert.ok(text.includes('必填 --id'));
  assert.ok(text.includes('可选 --label'));
  assert.ok(text.includes('可选 --kind'));
  assert.ok(text.includes('示例：lgdl-web-cli add-node'));
});

test('webCliHelp: update command notes the no-change rule', () => {
  const text = webCliHelp('update-node');
  assert.ok(text.includes('no change requested'));
  assert.ok(text.includes('--new-id'));
});

test('webCliHelp: unknown topic reports an error hint', () => {
  const text = webCliHelp('explode');
  assert.ok(text.includes('未知子命令'));
  assert.ok(text.includes('--help'));
});
