/**
 * Chat-result event shaping (user report: the same `400` error appeared twice).
 *
 * Root cause (see build.md §18 / B): the upstream `AgentRunner` retries a failed
 * LLM call **once** (`runner.ts` `handleLlmError`), calling `events.onLLMError`
 * for both the retryable failure (`willRetry=true`) and the final give-up
 * (`willRetry=false`). The plugin previously dropped the `willRetry` flag and
 * forwarded both as `variant:'error'`, so the side panel rendered two identical
 * `system:` error entries for a single user message.
 *
 * This helper keeps the runner contract unchanged (base untouched) and makes the
 * two attempts distinguishable: the retryable attempt is a readable notice, only
 * the final failure is an `error`.
 */
export type ChatResultVariant = 'assistant' | 'tool' | 'error' | 'done';

export interface ChatResultEvent {
  variant: ChatResultVariant;
  text?: string;
  /** True on the retryable attempt notice (non-fatal). */
  retrying?: boolean;
}

/** Map one `onLLMError(message, willRetry)` callback to a side-panel event. */
export function llmErrorEvent(message: string, willRetry: boolean): ChatResultEvent {
  if (willRetry) {
    return { variant: 'tool', text: `⚠ LLM 调用失败，正在自动重试一次…（${message}）`, retrying: true };
  }
  return { variant: 'error', text: message };
}
