// `error` card (FR-050 / EC-023 / FR-CHAT-035) — the prominent error row. Historical row:
// born frozen, never patched, never removed except by the bound.
//
// V5-3 TASK-V5-157 (ADR-V5-002 §3, FR-ALLN-012, law7): a BLOCKED error must not be a dead
// end. The recovery face is minted INSIDE this call (same createErrorCard invocation), so
// the card is born with its next step and the append-only discipline holds
// (BORN_FROZEN_KINDS untouched; no patch path). Absent recovery => zero chip.
import type { CardView } from '../stream-model.js';
import { MAX_CHIPS_PER_CARD, NEXT_CHIP_CLASS } from './nextstep.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

export function createErrorCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(
    view,
    deps,
    ['entry-system', 'msg', 'msg-system', 'entry-error'],
    CARD_TAG_LABELS.error,
  );
  const bubble = doc.createElement('div');
  bubble.className = 'msg-content content-system';
  bubble.textContent = view.payload.text ?? view.payload.label ?? '';
  col.appendChild(bubble);
  // Born recovery face (minted in THIS call; after birth the card is append-only).
  // `data-act="next"` is the render-level "actionable next" marker (a bare row is the
  // forbidden shape); the dispatch key is the opId (`data-op`, the op-direct convention).
  const chips = doc.createElement('div');
  chips.className = 'next-chips';
  for (const chip of (view.payload.recovery ?? []).slice(0, MAX_CHIPS_PER_CARD)) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = NEXT_CHIP_CLASS;
    btn.dataset.act = 'next';
    btn.dataset.op = chip.opId;
    btn.textContent = chip.text;
    btn.onclick = () => deps.onCardAction?.(view.cardId, chip.opId);
    chips.appendChild(btn);
  }
  if (chips.firstChild) col.appendChild(chips);
  return li;
}
