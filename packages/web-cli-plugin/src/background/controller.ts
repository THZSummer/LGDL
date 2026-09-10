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
  /** True after navigation: context invalid, re-authorization/reconnect required. */
  invalidated: boolean;
  updatedAt: number;
}

export interface ControllerSnapshot {
  tabId?: number;
  origin?: string;
  discoveryState?: DiscoveryState;
  invalidated: boolean;
  updatedAt: number;
}

export interface WebCliController {
  bindTab(tabId: number, origin: string): ActiveSession;
  get(): ActiveSession | null;
  setDiscovery(state: DiscoveryState, descriptor?: WebCliDescriptor): void;
  /** Mark the current session invalid after whole-page navigation (EC-011). */
  markNavigated(): void;
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
    setDiscovery(state, descriptor) {
      if (!session) return;
      session = {
        ...session,
        discoveryState: state,
        ...(descriptor ? { descriptor } : {}),
        invalidated: false,
        updatedAt: now(),
      };
    },
    markNavigated() {
      if (!session) return;
      session = { ...session, invalidated: true, discoveryState: 'unknown', updatedAt: now() };
      delete session.descriptor;
    },
    clear() {
      session = null;
    },
    snapshot() {
      return {
        ...(session ? { tabId: session.tabId, origin: session.origin, discoveryState: session.discoveryState } : {}),
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
        invalidated: snapshot.invalidated,
        updatedAt: snapshot.updatedAt,
      };
    },
  };
}
