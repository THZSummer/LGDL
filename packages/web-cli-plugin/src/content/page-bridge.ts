/**
 * Page-world RPC bridge (FR-007 / FR-011 / FR-021).
 *
 * Runs in the content script's isolated world and talks to the page world via
 * `window.postMessage`. It never attaches globals to `window`, never touches the
 * prototype chain, and holds no keys / performs no authorization decisions.
 *
 * Two channels are proxied:
 *   - tool execution (`web-cli:invoke` → `web-cli:result`), FR-011;
 *   - site event hub (`web-cli:event` → `web-cli:event-result`, plus
 *     `web-cli:event-notify` push), FR-021. The page world implements the
 *     `env.events` hub; the content script only forwards requests/results to the
 *     background event channel (no decision, no persistent listener unless the
 *     consumer explicitly subscribes).
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

// ---------- Event channel contract (FR-021) ----------

export const WEB_CLI_EVENT_TYPE = 'web-cli:event';
export const WEB_CLI_EVENT_RESULT_TYPE = 'web-cli:event-result';
export const WEB_CLI_EVENT_NOTIFY_TYPE = 'web-cli:event-notify';

/**
 * Context budget for proxied event pulls: only a bounded summary enters the
 * consumer context, mirroring the upstream event-bus `summaryN` count. The event
 * payload itself is already budgeted (4KB truncation) by the page hub.
 */
export const EVENT_CONTEXT_SUMMARY_N = 10;

export type WebCliEventOp = 'subscribe' | 'pull' | 'unsubscribe' | 'status';

export interface WebCliEventRequestMessage {
  type: string;
  channel: string;
  id: string;
  op: WebCliEventOp;
  params: Record<string, unknown>;
}

