/**
 * events-tools.test.ts —— events 工具的 node 注入面测试（TASK-005；fake hub/假 env.events）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, DEFAULT_BUDGETS } from './event-bus.js';
import type { IngestEvent } from './event-bus.js';
import { executeEventsTool, eventsHelp, createEventsToolEntry, EVENTS_SUBCOMMANDS, OBSERVE_KINDS } from './events-tools.js';
import type { PlatformEventHub, PlatformSubscribeOptions } from './platform.js';
import { createMemoryAudit } from './audit.js';
import type { MemoryAuditSink } from './audit.js';
import { createCommandRouter } from './router.js';

/** fake hub：真 EventBus 同步核心的 async 包装（假 env.events 注入面）。 */
function makeFakeHub(): { hub: PlatformEventHub; ingest: (ev: IngestEvent) => void; bus: EventBus } {
  const bus = new EventBus();
  const hub: PlatformEventHub = {
    subscribe: async (opts: PlatformSubscribeOptions) => bus.subscribe(opts),
    unsubscribe: async (subId) => bus.unsubscribe(subId),
    list: async () => bus.list(),
    pause: async (subId) => bus.pause(subId),
    resume: async (subId) => bus.resume(subId),
    clear: async (subId) => bus.clear(subId),
    pull: async (subId, opts) => bus.pull(subId, opts),
    pullSensitive: async (subId, seq) => bus.pullSensitive(subId, seq),
    status: async () => bus.status(),
    setBudget: async (opts) => bus.setBudget(opts.subId, { bufferLimit: opts.bufferLimit, autoPauseAt: opts.autoPauseAt }),
    switch: async (on) => bus.switch(on),
    sources: {
      domObserve: { active: async () => false },
      lifecycle: { active: async () => false },
      console: { active: async () => false },
      network: { active: async () => false },
      pasteCapture: { active: async () => false },
      dialogOverride: { install: async () => ({ ok: true }), uninstall: async () => ({ ok: true }), installed: async () => false, addRule: async () => ({ ok: true }), listRules: () => [], removeRule: async () => ({ ok: true }) },
      netIntercept: { setIntercept: async () => ({ ok: true }), setRules: async () => ({ ok: true }), rules: async () => [], status: async () => ({ on: false, ruleCount: 0 }) },
    },
  };
  return { hub, ingest: (ev) => bus.ingest(ev), bus };
}

// ---- 元数据面 ----

test('events: 元数据面 —— 11 子命令 + subcommandRisks（read 观察/state 生命周期/write 明细）+ group=observe', () => {
  const entry = createEventsToolEntry({ kind: 'browser', fetch: (async () => new Response()) as typeof fetch });
  assert.equal(entry.name, 'events');
  assert.equal(entry.group, 'observe');
  assert.equal(entry.risk, 'read'); // entry 底档回退面
  assert.deepEqual(entry.subcommandRisks, {
    subscribe: 'read',
    list: 'read',
    status: 'read',
    pull: 'read',
    'pull-sensitive': 'write',
    unsubscribe: 'state',
    pause: 'state',
    resume: 'state',
    clear: 'state',
    budget: 'state',
    switch: 'state',
  });
  assert.deepEqual(EVENTS_SUBCOMMANDS.length, 11);
  assert.deepEqual(OBSERVE_KINDS, ['dom', 'lifecycle', 'console', 'network', 'paste', 'dialog']);
});

// ---- 无注入面转译（EC-011） ----

test('events: 无注入面（env.events undefined）→ 通道不可用可读转译不中断（EC-011）', async () => {
  const r = await executeEventsTool(undefined, 'subscribe', { kind: 'dom' });
  assert.equal(r.ok, false);
  assert.match(r.output, /事件通道不可用/);
  assert.match(r.output, /switch/);
  const unknown = await executeEventsTool(undefined, 'fly', {});
  assert.equal(unknown.ok, false);
});

// ---- 订阅生命周期 + 拉取全链（fake hub） ----

