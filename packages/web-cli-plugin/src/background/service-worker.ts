/**
 * MV3 background service worker — control plane entry (ADR-002 / ADR-012).
 *
 * Wiring only: singletons (audit/origins/controller/host), message routing,
 * tab lifecycle and side-panel behavior. All decisions go through the host's
 * `CommandRouter` (single authoritative gate; no bypass).
 *
 * SW lifetime (EC-013): runtime state is snapshotted to `chrome.storage.session`
 * and restored on startup; the audit buffer persists in `chrome.storage.local`.
 */
import type { ChatTurn, ToolResult } from '@lgdl/web-cli-base';
import type { WebCliDescriptor } from '../protocol/descriptor.js';
import { normalizeDescriptor } from '../protocol/descriptor.js';
import { createStorageAuditSink, type PluginAuditSink } from '../security/audit-sink.js';
import { createConfirmBridge } from '../security/confirm.js';
import { createOriginStore, type OriginStore } from '../security/origin-store.js';
import { discoveryAuditEvent, versionAuditEvent } from '../security/discovery-audit.js';
import type { VersionNegotiation } from '../protocol/version.js';
import {
  createChromeAsyncKv,
  createChromeSessionKv,
  hasOriginPermission,
  removeOriginPermission,
} from '../platform/extension-env.js';
import { capabilityFailure } from '../platform/unsupported.js';
import { createController, type WebCliController } from './controller.js';
import { buildStateMessage } from './state-message.js';
import { createWebCliHost, type WebCliHost } from './host.js';
import { createAskBridge, type AskBridge } from './ask-bridge.js';
import { CHAT_HISTORY_KEY, createChatSession, type ChatSession } from './chat-session.js';
import { runChatTurn } from './chat-runner.js';
import {
  errorResponse,
  isPluginMessage,
  makeMessage,
  okResponse,
  requestId,
  type PluginMessage,
  type PluginResponse,
} from './messaging.js';
import { providerChat, providerById } from '../llm/providers.js';
import { createKeyStore } from '../llm/key-store.js';
import { toLlmStatusSummary } from '../llm/status.js';

const SESSION_STATE_KEY = 'session-state';
const SYSTEM_PROMPT =
  'You are the web-cli plugin assistant. Use the available tools to operate on the ' +
  'currently authorized website. Tools in the "site." namespace run in the page via RPC. ' +
  'Always respect authorization and confirmation prompts. Never reveal secrets.';

interface Singletons {
  kv: ReturnType<typeof createChromeAsyncKv>;
  sessionKv: ReturnType<typeof createChromeSessionKv>;
  audit: PluginAuditSink;
  origins: OriginStore;
  controller: WebCliController;
  host: WebCliHost;
  keys: ReturnType<typeof createKeyStore>;
  /** Retained multi-turn conversation (FR-017 / ADR-012). */
  chatSession: ChatSession;
  /** Task-internal clarification bridge (FR-017 / R7). */
  askBridge: AskBridge;
}

let singletons: Singletons | null = null;
let initPromise: Promise<Singletons> | null = null;
let confirmResponder: ((requestId: string, allow: boolean) => void) | null = null;
let chatBusy = false;

async function invokeSite(
  origin: string,
  tool: string,
  subcommand: string,
  args: Record<string, string>,
): Promise<ToolResult> {
  const session = singletons?.controller.get();
  const tabId = session?.tabId;
  if (tabId === undefined) {
    return { ok: false, output: '✖ 无活跃标签，无法执行站点工具（请先打开并授权站点）', error: 'no active tab' };
  }
  try {
    const res = (await chrome.tabs.sendMessage(tabId, makeMessage('site-invoke', { requestId: requestId('rpc'), tool, subcommand, args }))) as
      | PluginResponse<ToolResult>
      | undefined;
    if (!res) return { ok: false, output: '✖ 站点未响应（content script 未注入或页面已导航）', error: 'no response' };
    if (!res.ok || !res.data) return { ok: false, output: `✖ ${res.error ?? '站点执行失败'}`, error: res.error ?? 'site error' };
    return res.data;
  } catch (err) {
    // FR-008 / EC-007: unreachable capability is translated readably (never silent).
    const translated = capabilityFailure(err, `站点工具 ${tool} 调用`);
    return {
      ok: false,
      output: `${translated.output}（${err instanceof Error ? err.message : String(err)}）`,
      error: translated.error,
    };
  }
}

