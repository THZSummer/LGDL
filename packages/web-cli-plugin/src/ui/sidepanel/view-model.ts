/**
 * Side-panel view-model (F-1~F-6) — pure, DOM-free and node-testable.
 *
 * The concrete DOM wiring lives in `sidepanel.ts`; every decision that matters
 * for the UI state (LLM status label, onboarding step, button enabled/disabled
 * semantics, empty-log state) is computed here so it can be unit-tested without
 * a browser or a new dependency.
 */
import type { LlmStatusSummary } from '../../llm/status.js';
import type { ActiveTabView } from '../../background/state-message.js';
import { AUTO_AUTH_DEFAULTS, autoAuthBadge, type AutoAuthSettings } from '../../security/auto-authorize.js';
import type { SidepanelState } from './chat-state.js';

// ── F-2: LLM configuration status ─────────────────────────────────────────

export interface LlmStatusView {
  configured: boolean;
  /** Display label, e.g. `LLM：未配置` / `LLM：DeepSeek · deepseek-chat · Key ✅`. */
  label: string;
  /** True when unconfigured → settings CTA is emphasized. */
  warn: boolean;
  /** Label for the top settings entry button. */
  settingsLabel: string;
}

/**
 * Turn the background `llm-status` summary into a display view. `null` means
 * "not loaded yet" and yields a neutral "detecting" state instead of a false
 * "unconfigured" claim (the panel renders before the round-trip completes).
 *
 * TASK-020 任务 C: the label carries an explicit `Key ✅ / ⚠未配置` marker so the
 * user can confirm at a glance whether a key is written. It is derived purely
 * from the existing zero-plaintext `configured` bit — no key-derived string is
 * introduced.
 */
export function llmStatusView(summary: LlmStatusSummary | null | undefined): LlmStatusView {
  if (summary === null || summary === undefined) {
    return { configured: false, label: 'LLM：检测中…', warn: false, settingsLabel: '⚙ 设置' };
  }
  if (!summary.configured) {
    const provider = (summary.providerName || summary.providerId || '未知厂商').trim();
    const model = (summary.model || '默认模型').trim();
    return {
      configured: false,
      label: `LLM：${provider} · ${model} · Key ⚠未配置`,
      warn: true,
      settingsLabel: '⚙ 去配置模型',
    };
  }
  const provider = (summary.providerName || summary.providerId || '未知厂商').trim();
  const model = (summary.model || '默认模型').trim();
  return { configured: true, label: `LLM：${provider} · ${model} · Key ✅`, warn: false, settingsLabel: '⚙ 设置' };
}

// ── TASK-019 任务 B: 「站点未声明协议」显式说明（不误导、不新增状态机） ──────
//
// 用户实测「很多功能不能用」最可能的解释：在**未声明 web-cli 协议的普通站点**
// （如 google.com）上试。这是设计如此，但旧 UI 只显示 `发现=unsupported`，没有
// 讲清楚「不是故障」。本纯函数把既有三态（supported/unsupported/unknown）映射为
// 明确说明；不新增任何状态。

export type DiscoveryNoticeKind = 'not-declared' | 'probe-temporary' | 'probe-terminal' | 'none';

/**
 * TASK-032: the background's automatic-probe projection. The side panel only
 * renders it — it never triggers a probe itself (no manual「重新探测」button).
 */
export interface ProbeView {
  phase?: 'idle' | 'probing' | 'waiting' | 'ready' | 'blocked';
  attempts?: number;
  retries?: number;
  lastReason?: string;
  lastClass?: 'temporary' | 'terminal';
  lastKind?: string;
  nextDelayMs?: number;
}

export interface DiscoveryNoticeView {
  visible: boolean;
  kind: DiscoveryNoticeKind;
  title: string;
  detail: string;
  /**
   * TASK-032: a probe failure is always retried automatically (bounded backoff);
   * the UI never asks the user to click a「重新探测」button.
   */
  autoRetry: boolean;
}

