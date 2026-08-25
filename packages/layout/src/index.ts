/**
 * LGDL deterministic layout engine.
 *
 * Layout is dispatched by diagram type:
 * - flowchart / arch / datastream -> hierarchical layout (top-down)
 * - mindmap                       -> radial tree (root at center)
 * - sequence                      -> timeline (participants in columns)
 * - uml-class / er                -> hierarchical layout (left-right)
 * - gantt / state                 -> see below
 *
 * Hierarchical (layered) layouts are produced by the LGDL-native Sugiyama
 * engine (`layoutLayered`) — NO dagre / elkjs dependency. Only @lgdl/core.
 * Same input always produces the same output (deterministic).
 */
import { VIS_SYMBOL, type DiagramType, type LgdlDocument, type LgdlEdge, type LgdlNode } from '@lgdl/core';
import { layoutLayered } from './layered.js';

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  points: { x: number; y: number }[];
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

/** Default node dimensions per kind (shape hints from the renderer). */
const NODE_SIZE: Record<string, { width: number; height: number }> = {
  start: { width: 120, height: 48 },
  end: { width: 120, height: 48 },
  process: { width: 160, height: 56 },
  decision: { width: 140, height: 80 },
  entity: { width: 140, height: 60 },
  note: { width: 140, height: 60 },
};

const GRAPH_MARGIN = 40;
const RANK_SEP = 96; // vertical gap between ranks (leaves room between stacked group boxes)
const NODE_SEP = 80; // horizontal gap between nodes

/**
 * Display rows for a node's members — mirrors the renderer's formatting so
 * sized cards exactly fit their content. `withVisibility` prefixes the UML
 * symbol (+ - # ~) for uml-class cards; er entities show plain rows.
 */
function memberRows(node: LgdlNode, withVisibility = true): string[] {
  if (!node.members) return [];
  return node.members.map((m) => {
    const sig =
      m.kind === 'method'
        ? `${m.name}${m.params ?? '()'}${m.type ? `: ${m.type}` : ''}`
        : `${m.name}${m.type ? `: ${m.type}` : ''}`;
    const vis = withVisibility && m.visibility ? VIS_SYMBOL[m.visibility] : '';
    return `${vis} ${sig}`.trim();
  });
}

/**
 * Estimate rendered text width: CJK glyphs are ~fontSize wide, Latin/digits
 * ~0.62x. Keeps long labels inside their node boxes (e.g. note nodes like
 * "静态资源由 CDN 回源 OSS").
 */
function textWidth(s: string, fontSize: number): number {
  let w = 0;
  for (const ch of s) {
    w += (ch.codePointAt(0) ?? 0) > 0x2e80 ? fontSize : fontSize * 0.62;
  }
  return w;
}

/** Above this node count, use the fast grid layout instead of the layered layout. */
export const LARGE_GRAPH_THRESHOLD = 120;

/**
 * Edges whose endpoints are both nodes. Aggregate edges (one or both
 * endpoints is a group id) never participate in node layout — they are
 * drawn by the renderer between group boxes instead.
 */
function nodeEdges(doc: LgdlDocument): LgdlEdge[] {
  // group nodes are container boxes, not ordinary nodes — edges whose
  // endpoint is a group id are aggregate edges (drawn by the renderer between
  // group boxes) and must never participate in node-node layout
  const ids = new Set(doc.nodes.filter((n) => n.kind !== 'group').map((n) => n.id));
  return doc.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
}

/**
 * Point on the target box border where a ray from the source center
 * crosses it — edge endpoints stop at the border so the arrowhead stays
 * visible (not hidden under the node's filled rect).
 */
function borderPoint(
  from: { x: number; y: number },
  to: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  const bx = to.x + to.width / 2;
  const by = to.y + to.height / 2;
  const dx = bx - from.x;
  const dy = by - from.y;
  if (dx === 0 && dy === 0) return { x: bx, y: by };
  const tX = dx !== 0 ? to.width / 2 / Math.abs(dx) : Infinity;
  const tY = dy !== 0 ? to.height / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tX, tY);
  return { x: bx - dx * t, y: by - dy * t };
}

