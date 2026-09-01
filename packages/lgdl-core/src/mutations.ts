/**
 * LGDL incremental edit API.
 *
 * The core innovation: AI agents never rewrite the whole document — they
 * apply small, precise mutations (add node, add edge, ...) that only touch
 * the affected area. Layout stability is handled by the layout engine;
 * here we only mutate the semantic model.
 */
import type { LgdlAttrs, LgdlDocument, LgdlEdge, LgdlMember, LgdlNode, NodeKind } from './types.js';
import { deriveGroups, groupNodes } from './groups.js';

const MEMBER_KINDS = ['attribute', 'method'];
const MEMBER_VISIBILITIES = ['public', 'private', 'protected', 'package'];

/** Shape-check a class member; throws with a precise message on bad input. */
export function assertMemberShape(member: LgdlMember, context: string): void {
  if (!member || typeof member !== 'object') {
    throw new Error(`${context}: member must be an object with "kind" and "name"`);
  }
  if (!MEMBER_KINDS.includes(member.kind)) {
    throw new Error(`${context}: unknown member kind "${member.kind ?? ''}" (attribute|method)`);
  }
  if (typeof member.name !== 'string' || member.name.trim() === '') {
    throw new Error(`${context}: member name is required`);
  }
  if (member.visibility !== undefined && !MEMBER_VISIBILITIES.includes(member.visibility)) {
    throw new Error(
      `${context}: unknown visibility "${member.visibility}" (public|private|protected|package)`,
    );
  }
  if (member.kind === 'attribute' && member.params !== undefined) {
    throw new Error(`${context}: attribute "${member.name}" must not have params (methods only)`);
  }
}

/**
 * Shared `contains` membership validation (FR-014) — used by both the
 * add-node path (initial members via `contains`) and the update-node path
 * (members via `containsAdd`), so both routes reject the same inputs with
 * the same messages.
 *
 * Validation order (kept identical to the legacy group mutation helpers):
 *   self-containment → unknown member → already-in-target-group → duplicate
 * ownership (a member already owned by another group, which also covers
 * nesting conflicts). Throws on the first violation; the caller's document
 * must stay untouched when this throws (FR-002 atomicity).
 */
function validateContainsMembers(
  doc: LgdlDocument,
  groupId: string,
  memberIds: string[],
  opts?: { alreadyInTarget?: boolean },
): void {
  const groups = deriveGroups(doc);
  // existing membership map: member id -> owning group id
  const membersOf = new Map<string, string>();
  for (const g of groups) {
    for (const m of g.contains) {
      if (!membersOf.has(m)) membersOf.set(m, g.id);
    }
  }
  for (const memberId of memberIds) {
    if (memberId === groupId) {
      throw new Error(`Group cannot contain itself: "${groupId}"`);
    }
    const isNode = doc.nodes.some((n) => n.id === memberId);
    const isGroup = groups.some((g) => g.id === memberId);
    if (!isNode && !isGroup) {
      throw new Error(`Group contains unknown node or group: "${memberId}"`);
    }
    if (
      opts?.alreadyInTarget &&
      (doc.nodes.find((n) => n.id === groupId)?.contains ?? []).includes(memberId)
    ) {
      throw new Error(`"${memberId}" is already in group "${groupId}"`);
    }
    if (membersOf.has(memberId)) {
      throw new Error(`"${memberId}" already belongs to group "${membersOf.get(memberId)}"`);
    }
  }
}

export interface AddNodeOptions {
  id: string;
  label?: string;
  kind?: NodeKind;
  /** Optional group to place the node into */
  group?: string;
  /** Structured class members (uml-class entity nodes) */
  members?: LgdlMember[];
  /**
   * Initial member ids of a group node — only valid together with
   * `kind: 'group'` (DD-002: loud reject otherwise). Node ids and/or
   * existing group ids (nesting).
   */
  contains?: string[];
  /** Extension attributes (e.g. gantt start/duration) */
  attrs?: LgdlAttrs;
}

export interface AddEdgeOptions {
  from: string;
  to: string;
  /** Relationship name (business semantics only) */
  label?: string;
  /** ER / UML multiplicity at the source end, e.g. "1", "*", "0..1" */
  cardinalityFrom?: string;
  /** ER / UML multiplicity at the target end, e.g. "1", "*", "0..*" */
  cardinalityTo?: string;
  /** Extension attributes */
  attrs?: LgdlAttrs;
}

