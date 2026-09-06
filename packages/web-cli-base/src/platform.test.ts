import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nodeEnv,
  classifyCapabilityError,
  translateCapabilityError,
  capabilityGuidance,
} from './platform.js';

function errWithName(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

test('platform: nodeEnv 提供 node 面默认缝（fetch 真可用 + 浏览器缝转译桩）', async () => {
  const env = nodeEnv();
  assert.equal(env.kind, 'node');
  // fetch 可用
  const res = await env.fetch('data:text/plain,hello');
  assert.equal(await res.text(), 'hello');
  // 存储缝（配额假面）
  const est = await env.storage?.estimate();
  assert.ok(est && est.quota > 0);
  assert.equal(await env.storage?.persisted(), false);
  // kv 缝 memory 假面
  assert.equal(env.kv?.get('k'), null);
  // 浏览器专属缝 → NotFoundError 转译桩（域工具应降级/禁用）
  await assert.rejects(() => env.clipboard?.readText(), (err: unknown) => {
    assert.equal((err as Error).name, 'NotFoundError');
    return true;
  });
  await assert.rejects(() => env.notify?.show('t'), (err: unknown) => {
    assert.equal((err as Error).name, 'NotFoundError');
    return true;
  });
  await assert.rejects(() => env.filePicker?.save({ suggestedName: 'a.txt', data: 'x' }), (err: unknown) => {
    assert.equal((err as Error).name, 'NotFoundError');
    return true;
  });
});

test('platform: nodeEnv 支持注入覆盖（测试 fake 缝）', async () => {
  const env = nodeEnv({
    clipboard: { readText: async () => 'fake', writeText: async () => {} },
    notify: {
      permission: async () => 'granted' as const,
      requestPermission: async () => 'granted' as const,
      show: async () => true,
    },
  });
  assert.equal(await env.clipboard?.readText(), 'fake');
  assert.equal(await env.notify?.permission(), 'granted');
  assert.equal(await env.notify?.show('t'), true);
  // 未覆盖的缝仍是桩
  await assert.rejects(() => env.filePicker?.download({ filename: 'a', data: 'x' }));
});

// ---- FR-009/EC-003：授权失败分类与转译 ----

test('platform: classifyCapabilityError 按错误名分类（NotAllowed/Security/NotFound）', () => {
  assert.equal(classifyCapabilityError(errWithName('NotAllowedError', 'denied')), 'not-allowed');
  assert.equal(classifyCapabilityError(errWithName('SecurityError', 'insecure context')), 'security');
  assert.equal(classifyCapabilityError(errWithName('NotFoundError', 'missing')), 'not-found');
  assert.equal(classifyCapabilityError(errWithName('AbortError', 'canceled')), 'abort');
  // 消息启发式
  assert.equal(classifyCapabilityError(new Error('The request is not allowed by the user agent')), 'not-allowed');
  assert.equal(classifyCapabilityError(new Error('Cannot read properties of undefined')), 'unsupported');
  assert.equal(classifyCapabilityError(new Error('something else')), 'other');
});

test('platform: 转译输出可读且含授权路径指引（FR-009）', () => {
  const notAllowed = translateCapabilityError(errWithName('NotAllowedError', 'Permission denied'), '通知');
  assert.ok(notAllowed.output.startsWith('✖'));
  assert.match(notAllowed.output, /授权被拒绝/);
  assert.match(notAllowed.output, /地址栏权限设置/);
  assert.match(notAllowed.error, /通知 failed/);

  const security = translateCapabilityError(errWithName('SecurityError', 'nope'), '剪贴板');
  assert.match(security.output, /安全上下文/);

  const notFound = translateCapabilityError(errWithName('NotFoundError', 'gone'), '文件保存');
  assert.match(notFound.output, /句柄已失效/);
});

test('platform: capabilityGuidance 五类指引文案互异', () => {
  const texts = ['not-allowed', 'security', 'not-found', 'unsupported', 'abort', 'other'].map((k) =>
    capabilityGuidance(k as Parameters<typeof capabilityGuidance>[0], '通知'),
  );
  assert.equal(new Set(texts).size, texts.length); // 全部互异
  for (const t of texts) assert.ok(t.includes('通知'));
});
