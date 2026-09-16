/**
 * V3-4 TASK-406 (ADR-V3-032 / FR-V3-064) — the self-drawn context menu.
 *
 * ── Why self-drawn ───────────────────────────────────────────────────────────
 *
 * `manifest.json` has no `contextMenus` and no `optional_permissions` entry for it.
 * Using the platform menu API would therefore mean adding a permission, which the
 * leaf's red line forbids (AC-V3-017 / R-UI-004). The menu is drawn in the pick
 * layer's shadow root instead — the price is that we are hijacking the page's
 * right-click, and the price is paid back by the **three concessions**:
 *
 *   ① the layer only exists on an authorized origin, so an unauthorized site's
 *      `contextmenu` is never touched (structural: `executeScript` is denied there);
 *   ② the first item hands the NEXT right-click back to the page's own menu
 *      (`nativeOnce`);
 *   ③ `Esc` and a click outside close the menu without performing any action.
 *
 * ── Keyboard / ARIA ──────────────────────────────────────────────────────────
 *
 * `role="menu"` + one `role="menuitem"` per row, roving `tabindex` (only the active
 * row is focusable), `ArrowUp`/`ArrowDown`/`Home`/`End` to move, `Enter`/`Space` to
 * activate, `Esc` to close. Rows that cannot act carry `aria-disabled="true"` and
 * are **skipped** by the arrow keys, so the keyboard never lands on a dead item.
 *
 * ── No clipboard ─────────────────────────────────────────────────────────────
 *
 * The design baseline lists a「复制选择器」item that was withdrawn together with
 * `clipboard.write`; it is deliberately NOT offered here — a copy path would need a
 * clipboard permission and would put host page text into the clipboard without a
 * user-visible contract.
 *
 * @module content/pick-menu
 */

/** The five rows, in order. `label` is user-visible copy (asserted verbatim). */
export interface MenuItem {
  key: string;
  label: string;
  /** `true` for the escape hatch that restores the page's own menu. */
  native?: boolean;
  /** Read at open time; a disabled row is skipped by the keyboard. */
  enabled?: boolean;
}

export const MENU_ITEM_KEYS = Object.freeze([
  'ref',
  'target',
  'ref-selection',
  'pick-here',
  'native',
] as const);
export type MenuItemKey = (typeof MENU_ITEM_KEYS)[number];

/** The page's own menu escape hatch — the exact copy the gate asserts. */
export const NATIVE_MENU_LABEL = '交给页面原生菜单';

/** The row copy, keyed by the frozen key list (ONE definition of the row set). */
const MENU_ITEM_LABELS: Readonly<Record<MenuItemKey, string>> = Object.freeze({
  'ref': '引用到 web-cli（纳入引用）',
  'target': '用这里作为操作目标',
  'ref-selection': '引用选中文本',
  'pick-here': '在此处拾取',
  'native': NATIVE_MENU_LABEL,
});

/** Build the row list from {@link MENU_ITEM_KEYS}; only one row depends on live state. */
export function menuItems(hasSelection: boolean): MenuItem[] {
  return MENU_ITEM_KEYS.map((key) => ({
    key,
    label: MENU_ITEM_LABELS[key],
    ...(key === 'ref-selection' && !hasSelection ? { enabled: false } : {}),
    ...(key === 'native' ? { native: true } : {}),
  }));
}

export interface MenuHandle {
  open(x: number, y: number, ctx: { hasSelection: boolean }): void;
  close(): void;
  /** True while the menu is on screen — the only time `contextmenu` is swallowed. */
  isOpen(): boolean;
  /** The escape hatch's copy — always the last row and always reachable. */
  readonly nativeLabel: string;
}

export interface MenuDeps {
  shadow: ShadowRoot;
  onSelect(key: MenuItemKey): void;
  /** ② the next `contextmenu` must reach the page untouched. */
  onNativeOnce(): void;
}

