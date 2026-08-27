/**
 * Group-node helpers.
 *
 * The model is UNIFIED: a group is a node (`kind === 'group'`) carrying
 * `contains`. There is no separate document-level group list — consumers derive
 * it from `nodes` via these helpers.
 */
import type { LgdlDocument, LgdlGroup, LgdlNode } from './types.js';

/**
 * The group NODES of a document, in document order. A group is a node with
 * `kind === 'group'`; these are returned as full nodes so callers can read
 * `kind`/`label`/`contains`/`attrs`.
 */
export function groupNodes(doc: Pick<LgdlDocument, 'nodes'>): LgdlNode[] {
  return doc.nodes.filter((n) => n.kind === 'group');
}

/**
 * Project the group nodes to the `LgdlGroup` container shape
 * (`{ id, label, contains, attrs }`), preserving document order. Consumers that
 * previously read `doc.groups` now use this.
 */
export function deriveGroups(doc: Pick<LgdlDocument, 'nodes'>): LgdlGroup[] {
  return doc.nodes
    .filter((n) => n.kind === 'group')
    .map((n) => {
      const g: LgdlGroup = { id: n.id, contains: [...(n.contains ?? [])] };
      if (n.label !== undefined) g.label = n.label;
      if (n.attrs !== undefined) g.attrs = n.attrs;
      return g;
    });
}
