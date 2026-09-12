/**
 * Dependency-free, XSS-safe Markdown subset renderer (TASK-022 / FR-017 / FR-024).
 *
 * Why it exists: the side panel used to render each chat entry as a single plain
 * `textContent` line, so the model's `# 标题` / `| 表格 |` / `**加粗**` / fenced
 * code showed up as literal characters. This module turns that text into real
 * DOM nodes.
 *
 * ── Security model (the input is untrusted: LLM output + site content) ────────
 * 1. **No HTML parsing at all.** The module never assigns markup through the
 *    HTML-string DOM APIs (the inner-html setter, outer-html, or adjacent-html
 *    insertion). Every piece of text — including raw
 *    `<img src=x onerror=…>` / `<script>` — is injected via `createTextNode` /
 *    `textContent`, so the browser can only ever treat it as text. This is the
 *    structural equivalent of escaping, with no double-encoding.
 * 2. **Only a fixed whitelist of tags is created** (`h1`…`h6`, `p`, `hr`,
 *    `blockquote`, `ul`, `ol`, `li`, `pre`, `code`, `strong`, `em`, `del`,
 *    `a`, `table`, `thead`, `tbody`, `tr`, `th`, `td`). `img`, `script`,
 *    `iframe`, `style`, `link`, `object`, `embed` can never be produced.
 * 3. **Links are gated by scheme.** A link node is only rendered when the URL
 *    has an explicit `http:` / `https:` scheme (case-insensitive); anything else
 *    (`javascript:`, `data:`, `vbscript:`, relative URLs, `//host`) degrades to
 *    a plain text node carrying the original raw Markdown. Rendered anchors get
 *    `rel="noreferrer noopener"` + `target="_blank"`.
 * 4. `href` and the `class` derived from a fence info string are set through
 *    attribute/property APIs (never string-concatenated HTML).
 *
 * Parsing is split from DOM building (`parseMarkdown` is a pure function), so the
 * parser is unit-testable in Node without a DOM; `renderMarkdown` only needs a
 * minimal `DomFactory` (the real `document` in the panel, a tiny fake in tests).
 */