export function createMenu(deps: MenuDeps, doc: Document = document): MenuHandle {
  const host = doc.createElement('div');
  host.className = 'menu';
  host.setAttribute('role', 'menu');
  host.setAttribute('aria-label', '页面操作菜单');
  host.hidden = true;
  host.style.cssText =
    'position:fixed;min-width:216px;padding:4px;border-radius:8px;background:#fff;' +
    'border:1px solid rgba(0,0,0,.12);box-shadow:0 8px 28px rgba(0,0,0,.22);pointer-events:auto;' +
    'color:#111827;font:12px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;';
  deps.shadow.appendChild(host);
  const rows: HTMLElement[] = [];
  let items: MenuItem[] = [];

  const close = (): void => {
    host.hidden = true;
    for (const row of rows) row.setAttribute('data-active', 'false');
  };

  const activate = (index: number): void => {
    const item = items[index];
    if (!item) return;
    if (item.native) deps.onNativeOnce();
    close();
    deps.onSelect(item.key as MenuItemKey);
  };

  const activeIndex = (): number => rows.findIndex((row) => row.getAttribute('data-active') === 'true');
  /** Positions (in `enabled` space) the keyboard is allowed to land on. */
  const enabledIndexes = (): number[] =>
    items.map((item, i) => (item.enabled === false ? -1 : i)).filter((i) => i >= 0);

  /** Move to the next enabled row, wrapping; disabled rows are never landed on. */
  const move = (delta: number, absolute?: number): void => {
    const enabled = enabledIndexes();
    if (enabled.length === 0) return;
    const from = Math.max(0, enabled.indexOf(activeIndex()));
    const nextPos =
      absolute !== undefined
        ? Math.max(0, Math.min(enabled.length - 1, absolute))
        : (from + delta + enabled.length) % enabled.length;
    const target = enabled[nextPos];
    for (let i = 0; i < rows.length; i += 1) {
      const on = i === target;
      rows[i].setAttribute('data-active', String(on));
      rows[i].tabIndex = on ? 0 : -1;
      if (on) rows[i].focus?.();
    }
  };

  host.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement | null)?.closest?.('[data-menu-key]') as HTMLElement | null;
    if (!row) return;
    const index = rows.indexOf(row);
    const item = items[index];
    if (!item || item.enabled === false) return;
    ev.stopPropagation();
    activate(index);
  });
  host.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'ArrowDown') return void (ev.preventDefault(), move(1));
    if (ev.key === 'ArrowUp') return void (ev.preventDefault(), move(-1));
    if (ev.key === 'Home') return void (ev.preventDefault(), move(1, 0));
    if (ev.key === 'End') {
      const last = items.filter((i) => i.enabled !== false).length - 1;
      return void (ev.preventDefault(), move(1, last));
    }
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      const index = activeIndex();
      if (index >= 0) activate(index);
      return;
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
      return;
    }
    return undefined;
  });

  return {
    isOpen: () => host.hidden === false,
    open(x, y, ctx) {
      items = menuItems(ctx.hasSelection);
      host.textContent = '';
      rows.length = 0;
      for (const item of items) {
        const row = doc.createElement('div');
        row.className = 'menu-item';
        row.setAttribute('role', 'menuitem');
        row.setAttribute('data-menu-key', item.key);
        row.setAttribute('data-active', 'false');
        row.tabIndex = -1;
        row.textContent = item.label;
        row.style.cssText = 'padding:5px 9px;border-radius:5px;cursor:default;';
        if (item.enabled === false) row.setAttribute('aria-disabled', 'true');
        if (item.native) row.setAttribute('data-native', 'true');
        row.style.borderTop = item.native ? '1px solid rgba(0,0,0,.10)' : '';
        row.style.marginTop = item.native ? '3px' : '';
        host.appendChild(row);
        rows.push(row);
      }
      host.hidden = false;
      const vw = doc.defaultView?.innerWidth ?? 0;
      const vh = doc.defaultView?.innerHeight ?? 0;
      // Clamp into the viewport (ADR-V3-032 §6) — a menu opened near an edge stays
      // fully reachable instead of overflowing off-screen.
      host.style.left = `${Math.max(0, Math.min(x, vw - 236))}px`;
      host.style.top = `${Math.max(0, Math.min(y, vh - 190))}px`;
      move(1, 0);
    },
    close,
    get nativeLabel() {
      return NATIVE_MENU_LABEL;
    },
  };
}
