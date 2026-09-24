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
 *   · {@link STREAM_PERSISTED_FIELDS} re-exports the digest's own closed field set.
 *     I-01 (v4-3 review) **deleted** the former second list
 *     (`STREAM_FIELD_WHITELIST`) instead of keeping two whitelists that could
 *     drift: the persisted projection is `stream-digest.ts#DIGEST_FIELDS`, and a
 *     stream row can only ever persist through it (ADR-V4-028 §3 / ADR-V4-034 §5).
 *   · {@link label} is the **only** factory that may produce a `label`: it asserts
 *     the copy is plaintext-free at construction time, so a leak throws where the
 *     string is built — not in a gate a later leaf could forget to run. I-01: it is
 *     now the **production** path (the reducer writes every `label` through it).
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
import { DIGEST_FIELDS, assertNoPlaintext } from './stream-digest.js';

/**
 * The **persisted** field set — ONE source, no second whitelist (I-01, v4-3 review).
 *
 * The former `STREAM_FIELD_WHITELIST` was a hand-maintained superset of
 * `stream-digest.ts#DIGEST_FIELDS` with **zero call sites** (including tests), so
 * the two lists could silently drift. The persisted projection is the digest's
 * closed set; anything a stream row may carry *but* not persist (`text` / `prompt`
 * / `answer`) is by definition **not** whitelisted here, which is exactly the
 * property the zero-plaintext red line rests on.
 */
export const STREAM_PERSISTED_FIELDS: readonly string[] = DIGEST_FIELDS;

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
 * V4.5-1 W2 (TASK-V45-105 / NFR-V45-003 / R-REG-901) — the **ONE** projector for the
 * long copy a stream row carries as its `title`.
 *
 * The retired strip nodes used to hold the long copy as their body
 * (`#site-hint-detail` / `#discovery-detail`). With the nodes gone, the long copy rides
 * the row's `title` — which is *still a render surface reachable from page facts*, so it
 * goes through the **same** fail-closed caliber as the row text:
 *
 *   ① product-authored markup (`<link rel="web-cli">` is a legitimate DOM string that a
 *      detail sentence embeds) is stripped — a system row is not a render surface;
 *   ② the result is scanned by {@link assertStreamPlaintext}: a residual URL query /
 *      secret / command-argument body / backtick **throws** at build time.
 *
 * Order matters: strip-then-scan (a silent strip of a *leak* is impossible because the
 * scan runs on the stripped result). The reverse proof in `test/side-content` /
 * `test/env-guard` injects `?token=…` and page text and requires the throw.
 */
export function plaintextTitle(text: string): string {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  assertStreamPlaintext(plain);
  return plain;
}

/**
 * The single source of the ask/authorization **copy** (card固化 + system rows).
 * Every string here is a constructed constant, so the whole vocabulary is
 * plaintext-free by construction; {@link assertStreamCopySafe} re-checks it (a
 * future edit that pasted a URL would throw at module test time).
 */
// V5-3 TASK-V5-154 (ADR-V5-010 §2 面②): the ONE mask token — the only trace a written
// value may leave in the fixed copy / the persisted digest. Never the value, never a prefix.
export const DIGEST_MASK = '••••••';

