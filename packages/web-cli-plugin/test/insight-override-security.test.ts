/**
 * V2-3 R2 安全门禁 `insight-override-security`（R2-V23-06；AC-V2-025 全项）。
 *
 * 在**真实 `host.dispatch`** 上证明命令级覆盖**不可突破硬底线**（服务端 SW 侧强制）：
 *   ① `evaluate` 仍 deny；② 未授权 origin 仍 deny（S1）；③ 未知/非法 risk 仍 deny（S3）；
 *   ④ 破坏性子命令保底 `ask`；⑤ `ui`/`state`/`external` 不得变 `allow`；
 *   ⑥ `dom` / `dom read-state` 三档全可达（作者示例）；工具级 → 子命令继承；
 *   ⑦ 显式 `ask` 不被自动授权静默吞掉（guardedOnAsk）；
 *   ⑧ **服务端强制反证**：绕过 UI 直注入覆盖 / 伪造消息写 store → dispatch 仍 clamp；
 *      把 clamp 移到 UI（naive 无条件 allow 策略）→ 会 allow，反证门禁非虚绿。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AskQuestion, PlatformEnv, PlatformEventHub, PolicyAction } from '@lgdl/web-cli-base';
import { createCommandRouter } from '@lgdl/web-cli-base';
import { createWebCliHost, type WebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import {
  createCommandOverrideStore,
  type CommandOverrideStore,
} from '../src/security/command-override.js';
import { createRemoteDomOps } from '../src/content/dom-agent.js';
import { createRemoteEventHub } from '../src/tools/remote-events.js';
import { parseDescriptor, type WebCliDescriptor } from '../src/protocol/descriptor.js';

// ---------------------------------------------------------------------------
// fakes / helpers
// ---------------------------------------------------------------------------

function memoryKv(): PluginKv {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

function domEnv(): PlatformEnv {
  const ops = createRemoteDomOps({ request: async () => ({ ok: true, output: '' }) });
  const events = createRemoteEventHub({ request: async () => ({ ok: false, error: 'test transport' }) }) as PlatformEventHub;
  return {
    kind: 'browser',
    fetch: globalThis.fetch,
    dom: { state: { snapshot: async () => ({ unavailable: true }) }, ops },
    filePicker: { save: async () => ({ ok: true }), download: async () => {} },
    events,
  } as unknown as PlatformEnv;
}

interface Harness {
  host: WebCliHost;
  asked: AskQuestion[];
  origins: ReturnType<typeof createOriginStore>;
  store: CommandOverrideStore;
}

/**
 * A store-backed override lookup (sub-level > tool-level) — the same resolution the
 * SW override store uses. `commandOverrides` is injected **directly** (equivalent to
 * a forged `command-policy-set` message that already reached the store).
 */
function buildHarness(opts: {
  store?: CommandOverrideStore;
  overrides?: Record<string, PolicyAction>;
  autoWrite?: boolean;
  withDom?: boolean;
  currentOrigin?: string;
} = {}): Harness {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const store = opts.store ?? createCommandOverrideStore(memoryKv());
  const map = opts.overrides ?? {};
  const lookup = (name: string, sub?: string): PolicyAction | undefined => {
    if (sub && map[`cmd:${name}#${sub}`] !== undefined) return map[`cmd:${name}#${sub}`];
    return map[`cmd:${name}`];
  };
  const asked: AskQuestion[] = [];
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'rpc-ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    onAsk: async (q) => {
      asked.push(q);
      return { action: 'deny' };
    },
    ...(opts.currentOrigin ? { currentOrigin: () => opts.currentOrigin } : {}),
    ...(opts.autoWrite !== undefined ? { autoAuth: { isEnabled: () => opts.autoWrite === true } } : {}),
    commandOverrides: {
      get: (name, sub) => (opts.store ? store.get(name, sub) : lookup(name, sub)),
      isExplicit: (name, sub) => (opts.store ? store.isExplicit(name, sub) : lookup(name, sub) !== undefined),
    },
    ...(opts.withDom ? { browserTools: { env: domEnv() } } : {}),
  });
  return { host, asked, origins, store };
}

