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

// V5-3 TASK-V5-165 (ADR-V5-006 §2③): the rail's own subset — the auth state is a *state*,
// not a risk; it lives in `#auth-state`. RISK_CLASSES stays the 5-value derivation source.
export const RAIL_RISK_CLASSES: readonly RiskClass[] = Object.freeze([
  'probing',
  'hardline',
  'confirm',
  'staleRef',
]);

// V5-3 TASK-V5-164/165 (ADR-V5-006 §1/§2③, FR-ALLN-085): the two auth states — the ONE
// declaration of the chip copy (the four-word scan expects exactly this one hit).
export const AUTH_STATES: Readonly<Record<'yellow' | 'green', string>> = Object.freeze({
  yellow: '未授权 · 零注入',
  green: '已授权 · supported',
});

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
 * The single risk-**chip** template (V4-1 / ADR-V4-019 第 4 条).
 *
 * v3 rendered a `div.risk-row`; v4 renders a `button.risk-row` chip so a risk is
 * *clickable* (expand `#risk-detail` + scroll to the stream card). The three
 * channels are unchanged and still mandatory — an empty text channel throws, so
 * "icon only" / "colour only" cannot be expressed.
 *
 * The class name stays `risk-row` **on purpose**: `test/ui/density.mjs`
 * (`riskVisibilityProbeSource`) and `density-metrics.mjs#isRiskClassSource` key off
 * `.risk-row[data-risk-class=…]` / `closest('#risk-rail')`, so the chip form is a
 * template change with **zero** probe/attribution change.
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

  const calm = (spec.severity ?? 'risk') === 'calm';
  const row = doc.createElement(calm ? 'div' : 'button');
  row.className = 'risk-row';
  row.setAttribute?.('data-risk-severity', spec.severity ?? 'risk');
  if (spec.riskClass) row.setAttribute?.('data-risk-class', spec.riskClass);
  if (!calm) {
    // A chip is chrome: it must never be reachable from inside the exempt
    // `#stream` subtree (FR-CHAT-075 / RP-V4-06).
    row.setAttribute?.('data-chrome-control', 'statusbar');
    row.setAttribute?.('type', 'button');
    row.setAttribute?.('aria-controls', 'risk-detail');
    row.setAttribute?.('aria-expanded', 'false');
  }

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

/**
 * Render the whole rail. The rail node is looked up **by id** — the function
 * takes no parent parameter on purpose (no caller can relocate it).
 *
 * V3-2 (ADR-V3-020 / FR-V3-037) adds an optional `staleRef` override: the
 * invalidation row must state **which dimension** triggered it, so the copy
 * cannot be the frozen generic string any more. The override is data, never a
 * second template — `renderRiskRow` still owns the three channels, and the
 * override participates in the repaint signature so a changed reason repaints.
 *
 * R2 (2026-09-17) adds a second override of the same kind, `probeSteady`: while the
 * background sits in the terminal declaration backoff (no fetch in flight) the
 * `probing` row shows the steady「低频自动复查中」copy instead of the in-flight
 * 「探测中」line — same class, same three channels, no flicker. When the override is
 * absent (e.g. the density gate's forced `probing` cell, or a real in-flight fetch)
 * the static {@link RISK_COPY.probing} copy is used, unchanged.
 *
 * Returns the number of rows written, for gates/diagnostics.
 */
