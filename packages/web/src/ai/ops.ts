/**
 * lgdl-web-cli 执行器：把 AI 回复中的 lgdl-web-cli 协议块（```lgdl-web-cli）
 * 解析并执行。
 *
 * 通讯协议（表达 vs 执行）：
 *   - 普通文本 = chat 表达（AI 描述意图，不执行）
 *   - ```lgdl-web-cli 代码块 = lgdl-web-cli 执行调用（唯一执行协议载体），
 *     块内每行一个 `lgdl <子命令> --doc <id> --key value` 调用
 * AI 不得在其他代码块（bash/code 等）里写命令——那不会被解析执行。
 */
import {
  parseLgdl,
  validate,
  serializeLgdl,
  applyOperations,
  formatStatus,
  initTemplate,
  convert,
  listFormats,
  type LgdlOperation,
} from '@lgdl/core';
import { parseWebCliBatch } from './web-cli.js';

/** lgdl-web-cli 协议块标记：唯一被解析执行的代码块类型。 */
export const WEB_CLI_FENCE = 'lgdl-web-cli';

/** 从 AI 回复文本中提取 lgdl-web-cli 协议块（```lgdl-web-cli）。 */
export function extractCommands(text: string): string | null {
  const m = text.match(/```lgdl-web-cli\s*\n([\s\S]*?)```/);
  return m ? m[1] : null;
}

export interface CommandExecResult {
  ok: boolean;
  /** 命令执行后（含 status 输出）的新源码；未发生修改时与原值相同 */
  source: string;
  /** 逐条命令的结果文本（成功摘要 / status 输出 / 错误） */
  lines: string[];
  /** 是否发生了实际修改（AI 后续可据此决定是否再 status） */
  changed: boolean;
  /** 失败原因（!ok 时存在） */
  error?: string;
}

/**
 * 解析并执行协议块（可多行）。失败即停，返回已执行部分的结果。
 * @param source 当前编辑器源码（docId 对应文档的内容）
 * @param commandsText lgdl-web-cli 协议块文本
 * @param docId 当前文档 id（命令 --doc 必须与之一致，否则拒绝——防止 AI
 *              操作非当前文档，与 lgdl-cli 指定 --file 对应）
 */
