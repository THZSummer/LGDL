/**
 * V2-2 连接树纯渲染模型（FR-V2-021/022/025；ADR-V2-011 / ADR-V2-013）。
 *
 * `buildTreeRows(snapshot, filter?)` 把 V2-1 的确定性 `ConnectTreeSnapshot` 投影为
 * **纯数据**的渲染模型（无 DOM、无 IO、无副作用、可 node 测试）。DOM 挂载一律在
 * `tree-drawer.ts`，本模块**不触扩展接口、不写 store、不渲染**。
 *
 * 结构保证（ADR-V2-011，非文案承诺）：
 *   1. 命令 `action==='deny'` ⇒ 该行 `controls === []`（`delay` 同属 fail-closed 档，
 *      亦无任何开关）；
 *   2. 静态权限节点 `controls` **永不**含 `revoke`（并携带 `revokeHint` 如实披露
 *      「不可逐项撤销」）；
 *   3. 可选能力仅在 `granted===true` 时给 `revoke` 控件（未授予时不渲染「假撤销」）；
 *   4. **命令级无任何写入控件**（V2-3 动作表亦无命令级条目）。
 *
 * 过滤（FR-V2-022）为**纯只读**：只筛选展示集合，绝不 mutate 快照或授权状态。
 */
import type { PolicyAction } from '@lgdl/web-cli-base';
import {
  type Badge,
  type CapabilityNode,
  type CommandNode,
  type ConnectTreeSnapshot,
  type ControlDescriptor,
  type Dimension,
  type SiteNode,
  type SourceKind,
  type TreeActionId,
} from '../../insight/tree-model.js';

// ---------------------------------------------------------------------------
// 钉死文案（FR-V2-025 / FR-V2-010）
// ---------------------------------------------------------------------------

/** 如实声明「森林，非严格树」（恒含于 `header.modelNote`）。 */
export const TREE_MODEL_NOTE =
  '四维度分组视图（森林），非严格树：以「本插件」为根，允许跨层引用（展示用；分组 ≠ 授权）。';

/**
 * 「不是提权面」声明（恒含于 `header.noEscalationNote`）。
 *
 * `delay`（= `deny`，fail-closed）与命令间 `delayMs` 是**两回事**：前者是处置档位
 * （不可放宽），后者是命令间隔毫秒数；此处并标以免误读（FR-V2-054）。
 */
export const TREE_NO_ESCALATION_NOTE =
  '连接树是「可见 + 撤销」面，不是提权面：撤销/关断 = 回到更保守，不放宽任何门禁。' +
  '命令档位 delay（= deny，fail-closed，非可配置档位；与命令间 delayMs 无关）不可放宽；' +
  'deny/delay 节点不提供任何开关。';

export const TREE_GROUP_ORDER: readonly Dimension[] = ['site', 'capability', 'command', 'llm'];

/** 维度空态文案（EC-V22-003：可读空态 + 下一步）。 */
const GROUP_EMPTY_HINT: Readonly<Record<Dimension, string>> = {
  site: '尚无站点授权记录：在目标站点点击插件图标并授权后，这里会列出站点及其授权状态。',
  capability: '暂无可显示的能力项：静态权限/可选能力/隐私开关均会在此分组。',
  command: '暂无可显示的命令：工具面为空，或当前过滤条件无命中。',
  llm: '暂无 LLM 连接信息：在设置页配置后这里会显示连接状态（不显示 key）。',
};

const SOURCE_KIND_LABEL: Readonly<Record<SourceKind, string>> = {
  'site-declared': '站点声明',
  'plugin-admin': '插件管理',
  'plugin-tabs': '标签页工具',
  'plugin-bookmarks': '书签能力',
  'plugin-downloads': '下载记录',
  'plugin-notify': '系统通知',
  'plugin-clipboard': '剪贴板',
  'base-builtin': '内置',
};

// ---------------------------------------------------------------------------
// 渲染模型类型
// ---------------------------------------------------------------------------

export interface TreeRow {
  id: string;
  /** 1 = 维度下的节点；2 = 子层（子命令 / LLM 会话）。0 保留给维度分组。 */
  depth: 0 | 1 | 2;
  dimension: Dimension;
  label: string;
  sublabel?: string;
  badges: Badge[];
  /** 结构保证：`deny` 命令恒为 `[]`；静态权限永不含 `revoke`。 */
  controls: ControlDescriptor[];
  /** 静态权限「不可逐项撤销」的如实披露（仅静态权限节点携带）。 */
  revokeHint?: string;
  /** 维度为空 / 过滤无命中时的可读提示。 */
  emptyHint?: string;
  /** 跨层引用（展示用标签，不复制节点）。 */
  crossRefs: string[];
  /** 命令行：处置档位（deny/allow/ask）。 */
  action?: PolicyAction;
  /** 命令行：来源分类（V2-4 预留）。 */
  sourceKind?: SourceKind;
  /** 能力行：未授予（可选能力）/ 不可撤销（静态权限）的展示标记。 */
  revocable?: boolean;
}

