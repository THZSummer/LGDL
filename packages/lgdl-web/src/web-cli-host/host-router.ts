/**
 * LGDL site protocol exposure — host router (FR-041 / FR-042, ADR-004).
 *
 * Reuses the retained `web-cli-base` mechanism layer (CommandRouter) plus the
 * LGDL domain tools (`lgdl-web-cli` + `lgdl-web-op-cli`). Assistant-specific
 * pieces (runner / provider / system prompt) are intentionally NOT wired here —
 * they are the down-line target of TASK-016.
 *
 * This module must stay free of React internal state: the caller injects
 * `getSource` / `onApply` / `opRegistry`.
 */
import {
  createCommandRouter,
  type CommandRouter,
  type ToolContext,
  type ToolResult,
  type WebCliToolCall,
} from '@lgdl/web-cli-base';
import { createLgdlWebCliTool } from '@lgdl/lgdl-web-cli';
import { createOpCliToolEntry, type OpHandlerRegistry } from '@lgdl/lgdl-web-op-cli';

export interface WebCliHostRouterDeps {
  docId: string;
  getSource(): string;
  opRegistry: OpHandlerRegistry;
}

export interface WebCliHostRouter {
  /** Retained mechanism-layer router (domain tools only; no assistant wiring). */
  router: CommandRouter;
  /** Dispatch a tool call with the current source (write-back is handled by the bridge). */
  dispatch(tc: WebCliToolCall, source?: string): Promise<ToolResult>;
}

export function createWebCliHostRouter(deps: WebCliHostRouterDeps): WebCliHostRouter {
  const router = createCommandRouter();
  router.register(createLgdlWebCliTool());
  router.register(createOpCliToolEntry(deps.opRegistry));

  return {
    router,
    dispatch(tc, source) {
      const ctx: ToolContext = { docId: deps.docId, source: source ?? deps.getSource() };
      return router.dispatch(tc, ctx);
    },
  };
}
