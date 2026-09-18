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

/** Anti-abuse ② (FR-CHAT-073): the empty-stream welcome state shows ≤2 cards. */
export const MAX_FIRST_SCREEN_CARDS = 2;

/** §12 裁决 4: at most ONE welcome card. */
export const MAX_WELCOME_CARDS = 1;

/** §12 裁决 4: the welcome card text must fit 8 lines (8 × 34 = 272 chars). */
export const MAX_WELCOME_LINES = 8;

/** The DOM attribute carried by every transitional host (parent ADR-V4-005). */
export const TRANSITIONAL_HOST_ATTR = 'data-transitional-host';

/** Chrome controls must never be reachable from inside the stream. */
export const CHROME_CONTROL_ATTR = 'data-chrome-control';

/** `#stream`'s root selector — the ONLY id renamed by this leaf (`#log` → `#stream`). */
export const STREAM_SELECTOR = '#stream';

/**
 * FR-CHAT-075 / RP-V4-06 — assert that no chrome control sits inside the stream.
 *
 * Throws (never returns false): a silently-false assertion is exactly the
 * failure mode this whole file exists to prevent.
 *
 *  ① `#stream` subtree contains **zero** `[data-chrome-control]` elements;
 *  ② `#region-toolbar` / `#region-statusbar` are **not** descendants of `#stream`
 *     (the structural half of S1 — a zone cannot hide inside the exempt subtree).
 */
export function assertChromeNotInStream(root: ParentNode = document): void {
  const stream = root.querySelector?.(STREAM_SELECTOR) ?? null;
  if (!stream) throw new Error('assertChromeNotInStream: #stream 不存在（三区骨架未落地）');
  const chromeInStream = stream.querySelectorAll(`[${CHROME_CONTROL_ATTR}]`);
  if (chromeInStream.length > 0) {
    const ids = Array.from(chromeInStream)
      .map((el) => (el as HTMLElement).id || el.tagName.toLowerCase())
      .join(', ');
    throw new Error(`assertChromeNotInStream: #stream 子树内含 ${chromeInStream.length} 个 [${CHROME_CONTROL_ATTR}]（${ids}）—— 豁免子树不得承载常驻控件`);
  }
  for (const zone of ['#region-toolbar', '#region-statusbar']) {
    const el = root.querySelector?.(zone) ?? null;
    if (!el) throw new Error(`assertChromeNotInStream: ${zone} 不存在`);
    if (stream.contains(el)) throw new Error(`assertChromeNotInStream: ${zone} 是 #stream 的后代 —— 常驻区不得被豁免子树吞并`);
  }
}

/** The four anti-abuse constants, as one frozen record (gates consume this shape). */
export const CARD_BUDGET_LIMITS = Object.freeze({
  maxClickablesPerCard: MAX_CLICKABLES_PER_CARD,
  maxFirstScreenCards: MAX_FIRST_SCREEN_CARDS,
  maxWelcomeCards: MAX_WELCOME_CARDS,
  maxWelcomeLines: MAX_WELCOME_LINES,
});
