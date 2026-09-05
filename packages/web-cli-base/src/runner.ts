/**
 * AgentRunner —— 中性 AI-tool-workflow agent 循环（ADR-002，FR-006）。
 *
 * 上收（自 AiPanel 旧 agent 循环，domain-neutral）：turns 序列维护 / MAX_ROUNDS
 * 轮次上限与超限处理 / 单 assistant 消息多 toolCalls 逐条执行 / tool 结果按
 * toolCallId 回填 / 失败聚合与纠正 user turn / LLM 错误重试一次、连续失败停止 /
 * 可停止（stop()）。
 *
 * **不上收（D-003 边界）**：React 消息渲染、LGDL 回调（onApply 编辑器写回 /
 * next-actions 胶囊 / UI handler）、场景内容（system prompt/guideDoc/PRESET）。
 * 场景经 events（onAssistantText/onCommandLine/onToolOutput/onRoundLimit/
 * onEmptyReply/onLLMError/onFailAggregate/onFinish）驱动渲染，经 hooks
 * （intercept=dispatch 前拦截、onToolDone=完成含 changed/source 回调）接入
 * LGDL 特有处理点——runner 纯逻辑 + 回调，零 react import（NFR-008）。
 *
 * 循环语义逐点对应（plan §2.5.3）：
 *   - system 每轮组装（options.system 可异步：场景读 guideDoc 等）
 *   - dispatch 前的命令文本经 options.deriveCommand 派生（场景绑定
 *     router.deriveCommand；未知名/缺省 → 原始工具名）
 *   - 任一工具 !ok → 全部结果回填后 push 纠正 user turn + onFailAggregate
 *   - LLM 调用错误：首次 push 纠错 user turn 重试；连续第二次 → llm-failed 停止
 *   - stop() 置中止标记：当前工具完成后退出（跳过剩余 toolCalls 与失败聚合）
 */
import type { ChatTurn, ChatResult, WebCliToolCall } from './llm.js';
import type { ToolResult } from './router.js';

export type RunOutcome = 'completed' | 'max-rounds' | 'stopped' | 'llm-failed' | 'empty';

/** 增量事件（场景驱动渲染；消息流与旧 AiPanel 等价 FR-024）。 */
export interface AgentRunnerEvents {
  /** 有新增 assistant 文本 → appendMessage('assistant', text) */
  onAssistantText?: (text: string) => void;
  /** 工具命令文本 → appendMessage('assistant', text, 'web-cli') */
  onCommandLine?: (text: string) => void;
  /** 工具输出 → appendMessage('tool', text) */
  onToolOutput?: (text: string) => void;
  /** 轮次超限（maxRounds 时触发；场景自定义文案/默认） */
  onRoundLimit?: (maxRounds: number) => void;
  /** 空回复 → 场景默认提示 */
  onEmptyReply?: () => void;
  /** LLM 调用失败；willRetry=false 表示连续失败已停止 */
  onLLMError?: (message: string, willRetry: boolean) => void;
  /** 失败聚合提示（runner 内部仍 push 纠正 user turn） */
  onFailAggregate?: () => void;
  /** 本次 run 结束（任意 outcome）→ 场景 setPending(false) 等收尾 */
  onFinish?: (outcome: RunOutcome) => void;
}

/** 场景注入的 LGDL 特有处理点（D-003/FR-006）。 */
export interface AgentRunnerHooks {
  /** dispatch 前拦截：返回 ToolResult 则跳过 dispatch（next-actions 胶囊由此接入）。 */
  intercept?: (tc: WebCliToolCall, commandText: string) => ToolResult | null | Promise<ToolResult | null>;
  /** 工具完成（含 changed/source）：场景据此 onApply 写回 + source 状态推进。 */
  onToolDone?: (tc: WebCliToolCall, result: ToolResult) => void | Promise<void>;
}

export interface AgentRunnerOptions {
  /** 初始用户指令（turns 首条 user 消息）。 */
  user: string;
  /** 系统提示（场景组装：LGDL_SYSTEM_PROMPT + guideDoc）；每轮调用一次。 */
  system: () => string | Promise<string>;
  /** LLM 调用（场景绑定 settings + router.deriveTools() schema 供给）。 */
  chat: (turns: ChatTurn[], system: string) => Promise<ChatResult>;
  /** 工具执行（场景绑定 router.dispatch + ctx 组装；runner 不直接依赖 router）。 */
  dispatch: (tc: WebCliToolCall) => Promise<ToolResult>;
  /** 命令文本派生（场景绑定 router.deriveCommand）；未知名/缺省 → 原始工具名。 */
  deriveCommand?: (tc: WebCliToolCall) => string | null;
  hooks?: AgentRunnerHooks;
  events?: AgentRunnerEvents;
  /** 轮次上限；默认 1000。 */
  maxRounds?: number;
}

