import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lgdlExecutor } from './lgdl-web.js';

const { executeCommands } = lgdlExecutor;

const SRC = `title: t
type: flowchart
nodes:
  - id: a
    label: A
  - id: b
    label: B
edges:
  - from: a
    to: b
    label: dep
`;

test('executeCommands: web-fetch line routes to the independent fetcher', async () => {
  const r = await executeCommands(SRC, 'web-fetch --path data:text/plain,skill%20doc', 'main');
  assert.ok(r.ok, r.error);
  assert.equal(r.changed, false);
  assert.equal(r.source, SRC);
  assert.ok(r.lines.some((l) => l.includes('skill doc')));
});

test('executeCommands: web-fetch without --path is an error', async () => {
  const r = await executeCommands(SRC, 'web-fetch', 'main');
  assert.equal(r.ok, false);
  assert.equal(r.changed, false);
  assert.match(r.error ?? '', /--path/);
});
