/**
 * V2-1 连接树纯投影 + 确定性快照（FR-V2-010~017；ADR-V2-001 / 002 / 003）。
 *
 * `projectInsightTree(source)` 顺序投影四维度 → `linkCrossRefs()` → `facets` → `meta`。
 * **纯读零副作用**：不触 chrome 接口、不写任何 store、不写审计、不 mutate 输入（FR-V2-016）。
 *
 * 确定性（ADR-V2-002）：固定排序（站点 `localeCompare`；能力 = 静态 manifest 序 →
 * `OPTIONAL_CAPABILITIES` 序 → 开关键序；命令 = 注入序 + 子命令 enum 序；LLM/session =
 * `lastActiveAt` 降序再 `sessionId`）+ `stableStringify` + 纯 FNV-1a 哈希；**`builtAt` 不进入
 * hash 输入**（两次投影 hash 全等）。
 *
 * 空态/降级（FR-V2-017 / EC-V21-001~005）：无站点 / 无已授权站点 / LLM 未配置 / 无命令
 * 均产出**可读** `meta.degradations`（≥3 类）；读失败沿用注入的 fail-safe 默认并标降级，
 * **不当作空/已撤销**。
 */
import type { ToolRisk } from '@lgdl/web-cli-base';
import { projectCapabilities, type CapabilityCatalogDeps } from './capability-catalog.js';
import { projectCommands, type CommandCatalogDeps, type CommandOverrideLookup, type ToolSurfaceEntry } from './command-catalog.js';
import { buildOwnershipTree } from './ownership-tree.js';
import {
  GROUP_LABELS,
  INSIGHT_DIMENSIONS,
  INSIGHT_MODEL_NOTE,
  INSIGHT_ROOT_LABEL,
  STABLE_KEY,
  hashStructure,
  sortCrossLinks,
  type CapabilityNode,
  type CatalogFacets,
  type CatalogMeta,
  type CommandNode,
  type ConnectTreeSnapshot,
  type CoverageSplit,
  type CrossLink,
  type InsightSummary,
  type LlmNode,
  type SessionNode,
  type SiteNode,
  type SnapshotCounts,
  type SnapshotDegradation,
  type TreeGroup,
  type TreeRoot,
  type TreeNode,
} from './tree-model.js';

/** 站点状态源（`OriginStore.list()` 的非敏感子集）。 */
export interface InsightSourceSite {
  origin: string;
  authorized: boolean;
  trust: 'untrusted' | 'trusted';
  authorizedAt?: number;
  updatedAt: number;
}

/** LLM 状态源（`LlmStatusSummary`，零明文）。 */
export interface InsightSourceLlm {
  configured: boolean;
  providerId: string;
  providerName: string;
  model: string;
}

export interface InsightSourceSession {
  sessionId: string;
  label: string;
  origins: string[];
  lastActiveAt: number;
}

/** 投影输入（background 组装的**已读平面数据**；投影内零 IO）。 */
export interface InsightSource {
  sites: readonly InsightSourceSite[];
  capability: CapabilityCatalogDeps;
  toolSurface: readonly ToolSurfaceEntry[];
  delayMs: number;
  llm?: InsightSourceLlm;
  sessions?: readonly InsightSourceSession[];
  activeOrigin?: string;
  isOriginAuthorized?: (origin: string) => boolean;
  /** 读失败等注入的可读降级条目（**不当作空/已撤销**）。 */
  degradations?: readonly SnapshotDegradation[];
  catalogMeta?: CatalogMeta;
  builtAt?: number;
  /** R2：纯读的用户覆盖查询（只影响默认档/生效档分列；不改变命令集合与 hash 输入）。 */
  overrides?: CommandOverrideLookup;
}

const BASE_SOURCES = [
  'origin-store',
  'capability-permissions',
  'capability-setting',
  'tabs-setting',
  'tool-registry',
  'host.delay-config',
  'llm-status',
  'session-store',
] as const;

function siteBadges(site: InsightSourceSite): SiteNode['badges'] {
  const badges: SiteNode['badges'] = [
    site.authorized
      ? { kind: 'authorized', label: '已授权', tone: 'ok' }
      : { kind: 'unauthorized', label: '未授权', tone: 'warn' },
    site.trust === 'trusted'
      ? { kind: 'trusted', label: 'trusted', tone: 'ok' }
      : { kind: 'untrusted', label: 'untrusted', tone: 'muted' },
  ];
  return badges;
}

function projectSites(sites: readonly InsightSourceSite[]): SiteNode[] {
  return [...sites]
    .sort((a, b) => a.origin.localeCompare(b.origin))
    .map((site) => {
      const id = STABLE_KEY.site(site.origin);
      return {
        id,
        kind: 'site' as const,
        origin: site.origin,
        label: site.origin,
        authorized: site.authorized === true,
        trust: site.trust === 'trusted' ? 'trusted' : 'untrusted',
        ...(site.authorizedAt !== undefined ? { authorizedAt: site.authorizedAt } : {}),
        updatedAt: site.updatedAt,
        revocable: true as const,
        badges: siteBadges(site),
        crossLinks: [],
        // 「可取消授权」态仅在 `authorized===true`（FR-V2-011）。
        controls: site.authorized
          ? [{ kind: 'revoke' as const, actionId: 'revoke-origin' as const, label: '撤销该站点授权（可重新授权）' }]
          : [],
      };
    });
}

