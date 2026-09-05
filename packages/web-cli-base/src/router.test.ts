import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCommandRouter } from './router.js';
import type { ToolEntry } from './router.js';
import type { Clock } from './delay.js';
import type { WebCliToolCall } from './llm.js';

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
