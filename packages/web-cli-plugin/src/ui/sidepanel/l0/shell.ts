/**
 * V4-1 TASK-506 (ADR-V4-017 / ADR-V4-019 / ADR-V4-022) — the三区 skeleton shell.
 *
 * Owns the three things the default screen answers, and nothing else:
 *   ① 我在哪 + ② 谁在管我  → `.site-summary`（**只读** `role=status`；v3 的
 *      `#l0-status-band` 一整条可点带退役 —— 工具栏现在只承载 4 入口 + 主题）
 *   ③ 下一步做什么        → `#l0-decision`（决策卡 + 拾取 + 引用 chip；同构迁入
 *      `#stream` 内的 `li[data-transitional-host="v4-3"]`，id / ARIA 全保留）
 *   plus `#risk-rail`（永不折叠，唯一写入者仍是 `l0/risk-rail.ts`）与
 *   `#region-statusbar`（`statusbar.ts`）。
 *
 * The shell is deliberately a thin writer:
 *   - every number/label it shows comes from `l0ViewModel()` (pure, node-tested);
 *   - it never touches `#stream`'s own behaviour or any v1 handler;
 *   - collapse goes through the `disclosure` controller, and the risk rail is
 *     written only by `renderRiskRail()`.
 *
 * @module l0/shell
 */
import type { DisclosureController } from '../disclosure.js';
import type { L2Counts, L2ViewKey } from '../l2/counts.js';
import { l0ViewModel } from '../view-model.js';
import type { L0Input, L0View } from '../view-model.js';
import { setAskFallbackOpen } from '../cards/askuser.js';
import { renderRiskRail } from './risk-rail.js';
import { mountStatusBar } from './status-bar.js';
import { mountStatusBar as mountStatusZone, riskActiveOf } from '../statusbar.js';

export interface L0Handle {
  /** Re-derive and repaint the whole L0 skeleton. */
  update(input: L0Input): L0View;
  /** Current derived view (for diagnostics / gates). */
  view(): L0View | null;
  /** IAN-2 (ADR-IAN-004 §①): open the **in-card** fallback input (`.ask-fallback`). */
  revealFallback(): void;
  hideFallback(): void;
  /** L2 entry point (v3-3: the real view replacement / settings view). */
  openL2(which: L2ViewKey): void;
  /**
   * V4-1 (ADR-V4-022 第 3 条): re-sync the four `#l2-entry-*` triggers'
   * per-target `aria-expanded` pair. The panel calls this when a view closes
   * through a path the shell does not own (e.g. `#settings-back`), so the pair
   * can never go stale (`aria-expanded="true"` on a hidden view).
   */
  syncEntryAria(): void;
}

export interface MountL0Deps {
  doc: Document;
  disclosure: DisclosureController;
  /** Existing ask-resolution path (unchanged v1 wiring). */
  onAnswer(label: string): void;
  /** `#l0-statusbar` → `#l2-entries` expansion is owned by the controller. */
  onOpenSettings?(): void;
  /**
   * V3-3 (ADR-V3-025): the view-replacement entry for the three `#view-host`-bound
   * views. v3-1 only revealed an empty skeleton host — that code is GONE, the real
   * host (`l2/view-host.ts`) owns it now.
   */
  onOpenL2?(which: L2ViewKey): void;
  /** V3-3 (FR-V3-046): the ONE count source (entry labels + status bar). */
  getCounts?(): L2Counts;
}