export type MdInline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: MdInline[] }
  | { type: 'em'; children: MdInline[] }
  | { type: 'del'; children: MdInline[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; children: MdInline[] };

export type MdBlock =
  | { type: 'heading'; level: number; children: MdInline[] }
  | { type: 'paragraph'; children: MdInline[] }
  | { type: 'hr' }
  | { type: 'blockquote'; children: MdBlock[] }
  | { type: 'list'; ordered: boolean; items: MdBlock[][] }
  | { type: 'code'; lang: string; value: string }
  | { type: 'table'; header: MdInline[][]; rows: MdInline[][][] };

/** The minimal DOM surface the renderer needs; `document` satisfies it. */
export interface DomFactory {
  createElement(tag: string): any;
  createTextNode(text: string): any;
  createDocumentFragment(): any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Block parsing
// ─────────────────────────────────────────────────────────────────────────────

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/;
const LIST_RE = /^([ \t]*)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$/;
const QUOTE_RE = /^ {0,3}>/;

function normalize(src: string): string[] {
  return src.replace(/\r\n?/g, '\n').split('\n');
}

function leadingWidth(line: string): number {
  const m = /^[ \t]*/.exec(line);
  return m ? m[0].length : 0;
}

function deindent(line: string, n: number): string {
  let k = 0;
  while (k < n && k < line.length && (line[k] === ' ' || line[k] === '\t')) k += 1;
  return line.slice(k);
}

/** Horizontal rule: 3+ of the same `-`/`*`/`_`, whitespace allowed between. */
export function isHr(line: string): boolean {
  return /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line.trim());
}

function isTableDelimiter(line: string): boolean {
  const s = line.trim();
  if (!s || !s.includes('-') || !/^[|\-:\s]+$/.test(s)) return false;
  const cells = splitTableRow(s);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  // A trailing unescaped pipe is just the row terminator.
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') {
      cur += '|';
      i += 1;
      continue;
    }
    if (c === '|') {
      cells.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function startsBlock(line: string, lines: string[], i: number): boolean {
  if (FENCE_RE.test(line)) return true;
  if (HEADING_RE.test(line)) return true;
  if (isHr(line)) return true;
  if (QUOTE_RE.test(line)) return true;
  if (LIST_RE.test(line)) return true;
  if (line.includes('|') && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) return true;
  return false;
}

/** Parse a Markdown document into a block list. Pure and DOM-free. */
export function parseMarkdown(src: string): MdBlock[] {
  return parseBlocks(normalize(src));
}

function parseBlocks(lines: string[]): MdBlock[] {
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const marker = fence[1][0];
      const markerLen = fence[1].length;
      const info = fence[2].trim();
      const lang = (info.split(/\s+/)[0] ?? '').replace(/[^A-Za-z0-9_+.-]/g, '');
      const body: string[] = [];
      i += 1;
      const closeRe = new RegExp(`^ {0,3}${marker === '`' ? '`' : '~'}{${markerLen},}[ \\t]*$`);
      while (i < lines.length) {
        if (closeRe.test(lines[i])) {
          i += 1;
          break;
        }
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code', lang, value: body.join('\n') });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, children: parseInline(heading[2] ?? '') });
      i += 1;
      continue;
    }

    if (isHr(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoted.push(lines[i].replace(/^ {0,3}>[ \t]?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', children: parseBlocks(quoted) });
      continue;
    }

    const listMatch = LIST_RE.exec(line);
    if (listMatch) {
      const res = parseList(lines, i, listMatch);
      blocks.push(res.block);
      i = res.next;
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      const header = splitTableRow(line);
      const rows: MdInline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        const cells = splitTableRow(lines[i]);
        rows.push(header.map((_, idx) => parseInline(cells[idx] ?? '')));
        i += 1;
      }
      blocks.push({ type: 'table', header: header.map((h) => parseInline(h)), rows });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      if (para.length > 0 && startsBlock(lines[i], lines, i)) break;
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'paragraph', children: parseInline(para.join('\n')) });
  }
  return blocks;
}

function parseList(lines: string[], start: number, first: RegExpExecArray): { block: MdBlock; next: number } {
  const ordered = /\d/.test(first[2]);
  const baseIndent = first[1].length;
  const items: MdBlock[][] = [];
  let current: string[] = [];
  let i = start;

  const flush = (): void => {
    if (current.length) {
      items.push(parseBlocks(current));
      current = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      // Loose list: skip blanks only if the list actually continues afterwards.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j += 1;
      if (j >= lines.length) break;
      const nextItem = LIST_RE.exec(lines[j]);
      const continues = (nextItem && nextItem[1].length >= baseIndent) || leadingWidth(lines[j]) > baseIndent;
      if (!continues) break;
      i = j;
      continue;
    }

    const m = LIST_RE.exec(line);
    if (m) {
      const indent = m[1].length;
      const itemOrdered = /\d/.test(m[2]);
      if (indent === baseIndent && itemOrdered === ordered) {
        flush();
        current.push(m[3] ?? '');
        i += 1;
        continue;
      }
      if (indent > baseIndent) {
        // Nested list / continuation line: de-indent relative to this list.
        current.push(deindent(line, baseIndent + 2));
        i += 1;
        continue;
      }
      break;
    }

    if (leadingWidth(line) > baseIndent) {
      current.push(deindent(line, baseIndent + 2));
      i += 1;
      continue;
    }
    break;
  }
  flush();
  return { block: { type: 'list', ordered, items }, next: i };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline parsing
// ─────────────────────────────────────────────────────────────────────────────

interface LinkMatch {
  label: string;
  href: string | null;
  raw: string;
  end: number;
}

/**
 * Return a safe absolute `http(s)` URL for a Markdown link target, or `null` for
 * every other scheme/relative form (the caller then degrades to plain text).
 */
export function safeHref(raw: string): string | null {
  let u = raw.trim();
  if (u.startsWith('<') && u.endsWith('>')) u = u.slice(1, -1).trim();
  // Reject control characters anywhere (defeats `java\nscript:`-style tricks).
  if (/[\u0000-\u001f\u007f]/.test(u)) return null;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(u);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') return null;
  return u;
}

function countRun(s: string, at: number, ch: string): number {
  let n = 0;
  while (s[at + n] === ch) n += 1;
  return n;
}

function findRun(s: string, from: number, ch: string, len: number): number {
  let i = from;
  while (i < s.length) {
    if (s[i] === ch) {
      const n = countRun(s, i, ch);
      if (n === len) return i;
      i += n;
    } else {
      i += 1;
    }
  }
  return -1;
}

function matchLink(src: string, start: number): LinkMatch | null {
  if (src[start] !== '[') return null;
  let i = start + 1;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === '[') depth += 1;
    else if (c === ']') {
      if (depth === 0) break;
      depth -= 1;
    }
    i += 1;
  }
  if (i >= src.length || src[i] !== ']') return null;
  const labelEnd = i;
  if (src[labelEnd + 1] !== '(') return null;

  let j = labelEnd + 2;
  let parens = 0;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') {
      j += 2;
      continue;
    }
    if (c === '(') parens += 1;
    else if (c === ')') {
      if (parens === 0) break;
      parens -= 1;
    }
    j += 1;
  }
  if (j >= src.length) return null;
  const label = src.slice(start + 1, labelEnd);
  const urlRaw = src.slice(labelEnd + 2, j);
  return { label, href: safeHref(urlRaw), raw: src.slice(start, j + 1), end: j + 1 };
}

