/**
 * Optional-permission capabilities (`bookmarks` / `downloads`) — FR-054.
 *
 * Author decision (2026-09-13): the `bookmarks` (read + write; write side ask)
 * and `downloads` (read-only) capabilities are declared as **optional
 * permissions**, never as static `permissions`. Rationale: a static addition
 * makes Chrome **disable already-installed extensions on update** until the user
 * re-consents; optional keeps the static install surface unchanged and can be
 * revoked per capability.
 *
 * ── Gesture constraint (the single most important rule here)
 * `chrome.permissions.request` MUST be called from an **extension page with a
 * user gesture** (the side panel / settings view button click). It must NOT be
 * called from the service worker: without a gesture it fails (or hangs) and the
 * grant never happens. {@link requestCapabilityPermissionOnGesture} is therefore
 * called *directly* from a click handler, and invokes `request` synchronously
 * (before any `await`) so the gesture is not lost.
 *
 * Everything is dependency-injected / read lazily from `globalThis.chrome` so the
 * pure helpers stay node-testable and a non-extension context degrades readably.
 */

/** The two optional-permission capabilities this round. */
export type OptionalCapability = 'bookmarks' | 'downloads';

/** The exact manifest permission list each capability needs. */
export const OPTIONAL_CAPABILITY_PERMISSIONS: Readonly<Record<OptionalCapability, readonly string[]>> = {
  bookmarks: ['bookmarks'],
  downloads: ['downloads'],
};

/** The LLM tool each capability backs (used for settings status + suppression). */
export const OPTIONAL_CAPABILITY_TOOL: Readonly<Record<OptionalCapability, string>> = {
  bookmarks: 'bookmarks',
  downloads: 'downloads',
};

/** Human-readable capability label (settings view). */
export const OPTIONAL_CAPABILITY_LABEL: Readonly<Record<OptionalCapability, string>> = {
  bookmarks: '书签访问',
  downloads: '下载记录（只读）',
};

/** Readable, non-secret permission list for a capability. */
export function permissionsOf(cap: OptionalCapability): string[] {
  return [...OPTIONAL_CAPABILITY_PERMISSIONS[cap]];
}

/** Minimal `chrome.permissions` shape (only what this module uses). */
export interface PermissionsApiLike {
  contains(permissions: { permissions?: string[] }): Promise<boolean>;
  request(permissions: { permissions?: string[] }): Promise<boolean>;
  remove?(permissions: { permissions?: string[] }): Promise<boolean>;
}

/** Whether a capability's permission is currently granted (fail-safe false). */
export async function hasCapabilityPermission(
  api: PermissionsApiLike | undefined,
  cap: OptionalCapability,
): Promise<boolean> {
  if (!api?.contains) return false;
  try {
    return (await api.contains({ permissions: permissionsOf(cap) })) === true;
  } catch {
    // A `contains` failure must never read as "granted".
    return false;
  }
}

/**
 * Request a capability permission **with an explicit gesture**. Only call this
 * synchronously from a click handler; `api.request` is invoked before the first
 * `await` so the gesture is preserved. Never call from the SW.
 */
export function requestCapabilityPermissionOnGesture(
  cap: OptionalCapability,
  api?: PermissionsApiLike,
): Promise<{ granted: boolean; error?: string }> {
  const target = api ?? capabilityPermissionsApi();
  if (!target?.request) {
    return Promise.resolve({ granted: false, error: '当前上下文不支持 chrome.permissions.request（请从扩展页面/侧栏点击）' });
  }
  try {
    // Synchronous call inside the gesture — do not insert an `await` before it.
    return target
      .request({ permissions: permissionsOf(cap) })
      .then((granted) => (granted ? { granted: true } : { granted: false, error: '用户未授予该权限（或已取消）' }))
      .catch((err: unknown) => ({ granted: false, error: err instanceof Error ? err.message : String(err) }));
  } catch (err) {
    return Promise.resolve({ granted: false, error: err instanceof Error ? err.message : String(err) });
  }
}

/** Remove a capability permission (optional; used only for an explicit revoke). */
export async function removeCapabilityPermission(
  api: PermissionsApiLike | undefined,
  cap: OptionalCapability,
): Promise<{ removed: boolean; error?: string }> {
  if (!api?.remove) return { removed: false, error: '当前上下文不支持 chrome.permissions.remove' };
  try {
    return { removed: (await api.remove({ permissions: permissionsOf(cap) })) === true };
  } catch (err) {
    return { removed: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Lazy accessor for the real `chrome.permissions` (undefined outside Chrome). */
export function capabilityPermissionsApi(): PermissionsApiLike | undefined {
  const chromeLike = (globalThis as unknown as { chrome?: { permissions?: PermissionsApiLike } }).chrome;
  return chromeLike?.permissions;
}

/**
 * Whether a `chrome.permissions` change event touches a capability (used by the
 * `onAdded` / `onRemoved` reconciliation so a grant/revoke of bookmarks or
 * downloads is never missed).
 */
export function changeTouchesCapability(
  change: { permissions?: string[]; origins?: string[] } | undefined,
  cap: OptionalCapability,
): boolean {
  const granted = new Set(change?.permissions ?? []);
  return permissionsOf(cap).every((p) => granted.has(p));
}
