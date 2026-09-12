/**
 * 「测试连接」短期缓存单元测试（TASK-028）：
 *  - 配置指纹（厂商/模型/Base URL/Key 任一变更即变；不含 key 明文）
 *  - 缓存命中（含原耗时，且不再发真实请求）
 *  - 配置指纹变化 → 缓存失效并重测
 *  - TTL 过期 → 缓存失效并重测
 *  - 未配置 Key → 零请求（分类 no-key）
 *  - 失败分类透传（401 → invalid-key）并在缓存中保留
 *
 * 全部用注入的 chat 桩 + 注入的 now，无网络、无浏览器。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatResult } from '@lgdl/web-cli-base';
import { testLlmConnection, type ConnectionChatFn, type TestConnectionResult } from '../src/llm/test-connection.js';
import {
  TEST_CACHE_TTL_MS,
  createTestConnectionCache,
  llmConfigFingerprint,
  type LlmConfigFingerprintInput,
  type TestConnectionCache,
} from '../src/llm/test-cache.js';

const baseInput: LlmConfigFingerprintInput = {
  providerId: 'deepseek',
  apiKey: 'sk-cache-unit-secret',
  model: 'deepseek-chat',
  baseURL: 'https://api.deepseek.com',
};

function resolvingChat(): ConnectionChatFn {
  return async (cfg): Promise<ChatResult> => ({ content: 'pong', toolCalls: [], model: cfg.model });
}

function rejectingChat(message: string, status?: number): ConnectionChatFn {
  return async (): Promise<ChatResult> => {
    const err = new Error(message) as Error & { status?: number };
    if (status !== undefined) err.status = status;
    throw err;
  };
}

/** Mirror of the background `llm-test` cache flow (get → run → set). */
async function runCached(
  cache: TestConnectionCache,
  input: LlmConfigFingerprintInput,
  chat: ConnectionChatFn,
): Promise<TestConnectionResult> {
  const fingerprint = llmConfigFingerprint(input);
  const hit = cache.get(fingerprint);
  if (hit) return hit;
  const result = await testLlmConnection(input, chat);
  cache.set(fingerprint, result);
  return result;
}

test('test-cache: fingerprint is deterministic and changes with provider/model/baseURL/key', () => {
  const fp = llmConfigFingerprint(baseInput);
  assert.equal(llmConfigFingerprint({ ...baseInput }), fp, 'same config → same fingerprint');
  assert.notEqual(llmConfigFingerprint({ ...baseInput, providerId: 'openai' }), fp);
  assert.notEqual(llmConfigFingerprint({ ...baseInput, model: 'deepseek-reasoner' }), fp);
  assert.notEqual(llmConfigFingerprint({ ...baseInput, baseURL: 'https://other.example/v1' }), fp);
  assert.notEqual(llmConfigFingerprint({ ...baseInput, apiKey: 'sk-other' }), fp);
  // the digest must never contain the key (or any prefix of it)
  assert.equal(fp.includes(baseInput.apiKey), false);
  assert.equal(fp.includes('secret'), false);
});

test('test-cache: hit returns the ORIGINAL result (message + elapsedMs) and sends no request', async () => {
  const now = () => 1_000;
  const cache = createTestConnectionCache(TEST_CACHE_TTL_MS, now);
  let calls = 0;
  const chat: ConnectionChatFn = async (cfg) => {
    calls += 1;
    return { content: 'pong', toolCalls: [], model: cfg.model };
  };

  const first = await runCached(cache, baseInput, chat);
  assert.equal(first.ok, true);
  assert.equal(calls, 1);
  assert.equal(cache.size(), 1);

  // second run within the TTL: a spy that would fail the test if actually called
  const spy: ConnectionChatFn = async () => {
    throw new Error('cache miss — a real request was sent');
  };
  const second = await runCached(cache, { ...baseInput }, spy);
  assert.equal(second.ok, true);
  assert.equal(second.cached, true);
  assert.equal(second.message, first.message, 'cached message preserved verbatim');
  assert.equal(second.elapsedMs, first.elapsedMs, 'cached latency preserved (original ms)');
});

test('test-cache: a config change (fingerprint differs) invalidates and re-tests', async () => {
  const cache = createTestConnectionCache();
  let calls = 0;
  const chat: ConnectionChatFn = async (cfg) => {
    calls += 1;
    return { content: 'pong', toolCalls: [], model: cfg.model };
  };

  await runCached(cache, baseInput, chat);
  assert.equal(calls, 1);

  const changed = await runCached(cache, { ...baseInput, apiKey: 'sk-cache-unit-secret-2' }, chat);
  assert.equal(calls, 2, 'changed key → cache miss → real request');
  assert.equal(changed.cached, undefined);
  assert.equal(cache.size(), 1, 'single-slot cache does not grow');
});

test('test-cache: TTL expiry invalidates and re-tests', async () => {
  let clock = 10_000;
  const cache = createTestConnectionCache(TEST_CACHE_TTL_MS, () => clock);
  let calls = 0;
  const chat: ConnectionChatFn = async (cfg) => {
    calls += 1;
    return { content: 'pong', toolCalls: [], model: cfg.model };
  };

  await runCached(cache, baseInput, chat);
  assert.equal(calls, 1);

  // still fresh just before the TTL boundary
  clock += TEST_CACHE_TTL_MS - 1;
  const fresh = await runCached(cache, baseInput, chat);
  assert.equal(fresh.cached, true);
  assert.equal(calls, 1);

  // at/after the boundary the slot expires → a real request runs again
  clock += 1;
  const expired = await runCached(cache, baseInput, chat);
  assert.equal(expired.cached, undefined);
  assert.equal(calls, 2);
});

test('test-cache: unconfigured key → no-key result, zero chat calls (even when cached)', async () => {
  const cache = createTestConnectionCache();
  let calls = 0;
  const spy: ConnectionChatFn = async (cfg) => {
    calls += 1;
    return { content: 'pong', toolCalls: [], model: cfg.model };
  };

  const first = await runCached(cache, { ...baseInput, apiKey: '   ' }, spy);
  assert.equal(first.ok, false);
  assert.equal(first.category, 'no-key');
  assert.equal(calls, 0, 'no request for an unconfigured key');

  const second = await runCached(cache, { ...baseInput, apiKey: '' }, spy);
  assert.equal(second.category, 'no-key');
  assert.equal(second.cached, true);
  assert.equal(calls, 0);
});

test('test-cache: failure classification is preserved through the cache (401 → invalid-key)', async () => {
  const cache = createTestConnectionCache();
  let calls = 0;
  const reject = rejectingChat('DeepSeek 拒绝了请求（HTTP 401）', 401);
  const chat: ConnectionChatFn = async (cfg, turns, tools) => {
    calls += 1;
    return reject(cfg, turns, tools);
  };

  const first = await runCached(cache, baseInput, chat);
  assert.equal(first.ok, false);
  assert.equal(first.category, 'invalid-key');
  assert.equal(first.status, 401);
  assert.equal(calls, 1);

  const second = await runCached(cache, baseInput, chat);
  assert.equal(second.cached, true);
  assert.equal(second.category, 'invalid-key');
  assert.equal(second.status, 401);
  assert.equal(calls, 1, 'cached failure → no repeat request');
});
