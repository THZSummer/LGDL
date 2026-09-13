/**
 * V2-2 gate `tree-view` (TASK-003; FR-V2-021/022/025, AC-V22-001/005/006;
 * ADR-V2-011 / ADR-V2-013).
 *
 * New file — the render model is proven structurally, not by wording:
 *   - all 142 baseline subcommands (34 tools) with `action==='deny'` ⇒ `controls === []`;
 *   - a non-deny command still gets NO write control (command level has no write path);
 *   - static permissions never carry `revoke` + always disclose `revokeHint`;
 *   - optional capabilities get `revoke` ONLY when granted (no fake revoke);
 *   - `header.modelNote` / `header.noEscalationNote` carry the pinned wording;
 *   - `needsConfirmation` is correct for all 7 actions;
 *   - filtering is read-only (snapshot deep-equal before/after).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformEnv, PlatformEventHub } from '@lgdl/web-cli-base';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createRemoteDomOps } from '../src/content/dom-agent.js';
import { createRemoteEventHub } from '../src/tools/remote-events.js';
import { projectInsightTree, type InsightSource } from '../src/insight/project-tree.js';
import { loadBaseline } from '../src/insight/catalog-reconcile.js';
import { TREE_MODEL_NOTE, TREE_NO_ESCALATION_NOTE, buildTreeRows, needsConfirmation } from '../src/ui/tree/tree-view.js';
import type { CapabilityNode, TreeActionId } from '../src/insight/tree-model.js';

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

/** Same full-surface host as `test/insight-catalog.test.ts` (v1/v2-1 files untouched). */
function buildFullHost() {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const ops = createRemoteDomOps({ request: async () => ({ ok: true, output: '' }) });
  const env = {
    kind: 'browser',
    fetch: globalThis.fetch,
    dom: { state: { snapshot: async () => ({ unavailable: true }) }, ops },
    filePicker: { save: async () => ({ ok: true }), download: async () => {} },
    events: createRemoteEventHub({ request: async () => ({ ok: false, error: 'test transport' }) }) as PlatformEventHub,
  } as unknown as PlatformEnv;
  return createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    tabs: {
      listTabs: async () => [],
      switchToTab: async () => ({ ok: true, output: '' }),
      openTab: async () => ({ ok: true, output: '' }),
      isAuthorized: () => false,
      sessionIdForOrigin: (origin) => origin,
      audit,
    },
    tabsEnabled: true,
    bookmarks: {
      hasPermission: async () => true,
      listBookmarks: async () => [],
      searchBookmarks: async () => [],
      getTree: async () => [],
      addBookmark: async () => ({ ok: true, output: '' }),
      removeBookmark: async () => ({ ok: true, output: '' }),
      moveBookmark: async () => ({ ok: true, output: '' }),
      audit,
    },
    downloads: {
      hasPermission: async () => true,
      listDownloads: async () => [],
      searchDownloads: async () => [],
      audit,
    },
    bookmarksEnabled: { read: true, write: false },
    downloadsEnabled: true,
    notify: {
      hasPermission: async () => true,
      listNotifications: async () => ({ entries: [], permissionLevel: 'granted' }),
      createNotification: async () => ({ ok: true, output: '', id: 'n1' }),
      clearNotification: async () => ({ ok: true, output: '' }),
      audit,
    },
    notifyEnabled: true,
    clipboard: {
      hasReadPermission: async () => true,
      hasWritePermission: async () => true,
      readText: async () => ({ ok: true, text: '', chars: 0, path: 'test' }),
      writeText: async () => ({ ok: true, chars: 0, path: 'test' }),
      audit,
    },
    clipboardEnabled: { read: false, write: true },
    webFetch: {
      currentOrigin: () => undefined,
      hasHostPermission: async () => false,
      fetchImpl: globalThis.fetch,
    },
    browserTools: { env },
  });
}

interface Surface {
  names: string[];
  subcommands: Map<string, string[]>;
}

function pluginSurface(): Surface {
  const host = buildFullHost();
  const names = host.deriveTools().map((t) => t.name);
  const subcommands = new Map<string, string[]>();
  for (const name of names) {
    const entry = host.router.query({ name })[0];
    const params = entry?.schema?.parameters as
      | { properties?: { subcommand?: { enum?: string[] } } }
      | undefined;
    const sub = params?.properties?.subcommand;
    subcommands.set(name, Array.isArray(sub?.enum) ? sub.enum : []);
  }
  return { names, subcommands };
}

