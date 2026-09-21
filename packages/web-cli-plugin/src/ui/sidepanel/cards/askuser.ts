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
 * I-04 (v4-3 review): the model **does** allow two `askuser` cards to coexist
 * (`MAX_OPEN_ASKS = 2`, and `test/ask-auth-inflow.test.ts` ② builds exactly that
 * state), so the v3 selectors can no longer be minted unconditionally — duplicate
 * HTML ids would make every legacy reader (`revealFallback`, L1) resolve to the
 * *first* match while the user interacts with the second card. `buildForm`
 * therefore strips the whole `#ask*` family from any earlier card before minting it
 * on the newest one (the same「newest open card owns the legacy id」guard the auth
 * card already had). `data-card-key` remains the instance identity.
 *
 * @module ui/sidepanel/cards/askuser
 */
import { ASK_COPY } from '../stream-plaintext.js';
import type { CardView } from '../stream-model.js';
import { mountDecisionRegion } from './decision-region.js';
import { CARD_TAG_LABELS, createCardShell, createFixedRegion, fixedText, type CardDeps } from './shared.js';

/**
 * The `#ask*` id family the OPEN card mints (the v3 selectors). I-04: this is also
 * the list {@link buildForm} strips from earlier cards, so the set can never drift
 * between「what is minted」and「what is de-duplicated」.
 */
const LEGACY_ASK_IDS: readonly string[] = Object.freeze([
  'ask',
  'ask-prompt',
  'ask-options',
  'ask-fallback',
  'ask-input',
  'ask-submit',
  'ask-cancel',
  'ask-other',
]);

/**
 * I-03 (v4-3 review) — the mutual disclosure of the choice card's two surfaces,
 * **scoped to one card**.
 *
 * Opening the「其他…（我来描述）」fallback collapses the option rows and vice versa,
 * so the expanded card carries input + submit + cancel + the toggle = **4** visible
 * clickables (≤ `MAX_CLICKABLES_PER_CARD = 6`), and two expanded cards stay at
 * 8 = `MAX_STREAM_RESIDENT_CLICKABLES`. Without it the expanded card reached 7
 * (3 options + toggle + input + submit + cancel) and two expanded cards 14 — see
 * `docs/v4-density-baseline.json#knownLimitations` (HO-1 / I-03) and the expanded
 * state judgement in `test/ui/ask-auth-inflow.mjs` ⑪.
 *
 * The scope is the card's own `.ask-form` on purpose: since I-04 only the newest open
 * card owns the `#ask*` legacy ids, so a document-level lookup would toggle the wrong
 * card when two `askuser` cards coexist (measured: the two per-card clicks cancelled
 * each other out and both cards stayed collapsed).
 */
export function setCardFallbackOpen(cardForm: HTMLElement, open: boolean): void {
  const fallback = cardForm.querySelector('.ask-fallback') as HTMLElement | null;
  if (fallback) fallback.hidden = !open;
  const other = cardForm.querySelector('[data-act="choose-other"]') as HTMLElement | null;
  if (other) other.setAttribute('aria-expanded', String(open));
  for (const btn of Array.from(cardForm.querySelectorAll<HTMLElement>('[data-act="choose"]'))) {
    btn.hidden = open;
  }
  // V4.5-1 W3 (TASK-V45-108): the card-internalized option pool (the decision region's
  //「更多选项」trigger) is a THIRD way to answer, so it joins the same mutual disclosure —
  // otherwise an expanded card would reach 5 clickables and two cards 10 > the 8 cap.
  for (const trigger of Array.from(cardForm.querySelectorAll<HTMLElement>('[data-disclose="l1-more"]'))) {
    trigger.hidden = open;
  }
  if (open) (cardForm.querySelector('input') as HTMLInputElement | null)?.focus();
}

/**
 * The **document-level** form of the same disclosure, for the panel's own「改用描述」
 * entry (`l0/shell.ts#revealFallback`). It resolves the card that currently owns the
 * legacy `#ask-fallback` id and delegates to {@link setCardFallbackOpen} — so both
 * entry points produce the identical DOM state.
 */
export function setAskFallbackOpen(doc: Document, open: boolean): void {
  const fallback = doc.getElementById('ask-fallback');
  const form = fallback?.closest('.ask-form') as HTMLElement | null;
  if (form) {
    setCardFallbackOpen(form, open);
    return;
  }
  const other = doc.getElementById('ask-other');
  if (other) other.setAttribute('aria-expanded', String(open));
}

/** `data-answered` for an ask card (shim C5/C6/C10 verbatim). */
export function answeredState(view: CardView): 'false' | 'true' | 'cancelled' {
  if (view.terminal === 'answered') return 'true';
  if (view.terminal === 'cancelled') return 'cancelled';
  return 'false';
}

