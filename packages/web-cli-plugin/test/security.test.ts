import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionGate } from '@lgdl/web-cli-base';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createConfirmBridge, buildOperationSummary } from '../src/security/confirm.js';
import { createOriginStore, normalizeOrigin, type PluginKv } from '../src/security/origin-store.js';
import { createPluginPolicyConfig } from '../src/security/policy.js';
import { discoveryAuditEvent } from '../src/security/discovery-audit.js';
import { parseDescriptor } from '../src/protocol/descriptor.js';
import { summarizeArgs } from '../src/security/redact.js';

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

test('origin-store: authorization and trust are separate and audited', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const store = createOriginStore(memoryKv(), { audit, now: () => 100 });
  assert.equal(await store.isAuthorized('https://a.test'), false);
  assert.equal(await store.trustOf('https://a.test'), 'untrusted');

  const rec = await store.authorize('https://A.test/');
  assert.equal(rec.origin, 'https://a.test');
  assert.equal(rec.authorized, true);
  assert.equal(rec.trust, 'untrusted');

  await store.setTrust('https://a.test', 'trusted');
  assert.equal(await store.trustOf('https://a.test'), 'trusted');
  assert.equal(await store.isAuthorized('https://a.test'), true);

  assert.equal(await store.revoke('https://a.test'), true);
  assert.equal(await store.isAuthorized('https://a.test'), false);
  assert.equal(await store.revoke('https://a.test'), false);

  const types = audit.events.map((e) => e.type);
  assert.equal(types.includes('origin-authorize'), true);
  assert.equal(types.includes('origin-revoke'), true);
  assert.equal(normalizeOrigin('https://X.test/'), 'https://x.test');
});

test('policy S1: unauthorized site origin is denied', async () => {
  const gate = new PermissionGate(
    createPluginPolicyConfig({ isAuthorized: () => false, trustOf: () => 'untrusted' }),
  );
  const decision = await gate.check({ tool: 'site.notes-list', namespace: 'site', risk: 'read', subcommand: '', args: {}, ctx: { origin: 'https://a.test' } });
  assert.equal(decision.action, 'deny');
  assert.match(decision.by ?? '', /S1/);
});

test('policy S2/S3: untrusted dangerous → ask; read → allow; unknown → deny (fail-closed)', async () => {
  const deps = { isAuthorized: () => true, trustOf: () => 'untrusted' as const };
  const gate = new PermissionGate(createPluginPolicyConfig(deps));
  let asked = 0;
  const onAsk = () => {
    asked += 1;
    return { action: 'allow' as const };
  };

  const write = await gate.check({ tool: 'site.notes-add', namespace: 'site', risk: 'write', subcommand: '', args: {}, ctx: { origin: 'https://a.test' } }, { onAsk });
  assert.equal(write.action, 'allow');
  assert.equal(asked, 1);

  const read = await gate.check({ tool: 'site.notes-list', namespace: 'site', risk: 'read', subcommand: '', args: {}, ctx: { origin: 'https://a.test' } });
  assert.equal(read.action, 'allow');

  const unknown = await gate.check({ tool: 'site.mystery', namespace: 'site', risk: undefined, subcommand: '', args: {}, ctx: { origin: 'https://a.test' } });
  assert.equal(unknown.action, 'deny');
});

test('policy: trusted declaration skips S2 ask (falls to riskDefaults)', async () => {
  const gate = new PermissionGate(createPluginPolicyConfig({ isAuthorized: () => true, trustOf: () => 'trusted' }));
  let asked = 0;
  const decision = await gate.check({ tool: 'site.notes-add', namespace: 'site', risk: 'write', subcommand: '', args: {}, ctx: { origin: 'https://a.test' } }, {
    onAsk: () => {
      asked += 1;
      return { action: 'deny' };
    },
  });
  assert.equal(asked, 1); // riskDefaults write→ask
  assert.equal(decision.action, 'deny');
});