export interface UpdateNodeOptions {
  id: string;
  /** Rename the node — edges and group membership are rewritten too */
  newId?: string;
  label?: string;
  kind?: NodeKind;
  /** Append a structured class member */
  memberAdd?: LgdlMember;
  /** Remove a class member by name */
  memberRemove?: string;
  /**
   * Append member ids to a group node's `contains` (id semantics — DD-001).
   * Only valid on `kind: 'group'` nodes; independent from `memberAdd`
   * (which keeps its structured class-member semantics).
   */
  containsAdd?: string[];
  /**
   * Remove member ids from a group node's `contains` (id semantics — DD-001).
   * Only valid on `kind: 'group'` nodes; independent from `memberRemove`.
   */
  containsRemove?: string[];
  /** Replace extension attributes (merge) */
  attrs?: LgdlAttrs;
}

export interface UpdateEdgeOptions {
  from: string;
  to: string;
  /** Locate a specific parallel edge by its current label (required when
   * several edges share the same from/to) */
  fromLabel?: string;
  /** Rewrite the source endpoint (references are kept, label/cardinality/attrs preserved) */
  newFrom?: string;
  /** Rewrite the target endpoint */
  newTo?: string;
  label?: string;
  /** Replace the source-end multiplicity */
  cardinalityFrom?: string;
  /** Replace the target-end multiplicity */
  cardinalityTo?: string;
  /** Replace extension attributes (merge) */
  attrs?: LgdlAttrs;
}

/** Result of a mutation: the new document + a human/AI-readable summary. */
export interface MutationResult {
  document: LgdlDocument;
  summary: string;
}

