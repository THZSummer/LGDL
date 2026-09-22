/**
 * V2-1 门禁 `insight-projection`（TASK-006；AC-V21-001/004/005/006 + AC-V2-001）。
 *
 * 断言要点：四维度字段 == v1 真值；`state` 消息 additive 兼容；投影零副作用
 * （前后存储 diff 为空 + 审计零新增）；零明文（key/剪贴板/通知/URL query）；
 * ≥3 类空态/降级可读。
 *
 * **新文件承载**：不修改 v1 任何既有测试文件（断言只增不减）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, normalizeOrigin, type PluginKv } from '../src/security/origin-store.js';
import { buildStateMessage } from '../src/background/state-message.js';
import { buildInsightTree, buildInsightTreePayload, summarizeInsight } from '../src/insight/build-snapshot.js';
import { projectInsightTree, type InsightSource } from '../src/insight/project-tree.js';
import {
  CAPABILITY_TOGGLE_KEYS,
  CAPABILITY_TOGGLE_SPECS,
  STATIC_PERMISSIONS,
  STATIC_PERMISSION_REVOKE_HINT,
  TABS_TOGGLE_KEY,
  projectCapabilities,
} from '../src/insight/capability-catalog.js';
import { deriveAction, projectCommands, sourceKindOf, type ToolSurfaceEntry } from '../src/insight/command-catalog.js';
import { PLUGIN_RISK_DEFAULTS } from '../src/security/policy.js';
import {
  CAPABILITY_SETTING_DEFAULTS,
  CAPABILITY_SETTING_KEY,
} from '../src/background/capability-setting.js';
import { TABS_SETTING_KEY } from '../src/background/tabs-setting.js';
import {
  INSIGHT_DIMENSIONS,
  INSIGHT_MODEL_NOTE,
  STABLE_KEY,
  normalizeStableOrigin,
  stableStringify,
  type CapabilityNode,
  type CommandNode,
  type ConnectTreeSnapshot,
  type LlmNode,
  type SiteNode,
  type TreeGroup,
} from '../src/insight/tree-model.js';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function groupOf(snapshot: ConnectTreeSnapshot, dimension: string): TreeGroup {
  const group = snapshot.groups.find((g) => g.dimension === dimension);
  assert.ok(group, `missing group ${dimension}`);
  return group!;
}

const CAPS_OFF = {
  bookmarksRead: false,
  bookmarksWrite: false,
  downloadsRead: false,
  notify: false,
  clipboardRead: false,
  clipboardWrite: false,
};

/** A source with one authorized site, mixed capabilities and a rich command face. */
function richSource(overrides: Partial<InsightSource> = {}): InsightSource {
  return {
    sites: [
      { origin: 'https://b.test', authorized: false, trust: 'untrusted', updatedAt: 20 },
      { origin: 'https://a.test', authorized: true, trust: 'trusted', authorizedAt: 10, updatedAt: 30 },
    ],
    capability: {
      grants: { bookmarks: true, downloads: false, notify: true, clipboard: false },
      toggles: { ...CAPS_OFF, bookmarksRead: true, downloadsRead: true, notify: true, clipboardWrite: true },
      tabsEnabled: true,
    },
    toolSurface: [
      { name: 'dom', group: 'ui', risk: 'ui', subcommands: ['snapshot', 'click'], presentInSurface: true },
      { name: 'site_notes-list', group: 'site', risk: 'read', subcommands: ['list', 'add'], subcommandRisks: { list: 'read', add: 'write' }, presentInSurface: true },
      { name: 'tabs', group: 'plugin', risk: 'write', subcommands: ['list', 'open'], presentInSurface: true },
      { name: 'bookmarks', group: 'plugin', risk: 'write', subcommands: ['list', 'remove'], presentInSurface: true },
      { name: 'sleep', subcommands: [], presentInSurface: true },
    ],
    delayMs: 250,
    llm: { configured: true, providerId: 'deepseek', providerName: 'DeepSeek', model: 'deepseek-chat' },
    sessions: [
      { sessionId: 'https://a.test', label: 'a.test', origins: ['https://a.test'], lastActiveAt: 5 },
      { sessionId: 'group:g1', label: '组一', origins: ['https://b.test'], lastActiveAt: 9 },
    ],
    activeOrigin: 'https://a.test',
    isOriginAuthorized: (origin) => normalizeStableOrigin(origin) === 'https://a.test',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// stable keys + same-source anchors (ADR-V2-002)
// ---------------------------------------------------------------------------

test('V2-1 stable keys: every namespace prefix is produced, and same input → same key', () => {
  assert.equal(STABLE_KEY.site('HTTPS://A.test/'), 'site:https://a.test');
  assert.equal(STABLE_KEY.staticCapability('scripting'), 'cap:static:scripting');
  assert.equal(STABLE_KEY.optionalCapability('clipboard'), 'cap:opt:clipboard');
  assert.equal(STABLE_KEY.toggle(TABS_TOGGLE_KEY), 'toggle:tabs-enabled');
  assert.equal(STABLE_KEY.command('dom'), 'cmd:dom');
  assert.equal(STABLE_KEY.command('dom', 'snapshot'), 'cmd:dom#snapshot');
  assert.equal(STABLE_KEY.llm('deepseek'), 'llm:deepseek');
  assert.equal(STABLE_KEY.llm(''), 'llm:none');
  assert.equal(STABLE_KEY.session('group:g1'), 'session:group:g1');
  assert.equal(STABLE_KEY.link('cmd:dom', 'site:https://a.test'), 'link:cmd:dom→site:https://a.test');
  assert.equal(STABLE_KEY.group('llm'), 'group:llm');
  // pure / idempotent
  assert.equal(STABLE_KEY.site('https://a.test'), STABLE_KEY.site('https://a.test'));
});

test('V2-1 anchor: normalizeStableOrigin has the same semantics as OriginStore.normalizeOrigin', () => {
  for (const raw of ['HTTPS://A.Test/', ' https://b.test/// ', 'https://c.test', 'HTTP://D.test/path/']) {
    assert.equal(normalizeStableOrigin(raw), normalizeOrigin(raw), `origin normalization drift for ${raw}`);
  }
});

test('V2-1 anchor: STATIC_PERMISSIONS equals the manifest static permissions (zero new permissions)', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'),
  ) as { permissions: string[]; optional_permissions: string[] };
  assert.deepEqual([...STATIC_PERMISSIONS], manifest.permissions);
  assert.deepEqual(
    [...STATIC_PERMISSIONS].length,
    5,
    'the static permission face must stay the pinned 5 entries',
  );
});

