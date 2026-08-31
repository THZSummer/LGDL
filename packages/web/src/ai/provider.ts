/**
 * AI Provider 层：多厂商接入 + API Key 管理。
 *
 * - 系统不内置任何 apiKey，只允许用户手动输入，存 localStorage
 * - GPT / DeepSeek / Qwen / 火山方舟 / 腾讯混元 走 openai SDK
 *   （OpenAI 兼容端点 + dangerouslyAllowBrowser）
 * - Claude 走 @anthropic-ai/sdk（原生 Messages API）
 *
 * （F-13 ① 拆分：WEB_CLI_TOOL → @lgdl/web-cli-base tools.ts；
 * chat/parseToolArguments/classifyError/ChatTurn/WebCliToolCall/ChatResult
 * → @lgdl/web-cli-base llm.ts（中性化 LlmConfig，D-012）；
 * 本文件保留 PROVIDERS / localStorage Key 管理 / WEB_OP_TOOL / WEB_FETCH_TOOL /
 * testConnection 与注册组装（D-011，F-04 修复点 W-D1 不移动），
 * chat 为薄包装（保持 chat(settings, turns) 签名，AiPanel 调用点零改动）。）
 */
import { chat as llmChat, WEB_CLI_TOOL } from '@lgdl/web-cli-base';
import type { ChatTurn, WebCliToolCall, ChatResult } from '@lgdl/web-cli-base';

export type { ChatTurn, WebCliToolCall, ChatResult } from '@lgdl/web-cli-base';

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
      'preview-zoom (--factor, or --direction + --delta, --anchorX, --anchorY) / preview-pan (--dx, --dy) / preview-reset / ' +
      'preview-click (--loc, e.g. "nodes[3]") / preview-hover (--loc) / switch-example (--id) / list-examples / list-diagram-types / ' +
      'next-actions (--actions = JSON string array of {label, prompt}; shows clickable suggestion chips in the chat, ' +
      'each chip sends its prompt to the AI when clicked) / help (--topic to show one operation\'s usage). ' +
      'Effects are identical to manual UI interaction (e.g. preview-click jumps to the element in the editor). ' +
      'NOT SURE about an operation or its args? Use subcommand "help" with {"topic":"<op>"}. ' +
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
            'next-actions',
            'help',
          ],
        },
        args: {
          type: 'object',
          description:
            'Operation arguments as --key value pairs (keys without leading dashes), e.g. ' +
            'preview-zoom: --factor 1.2 or --direction 1 --delta 200; ' +
            'preview-pan: --dx 100 --dy 0; preview-click: --loc nodes[3]; preview-hover: --loc nodes[3] or --loc none to clear; ' +
            'switch-example: --id login-flow; list-examples / list-diagram-types: no args; ' +
            'next-actions: --actions \'[{"label":"增加配色分组","prompt":"给当前图增加配色分组"}]\' (2-4 suggested next steps).',
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
      'The path argument is REQUIRED — there is NO default path; omitting it fails with "missing --path". ' +
      'Example: lgdl-web-fetch --path lgdl/web/workbench/README-CLI.md (read the workbench skill guide).',
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
 * 调用 LLM（非流式，完整返回）——薄包装：构造中性 LlmConfig 调新包 chat。
 * 签名 chat(settings, turns) 保持不变（AiPanel.tsx:390 调用点零改动）。
 * 抛错时 message 已按「key 无效 / 网络不通 / CORS 不允许」归类。
 */
export async function chat(settings: ProviderSettings, turns: ChatTurn[]): Promise<ChatResult> {
  const provider = providerById(settings.providerId);
  // 注册组装留 web（D-011）：Claude 3 工具；OpenAI 兼容端点 2 工具（W-D1 现场保留，F-04 修复点不移动，NG-005）
  const isClaude = provider.id === 'claude';
  const tools = isClaude
    ? [
        {
          name: WEB_CLI_TOOL.function.name,
          description: WEB_CLI_TOOL.function.description,
          parameters: WEB_CLI_TOOL.function.parameters,
        },
        {
          name: WEB_OP_TOOL.function.name,
          description: WEB_OP_TOOL.function.description,
          parameters: WEB_OP_TOOL.function.parameters,
        },
        {
          name: WEB_FETCH_TOOL.function.name,
          description: WEB_FETCH_TOOL.function.description,
          parameters: WEB_FETCH_TOOL.function.parameters,
        },
      ]
    : [
        {
          name: WEB_CLI_TOOL.function.name,
          description: WEB_CLI_TOOL.function.description,
          parameters: WEB_CLI_TOOL.function.parameters,
        },
        {
          name: WEB_OP_TOOL.function.name,
          description: WEB_OP_TOOL.function.description,
          parameters: WEB_OP_TOOL.function.parameters,
        },
      ];
  return llmChat(
    {
      apiKey: settings.apiKey,
      model: settings.model,
      baseURL: settings.baseURL,
      provider: { id: provider.id, name: provider.name, baseURL: provider.baseURL },
      tools,
    },
    turns,
  );
}
