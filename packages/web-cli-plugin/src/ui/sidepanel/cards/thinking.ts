/**
 * `thinking` card (FR-CHAT-035 / ADR-V4-027 decision 4 / ADR-V4-004 decision 4) —
 * the **two events, one card** process form.
 *
 * v3 appended a transient indicator and removed it when the round ended, which
 * both broke append-only and lost the "thought for N.Ns" fact. Here the start event
 * creates the card and the `thinking-done` event patches it to its terminal
 * `completed` state ("已思考 N.Ns") — no removal path exists.
 *
 * The card is born with `.msg-thinking` / `.msg-assistant` style carriers so the
 * v1 geometry stays identical.
 *
 * @module ui/sidepanel/cards/thinking
 */
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

function isDone(view: CardView): boolean {
  return view.terminal === 'completed';
}

export function createThinkingCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(
    view,
    deps,
    ['entry-assistant', 'msg', 'msg-assistant', 'msg-thinking'],
    CARD_TAG_LABELS.thinking,
  );
  const done = isDone(view);
  li.setAttribute('data-thinking-state', done ? 'done' : 'pending');
  const bubble = doc.createElement('div');
  bubble.className = 'msg-content content-assistant thinking';
  if (done) {
    bubble.textContent = `已思考 ${formatSeconds(view.payload.ms ?? 0)}`;
  } else {
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-label', '助手正在处理…');
    for (let i = 0; i < 3; i += 1) {
      const dot = doc.createElement('span');
      dot.className = 'thinking-dot';
      bubble.appendChild(dot);
    }
  }
  col.appendChild(bubble);
  return li;
}

/** Patch "思考中…" → "已思考 N.Ns" on the same card (never a remove). */
export function patchThinkingCard(view: CardView, node: HTMLElement): void {
  const done = isDone(view);
  node.setAttribute('data-thinking-state', done ? 'done' : 'pending');
  const bubble = node.querySelector('.msg-content') as HTMLElement | null;
  if (!bubble) return;
  if (done) {
    for (const child of [...bubble.childNodes]) bubble.removeChild(child);
    bubble.removeAttribute('role');
    bubble.removeAttribute('aria-label');
    bubble.className = 'msg-content content-assistant thinking';
    bubble.textContent = `已思考 ${formatSeconds(view.payload.ms ?? 0)}`;
  }
}

/** `N.Ns` with one decimal (same caliber as the v3「已思考」copy). */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