async function init(): Promise<Singletons> {
  if (singletons) return singletons;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const kv = createChromeAsyncKv('web-cli');
    const sessionKv = createChromeSessionKv('web-cli');
    const audit = createStorageAuditSink(kv);
    await audit.load();
    const origins = createOriginStore(kv, { audit });
    const controller = createController();
    const keys = createKeyStore(kv);

    // FR-017 / R7: task-internal `askUser` questions are delivered to the side
    // panel; a failed delivery / timeout resolves as canceled (fail-closed).
    const askBridge = createAskBridge({
      requestId,
      deliver: (rid, question) =>
        chrome.runtime
          .sendMessage(makeMessage('ask-user-request', { requestId: rid, question }))
          .then(() => undefined),
    });

    const host = createWebCliHost({
      origins,
      audit,
      rpc: { invoke: (req) => invokeSite(req.origin, req.tool, req.subcommand, req.args) },
      currentOrigin: () => controller.get()?.origin,
      askUser: askBridge.askUser,
      onAsk: createConfirmBridge({
        currentOrigin: () => controller.get()?.origin,
        audit,
        ask: (question) =>
          new Promise((resolve) => {
            const rid = requestId('confirm');
            confirmResponder = (id, allow) => {
              if (id === rid) resolve({ action: allow ? 'allow' : 'deny' });
            };
            void chrome.runtime.sendMessage(makeMessage('confirm-request', { requestId: rid, question })).catch(() => {
              resolve({ action: 'deny' });
            });
          }),
      }),
      descriptorShow: async (origin) => {
        const active = host.activeDescriptor();
        const activeOrigin = host.activeOrigin();
        const target = origin || controller.get()?.origin || activeOrigin || '';
        if (!active || (target && activeOrigin !== target)) {
          return `（无 ${target || '当前站点'} 的声明缓存）`;
        }
        return JSON.stringify(active, null, 2);
      },
      llmConfig: async () => JSON.stringify(toLlmStatusSummary(await keys.maskedConfig()), null, 2),
    });

    // restore runtime session (EC-013)
    try {
      const snap = await sessionKv.get<{ tabId?: number; origin?: string; invalidated?: boolean; updatedAt?: number }>(SESSION_STATE_KEY);
      if (snap && snap.tabId !== undefined && snap.origin) {
        controller.restore({ tabId: snap.tabId, origin: snap.origin, invalidated: snap.invalidated ?? false, updatedAt: snap.updatedAt ?? Date.now() });
      }
    } catch (err) {
      console.warn('[web-cli-plugin] session restore failed:', err);
    }

    // restore multi-turn conversation (EC-013); cleared on navigation (EC-011)
    const chatSession = createChatSession();
    try {
      const hist = await sessionKv.get<ChatTurn[]>(CHAT_HISTORY_KEY);
      if (Array.isArray(hist)) chatSession.restore(hist);
    } catch (err) {
      console.warn('[web-cli-plugin] chat history restore failed:', err);
    }

    singletons = { kv, sessionKv, audit, origins, controller, host, keys, chatSession, askBridge };
    return singletons;
  })();
  return initPromise;
}

async function persistSession(s: Singletons): Promise<void> {
  try {
    await s.sessionKv.set(SESSION_STATE_KEY, s.controller.snapshot());
  } catch (err) {
    console.warn('[web-cli-plugin] session persist failed:', err);
  }
}

async function persistChatHistory(s: Singletons): Promise<void> {
  try {
    await s.sessionKv.set(CHAT_HISTORY_KEY, s.chatSession.snapshot());
  } catch (err) {
    console.warn('[web-cli-plugin] chat history persist failed:', err);
  }
}

