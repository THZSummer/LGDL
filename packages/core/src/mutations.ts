/**
 * LGDL incremental edit API.
 *
 * The core innovation: AI agents never rewrite the whole document — they
 * apply small, precise mutations (add node, add edge, ...) that only touch
 * the affected area. Layout stability is handled by the layout engine;
 * here we only mutate the semantic model.
 */
import type { LgdlDocument, LgdlEdge, LgdlNode, NodeKind } from './types.js';

export interface AddNodeOptions {
  id: string;
  label?: string;
  kind?: NodeKind;
  /** Optional group to place the node into */
  group?: string;
}

export interface AddEdgeOptions {
  from: string;
  to: string;
  label?: string;
}

export interface UpdateNodeOptions {
  id: string;
  label?: string;
  kind?: NodeKind;
}

/** Result of a mutation: the new document + a human/AI-readable summary. */
export interface MutationResult {
  document: LgdlDocument;
  summary: string;
}

export function addNode(doc: LgdlDocument, opts: AddNodeOptions): MutationResult {
  const { id, label, kind, group } = opts;

  if (doc.nodes.some((n) => n.id === id)) {
    throw new Error(`Node id already exists: "${id}"`);
  }
  if (!/^[A-Za-z0-9_]+$/.test(id)) {
    throw new Error(`Invalid node id: "${id}" (letters, digits, underscore only)`);
  }

  const node: LgdlNode = { id, label: label ?? id, kind: kind ?? 'process' };

  const document: LgdlDocument = {
    ...doc,
    nodes: [...doc.nodes, node],
  };

  let summary = `added node "${id}"${label ? ` (${label})` : ''}${kind ? ` :${kind}` : ''}`;

  if (group) {
    document.groups = doc.groups.map((g) =>
      g.id === group ? { ...g, contains: [...g.contains, id] } : g,
    );
    if (!document.groups.some((g) => g.id === group)) {
      throw new Error(`Group not found: "${group}"`);
    }
    summary += ` into group "${group}"`;
  }

  return { document, summary };
}

export function removeNode(doc: LgdlDocument, id: string): MutationResult {
  if (!doc.nodes.some((n) => n.id === id)) {
    throw new Error(`Node not found: "${id}"`);
  }

  const document: LgdlDocument = {
    ...doc,
    // remove the node
    nodes: doc.nodes.filter((n) => n.id !== id),
    // auto-clean edges touching it
    edges: doc.edges.filter((e) => e.from !== id && e.to !== id),
    // remove it from groups
    groups: doc.groups.map((g) => ({ ...g, contains: g.contains.filter((c) => c !== id) })),
  };

  const removedEdges = doc.edges.filter((e) => e.from === id || e.to === id).length;
  return {
    document,
    summary: `removed node "${id}"${removedEdges > 0 ? ` and ${removedEdges} attached edge(s)` : ''}`,
  };
}

export function addEdge(doc: LgdlDocument, opts: AddEdgeOptions): MutationResult {
  const { from, to, label } = opts;

  if (!doc.nodes.some((n) => n.id === from)) {
    throw new Error(`Source node not found: "${from}"`);
  }
  if (!doc.nodes.some((n) => n.id === to)) {
    throw new Error(`Target node not found: "${to}"`);
  }
  if (from === to) {
    throw new Error(`Self-loop edges are not supported (from === to === "${from}")`);
  }
  if (doc.edges.some((e) => e.from === from && e.to === to)) {
    throw new Error(`Edge already exists: ${from} -> ${to}`);
  }

  const edge: LgdlEdge = { from, to, label };

  return {
    document: { ...doc, edges: [...doc.edges, edge] },
    summary: `added edge ${from} -> ${to}${label ? ` [${label}]` : ''}`,
  };
}

export function removeEdge(doc: LgdlDocument, from: string, to: string): MutationResult {
  const before = doc.edges.length;
  const document: LgdlDocument = {
    ...doc,
    edges: doc.edges.filter((e) => !(e.from === from && e.to === to)),
  };
  if (document.edges.length === before) {
    throw new Error(`Edge not found: ${from} -> ${to}`);
  }
  return {
    document,
    summary: `removed edge ${from} -> ${to}`,
  };
}

export function updateNode(doc: LgdlDocument, opts: UpdateNodeOptions): MutationResult {
  const { id, label, kind } = opts;
  if (!doc.nodes.some((n) => n.id === id)) {
    throw new Error(`Node not found: "${id}"`);
  }

  const document: LgdlDocument = {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === id
        ? { ...n, ...(label !== undefined ? { label } : {}), ...(kind !== undefined ? { kind } : {}) }
        : n,
    ),
  };

  const changes: string[] = [];
  if (label !== undefined) changes.push(`label="${label}"`);
  if (kind !== undefined) changes.push(`kind=${kind}`);
  return { document, summary: `updated node "${id}" (${changes.join(', ')})` };
}
