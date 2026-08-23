/**
 * lgdl-web-cli 执行器 —— 结构化执行（function calling）与文本解析（手动输入）双入口。
 *
 * 通讯协议（表达 vs 执行，由 API 层字段区分）：
 *   - chat 文本 → markdown 渲染（不执行）
 *   - lgdl-web-cli 工具调用（{ subcommand, args }）→ executeSubcommand 执行
 *   - 手动文本命令（lgdl-web-cli <subcommand> --key value）→ 文本解析后同样执行
 * 业务逻辑（op 构造、校验）统一走 core/buildOperation。
 */
import {
  parseLgdl,
  validate,
  serializeLgdl,
  applyOperation,
  applyOperations,
  formatStatus,
  templateForType,
  supportedTemplateTypes,
  convert,
  listFormats,
  buildOperation,
  listNodeKinds,
  queryDocInfo,
  queryNode,
  queryEdge,
  findNodes,
  DIAGRAM_TYPES,
  DIAGRAM_TYPE_LABELS,
  type LgdlOperation,
} from '@lgdl/core';
import { parseWebCliBatch, parseWebFetchCommand } from './web-cli.js';

/** lgdl-web-cli 协议块标记（手动输入兼容）。 */
export const WEB_CLI_FENCE = 'lgdl-web-cli';

export interface CommandExecResult {
  ok: boolean;
  /** 执行后的新源码（未修改时与原值相同） */
  source: string;
  /** 结果文本（status 输出 / ✓ 摘要 / ✖ 错误） */
  lines: string[];
  /** 是否发生了实际修改 */
  changed: boolean;
  /** 失败原因（!ok 时存在） */
  error?: string;
}

/**
 * lgdl-web-fetch：基础 web 获取工具，**独立于 lgdl-web-cli / lgdl-web-op-cli**。
 * 获取同源相对路径或完整 URL，返回原始文本。
 * 典型用途：读取工作台 skill 文档 lgdl/web/workbench/README-CLI.md（AI 第一步必读）。
 * 不改文档（changed 恒为 false，source 恒为空）。
 */
export async function executeWebFetch(path: string): Promise<CommandExecResult> {
  const lines: string[] = [];
  if (!path) {
    lines.push('✖ lgdl-web-fetch 缺少必填参数 --path：调用时必须显式传 --path（无默认文档）。正确示例：lgdl-web-fetch --path lgdl/web/workbench/README-CLI.md');
    return { ok: false, source: '', lines, changed: false, error: 'missing --path' };
  }
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) {
      lines.push(`✖ 获取失败（HTTP ${res.status}）：${path}`);
      return { ok: false, source: '', lines, changed: false, error: `fetch failed: ${res.status}` };
    }
    const text = await res.text();
    lines.push(text);
    return { ok: true, source: '', lines, changed: false };
  } catch (err) {
    lines.push(`✖ 获取失败：${(err as Error).message}`);
    return { ok: false, source: '', lines, changed: false, error: (err as Error).message };
  }
}

/**
 * 结构化执行一次 lgdl-web-cli 调用（function calling 入口）。
 * @param source 当前编辑器源码
 * @param subcommand status/validate/init/convert/add-node/...
 * @param args 结构化参数（--key value 风格，键不带连字符）
 * @param docId 当前文档 id（工具调用隐式作用于当前文档）
 */
