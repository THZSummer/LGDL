/**
 * V2-1「连接树」数据模型（ADR-V2-001 / ADR-V2-002 / ADR-V2-003 / ADR-V2-011 / ADR-V2-012）。
 *
 * 纯类型 + 纯 helper：**零 IO、零 chrome 接口、零写 store、零明文**。四维度（站点 /
 * 能力 / 命令 / LLM）聚合为**单一可投影快照** `ConnectTreeSnapshot`（四层分组森林，
 * 非严格单树）。本模块只被 `src/insight/**` 与 node 测试消费。
 *
 * 确定性（ADR-V2-002）：
 *   - 命名空间**稳定键**（`site:` / `cap:static:` / `cap:opt:` / `toggle:` / `cmd:` /
 *     `llm:` / `session:` / `link:<from>→<to>`）；
 *   - `stableStringify`（键字典序）+ 纯 FNV-1a 哈希 → `meta.hash`；
 *   - `builtAt` **不进入** hash 输入（两次投影 hash 全等）。
 *
 * V2-4 预留位（ADR-V2-012）：`CommandNode.cardId` / `denyCause` / `sourceKind` /
 * `suppressed`，`snapshot.facets` / `catalogMeta?` / `version`。V2-4 落地时**零模型改动**。
 */
import type { PolicyAction, ToolRisk } from '@lgdl/web-cli-base';
import type { OptionalCapability } from '../platform/capability-permissions.js';

// ---------------------------------------------------------------------------
// 基础枚举 / 徽标 / 跨层引用
// ---------------------------------------------------------------------------

/** 四个并列分组维度（固定序：站点 → 能力 → 命令 → LLM）。 */
export type Dimension = 'site' | 'capability' | 'command' | 'llm';

/** 固定分组顺序（ADR-V2-001：四层分组，森林）。 */
export const INSIGHT_DIMENSIONS: readonly Dimension[] = ['site', 'capability', 'command', 'llm'];

/** 徽标视觉语义（渲染层消费；本层只给语义与文案）。 */
export type BadgeTone = 'ok' | 'warn' | 'danger' | 'muted';

export type BadgeKind =
  | 'authorized'
  | 'unauthorized'
  | 'revocable'
  | 'granted'
  | 'not-granted'
  | 'action-allow'
  | 'action-ask'
  | 'action-deny'
  | 'suppressed'
  | 'hard-deny'
  | 'trusted'
  | 'untrusted'
  | 'configured'
  | 'not-configured'
  | 'enabled'
  | 'disabled';

export interface Badge {
  kind: BadgeKind;
  label: string;
  tone: BadgeTone;
}

/** 跨层引用类型（ADR-V2-003：多对多关系显式表达，不复制节点）。 */
export type CrossLinkKind = 'origin' | 'permission' | 'tool' | 'session';

export interface CrossLink {
  /** 稳定键：`link:<from>→<to>`。 */
  id: string;
  from: string;
  to: string;
  kind: CrossLinkKind;
  label: string;
}

// ---------------------------------------------------------------------------
// 命令档位成因 / 来源 / 动作控件（ADR-V2-011 / ADR-V2-012 / ADR-V2-014）
// ---------------------------------------------------------------------------

/** `deny` 的四种成因（V2-4 预留位；FR-V2-051 前置）。 */
export type DenyCause = 's1-unauthorized' | 's3-unknown-risk' | 'evaluate-floor' | 'auto-hardDeny';

/** 命令来源分类（8 值；V2-4 预留位，FR-V2-055 前置）。 */
export type SourceKind =
  | 'site-declared'
  | 'plugin-admin'
  | 'plugin-tabs'
  | 'plugin-bookmarks'
  | 'plugin-downloads'
  | 'plugin-notify'
  | 'plugin-clipboard'
  | 'base-builtin';

