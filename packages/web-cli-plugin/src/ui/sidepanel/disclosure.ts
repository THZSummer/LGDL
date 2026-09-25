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
 * The **only** foldable targets (V4.5-1 W3 / TASK-V45-110 / ADR-V45-002 §5).
 *
 * The migration kept the **count at seven** — no foldable face was dropped without a
 * registered replacement:
 *
 *   · `l1-more` / `l1-consequences` — now minted **inside** the unique open
 *     `askuser` / `auth` card (the option pool + the consequence preview). Only the
 *     newest open card owns the ids, exactly like the `#ask*` / `#confirm*` family;
 *   · `l1-local-tree` / `l1-receipt` — the content containers moved into the L2
 *     read-only blocks (`#l2-tree-attribution` / `#l2-audit-evidence`) with their ids
 *     and `data-l1-panel` intact (their triggers are retired: inside a view the block
 *     is simply open);
 *   · `l1-gestures` — the six-gesture table moved into the settings「帮助」section
 *     (`#settings-help`, ADR-V45-008) with its id / table structure unchanged;
 *   · `l2-tree-attribution` / `l2-audit-evidence` — the two new L2 carrier blocks.
 *
 * Deliberately absent (unchanged from v4): `#region-statusbar` / `#risk-chips` /
 * `#risk-rail` / `#risk-detail`, `#stream` / `#view-host` / `#settings-view`,
 * `#confirm` / `#ask`（永不折叠, see {@link NEVER_FOLDABLE}）. ★ IAN-2：`#composer` 三 id
 * 已**真退役**（不在文档中 ⇒ 既非折叠目标也非永不折叠目标）。
 */
export const COLLAPSIBLE_TARGETS = Object.freeze([
  'l1-more',
  'l1-consequences',
  'l1-local-tree',
  'l1-receipt',
  'l1-gestures',
  'l2-tree-attribution',
  'l2-audit-evidence',
] as const);

/**
 * Targets that are **card-minted** (the unique open `askuser` / `auth` card owns the
 * id) — they may legitimately be absent from the document when no such card is open,
 * so `collapseAll()` skips them instead of throwing (TASK-V45-110 判定：卡内作用域).
 * (A third of the whitelist lives inside a view and is excluded from the auto-fold for
 * the same reason a view is not a foldable target — see {@link NEVER_AUTO_COLLAPSE_TARGETS}.)
 * Existence is still REQUIRED for `open()` / `close()` / `toggle()`: an explicit
 * interaction on a missing target stays a programming error.
 */
export const CARD_MINTED_TARGETS: readonly string[] = Object.freeze(['l1-more', 'l1-consequences']);

/**
 * Targets that live **inside a view** (`#view-host` / `#settings-view`). They are
 * whitelisted (their content is a read-only block) but excluded from `collapseAll()`: a
 * view is dismissed by *leaving* the view, and auto-folding a block inside an open view
 * would leave a silently hidden read-only area. `open()` / `close()` still work on them
 * (a gate can fold them explicitly), and the rendered mark / `aria` stays the
 * controller's — not a second mechanism.
 */
export const NEVER_AUTO_COLLAPSE_TARGETS: readonly string[] = Object.freeze([
  'l1-local-tree',
  'l1-receipt',
  'l1-gestures',
  'l2-tree-attribution',
  'l2-audit-evidence',
]);

/** Trigger → target wiring. A `null` trigger = the target has no fold affordance. */
export const DISCLOSURE_WIRING = Object.freeze([
  Object.freeze({ triggerId: 'l1-more-toggle', targetId: 'l1-more', summary: '其余选项' }),
  Object.freeze({ triggerId: 'l1-consequences-toggle', targetId: 'l1-consequences', summary: '选项后果与影响预演' }),
  Object.freeze({ triggerId: null, targetId: 'l1-local-tree', summary: '局部树只读归因' }),
  Object.freeze({ triggerId: null, targetId: 'l1-receipt', summary: '回执证据' }),
  Object.freeze({ triggerId: null, targetId: 'l1-gestures', summary: '页面交互说明（设置「帮助」分区）' }),
  Object.freeze({ triggerId: null, targetId: 'l2-tree-attribution', summary: '树视图只读归因块' }),
  Object.freeze({ triggerId: null, targetId: 'l2-audit-evidence', summary: '审计视图证据区' }),
] as const);

/**
 * V4.5-1 W3: the foldable faces that **retired** with the decision shell / L1 group.
 * Re-introducing one as a foldable target (or as an `aria-controls` target) is a
 * regression — asserted negatively by `test/l0-disclosure.test.ts`.
 */
