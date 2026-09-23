/**
 * V4-2 TASK-601 (leaf `specs-tree-v4-2-chat-stream-model`) — **the append-only
 * stream event model + the pure projection** (父 ADR-V4-002 / ADR-V4-003 /
 * ADR-V4-012；本叶 ADR-V4-024/028).
 *
 * ── What this module is, and what it deliberately is NOT ──────────────────────
 *
 *  · **The event layer is immutable.** Every {@link StreamEvent} is `readonly` and
 *    `Object.freeze`-n in {@link appendEvent}, so "进行中 → 完成" can never be
 *    expressed by mutating history: it is expressed by appending a *later* event
 *    (the tool result / `thinking-done`) that the projection folds in.
 *  · **The projection layer is mutable up to the terminal.** {@link project} folds
 *    the per-card event sequence into a {@link CardView}; a `system`/`notice` row is
 *    born terminal (single line, no state migration), a `tool`/`thinking`/`askuser`
 *    card is born open and freezes the moment an event carrying `terminal` arrives.
 *  · **Terminal freeze is an invariant, not a convention.** Once a card has a
 *    terminal event, every later event for the same `cardId` is ignored by the
 *    projection (it cannot rewrite `terminal`/`terminalSeq`, and it cannot even be
 *    folded into the payload) — the escape hatch for "something changed after the
 *    fact" is *a new event row / a new card*, never an edit.
 *  · **`seq` is globally monotonic and never reused, across session switches.**
 *    {@link createStreamState} is called exactly once (panel init); switching a
 *    session goes through {@link switchStreamSession} which keeps `seq`.
 *  · **There is no "parse → set null → the card disappears" path.** Cancellation /
 *    timeout / supersession are terminal events on the *same* card, so the card
 *    stays in `project()`'s output (TASK-601 acceptance).
 *  · **The immutability is DEEP, not one level deep.** `Object.freeze` is shallow, so
 *    a nested array (`payload.options` / `payload.chips`) would stay writable through
 *    three different handles (the event, the projection, the caller's original array).
 *    {@link deepFreeze} therefore **copies and freezes every level** on the way into
 *    an event ({@link appendEvent}) and on the way out of a projection ({@link project}):
 *    a payload array is never aliased to the caller's object, so no outer mutation can
 *    reach the log, and no write through a card view can reach either. F-01, v4-2
 *    closeout round (validate R1) — see `test/stream-model.test.ts` ① group.
 *
 * The module has zero DOM and zero clock references (`ts` always comes from the
 * event), which is what makes `project()` replay-equivalent and node-testable.
 *
 * @module ui/sidepanel/stream-model
 */

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Kinds / terminals
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The **7 primary card types** — the order is the design contract's order
 * (`design/ui-redesign/option-f-shim.mjs#CARD_TYPES`) and is asserted verbatim by
 * `test/design-contract.test.ts`. Never reorder.
 */
export const PRIMARY_CARD_TYPES = Object.freeze([
  'ai',
  'user',
  'nextstep',
  'askuser',
  'auth',
  'system',
  'ref',
] as const);

/**
 * The **5 process-card forms** (AI-family sub-forms, O-CHAT-008 / ADR-V4-027).
 * They live in the same `[data-msg-type]` taxonomy as the primary cards — that is
 * what makes "one固化 contract, one DOM language" possible.
 */
export const PROCESS_CARD_TYPES = Object.freeze(['tool', 'command', 'thinking', 'error', 'notice'] as const);

export type PrimaryCardType = (typeof PRIMARY_CARD_TYPES)[number];
export type ProcessCardType = (typeof PROCESS_CARD_TYPES)[number];
export type StreamEventKind = PrimaryCardType | ProcessCardType;

/** `CARD_TYPES` = 12 kinds = 7 primary (first, design-contract order) + 5 process. */
export const STREAM_EVENT_KINDS: readonly StreamEventKind[] = Object.freeze([
  ...PRIMARY_CARD_TYPES,
  ...PROCESS_CARD_TYPES,
]);

/**
 * The public taxonomy name (`FR-CHAT-021` / `FR-CHAT-036`). Kept as an alias of
 * {@link STREAM_EVENT_KINDS} so the model is the ONE place the 12 kinds are
 * declared, and `cards/index.ts#CARD_TYPES` can only ever mirror it.
 */
export const CARD_TYPES: readonly StreamEventKind[] = STREAM_EVENT_KINDS;

