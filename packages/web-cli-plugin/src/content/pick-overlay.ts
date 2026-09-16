/**
 * V3-4 TASK-405 / TASK-408 (ADR-V3-033 / FR-V3-060 / FR-V3-062 / FR-V3-063 / FR-V3-065 / FR-V3-066).
 *
 * ── Why everything lives in ONE open shadow root ─────────────────────────────
 *
 * Two-sided isolation. Inbound: the host page's global CSS (including
 * `* { … !important }`) cannot reach into a shadow root, so the drawn UI stays
 * readable without an `!important` arms race. Outbound: our CSS cannot leak into
 * the page, so injecting the layer does not restyle the site. `all: initial` on the
 * shadow root resets inherited properties (font / line-height / color) that DO
 * cross the boundary. The host element carries a single unique attribute selector
 * (`[data-wcli-pick-root]`) and the highest practical `z-index`.
 *
 * ── One outline, never several ───────────────────────────────────────────────
 *
 * {@link OverlayHandle.outline} is the only writer of the pick outline and it always
 * takes exactly one element (or `null`). FR-V3-062's "unique highlight" is therefore
 * structural rather than a discipline: there is no code path that can paint two
 * outlines, because there is one outline node.
 *
 * @module content/pick-overlay
 */

import { fromElement, ordinalGlyph, selectorFor, semanticPathFor, textDigestFor } from './ref-capture.js';

/** Highest practical stacking level (below the browser's own top layer). */
export const OVERLAY_Z_INDEX = 2147483000;
/** Selection-bubble auto-fade (V34-O-4 / ADR-V3-033). */
export const BUBBLE_FADE_MS = 1800;
/** Highlight flash duration (P5 execution visualisation). */
export const FLASH_MS = 1200;

const CSS = `
  :host { all: initial; }
  .root {
    position: fixed; inset: 0; pointer-events: none; z-index: ${OVERLAY_Z_INDEX};
    font: 12px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #111827;
  }
  .outline {
    position: fixed; box-sizing: border-box; border: 2px solid #2f6fed; border-radius: 3px;
    background: rgba(47,111,237,.10);
  }
  .outline.flash { animation: wcli-flash ${FLASH_MS}ms ease-out 2; }
  @keyframes wcli-flash { 0%,100% { border-color:#2f6fed } 50% { border-color:#f59e0b } }
  .label {
    position: fixed; max-width: 460px; padding: 4px 7px; border-radius: 5px;
    background: rgba(17,24,39,.94); color: #f9fafb; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .capsule {
    position: fixed; padding: 3px 9px; border-radius: 999px; background: #2f6fed; color: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,.28); white-space: nowrap; max-width: 320px;
    overflow: hidden; text-overflow: ellipsis;
  }
  .bubble {
    position: fixed; padding: 4px 10px; border-radius: 999px; background: #111827; color: #fff;
    pointer-events: auto; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.28);
  }
  .badges { position: fixed; inset: 0; }
  .badge {
    position: fixed; min-width: 17px; padding: 0 3px; border-radius: 9px; background: #2f6fed;
    color: #fff; text-align: center; font-weight: 600; pointer-events: auto;
    box-shadow: 0 1px 4px rgba(0,0,0,.3);
  }
  .badge.on { background: #f59e0b; color: #1f2937; }
  @media (prefers-color-scheme: dark) {
    .root { color: #f3f4f6; }
    .label { background: rgba(243,244,246,.95); color: #111827; }
  }
`;

