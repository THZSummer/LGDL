/**
 * Side-panel scroll-follow policy (regression fix: messages did not auto-scroll).
 *
 * Pure, DOM-free decision logic extracted from `sidepanel.ts` so it is unit
 * testable in node and so the DOM layer only consumes a decision (the actual
 * scroll is applied in `requestAnimationFrame`, after layout, in sidepanel.ts).
 *
 * Policy (matches the user-visible requirements):
 *  - The user's own send always follows, unconditionally — explicit intent.
 *  - Appended assistant / tool / thinking content follows only while the user's
 *    viewport is anchored near the bottom.
 *  - "Near the bottom" uses a generous threshold (48px). The previous 24px (and
 *    an even tighter historical window) dropped the anchor on ordinary rounding
 *    or a one-line reflow, after which every later append preserved the stale
 *    position — the「基本不跟随、每次都要点回到底部」regression. Once the anchor
 *    is lost it could never recover because the decision was re-measured from a
 *    position we ourselves had just pinned away from the bottom.
 *  - The anchor is refreshed from *live* metrics (`observe`) which the DOM layer
 *    feeds from real `scroll` events and from post-layout re-measurements — never
 *    from a stale pre-append read.
 *  - A real user scroll-up always wins: it clears the anchor until the user
 *    returns to the bottom (or sends).
 */

/** Generous bottom threshold: wide enough to absorb rounding/small reflows. */
export const BOTTOM_THRESHOLD_PX = 48;

export interface ScrollMetrics {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}

/** Distance from the bottom, clamped at 0 (negative over-scroll counts as 0). */
export function distanceFromBottom(m: ScrollMetrics): number {
  return Math.max(0, m.scrollHeight - m.scrollTop - m.clientHeight);
}

/** Whether the viewport is anchored near the bottom (generous threshold). */
export function isNearBottom(m: ScrollMetrics, threshold = BOTTOM_THRESHOLD_PX): boolean {
  return distanceFromBottom(m) <= threshold;
}

export interface ScrollFollow {
  /** Feed live metrics (real scroll events / post-layout re-measure). */
  observe(m: ScrollMetrics): void;
  /** The user sent a message → the next append must pin unconditionally. */
  userSent(): void;
  /** The user clicked「回到底部」→ re-anchor. */
  returnedToBottom(): void;
  /** Consume the follow decision for the next append (one-shot for `userSent`). */
  shouldFollow(): boolean;
  /** Whether the viewport is currently anchored near the bottom (drives the hint). */
  readonly anchored: boolean;
}

/**
 * Create a scroll-follow policy. Defaults to anchored (a fresh panel is at the
 * bottom of an empty list).
 */
export function createScrollFollow(threshold = BOTTOM_THRESHOLD_PX): ScrollFollow {
  let anchored = true;
  let forced = false;
  return {
    observe(m) {
      anchored = isNearBottom(m, threshold);
    },
    userSent() {
      forced = true;
      anchored = true;
    },
    returnedToBottom() {
      anchored = true;
    },
    shouldFollow() {
      if (forced) {
        forced = false;
        anchored = true;
        return true;
      }
      return anchored;
    },
    get anchored() {
      return anchored;
    },
  };
}
