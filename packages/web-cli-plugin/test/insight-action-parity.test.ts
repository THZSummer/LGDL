/**
 * T3 修复轮（2026-09-13）：投影 `deriveAction` 与**真实判定链**的一致性交叉断言。
 *
 * 背景（review §7 T3）：`src/insight/command-catalog.ts` 的 `deriveAction` 是对策略
 * （`PLUGIN_RISK_DEFAULTS` + S1/S2/S3）的**再实现**——只读消费默认值表，因此存在与真实
 * 判定链漂移的风险。本测试选择评审建议的**方案 ②**（不动判定链结构、可自动化、能真
 * FAIL）：用**真实** `createPluginPolicyConfig` + **真实** `PermissionGate` 复算每个投影
 * 命令节点的处置档，逐条断言 `deriveAction` 结论 === 真值链结论。
 *
 * 覆盖：
 *   A. `projectCommands` 产出的**全部**命令节点（工具节点 + 子命令节点），含被抑制条目；
 *   B. 站点域矩阵（可 reachable 的 risk 域 read/write/undefined × 授权态 × trust）；
 *   C. **反证自测**：人为制造的错配必须被检测到（门禁非空洞）。
 *
 * 已知的**保守方向**分歧（显式登记，非吞错）：base 内建工具 `web-fetch` / `sleep` /
 * `web-cli-help` 在 registry 中 **risk 缺失且非 site**。真实链对「非 site + risk 缺失」
 * 走 `riskDefaults[risk ?? 'read']` → `allow`；投影按 FR-V2-064「未知/非法 risk 一律展示
 * 为 deny（fail-closed）」展示 `deny`。即**投影比运行时更严**（deny where runtime allows），
 * 是只收紧不放松的方向。本测试把该分歧类**钉死**：仅这三个工具、仅此方向；任何其它分歧
 * 或新的分歧条目都 FAIL。
 *
 * **新文件承载**；v1 既有测试零改动；判定链（policy.ts / auto-authorize.ts）零改动。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformEnv, PlatformEventHub, PolicyAction, ToolRisk } from '@lgdl/web-cli-base';
import { createPermissionGate } from '@lgdl/web-cli-base';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createPluginPolicyConfig } from '../src/security/policy.js';
import { createRemoteDomOps } from '../src/content/dom-agent.js';
import { createRemoteEventHub } from '../src/tools/remote-events.js';
import {
  deriveAction,
  projectCommands,
  suppressedCapabilitySurface,
  type ToolSurfaceEntry,
} from '../src/insight/command-catalog.js';
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

/** Same full-surface host as `test/insight-catalog.test.ts` (duplicated; v1 files untouched). */
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

/** Build the full projected surface: every `deriveTools()` entry + suppressed capability entries. */
function buildSurface(): ToolSurfaceEntry[] {
  const host = buildFullHost();
  const names = host.deriveTools().map((t) => t.name);
  const entries: ToolSurfaceEntry[] = names.map((name) => {
    const entry = host.router.query({ name })[0];
    const params = entry?.schema?.parameters as
      | { properties?: { subcommand?: { enum?: string[] } } }
      | undefined;
    const sub = params?.properties?.subcommand;
    return {
      name,
      ...(entry?.group ? { group: entry.group } : {}),
      ...(entry?.risk ? { risk: entry.risk } : {}),
      ...(entry?.subcommandRisks ? { subcommandRisks: { ...entry.subcommandRisks } } : {}),
      subcommands: Array.isArray(sub?.enum) ? sub.enum : [],
      presentInSurface: true,
    };
  });
  entries.push(
    ...suppressedCapabilitySurface({
      tabsEnabled: false,
      toggles: {
        bookmarksRead: false,
        bookmarksWrite: false,
        downloadsRead: false,
        notify: false,
        clipboardRead: false,
        clipboardWrite: false,
      },
      suppressed: { bookmarks: false, downloads: false, notify: false, clipboard: false },
    }),
  );
  return entries;
}

/**
 * The REAL judgment chain: the plugin policy config + the base `PermissionGate`.
 * `onAsk` is a spy: if the gate reaches ask-settlement the real pre-settlement
 * action was `ask` (we resolve it as deny to keep the call total).
 */
async function realChainAction(
  group: string | undefined,
  risk: ToolRisk | undefined,
  deps: { isAuthorized: (origin: string) => boolean; trustOf: (origin: string) => 'trusted' | 'untrusted'; origin?: string },
): Promise<PolicyAction> {
  let asked = false;
  const policy = createPluginPolicyConfig({
    isAuthorized: (origin) => deps.isAuthorized(origin),
    trustOf: (origin) => deps.trustOf(origin),
    currentOrigin: () => deps.origin,
  });
  const gate = createPermissionGate(policy);
  const decision = await gate.check(
    { tool: 'probe', group, risk },
    {
      onAsk: async () => {
        asked = true;
        return { action: 'deny' };
      },
    },
  );
  return asked ? 'ask' : decision.action;
}

