/**
 * stream.ts —— stream 实时订阅工具（FR-021，P2 试点，可裁剪）。
 *
 * 生态位（discovery §3.3 C 组 ○）：全双工/流式连接生态位 → WebSocket /
 * EventSource(SSE)。base 提供订阅契约（连接/订阅/接收/关闭）+ 错误重连语义；
 * 真实连接器由场景经 env.stream 注入（Node 面注入桩测试；浏览器面 validate
 * 冒烟）。CSP connect-src 约束：远端流端点需在 connect-src 放行（NFR-008）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformEnv } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

export interface StreamMessage {
  data: string;
}

export interface StreamHandle {
  close(): void;
}

export interface StreamConnector {
  /**
   * 建立订阅（ws/eventsource 语义由连接器承载）。onMessage 每次收到消息回调；
   * onError 报告连接/协议错误（连接器负责自身重连语义，见 StreamConnectOptions.retry）。
   */
  connect(
    url: string,
    opts: { kind?: 'ws' | 'eventsource'; event?: string },
    onMessage: (m: StreamMessage) => void,
    onError: (err: unknown) => void,
  ): StreamHandle | Promise<StreamHandle>;
}

export interface StreamToolDeps {
  connector?: StreamConnector;
}

export interface StreamArgs {
  url?: string;
  kind?: string;
  event?: string;
  /** 收到 N 条后返回（缺省 "1"）。 */
  max?: string;
  /** 等待超时 ms（缺省 "15000"；"0" = 不限）。 */
  timeoutMs?: string;
}

/** stream 执行器（subscribe 语义：连接 → 收 max 条 → 关闭返回）。 */
export async function executeStream(deps: StreamToolDeps, args: StreamArgs): Promise<ToolResult> {
  const url = args.url ?? '';
  if (!url) return { ok: false, output: '✖ stream subscribe 缺少必填参数 --url <ws:// 或 https:// 端点>' };
  const connector = deps.connector;
  if (!connector) {
    return { ok: false, output: '✖ 流连接器未注入（env.stream 缺省）—— 实时订阅需场景提供 ws/eventsource 连接器（CSP connect-src）', error: 'stream connector not injected' };
  }
  const max = args.max !== undefined && /^\d+$/.test(String(args.max)) ? Number(args.max) : 1;
  const timeoutMs = args.timeoutMs !== undefined && /^\d+$/.test(String(args.timeoutMs)) ? Number(args.timeoutMs) : 15000;
  return new Promise<ToolResult>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const received: string[] = [];
    let settled = false;
    let handle: StreamHandle | null = null;
    const finish = (r: ToolResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      try {
        handle?.close();
      } catch {
        // 关闭异常忽略
      }
      resolve(r);
    };
    const onMessage = (m: StreamMessage) => {
      received.push(m.data);
      if (received.length >= max) {
        finish({ ok: true, output: `收到 ${received.length} 条消息：\n${received.join('\n')}` });
      }
    };
    const onError = (err: unknown) => {
      finish({ ok: false, output: `✖ 流错误：${err instanceof Error ? err.message : String(err)}`, error: 'stream error' });
    };
    try {
      const maybe = connector.connect(url, { kind: (args.kind as 'ws' | 'eventsource') ?? undefined, event: args.event }, onMessage, onError);
      Promise.resolve(maybe)
        .then((h) => {
          handle = h;
          if (timeoutMs > 0 && !settled) {
            timer = setTimeout(() => finish({ ok: false, output: `✖ 等待消息超时（${timeoutMs}ms，已关闭连接）`, error: 'stream timeout' }), timeoutMs);
          }
        })
        .catch((err) => onError(err));
    } catch (err) {
      onError(err);
    }
  });
}

// ---------- ToolEntry ----------

const STREAM_DESC =
  'stream：实时订阅（WebSocket/EventSource；P2 试点）。子命令 subscribe --url <端点> [--kind ws|eventsource] [--max N] [--timeoutMs N] —— 连接后收 N 条消息返回。' +
  ' 参数进 args 对象：{"subcommand":"subscribe","args":{"url":"wss://e.com/stream","max":"1"}}。';

const STREAM_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['subscribe'], description: 'stream 子命令：subscribe。' },
    args: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '流端点（ws:// 或 https://）。' },
        kind: { type: 'string', description: 'ws 或 eventsource。' },
        event: { type: 'string', description: 'eventsource 事件名（可选）。' },
        max: { type: 'string', description: '收到 N 条后返回（缺省 1）。' },
        timeoutMs: { type: 'string', description: '超时（缺省 15000）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function streamHelp(): string {
  return [
    'stream —— 实时订阅（ws/eventsource；P2 试点，可裁剪）',
    '用法：stream subscribe --url <端点> [--kind ws|eventsource] [--max N] [--timeoutMs N]',
    '',
    '示例：stream subscribe --url wss://example.com/events --max 3',
    '说明：连接/订阅/接收/关闭由注入连接器承载；错误重连语义属连接器；CSP connect-src 需放行流端点（NFR-008）。',
  ].join('\n');
}

/** 创建 stream 工具条目（env.stream 连接器注入）。 */
export function createStreamToolEntry(env: PlatformEnv): ToolEntry {
  const connector = env.stream as StreamConnector | undefined;
  return {
    name: 'stream',
    summary: '实时订阅（ws/eventsource；P2 试点）',
    schema: { name: 'stream', description: STREAM_DESC, parameters: STREAM_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'net',
    executor: async (tc) =>
      executeStream({ connector }, {
        url: tc.args.url,
        kind: tc.args.kind,
        event: tc.args.event,
        max: tc.args.max,
        timeoutMs: tc.args.timeoutMs,
      }),
    help: streamHelp,
  };
}
