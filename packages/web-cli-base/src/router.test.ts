import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommandRouter } from './router.js';
import type { ToolEntry } from './router.js';
import type { Clock } from './delay.js';
import type { WebCliToolCall } from './llm.js';
import { createMemoryAudit } from './audit.js';

/** 记账型 fake clock（同步记账 + 手动推进，零真实等待）。 */
function makeFakeClock() {
  let t = 0;
  const waits: number[] = [];
  const clock: Clock = {
    now: () => t,
    sleep: async (ms) => {
      waits.push(ms);
      t += ms;
    },
  };
  return {
    clock,
    advance: (ms: number) => {
      t += ms;
    },
    waits,
    now: () => t,
  };
}

function makeTool(name: string, opts: Partial<ToolEntry> = {}): ToolEntry {
  return {
    name,
    schema: { name, description: `${name} description`, parameters: {} },
    executor: async () => ({ ok: true, output: `${name}:ok` }),
    ...opts,
  };
}

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

// ---- FR-020 / EC-004 / AC-001：内建自动注册 + 空业务集合自足 ----

test('router: fresh instance auto-registers the 3 builtins (FR-020)', () => {
  const router = createCommandRouter();
  for (const n of ['web-fetch', 'sleep', 'web-cli-help']) assert.equal(router.has(n), true);
  assert.deepEqual(router.names(), ['web-fetch', 'sleep', 'web-cli-help']);
});

test('router: empty-business self-sufficiency — fetch/sleep/help dispatch smoke (AC-001/EC-004)', async () => {
  const router = createCommandRouter();
  // web-fetch 冒烟：data: URL 成功
  const f = await router.dispatch(tc('web-fetch', { path: 'data:text/plain,hello%20world' }));
  assert.equal(f.ok, true, f.error);
  assert.ok(f.output.includes('hello world'));
  // sleep 冒烟：短等待执行（delay 0 关闭下无前置等待）
  const s = await router.dispatch(tc('sleep', { ms: '1' }));
  assert.equal(s.ok, true);
  assert.ok(s.output.includes('已等待 1ms'));
  // web-cli-help 冒烟：一览只含内建（web-cli-help 不自列 → 2 个）
  const h = await router.dispatch(tc('web-cli-help', {}));
  assert.equal(h.ok, true);
  assert.ok(h.output.includes('可用工具（2 个）'));
  assert.ok(h.output.includes('web-fetch'));
  assert.ok(h.output.includes('sleep'));
  // 一览 tip 中性（FR-012）：不含 lgdl-web-cli 示例
  assert.ok(!h.output.includes('lgdl-web-cli'));
  // helpFor 自查 web-cli-help → null（EC-010）
  assert.equal(router.helpFor('web-cli-help'), null);
  // 未注册业务名 → EC-001 显式报错
  const u = await router.dispatch(tc('lgdl-web-cli'));
  assert.equal(u.ok, false);
  assert.match(u.output, /未注册工具 "lgdl-web-cli"/);
  assert.equal(u.error, 'unregistered tool');
});

test('router: builtins option controls registration', () => {
  assert.deepEqual(createCommandRouter({ builtins: false }).names(), []);
  assert.deepEqual(createCommandRouter({ builtins: ['web-fetch'] }).names(), ['web-fetch']);
});

// ---- FR-001 / EC-003 / FR-021：注册与重复 ----

test('router: register makes tool visible in names/has (FR-001)', () => {
  const router = createCommandRouter({ builtins: false });
  router.register(makeTool('alpha')).register(makeTool('beta'));
  assert.deepEqual(router.names(), ['alpha', 'beta']);
  assert.equal(router.has('alpha'), true);
  assert.equal(router.has('beta'), true);
  assert.equal(router.has('nope'), false);
});

test('router: duplicate registration of the same name throws (EC-003)', () => {
  const router = createCommandRouter({ builtins: false });
  router.register(makeTool('dup'));
  assert.throws(() => router.register(makeTool('dup')), /已注册/);
  // 与内建同名也拒绝（唯一工具名集合 FR-021）
  const r2 = createCommandRouter();
  assert.throws(() => r2.register(makeTool('web-fetch')), /已注册/);
});

// ---- FR-002/FR-003/EC-001/EC-012：dispatch 语义 ----

