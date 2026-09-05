/**
 * lgdl-web-cli 工具注册条目（FR-018/D-001）。
 *
 * 图内容操作工具整体注册为一个 ToolEntry：schema=WEB_CLI_TOOL 逐字节、
 * executor 内部走既有 lgdlExecutor.executeSubcommand 管线（17 子命令 /
 * 9 增量命令 / exec 命令族语义 C 档零改动，NG-002）、help=webCliHelp。
 *
 * changed/source 语义：文档变更类工具原样返回（ToolResult.changed/source），
 * 场景侧（runner hooks.onToolDone → onApply 编辑器写回）决定如何应用自身状态
 * （FR-002，不绑 React）。
 *
 * C 档零改动：adapters/lgdl.ts / commands / operations / protocol / help / tools
 * 源码不动（本文件只做条目组装 + 转发）。
 */
import type { ToolCallArgs, ToolContext, ToolEntry } from '@lgdl/web-cli-base';
import { lgdlExecutor } from './adapters/lgdl.js';
import { WEB_CLI_TOOL } from './tools.js';
import { webCliHelp } from './help.js';

/** 构建 lgdl-web-cli 工具条目（整体注册为一个工具，FR-018）。 */
export function createLgdlWebCliTool(): ToolEntry {
  return {
    name: WEB_CLI_TOOL.function.name,
    summary: '图内容操作（读 status/查询，写 增删改节点边分组）',
    schema: WEB_CLI_TOOL.function,
    prefix: WEB_CLI_TOOL.function.name,
    help: () => webCliHelp(),
    executor: async (tc: ToolCallArgs, ctx: ToolContext) => {
      const exec = await lgdlExecutor.executeSubcommand(
        ctx.source ?? '',
        tc.subcommand,
        tc.args,
        ctx.docId,
      );
      return {
        ok: exec.ok,
        output: exec.lines.join('\n') || '(无输出)',
        changed: exec.changed,
        source: exec.source,
        error: exec.error,
      };
    },
  };
}
