/**
 * V4-2 TASK-604 (leaf `specs-tree-v4-2-chat-stream-model`) — the **keyed
 * incremental renderer** (父 ADR-V4-004 / 本叶 ADR-V4-025).
 *
 * ── The three (and only three) DOM operations ────────────────────────────────
 *
 *   ① **append** — a new `cardId` gets a new `<li>` (created by `cards/`);
 *   ② **patch**  — an existing, **non-frozen** card is updated in place;
 *   ③ **remove** — a card whose `cardId` no longer exists in the event log
 *                  (the `boundStreamEvents` eviction path) is destroyed.
 *
 * There is **no** container-clearing call anywhere in this module (the gate greps
 * for the two forbidden forms), and no "rebuild the list" branch.
 *
 * ── Detach vs. destroy (session segments) ────────────────────────────────────
 *
 * The projection is session-scoped (a session switch must not show the previous
 * session's conversation — the pre-existing, still-green journey isolation
 * assertions #16e/#16g). A card whose segment is not active is **detached** from
 * the container but kept in the keyed map, so switching back re-attaches the very
 * same node (`===`) with its frozen DOM and its folding memory intact. Only a
 * `live`-set miss (the event really was dropped by the bound) is a true destroy —
 * so the *event*-deletion path stays the sole reason a card can cease to exist.
 *
 * ── Frozen DOM ───────────────────────────────────────────────────────────────
 *
 * A card whose view is frozen is marked `data-frozen="true"` and is never patched
 * again; its `outerHTML` is therefore byte-stable for the rest of its life
 * (asserted by `test/ui/stream.mjs`).
 *
 * @module ui/sidepanel/stream-render
 */
import { createCardNode, patchCardNode } from './cards/index.js';
import type { CardDeps } from './cards/shared.js';
import type { CardView } from './stream-model.js';

export interface StreamRenderOptions {
  readonly container: HTMLElement;
  readonly doc: Document;
  readonly deps: CardDeps;
  /** The stream's empty-state text (from `view-model.ts#LOG_EMPTY_TEXT`). */
  readonly emptyText: string;
}

export interface StreamRenderResult {
  /** How many cards were newly appended in this pass. */
  readonly appended: number;
  /** How many cards were truly destroyed (bound eviction) in this pass. */
  readonly destroyed: number;
}

export interface StreamRenderHandle {
  render(views: readonly CardView[], live: ReadonlySet<string>): StreamRenderResult;
  /** Show/hide the empty-stream welcome placeholder (never a card). */
  setEmpty(show: boolean): void;
  /** Rendered card count (must equal `project()`'s output — the gate asserts it). */
  cardCount(): number;
  /** The node of a card (node-identity assertions / diagnostics). */
  nodeFor(cardId: string): HTMLElement | undefined;
  /** Detach and forget every node (panel teardown / test reset only). */
  reset(): void;
}

/**
 * Where message cards live: before the `composer` transitional host so the host
 * stays after the conversation (the host is retired by v4-3; with no host the cards
 * simply append at the end of the stream).
 */
function messageAnchor(container: HTMLElement): Node | null {
  return container.querySelector(':scope > li[data-host="composer"]');
}

export function createStreamRender(options: StreamRenderOptions): StreamRenderHandle {
  const { container, doc, deps, emptyText } = options;
  /** The keyed node map — the identity guarantee ("same cardId ⇒ same node"). */
  const nodes = new Map<string, HTMLElement>();

  function emptyPlaceholder(): HTMLElement | null {
    return container.querySelector(':scope > p.log-empty-text');
  }

  function setEmpty(show: boolean): void {
    container.classList.toggle('empty', show);
    const existing = emptyPlaceholder();
    if (show && !existing) {
      const p = doc.createElement('p');
      p.className = 'log-empty-text';
      p.textContent = emptyText;
      container.insertBefore(p, messageAnchor(container));
    } else if (!show && existing) {
      existing.remove();
    }
  }

  function render(views: readonly CardView[], live: ReadonlySet<string>): StreamRenderResult {
    let appended = 0;
    const present = new Set<string>();

    for (const view of views) {
      present.add(view.cardId);
      let node = nodes.get(view.cardId);
      const isNew = !node;
      if (!node) {
        node = createCardNode(view, deps);
        nodes.set(view.cardId, node);
        appended += 1;
      }
      const frozen = node.getAttribute('data-frozen') === 'true';
      // ② patch — an existing, non-frozen card gets the new view applied once;
      // a card that just became terminal is patched exactly once (to write its
      // 固化 region) and is then frozen forever.
      if (!isNew && !frozen) patchCardNode(view, node);
      if (!frozen && view.frozen) node.setAttribute('data-frozen', 'true');
    }

    // Detach nodes whose segment is not active (kept in the map for re-attach);
    // a `live` miss is the bound-eviction path and is the ONLY true destroy.
    let destroyed = 0;
    for (const [cardId, node] of [...nodes]) {
      if (present.has(cardId)) continue;
      if (!live.has(cardId)) {
        node.remove();
        nodes.delete(cardId);
        destroyed += 1;
        continue;
      }
      if (node.parentElement === container) container.removeChild(node);
    }

    // Deterministic order: walk the projection in reverse, inserting each card
    // before its successor (or before the anchor).
    let ref: Node | null = messageAnchor(container);
    for (let i = views.length - 1; i >= 0; i -= 1) {
      const node = nodes.get(views[i].cardId);
      if (!node) continue;
      if (node.parentElement !== container || node.nextSibling !== ref) {
        container.insertBefore(node, ref);
      }
      ref = node;
    }

    return { appended, destroyed };
  }

  return {
    render,
    setEmpty,
    cardCount: () => container.querySelectorAll(':scope > [data-card-key]').length,
    nodeFor: (cardId) => nodes.get(cardId),
    reset: () => {
      for (const node of nodes.values()) node.remove();
      nodes.clear();
      emptyPlaceholder()?.remove();
      container.classList.remove('empty');
    },
  };
}
