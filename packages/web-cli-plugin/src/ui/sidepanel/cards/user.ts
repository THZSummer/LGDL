/**
 * `user` card (FR-CHAT-031) — the opposite-side bubble (verbatim text, never
 * Markdown-interpreted: what the user typed is what is shown).
 *
 * @module ui/sidepanel/cards/user
 */
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

export function createUserCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(view, deps, ['entry-user', 'msg', 'msg-user'], CARD_TAG_LABELS.user);
  const bubble = doc.createElement('div');
  bubble.className = 'msg-content content-user';
  bubble.setAttribute('aria-label', '我');
  bubble.textContent = view.payload.text ?? '';
  col.appendChild(bubble);
  return li;
}
