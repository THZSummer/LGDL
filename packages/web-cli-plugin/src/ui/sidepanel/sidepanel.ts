/**
 * Side panel UI (FR-017 / FR-024 / FR-025).
 *
 * Extension-origin page (never injected into the host page). Renders the chat,
 * per-origin authorization, second-confirmation prompt and audit view. All state
 * transitions go through the pure reducer in `chat-state.ts`.
 */
import {
  REF_ROUND_PREFIX,
  createInitialState,
  reduce,
  resolveAsk,
  resolveConfirm,
  supersededAsk,
  type ChatRole,
  type SidepanelState,
} from './chat-state.js';
import { renderMarkdown } from './markdown.js';
import { createScrollFollow, isNearBottom, type ScrollMetrics } from './scroll-policy.js';
import {
  CONSENT_DEFAULT_OPEN,
  CONSENT_SUMMARY_TEXT,
  LOG_EMPTY_TEXT,
  activeSiteNotice,
  autoAuthCheckboxState,
  autoAuthMarker,
  buildOnboarding,
  buttonStates,
  currentSessionLabel,
  discoveryNotice,
  historyEntries,
  isLogEmpty,
  llmStatusView,
  sendDisabledReason,
  sortSessions,
  stateActionFromPayload,
  type SessionGroupView,
  type SessionSummaryView,
  type SessionsMessageView,
  type StateMessageView,
} from './view-model.js';
import { createSettingsOps, transportFromRuntime, type SettingsOps } from '../settings/ops.js';
import { mountSettingsPanel, type SettingsPanelHandle } from '../settings/panel.js';
import { createViewSwitch } from '../settings/view-switch.js';
import { AUTO_AUTH_HARD_LINES, type AutoAuthSettings } from '../../security/auto-authorize.js';
import type { LlmStatusSummary } from '../../llm/status.js';
import type { ActiveTabView } from '../../background/state-message.js';
import type { TestConnectionResult } from '../../llm/test-connection.js';
import { makeMessage, type PluginMessage, type PluginResponse } from '../../background/messaging.js';
import { requestOriginPermissionDetailed, createChromeAsyncKv } from '../../platform/extension-env.js';
import { handleClipboardOpMessage } from '../../platform/clipboard-page.js';
import { detectExtensionEnv, type ChromeEnvLike, type EnvGuardResult } from '../../platform/env-guard.js';
import { createKeyStore } from '../../llm/key-store.js';
import { shortBuildStamp } from '../../build-info.js';
// V2-2 (ADR-V2-004/005): floating connection tree (lazy overlay — additive).
import { mountTreeDrawer, type TreeDrawerHandle } from '../tree/tree-drawer.js';
// V2-3 (ADR-V2-008/009/013): closed 7-action revoke orchestrator (existing ops only).
import { createTreeOps } from '../tree/tree-ops.js';
import type { ConnectTreeSnapshot } from '../../insight/tree-model.js';
// V3-1 (ADR-V3-013 / ADR-V3-016): the L0 skeleton + the single disclosure
// controller. Both are additive: no existing render branch or handler is removed.
import { installDisclosure } from './disclosure.js';
import { mountL0, type L0Handle } from './l0/shell.js';
import { probingSteadyView, type L0Input, type L0View } from './view-model.js';
// V3-2 (ADR-V3-020~023): the L1 layer — eight in-place content classes, the
// fail-closed reference judge and the receipt triple. Additive: the L0 skeleton
// keeps its ownership and no existing handler is rewritten.
import { mountL1, type L1Handle, type L1Input } from './l1/panels.js';
import type { OwnershipTree } from '../../insight/ownership-tree.js';
import type { DeclarationStatus, RefRescue, RefResolution } from './l1/ref-validity.js';
// V3-4 (ADR-V3-030 / AC-CONV-1): the panel side of「页面即输入」— the two injection
// triggers, the document identity the page reports, and the drop target.
import { mountPickInput, type PickInputHandle } from './pick-input.js';
// V3-3 (ADR-V3-025~029): the L2 on-demand views. Additive: the views REUSE the
// existing read-only projections (`archive-catalog` / the audit channel / the v2
// tree drawer); no existing handler is rewritten.
import { deriveCounts, type L2Counts, type L2ViewKey } from './l2/counts.js';
import { mountViewHost, type ViewHostHandle } from './l2/view-host.js';
import { mountTheme, type ThemeHandle } from './theme.js';
import { assertChromeNotInStream } from './density-scope.js';
import { buildCatalogView, renderCommandCatalog } from './l2/command-catalog.js';
import { buildAuditRows, renderAudit } from './l2/audit.js';
import { buildArchiveModel } from '../../insight/archive-catalog.js';
// The parity baseline is a **pure runtime constant** (the same single source the
// SW injects as `snapshot.catalogMeta`) — importing it is what keeps the second
// count honest instead of hard-coded.
import { CATALOG_BASELINE_META } from '../../insight/catalog-meta.js';
import { SETTINGS_SECTION_IDS } from '../settings/sections.js';
import type { SnapshotCounts } from '../../insight/tree-model.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

/** TASK-022: human-readable role label (kept for tests/legacy selectors). */
const ROLE_LABEL: Record<ChatRole, string> = {
  user: '你',
  assistant: '助手',
  tool: '工具',
  system: '系统',
};

// TASK-023: tool-card collapse thresholds + per-entry remembered open state.
// Long output (whole documents, CLI dumps) starts collapsed; short output is
// expanded. Remembers explicit user toggles so a re-render (any state dispatch
// rebuilds the list) does not reset them.
const TOOL_LONG_CHARS = 480;
const TOOL_LONG_LINES = 10;
const TOOL_PREVIEW_MAX = 110;
const toolOpenState = new Map<number, boolean>();

/** First non-empty line, trimmed + truncated, for the collapsed card summary. */
function firstLine(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  return line.length > TOOL_PREVIEW_MAX ? `${line.slice(0, TOOL_PREVIEW_MAX)}…` : line;
}

/** A command line the agent is about to run (compact monospace, not a bubble). */
function renderCommand(entry: SidepanelState['entries'][number]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'cmd';
  const prompt = document.createElement('span');
  prompt.className = 'cmd-prompt';
  prompt.textContent = '›';
  const code = document.createElement('code');
  code.className = 'cmd-text';
  code.textContent = entry.text;
  wrap.append(prompt, code);
  return wrap;
}

/** Collapsible tool card: header = tool name + status + duration (+ preview). */
function renderToolCard(entry: SidepanelState['entries'][number]): HTMLElement {
  const details = document.createElement('details');
  details.className = 'tool-card';
  const lineCount = entry.text.split('\n').length;
  const isLong = entry.text.length > TOOL_LONG_CHARS || lineCount > TOOL_LONG_LINES;
  const remembered = toolOpenState.get(entry.id);
  details.open = remembered ?? !isLong;

  const summary = document.createElement('summary');
  summary.className = 'tool-card-head';

  const name = document.createElement('span');
  name.className = 'tool-name';
  name.textContent = entry.tool ?? '工具';

  const status = document.createElement('span');
  status.className = `tool-status ${entry.ok === false ? 'fail' : entry.ok === true ? 'ok' : 'unknown'}`;
  status.textContent = entry.ok === false ? '✖ 失败' : entry.ok === true ? '✓ 成功' : '完成';

  summary.append(name, status);
  if (typeof entry.ms === 'number') {
    const ms = document.createElement('span');
    ms.className = 'tool-ms';
    ms.textContent = `${entry.ms} ms`;
    summary.appendChild(ms);
  }
  const preview = firstLine(entry.text);
  if (preview) {
    const p = document.createElement('span');
    p.className = 'tool-preview';
    p.textContent = preview;
    summary.appendChild(p);
  }

  const body = document.createElement('pre');
  body.className = 'tool-card-body';
  body.textContent = entry.text;

  details.append(summary, body);
  details.addEventListener('toggle', () => toolOpenState.set(entry.id, details.open));
  return details;
}

/** Thinking indicator shown while a (non-streaming) LLM call is in flight. */
function renderThinking(): HTMLElement {
  const block = document.createElement('div');
  block.className = 'entry entry-assistant msg msg-assistant msg-thinking';
  const bubble = document.createElement('div');
  bubble.className = 'msg-content content-assistant thinking';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-label', '助手正在处理…');
  for (let i = 0; i < 3; i += 1) {
    const dot = document.createElement('span');
    dot.className = 'thinking-dot';
    bubble.appendChild(dot);
  }
  block.appendChild(bubble);
  return block;
}

/**
 * TASK-022/TASK-023: render one chat entry as a role-distinguished block.
 *
 * - user      → right-aligned indigo bubble (verbatim text)
 * - assistant → left-aligned slate bubble (safe Markdown)
 * - tool      → collapsible tool card when the background supplied a name,
 *               otherwise a compact dashed notice (e.g. LLM retry notice)
 * - system    → amber bubble; `kind==='error'` gets the red `.entry-error` style
 * - command   → compact monospace command line
 *
 * Legacy `.entry` / `.entry-<role>` / `.entry-error` selectors are preserved for
 * existing gates (zero regression).
 */
function renderEntry(entry: SidepanelState['entries'][number]): HTMLElement {
  const block = document.createElement('div');
  const errCls = entry.kind === 'error' ? ' entry-error' : '';

  if (entry.role === 'tool' && entry.tool) {
    block.className = `entry entry-${entry.role} msg msg-${entry.role}${errCls}`;
    block.appendChild(renderToolCard(entry));
    return block;
  }
  if (entry.kind === 'command') {
    block.className = `entry entry-${entry.role} msg msg-${entry.role} msg-command${errCls}`;
    block.appendChild(renderCommand(entry));
    return block;
  }
  if (entry.role === 'tool') {
    block.className = `entry entry-${entry.role} msg msg-${entry.role}${errCls}`;
    const notice = document.createElement('div');
    notice.className = 'msg-notice content-tool';
    notice.textContent = entry.text;
    block.appendChild(notice);
    return block;
  }

  block.className = `entry entry-${entry.role} msg msg-${entry.role}${errCls}`;
  const bubble = document.createElement('div');
  bubble.className = `msg-content content-${entry.role}`;
  bubble.setAttribute('aria-label', ROLE_LABEL[entry.role]);
  if (entry.role === 'assistant') {
    bubble.appendChild(renderMarkdown(entry.text, document));
  } else {
    bubble.textContent = entry.text;
  }
  block.appendChild(bubble);
  return block;
}

/**
 * Informed consent (FR-031 / NFR-008): the risks of operating a site on the
 * user's behalf, plus what the plugin can and cannot do. Kept as plain-language
 * strings so they are readable (and testable) without a browser.
 */
export const CONSENT_RISKS: readonly string[] = [
  '账号风控：自动化高频操作可能触发目标站点的验证码、限流或临时封禁。',
  '条款冲突：部分站点条款明确禁止自动化操作；请在使用前确认目标站点的使用条款。',
  '数据外泄面：站点返回内容按外部内容处理，不进日志/审计明文，但授权即表示你接受该站点的数据访问范围。',
];

export const CAPABILITY_BOUNDARY: readonly string[] = [
  '仅能操作你显式授权的来源，且该站点需声明 web-cli 协议。',
  '写/外部/状态/UI 等危险档位必须经二次确认；不可分类的调用一律拒绝（fail-closed）。',
  '站点自报的风险提示不作为放行依据；本插件不提供绕过门禁的直执行入口。',
  '不自动迁移内置助手配置；密钥仅保存在扩展本地存储，不回显明文。',
];

