/**
 * V2-1 R2 门禁 `insight-tree-hierarchy`（R2-V21-05；AC-V21-008~010 / FR-V2-070/071/079）。
 *
 * 证明（结构性质，非文案承诺）：
 *   - 归属树为**真父子层级**（非扁平 `rows`）；**作者两例**逐层枚举成功（AC-V2-020）；
 *   - 多归属：`nodeId` 全树唯一 + `mainOwner` + `crossRefCount` + 下钻同一 node（AC-V2-021）；
 *   - 默认档 / 覆盖生效档**分列** + `clampReason` 与父 §5.7 表一致（AC-V2-025 模型侧）；
 *   - 覆盖面 `live` vs `baseline` **分列**、不夸大（FR-V2-079）；
 *   - **快照扁平面与 `meta.hash` 输入零变化**（对账/确定性/parity/archive 前提）；
 *   - 反证：把归属树改回扁平 → FAIL；把 live 计数改成 baseline → FAIL；
 *   - 取代台账（A4 订正口径）：**无未取代删除**（受保护文件每一行删除均有 old→new 台账依据）
 *     + `test(` 总数不减 + `journey.mjs` 零 diff；字面 `removed=0` 经 R2 审查复核**不成立**，
 *     台账登记 `literalRemovedZero:false`（历史表述保留、口径订正）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { projectInsightTree, type InsightSource } from '../src/insight/project-tree.js';
import { toolSubcommands } from '../src/insight/command-catalog.js';
import {
  OWNERSHIP_FACE_LABELS,
  OWNERSHIP_ROOT_LABEL,
  OWNERSHIP_SOURCE_LABELS,
  buildOwnershipTree,
  collectOwnershipNodes,
  ownershipPathFor,
  type OwnershipNode,
  type OwnershipTree,
} from '../src/insight/ownership-tree.js';
import { hashStructure, type CommandNode, type ConnectTreeSnapshot } from '../src/insight/tree-model.js';

// ---------------------------------------------------------------------------
// fixture
// ---------------------------------------------------------------------------

const A = 'https://a.test';

const CAPS = {
  grants: { bookmarks: false, downloads: false, notify: false, clipboard: false },
  toggles: {
    bookmarksRead: false,
    bookmarksWrite: false,
    downloadsRead: false,
    notify: false,
    clipboardRead: false,
    clipboardWrite: false,
  },
  tabsEnabled: true,
};

function source(overrides?: (name: string, sub?: string) => 'allow' | 'ask' | 'deny' | undefined): InsightSource {
  return {
    sites: [
      { origin: A, authorized: true, trust: 'untrusted', authorizedAt: 1, updatedAt: 2 },
      { origin: 'https://b.test', authorized: false, trust: 'untrusted', updatedAt: 3 },
    ],
    capability: CAPS,
    toolSurface: [
      {
        name: 'dom',
        group: 'ui',
        risk: 'ui',
        subcommands: ['read-state', 'click', 'type', 'remove'],
        subcommandRisks: { 'read-state': 'read', click: 'ui', type: 'write', remove: 'write' },
        presentInSurface: true,
      },
      { name: 'site_notes', group: 'site', risk: 'read', subcommands: ['list'], presentInSurface: true },
      { name: 'tabs', group: 'plugin', risk: 'write', subcommands: ['list', 'open'], presentInSurface: true },
      { name: 'bookmarks', group: 'plugin', risk: 'write', subcommands: ['list', 'remove'], presentInSurface: true },
      { name: 'mystery', group: 'plugin', subcommands: [], presentInSurface: true },
    ],
    delayMs: 0,
    llm: { configured: true, providerId: 'deepseek', providerName: 'DeepSeek', model: 'deepseek-chat' },
    sessions: [{ sessionId: 'session-1', label: '会话一', origins: [A], lastActiveAt: 7 }],
    activeOrigin: A,
    isOriginAuthorized: (origin) => origin === A,
    catalogMeta: { toolCount: 34, subcommandCount: 142, provenanceCommit: 'a'.repeat(40) },
    ...(overrides ? { overrides: { get: overrides } } : {}),
  };
}

function commandById(snapshot: ConnectTreeSnapshot, id: string): CommandNode {
  const group = snapshot.groups.find((g) => g.dimension === 'command');
  const node = (group?.children as CommandNode[]).find((c) => c.id === id);
  assert.ok(node, `command node ${id} must exist`);
  return node;
}

function maxDepth(node: OwnershipNode): number {
  return node.children.length === 0 ? 0 : 1 + Math.max(...node.children.map(maxDepth));
}

function isHierarchical(tree: OwnershipTree): boolean {
  // 真父子层级 = 至少到「工具」之下还有一层（示例②：root→face→source→tool→sub）。
  return maxDepth(tree.root) >= 4;
}

// ---------------------------------------------------------------------------
// AC-V2-020：真树形 + 作者两例逐层枚举 + 反证
// ---------------------------------------------------------------------------

test('R2 hierarchy: the ownership tree is a real parent/child hierarchy (not flat rows)', () => {
  const snapshot = projectInsightTree(source());
  const tree = snapshot.ownershipTree;
  assert.equal(tree.root.label, OWNERSHIP_ROOT_LABEL);
  assert.equal(tree.root.kind, 'root');
  assert.deepEqual(
    tree.root.children.map((c) => c.label),
    ['授权的站点', '支持的命令', '浏览器能力', 'LLM 连接'],
  );
  assert.equal(isHierarchical(tree), true, 'ownership tree must not be flat');

  // 反证：把归属树改成扁平（清空各 face 的孙层）→ 层级判据必须 FAIL。
  const flattened: OwnershipTree = {
    root: {
      ...tree.root,
      children: tree.root.children.map((face) => ({
        ...face,
        children: face.children.map((child) => ({ ...child, children: [] })),
      })),
    },
  };
  assert.equal(isHierarchical(flattened), false, 'a flattened tree must fail the hierarchy predicate');
  assert.throws(() => assert.equal(isHierarchical(flattened), true), '反证：扁平形态必须被层级断言拒绝');
});

test('R2 hierarchy: author example ① — 站点 → 该站点支持的命令 → 工具 → 子命令', () => {
  const snapshot = projectInsightTree(source());
  const path = ownershipPathFor(snapshot.ownershipTree, 'cmd:site_notes#list');
  assert.ok(path, 'the site-declared subcommand must be drilled down from the site face');
  assert.deepEqual(path, [
    OWNERSHIP_ROOT_LABEL,
    OWNERSHIP_FACE_LABELS.site,
    `站点 ${A}`,
    '支持的命令',
    'site_notes',
    'site_notes list',
  ]);
  // 每一级都在树中可定位（逐层枚举）。
  const labels = collectOwnershipNodes(snapshot.ownershipTree).map((n) => n.label);
  for (const layer of [OWNERSHIP_FACE_LABELS.site, `站点 ${A}`, '支持的命令', 'site_notes', 'site_notes list']) {
    assert.ok(labels.includes(layer), `layer「${layer}」must be present`);
  }
});

test('R2 hierarchy: author example ② — 支持的命令 → 系统内置命令 → dom → dom read-state', () => {
  const snapshot = projectInsightTree(source());
  const path = ownershipPathFor(snapshot.ownershipTree, 'cmd:dom#read-state');
  assert.ok(path);
  assert.deepEqual(path, [
    OWNERSHIP_ROOT_LABEL,
    OWNERSHIP_FACE_LABELS.command,
    OWNERSHIP_SOURCE_LABELS['base-builtin'],
    'dom',
    'dom read-state',
  ]);
  const dom = collectOwnershipNodes(snapshot.ownershipTree).find((n) => n.id === 'cmd:dom');
  assert.ok(dom, 'the dom tool node must exist');
  assert.deepEqual(dom.children.map((c) => c.label).sort(), ['dom click', 'dom read-state', 'dom remove', 'dom type']);
});

test('R2 hierarchy: every node id is unique across the whole tree (no duplication)', () => {
  const snapshot = projectInsightTree(source());
  const nodes = collectOwnershipNodes(snapshot.ownershipTree);
  const ids = nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'ownership node ids must be globally unique');
  const nodeIds = nodes.filter((n) => n.nodeId).map((n) => n.nodeId as string);
  assert.equal(new Set(nodeIds).size, nodeIds.length, 'snapshot-backed nodeIds must be unique (no node copies)');
});

// ---------------------------------------------------------------------------
// AC-V2-021：多归属主链 + 交叉引用徽标 + 下钻同一节点
// ---------------------------------------------------------------------------

test('R2 hierarchy: multi-ownership uses a unique main chain + cross-ref badge (no node copy)', () => {
  const snapshot = projectInsightTree(source());
  const nodes = collectOwnershipNodes(snapshot.ownershipTree);
  const capability = nodes.filter((n) => n.nodeId === 'cap:opt:bookmarks');
  assert.equal(capability.length, 1, 'a multi-owned node must appear exactly once');
  assert.equal(capability[0]!.mainOwner, 'capability', 'main ownership must be unique (capability face)');
  assert.ok(capability[0]!.crossRefCount >= 1, 'the capability node is referenced by the command face');
  assert.ok(
    capability[0]!.crossRefLabels.some((l) => l.includes('亦被') && l.includes('命令面')),
    `cross-ref badge must be readable: ${JSON.stringify(capability[0]!.crossRefLabels)}`,
  );

  // Drill-down from the (non-main) command face resolves to the SAME node id.
  const bookmarks = commandById(snapshot, 'cmd:bookmarks');
  assert.ok(
    bookmarks.crossLinks.some((l) => l.to === 'cap:opt:bookmarks'),
    'the command node references the capability node (multi-ownership edge)',
  );
  const drill = nodes.find((n) => n.id === 'cmd:bookmarks');
  assert.ok(drill);
  assert.equal(drill.mainOwner, 'command');
  assert.equal(capability[0]!.nodeId, 'cap:opt:bookmarks');
  const staticTabs = nodes.find((n) => n.nodeId === 'cap:static:tabs');
  assert.ok(staticTabs);
  assert.equal(staticTabs.crossRefCount >= 1, true);
});

// R2 fix round (A2 / AC-V2-021): the non-main-ownership cross reference is an
// interactive drill-down target that resolves to the SAME unique node (no copy).
test('R2 hierarchy (A2): outbound cross-refs resolve to the same unique main-owner node', () => {
  const snapshot = projectInsightTree(source());
  const nodes = collectOwnershipNodes(snapshot.ownershipTree);

  const bookmarksTool = nodes.find((n) => n.nodeId === 'cmd:bookmarks');
  assert.ok(bookmarksTool, 'cmd:bookmarks must exist');
  const toCapability = bookmarksTool!.crossTargets.find((t) => t.nodeId === 'cap:opt:bookmarks');
  assert.ok(toCapability, 'cmd:bookmarks must carry an outbound cross-ref to cap:opt:bookmarks');
  assert.equal(toCapability!.faceLabel, '能力面');
  assert.ok(toCapability!.targetLabel.length > 0);
  // Drill-down resolves to exactly one node (same id; the multi-owned node is not copied).
  const resolved = nodes.filter((n) => n.nodeId === 'cap:opt:bookmarks');
  assert.equal(resolved.length, 1, 'the cross-ref target must resolve to a single node (no copy)');
  assert.equal(resolved[0]!.id, 'cap:opt:bookmarks');
  assert.equal(resolved[0]!.mainOwner, 'capability');

  // Reverse proof: a same-face link is NOT a cross-ref (outbound only across faces).
  const readState = nodes.find((n) => n.nodeId === 'cmd:dom#read-state');
  assert.ok(readState);
  assert.deepEqual(readState!.crossTargets, [], 'same-face links must not be outbound cross-refs');
});

// ---------------------------------------------------------------------------
// AC-V21-010：默认档 / 生效档分列 + clamp 逐档（父 §5.7 表）
// ---------------------------------------------------------------------------

test('R2 hierarchy: default vs effective action split + clampReason matches the §5.7 table', () => {
  const snapshot = projectInsightTree(source());

  // 容器（dom 工具级）= 设置载体：可覆盖、无 clampReason。
  const dom = commandById(snapshot, 'cmd:dom');
  assert.equal(dom.defaultAction, 'ask');
  assert.equal(dom.overridable, true);
  assert.equal(dom.clampReason, undefined);
  assert.equal(dom.controls.length, 3);
  assert.deepEqual(dom.controls.map((c) => c.policyAction), ['allow', 'ask', 'deny']);
  assert.equal(dom.controls.every((c) => c.kind === 'command-policy'), true);

  // read 档（作者示例）：三档全可用。
  const readState = commandById(snapshot, 'cmd:dom#read-state');
  assert.equal(readState.defaultAction, 'allow');
  assert.equal(readState.effectiveAction, 'allow');
  assert.equal(readState.overridable, true);
  assert.equal(readState.controls.length, 3);

  // ui 档：不得放宽 → 只可收紧层（ask/deny 两档控件 + 可读原因；A1）。
  const click = commandById(snapshot, 'cmd:dom#click');
  assert.equal(click.defaultAction, 'ask');
  assert.equal(click.effectiveAction, 'ask');
  assert.equal(click.overridable, false);
  assert.equal(click.tightenOnly, true);
  assert.equal(click.clampReason, 'ui-no-widen');
  assert.deepEqual(click.controls.map((c) => c.policyAction), ['ask', 'deny'], 'ui tier exposes tighten-only ask/deny');
  assert.equal(click.controls.some((c) => c.policyAction === 'allow'), false, 'ui tier must never offer allow');

  // 非破坏性 write 档：可覆盖。
  const type = commandById(snapshot, 'cmd:dom#type');
  assert.equal(type.defaultAction, 'ask');
  assert.equal(type.overridable, true);
  assert.equal(type.controls.length, 3);

  // 破坏性子命令：保底 ask（只可收紧）。
  const remove = commandById(snapshot, 'cmd:dom#remove');
  assert.equal(remove.overridable, false);
  assert.equal(remove.tightenOnly, true);
  assert.equal(remove.clampReason, 'destructive-floor');
  assert.equal(remove.effectiveAction, 'ask');
  assert.deepEqual(remove.controls.map((c) => c.policyAction), ['ask', 'deny']);
  assert.equal(remove.controls.some((c) => c.policyAction === 'allow'), false);

  // 未知 risk（S3）：fail-closed deny，硬底线零控件。
  const mystery = commandById(snapshot, 'cmd:mystery');
  assert.equal(mystery.defaultAction, 'deny');
  assert.equal(mystery.denyCause, 's3-unknown-risk');
  assert.equal(mystery.overridable, false);
  assert.equal(mystery.tightenOnly, undefined);
  assert.equal(mystery.clampReason, 's3-unknown-risk');
  assert.equal(mystery.effectiveAction, 'deny');
  assert.equal(mystery.controls.length, 0);

  // 站点未授权（S1）：即便容器也硬底线。
  const s1 = projectInsightTree({ ...source(), activeOrigin: 'https://unauth.test', isOriginAuthorized: () => false });
  const siteThing = commandById(s1, 'cmd:site_notes');
  assert.equal(siteThing.denyCause, 's1-unauthorized');
  assert.equal(siteThing.overridable, false);
  assert.equal(siteThing.clampReason, 's1-unauthorized');
  assert.equal(siteThing.effectiveAction, 'deny');
  assert.equal(siteThing.controls.length, 0);
});

test('R2 hierarchy: state / external / evaluate tiers are clamped (no widening)', () => {
  const custom = projectInsightTree({
    sites: [],
    capability: CAPS,
    toolSurface: [
      { name: 'x-state', group: 'plugin', risk: 'state', subcommands: [], presentInSurface: true },
      { name: 'x-external', group: 'plugin', risk: 'external', subcommands: [], presentInSurface: true },
      { name: 'x-evaluate', group: 'plugin', risk: 'evaluate', subcommands: [], presentInSurface: true },
      { name: 'x-read', group: 'plugin', risk: 'read', subcommands: [], presentInSurface: true },
      { name: 'x-write', group: 'plugin', risk: 'write', subcommands: ['go'], presentInSurface: true },
    ],
    delayMs: 0,
  });
  assert.equal(commandById(custom, 'cmd:x-state').clampReason, 'state-no-widen');
  assert.equal(commandById(custom, 'cmd:x-state').overridable, false);
  assert.equal(commandById(custom, 'cmd:x-state').tightenOnly, true);
  assert.deepEqual(commandById(custom, 'cmd:x-state').controls.map((c) => c.policyAction), ['ask', 'deny']);
  assert.equal(commandById(custom, 'cmd:x-external').clampReason, 'external-no-widen');
  assert.equal(commandById(custom, 'cmd:x-external').tightenOnly, true);
  assert.equal(commandById(custom, 'cmd:x-evaluate').clampReason, 'evaluate');
  assert.equal(commandById(custom, 'cmd:x-evaluate').tightenOnly, undefined);
  assert.equal(commandById(custom, 'cmd:x-evaluate').effectiveAction, 'deny');
  assert.equal(commandById(custom, 'cmd:x-evaluate').controls.length, 0);
  assert.equal(commandById(custom, 'cmd:x-read').overridable, true);
  assert.equal(commandById(custom, 'cmd:x-write').overridable, true, 'tool-level carrier of a write tool');
  assert.equal(commandById(custom, 'cmd:x-write#go').overridable, true, 'non-destructive write subcommand');
  assert.equal(commandById(custom, 'cmd:x-write#go').defaultAction, 'ask');
});

test('R2 hierarchy: overrides split default/effective and non-hard-floor deny keeps controls', () => {
  const map: Record<string, 'allow' | 'ask' | 'deny'> = {
    'cmd:dom': 'allow',
    'cmd:dom#read-state': 'deny',
    'cmd:mystery': 'allow',
  };
  // 与 store 同源的继承解析：cmd:<工具>#<子命令> > cmd:<工具>。
  const lookup = (name: string, sub?: string) => {
    if (sub && map[`cmd:${name}#${sub}`]) return map[`cmd:${name}#${sub}`];
    return map[`cmd:${name}`];
  };
  const overridden = projectInsightTree(source(lookup));
  const readState = commandById(overridden, 'cmd:dom#read-state');
  assert.equal(readState.defaultAction, 'allow');
  assert.equal(readState.overrideAction, 'deny');
  assert.equal(readState.effectiveAction, 'deny');
  assert.equal(readState.overridable, true, 'a non-hard-floor deny stays overridable (can change back)');
  assert.equal(readState.controls.length, 3);
  assert.equal(readState.controls.find((c) => c.selected)?.policyAction, 'deny');

  // Tool-level carrier inherits to subcommands without a sub-level override.
  const domType = commandById(overridden, 'cmd:dom#type');
  assert.equal(domType.overrideAction, 'allow', 'inherited from the tool-level override');
  assert.equal(domType.effectiveAction, 'allow');
  // ui subcommand is still clamped even when the tool-level override is allow.
  const domClick = commandById(overridden, 'cmd:dom#click');
  assert.equal(domClick.overrideAction, 'allow');
  assert.equal(domClick.effectiveAction, 'ask');
  assert.equal(domClick.clampReason, 'ui-no-widen');

  // Hard floor cannot be widened by an override.
  const mystery = commandById(overridden, 'cmd:mystery');
  assert.equal(mystery.overrideAction, 'allow');
  assert.equal(mystery.effectiveAction, 'deny', 'S3 must stay deny even with an allow override');
  assert.equal(mystery.clampReason, 's3-unknown-risk');
  assert.equal(mystery.controls.length, 0);
});

// ---------------------------------------------------------------------------
// FR-V2-079：覆盖面分列 + 反证
// ---------------------------------------------------------------------------

test('R2 hierarchy: coverage splits live vs baseline, never conflated', () => {
  const snapshot = projectInsightTree(source());
  // fixture: 5 tools (dom/site_notes/tabs/bookmarks/mystery) + 9 subcommands.
  assert.deepEqual(snapshot.coverage.live, { tools: 5, subcommands: 9, cards: 14 });
  assert.deepEqual(snapshot.coverage.baseline, { tools: 34, subcommands: 142 });
  assert.ok(snapshot.coverage.note.includes('实时投影面'));
  assert.ok(snapshot.coverage.note.includes('独立对账口径'));
  assert.equal(JSON.stringify(snapshot.coverage).includes('accounted'), false, 'accounted must not be rendered');
  assert.equal(JSON.stringify(snapshot).includes('已全部渲染'), false, 'no over-claiming wording');

  // 反证：把 live 计数改成 baseline → 分列断言必须 FAIL。
  const conflated = {
    ...snapshot.coverage,
    live: { ...snapshot.coverage.live, tools: snapshot.coverage.baseline!.tools },
  };
  assert.throws(
    () => assert.deepEqual(conflated.live, snapshot.coverage.live),
    '反证：live 计数被夸大成 baseline 时，分列断言必须 FAIL',
  );
  assert.throws(
    () => assert.deepEqual(conflated.live.tools, snapshot.coverage.live.tools),
    '反证：live.tools 与 baseline.tools 相同必须被拒绝',
  );
});

test('R2 hierarchy: the flat group face is unchanged and meta.hash input is untouched', () => {
  const sourceInput = source();
  const snapshot = projectInsightTree(sourceInput, { builtAt: 1 });
  const commandGroup = snapshot.groups.find((g) => g.dimension === 'command')!;
  const commandChildren = commandGroup.children as CommandNode[];
  assert.ok(commandChildren.length > 0);
  assert.equal(commandChildren.every((c) => c.kind === 'command'), true);
  assert.equal(commandChildren.some((c) => 'children' in (c as unknown as Record<string, unknown>)), false);

  // hash input excludes ownershipTree / coverage → recomputation equals meta.hash.
  const recomputed = hashStructure({
    version: snapshot.version,
    root: snapshot.root,
    groups: snapshot.groups,
    facets: snapshot.facets,
    counts: snapshot.meta.counts,
    sources: snapshot.meta.sources,
    degradations: snapshot.meta.degradations,
    modelNote: snapshot.meta.modelNote,
  });
  assert.equal(recomputed, snapshot.meta.hash);
  // Hashing a structure that *includes* the tree differs → the tree is not a hash input.
  const withTree = hashStructure({
    version: snapshot.version,
    root: snapshot.root,
    groups: snapshot.groups,
    facets: snapshot.facets,
    counts: snapshot.meta.counts,
    sources: snapshot.meta.sources,
    degradations: snapshot.meta.degradations,
    modelNote: snapshot.meta.modelNote,
    ownershipTree: snapshot.ownershipTree,
  });
  assert.notEqual(withTree, snapshot.meta.hash, 'ownershipTree must not enter the hash input');
  // Determinism: same input → deep-equal snapshot (incl. ownershipTree).
  assert.deepEqual(projectInsightTree(sourceInput, { builtAt: 1 }), snapshot);
});

test('R2 hierarchy: buildOwnershipTree is deterministic and does not mutate the snapshot', () => {
  const sourceInput = source();
  const snapshot = projectInsightTree(sourceInput, { builtAt: 5 });
  const before = JSON.stringify(snapshot);
  const a = buildOwnershipTree(snapshot);
  const b = buildOwnershipTree(snapshot);
  assert.deepEqual(a, b, 'same snapshot → same ownership tree');
  assert.equal(JSON.stringify(snapshot), before, 'building the ownership tree must not mutate the snapshot');
});

// ---------------------------------------------------------------------------
// A3：站点工具的子命令枚举回退（真实 DOM 示例①「工具→子命令」的前提）
// ---------------------------------------------------------------------------

test('R2 A3: toolSubcommands prefers schema enum and falls back to subcommandRisks (site-declared)', () => {
  // plugin/base tools declare the enum explicitly.
  assert.deepEqual(
    toolSubcommands({ schema: { parameters: { properties: { subcommand: { enum: ['list', 'open'] } } } }, subcommandRisks: { list: 'read' } }),
    ['list', 'open'],
  );
  // site-declared tools have no enum but carry `subcommandRisks` (declaration order preserved).
  assert.deepEqual(toolSubcommands({ schema: { parameters: { properties: {} } }, subcommandRisks: { list: 'write', show: 'write' } }), [
    'list',
    'show',
  ]);
  // opaque tool → [] (unchanged behaviour; S3 fail-closed downstream).
  assert.deepEqual(toolSubcommands({ schema: { parameters: {} } }), []);
  assert.deepEqual(toolSubcommands({}), []);
  // Reverse proof: without the fallback a site tool would expose no subcommands.
  assert.equal(toolSubcommands({ schema: { parameters: { properties: { subcommand: { description: '子命令（可选：list / show）' } } } } }).length, 0);
});

// ---------------------------------------------------------------------------
// removed=0 → A4 订正口径：无未取代删除 + 总数不减 + journey 零 diff
// ---------------------------------------------------------------------------

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
/** 运行期工作目录 = 插件包根（`npm test` 在 package 目录执行；源码与 `dist-test` 两种形态通用）。 */
const PLUGIN_ROOT = `${process.cwd()}/`;

