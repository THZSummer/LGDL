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
  // FR-054: optional-permission capability (bookmarks/downloads) status,
  // privacy toggles and post-gesture permission reconciliation.
  | 'capabilities'
  // TASK-040: an optional-capability grant/revoke landed (onAdded/onRemoved) →
  // push the panel to re-measure + re-render without reopening it.
  | 'capability-changed'
  // FR-052 / ADR-017: per-origin auto-authorization switches (side panel / options).
  | 'auto-auth'
  // FR-050 / EC-023: same-origin page-context read for the controlled web-fetch seam.
  | 'fetch-text'
  // FR-051 / TASK-029: base-derived browser tool seams (dom/chrome/wait/extract,
  // and the page-context download chain for save/export/screenshot persistence).
  | 'dom-op'
  | 'file-save'
  // FR-055 / TASK-039: the service worker has no `navigator.clipboard`, so the
  // `clipboard` tool forwards read/write to the extension page (side panel), which
  // performs the op and answers with `sendResponse` (request/response, not a push).
  | 'clipboard-op'
  // V2-1 (ADR-V2-004): additive insight-tree message face. `insight-tree` = pull
  // (returns the full ConnectTreeSnapshot); `insight-changed` = push (re-project
  // trigger, carries no sensitive data).
  | 'insight-tree'
  | 'insight-changed'
  // V2-3 R2 (ADR-V2-024/026/027): additive command-level override face
  // (background ↔ side panel only). Deliberately NOT added to `KIND_SET` below —
  // that set is bundled into the injected content script (`content.js` zero-growth
  // red line); validation lives in `insight-protocol.ts`.
  | 'command-policy'
  | 'command-policy-set'
  | 'command-policy-reset'
  // V3-4 (ADR-V3-030/032): the on-demand pick layer's face. **Type-only** — like the
  // `command-policy` family these are deliberately NOT in `KIND_SET`, because that set
  // is bundled into the injected `content.js` (177,076 B, zero headroom: adding six
  // strings to it measured +307 B, a red-line breach). Runtime validation lives in
  // `content/pick-protocol.ts` and is applied by the service worker's routing gate;
  // `content.js` never references these kinds.
  | 'pick-layer-inject'
  | 'pick-layer-teardown'
  | 'pick-layer-env'
  | 'pick-layer-state'
  | 'ref-captured'
  | 'ref-highlight'
  // V5-2 TASK-V5-130 (ADR-V5-003 §1 / FR-ALLN-067 · X2 · N8): the privileged-op
  // executor face. **Type-only** — type members with NO `KIND_SET` counterpart (that
  // set is bundled into the injected `content.js`, whose ceiling is 177,076 B with zero
  // headroom). Runtime validation lives in `op-protocol.ts`, a background-only module
  // `content-script.ts` never imports.
  | 'op-exec'
  | 'op-exec-result'
  | 'op-audit'
  // R3 (2026-09-17): the read-only rescue probe / one-click re-anchor face. Type-only
  // (same reason as the rest of this family — `content.js` must not carry the strings).
  | 'ref-rescue';

/**
 * V5.5-2 **TASK-V55-204** (ADR-V55-006 §4 · FR-SELF-095) — the `chat-result` payload
 * `variant` vocabulary (the ONE declaration; `chat-events.ts` re-exports this type).
 *
 * **Type-only**: `variant` is a *payload value* of the existing `chat-result` kind — it
 * is NOT a kind and must never join `KIND_SET` below. That set is bundled into the
 * injected `content.js` (177,076 B, zero headroom), so a new string there is a red-line
 * breach; the type union, by contrast, is erased by the compiler and costs **zero
 * runtime bytes on every face**.
 *
 * `'llm-unconfigured'` is the pre-flight configuration event the service worker emits
 * when `isLlmConfigured()` fails — *before* any provider call (zero token). It repays
 * the same terminal vocabulary the passive observation uses (`llm.unconfigured`).
 */
// V5.5-3 TASK-V55-309 (ADR-V55-010 §2/§4): the two arbitration variants are ADDED to the
// payload union (type-only — a `variant` value, never a `KIND_SET` kind). `queued` = the
// turn was buffered (hard cap 1); `busy-rejected` = the buffer was full ⇒ explicit refusal
// whose `text` is the user's own words, which the panel puts BACK into `#input`.
export type ChatResultVariant =
  | 'assistant'
  | 'tool'
  | 'command'
  | 'error'
  | 'done'
  | 'llm-unconfigured'
  | 'queued'
  | 'busy-rejected';

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
  'capabilities',
  'capability-changed',
  'auto-auth',
  'fetch-text',
  'dom-op',
  'file-save',
  'clipboard-op',
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
