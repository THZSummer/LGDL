/**
 * @lgdl/lgdl-web-cli — LGDL web-cli 业务包（F-13 ② 抽取）。
 *
 * 承载 LGDL 领域语义（自 web-cli-base 迁出）：
 *   - commands.ts：9 个增量命令注册表 + buildOperation
 *   - operations.ts：LgdlOperation 协议 + lgdlDispatch 分派映射（调 base 泛型工厂）
 *   - protocol.ts：'lgdl-web-cli' 前缀路由 + 17 子命令枚举（复用 base tokenizeCli/parseArgs）
 *   - help.ts：webCliHelp 自文档（HelpArg/HelpEntry 自 base）
 *   - tools.ts：WEB_CLI_TOOL（逐字节）
 *   - adapters/lgdl.ts：组装单点（lgdlDomain/lgdlExecutor 具名导出）
 *
 * 依赖方向：→ @lgdl/web-cli-base（泛型机制）+ @lgdl/lgdl-core（类型契约），单向无环。
 */
export {
  COMMANDS,
  KNOWN_PARAMS,
  buildOperation,
  requireParams,
  assertChangeRequested,
  parseAttrsSpec,
  parseMemberSpec,
} from './commands.js';
export type { CommandSpec, KindResolver } from './commands.js';
export { describeOperation, lgdlDispatch } from './operations.js';
export type { OperationMutations } from './operations.js';
export { WEB_CLI_TOOL } from './tools.js';
export { createLgdlWebCliTool } from './tool-entry.js';
export { parseWebCliCommand, parseWebCliBatch } from './protocol.js';
export { webCliHelp } from './help.js';
export type { LgdlOperation } from '@lgdl/lgdl-core';
// LGDL 适配单点（lgdlDomain 19 符号组装 + lgdlExecutor + 具名导出）
export {
  lgdlKindResolver,
  lgdlBuildOperation,
  lgdlApplier,
  lgdlDomain,
  lgdlExecutor,
  executeSubcommand,
  executeCommands,
  describeCommandLine,
} from './adapters/lgdl.js';
// 适配单例具名导出（符号名与迁移前一致——cli 9 命令调用点零改动，ADR-003）
import { lgdlApplier } from './adapters/lgdl.js';
export const applyOperation = lgdlApplier.applyOperation;
export const applyOperations = lgdlApplier.applyOperations;
