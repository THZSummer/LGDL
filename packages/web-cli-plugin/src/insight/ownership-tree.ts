/**
 * V2-1 R2 —— 纯归属树（FR-V2-070 / FR-V2-071；ADR-V2-028 / ADR-V2-003）。
 *
 * 把确定性 `ConnectTreeSnapshot` 的**扁平面**（`groups[].children`，对账/parity/archive
 * 消费的既有结构）**纯派生**为嵌套 `OwnershipNode` 树：
 *   - 真父子层级（`children`，**非扁平 `rows`**）+ 每节点 `path`（根→节点标签链）；
 *   - 唯一**主归属链**（`mainOwner`）：`site_*` → 站点面；base/插件命令 → 命令面（按来源
 *     分组）；能力 → 能力面；LLM → LLM 面；
 *   - 多归属以**交叉引用徽标**（`crossRefCount` / `crossRefLabels`）表达，**不复制节点**
 *     （同一 `nodeId` 全树唯一；从任一归属下钻解析到同一节点）。
 *
 * 纯派生、零副作用、零扩展接口（chrome 接口）、零 IO、零明文；不改变快照扁平面与 `meta.hash` 输入
 * （确定性/对账/archive 前提零变化）。
 *
 * 作者两例（AC-V2-020）：
 *   ① `连接树 → 授权的站点 → 站点 xxx → 支持的命令 → 工具 → 子命令`
 *   ② `连接树 → 支持的命令 → 系统内置命令 → dom → dom read-state`
 */
import type { CapabilityNode, CommandNode, ConnectTreeSnapshot, Dimension, LlmNode, SessionNode, SiteNode, SourceKind } from './tree-model.js';

/** 归属面标签（一级分组；作者示例的字面措辞）。 */
export const OWNERSHIP_FACE_LABELS: Readonly<Record<Dimension, string>> = {
  site: '授权的站点',
  capability: '浏览器能力',
  command: '支持的命令',
  llm: 'LLM 连接',
};

/** 连接树根节点标签（作者示例：「连接树」）。 */
export const OWNERSHIP_ROOT_LABEL = '连接树';

/** 命令来源分类 → 命令面二级分组标签（示例② `系统内置命令`）。 */
export const OWNERSHIP_SOURCE_LABELS: Readonly<Record<SourceKind, string>> = {
  'base-builtin': '系统内置命令',
  'plugin-admin': '插件管理命令',
  'plugin-tabs': '标签页命令',
  'plugin-bookmarks': '书签命令',
  'plugin-downloads': '下载命令',
  'plugin-notify': '通知命令',
  'plugin-clipboard': '剪贴板命令',
  'site-declared': '站点声明命令',
};

/** 命令面二级分组的固定顺序（确定性）。 */
export const OWNERSHIP_SOURCE_ORDER: readonly SourceKind[] = [
  'base-builtin',
  'plugin-admin',
  'plugin-tabs',
  'plugin-bookmarks',
  'plugin-downloads',
  'plugin-notify',
  'plugin-clipboard',
  'site-declared',
];

export type OwnershipNodeKind = 'root' | 'face' | 'group' | 'site' | 'capability' | 'command' | 'llm' | 'session';

/** 主归属面（`root` = 连接树根自身）。 */
export type OwnershipOwner = Dimension | 'root';

/**
 * R2 修复轮（A2）：**出站**交叉引用（本节点引用他归属节点）。
 *
 * 用于 UI 侧「非主归属处可交互下钻」：点击后经 `nodeId` 解析到该节点**唯一**主归属
 * 实例并展开到可见（节点不复制）。
 */
export interface CrossRefTarget {
  /** 目标节点稳定键（全树唯一；主归属处唯一实例）。 */
  nodeId: string;
  /** 引用关系文案（来自 `CrossLink.label`，如「依赖权限/能力」）。 */
  relation: string;
  /** 目标主归属面可读标签（如「能力面」）。 */
  faceLabel: string;
  /** 目标节点可读标签（如「浏览器能力 · 书签」）。 */
  targetLabel: string;
}