/** One-line consent summary used before the first authorization (FR-031). */
export function consentSummary(): string {
  return `知情同意：${CONSENT_RISKS.join(' ')}`;
}

let state: SidepanelState = createInitialState();
/** TASK-032: retained panel-presence port (auto-disconnects when the panel closes). */
let panelPort: ReturnType<typeof chrome.runtime.connect> | null = null;
/** Last background `llm-status` summary; null until the round-trip completes. */
let llmSummary: LlmStatusSummary | null = null;
let llmLoaded = false;
/** Last non-sensitive active-tab projection (TASK-020 任务 B). */
let activeTab: ActiveTabView | null = null;
/** decision ② / FR-048: current session id + switcher data. */
let sessionId: string | null = null;
let sessions: SessionSummaryView[] = [];
let groups: SessionGroupView[] = [];
/**
 * Scroll-follow policy (regression fix). The user's own send is unconditional;
 * appended assistant/tool/thinking content follows only while the live viewport
 * is anchored near the bottom (generous 48px threshold). The anchor is refreshed
 * from real `scroll` events and post-layout re-measurements — never from a stale
 * pre-append read (`scroll-policy.ts` documents the full rationale).
 */
const scrollFollow = createScrollFollow();

// ── V2-2 (ADR-V2-005): floating connection tree — lazy, additive ────────────
/** Connection-tree drawer handle; mounted in `wire()`, nothing pulled until the FAB opens. */
let treeDrawer: TreeDrawerHandle | null = null;

// ── TASK-033: in-panel settings view (no navigation away from the panel) ────
/** Settings controller, mounted lazily on first open (keeps panel load light). */
let settingsHandle: SettingsPanelHandle | null = null;

/** V3-1: the L0 skeleton handle (mounted once in `wire()`, repainted by `render()`). */
let l0: L0Handle | null = null;
/** V4-1: the three-state theme controller (mounted once in ). */
let themeToggle: ThemeHandle | null = null;

/** V3-2: the L1 layer handle (mounted once in `wire()`, repainted by `render()`). */
let l1: L1Handle | null = null;

/** V3-3: the L2 view host (view replacement; mounted once in `wire()`). */
let viewHost: ViewHostHandle | null = null;

/**
 * V3-3 (FR-V3-046) — the L2 count truth inputs. Both come from **existing**
 * channels and are never invented here:
 *   - `insightCounts` = `state.insight.counts` (the SW-pushed snapshot counts; the
 *     same projection the tree / catalogue render from). When the state reply does
 *     not carry it, the lazily pulled `insight-tree` snapshot's `meta.counts` is
 *     used instead — still the same truth, never a literal.
 *   - `auditEntries` = the length of the existing `audit-export` reply.
 * `l2Counts` is the ONE derived value the entry panel, the status bar and the view
 * headers all read.
 */
const l2Truth: { insightCounts: SnapshotCounts | null; auditEntries: number | null } = {
  insightCounts: null,
  auditEntries: null,
};
let l2Counts = deriveCounts({
  insightCounts: null,
  catalogMeta: CATALOG_BASELINE_META,
  auditEntries: null,
  settingsSections: SETTINGS_SECTION_IDS,
});
const currentL2Counts = (): L2Counts => l2Counts;
function refreshL2Counts(): void {
  l2Counts = deriveCounts({
    insightCounts: l2Truth.insightCounts,
    catalogMeta: CATALOG_BASELINE_META,
    auditEntries: l2Truth.auditEntries,
    settingsSections: SETTINGS_SECTION_IDS,
  });
}

/** The lazily pulled full snapshot — used ONLY for the catalogue's per-card data. */
let l2Snapshot: ConnectTreeSnapshot | null = null;
/** Raw audit channel reply (zero-plaintext projection happens in `l2/audit.ts`). */
let l2AuditEvents: readonly unknown[] = [];

/**
 * V3-1 test seams for the two risk projections that have no sidepanel-side
 * receipt path yet:
 *   - `hardlineCount` is normally derived from REAL blocked-receipt entries
 *     (`state.entries` with `kind === 'error'` mentioning `evaluate`); the seam
 *     lets the density gate force the state deterministically.
 *   - `staleRefCount` / `refCount` are injected because the引用失效 judge itself
 *     is v3-2's deliverable (the plan explicitly allows a test-only namespace:
 *     `window.__v3.testing`). They are read-only projections — no security
 *     decision reads them.
 */
/** `force` = show a class whose real transition lands in a later leaf; `off` =
 *  hide a class so the gate can measure the pure risk increment. */
const v3TestState = {
  refCount: 0,
  lastStaleRef: '',
  riskMode: {} as Record<string, 'force' | 'off'>,
  /**
   * V3-4: set when the L1 gate injects an env through the test seam. The production
   * env sync (`syncRefEnv`, AC-CONV-1) must then step aside — otherwise every
   * `render()` would overwrite the dimension the gate just injected and the five
   * validity dimensions could no longer be observed one by one. Production never sets
   * it; a real capture clears it (real facts supersede a fixture).
   */
  envOverride: false,
};

/**
 * V3-4: the page-side availability + declaration facts the reference judge needs.
 *
 * `pageUnavailable` is the **readable** reason the page side is missing (injection
 * refused, a restricted page, an unauthorized origin, a torn-down layer). `null` means
 * "available" — it is never used as a synonym for "unknown", because the L0 risk zone
 * must be able to tell「没有问题」from「没有页面」，and the pick entry's disabled state
 * comes from the same field.
 */
const pickFacts = {
  pageUnavailable: null as string | null,
  /**
   * R1: the declaration **state** travels too (`valid` / `invalid` / `absent`), so a
   * site that never declares web-cli can still produce usable references — the state
   * (not a digest) is the fact D4 compares. Single source: the SW's `declarationEnv`.
   */
  declaration: null as { status: DeclarationStatus; hash: string; version?: string } | null,
};
/** The reference the pending decision round was minted from (AC-CONV-2's binding). */
let pendingRefId: string | null = null;
/** V3-4: the page-side input adapter (injection triggers / identity / drop target). */
let pickInput: PickInputHandle | null = null;

/** Derive the pure L0 view-model input straight from the panel state. */
function l0Input(): L0Input {
  const refs = l1?.store().all() ?? [];
  const staleRefs = l1?.store().stale() ?? [];
  const llm = llmStatusView(llmLoaded ? llmSummary : null);
  const receiptHardLines = state.entries.filter(
    (entry) => entry.kind === 'error' && /evaluate|硬底线/.test(entry.text),
  ).length;
  return {
    activeOrigin: state.activeOrigin,
    authorized: state.authorized,
    trust: state.trust,
    llmBadge: llm.label,
    llmConfigured: llm.configured,
    sessionLabel: currentSessionLabel(sessions.find((s) => s.sessionId === sessionId) ?? null),
    // A background probe *refresh* on an already-discovered site must not flip the
    // band to「探测中」: that would make the L0 status flicker on a 15s timer while
    // the site is working. The transient state is still surfaced as a RISK row
    // (`probing`) whenever the site is not (yet) discovered.
    // R2 (2026-09-17): the same rule now covers the whole retry cycle — during the
    // terminal backoff the risk row shows the steady copy (`probeSteady`) instead of
    // blinking away, and only a real in-flight fetch reads「探测中」.
    probing: state.probe?.phase === 'probing' && state.discoveryState !== 'supported',
    ...(state.probe?.steady === true && state.discoveryState !== 'supported'
      ? { probeSteady: probingSteadyView(state.probe) }
      : {}),
    discoveryState: state.discoveryState ?? (state.probe?.phase === 'probing' ? '探测中' : '未知'),
    hardlineCount: receiptHardLines,
    // V3-2: the real judge's verdict replaces v3-1's zero projection — the chip's
    // stale mark and the risk rail's dimension reason both come from ONE store.
    staleRefCount: staleRefs.length,
    ...(staleRefs[0]?.readableReason ? { staleRefReason: staleRefs[0].readableReason } : {}),
    ...(staleRefs[0] ? { staleRefId: staleRefs[0].facts.refId } : {}),
    confirmPending: confirmActive(),
    riskForced: Object.entries(v3TestState.riskMode)
      .filter(([, mode]) => mode === 'force')
      .map(([cls]) => cls) as L0Input['riskForced'],
    riskSuppressed: Object.entries(v3TestState.riskMode)
      .filter(([, mode]) => mode === 'off')
      .map(([cls]) => cls) as L0Input['riskSuppressed'],
    ask: state.ask
      ? { prompt: state.ask.prompt, options: state.ask.options ?? [], recommendedCount: 2 }
      : null,
    refCount: refs.length || v3TestState.refCount,
    refStale: staleRefs.length > 0,
    // V3-4 (FR-V3-068): the readable page-side availability reason (null = available).
    // Forcing it through the testing seam lets the gate drive both directions.
    pickUnavailable: v3TestState.riskMode.pageUnavailable === 'off' ? null : pickFacts.pageUnavailable,
    // V3-3 (FR-V3-046): the four counts come from the ONE derivation, fed by real
    // truth reads (`state.insight.counts` + the existing audit channel). No literal.
    l2Counts: currentL2Counts(),
  };
}

/** True when a destructive confirmation is pending (real state, or the forced
 *  projection the L0 gate uses to make the state deterministic). */
function confirmActive(): boolean {
  return state.confirm !== null || v3TestState.riskMode.confirm === 'force';
}

/**
 * V3-2: the L1 layer's input. Class ① (status & connection details) is the
 * `#topbar` panel itself, so nothing is duplicated between the band and L1.
 */
function l1Input(l0View: L0View | null): L1Input {
  const lastUser = [...state.entries].reverse().find((entry) => entry.role === 'user');
  return {
    ask: state.ask ? { prompt: state.ask.prompt, options: state.ask.options ?? [] } : null,
    foldedOptions: l0View?.decision.foldedOptions ?? [],
    lastUserText: lastUser?.text ?? null,
  };
}

