/**
 * LLM 客户端（非流式 chat，OpenAI 兼容 + Anthropic 双路径）。
 *
 * （自 packages/web/src/ai/provider.ts:196-229,392-547 迁入，中性化改造 D-012：
 * ProviderSettings/ProviderConfig（web 应用态）不迁入；chat 收中性 LlmConfig，
 * 其中 provider 为 LlmProviderInfo、tools 由调用方组装注入（D-011 注册组装留 web）。
 * 断言行为与迁移前一致。）
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** 工具调用（tool role 时回传结果；assistant role 时携带上一轮调用） */
  toolCallId?: string;
  /** assistant 消息携带的上一轮工具调用（OpenAI tool_calls / Claude tool_use） */
  toolCalls?: { id: string; name: string; arguments: string }[];
}

/** 一次工具调用（function calling 结构）。 */
export interface WebCliToolCall {
  /** 调用 id（反馈 tool 结果时回传） */
  id: string;
  /** 工具名（由调用方组装注册，消费方按名分发） */
  name: string;
  subcommand: string;
  /** --key value 平面参数（不含 --doc，doc 由执行时上下文决定） */
  args: Record<string, string>;
  /** 原始 arguments JSON（保留） */
  rawArguments: string;
}

export interface ChatResult {
  /** chat 文本（markdown 渲染）；无文本时为 '' */
  content: string;
  /** 全部工具调用（透传，由消费方按工具名分发） */
  toolCalls: WebCliToolCall[];
  /** 使用的模型 */
  model: string;
}

/** 中性 provider 信息（web ProviderConfig 应用态不迁入，D-012）。 */
export interface LlmProviderInfo {
  id: string;
  name: string;
  baseURL: string | null;
}

/** 中性工具定义（注册组装由调用方提供，D-011）。 */
export interface LlmToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** 中性 chat 配置（含 apiKey/model/baseURL，均来自调用方）。 */
export interface LlmConfig {
  apiKey: string;
  model: string;
  /** 自定义 baseURL（留空用厂商默认） */
  baseURL?: string;
  provider: LlmProviderInfo;
  /** 注册进请求的 tools（claude 3 工具 / openai 2 工具由调用方组装） */
  tools: LlmToolDef[];
}

/**
 * 调用 LLM（非流式，完整返回）。
 * 抛错时 message 已按「key 无效 / 网络不通 / CORS 不允许」归类。
 */
export async function chat(config: LlmConfig, turns: ChatTurn[]): Promise<ChatResult> {
  const provider = config.provider;
  if (!config.apiKey.trim()) {
    throw new Error('未配置 API Key — 点击面板右上角 ⚙ 设置 API Provider 与 Key');
  }

  if (provider.id === 'claude') {
    const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
    try {
      const res = await client.messages.create({
        model: config.model,
        max_tokens: 4096,
        system: turns.find((t) => t.role === 'system')?.content,
        tools: config.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters as { type: 'object'; properties: Record<string, unknown>; required?: string[] },
        })),
        messages: turns
          .filter((t) => t.role !== 'system')
          .map((t) => {
            if (t.role === 'tool') {
              return {
                role: 'user' as const,
                content: [
                  {
                    type: 'tool_result' as const,
                    tool_use_id: t.toolCallId ?? '',
                    content: t.content,
                  },
                ],
              };
            }
            if (t.role === 'assistant' && t.toolCalls && t.toolCalls.length > 0) {
              return {
                role: 'assistant' as const,
                content: t.content
                  ? [{ type: 'text' as const, text: t.content }]
                  : [],
                tool_use: t.toolCalls.map((tc) => ({
                  type: 'tool_use' as const,
                  id: tc.id,
                  name: tc.name,
                  input: JSON.parse(tc.arguments),
                })),
              };
            }
            return { role: t.role === 'assistant' ? 'assistant' : 'user', content: t.content };
          }),
      });
      const text = res.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      const allCalls: WebCliToolCall[] = res.content
        .filter((b): b is Extract<typeof b, { type: 'tool_use' }> => b.type === 'tool_use')
        .map((b) => parseToolArguments(b.id, b.name, JSON.stringify(b.input)));
      return {
        content: text,
        toolCalls: allCalls,
        model: res.model,
      };
    } catch (err) {
      throw classifyError(err, provider);
    }
  }

  // OpenAI 兼容端点
  const baseURL = config.baseURL || provider.baseURL || undefined;
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });
  try {
    const res = await client.chat.completions.create({
      model: config.model,
      messages: turns.map((t) => {
        if (t.role === 'tool') {
          return {
            role: 'tool' as const,
            tool_call_id: t.toolCallId ?? '',
            content: t.content,
          };
        }
        if (t.role === 'assistant' && t.toolCalls && t.toolCalls.length > 0) {
          return {
            role: 'assistant' as const,
            content: t.content,
            tool_calls: t.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: tc.arguments },
            })),
          };
        }
        return { role: t.role === 'system' ? 'system' : (t.role === 'assistant' ? 'assistant' : 'user'), content: t.content };
      }),
      tools: config.tools.map((t) => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
      max_tokens: 4096,
    });
    const msg = res.choices[0]?.message;
    const allCalls: WebCliToolCall[] = (msg?.tool_calls ?? [])
      .filter(
        (tc): tc is Extract<typeof tc, { type: 'function' }> => tc.type === 'function',
      )
      .map((tc) => parseToolArguments(tc.id, tc.function.name, tc.function.arguments));
    return {
      content: msg?.content ?? '',
      toolCalls: allCalls,
      model: res.model ?? config.model,
    };
  } catch (err) {
    throw classifyError(err, provider);
  }
}

