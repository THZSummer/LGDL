/**
 * 命令执行骨架 —— 结构化执行（function calling）与文本解析（手动输入）双入口。
 *
 * 通讯协议（表达 vs 执行，由 API 层字段区分）：
 *   - chat 文本 → markdown 渲染（不执行）
 *   - 领域工具调用（{ subcommand, args }）→ executeSubcommand 执行
 *   - 手动文本命令（<commandPrefix> <subcommand> --key value）→ 文本解析后同样执行
 * 业务逻辑（op 构造、校验）经 DomainApi 注入（ADR-006，EC-004）。
 *
 * 机制中性化（F-13 ②）：DomainApi 泛型化为 DomainApi<Op, Doc>（ADR-003），
 * 领域前缀/批量解析/子命令描述经 ExecutorOptions 注入参数收口（ADR-005）——
 * 注入等价参数时行为与迁移前逐字节一致（NFR-005）。
 *
 * （自 packages/web/src/ai/ops.ts:34-44,80-331,351-376 迁入——19 个领域符号直调
 * 改为 createExecutor(domain) 注入面，管线分支逐字节复制零改写；
 * executeCommands 增 options.handleLine 扩展点（fetch 行处理器 web 侧注入，ADR-007）；
 * webCliHelp 引用自调用方注入的 domain.webCliHelp。）
 */
import type { OperationBatchResult } from './operations.js';
import { createBatchParser } from './protocol.js';
import type { ParsedBatch } from './protocol.js';
import type { KindResolver } from './commands.js';

/** 结构化校验问题契约（中性；lgdl-core LgdlIssue 字段超集兼容，ADR-003）。 */
export interface Issue {
  severity: 'error' | 'warning';
  message: string;
  /** Path-like location, e.g. "nodes[3].id" */
  location?: string;
}

/** 解析结果契约（中性；lgdl-core ParseResult 字段超集兼容，ADR-003）。 */
export interface ParseResult<Doc> {
  valid: boolean;
  document: Doc;
  issues: Issue[];
}

/** 变更结果契约（中性；lgdl-core MutationResult 字段超集兼容，ADR-003）。 */
export interface MutationResult<Doc> {
  document: Doc;
  summary: string;
}

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

/** 领域 API 注入面（ADR-006：19 个领域符号全量收口，泛型化 ADR-003）。 */
export interface DomainApi<Op, Doc> {
  parseLgdl: (source: string) => ParseResult<Doc>;
  validate: (doc: Partial<Doc>, issues?: Issue[]) => ParseResult<Doc>;
  serializeLgdl: (doc: Doc) => string;
  applyOperation: (doc: Doc, operation: Op) => MutationResult<Doc>;
  applyOperations: (doc: Doc, ops: Op[]) => OperationBatchResult<Doc>;
  formatStatus: (doc: Doc) => string;
  templateForType: (type: string) => string | null;
  supportedTemplateTypes: () => readonly string[];
  convert: (doc: Doc, format: string) => string;
  listFormats: () => string[];
  buildOperation: (
    command: string,
    args: Record<string, string | undefined>,
    docType?: string,
    kindResolver?: KindResolver,
  ) => Op;
  listNodeKinds: () => string;
  queryDocInfo: (doc: Doc) => string[];
  queryNode: (doc: Doc, id: string) => string[] | null;
  queryEdge: (doc: Doc, from?: string, to?: string, label?: string) => string[] | null;
  findNodes: (doc: Doc, q: string) => string[];
  DIAGRAM_TYPES: readonly string[];
  DIAGRAM_TYPE_LABELS: Record<string, string>;
  webCliHelp: (topic?: string) => string;
}

/** 行处理器扩展点结果（ADR-007：fetch 行由 web 侧注入处理）。 */
export interface LineHandleResult {
  ok: boolean;
  lines: string[];
  error?: string;
}

/** 执行器扩展点（ADR-005：领域注入 commandPrefix/parseBatch/describeSubcommand）。 */
export interface ExecutorOptions<Op> {
  /** 行处理器：返回 null 表示该行不由扩展处理（走默认领域解析）。 */
  handleLine?: (line: string) => LineHandleResult | null | Promise<LineHandleResult | null>;
  /** describeCommandLine 的 fetch 行描述（同步；返回 null 表示非 fetch 行）。 */
  describeFetchLine?: (line: string) => string | null;
  /** 命令前缀（web-cli 注入 'web-cli'；默认空 = 无前缀识别）——替代现状硬编码。 */
  commandPrefix?: string;
  /** 单行批量解析（web-cli 注入 parseWebCliBatch；默认 = 内置 createBatchParser 骨架）。 */
  parseBatch?: (line: string) => ParsedBatch<Op>;
  /** 子命令描述（web-cli 注入 describeLgdlSubcommand；默认 = `${sub} ${args}` fallback）。 */
  describeSubcommand?: (subcommand: string, args: Record<string, string>) => string | null;
}

