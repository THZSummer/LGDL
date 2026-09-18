/**
 * V3-1 — the SINGLE disclosure controller (ADR-V3-006 / ADR-V3-016).
 *
 * Every collapse in the L0/L1/L2 stack goes through this module. Scattering
 * `el.hidden = !el.hidden` across `sidepanel.ts` is what would eventually rot
 * the four hard rules:
 *
 *   1. **Whitelist only.** `COLLAPSIBLE_TARGETS` is a frozen constant array of
 *      L1/L2 panels. `assertFoldable()` **throws** for anything else, so the
 *      risk rail (`#risk-rail`), the destructive confirmation card (`#confirm`)
 *      and the decision area itself (`#l0-decision`) are *structurally* unable
 *      to be folded (FR-V3-016 / FR-V3-018 / AC-V3-009).
 *   2. **`hidden` attribute only.** Collapse is expressed as the `hidden`
 *      property — never `display:none`, never `visibility`, never `opacity`.
 *      The density caliber (spec §9.1 C1) exempts *only* `hidden`, so this is
 *      simultaneously the accessibility rule (FR-V3-024) and the anti-cheat
 *      rule (EC-V3-010).
 *   3. **`aria-expanded` + `aria-controls` are a pair.** A trigger missing
 *      either attribute is a programming error and throws (FR-V3-024).
 *   4. **Expansion memory.** Open/closed state is remembered in an in-memory
 *      `Map` with `snapshot()` / `restore()` so a round-trip into an L2 view
 *      comes back exactly as it was (FR-V3-023 / FR-V3-047).
 *
 * The three later v3 leaves reuse this controller read-only through
 * `window.__v3.disclosure` — they must never bypass it (ADR-V3-010).
 *
 * No `chrome.*` calls and no DOM globals at import time, so the module is
 * unit-testable in plain Node with a tiny document stub
 * (`test/l0-disclosure.test.ts`).
 *
 * @module disclosure
 */

/** Minimal element surface this controller needs (keeps the module testable). */
export interface DisclosureElement {
  hidden: boolean;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  addEventListener?(type: string, listener: () => void): void;
}

/** Minimal document surface (a real `Document` satisfies it structurally). */
export interface DisclosureDoc {
  getElementById(id: string): DisclosureElement | null;
  querySelector(selector: string): DisclosureElement | null;
  querySelectorAll?(selector: string): ArrayLike<DisclosureElement>;
}

/**
 * The **only** foldable targets in v4. Ids, not selectors, so a typo fails loudly
 * at once. Deliberately absent: `#region-statusbar` / `#risk-chips` / `#risk-rail`
 * / `#risk-detail` (永不折叠, D3 + J1~J4), `#stream` / `#view-host` /
 * `#settings-view`（流本体与视图宿主不可折叠）, `#confirm` / `#l0-decision`
 * （破坏性确认不参与折叠, FR-V3-018）。
 *
 * V3-2 appended the five L1 content panels (ADR-V3-021). **V4-1 removed two**
 * and added none (ADR-V4-018 / ADR-V4-019 第 7 条):
 *   · `topbar` — the management toolbar moved into `#settings-view`'s「站点与授权」
 *     section (法则六) and is no longer a collapsible panel;
 *   · `l2-entries` — the four L2 entries became **always-visible toolbar entries**
 *     (no disclosure affordance any more).
 * The five L1 content panels stay foldable: they are moving to a transitional host
 * inside `#stream`, but their trigger/target pairs and semantics are unchanged.
 */
export const COLLAPSIBLE_TARGETS = Object.freeze([
  'l1-more',
  'l1-ref',
  'l1-consequences',
  'l1-local-tree',
  'l1-history',
  'l1-receipt',
  'l1-gestures',
] as const);

/** Trigger → target wiring. Each trigger must carry `aria-expanded` + `aria-controls`. */
export const DISCLOSURE_WIRING = Object.freeze([
  Object.freeze({ triggerId: 'l0-more', targetId: 'l1-more', summary: '其余选项' }),
  Object.freeze({ triggerId: 'l0-ref-toggle', targetId: 'l1-ref', summary: '引用证据' }),
  Object.freeze({ triggerId: 'l1-consequences-toggle', targetId: 'l1-consequences', summary: '选项后果与影响预演' }),
  Object.freeze({ triggerId: 'l1-local-tree-toggle', targetId: 'l1-local-tree', summary: '局部树' }),
  Object.freeze({ triggerId: 'l1-history-toggle', targetId: 'l1-history', summary: '已决策历史' }),
  Object.freeze({ triggerId: 'l1-receipt-toggle', targetId: 'l1-receipt', summary: '回执完整证据' }),
  Object.freeze({ triggerId: 'l1-gestures-toggle', targetId: 'l1-gestures', summary: '页面交互说明' }),
] as const);

/**
 * Targets that must never be foldable — asserted negatively by the unit test.
 * V4-1 extends the v3 set with the whole three-zone shell: the status bar (J1),
 * the chips container (J2), the stream and its view host, the settings view and
 * the risk detail container.
 */
export const NEVER_FOLDABLE = Object.freeze([
  'risk-rail',
  'risk-chips',
  'risk-detail',
  'region-statusbar',
  'region-toolbar',
  'stream',
  'view-host',
  'settings-view',
  'confirm',
  'l0-decision',
  'ask',
  'composer',
]);

/** Thrown for a whitelist violation or an unpaired ARIA trigger. */
export class DisclosureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisclosureError';
  }
}

/** True when `targetId` may be folded. */
export function isFoldable(targetId: string): boolean {
  return (COLLAPSIBLE_TARGETS as readonly string[]).includes(normalizeId(targetId));
}

