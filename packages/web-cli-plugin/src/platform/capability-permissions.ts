/**
 * Optional-permission capabilities (`bookmarks` / `downloads` / `notify` /
 * `clipboard`) — FR-054 (TASK-038) + FR-055 (TASK-039).
 *
 * Author decision (2026-09-13): every capability here is declared as an
 * **optional permission**, never as a static `permissions` entry. Rationale: a
 * static addition makes Chrome **disable already-installed extensions on update**
 * until the user re-consents; optional keeps the static install surface unchanged
 * and can be revoked per capability.
 *
 *   bookmarks  → ['bookmarks']                          (read + write)
 *   downloads  → ['downloads']                          (read-only)
 *   notify     → ['notifications']                      (read + write)
 *   clipboard  → ['clipboardRead', 'clipboardWrite']    (read + write; read
 *                                                        privacy toggle defaults
 *                                                        OFF — see capability-setting)
 *
 * ── Chrome optional-permission eligibility (TASK-039, verified 2026-09-13)
 * All three new permissions ARE eligible for `optional_permissions` on the
 * target Chromium (151.0.7922.34): a real load accepts them and a real
 * `chrome.permissions.request` inside a gesture resolves to a prompt (PENDING),
 * never to「Only permissions specified in the manifest may be requested」. The
 * same probe shows `debugger` / `proxy` / `geolocation` / `declarativeNetRequest`
 * DO get that rejection (i.e. they cannot be optional), so the check is not a
 * false negative. Evidence is recorded in build.md §37.2.
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

/** The optional-permission capabilities approved so far. */
export type OptionalCapability = 'bookmarks' | 'downloads' | 'notify' | 'clipboard';

/** The exact manifest permission list each capability needs. */
export const OPTIONAL_CAPABILITY_PERMISSIONS: Readonly<Record<OptionalCapability, readonly string[]>> = {
  bookmarks: ['bookmarks'],
  downloads: ['downloads'],
  notify: ['notifications'],
  clipboard: ['clipboardRead', 'clipboardWrite'],
};

/** The LLM tool each capability backs (used for settings status + suppression). */
export const OPTIONAL_CAPABILITY_TOOL: Readonly<Record<OptionalCapability, string>> = {
  bookmarks: 'bookmarks',
  downloads: 'downloads',
  notify: 'notify',
  clipboard: 'clipboard',
};

/** Human-readable capability label (settings view). */
export const OPTIONAL_CAPABILITY_LABEL: Readonly<Record<OptionalCapability, string>> = {
  bookmarks: '书签访问',
  downloads: '下载记录（只读）',
  notify: '系统通知',
  clipboard: '剪贴板访问',
};

/** All capabilities (stable order for settings rows / reconciliation loops). */
export const OPTIONAL_CAPABILITIES: readonly OptionalCapability[] = ['bookmarks', 'downloads', 'notify', 'clipboard'];

/**
 * V5-2 **TASK-V5-138/139** (ADR-V5-004 §3 · FR-ALLN-043) — one capability as a
 * `form` option. The `askuser#form` card and `op.perm.request` both read THIS list,
 * so the option source has exactly one declaration (no second名册).
 *
 * `scope` is the readable permission list the capability needs (`clipboard` has two).
 */
export interface CapabilityFormOption {
  readonly id: OptionalCapability;
  readonly label: string;
  readonly scope: string;
}

/**
 * The `form` option pool — **derived** from {@link OPTIONAL_CAPABILITIES} (never a
 * second hand-written list, ADR-V5-004 §3). `settings/ops.ts#loadCapabilities` and the
 * `op.perm.request` params both consume the same constants, so a new permission cannot
 * be offered by the card without entering the registry.
 */
export const OPTIONAL_CAPABILITY_FORM_OPTIONS: readonly CapabilityFormOption[] = Object.freeze(
  OPTIONAL_CAPABILITIES.map((id) =>
    Object.freeze({ id, label: OPTIONAL_CAPABILITY_LABEL[id], scope: OPTIONAL_CAPABILITY_PERMISSIONS[id].join(' · ') }),
  ),
);

/** Whether a raw id is a **registered** capability (the runtime「新增项必须在册」judge). */
export function isRegisteredCapability(id: string): id is OptionalCapability {
  return (OPTIONAL_CAPABILITIES as readonly string[]).includes(id);
}

/**
 * The loud half: the ids the caller offered that are **not** in the registry. Runtime
 * validation (§139) refuses the op instead of silently skipping an unknown item.
 */
export function unregisteredCapabilityIds(ids: readonly string[]): string[] {
  return ids.filter((id) => !isRegisteredCapability(id));
}

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
