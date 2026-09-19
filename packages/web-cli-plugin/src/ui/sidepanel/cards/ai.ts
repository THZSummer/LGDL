/**
 * `ai` card (FR-CHAT-031 / shim B3) — the assistant bubble with **safe Markdown**.
 *
 * The rich-text path reuses `markdown.ts` unchanged (zero new parser surface); the
 * legacy `.entry-assistant` / `.msg-assistant` classes keep the v1 styles and the
 * existing gates matching.
 *
 * @module ui/sidepanel/cards/ai
 */
import { renderMarkdown } from '../markdown.js';
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

export function createAiCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant'], CARD_TAG_LABELS.ai);
  const bubble = doc.createElement('div');
  bubble.className = 'msg-content content-assistant';
  bubble.setAttribute('aria-label', '助手');
  bubble.appendChild(renderMarkdown(view.payload.text ?? '', doc));
  col.appendChild(bubble);
  return li;
}

/** Patch the markdown body in place (never called for a frozen card). */
export function patchAiCard(view: CardView, node: HTMLElement, deps: CardDeps): void {
  const bubble = node.querySelector('.msg-content') as HTMLElement | null;
  if (!bubble) return;
  // No clearing API anywhere: detach the old nodes one by one (ADR-V4-025 §3).
  for (const child of [...bubble.childNodes]) bubble.removeChild(child);
  bubble.appendChild(renderMarkdown(view.payload.text ?? '', deps.doc));
}
