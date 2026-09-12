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
  // TASK-032: automatic discovery-probe status push (background → side panel).
  | 'probe-changed'
  | 'rebind'
  | 'diag'
  // decision ① / FR-047 (auto detection): content script self-report + background query.
  | 'hello'
  | 'whoami'
  // decision ② / FR-048 (multi-session): list / switch / group management.
  | 'sessions'
  | 'session-switch'
  | 'session-group'
  | 'session-changed'
  // author decision ③ / FR-049: tab-tool privacy toggle (options page).
  | 'tabs-setting'
  // FR-052 / ADR-017: per-origin auto-authorization switches (side panel / options).
  | 'auto-auth'
  // FR-050 / EC-023: same-origin page-context read for the controlled web-fetch seam.
  | 'fetch-text'
  // FR-051 / TASK-029: base-derived browser tool seams (dom/chrome/wait/extract,
  // and the page-context download chain for save/export/screenshot persistence).
  | 'dom-op'
  | 'file-save';

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
  'probe-changed',
  'rebind',
  'diag',
  'hello',
  'whoami',
  'sessions',
  'session-switch',
  'session-group',
  'session-changed',
  'tabs-setting',
  'auto-auth',
  'fetch-text',
  'dom-op',
  'file-save',
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
