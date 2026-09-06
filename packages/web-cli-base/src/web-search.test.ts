import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWebSearchToolEntry, executeWebSearch, WEB_SEARCH_CONFIG_GUIDE } from './web-search.js';
import type { PlatformEnv, WebSearchOutcome } from './platform.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';
import { nodeEnv } from './platform.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

const okOutcome = (over: Partial<WebSearchOutcome> = {}): WebSearchOutcome => ({
  ok: true,
  results: [
    { title: 'LGDL 文档', snippet: 'LGDL 是一种图表语言…', url: 'https://example.com/lgdl' },
    { title: 'web-cli-base', snippet: '浏览器 AI-CLI 框架…', url: 'https://example.com/wcb' },
  ],
  ...over,
});

const searchEnv = (impl: (q: string) => Promise<WebSearchOutcome>): PlatformEnv => ({
  ...nodeEnv(),
  search: impl,
});

test('web-search: 假搜索服务成功全链 — 结果列表含标题/摘要/来源 + untrusted 标记', async () => {
  let asked = '';
  const env = searchEnv(async (q) => {
    asked = q;
    return okOutcome();
  });
  const r = await executeWebSearch(env.search, 'LGDL 是什么');
  assert.equal(r.ok, true, r.error);
  assert.equal(asked, 'LGDL 是什么');
  assert.match(r.output, /搜索结果（2 条）：/);
  assert.match(r.output, /1\. LGDL 文档/);
  assert.match(r.output, /来源: https:\/\/example\.com\/lgdl/);
  assert.match(r.output, /untrusted/);
  // ToolResult.trust 标记（FR-010：来源/时间/可信级）
  assert.ok(r.trust);
  assert.equal(r.trust.level, 'untrusted');
  assert.match(r.trust.source, /web-search/);
});

test('web-search: 空结果 / 失败 / 鉴权错 / 缺参', async () => {
  const empty = await executeWebSearch(searchEnv(async () => okOutcome({ results: [] })).search, 'qq');
  assert.equal(empty.ok, true);
  assert.match(empty.output, /未找到相关结果/);
  const failed = await executeWebSearch(searchEnv(async () => ({ ok: false, results: [], error: '服务不可达' })).search, 'q');
  assert.equal(failed.ok, false);
  assert.match(failed.output, /服务不可达/);
  const auth = await executeWebSearch(searchEnv(async () => ({ ok: false, results: [], error: 'HTTP 401 鉴权失败：API Key 无效' })).search, 'q');
  assert.equal(auth.ok, false);
  assert.match(auth.output, /401/);
  const noQuery = await executeWebSearch(searchEnv(async () => okOutcome()).search, '');
  assert.equal(noQuery.ok, false);
  assert.match(noQuery.output, /--query/);
});

test('web-search: EC-006 未配置 → 禁用态 + 配置指引（不影响其他工具）', async () => {
  const env = nodeEnv(); // 无 search
  const r = await executeWebSearch(env.search, 'x');
  assert.equal(r.ok, false);
  assert.match(r.output, /未配置/);
  assert.equal(r.output, WEB_SEARCH_CONFIG_GUIDE);
  assert.ok(!env.search);
});

test('web-search: ToolEntry 注册语义 — 未配置静态声明 enabled:false → schema 不含/help 标注/dispatch 已禁用（FR-004）', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register(createWebSearchToolEntry(nodeEnv(), { enabled: false }));
  // schema 派生不含
  assert.deepEqual(router.deriveTools().map((t) => t.name), []);
  // help 一览标注已禁用
  assert.ok(router.listHelp().includes('（已禁用）'));
  const d = await router.dispatch(tc('web-search', { query: 'x' }));
  assert.equal(d.ok, false);
  assert.match(d.output, /已禁用/);
  // 其他工具不受影响
  router.register({
    name: 'other',
    schema: { name: 'other', description: '', parameters: {} },
    executor: async () => ({ ok: true, output: 'fine' }),
  });
  const other = await router.dispatch(tc('other'));
  assert.equal(other.ok, true);
});

test('web-search: 已配置时经 router 派发全链 + 元数据', async () => {
  const router = createCommandRouter({ builtins: false });
  const env = searchEnv(async () => okOutcome());
  router.register(createWebSearchToolEntry(env)); // enabled 缺省 true
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['web-search']);
  const r = await router.dispatch(tc('web-search', { query: 'lgdl' }));
  assert.equal(r.ok, true);
  assert.match(r.output, /LGDL 文档/);
  const entry = router.query({ name: 'web-search' })[0];
  assert.equal(entry.group, 'net');
  assert.equal(entry.risk, 'external');
});