test('router: dispatch routes to the registered executor', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register({
    name: 'echo',
    schema: { name: 'echo', description: '', parameters: {} },
    executor: async (t, ctx) => ({
      ok: true,
      output: `echo:${t.subcommand}:${t.args.k ?? ''}:${(ctx.source ?? '').slice(0, 3)}`,
    }),
  });
  const r = await router.dispatch(tc('echo', { k: 'v' }, 'go'), { source: 'abc' });
  assert.deepEqual(r, { ok: true, output: 'echo:go:v:abc' });
});

test('router: unregistered name → explicit error, never reaches any executor (FR-003/EC-001)', async () => {
  const router = createCommandRouter({ builtins: false });
  let executed = false;
  router.register({ name: 'real', schema: { name: 'real', description: '', parameters: {} }, executor: async () => { executed = true; return { ok: true, output: 'x' }; } });
  const r = await router.dispatch(tc('unknown-tool'));
  assert.equal(r.ok, false);
  assert.equal(r.output, '✖ 未注册工具 "unknown-tool"');
  assert.equal(r.error, 'unregistered tool');
  assert.equal(executed, false);
});

test('router: executor exception → ok:false + stable copy, detail only in error (EC-012)', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register({ name: 'boom', schema: { name: 'boom', description: '', parameters: {} }, executor: async () => { throw new Error('internal boom detail'); } });
  const r = await router.dispatch(tc('boom'));
  assert.equal(r.ok, false);
  assert.equal(r.output, '✖ 工具 "boom" 执行异常');
  assert.equal(r.error, 'internal boom detail');
});

test('router: executor-level ok:false passes through unchanged (EC-002)', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register({ name: 'bad', schema: { name: 'bad', description: '', parameters: {} }, executor: async () => ({ ok: false, output: '✖ 子命令参数非法', error: 'invalid args' }) });
  const r = await router.dispatch(tc('bad'));
  assert.equal(r.ok, false);
  assert.equal(r.output, '✖ 子命令参数非法');
  assert.equal(r.error, 'invalid args');
});

// ---- FR-004/FR-005/FR-007/AC-006：派生 ----

test('router: deriveTools order = business(reg order) + builtins last, idempotent (FR-005/AC-006)', () => {
  const router = createCommandRouter();
  router.register(makeTool('biz-1')).register(makeTool('biz-2'));
  const tools = router.deriveTools();
  assert.deepEqual(tools.map((t) => t.name), ['biz-1', 'biz-2', 'web-fetch', 'sleep', 'web-cli-help']);
  for (const t of tools) {
    assert.ok(t.description.length > 0);
    assert.ok(t.parameters);
  }
  // 幂等（NFR-006）
  assert.deepEqual(router.deriveTools(), tools);
});

test('router: deriveCommand builds prefix + subcommand + args quoting; unknown → null (FR-007)', () => {
  const router = createCommandRouter({ builtins: false });
  router.register({ name: 'demo', schema: { name: 'demo', description: '', parameters: {} }, executor: async () => ({ ok: true, output: '' }) });
  // 无子命令仅前缀
  assert.equal(router.deriveCommand(tc('demo')), 'demo');
  // 子命令 + 无空白参数
  assert.equal(router.deriveCommand(tc('demo', { id: 'x', label: 'y' }, 'run')), 'demo run --id x --label y');
  // 含空白 → 引号包裹（逐字节规则）
  assert.equal(router.deriveCommand(tc('demo', { q: 'hello world' }, 'find')), 'demo find --q "hello world"');
  // 含引号也触发引号包裹（逐字节：不转义内嵌引号）
  assert.equal(router.deriveCommand(tc('demo', { q: 'a"b' }, 'find')), 'demo find --q "a"b"');
  // prefix 覆盖
  router.register({ name: 'prefixed', prefix: 'pfx', schema: { name: 'prefixed', description: '', parameters: {} }, executor: async () => ({ ok: true, output: '' }) });
  assert.equal(router.deriveCommand(tc('prefixed', { a: '1' }, 'sub')), 'pfx sub --a 1');
  // 未知名 → null
  assert.equal(router.deriveCommand(tc('nope')), null);
});

// ---- FR-010/EC-010/AC-003：help 派生 + 单一数据源四链 ----

