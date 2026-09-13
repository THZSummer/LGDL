/**
 * Capability privacy toggles (permission-backed tools) — FR-054 / FR-055.
 *
 * Mirrors the `tabs` privacy-switch approach (FR-049): a disabled capability is
 * **removed from the LLM tool surface** (`deriveTools()`), not merely hidden in
 * the UI, and dispatch is rejected readably. Defaults follow the author rulings:
 *
 *   bookmarks  read  → ON  (listing/searching saved pages is the low-risk half)
 *   bookmarks  write → OFF (add/remove/move need an explicit opt-in; remove is
 *                           additionally destructive and never auto-authorized)
 *   downloads  read  → ON  (read-only; cancel/pause/erase/open are NOT built)
 *   notify           → ON  (TASK-039: sending a system notice is the intended use;
 *                           the tool still requires the `notifications` grant)
 *   clipboard  read  → OFF (TASK-039: privacy-sensitive;「重提示 + 隐私敏感」→ the
 *                           user must opt in explicitly)
 *   clipboard  write → ON  (TASK-039: writing the user's own text is the low-risk
 *                           half; still `write`→ask, never auto-authorized)
 *
 * The storage backend is injected (structurally compatible with the other plugin
 * stores) so this module is node-testable.
 */
export interface CapabilitySettingKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

/** Storage key (namespaced by the injected `chrome.storage` kv). */
export const CAPABILITY_SETTING_KEY = 'web-cli:capability-settings';

export interface CapabilitySettingState {
  /** Whether `bookmarks` read subcommands (list/search/tree) are exposed. */
  bookmarksRead: boolean;
  /** Whether `bookmarks` write subcommands (add/remove/move) are exposed. */
  bookmarksWrite: boolean;
  /** Whether the read-only `downloads` tool is exposed. */
  downloadsRead: boolean;
  /** Whether the `notify` tool (list / send / clear) is exposed. */
  notify: boolean;
  /** Whether the `clipboard` read subcommand is exposed (default OFF). */
  clipboardRead: boolean;
  /** Whether the `clipboard` write subcommand is exposed (default ON). */
  clipboardWrite: boolean;
}

/** Documented defaults (a missing/invalid record resolves here, fail-safe). */
export const CAPABILITY_SETTING_DEFAULTS: Readonly<CapabilitySettingState> = {
  bookmarksRead: true,
  bookmarksWrite: false,
  downloadsRead: true,
  notify: true,
  clipboardRead: false,
  clipboardWrite: true,
};

interface PersistedCapabilitySetting extends Partial<CapabilitySettingState> {}

export interface CapabilitySettingStore {
  /** Hydrate the cached value from storage (call once at startup). */
  load(): Promise<void>;
  /** Current cached state (never a live object — callers cannot mutate it). */
  get(): CapabilitySettingState;
  /** Merge + persist a partial change; returns the full new state. */
  save(patch: Partial<CapabilitySettingState>): Promise<CapabilitySettingState>;
}

const boolOf = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

export function createCapabilitySettingStore(kv: CapabilitySettingKv): CapabilitySettingStore {
  let state: CapabilitySettingState = { ...CAPABILITY_SETTING_DEFAULTS };

  const persist = async (): Promise<void> => {
    await kv.set(CAPABILITY_SETTING_KEY, { ...state } satisfies PersistedCapabilitySetting);
  };

  const normalize = (stored: Partial<CapabilitySettingState> | undefined): CapabilitySettingState => ({
    bookmarksRead: boolOf(stored?.bookmarksRead, CAPABILITY_SETTING_DEFAULTS.bookmarksRead),
    bookmarksWrite: boolOf(stored?.bookmarksWrite, CAPABILITY_SETTING_DEFAULTS.bookmarksWrite),
    downloadsRead: boolOf(stored?.downloadsRead, CAPABILITY_SETTING_DEFAULTS.downloadsRead),
    notify: boolOf(stored?.notify, CAPABILITY_SETTING_DEFAULTS.notify),
    clipboardRead: boolOf(stored?.clipboardRead, CAPABILITY_SETTING_DEFAULTS.clipboardRead),
    clipboardWrite: boolOf(stored?.clipboardWrite, CAPABILITY_SETTING_DEFAULTS.clipboardWrite),
  });

  return {
    async load() {
      try {
        const stored = await kv.get<PersistedCapabilitySetting>(CAPABILITY_SETTING_KEY);
        state = normalize(stored);
      } catch {
        // A storage read failure keeps the documented defaults; it must never
        // silently flip a privacy preference without a readable error at the
        // call site.
        state = { ...CAPABILITY_SETTING_DEFAULTS };
      }
    },
    get() {
      return { ...state };
    },
    async save(patch) {
      const merged = { ...state, ...patch };
      state = normalize(merged);
      await persist();
      return { ...state };
    },
  };
}
