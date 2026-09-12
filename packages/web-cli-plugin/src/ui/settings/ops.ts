/**
 * Settings operations — the single shared implementation of every settings
 * action (TASK-033).
 *
 * Both surfaces run through this module:
 *  - the side panel's in-panel settings view (`panel.ts`) — the primary path;
 *  - the fallback `options.html` page (`options.ts`).
 *
 * Every call goes over the **existing** message protocol (`llm-test`,
 * `tabs-setting`, `auto-auth`, `sessions`, `session-group`, `diag`,
 * `llm-status`) and the existing key store — no new permissions, no new
 * channels, no new dependencies. Dependencies are injected (`transport`,
 * `store`, env guard) so the whole module is node-testable with a fake
 * transport and can never reach a real `chrome` global by accident.
 */
import { makeMessage, type PluginMessage, type PluginResponse } from '../../background/messaging.js';
import { providerById } from '../../llm/providers.js';
import type { KeyStore, LlmSettings } from '../../llm/key-store.js';
import type { LlmStatusSummary } from '../../llm/status.js';
import type { TestConnectionResult } from '../../llm/test-connection.js';
import type { DiagMessagePayload } from '../../background/diag-message.js';
import type { EnvGuardResult } from '../../platform/env-guard.js';
import {
  buildReport,
  extensionItem,
  llmItem,
  originsItem,
  storageItem,
  swItem,
  versionItem,
  type DiagItem,
  type DiagReport,
  type DiagStatus,
} from './diagnostics.js';
import { tabsSettingStatus, autoAuthRows, type AutoAuthRecordView } from './view.js';
import type { SessionGroupView } from './view.js';

/** Minimal transport shape (a real `chrome.runtime.sendMessage` satisfies it). */
export interface SettingsTransport {
  send<T = unknown>(msg: PluginMessage): Promise<PluginResponse<T>>;
}

export interface SettingsOpsDeps {
  env: EnvGuardResult;
  transport: SettingsTransport;
  store: KeyStore;
  /** Injected build stamp (never read from `chrome` here). */
  buildStamp: string;
  manifestVersion: () => string;
  /** Real `chrome.storage.local` round-trip probe; only called in-extension. */
  probeStorage?: () => Promise<{ status: DiagStatus; detail: string }>;
  now?: () => number;
}

export type OpMessageKind = 'ok' | 'warn' | 'err' | '';

