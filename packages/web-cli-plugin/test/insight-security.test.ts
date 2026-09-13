/**
 * V2-3 gate `insight-security`（TASK-006；FR-V2-036/060~065 + AC-V2-005 / AC-V23-004）。
 *
 * **新文件承载**（v1 既有测试零改动）。用**真实** `createPluginPolicyConfig`（由
 * `createWebCliHost` 内部构造）+ **真实** `decideAutoAuthorization` 经**真实**
 * `host.dispatch` 构建全量决策表；`onAsk` 被调用 = `ask`，未被调用且 `result.ok` =
 * `allow`，否则 = `deny`。
 *
 *   (a) **AC-V2-005 六条反向断言**（撤销/关断/自动授权开启态下逐条）：
 *       ① 未授权 origin 仍 deny（S1）② 未知/非法 risk 仍 deny（S3）③ `evaluate` 仍
 *       deny ④ 破坏性写仍 ask（**无** auto-authorize/allow 审计）⑤ `clipboard read`
 *       （state 档）仍 ask ⑥ `bookmarks remove` 仍 ask（且写自动开启）。
 *   (b) **allow 集合单调性**：对**每个**撤销/关断动作，经 `tree-ops.run()` 应用真实状态
 *       变更，前后各跑一次全量决策表，断言 `allowAfter ⊆ allowBefore`（零 ask/deny→allow）。
 *
 * 判定链文件（`policy.ts` / `auto-authorize.ts`）**零改动**：本测试只消费，不写。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import {
  AUTO_AUTH_DEFAULTS,
  createAutoAuthStore,
  decideAutoAuthorization,
  type AutoAuthStore,
} from '../src/security/auto-authorize.js';
import { createWebCliHost } from '../src/background/host.js';
import { parseDescriptor } from '../src/protocol/descriptor.js';
import { createTreeOps, type TreeActionRequest } from '../src/ui/tree/tree-ops.js';
import type { OpResult, SettingsOps, SettingsTransport } from '../src/ui/settings/ops.js';
import type { EnvGuardResult } from '../src/platform/env-guard.js';
import type { OptionalCapability } from '../src/platform/capability-permissions.js';
import type { ToolResult } from '@lgdl/web-cli-base';
import type { ConnectTreeSnapshot, TreeActionId } from '../src/insight/tree-model.js';

const SITE = 'https://a.test';
const UNAUTHORIZED = 'https://not-authorized.test';

// ---------------------------------------------------------------------------
// harness
// ---------------------------------------------------------------------------

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

const DESCRIPTOR = (() => {
  const res = parseDescriptor({
    protocolVersion: '1.0',
    tools: [
      { id: 'notes-list', summary: 'List notes', riskHint: 'read' },
      { id: 'profile', summary: 'Non-destructive write tier', riskHint: 'write' },
      { id: 'notes-add', summary: 'Add note (destructive verb)', riskHint: 'write' },
      { id: 'notebook', summary: 'Subcommand-mixed write tier', subcommands: ['peek', 'purge'], riskHint: 'write' },
      { id: 'mystery', summary: 'No risk hint' },
    ],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!res.ok) throw new Error(res.error);
  return res.descriptor;
})();

interface TableEntry {
  id: string;
  name: string;
  subcommand?: string;
  ctx?: Record<string, unknown>;
}

const TABLE: TableEntry[] = [
  { id: 'site-read', name: 'site_notes-list' },
  { id: 'site-write-auto', name: 'site_profile' },
  { id: 'site-destructive', name: 'site_notes-add' },
  { id: 'site-sub-destructive', name: 'site_notebook', subcommand: 'purge' },
  { id: 'site-unknown', name: 'site_mystery' },
  { id: 'site-evaluate', name: 'site_eval-probe' },
  { id: 'site-unauthorized', name: 'site_notes-list', ctx: { origin: UNAUTHORIZED } },
  { id: 'clipboard-read', name: 'clipboard', subcommand: 'read' },
  { id: 'bookmarks-remove', name: 'bookmarks', subcommand: 'remove' },
];

type Decision = 'allow' | 'ask' | 'deny';

interface Harness {
  host: ReturnType<typeof createWebCliHost>;
  audit: ReturnType<typeof createStorageAuditSink>;
  origins: ReturnType<typeof createOriginStore>;
  auto: AutoAuthStore;
  asks: { count: number };
  /** 全量决策表。 */
  table: () => Promise<Record<string, Decision>>;
  /** 经 tree-ops 应用一个撤销/关断动作。 */
  apply: (actionId: TreeActionId, extra?: Partial<TreeActionRequest>) => Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize(SITE);
  const auto = createAutoAuthStore(memoryKv(), { audit });
  await auto.load();
  await auto.set(SITE, { read: true, write: true });

  const asks = { count: 0 };
  const state = {} as Harness;

  const transport: SettingsTransport = {
    send: async <T>(msg: { kind: string; origin?: unknown }) => {
      if (msg.kind === 'revoke' && typeof msg.origin === 'string') {
        await state.origins.revoke(msg.origin);
        state.host.deactivateSite();
        return { ok: true, data: { revoked: true, hostPermissionRemoved: true, contentScript: { ok: true } } } as never as {
          ok: boolean;
          data?: T;
        };
      }
      return { ok: true, data: undefined } as never as { ok: boolean; data?: T };
    },
  };

  const ok = (text = 'ok'): OpResult<unknown> => ({ ok: true, kind: 'ok', text });
  const ops = {
    // Revoke-capability maps to the same reconcile the background applies on a
    // real `permissions.onRemoved`: suppress the capability (tool leaves surface).
    revokeCapability: async (cap: OptionalCapability) => {
      state.host.suppressCapability(cap, true);
      return ok(`已撤销 ${cap}`);
    },
    setCapabilityPrivacy: async (cap: OptionalCapability, scope: 'read' | 'write', enabled: boolean) => {
      if (cap === 'bookmarks') {
        const cur = state.host.isBookmarksEnabled();
        state.host.setBookmarksEnabled({ read: scope === 'read' ? enabled : cur.read, write: scope === 'write' ? enabled : cur.write });
      } else if (cap === 'downloads') {
        state.host.setDownloadsEnabled(enabled);
      } else if (cap === 'notify') {
        state.host.setNotifyEnabled(enabled);
      } else {
        const cur = state.host.isClipboardEnabled();
        state.host.setClipboardEnabled({ read: scope === 'read' ? enabled : cur.read, write: scope === 'write' ? enabled : cur.write });
      }
      return ok(`${cap}/${scope}=${enabled}`);
    },
    setTabsSetting: async (enabled: boolean) => {
      state.host.setTabsEnabled(enabled);
      return ok(`tabs=${enabled}`);
    },
    clearAutoAuth: async (origin: string) => {
      await state.auto.clear(origin);
      return ok(`已关闭 ${origin} 自动授权`);
    },
    clearLlm: async () => ok('已清除本插件全部配置。'),
    groupAction: async () => ok('分组已更新'),
  } as unknown as SettingsOps;

  state.host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) as ToolResult },
    currentOrigin: () => SITE,
    onAsk: async () => {
      asks.count += 1;
      return { action: 'allow' as const };
    },
    autoAuth: { isEnabled: (origin, tier) => auto.isEnabled(origin, tier) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
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
    bookmarksEnabled: { read: true, write: true },
    clipboard: {
      hasReadPermission: async () => true,
      hasWritePermission: async () => true,
      readText: async () => ({ ok: true, text: '', chars: 0, path: 'test' }),
      writeText: async () => ({ ok: true, chars: 0, path: 'test' }),
      audit,
    },
    clipboardEnabled: { read: true, write: true },
  });
  state.host.activateSite(DESCRIPTOR, SITE);
  state.host.router.register({
    name: 'site_eval-probe',
    namespace: '',
    group: 'site',
    risk: 'evaluate',
    schema: { name: 'site_eval-probe', description: 'probe', parameters: { type: 'object', properties: {} } },
    executor: () => ({ ok: true, output: 'executed' }),
  });

  state.audit = audit;
  state.origins = origins;
  state.auto = auto;
  state.asks = asks;

  state.table = async () => {
    const out: Record<string, Decision> = {};
    for (const entry of TABLE) {
      asks.count = 0;
      const res = await state.host.dispatch(
        { id: 't', name: entry.name, subcommand: entry.subcommand ?? '', args: {}, rawArguments: '{}' },
        entry.ctx ?? { origin: SITE },
      );
      out[entry.id] = asks.count > 0 ? 'ask' : res.ok === true ? 'allow' : 'deny';
    }
    return out;
  };

  const treeOps = createTreeOps({
    ops,
    transport,
    env: { inExtension: true, banner: '', reasons: [] } as unknown as EnvGuardResult,
    refreshSnapshot: async () => null as unknown as ConnectTreeSnapshot,
    now: () => 1,
  });
  state.apply = async (actionId, extra = {}) => {
    const outcome = await treeOps.run({ actionId, confirmed: true, ...extra });
    assert.equal(outcome.receipt.kind === 'err', false, `apply(${actionId}) must succeed: ${outcome.receipt.text}`);
  };

  return state;
}

