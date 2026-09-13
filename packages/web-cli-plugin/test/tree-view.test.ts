/**
 * V2-2 gate `tree-view` (TASK-003; FR-V2-021/022/025, AC-V22-001/005/006/008/010/011;
 * ADR-V2-011 / ADR-V2-013 / ADR-V2-030).
 *
 * The render model is proven structurally, not by wording:
 *   - **hard-floor** deny (S3 unknown-risk / S1 / evaluate) ⇒ `controls === []` +
 *     readable `clampReasonLabel`;
 *   - **overridable** command rows ⇒ exactly 3 `command-policy` controls
 *     (allow/ask/deny) — R2 supersession S4 (command level now supports coverage);
 *   - a **non-hard-floor** deny (user override) keeps its controls and can change back
 *     (R2 S5 addition);
 *   - static permissions never carry `revoke` + always disclose `revokeHint`;
 *   - optional capabilities get `revoke` ONLY when granted (no fake revoke);
 *   - `header.modelNote` / `header.noEscalationNote` carry the R2 pinned wording
 *     (ownership hierarchy + two pathways + `delay` disambiguation) — supersession S6;
 *   - `needsConfirmation` is correct for all 9 actions;
 *   - filtering is read-only (snapshot deep-equal before/after) and keeps the
 *     ancestors of the hits (R2 nested tree).
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
import {
  TREE_MODEL_NOTE,
  TREE_NO_ESCALATION_NOTE,
  buildTreeRows,
  collectTreeRows,
  commandPolicyNeedsConfirmation,
  needsConfirmation,
  type TreeRow,
} from '../src/ui/tree/tree-view.js';
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
 * derives `deny` (S3 hard floor), so the structural guarantee is exercised on ALL
 * baseline subcommands.
 */
function surfaceFromBaseline() {
  const baseline = loadBaseline();
  assert.equal(baseline.tools.length, 34);
  return {
    names: baseline.tools.map((t) => t.name),
    subcommands: new Map(baseline.tools.map((t) => [t.name, [...t.subcommands]])),
  };
}

function flat(model: ReturnType<typeof buildTreeRows>): TreeRow[] {
  return collectTreeRows(model);
}

function commandRows(model: ReturnType<typeof buildTreeRows>): TreeRow[] {
  return flat(model).filter((row) => row.kind === 'command');
}

// R2 supersession S5: this fixture is ALL S3 hard-floor deny, so the original
// structural guarantee still holds — renamed + strengthened (clampReason readable).
test('V2-2 tree-view: hard-floor deny (S3) ⇒ controls === [] (structural, R2 supersession S5)', () => {
  const surface = surfaceFromBaseline();
  const snapshot = projectInsightTree(sourceFromSurface(surface));
  const model = buildTreeRows(snapshot);

  const all = commandRows(model);
  assert.equal(all.filter((r) => r.nodeId?.includes('#')).length, 142, 'baseline subcommand count must be 142');
  assert.equal(all.length, 34 + 142, 'tool rows + subcommand rows');

  const denyRows = all.filter((r) => r.action === 'deny');
  assert.equal(denyRows.length, 176, 'every baseline command derives deny (no risk injected)');
  for (const row of denyRows) {
    assert.equal(row.controls.length, 0, `deny row ${row.id} must expose zero controls`);
    assert.equal(row.overridable, false, `hard-floor ${row.id} must not be overridable`);
    assert.ok(row.clampReason, `hard-floor ${row.id} must carry a clampReason`);
    assert.ok(
      typeof row.clampReasonLabel === 'string' && row.clampReasonLabel.length > 0,
      `hard-floor ${row.id} must carry a readable clampReasonLabel`,
    );
  }
});

// R2 supersession S4: command nodes are now overridable (allow/ask/deny), while
// hard-floor rows stay control-free.
test('V2-2 tree-view: overridable command rows expose allow/ask/deny; hard-floor rows expose none (R2 supersession S4)', () => {
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
  const rows = commandRows(buildTreeRows(snapshot));

  const allowRow = rows.find((r) => r.nodeId === 'cmd:read-tool');
  assert.ok(allowRow, 'read risk must derive allow');
  assert.equal(allowRow.action, 'allow');
  assert.equal(allowRow.overridable, true);
  assert.deepEqual(
    allowRow.controls.map((c) => c.policyAction),
    ['allow', 'ask', 'deny'],
    'overridable rows expose exactly allow/ask/deny',
  );
  assert.equal(
    allowRow.controls.every((c) => c.kind === 'command-policy' && c.actionId === 'set-command-policy'),
    true,
  );
  assert.equal(allowRow.controls.filter((c) => c.selected).map((c) => c.policyAction).join(','), 'allow');
  // No revoke/toggle write control leaks into a command row.
  assert.equal(allowRow.controls.some((c) => c.kind === 'revoke' || c.kind === 'toggle'), false);

  // The unauthorized site tool must be a hard-floor deny row: zero controls + reason.
  const siteRow = rows.find((r) => r.nodeId === 'cmd:site_thing');
  assert.ok(siteRow);
  assert.equal(siteRow.action, 'deny');
  assert.equal(siteRow.controls.length, 0);
  assert.equal(siteRow.overridable, false);
  assert.equal(siteRow.clampReason, 's1-unauthorized');
  assert.match(siteRow.clampReasonLabel ?? '', /S1 未授权站点/);
});