/** 解析工具调用 arguments JSON；失败时 args 为空对象（执行时会报缺参）。 */
export function parseToolArguments(id: string, name: string, raw: string): WebCliToolCall {
  let subcommand = '';
  let args: Record<string, string> = {};
  try {
    const parsed = JSON.parse(raw) as { subcommand?: unknown; args?: unknown };
    if (typeof parsed.subcommand === 'string') subcommand = parsed.subcommand;
    if (parsed.args && typeof parsed.args === 'object') {
      args = Object.fromEntries(
        Object.entries(parsed.args as Record<string, unknown>)
          .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
          .map(([k, v]) => [k, String(v)]),
      );
    }
  } catch {
    // 保持 subcommand=''，执行层会报"缺少子命令"
  }
  return { id, name, subcommand, args, rawArguments: raw };
}

/** 把 SDK 错误归类为可读信息（key 无效 / 网络不通 / CORS 不允许 / 端点不对）。 */
export function classifyError(err: unknown, provider: LlmProviderInfo): Error {
  const e = err as { status?: number; message?: string; name?: string };
  const status = e.status;
  if (status === 401 || status === 403) {
    return new Error(`${provider.name} 拒绝了请求（HTTP ${status}）— API Key 可能无效或已过期`);
  }
  if (status === 404) {
    const isVolc = provider.id.startsWith('volc');
    return new Error(
      `${provider.name} 请求失败（HTTP 404）— 模型不存在或端点不对。` +
        (isVolc
          ? '火山模型分布在「通用 / Coding / Agent Plan」三个套餐端点，请在 ⚙ 设置中改选对应的火山方舟服务商（如 Coding 套餐选「火山方舟 · Coding」）'
          : `请检查模型名，或在 ⚙ 设置中确认 Base URL 是否正确`),
    );
  }
  if (status && status >= 400 && status < 500) {
    return new Error(`${provider.name} 请求失败（HTTP ${status}）：${e.message ?? ''}`);
  }
  const msg = e.message ?? String(err);
  // 浏览器直连被 CORS 拦截的典型表现：openai SDK 报 "Connection error"，
  // fetch 报 "Failed to fetch" / "NetworkError"。厂商预检若不返回
  // access-control-allow-headers 里的认证头，浏览器会在发送前拦截。
  if (/connection error|failed to fetch|networkerror|load failed|typeerror/i.test(msg)) {
    return new Error(
      `浏览器直连失败（${provider.name}）— 该厂商的 CORS 策略可能不允许浏览器直连` +
        `（或网络不通）。可尝试：① 在「测试连接」确认；② 换用支持浏览器直连的服务商` +
        `（如 DeepSeek / OpenAI）；③ 后续版本提供本地代理服务绕开 CORS。` +
        `原始错误：${msg}`,
    );
  }
  return new Error(`${provider.name} 调用失败：${msg}`);
}
