/**
 * postMessage RPC contract (ADR-001 §2.3.3).
 *
 * Plugin (content script) → page world:
 *   { type:'web-cli:invoke', channel, id, tool, subcommand, args }
 * Page world → plugin:
 *   { type:'web-cli:result', channel, id, ok, output, changed?, source?, error?, trust? }
 *
 * Discovery handshake:
 *   { type:'web-cli:probe', channel, id } → { type:'web-cli:descriptor', channel, id, descriptor }
 *
 * Pure logic: no chrome / DOM / site-private dependency; node-testable.
 */
export const DEFAULT_INVOKE_TYPE = 'web-cli:invoke';
export const DEFAULT_RESULT_TYPE = 'web-cli:result';
export const WEB_CLI_PROBE_TYPE = 'web-cli:probe';
export const WEB_CLI_DESCRIPTOR_TYPE = 'web-cli:descriptor';

/** Default tool invocation timeout (ms); EC-005 same family (timeout → readable failure). */
export const DEFAULT_INVOKE_TIMEOUT_MS = 30000;
/** Runtime handshake timeout (ms, plan §2.3.2). */
export const HANDSHAKE_TIMEOUT_MS = 3000;

export interface WebCliInvokeMessage {
  type: string;
  channel: string;
  id: string;
  tool: string;
  subcommand: string;
  args: Record<string, string>;
}

export interface WebCliResultMessage {
  type: string;
  channel: string;
  id: string;
  ok: boolean;
  output: string;
  changed?: boolean;
  source?: string;
  error?: string;
  trust?: 'external';
}

export interface WebCliProbeMessage {
  type: string;
  channel: string;
  id: string;
}

export interface WebCliDescriptorMessage {
  type: string;
  channel: string;
  id: string;
  descriptor: unknown;
}

export interface InvokeOptions {
  channel: string;
  id: string;
  tool: string;
  subcommand?: string;
  args?: Record<string, string>;
  invokeType?: string;
}

export function buildInvoke(opts: InvokeOptions): WebCliInvokeMessage {
  return {
    type: opts.invokeType ?? DEFAULT_INVOKE_TYPE,
    channel: opts.channel,
    id: opts.id,
    tool: opts.tool,
    subcommand: opts.subcommand ?? '',
    args: opts.args ?? {},
  };
}

export function buildResult(
  opts: { channel: string; id: string; ok: boolean; output: string; changed?: boolean; source?: string; error?: string; resultType?: string },
): WebCliResultMessage {
  return {
    type: opts.resultType ?? DEFAULT_RESULT_TYPE,
    channel: opts.channel,
    id: opts.id,
    ok: opts.ok,
    output: opts.output,
    ...(opts.changed !== undefined ? { changed: opts.changed } : {}),
    ...(opts.source !== undefined ? { source: opts.source } : {}),
    ...(opts.error !== undefined ? { error: opts.error } : {}),
    trust: 'external',
  };
}

export function buildProbe(channel: string, id: string): WebCliProbeMessage {
  return { type: WEB_CLI_PROBE_TYPE, channel, id };
}

export function buildDescriptorMessage(channel: string, id: string, descriptor: unknown): WebCliDescriptorMessage {
  return { type: WEB_CLI_DESCRIPTOR_TYPE, channel, id, descriptor };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asStringArgs(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') out[k] = String(val);
  }
  return out;
}

/** Whether a raw postMessage payload looks like a web-cli protocol message. */
export function isWebCliMessage(data: unknown): boolean {
  if (!isRecord(data) || typeof data.type !== 'string') return false;
  return (
    data.type === DEFAULT_INVOKE_TYPE ||
    data.type === DEFAULT_RESULT_TYPE ||
    data.type === WEB_CLI_PROBE_TYPE ||
    data.type === WEB_CLI_DESCRIPTOR_TYPE
  );
}

export function parseInvoke(data: unknown): WebCliInvokeMessage | null {
  if (!isRecord(data)) return null;
  if (data.type !== DEFAULT_INVOKE_TYPE) return null;
  if (typeof data.channel !== 'string' || typeof data.id !== 'string') return null;
  if (typeof data.tool !== 'string' || !data.tool) return null;
  return {
    type: DEFAULT_INVOKE_TYPE,
    channel: data.channel,
    id: data.id,
    tool: data.tool,
    subcommand: typeof data.subcommand === 'string' ? data.subcommand : '',
    args: asStringArgs(data.args),
  };
}

export function parseResult(data: unknown): WebCliResultMessage | null {
  if (!isRecord(data)) return null;
  if (data.type !== DEFAULT_RESULT_TYPE) return null;
  if (typeof data.channel !== 'string' || typeof data.id !== 'string') return null;
  return {
    type: DEFAULT_RESULT_TYPE,
    channel: data.channel,
    id: data.id,
    ok: data.ok === true,
    output: typeof data.output === 'string' ? data.output : '',
    ...(typeof data.changed === 'boolean' ? { changed: data.changed } : {}),
    ...(typeof data.source === 'string' ? { source: data.source } : {}),
    ...(typeof data.error === 'string' ? { error: data.error } : {}),
    trust: 'external',
  };
}

export function parseProbe(data: unknown): WebCliProbeMessage | null {
  if (!isRecord(data)) return null;
  if (data.type !== WEB_CLI_PROBE_TYPE) return null;
  if (typeof data.channel !== 'string' || typeof data.id !== 'string') return null;
  return { type: WEB_CLI_PROBE_TYPE, channel: data.channel, id: data.id };
}

export function parseDescriptorMessage(data: unknown): WebCliDescriptorMessage | null {
  if (!isRecord(data)) return null;
  if (data.type !== WEB_CLI_DESCRIPTOR_TYPE) return null;
  if (typeof data.channel !== 'string' || typeof data.id !== 'string') return null;
  if (!('descriptor' in data)) return null;
  return { type: WEB_CLI_DESCRIPTOR_TYPE, channel: data.channel, id: data.id, descriptor: data.descriptor };
}

/** Readable timeout failure (shared by invoke + handshake). */
export class RpcTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} 超时（${timeoutMs}ms 内无响应）—— 站点可能未实现 web-cli RPC 或通道未就绪`);
    this.name = 'RpcTimeoutError';
  }
}

/** Race a promise against a timeout; on timeout rejects with a readable `RpcTimeoutError`. */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation = 'web-cli RPC'): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RpcTimeoutError(operation, timeoutMs)), timeoutMs);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Generate a short unique request id (no crypto dependency needed). */
export function nextRequestId(prefix = 'req'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