function allowSet(table: Record<string, Decision>): string[] {
  return Object.entries(table)
    .filter(([, d]) => d === 'allow')
    .map(([id]) => id)
    .sort();
}

function subsetOf(after: string[], before: string[]): boolean {
  const b = new Set(before);
  return after.every((id) => b.has(id));
}

// ---------------------------------------------------------------------------
// (a) AC-V2-005 六条反向断言（自动授权开启态 + 撤销后）
// ---------------------------------------------------------------------------

test('AC-V2-005: hard floors survive with BOTH auto tiers on (the auto switch cannot widen any floor)', async () => {
  const h = await buildHarness();
  const before = await h.table();

  // Baseline shape (documents the decision table the floors are asserted on).
  assert.deepEqual(allowSet(before), ['site-read', 'site-write-auto']);

  // ① unauthorized origin still deny (S1)
  assert.equal(before['site-unauthorized'], 'deny', '① unauthorized origin must stay deny (S1)');
  // ② unknown / illegal risk still deny (S3 fail-closed)
  assert.equal(before['site-unknown'], 'deny', '② unknown risk must stay deny (S3)');
  // ③ evaluate still deny (hard floor; never delegated to the confirmation UI)
  assert.equal(before['site-evaluate'], 'deny', '③ evaluate must stay deny');
  // ④ destructive write still ask (never in write-auto) + NO auto-authorize/allow audit
  assert.equal(before['site-destructive'], 'ask', '④ destructive write must stay ask');
  assert.equal(before['site-sub-destructive'], 'ask', '④ destructive subcommand must stay ask');
  // ⑤ clipboard read (state tier) still ask
  assert.equal(before['clipboard-read'], 'ask', '⑤ clipboard read must stay ask (never auto-allowed)');
  // ⑥ bookmarks remove still ask (never in write-auto)
  assert.equal(before['bookmarks-remove'], 'ask', '⑥ bookmarks remove must stay ask');

  for (const tool of ['site_notes-add', 'site_notebook']) {
    const autoAllows = h.audit.events.filter((e) => e.type === 'auto-authorize' && e.decision === 'allow' && e.tool === tool);
    assert.equal(autoAllows.length, 0, `④ no auto-authorize/allow audit for ${tool}`);
  }
  // The pure decision seam agrees (evaluate / unknown are hard denies).
  assert.equal(decideAutoAuthorization({ origin: SITE, group: 'site', risk: 'evaluate', settings: { read: true, write: true } }).hardDeny, true);
  assert.equal(decideAutoAuthorization({ origin: SITE, group: 'site', risk: undefined, settings: { read: true, write: true } }).hardDeny, true);
  assert.equal(decideAutoAuthorization({ origin: SITE, group: 'plugin', risk: 'write', destructive: true, settings: { read: true, write: true } }).allow, false);
});