const AUTO_RETRY_LINE = '插件会自动重试——站点修复/刷新页面/切换标签页时立即重试，否则每 15 秒低频软重试，无需手动操作。';

/** Precise, actionable terminal title (never an internal state-machine name). */
function terminalTitle(kind: string | undefined): string {
  if (kind === 'version-mismatch') return '协议版本不匹配';
  if (kind === 'invalid-declaration') return '站点声明存在但无效';
  if (kind === 'no-declaration') return '当前站点未声明 web-cli 协议';
  return '站点声明存在问题';
}

/** Fallback classification when the background did not attach a probe status. */
function classifyFromReason(reason: string): 'temporary' | 'terminal' {
  return /版本|声明无效|声明存在但无效|未声明|不兼容|无效/.test(reason) ? 'terminal' : 'temporary';
}

/**
 * Map the existing `discoveryState` (+ the automatic-probe projection) to an
 * explicit, non-misleading explanation.
 * - `supported` / undefined (not probed yet) → no notice (never a false claim).
 * - `unsupported` → design-not-a-bug explanation + how to verify + auto-retry.
 * - `unknown` temporary →「正在自动探测…（第 N 次重试）」+ latest reason.
 * - `unknown` terminal → precise problem + what the site must fix + auto-retry.
 */
export function discoveryNotice(
  discoveryState: string | undefined | null,
  reason?: string,
  probe?: ProbeView | null,
): DiscoveryNoticeView {
  const hidden: DiscoveryNoticeView = { visible: false, kind: 'none', title: '', detail: '', autoRetry: true };
  if (discoveryState === 'supported' || discoveryState === undefined || discoveryState === null) return hidden;

  const trimmed = reason && reason.trim() ? reason.trim() : '';

  if (discoveryState === 'unsupported') {
    return {
      visible: true,
      kind: 'not-declared',
      title: '当前站点未声明 web-cli 协议',
      detail:
        '本插件无法操作它——这是设计如此，不是故障。可在 LGDL 工作台等声明了协议的站点使用。' +
        '如何验证：在该站点查看 <link rel="web-cli"> / 访问 /.well-known/web-cli.json；无声明即属正常。' +
        (trimmed ? `（最近探测：${trimmed}）` : '') +
        AUTO_RETRY_LINE,
      autoRetry: true,
    };
  }

  const cls = probe?.lastClass ?? (trimmed ? classifyFromReason(trimmed) : 'temporary');
  if (cls === 'terminal') {
    const kind = probe?.lastKind;
    return {
      visible: true,
      kind: 'probe-terminal',
      title: terminalTitle(kind),
      detail: `${trimmed || '站点声明的问题需要站点侧修复。'}站点侧修复后，刷新页面或切换标签页会自动重试。${AUTO_RETRY_LINE}`,
      autoRetry: true,
    };
  }

  const retryNo = probe?.retries ?? 0;
  return {
    visible: true,
    kind: 'probe-temporary',
    title: retryNo > 0 ? `正在自动探测…（第 ${retryNo} 次重试）` : '正在自动探测…',
    detail: `${trimmed || '站点或页面尚未就绪（内容脚本未响应 / 网络暂不可达）。'}${AUTO_RETRY_LINE}`,
    autoRetry: true,
  };
}

// ── TASK-020 任务 B: 「无活跃站点」可解释 + 可自救 ───────────────────────────
//
// 用户实测「面板显示 无活跃站点 / 发送按钮禁用」——旧 UI 只给结论、不给原因与
// 出路。本纯函数把「无绑定站点」拆成三种可操作的具体原因：
//   ① 当前标签页不可注入（chrome:// / 扩展页 / 商店页 …）
//   ② 有 http(s) 标签页但尚未绑定（未点插件图标 / 未重绑）
//   ③ 没有可用标签页
// 「已在目标站点但 discovery 未 supported」由既有 `discoveryNotice` 负责（此时
// activeOrigin 存在，本块隐藏），不重复、不新增状态机。

