/**
 * Task-internal `askUser` bridge (FR-017 / R7).
 *
 * Distinct from the PRM permission ask (`security/confirm.ts`): `askUser` is the
 * AI asking a clarifying question mid-task; the answer enters the tool output and
 * the conversation context. The base `ask-user` tool entry expects an injected
 * `AskResponder`; this module bridges that responder to the side-panel Q&A UI via
 * request/response messages.
 *
 * Pure and node-testable: `deliver` is injected and no chrome API is touched.
 * Fail-closed: a delivery failure or a timeout resolves as `canceled` (the tool
 * reports 「用户取消了回答」), never a silent hang.
 */
import type { AskResponder, AskUserAnswer, AskUserQuestion } from '@lgdl/web-cli-base';

export interface AskBridgeOptions {
  /** Deliver the question to the UI (side panel). Failure = canceled. */
  deliver(requestId: string, question: AskUserQuestion): Promise<void> | void;
  /** Correlation id generator (injected for deterministic tests). */
  requestId(prefix?: string): string;
  /** How long to wait for a user answer before treating it as canceled (default 60s). */
  timeoutMs?: number;
  setupTimeout?: (fn: () => void, ms: number) => () => void;
}

export interface AskBridge {
  /** Responder injected into `createAskUserToolEntry` / `createWebCliHost`. */
  askUser: AskResponder;
  /** Resolve a pending question with the user's answer. Returns false if unknown. */
  settle(requestId: string, answer: AskUserAnswer): boolean;
  /** Number of questions still awaiting an answer. */
  pendingCount(): number;
}

const DEFAULT_ASK_TIMEOUT_MS = 60000;

export function createAskBridge(opts: AskBridgeOptions): AskBridge {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_ASK_TIMEOUT_MS;
  const setupTimeout =
    opts.setupTimeout ??
    ((fn: () => void, ms: number) => {
      const timer = setTimeout(fn, ms);
      return () => clearTimeout(timer);
    });
  const pending = new Map<string, (answer: AskUserAnswer) => void>();

  return {
    askUser(question) {
      return new Promise<AskUserAnswer>((resolve) => {
        const rid = opts.requestId('ask');
        const clear = setupTimeout(() => {
          if (pending.delete(rid)) resolve({ ok: false, canceled: true });
        }, timeoutMs);
        pending.set(rid, (answer) => {
          clear();
          resolve(answer);
        });
        Promise.resolve(opts.deliver(rid, question)).catch(() => {
          if (pending.delete(rid)) resolve({ ok: false, canceled: true });
        });
      });
    },
    settle(requestId, answer) {
      const resolve = pending.get(requestId);
      if (!resolve) return false;
      pending.delete(requestId);
      resolve(answer);
      return true;
    },
    pendingCount: () => pending.size,
  };
}