export async function layoutDocument(doc: LgdlDocument): Promise<LayoutResult> {
  // Large graphs: skip the expensive layered layout, use O(n) grid.
  // This keeps the editor interactive; layered quality matters for small/medium.
  if (
    doc.nodes.filter((n) => n.kind !== 'group').length > LARGE_GRAPH_THRESHOLD &&
    (doc.type === 'flowchart' || doc.type === 'state' || doc.type === 'er')
  ) {
    return layoutGrid(doc);
  }
  // Diagrams with real container groups (flowchart/arch/state/uml-class/er)
  // use the group-aware two-level layout so group boxes never overlap.
  // (datastream/mindmap/sequence/gantt keep their own layouts: there groups are
  // lanes/sections, not stacked containers.)
  const layeredWithGroups: DiagramType[] = ['flowchart', 'arch', 'state', 'uml-class', 'er'];
  if (doc.groups.length > 0 && layeredWithGroups.includes(doc.type)) {
    const rankdir = doc.type === 'uml-class' || doc.type === 'er' ? 'LR' : 'TB';
    return layoutGrouped(doc, rankdir);
  }
  switch (doc.type) {
    case 'mindmap':
      return layoutMindmap(doc);
    case 'sequence':
      return layoutSequence(doc);
    case 'datastream':
      return layoutSwimlane(doc);
    case 'uml-class':
    case 'er':
      return layoutHierarchical(doc, 'LR');
    case 'gantt':
      return layoutGantt(doc);
    case 'state':
    default:
      return layoutHierarchical(doc, 'TB');
  }
}

/** Node dimensions for a document, per kind + member content (shared by both
 * engines place identically-sized boxes). */
function nodeSizes(doc: LgdlDocument): Map<string, { width: number; height: number }> {
  const sizes = new Map<string, { width: number; height: number }>();
  for (const node of doc.nodes) {
    // group nodes are container boxes — they get no ordinary node size; the
    // group boxes are derived by the renderer from their members' positions
    if (node.kind === 'group') continue;
    let size = NODE_SIZE[node.kind ?? 'process'] ?? NODE_SIZE.process;
    const hasMemberSizing =
      doc.type === 'uml-class' || (doc.type === 'er' && node.members && node.members.length > 0);
    if (!hasMemberSizing) {
      size = { ...size, width: Math.max(size.width, Math.round(textWidth(node.label ?? node.id, 13) + 24)) };
    }
    if (doc.type === 'uml-class') {
      const rows = memberRows(node, true);
      const longest = Math.max(textWidth(node.label ?? node.id, 13), ...rows.map((r) => r.length * 7), 0);
      size = { width: Math.max(160, longest + 24), height: 32 + rows.length * 18 + 16 };
    }
    if (doc.type === 'er' && node.members && node.members.length > 0) {
      const rows = memberRows(node, false);
      const longest = Math.max(textWidth(node.label ?? node.id, 13), ...rows.map((r) => r.length * 7), 0);
      size = { width: Math.max(140, longest + 24), height: 44 + rows.length * 18 + 6 };
    }
    sizes.set(node.id, size);
  }
  return sizes;
}

/**
 * Layered run over a flat node/edge set, returning top-left positions + canvas.
 * Uses the LGDL-native `layoutLayered`. Used by the group-aware
 * layout at both inter-group and intra-group levels.
 */
function layeredRun(
  nodes: { id: string; width: number; height: number }[],
  edges: { from: string; to: string }[],
  rankdir: 'TB' | 'LR',
): { pos: Map<string, { x: number; y: number; width: number; height: number }>; width: number; height: number } {
  const r = layoutLayered(nodes, edges, rankdir);
  return { pos: r.pos, width: r.width, height: r.height };
}