export function addNode(doc: LgdlDocument, opts: AddNodeOptions): MutationResult {
  const { id, label, kind, group, members, contains, attrs } = opts;

  if (doc.nodes.some((n) => n.id === id)) {
    throw new Error(`Node id already exists: "${id}"`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid node id: "${id}" (letters, digits, underscore, hyphen only)`);
  }
  members?.forEach((m, i) => assertMemberShape(m, `member ${i} of node "${id}"`));

  const resolvedKind = kind ?? 'process';
  if (contains !== undefined && resolvedKind !== 'group') {
    // DD-002 backstop: `contains` is only meaningful on group nodes. The
    // command layer enforces this first (buildOperation); this core check
    // protects direct API callers from silently losing their members (the
    // node would otherwise be created without `contains` — a silent data
    // error, since `contains` is ignored on non-group kinds).
    throw new Error(
      `--contains 仅对 kind:'group' 节点有效（当前 kind: "${resolvedKind}"），请显式传 --kind group`,
    );
  }
  if (contains !== undefined) {
    validateContainsMembers(doc, id, contains);
  }

  const node: LgdlNode = {
    id,
    label: label ?? id,
    kind: resolvedKind,
    ...(contains !== undefined ? { contains } : {}),
    ...(members !== undefined && members.length > 0 ? { members } : {}),
    ...(attrs !== undefined ? { attrs } : {}),
  };

  const document: LgdlDocument = {
    ...doc,
    nodes: [...doc.nodes, node],
  };

  let summary = `added node "${id}"${label ? ` (${label})` : ''}${kind ? ` :${kind}` : ''}`;
  if (members && members.length > 0) summary += ` with ${members.length} member(s)`;
  else if (contains && contains.length > 0) summary += ` with ${contains.length} member(s)`;

  if (group) {
    if (!groupNodes(doc).some((n) => n.id === group)) {
      throw new Error(`Group not found: "${group}"`);
    }
    // place the node into the group by updating the group node's `contains`
    document.nodes = document.nodes.map((n) =>
      n.kind === 'group' && n.id === group
        ? { ...n, contains: [...(n.contains ?? []), id] }
        : n,
    );
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
    nodes: doc.nodes
      .filter((n) => n.id !== id)
      .map((n) =>
        n.kind === 'group' ? { ...n, contains: (n.contains ?? []).filter((c) => c !== id) } : n,
      ),
    // auto-clean edges touching it
    edges: doc.edges.filter((e) => e.from !== id && e.to !== id),
  };

  const removedEdges = doc.edges.filter((e) => e.from === id || e.to === id).length;
  return {
    document,
    summary: `removed node "${id}"${removedEdges > 0 ? ` and ${removedEdges} attached edge(s)` : ''}`,
  };
}

export function addEdge(doc: LgdlDocument, opts: AddEdgeOptions): MutationResult {
  const { from, to, label, cardinalityFrom, cardinalityTo, attrs } = opts;

  const isNode = (id: string) => doc.nodes.some((n) => n.id === id);
  const isGroup = (id: string) => groupNodes(doc).some((n) => n.id === id);
  if (!isNode(from) && !isGroup(from)) {
    throw new Error(`Source node or group not found: "${from}"`);
  }
  if (!isNode(to) && !isGroup(to)) {
    throw new Error(`Target node or group not found: "${to}"`);
  }
  if (from === to) {
    throw new Error(`Self-loop edges are not supported (from === to === "${from}")`);
  }
  // Duplicate rule: an explicit label makes the edge a distinct relation
  // (ER: USER --places--> ORDER vs USER --manages--> ORDER), but an
  // unlabeled add-edge means "this edge" — any a->b edge is a duplicate.
  const relKey = (e: LgdlEdge): string => (e.attrs?.relation as string | undefined) ?? '';
  if (
    doc.edges.some((e) =>
      e.from === from &&
      e.to === to &&
      (label !== undefined ? e.label === label : relKey(e) === relKey({ from, to, attrs })),
    )
  ) {
    throw new Error(`Edge already exists: ${from} -> ${to}${label ? ` [${label}]` : ''}`);
  }

  const edge: LgdlEdge = {
    from,
    to,
    label,
    ...(cardinalityFrom !== undefined ? { cardinalityFrom } : {}),
    ...(cardinalityTo !== undefined ? { cardinalityTo } : {}),
    ...(attrs !== undefined ? { attrs } : {}),
  };

  return {
    document: { ...doc, edges: [...doc.edges, edge] },
    summary: `added edge ${from} -> ${to}${label ? ` [${label}]` : ''}${cardinalityFrom || cardinalityTo ? ` (from=${cardinalityFrom ?? '?'}, to=${cardinalityTo ?? '?'})` : ''}`,
  };
}

export function removeEdge(doc: LgdlDocument, from: string, to: string, label?: string): MutationResult {
  // --edge-label matches the label first; only when no edge carries that
  // label do we fall back to attrs.relation — so a label that happens to
  // equal another edge's relation never deletes both silently
  const candidates = doc.edges.filter((e) => e.from === from && e.to === to);
  let matched = candidates.filter((e) => e.label === label);
  if (label !== undefined && matched.length === 0) {
    matched = candidates.filter((e) => e.attrs?.relation === label);
  }
  const targets = matched;
  // several edges share the same label: refuse — silently deleting all of
  // them would be data loss; there is no way to tell them apart via CLI
  if (matched.length > 1) {
    throw new Error(
      `Multiple edges ${from} -> ${to} share the label "${label}" (relations: ${matched.map((e) => e.attrs?.relation ?? '(none)').join(', ')}) — edges sharing a label cannot be individually removed via CLI`,
    );
  }
  const matchedIdx = new Set(matched.map((e) => doc.edges.indexOf(e)));
  // several parallel edges exist and no label given: refuse instead of
  // silently deleting all of them (matches the --label help text)
  if (candidates.length > 1 && label === undefined) {
    throw new Error(
      `Multiple edges ${from} -> ${to} exist (${candidates.map((e) => e.label ?? '(no label)').join(', ')}) — pass --edge-label to pick the one to remove`,
    );
  }
  const before = doc.edges.length;
  const document: LgdlDocument = {
    ...doc,
    // without a label: remove every edge on (from, to); with a label:
    // remove only that exact parallel edge
    edges: doc.edges.filter((e, idx) => !(e.from === from && e.to === to && (label === undefined || matchedIdx.has(idx)))),
  };
  const removed = before - document.edges.length;
  if (removed === 0) {
    throw new Error(`Edge not found: ${from} -> ${to}${label ? ` [${label}]` : ''}`);
  }
  return {
    document,
    summary: `removed ${removed} edge(s) ${from} -> ${to}${label ? ` [${label}]` : ''}`,
  };
}

export function updateNode(doc: LgdlDocument, opts: UpdateNodeOptions): MutationResult {
  const { id, newId, label, kind, memberAdd, memberRemove, containsAdd, containsRemove, attrs } = opts;
  const target = doc.nodes.find((n) => n.id === id);
  if (!target) {
    throw new Error(`Node not found: "${id}"`);
  }
  // renaming to the current id is a no-op — other fields still update
  const rename = newId !== undefined && newId !== id ? newId : undefined;
  if (rename !== undefined) {
    if (!/^[A-Za-z0-9_-]+$/.test(rename)) {
      throw new Error(`Invalid node id: "${rename}" (letters, digits, underscore, hyphen only)`);
    }
    if (doc.nodes.some((n) => n.id === rename)) {
      throw new Error(`Node id already exists: "${rename}"`);
    }
  }
  // DD-003: a group node must not change kind — dropping `group` would leave
  // an orphan `contains` (only meaningful on group nodes). Changing kind to
  // the same value ('group' -> 'group') is a no-op; the reverse direction
  // (non-group -> group) keeps the existing updateNode behavior (empty
  // `contains`, no orphan risk).
  if (kind !== undefined && target.kind === 'group' && kind !== 'group') {
    throw new Error(
      `分组节点不允许修改 kind（节点 "${id}" 为 kind:'group'，改掉会留下无意义的 contains 字段）；如需删除分组请用 remove-node`,
    );
  }
  // DD-001: contains membership operations are only meaningful on group nodes.
  const hasContainsOp = containsAdd !== undefined || containsRemove !== undefined;
  if (hasContainsOp && target.kind !== 'group') {
    throw new Error(
      `contains-add/contains-remove 仅对 kind:'group' 节点有效（节点 "${id}" 的 kind 为 "${target.kind ?? 'process'}"）`,
    );
  }
  // EC-008: empty / whitespace-only member ids are rejected up front
  if (
    (containsAdd?.some((m) => m.trim() === '') ?? false) ||
    (containsRemove?.some((m) => m.trim() === '') ?? false)
  ) {
    throw new Error(`contains-add/contains-remove: 成员 id 不能为空`);
  }
  if (memberAdd) assertMemberShape(memberAdd, `member "${memberAdd.name ?? ''}" of node "${id}"`);
  if (memberRemove && memberRemove.trim() === '') {
    throw new Error(`memberRemove: name is required`);
  }
  if (memberRemove && !(target.members ?? []).some((m) => m.name === memberRemove)) {
    throw new Error(`Member not found: "${memberRemove}" on node "${id}"`);
  }
  if (containsAdd !== undefined) {
    validateContainsMembers(doc, id, containsAdd, { alreadyInTarget: true });
  }
  if (containsRemove !== undefined) {
    for (const memberId of containsRemove) {
      if (!(target.contains ?? []).includes(memberId)) {
        throw new Error(`Member not found: "${memberId}" in group "${id}"`);
      }
    }
  }
  const finalId = rename ?? id;

  // DD-001: when both are given, apply adds first, then removes
  // (same order as the legacy group update helper).
  let contains = target.contains;
  if (containsAdd !== undefined) contains = [...(contains ?? []), ...containsAdd];
  if (containsRemove !== undefined) {
    contains = (contains ?? []).filter((m) => !containsRemove.includes(m));
  }

  const document: LgdlDocument = {
    ...doc,
    nodes: doc.nodes.map((n) => {
      // a group node containing the renamed node gets its membership reference
      // rewritten (id -> finalId); groups are nodes now, so this rides in the
      // same `nodes` array rather than a separate `groups` list
      let cur: LgdlNode = n;
      if (n.kind === 'group' && (n.contains ?? []).includes(id)) {
        cur = { ...n, contains: (n.contains ?? []).map((m) => (m === id ? finalId : m)) };
      }
      if (cur.id !== id) return cur;
      let members = cur.members;
      if (memberAdd) members = [...(members ?? []), memberAdd];
      if (memberRemove) members = members?.filter((m) => m.name !== memberRemove) ?? [];
      return {
        ...cur,
        ...(rename !== undefined ? { id: finalId } : {}),
        ...(label !== undefined ? { label } : {}),
        ...(kind !== undefined ? { kind } : {}),
        ...(containsAdd !== undefined || containsRemove !== undefined ? { contains } : {}),
        ...(members !== undefined ? { members: members.length > 0 ? members : undefined } : {}),
        ...(attrs !== undefined ? { attrs: { ...cur.attrs, ...attrs } } : {}),
      };
    }),
    // rewrite every reference to the renamed node
    edges: doc.edges.map((e) => ({
      ...e,
      from: e.from === id ? finalId : e.from,
      to: e.to === id ? finalId : e.to,
    })),
  };

  const changes: string[] = [];
  if (rename !== undefined) changes.push(`id="${rename}"`);
  if (label !== undefined) changes.push(`label="${label}"`);
  if (kind !== undefined) changes.push(`kind=${kind}`);
  if (containsAdd !== undefined) changes.push(...containsAdd.map((m) => `contains+ ${m}`));
  if (containsRemove !== undefined) changes.push(...containsRemove.map((m) => `contains- ${m}`));
  if (memberAdd) changes.push(`member+ ${memberAdd.name}`);
  if (memberRemove) changes.push(`member- ${memberRemove}`);
  if (attrs !== undefined) changes.push(`attrs={${Object.keys(attrs).join(',')}}`);
  return { document, summary: `updated node "${id}" (${changes.join(', ')})` };
}

export function updateEdge(doc: LgdlDocument, opts: UpdateEdgeOptions): MutationResult {
  const { from, to, fromLabel, newFrom, newTo, label, cardinalityFrom, cardinalityTo, attrs } = opts;
  if (newFrom !== undefined && !doc.nodes.some((n) => n.id === newFrom)) {
    throw new Error(`New source node or group not found: "${newFrom}"`);
  }
  if (newTo !== undefined && !doc.nodes.some((n) => n.id === newTo)) {
    throw new Error(`New target node or group not found: "${newTo}"`);
  }
  let matches = doc.edges.filter(
    (e) => e.from === from && e.to === to && (fromLabel === undefined || e.label === fromLabel),
  );
  if (fromLabel !== undefined && matches.length === 0) {
    matches = doc.edges.filter(
      (e) => e.from === from && e.to === to && e.attrs?.relation === fromLabel,
    );
  }
  if (matches.length === 0) {
    throw new Error(`Edge not found: ${from} -> ${to}${fromLabel ? ` [${fromLabel}]` : ''}`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple edges ${from} -> ${to} exist (${matches.map((e) => e.label ?? '(no label)').join(', ')}) — pass --edge-label to pick the one to update`,
    );
  }

  const matchedIdx = new Set(matches.map((e) => doc.edges.indexOf(e)));
  const document: LgdlDocument = {
    ...doc,
    edges: doc.edges.map((e, idx) => {
      if (!(e.from === from && e.to === to && (fromLabel === undefined || matchedIdx.has(idx)))) return e;
      const n: LgdlEdge = { ...e };
      if (newFrom !== undefined) n.from = newFrom;
      if (newTo !== undefined) n.to = newTo;
      if (label !== undefined) n.label = label;
      // an empty string clears the cardinality field ("--cardinality-from """)
      if (cardinalityFrom !== undefined) {
        if (cardinalityFrom === '') delete n.cardinalityFrom;
        else n.cardinalityFrom = cardinalityFrom;
      }
      if (cardinalityTo !== undefined) {
        if (cardinalityTo === '') delete n.cardinalityTo;
        else n.cardinalityTo = cardinalityTo;
      }
      if (attrs !== undefined) n.attrs = { ...e.attrs, ...attrs };
      return n;
    }),
  };

  const changes: string[] = [];
  if (newFrom !== undefined) changes.push(`from="${newFrom}"`);
  if (newTo !== undefined) changes.push(`to="${newTo}"`);
  if (label !== undefined) changes.push(`label="${label}"`);
  if (cardinalityFrom !== undefined) changes.push(`cardinalityFrom=${cardinalityFrom}`);
  if (cardinalityTo !== undefined) changes.push(`cardinalityTo=${cardinalityTo}`);
  if (attrs !== undefined) changes.push(`attrs={${Object.keys(attrs).join(',')}}`);
  return { document, summary: `updated edge ${from} -> ${to} (${changes.join(', ')})` };
}