test('router: listHelp / helpFor are registration-derived (FR-010/AC-003)', async () => {
  const router = createCommandRouter();
  router.register(makeTool('lgdl-web-cli', { summary: '图内容操作（读 status/查询，写 增删改节点边分组）', help: () => 'lgdl-web-cli detail text' }));
  router.register(makeTool('lgdl-web-op-cli', { summary: 'UI 操作（复制/导出/缩放/定位/全屏/推荐下一步）', help: () => 'lgdl-web-op-cli detail text' }));
  const list = router.listHelp();
  // 一览：内建先、业务后，web-cli-help 不自列（4 工具）
  assert.ok(list.includes('可用工具（4 个）：'));
  assert.ok(list.indexOf('web-fetch') < list.indexOf('lgdl-web-cli'));
  assert.ok(list.includes('lgdl-web-cli：图内容操作（读 status/查询，写 增删改节点边分组）'));
  assert.ok(!list.includes('web-cli-help：'));
  // 详情
  const d = router.helpFor('lgdl-web-cli');
  assert.ok(d?.includes('lgdl-web-cli —— 图内容操作（读 status/查询，写 增删改节点边分组）'));
  assert.ok(d?.includes('lgdl-web-cli detail text'));
  // 未注册 / 未列 → null
  assert.equal(router.helpFor('nope'), null);
  assert.equal(router.helpFor('web-cli-help'), null);
  // web-cli-help dispatch：无参一览 / 带 tool 详情 / 未知 tool 文案（EC-010）
  const all = await router.dispatch(tc('web-cli-help', {}));
  assert.ok(all.output.includes('可用工具（4 个）：'));
  const one = await router.dispatch(tc('web-cli-help', { tool: 'lgdl-web-cli' }));
  assert.ok(one.output.includes('lgdl-web-cli —— 图内容操作'));
  const unknown = await router.dispatch(tc('web-cli-help', { tool: 'ghost' }));
  assert.ok(unknown.output.includes('✖ 未知工具 "ghost"'));
});

test('router: registering a fake tool lights up all four chains from one place (NFR-004/AC-003)', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register({
    name: 'fake-adder',
    summary: '加法计算器',
    schema: { name: 'fake-adder', description: 'Add two numbers.', parameters: { type: 'object' } },
    executor: async (t) => {
      const sum = Number(t.args.a ?? 0) + Number(t.args.b ?? 0);
      return { ok: true, output: `= ${sum}` };
    },
  });
  // 链 1 schema 派生
  assert.deepEqual(router.deriveTools().map((x) => x.name), ['fake-adder']);
  // 链 2 help 一览
  assert.ok(router.listHelp().includes('fake-adder：加法计算器'));
  assert.ok(router.helpFor('fake-adder')?.includes('加法计算器'));
  // 链 3 dispatch
  const r = await router.dispatch(tc('fake-adder', { a: '1', b: '2' }));
  assert.equal(r.ok, true);
  assert.equal(r.output, '= 3');
  // 链 4 前缀派生
  assert.equal(router.deriveCommand(tc('fake-adder', { a: '1' }, 'calc')), 'fake-adder calc --a 1');
});

// ---- FR-013/FR-016/EC-005/EC-009：delay 接线 ----

test('router: global delayMs gates business dispatches via injected clock (FR-013)', async () => {
  const fake = makeFakeClock();
  const delays: Array<{ ms: number; tool: string }> = [];
  const router = createCommandRouter({ delayMs: 600, clock: fake.clock, builtins: false, onDelay: (ms, tool) => delays.push({ ms, tool }) });
  router.register({ name: 'slowish', schema: { name: 'slowish', description: '', parameters: {} }, executor: async () => { fake.advance(250); return { ok: true, output: 'done' }; } });
  await router.dispatch(tc('slowish'));
  assert.deepEqual(fake.waits, []); // 首个分发不等待
  await router.dispatch(tc('slowish'));
  assert.deepEqual(fake.waits, [350]); // 补齐至距上一命令起点 600
  assert.deepEqual(delays, [{ ms: 350, tool: 'slowish' }]);
  assert.deepEqual(router.stats, { waitCount: 1, waitedMs: 350 });
});