test('events: subscribe → switch on → 事件入缓冲 → pull 增量/status/list/budget/switch 全链', async () => {
  const { hub, ingest } = makeFakeHub();
  const sub = await executeEventsTool(hub, 'subscribe', { kind: 'dom', type: 'click,keydown', label: '用户点击' });
  assert.equal(sub.ok, true);
  const subId = /sub-\d+/.exec(sub.output)?.[0];
  assert.ok(subId, '订阅返回 subId');

  // 默认关 → 无事件；switch on 后入缓冲
  ingest({ kind: 'dom', type: 'click', target: '#a' });
  let pull = await executeEventsTool(hub, 'pull', { subId });
  assert.match(pull.output, /增量 0 条/);

  await executeEventsTool(hub, 'switch', { on: 'true' });
  ingest({ kind: 'dom', type: 'click', target: '#a' });
  ingest({ kind: 'dom', type: 'keydown', target: '#b' });
  ingest({ kind: 'dom', type: 'scroll', target: '#c' }); // 过滤外类型（subscribe 类型=click,keydown）

  pull = await executeEventsTool(hub, 'pull', { subId });
  assert.equal(pull.ok, true);
  assert.match(pull.output, /增量 2 条/);
  assert.match(pull.output, /click/);
  assert.match(pull.output, /#a/);
  assert.ok(!pull.output.includes('scroll'));

  // list / status
  const list = await executeEventsTool(hub, 'list', {});
  assert.match(list.output, /sub-\d+/);
  const st = await executeEventsTool(hub, 'status', {});
  assert.match(st.output, /全局开关 ON/);
  assert.match(st.output, /DEFAULT_BUDGETS/);

  // 增量 lastId（无重复无遗漏）
  ingest({ kind: 'dom', type: 'click', target: '#d' });
  const inc = await executeEventsTool(hub, 'pull', { subId, lastId: '1' });
  void inc;
  const inc2 = await executeEventsTool(hub, 'pull', { subId, lastId: '1' });
  // lastId=1 意味着取 seq>1：click(#a)=1,keydown(#b)=2 → 2 条新（seq 2..3）
  assert.match(inc2.output, /增量 2 条/);

  // pause → resume → clear
  assert.match((await executeEventsTool(hub, 'pause', { subId })).output, /已暂停/);
  ingest({ kind: 'dom', type: 'click', target: '#e' });
  assert.match((await executeEventsTool(hub, 'pull', { subId })).output, /增量 0 条/);
  assert.match((await executeEventsTool(hub, 'resume', { subId })).output, /已恢复/);
  ingest({ kind: 'dom', type: 'click', target: '#e' });
  assert.match((await executeEventsTool(hub, 'pull', { subId })).output, /增量 1 条/);
  assert.match((await executeEventsTool(hub, 'clear', { subId })).output, /已清空缓冲/);

  // budget / switch off / unsubscribe
  assert.match((await executeEventsTool(hub, 'budget', { subId, bufferLimit: '50' })).output, /bufferLimit=50/);
  assert.equal((await executeEventsTool(hub, 'budget', { subId, bufferLimit: '9999' })).ok, false);
  assert.match((await executeEventsTool(hub, 'switch', { on: 'false' })).output, /已关闭/);
  assert.match((await executeEventsTool(hub, 'unsubscribe', { subId })).output, /已退订/);
});

// ---- 订阅过滤命中/未命中（selector/url/level 传递） ----

test('events: subscribe 过滤参数（type/selector/url/level）传递 → hub 命中/未命中', async () => {
  const { hub, ingest } = makeFakeHub();
  // console 订阅：level=error 过滤
  const con = await executeEventsTool(hub, 'subscribe', { kind: 'console', level: 'error' });
  const conId = /sub-\d+/.exec(con.output)?.[0];
  assert.ok(conId);
  await executeEventsTool(hub, 'switch', { on: 'true' });
  ingest({ kind: 'console', type: 'log', text: '普通日志', meta: { level: 'log' } });
  ingest({ kind: 'console', type: 'error', text: '错误 token=SECRET', meta: { level: 'error' } });
  const r = await executeEventsTool(hub, 'pull', { subId: conId });
  assert.match(r.output, /增量 1 条/);
  assert.ok(!r.output.includes('普通日志'));
  assert.match(r.output, /token=SECRET/); // console 文本摘要（本例注入面未脱敏；脱敏属观察源面 platform-events）
});

test('events: 上下文预算 —— pull 输出只见摘要/计数（默认 N=10 预算），大负载不整段进 output（NFR-003）', async () => {
  const { hub, ingest } = makeFakeHub();
  const sub = await executeEventsTool(hub, 'subscribe', { kind: 'dom' });
  const subId = /sub-\d+/.exec(sub.output)?.[0];
  assert.ok(subId);
  await executeEventsTool(hub, 'switch', { on: 'true' });
  // 20 条事件（含超长 text）
  for (let i = 0; i < 20; i++) {
    ingest({ kind: 'dom', type: 'click', target: `#e${i}`, text: `x`.repeat(300) + `-payload-${i}` });
  }
  const r = await executeEventsTool(hub, 'pull', { subId });
  assert.match(r.output, /共 20 条增量/);
  // 只示 10 条摘要：-payload-15 等后段明文不入 output
  assert.ok(!r.output.includes('-payload-15'), '超预算事件不进 output');
  assert.match(r.output, /NFR-003|续拉/);
  // 大 text 摘要截断（120 字符内）
  assert.ok(r.output.length < 4000, 'output 受预算约束');
});

test('events: pull 网络事件摘要呈现脱敏 URL + method/status（FR-012/AC-004 断言面）；查询串敏感参数明文不泄漏', async () => {
  const { hub, ingest } = makeFakeHub();
  const sub = await executeEventsTool(hub, 'subscribe', { kind: 'network' });
  const subId = /sub-\d+/.exec(sub.output)?.[0];
  assert.ok(subId);
  await executeEventsTool(hub, 'switch', { on: 'true' });
  ingest({
    kind: 'network',
    type: 'fetch',
    meta: { method: 'GET', url: 'https://api.example.com/v1/users?token=SECRETTOK&page=2', status: 200, durationMs: 42 },
  });
  const r = await executeEventsTool(hub, 'pull', { subId });
  assert.equal(r.ok, true);
  assert.match(r.output, /增量 1 条/);
  assert.match(r.output, /method=GET/);
  assert.match(r.output, /status=200/);
  // 网络摘要呈现目标 URL（脱敏位：token 查询参数掩码后进输出；page 等非敏感参数保留）
  assert.match(r.output, /url=https:\/\/api\.example\.com\/v1\/users\?token=•••&page=2/);
  assert.ok(!r.output.includes('SECRETTOK'), '网络事件摘要不泄漏 URL 查询串明文（脱敏后输出）');
});

test('events: pull 来源去重 —— dom 观察源事件同带顶层 source 与 meta.source 时输出只含单个 src=（回归）', async () => {
  const { hub, ingest } = makeFakeHub();
  const sub = await executeEventsTool(hub, 'subscribe', { kind: 'dom', type: 'click' });
  const subId = /sub-\d+/.exec(sub.output)?.[0];
  assert.ok(subId);
  await executeEventsTool(hub, 'switch', { on: 'true' });
  // 模拟 platform-events dom 观察源（:222）：meta.source 与顶层 source 携带同一来源标记
  ingest({ kind: 'dom', type: 'click', target: '应用服务', meta: { source: 'page' }, source: 'page' });
  const r = await executeEventsTool(hub, 'pull', { subId });
  assert.equal(r.ok, true);
  assert.match(r.output, /@应用服务/);
  assert.match(r.output, /src=page/);
  const srcHits = (r.output.match(/src=/g) ?? []).length;
  assert.equal(srcHits, 1, `pull 输出 src= 只允许一次（实际 ${srcHits} 次）：\n${r.output}`);
  // meta-only source（lifecycle/console/network 等形态）语义不变 —— 仍单次输出
  ingest({ kind: 'dom', type: 'click', target: 'meta-only', meta: { source: 'synthetic' } });
  const r2 = await executeEventsTool(hub, 'pull', { subId });
  assert.match(r2.output, /src=synthetic/);
  assert.equal((r2.output.match(/src=/g) ?? []).length, 1, 'meta-only source 形态仍单次输出');
});

// ---- pull-sensitive（trusted + ask 双闸；审计入账） ----

test('events: pull-sensitive —— untrusted 缺省拒 + 需 --trusted true；放行后明细返回（FR-006）', async () => {
  const { hub, ingest } = makeFakeHub();
  const audit: MemoryAuditSink = createMemoryAudit();
  const sen = await executeEventsTool(hub, 'subscribe', { kind: 'console', sensitive: 'true' }, { services: { audit } });
  const senId = /sub-\d+/.exec(sen.output)?.[0];
  assert.ok(senId);
  await executeEventsTool(hub, 'switch', { on: 'true' });
  ingest({ kind: 'console', type: 'error', text: '摘要', sensitiveDetail: '完整明细细（仅敏感订阅保留）' });
  const pull = await executeEventsTool(hub, 'pull', { subId: senId });
  const seq = /\[(\d+)\]/.exec(pull.output)?.[1];
  assert.ok(seq);

  // 无 trusted → deny
  const deny = await executeEventsTool(hub, 'pull-sensitive', { subId: senId, seq }, { services: { audit } });
  assert.equal(deny.ok, false);
  assert.match(deny.output, /trusted/);
  // trusted true → 明细
  const ok = await executeEventsTool(hub, 'pull-sensitive', { subId: senId, seq, trusted: 'true' }, { services: { audit } });
  assert.equal(ok.ok, true);
  assert.match(ok.output, /完整明细细/);
  // 审计含 subscribe（sensitive）+ untrusted deny 决策
  const types = audit.events.map((e) => e.type);
  assert.ok(types.includes('subscribe'));
  const senEv = audit.events.find((e) => e.type === 'subscribe' && e.sensitive === true);
  assert.ok(senEv, 'sensitive 订阅入审计');
  const denyEv = audit.events.find((e) => e.type === 'permission' && e.decision === 'deny');
  assert.ok(denyEv, 'untrusted deny 决策入审计');
});

// ---- 帮助面：别名 + 局限 + dom observe（FR-015/NFR-004） ----

test('events: help 含 dom observe 别名标注 + 局限声明 + 预算引用（FR-009/FR-015/ADR-005）', () => {
  const h = eventsHelp();
  assert.match(h, /dom observe（FR-009）= events subscribe --kind dom/);
  assert.match(h, /局限/);
  assert.match(h, /isTrusted/);
  assert.match(h, /stopImmediatePropagation/);
  assert.match(h, /整页导航后订阅随文档销毁/);
  assert.match(h, /DEFAULT_BUDGETS/);
  assert.match(h, /AI 自请求/);
});

// ---- 经 router 注册派发（门禁语义） ----

test('events: 经 router 注册 —— subcommandRisks 门禁（pull-sensitive=write 缺省 ask→deny 无桥；subscribe=read 免 ask）', async () => {
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch, events: makeFakeHub().hub };
  const router = createCommandRouter({ policy: {} });
  router.register(createEventsToolEntry(env));
  // read 子命令缺省 allow
  const sub = await router.dispatch({ name: 'events', subcommand: 'subscribe', args: { kind: 'dom' }, id: '1' } as never, {});
  assert.ok(sub.ok);
  // write 子命令无 onAsk 桥 → ask 消化为 deny（fail-closed）
  const denied = await router.dispatch({ name: 'events', subcommand: 'pull-sensitive', args: { subId: 'sub-1', seq: '1', trusted: 'true' }, id: '2' } as never, {});
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
});
