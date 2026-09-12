/**
 * Side-panel `state` message payload (FR-017 / W1).
 *
 * The background owns the persisted `OriginStore`; the side panel does not.
 * Every `state` request must therefore carry the bound origin's authorization
 * so a panel reload / service-worker restart cannot show a stale "未授权" while
 * the origin is still authorized (users would re-authorize for no reason).
 *
 * Kept dependency-free (a plain async projection) so it is node-testable.
 */
export interface ActiveSessionView {
  tabId: number;
  origin: string;
  discoveryState?: string;
  /** Readable discovery failure reason (TASK-019 任务 B). */
  discoveryReason?: string;
  invalidated: boolean;
}

export interface StateMessagePayload {
  active: ActiveSessionView | null;
  tools: string[];
  /**
   * OriginStore authorization of the bound origin. Semantics: "is this origin
   * authorized" — always `false` when there is no bound origin.
   */
  authorized: boolean;
}

export async function buildStateMessage(input: {
  active: ActiveSessionView | null;
  tools: string[];
  isAuthorized: (origin: string) => Promise<boolean>;
}): Promise<StateMessagePayload> {
  const { active, tools, isAuthorized } = input;
  const authorized = active ? await isAuthorized(active.origin) : false;
  return { active, tools, authorized };
}
