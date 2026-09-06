import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAiSession } from './session.js';
import type { AiSessionDeps, RunAgentInit } from './session.js';
import { createOpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import type { OpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import type { ProviderSettings } from './provider.js';
import { createMemoryAudit } from '@lgdl/web-cli-base';
import type { ChatResult, ToolResult, WebCliToolCall } from '@lgdl/web-cli-base';

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

function makeDeps(overrides: Partial<AiSessionDeps> = {}): AiSessionDeps {
  const opRegistry: OpHandlerRegistry = createOpHandlerRegistry();
  opRegistry.register('copy-source', () => ({ ok: true, output: '✓ 源码已复制到剪贴板' }));
  const settings: ProviderSettings = { providerId: 'deepseek', apiKey: 'test-key', model: 'x' };
  return {
    docId: 'main',
    getSource: () => SRC,
    onApply: () => {},
    opRegistry,
    settings: () => settings,
    ...overrides,
  };
}

/**
 * D-005 记录（矩阵派生顺序断言改写依据）：session 组装点消费 assembly 默认矩阵
 * （P0 八域工具）+ P1 扩域注册（search/dom/ask-user/todo/goal/jobs 默认开；
 * eval-js/subagent 按矩阵登记为禁用态 = 显式装载，schema 不含）后，派生顺序 =
 * 2 业务注册 + P0 域工具 + P1 默认开域工具 + 3 内建置末。改写由矩阵派生断言承接
 * （FR-039/AC-007）；F-23 既有语义用例等价保留零删除。P1 扩域只增 session 注册、
 * 不改 assembly（红线）。
 */
const FULL_NAMES = [
  // 2 业务
  'lgdl-web-cli',
  'lgdl-web-op-cli',
  // P0 域工具（assembly 矩阵）
  'storage',
  'storage-quota',
  'settings',
  'doc-read',
  'doc-edit',
  'session',
  'context',
  'web-search',
  // P1 域工具（session 扩域注册）
  'search-content',
  'list-resources',
  'dom',
  'ask-user',
  'todo',
  'goal',
  'jobs',
  'eval-js', // 登记为禁用（显式装载）
  'subagent', // 登记为禁用（显式装载）
  // 内建
  'web-fetch',
  'sleep',
  'web-cli-help',
];

/** schema 派生 = 全名 − 禁用条目（eval-js/subagent）。 */
const DERIVE_NAMES = FULL_NAMES.filter((n) => n !== 'eval-js' && n !== 'subagent');

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

test('session: schema derivation order = business + P0/P1 默认开域 + builtins（AC-006，D-005 矩阵改写）', () => {
  const session = createAiSession(makeDeps());
  assert.deepEqual(
    session.router.deriveTools().map((t) => t.name),
    DERIVE_NAMES,
  );
});

test('session: router is configured with scene default delayMs=600 (FR-015/AC-005)', () => {
  const session = createAiSession(makeDeps());
  assert.equal(session.router.delayMs, 600);
  assert.deepEqual(session.router.warnings, []);
});

test('session: assembled registry contains business + P0/P1 矩阵 + builtins（禁用条目在册；single assembly point AC-007）', () => {
  const session = createAiSession(makeDeps());
  assert.deepEqual(session.router.names(), FULL_NAMES);
  // 禁用条目：help 标注已禁用；派发报已禁用（FR-004）
  assert.ok(session.router.listHelp().includes('eval-js：页内沙箱 JS 计算（worker 执行器；untrusted 默认拒）（已禁用）'));
});

test('session: web-fetch dispatches through the router — data: URL success (承接 lgdl-web.test 例 1)', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('web-fetch', { path: 'data:text/plain,skill%20doc' }));
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, false);
  assert.ok(r.output.includes('skill doc'));
});

test('session: web-fetch without path is an explicit error (承接 lgdl-web.test 例 2)', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('web-fetch', {}));
  assert.equal(r.ok, false);
  assert.equal(r.changed, false);
  assert.match(r.error ?? '', /--path/);
});

test('session: lgdl-web-cli business tool executes through the router with ctx source', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('lgdl-web-cli', {}, 'status'), { source: SRC, docId: 'main' });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, false);
  assert.ok(r.output.includes('a -> b'));
});

