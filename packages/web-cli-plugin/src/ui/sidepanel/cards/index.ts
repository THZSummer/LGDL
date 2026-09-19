/**
 * V4-2 TASK-602 / TASK-603 (leaf `specs-tree-v4-2-chat-stream-model`) — the card
 * **taxonomy single source** and the **one固化 / DOM contract** shared by every
 * card type (父 ADR-V4-013 / 本叶 ADR-V4-026 / ADR-V4-027).
 *
 * ── The single registration point ────────────────────────────────────────────
 *
 * `CARD_TYPES` (12 = 7 primary + 5 process) and `CARD_KIND_LAYER` live in
 * `stream-model.ts` (the model owns the vocabulary) and are re-exported here. This
 * module registers the **factory** of each kind, so "a kind exists" and "a kind
 * renders" can never drift apart: the factory map is typed as a total map over
 * `StreamEventKind`.
 *
 * ── The DOM contract (one language for all 12 kinds) ─────────────────────────
 *
 *   <li class="entry …legacy…" data-msg-type="<kind>" data-card-key="<cardId>" role="listitem">
 *     <div class="card-col">
 *       <div class="card-head">…<time class="ts">HH:MM:SS</time></div>
 *       …body…
 *       <div class="card-fixed" hidden>…固化区…</div>
 *     </div>
 *   </li>
 *
 * The legacy `.entry-<role>` / `.msg-<role>` / `.tool-card` / `.cmd` class names are
 * **style carriers** (the v1 CSS and the existing gates keep matching them); the
 * `data-*` contract is the **canonical entry** (FR-CHAT-022 / FR-CHAT-036).
 *
 * ── Extending the taxonomy (FR-CHAT-036 — never silent) ──────────────────────
 *
 * Adding a 13th kind requires ALL FOUR: ① the model's `STREAM_EVENT_KINDS` + this
 * registry ② the design shim `design/ui-redesign/option-f-shim.mjs` ③
 * `test/design-contract.test.ts` (`SHIM_CHECK_CALLS` / mapping table) ④ the v4
 * supersession ledger's `designContractChanges[]`. A silent change is a contract
 * break and the design-contract gate fails on the frozen sha256.
 *
 * @module ui/sidepanel/cards
 */
import {
  CARD_KIND_LAYER,
  PROCESS_CARD_TYPES,
  PRIMARY_CARD_TYPES,
  STREAM_EVENT_KINDS,
  formatClock,
} from '../stream-model.js';
import type { CardView, StreamEventKind } from '../stream-model.js';
import { CARD_TAG_LABELS, clockNode, createCardShell, createFixedRegion, fixedText } from './shared.js';
import type { CardDeps } from './shared.js';
import { createAiCard } from './ai.js';
import { createUserCard } from './user.js';
import { createSystemCard, createCommandCard } from './system.js';
import { createErrorCard } from './error.js';
import { createNoticeCard } from './notice.js';
import { createToolCard, patchToolCard } from './tool.js';
import { createThinkingCard, patchThinkingCard } from './thinking.js';

export { CARD_KIND_LAYER, PROCESS_CARD_TYPES, PRIMARY_CARD_TYPES, STREAM_EVENT_KINDS, formatClock };
export type { CardDeps } from './shared.js';
export {
  TOOL_PREVIEW_CHARS,
  TOOL_PREVIEW_LINES,
  TOOL_PREVIEW_MAX,
  CARD_TAG_LABELS,
  createCardShell,
  clockNode,
  createFixedRegion,
  firstLinePreview,
  systemRowPayload,
} from './shared.js';
export {
  createAiCard,
  createUserCard,
  createSystemCard,
  createNoticeCard,
  createErrorCard,
  createCommandCard,
  createToolCard,
  createThinkingCard,
};

/** 12 项 = 7 主类（前，设计契约顺序）+ 5 过程族。 */
export const CARD_TYPES: readonly StreamEventKind[] = STREAM_EVENT_KINDS;

/* ────────────────────────────────────────────────────────────────────────────
 * Skeleton factories (v4-2 renders the CONTRACT; v4-3 / v4-4 own the business)
 * ──────────────────────────────────────────────────────────────────────────── */

/** A `nextstep` card: chips are commands (FR-CHAT-034 / shim B4). ≤3 clickables. */
export function createNextstepCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-next'], CARD_TAG_LABELS.nextstep);
  const chips = doc.createElement('div');
  chips.className = 'next-chips';
  for (const chip of view.payload.chips ?? []) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'next-chip';
    btn.setAttribute('data-act', 'next');
    btn.textContent = chip;
    btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'next', chip));
    chips.appendChild(btn);
  }
  col.appendChild(chips);
  return li;
}

/**
 * ask-user card **skeleton** (choice ≤3 + terminal「其他…」+ 取消 = 5 clickables;
 * text = input + 回答 + 取消 = 3 clickables — both ≤6, FR-CHAT-072).
 * Business (submit / 60 s timeout / superseded) = v4-3.
 */