export const ASK_COPY = Object.freeze({
  /** The empty answer guard — never auto-filled (fail-closed). */
  answeredPrefix: '已答：',
  /**
   * V5-2 TASK-V5-135 (ADR-V5-002 §2 / FR-ALLN-022, 法八) — the masked card's fixed copy.
   * It states the FACT only (written / masked / a length **category**), never the value
   * nor any prefix of it. `{n}` is a category (`8+`), not the raw length (ADR-V5-010 §2,
   * 缩窄侧信道).
   */
  secretWritten: '已写入（掩码 · 零明文 · {n} 位）',
  /** Cancelled (any reason) — verbatim shim C10 copy. */
  cancelled: '已取消（不代填默认值）',
  /** ★ IAN-1（ADR-IAN-002 §② · 法八 / FIN-8）：只述事实、**不回显**用户文本。 */
  freeInputSubmitted: '已提交（内容在对话中）',
  /** The system row for a user cancel (kept, though the card alone already traces). */
  cancelledUserSystem: '提问已由用户取消（未作答，不代填默认值）',
  /** The system row for the 60 s timeout projection (background ask bridge expiry). */
  timeoutSystem: '提问超时未答：已按未作答取消（不代填默认值）',
  /** The system row for a superseded background question (R1 → v4 双留痕). */
  supersededSystem: '上一轮提问已被新的拾取回合取代（未作答即取消，不代填默认值）',
  /** The system row for a turn that ended on an ERROR with a background ask open (I-06). */
  abortedSystem: '回合因错误结束：该提问未作答即取消（不代填默认值）',
  /**
   * BLOCK-02: the trace written when a turn ends while a **panel-owned** reference
   * question is still open. The card is deliberately NOT settled (it has no bridge
   * and no 60 s timer, so turn-end carries no expiry semantics) — the row keeps the
   * process fact without inventing a timeout that never happened.
   */
  turnEndRefPending: '本轮已结束：引用提问仍在等待你的选择（不随回合结束取消，不代填默认值）',
  /** auth terminal copies (shim D3 / D5). */
  approved: '已批准',
  rejected: '已拒绝（不执行）',
  /** BLOCK-01: the auth card's `cancelled` terminal (never「已批准」). */
  authCancelled: '已取消（未授权，不执行）',
  /** The audit-exit label (reuses the v3-2 receipt exit wording, D4). */
  auditExit: '查看审计（完整审计视图）',
  /** The audit-view division of labour sentence (AC-CHAT-016). */
  auditDivision: '流内为会话线索；完整台账在工具栏「审计」视图。',
  /** BLOCK-03: the readable cancel reasons the L1「已决策历史」row shows. */
  cancelReasonUser: '已取消（用户）',
  cancelReasonTimeout: '已取消（超时未答）',
  cancelReasonSuperseded: '已取消（被新回合取代）',
  cancelReasonAborted: '已取消（回合因错误结束）',
} as const);

/** Assert the whole copy vocabulary is plaintext-free (fail-closed guard). */
export function assertStreamCopySafe(): void {
  assertStreamPlaintext(Object.values(ASK_COPY).join('\n'));
}

/**
 * I-01 (v4-3 review) — the load-time consumption point of the copy vocabulary.
 *
 * `assertStreamCopySafe()` used to have **zero call sites outside the test file**,
 * i.e. the layer that guarantees「固化文案 / 系统行零明文」was only ever run by a
 * gate a later leaf could forget. Evaluating it here means the check runs on the
 * **production import graph** (the panel bundle imports this module) and throws
 * where the string table is defined — a pasted URL / secret / `<b>` in the copy
 * fails at panel load instead of shipping.
 */
assertStreamCopySafe();

/** The system row for a cancel reason (`null` = no row; user cancel is card-only). */
export function cancelSystemLine(reason: 'user' | 'timeout' | 'superseded' | 'aborted'): string | null {
  if (reason === 'timeout') return ASK_COPY.timeoutSystem;
  if (reason === 'superseded') return ASK_COPY.supersededSystem;
  if (reason === 'aborted') return ASK_COPY.abortedSystem;
  return null;
}

/**
 * BLOCK-03 — the readable text an L1「已决策历史」row shows for a `cancelled` card.
 * Single source with {@link ASK_COPY}: the row can never render a reason the card
 * itself does not know about.
 */
export function cancelReasonText(reason: 'user' | 'timeout' | 'superseded' | 'aborted' | undefined): string {
  if (reason === 'timeout') return ASK_COPY.cancelReasonTimeout;
  if (reason === 'superseded') return ASK_COPY.cancelReasonSuperseded;
  if (reason === 'aborted') return ASK_COPY.cancelReasonAborted;
  return ASK_COPY.cancelReasonUser;
}
