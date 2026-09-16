/**
 * V3-4 TASK-404 / TASK-407 / TASK-408 (ADR-V3-030 / ADR-V3-032 / ADR-V3-033 / ADR-V3-034).
 *
 * `dist/pick-layer.js` — the page side of「页面即输入」. It is injected **on demand**
 * (`chrome.scripting.executeScript({files:['pick-layer.js']})`, never bundled into the
 * resident `content.js` whose 177,076 B budget has zero headroom) and it is only ever
 * injectable on an authorized origin, which is what makes「未授权站点零注入」a
 * structural property instead of a promise.
 *
 * ── The six gestures (ADR-V3-034 §6 — the table and this list must be equal) ──
 *
 *   ① Alt + 悬停         outline + `语义路径 › 选择器 › 摘要`, unique target, no command
 *   ② Alt + 拖动         跟随胶囊 + draggable payload; dropping on the panel makes the
 *                         reference, releasing anywhere else cancels with zero effect
 *   ③ 右键                self-drawn menu with the three concessions (ADR-V3-032)
 *   ④ 拖选文本            ≥2 non-blank chars outside an editing surface → bubble → ref
 *   ⑤ 双击 (G1)           capture the double-clicked element
 *   ⑥ 悬停 600ms ⊕ (G2)   a `⊕` affordance appears → click captures
 *
 * ── Host-event rules (ADR-V3-033 §4, the five rules — all structural here) ────
 *
 *   ① Alt is only ever *read* as a modifier state; no `preventDefault` on it.
 *   ② Outside pick mode nothing touches `pointerdown` / `pointermove`.
 *   ③ In pick mode only the current target is `preventDefault`-ed.
 *   ④ `contextmenu` is swallowed only by the menu's own open path.
 *   ⑤ The selection bubble never blocks the page's selection behaviour (only the
 *      bubble's own click stops propagation), and it never appears inside an input,
 *      a textarea or a `[contenteditable]`.
 *
 * ── I-07：这是 **CSS** 隔离，不是**脚本**隔离 ────────────────────────────────
 *
 * open shadow + 普通属性 ⇒ 页面脚本可读改绘自绘 UI、可合成 `dblclick`/`contextmenu`/
 * `mouseup` 驱动捕获（因此**不**加 `isTrusted` 过滤：过滤会同时致盲门禁自身与零注入
 * 负控探针）。越权不可能 —— 本模块**没有命令通道**（见下）。后续 ADR 不得假设
 * 「页面脚本不可及」。
 *
 * ── What this file must never do ─────────────────────────────────────────────
 *
 * It reports **facts**. It never decides whether a reference is usable (that is
 * v3-2's single judge), never dispatches a command, and never mints a reference id
 * (the id is the side panel's `ref_<n>`; the page only renders the ordinal it is
 * told). FR-V3-062's「拾取期间命令发送计数 = 0」is therefore guaranteed by the shape
 * of this module: there is no command channel in it at all.
 *
 * @module content/pick-layer
 */

import {
  MIN_SELECTION_CHARS,
  captureFacts,
  fromElement,
  isEditableTarget,
  markRef,
  ordinalGlyph,
  resolveRef,
  selectorFor,
  semanticPathFor,
  textDigestFor,
} from './ref-capture.js';
import { createBridge, PICK_LAYER_VERSION, type LayerEnv } from './pick-bridge.js';
import { createMenu, type MenuItemKey } from './pick-menu.js';
import { createOverlay, type OverlayHandle } from './pick-overlay.js';

/** Hover dwell before the G2 `⊕` affordance appears (gesture ⑥). */
export const PLUS_DWELL_MS = 600;
/** How long an Alt-drag payload stays valid (a gesture, not a session). */
export const DRAG_PAYLOAD_TYPE = 'application/x-wcli-ref';

declare global {
  interface Window {
    __wcliPickLayer?: PickLayerApi;
  }
}

export interface PickLayerApi {
  version: string;
  state: { pickMode: boolean; menuOpen: boolean; nativeOnce: boolean };
  /** Single dispatcher for the gates (mirrors `window.__v3.testing.l1(op, …)`). */
  op(name: string, ...args: unknown[]): unknown;
  unmount(): void;
}

