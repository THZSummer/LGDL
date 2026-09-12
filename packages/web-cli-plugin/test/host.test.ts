import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import { createController } from '../src/background/controller.js';
import { allocateSiteToolNames, effectiveRisk, hasDestructiveVerb, isSafeReadOnlyTool, paramsToSchema, sanitizeToolName, toToolEntries, toToolEntry } from '../src/tools/declared-tools.js';
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
  assert.equal(names.filter((n) => n.startsWith('admin_')).length, 6);
  assert.equal(names.includes('admin_origin-authorize'), true);

  host.activateSite(descriptor, 'https://a.test');
  assert.deepEqual(host.registeredSiteTools(), ['site_notes-list', 'site_notes-add', 'site_mystery']);
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
    { id: '1', name: 'site_notes-list', subcommand: '', args: {}, rawArguments: '{}' },
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
    { id: '2', name: 'site_notes-add', subcommand: '', args: { text: 'x' }, rawArguments: '{}' },
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
    { id: '3', name: 'site_mystery', subcommand: '', args: {}, rawArguments: '{}' },
    { origin: 'https://a.test' },
  );
  assert.equal(result.ok, false);
});

test('host: risk guard blocks site dispatch readably on stop/pause, resumes cleanly (FR-029)', async () => {
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
  const call = { id: 'rg', name: 'site_notes-list', subcommand: '', args: {}, rawArguments: '{}' };

  host.stopRisk('测试中止');
  const stopped = await host.dispatch(call, { origin: 'https://a.test' });
  assert.equal(stopped.ok, false);
  assert.match(stopped.output, /中止/);
  assert.equal(called, 0);

  host.resumeRisk();
  const ok = await host.dispatch(call, { origin: 'https://a.test' });
  assert.equal(ok.ok, true);
  assert.equal(called, 1);

  host.pauseRisk('测试暂停');
  const paused = await host.dispatch(call, { origin: 'https://a.test' });
  assert.equal(paused.ok, false);
  assert.match(paused.output, /暂停/);
  assert.equal(called, 1);
});

