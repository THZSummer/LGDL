/**
 * @lgdl/router — LGDL orthogonal edge router.
 *
 * Pure geometry: decides the final rectilinear polyline of an edge from its
 * source/target shape borders to the destination, avoiding every third-party
 * node/group box. It has no knowledge of the DOM, styling, or how a node is
 * drawn — it only needs the node's bounding box and its SHAPE KIND (the
 * renderer decides what the effective kind is for its mode, e.g. mindmap
 * renders everything as a rounded rect, and passes that kind in).
 */

export interface Pt {
  x: number;
  y: number;
}

/** A node-style box (used for source/target anchors). */
export interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An obstacle-style box (as used in the routing search). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Re-centre an exit anchor onto the midpoint of the face the edge actually
 * leaves from. `anchor` is already ON the border (from `shapeEdgePoint`); the
 * exit face is chosen from the edge's TRAVEL direction (toward the target), not
 * from where the anchor happens to sit, so a vertical drop never hugs a node's
 * side wall.
 */
export function recentreExit(
  box: NodeBox,
  anchor: Pt,
  toward: Pt,
  fallback: Pt,
): Pt {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let dx = toward.x - cx;
  let dy = toward.y - cy;
  if (dx === 0 && dy === 0) {
    dx = fallback.x - cx;
    dy = fallback.y - cy;
  }
  if (dx === 0 && dy === 0) return anchor;
  // vertical-dominant travel -> top/bottom face, drop along the centre column.
  // Use a pure 45° split (|dy| > |dx|) instead of the old `>= |dx| * 0.5`, which
  // biased diagonal approaches (~30–45°) toward the vertical face and made edges
  // enter a node from its top/bottom even when the source sat clearly to its
  // side — then the horizontal leg had to run along that face (hugging). The
  // exact 45° boundary keeps a diagonal from being misclassified.
  if (Math.abs(dy) > Math.abs(dx)) {
    const onTop = dy < 0;
    // Slide the exit/entry point along the face toward the source projection
    // (clamped to the face) instead of the face centre: entering at the centre
    // forces a long leg that runs along the target's top/bottom edge.
    const sx = Math.max(box.x, Math.min(box.x + box.width, toward.x));
    return { x: sx, y: onTop ? box.y : box.y + box.height };
  }
  // horizontal-dominant travel -> left/right face, run along the centre row.
  const onLeft = dx < 0;
  const sy = Math.max(box.y, Math.min(box.y + box.height, toward.y));
  return { x: onLeft ? box.x : box.x + box.width, y: sy };
}

/**
 * True if `pts` runs through the source or target node body — either an interior
 * point inside the box, or a segment travelling through it. The edge may only
 * attach at the borders of its own endpoints, never run inside them.
 */
function pathHitsOwnBody(
  pts: Pt[],
  srcNode?: NodeBox | null,
  dstNode?: NodeBox | null,
): boolean {
  const inBody = (p: Pt, b: NodeBox): boolean =>
    p.x > b.x + 0.5 && p.x < b.x + b.width - 0.5 && p.y > b.y + 0.5 && p.y < b.y + b.height - 0.5;
  for (const b of [srcNode, dstNode]) {
    if (!b) continue;
    for (let i = 0; i < pts.length; i++) if (inBody(pts[i], b)) return true;
    const segInside = (a: Pt, c: Pt): boolean => {
      const out = (p: Pt) => !(p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height);
      if (!out(a) || !out(c)) return false;
      if (Math.abs(a.x - c.x) < 0.5) {
        const lo = Math.min(a.y, c.y), hi = Math.max(a.y, c.y);
        return b.x < a.x - 2 && b.x + b.width > a.x + 2 && b.y < hi - 2 && b.y + b.height > lo + 2;
      }
      if (Math.abs(a.y - c.y) < 0.5) {
        const lo = Math.min(a.x, c.x), hi = Math.max(a.x, c.x);
        return b.y < a.y - 2 && b.y + b.height > a.y + 2 && b.x < hi - 2 && b.x + b.width > lo + 2;
      }
      return false;
    };
    for (let i = 0; i < pts.length - 1; i++) if (segInside(pts[i], pts[i + 1])) return true;
  }
  return false;
}

