/**
 * `tool` card (FR-CHAT-035 / ADR-V4-027 / journey #15f~#15w) — the collapsible tool
 * card with **every** v1 field preserved:
 *
 *   tool name · `✓/✖` status · `ms` duration · collapsed first-line preview ·
 *   folding memory (480 chars / 10 lines, single constant) · monospace body
 *
 * A failed tool card additionally carries `.entry-error` on the `<li>` (FR-050 /
 * EC-023: a failure is a visible error entry) — the `data-msg-type` stays `tool`.
 *
 * @module ui/sidepanel/cards/tool
 */
import type { CardView } from '../stream-model.js';
import {
  CARD_TAG_LABELS,
  TOOL_PREVIEW_CHARS,
  TOOL_PREVIEW_LINES,
  createCardShell,
  firstLinePreview,
} from './shared.js';
import type { CardDeps } from './shared.js';

/** Build the `<details class="tool-card">` body shared by create + patch. */
function buildToolCard(view: CardView, deps: CardDeps): HTMLDetailsElement {
  const doc = deps.doc;
  const text = view.payload.text ?? '';
  const lineCount = text.split('\n').length;
  const isLong = text.length > TOOL_PREVIEW_CHARS || lineCount > TOOL_PREVIEW_LINES;
  const details = doc.createElement('details');
  details.className = 'tool-card';
  details.open = deps.toolOpen?.get(view.cardId) ?? !isLong;

  const summary = doc.createElement('summary');
  summary.className = 'tool-card-head';
  const name = doc.createElement('span');
  name.className = 'tool-name';
  name.textContent = view.payload.tool ?? '工具';
  const status = doc.createElement('span');
  status.className = toolStatusClass(view);
  status.textContent = toolStatusText(view);
  summary.append(name, status);
  if (typeof view.payload.ms === 'number') {
    const ms = doc.createElement('span');
    ms.className = 'tool-ms';
    ms.textContent = `${view.payload.ms} ms`;
    summary.appendChild(ms);
  }
  const preview = firstLinePreview(text);
  if (preview) {
    const p = doc.createElement('span');
    p.className = 'tool-preview';
    p.textContent = preview;
    summary.appendChild(p);
  }

  const body = doc.createElement('pre');
  body.className = 'tool-card-body';
  body.textContent = text;

  details.append(summary, body);
  details.addEventListener('toggle', () => deps.toolOpen?.set(view.cardId, details.open));
  return details;
}

function toolStatusClass(view: CardView): string {
  const state = view.payload.ok === false ? 'fail' : view.payload.ok === true ? 'ok' : 'unknown';
  return `tool-status ${state}`;
}

function toolStatusText(view: CardView): string {
  return view.payload.ok === false ? '✖ 失败' : view.payload.ok === true ? '✓ 成功' : '完成';
}

export function createToolCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const legacy = ['entry-tool', 'msg', 'msg-tool'];
  if (view.payload.ok === false) legacy.push('entry-error');
  const { li, col } = createCardShell(view, deps, legacy, view.payload.tool ?? CARD_TAG_LABELS.tool);
  col.appendChild(buildToolCard(view, deps));
  return li;
}

/**
 * Patch an OPEN tool card: refresh the status text/class, the `ms` chip and the
 * preview — the `<details>` node (and therefore the folding memory) is untouched.
 */
export function patchToolCard(view: CardView, node: HTMLElement): void {
  const status = node.querySelector('.tool-status') as HTMLElement | null;
  if (status) {
    status.className = toolStatusClass(view);
    status.textContent = toolStatusText(view);
  }
  const ms = node.querySelector('.tool-ms') as HTMLElement | null;
  if (ms && typeof view.payload.ms === 'number') ms.textContent = `${view.payload.ms} ms`;
  const preview = node.querySelector('.tool-preview') as HTMLElement | null;
  if (preview) preview.textContent = firstLinePreview(view.payload.text ?? '');
  const body = node.querySelector('.tool-card-body') as HTMLElement | null;
  if (body) body.textContent = view.payload.text ?? '';
}
