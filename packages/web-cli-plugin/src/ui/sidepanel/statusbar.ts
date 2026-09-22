// V4-1 TASK-505 / ADR-V4-019 — the status bar renderer (`#region-statusbar`).
//
// J1~J4, machine-checkable (FR-CHAT-004 / FR-CHAT-013 / FR-CHAT-017):
//   · J1 the bar never carries `hidden` (render() re-asserts it);
//   · J2 with any *rail* risk active, `#risk-chips` is visible and `#risk-rail` holds ≥1
//     visible chip; with zero rail risk the chips container is `hidden` (0 chips);
//   · J3 a chip's ancestor closure contains no hidden / foldable / [aria-expanded] trigger
//     (the chips live in body-direct `#region-statusbar`, which disclosure.ts refuses);
//   · J4 opening any view cannot touch the bar (body-direct, not a `#region-stream` child).
//
// Single-writer split (deliberate): `#risk-rail` keeps exactly ONE writer
// (`l0/risk-rail.ts#renderRiskRail`), so this module never rebuilds chips — it only
// (a) re-asserts J1, (b) writes the connection line, (c) enforces J2's container
// visibility from the SAME view the rail rendered from, and (d) V5-3: writes the
// `#auth-state` chip (the ONE carrier of the authorization state, FR-ALLN-085).
import type { L0View } from './view-model.js';
import { AUTH_STATES, RAIL_RISK_CLASSES, RISK_CALM_TEXT } from './l0/risk-rail.js';

export interface StatusBarHandle {
  render(view: L0View, opts?: { riskActive?: boolean }): void;
}

/** The calm one-liner appended to the connection line when nothing is wrong. */
export const STATUS_CALM_SUFFIX = ` · ${RISK_CALM_TEXT}`;

/**
 * True when any **rail** risk chip (or the page-availability row) must be resident.
 * Derived from the SAME view the rail renders from — never a second judgement.
 *
 * V5-3 (ADR-V5-006 §2③): `unauthorized` is NOT a rail risk any more (it is the auth
 * chip's state), so this reads the rail subset — otherwise J2 would keep the
 * (empty) `#risk-chips` container visible for a zero-rail-risk session.
 */
export function riskActiveOf(view: L0View): boolean {
  return (view.riskChips?.classes ?? []).some((c) => RAIL_RISK_CLASSES.includes(c)) || Boolean(view.pick?.unavailable);
}

export function mountStatusBar(doc: Document): StatusBarHandle {
  const bar = doc.getElementById('region-statusbar');
  const text = doc.getElementById('statusbar-text');
  const chips = doc.getElementById('risk-chips');
  const auth = doc.getElementById('auth-state');
  if (!bar || !text || !chips || !auth) {
    throw new Error('statusbar: 缺少 DOM 契约（#region-statusbar / #statusbar-text / #risk-chips / #auth-state）');
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
      // V5-3 TASK-V5-164 (ADR-V5-006 §1, FR-ALLN-085): the auth chip's two states are
      // written from the ONE view (`ctxOf(scene).site.authorized`) — **恒显其一**, never
      // `hidden` (a state is always true; LNG-V5-3-003 forbids folding it to make room).
      const green = view.authorized === true;
      const authText = AUTH_STATES[green ? 'green' : 'yellow'];
      auth.dataset.auth = green ? 'green' : 'yellow';
      auth.textContent = authText;
      if (auth.hidden) auth.hidden = false;
    },
  };
}
