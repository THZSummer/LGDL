/**
 * lgdl-web-op-cli 工具注册条目（FR-019/D-004）。
 *
 * UI 操作工具整体注册为一个 ToolEntry：schema=WEB_OP_TOOL（enum 已由
 * OP_SUBCOMMANDS 派生 ops.ts:87-90）、prefix='lgdl-web-op-cli'、
 * executor 转发 registry.execute、help=webOpHelp。
 *
 * OpHandlerRegistry 的「工具级注册/分发」顶层角色已由 CommandRouter 承接
 * （D-004/R-005）：消费方不再经 opRegistry.execute 直连分发——handler 注入
 * （App 16 个 React handler）保留为该工具执行器的内部机制，经本条目组装后
 * 注册进 router。next-actions 语义由场景拦截（runner hooks.intercept）承接，
 * 不在本条目内。
 *
 * C 档零改动：ops.ts / tool.ts / handlers.ts / help.ts / next-actions.ts 源码不动。
 */
import type { ToolCallArgs, ToolEntry } from '@lgdl/web-cli-base';
import type { OpHandlerRegistry } from './handlers.js';
import { WEB_OP_TOOL } from './tool.js';
import { webOpHelp } from './help.js';

/** 构建 lgdl-web-op-cli 工具条目（registry 由场景组装注入，FR-019）。 */
export function createOpCliToolEntry(registry: OpHandlerRegistry): ToolEntry {
  return {
    name: WEB_OP_TOOL.function.name,
    summary: 'UI 操作（复制/导出/缩放/定位/全屏/推荐下一步）',
    schema: WEB_OP_TOOL.function,
    prefix: WEB_OP_TOOL.function.name,
    help: () => webOpHelp(),
    executor: async (tc: ToolCallArgs) => {
      const r = registry.execute(tc.subcommand, tc.args);
      return { ok: r.ok, output: r.output, error: r.ok ? undefined : r.output };
    },
  };
}
