/**
 * Structured operation layer — the shared "incremental edit protocol" for
 * both the CLI and the Web AI assistant.
 *
 * A `LgdlOperation` is a plain JSON-serializable description of ONE
 * incremental edit (add/remove/update a node, edge or group). The CLI
 * commands build these from argv; the Web AI assistant parses them from
 * model output. Both then apply them through the SAME `applyOperation`
 * entry point, so every mutation, validation and warning is identical
 * no matter which front end triggered it.
 *
 * This is the single place that maps an operation to its mutation
 * function; adding a new incremental command means adding one op variant
 * here (and its CLI/Web surface), never a second implementation.
 */
import {
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  updateNode,
  updateEdge,
  addGroup,
  removeGroup,
  updateGroup,
  type MutationResult,
} from './mutations.js';
import type { LgdlDocument, NodeKind, LgdlMember, LgdlAttrs } from './types.js';

/** One structured incremental edit. JSON-serializable; unknown fields are ignored. */
export type LgdlOperation =
  | {
      op: 'add-node';
      id: string;
      label?: string;
      kind?: NodeKind;
      group?: string;
      members?: LgdlMember[];
      attrs?: LgdlAttrs;
    }
  | { op: 'remove-node'; id: string }
  | {
      op: 'update-node';
      id: string;
      newId?: string;
      label?: string;
      kind?: NodeKind;
      memberAdd?: LgdlMember;
      memberRemove?: string;
      attrs?: LgdlAttrs;
    }
  | {
      op: 'add-edge';
      from: string;
      to: string;
      label?: string;
      cardinalityFrom?: string;
      cardinalityTo?: string;
      attrs?: LgdlAttrs;
    }
  | { op: 'remove-edge'; from: string; to: string; label?: string }
  | {
      op: 'update-edge';
      from: string;
      to: string;
      fromLabel?: string;
      newFrom?: string;
      newTo?: string;
      label?: string;
      cardinalityFrom?: string;
      cardinalityTo?: string;
      attrs?: LgdlAttrs;
    }
  | { op: 'add-group'; id: string; label?: string; contains?: string[] }
  | { op: 'remove-group'; id: string }
  | {
      op: 'update-group';
      id: string;
      newId?: string;
      label?: string;
      memberAdd?: string;
      memberRemove?: string;
      attrs?: LgdlAttrs;
    };

/** Human/AI-readable op label, e.g. `update-node user`. */
export function describeOperation(op: LgdlOperation): string {
  switch (op.op) {
    case 'add-node':
      return `add-node ${op.id}${op.label ? ` (${op.label})` : ''}`;
    case 'remove-node':
      return `remove-node ${op.id}`;
    case 'update-node':
      return `update-node ${op.id}`;
    case 'add-edge':
      return `add-edge ${op.from} -> ${op.to}${op.label ? ` [${op.label}]` : ''}`;
    case 'remove-edge':
      return `remove-edge ${op.from} -> ${op.to}${op.label ? ` [${op.label}]` : ''}`;
    case 'update-edge':
      return `update-edge ${op.from} -> ${op.to}`;
    case 'add-group':
      return `add-group ${op.id}`;
    case 'remove-group':
      return `remove-group ${op.id}`;
    case 'update-group':
      return `update-group ${op.id}`;
  }
}

/** Apply ONE structured operation to a document. Throws on invalid ops. */
export function applyOperation(doc: LgdlDocument, operation: LgdlOperation): MutationResult {
  switch (operation.op) {
    case 'add-node':
      return addNode(doc, {
        id: operation.id,
        label: operation.label,
        kind: operation.kind,
        group: operation.group,
        members: operation.members,
        attrs: operation.attrs,
      });
    case 'remove-node':
      return removeNode(doc, operation.id);
    case 'update-node':
      return updateNode(doc, {
        id: operation.id,
        newId: operation.newId,
        label: operation.label,
        kind: operation.kind,
        memberAdd: operation.memberAdd,
        memberRemove: operation.memberRemove,
        attrs: operation.attrs,
      });
    case 'add-edge':
      return addEdge(doc, {
        from: operation.from,
        to: operation.to,
        label: operation.label,
        cardinalityFrom: operation.cardinalityFrom,
        cardinalityTo: operation.cardinalityTo,
        attrs: operation.attrs,
      });
    case 'remove-edge':
      return removeEdge(doc, operation.from, operation.to, operation.label);
    case 'update-edge':
      return updateEdge(doc, {
        from: operation.from,
        to: operation.to,
        fromLabel: operation.fromLabel,
        newFrom: operation.newFrom,
        newTo: operation.newTo,
        label: operation.label,
        cardinalityFrom: operation.cardinalityFrom,
        cardinalityTo: operation.cardinalityTo,
        attrs: operation.attrs,
      });
    case 'add-group':
      return addGroup(doc, {
        id: operation.id,
        label: operation.label,
        contains: operation.contains,
      });
    case 'remove-group':
      return removeGroup(doc, operation.id);
    case 'update-group':
      return updateGroup(doc, {
        id: operation.id,
        newId: operation.newId,
        label: operation.label,
        memberAdd: operation.memberAdd,
        memberRemove: operation.memberRemove,
        attrs: operation.attrs,
      });
  }
}

export interface OperationBatchResult {
  /** The document after the applied operations (unchanged on failure). */
  document: LgdlDocument;
  /** Per-op outcomes in order: summaries of applied ops, null for skipped. */
  results: (MutationResult | null)[];
  /** Index of the first failed operation, or -1 when all succeeded. */
  failedIndex: number;
  /** Error message of the failed operation (when failedIndex !== -1). */
  error: string | null;
}

/**
 * Apply a SEQUENCE of operations, stopping at the first failure.
 *
 * All-or-nothing per op: each operation is applied to the accumulated
 * document; if one throws, the batch returns the document as of the last
 * successful op plus the failure details — the caller decides whether to
 * keep the partial result or revert. `validate()` is NOT run here: the
 * mutations already enforce structural invariants, and full validation is
 * the caller's job (CLI re-validates before saving; Web validates before
 * rendering).
 */
export function applyOperations(doc: LgdlDocument, ops: LgdlOperation[]): OperationBatchResult {
  let current = doc;
  const results: (MutationResult | null)[] = [];
  for (let i = 0; i < ops.length; i++) {
    try {
      const r = applyOperation(current, ops[i]);
      results.push(r);
      current = r.document;
    } catch (err) {
      results.push(null);
      // pad the remaining (never-executed) ops with null so every op has a slot
      while (results.length < ops.length) results.push(null);
      return {
        document: current,
        results,
        failedIndex: i,
        error: (err as Error).message,
      };
    }
  }
  return { document: current, results, failedIndex: -1, error: null };
}
