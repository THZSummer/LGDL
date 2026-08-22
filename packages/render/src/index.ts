/**
 * LGDL SVG renderer.
 *
 * Takes a LayoutResult + LgdlDocument and produces clean SVG markup.
 * Shapes are mapped from node kinds; a theme can be swapped later.
 */
import type { LgdlDocument, LgdlGroup } from '@lgdl/core';
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
    case 'flowchart':
    case 'arch':
    case 'state':
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

  // participant headers
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    parts.push(
      `<g class="lgdl-participant" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5">${rect(node.x, node.y, node.width, node.height, 8)}${text(cx, cy, lgdlNode?.label ?? node.id, 13, '#1e40af')}</g>`,
    );
  }

  // messages (horizontal arrows with labels)
  for (const edge of layout.edges) {
    const pts = edge.points;
    if (pts.length < 2) continue;
    const [a, b] = pts;
    const label = doc.edges.find((e) => e.from === edge.from && e.to === edge.to)?.label;
    const isLeft = a.x > b.x;
    parts.push(
      `<g class="lgdl-message"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrowhead)"/>${label ? text((a.x + b.x) / 2, a.y - 8, label, 12, '#374151') : ''}</g>`,
    );
    // self-call loop hint (same participant)
    void isLeft;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">${parts.join('')}</svg>`;
}

