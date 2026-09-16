/**
 * V2-4 命令档案门禁 `insight-archive`（NFR-V24-001~005 / AC-V24-001~007；ADR-V2-017~022）。
 *
 * **新文件承载**：v1/P0 既有测试零改动（`insight-catalog` / `insight-action-parity` /
 * `insight-no-escalation` / `tree-view` / `tree-ops` / `size-budget` 原样保留，V2-4 只**新增**）。
 *
 * 断言分组（每条关键断言配**反证自测**，`catch` 只吞 `ENOENT`，冻结类用 `sha256` 内容哈希）：
 *   A1 动态不变量 + fixture 122 + cardId 唯一且 === `CommandNode.cardId`
 *   A2 三层口径（L1 34/142 · L2 20/88 · L3 28/94=122）+ `accounted` 行级并集 100% + **防夸大反证**
 *   A4 `ArchiveCard` 无写控件字段 + **R2 分层**（硬底线无 `policyControl` + 原因；可覆盖有描述）+ 档案模块无写面/无标记注入
 *   A5 `delay` 消歧单源（导入 + 内容哈希 pin + 无第二处字面量）
 *   A6 过滤只读（快照不变 + 真的收窄）
 *   A7 `CATALOG_BASELINE_META` === `loadBaseline()` 真值
 *   A8 禁改面内容哈希 pin（`TREE_ACTION_IDS` 恰 9 值 / `src/content/**` / 三个 tree 模块）
 *   A9 体积重登记结构 + `content.js` 零增长
 *   A3（TASK-005 追加）`deny` 分层全量交叉 × 站点域矩阵 + 分歧钉死 + 翻转反证
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PlatformEnv, PlatformEventHub, ToolRisk } from '@lgdl/web-cli-base';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createRemoteDomOps } from '../src/content/dom-agent.js';
import { createRemoteEventHub } from '../src/tools/remote-events.js';
import { projectInsightTree, type InsightSource } from '../src/insight/project-tree.js';
import {
  suppressedCapabilitySurface,
  type ToolSurfaceEntry,
} from '../src/insight/command-catalog.js';
import {
  countBaselineSubcommands,
  loadBaseline,
  loadWaivers,
  reconcileCatalog,
  type BaselineCatalog,
  type ReconcileResult,
  type Waivers,
} from '../src/insight/catalog-reconcile.js';
import {
  ARCHIVE_PARITY_PINNED_CLEAN,
  ARCHIVE_WAIVER_BASELINE,
  autoAuthHardLine,
  buildArchiveModel,
  cardRowName,
  computeRowCoverage,
  type ArchiveCard,
  type ArchiveModel,
} from '../src/insight/archive-catalog.js';
import { CATALOG_BASELINE_META } from '../src/insight/catalog-meta.js';
import { decideAutoAuthorization } from '../src/security/auto-authorize.js';
import { TREE_NO_ESCALATION_NOTE } from '../src/ui/tree/tree-view.js';
import { TREE_ACTION_IDS } from '../src/ui/tree/tree-ops.js';
import {
  CONTENT_MAX_BYTES,
  CONTENT_SOURCE_SHA256,
  SIDEPANEL_BASELINE_BYTES,
  SIDEPANEL_BASELINE_BYTES_HISTORY,
  SIDEPANEL_BASELINE_META,
  SIDEPANEL_BASELINE_TOLERANCE,
  SIDEPANEL_CEILING,
  SIDEPANEL_CEILING_CAP,
  SIDEPANEL_CEILING_CAP_RECORD,
  SIDEPANEL_CEILING_CAP_ROLE,
  distArtifact,
  evaluateSidepanelSize,
  readArtifactSize,
} from './size-baseline.js';
import type { CommandNode } from '../src/insight/tree-model.js';

// ---------------------------------------------------------------------------
// helpers（同源读取 + 内容哈希；冻结类断言禁 `git diff --quiet HEAD` —— W3 教训）
// ---------------------------------------------------------------------------

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 读取包内相对路径文件的原始文本（编译后从 `dist-test/test/` 解析同样成立）。 */
function readPluginFile(relative: string): string {
  return readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');
}

/** 冻结 pin 断言（抽成函数以便反证自测证明它**真的抛错**）。 */
function assertPinnedHash(label: string, actualHash: string, pinnedHash: string): void {
  assert.equal(
    actualHash,
    pinnedHash,
    `${label} 内容哈希漂移：${actualHash} ≠ 钉死值 ${pinnedHash}。若为有意改动，请在本文件显式更新 pin 并注明日期与理由。`,
  );
}

// 钉死值（2026-09-13，V2-4 build；来源 = 各自文件原文）。
//
// ── R2 显式 pin 更新（2026-09-13，feature/web-cli-plugin，来源 = 本轮 build 原文）──
// 依据父 plan §9.8 S9/S10 + ADR-V2-027 pin 更新流程；**只允许显式更新**（前后值 + 日期 +
// 来源 + 理由 + 历史保留），禁止删断言/放宽容差来「跑绿」。
//   TREE_NO_ESCALATION_NOTE（S10，FR-V2-078 两通路重写）
//     old d37fecffb72ae33df8727a07a58d7f6ccca1455e923c5c962af8121806ababce
//     new cfe96e8a31b2a6e5eea8cd256654dcba58e86a682c6986cfeaac5854384345d3
//   TREE_ACTION_IDS_JSON（S9，FR-V2-074/075 白名单 7 → 9）
//     old e5c65cc39397ae1abf0ca0e83ad2dd713866b84b1a505e7c3bf826902908d073
//     new 71f743ed688d10ad74224b340d0e1b827f39a2b41aa625ca1d43dc9895aec1ac
//   TREE_MODULE_SHA256（tree-view.ts / tree-ops.ts，随 R2 文案/白名单/覆盖分组变更）
//     tree-view.ts old 023f9fc0687fc7977353de58657d5d1c000ef9bb7cd9ad255f9ccb4629778fd5
//                  R2-1 9beb26eaab6ab3fb6eb7c027d4bd2cc6b73ca851c71f6dc68360f70f7746c744
//                  R2-2 b4392d651076080cdaa31ae76f06ae647563048f914e0c42b3a8be5f02e9c187
//   R2-3 (2026-09-13, A1/A2)：tree-view.ts 追加 tightenOnly 控件分层 + crossTargets 透传 →
//                  b0075d15b25dfef8c604a8efe7a21305d735ae3435ce8357397e95ba486e0849
//     tree-ops.ts  abf9cdaba89ab63c7f0fa3f9b3ef9e829a702ec45b169de6e378eafacece9257 →
//                  R2-1/R2-2 4163a6cb6d402f1d54d5a251599edf1cb618b92fa4cabdb4bf99ed4a428ed658（R2-2 未改）
//   tree-receipt.ts 不变（未改动）→ 保持旧值。
// 反证：`assertPinnedHash` 在篡改文本上必须真的抛错（见 A5/A8 的 REVERSE PROOF 段）。
const TREE_NO_ESCALATION_NOTE_SHA256 =
  'cfe96e8a31b2a6e5eea8cd256654dcba58e86a682c6986cfeaac5854384345d3';
