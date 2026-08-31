/**
 * LGDL ASCII renderer.
 *
 * Maps layout coordinates (pixels) onto a character grid and draws the
 * diagram with box-drawing characters, so graphs can be shown in plain
 * text (terminals, CI logs, code comments, image-less environments).
 * CJK characters occupy 2 grid columns (full-width).
 */
import type { LgdlDocument, LgdlGroup } from '@lgdl/lgdl-core';
import { deriveGroups } from '@lgdl/lgdl-core';
import type { LayoutResult } from '@lgdl/lgdl-layout';

/** Visual width of a character: CJK/full-width = 2, ASCII = 1. */
function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  // CJK, full-width forms, etc.
  if (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK Radicals..Yi
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6)
  ) {
    return 2;
  }
  return 1;
}

/** Total visual width of a string. */
function strWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += charWidth(ch);
  return w;
}

/**
 * Character grid.
 *
 * Cells hold '' (never written), a printable char, or the CJK gap marker
 * '\u0001' (the second display column of a full-width char — invisible).
 * toString renders '' as a space so untouched areas stay readable, and the
 * gap marker as '' so full-width chars keep their 2-column span.
 */
class Grid {
  cols: number;
  rows: number;
  private cells: string[][];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = Array.from({ length: rows }, () => Array(cols).fill(''));
  }

  /**
   * Put a string starting at (col, row).
   * CJK cells store the char in one cell but advance 2 columns — the
   * gap cell is marked invisible so the terminal renders the wide char once.
   */
  put(col: number, row: number, text: string): void {
    let c = col;
    for (const ch of text) {
      if (c >= this.cols || row >= this.rows) break;
      this.cells[row][c] = ch;
      const w = charWidth(ch);
      if (w === 2) {
        // full-width char occupies 2 columns: mark the 2nd column invisible
        if (c + 1 < this.cols) this.cells[row][c + 1] = GAP;
        c += 2;
      } else {
        c += 1;
      }
    }
  }

  /** Overwrite a single cell (used for edges over boxes etc). */
  set(col: number, row: number, ch: string): void {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.cells[row][col] = ch;
    }
  }

  get(col: number, row: number): string {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) return this.cells[row][col];
    return ' ';
  }

  toString(): string {
    // render unset cells as spaces (readable), CJK gap cells as nothing,
    // then trim trailing spaces per line
    return this.cells
      .map((rowArr) =>
        rowArr
          .map((c) => (c === GAP ? '' : c === '' ? ' ' : c))
          .join('')
          .replace(/ +$/, ''),
      )
      .join('\n');
  }
}

/** Marker for the invisible second column of a full-width char. */
const GAP = '\u0001';

/**
 * Write an edge label into a connector row starting at `col`, stopping at
 * `width`. CJK chars occupy 2 columns (second column marked GAP) so labels
 * line up like the box text does.
 */
function putLabel(row: string[], start: number, width: number, text: string): void {
  let col = start;
  for (const ch of text) {
    const w = charWidth(ch);
    if (col + w > width) break;
    row[col] = ch;
    if (w === 2 && col + 1 < width) row[col + 1] = GAP;
    col += w;
  }
}

/** Join a connector row, hiding CJK gap markers and trimming trailing spaces. */
function rowToString(row: string[]): string {
  return row.map((c) => (c === GAP ? '' : c)).join('').replace(/ +$/, '');
}

/**
 * Box-drawing helpers. Coordinates are in char-grid units.
 * A box spans [x, x+w) columns and [y, y+h) rows.
 */
const BOX = {
  tl: '┌', tr: '┐', bl: '└', br: '┘',
  h: '─', v: '│',
  tlR: '╭', trR: '╮', blR: '╰', brR: '╯', // rounded (start/end)
};

