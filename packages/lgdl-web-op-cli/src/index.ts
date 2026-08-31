/**
 * @lgdl/lgdl-web-op-cli — LGDL web op-cli 业务包（F-13 ② 抽取）。
 *
 * UI 操作命令元数据（OP_COMMANDS 单一数据源）+ WEB_OP_TOOL + webOpHelp +
 * next-actions + OpHandlerRegistry 注入面。零 UI 框架依赖（NFR-004）；
 * 依赖方向：→ @lgdl/web-cli-base（仅 HelpArg/HelpEntry 类型），单向无环。
 */
export { OP_COMMANDS, OP_SUBCOMMANDS } from './ops.js';
export { WEB_OP_TOOL } from './tool.js';
export { webOpHelp } from './help.js';
export type { HelpEntry } from './help.js';
export { parseNextActions } from './next-actions.js';
export type { NextAction } from './next-actions.js';
export { OpHandlerRegistry, createOpHandlerRegistry } from './handlers.js';
export type { OpExecResult, OpHandler } from './handlers.js';
