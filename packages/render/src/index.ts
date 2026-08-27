/**
 * LGDL SVG renderer.
 *
 * Takes a LayoutResult + LgdlDocument and produces clean SVG markup.
 * Shapes are mapped from node kinds; a theme can be swapped later.
 */
import type { LgdlDocument, LgdlGroup, LgdlMember, LgdlNode } from '@lgdl/core';
import { VIS_SYMBOL, deriveGroups } from '@lgdl/core';
import type { LayoutResult } from '@lgdl/layout';
import { routeEdge, shapeEdgePoint, routeRectilinear } from '@lgdl/router';

const FONT_FAMILY = "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";

interface NodeShape {
  /** Builds the shape body. The fill/stroke go on the shape ELEMENT (never
   * on the parent <g>), so resvg doesn't inherit fill into the inner <text>
   * and mis-measure mixed Latin/CJK labels (the "Redis缓存" overlap bug). */
  body(x: number, y: number, w: number, h: number, fill: string, stroke: string): string;
  /** Anchor point for edges on the shape boundary (top). */
  anchor(x: number, y: number, w: number, h: number, dir: 'top' | 'bottom' | 'left' | 'right'): { x: number; y: number };
}

function rect(x: number, y: number, w: number, h: number, rx = 4, fill?: string, stroke?: string): string {
  const f = fill ? ` fill="${fill}"` : '';
  const s = stroke ? ` stroke="${stroke}" stroke-width="1.5"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}"${f}${s}/>`;
}