/** Install the `window.__v3.testing` namespace used by the density/l0 gates. */
function installV3TestHooks(): void {
  const win = window as unknown as { __v3?: { testing?: Record<string, unknown> } };
  win.__v3 = {
    ...(win.__v3 ?? {}),
    testing: {
      /**
       * V4-1 (FR-CHAT-075 / RP-V4-06): the product's own S1 assertion. The density
       * gate injects a violation and expects this to **throw**; a silent `false`
       * would be exactly the failure mode the exemption rule exists to prevent.
       */
      assertChromeNotInStream(): true {
        assertChromeNotInStream(document);
        return true;
      },
      /** V4-1: the current theme state (diagnostics only — never a security input). */
      themeState(): string {
        return themeToggle?.state ?? 'auto';
      },
      setRisk(cls: string, mode: 'force' | 'off' | 'natural' = 'force') {
        if (!['unauthorized', 'probing', 'hardline', 'confirm', 'staleRef'].includes(cls)) {
          throw new Error(`未知风险类：${cls}`);
        }
        // V3-2: `staleRef` is no longer a projection — it drives the REAL judge.
        // `force` injects one reference whose capture facts are complete but whose
        // page-side resolution says the element is gone (dimension D1), so the rail
        // renders the dimension-specific readable reason the product really shows.
        if (cls === 'staleRef') {
          if (mode === 'off' || mode === 'natural') l1?.store().reset();
          else {
            l1?.store().reset();
            l1?.injectRef(staleRefFacts());
            l1?.setResolution({ status: 'missing' });
            l1?.setEnv({
              currentOrigin: state.activeOrigin ?? '',
              authorized: true,
              documentId: 'doc-1',
              navSeq: 1,
              declarationHash: 'decl-1',
            });
            l1?.judge();
          }
          render();
          return;
        }
        if (mode === 'natural') delete v3TestState.riskMode[cls];
        else v3TestState.riskMode[cls] = mode;
        render();
      },
      /**
       * Re-pull the authoritative state from the service worker — the same call the
       * panel makes on load and after every action. The gates use it after driving
       * a background message directly (there is no generic state push to listen to).
       */
      refresh() {
        void refreshState();
      },
      /** Reveal the fallback input + the full-text composer (ADR-V3-014 §5). */
      revealFallback() {
        l0?.revealFallback();
      },
      hideFallback() {
        l0?.hideFallback();
      },
      /** Open the L1 status panel (`#topbar`) — the v1 toolbar lives there now. */
      openStatusDetails() {
        // V4-1（法则六 / ADR-V4-017）：v3 的 `#topbar` 折叠层（授权 / 撤销 / 会话 /
        // 分组 / LLM 测试）整体迁入 `#settings-view` 的「站点与授权」分区。等价改写 =
        // 「进入设置视图」，仍是**1 次交互**可达；不再存在可折叠的 `topbar` 目标
        // （`disclosure.ts#COLLAPSIBLE_TARGETS` 已移除，`assertFoldable` 会拒绝）。
        openL2View('settings');
      },
      /** Fold every disclosure layer (used by the density/risk fixtures). */
      collapseAll() {
        installDisclosure().collapseAll();
      },
      /**
       * Open the L2 entry panel + ENTER the global-tree view.
       *
       * V3-3: deliberately stops at the view (the tree body is NOT opened) so the
       * existing gates keep driving the v2 `#tree-fab` control themselves — the
       * product path (`#l2-entry-tree` click) opens the body immediately, which is
       * how the ≤2-interaction reachability requirement is met.
       */
      openTreeView() {
        
        openL2View('tree', { openTreeBody: false });
      },
      /** V3-3: enter any L2 view (the product path, incl. the tree body). */
      openL2View(key: string) {
        
        openL2View(key as L2ViewKey);
      },
      /** V3-3: return to the transcript through the product's own back button. */
      closeL2View() {
        const back = document.getElementById('l2-back');
        if (back) back.click();
      },
      /** V3-3 (FR-V3-046): the derived counts the panel is showing right now. */
      l2Counts() {
        return currentL2Counts();
      },
      /** V3-3: re-read the existing audit channel (count + view share this truth). */
      async refreshAudit() {
        return refreshAuditView();
      },
      setRefCount(count: number) {
        v3TestState.refCount = Math.max(0, count);
        render();
      },
      /**
       * V3-1 test seam: drives the ONE decision card through the same reducer
       * action the real `ask-user-request` push uses — only the transport
       * (background → panel message) is bypassed.
       */
      ask(prompt: string, options: string[]) {
        dispatch({ type: 'ask', requestId: 'v3-test-ask', kind: 'choice', prompt, options });
      },
      clearAsk() {
        dispatch({ type: 'ask-resolved' });
      },
      /**
       * Injects a stale-reference event. v3-1 has no page-side reference judge
       * (that is v3-4's deliverable), so this seam only drives the *projection*;
       * v3-2 will replace it with the real five-dimension judgement
       * (FR-V3-036) without changing the risk-rail contract.
       */
      staleRef(refId = 'ref-1') {
        v3TestState.lastStaleRef = String(refId);
        v3TestState.riskMode.staleRef = 'force';
        render();
      },
      reset() {
        v3TestState.refCount = 0;
        v3TestState.riskMode = {};
        v3TestState.envOverride = false;
        // V3-2: the L1 layer's real state (references / receipt / history) is
        // cleared too, so every fixture cell starts from the same default state.
        l1?.store().reset();
        // N-05（2026-09-16 收口轮）：`replace=true` 才真的**清空** env；旧的
        // `setEnv({})` 是合并语义、什么也不清 → 上一场景的 env 残留会掩盖
        // 「env 缺失 ⇒ unknown」类夹具（validate R1 实测）。
        l1?.setEnv({}, true);
        l1?.setResolution(undefined);
        // R3: the rescue observation + the「already re-anchored」记忆 are per-fixture too.
        l1?.setRescue(undefined);
        rescueProbedId = null;
        anchoredRefIds.clear();
        l1?.setSnapshot(null, null);
        render();
      },
      snapshot() {
        return {
          risks: l0?.view()?.risks ?? [],
          foldedCount: l0?.view()?.decision.foldedCount ?? 0,
          l1: l1?.report() ?? null,
        };
      },
      /**
       * V3-2 test seam for the L1 layer + the reference judge. One dispatcher
       * (`op`) rather than a wide method surface: everything below drives the SAME
       * code path the product uses (no shadow implementation), and the compact
       * shape keeps the tested surface from costing bundle size for nothing.
       */
      l1(op: string, ...args: unknown[]) {
        const handle = l1;
        if (!handle) return null;
        // The reference state feeds the L0 chip AND the risk rail, so the whole
        // panel is repainted after every step (the rail is L0's writer, not L1's).
        const out = ((): unknown => {
          switch (op) {
          case 'ref':
            return handle.injectRef(args[0] as Parameters<typeof handle.injectRef>[0]);
          case 'env':
            v3TestState.envOverride = true;
            handle.setEnv(args[0] as never, Boolean(args[1]));
            return handle.judge();
          case 'res':
            handle.setResolution(args[0] as RefResolution | undefined);
            return handle.judge();
          case 'rescue':
            // R3: inject a rescue observation (same shape the background probe returns) and
            // re-judge — the gate drives the REAL judge, not a shadow projection.
            handle.setRescue(args[0] as Parameters<typeof handle.setRescue>[0]);
            return handle.judge();
          case 'judge':
            return handle.judge();
          case 'act':
            // AC-CONV-2: the seam calls the production entry point itself (`applyRefAction`)
            // instead of `dispatchRefAction` directly — a second call site here would be
            // exactly the bypass the wiring gate forbids.
            return applyRefAction(String(args[0]), String(args[1] ?? 'ref-action'));
          case 'repick':
            // N-04: fresh facts + the caller's page-side observation (both from the
            // caller — the panel no longer fabricates `resolved`).
            return handle.repick(args[0] as never, args[1] as never);
          case 'receipt':
            return handle.pullReceipt(args[0] as never);
          case 'tree':
            return handle.setSnapshot(args[0] as OwnershipTree | null, args[1] as string | null);
            case 'history':
              return handle.history();
            default:
              return handle.report();
          }
        })();
        render();
        return out;
      },
    },
  };
}

/** Canonical stale-reference facts used by the `staleRef` risk projection. */
function staleRefFacts() {
  return {
    selector: '#ref-target',
    semanticPath: '连接树 › 能力面 › 引用目标',
    textDigest: '引用目标文本摘要',
    origin: state.activeOrigin ?? '',
    documentId: 'doc-1',
    navSeq: 1,
    declarationHash: 'decl-1',
    capturedAt: Date.now(),
  };
}
/** Chat ⇄ settings view switch; captures/restores scroll position + draft. */
const settingsViewSwitch = createViewSwitch({
  open: () => {
    document.body.classList.add('settings-open');
    const view = document.getElementById('settings-view');
    view?.classList.add('show');
    // V3-1: the `hidden` attribute is the real disclosure (the class stays for the
    // existing gates, but the density caliber only exempts `hidden`).
    if (view) view.hidden = false;
  },
  close: () => {
    document.body.classList.remove('settings-open');
    const view = document.getElementById('settings-view');
    view?.classList.remove('show');
    if (view) view.hidden = true;
    // V4-1 (ADR-V4-022 第 3 条): `#settings-back` closes the view without going
    // through the toolbar, so the shell must re-sync `#l2-entry-settings`'s
    // `aria-expanded` pair here — otherwise it stays `"true"` on a hidden view.
    l0?.syncEntryAria();
    // Re-measure the list after it becomes visible again and keep the anchor
    // honest, so the next appended message follows correctly.
    syncScrollAnchor(document.getElementById('stream'));
  },
  getScrollTop: () => document.getElementById('stream')?.scrollTop ?? 0,
  setScrollTop: (value) => {
    const log = document.getElementById('stream');
    if (log) log.scrollTop = value;
  },
  getDraft: () => (document.getElementById('input') as HTMLInputElement | null)?.value ?? '',
  setDraft: (value) => {
    const input = document.getElementById('input') as HTMLInputElement | null;
    if (input) input.value = value;
  },
});

/** Mount the shared settings controller once, then refresh it on every open. */
async function openSettingsView(): Promise<void> {
  const root = document.getElementById('settings-root');
  if (!root) return;
  if (!settingsHandle) {
    settingsHandle = mountSettingsPanel({
      root,
      doc: document,
      env: detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined),
      ops: buildSettingsOps(),
      getActiveOrigin: () => state.activeOrigin,
      onNotice: (text) => dispatch({ type: 'notice', text }),
      onLlmChanged: () => void refreshLlmStatus(),
    });
  }
  settingsHandle.setActiveOrigin(state.activeOrigin);
  settingsViewSwitch.showSettings();
  await settingsHandle.refresh();
}

/**
 * V2-3: the single `SettingsOps` factory shared by the in-panel settings view and
 * the connection-tree action runner (same existing ops, no new channels/deps).
 */
function buildSettingsOps(): SettingsOps {
  const env = detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined);
  return createSettingsOps({
    env,
    transport: transportFromRuntime(chrome.runtime as unknown as { sendMessage(message: unknown): Promise<unknown> }),
    store: createKeyStore(createChromeAsyncKv('web-cli')),
    buildStamp: shortBuildStamp(),
    manifestVersion: () => {
      try {
        return chrome.runtime.getManifest().version;
      } catch {
        return 'unknown';
      }
    },
    probeStorage: async () => {
      const kv = createChromeAsyncKv('web-cli-diag');
      const token = { at: Date.now() };
      await kv.set('probe', token);
      const back = await kv.get<{ at?: number }>('probe');
      await kv.remove('probe');
      return back && typeof back.at === 'number'
        ? { status: 'ok' as const, detail: '写入测试键 → 读回一致 → 已清理' }
        : { status: 'warn' as const, detail: '写入测试键后读回为空或结构不符（存储可能不可用）' };
    },
  });
}

/** Live scroll metrics of the message list (measured from the real DOM). */
function metricsOf(el: HTMLElement): ScrollMetrics {
  return { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop, clientHeight: el.clientHeight };
}

/** Re-read the message list and refresh the follow anchor from live layout. */
function syncScrollAnchor(el?: HTMLElement | null): void {
  const log = el ?? document.getElementById('stream');
  if (log) scrollFollow.observe(metricsOf(log));
}

/** True when the message list is scrolled to (near) the bottom. */
function isAtBottom(el: HTMLElement): boolean {
  return isNearBottom(metricsOf(el));
}

/** Show the "back to bottom" affordance only while scrolled away. */
function updateScrollHint(): void {
  const log = document.getElementById('stream');
  const btn = document.getElementById('scroll-bottom');
  if (!log || !btn) return;
  const show = !isAtBottom(log);
  btn.classList.toggle('show', show);
  // V3-1: `hidden` is what actually removes it from the density budget.
  btn.hidden = !show;
}