export interface Executor {
  executeSubcommand: (
    source: string,
    subcommand: string,
    args: Record<string, string>,
    docId?: string,
  ) => Promise<CommandExecResult>;
  executeCommands: (
    source: string,
    commandsText: string,
    docId?: string,
  ) => Promise<CommandExecResult>;
  describeCommandLine: (line: string) => string;
}

/**
 * 注入工厂：返回 { executeSubcommand, executeCommands, describeCommandLine }。
 * 管线分支（help 优先 / 只读命令 / 增量命令）逐行复制自 web ops.ts，语义零改动。
 */
export function createExecutor<Op, Doc extends { type: string }>(
  domain: DomainApi<Op, Doc>,
  options: ExecutorOptions<Op> = {},
): Executor {
  const parseBatch =
    options.parseBatch ??
    createBatchParser<Op>(() => ({ kind: 'error', message: '未配置领域命令解析器' }));
  const prefix = options.commandPrefix ?? '';

  /** 结构化执行一次领域调用（function calling 入口）。 */
  async function executeSubcommand(
    source: string,
    subcommand: string,
    args: Record<string, string>,
    docId?: string,
  ): Promise<CommandExecResult> {
    const lines: string[] = [];
    let current = source;
    let changed = false;

    // help：查询命令用法（function calling 入口；等价于文本 `<prefix> help [<子命令>]`）。
    // 参数 topic 指定子命令；空 = 顶层帮助。--help 优先级最高，不做任何校验。
    if (subcommand === 'help' || subcommand === '--help') {
      lines.push(domain.webCliHelp(args.topic ?? ''));
      return { ok: true, source: current, lines, changed };
    }

    // 只读命令（不改文档）——读多写少：AI 应先用这些了解图，再写。
    // 业务逻辑在领域包单一实现（lgdl-cli 与 web-cli 共享）。
    const parsedDoc = domain.parseLgdl(current);
    const doc = parsedDoc.valid ? parsedDoc.document : null;
    const failDoc = (): CommandExecResult => {
      lines.push('⚠ 当前源码无效');
      return { ok: true, source: current, lines, changed };
    };
    if (subcommand === 'list-node-kinds') {
      lines.push(domain.listNodeKinds());
      return { ok: true, source: current, lines, changed };
    }
    if (subcommand === 'list-diagram-types') {
      const list = domain.DIAGRAM_TYPES.map((t) => `${t}（${domain.DIAGRAM_TYPE_LABELS[t]}）`).join(' / ');
      lines.push(`图类型（${domain.DIAGRAM_TYPES.length} 种）：${list}`);
      return { ok: true, source: current, lines, changed };
    }
    if (subcommand === 'doc-info') {
      if (!doc) return failDoc();
      lines.push(...domain.queryDocInfo(doc));
      return { ok: true, source: current, lines, changed };
    }
    if (subcommand === 'get-node') {
      if (!doc) return failDoc();
      const detail = domain.queryNode(doc, args.id ?? '');
      if (!detail) {
        lines.push(`✖ 节点不存在: ${args.id}（可用 ${prefix} status 查看全部节点）`);
        return { ok: false, source: current, lines, changed, error: `node not found: ${args.id}` };
      }
      lines.push(...detail);
      return { ok: true, source: current, lines, changed };
    }
    if (subcommand === 'get-edge') {
      if (!doc) return failDoc();
      const detail = domain.queryEdge(doc, args.from, args.to, args.label);
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
      lines.push(...domain.findNodes(doc, q));
      return { ok: true, source: current, lines, changed };
    }
    if (subcommand === 'status') {
      const parsedDoc = domain.parseLgdl(current);
      if (parsedDoc.valid) {
        lines.push(domain.formatStatus(parsedDoc.document));
      } else {
        lines.push('⚠ 当前源码无效，无法输出 status');
      }
      return { ok: true, source: current, lines, changed };
    }
    if (subcommand === 'validate') {
      const parsedDoc = domain.parseLgdl(current);
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
      const tpl = domain.templateForType(type);
      if (!tpl) {
        lines.push(`✖ 不支持的图类型 "${type}"（支持：${domain.supportedTemplateTypes().join(' / ')}）`);
        return { ok: false, source: current, lines, changed, error: `unknown type: ${type}` };
      }
      current = tpl;
      lines.push(`✓ 已初始化为 ${type} 模板（可在此基础上用 add-node / add-edge 扩展）`);
      return { ok: true, source: current, lines, changed: current !== source };
    }
    if (subcommand === 'convert') {
      const fmt = args.to ?? '';
      const parsedDoc = domain.parseLgdl(current);
      if (!parsedDoc.valid) {
        lines.push('⚠ 当前源码无效，无法 convert');
        return { ok: false, source: current, lines, changed, error: 'source invalid' };
      }
      const formats = domain.listFormats();
      if (!formats.includes(fmt)) {
        lines.push(`✖ 未知格式 "${fmt}"（支持：${formats.join(' / ')}）`);
        return { ok: false, source: current, lines, changed, error: `unknown format: ${fmt}` };
      }
      try {
        lines.push(domain.convert(parsedDoc.document, fmt));
      } catch (err) {
        lines.push(`✖ convert 失败：${(err as Error).message}`);
        return { ok: false, source: current, lines, changed, error: (err as Error).message };
      }
      return { ok: true, source: current, lines, changed };
    }

    // 增量命令（add/remove/update × node/edge/group）——走 domain.buildOperation
    const docResult = domain.parseLgdl(current);
    if (!docResult.valid) {
      return {
        ok: false,
        source: current,
        lines: [`✖ 当前源码有 ${docResult.issues.filter((i) => i.severity === 'error').length} 个错误，无法执行命令`],
        changed,
        error: 'source invalid',
      };
    }
    let op: Op;
    try {
      op = domain.buildOperation(subcommand, args, docResult.document.type);
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
      r = domain.applyOperation(docResult.document, op);
    } catch (err) {
      return {
        ok: false,
        source: current,
        lines: [`✖ ${(err as Error).message}`],
        changed,
        error: (err as Error).message,
      };
    }
    const res = domain.validate(r.document);
    if (!res.valid) {
      return {
        ok: false,
        source: current,
        lines: [`✖ 操作结果未通过校验：${res.issues.map((i) => i.message).join('; ')}`],
        changed,
        error: 'validation failed',
      };
    }
    const next = domain.serializeLgdl(r.document);
    changed = next !== current;
    lines.push(`✓ ${r.summary}`);
    return { ok: true, source: next, lines, changed };
  }

  /**
   * 解析并执行协议块文本（手动输入兼容）。逐行执行，失败即停。
   * 每行 `<prefix> <subcommand> --key value` → executeSubcommand；
   * 支持带 --doc（校验与当前文档一致）或不带（隐式当前文档）。
   */
  async function executeCommands(
    source: string,
    commandsText: string,
    docId?: string,
  ): Promise<CommandExecResult> {
    const lines: string[] = [];
    let current = source;
    let changed = false;

    for (const line of commandsText.split('\n').map((l) => l.trim()).filter(Boolean)) {
      // 扩展点（ADR-007）：fetch 行由调用方注入处理（web 侧 handleFetchLine）
      if (options.handleLine) {
        const handled = await options.handleLine(line);
        if (handled !== null && handled !== undefined) {
          lines.push(...handled.lines);
          if (!handled.ok) {
            return { ok: false, source: current, lines, changed, error: handled.error };
          }
          continue;
        }
      }
      const parsedLine = parseBatch(line);
      if (parsedLine.errors.length > 0) {
        return {
          ok: false,
          source: current,
          lines: [...lines, `✖ ${parsedLine.errors[0].message}`, `  → ${line}`],
          changed,
          error: parsedLine.errors[0].message,
        };
      }
      // --help（clig.dev：优先级最高，任何位置出现即显示帮助，不校验 doc）
      if (parsedLine.wantsHelp) {
        lines.push(domain.webCliHelp(parsedLine.helpTopic || undefined));
        continue;
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
      const sub = extractSingleSubcommand(line, options.commandPrefix);
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

  /** 单条命令快速解析（供 UI 预览命令含义）。 */
  function describeCommandLine(line: string): string {
    if (options.describeFetchLine) {
      const fetchDesc = options.describeFetchLine(line);
      if (fetchDesc !== null) return fetchDesc;
    }
    const parsed = parseBatch(line);
    if (parsed.errors.length > 0) return `✖ ${parsed.errors[0].message}`;
    if (parsed.wantsHelp) {
      const p = prefix ? `${prefix} ` : '';
      return parsed.helpTopic ? `${p}${parsed.helpTopic} --help — 命令用法` : `${p}--help — 全部命令`;
    }
    const sub = extractSingleSubcommand(line, options.commandPrefix);
    if (!sub) return line;
    if (options.describeSubcommand) {
      const desc = options.describeSubcommand(sub.subcommand, sub.args);
      if (desc !== null) return desc;
    }
    return `${sub.subcommand} ${Object.values(sub.args).join(' ')}`;
  }

  return { executeSubcommand, executeCommands, describeCommandLine };
}

/** 从单行文本提取 subcommand 与 args（供 executeCommands 委托；commandPrefix 可空 = 无前缀）。 */
function extractSingleSubcommand(
  line: string,
  commandPrefix?: string,
): { subcommand: string; args: Record<string, string> } | null {
  const tokens = line.split(/\s+/).filter(Boolean);
  let i = 0;
  if (commandPrefix && tokens[0] === commandPrefix) i++;
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
