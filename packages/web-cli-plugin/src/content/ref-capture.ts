/**
 * V3-4 TASK-402 (ADR-V3-034 / FR-V3-071) — the page-side capture caliber.
 *
 * ── Why one module, and why it takes a structural node ───────────────────────
 *
 * FR-V3-071 requires the reference id to mean the same thing in four places (page
 * badge, side-panel chip, evidence row, invalidation row), so the *selector* / the
 * *semantic path* / the *text digest* that the page reports must be produced by one
 * implementation — a second copy would let the page and the evidence layer describe
 * two different targets. The functions below are therefore the only capture path;
 * every page-side interaction (Alt hover / Alt drag / context menu / text selection /
 * double-click / hover-⊕) feeds its element through {@link captureFacts}.
 *
 * The functions are **pure** with respect to a small structural node interface
 * ({@link CaptureNode}) rather than the live `Element` type, for one reason: the
 * package has no DOM in Node (no jsdom dependency, and adding one is forbidden), so
 * this is what makes the caliber node-testable. {@link fromElement} is the only
 * adapter and it is part of the shipped bundle.
 *
 * ── The truncation caliber is *shared*, not merely similar ───────────────────
 *
 * `textDigest` is whitespace-stripped and cut at {@link TEXT_DIGEST_MAX} = **80**;
 * `semanticPath` at {@link SEMANTIC_PATH_MAX} = **120** — the same numbers as
 * v3-2's `l1/ref-store.ts`. The two constants are duplicated *deliberately* (this
 * bundle must not import a side-panel module), and `test/ref-capture.test.ts`
 * asserts the equality of both the constants and the rendered strings against
 * `ref-store.ts`, so a one-sided copy change fails the gate instead of silently
 * drifting.
 *
 * ── Zero judgement ──────────────────────────────────────────────────────────
 *
 * Nothing here decides whether a reference is usable (that is v3-2's single judge)
 * and nothing here reads the clipboard or the page's JS state. The output is raw
 * facts only — the exact field set v3-2's `RefFacts` consumes.
 *
 * @module content/ref-capture
 */

/** `textDigest` truncation length (pinned; mirrors `l1/ref-store.ts`). */
export const TEXT_DIGEST_MAX = 80;
/** `semanticPath` truncation length (pinned; mirrors `l1/ref-store.ts`). */
export const SEMANTIC_PATH_MAX = 120;
/** Structural-path depth cap (V34-O-3: 6 levels, then `…`). */
export const MAX_PATH_DEPTH = 6;
/** The identity mark written at capture; v3-2's D1 dimension reads it back. */
export const REF_MARK_ATTR = 'data-wcli-ref';
/** Whitespace-stripped selector length cap (same caliber as `semanticPath`). */
export const SELECTOR_MAX = 120;
/** Stable `data-*` keys, tried in this order before the structural fallback. */
export const STABLE_KEYS: readonly string[] = Object.freeze([
  'data-testid',
  'data-test-id',
  'data-key',
  'data-id',
  'data-name',
  'data-role',
  'data-component',
  'data-qa',
]);
/** Markers that make an element an editing surface (selection must not fire there). */
export const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
/** Minimum non-whitespace characters for a selection to become a reference. */
export const MIN_SELECTION_CHARS = 2;

/**
 * The structural node the caliber works on. `Element` satisfies it structurally, so
 * the live path needs no wrapper object — only the test path builds fakes.
 */
export interface CaptureNode {
  tagName: string;
  id?: string;
  textContent?: string | null;
  parentElement?: CaptureNode | null;
  /** Attribute lookup (`null` when absent), mirroring `Element#getAttribute`. */
  getAttribute(name: string): string | null;
  /** 1-based position among same-tag siblings (`Element#tagName` casing ignored). */
  siblingIndex?: number;
  /** How many siblings share this tag name (`1` = unambiguous). */
  siblingCount?: number;
}

/** Raw facts as observed on the page — no id, no verdict, no derived digest. */
export interface CaptureFacts {
  selector: string;
  semanticPath: string;
  textDigest: string;
  origin: string;
  documentId: string;
  navSeq: number;
  declarationHash: string;
  declarationVersion?: string;
  capturedAt: number;
}

/** The environment facts the page cannot know by itself (supplied by the panel). */
export interface CaptureEnv {
  origin: string;
  documentId: string;
  navSeq: number;
  declarationHash: string;
  declarationVersion?: string;
  capturedAt: number;
}

/** Whitespace-stripped truncation with a real ellipsis when it cut something. */
export function flatten(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, '');
}