/** Draw a box outline onto the grid. */
function drawBox(g: Grid, x: number, y: number, w: number, h: number, rounded = false): void {
  const tl = rounded ? BOX.tlR : BOX.tl;
  const tr = rounded ? BOX.trR : BOX.tr;
  const bl = rounded ? BOX.blR : BOX.bl;
  const br = rounded ? BOX.brR : BOX.br;
  g.set(x, y, tl);
  g.set(x + w - 1, y, tr);
  g.set(x, y + h - 1, bl);
  g.set(x + w - 1, y + h - 1, br);
  for (let c = x + 1; c < x + w - 1; c++) {
    g.set(c, y, BOX.h);
    g.set(c, y + h - 1, BOX.h);
  }
  for (let r = y + 1; r < y + h - 1; r++) {
    g.set(x, r, BOX.v);
    g.set(x + w - 1, r, BOX.v);
  }
}

/** Render an LGDL document as ASCII art.
 *
 * Layered (rank-based) layout: nodes are ordered by BFS rank, placed
 * top-down, connected with vertical lines. CJK labels align naturally
 * because we use display widths throughout. Groups (including nested
 * groups) are drawn as dashed-style boxes around their members.
 */
export function renderAscii(doc: LgdlDocument, layout: LayoutResult): string {
  void layout;
  const groups = deriveGroups(doc);
  // group boxes are containers drawn around their members (see overlayGroupBoxes),
  // never ordinary boxes on the rank grid
  const nodes = doc.nodes.filter((n) => n.kind !== 'group');
  // ---- BFS ranks ----
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
  const roots = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  const rankOf = new Map<string, number>();
  const queue: string[] = [];
  for (const r of roots) { rankOf.set(r.id, 0); queue.push(r.id); }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curRank = rankOf.get(cur) ?? 0;
    for (const c of children.get(cur) ?? []) {
      const next = Math.max(rankOf.get(c) ?? 0, curRank + 1);
      if (next > (rankOf.get(c) ?? -1)) { rankOf.set(c, next); queue.push(c); }
    }
  }
  for (const n of nodes) if (!rankOf.has(n.id)) rankOf.set(n.id, 0);
  const maxRank = Math.max(0, ...rankOf.values());
  const ranks: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const n of nodes) ranks[rankOf.get(n.id) ?? 0].push(n.id);

  // ---- box building ----
  const boxLines = (id: string): { top: string; mid: string; bot: string; w: number } => {
    const n = doc.nodes.find((x) => x.id === id)!;
    const label = n.label ?? n.id;
    const labelW = strWidth(label);
    const w = labelW + 4;
    const kind = n.kind ?? 'process';
    // mindmap: no branching/terminal shapes — every node is a plain box
    const isMindmap = doc.type === 'mindmap';
    const rounded = !isMindmap && (kind === 'start' || kind === 'end');
    const isDecision = !isMindmap && kind === 'decision';
    const tl = rounded ? BOX.tlR : BOX.tl;
    const tr = rounded ? BOX.trR : BOX.tr;
    const bl = rounded ? BOX.blR : BOX.bl;
    const br = rounded ? BOX.brR : BOX.br;
    const leftPad = 2;
    const rightPad = Math.max(0, w - leftPad - labelW - 1);
    let top: string, mid: string, bot: string;
    if (isDecision) {
      top = '<' + BOX.h.repeat(w - 2) + '>';
      mid = BOX.v + ' '.repeat(leftPad) + label + ' '.repeat(rightPad) + BOX.v;
      bot = '<' + BOX.h.repeat(w - 2) + '>';
    } else {
      top = tl + BOX.h.repeat(w - 2) + tr;
      mid = BOX.v + ' '.repeat(leftPad) + label + ' '.repeat(rightPad) + BOX.v;
      bot = bl + BOX.h.repeat(w - 2) + br;
    }
    return { top, mid, bot, w };
  };

  // ---- group bands ----
  // Each top-level group gets its own column band so sibling group boxes
  // never overlap; ungrouped nodes share the leftmost band. Nested groups
  // inherit their top-level parent's band.
  const nodeGap = groups.length > 0 ? 4 : 2;
  const parentOf = new Map<string, string>();
  for (const g of groups) {
    for (const m of g.contains) {
      if (!parentOf.has(m)) parentOf.set(m, g.id);
    }
  }
  const topOf = (id: string): string | null => {
    let cur = parentOf.get(id);
    const seen = new Set<string>();
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      const next = parentOf.get(cur);
      if (next === undefined) return cur;
      cur = next;
    }
    return cur ?? null;
  };
  const topGroupOf = new Map<string, string>();
  for (const n of nodes) {
    const t = topOf(n.id);
    if (t !== null) topGroupOf.set(n.id, t);
  }
  const topGroups = groups.filter((g) => !parentOf.has(g.id)).map((g) => g.id);
  const bandIndexOf = new Map<string, number>();
  topGroups.forEach((gid, i) => bandIndexOf.set(gid, i));
  const bandOf = (id: string): number => {
    const t = topGroupOf.get(id);
    return t === undefined ? -1 : (bandIndexOf.get(t) ?? -1);
  };
  // band width = max over ranks of (sum of member box widths in that rank)
  const bandWidths = new Map<number, number>();
  for (const ids of ranks) {
    const perBand = new Map<number, number>();
    for (const id of ids) {
      const b = bandOf(id);
      perBand.set(b, (perBand.get(b) ?? 0) + boxLines(id).w + nodeGap);
    }
    for (const [b, w] of perBand) {
      bandWidths.set(b, Math.max(bandWidths.get(b) ?? 0, w));
    }
  }
  // ungrouped band (-1) sits leftmost; groups follow in doc order
  const bandOffset = new Map<number, number>();
  {
    let offset = 0;
    const sortedBands = [...bandWidths.keys()].sort((a, b) => (a === -1 ? -1 : a) - (b === -1 ? -1 : b));
    for (const b of sortedBands) {
      bandOffset.set(b, offset);
      offset += (bandWidths.get(b) ?? 0) + 2;
    }
  }
  const orderByBand = (ids: string[]): string[] => [...ids].sort((a, b) => bandOf(a) - bandOf(b));

  // ---- pass 1: compute center col for every node (all ranks) ----
  const centerOf = new Map<string, number>();
  for (const ids of ranks) {
    let col = 0;
    for (const id of orderByBand(ids)) {
      const b = boxLines(id);
      col = Math.max(col, bandOffset.get(bandOf(id)) ?? 0);
      centerOf.set(id, col + Math.floor(b.w / 2));
      col += b.w + nodeGap;
    }
  }

  // ---- pass 2: compose lines ----
  const lines: string[] = [];
  // edges that skip one or more ranks are not drawn — count them so the
  // output can tell the reader the graph is incomplete
  let skippedCrossLevel = 0;
  // grid-space box of every node box (top = row of its top border)
  const nodeBoxes = new Map<string, { left: number; top: number; width: number; height: number }>();
  for (let ri = 0; ri < ranks.length; ri++) {
    const ids = orderByBand(ranks[ri]);
    let topLine = '';
    let midLine = '';
    let botLine = '';
    let col = 0;
    for (const id of ids) {
      const b = boxLines(id);
      col = Math.max(col, bandOffset.get(bandOf(id)) ?? 0);
      nodeBoxes.set(id, { left: col, top: lines.length, width: b.w, height: 3 });
      topLine = padToW(topLine, col) + b.top;
      midLine = padToW(midLine, col) + b.mid;
      botLine = padToW(botLine, col) + b.bot;
      col += b.w + nodeGap;
    }
    lines.push(topLine);
    lines.push(midLine);
    lines.push(botLine);

    if (ri < ranks.length - 1) {
      skippedCrossLevel += doc.edges.filter(
        (e) => (rankOf.get(e.from) ?? 0) === ri && (rankOf.get(e.to) ?? 0) > ri + 1,
      ).length;
      const downEdges = doc.edges.filter((e) => (rankOf.get(e.from) ?? 0) === ri && (rankOf.get(e.to) ?? 0) === ri + 1);
      const targetsBySource = new Map<string, string[]>();
      for (const e of downEdges) {
        if (!targetsBySource.has(e.from)) targetsBySource.set(e.from, []);
        targetsBySource.get(e.from)!.push(e.to);
      }
      const width = Math.max(
        maxW(lines),
        ...ranks[ri].map((id) => (centerOf.get(id) ?? 0) + 1),
        ...ranks[ri + 1].map((id) => (centerOf.get(id) ?? 0) + 1),
        // connector rows must be wide enough for the edge labels too —
        // otherwise labels on single-column chains get truncated
        ...downEdges.map((e) =>
          e.label ? (centerOf.get(e.from) ?? 0) + 2 + strWidth(e.label) : 0,
        ),
      );
      const hasFork = [...targetsBySource.values()].some((ts) => ts.length > 1);
      const hasCrossCol = [...targetsBySource.entries()].some(([f, ts]) =>
        ts.some((t) => (centerOf.get(f) ?? 0) !== (centerOf.get(t) ?? 0)),
      );

      if (!hasFork && !hasCrossCol) {
        // one connector row: source pipes + target arrows + labels
        const conn = blank(width);
        for (const id of ids) {
          const c = centerOf.get(id) ?? 0;
          if (c < width) conn[c] = '│';
        }
        for (const id of ranks[ri + 1]) {
          const c = centerOf.get(id) ?? 0;
          if (c < width) conn[c] = '▼';
        }
        for (const e of downEdges) {
          if (e.label) {
            const fromC = centerOf.get(e.from) ?? 0;
            putLabel(conn, fromC + 2, width, e.label);
          }
        }
        lines.push(rowToString(conn));
      } else {
        // two rows: row1 = trunks + horizontal branches, row2 = drops + arrows.
        // Handles forks (one source -> many targets) and cross-column edges
        // (group bands move targets to other columns).
        const row1 = blank(width);
        const row2 = blank(width);
        for (const id of ids) {
          const c = centerOf.get(id) ?? 0;
          if (c < width) row1[c] = '│';
        }
        for (const id of ranks[ri + 1]) {
          const c = centerOf.get(id) ?? 0;
          if (c < width) row2[c] = '▼';
        }
        // cross-column targets: their ▼ sits on the branch row (row1) so it
        // never collides with group labels on the row2 border; clear row2
        const crossTargets = new Set<string>();
        for (const [fromId, toIds] of targetsBySource) {
          const srcC = centerOf.get(fromId) ?? 0;
          for (const t of toIds) {
            if ((centerOf.get(t) ?? 0) !== srcC) crossTargets.add(t);
          }
        }
        for (const t of crossTargets) {
          const tc = centerOf.get(t) ?? 0;
          if (tc < width) row2[tc] = ' ';
        }
        for (const [fromId, toIds] of targetsBySource) {
          const srcC = centerOf.get(fromId) ?? 0;
          const cross = toIds.filter((t) => (centerOf.get(t) ?? 0) !== srcC);
          const same = toIds.filter((t) => (centerOf.get(t) ?? 0) === srcC);
          if (cross.length === 0) continue; // pure vertical trunk
          const cols = cross.map((t) => centerOf.get(t) ?? 0);
          const minC = Math.min(srcC, ...cols);
          const maxC = Math.max(srcC, ...cols);
          for (let c = minC; c <= maxC; c++) {
            if (row1[c] === ' ' || row1[c] === '─') row1[c] = '─';
          }
          // source junction: trunk from above + branch directions
          row1[srcC] = junction(true, same.length > 0, minC < srcC, maxC > srcC);
          // target: the ▼ arrow on the branch row marks the drop
          for (const t of cross) {
            const tc = centerOf.get(t) ?? 0;
            if (tc !== srcC) row1[tc] = '▼';
          }
          // edge labels along each branch, skipping cells already used
          for (const t of cross) {
            const tc = centerOf.get(t) ?? 0;
            if (tc === srcC) continue;
            const e = downEdges.find((x) => x.from === fromId && x.to === t);
            if (!e || !e.label) continue;
            const label = e.label;
            const lo = Math.min(srcC, tc) + 1;
            const hi = Math.max(srcC, tc);
            for (let start = lo; start + label.length <= hi; start++) {
              let free = true;
              for (let k = 0; k < label.length; k++) {
                if (row1[start + k] !== ' ' && row1[start + k] !== '─') { free = false; break; }
              }
              if (free) {
                for (let k = 0; k < label.length; k++) row1[start + k] = label[k];
                break;
              }
            }
          }
        }
        lines.push(row1.join('').replace(/ +$/, ''));

        // trunk-edge labels (source -> target at same column): right of ▼
        for (const [fromId, toIds] of targetsBySource) {
          const srcC = centerOf.get(fromId) ?? 0;
          for (const t of toIds) {
            const tc = centerOf.get(t) ?? 0;
            if (tc !== srcC) continue;
            const e = downEdges.find((x) => x.from === fromId && x.to === t);
            if (e && e.label) {
              putLabel(row2, srcC + 2, width, e.label);
            }
          }
        }
        lines.push(rowToString(row2));
      }
    }
  }

  // ---- groups: draw boxes around members (nested groups supported) ----
  const finalLines = groups.length > 0 && nodeBoxes.size > 0
    ? overlayGroupBoxes(lines, doc, nodeBoxes)
    : lines.join('\n');
  // tell the reader when the topology is incomplete
  return skippedCrossLevel > 0
    ? `${finalLines}\n# ${skippedCrossLevel} cross-level edge(s) skipped — use SVG or \`status\` for the full graph`
    : finalLines;

  function padToW(s: string, w: number): string {
    const cur = strWidth(s);
    return cur >= w ? s : s + ' '.repeat(w - cur);
  }
  function maxW(ls: string[]): number {
    return Math.max(1, ...ls.map((l) => strWidth(l)));
  }
  function blank(w: number): string[] {
    return Array.from({ length: w }, () => ' ');
  }
}

