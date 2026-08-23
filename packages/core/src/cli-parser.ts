/**
 * CLI 命令解析器：把「lgdl <subcommand> --key value ...」命令行文本解析为
 * 结构化操作（LgdlOperation）或 status 请求。Web AI 助手与 CLI 共用同一
 * 套命令语义 —— AI 像在终端里敲 lgdl 命令一样操作图。
 *
 * 支持的子命令（与 packages/cli 一致）：
 *   add-node / remove-node / update-node
 *   add-edge / remove-edge / update-edge
 *   add-group / remove-group / update-group
 *   status
 */
import type { LgdlOperation } from './operations.js';
import type { LgdlMember } from './types.js';

export type ParsedCommand =
  | { kind: 'op'; op: LgdlOperation }
  | { kind: 'status' }
  | { kind: 'validate' }
  | { kind: 'error'; message: string };

/** 命令行文本 → 结构化操作（或 status / validate / 错误）。 */
export function parseCliCommand(line: string): ParsedCommand {
  const tokens = tokenize(line);
  if (tokens.length === 0) {
    return { kind: 'error', message: '空命令' };
  }
  // 可选 lgdl 前缀
  let i = 0;
  if (tokens[0] === 'lgdl') i++;
  const cmd = tokens[i];
  if (!cmd) {
    return { kind: 'error', message: '缺少子命令（如 add-node / status / validate）' };
  }
  const args = tokens.slice(i + 1);
  try {
    switch (cmd) {
      case 'status':
        return { kind: 'status' };
      case 'validate':
        return { kind: 'validate' };
      case 'add-node':
        return { kind: 'op', op: parseAddNode(args) };
      case 'remove-node':
        return { kind: 'op', op: parseRemoveNode(args) };
      case 'update-node':
        return { kind: 'op', op: parseUpdateNode(args) };
      case 'add-edge':
        return { kind: 'op', op: parseAddEdge(args) };
      case 'remove-edge':
        return { kind: 'op', op: parseRemoveEdge(args) };
      case 'update-edge':
        return { kind: 'op', op: parseUpdateEdge(args) };
      case 'add-group':
        return { kind: 'op', op: parseAddGroup(args) };
      case 'remove-group':
        return { kind: 'op', op: parseRemoveGroup(args) };
      case 'update-group':
        return { kind: 'op', op: parseUpdateGroup(args) };
      default:
        return {
          kind: 'error',
          message: `未知子命令 "${cmd}"（支持：add-node / remove-node / update-node / add-edge / remove-edge / update-edge / add-group / remove-group / update-group / status / validate）`,
        };
    }
  } catch (err) {
    return { kind: 'error', message: (err as Error).message };
  }
}

