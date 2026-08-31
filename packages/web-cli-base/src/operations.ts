/**
 * Structured operation layer — generic injection dispatcher (mechanism shell).
 *
 * F-13 ② 纯化后：LGDL 面（describeOperation / OperationMutations / LgdlOperation
 * re-export / 9 变体分派）已随迁 web-cli 业务包/src/operations.ts
 * （lgdlDispatch 定义于该包），本模块仅保留中性泛型注入分派器。
 *
 * A `Op` is a plain JSON-serializable description of ONE incremental edit.
 * The CLI commands build these from argv; the Web AI assistant parses them
 * from model output. Both then apply them through the SAME `applyOperation`
 * entry point, so every mutation, validation and warning is identical
 * no matter which front end triggered it.
 *
 * The dispatch map (op name → mutation call) is injected by the domain
 * adapter (web-cli: lgdlDispatch), keeping this module domain-neutral.
 */
import type { MutationResult } from './exec.js';

export interface OperationBatchResult<Doc> {
  /** The document after the applied operations (unchanged on failure). */
  document: Doc;
  /** Per-op outcomes in order: summaries of applied ops, null for skipped. */
  results: (MutationResult<Doc> | null)[];
  /** Index of the first failed operation, or -1 when all succeeded. */
  failedIndex: number;
  /** Error message of the failed operation (when failedIndex !== -1). */
  error: string | null;
}

/**
 * 注入工厂：返回 { applyOperation, applyOperations } 分派器（ADR-005，泛型化 ADR-004）。
 * dispatch = op 名称 → mutation 调用映射（9 变体 case 体由领域侧注入，web-cli）。
 */
export function createOperationApplier<Op, Doc>(
  dispatch: Record<string, (doc: Doc, op: Op) => MutationResult<Doc>>,
): {
  applyOperation: (doc: Doc, operation: Op) => MutationResult<Doc>;
  applyOperations: (doc: Doc, ops: Op[]) => OperationBatchResult<Doc>;
} {
  /** Apply ONE structured operation to a document. Throws on invalid ops. */
  function applyOperation(doc: Doc, operation: Op): MutationResult<Doc> {
    const name = (operation as { op?: string }).op;
    const fn = dispatch[name ?? ''];
    if (!fn) throw new Error(`未知操作 "${name ?? ''}"`);
    return fn(doc, operation);
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
  function applyOperations(doc: Doc, ops: Op[]): OperationBatchResult<Doc> {
    let current = doc;
    const results: (MutationResult<Doc> | null)[] = [];
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

  return { applyOperation, applyOperations };
}
