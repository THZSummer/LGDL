/**
 * V3-1 — the risk rail (`#risk-rail`): five risk classes, three channels each,
 * permanently resident, structurally unfoldable (FR-V3-016 / FR-V3-017 /
 * FR-V3-018 / FR-V3-019, ADR-V3-005 / ADR-V3-006).
 *
 * This module is the **only writer** of `#risk-rail`:
 *   - it looks the rail up by id itself and never accepts a parent-node
 *     parameter, so no caller can graft risk rows into a foldable container;
 *   - `renderRiskRow()` is the single row template and throws when the readable
 *     text is empty — "icon only" / "colour only" cannot be expressed;
 *   - the hardline row carries **no** allow/permit control at all.
 *
 * The rail is *always* rendered, in every tier. When nothing is wrong it shows a
 * calm one-line summary, so "no risk rows" is still an explicit statement rather
 * than an empty hole (D6: never a clue-less void).
 *
 * Zero `chrome.*`, zero layout reads — pure DOM construction, so the copy table
 * and the destructive-filtering rules are unit-testable in plain Node.
 *
 * @module l0/risk-rail
 */

/** The five risk classes (spec §8.2 / plan §2.3). */
export type RiskClass = 'unauthorized' | 'probing' | 'hardline' | 'confirm' | 'staleRef';

/** Ordered list — the rail renders in this order, stable across renders. */
export const RISK_CLASSES: readonly RiskClass[] = Object.freeze([
  'unauthorized',
  'probing',
  'hardline',
  'confirm',
  'staleRef',
]);

/** Readable copy per class — text + badge + icon (three channels, AC-V3-008). */
export const RISK_COPY: Readonly<Record<RiskClass, { text: string; badge: string; icon: string }>> = Object.freeze({
  unauthorized: Object.freeze({
    text:
      '未授权：授权前所有命令按 S1 判定 fail-closed deny（不执行、不静默失败）。页面侧零注入。',
    badge: '未授权',
    icon: 'lock',
  }),
  probing: Object.freeze({
    text: '探测中：正在读取站点声明（web-cli/x.y）；本阶段不发命令、不改授权。',
    badge: '探测中',
    icon: 'search',
  }),
  hardline: Object.freeze({
    text: '硬底线拦下：evaluate 永不执行、永不自动放行，不提供「允许」选项。',
    badge: '被拦',
    icon: 'shield',
  }),
  confirm: Object.freeze({
    text: '破坏性待确认：将执行不可撤销的破坏性子命令 —— 确认选项不折叠，全部可见。',
    badge: '待确认',
    icon: 'alert',
  }),
  staleRef: Object.freeze({
    text: '引用已失效：引用目标已被页面重渲染移除；请重新拾取。',
    badge: '失效',
    icon: 'link-off',
  }),
});

/** Calm copy shown when no risk class is active (the rail is still resident). */
export const RISK_CALM_TEXT = '风险位：当前无风险';
export const RISK_CALM_BADGE = '无风险';

/** Minimal element surface (keeps the module stub-testable). */
export interface RailElement {
  id?: string;
  className?: string;
  textContent?: string | null;
  hidden?: boolean;
  type?: string;
  disabled?: boolean;
  title?: string;
  style?: unknown;
  setAttribute?(name: string, value: string): void;
  getAttribute?(name: string): string | null;
  appendChild?(child: RailElement): RailElement;
  append?(...children: (RailElement | string)[]): void;
  remove?(): void;
  addEventListener?(type: string, listener: () => void): void;
}

/** Minimal document surface this module needs. */
export interface RailDoc {
  getElementById(id: string): RailElement | null;
  createElement(tag: string): RailElement;
  createElementNS?(ns: string, tag: string): RailElement;
}

