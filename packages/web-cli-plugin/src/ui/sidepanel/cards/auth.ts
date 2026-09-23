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
// V5.5F-2 TASK-V55F-211：凭据形掩码走**单一口径**（`maskRefDigest` = base `maskTextPayload`
// + 裸词元形兜底，EC-SGO-019）—— 禁止第二份掩码实现。
import { maskRefDigest } from '../l1/ref-scope.js';
import { mountDecisionRegion } from './decision-region.js';
import { CARD_TAG_LABELS, createCardShell, createFixedRegion, fixedText, type CardDeps } from './shared.js';

/**
 * V5.5F-2 **TASK-V55F-211 / 212** (ADR-SGO-004 §7/§8/§10 · FR-SGO-046/047/050 ·
 * PD-SGO-007 · N-SGO-026 · R-SGO-914) — the batch plan's **render-only rows**.
 *
 * ── 纪律（为什么在卡里而不是在 wire 里）──────────────────────────────────────
 *
 *   · 行**只经 `textContent` 渲染** ⇒ 不进任何 `data-*` / DOM 属性（法八四面之一）；
 *   · 每行在**渲染前**逐字段掩码（`maskTextPayload`）⇒ 凭据形值上不了屏（EC-SGO-019）；
 *   · 展示上限 **8 行 + 诚实计数行**（PD-SGO-007：纯显示策略，**不改变授权范围** ——
 *     指纹覆盖全部 N 条）。
 */
export const AUTH_PLAN_RENDER_MAX = 8;

/** 计划行的可读文案（唯一构造点；掩码 + 有界展示 + 诚实计数）。 */
export function authPlanRows(plan: { readonly entries?: readonly { readonly refNum?: number; readonly selector: string; readonly fromDigest: string; readonly toText: string }[] } | undefined): readonly string[] {
  const entries = plan?.entries ?? [];
  if (entries.length === 0) return [];
  const rows = entries.slice(0, AUTH_PLAN_RENDER_MAX).map((e, i) => {
    const label = `#${e.refNum ?? i + 1} ${maskRefDigest(e.selector)}`;
    return `${label}：${maskRefDigest(e.fromDigest)} → ${maskRefDigest(e.toText)}`;
  });
  if (entries.length > AUTH_PLAN_RENDER_MAX) {
    rows.push(`共 ${entries.length} 条（仅显示前 ${AUTH_PLAN_RENDER_MAX}）—— 一次批准覆盖全部 ${entries.length} 条`);
  }
  return rows;
}

/** 中止 / 部分完成的**如实交代**文案（不谎报整批成功；零死端 ⇒ 附可达下一步）。 */
export const AUTH_PLAN_ABORT_TEXT =
  '本轮批量计划已中止：计划内条目**未全部执行**（如实登记，不视为整批成功）。可在已引用目标内重新发起，或重新拾取目标后再试。';

/**
 * `data-decision` for an auth card (shim D2/D3/D5 verbatim, plus BLOCK-01).
 *
 * ── BLOCK-01 (v4-3 review) ───────────────────────────────────────────────────
 *
 * A pending authorization that outlives its turn / is replaced / loses its session
 * reaches the `cancelled` terminal. Before this round {@link decisionState} mapped
 * that to `'pending'` and {@link authFixedText} fell through to「已批准」— i.e. the
 * UI and the trace said the user had **approved** a destructive operation they
 * never approved. `cancelled` is therefore its own `data-decision` value and its own
 * copy; the「never a silent approve」rule (ADR-V4-031) is structural again.
 */
export function decisionState(view: CardView): 'pending' | 'approved' | 'rejected' | 'cancelled' {
  if (view.terminal === 'approved') return 'approved';
  if (view.terminal === 'rejected') return 'rejected';
  if (view.terminal === 'cancelled') return 'cancelled';
  return 'pending';
}

