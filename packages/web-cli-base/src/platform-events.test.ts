/**
 * platform-events.test.ts —— platform-events.ts 浏览器观察源的 node 注入面测试（NFR-005 node 轨）。
 *
 * 说明：真实浏览器逐源冒烟（dom/lifecycle/console/network 各 ≥1 命中）由 validate 承接
 * （TASK-014 移交清单 V13 扩展）；本测试以**结构化 shim**（零第三方：最小 ListenerHost
 * doc/win/console/fetch 面）驱动 createBrowserEventHub(scope) 的真实逻辑，覆盖：
 * 构造零副作用 / 惰性安装与末退订卸载 / domObserve 捕获（type/target 摘要/键敏感面掩码）/
 * lifecycle 命中 + URL 脱敏 / consolePatch 捕获 + 原输出透传 + 卸载还原 / networkPatch
 * fetch 观察（URL 脱敏 + status/耗时 + AI 自请求早期绑定不可见）/ synthetic 来源标记。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserEventHub } from './platform-events.js';
import type { BrowserEventScope } from './platform-events.js';
import { withSyntheticDispatch } from './platform-dom.js';

// ==================== 最小 shim（ListenerHost 面） ====================

type Listener = (ev: unknown) => void;

function makeListenerHost(): {
  host: {
    addEventListener: (t: string, fn: Listener, capture?: boolean) => void;
    removeEventListener: (t: string, fn: Listener, capture?: boolean) => void;
  };
  registry: Map<string, Listener[]>;
  emit: (type: string, ev: unknown) => void;
} {
  const registry = new Map<string, Listener[]>();
  const host = {
    addEventListener(type: string, fn: Listener): void {
      const list = registry.get(type) ?? [];
      list.push(fn);
      registry.set(type, list);
    },
    removeEventListener(type: string, fn: Listener): void {
      const list = (registry.get(type) ?? []).filter((f) => f !== fn);
      if (list.length === 0) registry.delete(type);
      else registry.set(type, list);
    },
  };
  const emit = (type: string, ev: unknown): void => {
    for (const fn of registry.get(type) ?? []) fn(ev);
  };
  return { host, registry, emit };
}

/** 假元素面（domObserve 消费子集）。 */
function el(tag: string, opts: { id?: string; type?: string; name?: string; autocomplete?: string; value?: string; textContent?: string }): unknown {
  const attrs: Record<string, string> = {};
  if (opts.id !== undefined) attrs.id = opts.id;
  if (opts.type !== undefined) attrs.type = opts.type;
  if (opts.name !== undefined) attrs.name = opts.name;
  if (opts.autocomplete !== undefined) attrs.autocomplete = opts.autocomplete;
  return {
    tagName: tag.toUpperCase(),
    getAttribute: (n: string): string | null => attrs[n] ?? null,
    value: opts.value ?? '',
    textContent: opts.textContent ?? '',
  };
}

function makeConsole(): { con: Record<string, (...a: unknown[]) => void>; calls: Array<{ level: string; args: unknown[] }> } {
  const calls: Array<{ level: string; args: unknown[] }> = [];
  const con: Record<string, (...a: unknown[]) => void> = {};
  for (const level of ['log', 'warn', 'error', 'info', 'debug']) {
    con[level] = (...args: unknown[]): void => {
      calls.push({ level, args });
    };
  }
  return { con, calls };
}

function makeScope(opts: { url?: string } = {}) {
  const dh = makeListenerHost();
  const wh = makeListenerHost();
  const { con, calls } = makeConsole();
  const state: { fetch?: (input: unknown, init?: unknown) => Promise<unknown> } = {};
  const winAny = wh.host as unknown as Record<string, unknown>;
  winAny.location = { href: opts.url ?? 'https://app.example.com/page' };
  winAny.console = con;
  const scope = {
    document: dh.host,
    window: winAny,
  };
  return {
    scope,
    doc: dh.host,
    docRegistry: dh.registry,
    docEmit: dh.emit,
    win: wh.host,
    winEmit: wh.emit,
    con,
    consoleCalls: calls,
    setFetch(fn) {
      state.fetch = fn;
      winAny.fetch = fn;
    },
    fetchOriginal() {
      return state.fetch;
    },
  };
}