/** The six terminal states (parent ADR-V4-002 decision 1). */
export const STREAM_TERMINALS = Object.freeze([
  'answered',
  'cancelled',
  'approved',
  'rejected',
  'invalidated',
  'completed',
] as const);
export type StreamTerminal = (typeof STREAM_TERMINALS)[number];

/** `primary` = 7 主类；`process` = 过程卡族（可折叠，固化卡/系统行不压缩）. */
export type CardLayer = 'primary' | 'process';

/* ────────────────────────────────────────────────────────────────────────────
 * 1b. v4-3 — ask/auth terminal vocabulary + the open-ask arbitration constants
 *     (ADR-V4-030 / ADR-V4-031 / ADR-V4-032). ONE definition, asserted by
 *     `test/ask-auth-inflow.test.ts`.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The maximum number of **simultaneously open** `askuser` / `auth` cards.
 *
 * Derived from the R1 field observation (`chat-state.ts` v3 comment, verbatim):
 * the worst case ever observed is **one reference-round local ask + one background
 * ask**. It is an observed ceiling, not an invented number (ADR-V4-032 §1).
 */
export const MAX_OPEN_ASKS = 2;

/**
 * The request-id prefix the panel's own **reference rounds** use. A reference
 * round is answered locally (`submitAsk` → `applyRefAction`), so it must be
 * distinguishable from a background question — that distinction is the basis of
 * both `supersededAsk` (R1) and the v4-3 arbitration priority.
 */
export const REF_ROUND_PREFIX = 'ref-round-';

/** Why an un-answered ask card reached its `cancelled` terminal (ADR-V4-031). */
export type AskCancelReason = 'user' | 'timeout' | 'superseded' | 'aborted';

/** The closed cancel-reason list (a missing reason is a contract break). */
export const ASK_CANCEL_REASONS: readonly AskCancelReason[] = Object.freeze(['user', 'timeout', 'superseded', 'aborted']);

/**
 * The kinds that are **born frozen**: a single-line row by kind (ADR-V4-027
 * decision 5: `system`/`notice` have no terminal state) or an append-only
 * historical row (`ai`/`user`/`command`/`error`/`ref`/`nextstep`). Only `tool`,
 * `thinking`, `askuser` and `auth` have a real "in progress → settled" migration,
 * and those are exactly the kinds the renderer may patch.
 */
const BORN_FROZEN_KINDS: ReadonlySet<StreamEventKind> = new Set<StreamEventKind>([
  'ai',
  'user',
  'nextstep',
  'system',
  'ref',
  'command',
  'error',
  'notice',
]);


/** The single taxonomy registry (kind → layer). `CARD_TYPES` coverage is asserted. */
export const CARD_KIND_LAYER: Readonly<Record<StreamEventKind, CardLayer>> = Object.freeze({
  ai: 'primary',
  user: 'primary',
  nextstep: 'primary',
  askuser: 'primary',
  auth: 'primary',
  system: 'primary',
  ref: 'primary',
  tool: 'process',
  command: 'process',
  thinking: 'process',
  error: 'process',
  notice: 'process',
});

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Event / state shapes
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The event payload. It is intentionally a **flat, closed** record: the digest
 * whitelist (ADR-V4-028) can only ever be a subset of these fields, and there is
 * no "free body" field other than `text` (which is *never* persisted).
 *
 * `text` is the only unbounded body; `label` is the short, caller-constructed
 * description persisted in the digest (it must already be plaintext-free — see
 * `stream-digest.ts`).
 */
