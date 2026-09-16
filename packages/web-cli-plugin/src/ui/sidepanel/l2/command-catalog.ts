/**
 * V3-3 TASK-303 (FR-V3-049 / FR-V3-052 / FR-V3-053 · EC-V3-016 — ADR-V3-027) — the
 * **命令目录（L2）** view: a **read-only projection** of the existing command
 * archive. Nothing is recomputed, nothing is re-worded, no control is added.
 *
 * Reused sources (read-only, zero edits):
 *   * `src/insight/archive-catalog.ts#buildArchiveModel` — per-card tier / source /
 *     default / override / clamp reason / delayMs (`ArchiveCard`);
 *   * `src/ui/tree/tree-view.ts#TREE_NO_ESCALATION_NOTE` — the **single** wording
 *     source for the `delay`（= deny, fail-closed, 非可配置档位）disambiguation.
 *     This view re-exports it and renders it verbatim; writing a second copy is
 *     what ADR-V3-027 §3 forbids;
 *   * `src/ui/tree/tree-ops.ts#TREE_ACTION_IDS` — the closed 9-action whitelist in
 *     its fixed order (surfaced here as a read-only list so the capability set is
 *     provably unchanged, AC-V3-026).
 *
 * Hard rules:
 *   * **分列**（EC-V3-016）: the live projection face and the parity baseline are two
 *     labelled numbers; never merged, never averaged, never "已全部渲染".
 *   * **零控件**: the view contains no `button` / `input` / `select` / `textarea` at
 *     all (no escalation path, no relaxation path — the v2 override controls stay
 *     in the tree view where the service-worker-side clamp already governs them).
 *   * Every number/label comes from the read-only model; this module never invents
 *     a policy value.
 *
 * @module l2/command-catalog
 */
import { buildArchiveModel, type ArchiveCard, type ArchiveModel } from '../../../insight/archive-catalog.js';
import type { PolicyAction } from '@lgdl/web-cli-base';
import type { ConnectTreeSnapshot } from '../../../insight/tree-model.js';
import { TREE_ACTION_IDS } from '../../tree/tree-ops.js';
import { TREE_NO_ESCALATION_NOTE } from '../../tree/tree-view.js';
import { stripUrlParams } from './audit.js';

/** Re-exported so gates compare against the ONE wording source, not a copy. */
export { TREE_NO_ESCALATION_NOTE };

/** The closed 9-action whitelist (fixed order) — surfaced read-only in this view. */
export const CATALOG_ACTION_WHITELIST = TREE_ACTION_IDS;

/** `SourceKind` → readable label (display only; the truth stays `card.sourceKind`). */
const SOURCE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'site-declared': '站点声明',
  'plugin-admin': '插件管理面',
  'plugin-tabs': '插件·标签页',
  'plugin-bookmarks': '插件·书签',
  'plugin-downloads': '插件·下载',
  'plugin-notify': '插件·通知',
  'plugin-clipboard': '插件·剪贴板',
  'base-builtin': '框架内置',
});

/** `PolicyAction` → readable tier label. */
const ACTION_LABELS: Readonly<Record<PolicyAction, string>> = Object.freeze({
  allow: 'allow（放行）',
  ask: 'ask（询问）',
  deny: 'deny（拒绝）',
});

export interface CatalogRow {
  cardId: string;
  /** `name` + optional `subcommand` (the命令名 the archive shows). */
  command: string;
  group: string;
  /** The tier/action the card really carries (`card.action`). */
  action: PolicyAction;
  actionLabel: string;
  source: string;
  /** Site origin for `site-declared` cards (URL parameters stripped), else ''. */
  origin: string;
  risk: string;
  denyCauseLabel: string;
  /** Default tier vs user override vs clamp-effective value — 分列, never merged. */
  defaultAction: PolicyAction;
  overrideAction: PolicyAction | null;
  effectiveAction: PolicyAction;
  overridable: boolean;
  tightenOnly: boolean;
  clampReasonLabel: string;
  /** Read-only tier options (`[]` for hard-floor cards ⇒ zero controls). */
  policyOptions: readonly PolicyAction[];
  /** Command-to-command interval (NOT the `delay` tier — see the single-source note). */
  delayMs: number;
  suppressed: boolean;
}

export interface CatalogView {
  liveCount: number;
  liveLabel: string;
  baselineCount: number | null;
  baselineLabel: string;
  parityLabel: string;
  readOnlyLabel: string;
  /** The ONE `delay` wording source, verbatim. */
  noEscalationNote: string;
  noExaggerationNote: string;
  rows: CatalogRow[];
}

/** Pure projection: archive model → the L2 view's read-only data. */
export function buildCatalogView(model: ArchiveModel): CatalogView {
  return {
    liveCount: model.header.liveCounts.cards,
    liveLabel: model.header.liveLabel,
    baselineCount: model.coverage.baseline.tools + model.coverage.baseline.subcommands,
    baselineLabel: model.header.baselineLabel,
    parityLabel: model.header.parityLabel,
    readOnlyLabel: model.header.readOnlyLabel,
    noEscalationNote: model.notes.noEscalationNote,
    noExaggerationNote: model.notes.noExaggerationNote,
    rows: model.cards.map(toRow),
  };
}

