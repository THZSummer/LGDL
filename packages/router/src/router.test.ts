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

test('routeEdge does not slide along its own source edge (diagonal overlap)', () => {
  // Mirrors the mindmap 部署方案(deploy)→云部署(cloud) case: the target sits
  // down-left of the source, and the two boxes' x-ranges overlap. The router
  // must exit from the source's "toward the target" anchor (150°, on the bottom
  // edge, x≈275.5), NOT from the left face centre (x=244) — which made the first
  // leg run 90px straight down the source's own left wall (a real hug).
  const srcNode = { x: 244, y: 262, width: 160, height: 56 };
  const dstNode = { x: 40, y: 352, width: 160, height: 56 };
  const ortho = routeEdge({
    points: [{ x: 324, y: 290 }, { x: 183, y: 352 }],
    srcNode,
    dstNode,
    srcKind: 'process',
    dstKind: 'process',
    obstacles: [],
    bounds: { w: 404, h: 420 },
  });
  // Direct geometric assertion (independent of pathHugLength): if the first leg
  // is vertical, it must NOT run flush against the source's left/right wall.
  const [a, b] = ortho;
  const firstIsVertical = Math.abs(a.x - b.x) < 0.5;
  if (firstIsVertical) {
    const dLeft = Math.abs(a.x - srcNode.x);
    const dRight = Math.abs(a.x - (srcNode.x + srcNode.width));
    assert.ok(
      Math.min(dLeft, dRight) > 8,
      `first leg slides along the source side wall (x=${a.x}, dLeft=${dLeft}, dRight=${dRight})`,
    );
  }
  // And the exit point must be the source's bottom-edge anchor (y == bottom),
  // i.e. the edge leaves downward toward the target, not sideways.
  assert.ok(Math.abs(a.y - (srcNode.y + srcNode.height)) < 0.6, `src exits at y=${a.y}, not the bottom edge`);
});

test('routeEdge keeps endpoints on 15°-quantised anchors', () => {
  // Same diagonal-overlap setup: every endpoint must be one of the 24 15°
  // shape-border anchors (same set the renderer exposes on hover), never a
  // re-centred continuous point.
  const srcNode = { x: 244, y: 262, width: 160, height: 56 };
  const dstNode = { x: 40, y: 352, width: 160, height: 56 };
  const ortho = routeEdge({
    points: [{ x: 324, y: 290 }, { x: 183, y: 352 }],
    srcNode,
    dstNode,
    srcKind: 'process',
    dstKind: 'process',
    obstacles: [],
    bounds: { w: 404, h: 420 },
  });
  const anchorsOf = (box: { x: number; y: number; width: number; height: number }): { x: number; y: number }[] => {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const out: { x: number; y: number }[] = [];
    for (let k = 0; k < 24; k++) {
      const th = (k * Math.PI) / 12;
      out.push(shapeEdgePoint('process', box, { x: cx + Math.cos(th), y: cy + Math.sin(th) }));
    }
    return out;
  };
  const onAnchor = (p: { x: number; y: number }, set: { x: number; y: number }[]): boolean =>
    set.some((a) => Math.abs(a.x - p.x) < 0.6 && Math.abs(a.y - p.y) < 0.6);
  assert.ok(onAnchor(ortho[0], anchorsOf(srcNode)), `src endpoint ${ortho[0].x},${ortho[0].y} off-anchor`);
  assert.ok(onAnchor(ortho[ortho.length - 1], anchorsOf(dstNode)), `dst endpoint off-anchor`);
});