export type ActiveSiteNoticeKind = 'none' | 'restricted-tab' | 'unbound-tab' | 'no-tab';

export interface ActiveSiteNoticeView {
  visible: boolean;
  kind: ActiveSiteNoticeKind;
  title: string;
  detail: string;
  /** 下一步动作（可读指引）；空串表示无需动作。 */
  action: string;
}

const HIDDEN_SITE_NOTICE: ActiveSiteNoticeView = { visible: false, kind: 'none', title: '', detail: '', action: '' };

export function activeSiteNotice(input: {
  hasOrigin: boolean;
  tab?: ActiveTabView | null;
}): ActiveSiteNoticeView {
  if (input.hasOrigin) return HIDDEN_SITE_NOTICE;
  const tab = input.tab;
  if (!tab || !tab.present) {
    return {
      visible: true,
      kind: 'no-tab',
      title: '没有可用标签页',
      detail: '插件需要一个标签页才能绑定站点。请打开目标站点标签页，再点浏览器工具栏的插件图标。',
      action: '打开目标站点标签页后点插件图标，或点下方「重新绑定当前标签页」。',
    };
  }
  if (tab.restricted) {
    if (tab.addressUnreadable) {
      // D-064: the old copy ("当前标签页没有可读取的地址") read like a broken page,
      // so users never realized the fix was "click the extension icon on the
      // site". Point at the one action that actually binds.
      return {
        visible: true,
        kind: 'unbound-tab',
        title: '当前站点尚未绑定（读不到标签页地址）',
        detail:
          'Chrome 只有在目标站点标签页点击插件图标后，才会把该标签页地址交给插件。' +
          '在此之前插件既读不到地址，也无法绑定——这不是页面故障。',
        action: '请在目标站点标签页点击浏览器工具栏的插件图标（绑定的唯一触发点）；或点下方「重新绑定当前标签页」。',
      };
    }
    return {
      visible: true,
      kind: 'restricted-tab',
      title: '当前标签页不可注入',
      detail: `当前标签页是浏览器受限页面（${tab.reason ?? 'chrome:// / 扩展页 / 商店页等'}），插件无法在其中操作。`,
      action: '请切换到目标站点标签页后点插件图标，或点下方「重新绑定当前标签页」。',
    };
  }
  return {
    visible: true,
    kind: 'unbound-tab',
    title: '当前站点尚未绑定',
    detail: `检测到当前标签页${tab.origin ? ` ${tab.origin}` : ''}，但尚未绑定到插件（可能未点插件图标，或扩展刚重载）。`,
    action: '请在目标站点标签页点击浏览器工具栏的插件图标（绑定的唯一触发点）；或点下方「重新绑定当前标签页」。',
  };
}

/**
 * Readable reason shown next to the composer whenever `send` is disabled.
 * `''` means send is enabled (hide the hint).
 */
export function sendDisabledReason(input: {
  activeOrigin?: string;
  pending: boolean;
  tab?: ActiveTabView | null;
}): string {
  if (input.pending) return '发送已禁用：上一条指令仍在处理中，请稍候。';
  if (input.activeOrigin) return '';
  const notice = activeSiteNotice({ hasOrigin: false, tab: input.tab });
  return `发送已禁用：${notice.title} —— ${notice.action}`;
}

// ── F-3: first-run onboarding (state-driven) ──────────────────────────────
export interface OnboardingInput {
  configured: boolean;
  hasOrigin: boolean;
  discovered: boolean;
  authorized: boolean;
  hasConversation: boolean;
}

export interface OnboardingStep {
  n: number;
  text: string;
  done: boolean;
  current: boolean;
}

export interface OnboardingView {
  /** Hidden once the user is operational (configured + authorized). */
  visible: boolean;
  steps: OnboardingStep[];
  /** 1-based number of the first unfinished step, or null when all done. */
  currentStep: number | null;
}