test('router: entry delayMs:0 exemption implements sleep-like non-stacking (EC-005/ADR-003)', async () => {
  const fake = makeFakeClock();
  const router = createCommandRouter({ delayMs: 600, clock: fake.clock, builtins: false });
  router.register({ name: 'fast', schema: { name: 'fast', description: '', parameters: {} }, executor: async () => ({ ok: true, output: 'f' }) });
  // 模拟 sleep：delayMs:0 免除 + 自身执行耗时（长等待 3000）
  router.register({ name: 'sleepy', delayMs: 0, schema: { name: 'sleepy', description: '', parameters: {} }, executor: async () => { fake.advance(3000); return { ok: true, output: 'slept' }; } });
  router.register({ name: 'after', schema: { name: 'after', description: '', parameters: {} }, executor: async () => ({ ok: true, output: 'a' }) });
  await router.dispatch(tc('fast'));
  await router.dispatch(tc('sleepy')); // 免除：不等待
  assert.deepEqual(fake.waits, []);
  await router.dispatch(tc('after')); // 距 fast 起点已 3000ms ≥ 600 → 不追加
  assert.deepEqual(fake.waits, []);
});

test('router: short exempt sleep is padded up to the interval (EC-005)', async () => {
  const fake = makeFakeClock();
  const router = createCommandRouter({ delayMs: 600, clock: fake.clock, builtins: false });
  router.register({ name: 'fast', schema: { name: 'fast', description: '', parameters: {} }, executor: async () => ({ ok: true, output: 'f' }) });
  router.register({ name: 'sleepy', delayMs: 0, schema: { name: 'sleepy', description: '', parameters: {} }, executor: async () => { fake.advance(200); return { ok: true, output: 'slept' }; } });
  router.register({ name: 'after', schema: { name: 'after', description: '', parameters: {} }, executor: async () => ({ ok: true, output: 'a' }) });
  await router.dispatch(tc('fast'));
  await router.dispatch(tc('sleepy'));
  assert.deepEqual(fake.waits, []);
  await router.dispatch(tc('after')); // 200 < 600 → 补齐 400
  assert.deepEqual(fake.waits, [400]);
});

test('router: unregistered dispatch does not pass through the delay gate', async () => {
  const fake = makeFakeClock();
  const router = createCommandRouter({ delayMs: 600, clock: fake.clock, builtins: false });
  router.register({ name: 'x', schema: { name: 'x', description: '', parameters: {} }, executor: async () => ({ ok: true, output: 'x' }) });
  await router.dispatch(tc('x'));
  await router.dispatch(tc('x'));
  assert.deepEqual(fake.waits, [600]); // 两次快速 gated 分发
  const before = router.stats.waitedMs;
  await router.dispatch(tc('not-registered'));
  assert.equal(router.stats.waitedMs, before); // 未注册名不触发等待
});

test('router: illegal delayMs config clamps + warns once (EC-009)', () => {
  const warnCalls: unknown[] = [];
  const origWarn = console.warn;
  console.warn = (...a: unknown[]) => { warnCalls.push(a); };
  try {
    const big = createCommandRouter({ delayMs: 99999 });
    assert.equal(big.delayMs, 5000);
    const neg = createCommandRouter({ delayMs: -10 });
    assert.equal(neg.delayMs, 0);
    assert.equal(big.warnings.length, 1);
    assert.match(big.warnings[0], /钳制为 5000/);
    assert.equal(neg.warnings.length, 1);
    assert.equal(warnCalls.length, 2);
    // 合法值不告警
    const ok = createCommandRouter({ delayMs: 600 });
    assert.equal(ok.delayMs, 600);
    assert.equal(ok.warnings.length, 0);
  } finally {
    console.warn = origWarn;
  }
});

// ================= v2 注册表（FR-001~004/038/043，additive；F-23 既有用例零回归） =================

test('router v2: ToolEntry 追加字段缺省 = 旧行为逐字节一致（FR-043 additive）', () => {
  const router = createCommandRouter();
  router.register(makeTool('biz-1')).register(makeTool('biz-2'));
  // 未声明 namespace/group/enabled/risk 的条目派生顺序与 F-23 完全一致
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['biz-1', 'biz-2', 'web-fetch', 'sleep', 'web-cli-help']);
  assert.deepEqual(router.names(), ['biz-1', 'biz-2', 'web-fetch', 'sleep', 'web-cli-help']);
});

