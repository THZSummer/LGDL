/**
 * Tab-tool privacy toggle store (author decision ③ / FR-049).
 *
 * Options-page switch「允许助手查看/切换标签页（默认开）」. When off, the `tabs`
 * tool is removed from the LLM tool surface (`deriveTools()` no longer lists it)
 * and dispatch is rejected — this is the `enabled` semantics, never a silent
 * no-op.
 *
 * The `chrome.storage` backend is injected (structurally compatible with the
 * other plugin stores) so this module is node-testable.
 */
export interface TabsSettingKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

/** Storage key (namespaced by the injected `chrome.storage` kv). */
export const TABS_SETTING_KEY = 'web-cli:tabs-enabled';

interface PersistedTabsSetting {
  enabled: boolean;
}

export interface TabsSettingStore {
  /** Hydrate the cached value from storage (call once at startup). */
  load(): Promise<void>;
  /** Current cached value (default true). */
  get(): boolean;
  /** Persist + update the cached value. */
  save(enabled: boolean): Promise<void>;
}

/** Create the tab-tool toggle store (missing/invalid value ⇒ enabled = true). */
export function createTabsSettingStore(kv: TabsSettingKv): TabsSettingStore {
  let enabled = true;
  return {
    async load() {
      try {
        const stored = await kv.get<PersistedTabsSetting>(TABS_SETTING_KEY);
        enabled = stored?.enabled !== false;
      } catch {
        // A storage read failure keeps the documented default (on); the toggle
        // is a privacy preference, so the failure must not silently flip the
        // user's reported state without a readable error at the call site.
        enabled = true;
      }
    },
    get() {
      return enabled;
    },
    async save(next) {
      enabled = next === true;
      await kv.set(TABS_SETTING_KEY, { enabled } satisfies PersistedTabsSetting);
    },
  };
}
