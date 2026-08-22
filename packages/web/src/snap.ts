/**
 * Snap-target computation for the example switcher's sliding pointer.
 *
 * Pure geometry: given the current scroll position and the viewport
 * positions of the chips, decide which chip to auto-select and where to
 * snap the row. Kept DOM-free so the boundary rules are unit-testable.
 *
 * Rules:
 *   - scrolled to the LEFT edge  -> select the FIRST chip, stay at 0
 *   - scrolled to the RIGHT edge -> select the LAST chip, stay at maxScroll
 *     (the first/last chips can never reach the pointer center — scrollLeft
 *     is clamped to [0, maxScroll] — so at the edges the boundary chip wins)
 *   - middle: pick the chip whose CURRENT viewport center is closest to the
 *     pointer (real distance — every chip the pointer passes becomes the
 *     nearest one, so none is ever skipped), then snap it toward center,
 *     clamped to the scrollable range.
 */

export interface SnapChip {
  /** chip id (its data-id) */
  id: string;
  /** chip's viewport-relative left edge (getBoundingClientRect().left) */
  left: number;
  /** chip width (getBoundingClientRect().width) */
  width: number;
}

export interface SnapResult {
  id: string;
  /** target scrollLeft for the container */
  scrollLeft: number;
}

export function computeSnap(
  scrollLeft: number,
  maxScroll: number,
  centerX: number,
  chips: SnapChip[],
): SnapResult | null {
  if (chips.length === 0) return null;
  const clampScroll = (v: number) => Math.max(0, Math.min(maxScroll, v));

  const atLeft = scrollLeft <= 1;
  const atRight = maxScroll > 0 && scrollLeft >= maxScroll - 1;
  if (atLeft) {
    // already at the left edge — stay put, select the first chip
    return { id: chips[0].id, scrollLeft: 0 };
  }
  if (atRight) {
    // already at the right edge — stay put, select the last chip
    return { id: chips[chips.length - 1].id, scrollLeft: maxScroll };
  }
  // nearest to the pointer by REAL viewport distance
  let target = chips[0];
  let bestDist = Infinity;
  for (const chip of chips) {
    const d = Math.abs(chip.left + chip.width / 2 - centerX);
    if (d < bestDist) {
      bestDist = d;
      target = chip;
    }
  }
  const desired = scrollLeft + (target.left + target.width / 2 - centerX);
  return { id: target.id, scrollLeft: clampScroll(desired) };
}
