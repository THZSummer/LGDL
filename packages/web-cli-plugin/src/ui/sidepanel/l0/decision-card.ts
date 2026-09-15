/**
 * V3-1 TASK-106 (ADR-V3-013 / ADR-V3-014) — the ONE decision card.
 *
 * Requirements made structural here:
 *   - **exactly one card at a time**: there is one `#ask` node and this module is
 *     its only writer; `render()` derives the card from `state.ask`, so an older
 *     round's card cannot linger (FR-V3-011);
 *   - **≤2 recommended options visible** (FR-V3-011); the rest plus the terminal
 *     「其他…（我来描述）」 live behind `#l0-more` (L1, `hidden`);
 *   - **the terminal item is character-for-character fixed** (FR-V3-012) and
 *     choosing it reveals the fallback input **in place**; submitting or
 *     cancelling sends it back to `hidden` (FR-V3-012 / FR-V3-013);
 *   - **no permanently resident text input**: `#composer` starts `hidden` and is
 *     only revealed inside the fallback state (ADR-V3-014 §5).
 *
 * `#composer` / `#input` keep serving the full free-text path (the v1 behaviour
 * three existing gates still exercise) — they are simply not L0 chrome any more.
 *
 * This module is also the **only writer** of `#l0-more` (label + `data-count` +
 * `hidden`). `l0/shell.ts` used to re-write the label after `render()`, which is
 * how the *no-card* state could end up offering a live「还有 1 个」entry point
 * (review I1): the label must be derived from the same `visible`/`foldedCount`
 * pair that drives the visibility, in one place.
 *
 * @module l0/decision-card
 */
import { OTHER_OPTION_LABEL, moreOptionsLabel } from '../view-model.js';
import type { L0View } from '../view-model.js';

/** Element handles the card owns (looked up once, by id, at mount). */
interface CardNodes {
  ask: HTMLElement;
  prompt: HTMLElement;
  options: HTMLElement;
  moreOptions: HTMLElement;
  more: HTMLButtonElement;
  fallback: HTMLElement;
  composer: HTMLElement;
  input: HTMLInputElement | null;
}

/** What the card needs from the rest of the panel. */
export interface DecisionCardDeps {
  doc: Document;
  /** Existing ask-resolution path (`submitAsk(value, canceled)`). */
  onAnswer(label: string): void;
}

export interface DecisionCardHandle {
  /** Repaint from the pure view model. */
  render(view: L0View): void;
  /** Reveal the fallback input + the full-text composer (idempotent). */
  revealFallback(): void;
  /** Put the fallback input back to `hidden` (after submit / cancel). */
  hideFallback(): void;
  /** True while the fallback input is revealed (gates use it as a state probe). */
  fallbackOpen(): boolean;
}

const TERMINAL_ID = 'ask-other';

/**
 * Mount the decision card. The card never creates a second `#ask` node, and it
 * refuses to run if the DOM contract is missing (a silent no-op here would hide
 * the disclosure contract from the gates).
 */