test('V2-1 anchor: capability toggle keys equal CAPABILITY_SETTING_DEFAULTS keys, plus tabs', () => {
  assert.deepEqual([...CAPABILITY_TOGGLE_KEYS], Object.keys(CAPABILITY_SETTING_DEFAULTS));
  assert.deepEqual([...CAPABILITY_TOGGLE_SPECS].map((s) => s.key), [...CAPABILITY_TOGGLE_KEYS]);
  // `toggle:tabs-enabled` is derived from the real tabs-setting storage key.
  assert.equal(TABS_SETTING_KEY.endsWith(TABS_TOGGLE_KEY), true);
  assert.equal(CAPABILITY_SETTING_KEY.length > 0, true);
});

// ---------------------------------------------------------------------------
// snapshot shape (FR-V2-010〔R2·形式被 FR-V2-070 取代〕；A7 订正 modelNote)
// ---------------------------------------------------------------------------

test('V2-1 hierarchy shape: version 1, root label, modelNote states the ownership hierarchy, fixed group order (R2 supersession S20)', () => {
  const snapshot = projectInsightTree(richSource());
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.root.id, 'root');
  assert.equal(snapshot.root.label, '本插件');
  assert.deepEqual([...snapshot.root.dimensions], [...INSIGHT_DIMENSIONS]);
  // A7：meta.modelNote 与真层级树一致；旧「森林 / 非严格单树」措辞零回潮（防止回归）。
  assert.match(snapshot.meta.modelNote, /按归属的层级树/);
  assert.equal(snapshot.meta.modelNote.includes('森林'), false, 'legacy forest wording must not come back');
  assert.equal(snapshot.meta.modelNote.includes('非严格单树'), false, 'legacy non-strict-tree wording must not come back');
  assert.match(snapshot.meta.modelNote, /同一节点不复制/);
  assert.equal(snapshot.meta.modelNote, INSIGHT_MODEL_NOTE);
  assert.deepEqual(
    snapshot.groups.map((g) => g.dimension),
    ['site', 'capability', 'command', 'llm'],
  );
  assert.deepEqual(
    snapshot.groups.map((g) => g.id),
    ['group:site', 'group:capability', 'group:command', 'group:llm'],
  );
});

