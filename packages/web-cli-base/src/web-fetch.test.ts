import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWebFetchCommand, executeWebFetch, executeWebFetchWithOptions, htmlToMarkdown } from './web-fetch.js';
import { WEB_FETCH_TOOL } from './tools.js';
import { webFetchHelp } from './help.js';

test('parseWebFetchCommand: parses web-fetch --path', () => {
  const r = parseWebFetchCommand('web-fetch --path guide.md');
  assert.deepEqual(r, { ok: true, kind: 'fetch', path: 'guide.md' });
  const quoted = parseWebFetchCommand('web-fetch --path "guide.md"');
  assert.deepEqual(quoted, { ok: true, kind: 'fetch', path: 'guide.md' });
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
  const r = await executeWebFetch('guide.md');
  assert.equal(r.ok, false);
  assert.ok(r.lines.some((l) => l.includes('✖')));
});

test('WEB_FETCH_TOOL: exposes web-fetch as an independent base tool', () => {
  assert.equal(WEB_FETCH_TOOL.function.name, 'web-fetch');
  const top = WEB_FETCH_TOOL.function.parameters.properties as Record<string, unknown>;
  assert.ok(top.args, 'parameters should nest fields under an args object');
  const argsObj = top.args as { properties?: Record<string, unknown>; required?: string[] };
  assert.ok(argsObj.properties?.path);
  assert.ok(argsObj.required?.includes('path'));
  const required = (WEB_FETCH_TOOL.function.parameters as { required?: string[] }).required;
  assert.ok(required?.includes('args'));
});

test('webFetchHelp: shows required --path', () => {
  const text = webFetchHelp();
  assert.ok(text.includes('web-fetch ——'));
  assert.ok(text.includes('必填 --path'));
});

// ================= v2 升级（FR-018/010/043 additive；既有用例零回归） =================

const HTML = '<html><head><title>x</title></head><body><h1>Hello</h1><p>world <a href="https://e.com">link</a></p></body></html>';

function htmlResponse(text: string): Response {
  return new Response(text, { status: 200, headers: { 'content-type': 'text/html' } });
}

test('web-fetch v2: mock fetch 原文/清洗两态 + untrusted 标记（缺省原文逐字节兼容）', async () => {
  // 原文态（缺省 clean=false）：原文返回，标记不丢失
  const raw = await executeWebFetchWithOptions('https://e.com', {
    fetchImpl: async () => htmlResponse(HTML),
  });
  assert.equal(raw.ok, true);
  assert.ok(raw.lines.join('\n').includes('<h1>Hello</h1>'));
  assert.ok(raw.trust && raw.trust.level === 'untrusted');
  assert.ok(raw.trust.source.includes('https://e.com'));
  // 清洗态（clean=true）：HTML→MD，trust 不因清洗丢失
  const cleaned = await executeWebFetchWithOptions('https://e.com', {
    clean: true,
    fetchImpl: async () => htmlResponse(HTML),
  });
  assert.equal(cleaned.ok, true);
  const out = cleaned.lines.join('\n');
  assert.match(out, /# Hello/);
  assert.doesNotMatch(out, /<h1>/);
  assert.match(out, /world/);
  assert.match(out, /\[link\]\(https:\/\/e\.com\)/);
  assert.ok(cleaned.trust && cleaned.trust.level === 'untrusted'); // 清洗后不丢失
  // 纯文本 + clean=true 不受影响
  const plain = await executeWebFetchWithOptions('https://e.com', {
    clean: true,
    fetchImpl: async () => htmlResponse('not html at all'),
  });
  assert.ok(plain.lines.join('\n').includes('not html at all'));
});

test('web-fetch v2: 大小护栏截断 + 输出元信息（EC-011）', async () => {
  const big = 'x'.repeat(500);
  const r = await executeWebFetchWithOptions('https://e.com', {
    maxBytes: 100,
    fetchImpl: async () => htmlResponse(big),
  });
  assert.equal(r.ok, true);
  assert.equal(r.truncated, true);
  const out = r.lines.join('\n');
  assert.match(out, /输出截断/);
  assert.match(out, /输出元信息：原文 500 字节 > 上限 100/);
  // 未超限不截断
  const small = await executeWebFetchWithOptions('https://e.com', {
    maxBytes: 1000,
    fetchImpl: async () => htmlResponse('hi'),
  });
  assert.equal(small.truncated, false);
});

test('web-fetch v2: 错误分类可读 — CORS/网络 / HTTP 状态 / 超时', async () => {
  // CORS/网络 → 可读
  const net = await executeWebFetchWithOptions('https://cross.example.com/x', {
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  assert.equal(net.ok, false);
  assert.match(net.lines.join('\n'), /CORS|网络/);
  assert.match(net.lines.join('\n'), /✖/);
  // HTTP 500 → 服务端错误可读
  const http = await executeWebFetchWithOptions('https://e.com/x', {
    fetchImpl: async () => new Response('boom', { status: 500 }),
  });
  assert.equal(http.ok, false);
  assert.match(http.lines.join('\n'), /HTTP 500 服务端错误/);
  assert.equal(http.error, 'fetch failed: 500');
  assert.equal(http.status, 500);
  // 404 / 401 / 403 分类
  const nf = await executeWebFetchWithOptions('https://e.com/x', { fetchImpl: async () => new Response('no', { status: 404 }) });
  assert.match(nf.lines.join('\n'), /HTTP 404 不存在/);
  const forb = await executeWebFetchWithOptions('https://e.com/x', { fetchImpl: async () => new Response('no', { status: 403 }) });
  assert.match(forb.lines.join('\n'), /HTTP 403 无权访问/);
});

test('web-fetch v2: executeWebFetch（F-23 入口）行为保持逐字节兼容', async () => {
  const r = await executeWebFetch('data:text/plain,hello%20world');
  assert.equal(r.ok, true);
  assert.equal(r.changed, false);
  assert.equal(r.lines.length, 1);
  assert.ok(r.lines[0].includes('hello world'));
  const miss = await executeWebFetch('');
  assert.equal(miss.ok, false);
  assert.match(miss.error ?? '', /--path/);
});

test('web-fetch v2: htmlToMarkdown 最小转换（标题/链接/段落）', () => {
  assert.equal(htmlToMarkdown('plain text'), 'plain text');
  const md = htmlToMarkdown('<h2>Sub</h2><p>a <b>b</b></p><script>evil()</script>');
  assert.match(md, /## Sub/);
  assert.doesNotMatch(md, /<script>/);
  assert.doesNotMatch(md, /<b>/);
});