test('session: lgdl-web-cli mutation returns changed+source for the scene to apply', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(
    tc('lgdl-web-cli', { id: 'c', label: 'C' }, 'add-node'),
    { source: SRC, docId: 'main' },
  );
  assert.equal(r.ok, true, r.error);
  assert.equal(r.changed, true);
  assert.ok(r.source && r.source.includes('- id: c'));
});

test('session: lgdl-web-op-cli entry forwards the injected registry handlers (FR-019)', async () => {
  const session = createAiSession(makeDeps());
  const r = await session.router.dispatch(tc('lgdl-web-op-cli', {}, 'copy-source'));
  assert.equal(r.ok, true);
  assert.equal(r.output, '✓ 源码已复制到剪贴板');
});

test('session: help listing is registration-derived and grouped (FR-010/FR-001)', async () => {
  const session = createAiSession(makeDeps());
  const list = session.router.listHelp();
  // web-cli-help 不自列 → 22 - 1 = 21
  assert.ok(list.includes('可用工具（21 个）：'));
  assert.ok(list.includes('lgdl-web-cli：图内容操作'));
  assert.ok(list.includes('lgdl-web-op-cli：UI 操作'));
  assert.ok(list.includes('storage：'));
  assert.ok(list.includes('doc-read：'));
  assert.ok(list.includes('web-fetch：'));
  assert.ok(list.includes('sleep：'));
  assert.ok(!list.includes('web-cli-help：'));
  // 多组 → 组头
  assert.ok(list.includes('[doc]'));
  assert.ok(list.includes('[storage]'));
  assert.ok(list.includes('[session]'));
  assert.ok(list.includes('[search]'));
  assert.ok(list.includes('[task]'));
  assert.ok(list.includes('[ui]'));
});

// ================= v2 组装点扩展（FR-039~042/044） =================

test('session: P0 域工具经组装点可达 — storage CRUD + doc 编辑（矩阵生效 AC-007）', async () => {
  const session = createAiSession(makeDeps());
  const w = await session.router.dispatch(tc('storage', { path: 'notes.txt', content: 'hello' }, 'write'), { source: SRC });
  assert.equal(w.ok, true, w.error);
  const r = await session.router.dispatch(tc('storage', { path: 'notes.txt' }, 'read'), { source: SRC });
  assert.equal(r.ok, true);
  assert.equal(r.output, 'hello');
  const ed = await session.router.dispatch(tc('doc-edit', { old: 'label: A', new: 'label: AA' }, 'str_replace'), { source: SRC, docId: 'main' });
  assert.equal(ed.ok, true, ed.error);
  assert.equal(ed.changed, true);
  assert.ok(ed.source?.includes('label: AA'));
});

test('session: ask 桥（policy.onAsk）fake 三路 allow/deny/超时→deny（FR-007/EC-002）', async () => {
  // allow
  const allowSession = createAiSession(makeDeps({ policy: { rules: [{ risk: 'write', action: 'ask' }], onAsk: async () => ({ action: 'allow' }) } }));
  const allowed = await allowSession.router.dispatch(tc('doc-edit', { old: 'a', new: 'b' }, 'str_replace'), { source: 'a b', docId: 'm' });
  assert.equal(allowed.ok, true, allowed.error);
  // deny
  const denySession = createAiSession(makeDeps({ policy: { rules: [{ risk: 'write', action: 'ask' }], onAsk: async () => ({ action: 'deny' }) } }));
  const denied = await denySession.router.dispatch(tc('doc-edit', { old: 'a', new: 'b' }, 'str_replace'), { source: 'a b', docId: 'm' });
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
  // 超时 → deny（onAsk 挂起不决 + askTimeoutMs）
  const timeoutSession = createAiSession(makeDeps({ policy: { rules: [{ risk: 'write', action: 'ask' }], onAsk: () => new Promise(() => {}), askTimeoutMs: 15 } }));
  const timedOut = await timeoutSession.router.dispatch(tc('doc-edit', { old: 'a', new: 'b' }, 'str_replace'), { source: 'a b', docId: 'm' });
  assert.equal(timedOut.ok, false);
  assert.match(timedOut.output, /ask 超时/);
});