export interface StreamPayload {
  /** The body (AI reply / user message / command line / error text …). NOT persisted. */
  readonly text?: string;
  /** Tool name (tool card header). */
  readonly tool?: string;
  /** Tool success flag (`true` / `false`; absent = still unknown). */
  readonly ok?: boolean;
  /** Duration in ms (tool / thinking). */
  readonly ms?: number;
  /**
   * ask-user / auth card shape. V5-2 TASK-V5-134 (ADR-V5-002 §2): `secret` (the masked
   * credential card) and `form` (the multi-select permission card) are **enum values of
   * an existing kind** — `askuser` — never new card types (NG-ALLN-001 / `CARD_TYPES`).
   */
  readonly askKind?: 'choice' | 'confirm' | 'text' | 'secret' | 'form';
  /** ask-user / auth prompt (body of the card). */
  readonly prompt?: string;
  /** choice options (≤3 renderable + the terminal「其他…」). */
  readonly options?: readonly string[];
  /** ask / confirm request id (business key, not a secret). */
  readonly requestId?: string;
  /**
   * V5-2 (ADR-V5-002 §2 / FR-ALLN-020~023, 法八入口侧) — the three additive fields of
   * the masked / multi-select forms. All optional: absent ⇒ rendering is byte-identical
   * to before (rollback = simply not passing them).
   *
   * `maskedLength` is the **length CATEGORY** (`8+` / `8-`) — review R1 I-04: the raw
   * length is not even persisted (ADR-V5-010 §2 缩窄侧信道); the number stays inside the
   * submit handler that measured it.
   */
  readonly secretLabel?: string;
  readonly formOptions?: readonly { readonly id: string; readonly label: string; readonly scope: string }[];
  /**
   * V5-2 review R1 **I-04** (ADR-V5-010 §2 缩窄侧信道) — the masked **length category**
   * of a written secret: `8+` (8 characters or more) / `8-` (fewer). The raw length never
   * leaves the submit handler, so neither the stream payload nor the persisted state
   * carries the exact size.
   */
  readonly maskedLength?: MaskedLengthCategory;
  /** The frozen answer text (ask card固化区). */
  readonly answer?: string;
  /** v4-3: why an ask card reached `cancelled` (absent for answered/approved/rejected). */
  readonly cancelReason?: AskCancelReason;
  /** Reference business number (`ref_<n>` → ①②③…). */
  readonly refNum?: number;
  /** Reference state (v4-4 owns the judgement; v4-2 renders the projection). */
  readonly refState?: 'valid' | 'stale';
  /** Short reference description (selector / label digest, already sanitised). */
  readonly refLabel?: string;
  /** V4-4 (ADR-V4-035): the stale reason (the judge's readable reason, frozen). */
  readonly refWhy?: string;
  /**
   * V4-4 (ADR-V4-035): the read-only evidence layer rows（选择器 / 语义路径 / 文本摘要 /
   * 捕获时间）. Each row is a constructed `label + value` string; the layer is a
   * `<details>` so its content never counts against the visible density budget.
   */
  readonly refEvidence?: readonly string[];
  /**
   * V5-3 TASK-V5-156/157 (ADR-V5-002 §3 · FR-ALLN-012) — the **born recovery face** of a
   * blocked `error` card: the next chips the card is minted WITH (同一 `createErrorCard`
   * 调用内完成, never a later patch — `error ∈ BORN_FROZEN_KINDS` stays untouched).
   *
   * Optional and additive: absent ⇒ rendering is byte-identical to before (rollback =
   * simply not passing it). Each entry's `opId` is an already-registered op, so the
   * rendered `[data-op]` really dispatches (no dead end).
   */
  readonly recovery?: readonly { readonly text: string; readonly opId: string }[];
  /** nextstep chips (each chip = a command). */
  readonly chips?: readonly string[];
  /**
   * V4-4 (ADR-V4-037 §5): the aligned action id of each chip (`next` = issue a turn
   * through the composer's own entry; `repick` / `describe` = the local recovery
   * acts). Kept parallel to {@link chips} so a chip's intent is data, not a guess.
   */
  readonly nextstepActs?: readonly string[];
  /** V4-4: the recommendation rule id that produced the card (`risk-recovery` … ). */
  readonly nextstepRule?: string;
  /** Short, already-sanitised label persisted to the digest (never the body). */
  readonly label?: string;
  /**
   * V4.5-1 W2 (TASK-V45-105) — the closed `SystemEventKind` of a `system` row.
   *
   * Typed as `string` (not `SystemEventKind`) on purpose: `stream-model` must not import
   * `system-events` back (the channel imports the model). The renderer copies it onto the
   * row as `data-kind`, which is what makes the ADR-V45-001 selector
   * `#stream [data-msg-type="system"][data-kind="notice"]` resolvable. The closed set is
   * asserted where it is produced (`chat-state.ts#systemRow` ← `SystemEventKind`).
   */
  readonly systemKind?: string;
  /**
   * V4.5-1 W2 (TASK-V45-105) — the long copy of a system row, carried as the row's
   * `title`. Goes through `plaintextTitle()` at the single write path (`systemRow`), so it
   * is sanitised exactly once (never at the render site).
   */
  readonly systemTitle?: string;
}