function toRow(card: ArchiveCard): CatalogRow {
  return {
    cardId: card.cardId,
    command: card.subcommand ? `${card.name} ${card.subcommand}` : card.name,
    group: card.group,
    action: card.action,
    actionLabel: ACTION_LABELS[card.action],
    source: SOURCE_LABELS[card.sourceKind] ?? card.sourceKind,
    origin: card.origin ? stripUrlParams(card.origin) : '',
    risk: card.risk ?? '—',
    denyCauseLabel: card.denyCauseLabel ?? '',
    defaultAction: card.defaultAction,
    overrideAction: card.overrideAction ?? null,
    effectiveAction: card.effectiveAction,
    overridable: card.overridable === true,
    tightenOnly: card.tightenOnly === true,
    clampReasonLabel: card.clampReasonLabel ?? '',
    policyOptions: card.policyControl ? card.policyControl.options.map((o) => o.policyAction) : [],
    delayMs: card.delayMs,
    suppressed: card.suppressed === true,
  };
}

/** `{live, baseline}` for the entry count — both numbers, from the same model. */
export function catalogCounts(snapshot: ConnectTreeSnapshot | null): { live: number | null; baseline: number | null } {
  if (!snapshot) return { live: null, baseline: null };
  const model = buildArchiveModel(snapshot);
  return {
    live: model.header.liveCounts.cards,
    baseline: model.coverage.baseline.tools + model.coverage.baseline.subcommands,
  };
}

/**
 * Render the view into `host`. **Read-only**: every node is a `div` / `span` /
 * `p` — a gate asserts the rendered subtree has zero form controls.
 */
export function renderCommandCatalog(doc: Document, host: HTMLElement, view: CatalogView): void {
  host.replaceChildren();

  const summary = doc.createElement('div');
  summary.className = 'l2-catalog-summary';
  for (const line of [view.liveLabel, view.baselineLabel, view.parityLabel, view.readOnlyLabel]) {
    const p = doc.createElement('p');
    p.className = 'l2-hint';
    p.textContent = line;
    summary.appendChild(p);
  }
  host.appendChild(summary);

  // The ONE `delay` wording source (verbatim) — never a second copy.
  const note = doc.createElement('p');
  note.className = 'l2-note l2-note-no-escalation';
  note.textContent = view.noEscalationNote;
  host.appendChild(note);

  const noExaggeration = doc.createElement('p');
  noExaggeration.className = 'l2-hint l2-note-no-exaggeration';
  noExaggeration.textContent = view.noExaggerationNote;
  host.appendChild(noExaggeration);

  const list = doc.createElement('div');
  list.className = 'l2-catalog-list';
  list.setAttribute('role', 'list');
  for (const row of view.rows) {
    const card = doc.createElement('div');
    card.className = 'l2-catalog-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-card-id', row.cardId);
    card.setAttribute('data-action', row.action);
    card.setAttribute('data-source-kind', row.source);
    card.setAttribute('data-effective-action', row.effectiveAction);
    card.setAttribute('data-overridable', String(row.overridable));
    card.setAttribute('data-tighten-only', String(row.tightenOnly));
    card.setAttribute('data-delay-ms', String(row.delayMs));
    // The read-only tier options the card *describes* (never a control): a gate can
    // assert a hard-floor card offers none and a tighten-only card never offers
    // `allow` (FR-V3-053 零提权，可 FAIL).
    card.setAttribute('data-policy-options', row.policyOptions.join(','));

    card.appendChild(line(doc, 'name', row.command));
    card.appendChild(line(doc, 'tier', `处置档：${row.actionLabel}`));
    card.appendChild(line(doc, 'source', `来源：${row.source}`));
    card.appendChild(
      line(doc, 'tier-split', `默认档：${row.defaultAction} · 用户覆盖：${row.overrideAction ?? '无'} · 生效值：${row.effectiveAction}`),
    );
    if (row.denyCauseLabel) card.appendChild(line(doc, 'deny-cause', `成因：${row.denyCauseLabel}`));
    if (row.origin) card.appendChild(line(doc, 'origin', `站点：${row.origin}`));
    if (row.suppressed) card.appendChild(line(doc, 'suppressed', '已抑制（不进入工具面）'));
    card.appendChild(
      line(
        doc,
        'control',
        row.overridable
          ? row.tightenOnly
            ? '可收紧档（仅 ask/deny；无 allow 控件）'
            : '可覆盖档（allow/ask/deny；控件在连接树视图内，SW 侧 clamp 仍强制）'
          : `硬底线不可覆盖档（零控件）${row.clampReasonLabel ? `：${row.clampReasonLabel}` : ''}`,
      ),
    );
    list.appendChild(card);
  }
  host.appendChild(list);

  const actions = doc.createElement('div');
  actions.className = 'l2-catalog-actions';
  const title = doc.createElement('p');
  title.className = 'l2-hint';
  title.textContent = `树内动作白名单（固定序，${CATALOG_ACTION_WHITELIST.length} 个，只读展示）：`;
  actions.appendChild(title);
  const ol = doc.createElement('ol');
  ol.className = 'l2-action-whitelist';
  for (const id of CATALOG_ACTION_WHITELIST) {
    const li = doc.createElement('li');
    li.dataset.actionId = id;
    li.textContent = id;
    ol.appendChild(li);
  }
  actions.appendChild(ol);
  host.appendChild(actions);
}

function line(doc: Document, name: string, text: string): HTMLElement {
  const p = doc.createElement('p');
  p.className = `l2-row l2-row-${name}`;
  p.setAttribute('data-field', name);
  p.textContent = text;
  return p;
}
