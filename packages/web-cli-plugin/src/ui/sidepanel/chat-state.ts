/**
 * Side-panel chat state (FR-017 / FR-024 / FR-025 / FR-CHAT-020~026, NFR-008).
 *
 * Pure reducer — DOM-free and node-testable. The UI layer dispatches actions;
 * confirmations default to deny on timeout/cancel (EC-005).
 *
 * ── V4-2 (TASK-606 / TASK-607) — the append-only stream branch ───────────────
 *
 * The v1 `entries` / `nextId` model is kept **verbatim** as a derived view (all 12
 * existing actions and their semantics are untouched, and the pre-existing tests
 * still read `entries`). On top of it, {@link reduce} chains a **stream branch**
 * that appends an immutable {@link StreamEvent} for every state transition the UI
 * really performs. `project(state.stream)` is what `render()` draws — see
 * `stream-render.ts`.
 *
 * Two consequences worth stating explicitly:
 *   · `ask` / `confirm` becoming `null` is no longer "the card disappeared": the
 *     card lives in the stream and is settled by a **terminal event** (no
 *     "parse → set null → vanish" path).
 *   · a session switch appends instead of replacing: `switchStreamSession` keeps
 *     `seq` and the old segment's events, so the tool facts (`tool`/`ok`/`ms`)
 *     survive (FR-CHAT-024) and switching back re-projects them from memory.
 *
 * @module ui/sidepanel/chat-state
 */
import {
  DEFAULT_STREAM_CAP,
  REF_ROUND_PREFIX,
  appendAskEvent,
  appendEvent,
  boundStreamEvents,
  closeOpenAsks,
  createStreamState,
  lastOpenCardId,
  openAskEntries,
  switchStreamSession,
} from './stream-model.js';
import type { AskCancelReason, OpenAskEntry, StreamEvent, StreamPayload, StreamState, StreamTerminal } from './stream-model.js';
import { ASK_COPY, cancelSystemLine } from './stream-plaintext.js';

export { REF_ROUND_PREFIX };

export type ChatRole = 'user' | 'assistant' | 'tool' | 'system';
export type ChatKind = 'text' | 'command' | 'tool' | 'error';

/** TASK-032: automatic discovery-probe projection (structural; no runtime import). */
export interface ProbeState {
  phase?: 'idle' | 'probing' | 'waiting' | 'ready' | 'blocked';
  attempts?: number;
  retries?: number;
  lastReason?: string;
  lastClass?: 'temporary' | 'terminal';
  lastKind?: string;
  nextDelayMs?: number;
  /** R2 (2026-09-17): consecutive terminal (declaration) attempts for the origin. */
  declarationAttempt?: number;
  /** R2: `true` while waiting on a terminal declaration backoff (no fetch in flight). */
  steady?: boolean;
}

export interface ChatEntry {
  id: number;
  role: ChatRole;
  text: string;
  kind: ChatKind;
  /**
   * TASK-023: tool-card metadata (only for `role: 'tool'` entries emitted by the
   * background with a tool name). `tool` drives the card header; `ok`/`ms` are
   * the status + duration. Absent for legacy/notice tool entries.
   */
  tool?: string;
  ok?: boolean;
  ms?: number;
}

export interface ConfirmState {
  requestId: string;
  summary: string;
  risk?: string;
  /** V4-3: the stream card this confirmation is projected on (business linkage). */
  cardId?: string;
}

/** Task-internal clarification question awaiting a user answer (FR-017 / R7). */
export interface AskState {
  requestId: string;
  kind: 'choice' | 'confirm' | 'text';
  prompt: string;
  options?: string[];
  default?: string;
  /** V4-3: the stream card this ask is projected on (business linkage). */
  cardId?: string;
}

export interface SidepanelState {
  entries: ChatEntry[];
  nextId: number;
  pending: boolean;
  /**
   * V4-2: the append-only event log + the active segment. Draw the stream from
   * here; `entries` remains only as the derived (legacy) view.
   */
  stream: StreamState;
  activeOrigin?: string;
  discoveryState?: 'supported' | 'unsupported' | 'unknown';
  /** Readable discovery failure reason (TASK-019 任务 B). */
  discoveryReason?: string;
  /** TASK-032: automatic discovery-probe status (retry count / class / reason). */
  probe?: ProbeState;
  authorized: boolean;
  /** TASK-023: per-origin trust (read-only display; display defaults to untrusted). */
  trust?: 'trusted' | 'untrusted';
  /** FR-052 / ADR-017: bound origin's read/write auto-authorization switches. */
  autoAuth?: { read: boolean; write: boolean };
  invalidated: boolean;
  confirm: ConfirmState | null;
  ask: AskState | null;
  auditCount: number;
  notice?: string;
}

