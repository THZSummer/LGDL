/**
 * V3-4 TASK-402 — page-side capture caliber (`src/content/ref-capture.ts`).
 *
 * Two things are pinned here and nowhere else:
 *   1. the **stability** contract — the same node produces the same selector and the
 *      same semantic path on two consecutive calls (FR-V3-071's premise);
 *   2. the **shared caliber** with v3-2's `l1/ref-store.ts`: the truncation lengths
 *      and the rendered strings must be equal, so the page and the evidence layer
 *      cannot drift apart silently.
 *
 * The structural `CaptureNode` interface exists precisely so this can run in plain
 * Node with fakes (the package has no DOM and no jsdom dependency — adding one is
 * out of scope for this leaf).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { CaptureNode } from '../src/content/ref-capture.js';
import {
  MAX_PATH_DEPTH,
  MIN_SELECTION_CHARS,
  REF_MARK_ATTR,
  SELECTOR_MAX,
  SEMANTIC_PATH_MAX,
  STABLE_KEYS,
  TEXT_DIGEST_MAX,
  captureFacts,
  flatten,
  isEditableNode,
  markRef,
  resolveRef,
  selectorFor,
  semanticPathFor,
  textDigestFor,
  truncate,
} from '../src/content/ref-capture.js';
import { SEMANTIC_PATH_MAX as STORE_PATH_MAX, TEXT_DIGEST_MAX as STORE_DIGEST_MAX, truncate as storeTruncate } from '../src/ui/sidepanel/l1/ref-store.js';

interface FakeNode extends CaptureNode {
  children?: FakeNode[];
  parentElement: FakeNode | null;
}

interface FakeSpec {
  tagName: string;
  id?: string;
  textContent?: string;
  className?: string;
  attributes?: Record<string, string>;
  children?: FakeNode[];
}

function node(spec: FakeSpec): FakeNode {
  const attrs = spec.attributes ?? {};
  const self: FakeNode = {
    tagName: spec.tagName,
    textContent: spec.textContent ?? '',
    parentElement: null,
    children: [],
    siblingIndex: 1,
    siblingCount: 1,
    getAttribute(name: string): string | null {
      if (name === 'class') return spec.className ?? null;
      return name in attrs ? attrs[name] : null;
    },
  };
  if (spec.id) self.id = spec.id;
  for (const child of spec.children ?? []) {
    child.parentElement = self;
    self.children?.push(child);
  }
  return self;
}

/** Rebuild the sibling counters `fromElement` computes from the live DOM. */
function indexTree(root: FakeNode): FakeNode {
  const walk = (n: FakeNode): void => {
    const siblings = (n.parentElement?.children ?? [n]).filter((c) => c.tagName === n.tagName);
    n.siblingCount = siblings.length;
    n.siblingIndex = siblings.indexOf(n) + 1;
    for (const c of n.children ?? []) walk(c);
  };
  walk(root);
  return root;
}

function tree(): FakeNode {
  const inner = node({ tagName: 'SPAN', textContent: '  目标文本  ' });
  const list = node({ tagName: 'UL', children: [node({ tagName: 'LI' }), node({ tagName: 'LI' })] });
  return indexTree(
    node({
      tagName: 'DIV',
      attributes: { 'data-testid': 'card' },
      children: [node({ tagName: 'H1', id: 'title', textContent: '标题' }), list, inner],
    }),
  );
}

test('TASK-402 · 截断口径与 v3-2 ref-store 共享（常量与渲染字符串逐字相等）', () => {
  assert.equal(TEXT_DIGEST_MAX, 80);
  assert.equal(SEMANTIC_PATH_MAX, 120);
  assert.equal(SELECTOR_MAX, 120);
  assert.equal(TEXT_DIGEST_MAX, STORE_DIGEST_MAX, 'textDigest 截断长度必须与 l1/ref-store 同源');
  assert.equal(SEMANTIC_PATH_MAX, STORE_PATH_MAX, 'semanticPath 截断长度必须与 l1/ref-store 同源');
  const long = 'x'.repeat(400);
  assert.equal(truncate(long, TEXT_DIGEST_MAX), storeTruncate(long, TEXT_DIGEST_MAX));
  assert.equal(truncate(long, SEMANTIC_PATH_MAX), storeTruncate(long, SEMANTIC_PATH_MAX));
  const spaced = '  a \n b\tc  ';
  assert.equal(truncate(spaced, 80), storeTruncate(spaced, 80));
  assert.equal(flatten(spaced), 'abc');
});

test('TASK-402 · 边界值：80 / 120 / 选择最小长度', () => {
  const exact = 'y'.repeat(TEXT_DIGEST_MAX);
  assert.equal(textDigestFor(node({ tagName: 'P', textContent: exact })).length, TEXT_DIGEST_MAX);
  assert.ok(!textDigestFor(node({ tagName: 'P', textContent: exact })).endsWith('…'));
  const over = 'y'.repeat(TEXT_DIGEST_MAX + 1);
  const cut = textDigestFor(node({ tagName: 'P', textContent: over }));
  assert.equal(cut.length, TEXT_DIGEST_MAX + 1, '截断后追加一个省略号');
  assert.ok(cut.endsWith('…'));
  const path = semanticPathFor(node({ tagName: 'P', textContent: 'x' }), 1);
  assert.equal(path, 'p');
  assert.equal(MIN_SELECTION_CHARS, 2, '拖选最小触发长度 = 2 个非空白字符');
});

