import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nodeEnv,
  classifyCapabilityError,
  translateCapabilityError,
  capabilityGuidance,
} from './platform.js';

function errWithName(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

test('platform: nodeEnv 提供 node 面默认缝（fetch 真可用 + 浏览器缝转译桩）', async () => {
  const env = nodeEnv();
  assert.equal(env.kind, 'node');
  // fetch 可用
  const res = await env.fetch('data:text/plain,hello');
  assert.equal(await res.text(), 'hello');
  // 存储缝（配额假面）
  const est = await env.storage?.estimate();
  assert.ok(est && est.quota > 0);
  assert.equal(await env.storage?.persisted(), false);
  // kv 缝 memory 假面
  assert.equal(env.kv?.get('k'), null);
  // 浏览器专属缝 → NotFoundError 转译桩（域工具应降级/禁用）
  await assert.rejects(() => env.clipboard?.readText(), (err: unknown) => {
    assert.equal((err as Error).name, 'NotFoundError');
    return true;
  });
  await assert.rejects(() => env.notify?.show('t'), (err: unknown) => {
    assert.equal((err as Error).name, 'NotFoundError');
    return true;
  });
  await assert.rejects(() => env.filePicker?.save({ suggestedName: 'a.txt', data: 'x' }), (err: unknown) => {
    assert.equal((err as Error).name, 'NotFoundError');
    return true;
  });
});

test('platform: nodeEnv 支持注入覆盖（测试 fake 缝）', async () => {
  const env = nodeEnv({
    clipboard: { readText: async () => 'fake', writeText: async () => {} },
    notify: {
      permission: async () => 'granted' as const,
      requestPermission: async () => 'granted' as const,
      show: async () => true,
    },
  });
  assert.equal(await env.clipboard?.readText(), 'fake');
  assert.equal(await env.notify?.permission(), 'granted');
  assert.equal(await env.notify?.show('t'), true);
  // 未覆盖的缝仍是桩
  await assert.rejects(() => env.filePicker?.download({ filename: 'a', data: 'x' }));
});

// ---- FR-009/EC-003：授权失败分类与转译 ----

test('platform: classifyCapabilityError 按错误名分类（NotAllowed/Security/NotFound）', () => {
  assert.equal(classifyCapabilityError(errWithName('NotAllowedError', 'denied')), 'not-allowed');
  assert.equal(classifyCapabilityError(errWithName('SecurityError', 'insecure context')), 'security');
  assert.equal(classifyCapabilityError(errWithName('NotFoundError', 'missing')), 'not-found');
  assert.equal(classifyCapabilityError(errWithName('AbortError', 'canceled')), 'abort');
  // 消息启发式
  assert.equal(classifyCapabilityError(new Error('The request is not allowed by the user agent')), 'not-allowed');
  assert.equal(classifyCapabilityError(new Error('Cannot read properties of undefined')), 'unsupported');
  assert.equal(classifyCapabilityError(new Error('something else')), 'other');
});

test('platform: 转译输出可读且含授权路径指引（FR-009）', () => {
  const notAllowed = translateCapabilityError(errWithName('NotAllowedError', 'Permission denied'), '通知');
  assert.ok(notAllowed.output.startsWith('✖'));
  assert.match(notAllowed.output, /授权被拒绝/);
  assert.match(notAllowed.output, /地址栏权限设置/);
  assert.match(notAllowed.error, /通知 failed/);

  const security = translateCapabilityError(errWithName('SecurityError', 'nope'), '剪贴板');
  assert.match(security.output, /安全上下文/);

  const notFound = translateCapabilityError(errWithName('NotFoundError', 'gone'), '文件保存');
  assert.match(notFound.output, /句柄已失效/);
});

test('platform: capabilityGuidance 五类指引文案互异', () => {
  const texts = ['not-allowed', 'security', 'not-found', 'unsupported', 'abort', 'other'].map((k) =>
    capabilityGuidance(k as Parameters<typeof capabilityGuidance>[0], '通知'),
  );
  assert.equal(new Set(texts).size, texts.length); // 全部互异
  for (const t of texts) assert.ok(t.includes('通知'));
});

// ================= v4 新缝类型面/可选方法缺省断言（TASK-003，FR-002/EC-011/ADR-002/009） =================

test('platform v4: nodeEnv 不预置 events/clipboardRich（可选缝缺省 undefined → 通道不可用转译面 EC-011）', () => {
  const env = nodeEnv();
  assert.equal(env.events, undefined, 'node 面不预置事件通道缝');
  assert.equal(env.clipboardRich, undefined, 'node 面不预置富剪贴板缝');
});

test('platform v4: PlatformDomOps 新可选方法（cookieRead/cookieWrite/cookieDelete/touchDispatch）node 面缺省 undefined', () => {
  const env = nodeEnv();
  const ops = env.dom?.ops;
  assert.ok(ops);
  assert.equal(ops?.cookieRead, undefined);
  assert.equal(ops?.cookieWrite, undefined);
  assert.equal(ops?.cookieDelete, undefined);
  assert.equal(ops?.touchDispatch, undefined);
  // 既有 7 + v3 能力仍可注入（零回归：缺省面不破坏既有方法）
  assert.equal(typeof ops?.readState, 'function');
  assert.equal(typeof ops?.screenshot, 'undefined'); // v3 新方法 node 面仍缺省（与 v3 一致）
});

test('platform v4: 未注入面调用 events 通道 → 可读错误不中断（工具层转译；env.events undefined 不抛）', async () => {
  const env = nodeEnv();
  // 直接经缝调用 = undefined（调用方 = events 工具 executor 负责可读转译）
  assert.equal(env.events, undefined);
  // 注入 fake hub 面形态可编译（消费端类型齐全：subscribe/pull/status/switch/sources）
  const fake: NonNullable<typeof env.events> = {
    subscribe: async () => ({ ok: true, subId: 'sub-1' }),
    unsubscribe: async () => ({ ok: true }),
    list: async () => [],
    pause: async () => ({ ok: true }),
    resume: async () => ({ ok: true }),
    clear: async () => ({ ok: true }),
    pull: async () => ({ ok: true, events: [], lastId: 0, dropped: 0, delivered: 0, bufferSize: 0, autoPaused: false }),
    pullSensitive: async () => ({ ok: false, error: 'x' }),
    status: async () => ({ enabled: false, subscriptionCount: 0, totalBuffered: 0, disabledDropped: 0, rateDropped: 0, budgets: { bufferLimit: 200 } as never, subscriptions: [] }),
    setBudget: async () => ({ ok: true }),
    switch: async () => ({ ok: true }),
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
  const sub = await fake.subscribe({ kind: 'dom' });
  assert.equal(sub.ok, true);
  const pull = await fake.pull('sub-1', { lastId: 0 });
  assert.equal(pull.ok, true);
});

// ================= v4 TASK-004：browserEnv 装配 env.events（惰性零常驻） =================

test('platform v4: browserEnv 装配 events 缝（构造零副作用 —— 无订阅 status 空态 + 默认关）', async () => {
  const { browserEnv } = await import('./platform.js');
  const env = browserEnv();
  assert.ok(env.events, 'browserEnv 装配 env.events');
  const st = await env.events?.status();
  assert.ok(st);
  assert.equal(st?.enabled, false, '全局通道默认关（NFR-007）');
  assert.equal(st?.subscriptionCount, 0);
  // 子控制器存在（占位/增量任务装配面）
  assert.equal(typeof env.events?.sources.dialogOverride.install, 'function');
  assert.equal(typeof env.events?.sources.netIntercept.status, 'function');
});
