/**
 * Web AI 操作执行器：把 AI 回复中的增量操作指令（```ops JSON 数组）
 * 应用到编辑器当前源码，复用 @lgdl/core 的 applyOperations——与 CLI
 * 完全同一套 mutation/校验语义，无需第二套实现。
 */
import {
  parseLgdl,
  validate,
  serializeLgdl,
  applyOperations,
  describeOperation,
  type LgdlOperation,
} from '@lgdl/core';

const KNOWN_OPS = new Set([
  'add-node',
  'remove-node',
  'update-node',
  'add-edge',
  'remove-edge',
  'update-edge',
  'add-group',
  'remove-group',
  'update-group',
]);

/**
 * 从 AI 回复文本中提取 ```ops 代码块里的操作数组。
 * 结构必须是 JSON 数组，每项含 op 字段且 op 为已知操作；否则返回 null。
 */
export function extractOperations(text: string): LgdlOperation[] | null {
  const m = text.match(/```ops\s*\n([\s\S]*?)```/);
  if (!m) return null;
  try {
    const parsed: unknown = JSON.parse(m[1]);
    if (!Array.isArray(parsed)) return null;
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) return null;
      const op = (item as { op?: unknown }).op;
      if (typeof op !== 'string' || !KNOWN_OPS.has(op)) return null;
    }
    return parsed as LgdlOperation[];
  } catch {
    return null;
  }
}

export interface OpsApplyResult {
  ok: boolean;
  /** 应用成功后的新源码（ok 时存在） */
  source?: string;
  /** 每条操作的人类可读摘要（ok 时存在） */
  summaries?: string[];
  /** 失败原因（!ok 时存在） */
  error?: string;
}

/** 把操作序列应用到当前源码。逐条 applyOperations，失败即停并返回原因。 */
export function applyOpsToSource(source: string, ops: LgdlOperation[]): OpsApplyResult {
  const parsed = parseLgdl(source);
  if (!parsed.valid) {
    return {
      ok: false,
      error: `当前源码有 ${parsed.issues.filter((i) => i.severity === 'error').length} 个错误，无法执行操作`,
    };
  }
  const batch = applyOperations(parsed.document, ops);
  if (batch.failedIndex !== -1) {
    const failed = ops[batch.failedIndex];
    return {
      ok: false,
      error: `${describeOperation(failed)} 失败：${batch.error}`,
    };
  }
  const res = validate(batch.document);
  if (!res.valid) {
    return {
      ok: false,
      error: `操作结果未通过校验：${res.issues.map((i) => i.message).join('; ')}`,
    };
  }
  return {
    ok: true,
    source: serializeLgdl(batch.document),
    summaries: batch.results.map((r) => r?.summary ?? ''),
  };
}
