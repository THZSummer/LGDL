/**
 * V4-3 TASK-702 (leaf `specs-tree-v4-3-ask-auth-inflow`) — the **ask-user card**
 * (choice / text), fully implemented: the open form, the two固化 states and the
 * "no second answer" structural guarantee (父 ADR-V4-030 / FR-CHAT-040~042 /
 * AC-CHAT-003 / AC-CHAT-005 / shim C1~C11).
 *
 * ── The three invariants this module makes structural ────────────────────────
 *
 *  ① **A terminal card renders NO control.** `data-answered` alone would be a
 *     convention a later edit could drift from; instead the form node is never
 *     created for a frozen view and {@link patchAskuserCard} **removes** it on the
 *     transition. So `terminalCard.querySelectorAll('button,input,select,textarea')`
 *     is 0 by construction (shim C9 / D6).
 *  ② **Cancel is a trace, never a default.** Both terminal copies come from
 *     {@link ASK_COPY} (single source) and neither carries a default value.
 *  ③ **The choice fallback is collapsed by default.** The 「其他…（我来描述）」 entry
 *     reveals the free-text input in place (`hidden` until clicked — 法四: no
 *     resident input on the default screen, shim C4).
 *
 * ── The legacy id contract (`#ask*`) is preserved on the OPEN card ───────────
 *
 * At most one open ask card exists in practice (ADR-V4-032 caps the set at 2 and
 * the second is an auth card), so the v3 selectors `#ask` / `#ask-prompt` /
 * `#ask-options` / `#ask-input` / `#ask-submit` / `#ask-cancel` / `#ask-fallback`
 * keep resolving — they now resolve to the stream card instead of the retired
 * decision slot (ADR-V4-030 decision 6). `data-card-key` is the instance identity.
 *
 * @module ui/sidepanel/cards/askuser
 */
import { ASK_COPY } from '../stream-plaintext.js';
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell, createFixedRegion, fixedText, type CardDeps } from './shared.js';

/** `data-answered` for an ask card (shim C5/C6/C10 verbatim). */
export function answeredState(view: CardView): 'false' | 'true' | 'cancelled' {
  if (view.terminal === 'answered') return 'true';
  if (view.terminal === 'cancelled') return 'cancelled';
  return 'false';
}

/** The固化 copy of an ask card, derived from its terminal state only (C7 / C10). */
export function askFixedText(view: CardView): string {
  if (view.terminal === 'cancelled') return ASK_COPY.cancelled;
  return `${ASK_COPY.answeredPrefix}${view.payload.answer ?? ''}`;
}

