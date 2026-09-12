/**
 * Side panel UI (FR-017 / FR-024 / FR-025).
 *
 * Extension-origin page (never injected into the host page). Renders the chat,
 * per-origin authorization, second-confirmation prompt and audit view. All state
 * transitions go through the pure reducer in `chat-state.ts`.
 */
import { createInitialState, reduce, resolveAsk, resolveConfirm, type ChatRole, type SidepanelState } from './chat-state.js';
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
  openSettingsPage,
  sendDisabledReason,
  sortSessions,
  stateActionFromPayload,
  type SessionGroupView,
  type SessionSummaryView,
  type SessionsMessageView,
  type StateMessageView,
} from './view-model.js';
import { AUTO_AUTH_HARD_LINES, type AutoAuthSettings } from '../../security/auto-authorize.js';
import type { LlmStatusSummary } from '../../llm/status.js';
import type { ActiveTabView } from '../../background/state-message.js';
import type { TestConnectionResult } from '../../llm/test-connection.js';
import { makeMessage, type PluginMessage, type PluginResponse } from '../../background/messaging.js';
import { requestOriginPermissionDetailed } from '../../platform/extension-env.js';
import { detectExtensionEnv, type ChromeEnvLike, type EnvGuardResult } from '../../platform/env-guard.js';

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

/** Live scroll metrics of the message list (measured from the real DOM). */
function metricsOf(el: HTMLElement): ScrollMetrics {
  return { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop, clientHeight: el.clientHeight };
}

/** Re-read the message list and refresh the follow anchor from live layout. */
function syncScrollAnchor(el?: HTMLElement | null): void {
  const log = el ?? document.getElementById('log');
  if (log) scrollFollow.observe(metricsOf(log));
}

/** True when the message list is scrolled to (near) the bottom. */
function isAtBottom(el: HTMLElement): boolean {
  return isNearBottom(metricsOf(el));
}

/** Show the "back to bottom" affordance only while scrolled away. */
function updateScrollHint(): void {
  const log = document.getElementById('log');
  const btn = document.getElementById('scroll-bottom');
  if (!log || !btn) return;
  btn.classList.toggle('show', !isAtBottom(log));
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
  const log = $('log');
  // Regression fix: the follow decision comes from the live anchor maintained by
  // `scroll` events (post-layout), not from a `scrollTop`/`scrollHeight` read
  // taken before the append. The user's own send forces a follow one-shot.
  const follow = scrollFollow.shouldFollow();
  const prevTop = log.scrollTop;
  log.textContent = '';
  if (isLogEmpty(state.entries.length) && !state.pending) {
    // F-5: never a large blank box — a readable placeholder instead.
    log.classList.add('empty');
    log.textContent = LOG_EMPTY_TEXT;
  } else {
    log.classList.remove('empty');
    for (const entry of state.entries) {
      log.appendChild(renderEntry(entry));
    }
    if (state.pending) log.appendChild(renderThinking());
    if (follow) followToBottom(log);
    // Not following: clearing the list reset scrollTop to 0, so restore the
    // user's reading position (they explicitly scrolled away — never yank them).
    else log.scrollTop = prevTop;
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
  notice.style.display = state.notice ? 'block' : 'none';

  const confirmBox = $('confirm');
  if (state.confirm) {
    confirmBox.style.display = 'block';
    $('confirm-summary').textContent = state.confirm.summary;
  } else {
    confirmBox.style.display = 'none';
  }

  renderLlmStatus();
  renderOnboarding();
  renderDiscoveryNotice();
  renderAsk();
  renderSession();
  renderAutoAuth();
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

/** F-2: render the non-sensitive LLM configuration status + settings CTA. */
function renderLlmStatus(): void {
  const el = $('llm-status');
  const btn = $('open-options') as HTMLButtonElement;
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
  box.style.display = view.visible ? 'block' : 'none';
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
  el.style.display = reason ? 'block' : 'none';
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
  box.style.display = view.visible ? 'block' : 'none';
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
  box.style.display = view.visible ? 'block' : 'none';
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

/** Render the task-internal clarification prompt (FR-017 / R7). */
function renderAsk(): void {
  const box = $('ask');
  const options = $('ask-options');
  options.textContent = '';
  if (!state.ask) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';
  $('ask-prompt').textContent = state.ask.prompt;
  const choices =
    state.ask.kind === 'choice'
      ? (state.ask.options ?? [])
      : state.ask.kind === 'confirm'
        ? ['是', '否']
        : [];
  for (const choice of choices) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = choice;
    btn.addEventListener('click', () => submitAsk(choice, false));
    options.appendChild(btn);
  }
  ($('ask-input') as HTMLInputElement).style.display = state.ask.kind === 'text' ? '' : 'none';
}

/** Send the user's answer back to the background and clear the prompt (R7). */
function submitAsk(value: string | undefined, canceled: boolean): void {
  const res = resolveAsk(state, value, canceled);
  if (res) void send(makeMessage('ask-user-response', { ...res }));
  dispatch({ type: 'ask-resolved' });
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
  const slot = document.getElementById('consent-slot');
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

function wire(): void {
  // F-1: explicit settings entry in the panel's top status area.
  $('open-options').addEventListener('click', () => {
    openSettingsPage(chrome.runtime);
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
    void send(makeMessage('chat', { user: text }));
  });

  // TASK-023: keep the「回到底部」affordance + follow anchor in sync with the
  // user's real scroll position (post-layout metrics, not stale pre-append reads).
  $('log').addEventListener(
    'scroll',
    () => {
      syncScrollAnchor();
      updateScrollHint();
    },
    { passive: true },
  );
  $('scroll-bottom').addEventListener('click', () => {
    const log = $('log');
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

  $('ask-submit').addEventListener('click', () => submitAsk(($('ask-input') as HTMLInputElement).value, false));
  $('ask-cancel').addEventListener('click', () => submitAsk(undefined, true));
  $('ask-input').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      e.preventDefault();
      submitAsk(($('ask-input') as HTMLInputElement).value, false);
    }
  });

  chrome.runtime.onMessage.addListener((raw) => {
    const msg = raw as PluginMessage;
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
      else if (variant === 'done') dispatch({ type: 'pending', value: false });
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
    return undefined;
  });
}

/** TASK-019 任务 A: blocking banner + disabled actions when not in an extension. */
function applyEnvGuard(env: EnvGuardResult): void {
  const banner = $('env-guard');
  banner.textContent = env.banner;
  banner.style.display = env.inExtension ? 'none' : 'block';
  if (env.inExtension) return;
  for (const id of ['authorize', 'revoke', 'send', 'audit', 'open-options', 'rebind']) {
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
    });
  }
}