test('AC-V2-005: the six floors still hold AFTER the revoke/disable actions (no widening)', async () => {
  const h = await buildHarness();
  await h.apply('clear-auto-auth', { target: { origin: SITE }, toolHint: undefined });
  const after = await h.table();
  assert.equal(after['site-unauthorized'], 'deny');
  assert.equal(after['site-unknown'], 'deny');
  assert.equal(after['site-evaluate'], 'deny');
  assert.equal(after['site-destructive'], 'ask');
  assert.equal(after['clipboard-read'], 'ask');
  assert.equal(after['bookmarks-remove'], 'ask');

  // And after a capability revoke (bookmarks tool leaves the surface → deny, never allow).
  const h2 = await buildHarness();
  await h2.apply('revoke-capability', { target: { capability: 'bookmarks' } });
  const after2 = await h2.table();
  assert.equal(after2['site-unauthorized'], 'deny');
  assert.equal(after2['site-unknown'], 'deny');
  assert.equal(after2['site-evaluate'], 'deny');
  assert.equal(after2['site-destructive'], 'ask');
  assert.equal(after2['clipboard-read'], 'ask');
  assert.notEqual(after2['bookmarks-remove'], 'allow', 'revoking bookmarks can never make it allow');
});

// ---------------------------------------------------------------------------
// (b) allow 集合单调性
// ---------------------------------------------------------------------------