const TREE_ACTION_IDS_JSON_SHA256 =
  '71f743ed688d10ad74224b340d0e1b827f39a2b41aa625ca1d43dc9895aec1ac';
const TREE_MODULE_SHA256: Readonly<Record<string, string>> = {
  'src/ui/tree/tree-view.ts': 'b0075d15b25dfef8c604a8efe7a21305d735ae3435ce8357397e95ba486e0849',
  'src/ui/tree/tree-ops.ts': '4163a6cb6d402f1d54d5a251599edf1cb618b92fa4cabdb4bf99ed4a428ed658',
  'src/ui/tree/tree-receipt.ts': '484bf84f6f7eddf203f519826bb415399a5f4819c3e6e91329cd2b47430d3db6',
};
const ARCHIVE_MODULE_PATH = 'src/insight/archive-catalog.ts';

// 三层口径钉死值（P0 同款 fixture）。
const FIXTURE_CARDS = 122;
const FIXTURE_TOOL_ENTRIES = 28;
const FIXTURE_SUBCOMMANDS = 94;
const FIXTURE_DISTINCT_TOOL_NAMES = 23;
const BASELINE_TOOLS = 34;
const BASELINE_SUBCOMMANDS = 142;
const WAIVED_TOOLS = 20;
const WAIVED_SUBCOMMANDS = 88;

// ---------------------------------------------------------------------------
// fixture（与 `insight-action-parity.test.ts` 同款；v1 文件零改动 → 此处复制）
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

/** P0 T3 fixture：全 `deriveTools()` 面 + 5 条抑制合成能力条目。 */
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

const SITE_ORIGIN = 'https://probe.test';

/** 站点域 fixture：在 P0 面上追加 7 条 site 工具（覆盖 read/write/evaluate/缺失/ui/state/external）。 */
function siteSurface(): ToolSurfaceEntry[] {
  const site: ToolSurfaceEntry[] = [
    { name: 'site_read', group: 'site', risk: 'read', subcommands: [], presentInSurface: true },
    { name: 'site_write', group: 'site', risk: 'write', subcommands: [], presentInSurface: true },
    { name: 'site_evaluate', group: 'site', risk: 'evaluate', subcommands: [], presentInSurface: true },
    { name: 'site_ui', group: 'site', risk: 'ui', subcommands: [], presentInSurface: true },
    { name: 'site_state', group: 'site', risk: 'state', subcommands: [], presentInSurface: true },
    { name: 'site_external', group: 'site', risk: 'external', subcommands: [], presentInSurface: true },
    { name: 'site_riskless', group: 'site', subcommands: [], presentInSurface: true },
  ];
  return [...buildSurface(), ...site];
}

function sourceOf(toolSurface: readonly ToolSurfaceEntry[], boundOrigin?: string): InsightSource {
  return {
    sites: boundOrigin
      ? [{ origin: boundOrigin, authorized: true, trust: 'trusted', updatedAt: 0 }]
      : [],
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
    toolSurface,
    delayMs: 0,
    catalogMeta: CATALOG_BASELINE_META,
    ...(boundOrigin ? { activeOrigin: boundOrigin, isOriginAuthorized: () => true } : {}),
  };
}

function snapshotFixture(): { snapshot: ReturnType<typeof projectInsightTree>; model: ArchiveModel } {
  return withCoverageRows(projectInsightTree(sourceOf(buildSurface())));
}

/** 行级真值（基线行 / 豁免行）——从单一基线 + 豁免表派生（不复制真值）。 */
function baselineRowSets(): {
  baseline: BaselineCatalog;
  waivers: Waivers;
  all: string[];
  waived: string[];
} {
  const baseline = loadBaseline();
  const waivers = loadWaivers();
  const all: string[] = [];
  const waived: string[] = [];
  for (const tool of baseline.tools) {
    all.push(tool.name);
    const waiver = waivers.waivers?.[tool.name];
    if (waiver) waived.push(tool.name);
    for (const sub of tool.subcommands) {
      all.push(`${tool.name} ${sub}`);
      if (waiver) waived.push(`${tool.name} ${sub}`);
    }
  }
  return { baseline, waivers, all, waived };
}

function realReconcile(surface: readonly ToolSurfaceEntry[]): ReconcileResult {
  const names = surface.map((entry) => entry.name);
  const subcommands = new Map(surface.map((entry) => [entry.name, entry.subcommands]));
  return reconcileCatalog({ names, subcommands }, loadBaseline(), loadWaivers());
}

function withCoverageRows(
  snapshot: ReturnType<typeof projectInsightTree>,
  options: { bogusBaselineRows?: string[]; reconciliation?: ReconcileResult } = {},
): { snapshot: ReturnType<typeof projectInsightTree>; model: ArchiveModel } {
  const rows = baselineRowSets();
  const model = buildArchiveModel(snapshot, {}, {
    coverageRows: {
      baselineRows: options.bogusBaselineRows ?? rows.all,
      waivedRows: rows.waived,
    },
    ...(options.reconciliation ? { reconciliation: options.reconciliation } : {}),
  });
  return { snapshot, model };
}

function commandNodes(snapshot: ReturnType<typeof projectInsightTree>): CommandNode[] {
  return snapshot.groups[2].children as CommandNode[];
}