export interface WebCliEventResultMessage {
  type: string;
  channel: string;
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface WebCliEventNotifyMessage {
  type: string;
  channel: string;
  subId: string;
  events: unknown[];
}

export function buildEventRequest(opts: {
  channel: string;
  id: string;
  op: WebCliEventOp;
  params?: Record<string, unknown>;
}): WebCliEventRequestMessage {
  return {
    type: WEB_CLI_EVENT_TYPE,
    channel: opts.channel,
    id: opts.id,
    op: opts.op,
    params: opts.params ?? {},
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseEventResult(data: unknown): WebCliEventResultMessage | null {
  if (!isRecord(data)) return null;
  if (data.type !== WEB_CLI_EVENT_RESULT_TYPE) return null;
  if (typeof data.channel !== 'string' || typeof data.id !== 'string') return null;
  return {
    type: WEB_CLI_EVENT_RESULT_TYPE,
    channel: data.channel,
    id: data.id,
    ok: data.ok === true,
    ...('data' in data ? { data: data.data } : {}),
    ...(typeof data.error === 'string' ? { error: data.error } : {}),
  };
}

export function parseEventNotify(data: unknown): WebCliEventNotifyMessage | null {
  if (!isRecord(data)) return null;
  if (data.type !== WEB_CLI_EVENT_NOTIFY_TYPE) return null;
  if (typeof data.channel !== 'string' || typeof data.subId !== 'string') return null;
  if (!Array.isArray(data.events)) return null;
  return { type: WEB_CLI_EVENT_NOTIFY_TYPE, channel: data.channel, subId: data.subId, events: data.events };
}

/**
 * Cap a proxied event payload to the context summary budget (NFR-007). Returns
 * the capped data plus whether anything was dropped, so the caller can surface a
 * readable truncation note instead of silently losing events.
 */
export function capEventData(data: unknown, max: number = EVENT_CONTEXT_SUMMARY_N): { data: unknown; truncated: boolean; dropped: number } {
  if (!isRecord(data)) return { data, truncated: false, dropped: 0 };
  const events = data.events;
  if (!Array.isArray(events) || events.length <= max) return { data, truncated: false, dropped: 0 };
  return { data: { ...data, events: events.slice(0, max) }, truncated: true, dropped: events.length - max };
}

// ---------- Page bridge ----------

export interface PageBridgeOptions {
  channel: string;
  invokeType?: string;
  resultType?: string;
  timeoutMs?: number;
  /** Event request/response timeout (defaults to the tool invoke timeout). */
  eventTimeoutMs?: number;
  /** Unsolicited page-event push handler (FR-021). */
  onEvent?: (message: WebCliEventNotifyMessage) => void;
}

export interface PageEventBridge {
  request(op: WebCliEventOp, params?: Record<string, unknown>, timeoutMs?: number): Promise<WebCliEventResultMessage>;
  subscribe(params: Record<string, unknown>, timeoutMs?: number): Promise<WebCliEventResultMessage>;
  pull(subId: string, opts?: { lastId?: number; max?: number }, timeoutMs?: number): Promise<WebCliEventResultMessage>;
  unsubscribe(subId: string, timeoutMs?: number): Promise<WebCliEventResultMessage>;
  status(timeoutMs?: number): Promise<WebCliEventResultMessage>;
}

export interface PageBridge {
  invoke(tool: string, subcommand: string, args?: Record<string, string>): Promise<WebCliResultMessage>;
  handshake(timeoutMs?: number): Promise<HandshakeResult>;
  /** Site event hub proxy (FR-021); no listener is installed until requested. */
  events: PageEventBridge;
  dispose(): void;
}

export function createPageBridge(io: BridgeIo, opts: PageBridgeOptions): PageBridge {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_INVOKE_TIMEOUT_MS;
  const eventTimeoutMs = opts.eventTimeoutMs ?? timeoutMs;
  const pending = new Map<string, (msg: WebCliResultMessage) => void>();
  const pendingEvents = new Map<string, (msg: WebCliEventResultMessage) => void>();

  const unsubscribe = io.subscribe((data) => {
    const ev = parseEventResult(data);
    if (ev && ev.channel === opts.channel) {
      const resolve = pendingEvents.get(ev.id);
      if (resolve) {
        pendingEvents.delete(ev.id);
        resolve(ev);
      }
      return;
    }
    const notify = parseEventNotify(data);
    if (notify && notify.channel === opts.channel) {
      opts.onEvent?.(notify);
      return;
    }
    const msg = parseResult(data);
    if (!msg) return;
    if (msg.channel !== opts.channel) return;
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  });

  const eventRequest = (op: WebCliEventOp, params: Record<string, unknown> = {}, timeout: number = eventTimeoutMs): Promise<WebCliEventResultMessage> => {
    const id = nextRequestId('event');
    const promise = new Promise<WebCliEventResultMessage>((resolve) => {
      pendingEvents.set(id, resolve);
    });
    io.post(buildEventRequest({ channel: opts.channel, id, op, params }));
    return withTimeout(promise, timeout, `站点事件通道 ${op} 调用`).catch((err) => {
      pendingEvents.delete(id);
      // FR-008 / EC-007: readable, non-silent failure; the background re-translates
      // with attribution (kept out of the content bundle to avoid pulling base in).
      return {
        type: WEB_CLI_EVENT_RESULT_TYPE,
        channel: opts.channel,
        id,
        ok: false,
        error: `事件通道不可达：${err instanceof Error ? err.message : String(err)}`,
      } satisfies WebCliEventResultMessage;
    });
  };

  const events: PageEventBridge = {
    request: eventRequest,
    subscribe: (params, timeout) => eventRequest('subscribe', params, timeout),
    async pull(subId, pullOpts, timeout) {
      const res = await eventRequest('pull', { subId, ...(pullOpts ?? {}) }, timeout);
      // NFR-007: keep only a bounded summary in the consumer context, with an
      // explicit truncation note (never a silent drop).
      if (!res.ok || !isRecord(res.data)) return res;
      const capped = capEventData(res.data);
      if (!capped.truncated) return res;
      return {
        ...res,
        data: {
          ...(capped.data as Record<string, unknown>),
          note: `上下文预算截断：仅返回前 ${EVENT_CONTEXT_SUMMARY_N} 条事件（本次省略 ${capped.dropped} 条，可继续 pull 增量）`,
        },
      };
    },
    unsubscribe: (subId, timeout) => eventRequest('unsubscribe', { subId }, timeout),
    status: (timeout) => eventRequest('status', {}, timeout),
  };

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
        // FR-008 / EC-007: readable, non-silent failure (background re-translates
        // with attribution via `platform/unsupported.ts`; kept out of the content
        // bundle to avoid pulling the whole base into every injected script).
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
    events,
    dispose() {
      unsubscribe();
      pending.clear();
      pendingEvents.clear();
    },
  };
}