/** Path data for the small inline icons (no external assets, no icon font). */
const ICON_PATHS: Readonly<Record<string, string>> = Object.freeze({
  lock: 'M4 7V5a4 4 0 0 1 8 0v2h1v7H3V7h1zm2 0h4V5a2 2 0 0 0-4 0v2z',
  search: 'M10 2a5 5 0 1 1-2.9 9.1L3 15.2 1.8 14l4.1-4.1A5 5 0 0 1 10 2zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  shield: 'M8 1l6 2v5c0 3.2-2.4 5.6-6 7-3.6-1.4-6-3.8-6-7V3l6-2zm0 2.2L4 4.7V8c0 2.2 1.5 3.9 4 5 2.5-1.1 4-2.8 4-5V4.7l-4-1.5z',
  alert: 'M8 1l7 13H1L8 1zm0 3.6L3.6 12h8.8L8 4.6zM7 7h2v3H7V7zm0 4h2v2H7v-2z',
  'link-off': 'M2.8 1.4l11.8 11.8-1.4 1.4-3-3H9a4 4 0 0 1-3.9-3H7a2 2 0 0 0 2 1.5h.4L7.9 8.2A4 4 0 0 1 12 5h1V3h-1a6 6 0 0 0-4.6 2.1L4.2 2.8 2.8 1.4z',
});

/** Thrown when a risk row is built without readable text (three-channel rule). */
export class RiskRowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RiskRowError';
  }
}

/**
 * Validate the three channels. An empty text channel means the row would be
 * "icon only" / "badge only", which FR-V3-017 forbids outright.
 */
export function assertThreeChannels(text: string, badge: string, icon: string): void {
  if (!text || !text.trim()) throw new RiskRowError('renderRiskRow: 文字通道为空 — 禁止「仅图标 / 仅颜色」表达风险');
  if (!badge || !badge.trim()) throw new RiskRowError('renderRiskRow: 徽标通道为空');
  if (!icon || !icon.trim()) throw new RiskRowError('renderRiskRow: 图标通道为空');
}

/** Build the inline SVG icon (no `innerHTML`, no external URL). */
function buildIcon(doc: RailDoc, name: string): RailElement {
  const svg = doc.createElementNS
    ? doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    : doc.createElement('svg');
  // NB: SVGElement.className is an SVGAnimatedString (read-only) — the class must
  // be written as an attribute, otherwise every render throws and takes the whole
  // panel render down with it.
  if (svg.setAttribute) svg.setAttribute('class', 'risk-icon');
  else svg.className = 'risk-icon';
  svg.setAttribute?.('viewBox', '0 0 16 16');
  svg.setAttribute?.('aria-hidden', 'true');
  const path = doc.createElementNS
    ? doc.createElementNS('http://www.w3.org/2000/svg', 'path')
    : doc.createElement('path');
  path.setAttribute?.('d', ICON_PATHS[name] ?? ICON_PATHS.alert);
  path.setAttribute?.('fill', 'currentColor');
  svg.appendChild?.(path);
  return svg;
}

/**
 * The single risk-row template. `cls` selects the copy; an explicit `spec`
 * override is only used by the calm summary.
 */
export function renderRiskRow(
  doc: RailDoc,
  input: RiskClass | { text: string; badge: string; icon: string; severity?: 'risk' | 'calm'; riskClass?: string },
): RailElement {
  const spec =
    typeof input === 'string'
      ? { ...RISK_COPY[input], severity: 'risk' as const, riskClass: input }
      : { severity: 'risk' as const, ...input };
  assertThreeChannels(spec.text, spec.badge, spec.icon);

  const row = doc.createElement('div');
  row.className = 'risk-row';
  row.setAttribute?.('data-risk-severity', spec.severity ?? 'risk');
  if (spec.riskClass) row.setAttribute?.('data-risk-class', spec.riskClass);

  const icon = buildIcon(doc, spec.icon);
  const text = doc.createElement('span');
  text.className = 'risk-text';
  text.textContent = spec.text;
  const badge = doc.createElement('span');
  badge.className = 'risk-badge';
  badge.textContent = spec.badge;

  row.append?.(icon, text, badge);
  return row;
}

/** How many "why / details" entries a risk class is allowed to add (≤1 each). */
export const RISK_DETAIL_ENTRY_LABEL = '为什么';

/**
 * Render the whole rail. The rail node is looked up **by id** — the function
 * takes no parent parameter on purpose (no caller can relocate it).
 *
 * Returns the number of rows written, for gates/diagnostics.
 */