// ---------------------------------------------------------------------------
// A1 动态不变量 + fixture 122
// ---------------------------------------------------------------------------

test('A1 archive: cards.length === counts.commands + counts.subcommands (invariant) and fixture = 122', () => {
  const { snapshot, model } = snapshotFixture();
  assert.equal(
    model.cards.length,
    snapshot.meta.counts.commands + snapshot.meta.counts.subcommands,
    '动态不变量：档案卡数必须等于命令节点（工具 + 子命令）数',
  );
  assert.equal(model.cards.length, FIXTURE_CARDS, 'P0 同款 fixture = 122 档案卡');
  assert.equal(model.coverage.carded.tools, FIXTURE_TOOL_ENTRIES);
  assert.equal(model.coverage.carded.subcommands, FIXTURE_SUBCOMMANDS);
  assert.equal(model.coverage.carded.distinctToolNames, FIXTURE_DISTINCT_TOOL_NAMES);
  assert.equal(
    model.header.liveCounts.cards,
    model.header.liveCounts.tools + model.header.liveCounts.subcommands,
  );

  const nodes = commandNodes(snapshot);
  const cardIds = model.cards.map((card) => card.cardId);
  assert.deepEqual(cardIds, nodes.map((node) => node.cardId), 'cardId 必须复用 CommandNode.cardId（同序）');

  // P0 同款 fixture 有意把 5 个能力工具各注入两次（在场条目 + `presentInSurface:false` 的
  // 抑制合成条目）→ 同名 cardId 成对出现；唯一性以 `cardId + 抑制态` 键表达（键名 + 同名
  // 抑制态不可能重复），并以**去重注入面**（仅 `deriveTools()`）验证 `cmd:` 键的单射性。
  const keyed = new Set(model.cards.map((card) => `${card.cardId}::${card.suppressed}`));
  assert.equal(keyed.size, model.cards.length, 'cardId + 抑制态 必须唯一');
  const cleanSurface = buildSurface().filter((entry) => entry.presentInSurface);
  const cleanCards = buildArchiveModel(projectInsightTree(sourceOf(cleanSurface))).cards;
  assert.equal(
    new Set(cleanCards.map((card) => card.cardId)).size,
    cleanCards.length,
    '去重注入面上 cardId 必须唯一（STABLE_KEY.command 单射）',
  );
});

test('A1 archive REVERSE PROOF: dropping a card breaks the invariant (falsifiable)', () => {
  const { snapshot, model } = snapshotFixture();
  const invariant = snapshot.meta.counts.commands + snapshot.meta.counts.subcommands;
  const dropped = model.cards.slice(1);
  assert.notEqual(dropped.length, invariant, '反证：删一张卡后不变量必须不再成立');
  assert.throws(
    () => assert.equal(dropped.length, invariant),
    '反证：不变量断言必须在丢卡时抛错（门禁非空洞）',
  );
});

// ---------------------------------------------------------------------------
// A2 三层口径 + accounted 行级并集 100% + 防夸大
// ---------------------------------------------------------------------------

test('A2 archive: three layers are separated (L1 34/142 · L2 20/88 · L3 28/94)', () => {
  const { snapshot, model } = snapshotFixture();
  const rows = baselineRowSets();
  const surface = buildSurface();
  const recon = realReconcile(surface);

  assert.equal(model.coverage.baseline.tools, BASELINE_TOOLS);
  assert.equal(model.coverage.baseline.subcommands, BASELINE_SUBCOMMANDS);
  assert.equal(countBaselineSubcommands(rows.baseline), BASELINE_SUBCOMMANDS);
  assert.equal(model.coverage.waived.tools, WAIVED_TOOLS);
  assert.equal(model.coverage.waived.subcommands, WAIVED_SUBCOMMANDS);
  assert.equal(model.coverage.carded.tools, FIXTURE_TOOL_ENTRIES);
  assert.equal(model.coverage.carded.subcommands, FIXTURE_SUBCOMMANDS);
  // 三层**分列**钉死：carded ≠ baseline（禁止把两者混同）
  assert.notEqual(model.coverage.carded.tools, model.coverage.baseline.tools);
  assert.notEqual(model.coverage.carded.subcommands, model.coverage.baseline.subcommands);
  // parity：真实 reconcile 无缺口（与 pin 一致）
  assert.deepEqual(recon, { missing: [], missingSubs: [], unregistered: [], extraStale: [] });
  assert.equal(ARCHIVE_PARITY_PINNED_CLEAN, true);
  void snapshot;
});

test('A2 archive: L2 waiver constants === real waivers.json truth (drift gate)', () => {
  const { baseline, waivers } = baselineRowSets();
  const byStatus: Record<string, { tools: number; subcommands: number }> = {};
  let tools = 0;
  let subcommands = 0;
  for (const tool of baseline.tools) {
    const waiver = waivers.waivers?.[tool.name];
    if (!waiver) continue;
    tools += 1;
    subcommands += tool.subcommands.length;
    const bucket = byStatus[waiver.status] ?? { tools: 0, subcommands: 0 };
    bucket.tools += 1;
    bucket.subcommands += tool.subcommands.length;
    byStatus[waiver.status] = bucket;
  }
  assert.deepEqual({ tools, subcommands }, { tools: ARCHIVE_WAIVER_BASELINE.tools, subcommands: ARCHIVE_WAIVER_BASELINE.subcommands });
  assert.deepEqual(byStatus, { ...ARCHIVE_WAIVER_BASELINE.byStatus });
});

test('A2 archive: every baseline row is accounted for (row union, 100%) without exaggeration', () => {
  const { model } = snapshotFixture();
  const rows = baselineRowSets();
  const surface = buildSurface();
  const recon = realReconcile(surface);
  const withRecon = buildArchiveModel(modelSnapshot(), {}, {
    coverageRows: { baselineRows: rows.all, waivedRows: rows.waived },
    reconciliation: recon,
  });
  const accounted = withRecon.coverage.accounted;
  assert.equal(accounted.basis, 'rows');
  assert.equal(accounted.baselineRows, BASELINE_TOOLS + BASELINE_SUBCOMMANDS);
  assert.equal(accounted.coveredRows, accounted.baselineRows);
  assert.deepEqual(accounted.missingRows, []);
  assert.equal(accounted.percent, 100);
  assert.equal(withRecon.coverage.parity.verifiedBy, 'injected-reconcile');

  // 独立复算（不信任实现）：每一基线行 ∈ waived ∪ carded
  const waived = new Set(rows.waived);
  const carded = new Set(model.cards.map(cardRowName));
  const uncovered = rows.all.filter((row) => !waived.has(row) && !carded.has(row));
  assert.deepEqual(uncovered, [], '逐条有档：不得存在未 accounted 的基线行');
});