export function executeCommands(
  source: string,
  commandsText: string,
  docId?: string,
): CommandExecResult {
  const parsed = parseWebCliBatch(commandsText);
  const lines: string[] = [];
  let current = source;
  let changed = false;

  // 解析阶段错误（语法错误）→ 直接失败
  if (parsed.errors.length > 0) {
    const e = parsed.errors[0];
    return {
      ok: false,
      source: current,
      lines: [`✖ 第 ${e.index + 1} 行解析失败：${e.message}`, `  → ${e.line}`],
      changed,
      error: e.message,
    };
  }

  // --doc 与当前文档一致性校验（lgdl-web-cli 只允许操作当前文档）
  if (docId !== undefined && parsed.docId !== null && parsed.docId !== docId) {
    return {
      ok: false,
      source: current,
      lines: [`✖ --doc 不匹配：命令指定 "${parsed.docId}"，当前文档是 "${docId}"（lgdl-web-cli 只能操作当前打开的文档）`],
      changed,
      error: `doc mismatch: ${parsed.docId} != ${docId}`,
    };
  }

  // status：AI 先了解图结构（输出当前图，不改动）
  if (parsed.wantsStatus) {
    const parsedDoc = parseLgdl(current);
    if (parsedDoc.valid) {
      lines.push(formatStatus(parsedDoc.document));
    } else {
      lines.push('⚠ 当前源码无效，无法输出 status');
    }
  }

  // validate：AI 校验当前图语法（输出全部错误/警告，不改动）
  if (parsed.wantsValidate) {
    const parsedDoc = parseLgdl(current);
    if (parsedDoc.valid && parsedDoc.issues.length === 0) {
      lines.push('✓ 语法正确，无错误无警告');
    } else {
      for (const issue of parsedDoc.issues) {
        lines.push(`${issue.severity === 'error' ? '✖' : '⚠'} [${issue.location ?? 'doc'}] ${issue.message}`);
      }
      if (!parsedDoc.valid) {
        lines.push(`（共 ${parsedDoc.issues.filter((i) => i.severity === 'error').length} 个错误）`);
      }
    }
  }

  // init：清空文档为默认图（或指定类型空骨架），写回编辑器
  if (parsed.wantsInit) {
    current = initTemplate();
    changed = current !== source;
    lines.push('✓ 已初始化为默认 flowchart（含 start 节点）');
  }

  // convert：导出为其他格式（不改动文档）
  if (parsed.wantsConvert) {
    const parsedDoc = parseLgdl(current);
    if (!parsedDoc.valid) {
      lines.push('⚠ 当前源码无效，无法 convert');
    } else {
      const fmt = parsed.convertTo ?? '';
      const formats = listFormats();
      if (!formats.includes(fmt)) {
        lines.push(`✖ 未知格式 "${fmt}"（支持：${formats.join(' / ')}）`);
        return { ok: false, source: current, lines, changed, error: `unknown format: ${fmt}` };
      }
      try {
        lines.push(convert(parsedDoc.document, fmt));
      } catch (err) {
        lines.push(`✖ convert 失败：${(err as Error).message}`);
        return { ok: false, source: current, lines, changed, error: (err as Error).message };
      }
    }
  }

  if (parsed.ops.length === 0) {
    return { ok: true, source: current, lines, changed };
  }

  const docResult = parseLgdl(current);
  if (!docResult.valid) {
    return {
      ok: false,
      source: current,
      lines: [...lines, `✖ 当前源码有 ${docResult.issues.filter((i) => i.severity === 'error').length} 个错误，无法执行命令`],
      changed,
      error: 'source invalid',
    };
  }

  const batch = applyOperations(docResult.document, parsed.ops);
  if (batch.failedIndex !== -1) {
    return {
      ok: false,
      source: current,
      lines: [...lines, `✖ 第 ${batch.failedIndex + 1} 条命令失败：${batch.error}`],
      changed,
      error: batch.error ?? undefined,
    };
  }

  const res = validate(batch.document);
  if (!res.valid) {
    return {
      ok: false,
      source: current,
      lines: [...lines, `✖ 操作结果未通过校验：${res.issues.map((i) => i.message).join('; ')}`],
      changed,
      error: 'validation failed',
    };
  }

  const next = serializeLgdl(batch.document);
  changed = changed || next !== current;
  for (const r of batch.results) {
    if (r) lines.push(`✓ ${r.summary}`);
  }
  return { ok: true, source: next, lines, changed };
}

/** 单条命令快速解析（供 UI 预览命令含义）。 */
export function describeCommandLine(line: string): string {
  const parsed = parseWebCliBatch(line);
  if (parsed.errors.length > 0) return `✖ ${parsed.errors[0].message}`;
  if (parsed.wantsStatus) return 'lgdl status — 查看当前图结构';
  if (parsed.wantsValidate) return 'lgdl validate — 校验当前图语法';
  if (parsed.wantsInit) return 'lgdl init — 初始化为默认图';
  if (parsed.wantsConvert) return `lgdl convert --to ${parsed.convertTo} — 导出格式`;
  return parsed.ops.map((op: LgdlOperation) => describeOp(op)).join('; ');
}

function describeOp(op: LgdlOperation): string {
  switch (op.op) {
    case 'add-node':
      return `add-node ${op.id}`;
    case 'remove-node':
      return `remove-node ${op.id}`;
    case 'update-node':
      return `update-node ${op.id}`;
    case 'add-edge':
      return `add-edge ${op.from} -> ${op.to}`;
    case 'remove-edge':
      return `remove-edge ${op.from} -> ${op.to}`;
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
