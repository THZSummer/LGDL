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
import type { LgdlDocument, LgdlEdge } from '@lgdl/core';

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
const RANK_SEP = 60; // vertical gap between ranks
const NODE_SEP = 40; // horizontal gap between nodes

export function layoutDocument(doc: LgdlDocument): LayoutResult {
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
    const size = NODE_SIZE[node.kind ?? 'process'] ?? NODE_SIZE.process;
    g.setNode(node.id, { width: size.width, height: size.height, label: node.label ?? node.id });
  }

  for (const group of doc.groups) {
    g.setNode(group.id, { width: 0, height: 0, label: group.label ?? group.id, cluster: true });
    for (const childId of group.contains) {
      g.setParent(childId, group.id);
    }
  }

  for (const edge of doc.edges) {
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

  const edges: LayoutEdge[] = doc.edges.map((edge) => {
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
  const sizeOf = (id: string) => NODE_SIZE[doc.nodes.find((n) => n.id === id)?.kind ?? 'process'] ?? NODE_SIZE.process;

  // adjacency + in-degree
  const childrenOf = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of doc.nodes) {
    childrenOf.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of doc.edges) {
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

  // edges: straight line from parent edge to child edge (center-to-center)
  const edges: LayoutEdge[] = [];
  for (const node of tree.values()) {
    for (const child of node.children) {
      const p = placed.get(node.id)!;
      const c = placed.get(child)!;
      edges.push({
        from: node.id,
        to: child,
        points: [
          { x: p.x + p.width / 2 + shiftX, y: p.y + p.height / 2 + shiftY },
          { x: c.x + c.width / 2 + shiftX, y: c.y + c.height / 2 + shiftY },
        ],
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
  const messages = doc.edges;

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

  const nodePos = new Map<string, { x: number; y: number; width: number; height: number }>();
  let maxHeight = 0;
  effectiveLanes.forEach((lane, li) => {
    const ids = laneNodes.get(lane.id) ?? [];
    let y = GRAPH_MARGIN + LANE_HEADER;
    for (const id of ids) {
      const size = sizeOf(id);
      const x = GRAPH_MARGIN + li * LANE_W + (LANE_W - size.width) / 2;
      nodePos.set(id, { x, y, width: size.width, height: size.height });
      y += size.height + 40;
    }
    maxHeight = Math.max(maxHeight, y);
  });

  const nodes: LayoutNode[] = doc.nodes.map((n) => ({ id: n.id, ...nodePos.get(n.id)! }));
  const width = GRAPH_MARGIN * 2 + effectiveLanes.length * LANE_W;
  const height = maxHeight + GRAPH_MARGIN;

  // edges: straight center-to-center lines (crossing lanes)
  const edges: LayoutEdge[] = doc.edges.map((e) => {
    const a = nodePos.get(e.from)!;
    const b = nodePos.get(e.to)!;
    return {
      from: e.from,
      to: e.to,
      points: [
        { x: a.x + a.width / 2, y: a.y + a.height / 2 },
        { x: b.x + b.width / 2, y: b.y + b.height / 2 },
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
  const edges: LayoutEdge[] = doc.edges.map((e) => {
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
