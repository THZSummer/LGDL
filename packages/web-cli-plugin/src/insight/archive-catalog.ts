/**
 * V2-4 命令档案渲染模型（FR-V2-050~056 / NFR-V24-001~005；ADR-V2-016~021 / ADR-V2-023）。
 *
 * 纯函数投影：`ConnectTreeSnapshot`（V2-1 确定性快照）→ `ArchiveModel`（**只读**展示模型）。
 * **零 IO、零扩展接口、零写 store、零明文、零副作用**；不 mutate 输入（过滤只改展示集合）。
 *
 * 三层有档口径（ADR-V2-017，**禁止夸大**）：
 *   L1 对账基线 34 工具 / 142 子命令（单一真值 + provenance commit；不打包 baseline JSON）；
 *   L2 豁免登记 20 工具 / 88 子命令（`waivers.json` 状态 + 理由，**非「缺失」**）；
 *   L3 实时投影面 = 当次快照的命令节点（工具卡 + 子命令卡；P0 同款 fixture = 122 卡）；
 *   `accounted = carded ∪ waived` 覆盖基线**每一行**（行级真值由 node 门禁注入 `coverageRows`
 *   验证；运行时只给计数口径，**不声称基线已全部渲染为卡**）。
 *
 * `deny` 分层（ADR-V2-018）：policy 层取 `CommandNode.denyCause`（S1/S3/evaluate）+ 自动授权层
 * `autoAuthHardLine()`（**纯派生只读**，不改 `deriveAction`、不新增模型字段）。
 *
 * 安全红线（ADR-V2-020）：`ArchiveCard` **不含任何写控件字段** → 编译期不可渲染写控件；
 * 本模块**不导入任何写面模块**（动作执行器 / 回执 / 判定链写路径）。
 */
import type { PolicyAction, ToolRisk } from '@lgdl/web-cli-base';
import { isToolRisk } from '../protocol/descriptor.js';
import { PLUGIN_SITE_GROUP } from '../security/policy.js';
import { CATALOG_BASELINE_META } from './catalog-meta.js';
import { DENY_CAUSE_LABEL, TREE_NO_ESCALATION_NOTE, CLAMP_REASON_LABEL } from '../ui/tree/tree-view.js';
import type {
  Badge,
  CatalogFacets,
  ClampReason,
  CommandNode,
  ConnectTreeSnapshot,
  DenyCause,
  SourceKind,
} from './tree-model.js';

// ---------------------------------------------------------------------------
// L2 豁免登记口径（`waivers.json` 的常量投影；漂移由 node 门禁交叉断言）
// ---------------------------------------------------------------------------

/** 豁免状态（与 `catalog-reconcile.ts#WaiverStatus` 同形；此处为**纯类型**，不进 runtime）。 */
export type ArchiveWaiverStatus =
  | 'mapped'
  | 'not-applicable'
  | 'delegated'
  | 'pending-permission'
  | 'baseline-disabled';

export interface ArchiveWaiverLayer {
  tools: number;
  subcommands: number;
  byStatus: Readonly<Partial<Record<ArchiveWaiverStatus, { tools: number; subcommands: number }>>>;
}

/**
 * L2 豁免登记的常量投影（来源 `test/parity/waivers.json`，provenance
 * `2ddc92299ad10cfe0ea2b65403243a45ce7fb041`）。
 *
 * 漂移门禁：`test/insight-archive.test.ts` 逐项断言本常量 === `loadWaivers()` 真值
 * （状态集合 + 每状态工具/子命令数 + 合计）；任何增删即 FAIL。
 */
export const ARCHIVE_WAIVER_BASELINE: ArchiveWaiverLayer = {
  tools: 20,
  subcommands: 88,
  byStatus: {
    mapped: { tools: 4, subcommands: 39 },
    'not-applicable': { tools: 9, subcommands: 29 },
    'baseline-disabled': { tools: 6, subcommands: 16 },
    delegated: { tools: 1, subcommands: 4 },
  },
};