/**
 * Build a full 90°-orthogonal path for one edge from `rawPts` (the layout's
 * centre-to-centre polyline).
 *
 * The endpoints are snapped to the shape borders and re-centred onto their face
 * midpoints for both the centre and local direction, giving up to four src/dst
 * anchor pairs. For each, an A* grid router finds a rectilinear path that stays
 * `clear` of every third-party box, and the best-quality result is kept (no
 * own-node pass-through, no third-party crossing, most clearance, fewest bends).
 * Falls back to orthogonalize when no clear route exists.
 */
export function routeEdge(opts: {
  points: Pt[];
  srcNode?: NodeBox;
  dstNode?: NodeBox;
  srcKind: string;
  dstKind: string;
  obstacles: Box[];
  bounds: { w: number; h: number };
  /** Already-routed sibling edges (orthogonal polylines), for crossing counting. */
  routedSegments?: { pts: Pt[] }[];
}): Pt[] {
  const { points: rawPts, srcNode, dstNode, srcKind, dstKind, obstacles, bounds, routedSegments } = opts;
  const trimmed = [...rawPts];
  if (trimmed.length < 2) return trimmed;
  if (srcNode) trimmed[0] = shapeEdgePoint(srcKind, srcNode, trimmed[1]);
  if (dstNode) trimmed[trimmed.length - 1] = shapeEdgePoint(dstKind, dstNode, trimmed[trimmed.length - 2]);
  const srcC = srcNode ? { x: srcNode.x + srcNode.width / 2, y: srcNode.y + srcNode.height / 2 } : trimmed[1];
  const dstC = dstNode ? { x: dstNode.x + dstNode.width / 2, y: dstNode.y + dstNode.height / 2 } : trimmed[trimmed.length - 2];

  // Endpoints stay EXACTLY on the node's 15°-quantised shape-border anchor
  // (the same 24 anchors the renderer exposes on hover), never a re-centred
  // continuous point. `shapeEdgePoint` already snaps a `toward` direction to the
  // nearest 15° anchor, so we just feed it several `toward` references (the
  // opposite centre, and the layout polyline's local direction) and let `quality`
  // pick the best pair. Hugging is then rejected by the clearance penalty in
  // `quality`, not by moving the endpoint off the anchor grid.
  const srcPt = (toward: Pt): Pt => (srcNode ? shapeEdgePoint(srcKind, srcNode, toward) : toward);
  const dstPt = (toward: Pt): Pt => (dstNode ? shapeEdgePoint(dstKind, dstNode, toward) : toward);

  const anchors: { src: Pt; dst: Pt }[] = [];
  if (srcNode && dstNode) {
    // Diagonal references (opposite centre, layout local direction) snap to the
    // nearest 15° anchor — good when the two nodes face each other diagonally.
    anchors.push({ src: srcPt(dstC), dst: dstPt(srcC) });
    anchors.push({ src: srcPt(trimmed[1]), dst: dstPt(trimmed[trimmed.length - 2]) });
    anchors.push({ src: srcPt(dstC), dst: dstPt(trimmed[trimmed.length - 2]) });
    anchors.push({ src: srcPt(trimmed[1]), dst: dstPt(srcC) });
    // Cardinal face references: snap to the face-centre anchor (0/90/180/270°).
    // These recover the case where the two boxes overlap along one axis (the
    // diagonal anchors then force a leg that runs along the target's edge), by
    // exiting/entering along the free axis. Points far outside the box make
    // `shapeEdgePoint` quantize cleanly to the cardinal anchor.
    const UP = (c: Pt): Pt => ({ x: c.x, y: c.y - 100000 });
    const DN = (c: Pt): Pt => ({ x: c.x, y: c.y + 100000 });
    const LF = (c: Pt): Pt => ({ x: c.x - 100000, y: c.y });
    const RT = (c: Pt): Pt => ({ x: c.x + 100000, y: c.y });
    anchors.push({ src: srcPt(UP(srcC)), dst: dstPt(DN(dstC)) });
    anchors.push({ src: srcPt(DN(srcC)), dst: dstPt(UP(dstC)) });
    anchors.push({ src: srcPt(LF(srcC)), dst: dstPt(RT(dstC)) });
    anchors.push({ src: srcPt(RT(srcC)), dst: dstPt(LF(dstC)) });
    // Mixed: one endpoint on a cardinal face centre, the other pointing toward
    // its counterpart. This is what actually removes the hug for an overlapped
    // axis: e.g. the source leaves its top-centre anchor while the target is
    // entered at the 15° anchor nearest the source (bottom, but slid toward the
    // source side) instead of its bottom-centre — so the final leg doesn't run
    // along the target's bottom edge toward its midpoint.
    anchors.push({ src: srcPt(UP(srcC)), dst: dstPt(srcC) });
    anchors.push({ src: srcPt(DN(srcC)), dst: dstPt(srcC) });
    anchors.push({ src: srcPt(LF(srcC)), dst: dstPt(srcC) });
    anchors.push({ src: srcPt(RT(srcC)), dst: dstPt(srcC) });
    anchors.push({ src: srcPt(dstC), dst: dstPt(UP(dstC)) });
    anchors.push({ src: srcPt(dstC), dst: dstPt(DN(dstC)) });
    anchors.push({ src: srcPt(dstC), dst: dstPt(LF(dstC)) });
    anchors.push({ src: srcPt(dstC), dst: dstPt(RT(dstC)) });
  } else {
    anchors.push({ src: trimmed[0], dst: trimmed[trimmed.length - 1] });
  }

  const quality = (p: Pt[]): number => {
    const ownHit = pathHitsOwnBody(p, srcNode, dstNode) ? -1e6 : 0;
    const crossHit = pathCrosses(p, obstacles) ? -5e5 : 0;
    const bends = (p.length - 2) * 20;
    const clearBoxes: Box[] = [...obstacles];
    if (srcNode) clearBoxes.push({ x: srcNode.x, y: srcNode.y, w: srcNode.width, h: srcNode.height });
    if (dstNode) clearBoxes.push({ x: dstNode.x, y: dstNode.y, w: dstNode.width, h: dstNode.height });
    const clear = pathClearanceInterior(p, clearBoxes);
    // 贴边硬罚：内部走线距任一墙 <10px 视为"贴边"，重罚，确保贴墙解不被选中
    // （clear 是软评分，量级会被 -bends 抵消；这里是结构性下限）。
    const hugPenalty = clear < 10 ? -1e5 : 0;
    // 贴边长度罚：两条候选都贴边(clearance=0)时，贴得越长越差——让质量能
    // 在"进入目标侧边(贴 25px)"与"进入目标远端中点(贴 80px)"之间分出高下。
    const hugLen = pathHugLength(p, clearBoxes);
    // 穿越已布边：真实计数（不再用 boolean flag），每次交叉 -1000。
    const crossRouted = routedSegments && routedSegments.length
      ? -countCrossingsWithRouted(p, routedSegments) * 1000
      : 0;
    return ownHit + crossHit + hugPenalty - hugLen * 20 + crossRouted + Math.min(clear, 1000) - bends;
  };

  let best: Pt[] | null = null;
  let bestScore = -Infinity;
  for (const a of anchors) {
    const routed = routeAStar(a.src, a.dst, obstacles, bounds, srcNode, dstNode);
    if (!routed) continue;
    if (pathHitsOwnBody(routed, srcNode, dstNode)) continue;
    const s = quality(routed);
    if (s > bestScore) { bestScore = s; best = routed; }
  }
  if (best) return best;

  // No A* route found — fall back to the orthogonalize heuristic.
  return orthogonalize(trimmed, obstacles);
}