test('A2 archive REVERSE PROOF: dropping a baseline row makes accounted FAIL (anti-exaggeration)', () => {
  const rows = baselineRowSets();
  const { model } = snapshotFixture();
  const carded = model.cards.map(cardRowName);
  const victim = carded.find((row) => rows.all.includes(row) && !rows.waived.includes(row));
  assert.ok(victim, 'fixture must contain a carded baseline row that is not waived');
  const reduced = computeRowCoverage(rows.all, rows.waived, carded.filter((row) => row !== victim));
  assert.ok(reduced.percent < 100, '少覆盖一行 ⇒ 覆盖率必须 < 100%');
  assert.ok(reduced.missingRows.includes(victim));

  // 反证「accounted 直接用 L1 计数」的实现：identity 口径会无视缺口仍报 100 → 必须被区分
  const identity = { basis: 'counts', percent: 100, missingRows: [] as string[] };
  assert.notEqual(reduced.percent, identity.percent);
  assert.notDeepEqual(reduced.missingRows, identity.missingRows);

  // 注入两行幽灵基线行 ⇒ accounted.percent < 100 ⇒ 门禁的 `percent === 100` 断言必须抛错
  const bogus = withCoverageRows(modelSnapshot(), {
    bogusBaselineRows: [...rows.all, 'ghost-tool', 'ghost-tool ghost-sub'],
  });
  assert.ok(bogus.model.coverage.accounted.percent < 100);
  assert.deepEqual(
    (bogus.model.coverage.accounted as { missingRows: string[] }).missingRows,
    ['ghost-tool', 'ghost-tool ghost-sub'],
  );
  assert.throws(
    () => assert.equal(bogus.model.coverage.accounted.percent, 100),
    '反证：未全覆盖时「accounted === 100%」断言必须 FAIL',
  );
});

// ---------------------------------------------------------------------------
// A4 结构无控件（类型层）
// ---------------------------------------------------------------------------

const FORBIDDEN_CARD_KEYS = ['controls', 'actionId', 'control', 'actionTarget'] as const;

function cardKeyViolations(cards: readonly ArchiveCard[]): string[] {
  const hits: string[] = [];
  for (const card of cards) {
    for (const key of Object.keys(card)) {
      if ((FORBIDDEN_CARD_KEYS as readonly string[]).includes(key)) hits.push(`${card.cardId}:${key}`);
    }
  }
  return hits;
}

test('A4 archive: ArchiveCard carries no write-control field (structural, ADR-V2-020)', () => {
  const { model } = snapshotFixture();
  assert.deepEqual(cardKeyViolations(model.cards), []);
  // `deny` 卡是子集（E5：deny 控件恒空，结构上无控件）
  const denyCards = model.cards.filter((card) => card.action === 'deny');
  assert.ok(denyCards.length > 0, 'fixture must contain deny cards');
  assert.deepEqual(cardKeyViolations(denyCards), []);
});

test('A4 archive REVERSE PROOF: injecting an action-id field is detected', () => {
  const { model } = snapshotFixture();
  const injected = { ...model.cards[0], actionId: 'revoke-origin' } as ArchiveCard;
  assert.deepEqual(cardKeyViolations([injected]), [`${injected.cardId}:actionId`]);
});

// R2 supersession S11 + A1 (ADR-V2-030/031): the archive is **layered** — hard-floor
// cards carry no control description (+ readable clamp reason); **tighten-only** cards
// (ui/state/external/destructive) carry `policyControl` with ask/deny only (A1);
// overridable cards carry allow/ask/deny. The module still has no write import.
test('R2 A4 archive: hard-floor cards carry no policyControl; tighten-only ask/deny; overridable allow/ask/deny (S11 + A1)', () => {
  const { model } = snapshotFixture();
  const hardFloor = model.cards.filter((card) => card.overridable !== true && card.tightenOnly !== true);
  const tightenOnly = model.cards.filter((card) => card.tightenOnly === true);
  const overridable = model.cards.filter((card) => card.overridable === true);
  assert.ok(hardFloor.length > 0, 'fixture must contain hard-floor cards');
  assert.ok(tightenOnly.length > 0, 'fixture must contain tighten-only cards (dom click / destructive)');
  assert.ok(overridable.length > 0, 'fixture must contain overridable cards');

  for (const card of hardFloor) {
    assert.equal(card.policyControl, undefined, `hard-floor ${card.cardId} must carry no policyControl`);
    assert.ok(card.clampReason, `hard-floor ${card.cardId} must carry a clampReason`);
    assert.ok(
      typeof card.clampReasonLabel === 'string' && card.clampReasonLabel.length > 0,
      `hard-floor ${card.cardId} must carry a readable clampReasonLabel`,
    );
  }
  for (const card of tightenOnly) {
    assert.equal(card.policyControl?.kind, 'command-policy', `${card.cardId} must carry a control description`);
    assert.deepEqual(
      card.policyControl?.options.map((o) => o.policyAction),
      ['ask', 'deny'],
      `${card.cardId} tighten-only options must be ask/deny (never allow)`,
    );
    assert.equal(card.policyControl?.options.some((o) => o.policyAction === 'allow'), false, `${card.cardId} must not offer allow`);
    assert.equal(card.policyControl?.options.filter((o) => o.selected).length, 1, 'exactly one selected');
    assert.equal(card.policyControl?.options.find((o) => o.selected)?.policyAction, card.effectiveAction);
    assert.ok(card.clampReason, `tighten-only ${card.cardId} must carry a readable clampReason`);
    assert.ok(
      typeof card.clampReasonLabel === 'string' && card.clampReasonLabel.length > 0,
      `tighten-only ${card.cardId} must carry a readable clampReasonLabel`,
    );
  }
  for (const card of overridable) {
    assert.equal(card.policyControl?.kind, 'command-policy', `${card.cardId} must carry a control description`);
    assert.deepEqual(
      card.policyControl?.options.map((o) => o.policyAction),
      ['allow', 'ask', 'deny'],
      `${card.cardId} policy options`,
    );
    assert.equal(card.policyControl?.options.filter((o) => o.selected).length, 1, 'exactly one selected');
    assert.equal(card.policyControl?.options.find((o) => o.selected)?.policyAction, card.effectiveAction);
    assert.equal(card.clampReason, undefined, `overridable ${card.cardId} must not carry a clampReason`);
  }

  // Reverse proof: giving a hard-floor card a policyControl is detectable.
  const injected = { ...hardFloor[0]!, policyControl: { kind: 'command-policy' as const, options: [] } };
  assert.notEqual(injected.policyControl, undefined);
  assert.throws(() => assert.equal(injected.policyControl, undefined));
  // Reverse proof (A1): a tighten-only card must never carry an `allow` option.
  const allowInjected = { ...tightenOnly[0]!, policyControl: { kind: 'command-policy' as const, options: [{ policyAction: 'allow' as const, selected: false }] } };
  assert.throws(() => assert.deepEqual(allowInjected.policyControl.options.map((o) => o.policyAction), ['ask', 'deny']));
});

