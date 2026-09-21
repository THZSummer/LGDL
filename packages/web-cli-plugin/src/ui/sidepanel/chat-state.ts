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
  isRefRound,
  lastOpenCardId,
  openAskEntries,
  openSessionSegment,
} from './stream-model.js';
import type { AskCancelReason, OpenAskEntry, StreamEvent, StreamPayload, StreamState, StreamTerminal } from './stream-model.js';
import { ASK_COPY, cancelSystemLine, label, plaintextTitle } from './stream-plaintext.js';
import { appendSystem, continuedSystemText, createSystemChannelState, SYSTEM_COPY } from './system-events.js';
import type { SystemChannelState, SystemEventKind } from './system-events.js';

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
  /** The `askuser` shape — derived from the model (one declaration, no second list). */
  kind: NonNullable<StreamPayload['askKind']>;
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
  /**
   * V4-4 (ADR-V4-036): the single system-event channel's dedupe / rate accounting.
   * Carried on the state (never a module global) so two panels in one process do not
   * share a window, and so `project()` stays replay-equivalent.
   */
  systemChannel: SystemChannelState;
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
  | { type: 'ask-resolved'; answer?: string; canceled?: boolean; requestId?: string; reason?: AskCancelReason; maskedLength?: number }
  | { type: 'audit-count'; count: number }
  /**
   * decision ② / FR-048: load a session's history. V4-2 appends the rows to the
   * **stream** (the event log is never replaced); `entries` keeps the v1 replace
   * semantics for the legacy view.
   */
  | { type: 'history'; entries: Array<{ role: ChatRole; text: string }>; sessionId?: string; sessionLabel?: string }
  | { type: 'notice'; text: string; title?: string }
  // ── V4-2 additions (appended branches only) ───────────────────────────────
  | { type: 'stream-session'; sessionId: string; label?: string }
  | { type: 'stream-merge'; events: readonly StreamEvent[] }
  // ── V4-4 additions (appended branches only) ───────────────────────────────
  /**
   * V4-4 TASK-801 (ADR-V4-035): projection of the reference registry into the
   * stream. ONE event per reference card; `refState:'stale'` appends the failure
   * fact and (when `systemText` is given) the readable system row. A re-pick /
   * re-anchor is a **NEW** `ref` card (`refNum+1`) — the old card is untouched
   * (append-only, R3 discipline).
   */
  | { type: 'ref'; refNum: number; refState: 'valid' | 'stale'; refLabel?: string; detail?: string; systemText?: string; why?: string; evidence?: readonly string[] }
  /** V4-4 TASK-802/803: one merged system row through the single channel. */
  | { type: 'system'; kind: SystemEventKind; text: string; title?: string }
  /**
   * V4-4 TASK-805 (ADR-V4-037): mint one recommendation card. Two hard gates live
   * HERE (not in the caller) so no producer can bypass them: `pending ⇒ no new card`
   * and `no chips ⇒ no card` (EC-CHAT-008).
   */
  | { type: 'nextstep'; chips: readonly string[]; acts: readonly string[]; rule?: string };

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
    systemChannel: createSystemChannelState(),
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

/** The open `askuser` / `auth` card carrying `requestId`, if any (I-07: open only). */
function cardIdForRequest(stream: StreamState, requestId: string | undefined): string | undefined {
  if (!requestId) return undefined;
  for (let i = stream.events.length - 1; i >= 0; i -= 1) {
    const e = stream.events[i];
    if ((e.kind === 'askuser' || e.kind === 'auth') && e.payload.requestId === requestId && e.terminal === undefined) {
      // A terminal event for a card is not identifiable by `requestId` (the terminal
      // event carries no requestId), so「has a terminal」is checked below instead.
      const hasTerminal = stream.events.some((x) => x.cardId === e.cardId && x.terminal !== undefined);
      if (!hasTerminal) return e.cardId;
    }
  }
  return undefined;
}

