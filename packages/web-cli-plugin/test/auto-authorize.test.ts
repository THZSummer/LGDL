/**
 * FR-052 / ADR-017 — per-origin auto-authorization (read / write).
 *
 * Proves the four hard floors survive an enabled write-auto switch, that the
 * read tier is a zero-regression no-op, that settings persist + are isolated per
 * origin and take effect immediately, and that an auto-authorized allow is
 * audited distinctly from a manual confirmation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import {
  AUTO_AUTH_DEFAULTS,
  AUTO_AUTH_STORAGE_KEY,
  autoAuthBadge,
  createAutoAuthStore,
  decideAutoAuthorization,
} from '../src/security/auto-authorize.js';
import { isDestructiveInvocation } from '../src/tools/declared-tools.js';
import { parseDescriptor } from '../src/protocol/descriptor.js';
import { createWebCliHost } from '../src/background/host.js';
import type { ToolResult } from '@lgdl/web-cli-base';

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

// ── pure decision seam ───────────────────────────────────────────────────────

test('auto-authorize decision: write auto allows non-destructive write only', () => {
  const settings = { read: true, write: true };
  const ok = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'write', destructive: false, settings });
  assert.equal(ok.allow, true);
  assert.equal(ok.tier, 'write');

  const destructive = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'write', destructive: true, settings });
  assert.equal(destructive.allow, false);

  const off = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'write', destructive: false, settings: { read: true, write: false } });
  assert.equal(off.allow, false);

  const read = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'read', destructive: false, settings });
  assert.equal(read.allow, true);
  assert.equal(read.tier, 'read');
});

test('auto-authorize decision: hard floors never auto-allow', () => {
  const on = { read: true, write: true };
  // evaluate → hard deny (never delegated to the confirmation UI)
  const evaluate = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'evaluate', destructive: false, settings: on });
  assert.equal(evaluate.allow, false);
  assert.equal(evaluate.hardDeny, true);
  // unknown / missing risk → hard deny (S3 fail-closed)
  const unknown = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: undefined, destructive: false, settings: on });
  assert.equal(unknown.allow, false);
  assert.equal(unknown.hardDeny, true);
  // ui / state / external → no auto switch this round
  for (const risk of ['ui', 'state', 'external'] as const) {
    const d = decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk, destructive: false, settings: on });
    assert.equal(d.allow, false, `risk ${risk} must not auto-allow`);
  }
  // no origin / non-site tool → never auto
  assert.equal(decideAutoAuthorization({ group: 'site', risk: 'write', destructive: false, settings: on }).allow, false);
  assert.equal(decideAutoAuthorization({ origin: 'https://a.test', group: 'plugin', risk: 'write', destructive: false, settings: on }).allow, false);
});

test('auto-authorize badge: only reflects enabled tiers', () => {
  assert.equal(autoAuthBadge({ read: false, write: false }), '');
  assert.equal(autoAuthBadge({ read: true, write: false }), '⚡ 自动授权：读');
  assert.equal(autoAuthBadge({ read: true, write: true }), '⚡ 自动授权：读+写');
  assert.equal(autoAuthBadge(undefined), '');
});

test('destructive invocation: subcommand segments are judged (add-node / remove-node)', () => {
  const decl = { id: 'lgdl-web-cli', summary: 'graph ops', subcommands: ['status', 'add-node', 'remove-node'], riskHint: 'write' as const };
  assert.equal(isDestructiveInvocation(decl, 'status'), false);
  assert.equal(isDestructiveInvocation(decl, 'add-node'), true);
  assert.equal(isDestructiveInvocation(decl, 'remove-node'), true);
  // no subcommand but the declaration contains a destructive one → fail closed
  assert.equal(isDestructiveInvocation(decl), true);
});

// ── store: defaults, isolation, persistence, audit ───────────────────────────

test('auto-auth store: defaults (read on / write off) and per-origin isolation', async () => {
  const kv = memoryKv();
  const audit = createStorageAuditSink(memoryKv());
  const store = createAutoAuthStore(kv, { audit, now: () => 100 });
  await store.load();
  assert.deepEqual(store.get('https://a.test'), { ...AUTO_AUTH_DEFAULTS });
  assert.equal(store.isEnabled('https://a.test', 'read'), true);
  assert.equal(store.isEnabled('https://a.test', 'write'), false);

  await store.set('https://a.test', { write: true });
  assert.equal(store.isEnabled('https://a.test', 'write'), true);
  // a different origin is unaffected (per-origin, not global)
  assert.equal(store.isEnabled('https://b.test', 'write'), false);
  assert.deepEqual(store.get('https://b.test'), { ...AUTO_AUTH_DEFAULTS });

  // immediate off
  await store.set('https://a.test', { write: false });
  assert.equal(store.isEnabled('https://a.test', 'write'), false);

  // set changes are audited with a distinct event type
  assert.equal(audit.events.some((e) => e.type === 'auto-authorize' && e.decision === 'enabled'), true);
  assert.equal(audit.events.some((e) => e.type === 'auto-authorize' && e.decision === 'disabled'), true);
});

test('auto-auth store: persists + reloads, and normalizes origin keys', async () => {
  const kv = memoryKv();
  const a = createAutoAuthStore(kv, { now: () => 7 });
  await a.load();
  await a.set('https://A.test/', { write: true, read: false });
  assert.deepEqual(a.get('https://a.test'), { read: false, write: true });

  const raw = await kv.get<Record<string, { write: boolean }>>(AUTO_AUTH_STORAGE_KEY);
  assert.equal(Boolean(raw?.['https://a.test']), true);

  const b = createAutoAuthStore(kv, { now: () => 8 });
  await b.load();
  assert.deepEqual(b.get('https://a.test'), { read: false, write: true });
  assert.equal(b.isEnabled('https://a.test', 'write'), true);

  // one-click off disables BOTH tiers (so the marker disappears)
  await b.clear('https://a.test');
  assert.deepEqual(b.get('https://a.test'), { read: false, write: false });
  assert.equal(b.isEnabled('https://a.test', 'write'), false);
});

// ── host integration: the onAsk seam ─────────────────────────────────────────

const descriptor = (() => {
  const res = parseDescriptor({
    protocolVersion: '1.0',
    tools: [
      { id: 'notes-list', summary: 'List notes', riskHint: 'read' },
      { id: 'notes-add', summary: 'Add note (destructive verb)', riskHint: 'write' },
      { id: 'profile', summary: 'Non-destructive write tier', riskHint: 'write' },
      { id: 'notebook', summary: 'Subcommand-mixed write tier', subcommands: ['peek', 'purge'], riskHint: 'write' },
      { id: 'mystery', summary: 'No risk hint' },
    ],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.descriptor;
})();

interface Harness {
  host: ReturnType<typeof createWebCliHost>;
  audit: ReturnType<typeof createStorageAuditSink>;
  asks: number;
  rpcCalls: number;
  evalCalls: number;
}

async function buildHarness(opts: { authorized: boolean; writeAuto: boolean; readAuto?: boolean; origin?: string }): Promise<Harness> {
  const origin = opts.origin ?? 'https://a.test';
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  if (opts.authorized) await origins.authorize(origin);
  const auto = createAutoAuthStore(memoryKv(), { audit });
  await auto.load();
  await auto.set(origin, { write: opts.writeAuto, read: opts.readAuto ?? true });

  const state: Harness = { host: undefined as never, audit, asks: 0, rpcCalls: 0, evalCalls: 0 };
  state.host = createWebCliHost({
    origins,
    audit,
    rpc: {
      invoke: async () => {
        state.rpcCalls += 1;
        return { ok: true, output: 'ok' } as ToolResult;
      },
    },
    currentOrigin: () => origin,
    onAsk: async () => {
      state.asks += 1;
      return { action: 'allow' as const };
    },
    autoAuth: { isEnabled: (o, tier) => auto.isEnabled(o, tier) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  state.host.activateSite(descriptor, origin);
  // An evaluate-risk site tool registered directly (the descriptor recomputation
  // never yields evaluate, so this is the explicit hard-floor probe).
  state.host.router.register({
    name: 'site_eval-probe',
    namespace: '',
    group: 'site',
    risk: 'evaluate',
    schema: { name: 'site_eval-probe', description: 'probe', parameters: { type: 'object', properties: {} } },
    executor: () => {
      state.evalCalls += 1;
      return { ok: true, output: 'executed' };
    },
  });
  return state;
}

const call = (name: string, subcommand = '') => ({ id: 't', name, subcommand, args: {}, rawArguments: '{}' });

function autoAllows(h: Harness, tool: string): number {
  return h.audit.events.filter((e) => e.type === 'auto-authorize' && e.decision === 'allow' && e.tool === tool).length;
}

test('host: write auto allows a non-destructive write without confirmation (audited)', async () => {
  const h = await buildHarness({ authorized: true, writeAuto: true });
  const res = await h.host.dispatch(call('site_profile'), { origin: 'https://a.test' });
  assert.equal(res.ok, true);
  assert.equal(h.rpcCalls, 1);
  assert.equal(h.asks, 0, 'must not open the manual confirmation');
  assert.equal(autoAllows(h, 'site_profile'), 1);
  const ev = h.audit.events.find((e) => e.type === 'auto-authorize' && e.tool === 'site_profile');
  assert.equal(ev?.origin, 'https://a.test');
  assert.equal(ev?.risk, 'write');
  assert.equal(ev?.decision, 'allow');
  assert.match(ev?.reason ?? '', /自动授权（用户设置）/);
});

test('host: destructive write still asks even with write auto on', async () => {
  const h = await buildHarness({ authorized: true, writeAuto: true });
  // tool-id destructive verb
  const add = await h.host.dispatch(call('site_notes-add'), { origin: 'https://a.test' });
  assert.equal(add.ok, true);
  assert.equal(h.asks, 1, 'destructive tool must go through the manual ask');
  assert.equal(autoAllows(h, 'site_notes-add'), 0);

  // subcommand-level destructive verb
  const purge = await h.host.dispatch(call('site_notebook', 'purge'), { origin: 'https://a.test' });
  assert.equal(purge.ok, true);
  assert.equal(h.asks, 2, 'destructive subcommand must go through the manual ask');
  assert.equal(autoAllows(h, 'site_notebook'), 0);

  // non-destructive sibling subcommand is auto-allowed
  const peek = await h.host.dispatch(call('site_notebook', 'peek'), { origin: 'https://a.test' });
  assert.equal(peek.ok, true);
  assert.equal(h.asks, 2, 'non-destructive subcommand must not ask');
  assert.equal(autoAllows(h, 'site_notebook'), 1);
});

test('host: turning write auto off immediately restores ask (no restart)', async () => {
  const origin = 'https://a.test';
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize(origin);
  const auto = createAutoAuthStore(memoryKv(), { audit });
  await auto.load();
  let asks = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    currentOrigin: () => origin,
    onAsk: async () => {
      asks += 1;
      return { action: 'allow' };
    },
    autoAuth: { isEnabled: (o, t) => auto.isEnabled(o, t) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(descriptor, origin);

  await auto.set(origin, { write: true });
  await host.dispatch(call('site_profile'), { origin });
  assert.equal(asks, 0);

  await auto.set(origin, { write: false }); // immediate off
  await host.dispatch(call('site_profile'), { origin });
  assert.equal(asks, 1, 'after off the operation returns to the ask path');
});

test('host: read auto is zero-regression (read tool allowed without ask; no auto event)', async () => {
  const h = await buildHarness({ authorized: true, writeAuto: false, readAuto: true });
  const res = await h.host.dispatch(call('site_notes-list'), { origin: 'https://a.test' });
  assert.equal(res.ok, true);
  assert.equal(h.asks, 0);
  assert.equal(h.rpcCalls, 1);
  assert.equal(autoAllows(h, 'site_notes-list'), 0, 'read never asked, so no auto-allow record');
});

test('host: unauthorized origin still denies (S1) — auto switch cannot bypass authorization', async () => {
  const h = await buildHarness({ authorized: false, writeAuto: true });
  const res = await h.host.dispatch(call('site_profile'), { origin: 'https://a.test' });
  assert.equal(res.ok, false);
  assert.equal(h.asks, 0);
  assert.equal(h.rpcCalls, 0);
  assert.equal(autoAllows(h, 'site_profile'), 0);
});

test('host: unknown risk still denies fail-closed (S3) — auto switch cannot bypass', async () => {
  const h = await buildHarness({ authorized: true, writeAuto: true });
  const res = await h.host.dispatch(call('site_mystery'), { origin: 'https://a.test' });
  assert.equal(res.ok, false);
  assert.equal(h.asks, 0);
  assert.equal(h.rpcCalls, 0);
});

test('host: evaluate tier still denies even with write auto on (hard floor, never asks)', async () => {
  const h = await buildHarness({ authorized: true, writeAuto: true });
  const res = await h.host.dispatch(call('site_eval-probe'), { origin: 'https://a.test' });
  assert.equal(res.ok, false);
  assert.equal(h.evalCalls, 0, 'executor must never run');
  assert.equal(h.asks, 0, 'evaluate must not be delegated to the confirmation UI');
  const ev = h.audit.events.find((e) => e.type === 'auto-authorize' && e.tool === 'site_eval-probe');
  assert.equal(ev?.decision, 'deny');
  assert.equal(ev?.risk, 'evaluate');
});