// R2 (AC-V24-008): default tier vs effective tier are split per card; overrides
// change the effective tier only.
test('R2 A4 archive: default vs effective action are split (override changes effective only)', () => {
  const overrides = { get: (name: string, sub?: string) => (name === 'dom' && sub === 'read-state' ? ('deny' as const) : undefined) };
  const snapshot = projectInsightTree({ ...sourceOf(buildSurface()), overrides });
  const model = buildArchiveModel(snapshot);
  const card = model.cards.find((c) => c.cardId === 'cmd:dom#read-state');
  assert.ok(card, 'dom read-state card must exist');
  assert.equal(card.defaultAction, 'allow');
  assert.equal(card.overrideAction, 'deny');
  assert.equal(card.effectiveAction, 'deny');
  assert.equal(card.overridable, true, 'a non-hard-floor deny stays overridable');
  assert.equal(card.policyControl?.options.find((o) => o.selected)?.policyAction, 'deny');
});

test('A4 archive: the module has no write face / marker injection (source grep)', () => {
  const source = readPluginFile(ARCHIVE_MODULE_PATH);
  const forbidden: readonly { name: string; re: RegExp }[] = [
    { name: 'tree-ops import', re: /tree-ops/ },
    { name: 'tree-receipt import', re: /tree-receipt/ },
    { name: 'TreeActionId', re: /TreeActionId/ },
    { name: 'risk defaults assignment', re: /riskDefaults\s*[:=]/ },
    { name: 'policy config construction', re: /createPluginPolicyConfig/ },
    { name: 'innerHTML', re: /innerHTML/ },
    { name: 'extension api', re: /chrome\s*\./ },
    { name: 'apiKey', re: /apiKey/ },
    { name: 'second disambiguation literal', re: /非可配置档位/ },
  ];
  for (const rule of forbidden) {
    assert.equal(rule.re.test(source), false, `${ARCHIVE_MODULE_PATH} must not contain ${rule.name}`);
  }
  // 反证：任一规则在篡改文本上必须命中
  assert.equal(/innerHTML/.test(`${source}\n// innerHTML`), true);
});

// ---------------------------------------------------------------------------
// A5 delay 单源（导入 + 内容哈希 pin）
// ---------------------------------------------------------------------------

test('A5 archive: delay disambiguation has ONE wording source (imported, hash-pinned)', () => {
  const source = readPluginFile(ARCHIVE_MODULE_PATH);
  assert.match(
    source,
    /from\s*'\.\.\/ui\/tree\/tree-view\.js'/,
    '档案模块必须从 tree-view 导入措辞源（不得复制字面量）',
  );
  assert.match(source, /TREE_NO_ESCALATION_NOTE/);
  assert.equal(source.includes('非可配置档位'), false, '档案模块不得含第二处消歧字面量');
  assertPinnedHash('TREE_NO_ESCALATION_NOTE', sha256(TREE_NO_ESCALATION_NOTE), TREE_NO_ESCALATION_NOTE_SHA256);
  const { model } = snapshotFixture();
  assert.equal(model.notes.noEscalationNote, TREE_NO_ESCALATION_NOTE, '模型必须引用同一措辞源');
});

test('A5 archive REVERSE PROOF: a copied literal / a one-byte change FAILS', () => {
  const source = readPluginFile(ARCHIVE_MODULE_PATH);
  const copied = `${source}\nconst X = '非可配置档位';`;
  assert.equal(copied.includes('非可配置档位'), true, '反证：复制字面量的文本必须被检出');
  assert.notEqual(sha256(`${TREE_NO_ESCALATION_NOTE} `), TREE_NO_ESCALATION_NOTE_SHA256, '一字节改动必须改变哈希');
  assert.throws(
    () => assertPinnedHash('TREE_NO_ESCALATION_NOTE', sha256(`${TREE_NO_ESCALATION_NOTE} `), TREE_NO_ESCALATION_NOTE_SHA256),
    /内容哈希漂移/,
  );
});

// ---------------------------------------------------------------------------
// A6 过滤只读 + 真的收窄
// ---------------------------------------------------------------------------

test('A6 archive: filtering is read-only (snapshot + authorization unchanged) and really narrows', () => {
  const snapshot = modelSnapshot();
  const rows = baselineRowSets();
  const before = JSON.stringify(snapshot);
  const authBefore = snapshot.groups[0].children.map((child) => child.id);
  const deps = { coverageRows: { baselineRows: rows.all, waivedRows: rows.waived } };
  const all = buildArchiveModel(snapshot, {}, deps);
  const narrowed = buildArchiveModel(snapshot, { query: 'zzz-no-such-card-zzz' }, deps);
  const denyOnly = buildArchiveModel(snapshot, { action: 'deny' }, deps);
  const siteOnly = buildArchiveModel(snapshot, { sourceKind: 'site-declared' }, deps);
  assert.equal(JSON.stringify(snapshot), before, '过滤不得 mutate 快照');
  assert.deepEqual(snapshot.groups[0].children.map((child) => child.id), authBefore);
  assert.equal(narrowed.cards.length, 0, '无命中查询必须真的收窄到 0');
  assert.ok(denyOnly.cards.length > 0 && denyOnly.cards.length < all.cards.length, '档位过滤必须真的收窄');
  assert.equal(siteOnly.cards.length, 0, '无站点工具的 fixture 下 site 过滤为 0');
  assert.ok(all.cards.length > 0);
});