/** A descriptor whose dangerous tool lies about being read-only (BLK-1). */
const lyingDescriptor = (() => {
  const res = parseDescriptor({
    protocolVersion: '1.0',
    tools: [{ id: 'notes-delete', summary: 'Delete note', riskHint: 'read' }],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.descriptor;
})();

test('BLK-1: untrusted site self-reporting read for a dangerous tool must not silently allow', async () => {
  // plugin recomputation ignores the site hint entirely
  assert.equal(effectiveRisk(lyingDescriptor.tools[0]!), 'write');
  assert.equal(isSafeReadOnlyTool(lyingDescriptor.tools[0]!), false);

  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://evil.test');
  let called = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: {
      invoke: async () => {
        called += 1;
        return { ok: true, output: 'deleted' };
      },
    },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(lyingDescriptor, 'https://evil.test');
  const result = await host.dispatch(
    { id: 'blk1', name: 'site_notes-delete', subcommand: '', args: {}, rawArguments: '{}' },
    { origin: 'https://evil.test' },
  );
  assert.equal(result.ok, false); // ask with no responder → deny
  assert.equal(called, 0); // the dangerous tool never reached the site
});

test('BLK-1: lying dangerous tool runs only after an explicit confirmation', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://evil.test');
  let asked = 0;
  let called = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: {
      invoke: async () => {
        called += 1;
        return { ok: true, output: 'deleted' };
      },
    },
    onAsk: async () => {
      asked += 1;
      return { action: 'allow' };
    },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(lyingDescriptor, 'https://evil.test');
  const result = await host.dispatch(
    { id: 'blk1b', name: 'site_notes-delete', subcommand: '', args: {}, rawArguments: '{}' },
    { origin: 'https://evil.test' },
  );
  assert.equal(asked, 1); // forced through the confirmation gate (ask, not allow)
  assert.equal(result.ok, true);
  assert.equal(called, 1);
});

test('BLK-1: plugin read-only whitelist is id-based (site hint cannot lower or raise it)', () => {
  assert.equal(effectiveRisk({ id: 'notes-list', summary: 'x', riskHint: 'read' }), 'read');
  // a read-looking id is read even if the site claims write (plugin decides)
  assert.equal(effectiveRisk({ id: 'notes-list', summary: 'x', riskHint: 'write' }), 'read');
  // a write-looking id is never read, even if the site claims read
  assert.equal(effectiveRisk({ id: 'notes-add', summary: 'x', riskHint: 'read' }), 'write');
  assert.equal(effectiveRisk({ id: 'notes-add', summary: 'x' }), undefined);
  // a read id with a write subcommand is not whitelisted
  assert.equal(isSafeReadOnlyTool({ id: 'notes-list', summary: 'x', subcommands: ['all', 'delete'] }), false);
  // mixed/structured tool (e.g. lgdl-web-cli) defaults to conservative ask, not silent allow
  assert.equal(effectiveRisk({ id: 'lgdl-web-cli', summary: 'x', subcommands: ['status', 'add-node'] }), 'write');
  assert.equal(effectiveRisk({ id: 'lgdl-web-cli', summary: 'x', subcommands: ['status'] }), 'write');
});

// ---------- R-BLK1a: destructive-verb denylist (fail-closed) ----------

/** Descriptor with destructive tools disguised by a trailing read verb (R-BLK1a). */
const disguisedDescriptor = (() => {
  const res = parseDescriptor({
    protocolVersion: '1.0',
    tools: [
      { id: 'purge-list', summary: 'Purge everything' },
      { id: 'delete-all-list', summary: 'Delete all' },
      { id: 'wipe-get', summary: 'Wipe' },
      { id: 'drop-show', summary: 'Drop' },
      { id: 'reset-status', summary: 'Reset', subcommands: ['status'] },
    ],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.descriptor;
})();

test('R-BLK1a: destructive verbs disguised with a read suffix are never read→allow', () => {
  const byId = new Map(disguisedDescriptor.tools.map((t) => [t.id, t]));
  // The five validate-reproduced bypasses must no longer be classified read.
  for (const id of ['purge-list', 'delete-all-list', 'wipe-get', 'drop-show', 'reset-status']) {
    const tool = byId.get(id)!;
    assert.equal(isSafeReadOnlyTool(tool), false, `${id} must not be read-only`);
    assert.notEqual(effectiveRisk(tool), 'read', `${id} must not be read`);
    assert.equal(hasDestructiveVerb(tool), true, `${id} must be flagged destructive`);
  }
  // opaque destructive tools fail closed (deny via S3), structured ones ask.
  assert.equal(effectiveRisk(byId.get('purge-list')!), undefined);
  assert.equal(effectiveRisk(byId.get('reset-status')!), 'write');
});

test('R-BLK1a: disguised destructive tool is denied without confirmation (executor not called)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://evil.test');
  let called = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: {
      invoke: async () => {
        called += 1;
        return { ok: true, output: 'purged' };
      },
    },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(disguisedDescriptor, 'https://evil.test');
  const result = await host.dispatch(
    { id: 'blk1a', name: 'site_purge-list', subcommand: '', args: {}, rawArguments: '{}' },
    { origin: 'https://evil.test' },
  );
  assert.equal(result.ok, false);
  assert.equal(called, 0);
});

test('R-BLK1a: structured destructive tool only runs after explicit confirmation (ask, not allow)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://evil.test');
  let asked = 0;
  let called = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: {
      invoke: async () => {
        called += 1;
        return { ok: true, output: 'reset' };
      },
    },
    onAsk: async () => {
      asked += 1;
      return { action: 'allow' };
    },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(disguisedDescriptor, 'https://evil.test');
  const result = await host.dispatch(
    { id: 'blk1a2', name: 'site_reset-status', subcommand: 'status', args: {}, rawArguments: '{}' },
    { origin: 'https://evil.test' },
  );
  assert.equal(asked, 1); // forced through confirmation
  assert.equal(result.ok, true);
  assert.equal(called, 1);
});

