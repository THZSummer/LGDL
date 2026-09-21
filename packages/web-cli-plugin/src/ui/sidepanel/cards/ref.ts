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
 * V4.5-1 W3 (TASK-V45-108 / ADR-V45-002 §3) — the legacy id family the **newest** `ref`
 * card mints (the v3 L1 evidence panel + its two recovery paths + the conditional
 * re-anchor). Every earlier card has the family stripped before the new node is inserted,
 * exactly like `#ask*` / `#confirm*`, so `getElementById('l1-ref')` can never resolve to a
 * superseded reference.
 */
export const REF_REGION_IDS: readonly string[] = Object.freeze([
  'l1-ref',
  'l1-ref-summary',
  'l1-ref-rows',
  'l1-ref-actions',
  'l1-ref-repick',
  'l1-ref-describe',
  'l1-ref-rescue',
  'l1-ref-reason',
]);

/** The evidence summary line (verbatim from the retired `#l1-ref-summary` markup). */
export const REF_EVIDENCE_SUMMARY = '引用条：选择器 / 语义路径 / 文本摘要 / 捕获时间（证据层只读）。';

function stripRefRegionIds(doc: Document): void {
  const selector = REF_REGION_IDS.map((id) => `#${id}`).join(', ');
  for (const stale of Array.from(doc.querySelectorAll(selector))) stale.removeAttribute('id');
}

/**
 * Create one `ref` card `<li>`.
 *
 * ── V4.5-1 W3: the card absorbs the retired L1 evidence panel ────────────────
 *
 * The former L0 chip (`#l0-ref-toggle` + `#l0-ref-badge`) and the L1 evidence panel
 * (`#l1-ref*`, with its two recovery buttons and the conditional re-anchor) are **gone
 * from the shell**; the card carries them:
 *
 *   · the chip (`.ref-chip`, with the `data-ref-stale` risk attribution) states the
 *     ordinal / label and the invalidation mark (`.ref-stale-badge`);
 *   · `#l1-ref` is the read-only `<details>` evidence region, `#l1-ref-rows` its rows;
 *   · `#l1-ref-actions` holds the three recovery buttons — `#l1-ref-repick` /
 *     `#l1-ref-describe` / `#l1-ref-rescue`. The rescue button's visibility is still
 *     driven by the ONE judge (「唯一文本匹配时可见」逐字不变, EC-V45-005); the card only
 *     renders it `hidden` and lets `l1/panels.ts` reveal it live.
 *
 * Clickables: valid = **0** (the evidence layer is a read-only `<details>`, whose
 * `<summary>` is not counted as an action control); stale = **2**
 * (`repick` / `describe`) + the collapsed fallback input, matching the ledger's
 * per-card budget (ref-stale = 2). `#l1-ref-rescue` starts `hidden`, so it never
 * inflates the default reading.
 */
export function createRefCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const state = view.payload.refState ?? 'valid';
  const num = view.payload.refNum ?? 1;
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-ref'], CARD_TAG_LABELS.ref);
  li.setAttribute('data-ref-state', state);
  li.setAttribute('data-ref-num', String(num));

  stripRefRegionIds(doc);

  // ① 序号 chip + 失效徽标（退役的 `#l0-ref-toggle` / `#l0-ref-badge` 角色的卡内承载；
  //    `data-ref-stale` 让密度口径继续把这段文字归因到风险增量）。
  const chips = doc.createElement('div');
  chips.className = 'ref-chips';
  const numChip = doc.createElement('span');
  numChip.className = 'ref-chip';
  numChip.setAttribute('data-ref-stale', String(state === 'stale'));
  numChip.textContent = view.payload.refLabel ?? `#${num} （引用）`;
  const staleBadge = doc.createElement('span');
  staleBadge.className = 'ref-stale-badge';
  staleBadge.setAttribute('data-ref-stale', String(state === 'stale'));
  staleBadge.textContent = '失效';
  staleBadge.hidden = state !== 'stale';
  // V4.5-1 W3：页面侧角标的 hover 通道现在落在**卡内 chip** 上（退役的 `#l0-ref-toggle`
  // 是唯一入口）。卡片只上报意图，闪动由面板的同一生产入口执行 —— 不新增监听面。
  numChip.addEventListener('pointerenter', () => deps.onCardAction?.(view.cardId, 'hover'));
  chips.append(numChip, staleBadge);
  col.appendChild(chips);

  // ② 证据层（`#l1-ref`，只读投影；`<details>` 收起 ⇒ 不占可见密度预算）。
  const evidence = doc.createElement('details');
  evidence.className = 'ref-evidence';
  evidence.id = 'l1-ref';
  evidence.open = state === 'stale';
  const evSummary = doc.createElement('summary');
  evSummary.id = 'l1-ref-summary';
  evSummary.textContent = REF_EVIDENCE_SUMMARY;
  evidence.appendChild(evSummary);
  const evRows = doc.createElement('div');
  evRows.id = 'l1-ref-rows';
  evRows.className = 'l1-rows ref-evidence-rows';
  for (const row of view.payload.refEvidence ?? []) {
    const line = doc.createElement('div');
    line.className = 'l1-row';
    line.textContent = row;
    evRows.appendChild(line);
  }
  evidence.appendChild(evRows);

  // ③ 恢复区（三恢复按钮；`hidden` 直到判定为不可用 —— 谓词由唯一判定器驱动）。
  const actions = doc.createElement('div');
  actions.className = 'row ref-actions';
  actions.id = 'l1-ref-actions';
  actions.hidden = state !== 'stale';
  const repick = doc.createElement('button');
  repick.id = 'l1-ref-repick';
  repick.type = 'button';
  repick.setAttribute('data-act', 'repick');
  repick.textContent = '重新拾取';
  repick.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'repick'));
  const describe = doc.createElement('button');
  describe.id = 'l1-ref-describe';
  describe.type = 'button';
  describe.setAttribute('data-act', 'describe');
  describe.textContent = '改用描述';
  const rescue = doc.createElement('button');
  rescue.id = 'l1-ref-rescue';
  rescue.type = 'button';
  rescue.setAttribute('data-rescue', 'none');
  rescue.textContent = '一键重锚（文本唯一匹配）';
  rescue.hidden = true;
  rescue.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'reanchor'));
  const reason = doc.createElement('span');
  reason.className = 'l1-hint';
  reason.id = 'l1-ref-reason';
  reason.textContent = state === 'stale' ? (view.payload.refWhy ?? REF_STALE_FALLBACK_WHY) : '';
  actions.append(repick, describe, rescue, reason);
  evidence.appendChild(actions);

  if (state === 'stale') {
    const why = doc.createElement('p');
    why.className = 'ref-stale-why hint';
    why.textContent = view.payload.refWhy ?? REF_STALE_FALLBACK_WHY;
    evidence.appendChild(why);
  }
  col.appendChild(evidence);

  if (state !== 'stale') return li;

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
  describe.addEventListener('click', () => {
    fallback.hidden = !fallback.hidden;
    if (!fallback.hidden) input.focus();
  });
  return li;
}
