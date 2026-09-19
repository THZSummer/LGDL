/**
 * V4-4 TASK-801 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the **reference card**
 * (本叶 ADR-V4-035 / FR-CHAT-050~052 / AC-CHAT-012 / shim E2~E5 / EC-CHAT-005).
 *
 * ── What the card is ─────────────────────────────────────────────────────────
 *
 * `l1/ref-store.ts` remains the **single source of truth** for references (the
 * five-dimension fail-closed judge, the monotonic never-reused ordinal, the
 * retirement-without-deletion semantics — all unchanged). The `ref` card is a
 * **projection + event record** (O-CHAT-002②): the model owns the facts, the card
 * renders them.
 *
 * The projection points stay at **three** (ADR-V4-035 decision 1) — the page-side
 * badge (`pick-layer.js`, untouched), this in-stream card (which **absorbs** the
 * former L0 chip `#l0-ref-toggle` + L1 evidence panel `#l1-ref`), and the status
 * bar risk chip. The total number of projection points therefore does **not**
 * grow.
 *
 * ── Valid vs stale (shim E3 / E4) ────────────────────────────────────────────
 *
 *   · **valid** — ordinal + label + the evidence layer（选择器 / 语义路径 / 文本摘要 /
 *     捕获时间）rendered as a `<details>` (collapsed: read-only projections do not
 *     spend visible density budget).
 *   · **stale** — `data-ref-state="stale"` + `.ref-stale-why` (the judge's readable
 *     reason) + `[data-act="repick"]` + `[data-act="describe"]`; the「改用描述」
 *     fallback input is **collapsed by default** (shim E4) and only appears when the
 *     user asks for it.
 *
 * The old card is **never rewritten**: a re-pick / re-anchor is a NEW `ref` event
 * minted by the reducer (`refNum+1`), and the old `<li>` keeps its exact DOM
 * (append-only, the R3 discipline).
 *
 * @module ui/sidepanel/cards/ref
 */
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

/** The default stale reason when the judge gave none (fail-closed). */
export const REF_STALE_FALLBACK_WHY = '引用不可用（按失效处理）';

/** The「改用描述」fallback input's class (collapsed by default — shim E4). */
export const REF_FALLBACK_CLASS = 'ref-fallback';

/**
 * Create one `ref` card `<li>`.
 *
 * Clickables: valid = **0** (the evidence layer is a read-only `<details>`, whose
 * `<summary>` is not counted as an action control); stale = **2**
 * (`repick` / `describe`) + the collapsed fallback input, matching the ledger's
 * per-card budget (ref-stale = 2).
 */
export function createRefCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const state = view.payload.refState ?? 'valid';
  const num = view.payload.refNum ?? 1;
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-ref'], CARD_TAG_LABELS.ref);
  li.setAttribute('data-ref-state', state);
  li.setAttribute('data-ref-num', String(num));

  // ① 序号 chip（三处同序号的流内侧）—— 只读，不是可点控件。
  const chips = doc.createElement('div');
  chips.className = 'ref-chips';
  const numChip = doc.createElement('span');
  numChip.className = 'ref-chip';
  numChip.textContent = view.payload.refLabel ?? `#${num} （引用）`;
  chips.appendChild(numChip);
  col.appendChild(chips);

  // ② 证据层（只读投影；`<details>` 收起 ⇒ 不占可见密度预算）。
  const evidence = doc.createElement('details');
  evidence.className = 'ref-evidence';
  const evSummary = doc.createElement('summary');
  evSummary.textContent = '引用证据（选择器 / 语义路径 / 文本摘要 / 捕获时间，只读）';
  evidence.appendChild(evSummary);
  const evRows = doc.createElement('div');
  evRows.className = 'l1-rows ref-evidence-rows';
  for (const row of view.payload.refEvidence ?? []) {
    const line = doc.createElement('div');
    line.className = 'l1-row';
    line.textContent = row;
    evRows.appendChild(line);
  }
  evidence.appendChild(evRows);
  col.appendChild(evidence);

  if (state !== 'stale') return li;

  // ③ 失效态：可读原因 + 两条恢复路径。
  const why = doc.createElement('p');
  why.className = 'ref-stale-why hint';
  why.textContent = view.payload.refWhy ?? REF_STALE_FALLBACK_WHY;
  col.appendChild(why);

  const row = doc.createElement('div');
  row.className = 'ref-actions';
  for (const [act, text] of [
    ['repick', '重新拾取'],
    ['describe', '改用描述'],
  ] as const) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-act', act);
    btn.textContent = text;
    // BLOCK-03 (v4-4 review):「改用描述」is a card-LOCAL disclosure, not a business
    // action — it only toggles the collapsed fallback below (the listener is attached
    // after the loop). Routing it through `onCardAction` used to reveal a SECOND
    // fallback input (「另铸一张 askuser 文本卡」) and left two coexisting owners.
    if (act === 'repick') btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, act));
    row.appendChild(btn);
  }
  col.appendChild(row);

  // ④「改用描述」兜底输入 —— **默认收起**（shim E4）；点开才出现。
  const fallback = doc.createElement('form');
  fallback.className = REF_FALLBACK_CLASS;
  fallback.hidden = true;
  const input = doc.createElement('input');
  input.type = 'text';
  input.className = 'ref-fallback-input';
  input.placeholder = '用一句话描述这个元素…';
  input.autocomplete = 'off';
  const submit = doc.createElement('button');
  submit.type = 'submit';
  submit.textContent = '按描述继续';
  fallback.append(input, submit);
  // BLOCK-03: the submission has a REAL handler (`handleCardAction('describe-submit')`
  // → the existing text-ask fallback card is settled with the description). Before,
  // the dispatched action had no branch and fell into the「将在 v4-4 落地」placeholder.
  fallback.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    deps.onCardAction?.(view.cardId, 'describe-submit', value);
  });
  col.appendChild(fallback);

  // The fallback toggle is LOCAL DOM state (the toggle itself is not a business
  // action): the card owns its own disclosure, so no second event source exists.
  row.querySelector('[data-act="describe"]')?.addEventListener('click', () => {
    fallback.hidden = !fallback.hidden;
    if (!fallback.hidden) input.focus();
  });
  return li;
}
