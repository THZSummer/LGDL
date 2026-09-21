/**
 * V4-2 TASK-602 (leaf `specs-tree-v4-2-chat-stream-model`) — the **shared card
 * primitives**: the one DOM contract every card type is built from
 * (父 ADR-V4-013 / 本叶 ADR-V4-026).
 *
 * Kept in its own module so the card components can import it **without** a
 * circular dependency on the registry (`cards/index.ts`): the registry imports the
 * components, the components import these primitives, nobody imports the registry.
 *
 * @module ui/sidepanel/cards/shared
 */
import { formatClock } from '../stream-model.js';
import type { CardView, StreamEventKind, StreamPayload } from '../stream-model.js';

/* ────────────────────────────────────────────────────────────────────────────
 * Folding thresholds — ONE definition (O-CHAT-001 / ADR-V4-027 decision 2)
 * ──────────────────────────────────────────────────────────────────────────── */

/** A tool body longer than this character count starts collapsed. */
export const TOOL_PREVIEW_CHARS = 480;
/** A tool body longer than this many lines starts collapsed. */
export const TOOL_PREVIEW_LINES = 10;
/** The collapsed header's single-line preview is truncated to this many chars. */
export const TOOL_PREVIEW_MAX = 110;

/** Card deps: doc + the two panel-owned memories (folding + skeleton actions). */
export interface CardDeps {
  readonly doc: Document;
  /** Per-card `<details>` open memory (`cardId` keyed — never an entry id). */
  readonly toolOpen?: {
    get(cardId: string): boolean | undefined;
    set(cardId: string, open: boolean): void;
  };
  /**
   * v4-3 / v4-4 seam: a skeleton card's control was used. v4-2 does NOT implement
   * the ask/auth/ref business — the skeleton renders the contract and reports the
   * intent (the完整交互 lands in the next leaves).
   */
  readonly onCardAction?: (cardId: string, action: string, value?: string) => void;
  /**
   * V4.5-1 W3 (TASK-V45-108): the ONE disclosure controller, so a card-internalized
   * folding face (`#l1-more` / `#l1-consequences`) goes through the same controller as
   * every other collapse (no second folding mechanism inside a card).
   */
  readonly disclosure?: {
    toggle(id: string): boolean;
    open(id: string): boolean;
    close(id: string): boolean;
  };
  /**
   * V4.5-1 W3 (TASK-V45-108): reveal the card's own fallback input (the terminal
   * 「其他…（我来描述）」item of the option pool) — the card-local mutual disclosure.
   */
  readonly onRevealFallback?: () => void;
}

/* ────────────────────────────────────────────────────────────────────────────
 * DOM builders
 * ──────────────────────────────────────────────────────────────────────────── */

export interface CardShell {
  readonly li: HTMLLIElement;
  readonly col: HTMLElement;
  readonly head: HTMLElement;
}

/**
 * Build the shared shell. `legacyClasses` are style carriers only — the canonical
 * identity is `data-msg-type` + `data-card-key`.
 */
export function createCardShell(
  view: CardView,
  deps: CardDeps,
  legacyClasses: readonly string[],
  tagText: string,
): CardShell {
  const doc = deps.doc;
  const li = doc.createElement('li');
  li.className = ['entry', ...legacyClasses].join(' ');
  li.setAttribute('data-msg-type', view.kind);
  li.setAttribute('data-card-key', view.cardId);
  li.setAttribute('role', 'listitem');
  if (view.sessionId) li.setAttribute('data-session', view.sessionId);

  const col = doc.createElement('div');
  col.className = 'card-col';

  const head = doc.createElement('div');
  head.className = 'card-head';
  const tag = doc.createElement('span');
  tag.className = 'card-tag';
  tag.textContent = tagText;
  head.append(tag, clockNode(doc, view.ts, 'ts'));
  col.append(head);
  li.append(col);
  return { li, col, head };
}

/** `<time class="ts">HH:MM:SS</time>` — the only clock format (ADR-V4-026). */
export function clockNode(doc: Document, ts: number, className = 'ts'): HTMLTimeElement {
  const el = doc.createElement('time');
  el.className = className;
  el.dateTime = new Date(ts).toISOString();
  el.textContent = formatClock(ts);
  return el;
}

/** The固化 region: hidden while the card is open, shown (with its `.ts`) at terminal. */
export function createFixedRegion(doc: Document, extraClass: string): HTMLElement {
  const box = doc.createElement('div');
  box.className = `card-fixed ${extraClass}`.trim();
  box.hidden = true;
  box.setAttribute('aria-live', 'polite');
  return box;
}

/** The single-line preview used by the collapsed tool header. */
export function firstLinePreview(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  return line.length > TOOL_PREVIEW_MAX ? `${line.slice(0, TOOL_PREVIEW_MAX)}…` : line;
}

/** Human label of a kind (card head tag). */
export const CARD_TAG_LABELS: Readonly<Record<StreamEventKind, string>> = Object.freeze({
  ai: 'AI 答复',
  user: '我',
  nextstep: '下一步推荐',
  askuser: 'ask-user',
  auth: '授权申请',
  system: '系统事件',
  ref: '页面引用',
  tool: '工具',
  command: '命令',
  thinking: '思考',
  error: '错误',
  notice: '工具通知',
});

/** The default payload for a one-shot process card. */
export function systemRowPayload(label: string, text?: string): StreamPayload {
  return { label, ...(text !== undefined ? { text } : {}) };
}

/** `<b class="…">prefix</b>` inside a固化 region. */
export function fixedText(doc: Document, className: string, prefix: string): HTMLElement {
  const el = doc.createElement('b');
  el.className = className;
  el.textContent = prefix;
  return el;
}