export function createAskuserCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const askKind = view.payload.askKind ?? 'text';
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-ask'], CARD_TAG_LABELS.askuser);
  li.setAttribute('data-ask-kind', askKind);
  li.setAttribute('data-answered', 'false');

  const prompt = doc.createElement('p');
  prompt.className = 'ask-q';
  prompt.textContent = view.payload.prompt ?? '（无问题文本）';
  col.appendChild(prompt);

  const form = doc.createElement('div');
  form.className = 'ask-form';
  if (askKind === 'choice') {
    for (const option of [...(view.payload.options ?? [])].slice(0, 3)) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.setAttribute('data-act', 'choose');
      btn.textContent = option;
      btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'choose', option));
      form.appendChild(btn);
    }
    const other = doc.createElement('button');
    other.type = 'button';
    other.className = 'choice';
    other.setAttribute('data-act', 'choose-other');
    other.textContent = '其他…（我来描述）';
    other.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'choose-other'));
    form.appendChild(other);
  } else if (askKind === 'text') {
    const input = doc.createElement('input');
    input.type = 'text';
    input.className = 'ask-input';
    input.placeholder = '输入回答…';
    input.setAttribute('aria-label', '回答');
    form.appendChild(input);
    const submit = doc.createElement('button');
    submit.type = 'button';
    submit.className = 'btn-primary';
    submit.setAttribute('data-act', 'answer');
    submit.textContent = '回答';
    submit.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'answer', input.value));
    form.appendChild(submit);
  }
  const cancel = doc.createElement('button');
  cancel.type = 'button';
  cancel.setAttribute('data-act', 'cancel');
  cancel.textContent = '取消';
  cancel.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'cancel'));
  form.appendChild(cancel);
  const hint = doc.createElement('span');
  hint.className = 'hint';
  hint.textContent = '取消 = 回答被取消（不代填默认值）';
  form.appendChild(hint);
  col.appendChild(form);

  const fixed = createFixedRegion(doc, 'ask-fixed');
  fixed.append(fixedText(doc, 'ask-fixed-text', '已答：'), clockNode(doc, view.ts, 'ts card-fixed-time'));
  col.appendChild(fixed);
  return li;
}

/** Authorization card **skeleton** (批准 + 拒绝 = 2 clickables; +审计入口 at terminal). v4-3 owns the business. */
export function createAuthCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-auth'], CARD_TAG_LABELS.auth);
  li.setAttribute('data-decision', 'pending');

  const scope = doc.createElement('p');
  scope.className = 'auth-scope';
  scope.textContent = view.payload.prompt ?? '（无范围说明）';
  const preview = doc.createElement('p');
  preview.className = 'auth-preview hint';
  preview.textContent = '批准后本会话内按该范围执行；拒绝则不执行（零副作用）。';
  col.append(scope, preview);

  const actions = doc.createElement('div');
  actions.className = 'auth-actions';
  for (const [act, label] of [
    ['approve', '批准'],
    ['reject', '拒绝'],
  ] as const) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-act', act);
    btn.textContent = label;
    btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, act));
    actions.appendChild(btn);
  }
  col.appendChild(actions);

  const fixed = createFixedRegion(doc, 'auth-fixed');
  fixed.append(fixedText(doc, 'auth-fixed-text', '已决策：'), clockNode(doc, view.ts, 'ts card-fixed-time'));
  const audit = doc.createElement('button');
  audit.type = 'button';
  audit.className = 'audit-entry';
  audit.setAttribute('data-act', 'audit');
  audit.textContent = '查看审计';
  audit.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'audit'));
  fixed.appendChild(audit);
  col.appendChild(fixed);
  return li;
}

/**
 * Reference card **skeleton** (valid / stale; ≤2 clickables). v4-4 owns the
 * five-dimension judgement and the re-anchor business; v4-2 renders the projection
 * contract (`data-ref-state` / `data-ref-num`, stale cards kept, number increments).
 */
export function createRefCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const state = view.payload.refState ?? 'valid';
  const num = view.payload.refNum ?? 1;
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-ref'], CARD_TAG_LABELS.ref);
  li.setAttribute('data-ref-state', state);
  li.setAttribute('data-ref-num', String(num));
  const chips = doc.createElement('div');
  chips.className = 'ref-chips';
  const numChip = doc.createElement('span');
  numChip.className = 'ref-chip';
  numChip.textContent = `#${num} ${view.payload.refLabel ?? '（引用）'}`;
  chips.appendChild(numChip);
  col.appendChild(chips);
  if (state === 'stale') {
    const why = doc.createElement('p');
    why.className = 'ref-stale-why hint';
    why.textContent = '目标已不在页面上（页面已变化）。';
    col.appendChild(why);
    const row = doc.createElement('div');
    row.className = 'ref-actions';
    for (const [act, label] of [
      ['repick', '重新拾取'],
      ['describe', '改用描述'],
    ] as const) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-act', act);
      btn.textContent = label;
      btn.addEventListener('click', () => deps.onCardAction?.(view.cardId, act));
      row.appendChild(btn);
    }
    col.appendChild(row);
  }
  return li;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The total factory registry
 * ──────────────────────────────────────────────────────────────────────────── */