/** 把命令行文本拆成 token（支持引号包裹的值）。 */
export function tokenize(line: string): string[] {
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
function parseAttrsFromArgs(args: Record<string, string>): Record<string, unknown> | undefined {
  if (args.attrs === undefined) return undefined;
  // CLI 的 --attrs 是重复收集；命令行单行内我们支持逗号分隔的 k=v
  const attrs: Record<string, unknown> = {};
  for (const pair of args.attrs.split(',')) {
    const eq = pair.indexOf('=');
    if (eq === -1) throw new Error(`无效 --attrs "${pair}"（期望 key=value）`);
    const k = pair.slice(0, eq).trim();
    let v: string | number | boolean = pair.slice(eq + 1).trim();
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (/^-?\d+$/.test(String(v))) v = parseInt(String(v), 10);
    else if (/^-?\d+\.\d+$/.test(String(v))) v = parseFloat(String(v));
    else if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    attrs[k] = v;
  }
  return attrs;
}

function parseAddNode(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  return {
    op: 'add-node',
    id: required(a, 'id', 'add-node'),
    label: a.label,
    kind: a.kind as never,
    group: a.group,
    attrs: parseAttrsFromArgs(a),
  };
}

function parseRemoveNode(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  return { op: 'remove-node', id: required(a, 'id', 'remove-node') };
}

function parseUpdateNode(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  if (
    a['new-id'] === undefined &&
    a.label === undefined &&
    a.kind === undefined &&
    a['member-add'] === undefined &&
    a['member-remove'] === undefined &&
    a.attrs === undefined
  ) {
    throw new Error('no change requested — 至少传一个：--new-id / --label / --kind / --member-add / --member-remove / --attrs');
  }
  return {
    op: 'update-node',
    id: required(a, 'id', 'update-node'),
    newId: a['new-id'],
    label: a.label,
    kind: a.kind as never,
    memberAdd: a['member-add'] ? parseMember(a['member-add']) : undefined,
    memberRemove: a['member-remove'],
    attrs: parseAttrsFromArgs(a),
  };
}

function parseAddEdge(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  return {
    op: 'add-edge',
    from: required(a, 'from', 'add-edge'),
    to: required(a, 'to', 'add-edge'),
    label: a.label,
    cardinalityFrom: a['cardinality-from'],
    cardinalityTo: a['cardinality-to'],
    attrs: parseAttrsFromArgs(a),
  };
}

function parseRemoveEdge(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  return {
    op: 'remove-edge',
    from: required(a, 'from', 'remove-edge'),
    to: required(a, 'to', 'remove-edge'),
    label: a['edge-label'] ?? a.label,
  };
}

function parseUpdateEdge(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  if (
    a['edge-label'] === undefined &&
    a['new-from'] === undefined &&
    a['new-to'] === undefined &&
    a.label === undefined &&
    a['cardinality-from'] === undefined &&
    a['cardinality-to'] === undefined &&
    a.attrs === undefined
  ) {
    throw new Error('no change requested — 至少传一个：--edge-label / --new-from / --new-to / --label / --cardinality-from / --cardinality-to / --attrs');
  }
  return {
    op: 'update-edge',
    from: required(a, 'from', 'update-edge'),
    to: required(a, 'to', 'update-edge'),
    fromLabel: a['edge-label'],
    newFrom: a['new-from'],
    newTo: a['new-to'],
    label: a.label,
    cardinalityFrom: a['cardinality-from'],
    cardinalityTo: a['cardinality-to'],
    attrs: parseAttrsFromArgs(a),
  };
}

function parseAddGroup(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  return {
    op: 'add-group',
    id: required(a, 'id', 'add-group'),
    label: a.label,
    contains: a.contains?.split(',').map((s) => s.trim()).filter(Boolean),
  };
}

function parseRemoveGroup(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  return { op: 'remove-group', id: required(a, 'id', 'remove-group') };
}

function parseUpdateGroup(args: string[]): LgdlOperation {
  const a = parseArgs(args);
  if (
    a['new-id'] === undefined &&
    a.label === undefined &&
    a['member-add'] === undefined &&
    a['member-remove'] === undefined &&
    a.attrs === undefined
  ) {
    throw new Error('no change requested — 至少传一个：--new-id / --label / --member-add / --member-remove / --attrs');
  }
  return {
    op: 'update-group',
    id: required(a, 'id', 'update-group'),
    newId: a['new-id'],
    label: a.label,
    memberAdd: a['member-add'],
    memberRemove: a['member-remove'],
    attrs: parseAttrsFromArgs(a),
  };
}

/** 解析 member 规格（kind=..,name=..[,visibility=..][,type=..][,params=..]）。 */
function parseMember(raw: string): LgdlMember {
  const fields: Record<string, string> = {};
  let current = '';
  let inQuote = false;
  for (const ch of raw) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === ',' && !inQuote) {
      const part = current.trim();
      if (part) {
        const eq = part.indexOf('=');
        if (eq === -1) throw new Error(`无效 member 字段 "${part}"（期望 key=value）`);
        fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
      }
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    const part = current.trim();
    const eq = part.indexOf('=');
    if (eq === -1) throw new Error(`无效 member 字段 "${part}"（期望 key=value）`);
    fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
  }
  if (!fields.kind || !fields.name) {
    throw new Error(`member 需要至少 kind= 和 name=（got "${raw}"）`);
  }
  const member: LgdlMember = { kind: fields.kind as LgdlMember['kind'], name: fields.name };
  if (fields.visibility) member.visibility = fields.visibility as LgdlMember['visibility'];
  if (fields.type !== undefined) member.type = fields.type;
  if (fields.params !== undefined) member.params = fields.params;
  return member;
}

/** 供 Web 端批量执行：把命令文本（可多行）解析为 ops + status/validate 标记。 */
export interface ParsedBatch {
  ops: LgdlOperation[];
  /** 命令中出现的 status 请求（AI 先了解图再修改）。 */
  wantsStatus: boolean;
  /** 命令中出现的 validate 请求（AI 校验当前图语法）。 */
  wantsValidate: boolean;
  /** 解析失败的命令（索引 + 错误），batch 在其前停止。 */
  errors: { index: number; line: string; message: string }[];
}

export function parseCommandBatch(text: string): ParsedBatch {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const ops: LgdlOperation[] = [];
  const errors: ParsedBatch['errors'] = [];
  let wantsStatus = false;
  let wantsValidate = false;
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseCliCommand(lines[i]);
    if (parsed.kind === 'status') {
      wantsStatus = true;
    } else if (parsed.kind === 'validate') {
      wantsValidate = true;
    } else if (parsed.kind === 'op') {
      ops.push(parsed.op);
    } else {
      errors.push({ index: i, line: lines[i], message: parsed.message });
      break; // 失败即停（与 applyOperations 一致）
    }
  }
  return { ops, wantsStatus, wantsValidate, errors };
}