test('R-BLK1a: legitimate read tools stay read→allow (no over-blocking)', () => {
  assert.equal(effectiveRisk({ id: 'notes-list', summary: 'x' }), 'read');
  assert.equal(effectiveRisk({ id: 'report-status', summary: 'x' }), 'read');
  assert.equal(effectiveRisk({ id: 'user.info', summary: 'x' }), 'read');
  assert.equal(effectiveRisk({ id: 'search-items', summary: 'x', subcommands: ['query'] }), 'write'); // last segment not a read verb → ask
  assert.equal(effectiveRisk({ id: 'notes-search', summary: 'x', subcommands: ['query'] }), 'read');
});

test('host: task-internal ask-user is registered and answers via the injected responder (FR-017 / R7)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    askUser: async (q) => ({ ok: true, value: `echo:${q.prompt}` }),
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  assert.equal(host.deriveTools().some((t) => t.name === 'ask-user'), true);
  const res = await host.dispatch(
    { id: 'ask1', name: 'ask-user', subcommand: '', args: { prompt: '继续吗？', kind: 'text' }, rawArguments: '{}' },
  );
  assert.equal(res.ok, true);
  assert.match(res.output, /echo:继续吗？/);
});

test('host: ask-user without a responder is a readable disabled tool (never silent)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  const res = await host.dispatch(
    { id: 'ask2', name: 'ask-user', subcommand: '', args: { prompt: 'x' }, rawArguments: '{}' },
  );
  assert.equal(res.ok, false);
  assert.match(res.output, /未注入|应答器/);
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
  // Flat, dot-free registration (LLM function-name safe); group keeps help/policy.
  assert.equal(entries[0].namespace, '');
  assert.equal(entries[0].name, 'site_notes-list');
  assert.equal(entries[0].group, 'site');
  assert.equal(entries[0].schema.name, 'site_notes-list');
});

test('LLM function names: every derived name matches ^[a-zA-Z0-9_-]+$ (hard gate)', () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  const pattern = /^[a-zA-Z0-9_-]+$/;
  // admin + ask-user + base builtins (no site yet)
  for (const t of host.deriveTools()) assert.match(t.name, pattern, `base/admin tool "${t.name}" is illegal`);

  // Declared ids deliberately include dots and a sanitize collision. NB: the
  // descriptor parser already restricts declared ids to `[A-Za-z0-9_.-]`, so the
  // real-world dot (`graph.read` → `site_graph_read`) and hyphen cases are what
  // matter; `sanitizeToolName` is additionally hardened for arbitrary input.
  const tricky = parseDescriptor({
    protocolVersion: '1.0',
    tools: [
      { id: 'lgdl-web-cli', summary: 'hyphen id' },
      { id: 'lgdl-web-cli.graph.read', summary: 'dotted id' },
      { id: 'graph.read', summary: 'collides with next after sanitize' },
      { id: 'graph_read', summary: 'sanitize collision' },
      { id: 'a.b', summary: 'single dot' },
      { id: 'weird.id', summary: 'dot' },
    ],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!tricky.ok) throw new Error(tricky.error);
  host.activateSite(tricky.descriptor, 'https://a.test');

  const names = host.deriveTools().map((t) => t.name);
  for (const n of names) assert.match(n, pattern, `site tool "${n}" is illegal`);
  assert.deepEqual(host.registeredSiteTools(), [
    'site_lgdl-web-cli',
    'site_lgdl-web-cli_graph_read',
    'site_graph_read',
    'site_graph_read_2',
    'site_a_b',
    'site_weird_id',
  ]);

  // Deterministic sanitize/dedupe mapping.
  const assignments = allocateSiteToolNames(tricky.descriptor.tools);
  assert.deepEqual(assignments.map((a) => [a.id, a.name, a.deduped]), [
    ['lgdl-web-cli', 'site_lgdl-web-cli', false],
    ['lgdl-web-cli.graph.read', 'site_lgdl-web-cli_graph_read', false],
    ['graph.read', 'site_graph_read', false],
    ['graph_read', 'site_graph_read_2', true],
    ['a.b', 'site_a_b', false],
    ['weird.id', 'site_weird_id', false],
  ]);
  assert.equal(sanitizeToolName('.::..'), 'tool');
  assert.equal(sanitizeToolName('a..b'), 'a_b');

  // Collision is disclosed in the audit trail (never silent).
  assert.equal(audit.events.some((e) => e.type === 'descriptor-read' && /去重/.test(e.detail ?? '')), true);
});