/** Uniform result every surface renders identically. */
export interface OpResult<T = unknown> {
  ok: boolean;
  kind: OpMessageKind;
  text: string;
  data?: T;
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface LlmFormView {
  providerId: string;
  model: string;
  baseURL: string;
  maxRounds: number;
  hasKey: boolean;
  apiKeyPlaceholder: string;
}

export interface SaveLlmInput {
  providerId: string;
  apiKey: string;
  model: string;
  baseURL: string;
  maxRounds: string | number;
}

export interface TestLlmInput {
  providerId: string;
  /** Typed-but-unsaved key; empty → the stored key is used. */
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export interface SettingsOps {
  loadLlm(): Promise<OpResult<LlmFormView>>;
  saveLlm(input: SaveLlmInput): Promise<OpResult<{ providerName: string; model: string }>>;
  testConnection(input: TestLlmInput): Promise<OpResult<TestConnectionResult>>;
  clearLlm(): Promise<OpResult>;
  loadLlmStatus(): Promise<OpResult<LlmStatusSummary>>;
  loadTabsSetting(): Promise<OpResult<{ enabled: boolean; tools?: string[] }>>;
  setTabsSetting(enabled: boolean): Promise<OpResult<{ enabled: boolean; tools?: string[] }>>;
  loadAutoAuth(): Promise<OpResult<AutoAuthRecordView[]>>;
  setAutoAuth(origin: string, tier: 'read' | 'write', enabled: boolean): Promise<OpResult<AutoAuthRecordView[]>>;
  clearAutoAuth(origin: string): Promise<OpResult<AutoAuthRecordView[]>>;
  loadSessions(): Promise<OpResult<{ currentSessionId: string | null; groups: SessionGroupView[] }>>;
  groupAction(payload: Record<string, unknown>): Promise<OpResult<SessionGroupView[]>>;
  runDiagnostics(): Promise<DiagReport>;
}

export function createSettingsOps(deps: SettingsOpsDeps): SettingsOps {
  const now = deps.now ?? (() => Date.now());
  const send = <T>(msg: PluginMessage): Promise<PluginResponse<T>> => deps.transport.send<T>(msg);

  const notExtension = <T = unknown>(): OpResult<T> => ({ ok: false, kind: 'err', text: `✖ ${deps.env.banner}` });

  return {
    async loadLlm() {
      if (!deps.env.inExtension) return notExtension();
      try {
        const cfg = await deps.store.load();
        return {
          ok: true,
          kind: '',
          text: '',
          data: {
            providerId: cfg.providerId,
            model: cfg.model,
            baseURL: cfg.baseURL ?? '',
            maxRounds: cfg.maxRounds ?? 0,
            hasKey: cfg.apiKey.length > 0,
            apiKeyPlaceholder: '',
          },
        };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 读取配置失败：${errText(err)}` };
      }
    },

    async saveLlm(input) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const provider = providerById(input.providerId);
        const existing = await deps.store.loadProvider(provider.id);
        const key = input.apiKey.trim() || existing.apiKey;
        if (!key) {
          return {
            ok: false,
            kind: 'warn',
            text: `⚠ 未保存：未填写 ${provider.name} 的 API Key，且该厂商尚无已保存的 Key。请填入 Key 后重试。`,
          };
        }
        const model = input.model.trim() || provider.defaultModel;
        const maxRounds = Number(input.maxRounds);
        await deps.store.save({
          providerId: provider.id,
          apiKey: key,
          model,
          baseURL: input.baseURL,
          ...(Number.isFinite(maxRounds) && maxRounds > 0 ? { maxRounds } : {}),
        });
        return {
          ok: true,
          kind: 'ok',
          text: `✓ 已保存：${provider.name} · ${model} · Key ✅ 已写入（chrome.storage.local，不回显）`,
          data: { providerName: provider.name, model },
        };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 保存失败：${errText(err)}` };
      }
    },

    async testConnection(input) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const provider = providerById(input.providerId);
        const stored = await deps.store.loadProvider(provider.id);
        const apiKey = (input.apiKey ?? '').trim() || stored.apiKey;
        if (!apiKey) {
          return { ok: false, kind: 'warn', text: `⚠ 请先填写 ${provider.name} 的 API Key 再测试连接。` };
        }
        // The key is only a request parameter to the background — never logged,
        // never echoed, and never written into the DOM.
        const res = await send<TestConnectionResult>(
          makeMessage('llm-test', {
            providerId: provider.id,
            apiKey,
            model: (input.model ?? '').trim() || stored.model || provider.defaultModel,
            baseURL: (input.baseURL ?? '').trim() || stored.baseURL || '',
          }),
        );
        if (!res.ok || !res.data) {
          return { ok: false, kind: 'err', text: `✖ 测试连接失败：${res.error ?? '后台无响应'}` };
        }
        return { ok: res.data.ok, kind: res.data.ok ? 'ok' : 'err', text: res.data.message, data: res.data };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 测试连接失败：${errText(err)}` };
      }
    },

    async clearLlm() {
      if (!deps.env.inExtension) return notExtension();
      try {
        await deps.store.clear();
        return { ok: true, kind: '', text: '已清除本插件全部配置（含已保存的 API Key）。' };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 清除失败：${errText(err)}` };
      }
    },

    async loadLlmStatus() {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<LlmStatusSummary>(makeMessage('llm-status'));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 读取 LLM 状态失败：${res.error ?? '后台无响应'}` };
        return { ok: true, kind: '', text: '', data: res.data };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 读取 LLM 状态失败：${errText(err)}` };
      }
    },

    async loadTabsSetting() {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<{ enabled?: boolean; tools?: string[] }>(makeMessage('tabs-setting', { action: 'get' }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 读取标签页管理开关失败：${res.error ?? '后台无响应'}` };
        const enabled = res.data.enabled !== false;
        return { ok: true, kind: '', text: tabsSettingStatus(enabled, res.data.tools), data: { enabled, tools: res.data.tools } };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 读取标签页管理开关失败：${errText(err)}` };
      }
    },

    async setTabsSetting(enabled) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<{ enabled?: boolean; tools?: string[] }>(makeMessage('tabs-setting', { action: 'set', enabled }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 保存标签页管理开关失败：${res.error ?? '后台无响应'}` };
        const nextEnabled = res.data.enabled !== false;
        return { ok: true, kind: '', text: tabsSettingStatus(nextEnabled, res.data.tools), data: { enabled: nextEnabled, tools: res.data.tools } };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 保存标签页管理开关失败：${errText(err)}` };
      }
    },

    async loadAutoAuth() {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<{ origins?: AutoAuthRecordView[] }>(makeMessage('auto-auth', { action: 'get' }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 读取自动授权失败：${res.error ?? '后台无响应'}` };
        const rows = autoAuthRows(res.data.origins);
        return { ok: true, kind: '', text: '', data: rows };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 读取自动授权失败：${errText(err)}` };
      }
    },

    async setAutoAuth(origin, tier, enabled) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<{ origins?: AutoAuthRecordView[] }>(makeMessage('auto-auth', { action: 'set', origin, tier, enabled }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 保存自动授权失败：${res.error ?? '后台无响应'}` };
        const rows = autoAuthRows(res.data.origins);
        const tierLabel = tier === 'read' ? '读操作自动' : '写操作自动';
        return { ok: true, kind: '', text: `已${enabled ? '开启' : '关闭'} ${origin} 的「${tierLabel}」；立即生效。`, data: rows };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 保存自动授权失败：${errText(err)}` };
      }
    },

    async clearAutoAuth(origin) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<{ origins?: AutoAuthRecordView[] }>(makeMessage('auto-auth', { action: 'clear', origin }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 关闭自动授权失败：${res.error ?? '后台无响应'}` };
        return { ok: true, kind: '', text: `已关闭 ${origin} 的自动授权（读/写都关）。`, data: autoAuthRows(res.data.origins) };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 关闭自动授权失败：${errText(err)}` };
      }
    },

    async loadSessions() {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<{ currentSessionId?: string | null; groups?: SessionGroupView[] }>(makeMessage('sessions'));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 读取会话失败：${res.error ?? '后台无响应'}` };
        return {
          ok: true,
          kind: '',
          text: `当前会话：${res.data.currentSessionId ?? '（无活跃站点）'}`,
          data: { currentSessionId: res.data.currentSessionId ?? null, groups: res.data.groups ?? [] },
        };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 读取会话失败：${errText(err)}` };
      }
    },

    async groupAction(payload) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<{ groups?: SessionGroupView[] }>(makeMessage('session-group', payload));
        if (!res.ok) return { ok: false, kind: 'err', text: `✖ 分组操作失败：${res.error ?? '后台无响应'}` };
        return { ok: true, kind: '', text: '✓ 分组配置已更新（分组只共享对话，不代表互相授权）。', data: res.data?.groups ?? [] };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 分组操作失败：${errText(err)}` };
      }
    },

    async runDiagnostics() {
      const items: DiagItem[] = [extensionItem(deps.env.inExtension, deps.env.reasons)];

      let storageStatus: DiagStatus = 'fail';
      let storageDetail = '非扩展环境：chrome.storage.local 不可用';
      if (deps.env.inExtension && deps.probeStorage) {
        try {
          const probe = await deps.probeStorage();
          storageStatus = probe.status;
          storageDetail = probe.detail;
        } catch (err) {
          storageDetail = `存储读写异常：${errText(err)}`;
        }
      }
      items.push(storageItem(storageStatus, storageDetail));

      let diagData: DiagMessagePayload | undefined;
      let swStatus: DiagStatus = 'fail';
      let swDetail = '非扩展环境：无法连接 background service worker';
      if (deps.env.inExtension) {
        const t0 = now();
        const res = await send<DiagMessagePayload>(makeMessage('diag')).catch(() => undefined);
        const elapsed = now() - t0;
        if (res?.ok && res.data) {
          diagData = res.data;
          swStatus = 'ok';
          swDetail = `往返 ${elapsed} ms · SW 版本 v${res.data.version} · SW 启动于 ${new Date(res.data.swStartedAt).toLocaleString()}`;
        } else {
          swDetail = `background 未返回有效诊断（${res?.error ?? '无响应'}）`;
        }
      }
      items.push(swItem(swStatus, swDetail));
      items.push(versionItem(deps.manifestVersion(), diagData?.version ?? null, deps.buildStamp, diagData?.buildStamp ?? null));
      items.push(originsItem(diagData?.authorizedOrigins ?? [], diagData?.activeOrigin ?? null));

      let llm: LlmStatusSummary | null = null;
      if (deps.env.inExtension) {
        const res = await send<LlmStatusSummary>(makeMessage('llm-status')).catch(() => undefined);
        if (res?.ok && res.data) llm = res.data;
      }
      items.push(llmItem(Boolean(llm?.configured), llm?.providerName ?? '', llm?.model ?? ''));

      return buildReport(items, now());
    },
  };
}

/** Convenience: the `chrome.runtime` shape a transport can be built from. */
export interface RuntimeSenderLike {
  sendMessage(message: unknown): Promise<unknown>;
}

export function transportFromRuntime(runtime: RuntimeSenderLike): SettingsTransport {
  return {
    send: <T>(msg: PluginMessage) => runtime.sendMessage(msg) as Promise<PluginResponse<T>>,
  };
}

export type { LlmSettings };