test('TASK-402 · 稳定性：同一节点两次生成结果相等', () => {
  const root = tree();
  const target = (root.children ?? [])[2];
  assert.equal(selectorFor(target), selectorFor(target));
  assert.equal(semanticPathFor(target), semanticPathFor(target));
  assert.ok(semanticPathFor(target).length <= SEMANTIC_PATH_MAX);
  assert.ok(selectorFor(target).length <= SELECTOR_MAX);
});

test('TASK-402 · 稳定优先：id → data-* 稳定键 → 结构性路径（≤6 级）', () => {
  assert.equal(selectorFor(node({ tagName: 'H1', id: 'title' })), '#title');
  assert.equal(selectorFor(node({ tagName: 'DIV', attributes: { [STABLE_KEYS[0]]: 'card' } })), 'div[data-testid="card"]');
  const deep = (depth: number): FakeNode => {
    let current = node({ tagName: 'SPAN' });
    for (let i = 0; i < depth; i += 1) current = node({ tagName: 'DIV', children: [current] });
    return indexTree(current);
  };
  const deepRoot = deep(MAX_PATH_DEPTH + 4);
  let leaf: FakeNode = deepRoot;
  while (leaf.children && leaf.children.length > 0) leaf = leaf.children[0];
  const path = semanticPathFor(leaf);
  assert.ok(path.split(' › ').length <= MAX_PATH_DEPTH + 1, `深度必须被截断：${path}`);
  const selector = selectorFor(leaf);
  assert.ok(selector.split(' > ').length <= MAX_PATH_DEPTH, `选择器深度必须被截断：${selector}`);
});

test('TASK-402 · 事实字段齐备（8 字段）+ 不含任何判定结论字段', () => {
  const facts = captureFacts(node({ tagName: 'P', textContent: 'hello' }), {
    origin: 'https://example.test',
    documentId: 'doc-1',
    navSeq: 3,
    declarationHash: 'decl-abc',
    declarationVersion: '2.0',
    capturedAt: 1_700_000_000_000,
  });
  assert.deepEqual(Object.keys(facts).sort(), [
    'capturedAt',
    'declarationHash',
    'declarationVersion',
    'documentId',
    'navSeq',
    'origin',
    'selector',
    'semanticPath',
    'textDigest',
  ]);
  assert.equal(facts.origin, 'https://example.test');
  assert.equal(facts.navSeq, 3);
  assert.equal(facts.declarationHash, 'decl-abc');
  for (const banned of ['verdict', 'valid', 'refId', 'reason', 'allowed']) {
    assert.ok(!(banned in facts), `事实集不得包含判定字段 ${banned}`);
  }
  // A missing optional version is *absent*, not an empty string.
  const noVersion = captureFacts(node({ tagName: 'P' }), {
    origin: 'o',
    documentId: 'd',
    navSeq: 1,
    declarationHash: 'h',
    capturedAt: 0,
  });
  assert.ok(!('declarationVersion' in noVersion));
});

test('TASK-402 · 输入区识别（拖选不得干扰宿主输入）+ 身份标记', () => {
  const input = node({ tagName: 'INPUT' });
  const wrapper = node({ tagName: 'DIV', children: [input] });
  assert.equal(isEditableNode(input), true);
  assert.equal(isEditableNode(wrapper), false);
  const textarea = node({ tagName: 'TEXTAREA' });
  assert.equal(isEditableNode(textarea), true);
  const editable = node({ tagName: 'DIV', attributes: { contenteditable: 'true' } });
  assert.equal(isEditableNode(editable), true);
  assert.equal(isEditableNode(node({ tagName: 'P' })), false);

  const attrs: Record<string, string> = {};
  const el = { setAttribute: (k: string, v: string) => void (attrs[k] = v) } as unknown as Element;
  markRef(el, 'ref_7');
  assert.equal(attrs[REF_MARK_ATTR], 'ref_7');
});

test('TASK-402 · resolveRef 只报告观测到的身份标记（缺标记 ⇒ 不冒充）', () => {
  const marked = {
    querySelectorAll: () => [{ getAttribute: (n: string) => (n === REF_MARK_ATTR ? 'ref_4' : null) }],
  } as unknown as ParentNode;
  assert.deepEqual(resolveRef('#a', marked), { status: 'resolved', nodeCount: 1, refMark: 'ref_4' });

  const unmarked = {
    querySelectorAll: () => [{ getAttribute: () => null }],
  } as unknown as ParentNode;
  const report = resolveRef('#a', unmarked);
  assert.equal(report.status, 'resolved');
  assert.ok(!('refMark' in report), '未观测到标记时必须保持缺失（v3-2 的 D1 据此判 replaced）');

  assert.equal(resolveRef('#a', { querySelectorAll: () => [] } as unknown as ParentNode).status, 'missing');
  assert.equal(resolveRef('#a', { querySelectorAll: () => [1, 2] } as unknown as ParentNode).status, 'ambiguous');
  assert.equal(resolveRef('', marked).status, 'unreachable');
  assert.equal(
    resolveRef('#a', {
      querySelectorAll: () => {
        throw new Error('bad selector');
      },
    } as unknown as ParentNode).status,
    'missing',
  );
});
