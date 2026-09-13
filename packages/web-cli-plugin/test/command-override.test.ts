/**
 * V2-3 R2 门禁 `command-override`（R2-V23-06；AC-V2-023/024 + AC-V23-009）。
 *
 * 证明（结构性质 + 反证）：
 *   - clamp 逐档（模型侧 `resolveCommandPolicy` / 判定链侧 `clampActionForRisk`）与父 §5.7 表一致；
 *   - `withCommandOverride` 策略链顺序锚定 `[S1, S3, override, S2]`；缺策略即 FAIL；
 *   - 覆盖存储/生命周期：持久化 / 继承 / 恢复默认（单条 + 全部）/ 幂等 / 无半写 / 串行队列 /
 *     读失败降级（视为无覆盖，更保守）/ 审计零明文且可分辨（`command-policy`）；
 *   - 同源锚定：`commandIdOf` === `STABLE_KEY.command`。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PolicyStrategy, RouterPolicy, ToolRisk } from '@lgdl/web-cli-base';
import {
  COMMAND_OVERRIDE_STRATEGY_NAME,
  COMMAND_OVERRIDE_STRATEGY_ORDER,
  COMMAND_POLICY_STORAGE_KEY,
  TIGHTEN_ONLY_ACTIONS,
  clampActionForRisk,
  commandIdOf,
  createCommandOverrideStore,
  isCommandDestructive,
  isCommandId,
  isCommandPolicyAction,
  resolveCommandPolicy,
  withCommandOverride,
  type CommandPolicyKv,
} from '../src/security/command-override.js';
import { STABLE_KEY } from '../src/insight/tree-model.js';
import type { PluginAuditSink, PluginAuditEvent } from '../src/security/audit-sink.js';

// ---------------------------------------------------------------------------
// fakes
// ---------------------------------------------------------------------------

interface KvHarness {
  kv: CommandPolicyKv;
  sets: number;
  removes: number;
  store: Map<string, unknown>;
  failSetOn: number[];
  failGet: boolean;
}

function memoryKv(opts: { failSetOn?: number[]; failGet?: boolean; delayMs?: number } = {}): KvHarness {
  const store = new Map<string, unknown>();
  const h: KvHarness = {
    sets: 0,
    removes: 0,
    store,
    failSetOn: opts.failSetOn ?? [],
    failGet: opts.failGet === true,
    kv: {
      async get<T>(key: string) {
        if (h.failGet) throw new Error('kv get boom');
        if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
        return store.get(key) as T | undefined;
      },
      async set(key: string, value: unknown) {
        h.sets += 1;
        if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
        if (h.failSetOn.includes(h.sets)) throw new Error('kv set boom');
        store.set(key, value);
      },
      async remove(key: string) {
        h.removes += 1;
        store.delete(key);
      },
    },
  };
  return h;
}

interface AuditHarness {
  sink: PluginAuditSink;
  events: PluginAuditEvent[];
}

function auditHarness(): AuditHarness {
  const events: PluginAuditEvent[] = [];
  const sink = { recordPlugin: (e: PluginAuditEvent) => events.push(e) } as unknown as PluginAuditSink;
  return { sink, events };
}

// ---------------------------------------------------------------------------
// 同源锚定 + 运行时判定
// ---------------------------------------------------------------------------

test('R2 command-override: commandIdOf is anchored to STABLE_KEY.command (single source)', () => {
  assert.equal(COMMAND_POLICY_STORAGE_KEY, 'web-cli:command-policy');
  assert.equal(commandIdOf('dom'), STABLE_KEY.command('dom'));
  assert.equal(commandIdOf('dom', 'read-state'), STABLE_KEY.command('dom', 'read-state'));
  assert.equal(commandIdOf('dom', 'read-state'), 'cmd:dom#read-state');
  assert.equal(isCommandId('cmd:dom'), true);
  assert.equal(isCommandId('cmd:dom#read-state'), true);
  for (const bad of ['dom', 'cmd:', 'cmd:#x', '', 7, undefined]) {
    assert.equal(isCommandId(bad), false, `${String(bad)} must be rejected`);
  }
  assert.equal(isCommandPolicyAction('allow'), true);
  assert.equal(isCommandPolicyAction('ask'), true);
  assert.equal(isCommandPolicyAction('deny'), true);
  for (const bad of ['ALLOW', 'delay', '', undefined, 1]) {
    assert.equal(isCommandPolicyAction(bad), false);
  }
});

// ---------------------------------------------------------------------------
// clamp 逐档（ADR-V2-025）
// ---------------------------------------------------------------------------

test('R2 command-override: clampActionForRisk follows the §5.7 table (only tighten, never widen)', () => {
  const risks: Array<ToolRisk | undefined> = ['read', 'write', 'ui', 'state', 'external', 'evaluate', undefined];
  for (const risk of risks) {
    for (const destructive of [false, true]) {
      // read / non-destructive write → desired honoured
      if (risk === 'read' || (risk === 'write' && !destructive)) {
        for (const d of ['allow', 'ask', 'deny'] as const) assert.equal(clampActionForRisk(d, risk, destructive), d);
      }
      // evaluate → never intervenes (baseline deny stands)
      if (risk === 'evaluate') {
        for (const d of ['allow', 'ask', 'deny'] as const) assert.equal(clampActionForRisk(d, risk, destructive), null);
      }
      // ui / state / external → allow clamped, ask/deny honoured
      if (risk === 'ui' || risk === 'state' || risk === 'external') {
        assert.equal(clampActionForRisk('allow', risk, destructive), null);
        assert.equal(clampActionForRisk('ask', risk, destructive), 'ask');
        assert.equal(clampActionForRisk('deny', risk, destructive), 'deny');
      }
      // destructive write → floor asks (allow clamped), ask/deny honoured
      if (risk === 'write' && destructive) {
        assert.equal(clampActionForRisk('allow', risk, destructive), null);
        assert.equal(clampActionForRisk('ask', risk, destructive), 'ask');
        assert.equal(clampActionForRisk('deny', risk, destructive), 'deny');
      }
      // unknown / invalid risk → never widen (allow → deny), tighten honoured
      if (risk === undefined) {
        assert.equal(clampActionForRisk('allow', risk, destructive), 'deny');
        assert.equal(clampActionForRisk('ask', risk, destructive), 'ask');
        assert.equal(clampActionForRisk('deny', risk, destructive), 'deny');
      }
    }
  }
});

test('R2 command-override: resolveCommandPolicy splits default/effective + readable clamp reasons', () => {
  // read → overridable
  assert.deepEqual(resolveCommandPolicy({ defaultAction: 'allow', override: 'deny', risk: 'read' }), {
    effectiveAction: 'deny',
    overridable: true,
    tightenOnly: false,
  });
  // ui allow → clamped to default; ask/deny tighten (A1: tightenOnly tier)
  assert.deepEqual(resolveCommandPolicy({ defaultAction: 'ask', override: 'allow', risk: 'ui' }), {
    effectiveAction: 'ask',
    overridable: false,
    tightenOnly: true,
    clampReason: 'ui-no-widen',
  });
  assert.deepEqual(resolveCommandPolicy({ defaultAction: 'ask', override: 'deny', risk: 'ui' }), {
    effectiveAction: 'deny',
    overridable: false,
    tightenOnly: true,
    clampReason: 'ui-no-widen',
  });
  // destructive floor
  assert.deepEqual(resolveCommandPolicy({ defaultAction: 'ask', override: 'allow', risk: 'write', destructive: true }), {
    effectiveAction: 'ask',
    overridable: false,
    tightenOnly: true,
    clampReason: 'destructive-floor',
  });
  // evaluate / s3 / s1 hard floors (override never takes effect; zero-control tier)
  assert.deepEqual(resolveCommandPolicy({ defaultAction: 'deny', override: 'allow', risk: 'evaluate' }), {
    effectiveAction: 'deny',
    overridable: false,
    tightenOnly: false,
    clampReason: 'evaluate',
  });
  assert.deepEqual(resolveCommandPolicy({ defaultAction: 'deny', override: 'allow' }), {
    effectiveAction: 'deny',
    overridable: false,
    tightenOnly: false,
    clampReason: 's3-unknown-risk',
  });
  assert.deepEqual(resolveCommandPolicy({ defaultAction: 'deny', override: 'allow', risk: 'read', hardFloor: 's1-unauthorized' }), {
    effectiveAction: 'deny',
    overridable: false,
    tightenOnly: false,
    clampReason: 's1-unauthorized',
  });
  // state / external reasons (A1 tighten-only tier)
  const state = resolveCommandPolicy({ defaultAction: 'ask', override: 'allow', risk: 'state' });
  assert.equal(state.clampReason, 'state-no-widen');
  assert.equal(state.tightenOnly, true);
  const external = resolveCommandPolicy({ defaultAction: 'ask', override: 'allow', risk: 'external' });
  assert.equal(external.clampReason, 'external-no-widen');
  assert.equal(external.tightenOnly, true);
});

test('R2 A1 command-override: the tighten-only tier never offers allow; server clamp still honours ask/deny', () => {
  // A1: the node-level tighten-only controls are exactly ask/deny (no allow) …
  assert.deepEqual([...TIGHTEN_ONLY_ACTIONS], ['ask', 'deny']);
  assert.equal(TIGHTEN_ONLY_ACTIONS.includes('allow'), false);
  // … and the server clamp always honours the tightening direction for every no-widen risk.
  for (const risk of ['ui', 'state', 'external'] as const) {
    assert.equal(clampActionForRisk('ask', risk, false), 'ask', `${risk}: ask must tighten`);
    assert.equal(clampActionForRisk('deny', risk, false), 'deny', `${risk}: deny must tighten`);
    assert.equal(clampActionForRisk('allow', risk, false), null, `${risk}: allow must never widen`);
  }
  assert.equal(clampActionForRisk('ask', 'write', true), 'ask');
  assert.equal(clampActionForRisk('deny', 'write', true), 'deny');
  assert.equal(clampActionForRisk('allow', 'write', true), null);
});

test('R2 command-override: isCommandDestructive only flags write-tier destructive verbs', () => {
  assert.equal(isCommandDestructive('write', 'remove'), true);
  assert.equal(isCommandDestructive('write', 'read-state'), false, 'dom read-state must never be destructive');
  assert.equal(isCommandDestructive('read', 'remove'), false, 'read tier is never a destructive write');
  assert.equal(isCommandDestructive('ui', 'remove'), false);
  assert.equal(isCommandDestructive('write', 'type'), false);
  assert.equal(isCommandDestructive('write', undefined), true, 'unknown write subcommand is fail-closed');
});

// ---------------------------------------------------------------------------
// 策略链组合（不改冻结文件）
// ---------------------------------------------------------------------------

function baseStrategy(name: string): PolicyStrategy {
  return { name, check: () => null };
}

function fakePolicy(): RouterPolicy {
  return {
    strategies: [baseStrategy('S1-origin-authorization'), baseStrategy('S2-untrusted-declared'), baseStrategy('S3-fail-closed')],
    riskDefaults: { read: 'allow', write: 'ask', evaluate: 'deny' },
    denyPriority: true,
    askTimeoutMs: 60000,
  };
}

test('R2 command-override: withCommandOverride reorders [S1, S3, override, S2] without mutating the base', () => {
  const base = fakePolicy();
  const baseJson = JSON.stringify(base.strategies!.map((s) => s.name));
  const composed = withCommandOverride(base, { resolveOverride: () => undefined });
  assert.deepEqual(composed.strategies!.map((s) => s.name), [...COMMAND_OVERRIDE_STRATEGY_ORDER]);
  assert.equal(composed.strategies!.some((s) => s.name === COMMAND_OVERRIDE_STRATEGY_NAME), true);
  // Other fields preserved verbatim.
  assert.deepEqual(composed.riskDefaults, base.riskDefaults);
  assert.equal(composed.denyPriority, true);
  assert.equal(composed.askTimeoutMs, 60000);
  // The base object is untouched.
  assert.deepEqual(base.strategies!.map((s) => s.name), JSON.parse(baseJson));
});

test('R2 command-override: withCommandOverride FAILS when a base strategy is missing (anchoring)', () => {
  const broken: RouterPolicy = { strategies: [baseStrategy('S1-origin-authorization'), baseStrategy('S2-untrusted-declared')] };
  assert.throws(() => withCommandOverride(broken, { resolveOverride: () => undefined }), /策略缺失|锚定失败/);
});

test('R2 command-override: the override strategy returns null without an override (byte-identical baseline)', () => {
  const composed = withCommandOverride(fakePolicy(), { resolveOverride: () => undefined });
  const override = composed.strategies!.find((s) => s.name === COMMAND_OVERRIDE_STRATEGY_NAME)!;
  const ctx = {
    tool: 'dom',
    subcommand: 'read-state',
    args: {},
    ctx: {},
    ruleDecision: null,
    risk: 'read' as ToolRisk,
  };
  assert.equal((override.check as (i: unknown) => unknown)(ctx), null);
  // And with an override it returns the clamped value.
  const withAllow = withCommandOverride(fakePolicy(), { resolveOverride: () => 'allow' });
  const s = withAllow.strategies!.find((x) => x.name === COMMAND_OVERRIDE_STRATEGY_NAME)!;
  assert.equal((s.check as (i: unknown) => unknown)({ ...ctx, subcommand: 'read-state', risk: 'read' }), 'allow');
  assert.equal((s.check as (i: unknown) => unknown)({ ...ctx, subcommand: 'click', risk: 'ui' }), null);
});

// ---------------------------------------------------------------------------
// 存储 / 生命周期（ADR-V2-026）
// ---------------------------------------------------------------------------

test('R2 command-override store: persistence + inheritance (sub > tool > default)', async () => {
  const h = memoryKv();
  const store = createCommandOverrideStore(h.kv, { now: () => 100 });
  await store.load();
  assert.equal(store.get('dom'), undefined);

  const r1 = await store.set('cmd:dom', 'allow');
  assert.equal(r1.ok, true);
  assert.equal(r1.changed, true);
  assert.equal(store.get('dom'), 'allow');
  assert.equal(store.get('dom', 'read-state'), 'allow', 'subcommand inherits the tool-level setting');

  const r2 = await store.set('cmd:dom#read-state', 'deny');
  assert.equal(r2.ok, true);
  assert.equal(store.get('dom', 'read-state'), 'deny', 'sub-level overrides the tool level');
  assert.equal(store.get('dom', 'click'), 'allow', 'other subcommands still inherit the tool level');
  assert.equal(store.isExplicit('dom', 'read-state'), true);
  assert.equal(store.isExplicit('dom', 'click'), true, 'tool-level explicit');
  assert.equal(store.isExplicit('tabs'), false);
  assert.deepEqual(store.list().map((e) => e.commandId), ['cmd:dom', 'cmd:dom#read-state']);

  // Persistence: a fresh store on the same kv hydrates the same entries.
  const fresh = createCommandOverrideStore(h.kv);
  await fresh.load();
  assert.equal(fresh.get('dom', 'read-state'), 'deny');
  assert.deepEqual(fresh.list(), store.list());
  assert.equal((h.store.get(COMMAND_POLICY_STORAGE_KEY) as { version: number }).version, 1);
});

test('R2 command-override store: set is idempotent (no write, no audit noise)', async () => {
  const h = memoryKv();
  const a = auditHarness();
  const store = createCommandOverrideStore(h.kv, { audit: a.sink, now: () => 1 });
  await store.load();
  const first = await store.set('cmd:dom', 'allow');
  assert.equal(first.changed, true);
  const writesAfterFirst = h.sets;
  const auditsAfterFirst = a.events.length;
  const again = await store.set('cmd:dom', 'allow');
  assert.equal(again.ok, true);
  assert.equal(again.changed, false);
  assert.match(again.text, /无变化|幂等/);
  assert.equal(h.sets, writesAfterFirst, 'idempotent set must not write storage');
  assert.equal(a.events.length, auditsAfterFirst, 'idempotent set must not add audit noise');
  assert.equal(store.get('dom'), 'allow');
});

test('R2 command-override store: reset (single/all) is reversible and idempotent', async () => {
  const h = memoryKv();
  const a = auditHarness();
  const store = createCommandOverrideStore(h.kv, { audit: a.sink });
  await store.load();
  await store.set('cmd:dom', 'allow');
  await store.set('cmd:tabs', 'deny');

  const single = await store.reset('cmd:dom');
  assert.equal(single.ok, true);
  assert.equal(single.changed, true);
  assert.equal(store.get('dom'), undefined);
  assert.equal(store.get('tabs'), 'deny');
  const repeat = await store.reset('cmd:dom');
  assert.equal(repeat.ok, true);
  assert.equal(repeat.changed, false);

  const all = await store.resetAll();
  assert.equal(all.ok, true);
  assert.equal(all.changed, true);
  assert.deepEqual(store.list(), []);
  const allAgain = await store.resetAll();
  assert.equal(allAgain.changed, false);

  // Audit decisions are discernible and zero-plaintext.
  const decisions = a.events.map((e) => e.decision);
  assert.deepEqual(decisions, ['set', 'set', 'reset', 'reset-all']);
  for (const e of a.events) {
    assert.equal(e.type, 'command-policy');
    const text = JSON.stringify(e);
    assert.equal(/key|clipboard|notification|title|body|apiKey/i.test(text.replace(/command-policy|commandId|action|prevAction/g, '')), false);
  }
});

test('R2 command-override store: invalid commandId / action are rejected with zero writes', async () => {
  const h = memoryKv();
  const store = createCommandOverrideStore(h.kv);
  await store.load();
  for (const bad of ['dom', 'cmd:', 'grant:dom', '']) {
    const r = await store.set(bad, 'allow');
    assert.equal(r.ok, false, `${bad} must be rejected`);
    assert.equal(r.changed, false);
  }
  const badAction = await store.set('cmd:dom', 'delay' as unknown as 'allow');
  assert.equal(badAction.ok, false);
  assert.equal(h.sets, 0, 'no storage write for invalid input');
  assert.match(badAction.text, /非法|零操作/);
});

test('R2 command-override store: a failed write leaves memory unchanged (no half-write)', async () => {
  const h = memoryKv({ failSetOn: [1] });
  const store = createCommandOverrideStore(h.kv);
  await store.load();
  const failed = await store.set('cmd:dom', 'allow');
  assert.equal(failed.ok, false);
  assert.equal(failed.changed, false);
  assert.match(failed.text, /保存失败|未改动/);
  assert.equal(store.get('dom'), undefined, 'a failed write must not commit memory');
  assert.equal(h.store.has(COMMAND_POLICY_STORAGE_KEY), false, 'nothing must be persisted');
});

test('R2 command-override store: concurrent writes are serialized (no lost update / interleave)', async () => {
  const h = memoryKv({ delayMs: 2 });
  const store = createCommandOverrideStore(h.kv, { now: () => 9 });
  await store.load();
  const [a, b, c] = await Promise.all([
    store.set('cmd:a', 'allow'),
    store.set('cmd:b', 'deny'),
    store.set('cmd:a', 'deny'),
  ]);
  assert.equal(a.ok && b.ok && c.ok, true);
  assert.equal(store.get('a'), 'deny', 'the later a=deny must win (serialized)');
  assert.equal(store.get('b'), 'deny');
  assert.deepEqual(store.list().map((e) => e.commandId), ['cmd:a', 'cmd:b']);
  // The persisted document equals the in-memory state (atomic whole-object write).
  const persisted = h.store.get(COMMAND_POLICY_STORAGE_KEY) as { entries: Record<string, { action: string }> };
  assert.deepEqual(Object.keys(persisted.entries).sort(), ['cmd:a', 'cmd:b']);
  assert.equal(persisted.entries['cmd:a']!.action, 'deny');
});

test('R2 command-override store: a read failure degrades to "no overrides" (never widens)', async () => {
  const h = memoryKv({ failGet: true });
  const store = createCommandOverrideStore(h.kv);
  await store.load();
  assert.equal(store.isDegraded(), true);
  assert.match(String(store.degradedReason()), /暂不可读|无覆盖/);
  assert.deepEqual(store.list(), []);
  assert.equal(store.get('dom'), undefined, 'read failure → default tier (more conservative than a stored allow)');
  // A subsequent successful write is still possible and readable.
  const set = await store.set('cmd:dom', 'ask');
  assert.equal(set.ok, true);
  assert.equal(store.get('dom'), 'ask');
});

test('R2 command-override store: malformed / wrong-version documents are fail-safe', async () => {
  for (const doc of [
    { version: 2, entries: { 'cmd:dom': { action: 'allow', updatedAt: 1 } } },
    { entries: { 'cmd:dom': { action: 'allow', updatedAt: 1 } } },
    { version: 1, entries: { 'not-a-command': { action: 'allow', updatedAt: 1 } } },
    { version: 1, entries: { 'cmd:dom': { action: 'ALLOW', updatedAt: 1 } } },
  ]) {
    const h = memoryKv();
    h.store.set(COMMAND_POLICY_STORAGE_KEY, doc);
    const store = createCommandOverrideStore(h.kv);
    await store.load();
    assert.deepEqual(store.list(), [], `malformed doc must not load an override: ${JSON.stringify(doc)}`);
  }
});

test('R2 command-override store: the audit trail carries no plaintext and is discernible', async () => {
  const h = memoryKv();
  const a = auditHarness();
  const store = createCommandOverrideStore(h.kv, { audit: a.sink, now: () => 42 });
  await store.load();
  await store.set('cmd:dom#read-state', 'allow');
  assert.equal(a.events.length, 1);
  const ev = a.events[0]!;
  assert.equal(ev.type, 'command-policy');
  assert.equal(ev.decision, 'set');
  assert.equal(ev.ts, 42);
  assert.match(String(ev.detail), /commandId=cmd:dom#read-state/);
  assert.match(String(ev.detail), /action=allow/);
  // Distinct from revoke / auto-authorize events (父 FR-V2-036「可分辨」).
  assert.notEqual(ev.type, 'auto-authorize');
  assert.notEqual(ev.type, 'origin-revoke');
  // Zero plaintext: no key/clipboard/notification/page data.
  assert.equal(/apiKey|clipboard|notification|title=|body=|https?:\/\//i.test(JSON.stringify(ev)), false);
});
