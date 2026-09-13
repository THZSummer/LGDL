/**
 * V2-1 parity 同源对账（FR-V2-015 / FR-V2-053；ADR-V2-010）。
 *
 * **单一基线文件**：只读 `test/parity/baseline-catalog.json` + `test/parity/waivers.json`
 * （v1 `test/parity.test.ts` 的同源真值）。**不新建第二份基线**、**不重构** v1 的
 * `test/parity.test.ts`（保持 validated 门禁原样）。
 *
 * 双向对账：漏工具（`missing`）/ 漏子命令（`missingSubs`）/ 未登记新工具
 * （`unregistered`）/ 过期登记（`extraStale`）均可报告。V2-1 门禁以本模块与 v1
 * parity 测试的**同一路径字面量**做同源锚定（防双份真值漂移）。
 *
 * 本模块只被 node 测试消费（**不进 runtime bundle**）；`src/insight/**` 来源约束仍成立
 * （零 chrome 接口、零写 store、零明文、无 bare catch）。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** 基线路径字面量（**同源锚点**：v1 `test/parity.test.ts` 引用同一文件）。 */
export const PARITY_BASELINE_RELATIVE_PATH = 'test/parity/baseline-catalog.json';
export const PARITY_WAIVERS_RELATIVE_PATH = 'test/parity/waivers.json';

export interface BaselineTool {
  name: string;
  subcommands: string[];
  risk: string | null;
  group: string;
  enabled: boolean;
  source: string | null;
}

export interface BaselineCatalog {
  provenance: { branch?: string; commit: string; sessionMatrix?: string; extractedAt?: string; extractor?: string; note?: string };
  toolCount: number;
  tools: BaselineTool[];
}

export type WaiverStatus =
  | 'mapped'
  | 'not-applicable'
  | 'delegated'
  | 'pending-permission'
  | 'baseline-disabled';

export interface WaiverEntry {
  status: WaiverStatus;
  reason: string;
  basis: string;
  providedAs?: string;
  permission?: string;
  pending?: boolean;
}

export interface Waivers {
  provenance?: Record<string, unknown>;
  waivers: Record<string, WaiverEntry>;
  pluginExtras: Record<string, { reason: string; basis: string }>;
}

/** 实际工具面（background 从 `deriveTools()` + registry 组装）。 */
export interface ActualCatalog {
  names: readonly string[];
  subcommands: ReadonlyMap<string, readonly string[]>;
}

export interface ReconcileResult {
  /** 基线有（且未豁免）/ 实际无。 */
  missing: string[];
  /** 工具在、但基线的某个子命令缺失（`"<tool> <sub>"`）。 */
  missingSubs: string[];
  /** 实际有 / 基线无且未登记 `pluginExtras`。 */
  unregistered: string[];
  /** 登记过期：`pluginExtras` 指向不存在的工具；`waivers` 指向不在基线的工具。 */
  extraStale: string[];
}

function readJson<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, 'utf8')) as T;
}

/** 读取单一基线文件（默认以调用方 cwd 为包根；测试在包目录下运行）。 */
export function loadBaseline(root: string = process.cwd()): BaselineCatalog {
  return readJson<BaselineCatalog>(resolve(root, PARITY_BASELINE_RELATIVE_PATH));
}

/** 读取单一豁免表（与基线同目录，同源）。 */
export function loadWaivers(root: string = process.cwd()): Waivers {
  return readJson<Waivers>(resolve(root, PARITY_WAIVERS_RELATIVE_PATH));
}

/**
 * 双向对账（纯函数，可自证）。
 * @param actual 实际工具面（工具名 + 子命令）
 */
export function reconcileCatalog(actual: ActualCatalog, baseline: BaselineCatalog, waivers: Waivers): ReconcileResult {
  const nameSet = new Set(actual.names);
  const baselineNames = new Set(baseline.tools.map((t) => t.name));
  const extras = new Set(Object.keys(waivers.pluginExtras ?? {}));

  const missing: string[] = [];
  const missingSubs: string[] = [];
  for (const tool of baseline.tools) {
    if (waivers.waivers?.[tool.name]) continue;
    if (!nameSet.has(tool.name)) {
      missing.push(tool.name);
      continue;
    }
    const provided = actual.subcommands.get(tool.name) ?? [];
    for (const sub of tool.subcommands) {
      if (!provided.includes(sub)) missingSubs.push(`${tool.name} ${sub}`);
    }
  }

  const unregistered = actual.names.filter((n) => !baselineNames.has(n) && !extras.has(n));

  const extraStale: string[] = [];
  for (const extra of extras) {
    if (!nameSet.has(extra)) extraStale.push(`pluginExtras:${extra}`);
  }
  for (const name of Object.keys(waivers.waivers ?? {})) {
    if (!baselineNames.has(name)) extraStale.push(`waivers:${name}`);
  }

  return { missing, missingSubs, unregistered, extraStale };
}

/** 基线子命令总数（用于 34 工具 / 142 子命令口径）。 */
export function countBaselineSubcommands(baseline: BaselineCatalog): number {
  return baseline.tools.reduce((n, t) => n + t.subcommands.length, 0);
}

/** 覆盖率（%）：`(工具命中 + 子命令命中) / (基线工具 + 基线子命令) × 100`（未豁免项）。 */
export function coveragePercent(result: ReconcileResult, baseline: BaselineCatalog, waivers: Waivers): number {
  let baseTools = 0;
  let baseSubs = 0;
  for (const tool of baseline.tools) {
    if (waivers.waivers?.[tool.name]) continue;
    baseTools += 1;
    baseSubs += tool.subcommands.length;
  }
  const total = baseTools + baseSubs;
  if (total === 0) return 100;
  const hit = total - result.missing.length - result.missingSubs.length;
  return (hit / total) * 100;
}