/** Parse the inline subset: `**bold**`, `*em*`, `` `code` ``, `~~del~~`, links. */
export function parseInline(src: string): MdInline[] {
  const nodes: MdInline[] = [];
  let text = '';
  let i = 0;
  const flush = (): void => {
    if (text) {
      nodes.push({ type: 'text', value: text });
      text = '';
    }
  };

  while (i < src.length) {
    const c = src[i];

    if (c === '\\' && i + 1 < src.length) {
      text += src[i + 1];
      i += 2;
      continue;
    }

    if (c === '`') {
      const run = countRun(src, i, '`');
      const close = findRun(src, i + run, '`', run);
      if (close !== -1) {
        flush();
        nodes.push({ type: 'code', value: src.slice(i + run, close) });
        i = close + run;
        continue;
      }
      text += src.slice(i, i + run);
      i += run;
      continue;
    }

    if (c === '~' && src[i + 1] === '~') {
      const close = src.indexOf('~~', i + 2);
      if (close !== -1) {
        flush();
        nodes.push({ type: 'del', children: parseInline(src.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
      text += '~~';
      i += 2;
      continue;
    }

    if (c === '*') {
      const double = src[i + 1] === '*';
      const marker = double ? '**' : '*';
      const close = double ? src.indexOf('**', i + 2) : src.indexOf('*', i + 1);
      if (close !== -1 && close > i + marker.length) {
        flush();
        nodes.push({
          type: double ? 'strong' : 'em',
          children: parseInline(src.slice(i + marker.length, close)),
        });
        i = close + marker.length;
        continue;
      }
      text += marker;
      i += marker.length;
      continue;
    }

    if (c === '[') {
      const link = matchLink(src, i);
      if (link) {
        flush();
        if (link.href) nodes.push({ type: 'link', href: link.href, children: parseInline(link.label) });
        else nodes.push({ type: 'text', value: link.raw }); // unsafe scheme → literal text
        i = link.end;
        continue;
      }
    }

    text += c;
    i += 1;
  }
  flush();
  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM rendering (whitelisted elements only)
// ─────────────────────────────────────────────────────────────────────────────

function el(doc: DomFactory, tag: string, className?: string): any {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  return node;
}

function renderInline(nodes: MdInline[], doc: DomFactory): any {
  const frag = doc.createDocumentFragment();
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        frag.appendChild(doc.createTextNode(n.value));
        break;
      case 'code': {
        const code = el(doc, 'code');
        code.appendChild(doc.createTextNode(n.value));
        frag.appendChild(code);
        break;
      }
      case 'strong': {
        const strong = el(doc, 'strong');
        strong.appendChild(renderInline(n.children, doc));
        frag.appendChild(strong);
        break;
      }
      case 'em': {
        const em = el(doc, 'em');
        em.appendChild(renderInline(n.children, doc));
        frag.appendChild(em);
        break;
      }
      case 'del': {
        const del = el(doc, 'del');
        del.appendChild(renderInline(n.children, doc));
        frag.appendChild(del);
        break;
      }
      case 'link': {
        const a = el(doc, 'a');
        a.setAttribute('href', n.href);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noreferrer noopener');
        a.appendChild(renderInline(n.children, doc));
        frag.appendChild(a);
        break;
      }
    }
  }
  return frag;
}

function appendBlocks(container: any, blocks: MdBlock[], doc: DomFactory): void {
  for (const block of blocks) container.appendChild(renderBlock(block, doc));
}

function renderBlock(block: MdBlock, doc: DomFactory): any {
  switch (block.type) {
    case 'heading': {
      const h = el(doc, `h${block.level}`);
      h.appendChild(renderInline(block.children, doc));
      return h;
    }
    case 'paragraph': {
      const p = el(doc, 'p');
      p.appendChild(renderInline(block.children, doc));
      return p;
    }
    case 'hr':
      return el(doc, 'hr');
    case 'blockquote': {
      const bq = el(doc, 'blockquote');
      appendBlocks(bq, block.children, doc);
      return bq;
    }
    case 'list': {
      const list = el(doc, block.ordered ? 'ol' : 'ul');
      for (const item of block.items) {
        const li = el(doc, 'li');
        appendBlocks(li, item, doc);
        list.appendChild(li);
      }
      return list;
    }
    case 'code': {
      const pre = el(doc, 'pre');
      const code = el(doc, 'code', block.lang ? `language-${block.lang}` : undefined);
      // Fenced code is kept verbatim; no inline parsing inside.
      code.appendChild(doc.createTextNode(block.value));
      pre.appendChild(code);
      return pre;
    }
    case 'table': {
      const table = el(doc, 'table');
      const thead = el(doc, 'thead');
      const headRow = el(doc, 'tr');
      for (const cell of block.header) {
        const th = el(doc, 'th');
        th.appendChild(renderInline(cell, doc));
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = el(doc, 'tbody');
      for (const row of block.rows) {
        const tr = el(doc, 'tr');
        for (const cell of row) {
          const td = el(doc, 'td');
          td.appendChild(renderInline(cell, doc));
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      return table;
    }
  }
}

/**
 * Render a Markdown string into a `DocumentFragment` (or any node list) using
 * only whitelisted elements and `createTextNode`. Never parses HTML.
 */
export function renderMarkdown(src: string, doc: DomFactory): any {
  const frag = doc.createDocumentFragment();
  appendBlocks(frag, parseMarkdown(src), doc);
  return frag;
}
