/**
 * V4-1 TASK-502 / FR-CHAT-070 / FR-CHAT-071 / FR-CHAT-072 / FR-CHAT-075 —
 * **the single declaration point of the density exemption scope and of the
 * four anti-abuse constants** (ADR-V4-020 decision 1, ADR-V4-006).
 *
 * Why this file exists at all (and why nothing else may declare these values):
 *
 *  · The v4 caliber measures `document.body` (unchanged, parent ADR-V4-006) but
 *    must **skip the `#stream` subtree** — the chat stream is the product's
 *    content area, not chrome, so its cards are budgeted by the *per-card* and
 *    *first-screen* rules (FR-CHAT-072/073) instead of the resident-chrome
 *    ceilings.
 *  · An exemption is the classic way to make a density gate lie: move the
 *    toolbar into the exempt subtree and the clickable count collapses. So the
 *    exemption must have exactly ONE declaration, and the gates must (a) read
 *    the value *from here* and (b) refuse to run when a second declaration
 *    appears anywhere in the repo.
 *  · `assertChromeNotInStream()` is the machine form of that refusal: it is
 *    shipped inside the product and exposed through the test hooks, so the
 *    runtime gate can inject a violation and watch it throw (RP-V4-06).
 *
 * `test/ui/density-metrics.mjs` (the caliber single source) extracts the literal
 * values **from this file's source text** — never from a copy — and
 * `test/density-thresholds.test.ts` re-asserts the extracted literals plus the
 * "declared exactly once" scan.
 *
 * Zero dependencies (NFR-V3-017): DOM types only.
 */

/**
 * The exempt subtrees. `#stream` is the chat-stream root (`ol#stream[role=log]`).
 * `#region-stream` (the zone) is **not** exempt — only the stream itself is, so
 * `#view-host` and any zone-level chrome keep being measured.
 */
export const DENSITY_EXCLUDED_SUBTREES: readonly string[] = Object.freeze(['#stream']);

/** The three zone shells (C4 / attribution only — never an exemption). */
export const DENSITY_SHELL_ROOTS: readonly string[] = Object.freeze([
  '#region-toolbar',
  '#region-stream',
  '#region-statusbar',
]);

/**
 * Anti-abuse ① (FR-CHAT-072): no single message card may hold more than 6
 * clickables. Registered as the first-screen / per-card budget seam.
 */
export const MAX_CLICKABLES_PER_CARD = 6;

/**
 * Anti-abuse ② (FR-CHAT-073): the empty-stream welcome state shows ≤2 cards.
 */
export const MAX_FIRST_SCREEN_CARDS = 2;

/**
 * Anti-abuse ③ (V4-2 TASK-613 / FR-CHAT-072 · FR-CHAT-073 重审后**收紧**) —
 * the first screen's cards may hold at most this many clickables **in aggregate**.
 *
 * Why an aggregate cap on top of the per-card one: the v4 exemption removes the
 * whole `#stream` subtree from the chrome density, so nothing in the inherited
 * ceilings sees a stream card at all. The v4-1 caliber left the theoretical shape
 * 「首屏 2 卡 × 每卡 6 可点 = 12 个常驻入口」inside the exempt subtree (v3's whole
 * panel cap was 7), and validate R1 (N-03) proved a 6-entry card tripped nothing.
 *
 * The v4-2 re-review (TASK-613) keeps the per-card ≤6 rule **and** adds this
 * aggregate cap; the real 12 card types render at most 5 clickables (ask-user
 * choice: ≤3 options +「其他…」+ 取消) and the first screen shows ≤2 cards, so the
 * product's default screen sits far below the cap — the cap only bites the abuse
 * shape.
 */
export const MAX_STREAM_RESIDENT_CLICKABLES = 8;

/** Chrome controls must never be reachable from inside the stream (the mark). */
export const CHROME_CONTROL_ATTR = 'data-chrome-control';

/** The toolbar/view entry marker used by the toolbar renderer (the form, ①/②). */
export const TOOLBAR_SLOT_ATTR = 'data-toolbar-slot';