const ONBOARDING_TEXTS: readonly string[] = [
  '配置模型：点击上方「⚙ 设置」，在当前面板内选择厂商并填入 API Key',
  '打开目标站点：在标签页中打开声明了 web-cli 协议的站点',
  '点击浏览器工具栏的插件图标（这是绑定的唯一触发点）：插件会绑定并发现当前站点，然后自动打开侧栏',
  '点击下方「授权当前站点」，确认知情同意与站点权限',
  '在输入框输入指令并发送，开始对话',
];

export function buildOnboarding(input: OnboardingInput): OnboardingView {
  const done = [input.configured, input.hasOrigin, input.discovered, input.authorized, input.hasConversation];
  const steps: OnboardingStep[] = ONBOARDING_TEXTS.map((text, i) => ({
    n: i + 1,
    text,
    done: done[i],
    current: false,
  }));
  const currentIndex = done.findIndex((d) => !d);
  if (currentIndex >= 0) steps[currentIndex].current = true;
  return {
    visible: !(input.configured && input.authorized),
    steps,
    currentStep: currentIndex >= 0 ? currentIndex + 1 : null,
  };
}

// ── F-6: button enabled/disabled semantics ────────────────────────────────

export interface SidepanelButtonInput {
  activeOrigin?: string;
  authorized: boolean;
  pending: boolean;
}

export interface SidepanelButtonState {
  authorizeDisabled: boolean;
  revokeDisabled: boolean;
  sendDisabled: boolean;
}

export function buttonStates(input: SidepanelButtonInput): SidepanelButtonState {
  const hasOrigin = Boolean(input.activeOrigin);
  return {
    // Authorize only makes sense with a bound site that is not yet authorized.
    authorizeDisabled: !hasOrigin || input.authorized,
    // F-6: revoke must not be clickable (and silently no-op) without an
    // active, authorized origin.
    revokeDisabled: !hasOrigin || !input.authorized,
    // Sending without a bound site cannot reach any tool — keep it honest.
    sendDisabled: input.pending || !hasOrigin,
  };
}

// ── W1: `state` message → reducer action ──────────────────────────────────
//
// The background `state` reply carries the bound origin's persisted
// authorization. Mapping it here (rather than inline in `refreshState`) keeps
// the reload-safety contract unit-testable without a browser.

/** Structural shape of the background `state` reply consumed by the panel. */
export interface StateMessageView {
  active: { origin: string; discoveryState?: string; discoveryReason?: string; invalidated: boolean } | null;
  tools?: string[];
  authorized?: boolean;
  /** TASK-023: per-origin trust of the bound origin (`trusted`/`untrusted`). */
  trust?: string;
  /** Non-sensitive active-tab projection (TASK-020 任务 B). */
  tab?: ActiveTabView | null;
  /** One-shot readable notice from the background (D-064: icon binding / tab switch). */
  panelNotice?: string | null;
  /** decision ② / FR-048: current multi-session projection (null when unbound). */
  session?: SessionSummaryView | null;
  /** FR-052 / ADR-017: bound origin's read/write auto-authorization switches. */
  autoAuth?: AutoAuthSettings;
  /** TASK-032: automatic discovery-probe projection (retry count / reason). */
  probe?: ProbeView | null;
}

// ── decision ② / FR-048: multi-session switcher view ─────────────────────────

export interface SessionSummaryView {
  sessionId: string;
  label: string;
  origins?: string[];
  lastActiveAt?: number;
  grouped?: boolean;
}

export interface SessionGroupView {
  groupId: string;
  name: string;
  origins: string[];
}

/** Structural shape of the background `sessions` reply. */
export interface SessionsMessageView {
  currentSessionId?: string | null;
  sessions?: SessionSummaryView[];
  groups?: SessionGroupView[];
  history?: Array<{ role: string; text: string }>;
}

/** Top-status label for the current session (readable even when unbound). */
export function currentSessionLabel(session: SessionSummaryView | null | undefined): string {
  if (!session) return '会话：（无活跃站点）';
  return `会话：${session.label}`;
}

