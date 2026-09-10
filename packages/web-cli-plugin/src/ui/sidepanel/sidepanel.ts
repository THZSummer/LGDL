/**
 * Side panel UI (FR-017 / FR-024 / FR-025).
 *
 * Extension-origin page (never injected into the host page). Renders the chat,
 * per-origin authorization, second-confirmation prompt and audit view. All state
 * transitions go through the pure reducer in `chat-state.ts`.
 */
import { createInitialState, reduce, resolveConfirm, type SidepanelState } from './chat-state.js';
import { makeMessage, type PluginMessage, type PluginResponse } from '../../background/messaging.js';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

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
    void send(makeMessage('authorize', { origin })).then(() => {
      dispatch({ type: 'state', authorized: true });
      dispatch({
        type: 'notice',
        text: `已授权 ${origin}（知情同意：自动化操作存在账号风控 / 条款冲突 / 数据外泄风险）`,
      });
    });
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

wire();
render();
void refreshState();