export interface OwnershipNode {
  /** 全树唯一 id（face/group 用 `owner:` 前缀命名空间；其余用快照稳定键）。 */
  id: string;
  kind: OwnershipNodeKind;
  label: string;
  /** 该节点对应的快照节点稳定键（face/group/root 无）。 */
  nodeId?: string;
  ariaLevel: number;
  /** 层级路径（根→本节点标签链，含本节点）——FR-V2-073 面包屑。 */
  path: string[];
  /** 唯一主归属面。 */
  mainOwner: OwnershipOwner;
  /** 非主归属引用条数（交叉引用徽标）。 */
  crossRefCount: number;
  /** 交叉引用徽标文案（可读）。 */
  crossRefLabels: string[];
  /** 出站交叉引用（本节点引用他归属节点；A2 交互下钻用）。 */
  crossTargets: CrossRefTarget[];
  badgeSummary: string[];
  children: OwnershipNode[];
}

export interface OwnershipTree {
  root: OwnershipNode;
}

/** 归属树输入：快照去掉 `ownershipTree` 自身（避免自引用）。 */
export type OwnershipSource = Omit<ConnectTreeSnapshot, 'ownershipTree'>;

function commandNodeLabel(node: CommandNode): string {
  return node.subcommand ? `${node.name} ${node.subcommand}` : node.name;
}

function groupChildren<T>(snapshot: OwnershipSource, dimension: Dimension): T[] {
  const group = snapshot.groups.find((g) => g.dimension === dimension);
  return (group?.children ?? []) as T[];
}

function commandNodes(snapshot: OwnershipSource): CommandNode[] {
  return groupChildren<CommandNode>(snapshot, 'command');
}

function siteNodes(snapshot: OwnershipSource): SiteNode[] {
  return groupChildren<SiteNode>(snapshot, 'site');
}

function capabilityNodes(snapshot: OwnershipSource): CapabilityNode[] {
  return groupChildren<CapabilityNode>(snapshot, 'capability');
}

/** 每个快照节点的**主归属面**（唯一）。 */
function computeMainOwners(snapshot: OwnershipSource): Map<string, Dimension> {
  const owners = new Map<string, Dimension>();
  for (const site of siteNodes(snapshot)) owners.set(site.id, 'site');
  for (const cap of capabilityNodes(snapshot)) owners.set(cap.id, 'capability');
  const siteIds = new Set(siteNodes(snapshot).map((s) => s.id));
  for (const cmd of commandNodes(snapshot)) {
    const linkedSite = cmd.crossLinks.some((l) => l.kind === 'origin' && siteIds.has(l.to));
    owners.set(cmd.id, cmd.sourceKind === 'site-declared' && linkedSite ? 'site' : 'command');
  }
  for (const llm of groupChildren<LlmNode>(snapshot, 'llm')) {
    owners.set(llm.id, 'llm');
    for (const s of (llm.sessions ?? []) as SessionNode[]) owners.set(s.id, 'llm');
  }
  return owners;
}

function ownerFaceLabel(owner: Dimension): string {
  if (owner === 'site') return '站点面';
  if (owner === 'capability') return '能力面';
  if (owner === 'command') return '命令面';
  return 'LLM 面';
}

interface CrossRefSlot {
  /** 引用方节点 id（按 from 唯一去重）。 */
  refs: Set<string>;
  /** 引用方的归属面（用于单条可读徽标）。 */
  faces: Set<Dimension>;
}

/** LLM 节点可读标签（与 `buildOwnershipTree` 渲染一致，单一措辞源）。 */
function llmNodeLabel(llm: LlmNode): string {
  return llm.configured ? `${llm.providerName || '已配置'}${llm.model ? ` · ${llm.model}` : ''}` : '未配置 LLM';
}

/**
 * R2 修复轮（A2）：出站交叉引用（本节点 → 他归属节点）。
 *
 * 仅收录「目标已知且目标主归属面 ≠ 本节点主归属面」的 `crossLink`（同一主归属内的
 * 引用不算跨归属下钻），按 `(to, relation)` 去重并保持 `crossLinks` 原序（确定性）。
 */