/** Sort sessions most-recently-active first; current session pinned first. */
export function sortSessions(
  sessions: readonly SessionSummaryView[] | undefined,
  currentSessionId: string | null | undefined,
): SessionSummaryView[] {
  const list = [...(sessions ?? [])];
  list.sort((a, b) => {
    if (a.sessionId === currentSessionId) return -1;
    if (b.sessionId === currentSessionId) return 1;
    return (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0);
  });
  return list;
}

/** Map a background history projection to reducer entries (role whitelist). */
export function historyEntries(
  history: readonly { role: string; text: string }[] | undefined,
): Array<{ role: 'user' | 'assistant' | 'tool' | 'system'; text: string }> {
  const allowed = new Set(['user', 'assistant', 'tool', 'system']);
  return (history ?? [])
    .filter((h) => allowed.has(h.role) && typeof h.text === 'string' && h.text.length > 0)
    .map((h) => ({ role: h.role as 'user' | 'assistant' | 'tool' | 'system', text: h.text }));
}

export interface StateActionView {
  type: 'state';
  origin?: string;
  discoveryState?: SidepanelState['discoveryState'];
  discoveryReason?: string;
  invalidated: boolean;
  authorized: boolean;
  trust?: SidepanelState['trust'];
  autoAuth?: AutoAuthSettings;
  /** TASK-032: automatic-probe projection (never a manual retry trigger). */
  probe?: ProbeView;
}

export function stateActionFromPayload(payload: StateMessageView): StateActionView {
  const active = payload.active;
  const hasOrigin = Boolean(active?.origin);
  return {
    type: 'state',
    ...(hasOrigin ? { origin: active!.origin } : {}),
    ...(active?.discoveryState ? { discoveryState: active.discoveryState as SidepanelState['discoveryState'] } : {}),
    ...(active?.discoveryReason ? { discoveryReason: active.discoveryReason } : {}),
    invalidated: active?.invalidated ?? false,
    // W1: sync the persisted authorization; without a bound origin it is false.
    authorized: hasOrigin && payload.authorized === true,
    // TASK-023: only a bound origin can be trusted; anything else is untrusted.
    trust: hasOrigin && payload.trust === 'trusted' ? 'trusted' : 'untrusted',
    // FR-052: auto-authorization is per bound origin; never carry another's.
    ...(hasOrigin && payload.autoAuth ? { autoAuth: payload.autoAuth } : {}),
    ...(hasOrigin && payload.probe ? { probe: payload.probe } : {}),
  };
}

// ── FR-052 / ADR-017: auto-authorization view helpers (pure) ───────────────

/** Checkbox state for a bound origin (documented defaults when unset). */
export function autoAuthCheckboxState(settings: AutoAuthSettings | undefined): AutoAuthSettings {
  return settings ? { read: settings.read === true, write: settings.write === true } : { ...AUTO_AUTH_DEFAULTS };
}

/** The always-visible marker text ('' when nothing is enabled). */
export function autoAuthMarker(settings: AutoAuthSettings | undefined): string {
  return autoAuthBadge(settings);
}

// ── F-5: empty-log state ──────────────────────────────────────────────────
export const LOG_EMPTY_TEXT = '还没有对话。先在上方配置模型，然后打开目标站点并授权。';

export function isLogEmpty(entryCount: number): boolean {
  return entryCount <= 0;
}

// ── F-4: consent disclosure ───────────────────────────────────────────────

/** The consent/boundary block is collapsed by default (keeps all text). */
export const CONSENT_DEFAULT_OPEN = false;
export const CONSENT_SUMMARY_TEXT = '知情同意与能力边界';

// ── F-1 / TASK-033: settings entry is now an in-panel view switch ─────────
//
// The side panel no longer uses the options-page opening API — the
// settings entry toggles an in-panel settings view (see `sidepanel.ts` +
// `src/ui/settings/`). `options.html` remains available as a fallback page
// (Chrome「扩展详细信息 → 扩展程序选项」), but it is never the settings entry.


