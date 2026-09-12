/**
 * 「测试连接」最小真实请求（用户诉求 / TASK-018）。
 *
 * 用**当前表单值**向所选厂商发一次最小 chat 请求（单条 `ping` 用户消息、零 schema
 * 工具），验证 Key / 端点 / 网络 / CORS 是否可用，并把结果归类为**可读**中文信息。
 *
 * 设计约束：
 * - 纯逻辑 + 注入 `chat`（默认由 background 传入 `providerChat`），node 可直接测；
 * - 成功含延迟 ms；失败区分 401 / 403 / 404(模型不存在) / CORS·网络 / 超时；
 * - 火山三端点 `browserDirect=false`：直连受限（G-KEY HTTP 401 非 CORS）如实呈现，
 *   给出可操作建议，**绝不假装成功**；
 * - 结果对象只含可读文案与状态码，**绝不包含 API Key**（key 只走 background 请求）。
 */
import { providerById, type ProviderRuntimeConfig } from './providers.js';
import type { ChatResult, ChatTurn, LlmToolDef } from '@lgdl/web-cli-base';

export type TestConnectionCategory =
  | 'ok'
  | 'no-key'
  | 'invalid-key'
  | 'direct-restricted'
  | 'forbidden'
  | 'model-not-found'
  | 'network'
  | 'timeout'
  | 'error';

export interface TestConnectionInput {
  providerId: string;
  apiKey: string;
  model?: string;
  baseURL?: string;
  /** 单次测试超时；默认 {@link DEFAULT_TEST_TIMEOUT_MS}。 */
  timeoutMs?: number;
}

/** Injected chat call (real = `providerChat`; tests pass a stub). */
export type ConnectionChatFn = (
  cfg: ProviderRuntimeConfig,
  turns: ChatTurn[],
  tools: LlmToolDef[],
) => Promise<ChatResult>;

export interface TestConnectionResult {
  ok: boolean;
  category: TestConnectionCategory;
  /** 可读中文结果（成功含延迟 ms）；不含任何密钥明文。 */
  message: string;
  elapsedMs: number;
  /** 已识别的 HTTP 状态码（若可判定）。 */
  status?: number;
}

export const DEFAULT_TEST_TIMEOUT_MS = 15000;

/** Internal marker so a timeout is distinguishable from a provider error. */
class ConnectionTimeoutError extends Error {
  constructor(ms: number) {
    super(`连接测试超时（${ms} ms）`);
    this.name = 'ConnectionTimeoutError';
  }
}

/** Extract an HTTP status from a structured error or the classified message. */
export function extractStatus(err: unknown): number | undefined {
  const structured = (err as { status?: unknown })?.status;
  if (typeof structured === 'number') return structured;
  const msg = err instanceof Error ? err.message : String(err);
  const m = /HTTP\s+(\d{3})/.exec(msg);
  return m ? Number(m[1]) : undefined;
}

function isTimeout(err: unknown): boolean {
  return err instanceof ConnectionTimeoutError;
}

function isNetworkMessage(msg: string): boolean {
  return /浏览器直连失败|CORS|Failed to fetch|Connection error|NetworkError|Load failed|ERR_|net::/i.test(msg);
}

/**
 * Map a provider/transport failure to a readable category + message. Volcano
 * endpoints (`browserDirect=false`) get a dedicated `direct-restricted` branch
 * for HTTP 401 so we never mislabel a G-KEY gate as a plain invalid key.
 */