/** The shared truncation (`ref-store.ts#truncate` renders the identical string). */
export function truncate(text: string | null | undefined, max: number): string {
  const flat = flatten(text);
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** `ref_3` → `3` (the shared ordinal the badge, the chip and the risk row use). */
export function refOrdinal(refId: string): string {
  const m = /^ref_(\d+)$/.exec(refId);
  return m ? m[1] : refId;
}

/** The ordinal glyph `①…⑩` (falls back to `#<n>` past ten) — v3-2's rendering. */
export const GLYPHS: readonly string[] = Object.freeze(['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']);
export function ordinalGlyph(refId: string): string {
  const n = Number(refOrdinal(refId));
  return Number.isFinite(n) && n >= 1 ? (GLYPHS[n - 1] ?? `#${n}`) : `#${refId}`;
}

/** `Element` → the structural view the pure functions consume. */
export function fromElement(el: Element): CaptureNode {
  const parent = el.parentElement;
  const tag = el.tagName.toUpperCase();
  let siblingIndex = 1;
  let siblingCount = 0;
  if (parent) {
    for (const child of Array.from(parent.children)) {
      if (child.tagName === el.tagName) {
        siblingCount += 1;
        if (child === el) siblingIndex = siblingCount;
      }
    }
  }
  return {
    tagName: tag,
    ...(el.id ? { id: el.id } : {}),
    textContent: el.textContent,
    parentElement: parent ? fromElementShallow(parent) : null,
    getAttribute: (name: string) => el.getAttribute(name),
    siblingIndex,
    siblingCount,
  };
}

/**
 * A parent view: full attributes, but `textContent` is dropped (a parent's text is
 * the concatenation of its subtree and would leak unrelated content into the path).
 */
function fromElementShallow(el: Element): CaptureNode {
  const parent = el.parentElement;
  let siblingIndex = 1;
  let siblingCount = 0;
  if (parent) {
    for (const child of Array.from(parent.children)) {
      if (child.tagName === el.tagName) {
        siblingCount += 1;
        if (child === el) siblingIndex = siblingCount;
      }
    }
  }
  return {
    tagName: el.tagName.toUpperCase(),
    ...(el.id ? { id: el.id } : {}),
    parentElement: parent ? fromElementShallow(parent) : null,
    getAttribute: (name: string) => el.getAttribute(name),
    siblingIndex,
    siblingCount,
  };
}

function tag(node: CaptureNode): string {
  return (node.tagName ?? '').toLowerCase();
}

function cssEscapeIdent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

function classFragment(node: CaptureNode): string {
  const raw = (node.getAttribute('class') ?? '').trim();
  if (!raw) return '';
  const first = cssEscapeIdent(raw.split(/\s+/)[0] ?? '');
  return first ? `.${first}` : '';
}

function attrFragment(node: CaptureNode): string {
  for (const key of STABLE_KEYS) {
    const value = node.getAttribute(key);
    if (value && value.trim()) return `[${key}="${value.trim().replace(/"/g, '\\"')}"]`;
  }
  return '';
}

/** `#id` → `[data-*="…"]` → `tag.class` → `tag` — never a structural step alone. */
function selectorStep(node: CaptureNode): string {
  if (node.id && node.id.trim()) return `#${cssEscapeIdent(node.id.trim())}`;
  const stable = attrFragment(node);
  if (stable) return `${tag(node)}${stable}`;
  return `${tag(node)}${classFragment(node)}`;
}

/** The `nth-of-type` suffix — only when the sibling set is ambiguous. */
function nthStep(node: CaptureNode): string {
  const total = node.siblingCount ?? 0;
  const index = node.siblingIndex ?? 0;
  return total > 1 && index >= 1 ? `:nth-of-type(${index})` : '';
}

/**
 * Short, stable selector for the element: the *first* step that uniquely identifies
 * it wins (`#id` → `data-*` key → `tag.class`), otherwise the parent chain is walked
 * and every step gets its `:nth-of-type` disambiguator. Capped at
 * {@link SELECTOR_MAX}.
 */
export function selectorFor(node: CaptureNode, maxDepth = MAX_PATH_DEPTH): string {
  const steps: string[] = [];
  let current: CaptureNode | null | undefined = node;
  let depth = 0;
  while (current && depth < maxDepth) {
    const step = selectorStep(current);
    const uniqueById = Boolean(current.id && current.id.trim());
    const uniqueByStable = !uniqueById && Boolean(attrFragment(current));
    const needsNth = !uniqueById && !uniqueByStable;
    steps.unshift(`${step}${needsNth ? nthStep(current) : ''}`);
    if (uniqueById || uniqueByStable) break;
    current = current.parentElement;
    depth += 1;
  }
  const joined = steps.join(' > ');
  return joined.length > SELECTOR_MAX ? `${joined.slice(0, SELECTOR_MAX)}…` : joined;
}

/** One readable step of the semantic path: `tag#id` / `tag[data-key]` / `tag`. */
function semanticStep(node: CaptureNode): string {
  if (node.id && node.id.trim()) return `${tag(node)}#${node.id.trim()}`;
  const stable = attrFragment(node);
  if (stable) return `${tag(node)}${stable}`;
  return `${tag(node)}${nthStep(node)}`;
}

/**
 * The semantic path — ancestor chain, **root-first**, at most
 * {@link MAX_PATH_DEPTH} levels, joined with ` › `, cut at
 * {@link SEMANTIC_PATH_MAX} with a trailing `…`. Deterministic: the same node
 * yields the same string twice in a row (asserted by the unit test).
 */
export function semanticPathFor(node: CaptureNode, maxDepth = MAX_PATH_DEPTH): string {
  const steps: string[] = [];
  let current: CaptureNode | null | undefined = node;
  let depth = 0;
  while (current && depth < maxDepth) {
    steps.unshift(semanticStep(current));
    current = current.parentElement;
    depth += 1;
  }
  const truncatedChain = depth >= maxDepth && current !== null && current !== undefined ? '… › ' : '';
  return truncate(`${truncatedChain}${steps.join(' › ')}`, SEMANTIC_PATH_MAX);
}

/** The element's own readable text, flattened and cut at {@link TEXT_DIGEST_MAX}. */
export function textDigestFor(node: CaptureNode): string {
  return truncate(node.textContent, TEXT_DIGEST_MAX);
}

/** `true` when the node (or an ancestor) is an editing surface. */
export function isEditableNode(node: CaptureNode | null | undefined): boolean {
  let current: CaptureNode | null | undefined = node;
  let depth = 0;
  while (current && depth < MAX_PATH_DEPTH + 4) {
    const name = tag(current);
    if (name === 'input' || name === 'textarea' || name === 'select') return true;
    const editable = current.getAttribute('contenteditable');
    if (editable === '' || editable === 'true') return true;
    current = current.parentElement;
    depth += 1;
  }
  return false;
}

/** The live-DOM form of {@link isEditableNode} (single definition of the intent). */
export function isEditableTarget(target: Element | null | undefined): boolean {
  if (!target) return false;
  return Boolean(target.closest?.(EDITABLE_SELECTOR));
}

/** Assemble the facts the panel consumes — raw observations only. */
export function captureFacts(node: CaptureNode, env: CaptureEnv): CaptureFacts {
  return {
    selector: selectorFor(node),
    semanticPath: semanticPathFor(node),
    textDigest: textDigestFor(node),
    origin: env.origin,
    documentId: env.documentId,
    navSeq: env.navSeq,
    declarationHash: env.declarationHash,
    ...(env.declarationVersion !== undefined ? { declarationVersion: env.declarationVersion } : {}),
    capturedAt: env.capturedAt,
  };
}

/** Write the identity mark the D1 dimension reads back (called once the id is known). */
export function markRef(el: Element, refId: string): void {
  try {
    el.setAttribute(REF_MARK_ATTR, refId);
  } catch {
    /* a frozen / SVG element: the mark is best-effort, the reference still works */
  }
}

/** The structural view of a page-side resolution report (no verdict, no judgement). */
export interface ResolutionReport {
  status: 'resolved' | 'missing' | 'ambiguous' | 'unreachable';
  refMark?: string;
  nodeCount?: number;
}

/**
 * Observe the page for one captured reference: how many nodes the selector matches
 * and which `data-wcli-ref` mark the (single) match carries. Takes no id on purpose
 * — the caller compares the *observed* mark against its own id (v3-2's D1), so this
 * module cannot "confirm" an identity it did not observe. Facts only; the verdict
 * stays v3-2's.
 */
export function resolveRef(selector: string, root?: ParentNode): ResolutionReport {
  const scope: ParentNode | undefined = root ?? (typeof document === 'undefined' ? undefined : document);
  if (!scope || !selector) return { status: 'unreachable' };
  let nodes: Element[] = [];
  try {
    nodes = Array.from(scope.querySelectorAll(selector));
  } catch {
    return { status: 'missing' };
  }
  if (nodes.length === 0) return { status: 'missing' };
  if (nodes.length > 1) return { status: 'ambiguous', nodeCount: nodes.length };
  const mark = nodes[0].getAttribute(REF_MARK_ATTR);
  // The mark is reported **as observed**. When it is absent the field stays absent:
  // v3-2's D1 dimension then reads「identity unconfirmed」and blocks (fail-closed).
  // Substituting the requested `refId` here would be the one thing this module must
  // never do — it would turn a neighbour element into a "confirmed" target.
  return {
    status: 'resolved',
    nodeCount: 1,
    ...(mark ? { refMark: mark } : {}),
  };
}