/** The v1 action set — **zero deletions** (TASK-607 acceptance). */
type SidepanelActionBody =
  | { type: 'user'; text: string }
  | { type: 'assistant'; text: string }
  | { type: 'tool'; text: string; tool?: string; ok?: boolean; ms?: number }
  | { type: 'command'; text: string }
  | { type: 'error'; text: string }
  | { type: 'pending'; value: boolean }
  | { type: 'state'; origin?: string; discoveryState?: SidepanelState['discoveryState']; discoveryReason?: string; probe?: ProbeState; authorized?: boolean; trust?: SidepanelState['trust']; autoAuth?: { read: boolean; write: boolean }; invalidated?: boolean }
  | { type: 'confirm'; requestId: string; summary: string; risk?: string }
  | { type: 'confirm-resolved'; allow: boolean; requestId?: string }
  | { type: 'ask'; requestId: string; kind: AskState['kind']; prompt: string; options?: string[]; default?: string }
  | { type: 'ask-resolved'; answer?: string; canceled?: boolean; requestId?: string; reason?: AskCancelReason }
  | { type: 'audit-count'; count: number }
  /**
   * decision ② / FR-048: load a session's history. V4-2 appends the rows to the
   * **stream** (the event log is never replaced); `entries` keeps the v1 replace
   * semantics for the legacy view.
   */
  | { type: 'history'; entries: Array<{ role: ChatRole; text: string }>; sessionId?: string; sessionLabel?: string }
  | { type: 'notice'; text: string }
  // ── V4-2 additions (appended branches only) ───────────────────────────────
  | { type: 'stream-session'; sessionId: string; label?: string }
  | { type: 'stream-merge'; events: readonly StreamEvent[] };

/**
 * Every action may carry `at` — the one clock the reducer is allowed to read
 * (the dispatch wrapper stamps it with `Date.now()`; node tests may omit it).
 * This is what keeps the reducer pure/deterministic.
 */
export type SidepanelAction = SidepanelActionBody & { readonly at?: number };

export function createInitialState(): SidepanelState {
  return {
    entries: [],
    nextId: 1,
    pending: false,
    // TASK-601 acceptance: created ONCE per panel (a session switch never calls it).
    stream: createStreamState(''),
    authorized: false,
    invalidated: false,
    confirm: null,
    ask: null,
    auditCount: 0,
  };
}

function append(
  state: SidepanelState,
  role: ChatRole,
  text: string,
  kind: ChatKind,
  meta?: { tool?: string; ok?: boolean; ms?: number },
): SidepanelState {
  const entry: ChatEntry = {
    id: state.nextId,
    role,
    text,
    kind,
    ...(meta?.tool !== undefined ? { tool: meta.tool } : {}),
    ...(meta?.ok !== undefined ? { ok: meta.ok } : {}),
    ...(meta?.ms !== undefined ? { ms: meta.ms } : {}),
  };
  return { ...state, entries: [...state.entries, entry], nextId: state.nextId + 1 };
}

/**
 * The v1 reducer, byte-for-byte semantics preserved (V4-2 never edits a case).
 * Kept un-exported: callers go through {@link reduce}, which chains the stream.
 */
