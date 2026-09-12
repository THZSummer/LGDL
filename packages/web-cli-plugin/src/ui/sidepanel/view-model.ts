/**
 * Side-panel view-model (F-1~F-6) — pure, DOM-free and node-testable.
 *
 * The concrete DOM wiring lives in `sidepanel.ts`; every decision that matters
 * for the UI state (LLM status label, onboarding step, button enabled/disabled
 * semantics, empty-log state) is computed here so it can be unit-tested without
 * a browser or a new dependency.
 */
import type { LlmStatusSummary } from '../../llm/status.js';
import type { SidepanelState } from './chat-state.js';

// ── F-2: LLM configuration status ─────────────────────────────────────────

export interface LlmStatusView {
  configured: boolean;
  /** Display label, e.g. `LLM：未配置` / `LLM：DeepSeek · deepseek-chat`. */
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
 */
export function llmStatusView(summary: LlmStatusSummary | null | undefined): LlmStatusView {
  if (summary === null || summary === undefined) {
    return { configured: false, label: 'LLM：检测中…', warn: false, settingsLabel: '配置模型 / 设置' };
  }
  if (!summary.configured) {
    return { configured: false, label: '⚠ 未配置模型：插件无法调用 LLM', warn: true, settingsLabel: '去配置模型' };
  }
  const provider = (summary.providerName || summary.providerId || '未知厂商').trim();
  const model = (summary.model || '默认模型').trim();
  return { configured: true, label: `LLM：${provider} · ${model}`, warn: false, settingsLabel: '设置' };
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
  active: { origin: string; discoveryState?: string; invalidated: boolean } | null;
  tools?: string[];
  authorized?: boolean;
}

export interface StateActionView {
  type: 'state';
  origin?: string;
  discoveryState?: SidepanelState['discoveryState'];
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
