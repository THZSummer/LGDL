/**
 * V3-1 TASK-106 (ADR-V3-013 / ADR-V3-017) — the L0 skeleton shell.
 *
 * Owns the three things the default screen answers, and nothing else:
 *   ① 我在哪 + ② 谁在管我  → `#panel-top` (`#l0-status-band` is its only clickable)
 *   ③ 下一步做什么        → `#l0-decision` (decision card + pick + reference chip)
 *   plus `#risk-rail` (never folds, see `l0/risk-rail.ts`) and `#l0-statusbar`.
 *
 * The shell is deliberately a thin writer:
 *   - every number/label it shows comes from `l0ViewModel()` (pure, node-tested);
 *   - it never touches `#log`, `#composer`'s own behaviour, or any v1 handler;
 *   - collapse goes through the `disclosure` controller, and the risk rail is
 *     written only by `renderRiskRail()`.
 *
 * @module l0/shell
 */
import type { DisclosureController } from '../disclosure.js';
import { OTHER_OPTION_LABEL, l0ViewModel, moreOptionsLabel } from '../view-model.js';
import type { L0Input, L0View } from '../view-model.js';
import { renderRiskRail } from './risk-rail.js';
import { mountDecisionCard } from './decision-card.js';
import { mountStatusBar } from './status-bar.js';

export interface L0Handle {
  /** Re-derive and repaint the whole L0 skeleton. */
  update(input: L0Input): L0View;
  /** Current derived view (for diagnostics / gates). */
  view(): L0View | null;
  /** ADR-V3-014 §5: open the fallback input + full-text composer. */
  revealFallback(): void;
  hideFallback(): void;
  /** L2 entry point (v3-1: reveals the tree entry; v3-3 wires the rest). */
  openL2(which: 'tree' | 'commands' | 'audit' | 'settings'): void;
}

export interface MountL0Deps {
  doc: Document;
  disclosure: DisclosureController;
  /** Existing ask-resolution path (unchanged v1 wiring). */
  onAnswer(label: string): void;
  /** `#l0-statusbar` → `#l2-entries` expansion is owned by the controller. */
  onOpenSettings?(): void;
}

/** Mount the L0 skeleton. Returns a handle the panel repaints from `render()`. */
export function mountL0(deps: MountL0Deps): L0Handle {
  const { doc, disclosure } = deps;
  const get = <T extends HTMLElement>(id: string): T => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`l0/shell: 缺少 DOM 契约 #${id}`);
    return el as T;
  };

  const band = get('l0-status-band');
  const status = get('status');
  const llmStatus = get('llm-status');
  const sessionLabel = get('session-label');
  const policyBadge = doc.createElement('span');
  const kicker = get('l0-kicker');
  const pick = get<HTMLButtonElement>('l0-pick');
  const more = get<HTMLButtonElement>('l0-more');
  const refToggle = get<HTMLButtonElement>('l0-ref-toggle');
  const refSummary = get('l1-ref-summary');
  const viewHost = get('view-host');
  const treeFab = get('tree-fab');
  const statusBar = mountStatusBar(doc);
  const card = mountDecisionCard({ doc, onAnswer: deps.onAnswer });

  // The policy badge is a read-only third channel next to the status text; it is
  // created once and only its text changes (never a new node per render, so the
  // density budget cannot drift with render count).
  policyBadge.className = 'l0-band-badge';
  policyBadge.id = 'l0-policy-badge';
  band.insertBefore(policyBadge, status);

  let current: L0View | null = null;

  const applyView = (view: L0View): void => {
    current = view;
    status.textContent = view.band.statusText;
    llmStatus.textContent = view.band.llm;
    // D6: a compact badge is a summary, not a dead end — the full label stays
    // reachable through the band's tooltip and the L1 status panel.
    llmStatus.setAttribute('title', view.band.llmDetail);
    sessionLabel.textContent = view.band.session;
    policyBadge.textContent = view.band.policy;
    policyBadge.setAttribute('data-tone', view.band.statusDot);
    band.setAttribute('data-status-dot', view.band.statusDot);
    band.setAttribute('title', view.band.origin ? `完整 origin：${view.band.origin}` : '无活跃站点');

    // ③ decision card
    kicker.textContent = view.decision.visible ? '下一步做什么' : '下一步做什么（等待任务）';
    card.render(view);
    pick.disabled = view.pick.disabled;
    pick.setAttribute('title', view.pick.reason);
    pick.setAttribute('data-disabled-reason', view.pick.reason);
    more.setAttribute('data-count', String(view.decision.foldedCount));
    more.textContent = moreOptionsLabel(view.decision.foldedCount);
    refToggle.textContent = view.ref.label;
    refToggle.setAttribute('data-stale', String(view.ref.stale));
    // FR-V3-037: the invalidation mark is risk information, so the density caliber
    // attributes this chip to the risk class while it is stale.
    refToggle.setAttribute('data-ref-stale', String(view.ref.stale));
    refSummary.textContent = view.ref.count
      ? `引用 ${view.ref.count} 条（选择器 / 语义路径 / 文本摘要 / 捕获时间；证据层只读）。`
      : '暂无引用：用「从页面拾取」生成第一条引用。';

    // 风险位 — its ONLY writer, always resident, never folded (D3)
    renderRiskRail(doc, view.risks);

    // L2 skeleton (counts realise FR-V3-015 / FR-V3-046's mechanism)
    statusBar.render(view);
  };

  const openL2 = (which: 'tree' | 'commands' | 'audit' | 'settings'): void => {
    if (which === 'settings') {
      deps.onOpenSettings?.();
      return;
    }
    // v3-1 ships the skeleton: the global-tree entry point is revealed (the v2
    // drawer then behaves exactly as before); the catalogue / audit hosts are
    // filled by v3-3 (`#view-host` is the same host for all four).
    viewHost.hidden = false;
    viewHost.setAttribute('data-view', which);
    if (which === 'tree') treeFab.hidden = false;
    // Choosing an entry closes the entry menu (one interaction, one outcome) —
    // the L2 view host itself stays open. This also keeps the geometry identical
    // to the closed state: the panel is a menu, not resident chrome.
    disclosure.close('l2-entries');
  };

  for (const key of ['tree', 'commands', 'audit', 'settings'] as const) {
    const btn = doc.getElementById(`l2-entry-${key}`);
    if (!btn) continue;
    btn.addEventListener('click', () => openL2(key));
  }

  return {
    update(input: L0Input): L0View {
      const view = l0ViewModel(input);
      applyView(view);
      return view;
    },
    view: () => current,
    revealFallback: () => card.revealFallback(),
    hideFallback: () => card.hideFallback(),
    openL2,
  };
}

/** Re-exported so tests/tools can assert the mandated terminal copy verbatim. */
export const L0_OTHER_OPTION_LABEL = OTHER_OPTION_LABEL;