/**
 * V4-2 TASK-613 ① — the **form** criterion for「常驻导航入口」: a control carrying
 * any of these attributes inside `#stream` is a resident navigation entry (not
 * card-content interaction) and is rejected regardless of count.
 */
export const RESIDENT_NAV_ATTRS: readonly string[] = Object.freeze([
  CHROME_CONTROL_ATTR,
  TOOLBAR_SLOT_ATTR,
]);

/** V4-2 TASK-613 ① — the class-based half of the same form criterion. */
export const RESIDENT_NAV_CLASSES: readonly string[] = Object.freeze(['view-btn']);

/** §12 裁决 4: at most ONE welcome card. */
export const MAX_WELCOME_CARDS = 1;

/** §12 裁决 4: the welcome card text must fit 8 lines (8 × 34 = 272 chars). */
export const MAX_WELCOME_LINES = 8;

/** The DOM attribute carried by every transitional host (parent ADR-V4-005). */
export const TRANSITIONAL_HOST_ATTR = 'data-transitional-host';

/** `#stream`'s root selector — the ONLY id renamed by this leaf (`#log` → `#stream`). */
export const STREAM_SELECTOR = '#stream';

/**
 * FR-CHAT-075 / RP-V4-06 — assert that no chrome control sits inside the stream.
 *
 * Throws (never returns false): a silently-false assertion is exactly the
 * failure mode this whole file exists to prevent.
 *
 *  ① `#stream` subtree contains **zero** resident-navigation entries — by MARK
 *     (`[data-chrome-control]`) **and** by FORM (V4-2 TASK-613: `[data-toolbar-slot]`
 *     / `.view-btn`, the two shapes a toolbar/view entry is actually built from);
 *  ② `#region-toolbar` / `#region-statusbar` are **not** descendants of `#stream`
 *     (the structural half of S1 — a zone cannot hide inside the exempt subtree).
 */
export function assertChromeNotInStream(root: ParentNode = document): void {
  const stream = root.querySelector?.(STREAM_SELECTOR) ?? null;
  if (!stream) throw new Error('assertChromeNotInStream: #stream 不存在（三区骨架未落地）');
  const selector = [
    ...RESIDENT_NAV_ATTRS.map((attr) => `[${attr}]`),
    ...RESIDENT_NAV_CLASSES.map((cls) => `.${cls}`),
  ].join(', ');
  const resident = stream.querySelectorAll(selector);
  if (resident.length > 0) {
    const ids = Array.from(resident)
      .map((el) => (el as HTMLElement).id || el.tagName.toLowerCase())
      .join(', ');
    throw new Error(
      `assertChromeNotInStream: #stream 子树内含 ${resident.length} 个常驻导航入口（${ids}）—— 豁免子树不得承载常驻控件（标记 + 形态双判据）`,
    );
  }
  for (const zone of ['#region-toolbar', '#region-statusbar']) {
    const el = root.querySelector?.(zone) ?? null;
    if (!el) throw new Error(`assertChromeNotInStream: ${zone} 不存在`);
    if (stream.contains(el)) throw new Error(`assertChromeNotInStream: ${zone} 是 #stream 的后代 —— 常驻区不得被豁免子树吞并`);
  }
}

/** The five anti-abuse constants, as one frozen record (gates consume this shape). */
export const CARD_BUDGET_LIMITS = Object.freeze({
  maxClickablesPerCard: MAX_CLICKABLES_PER_CARD,
  maxFirstScreenCards: MAX_FIRST_SCREEN_CARDS,
  maxWelcomeCards: MAX_WELCOME_CARDS,
  maxWelcomeLines: MAX_WELCOME_LINES,
  maxStreamResidentClickables: MAX_STREAM_RESIDENT_CLICKABLES,
});

/* ────────────────────────────────────────────────────────────────────────────
 * V4.5-1 W3 (TASK-V45-107 / ADR-V45-002 §2) — the **pure chronological card list**
 * criterion, shipped in the product (same shape as `assertChromeNotInStream`).
 * ──────────────────────────────────────────────────────────────────────────── */