test('router v2: 命名空间共存 — 注册键=全限定名，schema/dispatch/help 三链一致（FR-002）', async () => {
  const router = createCommandRouter({ builtins: false });
  const mkNs = (name: string, ns: string | undefined, out: string): ToolEntry => ({
    name,
    ...(ns ? { namespace: ns } : {}),
    schema: { name, description: `${name} description`, parameters: {} },
    executor: async () => ({ ok: true, output: out }),
  });
  router.register(mkNs('search', 'skill', 'skill-search-exec'));
  router.register(mkNs('search', undefined, 'top-search-exec')); // 同基名不同 ns 共存
  // 派生顺序：命名空间首次注册序（skill 先注册 → skill 组先）
  assert.deepEqual(router.names(), ['skill.search', 'search']);
  // 三链 1 schema（schema function name 语义 = 全限定名）
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['skill.search', 'search']);
  // 三链 2 dispatch（按全限定名分别派发到各自执行器）
  const viaNs = await router.dispatch(tc('skill.search'));
  assert.equal(viaNs.ok, true);
  assert.equal(viaNs.output, 'skill-search-exec');
  const viaTop = await router.dispatch(tc('search'));
  assert.equal(viaTop.output, 'top-search-exec');
  // 三链 3 help 查询键（全限定名）
  assert.ok(router.helpFor('skill.search')?.includes('skill.search ——'));
  assert.ok(router.helpFor('search')?.includes('search ——'));
  // 文本前缀 = 全限定名（可逆解析回 {namespace, name}）
  assert.equal(router.deriveCommand(tc('skill.search', { q: 'x' }, 'query')), 'skill.search query --q x');
});

test('router v2: 动态源注册/卸载 — 全流程入审计 + 卸载三链即时消失（FR-003/FR-038）', async () => {
  const audit = createMemoryAudit();
  const router = createCommandRouter({ builtins: false, audit });
  router.register({ ...makeTool('greet'), namespace: 'skill' }, { source: 'skill:hello' });
  // 注册审计
  const reg = audit.events.find((e) => e.type === 'extension-register');
  assert.ok(reg);
  assert.equal(reg.source, 'skill:hello');
  assert.equal(reg.name, 'skill.greet');
  assert.ok(reg.tool === 'skill.greet');
  // 注册即得：schema/help/dispatch
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['skill.greet']);
  assert.ok(router.listHelp().includes('skill.greet'));
  const r = await router.dispatch(tc('skill.greet'));
  assert.equal(r.ok, true);
  // 卸载 → 三链即时消失 + 卸载审计
  assert.equal(router.unregister('skill.greet'), true);
  const unreg = audit.events.find((e) => e.type === 'extension-unregister');
  assert.ok(unreg && unreg.source === 'skill:hello');
  assert.deepEqual(router.names(), []);
  assert.equal(router.has('skill.greet'), false);
  assert.equal(router.helpFor('skill.greet'), null);
  const after = await router.dispatch(tc('skill.greet'));
  assert.equal(after.ok, false);
  assert.match(after.output, /未注册工具 "skill\.greet"/);
});

test('router v2: query 过滤（命名空间/组/名/启用态，FR-003）', () => {
  const router = createCommandRouter({ builtins: false });
  router.register({ ...makeTool('read'), namespace: 'doc', group: 'doc' });
  router.register({ ...makeTool('edit'), namespace: 'doc', group: 'doc', risk: 'write', enabled: false });
  router.register({ ...makeTool('fetch'), namespace: 'net', group: 'net' });
  assert.deepEqual(router.query({ namespace: 'doc' }).map((e) => e.name), ['read', 'edit']);
  assert.deepEqual(router.query({ group: 'net' }).map((e) => e.name), ['fetch']);
  assert.deepEqual(router.query({ name: 'r*' }).map((e) => e.name), ['read']);
  assert.deepEqual(router.query({ name: '*h' }).map((e) => e.name), ['fetch']);
  assert.deepEqual(router.query({ name: '*e*' }).map((e) => e.name), ['read', 'edit', 'fetch']);
  assert.deepEqual(router.query({ enabled: false }).map((e) => e.name), ['edit']);
  assert.deepEqual(router.query({ namespace: 'doc', enabled: true }).map((e) => e.name), ['read']);
});

