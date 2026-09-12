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
import { createExtensionBrowserEnv } from '../platform/browser-env.js';
import { createController, type WebCliController } from './controller.js';
import { buildStateMessage, projectActiveTab, type SessionView } from './state-message.js';
import { buildDiagMessage } from './diag-message.js';
import { BUILD_STAMP } from '../build-info.js';
import { createWebCliHost, type WebCliHost } from './host.js';
import { createAskBridge, type AskBridge } from './ask-bridge.js';
import { CHAT_HISTORY_KEY, createChatSession, type ChatSession } from './chat-session.js';
import { createSessionStore, projectHistory, sessionLabel, type SessionStore } from './session-store.js';
import { createTabsSettingStore, type TabsSettingStore } from './tabs-setting.js';
import type { TabsToolDeps } from '../tools/tabs-tools.js';
import {
  reconcileSiteContentScripts,
  registerSiteContentScript,
  unregisterSiteContentScript,
  type ContentScriptsApi,
} from './content-script-registry.js';
import { runChatTurn } from './chat-runner.js';
import { commandEvent, llmErrorEvent, toolResultEvent } from './chat-events.js';
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
import { testLlmConnection } from '../llm/test-connection.js';
import { createTestConnectionCache, llmConfigFingerprint } from '../llm/test-cache.js';

const SESSION_STATE_KEY = 'session-state';
/** TASK-019: SW 本次启动时间（诊断面板「SW 连通性」详情）。 */
const SW_STARTED_AT = Date.now();
const SYSTEM_PROMPT =
  'You are the web-cli plugin assistant. Use the available tools to operate on the ' +
  'currently authorized website. Tools named "site_*" are declared by the site ' +
  'and run in the page via RPC (the original site id is preserved for dispatch). ' +
  'Always respect authorization and confirmation prompts. Never reveal secrets. ' +
  'When a tool call FAILS you MUST report it to the user explicitly in your reply ' +
  '(which tool failed and the readable reason) — never gloss over a failure or say ' +
  'there is nothing to report. If the failure reason says the target origin is not ' +
  'authorized (web-fetch refuses instead of sending a CORS-blocked request), tell ' +
  'the user to click the extension icon on that site tab and choose「授权当前站点」' +
  '(or use tabs open) and then retry.';

interface Singletons {
  kv: ReturnType<typeof createChromeAsyncKv>;
  sessionKv: ReturnType<typeof createChromeSessionKv>;
  audit: PluginAuditSink;
  origins: OriginStore;
  controller: WebCliController;
  host: WebCliHost;
  keys: ReturnType<typeof createKeyStore>;
  /** Retained multi-turn conversation of the **current** session (FR-017 / ADR-012). */
  chatSession: ChatSession;
  /** decision ② / FR-048: per-origin (or per-group) sessions + conversation histories. */
  sessions: SessionStore;
  /** decision ① / FR-047: descriptor cache per origin (re-activate on session switch). */
  descriptors: Map<string, WebCliDescriptor>;
  /** The session currently bound to `chatSession` (null before the first bind). */
  currentSessionId: string | null;
  /** decision ①: `chrome.scripting` declarative-injection adapter. */
  contentScripts: ContentScriptsApi;
  /** Task-internal clarification bridge (FR-017 / R7). */
  askBridge: AskBridge;
  /** FR-049 privacy switch: whether the plugin-level `tabs` tool is exposed. */
  tabsSetting: TabsSettingStore;
  /**
   * TASK-028: in-memory TTL cache for `llm-test` results (60s, keyed by a
   * non-reversible config fingerprint). Never persisted / logged / audited.
   */
  testCache: ReturnType<typeof createTestConnectionCache>;
}

let singletons: Singletons | null = null;
let initPromise: Promise<Singletons> | null = null;
let confirmResponder: ((requestId: string, allow: boolean) => void) | null = null;
/** decision ②/FR-048: track the pending confirmation so a session switch can cancel it. */
let pendingConfirmId: string | null = null;
let chatBusy = false;

/**
 * One-shot readable notice surfaced through the next `state` reply (D-064).
 * Used for the side-panel-open fallback, the "switched tab" prompt and the
 * action-click binding result, so the panel never fails silently.
 */
let panelNotice: string | null = null;
function takePanelNotice(): string | null {
  const notice = panelNotice;
  panelNotice = null;
  return notice;
}

/**
 * Binding path shared by the toolbar-icon click, the panel「重新绑定」and the
 * automatic handshake (decision ①/②). Resolves the origin's session (per-origin
 * or group), switches to it, and never throws; a readable reason on failure.
 */
async function bindTab(
  s: Singletons,
  tabId: number,
  url: string | undefined,
): Promise<{ ok: true; origin: string; injected: boolean } | { ok: false; reason: string }> {
  const origin = tabOrigin(url);
  if (!origin) return { ok: false, reason: projectActiveTab({ url }).reason ?? '不是可注入的 http(s) 站点' };
  const injected = await ensureContentScript(tabId);
  await bindOrigin(s, tabId, origin);
  return { ok: true, origin, injected };
}

/**
 * Bind an already-known origin to a tab and adopt its session. Used by the icon
 * click (URL from the gesture) and the automatic handshake (origin self-reported
 * by the content script via `hello` / `whoami`).
 */
async function bindOrigin(s: Singletons, tabId: number, origin: string): Promise<void> {
  const { session, evicted } = await s.sessions.activate(origin);
  s.controller.bindTab(tabId, origin, session.sessionId);
  await switchSession(s, session.sessionId);
  if (evicted.length > 0) {
    // decision ② / FR-048: cap eviction is always disclosed, never silent.
    panelNotice = `会话数超过上限，已按最近最少使用淘汰：${evicted.join('、')}（历史随之释放）`;
  }
}

/**
 * decision ② / FR-048: adopt a session without changing the bound tab. Cancels any
 * pending confirm/ask **readably** (never silently hangs), restores that session's
 * conversation, re-activates the site tools for the bound origin, and notifies the
 * panel.
 */