function register(host: WebCliHost, name: string, risk: string | undefined, subcommandRisks?: Record<string, string>): void {
  host.router.register({
    name,
    risk: risk as never,
    ...(subcommandRisks ? { subcommandRisks: subcommandRisks as never } : {}),
    schema: { name, description: `${name} test entry`, parameters: {} },
    executor: async () => ({ ok: true, output: `${name}-ran` }),
  });
}

function call(name: string, subcommand = ''): Parameters<WebCliHost['dispatch']>[0] {
  return { id: `id-${name}-${subcommand}`, name, subcommand, args: {}, rawArguments: '{}' };
}

// ---------------------------------------------------------------------------
// AC-V2-025 ①②③：evaluate / S1 / S3 反向断言（覆盖 allow 后仍 deny）
// ---------------------------------------------------------------------------

test('R2 security ①: evaluate stays deny even with an allow override', async () => {
  const { host, asked, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()) });
  await store.load();
  await store.set('cmd:x-evaluate', 'allow'); // forged / direct injection
  register(host, 'x-evaluate', 'evaluate');
  const res = await host.dispatch(call('x-evaluate'));
  assert.equal(res.ok, false, 'evaluate must never be allowed by an override');
  assert.match(res.output, /策略 command-override|权限被拒|拒绝/);
  assert.equal(asked.length, 0, 'evaluate never reaches the confirmation UI');
  assert.equal(store.get('x-evaluate'), 'allow', 'the stored value may exist…');
});

test('R2 security ②: unauthorized origin (S1) stays deny even with an allow override', async () => {
  const parsed = parseDescriptor({
    protocolVersion: '1.0',
    tools: [{ id: 'notes-list', summary: 'List notes', riskHint: 'read' }],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!parsed.ok) throw new Error(parsed.error);
  const { host, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()) });
  await store.load();
  await store.set('cmd:site_notes-list', 'allow');
  host.activateSite(parsed.descriptor, 'https://unauth.test');
  const res = await host.dispatch(call('site_notes-list'), { origin: 'https://unauth.test' });
  assert.equal(res.ok, false, 'S1 must short-circuit before the override strategy');
  assert.match(res.output, /权限被拒|S1|未授权/);
});

test('R2 security ③: unknown / missing risk (S3) stays deny even with an allow override', async () => {
  const { host, asked, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()) });
  await store.load();
  await store.set('cmd:sleep', 'allow');
  await store.set('cmd:web-cli-help', 'allow');
  for (const name of ['sleep', 'web-cli-help'] as const) {
    const res = await host.dispatch(call(name));
    assert.equal(res.ok, false, `${name} must stay deny (S3 fail-closed)`);
    assert.match(res.output, /策略 command-override|权限被拒|拒绝/);
  }
  assert.equal(asked.length, 0);
});

// ---------------------------------------------------------------------------
// AC-V2-025 ④⑤：破坏性保底 ask / ui·state·external 不得 allow
// ---------------------------------------------------------------------------

test('R2 security ④: a destructive write stays ask even with an allow override', async () => {
  const { host, asked, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()) });
  await store.load();
  await store.set('cmd:x-destructive#remove', 'allow');
  register(host, 'x-destructive', 'write', { remove: 'write', go: 'write' });
  const res = await host.dispatch(call('x-destructive', 'remove'));
  assert.equal(res.ok, false, 'destructive write must not be allowed');
  assert.equal(asked.length, 1, 'destructive write must reach the confirmation (ask floor)');
  assert.equal(asked[0]?.risk, 'write');
  // tightening is honoured: deny → no ask
  await store.set('cmd:x-destructive#remove', 'deny');
  const denied = await host.dispatch(call('x-destructive', 'remove'));
  assert.equal(denied.ok, false);
  assert.equal(asked.length, 1, 'an explicit deny needs no confirmation');
  // …and a non-destructive write subcommand IS allowed by the same override level.
  await store.set('cmd:x-destructive#go', 'allow');
  const go = await host.dispatch(call('x-destructive', 'go'));
  assert.equal(go.ok, true);
  assert.equal(go.output, 'x-destructive-ran');
});