/**
 * Group-aware hierarchical layout — the fix for overlapping group boxes.
 *
 * A one-level layered layout lays ALL nodes flat, so nodes of different groups interleave and the
 * boxes the renderer draws afterwards overlap. This layout instead treats each
 * group as a first-class "super-node":
 *
 *   1. Lay out each group's members (internal edges) → a local
 *      layout + a group bounding box.
 *   2. Lay out a TOP-level graph whose nodes are the groups (sized to their
 *      bbox + padding + label) plus every ungrouped node; edges are the cross-
 *      group / ungrouped edges collapsed to their unit level.
 *   3. Offset each group's local layout by its super-node position.
 *
 * Groups never overlap (they are separate top-level nodes with RANK_SEP/NODE_SEP
 * gaps), intra-group nodes cluster, and reading order is preserved (layered at
 * both levels). Cross-group edges route between the real member node positions,
 * which the renderer orthogonalizes.
 */
function layoutGrouped(doc: LgdlDocument, rankdir: 'TB' | 'LR'): LayoutResult {
  const sizes = nodeSizes(doc);
  const groupOf = new Map<string, string>(); // nodeId -> groupId
  for (const g of doc.groups) for (const m of g.contains ?? []) groupOf.set(m, g.id);

  const nodeEdgesAll = nodeEdges(doc);
  const inGroup = (id: string) => groupOf.has(id);

  // ---- step 1: intra-group layering ----------------------------------------
  // local layout per group (top-left relative to a 0,0 origin) + the group box
  // (which also reserves label/padding via the super-node, not here).
  const intra = new Map<string, Map<string, { x: number; y: number; width: number; height: number }>>();
  const groupBox = new Map<string, { w: number; h: number }>(); // group interior size
  for (const g of doc.groups) {
    const members = (g.contains ?? []).filter((m) => sizes.has(m));
    if (members.length === 0) continue;
    const internalEdges = nodeEdgesAll.filter((e) => members.includes(e.from) && members.includes(e.to));
    const r = layeredRun(
      members.map((m) => ({ id: m, width: sizes.get(m)!.width, height: sizes.get(m)!.height })),
      internalEdges.map((e) => ({ from: e.from, to: e.to })),
      rankdir,
    );
    intra.set(g.id, r.pos);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [id, p] of r.pos) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width); maxY = Math.max(maxY, p.y + p.height);
    }
    groupBox.set(g.id, { w: maxX - minX, h: maxY - minY });
  }

  // ---- step 2: top-level layering (groups as super-nodes + ungrouped) -------
  const unitOf = (nodeId: string): string => groupOf.get(nodeId) ?? nodeId; // group aggregates its nodes
  const topNodes: { id: string; width: number; height: number }[] = [];
  const isGroupId = (id: string) => doc.groups.some((g) => g.id === id);
  for (const g of doc.groups) {
    const box = groupBox.get(g.id);
    if (!box) continue;
    // super-node sized to the group's interior + padding + a header strip
    const padX = 40, padY = 50;
    topNodes.push({ id: g.id, width: box.w + padX * 2, height: box.h + padY * 2 });
  }
  for (const nd of doc.nodes) {
    // group nodes are the super-nodes of the loop above — never lay them as
    // ordinary (unsized) nodes here
    if (nd.kind !== 'group' && !inGroup(nd.id)) topNodes.push({ id: nd.id, width: sizes.get(nd.id)!.width, height: sizes.get(nd.id)!.height });
  }
  // collapse node edges to unit level, dedup
  const unitEdges = new Set<string>();
  for (const e of nodeEdgesAll) {
    const ua = unitOf(e.from), ub = unitOf(e.to);
    if (ua !== ub) unitEdges.add(`${ua}\u0000${ub}`);
  }
  const top = layeredRun(
    topNodes,
    [...unitEdges].map((k) => { const [f, t] = k.split('\u0000'); return { from: f, to: t }; }),
    rankdir,
  );

  // ---- step 3: merge — offset intra-group layouts by super-node positions ---
  const tpos = top.pos;
  const finalPos = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const nd of doc.nodes) {
    // group nodes have no intra-group layout and no top-level position of
    // their own (they are represented by the super-node) — skip them entirely
    if (nd.kind === 'group') continue;
    const gid = groupOf.get(nd.id);
    if (gid && intra.has(gid)) {
      const local = intra.get(gid)!.get(nd.id)!;
      const gp = tpos.get(gid)!;
      const padX = 40, padY = 50;
      // Normalize the group's local layout to start at 0 (the intra-group
      // top-left coords are not centered), then place it inside the super-node
      // region (gp + pad). Without the rebase, subtracting box.w/2 pushes
      // members to negative coordinates and the group box extends off-canvas.
      const localMinX = Math.min(...[...intra.get(gid)!.values()].map((p) => p.x));
      const localMinY = Math.min(...[...intra.get(gid)!.values()].map((p) => p.y));
      finalPos.set(nd.id, {
        x: gp.x + padX + (local.x - localMinX),
        y: gp.y + padY + (local.y - localMinY),
        width: local.width,
        height: local.height,
      });
    } else {
      finalPos.set(nd.id, tpos.get(nd.id)!);
    }
  }

  // canvas spans all final node positions (guaranteed non-overlapping groups)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of finalPos.values()) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width); maxY = Math.max(maxY, p.y + p.height);
  }
  const nodes: LayoutNode[] = doc.nodes
    .filter((nd) => nd.kind !== 'group') // group boxes are derived by the renderer
    .map((n) => {
      const p = finalPos.get(n.id)!;
      return { id: n.id, x: Math.round(p.x), y: Math.round(p.y), width: Math.round(p.width), height: Math.round(p.height) };
    });

  // cross-group edges: route between node centers (renderer orthogonalizes).
  const edges: LayoutEdge[] = nodeEdgesAll.map((e) => {
    const a = finalPos.get(e.from)!, b = finalPos.get(e.to)!;
    const ac = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const bc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const midX = Math.round((ac.x + bc.x) / 2);
    return {
      from: e.from, to: e.to,
      points: [{ x: Math.round(ac.x), y: Math.round(ac.y) }, { x: midX, y: Math.round(ac.y) }, { x: midX, y: Math.round(bc.y) }, { x: Math.round(bc.x), y: Math.round(bc.y) }],
    };
  });

  return { nodes, edges, width: Math.round(maxX - minX + GRAPH_MARGIN * 2), height: Math.round(maxY - minY + GRAPH_MARGIN * 2) };
}