// R2 S5 addition: a non-hard-floor deny (user override) keeps its controls and can
// be changed back — the deny layering is structural, not a wording promise.
test('R2 tree-view: non-hard-floor deny (user override) keeps controls and can change back', () => {
  const overrides = { get: (name: string) => (name === 'read-tool' ? ('deny' as const) : undefined) };
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
    toolSurface: [{ name: 'read-tool', risk: 'read', subcommands: [], presentInSurface: true }],
    delayMs: 0,
    overrides,
  });
  const row = commandRows(buildTreeRows(snapshot)).find((r) => r.nodeId === 'cmd:read-tool');
  assert.ok(row);
  assert.equal(row.defaultAction, 'allow');
  assert.equal(row.overrideAction, 'deny');
  assert.equal(row.effectiveAction, 'deny');
  assert.equal(row.overridable, true, 'a non-hard-floor deny stays overridable');
  assert.equal(row.controls.length, 3, 'non-hard-floor deny keeps allow/ask/deny controls');
  assert.equal(row.clampReason, undefined);
  assert.equal(row.controls.find((c) => c.selected)?.policyAction, 'deny');
});

test('V2-2 tree-view: static permissions carry no revoke control + disclose the hint', () => {
  const snapshot = projectInsightTree(sourceFromSurface(pluginSurface()));
  const rows = flat(buildTreeRows(snapshot)).filter((r) => r.kind === 'capability');
  const staticNodes = snapshot.groups[1].children as CapabilityNode[];
  const staticRows = rows.filter((r) => {
    const node = staticNodes.find((n) => n.id === r.nodeId);
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
  const notGranted = flat(
    buildTreeRows(
      projectInsightTree({
        ...base,
        capability: { ...base.capability, grants: { bookmarks: false, downloads: false, notify: false, clipboard: false } },
      }),
    ),
  ).filter((r) => r.nodeId?.startsWith('cap:opt:') ?? false);

  const grantedSnapshot = projectInsightTree({
    ...base,
    capability: { ...base.capability, grants: { bookmarks: true, downloads: false, notify: false, clipboard: false } },
  });
  const grantedRows = flat(buildTreeRows(grantedSnapshot));
  const bookmarks = grantedRows.find((r) => r.nodeId === 'cap:opt:bookmarks');
  assert.ok(bookmarks);
  assert.equal(bookmarks.controls.some((c) => c.kind === 'revoke'), true, 'granted optional capability offers revoke');

  for (const row of notGranted) {
    if (row.nodeId === 'cap:opt:bookmarks') continue;
    assert.equal(row.controls.length, 0, `ungranted optional ${row.id} must not offer revoke`);
  }
});

// R2 supersession S6: wording rewritten (ownership hierarchy + two pathways +
// `delay` disambiguation retained).
test('R2 tree-view: pinned wording — ownership hierarchy + two pathways + delay disambiguation (supersession S6)', () => {
  const model = buildTreeRows(projectInsightTree(sourceFromSurface(pluginSurface())));
  assert.equal(model.header.modelNote, TREE_MODEL_NOTE);
  assert.ok(model.header.modelNote.includes('按归属的层级树'));
  assert.equal(model.header.modelNote.includes('森林'), false, 'deviation wording must be gone');
  assert.equal(model.header.modelNote.includes('非严格树'), false, 'deviation wording must be gone');

  assert.equal(model.header.noEscalationNote, TREE_NO_ESCALATION_NOTE);
  assert.ok(model.header.noEscalationNote.includes('撤销/关断 = 回到更保守，不放宽任何门禁'));
  assert.ok(model.header.noEscalationNote.includes('命令级覆盖 = 用户显式、被审计的放宽'));
  assert.ok(model.header.noEscalationNote.includes('硬底线不可覆盖'));
  assert.ok(model.header.noEscalationNote.includes('delay'));
  assert.ok(model.header.noEscalationNote.includes('deny'));
  assert.ok(model.header.noEscalationNote.includes('fail-closed'));
  assert.ok(model.header.noEscalationNote.includes('delayMs'));
});

// R2 (2026-09-13) — supersession S7 (ADR-V2-031): the whitelist grew 7 → 9.
test('V2-2 tree-view: needsConfirmation is correct for all 9 actions (R2 supersession S7)', () => {
  const expected: Record<TreeActionId, boolean> = {
    'revoke-origin': true,
    'revoke-capability': true,
    'set-capability-toggle': false,
    'set-tabs-toggle': false,
    'clear-auto-auth': true,
    'disconnect-llm': true,
    'dissolve-group': true,
    'set-command-policy': false,
    'reset-command-policy': false,
  };
  const actions = Object.keys(expected) as TreeActionId[];
  assert.equal(actions.length, 9);
  for (const actionId of actions) {
    assert.equal(needsConfirmation(actionId), expected[actionId], `needsConfirmation(${actionId})`);
  }
  // Widening-only confirmation (R2): desired allow vs default tier.
  assert.equal(commandPolicyNeedsConfirmation('allow', 'ask'), true, 'allow on an ask-default command is a widening → confirm');
  assert.equal(commandPolicyNeedsConfirmation('allow', 'allow'), false, 'allow on an allow-default command is not a widening');
  assert.equal(commandPolicyNeedsConfirmation('ask', 'allow'), false, 'ask is a tightening → no confirm');
  assert.equal(commandPolicyNeedsConfirmation('deny', 'allow'), false, 'deny is a tightening → no confirm');
  assert.equal(commandPolicyNeedsConfirmation('allow', undefined), true, 'unknown default is treated as widening (fail-closed)');
});

test('R2 tree-view: the model is a real nested hierarchy (author example ② path)', () => {
  const model = buildTreeRows(projectInsightTree(sourceFromSurface(pluginSurface())));
  assert.equal(model.root.label, '连接树');
  const commandFace = model.root.children.find((c) => c.kind === 'face' && c.dimension === 'command');
  assert.ok(commandFace, 'the command face must exist at level 1');
  const source = commandFace.children.find((c) => c.label === '系统内置命令');
  assert.ok(source, 'the 系统内置命令 source group must exist under the command face');
  const dom = source.children.find((c) => c.label === 'dom');
  assert.ok(dom, 'the dom tool node must be under 系统内置命令');
  assert.ok(
    dom.children.some((c) => c.label === 'dom read-state'),
    'the dom read-state subcommand must be a child of dom',
  );
});

test('V2-2 tree-view: filtering is read-only (snapshot + rows deep-equal before/after)', () => {
  const snapshot = projectInsightTree(sourceFromSurface(pluginSurface()));
  const before = JSON.stringify(snapshot);
  const baseRows = buildTreeRows(snapshot);
  const baseRowsJson = JSON.stringify(baseRows);

  const commandOnly = buildTreeRows(snapshot, { dimension: 'command' });
  assert.equal(commandOnly.root.children.length, 1);
  assert.equal(commandOnly.root.children[0].dimension, 'command');

  const queried = buildTreeRows(snapshot, { query: 'dom' });
  assert.ok(queried.filter.matches >= 1, 'query must actually select nodes');
  assert.ok(queried.filter.matches < baseRows.filter.matches, 'query must narrow the set');

  const denyOnly = buildTreeRows(projectInsightTree(sourceFromSurface(surfaceFromBaseline())), {
    action: 'deny',
  });
  assert.equal(denyOnly.filter.matches, 176);

  const builtinOnly = buildTreeRows(snapshot, { sourceKind: 'base-builtin' });
  assert.ok(builtinOnly.filter.matches >= 1);
  for (const row of commandRows(builtinOnly)) {
    assert.equal(row.sourceKind, 'base-builtin');
  }

  // No mutation of the snapshot, and repeated builds are deterministic.
  assert.equal(JSON.stringify(snapshot), before, 'filtering must never mutate the snapshot');
  assert.equal(JSON.stringify(buildTreeRows(snapshot)), baseRowsJson, 'build must be deterministic');
});

// R2 supersession S8: layering under filter.
test('R2 tree-view: hard-floor deny rows stay control-free under filter; overridable rows keep controls (supersession S8)', () => {
  const hardFloor = buildTreeRows(projectInsightTree(sourceFromSurface(surfaceFromBaseline())), { action: 'deny' });
  for (const row of commandRows(hardFloor)) {
    if (row.action === 'deny') assert.equal(row.controls.length, 0, `${row.id} must stay control-free under filter`);
  }

  const overrides = { get: (name: string) => (name === 'read-tool' ? ('deny' as const) : undefined) };
  const overridableDeny = buildTreeRows(
    projectInsightTree({
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
        { name: 'read-tool', risk: 'read', subcommands: [], presentInSurface: true },
        { name: 'mystery', subcommands: [], presentInSurface: true },
      ],
      delayMs: 0,
      overrides,
    }),
    { action: 'deny' },
  );
  const rows = commandRows(overridableDeny);
  assert.ok(rows.length >= 1, 'the overridable deny must survive the filter');
  assert.equal(
    rows.some((r) => r.overridable === true && r.controls.length === 3),
    true,
    'overridable deny rows keep their 3 policy controls under filter',
  );
});
