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
    return { configured: false, label: 'LLM：检测中…', warn: false, settingsLabel: '配置模型 / 设置' };
  }
  if (!summary.configured) {
    const provider = (summary.providerName || summary.providerId || '未知厂商').trim();
    const model = (summary.model || '默认模型').trim();
    return {
      configured: false,
      label: `LLM：${provider} · ${model} · Key ⚠未配置`,
      warn: true,
      settingsLabel: '去配置模型',
    };
  }
  const provider = (summary.providerName || summary.providerId || '未知厂商').trim();
  const model = (summary.model || '默认模型').trim();
  return { configured: true, label: `LLM：${provider} · ${model} · Key ✅`, warn: false, settingsLabel: '设置' };
}

// ── TASK-019 任务 B: 「站点未声明协议」显式说明（不误导、不新增状态机） ──────
//
// 用户实测「很多功能不能用」最可能的解释：在**未声明 web-cli 协议的普通站点**
// （如 google.com）上试。这是设计如此，但旧 UI 只显示 `发现=unsupported`，没有
// 讲清楚「不是故障」。本纯函数把既有三态（supported/unsupported/unknown）映射为
// 明确说明；不新增任何状态。

export type DiscoveryNoticeKind = 'not-declared' | 'probe-failed' | 'none';

export interface DiscoveryNoticeView {
  visible: boolean;
  kind: DiscoveryNoticeKind;
  title: string;
  detail: string;
  /** 未知/探测失败时提供「重新探测」入口。 */
  canRetry: boolean;
  retryLabel: string;
}

/**
 * Map the existing `discoveryState` to an explicit, non-misleading explanation.
 * - `supported` / undefined (not probed yet) → no notice (never a false claim).
 * - `unsupported` → design-not-a-bug explanation + how to verify.
 * - `unknown` (probe failed / not finished) → readable reason + retry entry.
 */
export function discoveryNotice(discoveryState: string | undefined | null, reason?: string): DiscoveryNoticeView {
  const hidden: DiscoveryNoticeView = { visible: false, kind: 'none', title: '', detail: '', canRetry: false, retryLabel: '' };
  if (discoveryState === 'supported' || discoveryState === undefined || discoveryState === null) return hidden;

  if (discoveryState === 'unsupported') {
    return {
      visible: true,
      kind: 'not-declared',
      title: '当前站点未声明 web-cli 协议',
      detail:
        '本插件无法操作它——这是设计如此，不是故障。可在 LGDL 工作台等声明了协议的站点使用。' +
        '如何验证：在该站点查看 <link rel="web-cli"> / 访问 /.well-known/web-cli.json；无声明即属正常。',
      canRetry: false,
      retryLabel: '',
    };
  }

  // 'unknown'（或任何未预期值）→ 探测未完成 / 失败，给可读原因与重试入口。
  const detail = reason && reason.trim()
    ? reason.trim()
    : '站点暂时不可达、声明无效或协议版本不匹配。可点「重新探测」重试；若仍失败，请确认站点已正确声明 web-cli 协议。';
  return {
    visible: true,
    kind: 'probe-failed',
    title: 'web-cli 探测未完成（未知状态）',
    detail,
    canRetry: true,
    retryLabel: '重新探测',
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
    action: '请点浏览器工具栏的插件图标，或点下方「重新绑定当前标签页」。',
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
  '配置模型：点击上方「配置模型 / 设置」，选择厂商并填入 API Key',
  '打开目标站点：在标签页中打开声明了 web-cli 协议的站点',
  '点击浏览器工具栏的插件图标，让插件绑定并发现当前站点',
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
  /** Non-sensitive active-tab projection (TASK-020 任务 B). */
  tab?: ActiveTabView | null;
}

export interface StateActionView {
  type: 'state';
  origin?: string;
  discoveryState?: SidepanelState['discoveryState'];
  discoveryReason?: string;
  invalidated: boolean;
  authorized: boolean;
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
  };
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

// ── F-1: settings entry wiring seam (unit-testable) ───────────────────────

/** Minimal structural shape of `chrome.runtime` needed to open options. */
export interface OpenOptionsApi {
  openOptionsPage(): unknown;
}

/** Open the extension options page (no-op when the API is unavailable). */
export function openSettingsPage(api: OpenOptionsApi | undefined): boolean {
  if (!api || typeof api.openOptionsPage !== 'function') return false;
  void api.openOptionsPage();
  return true;
}
