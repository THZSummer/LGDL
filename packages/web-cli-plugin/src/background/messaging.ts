/**
 * Cross-face message protocol (background ↔ content ↔ side panel).
 *
 * A single discriminated `kind` field keeps the routing explicit and testable.
 * Message shapes are validated by `isPluginMessage` before dispatch.
 */
export type PluginMessageKind =
  | 'ping'
  | 'state'
  | 'discover'
  | 'authorize'
  | 'revoke'
  | 'set-trust'
  | 'invoke-site'
  | 'site-invoke'
  | 'site-invoke-result'
  | 'site-event'
  | 'site-event-push'
  | 'chat'
  | 'chat-result'
  | 'audit-export'
  | 'confirm-request'
  | 'confirm-response'
  | 'ask-user-request'
  | 'ask-user-response'
  | 'risk-control'
  | 'llm-config'
  | 'llm-status'
  | 'llm-test'
  | 'reprobe'
  | 'diag';

export interface PluginMessage {
  kind: PluginMessageKind;
  requestId?: string;
  [k: string]: unknown;
}

export function isPluginMessage(v: unknown): v is PluginMessage {
  if (typeof v !== 'object' || v === null) return false;
  const kind = (v as { kind?: unknown }).kind;
  return typeof kind === 'string' && KIND_SET.has(kind as PluginMessageKind);
}

const KIND_SET: ReadonlySet<PluginMessageKind> = new Set<PluginMessageKind>([
  'ping',
  'state',
  'discover',
  'authorize',
  'revoke',
  'set-trust',
  'invoke-site',
  'site-invoke',
  'site-invoke-result',
  'site-event',
  'site-event-push',
  'chat',
  'chat-result',
  'audit-export',
  'confirm-request',
  'confirm-response',
  'ask-user-request',
  'ask-user-response',
  'risk-control',
  'llm-config',
  'llm-status',
  'llm-test',
  'reprobe',
  'diag',
]);

export function makeMessage(kind: PluginMessageKind, payload: Record<string, unknown> = {}): PluginMessage {
  // `kind` is written last so a payload field can never shadow the routing kind.
  return { ...payload, kind };
}

/** Standard response envelope. */
export interface PluginResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function okResponse<T>(data: T): PluginResponse<T> {
  return { ok: true, data };
}
export function errorResponse(error: string): PluginResponse {
  return { ok: false, error };
}

/** Generate a request id for request/response correlation. */
export function requestId(prefix = 'msg'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