function reduceChat(state: SidepanelState, action: SidepanelAction): SidepanelState {
  switch (action.type) {
    case 'user':
      return append({ ...state, pending: true }, 'user', action.text, 'text');
    case 'assistant':
      return append(state, 'assistant', action.text, 'text');
    case 'tool':
      // FR-050 / EC-023: a FAILED tool card is rendered with the error style
      // (`.entry-error`) so a failure is a visible entry, never only LLM context.
      return append(state, 'tool', action.text, action.ok === false ? 'error' : 'tool', {
        ...(action.tool !== undefined ? { tool: action.tool } : {}),
        ...(action.ok !== undefined ? { ok: action.ok } : {}),
        ...(action.ms !== undefined ? { ms: action.ms } : {}),
      });
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
        ...(action.probe !== undefined ? { probe: action.probe } : {}),
        ...(action.authorized !== undefined ? { authorized: action.authorized } : {}),
        ...(action.trust !== undefined ? { trust: action.trust } : {}),
        ...(action.autoAuth !== undefined ? { autoAuth: action.autoAuth } : {}),
        ...(action.invalidated !== undefined ? { invalidated: action.invalidated } : {}),
        // TASK-033: announce invalidation only on the false→true TRANSITION.
        // A repeated `state` refresh with `invalidated:true` (e.g. the automatic
        // probe push after authorizing) must not clobber a newer user-action
        // notice such as the「已授权」receipt.
        ...(!state.invalidated && action.invalidated
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
    case 'history': {
      // decision ②: a session switch replaces the conversation wholesale. Tool
      // results are re-shown as plain tool notices (no invented card metadata).
      const entries: ChatEntry[] = action.entries
        .filter((e) => e.text.length > 0)
        .map((e, i) => ({ id: i + 1, role: e.role, text: e.text, kind: e.role === 'tool' ? 'tool' : 'text' }));
      return { ...state, entries, nextId: entries.length + 1, pending: false };
    }
    case 'notice':
      return { ...state, notice: action.text };
    default:
      return state;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * The stream branch (appended AFTER the v1 reducer — never inside its cases)
 * ──────────────────────────────────────────────────────────────────────────── */

/** A fresh, unique card id for a new card (`prefix` + the next free seq). */
function freshCardId(state: StreamState, prefix: string): string {
  return `${prefix}${state.seq}`;
}

/** Fold one payload-carrying event in, then apply the bound (never silent). */
function push(
  state: SidepanelState,
  input: { kind: Parameters<typeof appendEvent>[1]['kind']; ts: number; payload?: StreamPayload; cardId?: string; terminal?: StreamTerminal },
): SidepanelState {
  const stream = appendEvent(state.stream, input);
  return { ...state, stream: boundStreamEvents(stream, DEFAULT_STREAM_CAP) };
}

/** Close the currently open `thinking` card (if any) with a terminal event. */
function closeThinking(state: SidepanelState, at: number, terminal: StreamTerminal = 'completed'): SidepanelState {
  const cardId = lastOpenCardId(state.stream, 'thinking');
  if (!cardId) return state;
  const start = state.stream.events.find((e) => e.cardId === cardId);
  const ms = start ? Math.max(0, at - start.ts) : 0;
  return push(state, { kind: 'thinking', ts: at, cardId, payload: { ms }, terminal });
}

/** The open `askuser` / `auth` card carrying `requestId`, if any. */
function cardIdForRequest(stream: StreamState, requestId: string | undefined): string | undefined {
  if (!requestId) return undefined;
  for (let i = stream.events.length - 1; i >= 0; i -= 1) {
    const e = stream.events[i];
    if ((e.kind === 'askuser' || e.kind === 'auth') && e.payload.requestId === requestId && e.terminal === undefined) {
      return e.cardId;
    }
  }
  return undefined;
}

/** Append one **already-sanitised** system row (never a caller body). */
function systemRow(state: SidepanelState, at: number, text: string): SidepanelState {
  return push(state, { kind: 'system', ts: at, payload: { text, label: text } });
}

/** One system row per superseded card — the「不静默」half of the R1 upgrade. */
function traceSuperseded(state: SidepanelState, at: number, superseded: readonly OpenAskEntry[]): SidepanelState {
  let out = state;
  for (let i = 0; i < superseded.length; i += 1) out = systemRow(out, at, ASK_COPY.supersededSystem);
  return out;
}

/** Terminalise every still-open decision card (turn ended / session switched). */
function closeOpenAskCards(state: SidepanelState, at: number, reason: AskCancelReason): SidepanelState {
  const { state: stream, closed } = closeOpenAsks(state.stream, at, reason);
  let out: SidepanelState = { ...state, stream: boundStreamEvents(stream, DEFAULT_STREAM_CAP) };
  const line = cancelSystemLine(reason);
  if (line) for (let i = 0; i < closed.length; i += 1) out = systemRow(out, at, line);
  return out;
}

/** Append the terminal event of one decision card (by requestId, else the last open). */
function terminalDecision(
  state: SidepanelState,
  kind: 'askuser' | 'auth',
  at: number,
  terminal: StreamTerminal,
  requestId: string | undefined,
  payload: StreamPayload,
): SidepanelState {
  const cardId = cardIdForRequest(state.stream, requestId) ?? lastOpenCardId(state.stream, kind);
  if (!cardId) return state;
  return push(state, { kind, ts: at, cardId, payload, terminal });
}

/** Map a `history` row role to its stream kind (the projection has no metadata). */
function historyKind(role: ChatRole): 'user' | 'ai' | 'notice' | 'system' {
  if (role === 'user') return 'user';
  if (role === 'assistant') return 'ai';
  if (role === 'tool') return 'notice';
  return 'system';
}

/** The stream branch: a pure, additive fold over the v1 reducer's output. */
function streamBranch(state: SidepanelState, action: SidepanelAction): SidepanelState {
  const at = action.at ?? 0;
  switch (action.type) {
    case 'user': {
      // One turn = one user card + one thinking card (two events, one card each).
      const withUser = push(state, { kind: 'user', ts: at, cardId: freshCardId(state.stream, 'u'), payload: { text: action.text } });
      return push(withUser, {
        kind: 'thinking',
        ts: at,
        cardId: freshCardId(withUser.stream, 't'),
        payload: { label: '思考' },
      });
    }
    case 'assistant':
      return push(state, { kind: 'ai', ts: at, payload: { text: action.text } });
    case 'tool': {
      const isCard = action.tool !== undefined;
      const payload: StreamPayload = {
        text: action.text,
        ...(isCard ? { tool: action.tool } : {}),
        ...(action.ok !== undefined ? { ok: action.ok } : {}),
        ...(action.ms !== undefined ? { ms: action.ms } : {}),
        // The persisted label is the tool name (never the body).
        ...(isCard ? { label: action.tool } : {}),
      };
      // A tool with an observed outcome is terminal on arrival; a bare retry notice
      // (`notice`) is a single-line row.
      const terminal: StreamTerminal | undefined =
        isCard && (action.ok !== undefined || action.ms !== undefined) ? 'completed' : undefined;
      return push(state, { kind: isCard ? 'tool' : 'notice', ts: at, payload, ...(terminal ? { terminal } : {}) });
    }
    case 'command':
      return push(state, { kind: 'command', ts: at, payload: { text: action.text } });
    case 'error': {
      const withError = push(state, { kind: 'error', ts: at, payload: { text: action.text } });
      return closeThinking(withError, at, 'completed');
    }
    case 'ask': {
      // V4-3: a real ask is a **stream card** now (ADR-V4-030). The single slot
      // (`state.ask`) survives only as a convenience view; its cardId links the two.
      const cardId = freshCardId(state.stream, 'q');
      const { state: stream, superseded } = appendAskEvent(state.stream, {
        kind: 'askuser',
        ts: at,
        cardId,
        payload: {
          requestId: action.requestId,
          askKind: action.kind,
          prompt: action.prompt,
          ...(action.options ? { options: action.options } : {}),
        },
      });
      let out: SidepanelState = {
        ...state,
        stream: boundStreamEvents(stream, DEFAULT_STREAM_CAP),
        ask: state.ask ? { ...state.ask, cardId } : null,
      };
      out = traceSuperseded(out, at, superseded);
      return out;
    }
    case 'ask-resolved': {
      const terminal: StreamTerminal = action.canceled ? 'cancelled' : 'answered';
      const reason: AskCancelReason | undefined = action.canceled ? (action.reason ?? 'user') : undefined;
      let out = terminalDecision(state, 'askuser', at, terminal, action.requestId, {
        ...(action.answer !== undefined ? { answer: action.answer } : {}),
        ...(reason ? { cancelReason: reason } : {}),
      });
      const line = action.canceled ? cancelSystemLine(action.reason ?? 'user') : null;
      if (line) out = systemRow(out, at, line);
      return out;
    }
    case 'confirm': {
      const cardId = freshCardId(state.stream, 'a');
      const { state: stream, superseded } = appendAskEvent(state.stream, {
        kind: 'auth',
        ts: at,
        cardId,
        payload: { requestId: action.requestId, askKind: 'confirm', prompt: action.summary },
      });
      let out: SidepanelState = {
        ...state,
        stream: boundStreamEvents(stream, DEFAULT_STREAM_CAP),
        confirm: state.confirm ? { ...state.confirm, cardId } : null,
      };
      out = traceSuperseded(out, at, superseded);
      return out;
    }
    case 'confirm-resolved':
      return terminalDecision(state, 'auth', at, action.allow ? 'approved' : 'rejected', action.requestId, {});
    case 'pending':
      return action.value ? state : closeOpenAskCards(closeThinking(state, at, 'completed'), at, 'timeout');
    case 'history': {
      const nextSession = action.sessionId;
      // ADR-V4-028 §1 + ADR-V4-031 §2: a session switch settles every still-open
      // ask as `cancelled(superseded)` **with a trace** — never a silent drop.
      // Settled BEFORE the switch so the terminal events stay on the old segment.
      let base = state;
      if (nextSession && nextSession !== state.stream.sessionId && openAskEntries(state.stream).length > 0) {
        base = closeOpenAskCards(state, at, 'superseded');
      }
      let stream = base.stream;
      if (nextSession && nextSession !== stream.sessionId) {
        stream = switchStreamSession(stream, nextSession, action.sessionLabel ?? nextSession);
      }
      if (stream !== base.stream) base = { ...base, stream };
      // Duplicate-history guard: a segment that already carries real rows is
      // re-activated, never re-appended (switch-back must not duplicate).
      const segmentHasRows = stream.events.some((e) => e.sessionId === stream.sessionId && e.kind !== 'system');
      if (segmentHasRows) return { ...base, stream };
      let working: SidepanelState = { ...base, stream };
      for (const row of action.entries) {
        working = push(working, { kind: historyKind(row.role), ts: at, payload: { text: row.text } });
      }
      return working;
    }
    case 'stream-session':
      return { ...state, stream: switchStreamSession(state.stream, action.sessionId, action.label ?? action.sessionId) };
    case 'stream-merge': {
      // Degraded rebuild from a digest: merge events that are not already present.
      // I-06 (v4-2 review): the merge is **idempotent by BOTH keys**. Deduping on
      // `cardId` alone would let an event whose `seq` is already taken slip in
      // (two different cards, same `seq`), which breaks the「seq 单调不复用」
      // invariant the whole model rests on. Conflicts are skipped, never renumbered
      // — a digest event that cannot be appended cleanly must not be silently
      // relabelled as a different fact.
      //
      // F-02 (v4-2 closeout, validate R1): the double-key filter only rejected
      // seqs that were **already occupied**. A digest event with a *free but
      // smaller* `seq` (validate's repro: `seq = 0` while the log was at 1..n) was
      // still accepted, so the merged array went backwards — the log's strict
      // monotonicity is a model invariant, not just a "no duplicates" rule. The
      // merge now accepts **only `seq > max(known seq)`** (candidates are applied in
      // ascending order so the accepted set is monotonic by construction); every
      // rejected candidate is counted in `mergeSkipped` (never silent, and still
      // never renumbered — a stale digest row is dropped, not rewritten).
      let maxKnownSeq = 0;
      const knownCards = new Set(state.stream.events.map((e) => e.cardId));
      for (const e of state.stream.events) if (e.seq > maxKnownSeq) maxKnownSeq = e.seq;
      const accepted: StreamEvent[] = [];
      let skipped = state.stream.mergeSkipped;
      for (const e of [...action.events].sort((a, b) => a.seq - b.seq)) {
        if (knownCards.has(e.cardId) || e.seq <= maxKnownSeq) {
          skipped += 1;
          continue;
        }
        knownCards.add(e.cardId);
        maxKnownSeq = e.seq;
        accepted.push(e);
      }
      if (accepted.length === 0) {
        if (skipped === state.stream.mergeSkipped) return state;
        return { ...state, stream: Object.freeze({ ...state.stream, mergeSkipped: skipped }) };
      }
      const seq = Math.max(state.stream.seq, ...accepted.map((e) => e.seq + 1));
      return {
        ...state,
        stream: Object.freeze({
          ...state.stream,
          events: Object.freeze([...state.stream.events, ...accepted]),
          seq,
          mergeSkipped: skipped,
        }),
      };
    }
    default:
      return state;
  }
}

/**
 * The exported reducer = v1 reducer ⊕ stream branch. The v1 cases are untouched
 * (TASK-607: 12 actions zero-deleted); the stream branch only appends.
 */
export function reduce(state: SidepanelState, action: SidepanelAction): SidepanelState {
  return streamBranch(reduceChat(state, action), action);
}

/**
 * R1 (2026-09-17) — the pending **background** question a new reference round
 * supersedes, or `null`.
 *
 * Why it matters: `acceptCapture()` dispatches its own `ask` round, which *replaces*
 * `state.ask`. If a background question was the one being replaced, the panel will
 * never answer it (the ref round's reply goes to the reference entry, not to
 * `ask-user-response`), so its ask-bridge only expires on the 60 s timeout — the turn
 * stays「处理中」and the composer keeps reading「发送已禁用：上一条指令仍在处理中」long
 * after the user has moved on to picking. The caller settles the returned id as
 * canceled (readable, fail-closed) so the turn can finish.
 *
 * V4-3 (ADR-V4-031 §3): the return value is **widened** — `mustTrace: true` is the
 * contract that the caller settles the ask as `cancelled(superseded)` *and* keeps
 * the trace (the card固化 + the system row are written by the reducer itself, so
 * the caller only has to dispatch the terminal action with `reason:'superseded'`).
 * The `cardId` links the returned request to the exact stream card.
 */
export function supersededAsk(state: SidepanelState): { requestId: string; cardId?: string; mustTrace: true } | null {
  const ask = state.ask;
  if (!ask || ask.requestId.startsWith(REF_ROUND_PREFIX)) return null;
  return { requestId: ask.requestId, ...(ask.cardId !== undefined ? { cardId: ask.cardId } : {}), mustTrace: true };
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