/** One immutable stream event. */
export interface StreamEvent {
  /** Monotonic, never reused, **not reset** on a session switch. */
  readonly seq: number;
  /** epoch ms — the ONLY timestamp source (rendering must never call `Date.now()`). */
  readonly ts: number;
  readonly kind: StreamEventKind;
  /** Card identity: every event of one "round-trip" shares this ⇒ the same card. */
  readonly cardId: string;
  /** The session segment this event belongs to. */
  readonly sessionId: string;
  readonly payload: StreamPayload;
  /**
   * V5.5F-2 **TASK-V55F-211** (ADR-SGO-004 §2/§7 · FR-SGO-050 · N-SGO-026 · R-SGO-914) —
   * the batch plan's **render-only** rows, a sibling of (and **never inside**) `payload`.
   *
   * 计划正文/译文只经此字段以 `textContent` 渲染（逐行已掩码）：绝不进 `payload` 值 /
   * `digest` 值 / 审计值 / DOM 属性。缺省 ⇒ 字段缺席 ⇒ 渲染与既有**逐字节相同**。
   * **不持久化**（不在 `DIGEST_FIELDS`）⇒ 重载后只是少一次展示，不是事实丢失。
   */
  readonly plan?: readonly string[];
  /** Terminal-fact marker: an event carrying this IS the card's terminal event. */
  readonly terminal?: StreamTerminal;
}

/** The reducer's stream slice (immutable). */
export interface StreamState {
  readonly events: readonly StreamEvent[];
  /** The next free `seq` (strictly increasing; never reset). */
  readonly seq: number;
  /** The ACTIVE session segment (projection filter + bound protection). */
  readonly sessionId: string;
  /** Card ids of ask/user cards that have not reached a terminal state (v4-3 consumes). */
  readonly openAsks: readonly string[];
  /** How many events the bound dropped (readable in the status bar — never silent). */
  readonly dropped: number;
  /**
   * How many `stream-merge` candidates were **rejected** because they were not
   * strictly newer than the log's current maximum `seq` (or duplicated an existing
   * `cardId`). F-02, v4-2 closeout round (validate R1): the degraded rebuild may
   * only ever append forward; a skipped candidate is counted here (never silent and
   * never renumbered — see `chat-state.ts#stream-merge`).
   */
  readonly mergeSkipped: number;
}

/** `boundStreamEvents` default cap (parent ADR-V4-003 decision 3). */
export const DEFAULT_STREAM_CAP = 2000;

/** What a caller supplies to {@link appendEvent}; `seq`/`sessionId` come from state. */
export interface StreamEventInput {
  readonly kind: StreamEventKind;
  readonly ts: number;
  readonly cardId?: string;
  readonly payload?: StreamPayload;
  /** V5.5F-2 TASK-V55F-211: 计划卡渲染行（与 `payload` 同级；缺省 ⇒ 字段缺席）。 */
  readonly plan?: readonly string[];
  readonly terminal?: StreamTerminal;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. Construction / append
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * **Deep** freeze (copy-on-freeze): recursively copies and freezes plain arrays and
 * objects, so no nested value of a payload stays reachable-and-writable.
 *
 * F-01 (v4-2 closeout, validate R1): `Object.freeze` is shallow, so
 * `payload.options` / `payload.chips` were writable through the event reference, the
 * `CardView` projection **and** the caller's original array. Two properties matter
 * here and both come from the *copy*: ① the frozen structure is the model's own, so
 * freezing it never mutates a caller-owned object as a side effect; ② the caller's
 * array is no longer aliased, so a later `push`/`splice` on it cannot reach the log.
 *
 * Only plain data travels in a payload (strings / numbers / booleans / readonly
 * arrays): primitives pass through, arrays are re-created element-wise, and plain
 * objects are re-created own-key-wise. `Date` / class instances / cycles are not part
 * of the payload contract and are copied as plain own-key objects (never mutated).
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => deepFreeze(item))) as unknown as T;
  }
  const source = value as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(source)) copy[key] = deepFreeze(source[key]);
  return Object.freeze(copy) as T;
}

/** Create the initial stream slice. **Call once** per panel (never on a switch). */
export function createStreamState(sessionId = ''): StreamState {
  return Object.freeze({
    events: Object.freeze([] as StreamEvent[]),
    seq: 1,
    sessionId,
    openAsks: Object.freeze([] as string[]),
    dropped: 0,
    mergeSkipped: 0,
  });
}

/** Kinds whose open state is tracked in `openAsks` (the v4-3 business surface). */
const ASK_KINDS: ReadonlySet<StreamEventKind> = new Set<StreamEventKind>(['askuser', 'auth']);