// ══ V3-1 (ADR-V3-013 / ADR-V3-017 / ADR-V3-018): L0 skeleton view model ═══════
//
// Pure functions only — no DOM, no `chrome.*`, no storage. Everything the L0
// skeleton displays is derived here, so `test/ui/l0.mjs` and the density gate can
// cross-check the *rendered* numbers against the same source of truth the panel
// uses (FR-V3-011's "N must be derivable", FR-V3-015's "counts from real values",
// FR-V3-046 in v3-3).

/** Five risk classes, mirroring `l0/risk-rail.ts` (kept as strings for purity). */
export type L0RiskClass = 'unauthorized' | 'probing' | 'hardline' | 'confirm' | 'staleRef';

/** Everything the L0 skeleton needs to know about the app state. */
export interface L0Input {
  activeOrigin?: string;
  /** Site display name (host) — falls back to the origin. */
  siteName?: string;
  authorized: boolean;
  trust?: 'trusted' | 'untrusted';
  /** LLM connection badge text (already human readable) — verbatim, for L1/title. */
  llmBadge?: string;
  /** Compact LLM badge: true → `LLM：✅`, false → `LLM：⚠`. */
  llmConfigured?: boolean;
  sessionLabel?: string;
  /** Site declaration read in flight (no command dispatched). */
  probing?: boolean;
  /** Raw discovery state — the band keeps the v1 `发现=<state>` contract text. */
  discoveryState?: string;
  /** Hard-floor blocks observed this session (evaluate / unknown risk / …). */
  hardlineCount?: number;
  /** Stale references reported by the v3-2 validity judge (0 in v3-1). */
  staleRefCount?: number;
  /** A destructive sub-command awaits confirmation. */
  confirmPending?: boolean;
  /** The current round's ask (the ONE decision card). */
  ask?: { prompt: string; options: string[]; recommendedCount?: number } | null;
  /** Reference chips currently attached to the round. */
  refCount?: number;
  /** `#l0-ref-toggle`'s validity flag (v3-2: the real five-dimension judgement). */
  refStale?: boolean;
  /**
   * V3-2 (FR-V3-037): the readable reason of the first unusable reference, so the
   * risk rail can state **which dimension** triggered the invalidation. The copy
   * is produced by `l1/ref-validity.ts` (the single judge) and only *carried*
   * here — the view model never invents a reason.
   */
  staleRefReason?: string;
  /** The `ref_<n>` id the reason belongs to (the risk row's identity channel). */
  staleRefId?: string;
  /** Real counts for the L2 entry panel (v3-3 fills the catalog/audit views). */
  counts?: { tree?: number; commands?: number; audit?: number };
  /**
   * Test-only risk projection controls (`window.__v3.testing`): `force` shows a
   * risk class whose real transition lands in a later leaf, `off` hides a class so
   * the density gate can measure the exact risk increment (AC-V3-003).
   */
  riskForced?: L0RiskClass[];
  riskSuppressed?: L0RiskClass[];
}

/** One visible option of the decision card. */
export interface L0OptionView {
  label: string;
  recommended: boolean;
}

/** The derived L0 view (what the DOM must show). */
export interface L0View {
  band: {
    origin: string;
    siteName: string;
    statusDot: 'ok' | 'warn' | 'idle';
    statusText: string;
    policy: string;
    /** Compact badge shown on the band (`LLM：✅` / `LLM：⚠`). */
    llm: string;
    /** Full LLM label — the band's `title` + the L1 details (never lost). */
    llmDetail: string;
    session: string;
  };
  pick: { disabled: boolean; reason: string };
  decision: {
    visible: boolean;
    prompt: string;
    visibleOptions: L0OptionView[];
    foldedOptions: string[];
    /** `#l0-more`'s N — always `foldedOptions.length + 1` (the terminal item). */
    foldedCount: number;
  };
  ref: { count: number; stale: boolean; label: string };
  /** V3-2: the dynamic invalidation row (null ⇒ the rail uses its generic copy). */
  staleRef: { reason: string; refId: string } | null;
  statusbar: { text: string; entries: Array<{ key: string; label: string; count: number }> };
  risks: L0RiskClass[];
}