/** General renderer (flowchart/mindmap/arch/datastream), with optional class-node styling. */
function renderGeneral(doc: LgdlDocument, layout: LayoutResult, mode: 'default' | 'uml-class' | 'datastream' | 'er'): string {
  const parts: string[] = [];

  // defs: arrowhead markers (gray for node edges, purple for aggregate edges)
  parts.push(
    `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#6b7280"/></marker>` +
      `<marker id="arrowhead-purple" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#7c3aed"/></marker></defs>`,
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
      parts.push(
        `<g class="lgdl-lane"><rect x="${laneX}" y="40" width="260" height="${layout.height - 40}" fill="#f8fafc" stroke="#e2e8f0"/>` +
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
    for (const group of orderedGroups) {
      const box = boxOf.get(group.id);
      if (!box) continue;
      parts.push(
        `<g class="lgdl-group"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8" fill="#f9fafb" stroke="#d1d5db" stroke-dasharray="6 4"/>${text(box.x + 12, box.y + 18, group.label ?? group.id, 12, '#6b7280', 'start')}</g>`,
      );
    }
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
    const src = fromBox ? boxEdgePoint(fromBox, { x: toCenter.x + offsetX, y: toCenter.y }) : nodeCenter(edge.from);
    const dst = toBox ? boxEdgePoint(toBox, { x: fromCenter.x + offsetX, y: fromCenter.y }) : nodeCenter(edge.to);
    // push the target end slightly INTO the box so the arrowhead isn't
    // hidden behind the box border line
    let dstIn = dst;
    if (toBox) {
      const cx = toBox.x + toBox.w / 2;
      const cy = toBox.y + toBox.h / 2;
      const dx = cx - dst.x;
      const dy = cy - dst.y;
      const len = Math.hypot(dx, dy) || 1;
      dstIn = { x: dst.x + (dx / len) * 8, y: dst.y + (dy / len) * 8 };
    }
    const label = edge.label;
    let labelEl = '';
    if (label) {
      const labelW = label.length * 12;
      const segMinX = Math.min(src.x, dst.x);
      const segMaxX = Math.max(src.x, dst.x);
      const segLen = segMaxX - segMinX;
      // shrink the font when the segment is too short for the label
      const fontSize = segLen >= labelW + 16 ? 12 : segLen >= labelW * 0.9 ? 10 : 8;
      const w = label.length * fontSize;
      const midX = Math.max(segMinX + 4, Math.min((src.x + dst.x) / 2, segMaxX - 4 - w));
      const clampedX = Math.max(10, Math.min(midX, layout.width - 10 - w));
      labelEl = text(clampedX, (src.y + dst.y) / 2 - 4, label, fontSize, '#7c3aed');
    }
    parts.push(
      `<g class="lgdl-aggregate-edge"><line x1="${src.x}" y1="${src.y}" x2="${dstIn.x}" y2="${dstIn.y}" stroke="#7c3aed" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#arrowhead-purple)"/>${labelEl}</g>`,
    );
  }

  // edges (behind nodes)
  for (const edge of layout.edges) {
    const pts = edge.points.length > 0 ? edge.points : routeDefault(doc, edge.from, edge.to);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const label = doc.edges.find((e) => e.from === edge.from && e.to === edge.to)?.label;
    let labelEl = '';
    if (label) {
      // place label at midpoint of the longest segment
      let mid: { x: number; y: number } | null = null;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        if (b.y > a.y || (b.y === a.y && Math.abs(b.x - a.x) > 30)) {
          mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          break;
        }
      }
      mid ??= { x: (pts[0].x + pts[pts.length - 1].x) / 2, y: (pts[0].y + pts[pts.length - 1].y) / 2 };
      labelEl = text(mid.x, mid.y - 4, label, 12, '#6b7280');
    }
    parts.push(
      `<g class="lgdl-edge"><path d="${d}" fill="none" stroke="#6b7280" stroke-width="1.5" marker-end="url(#arrowhead)"/>${labelEl}</g>`,
    );
  }

  // nodes (on top)
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
    if (!lgdlNode) continue;
    if (mode === 'uml-class') {
      parts.push(renderClassNode(node, lgdlNode));
      continue;
    }
    const kind = lgdlNode.kind ?? 'process';
    const shape = SHAPES[kind] ?? SHAPES.process;
    const fill = FILL_BY_KIND[kind] ?? FILL_BY_KIND.process;
    const stroke = STROKE_BY_KIND[kind] ?? STROKE_BY_KIND.process;
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    parts.push(
      `<g class="lgdl-node" fill="${fill}" stroke="${stroke}" stroke-width="1.5">${shape.body(node.x, node.y, node.width, node.height)}${text(cx, cy, lgdlNode.label ?? lgdlNode.id, 13)}</g>`,
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
 * UML class node: 3-section card (name / attributes / methods).
 * The node label uses newlines: first line = class name, following lines
 * are members. `+` = public, `-` = private, `#` = protected.
 */
function renderClassNode(node: LayoutNodeLike, lgdlNode: { label?: string; id: string }): string {
  const { x, y, width, height } = node;
  const raw = lgdlNode.label ?? lgdlNode.id;
  const lines = raw.split('\n');
  const name = lines[0];
  const members = lines.slice(1);

  // split members into attributes vs methods (contains '(')
  const attrs = members.filter((m) => !m.includes('('));
  const methods = members.filter((m) => m.includes('('));

  const headerH = 32;
  const attrsH = attrs.length * 18 + (attrs.length > 0 ? 8 : 0);
  const methodsH = methods.length * 18 + (methods.length > 0 ? 8 : 0);
  const border = 1.5;

  const parts: string[] = [];
  // header
  parts.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${headerH}" fill="#eef2ff" stroke="#4f46e5" stroke-width="${border}"/>`,
  );
  parts.push(text(x + width / 2, y + headerH / 2, name, 13, '#312e81'));
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
  for (const node of layout.nodes) {
    const lgdlNode = doc.nodes.find((n) => n.id === node.id);
    const start = typeof lgdlNode?.attrs?.start === 'number' ? lgdlNode.attrs.start : 0;
    const dur = typeof lgdlNode?.attrs?.duration === 'number' ? lgdlNode.attrs.duration : 1;
    const label = lgdlNode?.label ?? node.id;
    const cy = node.y + node.height / 2;
    // left label
    parts.push(text(node.x - 12, cy, label, 12, '#374151', 'end'));
    // bar
    parts.push(
      `<g class="lgdl-gantt-bar"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="6" fill="#3b82f6" opacity="0.85"/>${text(node.x + node.width / 2, cy, `${start}d +${dur}d`, 11, '#ffffff')}</g>`,
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
