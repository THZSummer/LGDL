import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import { createController } from '../src/background/controller.js';
import { effectiveRisk, paramsToSchema, toToolEntries } from '../src/tools/declared-tools.js';
import { createAdminToolEntries } from '../src/tools/admin-tools.js';
import { parseDescriptor } from '../src/protocol/descriptor.js';

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

const descriptor = (() => {
  const res = parseDescriptor({
    protocolVersion: '1.0',
    tools: [
      { id: 'notes-list', summary: 'List notes', riskHint: 'read' },
      { id: 'notes-add', summary: 'Add note', params: { text: { type: 'string', required: true } }, riskHint: 'write' },
      { id: 'mystery', summary: 'No risk hint' },
    ],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.descriptor;
})();

test('host: admin tools registered; site tools activate/deactivate', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  const names = host.deriveTools().map((t) => t.name);
  assert.equal(names.filter((n) => n.startsWith('plugin.')).length, 6);
  assert.equal(names.includes('plugin.origin-authorize'), true);

  host.activateSite(descriptor, 'https://a.test');
  assert.deepEqual(host.registeredSiteTools(), ['site.notes-list', 'site.notes-add', 'site.mystery']);
  host.deactivateSite();
  assert.deepEqual(host.registeredSiteTools(), []);
});

test('host: authorized read tool dispatches through RPC', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://a.test');
  let called = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: {
      invoke: async (req) => {
        called += 1;
        assert.equal(req.origin, 'https://a.test');
        return { ok: true, output: `listed ${req.tool}` };
      },
    },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(descriptor, 'https://a.test');
  const result = await host.dispatch(
    { id: '1', name: 'site.notes-list', subcommand: '', args: {}, rawArguments: '{}' },
    { origin: 'https://a.test' },
  );
  assert.equal(result.ok, true);
  assert.equal(called, 1);
});

test('host: untrusted write tool without confirmation is denied (executor not called)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://a.test');
  let called = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => { called += 1; return { ok: true, output: 'ok' }; } },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(descriptor, 'https://a.test');
  const result = await host.dispatch(
    { id: '2', name: 'site.notes-add', subcommand: '', args: { text: 'x' }, rawArguments: '{}' },
    { origin: 'https://a.test' },
  );
  assert.equal(result.ok, false);
  assert.equal(called, 0);
  assert.match(result.output, /权限|确认|拒绝/);
});

test('host: unknown-risk declared tool fails closed', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://a.test');
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(descriptor, 'https://a.test');
  const result = await host.dispatch(
    { id: '3', name: 'site.mystery', subcommand: '', args: {}, rawArguments: '{}' },
    { origin: 'https://a.test' },
  );
  assert.equal(result.ok, false);
});

test('controller: single-tab binding + navigation invalidation + restore', () => {
  const c = createController({ now: () => 10 });
  assert.equal(c.get(), null);
  c.bindTab(7, 'https://a.test');
  c.setDiscovery('supported', descriptor);
  assert.equal(c.get()?.descriptor?.tools.length, 3);
  c.markNavigated();
  assert.equal(c.get()?.invalidated, true);
  assert.equal(c.get()?.descriptor, undefined);
  assert.equal(c.get()?.discoveryState, 'unknown');

  const snap = c.snapshot();
  const c2 = createController();
  c2.restore(snap);
  assert.equal(c2.get()?.origin, 'https://a.test');
  assert.equal(c2.get()?.tabId, 7);
  c.clear();
  assert.equal(c.get(), null);
});

test('declared-tools: schema, effective risk, namespaced entries', () => {
  const schema = paramsToSchema({ id: 'x', summary: 'X', params: { a: { type: 'string', required: true } } });
  assert.equal((schema.properties as Record<string, unknown>).subcommand !== undefined, true);
  assert.equal(effectiveRisk({ id: 'x', summary: 'X', riskHint: 'write' }), 'write');
  assert.equal(effectiveRisk({ id: 'x', summary: 'X' }), undefined);
  const entries = toToolEntries(descriptor, 'https://a.test', { invoke: async () => ({ ok: true, output: '' }) });
  assert.equal(entries[0].namespace, 'site');
  assert.equal(entries[0].schema.name, 'site.notes-list');
});

test('admin-tools: origin management + audit export + masked llm config', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const entries = createAdminToolEntries({
    origins,
    audit,
    descriptorShow: async () => '{"siteName":"demo"}',
    llmConfig: async () => '{"apiKeyMasked":"sk-•"}',
  });
  const byName = new Map(entries.map((e) => [e.name, e]));
  const authorize = byName.get('origin-authorize');
  assert.ok(authorize);
  const res = await authorize!.executor({ subcommand: '', args: { origin: 'https://b.test' } }, {});
  assert.equal(res.ok, true);
  assert.equal(await origins.isAuthorized('https://b.test'), true);

  const list = await byName.get('origin-list')!.executor({ subcommand: '', args: {} }, {});
  assert.match(list.output, /https:\/\/b\.test/);

  const exported = await byName.get('audit-export')!.executor({ subcommand: '', args: {} }, {});
  assert.match(exported.output, /审计记录/);

  const cfg = await byName.get('llm-config')!.executor({ subcommand: '', args: {} }, {});
  assert.match(cfg.output, /apiKeyMasked/);
});