/** Clear the session conversation (navigation / origin switch; EC-011). */
async function resetChatSession(s: Singletons): Promise<void> {
  s.chatSession.clear();
  await persistChatHistory(s);
}

async function runChat(s: Singletons, user: string): Promise<void> {
  if (chatBusy) {
    await chrome.runtime
      .sendMessage(makeMessage('chat-result', { variant: 'error', text: '上一条消息仍在处理中，请稍候再发送。' }))
      .catch(() => {});
    return;
  }
  chatBusy = true;
  try {
    const settings = await s.keys.load();
    const provider = providerById(settings.providerId);
    await runChatTurn(user, {
      session: s.chatSession,
      system: SYSTEM_PROMPT,
      maxRounds: settings.maxRounds,
      chat: async (turns, system) =>
        providerChat(
          { providerId: settings.providerId, apiKey: settings.apiKey, model: settings.model, baseURL: settings.baseURL },
          [{ role: 'system', content: system }, ...turns],
          s.host.deriveTools(),
        ),
      dispatch: (tc) => s.host.dispatch(tc, { origin: s.controller.get()?.origin }),
      deriveCommand: (tc) => s.host.router.deriveCommand(tc),
      events: {
        onAssistantText: (text) => void chrome.runtime.sendMessage(makeMessage('chat-result', { variant: 'assistant', text })).catch(() => {}),
        onToolOutput: (text) => void chrome.runtime.sendMessage(makeMessage('chat-result', { variant: 'tool', text })).catch(() => {}),
        onLLMError: (message) => void chrome.runtime.sendMessage(makeMessage('chat-result', { variant: 'error', text: message })).catch(() => {}),
        onFinish: () => void chrome.runtime.sendMessage(makeMessage('chat-result', { variant: 'done' })).catch(() => {}),
      },
    });
    void provider.name;
  } finally {
    chatBusy = false;
    await persistChatHistory(s);
  }
}

async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, makeMessage('ping'));
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      return true;
    } catch (err) {
      console.warn('[web-cli-plugin] content script inject failed:', err);
      return false;
    }
  }
}

