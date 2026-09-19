/**
 * V4-4 TASK-802 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the **single system
 * event channel** (本叶 ADR-V4-036 / FR-CHAT-053 / FR-CHAT-054 / NFR-CHAT-011 /
 * NFR-CHAT-012 / shim E1).
 *
 * ── Why a single channel ─────────────────────────────────────────────────────
 *
 * Before v4-4 the panel carried **6+ transient channels** (`#env-guard` /
 * `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` / `#send-reason`)
 * plus navigation-invalidation and probe-phase pushes. `#notice` was an
 * *overwrite* slot: the fact had no timestamp, no order, and the next render could
 * replace it. shim E1 requires ≥3 distinguishable rows carrying `HH:MM:SS`.
 *
 * v4-4 replaces all of that with **one append-only channel**:
 *
 *   `appendSystem(kind, text, ts)`
 *     ① **净化** — {@link assertStreamPlaintext} (the v4-2/v4-3 caliber: URL query /
 *        secret / command-argument body / raw markup all THROW at build time);
 *     ② **去重窗口** — `dedupeKey = kind + ':' + normalizedText`; the same key is
 *        not appended again inside {@link SYSTEM_DEDUPE_WINDOW_MS}; when it returns
 *        *after* the window the row is appended again with the「持续：」prefix
 *        (the fact is never lost, it is only *not repeated* inside the window);
 *     ③ **速率上限** — at most {@link SYSTEM_ROWS_PER_MINUTE_CAP} rows per rolling
 *        minute; the overflow increments `dropped` and appends **nothing**
 *        (丢弃不静默: `dropped` is readable in the status bar);
 *     ④ **追加** — the caller appends a `system` stream event; it is `BORN_FROZEN`
 *        in the model, so no later render / notice can overwrite it.
 *
 * ── Purity ───────────────────────────────────────────────────────────────────
 *
 * Pure data: no DOM, no clock, no IO. The timestamp is always injected by the
 * caller (the reducer's `at`), which is what keeps `project()` replay-equivalent.
 * The channel state is a small immutable record carried on `SidepanelState` — the
 * dedupe / rate accounting is part of the deterministic fold, not a module global
 * (a global would make two panels in one test process share a window).
 *
 * @module ui/sidepanel/system-events
 */
import { assertStreamPlaintext } from './stream-plaintext.js';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Constants (the rule table — exported so the gate can recompute them)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Repeating the same `kind:text` inside this window does not append a new row. */
export const SYSTEM_DEDUPE_WINDOW_MS = 5000;

/** At most this many rows per rolling minute; the overflow is counted, not appended. */
export const SYSTEM_ROWS_PER_MINUTE_CAP = 20;

/** The rolling window the rate cap is measured over. */
export const SYSTEM_RATE_WINDOW_MS = 60_000;

/**
 * The prefix applied to a row whose dedupe key returns **after** its window — the
 * same fact really is still true, so the row is appended with 「持续：」 rather than
 * being silently dropped.
 */
export const SYSTEM_CONTINUED_PREFIX = '持续：';

/**
 * The closed source vocabulary. Every system row names its origin, which is what
 * makes the merge matrix (`ADR-V4-036 §5`) machine-checkable instead of a comment.
 */
export const SYSTEM_EVENT_KINDS = Object.freeze([
  'env',
  'site',
  'firstRun',
  'notice',
  'send',
  'nav',
  'probe',
  'session',
  'decision',
  'ref',
  'turn',
] as const);
export type SystemEventKind = (typeof SYSTEM_EVENT_KINDS)[number];

/* ────────────────────────────────────────────────────────────────────────────
 * 2. State + pure transition
 * ──────────────────────────────────────────────────────────────────────────── */

interface DedupeEntry {
  readonly key: string;
  readonly ts: number;
}

export interface SystemChannelState {
  /** Last append of each dedupe key, `ts` descending-pruned to the dedupe window. */
  readonly recent: readonly DedupeEntry[];
  /** Timestamps of appended rows inside the rolling rate window. */
  readonly window: readonly number[];
  /** Rows rejected by the rate cap (never silent — read by the status bar). */
  readonly dropped: number;
  /** Rows actually appended (diagnostics). */
  readonly total: number;
}

export function createSystemChannelState(): SystemChannelState {
  return Object.freeze({ recent: Object.freeze([]), window: Object.freeze([]), dropped: 0, total: 0 });
}

export interface SystemAppendResult {
  /**
   * The text to append, or `null` when the row was **not** appended (dedupe window
   * or rate cap). `rateLimited` distinguishes the two.
   */
  readonly text: string | null;
  /** `true` when the text is a return of a previously seen key (「持续」row). */
  readonly continued: boolean;
  /** `true` when {@link SYSTEM_ROWS_PER_MINUTE_CAP} rejected the row. */
  readonly rateLimited: boolean;
  /** The next channel state (immutable). */
  readonly channel: SystemChannelState;
}

