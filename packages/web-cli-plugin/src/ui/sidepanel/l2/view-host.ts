/**
 * V3-3 TASK-302 (FR-V3-047 / FR-V3-048 / FR-V3-054 / NFR-V3-011 — ADR-V3-025) — the
 * **L2 view host**: the view *replacement* mechanism.
 *
 * `#view-host` is a **sibling of `#log` inside `#panel-main`** (index.html). Opening
 * an L2 view therefore:
 *
 *   1. hides `#log` (`hidden` attribute — never `display:none` / `opacity` / a
 *      "moved out of the viewport" trick, EC-V3-010) and reveals `#view-host`;
 *   2. reveals exactly ONE `[data-l2-view]` container (the other three stay
 *      `hidden`, so the four views cost nothing in the default state);
 *   3. writes the shared header (title + count) from the same `L2Counts` the entry
 *      panel uses — the entry, the status bar and the view title cannot diverge;
 *   4. moves focus into the view title (`tabindex="-1"`).
 *
 * Returning (`← 返回` / `Esc`) reverses all of it **and** restores the disclosure
 * expansion snapshot taken on entry (`disclosure.restore`), so a round-trip into a
 * view comes back exactly as it was (FR-V3-047 / FR-V3-054). `#log` keeps its own
 * scroll position / draft because it is only hidden, never rebuilt (the v1
 * settings round-trip contract, reused).
 *
 * Two structural guarantees:
 *
 *   * **One panel-level scroller.** While a view is open `#log` is `hidden`, so the
 *     only scroller inside `#panel-main` is the open view's own local scroll block
 *     — no second panel-level container is introduced (FR-V3-047).
 *   * **The risk rail is never replaced.** `#risk-rail` (and `#l0-statusbar`) are
 *     `body` children, not descendants of `#panel-main`, so view replacement
 *     cannot reach them (FR-V3-048).
 *
 * @module l2/view-host
 */
import type { DisclosureController } from '../disclosure.js';
import type { L2Counts, L2ViewKey } from './counts.js';
import { L2_VIEW_TITLES, l2EntryCount, l2ViewCountText } from './counts.js';

/** The three views hosted by `#view-host` (`settings` has its own v1 view switch). */
export const VIEW_HOST_KEYS: readonly Exclude<L2ViewKey, 'settings'>[] = Object.freeze(['tree', 'commands', 'audit']);

export interface ViewHostHandle {
  /** Open `key`. Returns the key actually opened (null when it is not host-bound). */
  open(key: L2ViewKey): L2ViewKey | null;
  /** Return to the transcript (restores the entry-time expansion snapshot). */
  close(): void;
  /** `true` while a view is open. */
  isOpen(): boolean;
  /** The open view key (null when closed). */
  current(): Exclude<L2ViewKey, 'settings'> | null;
  /** Re-write the open view's header count (called from the panel's `render()`). */
  syncCounts(): void;
  /** Re-sync the four `#l2-entry-*` triggers' `aria-expanded` pair. */
  syncAria(): void;
}

export interface MountViewHostDeps {
  doc: Document;
  disclosure: DisclosureController;
  /** The ONE count source (shared with the entry panel / status bar). */
  getCounts(): L2Counts;
  /** Called after a successful `close()` (the panel repaints). */
  onClosed?(): void;
}

function forced<T extends HTMLElement>(doc: Document, selector: string, what: string): T {
  const el = doc.querySelector(selector);
  if (!el) throw new Error(`l2/view-host: 缺少 DOM 契约 ${selector}（${what}）`);
  return el as T;
}

