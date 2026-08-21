/**
 * LGDL layout engine — placeholder for v0.1.
 *
 * Design: deterministic layout via dagre (hierarchical) / radial tree (mindmap),
 * with incremental local re-layout so existing node positions stay stable.
 */
export interface LayoutResult {
  nodes: { id: string; x: number; y: number; width: number; height: number }[];
  edges: { from: string; to: string; points: { x: number; y: number }[] }[];
  width: number;
  height: number;
}

// TODO(M1): implement deterministic layout engine
export function layoutDocument(): LayoutResult {
  return { nodes: [], edges: [], width: 0, height: 0 };
}