/** The dedupe key: kind + normalized text (whitespace-collapsed). */
export function systemDedupeKey(kind: SystemEventKind, text: string): string {
  return `${kind}:${text.replace(/\s+/g, ' ').trim()}`;
}

function pruneRecent(recent: readonly DedupeEntry[], at: number): DedupeEntry[] {
  return recent.filter((e) => at - e.ts <= SYSTEM_DEDUPE_WINDOW_MS);
}

function pruneWindow(window: readonly number[], at: number): number[] {
  return window.filter((ts) => at - ts < SYSTEM_RATE_WINDOW_MS);
}

/**
 * The one channel. Steps ①~④ of the module doc, in order.
 *
 * A row is appended iff it (a) passes the plaintext scan, (b) is not a repeat of a
 * key seen within the dedupe window, and (c) does not exceed the rate cap.
 */
export function appendSystem(
  channel: SystemChannelState,
  kind: SystemEventKind,
  text: string,
  at: number,
): SystemAppendResult {
  // ① 净化 — fail-closed; a leak throws at build time (never a silent strip).
  assertStreamPlaintext(text);
  const key = systemDedupeKey(kind, text);
  const recent = pruneRecent(channel.recent, at);
  const window = pruneWindow(channel.window, at);

  // ③ 速率上限 — checked BEFORE the dedupe so a storm of *distinct* rows is still
  //    bounded (the dedupe would not catch it).
  if (window.length >= SYSTEM_ROWS_PER_MINUTE_CAP) {
    return Object.freeze({
      text: null,
      continued: false,
      rateLimited: true,
      channel: Object.freeze({ ...channel, recent: Object.freeze(recent), window: Object.freeze(window), dropped: channel.dropped + 1 }),
    });
  }

  // ② 去重窗口 — a repeat inside the window is not appended (it is not a new fact).
  const seen = recent.find((e) => e.key === key);
  if (seen) {
    return Object.freeze({
      text: null,
      continued: false,
      rateLimited: false,
      channel: Object.freeze({ ...channel, recent: Object.freeze(recent), window: Object.freeze(window) }),
    });
  }

  // ④ 追加 — record the key + the row for the rate accounting.
  const hadOlder = channel.recent.some((e) => e.key === key);
  const nextRecent = Object.freeze([...recent, Object.freeze({ key, ts: at })]);
  const nextWindow = Object.freeze([...window, at]);
  return Object.freeze({
    text,
    continued: hadOlder,
    rateLimited: false,
    channel: Object.freeze({
      recent: nextRecent,
      window: nextWindow,
      dropped: channel.dropped,
      total: channel.total + 1,
    }),
  });
}

/** The readable「持续：」body for a continued row. */
export function continuedSystemText(text: string): string {
  return `${SYSTEM_CONTINUED_PREFIX}${text}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. The single copy vocabulary (TASK-803 merge matrix)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Every merged channel's readable copy, in ONE table (ADR-V4-036 §5 / §6). The old
 * strip elements each had their own inline string; v4-4 makes the vocabulary a
 * closed constant so ① no source can smuggle a body through and ② the merge matrix
 * can be asserted rather than described.
 */
export const SYSTEM_COPY = Object.freeze({
  /** Navigation invalidation — the false→true jump (`chat-state.ts`). */
  navInvalidated: '页面已导航：会话上下文失效，请重新授权/重连（不静默续接）',
  /** Probe phase change — the steady-state variant never repeats (R2 semantics kept). */
  probePhase: '站点探测状态变化：已按相位变化登记（稳态不重复）',
  /** Session switch separator (mirrors `stream-model.ts#sessionSeparatorLabel`). */
  sessionSwitched: '会话已切换',
  /** A system row was suppressed by the rate cap (never silent — status bar reads the count). */
  dropped: '部分系统事件被速率上限丢弃（计数见状态栏）',
} as const);

/**
 * The reference failure row (shim E2). `why` is the judge's readable reason — a
 * constructed constant from `l1/ref-validity.ts`, never a page body.
 */
export function refStaleText(refNum: number, why: string): string {
  const text = `引用 ${refNum} 已失效：${why}`;
  assertStreamPlaintext(text);
  return text;
}

/** The reference re-anchor row (shim E5 / H3): a NEW ordinal, the old one kept. */
export function refReanchoredText(from: number, to: number): string {
  const text = `引用 ${from} 已重锚为引用 ${to}（旧引用保留）`;
  assertStreamPlaintext(text);
  return text;
}

/** Assert the whole merge vocabulary is plaintext-free (fail-closed guard). */
export function assertSystemCopySafe(): void {
  for (const text of Object.values(SYSTEM_COPY)) assertStreamPlaintext(text);
}

// Run at import time on the production graph (same discipline as v4-3's
// `stream-plaintext.ts`): a pasted URL / markup in the copy fails at panel load.
assertSystemCopySafe();