async function handleMessage(message: PluginMessage, sender?: chrome.runtime.MessageSender): Promise<PluginResponse> {
  const s = await init();
  switch (message.kind) {
    case 'ping':
      return okResponse('pong');
    case 'state': {
      const session = s.controller.get();
      // W1: report the bound origin's persisted authorization so a side-panel
      // reload / SW restart never falls back to a false "未授权" (no origin → false).
      return okResponse(
        await buildStateMessage({
          active: session
            ? { tabId: session.tabId, origin: session.origin, discoveryState: session.discoveryState, invalidated: session.invalidated }
            : null,
          tools: s.host.deriveTools().map((t) => t.name),
          isAuthorized: (origin) => s.origins.isAuthorized(origin),
        }),
      );
    }
    case 'authorize': {
      const origin = typeof message.origin === 'string' ? message.origin : '';
      if (!origin) return errorResponse('authorize 需要 origin');
      // IMP-4 / FR-006: the **side panel** requests the optional host permission
      // inside the user gesture and reports the outcome; the background has no
      // gesture, so it only records the reported/re-checked state (no duplicate
      // request). The OriginStore remains the authoritative gate (D-015/D-022).
      const reported = message.hostPermissionGranted;
      const granted = typeof reported === 'boolean' ? reported : await hasOriginPermission(origin);
      const rec = await s.origins.authorize(origin, {
        note: `用户显式授权；站点访问权限 ${granted ? '已授予' : '未授予（回退 activeTab 临时授权）'}`,
      });
      return okResponse({ ...rec, hostPermissionGranted: granted });
    }
    case 'revoke': {
      const origin = typeof message.origin === 'string' ? message.origin : '';
      if (!origin) return errorResponse('revoke 需要 origin');
      // EC-008 / FR-006: user-initiated revocation also drops the optional host
      // permission (best-effort, readable). The plugin keeps working via
      // activeTab / page-source discovery — authorization loss never silently
      // disables unrelated capabilities.
      const hostPermissionRemoved = await removeOriginPermission(origin);
      const revoked = await s.origins.revoke(origin);
      if (hostPermissionRemoved) {
        s.audit.recordPlugin({
          type: 'host-permission',
          ts: Date.now(),
          origin,
          decision: 'revoked',
          reason: '用户撤销授权：可选站点权限已移除，回退 activeTab / 页面源发现',
        });
      }
      return okResponse({ revoked, hostPermissionRemoved });
    }
    case 'set-trust': {
      const origin = typeof message.origin === 'string' ? message.origin : '';
      const trust = message.trust === 'trusted' ? 'trusted' : 'untrusted';
      if (!origin) return errorResponse('set-trust 需要 origin');
      return okResponse(await s.origins.setTrust(origin, trust));
    }
    case 'discover': {
      const origin = typeof message.origin === 'string' ? message.origin : s.controller.get()?.origin ?? '';
      const descriptor = message.descriptor as WebCliDescriptor | undefined;
      if (!origin) return errorResponse('discover 需要 origin');
      // ADR-012: a content script reporting discovery from a tab binds that tab
      // when no session is active (robust to on-demand injection paths that do
      // not go through the action-click handler). Additive; the action click
      // path is unchanged.
      const senderTabId = sender?.tab?.id;
      if (senderTabId !== undefined) {
        const cur = s.controller.get();
        if (!cur || cur.tabId !== senderTabId || cur.origin !== origin) {
          s.controller.bindTab(senderTabId, origin);
        }
      }
      const prevOrigin = s.controller.get()?.origin;
      // EC-014 / FR-013: audit version negotiation (unknown / incompatible →
      // reject or degrade, always readable, never silent).
      const version = message.version as VersionNegotiation | undefined;
      if (version && typeof version.action === 'string' && typeof version.declared === 'string') {
        s.audit.recordPlugin(versionAuditEvent(origin, version));
      }
      if (descriptor) {
        // Deterministic normalization (trimmed ids / stable ordering) before the
        // declaration is cached and its tools registered.
        const normalized = normalizeDescriptor(descriptor);
        s.controller.setDiscovery('supported', normalized);
        s.host.activateSite(normalized, origin);
        s.audit.recordPlugin(discoveryAuditEvent(origin, normalized));
      } else {
        s.controller.setDiscovery('unsupported');
        s.host.deactivateSite();
        s.audit.recordPlugin(discoveryAuditEvent(origin, undefined));
      }
      // ADR-012: switching origin starts a fresh conversation (no silent carry-over).
      if (prevOrigin && prevOrigin !== origin) await resetChatSession(s);
      await persistSession(s);
      return okResponse({ origin, tools: s.host.registeredSiteTools() });
    }
    case 'site-event': {
      // FR-021: background event channel → content script → page `env.events` hub.
      const session = s.controller.get();
      const tabId = session?.tabId;
      if (tabId === undefined) return errorResponse('无活跃标签，无法访问站点事件通道（请先打开并授权站点）');
      try {
        const res = (await chrome.tabs.sendMessage(
          tabId,
          makeMessage('site-event', { op: message.op, params: message.params }),
        )) as PluginResponse | undefined;
        return res ?? errorResponse('站点未响应事件通道请求');
      } catch (err) {
        return errorResponse(`站点事件通道不可达：${err instanceof Error ? err.message : String(err)}`);
      }
    }
    case 'site-event-push':
      // Page-world event push forwarded by the content script; fan out to other
      // extension contexts (side panel) best-effort — never throws, no loop
      // (Chrome does not deliver runtime.sendMessage back to the sender).
      void chrome.runtime.sendMessage(makeMessage('site-event-push', { channel: message.channel, subId: message.subId, events: message.events })).catch(() => {});
      return okResponse({ forwarded: true });
    case 'chat': {
      const user = typeof message.user === 'string' ? message.user : '';
      if (!user.trim()) return errorResponse('chat 需要 user');
      void runChat(s, user);
      return okResponse({ started: true });
    }
    case 'risk-control': {
      // FR-029 / EC-010: user interrupt (stop) / pause / resume of automation.
      const action = typeof message.action === 'string' ? message.action : 'status';
      const reason = typeof message.reason === 'string' ? message.reason : undefined;
      if (action === 'pause') s.host.pauseRisk(reason ?? '用户暂停');
      else if (action === 'resume') s.host.resumeRisk();
      else if (action === 'stop') s.host.stopRisk(reason ?? '用户中止');
      else if (action !== 'status') return errorResponse(`未知的风控操作：${action}`);
      return okResponse(s.host.riskGuard.status());
    }
    case 'audit-export':
      return okResponse(await s.audit.exportEvents());
    case 'llm-config':
      // W3: no key-derived string (not even a mask) leaves the background — the
      // non-sensitive summary is the only shape ever returned to a caller.
      return okResponse(toLlmStatusSummary(await s.keys.maskedConfig()));
    case 'llm-status':
      // F-2: side panel gets a non-sensitive summary only (never the API key).
      return okResponse(toLlmStatusSummary(await s.keys.maskedConfig()));
    case 'confirm-response': {
      const rid = typeof message.requestId === 'string' ? message.requestId : '';
      confirmResponder?.(rid, message.allow === true);
      confirmResponder = null;
      return okResponse({ settled: true });
    }
    case 'ask-user-response': {
      // FR-017 / R7: side-panel answer to a task-internal clarification question.
      const rid = typeof message.requestId === 'string' ? message.requestId : '';
      const canceled = message.canceled === true;
      const value = typeof message.value === 'string' ? message.value : undefined;
      const settled = s.askBridge.settle(rid, {
        ok: !canceled && value !== undefined,
        ...(value !== undefined ? { value } : {}),
        ...(canceled ? { canceled: true } : {}),
      });
      return settled ? okResponse({ settled: true }) : errorResponse(`无待回答的 ask-user 请求：${rid}`);
    }
    default:
      return errorResponse(`未知消息类型：${message.kind}`);
  }
}

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (!isPluginMessage(raw)) return undefined;
  void handleMessage(raw, sender).then(
    (res) => sendResponse(res),
    (err) => sendResponse(errorResponse(err instanceof Error ? err.message : String(err))),
  );
  return true; // async response
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[web-cli-plugin] sidePanel behavior setup failed:', err);
  });
});

