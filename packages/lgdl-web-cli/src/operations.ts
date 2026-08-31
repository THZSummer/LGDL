/**
 * LGDL 结构化操作层（F-13 ② 自 web-cli-base 迁出的 LGDL 面）。
 *
 * A `LgdlOperation` is a plain JSON-serializable description of ONE
 * incremental edit (add/remove/update a node, edge or group). The CLI
 * commands build these from argv; the Web AI assistant parses them from
 * model output. Both then apply them through the SAME `applyOperation`
 * entry point, so every mutation, validation and warning is identical
 * no matter which front end triggered it.
 *
 * （自 @lgdl/lgdl-core operations.ts → @lgdl/web-cli-base operations.ts 迁入；
 * F-13 ② LGDL 面随业务归位：describeOperation/OperationMutations/LgdlOperation
 * re-export + lgdlDispatch 9 变体分派映射（switch case 体逐行复制）。
 * 组装在 adapters/lgdl.ts：经 base 泛型工厂
 * createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)
 * （ADR-004/D-002：机制留 base，业务随迁）。）
 */
import type {
  LgdlOperation,
  LgdlDocument,
  MutationResult,
  AddNodeOptions,
  AddEdgeOptions,
  UpdateNodeOptions,
  UpdateEdgeOptions,
  AddGroupOptions,
  UpdateGroupOptions,
} from '@lgdl/lgdl-core';
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
} from '@lgdl/lgdl-core';

export type { LgdlOperation } from '@lgdl/lgdl-core';

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

/** 领域 mutation 注入面（ADR-005：分派器与 9 个 mutation 解耦，由适配层注入）。 */
export interface OperationMutations {
  addNode: (doc: LgdlDocument, opts: AddNodeOptions) => MutationResult;
  removeNode: (doc: LgdlDocument, id: string) => MutationResult;
  updateNode: (doc: LgdlDocument, opts: UpdateNodeOptions) => MutationResult;
  addEdge: (doc: LgdlDocument, opts: AddEdgeOptions) => MutationResult;
  removeEdge: (doc: LgdlDocument, from: string, to: string, label?: string) => MutationResult;
  updateEdge: (doc: LgdlDocument, opts: UpdateEdgeOptions) => MutationResult;
  addGroup: (doc: LgdlDocument, opts: AddGroupOptions) => MutationResult;
  removeGroup: (doc: LgdlDocument, id: string) => MutationResult;
  updateGroup: (doc: LgdlDocument, opts: UpdateGroupOptions) => MutationResult;
}

/**
 * LGDL 9 个 op 变体分派映射（ADR-004：switch case 体逐行复制，零改写）。
 * 供 base 泛型工厂 createOperationApplier 注入。
 */
export const lgdlDispatch: Record<string, (doc: LgdlDocument, op: LgdlOperation) => MutationResult> = {
  'add-node': (doc, op) => {
    const o = op as Extract<LgdlOperation, { op: 'add-node' }>;
    return addNode(doc, {
      id: o.id,
      label: o.label,
      kind: o.kind,
      group: o.group,
      members: o.members,
      attrs: o.attrs,
    });
  },
  'remove-node': (doc, op) => removeNode(doc, (op as Extract<LgdlOperation, { op: 'remove-node' }>).id),
  'update-node': (doc, op) => {
    const o = op as Extract<LgdlOperation, { op: 'update-node' }>;
    return updateNode(doc, {
      id: o.id,
      newId: o.newId,
      label: o.label,
      kind: o.kind,
      memberAdd: o.memberAdd,
      memberRemove: o.memberRemove,
      attrs: o.attrs,
    });
  },
  'add-edge': (doc, op) => {
    const o = op as Extract<LgdlOperation, { op: 'add-edge' }>;
    return addEdge(doc, {
      from: o.from,
      to: o.to,
      label: o.label,
      cardinalityFrom: o.cardinalityFrom,
      cardinalityTo: o.cardinalityTo,
      attrs: o.attrs,
    });
  },
  'remove-edge': (doc, op) => {
    const o = op as Extract<LgdlOperation, { op: 'remove-edge' }>;
    return removeEdge(doc, o.from, o.to, o.label);
  },
  'update-edge': (doc, op) => {
    const o = op as Extract<LgdlOperation, { op: 'update-edge' }>;
    return updateEdge(doc, {
      from: o.from,
      to: o.to,
      fromLabel: o.fromLabel,
      newFrom: o.newFrom,
      newTo: o.newTo,
      label: o.label,
      cardinalityFrom: o.cardinalityFrom,
      cardinalityTo: o.cardinalityTo,
      attrs: o.attrs,
    });
  },
  'add-group': (doc, op) => {
    const o = op as Extract<LgdlOperation, { op: 'add-group' }>;
    return addGroup(doc, {
      id: o.id,
      label: o.label,
      contains: o.contains,
    });
  },
  'remove-group': (doc, op) => removeGroup(doc, (op as Extract<LgdlOperation, { op: 'remove-group' }>).id),
  'update-group': (doc, op) => {
    const o = op as Extract<LgdlOperation, { op: 'update-group' }>;
    return updateGroup(doc, {
      id: o.id,
      newId: o.newId,
      label: o.label,
      memberAdd: o.memberAdd,
      memberRemove: o.memberRemove,
      attrs: o.attrs,
    });
  },
};