/**
 * Append one **already-sanitised** system row through the **single channel**
 * (ADR-V4-036). This is the ONLY `kind: 'system'` payload construction in the
 * reducer: every source (`notice` / `env-guard` / `site-hint` / `send-reason` /
 * navigation invalidation / probe phase / session / decision / ref / turn) routes
 * here, so the dedupe window + rate cap + `dropped` accounting cannot be bypassed.
 *
 * I-01 (v4-3 review): every production `label` goes through the factory, which
 * scans the copy at construction time (`label()` → `assertStreamPlaintext`). v4-4
 * additionally runs the text through {@link appendSystem}, whose ① step is the same
 * fail-closed scan — so a pasted URL / page text throws **before** a row exists.
 */
function systemRow(
  state: SidepanelState,
  at: number,
  text: string,
  kind: SystemEventKind = 'notice',
  factId?: string,
  title?: string,
): SidepanelState {
  const { channel, text: accepted, continued } = appendSystem(state.systemChannel, kind, text, at, factId);
  const next: SidepanelState = { ...state, systemChannel: channel };
  if (accepted === null) return next;
  const body = continued ? continuedSystemText(accepted) : accepted;
  // V4.5-1 W2 (TASK-V45-105) —「事实唯一」的两半在同一个写入点定死：
  //   ① `systemKind` 落在 payload 上 ⇒ 渲染成 `data-kind`（ADR-V45-001 的选择器由此可解析）；
  //   ② 长文案（原退役 strip 节点的正文）走 `plaintextTitle` 的 fail-closed 净化后落在
  //      `systemTitle` ⇒ 渲染成行 `title`；注入 URL query / 页面标记在这里**抛错**，
  //      而不是在渲染面被静默 strip。
  const safeTitle = title === undefined || title.length === 0 ? undefined : plaintextTitle(title);
  return push(next, {
    kind: 'system',
    ts: at,
    payload: {
      text: body,
      label: label([body]),
      systemKind: kind,
      ...(safeTitle !== undefined ? { systemTitle: safeTitle } : {}),
    },
  });
}

/**
 * One system row per superseded card — the「不静默」half of the R1 upgrade.
 *
 * I-01 (v4-4 review): each row carries the **card's own identity**
 * (`cardId` / `requestId`) as its dedupe fact id, so N superseded cards always
 * produce N rows even though they share one copy string. Before this, the window
 * collapsed「2 open ask + session switch」into a single「superseded」row.
 */
function traceSuperseded(state: SidepanelState, at: number, superseded: readonly OpenAskEntry[]): SidepanelState {
  let out = state;
  for (const entry of superseded) {
    out = systemRow(out, at, ASK_COPY.supersededSystem, 'decision', entry.cardId ?? entry.requestId);
  }
  return out;
}

/**
 * Terminalise every still-open decision card **the panel does not own** (turn
 * ended / error ended the turn), and leave a trace when a panel-owned reference
 * question is still waiting.
 *
 * ── BLOCK-02 (v4-3 review) — the ruling, in one place ────────────────────────
 *
 * The panel has exactly two ask populations, and they do NOT share expiry
 * semantics:
 *
 *   · a **background ask** (`ask-<n>`, minted by the service worker) is held by an
 *     ask-bridge whose 60 s expiry is what ends the unanswered turn — so the
 *     `pending:false` that follows IS the observable form of「真实 60 s 到期」and
 *     the card is settled `cancelled(timeout)` (or `aborted` when the turn ended on
 *     an error, I-06).
 *   · a **panel-owned reference question** (`ref-round-*`, minted locally by
 *     `acceptCapture`) has **no bridge and no timer**: the turn ending carries no
 *     expiry semantics at all. Settling it as `timeout` would write「提问超时未答」
 *     for a timeout that never happened **and** freeze the pick → choose link the
 *     R1 work exists to keep alive. It is therefore **not** settled; the turn-end
 *     fact is still traced (a system row, never a silent drop) and the card stays
 *     answerable. Every real closure of such a card (new round supersede / session
 *     switch) already writes a `cancelled(superseded)` trace.
 *
 * This is the「留痕」choice: nothing is removed silently, and no fake timeout is
 * invented.
 */