/** V2-3 动作白名单（本层只作类型引用；V2-1 不执行任何动作）。 */
export type TreeActionId =
  | 'revoke-origin'
  | 'revoke-capability'
  | 'set-capability-toggle'
  | 'set-tabs-toggle'
  | 'clear-auto-auth'
  | 'disconnect-llm'
  | 'dissolve-group';

export type ControlKind = 'revoke' | 'toggle' | 'disconnect' | 'confirm-action' | 'none';

export interface ControlDescriptor {
  kind: ControlKind;
  actionId?: TreeActionId;
  label: string;
}

// ---------------------------------------------------------------------------
// 节点
// ---------------------------------------------------------------------------

export interface SiteNode {
  id: string;
  kind: 'site';
  origin: string;
  label: string;
  authorized: boolean;
  trust: 'untrusted' | 'trusted';
  authorizedAt?: number;
  updatedAt: number;
  /** 「可取消授权」态仅在 `authorized===true`（FR-V2-011）。 */
  revocable: true;
  badges: Badge[];
  crossLinks: CrossLink[];
  controls: ControlDescriptor[];
}

export interface CapabilityNode {
  id: string;
  kind: 'capability';
  source: 'static' | 'optional' | 'toggle';
  capability?: OptionalCapability;
  scope?: 'read' | 'write';
  permission: string;
  /** 依赖的 Chrome 权限（ADR-V2-003：能力 → 权限以引用表达，不复制节点）。 */
  permissionRefs: string[];
  label: string;
  granted: boolean;
  enabled: boolean;
  /** 静态权限恒 `false`（ADR-V2-011）。 */
  revocable: boolean;
  revokeHint?: string;
  badges: Badge[];
  crossLinks: CrossLink[];
  controls: ControlDescriptor[];
}

export interface CommandNode {
  id: string;
  kind: 'command';
  /** V2-4 预留：档案卡键 `cmd:<name>#<sub>`（无子命令则 `cmd:<name>`）。 */
  cardId: string;
  name: string;
  subcommand?: string;
  group: string;
  risk?: ToolRisk;
  action: PolicyAction;
  denyCause?: DenyCause;
  sourceKind: SourceKind;
  /** 命令间 `delayMs` 真值（来自 `host.delayConfig()`）；**与 `action` 分列**（FR-V2-054）。 */
  delayMs: number;
  presentInSurface: boolean;
  suppressed: boolean;
  suppressionReason?: string;
  badges: Badge[];
  crossLinks: CrossLink[];
  /** **结构保证**：`action==='deny'` ⇒ `controls === []`（ADR-V2-011）。 */
  controls: ControlDescriptor[];
}

export interface SessionNode {
  id: string;
  kind: 'session';
  sessionId: string;
  label: string;
  origins: string[];
  lastActiveAt: number;
  badges: Badge[];
  crossLinks: CrossLink[];
}

export interface LlmNode {
  id: string;
  kind: 'llm';
  providerId: string;
  providerName: string;
  model: string;
  configured: boolean;
  active: boolean;
  sessions: SessionNode[];
  badges: Badge[];
  crossLinks: CrossLink[];
}

export type TreeNode = SiteNode | CapabilityNode | CommandNode | LlmNode;

export interface TreeGroup {
  id: string;
  kind: 'group';
  dimension: Dimension;
  label: string;
  children: TreeNode[];
}

export interface TreeRoot {
  id: 'root';
  kind: 'root';
  label: string;
  dimensions: Dimension[];
}

// ---------------------------------------------------------------------------
// 快照 / facets / meta / summary
// ---------------------------------------------------------------------------

export interface CatalogFacets {
  actions: Record<string, number>;
  risks: Record<string, number>;
  sources: Record<string, number>;
  origins: string[];
  subcommands: number;
}

export interface SnapshotDegradation {
  dimension: Dimension;
  code: string;
  text: string;
}

export interface SnapshotCounts {
  sites: number;
  capabilities: number;
  commands: number;
  subcommands: number;
  llms: number;
  sessions: number;
}