// ---------------------------------------------------------------------------
// Shape-border anchoring
// ---------------------------------------------------------------------------

/**
 * Anchor point where a ray from the box centre toward `p` attaches to the node's
 * REAL shape border. Shape fidelity per kind (diamond, pill/ellipse, cylinder,
 * folded note, rounded rect) so arrows attach to the drawn outline, not the
 * bounding rect. `rxOverride` overrides the corner radius (used for groups).
 */
export function shapeEdgePoint(
  kind: string,
  box: NodeBox,
  p: Pt,
  rxOverride?: number,
): Pt {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  // quantize the approach direction to the nearest 15° anchor
  const angle = Math.atan2(dy, dx);
  const q = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
  const ux = Math.cos(q);
  const uy = Math.sin(q);
  if (kind === 'decision') {
    const t = 1 / (Math.abs(ux) / (box.width / 2) + Math.abs(uy) / (box.height / 2));
    return { x: cx + ux * t, y: cy + uy * t };
  }
  if (kind === 'start' || kind === 'end') {
    const a = box.width / 2;
    const b = box.height / 2;
    const t = 1 / Math.sqrt((ux / a) ** 2 + (uy / b) ** 2);
    return { x: cx + ux * t, y: cy + uy * t };
  }
  if (kind === 'entity') {
    const topArcY = box.y + 10;
    const botArcY = box.y + box.height - 10;
    const tSide = Math.min(
      ux !== 0 ? box.width / 2 / Math.abs(ux) : Infinity,
      uy !== 0 ? box.height / 2 / Math.abs(uy) : Infinity,
    );
    const ySide = cy + uy * tSide;
    if (ySide >= topArcY && ySide <= botArcY) {
      return { x: cx + ux * tSide, y: cy + uy * tSide };
    }
    const a = box.width / 2;
    const r = 10;
    const ccy = ySide < topArcY ? topArcY : botArcY;
    const dy0 = cy - ccy;
    const A = (ux / a) ** 2 + (uy / r) ** 2;
    const B = (2 * dy0 * uy) / (r * r);
    const C = (dy0 / r) ** 2 - 1;
    const disc = B * B - 4 * A * C;
    if (disc >= 0) {
      const t = (-B + Math.sqrt(disc)) / (2 * A);
      return { x: cx + ux * t, y: cy + uy * t };
    }
    return { x: cx + ux * tSide, y: cy + uy * tSide };
  }
  if (kind === 'note') {
    const pts = [
      { x: box.x, y: box.y },
      { x: box.x + box.width - 12, y: box.y },
      { x: box.x + box.width, y: box.y + 12 },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ];
    let bestT = Infinity;
    let best: Pt | null = null;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const vx = p2.x - p1.x;
      const vy = p2.y - p1.y;
      const denom = ux * vy - uy * vx;
      if (Math.abs(denom) < 1e-9) continue;
      const qx = p1.x - cx;
      const qy = p1.y - cy;
      const t = (qx * vy - qy * vx) / denom;
      const s = (qx * uy - qy * ux) / denom;
      if (t > 0 && s >= 0 && s <= 1 && t < bestT) {
        bestT = t;
        best = { x: cx + ux * t, y: cy + uy * t };
      }
    }
    if (best) return best;
    return { x: cx + ux * (box.width / 2), y: cy };
  }
  const rx =
    rxOverride ??
    (kind === 'start' || kind === 'end' ? Math.min(box.width, box.height) / 2 : 6);
  return roundedRectPoint(box, ux, uy, rx);
}