export interface TreeGroupModel {
  dimension: Dimension;
  label: string;
  count: number;
  rows: TreeRow[];
  /** 该维度过滤后为空时的可读提示（EC-V22-003）。 */
  emptyHint: string;
}

export interface TreeFilter {
  dimension?: Dimension;
  query?: string;
  action?: PolicyAction;
  sourceKind?: SourceKind;
}

export interface TreeRenderModel {
  header: { modelNote: string; noEscalationNote: string };
  groups: TreeGroupModel[];
  filter: { query: string; matches: number };
  /** 空态 / 降级（EC-V22-003）——直接复制自快照 meta，只读展示。 */
  degradations: { dimension: Dimension; code: string; text: string }[];
}

// ---------------------------------------------------------------------------
// 二次确认范围（ADR-V2-013）
// ---------------------------------------------------------------------------

/** 不可逆 / 高影响动作：需显式确认。 */
const CONFIRM_REQUIRED: ReadonlySet<TreeActionId> = new Set<TreeActionId>([
  'revoke-origin',
  'revoke-capability',
  'clear-auto-auth',
  'disconnect-llm',
  'dissolve-group',
]);

/** 开关翻转（可逆）动作：不需确认。 */
const CONFIRM_NOT_REQUIRED: ReadonlySet<TreeActionId> = new Set<TreeActionId>([
  'set-capability-toggle',
  'set-tabs-toggle',
]);

/**
 * 某动作是否需要二次确认（ADR-V2-013，纯函数）。
 * 不可逆/高影响 → `true`；可逆开关 → `false`。拒绝即零操作（fail-closed）。
 */
export function needsConfirmation(actionId: TreeActionId): boolean {
  if (CONFIRM_NOT_REQUIRED.has(actionId)) return false;
  return CONFIRM_REQUIRED.has(actionId);
}

// ---------------------------------------------------------------------------
// 控件结构保证（ADR-V2-011）
// ---------------------------------------------------------------------------

/** 命令行控件：**deny ⇒ []**；其余仅保留只读披露，绝无写入控件。 */
function commandControls(node: CommandNode): ControlDescriptor[] {
  if (node.action === 'deny') return [];
  return node.controls.filter((c) => c.kind === 'none');
}

/** 能力行控件：静态权限永无 revoke；可选能力仅授予后给 revoke；开关给 toggle。 */
function capabilityControls(node: CapabilityNode): ControlDescriptor[] {
  if (node.source === 'static') return [];
  if (node.source === 'optional') {
    return node.granted ? node.controls.filter((c) => c.kind === 'revoke') : [];
  }
  return node.controls.filter((c) => c.kind === 'toggle');
}

/** 站点行控件：仅已授权站点可「撤销授权」。 */
function siteControls(node: SiteNode): ControlDescriptor[] {
  return node.authorized ? node.controls.filter((c) => c.kind === 'revoke') : [];
}

// ---------------------------------------------------------------------------
// 行构造
// ---------------------------------------------------------------------------

function crossRefsOf(node: { crossLinks: { label: string }[] }): string[] {
  return node.crossLinks.map((l) => l.label);
}

function siteRow(node: SiteNode): TreeRow {
  return {
    id: node.id,
    depth: 1,
    dimension: 'site',
    label: node.origin,
    sublabel: node.authorized ? '已授权站点（可撤销授权）' : '未授权站点（不构成授权）',
    badges: [...node.badges],
    controls: siteControls(node),
    crossRefs: crossRefsOf(node),
    revocable: node.revocable,
  };
}

function capabilityRow(node: CapabilityNode): TreeRow {
  const sourceLabel =
    node.source === 'static' ? '静态权限' : node.source === 'optional' ? '可选能力' : '隐私开关';
  const scope = node.scope ? ` · ${node.scope === 'read' ? '读取' : '写入'}` : '';
  return {
    id: node.id,
    depth: 1,
    dimension: 'capability',
    label: node.label,
    sublabel: `${sourceLabel}${scope} · ${node.granted ? '已授予/已开启' : '未授予/已关闭'}`,
    badges: [...node.badges],
    controls: capabilityControls(node),
    ...(node.revokeHint ? { revokeHint: node.revokeHint } : {}),
    crossRefs: crossRefsOf(node),
    revocable: node.revocable,
  };
}

function commandRow(node: CommandNode): TreeRow {
  const label = node.subcommand ? `${node.name} ${node.subcommand}` : node.name;
  const sublabel =
    `来源 ${SOURCE_KIND_LABEL[node.sourceKind]}（${node.sourceKind}）` +
    ` · 命令间隔 delayMs=${node.delayMs}ms（与 delay 档无关）` +
    ` · 处置 ${node.action}`;
  return {
    id: node.id,
    depth: node.subcommand ? 2 : 1,
    dimension: 'command',
    label,
    sublabel,
    badges: [...node.badges],
    controls: commandControls(node),
    crossRefs: crossRefsOf(node),
    action: node.action,
    sourceKind: node.sourceKind,
  };
}

