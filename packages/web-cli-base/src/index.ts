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
// ================= v3 P1 导出面收口（TASK-009；NFR-006：新能力类型/工厂全量可达；既有导出零删除） =================
// v3 P1 定位/敏感纯逻辑域（FR-015/ADR-007 + FR-024/ADR-004；零 LGDL 依赖）
export { parseLocator, locatorSyntaxHelp, LOCATOR_SYNTAX_GUIDE, LOCATOR_MULTI_MATCH_NOTE } from './locator.js';
export type { LocatorQuery, CssLocatorQuery, TextLocatorQuery, LocatorQueryType, TextMatchMode, LocatorParseOptions, LocatorParseResult, LocatorErrorKind } from './locator.js';
export { sensitiveFieldMatch, isSensitiveField, maskValue, sensitiveWriteDecision, SENSITIVE_READ_NOTE, SENSITIVE_WRITE_NOTE } from './sensitive.js';
export type { FieldIdentity, SensitiveRule, SensitiveKind, SensitiveMatch, SensitiveWriteDecision } from './sensitive.js';
// v3 P1 PlatformDomOps additive 扩展面类型（FR-002/003；新能力类型全部从包根可达，消费端/测试 fake 类型齐全）
export type {
  PlatformDomOps, PlatformDomOpResult, PlatformDomState, PlatformClickOptions,
  PlatformInteractivesOptions, PlatformReadElementFields, PlatformReadElementOptions,
  PlatformFindElementsOptions, PlatformStructurePart, PlatformReadStructureOptions,
  PlatformSnapshotStructuredOptions, PlatformTypeTextOptions, PlatformPressKeyOptions,
  PlatformSetStyleOptions, PlatformFillField, PlatformFillFormOptions, PlatformInsertPosition,
  PlatformAddElementOptions, PlatformWaitKind, PlatformWaitCondition, PlatformWaitForOptions,
  PlatformEvaluateOptions, PlatformExtractKind, PlatformExtractDataOptions, PlatformScreenshotOptions,
} from './platform.js';
// v3 P1 浏览器面真实 DOM ops（TASK-004：4 桩补真 + ~25 新能力；FR-003/ADR-008）
export { createBrowserDomOps } from './platform-dom.js';
export type { DomOpsScope } from './platform-dom.js';
// v3 P1 wait 条件等待（FR-025/ADR-005；独立单动词工具 risk:'read'）
export { createWaitToolEntry, executeWaitTool, parseWaitArgs, waitHelp, WAIT_KINDS, WAIT_MODE_DEFAULT, WAIT_TIMEOUT_DEFAULT_MS, WAIT_TIMEOUT_MAX_MS, WAIT_INTERVAL_DEFAULT_MS } from './wait-tools.js';
export type { ParsedWaitArgs, WaitConditionSource, WaitFailure } from './wait-tools.js';
// v3 P1 page-eval 页面 evaluate（FR-008/037/045/ADR-002；最高档 evaluate 门禁）
export { createPageEvalToolEntry, executePageEval, pageEvalHelp, summarizeCode, recordPageEvalAudit, PAGE_EVAL_DEFAULTS } from './page-eval.js';
export type { PageEvalDecision, PageEvalAuditInfo } from './page-eval.js';
// v3 P1 采集缓冲 CollectBuffer（FR-042/ADR-006；session 内存态护栏/trust）
export {
  createCollectBuffer, maskCollectRow, maskCollectRows, collectFields,
  COLLECT_DEFAULT_MAX_ITEMS_PER_APPEND, COLLECT_DEFAULT_MAX_TOTAL_ROWS, COLLECT_DEFAULT_MIN_INTERVAL_MS, COLLECT_DEFAULT_DEDUPE,
} from './collect.js';
export type { CollectRow, CollectTrust, CollectMeta, CollectEntryStats, CollectEntry, CollectBufferStats, CollectBufferOptions, CollectAppendOk, CollectAppendBlock, CollectAppendResult, CollectRateCheck, CollectBuffer } from './collect.js';
// v3 P1 extract/export 采集工具（FR-038~041/ADR-006；共享 buffer + xlsx 注入扩展点）
export {
  createCollectToolEntries, createExtractToolEntry, createExportToolEntry,
  executeExtractTool, executeExportTool, parseExtractedOutput, extractHelp, exportHelp,
  csvEscapeCell, cellText, serializeRowsText, serializeRowsJson, serializeRowsCsv,
  resolveExportFormat, defaultExportFilename,
  COLLECT_EXTRACT_KINDS, COLLECT_EXPORT_FORMATS, EXPORT_DEGRADE_PREVIEW_MAX,
} from './collect-tools.js';
export type { CollectExtractKind, ExtractArgs, CollectExportFormat, XlsxSerializer, ExportArgs, CollectExportMeta } from './collect-tools.js';
// ================= v3 P2 chrome 导出收口（TASK-011；NFR-006：TASK-010 产物类型/工厂全量可达；既有导出零删除） =================
// v3 P2 chrome 浏览器外壳工具（FR-026~028/ADR-003；TASK-010 chrome-tools.ts —— print/back/forward/reload/screenshot 5 子命令 + subcommandRisks + dataUrl 下载链输出策略）
export {
  createChromeToolEntry, executeChromeTool, chromeHelp,
  CHROME_SUBCOMMANDS, SCREENSHOT_DATAURL_HEAD_BUDGET,
  parsePngSizeFromDataUrl, summarizeScreenshotData, screenshotFilename,
} from './chrome-tools.js';
export type { ChromeSubcommand, ScreenshotDataSummary } from './chrome-tools.js';
// ================= v4 导出收口（TASK-011；NFR-006：新能力类型/工厂/纯逻辑全量可达；既有导出零删除） =================
// v4 EVT 事件通道纯机制（FR-008~015/ADR-002~005）
export { createEventBus, EventBus, DEFAULT_BUDGETS, JITTER_EVENT_TYPES, isJitterType } from './event-bus.js';
export type {
  BusEventKind, BusEventSource, BusEvent, IngestEvent, BusSubscriptionFilter, SubscribeBusOptions,
  BusSubSummary, EventSubscribeResult, EventOpOutcome, EventPullResult, ChannelStatus,
  EventBusOptions, EventBusAuditEvent, EventBusAuditHook,
} from './event-bus.js';
// v4 浏览器面事件观察工厂（FR-003/008~015；platform.ts browserEnv 已装配 env.events）
export { createBrowserEventHub } from './platform-events.js';
export type { BrowserEventScope } from './platform-events.js';
// v4 events/cookie/dialog 工具工厂（lgdl-web session 矩阵消费）
export { createEventsToolEntry, executeEventsTool, eventsHelp, EVENTS_SUBCOMMANDS, OBSERVE_KINDS } from './events-tools.js';
export type { EventsSubcommand } from './events-tools.js';
export { createCookieToolEntry, executeCookieTool, cookieHelp, COOKIE_SUBCOMMANDS } from './cookie-tools.js';
export type { CookieSubcommand } from './cookie-tools.js';
export { createDialogToolEntry, executeDialogTool, dialogHelp, DIALOG_SUBCOMMANDS } from './dialog-tools.js';
export type { DialogSubcommand } from './dialog-tools.js';
export { createNetToolEntry, executeNetTool, netHelp, NET_SUBCOMMANDS, applyNetRules, netRuleMatches, netHitAudit } from './net-tools.js';
export type { NetSubcommand, NetRequestLike, NetApplyResult } from './net-tools.js';
export {
  resolveDialogAction, isDestructiveText, DESTRUCTIVE_PATTERNS, DIALOG_POLICY_NOTE,
} from './dialog-policy.js';
export type { DialogType, DialogAction, DialogContext, DialogDecision } from './dialog-policy.js';
// v4 平台缝类型面（PlatformEventHub/PlatformRichClipboard/PlatformDomOps cookie/touch 扩展）
export type {
  PlatformObserveKind, PlatformEventFilter, PlatformSubscribeOptions, PlatformSubResult, PlatformSubSummary,
  PlatformPullResult, PlatformChannelStatus, PlatformEventOpOutcome, PlatformBudgetOptions, PlatformBusEvent,
  PlatformObserveSourceController, PlatformEventSources, PlatformEventHub, PlatformRichClipboard,
  PlatformPasteCaptureItem, PlatformDialogRuleSpec, PlatformDialogOverrideController,
  PlatformNetAction, PlatformNetRuleSpec, PlatformNetInterceptController,
  PlatformCookieItem, PlatformCookieReadOptions, PlatformCookieWriteOptions, PlatformCookieDeleteOptions,
  PlatformTouchKind, PlatformTouchOptions,
} from './platform.js';
// v4 FR-006 脱敏函数族 + FR-007 audit 事件面（audit 类型经既有导出自动扩展）
export {
  redactUrlQuery, isSensitiveHeader, maskHeaderValue, maskTextPayload, maskByMode,
  SENSITIVE_URL_PARAM_NAMES, SENSITIVE_HEADER_NAMES, DEFAULT_TEXT_MASK_POLICY,
  TYPING_PAYLOAD_POLICY, CONSOLE_TEXT_POLICY, DIALOG_TEXT_POLICY, RICH_CLIPBOARD_TEXT_POLICY,
  SENSITIVE_V4_NOTE,
} from './sensitive.js';
export type { TextMaskMode, TextMaskPolicy } from './sensitive.js';
// v4 富剪贴板子命令（FR-021/022）
export { executeClipboardRich, CLIPBOARD_RICH_SUBCOMMANDS } from './clipboard.js';
export type { ClipboardRichSubcommand } from './clipboard.js';
// v4 EXT 归属/契约预留（FR-025~027/ADR-012；纯文档面）
export { ATTRIBUTION_MAP, unsupportedAttribution, attributionHelpLines, EXT_DISCIPLINE_NOTE } from './ext-attribution.js';
export type { AttributionEntry } from './ext-attribution.js';
// v4 穿透定位护栏（FR-023/ADR-011）
export { PENETRATION_MAX_DEPTH, parseCookieString } from './platform-dom.js';
export type { PenetrationVia } from './platform-dom.js';