/**
 * Ray (from the box center, unit direction u) intersect a rounded rect of
 * corner radius rx. Straight sides unless the ray passes through a corner
 * region, where the border is the quarter-arc around the corner center.
 */
export function roundedRectPoint(
  box: NodeBox,
  ux: number,
  uy: number,
  rx: number,
): Pt {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const a = box.width / 2;
  const b = box.height / 2;
  const tRect = Math.min(
    ux !== 0 ? a / Math.abs(ux) : Infinity,
    uy !== 0 ? b / Math.abs(uy) : Infinity,
  );
  const ix = cx + ux * tRect;
  const iy = cy + uy * tRect;
  // Straight side only when the ray stays clear of BOTH corner strips. The old
  // `||` treated a diagonal ray as hitting a straight side whenever one
  // coordinate was near the centre, so a 150° ray (toward the bottom-left
  // corner) was returned on the bottom EDGE instead of the corner arc — an
  // anchor that is not one of the 24 quantised points. `&&` keeps diagonals on
  // the corner arc, so every anchor is genuinely a 15°-quantised border point.
  if (Math.abs(ix - cx) <= a - rx && Math.abs(iy - cy) <= b - rx) {
    return { x: ix, y: iy };
  }
  const ccx = cx + Math.sign(ux) * (a - rx);
  const ccy = cy + Math.sign(uy) * (b - rx);
  const dxc = ccx - cx;
  const dyc = ccy - cy;
  const ud = ux * dxc + uy * dyc;
  const dd = dxc * dxc + dyc * dyc;
  const disc = ud * ud - dd + rx * rx;
  if (disc >= 0) {
    const t = ud + Math.sqrt(disc);
    return { x: cx + ux * t, y: cy + uy * t };
  }
  return { x: ix, y: iy };
}

// ---------------------------------------------------------------------------
// Orthogonalization + obstacle-avoiding routing
// ---------------------------------------------------------------------------

/**
 * Force a polyline to 90°-orthogonal segments, re-channelling diagonal runs onto
 * a clear row. The layout's centre-to-centre elbows are converted to genuine
 * right-angle corners; a horizontal run that would cut through a node is pushed
 * to a clear channel.
 */