/**
 * 构建期 parity 结论（**pin**）：与单一基线同源对账的 missing/missingSubs/unregistered/
 * extraStale 四字段全空。node 门禁以**真实** `reconcileCatalog` 复算并断言本 pin（漂移即 FAIL）。
 */
export const ARCHIVE_PARITY_PINNED_CLEAN = true;

// ---------------------------------------------------------------------------
// 卡片 / 展示模型（无任何写控件字段）
// ---------------------------------------------------------------------------

/** 分组维度（档案自有；**不碰** `tree-view.ts#TreeFilter`）。 */
export type ArchiveGroupBy = 'tool' | 'action' | 'risk' | 'source' | 'deny-cause';

/**
 * 只读档案卡（R2 分层，ADR-V2-030）。
 *
 * **结构保证**：接口**不含**写控件字段（无 `controls` / 无动作目标），只有**控件描述**
 * 字段 `policyControl?`（可覆盖行才有）；硬底线行（`overridable:false`）**无** `policyControl`
 * 且携带 `clampReason` 可读。写入仍归 V2-3 的**唯一**动作执行通路（本模块无写导入）。
 */
export interface ArchivePolicyOption {
  policyAction: PolicyAction;
  /** 是否为当前生效档（渲染选中态）。 */
  selected: boolean;
}

/** 可覆盖卡的控件描述（**非**可执行控件；仅描述 allow/ask/deny 三档与当前档）。 */
export interface ArchivePolicyControl {
  kind: 'command-policy';
  options: ArchivePolicyOption[];
}

export interface ArchiveCard {
  /** 稳定键：`cmd:<name>` / `cmd:<name>#<sub>`（复用 `CommandNode.cardId`）。 */
  cardId: string;
  name: string;
  subcommand?: string;
  /** 命令分组（`PLUGIN_SITE_GROUP` 判定自动授权层用；只读真值）。 */
  group: string;
  action: PolicyAction;
  risk?: ToolRisk;
  sourceKind: SourceKind;
  /** `site-declared` 卡的所属站点 origin（来自跨层引用真值；其余缺省）。 */
  origin?: string;
  /** 命令间 `delayMs`（来自 `host.delayConfig()`；与 `delay` 档**分列**）。 */
  delayMs: number;
  denyCause?: DenyCause;
  /** policy 层成因文案（复用 `tree-view.ts#DENY_CAUSE_LABEL` 单一措辞源）。 */
  denyCauseLabel?: string;
  /** 自动授权层硬底线（纯派生只读；见 `autoAuthHardLine`）。 */
  autoAuthHardLine: boolean;
  /** 自动授权层可读说明（非站点工具如实标「不适用」）。 */
  autoAuthLabel: string;
  suppressed: boolean;
  suppressionReason?: string;
  badges: Badge[];
  /** R2：默认档（risk 派生；与 `action` 同值，分列展示）。 */
  defaultAction: PolicyAction;
  /** R2：用户覆盖（原始设置值；无覆盖缺省）。 */
  overrideAction?: PolicyAction;
  /** R2：经硬底线 clamp 后的生效档（无覆盖 ≡ 默认）。 */
  effectiveAction: PolicyAction;
  /** R2：是否可被用户在树内覆盖（硬底线 `false`）。 */
  overridable: boolean;
  /** R2：不可覆盖原因（硬底线可读）。 */
  clampReason?: ClampReason;
  /** R2：不可覆盖原因可读文案。 */
  clampReasonLabel?: string;
  /** R2：可覆盖卡的控件描述（硬底线卡为 `undefined` —— 分层结构保证）。 */
  policyControl?: ArchivePolicyControl;
}

export interface ArchiveGroup {
  /** 分组键（枚举值 / 名称 / `none`）。 */
  key: string;
  label: string;
  count: number;
  cards: ArchiveCard[];
}