/** The terminal escape hatch — must match `l0/risk-rail.ts#OTHER_OPTION_LABEL`. */
export const OTHER_OPTION_LABEL = '其他…（我来描述）';

/** Visible recommended slots. FR-V3-011 allows ≤2; V3-1 shows one (see risk-rail). */
export const L0_VISIBLE_RECOMMENDED = 2;

/** `#l0-base` label — the question the L0 decision zone always answers. */
export const L0_KICKER = '下一步做什么';

/** Derive the active risk classes from the app state (priority order fixed). */
export function deriveRiskClasses(input: L0Input): L0RiskClass[] {
  const risks: L0RiskClass[] = [];
  if (input.authorized !== true) risks.push('unauthorized');
  if (input.probing === true) risks.push('probing');
  if ((input.hardlineCount ?? 0) > 0) risks.push('hardline');
  if (input.confirmPending === true) risks.push('confirm');
  if ((input.staleRefCount ?? 0) > 0) risks.push('staleRef');
  for (const forced of input.riskForced ?? []) if (!risks.includes(forced)) risks.push(forced);
  const suppressed = new Set(input.riskSuppressed ?? []);
  return risks.filter((risk) => !suppressed.has(risk));
}

/** Site display name: host, else the raw origin, else a readable placeholder. */
export function siteDisplayName(origin?: string, explicit?: string): string {
  if (explicit && explicit.trim()) return explicit.trim();
  if (!origin) return '（无活跃站点）';
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

/**
 * Pure L0 view derivation. Everything the density gate counts as L0 text or
 * clickable comes from here, so the budget is auditable in one place.
 */
export function l0ViewModel(input: L0Input): L0View {
  const origin = input.activeOrigin ?? '';
  const siteName = siteDisplayName(origin);
  const risks = deriveRiskClasses(input);
  const probing = input.probing === true;
  const pickDisabled = !input.authorized || probing;
  const pickReason = !input.authorized
    ? '未授权：页面侧零注入，拾取层不存在'
    : probing
      ? '探测中：本阶段不发命令'
      : '从页面拾取引用（替代输入框）';

  // ── decision card: ≤2 visible options + 「更多选项（还有 N 个）」 ──
  const ask = input.ask ?? null;
  const all = ask ? [...ask.options] : [];
  const recommendedSlots = Math.max(0, Math.min(2, ask?.recommendedCount ?? L0_VISIBLE_RECOMMENDED));
  const visibleOptions: L0OptionView[] = all
    .slice(0, recommendedSlots)
    .map((label) => ({ label, recommended: true }));
  const foldedOptions = all.slice(visibleOptions.length);
  // N is derived from the REAL option list (never hard-coded): the options that
  // live behind the disclosure **plus** the always-last terminal item.
  const foldedCount = foldedOptions.length + 1;

  const refCount = Math.max(0, input.refCount ?? 0);
  const counts = {
    tree: Math.max(0, input.counts?.tree ?? 0),
    commands: Math.max(0, input.counts?.commands ?? 0),
    audit: Math.max(0, input.counts?.audit ?? 0),
  };

  return {
    band: {
      origin,
      siteName,
      statusDot: !origin ? 'idle' : input.authorized ? 'ok' : 'warn',
      // The band carries the FULL origin (not just the host): the v1 status contract
      // (`站点 <origin> · 发现=… · 授权态`) is what the existing gates read, and
      // FR-V3-010 asks for「origin + 站点名」. The verbose LLM label is a detail of
      //「谁在管我」and lives in the band's `title` + the L1 status panel.
      // Keeps the v1 `#status` contract that three existing gates read for the RAW
      // discovery state (`unsupported` / `unknown`), and FR-V3-010's origin + site
      // name. The trust tier is the *policy badge*'s job (a separate, always-visible
      // channel), so the band stays on one or two lines at 400px — the message zone
      // keeps its first-round floor (`LOG_CLIENT_HEIGHT_FLOOR`).
      statusText: !origin
        ? '无活跃站点'
        : `站点 ${origin} · 发现=${input.discoveryState ?? '未知'} · ${input.authorized ? '已授权' : '未授权'}`,
      policy: `策略：${input.trust === 'trusted' ? 'trusted' : 'untrusted'}`,
      // Compact, but it still carries the v1 `Key ✅ / Key ⚠` marker the existing
      // gates read (`#11b`); the verbose provider/model label is the band's title +
      // the L1 detail line.
      llm: `LLM：Key ${input.llmConfigured ? '✅' : '⚠'}`,
      llmDetail: input.llmBadge && input.llmBadge.trim() ? input.llmBadge.trim() : 'LLM：未知',
      session: input.sessionLabel ?? '会话：（无活跃站点）',
    },
    pick: { disabled: pickDisabled, reason: pickReason },
    decision: {
      visible: Boolean(ask),
      prompt: ask?.prompt ?? '',
      visibleOptions,
      foldedOptions,
      foldedCount,
    },
    ref: {
      count: refCount,
      stale: input.refStale === true,
      label: `引用 ${refCount} 条${input.refStale ? '（有失效）' : ''}`,
    },
    staleRef:
      input.refStale === true && input.staleRefReason
        ? { reason: input.staleRefReason, refId: input.staleRefId ?? 'ref_?' }
        : null,
    statusbar: {
      text: `状态：树 ${counts.tree} · 命令 ${counts.commands} · 审计 ${counts.audit} · 设置`,
      entries: [
        { key: 'tree', label: `连接树 · ${counts.tree}`, count: counts.tree },
        { key: 'commands', label: `命令目录 · ${counts.commands}`, count: counts.commands },
        { key: 'audit', label: `审计 · ${counts.audit}`, count: counts.audit },
        { key: 'settings', label: '设置', count: -1 },
      ],
    },
    risks,
  };
}

/** `更多选项（还有 N 个）` label — single source for the button copy. */
export function moreOptionsLabel(foldedCount: number): string {
  return `更多选项（还有 ${foldedCount} 个）`;
}

// ══ V3-2 (ADR-V3-021 / ADR-V3-022): L1 entry contract ═══════════════════════
//
// Only the *derivations* live here (pure, DOM-free), so the runtime gate can
// cross-check the rendered counts against the same source of truth the panel
// uses. All static L1 copy (titles, empty states, the two consequence
// paragraph templates) lives in `index.html` — `sidepanel.html` is outside the
// `sidepanel.js` size guard, so shipping it as markup keeps the bundle lean
// without weakening any assertion (ADR-V3-021 §1).

/** `data-l1-panel` id of each of the eight L1 content classes (FR-V3-031). */
export const L1_PANEL_IDS = Object.freeze([
  'l1-status',
  'l1-consequences',
  'l1-ref-evidence',
  'l1-local-tree',
  'l1-history',
  'l1-receipt',
  'l1-gestures',
  'l1-more',
] as const);

/** The four gestures v3-2 ships (v3-4 completes the table and pins it 双向). */
export const L1_GESTURE_COUNT = 4;

/** Labels that make an option destructive (structural filter, single source). */
export const DESTRUCTIVE_OPTION_PATTERN = /删除|清空|移除|覆盖|撤销|重置|批量|卸载/;

/** `true` when an option leads to an irreversible (destructive) sub-command. */
export function isDestructiveOption(label: string): boolean {
  return DESTRUCTIVE_OPTION_PATTERN.test(label);
}

/** One decided round (the L1 history row). */
export interface DecisionRound {
  n: number;
  prompt: string;
  chosen: string;
  canceled: boolean;
  /** `true` when this prompt was reached again (改选). */
  changed: boolean;
}

/** `已决策 N 步` — N is the round count, recomputable from the same array. */
export function decisionHistoryLabel(n: number): string {
  return `已决策 ${Math.max(0, n)} 步`;
}
