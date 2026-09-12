/**
 * Active-tab controller (ADR-012, S-011 / EC-011 / EC-013).
 *
 * First version binds a single active tab. Whole-page navigation invalidates the
 * session context explicitly (no silent continuation): the user must re-authorize
 * / reconnect. Runtime state can be snapshotted to `chrome.storage.session` and
 * restored after a service-worker restart.
 */
import type { DiscoveryState } from '../discovery/discovery.js';
import type { WebCliDescriptor } from '../protocol/descriptor.js';

export interface ActiveSession {
  tabId: number;
  origin: string;
  discoveryState: DiscoveryState;
  descriptor?: WebCliDescriptor;
  /** Readable discovery failure reason (TASK-019 任务 B; never a silent unknown). */
  discoveryReason?: string;
  /** True after navigation: context invalid, re-authorization/reconnect required. */
  invalidated: boolean;
  updatedAt: number;
}

export interface ControllerSnapshot {
  tabId?: number;
  origin?: string;
  discoveryState?: DiscoveryState;
  discoveryReason?: string;
  invalidated: boolean;
  updatedAt: number;
}

export interface WebCliController {
  bindTab(tabId: number, origin: string): ActiveSession;
  get(): ActiveSession | null;
  setDiscovery(state: DiscoveryState, descriptor?: WebCliDescriptor, reason?: string): void;
  /** Mark the current session invalid after whole-page navigation (EC-011). */
  markNavigated(): void;
  /**
   * Mark the current session stale after the user switched to another tab
   * (D-065). Unlike `markNavigated` this preserves the binding, the discovery
   * state and the tool surface — a tab switch is not a page navigation, and
   * without the `tabs` permission we cannot even read the new tab's URL, so the
   * user gets a readable prompt to re-bind from the icon rather than a silent
   * teardown.
   */
  markStale(): void;
  clear(): void;
  snapshot(): ControllerSnapshot;
  restore(snapshot: ControllerSnapshot): void;
}

export function createController(opts: { now?: () => number } = {}): WebCliController {
  const now = opts.now ?? (() => Date.now());
  let session: ActiveSession | null = null;

  return {
    bindTab(tabId, origin) {
      session = { tabId, origin, discoveryState: 'unknown', invalidated: false, updatedAt: now() };
      return session;
    },
    get() {
      return session;
    },
    setDiscovery(state, descriptor, reason) {
      if (!session) return;
      session = {
        ...session,
        discoveryState: state,
        ...(descriptor ? { descriptor } : {}),
        ...(reason ? { discoveryReason: reason } : {}),
        invalidated: false,
        updatedAt: now(),
      };
      if (!reason) delete session.discoveryReason;
    },
    markNavigated() {
      if (!session) return;
      session = { ...session, invalidated: true, discoveryState: 'unknown', updatedAt: now() };
      delete session.descriptor;
      delete session.discoveryReason;
    },
    markStale() {
      if (!session) return;
      // Keep origin / discoveryState / descriptor: switching tabs must not
      // silently discard a working binding (the user may switch right back).
      session = { ...session, invalidated: true, updatedAt: now() };
    },
    clear() {
      session = null;
    },
    snapshot() {
      return {
        ...(session
          ? {
              tabId: session.tabId,
              origin: session.origin,
              discoveryState: session.discoveryState,
              ...(session.discoveryReason ? { discoveryReason: session.discoveryReason } : {}),
            }
          : {}),
        invalidated: session?.invalidated ?? false,
        updatedAt: now(),
      };
    },
    restore(snapshot) {
      if (snapshot.tabId === undefined || !snapshot.origin) return;
      session = {
        tabId: snapshot.tabId,
        origin: snapshot.origin,
        discoveryState: snapshot.discoveryState ?? 'unknown',
        ...(snapshot.discoveryReason ? { discoveryReason: snapshot.discoveryReason } : {}),
        invalidated: snapshot.invalidated,
        updatedAt: snapshot.updatedAt,
      };
    },
  };
}