export function orthogonalize(
  pts: Pt[],
  nodeBoxes: Box[] = [],
): Pt[] {
  if (pts.length < 2) return pts;
  const crosses = (x1: number, x2: number, y: number): boolean => {
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    return nodeBoxes.some((b) => {
      const inX = b.x < hi - 2 && b.x + b.w > lo + 2;
      const inY = b.y < y - 2 && b.y + b.h > y + 2;
      return inX && inY;
    });
  };
  const clearY = (a: Pt, b: Pt): number => {
    const want = b.y;
    if (!crosses(a.x, b.x, want)) return want;
    const loY = Math.min(a.y, want);
    const hiY = Math.max(a.y, want);
    for (let step = 14; step <= 84; step += 14) {
      for (const cand of [want - step, want + step]) {
        if (cand >= loY - 60 && cand <= hiY + 60 && !crosses(a.x, b.x, cand)) return cand;
      }
    }
    return want;
  };

  const out: Pt[] = [{ ...pts[0] }];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = out[out.length - 1];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) {
      out.push({ ...b });
      continue;
    }
    const wy = clearY(a, b);
    out.push({ x: a.x, y: wy });
    if (Math.abs(wy - b.y) > 0.5) out.push({ x: b.x, y: wy });
    out.push({ ...b });
  }
  return out;
}

/** Does the axis-aligned segment a→b cross any obstacle box? */
export function segmentCrosses(a: Pt, b: Pt, boxes: Box[]): boolean {
  if (Math.abs(a.x - b.x) < 0.5) {
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    return boxes.some((bb) => bb.x < a.x - 2 && bb.x + bb.w > a.x + 2 && bb.y < hi - 2 && bb.y + bb.h > lo + 2);
  }
  if (Math.abs(a.y - b.y) < 0.5) {
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    return boxes.some((bb) => bb.y < a.y - 2 && bb.y + bb.h > a.y + 2 && bb.x < hi - 2 && bb.x + bb.w > lo + 2);
  }
  return true;
}

/** Does any consecutive pair in `pts` cross an obstacle box? */
export function pathCrosses(pts: Pt[], boxes: Box[]): boolean {
  for (let i = 0; i < pts.length - 1; i++) if (segmentCrosses(pts[i], pts[i + 1], boxes)) return true;
  return false;
}

/** True if the two axis-aligned segments a→b and c→d cross transversally. */
function segmentCrossesSegment(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const aVert = Math.abs(a.x - b.x) < 0.5;
  const cVert = Math.abs(c.x - d.x) < 0.5;
  // Both vertical or both horizontal → parallel, no transversal crossing.
  if (aVert === cVert) return false;
  // Segment a→b is horizontal, c→d is vertical (or the transpose).
  const [h1, h2] = aVert ? [c, d] : [a, b]; // horizontal segment
  const [v1, v2] = aVert ? [a, b] : [c, d]; // vertical segment
  const hy = h1.y;
  const vx = v1.x;
  const hLo = Math.min(h1.x, h2.x), hHi = Math.max(h1.x, h2.x);
  const vLo = Math.min(v1.y, v2.y), vHi = Math.max(v1.y, v2.y);
  // Strict interior crossing (skip exact endpoint touch to avoid double counts).
  return vx > hLo + 0.5 && vx < hHi - 0.5 && hy > vLo + 0.5 && hy < vHi - 0.5;
}

/**
 * Count how many times `pts` (a routed orthogonal polyline) crosses the already
 * routed edges in `routed` (each an orthogonal polyline). Used as a structural
 * cost in `quality` so an edge that threads through many existing edges is
 * penalised, rather than treating "cross once" and "cross five times" the same.
 */
export function countCrossingsWithRouted(pts: Pt[], routed: { pts: Pt[] }[]): number {
  let count = 0;
  for (const r of routed) {
    const rp = r.pts;
    if (rp.length < 2) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      for (let j = 0; j < rp.length - 1; j++) {
        if (segmentCrossesSegment(pts[i], pts[i + 1], rp[j], rp[j + 1])) count++;
      }
    }
  }
  return count;
}

/**
 * Smallest clearance (px) of the INTERIOR legs of `pts` from a box WALL. The
 * first and last legs attach to the source/target shape borders, so they're
 * skipped. A leg flush against a wall scores ~0; a leg far from walls scores high.
 */
