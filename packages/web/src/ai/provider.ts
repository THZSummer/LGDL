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
}

export const PROVIDERS: ProviderConfig[] = [
  { id: 'deepseek', name: 'DeepSeek', baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', freeModel: true, hint: 'api.deepseek.com（OpenAI 兼容）' },
  { id: 'qwen', name: 'Qwen 通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', freeModel: true, hint: '阿里云百炼 compatible-mode' },
  { id: 'volc', name: '火山方舟 · 通用', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seed-1-6-250615', freeModel: true, hint: '通用 v3 端点（doubao-seed-1-6 等）' },
  { id: 'volc-coding', name: '火山方舟 · Coding', baseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3', defaultModel: 'deepseek-v4-flash', freeModel: true, hint: 'Coding 端点（deepseek-v4-*、doubao-seed-2-0-code 等）' },
  { id: 'volc-plan', name: '火山方舟 · Agent Plan', baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3', defaultModel: 'ark-code-latest', freeModel: true, hint: 'Agent Plan 端点（ark-code-latest 等）' },
  { id: 'tencent', name: '腾讯混元', baseURL: 'https://api.hunyuan.cloud.tencent.com/v1', defaultModel: 'hunyuan-turbo', freeModel: true, hint: '腾讯云混元（OpenAI 兼容）' },
  { id: 'openai', name: 'OpenAI GPT', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', freeModel: true, hint: 'api.openai.com' },
  { id: 'claude', name: 'Claude', baseURL: null, defaultModel: 'claude-3-5-haiku-latest', freeModel: true, hint: 'Anthropic Messages API' },
];

export interface ProviderSettings {
  providerId: ProviderId;
  apiKey: string;
  model: string;
  /** 自定义 baseURL（留空用厂商默认；火山 coding/plan 端点需在此覆盖） */
  baseURL?: string;
}

const STORAGE_KEY = 'lgdl-ai-settings';

const DEFAULT_SETTINGS: ProviderSettings = {
  providerId: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat',
};

/** 读取设置（localStorage）；无存档时返回默认（deepseek + 空 key）。 */
export function loadSettings(): ProviderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    const provider = PROVIDERS.find((p) => p.id === parsed.providerId);
    return {
      providerId: provider?.id ?? DEFAULT_SETTINGS.providerId,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model:
        typeof parsed.model === 'string' && parsed.model.trim() !== ''
          ? parsed.model
          : provider?.defaultModel ?? DEFAULT_SETTINGS.model,
      baseURL: typeof parsed.baseURL === 'string' && parsed.baseURL.trim() !== '' ? parsed.baseURL : undefined,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** 保存设置到 localStorage。 */
export function saveSettings(s: ProviderSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** 切换厂商时的默认模型（供 UI 在切换 provider 时预填）。 */
export function defaultModelFor(providerId: ProviderId): string {
  return PROVIDERS.find((p) => p.id === providerId)?.defaultModel ?? DEFAULT_SETTINGS.model;
}

export function providerById(id: ProviderId): ProviderConfig {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  content: string;
  /** 使用的模型（服务端可能改写，如 deepseek-chat → deepseek-chat） */
  model: string;
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
        messages: turns
          .filter((t) => t.role !== 'system')
          .map((t) => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.content })),
      });
      const text = res.content
        .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return { content: text, model: res.model };
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
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
      max_tokens: 4096,
    });
    return {
      content: res.choices[0]?.message?.content ?? '',
      model: res.model ?? settings.model,
    };
  } catch (err) {
    throw classifyError(err, provider);
  }
}

/** 把 SDK 错误归类为可读信息（key 无效 / 网络不通 / CORS 不允许 / 端点不对）。 */
function classifyError(err: unknown, provider: ProviderConfig): Error {
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
  if (/failed to fetch|networkerror|load failed|fetch/i.test(msg) && !/api\.deepseek|api\.openai/.test(provider.baseURL ?? '')) {
    return new Error(`网络请求失败（${provider.name}）— 请检查网络，或该厂商 CORS 不允许浏览器直连：${msg}`);
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error(`网络请求失败 — 请检查网络连接：${msg}`);
  }
  return new Error(`${provider.name} 调用失败：${msg}`);
}