/** Hierarchical (layered) layout — LGDL-native Sugiyama, no dagre/elkjs. */
function layoutHierarchical(doc: LgdlDocument, rankdir: 'TB' | 'LR'): LayoutResult {
  const sizes = nodeSizes(doc);
  const flatNodes = doc.nodes.filter((n) => n.kind !== 'group');
  const lay = layoutLayered(
    flatNodes.map((n) => ({ id: n.id, width: sizes.get(n.id)?.width ?? 160, height: sizes.get(n.id)?.height ?? 56 })),
    nodeEdges(doc).map((e) => ({ from: e.from, to: e.to })),
    rankdir,
  );

  const nodes: LayoutNode[] = flatNodes.map((n) => {
    const p = lay.pos.get(n.id)!;
    return { id: n.id, x: Math.round(p.x), y: Math.round(p.y), width: Math.round(p.width), height: Math.round(p.height) };
  });

  // Edge polylines from the node centers (renderer orthogonalizes/avoids).
  const centerOf = (id: string): { x: number; y: number } => {
    const p = lay.pos.get(id)!;
    return { x: p.x + p.width / 2, y: p.y + p.height / 2 };
  };
  const edges: LayoutEdge[] = nodeEdges(doc).map((e) => {
    const a = centerOf(e.from);
    const b = centerOf(e.to);
    const midX = Math.round((a.x + b.x) / 2);
    return {
      from: e.from,
      to: e.to,
      points: [
        { x: Math.round(a.x), y: Math.round(a.y) },
        { x: midX, y: Math.round(a.y) },
        { x: midX, y: Math.round(b.y) },
        { x: Math.round(b.x), y: Math.round(b.y) },
      ],
    };
  });

  return { nodes, edges, width: lay.width, height: lay.height };
}


// ---------------------------------------------------------------------------
// mindmap: radial tree layout
// ---------------------------------------------------------------------------

interface MindTreeNode {
  id: string;
  children: string[];
  depth: number;
  /** subtree leaf count (used to size angular spans) */
  leaves: number;
  angleStart: number;
  angleEnd: number;
}