export async function executeSubcommand(
  source: string,
  subcommand: string,
  args: Record<string, string>,
  docId?: string,
): Promise<CommandExecResult> {
  const lines: string[] = [];
  let current = source;
  let changed = false;

  // 只读命令（不改文档）——读多写少：AI 应先用这些了解图，再写。
  // 业务逻辑在 core/queries.ts 单一实现（lgdl-cli 与 lgdl-web-cli 共享）。
  const parsedDoc = parseLgdl(current);
  const doc = parsedDoc.valid ? parsedDoc.document : null;
  const failDoc = (): CommandExecResult => {
    lines.push('⚠ 当前源码无效');
    return { ok: true, source: current, lines, changed };
  };
  if (subcommand === 'list-node-kinds') {
    lines.push(listNodeKinds());
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'list-diagram-types') {
    const list = DIAGRAM_TYPES.map((t) => `${t}（${DIAGRAM_TYPE_LABELS[t]}）`).join(' / ');
    lines.push(`图类型（${DIAGRAM_TYPES.length} 种）：${list}`);
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'doc-info') {
    if (!doc) return failDoc();
    lines.push(...queryDocInfo(doc));
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'get-node') {
    if (!doc) return failDoc();
    const detail = queryNode(doc, args.id ?? '');
    if (!detail) {
      lines.push(`✖ 节点不存在: ${args.id}（可用 lgdl-web-cli status 查看全部节点）`);
      return { ok: false, source: current, lines, changed, error: `node not found: ${args.id}` };
    }
    lines.push(...detail);
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'get-edge') {
    if (!doc) return failDoc();
    const detail = queryEdge(doc, args.from, args.to, args.label);
    if (!detail) {
      lines.push(`✖ 未找到边 ${args.from ?? '?'} -> ${args.to ?? '?'}${args.label ? ` [${args.label}]` : ''}`);
      return { ok: false, source: current, lines, changed, error: 'edge not found' };
    }
    lines.push(...detail);
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'find-node') {
    if (!doc) return failDoc();
    const q = args.label ?? args.q;
    if (!q) {
      lines.push('✖ find-node 需要 --label 或 --q 参数');
      return { ok: false, source: current, lines, changed, error: 'missing query' };
    }
    lines.push(...findNodes(doc, q));
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'status') {
    const parsedDoc = parseLgdl(current);
    if (parsedDoc.valid) {
      lines.push(formatStatus(parsedDoc.document));
    } else {
      lines.push('⚠ 当前源码无效，无法输出 status');
    }
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'validate') {
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
    return { ok: true, source: current, lines, changed };
  }
  if (subcommand === 'init') {
    const type = args.type ?? 'flowchart';
    const tpl = templateForType(type);
    if (!tpl) {
      lines.push(`✖ 不支持的图类型 "${type}"（支持：${supportedTemplateTypes().join(' / ')}）`);
      return { ok: false, source: current, lines, changed, error: `unknown type: ${type}` };
    }
    current = tpl;
    lines.push(`✓ 已初始化为 ${type} 模板（可在此基础上用 add-node / add-edge 扩展）`);
    return { ok: true, source: current, lines, changed: current !== source };
  }
  if (subcommand === 'convert') {
    const fmt = args.to ?? '';
    const parsedDoc = parseLgdl(current);
    if (!parsedDoc.valid) {
      lines.push('⚠ 当前源码无效，无法 convert');
      return { ok: false, source: current, lines, changed, error: 'source invalid' };
    }
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
    return { ok: true, source: current, lines, changed };
  }

  // 增量命令（add/remove/update × node/edge/group）——走 core/buildOperation
  const docResult = parseLgdl(current);
  if (!docResult.valid) {
    return {
      ok: false,
      source: current,
      lines: [`✖ 当前源码有 ${docResult.issues.filter((i) => i.severity === 'error').length} 个错误，无法执行命令`],
      changed,
      error: 'source invalid',
    };
  }
  let op: LgdlOperation;
  try {
    op = buildOperation(subcommand, args, docResult.document.type);
  } catch (err) {
    return {
      ok: false,
      source: current,
      lines: [`✖ ${subcommand} 参数无效：${(err as Error).message}`],
      changed,
      error: (err as Error).message,
    };
  }
  let r;
  try {
    r = applyOperation(docResult.document, op);
  } catch (err) {
    return {
      ok: false,
      source: current,
      lines: [`✖ ${(err as Error).message}`],
      changed,
      error: (err as Error).message,
    };
  }
  const res = validate(r.document);
  if (!res.valid) {
    return {
      ok: false,
      source: current,
      lines: [`✖ 操作结果未通过校验：${res.issues.map((i) => i.message).join('; ')}`],
      changed,
      error: 'validation failed',
    };
  }
  const next = serializeLgdl(r.document);
  changed = next !== current;
  lines.push(`✓ ${r.summary}`);
  return { ok: true, source: next, lines, changed };
}

/**
 * 解析并执行协议块文本（手动输入兼容）。逐行执行，失败即停。
 * 每行 `lgdl-web-cli <subcommand> --key value` → executeSubcommand；
 * 支持带 --doc（校验与当前文档一致）或不带（隐式当前文档）。
 */
