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
  // must leave the source without riding its own wall — the pre-fix shortest
  // path ran 90px straight down the source's left wall.
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
  // Direct geometric assertion (independent of pathHugLength): the first leg must
  // not run PARALLEL to a source wall — neither a vertical leg along the left/right
  // wall, nor a horizontal leg along the top/bottom wall.
  const [a, b] = ortho;
  const firstIsVertical = Math.abs(a.x - b.x) < 0.5;
  const len = firstIsVertical ? Math.abs(a.y - b.y) : Math.abs(a.x - b.x);
  if (firstIsVertical) {
    const dWall = Math.min(Math.abs(a.x - srcNode.x), Math.abs(a.x - (srcNode.x + srcNode.width)));
    assert.ok(!(len > 8 && dWall < 8), `first leg slides along the source side wall (x=${a.x}, len=${len})`);
  } else {
    const dWall = Math.min(Math.abs(a.y - srcNode.y), Math.abs(a.y - (srcNode.y + srcNode.height)));
    assert.ok(!(len > 8 && dWall < 8), `first leg slides along the source top/bottom wall (y=${a.y}, len=${len})`);
  }
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

test('routeEdge detours instead of sliding along the target top edge', () => {
  // Mirrors the login-flow verify→ok case: the decision sits above and to the
  // RIGHT of the target. The bend-fewest path drops straight down then slides
  // LEFT along the target's top edge to reach its centre (a real hug). The
  // router must detour — keep the horizontal leg clear of the target top — and
  // still enter at the target's top-face anchor.
  const srcNode = { x: 170, y: 586, width: 140, height: 80 };
  const dstNode = { x: 80, y: 762, width: 120, height: 48 };
  const ortho = routeEdge({
    points: [{ x: 240, y: 626 }, { x: 140, y: 786 }],
    srcNode,
    dstNode,
    srcKind: 'decision',
    dstKind: 'end',
    obstacles: [],
    bounds: { w: 480, h: 900 },
  });
  // No horizontal leg may run along the target's top edge for more than a few px
  // (the tiny ≤ cell entry stub is the only allowed exception).
  const dstTop = dstNode.y;
  for (let i = 0; i < ortho.length - 1; i++) {
    const a = ortho[i], b = ortho[i + 1];
    if (Math.abs(a.y - b.y) < 0.5) {
      const len = Math.abs(a.x - b.x);
      assert.ok(
        !(Math.abs(a.y - dstTop) < 0.5 && len > 8),
        `horizontal leg slides along the target top edge (y=${a.y}, len=${len})`,
      );
    }
  }
  // The entry point stays on the target's top face (a 15° anchor).
  assert.ok(Math.abs(ortho[ortho.length - 1].y - dstTop) < 0.6, `enters at y=${ortho[ortho.length - 1].y}, not the target top`);
});

test('routeEdge does not slide down its own source side wall (y-overlap)', () => {
  // Mirrors the uml-class order→payment case: the two boxes overlap in y and are
  // offset horizontally, with the other entities (user/cart) beside them. The
  // bend-fewest path exits the source's right edge then slides DOWN its own right
  // wall to reach the target's entry anchor (a real hug). The router must leave
  // the source without riding that wall.
  const srcNode = { x: 296, y: 90, width: 160, height: 156 };
  const dstNode = { x: 636, y: 200, width: 160, height: 102 };
  const ortho = routeEdge({
    points: [{ x: 376, y: 168 }, { x: 546, y: 168 }, { x: 546, y: 251 }, { x: 716, y: 251 }],
    srcNode,
    dstNode,
    srcKind: 'entity',
    dstKind: 'entity',
    obstacles: [
      { x: 80, y: 212, w: 160, h: 120 },
      { x: 296, y: 330, w: 164, h: 120 },
    ],
    bounds: { w: 876, h: 540 },
  });
  // A real slide is a LONG first leg running along the source's own side wall.
  const [a, b] = ortho;
  const firstIsVertical = Math.abs(a.x - b.x) < 0.5;
  if (firstIsVertical) {
    const len = Math.abs(a.y - b.y);
    const dWall = Math.min(Math.abs(a.x - srcNode.x), Math.abs(a.x - (srcNode.x + srcNode.width)));
    assert.ok(
      !(len > 8 && dWall < 8),
      `first leg slides along the source side wall (x=${a.x}, len=${len})`,
    );
  }
});

