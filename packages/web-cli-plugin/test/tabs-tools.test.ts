/**
 * FR-049 / author decision ③: the plugin-level `tabs` tool.
 *
 * Covers: subcommand surface (list/switch/open, never close), per-subcommand
 * risk (list=read, switch=ui, open=write), readable scheme rejection, the
 * privacy-default URL redaction (`origin+path`, `--full` opt-in), audit trail,
 * and the host-level toggle semantics (disabled ⇒ absent from `deriveTools()`
 * and dispatch rejected) plus availability with no site bound/authorized.
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
  redactTabUrl,
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
  setTabs(tabs: TabRecord[]): void;
}

function makeHarness(initial: TabRecord[] = []): Harness {
  const audit = createStorageAuditSink(memoryKv());
  let tabs = initial;
  const switched: TabRecord[] = [];
  const opened: string[] = [];
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
    isAuthorized: (origin) => origin === 'https://auth.test',
    sessionIdForOrigin: (origin) => origin,
    audit,
  };
  return {
    deps,
    audit,
    switched,
    opened,
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

test('tabs: flat LLM-safe name + per-subcommand risk (list=read, switch=ui, open=write)', () => {
  const h = makeHarness();
  const e = entry(h);
  assert.equal(e.name, 'tabs');
  assert.equal(e.namespace, '');
  assert.match(e.schema.name, /^[a-zA-Z0-9_-]+$/);
  assert.equal(e.schema.name.includes('.'), false);
  assert.deepEqual(TABS_SUBCOMMAND_RISKS, { list: 'read', switch: 'ui', open: 'write' });
  assert.deepEqual(e.subcommandRisks, { list: 'read', switch: 'ui', open: 'write' });
  // Conservative fallback for an empty/unknown subcommand (never below ask).
  assert.equal(e.risk, 'write');
});

test('tabs: no close subcommand exists (help + unknown-subcommand reply are explicit)', () => {
  const h = makeHarness();
  const help = entry(h).help?.() ?? '';
  assert.match(help, /不支持.*close|不含 close/);
  assert.equal(/^-?\s*close\b/m.test(help), false, 'help must not advertise a close subcommand');
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

// ── audit + unknown subcommand ───────────────────────────────────────────────

test('tabs: every subcommand is audited readably (list/switch/open/unknown)', async () => {
  const h = makeHarness([{ id: 1, title: 'a', url: 'https://a.test/', active: true }]);
  await run(h, 'list');
  await run(h, 'switch', { id: '1' });
  await run(h, 'open', { url: 'https://b.test/' });
  await run(h, 'nope');
  for (const sub of ['list', 'switch', 'open', 'nope']) {
    assert.ok(auditEvents(h, sub).length >= 1, `missing audit for subcommand ${sub}`);
  }
  assert.equal(auditEvents(h, 'list')[0]?.tool, 'tabs');
});

test('tabs: unknown subcommand fails readably and lists the supported set (no close)', async () => {
  const h = makeHarness();
  const res = await run(h, 'close', { id: '1' });
  assert.equal(res.ok, false);
  assert.match(res.output, /未知子命令/);
  assert.match(res.output, /list \/ switch \/ open/);
  assert.match(res.output, /不支持 close/);
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

test('host: tabs switch/open denied without a confirmation responder (fail-closed)', async () => {
  const h = makeHarness([{ id: 1, title: 'A', url: 'https://a.test/', active: false }]);
  const host = hostWithTabs(h); // no onAsk
  const sw = await host.dispatch({ id: 's2', name: TABS_TOOL_NAME, subcommand: 'switch', args: { id: '1' }, rawArguments: '{}' });
  assert.equal(sw.ok, false);
  assert.equal(h.switched.length, 0);
  const op = await host.dispatch({ id: 'o2', name: TABS_TOOL_NAME, subcommand: 'open', args: { url: 'https://b.test/' }, rawArguments: '{}' });
  assert.equal(op.ok, false);
  assert.equal(h.opened.length, 0);
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
