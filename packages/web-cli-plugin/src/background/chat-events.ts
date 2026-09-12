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
export type ChatResultVariant = 'assistant' | 'tool' | 'command' | 'error' | 'done';

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
): ChatResultEvent {
  return {
    variant: 'tool',
    text,
    ...(tool !== undefined ? { tool } : {}),
    ...(ok !== undefined ? { ok } : {}),
    ...(ms !== undefined ? { ms } : {}),
  };
}
