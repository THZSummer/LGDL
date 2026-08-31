import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWebFetchCommand, executeWebFetch } from './web-fetch.js';
import { WEB_FETCH_TOOL } from './tools.js';
import { webFetchHelp } from './help.js';

test('parseWebFetchCommand: parses web-fetch --path', () => {
  const r = parseWebFetchCommand('web-fetch --path lgdl/web/workbench/README-CLI.md');
  assert.deepEqual(r, { ok: true, kind: 'fetch', path: 'lgdl/web/workbench/README-CLI.md' });
  const quoted = parseWebFetchCommand('web-fetch --path "lgdl/web/workbench/README-CLI.md"');
  assert.deepEqual(quoted, { ok: true, kind: 'fetch', path: 'lgdl/web/workbench/README-CLI.md' });
  const url = parseWebFetchCommand('web-fetch --path https://example.com/doc.md');
  assert.deepEqual(url, { ok: true, kind: 'fetch', path: 'https://example.com/doc.md' });
});

test('parseWebFetchCommand: rejects missing prefix / missing --path', () => {
  const noPrefix = parseWebFetchCommand('web-cli fetch-doc --path x');
  assert.equal(noPrefix.ok, false);
  if (noPrefix.ok === false) assert.match(noPrefix.error, /web-fetch/);
  const noPath = parseWebFetchCommand('web-fetch');
  assert.equal(noPath.ok, false);
  if (noPath.ok === false) assert.match(noPath.error, /--path/);
});

test('parseWebFetchCommand: --help returns help without --path', () => {
  const r = parseWebFetchCommand('web-fetch --help');
  assert.equal(r.ok, true);
  if (r.ok === true) assert.equal(r.kind, 'help');
});

test('executeWebFetch: fetches a data: URL successfully without touching the doc', async () => {
  const r = await executeWebFetch('data:text/plain,hello%20world');
  assert.ok(r.ok, r.error);
  assert.equal(r.changed, false);
  assert.ok(r.lines.some((l) => l.includes('hello world')));
});

test('executeWebFetch: missing path is an error', async () => {
  const r = await executeWebFetch('');
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /--path/);
});

test('executeWebFetch: un-fetchable path reports failure', async () => {
  // node 环境相对路径无法解析为 URL → 走失败分支
  const r = await executeWebFetch('lgdl/web/workbench/README-CLI.md');
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.includes('✖')));
});

test('WEB_FETCH_TOOL: exposes web-fetch as an independent base tool', () => {
  assert.equal(WEB_FETCH_TOOL.function.name, 'web-fetch');
  const props = WEB_FETCH_TOOL.function.parameters.properties as Record<string, unknown>;
  assert.ok(props.path);
  const required = (WEB_FETCH_TOOL.function.parameters as { required?: string[] }).required;
  assert.ok(required?.includes('path'));
});

test('webFetchHelp: shows required --path', () => {
  const text = webFetchHelp();
  assert.ok(text.includes('web-fetch ——'));
  assert.ok(text.includes('必填 --path'));
});
