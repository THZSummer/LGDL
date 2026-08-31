/**
 * @lgdl/web-cli-base — AI-callable command execution framework
 *
 * Framework core (domain-neutral): commands / operations / exec / protocol / help / tools / llm
 * LGDL adapter (first adapter scenario): adapters/lgdl.ts
 *
 * NOTE: index exports both framework core and the LGDL adapter singleton
 * (transitional dual-surface export, ADR-003; to be converged at F-13 ②).
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
export { describeOperation, createOperationApplier } from './operations.js';
export type { OperationMutations, OperationBatchResult } from './operations.js';
export { WEB_CLI_TOOL } from './tools.js';
export { chat, parseToolArguments, classifyError } from './llm.js';
export type { ChatTurn, WebCliToolCall, ChatResult, LlmConfig, LlmProviderInfo, LlmToolDef } from './llm.js';
export type { LgdlOperation } from '@lgdl/core';
export { tokenizeCli, parseArgs, parseWebCliCommand, parseWebCliBatch } from './protocol.js';
export type { ParsedCommand, ParsedBatch } from './protocol.js';
export { webCliHelp } from './help.js';
export type { HelpArg, HelpEntry } from './help.js';
export { createExecutor } from './exec.js';
export type { DomainApi, ExecutorOptions, Executor, LineHandleResult, CommandExecResult } from './exec.js';
// LGDL 适配单例（首个适配场景，过渡形态 ADR-003）
export { lgdlKindResolver, lgdlBuildOperation, lgdlApplier, lgdlDomain, lgdlExecutor } from './adapters/lgdl.js';
import { lgdlApplier } from './adapters/lgdl.js';
// 适配单例具名导出（符号名与迁移前一致——cli 9 命令调用点零改动，ADR-003）
export const applyOperation = lgdlApplier.applyOperation;
export const applyOperations = lgdlApplier.applyOperations;
