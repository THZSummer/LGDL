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
import { OPTIONAL_CAPABILITY_TOOL, type OptionalCapability } from '../../platform/capability-permissions.js';
import {
  type Badge,
  type CapabilityNode,
  type CommandNode,
  type ConnectTreeSnapshot,
  type ControlDescriptor,
  type Dimension,
  type DenyCause,
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

/**
 * `deny` 四成因的可读标注（FR-V2-051 前置；ADR-V2-011）。
 *
 * 与 V2-1 `DenyCause` 一一对应：S1 未授权 / S3 未知或非法 risk / evaluate 硬底线 /
 * 自动授权 hardDeny（预留——V2-3 只展示，绝不提供任何「放宽/覆盖」控件）。
 */
export const DENY_CAUSE_LABEL: Readonly<Record<DenyCause, string>> = {
  's1-unauthorized': 'S1 未授权站点：工具被 deny（授权后仍需按 risk 档判定）',
  's3-unknown-risk': 'S3 未知/非法 risk：fail-closed deny（不可放行）',
  'evaluate-floor': 'evaluate 硬底线：永不执行、永不自动放行',
  'auto-hardDeny': '自动授权硬底线：永不自动放行（直接拒绝）',
};

/** V2-3 动作目标（作用对象）；与 `TreeActionRequest.target` 同形。 */
export interface TreeActionTarget {
  origin?: string;
  capability?: OptionalCapability;
  scope?: 'read' | 'write';
  enabled?: boolean;
  groupId?: string;
}

/** 可选能力 → 对应 LLM 工具名（回执 ② 实测对账用）。 */
function toolOfCapability(capability: OptionalCapability): string {
  return OPTIONAL_CAPABILITY_TOOL[capability];
}

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
  /** 命令行：`deny` 成因（S1/S3/evaluate/auto-hardDeny）。 */
  denyCause?: DenyCause;
  /** 命令行：`deny` 成因可读文案。 */
  denyCauseLabel?: string;
  /** 能力行：未授予（可选能力）/ 不可撤销（静态权限）的展示标记。 */
  revocable?: boolean;
  /** V2-3：控件携带的动作目标（撤销/关断的作用对象）。 */
  actionTarget?: TreeActionTarget;
  /** V2-3：动作影响的工具名（回执 ② 实测对账；P1 动作缺省）。 */
  actionTool?: string;
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
// 二次确认摘要（ADR-V2-013；作用对象 + 后果 + 不可逆说明）
// ---------------------------------------------------------------------------

/** 每个需确认动作的「后果」与「不可逆说明」（纯文案，不含任何明文材料）。 */
const CONFIRM_TEXT: Readonly<Record<string, { consequence: string; irreversible: string }>> = {
  'revoke-origin': {
    consequence: '该站点授权被取消，其声明工具将即时移出 LLM 工具面（回到更保守，不放宽任何门禁）',
    irreversible: '不可逆（可重新授权），且重新授权需要用户手势；树内只做撤销、不授予权限',
  },
  'revoke-capability': {
    consequence: '该可选能力权限被移除，对应工具即时移出 LLM 工具面',
    irreversible: '不可逆（可重新授予），移除后需重新授予权限才会恢复',
  },
  'clear-auto-auth': {
    consequence: '该站点的「读/写自动授权」都关断，下一次同档位调用恢复人工二次确认',
    irreversible: '可重新开启；不影响站点授权本身（授权与自动授权是独立维度）',
  },
  'disconnect-llm': {
    consequence: '清除已保存的 LLM 配置（含密钥）；树内不回显任何密钥材料',
    irreversible: '不可逆，需在设置页重新填入配置',
  },
  'dissolve-group': {
    consequence: '解散该会话组（分组只共享对话，不代表互相授权）',
    irreversible: '不可逆；不触及任何站点授权',
  },
};

export interface TreeConfirmSummary {
  actionId: TreeActionId;
  /** 作用对象（可读）。 */
  target: string;
  /** 后果（可读）。 */
  consequence: string;
  /** 不可逆 / 影响说明（可读）。 */
  irreversible: string;
  /** 合并展示文本：恒含「作用对象 + 后果 + 不可逆说明」三段。 */
  text: string;
}

/**
 * 生成二次确认摘要（纯函数）。拒绝即零操作（fail-closed，见 `tree-ops`）。
 */
export function confirmationSummary(actionId: TreeActionId, targetText: string): TreeConfirmSummary {
  const known = CONFIRM_TEXT[actionId] ?? {
    consequence: '该操作会改变连接状态（回到更保守，不放宽任何门禁）',
    irreversible: '请确认后再执行；拒绝则零操作',
  };
  const target = targetText.trim() || '（未指定对象）';
  return {
    actionId,
    target,
    consequence: known.consequence,
    irreversible: known.irreversible,
    text: `作用对象：${target}；后果：${known.consequence}；不可逆说明：${known.irreversible}`,
  };
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

/**
 * 站点行控件：仅已授权站点可「撤销授权」（V2-2），并在其上追加 V2-3 的
 * 「关闭该站点自动授权」控件（FR-V2-033；分维：撤销自动授权 ≠ 撤销站点授权）。
 */
function siteControls(node: SiteNode): ControlDescriptor[] {
  if (!node.authorized) return [];
  const revoke = node.controls.filter((c) => c.kind === 'revoke');
  return [
    ...revoke,
    {
      kind: 'toggle',
      actionId: 'clear-auto-auth',
      label: '关闭该站点自动授权（读/写都关；不等于撤销站点授权）',
    },
  ];
}

/** 站点声明工具名（来自 V2-1 反向跨层引用 `cmd:<name>[#<sub>]`，去重排序）。 */
function siteActionTools(node: SiteNode): string {
  const names = new Set<string>();
  for (const link of node.crossLinks) {
    if (link.kind !== 'tool') continue;
    // Reverse site links carry the command id in `to` (forward command→site links
    // carry it in `from`); accept either so the extraction is shape-robust.
    const cmdId = link.to.startsWith('cmd:') ? link.to : link.from.startsWith('cmd:') ? link.from : '';
    if (!cmdId) continue;
    const raw = cmdId.slice('cmd:'.length);
    const name = raw.split('#')[0] ?? raw;
    if (name.length > 0) names.add(name);
  }
  return [...names].sort().join('、');
}

/** 能力行/开关键行对应的工具名（回执 ② 实测对账）。 */
function capabilityActionTool(node: CapabilityNode): string | undefined {
  if (node.source === 'optional' && node.capability) return toolOfCapability(node.capability);
  if (node.source === 'toggle') {
    if (node.capability) return toolOfCapability(node.capability);
    return node.permission === 'tabs' ? 'tabs' : undefined;
  }
  return undefined;
}

/** 能力行动作目标：可选能力撤销 / 开关翻转（`enabled` = 翻转后的目标态）。 */
function capabilityTarget(node: CapabilityNode, control: ControlDescriptor): TreeActionTarget | undefined {
  if (control.actionId === 'revoke-capability' && node.capability) return { capability: node.capability };
  if (control.actionId === 'set-capability-toggle') {
    return {
      ...(node.capability ? { capability: node.capability } : {}),
      ...(node.scope ? { scope: node.scope } : {}),
      enabled: !node.enabled,
    };
  }
  if (control.actionId === 'set-tabs-toggle') return { enabled: !node.enabled };
  return undefined;
}

// ---------------------------------------------------------------------------
// 行构造
// ---------------------------------------------------------------------------

function crossRefsOf(node: { crossLinks: { label: string }[] }): string[] {
  return node.crossLinks.map((l) => l.label);
}

function siteRow(node: SiteNode): TreeRow {
  const tools = siteActionTools(node);
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
    ...(node.authorized ? { actionTarget: { origin: node.origin } } : {}),
    ...(tools.length > 0 ? { actionTool: tools } : {}),
  };
}

function capabilityRow(node: CapabilityNode): TreeRow {
  const sourceLabel =
    node.source === 'static' ? '静态权限' : node.source === 'optional' ? '可选能力' : '隐私开关';
  const scope = node.scope ? ` · ${node.scope === 'read' ? '读取' : '写入'}` : '';
  const controls = capabilityControls(node);
  const actionTool = capabilityActionTool(node);
  const actionTarget = controls.length > 0 ? capabilityTarget(node, controls[0]) : undefined;
  return {
    id: node.id,
    depth: 1,
    dimension: 'capability',
    label: node.label,
    sublabel: `${sourceLabel}${scope} · ${node.granted ? '已授予/已开启' : '未授予/已关闭'}`,
    badges: [...node.badges],
    controls,
    ...(node.revokeHint ? { revokeHint: node.revokeHint } : {}),
    crossRefs: crossRefsOf(node),
    revocable: node.revocable,
    ...(actionTarget ? { actionTarget } : {}),
    ...(actionTool ? { actionTool } : {}),
  };
}

function commandRow(node: CommandNode): TreeRow {
  const label = node.subcommand ? `${node.name} ${node.subcommand}` : node.name;
  const causeLabel = node.denyCause ? DENY_CAUSE_LABEL[node.denyCause] : undefined;
  const sublabel =
    `来源 ${SOURCE_KIND_LABEL[node.sourceKind]}（${node.sourceKind}）` +
    ` · 命令间隔 delayMs=${node.delayMs}ms（与 delay 档无关）` +
    ` · 处置 ${node.action}` +
    (causeLabel ? ` · 成因 ${causeLabel}` : '');
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
    ...(node.denyCause ? { denyCause: node.denyCause } : {}),
    ...(causeLabel ? { denyCauseLabel: causeLabel } : {}),
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