async function switchSession(s: Singletons, sessionId: string): Promise<void> {
  if (s.currentSessionId !== sessionId) {
    const canceled: string[] = [];
    const asks = s.askBridge.pendingCount();
    if (asks > 0) s.askBridge.cancelAll();
    if (cancelPendingConfirm()) canceled.push('权限二次确认');
    if (asks > 0) canceled.push(`${asks} 个任务内提问`);
    if (canceled.length > 0) {
      // decision ②/FR-048 + EC-019: pending interactions are resolved as
      // deny/cancel with a readable reason — not left hanging on the old session.
      panelNotice = `已切换会话：待决的${canceled.join('、')}已按「拒绝/取消」处理（不静默挂起）。`;
    }
  }
  s.currentSessionId = sessionId;
  s.controller.setSessionId(sessionId);
  s.chatSession.restore(s.sessions.historyOf(sessionId));
  await s.sessions.touch(sessionId);
  // Re-activate the site tools for the bound origin from the descriptor cache so
  // a session switch never leaves a mismatched tool surface.
  const origin = s.controller.get()?.origin;
  const cached = origin ? s.descriptors.get(origin) : undefined;
  if (origin && cached) s.host.activateSite(cached, origin);
  else s.host.deactivateSite();
  await persistSession(s);
  // Notify the panel to re-read the current session (history回显).
  void chrome.runtime.sendMessage(makeMessage('session-changed', { sessionId })).catch(() => {});
}

/** Cancel a pending PRM confirmation as deny (fail-closed; EC-005). */
function cancelPendingConfirm(): boolean {
  if (pendingConfirmId && confirmResponder) {
    const id = pendingConfirmId;
    confirmResponder(id, false);
    confirmResponder = null;
    pendingConfirmId = null;
    return true;
  }
  return false;
}

/**
 * Open the side panel for a tab (D-064).
 *
 * MUST be invoked synchronously from inside a user gesture — awaiting anything
 * first consumes the gesture token and Chrome rejects `sidePanel.open`. A
 * failure only means the automatic open did not happen: the binding already
 * succeeded and a readable notice tells the user how to open the panel.
 */
async function openSidePanel(tabId: number): Promise<void> {
  try {
    await chrome.sidePanel.open({ tabId });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    panelNotice =
      `已绑定站点，但自动打开侧栏失败：${reason}。请点击浏览器工具栏的插件图标打开侧栏；` +
      '若仍打不开，请在 chrome://extensions 重新加载扩展（自动打开侧栏需 Chrome 116+）。';
    console.warn('[web-cli-plugin] sidePanel.open failed:', reason);
  }
}

/**
 * D-064: the toolbar icon must *bind* on click, which requires
 * `chrome.action.onClicked` to fire. Chrome suppresses that event while
 * `openPanelOnActionClick` is true, so it is explicitly disabled here (also
 * repairs profiles upgraded from ≤0.8 builds). The click handler opens the
 * panel itself instead.
 */
