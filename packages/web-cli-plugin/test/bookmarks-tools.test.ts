/**
 * FR-054 — `bookmarks` tool (read + write, optional permission).
 *
 * Proves: per-subcommand risk table; privacy redaction (query/fragment stripped
 * by default); add scheme validation; destructive `remove` is single-id + no batch
 * and is **never** auto-authorized even with「写操作自动」on; unauthorized returns a
 * readable「未开启」notice for every subcommand (never a silent miss/pretend); the
 * privacy toggles gate the subcommand groups; the host removes the tool from
 * `deriveTools()` when both toggles are off and rejects dispatch readably; and the
 * audit trail carries zero plaintext.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createAutoAuthStore, decideAutoAuthorization } from '../src/security/auto-authorize.js';
import { createWebCliHost } from '../src/background/host.js';
import {
  BOOKMARKS_DESTRUCTIVE_SUBCOMMANDS,
  BOOKMARKS_NOT_ENABLED_TEXT,
  BOOKMARKS_READ_DISABLED_TEXT,
  BOOKMARKS_SUBCOMMAND_RISKS,
  BOOKMARKS_TOOL_NAME,
  BOOKMARKS_WRITE_DISABLED_TEXT,
  createBookmarksToolEntry,
  isBookmarksDestructive,
  type BookmarkOperationResult,
  type BookmarkRecord,
  type BookmarksToolDeps,
} from '../src/tools/bookmarks-tools.js';
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

const RAW: BookmarkRecord[] = [
  { id: '1', title: 'Root', folder: true },
  { id: '2', title: 'Example', url: 'https://example.com/page?secretmarker=1#frag' },
  { id: '3', title: 'https://looks-like-url.test/x?leak=2', url: 'https://other.test/plain' },
  { id: '4', title: 'Notes folder', folder: true },
];

interface Calls {
  list: number;
  search: number;
  tree: number;
  add: number;
  remove: number;
  move: number;
}

function makeDeps(overrides: Partial<BookmarksToolDeps> = {}): {
  deps: BookmarksToolDeps;
  audit: ReturnType<typeof createStorageAuditSink>;
  calls: Calls;
} {
  const audit = createStorageAuditSink(memoryKv());
  const calls: Calls = { list: 0, search: 0, tree: 0, add: 0, remove: 0, move: 0 };
  const deps: BookmarksToolDeps = {
    hasPermission: async () => true,
    readEnabled: () => true,
    writeEnabled: () => true,
    listBookmarks: async () => {
      calls.list += 1;
      return RAW;
    },
    searchBookmarks: async () => {
      calls.search += 1;
      return [RAW[1] as BookmarkRecord];
    },
    getTree: async () => {
      calls.tree += 1;
      return [{ id: '1', title: 'Root', folder: true, children: [RAW[1] as BookmarkRecord] }];
    },
    addBookmark: async () => {
      calls.add += 1;
      return { ok: true, output: '✓ added', id: '9' };
    },
    removeBookmark: async (id) => {
      calls.remove += 1;
      return { ok: true, output: `✓ removed ${id}` };
    },
    moveBookmark: async () => {
      calls.move += 1;
      return { ok: true, output: '✓ moved' };
    },
    audit,
    ...overrides,
  };
  return { deps, audit, calls };
}

const call = (subcommand: string, args: Record<string, string> = {}) => ({
  id: 't',
  name: BOOKMARKS_TOOL_NAME,
  subcommand,
  args,
  rawArguments: '{}',
});

async function run(entry: ToolEntry, subcommand: string, args: Record<string, string> = {}) {
  const res = await entry.executor!(call(subcommand, args), {} as never);
  return res as BookmarkOperationResult & { ok: boolean; output: string; error?: string };
}

// ── risk table ───────────────────────────────────────────────────────────────

test('FR-054 bookmarks: subcommand risk table (read vs write) + destructive remove', () => {
  assert.deepEqual(BOOKMARKS_SUBCOMMAND_RISKS, {
    list: 'read',
    search: 'read',
    tree: 'read',
    add: 'write',
    remove: 'write',
    move: 'write',
  });
  assert.equal(isBookmarksDestructive('remove'), true);
  assert.equal(isBookmarksDestructive('remove '), true);
  assert.equal(isBookmarksDestructive('add'), false);
  assert.equal(isBookmarksDestructive('move'), false);
  assert.equal(isBookmarksDestructive('list'), false);
  assert.equal(isBookmarksDestructive(undefined), false);
  assert.equal(BOOKMARKS_DESTRUCTIVE_SUBCOMMANDS.has('remove'), true);
});

// ── read path + privacy ──────────────────────────────────────────────────────

test('FR-054 bookmarks list: query/fragment stripped by default; --full is explicit', async () => {
  const { deps } = makeDeps();
  const entry = createBookmarksToolEntry(deps);
  const def = await run(entry, 'list');
  assert.equal(def.ok, true);
  assert.match(def.output, /https:\/\/example\.com\/page/);
  assert.equal(def.output.includes('secretmarker'), false, 'query string must not enter context by default');
  // A URL-like title (page without <title>) is projected the same way.
  assert.equal(def.output.includes('leak=2'), false, 'URL-like title query must not leak');

  const full = await run(entry, 'list', { full: 'true' });
  assert.equal(full.ok, true);
  assert.match(full.output, /secretmarker/);
  assert.match(full.output, /--full/);
});

test('FR-054 bookmarks search requires --query and returns matches', async () => {
  const { deps, calls } = makeDeps();
  const entry = createBookmarksToolEntry(deps);
  const missing = await run(entry, 'search');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /需要 --query/);
  assert.equal(calls.search, 0);

  const found = await run(entry, 'search', { query: 'example' });
  assert.equal(found.ok, true);
  assert.equal(calls.search, 1);
  assert.match(found.output, /Example/);
});

test('FR-054 bookmarks tree is bounded and redacts URLs', async () => {
  const { deps } = makeDeps();
  const entry = createBookmarksToolEntry(deps);
  const res = await run(entry, 'tree');
  assert.equal(res.ok, true);
  assert.match(res.output, /书签树/);
  assert.equal(res.output.includes('secretmarker'), false);
});

// ── write path ───────────────────────────────────────────────────────────────

test('FR-054 bookmarks add: only http(s) accepted, other schemes rejected readably', async () => {
  const { deps, calls } = makeDeps();
  const entry = createBookmarksToolEntry(deps);
  for (const scheme of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'chrome://settings']) {
    const res = await run(entry, 'add', { url: scheme });
    assert.equal(res.ok, false, `${scheme} must be rejected`);
    assert.match(res.output, /仅允许 http\(s\)/);
  }
  assert.equal(calls.add, 0, 'no chrome call for a rejected scheme');

  const ok = await run(entry, 'add', { url: 'https://ok.test/a', title: 'T' });
  assert.equal(ok.ok, true);
  assert.equal(calls.add, 1);
});

test('FR-054 bookmarks remove: requires one --id, rejects batch, marks destructive', async () => {
  const { deps, calls } = makeDeps();
  const entry = createBookmarksToolEntry(deps);

  const missing = await run(entry, 'remove');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /需要 --id/);

  const batch = await run(entry, 'remove', { all: 'true' });
  assert.equal(batch.ok, false);
  assert.match(batch.output, /禁止批量/);
  assert.equal(calls.remove, 0, 'batch intent must never reach chrome');

  const one = await run(entry, 'remove', { id: '42' });
  assert.equal(one.ok, true);
  assert.equal(calls.remove, 1);
});

test('FR-054 bookmarks move: requires --id + (parent|index)', async () => {
  const { deps, calls } = makeDeps();
  const entry = createBookmarksToolEntry(deps);
  const noId = await run(entry, 'move', { parent: '1' });
  assert.equal(noId.ok, false);
  const noDest = await run(entry, 'move', { id: '2' });
  assert.equal(noDest.ok, false);
  assert.match(noDest.output, /--parent .* 或 --index/);
  const ok = await run(entry, 'move', { id: '2', index: '0' });
  assert.equal(ok.ok, true);
  assert.equal(calls.move, 1);
});

test('FR-054 bookmarks: unknown subcommand is a readable refusal', async () => {
  const { deps } = makeDeps();
  const entry = createBookmarksToolEntry(deps);
  const res = await run(entry, 'nuke');
  assert.equal(res.ok, false);
  assert.match(res.output, /未知子命令/);
});

// ── permission gate ──────────────────────────────────────────────────────────

test('FR-054 bookmarks: unauthorized returns the readable 未开启 notice for EVERY subcommand (zero ops)', async () => {
  const { deps, calls } = makeDeps({ hasPermission: async () => false });
  const entry = createBookmarksToolEntry(deps);
  for (const sub of ['list', 'search', 'tree', 'add', 'remove', 'move']) {
    const res = await run(entry, sub, sub === 'add' ? { url: 'https://x.test' } : sub === 'remove' ? { id: '1' } : sub === 'move' ? { id: '1', index: '0' } : sub === 'search' ? { query: 'q' } : {});
    assert.equal(res.ok, false, `${sub} must fail readably without permission`);
    assert.match(res.output, /未开启/);
    assert.match(res.output, /⚙ 设置 → 能力与隐私/);
    assert.match(res.output, /开启书签访问/);
  }
  assert.deepEqual(calls, { list: 0, search: 0, tree: 0, add: 0, remove: 0, move: 0 });
  assert.equal(BOOKMARKS_NOT_ENABLED_TEXT.includes('未开启'), true);
});

test('FR-054 bookmarks: privacy toggles gate the subcommand groups readably', async () => {
  const readOff = makeDeps({ readEnabled: () => false });
  const entry = createBookmarksToolEntry(readOff.deps);
  const r = await run(entry, 'list');
  assert.equal(r.ok, false);
  assert.equal(r.output, BOOKMARKS_READ_DISABLED_TEXT);

  const writeOff = makeDeps({ writeEnabled: () => false });
  const entry2 = createBookmarksToolEntry(writeOff.deps);
  const w = await run(entry2, 'add', { url: 'https://x.test' });
  assert.equal(w.ok, false);
  assert.equal(w.output, BOOKMARKS_WRITE_DISABLED_TEXT);
  assert.equal(writeOff.calls.add, 0);
  // read is unaffected by the write toggle
  assert.equal((await run(entry2, 'list')).ok, true);
});

// ── audit privacy ────────────────────────────────────────────────────────────

test('FR-054 bookmarks audit: zero plaintext (no raw query / secret in any event)', async () => {
  const { deps, audit } = makeDeps();
  const entry = createBookmarksToolEntry(deps);
  await run(entry, 'list', { full: 'true' });
  await run(entry, 'search', { query: 'secretmarker' });
  await run(entry, 'add', { url: 'https://ok.test/a?token=SECRETVAL', title: 'T' });
  const json = JSON.stringify(audit.events);
  assert.equal(json.includes('SECRETVAL'), false, 'raw query token must never be audited');
  assert.equal(json.includes('secretmarker'), false, 'search needle must not be audited verbatim');
  assert.equal(audit.events.every((e) => e.type === 'bookmarks'), true);
  assert.equal(audit.events.some((e) => e.subcommand === 'remove' || e.subcommand === 'move' || e.subcommand === 'list'), true);
});

// ── destructive hard floor (write-auto must NOT release remove) ───────────────

test('FR-054 bookmarks remove: destructive classification blocks auto-authorization even with write auto on', () => {
  const settings = { read: true, write: true };
  // The classification used by the host for the plugin-level tool:
  const destructive = isBookmarksDestructive('remove');
  assert.equal(destructive, true);
  // Even if the invocation were judged by the site-tool path, hard floor 4 holds.
  const decision = decideAutoAuthorization({
    origin: 'https://a.test',
    group: 'site',
    risk: 'write',
    destructive,
    settings,
  });
  assert.equal(decision.allow, false, 'destructive bookmarks remove must never auto-allow');
  assert.match(decision.reason, /破坏性/);
  // Non-destructive siblings may auto-allow on the site path (control).
  assert.equal(
    decideAutoAuthorization({ origin: 'https://a.test', group: 'site', risk: 'write', destructive: false, settings }).allow,
    true,
  );
});

// ── host integration: privacy switch removal + dispatch rejection ────────────

function buildHost(opts: { read: boolean; write: boolean; autoWrite: boolean }) {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const auto = createAutoAuthStore(memoryKv(), { audit });
  let asks = 0;
  let removes = 0;
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    currentOrigin: () => 'https://a.test',
    onAsk: async () => {
      asks += 1;
      return { action: 'allow' };
    },
    autoAuth: { isEnabled: (_o, tier) => (tier === 'write' ? opts.autoWrite : true) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    bookmarks: {
      hasPermission: async () => true,
      listBookmarks: async () => RAW,
      searchBookmarks: async () => [],
      getTree: async () => [],
      addBookmark: async () => ({ ok: true, output: 'added' }),
      removeBookmark: async (id) => {
        removes += 1;
        return { ok: true, output: `removed ${id}` };
      },
      moveBookmark: async () => ({ ok: true, output: 'moved' }),
      audit,
    },
    bookmarksEnabled: { read: opts.read, write: opts.write },
  });
  return { host, audit, asks: () => asks, removes: () => removes };
}

test('FR-054 host: bookmarks leaves deriveTools() when both toggles are off and dispatch is rejected readably', async () => {
  const on = buildHost({ read: true, write: false, autoWrite: false });
  assert.equal(on.host.deriveTools().some((t) => t.name === BOOKMARKS_TOOL_NAME), true);

  on.host.setBookmarksEnabled({ read: false, write: false });
  assert.equal(
    on.host.deriveTools().some((t) => t.name === BOOKMARKS_TOOL_NAME),
    false,
    'disabled bookmarks must leave the LLM tool surface',
  );
  const rejected = await on.host.dispatch(call('list'), { origin: 'https://a.test' });
  assert.equal(rejected.ok, false, 'dispatch of a removed tool is rejected (never silent)');

  on.host.setBookmarksEnabled({ read: true, write: false });
  assert.equal(on.host.deriveTools().some((t) => t.name === BOOKMARKS_TOOL_NAME), true);
});

test('FR-054 host: write-auto ON still asks for bookmarks remove (destructive never auto-released)', async () => {
  const h = buildHost({ read: true, write: true, autoWrite: true });
  const res = await h.host.dispatch(call('remove', { id: '7' }), { origin: 'https://a.test' });
  assert.equal(res.ok, true);
  assert.equal(h.asks(), 1, 'destructive remove must go through the manual confirmation');
  assert.equal(h.removes(), 1);
  const autoAllows = h.audit.events.filter((e) => e.type === 'auto-authorize' && e.decision === 'allow');
  assert.equal(autoAllows.length, 0, 'no auto-allow record may exist for a destructive bookmarks remove');
});

test('FR-054 host: permission revocation suppression removes the tool immediately; re-grant restores it', () => {
  const h = buildHost({ read: true, write: false, autoWrite: false });
  assert.equal(h.host.deriveTools().some((t) => t.name === BOOKMARKS_TOOL_NAME), true);
  h.host.suppressCapability('bookmarks', true);
  assert.equal(
    h.host.deriveTools().some((t) => t.name === BOOKMARKS_TOOL_NAME),
    false,
    'revocation must unregister the tool (not a silent残留)',
  );
  assert.equal(h.host.isCapabilitySuppressed('bookmarks'), true);
  h.host.suppressCapability('bookmarks', false);
  assert.equal(h.host.deriveTools().some((t) => t.name === BOOKMARKS_TOOL_NAME), true);
});