function projectLlm(source: InsightSource): LlmNode {
  const llm = source.llm ?? { configured: false, providerId: '', providerName: '', model: '' };
  const id = STABLE_KEY.llm(llm.providerId);
  const sessionNodes: SessionNode[] = [...(source.sessions ?? [])]
    .sort((a, b) => (b.lastActiveAt - a.lastActiveAt) || a.sessionId.localeCompare(b.sessionId))
    .map((session) => {
      const sid = STABLE_KEY.session(session.sessionId);
      const link: CrossLink = {
        id: STABLE_KEY.link(sid, id),
        from: sid,
        to: id,
        kind: 'session',
        label: '归属 LLM 连接',
      };
      return {
        id: sid,
        kind: 'session' as const,
        sessionId: session.sessionId,
        label: session.label,
        origins: [...session.origins],
        lastActiveAt: session.lastActiveAt,
        badges: [{ kind: 'enabled' as const, label: '会话', tone: 'muted' as const }],
        crossLinks: [link],
      };
    });
  const llmLinks = sortCrossLinks(
    sessionNodes.map((s) => ({
      id: STABLE_KEY.link(id, s.id),
      from: id,
      to: s.id,
      kind: 'session' as const,
      label: '包含会话（分组 ≠ 授权）',
    })),
  );
  return {
    id,
    kind: 'llm',
    providerId: llm.providerId,
    providerName: llm.providerName,
    model: llm.model,
    configured: llm.configured === true,
    active: llm.configured === true,
    sessions: sessionNodes,
    badges: [
      llm.configured
        ? { kind: 'configured', label: '已配置', tone: 'ok' }
        : { kind: 'not-configured', label: '未配置', tone: 'muted' },
    ],
    crossLinks: llmLinks,
  };
}

function computeFacets(
  sites: readonly SiteNode[],
  commands: readonly CommandNode[],
): CatalogFacets {
  const actions: Record<string, number> = {};
  const risks: Record<string, number> = {};
  const sources: Record<string, number> = {};
  let subcommands = 0;
  for (const cmd of commands) {
    actions[cmd.action] = (actions[cmd.action] ?? 0) + 1;
    const riskKey: ToolRisk | 'unknown' = cmd.risk ?? 'unknown';
    risks[riskKey] = (risks[riskKey] ?? 0) + 1;
    sources[cmd.sourceKind] = (sources[cmd.sourceKind] ?? 0) + 1;
    if (cmd.subcommand) subcommands += 1;
  }
  return {
    actions,
    risks,
    sources,
    origins: sites.map((s) => s.origin),
    subcommands,
  };
}

