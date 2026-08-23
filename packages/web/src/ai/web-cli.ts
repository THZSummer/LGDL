/**
 * lgdl-web-cli 协议解析器 —— 只供 Web 工作台使用（本包 packages/web）。
 *
 * 与终端 `lgdl` CLI（lgdl-cli，packages/cli）完全分离：
 *   - lgdl-cli：commander 解析，--file <path> 操作磁盘文件，只用 @lgdl/core
 *   - lgdl-web-cli（本文件）：--doc <id> 操作编辑器文档，只被 Web 工作台使用
 *
 * 两者共享 @lgdl/core 的命令定义注册表（core/commands.ts：参数校验、op 构造、
 * attrs/member 解析）与执行层（applyOperation/applyOperations），
 * 但对象参数、I/O 后端、交互形态不同，互不解析对方的参数格式。
 *
 * 子命令：add-node / remove-node / update-node / add-edge / remove-edge /
 * update-edge / add-group / remove-group / update-group / status / validate
 * / init / convert
 */
import { buildOperation } from '@lgdl/core';
import type { LgdlOperation } from '@lgdl/core';

export type ParsedCommand =
  | { kind: 'op'; docId: string; op: LgdlOperation }
  | { kind: 'status'; docId: string }
  | { kind: 'validate'; docId: string }
  | { kind: 'init'; docId: string; type?: string }
  | { kind: 'convert'; docId: string; to: string }
  | { kind: 'error'; message: string };

/** 命令行文本 → 结构化操作（或 status / validate / init / convert / 错误）。 */
export function parseWebCliCommand(line: string): ParsedCommand {
  const tokens = tokenizeCli(line);
  if (tokens.length === 0) {
    return { kind: 'error', message: '空命令' };
  }
  // 命令入口前缀必须是 lgdl-web-cli（与终端 lgdl-cli 的 `lgdl` 前缀区分）
  if (tokens[0] !== 'lgdl-web-cli') {
    return {
      kind: 'error',
      message:
        tokens[0] === 'lgdl'
          ? 'lgdl-web-cli 命令必须以 `lgdl-web-cli` 为前缀（`lgdl` 是终端 lgdl-cli 的前缀，Web 用 `lgdl-web-cli`）'
          : `缺少前缀 "lgdl-web-cli"（命令格式：lgdl-web-cli <子命令> --doc <id> ...）`,
    };
  }
  const cmd = tokens[1];
  if (!cmd) {
    return { kind: 'error', message: '缺少子命令（如 add-node / status / validate / init / convert）' };
  }
  const args = tokens.slice(2);

  // 统一提取 --doc <id>（顶层必填参数，所有子命令都要求——lgdl-web-cli 的
  // 操作对象标识，对应 lgdl-cli 的 --file）
  const docIdx = args.indexOf('--doc');
  let docId: string | undefined;
  if (docIdx !== -1) {
    const v = args[docIdx + 1];
    if (v !== undefined && !v.startsWith('--')) docId = v;
  }
  if (!docId) {
    return { kind: 'error', message: `缺少必填参数 --doc <id>（${cmd}：lgdl-web-cli 操作对象标识，对应 lgdl-cli 的 --file）` };
  }
  // 从 args 中剔除 --doc <id>，其余传给子命令
  const rest = docIdx !== -1 ? [...args.slice(0, docIdx), ...args.slice(docIdx + 2)] : args;

  try {
    switch (cmd) {
      case 'status':
        return { kind: 'status', docId };
      case 'validate':
        return { kind: 'validate', docId };
      case 'init': {
        const a = parseArgs(rest);
        return { kind: 'init', docId, type: a.type };
      }
      case 'convert': {
        const a = parseArgs(rest);
        const to = a.to;
        if (!to) {
          return { kind: 'error', message: '缺少必填参数 --to <format>（convert：mermaid / plantuml / json）' };
        }
        return { kind: 'convert', docId, to };
      }
      case 'add-node': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('add-node', a) };
        }
      case 'remove-node': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('remove-node', a) };
        }
      case 'update-node': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('update-node', a) };
        }
      case 'add-edge': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('add-edge', a) };
        }
      case 'remove-edge': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('remove-edge', a) };
        }
      case 'update-edge': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('update-edge', a) };
        }
      case 'add-group': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('add-group', a) };
        }
      case 'remove-group': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('remove-group', a) };
        }
      case 'update-group': {
          const a = parseArgs(rest);
          return { kind: 'op', docId, op: buildOperation('update-group', a) };
        }
      default:
        return {
          kind: 'error',
          message: `未知子命令 "${cmd}"（支持：add-node / remove-node / update-node / add-edge / remove-edge / update-edge / add-group / remove-group / update-group / status / validate / init / convert）`,
        };
    }
  } catch (err) {
    return { kind: 'error', message: (err as Error).message };
  }
}

