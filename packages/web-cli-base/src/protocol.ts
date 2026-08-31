/**
 * 协议解析机制（F-13 ② 纯化后：LGDL 路由面已随迁 web-cli 业务包）。
 *
 * 本文件保留中性语法解析机制：
 *   - tokenizeCli：命令行文本分词（引号感知，D-004 留 base）
 *   - parseArgs：--key value 参数解析
 *   - createBatchParser<Op>：泛型批量解析骨架（逐行解析/失败即停/--doc 一致性）
 *   - ParsedCommand<Op> / ParsedBatch<Op>：泛型契约
 *
 * （'web-cli' 前缀校验/17 子命令枚举/--doc 语义/parseWebCliCommand/Batch
 * 已随迁 web-cli 业务包/src/protocol.ts；parseWebFetchCommand 归位
 * web-fetch 工具（ADR-007，TASK-013 落 base/web-fetch.ts）。）
 */

export type ParsedCommand<Op> =
  | { kind: 'op'; docId: string; op: Op }
  | { kind: 'status'; docId: string }
  | { kind: 'validate'; docId: string }
  | { kind: 'init'; docId: string; type?: string }
  | { kind: 'convert'; docId: string; to: string }
  /** 只读命令（doc-info / get-node / get-edge / find-node / list-*） */
  | { kind: 'query'; docId: string; command: string; args: Record<string, string> }
  /** --help 请求（topic 为空 = 顶层帮助，列出全部子命令） */
  | { kind: 'help'; topic: string }
  | { kind: 'error'; message: string };

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
export function parseArgs(args: string[]): Record<string, string> {
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

/** 供批量执行：把命令文本（可多行）解析为 ops + 标记。 */
export interface ParsedBatch<Op> {
  /** 这批命令统一操作的文档 id（--doc）；空表示解析失败前未取到。 */
  docId: string | null;
  ops: Op[];
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
  /** 命令中出现的 --help 请求（<prefix> [<子命令>] --help / help [<子命令>]）。 */
  wantsHelp: boolean;
  helpTopic: string;
  /** 解析失败的命令（索引 + 错误），batch 在其前停止。 */
  errors: { index: number; line: string; message: string }[];
}

/**
 * 通用批量解析骨架（机制，ADR-003 泛型化）：逐行调用注入的 parseLine，
 * 汇总 op/标记，失败即停，--doc 一致性校验。
 */
export function createBatchParser<Op>(
  parseLine: (line: string) => ParsedCommand<Op>,
): (text: string) => ParsedBatch<Op> {
  return function parseBatch(text: string): ParsedBatch<Op> {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const ops: Op[] = [];
    const errors: ParsedBatch<Op>['errors'] = [];
    let docId: string | null = null;
    let wantsStatus = false;
    let wantsValidate = false;
    let wantsInit = false;
    let initType: string | undefined;
    let wantsConvert = false;
    let convertTo: string | undefined;
    let wantsHelp = false;
    let helpTopic = '';

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
      const parsed = parseLine(lines[i]);
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
      } else if (parsed.kind === 'query') {
        // 只读命令：只校验 --doc 一致，不产生 op、不中断（执行交给 executeCommands 逐行委托）。
        if (!checkDoc(parsed.docId, i, lines[i])) break;
      } else if (parsed.kind === 'help') {
        // --help：无 doc 概念（不参与 doc 一致性），记录 topic，不中断。
        wantsHelp = true;
        helpTopic = parsed.topic;
      } else if (parsed.kind === 'op') {
        if (checkDoc(parsed.docId, i, lines[i])) ops.push(parsed.op);
        else break;
      } else {
        errors.push({ index: i, line: lines[i], message: parsed.message });
        break; // 失败即停（与 applyOperations 一致）
      }
    }
    return { docId, ops, wantsStatus, wantsValidate, wantsInit, initType, wantsConvert, convertTo, wantsHelp, helpTopic, errors };
  };
}