function computeDegradations(source: InsightSource): SnapshotDegradation[] {
  const out: SnapshotDegradation[] = [...(source.degradations ?? [])];
  if (source.sites.length === 0) {
    out.push({
      dimension: 'site',
      code: 'no-sites',
      text: '尚无任何站点记录：在目标站点点击插件图标并授权后，这里会列出站点及其授权状态。',
    });
  } else if (!source.sites.some((s) => s.authorized === true)) {
    out.push({
      dimension: 'site',
      code: 'no-authorized-sites',
      text: '还没有已授权站点：授权后该站点的声明工具才会进入工具面。',
    });
  }
  if (source.toolSurface.length === 0) {
    out.push({
      dimension: 'command',
      code: 'no-commands',
      text: '当前工具面为空（异常态）：命令档案无法枚举，请检查插件是否正确加载。',
    });
  }
  if (source.llm?.configured !== true) {
    out.push({
      dimension: 'llm',
      code: 'llm-unconfigured',
      text: 'LLM 未配置：在设置页填入 API Key 后即可使用助手（树内不改绑、不显示 key）。',
    });
  }
  // 去重（同一 dimension+code 只保留一条），保持稳定顺序。
  const seen = new Set<string>();
  return out.filter((d) => {
    const key = `${d.dimension}:${d.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function attachReverseSiteLinks(sites: SiteNode[], commands: readonly CommandNode[]): void {
  const bySite = new Map<string, CrossLink[]>();
  for (const cmd of commands) {
    for (const link of cmd.crossLinks) {
      if (link.kind !== 'origin') continue;
      const reverse: CrossLink = {
        id: STABLE_KEY.link(link.to, link.from),
        from: link.to,
        to: link.from,
        kind: 'tool',
        label: '该站点的声明工具（展示用，不构成授权）',
      };
      const list = bySite.get(link.to) ?? [];
      list.push(reverse);
      bySite.set(link.to, list);
    }
  }
  for (const site of sites) {
    site.crossLinks = sortCrossLinks(bySite.get(site.id) ?? []);
  }
}

export interface ProjectOptions {
  /** 快照构建时刻（**不进入 hash 输入**，仅用于 `meta.builtAt`）。 */
  builtAt?: number;
}

/** 纯投影：四维度 → 确定性 `ConnectTreeSnapshot`。 */
export function projectInsightTree(source: InsightSource, opts: ProjectOptions = {}): ConnectTreeSnapshot {
  const sites = projectSites(source.sites);
  const capabilities: CapabilityNode[] = projectCapabilities(source.capability);
  const commandDeps: CommandCatalogDeps = {
    delayMs: source.delayMs,
    ...(source.activeOrigin ? { activeOrigin: source.activeOrigin } : {}),
    ...(source.isOriginAuthorized ? { isOriginAuthorized: source.isOriginAuthorized } : {}),
    ...(source.overrides ? { overrides: source.overrides } : {}),
  };
  const commands: CommandNode[] = projectCommands(source.toolSurface, commandDeps);
  const llm = projectLlm(source);
  attachReverseSiteLinks(sites, commands);

  const groups: [TreeGroup, TreeGroup, TreeGroup, TreeGroup] = [
    { id: STABLE_KEY.group('site'), kind: 'group', dimension: 'site', label: GROUP_LABELS.site, children: sites },
    { id: STABLE_KEY.group('capability'), kind: 'group', dimension: 'capability', label: GROUP_LABELS.capability, children: capabilities },
    { id: STABLE_KEY.group('command'), kind: 'group', dimension: 'command', label: GROUP_LABELS.command, children: commands },
    { id: STABLE_KEY.group('llm'), kind: 'group', dimension: 'llm', label: GROUP_LABELS.llm, children: [llm] },
  ];

  const root: TreeRoot = {
    id: 'root',
    kind: 'root',
    label: INSIGHT_ROOT_LABEL,
    dimensions: [...INSIGHT_DIMENSIONS],
  };

  const facets = computeFacets(sites, commands);
  const counts: SnapshotCounts = {
    sites: sites.length,
    capabilities: capabilities.length,
    commands: commands.filter((c) => !c.subcommand).length,
    subcommands: commands.filter((c) => c.subcommand).length,
    llms: llm.configured ? 1 : 0,
    sessions: llm.sessions.length,
  };
  const degradations = computeDegradations(source);
  const sources: string[] = [
    ...BASE_SOURCES,
    ...degradations.map((d) => `degradation:${d.code}`),
  ];
  const builtAt = opts.builtAt ?? source.builtAt ?? Date.now();

  // hash 输入**不含 builtAt / hash 自身**（两次投影 hash 全等）；R2 追加字段
  // （ownershipTree / coverage）**亦不进入** hash 输入（扁平面/确定性前提零变化）。
  const hash = hashStructure({
    version: 1,
    root,
    groups,
    facets,
    counts,
    sources,
    degradations,
    modelNote: INSIGHT_MODEL_NOTE,
  });

  // R2（FR-V2-079）：覆盖面**分列**（实时投影面 vs parity 基线）——`accounted` 不出现。
  const liveTools = counts.commands;
  const liveSubcommands = counts.subcommands;
  const coverage: CoverageSplit = {
    live: { tools: liveTools, subcommands: liveSubcommands, cards: liveTools + liveSubcommands },
    ...(source.catalogMeta
      ? { baseline: { tools: source.catalogMeta.toolCount, subcommands: source.catalogMeta.subcommandCount } }
      : {}),
    note:
      `实时投影面 ${liveTools} 工具 / ${liveSubcommands} 子命令（${liveTools + liveSubcommands} 卡，树内渲染/可操作面）；` +
      (source.catalogMeta
        ? `parity 基线 ${source.catalogMeta.toolCount} 工具 / ${source.catalogMeta.subcommandCount} 子命令为独立对账口径；`
        : 'parity 基线口径未注入（本快照不含 catalogMeta）；') +
      '两口径分列，不得混同或夸大。',
  };

  const base: Omit<ConnectTreeSnapshot, 'ownershipTree'> = {
    version: 1,
    root,
    groups,
    facets,
    meta: {
      builtAt,
      hash,
      counts,
      sources,
      degradations,
      modelNote: INSIGHT_MODEL_NOTE,
    },
    ...(source.catalogMeta ? { catalogMeta: source.catalogMeta } : {}),
    coverage,
  };

  return { ...base, ownershipTree: buildOwnershipTree(base) };
}

/** `state.insight?` 小摘要：counts + 徽标计数 + 是否有降级（零明文）。 */
export function summarizeInsight(
  snapshot: ConnectTreeSnapshot,
  opts: { overrideCount?: number } = {},
): InsightSummary {
  const badges: Record<string, number> = {};
  for (const group of snapshot.groups) {
    for (const node of group.children as TreeNode[]) {
      for (const badge of node.badges) {
        badges[badge.kind] = (badges[badge.kind] ?? 0) + 1;
      }
    }
  }
  return {
    version: 1,
    counts: snapshot.meta.counts,
    badges,
    degraded: snapshot.meta.degradations.length > 0,
    // R2 additive：旧消费者忽略未知可选字段。
    ...(opts.overrideCount !== undefined ? { overrideCount: opts.overrideCount } : {}),
  };
}