export interface ArchiveFilter {
  groupBy?: ArchiveGroupBy;
  query?: string;
  action?: PolicyAction;
  risk?: ToolRisk | 'unknown';
  sourceKind?: SourceKind;
  denyCause?: DenyCause;
  /** `site_*` 卡所属 origin（精确匹配）。 */
  origin?: string;
  /** true=仅抑制卡；false=仅在工具面的卡。 */
  suppressed?: boolean;
}

export interface ArchiveRowCoverage {
  basis: 'rows';
  baselineRows: number;
  coveredRows: number;
  missingRows: string[];
  percent: number;
}

export interface ArchiveCountCoverage {
  basis: 'counts';
  baselineRows: number;
  coveredRows: number;
  missingRows: string[];
  percent: number;
}

export interface ArchiveCoverage {
  baseline: {
    tools: number;
    subcommands: number;
    provenanceCommit: string;
    source: string;
  };
  waived: ArchiveWaiverLayer;
  carded: {
    /** 实时投影面工具级条目数（含抑制合成条目）；P0 同款 fixture = 28。 */
    tools: number;
    /** 实时投影面子命令卡数；P0 同款 fixture = 94。 */
    subcommands: number;
    /** 去重后的工具名数量；P0 同款 fixture = 23。 */
    distinctToolNames: number;
  };
  /** `carded ∪ waived` 对基线行的覆盖（行级 / 计数口径见 `basis`）。 */
  accounted: ArchiveRowCoverage | ArchiveCountCoverage;
  /** 与 parity 单一基线的对账结论（pin；门禁复算）。 */
  parity: {
    clean: boolean;
    missing: string[];
    missingSubs: string[];
    unregistered: string[];
    extraStale: string[];
    verifiedBy: 'injected-reconcile' | 'build-time-parity-gate';
  };
}

export interface ArchiveModel {
  header: {
    title: string;
    /** 「实时面 N 条目 / M 子命令 = K 卡」——**不是**「基线已全部渲染」。 */
    liveLabel: string;
    /** 实时面计数的机器可读原值（N / M / K = N + M）。 */
    liveCounts: { tools: number; subcommands: number; cards: number };
    /** 「对账基线 34/142（来源 commit 前 7 位）」。 */
    baselineLabel: string;
    parityLabel: string;
    readOnlyLabel: string;
  };
  coverage: ArchiveCoverage;
  /** 复用快照 `facets`（下拉/计数真值；**不重算**）。 */
  facets: CatalogFacets;
  /** 过滤后的展示卡（无过滤时 = 全部实时面卡）。 */
  cards: ArchiveCard[];
  groups: ArchiveGroup[];
  notes: {
    /** **单一措辞源**（导入 `tree-view` 的钉死文案；档案不重复渲染）。 */
    noEscalationNote: string;
    delayMsNote: string;
    readOnlyNote: string;
    noExaggerationNote: string;
  };
  filter: { groupBy: ArchiveGroupBy; query: string; matches: number };
}

/** 行级真值注入（node 门禁用；运行时不可得 → 计数口径，不打包 baseline JSON）。 */
export interface ArchiveCoverageRows {
  /** 基线每一行：工具名 或 `"<tool> <sub>"`。 */
  baselineRows: readonly string[];
  /** `waivers.json` 已登记的基线行（同上格式）。 */
  waivedRows: readonly string[];
}

export interface ArchiveReconciliation {
  missing: readonly string[];
  missingSubs: readonly string[];
  unregistered: readonly string[];
  extraStale: readonly string[];
}

export interface ArchiveModelDeps {
  /** 行级覆盖真值（node 门禁注入；缺省 = 运行时计数口径）。 */
  coverageRows?: ArchiveCoverageRows;
  /** 真实对账结论（node 门禁注入；缺省 = 构建期 parity 门禁 pin）。 */
  reconciliation?: ArchiveReconciliation;
}

