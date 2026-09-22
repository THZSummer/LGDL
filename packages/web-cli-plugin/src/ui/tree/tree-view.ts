/**
 * V2-2 连接树纯渲染模型（FR-V2-021/022/025；ADR-V2-011 / ADR-V2-013）。
 *
 * `buildTreeRows(snapshot, filter?)` 把 V2-1 的确定性 `ConnectTreeSnapshot` 投影为
 * **纯数据**的渲染模型（无 DOM、无 IO、无副作用、可 node 测试）。DOM 挂载一律在
 * `tree-drawer.ts`，本模块**不触扩展接口、不写 store、不渲染**。
 *
 * R2（ADR-V2-028/029/030/032）：渲染模型由「按维度分组的扁平 rows」改为**真父子层级树**
 * （消费 `snapshot.ownershipTree` 的纯派生归属树，`root.children` 逐层下钻）；命令行
 * 追加命令级 **allow/ask/deny 覆盖控件**（`command-policy`）与硬底线 `clampReason`
 * 可读文案。快照扁平面（`groups[].children`）**不改**（对账/确定性/parity 前提零变化）。
 *
 * 结构保证（R2 分层，ADR-V2-030；非文案承诺）：
 *   1. 命令**硬底线**（`overridable===false`）⇒ 该行 `controls === []`，并携带可读
 *      `clampReasonLabel`（evaluate / S1 / S3 / 破坏性 / ui·state·external 不放宽）；
 *   2. 命令**可覆盖**（`overridable===true`）⇒ 恰 3 个 `command-policy` 控件
 *      （allow/ask/deny；非硬底线 `deny` 亦有控件，可改回）；
 *   3. 静态权限节点 `controls` **永不**含 `revoke`（并携带 `revokeHint` 如实披露
 *      「不可逐项撤销」）；
 *   4. 可选能力仅在 `granted===true` 时给 `revoke` 控件（未授予时不渲染「假撤销」）。
 *
 * 过滤（FR-V2-022）为**纯只读**：只筛选展示集合（保留命中节点的祖先链），绝不 mutate
 * 快照或授权状态。
 */