export function mount(doc: Document = document, win: Window = window): PickLayerApi {
  /** Resolve a selector defensively (a bad/edge selector must never throw). */
  const query = (selector: string): Element | null => {
    try {
      return doc.querySelector(selector);
    } catch {
      return null;
    }
  };
  const overlay: OverlayHandle = createOverlay(doc);
  const state = { pickMode: false, menuOpen: false, nativeOnce: false, dragging: false, target: null as Element | null };
  let seq = 0;
  const documentId = `doc-${Math.random().toString(36).slice(2, 10)}`;
  let navSeq = 0;
  let plusTimer: ReturnType<typeof setTimeout> | undefined;
  let removePlus: (() => void) | null = null;

  const bridge = createBridge({
    identity: () => ({ documentId, navSeq }),
    onHighlight: (msg) => {
      if (msg.mode === 'mark' && msg.refId && msg.selector) {
        // The panel mints the id (single id source) and the page writes it back as the
        // identity mark v3-2's D1 compares against (`data-wcli-ref`); the ordinal badge
        // carries the same number as the side-panel chip (FR-V3-071).
        const marked = query(msg.selector);
        if (!marked) return;
        markRef(marked, msg.refId);
        const box = marked.getBoundingClientRect();
        overlay.setBadge(msg.refId, marked, box.left - 8, box.top - 10);
        const badge = overlay.shadow.querySelector(`[data-ref-id="${msg.refId}"]`);
        badge?.addEventListener('pointerenter', () => bridge.pushPageHover(String(msg.refId)));
        return;
      }
      const el = query(String(msg.selector));
      if (!el) return;
      if (msg.mode === 'flash') {
        overlay.reveal(el);
        overlay.flash(el);
        return;
      }
      if (msg.mode === 'clear') {
        overlay.setOutline(null);
        return;
      }
      overlay.reveal(el);
      overlay.setOutline(el);
    },
    onTeardown: () => unmount(),
    onEnv: () => writeEnvBadges(),
  });

  /** The declaration facts the panel pushed; stamped onto every capture. */
  const envNow = (): LayerEnv => bridge.env();

  /**
   * Capture one element into raw facts. Returns `undefined` when the environment is
   * incomplete — the panel then receives facts with empty fields and its judge
   * reports `unknown` (blocked). Faking a value here would be the exact fail-open
   * path v3-2's N-04 closed.
   */
  const capture = (el: Element) => {
    const env = envNow();
    seq += 1;
    return captureFacts(fromElement(el), {
      origin: env.origin || doc.location?.origin || '',
      documentId,
      navSeq,
      declarationHash: env.declarationHash,
      ...(env.declarationVersion !== undefined ? { declarationVersion: env.declarationVersion } : {}),
      capturedAt: Date.now(),
    });
  };

  const emit = (el: Element): void => {
    const facts = capture(el);
    bridge.pushCapture(facts, resolveRef(facts.selector, doc));
  };

  /** The label text of the current target (also the drag capsule's copy). */
  const describe = (el: Element): string => overlay.describe(el);

  const paint = (el: Element | null): void => {
    state.target = el;
    overlay.setOutline(el);
    if (el) overlay.setLabel(describe(el), el.getBoundingClientRect());
    else overlay.setLabel('', null);
  };

  const exitPick = (): void => {
    state.pickMode = false;
    paint(null);
    overlay.setLabel('', null);
    overlay.hideCapsule();
    cancelPlus();
    menu.close();
    state.menuOpen = false;
  };

  const cancelPlus = (): void => {
    if (plusTimer) clearTimeout(plusTimer);
    plusTimer = undefined;
    removePlus?.();
    removePlus = null;
  };

  /** G2: after {@link PLUS_DWELL_MS} over one element, offer a `⊕` affordance. */
  const armPlus = (el: Element): void => {
    cancelPlus();
    // The affordance is part of the *hover* gesture, so it is armed only in pick
    // mode — otherwise merely moving the mouse over a page would decorate it.
    if (!state.pickMode) return;
    plusTimer = setTimeout(() => {
      const r = el.getBoundingClientRect();
      const plus = doc.createElement('button');
      plus.className = 'badge';
      plus.setAttribute('data-wcli-plus', '');
      plus.textContent = '⊕';
      plus.style.cssText = `position:fixed;left:${Math.max(0, r.right - 10)}px;top:${Math.max(0, r.top - 10)}px;pointer-events:auto;`;
      plus.addEventListener('click', (ev) => {
        ev.stopPropagation();
        cancelPlus();
        emit(el);
      });
      overlay.shadow.querySelector('.root')?.appendChild(plus);
      removePlus = () => plus.remove();
    }, PLUS_DWELL_MS);
  };

  // ── I-01②：授权自检（失去授权必须自行卸载）──────────────────────────────────
  /**
   * The panel pushes `pick-layer-env` with its authorization view on every inject
   * and re-push. If that fact turns to `authorized:false` (a revoke racing the
   * teardown message, a service-worker restart, …) the layer must not keep
   * intercepting the page's right-click until someone remembers to tear it down —
   * the next interaction removes it.
   *
   * `envReady()` keeps this honest: a bare evaluation with no extension runtime
   * (the zero-injection gate's forced-injection control) never receives an env, and
   * absence of facts is not a revocation — treating it as one would make that
   * negative control unable to ever be positive.
   */
  const stillAuthorized = (): boolean => {
    if (bridge.env().authorized || !bridge.envReady()) return true;
    unmount();
    return false;
  };

  // ── the menu (③) ────────────────────────────────────────────────────────────
  const menu = createMenu(
    {
      shadow: overlay.shadow,
      onNativeOnce: () => {
        state.nativeOnce = true;
      },
      onSelect: (key: MenuItemKey) => {
        state.menuOpen = false;
        const target = state.target;
        if (key === 'native') return;
        if (!target) return;
        if (key === 'ref' || key === 'target' || key === 'pick-here') emit(target);
        else if (key === 'ref-selection') emit(target);
      },
    },
    doc,
  );

  // ── ④ the selection bubble ──────────────────────────────────────────────────
  const selectionText = (): string => {
    try {
      return String(win.getSelection?.()?.toString() ?? '');
    } catch {
      return '';
    }
  };
  const selectionRect = (): DOMRect | null => {
    try {
      const sel = win.getSelection?.();
      return sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;
    } catch {
      return null;
    }
  };
  const onMouseUp = (ev: MouseEvent): void => {
    // Rule ⑤: never in an editing surface, never below the minimum length, and never
    // when the click landed on our own UI.
    if (isEditableTarget(ev.target as Element | null)) return;
    const text = selectionText();
    if (text.replace(/\s+/g, '').length < MIN_SELECTION_CHARS) return;
    const anchor = (win.getSelection?.()?.anchorNode?.parentElement ?? null) as Element | null;
    if (!anchor) return;
    overlay.showBubble(`引用选中内容（${text.replace(/\s+/g, '').length} 字）`, selectionRect(), () => emit(anchor));
  };

  // ── ③ right-click ───────────────────────────────────────────────────────────
  const onContextMenu = (ev: MouseEvent): void => {
    if (!stillAuthorized()) return;
    if (state.nativeOnce) {
      // Concession ②: this right-click belongs to the page (one shot).
      state.nativeOnce = false;
      return;
    }
    ev.preventDefault();
    const el = ev.target as Element;
    paint(el);
    state.menuOpen = true;
    menu.open(ev.clientX, ev.clientY, { hasSelection: selectionText().replace(/\s+/g, '').length >= MIN_SELECTION_CHARS });
  };

  // ── ① Alt hover / ② Alt drag ────────────────────────────────────────────────
  const onKeyDown = (ev: KeyboardEvent): void => {
    // Rule ①: Alt is only ever *read*; the browser's own Alt behaviour is untouched.
    if (ev.key === 'Alt') {
      state.pickMode = true;
      return;
    }
    if (ev.key === 'Escape') {
      if (state.menuOpen) {
        menu.close();
        state.menuOpen = false;
        ev.preventDefault();
        return;
      }
      if (state.pickMode) {
        exitPick();
        ev.preventDefault();
      }
    }
  };
  const onKeyUp = (ev: KeyboardEvent): void => {
    if (ev.key === 'Alt') exitPick();
  };
  const onPointerOver = (ev: PointerEvent): void => {
    // Rule ②: outside pick mode there is no hover behaviour at all — which is also
    // why the layer is invisible to an ordinary page visit.
    if (!state.pickMode || state.dragging) return;
    if (!stillAuthorized()) return;
    const el = ev.target as Element | null;
    if (!el || el === state.target) return;
    paint(el);
    armPlus(el);
  };
  const onPointerDown = (ev: PointerEvent): void => {
    if (!state.pickMode) return;
    // Rule ③: only the current target opts out of the page's own press handling.
    const el = ev.target as Element;
    if (el !== state.target) return;
    state.dragging = true;
    overlay.setCapsule(describe(el), ev.clientX, ev.clientY);
  };
  const onPointerMove = (ev: PointerEvent): void => {
    if (!state.dragging) return;
    overlay.setCapsule(describe(state.target ?? (ev.target as Element)), ev.clientX, ev.clientY);
  };
  const onPointerUp = (ev: PointerEvent): void => {
    if (!state.dragging) return;
    state.dragging = false;
    overlay.hideCapsule();
    // Concession of the未落点 path: releasing inside the page cancels the drag with
    // **zero** side effects — no reference, no state change, no command. The panel
    // receives nothing at all; only a drop into the panel mints a reference.
    void ev;
  };
  /** The drag payload a drop target reads (`application/x-wcli-ref`). */
  const dragPayload = (el: Element): string => JSON.stringify(capture(el));
  const onDragStart = (ev: DragEvent): void => {
    if (!state.pickMode || !ev.dataTransfer) return;
    const el = (state.target ?? ev.target) as Element;
    if (!el) return;
    try {
      ev.dataTransfer.setData(DRAG_PAYLOAD_TYPE, dragPayload(el));
      ev.dataTransfer.setData('text/plain', selectorFor(fromElement(el)));
      ev.dataTransfer.effectAllowed = 'copy';
    } catch {
      /* a host page may own the drag; the drag simply carries no payload */
    }
  };
  const onDragEnd = (): void => {
    // Not dropped on the panel → the reference was cancelled (zero side effects).
    overlay.hideCapsule();
  };

  // ── ⑤ G1 double click / ⑥ (see armPlus) ─────────────────────────────────────
  const onDblClick = (ev: MouseEvent): void => {
    if (!state.pickMode) return;
    if (!stillAuthorized()) return;
    const el = ev.target as Element | null;
    if (!el || isEditableTarget(el)) return;
    emit(el);
  };

  // ── SPA navigation ⇒ navSeq (D3's page-side fact) ───────────────────────────
  const bumpNav = (): void => {
    navSeq += 1;
    bridge.pushState('update');
  };
  const history = win.history;
  const patchHistory = (name: 'pushState' | 'replaceState'): (() => void) => {
    // I-10 (review R1): the old `history.__wcliPickWrapped` guard was read but never
    // written — a dead judgement that protected nothing. Idempotence is guaranteed by
    // the module marker (`window.__wcliPickLayer`, see the install block below), and
    // `unmount()` restores the originals.
    if (!history) return () => {};
    const original = history[name].bind(history);
    history[name] = ((...args: Parameters<History['pushState']>) => {
      const out = original(...args);
      bumpNav();
      return out;
    }) as History['pushState'];
    return () => {
      history[name] = original;
    };
  };
  const restorePush = patchHistory('pushState');
  const restoreReplace = patchHistory('replaceState');

  // ── listeners (all removed by `unmount`) ────────────────────────────────────
  const listeners: Array<[string, EventListener, boolean]> = [
    ['keydown', onKeyDown as EventListener, true],
    ['keyup', onKeyUp as EventListener, true],
    ['pointerover', onPointerOver as EventListener, true],
    ['pointerdown', onPointerDown as EventListener, true],
    ['pointermove', onPointerMove as EventListener, true],
    ['pointerup', onPointerUp as EventListener, true],
    ['contextmenu', onContextMenu as EventListener, true],
    ['mouseup', onMouseUp as EventListener, true],
    ['dblclick', onDblClick as EventListener, true],
    ['dragstart', onDragStart as EventListener, true],
    ['dragend', onDragEnd as EventListener, false],
    ['popstate', bumpNav as EventListener, false],
  ];
  const docClick = (ev: MouseEvent): void => {
    if (!state.menuOpen) return;
    if (overlay.shadow.contains(ev.target as Node)) return;
    // Concession ③: a click on blank page area closes the menu and does nothing else.
    menu.close();
    state.menuOpen = false;
  };
  listeners.push(['click', docClick as EventListener, true]);

  for (const [type, fn, capture] of listeners) doc.addEventListener(type, fn, capture);

  /** Refresh the badge ordinals the panel has told us about. */
  function writeEnvBadges(): void {
    for (const badge of Array.from(overlay.shadow.querySelectorAll('[data-ref-id]'))) {
      const refId = badge.getAttribute('data-ref-id') ?? '';
      if (refId) badge.textContent = ordinalGlyph(refId);
    }
  }

  function unmount(): void {
    for (const [type, fn, capture] of listeners) doc.removeEventListener(type, fn, capture);
    cancelPlus();
    restorePush();
    restoreReplace();
    overlay.unmount();
    // I-01③ (review R1): `pick-input` already had a `phase === 'gone'` branch, but
    // nothing ever pushed it — a torn-down layer left the panel believing the page
    // side was still `injected` (and its judge env kept a stale document identity).
    // Report *before* the bridge drops its listener.
    bridge.pushState('gone', '页面侧已卸载');
    bridge.unmount();
    delete (win as unknown as Record<string, unknown>).__wcliPickLayer;
  }

  /**
   * The gate-facing `op` dispatcher resolves a string argument as a **selector** (and
   * anything else as a live element), so the seams are usable across the isolated-world
   * boundary where only JSON-serialisable arguments can travel.
   */
  const asElement = (arg: unknown): Element | null => {
    if (typeof arg === 'string') return query(arg);
    return arg && typeof arg === 'object' && 'tagName' in (arg as Element) ? (arg as Element) : null;
  };

  const api: PickLayerApi = {
    version: PICK_LAYER_VERSION,
    state,
    op(name, ...args) {
      const el = asElement(args[0]);
      switch (name) {
        case 'facts':
          return el ? capture(el) : null;
        case 'selector':
          return el ? selectorFor(fromElement(el)) : '';
        case 'path':
          return el ? semanticPathFor(fromElement(el)) : '';
        case 'digest':
          return el ? textDigestFor(fromElement(el)) : '';
        case 'describe':
          return el ? describe(el) : '';
        case 'capture':
          if (el) emit(el);
          return true;
        case 'pickMode':
          state.pickMode = args[0] === true;
          if (!state.pickMode) exitPick();
          return state.pickMode;
        case 'alt':
          // The gate cannot always synthesise a trusted Alt key event; this drives
          // the SAME branch the key handler drives (no shadow implementation).
          state.pickMode = args[0] === true;
          if (!state.pickMode) exitPick();
          return state.pickMode;
        case 'hover':
          if (el) {
            paint(el);
            armPlus(el);
          }
          return true;
        case 'dragPayload':
          return el ? dragPayload(el) : '';
        case 'dragCancel':
          onPointerUp({} as PointerEvent);
          return true;
        case 'timers':
          // I-10 seam: proves the overlay really *tracks* its timers (the precondition
          // for `unmount()` clearing them) — ≥1 right after a flash, 0 once drained.
          return overlay.pendingTimers();
        case 'mark':
          if (args[0] && args[1]) markRef(args[0] as Element, String(args[1]));
          return true;
        case 'reset':
          exitPick();
          overlay.hideBubble();
          overlay.clearBadges();
          state.target = null;
          return true;
        case 'snapshot':
          return {
            pickMode: state.pickMode,
            menuOpen: state.menuOpen,
            nativeOnce: state.nativeOnce,
            target: state.target ? selectorFor(fromElement(state.target)) : null,
            outlineVisible: !(overlay.shadow.querySelector('.outline') as HTMLElement | null)?.hidden,
            labelText: (overlay.shadow.querySelector('.label') as HTMLElement | null)?.textContent ?? '',
            bubbleVisible: !(overlay.shadow.querySelector('.bubble') as HTMLElement | null)?.hidden,
            capsuleVisible: !(overlay.shadow.querySelector('.capsule') as HTMLElement | null)?.hidden,
            menuItems: Array.from(overlay.shadow.querySelectorAll('[data-menu-key]')).map((n) => n.textContent ?? ''),
            badges: Array.from(overlay.shadow.querySelectorAll('[data-ref-id]')).map((n) => n.textContent ?? ''),
            plusVisible: Boolean(overlay.shadow.querySelector('[data-wcli-plus]')),
            shadowHosts: doc.querySelectorAll('[data-wcli-pick-root]').length,
          };
        default:
          return null;
      }
    },
    unmount,
  };
  // Report the document identity once, then keep it current (the panel needs it to
  // build the judge's env — AC-CONV-1).
  bridge.pushState('ready');
  return api;
}

// ── install: idempotent by construction ────────────────────────────────────────
// A second injection (the「从页面拾取」trigger racing the「面板在场」trigger, or a
// service-worker restart) must never produce a second shadow host or a second set of
// listeners: the marker is the single arbiter.
const existing = (window as Window).__wcliPickLayer;
if (!existing) {
  (window as Window).__wcliPickLayer = mount();
}