// ---------------------------------------------------------------------------
// 自动授权层派生（纯只读；ADR-V2-018）
// ---------------------------------------------------------------------------

/**
 * 自动授权层硬底线（**纯派生只读**；依据真实 `decideAutoAuthorization` 顺序）。
 *
 * 真实链结论（顺序）：无绑定站点 origin ⇒ 不自动；破坏性写 ⇒ 不自动；
 * `group !== 'site'` ⇒ 不自动；`risk === 'evaluate'` ⇒ hardDeny；risk 不属于两个自动授权档
 * （read/write，含缺失/非法）⇒ hardDeny。故（`origin` = 该卡的绑定站点）：
 *
 *   `autoAuthHardLine ⇔ origin 存在 ∧ group === PLUGIN_SITE_GROUP ∧ risk ∉ {read, write}`
 *
 * **不新增模型字段**、不改 `deriveAction`、不在 `DenyCause` 语义里混入 auto 语境。
 */
export function autoAuthHardLine(card: { group: string; risk?: ToolRisk; origin?: string }): boolean {
  if (!card.origin) return false;
  if (card.group !== PLUGIN_SITE_GROUP) return false;
  const risk: unknown = card.risk;
  if (risk === undefined) return true;
  if (!isToolRisk(risk)) return true;
  return risk !== 'read' && risk !== 'write';
}

function autoAuthLabel(card: { group: string; risk?: ToolRisk; origin?: string }): string {
  if (card.group !== PLUGIN_SITE_GROUP) {
    return '自动授权层：不适用（非站点工具不进入按 origin 自动授权）';
  }
  if (!card.origin) {
    return '自动授权层：不适用（无绑定站点 origin；自动授权按 origin 生效）';
  }
  if (autoAuthHardLine(card)) {
    return '自动授权层：硬底线（evaluate / 不可分类档永不自动放行，直接拒绝）';
  }
  return '自动授权层：适用（read 默认开 / write 默认关；破坏性写仍人工确认）';
}

// ---------------------------------------------------------------------------
// 卡片构造（只读）
// ---------------------------------------------------------------------------

/** `site_*` 卡所属 origin（来自 `crossLinks` 的 `origin` 引用真值）。 */
function originOf(node: CommandNode): string | undefined {
  for (const link of node.crossLinks) {
    if (link.kind !== 'origin') continue;
    const target = link.to.startsWith('site:') ? link.to : link.from.startsWith('site:') ? link.from : '';
    if (target) return target.slice('site:'.length);
  }
  return undefined;
}

function toCard(node: CommandNode): ArchiveCard {
  const origin = originOf(node);
  const causeLabel = node.denyCause ? DENY_CAUSE_LABEL[node.denyCause] : undefined;
  const autoInput = { group: node.group, risk: node.risk, ...(origin ? { origin } : {}) };
  const overridable = node.overridable === true;
  const clampReasonLabel = node.clampReason ? CLAMP_REASON_LABEL[node.clampReason] : undefined;
  return {
    cardId: node.cardId,
    name: node.name,
    ...(node.subcommand ? { subcommand: node.subcommand } : {}),
    group: node.group,
    action: node.action,
    ...(node.risk ? { risk: node.risk } : {}),
    sourceKind: node.sourceKind,
    ...(origin ? { origin } : {}),
    delayMs: node.delayMs,
    ...(node.denyCause ? { denyCause: node.denyCause } : {}),
    ...(causeLabel ? { denyCauseLabel: causeLabel } : {}),
    autoAuthHardLine: autoAuthHardLine(autoInput),
    autoAuthLabel: autoAuthLabel(autoInput),
    suppressed: node.suppressed,
    ...(node.suppressionReason ? { suppressionReason: node.suppressionReason } : {}),
    badges: node.badges.map((b) => ({ ...b })),
    // R2：默认档 / 覆盖生效档**分列** + 分层控件描述（硬底线无 `policyControl`）。
    defaultAction: node.defaultAction,
    ...(node.overrideAction ? { overrideAction: node.overrideAction } : {}),
    effectiveAction: node.effectiveAction,
    overridable,
    ...(node.clampReason ? { clampReason: node.clampReason } : {}),
    ...(clampReasonLabel ? { clampReasonLabel } : {}),
    ...(overridable
      ? {
          policyControl: {
            kind: 'command-policy' as const,
            options: (['allow', 'ask', 'deny'] as PolicyAction[]).map((policyAction) => ({
              policyAction,
              selected: node.effectiveAction === policyAction,
            })),
          },
        }
      : {}),
  };
}