// ---------------------------------------------------------------------------
// dimension 1: sites (FR-V2-011)
// ---------------------------------------------------------------------------

test('V2-1 sites: unauthorized sites are visible; revoke control only when authorized; trust/authorizedAt truthful', () => {
  const snapshot = projectInsightTree(richSource());
  const siteGroup = groupOf(snapshot, 'site');
  assert.equal(siteGroup.children.length, 2);
  // localeCompare order: a.test before b.test
  assert.deepEqual(siteGroup.children.map((c) => c.id), ['site:https://a.test', 'site:https://b.test']);
  const a = siteGroup.children.find((c) => c.id === 'site:https://a.test') as SiteNode;
  assert.equal(a.authorized, true);
  assert.equal(a.trust, 'trusted');
  assert.equal(a.authorizedAt, 10);
  assert.equal(a.revocable, true);
  assert.ok(a.controls.some((c) => c.kind === 'revoke'), 'authorized site must offer revoke');
  const b = siteGroup.children.find((c) => c.id === 'site:https://b.test') as SiteNode;
  assert.equal(b.authorized, false, 'unauthorized site must still be visible');
  assert.deepEqual(b.controls, [], 'unauthorized site must not offer a revoke control');
  // V5-3 review R1 BLOCK-01 (FR-ALLN-086⑤ / ADR-V5-006 §2⑤): the 台账 **never copies** the
  // authorization state — no `authorized` / `unauthorized` badge value on either site row;
  // the row carries a **pointer** to the ONE carrier (`#auth-state`) instead.
  assert.equal(
    [a, b].some((s) => s.badges.some((x) => x.kind === 'authorized' || x.kind === 'unauthorized')),
    false,
    'site rows must not copy the authorization state value',
  );
  assert.ok(a.badges.some((x) => x.kind === 'auth-pointer'), 'authorized site row must point at the chip');
  assert.ok(b.badges.some((x) => x.kind === 'auth-pointer'), 'unauthorized site row must point at the chip');
});

// ---------------------------------------------------------------------------
// dimension 2: capabilities (FR-V2-012, ADR-V2-011)
// ---------------------------------------------------------------------------

test('V2-1 capabilities: static 5 are revocable:false with no revoke control; optional 4 follow raw grants; 6+1 toggles', () => {
  const caps = projectCapabilities({
    grants: { bookmarks: true, downloads: false, notify: true, clipboard: false },
    toggles: { ...CAPS_OFF, bookmarksRead: true, downloadsRead: true, notify: true, clipboardWrite: true },
    tabsEnabled: false,
  });
  const statics = caps.filter((c) => c.source === 'static');
  assert.equal(statics.length, 5);
  for (const node of statics) {
    assert.equal(node.revocable, false, `${node.id} must be revocable:false`);
    assert.equal(node.revokeHint, STATIC_PERMISSION_REVOKE_HINT);
    assert.match(node.revokeHint ?? '', /不可逐项撤销（需停用\/卸载扩展）/);
    assert.ok(!node.controls.some((c) => c.kind === 'revoke'), `${node.id} must not offer revoke`);
    assert.deepEqual(node.controls, []);
  }
  const optionals = caps.filter((c) => c.source === 'optional');
  assert.equal(optionals.length, 4);
  const bookmarks = optionals.find((c) => c.capability === 'bookmarks')!;
  assert.equal(bookmarks.granted, true);
  assert.equal(bookmarks.revocable, true);
  assert.ok(bookmarks.controls.some((c) => c.kind === 'revoke'));
  const downloads = optionals.find((c) => c.capability === 'downloads')!;
  assert.equal(downloads.granted, false, 'granted comes from the raw grant, not the privacy toggle');
  assert.deepEqual(downloads.controls, [], 'not-granted capability offers no revoke control');
  const toggles = caps.filter((c) => c.source === 'toggle');
  assert.equal(toggles.length, 7, '6 privacy switches + the tabs switch');
  for (const node of toggles) {
    assert.ok(node.controls.some((c) => c.kind === 'toggle'), `${node.id} must offer a reversible toggle`);
  }
  const tabs = toggles.find((c) => c.id === 'toggle:tabs-enabled')!;
  assert.equal(tabs.enabled, false);
  assert.equal(tabs.controls[0]?.actionId, 'set-tabs-toggle');
});

