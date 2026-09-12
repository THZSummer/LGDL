/**
 * B-guard: the same LLM error must not surface as two identical `error` entries.
 *
 * The base `AgentRunner` retries a failed call once and emits `onLLMError`
 * twice; the plugin maps the retryable attempt to a readable notice and only the
 * final attempt to an `error` (see `src/background/chat-events.ts`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { llmErrorEvent } from '../src/background/chat-events.js';

const MSG =
  "DeepSeek 请求失败（HTTP 400）：400 Invalid 'tools[0].function.name': string does not match pattern. Expected a string that matches the pattern '^[a-zA-Z0-9_-]+$'.";

test('B: retryable LLM failure is a notice, not an error; final failure is the single error', () => {
  const retry = llmErrorEvent(MSG, true);
  assert.equal(retry.variant, 'tool');
  assert.equal(retry.retrying, true);
  assert.match(retry.text ?? '', /重试/);
  assert.match(retry.text ?? '', /HTTP 400/);

  const final = llmErrorEvent(MSG, false);
  assert.equal(final.variant, 'error');
  assert.equal(final.text, MSG);

  // A retry-then-fail sequence yields at most one `system:` error entry.
  const events = [llmErrorEvent(MSG, true), llmErrorEvent(MSG, false)];
  assert.equal(events.filter((e) => e.variant === 'error').length, 1);
  assert.equal(events.filter((e) => e.variant === 'error' && e.text === MSG).length, 1);
});
