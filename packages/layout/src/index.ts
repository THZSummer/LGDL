/**
 * LGDL deterministic layout engine.
 *
 * Layout is dispatched by diagram type:
 * - flowchart / arch / datastream -> dagre hierarchical (top-down)
 * - mindmap                          -> radial tree (root at center)
 * - sequence                         -> timeline (participants in columns)
 * - uml-class                        -> dagre hierarchical (left-right)
 *
 * Same input always produces the same output (deterministic).
 */
import dagre from 'dagre';
import { VIS_SYMBOL, type LgdlDocument, type LgdlEdge, type LgdlNode } from '@lgdl/core';

const { graphlib, layout } = dagre;

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
const RANK_SEP = 48; // vertical gap between ranks
const NODE_SEP = 40; // horizontal gap between nodes

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

/** Above this node count, use the fast grid layout instead of dagre. */
export const LARGE_GRAPH_THRESHOLD = 120;

/**
 * Edges whose endpoints are both nodes. Aggregate edges (one or both
 * endpoints is a group id) never participate in node layout — they are
 * drawn by the renderer between group boxes instead.
 */
function nodeEdges(doc: LgdlDocument): LgdlEdge[] {
  const ids = new Set(doc.nodes.map((n) => n.id));
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

export function layoutDocument(doc: LgdlDocument): LayoutResult {
  // Large graphs: skip the expensive dagre layout, use O(n) grid.
  // This keeps the editor interactive; dagre quality matters for small/medium.
  if (
    doc.nodes.length > LARGE_GRAPH_THRESHOLD &&
    (doc.type === 'flowchart' || doc.type === 'state' || doc.type === 'er')
  ) {
    return layoutGrid(doc);
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

/** dagre hierarchical layout (flowchart/arch/datastream/uml-class). */
function layoutHierarchical(doc: LgdlDocument, rankdir: 'TB' | 'LR'): LayoutResult {
  const g = new graphlib.Graph({ multigraph: false, compound: true })
    .setGraph({
      rankdir,
      marginx: GRAPH_MARGIN,
      marginy: GRAPH_MARGIN,
      ranksep: RANK_SEP,
      nodesep: NODE_SEP,
    })
    .setDefaultEdgeLabel(() => ({}));

  for (const node of doc.nodes) {
    let size = NODE_SIZE[node.kind ?? 'process'] ?? NODE_SIZE.process;
    // generic nodes: widen the box to fit the label text (13px, centered)
    const hasMemberSizing =
      doc.type === 'uml-class' || (doc.type === 'er' && node.members && node.members.length > 0);
    if (!hasMemberSizing) {
      size = { ...size, width: Math.max(size.width, Math.round(textWidth(node.label ?? node.id, 13) + 24)) };
    }
    // uml-class cards size to their members: header 32 + rows × 18 + padding;
    // width follows the longest line (class name or member text)
    if (doc.type === 'uml-class') {
      const rows = memberRows(node, true);
      const longest = Math.max(
        textWidth(node.label ?? node.id, 13),
        ...rows.map((r) => r.length * 7),
        0,
      );
      size = { width: Math.max(160, longest + 24), height: 32 + rows.length * 18 + 16 };
    }
    // er entities size to their attribute rows: name area + rows × 18
    if (doc.type === 'er' && node.members && node.members.length > 0) {
      const rows = memberRows(node, false);
      const longest = Math.max(
        textWidth(node.label ?? node.id, 13),
        ...rows.map((r) => r.length * 7),
        0,
      );
      size = { width: Math.max(140, longest + 24), height: 44 + rows.length * 18 + 6 };
    }
    g.setNode(node.id, { width: size.width, height: size.height, label: node.label ?? node.id });
  }

  for (const group of doc.groups) {
    g.setNode(group.id, { width: 0, height: 0, label: group.label ?? group.id, cluster: true });
    for (const childId of group.contains) {
      g.setParent(childId, group.id);
    }
  }

  for (const edge of nodeEdges(doc)) {
    g.setEdge(edge.from, edge.to, { label: edge.label ?? '', id: `${edge.from}->${edge.to}` });
  }

  layout(g);

  const nodes: LayoutNode[] = doc.nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      id: node.id,
      x: pos.x - pos.width / 2,
      y: pos.y - pos.height / 2,
      width: pos.width,
      height: pos.height,
    };
  });

  const edges: LayoutEdge[] = nodeEdges(doc).map((edge) => {
    const eg = g.edge(edge.from, edge.to);
    const points = (eg?.points ?? []).map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
    return { from: edge.from, to: edge.to, points };
  });

  const graph = g.graph();
  return {
    nodes,
    edges,
    width: graph.width ?? 0,
    height: graph.height ?? 0,
  };
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
  for (const n of doc.nodes) {
    childrenOf.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of nodeEdges(doc)) {
    childrenOf.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  // root = the node with no incoming edges; fall back to first node
  let rootId = doc.nodes.find((n) => (inDegree.get(n.id) ?? 0) === 0)?.id ?? doc.nodes[0]?.id;
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

  // shift everything to positive coords with margin
  const shiftX = -minX + GRAPH_MARGIN;
  const shiftY = -minY + GRAPH_MARGIN;
  const nodes: LayoutNode[] = [...placed.entries()].map(([id, p]) => ({
    id,
    x: p.x + shiftX,
    y: p.y + shiftY,
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
      const from = { x: p.x + p.width / 2 + shiftX, y: p.y + p.height / 2 + shiftY };
      const toBox = { x: c.x + shiftX, y: c.y + shiftY, width: c.width, height: c.height };
      edges.push({
        from: node.id,
        to: child,
        points: [from, borderPoint(from, toBox)],
      });
    }
  }

  return {
    nodes,
    edges,
    width: maxX - minX + GRAPH_MARGIN * 2,
    height: maxY - minY + GRAPH_MARGIN * 2,
  };
}

// ---------------------------------------------------------------------------
// sequence: timeline layout
// ---------------------------------------------------------------------------

const SEQ_HEADER_H = 70; // participant header height
const SEQ_COL_W = 220; // column width per participant
const SEQ_MSG_GAP = 60; // vertical gap between messages

function layoutSequence(doc: LgdlDocument): LayoutResult {
  const participants = doc.nodes;
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
  const lanes =
    doc.groups.length > 0
      ? doc.groups
      : [{ id: '_default', label: '流程', contains: doc.nodes.map((n) => n.id) }];
  const laneOf = new Map<string, string>();
  for (const lane of lanes) {
    for (const nodeId of lane.contains) laneOf.set(nodeId, lane.id);
  }
  // nodes not in any group go to a trailing "其他" lane
  const unassigned = doc.nodes.filter((n) => !laneOf.has(n.id));
  const effectiveLanes = [...lanes];
  if (unassigned.length > 0) {
    effectiveLanes.push({ id: '_other', label: '其他', contains: unassigned.map((n) => n.id) });
    for (const n of unassigned) laneOf.set(n.id, '_other');
  }

  // stack nodes vertically within each lane (in document order)
  const laneNodes = new Map<string, string[]>();
  for (const lane of effectiveLanes) laneNodes.set(lane.id, []);
  for (const n of doc.nodes) {
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

  const nodes: LayoutNode[] = doc.nodes.map((n) => ({ id: n.id, ...nodePos.get(n.id)! }));
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
const GANTT_COL_W = 40; // width per time unit (day)
const GANTT_LABEL_W = 220; // left label column width
const GANTT_HEADER_H = 40; // time axis header

/**
 * Gantt layout: each node is a task with attrs.start (number, day offset)
 * and attrs.duration (number of days). Edges = dependencies (drawn by renderer).
 * Tasks are stacked vertically in document order.
 */
function layoutGantt(doc: LgdlDocument): LayoutResult {
  const tasks = doc.nodes;
  const maxEnd = tasks.reduce((max, t) => {
    const start = typeof t.attrs?.start === 'number' ? t.attrs.start : 0;
    const dur = typeof t.attrs?.duration === 'number' ? t.attrs.duration : 1;
    return Math.max(max, start + dur);
  }, 1);

  const width = GRAPH_MARGIN * 2 + GANTT_LABEL_W + maxEnd * GANTT_COL_W;
  const height = GRAPH_MARGIN * 2 + GANTT_HEADER_H + tasks.length * GANTT_ROW_H;

  const nodes: LayoutNode[] = tasks.map((t, i) => {
    const start = typeof t.attrs?.start === 'number' ? t.attrs.start : 0;
    const dur = typeof t.attrs?.duration === 'number' ? t.attrs.duration : 1;
    return {
      id: t.id,
      x: GRAPH_MARGIN + GANTT_LABEL_W + start * GANTT_COL_W,
      y: GRAPH_MARGIN + GANTT_HEADER_H + i * GANTT_ROW_H + 8,
      width: Math.max(dur * GANTT_COL_W - 4, 20),
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
 * O(n) grid layout — used for large graphs where dagre becomes slow.
 * Nodes are placed in document order, wrapped into rows.
 */
function layoutGrid(doc: LgdlDocument): LayoutResult {
  const rows = Math.ceil(doc.nodes.length / GRID_COLS);
  const width = GRAPH_MARGIN * 2 + GRID_COLS * (GRID_NODE_W + NODE_SEP);
  const height = GRAPH_MARGIN * 2 + rows * (GRID_NODE_H + RANK_SEP);

  const nodePos = new Map<string, { x: number; y: number; width: number; height: number }>();
  doc.nodes.forEach((n, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    nodePos.set(n.id, {
      x: GRAPH_MARGIN + col * (GRID_NODE_W + NODE_SEP),
      y: GRAPH_MARGIN + row * (GRID_NODE_H + RANK_SEP),
      width: GRID_NODE_W,
      height: GRID_NODE_H,
    });
  });

  const nodes: LayoutNode[] = doc.nodes.map((n) => ({ id: n.id, ...nodePos.get(n.id)! }));

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