function computeCrossTargets(snapshot: OwnershipSource, owners: Map<string, Dimension>): Map<string, CrossRefTarget[]> {
  const labels = new Map<string, string>();
  for (const site of siteNodes(snapshot)) labels.set(site.id, `站点 ${site.origin}`);
  for (const cap of capabilityNodes(snapshot)) labels.set(cap.id, cap.label);
  for (const cmd of commandNodes(snapshot)) labels.set(cmd.id, commandNodeLabel(cmd));
  for (const llm of groupChildren<LlmNode>(snapshot, 'llm')) {
    labels.set(llm.id, llmNodeLabel(llm));
    for (const s of (llm.sessions ?? []) as SessionNode[]) labels.set(s.id, s.label);
  }

  const out = new Map<string, CrossRefTarget[]>();
  const add = (fromId: string, links: readonly { to: string; label: string }[]): void => {
    const ownerFrom = owners.get(fromId);
    if (!ownerFrom) return;
    const slot = out.get(fromId) ?? [];
    const seen = new Set(slot.map((t) => `${t.nodeId}|${t.relation}`));
    for (const link of links) {
      const to = link.to;
      const ownerTo = owners.get(to);
      const targetLabel = labels.get(to);
      if (!ownerTo || ownerTo === ownerFrom || to === fromId || !targetLabel) continue;
      const key = `${to}|${link.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slot.push({ nodeId: to, relation: link.label, faceLabel: ownerFaceLabel(ownerTo), targetLabel });
    }
    if (slot.length > 0) out.set(fromId, slot);
  };
  for (const node of [...siteNodes(snapshot), ...capabilityNodes(snapshot), ...commandNodes(snapshot)]) add(node.id, node.crossLinks);
  for (const llm of groupChildren<LlmNode>(snapshot, 'llm')) {
    add(llm.id, llm.crossLinks);
    for (const s of (llm.sessions ?? []) as SessionNode[]) add(s.id, s.crossLinks);
  }
  return out;
}

/**
 * 交叉引用计数（非主归属引用）。
 *
 * 对每条 `crossLink`（`from → to`）：仅当 `mainOwner(from) ≠ mainOwner(to)` 且两者都已知时，
 * 记 `to` 一次（按 `from` 唯一去重）——即「被其他归属引用 N 次」。徽标为**单条**
 * `亦被 N 处引用（<面>）`（不产生 1..N 的累计重复）。
 */
function computeCrossRefs(snapshot: OwnershipSource): Map<string, CrossRefSlot> {
  const owners = computeMainOwners(snapshot);
  const out = new Map<string, CrossRefSlot>();
  const addRef = (to: string, from: string): void => {
    const ownerTo = owners.get(to);
    const ownerFrom = owners.get(from);
    if (!ownerTo || !ownerFrom || ownerTo === ownerFrom) return;
    const slot = out.get(to) ?? { refs: new Set<string>(), faces: new Set<Dimension>() };
    if (!slot.refs.has(from)) {
      slot.refs.add(from);
      slot.faces.add(ownerFrom);
    }
    out.set(to, slot);
  };
  const visit = (node: { id: string; crossLinks: { from: string; to: string }[] }): void => {
    for (const link of node.crossLinks) addRef(link.to, link.from);
  };
  for (const node of [...siteNodes(snapshot), ...capabilityNodes(snapshot), ...commandNodes(snapshot)]) visit(node);
  for (const llm of groupChildren<LlmNode>(snapshot, 'llm')) {
    visit(llm);
    for (const s of (llm.sessions ?? []) as SessionNode[]) visit(s);
  }
  return out;
}

interface NodeInit {
  id: string;
  kind: OwnershipNodeKind;
  label: string;
  nodeId?: string;
  mainOwner: OwnershipOwner;
  badges?: string[];
}

type NodeFactory = (init: NodeInit, pathLabels: string[], children: OwnershipNode[]) => OwnershipNode;

function makeCommandSubtree(make: NodeFactory, tool: CommandNode, subs: readonly CommandNode[], parentPath: string[], owner: Dimension): OwnershipNode {
  const toolNode = make(
    {
      id: tool.id,
      kind: 'command',
      label: tool.name,
      nodeId: tool.id,
      mainOwner: owner,
      badges: tool.badges.map((b) => b.label),
    },
    parentPath,
    [],
  );
  const childNodes = subs.map((sub) =>
    make(
      {
        id: sub.id,
        kind: 'command',
        label: commandNodeLabel(sub),
        nodeId: sub.id,
        mainOwner: owner,
        badges: sub.badges.map((b) => b.label),
      },
      toolNode.path,
      [],
    ),
  );
  return { ...toolNode, children: childNodes };
}

/**
 * 纯派生：确定性快照 → 真父子层级归属树（同一输入 → 同一输出）。
 *
 * 不做任何写操作、不改快照（不 mutate 输入）。
 */
export function buildOwnershipTree(snapshot: OwnershipSource): OwnershipTree {
  const owners = computeMainOwners(snapshot);
  const crossRefs = computeCrossRefs(snapshot);
  const crossTargets = computeCrossTargets(snapshot, owners);
  const commands = commandNodes(snapshot);

  const make: NodeFactory = (init, pathLabels, children) => {
    const path = [...pathLabels, init.label];
    const refs = init.nodeId ? crossRefs.get(init.nodeId) : undefined;
    return {
      id: init.id,
      kind: init.kind,
      label: init.label,
      ...(init.nodeId ? { nodeId: init.nodeId } : {}),
      ariaLevel: path.length - 1,
      path,
      mainOwner: init.mainOwner,
      crossRefCount: refs ? refs.refs.size : 0,
      crossRefLabels: refs ? [`亦被 ${refs.refs.size} 处引用（${[...refs.faces].map(ownerFaceLabel).join('、')}）`] : [],
      crossTargets: init.nodeId ? (crossTargets.get(init.nodeId) ?? []) : [],
      badgeSummary: [...(init.badges ?? [])],
      children,
    };
  };

  const rootPrefix = [OWNERSHIP_ROOT_LABEL];

  // ── 站点面：站点 → （该站点）支持的命令 → 工具 → 子命令（示例①） ──────────────
  const claimed = new Set<string>();
  const siteFaceChildren: OwnershipNode[] = [];
  for (const site of siteNodes(snapshot)) {
    const owned = commands.filter(
      (c) => c.sourceKind === 'site-declared' && c.crossLinks.some((l) => l.kind === 'origin' && l.to === site.id),
    );
    for (const c of owned) claimed.add(c.id);
    const siteNodePath = [...rootPrefix, OWNERSHIP_FACE_LABELS.site, `站点 ${site.origin}`];
    const groupNode = make({ id: `${site.id}::commands`, kind: 'group', label: '支持的命令', mainOwner: 'site' }, siteNodePath, []);
    const tools = owned
      .filter((c) => !c.subcommand)
      .map((tool) => makeCommandSubtree(make, tool, owned.filter((c) => c.subcommand && c.name === tool.name), groupNode.path, 'site'));
    const children = tools.length > 0 ? [{ ...groupNode, children: tools }] : [];
    siteFaceChildren.push(
      make(
        { id: site.id, kind: 'site', label: `站点 ${site.origin}`, nodeId: site.id, mainOwner: 'site', badges: site.badges.map((b) => b.label) },
        [...rootPrefix, OWNERSHIP_FACE_LABELS.site],
        children,
      ),
    );
  }
  const siteFace = make(
    { id: 'owner:site', kind: 'face', label: OWNERSHIP_FACE_LABELS.site, mainOwner: 'site' },
    rootPrefix,
    siteFaceChildren,
  );

  // ── 命令面：按来源分组 → 工具 → 子命令（示例②） ─────────────────────────────
  const commandFaceChildren: OwnershipNode[] = [];
  for (const sourceKind of OWNERSHIP_SOURCE_ORDER) {
    const inSource = commands.filter((c) => c.sourceKind === sourceKind && !claimed.has(c.id));
    if (inSource.length === 0) continue;
    const categoryNode = make(
      { id: `owner:command::src:${sourceKind}`, kind: 'group', label: OWNERSHIP_SOURCE_LABELS[sourceKind], mainOwner: 'command' },
      [...rootPrefix, OWNERSHIP_FACE_LABELS.command],
      [],
    );
    const tools = inSource
      .filter((c) => !c.subcommand)
      .map((tool) => makeCommandSubtree(make, tool, inSource.filter((c) => c.subcommand && c.name === tool.name), categoryNode.path, 'command'));
    commandFaceChildren.push({ ...categoryNode, children: tools });
  }
  const commandFace = make(
    { id: 'owner:command', kind: 'face', label: OWNERSHIP_FACE_LABELS.command, mainOwner: 'command' },
    rootPrefix,
    commandFaceChildren,
  );

  // ── 能力面 ───────────────────────────────────────────────────────────────
  const capabilityFace = make(
    { id: 'owner:capability', kind: 'face', label: OWNERSHIP_FACE_LABELS.capability, mainOwner: 'capability' },
    rootPrefix,
    capabilityNodes(snapshot).map((cap) =>
      make(
        { id: cap.id, kind: 'capability', label: cap.label, nodeId: cap.id, mainOwner: 'capability', badges: cap.badges.map((b) => b.label) },
        [...rootPrefix, OWNERSHIP_FACE_LABELS.capability],
        [],
      ),
    ),
  );

  // ── LLM 面：连接 → 会话 ───────────────────────────────────────────────────
  const llmFaceChildren: OwnershipNode[] = groupChildren<LlmNode>(snapshot, 'llm').map((llm) => {
    const label = llm.configured ? `${llm.providerName || '已配置'}${llm.model ? ` · ${llm.model}` : ''}` : '未配置 LLM';
    const sessionNodes = (llm.sessions ?? []).map((s) =>
      make(
        { id: s.id, kind: 'session', label: s.label, nodeId: s.id, mainOwner: 'llm', badges: s.badges.map((b) => b.label) },
        [...rootPrefix, OWNERSHIP_FACE_LABELS.llm, label],
        [],
      ),
    );
    return make(
      { id: llm.id, kind: 'llm', label, nodeId: llm.id, mainOwner: 'llm', badges: llm.badges.map((b) => b.label) },
      [...rootPrefix, OWNERSHIP_FACE_LABELS.llm],
      sessionNodes,
    );
  });
  const llmFace = make(
    { id: 'owner:llm', kind: 'face', label: OWNERSHIP_FACE_LABELS.llm, mainOwner: 'llm' },
    rootPrefix,
    llmFaceChildren,
  );

  const root = make({ id: 'root', kind: 'root', label: OWNERSHIP_ROOT_LABEL, mainOwner: 'root' }, [], [
    siteFace,
    commandFace,
    capabilityFace,
    llmFace,
  ]);

  return { root };
}

/** 前序遍历全部节点（供唯一性/下钻断言；不进入快照 payload）。 */
export function collectOwnershipNodes(tree: OwnershipTree): OwnershipNode[] {
  const out: OwnershipNode[] = [];
  const walk = (node: OwnershipNode): void => {
    out.push(node);
    for (const child of node.children) walk(child);
  };
  walk(tree.root);
  return out;
}

/** 按快照稳定键下钻到**同一**节点（不产生副本；多归属解析同一 `nodeId`）。 */
export function ownershipNodeFor(tree: OwnershipTree, nodeId: string): OwnershipNode | undefined {
  return collectOwnershipNodes(tree).find((node) => node.nodeId === nodeId);
}

/** 层级路径（根→节点标签链）；未找到返回 `undefined`。 */
export function ownershipPathFor(tree: OwnershipTree, nodeId: string): string[] | undefined {
  return ownershipNodeFor(tree, nodeId)?.path;
}
