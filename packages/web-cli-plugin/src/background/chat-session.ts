/**
 * Session chat history (FR-017 / ADR-012 / EC-011 / EC-013).
 *
 * The upstream `AgentRunner` is single-shot (its `run()` resolves once), so
 * conversation continuity is achieved by retaining the turn history in the
 * background session and prefixing it to every new runner invocation. The
 * history is snapshotted to `chrome.storage.session` (EC-013) and cleared on
 * whole-page navigation (EC-011) so a new page never silently continues a
 * previous context.
 *
 * Pure logic (no chrome / DOM), node-testable.
 */
import type { ChatTurn } from '@lgdl/web-cli-base';

/** Bound on retained turns (avoids unbounded session storage growth). */
export const MAX_SESSION_TURNS = 40;

/** Storage key for the session-scoped history snapshot. */
export const CHAT_HISTORY_KEY = 'chat-history';

export interface ChatSession {
  /** Prefix the retained history to the runner's current-turn turns. */
  prefix(turns: ChatTurn[]): ChatTurn[];
  /** Append the completed run's turns to the retained history (bounded). */
  commit(turns: ChatTurn[]): void;
  /** Deep-ish copy for persistence (never returns the live array). */
  snapshot(): ChatTurn[];
  /** Restore a previously persisted history. */
  restore(turns: ChatTurn[]): void;
  clear(): void;
  size(): number;
}

function copyTurn(t: ChatTurn): ChatTurn {
  return {
    ...t,
    ...(t.toolCalls ? { toolCalls: t.toolCalls.map((c) => ({ ...c })) } : {}),
  };
}

/**
 * Keep at most `MAX_SESSION_TURNS` entries, starting at a `user` turn so a
 * retained tool result always has its assistant `toolCalls` parent (valid LLM
 * message ordering).
 */
function trim(turns: ChatTurn[]): ChatTurn[] {
  if (turns.length <= MAX_SESSION_TURNS) return turns.map(copyTurn);
  let start = turns.length - MAX_SESSION_TURNS;
  while (start < turns.length && turns[start]?.role !== 'user') start += 1;
  return turns.slice(start).map(copyTurn);
}

/**
 * Bound a raw history to `MAX_SESSION_TURNS`, starting at a `user` turn. Exported
 * so the multi-session store (`session-store.ts`) reuses the exact same trimming
 * contract instead of duplicating it (D-013 test preservation).
 */
export function boundHistory(turns: ChatTurn[]): ChatTurn[] {
  return trim(turns);
}

export function createChatSession(initial: ChatTurn[] = []): ChatSession {
  let history: ChatTurn[] = trim(initial);
  return {
    prefix(turns) {
      return [...history, ...turns];
    },
    commit(turns) {
      history = trim([...history, ...turns]);
    },
    snapshot() {
      return history.map(copyTurn);
    },
    restore(turns) {
      history = Array.isArray(turns) ? trim(turns) : [];
    },
    clear() {
      history = [];
    },
    size() {
      return history.length;
    },
  };
}