test('router v2: 命名空间次序可配置（FR-002 setNamespaceOrder）', () => {
  const router = createCommandRouter({ builtins: false });
  router.register(makeTool('alpha')); // '' 先
  router.register({ ...makeTool('beta'), namespace: 'skill' });
  router.register(makeTool('gamma')); // '' 组内第二
  assert.deepEqual(router.names(), ['alpha', 'gamma', 'skill.beta']); // 缺省首次注册序
  router.setNamespaceOrder(['skill', '']);
  assert.deepEqual(router.names(), ['skill.beta', 'alpha', 'gamma']);
  router.setNamespaceOrder(['']);
  assert.deepEqual(router.names(), ['alpha', 'gamma', 'skill.beta']);
});

test('router v2: 开关模型 — 声明 enabled:false 三链断言（FR-004/EC-001）', async () => {
  const router = createCommandRouter();
  router.register({ ...makeTool('readonly'), risk: 'read' });
  router.register({ ...makeTool('writeonly'), enabled: false, risk: 'write' });
  // 链 1 schema 派生不含禁用工具
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['readonly', 'web-fetch', 'sleep', 'web-cli-help']);
  assert.ok(!router.deriveTools().some((t) => t.name === 'writeonly'));
  assert.ok(router.deriveTools().some((t) => t.name === 'readonly'));
  // 链 2 help 一览标注「已禁用」
  const list = router.listHelp();
  assert.ok(list.includes('writeonly：writeonly description（已禁用）'));
  assert.ok(!list.includes('readonly：readonly description（已禁用）'));
  // 链 3 dispatch 显式「已禁用」错误（EC-001 文案互异于「未注册」）
  const d = await router.dispatch(tc('writeonly'));
  assert.equal(d.ok, false);
  assert.match(d.output, /已禁用/);
  assert.doesNotMatch(d.output, /未注册|权限被拒/);
});

test('router v2: enabledTools 白名单 — schema 不含、派发报禁用（FR-004）', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register(makeTool('keep')).register(makeTool('drop'));
  router.enabledTools(['keep']);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['keep']);
  const dropped = await router.dispatch(tc('drop'));
  assert.equal(dropped.ok, false);
  assert.match(dropped.output, /已禁用/);
  assert.equal((await router.dispatch(tc('keep'))).ok, true);
  router.enableAllTools();
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['keep', 'drop']);
});

test('router v2: dispatch 权限门禁 — deny 短路（执行器未被调用 + 无 delay 等待 + 文案互异）', async () => {
  const fake = makeFakeClock();
  const audit = createMemoryAudit();
  let executed = 0;
  const router = createCommandRouter({
    delayMs: 600,
    clock: fake.clock,
    builtins: false,
    audit,
    policy: { rules: [{ pattern: 'secret.*', action: 'deny', note: '涉密' }] },
  });
  router.register({
    name: 'peek',
    namespace: 'secret',
    schema: { name: 'peek', description: 'x', parameters: {} },
    executor: async () => {
      executed += 1;
      return { ok: true, output: 'peeked' };
    },
  });
  router.register(makeTool('open'));
  const denied = await router.dispatch(tc('secret.peek'));
  assert.equal(denied.ok, false);
  assert.equal(denied.error, 'permission denied');
  assert.match(denied.output, /权限被拒/);
  assert.doesNotMatch(denied.output, /未注册|已禁用/);
  assert.equal(executed, 0); // 执行器未被调用（间谍断言 FR-005）
  // deny 短路：不产生 delay 等待；仅后续 enabled 命令产生间隔补齐
  await router.dispatch(tc('open')); // 首命令不等待
  await router.dispatch(tc('open')); // 距上一命令起点 0 < 600 → 补齐 600
  assert.deepEqual(fake.waits, [600]); // deny 未产生额外等待
  // 权限裁决入审计
  const perm = audit.events.find((e) => e.type === 'permission');
  assert.ok(perm && perm.decision === 'deny');
  assert.equal(perm.tool, 'secret.peek');
});

