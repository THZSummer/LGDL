/**
 * V4-1 TASK-504 / FR-CHAT-011 / NFR-CHAT-008 — the three-state theme controller.
 *
 * `auto → light → dark → auto`, persisted under the **existing** `storage`
 * permission (no new manifest permission — red line #7 of this leaf):
 *
 *   · `auto`   ⇒ `documentElement` carries NO `data-theme` attribute ⇒ the
 *                `prefers-color-scheme` media query decides (follow the system);
 *   · `light`  ⇒ `data-theme="light"`;
 *   · `dark`   ⇒ `data-theme="dark"`.
 *
 * EC-CHAT-014: a read or write failure degrades to `auto` and **never blocks the
 * UI** — every storage call is wrapped, and the click handler cannot throw.
 *
 * The current state is expressed on three channels (NFR-CHAT-004: never colour
 * alone): the visible label text, `data-theme-state`, and `aria-pressed`.
 *
 * @module theme
 */

export type ThemeState = 'auto' | 'light' | 'dark';

/** The cycle order, verbatim (FR-CHAT-011). */
export const THEME_CYCLE: readonly ThemeState[] = Object.freeze(['auto', 'light', 'dark']);

/** Storage key inside the existing `web-cli` namespace. */
export const THEME_STORAGE_KEY = 'theme';
/** Full chrome.storage.local key (the panel's own namespace prefix). */
export const THEME_STORAGE_FULL_KEY = 'web-cli:theme';

/** Visible label per state (channel ①). */
export const THEME_LABELS: Readonly<Record<ThemeState, string>> = Object.freeze({
  auto: '主题：跟随系统',
  light: '主题：浅色',
  dark: '主题：深色',
});

/** True when `value` is one of the three legal states. */
export function isThemeState(value: unknown): value is ThemeState {
  return value === 'auto' || value === 'light' || value === 'dark';
}

/** Next state in the cycle; an unknown input degrades to `auto`. */
export function nextTheme(current: unknown): ThemeState {
  const state: ThemeState = isThemeState(current) ? current : 'auto';
  const index = THEME_CYCLE.indexOf(state);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
}

/** Minimal element surface (keeps the module stub-testable). */
export interface ThemeElement {
  textContent?: string | null;
  hidden?: boolean;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  removeAttribute(name: string): void;
  addEventListener?(type: string, listener: () => void): void;
}

export interface ThemeDoc {
  documentElement: ThemeElement;
  getElementById(id: string): ThemeElement | null;
}

export interface ThemeStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<void>;
}

export interface ThemeHandle {
  readonly state: ThemeState;
  set(state: ThemeState): ThemeState;
  cycle(): ThemeState;
  /** Re-read the persisted value; any failure degrades to `auto`. */
  load(): Promise<ThemeState>;
}

/**
 * Write the state onto the document + the button. `auto` **removes** the
 * attribute (rather than writing `data-theme="auto"`) so the media query wins.
 */
export function applyTheme(doc: ThemeDoc, state: ThemeState): void {
  if (state === 'auto') doc.documentElement.removeAttribute('data-theme');
  else doc.documentElement.setAttribute('data-theme', state);
  const btn = doc.getElementById('theme-toggle');
  if (!btn) return;
  btn.setAttribute('data-theme-state', state);
  btn.setAttribute('aria-pressed', String(state !== 'auto'));
  btn.setAttribute('aria-label', `切换主题（当前：${state === 'auto' ? '跟随系统' : state === 'light' ? '浅色' : '深色'}）`);
  const label = THEME_LABELS[state];
  if (btn.textContent !== label) btn.textContent = label;
}

/** A never-throwing storage adapter over `chrome.storage.local`. */
export function chromeThemeStorage(namespace = 'web-cli'): ThemeStorage {
  const full = `${namespace}:${THEME_STORAGE_KEY}`;
  return {
    async get(key: string) {
      const area = (globalThis as { chrome?: { storage?: { local?: { get(k: string): Promise<Record<string, unknown>> } } } })
        .chrome?.storage?.local;
      if (!area) throw new Error('chrome.storage.local unavailable');
      const data = await area.get(key);
      return data?.[key];
    },
    async set(key: string, value: string) {
      const area = (globalThis as { chrome?: { storage?: { local?: unknown } } }).chrome?.storage?.local;
      if (!area) throw new Error('chrome.storage.local unavailable');
      const write = (area as { set(items: Record<string, unknown>): Promise<void> }).set;
      await write.call(area, { [key]: value });
    },
  };
}

/**
 * Mount the controller. `storage` defaults to the existing `storage` permission
 * path; a stub can be injected by the unit tests.
 */
export function mountTheme(
  doc: ThemeDoc,
  storage: ThemeStorage = chromeThemeStorage(),
  fullKey = THEME_STORAGE_FULL_KEY,
): ThemeHandle {
  let state: ThemeState = 'auto';
  const btn = doc.getElementById('theme-toggle');

  const commit = (next: ThemeState): ThemeState => {
    state = next;
    applyTheme(doc, state);
    return state;
  };

  const handle: ThemeHandle = {
    get state() {
      return state;
    },
    set(next: ThemeState) {
      const safe: ThemeState = isThemeState(next) ? next : 'auto';
      commit(safe);
      // Persist, but never let a storage failure break the UI (EC-CHAT-014).
      void storage.set(fullKey, safe).catch(() => {
        /* EC-CHAT-014: 持久化失败 ⇒ 保持当前态，主流程不阻断 */
      });
      return safe;
    },
    cycle() {
      return handle.set(nextTheme(state));
    },
    async load() {
      try {
        const stored = await storage.get(fullKey);
        return commit(isThemeState(stored) ? stored : 'auto');
      } catch {
        // EC-CHAT-014: 读失败 ⇒ 降级「跟随系统」，不阻断界面。
        return commit('auto');
      }
    },
  };

  applyTheme(doc, state);
  btn?.addEventListener?.('click', () => {
    try {
      handle.cycle();
    } catch {
      /* a theme click must never take the panel down */
    }
  });
  return handle;
}
