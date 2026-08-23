/**
 * AI Provider 层：多厂商接入 + API Key 管理。
 *
 * - 系统不内置任何 apiKey，只允许用户手动输入，存 localStorage
 * - GPT / DeepSeek / Qwen / 火山方舟 / 腾讯混元 走 openai SDK
 *   （OpenAI 兼容端点 + dangerouslyAllowBrowser）
 * - Claude 走 @anthropic-ai/sdk（原生 Messages API）
 */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type ProviderId =
  | 'deepseek'
  | 'qwen'
  | 'volc'
  | 'volc-coding'
  | 'volc-plan'
  | 'tencent'
  | 'openai'
  | 'claude';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  /** OpenAI 兼容 baseURL（claude 为 null，走原生 SDK） */
  baseURL: string | null;
  /** 默认模型，用户可覆盖 */
  defaultModel: string;
  /** 模型是否可自由填写（true 时提供自由输入框） */
  freeModel: boolean;
  hint: string;
  /**
   * 是否支持浏览器直连（CORS 预检允许认证头）。
   * false 的厂商（火山）浏览器会拦截请求——需本地代理（lgdl serve，v0.6）。
   * 已实测：deepseek/qwen/tencent 预检允许 authorization；火山只允许
   * Origin/Content-Length/Content-Type；openai/anthropic 官方支持浏览器。
   */
  browserDirect: boolean;
}

