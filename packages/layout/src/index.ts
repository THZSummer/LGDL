/**
 * LGDL deterministic layout engine.
 *
 * v0.1: hierarchical layout via dagre for flowchart / arch / datastream.
 * Same input always produces the same output (deterministic).
 * Incremental local re-layout (locking existing positions) is planned for v0.2.
 */
import dagre from 'dagre';
import type { LgdlDocument } from '@lgdl/core';

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
  const g = new graphlib.Graph({ multigraph: false, compound: true })
    .setGraph({
      rankdir: 'TB',
      marginx: GRAPH_MARGIN,
      marginy: GRAPH_MARGIN,
      ranksep: RANK_SEP,
      nodesep: NODE_SEP,
    })
    .setDefaultEdgeLabel(() => ({}));

  // Nodes
  for (const node of doc.nodes) {
    const size = NODE_SIZE[node.kind ?? 'process'] ?? NODE_SIZE.process;
    g.setNode(node.id, {
      width: size.width,
      height: size.height,
      label: node.label ?? node.id,
    });
  }

  // Groups -> parent clusters
  for (const group of doc.groups) {
    g.setNode(group.id, { width: 0, height: 0, label: group.label ?? group.id, cluster: true });
    for (const childId of group.contains) {
      g.setParent(childId, group.id);
    }
  }

  // Edges
  for (const edge of doc.edges) {
    g.setEdge(edge.from, edge.to, { label: edge.label ?? '', id: `${edge.from}->${edge.to}` });
  }

  layout(g);

  // Collect node positions
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

  // Collect edge routing points
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
