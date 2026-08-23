/**
 * 命令定义注册表 —— lgdl-cli 与 lgdl-web-cli 共享的业务逻辑层。
 *
 * 两端各自只做「输入适配」：
 *   - lgdl-cli（packages/cli）：commander 解析 argv → 调 buildOperation
 *   - lgdl-web-cli（packages/web）：文本解析 → 调 buildOperation
 *
 * 本文件统一：参数必填校验、no-change 校验、op 构造、attrs/member 解析——
 * 业务逻辑只写一次，两端行为严格一致。
 */
import type { LgdlOperation } from './operations.js';
import type { LgdlMember, LgdlAttrs } from './types.js';

/** 一个命令的参数（--file/--doc 由两端各自处理，不在此列）。 */
export interface CommandSpec {
  name: string;
  description: string;
  /** 必填参数（逗号分隔的 --key 名） */
  required: string[];
  /** no-change 校验：这些可选参数至少要出现一个（update 系列） */
  changeKeys: string[];
  /** 全部可选参数名（用于校验未知参数） */
  optional: string[];
}

export const COMMANDS: Record<string, CommandSpec> = {
  'add-node': {
    name: 'add-node',
    description: 'add a node',
    required: ['id'],
    changeKeys: [],
    optional: ['label', 'kind', 'group', 'member', 'attrs'],
  },
  'remove-node': {
    name: 'remove-node',
    description: 'remove a node (auto-cleans attached edges)',
    required: ['id'],
    changeKeys: [],
    optional: [],
  },
  'update-node': {
    name: 'update-node',
    description: 'update a node label/kind/members/attrs',
    required: ['id'],
    changeKeys: ['new-id', 'label', 'kind', 'member-add', 'member-remove', 'attrs'],
    optional: ['new-id', 'label', 'kind', 'member-add', 'member-remove', 'attrs'],
  },
  'add-edge': {
    name: 'add-edge',
    description: 'add an edge',
    required: ['from', 'to'],
    changeKeys: [],
    optional: ['label', 'cardinality-from', 'cardinality-to', 'attrs'],
  },
  'remove-edge': {
    name: 'remove-edge',
    description: 'remove an edge',
    required: ['from', 'to'],
    changeKeys: [],
    optional: ['edge-label', 'label'],
  },
  'update-edge': {
    name: 'update-edge',
    description: 'update an edge label/attrs/endpoints',
    required: ['from', 'to'],
    changeKeys: ['edge-label', 'new-from', 'new-to', 'label', 'cardinality-from', 'cardinality-to', 'attrs'],
    optional: ['edge-label', 'new-from', 'new-to', 'label', 'cardinality-from', 'cardinality-to', 'attrs'],
  },
  'add-group': {
    name: 'add-group',
    description: 'add a group (lane/partition)',
    required: ['id'],
    changeKeys: [],
    optional: ['label', 'contains'],
  },
  'remove-group': {
    name: 'remove-group',
    description: 'remove a group',
    required: ['id'],
    changeKeys: [],
    optional: [],
  },
  'update-group': {
    name: 'update-group',
    description: 'update a group label/members/attrs',
    required: ['id'],
    changeKeys: ['new-id', 'label', 'member-add', 'member-remove', 'attrs'],
    optional: ['new-id', 'label', 'member-add', 'member-remove', 'attrs'],
  },
};

/** 已知参数名集合（--file/--doc 由两端处理，但这里也认，避免误报未知参数）。 */
export const KNOWN_PARAMS = new Set<string>([
  'file', 'doc', 'id', 'label', 'kind', 'group', 'member', 'attrs',
  'from', 'to', 'edge-label', 'new-id', 'new-from', 'new-to',
  'cardinality-from', 'cardinality-to', 'member-add', 'member-remove',
  'contains', 'type', 'to',
]);

/** 校验必填参数；缺失抛错。 */
export function requireParams(spec: CommandSpec, args: Record<string, string | undefined>): void {
  for (const key of spec.required) {
    if (args[key] === undefined) {
      throw new Error(`缺少必填参数 --${key}（${spec.name}）`);
    }
  }
}

/** no-change 校验：update 系列必须至少有一个变更参数。 */
export function assertChangeRequested(spec: CommandSpec, args: Record<string, string | undefined>): void {
  if (spec.changeKeys.length > 0 && spec.changeKeys.every((k) => args[k] === undefined)) {
    throw new Error(
      `no change requested — 至少传一个：${spec.changeKeys.map((k) => `--${k}`).join(' / ')}`,
    );
  }
}

