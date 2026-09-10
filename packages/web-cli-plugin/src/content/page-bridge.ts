/**
 * Page-world RPC bridge (FR-007 / FR-011).
 *
 * Runs in the content script's isolated world and talks to the page world via
 * `window.postMessage`. It never attaches globals to `window`, never touches the
 * prototype chain, and holds no keys / performs no authorization decisions.
 *
 * I/O is injected so the bridge is node-testable.
 */
import {
  buildInvoke,
  DEFAULT_INVOKE_TIMEOUT_MS,
  nextRequestId,
  parseResult,
  withTimeout,
  type WebCliResultMessage,
} from '../protocol/rpc.js';
import { runtimeHandshake, type HandshakeResult } from '../discovery/runtime-handshake.js';

export interface BridgeIo {
  /** Post a message to the page world. */
  post(message: unknown): void;
  /** Subscribe to page-world messages; returns an unsubscribe function. */
  subscribe(handler: (data: unknown) => void): () => void;
}

export interface PageBridgeOptions {
  channel: string;
  invokeType?: string;
  resultType?: string;
  timeoutMs?: number;
}

export interface PageBridge {
  invoke(tool: string, subcommand: string, args?: Record<string, string>): Promise<WebCliResultMessage>;
  handshake(timeoutMs?: number): Promise<HandshakeResult>;
  dispose(): void;
}

export function createPageBridge(io: BridgeIo, opts: PageBridgeOptions): PageBridge {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_INVOKE_TIMEOUT_MS;
  const pending = new Map<string, (msg: WebCliResultMessage) => void>();

  const unsubscribe = io.subscribe((data) => {
    const msg = parseResult(data);
    if (!msg) return;
    if (msg.channel !== opts.channel) return;
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  });

  return {
    invoke(tool, subcommand, args = {}) {
      const id = nextRequestId('invoke');
      const promise = new Promise<WebCliResultMessage>((resolve) => {
        pending.set(id, resolve);
      });
      io.post(
        buildInvoke({
          channel: opts.channel,
          id,
          tool,
          subcommand,
          args,
          ...(opts.invokeType ? { invokeType: opts.invokeType } : {}),
        }),
      );
      return withTimeout(promise, timeoutMs, `站点工具 ${tool} 调用`).catch((err) => {
        pending.delete(id);
        return {
          type: opts.resultType ?? 'web-cli:result',
          channel: opts.channel,
          id,
          ok: false,
          output: `✖ ${err instanceof Error ? err.message : String(err)}`,
          error: 'rpc timeout',
        } satisfies WebCliResultMessage;
      });
    },
    handshake(handshakeTimeoutMs) {
      return runtimeHandshake({
        channel: opts.channel,
        io: { send: (message) => io.post(message), subscribe: io.subscribe },
        ...(handshakeTimeoutMs !== undefined ? { timeoutMs: handshakeTimeoutMs } : {}),
      });
    },
    dispose() {
      unsubscribe();
      pending.clear();
    },
  };
}
