/**
 * `diag` 消息投影单测（TASK-019 任务 C）。
 *
 * 只回非敏感字段；已授权 origin 过滤 + 排序稳定；OriginStore 抛错时降级为空列表
 * （诊断本身绝不因下游异常而失败）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagMessage } from '../src/background/diag-message.js';

test('diag message: projects non-sensitive fields and filters authorized origins', async () => {
  const payload = await buildDiagMessage({
    version: '0.8.0',
    buildStamp: '2026-09-12T00:00:00.000Z',
    swStartedAt: 123,
    activeOrigin: 'https://a.test',
    discoveryState: 'supported',
    listOrigins: async () => [
      { origin: 'https://b.test', authorized: true, trust: 'untrusted', updatedAt: 1 },
      { origin: 'https://a.test', authorized: false, trust: 'untrusted', updatedAt: 2 },
      { origin: 'https://c.test', authorized: true, trust: 'trusted', updatedAt: 3 },
    ],
  });
  assert.equal(payload.version, '0.8.0');
  assert.equal(payload.buildStamp, '2026-09-12T00:00:00.000Z');
  assert.equal(payload.activeOrigin, 'https://a.test');
  assert.equal(payload.discoveryState, 'supported');
  assert.deepEqual(payload.authorizedOrigins, ['https://b.test', 'https://c.test']);
  // no key-ish field ever surfaces
  assert.equal(JSON.stringify(payload).includes('apiKey'), false);
});

test('diag message: origin listing failure degrades to an empty list (never throws)', async () => {
  const payload = await buildDiagMessage({
    version: '0.8.0',
    buildStamp: 'dev',
    swStartedAt: 1,
    activeOrigin: null,
    discoveryState: null,
    listOrigins: async () => {
      throw new Error('storage down');
    },
  });
  assert.deepEqual(payload.authorizedOrigins, []);
  assert.equal(payload.activeOrigin, null);
  assert.equal(payload.discoveryState, null);
});