test('router v2: dispatch ask 桥 — allow 放行 / deny 拦截 + audit（FR-007）', async () => {
  const audit = createMemoryAudit();
  const mk = (outcome: 'allow' | 'deny') =>
    createCommandRouter({
      builtins: false,
      audit,
      policy: {
        rules: [{ risk: 'write', action: 'ask' }],
        onAsk: async () => ({ action: outcome }),
      },
    });
  const allowRouter = mk('allow');
  let allowExec = 0;
  allowRouter.register({ name: 'w', risk: 'write', schema: { name: 'w', description: '', parameters: {} }, executor: async () => { allowExec += 1; return { ok: true, output: 'done' }; } });
  const allowed = await allowRouter.dispatch(tc('w'));
  assert.equal(allowed.ok, true);
  assert.equal(allowExec, 1);

  const denyRouter = mk('deny');
  let denyExec = 0;
  denyRouter.register({ name: 'w', risk: 'write', schema: { name: 'w', description: '', parameters: {} }, executor: async () => { denyExec += 1; return { ok: true, output: 'done' }; } });
  const denied = await denyRouter.dispatch(tc('w'));
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
  assert.equal(denyExec, 0);
  // 权限事件两笔均入审计
  const perms = audit.events.filter((e) => e.type === 'permission');
  assert.equal(perms.length, 2);
  assert.equal(perms[0].decision, 'allow');
  assert.equal(perms[1].decision, 'deny');
});

test('router v2: PostToolUse 审计 — 成功/异常均记录 tool-call 事件（NFR-009）', async () => {
  const audit = createMemoryAudit();
  const router = createCommandRouter({ builtins: false, audit });
  router.register({ name: 'ok-tool', schema: { name: 'ok-tool', description: '', parameters: {} }, executor: async () => ({ ok: true, output: 'hi'.repeat(20), trust: { source: 'x', fetchedAt: 0, level: 'untrusted' } }) });
  router.register({ name: 'boom', schema: { name: 'boom', description: '', parameters: {} }, executor: async () => { throw new Error('kaboom'); } });
  await router.dispatch(tc('ok-tool'));
  await router.dispatch(tc('boom'));
  const calls = audit.events.filter((e) => e.type === 'tool-call');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].ok, true);
  assert.equal(calls[0].outputChars, 40);
  assert.equal(calls[0].trust?.level, 'untrusted');
  assert.ok(typeof calls[0].durationMs === 'number');
  assert.equal(calls[1].ok, false);
  assert.match(calls[1].detail ?? '', /kaboom/);
});

test('router v2: listHelp 按组分节（≥2 组插组头；单组保持旧文本）（FR-001）', () => {
  const router = createCommandRouter();
  router.register({ ...makeTool('lgdl-web-cli', { summary: '图内容操作' }) }); // 缺省组
  const single = router.listHelp();
  assert.ok(!single.includes('[general]')); // 单组不插头 → 旧文本逐字节
  router.register({ ...makeTool('doc-read', { summary: '读内容对象' }), group: 'doc' });
  router.register({ ...makeTool('storage-list', { summary: '列卷条目' }), group: 'storage' });
  const grouped = router.listHelp();
  assert.ok(grouped.includes('[doc]'));
  assert.ok(grouped.includes('[storage]'));
  assert.ok(grouped.indexOf('[doc]') < grouped.indexOf('doc-read'));
  assert.ok(grouped.indexOf('doc-read') < grouped.indexOf('storage-list'));
  // 组内注册序保持
  router.register({ ...makeTool('doc-edit', { summary: '改内容对象' }), group: 'doc' });
  const grouped2 = router.listHelp();
  assert.ok(grouped2.indexOf('doc-read') < grouped2.indexOf('doc-edit'));
});

test('router v2: 重复注册同命名空间同名抛错（EC-010 沿 EC-003）；命名空间纪律', () => {
  const router = createCommandRouter({ builtins: false });
  router.register({ ...makeTool('dup'), namespace: 'skill' });
  assert.throws(() => router.register({ ...makeTool('dup'), namespace: 'skill' }), /已注册/);
  // 同基名不同 ns 允许
  router.register({ ...makeTool('dup'), namespace: 'mcp' });
  // ns-less 名称含 "." 未声明 namespace → 拒绝（EC-010 命名空间纪律）
  assert.throws(() => router.register(makeTool('a.b')), /namespace/);
  // ns-less 与内建同名仍拒绝
  const r2 = createCommandRouter();
  assert.throws(() => r2.register({ ...makeTool('web-fetch') }), /已注册/);
});