/**
 * Pin the list to its true bottom *after* layout. A single synchronous
 * `scrollTop = scrollHeight` can land short when the newly appended content
 * (markdown tables, fonts, a collapsed tool card) reflows one frame later, so we
 * pin again on the next frame — but only while the viewport is still anchored,
 * so a real user scroll-up between frames always wins (never fight the user).
 */
function followToBottom(log: HTMLElement): void {
  const pin = () => {
    log.scrollTop = log.scrollHeight;
  };
  if (typeof requestAnimationFrame !== 'function') {
    pin();
    syncScrollAnchor(log);
    return;
  }
  requestAnimationFrame(() => {
    pin();
    requestAnimationFrame(() => {
      if (isAtBottom(log)) pin();
      syncScrollAnchor(log);
    });
  });
}

function send<T>(message: PluginMessage): Promise<PluginResponse<T>> {
  return chrome.runtime.sendMessage(message) as Promise<PluginResponse<T>>;
}

function render(): void {
  const log = $('stream');
  // Regression fix: the follow decision comes from the live anchor maintained by
  // `scroll` events (post-layout), not from a `scrollTop`/`scrollHeight` read
  // taken before the append. The user's own send forces a follow one-shot.
  const follow = scrollFollow.shouldFollow();
  const prevTop = log.scrollTop;
  // V4-1（ADR-V4-005 第 6 条 / ADR-V4-017 第 7 条）——`#stream` 现在同时承载
  // **占位宿主**（`li[data-transitional-host]`：决策卡 / composer / L1 内容层 /
  // 提示带）与消息条目。v3 的 `log.textContent = ''` 整段清空会把宿主一并销毁
  // （首个 render 就会让 `#l0-decision` / `#l1-more` / `#composer` 消失），故这里只
  // 清扫**消息条目**（无 `data-transitional-host` 的子节点），并在决策卡宿主之后按
  // 序插入本轮条目 —— 宿主是 v4-3 / v4-4 的退役面，本叶只建不销。
  // （v4-2 会把它换成 keyed 增量渲染；此处是过渡形态，语义与 v3 清空等价。）
  for (const node of [...log.children]) {
    if (!(node as HTMLElement).hasAttribute('data-transitional-host')) node.remove();
  }
  const decisionHost = log.querySelector(':scope > li[data-host="decision"]');
  const fresh = document.createDocumentFragment();
  let wantFollow = false;
  if (isLogEmpty(state.entries.length) && !state.pending) {
    // F-5: never a large blank box — a readable placeholder instead.
    log.classList.add('empty');
    const placeholder = document.createElement('p');
    placeholder.className = 'log-empty-text';
    placeholder.textContent = LOG_EMPTY_TEXT;
    fresh.appendChild(placeholder);
  } else {
    log.classList.remove('empty');
    for (const entry of state.entries) {
      fresh.appendChild(renderEntry(entry));
    }
    if (state.pending) fresh.appendChild(renderThinking());
    wantFollow = follow;
  }
  if (decisionHost) decisionHost.after(fresh);
  else log.appendChild(fresh);
  if (wantFollow) {
    followToBottom(log);
  } else if (!isLogEmpty(state.entries.length) || state.pending) {
    // Not following: clearing the list reset scrollTop to 0, so restore the
    // user's reading position (they explicitly scrolled away — never yank them).
    log.scrollTop = prevTop;
  }
  syncScrollAnchor(log);
  updateScrollHint();

  $('status').textContent = state.activeOrigin
    ? `站点 ${state.activeOrigin} · 发现=${state.discoveryState ?? '未知'} · ${state.authorized ? '已授权' : '未授权'} · 信任=${state.trust === 'trusted' ? 'trusted' : 'untrusted'}`
    : '无活跃站点';
  const buttons = buttonStates({ activeOrigin: state.activeOrigin, authorized: state.authorized, pending: state.pending });
  ($('authorize') as HTMLButtonElement).disabled = buttons.authorizeDisabled;
  ($('revoke') as HTMLButtonElement).disabled = buttons.revokeDisabled;
  ($('send') as HTMLButtonElement).disabled = buttons.sendDisabled;

  renderSiteHint();
  renderSendReason();

  const notice = $('notice');
  notice.textContent = state.notice ?? '';
  // V3-1: `hidden`, not `display:none` — the caliber counts text/controls inside a
  // CSS-hidden subtree, so a `display` toggle would silently spend density budget.
  notice.hidden = !state.notice;

  const confirmBox = $('confirm');
  if (confirmActive()) {
    confirmBox.hidden = false;
    if (state.confirm) $('confirm-summary').textContent = state.confirm.summary;
  } else {
    confirmBox.hidden = true;
  }

  renderLlmStatus();
  renderOnboarding();
  renderDiscoveryNotice();
  renderSession();
  renderAutoAuth();
  // V3-4 / AC-CONV-1: the ONE production env injection point. It runs on every render
  // (state change, navigation report, capture) with the facts the product really has;
  // a missing fact stays missing so the judge blocks instead of passing.
  syncRefEnv();
  // V3-1 (ADR-V3-013): the ONE decision card + the three-things skeleton.
  const l0View = l0?.update(l0Input()) ?? null;
  // V3-2 (ADR-V3-021~023): the L1 layer. Repainted AFTER the L0 skeleton because
  // the stale-reference mark on the chip / pick entry is the judge's verdict and
  // must win over the L0 skeleton's optimistic defaults.
  l1?.update(l1Input(l0View));
  // R3: the read-only rescue probe for a `dom-gone` reference (once per reference).
  maybeRescue();
  // V3-3: the open view's header count comes from the SAME derivation as the entry
  // panel / status bar, so the three can never disagree (FR-V3-046).
  viewHost?.syncCounts();
  // FR-V3-012: a free-text ask has no choices, so its fallback input opens at once.
  if (state.ask?.kind === 'text') l0?.revealFallback();
  $('audit-count').textContent = `审计 ${state.auditCount} 条`;
}

/**
 * decision ② / FR-048: render the current session label and the switcher (list of
 * sessions + group controls). The list is built from the background `sessions`
 * reply, so it always reflects the authoritative origin→session mapping.
 */
function renderSession(): void {
  const label = document.getElementById('session-label');
  if (label) label.textContent = currentSessionLabel(sessions.find((s) => s.sessionId === sessionId) ?? null);

  const list = document.getElementById('session-list');
  if (list) {
    list.textContent = '';
    if (sessions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = '暂无会话：打开并授权一个站点后，同域名的标签页会自动共用同一会话。';
      list.appendChild(empty);
    } else {
      for (const s of sortSessions(sessions, sessionId)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `session-item${s.sessionId === sessionId ? ' current' : ''}`;
        btn.dataset.sessionId = s.sessionId;
        btn.textContent = `${s.sessionId === sessionId ? '● ' : ''}${s.label} · ${(s.origins ?? []).join('，')}`;
        list.appendChild(btn);
      }
    }
  }

  const sel = document.getElementById('group-select') as HTMLSelectElement | null;
  if (sel) {
    const prev = sel.value;
    sel.textContent = '';
    for (const g of groups) {
      const opt = document.createElement('option');
      opt.value = g.groupId;
      opt.textContent = `${g.name}（${g.origins.length} 个域名）`;
      sel.appendChild(opt);
    }
    if (groups.some((g) => g.groupId === prev)) sel.value = prev;
  }
  const addBtn = document.getElementById('group-add') as HTMLButtonElement | null;
  if (addBtn) addBtn.disabled = !state.activeOrigin || groups.length === 0;
  const createBtn = document.getElementById('group-create') as HTMLButtonElement | null;
  if (createBtn) createBtn.disabled = false;
}

/** F-2 / TASK-033: render the LLM configuration status + in-panel settings entry. */
function renderLlmStatus(): void {
  const el = $('llm-status');
  const btn = $('open-settings') as HTMLButtonElement;
  const view = llmStatusView(llmLoaded ? llmSummary : null);
  el.textContent = view.label;
  el.className = view.warn ? 'warn' : 'muted';
  btn.textContent = view.settingsLabel;
  btn.classList.toggle('primary', view.warn);
}

/**
 * TASK-020 任务 B: explain「无活跃站点」with a specific reason + next action, and
 * expose the「重新绑定当前标签页」escape hatch. The「已在目标站点但未 supported」
 * case is owned by `discovery-notice` (activeOrigin present → this block hides).
 */
function renderSiteHint(): void {
  const box = $('site-hint');
  const view = activeSiteNotice({ hasOrigin: Boolean(state.activeOrigin), tab: activeTab });
  box.hidden = !view.visible;
  if (!view.visible) return;
  $('site-hint-title').textContent = view.title;
  $('site-hint-detail').textContent = view.detail;
  $('site-hint-action').textContent = view.action;
}

/** TASK-020 任务 B: make the disable reason visible next to the composer. */
function renderSendReason(): void {
  const el = $('send-reason');
  const reason = sendDisabledReason({ activeOrigin: state.activeOrigin, pending: state.pending, tab: activeTab });
  el.textContent = reason;
  // V4-1 (FR-CHAT-082): the line is a single ellipsised row now — the full reason
  // must stay reachable, so it also rides the `title` tooltip (and textContent,
  // which is what the gates read).
  el.title = reason;
  el.hidden = !reason;
}

/** F-3: state-driven first-run guidance (only the next action is emphasized). */
function renderOnboarding(): void {
  const box = $('onboarding');
  box.textContent = '';
  const view = buildOnboarding({
    configured: llmLoaded && Boolean(llmSummary?.configured),
    hasOrigin: Boolean(state.activeOrigin),
    discovered: state.discoveryState !== undefined,
    authorized: state.authorized,
    hasConversation: state.entries.length > 0,
  });
  box.hidden = !view.visible;
  if (!view.visible) return;

  const title = document.createElement('div');
  title.className = 'onboarding-title';
  title.textContent = '首次使用（按序完成）';
  box.appendChild(title);

  const list = document.createElement('ol');
  for (const step of view.steps) {
    const li = document.createElement('li');
    li.className = `onboarding-step${step.current ? ' current' : ''}${step.done ? ' done' : ''}`;
    li.textContent = `${step.done ? '✓ ' : step.current ? '▶ ' : ''}${step.text}`;
    list.appendChild(li);
  }
  box.appendChild(list);
}

/**
 * TASK-032: explain the discovery state honestly. Probing is **fully automatic**
 * (panel open / tab switch / navigation / hello + bounded backoff retry), so this
 * renderer never exposes a manual「重新探测」entry — it only shows the readable
 * status / reason, including「正在自动探测…（第 N 次重试）」for temporary failures.
 */
function renderDiscoveryNotice(): void {
  const box = $('discovery-notice');
  const view = discoveryNotice(state.activeOrigin ? state.discoveryState : undefined, state.discoveryReason, state.probe);
  box.hidden = !view.visible;
  if (!view.visible) return;
  $('discovery-title').textContent = view.title;
  $('discovery-detail').textContent = view.detail;
}

/** F-2: fetch the non-sensitive LLM summary from the background (never the key). */
async function refreshLlmStatus(): Promise<void> {
  try {
    const res = await send<LlmStatusSummary>(makeMessage('llm-status'));
    llmSummary = res.ok && res.data ? res.data : null;
  } catch {
    llmSummary = null;
  }
  llmLoaded = true;
  render();
}

/* V3-1 (ADR-V3-014): the former `renderAsk()` moved into `l0/decision-card.ts`.
   The ask itself, its resolution path (`submitAsk`) and its reducer are unchanged;
   only the rendering location changed (the card is now L0, and everything past the
   first option plus the terminal 「其他…（我来描述）」 lives behind `#l0-more`). */