export function mountViewHost(deps: MountViewHostDeps): ViewHostHandle {
  const { doc, disclosure } = deps;
  const host = forced<HTMLElement>(doc, '#view-host', '视图宿主');
  const log = forced<HTMLElement>(doc, '#log', '会话记录区（被替换的主区）');
  const title = forced<HTMLElement>(doc, '#l2-title', '视图标题');
  const count = forced<HTMLElement>(doc, '#l2-count', '视图计数');
  const views = new Map<Exclude<L2ViewKey, 'settings'>, HTMLElement>();
  for (const key of VIEW_HOST_KEYS) {
    const el = forced<HTMLElement>(doc, `[data-l2-view="${key}"]`, `${key} 视图容器`);
    views.set(key, el);
    el.hidden = true;
  }

  /** `null` = closed. */
  let current: Exclude<L2ViewKey, 'settings'> | null = null;
  /** Disclosure state captured on entry (restored on exit). */
  let snapshot: Record<string, boolean> | null = null;

  const syncAria = (): void => {
    const hostOpen = host.hidden === false;
    const settingsOpen = doc.getElementById('settings-view')?.hidden === false;
    for (const key of ['tree', 'commands', 'audit', 'settings'] as const) {
      const btn = doc.getElementById(`l2-entry-${key}`);
      if (!btn) continue;
      // `settings` opens the v1 settings view (its own `#settings-back` returns),
      // so its pair must track THAT view, not `#view-host`.
      btn.setAttribute('aria-expanded', String(key === 'settings' ? settingsOpen : hostOpen));
    }
  };

  const paintHeader = (key: Exclude<L2ViewKey, 'settings'>): void => {
    const counts = deps.getCounts();
    title.textContent = L2_VIEW_TITLES[key];
    count.textContent = l2ViewCountText(key, counts);
    // The numeric channel: the SAME value the entry panel writes into its own
    // `data-count`, so "entry ≡ view header" is a machine fact (FR-V3-046).
    const numeric = l2EntryCount(key, counts);
    count.setAttribute('data-count', numeric === null ? 'n/a' : String(numeric));
  };

  const open = (key: L2ViewKey): L2ViewKey | null => {
    if (key === 'settings') {
      // The settings view is the v1 in-panel view (`#settings-view`); it keeps its
      // own switch and its own back button. The host stays closed.
      return null;
    }
    if (current === null) {
      // Entry: snapshot the expansion state ONCE, then replace the content area.
      snapshot = disclosure.snapshot();
      log.hidden = true;
      host.hidden = false;
    }
    for (const [k, el] of views) el.hidden = k !== key;
    current = key;
    host.setAttribute('data-view', key);
    paintHeader(key);
    // Focus moves into the view (ARIA/焦点成对); the title is the announced root.
    if (typeof title.focus === 'function') title.focus();
    syncAria();
    return key;
  };

  const close = (): void => {
    const previous = current;
    current = null;
    host.hidden = true;
    host.removeAttribute('data-view');
    for (const [, el] of views) el.hidden = true;
    log.hidden = false;
    if (snapshot) {
      disclosure.restore(snapshot);
      snapshot = null;
    }
    // Focus returns to the entry that opened the view (its disclosure trigger).
    const trigger = doc.getElementById(previous ? `l2-entry-${previous}` : 'l0-statusbar');
    if (trigger && typeof trigger.focus === 'function') trigger.focus();
    syncAria();
    if (previous !== null) deps.onClosed?.();
  };

  // `Esc` inside a view returns to the transcript — unless an inner component
  // already consumed the key (the tree drawer's own handler calls
  // `preventDefault()` when it closes itself, which must win).
  doc.addEventListener('keydown', (event) => {
    const ev = event as KeyboardEvent;
    if (ev.key !== 'Escape' || ev.defaultPrevented || current === null) return;
    ev.preventDefault();
    close();
  });

  // Default state: nothing of the host is visible (`#view-host` carries `hidden`
  // in the markup) — asserted by `test/ui/l2.mjs`.
  syncAria();

  return {
    open,
    close,
    isOpen: () => current !== null,
    current: () => current,
    syncCounts() {
      if (current === null) return;
      paintHeader(current);
    },
    syncAria,
  };
}