/** `'#risk-rail'` and `'risk-rail'` mean the same target. */
export function normalizeId(id: string): string {
  return id.startsWith('#') ? id.slice(1) : id;
}

/**
 * Throw unless `targetId` is whitelisted. This is the structural guarantee
 * behind "the risk rail is impossible to fold": there is no code path in the
 * product that folds a target without passing through here.
 */
export function assertFoldable(targetId: string): string {
  const id = normalizeId(targetId);
  if (!isFoldable(id)) {
    const why = (NEVER_FOLDABLE as readonly string[]).includes(id)
      ? '该目标属于「永不折叠」集合（风险位 / 破坏性确认 / 决策区）'
      : '该目标不在 COLLAPSIBLE_TARGETS 白名单内';
    throw new DisclosureError(`assertFoldable: 拒绝折叠 #${id} — ${why}`);
  }
  return id;
}

/** Public controller shape (also exposed on `window.__v3.disclosure`). */
export interface DisclosureController {
  readonly targets: readonly string[];
  toggle(id: string): boolean;
  open(id: string): boolean;
  close(id: string): boolean;
  isOpen(id: string): boolean;
  collapseAll(): void;
  expandMemory: Map<string, boolean>;
  snapshot(): Record<string, boolean>;
  restore(state: Record<string, boolean> | Map<string, boolean>): void;
  /** Trigger element for a target (or null) — used by gates for ARIA checks. */
  triggerOf(id: string): DisclosureElement | null;
}

/**
 * Build the controller over an injected document. The real panel calls this
 * with `document`; the unit test calls it with a stub.
 */
export function createDisclosure(doc: DisclosureDoc, wiring = DISCLOSURE_WIRING): DisclosureController {
  const expandMemory = new Map<string, boolean>();
  const targetOf = (id: string): DisclosureElement | null => doc.getElementById(normalizeId(id));
  const triggerOf = (id: string): DisclosureElement | null => {
    const norm = normalizeId(id);
    const wired = wiring.find((w) => w.targetId === norm);
    if (wired) {
      const byId = doc.getElementById(wired.triggerId);
      if (byId) return byId;
    }
    // Fallback: any trigger that declares it controls this target.
    try {
      return doc.querySelector(`[aria-controls="${norm}"]`);
    } catch {
      return null;
    }
  };

  /** Pairing check + state write. Always `hidden` property, never CSS. */
  const apply = (id: string, open: boolean): boolean => {
    assertFoldable(id);
    const target = targetOf(id);
    if (!target) throw new DisclosureError(`disclosure: target #${normalizeId(id)} 不存在`);
    const trigger = triggerOf(id);
    if (trigger) {
      if (!trigger.hasAttribute('aria-expanded') || !trigger.hasAttribute('aria-controls')) {
        throw new DisclosureError(
          `disclosure: 触发器 #${wiredTriggerId(id, wiring) ?? '?'} 缺少 aria-expanded / aria-controls 成对属性`,
        );
      }
      trigger.setAttribute('aria-expanded', String(open));
    }
    target.hidden = !open;
    expandMemory.set(normalizeId(id), open);
    return open;
  };

  const controller: DisclosureController = {
    targets: COLLAPSIBLE_TARGETS,
    toggle(id: string) {
      const norm = assertFoldable(id);
      return apply(norm, !controller.isOpen(norm));
    },
    open(id: string) {
      return apply(id, true);
    },
    close(id: string) {
      return apply(id, false);
    },
    isOpen(id: string) {
      assertFoldable(id);
      const target = targetOf(id);
      return target ? target.hidden !== true : false;
    },
    collapseAll() {
      for (const id of COLLAPSIBLE_TARGETS) apply(id, false);
    },
    expandMemory,
    snapshot() {
      const out: Record<string, boolean> = {};
      for (const id of COLLAPSIBLE_TARGETS) out[id] = controller.isOpen(id);
      return out;
    },
    restore(state) {
      const entries = state instanceof Map ? [...state.entries()] : Object.entries(state);
      for (const [key, open] of entries) {
        if (!isFoldable(key)) continue;
        apply(key, Boolean(open));
      }
    },
    triggerOf,
  };

  // Wire real clicks when the document gives us addEventListener-capable nodes.
  for (const w of wiring) {
    const trigger = doc.getElementById(w.triggerId);
    if (trigger?.addEventListener) {
      trigger.addEventListener('click', () => {
        try {
          controller.toggle(w.targetId);
        } catch {
          /* a whitelist violation must never be reachable from a click */
        }
      });
    }
  }
  return controller;
}

function wiredTriggerId(targetId: string, wiring: readonly { triggerId: string; targetId: string }[]): string | undefined {
  return wiring.find((w) => w.targetId === normalizeId(targetId))?.triggerId;
}

/** `window.__v3` shape shared by all v3 gates (read-only from later leaves). */
export interface V3Hooks {
  disclosure: DisclosureController;
  /** Test-only namespace: constructs risk projections for the density gate. */
  testing?: Record<string, unknown>;
}

/**
 * Mount the controller on the real panel and publish `window.__v3`.
 * Idempotent: a second call returns the existing controller.
 */
export function installDisclosure(
  doc: DisclosureDoc = document as unknown as DisclosureDoc,
  win: { __v3?: V3Hooks } = window as unknown as { __v3?: V3Hooks },
): DisclosureController {
  if (win.__v3?.disclosure) return win.__v3.disclosure;
  const controller = createDisclosure(doc);
  win.__v3 = { ...(win.__v3 ?? {}), disclosure: controller } as V3Hooks;
  return controller;
}