const MIND_LEVEL_SEP = 180; // radial distance between levels
const MIND_ANGLE_UNIT = (Math.PI / 180) * 14; // radians per leaf

function layoutMindmap(doc: LgdlDocument): LayoutResult {
  // group boxes are not mindmap nodes — a radial tree has no container
  // concept, so ignore them entirely
  const plainNodes = doc.nodes.filter((n) => n.kind !== 'group');
  // mindmap nodes share one height (kind shapes are flowchart concepts and
  // are ignored here) but widen to fit their label text
  const sizeOf = (id: string) => {
    const n = doc.nodes.find((x) => x.id === id);
    return {
      width: Math.max(NODE_SIZE.process.width, Math.round(textWidth(n?.label ?? id, 14) + 24)),
      height: NODE_SIZE.process.height,
    };
  };

  // adjacency + in-degree
  const childrenOf = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of plainNodes) {
    childrenOf.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of nodeEdges(doc)) {
    childrenOf.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  // root = the node with no incoming edges; fall back to first node
  let rootId = plainNodes.find((n) => (inDegree.get(n.id) ?? 0) === 0)?.id ?? plainNodes[0]?.id;
  if (!rootId) return { nodes: [], edges: [], width: 0, height: 0 };

  // build tree via BFS (avoid cycles)
  const visited = new Set<string>([rootId]);
  const tree = new Map<string, MindTreeNode>();
  const queue: string[] = [rootId];
  tree.set(rootId, { id: rootId, children: [], depth: 0, leaves: 0, angleStart: 0, angleEnd: 0 });
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const node = tree.get(cur)!;
    for (const child of childrenOf.get(cur) ?? []) {
      if (visited.has(child)) continue;
      visited.add(child);
      node.children.push(child);
      tree.set(child, { id: child, children: [], depth: node.depth + 1, leaves: 0, angleStart: 0, angleEnd: 0 });
      queue.push(child);
    }
  }

  // leaves per subtree (bottom-up)
  const computeLeaves = (id: string): number => {
    const node = tree.get(id)!;
    if (node.children.length === 0) {
      node.leaves = 1;
    } else {
      node.leaves = node.children.reduce((sum, c) => sum + computeLeaves(c), 0);
    }
    return node.leaves;
  };
  computeLeaves(rootId);

  // assign angular spans (root gets full circle, centered at -90deg / top)
  const assignAngles = (id: string, start: number, end: number) => {
    const node = tree.get(id)!;
    node.angleStart = start;
    node.angleEnd = end;
    const span = end - start;
    let cursor = start;
    for (const child of node.children) {
      const childNode = tree.get(child)!;
      const childSpan = span * (childNode.leaves / node.leaves);
      assignAngles(child, cursor, cursor + childSpan);
      cursor += childSpan;
    }
  };
  assignAngles(rootId, -Math.PI / 2, (3 * Math.PI) / 2);

  // place nodes: polar -> cartesian, keep everything >= 0
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const placed = new Map<string, { x: number; y: number; width: number; height: number }>();

  for (const node of tree.values()) {
    const size = sizeOf(node.id);
    const mid = (node.angleStart + node.angleEnd) / 2;
    const r = node.depth * MIND_LEVEL_SEP;
    const cx = r * Math.cos(mid);
    const cy = r * Math.sin(mid);
    const x = cx - size.width / 2;
    const y = cy - size.height / 2;
    placed.set(node.id, { x, y, width: size.width, height: size.height });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + size.width);
    maxY = Math.max(maxY, y + size.height);
  }

  // shift everything to positive coords with margin; round coordinates so
  // SVG widths/heights stay clean integers (no float leakage)
  const shiftX = -minX + GRAPH_MARGIN;
  const shiftY = -minY + GRAPH_MARGIN;
  const nodes: LayoutNode[] = [...placed.entries()].map(([id, p]) => ({
    id,
    x: Math.round(p.x + shiftX),
    y: Math.round(p.y + shiftY),
    width: p.width,
    height: p.height,
  }));

  // edges: straight line from parent to child, ending at the child border
  // so the arrowhead stays visible
  const edges: LayoutEdge[] = [];
  for (const node of tree.values()) {
    for (const child of node.children) {
      const p = placed.get(node.id)!;
      const c = placed.get(child)!;
      const from = { x: Math.round(p.x + p.width / 2 + shiftX), y: Math.round(p.y + p.height / 2 + shiftY) };
      const toBox = { x: Math.round(c.x + shiftX), y: Math.round(c.y + shiftY), width: c.width, height: c.height };
      const bp = borderPoint(from, toBox);
      edges.push({
        from: node.id,
        to: child,
        points: [from, { x: Math.round(bp.x), y: Math.round(bp.y) }],
      });
    }
  }

  return {
    nodes,
    edges,
    width: Math.round(maxX - minX + GRAPH_MARGIN * 2),
    height: Math.round(maxY - minY + GRAPH_MARGIN * 2),
  };
}

