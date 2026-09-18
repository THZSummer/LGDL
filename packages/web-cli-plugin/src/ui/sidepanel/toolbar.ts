/**
 * V4-1 TASK-504 / ADR-V4-018 — the toolbar renderer (`#region-toolbar`).
 *
 * The admission rule, machine-checkable (FR-CHAT-011 / FR-CHAT-012):
 *
 *   · **可点 = 5** = 4 view entries (`#l2-entry-*`, each `data-toolbar-slot="view"`)
 *     + the theme toggle (`data-toolbar-slot="theme"`). `.site-summary` is a
 *     read-only `role=status` box, so it is **not** a clickable and never counts.
 *   · The 4 entries' badge values come from the SAME single source the view
 *     titles use (`L0View.statusbar.entries`, produced by `l2/counts.ts#deriveCounts`)
 *     — this module deliberately contains **no** counting logic.
 *   · A 6th clickable can only appear through an explicit, registered swap: this
 *     module refuses to render more than 5 and throws instead (silent overflow is
 *     the failure mode the rule exists to prevent). Registered swaps live in
 *     `docs/v4-supersession-ledger.json#toolbarAdmissions`.
 *
 * @module toolbar
 */
import type { L0View } from './view-model.js';

/** `data-toolbar-slot` values (the admission taxonomy). */
export const TOOLBAR_SLOTS = Object.freeze(['view', 'theme'] as const);

/** The hard admission ceiling (FR-CHAT-011). */
export const MAX_TOOLBAR_CLICKABLES = 5;

/** The four view entry keys, in document order. */
export const TOOLBAR_ENTRY_KEYS = Object.freeze(['tree', 'commands', 'audit', 'settings'] as const);

/** The per-target `aria-controls` mapping (ADR-V4-022 第 3 条). */
export const ENTRY_TARGETS: Readonly<Record<string, string>> = Object.freeze({
  tree: 'view-host',
  commands: 'view-host',
  audit: 'view-host',
  settings: 'settings-view',
});

export interface ToolbarHandle {
  render(view: L0View): void;
  /** Count the *clickable* elements actually present (gate seam). */
  clickableCount(): number;
  /** Re-sync the per-target `aria-expanded` (shared with the view host). */
  syncTriggerAria(): void;
}

/** Count the clickables inside the toolbar, using the SAME rule C1 uses. */
export function countToolbarClickables(root: ParentNode): number {
  const all = Array.from(root.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'));
  return all.filter((el) => {
    if (el.getAttribute('tabindex') === '-1' && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return false;
    let node: Element | null = el;
    while (node) {
      if ((node as HTMLElement).hidden === true) return false;
      node = node.parentElement;
    }
    return true;
  }).length;
}

export function mountToolbar(doc: Document): ToolbarHandle {
  const bar = doc.getElementById('region-toolbar');
  const summary = doc.getElementById('l2-entry-summary');
  if (!bar || !summary) throw new Error('toolbar: 缺少 DOM 契约（#region-toolbar / #l2-entry-summary）');

  const buttonFor = (key: string): HTMLButtonElement | null => {
    const el = doc.getElementById(`l2-entry-${key}`);
    return el instanceof HTMLButtonElement ? el : null;
  };

  const syncTriggerAria = (): void => {
    const hostOpen = doc.getElementById('view-host')?.hidden === false;
    const settingsOpen = doc.getElementById('settings-view')?.hidden === false;
    for (const key of TOOLBAR_ENTRY_KEYS) {
      const btn = buttonFor(key);
      if (!btn) continue;
      btn.setAttribute('aria-expanded', String(key === 'settings' ? settingsOpen : hostOpen));
    }
  };

  return {
    syncTriggerAria,
    clickableCount(): number {
      return countToolbarClickables(bar);
    },
    render(view: L0View): void {
      summary.textContent = view.statusbar.summary;
      for (const entry of view.statusbar.entries) {
        const btn = buttonFor(entry.key);
        if (!btn) continue;
        // The badge is the visible count; the label stays stable so the toolbar
        // footprint does not jitter between renders (the C2 caliber measures text).
        const badge = btn.querySelector('.badge');
        const text = entry.count < 0 ? 'n/a' : String(entry.count);
        if (badge) badge.textContent = text;
        else btn.textContent = `${entry.label} · ${text}`;
        btn.setAttribute('data-count', text);
        btn.setAttribute('aria-controls', ENTRY_TARGETS[entry.key] ?? 'view-host');
      }
      // Admission is asserted on every render: 4 entries + 1 theme = 5 (never 6).
      const clickables = countToolbarClickables(bar);
      if (clickables > MAX_TOOLBAR_CLICKABLES) {
        throw new Error(
          `toolbar: 工具栏可点 ${clickables} > ${MAX_TOOLBAR_CLICKABLES} —— 新增入口必须显式置换并在 v4 台账 toolbarAdmissions[] 登记（禁静默第 6 个可点）`,
        );
      }
      syncTriggerAria();
    },
  };
}