// ---------------------------------------------------------------------------
// dimension 3: commands (FR-V2-013, FR-V2-064, ADR-V2-004/011/012/014)
// ---------------------------------------------------------------------------

test('V2-1 command derivation: site S1 + risk defaults + missing risk fail-closed (FR-V2-064)', () => {
  assert.equal(deriveAction({ group: 'site', risk: 'read', isSiteOriginAuthorized: true }).action, 'allow');
  assert.equal(deriveAction({ group: 'site', risk: 'write', isSiteOriginAuthorized: true }).action, 'ask');
  const unauthorized = deriveAction({ group: 'site', risk: 'read', isSiteOriginAuthorized: false });
  assert.equal(unauthorized.action, 'deny');
  assert.equal(unauthorized.denyCause, 's1-unauthorized');
  const evaluate = deriveAction({ group: 'plugin', risk: 'evaluate', isSiteOriginAuthorized: false });
  assert.equal(evaluate.action, 'deny');
  assert.equal(evaluate.denyCause, 'evaluate-floor');
  assert.equal(evaluate.hardDeny, true);
  for (const risk of [undefined, 'bogus' as never]) {
    const unknown = deriveAction({ group: 'plugin', risk: risk as never, isSiteOriginAuthorized: false });
    assert.equal(unknown.action, 'deny', `risk ${String(risk)} must fail closed`);
    assert.equal(unknown.denyCause, 's3-unknown-risk');
  }
  // Pinned table (single truth: security/policy.ts).
  assert.deepEqual(PLUGIN_RISK_DEFAULTS, {
    read: 'allow',
    write: 'ask',
    external: 'ask',
    ui: 'ask',
    state: 'ask',
    evaluate: 'deny',
  });
});

test('V2-1 command sourceKind: 8-value classification matches the origin of each tool', () => {
  assert.equal(sourceKindOf('site_notes-list'), 'site-declared');
  assert.equal(sourceKindOf('admin_audit-export'), 'plugin-admin');
  assert.equal(sourceKindOf('tabs'), 'plugin-tabs');
  assert.equal(sourceKindOf('bookmarks'), 'plugin-bookmarks');
  assert.equal(sourceKindOf('downloads'), 'plugin-downloads');
  assert.equal(sourceKindOf('notify'), 'plugin-notify');
  assert.equal(sourceKindOf('clipboard'), 'plugin-clipboard');
  assert.equal(sourceKindOf('dom'), 'base-builtin');
  assert.equal(sourceKindOf('web-fetch'), 'base-builtin');
});

