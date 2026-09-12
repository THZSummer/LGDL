/**
 * 「测试连接」短期结果缓存（TASK-028）。
 *
 * 背景：侧栏在**每次面板加载时**自动跑一次最小 ping（作者要求），但同一配置
 * 在 60s 内不应被频繁重测（避免刷屏式请求 / 无谓延迟）。本模块提供：
 * - {@link llmConfigFingerprint}：由「厂商 + 模型 + Base URL + API Key」派生的
 *   不可逆短哈希，用于判定配置是否变更；**只在内存里比较**，绝不落盘 / 进日志 /
 *   进审计（key 明文与其派生串都不外泄；见 FR-033/NFR-008）。
 * - {@link createTestConnectionCache}：单槽缓存，命中且未过期时直接返回**原结果**
 *   （含原耗时 ms），不再发真实请求；指纹变化（厂商/模型/Base URL/Key 任一变更）
 *   或 TTL 过期即失效。
 *
 * 纯逻辑、注入 `now`，node 可直接测。
 */
import type { TestConnectionResult } from './test-connection.js';

/** 缓存有效期：60s（作者建议）。 */
export const TEST_CACHE_TTL_MS = 60_000;

export interface LlmConfigFingerprintInput {
  providerId: string;
  model?: string;
  baseURL?: string;
  /** API Key：只参与内存哈希比较，函数返回值不可反推 key。 */
  apiKey: string;
}

/**
 * Non-reversible FNV-1a hash over `provider|model|baseURL|key`. The key never
 * appears in the output and the digest is never persisted / logged / audited.
 */
export function llmConfigFingerprint(input: LlmConfigFingerprintInput): string {
  // Normalise the same way `testLlmConnection` does (trim) so equivalent inputs
  // share one slot (e.g. an all-whitespace key is the same "no key" config).
  const material = [
    input.providerId,
    input.model?.trim() ?? '',
    input.baseURL?.trim() ?? '',
    input.apiKey.trim(),
  ].join('\u0000');
  let hash = 0x811c9dc5;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export interface TestConnectionCache {
  /** Cached result for `fingerprint` when present and fresh; otherwise undefined. */
  get(fingerprint: string): TestConnectionResult | undefined;
  /** Store a fresh result under `fingerprint` (replacing any previous slot). */
  set(fingerprint: string, result: TestConnectionResult): void;
  /** Number of live slots (0 or 1) — for tests/diagnostics, never key-derived. */
  size(): number;
}

/**
 * Single-slot TTL cache. A new `set` overwrites the slot, so at most one test
 * result is ever retained in memory (no unbounded growth, nothing persisted).
 */
export function createTestConnectionCache(
  ttlMs: number = TEST_CACHE_TTL_MS,
  now: () => number = Date.now,
): TestConnectionCache {
  let entry: { fingerprint: string; result: TestConnectionResult; at: number } | null = null;

  return {
    get(fingerprint) {
      if (!entry) return undefined;
      if (entry.fingerprint !== fingerprint) return undefined;
      if (now() - entry.at >= ttlMs) return undefined;
      // Return a copy marked as cached; the original readable message and the
      // original elapsedMs are preserved verbatim (so the panel shows the real
      // latency of the ping that actually ran).
      return { ...entry.result, cached: true };
    },
    set(fingerprint, result) {
      entry = { fingerprint, result, at: now() };
    },
    size() {
      return entry ? 1 : 0;
    },
  };
}