// EC-008 / FR-006: an externally revoked optional host permission (browser
// extension page) is audited readably. The OriginStore authorization and the
// page-source discovery path are unaffected (no silent capability loss).
chrome.permissions.onRemoved.addListener((permissions) => {
  void (async () => {
    const s = await init();
    for (const pattern of permissions.origins ?? []) {
      s.audit.recordPlugin({
        type: 'host-permission',
        ts: Date.now(),
        origin: pattern.replace(/\/\*$/, ''),
        decision: 'revoked',
        reason: '浏览器/用户撤销站点权限（授权保留，回退 activeTab / 页面源发现）',
      });
    }
  })();
});

chrome.action.onClicked.addListener((tab) => {
  void (async () => {
    const s = await init();
    if (tab.id !== undefined) {
      await ensureContentScript(tab.id);
      if (tab.url) {
        try {
          const origin = new URL(tab.url).origin;
          const prevOrigin = s.controller.get()?.origin;
          s.controller.bindTab(tab.id, origin);
          if (prevOrigin && prevOrigin !== origin) await resetChatSession(s);
          await persistSession(s);
        } catch (err) {
          console.warn('[web-cli-plugin] tab url parse failed:', err);
        }
      }
    }
  })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  void (async () => {
    const s = await init();
    const session = s.controller.get();
    if (session && session.tabId === tabId) {
      s.controller.markNavigated();
      s.host.deactivateSite();
      // EC-011: whole-page navigation invalidates the conversation (no silent continuation).
      await resetChatSession(s);
      await persistSession(s);
    }
  })();
});

// ADR-012 / EC-011: closing the bound tab clears the single-tab session so a
// stale tabId can never be reused for a different page.
chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const s = await init();
    if (s.controller.get()?.tabId === tabId) {
      s.controller.clear();
      s.host.deactivateSite();
      await resetChatSession(s);
      await persistSession(s);
    }
  })();
});

void init();