function settleTurnEnd(state: SidepanelState, at: number, reason: 'timeout' | 'aborted'): SidepanelState {
  const open = openAskEntries(state.stream);
  const owned = open.filter((entry) => isRefRound(entry.requestId));
  const background = open.filter((entry) => !isRefRound(entry.requestId));
  let out = state;
  if (background.length > 0) {
    const { state: stream, closed } = closeOpenAsks(state.stream, at, reason, (entry) => !isRefRound(entry.requestId));
    out = { ...out, stream: boundStreamEvents(stream, DEFAULT_STREAM_CAP) };
    const line = cancelSystemLine(reason);
    // I-01: one row per settled card (the card id is the dedupe fact id).
    if (line) for (const cardId of closed) out = systemRow(out, at, line, 'turn', cardId);
  }
  for (const entry of owned) out = systemRow(out, at, ASK_COPY.turnEndRefPending, 'turn', entry.cardId);
  return out;
}

/** Terminalise every still-open decision card (session switch: settle everything). */
function closeOpenAskCards(state: SidepanelState, at: number, reason: AskCancelReason): SidepanelState {
  const { state: stream, closed } = closeOpenAsks(state.stream, at, reason);
  let out: SidepanelState = { ...state, stream: boundStreamEvents(stream, DEFAULT_STREAM_CAP) };
  const line = cancelSystemLine(reason);
  // I-01: one row per settled card (N cards ⇒ N rows, never a collapsed one).
  if (line) for (const cardId of closed) out = systemRow(out, at, line, 'turn', cardId);
  return out;
}

/**
 * I-02 (v4-4 review) — the session switch's separator row goes through the **single
 * channel** (`systemRow`) exactly like every other system fact.
 *
 * `switchStreamSession` (the pure model API) used to `appendEvent({kind:'system'})`
 * itself — a second construction point that bypassed the dedupe window / rate cap /
 * `dropped` accounting. The product path now opens the segment with
 * {@link openSessionSegment} and appends the readable row here; the copy prefix is
 * `SYSTEM_COPY.sessionSwitched` (single source with the label factory).
 */
function openSessionWithRow(state: SidepanelState, at: number, sessionId: string, label: string): SidepanelState {
  const stream = openSessionSegment(state.stream, sessionId);
  let out: SidepanelState = stream === state.stream ? state : { ...state, stream };
  if (stream === state.stream) return out;
  if (state.stream.events.length === 0) return out; // no separator for an empty log
  out = systemRow(out, at, `${SYSTEM_COPY.sessionSwitched}：${label}`, 'session', sessionId);
  return out;
}

/**
 * Append the terminal event of one decision card.
 *
 * I-07 (v4-3 review) — **fail-closed on an unknown requestId**: a caller that names
 * a `requestId` we cannot resolve to a still-open card must settle **nothing**
 * (silently settling「the last card of that kind」would write a terminal fact onto
 * the wrong card). The `lastOpenCardId` fallback is therefore only reachable for a
 * caller that deliberately passes no `requestId` at all.
 */