export function classifyConnectionFailure(
  err: unknown,
  providerId: string,
): { category: TestConnectionCategory; status?: number; message: string } {
  const provider = providerById(providerId);
  const status = extractStatus(err);
  const raw = err instanceof Error ? err.message : String(err);

  if (isTimeout(err)) {
    return {
      category: 'timeout',
      message: `✖ 测试连接超时：${provider.name} 在限定时间内无响应。请检查网络或端点，稍后重试。`,
    };
  }

  if (status === 401) {
    if (!provider.browserDirect) {
      return {
        category: 'direct-restricted',
        status,
        message:
          `✖ ${provider.name} 直连返回 HTTP 401 —— 该端点已知需 G-KEY 验证（浏览器直连受限）。` +
          `可能是 API Key 无效，也可能是端点拒绝浏览器直连。建议：① 在火山控制台确认 Key 与其「通用 / Coding / Agent Plan」套餐端点匹配；` +
          `② 或改用支持浏览器直连的厂商（DeepSeek / OpenAI / Qwen 通义千问 / 腾讯混元）。`,
      };
    }
    return {
      category: 'invalid-key',
      status,
      message: `✖ ${provider.name} 拒绝了请求（HTTP 401）— API Key 可能无效或已过期。请在厂商控制台确认后重新填写。`,
    };
  }

  if (status === 403) {
    return {
      category: 'forbidden',
      status,
      message: `✖ ${provider.name} 拒绝了请求（HTTP 403）— 无访问权限或该 Key 被限制（如额度 / 地区 / 白名单）。`,
    };
  }

  if (status === 404) {
    const isVolc = provider.id.startsWith('volc');
    return {
      category: 'model-not-found',
      status,
      message:
        `✖ ${provider.name} 返回 HTTP 404 — 模型不存在或端点不对。` +
        (isVolc
          ? '火山模型分布在「通用 / Coding / Agent Plan」三个套餐端点，请改选对应的火山方舟服务商。'
          : '请检查模型名，或在下方自定义 Base URL 确认端点是否正确。'),
    };
  }

  if (status && status >= 400 && status < 500) {
    return { category: 'error', status, message: `✖ ${provider.name} 请求失败（HTTP ${status}）：${raw}` };
  }

  if (isNetworkMessage(raw)) {
    return {
      category: 'network',
      message:
        `✖ 无法连通 ${provider.name} — 网络不可达，或该厂商不允许浏览器直连（CORS）。` +
        `建议：① 检查网络 / 代理；② 改用支持浏览器直连的厂商（DeepSeek / OpenAI / Qwen / 腾讯混元）；` +
        `③ 火山端点请确认套餐与 Key 匹配。原始错误：${raw}`,
    };
  }

  return { category: 'error', message: `✖ ${provider.name} 调用失败：${raw}` };
}

/** Run a minimal real request and return a readable, key-free result. */
export async function testLlmConnection(
  input: TestConnectionInput,
  chatFn: ConnectionChatFn,
): Promise<TestConnectionResult> {
  const provider = providerById(input.providerId);
  const model = input.model?.trim() || provider.defaultModel;
  const apiKey = input.apiKey?.trim() ?? '';

  if (!apiKey) {
    return {
      ok: false,
      category: 'no-key',
      message: `⚠ 未填写 ${provider.name} 的 API Key：请先填写（或先保存）该厂商的 Key 再测试连接。`,
      elapsedMs: 0,
    };
  }

  const timeoutMs = input.timeoutMs && input.timeoutMs > 0 ? input.timeoutMs : DEFAULT_TEST_TIMEOUT_MS;
  const t0 = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ConnectionTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    await Promise.race([
      chatFn(
        {
          providerId: provider.id,
          apiKey,
          model,
          ...(input.baseURL?.trim() ? { baseURL: input.baseURL.trim() } : {}),
        },
        [{ role: 'user', content: 'ping' }],
        [],
      ),
      timeout,
    ]);
    const elapsedMs = Date.now() - t0;
    return {
      ok: true,
      category: 'ok',
      message: `✓ ${provider.name} 连接正常（模型 ${model}，${elapsedMs} ms，最小 ping 请求）`,
      elapsedMs,
    };
  } catch (err) {
    const elapsedMs = Date.now() - t0;
    const { category, status, message } = classifyConnectionFailure(err, provider.id);
    return { ok: false, category, message, elapsedMs, ...(status !== undefined ? { status } : {}) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
