/**
 * V4.5-1 W3 TASK-V45-108 (ADR-V45-002 §3) — the **decision region**, card-internalized.
 *
 * ── Why this module exists ───────────────────────────────────────────────────
 *
 * Before W3 the decision surface lived in a single fixed-position host
 * (`li[data-host="decision"]` / `#l0-decision`) *next to* the in-flow ask / auth cards:
 * the same ask produced two visible projections (the card's own options **and** the
 * shell's `#l0-more` / `#l1-more` option pool + `#l1-consequences` preview). W3 retires
 * the shell, so the pool and the preview have to live **inside the card that owns the
 * decision** — one fact, one carrier.
 *
 * ── The id contract (same precedent as `#ask*` / `#confirm*`) ────────────────
 *
 * Only the **newest open** decision card mints the legacy family
 * ({@link DECISION_REGION_IDS}); every earlier card has its ids **stripped** before the
 * new node is inserted, so `getElementById('l1-more')` can never resolve to a stale,
 * already-answered card (the v4-3 I-04 lesson). `data-card-key` remains the instance
 * identity, and historical cards keep their `data-*` payload.
 *
 * ── The three consequence paragraphs ─────────────────────────────────────────
 *
 * Shipped as MARKUP on the card (`#l1-consequence-tpl`) and cloned verbatim — the text
 * of the three rows is byte-for-byte the v3-2 copy (会发生什么 / 不会发生什么 /
 * 不可逆性声明). The auth card clones the very same template, so there is one source.
 */
import type { CardView, StreamPayload } from '../stream-model.js';
import { OTHER_OPTION_LABEL, isDestructiveOption } from '../view-model.js';
import type { CardDeps } from './shared.js';

/**
 * The legacy id family the **newest open** decision card mints. This is also the list
 * the builder strips from earlier cards, so「what is minted」and「what is de-duplicated」
 * cannot drift apart.
 */
export const DECISION_REGION_IDS: readonly string[] = Object.freeze([
  'l1-more-toggle',
  'l1-more',
  'l1-more-options',
  'l1-consequences-toggle',
  'l1-consequences',
  'l1-consequence-tpl',
]);

/** How many options the card renders inline before the「更多选项」pool (v4-3 card shape). */
export const CARD_VISIBLE_OPTIONS = 3;

/** `更多选项（还有 N 个）` — N = the options behind the trigger + the terminal item. */
export function moreOptionsLabel(foldedCount: number): string {
  return `更多选项（还有 ${foldedCount} 个）`;
}

/** The options that live behind the disclosure (the card shows the first three inline). */
export function foldedOptionsOf(payload: StreamPayload): string[] {
  return [...(payload.options ?? [])].slice(CARD_VISIBLE_OPTIONS);
}

/** The registered `更多选项` count: the folded options plus the terminal「其他…」item. */
export function foldedCountOf(payload: StreamPayload): number {
  return foldedOptionsOf(payload).length + 1;
}

/**
 * Strip the legacy family from every **earlier** card. Called before the new node is
 * inserted into the document, so a document-wide query can only match an older card.
 */
export function stripDecisionRegionIds(doc: Document): void {
  const selector = DECISION_REGION_IDS.map((id) => `#${id}`).join(', ');
  for (const stale of Array.from(doc.querySelectorAll(selector))) stale.removeAttribute('id');
}

/** The three mandatory paragraphs, byte-for-byte the v3-2 copy. */
export const CONSEQUENCE_TEMPLATE_ROWS: readonly { readonly text: string; readonly irreversible: boolean }[] =
  Object.freeze([
    Object.freeze({
      text: '会发生什么：选中「{{label}}」后本轮按该选项推进；含子命令时逐条写入审计（命令名 / 动作 id / 结果 / 耗时，零明文）。',
      irreversible: false,
    }),
    Object.freeze({
      text: '不会发生什么：不会放宽策略档、不会自动放行 evaluate、不会改动授权集合；确认前零命令下发。',
      irreversible: false,
    }),
    Object.freeze({
      text: '不可逆性声明：该选项含破坏性子命令，执行后无法从插件侧撤销（审计保留记录，不保留明文）。',
      irreversible: true,
    }),
  ]);

/** The `<template id="l1-consequence-tpl">` node (markup, cloned later). */
export function buildConsequenceTemplate(doc: Document): HTMLTemplateElement {
  const tpl = doc.createElement('template');
  tpl.id = 'l1-consequence-tpl';
  for (const row of CONSEQUENCE_TEMPLATE_ROWS) {
    const div = doc.createElement('div');
    div.className = 'l1-row';
    div.setAttribute('data-tpl', '');
    if (row.irreversible) div.setAttribute('data-irreversible', '');
    div.textContent = row.text;
    tpl.content.appendChild(div);
  }
  return tpl;
}