export interface OverlayHandle {
  /** The shadow root other modules (menu) append their UI into. */
  readonly shadow: ShadowRoot;
  setOutline(el: Element | null): void;
  /** Flash the outline (P5) and keep the page in the state it was in. */
  flash(el: Element): void;
  /** Scroll the target into view (never changes the page's own layout). */
  reveal(el: Element): void;
  setLabel(text: string, anchor: DOMRect | null): void;
  setCapsule(text: string, x: number, y: number): void;
  hideCapsule(): void;
  showBubble(text: string, rect: DOMRect | null, onPick: () => void): void;
  hideBubble(): void;
  /** Draw/refresh the `①②③` badge of one reference (chip ⇄ badge same ordinal). */
  setBadge(refId: string, el: Element, x: number, y: number): void;
  /** Hover feedback driven by the side panel (`ref-highlight`). */
  markBadge(refId: string, on: boolean): void;
  clearBadges(): void;
  /** One node's label text (semantic path › selector › digest). */
  describe(el: Element): string;
  /** I-10: pending tracked timers (`later()` set; ≥1 right after `flash()`, 0 drained). */
  pendingTimers(): number;
  unmount(): void;
}

function make(doc: Document, parent: Node, cls: string, tag = 'div'): HTMLElement {
  const el = doc.createElement(tag);
  el.className = cls;
  el.hidden = true;
  parent.appendChild(el);
  return el as HTMLElement;
}

/**
 * Create the isolated overlay. `host` is appended immediately so the layer is
 * observable (and removable) as soon as it runs.
 */
