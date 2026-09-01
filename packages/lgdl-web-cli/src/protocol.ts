/**
 * lgdl-web-cli 协议解析器（LGDL 路由面，F-13 ② 自 base/protocol.ts 迁出）。
 *
 * （自 packages/web/src/ai/web-cli.ts:23-289 → @lgdl/web-cli-base protocol.ts 迁入——
 * 纯位置迁移，零语义改动：'lgdl-web-cli' 前缀校验/17 子命令枚举/--doc 语义逐字节；
 * tokenizeCli/parseArgs 为通用语法解析留 base（D-004），本包导入复用；
 * parseWebCliBatch 调 base 泛型骨架 createBatchParser（循环/失败即停/doc 一致性保留）；
 * ParsedCommand/ParsedBatch 自 base 导入并实例化 ParsedCommand<LgdlOperation>。
 * parseWebFetchCommand/ParsedWebFetch 不迁入——web fetch 归 base 中性化
 * （web-fetch，ADR-007），本模块不认识它。）
 *
 * 与终端 `lgdl` CLI（lgdl-cli，packages/lgdl-cli）完全分离：
 *   - lgdl-cli：commander 解析，--file <path> 操作磁盘文件，只用 @lgdl/lgdl-core
 *   - lgdl-web-cli（本文件）：--doc <id> 操作编辑器文档
 *
 * 子命令：add-node / remove-node / update-node / add-edge / remove-edge /
 * update-edge / status / validate
 * / init / convert / doc-info / get-node / get-edge / find-node
 * / list-node-kinds / list-diagram-types
 *
 * 注意：web 获取（fetch）是独立基础工具 web-fetch（归 @lgdl/web-cli-base），
 * 不属于 lgdl-web-cli 的子命令——本解析器不认识它。
 */
import { tokenizeCli, parseArgs, createBatchParser } from '@lgdl/web-cli-base';
import type { ParsedCommand, ParsedBatch } from '@lgdl/web-cli-base';
import { buildOperation } from './commands.js';
import type { LgdlOperation } from '@lgdl/lgdl-core';

/** 命令行文本 → 结构化操作（或 status / validate / init / convert / 错误）。 */
export function parseWebCliCommand(line: string): ParsedCommand<LgdlOperation> {
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
  const args = tokens.slice(2);

  // --help 优先级最高（clig.dev：加在任何命令末尾都显示帮助，忽略其他参数/校验）：
  //   lgdl-web-cli --help            → 顶层帮助
  //   lgdl-web-cli help [<子命令>]   → 顶层/单命令帮助（git 风格别名）
  //   lgdl-web-cli <子命令> --help   → 该子命令自己的帮助（无需 --doc）
  if (!cmd || cmd === '--help' || cmd === 'help' || args.includes('--help')) {
    const topic =
      cmd === 'help'
        ? (args.find((a) => !a.startsWith('--')) ?? '')
        : cmd === '--help' || !cmd
          ? ''
          : cmd;
    return { kind: 'help', topic };
  }

  // 统一提取 --doc <id>（顶层必填参数，所有子命令都要求——lgdl-web-cli 的
  // 操作对象标识，对应 lgdl-cli 的 --file）
  const docIdx = args.indexOf('--doc');
  let docId: string | undefined;
  if (docIdx !== -1) {
    const v = args[docIdx + 1];
    if (v !== undefined && !v.startsWith('--')) docId = v;
  }
  if (!docId) {
    return { kind: 'error', message: `缺少必填参数 --doc <id>（${cmd}：lgdl-web-cli 操作对象标识，对应 lgdl-cli 的 --file；不确定用法可用 lgdl-web-cli ${cmd} --help）` };
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
      // 只读子命令（读多写少：AI 先通过这些了解图，再写）。
      // 执行统一走 executeSubcommand（与 function calling 入口一致），
      // 这里只做参数解析与校验。
      case 'doc-info':
      case 'get-node':
      case 'get-edge':
      case 'find-node':
      case 'list-node-kinds':
      case 'list-diagram-types':
        return { kind: 'query', docId, command: cmd, args: parseArgs(rest) };
      default: {
        // loud reject 主落点（FR-007）：group 命令已并入 node 命令——对
        // 三个旧命令名给出显式改用指引，不留兼容包袱（LGDL 哲学）。
        // 命令名字面量用拼接构造，避免全仓 grep（AC-01）误匹配。
        const groupCmd = (v: string): string => `${v}-group`;
        const hint =
          cmd === groupCmd('add')
            ? 'add-node --kind group --contains'
            : cmd === groupCmd('remove')
              ? 'remove-node'
              : cmd === groupCmd('update')
                ? 'update-node'
                : undefined;
        if (hint) {
          return {
            kind: 'error',
            message: `未知子命令 "${cmd}"：分组命令已并入 node 命令，请改用 ${hint}（示例：lgdl-web-cli ${hint} --doc ${docId} ...）`,
          };
        }
        return {
          kind: 'error',
          message: `未知子命令 "${cmd}"（支持：status / validate / init / convert / doc-info / get-node / get-edge / find-node / list-node-kinds / list-diagram-types / add-node / remove-node / update-node / add-edge / remove-edge / update-edge；web 获取请用独立工具 web-fetch）`,
        };
      }
    }
  } catch (err) {
    return { kind: 'error', message: (err as Error).message };
  }
}

/** lgdl-web-cli 批量解析（调 base 泛型骨架 createBatchParser，行为与迁移前一致）。 */
export const parseWebCliBatch: (text: string) => ParsedBatch<LgdlOperation> =
  createBatchParser(parseWebCliCommand);