/** The empty-state placeholder class — the ONLY allowed non-card child of `#stream`. */
export const EMPTY_STREAM_PLACEHOLDER_CLASS = 'log-empty-text';

/** The card identity attribute (`<li data-msg-type="…" data-card-key="…">`). */
export const CARD_IDENTITY_ATTR = 'data-msg-type';

/** The fixed-position host attribute (zero occurrences is the terminal reading). */
export const HOST_ATTR = 'data-host';

export interface StreamShapeReading {
  /** How many direct children of `#stream` carry a card identity. */
  readonly cardChildren: number;
  /** How many direct children carry the empty-state placeholder class. */
  readonly emptyPlaceholders: number;
  /** How many direct children are neither a card nor the placeholder. */
  readonly foreignChildren: number;
  /** Any depth `li[data-host]` / `li[data-transitional-host]` count (must be 0). */
  readonly hostNodes: number;
  /** Foreign children, for the readable message. */
  readonly foreignIds: readonly string[];
}

/**
 * Read the stream's shape. Pure DOM read — the SAME function feeds the product
 * assertion, the node gate and the Chromium gate, so a second caliber cannot appear.
 */
export function readStreamShape(root: ParentNode = document): StreamShapeReading {
  const stream = root.querySelector?.(STREAM_SELECTOR) ?? null;
  if (!stream) throw new Error('readStreamShape: #stream 不存在（三区骨架未落地）');
  const children = Array.from((stream as Element).children ?? []);
  const foreign = children.filter(
    (el) =>
      !el.hasAttribute(CARD_IDENTITY_ATTR) && !el.classList.contains(EMPTY_STREAM_PLACEHOLDER_CLASS),
  );
  return {
    cardChildren: children.filter((el) => el.hasAttribute(CARD_IDENTITY_ATTR)).length,
    emptyPlaceholders: children.filter((el) => el.classList.contains(EMPTY_STREAM_PLACEHOLDER_CLASS)).length,
    foreignChildren: foreign.length,
    hostNodes: (stream as Element).querySelectorAll(`[${HOST_ATTR}], [${TRANSITIONAL_HOST_ATTR}]`).length,
    foreignIds: foreign.map((el) => (el as HTMLElement).id || el.tagName.toLowerCase()),
  };
}

/**
 * The **pure card order** judgement (falsifiable, non-vacuous):
 *
 *   ① every direct child of `#stream` is either a card (`li[data-msg-type]`) or the
 *      empty-state placeholder — any other child fails (the whitelist is a registry,
 *      so a new fixed home cannot be smuggled in as a wrapper);
 *   ② the placeholder appears **at most once** (and only as a direct child);
 *   ③ **zero** `li[data-host]` / `li[data-transitional-host]` at ANY depth — the four
 *      fixed-position hosts are retired and may not come back by rename.
 *
 * Throws (never returns false) — the v4-4 BLOCK-02 lesson: a silently-false assertion
 * is the failure mode this criterion exists to prevent.
 */
export function assertStreamPureCardOrder(root: ParentNode = document): void {
  const shape = readStreamShape(root);
  if (shape.hostNodes !== 0) {
    throw new Error(
      `assertStreamPureCardOrder: #stream 子树内含 ${shape.hostNodes} 个宿主节点（[${HOST_ATTR}] / [${TRANSITIONAL_HOST_ATTR}]）—— 零宿主是终态，不得以改名复活`,
    );
  }
  if (shape.foreignChildren !== 0) {
    throw new Error(
      `assertStreamPureCardOrder: #stream 含 ${shape.foreignChildren} 个非卡子节点（${shape.foreignIds.join(', ')}）—— 唯一允许的非卡子节点是空态占位 .${EMPTY_STREAM_PLACEHOLDER_CLASS}`,
    );
  }
  if (shape.emptyPlaceholders > 1) {
    throw new Error(`assertStreamPureCardOrder: 空态占位计数 = ${shape.emptyPlaceholders}，必须 ≤ 1`);
  }
}
