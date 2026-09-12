/**
 * FR-049 / author decision ③ + author reversal (2026-09-13): the plugin-level
 * `tabs` tool.
 *
 * Covers: subcommand surface (list/switch/open/mute/pin/move/close), per-subcommand
 * risk (list=read, switch=ui, open/mute/pin/move/close=write), readable scheme
 * rejection, the privacy-default URL redaction (`origin+path`, `--full` opt-in),
 * audit trail (no plaintext), the single-tab + no-batch + restricted/unknown
 * refusals for the newly-allowed `close`, and the host-level toggle semantics
 * (disabled ⇒ absent from `deriveTools()` and dispatch rejected) plus availability
 * with no site bound/authorized.
 *
 * Author reversal (2026-09-13): the previous assertions that `close` does **not**
 * exist were replaced (not deleted) by assertions that it exists with `write`→ask
 * risk, single-tab semantics, irreversibility disclosure and auditing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import {
  createTabsToolEntry,
  formatTabList,
  isAllowedTabUrl,
  parseBoolArg,
  redactTabTitle,
  redactTabUrl,
  resolveTabTarget,
  TABS_SUBCOMMAND_RISKS,
  TABS_TOOL_NAME,
  type TabRecord,
  type TabsToolDeps,
} from '../src/tools/tabs-tools.js';

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

interface Harness {
  deps: TabsToolDeps;
  audit: ReturnType<typeof createStorageAuditSink>;
  switched: TabRecord[];
  opened: string[];
  muted: Array<{ id: number; muted: boolean }>;
  pinned: Array<{ id: number; pinned: boolean }>;
  moved: Array<{ id: number; dest: { index?: number; windowId?: number } }>;
  closed: number[];
  setTabs(tabs: TabRecord[]): void;
}

function makeHarness(initial: TabRecord[] = []): Harness {
  const audit = createStorageAuditSink(memoryKv());
  let tabs = initial;
  const switched: TabRecord[] = [];
  const opened: string[] = [];
  const muted: Array<{ id: number; muted: boolean }> = [];
  const pinned: Array<{ id: number; pinned: boolean }> = [];
  const moved: Array<{ id: number; dest: { index?: number; windowId?: number } }> = [];
  const closed: number[] = [];
  const deps: TabsToolDeps = {
    listTabs: async () => tabs,
    switchToTab: async (tab) => {
      switched.push(tab);
      return { ok: true, output: `✓ 已切到 http://site.test（会话：http://site.test）`, origin: 'http://site.test', sessionId: 'http://site.test', tabId: tab.id };
    },
    openTab: async (url) => {
      opened.push(url);
      return { ok: true, output: `✓ 已打开 ${url}`, origin: 'https://site.test' };
    },
    muteTab: async (tab, value) => {
      muted.push({ id: tab.id, muted: value });
      return { ok: true, output: `✓ 已${value ? '静音' : '取消静音'} [${tab.id}]`, tabId: tab.id };
    },
    pinTab: async (tab, value) => {
      pinned.push({ id: tab.id, pinned: value });
      return { ok: true, output: `✓ 已${value ? '固定' : '取消固定'} [${tab.id}]`, tabId: tab.id };
    },
    moveTab: async (tab, dest) => {
      moved.push({ id: tab.id, dest });
      return { ok: true, output: `✓ 已移动 [${tab.id}]`, tabId: tab.id };
    },
    closeTab: async (tab) => {
      closed.push(tab.id);
      return { ok: true, output: `✓ 已关闭 [${tab.id}]`, tabId: tab.id };
    },
    isAuthorized: (origin) => origin === 'https://auth.test',
    sessionIdForOrigin: (origin) => origin,
    audit,
  };
  return {
    deps,
    audit,
    switched,
    opened,
    muted,
    pinned,
    moved,
    closed,
    setTabs: (next) => {
      tabs = next;
    },
  };
}

const entry = (h: Harness) => createTabsToolEntry(h.deps);
const run = (h: Harness, subcommand: string, args: Record<string, string> = {}) =>
  entry(h).executor({ subcommand, args }, {});

function auditEvents(h: Harness, sub: string) {
  return h.audit.events.filter((e) => e.type === 'tabs' && e.subcommand === sub);
}

// ── surface + risk ───────────────────────────────────────────────────────────

test('tabs: flat LLM-safe name + per-subcommand risk (list=read, switch=ui, open/mute/pin/move/close=write)', () => {
  const h = makeHarness();
  const e = entry(h);
  assert.equal(e.name, 'tabs');
  assert.equal(e.namespace, '');
  assert.match(e.schema.name, /^[a-zA-Z0-9_-]+$/);
  assert.equal(e.schema.name.includes('.'), false);
  assert.deepEqual(TABS_SUBCOMMAND_RISKS, {
    list: 'read',
    switch: 'ui',
    open: 'write',
    mute: 'write',
    pin: 'write',
    move: 'write',
    close: 'write',
  });
  assert.deepEqual(e.subcommandRisks, {
    list: 'read',
    switch: 'ui',
    open: 'write',
    mute: 'write',
    pin: 'write',
    move: 'write',
    close: 'write',
  });
  // Conservative fallback for an empty/unknown subcommand (never below ask).
  assert.equal(e.risk, 'write');
});

test('tabs: close exists with write→ask risk + single-tab + irreversibility copy (replaces the old "no close")', () => {
  const h = makeHarness();
  const help = entry(h).help?.() ?? '';
  assert.match(help, /close/);
  assert.match(help, /不可逆/);
  assert.match(help, /禁止批量|一次只关一个/);
  assert.equal(/不支持.*close|不含 close/.test(help), false, 'stale "no close" copy must be gone');
  // The schema enum advertises the full surface (so the LLM can discover close).
  const params = entry(h).schema?.parameters as unknown as { properties?: { subcommand?: { enum?: string[] } } } | undefined;
  assert.deepEqual(params?.properties?.subcommand?.enum, ['list', 'switch', 'open', 'mute', 'pin', 'move', 'close']);
});

test('tabs: no site bound / no origin authorized is still usable (plugin-level capability)', async () => {
  const h = makeHarness([{ id: 1, title: 'A', url: 'https://a.test/x', active: true }]);
  const res = await run(h, 'list');
  assert.equal(res.ok, true);
  assert.match(res.output, /https:\/\/a\.test\/x/);
});

// ── list: privacy default ────────────────────────────────────────────────────

test('tabs list: default strips query + fragment (origin+path only)', async () => {
  const h = makeHarness([
    { id: 7, title: 'Search', url: 'https://a.test/search?q=TOPSECRET#frag', active: true },
  ]);
  const res = await run(h, 'list');
  assert.equal(res.ok, true);
  assert.match(res.output, /https:\/\/a\.test\/search/);
  assert.equal(res.output.includes('TOPSECRET'), false, 'query string must not enter the LLM context by default');
  assert.equal(res.output.includes('#frag'), false, 'fragment must be stripped');
  assert.match(res.output, /隐私默认/);
  assert.equal(h.audit.events.some((e) => e.type === 'tabs' && JSON.stringify(e).includes('TOPSECRET')), false, 'audit must not carry the stripped query');
});

test('tabs list --full: explicit opt-in returns the complete URL and discloses the impact', async () => {
  const h = makeHarness([{ id: 7, title: 'Search', url: 'https://a.test/search?q=VISIBLE#frag', active: false }]);
  const res = await run(h, 'list', { full: 'true' });
  assert.equal(res.ok, true);
  assert.match(res.output, /q=VISIBLE#frag/);
  assert.match(res.output, /--full/);
});

test('tabs list: shows id/title/url/active/authorized/session per tab', async () => {
  const h = makeHarness([
    { id: 1, title: 'Authorized', url: 'https://auth.test/page?x=1', active: true },
    { id: 2, title: 'Other', url: 'https://other.test/', active: false },
    { id: 3, title: 'Restricted', url: 'chrome://extensions', active: false },
  ]);
  const res = await run(h, 'list');
  assert.equal(res.ok, true);
  assert.match(res.output, /\[1\] Authorized .* https:\/\/auth\.test\/page .* 当前激活 · 已授权 .* 会话=https:\/\/auth\.test/);
  assert.match(res.output, /\[2\] Other .* 未授权/);
  assert.ok(res.output.includes('[3] Restricted'));
  assert.ok(res.output.includes('不可操作'));
  assert.ok(res.output.includes('会话=（受限页/不可用）'));
  // redaction helper is consistent
  assert.equal(redactTabUrl('https://a.test/p?q=1#h', false), 'https://a.test/p');
  assert.equal(redactTabUrl('chrome://x/y?q=1', false).includes('?'), false);
  assert.equal(isAllowedTabUrl('https://a.test'), true);
  assert.equal(isAllowedTabUrl('javascript:alert(1)'), false);
});

test('tabs list: empty tab set is readable, not an error', async () => {
  const h = makeHarness([]);
  const res = await run(h, 'list');
  assert.equal(res.ok, true);
  assert.match(res.output, /没有打开的标签页/);
});

// ── switch ───────────────────────────────────────────────────────────────────

test('tabs switch --id: activates, binds and returns the target session', async () => {
  const h = makeHarness([{ id: 42, title: 'Site', url: 'https://site.test/', active: false }]);
  const res = await run(h, 'switch', { id: '42' });
  assert.equal(res.ok, true);
  assert.deepEqual(h.switched.map((t) => t.id), [42]);
  assert.match(res.output, /已切到/);
  assert.match(res.output, /会话：/);
  assert.equal(auditEvents(h, 'switch').length, 1);
});

test('tabs switch --match: resolves a substring match (URL or title)', async () => {
  const h = makeHarness([
    { id: 1, title: 'Docs', url: 'https://docs.test/', active: false },
    { id: 2, title: 'Site', url: 'https://site.test/', active: false },
  ]);
  const res = await run(h, 'switch', { match: 'docs' });
  assert.equal(res.ok, true);
  assert.deepEqual(h.switched.map((t) => t.id), [1]);
});

test('tabs switch: ambiguous match with no active tab fails readably and does NOT switch', async () => {
  const h = makeHarness([
    { id: 1, title: 'a', url: 'https://same.test/1', active: false },
    { id: 2, title: 'b', url: 'https://same.test/2', active: false },
  ]);
  const res = await run(h, 'switch', { match: 'same.test' });
  assert.equal(res.ok, false);
  assert.match(res.output, /匹配到 2 个/);
  assert.equal(h.switched.length, 0);
});

test('tabs switch: prefers the active tab among multiple matches', async () => {
  const h = makeHarness([
    { id: 1, title: 'a', url: 'https://same.test/1', active: false },
    { id: 2, title: 'b', url: 'https://same.test/2', active: true },
  ]);
  const res = await run(h, 'switch', { match: 'same.test' });
  assert.equal(res.ok, true);
  assert.deepEqual(h.switched.map((t) => t.id), [2]);
});

test('tabs switch: restricted page is rejected readably (never silent)', async () => {
  const h = makeHarness([{ id: 9, title: 'Ext', url: 'chrome://extensions', active: false }]);
  const res = await run(h, 'switch', { id: '9' });
  assert.equal(res.ok, false);
  assert.match(res.output, /受限页面/);
  assert.equal(h.switched.length, 0);
  assert.equal(auditEvents(h, 'switch')[0]?.decision, 'fail');
});

test('tabs switch: missing or conflicting target args fail readably', async () => {
  const h = makeHarness([{ id: 1, title: 'a', url: 'https://a.test/', active: true }]);
  const missing = await run(h, 'switch');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /--id/);
  const both = await run(h, 'switch', { id: '1', match: 'a' });
  assert.equal(both.ok, false);
  assert.match(both.output, /互斥/);
  const badId = await run(h, 'switch', { id: 'abc' });
  assert.equal(badId.ok, false);
  assert.equal(h.switched.length, 0);
});

test('tabs switch: unknown id is a readable not-found (never a silent no-op)', async () => {
  const h = makeHarness([{ id: 1, title: 'a', url: 'https://a.test/', active: true }]);
  const res = await run(h, 'switch', { id: '999' });
  assert.equal(res.ok, false);
  assert.match(res.output, /未找到 id=999/);
});

// ── open ─────────────────────────────────────────────────────────────────────

test('tabs open: only http(s); javascript/data/file/chrome/about are rejected readably', async () => {
  const h = makeHarness();
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<h1>x</h1>',
    'file:///etc/passwd',
    'chrome://extensions',
    'about:blank',
    'ftp://example.com/x',
  ]) {
    const res = await run(h, 'open', { url });
    assert.equal(res.ok, false, `${url} must be rejected`);
    assert.match(res.output, /仅允许 http\(s\)|拒绝/);
  }
  assert.equal(h.opened.length, 0, 'no non-http(s) URL may reach chrome.tabs.create');
  assert.equal(auditEvents(h, 'open').length, 6);
  assert.equal(auditEvents(h, 'open').every((e) => e.decision === 'fail'), true);
});

test('tabs open: valid http(s) URL is opened and audited with a redacted target', async () => {
  const h = makeHarness();
  const res = await run(h, 'open', { url: 'https://site.test/path?token=SECRET#frag' });
  assert.equal(res.ok, true);
  assert.deepEqual(h.opened, ['https://site.test/path?token=SECRET#frag']);
  const ev = auditEvents(h, 'open')[0];
  assert.equal(ev?.decision, 'ok');
  assert.equal(JSON.stringify(ev).includes('SECRET'), false, 'audit must not carry the query string');
  assert.match(String(ev?.detail), /https:\/\/site\.test\/path/);
});

test('tabs open: missing or unparseable --url fails readably', async () => {
  const h = makeHarness();
  const missing = await run(h, 'open');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /--url/);
  const bad = await run(h, 'open', { url: 'not a url' });
  assert.equal(bad.ok, false);
  assert.equal(h.opened.length, 0);
});

// ── mute / pin / move (author reversal 2026-09-13) ───────────────────────────

test('tabs mute: toggles the resolved tab, audits a redacted target (no plaintext query)', async () => {
  const h = makeHarness([{ id: 5, title: 'Site', url: 'https://a.test/p?q=SECRET#f', active: true }]);
  const on = await run(h, 'mute', { id: '5', muted: 'true' });
  assert.equal(on.ok, true);
  assert.deepEqual(h.muted, [{ id: 5, muted: true }]);
  const off = await run(h, 'mute', { match: 'a.test', muted: 'false' });
  assert.equal(off.ok, true);
  assert.deepEqual(h.muted[1], { id: 5, muted: false });
  assert.equal(auditEvents(h, 'mute').length, 2);
  assert.equal(auditEvents(h, 'mute').every((e) => e.decision === 'ok'), true);
  assert.equal(JSON.stringify(h.audit.events).includes('SECRET'), false, 'audit must not carry the query string');
  assert.match(String(auditEvents(h, 'mute')[0]?.detail), /https:\/\/a\.test\/p/);
});

test('tabs mute: missing/invalid --muted and missing/conflicting target fail readably', async () => {
  const h = makeHarness([{ id: 1, title: 'a', url: 'https://a.test/', active: true }]);
  const missingBool = await run(h, 'mute', { id: '1' });
  assert.equal(missingBool.ok, false);
  assert.match(missingBool.output, /--muted true\|false/);
  const badBool = await run(h, 'mute', { id: '1', muted: 'yes' });
  assert.equal(badBool.ok, false);
  assert.match(badBool.output, /只接受 true\|false/);
  const missingTarget = await run(h, 'mute', { muted: 'true' });
  assert.equal(missingTarget.ok, false);
  assert.match(missingTarget.output, /--id/);
  const both = await run(h, 'mute', { id: '1', match: 'a', muted: 'true' });
  assert.equal(both.ok, false);
  assert.match(both.output, /互斥/);
  assert.equal(h.muted.length, 0);
});

test('tabs pin: toggles and audits; invalid args fail readably', async () => {
  const h = makeHarness([{ id: 6, title: 'P', url: 'https://p.test/path', active: false }]);
  const on = await run(h, 'pin', { id: '6', pinned: 'true' });
  assert.equal(on.ok, true);
  assert.deepEqual(h.pinned, [{ id: 6, pinned: true }]);
  const off = await run(h, 'pin', { id: '6', pinned: 'false' });
  assert.equal(off.ok, true);
  assert.deepEqual(h.pinned[1], { id: 6, pinned: false });
  const bad = await run(h, 'pin', { id: '6', pinned: 'maybe' });
  assert.equal(bad.ok, false);
  assert.equal(auditEvents(h, 'pin').length, 3);
  assert.equal(auditEvents(h, 'pin')[2]?.decision, 'fail');
});

test('tabs move: requires --index or --window, validates integers, passes both through', async () => {
  const h = makeHarness([{ id: 8, title: 'M', url: 'https://m.test/', active: false }]);
  const none = await run(h, 'move', { id: '8' });
  assert.equal(none.ok, false);
  assert.match(none.output, /--index <n> 或 --window <id>/);
  const badIndex = await run(h, 'move', { id: '8', index: '-1' });
  assert.equal(badIndex.ok, false);
  assert.match(badIndex.output, /非负整数/);
  const zeroWindow = await run(h, 'move', { id: '8', window: '0' });
  assert.equal(zeroWindow.ok, false);
  assert.match(zeroWindow.output, /正整数/);
  const byIndex = await run(h, 'move', { id: '8', index: '0' });
  assert.equal(byIndex.ok, true);
  assert.deepEqual(h.moved[0], { id: 8, dest: { index: 0 } });
  const both = await run(h, 'move', { match: 'm.test', index: '2', window: '3' });
  assert.equal(both.ok, true);
  assert.deepEqual(h.moved[1], { id: 8, dest: { index: 2, windowId: 3 } });
  assert.equal(JSON.stringify(h.audit.events).includes('SECRET'), false);
});

test('tabs: mutating subcommands reject --all (no batch), and never pick a target for it', async () => {
  const h = makeHarness([{ id: 1, title: 'a', url: 'https://a.test/', active: true }]);
  for (const sub of ['mute', 'pin', 'move', 'close'] as const) {
    const res = await run(h, sub, { all: 'true', muted: 'true', pinned: 'true', index: '0' });
    assert.equal(res.ok, false, `${sub} --all must be rejected`);
    assert.match(res.output, /禁止批量|不支持 --all/);
  }
  assert.equal(h.muted.length + h.pinned.length + h.moved.length + h.closed.length, 0);
});

test('tabs mute/pin/move: restricted page and unknown id are readable refusals (never silent)', async () => {
  const h = makeHarness([
    { id: 1, title: 'Ext', url: 'chrome://extensions', active: false },
    { id: 2, title: 'Site', url: 'https://a.test/', active: true },
  ]);
  for (const [sub, extra] of [
    ['mute', { muted: 'true' }],
    ['pin', { pinned: 'true' }],
    ['move', { index: '0' }],
  ] as Array<[string, Record<string, string>]>) {
    const restricted = await run(h, sub, { id: '1', ...extra });
    assert.equal(restricted.ok, false, `${sub} restricted must fail`);
    assert.match(restricted.output, /受限页面/);
    const unknown = await run(h, sub, { id: '999', ...extra });
    assert.equal(unknown.ok, false, `${sub} unknown id must fail`);
    assert.match(unknown.output, /未找到 id=999/);
  }
  assert.equal(h.muted.length + h.pinned.length + h.moved.length, 0);
});

// ── close (author reversal 2026-09-13) ───────────────────────────────────────

test('tabs close --id: closes exactly one tab and audits with a redacted URL', async () => {
  const h = makeHarness([{ id: 7, title: 'Doomed', url: 'https://a.test/page?token=SECRET#frag', active: false }]);
  const res = await run(h, 'close', { id: '7' });
  assert.equal(res.ok, true);
  assert.deepEqual(h.closed, [7]);
  assert.match(res.output, /已关闭/);
  const ev = auditEvents(h, 'close')[0];
  assert.equal(ev?.decision, 'ok');
  assert.match(String(ev?.detail), /不可逆/);
  assert.equal(JSON.stringify(ev).includes('SECRET'), false, 'close audit must not carry query/fragment');
  assert.match(String(ev?.detail), /https:\/\/a\.test\/page/);
});

test('tabs close --match: unique match closes; ambiguous match is a readable refusal (no guess, no close)', async () => {
  const h = makeHarness([
    { id: 1, title: 'a', url: 'https://same.test/1', active: false },
    { id: 2, title: 'b', url: 'https://same.test/2', active: true }, // active must NOT be auto-picked for close
  ]);
  const ambiguous = await run(h, 'close', { match: 'same.test' });
  assert.equal(ambiguous.ok, false);
  assert.match(ambiguous.output, /匹配到 2 个/);
  assert.equal(h.closed.length, 0, 'an ambiguous close must never close anything');

  h.setTabs([
    { id: 1, title: 'a', url: 'https://same.test/1', active: false },
    { id: 2, title: 'b', url: 'https://other.test/2', active: true },
  ]);
  const unique = await run(h, 'close', { match: 'same.test' });
  assert.equal(unique.ok, true);
  assert.deepEqual(h.closed, [1]);
  assert.equal(auditEvents(h, 'close')[0]?.decision, 'fail');
  assert.equal(auditEvents(h, 'close')[1]?.decision, 'ok');
});

test('tabs close: restricted page / unknown id / missing / conflicting args fail readably and never close', async () => {
  const h = makeHarness([
    { id: 1, title: 'Ext', url: 'chrome://extensions', active: false },
    { id: 2, title: 'Site', url: 'https://a.test/', active: true },
  ]);
  const restricted = await run(h, 'close', { id: '1' });
  assert.equal(restricted.ok, false);
  assert.match(restricted.output, /受限页面/);
  const unknown = await run(h, 'close', { id: '999' });
  assert.equal(unknown.ok, false);
  assert.match(unknown.output, /未找到 id=999/);
  const missing = await run(h, 'close');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /--id/);
  const both = await run(h, 'close', { id: '2', match: 'a' });
  assert.equal(both.ok, false);
  assert.match(both.output, /互斥/);
  assert.equal(h.closed.length, 0);
});

test('tabs close: missing closeTab dep is a readable fail-closed refusal (never a silent no-op)', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const bare: TabsToolDeps = {
    listTabs: async () => [{ id: 1, title: 'a', url: 'https://a.test/', active: true }],
    switchToTab: async () => ({ ok: true, output: '' }),
    openTab: async () => ({ ok: true, output: '' }),
    isAuthorized: () => false,
    sessionIdForOrigin: (o) => o,
    audit,
  };
  const res = await createTabsToolEntry(bare).executor({ subcommand: 'close', args: { id: '1' } }, {});
  assert.equal(res.ok, false);
  assert.match(res.output, /未接线/);
});

// ── pure helpers ─────────────────────────────────────────────────────────────

test('resolveTabTarget: preferActive only for switch; mutating ops reject ambiguity', () => {
  const rows: TabRecord[] = [
    { id: 1, title: 'a', url: 'https://same.test/1', active: false },
    { id: 2, title: 'b', url: 'https://same.test/2', active: true },
  ];
  assert.equal(resolveTabTarget(rows, { match: 'same.test' }, true).target?.id, 2);
  assert.equal(resolveTabTarget(rows, { match: 'same.test' }, false).target, undefined);
  assert.match(String(resolveTabTarget(rows, { match: 'same.test' }, false).error), /匹配到 2 个/);
  assert.equal(resolveTabTarget(rows, { id: 1 }, false).target?.id, 1);
  assert.match(String(resolveTabTarget(rows, { id: 42 }, false).error), /未找到 id=42/);
});

test('parseBoolArg: accepts true/false/1/0, rejects anything else readably', () => {
  assert.equal(parseBoolArg({ muted: 'true' }, 'muted', 'mute').value, true);
  assert.equal(parseBoolArg({ muted: '1' }, 'muted', 'mute').value, true);
  assert.equal(parseBoolArg({ muted: 'false' }, 'muted', 'mute').value, false);
  assert.equal(parseBoolArg({ muted: '0' }, 'muted', 'mute').value, false);
  assert.match(String(parseBoolArg({ muted: 'maybe' }, 'muted', 'mute').error), /只接受 true\|false/);
  assert.match(String(parseBoolArg({}, 'muted', 'mute').error), /需要 --muted/);
});

test('formatTabList: reflects mute/pin state and no longer advertises "no close"', () => {
  const out = formatTabList(
    [{ id: 1, title: 'x', url: 'https://a.test/p', active: true, authorized: true, restricted: false, muted: true, pinned: true, sessionId: 'https://a.test' }],
    false,
  );
  assert.match(out, /已静音/);
  assert.match(out, /已固定/);
  assert.match(out, /tabs close/);
  assert.equal(/不支持关闭标签页|不含 close/.test(out), false);
});

test('redactTabTitle: URL-as-title (scheme or scheme-less) loses query/fragment, plain titles untouched', () => {
  assert.equal(redactTabTitle('https://a.test/page?token=SECRET#frag'), 'https://a.test/page');
  assert.equal(redactTabTitle('127.0.0.1:39525/disposable-close?secretmarker=CLOSESECRET#frag'), 'http://127.0.0.1:39525/disposable-close');
  assert.equal(redactTabTitle('LGDL Workbench'), 'LGDL Workbench');
  assert.equal(redactTabTitle('How are you?'), 'How are you?');
  assert.equal(redactTabTitle(''), '(无标题)');
});

// ── audit + unknown subcommand ───────────────────────────────────────────────

test('tabs: every subcommand is audited readably (list/switch/open/mute/pin/move/close/unknown)', async () => {
  const h = makeHarness([{ id: 1, title: 'a', url: 'https://a.test/', active: true }]);
  await run(h, 'list');
  await run(h, 'switch', { id: '1' });
  await run(h, 'open', { url: 'https://b.test/' });
  await run(h, 'mute', { id: '1', muted: 'true' });
  await run(h, 'pin', { id: '1', pinned: 'true' });
  await run(h, 'move', { id: '1', index: '0' });
  await run(h, 'close', { id: '1' });
  await run(h, 'nope');
  for (const sub of ['list', 'switch', 'open', 'mute', 'pin', 'move', 'close', 'nope']) {
    assert.ok(auditEvents(h, sub).length >= 1, `missing audit for subcommand ${sub}`);
  }
  assert.equal(auditEvents(h, 'list')[0]?.tool, 'tabs');
  assert.equal(auditEvents(h, 'close')[0]?.decision, 'ok');
});

test('tabs: unknown subcommand fails readably and lists the supported set (incl. close)', async () => {
  const h = makeHarness();
  const res = await run(h, 'nope', { id: '1' });
  assert.equal(res.ok, false);
  assert.match(res.output, /未知子命令/);
  assert.match(res.output, /list \/ switch \/ open \/ mute \/ pin \/ move \/ close/);
});

// ── host integration: registration, risk gating, toggle ─────────────────────

function hostWithTabs(h: Harness, onAsk?: () => Promise<{ action: 'allow' | 'deny' }>) {
  const origins = createOriginStore(memoryKv(), { audit: h.audit });
  const host = createWebCliHost({
    origins,
    audit: h.audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    tabs: h.deps,
    ...(onAsk ? { onAsk } : {}),
  });
  return host;
}

test('host: tabs is registered by default (no site bound) and list is read→allow', async () => {
  const h = makeHarness([{ id: 1, title: 'A', url: 'https://a.test/', active: true }]);
  const host = hostWithTabs(h);
  assert.equal(host.isTabsEnabled(), true);
  assert.equal(host.deriveTools().some((t) => t.name === TABS_TOOL_NAME), true);
  const res = await host.dispatch({ id: 'l1', name: TABS_TOOL_NAME, subcommand: 'list', args: {}, rawArguments: '{}' });
  assert.equal(res.ok, true); // read → allow, no confirmation
  assert.match(res.output, /https:\/\/a\.test\//);
});

test('host: tabs switch/open are ask-gated (ui/write) and only run after confirmation', async () => {
  const h = makeHarness([{ id: 1, title: 'A', url: 'https://a.test/', active: false }]);
  let asked = 0;
  const host = hostWithTabs(h, async () => {
    asked += 1;
    return { action: 'allow' };
  });
  const sw = await host.dispatch({ id: 's1', name: TABS_TOOL_NAME, subcommand: 'switch', args: { id: '1' }, rawArguments: '{}' });
  assert.equal(asked, 1, 'switch (ui) must go through confirmation');
  assert.equal(sw.ok, true);
  assert.equal(h.switched.length, 1);

  const op = await host.dispatch({ id: 'o1', name: TABS_TOOL_NAME, subcommand: 'open', args: { url: 'https://b.test/' }, rawArguments: '{}' });
  assert.equal(asked, 2, 'open (write) must go through confirmation');
  assert.equal(op.ok, true);
  assert.deepEqual(h.opened, ['https://b.test/']);
});

test('host: tabs mute/pin/move/close are write→ask and only run after confirmation', async () => {
  const h = makeHarness([
    { id: 1, title: 'A', url: 'https://a.test/', active: false },
    { id: 2, title: 'B', url: 'https://b.test/', active: false },
  ]);
  let asked = 0;
  const host = hostWithTabs(h, async () => {
    asked += 1;
    return { action: 'allow' };
  });
  const mute = await host.dispatch({ id: 'm1', name: TABS_TOOL_NAME, subcommand: 'mute', args: { id: '1', muted: 'true' }, rawArguments: '{}' });
  assert.equal(asked, 1, 'mute (write) must go through confirmation');
  assert.equal(mute.ok, true);
  const pin = await host.dispatch({ id: 'p1', name: TABS_TOOL_NAME, subcommand: 'pin', args: { id: '1', pinned: 'true' }, rawArguments: '{}' });
  assert.equal(asked, 2, 'pin (write) must go through confirmation');
  assert.equal(pin.ok, true);
  const move = await host.dispatch({ id: 'mv1', name: TABS_TOOL_NAME, subcommand: 'move', args: { id: '1', index: '0' }, rawArguments: '{}' });
  assert.equal(asked, 3, 'move (write) must go through confirmation');
  assert.equal(move.ok, true);
  const close = await host.dispatch({ id: 'c1', name: TABS_TOOL_NAME, subcommand: 'close', args: { id: '2' }, rawArguments: '{}' });
  assert.equal(asked, 4, 'close (write) must go through confirmation');
  assert.equal(close.ok, true);
  assert.deepEqual(h.closed, [2]);
  assert.deepEqual(h.muted, [{ id: 1, muted: true }]);
  assert.deepEqual(h.pinned, [{ id: 1, pinned: true }]);
  assert.deepEqual(h.moved, [{ id: 1, dest: { index: 0 } }]);
});

test('host: tabs switch/open/mute/pin/move/close denied without a confirmation responder (fail-closed)', async () => {
  const h = makeHarness([{ id: 1, title: 'A', url: 'https://a.test/', active: false }]);
  const host = hostWithTabs(h); // no onAsk
  const sw = await host.dispatch({ id: 's2', name: TABS_TOOL_NAME, subcommand: 'switch', args: { id: '1' }, rawArguments: '{}' });
  assert.equal(sw.ok, false);
  assert.equal(h.switched.length, 0);
  const op = await host.dispatch({ id: 'o2', name: TABS_TOOL_NAME, subcommand: 'open', args: { url: 'https://b.test/' }, rawArguments: '{}' });
  assert.equal(op.ok, false);
  assert.equal(h.opened.length, 0);
  for (const [sub, args] of [
    ['mute', { id: '1', muted: 'true' }],
    ['pin', { id: '1', pinned: 'true' }],
    ['move', { id: '1', index: '0' }],
    ['close', { id: '1' }],
  ] as Array<[string, Record<string, string>]>) {
    const res = await host.dispatch({ id: `x-${sub}`, name: TABS_TOOL_NAME, subcommand: sub, args, rawArguments: '{}' });
    assert.equal(res.ok, false, `${sub} must be denied without a responder`);
  }
  assert.equal(h.muted.length + h.pinned.length + h.moved.length + h.closed.length, 0);
});

test('host: disabling the privacy switch removes tabs from deriveTools() and rejects dispatch readably', async () => {
  const h = makeHarness([{ id: 1, title: 'A', url: 'https://a.test/', active: true }]);
  const host = hostWithTabs(h);
  assert.equal(host.deriveTools().some((t) => t.name === TABS_TOOL_NAME), true);

  host.setTabsEnabled(false);
  assert.equal(host.isTabsEnabled(), false);
  assert.equal(host.deriveTools().some((t) => t.name === TABS_TOOL_NAME), false, 'disabled tabs must leave the LLM tool surface');
  const res = await host.dispatch({ id: 'd1', name: TABS_TOOL_NAME, subcommand: 'list', args: {}, rawArguments: '{}' });
  assert.equal(res.ok, false);
  assert.match(res.output, /未注册|已禁用/);

  host.setTabsEnabled(true);
  assert.equal(host.isTabsEnabled(), true);
  assert.equal(host.deriveTools().some((t) => t.name === TABS_TOOL_NAME), true);
  const back = await host.dispatch({ id: 'd2', name: TABS_TOOL_NAME, subcommand: 'list', args: {}, rawArguments: '{}' });
  assert.equal(back.ok, true);
});

test('host: built without tabs deps → tabs is absent (node hosts unaffected)', () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({ origins, audit, rpc: { invoke: async () => ({ ok: true, output: 'ok' }) }, descriptorShow: async () => '{}', llmConfig: async () => '{}' });
  assert.equal(host.deriveTools().some((t) => t.name === TABS_TOOL_NAME), false);
  assert.equal(host.isTabsEnabled(), false);
  host.setTabsEnabled(true); // no deps → readable no-op, not a throw
  assert.equal(host.isTabsEnabled(), false);
});

// ── formatTabList unit ───────────────────────────────────────────────────────

test('formatTabList: restricted tabs are labelled and their path never leaks (redaction composed)', () => {
  const out = formatTabList(
    [{ id: 1, title: 'x', url: redactTabUrl('chrome://x/secret', false), active: false, authorized: false, restricted: true }],
    false,
  );
  assert.equal(out.includes('secret'), false);
  assert.match(out, /不可操作/);
});