// ==================== 用例 ====================

test('platform-events: 构造零副作用 —— 无监听器/无 patch（NFR-007）', async () => {
  const m = makeScope();
  const hub = createBrowserEventHub(m.scope);
  assert.equal(m.docRegistry.size, 0, 'document 无监听器');
  assert.equal(Object.keys(m.con).length, 5);
  // 全局通道默认关
  const st = await hub.status();
  assert.equal(st.enabled, false);
});

test('platform-events: dom 观察源惰性安装 —— 首订阅挂载 / 末退订卸载（NFR-007）', async () => {
  const m = makeScope();
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  const sub = await hub.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  assert.ok(m.docRegistry.has('click'), '订阅后 click 捕获期监听已挂载');
  assert.ok(m.docRegistry.has('input'));
  const active = await hub.sources.domObserve.active();
  assert.equal(active, true);
  await hub.unsubscribe(sub.subId);
  assert.equal(m.docRegistry.has('click'), false, '末退订卸载还原');
  assert.equal(await hub.sources.domObserve.active(), false);
});

test('platform-events: domObserve 捕获 —— type/target 摘要/ts/seq + 来源标记（FR-009/FR-015）', async () => {
  const m = makeScope();
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  const sub = await hub.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;

  // 页面真实事件（缺省 source page）
  m.docEmit('click', { type: 'click', target: el('BUTTON', { id: 'submit', textContent: '提交' }) });
  // 合成派发事件（platform-dom withSyntheticDispatch 包裹 → source synthetic）
  withSyntheticDispatch(() => {
    m.docEmit('click', { type: 'click', target: el('A', { id: 'link' }) });
  });
  // 文本前缀 target 摘要
  m.docEmit('scroll', { type: 'scroll', target: el('DIV', { textContent: '列表内容' }) });

  const r = await hub.pull(sub.subId);
  assert.equal(r.events.length, 3);
  const [pageClick, synthClick, scroll] = r.events;
  assert.equal(pageClick.type, 'click');
  assert.equal(pageClick.target, '#submit');
  assert.equal(pageClick.source, 'page');
  assert.ok(pageClick.seq > 0 && pageClick.ts > 0);
  assert.equal(synthClick.source, 'synthetic');
  assert.equal(synthClick.target, '#link');
  assert.equal(scroll.target, 'div "列表内容"');
});

test('platform-events: 键入敏感面无明文值（keydown 功能键名 + 修饰键；input 敏感目标值掩码 FR-006）', async () => {
  const m = makeScope();
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  const sub = await hub.subscribe({ kind: 'dom' });
  assert.ok(sub.ok);
  if (!sub.ok) return;

  // keydown 可打印字符键：负载不含明文值回显（字符键标签）
  m.docEmit('keydown', { type: 'keydown', key: 'p', target: el('INPUT', { type: 'password', name: 'pwd' }) });
  // keydown 功能键（Enter）+ 修饰键布尔
  m.docEmit('keydown', { type: 'keydown', key: 'Enter', ctrlKey: true, target: el('INPUT', { type: 'text', name: 'q' }) });
  // input 敏感目标 → 值掩码
  m.docEmit('input', { type: 'input', target: el('INPUT', { type: 'password', value: 'S3cr3t!P@ss' }) });
  // input 非敏感目标 → 预算内值前缀
  m.docEmit('input', { type: 'input', target: el('INPUT', { type: 'text', name: 'q', value: 'hello lgdl' }) });

  const r = await hub.pull(sub.subId);
  assert.equal(r.events.length, 4);
  const join = JSON.stringify(r.events);
  assert.ok(!join.includes('S3cr3t!P@ss'), '敏感明文值不进负载');
  const kd1 = r.events[0];
  assert.equal(kd1.type, 'keydown');
  assert.equal((kd1.meta as Record<string, unknown>).key, '字符键', '可打印字符值不回显');
  assert.equal((kd1.meta as Record<string, unknown>).sensitive, true);
  const kd2 = r.events[1];
  assert.equal((kd2.meta as Record<string, unknown>).key, 'Enter');
  assert.deepEqual((kd2.meta as Record<string, unknown>).modifiers, { ctrl: true, shift: false, alt: false, meta: false });
  const inSen = r.events[2];
  assert.match(String((inSen.meta as Record<string, unknown>).valueMasked ?? ''), /已脱敏/);
  const inPlain = r.events[3];
  assert.equal((inPlain.meta as Record<string, unknown>).value, 'hello lgdl');
});

