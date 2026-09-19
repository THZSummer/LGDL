/**
 * `system` / `command` cards (FR-CHAT-032 / FR-CHAT-035).
 *
 *   · `system`  — a single-line system event row (+ `HH:MM:SS`), append-only
 *   · `command` — a compact monospace command line (`.cmd` style carrier)
 *
 * Both are born frozen (ADR-V4-027 decision 5: system rows have no terminal state;
 * a command line is a historical row), so neither is ever patched.
 *
 * @module ui/sidepanel/cards/system
 */
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

/** A single-line system event row (FR-CHAT-032 / shim E1). */
export function createSystemCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(view, deps, ['entry-system', 'msg', 'msg-system'], CARD_TAG_LABELS.system);
  const line = doc.createElement('div');
  line.className = 'msg-content content-system sys-line';
  line.textContent = view.payload.text ?? view.payload.label ?? '';
  col.appendChild(line);
  return li;
}

/** A compact monospace command line (`.cmd` — style carrier for the v1 CSS). */
export function createCommandCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(
    view,
    deps,
    ['entry-assistant', 'msg', 'msg-assistant', 'msg-command'],
    CARD_TAG_LABELS.command,
  );
  const wrap = doc.createElement('div');
  wrap.className = 'cmd';
  const prompt = doc.createElement('span');
  prompt.className = 'cmd-prompt';
  prompt.textContent = '›';
  const code = doc.createElement('code');
  code.className = 'cmd-text';
  code.textContent = view.payload.text ?? '';
  wrap.append(prompt, code);
  col.appendChild(wrap);
  return li;
}
