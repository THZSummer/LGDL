/**
 * net-tools.test.ts —— 网络拦截规则引擎 + net 工具 node 注入面（TASK-012；G-02 真实 chromium 已过）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyNetRules, netRuleMatches, executeNetTool, createNetToolEntry, NET_SUBCOMMANDS, NET_ACTION_OPS } from './net-tools.js';
import type { PlatformNetRuleSpec } from './platform.js';
import type { PlatformEnv } from './platform.js';
import { createMemoryAudit } from './audit.js';
import { createCommandRouter } from './router.js';

const trustedRule = (id: string, url: string, actions: PlatformNetRuleSpec['actions']): PlatformNetRuleSpec => ({
  id,
  urlPattern: url,
  actions,
  trusted: true,
});

// ---- 纯规则引擎：URL 命中/未命中 + 动作序列（FR-018） ----

test('net: URL glob 命中/未命中 + 动作序列（增 header/改查询参数/请求体字段）', () => {
  const url = 'https://api.example.com/v1/users?token=AAA&page=2';
  assert.equal(netRuleMatches(trustedRule('r1', 'https://api.example.com/*', []), url), true);
  assert.equal(netRuleMatches(trustedRule('r2', 'https://other.com/*', []), url), false);
  const rules: PlatformNetRuleSpec[] = [
    trustedRule('r1', 'https://api.example.com/*', [
      { op: 'addHeader', name: 'x-debug', value: '1' },
      { op: 'setQuery', name: 'limit', value: '50' },
      { op: 'setBodyField', name: 'note', value: 'hi' },
    ]),
  ];
  const out = applyNetRules(rules, { url, method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' });
  assert.deepEqual(out.hits, ['r1']);
  assert.equal(out.headers['x-debug'], '1');
  assert.ok(out.url.includes('limit=50'));
  assert.ok(out.url.includes('token=AAA'), '非敏感参数路径保留（改写面应用层再脱敏展示）');
  assert.equal(out.body, '{"a":1,"note":"hi"}');
});

test('net: untrusted 规则永不应用 + removeHeader/removeQuery/removeBodyField + 非可改体跳过', () => {
  const rules: PlatformNetRuleSpec[] = [
    { id: 'evil', urlPattern: '*', actions: [{ op: 'addHeader', name: 'x-evil', value: '1' }], trusted: false },
    trustedRule('r2', 'https://a.com/*', [
      { op: 'removeHeader', name: 'x-skip' },
      { op: 'removeQuery', name: 'debug' },
      { op: 'setBodyField', name: 'x', value: '1' },
    ]),
  ];
  const binBody = new Blob(['binary']);
  const out = applyNetRules(rules, { url: 'https://a.com/x?debug=1', method: 'GET', headers: { 'x-skip': 'v' }, body: binBody });
  assert.deepEqual(out.hits, ['r2']);
  assert.ok(!('x-evil' in out.headers), 'untrusted 规则不应用');
  assert.ok(!('x-skip' in out.headers));
  assert.ok(!out.url.includes('debug='));
  assert.equal(out.body, binBody, '非可改体原引用未损坏');
  assert.equal(out.skipped.length, 1);
  assert.match(out.skipped[0], /跳过/);
});

// ---- 元数据面 ----

test('net: 元数据面 —— 6 子命令 + entry.risk=write + subcommandRisks（rule-add/on/off/remove write、list/status read）', () => {
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch, events: fakeHub().hub };
  const entry = createNetToolEntry(env);
  assert.equal(entry.risk, 'write');
  assert.equal(entry.group, 'net');
  assert.deepEqual(entry.subcommandRisks, {
    'rule-add': 'write',
    list: 'read',
    remove: 'write',
    'intercept-on': 'write',
    'intercept-off': 'write',
    status: 'read',
  });
  assert.deepEqual(NET_SUBCOMMANDS, ['rule-add', 'list', 'remove', 'intercept-on', 'intercept-off', 'status']);
});

// ---- 工具 executor（fake netIntercept controller） ----

function fakeHub() {
  const rules: PlatformNetRuleSpec[] = [];
  let on = false;
  const hub = {
    sources: {
      netIntercept: {
        setIntercept: async (v: boolean) => {
          on = v;
          return { ok: true };
        },
        setRules: async (r: PlatformNetRuleSpec[]) => {
          if (r.some((x) => x.trusted !== true)) return { ok: false, error: '✖ untrusted 拒' };
          rules.length = 0;
          rules.push(...r);
          return { ok: true };
        },
        rules: async () => [...rules],
        status: async () => ({ on, ruleCount: rules.length }),
      },
    },
  };
  return { hub: hub as unknown as NonNullable<PlatformEnv['events']>, getOn: () => on, getRules: () => rules };
}

test('net: 工具全链 —— rule-add untrusted 拒 / trusted 注册 → list → intercept-on/off → remove + 审计', async () => {
  const fh = fakeHub();
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch, events: fh.hub };
  const audit = createMemoryAudit();
  const ctx = { services: { audit } };

  const deny = await executeNetTool(env, 'rule-add', { url: '*', actions: '[{"op":"addHeader","name":"x","value":"1"}]' }, ctx);
  assert.equal(deny.ok, false);
  assert.match(deny.output, /trusted/);
  assert.equal(fh.getRules().length, 0);

  const ok = await executeNetTool(env, 'rule-add', { url: 'https://api.example.com/*', actions: '[{"op":"addHeader","name":"x-debug","value":"1"}]', trusted: 'true' }, ctx);
  assert.equal(ok.ok, true);
  assert.equal(fh.getRules().length, 1);
  const list = await executeNetTool(env, 'list', {}, ctx);
  assert.match(list.output, /x-debug/);
  const on = await executeNetTool(env, 'intercept-on', { trusted: 'true' }, ctx);
  assert.equal(on.ok, true);
  assert.equal(fh.getOn(), true);
  const st = await executeNetTool(env, 'status', {}, ctx);
  assert.match(st.output, /ON/);
  const off = await executeNetTool(env, 'intercept-off', { trusted: 'true' }, ctx);
  assert.equal(off.ok, true);
  // remove
  const rm = await executeNetTool(env, 'remove', { id: fh.getRules()[0].id, trusted: 'true' }, ctx);
  assert.equal(rm.ok, true);
  assert.equal(fh.getRules().length, 0);
  const netAudits = audit.events.filter((e) => e.type === 'net-intercept');
  assert.ok(netAudits.length >= 4, 'rule-add/on/off/remove 入审计');
});

test('net: env.events 未注入 → 可读错误；未知子命令可读', async () => {
  const env = { kind: 'node' as const, fetch: (async () => new Response()) as typeof fetch };
  const r = await executeNetTool(env, 'rule-add', { trusted: 'true' });
  assert.equal(r.ok, false);
  assert.match(r.output, /不可用/);
});

test('net: rule-add 未知/非法 op 拒注册（白名单 + 可读错误列出合法值，不假装生效 FR-018/NG-007）', async () => {
  const fh = fakeHub();
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch, events: fh.hub };
  const ruleAdd = (actions: string) => executeNetTool(env, 'rule-add', { url: 'https://a.com/*', actions, trusted: 'true' }, { services: { audit: createMemoryAudit() } });

  // 未知 op（fakeResponse = 响应伪造类 out 面）→ 拒注册 + 列出合法 op + 零规则写入
  const unknown = await ruleAdd('[{"op":"fakeResponse","name":"x","value":"1"}]');
  assert.equal(unknown.ok, false);
  assert.match(unknown.output, /fakeResponse/, '错误点名词');
  assert.match(unknown.output, /addHeader/, '列出合法 op 值');
  assert.equal(fh.getRules().length, 0, '未知 op 拒注册后无规则写入（不再 ok + 运行期静默无动作）');

  // 缺 op / 缺 name / 非对象项 仍拒（含 null 项不崩、可读拒）
  const noOp = await ruleAdd('[{"name":"x","value":"1"}]');
  assert.equal(noOp.ok, false);
  assert.match(noOp.output, /非法动作项/);
  const noName = await ruleAdd('[{"op":"addHeader","value":"1"}]');
  assert.equal(noName.ok, false);
  const nullItem = await ruleAdd('[null]');
  assert.equal(nullItem.ok, false);
  assert.match(nullItem.output, /非法动作项/);
  assert.equal(fh.getRules().length, 0);
});

test('net: NET_ACTION_OPS 白名单 = applyAction 支持全集（8 op，防漂移）+ 引擎面未知 op 不静默', () => {
  assert.deepEqual(
    [...NET_ACTION_OPS],
    ['addHeader', 'setHeader', 'removeHeader', 'addQuery', 'setQuery', 'removeQuery', 'setBodyField', 'removeBodyField'],
    '白名单与 applyAction/类型面全集一致（additive：任何合法 op 不得被误拒）',
  );
  // 合法 op 全量注册路径逐一通过（白名单不误伤既有合法路径）
  const out = applyNetRules(
    NET_ACTION_OPS.map((op, i) =>
      trustedRule(`r${i}`, '*', [{ op, name: `k${i}`, value: '1' }]),
    ),
    { url: 'https://a.com/x?q=1', method: 'GET', headers: { 'k0': 'old', 'k1': 'old', 'k2': 'old' } },
  );
  assert.equal(out.hits.length, NET_ACTION_OPS.length, '8 个合法 op 全量应用命中');

  // 运行期兜底：未知 op 若绕过注册面直达引擎 → 跳过并说明（不再静默无动作，NG-007）
  const rogue = applyNetRules([trustedRule('rX', '*', [{ op: 'fakeResponse' as never, name: 'x' }])], { url: 'https://a.com/x', method: 'GET', headers: {} });
  assert.equal(rogue.skipped.length, 1);
  assert.match(rogue.skipped[0], /未知动作 op "fakeResponse"/);
  assert.match(rogue.skipped[0], /addHeader/, '兜底说明也列出合法 op');
});

test('net: 经 router 派发 —— entry write + LGDL deny 矩阵 → 无规则放行时 deny（fail-closed，FR-018）', async () => {
  const fh = fakeHub();
  const env = { kind: 'browser' as const, fetch: (async () => new Response()) as typeof fetch, events: fh.hub };
  const router = createCommandRouter({ policy: {} });
  router.register(createNetToolEntry(env));
  const denied = await router.dispatch({ name: 'net', subcommand: 'rule-add', args: { trusted: 'true', url: '*', actions: '[{"op":"addHeader","name":"x","value":"1"}]' }, id: 'n1' } as never, {});
  assert.equal(denied.ok, false);
  assert.match(denied.output, /权限被拒/);
  assert.equal(fh.getRules().length, 0, 'deny 后规则未注册（P2 deny 先于执行器）');
});