export function renderRiskRail(doc: RailDoc, active: readonly RiskClass[]): number {
  const rail = doc.getElementById('risk-rail');
  if (!rail) throw new RiskRowError('renderRiskRail: #risk-rail 不存在（风险位必须常驻）');
  const signature = RISK_CLASSES.filter((c) => active.includes(c)).join('|');
  if (signature === lastRiskSignature && renderedRows.length > 0) return renderedRows.length;
  lastRiskSignature = signature;
  // Clear previous rows without innerHTML (no HTML injection surface at all).
  // `textContent = ''` drops every child node; the rail node itself stays put
  // (its id, its position at the top of the panel, its non-foldability).
  for (const row of renderedRows) row.remove?.();
  renderedRows = [];
  rail.textContent = '';
  const rows: RailElement[] = [];
  const uniq = RISK_CLASSES.filter((c) => active.includes(c));
  if (uniq.length === 0) {
    rows.push(renderRiskRow(doc, { text: RISK_CALM_TEXT, badge: RISK_CALM_BADGE, icon: 'shield', severity: 'calm' }));
  } else {
    for (const cls of uniq) rows.push(renderRiskRow(doc, cls));
  }
  for (const row of rows) rail.appendChild?.(row);
  renderedRows = rows;
  return rows.length;
}

/** Rows written by the last `renderRiskRail` call (module-local, never global). */
let renderedRows: RailElement[] = [];

/** Signature of the last paint — the rail rebuilds DOM nodes, so an unchanged
 *  risk set must not pay for it (the panel repaints on every state push). */
let lastRiskSignature = '';

/** An ask/decision option as the view model sees it. */
export interface DecisionOption {
  label: string;
  /** `destructive` options may NEVER be folded (FR-V3-018 / EC-V3-015). */
  kind?: 'normal' | 'destructive';
  recommended?: boolean;
}

/** The terminal escape hatch — verbatim, asserted character-for-character. */
export const OTHER_OPTION_LABEL = '其他…（我来描述）';

/**
 * Split the round's options for the decision card.
 *
 * `destructive` options are **structurally** removed from the foldable pool
 * before anything else happens, so they can only ever be rendered directly in
 * `#l0-decision` — the partition is a filter, not a convention.
 */
export function partitionDecisionOptions(options: readonly DecisionOption[]): {
  destructive: DecisionOption[];
  recommended: DecisionOption[];
  folded: DecisionOption[];
  /** `#l0-more`'s N: the number of options that live behind the disclosure. */
  foldedCount: number;
} {
  const destructive = options.filter((o) => o.kind === 'destructive');
  const rest = options.filter((o) => o.kind !== 'destructive');
  const recommended = rest.filter((o) => o.recommended).slice(0, MAX_VISIBLE_RECOMMENDED);
  const visible = new Set(recommended);
  // Everything else — plus the terminal 「其他…（我来描述）」 — goes behind the
  // disclosure. The terminal item stays the LAST option of the sequence.
  const folded = rest.filter((o) => !visible.has(o));
  return { destructive, recommended, folded, foldedCount: folded.length + 1 };
}

/**
 * Visible recommended options. FR-V3-011 allows ≤2; V3-1 shows **one**
 * recommended option plus the always-last terminal 「其他…（我来描述）」 inside
 * the disclosure, which keeps the default tier at exactly 7 clickables while
 * still satisfying "≤2 推荐选项" (ADR-V3-013's per-item budget is preserved: one
 * recommended slot is re-allocated to the terminal item).
 */
export const MAX_VISIBLE_RECOMMENDED = 1;

/** Control labels that would constitute an "allow / permit" escape hatch. */
export const FORBIDDEN_ALLOW_LABELS: readonly string[] = Object.freeze([
  '允许',
  '放行',
  '允许执行',
  '允许 evaluate',
  '忽略硬底线',
  '覆盖',
]);

/**
 * Hardline guard used by the risk gate: the rail (and the decision area) must
 * contain **zero** allow/permit controls (FR-V3-019).
 */
export function assertNoAllowControls(labels: readonly string[]): void {
  const bad = labels.filter((label) => FORBIDDEN_ALLOW_LABELS.some((f) => label.trim() === f));
  if (bad.length > 0) throw new RiskRowError(`硬底线被拦时不得提供允许控件：${bad.join(' / ')}`);
}