interface GroupBox {
  left: number;
  top: number;
  right: number;
  bot: number;
}

/**
 * Overlay group boxes onto the composed line art.
 *
 * Group boxes are computed bottom-up (subgroups first) so an outer box
 * always encloses its nested subgroup boxes with padding. The line art is
 * copied into a Grid, shifted to make room for the outer borders, and the
 * borders are merged with any connectors they cross (┼ at crossings).
 */
function overlayGroupBoxes(
  lines: string[],
  doc: LgdlDocument,
  nodeBoxes: Map<string, { left: number; top: number; width: number; height: number }>,
): string {
  const groups = deriveGroups(doc);
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const memo = new Map<string, GroupBox | null>();

  const compute = (g: LgdlGroup): GroupBox | null => {
    if (memo.has(g.id)) return memo.get(g.id)!;
    memo.set(g.id, null); // cycle guard (validation already rejects cycles)
    const xs: number[] = [];
    const ys: number[] = [];
    const xe: number[] = [];
    const ye: number[] = [];
    for (const m of g.contains ?? []) {
      const nb = nodeBoxes.get(m);
      if (nb) {
        xs.push(nb.left);
        ys.push(nb.top);
        xe.push(nb.left + nb.width - 1);
        ye.push(nb.top + nb.height - 1);
        continue;
      }
      const sg = groupById.get(m);
      if (sg) {
        const sb = compute(sg);
        if (sb) {
          xs.push(sb.left);
          ys.push(sb.top);
          xe.push(sb.right);
          ye.push(sb.bot);
        }
      }
    }
    if (xs.length === 0) return null;
    const box: GroupBox = {
      left: Math.min(...xs) - 2,
      top: Math.min(...ys) - 1,
      right: Math.max(...xe) + 2,
      bot: Math.max(...ye) + 1,
    };
    memo.set(g.id, box);
    return box;
  };

  const boxes: { id: string; label: string; box: GroupBox }[] = [];
  for (const g of groups) {
    const b = compute(g);
    if (b) boxes.push({ id: g.id, label: g.label ?? g.id, box: b });
  }
  if (boxes.length === 0) return lines.join('\n');

  // outer boxes first (bottom layer), inner on top — keeps nested borders
  // readable even when a connector crosses multiple borders
  const parentOf = new Map<string, string>();
  const groupIds = new Set(groups.map((g) => g.id));
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
  boxes.sort((a, b) => depthOf(a.id) - depthOf(b.id));

  // shift the whole drawing so every box has room on all sides
  const minLeft = Math.min(...boxes.map((b) => b.box.left));
  const minTop = Math.min(...boxes.map((b) => b.box.top));
  const maxRight = Math.max(...boxes.map((b) => b.box.right));
  const maxBot = Math.max(...boxes.map((b) => b.box.bot));
  const dx = Math.max(0, -minLeft);
  const dy = Math.max(0, -minTop);
  const maxW = Math.max(1, ...lines.map((l) => strWidth(l)));
  // grid must be wide/tall enough for the outermost box borders
  const cols = Math.max(maxW + dx + 2, maxRight + dx + 1);
  const rows = Math.max(lines.length + dy + 1, maxBot + dy + 1);
  const grid = new Grid(cols, rows);
  for (let r = 0; r < lines.length; r++) {
    grid.put(dx, r + dy, lines[r]);
  }

  for (const { label, box } of boxes) {
    const left = box.left + dx;
    const right = box.right + dx;
    const top = box.top + dy;
    const bot = box.bot + dy;
    for (let c = left; c <= right; c++) setBorder(grid, c, top, '─');
    for (let c = left; c <= right; c++) setBorder(grid, c, bot, '─');
    for (let r = top; r <= bot; r++) {
      setBorder(grid, left, r, '│');
      setBorder(grid, right, r, '│');
    }
    // corners: merge with a wall continuing above/below so adjacent sibling
    // boxes sharing a border row join cleanly (├/┤); never merge with
    // connector lines running through the corner
    grid.set(left, top, cornerChar(grid, left, top, 'tl'));
    grid.set(right, top, cornerChar(grid, right, top, 'tr'));
    grid.set(left, bot, cornerChar(grid, left, bot, 'bl'));
    grid.set(right, bot, cornerChar(grid, right, bot, 'br'));
    // group label sits on the top border, after the corner
    const labelStart = left + 2;
    const avail = right - labelStart;
    if (avail > 0) {
      const clipped = clipToWidth(label, avail);
      if (clipped.length > 0) grid.put(labelStart, top, clipped);
    }
  }

  // aggregate edges (one or both endpoints is a group): draw a connector
  // between the two group/node boxes with an arrow at the target
  drawAggregateEdges(grid, doc, nodeBoxes, boxes, dx, dy);

  return grid.toString();
}