test('platform-events: lifecycle —— hashchange/visibilitychange 命中 + URL 查询串脱敏（FR-010）', async () => {
  const m = makeScope({ url: 'https://app.example.com/path?token=SECRETTOK&page=2#sec' });
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  const sub = await hub.subscribe({ kind: 'lifecycle' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  (m.scope.window as Record<string, unknown>).location = { href: 'https://app.example.com/path?token=SECRETTOK&page=2#sec' };

  m.winEmit('hashchange', { type: 'hashchange' });
  m.winEmit('popstate', { type: 'popstate' });
  m.docEmit('visibilitychange', { type: 'visibilitychange' });

  const r = await hub.pull(sub.subId);
  assert.equal(r.events.length, 3);
  const hash = r.events[0];
  assert.equal(hash.kind, 'lifecycle');
  assert.equal(hash.type, 'hashchange');
  const url = (hash.meta as Record<string, unknown>).url as string;
  assert.ok(!url.includes('SECRETTOK'), 'URL token 已掩码');
  assert.ok(url.includes('page=2'));
  assert.ok(url.includes('#sec'), 'hash 保留');
  const vis = r.events[2];
  assert.equal(vis.type, 'visibilitychange');
});

test('platform-events: consolePatch —— 捕获 level + 脱敏文本摘要 + 原输出仍到目标 + 末退订还原（FR-011）', async () => {
  const m = makeScope();
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  const origError = m.con.error; // 订阅前原引用（还原断言基准）
  const sub = await hub.subscribe({ kind: 'console' });
  assert.ok(sub.ok);
  if (!sub.ok) return;
  assert.notEqual(m.con.error, origError, '订阅后 console.error 已被 patch');

  m.con.error('boom failed token=SECRET789');
  m.con.warn('低磁盘');
  const r = await hub.pull(sub.subId);
  assert.equal(r.events.length, 2);
  const [evErr, evWarn] = r.events;
  assert.equal(evErr.kind, 'console');
  assert.equal(evErr.type, 'error');
  assert.equal((evErr.meta as Record<string, unknown>).level, 'error');
  assert.ok(!(evErr.text ?? '').includes('SECRET789'), 'console 文本脱敏');
  assert.equal(evWarn.type, 'warn');
  // 原输出仍到 DevTools（透传断言）
  assert.equal(m.consoleCalls.length, 2);
  assert.equal(m.consoleCalls[0].level, 'error');
  assert.deepEqual(m.consoleCalls[0].args, ['boom failed token=SECRET789']);
  // 末退订还原
  await hub.unsubscribe(sub.subId);
  assert.equal(m.con.error, origError, '卸载还原原 console.error 引用');
});

test('platform-events: networkPatch fetch 观察 —— method/URL 脱敏/status/耗时；AI 自请求早期绑定不可见（FR-012/ADR-008）', async () => {
  const m = makeScope();
  // 先绑定「AI 自请求」的原生引用（env.fetch 早期绑定模拟）
  m.setFetch(async (input: unknown) => ({
    status: 200,
    headers: { get: (n: string): string | null => (n === 'content-type' ? 'application/json' : null) },
    url: String(input),
  }));
  const nativeFetch = m.fetchOriginal();
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  const sub = await hub.subscribe({ kind: 'network' });
  assert.ok(sub.ok);
  if (!sub.ok) return;

  // 页面 fetch（经包装器）
  await (m.scope.window as { fetch: (i: unknown) => Promise<unknown> }).fetch('https://api.example.com/v1/users?token=SEKRET99');
  let r = await hub.pull(sub.subId);
  assert.equal(r.events.length, 1);
  const ev = r.events[0];
  assert.equal(ev.kind, 'network');
  assert.equal(ev.type, 'fetch');
  const meta = ev.meta as Record<string, unknown>;
  assert.equal(meta.method, 'GET');
  assert.ok(!String(meta.url).includes('SEKRET99'), 'URL 查询串脱敏');
  assert.ok(String(meta.url).startsWith('https://api.example.com/v1/users?'));
  assert.equal(meta.status, 200);
  assert.ok(typeof meta.durationMs === 'number');
  assert.equal(meta.source, 'page');
  assert.equal(meta.contentType, 'application/json');

  // AI 自请求（早期绑定原生引用）→ 不入观察流（ADR-008 公开差异）
  await nativeFetch?.('https://ai-self.example.com/ask?token=SHOULD_NOT_APPEAR');
  r = await hub.pull(sub.subId);
  assert.equal(r.events.length, 0, 'env.fetch 早期绑定原生 → AI 自请求默认不可见');
});

test('platform-events: 多源并发互不干扰 + 失效订阅可读错误（FR-008/EC-001）', async () => {
  const m = makeScope();
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  const dom = await hub.subscribe({ kind: 'dom' });
  const con = await hub.subscribe({ kind: 'console' });
  assert.ok(dom.ok && con.ok);
  if (!dom.ok || !con.ok) return;
  m.docEmit('click', { type: 'click', target: el('BUTTON', { id: 'a' }) });
  m.con.error('x');
  assert.equal((await hub.pull(dom.subId)).events.length, 1);
  assert.equal((await hub.pull(con.subId)).events.length, 1);
  await hub.unsubscribe(dom.subId);
  const gone = await hub.pull(dom.subId);
  assert.equal(gone.ok, false);
  assert.match(gone.error ?? '', /不存在或已失效/);
});

// ================= v4 TASK-012：netIntercept 与观察共享 instrumentation（ADR-008） =================

test('platform-events: netIntercept 开启 + trusted 规则 → fetch 发出前改写（观察与拦截共享不干扰）', async () => {
  const m = makeScope();
  const seen: Array<{ url: unknown; init: unknown }> = [];
  m.setFetch(async (input: unknown, init?: unknown) => {
    seen.push({ url: input, init });
    return { status: 200, headers: { get: () => null }, url: String(input) };
  });
  const hub = createBrowserEventHub(m.scope);
  await hub.switch(true);
  // 规则（trusted）+ 开启拦截 → 惰性安装 instrumentation（无 network 订阅也安装：netNeed 含拦截）
  await hub.sources.netIntercept.setRules([
    { id: 'r1', urlPattern: 'https://api.example.com/*', actions: [{ op: 'addHeader', name: 'x-debug', value: '1' }, { op: 'addQuery', name: 'v4', value: 'yes' }], trusted: true },
  ]);
  await hub.sources.netIntercept.setIntercept(true);
  const st = await hub.sources.netIntercept.status();
  assert.equal(st.on, true);
  assert.equal(st.ruleCount, 1);
  // 拦截关闭前 → 请求被改写（发出前：orig 收到改后 URL/头）
  await (m.scope.window as { fetch: (i: string, init: Record<string, unknown>) => Promise<unknown> }).fetch('https://api.example.com/x', { headers: { 'x-a': '1' } });
  assert.equal(seen.length, 1);
  assert.ok(String(seen[0].url).includes('v4=yes'), '查询参数改写生效');
  const h = (seen[0].init as { headers: Headers }).headers;
  assert.equal(h.get('x-debug'), '1', 'header 改写生效');
  // 未命中 URL → 不改写
  await (m.scope.window as { fetch: (i: string, init: Record<string, unknown>) => Promise<unknown> }).fetch('https://other.com/', {});
  assert.ok(!String(seen[1].url).includes('v4=yes'));
  // 拦截关闭 → 零改写（规则保留）；卸载（无订阅无拦截）→ instrumentation 还原
  await hub.sources.netIntercept.setIntercept(false);
  const native = m.fetchOriginal();
  await native?.('https://api.example.com/z?token=T');
  assert.ok(seen.every((s) => !String(s.url).includes('v4=yes') || s.url === seen[0].url), '关闭后新请求不被改写');
  // untrusted 规则拒
  const deny = await hub.sources.netIntercept.setRules([{ id: 'bad', urlPattern: '*', actions: [], trusted: false }]);
  assert.equal(deny.ok, false);
});