export interface AgentRun {
  /** 启动循环；返回终结 outcome。重复调用返回同一结果。 */
  run(): Promise<RunOutcome>;
  /** 置中止标记：当前工具完成后退出（可停止 FR-006）。 */
  stop(): void;
}

/** 工具调用元数据（回填 assistant turn 用）。 */
interface ToolCallMeta {
  id: string;
  name: string;
  arguments: string;
}

export function createAgentRunner(options: AgentRunnerOptions): AgentRun {
  const maxRounds = options.maxRounds ?? 1000;
  const events = options.events ?? {};
  const hooks = options.hooks ?? {};
  const turns: ChatTurn[] = [{ role: 'user', content: options.user }];

  let stopped = false;
  let failCount = 0;
  let runPromise: Promise<RunOutcome> | null = null;
  let finished = false;

  const finish = (outcome: RunOutcome): RunOutcome => {
    if (!finished) {
      finished = true;
      events.onFinish?.(outcome);
    }
    return outcome;
  };

  /** LLM 调用失败：首次 push 纠错 user turn 重试一次；连续第二次停止（旧 AiPanel 语义）。 */
  const handleLlmError = async (err: unknown, round: number): Promise<RunOutcome> => {
    const msg = err instanceof Error ? err.message : String(err);
    if (stopped) return finish('stopped');
    if (failCount >= 1) {
      events.onLLMError?.(msg, false);
      return finish('llm-failed');
    }
    failCount += 1;
    events.onLLMError?.(msg, true);
    turns.push({ role: 'user', content: `上一步调用出错：${msg}。请修正后重试（如果问题与图无关请直接总结收尾）。` });
    return step(round + 1);
  };

  async function step(round: number): Promise<RunOutcome> {
    if (stopped) return finish('stopped');
    if (round > maxRounds) {
      events.onRoundLimit?.(maxRounds);
      return finish('max-rounds');
    }
    let system: string;
    try {
      system = await options.system();
    } catch (err) {
      return handleLlmError(err, round);
    }
    let res: ChatResult;
    try {
      res = await options.chat(turns, system);
    } catch (err) {
      return handleLlmError(err, round);
    }
    const reply = res.content.trim();
    const allCalls = res.toolCalls;

    if (allCalls.length > 0) {
      // assistant 文本先出（若存在），再逐条执行工具
      if (reply) events.onAssistantText?.(reply);
      const toolCallsMeta: ToolCallMeta[] = allCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.rawArguments,
      }));
      turns.push({ role: 'assistant', content: res.content, toolCalls: toolCallsMeta });

      let failed = false;
      for (const tc of allCalls) {
        if (stopped) return finish('stopped'); // 当前工具完成后退出（跳过剩余）
        const commandText = options.deriveCommand ? (options.deriveCommand(tc) ?? tc.name) : tc.name;
        events.onCommandLine?.(commandText);
        // per-tool 异常设防（IMP-2，router EC-012 风格的 runner 兜底）：场景注入的
        // hooks.intercept（如 next-actions JSON.parse）或 dispatch 抛异常不炸整个
        // agent 循环——捕获后转稳定失败 ToolResult 走统一失败聚合，保证单工具异常
        // 不中断后续调用且 onFinish 必达（场景 pending 不会卡死）。
        let result: ToolResult;
        try {
          const intercepted = await hooks.intercept?.(tc, commandText);
          result = intercepted ?? (await options.dispatch(tc));
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          result = { ok: false, output: `✖ 工具 "${tc.name}" 执行异常`, error: detail };
        }
        if (!result.ok) failed = true;
        try {
          await hooks.onToolDone?.(tc, result);
        } catch {
          // 场景 onToolDone（如 onApply 编辑器写回）异常不阻断循环：结果已产生，按原样回填
        }
        const output = result.output;
        events.onToolOutput?.(output);
        turns.push({ role: 'tool', content: output, toolCallId: tc.id });
      }
      if (failed && !stopped) {
        // 失败提示在所有 tool 结果之后（不插在 assistant/tool 之间）
        events.onFailAggregate?.();
        turns.push({ role: 'user', content: '上一条命令执行失败，请查看错误并修正命令后重试。' });
      }
      if (stopped) return finish('stopped');
      return step(round + 1);
    }

    // 无 tool_calls：chat 表达（或空回复）
    if (reply) {
      events.onAssistantText?.(reply);
      turns.push({ role: 'assistant', content: res.content });
      return finish('completed');
    }
    events.onEmptyReply?.();
    return finish('empty');
  }

  return {
    run(): Promise<RunOutcome> {
      if (!runPromise) runPromise = step(1);
      return runPromise;
    },
    stop(): void {
      stopped = true;
    },
  };
}
