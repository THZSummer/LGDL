/**
 * Chat-result event shaping (user report: the same `400` error appeared twice).
 *
 * Root cause (see build.md §18 / B): the upstream `AgentRunner` retries a failed
 * LLM call **once** (`runner.ts` `handleLLMError`), calling `events.onLLMError`
 * for both the retryable failure (`willRetry=true`) and the final give-up
 * (`willRetry=false`). The plugin previously dropped the `willRetry` flag and
 * forwarded both as `variant:'error'`, so the side panel rendered two identical
 * `system:` error entries for a single user message.
 *
 * This helper keeps the runner contract unchanged (base untouched) and makes the
 * two attempts distinguishable: the retryable attempt is a readable notice, only
 * the final failure is an `error`.
 *
 * TASK-023 (UI/UX redesign): tool results are no longer dumped as plain text.
 * `toolResultEvent` carries the tool name / status / duration so the side panel
 * can render a collapsible tool card; `commandEvent` surfaces the derived command
 * line. Both are additive to the existing message shape.
 */
// V5.5-2 TASK-V55-204: the variant vocabulary is declared ONCE in `messaging.ts`
// (type-only, never a `KIND_SET` member) and re-exported here — a second hand-written
// union for the same payload would be a drift seam.
import type { ChatResultVariant } from './messaging.js';
export type { ChatResultVariant };

/**
 * V5.5-3 **TASK-V55-309** (ADR-V55-010 §2/§4 · FR-SELF-061 · AC-SELF-014 · X-SELF-7) —
 * the **turn-arbitration result closure**, declared ONCE here (both sides —
 * `background/service-worker.ts` and the side panel — import this; neither writes its own
 * string union ⇒ no drift seam).
 *
 * It is a **type-only vocabulary**: none of these four words is a `KIND_SET` member (the
 * shared `KIND_SET` stays exactly 40 — `test/turn-arbitration.test.ts` asserts it), and the
 * two panel-visible ones (`queued` / `busy-rejected`) ride the **existing** `chat-result`
 * kind as `variant` values (a payload field, not a message kind).
 *
 *   · `executed`      — the turn ran immediately (the pre-existing single-flight path);
 *   · `queued`        — in-flight turn ∧ queue had room ⇒ FIFO (hard cap 1), the user's
 *                       words are **not lost** (a readable row + the turn runs on drain);
 *   · `busy-rejected` — in-flight turn ∧ queue full ⇒ **explicit** refusal + the panel
 *                       **restores the draft** into `#input` (never a silent drop);
 *   · `ai-deferred`   — the AI path never queues: `pressCandidate` returns `blocked:busy`
 *                       and writes a readable trace (ADR-V55-010 §3).
 */
export const ARBITRATION_RESULTS = Object.freeze(['executed', 'queued', 'busy-rejected', 'ai-deferred'] as const);
export type ArbitrationResult = (typeof ARBITRATION_RESULTS)[number];

export interface ChatResultEvent {
  variant: ChatResultVariant;
  text?: string;
  /** True on the retryable attempt notice (non-fatal). */
  retrying?: boolean;
  /** TASK-023: tool card header (tool name as sent to the executor). */
  tool?: string;
  /** TASK-023: tool card status. */
  ok?: boolean;
  /** TASK-023: tool card duration in ms (measured around dispatch). */
  ms?: number;
  /**
   * R6（2026-09-23）—— the **target selector** of a successful page write (`dom set-text`).
   * Additive metadata: the side panel re-observes the live reference hit by the write
   * (selector match or `data-wcli-ref`) so a rewritten reference is re-judged. Absent for
   * every other tool result (never a fabricated value).
   */
  targetSelector?: string;
}

/** Map one `onLLMError(message, willRetry)` callback to a side-panel event. */
export function llmErrorEvent(message: string, willRetry: boolean): ChatResultEvent {
  if (willRetry) {
    return { variant: 'tool', text: `⚠ LLM 调用失败，正在自动重试一次…（${message}）`, retrying: true };
  }
  return { variant: 'error', text: message };
}

/**
 * TASK-023: a derived command line (what the agent is about to execute). Rendered
 * as a compact monospace line, never a full message block.
 */
export function commandEvent(text: string): ChatResultEvent {
  return { variant: 'command', text };
}

/**
 * TASK-023: a tool result. `tool`/`ok`/`ms` are omitted (not faked) when the
 * background could not observe them; the panel then falls back to a plain notice.
 */
export function toolResultEvent(
  tool: string | undefined,
  ok: boolean | undefined,
  ms: number | undefined,
  text: string,
  targetSelector?: string,
): ChatResultEvent {
  return {
    variant: 'tool',
    text,
    ...(tool !== undefined ? { tool } : {}),
    ...(ok !== undefined ? { ok } : {}),
    ...(ms !== undefined ? { ms } : {}),
    ...(targetSelector !== undefined ? { targetSelector } : {}),
  };
}
