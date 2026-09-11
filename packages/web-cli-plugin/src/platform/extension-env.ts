/**
 * Extension storage + host-permission adapters (ADR-002 / ADR-005 / FR-006).
 *
 * - `createChromeAsyncKv`   → `chrome.storage.local` (non-secret settings)
 * - `createChromeSessionKv` → `chrome.storage.session` (runtime state, EC-013)
 * - `requestOriginPermission` / `hasOriginPermission` → optional host permission
 *   for the authorized origin (IMP-4 / FR-006), so the background can later
 *   fetch a site's declaration directly (wave 2) without a blanket host grant.
 *
 * Secrets (LLM keys) never use these KVs; they live in the dedicated key-store.
 * The chrome API is only touched inside these factories, keeping the rest of the
 * plugin importable in node for unit tests. The `PlatformEnv` remote-seam
 * factory is intentionally deferred to wave 2 (no P0 consumer; see build D-010).
 */

import type { PlatformDom } from '@lgdl/web-cli-base';
import { createRemoteDomOps, type DomAgentTransport } from '../content/dom-agent.js';

/** Async KV backed by `chrome.storage.local` (used by security stores). */
export interface AsyncKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

function storageArea(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

/** Async KV over `chrome.storage.local`, key-prefixed per namespace. */
export function createChromeAsyncKv(prefix = 'web-cli'): AsyncKv {
  const full = (key: string) => `${prefix}:${key}`;
  return {
    async get<T>(key: string) {
      const res = await storageArea().get(full(key));
      return res[full(key)] as T | undefined;
    },
    async set(key: string, value: unknown) {
      await storageArea().set({ [full(key)]: value });
    },
    async remove(key: string) {
      await storageArea().remove(full(key));
    },
  };
}

/** Session-scoped async KV over `chrome.storage.session` (runtime state, EC-013). */
export function createChromeSessionKv(prefix = 'web-cli'): AsyncKv {
  const full = (key: string) => `${prefix}:${key}`;
  return {
    async get<T>(key: string) {
      const res = await chrome.storage.session.get(full(key));
      return res[full(key)] as T | undefined;
    },
    async set(key: string, value: unknown) {
      await chrome.storage.session.set({ [full(key)]: value });
    },
    async remove(key: string) {
      await chrome.storage.session.remove(full(key));
    },
  };
}

/**
 * Build the origin match pattern for the optional host permission, e.g.
 * `https://example.com/*`. Returns `null` for non-http(s) / invalid origins.
 * Pure and node-testable.
 */
export function originPermissionPattern(origin: string): string | null {
  try {
    const url = new URL(origin.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}/*`;
  } catch {
    return null;
  }
}

/**
 * Request the optional host permission for an origin (IMP-4 / FR-006).
 * Best-effort: a missing user gesture / denial / API error resolves to `false`
 * (the OriginStore authorization remains the authoritative gate), never throws.
 */
export async function requestOriginPermission(origin: string): Promise<boolean> {
  const pattern = originPermissionPattern(origin);
  if (!pattern) return false;
  try {
    return (await chrome.permissions.request({ origins: [pattern] })) === true;
  } catch (err) {
    console.warn('[web-cli-plugin] host permission request failed:', err);
    return false;
  }
}

/** Whether the optional host permission for an origin is currently granted. */
export async function hasOriginPermission(origin: string): Promise<boolean> {
  const pattern = originPermissionPattern(origin);
  if (!pattern) return false;
  try {
    return (await chrome.permissions.contains({ origins: [pattern] })) === true;
  } catch {
    return false;
  }
}

/**
 * Remove the optional host permission for an origin (EC-008 / FR-006). Used by
 * the revoke flow so a user-initiated revocation also drops the granted host
 * permission (readable, best-effort — never throws).
 */
export async function removeOriginPermission(origin: string): Promise<boolean> {
  const pattern = originPermissionPattern(origin);
  if (!pattern) return false;
  try {
    return (await chrome.permissions.remove({ origins: [pattern] })) === true;
  } catch (err) {
    console.warn('[web-cli-plugin] host permission remove failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Remote DOM seam (TASK-015 / FR-008 / EC-007)
// ---------------------------------------------------------------------------

export interface ExtensionDomAssembly {
  /** Whether the remote DOM seam is assembled (default off). */
  enabled: boolean;
  /** Platform DOM seam when enabled. */
  dom?: PlatformDom;
  /** Readable reason when the seam is not assembled (FR-008 / EC-007). */
  reason?: string;
}

/**
 * Assemble the extension-side remote DOM seam from an injected content-script
 * transport. Default off: with no transport, nothing is created and a readable
 * reason is returned (never a silent no-op).
 */
export function assembleExtensionDom(transport?: DomAgentTransport): ExtensionDomAssembly {
  if (!transport) {
    return {
      enabled: false,
      reason: '远程 DOM 缝未装配：未注入 content script DOM 通道（通用 DOM 工具面默认关，零常驻开销）',
    };
  }
  const ops = createRemoteDomOps(transport);
  const dom: PlatformDom = {
    state: {
      snapshot: async () => ops.snapshot() as unknown as Record<string, unknown>,
    },
    ops,
  };
  return { enabled: true, dom };
}