// ---------------------------------------------------------------------------
// sequence: timeline layout
// ---------------------------------------------------------------------------

const SEQ_HEADER_H = 70; // participant header height
const SEQ_COL_W = 220; // column width per participant
const SEQ_MSG_GAP = 60; // vertical gap between messages

function layoutSequence(doc: LgdlDocument): LayoutResult {
  // group boxes are not sequence participants — only ordinary nodes get a column
  const participants = doc.nodes.filter((n) => n.kind !== 'group');
  const messages = nodeEdges(doc);

  const width = Math.max(participants.length, 1) * SEQ_COL_W + GRAPH_MARGIN * 2;
  const bodyH = Math.max(messages.length, 1) * SEQ_MSG_GAP + SEQ_MSG_GAP;
  const height = SEQ_HEADER_H + bodyH + GRAPH_MARGIN;

  // participant headers at top
  const nodes: LayoutNode[] = participants.map((p, i) => ({
    id: p.id,
    x: GRAPH_MARGIN + i * SEQ_COL_W + (SEQ_COL_W - 160) / 2,
    y: GRAPH_MARGIN,
    width: 160,
    height: 44,
  }));

  const xOf = (id: string) => {
    const idx = participants.findIndex((p) => p.id === id);
    if (idx === -1) return GRAPH_MARGIN + SEQ_COL_W / 2;
    return GRAPH_MARGIN + idx * SEQ_COL_W + SEQ_COL_W / 2;
  };

  // messages: horizontal lines, one rank per message in document order
  const edges: LayoutEdge[] = messages.map((e, i) => {
    const y = GRAPH_MARGIN + SEQ_HEADER_H + (i + 1) * SEQ_MSG_GAP;
    const x1 = xOf(e.from);
    const x2 = xOf(e.to);
    return {
      from: e.from,
      to: e.to,
      points: [
        { x: x1, y },
        { x: x2, y },
      ],
    };
  });

  return { nodes, edges, width, height };
}

// ---------------------------------------------------------------------------
// datastream: swimlane layout (each group = a vertical lane)
// ---------------------------------------------------------------------------

const LANE_W = 260; // lane (column) width
const LANE_HEADER = 36; // lane header height

