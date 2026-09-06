/**
 * lgdl-web AI 会话单一组装点（FR-022/AC-007；v2 组装点扩展 FR-039~042/044）。
 *
 * lgdl-web 内唯一 CommandRouter 实例持有处：base 内建自动注册（web-fetch /
 * sleep / web-cli-help，FR-020）+ lgdl-web-cli / lgdl-web-op-cli 业务工具注册
 * （FR-018/019）+ v2 P0 域工具（assembly 矩阵消费：storage/settings/doc/
 * session/context 默认开；web-search 条件开=配 key 后，EC-006）+ 全局 delay
 * 600ms（FR-015）+ AgentRunner 装配（chatFn 的 schema 供给 = router.deriveTools()；
 * dispatch 绑定 router + ctx 每调用取 getSource，changed 后推进 run-local source，
 * R-009；ctx.services 注入 SessionStore/audit = FR-044 状态态）。
 *
 * v2 组装点扩展（§2.3.5）：
 *   1. env 绑定：browserEnv() 注入（测试/场景可用 deps.env 覆盖缝）
 *   2. 默认注册矩阵：assembly.createP0DomainTools（P0 子集；P1 扩域在 TASK-012）
 *   3. ask 桥：router policy（deps.policy：rules/strategies + onAsk → 场景 AskDialog）
 *   4. services：SessionStore（deps.sessionStore 或 memory 降级）注入 dispatch ctx
 *   5. web-search 条件注册：provider 应用态 webSearch（BYOK）→ env.search 注入；
 *      未配置 → env.search 缺省 → 工具报禁用态 + 配置指引（EC-006）
 *
 * LGDL 特有回调不在此组装：onApply 编辑器写回 / next-actions 拦截 / 渲染事件
 * 由场景（App/AiPanel）经 runAgent(init) 的 system/events/hooks 注入（D-003）——
 * 本文件零 React import（可纯 node 测试）。
 */