function terminalDecision(
  state: SidepanelState,
  kind: 'askuser' | 'auth',
  at: number,
  terminal: StreamTerminal,
  requestId: string | undefined,
  payload: StreamPayload,
): SidepanelState {
  const cardId = requestId ? cardIdForRequest(state.stream, requestId) : lastOpenCardId(state.stream, kind);
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

/**
 * The stream branch: a pure, additive fold over the v1 reducer's output.
 *
 * `prev` is the state *before* `reduceChat` ran (R2 / TASK-803 补完). The v1
 * reducer is the only place that computes the navigation-invalidation
 * **false→true 跳变**, so the merge needs both halves of the transition to stay
 * faithful to the original semantics (`prev.invalidated === false` ∧
 * `action.invalidated === true`) instead of re-deriving it from the new state
 * (which can no longer see the previous value).
 */
function streamBranch(state: SidepanelState, action: SidepanelAction, prev: SidepanelState): SidepanelState {
  const at = action.at ?? 0;
  switch (action.type) {
    case 'state': {
      // V4-4 TASK-803 补完（R2 / KL-V44-01 裁决② / ADR-V4-036 §5·矩阵「导航失效」行）——
      // the navigation-invalidation fact now also rides the **single system channel**.
      // The transition is the v1 rule verbatim (false→true only): a repeated refresh
      // carrying `invalidated:true` appends nothing, so the row cannot flood.
      if (action.invalidated === true && !prev.invalidated) {
        return systemRow(state, at, SYSTEM_COPY.navInvalidated, 'nav');
      }
      return state;
    }
    case 'user': {
      // One turn = one user card + one thinking card (two events, one card each).
      const withUser = push(state, { kind: 'user', ts: at, cardId: freshCardId(state.stream, 'u'), payload: { text: action.text } });
      return push(withUser, {
        kind: 'thinking',
        ts: at,
        cardId: freshCardId(withUser.stream, 't'),
        // I-01: the label factory is the production path (scans at construction).
        payload: { label: label(['思考']) },
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
        // The persisted label is the tool name (never the body) — via the factory.
        ...(isCard ? { label: label([action.tool]) } : {}),
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
      // I-06 (v4-3 review): the turn ended on an error ⇒ `reduceChat` already flipped
      // `pending` to false, so the `case 'pending'` settlement below would never run.
      // The un-settled background ask must still be settled — with its OWN reason
      // (`aborted`), never a fake timeout. Panel-owned reference questions keep the
      // BLOCK-02 rule (not settled, traced).
      return settleTurnEnd(closeThinking(withError, at, 'completed'), at, 'aborted');
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
        // V5-2: the masked card records the FACT (a length), never the value (FR-ALLN-022).
        ...(action.maskedLength !== undefined ? { maskedLength: action.maskedLength } : {}),
      });
      const line = action.canceled ? cancelSystemLine(action.reason ?? 'user') : null;
      if (line) out = systemRow(out, at, line, 'decision');
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
      // BLOCK-02: `pending:false` = the turn ended. Only the asks whose bridge really
      // expired are settled as `timeout`; panel-owned reference questions are traced,
      // never settled (see `settleTurnEnd`).
      return action.value ? state : settleTurnEnd(closeThinking(state, at, 'completed'), at, 'timeout');
    case 'history': {
      const nextSession = action.sessionId;
      // ADR-V4-028 §1 + ADR-V4-031 §2: a session switch settles every still-open
      // ask as `cancelled(superseded)` **with a trace** — never a silent drop.
      // Settled BEFORE the switch so the terminal events stay on the old segment.
      let base = state;
      if (nextSession && nextSession !== state.stream.sessionId && openAskEntries(state.stream).length > 0) {
        base = closeOpenAskCards(state, at, 'superseded');
      }
      if (nextSession && nextSession !== base.stream.sessionId) {
        // I-02: the segment is opened by the pure model API, the separator row is
        // appended through the ONE system channel (`openSessionWithRow`).
        base = openSessionWithRow(base, at, nextSession, action.sessionLabel ?? nextSession);
      }
      const stream = base.stream;
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
      // I-02: same single-channel routing as the `history` switch above.
      return openSessionWithRow(state, at, action.sessionId, action.label ?? action.sessionId);
    case 'notice':
      // V4-4 TASK-803 补完（R2 / KL-V44-01 裁决② / ADR-V4-036 §5·矩阵「`#notice`」行）——
      // the legacy **overwrite slot** is merged into the single append-only channel.
      //
      // V4.5-1 W2 (TASK-V45-105): the `#notice` strip element **retired**, so this
      // append-only row is now the fact's ONLY visible carrier (the v1 `state.notice`
      // slot stays readable for the reducer-level caliber, but nothing paints it). The
      // row is ordered / timestamped / un-overwritable, which is exactly what the old
      // overwrite slot could never provide (FR-CHAT-053).
      // Dedupe (5 s window) + the rate cap are applied by `systemRow`, never bypassed.
      return systemRow(state, at, action.text, 'notice', undefined, action.title);
    case 'system':
      // V4-4 (ADR-V4-036): the ONE merged channel. A source that uses this action
      // cannot bypass the dedupe window / rate cap / `dropped` accounting.
      return systemRow(state, at, action.text, action.kind, undefined, action.title);
    case 'nextstep': {
      // FR-CHAT-063: never mint a new card while a turn is pending. EC-CHAT-008:
      // never mint an empty card (「下一步：无」is a fake recommendation).
      if (state.pending) return state;
      const chips = action.chips.slice(0, 3);
      if (chips.length === 0) return state;
      return push(state, {
        kind: 'nextstep',
        ts: at,
        payload: {
          chips,
          nextstepActs: action.acts.slice(0, 3),
          ...(action.rule ? { nextstepRule: action.rule } : {}),
          // ⚠️ The rule id must NOT go through `label`: `risk-recovery` contains the
          // `sk-` + 8-char shape the secret scanner flags, and the label is a
          // user-facing string anyway (BLOCK-01 review 修复轮实测：产品路径产出的
          // risk-recovery 卡在这里抛错 ⇒ 卡不可达)。The id stays machine-readable in
          // `nextstepRule` (never persisted — it is not in `DIGEST_FIELDS`).
          label: label(['下一步推荐']),
        },
      });
    }
    case 'ref': {
      // V4-4 TASK-801 (ADR-V4-035): the reference registry's projection into the
      // stream. `push` mints a NEW card for every event (the `ref` kind has no
      // "same card, later state" migration), so a re-pick / re-anchor necessarily
      // produces a new card with `refNum+1` while the old card keeps its DOM.
      const cardId = freshCardId(state.stream, 'r');
      const payload: StreamPayload = {
        refNum: action.refNum,
        refState: action.refState,
        ...(action.refLabel !== undefined ? { refLabel: action.refLabel } : {}),
        ...(action.why !== undefined ? { refWhy: action.why } : {}),
        ...(action.evidence !== undefined ? { refEvidence: action.evidence } : {}),
        ...(action.detail !== undefined ? { text: action.detail } : {}),
        // The persisted label never carries the body (zero-plaintext): it is the
        // structured「引用 N（有效/失效）」fact, built through the factory.
        label: label([`引用 ${action.refNum}`, action.refState === 'valid' ? '有效' : '失效']),
      };
      let out = push(state, { kind: 'ref', ts: at, cardId, payload });
      if (action.systemText) out = systemRow(out, at, action.systemText, 'ref');
      return out;
    }
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
  // ── V4-4 TASK-803 补完（R2，KL-V44-01 裁决②：显式重锚，不新增豁免类别）──────
  //
  // The two remaining transient channels — **导航失效**（`state.invalidated` 的
  // false→true 跳变）and the legacy **`#notice` overwrite slot** — are now merged into
  // the single `appendSystem` channel as well (see the `'state'` / `'notice'` cases of
  // `streamBranch`). With that, every row of the ADR-V4-036 §5 merge matrix is wired:
  // nothing in the product can still write a system fact outside the one channel.
  //
  // The previous state is threaded through so the nav merge can see BOTH halves of
  // the false→true transition (the v1 reducer is the only place that knows the bit
  // flipped; a repeated `invalidated:true` refresh must stay silent — TASK-033).
  const prev = state;
  return streamBranch(reduceChat(state, action), action, prev);
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
