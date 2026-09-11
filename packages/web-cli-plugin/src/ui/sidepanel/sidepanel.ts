/**
 * Side panel UI (FR-017 / FR-024 / FR-025).
 *
 * Extension-origin page (never injected into the host page). Renders the chat,
 * per-origin authorization, second-confirmation prompt and audit view. All state
 * transitions go through the pure reducer in `chat-state.ts`.
 */
import { createInitialState, reduce, resolveConfirm, type SidepanelState } from './chat-state.js';
import { makeMessage, type PluginMessage, type PluginResponse } from '../../background/messaging.js';
import { requestOriginPermission } from '../../platform/extension-env.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

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

function send<T>(message: PluginMessage): Promise<PluginResponse<T>> {
  return chrome.runtime.sendMessage(message) as Promise<PluginResponse<T>>;
}

function render(): void {
  const log = $('log');
  log.textContent = '';
  for (const entry of state.entries) {
    const div = document.createElement('div');
    div.className = `entry entry-${entry.role}${entry.kind === 'error' ? ' entry-error' : ''}`;
    div.textContent = `${entry.role}: ${entry.text}`;
    log.appendChild(div);
  }
  log.scrollTop = log.scrollHeight;

  $('status').textContent = state.activeOrigin
    ? `站点 ${state.activeOrigin} · 发现=${state.discoveryState ?? '未知'} · ${state.authorized ? '已授权' : '未授权'}`
    : '无活跃站点';
  ($('authorize') as HTMLButtonElement).disabled = !state.activeOrigin || state.authorized;
  ($('send') as HTMLButtonElement).disabled = state.pending;

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
  $('audit-count').textContent = `审计 ${state.auditCount} 条`;
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

/** Render the informed-consent block + risk controls (FR-031 / FR-029). */
function renderConsent(): void {
  const section = document.createElement('section');
  section.id = 'consent';
  const title = document.createElement('h2');
  title.textContent = '知情同意与能力边界';
  section.appendChild(title);

  const riskTitle = document.createElement('p');
  riskTitle.textContent = '风险提示';
  section.appendChild(riskTitle);
  const risks = document.createElement('ul');
  for (const r of CONSENT_RISKS) {
    const li = document.createElement('li');
    li.textContent = r;
    risks.appendChild(li);
  }
  section.appendChild(risks);

  const capTitle = document.createElement('p');
  capTitle.textContent = '能力边界';
  section.appendChild(capTitle);
  const caps = document.createElement('ul');
  for (const c of CAPABILITY_BOUNDARY) {
    const li = document.createElement('li');
    li.textContent = c;
    caps.appendChild(li);
  }
  section.appendChild(caps);

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
  document.body.appendChild(section);

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

interface StatePayload {
  active: { origin: string; discoveryState: string; invalidated: boolean } | null;
  tools: string[];
}

async function refreshState(): Promise<void> {
  const res = await send<StatePayload>(makeMessage('state'));
  if (!res.ok || !res.data) return;
  const active = res.data.active;
  dispatch({
    type: 'state',
    ...(active?.origin ? { origin: active.origin } : {}),
    ...(active?.discoveryState ? { discoveryState: active.discoveryState as SidepanelState['discoveryState'] } : {}),
    invalidated: active?.invalidated ?? false,
  });
}

function wire(): void {
  $('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('input') as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    dispatch({ type: 'user', text });
    void send(makeMessage('chat', { user: text }));
  });

  $('authorize').addEventListener('click', () => {
    const origin = state.activeOrigin;
    if (!origin) return;
    void (async () => {
      // Request the optional host permission inside the user gesture (IMP-4 /
      // FR-006); best-effort — OriginStore authorization is the authoritative gate.
      const granted = await requestOriginPermission(origin);
      await send(makeMessage('authorize', { origin }));
      dispatch({ type: 'state', authorized: true });
      dispatch({
        type: 'notice',
        text: `已授权 ${origin}。${consentSummary()}${granted ? '' : '；站点访问权限未授予，将回退到 activeTab 临时授权'}`,
      });
    })();
  });

  $('revoke').addEventListener('click', () => {
    const origin = state.activeOrigin;
    if (!origin) return;
    void send(makeMessage('revoke', { origin })).then(() => dispatch({ type: 'state', authorized: false }));
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

  chrome.runtime.onMessage.addListener((raw) => {
    const msg = raw as PluginMessage;
    if (msg.kind === 'chat-result') {
      const text = typeof msg.text === 'string' ? msg.text : '';
      const variant = typeof msg.variant === 'string' ? msg.variant : 'assistant';
      if (variant === 'error') dispatch({ type: 'error', text });
      else if (variant === 'tool') dispatch({ type: 'tool', text });
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
    return undefined;
  });
}

// Only bootstrap in a real extension page; guarded so the module (and its
// consent/boundary text) stays importable in node tests.
if (typeof document !== 'undefined' && typeof chrome !== 'undefined') {
  wire();
  renderConsent();
  render();
  void refreshState();
}
