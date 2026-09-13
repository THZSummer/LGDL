/**
 * FR-055 (TASK-039) — `notify` tool (read + write, optional permission).
 *
 * Proves: subcommand risk table (list=read / send,clear=write); the permission
 * gate returns a readable「未开启」for every subcommand (never a silent miss);
 * the privacy toggle gates the tool; `clear` is single-id (batch rejected);
 * `send` requires a title; the audit trail carries **zero content plaintext**
 * (only lengths); and the host removes/re-adds the tool with the toggle +
 * permission revocation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import {
  NOTIFY_DISABLED_TEXT,
  NOTIFY_NOT_ENABLED_TEXT,
  NOTIFY_SUBCOMMAND_RISKS,
  NOTIFY_SUBCOMMANDS,
  NOTIFY_TOOL_NAME,
  createNotifyToolEntry,
  type NotifyListing,
  type NotifyOperationResult,
  type NotifyToolDeps,
} from '../src/tools/notify-tools.js';
import type { ToolEntry } from '@lgdl/web-cli-base';

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

const SECRET_TITLE = 'SECRET-NOTIFY-TITLE';
const SECRET_BODY = 'SECRET-NOTIFY-BODY';

interface Calls {
  list: number;
  send: number;
  clear: number;
}

function makeDeps(overrides: Partial<NotifyToolDeps> = {}): {
  deps: NotifyToolDeps;
  audit: ReturnType<typeof createStorageAuditSink>;
  calls: Calls;
} {
  const audit = createStorageAuditSink(memoryKv());
  const calls: Calls = { list: 0, send: 0, clear: 0 };
  const deps: NotifyToolDeps = {
    hasPermission: async () => true,
    enabled: () => true,
    listNotifications: async (): Promise<NotifyListing> => {
      calls.list += 1;
      return { entries: [{ id: 'n-1', shown: true }, { id: 'n-2', shown: false }], permissionLevel: 'granted' };
    },
    createNotification: async (): Promise<NotifyOperationResult> => {
      calls.send += 1;
      return { ok: true, output: '✓ created', id: 'n-9' };
    },
    clearNotification: async (id): Promise<NotifyOperationResult> => {
      calls.clear += 1;
      return { ok: true, output: `✓ cleared ${id}` };
    },
    audit,
    ...overrides,
  };
  return { deps, audit, calls };
}

const call = (subcommand: string, args: Record<string, string> = {}) => ({
  id: 't',
  name: NOTIFY_TOOL_NAME,
  subcommand,
  args,
  rawArguments: '{}',
});

async function run(entry: ToolEntry, subcommand: string, args: Record<string, string> = {}) {
  const res = await entry.executor!(call(subcommand, args), {} as never);
  return res as { ok: boolean; output: string; error?: string };
}

// ── risk + surface ───────────────────────────────────────────────────────────

test('FR-055 notify: subcommand risk table + baseline `send` coverage', () => {
  assert.deepEqual(NOTIFY_SUBCOMMAND_RISKS, { list: 'read', send: 'write', clear: 'write' });
  // The baseline parity gate requires the `send` subcommand from base notify.
  assert.equal((NOTIFY_SUBCOMMANDS as readonly string[]).includes('send'), true);
  const entry = createNotifyToolEntry(makeDeps().deps);
  assert.equal(entry.name, 'notify');
  assert.equal(entry.group, 'plugin');
  assert.equal(entry.risk, 'write');
  assert.deepEqual(entry.subcommandRisks, { list: 'read', send: 'write', clear: 'write' });
});

// ── permission + toggle gates ────────────────────────────────────────────────

test('FR-055 notify: unauthorized returns the readable 未开启 notice for EVERY subcommand (zero ops)', async () => {
  const { deps, calls } = makeDeps({ hasPermission: async () => false });
  const entry = createNotifyToolEntry(deps);
  const cases: Array<[string, Record<string, string>]> = [
    ['list', {}],
    ['send', { title: 'x' }],
    ['clear', { id: 'n-1' }],
  ];
  for (const [sub, args] of cases) {
    const res = await run(entry, sub, args);
    assert.equal(res.ok, false, `${sub} must fail readably without permission`);
    assert.match(res.output, /未开启/);
    assert.match(res.output, /⚙ 设置 → 能力与隐私/);
    assert.match(res.output, /开启通知/);
  }
  assert.deepEqual(calls, { list: 0, send: 0, clear: 0 });
  assert.equal(NOTIFY_NOT_ENABLED_TEXT.includes('未开启'), true);
});

test('FR-055 notify: privacy toggle off → readable refusal, zero ops', async () => {
  const { deps, calls } = makeDeps({ enabled: () => false });
  const entry = createNotifyToolEntry(deps);
  const res = await run(entry, 'send', { title: 'x' });
  assert.equal(res.ok, false);
  assert.equal(res.output, NOTIFY_DISABLED_TEXT);
  assert.equal(calls.send, 0);
});

// ── subcommands ──────────────────────────────────────────────────────────────

test('FR-055 notify list: readable ids + permission level, no content echo', async () => {
  const { deps } = makeDeps();
  const entry = createNotifyToolEntry(deps);
  const res = await run(entry, 'list');
  assert.equal(res.ok, true);
  assert.match(res.output, /granted/);
  assert.match(res.output, /n-1/);
  assert.match(res.output, /当前显示 1 条/);
});

test('FR-055 notify send: requires --title; creates one notification', async () => {
  const { deps, calls } = makeDeps();
  const entry = createNotifyToolEntry(deps);
  const missing = await run(entry, 'send');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /需要 --title/);
  assert.equal(calls.send, 0);

  const ok = await run(entry, 'send', { title: 'hello', body: 'world' });
  assert.equal(ok.ok, true);
  assert.equal(calls.send, 1);
});

test('FR-055 notify clear: requires one --id, rejects batch', async () => {
  const { deps, calls } = makeDeps();
  const entry = createNotifyToolEntry(deps);
  const missing = await run(entry, 'clear');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /需要 --id/);

  const batch = await run(entry, 'clear', { all: 'true' });
  assert.equal(batch.ok, false);
  assert.match(batch.output, /禁止批量/);
  assert.equal(calls.clear, 0, 'batch intent must never reach chrome');

  const one = await run(entry, 'clear', { id: 'n-2' });
  assert.equal(one.ok, true);
  assert.equal(calls.clear, 1);
});

test('FR-055 notify: unknown subcommand is a readable refusal', async () => {
  const { deps } = makeDeps();
  const entry = createNotifyToolEntry(deps);
  const res = await run(entry, 'nuke');
  assert.equal(res.ok, false);
  assert.match(res.output, /未知子命令/);
});

// ── audit zero-plaintext ─────────────────────────────────────────────────────

test('FR-055 notify audit: notification content never enters the audit trail (lengths only)', async () => {
  const { deps, audit } = makeDeps();
  const entry = createNotifyToolEntry(deps);
  await run(entry, 'send', { title: SECRET_TITLE, body: SECRET_BODY });
  await run(entry, 'list');
  await run(entry, 'clear', { id: 'n-1' });
  const json = JSON.stringify(audit.events);
  assert.equal(json.includes(SECRET_TITLE), false, 'notification title must never be audited');
  assert.equal(json.includes(SECRET_BODY), false, 'notification body must never be audited');
  assert.equal(audit.events.every((e) => e.type === 'notify'), true);
  assert.equal(audit.events.some((e) => /titleLen=\d+/.test(e.detail ?? '')), true);
});

// ── host integration: toggle + suppression ───────────────────────────────────

function buildHost(opts: { enabled: boolean }) {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    currentOrigin: () => 'https://a.test',
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    notify: {
      hasPermission: async () => true,
      listNotifications: async () => ({ entries: [], permissionLevel: 'granted' }),
      createNotification: async () => ({ ok: true, output: 'created', id: 'n1' }),
      clearNotification: async () => ({ ok: true, output: 'cleared' }),
      audit,
    },
    notifyEnabled: opts.enabled,
  });
  return { host, audit };
}

test('FR-055 host: notify leaves deriveTools() when toggled off and dispatch is rejected readably', async () => {
  const h = buildHost({ enabled: true });
  assert.equal(h.host.deriveTools().some((t) => t.name === NOTIFY_TOOL_NAME), true);

  h.host.setNotifyEnabled(false);
  assert.equal(
    h.host.deriveTools().some((t) => t.name === NOTIFY_TOOL_NAME),
    false,
    'disabled notify must leave the LLM tool surface',
  );
  const rejected = await h.host.dispatch(call('list'), { origin: 'https://a.test' });
  assert.equal(rejected.ok, false, 'dispatch of a removed tool is rejected (never silent)');

  h.host.setNotifyEnabled(true);
  assert.equal(h.host.deriveTools().some((t) => t.name === NOTIFY_TOOL_NAME), true);
});

test('FR-055 host: notify permission revocation suppression removes the tool immediately; re-grant restores', () => {
  const h = buildHost({ enabled: true });
  assert.equal(h.host.deriveTools().some((t) => t.name === NOTIFY_TOOL_NAME), true);
  h.host.suppressCapability('notify', true);
  assert.equal(h.host.deriveTools().some((t) => t.name === NOTIFY_TOOL_NAME), false, 'revocation must unregister');
  assert.equal(h.host.isCapabilitySuppressed('notify'), true);
  h.host.suppressCapability('notify', false);
  assert.equal(h.host.deriveTools().some((t) => t.name === NOTIFY_TOOL_NAME), true);
});
