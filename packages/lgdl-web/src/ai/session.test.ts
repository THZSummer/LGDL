import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAiSession, LGDL_DEFAULT_POLICY_RULES } from './session.js';
import type { AiSessionDeps, RunAgentInit } from './session.js';
import { createOpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import type { OpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import type { ProviderSettings } from './provider.js';
import { PermissionGate, createMemoryAudit } from '@lgdl/web-cli-base';
import type { AskQuestion, ChatResult, PlatformDomOps, PlatformFilePicker, PlatformWaitForOptions, ToolResult, WebCliToolCall } from '@lgdl/web-cli-base';

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
 * D-005 记录（矩阵派生顺序断言改写依据，续记 TASK-009/TASK-011）：session 组装点消费 assembly
 * 默认矩阵（P0 八域工具）+ P1 扩域注册（search/dom/ask-user/todo/goal/jobs 默认开；
 * eval-js/subagent 按矩阵登记为禁用态 = 显式装载，schema 不含）+ v3 P1 注册扩展
 * （wait/extract/export 默认开 + page-eval 登记为禁用，FR-043）+ v3 P2 接线增量
 * （TASK-011：chrome/save/notify/clipboard 默认开，FR-026~030）后，派生顺序 =
 * 2 业务注册 + P0 域工具 + P1 默认开域工具 + v3 P1 注册 + v3 P2 接线注册 + 3 内建置末。
 * 改写由矩阵派生断言承接（FR-039/AC-007）；F-23 既有语义用例等价保留零删除（tasks.md
 * §4.3 D-005：session.test 派生断言改写有据）。P1/v3-P1/v3-P2 扩域只增 session 注册、
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
  // v3 P1（TASK-009/FR-043：wait/extract/export 默认开；page-eval 禁用缺省）
  'wait',
  'extract',
  'export',
  'page-eval', // v3：evaluate 最高档默认关（场景策略显式开启，FR-043/045）
  // v3 P2（TASK-011/FR-026~030：chrome 默认开 + save/notify/clipboard 接线入矩阵默认开）
  'chrome', // chrome 5 子命令（back/forward 场景 allow 免 ask / reload·screenshot 写 ask）
  'save', // FR-029：save/download 两路径（写 ask；export 落盘链同源）
  'notify', // FR-030：默认开（授权失败转译）
  'clipboard', // FR-030：读=敏感 ask / 写=ask（App 子命令级规则表达）
  // 内建
  'web-fetch',
  'sleep',
  'web-cli-help',
];

/** 禁用条目 = schema 派生剔除集（eval-js/subagent 显式装载 + page-eval 缺省禁用）。 */
const DISABLED_NAMES = new Set(['eval-js', 'subagent', 'page-eval']);

/** schema 派生 = 全名 − 禁用条目。 */
const DERIVE_NAMES = FULL_NAMES.filter((n) => !DISABLED_NAMES.has(n));

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

test('session: schema derivation order = business + P0/P1/v3-P1 默认开域 + builtins（AC-006，D-005 矩阵改写续记）', () => {
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

test('session: assembled registry contains business + P0/P1/v3-P1 矩阵 + builtins（禁用条目在册；single assembly point AC-007）', () => {
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
  // web-cli-help 不自列 → 30 - 1 = 29（v3 P1 增 wait/extract/export/page-eval，TASK-009；
  // v3 P2 增 chrome/save/notify/clipboard，TASK-011）
  assert.ok(list.includes('可用工具（29 个）：'));
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
  assert.ok(list.includes('[collect]'));
  assert.ok(list.includes('[exec]'));
  // v3 P2（TASK-011）：chrome/net 组头（save group net / chrome group chrome）
  assert.ok(list.includes('[chrome]'));
  assert.ok(list.includes('[net]'));
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

// ================= TASK-009 v3 P1 矩阵 + IMP-4 场景断言（FR-043~045/AC-009；D-005 续记） =================

/** fake dom ops 基座（v3 P1 场景链注入；node 面无 document）。 */
function fakeDomEnv(over: Partial<PlatformDomOps>): {
  env: AiSessionDeps['env'];
  ops: PlatformDomOps;
} {
  const ops = {
    readState: async () => ({ ok: true, output: '✓ 状态：url=https://scene.test title=T' }),
    click: async () => ({ ok: true, output: '✓ 已点击' }),
    setText: async () => ({ ok: true, output: '✓ 已写入' }),
    ...over,
  } as PlatformDomOps;
  return {
    env: {
      dom: { ops, state: { snapshot: async () => ({ url: 'https://scene.test', title: 'T' }) } },
    },
    ops,
  };
}

test('session: v3 P1 矩阵三链 — wait/extract/export 启用与矩阵一致 + page-eval 禁用三链（FR-043/FR-004 语义，D-005 续记）', async () => {
  const session = createAiSession(makeDeps());
  // 注册在册（FULL_NAMES：wait/extract/export/page-eval 于 subagent 后、内建前置末）
  assert.equal(session.router.has('wait'), true);
  assert.equal(session.router.has('extract'), true);
  assert.equal(session.router.has('export'), true);
  assert.equal(session.router.has('page-eval'), true);
  // schema 派生 = 启用集：wait/extract/export 在（注册序连续）、page-eval 不在
  const derived = session.router.deriveTools().map((t) => t.name);
  const wi = derived.indexOf('wait');
  const ei = derived.indexOf('extract');
  const xi = derived.indexOf('export');
  assert.ok(wi >= 0 && ei === wi + 1 && xi === ei + 1, 'wait/extract/export 派生顺序 = 注册序（内建置末前，F-23 契约）');
  assert.equal(derived.includes('page-eval'), false);
  // help：一览含新工具一览 + page-eval（已禁用）标注
  const list = session.router.listHelp();
  assert.ok(list.includes('wait：条件等待'));
  assert.ok(list.includes('extract：声明式结构化采集'));
  assert.ok(list.includes('export：把采集缓冲导出'));
  assert.ok(list.includes('page-eval：宿主页 evaluate（F12 console 等效；untrusted 默认拒 + evaluate 最高档门禁）（已禁用）'));
  // help 详情：page-eval 附禁用说明（FR-004）；wait 详情可查
  const peHelp = session.router.helpFor('page-eval');
  assert.ok(peHelp && peHelp.includes('（该工具当前已禁用'));
  assert.ok(session.router.helpFor('wait')?.includes('wait —— 条件等待'));
  // 派发：page-eval 禁用态（schema 不含 / help 标注 / 派发报禁用 = v2 FR-004 语义三链）
  const pe = await session.router.dispatch(tc('page-eval', { code: '1+1', trusted: 'true' }));
  assert.equal(pe.ok, false);
  assert.match(pe.output, /已禁用/);
});

test('session: v3 P1 wait 经组装点可达 — 注入 fake ops.waitFor 全链（FR-025/043）', async () => {
  const waitCalls: PlatformWaitForOptions[] = [];
  const { env } = fakeDomEnv({
    waitFor: async (o) => {
      waitCalls.push(o);
      const sel = o.conditions[0]?.selector ?? '';
      return { ok: true, output: `✓ wait 命中：${sel}（匹配 1 元素）` };
    },
  });
  const session = createAiSession(makeDeps({ env }));
  const r = await session.router.dispatch(tc('wait', { kind: 'element', selector: '#app', timeout: '5000' }));
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /✓ wait 命中：#app/);
  assert.equal(waitCalls.length, 1);
  assert.deepEqual(waitCalls[0], {
    conditions: [{ kind: 'element', selector: '#app' }],
    mode: 'any',
    timeout: 5000,
    interval: 200,
  });
});

test('session: v3 P1 采集链 — extract→export 共享 CollectBuffer + filePicker 落盘（FR-040/043/ADR-006）', async () => {
  const rows: Array<Record<string, string>> = [
    { 标题: '产品A', 价格: '10' },
    { 标题: '产品B', 价格: '20' },
  ];
  const saved: Array<{ suggestedName: string; data: string | Blob }> = [];
  const picker: PlatformFilePicker = {
    save: async (o) => {
      saved.push(o);
      return { ok: true };
    },
    download: async () => {},
  };
  const { env } = fakeDomEnv({
    extractData: async () => ({ ok: true, output: JSON.stringify(rows) }),
  });
  const session = createAiSession(
    makeDeps({ env: { ...env, filePicker: picker } as AiSessionDeps['env'] }),
  );
  const ex = await session.router.dispatch(tc('extract', { kind: 'table', selector: '#data', id: 't1' }));
  assert.equal(ex.ok, true, ex.error);
  assert.match(ex.output, /已采 2 条/);
  assert.equal(ex.output.includes('标题'), false, '采集数据不进上下文（只回摘要，AC-012）');
  const out = await session.router.dispatch(tc('export', { id: 't1', format: 'json', filename: '采集.json' }));
  assert.equal(out.ok, true, out.error);
  assert.match(out.output, /已导出 buffer "t1"/);
  assert.match(out.output, /格式：json（含元数据头 meta\.source\/collectedAt\/trust，FR-042）/);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].suggestedName, '采集.json');
});

test('session: IMP-4 场景策略 — 只读子命令免 ask / ui·write 默认 ask + evaluate 缺省 deny（LGDL_DEFAULT_POLICY_RULES；AC-009 场景侧 / FR-007/045）', async () => {
  const asks: AskQuestion[] = [];
  const policy = {
    rules: LGDL_DEFAULT_POLICY_RULES,
    onAsk: async (q: AskQuestion) => {
      asks.push(q);
      return { action: 'allow' as const };
    },
  };
  const { env } = fakeDomEnv({});
  const session = createAiSession(makeDeps({ policy, env }));
  // 只读子命令（read-state，effectiveRisk 'read'）→ 规则 allow 免 ask（onAsk 零调用 = IMP-4 修复生效点）
  const rs = await session.router.dispatch(tc('dom', {}, 'read-state'));
  assert.equal(rs.ok, true, rs.error);
  assert.equal(asks.length, 0, '只读子命令不应触发 ask（IMP-4 修复）');
  // UI 副作用子命令（click，effectiveRisk 'ui'）→ 既有 {risk:'ui', action:'ask'} 命中 ask → allow
  const ck = await session.router.dispatch(tc('dom', { selector: '#a' }, 'click'));
  assert.equal(ck.ok, true, ck.error);
  assert.equal(asks.length, 1);
  assert.equal(asks[0].tool, 'dom');
  assert.equal(asks[0].subcommand, 'click');
  assert.equal(asks[0].risk, 'ui');
  // 写子命令（set-text，effectiveRisk 'write'）→ 无规则命中 → 缺省 ask → allow
  const st = await session.router.dispatch(tc('dom', { selector: '#t', text: 'x' }, 'set-text'));
  assert.equal(st.ok, true, st.error);
  assert.equal(asks.length, 2);
  assert.equal(asks[asks.length - 1].subcommand, 'set-text');
  assert.equal(asks[asks.length - 1].risk, 'write');
  // evaluate 最高档缺省 deny（FR-008/045 规则面：场景策略含 {risk:'evaluate', action:'deny'}，不静默 allow）
  const gate = new PermissionGate({ rules: LGDL_DEFAULT_POLICY_RULES });
  const ev = await gate.check({ tool: 'page-eval', risk: 'evaluate', subcommand: '' });
  assert.equal(ev.action, 'deny');
  assert.match(ev.reason, /权限被拒/);
});

// ================= TASK-011 v3 P2 矩阵增量 + chrome 规则 + AskDialog 尾项断言（FR-026~030/041；D-005 续记） =================
//
// AC-005 真实浏览器授权两路用例清单（node 注入面无法覆盖，validate 冒烟承接）：
//   ① save 授权两路：真实浏览器 save save（File System Access 对话框：确认 → ok:true 已保存；取消/拒绝 →
//      ok:false 可读「用户取消保存」会话不中断）；export → save 手势拒绝 → download 下载链自动降级（EC-012）；
//   ② clipboard roundtrip：真实浏览器 clipboard write → read roundtrip（内容一致）；读触发 ask（读=敏感面 FR-030）
//      且允许后读回内容进上下文；NotAllowedError（非手势/非安全上下文）→ 转译指引（EC-008）；
//   ③ notify 授权两路转译：真实浏览器 notify send —— 授权 granted → 系统通知展示；denied → 降级路径提示
//      （ok:true「地址栏允许通知」）；default/unsupported → requestPermission 流程 / 可读错误；

test('session: v3 P2 矩阵三链 — chrome/save/notify/clipboard 入列默认开 + page-eval 仍禁用 + save schema/help/dispatch 可查可调（FR-029/030/043）', async () => {
  const picker: PlatformFilePicker = {
    save: async () => ({ ok: true }),
    download: async () => {},
  };
  const notify = {
    permission: async () => 'granted' as const,
    requestPermission: async () => 'granted' as const,
    show: async () => true,
  };
  const clipboard = { readText: async () => '剪贴板内容', writeText: async () => {} };
  const { env: domEnv } = fakeDomEnv({
    historyNav: async () => ({ ok: true, output: '✓ 历史导航（fake）' }),
  });
  const session = createAiSession(
    makeDeps({
      env: { ...domEnv, filePicker: picker, notify, clipboard } as AiSessionDeps['env'],
    }),
  );
  // 注册在册（FULL_NAMES：chrome/save/notify/clipboard 于 page-eval 后、内建前置末）
  assert.equal(session.router.has('chrome'), true);
  assert.equal(session.router.has('save'), true);
  assert.equal(session.router.has('notify'), true);
  assert.equal(session.router.has('clipboard'), true);
  // schema 派生 = 启用集：chrome/save/notify/clipboard 在（注册序连续 = v3 P2 尾段）、page-eval 不在
  const derived = session.router.deriveTools().map((t) => t.name);
  const xi = derived.indexOf('export');
  const ci = derived.indexOf('chrome');
  const si = derived.indexOf('save');
  const ni = derived.indexOf('notify');
  const li = derived.indexOf('clipboard');
  assert.ok(ci >= 0 && ci === xi + 1 && si === ci + 1 && ni === si + 1 && li === ni + 1, 'v3 P2 四工具派生顺序 = 注册序（内建置末前）');
  assert.equal(derived.includes('page-eval'), false, 'page-eval 保持禁用缺省（FR-043/045）');
  // help：一览含 v3 P2 四工具 + 禁用标注保持（page-eval 仍标注已禁用）
  const list = session.router.listHelp();
  assert.ok(list.includes('chrome：浏览器外壳操作（print/back/forward/reload/screenshot'));
  assert.ok(list.includes('save：内容存为文件'));
  assert.ok(list.includes('notify：系统通知提醒'));
  assert.ok(list.includes('clipboard：剪贴板读写'));
  assert.ok(list.includes('page-eval：宿主页 evaluate（F12 console 等效；untrusted 默认拒 + evaluate 最高档门禁）（已禁用）'));
  // help 详情：save/chrome 可查（FR-029：schema/help/dispatch 可查可调）
  assert.ok(session.router.helpFor('save')?.includes('save —— 把内容保存为文件'));
  assert.ok(session.router.helpFor('save')?.includes('download'));
  assert.ok(session.router.helpFor('chrome')?.includes('chrome —— 浏览器外壳操作'));
  // dispatch 可调：chrome back（fake ops）/save download（filePicker）/notify send（granted）/clipboard write（fake seam）
  const cb = await session.router.dispatch(tc('chrome', {}, 'back'));
  assert.equal(cb.ok, true, cb.error);
  assert.match(cb.output, /历史导航/);
  const sv = await session.router.dispatch(tc('save', { filename: 'out.lgdl', content: 'title: t' }, 'download'));
  assert.equal(sv.ok, true, sv.error);
  assert.match(sv.output, /已触发下载 "out\.lgdl"/);
  const nf = await session.router.dispatch(tc('notify', { title: '完成' }, 'send'));
  assert.equal(nf.ok, true, nf.error);
  assert.match(nf.output, /已发送通知：完成/);
  const cl = await session.router.dispatch(tc('clipboard', { text: 'a -> b' }, 'write'));
  assert.equal(cl.ok, true, cl.error);
  assert.match(cl.output, /已写入剪贴板/);
  // page-eval 仍禁用（派发三链第三链 = v2 FR-004 语义）
  const pe = await session.router.dispatch(tc('page-eval', { code: '1', trusted: 'true' }));
  assert.equal(pe.ok, false);
  assert.match(pe.output, /已禁用/);
});

test('session: v3 P2 场景策略 — chrome back/forward 前置 allow 免 ask + reload ask + clipboard 读 ask/写 ask（EC-009/FR-030；LGDL_DEFAULT_POLICY_RULES，D-005 续记）', async () => {
  const asks: AskQuestion[] = [];
  const policy = {
    rules: LGDL_DEFAULT_POLICY_RULES,
    onAsk: async (q: AskQuestion) => {
      asks.push(q);
      return { action: 'allow' as const };
    },
  };
  const { env: domEnv } = fakeDomEnv({
    historyNav: async (delta: number) => ({ ok: true, output: `✓ 会话内导航（delta ${delta}）` }),
    reloadPage: async () => ({ ok: true, output: '✓ 已刷新页面' }),
  });
  const session = createAiSession(
    makeDeps({
      policy,
      env: {
        ...domEnv,
        clipboard: { readText: async () => '剪贴板内容', writeText: async () => {} },
      } as AiSessionDeps['env'],
    }),
  );
  // chrome back/forward：规则 {pattern:'chrome', subcommand:'back'/'forward', action:'allow'}
  // 前置命中 → 免 ask（onAsk 零调用 = EC-009 会话内导航不触发 ask）
  const back = await session.router.dispatch(tc('chrome', {}, 'back'));
  assert.equal(back.ok, true, back.error);
  const fwd = await session.router.dispatch(tc('chrome', {}, 'forward'));
  assert.equal(fwd.ok, true, fwd.error);
  assert.equal(asks.length, 0, 'chrome back/forward 免 ask（前置 allow 规则，EC-009）');
  // chrome reload：subcommandRisks reload→'write'，无规则命中 → 缺省 ask → allow 后执行
  const rl = await session.router.dispatch(tc('chrome', {}, 'reload'));
  assert.equal(rl.ok, true, rl.error);
  assert.equal(asks.length, 1);
  assert.equal(asks[0].tool, 'chrome');
  assert.equal(asks[0].subcommand, 'reload');
  assert.equal(asks[0].risk, 'write');
  // clipboard read：子命令级 ask 规则命中（读=敏感面，FR-030）→ ask → allow 后读取
  const cr = await session.router.dispatch(tc('clipboard', {}, 'read'));
  assert.equal(cr.ok, true, cr.error);
  assert.equal(asks.length, 2);
  assert.equal(asks[1].tool, 'clipboard');
  assert.equal(asks[1].subcommand, 'read');
  // clipboard write：子命令级 ask 规则命中（写=ask，FR-030）→ ask → allow 后写入
  const cw = await session.router.dispatch(tc('clipboard', { text: 'x' }, 'write'));
  assert.equal(cw.ok, true, cw.error);
  assert.equal(asks.length, 3);
  assert.equal(asks[2].tool, 'clipboard');
  assert.equal(asks[2].subcommand, 'write');
  // 规则面直接断言：clipboard 读/写命中显式 ask 规则（LGDL_DEFAULT_POLICY_RULES 单源；
  // gate 无 onAsk 桥时 ask → deny fail-closed，故注入记录桥验证 ask 已触发 = 规则面命中）
  const ruleAsks: AskQuestion[] = [];
  const gate = new PermissionGate({ rules: LGDL_DEFAULT_POLICY_RULES });
  const rd = await gate.check({ tool: 'clipboard', risk: 'ui', subcommand: 'read' }, {
    onAsk: async (q) => {
      ruleAsks.push(q);
      return { action: 'allow' as const };
    },
  });
  assert.equal(rd.action, 'allow');
  assert.equal(ruleAsks.length, 1, 'clipboard read 命中规则 ask（读=敏感面）');
  const wr = await gate.check({ tool: 'clipboard', risk: 'ui', subcommand: 'write' }, {
    onAsk: async (q) => {
      ruleAsks.push(q);
      return { action: 'allow' as const };
    },
  });
  assert.equal(wr.action, 'allow');
  assert.equal(ruleAsks.length, 2, 'clipboard write 命中规则 ask（写=ask）');
});

test('session: FR-041 矩阵链路断言 — export .xlsx 入参 → 不支持 + csv 替代指引（数据保留可重导）', async () => {
  const rows: Array<Record<string, string>> = [{ 标题: '产品A', 价格: '10' }];
  const saved: Array<{ suggestedName: string; data: string | Blob }> = [];
  const picker: PlatformFilePicker = {
    save: async (o) => {
      saved.push(o);
      return { ok: true };
    },
    download: async () => {},
  };
  const { env: domEnv } = fakeDomEnv({
    extractData: async () => ({ ok: true, output: JSON.stringify(rows) }),
  });
  const session = createAiSession(
    makeDeps({ env: { ...domEnv, filePicker: picker } as AiSessionDeps['env'] }),
  );
  // extract 入 buffer（矩阵链路：extract 已采 → export 落盘链同源 save/filePicker）
  const ex = await session.router.dispatch(tc('extract', { kind: 'table', selector: '#data', id: 'xl' }));
  assert.equal(ex.ok, true, ex.error);
  // .xlsx 入参 → 可读不支持 + csv 替代指引（FR-041/NG-005；xlsx 校验先于落盘 → 不触发 filePicker）
  const x = await session.router.dispatch(tc('export', { id: 'xl', format: 'xlsx', filename: 'out.xlsx' }));
  assert.equal(x.ok, false);
  assert.match(x.output, /xlsx 缺省不支持/);
  assert.match(x.output, /csv/);
  assert.equal(saved.length, 0, 'xlsx 不支持面不应触达落盘');
  // csv 替代路径 → 落盘成功（数据保留可重导 = EC-012 不丢数据）
  const c = await session.router.dispatch(tc('export', { id: 'xl', format: 'csv', filename: '数据.csv' }));
  assert.equal(c.ok, true, c.error);
  assert.match(c.output, /已导出 buffer "xl" → 数据\.csv/);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].suggestedName, '数据.csv');
});