/** 把命令行文本拆成 token（支持引号包裹的值）。 */
export function tokenizeCli(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;
  for (const ch of line) {
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

/** 把 --key value 序列解析为对象；值支持引号（已在 tokenize 剥掉）。 */
function parseArgs(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) {
      throw new Error(`意外的参数 "${a}"（参数需以 -- 开头）`);
    }
    const key = a.slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`参数 --${key} 缺少值`);
    }
    out[key] = next;
    i++;
  }
  return out;
}

function required(args: Record<string, string>, key: string, cmd: string): string {
  const v = args[key];
  if (v === undefined) throw new Error(`缺少必填参数 --${key}（${cmd}）`);
  return v;
}

/** --attrs key=value 可重复（--attrs 后跟一个 key=value，多个用多次 --attrs）。 */
/** 供 Web 端批量执行：把命令文本（可多行）解析为 ops + 标记。 */
export interface ParsedBatch {
  /** 这批命令统一操作的文档 id（--doc）；空表示解析失败前未取到。 */
  docId: string | null;
  ops: LgdlOperation[];
  /** 命令中出现的 status 请求（AI 先了解图再修改）。 */
  wantsStatus: boolean;
  /** 命令中出现的 validate 请求（AI 校验当前图语法）。 */
  wantsValidate: boolean;
  /** 命令中出现的 init 请求（AI 初始化文档为默认图）。 */
  wantsInit: boolean;
  initType?: string;
  /** 命令中出现的 convert 请求（AI 导出为其他格式）。 */
  wantsConvert: boolean;
  convertTo?: string;
  /** 解析失败的命令（索引 + 错误），batch 在其前停止。 */
  errors: { index: number; line: string; message: string }[];
}

export function parseWebCliBatch(text: string): ParsedBatch {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const ops: LgdlOperation[] = [];
  const errors: ParsedBatch['errors'] = [];
  let docId: string | null = null;
  let wantsStatus = false;
  let wantsValidate = false;
  let wantsInit = false;
  let initType: string | undefined;
  let wantsConvert = false;
  let convertTo: string | undefined;

  const checkDoc = (parsedDocId: string, i: number, line: string): boolean => {
    if (docId === null) {
      docId = parsedDocId;
      return true;
    }
    if (parsedDocId !== docId) {
      errors.push({ index: i, line, message: `--doc 不一致（本批命令应操作同一文档，已有 "${docId}"，这里写 "${parsedDocId}"）` });
      return false;
    }
    return true;
  };

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseWebCliCommand(lines[i]);
    if (parsed.kind === 'status') {
      if (checkDoc(parsed.docId, i, lines[i])) wantsStatus = true;
      else break;
    } else if (parsed.kind === 'validate') {
      if (checkDoc(parsed.docId, i, lines[i])) wantsValidate = true;
      else break;
    } else if (parsed.kind === 'init') {
      if (checkDoc(parsed.docId, i, lines[i])) {
        wantsInit = true;
        initType = parsed.type;
      } else break;
    } else if (parsed.kind === 'convert') {
      if (checkDoc(parsed.docId, i, lines[i])) {
        wantsConvert = true;
        convertTo = parsed.to;
      } else break;
    } else if (parsed.kind === 'op') {
      if (checkDoc(parsed.docId, i, lines[i])) ops.push(parsed.op);
      else break;
    } else {
      errors.push({ index: i, line: lines[i], message: parsed.message });
      break; // 失败即停（与 applyOperations 一致）
    }
  }
  return { docId, ops, wantsStatus, wantsValidate, wantsInit, initType, wantsConvert, convertTo, errors };
}
