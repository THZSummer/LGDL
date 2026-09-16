/**
 * V3-3 TASK-301 (FR-V3-046 / FR-V3-049 / EC-V3-016 — ADR-V3-026) — the **L2 count
 * derivation**, the single place every L2 number comes from.
 *
 * Hard rules this module exists to enforce:
 *
 *   1. **No magic numbers.** Every count is a pure function of a *real* truth:
 *      - `tree`     ← `state.insight.counts` (the SW-pushed `SnapshotCounts`,
 *                     i.e. the same snapshot the tree/catalogue render from);
 *      - `commands` ← `{ live, baseline }`: `live` = the live projection面
 *                     (`commands + subcommands`, identical to
 *                     `snapshot.coverage.live.cards` by construction),
 *                     `baseline` = the parity baseline **constant registry**
 *                     (`catalog-meta.ts#CATALOG_BASELINE_META`, the same single
 *                     source the SW injects as `snapshot.catalogMeta`);
 *      - `audit`    ← the existing audit read channel reply length;
 *      - `settings` ← `SETTINGS_SECTION_IDS` (see `settings/sections.ts`).
 *   2. **分列，不合并**（EC-V3-016）: `commands` is an **object** with both keys,
 *      never one merged number, never an average. The live face and the parity
 *      baseline are different calibers and are labelled as such; the baseline
 *      label carries the provenance commit so "34/142 已全部渲染" style claims
 *      stay impossible.
 *   3. **Unknown ≠ 0.** A truth that has not been read yet is `null` and renders
 *      as `…`, never as `0` (a false zero is the same defect as a hard-coded
 *      number, just harder to spot).
 *
 * Pure (no DOM, no `chrome.*`), so `test/l2-counts.test.ts` can drive it.
 *
 * @module l2/counts
 */
import type { SnapshotCounts } from '../../../insight/tree-model.js';
import { SETTINGS_SECTION_IDS } from '../../settings/sections.js';

/** The four L2 views, in the fixed order of the entry panel. */
export const L2_VIEW_KEYS = Object.freeze(['tree', 'commands', 'audit', 'settings'] as const);
export type L2ViewKey = (typeof L2_VIEW_KEYS)[number];

/** Live face (this projection) vs parity baseline (independent caliber). 分列. */
export interface L2CommandCounts {
  live: number | null;
  baseline: number | null;
}

export interface L2Counts {
  tree: number | null;
  commands: L2CommandCounts;
  audit: number | null;
  settings: number;
}

/** Truth inputs — every field is read from an existing channel (no invention). */
export interface L2CountInput {
  /** `state.insight.counts` — the snapshot's own counts (SW-pushed). */
  insightCounts: SnapshotCounts | null;
  /** `CATALOG_BASELINE_META` (parity baseline registry). */
  catalogMeta: { toolCount: number; subcommandCount: number } | null;
  /** Number of entries returned by the existing `audit-export` channel (null = never read). */
  auditEntries: number | null;
  /** Overridable for tests; defaults to the v1 registry. */
  settingsSections?: readonly string[];
}

/**
 * Tree node count = the four-dimension node total of the snapshot
 * (`sites + capabilities + commands + subcommands + llms + sessions`).
 *
 * Caliber note (registered in `build.md`): this counts the **four-dimension data
 * nodes** — the same set the tree renders — and deliberately excludes the
 * `root` / `face` / `group` scaffolding rows that `buildOwnershipTree()` adds,
 * because those are structural, not data. `null` when no snapshot has been read.
 */
export function treeNodeCount(counts: SnapshotCounts | null): number | null {
  if (!counts) return null;
  return counts.sites + counts.capabilities + counts.commands + counts.subcommands + counts.llms + counts.sessions;
}

/** Live projection face: `commands + subcommands` (= `coverage.live.cards`). */
export function liveCommandCount(counts: SnapshotCounts | null): number | null {
  if (!counts) return null;
  return counts.commands + counts.subcommands;
}

/** Parity baseline rows: `toolCount + subcommandCount` (independent caliber). */
export function baselineCommandCount(meta: { toolCount: number; subcommandCount: number } | null): number | null {
  if (!meta) return null;
  return meta.toolCount + meta.subcommandCount;
}

/** The ONE derivation used by the entry panel, the status bar and every view title. */
export function deriveCounts(input: L2CountInput): L2Counts {
  return {
    tree: treeNodeCount(input.insightCounts),
    commands: {
      live: liveCommandCount(input.insightCounts),
      baseline: baselineCommandCount(input.catalogMeta),
    },
    audit: input.auditEntries,
    settings: (input.settingsSections ?? SETTINGS_SECTION_IDS).length,
  };
}

/** `null` → `…` (an unread truth must never masquerade as `0`). */
export function countText(value: number | null): string {
  return value === null ? '…' : String(value);
}

/** `实时 122 卡 / 基线 176 行` — both numbers, each with its own label (分列). */
export function commandCountText(counts: L2CommandCounts): string {
  return `实时 ${countText(counts.live)} 卡 / 基线 ${countText(counts.baseline)} 行`;
}

/** The `#l2-entry-<key>` label; always carries the count (FR-V3-015). */
export function l2EntryLabel(key: L2ViewKey, counts: L2Counts): string {
  switch (key) {
    case 'tree':
      return `连接树 · ${countText(counts.tree)}`;
    case 'commands':
      return `命令目录 · ${commandCountText(counts.commands)}`;
    case 'audit':
      return `审计 · ${countText(counts.audit)}`;
    case 'settings':
    default:
      return `设置 · ${countText(counts.settings)}`;
  }
}

/**
 * The numeric `data-count` written next to each entry.
 *
 * For `commands` this is the **live** face (the parity baseline is a different
 * caliber and stays visible in the label); `null` for an unread truth.
 */
export function l2EntryCount(key: L2ViewKey, counts: L2Counts): number | null {
  switch (key) {
    case 'tree':
      return counts.tree;
    case 'commands':
      return counts.commands.live;
    case 'audit':
      return counts.audit;
    case 'settings':
    default:
      return counts.settings;
  }
}

/** One-line status-bar summary — the same numbers as the entries (single source). */
export function l2StatusBarText(counts: L2Counts): string {
  const commands =
    counts.commands.baseline === null
      ? countText(counts.commands.live)
      : `${countText(counts.commands.live)}/${countText(counts.commands.baseline)}`;
  return `状态：树 ${countText(counts.tree)} · 命令 ${commands} · 审计 ${countText(counts.audit)} · 设置 ${countText(
    counts.settings,
  )}`;
}

/** View titles (also the entry-panel wording — one source). */
export const L2_VIEW_TITLES: Readonly<Record<L2ViewKey, string>> = Object.freeze({
  tree: '全局连接树（四维度）',
  commands: '命令目录（逐条有档）',
  audit: '审计（零明文）',
  settings: '设置',
});

/** Per-view count line shown in the shared L2 header next to the title. */
export function l2ViewCountText(key: L2ViewKey, counts: L2Counts): string {
  switch (key) {
    case 'tree':
      return `节点 ${countText(counts.tree)}`;
    case 'commands':
      return commandCountText(counts.commands);
    case 'audit':
      return `条目 ${countText(counts.audit)}`;
    case 'settings':
    default:
      return `分区 ${countText(counts.settings)}`;
  }
}