export function renderRiskRail(
  doc: RailDoc,
  active: readonly RiskClass[],
  staleRef?: { reason: string; refId: string },
  probeSteady?: { text: string; badge: string; icon: string },
): number {
  const rail = doc.getElementById('risk-rail');
  if (!rail) throw new RiskRowError('renderRiskRail: #risk-rail 不存在（风险位必须常驻）');
  const shell = doc.getElementById('risk-chips');
  const detail = doc.getElementById('risk-detail');
  // V5-3 TASK-V5-165 (ADR-V5-006 §2③): the rail carries the FOUR non-auth classes only
  // — the authorization state is the status bar chip's job (one carrier, zero double write).
  const uniq = RAIL_RISK_CLASSES.filter((c) => active.includes(c));
  const signature = `${uniq.join('|')}::${staleRef?.reason ?? ''}::${probeSteady?.text ?? ''}::${uniq.length === 0 ? 'calm' : 'risk'}`;
  const paint = (): number => {
    // Clear previous rows without innerHTML (no HTML injection surface at all).
    for (const row of renderedRows) row.remove?.();
    renderedRows = [];
    rail.textContent = '';
    if (detail) {
      detail.textContent = '';
      detail.hidden = true;
    }
    const rows: RailElement[] = [];
    if (uniq.length === 0) {
      // J2 / shim F3: zero risk ⇒ the chips container collapses to NOTHING
      // (0 clickable chips). The one-line「无风险」statement lives in the status
      // bar's own text, not in a chip.
      if (shell) shell.hidden = true;
      renderedRows = [];
      return 0;
    }
    if (shell) shell.hidden = false;
    for (const cls of uniq) {
      if (cls === 'staleRef' && staleRef) {
        rows.push(
          renderRiskRow(doc, {
            text: staleRef.reason,
            badge: RISK_COPY.staleRef.badge,
            icon: RISK_COPY.staleRef.icon,
            riskClass: 'staleRef',
          }),
        );
        continue;
      }
      // R2: the steady probing variant — same class/badge-channel rule, data-driven copy.
      if (cls === 'probing' && probeSteady) {
        rows.push(
          renderRiskRow(doc, {
            text: probeSteady.text,
            badge: probeSteady.badge,
            icon: probeSteady.icon,
            riskClass: 'probing',
          }),
        );
        continue;
      }
      rows.push(renderRiskRow(doc, cls));
    }
    for (const row of rows) rail.appendChild?.(row);
    if (detail) {
      for (const cls of uniq) {
        const line = doc.createElement('p');
        line.className = 'risk-detail-line';
        line.setAttribute?.('data-risk-detail', cls);
        line.textContent = `${RISK_COPY[cls].badge}：${uniq.length > 0 ? '详见流内对应卡。' : ''}本阶段不发命令、不改授权。`;
        detail.appendChild?.(line);
      }
    }
    // chip → expand `#risk-detail` + scroll to the stream card. Wired here because
    // this module is the ONLY writer of the rail (no caller can relocate it).
    for (const row of rows) {
      row.addEventListener?.('click', () => {
        const open = row.getAttribute?.('aria-expanded') === 'true';
        row.setAttribute?.('aria-expanded', String(!open));
        if (detail) detail.hidden = open;
      });
    }
    renderedRows = rows;
    return rows.length;
  };
  if (signature === lastRiskSignature && renderedRows.length > 0) return renderedRows.length;
  lastRiskSignature = signature;
  return paint();
}

/** Rows written by the last `renderRiskRail` call (module-local, never global). */
let renderedRows: RailElement[] = [];

/** Signature of the last paint — the rail rebuilds DOM nodes, so an unchanged
 *  risk set must not pay for it (the panel repaints on every state push). */
let lastRiskSignature = '';

/**
 * The terminal escape hatch — verbatim, asserted character-for-character.
 *
 * **Single source pair.** The product renders this label from
 * `view-model.ts#OTHER_OPTION_LABEL` (the decision card imports it from there);
 * this module keeps its own copy only so the rail-side unit tests can assert the
 * string without importing the whole view model. The two constants are pinned
 * equal by `test/l0-disclosure.test.ts` (review I2) — and the *rendered* DOM text
 * is pinned by `test/ui/l0.mjs`.
 *
 * Review I3 removed `partitionDecisionOptions` / `MAX_VISIBLE_RECOMMENDED = 1`
 * from this module: they were a second, product-unused partition rule whose
 * comment contradicted both the product constant (`L0_VISIBLE_RECOMMENDED = 2`)
 * and the measured clickable budget. The ONE partition rule lives in
 * `view-model.ts#l0ViewModel` and is tested there.
 */
export const OTHER_OPTION_LABEL = '其他…（我来描述）';

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

/**
 * 【O-2 口径护栏】`RISK_COPY.unauthorized` 只可**派生**、**禁止渲染**：授权态的唯一常显载体是
 * 状态栏 chip `#auth-state`（ADR-V5-006 §2③；`RAIL_RISK_CLASSES` 已把本类从 rail 子集排除）。
 * 若后续把本条接回 rail 渲染，即构成授权态**第二投影** —— 会命中 `test:auth-chip` 的四词 /
 * 语义位判据与 `test:l0` 的「rail 授权类零残留」判据。本类型为**类型位**（编译期擦除），故本
 * 护栏注释零运行时字节。
 */
export type UnauthorizedCopyGuardrailNote = 'derivable-only-never-rendered';