test('V2-1 commands: cardId / delayMs split from action / denial ⇒ controls:[] / suppressed readable', () => {
  const entries: ToolSurfaceEntry[] = [
    { name: 'site_notes-list', group: 'site', risk: 'read', subcommands: ['list', 'add'], subcommandRisks: { list: 'read', add: 'write' }, presentInSurface: true },
    { name: 'dom', group: 'ui', risk: 'ui', subcommands: ['snapshot'], presentInSurface: true },
    { name: 'tabs', group: 'plugin', risk: 'write', subcommands: ['list'], presentInSurface: false, suppressionReason: 'tabs 开关已关闭：工具面已移除 tabs' },
    { name: 'mystery', group: 'plugin', subcommands: [], presentInSurface: true },
  ];
  const nodes = projectCommands(entries, { delayMs: 250, activeOrigin: 'https://a.test', isOriginAuthorized: () => true });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  assert.equal(byId.get('cmd:site_notes-list#add')!.cardId, 'cmd:site_notes-list#add');
  assert.equal(byId.get('cmd:dom')!.cardId, 'cmd:dom');
  for (const node of nodes) {
    assert.equal(node.delayMs, 250, 'delayMs is the injected truth, split from action');
    if (node.action === 'deny') {
      assert.deepEqual(node.controls, [], `${node.id}: deny must expose zero controls (ADR-V2-011)`);
    }
  }
  assert.equal(byId.get('cmd:site_notes-list#add')!.action, 'ask');
  assert.equal(byId.get('cmd:site_notes-list#list')!.action, 'allow');
  assert.equal(byId.get('cmd:mystery')!.action, 'deny');
  assert.equal(byId.get('cmd:mystery')!.denyCause, 's3-unknown-risk');
  const tabs = byId.get('cmd:tabs')!;
  assert.equal(tabs.suppressed, true);
  assert.equal(tabs.presentInSurface, false);
  assert.match(tabs.suppressionReason ?? '', /tabs 开关已关闭/);
  assert.ok(tabs.badges.some((x) => x.kind === 'suppressed'));
  assert.equal(tabs.sourceKind, 'plugin-tabs');
});

test('V2-1 commands: deny ⇒ controls:[] holds across the whole rich command face', () => {
  const snapshot = projectInsightTree(richSource());
  const commands = groupOf(snapshot, 'command').children as CommandNode[];
  assert.ok(commands.length >= 10);
  let sawDeny = false;
  for (const node of commands) {
    if (node.action === 'deny') {
      sawDeny = true;
      assert.deepEqual(node.controls, [], `${node.id} deny controls`);
      assert.ok(node.denyCause, `${node.id} deny must carry a cause`);
    }
  }
  assert.equal(sawDeny, true, 'the fixture must exercise at least one deny to make the rule non-vacuous');
});

test('V2-1 commands: crossLinks to the active site and the backing capability (ADR-V2-003)', () => {
  const snapshot = projectInsightTree(richSource());
  const commands = groupOf(snapshot, 'command').children as CommandNode[];
  const site = commands.find((c) => c.name === 'site_notes-list' && !c.subcommand)!;
  assert.ok(site.crossLinks.some((l) => l.to === 'site:https://a.test' && l.kind === 'origin'));
  const siteNode = groupOf(snapshot, 'site').children.find((c) => c.id === 'site:https://a.test')!;
  assert.ok(siteNode.crossLinks.some((l) => l.from === 'site:https://a.test' && l.kind === 'tool'));
  const bookmarks = commands.find((c) => c.name === 'bookmarks' && !c.subcommand)!;
  assert.ok(bookmarks.crossLinks.some((l) => l.to === 'cap:opt:bookmarks' && l.kind === 'permission'));
});

// ---------------------------------------------------------------------------
// dimension 4: LLM (FR-V2-014)
// ---------------------------------------------------------------------------

test('V2-1 llm: node fields equal LlmStatusSummary; sessions sorted; no key material', () => {
  const snapshot = projectInsightTree(richSource());
  const llm = groupOf(snapshot, 'llm').children[0] as LlmNode;
  assert.equal(llm.id, 'llm:deepseek');
  assert.equal(llm.configured, true);
  assert.equal(llm.providerId, 'deepseek');
  assert.equal(llm.providerName, 'DeepSeek');
  assert.equal(llm.model, 'deepseek-chat');
  // lastActiveAt descending: group:g1 (9) before a.test (5)
  assert.deepEqual(llm.sessions.map((s) => s.id), ['session:group:g1', 'session:https://a.test']);
});

// ---------------------------------------------------------------------------
// empty states / degradation (FR-V2-017)
// ---------------------------------------------------------------------------

