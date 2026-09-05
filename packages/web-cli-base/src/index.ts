/**
 * @lgdl/web-cli-base — AI-callable command execution framework (domain-neutral)
 *
 * Framework core (mechanism only, zero LGDL dependency):
 *   commands (CommandSpec/KindResolver shells) / operations (generic applier) /
 *   exec (generic DomainApi<Op,Doc> pipeline) / protocol (tokenize/parse skeleton) /
 *   help (HelpArg/HelpEntry types) / tools / llm /
 *   router (CommandRouter 顶层工具路由：注册表 + dispatch + schema/help/前缀派生 + delay gate) ★ /
 *   delay (DelayGate + Clock：路由层命令间最小间隔) ★ /
 *   runner (AgentRunner 中性 AI-tool-workflow 循环) ★
 *
 * LGDL business surface migrated to web-cli 业务包 (F-13 ②);
 * web-fetch / sleep / web-cli-help builtins live here as neutral capabilities.
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
export { WEB_FETCH_TOOL, SLEEP_TOOL, WEB_CLI_HELP_TOOL } from './tools.js';
export { parseWebFetchCommand, executeWebFetch } from './web-fetch.js';
export type { ParsedWebFetch } from './web-fetch.js';
export { parseSleepCommand, executeSleep, executeSleepFromArgs, normalizeSleepArgs } from './sleep.js';
export type { ParsedSleep, NormalizedSleep } from './sleep.js';
export { webFetchHelp, webSleepHelp } from './help.js';
// CommandRouter（ADR-001）：注册表单一数据源 + 统一分发契约
export { CommandRouter, createCommandRouter } from './router.js';
export type { ToolEntry, ToolResult, ToolContext, ToolExecutor, ToolCallArgs, ToolFunctionDef, RouterOptions, BuiltinName } from './router.js';
// DelayGate + Clock（ADR-003）：路由层命令间最小间隔
export { DelayGate, clampDelayMs, realClock } from './delay.js';
export type { Clock, DelayStats } from './delay.js';
// AgentRunner（ADR-002）：中性 agent 循环（事件/hooks，零 react）
export { createAgentRunner } from './runner.js';
export type { AgentRunnerOptions, AgentRunnerEvents, AgentRunnerHooks, AgentRun, RunOutcome } from './runner.js';
