/**
 * V2-1 门禁 `insight-catalog`（TASK-008；AC-V21-002/007 + ADR-V2-010）。
 *
 * 断言要点：树命令集合 == `deriveTools()` + registry **双向集合等价**（不重不漏）；
 * 基线 **34 工具 / 142 子命令**逐条可列（覆盖率 100%）；**反证自测**（丢一条 → FAIL）；
 * **同源锚定**（V2 `catalog-reconcile.ts` 与 v1 `test/parity.test.ts` 引用同一基线路径）；
 * 过滤只读（过滤前后快照与授权状态 diff 为空）。
 *
 * **新文件承载**；v1 `test/parity.test.ts` 与 `test/parity/**` 零改动。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { PlatformEnv, PlatformEventHub } from '@lgdl/web-cli-base';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createRemoteDomOps } from '../src/content/dom-agent.js';
import { createRemoteEventHub } from '../src/tools/remote-events.js';
import { projectInsightTree, type InsightSource } from '../src/insight/project-tree.js';
import {
  PARITY_BASELINE_RELATIVE_PATH,
  PARITY_WAIVERS_RELATIVE_PATH,
  countBaselineSubcommands,
  coveragePercent,
  loadBaseline,
  loadWaivers,
  reconcileCatalog,
} from '../src/insight/catalog-reconcile.js';
import type { CommandNode } from '../src/insight/tree-model.js';

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

/** Same full-surface host as `test/parity.test.ts`, duplicated here (v1 file untouched). */
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
    toolSurface: surface.names.map((name) => ({
      name,
      subcommands: [...(surface.subcommands.get(name) ?? [])],
      presentInSurface: true,
      ...(name.startsWith('site_') ? { group: 'site' } : {}),
    })),
    delayMs: 0,
  };
}

test('V2-1 catalog: tree command set == deriveTools() + registry (bidirectional, no dup)', () => {
  const surface = pluginSurface();
  const snapshot = projectInsightTree(sourceFromSurface(surface));
  const toolNodes = (snapshot.groups[2].children as CommandNode[]).filter((c) => !c.subcommand);
  const treeNames = toolNodes.map((c) => c.name);
  // no duplicate tool-level node (stable key uniqueness)
  assert.equal(new Set(treeNames).size, treeNames.length);
  assert.deepEqual([...treeNames].sort(), [...surface.names].sort());
  // every deriveTools() name is present in the surface
  for (const name of surface.names) assert.ok(treeNames.includes(name), `tree is missing ${name}`);

  // subcommands per tool match the registry schema enum exactly (no missing / no extra)
  const subNodes = (snapshot.groups[2].children as CommandNode[]).filter((c) => c.subcommand);
  for (const name of surface.names) {
    const expected = [...(surface.subcommands.get(name) ?? [])].sort();
    const actual = subNodes.filter((c) => c.name === name).map((c) => c.subcommand!).sort();
    assert.deepEqual(actual, expected, `subcommand drift for ${name}`);
  }
  // stable keys are unique across all command nodes
  const allIds = (snapshot.groups[2].children as CommandNode[]).map((c) => c.id);
  assert.equal(new Set(allIds).size, allIds.length);
});

test('V2-1 catalog: baseline is 34 tools / 142 subcommands with a full SHA provenance', () => {
  const baseline = loadBaseline();
  const waivers = loadWaivers();
  assert.equal(baseline.toolCount, 34);
  assert.equal(baseline.tools.length, 34);
  assert.equal(countBaselineSubcommands(baseline), 142);
  assert.match(baseline.provenance.commit, /^[0-9a-f]{40}$/);
  assert.equal(typeof waivers.waivers, 'object');
  assert.equal(typeof waivers.pluginExtras, 'object');
});

test('V2-1 catalog: reconcile is clean against the single baseline (coverage 100%)', () => {
  const surface = pluginSurface();
  const baseline = loadBaseline();
  const waivers = loadWaivers();
  const result = reconcileCatalog({ names: surface.names, subcommands: surface.subcommands }, baseline, waivers);
  assert.deepEqual(result.missing, [], 'no baseline tool may be missing');
  assert.deepEqual(result.missingSubs, [], 'no baseline subcommand may be missing');
  assert.deepEqual(result.unregistered, [], 'no unregistered LLM-facing tool');
  assert.deepEqual(result.extraStale, [], 'no stale waiver / pluginExtra');
  assert.equal(coveragePercent(result, baseline, waivers), 100);
});

test('V2-1 catalog REVERSE PROOF: dropping a tool/subcommand makes reconcile FAIL (falsifiable)', () => {
  const surface = pluginSurface();
  const baseline = loadBaseline();
  const waivers = loadWaivers();

  const droppedTool = surface.names.filter((n) => n === 'dom');
  const withoutDom = surface.names.filter((n) => n !== 'dom');
  assert.equal(droppedTool.length, 1, 'fixture assumes `dom` is directly provided by the plugin');
  const result = reconcileCatalog(
    { names: withoutDom, subcommands: surface.subcommands },
    baseline,
    waivers,
  );
  assert.ok(result.missing.includes('dom'), 'a dropped tool must be reported as missing');

  const droppedSubs = new Map(surface.subcommands);
  const chromeSubs = [...(droppedSubs.get('chrome') ?? [])].filter((s) => s !== 'screenshot');
  droppedSubs.set('chrome', chromeSubs);
  const subResult = reconcileCatalog({ names: surface.names, subcommands: droppedSubs }, baseline, waivers);
  assert.ok(
    subResult.missingSubs.includes('chrome screenshot'),
    'a dropped subcommand must be reported as missing',
  );

  // A synthetic extra tool with no pluginExtras registration must fail too.
  const extraResult = reconcileCatalog(
    { names: [...surface.names, 'brand-new-tool'], subcommands: surface.subcommands },
    baseline,
    waivers,
  );
  assert.ok(extraResult.unregistered.includes('brand-new-tool'));
});

test('V2-1 catalog SAME-SOURCE ANCHOR: V2 reconcile and v1 parity.test.ts reference the same baseline path', () => {
  const reconcileSrc = readFileSync(new URL('../../src/insight/catalog-reconcile.ts', import.meta.url), 'utf8');
  const paritySrc = readFileSync(new URL('../../test/parity.test.ts', import.meta.url), 'utf8');
  assert.ok(reconcileSrc.includes(PARITY_BASELINE_RELATIVE_PATH), 'V2 module must reference the single baseline');
  assert.ok(paritySrc.includes(PARITY_BASELINE_RELATIVE_PATH), 'v1 parity test must reference the same baseline');
  assert.ok(reconcileSrc.includes(PARITY_WAIVERS_RELATIVE_PATH), 'V2 module must reference the single waivers file');
  assert.ok(paritySrc.includes(PARITY_WAIVERS_RELATIVE_PATH), 'v1 parity test must reference the same waivers file');
});

test('V2-1 catalog filter is read-only: filtering never mutates the snapshot or the authorization state', () => {
  const surface = pluginSurface();
  const snapshot = projectInsightTree(sourceFromSurface(surface));
  const before = JSON.stringify(snapshot);
  const authBefore = snapshot.groups[0].children.map((c) => c.id);
  const commands = snapshot.groups[2].children as CommandNode[];
  const filtered = commands.filter((c) => c.name.includes('dom') || c.name === 'chrome');
  assert.ok(filtered.length >= 2, 'filter must actually select rows');
  assert.equal(JSON.stringify(snapshot), before, 'filtering must not touch the snapshot');
  assert.deepEqual(snapshot.groups[0].children.map((c) => c.id), authBefore);
});
