/**
 * TASK-022 — safe Markdown renderer unit tests (node env, no jsdom).
 *
 * The module is split into a pure parser (`parseMarkdown`/`parseInline`, fully
 * testable as data) and a DOM renderer that only needs a tiny `DomFactory`. The
 * tests below supply a minimal fake DOM (elements + text + fragments) so the
 * renderer — including the XSS-relevant "which nodes actually get created" —
 * can be asserted without a browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseMarkdown,
  parseInline,
  renderMarkdown,
  safeHref,
  type DomFactory,
} from '../src/ui/sidepanel/markdown.js';

// ── minimal fake DOM ─────────────────────────────────────────────────────────

interface FNode {
  nodeType: number; // 1 = element, 3 = text, 11 = fragment
  tagName: string;
  className: string;
  attrs: Record<string, string>;
  childNodes: FNode[];
  text?: string;
  appendChild(child: FNode): FNode;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

function makeNode(nodeType: number, tagName: string): FNode {
  const node: FNode = {
    nodeType,
    tagName,
    className: '',
    attrs: {},
    childNodes: [],
    appendChild(child) {
      node.childNodes.push(child);
      return child;
    },
    setAttribute(name, value) {
      node.attrs[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(node.attrs, name) ? node.attrs[name] : null;
    },
  };
  return node;
}

const doc: DomFactory = {
  createElement: (tag: string) => makeNode(1, tag.toUpperCase()),
  createTextNode: (text: string) => {
    const n = makeNode(3, '#text');
    n.text = text;
    return n;
  },
  createDocumentFragment: () => makeNode(11, '#fragment'),
};

function walk(node: FNode, out: FNode[] = []): FNode[] {
  out.push(node);
  for (const child of node.childNodes ?? []) walk(child, out);
  return out;
}

function tags(root: FNode, name: string): FNode[] {
  return walk(root).filter((n) => n.nodeType === 1 && n.tagName === name.toUpperCase());
}

function textOf(root: FNode): string {
  return walk(root)
    .filter((n) => n.nodeType === 3)
    .map((n) => n.text ?? '')
    .join('');
}

// ── XSS ──────────────────────────────────────────────────────────────────────

test('markdown xss: raw HTML becomes text, never img/script elements', () => {
  const frag = renderMarkdown('<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>', doc) as FNode;
  assert.equal(tags(frag, 'img').length, 0, 'no <img> element');
  assert.equal(tags(frag, 'script').length, 0, 'no <script> element');
  assert.match(textOf(frag), /<img src=x onerror=alert\(1\)>/);
  assert.match(textOf(frag), /<script>alert\(1\)<\/script>/);
});

test('markdown xss: javascript:/data: links degrade to plain text (no <a>)', () => {
  const js = renderMarkdown('[x](javascript:alert(1))', doc) as FNode;
  assert.equal(tags(js, 'a').length, 0);
  assert.match(textOf(js), /\[x\]\(javascript:alert\(1\)\)/);

  const data = renderMarkdown('[x](data:text/html;base64,PHNjcmlwdD4=)', doc) as FNode;
  assert.equal(tags(data, 'a').length, 0);

  // scheme-smuggling attempts (control char in the scheme) are rejected too.
  assert.equal(safeHref('java\nscript:alert(1)'), null);
  assert.equal(safeHref('vbscript:msgbox(1)'), null);
  assert.equal(safeHref('//evil.example'), null, 'protocol-relative is downgraded');
  assert.equal(safeHref('relative/path'), null);
  assert.equal(safeHref('HTTPS://Example.com/x'), 'HTTPS://Example.com/x');
});

test('markdown links: only http/https render as safe anchors', () => {
  const frag = renderMarkdown('[ok](https://example.com/a?b=c&d=e)', doc) as FNode;
  const as = tags(frag, 'a');
  assert.equal(as.length, 1);
  assert.equal(as[0].getAttribute('href'), 'https://example.com/a?b=c&d=e');
  assert.equal(as[0].getAttribute('target'), '_blank');
  assert.match(as[0].getAttribute('rel') ?? '', /noreferrer/);
  assert.match(as[0].getAttribute('rel') ?? '', /noopener/);
});

// ── blocks ───────────────────────────────────────────────────────────────────

test('markdown blocks: ATX headings 1..6 (7 hashes is not a heading)', () => {
  const frag = renderMarkdown('# 标题\n\n###### six\n\n####### seven', doc) as FNode;
  assert.equal(tags(frag, 'h1').length, 1);
  assert.equal(tags(frag, 'h6').length, 1);
  assert.equal(tags(frag, 'h7').length, 0);
  assert.match(textOf(frag), /####### seven/);
});

test('markdown blocks: hr and blockquote', () => {
  const frag = renderMarkdown('---\n\n> 引用', doc) as FNode;
  assert.equal(tags(frag, 'hr').length, 1);
  assert.equal(tags(frag, 'blockquote').length, 1);
  assert.match(textOf(frag), /引用/);
});

test('markdown blocks: unordered / ordered / nested lists', () => {
  const ul = renderMarkdown('- a\n- b', doc) as FNode;
  assert.equal(tags(ul, 'ul').length, 1);
  assert.equal(tags(ul, 'li').length, 2);

  const ol = renderMarkdown('1. one\n2. two', doc) as FNode;
  assert.equal(tags(ol, 'ol').length, 1);
  assert.equal(tags(ol, 'li').length, 2);

  const nested = renderMarkdown('- a\n  - b', doc) as FNode;
  assert.equal(tags(nested, 'ul').length, 2, 'outer + nested list');
  assert.equal(tags(nested, 'li').length, 2);
});

test('markdown blocks: fenced code is verbatim, language class, no inline parsing', () => {
  const frag = renderMarkdown('```js\nconst a = **not bold**;\n```', doc) as FNode;
  const pres = tags(frag, 'pre');
  assert.equal(pres.length, 1);
  const code = tags(frag, 'code');
  assert.equal(code.length, 1);
  assert.equal(code[0].className, 'language-js');
  assert.equal(textOf(pres[0]), 'const a = **not bold**;');
  assert.equal(tags(frag, 'strong').length, 0);
});

test('markdown blocks: GFM pipe table with header/body + inline formatting', () => {
  const frag = renderMarkdown('| 类别 | 示例 |\n| --- | --- |\n| 标题 | **粗** |', doc) as FNode;
  assert.equal(tags(frag, 'table').length, 1);
  assert.equal(tags(frag, 'th').length, 2);
  assert.equal(tags(frag, 'td').length, 2);
  assert.equal(tags(frag, 'strong').length, 1);
  assert.match(textOf(frag), /类别/);
  assert.match(textOf(frag), /粗/);
});

// ── inline ───────────────────────────────────────────────────────────────────

test('markdown inline: strong / em / code / del', () => {
  const frag = renderMarkdown('**粗** *斜* `code` ~~删除~~', doc) as FNode;
  assert.equal(tags(frag, 'strong').length, 1);
  assert.equal(tags(frag, 'em').length, 1);
  assert.equal(tags(frag, 'code').length, 1);
  assert.equal(tags(frag, 'del').length, 1);
});

// ── resilience ───────────────────────────────────────────────────────────────

test('markdown: unclosed syntax never throws or swallows following content', () => {
  const fence = renderMarkdown('```\nline1\nline2', doc) as FNode;
  assert.equal(tags(fence, 'pre').length, 1);
  assert.match(textOf(fence), /line1/);
  assert.match(textOf(fence), /line2/);

  const closed = renderMarkdown('```\ncode\n```\n\nafter paragraph', doc) as FNode;
  assert.equal(tags(closed, 'pre').length, 1);
  assert.equal(tags(closed, 'p').length, 1);
  assert.match(textOf(closed), /after paragraph/);

  const bold = renderMarkdown('**unclosed', doc) as FNode;
  assert.equal(tags(bold, 'strong').length, 0);
  assert.match(textOf(bold), /\*\*unclosed/);

  const backtick = renderMarkdown('a `unclosed', doc) as FNode;
  assert.equal(tags(backtick, 'code').length, 0);
  assert.match(textOf(backtick), /`unclosed/);

  const halfRow = renderMarkdown('| a | b |\n| --- | --- |\n| only |', doc) as FNode;
  assert.equal(tags(halfRow, 'table').length, 1);
  assert.equal(tags(halfRow, 'td').length, 2, 'short row padded to header width');

  const empty = renderMarkdown('', doc) as FNode;
  assert.equal(empty.childNodes.length, 0);
});

// ── pure parser + source guard ───────────────────────────────────────────────

test('markdown: parseMarkdown is a pure function (no DOM required)', () => {
  const blocks = parseMarkdown('# t\n\ntext');
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['heading', 'paragraph'],
  );
  assert.deepEqual(parseInline('a **b**').map((n) => n.type), ['text', 'strong']);
});

test('markdown source: no HTML-injection APIs are used', () => {
  const src = readFileSync(new URL('../../src/ui/sidepanel/markdown.ts', import.meta.url), 'utf8');
  // Constructed from parts so this guard does not itself trip the redline grep.
  const htmlApis = ['inner' + 'HTML', 'outer' + 'HTML', 'insertAdjacent' + 'HTML'];
  assert.equal(htmlApis.some((api) => src.includes(api)), false);
});