test('R2 security ⑤: ui / state / external never become allow (ask/deny still tighten)', async () => {
  const { host, asked, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()) });
  await store.load();
  register(host, 'x-ui', 'ui');
  register(host, 'x-state', 'state');
  register(host, 'x-external', 'external');
  for (const name of ['x-ui', 'x-state', 'x-external'] as const) {
    await store.set(`cmd:${name}`, 'allow');
    const res = await host.dispatch(call(name));
    assert.equal(res.ok, false, `${name} must not be widened to allow`);
  }
  assert.equal(asked.length, 3, 'all three fall through to the baseline ask (never allow)');
  // ask override → still ask (no widening, no denial-by-clamp)
  const before = asked.length;
  await store.set('cmd:x-ui', 'ask');
  await host.dispatch(call('x-ui'));
  assert.equal(asked.length, before + 1);
  // deny override → tighten, no ask
  await store.set('cmd:x-ui', 'deny');
  const denied = await host.dispatch(call('x-ui'));
  assert.equal(denied.ok, false);
  assert.equal(asked.length, before + 1, 'explicit deny does not ask');
});

// ---------------------------------------------------------------------------
// ⑥ dom / dom read-state 三档全可达（作者示例）
// ---------------------------------------------------------------------------

test('R2 security ⑥: dom read-state supports all three tiers (author example)', async () => {
  const { host, asked, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()), withDom: true });
  await store.load();
  const readState = call('dom', 'read-state');

  await store.set('cmd:dom#read-state', 'allow');
  const allowed = await host.dispatch(readState);
  assert.equal(allowed.ok, true, 'dom read-state allow must execute');

  await store.set('cmd:dom#read-state', 'ask');
  const before = asked.length;
  const askRes = await host.dispatch(readState);
  assert.equal(askRes.ok, false);
  assert.equal(asked.length, before + 1, 'dom read-state ask must reach confirmation');

  await store.set('cmd:dom#read-state', 'deny');
  const denyRes = await host.dispatch(readState);
  assert.equal(denyRes.ok, false);
  assert.equal(asked.length, before + 1, 'dom read-state deny does not ask');
});

test('R2 security ⑥b: the dom tool-level carrier can be set to all three tiers (author example)', async () => {
  const { host, asked, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()), withDom: true });
  await store.load();

  await store.set('cmd:dom', 'allow');
  const readState = await host.dispatch(call('dom', 'read-state'));
  assert.equal(readState.ok, true, 'tool-level allow is inherited by dom read-state (read tier)');

  await store.set('cmd:dom', 'ask');
  const before = asked.length;
  await host.dispatch(call('dom', 'read-state'));
  assert.equal(asked.length, before + 1, 'tool-level ask is inherited');

  await store.set('cmd:dom', 'deny');
  const denyRes = await host.dispatch(call('dom', 'read-state'));
  assert.equal(denyRes.ok, false);
  assert.equal(asked.length, before + 1);

  // Tool-level allow never widens the ui tier (`dom click` stays ask).
  await store.set('cmd:dom', 'allow');
  const clickBefore = asked.length;
  const click = await host.dispatch(call('dom', 'click'));
  assert.equal(click.ok, false, 'ui subcommand must stay ask (clamped)');
  assert.equal(asked.length, clickBefore + 1);
});

// ---------------------------------------------------------------------------
// ⑦ 显式 ask 不被自动授权静默吞掉（guardedOnAsk）
// ---------------------------------------------------------------------------