function layoutSwimlane(doc: LgdlDocument): LayoutResult {
  // group boxes are lanes themselves (doc.groups) — they are never stacked as
  // ordinary nodes inside a lane
  const plainNodes = doc.nodes.filter((n) => n.kind !== 'group');
  const lanes =
    doc.groups.length > 0
      ? doc.groups
      : [{ id: '_default', label: '流程', contains: plainNodes.map((n) => n.id) }];
  const laneOf = new Map<string, string>();
  for (const lane of lanes) {
    for (const nodeId of lane.contains) laneOf.set(nodeId, lane.id);
  }
  // nodes not in any group go to a trailing "其他" lane
  const unassigned = plainNodes.filter((n) => !laneOf.has(n.id));
  const effectiveLanes = [...lanes];
  if (unassigned.length > 0) {
    effectiveLanes.push({ id: '_other', label: '其他', contains: unassigned.map((n) => n.id) });
    for (const n of unassigned) laneOf.set(n.id, '_other');
  }

  // stack nodes vertically within each lane (in document order)
  const laneNodes = new Map<string, string[]>();
  for (const lane of effectiveLanes) laneNodes.set(lane.id, []);
  for (const n of plainNodes) {
    laneNodes.get(laneOf.get(n.id)!)?.push(n.id);
  }

  const sizeOf = (id: string) =>
    NODE_SIZE[doc.nodes.find((n) => n.id === id)?.kind ?? 'process'] ?? NODE_SIZE.process;

  // pass 1: content height per lane (stacked nodes + gaps), overall = max
  const laneHeights = new Map<string, number>();
  let maxContent = 0;
  for (const lane of effectiveLanes) {
    const ids = laneNodes.get(lane.id) ?? [];
    let h = 0;
    for (const id of ids) h += sizeOf(id).height + 40;
    const content = Math.max(h - 40, 0);
    laneHeights.set(lane.id, content);
    maxContent = Math.max(maxContent, content);
  }
  const contentTop = GRAPH_MARGIN + LANE_HEADER;

  // pass 2: place nodes, vertically centering each lane's stack so short
  // lanes don't leave a big empty band at the bottom
  const nodePos = new Map<string, { x: number; y: number; width: number; height: number }>();
  effectiveLanes.forEach((lane, li) => {
    const ids = laneNodes.get(lane.id) ?? [];
    const total = laneHeights.get(lane.id) ?? 0;
    let y = contentTop + (maxContent - total) / 2;
    for (const id of ids) {
      const size = sizeOf(id);
      const x = GRAPH_MARGIN + li * LANE_W + (LANE_W - size.width) / 2;
      nodePos.set(id, { x, y, width: size.width, height: size.height });
      y += size.height + 40;
    }
  });

  const nodes: LayoutNode[] = plainNodes.map((n) => ({ id: n.id, ...nodePos.get(n.id)! }));
  const width = GRAPH_MARGIN * 2 + effectiveLanes.length * LANE_W;
  const height = contentTop + maxContent + GRAPH_MARGIN;

  // edges: straight center-to-center lines (crossing lanes)
  const edges: LayoutEdge[] = nodeEdges(doc).map((e) => {
    const a = nodePos.get(e.from)!;
    const b = nodePos.get(e.to)!;
    return {
      from: e.from,
      to: e.to,
      points: [
        { x: a.x + a.width / 2, y: a.y + a.height / 2 },
        borderPoint({ x: a.x + a.width / 2, y: a.y + a.height / 2 }, b),
      ],
    };
  });

  return { nodes, edges, width, height };
}

// ---------------------------------------------------------------------------
// gantt: timeline bars (tasks on rows, time on x-axis)
// ---------------------------------------------------------------------------

const GANTT_ROW_H = 48; // height per task row
const GANTT_COL_W_MAX = 40; // widest per day — short projects read spaciously
const GANTT_COL_W_MIN = 14; // narrowest per day — long projects stay bounded
const GANTT_CHART_W_TARGET = 1100; // desired advance (bar) width; colW adapts toward it
const GANTT_LABEL_W = 220; // left label column width
const GANTT_HEADER_H = 40; // time axis header

/**
 * Gantt layout: each node is a task with attrs.start (number, day offset)
 * and attrs.duration (number of days). Edges = dependencies (drawn by renderer).
 * Tasks are stacked vertically in document order.
 *
 * The time scale is ADAPTIVE: `colW` (px per day) is chosen so the chart
 * stays near GANTT_CHART_W_TARGET instead of blowing up linearly with a long
 * span (a 90-day project at 40px/day is ~3700px wide — the "过扁" bug). Bars
 * are placed with the chosen colW; the renderer re-derives it from width.
 */
