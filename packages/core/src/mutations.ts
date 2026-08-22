/**
 * LGDL incremental edit API.
 *
 * The core innovation: AI agents never rewrite the whole document — they
 * apply small, precise mutations (add node, add edge, ...) that only touch
 * the affected area. Layout stability is handled by the layout engine;
 * here we only mutate the semantic model.
 */
import type { LgdlAttrs, LgdlDocument, LgdlEdge, LgdlGroup, LgdlNode, NodeKind } from './types.js';

export interface AddNodeOptions {
  id: string;
  label?: string;
  kind?: NodeKind;
  /** Optional group to place the node into */
  group?: string;
  /** Extension attributes (e.g. gantt start/duration) */
  attrs?: LgdlAttrs;
}

export interface AddEdgeOptions {
  from: string;
  to: string;
  label?: string;
  /** Extension attributes (e.g. ER cardinality) */
  attrs?: LgdlAttrs;
}

export interface UpdateNodeOptions {
  id: string;
  label?: string;
  kind?: NodeKind;
  /** Replace extension attributes (merge) */
  attrs?: LgdlAttrs;
}

export interface UpdateEdgeOptions {
  from: string;
  to: string;
  label?: string;
  /** Replace extension attributes (merge) */
  attrs?: LgdlAttrs;
}

export interface AddGroupOptions {
  id: string;
  label?: string;
  /** Initial member ids — node ids and/or existing group ids (nesting) */
  contains?: string[];
}

/** Result of a mutation: the new document + a human/AI-readable summary. */
export interface MutationResult {
  document: LgdlDocument;
  summary: string;
}

export function addNode(doc: LgdlDocument, opts: AddNodeOptions): MutationResult {
  const { id, label, kind, group, attrs } = opts;

  if (doc.nodes.some((n) => n.id === id)) {
    throw new Error(`Node id already exists: "${id}"`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid node id: "${id}" (letters, digits, underscore, hyphen only)`);
  }

  const node: LgdlNode = {
    id,
    label: label ?? id,
    kind: kind ?? 'process',
    ...(attrs !== undefined ? { attrs } : {}),
  };

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
  const { from, to, label, attrs } = opts;

  const isNode = (id: string) => doc.nodes.some((n) => n.id === id);
  const isGroup = (id: string) => doc.groups.some((g) => g.id === id);
  if (!isNode(from) && !isGroup(from)) {
    throw new Error(`Source node or group not found: "${from}"`);
  }
  if (!isNode(to) && !isGroup(to)) {
    throw new Error(`Target node or group not found: "${to}"`);
  }
  if (from === to) {
    throw new Error(`Self-loop edges are not supported (from === to === "${from}")`);
  }
  if (doc.edges.some((e) => e.from === from && e.to === to)) {
    throw new Error(`Edge already exists: ${from} -> ${to}`);
  }

  const edge: LgdlEdge = { from, to, label, ...(attrs !== undefined ? { attrs } : {}) };

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
  const { id, label, kind, attrs } = opts;
  if (!doc.nodes.some((n) => n.id === id)) {
    throw new Error(`Node not found: "${id}"`);
  }

  const document: LgdlDocument = {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === id
        ? {
            ...n,
            ...(label !== undefined ? { label } : {}),
            ...(kind !== undefined ? { kind } : {}),
            ...(attrs !== undefined ? { attrs: { ...n.attrs, ...attrs } } : {}),
          }
        : n,
    ),
  };

  const changes: string[] = [];
  if (label !== undefined) changes.push(`label="${label}"`);
  if (kind !== undefined) changes.push(`kind=${kind}`);
  if (attrs !== undefined) changes.push(`attrs={${Object.keys(attrs).join(',')}}`);
  return { document, summary: `updated node "${id}" (${changes.join(', ')})` };
}

export function updateEdge(doc: LgdlDocument, opts: UpdateEdgeOptions): MutationResult {
  const { from, to, label, attrs } = opts;
  if (!doc.edges.some((e) => e.from === from && e.to === to)) {
    throw new Error(`Edge not found: ${from} -> ${to}`);
  }

  const document: LgdlDocument = {
    ...doc,
    edges: doc.edges.map((e) =>
      e.from === from && e.to === to
        ? {
            ...e,
            ...(label !== undefined ? { label } : {}),
            ...(attrs !== undefined ? { attrs: { ...e.attrs, ...attrs } } : {}),
          }
        : e,
    ),
  };

  const changes: string[] = [];
  if (label !== undefined) changes.push(`label="${label}"`);
  if (attrs !== undefined) changes.push(`attrs={${Object.keys(attrs).join(',')}}`);
  return { document, summary: `updated edge ${from} -> ${to} (${changes.join(', ')})` };
}

export function addGroup(doc: LgdlDocument, opts: AddGroupOptions): MutationResult {
  const { id, label, contains } = opts;
  if (doc.groups.some((g) => g.id === id)) {
    throw new Error(`Group id already exists: "${id}"`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid group id: "${id}" (letters, digits, underscore, hyphen only)`);
  }

  const memberIds = contains ?? [];
  // existing membership map: member id -> owning group id
  const membersOf = new Map<string, string>();
  for (const g of doc.groups) {
    for (const m of g.contains) {
      if (!membersOf.has(m)) membersOf.set(m, g.id);
    }
  }

  for (const memberId of memberIds) {
    if (memberId === id) {
      throw new Error(`Group cannot contain itself: "${id}"`);
    }
    const isNode = doc.nodes.some((n) => n.id === memberId);
    const isGroup = doc.groups.some((g) => g.id === memberId);
    if (!isNode && !isGroup) {
      throw new Error(`Group contains unknown node or group: "${memberId}"`);
    }
    if (membersOf.has(memberId)) {
      throw new Error(`"${memberId}" already belongs to group "${membersOf.get(memberId)}"`);
    }
  }

  const group: LgdlGroup = { id, label, contains: memberIds };
  return {
    document: { ...doc, groups: [...doc.groups, group] },
    summary: `added group "${id}"${label ? ` (${label})` : ''}${memberIds.length > 0 ? ` with ${memberIds.length} member(s)` : ''}`,
  };
}

export function removeGroup(doc: LgdlDocument, id: string): MutationResult {
  if (!doc.groups.some((g) => g.id === id)) {
    throw new Error(`Group not found: "${id}"`);
  }
  // remove the group and detach it from any parent group's contains
  return {
    document: {
      ...doc,
      groups: doc.groups
        .filter((g) => g.id !== id)
        .map((g) => ({ ...g, contains: g.contains.filter((c) => c !== id) })),
    },
    summary: `removed group "${id}"`,
  };
}