/**
 * Append one event. `seq` is taken from the state and never reused; the returned
 * state is a new object and the event itself is frozen.
 *
 * `cardId` defaults to `c<seq>` (a fresh card per event) — callers that want the
 * "two events, one card" shape (thinking / tool / ask) pass an existing cardId.
 */
export function appendEvent(state: StreamState, input: StreamEventInput): StreamState {
  const seq = state.seq;
  const cardId = input.cardId ?? `c${seq}`;
  const event: StreamEvent = Object.freeze({
    seq,
    ts: input.ts,
    kind: input.kind,
    cardId,
    sessionId: state.sessionId,
    // F-01: DEEP freeze (copy) — a nested `options`/`chips` array must not stay
    // writable through the event, and must not alias the caller's array.
    payload: deepFreeze({ ...(input.payload ?? {}) }),
    // V5.5F-2：计划行**深冻结拷贝**（与 payload 同等纪律：调用方数组不被别名 / 不改写）。
    ...(input.plan ? { plan: deepFreeze([...input.plan]) } : {}),
    ...(input.terminal !== undefined ? { terminal: input.terminal } : {}),
  });
  const openAsks = nextOpenAsks(state.openAsks, event);
  return Object.freeze({
    ...state,
    events: Object.freeze([...state.events, event]),
    seq: seq + 1,
    openAsks,
  });
}