export interface SnapshotMeta {
  builtAt: number;
  /** 规范 JSON（**不含 `builtAt`**）的纯 FNV-1a 哈希。 */
  hash: string;
  counts: SnapshotCounts;
  sources: string[];
  degradations: SnapshotDegradation[];
  modelNote: string;
}

/** V2-4 预留：parity 对账展示（FR-V2-053）。 */
export interface CatalogMeta {
  toolCount: number;
  subcommandCount: number;
  provenanceCommit: string;
}

export interface ConnectTreeSnapshot {
  /** 结构版本（V2-4 预留 additive 演进）。 */
  version: 1;
  root: TreeRoot;
  groups: [TreeGroup, TreeGroup, TreeGroup, TreeGroup];
  facets: CatalogFacets;
  meta: SnapshotMeta;
  catalogMeta?: CatalogMeta;
}

/** `state.insight?` 小摘要（counts/badges；additive，供 FAB 徽标）。 */
export interface InsightSummary {
  version: 1;
  counts: SnapshotCounts;
  badges: Record<string, number>;
  degraded: boolean;
}

/** 如实声明「森林，非严格单树」（FR-V2-010）。 */
export const INSIGHT_MODEL_NOTE =
  '四维度分组视图（森林），以「本插件」为根；允许跨层引用，非严格单树';

export const INSIGHT_ROOT_LABEL = '本插件';

export const GROUP_LABELS: Readonly<Record<Dimension, string>> = {
  site: '站点授权',
  capability: '浏览器能力',
  command: 'CLI 命令档案',
  llm: 'LLM 连接',
};

// ---------------------------------------------------------------------------
// 命名空间稳定键（ADR-V2-002）
// ---------------------------------------------------------------------------

/**
 * 本地归一化（与 `security/origin-store.ts#normalizeOrigin` 同语义）。
 *
 * 刻意**不导入** store 模块（`src/insight/**` 来源约束：无写 store 导入）；
 * `test/insight-projection.test.ts` 以同源锚定断言两者对同一输入给出同一结果。
 */
export function normalizeStableOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

export const STABLE_KEY = {
  site(origin: string): string {
    return `site:${normalizeStableOrigin(origin)}`;
  },
  staticCapability(permission: string): string {
    return `cap:static:${permission}`;
  },
  optionalCapability(cap: OptionalCapability): string {
    return `cap:opt:${cap}`;
  },
  toggle(key: string): string {
    return `toggle:${key}`;
  },
  command(name: string, subcommand?: string): string {
    return subcommand ? `cmd:${name}#${subcommand}` : `cmd:${name}`;
  },
  llm(providerId: string): string {
    return `llm:${providerId || 'none'}`;
  },
  session(sessionId: string): string {
    return `session:${sessionId}`;
  },
  link(from: string, to: string): string {
    return `link:${from}→${to}`;
  },
  group(dimension: Dimension): string {
    return `group:${dimension}`;
  },
} as const;

// ---------------------------------------------------------------------------
// 规范 JSON + 纯哈希（ADR-V2-002；无新依赖）
// ---------------------------------------------------------------------------

/**
 * 规范 JSON：对象键按字典序递归排序；数组保持既有顺序（调用方已固定排序）。
 * 返回的字符串对同一逻辑值恒定 → 可作哈希输入。
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** FNV-1a 32-bit（十六进制，8 字符）；纯函数、无运行时依赖。 */
export function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // FNV prime 16777619；`>>> 0` 保持无符号 32 位。
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** 对结构做规范 JSON + FNV-1a 哈希（`builtAt` 由调用方排除）。 */
export function hashStructure(value: unknown): string {
  return fnv1aHash(stableStringify(value));
}

/** 按 `id` 升序排序并去重跨层引用（确定性输出）。 */
export function sortCrossLinks(links: readonly CrossLink[]): CrossLink[] {
  const byId = new Map<string, CrossLink>();
  for (const link of links) if (!byId.has(link.id)) byId.set(link.id, link);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
