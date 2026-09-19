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
import { answeredState, createAskuserCard, patchAskuserCard } from './askuser.js';
import { createAuthCard, decisionState, patchAuthCard } from './auth.js';
import { createRefCard } from './ref.js';
import { createNextstepCard } from './nextstep.js';

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
  createRefCard,
  createNextstepCard,
  createNoticeCard,
  createErrorCard,
  createCommandCard,
  createToolCard,
  createThinkingCard,
  createAskuserCard,
  createAuthCard,
  answeredState,
  decisionState,
};

/** 12 项 = 7 主类（前，设计契约顺序）+ 5 过程族。 */
export const CARD_TYPES: readonly StreamEventKind[] = STREAM_EVENT_KINDS;

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
export function patchCardNode(view: CardView, node: HTMLElement, deps?: CardDeps): void {
  if (view.kind === 'thinking') {
    patchThinkingCard(view, node);
    return;
  }
  if (view.kind === 'tool') {
    patchToolCard(view, node);
    return;
  }
  if (view.kind === 'askuser') {
    // Only the terminal transition rewrites the DOM (removing the form); a
    // re-render of an OPEN card must never strip its live controls.
    if (view.frozen) patchAskuserCard(view, node);
    else node.setAttribute('data-answered', answeredState(view));
    return;
  }
  if (view.kind === 'auth') {
    // BLOCK-04 (v4-3 review): the terminal patch needs the REAL deps so the audit
    // exit it appends is actually reachable (`onCardAction`); see `patchAuthCard`.
    if (view.frozen) patchAuthCard(view, node, deps);
    else node.setAttribute('data-decision', decisionState(view));
    return;
  }
  if (view.kind === 'ref') {
    if (view.payload.refState) node.setAttribute('data-ref-state', view.payload.refState);
    if (view.payload.refNum !== undefined) node.setAttribute('data-ref-num', String(view.payload.refNum));
  }
}