test('A6 archive REVERSE PROOF: an always-true predicate would fail the narrowing assertion', () => {
  const snapshot = modelSnapshot();
  const rows = baselineRowSets();
  const all = buildArchiveModel(snapshot, {}, {
    coverageRows: { baselineRows: rows.all, waivedRows: rows.waived },
  });
  const identityFilter = (cards: readonly ArchiveCard[]): ArchiveCard[] => cards.slice();
  // 恒真谓词（收窄断言不成立）→ 断言必须抛错
  assert.throws(() => assert.equal(identityFilter(all.cards).length, 0));
  assert.equal(all.cards.length > 0, true);
});

// ---------------------------------------------------------------------------
// A7 catalogMeta 漂移门禁
// ---------------------------------------------------------------------------

test('A7 archive: CATALOG_BASELINE_META === loadBaseline() truth with a full SHA provenance', () => {
  const baseline = loadBaseline();
  assert.equal(CATALOG_BASELINE_META.toolCount, baseline.toolCount);
  assert.equal(CATALOG_BASELINE_META.toolCount, BASELINE_TOOLS);
  assert.equal(CATALOG_BASELINE_META.subcommandCount, countBaselineSubcommands(baseline));
  assert.equal(CATALOG_BASELINE_META.subcommandCount, BASELINE_SUBCOMMANDS);
  assert.equal(CATALOG_BASELINE_META.provenanceCommit, baseline.provenance.commit);
  assert.match(CATALOG_BASELINE_META.provenanceCommit, /^[0-9a-f]{40}$/);
});

test('A7 archive REVERSE PROOF: one changed constant digit FAILS the drift gate', () => {
  const tampered = { ...CATALOG_BASELINE_META, subcommandCount: CATALOG_BASELINE_META.subcommandCount + 1 };
  assert.notEqual(tampered.subcommandCount, countBaselineSubcommands(loadBaseline()));
  assert.throws(() => assert.equal(tampered.subcommandCount, countBaselineSubcommands(loadBaseline())));
});

// ---------------------------------------------------------------------------
// A8 禁改面内容哈希 pin
// ---------------------------------------------------------------------------

// R2 (2026-09-13) — supersession S9 (ADR-V2-031/027): the closed whitelist grows
// 7 → 9 (`set-command-policy` / `reset-command-policy`); the sha256 pin is updated
// explicitly (see the pin block above for old/new/date/reason).
test('A8 archive: TREE_ACTION_IDS is exactly 9 values (sha256-pinned, R2 supersession S9)', () => {
  assert.deepEqual([...TREE_ACTION_IDS], [
    'revoke-origin',
    'revoke-capability',
    'set-capability-toggle',
    'set-tabs-toggle',
    'clear-auto-auth',
    'disconnect-llm',
    'dissolve-group',
    'set-command-policy',
    'reset-command-policy',
  ]);
  assert.equal(TREE_ACTION_IDS.length, 9);
  assertPinnedHash('TREE_ACTION_IDS', sha256(JSON.stringify(TREE_ACTION_IDS)), TREE_ACTION_IDS_JSON_SHA256);
});

test('A8 archive: injected content sources + tree modules are frozen by content hash', () => {
  for (const [file, pinned] of Object.entries(CONTENT_SOURCE_SHA256)) {
    assertPinnedHash(file, sha256(readPluginFile(file)), pinned);
  }
  for (const [file, pinned] of Object.entries(TREE_MODULE_SHA256)) {
    assertPinnedHash(file, sha256(readPluginFile(file)), pinned);
  }
});

test('A8 archive REVERSE PROOF: one byte in a frozen surface FAILS the pin', () => {
  const contentPath = 'src/content/content-script.ts';
  const text = readPluginFile(contentPath);
  assert.notEqual(sha256(`${text} `), CONTENT_SOURCE_SHA256[contentPath]);
  assert.throws(
    () => assertPinnedHash(contentPath, sha256(`${text} `), CONTENT_SOURCE_SHA256[contentPath]),
    /内容哈希漂移/,
  );
  const json = JSON.stringify([...TREE_ACTION_IDS, 'grant-origin']);
  assert.notEqual(sha256(json), TREE_ACTION_IDS_JSON_SHA256, '扩一个动作必须改变白名单哈希');
});

// ---------------------------------------------------------------------------
// A9 体积重登记结构 + content.js 零增长
// ---------------------------------------------------------------------------

