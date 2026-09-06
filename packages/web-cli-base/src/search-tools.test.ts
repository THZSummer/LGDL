import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSearchTools, createSearchContentToolEntry, createListResourcesToolEntry, listResourcesHelp } from './search-tools.js';
import type { SearchResourceProvider, SearchResourceMeta } from './search-tools.js';
import { createCommandRouter } from './router.js';
import type { ToolContext } from './router.js';
import type { WebCliToolCall } from './llm.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

/** 注入的小内容集（doc 文档对象 / volume 卷条目 / session 会话记录）。 */
function makeProvider(content: Record<string, string>): { provider: SearchResourceProvider; metas: SearchResourceMeta[] } {
  const metas: SearchResourceMeta[] = Object.entries(content).map(([id]) => {
    const kind = id.startsWith('v:') ? ('volume' as const) : id.startsWith('s:') ? ('session' as const) : ('doc' as const);
    const label = kind === 'volume' ? '卷条目' : kind === 'session' ? '会话记录' : '文档对象';
    return { id, kind, label };
  });
  const provider: SearchResourceProvider = {
    list: () => metas,
    read: async (meta) => content[meta.id] ?? null,
  };
  return { provider, metas };
}

test('search-content: 注入小内容集命中 — 含资源/行号/列（上下文行与位置）', async () => {
  const { provider } = makeProvider({
    'v:guide': 'title: 指南\n# 用法\nstorage write --path a',
    doc: 'nodes:\n  - id: a\n    label: A\n  - id: b\n    label: B',
    's:conv': 'user: 帮我搜索 storage',
  });
  const tools = createSearchContentToolEntry({ provider });
  const r = await execute(tools, { pattern: 'label:' }, {});
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /命中 2 处/);
  assert.match(r.output, /- doc \[doc\] 行 3 列/);
  assert.match(r.output, /label: A/);
  assert.match(r.output, /- doc \[doc\] 行 5 列/);
  // kind 过滤
  const r2 = await execute(tools, { pattern: 'storage', kind: 'volume' }, {});
  assert.match(r2.output, /v:guide \[volume\]/);
  const r3 = await execute(tools, { pattern: 'storage', kind: 'doc' }, {});
  assert.match(r3.output, /（未命中/);
  // resource 过滤
  const r4 = await execute(tools, { pattern: '帮我', resource: 's:conv' }, {});
  assert.match(r4.output, /s:conv \[session\] 行 1 列/);
});

async function execute(entry: ReturnType<typeof createSearchContentToolEntry>, args: Record<string, string>, ctx: ToolContext) {
  // 直接经 executor（无 subcommand 语义，search-content 为单命令工具）
  return entry.executor({ subcommand: '', args }, ctx);
}

test('search-content: 无索引退化线性扫描 — 两次查询结果一致 + regex/大小写选项', async () => {
  const { provider } = makeProvider({ a: 'Hello World\nfoo bar', b: 'hello there\nworld end' });
  const entry = createSearchContentToolEntry({ provider });
  const once = await execute(entry, { pattern: 'hello' }, {});
  const twice = await execute(entry, { pattern: 'hello' }, {});
  assert.equal(once.output, twice.output); // 线性扫描结果一致
  assert.match(once.output, /命中 1 处/); // 大小写敏感：仅 b 行 1 命中
  // 大小写敏感缺省
  const cs = await execute(entry, { pattern: 'Hello' }, {});
  assert.match(cs.output, /命中 1 处/);
  assert.match(cs.output, /a \[doc\] 行 1 列 1/);
  const ci = await execute(entry, { pattern: 'hello', caseInsensitive: 'true' }, {});
  assert.match(ci.output, /命中 2 处/); // a 行1(Hello) + b 行1(hello)
  // regex 匹配 + 非法正则错误
  const re = await execute(entry, { pattern: '^world', regex: 'true' }, {});
  assert.match(re.output, /world end/);
  const bad = await execute(entry, { pattern: '([', regex: 'true' }, {});
  assert.equal(bad.ok, false);
  assert.match(bad.output, /非法正则/);
});