function sourceFromSurface(surface: Surface): InsightSource {
  return {
    sites: [],
    capability: {
      grants: { bookmarks: false, downloads: false, notify: false, clipboard: false },
      toggles: {
        bookmarksRead: false,
        bookmarksWrite: false,
        downloadsRead: false,
        notify: false,
        clipboardRead: false,
        clipboardWrite: false,
      },
      tabsEnabled: false,
    },
    // No risk injected → every command derives `deny` (S3 unknown-risk, fail-closed).
    toolSurface: surface.names.map((name) => ({
      name,
      subcommands: [...(surface.subcommands.get(name) ?? [])],
      presentInSurface: true,
      ...(name.startsWith('site_') ? { group: 'site' } : {}),
    })),
    delayMs: 0,
  };
}

/**
 * The single catalogue baseline (`test/parity/baseline-catalog.json`, 34 tools /
 * 142 subcommands) as a projection input. No risk is injected → every command
 * derives `deny`, so the structural guarantee is exercised on ALL baseline
 * subcommands (not just the live `deriveTools()` subset, which is 23/71 after
 * waivers).
 */
function surfaceFromBaseline() {
  const baseline = loadBaseline();
  assert.equal(baseline.tools.length, 34);
  return {
    names: baseline.tools.map((t) => t.name),
    subcommands: new Map(baseline.tools.map((t) => [t.name, [...t.subcommands]])),
  };
}

test('V2-2 tree-view: all 142 baseline subcommands with deny ⇒ controls === [] (structural)', () => {
  const surface = surfaceFromBaseline();
  const snapshot = projectInsightTree(sourceFromSurface(surface));
  const model = buildTreeRows(snapshot);
  const commandGroup = model.groups.find((g) => g.dimension === 'command');
  assert.ok(commandGroup, 'command group must exist');

  const subRows = commandGroup.rows.filter((r) => r.depth === 2);
  assert.equal(subRows.length, 142, 'baseline subcommand count must be 142');
  assert.equal(commandGroup.rows.length, 34 + 142, 'tool rows + subcommand rows');

  const denyRows = commandGroup.rows.filter((r) => r.action === 'deny');
  assert.equal(denyRows.length, 176, 'every baseline command derives deny (no risk injected)');
  for (const row of denyRows) {
    assert.equal(row.controls.length, 0, `deny row ${row.id} must expose zero controls`);
  }
});

test('V2-2 tree-view: a non-deny command still gets no write control (no command-level write)', () => {
  const snapshot = projectInsightTree({
    sites: [],
    capability: {
      grants: { bookmarks: false, downloads: false, notify: false, clipboard: false },
      toggles: {
        bookmarksRead: false,
        bookmarksWrite: false,
        downloadsRead: false,
        notify: false,
        clipboardRead: false,
        clipboardWrite: false,
      },
      tabsEnabled: false,
    },
    toolSurface: [
      { name: 'read-tool', risk: 'read', subcommands: ['a', 'b'], presentInSurface: true },
      { name: 'site_thing', group: 'site', risk: 'read', subcommands: [], presentInSurface: true },
    ],
    delayMs: 0,
  });
  const rows = buildTreeRows(snapshot).groups.find((g) => g.dimension === 'command')!.rows;
  const allowRow = rows.find((r) => r.id === 'cmd:read-tool');
  assert.ok(allowRow, 'read risk must derive allow');
  assert.equal(allowRow.action, 'allow');
  assert.equal(
    allowRow.controls.some((c) => c.kind === 'revoke' || c.kind === 'toggle'),
    false,
    'command rows must never expose a write control',
  );
  assert.equal(allowRow.controls.every((c) => c.kind === 'none'), true);

  // The unauthorized site tool must be a deny row with zero controls.
  const siteRow = rows.find((r) => r.id === 'cmd:site_thing');
  assert.ok(siteRow);
  assert.equal(siteRow.action, 'deny');
  assert.equal(siteRow.controls.length, 0);
});

test('V2-2 tree-view: static permissions carry no revoke control + disclose the hint', () => {
  const snapshot = projectInsightTree(sourceFromSurface(pluginSurface()));
  const rows = buildTreeRows(snapshot).groups.find((g) => g.dimension === 'capability')!.rows;
  const staticNodes = snapshot.groups[1].children as CapabilityNode[];
  const staticRows = rows.filter((r) => {
    const node = staticNodes.find((n) => n.id === r.id);
    return node?.source === 'static';
  });
  assert.equal(staticRows.length, 5, 'manifest has 5 static permissions');
  for (const row of staticRows) {
    assert.equal(
      row.controls.some((c) => c.kind === 'revoke'),
      false,
      `static permission ${row.id} must never offer revoke`,
    );
    assert.ok(row.revokeHint && row.revokeHint.length > 0, `static ${row.id} must disclose revokeHint`);
  }
});