const PROTECTED_EXISTING_TESTS = [
  'packages/web-cli-plugin/test/insight-projection.test.ts',
  'packages/web-cli-plugin/test/insight-determinism.test.ts',
  'packages/web-cli-plugin/test/insight-catalog.test.ts',
] as const;

const JOURNEY_V1_GATE = ['packages/web-cli-plugin/test/ui/journey.mjs'] as const;

/** R2 起点（spec 修订轮提交）；区间删除以此基线核验。 */
const R2_BASE = 'a955a7f';

interface LedgerEntry {
  id: string;
  file: string;
  oldTitle: string;
  newTitle: string;
  reason: string;
}

interface Ledger {
  metric: string;
  literalRemovedZero: boolean;
  literalRemovedZeroNote: string;
  journey: { file: string; policy: string };
  counts: { nodeTests: { before: number; afterR2: number } };
  entries: LedgerEntry[];
  protectedFileOldLines: string[];
}

function readLedger(): Ledger {
  return JSON.parse(readFileSync(`${PLUGIN_ROOT}docs/r2-supersession-ledger.json`, 'utf8')) as Ledger;
}

/** 从 unified diff 抽取删除行（排除 `---` 文件头）。 */
export function parseDeletedLines(diff: string): string[] {
  return diff
    .split('\n')
    .filter((line) => line.startsWith('-') && !line.startsWith('---'))
    .map((line) => line.slice(1).trim())
    .filter((line) => line.length > 0);
}