async function configureSidePanelBehavior(): Promise<void> {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch (err) {
    console.warn('[web-cli-plugin] sidePanel.setPanelBehavior failed:', err);
  }
}

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
    // decision ② / FR-048: multi-session store (per-origin default, optional groups).
    const sessions = createSessionStore(kv);
    await sessions.load();
    // FR-049 (author decision ③): tab-tool privacy toggle (default on). The
    // stored value is applied to the host below so a disabled tool is simply not
    // registered (it never appears in `deriveTools()`).
    const tabsSetting = createTabsSettingStore(kv);
    await tabsSetting.load();
    // TASK-028: in-memory-only test-result cache (never persisted).
    const testCache = createTestConnectionCache();
    // decision ① / FR-047: `chrome.scripting` declarative-injection adapter.
    const contentScripts: ContentScriptsApi = {
      registerContentScripts: (scripts) => chrome.scripting.registerContentScripts(scripts),
      unregisterContentScripts: (filter) => chrome.scripting.unregisterContentScripts(filter),
      getRegisteredContentScripts: (filter) => chrome.scripting.getRegisteredContentScripts(filter),
    };

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
      // FR-051 / TASK-029: base-derived browser tools (dom/chrome/wait/extract/
      // export/save/events/web-search). The DOM seam is a remote proxy into the
      // bound tab's content script (`createBrowserDomOps`); file persistence uses
      // the page-context anchor download chain. No new permission.
      browserTools: {
        env: createExtensionBrowserEnv({
          currentTabId: () => controller.get()?.tabId,
          sendDomOp: async (tabId, method, args) => {
            try {
              const res = (await chrome.tabs.sendMessage(
                tabId,
                makeMessage('dom-op', { requestId: requestId('dom'), method, args }),
              )) as PluginResponse<import('@lgdl/web-cli-base').PlatformDomOpResult> | undefined;
              if (!res) return { ok: false, output: '✖ 站点未响应 DOM 操作（content script 未注入或页面已导航）', error: 'dom-no-response' };
              if (!res.ok || !res.data) return { ok: false, output: `✖ ${res.error ?? 'DOM 操作失败'}`, error: res.error ?? 'dom-error' };
              return res.data;
            } catch (err) {
              return {
                ok: false,
                output: `✖ DOM 操作不可达：${err instanceof Error ? err.message : String(err)}（请先绑定并授权站点）`,
                error: 'dom-unreachable',
              };
            }
          },
          sendFileSave: async (tabId, filename, data) => {
            try {
              const res = (await chrome.tabs.sendMessage(
                tabId,
                makeMessage('file-save', { requestId: requestId('save'), filename, data }),
              )) as PluginResponse<{ ok: boolean; error?: string }> | undefined;
              if (!res) return { ok: false, error: '站点未响应文件保存（content script 未注入）' };
              if (!res.ok || !res.data) return { ok: false, error: res.error ?? '文件保存失败' };
              return res.data;
            } catch (err) {
              return { ok: false, error: err instanceof Error ? err.message : String(err) };
            }
          },
          eventRequest: async (op, params) => {
            const tabId = controller.get()?.tabId;
            if (tabId === undefined) return { ok: false, error: '无活跃标签页，无法访问站点事件通道（请先绑定并授权站点）' };
            try {
              const res = (await chrome.tabs.sendMessage(
                tabId,
                makeMessage('site-event', { op, params }),
              )) as PluginResponse<{ ok: boolean; data?: unknown; error?: string }> | undefined;
              if (!res) return { ok: false, error: '站点未响应事件通道请求' };
              if (!res.ok || !res.data) return { ok: false, error: res.error ?? '站点事件通道请求失败' };
              return res.data;
            } catch (err) {
              return { ok: false, error: err instanceof Error ? err.message : String(err) };
            }
          },
        }),
      },
      onAsk: createConfirmBridge({
        currentOrigin: () => controller.get()?.origin,
        audit,
        ask: (question) =>
          new Promise((resolve) => {
            const rid = requestId('confirm');
            pendingConfirmId = rid;
            confirmResponder = (id, allow) => {
              if (id === rid) {
                pendingConfirmId = null;
                resolve({ action: allow ? 'allow' : 'deny' });
              }
            };
            void chrome.runtime.sendMessage(makeMessage('confirm-request', { requestId: rid, question })).catch(() => {
              pendingConfirmId = null;
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
      // FR-049: plugin-level tab tool (available with no site bound/authorized).
      tabs: createTabsDeps({
        getSingletons: () => {
          if (!singletons) throw new Error('后台尚未初始化完成，请稍后重试');
          return singletons;
        },
        origins,
        sessions,
        audit,
      }),
      tabsEnabled: tabsSetting.get(),
      // FR-050 / EC-023: controlled `web-fetch` seam. The pre-flight gate checks
      // the host permission BEFORE fetching (uncovered origins → zero request +
      // readable refusal); same-origin reads prefer the bound tab's page context.
      webFetch: {
        currentOrigin: () => controller.get()?.origin,
        hasHostPermission: (origin) => hasOriginPermission(origin),
        fetchImpl: globalThis.fetch.bind(globalThis),
        fetchViaPage: async (url) => {
          const tabId = controller.get()?.tabId;
          if (tabId === undefined) return { ok: false, error: '当前无绑定标签页，无法走页面上下文读取' };
          try {
            const res = (await chrome.tabs.sendMessage(tabId, makeMessage('fetch-text', { url }))) as
              | PluginResponse<{ ok: boolean; status?: number; text?: string; error?: string }>
              | undefined;
            if (!res) return { ok: false, error: '站点未响应（content script 未注入或页面已导航）' };
            if (!res.ok || !res.data) return { ok: false, error: res.error ?? '页面上下文读取失败' };
            return res.data;
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) };
          }
        },
      },
    });

    // restore runtime session (EC-013)
    try {
      const snap = await sessionKv.get<{ tabId?: number; origin?: string; sessionId?: string; invalidated?: boolean; updatedAt?: number }>(SESSION_STATE_KEY);
      if (snap && snap.tabId !== undefined && snap.origin) {
        controller.restore({
          tabId: snap.tabId,
          origin: snap.origin,
          ...(snap.sessionId ? { sessionId: snap.sessionId } : {}),
          invalidated: snap.invalidated ?? false,
          updatedAt: snap.updatedAt ?? Date.now(),
        });
      }
    } catch (err) {
      console.warn('[web-cli-plugin] session restore failed:', err);
    }

    // decision ② / FR-048: restore the current session's conversation from the
    // multi-session store. A legacy single-history snapshot (CHAT_HISTORY_KEY) is
    // migrated once into the bound origin's session so upgrades lose nothing.
    const chatSession = createChatSession();
    let currentSessionId: string | null = controller.get()?.sessionId ?? null;
    try {
      if (currentSessionId && controller.get()) {
        const origin = controller.get()!.origin;
        const restored = await sessions.activate(origin);
        currentSessionId = restored.session.sessionId;
        controller.setSessionId(currentSessionId);
        chatSession.restore(sessions.historyOf(currentSessionId));
      }
      if (chatSession.size() === 0 && controller.get()) {
        const legacy = await sessionKv.get<ChatTurn[]>(CHAT_HISTORY_KEY);
        if (Array.isArray(legacy) && legacy.length > 0) {
          chatSession.restore(legacy);
          currentSessionId = controller.get()!.sessionId;
          await sessions.setHistory(currentSessionId, chatSession.snapshot());
        }
      }
    } catch (err) {
      console.warn('[web-cli-plugin] chat history restore failed:', err);
    }

    singletons = {
      kv,
      sessionKv,
      audit,
      origins,
      controller,
      host,
      keys,
      chatSession,
      sessions,
      descriptors: new Map(),
      currentSessionId,
      contentScripts,
      askBridge,
      tabsSetting,
      testCache,
    };
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

async function persistChatHistory(s: Singletons, sessionId: string | null = s.currentSessionId): Promise<void> {
  if (!sessionId) return;
  try {
    // decision ② / FR-048: the conversation is persisted **per session**, so
    // origins never cross-contaminate and a return to a session回显 its own history.
    await s.sessions.setHistory(sessionId, s.chatSession.snapshot());
  } catch (err) {
    console.warn('[web-cli-plugin] chat history persist failed:', err);
  }
}

/** Clear the current session conversation (navigation; EC-011). */
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
  // decision ② / FR-048: pin the run to the session it started in, so a session
  // switch mid-run can never misattribute the completed turns.
  const sessionIdAtStart = s.currentSessionId;
  try {
    const settings = await s.keys.load();
    const provider = providerById(settings.providerId);
    // TASK-023: pair each tool's start (onCommandLine) with its result
    // (hooks.onToolDone, fired immediately before onToolOutput) so the side
    // panel can render a tool card with name + status + duration.
    let toolStartedAt = 0;
    let lastTool: { name: string; ok: boolean; ms: number } | null = null;
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
        onCommandLine: (text) => {
          toolStartedAt = Date.now();
          void chrome.runtime.sendMessage(makeMessage('chat-result', { ...commandEvent(text) })).catch(() => {});
        },
        onToolOutput: (text) => {
          const meta = lastTool;
          lastTool = null;
          void chrome.runtime
            .sendMessage(makeMessage('chat-result', { ...toolResultEvent(meta?.name, meta?.ok, meta?.ms, text) }))
            .catch(() => {});
        },
        onLLMError: (message, willRetry) =>
          void chrome.runtime.sendMessage(makeMessage('chat-result', { ...llmErrorEvent(message, willRetry) })).catch(() => {}),
        onFinish: () => void chrome.runtime.sendMessage(makeMessage('chat-result', { variant: 'done' })).catch(() => {}),
      },
      hooks: {
        onToolDone: (tc, result) => {
          lastTool = {
            name: tc.name,
            ok: result.ok,
            ms: Math.max(0, Date.now() - (toolStartedAt || Date.now())),
          };
        },
      },
    });
    void provider.name;
  } finally {
    chatBusy = false;
    await persistChatHistory(s, sessionIdAtStart);
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

/**
 * TASK-020 任务 B: non-sensitive projection of the current active tab. Used by
 * `state` (so the panel can explain "无活跃站点") and `rebind`.
 */
async function activeTabProjection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return projectActiveTab(tab);
  } catch (err) {
    return {
      present: false,
      restricted: true,
      reason: `无法读取当前标签页：${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Origin of an http(s) tab URL, or null when the tab is restricted / unparseable. */
function tabOrigin(url: string | undefined): string | null {
  try {
    const u = new URL(url ?? '');
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
  } catch {
    /* restricted / unparseable */
  }
  return null;
}

/**
 * decision ① / FR-047: ask a tab to identify itself via the content-script
 * `whoami` handshake and auto-bind it. Returns false when the tab has no
 * (authorized) content script — a **silent lookup miss**, not an error.
 */
async function autoBindFromTab(s: Singletons, tabId: number): Promise<boolean> {
  try {
    const res = (await chrome.tabs.sendMessage(tabId, makeMessage('whoami'))) as PluginResponse<{ origin?: string }> | undefined;
    const origin = res?.ok && typeof res.data?.origin === 'string' ? res.data.origin : '';
    if (!origin) return false;
    const cur = s.controller.get();
    if (cur && cur.tabId === tabId && cur.origin === origin) return false;
    await bindOrigin(s, tabId, origin);
    panelNotice = `已自动识别站点 ${origin}（无需点击图标），已切换到对应会话。`;
    return true;
  } catch {
    // Not injected / unauthorized / restricted tab → readable "unbound" fallback
    // is handled by the caller; never log an error (would spam on every switch).
    return false;
  }
}

/**
 * decision ② / FR-048: best-effort locate a tab hosting `origin` via the same
 * `whoami` handshake (no `tabs` permission / `tab.url`). Per-tab misses are silent.
 */
async function findTabForOrigin(origin: string): Promise<number | undefined> {
  let tabs: chrome.tabs.Tab[] = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch {
    return undefined;
  }
  const want = origin.trim().toLowerCase();
  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    try {
      const res = (await chrome.tabs.sendMessage(tab.id, makeMessage('whoami'))) as PluginResponse<{ origin?: string }> | undefined;
      if (res?.ok && typeof res.data?.origin === 'string' && res.data.origin.toLowerCase() === want) return tab.id;
    } catch {
      /* not injected / unauthorized — silent miss */
    }
  }
  return undefined;
}

/**
 * FR-049 (author decision ③): the plugin-level `tabs` tool deps.
 *
 * `switch` reuses the existing bind chain (`bindTab` = origin from URL →
 * `ensureContentScript` → `bindOrigin` → session switch) so switching a tab
 * adopts that origin's session exactly like an automatic handshake. `open`
 * creates the tab then best-effort adopts the session; the injected content
 * script's `hello` completes discovery once the page loads. All failures return
 * a readable receipt (never silent). `close` is intentionally not implemented.
 */
function createTabsDeps(deps: {
  getSingletons: () => Singletons;
  origins: OriginStore;
  sessions: SessionStore;
  audit: PluginAuditSink;
}): TabsToolDeps {
  return {
    listTabs: async () => {
      const tabs = await chrome.tabs.query({});
      const out = [];
      for (const t of tabs) {
        if (t.id === undefined) continue;
        out.push({
          id: t.id,
          ...(t.title ? { title: t.title } : {}),
          ...(t.url ? { url: t.url } : {}),
          active: t.active === true,
        });
      }
      return out;
    },
    isAuthorized: (origin) => deps.origins.isAuthorized(origin),
    sessionIdForOrigin: (origin) => deps.sessions.sessionIdForOrigin(origin),
    switchToTab: async (tab) => {
      const s = deps.getSingletons();
      try {
        await chrome.tabs.update(tab.id, { active: true });
      } catch (err) {
        return {
          ok: false,
          output: `✖ 无法激活标签页 [${tab.id}]：${err instanceof Error ? err.message : String(err)}`,
          error: 'tabs-activate-failed',
          tabId: tab.id,
        };
      }
      // Prefer the existing `whoami` auto-detection handshake (ADR-014) so a tab
      // that already has the content script binds exactly like a tab switch; fall
      // back to the shared `bindTab` binder when the page is not injected yet
      // (e.g. a page that refused to load). Both paths adopt the origin session.
      const autoBound = await autoBindFromTab(s, tab.id);
      let origin: string | undefined;
      if (autoBound) {
        origin = s.controller.get()?.origin;
      } else {
        const bound = await bindTab(s, tab.id, tab.url);
        if (!bound.ok) {
          return {
            ok: false,
            output: `✖ 已激活标签页 [${tab.id}]，但未能绑定站点：${bound.reason}`,
            error: 'tabs-bind-failed',
            tabId: tab.id,
          };
        }
        origin = bound.origin;
      }
      const sessionId = s.currentSessionId ?? origin;
      return {
        ok: true,
        output: `✓ 已切到 ${origin}（会话：${sessionId}）`,
        ...(origin ? { origin } : {}),
        ...(sessionId ? { sessionId } : {}),
        tabId: tab.id,
      };
    },
    openTab: async (url) => {
      const s = deps.getSingletons();
      let created: chrome.tabs.Tab;
      try {
        created = await chrome.tabs.create({ url });
      } catch (err) {
        return {
          ok: false,
          output: `✖ 打开标签页失败：${err instanceof Error ? err.message : String(err)}`,
          error: 'tabs-create-failed',
        };
      }
      const origin = tabOrigin(url);
      const tabId = created.id;
      let sessionId: string | undefined;
      let injected = false;
      if (tabId !== undefined && origin) {
        try {
          await bindOrigin(s, tabId, origin);
          injected = await ensureContentScript(tabId);
          sessionId = s.currentSessionId ?? origin;
        } catch (err) {
          return {
            ok: true,
            output: `✓ 已打开 ${url}，但自动绑定未完成：${err instanceof Error ? err.message : String(err)}（可稍后点插件图标，或用 tabs switch 重试）`,
            origin,
            tabId,
          };
        }
      }
      const tail = origin && !injected ? '；页面尚未加载完成，注入/发现将在加载后自动完成' : '';
      return {
        ok: true,
        output: `✓ 已打开 ${url}${sessionId ? `（会话：${sessionId}）` : ''}${tail}`,
        ...(origin ? { origin } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(tabId !== undefined ? { tabId } : {}),
      };
    },
    audit: deps.audit,
  };
}

/**
 * decision ① / FR-047: startup reconciliation. Read the desired set (authorized
 * **and** host-permission-granted origins) and reconcile against the registered
 * declarative scripts — **补齐缺失、清理已撤销**. All failures are audited +
 * logged readably (never silent).
 */
async function reconcileContentScripts(s: Singletons): Promise<void> {
  const desired: string[] = [];
  try {
    for (const rec of await s.origins.list()) {
      if (!rec.authorized) continue;
      if (await hasOriginPermission(rec.origin)) desired.push(rec.origin);
    }
  } catch (err) {
    const reason = `读取已授权站点失败：${err instanceof Error ? err.message : String(err)}`;
    console.warn('[web-cli-plugin] content-script reconcile failed:', reason);
    return;
  }
  const report = await reconcileSiteContentScripts(s.contentScripts, desired);
  for (const origin of report.registered) {
    s.audit.recordPlugin({ type: 'host-permission', ts: Date.now(), origin, decision: 'granted', reason: '启动对账：补齐缺失的声明式注入' });
  }
  for (const origin of report.removed) {
    s.audit.recordPlugin({ type: 'host-permission', ts: Date.now(), origin, decision: 'revoked', reason: '启动对账：清理已撤销的声明式注入' });
  }
  for (const f of report.failures) {
    console.warn(`[web-cli-plugin] content-script reconcile ${f.action} ${f.origin} failed: ${f.reason}`);
    s.audit.recordPlugin({
      type: 'host-permission',
      ts: Date.now(),
      origin: f.origin,
      decision: f.action === 'register' ? 'granted' : 'revoked',
      reason: `声明式注入对账失败：${f.reason}`,
    });
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
      // decision ② / FR-048: also project the current multi-session (label/origins).
      const sessionView: SessionView | null = session
        ? await (async () => {
            const rec = s.sessions.find(session.sessionId) ?? (await s.sessions.activate(session.origin)).session;
            return {
              sessionId: rec.sessionId,
              label: sessionLabel(rec),
              origins: [...rec.origins],
              authorized: await s.origins.isAuthorized(session.origin),
            };
          })()
        : null;
      const payload = await buildStateMessage({
        active: session
          ? {
              tabId: session.tabId,
              origin: session.origin,
              discoveryState: session.discoveryState,
              ...(session.discoveryReason ? { discoveryReason: session.discoveryReason } : {}),
              invalidated: session.invalidated,
            }
          : null,
        tools: s.host.deriveTools().map((t) => t.name),
        isAuthorized: (origin) => s.origins.isAuthorized(origin),
        // TASK-023: trust is a separate read-only display concern (FR-012).
        trustOf: (origin) => s.origins.trustOf(origin),
        tab: await activeTabProjection(),
        session: sessionView,
      });
      // D-064: carry (and consume) the one-shot readable notice.
      return okResponse({ ...payload, panelNotice: takePanelNotice() });
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
      // decision ① / FR-047: authorization is the ONE-TIME gate. Once the host
      // permission is actually granted we register the declarative content script
      // so every later navigation of this origin auto-loads and auto-binds — no
      // icon click. Registration failure is readably surfaced (never silent) and
      // does not undo the authorization (activeTab fallback still works).
      let contentScript:
        | { ok: boolean; id?: string; pattern?: string; reason?: string; alreadyRegistered?: boolean }
        | undefined;
      if (granted) {
        contentScript = await registerSiteContentScript(s.contentScripts, origin);
        if (!contentScript.ok) {
          console.warn('[web-cli-plugin] declarative content script register failed:', contentScript.reason);
          s.audit.recordPlugin({
            type: 'host-permission',
            ts: Date.now(),
            origin,
            decision: 'granted',
            reason: `授权成功但声明式注入注册失败：${contentScript.reason ?? '未知原因'}`,
          });
        }
      } else {
        contentScript = {
          ok: false,
          reason: '未获得持久站点权限（回退 activeTab）：无法声明式注入，仍可点击插件图标按需注入',
        };
      }
      return okResponse({ ...rec, hostPermissionGranted: granted, contentScript });
    }
    case 'revoke': {
      const origin = typeof message.origin === 'string' ? message.origin : '';
      if (!origin) return errorResponse('revoke 需要 origin');
      // EC-008 / FR-006: user-initiated revocation also drops the optional host
      // permission (best-effort, readable). The plugin keeps working via
      // activeTab / page-source discovery — authorization loss never silently
      // disables unrelated capabilities.
      // decision ① / FR-047: unregister the declarative content script (best-effort,
      // readable回执) so a revoked origin stops auto-injecting.
      const contentScript = await unregisterSiteContentScript(s.contentScripts, origin);
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
      return okResponse({ revoked, hostPermissionRemoved, contentScript });
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
      // ADR-012 + decision ②: a content script reporting discovery from a tab
      // binds that tab and adopts the origin's session when it differs. Additive;
      // the action-click path is unchanged.
      const senderTabId = sender?.tab?.id;
      if (senderTabId !== undefined) {
        const cur = s.controller.get();
        if (!cur || cur.tabId !== senderTabId || cur.origin !== origin) {
          await bindOrigin(s, senderTabId, origin);
        }
      }
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
        s.descriptors.set(origin, normalized);
        s.host.activateSite(normalized, origin);
        s.audit.recordPlugin(discoveryAuditEvent(origin, normalized));
      } else {
        // TASK-019 任务 B: honour the content script's reported three-state result
        // (`unsupported` = definitively not declared; `unknown` = present-but-
        // invalid / version mismatch / transient). Previously any non-supported
        // report collapsed to `unsupported`, so the panel could never explain a
        // failed probe. The readable reason is persisted for the panel notice.
        const reported = message.state;
        const state =
          reported === 'unknown' || reported === 'unsupported' || reported === 'supported'
            ? reported
            : 'unsupported';
        const reason = typeof message.reason === 'string' && message.reason.trim() ? message.reason.trim() : undefined;
        s.controller.setDiscovery(state, undefined, reason);
        s.descriptors.delete(origin);
        s.host.deactivateSite();
        s.audit.recordPlugin(discoveryAuditEvent(origin, undefined));
      }
      await persistSession(s);
      return okResponse({ origin, tools: s.host.registeredSiteTools() });
    }
    case 'hello': {
      // decision ① / FR-047: proactive auto-handshake. Under declarative injection
      // the content script announces `location.origin` on load; the background
      // binds the sender tab automatically — no `tab.url`, no `tabs` permission,
      // no user gesture. Auto-detection is NOT auto-authorization: execution is
      // still gated by `OriginStore` (fail-closed), unchanged.
      const origin = typeof message.origin === 'string' ? message.origin : '';
      const senderTabId = sender?.tab?.id;
      if (!origin || senderTabId === undefined) return okResponse({ bound: false });
      const cur = s.controller.get();
      if (cur && cur.tabId === senderTabId && cur.origin === origin) return okResponse({ bound: true, origin });
      await bindOrigin(s, senderTabId, origin);
      return okResponse({ bound: true, origin });
    }
    case 'sessions': {
      // decision ② / FR-048: the panel's session switcher view. Re-read storage so
      // external writes (options page / another context) are reflected. The current
      // session's conversation is returned for回显 (never another session's).
      await s.sessions.load();
      const current = s.currentSessionId;
      return okResponse({
        currentSessionId: current,
        sessions: s.sessions.list().map((rec) => ({
          sessionId: rec.sessionId,
          label: sessionLabel(rec),
          origins: [...rec.origins],
          lastActiveAt: rec.lastActiveAt,
          grouped: rec.sessionId.startsWith('group:'),
        })),
        groups: s.sessions.groups(),
        history: current ? projectHistory(s.sessions.historyOf(current)) : [],
      });
    }
    case 'session-switch': {
      // decision ② / FR-048: user-selected session. Best-effort focus the tab that
      // hosts the session's origin (found via the same `whoami` handshake — no
      // `tabs` permission needed); the logical switch always succeeds.
      const sessionId = typeof message.sessionId === 'string' ? message.sessionId : '';
      if (!sessionId) return errorResponse('session-switch 需要 sessionId');
      await s.sessions.load();
      const target = s.sessions.find(sessionId);
      if (!target) return errorResponse(`会话不存在：${sessionId}`);
      const origin = target.origins[0];
      if (origin) {
        const tabId = await findTabForOrigin(origin);
        if (tabId !== undefined) {
          try {
            await chrome.tabs.update(tabId, { active: true });
          } catch {
            /* readable no-op: focus is best-effort */
          }
        }
      }
      await switchSession(s, sessionId);
      return okResponse({
        sessionId,
        history: projectHistory(s.sessions.historyOf(sessionId)),
      });
    }
    case 'session-group': {
      // decision ② / FR-048: group management (create / add origin / remove / delete).
      // Grouping is a **conversation-sharing** configuration, never an authorization
      // (per-origin `OriginStore` unchanged; must be stated in the UI copy).
      await s.sessions.load();
      const action = typeof message.action === 'string' ? message.action : '';
      const origin = typeof message.origin === 'string' ? message.origin : '';
      const groupId = typeof message.groupId === 'string' ? message.groupId : '';
      const name = typeof message.name === 'string' ? message.name : '';
      let detail: Record<string, unknown> = {};
      if (action === 'create') {
        if (!name.trim()) return errorResponse('新建分组需要名称');
        detail = { group: await s.sessions.createGroup(name) };
      } else if (action === 'add') {
        if (!groupId || !origin) return errorResponse('加入分组需要 groupId 与 origin');
        const res = await s.sessions.addOriginToGroup(groupId, origin);
        detail = { group: res.group, sessionId: res.session.sessionId, evicted: res.evicted };
        if (res.session.sessionId === s.currentSessionId) await switchSession(s, res.session.sessionId);
      } else if (action === 'remove') {
        if (!origin) return errorResponse('移出分组需要 origin');
        detail = await s.sessions.removeOrigin(origin);
        // The removed origin resolves back to its own session.
        const sid = s.sessions.sessionIdForOrigin(origin);
        if (s.controller.get()?.origin === origin && sid !== s.currentSessionId) await switchSession(s, sid);
      } else if (action === 'delete') {
        if (!groupId) return errorResponse('删除分组需要 groupId');
        detail = await s.sessions.deleteGroup(groupId);
      } else {
        return errorResponse(`未知的分组操作：${action}`);
      }
      await s.sessions.load();
      return okResponse({
        ...detail,
        currentSessionId: s.currentSessionId,
        sessions: s.sessions.list().map((rec) => ({
          sessionId: rec.sessionId,
          label: sessionLabel(rec),
          origins: [...rec.origins],
          lastActiveAt: rec.lastActiveAt,
          grouped: rec.sessionId.startsWith('group:'),
        })),
        groups: s.sessions.groups(),
      });
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
    case 'tabs-setting': {
      // FR-049: options-page privacy switch. `get` reports the current state;
      // `set` persists + applies it so `tabs` leaves/enters the LLM tool surface.
      // Applied readably (never silent).
      const action = message.action === 'set' ? 'set' : 'get';
      if (action === 'get') {
        return okResponse({ enabled: s.tabsSetting.get(), tools: s.host.deriveTools().map((t) => t.name) });
      }
      if (typeof message.enabled !== 'boolean') {
        return errorResponse('tabs-setting 的 set 操作需要 enabled:boolean');
      }
      await s.tabsSetting.save(message.enabled);
      s.host.setTabsEnabled(message.enabled);
      s.audit.recordPlugin({
        type: 'tabs',
        ts: Date.now(),
        tool: 'tabs',
        decision: message.enabled ? 'enabled' : 'disabled',
        detail: message.enabled
          ? '用户开启「允许助手查看/切换标签页」：tabs 工具进入 LLM 工具面'
          : '用户关闭「允许助手查看/切换标签页」：tabs 工具从 LLM 工具面移除（不静默，回执含当前工具面）',
      });
      return okResponse({ enabled: s.tabsSetting.get(), tools: s.host.deriveTools().map((t) => t.name) });
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
    case 'llm-test': {
      // User-requested connectivity test: one minimal real request using the
      // CURRENT form values (an unsaved key is allowed so the user can verify
      // before saving). The plaintext key never leaves this background request
      // and is never written to logs or the audit trail; only the readable,
      // status-classified result is returned.
      const requestedProviderId = typeof message.providerId === 'string' ? message.providerId : '';
      const requestedKey = typeof message.apiKey === 'string' ? message.apiKey : '';
      let providerId = requestedProviderId;
      let apiKey = requestedKey;
      let model = typeof message.model === 'string' ? message.model : undefined;
      let baseURL = typeof message.baseURL === 'string' ? message.baseURL : undefined;
      if (!apiKey.trim()) {
        // TASK-020 任务 D: side-panel entry has no key field → fall back to the
        // stored config for the active/requested provider. The key is read here in
        // the background only and is never returned / logged / audited.
        const stored = await s.keys.load();
        providerId = requestedProviderId || stored.providerId;
        apiKey = stored.apiKey;
        if (!model) model = stored.model;
        if (baseURL === undefined) baseURL = stored.baseURL;
      }
      // TASK-028: a 60s TTL cache keyed by a non-reversible config fingerprint
      // (provider + model + baseURL + key). The side panel auto-tests once per
      // load, so this stops repeated re-tests within the TTL while a config
      // change (or TTL expiry) invalidates the slot and re-runs a real ping.
      // The fingerprint / key are compared in memory only — never persisted,
      // logged or audited.
      const fingerprint = llmConfigFingerprint({ providerId, model, baseURL, apiKey });
      const cached = s.testCache.get(fingerprint);
      if (cached) return okResponse(cached);
      const result = await testLlmConnection(
        {
          providerId,
          apiKey,
          ...(model ? { model } : {}),
          ...(baseURL ? { baseURL } : {}),
        },
        providerChat,
      );
      s.testCache.set(fingerprint, result);
      return okResponse(result);
    }
    case 'diag': {
      // TASK-019 任务 C: options-page diagnostics. Returns only non-sensitive
      // fields (SW version/build, active origin, authorized origin list) — never
      // the API key. `options` owns manifest/build-stamp; the SW authoritative
      // view is returned here for cross-context comparison.
      const session = s.controller.get();
      return okResponse(
        await buildDiagMessage({
          version: chrome.runtime.getManifest().version,
          buildStamp: BUILD_STAMP,
          swStartedAt: SW_STARTED_AT,
          activeOrigin: session?.origin ?? null,
          discoveryState: session?.discoveryState ?? null,
          listOrigins: () => s.origins.list(),
        }),
      );
    }
    case 'reprobe': {
      // TASK-019 任务 B: explicit re-probe of the bound site (side panel
      // 「重新探测」). Re-injects the content script when needed and asks it to
      // re-run discovery; the fresh result is reported to the background via the
      // normal `discover` message (controller/state stay authoritative) and
      // returned to the caller for immediate rendering. Readable failure.
      const tabId = s.controller.get()?.tabId;
      if (tabId === undefined) {
        return errorResponse('无活跃站点，无法重新探测（请先打开目标站点并点击插件图标绑定）');
      }
      const injected = await ensureContentScript(tabId);
      if (!injected) {
        return errorResponse('无法在目标页面注入探测脚本（可能是 chrome:// / 扩展商店等受限页面）');
      }
      try {
        const res = (await chrome.tabs.sendMessage(tabId, makeMessage('reprobe'))) as PluginResponse | undefined;
        return res ?? errorResponse('站点未响应重新探测请求（页面可能已导航）');
      } catch (err) {
        return errorResponse(`重新探测失败：${err instanceof Error ? err.message : String(err)}`);
      }
    }
    case 'rebind': {
      // TASK-020 任务 B: side-panel「重新绑定当前标签页」. Reuses the same bind
      // semantics as the action-click path (`chrome.action.onClicked`), but from
      // inside the panel with a readable failure reason. Restricted / missing
      // tabs fail readably (never silently).
      //
      // D-064: without `tabs` / a host grant this path cannot read `tab.url`, so
      // the failure copy must point at the icon click (the only place Chrome
      // hands the tab URL to the extension).
      let tab: chrome.tabs.Tab | undefined;
      try {
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      } catch (err) {
        return errorResponse(`无法读取当前标签页：${err instanceof Error ? err.message : String(err)}`);
      }
      if (tab?.id === undefined) {
        return errorResponse('没有可绑定的标签页：请先打开目标站点标签页，再点插件图标或本按钮。');
      }
      const bound = await bindTab(s, tab.id, tab.url);
      if (!bound.ok) {
        return errorResponse(
          `当前标签页不可绑定：${bound.reason}。\n` +
            '绑定的唯一触发点 = 在目标站点标签页点击浏览器工具栏的插件图标（点击时 Chrome 才会把该标签页地址交给插件）。',
        );
      }
      return okResponse({ origin: bound.origin, tabId: tab.id, contentInjected: bound.injected });
    }
    case 'confirm-response': {
      const rid = typeof message.requestId === 'string' ? message.requestId : '';
      confirmResponder?.(rid, message.allow === true);
      confirmResponder = null;
      pendingConfirmId = null;
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

// D-064: disable the "click toggles the panel" behavior so `action.onClicked`
// fires and the icon click can *bind* the tab. Applied on every SW start (not
// only onInstalled) so a stale profile upgraded from ≤0.8 is repaired too.
void configureSidePanelBehavior();

// EC-008 / FR-006: an externally revoked optional host permission (browser
// extension page) is audited readably. The OriginStore authorization and the
// page-source discovery path are unaffected (no silent capability loss).
// decision ① / FR-047: also reconcile so the declarative registration is cleaned.
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
    await reconcileContentScripts(s);
  })();
});

// decision ① / FR-047: an externally granted optional host permission (e.g. via
// the browser's site-access UI) is reconciled into a declarative registration.
chrome.permissions.onAdded.addListener((permissions) => {
  void (async () => {
    if (!(permissions.origins ?? []).length) return;
    const s = await init();
    await reconcileContentScripts(s);
  })();
});

// decision ① / FR-047: install/update triggers a full reconciliation so an
// upgraded profile (authorized before this build) immediately gets automatic
// injection — no icon click needed after the one-time authorization.
chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    const s = await init();
    await reconcileContentScripts(s);
  })();
});

// D-064: the toolbar icon click remains a bind trigger (for sites the user has
// not authorized yet). decision ① keeps this path unchanged.
//
// ① `chrome.sidePanel.open` must run synchronously inside this gesture, so it is
//    kicked off (not awaited) before any other async work.
// ② The tab object handed to `onClicked` carries `url` because the click *is* a
//    user gesture — no `tabs` permission is required, honoring least privilege.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  const tabId = tab.id;
  const opening = openSidePanel(tabId);
  void (async () => {
    const s = await init();
    const bound = await bindTab(s, tabId, tab.url);
    panelNotice = bound.ok
      ? bound.injected
        ? `✓ 已绑定站点 ${bound.origin}，正在发现 web-cli 声明。`
        : `已绑定 ${bound.origin}，但页面脚本注入失败（页面可能受限或尚未加载完成）；请刷新页面后在「重新探测」。`
      : `当前标签页不可绑定：${bound.reason}。请在目标站点标签页点击插件图标。`;
    await opening;
  })();
});

// decision ① / FR-047: tab switch tries the automatic handshake first. If the
// newly active tab has our content script (declaratively injected → the site was
// authorized once), it reports its origin and we auto-bind + adopt its session —
// no icon click, no `tabs` permission. If not (unauthorized / restricted), it
// degrades **silently** to the existing readable "unbound" prompt (never an error
// log, never a misleading failure).
chrome.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    const s = await init();
    const session = s.controller.get();
    if (!session) return;
    // The bound tab is active again → nothing to do.
    if (session.tabId === activeInfo.tabId) return;
    if (await autoBindFromTab(s, activeInfo.tabId)) return;
    if (session.invalidated) return;
    s.controller.markStale();
    panelNotice =
      '已切换标签页：当前标签页尚未授权/未注入，原绑定站点已标记失效。请在目标站点标签页点击插件工具栏图标' +
      '（或先在侧栏「授权当前站点」，之后该站点将自动注入、无需再点图标）。';
    await persistSession(s);
  })();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  void (async () => {
    const s = await init();
    const session = s.controller.get();
    if (session && session.tabId === tabId) {
      s.controller.markNavigated();
      s.descriptors.delete(session.origin);
      s.host.deactivateSite();
      // EC-011: whole-page navigation invalidates the conversation (no silent continuation).
      await resetChatSession(s);
      await persistSession(s);
    }
  })();
});

// ADR-012 / EC-011: closing the bound tab clears the active binding so a stale
// tabId can never be reused for a different page. decision ②: the **session**
// (and its conversation history) is domain-scoped and is retained; both are
// recoverable when the origin is opened again.
chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const s = await init();
    if (s.controller.get()?.tabId === tabId) {
      s.controller.clear();
      s.host.deactivateSite();
      await persistSession(s);
    }
  })();
});

void (async () => {
  const s = await init();
  // decision ① / FR-047: startup reconciliation (补齐缺失 / 清理已撤销).
  await reconcileContentScripts(s);
})();
