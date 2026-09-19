/**
 * `error` card (FR-050 / EC-023 / FR-CHAT-035) — the prominent error row.
 *
 * A failure must be a VISIBLE entry (never only in the LLM's context), so the card
 * carries `.entry-error` and uses the system bubble style. Historical row: born
 * frozen, never patched, never removed except by the bound.
 *
 * @module ui/sidepanel/cards/error
 */
import type { CardView } from '../stream-model.js';
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
  return li;
}
