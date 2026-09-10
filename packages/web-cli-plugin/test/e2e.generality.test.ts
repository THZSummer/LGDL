import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import { parseDescriptorJson } from '../src/protocol/descriptor.js';
import { parseHtmlDeclaration } from '../src/discovery/static-declaration.js';
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

/** Minimal in-memory re-implementation of the fixture page RPC (rpc.js). */
function fixtureRpc() {
  const notes = ['welcome'];
  const calls: string[] = [];
  return {
    calls,
    rpc: {
      async invoke(req: { tool: string; args: Record<string, string> }): Promise<ToolResult> {
        calls.push(req.tool);
        if (req.tool === 'notes-list') return { ok: true, output: notes.join('\n') };
        if (req.tool === 'notes-add') {
          notes.push(req.args.text ?? '');
          return { ok: true, output: '✓ note added', changed: true };
        }
        return { ok: false, output: '✖ unknown tool', error: 'unknown tool' };
      },
    },
  };
}

const fixtureUrl = new URL('../../test/fixtures/site/web-cli.json', import.meta.url);
const fixtureHtml = readFileSync(new URL('../../test/fixtures/site/index.html', import.meta.url), 'utf8');
const ORIGIN = 'https://fixture.example';

test('generality: non-LGDL fixture discovery → authorization → tool assembly → execution → audit', async () => {
  // 1. discovery: fixture HTML declares a relative href; resolve + parse
  const href = parseHtmlDeclaration(fixtureHtml, `${ORIGIN}/index.html`);
  assert.equal(href, `${ORIGIN}/web-cli.json`);
  const parsed = parseDescriptorJson(readFileSync(fixtureUrl, 'utf8'), { origin: ORIGIN, channel: 'html-link' });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.descriptor.tools.map((t) => t.id).includes('notes-add'), true);

  // 2. authorization
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize(ORIGIN);
  assert.equal(await origins.isAuthorized(ORIGIN), true);

  // 3. tool assembly + 4. execution
  const { rpc, calls } = fixtureRpc();
  const host = createWebCliHost({
    origins,
    audit,
    rpc,
    descriptorShow: async () => JSON.stringify(parsed.descriptor),
    llmConfig: async () => '{}',
  });
  host.activateSite(parsed.descriptor, ORIGIN);
  const names = host.deriveTools().map((t) => t.name);
  assert.equal(names.includes('site.notes-list'), true);
  assert.equal(names.includes('site.notes-add'), true);

  const read = await host.dispatch({ id: 'r1', name: 'site.notes-list', subcommand: '', args: {}, rawArguments: '{}' }, { origin: ORIGIN });
  assert.equal(read.ok, true);
  assert.match(read.output, /welcome/);

  const writeDenied = await host.dispatch({ id: 'r2', name: 'site.notes-add', subcommand: '', args: { text: 'x' }, rawArguments: '{}' }, { origin: ORIGIN });
  assert.equal(writeDenied.ok, false); // untrusted write requires confirmation

  assert.deepEqual(calls, ['notes-list']); // denied write never reached the site

  // 5. audit trail covers permission + tool-call
  const types = audit.events.map((e) => e.type);
  assert.equal(types.includes('permission'), true);
  assert.equal(types.includes('tool-call'), true);
});

test('generality: confirmation allows the untrusted write and audit records it', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize(ORIGIN);
  const { rpc, calls } = fixtureRpc();
  const host = createWebCliHost({
    origins,
    audit,
    rpc,
    onAsk: async () => ({ action: 'allow' }),
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  const parsed = parseDescriptorJson(readFileSync(fixtureUrl, 'utf8'), { origin: ORIGIN, channel: 'html-link' });
  if (!parsed.ok) throw new Error(parsed.error);
  host.activateSite(parsed.descriptor, ORIGIN);

  const write = await host.dispatch({ id: 'r3', name: 'site.notes-add', subcommand: '', args: { text: 'hello' }, rawArguments: '{}' }, { origin: ORIGIN });
  assert.equal(write.ok, true);
  assert.deepEqual(calls, ['notes-add']);
  assert.equal(audit.events.some((e) => e.type === 'permission' && e.decision === 'allow'), true);
});

test('generality: unauthorized origin is rejected before any site call', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const { rpc, calls } = fixtureRpc();
  const host = createWebCliHost({
    origins,
    audit,
    rpc,
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  const parsed = parseDescriptorJson(readFileSync(fixtureUrl, 'utf8'), { origin: ORIGIN, channel: 'html-link' });
  if (!parsed.ok) throw new Error(parsed.error);
  host.activateSite(parsed.descriptor, ORIGIN);
  const res = await host.dispatch({ id: 'r4', name: 'site.notes-list', subcommand: '', args: {}, rawArguments: '{}' }, { origin: ORIGIN });
  assert.equal(res.ok, false);
  assert.deepEqual(calls, []);
});

test('conflict detection: re-activation does not duplicate tool registration', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize(ORIGIN);
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  const parsed = parseDescriptorJson(readFileSync(fixtureUrl, 'utf8'), { origin: ORIGIN, channel: 'html-link' });
  if (!parsed.ok) throw new Error(parsed.error);

  host.activateSite(parsed.descriptor, ORIGIN);
  host.activateSite(parsed.descriptor, ORIGIN);
  assert.deepEqual(host.registeredSiteTools(), ['site.notes-list', 'site.notes-add']);

  // direct duplicate registration is refused by the upstream router (no double execution)
  assert.throws(() => host.router.register(host.router.query()[0]));
});
