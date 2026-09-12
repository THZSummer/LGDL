/**
 * Side-panel chat state (FR-017 / FR-024 / FR-025, NFR-008).
 *
 * Pure reducer — DOM-free and node-testable. The UI layer dispatches actions;
 * confirmations default to deny on timeout/cancel (EC-005).
 */
export type ChatRole = 'user' | 'assistant' | 'tool' | 'system';
export type ChatKind = 'text' | 'command' | 'tool' | 'error';

export interface ChatEntry {
  id: number;
  role: ChatRole;
  text: string;
  kind: ChatKind;
}

export interface ConfirmState {
  requestId: string;
  summary: string;
  risk?: string;
}

/** Task-internal clarification question awaiting a user answer (FR-017 / R7). */
export interface AskState {
  requestId: string;
  kind: 'choice' | 'confirm' | 'text';
  prompt: string;
  options?: string[];
  default?: string;
}

export interface SidepanelState {
  entries: ChatEntry[];
  nextId: number;
  pending: boolean;
  activeOrigin?: string;
  discoveryState?: 'supported' | 'unsupported' | 'unknown';
  /** Readable discovery failure reason (TASK-019 任务 B). */
  discoveryReason?: string;
  authorized: boolean;
  invalidated: boolean;
  confirm: ConfirmState | null;
  ask: AskState | null;
  auditCount: number;
  notice?: string;
}

export type SidepanelAction =
  | { type: 'user'; text: string }
  | { type: 'assistant'; text: string }
  | { type: 'tool'; text: string }
  | { type: 'command'; text: string }
  | { type: 'error'; text: string }
  | { type: 'pending'; value: boolean }
  | { type: 'state'; origin?: string; discoveryState?: SidepanelState['discoveryState']; discoveryReason?: string; authorized?: boolean; invalidated?: boolean }
  | { type: 'confirm'; requestId: string; summary: string; risk?: string }
  | { type: 'confirm-resolved'; allow: boolean }
  | { type: 'ask'; requestId: string; kind: AskState['kind']; prompt: string; options?: string[]; default?: string }
  | { type: 'ask-resolved' }
  | { type: 'audit-count'; count: number }
  | { type: 'notice'; text: string };

export function createInitialState(): SidepanelState {
  return {
    entries: [],
    nextId: 1,
    pending: false,
    authorized: false,
    invalidated: false,
    confirm: null,
    ask: null,
    auditCount: 0,
  };
}

function append(state: SidepanelState, role: ChatRole, text: string, kind: ChatKind): SidepanelState {
  const entry: ChatEntry = { id: state.nextId, role, text, kind };
  return { ...state, entries: [...state.entries, entry], nextId: state.nextId + 1 };
}

export function reduce(state: SidepanelState, action: SidepanelAction): SidepanelState {
  switch (action.type) {
    case 'user':
      return append({ ...state, pending: true }, 'user', action.text, 'text');
    case 'assistant':
      return append(state, 'assistant', action.text, 'text');
    case 'tool':
      return append(state, 'tool', action.text, 'tool');
    case 'command':
      return append(state, 'assistant', action.text, 'command');
    case 'error':
      return append({ ...state, pending: false }, 'system', action.text, 'error');
    case 'pending':
      return { ...state, pending: action.value };
    case 'state':
      return {
        ...state,
        ...(action.origin !== undefined ? { activeOrigin: action.origin } : {}),
        ...(action.discoveryState !== undefined ? { discoveryState: action.discoveryState } : {}),
        ...(action.discoveryReason !== undefined ? { discoveryReason: action.discoveryReason } : {}),
        ...(action.authorized !== undefined ? { authorized: action.authorized } : {}),
        ...(action.invalidated !== undefined ? { invalidated: action.invalidated } : {}),
        ...(action.invalidated
          ? { notice: '页面已导航：会话上下文失效，请重新授权/重连（不静默续接）' }
          : {}),
      };
    case 'confirm':
      return { ...state, confirm: { requestId: action.requestId, summary: action.summary, ...(action.risk ? { risk: action.risk } : {}) } };
    case 'confirm-resolved':
      return { ...state, confirm: null };
    case 'ask':
      return {
        ...state,
        ask: {
          requestId: action.requestId,
          kind: action.kind,
          prompt: action.prompt,
          ...(action.options ? { options: action.options } : {}),
          ...(action.default ? { default: action.default } : {}),
        },
      };
    case 'ask-resolved':
      return { ...state, ask: null };
    case 'audit-count':
      return { ...state, auditCount: action.count };
    case 'notice':
      return { ...state, notice: action.text };
    default:
      return state;
  }
}

/**
 * Resolve a pending confirmation. Timeout / cancel both deny (EC-005).
 * Returns the action to send back to the background, or null when nothing pending.
 */
export function resolveConfirm(state: SidepanelState, allow: boolean): { requestId: string; allow: boolean } | null {
  if (!state.confirm) return null;
  return { requestId: state.confirm.requestId, allow };
}

/**
 * Resolve a pending task-internal question (FR-017 / R7). Cancel / empty answer
 * yields `canceled` (the tool reports the user canceled) — never a silent value.
 * Returns the message payload to send back to the background, or null.
 */
export function resolveAsk(
  state: SidepanelState,
  value: string | undefined,
  canceled: boolean,
): { requestId: string; value?: string; canceled: boolean } | null {
  if (!state.ask) return null;
  const trimmed = value?.trim();
  if (canceled || !trimmed) return { requestId: state.ask.requestId, canceled: true };
  return { requestId: state.ask.requestId, value: trimmed, canceled: false };
}