/**
 * Draw aggregate edges (group <-> node / group <-> group) onto the grid.
 * The dominant direction (horizontal when the boxes sit side by side,
 * vertical when stacked) picks a straight connector between the box
 * borders, ending with ▶ / ◀ / ▼ at the target.
 */
function drawAggregateEdges(
  g: Grid,
  doc: LgdlDocument,
  nodeBoxes: Map<string, { left: number; top: number; width: number; height: number }>,
  boxes: { id: string; box: GroupBox }[],
  dx: number,
  dy: number,
): void {
  const nodeIds = new Set(doc.nodes.filter((n) => n.kind !== 'group').map((n) => n.id));
  const boxById = new Map(boxes.map((b) => [b.id, b.box]));
  for (const edge of doc.edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) continue; // node edge
    const srcBox = nodeIds.has(edge.from) ? null : boxById.get(edge.from);
    const dstBox = nodeIds.has(edge.to) ? null : boxById.get(edge.to);
    const srcNb = nodeBoxes.get(edge.from);
    const dstNb = nodeBoxes.get(edge.to);
    // grid-space centers of both endpoints
    const srcC = srcBox ? (srcBox.left + dx + srcBox.right + dx) / 2 : (srcNb ? srcNb.left + dx + srcNb.width / 2 : 0);
    const srcR = srcBox ? (srcBox.top + dy + srcBox.bot + dy) / 2 : (srcNb ? srcNb.top + dy + 1.5 : 0);
    const dstC = dstBox ? (dstBox.left + dx + dstBox.right + dx) / 2 : (dstNb ? dstNb.left + dx + dstNb.width / 2 : 0);
    const dstR = dstBox ? (dstBox.top + dy + dstBox.bot + dy) / 2 : (dstNb ? dstNb.top + dy + 1.5 : 0);
    // side-by-side boxes (overlapping row ranges) get a horizontal connector;
    // stacked boxes get a vertical one
    const rowsOverlap =
      srcBox && dstBox
        ? srcBox.top <= dstBox.bot && dstBox.top <= srcBox.bot
        : Math.abs(dstR - srcR) < 2;
    const horizontal = rowsOverlap;

    if (horizontal) {
      // side-to-side connector between the two boxes' facing borders
      const row = Math.round((srcR + dstR) / 2);
      const c1 = srcBox ? srcBox.right + dx + 1 : (srcNb ? srcNb.left + dx + srcNb.width : 0);
      const c2 = dstBox ? dstBox.left + dx - 1 : (dstNb ? dstNb.left + dx - 1 : 0);
      const from = Math.min(c1, c2);
      const to = Math.max(c1, c2);
      for (let c = from; c <= to; c++) {
        const cur = g.get(c, row);
        g.set(c, row, cur === '│' || cur === '┼' ? '┼' : '─');
      }
      g.set(dstC >= srcC ? to : from, row, dstC >= srcC ? '▶' : '◀');
    } else {
      // top-down connector between bottom of source and top of target.
      // Vertical line runs on the TARGET's center column so it never lands
      // on the target box label (which starts at the box's left edge).
      const goingDown = dstR >= srcR;
      const col = Math.round(dstC);
      // start one cell outside the source box, end one cell outside the target box
      const r1 = srcBox
        ? (goingDown ? srcBox.bot + dy + 1 : srcBox.top + dy - 1)
        : (srcNb ? (goingDown ? srcNb.top + dy + srcNb.height : srcNb.top + dy - 1) : 0);
      const r2 = dstBox
        ? (goingDown ? dstBox.top + dy - 1 : dstBox.bot + dy + 1)
        : (dstNb ? (goingDown ? dstNb.top + dy - 1 : dstNb.top + dy + dstNb.height) : 0);
      const from = Math.min(r1, r2);
      const to = Math.max(r1, r2);
      for (let r = from; r <= to; r++) {
        const cur = g.get(col, r);
        g.set(col, r, cur === '─' || cur === '┌' || cur === '┐' || cur === '└' || cur === '┘' ? '┼' : '│');
      }
      // arrow sits just outside the target box border (never on its label)
      g.set(col, r2, goingDown ? '▼' : '▲');
    }
  }
}

