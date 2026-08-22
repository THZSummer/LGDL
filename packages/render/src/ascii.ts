/**
 * LGDL ASCII renderer.
 *
 * Maps layout coordinates (pixels) onto a character grid and draws the
 * diagram with box-drawing characters, so graphs can be shown in plain
 * text (terminals, CI logs, code comments, image-less environments).
 * CJK characters occupy 2 grid columns (full-width).
 */
import type { LgdlDocument } from '@lgdl/core';
import type { LayoutResult } from '@lgdl/layout';

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

/** Character grid. */
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
   * gap cell stays blank so the terminal renders the wide char once.
   */
  put(col: number, row: number, text: string): void {
    let c = col;
    for (const ch of text) {
      if (c >= this.cols || row >= this.rows) break;
      this.cells[row][c] = ch;
      c += charWidth(ch); // CJK advances 2 cells, second cell stays ''
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
    // trim trailing spaces per line
    return this.cells
      .map((rowArr) => rowArr.join('').replace(/ +$/, ''))
      .join('\n');
  }
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
 * because we use display widths throughout.
 */
export function renderAscii(doc: LgdlDocument, layout: LayoutResult): string {
  void layout;
  // ---- BFS ranks ----
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
  const roots = doc.nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
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
  for (const n of doc.nodes) if (!rankOf.has(n.id)) rankOf.set(n.id, 0);
  const maxRank = Math.max(0, ...rankOf.values());
  const ranks: string[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const n of doc.nodes) ranks[rankOf.get(n.id) ?? 0].push(n.id);

  // ---- box building ----
  const boxLines = (id: string): { top: string; mid: string; bot: string; w: number } => {
    const n = doc.nodes.find((x) => x.id === id)!;
    const label = n.label ?? n.id;
    const labelW = strWidth(label);
    const w = labelW + 4;
    const kind = n.kind ?? 'process';
    const rounded = kind === 'start' || kind === 'end';
    const isDecision = kind === 'decision';
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

  // ---- pass 1: compute center col for every node (all ranks) ----
  const centerOf = new Map<string, number>();
  for (const ids of ranks) {
    let col = 0;
    for (const id of ids) {
      const b = boxLines(id);
      centerOf.set(id, col + Math.floor(b.w / 2));
      col += b.w + 2;
    }
  }

  // ---- pass 2: compose lines ----
  const lines: string[] = [];
  for (let ri = 0; ri < ranks.length; ri++) {
    const ids = ranks[ri];
    let topLine = '';
    let midLine = '';
    let botLine = '';
    let col = 0;
    for (const id of ids) {
      const b = boxLines(id);
      topLine = padToW(topLine, col) + b.top;
      midLine = padToW(midLine, col) + b.mid;
      botLine = padToW(botLine, col) + b.bot;
      col += b.w + 2;
    }
    lines.push(topLine);
    lines.push(midLine);
    lines.push(botLine);

    if (ri < ranks.length - 1) {
      const downEdges = doc.edges.filter((e) => (rankOf.get(e.from) ?? 0) === ri && (rankOf.get(e.to) ?? 0) === ri + 1);
      const targetsBySource = new Map<string, string[]>();
      for (const e of downEdges) {
        if (!targetsBySource.has(e.from)) targetsBySource.set(e.from, []);
        targetsBySource.get(e.from)!.push(e.to);
      }
      const width = Math.max(maxW(lines), ...ranks[ri + 1].map((id) => (centerOf.get(id) ?? 0) + 1));
      const hasFork = [...targetsBySource.values()].some((ts) => ts.length > 1);

      if (!hasFork) {
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
            const start = fromC + 2;
            for (let k = 0; k < e.label.length && start + k < width; k++) {
              conn[start + k] = e.label[k];
            }
          }
        }
        lines.push(conn.join('').replace(/ +$/, ''));
      } else {
        // fork: row1 = trunks + horizontal branches, row2 = drops + arrows
        const row1 = blank(width);
        for (const id of ids) {
          const c = centerOf.get(id) ?? 0;
          if (c < width) row1[c] = '│';
        }
        for (const [fromId, toIds] of targetsBySource) {
          if (toIds.length <= 1) continue;
          const srcC = centerOf.get(fromId) ?? 0;
          const cols = toIds.map((id) => centerOf.get(id) ?? 0);
          const minC = Math.min(...cols);
          const maxC = Math.max(...cols);
          for (let c = Math.min(srcC, minC); c <= Math.max(srcC, maxC); c++) {
            if (row1[c] === ' ') row1[c] = '─';
          }
          row1[srcC] = '┴';
          for (const tc of cols) {
            if (tc !== srcC && row1[tc] === '─') row1[tc] = '┬';
          }
          // edge labels along each branch (before row1 is pushed);
          // place on the branch segment between src and target, skipping
          // cells already used so labels don't overlap
          for (const t of toIds) {
            const tc = centerOf.get(t) ?? 0;
            if (tc !== srcC) {
              const e = downEdges.find((x) => x.from === fromId && x.to === t);
              if (e && e.label) {
                const label = e.label;
                const lo = Math.min(srcC, tc) + 1;
                const hi = Math.max(srcC, tc);
                // find a free run of cells for the label
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
          }
        }
        lines.push(row1.join('').replace(/ +$/, ''));

        const row2 = blank(width);
        for (const [fromId, toIds] of targetsBySource) {
          if (toIds.length <= 1) continue;
          const srcC = centerOf.get(fromId) ?? 0;
          for (const t of toIds) {
            const tc = centerOf.get(t) ?? 0;
            row2[tc] = '│';
          }
        }
        for (const id of ranks[ri + 1]) {
          const c = centerOf.get(id) ?? 0;
          if (c < width) row2[c] = '▼';
        }
        // trunk-edge labels (source -> target at same column): place right of ▼
        for (const [fromId, toIds] of targetsBySource) {
          if (toIds.length <= 1) continue;
          const srcC = centerOf.get(fromId) ?? 0;
          for (const t of toIds) {
            const tc = centerOf.get(t) ?? 0;
            if (tc === srcC) {
              const e = downEdges.find((x) => x.from === fromId && x.to === t);
              if (e && e.label) {
                const start = srcC + 2;
                for (let k = 0; k < e.label.length && start + k < width; k++) {
                  row2[start + k] = e.label[k];
                }
              }
            }
          }
        }
        lines.push(row2.join('').replace(/ +$/, ''));
      }
    }
  }

  return lines.join('\n');

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
