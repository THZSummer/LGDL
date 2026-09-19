/**
 * V4-3 TASK-703 (leaf `specs-tree-v4-3-ask-auth-inflow`) — the **authorization
 * card** (`confirm` → stream-native `auth`), fully implemented: 批准 / 拒绝, the
 * consequence preview and the audit exit, with the two固化 states and the
 * "no repeat decision" structural guarantee (父 ADR-V4-030 / ADR-V4-033 /
 * FR-CHAT-045~047 / AC-CHAT-016 / shim D1~D7).
 *
 * ── Preview data source (P-V43-04 §3.4, option A) ────────────────────────────
 *
 * The 「范围与后果预演」 is the **existing** `#l1-consequence-tpl` three-paragraph
 * static template (会发生什么 / 不会发生什么 / 不可逆性声明) with the option label
 * substituted. Zero new data dependency, and the template is already
 * plaintext-free — a dynamically generated preview would risk putting a command
 * argument body into the trace (ADR-V4-034 §2).
 *
 * ── Audit exit (ADR-V4-033 §1~§2) ────────────────────────────────────────────
 *
 * The card carries the **session-level** audit entry (its固化 region + the audit
 * exit); the L2 audit view remains the complete ledger. The exit is an `<a>`, not
 * a `<button>`: a terminal authorization card must render **zero** operation
 * controls (shim D6), and reopening the audit is navigation, not a re-decision.
 *
 * ── Legacy id contract (`#confirm*`) ─────────────────────────────────────────
 *
 * The open card mints `#confirm` / `#confirm-summary` / `#confirm-allow` /
 * `#confirm-deny` (the v1 `confirm-request` path's selectors); the terminal branch
 * mints none of them, so `getElementById('confirm')` never resolves to a stale,
 * already-decided card.
 *
 * @module ui/sidepanel/cards/auth
 */
import { ASK_COPY } from '../stream-plaintext.js';
import type { CardView } from '../stream-model.js';
import { CARD_TAG_LABELS, createCardShell, createFixedRegion, fixedText, type CardDeps } from './shared.js';

/** `data-decision` for an auth card (shim D2/D3/D5 verbatim). */
export function decisionState(view: CardView): 'pending' | 'approved' | 'rejected' {
  if (view.terminal === 'approved') return 'approved';
  if (view.terminal === 'rejected') return 'rejected';
  return 'pending';
}

/** The固化 copy of an auth card (shim D3 / D5). */
export function authFixedText(view: CardView): string {
  if (view.terminal === 'rejected') return ASK_COPY.rejected;
  return ASK_COPY.approved;
}

