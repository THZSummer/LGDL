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
import { buildStateMessage, projectActiveTab } from './state-message.js';
import { buildDiagMessage } from './diag-message.js';
import { BUILD_STAMP } from '../build-info.js';
import { createWebCliHost, type WebCliHost } from './host.js';
import { createAskBridge, type AskBridge } from './ask-bridge.js';
import { CHAT_HISTORY_KEY, createChatSession, type ChatSession } from './chat-session.js';
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

const SESSION_STATE_KEY = 'session-state';
/** TASK-019: SW 本次启动时间（诊断面板「SW 连通性」详情）。 */
const SW_STARTED_AT = Date.now();
const SYSTEM_PROMPT =
  'You are the web-cli plugin assistant. Use the available tools to operate on the ' +
  'currently authorized website. Tools named "site_*" are declared by the site ' +
  'and run in the page via RPC (the original site id is preserved for dispatch). ' +
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
 * Binding path shared by the toolbar-icon click and the panel「重新绑定」:
 * inject the content script, bind the controller, reset the conversation on an
 * origin switch. Never throws; a readable reason is returned on failure.
 */
async function bindTab(
  s: Singletons,
  tabId: number,
  url: string | undefined,
): Promise<{ ok: true; origin: string; injected: boolean } | { ok: false; reason: string }> {
  const origin = tabOrigin(url);
  if (!origin) return { ok: false, reason: projectActiveTab({ url }).reason ?? '不是可注入的 http(s) 站点' };
  const injected = await ensureContentScript(tabId);
  const prevOrigin = s.controller.get()?.origin;
  s.controller.bindTab(tabId, origin);
  if (prevOrigin && prevOrigin !== origin) await resetChatSession(s);
  await persistSession(s);
  return { ok: true, origin, injected };
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

async function handleMessage(message: PluginMessage, sender?: chrome.runtime.MessageSender): Promise<PluginResponse> {
  const s = await init();
  switch (message.kind) {
    case 'ping':
      return okResponse('pong');
    case 'state': {
      const session = s.controller.get();
      // W1: report the bound origin's persisted authorization so a side-panel
      // reload / SW restart never falls back to a false "未授权" (no origin → false).
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
      const result = await testLlmConnection(
        {
          providerId,
          apiKey,
          ...(model ? { model } : {}),
          ...(baseURL ? { baseURL } : {}),
        },
        providerChat,
      );
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

// D-064: the toolbar icon click is the ONE bind trigger.
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

// D-065: switching away from the bound tab marks the session stale (readable
// prompt) instead of silently keeping a background binding. Without the `tabs`
// permission `onActivated` cannot read the new tab's URL, so only the tabId is
// compared — that must never throw.
chrome.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    const s = await init();
    const session = s.controller.get();
    if (!session) return;
    // The bound tab is active again → nothing to do.
    if (session.tabId === activeInfo.tabId) return;
    if (session.invalidated) return;
    s.controller.markStale();
    panelNotice = '已切换标签页：原绑定站点已标记失效。请在新标签页点击浏览器工具栏的插件图标重新绑定。';
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
