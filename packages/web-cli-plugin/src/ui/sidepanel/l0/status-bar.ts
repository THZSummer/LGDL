/**
 * V3-1 TASK-106 (FR-V3-015 / FR-V3-046) — the ONE-LINE status bar and its L2
 * entry panel.
 *
 *   - `#l0-statusbar` is a **single line** whose text carries the L2 counts
 *     (tree / commands / audit) — a summary, not the views themselves.
 *   - Expanding it reveals `#l2-entries`: **≤4 entries, each with a count**.
 *     v3-1 ships the skeleton (labels + counts from the view model); v3-3 fills
 *     the four L2 views behind it. Nothing here hard-codes a count: the labels
 *     come straight from `l0ViewModel()`, so changing a real value changes the
 *     label (FR-V3-046's mechanism, proven here for the skeleton).
 *
 * @module l0/status-bar
 */
import type { L0View } from '../view-model.js';

export interface StatusBarHandle {
  render(view: L0View): void;
  /**
   * Re-sync the four L2 entries' `aria-expanded` with `#view-host`'s state.
   * AC-V3-010 applies to **every** `[aria-controls]` element, not just the four
   * L0 triggers — the L2 entries carry `aria-controls="view-host"` and were
   * missing the paired `aria-expanded` (review I5).
   */
  syncTriggerAria(): void;
}

/** L2 entries are capped at four (FR-V3-015). */
export const L2_ENTRY_FIELDS = ['tree', 'commands', 'audit', 'settings'] as const;

export function mountStatusBar(doc: Document): StatusBarHandle {
  const bar = doc.getElementById('l0-statusbar');
  const text = doc.getElementById('l0-statusbar-text');
  const entriesHost = doc.getElementById('l2-entries');
  if (!bar || !text || !entriesHost) throw new Error('status-bar: 缺少 DOM 契约（#l0-statusbar / #l2-entries）');

  const buttonFor = (key: string): HTMLButtonElement | null => {
    const id = `l2-entry-${key}`;
    const existing = doc.getElementById(id);
    return existing instanceof HTMLButtonElement ? existing : null;
  };

  const syncTriggerAria = (): void => {
    const expanded = doc.getElementById('view-host')?.hidden === false ? 'true' : 'false';
    for (const key of L2_ENTRY_FIELDS) {
      const btn = buttonFor(key);
      if (!btn) continue;
      btn.setAttribute('aria-expanded', expanded);
    }
  };

  return {
    syncTriggerAria,
    render(view: L0View): void {
      text.textContent = view.statusbar.text;
      for (const entry of view.statusbar.entries) {
        const btn = buttonFor(entry.key);
        if (!btn) continue;
        // label carries the count, so the entry is discoverable *before* opening
        // (D6: every disclosure has a summary + an explicit entry point).
        btn.textContent = entry.label;
        btn.setAttribute('data-count', entry.count < 0 ? 'n/a' : String(entry.count));
        btn.setAttribute('aria-controls', 'view-host');
      }
      syncTriggerAria();
    },
  };
}