/** 卡片对应的基线行名（工具名 / `"<tool> <sub>"`）。 */
export function cardRowName(card: ArchiveCard): string {
  return card.subcommand ? `${card.name} ${card.subcommand}` : card.name;
}

// ---------------------------------------------------------------------------
// 三层口径（行级并集；防夸大）
// ---------------------------------------------------------------------------

/** 行级并集覆盖：`baselineRows` 中每一行 ∈ (`waivedRows` ∪ `cardedRows`) 才算 accounted。 */
export function computeRowCoverage(
  baselineRows: readonly string[],
  waivedRows: readonly string[],
  cardedRows: readonly string[],
): ArchiveRowCoverage {
  const waived = new Set(waivedRows);
  const carded = new Set(cardedRows);
  const base = [...new Set(baselineRows)];
  const missing: string[] = [];
  let covered = 0;
  for (const row of base) {
    if (waived.has(row) || carded.has(row)) covered += 1;
    else missing.push(row);
  }
  const percent = base.length === 0 ? 100 : (covered / base.length) * 100;
  return {
    basis: 'rows',
    baselineRows: base.length,
    coveredRows: covered,
    missingRows: missing.sort(),
    percent,
  };
}

function computeCoverage(
  snapshot: ConnectTreeSnapshot,
  cards: readonly ArchiveCard[],
  deps: ArchiveModelDeps,
): ArchiveCoverage {
  const meta = snapshot.catalogMeta ?? CATALOG_BASELINE_META;
  const baseline = {
    tools: meta.toolCount,
    subcommands: meta.subcommandCount,
    provenanceCommit: meta.provenanceCommit,
    source: 'test/parity/baseline-catalog.json',
  };
  const subcommands = cards.filter((c) => c.subcommand).length;
  const tools = cards.length - subcommands;
  const distinctToolNames = new Set(cards.map((c) => c.name)).size;
  let accounted: ArchiveRowCoverage | ArchiveCountCoverage;
  if (deps.coverageRows) {
    accounted = computeRowCoverage(
      deps.coverageRows.baselineRows,
      deps.coverageRows.waivedRows,
      cards.map(cardRowName),
    );
  } else {
    const rowCount = baseline.tools + baseline.subcommands;
    accounted = {
      basis: 'counts',
      baselineRows: rowCount,
      coveredRows: rowCount,
      missingRows: [],
      percent: 100,
    };
  }
  const recon = deps.reconciliation;
  const parity = recon
    ? {
        clean:
          recon.missing.length === 0 &&
          recon.missingSubs.length === 0 &&
          recon.unregistered.length === 0 &&
          recon.extraStale.length === 0,
        missing: [...recon.missing],
        missingSubs: [...recon.missingSubs],
        unregistered: [...recon.unregistered],
        extraStale: [...recon.extraStale],
        verifiedBy: 'injected-reconcile' as const,
      }
    : {
        clean: ARCHIVE_PARITY_PINNED_CLEAN,
        missing: [],
        missingSubs: [],
        unregistered: [],
        extraStale: [],
        verifiedBy: 'build-time-parity-gate' as const,
      };
  return {
    baseline,
    waived: ARCHIVE_WAIVER_BASELINE,
    carded: { tools, subcommands, distinctToolNames },
    accounted,
    parity,
  };
}