/** Place a group border char.
 *
 * Borders are drawn UNDER connectors: where a connector line or arrow
 * already occupies the cell, the border gives way (breaks), so edges read
 * as passing over the box border (matching the SVG dashed-box look).
 */
function setBorder(g: Grid, col: number, row: number, ch: '─' | '│'): void {
  const cur = g.get(col, row);
  if (ch === '─') {
    if (cur === ' ' || cur === '' || cur === '─') g.set(col, row, '─');
  } else {
    if (cur === ' ' || cur === '' || cur === '│') g.set(col, row, '│');
  }
}

function connectsV(ch: string): boolean {
  return ['│', '┬', '┴', '├', '┤', '┼', '┌', '┐', '└', '┘', '╭', '╮', '╰', '╯', '▼', '▲'].includes(ch);
}

/** Box-drawing char for a set of connections (up/down/left/right). */
function junction(up: boolean, down: boolean, left: boolean, right: boolean): string {
  if (up && down && left && right) return '┼';
  if (down && left && right) return '┬';
  if (up && left && right) return '┴';
  if (up && down && right) return '├';
  if (up && down && left) return '┤';
  if (up && down) return '│';
  if (left && right) return '─';
  if (down && right) return '┌';
  if (down && left) return '┐';
  if (up && right) return '└';
  if (up && left) return '┘';
  if (down) return '│';
  if (up) return '│';
  if (right) return '─';
  if (left) return '─';
  return ' ';
}