test('policy: plugin management tools bypass site strategies (read default allow)', async () => {
  const gate = new PermissionGate(createPluginPolicyConfig({ isAuthorized: () => false, trustOf: () => 'untrusted' }));
  const decision = await gate.check({ tool: 'plugin.origin-list', namespace: 'plugin', risk: 'read', subcommand: '', args: {}, ctx: {} });
  assert.equal(decision.action, 'allow');
});

test('confirm: summary masks sensitive args and missing responder denies', async () => {
  const summary = buildOperationSummary({ origin: 'https://a.test', tool: 'site.x', subcommand: 'add', args: { token: 'secret-value', text: 'ok' }, risk: 'write', reason: '需要确认' });
  assert.match(summary, /token=.*•/);
  assert.equal(summary.includes('secret-value'), false);

  const audit = createStorageAuditSink(memoryKv());
  const denyBridge = createConfirmBridge({ audit });
  assert.deepEqual(await denyBridge({ tool: 'site.x', reason: 'r' }), { action: 'deny' });
  assert.equal(audit.events.some((e) => e.type === 'confirm' && e.decision === 'deny'), true);

  const allowBridge = createConfirmBridge({ ask: async () => ({ action: 'allow' }), audit });
  assert.deepEqual(await allowBridge({ tool: 'site.x', reason: 'r' }), { action: 'allow' });

  const throwing = createConfirmBridge({ ask: async () => { throw new Error('boom'); }, audit });
  assert.deepEqual(await throwing({ tool: 'site.x', reason: 'r' }), { action: 'deny' });
});

test('audit-sink: ring buffer, dropped counter, export and reload', async () => {
  const kv = memoryKv();
  const sink = createStorageAuditSink(kv, { capacity: 3, now: () => 1 });
  for (let i = 0; i < 5; i++) sink.recordPlugin({ type: 'tool-call', ts: i, tool: `t${i}` });
  assert.equal(sink.events.length, 3);
  assert.equal(sink.dropped, 2);
  await sink.flush();

  const reloaded = createStorageAuditSink(kv, { capacity: 3 });
  await reloaded.load();
  assert.equal(reloaded.events.length, 3);
  assert.equal(reloaded.dropped, 2);
  const exported = await reloaded.exportEvents();
  assert.equal(exported.length, 3);
  await reloaded.clear();
  assert.equal(reloaded.events.length, 0);
});

test('audit-sink: masks plaintext args (zero plaintext)', () => {
  const sink = createStorageAuditSink(memoryKv());
  sink.recordPlugin({ type: 'permission', ts: 1, tool: 'site.x', args: { apiKey: 'sk-super-secret' } });
  const ev = sink.events[0] as unknown as { argsSummary?: string };
  assert.match(ev.argsSummary ?? '', /apiKey=.*•/);
  assert.equal(JSON.stringify(sink.events).includes('sk-super-secret'), false);
});

test('redact: summarizeArgs masks sensitive keys', () => {
  const out = summarizeArgs({ password: 'hunter2', note: 'plain' });
  assert.equal(out.includes('hunter2'), false);
  assert.match(out, /note=plain/);
});

test('discovery-audit: discovery/descriptor-read is auditable (FR-025)', () => {
  const unsupported = discoveryAuditEvent('https://a.test', undefined, 5);
  assert.equal(unsupported.type, 'descriptor-read');
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.origin, 'https://a.test');

  const parsed = parseDescriptor(
    {
      protocolVersion: '1.0',
      tools: [{ id: 'notes-list', summary: 'List notes', riskHint: 'read' }],
      transport: { kind: 'page-message', channel: 'web-cli' },
    },
    { origin: 'https://a.test', channel: 'html-link', integrityVerified: true, trust: 'untrusted' },
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const ev = discoveryAuditEvent('https://a.test', parsed.descriptor, 6);
  assert.equal(ev.ok, true);
  assert.equal(ev.trust, 'untrusted');
  assert.match(ev.detail ?? '', /channel=html-link/);
  assert.match(ev.detail ?? '', /integrity=verified/);
  assert.match(ev.detail ?? '', /tools=1/);
});