function clockText(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function clockTextNode(doc: Document, ts: number): HTMLElement {
  const el = doc.createElement('time');
  el.className = 'ts card-fixed-time';
  el.setAttribute('datetime', new Date(ts).toISOString());
  el.textContent = clockText(ts);
  return el;
}

/** The audit exit (`<a>` — navigation, never counted as an operation control). */
function auditEntry(view: CardView, deps: CardDeps): HTMLElement {
  const doc = deps.doc;
  const a = doc.createElement('a');
  a.className = 'audit-entry';
  a.setAttribute('href', '#audit');
  a.setAttribute('data-act', 'audit');
  a.setAttribute('role', 'button');
  a.setAttribute('aria-controls', 'view-host');
  a.textContent = ASK_COPY.auditExit;
  a.addEventListener('click', (event) => {
    event.preventDefault();
    deps.onCardAction?.(view.cardId, 'audit');
  });
  const hint = doc.createElement('span');
  hint.className = 'hint audit-division';
  hint.textContent = ASK_COPY.auditDivision;
  const wrap = doc.createElement('div');
  wrap.className = 'auth-audit';
  wrap.append(a, hint);
  return wrap;
}

/**
 * The consequence preview: clone the frozen `#l1-consequence-tpl` rows and
 * substitute `{{label}}`. When the template is absent (a bare-card node test),
 * fall back to the same static copy without the substitution.
 */
function consequencePreview(view: CardView, deps: CardDeps, col: HTMLElement): void {
  const doc = deps.doc;
  const labelText = (view.payload.label ?? view.payload.prompt ?? '本次操作').toString();
  const box = doc.createElement('div');
  box.className = 'auth-consequence';
  const tpl = doc.getElementById('l1-consequence-tpl') as HTMLTemplateElement | null;
  if (tpl) {
    const frag = tpl.content.cloneNode(true) as DocumentFragment;
    for (const row of Array.from(frag.querySelectorAll<HTMLElement>('.l1-row'))) {
      row.textContent = (row.textContent ?? '').replace('{{label}}', labelText);
      box.appendChild(row);
    }
  } else {
    const p = doc.createElement('p');
    p.className = 'l1-row';
    p.textContent = `会发生什么：选中「${labelText}」后本轮按该选项推进（零明文审计）。`;
    box.appendChild(p);
  }
  col.appendChild(box);
}

/** Populate + reveal the固化 region (shared by create and patch). */
export function fillAuthFixed(node: HTMLElement, view: CardView): void {
  const fixed = node.querySelector('.card-fixed') as HTMLElement | null;
  if (!fixed) return;
  const b = fixed.querySelector('b');
  if (b) b.textContent = authFixedText(view);
  const ts = fixed.querySelector('.card-fixed-time') as HTMLElement | null;
  if (ts) ts.textContent = clockText(view.terminalTs ?? view.ts);
  fixed.hidden = false;
}

/** Create an `auth` card. A frozen view is built terminal-only (no action row). */
export function createAuthCard(view: CardView, deps: CardDeps): HTMLLIElement {
  const doc = deps.doc;
  const { li, col } = createCardShell(view, deps, ['entry-assistant', 'msg', 'msg-assistant', 'msg-auth'], CARD_TAG_LABELS.auth);
  li.setAttribute('data-decision', decisionState(view));

  if (!view.frozen) {
    // The legacy `#confirm` id must resolve to the NEWEST open card: strip it from any
    // earlier (already-decided) card before minting it here. The v1 confirm-request
    // selectors (`#confirm` / `#confirm-summary` / `#confirm-allow` / `#confirm-deny`)
    // therefore keep working without the retired exclusive slot.
    for (const stale of Array.from(doc.querySelectorAll('#confirm, #confirm-summary'))) stale.removeAttribute('id');
    const confirm = doc.createElement('div');
    confirm.id = 'confirm';
    confirm.className = 'auth-confirm';
    confirm.setAttribute('data-destructive-option', 'confirm');
    const scope = doc.createElement('p');
    scope.className = 'auth-scope';
    scope.textContent = view.payload.prompt ?? '（无范围说明）';
    const summary = doc.createElement('div');
    summary.id = 'confirm-summary';
    summary.textContent = view.payload.prompt ?? '（无范围说明）';
    confirm.append(scope, summary);
    col.appendChild(confirm);
    consequencePreview(view, deps, col);

    const actions = doc.createElement('div');
    actions.className = 'auth-actions';
    const approve = doc.createElement('button');
    approve.id = 'confirm-allow';
    approve.type = 'button';
    approve.setAttribute('data-act', 'approve');
    approve.setAttribute('data-destructive-option', 'confirm-allow');
    approve.textContent = '批准';
    approve.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'approve'));
    const reject = doc.createElement('button');
    reject.id = 'confirm-deny';
    reject.type = 'button';
    reject.setAttribute('data-act', 'reject');
    reject.setAttribute('data-destructive-option', 'confirm-deny');
    reject.textContent = '拒绝';
    reject.addEventListener('click', () => deps.onCardAction?.(view.cardId, 'reject'));
    actions.append(approve, reject);
    col.appendChild(actions);

    const fixed = createFixedRegion(doc, 'auth-fixed');
    fixed.append(fixedText(doc, 'auth-fixed-text', ASK_COPY.approved), clockTextNode(doc, view.ts));
    col.appendChild(fixed);
  } else {
    const scope = doc.createElement('p');
    scope.className = 'auth-scope';
    scope.textContent = view.payload.prompt ?? '（无范围说明）';
    col.appendChild(scope);
    consequencePreview(view, deps, col);
    const fixed = createFixedRegion(doc, 'auth-fixed');
    fixed.append(fixedText(doc, 'auth-fixed-text', authFixedText(view)), clockTextNode(doc, view.terminalTs ?? view.ts));
    fixed.hidden = false;
    col.append(fixed, auditEntry(view, deps));
  }
  return li;
}

/** Apply the terminal transition to an open auth card (remove the action row). */
export function patchAuthCard(view: CardView, node: HTMLElement): void {
  node.setAttribute('data-decision', decisionState(view));
  const actions = node.querySelector('.auth-actions');
  if (actions) actions.remove();
  // The already-decided card keeps its legacy ids but hides them (`display:none`), so
  // `#16t`「拒绝后 close 确认框关闭」observes a hidden `#confirm` instead of a vanished one.
  const confirm = node.querySelector('#confirm') as HTMLElement | null;
  if (confirm) confirm.hidden = true;
  const summary = node.querySelector('#confirm-summary') as HTMLElement | null;
  if (summary) summary.hidden = true;
  fillAuthFixed(node, view);
  if (!node.querySelector('.auth-audit')) {
    const deps: CardDeps = { doc: node.ownerDocument };
    node.querySelector('.card-col')?.appendChild(auditEntry(view, deps));
  }
}