/** Maintain the unresolved-ask list without mutating the previous one. */
function nextOpenAsks(prev: readonly string[], event: StreamEvent): readonly string[] {
  if (!ASK_KINDS.has(event.kind)) return prev;
  if (event.terminal !== undefined) return Object.freeze(prev.filter((id) => id !== event.cardId));
  if (prev.includes(event.cardId)) return prev;
  return Object.freeze([...prev, event.cardId]);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3b. v4-3 — open-ask arbitration (MAX_OPEN_ASKS + reference-round priority)
 * ──────────────────────────────────────────────────────────────────────────── */

/** One open decision card, with the business key needed for arbitration. */
export interface OpenAskEntry {
  readonly cardId: string;
  readonly kind: 'askuser' | 'auth';
  readonly requestId?: string;
}

/**
 * The open `askuser` / `auth` cards in arrival order, with their `requestId`
 * (the business key the reference-round priority reads). Derived from the event
 * log — never a second source of truth.
 */
export function openAskEntries(state: StreamState): readonly OpenAskEntry[] {
  const opened = new Map<string, { kind: 'askuser' | 'auth'; requestId?: string }>();
  const closed = new Set<string>();
  for (const e of state.events) {
    if (e.kind !== 'askuser' && e.kind !== 'auth') continue;
    if (e.terminal !== undefined) {
      closed.add(e.cardId);
      opened.delete(e.cardId);
      continue;
    }
    if (!opened.has(e.cardId)) {
      opened.set(e.cardId, {
        kind: e.kind,
        ...(e.payload.requestId !== undefined ? { requestId: e.payload.requestId } : {}),
      });
    }
  }
  return Object.freeze(
    [...opened.entries()]
      .filter(([cardId]) => !closed.has(cardId))
      .map(([cardId, meta]) => Object.freeze({ cardId, kind: meta.kind, ...(meta.requestId !== undefined ? { requestId: meta.requestId } : {}) })),
  );
}

/** Is `requestId` a panel-owned reference round? */
export function isRefRound(requestId: string | undefined): boolean {
  return (requestId ?? '').startsWith(REF_ROUND_PREFIX);
}

/**
 * Which open cards must be superseded so that the arrival of a card with
 * `incomingRequestId` keeps `openAsks.length ≤ MAX_OPEN_ASKS`.
 *
 * Rules (ADR-V4-032 §2~§3), in order:
 *   ① a **reference round** arrival supersedes every **background** ask first
 *      (the reference round is the user's own action; a background question may
 *      be replaced by it — the R1 semantics, kept);
 *   ② while `open − picked ≥ MAX_OPEN_ASKS`, supersede the **oldest** remaining
 *      card (never silent: the caller appends a `cancelled` terminal + a system row).
 *
 * Pure: the returned list is an order-preserving subset of {@link openAskEntries}.
 */
export function arbitrateOpenAsks(state: StreamState, incomingRequestId: string | undefined): readonly OpenAskEntry[] {
  const open = openAskEntries(state);
  if (open.length < MAX_OPEN_ASKS) return Object.freeze([]);
  const picked: OpenAskEntry[] = [];
  const isPicked = (cardId: string) => picked.some((p) => p.cardId === cardId);
  if (isRefRound(incomingRequestId)) {
    for (const entry of open) {
      if (!isRefRound(entry.requestId)) picked.push(entry);
    }
  }
  const remaining = open.filter((entry) => !isPicked(entry.cardId));
  let i = 0;
  while (remaining.length - i >= MAX_OPEN_ASKS) {
    picked.push(remaining[i]);
    i += 1;
  }
  return Object.freeze(picked);
}

/**
 * The single **arbitration point** for an open `askuser` / `auth` card.
 *
 * Exactly one of these may be appended per new card (TASK-701 acceptance): the
 * function ① supersedes whatever {@link arbitrateOpenAsks} says must go (a
 * `cancelled` terminal with `cancelReason: 'superseded'` on the SAME card — the
 * card is never removed, so 「解析即消失」 cannot come back), then ② appends the new
 * open card. `openAsks.length ≤ MAX_OPEN_ASKS` holds on the returned state.
 *
 * The caller owns the readable system row (copy template single source); this
 * function returns the superseded entries so the caller can write it **once**.
 */
export function appendAskEvent(
  state: StreamState,
  input: { readonly kind: 'askuser' | 'auth'; readonly ts: number; readonly cardId?: string; readonly payload?: StreamPayload; readonly plan?: readonly string[] },
): { readonly state: StreamState; readonly superseded: readonly OpenAskEntry[] } {
  const superseded = arbitrateOpenAsks(state, input.payload?.requestId);
  let next = state;
  for (const entry of superseded) {
    next = appendEvent(next, {
      kind: entry.kind,
      ts: input.ts,
      cardId: entry.cardId,
      payload: { cancelReason: 'superseded' },
      terminal: 'cancelled',
    });
  }
  next = appendEvent(next, {
    kind: input.kind,
    ts: input.ts,
    ...(input.cardId !== undefined ? { cardId: input.cardId } : {}),
    payload: input.payload ?? {},
    ...(input.plan ? { plan: input.plan } : {}),
  });
  return Object.freeze({ state: next, superseded });
}

/**
 * Terminalise still-open decision cards (the turn-ended / session-switched
 * projection). `askuser` cards land on `cancelled` with the given reason; `auth`
 * cards are closed too (a pending authorization that outlived its turn is a
 * cancel, never a silent approve). Returns the affected card ids.
 *
 * ── BLOCK-02 (v4-3 review): the `filter` seam ────────────────────────────────
 *
 * A turn ending must **not** carry expiry semantics for a card the panel owns
 * (`ref-round-*`): that card has no ask-bridge and no 60 s timer, so closing it as
 * `timeout` would write「提问超时未答」for a timeout that never happened (and would
 * freeze the pick → choose link). The caller therefore passes a predicate; the
 * default (no predicate) keeps the session-switch behaviour — settle everything.
 */
export function closeOpenAsks(
  state: StreamState,
  at: number,
  reason: AskCancelReason,
  filter?: (entry: OpenAskEntry) => boolean,
): { readonly state: StreamState; readonly closed: readonly string[] } {
  const open = openAskEntries(state).filter((entry) => (filter ? filter(entry) : true));
  let next = state;
  const closed: string[] = [];
  for (const entry of open) {
    closed.push(entry.cardId);
    next = appendEvent(next, {
      kind: entry.kind,
      ts: at,
      cardId: entry.cardId,
      payload: { cancelReason: reason },
      terminal: 'cancelled',
    });
  }
  return Object.freeze({ state: next, closed: Object.freeze(closed) });
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. Bound (truncation) — the ONLY event-deletion path
 * ──────────────────────────────────────────────────────────────────────────── */

/** Kinds the bound may drop: the light, already-terminal single-line rows. */
const EVICTABLE_KINDS: ReadonlySet<StreamEventKind> = new Set<StreamEventKind>(['system', 'notice']);

/**
 * Bound the event log (parent ADR-V4-003 decision 3 / ADR-V4-028 decision 4).
 *
 * Only the **oldest terminal `system` / `notice` rows of a NON-active session**
 * are dropped. The four protected classes are never touched:
 *   ① `askuser` / `auth` terminal cards, ② `tool` cards (with `ok`/`ms`),
 *   ③ `ref` cards, ④ the **current session segment** (any kind).
 *
 * `dropped` counts what was removed — the status bar must show it (never silent).
 */
export function boundStreamEvents(state: StreamState, cap = DEFAULT_STREAM_CAP): StreamState {
  if (state.events.length <= cap) return state;
  const kept: StreamEvent[] = [...state.events];
  let dropped = state.dropped;
  // Walk from the front: the oldest evictable row is always the first candidate.
  let i = 0;
  while (kept.length > cap && i < kept.length) {
    const ev = kept[i];
    const evictable = EVICTABLE_KINDS.has(ev.kind) && ev.sessionId !== state.sessionId;
    if (evictable) {
      kept.splice(i, 1);
      dropped += 1;
      continue;
    }
    i += 1;
  }
  if (kept.length === state.events.length) return state;
  return Object.freeze({ ...state, events: Object.freeze(kept), dropped });
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. Session switch (seq NOT reset, events NOT cleared)
 * ──────────────────────────────────────────────────────────────────────────── */

/** A session separator is a `system` row: single line, born terminal. */
export function sessionSeparatorLabel(label: string): string {
  return `会话已切换：${label}`;
}

/**
 * Switch the active segment **only** (no row is appended).
 *
 * I-02 (v4-4 review): the product's session switch composes this with the single
 * system channel (`chat-state.ts#openSessionWithRow`), so the separator row goes
 * through `appendSystem` (de-dupe window / rate cap / `dropped` accounting). The
 * legacy {@link switchStreamSession} keeps the old「switch + append a raw separator」
 * shape for the pure-model unit tests only; the wiring gate forbids the product from
 * calling it (a second construction point would be a bypass).
 *
 * The event log is **kept** (FR-CHAT-024: the old segment's `tool`/`ok`/`ms` survive),
 * `seq` is **not reset**, and switching back is a pure re-activation.
 */
export function openSessionSegment(state: StreamState, sessionId: string): StreamState {
  if (!sessionId || sessionId === state.sessionId) return state;
  return Object.freeze({ ...state, sessionId });
}

/**
 * Legacy model API (pure unit tests): switch + append a raw separator row.
 *
 * ⚠️ The PRODUCT must not call this — `chat-state.ts` uses {@link openSessionSegment}
 * plus the single system channel so the separator cannot bypass the channel's
 * de-duplication / rate-cap / `dropped` accounting (I-02, v4-4 review).
 */
export function switchStreamSession(state: StreamState, sessionId: string, label: string): StreamState {
  if (!sessionId || sessionId === state.sessionId) return state;
  const hadSegment = state.events.length > 0;
  const next = Object.freeze({ ...state, sessionId });
  if (!hadSegment) return next;
  // The separator is the first row of the new segment: insert it with the new
  // sessionId by switching first, then appending.
  return appendEvent(next, {
    kind: 'system',
    ts: lastTs(state),
    payload: { text: sessionSeparatorLabel(label), label: sessionSeparatorLabel(label) },
  });
}

/** Does the log already hold events for `sessionId`? (duplicate-history guard) */
export function hasSegment(state: StreamState, sessionId: string): boolean {
  return state.events.some((e) => e.sessionId === sessionId);
}

/** The most recent `ts` (used for rows with no clock of their own, e.g. separators). */
export function lastTs(state: StreamState): number {
  const last = state.events[state.events.length - 1];
  return last ? last.ts : 0;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 6. Pure projection
 * ──────────────────────────────────────────────────────────────────────────── */

/** A projected card — the renderer's only input. */
/**
 * V5-2 review R1 **I-04** (ADR-V5-010 §2 缩窄侧信道) — the masked **length category** of a
 * written secret: `8+` (8 characters or more) / `8-` (fewer). The raw length never leaves
 * the submit handler, so neither the stream payload nor the persisted state carries it.
 */
export type MaskedLengthCategory = '8+' | '8-';

export interface CardView {
  readonly cardId: string;
  readonly kind: StreamEventKind;
  readonly layer: CardLayer;
  readonly sessionId: string;
  readonly firstSeq: number;
  readonly lastSeq: number;
  /** The first event's `ts` (the card's clock). */
  readonly ts: number;
  /** The terminal event's `ts` (absent while open). */
  readonly terminalTs?: number;
  readonly terminal?: StreamTerminal;
  readonly terminalSeq?: number;
  /** The folded payload (events after the terminal one are NOT folded). */
  readonly payload: StreamPayload;
  /**
   * V5.5F-2 TASK-V55F-211 (ADR-SGO-004 §7): the plan's **render-only** rows — a sibling
   * of `payload`, **never** inside it (R-SGO-914). Absent ⇒ rendering is byte-identical.
   */
  readonly plan?: readonly string[];
  /** `true` iff `terminal !== undefined` — the DOM of such a card is frozen. */
  readonly frozen: boolean;
}

export interface ProjectDeps {
  /** Project this segment instead of the state's active one (digest / reopen). */
  readonly sessionId?: string;
  /** Project every segment (digest of a non-active session). */
  readonly includeAllSessions?: boolean;
}

/**
 * `project()` — deterministic, side-effect free, DOM-free, clock-free.
 *
 * Determinism contract (TASK-601/608): the same `StreamEvent[]` always yields the
 * same `CardView[]` (replay equivalence), and the fold stops at each card's first
 * terminal event, so a later event can neither change the terminal nor leak into
 * the payload.
 */
export function project(state: StreamState, deps: ProjectDeps = {}): CardView[] {
  const active = deps.sessionId ?? state.sessionId;
  const includeAll = deps.includeAllSessions === true;

  interface Acc {
    cardId: string;
    kind: StreamEventKind;
    sessionId: string;
    firstSeq: number;
    lastSeq: number;
    ts: number;
    terminal?: StreamTerminal;
    terminalSeq?: number;
    terminalTs?: number;
    payload: StreamPayload;
    plan?: readonly string[];
  }

  const order: string[] = [];
  const byCard = new Map<string, Acc>();

  for (const e of state.events) {
    if (!includeAll && e.sessionId !== active) continue;
    const existing = byCard.get(e.cardId);
    if (!existing) {
      const acc: Acc = {
        cardId: e.cardId,
        kind: e.kind,
        sessionId: e.sessionId,
        firstSeq: e.seq,
        lastSeq: e.seq,
        ts: e.ts,
        payload: { ...e.payload },
        ...(e.plan ? { plan: [...e.plan] } : {}),
        ...(e.terminal !== undefined ? { terminal: e.terminal, terminalSeq: e.seq, terminalTs: e.ts } : {}),
      };
      byCard.set(e.cardId, acc);
      order.push(e.cardId);
      continue;
    }
    // Terminal freeze: once a terminal event was folded in — or the card is a
    // single-line row by kind — nothing after it may touch this card.
    if (existing.terminal !== undefined || BORN_FROZEN_KINDS.has(existing.kind)) continue;
    existing.lastSeq = e.seq;
    existing.payload = { ...existing.payload, ...e.payload };
    if (e.plan && existing.plan === undefined) existing.plan = [...e.plan];
    if (e.terminal !== undefined) {
      existing.terminal = e.terminal;
      existing.terminalSeq = e.seq;
      existing.terminalTs = e.ts;
    }
  }

  return order.map((cardId) => {
    const acc = byCard.get(cardId)!;
    const frozen = acc.terminal !== undefined || BORN_FROZEN_KINDS.has(acc.kind);
    return Object.freeze({
      cardId: acc.cardId,
      kind: acc.kind,
      layer: CARD_KIND_LAYER[acc.kind],
      sessionId: acc.sessionId,
      firstSeq: acc.firstSeq,
      lastSeq: acc.lastSeq,
      ts: acc.ts,
      // F-01: the projection hands out its OWN deep-frozen copy — writing through a
      // `CardView` (e.g. `view.payload.options[0] = …`) must throw, and the card must
      // not share a nested array with the events it was folded from.
      payload: deepFreeze({ ...acc.payload }),
      frozen,
      ...(acc.plan ? { plan: deepFreeze([...acc.plan]) } : {}),
      ...(acc.terminal !== undefined ? { terminal: acc.terminal, terminalSeq: acc.terminalSeq, terminalTs: acc.terminalTs } : {}),
    }) as CardView;
  });
}

/** The set of cardIds that still exist in the log (the renderer's destroy guard). */
export function liveCardIds(state: StreamState): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const e of state.events) ids.add(e.cardId);
  return ids;
}

/** The most recent cardId of `kind` without a terminal event (`undefined` if none). */
export function lastOpenCardId(state: StreamState, kind: StreamEventKind): string | undefined {
  for (let i = state.events.length - 1; i >= 0; i -= 1) {
    const e = state.events[i];
    if (e.kind !== kind) continue;
    const hasTerminal = state.events.some((x) => x.cardId === e.cardId && x.terminal !== undefined);
    if (!hasTerminal) return e.cardId;
  }
  return undefined;
}

/** `HH:MM:SS` — the single clock format used by every `.ts` (ADR-V4-026). */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