export function pathClearanceInterior(pts: Pt[], boxes: Box[]): number {
  let min = Infinity;
  // Check every segment EXCEPT the source-leaving first one (i=0). Including the
  // last segment matters: a 3-point path has no "pure interior" segment, so a
  // final leg that RUNS ALONG a target box's top/left edge (hugging) would
  // otherwise be invisible to the clearance metric. Legs that truly ENTER a box
  // vertically (drop onto the top-center) or horizontally (run to the left-center)
  // are naturally excluded by the `bb.y < hi-2` / `bb.x < hi-2` tests, so legit
  // endpoint anchoring is not penalised.
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (Math.abs(a.x - b.x) < 0.5) {
      const lo = Math.min(a.y, b.y);
      const hi = Math.max(a.y, b.y);
      for (const bb of boxes) {
        if (bb.y < hi - 2 && bb.y + bb.h > lo + 2) {
          min = Math.min(min, Math.abs(a.x - bb.x), Math.abs(a.x - (bb.x + bb.w)));
        }
      }
    } else if (Math.abs(a.y - b.y) < 0.5) {
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      for (const bb of boxes) {
        if (bb.x < hi - 2 && bb.x + bb.w > lo + 2) {
          min = Math.min(min, Math.abs(a.y - bb.y), Math.abs(a.y - (bb.y + bb.h)));
        }
      }
    } else {
      return 0;
    }
  }
  return min;
}

/**
 * Total length (px) over which `pts` runs PARALLEL and CLOSE (< `hugGap`) to a
 * box wall. Unlike `pathClearanceInterior` (which returns the closest distance,
 * so a 25px and an 80px hug both score 0), this measures how far a leg actually
 * slides along a wall — letting `quality` prefer the anchor whose approach leg
 * hugs the least (e.g. enter near the source's own side instead of the far
 * centre).
 */
export function pathHugLength(pts: Pt[], boxes: Box[], hugGap = 10): number {
  let len = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (Math.abs(a.x - b.x) < 0.5) {
      const lo = Math.min(a.y, b.y);
      const hi = Math.max(a.y, b.y);
      for (const bb of boxes) {
        if (bb.y < hi - 2 && bb.y + bb.h > lo + 2) {
          const d = Math.min(Math.abs(a.x - bb.x), Math.abs(a.x - (bb.x + bb.w)));
          if (d < hugGap) len += Math.min(hi, bb.y + bb.h) - Math.max(lo, bb.y);
        }
      }
    } else if (Math.abs(a.y - b.y) < 0.5) {
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      for (const bb of boxes) {
        if (bb.x < hi - 2 && bb.x + bb.w > lo + 2) {
          const d = Math.min(Math.abs(a.y - bb.y), Math.abs(a.y - (bb.y + bb.h)));
          if (d < hugGap) len += Math.min(hi, bb.x + bb.w) - Math.max(lo, bb.x);
        }
      }
    }
  }
  return len;
}

/**
 * Re-route one edge from `src` to `dst` (border anchors) as a rectilinear
 * polyline that avoids every obstacle box, picking the clear candidate with the
 * most clearance from box walls. `fallback` is returned when no candidate is
 * fully clear.
 */