test('A9 archive: sidepanel baseline re-registration is explicit and monotonic (history retained)', () => {
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05, '容差不得因重登记而放宽');
  const history = [...SIDEPANEL_BASELINE_BYTES_HISTORY];
  assert.ok(history.includes(1_110_744), 'HISTORY 必须保留 V2-3 值 1,110,744');
  assert.ok(history.includes(1_132_748), 'HISTORY 必须保留 V2-4 值 1,132,748（v2 R2 重登记不丢历史）');
  assert.ok(history.includes(1_159_856), 'HISTORY 必须保留 v2 R2 值 1,159,856');
  assert.ok(history.includes(1_162_942), 'HISTORY 必须保留 R2 收口实测值 1,162,942');
  for (let i = 1; i < history.length; i += 1) {
    assert.ok(history[i] >= history[i - 1], 'HISTORY 必须单调不减（历史序不得被改写）');
  }
  // v3-1（2026-09-16）：本轮方向为**提升**（L0 骨架 + 折叠控制器的有意增重），
  // 断言改为方向敏感：当前基线必须严格**大于**上一轮登记值，同时历史链仍是可核事实
  // （1,068,165…1,162,942 全保留、单调不减）。
  // v3-1 review 修复轮（2026-09-16, I6）：按真实产物重登记 295,225 B（上一轮
  // 291,523 B 的产物实测 294,874 B），且 ceiling **未抬高**（仍 306,099 B）。
  assert.ok(
    SIDEPANEL_BASELINE_BYTES > SIDEPANEL_BASELINE_META.previousBaselineBytes,
    '当前基线 > 上一轮登记值（本轮方向 = 基线提升）',
  );
  // v3-2 修复轮（2026-09-16，编排器裁决 V3-VOL-1 ②）：v3-1 I6 轮自加的只降不升 cap
  // 被**撤销**（该 cap 非 spec/作者要求，是自缚装置），ceiling 恢复为公式值
  // floor(baseline × 1.05) = 344,062 B。旧断言「ceiling ≤ 上一轮 ceiling」在该裁决下
  // 不再成立，故按裁决语义重 pin（不是放宽：容差 5% 未动、cap 降级为纯记录、断言只增）。
  assert.ok(
    SIDEPANEL_CEILING > SIDEPANEL_BASELINE_META.previousCeilingBytes,
    `ceiling ${SIDEPANEL_CEILING}B 必须 > 上一轮记录 ceiling ${SIDEPANEL_BASELINE_META.previousCeilingBytes}B（cap 已撤销，判定回到公式）`,
  );
  assert.equal(
    SIDEPANEL_CEILING,
    Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05),
    'ceiling = floor(baseline × 1.05)（无 cap，裁决 V3-VOL-1 ①）',
  );
  assert.equal(
    SIDEPANEL_CEILING_CAP_ROLE,
    'record-only',
    'cap 只能作记录、不参与判定（裁决 V3-VOL-1 ②）',
  );
  assert.equal(SIDEPANEL_CEILING_CAP, SIDEPANEL_CEILING_CAP_RECORD, 'cap 旧名只能指向记录值');
  assert.equal(
    evaluateSidepanelSize(SIDEPANEL_CEILING_CAP_RECORD + 1).ok,
    true,
    '反证：记录 cap 之上必须 PASS ⇒ cap 已不在判定里',
  );
  assert.equal(SIDEPANEL_BASELINE_META.kind, 'regression-baseline-only');
  assert.equal(SIDEPANEL_BASELINE_META.source, 'packages/web-cli-plugin/dist/sidepanel.js');
  assert.equal(SIDEPANEL_BASELINE_META.buildCommand, 'npm run build --workspace @lgdl/web-cli-plugin');
  assert.ok(SIDEPANEL_BASELINE_META.measuredOn.length > 0);
  // v3-2（2026-09-16）：上一轮登记值 = 295,225 B（v3-1 I6 轮的最终产物）；更早的
  // 291,523 B（其产物实测 294,874 B）与 266,500 B 仍保留在 reRegisteredFrom 中。
  assert.equal(SIDEPANEL_BASELINE_META.previousBaselineBytes, 295_225);
  assert.match(SIDEPANEL_BASELINE_META.reRegisteredFrom, /291,523 B/, '更早一轮基线必须保留');
  assert.match(SIDEPANEL_BASELINE_META.reRegisteredFrom, /266,500 B/, '更早一轮基线必须保留');
  assert.ok(SIDEPANEL_BASELINE_META.reRegisteredFrom.length > 0);
  assert.equal(SIDEPANEL_BASELINE_META.targetBudgetBytes, null, '基线 ≠ 目标预算');
  assert.equal(SIDEPANEL_BASELINE_META.targetMet, null, '基线 ≠ 目标预算');
});

test('A9 archive: content.js stays at the hard no-growth ceiling (zero injection)', (t) => {
  assert.equal(CONTENT_MAX_BYTES, 177_076, '硬上限 = 2026-09-14 实测值（收紧轮）');
  const size = readArtifactSize(distArtifact('content.js'));
  if (size === undefined) {
    t.skip('dist/content.js not present — build first to measure the content ceiling');
    return;
  }
  assert.ok(size <= CONTENT_MAX_BYTES, `content.js ${size}B 超出零增长红线 ${CONTENT_MAX_BYTES}B`);
});

test('A9 archive REVERSE PROOF: ceiling + 1 still FAILS the re-registered guard', () => {
  assert.equal(evaluateSidepanelSize(SIDEPANEL_CEILING).ok, true);
  const over = evaluateSidepanelSize(SIDEPANEL_CEILING + 1);
  assert.equal(over.ok, false);
  assert.throws(() => assert.equal(over.ok, true, over.message), /体积回归/);
});

function modelSnapshot(): ReturnType<typeof projectInsightTree> {
  return projectInsightTree(sourceOf(buildSurface()));
}

// ===========================================================================
// TASK-005（追加段）：A3 deny 分层全量交叉 × 站点域矩阵 + 分歧钉死 + 反证
// （A1/A2/A4~A9 段零删改）
// ===========================================================================

/** 真实判定链的自动授权层结论（**真实** `decideAutoAuthorization`，非再实现）。 */
function realHardDeny(input: { origin?: string; group?: string; risk?: ToolRisk; destructive?: boolean }): boolean {
  const decision = decideAutoAuthorization({
    origin: input.origin,
    group: input.group,
    risk: input.risk,
    destructive: input.destructive === true,
    settings: { read: true, write: true },
  });
  return decision.hardDeny === true;
}

/**
 * 交叉断言：一张卡的**已存派生字段** vs 真实判定链（按该卡真值输入复算）。
 * 返回分歧原因或 null。
 */
function autoAuthDivergence(card: {
  autoAuthHardLine: boolean;
  group: string;
  risk?: ToolRisk;
  origin?: string;
}): string | null {
  const real = realHardDeny({ origin: card.origin, group: card.group || undefined, risk: card.risk });
  return card.autoAuthHardLine === real ? null : `stored=${card.autoAuthHardLine} real=${real}`;
}

test('A3 archive: full-card auto-hardDeny derivation equals the REAL judgment chain', () => {
  const { model } = snapshotFixture();
  const divergences: string[] = [];
  for (const card of model.cards) {
    const reason = autoAuthDivergence(card);
    if (reason) divergences.push(`${card.cardId}: ${reason}`);
  }
  assert.deepEqual(divergences, [], '全量卡片的自动授权层派生必须与真实判定链逐条一致');
  // fixture 无绑定站点 → 全部非硬底线
  assert.equal(model.cards.every((card) => card.autoAuthHardLine === false), true);
  assert.equal(model.cards.every((card) => card.autoAuthLabel.length > 0), true);
});