const SITE_ORIGIN = 'https://probe.test';
const depsAuthorized: { isAuthorized: (o: string) => boolean; trustOf: (o: string) => 'trusted' | 'untrusted'; origin?: string } = {
  isAuthorized: () => true,
  trustOf: () => 'trusted',
  origin: SITE_ORIGIN,
};

/**
 * Known conservative divergences: projection `deny` where runtime `allow`, for
 * non-site base-builtin tools with a missing risk tier. Pinned by exact tool name.
 */
const CONSERVATIVE_DIVERGENCE_TOOLS = new Set(['web-fetch', 'sleep', 'web-cli-help']);

/** Compare one projected command node with the real chain; returns a reason or null. */
async function divergenceOf(node: CommandNode): Promise<string | null> {
  const real = await realChainAction(node.group || undefined, node.risk, depsAuthorized);
  if (real === node.action) return null;
  const conservative =
    node.action === 'deny' &&
    real === 'allow' &&
    node.risk === undefined &&
    node.sourceKind === 'base-builtin' &&
    CONSERVATIVE_DIVERGENCE_TOOLS.has(node.name);
  return conservative ? null : `projected=${node.action} real=${real} (risk=${String(node.risk)}, group=${JSON.stringify(node.group)})`;
}

test('T3 parity: every projected command action equals the real judgment chain', async () => {
  const nodes = projectCommands(buildSurface(), { delayMs: 0 });
  const tools = nodes.filter((n) => !n.subcommand);
  const subs = nodes.filter((n) => n.subcommand);
  assert.ok(tools.length >= 20, `expected a full tool surface, got ${tools.length}`);
  assert.ok(subs.length >= 60, `expected the subcommand surface, got ${subs.length}`);

  const divergences: string[] = [];
  for (const node of nodes) {
    const reason = await divergenceOf(node);
    if (reason) divergences.push(`${node.name}${node.subcommand ? ` ${node.subcommand}` : ''}: ${reason}`);
  }
  assert.deepEqual(divergences, [], '任何与真实判定链的分歧都必须 FAIL（除已登记的保守分歧）');
});

test('T3 parity: the only divergence is the pinned conservative (stricter) class', async () => {
  const nodes = projectCommands(buildSurface(), { delayMs: 0 });
  // Re-derive every mismatch WITHOUT the conservative carve-out to enumerate them.
  const mismatches: CommandNode[] = [];
  for (const node of nodes) {
    const real = await realChainAction(node.group || undefined, node.risk, depsAuthorized);
    if (real !== node.action) mismatches.push(node);
  }
  const names = [...new Set(mismatches.map((n) => n.name))].sort();
  assert.deepEqual(
    names,
    ['sleep', 'web-cli-help', 'web-fetch'],
    '保守方向分歧的工具集合必须被显式钉死；出现新分歧即 FAIL',
  );
  for (const node of mismatches) {
    assert.equal(node.action, 'deny', '投影侧必须是 deny（只收紧）');
    assert.equal(node.risk, undefined, '分歧仅限 risk 缺失');
    assert.equal(node.sourceKind, 'base-builtin', '分歧仅限 base 内建');
  }
});

test('T3 parity: reachable site domain (read/write/undefined × auth × trust) matches the real chain', async () => {
  const risks: Array<ToolRisk | undefined> = ['read', 'write', undefined];
  for (const authorized of [true, false]) {
    for (const trust of ['trusted', 'untrusted'] as const) {
      for (const risk of risks) {
        const projected = deriveAction({ group: 'site', risk, isSiteOriginAuthorized: authorized }).action;
        const real = await realChainAction('site', risk, {
          isAuthorized: () => authorized,
          trustOf: () => trust,
          origin: SITE_ORIGIN,
        });
        assert.equal(
          projected,
          real,
          `site risk=${String(risk)} authorized=${authorized} trust=${trust}: projected=${projected} real=${real}`,
        );
      }
    }
  }
  // `evaluate` is unreachable for site tools (effectiveRisk ∈ {read,write,undefined}),
  // so the projection's site+evaluate floor is defensive; non-site evaluate is
  // covered by the surface loop above.
});

test('T3 parity REVERSE PROOF: a manufactured projection/runtime mismatch is detected', async () => {
  const nodes = projectCommands(buildSurface(), { delayMs: 0 });
  const sample = nodes.find((n) => n.action === 'ask') ?? nodes[0];
  assert.ok(sample, 'fixture must select a node');
  // Flip the projected action → the comparator must report a divergence.
  const flipped: CommandNode = { ...sample, action: sample.action === 'deny' ? 'allow' : 'deny' };
  const reason = await divergenceOf(flipped);
  assert.ok(reason, `反证：人为错配必须被检测到（${sample.name} ${sample.subcommand ?? ''}）`);
  assert.match(reason, /projected=/);
  // And the untouched node stays clean.
  assert.equal(await divergenceOf(sample), null);
});