/**
 * 由参数构造操作（业务逻辑唯一实现）。
 * @param command 子命令名（add-node 等）
 * @param args 已解析的参数（键 = --key 去掉前缀）
 * @param docType 当前文档类型（add-node 默认 kind 用；未知则传 undefined）
 */
export function buildOperation(
  command: string,
  args: Record<string, string | undefined>,
  docType?: string,
): LgdlOperation {
  const spec = COMMANDS[command];
  if (!spec) {
    throw new Error(
      `未知子命令 "${command}"（支持：${Object.keys(COMMANDS).join(' / ')}）`,
    );
  }
  requireParams(spec, args);
  assertChangeRequested(spec, args);
  const attrs = args.attrs !== undefined ? parseAttrsSpec(args.attrs) : undefined;

  switch (command) {
    case 'add-node': {
      const kind = args.kind ?? defaultKindFor(docType);
      return {
        op: 'add-node',
        id: args.id!,
        label: args.label,
        kind: kind as never,
        group: args.group,
        // member 支持多个：调用方用换行分隔（每个 member 一行，字段内逗号保留）
        members: args.member !== undefined
          ? args.member.split('\n').map((m) => m.trim()).filter(Boolean).map(parseMemberSpec)
          : undefined,
        attrs,
      };
    }
    case 'remove-node':
      return { op: 'remove-node', id: args.id! };
    case 'update-node':
      return {
        op: 'update-node',
        id: args.id!,
        newId: args['new-id'],
        label: args.label,
        kind: args.kind as never,
        memberAdd: args['member-add'] ? parseMemberSpec(args['member-add']) : undefined,
        memberRemove: args['member-remove'],
        attrs,
      };
    case 'add-edge':
      return {
        op: 'add-edge',
        from: args.from!,
        to: args.to!,
        label: args.label,
        cardinalityFrom: args['cardinality-from'],
        cardinalityTo: args['cardinality-to'],
        attrs,
      };
    case 'remove-edge':
      return {
        op: 'remove-edge',
        from: args.from!,
        to: args.to!,
        label: args['edge-label'] ?? args.label,
      };
    case 'update-edge':
      return {
        op: 'update-edge',
        from: args.from!,
        to: args.to!,
        fromLabel: args['edge-label'],
        newFrom: args['new-from'],
        newTo: args['new-to'],
        label: args.label,
        cardinalityFrom: args['cardinality-from'],
        cardinalityTo: args['cardinality-to'],
        attrs,
      };
    case 'add-group':
      return {
        op: 'add-group',
        id: args.id!,
        label: args.label,
        contains: args.contains?.split(',').map((s) => s.trim()).filter(Boolean),
      };
    case 'remove-group':
      return { op: 'remove-group', id: args.id! };
    case 'update-group':
      return {
        op: 'update-group',
        id: args.id!,
        newId: args['new-id'],
        label: args.label,
        memberAdd: args['member-add'],
        memberRemove: args['member-remove'],
        attrs,
      };
    default:
      throw new Error(`未知子命令 "${command}"`);
  }
}

/** add-node 未显式给 kind 时按图类型取语义角色。 */
export function defaultKindFor(docType?: string): string {
  if (docType === 'er' || docType === 'uml-class') return 'entity';
  if (docType === 'state') return 'state';
  return 'process';
}

/**
 * 解析 attrs 规格：逗号分隔的 key=value。
 * 数字保留原始形态（"1.10" 不变成 1.1，"080" 不变成 80）——有损转换是静默错误。
 */
export function parseAttrsSpec(raw: string): LgdlAttrs {
  const attrs: LgdlAttrs = {};
  for (const pair of raw.split(',')) {
    const eq = pair.indexOf('=');
    if (eq === -1) throw new Error(`无效 --attrs "${pair}"（期望 key=value）`);
    const k = pair.slice(0, eq).trim();
    let v: string | number | boolean = pair.slice(eq + 1).trim();
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (/^-?\d+$/.test(String(v))) {
      const n = parseInt(String(v), 10);
      v = String(n) === String(v) ? n : String(v); // "080" 保持字符串
    } else if (/^-?\d+\.\d+$/.test(String(v))) {
      const f = parseFloat(String(v));
      v = String(f) === String(v) ? f : String(v); // "1.10" 保持字符串
    } else if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1);
    }
    attrs[k] = v;
  }
  return attrs;
}

/** 解析 member 规格：kind=..,name=..[,visibility=..][,type=..][,params=..]。 */
export function parseMemberSpec(raw: string): LgdlMember {
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
