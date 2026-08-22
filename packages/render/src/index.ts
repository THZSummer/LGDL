/**
 * LGDL SVG renderer.
 *
 * Takes a LayoutResult + LgdlDocument and produces clean SVG markup.
 * Shapes are mapped from node kinds; a theme can be swapped later.
 */
import type { LgdlDocument, LgdlGroup, LgdlMember } from '@lgdl/core';
import { VIS_SYMBOL } from '@lgdl/core';
import type { LayoutResult } from '@lgdl/layout';

const FONT_FAMILY = "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";

interface NodeShape {
  /** Builds the shape body. Returns the inner content (text) markup too. */
  body(x: number, y: number, w: number, h: number): string;
  /** Anchor point for edges on the shape boundary (top). */
  anchor(x: number, y: number, w: number, h: number, dir: 'top' | 'bottom' | 'left' | 'right'): { x: number; y: number };
}

function rect(x: number, y: number, w: number, h: number, rx = 4): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}"/>`;
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
    body(x, y, w, h) {
      return `${rect(x, y, w, h, w / 2)}`; // pill
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  end: {
    body(x, y, w, h) {
      return `${rect(x, y, w, h, w / 2)}`;
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  // Process: plain rect
  process: {
    body(x, y, w, h) {
      return rect(x, y, w, h, 6);
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  // Decision: diamond
  decision: {
    body(x, y, w, h) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `<polygon points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}"/>`;
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
  // Entity: cylinder-ish
  entity: {
    body(x, y, w, h) {
      const cy = y + h;
      return `<path d="M ${x},${y + 10} L ${x},${cy - 10} A ${w / 2},10 0 0 0 ${x + w},${cy - 10} L ${x + w},${y + 10} A ${w / 2},10 0 0 1 ${x},${y + 10} Z"/>`;
    },
    anchor(x, y, w, h, dir) {
      return edgeAnchor(x, y, w, h, dir, 0);
    },
  },
  // Note: folded corner
  note: {
    body(x, y, w, h) {
      return `<path d="M ${x},${y} L ${x + w - 12},${y} L ${x + w},${y + 12} L ${x + w},${y + h} L ${x},${y + h} Z"/>`;
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
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of doc.nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of doc.edges) {
    children.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }
  const rootId = doc.nodes.find((n) => (inDegree.get(n.id) ?? 0) === 0)?.id;
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
  const inDegree = new Map<string, number>();
  for (const n of doc.nodes) inDegree.set(n.id, 0);
  for (const e of doc.edges) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  const entries = doc.nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  return entries.length === 1 ? entries[0].id : null;
}

/**
 * Place an edge label at (x, y), pushing it to alternate rows when it
 * would collide with an already-placed label (dense diagrams like state
 * machines put many labels at the same y). The label is registered for
 * future collision checks. Returns the final position.
 */
function placeLabel(
  x: number,
  y: number,
  label: string,
  placed: { x: number; y: number; w: number }[],
): { x: number; y: number } {
  const w = label.length * 12;
  const clash = (lx: number, ly: number) =>
    placed.some((p) => Math.abs(p.y - ly) < 14 && Math.min(p.x + p.w, lx + w) - Math.max(p.x, lx) > 4);
  let ly = y;
  if (clash(x, ly)) {
    // try rows above/below, widening the offset each round
    for (let attempt = 1; attempt <= 4; attempt++) {
      const offset = 14 * attempt;
      const cand = y + (attempt % 2 === 1 ? -offset : offset);
      if (!clash(x, cand)) {
        ly = cand;
        break;
      }
    }
  }
  placed.push({ x, y: ly, w });
  return { x, y: ly };
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
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    parts.push(
      `<g class="lgdl-participant" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5">${rect(node.x, node.y, node.width, node.height, 8)}${text(cx, cy, lgdlNode?.label ?? node.id, 13, '#1e40af')}</g>`,
    );
  }

  // messages (horizontal arrows with labels); return messages (pointing
  // left) are dashed to distinguish them from forward requests
  for (const edge of layout.edges) {
    const pts = edge.points;
    if (pts.length < 2) continue;
    const [a, b] = pts;
    const label = doc.edges.find((e) => e.from === edge.from && e.to === edge.to)?.label;
    const isReturn = a.x > b.x;
    const dash = isReturn ? ' stroke-dasharray="6 4"' : '';
    parts.push(
      `<g class="lgdl-message"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrowhead)"${dash}/>${label ? text((a.x + b.x) / 2, a.y - 8, label, 12, '#374151') : ''}</g>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}

/** General renderer (flowchart/mindmap/arch/datastream), with optional class-node styling. */
function renderGeneral(doc: LgdlDocument, layout: LayoutResult, mode: 'default' | 'uml-class' | 'datastream' | 'er' | 'mindmap' | 'state'): string {
  const parts: string[] = [];
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
      `<style>.lgdl-anchors,.lgdl-edge-anchors{opacity:0;pointer-events:none;transition:opacity .12s ease}.lgdl-node:hover + .lgdl-anchors,.lgdl-class:hover + .lgdl-anchors{opacity:1}.lgdl-edge:hover + .lgdl-edge-anchors,.lgdl-aggregate-edge:hover + .lgdl-edge-anchors{opacity:1}</style>`,
  );

  // background
  parts.push(`<rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>`);

  // group boxes: compute a bbox for every group (lanes for datastream,
  // nested dashed boxes otherwise) so groups and aggregate edges can be drawn
  const boxOf = new Map<string, { x: number; y: number; w: number; h: number }>();
  if (mode === 'datastream') {
    const lanes = doc.groups.length > 0 ? doc.groups : [{ id: '_default', label: '流程', contains: [] as string[] }];
    lanes.forEach((group, i) => {
      boxOf.set(group.id, { x: 40 + i * 260, y: 40, w: 260, h: layout.height - 40 });
    });
  } else {
    const groupById = new Map(doc.groups.map((g) => [g.id, g]));
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
      const pad = 14;
      const box = {
        x: Math.min(...xs) - pad,
        y: Math.min(...ys) - pad - 24,
        w: Math.max(...xe) - Math.min(...xs) + pad * 2,
        h: Math.max(...ye) - Math.min(...ys) + pad * 2 + 24,
      };
      boxOf.set(group.id, box);
      return box;
    };
    for (const g of doc.groups) computeGroupBox(g);
  }

  // groups (behind everything else)
  if (mode === 'datastream') {
    // swimlanes: full-height columns with header
    doc.groups.forEach((group, i) => {
      const laneX = 40 + i * 260;
      const fill = GROUP_FILLS[i % GROUP_FILLS.length];
      parts.push(
        `<g class="lgdl-lane"><rect x="${laneX}" y="40" width="260" height="${layout.height - 40}" fill="${fill}" stroke="#e2e8f0"/>` +
          `<rect x="${laneX}" y="40" width="260" height="36" fill="#eef2ff" stroke="#e2e8f0"/>` +
          `${text(laneX + 130, 58, group.label ?? group.id, 13, '#4338ca')}</g>`,
      );
    });
  } else {
    // draw outer groups first (bottom layer), inner groups on top —
    // otherwise an outer group's opaque fill hides the inner group's border
    const groupIds = new Set(doc.groups.map((g) => g.id));
    const parentOf = new Map<string, string>();
    for (const g of doc.groups) {
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
    const orderedGroups = [...doc.groups].sort((a, b) => depthOf(a.id) - depthOf(b.id));
    orderedGroups.forEach((group, i) => {
      const box = boxOf.get(group.id);
      if (!box) return;
      const fill = GROUP_FILLS[i % GROUP_FILLS.length];
      parts.push(
        `<g class="lgdl-group"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8" fill="${fill}" stroke="#d1d5db" stroke-dasharray="6 4"/>${text(box.x + 12, box.y + 18, group.label ?? group.id, 12, '#6b7280', 'start')}</g>`,
      );
    });
  }

  // state: initial pseudo-state — solid dot + arrow into the entry state
  if (initialId) {
    const initNode = layout.nodes.find((n) => n.id === initialId);
    if (initNode) {
      const cx = initNode.x + initNode.width / 2;
      const top = initNode.y;
      parts.push(
        `<g class="lgdl-initial"><circle cx="${cx}" cy="${top - 18}" r="6" fill="#111827"/>` +
          `<line x1="${cx}" y1="${top - 12}" x2="${cx}" y2="${top - 2}" stroke="#111827" stroke-width="1.5" marker-end="url(#arrowhead)"/></g>`,
      );
    }
  }

  // nodes (on top)
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
    if (!lgdlNode) continue;
    let nodeClass = 'lgdl-node';
    let stroke: string;
    if (mode === 'uml-class') {
      parts.push(renderClassNode(node, lgdlNode));
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
        `<g class="${nodeClass}" fill="${fill}" stroke="${stroke}" stroke-width="1.5">${shape.body(node.x, node.y, node.width, node.height)}${text(cx, cy, display, fontSize)}</g>`,
      );
    }
    // hover anchors: the node's 8 fixed border anchors, hidden until the
    // node is hovered (CSS sibling rule in the inline <style>). Reuses the
    // same shape geometry the edges snap to, so dots sit exactly under the
    // line endpoints.
    const shapeKind = shapeKindFor(lgdlNode.kind);
    const dots: string[] = [];
    for (let k = 0; k < 8; k++) {
      const th = (k * Math.PI) / 4;
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
  const nodeIdSet = new Set(doc.nodes.map((n) => n.id));
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
  for (const edge of doc.edges) {
    if (nodeIdSet.has(edge.from) && nodeIdSet.has(edge.to)) continue; // regular node edge
    const fromBox = nodeIdSet.has(edge.from) ? undefined : boxOf.get(edge.from);
    const toBox = nodeIdSet.has(edge.to) ? undefined : boxOf.get(edge.to);
    const fromCenter = centerOf(edge.from);
    const toCenter = centerOf(edge.to);
    // when both endpoints line up vertically (same column), offset the
    // anchors horizontally so the aggregate edge doesn't overlap node edges
    // running down that column
    const offsetX = Math.abs(toCenter.x - fromCenter.x) < 1 && Math.abs(toCenter.y - fromCenter.y) > 40 ? 40 : 0;
    // node endpoints anchor to the node's real shape border (same anchor
    // rules as regular edges); group endpoints stay on the group box border
    const nodeAnchor = (id: string, toward: { x: number; y: number }) => {
      const nb = layout.nodes.find((n) => n.id === id);
      if (!nb) return nodeCenter(id);
      const kind = shapeKindFor(doc.nodes.find((n) => n.id === id)?.kind);
      return shapeEdgePoint(kind, nb, toward);
    };
    const src = fromBox ? boxEdgePoint(fromBox, { x: toCenter.x + offsetX, y: toCenter.y }) : nodeAnchor(edge.from, { x: toCenter.x + offsetX, y: toCenter.y });
    const dst = toBox ? boxEdgePoint(toBox, { x: fromCenter.x + offsetX, y: fromCenter.y }) : nodeAnchor(edge.to, { x: fromCenter.x + offsetX, y: fromCenter.y });
    // push the target end slightly INTO the box so the arrowhead isn't
    // hidden behind the box border line
    // endpoints stay exactly ON the border anchors — the arrowhead tip
    // touches the group/node edge (same as regular node edges); no push
    // INTO the box, so lines never appear to pierce the shape
    const label = edge.label;
    let labelEl = '';
    if (label) {
      // keep the label readable: readable 11px font with a white backdrop,
      // centered on the segment (clamped to the canvas); never shrink to
      // tiny unreadable sizes even on very short segments
      const fontSize = 11;
      const w = label.length * fontSize;
      const x = Math.max(10 + w / 2, Math.min((src.x + dst.x) / 2, layout.width - 10 - w / 2));
      const y = (src.y + dst.y) / 2 - 4;
      const bgW = w + 8;
      const bgH = fontSize + 6;
      labelEl =
        `<rect x="${(x - bgW / 2).toFixed(1)}" y="${(y - bgH / 2).toFixed(1)}" width="${bgW}" height="${bgH}" rx="3" fill="#ffffff" opacity="0.9"/>` +
        text(x, y, label, fontSize, '#7c3aed');
    }
    parts.push(
      `<g class="lgdl-aggregate-edge"><line x1="${src.x}" y1="${src.y}" x2="${dst.x}" y2="${dst.y}" stroke="#7c3aed" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#arrowhead-purple)"/>${labelEl}</g>` +
        // hover the aggregate edge -> reveal its two endpoint anchors
        `<g class="lgdl-edge-anchors"><circle cx="${src.x.toFixed(1)}" cy="${src.y.toFixed(1)}" r="3.5" fill="#7c3aed"/><circle cx="${dst.x.toFixed(1)}" cy="${dst.y.toFixed(1)}" r="3.5" fill="#7c3aed"/></g>`,
    );
  }

  // edges (behind nodes)
  // placed node-edge labels, tracked so dense labels (e.g. state diagrams)
  // don't collide — conflicts are pushed to alternate rows
  const placedLabels: { x: number; y: number; w: number }[] = [];
  for (const edge of layout.edges) {
    const pts = edge.points.length > 0 ? edge.points : routeDefault(doc, edge.from, edge.to);
    // Snap both endpoints to the REAL shape border (dagre only trims to the
    // bounding rect — diamonds are empty near the rect corners, so lines
    // starting from a decision floated in blank space).
    const srcNode = layout.nodes.find((n) => n.id === edge.from);
    const dstNode = layout.nodes.find((n) => n.id === edge.to);
    const srcKind = shapeKindFor(doc.nodes.find((n) => n.id === edge.from)?.kind);
    const dstKind = shapeKindFor(doc.nodes.find((n) => n.id === edge.to)?.kind);
    const trimmed = [...pts];
    if (trimmed.length >= 2) {
      if (srcNode) trimmed[0] = shapeEdgePoint(srcKind, srcNode, trimmed[1]);
      if (dstNode) trimmed[trimmed.length - 1] = shapeEdgePoint(dstKind, dstNode, trimmed[trimmed.length - 2]);
    }
    const d = trimmed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const edgeDoc = doc.edges.find((e) => e.from === edge.from && e.to === edge.to);
    const label = edgeDoc?.label;
    let labelEl = '';
    if (label || edgeDoc?.cardinalityFrom !== undefined || edgeDoc?.cardinalityTo !== undefined) {
      // place label at midpoint of the longest segment
      let mid: { x: number; y: number } | null = null;
      for (let i = 0; i < trimmed.length - 1; i++) {
        const a = trimmed[i];
        const b = trimmed[i + 1];
        if (b.y > a.y || (b.y === a.y && Math.abs(b.x - a.x) > 30)) {
          mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          break;
        }
      }
      mid ??= { x: (trimmed[0].x + trimmed[trimmed.length - 1].x) / 2, y: (trimmed[0].y + trimmed[trimmed.length - 1].y) / 2 };
      // ER / UML multiplicities: explicit cardinalityFrom/To fields, rendered
      // near each endpoint; the label stays the pure relationship name.
      // No legacy label parsing — multiplicity must live in the fields.
      const wantsCards = mode === 'er' || mode === 'uml-class';
      if (wantsCards && (edgeDoc?.cardinalityFrom !== undefined || edgeDoc?.cardinalityTo !== undefined)) {
        const rel = label ?? '';
        const fromV = edgeDoc?.cardinalityFrom;
        const toV = edgeDoc?.cardinalityTo;
        const p0 = trimmed[0];
        const pn = trimmed[trimmed.length - 1];
        const ux = (pn.x - p0.x) / (Math.hypot(pn.x - p0.x, pn.y - p0.y) || 1);
        const uy = (pn.y - p0.y) / (Math.hypot(pn.x - p0.x, pn.y - p0.y) || 1);
        // anchor multiplicities 22px outside the entity borders so small
        // glyphs like "*" stay clearly readable next to the card edges
        const srcCard = { x: p0.x + ux * 22, y: p0.y + uy * 22 };
        const dstCard = { x: pn.x - ux * 22, y: pn.y - uy * 22 };
        let relEl = '';
        if (rel) {
          const { x, y } = placeLabel(mid.x, mid.y - 4, rel, placedLabels);
          relEl = text(x, y, rel, 12, '#6b7280');
        }
        labelEl =
          relEl +
          (fromV !== undefined ? text(srcCard.x, srcCard.y - 6, fromV, 12, '#b45309') : '') +
          (toV !== undefined ? text(dstCard.x, dstCard.y - 6, toV, 12, '#b45309') : '');
      } else {
        const { x, y } = placeLabel(mid.x, mid.y - 4, label ?? '', placedLabels);
        labelEl = text(x, y, label ?? '', 12, '#6b7280');
      }
    }
    parts.push(
      `<g class="lgdl-edge"><path d="${d}" fill="none" stroke="#6b7280" stroke-width="1.5" marker-end="url(#arrowhead)"/>${labelEl}</g>` +
        // hover the edge -> reveal the two anchors it connects to
        `<g class="lgdl-edge-anchors"><circle cx="${trimmed[0].x.toFixed(1)}" cy="${trimmed[0].y.toFixed(1)}" r="3.5" fill="#6b7280"/><circle cx="${trimmed[trimmed.length - 1].x.toFixed(1)}" cy="${trimmed[trimmed.length - 1].y.toFixed(1)}" r="3.5" fill="#6b7280"/></g>`,
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
  return [{ x: 0, y: 0 }, { x: 0, y: 0 }];
}

/**
 * Point where a ray from `toward` toward the box center crosses the box
 * border — used to anchor aggregate edges on group box boundaries.
 */
function boxEdgePoint(box: { x: number; y: number; w: number; h: number }, toward: { x: number; y: number }): { x: number; y: number } {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const tX = dx !== 0 ? box.w / 2 / Math.abs(dx) : Infinity;
  const tY = dy !== 0 ? box.h / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tX, tY);
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * Anchor point where a line from `p` attaches to the node's REAL shape
 * border. Two ideas combined:
 *  1. shape fidelity — dagre only trims endpoints to the bounding rect;
 *     diamonds are empty near the rect corners and cylinders are curved at
 *     top/bottom, so continuous intersection math is used per shape
 *     (diamond |dx|/(w/2) + |dy|/(h/2) = 1; cylinder straight sides plus
 *     elliptical arcs matching the renderer body)
 *  2. anchors — the approach direction is quantized to 8 fixed directions
 *     (every 45°), so lines attach to predictable, tidy anchor points on
 *     the shape border (rect: edge midpoints + corners; diamond: vertices
 *     + side midpoints; cylinder: arc top/bottom, arc shoulders, side
 *     midpoints). The DSL is untouched — this is purely a renderer concept.
 */
function shapeEdgePoint(
  kind: string,
  box: { x: number; y: number; width: number; height: number },
  p: { x: number; y: number },
): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  // quantize the approach direction to the nearest 45° anchor
  const angle = Math.atan2(dy, dx);
  const q = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const ux = Math.cos(q);
  const uy = Math.sin(q);
  if (kind === 'decision') {
    const t = 1 / (Math.abs(ux) / (box.width / 2) + Math.abs(uy) / (box.height / 2));
    return { x: cx + ux * t, y: cy + uy * t };
  }
  if (kind === 'entity') {
    // straight side region first: y' inside [topArcY, botArcY]
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
    // arc region: intersect with the elliptical arc centered 10px inside
    // the top/bottom edge; ((ux*t)/a)^2 + ((cy - ccy + uy*t)/r)^2 = 1
    const a = box.width / 2;
    const r = 10;
    const ccy = ySide < topArcY ? topArcY : botArcY;
    const dy0 = cy - ccy;
    const A = (ux / a) ** 2 + (uy / r) ** 2;
    const B = (2 * dy0 * uy) / (r * r);
    const C = (dy0 / r) ** 2 - 1;
    const disc = B * B - 4 * A * C;
    if (disc >= 0) {
      const t = (-B + Math.sqrt(disc)) / (2 * A); // exit intersection
      return { x: cx + ux * t, y: cy + uy * t };
    }
    return { x: cx + ux * tSide, y: cy + uy * tSide }; // fallback
  }
  const tX = ux !== 0 ? box.width / 2 / Math.abs(ux) : Infinity;
  const tY = uy !== 0 ? box.height / 2 / Math.abs(uy) : Infinity;
  const t = Math.min(tX, tY);
  return { x: cx + ux * t, y: cy + uy * t };
}

/**
 * UML class node: 3-section card (name / attributes / methods).
 *
 * Content comes from the structured `members` field (canonical):
 *   - `kind: attribute` members render in the middle section
 *   - `kind: method` members render in the bottom section
 *   - visibility maps to the UML symbol via VIS_SYMBOL (+ - # ~)
 * Nothing is parsed out of text — every row is an explicit field.
 * A node without members renders a name-only card (no legacy parsing).
 */
function renderClassNode(node: LayoutNodeLike, lgdlNode: { label?: string; id: string; members?: LgdlMember[] }): string {
  const { x, y, width, height } = node;

  const name = lgdlNode.label ?? lgdlNode.id;
  const attrs: string[] = [];
  const methods: string[] = [];
  for (const m of lgdlNode.members ?? []) {
    const vis = m.visibility ? VIS_SYMBOL[m.visibility] ?? '' : '';
    const line =
      m.kind === 'method'
        ? `${vis} ${m.name}${m.params ?? '()'}${m.type ? `: ${m.type}` : ''}`
        : `${vis} ${m.name}${m.type ? `: ${m.type}` : ''}`;
    (m.kind === 'method' ? methods : attrs).push(line);
  }

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
      parts.push(text(x + 10, cursorY + 16 + i * 18, a, 11, '#374151', 'start'));
    });
    cursorY += attrsH;
    parts.push(`<line x1="${x}" y1="${cursorY}" x2="${x + width}" y2="${cursorY}" stroke="#4f46e5" stroke-width="${border}"/>`);
  }

  if (methods.length > 0) {
    parts.push(
      `<rect x="${x}" y="${cursorY}" width="${width}" height="${methodsH}" fill="#ffffff" stroke="#4f46e5" stroke-width="${border}"/>`,
    );
    methods.forEach((m, i) => {
      parts.push(text(x + 10, cursorY + 16 + i * 18, m, 11, '#374151', 'start'));
    });
  }

  return `<g class="lgdl-class">${parts.join('')}</g>`;
}

/** Minimal structural type (avoids importing layout types into render). */
interface LayoutNodeLike {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Gantt chart renderer: time axis + task bars + dependency arrows. */
function renderGantt(doc: LgdlDocument, layout: LayoutResult): string {
  const parts: string[] = [];
  parts.push(
    `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/></marker></defs>`,
  );
  parts.push(`<rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>`);

  const barY = new Map<string, number>();
  layout.nodes.forEach((n) => barY.set(n.id, n.y));

  // dependencies first (behind bars)
  for (const edge of layout.edges) {
    const pts = edge.points;
    if (pts.length < 2) continue;
    const [a, b] = pts;
    // L-shaped connector: from end of source bar, right, then down to target
    const midX = Math.min(a.x + 20, b.x);
    parts.push(
      `<g class="lgdl-dep"><path d="M ${a.x},${a.y} L ${midX},${a.y} L ${midX},${b.y} L ${b.x},${b.y}" fill="none" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrowhead)"/></g>`,
    );
  }

  // task bars
  const labelColX = 40 + 220 - 12; // task names pinned to the left label column
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
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
    parts.push(
      `<g class="lgdl-gantt-bar"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="6" fill="#3b82f6" opacity="0.85"/>${barText}</g>`,
    );
  }

  // time axis header
  const labelW = 220;
  const colW = 40;
  const axisX = 40 + labelW;
  const axisY = 40;
  const maxDay = Math.floor((layout.width - 40 - labelW) / colW);
  parts.push(
    `<g class="lgdl-gantt-axis"><rect x="${axisX}" y="${axisY}" width="${maxDay * colW}" height="40" fill="#f1f5f9" stroke="#e2e8f0"/>`,
  );
  for (let d = 0; d < maxDay; d++) {
    parts.push(text(axisX + d * colW + colW / 2, axisY + 20, `D${d}`, 10, '#64748b'));
  }
  parts.push('</g>');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}
export { renderAscii } from './ascii.js';