function llmRow(node: {
  id: string;
  providerName: string;
  model: string;
  configured: boolean;
  badges: Badge[];
  crossLinks: { label: string }[];
}): TreeRow {
  return {
    id: node.id,
    depth: 1,
    dimension: 'llm',
    label: node.configured ? `${node.providerName || '已配置'}${node.model ? ` · ${node.model}` : ''}` : '未配置 LLM',
    sublabel: node.configured ? '已配置（不显示 key）' : '未配置：在设置页填入 API Key 后可用（树内不改绑）',
    badges: [...node.badges],
    controls: [],
    crossRefs: node.crossLinks.map((l) => l.label),
  };
}

function sessionRow(session: {
  id: string;
  label: string;
  origins: string[];
}): TreeRow {
  return {
    id: session.id,
    depth: 2,
    dimension: 'llm',
    label: session.label,
    sublabel: `会话 · ${session.origins.length} 个来源站点`,
    badges: [],
    controls: [],
    crossRefs: [],
  };
}

function rowsForDimension(dimension: Dimension, snapshot: ConnectTreeSnapshot): TreeRow[] {
  const group = snapshot.groups.find((g) => g.dimension === dimension);
  if (!group) return [];
  if (dimension === 'site') return (group.children as SiteNode[]).map(siteRow);
  if (dimension === 'capability') return (group.children as CapabilityNode[]).map(capabilityRow);
  if (dimension === 'command') return (group.children as CommandNode[]).map(commandRow);
  const llmChildren = group.children as {
    id: string;
    providerName: string;
    model: string;
    configured: boolean;
    badges: Badge[];
    crossLinks: { label: string }[];
    sessions?: { id: string; label: string; origins: string[] }[];
  }[];
  const rows: TreeRow[] = [];
  for (const llm of llmChildren) {
    rows.push(llmRow(llm));
    for (const session of llm.sessions ?? []) rows.push(sessionRow(session));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 过滤（纯只读）
// ---------------------------------------------------------------------------

function rowMatchesQuery(row: TreeRow, query: string): boolean {
  const haystack = `${row.label} ${row.sublabel ?? ''} ${row.id}`.toLowerCase();
  return haystack.includes(query);
}

function applyRowFilter(rows: TreeRow[], filter: TreeFilter): TreeRow[] {
  const query = filter.query?.trim().toLowerCase() ?? '';
  const actionFilter = filter.action;
  const sourceFilter = filter.sourceKind;
  const onlyCommands = actionFilter !== undefined || sourceFilter !== undefined;

  const kept = rows.filter((row) => {
    if (onlyCommands && row.dimension !== 'command') return false;
    if (actionFilter !== undefined && row.action !== actionFilter) return false;
    if (sourceFilter !== undefined && row.sourceKind !== sourceFilter) return false;
    if (query && !rowMatchesQuery(row, query)) return false;
    return true;
  });

  // 子命令命中时保留其工具父行（层级可读）。
  if (kept.some((r) => r.depth === 2 && r.dimension === 'command')) {
    const childTools = new Set(
      kept
        .filter((r) => r.depth === 2 && r.dimension === 'command')
        .map((r) => r.label.split(' ')[0]),
    );
    for (const parent of rows) {
      if (parent.depth !== 1 || parent.dimension !== 'command') continue;
      if (childTools.has(parent.label) && !kept.includes(parent)) kept.push(parent);
    }
    kept.sort((a, b) => rows.indexOf(a) - rows.indexOf(b));
  }
  return kept;
}

// ---------------------------------------------------------------------------
// 顶层投影
// ---------------------------------------------------------------------------

/**
 * 纯投影：`ConnectTreeSnapshot` → `TreeRenderModel`。
 *
 * **不 mutate 输入**：所有数组/徽标均为复制；过滤只改展示集合（FR-V2-022）。
 */
export function buildTreeRows(
  snapshot: ConnectTreeSnapshot,
  filter: TreeFilter = {},
): TreeRenderModel {
  const dimensions = filter.dimension ? [filter.dimension] : [...TREE_GROUP_ORDER];
  let matches = 0;

  const groups: TreeGroupModel[] = dimensions.map((dimension) => {
    const all = rowsForDimension(dimension, snapshot);
    const rows = applyRowFilter(all, filter);
    matches += rows.length;
    const group = snapshot.groups.find((g) => g.dimension === dimension);
    return {
      dimension,
      label: group?.label ?? dimension,
      count: rows.length,
      rows,
      emptyHint: GROUP_EMPTY_HINT[dimension],
    };
  });

  return {
    header: { modelNote: TREE_MODEL_NOTE, noEscalationNote: TREE_NO_ESCALATION_NOTE },
    groups,
    filter: { query: filter.query?.trim() ?? '', matches },
    degradations: snapshot.meta.degradations.map((d) => ({
      dimension: d.dimension,
      code: d.code,
      text: d.text,
    })),
  };
}
