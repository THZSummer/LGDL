/**
 * V3-2 TASK-203 (ADR-V3-022 / FR-V3-034) — the local tree (局部树) projection.
 *
 * ── Why it slices the v2 tree instead of building its own ───────────────────
 *
 * Two ownership models would immediately contradict each other: the L2 global
 * tree (v2 `ownership-tree.ts`, same snapshot, same main-owner rule) and a
 * hand-rolled L1 tree. The local view therefore **reuses** the v2 model and only
 * *slices* it: the current node plus its **main-owner parent chain**, capped at
 * {@link LOCAL_TREE_MAX_NODES}.
 *
 * `≤3` is a hard **upper bound** (not a suggestion) and the gate asserts it.
 * Non-main-owner relations are reported as **cross-reference badges** — never as
 * duplicated nodes (ADR-V2-003's rule, kept here). The "查看全局树" entry lives in
 * the static panel HTML and points at the L2 view (≤2 interactions away), so this
 * module carries no copy for it.
 *
 * Pure data slicing over the injected `OwnershipTree`: no DOM, no snapshot pull,
 * no clock — and it never writes to `src/insight/**`.
 *
 * @module l1/local-tree
 */
import { ownershipNodeFor } from '../../../insight/ownership-tree.js';
import type { OwnershipTree } from '../../../insight/ownership-tree.js';

/** Hard cap on the local tree's node count (FR-V3-034: an upper bound). */
export const LOCAL_TREE_MAX_NODES = 3;

/**
 * The v2 node's own `path` is the root→node label chain, so the local tree is a
 * slice of it — no second ownership walk, no node objects of our own.
 */
export interface LocalTreeView {
  /** ≤ {@link LOCAL_TREE_MAX_NODES} labels, ancestors first, current last. */
  labels: string[];
  count: number;
  /** `true` when the real parent chain was longer and got cut. */
  truncated: boolean;
  /** Cross-reference badges of the current node (text only — no node copies). */
  crossRefs: string[];
  /** `true` when there is no snapshot / the node is unknown (empty state). */
  empty: boolean;
}

/** The empty state (rendered from the static HTML hint, never a clue-less void). */
const EMPTY: LocalTreeView = { labels: [], count: 0, truncated: false, crossRefs: [], empty: true };

/**
 * Slice the main-owner chain: `[ancestors…, current]` capped at `maxNodes`, the
 * **current** node always kept and the nearest ancestors preferred.
 */
export function buildLocalTree(
  tree: OwnershipTree | null | undefined,
  nodeId: string | null | undefined,
  maxNodes: number = LOCAL_TREE_MAX_NODES,
): LocalTreeView {
  const node = tree && nodeId ? ownershipNodeFor(tree, nodeId) : undefined;
  if (!node) return EMPTY;
  const cap = Math.max(1, Math.min(LOCAL_TREE_MAX_NODES, Math.floor(maxNodes)));
  const chain = node.path.length ? node.path : [node.label];
  const labels = chain.slice(-cap);
  return {
    labels,
    count: labels.length,
    truncated: chain.length > labels.length,
    crossRefs: [...node.crossRefLabels],
    empty: false,
  };
}