function layoutGantt(doc: LgdlDocument): LayoutResult {
  // group boxes are gantt sections (doc.groups), not task bars
  const tasks = doc.nodes.filter((n) => n.kind !== 'group');
  const startOf = (t: LgdlNode): number => (typeof t.attrs?.start === 'number' ? t.attrs.start : 0);
  const durOf = (t: LgdlNode): number => (typeof t.attrs?.duration === 'number' ? t.attrs.duration : 1);
  // normalize negative day offsets (dates before the base) so bars start
  // at the left edge instead of overlapping the label column
  const minStart = tasks.reduce((min, t) => Math.min(min, startOf(t)), 0);
  // maxEnd must track the actual latest bar — an all-negative project (dates
  // before the epoch) must not blow the canvas up to ~30000px wide
  let maxEnd = tasks.length > 0 ? startOf(tasks[0]) + durOf(tasks[0]) : 1;
  for (const t of tasks) maxEnd = Math.max(maxEnd, startOf(t) + durOf(t));

  const span = Math.max(maxEnd - minStart, 1);
  // adaptive column width, clamped to keep the chart near the target width
  const colW =
    span > 0
      ? Math.round(Math.min(GANTT_COL_W_MAX, Math.max(GANTT_COL_W_MIN, GANTT_CHART_W_TARGET / span)))
      : GANTT_COL_W_MAX;

  const width = GRAPH_MARGIN * 2 + GANTT_LABEL_W + span * colW;
  const height = GRAPH_MARGIN * 2 + GANTT_HEADER_H + tasks.length * GANTT_ROW_H;

  const nodes: LayoutNode[] = tasks.map((t, i) => {
    const start = startOf(t) - minStart;
    const dur = durOf(t);
    return {
      id: t.id,
      x: GRAPH_MARGIN + GANTT_LABEL_W + start * colW,
      y: GRAPH_MARGIN + GANTT_HEADER_H + i * GANTT_ROW_H + 8,
      width: Math.max(dur * colW - 4, 20),
      height: GANTT_ROW_H - 16,
    };
  });

  // dependencies: vertical connector from dep bar bottom to dependent bar top
  const edges: LayoutEdge[] = nodeEdges(doc).map((e) => {
    const a = nodes.find((n) => n.id === e.from)!;
    const b = nodes.find((n) => n.id === e.to)!;
    return {
      from: e.from,
      to: e.to,
      points: [
        { x: a.x + a.width, y: a.y + a.height / 2 },
        { x: b.x, y: b.y + b.height / 2 },
      ],
    };
  });

  return { nodes, edges, width, height };
}

// ---------------------------------------------------------------------------
// lightweight grid layout for large graphs (fast fallback)
// ---------------------------------------------------------------------------

const GRID_NODE_W = 150;
const GRID_NODE_H = 44;
const GRID_COLS = 6; // nodes per row

/**
 * O(n) grid layout — used for large graphs where the layered engine becomes slow.
 * Nodes are placed in document order, wrapped into rows.
 */
function layoutGrid(doc: LgdlDocument): LayoutResult {
  // group boxes are not laid out as ordinary nodes (the renderer derives the
  // box from its members) — only ordinary nodes occupy grid cells
  const nodes = doc.nodes.filter((n) => n.kind !== 'group');
  const rows = Math.ceil(nodes.length / GRID_COLS);
  const width = GRAPH_MARGIN * 2 + GRID_COLS * (GRID_NODE_W + NODE_SEP);
  const height = GRAPH_MARGIN * 2 + rows * (GRID_NODE_H + RANK_SEP);

  const nodePos = new Map<string, { x: number; y: number; width: number; height: number }>();
  nodes.forEach((n, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    nodePos.set(n.id, {
      x: GRAPH_MARGIN + col * (GRID_NODE_W + NODE_SEP),
      y: GRAPH_MARGIN + row * (GRID_NODE_H + RANK_SEP),
      width: GRID_NODE_W,
      height: GRID_NODE_H,
    });
  });

  const layoutNodes: LayoutNode[] = nodes.map((n) => ({ id: n.id, ...nodePos.get(n.id)! }));

  const edges: LayoutEdge[] = nodeEdges(doc).map((e) => {
    const a = nodePos.get(e.from)!;
    const b = nodePos.get(e.to)!;
    return {
      from: e.from,
      to: e.to,
      points: [
        { x: a.x + a.width / 2, y: a.y + a.height / 2 },
        borderPoint({ x: a.x + a.width / 2, y: a.y + a.height / 2 }, b),
      ],
    };
  });

  return { nodes: layoutNodes, edges, width, height };
}