function siteDescriptor(): WebCliDescriptor {
  const res = parseDescriptor({
    protocolVersion: '1.0',
    tools: [{ id: 'notes-toggle', summary: 'Toggle note', riskHint: 'write' }],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.descriptor;
}

test('R2 security ⑦: an explicit ask override is not swallowed by write auto-auth', async () => {
  const { host, asked, origins, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()), autoWrite: true, currentOrigin: 'https://a.test' });
  await store.load();
  await origins.authorize('https://a.test');
  host.activateSite(siteDescriptor(), 'https://a.test');
  await store.set('cmd:site_notes-toggle', 'ask');

  const res = await host.dispatch(call('site_notes-toggle'), { origin: 'https://a.test' });
  assert.equal(res.ok, false, 'the explicit ask must go to the manual confirm bridge (which denies here)');
  assert.equal(asked.length, 1, 'guardedOnAsk must bypass the auto path for an explicit ask');

  // Baseline (no explicit ask) still uses auto-auth (unchanged behavior)…
  const cleared = buildHarness({ store: createCommandOverrideStore(memoryKv()), autoWrite: true, currentOrigin: 'https://a.test' });
  await cleared.store.load();
  await cleared.origins.authorize('https://a.test');
  cleared.host.activateSite(siteDescriptor(), 'https://a.test');
  const auto = await cleared.host.dispatch(call('site_notes-toggle'), { origin: 'https://a.test' });
  assert.equal(auto.ok, true, 'write auto-auth still auto-allows without an explicit ask');
  assert.equal(cleared.asked.length, 0, 'no manual confirmation on the auto path');
});

// ---------------------------------------------------------------------------
// ⑧ 服务端强制反证
// ---------------------------------------------------------------------------

test('R2 security ⑧a: a forged/UI-bypassing override cannot break the SW clamp', async () => {
  // The write path is exactly what a forged `command-policy-set` message does:
  // call store.set(...) directly (never through tree-ops / the UI).
  const { host, asked, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()) });
  await store.load();
  await store.set('cmd:x-ui', 'allow');
  assert.equal(store.get('x-ui'), 'allow', 'the forged value is persisted');
  register(host, 'x-ui', 'ui');
  const res = await host.dispatch(call('x-ui'));
  assert.equal(res.ok, false, 'the SW judgment still clamps ui → ask/deny, never allow');
  assert.equal(asked.length, 1);
});

test('R2 security ⑧b REVERSE PROOF: a UI-only "unconditional allow" policy really would widen', async () => {
  // If the clamp lived in the UI (or was dropped), an override would be applied as-is.
  // This proves the SW clamp is load-bearing: the naive policy DOES allow.
  const audit = createStorageAuditSink(memoryKv());
  const naive = createCommandRouter({
    policy: {
      strategies: [{ name: 'ui-only-pretend', check: () => 'allow' }],
      riskDefaults: { ui: 'ask', evaluate: 'deny' },
    },
    audit,
  });
  naive.register({
    name: 'x-ui',
    risk: 'ui',
    schema: { name: 'x-ui', description: 'x', parameters: {} },
    executor: async () => ({ ok: true, output: 'naive-ran' }),
  });
  const naiveRes = await naive.dispatch({ id: '1', name: 'x-ui', subcommand: '', args: {}, rawArguments: '{}' });
  assert.equal(naiveRes.ok, true, 'without the SW clamp a UI-supplied allow WOULD widen (reverse proof)');

  // The real host (with the clamp strategy) rejects the same allow override.
  const { host, store } = buildHarness({ store: createCommandOverrideStore(memoryKv()) });
  await store.load();
  await store.set('cmd:x-ui', 'allow');
  register(host, 'x-ui', 'ui');
  const guarded = await host.dispatch(call('x-ui'));
  assert.equal(guarded.ok, false, 'the real host clamps ui → not allow');
});