/** `rev`（HEAD / 区间起点 / 工作区）相对工作区的删除行；git 缺失 → 抛出（绝不吞成假绿）。 */
function deletedLines(rev: string, paths: readonly string[]): string[] {
  const diff = execFileSync('git', ['-C', REPO_ROOT, 'diff', '--unified=0', rev, '--', ...paths], { encoding: 'utf8' });
  return parseDeletedLines(diff);
}

/** `rev` 相对工作区是否有任何 diff（含新增）。 */
function hasDiff(rev: string, paths: readonly string[]): boolean {
  try {
    execFileSync('git', ['-C', REPO_ROOT, 'diff', '--quiet', rev, '--', ...paths], { encoding: 'utf8' });
    return false;
  } catch {
    return true;
  }
}

/** 工作区 test/*.test.ts 的静态 `test(` 计数（与审查复算同法）。 */
function currentNodeTestCount(): number {
  let total = 0;
  for (const file of readdirSync(`${PLUGIN_ROOT}test`).filter((f) => f.endsWith('.test.ts'))) {
    const text = readFileSync(`${PLUGIN_ROOT}test/${file}`, 'utf8');
    total += text.match(/\btest\(/g)?.length ?? 0;
  }
  return total;
}

test('R2 (A4): no unreplaced deletions (ledger-covered) + counts non-decreasing + journey zero-diff', () => {
  const ledger = readLedger();

  // 1) 口径订正已记录：字面 removed=0 不成立（false），正确口径在 metric。
  assert.equal(ledger.literalRemovedZero, false, 'literal removed=0 must be recorded as superseded');
  assert.match(ledger.metric, /无未取代删除/);
  assert.match(ledger.metric, /总断言数不减/);

  // 2) 台账逐条 old→new 齐备（S1~S16 + R2 修复轮 S19/S19b/S20）。
  assert.ok(ledger.entries.length >= 16, 'ledger must enumerate the R2 supersessions');
  for (const entry of ledger.entries) {
    assert.ok(
      entry.id && entry.file && entry.oldTitle && entry.newTitle && entry.reason,
      `ledger entry incomplete: ${JSON.stringify(entry)}`,
    );
  }
  assert.ok(ledger.entries.some((e) => e.id === 'S20'), 'A7 supersession (S20) must be recorded');

  // 3) 受保护文件（既有断言）的**每一行删除**都必须命中台账 old 行（无未取代删除）。
  const covered = ledger.protectedFileOldLines.map((line) => line.trim());
  const protectedDeleted = [
    ...deletedLines('HEAD', PROTECTED_EXISTING_TESTS),
    ...deletedLines(R2_BASE, PROTECTED_EXISTING_TESTS),
  ];
  for (const line of protectedDeleted) {
    assert.ok(
      covered.some((c) => c === line || line.includes(c)),
      `unreplaced deletion (no ledger entry): ${JSON.stringify(line)}`,
    );
  }

  // 4) journey.mjs（v1 门禁）区间 + 工作区零 diff。
  assert.equal(hasDiff('HEAD', JOURNEY_V1_GATE), false, 'journey.mjs must have zero working-tree diff');
  assert.equal(hasDiff(R2_BASE, JOURNEY_V1_GATE), false, 'journey.mjs must have zero R2-range diff');

  // 5) 总断言数不减（静态 `test(` 计数 ≥ 台账 before）。
  const current = currentNodeTestCount();
  assert.ok(current >= ledger.counts.nodeTests.before, `node test( count must not decrease: ${current} < ${ledger.counts.nodeTests.before}`);

  // 反证：删除行解析器在合成的 diff 上必须真的检出删除（避免解析器恒空导致假绿）。
  const synthetic = ['--- a/x.ts', '+++ b/x.ts', '@@ -1 +1 @@', '-const kept = true;', '+const kept = false;'].join('\n');
  assert.deepEqual(parseDeletedLines(synthetic), ['const kept = true;']);
});