import {
  createCommandRouter,
  createAgentRunner,
  browserEnv,
  createMemoryStorage,
  createSessionStore,
  createP0DomainTools,
  createSearchTools,
  createDomToolEntry,
  createAskUserToolEntry,
  createTodoToolEntry,
  createGoalToolEntry,
  createJobsToolEntry,
  createEvalJsToolEntry,
  createSubagentToolEntry,
  createGoalStore,
  JobStore,
  type AgentRunnerOptions,
  type AgentRun,
  type AskQuestion,
  type AskResolution,
  type AskResponder,
  type AuditSink,
  type CommandRouter,
  type GoalStore,
  type PlatformEnv,
  type RouterPolicy,
  type SessionStore,
  type StorageBackend,
  type ToolContext,
  type ToolResult,
  type WebCliToolCall,
  type WebSearchOutcome,
} from '@lgdl/web-cli-base';
import { createLgdlWebCliTool } from '@lgdl/lgdl-web-cli';
import { createOpCliToolEntry, type OpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import { chat } from './provider.js';
import type { ProviderSettings } from './provider.js';

export interface AiSessionDeps {
  /** 当前文档 id（web-cli 的 --doc 隐式对象；亦作会话 id 位）。 */
  docId: string;
  /** App source 状态读取器（每次分发取当前编辑器源码）。 */
  getSource(): string;
  /** App applyAiSource（编辑器写回；runner hooks.onToolDone 场景侧调用）。 */
  onApply(source: string): void;
  /** App 16 handler 组装后的 op 执行器注册表。 */
  opRegistry: OpHandlerRegistry;
  /** provider 应用态读取器（每轮 chat 取最新 settings）。 */
  settings(): ProviderSettings;
  // ---- v2 组装点扩展（均可选，缺省 = F-23 语义兼容） ----
  /** env 覆盖缝（测试注入 fake 缝；缺省 browserEnv()）。 */
  env?: Partial<PlatformEnv>;
  /** 权限策略 + ask 桥（FR-005/007：deps.policy.onAsk → 场景 AskDialog 裁决）。 */
  policy?: RouterPolicy;
  /** 审计接收器（NFR-009；缺省不记录）。 */
  audit?: AuditSink;
  /** SessionStore（浏览器建议注入 IDB 载体；缺省 memory 降级，EC-005 明示不持久）。 */
  sessionStore?: SessionStore;
  /** 共享存储载体（goal/job 等 origin 级记录；缺省 memory —— 浏览器注入 IDB）。 */
  backend?: StorageBackend;
  /** goal/jobs store（缺省经 backend 新建）。 */
  goalStore?: GoalStore;
  jobStore?: JobStore;
  /** ask-user 应答器（FR-023：场景 AskDialog 注入；与权限 ask 不同入口）。 */
  askUser?: AskResponder;
}

/** runAgent 场景侧注入（system/events/hooks/maxRounds 与 runner 对齐；user 为初始指令）。 */
export type RunAgentInit = Omit<AgentRunnerOptions, 'chat' | 'dispatch' | 'deriveCommand' | 'user'> & {
  user: string;
};

/** 场景组装持有的服务（FR-034/044：App 恢复入口读取 + ctx.services 注入）。 */
export interface AiSessionServices {
  session: SessionStore;
  goals: GoalStore;
  jobs: JobStore;
}

export interface AiSession {
  /** lgdl-web 唯一 CommandRouter（delayMs=600 + 业务 + v2 域工具矩阵 + 内建）。 */
  router: CommandRouter;
  /** v2：服务组装持有（session/goals/jobs；App 恢复入口与 ctx.services 注入用）。 */
  services: AiSessionServices;
  /** v2：权限 ask 桥（场景 AskDialog 注册；policy.onAsk 委托）。 */
  bindPermissionAsk(fn: ((q: AskQuestion) => Promise<AskResolution>) | null): void;
  /** v2：ask-user 应答器桥（FR-023 场景 AskDialog 注册）。 */
  bindAskUser(responder: AskResponder | null): void;
  /** 启动一次 agent run（每个用户指令一次；返回可 stop 的 AgentRun）。 */
  runAgent(init: RunAgentInit): AgentRun;
}

/** 默认 web-search 客户端：POST {query} → {results:[{title,snippet,url}]}（宽容解析；场景注入端点）。 */
function createWebSearchClient(endpoint: string, apiKey: string | undefined, fetchImpl: typeof fetch) {
  return async (query: string): Promise<WebSearchOutcome> => {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ query, count: 10 }),
      });
      if (!res.ok) return { ok: false, results: [], error: `搜索服务 HTTP ${res.status}` };
      const data = (await res.json()) as {
        results?: Array<{ title?: string; snippet?: string; url?: string }>;
        data?: { results?: Array<{ title?: string; snippet?: string; url?: string }> };
        items?: Array<{ title?: string; snippet?: string; description?: string; url?: string; link?: string }>;
        error?: string;
      };
      if (data.error) return { ok: false, results: [], error: data.error };
      const raw = (data.results ?? data.data?.results ?? data.items ?? []) as Array<Record<string, unknown>>;
      const results = raw
        .map((r) => ({
          title: typeof r.title === 'string' ? r.title : '',
          snippet: typeof r.snippet === 'string' ? r.snippet : typeof r.description === 'string' ? r.description : '',
          url: typeof r.url === 'string' ? r.url : typeof r.link === 'string' ? r.link : '',
        }))
        .filter((r) => r.title || r.url);
      return { ok: true, results };
    } catch (err) {
      return { ok: false, results: [], error: err instanceof Error ? err.message : String(err) };
    }
  };
}

