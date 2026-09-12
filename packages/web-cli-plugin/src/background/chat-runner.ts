/**
 * Session-aware chat turn runner (FR-017, ADR-012).
 *
 * Wraps the upstream single-shot `AgentRunner`: the retained session history is
 * prefixed to every LLM call so consecutive user messages share context
 * (multi-turn), and the completed turn is committed back to the session. This
 * module is chrome-free (all I/O injected) so it is node-testable.
 */
import {
  createAgentRunner,
  type AgentRunnerEvents,
  type AgentRunnerHooks,
  type ChatResult,
  type ChatTurn,
  type ToolResult,
  type WebCliToolCall,
} from '@lgdl/web-cli-base';
import type { ChatSession } from './chat-session.js';

export interface ChatTurnDeps {
  session: ChatSession;
  /** System prompt (string or per-round factory). */
  system: string | (() => string | Promise<string>);
  /** LLM call; receives the session-prefixed turns (system prepended by caller). */
  chat(turns: ChatTurn[], system: string): Promise<ChatResult>;
  dispatch(tc: WebCliToolCall): Promise<ToolResult>;
  deriveCommand?(tc: WebCliToolCall): string | null;
  /** Round cap from user settings (EC-013 long-loop protection). */
  maxRounds?: number;
  events?: AgentRunnerEvents;
  /**
   * TASK-023: scenario hooks forwarded upstream. The side panel needs the tool
   * name + ok status per call to render a tool card; `onToolOutput` only carries
   * the output text, so `hooks.onToolDone(tc, result)` is the only place that
   * observes the tool identity (base contract, `runner.ts`).
   */
  hooks?: AgentRunnerHooks;
}

/**
 * Run one user turn with session continuity. Resolves when the agent loop ends;
 * the completed conversation is committed to the session for the next turn.
 */
export async function runChatTurn(user: string, deps: ChatTurnDeps): Promise<void> {
  // Capture the runner's live turns array (same reference each round); after the
  // run it holds the complete current-turn conversation (user → assistant/tool).
  let current: ChatTurn[] = [];
  const systemFactory = typeof deps.system === 'function' ? deps.system : () => deps.system as string;
  const runner = createAgentRunner({
    user,
    system: systemFactory,
    chat: async (turns, system) => {
      current = turns;
      return deps.chat(deps.session.prefix(turns), system);
    },
    dispatch: deps.dispatch,
    ...(deps.deriveCommand ? { deriveCommand: deps.deriveCommand } : {}),
    ...(deps.maxRounds !== undefined ? { maxRounds: deps.maxRounds } : {}),
    ...(deps.events ? { events: deps.events } : {}),
    ...(deps.hooks ? { hooks: deps.hooks } : {}),
  });
  await runner.run();
  if (current.length) deps.session.commit(current);
}