/**
 * V3-4 / **AC-CONV-2** — the ONE production entrance that turns a reference into an
 * action.
 *
 * Its first statement is `l1.dispatchRefAction`, whose own first statement is the
 * `isRefUsable` guard (v3-2's fail-closed judge). Nothing else in the product may
 * dispatch a reference-driven command: a second call site would be a bypass, and the
 * runtime gate (`test/ref-wiring.test.ts` + `test/ui/page-input.mjs`) asserts both
 * that this is the only `dispatchRefAction(` call site outside its definition and that
 * enumerating every visible control while a reference is unusable never advances the
 * command counter.
 */
function applyRefAction(refId: string, action: string): { allowed: boolean; reason: string; verdict: string; sent: boolean } {
  const outcome = l1?.dispatchRefAction(refId, action);
  if (!outcome) {
    return { allowed: false, reason: '引用层未就绪（按失效处理）', verdict: 'unknown', sent: false };
  }
  if (!outcome.allowed) {
    dispatch({ type: 'notice', text: `✖ ${outcome.reason}` });
    return outcome;
  }
  return outcome;
}

/**
 * V3-4 / **AC-CONV-1** — the production env injection point for the reference judge.
 *
 * Called from `render()` (and therefore after every state read / navigation report /
 * capture). It is the *only* production `setEnv` call site: the test seam's `l1('env')`
 * op remains for the node gates, which is exactly why the wiring gate asserts the call
 * sites are **not limited** to `installV3TestHooks()`.
 */
function syncRefEnv(): void {
  if (v3TestState.envOverride) return;
  l1?.setEnv(pickInput ? pickInput.judgeEnv() : {});
}

/**
 * R3（2026-09-17）— the read-only rescue probe trigger.
 *
 * Whenever the judge reports a `dom-gone` reference (selector resolution failed), the
 * panel asks the background for a **read-only** text-candidate observation and stores it
 * as the judge's `rescue` payload. The probe runs **once per reference** (no polling
 * loop), never writes the page, and a missing observation keeps the reference exactly as
 * fail-closed as before. Only a unique match on an unchanged path turns on the
 * one-click re-anchor; the user must still confirm it.
 */
let rescueProbedId: string | null = null;
/** References the user already re-anchored — never re-offer the button for them. */
const anchoredRefIds = new Set<string>();

function maybeRescue(): void {
  if (!pickInput || !l1) return;
  const target = l1.store().stale()[0];
  if (!target || target.dimension !== 'dom-gone') {
    rescueProbedId = null;
    return;
  }
  const facts = target.facts;
  if (anchoredRefIds.has(facts.refId) || rescueProbedId === facts.refId) return;
  if (!facts.origin || !facts.textDigest) return;
  rescueProbedId = facts.refId;
  void pickInput
    .rescue({ refId: facts.refId, selector: facts.selector, textDigest: facts.textDigest, origin: facts.origin })
    .then((observation) => {
      if (!observation) return;
      l1?.setRescue({ refId: facts.refId, ...observation });
      // Re-judge so the payload actually lands on the record (`update()` alone paints the
      // previous verdict) — the judge remains the single writer of `readableReason`.
      l1?.judge();
      render();
    });
}

/**
 * R3 — the user-confirmed one-click re-anchor. The panel only forwards the reference's
 * captured facts; the real work (fresh read-only probe + identity mark + new reference)
 * lives in `pick-input.ts` so it shares the **manual pick ingestion pipeline**. The old
 * reference is untouched: only a new record is appended.
 */
function reanchorRef(refId: string): void {
  const record = l1?.store().get(refId);
  if (!record) return;
  if (!state.authorized) {
    dispatch({ type: 'notice', text: '✖ 未授权站点：救援不生效（页面侧零注入）。' });
    return;
  }
  void pickInput
    ?.reanchor({
      refId,
      selector: record.facts.selector,
      textDigest: record.facts.textDigest,
      origin: record.facts.origin,
    })
    .then((ok) => {
      if (!ok) return;
      anchoredRefIds.add(refId);
      rescueProbedId = null;
      l1?.setRescue(undefined);
      l1?.judge();
      render();
    });
}

/**
 * V3-4 (FR-V3-061 / FR-V3-065 / FR-V3-071) — one captured reference becomes
 * 「1 个引用 chip + 1 道选择题」and nothing else. The page never supplies a verdict and
 * never mints an id: `injectRef` is v3-2's single id source, the observation travels
 * with it (N-04: the panel never asserts `resolved` on its own), and the id is written
 * back onto the page element as the identity mark D1 compares against.
 */
function acceptCapture(facts: Record<string, unknown>, resolution: { status: string; refMark?: string; nodeCount?: number }): void {
  v3TestState.envOverride = false; // a real capture ⇒ production facts own the env again
  // R1 (2026-09-17): a reference round REPLACES `state.ask`, so a pending *background*
  // question would never be answered by the panel — its bridge would only expire on the
  // 60 s timeout, leaving the turn「处理中」(composer: 上一条指令仍在处理中). Settle it as
  // canceled so the background turn can finish; the user is told, not silently dropped.
  const superseded = supersededAsk(state);
  if (superseded) {
    void send(makeMessage('ask-user-response', { ...superseded, canceled: true }));
    dispatch({ type: 'notice', text: '已放弃上一条提问（你先在页面上拾取了引用）。' });
  }
  const record = l1?.injectRef(facts as never);
  l1?.setResolution(resolution as RefResolution);
  const refId = record?.facts.refId ?? '';
  if (!refId) return;
  pendingRefId = refId;
  const paths = [
    facts.selector ? `选择器 ${String(facts.selector)}` : '',
    facts.semanticPath ? `语义路径 ${String(facts.semanticPath)}` : '',
  ].filter(Boolean);
  const ask = (verdict: string): void => {
    dispatch({
      type: 'ask',
      requestId: `${REF_ROUND_PREFIX}${refId}`,
      kind: 'choice',
      prompt: `已捕获引用 ${refId}${paths.length ? `（${paths.join(' · ')}）` : ''}：要用它做什么？（判定：${verdict}）`,
      options: ['纳入下一步（作为上下文）', '用这里作为操作目标', '先看引用证据（选择器 / 语义路径）'],
    });
  };
  // The identity mark + the ordinal badge: the page renders the id the panel minted, so
  // the chip, the badge, the evidence row and the risk row all carry one ordinal.
  //
  // R1 (2026-09-17): the mark is written by this round-trip, so the **capture-time**
  // observation structurally cannot carry it — D1 read「身份标记不匹配」and denied every
  // freshly picked reference. The mark write returns a fresh page observation; re-judging
  // with it is what makes the reference usable (and it stays fail-closed: no observation
  // ⇒ the older fact stands, which denies).
  void (async () => {
    const fresh = await pickInput?.highlight(refId, String(facts.selector ?? ''), 'mark');
    if (fresh) l1?.setResolution(fresh);
    const judged = l1?.judge() ?? [];
    render();
    ask(judged.find((r) => r.facts.refId === refId)?.verdict ?? 'unknown');
  })();
}

/** Send the user's answer back to the background and clear the prompt (R7). */
function submitAsk(value: string | undefined, canceled: boolean): void {
  // V3-4 / AC-CONV-2: a round minted from a reference is answered by *acting on the
  // reference*, so the answer goes through the ONE guarded entry instead of being sent
  // as free text. Rounds that came from the background are untouched (the `refId` is
  // `null` for them), which is why the existing ask gates keep their exact behaviour.
  const refId = pendingRefId;
  pendingRefId = null;
  const res = resolveAsk(state, value, canceled);
  if (res && !refId) void send(makeMessage('ask-user-response', { ...res }));
  dispatch({ type: 'ask-resolved' });
  if (refId && !canceled && typeof value === 'string' && value.trim()) {
    applyRefAction(refId, value.trim());
  }
}

function dispatch(action: Parameters<typeof reduce>[1]): void {
  state = reduce(state, action);
  render();
}

interface RiskStatusPayload {
  paused?: boolean;
  stopped?: boolean;
  reason?: string;
}

/**
 * FR-052 / ADR-017: render the bound origin's auto-authorization switches.
 *
 * The checkboxes and the always-visible marker reflect the authoritative
 * background store (carried on the `state` reply), so an immediate off is
 * reflected on the next state refresh. The hard-floor copy is always visible.
 */
function renderAutoAuth(): void {
  const box = document.getElementById('auto-auth');
  if (!box) return;
  const origin = state.activeOrigin;
  const s: AutoAuthSettings = autoAuthCheckboxState(state.autoAuth);
  const read = document.getElementById('auto-read') as HTMLInputElement | null;
  const write = document.getElementById('auto-write') as HTMLInputElement | null;
  if (read) {
    read.checked = s.read;
    read.disabled = !origin;
  }
  if (write) {
    write.checked = s.write;
    write.disabled = !origin;
  }
  const originEl = document.getElementById('auto-auth-origin');
  if (originEl) originEl.textContent = origin ?? '（无活跃站点）';
  const badge = document.getElementById('auto-auth-badge') as HTMLButtonElement | null;
  if (badge) {
    const text = autoAuthMarker(s);
    badge.textContent = text;
    badge.style.display = origin && text ? 'inline-block' : 'none';
    badge.disabled = !origin;
  }
  const note = document.getElementById('auto-auth-note');
  if (note) note.textContent = AUTO_AUTH_HARD_LINES.join('');
}