/** The固化 copy of an ask card, derived from its terminal state only (C7 / C10). */
export function askFixedText(view: CardView): string {
  if (view.terminal === 'cancelled') return ASK_COPY.cancelled;
  // V5-2 TASK-V5-135 (ADR-V5-002 §2 / FR-ALLN-022, 法八): the masked card固化s the
  // **fact** — written / masked / a length CATEGORY — never the value, never a prefix.
  // The category (`8+` / `8-`) is what narrows the side channel (ADR-V5-010 §2).
  if (view.payload.askKind === 'secret') {
    const n = view.payload.maskedLength;
    return ASK_COPY.secretWritten.replace('{n}', n !== undefined && n >= 8 ? '8+' : '8-');
  }
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
 * V5-2 **TASK-V5-138** (ADR-V5-002 §2 · ADR-V5-004 §3 · FR-ALLN-043 · AC-ALLN-007) —
 * the `form` card's **multi-select** construction: one checkbox per option from
 * `payload.formOptions` + submit/cancel.
 *
 * ① The option source is the **payload** (which `sidepanel.ts#collectOpParams` derives
 *    from `OPTIONAL_CAPABILITY_FORM_OPTIONS`) — the card never invents an option;
 * ② the selected ids are submitted as the ONE comma-joined value, so the pipeline's
 *    `params` state stays a single string (no interface extension);
 * ③ the option count is capped at {@link MAX_FORM_OPTIONS} and the card's clickables
 *    are therefore exactly 4 + 2 = 6 = `MAX_CLICKABLES_PER_CARD` (measured, not assumed).
 */
export const MAX_FORM_OPTIONS = 4;

function buildFormSelect(view: CardView, deps: CardDeps, ask: HTMLElement, options: HTMLElement): void {
  const doc = deps.doc;
  options.className = 'row ask-options-form';
  const pool = [...(view.payload.formOptions ?? [])].slice(0, MAX_FORM_OPTIONS);
  const boxes: HTMLInputElement[] = [];
  for (const opt of pool) {
    const label = doc.createElement('label');
    label.className = 'ask-check';
    label.setAttribute('data-form-option', opt.id);
    const box = doc.createElement('input');
    box.type = 'checkbox';
    box.className = 'ask-check-input';
    box.setAttribute('data-cap', opt.id);
    box.setAttribute('aria-label', `${opt.label}（${opt.scope}）`);
    const text = doc.createElement('span');
    text.textContent = opt.label;
    label.append(box, text);
    options.appendChild(label);
    boxes.push(box);
  }
  const submit = doc.createElement('button');
  submit.id = 'ask-submit';
  submit.type = 'button';
  submit.className = 'btn-primary';
  submit.setAttribute('data-act', 'answer');
  submit.textContent = '提交所选';
  submit.addEventListener('click', () => {
    const picked = boxes.filter((b) => b.checked).map((b) => b.getAttribute('data-cap') ?? '');
    // An empty selection is a **cancel** (fail-closed: never a default grant).
    if (picked.length === 0) deps.onCardAction?.(view.cardId, 'cancel');
    else deps.onCardAction?.(view.cardId, 'answer', picked.join(','));
  });
  const cancel = doc.createElement('button');
  cancel.id = 'ask-cancel';
  cancel.type = 'button';
  cancel.setAttribute('data-act', 'cancel');
  cancel.textContent = '取消';
  cancel.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'cancel'));
  options.append(submit, cancel);
  void ask;
}

/**
 * The open form. The legacy id family (`#ask` / `#ask-prompt` / `#ask-options` /
 * `#ask-fallback` / `#ask-input` / `#ask-submit` / `#ask-cancel`) is written HERE,
 * on the open card only — the terminal branch never mints them.
 */
function buildForm(view: CardView, deps: CardDeps, col: HTMLElement): void {
  const doc = deps.doc;
  // I-04: the newest open card owns the legacy id family — strip it from any earlier
  // (still open) card first. The node being built is not in the document yet, so a
  // document-wide query can only ever match an older card.
  for (const stale of Array.from(doc.querySelectorAll(LEGACY_ASK_IDS.map((id) => `#${id}`).join(', ')))) {
    stale.removeAttribute('id');
  }
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

  // V5-2 TASK-V5-135 (ADR-V5-002 §2 / FR-ALLN-020~023, 法八入口侧): the masked
  // credential card REUSES this one input/submit/cancel triple — the `secret` shape is
  // the `type="password"` + `data-secret` variant of it, so the card family keeps one
  // construction (no second DOM path) and 3 clickables (≤ MAX_CLICKABLES_PER_CARD = 6).
  const isSecret = askKind === 'secret';
  // V5-2 TASK-V5-138 (ADR-V5-002 §2 / ADR-V5-004 §3 · FR-ALLN-043): the `form` card is
  // its OWN construction — a multi-select checkbox group + submit/cancel. It must NOT
  // also mount the text input / the decision region, otherwise 4 checkboxes + input +
  // submit + cancel = 7 > MAX_CLICKABLES_PER_CARD (measured: the budget is exactly 6:
  // 4 options + submit + cancel).
  const isForm = askKind === 'form';
  if (isForm) {
    buildFormSelect(view, deps, ask, options);
    col.appendChild(ask);
    return;
  }
  const fallback = doc.createElement('div');
  fallback.id = 'ask-fallback';
  fallback.className = 'ask-fallback';
  fallback.hidden = askKind !== 'text' && !isSecret;

  const input = doc.createElement('input');
  input.id = 'ask-input';
  input.type = isSecret ? 'password' : 'text';
  input.className = 'ask-input';
  if (isSecret) {
    input.setAttribute('data-secret', 'true');
    input.setAttribute('aria-label', view.payload.secretLabel ?? '凭据（不回显）');
  } else {
    input.placeholder = '输入回答…';
  }
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
  // 法八: the masked card carries no hint that could echo a value; both terminal copies
  // come from `ASK_COPY` (single source) and the固化 text is the FACT only.
  hint.textContent = '取消 = 回答被取消（不代填默认值）';
  hint.hidden = isSecret;
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
      // I-03: mutual disclosure — opening the fallback collapses the option rows
      // (scoped to THIS card: two `askuser` cards may coexist).
      setCardFallbackOpen(ask, fallback.hidden);
    });
    options.appendChild(other);
  }
  // V4.5-1 W3 (TASK-V45-108 / ADR-V45-002 §3): the decision region (option pool +
  // consequence preview) is mounted **inside the open card's own form**, so it is
  // created and removed with the card's interactivity — the retired `#l0-decision`
  // shell has no counterpart left.
  if (!isSecret) mountDecisionRegion(view, deps, ask);
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
