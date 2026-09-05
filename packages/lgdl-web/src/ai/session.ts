/**
 * lgdl-web AI 会话单一组装点（FR-022/AC-007）。
 *
 * lgdl-web 内唯一 CommandRouter 实例持有处：base 内建自动注册（web-fetch /
 * sleep / web-cli-help，FR-020）+ lgdl-web-cli / lgdl-web-op-cli 业务工具注册
 * （FR-018/019）+ 全局 delay 600ms（FR-015）+ AgentRunner 装配（chatFn 的
 * schema 供给 = router.deriveTools()；dispatch 绑定 router + ctx 每调用取
 * getSource，changed 后推进 run-local source，R-009）。
 *
 * LGDL 特有回调不在此组装：onApply 编辑器写回 / next-actions 拦截 / 渲染事件
 * 由场景（App/AiPanel）经 runAgent(init) 的 system/events/hooks 注入（D-003）——
 * 本文件零 React import（可纯 node 测试）。
 */
import {
  createCommandRouter,
  createAgentRunner,
  type AgentRunnerOptions,
  type AgentRun,
  type CommandRouter,
  type ToolContext,
  type WebCliToolCall,
} from '@lgdl/web-cli-base';
import { createLgdlWebCliTool } from '@lgdl/lgdl-web-cli';
import { createOpCliToolEntry, type OpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';
import { chat } from './provider.js';
import type { ProviderSettings } from './provider.js';

export interface AiSessionDeps {
  /** 当前文档 id（web-cli 的 --doc 隐式对象）。 */
  docId: string;
  /** App source 状态读取器（每次分发取当前编辑器源码）。 */
  getSource(): string;
  /** App applyAiSource（编辑器写回；runner hooks.onToolDone 场景侧调用）。 */
  onApply(source: string): void;
  /** App 16 handler 组装后的 op 执行器注册表。 */
  opRegistry: OpHandlerRegistry;
  /** provider 应用态读取器（每轮 chat 取最新 settings）。 */
  settings(): ProviderSettings;
}

/** runAgent 场景侧注入（system/events/hooks/maxRounds 与 runner 对齐；user 为初始指令）。 */
export type RunAgentInit = Omit<AgentRunnerOptions, 'chat' | 'dispatch' | 'deriveCommand' | 'user'> & {
  user: string;
};

export interface AiSession {
  /** lgdl-web 唯一 CommandRouter（delayMs=600 + 2 业务工具 + 3 内建）。 */
  router: CommandRouter;
  /** 启动一次 agent run（每个用户指令一次；返回可 stop 的 AgentRun）。 */
  runAgent(init: RunAgentInit): AgentRun;
}

/** 创建 AI 会话（单一组装点：router + 业务注册 + delay + runner 装配）。 */
export function createAiSession(deps: AiSessionDeps): AiSession {
  // 全局 delay 场景默认 600ms（FR-015；>5000 非法值由 router 钳制 EC-009）
  const router = createCommandRouter({ delayMs: 600 });
  router.register(createLgdlWebCliTool());
  router.register(createOpCliToolEntry(deps.opRegistry));

  return {
    router,
    runAgent(init: RunAgentInit): AgentRun {
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
        // 工具执行：ctx 每次组装 {docId, source: runSource}
        dispatch: async (tc) => {
          const ctx: ToolContext = { docId: deps.docId, source: runSource };
          const result = await router.dispatch(tc, ctx);
          if (result.changed && typeof result.source === 'string') {
            runSource = result.source;
          }
          return result;
        },
      });
    },
  };
}