// ---------------------------------------------------------------------------
// 过滤（纯只读）
// ---------------------------------------------------------------------------

function matchesQuery(card: ArchiveCard, query: string): boolean {
  const haystack = [
    card.cardId,
    card.name,
    card.subcommand ?? '',
    card.group,
    card.action,
    card.risk ?? 'unknown',
    card.sourceKind,
    card.origin ?? '',
    card.denyCause ?? '',
    card.denyCauseLabel ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function applyFilter(cards: readonly ArchiveCard[], filter: ArchiveFilter): ArchiveCard[] {
  const query = filter.query?.trim().toLowerCase() ?? '';
  return cards.filter((card) => {
    if (filter.action !== undefined && card.action !== filter.action) return false;
    if (filter.risk !== undefined) {
      const risk: ToolRisk | 'unknown' = card.risk ?? 'unknown';
      if (risk !== filter.risk) return false;
    }
    if (filter.sourceKind !== undefined && card.sourceKind !== filter.sourceKind) return false;
    if (filter.denyCause !== undefined && card.denyCause !== filter.denyCause) return false;
    if (filter.origin !== undefined && card.origin !== filter.origin) return false;
    if (filter.suppressed !== undefined && card.suppressed !== filter.suppressed) return false;
    if (query && !matchesQuery(card, query)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// 分组（纯展示；确定性顺序）
// ---------------------------------------------------------------------------

const GROUP_BY_ORDER: readonly ArchiveGroupBy[] = ['tool', 'action', 'risk', 'source', 'deny-cause'];
const ACTION_ORDER: readonly string[] = ['allow', 'ask', 'deny'];
const RISK_ORDER: readonly string[] = ['read', 'write', 'external', 'ui', 'state', 'evaluate', 'unknown'];
const SOURCE_ORDER: readonly string[] = [
  'site-declared',
  'plugin-admin',
  'plugin-tabs',
  'plugin-bookmarks',
  'plugin-downloads',
  'plugin-notify',
  'plugin-clipboard',
  'base-builtin',
];
const DENY_ORDER: readonly string[] = [
  's1-unauthorized',
  's3-unknown-risk',
  'evaluate-floor',
  'auto-hardDeny',
  'none',
];

function groupKey(card: ArchiveCard, groupBy: ArchiveGroupBy): string {
  if (groupBy === 'tool') return card.name;
  if (groupBy === 'action') return card.action;
  if (groupBy === 'risk') return card.risk ?? 'unknown';
  if (groupBy === 'source') return card.sourceKind;
  return card.denyCause ?? 'none';
}

function groupLabel(key: string, groupBy: ArchiveGroupBy): string {
  if (groupBy === 'deny-cause') {
    return key === 'none' ? '无 deny 成因（非 deny 档）' : DENY_CAUSE_LABEL[key as DenyCause];
  }
  return key;
}

function orderedKeys(keys: readonly string[], groupBy: ArchiveGroupBy): string[] {
  const order: readonly string[] =
    groupBy === 'action'
      ? ACTION_ORDER
      : groupBy === 'risk'
        ? RISK_ORDER
        : groupBy === 'source'
          ? SOURCE_ORDER
          : groupBy === 'deny-cause'
            ? DENY_ORDER
            : [];
  const known = order.filter((k) => keys.includes(k));
  const rest = keys.filter((k) => !order.includes(k)).sort();
  return [...known, ...rest];
}

function groupCards(cards: readonly ArchiveCard[], groupBy: ArchiveGroupBy): ArchiveGroup[] {
  const byKey = new Map<string, ArchiveCard[]>();
  for (const card of cards) {
    const key = groupKey(card, groupBy);
    const list = byKey.get(key) ?? [];
    list.push(card);
    byKey.set(key, list);
  }
  return orderedKeys([...byKey.keys()], groupBy).map((key) => {
    const list = (byKey.get(key) ?? []).slice().sort((a, b) => a.cardId.localeCompare(b.cardId));
    return { key, label: groupLabel(key, groupBy), count: list.length, cards: list };
  });
}

// ---------------------------------------------------------------------------
// 顶层投影
// ---------------------------------------------------------------------------

function commandNodes(snapshot: ConnectTreeSnapshot): CommandNode[] {
  const group = snapshot.groups.find((g) => g.dimension === 'command');
  return group ? (group.children as CommandNode[]) : [];
}

const READ_ONLY_NOTE =
  '分层展示（R2）：硬底线卡（evaluate / 未授权 origin / 未知 risk / 破坏性 / ui·state·external 放宽方向）无任何命令级控件并展示不可覆盖原因；' +
  '非硬底线命令卡可按 allow/ask/deny 分层设置（写入经唯一动作执行通路，服务端 clamp 仍强制）。' +
  'deny / delay（= deny，fail-closed）本身不可放宽。';

const NO_EXAGGERATION_NOTE =
  '「逐条有档」= 基线每一行都由「豁免登记」或「实时投影面」覆盖（行级真值由 parity 门禁注入基线行验证）；' +
  '本视图只显示实时面卡数，不声称对账基线已全部渲染为卡。';

const DELAY_MS_NOTE = '命令间隔 delayMs（与 delay 档无关；消歧声明见抽屉顶部，同一措辞源）。';

/**
 * 纯投影：`ConnectTreeSnapshot` → `ArchiveModel`。
 *
 * **不 mutate 输入**：所有数组/徽标均为复制；过滤只改展示集合（只读契约）。
 */
export function buildArchiveModel(
  snapshot: ConnectTreeSnapshot,
  filter: ArchiveFilter = {},
  deps: ArchiveModelDeps = {},
): ArchiveModel {
  const allCards = commandNodes(snapshot).map(toCard);
  const coverage = computeCoverage(snapshot, allCards, deps);
  const visible = applyFilter(allCards, filter);
  const groupBy: ArchiveGroupBy = filter.groupBy ?? 'tool';
  if (!GROUP_BY_ORDER.includes(groupBy)) {
    throw new Error(`未知的档案分组维度：${String(groupBy)}`);
  }
  const groups = groupCards(visible, groupBy);
  const liveCounts = {
    tools: coverage.carded.tools,
    subcommands: coverage.carded.subcommands,
    cards: coverage.carded.tools + coverage.carded.subcommands,
  };
  const liveLabel = `实时面 ${liveCounts.tools} 条目 / ${liveCounts.subcommands} 子命令 = ${liveCounts.cards} 卡`;
  const baselineLabel = `对账基线 ${coverage.baseline.tools}/${coverage.baseline.subcommands}（来源 ${coverage.baseline.provenanceCommit.slice(0, 7)}）`;
  const parityLabel = coverage.parity.clean
    ? '对账：无缺口（missing / missingSubs / unregistered / extraStale 均为空）'
    : `对账：存在缺口（missing ${coverage.parity.missing.length} / missingSubs ${coverage.parity.missingSubs.length} / unregistered ${coverage.parity.unregistered.length} / extraStale ${coverage.parity.extraStale.length}）`;
  return {
    header: {
      title: '命令档案（只读）',
      liveLabel,
      liveCounts,
      baselineLabel,
      parityLabel,
      readOnlyLabel: READ_ONLY_NOTE,
    },
    coverage,
    facets: snapshot.facets,
    cards: visible,
    groups,
    notes: {
      noEscalationNote: TREE_NO_ESCALATION_NOTE,
      delayMsNote: DELAY_MS_NOTE,
      readOnlyNote: READ_ONLY_NOTE,
      noExaggerationNote: NO_EXAGGERATION_NOTE,
    },
    filter: { groupBy, query: filter.query?.trim() ?? '', matches: visible.length },
  };
}
