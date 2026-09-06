/**
 * @lgdl/web-cli-base — AI-callable command execution framework (domain-neutral)
 *
 * Framework core (mechanism only, zero LGDL dependency):
 *   commands (CommandSpec/KindResolver shells) / operations (generic applier) /
 *   exec (generic DomainApi<Op,Doc> pipeline) / protocol (tokenize/parse skeleton) /
 *   help (HelpArg/HelpEntry types) / tools / llm /
 *   router (CommandRouter 顶层工具路由：注册表 v2 + dispatch 五步链 + delay gate) ★ /
 *   delay (DelayGate + Clock：路由层命令间最小间隔) ★ /
 *   runner (AgentRunner 中性 AI-tool-workflow 循环) ★
 *
 * v2 机制层（P0，NFR-007 导出面）：
 *   permission (PermissionGate 框架级门禁/ask 契约/EC-014 deny 优先) ★ NEW
 *   audit (AuditSink 事件面：权限/调用/扩展注册/上下文压缩) ★ NEW
 *   platform (PlatformEnv 浏览器能力适配器 + browserEnv/nodeEnv + 授权转译) ★ NEW
 *   assembly (默认目录/矩阵组装器 + createDefaultRouter 自足冒烟) ★ NEW
 *
 * v2 P0 域工具（浏览器生态位，零 LGDL）：
 *   storage (mem/idb/opfs 载体 + storage/storage-quota 工具) / settings /
 *   doc-tools (doc-read/doc-edit) / session-store + session-tool + context-tool /
 *   web-search（端点场景注入；未配置禁用）
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
export { parseWebFetchCommand, executeWebFetch, executeWebFetchArgs, executeWebFetchWithOptions, htmlToMarkdown, classifyWebFetchError } from './web-fetch.js';
export type { ParsedWebFetch, WebFetchOptions, FetchErrorCategory } from './web-fetch.js';
export { parseSleepCommand, executeSleep, executeSleepFromArgs, normalizeSleepArgs } from './sleep.js';
export type { ParsedSleep, NormalizedSleep } from './sleep.js';
export { webFetchHelp, webSleepHelp } from './help.js';
// CommandRouter（ADR-001）：注册表 v2（命名空间/分组/开关/动态注册）+ 五步链分发
export { CommandRouter, createCommandRouter, fqNameOf } from './router.js';
export type { ToolEntry, ToolResult, ToolContext, ToolExecutor, ToolCallArgs, ToolFunctionDef, ToolServices, RouterOptions, RouterPolicy, RegisterOptions, RouterQuery, BuiltinName } from './router.js';
// DelayGate + Clock（ADR-003）：路由层命令间最小间隔
export { DelayGate, clampDelayMs, realClock } from './delay.js';
export type { Clock, DelayStats } from './delay.js';
// AgentRunner（ADR-002）：中性 agent 循环（事件/hooks，零 react）
export { createAgentRunner } from './runner.js';
export type { AgentRunnerOptions, AgentRunnerEvents, AgentRunnerHooks, AgentRun, RunOutcome } from './runner.js';
// v2 机制层（FR-005~010/EC-001~003/014）
export { PermissionGate, createPermissionGate, createAskHandle, globMatch, defaultActionForRisk } from './permission.js';
export type { PolicyConfig, PolicyRule, PolicyStrategy, PolicyAction, ToolRisk, AskQuestion, AskResolution, AskHandle, PermissionDecision, PermissionGateHooks, RuleCheckContext, StrategyCheckContext } from './permission.js';
export { createMemoryAudit, createConsoleAudit, createAudit } from './audit.js';
export type { AuditSink, AuditEvent, AuditEventType, MemoryAuditSink, ContentTrust } from './audit.js';
export { nodeEnv, browserEnv, classifyCapabilityError, capabilityGuidance, translateCapabilityError } from './platform.js';
export type { PlatformEnv, PlatformKv, PlatformStorageQuota, PlatformClipboard, PlatformNotify, PlatformFilePicker, PlatformWorkerFactory, PlatformPermissions, PlatformDom, WebSearchOutcome, WebSearchResultItem, CapabilityErrorKind } from './platform.js';
// v2 assembly（矩阵 + 默认 router；FR-039/AC-001）
export { buildDefaultMatrix, createP0DomainTools, createDefaultRouter } from './assembly.js';
export type { MatrixRow, AssemblyContext } from './assembly.js';
// v2 P0 存储域（FR-013~015/042；EC-004/005/013）
export { createMemoryStorage, MemoryStorage, byteSize, isQuotaError } from './storage-mem.js';
export type { StorageBackend, StorageEntry, StorageEstimate, StorageWriteResult } from './storage-mem.js';
export { createIdbStorage } from './storage-idb.js';
export type { IdbStorageOptions } from './storage-idb.js';
export { createOpfsStorage } from './storage-opfs.js';
export type { OpfsStorageOptions } from './storage-opfs.js';
export { createStorageToolEntry, createStorageQuotaToolEntry, createStorageTools, executeStorage, executeStorageQuota, storageHelp, storageQuotaHelp } from './storage-tools.js';
export { createMemoryKv, createLocalStorageKv, createSettingsStore, createSettingsToolEntry, executeSettings, SettingsStore, settingsHelp } from './settings.js';
export type { SettingsKv } from './settings.js';
// v2 P0 内容对象域（FR-011/012）
export { createDocTools, createDocReadToolEntry, createDocEditToolEntry, executeDocRead, executeDocEdit, applyDocEdit, resolveDocContent } from './doc-tools.js';
export type { DocToolDeps, DocReadableMeta, DocEditOp, DocEditSpec, ApplyDocEditResult } from './doc-tools.js';
// v2 P0 会话/上下文域（FR-034/035；EC-005/013）
export { SessionStore, createSessionStore } from './session-store.js';
export type { SessionRecord, SessionResumePoint, SessionSaveResult } from './session-store.js';
export { createSessionToolEntry, executeSessionTool, sessionHelp } from './session-tool.js';
export type { SessionToolDeps } from './session-tool.js';
export { createContextToolEntry, executeContextTool, contextHelp } from './context-tool.js';
export type { ContextToolDeps, Summarizer } from './context-tool.js';
// v2 NET P0（FR-018~019/010/040；EC-006）
export { createWebSearchToolEntry, executeWebSearch, WEB_SEARCH_CONFIG_GUIDE, webSearchHelp } from './web-search.js';
export type { CreateWebSearchToolOptions } from './web-search.js';
// v2 P1 检索域（FR-016/017；EC-011）
export { createSearchTools, createSearchContentToolEntry, createListResourcesToolEntry, executeSearchContent, executeListResources, compileSearchPattern, searchContentHelp, listResourcesHelp } from './search-tools.js';
export type { SearchToolDeps, SearchResourceProvider, SearchResourceMeta, SearchHit, SearchContentArgs, ResourceKind, SearchPattern } from './search-tools.js';
// v2 P1 DOM/UI 域（FR-022/023）
export { createDomToolEntry, executeDomTool, domHelp } from './dom-tools.js';
export type { DomSubcommand } from './dom-tools.js';
export { createAskUserToolEntry, executeAskUser, buildAskQuestion, askUserHelp } from './ask-user.js';
export type { AskUserKind, AskUserQuestion, AskUserAnswer, AskResponder, AskUserArgs } from './ask-user.js';
// v2 P1 任务/状态域（FR-029~032；EC-008/009/013/015）
export { TodoStore, createTodoStore, createTodoToolEntry, executeTodoTool, todoHelp } from './todo.js';
export type { TodoItem, TodoSessionState, TodoToolDeps } from './todo.js';
export { GoalStore, createGoalStore, createGoalToolEntry, executeGoalTool, goalHelp } from './goal.js';
export type { GoalRecord, GoalStatus, GoalToolDeps } from './goal.js';
export { JobStore, markJobsInterrupted, submitJob, isJobTerminal, createJobsToolEntry, executeJobsTool, jobsHelp } from './jobs.js';
export type { JobRecord, JobStatus, JobRunContext, JobRunner, JobsToolDeps } from './jobs.js';
export { createSubagentToolEntry, executeSubagent, parseWhitelist, subagentHelp } from './subagent.js';
export type { SubagentToolDeps, SubagentArgs } from './subagent.js';
// v2 P1 执行+扩展域（FR-026/036/008/038；EC-007）
export { createEvalJsToolEntry, createWorkerEvalExecutor, createFnEvalExecutor, executeEvalJs, evalJsHelp } from './eval-tools.js';
export type { EvalExecutor, EvalOutcome, EvalRequest, EvalResponse, EvalArgs } from './eval-tools.js';
export { parseSkillMd, createSkillPrompt, installSkill, fetchRemoteSkill, buildSkillSection } from './skill-loader.js';
export type { SkillDef, SkillFrontmatter, InstallSkillOptions } from './skill-loader.js';
// v2 P2 浏览器/网络试点（FR-020/021/024/025；可裁剪）
export { createNotifyToolEntry, executeNotify, notifyHelp } from './notify.js';
export type { NotifyArgs } from './notify.js';
export { createClipboardToolEntry, executeClipboard, clipboardHelp } from './clipboard.js';
export type { ClipboardArgs } from './clipboard.js';
export { createSaveFileToolEntry, executeSaveFile, saveFileHelp } from './save-file.js';
export type { SaveFileArgs } from './save-file.js';
export { createStreamToolEntry, executeStream, streamHelp } from './stream.js';
export type { StreamConnector, StreamHandle, StreamMessage, StreamToolDeps, StreamArgs } from './stream.js';
// v2 P2 执行/编排/MCP 试点（FR-026~028/037/038；workflow 按 S-04 后置裁剪）
export { createExecRemoteToolEntry, executeExecRemote, execRemoteHelp } from './exec-remote.js';
export type { RemoteExecBridge, RemoteExecArgs } from './exec-remote.js';
export { WorkerSession, createWorkerSession, createWorkerSessionToolEntry, workerSessionHelp } from './worker-session.js';
export type { WorkerSessionToolDeps } from './worker-session.js';
export { McpClient, createMcpClient, connectMcpSource } from './mcp-client.js';
export type { McpClientOptions, McpJsonRpc, McpToolInfo, ConnectMcpSourceOptions, ConnectMcpResult } from './mcp-client.js';
export { createEvalWasmToolEntry, executeEvalWasm, createWorkerWasmExecutor, evalWasmHelp } from './eval-tools.js';
export type { WasmExecutor, WasmArgs } from './eval-tools.js';