test('search-content: 预算护栏（EC-011）— maxBytes 截断标注 / maxHits 上限', async () => {
  const { provider } = makeProvider({ big: `${'x'.repeat(500)}\nneedle here` });
  const entry = createSearchContentToolEntry({ provider });
  // 预算小 → 未扫描到命中且标注（扫描被预算截断）
  const r1 = await execute(entry, { pattern: 'needle', maxBytes: '200' }, {});
  assert.equal(r1.ok, true);
  assert.match(r1.output, /未命中 "needle"/);
  assert.match(r1.output, /预算达上限/);
  // 预算足够 → 命中
  const r2 = await execute(entry, { pattern: 'needle' }, {});
  assert.match(r2.output, /big \[doc\] 行 2 列/);
  // maxHits 命中上限
  const { provider: p2 } = makeProvider({ m: 'z1\nz2\nz3\nz4\nz5\nz6' });
  const e2 = createSearchContentToolEntry({ provider: p2 });
  const r3 = await execute(e2, { pattern: 'z', maxHits: '3' }, {});
  assert.equal(r3.ok, true);
  assert.match(r3.output, /命中 3 处/);
});

test('search-content: 缺 pattern / 无内容集 错误', async () => {
  const entry = createSearchContentToolEntry({ provider: { list: () => [], read: async () => null } });
  const noPattern = await execute(entry, {}, {});
  assert.equal(noPattern.ok, false);
  assert.match(noPattern.output, /--pattern/);
  const noRes = await execute(entry, { pattern: 'x' }, {});
  assert.equal(noRes.ok, false);
  assert.match(noRes.output, /无可搜索内容集/);
  // 无 provider：ctx.source 作为默认文档对象可搜
  const bare = createSearchContentToolEntry();
  const r = await bare.executor({ subcommand: '', args: { pattern: 'label' } }, { source: 'nodes:\n  label: hi' });
  assert.equal(r.ok, true);
  assert.match(r.output, /current \[doc\] 行 2 列/);
});

test('list-resources: 资源目录（与 web-cli-help 工具目录语义区分）', async () => {
  const { provider, metas } = makeProvider({ doc: 'x', 'v:data': 'y', 's:hist': 'z' });
  const entry = createListResourcesToolEntry({ provider });
  const r = await entry.executor({ subcommand: '', args: {} }, {});
  assert.equal(r.ok, true);
  assert.match(r.output, /可及资源（3 个）/);
  assert.match(r.output, /- doc（doc）文档对象/);
  assert.match(r.output, /- v:data（volume）卷条目/);
  assert.match(r.output, /- s:hist（session）会话记录/);
  // help 明确与工具目录区分（FR-017）
  assert.match(listResourcesHelp(), /web-cli-help/);
  assert.match(listResourcesHelp(), /资源/);
  // 空资源
  const empty = createListResourcesToolEntry({ provider: { list: () => [], read: async () => null } });
  const rEmpty = await empty.executor({ subcommand: '', args: {} }, {});
  assert.match(rEmpty.output, /无可及资源/);
  assert.ok(metas.length === 3);
});

test('search-tools: ToolEntry 元数据 + 经 CommandRouter 注册派发（search 组）', async () => {
  const { provider } = makeProvider({ doc: 'label: X' });
  const router = createCommandRouter({ builtins: false });
  for (const e of createSearchTools({ provider })) router.register(e);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['search-content', 'list-resources']);
  const r = await router.dispatch(tc('search-content', { pattern: 'label:' }));
  assert.equal(r.ok, true);
  assert.match(r.output, /doc \[doc\]/);
  const lr = await router.dispatch(tc('list-resources'));
  assert.match(lr.output, /doc（doc）/);
  const entry = router.query({ name: 'search-content' })[0];
  assert.equal(entry.group, 'search');
  assert.equal(entry.risk, 'read');
});