/**
 * Corner char for a group box corner.
 * The box's own wall and border are always present, so the only dynamic
 * input is whether a wall continues past the corner (up for top corners,
 * down for bottom corners) — that happens when a sibling group directly
 * above/below shares the border row, and merges as ├ / ┤.
 */
function cornerChar(g: Grid, col: number, row: number, which: 'tl' | 'tr' | 'bl' | 'br'): string {
  if (which === 'tl') return connectsV(g.get(col, row - 1)) ? '├' : '┌';
  if (which === 'tr') return connectsV(g.get(col, row - 1)) ? '┤' : '┐';
  if (which === 'bl') return connectsV(g.get(col, row + 1)) ? '├' : '└';
  return connectsV(g.get(col, row + 1)) ? '┤' : '┘';
}

/** Clip a string to a display width (CJK-aware). */
function clipToWidth(s: string, maxW: number): string {
  let w = 0;
  let out = '';
  for (const ch of s) {
    const cw = charWidth(ch);
    if (w + cw > maxW) break;
    out += ch;
    w += cw;
  }
  return out;
}

/** Draw a horizontal/vertical (L-shaped) line between two points. */
function drawLine(g: Grid, x0: number, y0: number, x1: number, y1: number): void {
  // simple: horizontal then vertical
  const hChars = new Set(['─', '┬', '┴', '├', '┤', '┌', '┐', '└', '┘', '─', '▶', '◀']);
  const vChars = new Set(['│', '├', '┤', '┬', '┴', '┌', '┐', '└', '┘', '│', '▼', '▲']);

  if (y0 === y1) {
    for (let c = Math.min(x0, x1); c <= Math.max(x0, x1); c++) {
      const cur = g.get(c, y0);
      if (hChars.has(cur)) g.set(c, y0, '─');
      else if (vChars.has(cur)) g.set(c, y0, '┼');
      else g.set(c, y0, '─');
    }
  } else if (x0 === x1) {
    for (let r = Math.min(y0, y1); r <= Math.max(y0, y1); r++) {
      const cur = g.get(x0, r);
      if (vChars.has(cur)) g.set(x0, r, '│');
      else if (hChars.has(cur)) g.set(x0, r, '┼');
      else g.set(x0, r, '│');
    }
  } else {
    // L-shaped: horizontal from x0 to x1 at y0, then vertical
    for (let c = Math.min(x0, x1); c <= Math.max(x0, x1); c++) {
      g.set(c, y0, '─');
    }
    for (let r = Math.min(y0, y1); r <= Math.max(y0, y1); r++) {
      const cur = g.get(x1, r);
      if (hChars.has(cur)) g.set(x1, r, '┼');
      else g.set(x1, r, '│');
    }
  }
}

/** Draw a decision node as a diamond-ish shape with label inside. */
function drawDiamond(g: Grid, x: number, y: number, w: number, h: number, labelText: string): void {
  // simple: < text >  as a pseudo diamond
  const labelW = strWidth(labelText);
  const innerW = Math.max(labelW + 2, w - 2);
  const left = x + Math.max(0, Math.floor((w - innerW) / 2));
  const right = left + innerW - 1;
  const midY = y + Math.floor(h / 2);
  g.set(left, midY, '<');
  g.set(right, midY, '>');
  const pad = Math.max(0, Math.floor((innerW - labelW) / 2));
  g.put(left + 1 + pad, midY, labelText);
  // little vertical arms
  if (h >= 3) {
    g.set(left, y, '┌');
    g.set(right, y, '┐');
    g.set(left, y + h - 1, '└');
    g.set(right, y + h - 1, '┘');
  }
}