test('V2-1 empty/降级: ≥3 readable degradations (no sites / no authorized / no commands / llm unconfigured)', () => {
  const empty = projectInsightTree({
    sites: [],
    capability: { grants: { bookmarks: false, downloads: false, notify: false, clipboard: false }, toggles: { ...CAPS_OFF }, tabsEnabled: true },
    toolSurface: [],
    delayMs: 0,
    llm: { configured: false, providerId: '', providerName: '', model: '' },
  });
  const codes = empty.meta.degradations.map((d) => d.code);
  assert.ok(codes.includes('no-sites'));
  assert.ok(codes.includes('no-commands'));
  assert.ok(codes.includes('llm-unconfigured'));
  assert.equal(empty.meta.degradations.length >= 3, true);
  for (const d of empty.meta.degradations) assert.ok(d.text.length > 0, `degradation ${d.code} needs readable text`);

  const unauthorizedOnly = projectInsightTree(
    richSource({
      sites: [{ origin: 'https://z.test', authorized: false, trust: 'untrusted', updatedAt: 1 }],
    }),
  );
  assert.ok(unauthorizedOnly.meta.degradations.some((d) => d.code === 'no-authorized-sites'));

  // Injected read failure is carried as a degradation and never silently becomes "empty".
  const failed = projectInsightTree(
    richSource({ degradations: [{ dimension: 'site', code: 'read-failed', text: '存储读取失败：沿用 fail-safe 默认，未当作已撤销' }] }),
  );
  assert.ok(failed.meta.degradations.some((d) => d.code === 'read-failed'));
});

// ---------------------------------------------------------------------------
// determinism helpers available here (full determinism gate is the sibling file)
// ---------------------------------------------------------------------------