export function createOverlay(doc: Document = document): OverlayHandle {
  const host = doc.createElement('div');
  host.setAttribute('data-wcli-pick-root', '');
  const shadow = host.attachShadow({ mode: 'open' });
  // Mount immediately: the layer's UI only exists while the host is in the document
  // (and `unmount()` removes exactly this node). A `document_start` injection has no
  // `documentElement` yet, so the append is deferred to `DOMContentLoaded` — the layer
  // is still installed (its listeners and marker are up), it simply has no画布 yet.
  //
  // I-02 (review R1, probe B): that deferred append used to **outlive `unmount()`** —
  // a `document_start` mount that was torn down before `DOMContentLoaded` still got
  // its Shadow host appended, resurrecting a dead layer as a bare DOM residue. The
  // listener is now removed and `disposed` is the belt to that braces: once unmounted
  // the mount closure can never append anything again.
  let disposed = false;
  /** I-02: was the deferred (`DOMContentLoaded`) append actually armed? */
  let mountPending = false;
  /** I-10: every overlay timer lives here, so `unmount()` cannot leave one behind. */
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const mountHost = (): void => {
    if (disposed) return;
    const parent = doc.documentElement ?? doc.body;
    if (parent) {
      mountPending = false;
      parent.appendChild(host);
      return;
    }
    mountPending = true;
    doc.addEventListener('DOMContentLoaded', mountHost, { once: true });
  };
  mountHost();
  const style = doc.createElement('style');
  style.textContent = CSS;
  const root = doc.createElement('div');
  root.className = 'root';
  shadow.append(style, root);

  const outline = make(doc, root, 'outline');
  const label = make(doc, root, 'label');
  const capsule = make(doc, root, 'capsule');
  const bubble = make(doc, root, 'bubble', 'button');
  const badges = make(doc, root, 'badges');
  const badgeNodes = new Map<string, HTMLElement>();
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;

  const place = (el: HTMLElement, rect: DOMRect | null, dy = 0): void => {
    if (!rect) return;
    el.style.left = `${Math.max(0, Math.min(rect.left, (doc.defaultView?.innerWidth ?? 0) - 8))}px`;
    el.style.top = `${Math.max(0, rect.top + dy)}px`;
  };

  return {
    shadow,
    setOutline(el) {
      if (!el) {
        outline.hidden = true;
        return;
      }
      const r = el.getBoundingClientRect();
      outline.hidden = false;
      outline.classList.remove('flash');
      Object.assign(outline.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      place(label, r, -(r.top < 24 ? -r.height - 22 : 22));
    },
    flash(el) {
      const r = el.getBoundingClientRect();
      outline.hidden = false;
      Object.assign(outline.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      outline.classList.remove('flash');
      // Re-trigger the animation on a repeated highlight of the same element.
      void outline.offsetWidth;
      outline.classList.add('flash');
      later(() => outline.classList.remove('flash'), FLASH_MS * 2);
    },
    reveal(el) {
      // `scrollIntoView` moves the page's viewport, never its layout. Guarded so a
      // host page overriding the method cannot throw into our listener.
      try {
        el.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      } catch {
        /* host override — the outline still marks the target */
      }
    },
    setLabel(text, anchor) {
      if (!text) {
        label.hidden = true;
        return;
      }
      label.hidden = false;
      label.textContent = text;
      place(label, anchor, -22);
    },
    setCapsule(text, x, y) {
      if (!text) {
        capsule.hidden = true;
        return;
      }
      capsule.hidden = false;
      capsule.textContent = text;
      const vw = doc.defaultView?.innerWidth ?? 0;
      const vh = doc.defaultView?.innerHeight ?? 0;
      capsule.style.left = `${Math.max(0, Math.min(x + 12, vw - 340))}px`;
      capsule.style.top = `${Math.max(0, Math.min(y + 12, vh - 32))}px`;
    },
    hideCapsule() {
      capsule.hidden = true;
    },
    showBubble(text, rect, onPick) {
      if (bubbleTimer) clearTimeout(bubbleTimer);
      bubble.hidden = false;
      bubble.textContent = text;
      if (rect) {
        const vw = doc.defaultView?.innerWidth ?? 0;
        const vh = doc.defaultView?.innerHeight ?? 0;
        bubble.style.left = `${Math.max(0, Math.min(rect.right + 12, vw - 200))}px`;
        bubble.style.top = `${Math.max(0, Math.min(rect.bottom + 12, vh - 36))}px`;
      }
      // `onclick` (not `addEventListener`) so a repeated bubble never stacks handlers.
      bubble.onclick = (ev) => {
        ev.stopPropagation();
        bubble.hidden = true;
        onPick();
      };
      bubbleTimer = setTimeout(() => {
        bubble.hidden = true;
      }, BUBBLE_FADE_MS);
    },
    hideBubble() {
      if (bubbleTimer) clearTimeout(bubbleTimer);
      bubbleTimer = undefined;
      bubble.hidden = true;
      bubble.onclick = null;
    },
    setBadge(refId, el, x, y) {
      let badge = badgeNodes.get(refId);
      if (!badge) {
        badge = make(doc, badges, 'badge', 'button');
        badgeNodes.set(refId, badge);
      }
      badge.hidden = false;
      badge.textContent = ordinalGlyph(refId);
      badge.setAttribute('data-ref-id', refId);
      badge.style.left = `${Math.max(0, Math.min(x, (doc.defaultView?.innerWidth ?? 0) - 20))}px`;
      badge.style.top = `${Math.max(0, Math.min(y, (doc.defaultView?.innerHeight ?? 0) - 18))}px`;
    },
    markBadge(refId, on) {
      badgeNodes.get(refId)?.classList.toggle('on', on);
    },
    clearBadges() {
      for (const [, node] of badgeNodes) node.remove();
      badgeNodes.clear();
    },
    describe(el) {
      // The SAME caliber the side panel's evidence layer renders (semantic path ›
      // short selector › text digest), so the page and the panel describe one
      // target with one implementation (`ref-capture.ts`).
      const node = fromElement(el);
      const parts = [semanticPathFor(node), selectorFor(node), textDigestFor(node)].filter((p) => p.length > 0);
      return parts.join(' › ');
    },
    pendingTimers() {
      return timers.size;
    },
    unmount() {
      // I-02: `disposed` first, so the deferred mount can never re-append even if the
      // listener were somehow already queued; then the listener itself goes away.
      disposed = true;
      if (mountPending) {
        doc.removeEventListener('DOMContentLoaded', mountHost);
        mountPending = false;
      }
      for (const id of timers) clearTimeout(id);
      timers.clear();
      if (bubbleTimer) clearTimeout(bubbleTimer);
      badgeNodes.clear();
      host.remove();
    },
  };
}
