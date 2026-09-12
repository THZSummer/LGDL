/**
 * 「测试连接」单元测试（TASK-018）：成功 / 401 / 403 / 404 / CORS·网络 / 超时 / 未填 Key。
 * 全部用注入的 chat 桩，无网络、无浏览器。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatResult, ChatTurn, LlmToolDef } from '@lgdl/web-cli-base';
import {
  DEFAULT_TEST_TIMEOUT_MS,
  extractStatus,
  testLlmConnection,
  type ConnectionChatFn,
} from '../src/llm/test-connection.js';

const input = { providerId: 'deepseek', apiKey: 'sk-unit-test-secret', model: 'deepseek-chat' };

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
function hangingChat(): ConnectionChatFn {
  return () => new Promise<ChatResult>(() => {});
}

test('test-connection: minimal ping succeeds with latency, no key leak', async () => {
  const res = await testLlmConnection(input, resolvingChat());
  assert.equal(res.ok, true);
  assert.equal(res.category, 'ok');
  assert.match(res.message, /连接正常/);
  assert.match(res.message, /ms/);
  assert.ok(res.elapsedMs >= 0);
  assert.equal(JSON.stringify(res).includes('sk-unit-test-secret'), false);
});

test('test-connection: empty key short-circuits without any request', async () => {
  let calls = 0;
  const spy: ConnectionChatFn = async (cfg) => {
    calls += 1;
    return { content: 'pong', toolCalls: [], model: cfg.model };
  };
  const res = await testLlmConnection({ ...input, apiKey: '   ' }, spy);
  assert.equal(res.ok, false);
  assert.equal(res.category, 'no-key');
  assert.equal(calls, 0);
  assert.match(res.message, /未填写/);
});

test('test-connection: HTTP 401 → invalid-key (browser-direct provider)', async () => {
  const res = await testLlmConnection(
    input,
    rejectingChat('DeepSeek 拒绝了请求（HTTP 401）— API Key 可能无效或已过期'),
  );
  assert.equal(res.ok, false);
  assert.equal(res.category, 'invalid-key');
  assert.equal(res.status, 401);
  assert.match(res.message, /401/);
});

test('test-connection: volcano HTTP 401 → direct-restricted with actionable advice', async () => {
  const res = await testLlmConnection(
    { providerId: 'volc', apiKey: 'ark-key', model: 'doubao-seed-1-6-250615' },
    rejectingChat('火山方舟 · 通用 拒绝了请求（HTTP 401）', 401),
  );
  assert.equal(res.ok, false);
  assert.equal(res.category, 'direct-restricted');
  assert.match(res.message, /G-KEY/);
  assert.match(res.message, /直连/);
  // must not pretend success
  assert.equal(res.ok, false);
});

test('test-connection: HTTP 403 → forbidden', async () => {
  const res = await testLlmConnection(input, rejectingChat('nope', 403));
  assert.equal(res.category, 'forbidden');
  assert.equal(res.status, 403);
});

test('test-connection: HTTP 404 → model-not-found (endpoint/model hint)', async () => {
  const res = await testLlmConnection(input, rejectingChat('missing', 404));
  assert.equal(res.category, 'model-not-found');
  assert.match(res.message, /404/);
});

test('test-connection: CORS / network failure is classified readably', async () => {
  const res = await testLlmConnection(
    input,
    rejectingChat('浏览器直连失败（DeepSeek）— 该厂商的 CORS 策略可能不允许浏览器直连。原始错误：Failed to fetch'),
  );
  assert.equal(res.category, 'network');
  assert.match(res.message, /无法连通/);
});

test('test-connection: timeout is classified as timeout (no hang)', async () => {
  const t0 = Date.now();
  const res = await testLlmConnection({ ...input, timeoutMs: 30 }, hangingChat());
  assert.equal(res.ok, false);
  assert.equal(res.category, 'timeout');
  assert.match(res.message, /超时/);
  assert.ok(Date.now() - t0 < 2000, 'timeout must fire promptly, not hang');
  assert.equal(DEFAULT_TEST_TIMEOUT_MS, 15000);
});

test('test-connection: no result variant contains the plaintext key', async () => {
  const cases: ConnectionChatFn[] = [
    resolvingChat(),
    rejectingChat('HTTP 401', 401),
    rejectingChat('Failed to fetch', undefined),
  ];
  for (const chat of cases) {
    const res = await testLlmConnection(input, chat);
    assert.equal(JSON.stringify(res).includes('sk-unit-test-secret'), false);
  }
});

test('test-connection: extractStatus reads structured status and message HTTP code', () => {
  const withStatus = new Error('x') as Error & { status?: number };
  withStatus.status = 429;
  assert.equal(extractStatus(withStatus), 429);
  assert.equal(extractStatus(new Error('boom HTTP 503')), 503);
  assert.equal(extractStatus(new Error('no code')), undefined);
  assert.equal(extractStatus(undefined), undefined);
});