test('session: web-search 条件开 — 未配置报禁用态指引；env.search 注入即全链可用（EC-006/FR-040）', async () => {
  // 未配置（无 settings.webSearch 且无 env.search）→ dispatch 报配置指引
  const unconfigured = createAiSession(makeDeps());
  const r1 = await unconfigured.router.dispatch(tc('web-search', { query: 'x' }));
  assert.equal(r1.ok, false);
  assert.match(r1.output, /未配置/);
  // env.search 注入（fake 服务）→ 全链可用
  const configured = createAiSession(
    makeDeps({
      env: {
        kind: 'node',
        search: async (q) => ({ ok: true, results: [{ title: `T:${q}`, snippet: 's', url: 'https://e.com' }] }),
      },
    }),
  );
  const r2 = await configured.router.dispatch(tc('web-search', { query: 'lgdl' }));
  assert.equal(r2.ok, true, r2.error);
  assert.match(r2.output, /T:lgdl/);
  assert.ok(r2.trust && r2.trust.level === 'untrusted');
});

// ================= TASK-012 P1 矩阵扩域断言（session 增注册；D-005 续记） =================

test('session: P1 默认开域工具经组装点可达 — todo 随会话落库 / search-content 搜 ctx 文档 / goal+job 注册在册', async () => {
  const session = createAiSession(makeDeps());
  // todo：deps.sessionId=docId('main') → 落 session store（services.session 可读回）
  const t = await session.router.dispatch(tc('todo', { text: '检查 a→b 连线' }, 'add'));
  assert.equal(t.ok, true, t.error);
  const rec = await session.services.session.load('main');
  assert.ok(Array.isArray((rec as unknown as { todos?: unknown[] }).todos));
  assert.equal((rec as unknown as { todos: Array<{ text: string }> }).todos[0].text, '检查 a→b 连线');
  const tl = await session.router.dispatch(tc('todo', {}, 'list'));
  assert.match(tl.output, /检查 a→b 连线/);
  // search-content：缺省 provider = ctx.source 文档对象（docId=main）
  const sc = await session.router.dispatch(tc('search-content', { pattern: 'label:' }), { source: SRC, docId: 'main' });
  assert.equal(sc.ok, true, sc.error);
  assert.match(sc.output, /\[doc\] 行/);
  assert.match(sc.output, /label: A/);
  // goal / jobs 在册（禁用与否见 FULL_NAMES）
  assert.ok(session.router.has('goal'));
  assert.ok(session.router.has('jobs'));
  assert.ok(session.services.jobs);
  assert.ok(session.services.goals);
});

test('session: dom/ask-user 注册在册；eval-js/subagent 登记为禁用态（FR-004 语义）', async () => {
  const session = createAiSession(makeDeps());
  assert.equal(session.router.has('dom'), true);
  assert.equal(session.router.has('ask-user'), true);
  // 禁用条目 dispatch → 已禁用（eval-js/subagent 显式装载）
  const e = await session.router.dispatch(tc('eval-js', { code: '1', trusted: 'true' }));
  assert.equal(e.ok, false);
  assert.match(e.output, /已禁用/);
  const s = await session.router.dispatch(tc('subagent', { prompt: 'x' }));
  assert.equal(s.ok, false);
  assert.match(s.output, /已禁用/);
  // dom read-state（node 面无 document）→ 可读转译错误（非权限错误）
  const d = await session.router.dispatch(tc('dom', {}, 'read-state'));
  assert.equal(d.ok, false);
  assert.doesNotMatch(d.output, /已禁用/);
});

test('session: bindPermissionAsk / bindAskUser 桥（AskDialog 场景注册入口；FR-007/FR-023）', async () => {
  const session = createAiSession(makeDeps());
  // ask-user 应答器经 bind 生效（env.askUser wrapper 委托）
  session.bindAskUser(async () => ({ ok: true, value: '选择 A' }));
  const au = await session.router.dispatch(tc('ask-user', { kind: 'choice', prompt: '选哪个？', options: 'A,B' }));
  assert.equal(au.ok, true);
  assert.equal(au.output, '用户回答：选择 A');
  // 未 bind → 取消（ok:false canceled）
  const session2 = createAiSession(makeDeps());
  const au2 = await session2.router.dispatch(tc('ask-user', { prompt: 'q' }));
  assert.equal(au2.ok, false);
  assert.match(au2.output, /取消/);
});
