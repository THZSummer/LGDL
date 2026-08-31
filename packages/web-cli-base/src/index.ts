/**
 * @lgdl/web-cli-base — AI-callable command execution framework (domain-neutral)
 *
 * Framework core (mechanism only, zero LGDL dependency):
 *   commands (CommandSpec/KindResolver shells) / operations (generic applier) /
 *   exec (generic DomainApi<Op,Doc> pipeline) / protocol (tokenize/parse skeleton) /
 *   help (HelpArg/HelpEntry types) / tools / llm
 *
 * LGDL business surface migrated to web-cli 业务包 (F-13 ②);
 * web-fetch platform tool lives here as a neutral capability (web-fetch).
 */
export { requireParams, assertChangeRequested } from './commands.js';
export type { CommandSpec, KindResolver } from './commands.js';
export { createOperationApplier } from './operations.js';
export type { OperationBatchResult } from './operations.js';
export { chat, parseToolArguments, classifyError } from './llm.js';
export type { ChatTurn, WebCliToolCall, ChatResult, LlmConfig, LlmProviderInfo, LlmToolDef } from './llm.js';
export { tokenizeCli, parseArgs, createBatchParser } from './protocol.js';
export type { ParsedCommand, ParsedBatch } from './protocol.js';
export type { HelpArg, HelpEntry } from './help.js';
export { createExecutor } from './exec.js';
export type { DomainApi, ExecutorOptions, Executor, LineHandleResult, CommandExecResult, ParseResult, MutationResult, Issue } from './exec.js';
export { WEB_FETCH_TOOL } from './tools.js';
export { parseWebFetchCommand, executeWebFetch } from './web-fetch.js';
export type { ParsedWebFetch } from './web-fetch.js';
export { webFetchHelp } from './help.js';