function text(
  x: number,
  y: number,
  content: string,
  fontSize = 14,
  fill = '#1f2937',
  anchor: 'middle' | 'start' | 'end' = 'middle',
): string {
  const lines = String(content).split('\n');
  const lineHeight = fontSize + 4;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${startY + i * lineHeight}" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(line)}</text>`,
    )
    .join('');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SHAPES: Record<string, NodeShape> = {
  // Start / end: rounded rect
  start: {
    body(x, y, w, h, fill, stroke) {
      return `${rect(x, y, w, h, w / 2, fill, stroke)}`; // pill
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  end: {
    body(x, y, w, h, fill, stroke) {
      return `${rect(x, y, w, h, w / 2, fill, stroke)}`;
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  // Process: plain rect
  process: {
    body(x, y, w, h, fill, stroke) {
      return rect(x, y, w, h, 6, fill, stroke);
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  // Decision: diamond
  decision: {
    body(x, y, w, h, fill, stroke) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `<polygon points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    },
    anchor(x, y, w, h, dir) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      switch (dir) {
        case 'top':
          return { x: cx, y };
        case 'bottom':
          return { x: cx, y: y + h };
        case 'left':
          return { x, y: cy };
        case 'right':
          return { x: x + w, y: cy };
      }
    },
  },
  // Entity: cylinder — straight sides + elliptical top/bottom arcs.
  // Top arc must sweep counter-clockwise (0) so it bulges UP to y (closing
  // the top); sweep=1 drew it downwards and the top edge vanished.
  entity: {
    body(x, y, w, h, fill, stroke) {
      const cy = y + h;
      return `<path d="M ${x},${y + 10} L ${x},${cy - 10} A ${w / 2},10 0 0 0 ${x + w},${cy - 10} L ${x + w},${y + 10} A ${w / 2},10 0 0 0 ${x},${y + 10} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  // Note: folded corner
  note: {
    body(x, y, w, h, fill, stroke) {
      return `<path d="M ${x},${y} L ${x + w - 12},${y} L ${x + w},${y + 12} L ${x + w},${y + h} L ${x},${y + h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
};

function edgeAnchor(
  x: number,
  y: number,
  w: number,
  h: number,
  dir: 'top' | 'bottom' | 'left' | 'right',
  _pad: number,
): { x: number; y: number } {
  switch (dir) {
    case 'top':
      return { x: x + w / 2, y };
    case 'bottom':
      return { x: x + w / 2, y: y + h };
    case 'left':
      return { x, y: y + h / 2 };
    case 'right':
      return { x: x + w, y: y + h / 2 };
  }
}

const FILL_BY_KIND: Record<string, string> = {
  start: '#dbeafe',
  end: '#dcfce7',
  process: '#ffffff',
  decision: '#fef3c7',
  entity: '#fce7f3',
  note: '#f3f4f6',
};

const STROKE_BY_KIND: Record<string, string> = {
  start: '#3b82f6',
  end: '#16a34a',
  process: '#6b7280',
  decision: '#f59e0b',
  entity: '#ec4899',
  note: '#9ca3af',
};

/** Pastel fills for group/lane backgrounds, picked by nesting depth (or lane
 * index) so different layers are visually distinguishable. */
const GROUP_FILLS = ['#eff6ff', '#ecfdf5', '#fffbeb', '#faf5ff', '#f8fafc'];

/** Mindmap branch palette (stroke + matching pastel fill per top branch). */
const MIND_COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899'];
const MIND_FILLS = ['#eff6ff', '#ecfdf5', '#fffbeb', '#faf5ff', '#fce7f3'];

/**
 * For mindmaps: depth of every node (BFS from the root, the node with no
 * incoming edges) and which top-level branch it belongs to (the root's
 * direct children are branch heads).
 */
function computeMindmapInfo(
  doc: LgdlDocument,
): Map<string, { branch: string; branchIndex: number; depth: number }> {
  // group boxes are not mindmap nodes — exclude them from the tree
  const nodes = doc.nodes.filter((n) => n.kind !== 'group');
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of doc.edges) {
    children.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }
  const rootId = nodes.find((n) => (inDegree.get(n.id) ?? 0) === 0)?.id;
  if (!rootId) return new Map();

  const info = new Map<string, { branch: string; branchIndex: number; depth: number }>();
  info.set(rootId, { branch: 'root', branchIndex: -1, depth: 0 });
  let branchIndex = 0;
  const queue: { id: string; branch: string; branchIndex: number; depth: number }[] = [
    { id: rootId, branch: 'root', branchIndex: -1, depth: 0 },
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const c of children.get(cur.id) ?? []) {
      const isBranchHead = cur.branch === 'root';
      const branch = isBranchHead ? c : cur.branch;
      const idx = isBranchHead ? branchIndex++ : cur.branchIndex;
      info.set(c, { branch, branchIndex: idx, depth: cur.depth + 1 });
      queue.push({ id: c, branch, branchIndex: idx, depth: cur.depth + 1 });
    }
  }
  return info;
}

/**
 * Entry state of a state machine: the node with no incoming edges.
 * Returns null unless there is exactly one entry (a single-entry machine).
 */
function findInitialState(doc: LgdlDocument): string | null {
  // group boxes are not states — exclude them from the entry-state search
  const nodes = doc.nodes.filter((n) => n.kind !== 'group');
  const inDegree = new Map<string, number>();
  for (const n of nodes) inDegree.set(n.id, 0);
  for (const e of doc.edges) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  const entries = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  return entries.length === 1 ? entries[0].id : null;
}

// ---------------------------------------------------------------------------
// Obstacle-aware label placement (Bug1: 标签重叠)
// ---------------------------------------------------------------------------
// A label box is centered on (x, y); `w` is its rendered width, `h` a fixed
// line height. Labels must not overlap each other NOR sit on top of node
// boxes (a label spanning a node is unreadable). `placeLabelBox` picks the
// longest segment of the edge and nudges the label vertically until it fits
// in clear space.

interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function labelBoxAt(x: number, y: number, label: string): LabelBox {
  // 12px edge-label font; CJK ~12px, Latin ~0.62x (mirrors textWidth)
  let w = 0;
  for (const ch of label) w += (ch.codePointAt(0) ?? 0) > 0x2e80 ? 12 : 12 * 0.62;
  return { x: x - w / 2, y: y - 8, w, h: 16 };
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Midpoint of the longest segment of a polyline (preferred label spot). */
function longestSegmentMid(pts: { x: number; y: number }[]): { x: number; y: number } {
  let best = { x: (pts[0].x + pts[pts.length - 1].x) / 2, y: (pts[0].y + pts[pts.length - 1].y) / 2 };
  let bestLen = -1;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > bestLen) {
      bestLen = len;
      best = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  }
  return best;
}

/**
 * Place an edge label, avoiding node boxes (obstacles) and already-placed
 * labels. Rather than only nudging the longest-segment midpoint, it samples
 * a candidate position on EVERY segment of the polyline and picks the first
 * (nearest the ideal) that sits in clear space. This spreads the labels of
 * dense bundles (e.g. many services -> one data node) across different
 * segments instead of piling them all on the shared descent channel.
 * Never drops the label: if no spot is clear, falls back to the ideal.
 */
function placeLabelBox(
  pts: { x: number; y: number }[],
  label: string,
  obstacles: LabelBox[],
  placed: LabelBox[],
): { x: number; y: number } {
  const isFree = (p: { x: number; y: number }) => {
    const box = labelBoxAt(p.x, p.y, label);
    if (obstacles.some((o) => boxesOverlap(box, o))) return false;
    if (placed.some((o) => boxesOverlap(box, o))) return false;
    return true;
  };

  const ideal = longestSegmentMid(pts);
  const idealY = ideal.y - 4;
  // Candidates: midpoint of every segment (each with vertical nudges), ranked
  // by distance from the ideal position so the natural spot wins when clear.
  type Cand = { x: number; y: number; rank: number };
  const candidates: Cand[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    // skip "tiny" segments (arrowhead stubs) — try 12px+ only
    if (Math.hypot(b.x - a.x, b.y - a.y) < 12) continue;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 - 4;
    const dist = Math.hypot(mx - ideal.x, my - ideal.y);
    // segments are ranked: the longest segment mid ranks best; then by how
    // horizontal the segment is (labels read better on horizontal runs) and
    // finally by far-ness from ideal (spread over shorter segments too).
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const horiz = Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? 1 : 0;
    const base = dist + (1 - horiz) * 40 - len / 100;
    for (const dy of [0, -14, 14, -28, 28, -42, 42]) {
      candidates.push({ x: mx, y: my + dy, rank: base + Math.abs(dy) * 0.2 });
    }
  }
  candidates.sort((p, q) => p.rank - q.rank);
  for (const c of candidates) {
    if (isFree({ x: c.x, y: c.y })) {
      placed.push(labelBoxAt(c.x, c.y, label));
      return { x: c.x, y: c.y };
    }
  }
  // fallback: strongest vertical nudge around the ideal
  for (const dy of [0, -14, 14, -28, 28, -42, 42, -56, 56, -70, 70, -84, 84]) {
    const p = { x: ideal.x, y: idealY + dy };
    if (isFree(p)) {
      placed.push(labelBoxAt(p.x, p.y, label));
      return p;
    }
  }
  placed.push(labelBoxAt(ideal.x, idealY, label));
  return { x: ideal.x, y: idealY };
}

/** Render an LGDL document + layout into an SVG string. */
export function renderSvg(doc: LgdlDocument, layout: LayoutResult): string {
  switch (doc.type) {
    case 'sequence':
      return renderSequence(doc, layout);
    case 'gantt':
      return renderGantt(doc, layout);
    case 'uml-class':
      return renderGeneral(doc, layout, 'uml-class');
    case 'datastream':
      return renderGeneral(doc, layout, 'datastream');
    case 'er':
      return renderGeneral(doc, layout, 'er');
    case 'mindmap':
      return renderGeneral(doc, layout, 'mindmap');
    case 'state':
      return renderGeneral(doc, layout, 'state');
    case 'flowchart':
    case 'arch':
    default:
      return renderGeneral(doc, layout, 'default');
  }
}

/** Sequence diagram renderer: participant lifelines + message arrows. */
function renderSequence(doc: LgdlDocument, layout: LayoutResult): string {
  const parts: string[] = [];
  parts.push(
    `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/></marker></defs>`,
  );
  parts.push(`<rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>`);

  const bodyTop = layout.nodes[0] ? layout.nodes[0].y + layout.nodes[0].height + 20 : 60;
  const bodyBottom = layout.height - 20;

  // lifelines (dashed vertical)
  for (const node of layout.nodes) {
    const cx = node.x + node.width / 2;
    parts.push(
      `<line class="lgdl-lifeline" x1="${cx}" y1="${bodyTop}" x2="${cx}" y2="${bodyBottom}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="5 5"/>`,
    );
  }

  // activation bars: each participant is active from its first to its last
  // message in the exchange (drawn under the message arrows)
  const actRange = new Map<string, { min: number; max: number }>();
  for (const edge of layout.edges) {
    const y = edge.points[0]?.y ?? bodyTop;
    for (const p of [edge.from, edge.to]) {
      const cur = actRange.get(p) ?? { min: Infinity, max: -Infinity };
      cur.min = Math.min(cur.min, y);
      cur.max = Math.max(cur.max, y);
      actRange.set(p, cur);
    }
  }
  for (const node of layout.nodes) {
    const range = actRange.get(node.id);
    if (!range) continue;
    const cx = node.x + node.width / 2;
    const top = range.min - 18;
    const h = range.max - range.min + 36;
    parts.push(
      `<rect class="lgdl-activation" x="${cx - 4}" y="${top}" width="8" height="${h}" fill="#dbeafe" opacity="0.7" stroke="#93c5fd" stroke-width="1"/>`,
    );
  }

  // participant headers
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
    const docIdx = lgdlNode ? doc.nodes.indexOf(lgdlNode) : -1;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    parts.push(
      `<g class="lgdl-participant"${docIdx >= 0 ? ` data-lgdl-loc="nodes[${docIdx}]"` : ''} fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5">${rect(node.x, node.y, node.width, node.height, 8)}${text(cx, cy, lgdlNode?.label ?? node.id, 13, '#1e40af')}</g>`,
    );
  }

  // messages (horizontal arrows with labels); return messages (pointing
  // left) are dashed to distinguish them from forward requests
  for (const edge of layout.edges) {
    const pts = edge.points;
    if (pts.length < 2) continue;
    const [a, b] = pts;
    const edgeDoc = doc.edges.find((e) => e.from === edge.from && e.to === edge.to);
    const edgeIdx = edgeDoc ? doc.edges.indexOf(edgeDoc) : -1;
    const label = edgeDoc?.label;
    const isReturn = a.x > b.x;
    const dash = isReturn ? ' stroke-dasharray="6 4"' : '';
    parts.push(
      `<g class="lgdl-message"${edgeIdx >= 0 ? ` data-lgdl-loc="edges[${edgeIdx}]"` : ''}><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrowhead)"${dash}/>${label ? text((a.x + b.x) / 2, a.y - 8, label, 12, '#374151') : ''}</g>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}

/** General renderer (flowchart/mindmap/arch/datastream), with optional class-node styling. */
function renderGeneral(doc: LgdlDocument, layout: LayoutResult, mode: 'default' | 'uml-class' | 'datastream' | 'er' | 'mindmap' | 'state'): string {
  const parts: string[] = [];
  // group containers (was doc.groups) — derived from the group nodes
  const groups = deriveGroups(doc);
  // mindmap: per-branch colors + font hierarchy (root > level 1 > level 2)
  const mindmapInfo = mode === 'mindmap' ? computeMindmapInfo(doc) : null;
  // state: initial pseudo-state (solid dot + arrow) above the entry state
  const initialId = mode === 'state' ? findInitialState(doc) : null;
  // anchor to the shape that is ACTUALLY drawn: mindmap renders every node
  // as a rounded rect, uml-class renders every node as a card — diamonds
  // only exist in the generic modes
  const shapeKindFor = (kind: string | undefined): string =>
    mindmapInfo || mode === 'uml-class' ? 'process' : (kind ?? 'process');

  // defs: arrowhead markers (gray for node edges, purple for aggregate edges)
  parts.push(
    `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#6b7280"/></marker>` +
      `<marker id="arrowhead-purple" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#7c3aed"/></marker></defs>` +
      // hover anchors: hidden by default, shown when the node/edge right
      // before them is hovered (adjacent-sibling rule)
      `<style>.lgdl-anchors,.lgdl-edge-anchors{opacity:0;pointer-events:none;transition:opacity .12s ease}.lgdl-node:hover + .lgdl-anchors,.lgdl-class:hover + .lgdl-anchors,.lgdl-group:hover + .lgdl-anchors,.lgdl-lane:hover + .lgdl-anchors{opacity:1}.lgdl-edge:hover + .lgdl-edge-anchors,.lgdl-aggregate-edge:hover + .lgdl-edge-anchors{opacity:1}.lgdl-node.lgdl-hovered + .lgdl-anchors,.lgdl-class.lgdl-hovered + .lgdl-anchors,.lgdl-group.lgdl-hovered + .lgdl-anchors,.lgdl-lane.lgdl-hovered + .lgdl-anchors{opacity:1}.lgdl-edge.lgdl-hovered + .lgdl-edge-anchors,.lgdl-aggregate-edge.lgdl-hovered + .lgdl-edge-anchors{opacity:1}.lgdl-hovered{filter:drop-shadow(0 0 3px rgba(79,70,229,.65))}</style>`,
  );

  // background
  parts.push(`<rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>`);

  // group boxes: compute a bbox for every group (lanes for datastream,
  // nested dashed boxes otherwise) so groups and aggregate edges can be drawn
  const boxOf = new Map<string, { x: number; y: number; w: number; h: number }>();
  if (mode === 'datastream') {
    const lanes = groups.length > 0 ? groups : [{ id: '_default', label: '流程', contains: [] as string[] }];
    lanes.forEach((group, i) => {
      boxOf.set(group.id, { x: 40 + i * 260, y: 40, w: 260, h: layout.height - 40 });
    });
  } else {
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const computeGroupBox = (group: LgdlGroup): { x: number; y: number; w: number; h: number } | undefined => {
      if (boxOf.has(group.id)) return boxOf.get(group.id);
      const xs: number[] = [];
      const ys: number[] = [];
      const xe: number[] = [];
      const ye: number[] = [];
      for (const m of group.contains ?? []) {
        const ln = layout.nodes.find((n) => n.id === m);
        if (ln) {
          xs.push(ln.x);
          ys.push(ln.y);
          xe.push(ln.x + ln.width);
          ye.push(ln.y + ln.height);
          continue;
        }
        const sg = groupById.get(m);
        if (sg) {
          const sb = computeGroupBox(sg);
          if (sb) {
            xs.push(sb.x);
            ys.push(sb.y);
            xe.push(sb.x + sb.w);
            ye.push(sb.y + sb.h);
          }
        }
      }
      if (xs.length === 0) return undefined;
      const pad = 20;
      const box = {
        x: Math.min(...xs) - pad,
        y: Math.min(...ys) - pad - 30,
        w: Math.max(...xe) - Math.min(...xs) + pad * 2,
        h: Math.max(...ye) - Math.min(...ys) + pad * 2 + 30,
      };
      boxOf.set(group.id, box);
      return box;
    };
    for (const g of groups) computeGroupBox(g);
  }

  // groups that own a node id (any nesting level). An edge is allowed to leave
  /// and enter its own group, so those group boxes are NOT obstacles for it.
  const groupsOwning = (id: string | undefined): Set<string> | undefined => {
    if (!id) return undefined;
    const seen = new Set<string>();
    const collect = (nid: string): void => {
      for (const g of groups) {
        if (g.contains?.includes(nid) && !seen.has(g.id)) {
          seen.add(g.id);
          collect(g.id); // nested containment
        }
      }
    };
    collect(id);
    return seen.size > 0 ? seen : undefined;
  };

  // groups (behind everything else)
  // 8 fixed border anchors for a group box, revealed on hover (same
  // 15-deg quantization the aggregate edges snap to)
  const anchorDots = (b: { x: number; y: number; w: number; h: number }, color: string): string => {
    const dots: string[] = [];
    for (let k = 0; k < 24; k++) {
      const th = (k * Math.PI) / 12;
      const ap = shapeEdgePoint('process', { x: b.x, y: b.y, width: b.w, height: b.h }, {
        x: b.x + b.w / 2 + Math.cos(th),
        y: b.y + b.h / 2 + Math.sin(th),
      }, 8);
      dots.push(`<circle cx="${ap.x.toFixed(1)}" cy="${ap.y.toFixed(1)}" r="3" fill="${color}"/>`);
    }
    return `<g class="lgdl-anchors">${dots.join('')}</g>`;
  };
  if (mode === 'datastream') {
    // swimlanes: full-height columns with header
    groups.forEach((group, i) => {
      const laneX = 40 + i * 260;
      const fill = GROUP_FILLS[i % GROUP_FILLS.length];
      parts.push(
        `<g class="lgdl-lane" data-lgdl-loc="groups[${i}]"><rect x="${laneX}" y="40" width="260" height="${layout.height - 40}" fill="${fill}" stroke="#e2e8f0"/>` +
          `<rect x="${laneX}" y="40" width="260" height="36" fill="#eef2ff" stroke="#e2e8f0"/>` +
          `${text(laneX + 130, 58, group.label ?? group.id, 13, '#4338ca')}</g>` +
          anchorDots({ x: laneX, y: 40, w: 260, h: layout.height - 40 }, '#64748b'),
      );
    });
  } else {
    // draw outer groups first (bottom layer), inner groups on top —
    // otherwise an outer group's opaque fill hides the inner group's border
    const groupIds = new Set(groups.map((g) => g.id));
    const parentOf = new Map<string, string>();
    for (const g of groups) {
      for (const m of g.contains) {
        if (groupIds.has(m) && !parentOf.has(m)) parentOf.set(m, g.id);
      }
    }
    const depthOf = (id: string): number => {
      let d = 0;
      let cur = id;
      const seen = new Set<string>();
      while (parentOf.has(cur) && !seen.has(cur)) {
        seen.add(cur);
        cur = parentOf.get(cur)!;
        d++;
      }
      return d;
    };
    const orderedGroups = [...groups].sort((a, b) => depthOf(a.id) - depthOf(b.id));
    orderedGroups.forEach((group, i) => {
      const box = boxOf.get(group.id);
      if (!box) return;
      const fill = GROUP_FILLS[i % GROUP_FILLS.length];
      // data-lgdl-loc must use the ORIGINAL document index, not the sorted
      // draw order
      const groupIdx = groups.indexOf(group);
      parts.push(
        `<g class="lgdl-group" data-lgdl-loc="groups[${groupIdx}]"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8" fill="${fill}" stroke="#d1d5db" stroke-dasharray="6 4"/>${text(box.x + 12, box.y + 18, group.label ?? group.id, 12, '#6b7280', 'start')}</g>` +
          anchorDots(box, '#64748b'),
      );
    });
  }

  // state: initial pseudo-state — solid dot + arrow into the entry state
  if (initialId) {
    const initNode = layout.nodes.find((n) => n.id === initialId);
    if (initNode) {
      const initIdx = doc.nodes.findIndex((n) => n.id === initialId);
      const cx = initNode.x + initNode.width / 2;
      const top = initNode.y;
      parts.push(
        `<g class="lgdl-initial"${initIdx >= 0 ? ` data-lgdl-loc="nodes[${initIdx}]"` : ''}><circle cx="${cx}" cy="${top - 18}" r="6" fill="#111827"/>` +
          `<line x1="${cx}" y1="${top - 12}" x2="${cx}" y2="${top - 2}" stroke="#111827" stroke-width="1.5" marker-end="url(#arrowhead)"/></g>`,
      );
    }
  }

  // nodes (on top)
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
    if (!lgdlNode) continue;
    const docIdx = doc.nodes.indexOf(lgdlNode);
    const loc = `nodes[${docIdx}]`;
    let nodeClass = 'lgdl-node';
    let stroke: string;
    if (mode === 'uml-class') {
      parts.push(renderClassNode(node, lgdlNode, docIdx));
      nodeClass = 'lgdl-class';
      stroke = '#4f46e5';
    } else {
      const kind = lgdlNode.kind ?? 'process';
      // mindmap has no branching/terminal shapes: every node is a rounded
      // rect (decision diamonds and start/end pills are flowchart concepts —
      // in a mindmap they only break visual consistency). Hierarchy is shown
      // by branch colors and font size, not by kind shapes.
      const shape = mindmapInfo ? SHAPES.process : (SHAPES[kind] ?? SHAPES.process);
      let fill = FILL_BY_KIND[kind] ?? FILL_BY_KIND.process;
      stroke = STROKE_BY_KIND[kind] ?? STROKE_BY_KIND.process;
      let fontSize = 13;
      if (mindmapInfo) {
        const info = mindmapInfo.get(node.id);
        if (info) {
          // branch color overrides the kind palette; root uses the first color
          const color = info.branch === 'root' ? MIND_COLORS[0] : MIND_COLORS[info.branchIndex % MIND_COLORS.length];
          fill = info.branch === 'root' ? '#eff6ff' : MIND_FILLS[info.branchIndex % MIND_FILLS.length];
          stroke = color;
          // distinct font hierarchy: root > level 1 > level 2
          fontSize = info.depth === 0 ? 20 : info.depth === 1 ? 15 : 12;
        }
      }
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      // er entities: name + attribute rows straight from `members` (no
      // visibility symbols — ER has no visibility concept)
      let display = lgdlNode.label ?? lgdlNode.id;
      if (mode === 'er' && lgdlNode.members && lgdlNode.members.length > 0) {
        const rows = lgdlNode.members.map((m) =>
          m.kind === 'method'
            ? `${m.name}${m.params ?? '()'}${m.type ? `: ${m.type}` : ''}`
            : `${m.name}${m.type ? `: ${m.type}` : ''}`,
        );
        display = [display, ...rows].join('\n');
      }
      parts.push(
        `<g class="${nodeClass}" data-lgdl-loc="${loc}">${shape.body(node.x, node.y, node.width, node.height, fill, stroke)}${text(cx, cy, display, fontSize)}</g>`,
      );
    }
    // hover anchors: the node's 8 fixed border anchors, hidden until the
    // node is hovered (CSS sibling rule in the inline <style>). Reuses the
    // same shape geometry the edges snap to, so dots sit exactly under the
    // line endpoints.
    const shapeKind = shapeKindFor(lgdlNode.kind);
    const dots: string[] = [];
    for (let k = 0; k < 24; k++) {
      const th = (k * Math.PI) / 12;
      const ap = shapeEdgePoint(shapeKind, node, {
        x: node.x + node.width / 2 + Math.cos(th),
        y: node.y + node.height / 2 + Math.sin(th),
      });
      dots.push(`<circle cx="${ap.x.toFixed(1)}" cy="${ap.y.toFixed(1)}" r="3" fill="${stroke}"/>`);
    }
    parts.push(`<g class="lgdl-anchors">${dots.join('')}</g>`);
  }

  // aggregate edges (group <-> node / group <-> group) — drawn above the
  // group boxes, below nodes; straight line between the two endpoints
  // group ids (kind:'group' nodes) are NOT ordinary node ids — an edge whose
  // endpoint is a group id is an aggregate edge, never a regular node edge
  const nodeIdSet = new Set(doc.nodes.filter((n) => n.kind !== 'group').map((n) => n.id));
  const nodeCenter = (id: string): { x: number; y: number } => {
    const ln = layout.nodes.find((n) => n.id === id);
    return ln ? { x: ln.x + ln.width / 2, y: ln.y + ln.height / 2 } : { x: 0, y: 0 };
  };
  // center of an endpoint: node center, or group box center for groups
  const centerOf = (id: string): { x: number; y: number } => {
    if (!nodeIdSet.has(id)) {
      const b = boxOf.get(id);
      if (b) return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    }
    return nodeCenter(id);
  };
  doc.edges.forEach((edge, i) => {
    if (nodeIdSet.has(edge.from) && nodeIdSet.has(edge.to)) return; // regular node edge
    const fromBox = nodeIdSet.has(edge.from) ? undefined : boxOf.get(edge.from);
    const toBox = nodeIdSet.has(edge.to) ? undefined : boxOf.get(edge.to);
    const fromCenter = centerOf(edge.from);
    const toCenter = centerOf(edge.to);
    // node endpoints anchor to the node's real shape border (same anchor
    // rules as regular edges); group endpoints stay on the group box border
    const nodeAnchor = (id: string, toward: { x: number; y: number }) => {
      const nb = layout.nodes.find((n) => n.id === id);
      if (!nb) return nodeCenter(id);
      const kind = shapeKindFor(doc.nodes.find((n) => n.id === id)?.kind);
      return shapeEdgePoint(kind, nb, toward);
    };
    const src = fromBox ? shapeEdgePoint('process', { x: fromBox.x, y: fromBox.y, width: fromBox.w, height: fromBox.h }, toCenter, 8) : nodeAnchor(edge.from, toCenter);
    const dst = toBox ? shapeEdgePoint('process', { x: toBox.x, y: toBox.y, width: toBox.w, height: toBox.h }, fromCenter, 8) : nodeAnchor(edge.to, fromCenter);
    // aggregate edges were a bare straight line which, on vertically-aligned
    // endpoints, needed an offsetX hack and could hug a group-border. Route
    // them rectilinearly instead: obstacles are the surrounding node boxes and
    // every group box EXCEPT the two endpoint groups (the edge may leave/enter
    // its own group). No offsetX hack — the channel search finds a clear lane.
    const routeBoxesAgg = [
      ...layout.nodes
        .filter((n) => n.id !== edge.from && n.id !== edge.to)
        .map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height })),
      ...[...boxOf.entries()]
        .filter(([gid]) => gid !== edge.from && gid !== edge.to)
        .map(([, b]) => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
    ];
    const aggPath = routeRectilinear(src, dst, routeBoxesAgg, [src, dst]);
    const aggD = aggPath.map((p, k) => `${k === 0 ? 'M' : 'L'} ${Math.round(p.x)},${Math.round(p.y)}`).join(' ');
    const label = edge.label;
    let labelEl = '';
    if (label) {
      // keep the label readable: readable 11px font with a white backdrop,
      // centered on the longest segment (clamped to the canvas); never shrink
      // to tiny unreadable sizes even on very short segments
      const fontSize = 11;
      const w = label.length * fontSize;
      const seg = aggPath.reduce<{ len: number; x: number; y: number }>(
        (best, p, k) => {
          const nxt = aggPath[k + 1];
          if (!nxt) return best;
          const len = Math.hypot(nxt.x - p.x, nxt.y - p.y);
          return len > best.len ? { len, x: (p.x + nxt.x) / 2, y: (p.y + nxt.y) / 2 } : best;
        },
        { len: -1, x: dst.x, y: dst.y },
      );
      const x = Math.max(10 + w / 2, Math.min(seg.x, layout.width - 10 - w / 2));
      const y = seg.y - 4;
      const bgW = w + 8;
      const bgH = fontSize + 6;
      labelEl =
        `<rect x="${(x - bgW / 2).toFixed(1)}" y="${(y - bgH / 2).toFixed(1)}" width="${bgW}" height="${bgH}" rx="3" fill="#ffffff" opacity="0.9"/>` +
        text(x, y, label, fontSize, '#7c3aed');
    }
    parts.push(
      `<g class="lgdl-aggregate-edge" data-lgdl-loc="edges[${i}]"><path d="${aggD}" fill="none" stroke="#7c3aed" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#arrowhead-purple)"/>${labelEl}</g>` +
        // hover the aggregate edge -> reveal its two endpoint anchors
        `<g class="lgdl-edge-anchors"><circle cx="${src.x.toFixed(1)}" cy="${src.y.toFixed(1)}" r="3.5" fill="#7c3aed"/><circle cx="${dst.x.toFixed(1)}" cy="${dst.y.toFixed(1)}" r="3.5" fill="#7c3aed"/></g>`,
    );
  });

  // edges (behind nodes)
  // placed node-edge labels, tracked so dense labels (e.g. state diagrams)
  // don't collide — conflicts are pushed to alternate rows
  const placedLabels: LabelBox[] = [];
  // obstacle boxes: every node (padded) must not be covered by an edge label
  const nodeObstacles: LabelBox[] = layout.nodes
    .filter((n) => doc.nodes.some((dn) => dn.id === n.id))
    .map((n) => ({ x: n.x - 2, y: n.y - 2, w: n.width + 4, h: n.height + 4 }));
  // also treat group box borders as obstacles so edge labels (e.g. 售后入口 /
  // 通知履约) don't sit on the group boundary label area and collide with the
  // group header text. Only non-lane (datastream) groups have a full box here.
  const groupObstacles: LabelBox[] = [...boxOf.entries()]
    .filter(([, b]) => b.w > 0 && b.h > 0)
    .map(([, b]) => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
  const labelObstacles = [...nodeObstacles, ...groupObstacles];

  // Bug3: 重复标签冗余 — edges that share the same `from` and same `label`
  // (a fan-out trunk, e.g. api-gateway -> 5 services all labelled 路由转发)
  // render the label ONCE near the source instead of once per branch. The
  // label-merge groups are computed up front (document order, so the first
  // edge of each group is the "owner" that draws the consolidated label).
  const mergedGroup = new Map<string, { ownerDocIdx: number; label: string; from: string }>();
  const groupDocs = new Map<string, { ownerDocIdx: number; label: string; from: string }>();
  doc.edges.forEach((e, docIdx) => {
    if (!e.label) return;
    const key = `${e.from}\u0000${e.label}`;
    const existing = groupDocs.get(key);
    if (existing) {
      // keep the lowest document index as owner
      if (docIdx < existing.ownerDocIdx) existing.ownerDocIdx = docIdx;
    } else {
      groupDocs.set(key, { ownerDocIdx: docIdx, label: e.label, from: e.from });
    }
  });
  // a group is merged only if it fans out to >= 2 targets (true redundancy)
  const targetCount = new Map<string, number>();
  doc.edges.forEach((e) => {
    if (!e.label) return;
    const key = `${e.from}\u0000${e.label}`;
    targetCount.set(key, (targetCount.get(key) ?? 0) + 1);
  });
  for (const [key, g] of groupDocs) {
    if ((targetCount.get(key) ?? 0) >= 2) mergedGroup.set(key, g);
  }

  for (const edge of layout.edges) {
    const pts = edge.points.length > 0 ? edge.points : routeDefault(doc, edge.from, edge.to);
    // Snap both endpoints to the REAL shape border (dagre only trims to the
    // bounding rect — diamonds are empty near the rect corners, so lines
    // starting from a decision floated in blank space).
    const srcNode = layout.nodes.find((n) => n.id === edge.from);
    const dstNode = layout.nodes.find((n) => n.id === edge.to);
    const srcKind = shapeKindFor(doc.nodes.find((n) => n.id === edge.from)?.kind);
    const dstKind = shapeKindFor(doc.nodes.find((n) => n.id === edge.to)?.kind);
    // Bug1/Bug4: force 90° orthogonal routing so diagonal stubs and long
    // slashes become clean rectilinear turns, and route the horizontal runs
    // around intermediate nodes (order->payment no longer slices through
    // inventory-service). The edge's own endpoints are excluded from obstacle
    // checks so the approach into the source/target is never flagged.
    // Obstacles = node boxes + EVERY group box EXCEPT the groups that own the
    // edge's two endpoints (an edge is allowed to leave/enter its own group).
    const routeBoxes = [
      ...layout.nodes
        .filter((n) => n.id !== edge.from && n.id !== edge.to)
        .map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height })),
      ...[...boxOf.entries()]
        .filter(([gid]) => !(groupsOwning(edge.from)?.has(gid) || groupsOwning(edge.to)?.has(gid)))
        .map(([, b]) => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
    ];
    // 贴边平行 + 走线穿越节点内部: use the A* grid router to find a 90°-orthogonal
    // path that keeps clear of (inflated) third-party boxes and never passes
    // through its own endpoints' body. The router tries several exit/entry anchor
    // pairs (centre/local face directions) and keeps the best-quality result, so
    // an edge leaving a node's bottom doesn't double back through it, and a drop
    // toward a target rides clear of the target's side wall.
    const ortho = routeEdge({
      points: pts,
      srcNode: srcNode ?? undefined,
      dstNode: dstNode ?? undefined,
      srcKind,
      dstKind,
      obstacles: routeBoxes,
      bounds: { w: layout.width, h: layout.height },
    });
    const d = ortho
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${Math.round(p.x)},${Math.round(p.y)}`)
      .join(' ');
    const edgeDoc = doc.edges.find((e) => e.from === edge.from && e.to === edge.to);
    const edgeIdx = edgeDoc ? doc.edges.indexOf(edgeDoc) : -1;
    const label = edgeDoc?.label;
    // Bug3: merged fan-out trunk — the label renders once (near the source),
    // on the owner edge only; non-owner edges in the group draw the line but
    // no label, so "路由转发" no longer repeats 5x.
    const mergedKey = label ? `${edge.from}\u0000${label}` : null;
    const merged = mergedKey ? mergedGroup.get(mergedKey) : undefined;
    const isMergedNonOwner = merged !== undefined && edgeIdx !== merged.ownerDocIdx && merged.from === edge.from;
    let labelEl = '';
    if (label || edgeDoc?.cardinalityFrom !== undefined || edgeDoc?.cardinalityTo !== undefined) {
      if (isMergedNonOwner) {
        // drawn as a branch: suppress the label entirely
        labelEl = '';
      } else {
      // ER / UML multiplicities: explicit cardinalityFrom/To fields, rendered
      // near each endpoint; the label stays the pure relationship name.
      // No legacy label parsing — multiplicity must live in the fields.
      const wantsCards = mode === 'er' || mode === 'uml-class';
      if (wantsCards && (edgeDoc?.cardinalityFrom !== undefined || edgeDoc?.cardinalityTo !== undefined)) {
        const rel = label ?? '';
        const fromV = edgeDoc?.cardinalityFrom;
        const toV = edgeDoc?.cardinalityTo;
        const p0 = ortho[0];
        const pn = ortho[ortho.length - 1];
        const ux = (pn.x - p0.x) / (Math.hypot(pn.x - p0.x, pn.y - p0.y) || 1);
        const uy = (pn.y - p0.y) / (Math.hypot(pn.x - p0.x, pn.y - p0.y) || 1);
        // anchor multiplicities 22px outside the entity borders so small
        // glyphs like "*" stay clearly readable next to the card edges
        const srcCard = { x: p0.x + ux * 22, y: p0.y + uy * 22 };
        const dstCard = { x: pn.x - ux * 22, y: pn.y - uy * 22 };
        let relEl = '';
        if (rel) {
          const { x, y } = placeLabelBox(ortho, rel, labelObstacles, placedLabels);
          relEl = text(x, y, rel, 12, '#6b7280');
        }
        labelEl =
          relEl +
          (fromV !== undefined ? text(srcCard.x, srcCard.y - 6, fromV, 12, '#b45309') : '') +
          (toV !== undefined ? text(dstCard.x, dstCard.y - 6, toV, 12, '#b45309') : '');
      } else {
        const { x, y } = placeLabelBox(ortho, label ?? '', labelObstacles, placedLabels);
        labelEl = text(x, y, label ?? '', 12, '#6b7280');
      }
      }
    }
    parts.push(
      `<g class="lgdl-edge"${edgeIdx >= 0 ? ` data-lgdl-loc="edges[${edgeIdx}]"` : ''}><path d="${d}" fill="none" stroke="#6b7280" stroke-width="1.5" marker-end="url(#arrowhead)"/>${labelEl}</g>` +
        // hover the edge -> reveal the two anchors it connects to
        `<g class="lgdl-edge-anchors"><circle cx="${ortho[0].x.toFixed(1)}" cy="${ortho[0].y.toFixed(1)}" r="3.5" fill="#6b7280"/><circle cx="${ortho[ortho.length - 1].x.toFixed(1)}" cy="${ortho[ortho.length - 1].y.toFixed(1)}" r="3.5" fill="#6b7280"/></g>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}

/** Fallback straight-line routing when dagre provides no points. */
function routeDefault(
  doc: LgdlDocument,
  fromId: string,
  toId: string,
): { x: number; y: number }[] {
  // Degenerate fallback: dagre should always supply points for routed types;
  // this is only a safety net (identical to a zero-length edge at origin).
  return [{ x: 0, y: 0 }, { x: 0, y: 0 }];
}

function renderClassNode(node: LayoutNodeLike, lgdlNode: { label?: string; id: string; members?: LgdlMember[] }, nodeIdx: number): string {
  const { x, y, width, height } = node;
  const locBase = `nodes[${nodeIdx}]`;

  const name = lgdlNode.label ?? lgdlNode.id;
  // member rows keep their ORIGINAL member index (mi) so clicking a row can
  // jump to "nodes[i].members[mi]" even though rows are split by kind
  const attrs: { text: string; mi: number }[] = [];
  const methods: { text: string; mi: number }[] = [];
  lgdlNode.members?.forEach((m, mi) => {
    const vis = m.visibility ? VIS_SYMBOL[m.visibility] ?? '' : '';
    const text =
      m.kind === 'method'
        ? `${vis} ${m.name}${m.params ?? '()'}${m.type ? `: ${m.type}` : ''}`
        : `${vis} ${m.name}${m.type ? `: ${m.type}` : ''}`;
    (m.kind === 'method' ? methods : attrs).push({ text, mi });
  });

  const headerH = 32;
  const attrsH = attrs.length * 18 + (attrs.length > 0 ? 8 : 0);
  const methodsH = methods.length * 18 + (methods.length > 0 ? 8 : 0);
  const border = 1.5;

  const parts: string[] = [];
  // header
  parts.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${headerH}" fill="#eef2ff" stroke="#4f46e5" stroke-width="${border}"/>`,
  );
  parts.push(`<text x="${x + width / 2}" y="${y + headerH / 2}" font-family="${FONT_FAMILY}" font-size="13" font-weight="bold" fill="#312e81" text-anchor="middle" dominant-baseline="middle">${escapeXml(name)}</text>`);
  // divider
  parts.push(`<line x1="${x}" y1="${y + headerH}" x2="${x + width}" y2="${y + headerH}" stroke="#4f46e5" stroke-width="${border}"/>`);

  let cursorY = y + headerH;
  if (attrs.length > 0) {
    parts.push(
      `<rect x="${x}" y="${cursorY}" width="${width}" height="${attrsH}" fill="#ffffff" stroke="#4f46e5" stroke-width="${border}"/>`,
    );
    attrs.forEach((a, i) => {
      parts.push(
        `<text data-lgdl-loc="${locBase}.members[${a.mi}]" x="${x + 10}" y="${cursorY + 16 + i * 18}" font-family="${FONT_FAMILY}" font-size="11" fill="#374151" text-anchor="start" dominant-baseline="middle">${escapeXml(a.text)}</text>`,
      );
    });
    cursorY += attrsH;
    parts.push(`<line x1="${x}" y1="${cursorY}" x2="${x + width}" y2="${cursorY}" stroke="#4f46e5" stroke-width="${border}"/>`);
  }

  if (methods.length > 0) {
    parts.push(
      `<rect x="${x}" y="${cursorY}" width="${width}" height="${methodsH}" fill="#ffffff" stroke="#4f46e5" stroke-width="${border}"/>`,
    );
    methods.forEach((m, i) => {
      parts.push(
        `<text data-lgdl-loc="${locBase}.members[${m.mi}]" x="${x + 10}" y="${cursorY + 16 + i * 18}" font-family="${FONT_FAMILY}" font-size="11" fill="#374151" text-anchor="start" dominant-baseline="middle">${escapeXml(m.text)}</text>`,
      );
    });
  }

  return `<g class="lgdl-class" data-lgdl-loc="${locBase}">${parts.join('')}</g>`;
}

/** Minimal structural type (avoids importing layout types into render). */
interface LayoutNodeLike {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Gantt chart renderer: time axis + task bars + dependency arrows + lanes. */
function renderGantt(doc: LgdlDocument, layout: LayoutResult): string {
  const parts: string[] = [];
  const groups = deriveGroups(doc);
  parts.push(
    `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/></marker></defs>`,
  );
  parts.push(`<rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>`);

  // time scale (mirrors layoutGantt's adaptive colW so bars stay aligned)
  const MARGIN = 40;
  const LABEL_W = 220;
  const startOf = (t: LgdlNode): number => (typeof t.attrs?.start === 'number' ? t.attrs.start : 0);
  const durOf = (t: LgdlNode): number => (typeof t.attrs?.duration === 'number' ? t.attrs.duration : 1);
  const minStart = doc.nodes.filter((n) => n.kind !== 'group').reduce((min, t) => Math.min(min, startOf(t)), 0);
  let maxEnd = 1;
  for (const t of doc.nodes) {
    if (t.kind === 'group') continue; // group boxes are sections, not tasks
    maxEnd = Math.max(maxEnd, startOf(t) + durOf(t));
  }
  const span = Math.max(maxEnd - minStart, 1);
  const colW = Math.max((layout.width - MARGIN * 2 - LABEL_W) / span, 1);
  const axisX = MARGIN + LABEL_W;

  const barY = new Map<string, number>();
  layout.nodes.forEach((n) => barY.set(n.id, n.y));

  // lane bands (from doc.groups) — drawn behind bars so groups read as
  // swimlanes: a tinted band per group + a header + a bottom separator.
  const laneFills = ['#eff6ff', '#ecfdf5', '#fffbeb', '#faf5ff', '#f8fafc'];
  groups.forEach((group, gi) => {
    const ys: number[] = [];
    const ye: number[] = [];
    for (const m of group.contains ?? []) {
      const ln = layout.nodes.find((n) => n.id === m);
      if (ln) {
        ys.push(ln.y - 8);
        ye.push(ln.y + ln.height + 8);
      }
    }
    if (ys.length === 0) return;
    const band = {
      x: MARGIN,
      y: Math.min(...ys) - 10,
      w: layout.width - MARGIN * 2,
      h: Math.max(...ye) - Math.min(...ys) + 20,
      label: group.label ?? group.id,
    };
    // fill + header text + bottom separator (explicit 泳道分隔线)
    parts.push(
      `<g class="lgdl-gantt-lane" data-lgdl-loc="groups[${gi}]">` +
        `<rect x="${band.x}" y="${band.y}" width="${band.w}" height="${band.h}" fill="${laneFills[gi % laneFills.length]}" stroke="#cbd5e1" stroke-dasharray="4 3"/>` +
        `<rect x="${band.x}" y="${band.y}" width="${band.w}" height="22" fill="${laneFills[gi % laneFills.length]}" stroke="#cbd5e1"/>` +
        `<text x="${band.x + 10}" y="${band.y + 15}" font-family="${FONT_FAMILY}" font-size="12" fill="#475569" text-anchor="start" dominant-baseline="middle">${escapeXml(band.label)}</text>` +
        `<line x1="${band.x}" y1="${band.y + band.h}" x2="${band.x + band.w}" y2="${band.y + band.h}" stroke="#94a3b8" stroke-width="1"/>` +
        `</g>`,
    );
  });

  // dependencies first (behind bars)
  for (const edge of layout.edges) {
    const pts = edge.points;
    if (pts.length < 2) continue;
    const [a, b] = pts;
    const edgeDoc = doc.edges.find((e) => e.from === edge.from && e.to === edge.to);
    const edgeIdx = edgeDoc ? doc.edges.indexOf(edgeDoc) : -1;
    // L-shaped connector: from end of source bar, right, then down to target
    const midX = Math.min(a.x + 20, b.x);
    parts.push(
      `<g class="lgdl-dep"${edgeIdx >= 0 ? ` data-lgdl-loc="edges[${edgeIdx}]"` : ''}><path d="M ${a.x},${a.y} L ${midX},${a.y} L ${midX},${b.y} L ${b.x},${b.y}" fill="none" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrowhead)"/></g>`,
    );
  }

  // task bars
  const labelColX = MARGIN + LABEL_W - 12; // task names pinned to the left label column
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
    const docIdx = lgdlNode ? doc.nodes.indexOf(lgdlNode) : -1;
    const start = typeof lgdlNode?.attrs?.start === 'number' ? lgdlNode.attrs.start : 0;
    const dur = typeof lgdlNode?.attrs?.duration === 'number' ? lgdlNode.attrs.duration : 1;
    const label = lgdlNode?.label ?? node.id;
    const cy = node.y + node.height / 2;
    // left label: fixed column (aligned across rows), not glued to the bar
    parts.push(text(labelColX, cy, label, 12, '#374151', 'end'));
    // bar; narrow bars get their time text outside (right) instead of clipped
    const timeText = `${start}d +${dur}d`;
    const inside = node.width >= 64;
    const barText = inside
      ? text(node.x + node.width / 2, cy, timeText, 11, '#ffffff')
      : text(node.x + node.width + 6, cy, timeText, 10, '#2563eb', 'start');
    if (lgdlNode?.kind === 'milestone') {
      // milestones render as a diamond marker, visually distinct from bars
      const cx = node.x + node.width / 2;
      const r = 9;
      const diamond = `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="#8b5cf6" stroke="#7c3aed"/>`;
      parts.push(
        `<g class="lgdl-gantt-milestone"${docIdx >= 0 ? ` data-lgdl-loc="nodes[${docIdx}]"` : ''}>${diamond}${barText}</g>`,
      );
    } else {
      parts.push(
        `<g class="lgdl-gantt-bar"${docIdx >= 0 ? ` data-lgdl-loc="nodes[${docIdx}]"` : ''}><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="6" fill="#3b82f6" opacity="0.85"/>${barText}</g>`,
      );
    }
  }

  // time axis header — adaptive tick stride so labels never collide: label
  // every Nth day (the smallest "nice" stride with <= ~11 ticks).
  const axisY = MARGIN;
  const axisW = span * colW;
  const niceStrides = [1, 2, 5, 10, 20, 30, 60, 90, 180, 365];
  const stride = niceStrides.find((s) => span / s <= 11) ?? niceStrides[niceStrides.length - 1];
  parts.push(
    `<g class="lgdl-gantt-axis"><rect x="${axisX}" y="${axisY}" width="${axisW}" height="40" fill="#f1f5f9" stroke="#e2e8f0"/>`,
  );
  // gridline + label at each stride multiple; also minor gridlines every day
  for (let d = 0; d <= span; d++) {
    const x = axisX + d * colW;
    const isTick = d % stride === 0 || d === span;
    if (isTick) {
      parts.push(
        `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 40}" stroke="#94a3b8" stroke-width="1"/>` +
          text(x, axisY + 20, `D${d}`, 10, '#475569'),
      );
    } else {
      parts.push(`<line x1="${x}" y1="${axisY + 26}" x2="${x}" y2="${axisY + 40}" stroke="#e2e8f0" stroke-width="1"/>`);
    }
  }
  parts.push('</g>');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}
export { renderAscii } from './ascii.js';