interface MonotoneCase {
  actionId: TreeActionId;
  extra: Partial<TreeActionRequest>;
  /** 该动作应**真正改变**的决策表条目（证明单调性断言非空洞）。 */
  changed: string[];
}

const MONOTONE_CASES: MonotoneCase[] = [
  { actionId: 'revoke-origin', extra: { target: { origin: SITE } }, changed: ['site-read', 'site-write-auto'] },
  { actionId: 'revoke-capability', extra: { target: { capability: 'bookmarks' } }, changed: ['bookmarks-remove'] },
  { actionId: 'set-capability-toggle', extra: { target: { capability: 'bookmarks', scope: 'write', enabled: false } }, changed: [] },
  { actionId: 'set-tabs-toggle', extra: { target: { enabled: false } }, changed: [] },
  { actionId: 'clear-auto-auth', extra: { target: { origin: SITE } }, changed: ['site-write-auto'] },
  { actionId: 'disconnect-llm', extra: {}, changed: [] },
  { actionId: 'dissolve-group', extra: { target: { groupId: 'grp-1' } }, changed: [] },
];

test('allow monotonicity: allowAfter ⊆ allowBefore for every revoke/disable action', async () => {
  for (const c of MONOTONE_CASES) {
    const h = await buildHarness();
    const before = await h.table();
    await h.apply(c.actionId, c.extra);
    const after = await h.table();

    const allowBefore = allowSet(before);
    const allowAfter = allowSet(after);
    assert.equal(
      subsetOf(allowAfter, allowBefore),
      true,
      `${c.actionId}: allowAfter ⊆ allowBefore must hold (before=${allowBefore.join(',')} after=${allowAfter.join(',')})`,
    );
    // Explicitly: no ask/deny → allow transition anywhere in the table.
    for (const entry of TABLE) {
      if (after[entry.id] === 'allow') {
        assert.equal(before[entry.id], 'allow', `${c.actionId}: ${entry.id} escalated ${before[entry.id]} → allow`);
      }
      if (before[entry.id] !== 'allow') {
        assert.notEqual(after[entry.id], 'allow', `${c.actionId}: ${entry.id} must never become allow`);
      }
    }
    // Non-vacuity: the declared entries really changed (and never to allow).
    for (const id of c.changed) {
      assert.notEqual(after[id], before[id], `${c.actionId}: ${id} must change (${before[id]} → ${after[id]})`);
      assert.notEqual(after[id], 'allow', `${c.actionId}: ${id} must never become allow`);
    }
  }
});

test('allow monotonicity: repeated application stays monotone (idempotent tightening)', async () => {
  const h = await buildHarness();
  const t0 = await h.table();
  await h.apply('clear-auto-auth', { target: { origin: SITE } });
  const t1 = await h.table();
  await h.apply('clear-auto-auth', { target: { origin: SITE } });
  const t2 = await h.table();
  assert.equal(subsetOf(allowSet(t1), allowSet(t0)), true);
  assert.equal(subsetOf(allowSet(t2), allowSet(t1)), true);
  assert.deepEqual(allowSet(t2), allowSet(t1));
});

// ---------------------------------------------------------------------------
// AUTO_AUTH_DEFAULTS 不变（写默认关；读默认开）
// ---------------------------------------------------------------------------

test('auto-authorize defaults are unchanged (read on / write off) and the store clear() disables both', async () => {
  assert.deepEqual(AUTO_AUTH_DEFAULTS, { read: true, write: false });
  const h = await buildHarness();
  await h.apply('clear-auto-auth', { target: { origin: SITE } });
  assert.equal(h.auto.isEnabled(SITE, 'read'), false);
  assert.equal(h.auto.isEnabled(SITE, 'write'), false);
  // Authorization is an independent dimension: clear-auto-auth never revokes it.
  assert.equal(await h.origins.isAuthorized(SITE), true);
});
