/**
 * Layered graph layout — an LGDL-native engine that follows the **Sugiyama
 * framework** (杉山框架, Kōzō Sugiyama et al., 1981, "Methods for Visual
 * Understanding of Hierarchical System Structures"). The algorithm *idea* is
 * that classic four-phase layered method; the *implementation* here is our own
 * (no dagre/elkjs — the leaf package depends only on @lgdl/lgdl-core).
 *
 * A layered (Sugiyama) layout runs four phases:
 *   1. cycle removal  — break cycles so we have a DAG (reversed back-edges)
 *   2. layer assignment — give every node a rank (longest path from a source)
 *   3. ordering        — reorder nodes within each layer to reduce edge crossings
 *                      (barycenter/median heuristic, a few sweeps)
 *   4. coordinate      — assign x (spread by `nodesep`, each layer centered on
 *                      the canvas midline) and y (rank × `ranksep` + node height)
 *
 * `rankdir: 'TB'` layers top-down (y grows with rank); `'LR'` layers left-right
 * (x grows with rank). The returned positions are TOP-LEFT, matching the
 * `LayoutResult` contract.
 *
 * Deterministic: identical input → identical output (no randomness).
 */

export interface LayeredNode {
  id: string;
  width: number;
  height: number;
}
export interface LayeredEdge {
  from: string;
  to: string;
}
export interface LayeredResult {
  pos: Map<string, { x: number; y: number; width: number; height: number }>;
  width: number;
  height: number;
}

const GRAPH_MARGIN = 40;

/**
 * Rank each node. Longest-path from a source: rank = 1 + max(pred ranks);
 * sources get 0. Back-edge reversal (in the caller) guarantees a DAG here.
 */
function assignLayers(ids: string[], edges: { from: string; to: string }[], rankdirVertical: boolean): Map<string, number> {
  const rank = new Map<string, number>();
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>(); // from -> to[]
  const radj = new Map<string, string[]>(); // to -> from[]
  for (const id of ids) {
    indeg.set(id, 0);
    adj.set(id, []);
    radj.set(id, []);
  }
  for (const e of edges) {
    if (!adj.has(e.from) || !adj.has(e.to)) continue;
    adj.get(e.from)?.push(e.to);
    radj.get(e.to)?.push(e.from);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  // longest-path: process in topological order
  const queue: string[] = [];
  const inQueue = new Map(ids.map((id) => [id, (indeg.get(id) ?? 0) === 0]));
  for (let i = 0; i < ids.length; i++) if (inQueue.get(ids[i])) queue.push(ids[i]);
  const nodeRank = new Map<string, number>(ids.map((id) => [id, 0]));
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nxt of adj.get(cur) ?? []) {
      nodeRank.set(nxt, Math.max(nodeRank.get(nxt) ?? 0, (nodeRank.get(cur) ?? 0) + 1));
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) queue.push(nxt);
    }
  }
  return nodeRank;
}

/**
 * Reorder the ids of each layer to minimize crossings (barycenter sweeps).
 * Returns ids grouped by rank (rank -> ordered ids).
 */
function orderLayers(
  ids: string[],
  edges: { from: string; to: string }[],
  rank: Map<string, number>,
  maxRank: number,
): string[][] {
  // group ids by rank
  const layers: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const id of ids) layers[rank.get(id) ?? 0].push(id);

  // adjacency for barycenter
  const succ = new Map<string, string[]>();
  const pred = new Map<string, string[]>();
  for (const id of ids) {
    succ.set(id, []);
    pred.set(id, []);
  }
  for (const e of edges) {
    succ.get(e.from)?.push(e.to);
    pred.get(e.to)?.push(e.from);
  }

  const posInLayer = new Map<string, number>();
  const computePos = (lay: string[]): void => lay.forEach((id, i) => posInLayer.set(id, i));
  computePos(layers[0] ?? []);

  // barycenter sweep: down then up, a few passes
  for (let pass = 0; pass < 2; pass++) {
    // downward
    for (let r = 1; r <= maxRank; r++) {
      const lay = layers[r] ?? [];
      lay.sort((a, b) => {
        const ba = barycenter(a, pred, posInLayer);
        const bb = barycenter(b, pred, posInLayer);
        if (ba !== bb) return ba - bb;
        // stable tie-break by document order
        return orderOf(a, ids) - orderOf(b, ids);
      });
      computePos(lay);
    }
    // upward
    for (let r = maxRank - 1; r >= 0; r--) {
      const lay = layers[r] ?? [];
      lay.sort((a, b) => {
        const ba = barycenter(a, succ, posInLayer);
        const bb = barycenter(b, succ, posInLayer);
        if (ba !== bb) return ba - bb;
        return orderOf(a, ids) - orderOf(b, ids);
      });
      computePos(lay);
    }
  }
  return layers;
}

function barycenter(id: string, adjMap: Map<string, string[]>, pos: Map<string, number>): number {
  const list = adjMap.get(id) ?? [];
  if (list.length === 0) return Number.MAX_SAFE_INTEGER / 2; // keep at the ordering end
  let sum = 0;
  let count = 0;
  for (const n of list) {
    const p = pos.get(n);
    if (p !== undefined) {
      sum += p;
      count++;
    }
  }
  return count === 0 ? Number.MAX_SAFE_INTEGER / 2 : sum / count;
}

