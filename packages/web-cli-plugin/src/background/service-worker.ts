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
import { createStorageAuditSink, type PluginAuditSink } from '../security/audit-sink.js';
import { createConfirmBridge } from '../security/confirm.js';
import { createOriginStore, type OriginStore } from '../security/origin-store.js';
import { discoveryAuditEvent } from '../security/discovery-audit.js';
import {
  createChromeAsyncKv,
  createChromeSessionKv,
  requestOriginPermission,
} from '../platform/extension-env.js';
import { capabilityFailure } from '../platform/unsupported.js';
import { createController, type WebCliController } from './controller.js';
import { createWebCliHost, type WebCliHost } from './host.js';
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

    const host = createWebCliHost({
      origins,
      audit,
      rpc: { invoke: (req) => invokeSite(req.origin, req.tool, req.subcommand, req.args) },
      currentOrigin: () => controller.get()?.origin,
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
        const target = origin || controller.get()?.origin || '';
        if (!active || (target && controller.get()?.origin !== target)) {
          return `（无 ${target || '当前站点'} 的声明缓存）`;
        }
        return JSON.stringify(active, null, 2);
      },
      llmConfig: async () => {
        const cfg = await keys.maskedConfig();
        return JSON.stringify(cfg, null, 2);
      },
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

    singletons = { kv, sessionKv, audit, origins, controller, host, keys, chatSession };
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

async function handleMessage(message: PluginMessage): Promise<PluginResponse> {
  const s = await init();
  switch (message.kind) {
    case 'ping':
      return okResponse('pong');
    case 'state': {
      const session = s.controller.get();
      return okResponse({
        active: session
          ? { tabId: session.tabId, origin: session.origin, discoveryState: session.discoveryState, invalidated: session.invalidated }
          : null,
        tools: s.host.deriveTools().map((t) => t.name),
      });
    }
    case 'authorize': {
      const origin = typeof message.origin === 'string' ? message.origin : '';
      if (!origin) return errorResponse('authorize 需要 origin');
      // IMP-4 / FR-006: request the optional host permission alongside the
      // explicit origin authorization (best-effort; the OriginStore remains the
      // authoritative gate). Failure is readable, never silent.
      const granted = await requestOriginPermission(origin);
      const rec = await s.origins.authorize(origin, {
        note: `用户显式授权；host permission ${granted ? '已授予' : '未授予（以 activeTab 兜底）'}`,
      });
      return okResponse({ ...rec, hostPermissionGranted: granted });
    }
    case 'revoke': {
      const origin = typeof message.origin === 'string' ? message.origin : '';
      if (!origin) return errorResponse('revoke 需要 origin');
      return okResponse({ revoked: await s.origins.revoke(origin) });
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
      const prevOrigin = s.controller.get()?.origin;
      if (descriptor) {
        s.controller.setDiscovery('supported', descriptor);
        s.host.activateSite(descriptor, origin);
        s.audit.recordPlugin(discoveryAuditEvent(origin, descriptor));
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
    case 'chat': {
      const user = typeof message.user === 'string' ? message.user : '';
      if (!user.trim()) return errorResponse('chat 需要 user');
      void runChat(s, user);
      return okResponse({ started: true });
    }
    case 'audit-export':
      return okResponse(await s.audit.exportEvents());
    case 'llm-config':
      return okResponse(await s.keys.maskedConfig());
    case 'confirm-response': {
      const rid = typeof message.requestId === 'string' ? message.requestId : '';
      confirmResponder?.(rid, message.allow === true);
      confirmResponder = null;
      return okResponse({ settled: true });
    }
    default:
      return errorResponse(`未知消息类型：${message.kind}`);
  }
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isPluginMessage(raw)) return undefined;
  void handleMessage(raw).then(
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

void init();
