/**
 * V2-1 门禁 `insight-determinism`（TASK-007；AC-V21-003 + FR-V2-015）。
 *
 * 断言要点：同输入两次投影 `deep-equal` 且 `meta.hash` 全等；`builtAt` **不进** hash
 * 输入；集合输入顺序打乱（站点/会话，被固定排序归一）→ hash 不变。
 *
 * **新文件承载**（v1 既有断言零删改）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectInsightTree, type InsightSource } from '../src/insight/project-tree.js';
import { stableStringify } from '../src/insight/tree-model.js';

const CAPS = {
  grants: { bookmarks: true, downloads: false, notify: true, clipboard: false },
  toggles: {
    bookmarksRead: true,
    bookmarksWrite: false,
    downloadsRead: false,
    notify: true,
    clipboardRead: false,
    clipboardWrite: true,
  },
  tabsEnabled: true,
};

function source(): InsightSource {
  return {
    sites: [
      { origin: 'https://c.test', authorized: false, trust: 'untrusted', updatedAt: 3 },
      { origin: 'https://a.test', authorized: true, trust: 'trusted', authorizedAt: 1, updatedAt: 9 },
      { origin: 'https://b.test', authorized: true, trust: 'untrusted', authorizedAt: 2, updatedAt: 4 },
    ],
    capability: CAPS,
    toolSurface: [
      { name: 'dom', group: 'ui', risk: 'ui', subcommands: ['snapshot', 'click'], presentInSurface: true },
      { name: 'site_notes', group: 'site', risk: 'read', subcommands: ['list'], presentInSurface: true },
      { name: 'tabs', group: 'plugin', risk: 'write', subcommands: ['list', 'open'], subcommandRisks: { list: 'read', open: 'write' }, presentInSurface: true },
      { name: 'mystery', group: 'plugin', subcommands: [], presentInSurface: true },
    ],
    delayMs: 0,
    llm: { configured: true, providerId: 'deepseek', providerName: 'DeepSeek', model: 'deepseek-chat' },
    sessions: [
      { sessionId: 'group:g', label: '组', origins: ['https://b.test'], lastActiveAt: 7 },
      { sessionId: 'https://a.test', label: 'a', origins: ['https://a.test'], lastActiveAt: 7 },
      { sessionId: 'https://c.test', label: 'c', origins: ['https://c.test'], lastActiveAt: 2 },
    ],
    activeOrigin: 'https://a.test',
    isOriginAuthorized: (origin) => origin === 'https://a.test',
  };
}

test('V2-1 determinism: two projections of the same input are deep-equal and hash-equal', () => {
  const first = projectInsightTree(source(), { builtAt: 1000 });
  const second = projectInsightTree(source(), { builtAt: 1000 });
  assert.deepEqual(second, first);
  assert.equal(second.meta.hash, first.meta.hash);
});

test('V2-1 determinism: builtAt is NOT part of the hash input (hash stable across build times)', () => {
  const early = projectInsightTree(source(), { builtAt: 1 });
  const late = projectInsightTree(source(), { builtAt: 9_999_999 });
  assert.notEqual(early.meta.builtAt, late.meta.builtAt);
  assert.equal(early.meta.hash, late.meta.hash);
  assert.deepEqual(late.groups, early.groups);
  assert.deepEqual(late.facets, early.facets);
});

test('V2-1 determinism: set inputs (sites / sessions) are order-insensitive after fixed sorting', () => {
  const base = source();
  const shuffled: InsightSource = {
    ...base,
    sites: [...base.sites].reverse(),
    sessions: [...(base.sessions ?? [])].reverse(),
  };
  const a = projectInsightTree(base, { builtAt: 42 });
  const b = projectInsightTree(shuffled, { builtAt: 42 });
  assert.equal(b.meta.hash, a.meta.hash, 'shuffling set inputs must not change the hash');
  assert.deepEqual(b, a);
  // The sorted site order is localeCompare, independent of insertion order.
  assert.deepEqual(
    a.groups[0].children.map((c) => c.id),
    ['site:https://a.test', 'site:https://b.test', 'site:https://c.test'],
  );
  // Sessions are sorted by lastActiveAt desc, then sessionId.
  const llm = a.groups[3].children[0] as { sessions: { id: string }[] };
  assert.deepEqual(llm.sessions.map((s) => s.id), [
    'session:group:g',
    'session:https://a.test',
    'session:https://c.test',
  ]);
});

test('V2-1 determinism: canonical JSON of the hash-relevant structure is stable', () => {
  const a = projectInsightTree(source(), { builtAt: 1 });
  const b = projectInsightTree(source(), { builtAt: 2 });
  const hashInput = (s: typeof a) =>
    stableStringify({
      version: s.version,
      root: s.root,
      groups: s.groups,
      facets: s.facets,
      counts: s.meta.counts,
      sources: s.meta.sources,
      degradations: s.meta.degradations,
      modelNote: s.meta.modelNote,
    });
  assert.equal(hashInput(a), hashInput(b));
});

test('V2-1 determinism: command order follows the injected tool-surface order (registry order is semantic)', () => {
  const base = source();
  const reordered: InsightSource = { ...base, toolSurface: [...base.toolSurface].reverse() };
  const a = projectInsightTree(base, { builtAt: 1 });
  const b = projectInsightTree(reordered, { builtAt: 1 });
  // The projection is still deterministic (each input maps to exactly one snapshot)…
  assert.deepEqual(projectInsightTree(reordered, { builtAt: 1 }), b);
  const ids = (s: typeof a) => s.groups[2].children.map((c) => c.id);
  // …but command order is NOT sorted, because the registry order is authoritative.
  assert.notDeepEqual(ids(b), ids(a));
  assert.deepEqual([...ids(b)].sort(), [...ids(a)].sort(), 'same member set, different order');
});