import type { PolicyAction } from '@lgdl/web-cli-base';
import { OPTIONAL_CAPABILITY_TOOL, type OptionalCapability } from '../../platform/capability-permissions.js';
import {
  type CrossRefTarget,
  type OwnershipNode,
  type OwnershipNodeKind,
} from '../../insight/ownership-tree.js';
import {
  type Badge,
  type CapabilityNode,
  type ClampReason,
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
// 钉死文案（FR-V2-025 / FR-V2-078 / FR-V2-010）
// ---------------------------------------------------------------------------

/**
 * R2：如实声明「按归属的真层级树 + 多归属主链 + 交叉引用徽标（不复制节点）」
 * （恒含于 `header.modelNote`；ADR-V2-032）。
 */
export const TREE_MODEL_NOTE =
  '按归属的层级树：以「连接树」为根，按主归属逐层下钻（授权的站点 / 支持的命令 / 浏览器能力 / LLM 连接）；' +
  '多归属以交叉引用徽标表达（「亦被 N 处引用（面）」），同一节点不复制。';

/**
 * 「不是提权面」声明（恒含于 `header.noEscalationNote`）。
 *
 * 两通路（ADR-V2-032）：撤销/关断 = 收紧；命令级覆盖 = 显式/被审计的放宽但硬底线不可覆盖。
 * `delay`（= `deny`，fail-closed）与命令间 `delayMs` 是**两回事**：前者是处置档位
 * （不可放宽），后者是命令间隔毫秒数；此处并标以免误读（FR-V2-054）。
 */
export const TREE_NO_ESCALATION_NOTE =
  '连接树是「可见 + 撤销 + 受硬底线约束的命令级覆盖」面，不是提权面：' +
  '撤销/关断 = 回到更保守，不放宽任何门禁；' +
  '命令级覆盖 = 用户显式、被审计的放宽，但硬底线不可覆盖（经 clamp）。' +
  '命令档位 delay（= deny，fail-closed，非可配置档位；与命令间 delayMs 无关）不可放宽；' +
  '硬底线 deny/delay 节点不提供任何开关（并展示不可覆盖原因），非硬底线命令节点可在树内设置 allow/ask/deny。';

/**
 * FR-ALLN-086⑤ / ADR-V5-006 §2⑤（v5-3 review R1 **BLOCK-01** 修复）— the L2 站点行文案是
 * 一个**指针**，不是授权状态值。授权态的唯一常显载体是状态栏 chip（`#auth-state`），
 * 台账（L2 树视图）只指向它、**不复制状态值**。
 *
 * Single source: the row's `sublabel` and the drawer's runtime note both read this constant,
 * so the pointer cannot drift into a second value copy.
 */
export const TREE_AUTH_POINTER_NOTE = '授权状态见状态栏授权 chip（本台账不复制状态值）';

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

/**
 * R2：硬底线 clamp 原因的可读文案（FR-V2-077；ADR-V2-030）。
 *
 * 仅在 `overridable===false` 的行渲染为 `.tree-clamp-reason`（原因可读；零控件）。
 */
export const CLAMP_REASON_LABEL: Readonly<Record<ClampReason, string>> = {
  evaluate: 'evaluate 硬底线：永不执行、永不自动放行（不可覆盖）',
  's1-unauthorized': 'S1 未授权站点：授权前不可覆盖（授权后仍需按 risk 档判定）',
  's3-unknown-risk': 'S3 未知/非法 risk：fail-closed deny（不可覆盖）',
  'destructive-floor': '破坏性操作保底 ask：允许收紧（ask/deny），不允许放宽为 allow',
  'ui-no-widen': 'ui 档（如 dom click）：只可收紧不可放宽（allow 会被 clamp 回基线）',
  'state-no-widen': 'state 档（如剪贴板读取）：只可收紧不可放宽',
  'external-no-widen': 'external 档：只可收紧不可放宽',
};

/** V2-3 动作目标（作用对象）；与 `TreeActionRequest.target` 同形。 */
export interface TreeActionTarget {
  origin?: string;
  capability?: OptionalCapability;
  scope?: 'read' | 'write';
  enabled?: boolean;
  groupId?: string;
  /** R2：命令级覆盖的作用对象（工具级 / 子命令级）。 */
  command?: { tool: string; subcommand?: string };
  /** R2：`set-command-policy` 的目标处置档。 */
  policyAction?: PolicyAction;
  /** R2：该命令的**默认档**（用于判定「放宽方向」→ 是否需要二次确认）。 */
  defaultAction?: PolicyAction;
  /** R2：`reset-command-policy` 是否清除全部覆盖。 */
  resetAll?: boolean;
}

/** 可选能力 → 对应 LLM 工具名（回执 ② 实测对账用）。 */
function toolOfCapability(capability: OptionalCapability): string {
  return OPTIONAL_CAPABILITY_TOOL[capability];
}

// ---------------------------------------------------------------------------
// 渲染模型类型（R2：真父子层级）
// ---------------------------------------------------------------------------

/**
 * 渲染节点（R2）。
 *
 * `children` 为真父子层级（根 → 面 → 站点/来源分组 → 工具 → 子命令）；`depth` = aria level。
 */
export interface TreeRow {
  /** 归属树节点 id（全树唯一）。 */
  id: string;
  /** 快照稳定键（face/group/root 无；命令/site/capability/LLM/session 有）。 */
  nodeId?: string;
  kind: OwnershipNodeKind;
  /** aria level（根 = 0）。 */
  depth: number;
  /** 主归属面（根为 `root`）。 */
  dimension: Dimension | 'root';
  label: string;
  sublabel?: string;
  badges: Badge[];
  /** 结构保证：硬底线命令恒为 `[]`；静态权限永不含 `revoke`。 */
  controls: ControlDescriptor[];
  /** 静态权限「不可逐项撤销」的如实披露（仅静态权限节点携带）。 */
  revokeHint?: string;
  /** 维度为空 / 过滤无命中时的可读提示（face 节点携带）。 */
  emptyHint?: string;
  /** 跨层引用（展示用标签，不复制节点）。 */
  crossRefs: string[];
  /** R2 修复轮（A2）：出站交叉引用（可交互下钻到目标节点主归属位置）。 */
  crossTargets: CrossRefTarget[];
  /** 命令行：**生效**处置档（effective；filter 口径）。 */
  action?: PolicyAction;
  /** 命令行：来源分类。 */
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
  /** R2：默认 risk 档（分列展示）。 */
  defaultAction?: PolicyAction;
  /** R2：用户覆盖（原始设置值）。 */
  overrideAction?: PolicyAction;
  /** R2：经 clamp 后的生效档。 */
  effectiveAction?: PolicyAction;
  /** R2：是否可被用户在树内覆盖（硬底线 `false`）。 */
  overridable?: boolean;
  /**
   * R2 修复轮（A1）：只可收紧档（`ui`/`state`/`external`/破坏性写）。
   * `tightenOnly===true` ⇒ 节点级 `ask`/`deny` 两档控件（**无 `allow`**）+ `clampReasonLabel`。
   */
  tightenOnly?: boolean;
  /** R2：不可覆盖原因（硬底线可读）。 */
  clampReason?: ClampReason;
  /** R2：不可覆盖原因可读文案（`.tree-clamp-reason`）。 */
  clampReasonLabel?: string;
  /** R2：本节点自身是否命中当前过滤（纯只读）。 */
  matches: boolean;
  /** 真父子层级子节点。 */
  children: TreeRow[];
}

export interface TreeFilter {
  dimension?: Dimension;
  query?: string;
  action?: PolicyAction;
  sourceKind?: SourceKind;
}

export interface TreeRenderModel {
  header: { modelNote: string; noEscalationNote: string };
  /** 真层级树根（`连接树`）。 */
  root: TreeRow;
  /** 前序扁平节点（含 root；计数/断言用，纯派生）。 */
  nodes: TreeRow[];
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
 *
 * 不可逆/高影响 → `true`；可逆开关 → `false`。拒绝即零操作（fail-closed）。
 *
 * R2（ADR-V2-027 扩展）：命令级覆盖是**条件确认**——只有「放宽方向」
 * （desired `allow` 且相对默认档是放宽）需要二次确认；收紧（`ask`/`deny`）与
 * `reset-command-policy`（可逆）不需要。条件判定见 {@link commandPolicyNeedsConfirmation}。
 */
export function needsConfirmation(actionId: TreeActionId): boolean {
  if (actionId === 'set-command-policy' || actionId === 'reset-command-policy') return false;
  if (CONFIRM_NOT_REQUIRED.has(actionId)) return false;
  return CONFIRM_REQUIRED.has(actionId);
}

/**
 * R2：命令级覆盖是否命中「放宽方向」（需二次确认，fail-closed）。
 *
 * 判据：desired = `allow` 且默认档不是 `allow`（缺省默认档视为放宽 → 需确认）。
 * `ask`/`deny` 属收紧方向，不需确认（可逆、可恢复默认）。
 */
export function commandPolicyNeedsConfirmation(
  desired: PolicyAction | undefined,
  defaultAction: PolicyAction | undefined,
): boolean {
  if (desired !== 'allow') return false;
  return defaultAction !== 'allow';
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
  'set-command-policy': {
    consequence: '该命令的处置档被放宽为 allow（用户显式、被审计的放宽；硬底线仍不可覆盖）',
    irreversible: '可恢复默认（树内「恢复默认」），恢复后回到默认 risk 档；覆盖写入有审计记录',
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
// 控件结构保证（R2 分层，ADR-V2-030）
// ---------------------------------------------------------------------------

/**
 * 命令行控件（R2 分层；R2 修复轮 A1 补齐叶子层收紧入口）：
 *   - 硬底线（evaluate / S1 / S3）⇒ `[]`（零控件；原因由 `clampReasonLabel` 可读）；
 *   - 只可收紧（`ui`/`state`/`external`/破坏性写）⇒ `ask`/`deny` 两档（**结构上过滤掉 `allow`**）；
 *   - 可覆盖 ⇒ 该节点恰 3 个 `command-policy` 控件（allow/ask/deny）。
 */
function commandControls(node: CommandNode): ControlDescriptor[] {
  const policy = node.controls.filter((c) => c.kind === 'command-policy');
  if (node.overridable === true) return policy;
  if (node.tightenOnly === true) return policy.filter((c) => c.policyAction !== 'allow');
  return [];
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
// 行构造（R2：消费归属树 + 快照节点真值）
// ---------------------------------------------------------------------------

/** 归属树节点 → 快照节点查找表（按稳定键）。 */
interface SnapshotIndex {
  sites: Map<string, SiteNode>;
  capabilities: Map<string, CapabilityNode>;
  commands: Map<string, CommandNode>;
  llm: Map<string, { label: string; configured: boolean; badges: Badge[]; crossRefs: string[] }>;
  sessions: Map<string, { label: string; origins: string[]; badges: Badge[]; crossRefs: string[] }>;
}

function buildIndex(snapshot: ConnectTreeSnapshot): SnapshotIndex {
  const sites = new Map<string, SiteNode>();
  const capabilities = new Map<string, CapabilityNode>();
  const commands = new Map<string, CommandNode>();
  const llm = new Map<string, { label: string; configured: boolean; badges: Badge[]; crossRefs: string[] }>();
  const sessions = new Map<string, { label: string; origins: string[]; badges: Badge[]; crossRefs: string[] }>();
  for (const group of snapshot.groups) {
    if (group.dimension === 'site') for (const n of group.children as SiteNode[]) sites.set(n.id, n);
    if (group.dimension === 'capability') for (const n of group.children as CapabilityNode[]) capabilities.set(n.id, n);
    if (group.dimension === 'command') for (const n of group.children as CommandNode[]) commands.set(n.id, n);
    if (group.dimension === 'llm') {
      for (const n of group.children as {
        id: string;
        providerName: string;
        model: string;
        configured: boolean;
        badges: Badge[];
        crossLinks: { label: string }[];
        sessions?: { id: string; label: string; origins: string[]; badges: Badge[]; crossLinks: { label: string }[] }[];
      }[]) {
        llm.set(n.id, {
          label: n.configured ? `${n.providerName || '已配置'}${n.model ? ` · ${n.model}` : ''}` : '未配置 LLM',
          configured: n.configured === true,
          badges: [...n.badges],
          crossRefs: n.crossLinks.map((l) => l.label),
        });
        for (const s of n.sessions ?? []) {
          sessions.set(s.id, { label: s.label, origins: [...s.origins], badges: [...s.badges], crossRefs: s.crossLinks.map((l) => l.label) });
        }
      }
    }
  }
  return { sites, capabilities, commands, llm, sessions };
}

function commandLabel(node: CommandNode): string {
  return node.subcommand ? `${node.name} ${node.subcommand}` : node.name;
}

/** 命令行 → 渲染节点（R2：默认/生效分列 + 硬底线 clamp 原因 + 分层控件）。 */
function commandRow(node: CommandNode, ownership: OwnershipNode): TreeRow {
  const causeLabel = node.denyCause ? DENY_CAUSE_LABEL[node.denyCause] : undefined;
  const overrideNote = node.overrideAction ? ` · 覆盖 ${node.overrideAction}` : '';
  const sublabel =
    `来源 ${SOURCE_KIND_LABEL[node.sourceKind]}（${node.sourceKind}）` +
    ` · 命令间隔 delayMs=${node.delayMs}ms（与 delay 档无关）` +
    ` · 默认档 ${node.defaultAction} · 生效档 ${node.effectiveAction}${overrideNote}` +
    (causeLabel ? ` · 成因 ${causeLabel}` : '');
  return {
    id: ownership.id,
    nodeId: node.id,
    kind: 'command',
    depth: ownership.ariaLevel,
    dimension: ownership.mainOwner === 'root' ? 'command' : ownership.mainOwner,
    label: commandLabel(node),
    sublabel,
    badges: [...node.badges],
    controls: commandControls(node),
    crossRefs: [...ownership.crossRefLabels],
    crossTargets: [...ownership.crossTargets],
    action: node.effectiveAction,
    sourceKind: node.sourceKind,
    ...(node.denyCause ? { denyCause: node.denyCause } : {}),
    ...(causeLabel ? { denyCauseLabel: causeLabel } : {}),
    actionTarget: {
      command: { tool: node.name, ...(node.subcommand ? { subcommand: node.subcommand } : {}) },
      defaultAction: node.defaultAction,
    },
    defaultAction: node.defaultAction,
    ...(node.overrideAction ? { overrideAction: node.overrideAction } : {}),
    effectiveAction: node.effectiveAction,
    overridable: node.overridable === true,
    ...(node.tightenOnly === true ? { tightenOnly: true } : {}),
    ...(node.clampReason ? { clampReason: node.clampReason } : {}),
    ...(node.clampReason ? { clampReasonLabel: CLAMP_REASON_LABEL[node.clampReason] } : {}),
    matches: false,
    children: [],
  };
}

/** face/group/root 等结构性节点 → 渲染节点（无控件；face 携带可读空态提示）。 */
function structuralRow(ownership: OwnershipNode, dimension: Dimension | 'root'): TreeRow {
  const faceDimension = ownership.kind === 'face' ? (ownership.mainOwner as Dimension) : undefined;
  return {
    id: ownership.id,
    ...(ownership.nodeId ? { nodeId: ownership.nodeId } : {}),
    kind: ownership.kind,
    depth: ownership.ariaLevel,
    dimension,
    label: ownership.label,
    badges: [],
    controls: [],
    crossRefs: [...ownership.crossRefLabels],
    crossTargets: [...ownership.crossTargets],
    ...(ownership.kind === 'face' && faceDimension ? { emptyHint: GROUP_EMPTY_HINT[faceDimension] } : {}),
    matches: false,
    children: [],
  };
}

function renderOwnershipNode(ownership: OwnershipNode, index: SnapshotIndex): TreeRow {
  const dimension: Dimension | 'root' = ownership.mainOwner === 'root' ? 'root' : ownership.mainOwner;
  const children = ownership.children.map((child) => renderOwnershipNode(child, index));

  if (ownership.kind === 'command' && ownership.nodeId) {
    const node = index.commands.get(ownership.nodeId);
    if (node) return { ...commandRow(node, ownership), children };
  }
  if (ownership.kind === 'site' && ownership.nodeId) {
    const node = index.sites.get(ownership.nodeId);
    if (node) {
      const tools = siteActionTools(node);
      return {
        ...structuralRow(ownership, 'site'),
        label: `站点 ${node.origin}`,
        // FR-ALLN-086⑤ (R1 BLOCK-01): pointer, never `node.authorized ? '已授权站点…' : …`.
        sublabel: TREE_AUTH_POINTER_NOTE,
        badges: [...node.badges],
        controls: siteControls(node),
        revocable: node.revocable,
        ...(node.authorized ? { actionTarget: { origin: node.origin } } : {}),
        ...(tools.length > 0 ? { actionTool: tools } : {}),
        children,
      };
    }
  }
  if (ownership.kind === 'capability' && ownership.nodeId) {
    const node = index.capabilities.get(ownership.nodeId);
    if (node) {
      const sourceLabel =
        node.source === 'static' ? '静态权限' : node.source === 'optional' ? '可选能力' : '隐私开关';
      const scope = node.scope ? ` · ${node.scope === 'read' ? '读取' : '写入'}` : '';
      const controls = capabilityControls(node);
      const actionTool = capabilityActionTool(node);
      const actionTarget = controls.length > 0 ? capabilityTarget(node, controls[0]) : undefined;
      return {
        ...structuralRow(ownership, 'capability'),
        label: node.label,
        sublabel: `${sourceLabel}${scope} · ${node.granted ? '已授予/已开启' : '未授予/已关闭'}`,
        badges: [...node.badges],
        controls,
        ...(node.revokeHint ? { revokeHint: node.revokeHint } : {}),
        revocable: node.revocable,
        ...(actionTarget ? { actionTarget } : {}),
        ...(actionTool ? { actionTool } : {}),
        children,
      };
    }
  }
  if (ownership.kind === 'llm' && ownership.nodeId) {
    const node = index.llm.get(ownership.nodeId);
    if (node) {
      return {
        ...structuralRow(ownership, 'llm'),
        label: node.label,
        sublabel: node.configured ? '已配置（不显示 key）' : '未配置：在设置页填入 API Key 后可用（树内不改绑）',
        badges: [...node.badges],
        crossRefs: [...node.crossRefs],
        children,
      };
    }
  }
  if (ownership.kind === 'session' && ownership.nodeId) {
    const node = index.sessions.get(ownership.nodeId);
    if (node) {
      return {
        ...structuralRow(ownership, 'llm'),
        label: node.label,
        sublabel: `会话 · ${node.origins.length} 个来源站点`,
        badges: [...node.badges],
        crossRefs: [...node.crossRefs],
        children,
      };
    }
  }
  return { ...structuralRow(ownership, dimension), children };
}

// ---------------------------------------------------------------------------
// 过滤（纯只读；保留命中节点的祖先链）
// ---------------------------------------------------------------------------

function rowQueryHit(row: TreeRow, query: string): boolean {
  const haystack = `${row.label} ${row.sublabel ?? ''} ${row.id}`.toLowerCase();
  return haystack.includes(query);
}

interface FilterPlan {
  active: boolean;
  dimension?: Dimension;
  query: string;
  action?: PolicyAction;
  sourceKind?: SourceKind;
}

function planOf(filter: TreeFilter): FilterPlan {
  const query = filter.query?.trim().toLowerCase() ?? '';
  const action = filter.action;
  const sourceKind = filter.sourceKind;
  return {
    active: Boolean(filter.dimension) || query.length > 0 || action !== undefined || sourceKind !== undefined,
    ...(filter.dimension ? { dimension: filter.dimension } : {}),
    query,
    ...(action !== undefined ? { action } : {}),
    ...(sourceKind !== undefined ? { sourceKind } : {}),
  };
}

/** 节点自身是否命中（结构过滤 vs 内容过滤）。 */
function selfHit(row: TreeRow, plan: FilterPlan): boolean {
  const contentFilter = plan.query.length > 0 || plan.action !== undefined || plan.sourceKind !== undefined;
  if (!contentFilter) {
    // 仅按维度 / 无过滤：非空树整体“命中”（用于 matches 计数口径）。
    if (plan.dimension && row.kind === 'face') return row.dimension === plan.dimension;
    if (!plan.dimension) return row.kind !== 'root';
    return row.kind !== 'root' && row.kind !== 'face';
  }
  if (plan.action !== undefined || plan.sourceKind !== undefined) {
    if (row.kind !== 'command') return false;
    if (plan.action !== undefined && row.action !== plan.action) return false;
    if (plan.sourceKind !== undefined && row.sourceKind !== plan.sourceKind) return false;
    return true;
  }
  return rowQueryHit(row, plan.query);
}

interface PruneResult {
  hit: boolean;
  node?: TreeRow;
}

/** 纯只读剪枝：内容过滤保留命中 + 其祖先链；维度过滤只保留目标面；无过滤全保留。 */
function pruneTree(row: TreeRow, plan: FilterPlan): PruneResult {
  // 维度过滤：非目标 face 整支剪掉。
  if (plan.dimension && row.kind === 'face' && row.dimension !== plan.dimension) {
    return { hit: false };
  }
  const childResults = row.children.map((c) => pruneTree(c, plan));
  const keptChildren = childResults.map((r) => r.node).filter((n): n is TreeRow => n !== undefined);
  const hit = selfHit(row, plan);
  const contentMode = plan.query.length > 0 || plan.action !== undefined || plan.sourceKind !== undefined;
  if (!plan.active || !contentMode || row.kind === 'root') {
    // 无过滤 / 仅维度过滤 / 根：保留骨架（children 已按维度剪枝）。
    const kept = row.kind === 'root' ? true : !plan.dimension || keptChildren.length > 0 || hit || row.kind !== 'face';
    return { hit, node: kept ? { ...row, matches: hit, children: keptChildren } : undefined };
  }
  const kept = hit || keptChildren.length > 0;
  return { hit, node: kept ? { ...row, matches: hit, children: keptChildren } : undefined };
}

function flatten(row: TreeRow, out: TreeRow[] = []): TreeRow[] {
  out.push(row);
  for (const child of row.children) flatten(child, out);
  return out;
}

// ---------------------------------------------------------------------------
// 顶层投影
// ---------------------------------------------------------------------------

/**
 * 纯投影：`ConnectTreeSnapshot` → `TreeRenderModel`（R2 真层级树）。
 *
 * **不 mutate 输入**：所有数组/徽标均为复制；过滤只改展示集合（FR-V2-022）。
 */
export function buildTreeRows(
  snapshot: ConnectTreeSnapshot,
  filter: TreeFilter = {},
): TreeRenderModel {
  const index = buildIndex(snapshot);
  const full = renderOwnershipNode(snapshot.ownershipTree.root, index);
  const plan = planOf(filter);
  const pruned = pruneTree(full, plan);
  const root = pruned.node ?? { ...full, children: [] };
  const nodes = flatten(root);
  const matches = plan.active ? nodes.filter((n) => n.matches).length : nodes.length;

  return {
    header: { modelNote: TREE_MODEL_NOTE, noEscalationNote: TREE_NO_ESCALATION_NOTE },
    root,
    nodes,
    filter: { query: filter.query?.trim() ?? '', matches },
    degradations: snapshot.meta.degradations.map((d) => ({
      dimension: d.dimension,
      code: d.code,
      text: d.text,
    })),
  };
}

/** 前序扁平节点（含 root；计数/断言用，纯派生）。 */
export function collectTreeRows(model: TreeRenderModel): TreeRow[] {
  return flatten(model.root);
}
