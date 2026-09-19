/**
 * V4-4 TASK-805 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the **next-step
 * recommendation card** (本叶 ADR-V4-037 / FR-CHAT-061~063 / AC-CHAT-013 /
 * shim B4 / EC-CHAT-008).
 *
 * ── chips 即指令 ─────────────────────────────────────────────────────────────
 *
 * A chip is not a suggestion that fills the composer — clicking it **starts the
 * turn**. The card therefore reports a single intent (`onCardAction(cardId,'next',
 * chip)`), and the panel routes it through the **same production entry** as the
 * composer submit (`requestTurn`). That is what makes「直接发起回合」(FR-CHAT-061)
 * and「与 `pending` 门控一致」(FR-CHAT-063) structural rather than duplicated: there
 * is exactly one path, so the two can never disagree.
 *
 * ── 上限与门控 ──────────────────────────────────────────────────────────────
 *
 *   · {@link MAX_CHIPS_PER_CARD} = 3 (⇒ single-card clickables ≤ 6 with the
 *     fallback, per the v4-2 card-budget ruling);
 *   · `pending === true` ⇒ every chip is `disabled` + `aria-disabled="true"`
 *     (**not hidden** — hiding would reflow the card) AND the producer is not
 *     allowed to mint a new card ({@link syncNextstepPending} reflects the state on
 *     the already-rendered chips; `recommend.ts` refuses to produce while pending);
 *   · no candidates ⇒ **no card** (EC-CHAT-008: 「下一步：无」式假推荐 is forbidden).
 *
 * @module ui/sidepanel/cards/nextstep
 */
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell } from './shared.js';
import type { CardDeps } from './shared.js';

/** At most this many chips render on one card (`MAX_CHIPS_PER_CARD`, ADR-V4-037). */
export const MAX_CHIPS_PER_CARD = 3;

/** The class every chip button carries (the availability sync + the gate read it). */
export const NEXT_CHIP_CLASS = 'next-chip';

/**
 * Create one `nextstep` card `<li>`. `chips` beyond {@link MAX_CHIPS_PER_CARD} are
 * dropped (the producer is supposed to respect the cap; the card enforces it too so
 * a future producer cannot silently exceed the per-card budget).
 */
export function createNextstepCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(
    view,
    deps,
    ['entry-assistant', 'msg', 'msg-assistant', 'msg-next'],
    CARD_TAG_LABELS.nextstep,
  );
  const chips = doc.createElement('div');
  chips.className = 'next-chips';
  const acts = view.payload.nextstepActs ?? [];
  const texts = (view.payload.chips ?? []).slice(0, MAX_CHIPS_PER_CARD);
  texts.forEach((chip, i) => {
    const act = acts[i] ?? 'next';
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = NEXT_CHIP_CLASS;
    btn.setAttribute('data-act', act);
    btn.setAttribute('data-chip-index', String(i));
    btn.textContent = chip;
    btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, act, chip));
    chips.appendChild(btn);
  });
  if (view.payload.nextstepRule) li.setAttribute('data-nextstep-rule', view.payload.nextstepRule);
  col.appendChild(chips);
  return li;
}

/**
 * Reflect the live `pending` gate on every rendered recommendation chip.
 *
 * This is an **availability** update, not a content patch: the chip's label and the
 * card's facts are never rewritten (the append-only discipline holds), only the
 * `disabled` / `aria-disabled` pair — which is exactly what FR-CHAT-063 requires to
 * be observable (「禁用而不隐藏」).
 */
export function syncNextstepPending(container: ParentNode, pending: boolean): void {
  const chips = container.querySelectorAll<HTMLButtonElement>(`button.${NEXT_CHIP_CLASS}`);
  for (const chip of chips) {
    chip.disabled = pending;
    chip.setAttribute('aria-disabled', String(pending));
  }
}

/** `true` when the card carries at least one chip (the「无候选不渲染」inverse). */
export function hasChips(view: CardView): boolean {
  return (view.payload.chips?.length ?? 0) > 0;
}