export const PROVIDERS: ProviderConfig[] = [
  { id: 'deepseek', name: 'DeepSeek', baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-v4-flash', freeModel: true, hint: 'api.deepseek.com（OpenAI 兼容）', browserDirect: true },
  { id: 'qwen', name: 'Qwen 通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', freeModel: true, hint: '阿里云百炼 compatible-mode', browserDirect: true },
  { id: 'volc', name: '火山方舟 · 通用', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seed-1-6-250615', freeModel: true, hint: '通用 v3 端点（doubao-seed-1-6 等）；⚠ 浏览器直连受限，需本地代理（v0.6）', browserDirect: false },
  { id: 'volc-coding', name: '火山方舟 · Coding', baseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3', defaultModel: 'deepseek-v4-flash', freeModel: true, hint: 'Coding 端点（deepseek-v4-* 等）；⚠ 浏览器直连受限，需本地代理（v0.6）', browserDirect: false },
  { id: 'volc-plan', name: '火山方舟 · Agent Plan', baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3', defaultModel: 'ark-code-latest', freeModel: true, hint: 'Agent Plan 端点（ark-code-latest 等）；⚠ 浏览器直连受限，需本地代理（v0.6）', browserDirect: false },
  { id: 'tencent', name: '腾讯混元', baseURL: 'https://api.hunyuan.cloud.tencent.com/v1', defaultModel: 'hunyuan-turbo', freeModel: true, hint: '腾讯云混元（OpenAI 兼容）', browserDirect: true },
  { id: 'openai', name: 'OpenAI GPT', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', freeModel: true, hint: 'api.openai.com', browserDirect: true },
  { id: 'claude', name: 'Claude', baseURL: null, defaultModel: 'claude-3-5-haiku-latest', freeModel: true, hint: 'Anthropic Messages API', browserDirect: true },
];

export interface ProviderSettings {
  providerId: ProviderId;
  apiKey: string;
  model: string;
  /** 自定义 baseURL（留空用厂商默认；火山 coding/plan 端点需在此覆盖） */
  baseURL?: string;
  /** agent 循环最大执行轮数（默认 1000） */
  maxRounds?: number;
}

const STORAGE_KEY = 'lgdl-ai-settings';

const DEFAULT_SETTINGS: ProviderSettings = {
  providerId: 'deepseek',
  apiKey: '',
  model: 'deepseek-v4-flash',
};

/**
 * 每个 provider 独立保存自己的 apiKey / model / baseURL，
 * 切换服务商时互不覆盖。
 */
interface PerProviderState {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

interface StoredSettings {
  /** 当前激活的 provider */
  active: ProviderId;
  providers: Partial<Record<ProviderId, PerProviderState>>;
  /** agent 循环最大执行轮数（默认 1000；防死循环，用户可在设置里调整） */
  maxRounds?: number;
}

/** agent 循环默认轮数上限（几乎不限；真死循环时用户在设置里调小）。 */
export const DEFAULT_MAX_ROUNDS = 1000;

const EMPTY_STORE: StoredSettings = { active: 'deepseek', providers: {} };

function readStore(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STORE, providers: {} };
    const parsed = JSON.parse(raw) as Partial<StoredSettings> & Partial<ProviderSettings>;
    // 兼容旧格式（v0.5.0 早期：直接存 ProviderSettings 对象）
    if (parsed.providers === undefined && typeof parsed.apiKey === 'string') {
      const legacyActive = (PROVIDERS.find((p) => p.id === parsed.providerId) ?? PROVIDERS[0]).id;
      return {
        active: legacyActive,
        providers: {
          [legacyActive]: {
            apiKey: parsed.apiKey,
            model: parsed.model,
            baseURL: parsed.baseURL,
          },
        },
      };
    }
    return {
      active: (PROVIDERS.find((p) => p.id === parsed.active) ?? PROVIDERS[0]).id,
      providers: parsed.providers ?? {},
      maxRounds:
        typeof parsed.maxRounds === 'number' && parsed.maxRounds > 0
          ? parsed.maxRounds
          : DEFAULT_MAX_ROUNDS,
    };
  } catch {
    return { ...EMPTY_STORE, providers: {} };
  }
}

function writeStore(store: StoredSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** 读取当前激活 provider 的设置（localStorage）。 */
export function loadSettings(): ProviderSettings {
  const store = readStore();
  const provider = providerById(store.active);
  const state = store.providers[store.active];
  return {
    providerId: store.active,
    apiKey: state?.apiKey ?? '',
    model: state?.model?.trim() ? state.model : provider.defaultModel,
    baseURL: state?.baseURL?.trim() ? state.baseURL : undefined,
    maxRounds: store.maxRounds ?? DEFAULT_MAX_ROUNDS,
  };
}

/** 保存当前 provider 的设置（不影响其他 provider 的 key/模型）。 */
export function saveSettings(s: ProviderSettings): void {
  const store = readStore();
  store.active = s.providerId;
  store.providers[s.providerId] = {
    apiKey: s.apiKey,
    model: s.model || undefined,
    baseURL: s.baseURL || undefined,
  };
  store.maxRounds = s.maxRounds && s.maxRounds > 0 ? s.maxRounds : DEFAULT_MAX_ROUNDS;
  writeStore(store);
}

/** 读取指定 provider 已保存的 key/模型（用于切换服务商时回填，无则默认）。 */
export function loadProviderSettings(providerId: ProviderId): ProviderSettings {
  const store = readStore();
  const provider = providerById(providerId);
  const state = store.providers[providerId];
  return {
    providerId,
    apiKey: state?.apiKey ?? '',
    model: state?.model?.trim() ? state.model : provider.defaultModel,
    baseURL: state?.baseURL?.trim() ? state.baseURL : undefined,
  };
}

/**
 * 只保存指定 provider 的 key/模型（**不改 active 指针**）。
 * 用于设置面板切换服务商前暂存当前输入，避免未点保存的输入丢失。
 */
export function saveProviderInputs(
  providerId: ProviderId,
  s: { apiKey: string; model: string; baseURL?: string },
): void {
  const store = readStore();
  const provider = providerById(providerId);
  store.providers[providerId] = {
    apiKey: s.apiKey,
    model: s.model.trim() ? s.model : provider.defaultModel,
    baseURL: s.baseURL?.trim() ? s.baseURL : undefined,
  };
  writeStore(store);
}

/** 切换厂商时的默认模型（供 UI 在切换 provider 时预填）。 */
export function defaultModelFor(providerId: ProviderId): string {
  return PROVIDERS.find((p) => p.id === providerId)?.defaultModel ?? DEFAULT_SETTINGS.model;
}

export function providerById(id: ProviderId): ProviderConfig {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

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
  /** 工具名：lgdl-web-cli（图内容）/ lgdl-web-op-cli（UI 操作）/ lgdl-web-fetch（web 获取） */
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
  /** lgdl-web-cli 工具调用（图内容操作） */
  toolCalls: WebCliToolCall[];
  /** lgdl-web-op-cli 工具调用（UI 操作，与手动点击等效） */
  opCalls: WebCliToolCall[];
  /** lgdl-web-fetch 工具调用（基础 web 获取，独立于两个 CLI） */
  fetchCalls: WebCliToolCall[];
  /** 使用的模型 */
  model: string;
}

/** lgdl-web-op-cli function 定义（UI 操作，与用户手动点击等效）。 */
export const WEB_OP_TOOL: {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} = {
  type: 'function',
  function: {
    name: 'lgdl-web-op-cli',
    description:
      'Perform a UI operation on the web workbench, equivalent to the user clicking the button manually. ' +
      'Subcommands: copy-source / toggle-editor / collapse-editor / expand-editor / export-svg / export-png / ' +
      'preview-zoom (args: factor, or direction+delta, anchorX, anchorY) / preview-pan (dx, dy) / preview-reset / ' +
      'preview-click (loc, e.g. "nodes[3]") / preview-hover (loc) / switch-example (id) / list-examples / list-diagram-types. ' +
      'Effects are identical to manual UI interaction (e.g. preview-click jumps to the element in the editor). ' +
      'NOTE: there is NO apply-source command — never write LGDL source directly; edit the diagram via lgdl-web-cli incremental commands only.',
    parameters: {
      type: 'object',
      properties: {
        subcommand: {
          type: 'string',
          enum: [
            'copy-source', 'toggle-editor', 'collapse-editor', 'expand-editor',
            'export-svg', 'export-png',
            'preview-zoom', 'preview-pan', 'preview-reset', 'preview-click', 'preview-hover',
            'switch-example', 'list-examples', 'list-diagram-types',
          ],
        },
        args: {
          type: 'object',
          description:
            'Operation arguments, e.g. preview-zoom: {"factor":1.2} or {"direction":1,"delta":200}; ' +
            'preview-pan: {"dx":100,"dy":0}; preview-click: {"loc":"nodes[3]"}; preview-hover: {"loc":"nodes[3]"} or {"loc":"none"} to clear; ' +
            'switch-example: {"id":"login-flow"}; list-examples: {} (list all example diagrams); list-diagram-types: {} (list supported diagram types).',
          additionalProperties: true,
        },
      },
      required: ['subcommand'],
    },
  },
};
export const WEB_CLI_TOOL: {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} = {
  type: 'function',
  function: {
    name: 'lgdl-web-cli',
    description:
      'Execute an lgdl-web-cli command on the current editor document. ' +
      'Subcommands: status / validate / init / convert / add-node / remove-node / update-node / add-edge / remove-edge / update-edge / add-group / remove-group / update-group / doc-info / get-node / get-edge / find-node / list-node-kinds / list-diagram-types. ' +
      '--doc is implied (always the current document). Use --key value style args, e.g. {"subcommand":"add-node","args":{"id":"user","label":"用户"}}. ' +
      'Read the usage guide first with the lgdl-web-fetch tool (path "lgdl/web/workbench/README-CLI.md").',
    parameters: {
      type: 'object',
      properties: {
        subcommand: {
          type: 'string',
          enum: [
            'status', 'validate', 'init', 'convert',
            'add-node', 'remove-node', 'update-node',
            'add-edge', 'remove-edge', 'update-edge',
            'add-group', 'remove-group', 'update-group',
            'doc-info', 'get-node', 'get-edge', 'find-node',
            'list-node-kinds', 'list-diagram-types',
          ],
        },
        args: {
          type: 'object',
          description: 'Command arguments as --key value pairs (keys without the leading dashes, e.g. {"id":"x","label":"用户"}).',
          additionalProperties: true,
        },
      },
      required: ['subcommand'],
    },
  },
};

/**
 * lgdl-web-fetch：独立基础工具（web 获取），与 lgdl-web-cli / lgdl-web-op-cli 平级，
 * 不属于任何 CLI 的子命令。获取同源相对路径或完整 URL 的原始文本。
 */
export const WEB_FETCH_TOOL: {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} = {
  type: 'function',
  function: {
    name: 'lgdl-web-fetch',
    description:
      'Fetch a web resource (same-origin relative path or full URL) and return its raw text. ' +
      'Base platform capability, independent of lgdl-web-cli / lgdl-web-op-cli. ' +
      'Typical use: read the workbench skill guide first — path "lgdl/web/workbench/README-CLI.md".',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'URL or same-origin relative path to fetch, e.g. "lgdl/web/workbench/README-CLI.md" or "https://example.com/doc.md".',
        },
      },
      required: ['path'],
    },
  },
};

export interface TestResult {
  ok: boolean;
  message: string;
  /** 测试耗时 ms */
  elapsedMs: number;
}

/**
 * 连接测试：用当前设置发一个最小请求（"ping"），验证 key / 端点 / CORS
 * 是否可用。成功返回 ok=true；失败返回归类后的可读错误。
 */
export async function testConnection(settings: ProviderSettings): Promise<TestResult> {
  const provider = providerById(settings.providerId);
  if (!settings.apiKey.trim()) {
    return { ok: false, message: '未填写 API Key', elapsedMs: 0 };
  }
  const t0 = Date.now();
  try {
    await chat(
      { ...settings, model: settings.model || provider.defaultModel },
      [{ role: 'user', content: 'ping' }],
    );
    return { ok: true, message: `✓ ${provider.name} 连接正常（模型 ${settings.model || provider.defaultModel}）`, elapsedMs: Date.now() - t0 };
  } catch (err) {
    return { ok: false, message: `✖ ${(err as Error).message}`, elapsedMs: Date.now() - t0 };
  }
}

/**
 * 调用 LLM（非流式，完整返回）。
 * 抛错时 message 已按「key 无效 / 网络不通 / CORS 不允许」归类。
 */
export async function chat(settings: ProviderSettings, turns: ChatTurn[]): Promise<ChatResult> {
  const provider = providerById(settings.providerId);
  if (!settings.apiKey.trim()) {
    throw new Error('未配置 API Key — 点击面板右上角 ⚙ 设置 API Provider 与 Key');
  }

  if (provider.id === 'claude') {
    const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
    try {
      const res = await client.messages.create({
        model: settings.model,
        max_tokens: 4096,
        system: turns.find((t) => t.role === 'system')?.content,
        tools: [
          {
            name: WEB_CLI_TOOL.function.name,
            description: WEB_CLI_TOOL.function.description,
            input_schema: WEB_CLI_TOOL.function.parameters as { type: 'object'; properties: Record<string, unknown>; required?: string[] },
          },
          {
            name: WEB_OP_TOOL.function.name,
            description: WEB_OP_TOOL.function.description,
            input_schema: WEB_OP_TOOL.function.parameters as { type: 'object'; properties: Record<string, unknown>; required?: string[] },
          },
          {
            name: WEB_FETCH_TOOL.function.name,
            description: WEB_FETCH_TOOL.function.description,
            input_schema: WEB_FETCH_TOOL.function.parameters as { type: 'object'; properties: Record<string, unknown>; required?: string[] },
          },
        ],
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
        toolCalls: allCalls.filter((c) => c.name === 'lgdl-web-cli'),
        opCalls: allCalls.filter((c) => c.name === 'lgdl-web-op-cli'),
        fetchCalls: allCalls.filter((c) => c.name === 'lgdl-web-fetch'),
        model: res.model,
      };
    } catch (err) {
      throw classifyError(err, provider);
    }
  }

  // OpenAI 兼容端点
  const baseURL = settings.baseURL || provider.baseURL || undefined;
  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });
  try {
    const res = await client.chat.completions.create({
      model: settings.model,
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
      tools: [WEB_CLI_TOOL, WEB_OP_TOOL],
      max_tokens: 4096,
    });
    const msg = res.choices[0]?.message;
    const allCalls: WebCliToolCall[] = (msg?.tool_calls ?? [])
      .filter(
        (tc): tc is Extract<typeof tc, { type: 'function' }> =>
          tc.type === 'function' &&
          (tc.function.name === 'lgdl-web-cli' ||
            tc.function.name === 'lgdl-web-op-cli' ||
            tc.function.name === 'lgdl-web-fetch'),
      )
      .map((tc) => parseToolArguments(tc.id, tc.function.name, tc.function.arguments));
    return {
      content: msg?.content ?? '',
      toolCalls: allCalls.filter((c) => c.name === 'lgdl-web-cli'),
      opCalls: allCalls.filter((c) => c.name === 'lgdl-web-op-cli'),
      fetchCalls: allCalls.filter((c) => c.name === 'lgdl-web-fetch'),
      model: res.model ?? settings.model,
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
export function classifyError(err: unknown, provider: ProviderConfig): Error {
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
        `（如 DeepSeek / OpenAI）；③ 后续版本提供本地代理（lgdl serve）绕开 CORS。` +
        `原始错误：${msg}`,
    );
  }
  return new Error(`${provider.name} 调用失败：${msg}`);
}