export function routeRectilinear(
  src: Pt,
  dst: Pt,
  boxes: Box[],
  fallback: Pt[],
  scoreBoxes: Box[] = boxes,
): Pt[] {
  const channels: number[] = [];
  const midX = Math.round((src.x + dst.x) / 2);
  const midY = Math.round((src.y + dst.y) / 2);
  for (const c of [midX, src.x, dst.x]) channels.push(c);
  for (let k = 20; k <= 120; k += 20) channels.push(midX - k, midX + k, src.x - k, src.x + k, dst.x - k, dst.x + k);
  for (const b of boxes) {
    channels.push(Math.round(b.x - 12), Math.round(b.x + b.w + 12));
  }
  const rows: number[] = [];
  for (const c of [midY, src.y, dst.y]) rows.push(c);
  for (let k = 20; k <= 120; k += 20) rows.push(midY - k, midY + k, src.y - k, src.y + k, dst.y - k, dst.y + k);
  for (const b of boxes) {
    rows.push(Math.round(b.y - 12), Math.round(b.y + b.h + 12));
  }

  const candidates: Pt[][] = [];
  candidates.push([src, dst]);
  candidates.push([src, { x: dst.x, y: src.y }, dst]);
  candidates.push([src, { x: src.x, y: dst.y }, dst]);
  for (const cx of channels) candidates.push([src, { x: cx, y: src.y }, { x: cx, y: dst.y }, dst]);
  for (const cy of rows) candidates.push([src, { x: src.x, y: cy }, { x: dst.x, y: cy }, dst]);

  let best = fallback;
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (pathCrosses(c, boxes)) continue;
    const score = Math.min(pathClearanceInterior(c, scoreBoxes), 1000) + (c.length === 2 ? 50 : c.length === 3 ? 20 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * Grid-search (A*) rectilinear router. Builds a uniform grid over the layout and
 * finds the shortest 90°-orthogonal path from `src` to `dst` that never enters a
 * blocked cell. A cell is blocked when it lies inside an obstacle box INFLATED by
 * `clear` px — so the route keeps `clear`px clearance from every wall (no "贴边").
 * Cells inside the edge's OWN source/target node are not blocked. Returns null
 * when no clear route exists.
 */
function routeAStar(
  src: Pt,
  dst: Pt,
  obstacles: Box[],
  bounds: { w: number; h: number },
  srcNode?: NodeBox | null,
  dstNode?: NodeBox | null,
  clear = 14,
): Pt[] | null {
  const cell = Math.max(7, Math.floor(clear / 2));
  const gx = Math.floor(bounds.w / cell) + 1;
  const gy = Math.floor(bounds.h / cell) + 1;
  const col = (x: number) => Math.max(0, Math.min(gx - 1, Math.floor(x / cell)));
  const row = (y: number) => Math.max(0, Math.min(gy - 1, Math.floor(y / cell)));

  const blocked = new Uint8Array(gx * gy);
  const ownBox = (b: Box): boolean =>
    !!((srcNode && b.x === srcNode.x && b.y === srcNode.y && b.w === srcNode.width && b.h === srcNode.height) ||
       (dstNode && b.x === dstNode.x && b.y === dstNode.y && b.w === dstNode.width && b.h === dstNode.height));
  for (const b of obstacles) {
    if (ownBox(b)) continue;
    const ix0 = Math.max(0, col(b.x - clear));
    const iy0 = Math.max(0, row(b.y - clear));
    const ix1 = Math.min(gx - 1, col(b.x + b.w + clear));
    const iy1 = Math.min(gy - 1, row(b.y + b.h + clear));
    for (let iy = iy0; iy <= iy1; iy++) {
      for (let ix = ix0; ix <= ix1; ix++) blocked[iy * gx + ix] = 1;
    }
  }

  const sxi = col(dst.x), syi = row(dst.y);
  const srcI = row(src.y) * gx + col(src.x);
  const dstI = syi * gx + sxi;
  const idx = (x: number, y: number) => y * gx + x;
  const unblockCell = (x: number, y: number) => { blocked[idx(x, y)] = 0; };
  unblockCell(col(src.x), row(src.y));
  unblockCell(sxi, syi);

  const open = new MinHeap();
  const gScore = new Float64Array(gx * gy).fill(Infinity);
  const cameFrom = new Int32Array(gx * gy).fill(-1);
  // Direction into each cell (for bend penalty): 0=start, 1=right,2=left,3=down,4=up.
  const dirIn = new Int8Array(gx * gy);
  const hn = (x: number, y: number) => Math.abs(x - sxi) + Math.abs(y - syi);
  const si = col(src.x), sj = row(src.y);
  gScore[si + sj * gx] = 0;
  open.push(hn(si, sj), si + sj * gx);
  const ddx = [1, -1, 0, 0], ddy = [0, 0, 1, -1];
  const bendW = 30; // per-turn cost inside A* (prefers straight runs; collapseGridPath removes the stair-step elbows)
  let found = false;
  while (!open.isEmpty()) {
    const cur = open.pop();
    if (cur === dstI) { found = true; break; }
    const cx = cur % gx, cy = (cur - cx) / gx;
    const curDir = dirIn[cur];
    const curH = hn(cx, cy);
    for (let k = 0; k < 4; k++) {
      const nx = cx + ddx[k], ny = cy + ddy[k];
      if (nx < 0 || ny < 0 || nx >= gx || ny >= gy) continue;
      const ni = idx(nx, ny);
      if (blocked[ni]) continue;
      const moveDir = k + 1;
      const bend = curDir !== 0 && curDir !== moveDir ? bendW : 0;
      const newH = hn(nx, ny);
      // 方向惩罚：往目标反方向（绕远）每格加小罚，偏向先行接近目标。
      const away = newH > curH ? (newH - curH) * 14 : 0;
      const ng = gScore[cur] + 1 + bend + away;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        cameFrom[ni] = cur;
        dirIn[ni] = moveDir;
        open.push(ng + newH, ni);
      }
    }
  }
  if (!found) return null;

  const cellPath: number[] = [];
  let cur = dstI;
  while (cur !== -1) { cellPath.push(cur); if (cur === srcI) break; cur = cameFrom[cur]; }
  if (cellPath[cellPath.length - 1] !== srcI) return null;
  cellPath.reverse();

  const pts = cellPath.map((ci) => {
    const ci2 = ci % gx, cy2 = (ci - ci2) / gx;
    return { x: ci2 * cell, y: cy2 * cell };
  });
  pts[0] = src;
  pts[pts.length - 1] = dst;
  return collapseGridPath(pts, obstacles, bounds, clear, ownBox);
}

/**
 * Simplify a dense axis-aligned grid path: each 3-point "staircase elbow" between
 * a and c is replaced by a single L-corner that is clear, collapsing many tiny
 * steps into one turn. Repeat, then strip collinear points.
 */
function collapseGridPath(
  pts: Pt[],
  boxes: Box[],
  bounds: { w: number; h: number },
  clear: number,
  ownBox: (b: Box) => boolean,
): Pt[] {
  if (pts.length <= 2) return pts;

  const segClear = (a: Pt, b: Pt): boolean => {
    const m = clear;
    for (const box of boxes) {
      if (ownBox(box)) continue;
      if (Math.abs(a.x - b.x) < 0.5) {
        const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
        if (a.x > box.x - m && a.x < box.x + box.w + m && lo < box.y + box.h + m && hi > box.y - m) return false;
      } else if (Math.abs(a.y - b.y) < 0.5) {
        const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
        if (a.y > box.y - m && a.y < box.y + box.h + m && lo < box.x + box.w + m && hi > box.x - m) return false;
      } else {
        return false;
      }
    }
    return true;
  };

  let path = pts;
  for (let pass = 0; pass < 8 && path.length > 2; pass++) {
    let changed = false;
    const out: Pt[] = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const a = out[out.length - 1];
      const p = path[i];
      const c = path[i + 1];
      const corner1 = { x: a.x, y: c.y };
      const corner2 = { x: c.x, y: a.y };
      let replaced = false;
      for (const corner of [corner1, corner2]) {
        if (segClear(a, corner) && segClear(corner, c)) {
          out.push(corner);
          changed = true;
          replaced = true;
          break;
        }
      }
      if (!replaced) out.push(p);
    }
    out.push(path[path.length - 1]);
    path = collinearCollapse(out);
    if (!changed) break;
  }
  return path;
}