/** The固化 copy of an auth card (shim D3 / D5 + BLOCK-01 cancelled). */
export function authFixedText(view: CardView): string {
  if (view.terminal === 'rejected') return ASK_COPY.rejected;
  if (view.terminal === 'cancelled') return ASK_COPY.authCancelled;
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
  // V4.5-1 W3 (TASK-V45-108): the template now ships **on the card itself** (the
  // retired decision shell owned the only static copy). Card-scoped lookup first, so a
  // bare-card node test / a second open card can never clone the wrong template.
  const tpl = ((col.querySelector('template#l1-consequence-tpl') ??
    doc.getElementById('l1-consequence-tpl')) as HTMLTemplateElement | null);
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

/** The batch plan block: `textContent`-only rows (≤8) + the honest count line. */
function planBlock(view: CardView, doc: Document, col: HTMLElement): void {
  const rows = view.plan ?? [];
  if (rows.length === 0) return;
  const box = doc.createElement('div');
  box.className = 'auth-plan';
  const head = doc.createElement('p');
  head.className = 'auth-plan-head';
  head.textContent = '本批将写入（一次批准覆盖下列条目）：';
  box.appendChild(head);
  const list = doc.createElement('ol');
  list.className = 'auth-plan-rows';
  for (const row of rows) {
    const li = doc.createElement('li');
    // 仅 textContent（内容绝不进属性）；行已在构造处掩码。
    li.textContent = row;
    list.appendChild(li);
  }
  box.appendChild(list);
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
    // V4.5-1 W3 (TASK-V45-108): the option pool + consequence preview live in the card;
    // mounted FIRST so the card-local `#l1-consequence-tpl` is the one cloned below.
    mountDecisionRegion(view, deps, col);
    consequencePreview(view, deps, col);
    // V5.5F-2 TASK-V55F-211：计划行（渲染用字段，**非 payload**）；缺省 ⇒ 零变化。
    planBlock(view, doc, col);

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
export function patchAuthCard(view: CardView, node: HTMLElement, deps?: CardDeps): void {
  node.setAttribute('data-decision', decisionState(view));
  const actions = node.querySelector('.auth-actions');
  if (actions) actions.remove();
  // V4.5-1 W3: the decision region belongs to the OPEN card only — it is removed on the
  // terminal transition exactly like the action row (so the legacy ids resolve to the
  // newest OPEN card, never to a decided one).
  for (const region of Array.from(node.querySelectorAll('.card-more'))) region.remove();
  // The already-decided card keeps its legacy ids but hides them (`display:none`), so
  // `#16t`「拒绝后 close 确认框关闭」observes a hidden `#confirm` instead of a vanished one.
  const confirm = node.querySelector('#confirm') as HTMLElement | null;
  if (confirm) confirm.hidden = true;
  const summary = node.querySelector('#confirm-summary') as HTMLElement | null;
  if (summary) summary.hidden = true;
  fillAuthFixed(node, view);
  // V5.5F-2 **TASK-V55F-212**（ADR-SGO-004 §8 · FR-SGO-047 · EC-SGO-011）——
  // 批量计划**中止**的如实交代：`cancelled` 终态 + 部分完成如实（**不谎报整批成功**）+
  // 零死端（文案给出可达下一步）。`auth` 6 终态语义逐字不变（此处只**追加**一行可读交代）。
  if (view.terminal === 'cancelled' && (view.plan?.length ?? 0) > 0 && !node.querySelector('.auth-plan-partial')) {
    const p = node.ownerDocument.createElement('p');
    p.className = 'auth-plan-partial';
    p.textContent = AUTH_PLAN_ABORT_TEXT;
    node.querySelector('.card-col')?.appendChild(p);
  }
  if (!node.querySelector('.auth-audit')) {
    // BLOCK-04 (v4-3 review): the audit exit must carry the REAL deps — the previous
    // `{ doc: node.ownerDocument }` left `onCardAction` undefined while the handler
    // still called `preventDefault()`, so「刚决策的卡 → 审计」clicked and did nothing.
    // The renderer threads `cardDeps()` through `patchCardNode`; the ownerDocument
    // fallback only keeps a bare-card node test from throwing.
    const auditDeps: CardDeps = deps ?? { doc: node.ownerDocument };
    node.querySelector('.card-col')?.appendChild(auditEntry(view, auditDeps));
  }
}
