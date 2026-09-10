/**
 * Runtime handshake discovery (channel ③, plan §2.3.2).
 *
 * The plugin injects a probe into the page MAIN world; the site (if it
 * implements the protocol) replies with a descriptor. I/O is injected so the
 * handshake is node-testable with fake postMessage transports.
 */
import {
  buildProbe,
  HANDSHAKE_TIMEOUT_MS,
  nextRequestId,
  parseDescriptorMessage,
} from '../protocol/rpc.js';

export interface HandshakeIo {
  /** Post a message into the page world. */
  send(message: unknown): void;
  /** Subscribe to page-world messages; returns an unsubscribe function. */
  subscribe(handler: (data: unknown) => void): () => void;
}

export interface HandshakeResult {
  ok: boolean;
  descriptor?: unknown;
  error?: string;
}

/**
 * Probe the page world and wait for a descriptor reply.
 * Resolves `{ ok:false, error }` on timeout or missing reply (never throws).
 */
export function runtimeHandshake(opts: {
  channel: string;
  io: HandshakeIo;
  timeoutMs?: number;
  probeId?: string;
}): Promise<HandshakeResult> {
  const timeoutMs = opts.timeoutMs ?? HANDSHAKE_TIMEOUT_MS;
  const id = opts.probeId ?? nextRequestId('probe');
  return new Promise<HandshakeResult>((resolve) => {
    let done = false;
    let unsubscribe: (() => void) | null = null;
    const finish = (result: HandshakeResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe?.();
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ ok: false, error: `运行时握手超时（${timeoutMs}ms 内未收到声明）—— 站点可能未实现 web-cli 协议` }),
      timeoutMs,
    );
    unsubscribe = opts.io.subscribe((data) => {
      const msg = parseDescriptorMessage(data);
      if (!msg) return;
      if (msg.channel !== opts.channel || msg.id !== id) return;
      finish({ ok: true, descriptor: msg.descriptor });
    });
    try {
      opts.io.send(buildProbe(opts.channel, id));
    } catch (err) {
      finish({ ok: false, error: `运行时握手发送失败：${err instanceof Error ? err.message : String(err)}` });
    }
  });
}