/** Ask the background to flip one auto-authorization tier for the bound origin. */
async function setAutoAuth(tier: 'read' | 'write', enabled: boolean): Promise<void> {
  const origin = state.activeOrigin;
  if (!origin) return;
  try {
    const res = await send<{ settings?: AutoAuthSettings }>(makeMessage('auto-auth', { action: 'set', origin, tier, enabled }));
    if (res.ok && res.data?.settings) {
      dispatch({ type: 'state', autoAuth: res.data.settings });
      const label = tier === 'read' ? '读操作自动' : '写操作自动';
      dispatch({ type: 'notice', text: `${enabled ? '已开启' : '已关闭'}「${label}」（${origin}）；${AUTO_AUTH_HARD_LINES.join('')}` });
    } else {
      dispatch({ type: 'notice', text: `✖ 保存自动授权失败：${res.error ?? '后台无响应'}` });
      await refreshState();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 保存自动授权失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** One-click off: restore both tiers to defaults (read on / write off). */
async function clearAutoAuth(): Promise<void> {
  const origin = state.activeOrigin;
  if (!origin) return;
  try {
    const res = await send<{ settings?: AutoAuthSettings }>(makeMessage('auto-auth', { action: 'clear', origin }));
    if (res.ok && res.data?.settings) {
      dispatch({ type: 'state', autoAuth: res.data.settings });
      dispatch({ type: 'notice', text: `已一键关闭 ${origin} 的自动授权（读/写都关）。` });
    } else {
      dispatch({ type: 'notice', text: `✖ 关闭自动授权失败：${res.error ?? '后台无响应'}` });
      await refreshState();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 关闭自动授权失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** Render the informed-consent block + risk controls (FR-031 / FR-029). */
function renderConsent(): void {
  const section = document.createElement('section');
  section.id = 'consent';

  // F-4: the long consent/boundary text is collapsed by default, but every
  // string is preserved verbatim (CONSENT_RISKS / CAPABILITY_BOUNDARY).
  const details = document.createElement('details');
  details.id = 'consent-details';
  details.open = CONSENT_DEFAULT_OPEN;
  const summary = document.createElement('summary');
  summary.textContent = CONSENT_SUMMARY_TEXT;
  details.appendChild(summary);

  const riskTitle = document.createElement('p');
  riskTitle.textContent = '风险提示';
  details.appendChild(riskTitle);
  const risks = document.createElement('ul');
  for (const r of CONSENT_RISKS) {
    const li = document.createElement('li');
    li.textContent = r;
    risks.appendChild(li);
  }
  details.appendChild(risks);

  const capTitle = document.createElement('p');
  capTitle.textContent = '能力边界';
  details.appendChild(capTitle);
  const caps = document.createElement('ul');
  for (const c of CAPABILITY_BOUNDARY) {
    const li = document.createElement('li');
    li.textContent = c;
    caps.appendChild(li);
  }
  details.appendChild(caps);
  section.appendChild(details);

  // F-4: the risk controls are actionable — keep them outside the disclosure.
  const controls = document.createElement('div');
  controls.className = 'row';
  const make = (id: string, label: string) => {
    const b = document.createElement('button');
    b.id = id;
    b.type = 'button';
    b.textContent = label;
    return b;
  };
  const pauseBtn = make('risk-pause', '暂停自动化');
  const resumeBtn = make('risk-resume', '恢复');
  const stopBtn = make('risk-stop', '中止');
  controls.append(pauseBtn, resumeBtn, stopBtn);
  section.appendChild(controls);

  const status = document.createElement('div');
  status.id = 'risk-status';
  status.className = 'muted';
  section.appendChild(status);

  // FR-052 / ADR-017: per-origin auto-authorization (read/write). The hard-floor
  // copy is always visible; the marker stays visible while anything is enabled.
  const aa = document.createElement('div');
  aa.id = 'auto-auth';
  aa.className = 'auto-auth';

  const aaTitle = document.createElement('div');
  aaTitle.className = 'aa-title';
  aaTitle.append('自动授权（作用于当前站点 ', Object.assign(document.createElement('span'), { id: 'auto-auth-origin', textContent: '（无活跃站点）' }), '）');
  aa.appendChild(aaTitle);

  const mkCheck = (id: string, label: string, onChange: (enabled: boolean) => void) => {
    const wrap = document.createElement('label');
    wrap.className = 'aa-check';
    wrap.htmlFor = id;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.disabled = true;
    input.addEventListener('change', () => onChange(input.checked));
    wrap.append(input, ` ${label}`);
    return wrap;
  };
  aa.appendChild(mkCheck('auto-read', '读操作自动（默认开）', (v) => void setAutoAuth('read', v)));
  aa.appendChild(mkCheck('auto-write', '写操作自动（默认关）', (v) => void setAutoAuth('write', v)));

  const badge = document.createElement('button');
  badge.id = 'auto-auth-badge';
  badge.type = 'button';
  badge.className = 'aa-badge';
  badge.style.display = 'none';
  badge.title = '点击关闭该站点的自动授权（读/写都关）';
  badge.addEventListener('click', () => void clearAutoAuth());
  aa.appendChild(badge);

  const aaNote = document.createElement('div');
  aaNote.id = 'auto-auth-note';
  aaNote.className = 'aa-note';
  aaNote.textContent = AUTO_AUTH_HARD_LINES.join('');
  aa.appendChild(aaNote);
  section.appendChild(aa);

  // TASK-023: the consent disclosure lives in the bottom zone *above* the
  // composer (the composer must be the last element so nothing pushes it off the
  // bottom of the panel). `#consent-slot` is reserved for exactly this.
  // V3-1: the consent/auto-auth block is "谁在管我" — it belongs to the L1 status
  // panel, not to the bottom zone. Keeping it resident would spend density budget
  // on the default screen (it renders two checkboxes + a marker button).
  const slot = document.getElementById('l1-status-extra') ?? document.getElementById('consent-slot');
  (slot ?? document.body).appendChild(section);

  const refresh = (d?: RiskStatusPayload) => {
    status.textContent = `风控状态：${d?.stopped ? '已中止' : d?.paused ? '已暂停' : '运行中'}${d?.reason ? `（${d.reason}）` : ''}`;
  };
  const control = (action: string, reason?: string) =>
    void send<RiskStatusPayload>(makeMessage('risk-control', { action, ...(reason ? { reason } : {}) })).then((res) => refresh(res.data));
  pauseBtn.addEventListener('click', () => control('pause', '用户在侧栏暂停'));
  resumeBtn.addEventListener('click', () => control('resume'));
  stopBtn.addEventListener('click', () => control('stop', '用户在侧栏中止'));
  void send<RiskStatusPayload>(makeMessage('risk-control', { action: 'status' })).then((res) => refresh(res.data));
}

async function refreshState(): Promise<void> {
  const res = await send<StateMessageView>(makeMessage('state'));
  if (!res.ok || !res.data) return;
  // TASK-020 任务 B: keep the last active-tab projection for the site hint.
  activeTab = res.data.tab ?? null;
  // decision ② / FR-048: when the background moved us to a different session
  // (tab switch / auto-bind), reload that session's history so the panel never
  // shows the previous session's conversation (no串台).
  const incoming = res.data.session?.sessionId ?? null;
  const changed = incoming !== null && incoming !== sessionId;
  if (incoming) sessionId = incoming;
  // W1: sync the persisted authorization too — otherwise a reload/reopen shows
  // a false "未授权" and the authorize button becomes clickable again.
  dispatch(stateActionFromPayload(res.data));
  // V3-3 (FR-V3-046): the snapshot counts are the tree/command truth the L2 entry
  // panel must show. They arrive with the state reply (additive `insight`), so no
  // extra pull is needed; the derived value is refreshed before the repaint below.
  const insightCounts = res.data.insight?.counts ?? null;
  if (insightCounts) {
    l2Truth.insightCounts = insightCounts;
    refreshL2Counts();
  }
  // V3-4 (AC-CONV-1): the adopted declaration's digest/version. Without it the judge
  // reports「无法确认声明是否变化」for every reference — fail-closed but useless, so the
  // production env must carry it.
  // R1: the **state** is part of the fact (a non-declaring site must still be usable).
  const decl = res.data.declaration;
  pickFacts.declaration = decl
    ? {
        status:
          decl.declarationStatus === 'valid'
            ? 'valid'
            : decl.declarationStatus === 'absent'
              ? 'absent'
              : 'invalid',
        hash: typeof decl.declarationHash === 'string' ? decl.declarationHash : '',
        ...(decl.declarationVersion ? { version: decl.declarationVersion } : {}),
      }
    : null;
  // V3-4 trigger ①: the panel is present on an authorized origin ⇒ ensure the layer
  // exists (idempotent; a failure is reported readably through `onUnavailable`).
  void pickInput?.ensureInjected();
  // TASK-033: keep the settings view's origin-scoped auto-authorization in sync
  // (the chat view's own controls are rendered from the same state).
  settingsHandle?.setActiveOrigin(state.activeOrigin);
  await refreshSessions(changed);
  // D-064: surface the background's one-shot readable notice last (an icon-click
  // binding result / "switched tab" prompt must win over the generic navigation
  // notice the state reducer may have set).
  const notice = typeof res.data.panelNotice === 'string' ? res.data.panelNotice.trim() : '';
  if (notice) dispatch({ type: 'notice', text: notice });
}

/**
 * decision ② / FR-048: fetch the session switcher data. `applyHistory` replaces
 * the conversation when the active session changed (or on explicit switch).
 */
async function refreshSessions(applyHistory: boolean): Promise<void> {
  try {
    const res = await send<SessionsMessageView>(makeMessage('sessions'));
    if (!res.ok || !res.data) return;
    sessions = res.data.sessions ?? [];
    groups = res.data.groups ?? [];
    const incoming = res.data.currentSessionId ?? null;
    const changed = incoming !== null && incoming !== sessionId;
    if (incoming) sessionId = incoming;
    if (applyHistory || changed) {
      dispatch({ type: 'history', entries: historyEntries(res.data.history) });
    } else {
      render();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 读取会话列表失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** decision ② / FR-048: switch to a session chosen in the switcher. */
async function switchToSession(target: string): Promise<void> {
  if (!target || target === sessionId) return;
  try {
    const res = await send<{ sessionId?: string; history?: Array<{ role: string; text: string }> }>(
      makeMessage('session-switch', { sessionId: target }),
    );
    if (!res.ok || !res.data) {
      dispatch({ type: 'notice', text: `✖ 切换会话失败：${res.error ?? '后台无响应'}` });
      return;
    }
    sessionId = res.data.sessionId ?? target;
    dispatch({ type: 'history', entries: historyEntries(res.data.history) });
    dispatch({ type: 'notice', text: `已切换到会话：${sessions.find((s) => s.sessionId === sessionId)?.label ?? sessionId}` });
    await refreshSessions(false);
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 切换会话失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/** decision ② / FR-048: group management from the panel (create / merge current origin). */
async function groupAction(payload: Record<string, unknown>): Promise<void> {
  try {
    const res = await send<{ groups?: SessionGroupView[] }>(makeMessage('session-group', payload));
    if (!res.ok) {
      dispatch({ type: 'notice', text: `✖ 分组操作失败：${res.error ?? '后台无响应'}` });
      return;
    }
    await refreshState();
    dispatch({ type: 'notice', text: '✓ 分组配置已更新（分组只共享对话，不代表互相授权）。' });
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 分组操作失败：${err instanceof Error ? err.message : String(err)}` });
  }
}

/**
 * TASK-020 任务 D / TASK-028: run the connectivity test from the panel using the
 * stored config (reuses the `llm-test` message; the plaintext key never leaves
 * the background). The standalone「测试连接」button was removed — the panel now
 * auto-tests once on load (see {@link autoTestConnectionOnce}) and renders the
 * readable result into `#llm-test-result`.
 */
async function runPanelTest(options: { auto?: boolean } = {}): Promise<void> {
  const out = $('llm-test-result');
  out.className = 'muted';
  out.textContent = options.auto ? '正在自动测试当前模型配置…' : '正在发送最小 ping 请求…';
  try {
    const res = await send<TestConnectionResult>(
      makeMessage('llm-test', llmSummary?.providerId ? { providerId: llmSummary.providerId } : {}),
    );
    if (!res.ok || !res.data) {
      out.className = 'warn';
      out.textContent = `✖ 测试连接失败：${res.error ?? '后台无响应'}`;
      return;
    }
    out.className = res.data.ok ? 'ok' : 'warn';
    out.textContent = res.data.message;
  } catch (err) {
    out.className = 'warn';
    out.textContent = `✖ 测试连接失败：${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * TASK-028: auto-test exactly ONCE per panel load. Deliberately NOT called from
 * `render()` / message handlers / status polling — only the bootstrap calls it,
 * and the module-level guard makes a duplicate bootstrap a no-op. The
 * background's 60s TTL cache is the second line of defence (repeat loads within
 * the TTL reuse the cached result without a real request).
 */
let autoTestStarted = false;
function autoTestConnectionOnce(): void {
  if (autoTestStarted) return;
  autoTestStarted = true;
  void runPanelTest({ auto: true });
}

/** TASK-020 任务 B: rebind the current tab from the panel (readable failure). */
async function rebindCurrentTab(): Promise<void> {
  const btn = $('rebind') as HTMLButtonElement;
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    const res = await send<{ origin?: string }>(makeMessage('rebind'));
    if (res.ok && res.data?.origin) {
      dispatch({ type: 'notice', text: `✓ 已重新绑定当前标签页：${res.data.origin}` });
      await refreshState();
      void refreshLlmStatus();
    } else {
      dispatch({ type: 'notice', text: `✖ 重新绑定失败：${res.error ?? '后台无响应'}` });
      await refreshState();
    }
  } catch (err) {
    dispatch({ type: 'notice', text: `✖ 重新绑定失败：${err instanceof Error ? err.message : String(err)}` });
  } finally {
    // `refreshState` triggers render() which resets the button disabled state.
    btn.disabled = false;
  }
}

// ══ V3-3 (ADR-V3-025~029): the L2 on-demand views ═══════════════════════════
//
// The four views are REUSED assets, never rewrites: `#tree-drawer` (v2 tree),
// `archive-catalog` (command catalogue), the v1 audit channel and the v1 settings
// panel. What this leaf adds is the *view replacement* (`l2/view-host.ts`), the
// *count derivation* (`l2/counts.ts`) and the two read-only projections.

/** Pull the full snapshot for the catalogue view (lazy: only when it is opened). */
async function pullInsightSnapshot(): Promise<ConnectTreeSnapshot | null> {
  try {
    const res = await send<ConnectTreeSnapshot>(makeMessage('insight-tree'));
    if (!res.ok || !res.data) return null;
    l2Snapshot = res.data;
    // Fallback truth for the counts when the state reply did not carry `insight`.
    // Same projection, never a literal (FR-V3-046).
    if (!l2Truth.insightCounts && l2Snapshot.meta?.counts) {
      l2Truth.insightCounts = l2Snapshot.meta.counts;
      refreshL2Counts();
      render();
    }
    return l2Snapshot;
  } catch {
    return null;
  }
}

/** Render the command catalogue (read-only projection; zero form controls). */
async function refreshCatalogView(force = false): Promise<void> {
  const host = document.getElementById('l2-catalog-host');
  if (!host) return;
  // Always fresh when the view is opened by the user: the catalogue is a read-only
  // projection of the CURRENT truth (a stored override / a new authorisation must
  // show up immediately).
  const snapshot = force || !l2Snapshot ? await pullInsightSnapshot() : l2Snapshot;
  if (!snapshot) {
    host.textContent = '命令目录不可用：未能取得连接树快照（不显示陈旧状态）。';
    return;
  }
  renderCommandCatalog(document, host, buildCatalogView(buildArchiveModel(snapshot)));
}

/** Render the audit view from the **existing** audit read channel. */
function renderAuditView(): void {
  const host = document.getElementById('l2-audit-host');
  if (!host) return;
  renderAudit(document, host, buildAuditRows(l2AuditEvents));
}

/** Re-read the audit channel (also refreshes the entry's count — same truth). */
async function refreshAuditView(): Promise<number | null> {
  try {
    const res = await send<unknown[]>(makeMessage('audit-export'));
    const events = Array.isArray(res.data) ? res.data : [];
    l2AuditEvents = events;
    l2Truth.auditEntries = events.length;
    refreshL2Counts();
    // The v1 audit counter is derived from the same reply (still one channel).
    dispatch({ type: 'audit-count', count: events.length });
    renderAuditView();
    return events.length;
  } catch {
    return null;
  }
}

/**
 * Open an L2 view (the product path, reached in ≤2 interactions:
 * `#l0-statusbar` → one `#l2-entry-*`).
 *
 * `openTreeBody` is the ONLY difference between the product path and the test
 * hook: the product path opens the tree body immediately (so the view is complete
 * in ≤2 interactions, FR-V3-048), while `window.__v3.testing.openTreeView()`
 * deliberately stops at the view so the existing gates can drive the v2 FAB
 * control themselves.
 */
function openL2View(which: L2ViewKey, opts: { openTreeBody?: boolean } = {}): void {
  // FR-V3-047 round-trip determinism: the entry menu is always FOLDED before the view
  // opens, so the expansion snapshot the view host takes on entry is "everything the
  // user had open, minus the menu itself" — restoring it cannot re-open the menu.
  
  if (which === 'settings') {
    // One L2 view at a time (FR-V3-045/047): the settings view is a *replacement*
    // too, so the host view must be folded first — otherwise a previously opened
    // catalogue/audit view would stay "open" behind the settings switch.
    viewHost?.close();
    void openSettingsView();
    return;
  }
  const opened = viewHost?.open(which);
  if (!opened) return;
  if (which === 'tree') {
    // ADR-V3-028: the FAB keeps its id/semantics; it is revealed with the view
    // (never resident in the default tier — the 7-clickable budget is untouched).
    $('tree-fab').hidden = false;
    if (opts.openTreeBody !== false) void treeDrawer?.open();
  }
  if (which === 'commands') void refreshCatalogView(true);
  if (which === 'audit') void refreshAuditView();
}

function wire(): void {
  // V3-1 (ADR-V3-016): one disclosure controller owns every collapse; the risk
  // rail is deliberately NOT in its whitelist.
  const disclosure = installDisclosure();
  // V4-1 (TASK-504 / NFR-CHAT-008): the three-state theme controller. `load()` is
  // fire-and-forget: a storage failure degrades to「跟随系统」without blocking the
  // panel (EC-CHAT-014).
  themeToggle = mountTheme(document);
  void themeToggle.load();
  $('l2-back').addEventListener('click', () => viewHost?.close());
  l0 = mountL0({
    doc: document,
    disclosure,
    onAnswer: (label) => submitAsk(label, false),
    onOpenSettings: () => void openSettingsView(),
    onOpenL2: (which) => openL2View(which),
    getCounts: currentL2Counts,
  });
  l1 = mountL1({
    doc: document,
    disclosure,
    openL2: (which) => l0?.openL2(which),
    revealFallback: () => l0?.revealFallback(),
    // R3: the one-click re-anchor seam (the real work is in pick-input.ts).
    reanchor: (refId) => reanchorRef(refId),
    // A REAL re-pull of `insight-tree`: the receipt's tool-surface evidence must
    // describe this pull, never a remembered value (ADR-V2-009 semantics).
    refreshSnapshot: async () => {
      const res = await send<{ tools?: string[] }>(makeMessage('insight-tree'));
      return res.ok ? (res.data ?? null) : null;
    },
    now: () => Date.now(),
  });
  installV3TestHooks();
  pickInput = mountPickInput({
    doc: document,
    send: (message) => send(message as PluginMessage) as Promise<{ ok: boolean; error?: string; data?: unknown }>,
    envInput: () => ({
      activeOrigin: state.activeOrigin ?? '',
      authorized: state.authorized,
      declaration: pickFacts.declaration,
    }),
    onCapture: (facts, resolution) => acceptCapture(facts as unknown as Record<string, unknown>, resolution),
    onPageHover: (refId) => {
      // FR-V3-066: hovering the page badge lights the side-panel chip (the same ordinal).
      // The attribute IS the channel (one writer, no shadow state to drift).
      document.getElementById('l0-ref-toggle')?.setAttribute('data-ref-hover', refId);
      render();
    },
    onUnavailable: (reason) => {
      if (pickFacts.pageUnavailable === reason) return;
      pickFacts.pageUnavailable = reason;
      render();
    },
    notify: (text) => dispatch({ type: 'notice', text }),
  });

  // V3-4 (FR-V3-060 / ADR-V3-030): the TWO injection triggers.
  // ① the「从页面拾取」entry (the pick layer IS the input — no resident composer).
  $('l0-pick').addEventListener('click', () => void pickInput?.startPick());
  // ② the panel is present on an authorized origin ⇒ the layer exists, so the
  //    right-click menu is available without the user entering pick mode first.
  // FR-V3-066: hovering the side-panel chip flashes the page-side target.
  $('l0-ref-toggle').addEventListener('pointerenter', () => {
    const last = l1?.store().all().slice(-1)[0];
    if (last) void pickInput?.highlight(last.facts.refId, last.facts.selector, 'flash');
  });
  // The layer lives only while the panel does (ADR-V3-030 §4). The port disconnect in
  // the background covers the hard close; this covers a panel unload/reload.
  window.addEventListener('pagehide', () => pickInput?.teardown());

  // TASK-033: the settings entry opens an in-panel view in the SAME document.
  // It never opens the options page and never opens a new tab.
  $('open-settings').addEventListener('click', () => {
    void openSettingsView();
  });
  $('settings-back').addEventListener('click', () => {
    settingsViewSwitch.showChat();
  });

  // TASK-020 任务 B: explicit rebind escape hatch for「无活跃站点」.
  $('rebind').addEventListener('click', () => void rebindCurrentTab());

  // decision ② / FR-048: session switcher (click a session to switch) + groups.
  $('session-list').addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-session-id]') as HTMLButtonElement | null;
    const target = btn?.dataset.sessionId;
    if (target) void switchToSession(target);
  });
  $('group-create').addEventListener('click', () => {
    const input = $('group-name') as HTMLInputElement;
    const name = input.value.trim();
    if (!name) {
      dispatch({ type: 'notice', text: '✖ 请先填写分组名称。' });
      return;
    }
    input.value = '';
    void groupAction({ action: 'create', name });
  });
  $('group-add').addEventListener('click', () => {
    const origin = state.activeOrigin;
    if (!origin) {
      dispatch({ type: 'notice', text: '✖ 当前没有活跃站点，无法并入分组。' });
      return;
    }
    const groupId = ($('group-select') as HTMLSelectElement).value;
    if (!groupId) {
      dispatch({ type: 'notice', text: '✖ 请先新建并选择一个分组。' });
      return;
    }
    void groupAction({ action: 'add', groupId, origin });
  });

  $('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input') as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    if (buttonStates({ activeOrigin: state.activeOrigin, authorized: state.authorized, pending: state.pending }).sendDisabled) return;
    input.value = '';
    // Explicit user intent: the next render must pin to the newest message even
    // if the user had scrolled up before sending.
    scrollFollow.userSent();
    dispatch({ type: 'user', text });
    // V3-4 P5 (FR-V3-060 / design baseline P5):「回合进行中」与页面侧的执行可视化是同一
    // 个信号 —— 回合开始时把最后一个引用目标闪动一下并标记 chip 状态，`chat-result done`
    // 到达后翻转为「已处理」。
    const active = l1?.store().all().slice(-1)[0];
    const chip = document.getElementById('l0-ref-toggle');
    if (active) {
      void pickInput?.highlight(active.facts.refId, active.facts.selector, 'flash');
      chip?.setAttribute('data-turn', 'running');
    }
    void send(makeMessage('chat', { user: text }));
  });

  // TASK-023: keep the「回到底部」affordance + follow anchor in sync with the
  // user's real scroll position (post-layout metrics, not stale pre-append reads).
  $('stream').addEventListener(
    'scroll',
    () => {
      syncScrollAnchor();
      updateScrollHint();
    },
    { passive: true },
  );
  $('scroll-bottom').addEventListener('click', () => {
    const log = $('stream');
    log.scrollTop = log.scrollHeight;
    scrollFollow.returnedToBottom();
    updateScrollHint();
  });

  $('authorize').addEventListener('click', () => {
    const origin = state.activeOrigin;
    if (!origin) return;
    void (async () => {
      // Request the optional host permission inside the user gesture (IMP-4 /
      // FR-006); best-effort — OriginStore authorization is the authoritative gate.
      // D-064: keep the readable reason and state the activeTab fallback explicitly.
      const req = await requestOriginPermissionDetailed(origin);
      await send(makeMessage('authorize', { origin, hostPermissionGranted: req.granted }));
      dispatch({ type: 'state', authorized: true });
      const permissionText = req.granted
        ? `已获得站点访问权限（${req.pattern}）`
        : `未获得持久站点权限（${req.reason ?? '未知原因'}），回退到 activeTab 临时授权——仅在点击插件图标的手势内有效`;
      dispatch({
        type: 'notice',
        text: `已授权 ${origin}；${permissionText}。${consentSummary()}`,
      });
    })();
  });

  $('revoke').addEventListener('click', () => {
    const origin = state.activeOrigin;
    if (!origin) return;
    void send<{ revoked: boolean; hostPermissionRemoved: boolean }>(makeMessage('revoke', { origin })).then((res) => {
      dispatch({ type: 'state', authorized: false });
      dispatch({
        type: 'notice',
        text: `已撤销 ${origin} 的授权${res.data?.hostPermissionRemoved ? '（站点访问权限已移除）' : ''}；相关能力已禁用，可随时重新授权。`,
      });
    });
  });

  $('confirm-allow').addEventListener('click', () => {
    const res = resolveConfirm(state, true);
    if (res) void send(makeMessage('confirm-response', { requestId: res.requestId, allow: true }));
    dispatch({ type: 'confirm-resolved', allow: true });
  });
  $('confirm-deny').addEventListener('click', () => {
    const res = resolveConfirm(state, false);
    if (res) void send(makeMessage('confirm-response', { requestId: res.requestId, allow: false }));
    dispatch({ type: 'confirm-resolved', allow: false });
  });

  $('audit').addEventListener('click', () => {
    void send<unknown[]>(makeMessage('audit-export')).then((res) => {
      const events = Array.isArray(res.data) ? res.data : [];
      dispatch({ type: 'audit-count', count: events.length });
      dispatch({ type: 'notice', text: `审计记录已导出（${events.length} 条，零明文）` });
    });
  });

  $('ask-submit').addEventListener('click', () => {
    submitAsk(($('ask-input') as HTMLInputElement).value, false);
    // FR-V3-012: submitting puts the fallback input straight back to `hidden`.
    l0?.hideFallback();
  });
  $('ask-cancel').addEventListener('click', () => {
    submitAsk(undefined, true);
    l0?.hideFallback();
  });
  $('ask-input').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      e.preventDefault();
      submitAsk(($('ask-input') as HTMLInputElement).value, false);
    }
  });

  chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const msg = raw as PluginMessage;
    // V3-4 (ADR-V3-030): the page-side layer's facts. `accept` returns `false` for every
    // other kind, so the v1 routing below is byte-for-byte unchanged.
    if (pickInput?.accept(raw)) return undefined;
    if (msg.kind === 'clipboard-op') {
      // FR-055 (TASK-039): the service worker has no `navigator.clipboard`, so it
      // forwards the clipboard op to an extension page. Shared with options.ts.
      return handleClipboardOpMessage(raw, sendResponse);
    }
    if (msg.kind === 'chat-result') {
      const text = typeof msg.text === 'string' ? msg.text : '';
      const variant = typeof msg.variant === 'string' ? msg.variant : 'assistant';
      if (variant === 'error') dispatch({ type: 'error', text });
      else if (variant === 'tool') {
        // TASK-023: carry the tool-card metadata when the background observed it.
        dispatch({
          type: 'tool',
          text,
          ...(typeof msg.tool === 'string' ? { tool: msg.tool } : {}),
          ...(typeof msg.ok === 'boolean' ? { ok: msg.ok } : {}),
          ...(typeof msg.ms === 'number' ? { ms: msg.ms } : {}),
        });
      } else if (variant === 'command') dispatch({ type: 'command', text });
      else if (variant === 'done') {
        dispatch({ type: 'pending', value: false });
        // P5: the page-side flash has finished being the「进行中」signal.
        document.getElementById('l0-ref-toggle')?.setAttribute('data-turn', 'done');
      }
      else if (text) dispatch({ type: 'assistant', text });
      return undefined;
    }
    if (msg.kind === 'confirm-request') {
      const question = msg.question as { tool?: string; reason?: string; risk?: string } | undefined;
      dispatch({
        type: 'confirm',
        requestId: String(msg.requestId ?? ''),
        summary: `${question?.tool ?? '工具'}：${question?.reason ?? '敏感操作'}`,
        ...(question?.risk ? { risk: question.risk } : {}),
      });
      return undefined;
    }
    if (msg.kind === 'ask-user-request') {
      // FR-017 / R7: task-internal clarification question → Q&A UI.
      const question = msg.question as { kind?: string; prompt?: string; options?: string[]; default?: string } | undefined;
      const kind = question?.kind === 'choice' || question?.kind === 'confirm' ? question.kind : 'text';
      dispatch({
        type: 'ask',
        requestId: String(msg.requestId ?? ''),
        kind,
        prompt: question?.prompt ?? '（无问题文本）',
        ...(Array.isArray(question?.options) ? { options: question.options } : {}),
        ...(question?.default ? { default: question.default } : {}),
      });
      return undefined;
    }
    if (msg.kind === 'probe-changed') {
      // TASK-032: the background's automatic probe advanced (probing / retry N /
      // ready) → re-read state and re-render. This replaces the removed manual
      //「重新探测」button; it never triggers a probe itself.
      void refreshState();
      return undefined;
    }
    if (msg.kind === 'session-changed') {
      // decision ② / FR-048: the background moved to another session (tab switch /
      // auto-bind) → re-read state + replace the conversation with that session's.
      sessionId = null;
      void refreshState();
      return undefined;
    }
    if (msg.kind === 'capability-changed') {
      // TASK-040: an optional-capability grant/revoke happened (a gesture request
      // settling, or an external change in chrome://extensions). Re-measure the
      // capability rows in place — the side panel is never reopened.
      void settingsHandle?.refreshCapabilities();
      return undefined;
    }
    return undefined;
  });

  // ── V2-2 (ADR-V2-004/005): mount the floating connection tree ─────────────
  // Additive: the v1 listener above is byte-identical. The drawer builds its DOM
  // and pulls `insight-tree` only on the first FAB open (lazy; closed = no cost).
  // A *second* listener carries the re-projection fan-out so the v1 handler is
  // never edited; `refresh()` is a no-op until the drawer has been opened.
  treeDrawer = mountTreeDrawer({
    root: $('tree-drawer'),
    fab: $('tree-fab'),
    doc: document,
    ops: {
      pull: async () => {
        const res = await send<ConnectTreeSnapshot>(makeMessage('insight-tree'));
        if (!res.ok) throw new Error(res.error ?? 'insight-tree 拉取失败');
        return res.data ?? null;
      },
    },
    // V2-3: the closed 7-action whitelist runner — existing ops/messages only.
    actions: createTreeOps({
      ops: buildSettingsOps(),
      transport: transportFromRuntime(chrome.runtime as unknown as { sendMessage(message: unknown): Promise<unknown> }),
      env: detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined),
      refreshSnapshot: async () => {
        const res = await send<ConnectTreeSnapshot>(makeMessage('insight-tree'));
        return res.ok ? (res.data ?? null) : null;
      },
    }),
    onAuditExport: () => {
      const audit = document.getElementById('audit') as HTMLButtonElement | null;
      if (audit) audit.click();
    },
    onNotice: (text) => {
      const node = document.getElementById('notice');
      if (node) node.textContent = text;
    },
  });
  // V3-3 (ADR-V3-025): the view host is mounted AFTER the tree drawer on purpose —
  // both listen for `Escape` on `document`, and the INNER component must win: the
  // drawer's handler calls `preventDefault()` when it closes itself, which is what
  // tells the host to stay open (see `l2/view-host.ts`).
  viewHost = mountViewHost({
    doc: document,
    disclosure,
    getCounts: currentL2Counts,
    onClosed: () => {
      // Leaving the view also folds the tree body: the next entry starts from a
      // clean, count-truthful state (the view opens, then the body follows).
      treeDrawer?.close();
      render();
    },
  });
  chrome.runtime.onMessage.addListener((raw) => {
    const msg = raw as PluginMessage;
    if (
      msg.kind === 'insight-changed' ||
      msg.kind === 'capability-changed' ||
      msg.kind === 'session-changed' ||
      msg.kind === 'probe-changed'
    ) {
      void treeDrawer?.refresh();
    }
    return undefined;
  });
  // Panel regained focus / became visible → re-project if the tree was opened.
  window.addEventListener('focus', () => void treeDrawer?.refresh());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void treeDrawer?.refresh();
  });
}

/** TASK-019 任务 A: blocking banner + disabled actions when not in an extension. */
function applyEnvGuard(env: EnvGuardResult): void {
  const banner = $('env-guard');
  banner.textContent = env.banner;
  banner.hidden = env.inExtension;
  if (env.inExtension) return;
  for (const id of ['authorize', 'revoke', 'send', 'audit', 'open-settings', 'rebind']) {
    const el = document.getElementById(id) as HTMLButtonElement | null;
    if (el) el.disabled = true;
  }
  // V2-2 (ADR-V2-005): the floating tree entry obeys the same environment guard
  // as the other actions (non-extension context → disabled).
  for (const id of ['tree-fab']) {
    const el = document.getElementById(id) as HTMLButtonElement | null;
    if (el) el.disabled = true;
  }
  ($('input') as HTMLInputElement).disabled = true;
}

// Only bootstrap in a real extension page; guarded so the module (and its
// consent/boundary text) stays importable in node tests. On a non-extension page
// (e.g. `file://.../sidepanel.html`) we still render the blocking banner instead
// of silently failing on the first `chrome.runtime` access.
if (typeof document !== 'undefined') {
  const env = detectExtensionEnv(typeof chrome !== 'undefined' ? (chrome as unknown as ChromeEnvLike) : undefined);
  applyEnvGuard(env);
  if (env.inExtension) {
    // TASK-032: keep a port open so the background knows a panel is attached and
    // only retries the automatic probe while it is (bounded; no background poll).
    // The port auto-disconnects on panel close → retries stop.
    panelPort = chrome.runtime.connect({ name: 'web-cli-panel' });
    wire();
    renderConsent();
    render();
    // V3-3 (FR-V3-046): the audit count must be the real ring-buffer length from the
    // first paint, not a placeholder `0` — one read of the existing channel.
    void refreshAuditView();
    void refreshState();
    void refreshLlmStatus();
    // TASK-028: auto-test the current model config once per panel load and render
    // the readable status (no standalone「测试连接」button anymore).
    autoTestConnectionOnce();
    // F-2: refresh the summary when the panel regains focus (e.g. after the
    // user saved settings on the options page). NB: this is a status refresh
    // only — it must NOT re-trigger the connectivity test (TASK-028).
    window.addEventListener('focus', () => void refreshLlmStatus());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refreshLlmStatus();
      // R2 (2026-09-17): deliberately **no** panel-visibility probe signal here.
      // The first version posted `{kind:'panel-visible'}` on the panel port; the
      // binding gate caught the consequence (real-product regression, not a test
      // relaxation): a panel-driven background refresh re-read `state`, and the
      // SW's `state` reply consumes the **one-shot** `panelNotice` — so becoming
      // visible could swallow the「已切换标签页…」notice before the user ever saw it.
      // Recovery on visibility change stays intact through the existing `kick`
      // signals: tab activation / navigation (`followActiveTab → kickDiscovery`) and
      // panel (re)open (`onConnect → kickBoundProbe`), both of which reset the
      // declaration backoff. See build.md §15.
    });
  }
}