export const RETIRED_FOLDABLE_IDS: readonly string[] = Object.freeze(['l1-history', 'l1-ref']);

/**
 * V4.5-1 W3: the triggers that retired together with the hosts they lived in. Zero DOM
 * presence is required (`getElementById(...) === null`); a re-introduced trigger would
 * be a second, fixed fold affordance outside a card.
 */
export const RETIRED_TRIGGER_IDS: readonly string[] = Object.freeze([
  'l0-more',
  'l0-ref-toggle',
  'l1-local-tree-toggle',
  'l1-history-toggle',
  'l1-receipt-toggle',
  'l1-gestures-toggle',
]);

/**
 * Targets that must never be foldable — asserted negatively by the unit test.
 *
 * V4.5-1 W3: `l0-decision` (the shell) retired, so it moved to
 * {@link RETIRED_NEVER_FOLDABLE_IDS} with its own counter-proof; three **new** real
 * surfaces joined the ban list instead (`region-stream` = the chat zone,
 * `settings-root` = the settings mount, `settings-help` = the new read-only help
 * section) ⇒ 12 − 1 + 3 = **14**.
 *
 * ★ IAN-2（ADR-IAN-004 §①步4 / ADR-IAN-005 §⑥ / X-IAN-9）：`'composer'` **退役** ——
 * 元素真退役（DOM 移除，非 `hidden`）⇒ 无需「永不折叠」，计数 **14 − 1 = 13**（非恒真：
 * 重新引入 `#composer` ⇒ `l0-disclosure` 的退役 / 折叠判据必红）。
 */
export const NEVER_FOLDABLE = Object.freeze([
  'risk-rail',
  'risk-chips',
  'risk-detail',
  'region-toolbar',
  'region-stream',
  'region-statusbar',
  'stream',
  'view-host',
  'settings-view',
  'settings-root',
  'settings-help',
  'confirm',
  'ask',
]);

/**
 * Former never-foldable targets that retired. Kept as a registered ban: folding one is
 * still refused, and the entry documents WHY it left the live list.
 */
export const RETIRED_NEVER_FOLDABLE_IDS = Object.freeze(['l0-decision']);

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
      : (RETIRED_NEVER_FOLDABLE_IDS as readonly string[]).includes(id)
        ? '该目标已退役（决策壳随宿主清零移除）'
        : (RETIRED_FOLDABLE_IDS as readonly string[]).includes(id)
          ? '该目标已退役（折叠面随宿主清零迁移到卡内 / 视图内）'
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
export function createDisclosure(
  doc: DisclosureDoc,
  wiring: readonly { readonly triggerId: string | null; readonly targetId: string; readonly summary: string }[] = DISCLOSURE_WIRING,
): DisclosureController {
  const expandMemory = new Map<string, boolean>();
  const targetOf = (id: string): DisclosureElement | null => doc.getElementById(normalizeId(id));
  const triggerOf = (id: string): DisclosureElement | null => {
    const norm = normalizeId(id);
    const wired = wiring.find((w) => w.targetId === norm);
    if (wired?.triggerId) {
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
      // V4.5-1 W3: a card-minted target only exists while its card is open (skip when
      // absent instead of throwing — the card's own scope owns its lifetime), and the L2
      // view blocks are dismissed by leaving the view (never auto-folded).
      for (const id of COLLAPSIBLE_TARGETS) {
        if ((NEVER_AUTO_COLLAPSE_TARGETS as readonly string[]).includes(id)) continue;
        if ((CARD_MINTED_TARGETS as readonly string[]).includes(id) && !targetOf(id)) continue;
        apply(id, false);
      }
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
        // V4.5-1 W3: a lazily-mounted face (the settings「帮助」section's `l1-gestures`) may
        // legitimately not exist when a snapshot is restored — there is nothing to restore
        // there, so it is skipped. Explicit `open()` / `close()` still throw (a编程错误).
        if (!targetOf(key)) continue;
        apply(key, Boolean(open));
      }
    },
    triggerOf,
  };

  // Wire real clicks when the document gives us addEventListener-capable nodes.
  for (const w of wiring) {
    if (!w.triggerId) continue;
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

function wiredTriggerId(
  targetId: string,
  wiring: readonly { readonly triggerId: string | null; readonly targetId: string }[],
): string | undefined {
  return wiring.find((w) => w.targetId === normalizeId(targetId))?.triggerId ?? undefined;
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