export function mountDecisionCard(deps: DecisionCardDeps): DecisionCardHandle {
  const { doc } = deps;
  const need = <T extends HTMLElement>(id: string): T => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`decision-card: 缺少 DOM 契约 #${id}`);
    return el as T;
  };
  const nodes: CardNodes = {
    ask: need('ask'),
    prompt: need('ask-prompt'),
    options: need('ask-options'),
    moreOptions: need('l1-more-options'),
    more: need<HTMLButtonElement>('l0-more'),
    fallback: need('ask-fallback'),
    composer: need('composer'),
    input: doc.getElementById('input') as HTMLInputElement | null,
  };

  /**
   * The fallback state is *user intent*, so it survives background re-renders: the
   * panel repaints on every state push (LLM status, probe, session…), and an input
   * that vanishes mid-typing would be both a data-loss bug and an a11y failure.
   * Only an explicit submit / cancel / answer clears it (FR-V3-012).
   */
  let fallbackRequested = false;
  /** Signature of the last paint (the card rebuilds buttons on every render). */
  let lastSignature = '';

  const setFallback = (open: boolean): void => {
    fallbackRequested = open;
    nodes.fallback.hidden = !open;
    // ADR-V3-014 §5: the composer is the *secondary* full-text channel inside the
    // fallback state — never resident, never a second competing input at L0.
    nodes.composer.hidden = !open;
    const trigger = doc.getElementById(TERMINAL_ID);
    if (trigger) {
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-controls', 'ask-fallback');
    }
    if (open) nodes.input?.focus();
  };

  const terminalButton = (): HTMLButtonElement => {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.id = TERMINAL_ID;
    btn.setAttribute('data-key', TERMINAL_ID);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'ask-fallback');
    btn.textContent = OTHER_OPTION_LABEL;
    btn.addEventListener('click', () => setFallback(nodes.fallback.hidden));
    return btn;
  };

  return {
    render(view: L0View): void {
      const decision = view.decision;
      /**
       * `#l0-more` is written HERE and nowhere else (label + `data-count` +
       * `hidden`). Two rules, one place:
       *   - **no card ⇒ no entry point.** The label reads the honest「还有 0 个」
       *     and the button is `hidden`; re-rendering the same no-card state must
       *     not resurrect it (review I1: `foldedCount` is *always* ≥ 1, so
       *     `foldedCount <= 0` alone is never true and the button became VISIBLE
       *     on the second render of the no-card state);
       *   - **a card with nothing behind the disclosure ⇒ no dead entry.** A
       *     visible card whose option list is empty must not offer a disclosure
       *     that expands to nothing.
       */
      const applyMore = (): void => {
        const count = decision.visible ? decision.foldedCount : 0;
        nodes.more.textContent = moreOptionsLabel(count);
        nodes.more.setAttribute('data-count', String(count));
        const nothingBehind = decision.visibleOptions.length === 0 && decision.foldedOptions.length === 0;
        nodes.more.hidden = !decision.visible || decision.foldedCount <= 0 || nothingBehind;
      };
      const signature = JSON.stringify([
        decision.visible,
        decision.prompt,
        decision.visibleOptions.map((o) => o.label),
        decision.foldedOptions,
        decision.foldedCount,
        fallbackRequested,
      ]);
      // Only the *node structure* is short-circuited; the visibility flags are
      // always re-applied so an external state change can never be masked.
      if (signature === lastSignature) {
        nodes.ask.hidden = !decision.visible;
        applyMore();
        setFallback(fallbackRequested);
        return;
      }
      lastSignature = signature;
      nodes.ask.hidden = !decision.visible;
      if (!decision.visible) {
        nodes.prompt.textContent = '';
        nodes.options.textContent = '';
        nodes.moreOptions.textContent = '';
        applyMore();
        // No card → no fallback state either (the round is over).
        setFallback(false);
        return;
      }
      nodes.prompt.textContent = decision.prompt;
      nodes.options.textContent = '';
      for (const option of decision.visibleOptions) {
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-key', `ask-option:${option.label}`);
        btn.textContent = option.label;
        btn.addEventListener('click', () => deps.onAnswer(option.label));
        nodes.options.appendChild(btn);
      }
      // ── L1: the remaining options + the terminal item (always LAST) ──
      nodes.moreOptions.textContent = '';
      for (const label of decision.foldedOptions) {
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-key', `ask-folded:${label}`);
        btn.textContent = label;
        btn.addEventListener('click', () => deps.onAnswer(label));
        nodes.moreOptions.appendChild(btn);
      }
      if (decision.visibleOptions.length > 0 || decision.foldedOptions.length > 0) {
        nodes.moreOptions.appendChild(terminalButton());
      }
      // A card with nothing behind the disclosure must not offer a dead entry.
      applyMore();
      // Re-apply the user's fallback intent (never silently collapse it).
      setFallback(fallbackRequested);
    },
    revealFallback: () => setFallback(true),
    hideFallback: () => setFallback(false),
    fallbackOpen: () => nodes.fallback.hidden === false,
  };
}