/**
 * Mount the decision region into an **open** ask / auth card:
 *
 *   `<div class="card-more">` → the「更多选项（还有 N 个）」trigger + `#l1-more` (the
 *   option pool, default `hidden`) + the consequence preview trigger + `#l1-consequences`
 *   + the three-paragraph template.
 *
 * The trigger goes through the ONE disclosure controller (`deps.disclosure`), so the card
 * owns no second folding mechanism; the pool itself only renders when it has content
 * (a card with ≤3 options mints the trigger with the honest「还有 1 个」→ the terminal item).
 */
export function mountDecisionRegion(view: CardView, deps: CardDeps, col: HTMLElement): void {
  const doc = deps.doc;
  const payload = view.payload;
  const folded = foldedOptionsOf(payload);
  const allOptions = [...(payload.options ?? [])];

  stripDecisionRegionIds(doc);

  const wrap = doc.createElement('div');
  wrap.className = 'card-more';

  const trigger = doc.createElement('button');
  trigger.id = 'l1-more-toggle';
  trigger.type = 'button';
  trigger.setAttribute('data-disclose', 'l1-more');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'l1-more');
  trigger.setAttribute('data-count', String(folded.length + 1));
  trigger.textContent = moreOptionsLabel(folded.length + 1);
  trigger.addEventListener('click', () => {
    const controller = deps.disclosure;
    if (!controller) return;
    try {
      controller.toggle('l1-more');
    } catch {
      /* a whitelist violation must never be reachable from a click */
    }
  });
  wrap.appendChild(trigger);

  const pool = doc.createElement('div');
  pool.id = 'l1-more';
  pool.setAttribute('data-l1-panel', 'l1-more');
  pool.hidden = true;

  const options = doc.createElement('div');
  options.className = 'row';
  options.id = 'l1-more-options';
  for (const label of folded) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-key', `ask-folded:${label}`);
    btn.textContent = label;
    btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'choose', label));
    options.appendChild(btn);
  }
  // The terminal item is minted together with the pool (the trigger already reports it
  // in its count), and it reveals the card's own fallback input in place.
  const terminal = doc.createElement('button');
  terminal.type = 'button';
  terminal.setAttribute('data-key', 'ask-other');
  terminal.setAttribute('aria-expanded', 'false');
  terminal.setAttribute('aria-controls', 'ask-fallback');
  terminal.textContent = OTHER_OPTION_LABEL;
  terminal.addEventListener('click', () => deps.onRevealFallback?.());
  options.appendChild(terminal);
  pool.appendChild(options);

  const entry = doc.createElement('div');
  entry.className = 'l1-entry';
  entry.textContent = '末项固定为「其他…（我来描述）」；选中它就地展开输入框。';
  pool.appendChild(entry);

  const consTrigger = doc.createElement('button');
  consTrigger.id = 'l1-consequences-toggle';
  consTrigger.type = 'button';
  consTrigger.setAttribute('data-disclose', 'l1-consequences');
  consTrigger.setAttribute('aria-expanded', 'false');
  consTrigger.setAttribute('aria-controls', 'l1-consequences');
  consTrigger.textContent = `选项后果与影响预演（${allOptions.length} 个选项）`;
  consTrigger.addEventListener('click', () => {
    const controller = deps.disclosure;
    if (!controller) return;
    try {
      controller.toggle('l1-consequences');
    } catch {
      /* ditto */
    }
  });
  pool.appendChild(consTrigger);

  const consHost = doc.createElement('div');
  consHost.id = 'l1-consequences';
  consHost.setAttribute('data-l1-panel', 'l1-consequences');
  consHost.hidden = true;
  pool.appendChild(consHost);

  const tpl = buildConsequenceTemplate(doc);
  pool.appendChild(tpl);
  wrap.appendChild(pool);
  col.appendChild(wrap);

  fillConsequences(consHost, allOptions, tpl);
}

/**
 * Fill the consequence preview: one block per option, each carrying the three cloned
 * paragraphs (`{{label}}` substituted) and the irreversibility mark only for
 * destructive options — the v3-2 semantics, unchanged.
 */
export function fillConsequences(host: HTMLElement, options: readonly string[], tpl: HTMLTemplateElement | null): void {
  const doc = host.ownerDocument;
  host.textContent = '';
  for (const label of options) {
    const fragment = tpl?.content.cloneNode(true) as DocumentFragment | undefined;
    const block = doc.createElement('div');
    block.setAttribute('data-consequence', label);
    block.setAttribute('data-destructive', String(isDestructiveOption(label)));
    if (fragment) block.appendChild(fragment);
    for (const node of Array.from(block.querySelectorAll('[data-tpl]'))) {
      node.textContent = (node.textContent ?? '').replace(/\{\{label\}\}/g, label);
    }
    const irreversible = block.querySelector('[data-irreversible]') as HTMLElement | null;
    if (irreversible) irreversible.hidden = !isDestructiveOption(label);
    host.appendChild(block);
  }
}