/** 创建 AI 会话（单一组装点：router + 业务/P0·P1 域注册 + delay + 权限/审计 + runner 装配）。 */
export function createAiSession(deps: AiSessionDeps): AiSession {
  // 全局 delay 场景默认 600ms（FR-015；>5000 非法值由 router 钳制 EC-009）
  const router = createCommandRouter({
    delayMs: 600,
    ...(deps.policy ? { policy: deps.policy } : {}),
    ...(deps.audit ? { audit: deps.audit } : {}),
  });
  router.register(createLgdlWebCliTool());
  router.register(createOpCliToolEntry(deps.opRegistry));

  // env 绑定：browserEnv() 为底，场景/测试经 deps.env 覆盖具体缝（§2.3.5-2）
  const env: PlatformEnv = { ...browserEnv(), ...(deps.env ?? {}) };
  // services：会话/目标/job 载体（浏览器建议注入 IDB；缺省 memory 降级 EC-005）
  const backend = deps.backend ?? createMemoryStorage();
  const store = deps.sessionStore ?? createSessionStore(backend);
  const goals = deps.goalStore ?? createGoalStore(backend);
  const jobs = deps.jobStore ?? new JobStore(backend);

  // P0 默认注册矩阵（storage/settings/doc/session/context + web-search 条件开）
  const matrixTools = createP0DomainTools({ env, sessionStore: store, settingsKv: env.kv, audit: deps.audit });
  for (const entry of matrixTools) router.register(entry);

  // P1 默认注册矩阵扩域（FR-039：search/todo/goal/jobs 默认开；dom-* 开（写经 PRM risk:ui）；
  // ask-user 开（任务内澄清）；eval-js/subagent 按矩阵声明登记为禁用（显式装载）。
  // 说明：P1 扩域只增注册、不改 assembly（任务红线：session 组装点顺序扩展）。
  const p1Entries = [
    ...createSearchTools(),
    createDomToolEntry(env),
    createAskUserToolEntry(env),
    createTodoToolEntry({ store, sessionId: () => deps.docId }),
    createGoalToolEntry({ store: goals }),
    createJobsToolEntry({ store: jobs }),
    { ...createEvalJsToolEntry(env.workerFactory ?? { create: () => { throw new Error('Worker 不可用'); } }), enabled: false as const },
    { ...createSubagentToolEntry({ router, chat: async (turns, system, tools) => chat(deps.settings(), [{ role: 'system', content: system }, ...turns], tools) }), enabled: false as const },
  ];
  for (const entry of p1Entries) router.register(entry);

  // ask 桥（FR-007）：AiPanel/AskDialog 场景注册；policy.onAsk 委托（未注册 → deny fail-closed）
  const askBridge: { permission: ((q: AskQuestion) => Promise<AskResolution>) | null; user: AskResponder | null } = {
    permission: null,
    user: null,
  };
  env.askUser = async (q) => (askBridge.user ? askBridge.user(q) : { ok: false, canceled: true });

  return {
    router,
    services: { session: store, goals, jobs },
    bindPermissionAsk(fn) {
      askBridge.permission = fn;
    },
    bindAskUser(responder) {
      askBridge.user = responder;
    },
    runAgent(init: RunAgentInit): AgentRun {
      // 每轮取最新 provider 应用态：web-search 条件注入（FR-040：配 key 后可用；未配置禁用 EC-006）
      const settings = deps.settings();
      if (!deps.env?.search) {
        const web = settings.webSearch;
        if (web?.endpoint) {
          env.search = createWebSearchClient(web.endpoint, web.apiKey, env.fetch);
        } else {
          env.search = undefined; // 未配置 → web-search 工具报告禁用态 + 配置指引
        }
      }
      // run-local source：dispatch 前取 deps.getSource()（最新编辑器源码），
      // 任一 changed 结果推进本地 source（同一 run 内后续 dispatch 使用，R-009）
      let runSource = deps.getSource();
      return createAgentRunner({
        user: init.user,
        system: init.system,
        maxRounds: init.maxRounds,
        events: init.events,
        hooks: init.hooks,
        // LLM 调用：schema 供给 = router.deriveTools()（FR-008），system 每轮前置
        chat: async (turns, system) =>
          chat(
            deps.settings(),
            [{ role: 'system', content: system }, ...turns],
            router.deriveTools(),
          ),
        // 命令文本派生：前缀/args 引号规则自注册表派生（FR-007）
        deriveCommand: (tc: WebCliToolCall) => router.deriveCommand(tc),
        // 工具执行：ctx 每次组装 {docId, source, services}（FR-044 状态态注入）
        dispatch: async (tc) => {
          const ctx: ToolContext = {
            docId: deps.docId,
            source: runSource,
            services: { session: store, goals, jobs, audit: deps.audit },
          };
          const result: ToolResult = await router.dispatch(tc, ctx);
          if (result.changed && typeof result.source === 'string') {
            runSource = result.source;
          }
          return result;
        },
      });
    },
  };
}
