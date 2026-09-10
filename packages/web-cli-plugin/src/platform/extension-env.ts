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
