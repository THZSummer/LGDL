/**
 * 8-provider BYOK table (FR-034, ADR-011).
 *
 * Independent implementation aligned with the built-in assistant's provider
 * semantics (the plugin must not import any LGDL private package; the former
 * assistant source has been retired by TASK-016 — see capability-matrix.md).
 * `browserDirect` is preserved as a "needs verification" marker for the volcano
 * endpoints (G-KEY gate).
 */
import { chat as baseChat, type ChatResult, type ChatTurn, type LlmToolDef } from '@lgdl/web-cli-base';

export type ProviderId =
  | 'deepseek'
  | 'qwen'
  | 'volc'
  | 'volc-coding'
  | 'volc-plan'
  | 'tencent'
  | 'openai'
  | 'claude';

export interface PluginProviderConfig {
  id: ProviderId;
  name: string;
  /** OpenAI-compatible baseURL (claude = null → native Messages API). */
  baseURL: string | null;
  defaultModel: string;
  freeModel: boolean;
  hint: string;
  /**
   * Whether the provider is known to allow direct browser/extension requests.
   * `false` = volcano endpoints (G-KEY verification gate, ADR-011); a failure
   * must be translated readably (EC-009), never silently ignored.
   */
  browserDirect: boolean;
}

export const PROVIDERS: PluginProviderConfig[] = [
  { id: 'deepseek', name: 'DeepSeek', baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-v4-flash', freeModel: true, hint: 'api.deepseek.com（OpenAI 兼容）', browserDirect: true },
  { id: 'qwen', name: 'Qwen 通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', freeModel: true, hint: '阿里云百炼 compatible-mode', browserDirect: true },
  { id: 'volc', name: '火山方舟 · 通用', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seed-1-6-250615', freeModel: true, hint: '通用 v3 端点；⚠ 直连需 G-KEY 验证', browserDirect: false },
  { id: 'volc-coding', name: '火山方舟 · Coding', baseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3', defaultModel: 'deepseek-v4-flash', freeModel: true, hint: 'Coding 端点；⚠ 直连需 G-KEY 验证', browserDirect: false },
  { id: 'volc-plan', name: '火山方舟 · Agent Plan', baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3', defaultModel: 'ark-code-latest', freeModel: true, hint: 'Agent Plan 端点；⚠ 直连需 G-KEY 验证', browserDirect: false },
  { id: 'tencent', name: '腾讯混元', baseURL: 'https://api.hunyuan.cloud.tencent.com/v1', defaultModel: 'hunyuan-turbo', freeModel: true, hint: '腾讯云混元（OpenAI 兼容）', browserDirect: true },
  { id: 'openai', name: 'OpenAI GPT', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', freeModel: true, hint: 'api.openai.com', browserDirect: true },
  { id: 'claude', name: 'Claude', baseURL: null, defaultModel: 'claude-3-5-haiku-latest', freeModel: true, hint: 'Anthropic Messages API', browserDirect: true },
];

/** Agent loop round cap (aligned with the built-in assistant). */
export const DEFAULT_MAX_ROUNDS = 1000;

export function providerById(id: string): PluginProviderConfig {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

export interface ProviderRuntimeConfig {
  providerId: ProviderId | string;
  apiKey: string;
  model: string;
  baseURL?: string;
}

/** Call the LLM through the upstream neutral `chat` (import reuse, zero fork). */
export async function providerChat(
  cfg: ProviderRuntimeConfig,
  turns: ChatTurn[],
  tools: LlmToolDef[],
): Promise<ChatResult> {
  const provider = providerById(cfg.providerId);
  return baseChat(
    {
      apiKey: cfg.apiKey,
      model: cfg.model || provider.defaultModel,
      ...(cfg.baseURL ? { baseURL: cfg.baseURL } : {}),
      provider: { id: provider.id, name: provider.name, baseURL: provider.baseURL },
      tools,
    },
    turns,
  );
}