/**
 * Collapse a polyline to just its corner points: drop any point that lies on the
 * straight line between its two neighbours (collinear / redundant / duplicate).
 */
function collinearCollapse(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = out[out.length - 1];
    const c = pts[i];
    if (a && Math.abs(a.x - c.x) < 0.5 && Math.abs(a.y - c.y) < 0.5) continue;
    if (out.length >= 2) {
      const p = out[out.length - 2];
      const collinear =
        (Math.abs(p.x - a.x) < 0.5 && Math.abs(a.x - c.x) < 0.5) ||
        (Math.abs(p.y - a.y) < 0.5 && Math.abs(a.y - c.y) < 0.5);
      if (collinear) { out[out.length - 1] = c; continue; }
    }
    out.push(c);
  }
  return out;
}

/** Simple binary min-heap keyed by numeric priority for the A* open set. */
class MinHeap {
  private p: number[] = [];
  private v: number[] = [];
  isEmpty(): boolean { return this.p.length === 0; }
  push(prio: number, val: number): void {
    let i = this.p.length;
    this.p.push(prio); this.v.push(val);
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.p[par] <= this.p[i]) break;
      this.swap(i, par); i = par;
    }
  }
  pop(): number {
    const top = this.v[0];
    const lp = this.p.pop()!; const lv = this.v.pop()!;
    if (this.p.length) {
      this.p[0] = lp; this.v[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let mn = i;
        if (l < this.p.length && this.p[l] < this.p[mn]) mn = l;
        if (r < this.p.length && this.p[r] < this.p[mn]) mn = r;
        if (mn === i) break;
        this.swap(i, mn); i = mn;
      }
    }
    return top;
  }
  private swap(a: number, b: number): void {
    [this.p[a], this.p[b]] = [this.p[b], this.p[a]];
    [this.v[a], this.v[b]] = [this.v[b], this.v[a]];
  }
}