function orderOf(id: string, ids: string[]): number {
  const i = ids.indexOf(id);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * Layered layout over a flat node/edge set. `rankdir` is a display hint only —
 * the internal rank axis is always "vertical" in rank space; for 'LR' we simply
 * swap x/y at the end.
 */
export function layoutLayered(
  nodes: LayeredNode[],
  edges: LayeredEdge[],
  rankdir: 'TB' | 'LR',
): LayeredResult {
  const idSet = new Set(nodes.map((n) => n.id));
  // 1. cycle removal: detect back-edges via a DFS and reverse them.
  const reversed = new Set<string>();
  const visitState = new Map<string, 0 | 1 | 2>();
  const nodeAdj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) if (idSet.has(e.from) && idSet.has(e.to)) nodeAdj.get(e.from)?.push(e.to);
  const dfs = (id: string): void => {
    visitState.set(id, 1);
    for (const nxt of nodeAdj.get(id) ?? []) {
      const s = visitState.get(nxt) ?? 0;
      if (s === 1) reversed.add(`${id}->${nxt}`); // back-edge → reverse it
      else if (s === 0) dfs(nxt);
    }
    visitState.set(id, 2);
  };
  for (const n of nodes) if ((visitState.get(n.id) ?? 0) === 0) dfs(n.id);

  const dagEdges = edges
    .filter((e) => idSet.has(e.from) && idSet.has(e.to))
    .map((e) => (reversed.has(`${e.from}->${e.to}`) ? { from: e.to, to: e.from } : e));

  const ids = nodes.map((n) => n.id);

  // 2. layering (longest path)
  const rank = assignLayers(ids, dagEdges, true);
  let maxRank = 0;
  for (const v of rank.values()) maxRank = Math.max(maxRank, v);

  // 3. ordering (barycenter)
  const layers = orderLayers(ids, dagEdges, rank, maxRank);

  // 4. coordinate assignment
  // node width/height helper
  const sizeOf = new Map(nodes.map((n) => [n.id, { w: n.width, h: n.height }]));
  // per-rank panel: rankMaxH = 该秩 max 节点高度（TB 秩轴推进与交叉轴参照）；
  // rankMaxW = 该秩 max 节点宽度（LR 秩轴推进用，D-003-1/LL.1）。
  const rankMaxH: number[] = Array.from({ length: maxRank + 1 }, () => 0);
  const rankMaxW: number[] = Array.from({ length: maxRank + 1 }, () => 0);
  for (const r of layers) {
    for (const id of r) {
      const s = sizeOf.get(id)!;
      const rk = rank.get(id) ?? 0;
      rankMaxH[rk] = Math.max(rankMaxH[rk], s.h);
      rankMaxW[rk] = Math.max(rankMaxW[rk], s.w);
    }
  }

  const NODE_SEP = 80;
  const RANK_SEP = 96;
  const pos = new Map<string, { x: number; y: number; width: number; height: number }>();

  // 秩轴（rank 推进方向）起点：TB 为 y、LR 为 x（D-003-1/LL.1）。步进量按
  // rankdir 取维度——LR 必须用 rankMaxW（秩 max 节点宽度），否则宽>高卡片链
  // 相邻 rank 重叠（B2-LR / Q-005 实证：160×48 卡按 rankMaxH 步进仅 144 < 160）。
  const axisStart: number[] = []; // 每秩起始坐标（TB: y / LR: x）
  let axisCursor = GRAPH_MARGIN;
  for (let r = 0; r <= maxRank; r++) {
    axisStart.push(axisCursor);
    const step = rankdir === 'LR' ? rankMaxW[r] : rankMaxH[r];
    axisCursor += step + RANK_SEP;
  }
  const totalRankExtent = axisStart[maxRank] + (rankdir === 'LR' ? rankMaxW[maxRank] : rankMaxH[maxRank]);

  // X: each layer centered on midline
  const layerWidths: number[] = layers.map((lay) => {
    let w = 0;
    for (const id of lay) {
      const s = sizeOf.get(id)!;
      w += s.w + NODE_SEP;
    }
    return w === 0 ? 0 : w - NODE_SEP;
  });
  const maxLayerW = Math.max(...layerWidths, 0);
  const canvasW = maxLayerW + GRAPH_MARGIN * 2;

  for (let r = 0; r <= maxRank; r++) {
    const lay = layers[r] ?? [];
    const layW = layerWidths[r] ?? 0;
    let xCursor = GRAPH_MARGIN + (maxLayerW - layW) / 2;
    for (const id of lay) {
      const s = sizeOf.get(id)!;
      const axis = axisStart[r];
      const x = xCursor;
      xCursor += s.w + NODE_SEP;
      if (rankdir === 'LR') {
        pos.set(id, { x: axis, y: x, width: s.w, height: s.h });
      } else {
        pos.set(id, { x, y: axis, width: s.w, height: s.h });
      }
    }
  }

  // canvas size
  if (rankdir === 'LR') {
    // 秩轴 x = rankMaxW 推进（axisStart）；交叉轴 y = layer width。
    // LL.2/D-003-2: LR 画布宽 = max over nodes(x + width) + GRAPH_MARGIN
    //（镜像 TB 分支 maxNodeRight 兜底）——不再按末秩高度估算（宽卡片链右缘
    // 不再溢出，B2-LR / Q-005 实证：旧 totalRankH+MARGIN 画布 560 < 末卡右缘 632）。
    const canvasH = maxLayerW + GRAPH_MARGIN * 2;
    const maxNodeRight = Math.max(...[...pos.values()].map((p) => p.x + p.width));
    return { pos, width: Math.max(maxNodeRight + GRAPH_MARGIN, totalRankExtent + GRAPH_MARGIN), height: Math.max(canvasH, GRAPH_MARGIN * 2) };
  }
  const maxNodeRight = Math.max(...[...pos.values()].map((p) => p.x + p.width));
  return { pos, width: Math.max(maxNodeRight + GRAPH_MARGIN, canvasW), height: totalRankExtent + GRAPH_MARGIN };
}
