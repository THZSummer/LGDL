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
  /**
   * decision ②/FR-048: cancel every pending question (a session switch must not
   * leave a question silently hanging on the previous session). Each resolves as
   * `canceled` (fail-closed). Returns how many were canceled.
   */
  cancelAll(): number;
}

/**
 * V5.5-1 TASK-V55-117 (ADR-V55-004 §3 · FR-SELF-028 · EC-SELF-008) — the **honest
 * settle outcome**.
 *
 * `settle()` used to be read as a boolean, so「未命中」collapsed into「失败」and the SW
 * answered a bare `errorResponse` — the user's answer was silently dropped (会话 B 的
 * 后台迟到形态). The outcome separates the two facts:
 *
 *   · `{ settled: true, late: false }` — the in-flight turn really received the answer;
 *   · `{ settled: false, late: true }` — the turn already ended (**not an error**): the
 *     panel固化 the fact and reaches a next step instead of losing the answer
 *     (「未接住」如实说明，绝不伪造接住 — R-SELF-008).
 */
export interface SettleOutcome {
  readonly settled: boolean;
  readonly late: boolean;
  readonly requestId: string;
}

/** The late outcome (a pure value — the single construction point). */
export function lateSettleOutcome(requestId: string): SettleOutcome {
  return { settled: false, late: true, requestId };
}

/**
 * The ONE outcome projection of `settle`: 迟到**不是**错误，故不再有裸 `errorResponse`
 * 分支。`settle` 的布尔签名保持不动（既有断言零改），本函数是它的结果面收口点。
 */
export function settleOutcome(
  bridge: Pick<AskBridge, 'settle'>,
  requestId: string,
  answer: AskUserAnswer,
): SettleOutcome {
  return bridge.settle(requestId, answer) ? { settled: true, late: false, requestId } : lateSettleOutcome(requestId);
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
    cancelAll() {
      const resolvers = [...pending.values()];
      pending.clear();
      for (const resolve of resolvers) resolve({ ok: false, canceled: true });
      return resolvers.length;
    },
  };
}
