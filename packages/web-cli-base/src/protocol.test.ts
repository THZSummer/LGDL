import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeCli } from './protocol.js';

test('tokenizeCli: splits on whitespace, respects quotes', () => {
  assert.deepEqual(tokenizeCli('demo-cli add-node --id x --label "hello world"'), [
    'demo-cli',
    'add-node',
    '--id',
    'x',
    '--label',
    'hello world',
  ]);
});