function clockText(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** The `.card-fixed` region, populated + revealed (shared by create and patch). */
export function fillAskFixed(node: HTMLElement, view: CardView): void {
  const fixed = node.querySelector('.card-fixed') as HTMLElement | null;
  if (!fixed) return;
  const b = fixed.querySelector('b');
  if (b) b.textContent = askFixedText(view);
  const ts = fixed.querySelector('.card-fixed-time') as HTMLElement | null;
  if (ts) ts.textContent = clockText(view.terminalTs ?? view.ts);
  fixed.hidden = false;
}

/** Build the terminal DOM: no form, only the固化 region (C9 structural). */
function buildTerminal(col: HTMLElement, view: CardView, doc: Document): void {
  const fixed = createFixedRegion(doc, 'ask-fixed');
  fixed.append(
    fixedText(doc, 'ask-fixed-text', askFixedText(view)),
    clockTextNode(doc, view.terminalTs ?? view.ts),
  );
  fixed.hidden = false;
  col.appendChild(fixed);
}

function clockTextNode(doc: Document, ts: number): HTMLElement {
  const el = doc.createElement('time');
  el.className = 'ts card-fixed-time';
  el.setAttribute('datetime', new Date(ts).toISOString());
  el.textContent = clockText(ts);
  return el;
}

/**
 * The open form. The legacy id family (`#ask` / `#ask-prompt` / `#ask-options` /
 * `#ask-fallback` / `#ask-input` / `#ask-submit` / `#ask-cancel`) is written HERE,
 * on the open card only — the terminal branch never mints them.
 */
function buildForm(view: CardView, deps: CardDeps, col: HTMLElement): void {
  const doc = deps.doc;
  const askKind = view.payload.askKind ?? 'text';
  const ask = doc.createElement('div');
  ask.id = 'ask';
  ask.className = `ask-form ask-${askKind}`;

  const prompt = doc.createElement('div');
  prompt.id = 'ask-prompt';
  prompt.className = 'ask-q';
  prompt.textContent = view.payload.prompt ?? '（无问题文本）';
  ask.appendChild(prompt);

  const options = doc.createElement('div');
  options.id = 'ask-options';
  options.className = 'row';
  ask.appendChild(options);

  const fallback = doc.createElement('div');
  fallback.id = 'ask-fallback';
  fallback.className = 'ask-fallback';
  fallback.hidden = askKind !== 'text';

  const input = doc.createElement('input');
  input.id = 'ask-input';
  input.type = 'text';
  input.className = 'ask-input';
  input.placeholder = '输入回答…';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', '回答');
  const submit = doc.createElement('button');
  submit.id = 'ask-submit';
  submit.type = 'button';
  submit.className = 'btn-primary';
  submit.setAttribute('data-act', 'answer');
  submit.textContent = '回答';
  submit.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'answer', input.value));
  const cancel = doc.createElement('button');
  cancel.id = 'ask-cancel';
  cancel.type = 'button';
  cancel.setAttribute('data-act', 'cancel');
  cancel.textContent = '取消';
  cancel.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'cancel'));
  const hint = doc.createElement('span');
  hint.className = 'hint';
  hint.textContent = '取消 = 回答被取消（不代填默认值）';
  fallback.append(input, submit, cancel, hint);
  ask.appendChild(fallback);

  if (askKind === 'choice') {
    for (const option of [...(view.payload.options ?? [])].slice(0, 3)) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.setAttribute('data-act', 'choose');
      btn.textContent = option;
      btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'choose', option));
      options.appendChild(btn);
    }
    const other = doc.createElement('button');
    other.type = 'button';
    other.id = 'ask-other';
    other.className = 'choice';
    other.setAttribute('data-act', 'choose-other');
    other.setAttribute('aria-expanded', 'false');
    other.setAttribute('aria-controls', 'ask-fallback');
    other.textContent = '其他…（我来描述）';
    other.addEventListener('click', () => {
      fallback.hidden = !fallback.hidden;
      other.setAttribute('aria-expanded', String(!fallback.hidden));
      if (!fallback.hidden) input.focus();
    });
    options.appendChild(other);
  }
  col.appendChild(ask);
}

/** Create an `askuser` card. A frozen view is built terminal-only. */
export function createAskuserCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const askKind = view.payload.askKind ?? 'text';
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-ask'], CARD_TAG_LABELS.askuser);
  li.setAttribute('data-ask-kind', askKind);
  li.setAttribute('data-answered', answeredState(view));

  if (view.frozen) {
    buildTerminal(col, view, doc);
  } else {
    buildForm(view, deps, col);
    const fixed = createFixedRegion(doc, 'ask-fixed');
    fixed.append(fixedText(doc, 'ask-fixed-text', ASK_COPY.answeredPrefix), clockTextNode(doc, view.ts));
    col.appendChild(fixed);
  }

  const reason = view.payload.cancelReason;
  if (view.frozen && reason) li.setAttribute('data-cancel-reason', reason);
  return li;
}

/**
 * Apply the terminal transition to an **open** ask card: remove the form node
 * (never merely `disabled`), flip `data-answered`, reveal the固化 region. Called
 * exactly once (the renderer freezes the node right after).
 */
export function patchAskuserCard(view: CardView, node: HTMLElement): void {
  node.setAttribute('data-answered', answeredState(view));
  const reason = view.payload.cancelReason;
  if (reason) node.setAttribute('data-cancel-reason', reason);
  const form = node.querySelector('.ask-form');
  if (form) form.remove();
  fillAskFixed(node, view);
}
