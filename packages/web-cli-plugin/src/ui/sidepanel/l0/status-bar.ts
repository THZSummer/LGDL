/**
 * V4-1 TASK-506 / ADR-V4-018 / ADR-V4-022 — the **L2 entry writer** (relocated).
 *
 * v3 called this the「一行状态栏 + 入口面板」writer. v4 moves both halves:
 *
 *   · the one-line status bar becomes the real **`#region-statusbar`** zone,
 *     owned by `statusbar.ts` (TASK-505);
 *   · the four `#l2-entry-*` entries move **up into the toolbar**
 *     (`#region-toolbar`), owned by `toolbar.ts` (TASK-504).
 *
 * This module survives as the *name-stable* seam the v3 gates and the leaf's
 * D-005 ledger keyed on: `L2_ENTRY_FIELDS` and `syncTriggerAria()` keep their
 * meaning, and `mountStatusBar()` now returns the toolbar handle so no caller
 * needs to know about the relocation. `l2/counts.ts` (the ONE count source) is
 * untouched — the entries' badge values still come from `deriveCounts()` via
 * `L0View.statusbar.entries`.
 *
 * @module l0/status-bar
 */
import { TOOLBAR_ENTRY_KEYS, mountToolbar, type ToolbarHandle } from '../toolbar.js';

/** L2 entries are capped at four (FR-CHAT-015). Same value, new home. */
export const L2_ENTRY_FIELDS = TOOLBAR_ENTRY_KEYS;

export type StatusBarHandle = ToolbarHandle;

/** Mount the (relocated) four-entry writer. */
export function mountStatusBar(doc: Document): ToolbarHandle {
  return mountToolbar(doc);
}