export async function executeCommands(
  source: string,
  commandsText: string,
  docId?: string,
): Promise<CommandExecResult> {
  const lines: string[] = [];
  let current = source;
  let changed = false;

  for (const line of commandsText.split('\n').map((l) => l.trim()).filter(Boolean)) {
    // 第三个前缀 lgdl-web-fetch：独立基础工具（web 获取），不走 lgdl-web-cli 解析
    if (line.startsWith('lgdl-web-fetch')) {
      const parsed = parseWebFetchCommand(line);
      // 注意：非 strict 编译下 `!parsed.ok` 反向收窄失效，须用显式判别
      if (parsed.ok === false) {
        return {
          ok: false,
          source: current,
          lines: [...lines, `✖ ${parsed.error}`, `  → ${line}`],
          changed,
          error: parsed.error,
        };
      }
      const r = await executeWebFetch(parsed.path);
      lines.push(...r.lines);
      if (!r.ok) {
        return { ok: false, source: current, lines, changed, error: r.error };
      }
      continue;
    }
    const parsedLine = parseWebCliBatch(line);
    if (parsedLine.errors.length > 0) {
      return {
        ok: false,
        source: current,
        lines: [...lines, `✖ ${parsedLine.errors[0].message}`, `  → ${line}`],
        changed,
        error: parsedLine.errors[0].message,
      };
    }
    if (docId !== undefined && parsedLine.docId !== null && parsedLine.docId !== docId) {
      return {
        ok: false,
        source: current,
        lines: [...lines, `✖ --doc 不匹配：命令指定 "${parsedLine.docId}"，当前文档是 "${docId}"`],
        changed,
        error: `doc mismatch: ${parsedLine.docId} != ${docId}`,
      };
    }
    const sub = extractSingleSubcommand(line);
    if (!sub) continue;
    const r = await executeSubcommand(current, sub.subcommand, sub.args, docId);
    lines.push(...r.lines);
    if (!r.ok) {
      return { ok: false, source: current, lines, changed, error: r.error };
    }
    if (r.changed) {
      current = r.source;
      changed = true;
    }
  }
  return { ok: true, source: current, lines, changed };
}

/** 从单行文本提取 subcommand 与 args（供 executeCommands 委托）。 */
function extractSingleSubcommand(line: string): { subcommand: string; args: Record<string, string> } | null {
  const tokens = line.split(/\s+/).filter(Boolean);
  let i = 0;
  if (tokens[0] === 'lgdl-web-cli') i++;
  const subcommand = tokens[i];
  if (!subcommand) return null;
  const args: Record<string, string> = {};
  for (let j = i + 1; j < tokens.length; j++) {
    const t = tokens[j];
    if (t.startsWith('--') && j + 1 < tokens.length) {
      args[t.slice(2)] = tokens[++j];
    }
  }
  return { subcommand, args };
}

/** 单条命令快速解析（供 UI 预览命令含义）。 */
export function describeCommandLine(line: string): string {
  if (line.startsWith('lgdl-web-fetch')) {
    const parsed = parseWebFetchCommand(line);
    if (parsed.ok === false) return `✖ ${parsed.error}`;
    return `lgdl-web-fetch --path ${parsed.path} — 获取 web 资源`;
  }
  const parsed = parseWebCliBatch(line);
  if (parsed.errors.length > 0) return `✖ ${parsed.errors[0].message}`;
  const sub = extractSingleSubcommand(line);
  if (!sub) return line;
  if (sub.subcommand === 'status') return 'lgdl-web-cli status — 查看当前图结构';
  if (sub.subcommand === 'validate') return 'lgdl-web-cli validate — 校验当前图语法';
  if (sub.subcommand === 'init') return 'lgdl-web-cli init — 初始化为默认图';
  if (sub.subcommand === 'convert') return `lgdl-web-cli convert --to ${sub.args.to} — 导出格式`;
  if (sub.subcommand === 'doc-info') return 'lgdl-web-cli doc-info — 文档概览';
  if (sub.subcommand === 'get-node') return `lgdl-web-cli get-node --id ${sub.args.id} — 节点详情`;
  if (sub.subcommand === 'get-edge') return 'lgdl-web-cli get-edge — 边详情';
  if (sub.subcommand === 'find-node') return `lgdl-web-cli find-node — 搜索节点（${sub.args.label ?? sub.args.q}）`;
  if (sub.subcommand === 'list-node-kinds') return 'lgdl-web-cli list-node-kinds — 节点 kind 清单';
  if (sub.subcommand === 'list-diagram-types') return 'lgdl-web-cli list-diagram-types — 图类型清单';
  return `${sub.subcommand} ${Object.values(sub.args).join(' ')}`;
}
