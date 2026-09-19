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

/**
 * **No `patchAiCard` exists — and none is reachable.**
 *
 * I-08 (v4-2 review): the old `patchAiCard` (a `removeChild` rebuild of the
 * markdown body) was dead defensive code. `ai` is in
 * `stream-model.ts#BORN_FROZEN_KINDS`, so `project()` always reports it frozen and
 * `stream-render.ts` only patches `!frozen` cards — the branch could never be
 * taken in the product. Its presence was actively misleading: it advertised a
 * "patch the Markdown body" capability that the frozen-DOM contract forbids. The
 * structural rule is enforced in `cards/index.ts#patchCardNode` (it dispatches only
 * for the four kinds with a real in-progress → settled migration).
 */
