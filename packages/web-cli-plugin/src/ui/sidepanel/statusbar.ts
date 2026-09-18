/**
 * V4-1 TASK-505 / ADR-V4-019 — the status bar renderer (`#region-statusbar`).
 *
 * J1~J4, machine-checkable (FR-CHAT-004 / FR-CHAT-013 / FR-CHAT-017):
 *
 *   · **J1** the bar itself never carries `hidden` (`render()` re-asserts it);
 *   · **J2** with any risk active, `#risk-chips` is visible and `#risk-rail` holds
 *     ≥1 visible chip; with zero risk the chips container is `hidden` (0 chips);
 *   · **J3** a chip's ancestor closure contains no `hidden` element, no foldable
 *     container and no `[aria-expanded]` trigger — structurally guaranteed because
 *     the chips live in `body`-direct `#region-statusbar`, which `disclosure.ts`
 *     refuses (`assertFoldable('#region-statusbar')` throws);
 *   · **J4** opening any view cannot touch the bar (S7: the bar is `body`-direct,
 *     not a descendant of `#region-stream`).
 *
 * **Single-writer split (deliberate).** `#risk-rail` keeps exactly ONE writer —
 * `l0/risk-rail.ts#renderRiskRail` (called by the L0 shell, which also appends the
 * page-availability row right after). This module therefore never rebuilds chips:
 * it only (a) re-asserts J1, (b) writes the connection line, and (c) enforces J2's
 * container visibility from the *same* view data the rail was rendered from.
 *
 * @module statusbar
 */
import type { L0View } from './view-model.js';
import { RISK_CALM_TEXT } from './l0/risk-rail.js';

export interface StatusBarHandle {
  render(view: L0View, opts?: { riskActive?: boolean }): void;
}

/** The calm one-liner appended to the connection line when nothing is wrong. */
export const STATUS_CALM_SUFFIX = ` · ${RISK_CALM_TEXT}`;

/**
 * True when any risk chip (or the page-availability row) must be resident. Derived
 * from the SAME view the rail renders from — never a second judgement.
 */
export function riskActiveOf(view: L0View): boolean {
  return (view.riskChips?.classes?.length ?? 0) > 0 || Boolean(view.pick?.unavailable);
}

export function mountStatusBar(doc: Document): StatusBarHandle {
  const bar = doc.getElementById('region-statusbar');
  const text = doc.getElementById('statusbar-text');
  const chips = doc.getElementById('risk-chips');
  if (!bar || !text || !chips) {
    throw new Error('statusbar: 缺少 DOM 契约（#region-statusbar / #statusbar-text / #risk-chips）');
  }

  return {
    render(view: L0View, opts): void {
      // J1: the bar is permanently resident — re-assert it on every render so a
      // future edit cannot fold it "just a little".
      if (bar.hidden === true) bar.hidden = false;
      const riskActive = opts?.riskActive ?? riskActiveOf(view);
      // J2: with zero risk the container is hidden (0 clickable chips) and the
      // one-line「无风险」statement lives in the bar's own text, not in a chip.
      if (riskActive && chips.hidden === true) chips.hidden = false;
      if (!riskActive && chips.hidden !== true) chips.hidden = true;
      text.textContent = riskActive ? view.statusbar.text : `${view.statusbar.text}${STATUS_CALM_SUFFIX}`;
    },
  };
}