test('V2-1 canonical JSON: stableStringify is key-order independent', () => {
  assert.equal(stableStringify({ b: 1, a: { d: 2, c: 3 } }), stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
});

// ---------------------------------------------------------------------------
// zero side effects + zero plaintext (FR-V2-016 / NFR-V21-001/002)
// ---------------------------------------------------------------------------

function dumpKv(kv: PluginKv & { dump: () => Record<string, unknown> }): string {
  return JSON.stringify(kv.dump());
}

function memoryKv(): PluginKv & { dump: () => Record<string, unknown> } {
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
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

test('V2-1 zero side effects: projection leaves storage and audit untouched, and never mutates its input', async () => {
  const kv = memoryKv();
  const audit = createStorageAuditSink(kv);
  const origins = createOriginStore(kv, { audit });
  await origins.authorize('https://a.test');
  const records = await origins.list();

  const source: InsightSource = {
    sites: records.map((r) => ({
      origin: r.origin,
      authorized: r.authorized,
      trust: r.trust,
      ...(r.authorizedAt !== undefined ? { authorizedAt: r.authorizedAt } : {}),
      updatedAt: r.updatedAt,
    })),
    capability: { grants: { bookmarks: false, downloads: false, notify: false, clipboard: false }, toggles: { ...CAPS_OFF }, tabsEnabled: true },
    toolSurface: [{ name: 'dom', group: 'ui', risk: 'ui', subcommands: ['snapshot'], presentInSurface: true }],
    delayMs: 0,
  };
  const frozenInput = JSON.stringify(source);
  const auditBefore = audit.events.length;
  const kvBefore = dumpKv(kv);
  const snapshot = projectInsightTree(source, { builtAt: 1 });
  assert.ok(snapshot.meta.hash.length > 0);
  assert.equal(dumpKv(kv), kvBefore, 'projection must not write storage');
  assert.equal(audit.events.length, auditBefore, 'projection must not add audit entries');
  assert.equal(JSON.stringify(source), frozenInput, 'projection must not mutate its input');

  // builder path is equally read-only.
  const built = await buildInsightTree({
    listOrigins: async () => records,
    capability: { grants: { bookmarks: false, downloads: false, notify: false, clipboard: false }, toggles: { ...CAPS_OFF }, tabsEnabled: true },
    toolSurface: () => [{ name: 'dom', group: 'ui', risk: 'ui', subcommands: ['snapshot'], presentInSurface: true }],
    delayMs: 0,
  });
  assert.equal(built.version, 1);
  assert.equal(dumpKv(kv), kvBefore);
  assert.equal(audit.events.length, auditBefore);

  const payloadSource = await buildInsightTreePayload({
    listOrigins: () => records,
    capability: { grants: { bookmarks: false, downloads: false, notify: false, clipboard: false }, toggles: { ...CAPS_OFF }, tabsEnabled: true },
    toolSurface: () => [{ name: 'dom', group: 'ui', risk: 'ui', subcommands: ['snapshot'], presentInSurface: true }],
    delayMs: 0,
  });
  assert.equal(Array.isArray(payloadSource.toolSurface), true);
});

test('V2-1 zero plaintext: serialized snapshot/summary never carries key / clipboard / notification / query material', () => {
  const snapshot = projectInsightTree(
    richSource({
      sessions: [{ sessionId: 'https://a.test', label: '会话（不含正文）', origins: ['https://a.test'], lastActiveAt: 1 }],
      degradations: [{ dimension: 'llm', code: 'llm-unconfigured', text: 'LLM 未配置：在设置页填入 API Key 后即可使用助手' }],
    }),
  );
  const json = JSON.stringify({ snapshot, summary: summarizeInsight(snapshot) });
  assert.equal(/sk-|apiKey|"apiKey"|token/i.test(json), false);
  assert.equal(json.includes('clipboard-content'), false);
  assert.equal(json.includes('notification-body'), false);
  assert.equal(json.includes('?q='), false);
  // Only origins (no path/query) are carried for sites.
  assert.equal(json.includes('/path'), false);
});

test('V2-1 summarizeInsight: counts + badge histogram are a small, additive summary', () => {
  const snapshot = projectInsightTree(richSource());
  const summary = summarizeInsight(snapshot);
  assert.equal(summary.version, 1);
  assert.equal(summary.counts.sites, 2);
  assert.equal(summary.counts.capabilities, 16); // 5 static + 4 optional + 7 toggles
  assert.equal(summary.counts.llms, 1);
  assert.equal(summary.counts.sessions, 2);
  // V5-3 review R1 BLOCK-01: the badge histogram no longer counts authorization-state
  // values (the 台账 points at the chip); it counts the pointer + the other dimensions.
  assert.equal(summary.badges.authorized, undefined);
  assert.equal(summary.badges.unauthorized, undefined);
  assert.equal(typeof summary.badges['auth-pointer'], 'number');
  assert.equal(summary.degraded, false);
});

// ---------------------------------------------------------------------------
// `state` additive compatibility (FR-V2-016 / ADR-V2-004)
// ---------------------------------------------------------------------------

test('V2-1 state additive: existing keys unchanged; insight is an optional additive field', async () => {
  const base = await buildStateMessage({ active: null, tools: [], isAuthorized: async () => false });
  assert.deepEqual(Object.keys(base).sort(), ['active', 'authorized', 'session', 'tab', 'tools', 'trust']);
  assert.equal('insight' in base, false);

  const snapshot = projectInsightTree(richSource());
  const withInsight = await buildStateMessage({
    active: null,
    tools: [],
    isAuthorized: async () => false,
    insight: summarizeInsight(snapshot),
  });
  assert.deepEqual(Object.keys(withInsight).sort(), ['active', 'authorized', 'insight', 'session', 'tab', 'tools', 'trust']);
  assert.equal(withInsight.authorized, false);
  assert.equal((withInsight.insight as { counts: { sites: number } }).counts.sites, 2);
});

// ---------------------------------------------------------------------------
// capability node projection via the whole snapshot (structure guarantee reuse)
// ---------------------------------------------------------------------------

test('V2-1 snapshot capabilities: static nodes stay revocable:false inside the forest', () => {
  const snapshot = projectInsightTree(richSource());
  const caps = groupOf(snapshot, 'capability').children as CapabilityNode[];
  for (const node of caps.filter((c) => c.source === 'static')) {
    assert.equal(node.revocable, false);
    assert.deepEqual(node.controls, []);
  }
});

// Keep the shared fixture honest: the host builder used by the catalog gate lives
// in the sibling file; this file only consumes the pure projection layer.