test('V2-2 tree-view: optional capability gets revoke only when granted (no fake revoke)', () => {
  const base = sourceFromSurface(pluginSurface());
  const notGranted = buildTreeRows(
    projectInsightTree({
      ...base,
      capability: { ...base.capability, grants: { bookmarks: false, downloads: false, notify: false, clipboard: false } },
    }),
  )
    .groups.find((g) => g.dimension === 'capability')!
    .rows.filter((r) => r.id.startsWith('cap:opt:'));

  const grantedSnapshot = projectInsightTree({
    ...base,
    capability: { ...base.capability, grants: { bookmarks: true, downloads: false, notify: false, clipboard: false } },
  });
  const grantedRows = buildTreeRows(grantedSnapshot).groups.find((g) => g.dimension === 'capability')!.rows;
  const bookmarks = grantedRows.find((r) => r.id === 'cap:opt:bookmarks');
  assert.ok(bookmarks);
  assert.equal(bookmarks.controls.some((c) => c.kind === 'revoke'), true, 'granted optional capability offers revoke');

  for (const row of notGranted) {
    if (row.id === 'cap:opt:bookmarks') continue;
    assert.equal(row.controls.length, 0, `ungranted optional ${row.id} must not offer revoke`);
  }
});

test('V2-2 tree-view: pinned wording (model note + no-escalation / delay disambiguation)', () => {
  const model = buildTreeRows(projectInsightTree(sourceFromSurface(pluginSurface())));
  assert.equal(model.header.modelNote, TREE_MODEL_NOTE);
  assert.ok(model.header.modelNote.includes('四维度分组视图（森林），非严格树'));
  assert.ok(model.header.noEscalationNote.includes('撤销/关断 = 回到更保守，不放宽任何门禁'));
  assert.ok(model.header.noEscalationNote.includes('delay'));
  assert.ok(model.header.noEscalationNote.includes('deny'));
  assert.ok(model.header.noEscalationNote.includes('fail-closed'));
  assert.ok(model.header.noEscalationNote.includes('delayMs'));
});

test('V2-2 tree-view: needsConfirmation is correct for all 7 actions', () => {
  const expected: Record<TreeActionId, boolean> = {
    'revoke-origin': true,
    'revoke-capability': true,
    'set-capability-toggle': false,
    'set-tabs-toggle': false,
    'clear-auto-auth': true,
    'disconnect-llm': true,
    'dissolve-group': true,
  };
  const actions = Object.keys(expected) as TreeActionId[];
  assert.equal(actions.length, 7);
  for (const actionId of actions) {
    assert.equal(needsConfirmation(actionId), expected[actionId], `needsConfirmation(${actionId})`);
  }
});

test('V2-2 tree-view: filtering is read-only (snapshot + rows deep-equal before/after)', () => {
  const snapshot = projectInsightTree(sourceFromSurface(pluginSurface()));
  const before = JSON.stringify(snapshot);
  const baseRows = buildTreeRows(snapshot);
  const baseRowsJson = JSON.stringify(baseRows);

  const commandOnly = buildTreeRows(snapshot, { dimension: 'command' });
  assert.equal(commandOnly.groups.length, 1);
  assert.equal(commandOnly.groups[0].dimension, 'command');

  const queried = buildTreeRows(snapshot, { query: 'dom' });
  assert.ok(queried.filter.matches >= 1, 'query must actually select rows');
  assert.ok(queried.filter.matches < baseRows.filter.matches, 'query must narrow the set');

  const denyOnly = buildTreeRows(projectInsightTree(sourceFromSurface(surfaceFromBaseline())), {
    action: 'deny',
  });
  assert.equal(denyOnly.filter.matches, 176);

  const builtinOnly = buildTreeRows(snapshot, { sourceKind: 'base-builtin' });
  assert.ok(builtinOnly.filter.matches >= 1);
  for (const group of builtinOnly.groups) {
    for (const row of group.rows) {
      if (row.dimension === 'command') assert.equal(row.sourceKind, 'base-builtin');
    }
  }

  // No mutation of the snapshot, and repeated builds are deterministic.
  assert.equal(JSON.stringify(snapshot), before, 'filtering must never mutate the snapshot');
  assert.equal(JSON.stringify(buildTreeRows(snapshot)), baseRowsJson, 'build must be deterministic');
});

test('V2-2 tree-view: deny rows expose zero controls even when a subcommand is filtered out', () => {
  const snapshot = projectInsightTree(sourceFromSurface(pluginSurface()));
  const model = buildTreeRows(snapshot, { action: 'deny' });
  for (const group of model.groups) {
    for (const row of group.rows) {
      if (row.dimension === 'command' && row.action === 'deny') {
        assert.equal(row.controls.length, 0, `${row.id} must stay control-free under filter`);
      }
    }
  }
});
