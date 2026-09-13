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
 *   - `removed=0`：`insight-projection` / `insight-determinism` / `insight-catalog`
 *     既有断言 `git diff --unified=0` 零删除行。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { projectInsightTree, type InsightSource } from '../src/insight/project-tree.js';
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

  // ui 档：不得放宽 → 硬底线（零控件 + 可读原因）。
  const click = commandById(snapshot, 'cmd:dom#click');
  assert.equal(click.defaultAction, 'ask');
  assert.equal(click.effectiveAction, 'ask');
  assert.equal(click.overridable, false);
  assert.equal(click.clampReason, 'ui-no-widen');
  assert.equal(click.controls.length, 0);

  // 非破坏性 write 档：可覆盖。
  const type = commandById(snapshot, 'cmd:dom#type');
  assert.equal(type.defaultAction, 'ask');
  assert.equal(type.overridable, true);
  assert.equal(type.controls.length, 3);

  // 破坏性子命令：保底 ask（不可放宽）。
  const remove = commandById(snapshot, 'cmd:dom#remove');
  assert.equal(remove.overridable, false);
  assert.equal(remove.clampReason, 'destructive-floor');
  assert.equal(remove.effectiveAction, 'ask');
  assert.equal(remove.controls.length, 0);

  // 未知 risk（S3）：fail-closed deny，不可覆盖。
  const mystery = commandById(snapshot, 'cmd:mystery');
  assert.equal(mystery.defaultAction, 'deny');
  assert.equal(mystery.denyCause, 's3-unknown-risk');
  assert.equal(mystery.overridable, false);
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
  assert.equal(commandById(custom, 'cmd:x-external').clampReason, 'external-no-widen');
  assert.equal(commandById(custom, 'cmd:x-evaluate').clampReason, 'evaluate');
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
// removed=0：既有断言零删改（git diff --unified=0 无删除行）
// ---------------------------------------------------------------------------

const PROTECTED_EXISTING_TESTS = [
  'packages/web-cli-plugin/test/insight-projection.test.ts',
  'packages/web-cli-plugin/test/insight-determinism.test.ts',
  'packages/web-cli-plugin/test/insight-catalog.test.ts',
] as const;

/** 从 unified diff 抽取删除行（排除 `---` 文件头）。 */
export function parseDeletedLines(diff: string): string[] {
  return diff
    .split('\n')
    .filter((line) => line.startsWith('-') && !line.startsWith('---'))
    .map((line) => line.slice(1).trim())
    .filter((line) => line.length > 0);
}

/** 删除行；非 git 仓库 / git 缺失 → 抛出（绝不吞成假绿）。 */
function deletedLines(paths: readonly string[]): string[] {
  const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const diff = execFileSync('git', ['-C', repoRoot, 'diff', '--unified=0', 'HEAD', '--', ...paths], {
    encoding: 'utf8',
  });
  return parseDeletedLines(diff);
}

test('R2 hierarchy: existing projection/determinism/catalog assertions have zero deletions (removed=0)', () => {
  const deleted = deletedLines(PROTECTED_EXISTING_TESTS);
  assert.deepEqual(deleted, [], `既有断言禁止删除；发现删除行：${JSON.stringify(deleted.slice(0, 5))}`);
  // 反证：删除行解析器在合成的 diff 上必须真的检出删除（避免解析器恒空导致假绿）。
  const synthetic = ['--- a/x.ts', '+++ b/x.ts', '@@ -1 +1 @@', '-const kept = true;', '+const kept = false;'].join('\n');
  assert.deepEqual(parseDeletedLines(synthetic), ['const kept = true;']);
});