/** Mount the L0 skeleton. Returns a handle the panel repaints from `render()`. */
export function mountL0(deps: MountL0Deps): L0Handle {
  const { doc, disclosure } = deps;
  const get = <T extends HTMLElement>(id: string): T => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`l0/shell: 缺少 DOM 契约 #${id}`);
    return el as T;
  };

  const summary = doc.querySelector('.site-summary');
  const status = get('status');
  const llmStatus = get('llm-status');
  const sessionLabel = get('session-label');
  const policyBadge = doc.createElement('span');
  const statusBar = mountStatusBar(doc);
  const statusZone = mountStatusZone(doc);

  // V4.5-1 W3 (TASK-V45-108): the decision shell is GONE — `#l0-kicker` / `#l0-more` /
  // `#l0-ref-toggle` / `#l0-ref-badge` retired, and the option pool / consequence preview
  // are rendered **inside the open ask/auth card** (`cards/decision-region.ts`). Note the
  // shell's `#l0-receipt-summary` is a **迁移容器** (review R1 BLOCK-01) — the id moves
  // with its content into the newest card's `.card-fixed` (`l1/panels.ts`), so it is NOT
  // retired and must not be listed in `RETIRED_CONTAINER_IDS`.
  // ★ IAN-2（ADR-IAN-004 §①「停引」/ ADR-IAN-005 §①）：`#composer` 真退役（DOM 移除，
  // 非 `hidden`）——本 shell 的 fallback **只**操作卡内 `.ask-fallback`：保留
  // `revealAskFallback()` 对 `l0?.revealFallback()` 的调用（PD-IAN-007），但调用链内
  // **零流外面**（写入面收敛到卡内 ⇒ 唯一输入载体）。四处兜底入口因此不再出现「双 reveal」。
  const revealFallback = (): void => {
    // I-03 (v4-3 review): go through the ask card's own mutual-disclosure function so
    // the「改用描述」entry point and the in-card「其他…」toggle produce the SAME DOM
    // state (options collapsed while the fallback is open ⇒ 4 clickables ≤ 6).
    setAskFallbackOpen(doc, true);
  };
  const hideFallback = (): void => {
    setAskFallbackOpen(doc, false);
  };

  // The policy badge is a read-only third channel next to the status text; it is
  // created once and only its text changes (never a new node per render, so the
  // density budget cannot drift with render count).
  policyBadge.className = 'l0-band-badge';
  policyBadge.id = 'l0-policy-badge';
  if (summary) summary.insertBefore(policyBadge, status);

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
    policyBadge.setAttribute('data-tone', view.band.policyTone);
    if (summary) {
      summary.setAttribute('data-status-dot', view.band.statusDot);
      summary.setAttribute('title', view.band.origin ? `完整 origin：${view.band.origin}` : '无活跃站点');
    }

    // ③ decision slot — V4.5-1 W3: the shell writers are retired together with their
    // containers. The decision facts are rendered by the card that owns them
    // (`askuser` / `auth` for the option pool, `ref` for the evidence + recovery).
    // V4-4 TASK-806: the panel-side `#l0-pick` button is retired. The `view.pick`
    // projection is NOT dropped — it still drives the status-bar「页面侧不可用」risk
    // row below and `riskActiveOf()`, so the unavailable fact stays discoverable
    // (never a silent failure). Only the retired button's writes are gone.
    // `view.decision` / `view.ref` stay in the pure view model (the gates derive from
    // it) but are no longer painted here: their carriers are the stream cards.

    // 风险位 — its ONLY writer, always resident, never folded (D3).
    // V3-2 (FR-V3-037): the invalidation row carries the dimension-specific
    // readable reason produced by the single judge (`l1/ref-validity.ts`).
    // R2 (2026-09-17): the steady probing variant (declaration backoff, no fetch in
    // flight) rides the same override channel — never a second rail writer.
    renderRiskRail(doc, view.risks, view.staleRef ?? undefined, view.probeSteady ?? undefined);
    // V3-4 (ADR-V3-030 §5): the page-side availability row. It is appended AFTER the
    // rail's single writer has cleared and filled the rail, so the five v3-1 classes
    // keep their owner and the row stays inside the never-folding risk zone. When the
    // page side is available the node is not even created → zero density footprint.
    const rail = doc.getElementById('risk-rail');
    if (rail) {
      const id = 'l0-page-unavailable';
      rail.querySelector(`#${id}`)?.remove();
      if (view.pick.unavailable) {
        const row = doc.createElement('div');
        row.id = id;
        row.className = 'risk-row';
        row.setAttribute('data-risk-class', 'pageUnavailable');
        row.setAttribute('data-risk-severity', 'warn');
        row.textContent = `页面侧不可用：${view.pick.unavailable}（拾取不可达；不静默失败）`;
        rail.appendChild(row);
      }
    }

    // L2 entries (counts realise FR-V3-015 / FR-V3-046's mechanism: the labels come
    // straight from the ONE derivation `l2/counts.ts`, shared with the view host).
    // V4-1: these four writers live in the toolbar now; `#region-statusbar`'s line +
    // J1/J2 container invariants are asserted by `statusbar.ts` from the same view.
    statusBar.render(view);
    statusZone.render(view, { riskActive: riskActiveOf(view) });
  };

  const openL2 = (which: L2ViewKey): void => {
    if (which === 'settings') {
      deps.onOpenSettings?.();
      statusBar.syncTriggerAria();
      return;
    }
    // V4-1: the four entries are **always visible** toolbar entries (the v3 entry
    // menu `#l2-entries` retired as a foldable panel), so there is nothing to fold
    // on entry any more — the expansion snapshot the view host takes is menu-free
    // by construction.
    deps.onOpenL2?.(which);
    // AC-V3-010 (I5): the four `#l2-entry-*` triggers must keep a truthful
    // `aria-expanded` pair with their own target (three track `#view-host`, the
    // settings entry tracks `#settings-view`).
    statusBar.syncTriggerAria();
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
    revealFallback,
    hideFallback,
    openL2,
    syncEntryAria: () => statusBar.syncTriggerAria(),
  };
}

/** Re-exported so tests/tools can assert the mandated terminal copy verbatim. */
export { OTHER_OPTION_LABEL as L0_OTHER_OPTION_LABEL } from '../view-model.js';
