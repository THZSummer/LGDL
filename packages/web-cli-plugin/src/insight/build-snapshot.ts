/**
 * V2-1 薄 builder（ADR-V2-001）：把 background 注入的**已读平面数据**规范化为
 * `InsightSource` 后转调纯投影 `projectInsightTree`。
 *
 * **本模块不触 chrome 接口**（唯一与 chrome 接口接触的是调用方 `service-worker.ts` 的
 * `case 'insight-tree'`），因此 node 可测、纯读、零副作用。
 */
import { projectInsightTree, summarizeInsight, type InsightSource, type ProjectOptions } from './project-tree.js';
import type { CapabilityCatalogDeps } from './capability-catalog.js';
import type { CommandOverrideLookup, ToolSurfaceEntry } from './command-catalog.js';
import type {
  CatalogMeta,
  ConnectTreeSnapshot,
  InsightSummary,
  SnapshotDegradation,
} from './tree-model.js';
import type {
  InsightSourceLlm,
  InsightSourceSession,
  InsightSourceSite,
} from './project-tree.js';

/** builder 的注入式数据源（每个字段都是**已读**数据或其只读访问器）。 */
export interface InsightTreeDeps {
  /** `OriginStore.list()`（已读）。 */
  listOrigins: () => readonly InsightSourceSite[] | Promise<readonly InsightSourceSite[]>;
  /** 能力面（静态+可选实测态 + 开关真值）。 */
  capability: CapabilityCatalogDeps;
  /** 当前工具面（`deriveTools()` + registry + 抑制态合成；已读）。 */
  toolSurface: () => readonly ToolSurfaceEntry[];
  /** `host.delayConfig().delayMs`（只读真值；ADR-V2-014）。 */
  delayMs: number;
  llm?: InsightSourceLlm;
  sessions?: readonly InsightSourceSession[];
  activeOrigin?: string;
  isOriginAuthorized?: (origin: string) => boolean;
  degradations?: readonly SnapshotDegradation[];
  catalogMeta?: CatalogMeta;
  builtAt?: () => number;
  /** R2：纯读的用户覆盖查询（透传给投影；本模块零 IO、零写）。 */
  overrides?: CommandOverrideLookup;
}

/** 规范化注入数据为 `InsightSource`（**不 mutate 输入**；数组均复制）。 */
export async function buildInsightTreePayload(deps: InsightTreeDeps): Promise<InsightSource> {
  const sites = await deps.listOrigins();
  const capability: CapabilityCatalogDeps = {
    grants: { ...deps.capability.grants },
    toggles: { ...deps.capability.toggles },
    tabsEnabled: deps.capability.tabsEnabled,
  };
  return {
    sites: sites.map((site) => ({
      origin: site.origin,
      authorized: site.authorized === true,
      trust: site.trust === 'trusted' ? 'trusted' : 'untrusted',
      ...(site.authorizedAt !== undefined ? { authorizedAt: site.authorizedAt } : {}),
      updatedAt: site.updatedAt,
    })),
    capability,
    toolSurface: deps.toolSurface().map((entry) => ({
      ...entry,
      subcommands: [...entry.subcommands],
      ...(entry.subcommandRisks ? { subcommandRisks: { ...entry.subcommandRisks } } : {}),
    })),
    delayMs: deps.delayMs,
    ...(deps.llm ? { llm: { ...deps.llm } } : {}),
    ...(deps.sessions ? { sessions: deps.sessions.map((s) => ({ ...s, origins: [...s.origins] })) } : {}),
    ...(deps.activeOrigin ? { activeOrigin: deps.activeOrigin } : {}),
    ...(deps.isOriginAuthorized ? { isOriginAuthorized: deps.isOriginAuthorized } : {}),
    ...(deps.degradations ? { degradations: [...deps.degradations] } : {}),
    ...(deps.catalogMeta ? { catalogMeta: { ...deps.catalogMeta } } : {}),
    ...(deps.builtAt ? { builtAt: deps.builtAt() } : {}),
    // R2：纯读访问器（不复制、不变换；投影内部只读取覆盖值）。
    ...(deps.overrides ? { overrides: deps.overrides } : {}),
  };
}

/** 端到端（异步取已读数据 → 纯投影）产出确定性快照。 */
export async function buildInsightTree(
  deps: InsightTreeDeps,
  opts: ProjectOptions = {},
): Promise<ConnectTreeSnapshot> {
  const source = await buildInsightTreePayload(deps);
  return projectInsightTree(source, opts);
}

export { summarizeInsight };
export type { InsightSummary };