test('A3 archive: site-enriched fixture cards all match the real chain (read/write/evaluate/unknown/ui/state/external)', () => {
  const snapshot = projectInsightTree(sourceOf(siteSurface(), SITE_ORIGIN));
  const rows = baselineRowSets();
  const model = buildArchiveModel(snapshot, {}, { coverageRows: { baselineRows: rows.all, waivedRows: rows.waived } });
  const siteCards = model.cards.filter((card) => card.group === 'site');
  assert.equal(siteCards.length, 7, 'fixture must carry the 7 synthetic site tools');
  assert.equal(siteCards.every((card) => card.origin === SITE_ORIGIN), true, 'site 卡必须标注所属 origin');
  const divergences: string[] = [];
  for (const card of model.cards) {
    const reason = autoAuthDivergence(card);
    if (reason) divergences.push(`${card.cardId}: ${reason}`);
  }
  assert.deepEqual(divergences, []);
});

test('A3 archive: site-domain matrix (risk × origin × group × trust × destructive) matches exactly', () => {
  const risks: Array<ToolRisk | 'bogus' | undefined> = [
    'read',
    'write',
    'evaluate',
    'bogus',
    'ui',
    'state',
    'external',
    undefined,
  ];
  const mismatches: string[] = [];
  for (const group of [undefined, 'site', 'plugin']) {
    for (const risk of risks) {
      for (const originPresent of [true, false]) {
        for (const trust of ['trusted', 'untrusted'] as const) {
          for (const destructive of [false, true]) {
            const origin = originPresent ? SITE_ORIGIN : undefined;
            // 派生输入不含 trust / destructive（自动授权层不消费它们）—— 矩阵证明该层对其
            // 两种取值给出同一结论，且与真实链逐格一致。
            const derived = autoAuthHardLine({
              group: group ?? '',
              risk: risk as ToolRisk | undefined,
              ...(origin ? { origin } : {}),
            });
            const real = realHardDeny({ origin, group, risk: risk as ToolRisk | undefined, destructive });
            if (derived !== real) {
              mismatches.push(
                `group=${String(group)} risk=${String(risk)} origin=${originPresent} trust=${trust} destructive=${destructive}: derived=${derived} real=${real}`,
              );
            }
          }
        }
      }
    }
  }
  assert.deepEqual(mismatches, [], '站点域矩阵必须逐格与真实判定链一致（不得从宽）');
});

test('A3 archive: the divergence classes are pinned exactly (site vs non-site evaluate/unknown)', () => {
  type Probe = { group: string; risk?: ToolRisk; origin?: string };
  const evaluateSite: Probe = { group: 'site', risk: 'evaluate', origin: SITE_ORIGIN };
  const risklessSite: Probe = { group: 'site', origin: SITE_ORIGIN };
  const risklessSiteUnbound: Probe = { group: 'site' };
  const evaluateNonSite: Probe = { group: 'plugin', risk: 'evaluate' };
  const risklessNonSite: Probe = { group: 'plugin' };
  // 站点 evaluate / 未知 risk（已绑定 origin）：policy 层 deny，auto 层 hardDeny
  assert.equal(autoAuthHardLine(evaluateSite), true);
  assert.equal(autoAuthHardLine(risklessSite), true);
  // 站点但无绑定 origin：auto 层不适用（真实链第一步 `!origin ⇒ 不自动`）
  assert.equal(autoAuthHardLine(risklessSiteUnbound), false);
  // 非站点 evaluate / 未知 risk：policy 层仍 deny，但 auto 层不适用
  assert.equal(autoAuthHardLine(evaluateNonSite), false);
  assert.equal(autoAuthHardLine(risklessNonSite), false);
  // 「分歧类从宽不得通过」：逐格精确匹配（派生 == 真实）
  assert.deepEqual(
    [evaluateSite, risklessSite, risklessSiteUnbound, evaluateNonSite, risklessNonSite].map((input) => {
      const derived = autoAuthHardLine(input);
      const real = realHardDeny({ origin: input.origin, group: input.group, risk: input.risk });
      return derived === real;
    }),
    [true, true, true, true, true],
  );
});

test("A3 archive REVERSE PROOF: flipping one card's derived field/input is detected (T3 lesson)", () => {
  const snapshot = projectInsightTree(sourceOf(siteSurface(), SITE_ORIGIN));
  const rows = baselineRowSets();
  const model = buildArchiveModel(snapshot, {}, { coverageRows: { baselineRows: rows.all, waivedRows: rows.waived } });
  const clean = model.cards.find((card) => card.group === 'site' && card.autoAuthHardLine === false);
  assert.ok(clean, 'fixture must contain a site card that is not hard-deny');
  assert.equal(autoAuthDivergence(clean), null, '未翻转的卡必须与真实链一致');

  // 1) 翻转已存派生字段（真值链不变）⇒ 必须被检出
  const flippedField = { ...clean, autoAuthHardLine: !clean.autoAuthHardLine };
  const fieldReason = autoAuthDivergence(flippedField);
  assert.ok(fieldReason, '反证：翻转已存派生字段必须被检测到');
  assert.match(fieldReason, /stored=true real=false/);

  // 2) 把输入改成与真值不符（只改 risk，已存派生字段不跟随）⇒ 必须被检出
  const flippedInput = { ...clean, risk: 'evaluate' as ToolRisk };
  const inputReason = autoAuthDivergence(flippedInput);
  assert.ok(inputReason, '反证：把 risk 改成与真值不符（已存派生字段未跟随）必须被检测到');
  assert.match(inputReason, /stored=false real=true/);

  // 3) 人为构造「派生字段恒 true」的假实现 ⇒ 与真实链的分歧必须被检出
  const alwaysHard = { ...clean, autoAuthHardLine: true };
  assert.ok(autoAuthDivergence(alwaysHard), '反证：恒 true 的假派生必须被交叉断言检出');
});

