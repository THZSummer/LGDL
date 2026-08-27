import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeEdge, shapeEdgePoint, routeRectilinear, orthogonalize, pathCrosses } from './index.js';

test('routeEdge produces an orthogonal clear path around a blocker', () => {
  // source at (10,10), target at (90,10), a blocker box in between at y=0..20
  const pts = routeEdge({
    points: [{ x: 10, y: 10 }, { x: 90, y: 10 }],
    srcKind: 'process',
    dstKind: 'process',
    obstacles: [{ x: 40, y: 0, w: 24, h: 20 }],
    bounds: { w: 120, h: 60 },
  });
  assert.ok(pts.length >= 2, 'path produced');
  // every consecutive pair is axis-aligned (90° orthogonal)
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    assert.ok(Math.abs(a.x - b.x) < 0.5 || Math.abs(a.y - b.y) < 0.5, `leg ${i} is axis-aligned`);
  }
  // path must not cross the blocker box
  assert.ok(!pathCrosses(pts, [{ x: 40, y: 0, w: 24, h: 20 }]), 'does not cross the blocker');
  // starts/ends at the anchors
  assert.equal(pts[0].x, 10);
  assert.equal(pts[0].y, 10);
  assert.equal(pts[pts.length - 1].x, 90);
  assert.equal(pts[pts.length - 1].y, 10);
});

test('routeEdge routes vertically aligned nodes straight down', () => {
  const pts = routeEdge({
    points: [{ x: 50, y: 20 }, { x: 50, y: 100 }],
    srcNode: { x: 30, y: 0, width: 40, height: 20 },
    dstNode: { x: 30, y: 100, width: 40, height: 20 },
    srcKind: 'process',
    dstKind: 'process',
    obstacles: [],
    bounds: { w: 120, h: 140 },
  });
  // straight vertical drop at the centre column
  assert.deepEqual(pts[0], { x: 50, y: 20 });
  assert.deepEqual(pts[pts.length - 1], { x: 50, y: 100 });
});

test('shapeEdgePoint anchors on a diamond/rounded-rect border', () => {
  const box = { x: 0, y: 0, width: 100, height: 60 };
  // toward the right -> lands on the right vertex of the diamond (cx + w/2 = 100)
  const right = shapeEdgePoint('decision', box, { x: 200, y: 30 });
  assert.equal(right.x, 100);
  assert.equal(right.y, 30);
  // toward the bottom -> lands on the bottom of a rounded rect
  const bottom = shapeEdgePoint('process', box, { x: 50, y: 200 });
  assert.equal(bottom.y, 60);
});

test('routeRectilinear avoids a blocker in the drop path', () => {
  const src = { x: 20, y: 10 };
  const dst = { x: 80, y: 60 };
  const boxes = [{ x: 30, y: 20, w: 20, h: 20 }];
  const path = routeRectilinear(src, dst, boxes, [src, dst]);
  assert.ok(!pathCrosses(path, boxes), 'rectilinear path avoids the blocker');
});
