import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSnap, type SnapChip } from './snap.js';

// Layout with the switcher's 50%-minus-chip padding: with container width
// 700 (centerX 350), padding-inline = 350-62 = 288, so at scrollLeft 0 the
// chips' viewport left edges are 292 + 128*i and their document centers are
// 352 + 128*i. Content width = 1416 + 2*288 = 1992 → maxScroll = 1992-700.
// Every chip can now scroll to the pointer center: chip i centers at
// scroll = 2 + 128*i ∈ [2, 1282] ⊆ [0, 1292] — none is ever skipped.
const CHIP_LEFT_AT_ZERO = 292;
const CENTER = 350;
const MAX_SCROLL = 1292;

/** chips as measured by getBoundingClientRect at the given scrollLeft */
function chipsAt(scroll: number): SnapChip[] {
  return Array.from({ length: 11 }, (_, i) => ({
    id: `c${i}`,
    left: CHIP_LEFT_AT_ZERO + i * 128 - scroll,
    width: 120,
  }));
}

test('left edge: selects the first chip and snaps it toward center', () => {
  // c0 center = 292+60 = 352, pointer at 350 → snap +2 to center it
  assert.deepEqual(computeSnap(0, MAX_SCROLL, CENTER, chipsAt(0)), { id: 'c0', scrollLeft: 2 });
});

test('right edge: selects the last chip and snaps it toward center', () => {
  // c10 center at maxScroll = 292+1280-1292+60 = 340, pointer at 350 → snap back 10
  assert.deepEqual(computeSnap(MAX_SCROLL, MAX_SCROLL, CENTER, chipsAt(MAX_SCROLL)), {
    id: 'c10',
    scrollLeft: MAX_SCROLL - 10,
  });
});

test('middle: selects the chip currently nearest the pointer', () => {
  // scroll 384 → c3 viewport center = 292+3*128-384+60 = 352 (d=2); c2 = 224
  // (d=126); c4 = 480 (d=130) → c3 wins, snaps +2 to 386
  const r = computeSnap(384, MAX_SCROLL, CENTER, chipsAt(384));
  assert.ok(r);
  assert.equal(r.id, 'c3');
  assert.equal(r.scrollLeft, 386);
});

test('middle: an off-center chip still snaps toward center', () => {
  // scroll 200 → c2 center = 408 (d=58); c1 = 280 (d=70); c3 = 536 (d=186)
  const r = computeSnap(200, MAX_SCROLL, CENTER, chipsAt(200));
  assert.ok(r);
  assert.equal(r.id, 'c2');
  assert.equal(r.scrollLeft, 258);
});

test('near right edge: picks the last chip and snaps toward center', () => {
  // scroll 1280 → c10 center = 352 (d=2) → snaps to 1282
  const r = computeSnap(1280, MAX_SCROLL, CENTER, chipsAt(1280));
  assert.ok(r);
  assert.equal(r.id, 'c10');
  assert.equal(r.scrollLeft, 1282);
});

test('NO chip is ever skipped: every id gets selected at some scroll position', () => {
  const selected = new Set<string>();
  for (let s = 0; s <= MAX_SCROLL; s++) {
    const r = computeSnap(s, MAX_SCROLL, CENTER, chipsAt(s));
    assert.ok(r, `no result at ${s}`);
    selected.add(r.id);
  }
  assert.deepEqual(
    [...selected].sort(),
    ['c0', 'c1', 'c10', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'],
    'every chip reachable while sliding',
  );
});

test('every scroll position resolves to a valid clamped target', () => {
  for (let s = 0; s <= MAX_SCROLL; s += 7) {
    const r = computeSnap(s, MAX_SCROLL, CENTER, chipsAt(s));
    assert.ok(r);
    assert.ok(r.scrollLeft >= 0 && r.scrollLeft <= MAX_SCROLL, `unclamped at ${s}`);
    assert.ok(r.id.startsWith('c'), `unknown id at ${s}`);
  }
});

test('empty chip list returns null; no-overflow case is safe', () => {
  assert.equal(computeSnap(0, 0, 400, []), null);
  // content fits: maxScroll = 0 → first chip, no scroll
  assert.deepEqual(computeSnap(0, 0, 400, chipsAt(0)), { id: 'c0', scrollLeft: 0 });
});