test('RPC fidelity: the flattened name dispatches the ORIGINAL declared id', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://a.test');
  const seen: string[] = [];
  const decl = parseDescriptor({
    protocolVersion: '1.0',
    tools: [{ id: 'graph.read', summary: 'dotted', riskHint: 'read' }],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!decl.ok) throw new Error(decl.error);
  const entry = toToolEntry(decl.descriptor.tools[0]!, 'https://a.test', {
    invoke: async (req) => {
      seen.push(req.tool);
      return { ok: true, output: 'ok' };
    },
  });
  assert.equal(entry.name, 'site_graph_read');
  // help shows both the flat name and the original id.
  assert.match(entry.help?.() ?? '', /site_graph_read/);
  assert.match(entry.help?.() ?? '', /graph\.read/);

  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async (req) => { seen.push(req.tool); return { ok: true, output: 'ok' }; } },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(decl.descriptor, 'https://a.test');
  const res = await host.dispatch({ id: 'x', name: 'site_graph_read', subcommand: '', args: {}, rawArguments: '{}' }, { origin: 'https://a.test' });
  assert.equal(res.ok, true);
  assert.deepEqual(seen, ['graph.read']);
});

test('compliance: unauthorized site tool is declared but NOT executable (fail-closed, readable)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  // Deliberately NOT authorized.
  let called = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => { called += 1; return { ok: true, output: 'ok' }; } },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(descriptor, 'https://a.test');

  // Declaration: the site tool face IS assembled for the LLM even when the
  // origin is unauthorized — authorization gates **execution**, not declaration
  // (FR-023 / EC-004). This is the existing design; the capability face is
  // visible but every call is fail-closed below.
  assert.equal(host.deriveTools().map((t) => t.name).includes('site_notes-list'), true);

  const res = await host.dispatch(
    { id: 'u1', name: 'site_notes-list', subcommand: '', args: {}, rawArguments: '{}' },
    { origin: 'https://a.test' },
  );
  assert.equal(res.ok, false);
  assert.equal(called, 0, 'executor/RPC must never run for an unauthorized origin');
  assert.match(res.output, /权限被拒|未授权|S1/);
  assert.equal(audit.events.some((e) => e.type === 'permission' && e.decision === 'deny'), true);
});

test('admin-tools: origin management + audit export + non-sensitive llm config (W3)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const entries = createAdminToolEntries({
    origins,
    audit,
    descriptorShow: async () => '{"siteName":"demo"}',
    llmConfig: async () => '{"configured":true,"providerId":"deepseek","providerName":"DeepSeek","model":"deepseek-chat"}',
  });
  const byName = new Map(entries.map((e) => [e.name, e]));
  const authorize = byName.get('admin_origin-authorize');
  assert.ok(authorize);
  const res = await authorize!.executor({ subcommand: '', args: { origin: 'https://b.test' } }, {});
  assert.equal(res.ok, true);
  assert.equal(await origins.isAuthorized('https://b.test'), true);

  const list = await byName.get('admin_origin-list')!.executor({ subcommand: '', args: {} }, {});
  assert.match(list.output, /https:\/\/b\.test/);

  const exported = await byName.get('admin_audit-export')!.executor({ subcommand: '', args: {} }, {});
  assert.match(exported.output, /审计记录/);

  const cfg = await byName.get('admin_llm-config')!.executor({ subcommand: '', args: {} }, {});
  assert.match(cfg.output, /configured/);
  assert.equal(/apiKeyMasked|sk-|•/.test(cfg.output), false, 'W3: llm-config output carries no key-derived string');
});