const CARD_FACTORIES: Readonly<Record<StreamEventKind, (view: CardView, deps: CardDeps) => HTMLLIElement>> = Object.freeze({
  ai: createAiCard,
  user: createUserCard,
  nextstep: createNextstepCard,
  askuser: createAskuserCard,
  auth: createAuthCard,
  system: createSystemCard,
  ref: createRefCard,
  tool: createToolCard,
  command: createCommandCard,
  thinking: createThinkingCard,
  error: createErrorCard,
  notice: createNoticeCard,
});

/** The registered factory of every kind (exported so the node test can prove totality). */
export function cardFactory(kind: StreamEventKind): (view: CardView, deps: CardDeps) => HTMLLIElement {
  const factory = CARD_FACTORIES[kind];
  if (!factory) throw new Error(`cards: 未登记的卡型 ${kind}（CARD_TYPES 扩展必须走 FR-CHAT-036 登记）`);
  return factory;
}

/** Create one card `<li>`. The caller owns placement + (non-terminal) patching. */
export function createCardNode(view: CardView, deps: CardDeps): HTMLLIElement {
  return cardFactory(view.kind)(view, deps);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Patch — only ever called for NON-terminal cards (ADR-V4-025 decision 2)
 * ──────────────────────────────────────────────────────────────────────────── */

/** `data-answered` for an ask card. */
export function answeredState(view: CardView): 'false' | 'true' | 'cancelled' {
  if (view.terminal === 'answered') return 'true';
  if (view.terminal === 'cancelled') return 'cancelled';
  return 'false';
}

/** `data-decision` for an auth card. */
export function decisionState(view: CardView): 'pending' | 'approved' | 'rejected' {
  if (view.terminal === 'approved') return 'approved';
  if (view.terminal === 'rejected') return 'rejected';
  return 'pending';
}

/**
 * Apply a view to an existing NON-terminal card node.
 *
 * The renderer never calls this for a card whose DOM is already frozen; the
 * answer/cancel transition itself is applied exactly once (the patch that makes the
 * card terminal), after which the node is frozen forever.
 *
 * Only the **four kinds with a real in-progress → settled migration** are handled
 * (`thinking` / `tool` / `askuser` / `auth`). The eight `BORN_FROZEN_KINDS`
 * (`ai`/`user`/`nextstep`/`system`/`ref`/`command`/`error`/`notice`) are never
 * reachable here — `stream-render.ts` skips any `frozen` view, and `project()`
 * marks exactly those kinds frozen when they are first built. I-08 (v4-2 review)
 * removed the dead `ai` branch this function used to carry.
 */
export function patchCardNode(view: CardView, node: HTMLElement): void {
  if (view.kind === 'thinking') {
    patchThinkingCard(view, node);
    return;
  }
  if (view.kind === 'tool') {
    patchToolCard(view, node);
    return;
  }
  if (view.kind === 'askuser') {
    node.setAttribute('data-answered', answeredState(view));
    if (view.frozen) applyFixed(node, view, writtenFixedText(view));
    return;
  }
  if (view.kind === 'auth') {
    node.setAttribute('data-decision', decisionState(view));
    if (view.frozen) applyFixed(node, view, writtenFixedText(view));
    return;
  }
  if (view.kind === 'ref') {
    if (view.payload.refState) node.setAttribute('data-ref-state', view.payload.refState);
    if (view.payload.refNum !== undefined) node.setAttribute('data-ref-num', String(view.payload.refNum));
  }
}

/** Turn a skeleton's固化 region on and write its frozen text + clock. */
function applyFixed(node: HTMLElement, view: CardView, text: string): void {
  const fixed = node.querySelector('.card-fixed') as HTMLElement | null;
  if (!fixed) return;
  const form = node.querySelector('.ask-form, .auth-actions') as HTMLElement | null;
  if (form) form.hidden = true;
  const label = fixed.querySelector('b');
  if (label) label.textContent = text;
  const ts = fixed.querySelector('.card-fixed-time');
  if (ts) ts.textContent = formatClock(view.terminalTs ?? view.ts);
  fixed.hidden = false;
}

/** The固化 copy for an ask/auth card, derived from its terminal state only. */
export function writtenFixedText(view: CardView): string {
  if (view.kind === 'auth') {
    return view.terminal === 'rejected' ? '已拒绝（不执行）' : '已批准';
  }
  if (view.terminal === 'cancelled') return '已取消（不代填默认值）';
  return `已答：${view.payload.answer ?? ''}`;
}
