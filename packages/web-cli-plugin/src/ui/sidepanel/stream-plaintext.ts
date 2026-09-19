/**
 * V4-3 TASK-704 (leaf `specs-tree-v4-3-ask-auth-inflow`) — the **stream-side
 * zero-plaintext boundary** (父 ADR-V4-028 / 本叶 ADR-V4-034 / FR-CHAT-049 /
 * AC-CHAT-021 / NFR-CHAT-005 / NFR-CHAT-012).
 *
 * ── Why this module exists ───────────────────────────────────────────────────
 *
 * Once an ask/authorization decision is a *stream card*, its固化 copy, its
 * consequence preview and its system rows all live in the same DOM as the rest of
 * the conversation. That is exactly the surface where a command argument body, a
 * URL query string or a page text fragment could leak into a persisted digest.
 * The v3-2/v4-2 discipline is **reused, never re-implemented**:
 *
 *   · {@link assertStreamPlaintext} delegates to `stream-digest.ts#assertNoPlaintext`
 *     — the deliberately **wider** caliber (URL query / secret / command argument
 *     body / raw markup), because stream labels may echo caller input.
 *   · {@link STREAM_FIELD_WHITELIST} is the closed set of fields a stream row may
 *     carry. The digest itself has no free-text field (ADR-V4-028 §3), so a card
 *     that only uses these fields **structurally cannot** persist plaintext.
 *   · {@link label} is the **only** factory that may produce a `label`: it asserts
 *     the copy is plaintext-free at construction time, so a leak throws where the
 *     string is built — not in a gate a later leaf could forget to run.
 *
 * ── The ask/authorization copy is single-source here ─────────────────────────
 *
 * The card固化 copy and the system rows must not disagree (ADR-V4-031 §3: 文案模板
 * 单源). {@link ASK_COPY} is that one source; the card component and the reducer's
 * system rows both read it.
 *
 * Pure: no DOM, no clock, no IO.
 *
 * @module ui/sidepanel/stream-plaintext
 */
import { assertNoPlaintext } from './stream-digest.js';

/**
 * The closed field whitelist a stream row / digest entry may carry (ADR-V4-034
 * §5). It is a **superset** of `stream-digest.ts#DIGEST_FIELDS` on purpose: the
 * digest is the persisted projection, this list also names the transient card
 * fields. `answer` / `prompt` / `text` are deliberately **absent** — the answer is
 * a user's own words (allowed on screen) but must never be persisted.
 */
export const STREAM_FIELD_WHITELIST: readonly string[] = Object.freeze([
  'decision',
  'tool',
  'ok',
  'ms',
  'refNum',
  'askRequestId',
  'seq',
  'ts',
  'terminal',
  'label',
]);

/**
 * Fail-closed plaintext scan over a stream-rendered string. Delegates to the
 * digest caliber so the **rendered** path and the **persisted** path can never
 * disagree about what "plaintext" means (I-11, v4-2 review).
 */
export function assertStreamPlaintext(text: string): void {
  assertNoPlaintext([text]);
}

/**
 * The **only** factory allowed to produce a `label`. Parts are joined with ` · `;
 * the result is asserted plaintext-free before it is returned, so an injected URL
 * query / command argument body / page-text shape **throws at build time**.
 */
export function label(parts: readonly (string | number | undefined)[]): string {
  const text = parts.filter((p): p is string | number => p !== undefined).join(' · ');
  assertStreamPlaintext(text);
  return text;
}

/**
 * The single source of the ask/authorization **copy** (card固化 + system rows).
 * Every string here is a constructed constant, so the whole vocabulary is
 * plaintext-free by construction; {@link assertStreamCopySafe} re-checks it (a
 * future edit that pasted a URL would throw at module test time).
 */
export const ASK_COPY = Object.freeze({
  /** The empty answer guard — never auto-filled (fail-closed). */
  answeredPrefix: '已答：',
  /** Cancelled (any reason) — verbatim shim C10 copy. */
  cancelled: '已取消（不代填默认值）',
  /** The system row for a user cancel (kept, though the card alone already traces). */
  cancelledUserSystem: '提问已由用户取消（未作答，不代填默认值）',
  /** The system row for the 60 s timeout projection. */
  timeoutSystem: '提问超时未答：已按未作答取消（不代填默认值）',
  /** The system row for a superseded background question (R1 → v4 双留痕). */
  supersededSystem: '上一轮提问已被新的拾取回合取代（未作答即取消，不代填默认值）',
  /** auth terminal copies (shim D3 / D5). */
  approved: '已批准',
  rejected: '已拒绝（不执行）',
  /** The audit-exit label (reuses the v3-2 receipt exit wording, D4). */
  auditExit: '查看审计（完整审计视图）',
  /** The audit-view division of labour sentence (AC-CHAT-016). */
  auditDivision: '流内为会话线索；完整台账在工具栏「审计」视图。',
} as const);

/** Assert the whole copy vocabulary is plaintext-free (fail-closed guard). */
export function assertStreamCopySafe(): void {
  assertStreamPlaintext(Object.values(ASK_COPY).join('\n'));
}

/** The system row for a cancel reason (`null` = no row; user cancel is card-only). */
export function cancelSystemLine(reason: 'user' | 'timeout' | 'superseded'): string | null {
  if (reason === 'timeout') return ASK_COPY.timeoutSystem;
  if (reason === 'superseded') return ASK_COPY.supersededSystem;
  return null;
}
