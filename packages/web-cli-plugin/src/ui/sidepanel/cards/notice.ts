/**
 * `notice` card (FR-CHAT-035 / ADR-V4-027 decision 6) — a **tool notification**
 * (dashed compact notice), distinct from a `system` event row.
 *
 * Historical single-line row: born frozen, never patched.
 *
 * @module ui/sidepanel/cards/notice
 */
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

export function createNoticeCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(view, deps, ['entry-tool', 'msg', 'msg-tool'], CARD_TAG_LABELS.notice);
  const notice = doc.createElement('div');
  notice.className = 'msg-notice content-tool';
  notice.textContent = view.payload.text ?? view.payload.label ?? '';
  col.appendChild(notice);
  return li;
}
