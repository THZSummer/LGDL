import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeNotify } from './notify.js';
import { executeClipboard } from './clipboard.js';
import { executeStream } from './stream.js';
import type { StreamConnector, StreamMessage } from './stream.js';
import type { PlatformNotify, PlatformClipboard, PlatformEnv } from './platform.js';
import { nodeEnv } from './platform.js';

/** D-005 记录：TASK-013 浏览器/网络试点工具（notify/clipboard/stream）单测，
 * tasks.json 未单列 test 文件 → 平铺本文件（base 通配测试自动纳入，NFR-006）。 */

// ================= notify（FR-024/FR-009：授权两路转译） =================

const grantedNotify: PlatformNotify = {
  permission: async () => 'granted',
  requestPermission: async () => 'granted',
  show: async (t, o) => {
    shown.push({ t, body: o?.body });
    return true;
  },
};
const shown: Array<{ t: string; body?: string }> = [];

test('notify: 授权 granted → show 成功；denied → 降级路径提示；unsupported → 可读', async () => {
  const ok = await executeNotify(grantedNotify, { title: '完成', body: '已导出' });
  assert.equal(ok.ok, true);
  assert.match(ok.output, /已发送通知/);
  assert.equal(shown[0].t, '完成');
  // denied：降级提示（ok:true 说明授权被拒走降级路径）
  const denied = await executeNotify({ permission: async () => 'denied', requestPermission: async () => 'denied', show: async () => false }, { title: 'x' });
  assert.equal(denied.ok, true);
  assert.match(denied.output, /授权已被拒绝/);
  // unsupported → 可读错误
  const unsupported = await executeNotify({ permission: async () => 'unsupported', requestPermission: async () => 'unsupported', show: async () => false }, { title: 'x' });
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.output, /不受当前环境支持/);
  // 未注入 / 缺 title
  const noEnv = await executeNotify(undefined, { title: 'x' });
  assert.equal(noEnv.ok, false);
  const noTitle = await executeNotify(grantedNotify, {});
  assert.equal(noTitle.ok, false);
  assert.match(noTitle.output, /--title/);
});

test('notify: show 抛 NotAllowedError → 授权转译（FR-009/EC-003）', async () => {
  const throwing: PlatformNotify = {
    permission: async () => 'granted',
    requestPermission: async () => 'granted',
    show: async () => {
      const e = new Error('denied at show');
      e.name = 'NotAllowedError';
      throw e;
    },
  };
  const r = await executeNotify(throwing, { title: 'x' });
  assert.equal(r.ok, false);
  assert.match(r.output, /授权被拒绝/);
  assert.ok(r.error);
});

// ================= clipboard（FR-025/FR-009） =================

test('clipboard: read/write 成功 + 授权失败转译（注入桩）', async () => {
  const good: PlatformClipboard = { readText: async () => 'clip-data', writeText: async () => {} };
  const r1 = await executeClipboard(good, 'read', {});
  assert.equal(r1.output, 'clip-data');
  const w = await executeClipboard(good, 'write', { text: 'hello' });
  assert.equal(w.ok, true);
  assert.match(w.output, /已写入剪贴板/);
  const empty = await executeClipboard(good, 'write', {});
  assert.equal(empty.ok, false);
  // SecurityError → 可读（安全上下文指引）
  const secErr: PlatformClipboard = {
    readText: async () => {
      const e = new Error('insecure context');
      e.name = 'SecurityError';
      throw e;
    },
    writeText: async () => {},
  };
  const r2 = await executeClipboard(secErr, 'read', {});
  assert.equal(r2.ok, false);
  assert.match(r2.output, /安全上下文/);
  // NotAllowedError（无手势）
  const gesture: PlatformClipboard = {
    readText: async () => {
      const e = new Error('not allowed');
      e.name = 'NotAllowedError';
      throw e;
    },
    writeText: async () => {},
  };
  const r3 = await executeClipboard(gesture, 'read', {});
  assert.equal(r3.ok, false);
  assert.match(r3.output, /授权被拒绝/);
  const noEnv = await executeClipboard(undefined, 'read', {});
  assert.equal(noEnv.ok, false);
});

// ================= stream（FR-021：连接/订阅/接收/关闭；错误重连语义） =================

function makeConnector(over: Partial<StreamConnector> = {}): { connector: StreamConnector; opened: Array<{ url: string; kind?: string }>; countClosed: () => number } {
  const opened: Array<{ url: string; kind?: string }> = [];
  let closedN = 0;
  const connector: StreamConnector = {
    connect: async (url, opts, onMessage, onError) => {
      opened.push({ url, kind: opts.kind });
      // 异步推 2 条消息
      setTimeout(() => onMessage({ data: 'm1' }), 5);
      setTimeout(() => onMessage({ data: 'm2' }), 10);
      return {
        close: () => {
          closedN += 1;
        },
      };
    },
    ...over,
  };
  return { connector, opened, countClosed: () => closedN };
}

test('stream: subscribe 收 N 条消息返回并关闭连接', async () => {
  const { connector, opened, countClosed } = makeConnector();
  const r = await executeStream({ connector }, { url: 'wss://e.com/ev', kind: 'ws', max: '2', timeoutMs: '500' });
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /收到 2 条消息/);
  assert.match(r.output, /m1/);
  assert.match(r.output, /m2/);
  assert.deepEqual(opened[0], { url: 'wss://e.com/ev', kind: 'ws' });
  assert.equal(countClosed(), 1);
});

test('stream: 缺 url / 连接器错误 / 未注入 → 可读错误（错误重连语义属连接器）', async () => {
  const noUrl = await executeStream({ connector: makeConnector().connector }, {});
  assert.equal(noUrl.ok, false);
  assert.match(noUrl.output, /--url/);
  const errConnector: StreamConnector = {
    connect: async () => {
      throw new TypeError('connection refused');
    },
  };
  const err = await executeStream({ connector: errConnector }, { url: 'wss://x' });
  assert.equal(err.ok, false);
  assert.match(err.output, /流错误|connection refused/);
  const noInject = await executeStream({}, { url: 'wss://x' });
  assert.equal(noInject.ok, false);
  assert.match(noInject.output, /未注入/);
});

test('stream: onError 经连接器报错 → 工具返回错误（会话不中断）', async () => {
  const connector: StreamConnector = {
    connect: async (_u, _o, _onMessage, onError) => {
      setTimeout(() => onError(new Error('socket dropped')), 5);
      return { close: () => {} };
    },
  };
  const r = await executeStream({ connector }, { url: 'wss://x', timeoutMs: '300' });
  assert.equal(r.ok, false);
  assert.match(r.output, /socket dropped/);
});

test('stream: env.stream 注入经 nodeEnv 扩展使用', async () => {
  const { connector } = makeConnector();
  const env: PlatformEnv = { ...nodeEnv(), stream: connector };
  const entry = await import('./stream.js').then((m) => m.createStreamToolEntry(env));
  const r = await entry.executor({ subcommand: 'subscribe', args: { url: 'wss://e.com', max: '1' } }, {});
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /收到 1 条消息/);
});
