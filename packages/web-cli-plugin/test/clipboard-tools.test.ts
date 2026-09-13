/**
 * FR-055 (TASK-039) — `clipboard` tool (read + write, optional permissions).
 *
 * Proves: subcommand risk table (read=`state`, write=`write`, cropped rich
 * subcommands never below `write`/`state`); the read half defaults OFF and the
 * write half defaults ON; **clipboard read is NEVER auto-authorized even with
 * 「读操作自动」on** (state tier + plugin group both keep it at `ask`); the cropped
 * `write-html`/`write-image`/`paste-read` return readable「未实现」refusals; the
 * permission/toggle gates are readable; and the audit trail + confirmation
 * summary carry **zero clipboard plaintext**.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import { createAutoAuthStore, decideAutoAuthorization } from '../src/security/auto-authorize.js';
import { createConfirmBridge, scrubContentArgs, buildOperationSummary } from '../src/security/confirm.js';
import {
  CLIPBOARD_CROPPED_SUBCOMMANDS,
  CLIPBOARD_NOT_ENABLED_TEXT,
  CLIPBOARD_READ_DISABLED_TEXT,
  CLIPBOARD_SUBCOMMAND_RISKS,
  CLIPBOARD_SUBCOMMANDS,
  CLIPBOARD_TOOL_NAME,
  createClipboardToolEntry,
  type ClipboardIoResult,
  type ClipboardToolDeps,
} from '../src/tools/clipboard-tools.js';
import type { AskQuestion, ToolEntry } from '@lgdl/web-cli-base';

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

const SECRET_CLIP = 'SECRET-CLIPBOARD-CONTENT';

interface Calls {
  read: number;
  write: number;
}

function makeDeps(overrides: Partial<ClipboardToolDeps> = {}): {
  deps: ClipboardToolDeps;
  audit: ReturnType<typeof createStorageAuditSink>;
  calls: Calls;
} {
  const audit = createStorageAuditSink(memoryKv());
  const calls: Calls = { read: 0, write: 0 };
  const deps: ClipboardToolDeps = {
    hasReadPermission: async () => true,
    hasWritePermission: async () => true,
    readEnabled: () => true,
    writeEnabled: () => true,
    readText: async (): Promise<ClipboardIoResult> => {
      calls.read += 1;
      return { ok: true, text: SECRET_CLIP, chars: SECRET_CLIP.length, path: 'test' };
    },
    writeText: async (): Promise<ClipboardIoResult> => {
      calls.write += 1;
      return { ok: true, chars: SECRET_CLIP.length, path: 'test' };
    },
    audit,
    ...overrides,
  };
  return { deps, audit, calls };
}

const call = (subcommand: string, args: Record<string, string> = {}) => ({
  id: 't',
  name: CLIPBOARD_TOOL_NAME,
  subcommand,
  args,
  rawArguments: '{}',
});

async function run(entry: ToolEntry, subcommand: string, args: Record<string, string> = {}) {
  const res = await entry.executor!(call(subcommand, args), {} as never);
  return res as { ok: boolean; output: string; error?: string };
}

// ── risk + baseline coverage ─────────────────────────────────────────────────

test('FR-055 clipboard: subcommand risk table (read=state, write=write) covers the baseline surface', () => {
  assert.deepEqual(CLIPBOARD_SUBCOMMAND_RISKS, {
    read: 'state',
    write: 'write',
    'write-html': 'write',
    'write-image': 'write',
    'paste-read': 'state',
  });
  // The parity gate requires every baseline subcommand in the schema.
  for (const sub of ['read', 'write', 'write-html', 'write-image', 'paste-read']) {
    assert.equal((CLIPBOARD_SUBCOMMANDS as readonly string[]).includes(sub), true, `${sub} must be declared`);
  }
  assert.deepEqual([...CLIPBOARD_CROPPED_SUBCOMMANDS], ['write-html', 'write-image', 'paste-read']);
  const entry = createClipboardToolEntry(makeDeps().deps);
  assert.equal(entry.name, 'clipboard');
  assert.equal(entry.group, 'plugin');
  assert.equal(entry.risk, 'state', 'top-level risk is the conservative state tier');
});

// ── permission + privacy gates ───────────────────────────────────────────────

test('FR-055 clipboard: unauthorized returns a readable 未开启 refusal (zero ops)', async () => {
  const { deps, calls } = makeDeps({ hasReadPermission: async () => false, hasWritePermission: async () => false });
  const entry = createClipboardToolEntry(deps);
  const r = await run(entry, 'read');
  assert.equal(r.ok, false);
  assert.match(r.output, /未开启/);
  assert.match(r.output, /开启剪贴板访问/);
  const w = await run(entry, 'write', { text: 'x' });
  assert.equal(w.ok, false);
  assert.match(w.output, /未开启/);
  assert.equal(CLIPBOARD_NOT_ENABLED_TEXT.includes('未开启'), true);
  assert.deepEqual(calls, { read: 0, write: 0 });
});

test('FR-055 clipboard: read toggle OFF (the default) → readable refusal; write unaffected', async () => {
  const { deps, calls } = makeDeps({ readEnabled: () => false });
  const entry = createClipboardToolEntry(deps);
  const r = await run(entry, 'read');
  assert.equal(r.ok, false);
  assert.equal(r.output, CLIPBOARD_READ_DISABLED_TEXT);
  assert.match(r.output, /默认关/);
  assert.equal(calls.read, 0, 'no clipboard read may occur while the toggle is off');
  const w = await run(entry, 'write', { text: 'ok' });
  assert.equal(w.ok, true);
  assert.equal(calls.write, 1);
});

test('FR-055 clipboard: write toggle OFF → readable refusal', async () => {
  const { deps, calls } = makeDeps({ writeEnabled: () => false });
  const entry = createClipboardToolEntry(deps);
  const w = await run(entry, 'write', { text: 'x' });
  assert.equal(w.ok, false);
  assert.match(w.output, /已关闭/);
  assert.equal(calls.write, 0);
});

// ── implemented subcommands ──────────────────────────────────────────────────

test('FR-055 clipboard read: returns the text (and empty is labelled)', async () => {
  const { deps } = makeDeps();
  const entry = createClipboardToolEntry(deps);
  const res = await run(entry, 'read');
  assert.equal(res.ok, true);
  assert.equal(res.output, SECRET_CLIP);

  const empty = makeDeps({ readText: async () => ({ ok: true, text: '', chars: 0, path: 'test' }) });
  const r2 = await run(createClipboardToolEntry(empty.deps), 'read');
  assert.equal(r2.output, '（剪贴板为空）');
});

test('FR-055 clipboard write: requires --text; writes once', async () => {
  const { deps, calls } = makeDeps();
  const entry = createClipboardToolEntry(deps);
  const missing = await run(entry, 'write');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /需要 --text/);
  assert.equal(calls.write, 0);

  const ok = await run(entry, 'write', { text: 'hello' });
  assert.equal(ok.ok, true);
  assert.equal(calls.write, 1);
});

test('FR-055 clipboard: cropped rich subcommands return a readable 未实现 refusal (no IO)', async () => {
  const { deps, calls } = makeDeps();
  const entry = createClipboardToolEntry(deps);
  for (const sub of ['write-html', 'write-image', 'paste-read']) {
    const res = await run(entry, sub, { text: 'x', html: '<b>x</b>' });
    assert.equal(res.ok, false, `${sub} must be refused`);
    assert.match(res.output, /未实现/);
    assert.equal(res.error, 'clipboard-not-implemented');
  }
  assert.deepEqual(calls, { read: 0, write: 0 });
});

test('FR-055 clipboard: unknown subcommand is a readable refusal', async () => {
  const { deps } = makeDeps();
  const entry = createClipboardToolEntry(deps);
  const res = await run(entry, 'nuke');
  assert.equal(res.ok, false);
  assert.match(res.output, /未知子命令/);
});

// ── audit zero-plaintext ─────────────────────────────────────────────────────

test('FR-055 clipboard audit: content never enters the audit trail (lengths + path only)', async () => {
  const { deps, audit } = makeDeps();
  const entry = createClipboardToolEntry(deps);
  await run(entry, 'read');
  await run(entry, 'write', { text: SECRET_CLIP });
  const json = JSON.stringify(audit.events);
  assert.equal(json.includes(SECRET_CLIP), false, 'clipboard content must never be audited');
  assert.equal(audit.events.every((e) => e.type === 'clipboard'), true);
  assert.equal(audit.events.some((e) => /chars=\d+/.test(e.detail ?? '')), true);
});

test('FR-055 confirm scrub: clipboard/notify content is replaced before the summary + audit', async () => {
  // Pure scrubber.
  const scrubbed = scrubContentArgs('clipboard', { text: SECRET_CLIP, extra: 'keep' });
  assert.equal(JSON.stringify(scrubbed).includes(SECRET_CLIP), false);
  assert.equal(scrubbed?.extra, 'keep');
  assert.equal(JSON.stringify(scrubContentArgs('notify', { title: SECRET_CLIP })).includes(SECRET_CLIP), false);
  // Other tools are untouched (no over-scrubbing).
  assert.deepEqual(scrubContentArgs('dom', { text: SECRET_CLIP }), { text: SECRET_CLIP });

  // The bridge summary + `confirm` audit event must be plaintext-free.
  const audit = createStorageAuditSink(memoryKv());
  const bridge = createConfirmBridge({
    audit,
    currentOrigin: () => 'https://a.test',
    ask: async () => ({ action: 'allow' }),
  });
  const question = {
    tool: 'clipboard',
    group: 'plugin',
    risk: 'state',
    reason: '需要确认',
    subcommand: 'write',
    args: { text: SECRET_CLIP },
  } as unknown as AskQuestion;
  const summary = buildOperationSummary({
    origin: 'https://a.test',
    tool: question.tool,
    subcommand: question.subcommand,
    args: scrubContentArgs(question.tool, question.args),
    risk: question.risk,
    reason: question.reason,
  });
  assert.equal(summary.includes(SECRET_CLIP), false, 'confirm summary must not carry clipboard content');
  assert.match(summary, /已省略/);
  const resolution = await bridge(question);
  assert.equal(resolution.action, 'allow');
  assert.equal(JSON.stringify(audit.events).includes(SECRET_CLIP), false, 'confirm audit must be plaintext-free');
});

// ── hard floor: clipboard read is never auto-authorized ──────────────────────

test('FR-055 clipboard read: state tier is never auto-authorized (pure decision)', () => {
  const settings = { read: true, write: true };
  // Plugin group (the real registration) — no auto path at all.
  const plugin = decideAutoAuthorization({
    origin: 'https://a.test',
    group: 'plugin',
    risk: 'state',
    destructive: false,
    settings,
  });
  assert.equal(plugin.allow, false, 'clipboard read must never auto-allow');
  // Even on the site path, `state` is not classifiable → fail-closed hard deny.
  const site = decideAutoAuthorization({
    origin: 'https://a.test',
    group: 'site',
    risk: 'state',
    destructive: false,
    settings,
  });
  assert.equal(site.allow, false, 'state tier must never auto-allow');
  assert.equal(site.hardDeny, true, 'state tier is a fail-closed hard deny');
});

function buildHost(opts: {
  read: boolean;
  write: boolean;
  autoRead: boolean;
  readPermission?: boolean;
  writePermission?: boolean;
}) {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const auto = createAutoAuthStore(memoryKv(), { audit });
  let asks = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    currentOrigin: () => 'https://a.test',
    onAsk: async () => {
      asks += 1;
      return { action: 'allow' };
    },
    autoAuth: { isEnabled: (_o, tier) => (tier === 'read' ? opts.autoRead : false) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    clipboard: {
      hasReadPermission: async () => opts.readPermission !== false,
      hasWritePermission: async () => opts.writePermission !== false,
      readText: async () => ({ ok: true, text: SECRET_CLIP, chars: SECRET_CLIP.length, path: 'test' }),
      writeText: async () => ({ ok: true, chars: SECRET_CLIP.length, path: 'test' }),
      audit,
    },
    clipboardEnabled: { read: opts.read, write: opts.write },
    // no `auto` deps used; switches come from `autoAuth`
  });
  void auto;
  return { host, audit, asks: () => asks };
}

test('FR-055 host: read-auto ON still ASKS for clipboard read (state never auto-released)', async () => {
  const h = buildHost({ read: true, write: true, autoRead: true });
  const res = await h.host.dispatch(call('read'), { origin: 'https://a.test' });
  assert.equal(res.ok, true);
  assert.equal(h.asks(), 1, 'clipboard read must go through the manual confirmation even with read-auto ON');
  const autoAllows = h.audit.events.filter((e) => e.type === 'auto-authorize' && e.decision === 'allow');
  assert.equal(autoAllows.length, 0, 'no auto-allow record may exist for clipboard read');
  // The confirmation audit must not carry the clipboard content.
  assert.equal(JSON.stringify(h.audit.events).includes(SECRET_CLIP), false, 'confirm/auto audit must be plaintext-free');
});

test('FR-055 host: clipboard tool stays while write is on; leaves deriveTools() when both toggles off', async () => {
  const h = buildHost({ read: false, write: true, autoRead: false });
  assert.equal(h.host.deriveTools().some((t) => t.name === CLIPBOARD_TOOL_NAME), true, 'write-on keeps the tool');
  h.host.setClipboardEnabled({ read: false, write: false });
  assert.equal(
    h.host.deriveTools().some((t) => t.name === CLIPBOARD_TOOL_NAME),
    false,
    'both toggles off → the tool leaves the LLM surface',
  );
  const rejected = await h.host.dispatch(call('write', { text: 'x' }), { origin: 'https://a.test' });
  assert.equal(rejected.ok, false, 'dispatch of a removed tool is rejected (never silent)');
  h.host.setClipboardEnabled({ read: false, write: true });
  assert.equal(h.host.deriveTools().some((t) => t.name === CLIPBOARD_TOOL_NAME), true);
});

test('FR-055 host: clipboard permission revocation suppression removes the tool immediately', () => {
  const h = buildHost({ read: true, write: true, autoRead: false });
  assert.equal(h.host.deriveTools().some((t) => t.name === CLIPBOARD_TOOL_NAME), true);
  h.host.suppressCapability('clipboard', true);
  assert.equal(h.host.deriveTools().some((t) => t.name === CLIPBOARD_TOOL_NAME), false, 'revocation must unregister');
  assert.equal(h.host.isCapabilitySuppressed('clipboard'), true);
  h.host.suppressCapability('clipboard', false);
  assert.equal(h.host.deriveTools().some((t) => t.name === CLIPBOARD_TOOL_NAME), true);
});
