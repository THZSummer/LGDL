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
import { opReceiptText } from '../sidepanel/next-registry/ops.js';
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
import {
  tabsSettingStatus,
  autoAuthRows,
  capabilitiesView,
  applyMeasuredGrants,
  capabilityRevokeFailureReceipt,
  capabilityRevokeReceipt,
  bookmarksCapabilityStatus,
  downloadsCapabilityStatus,
  notifyCapabilityStatus,
  clipboardCapabilityStatus,
  type AutoAuthRecordView,
  type CapabilitiesView,
  type MeasuredCapabilityGrants,
} from './view.js';
import type { SessionGroupView } from './view.js';
import {
  OPTIONAL_CAPABILITIES,
  OPTIONAL_CAPABILITY_TOOL,
  capabilityPermissionsApi,
  hasCapabilityPermission,
  type OptionalCapability,
  type PermissionsApiLike,
} from '../../platform/capability-permissions.js';
import { createOpBodies, defaultOpBodyDeps, type OpBodyOutcome } from './op-bodies.js';

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
  /**
   * TASK-040: optional `chrome.permissions` seam for the live `contains()`
   * grant probe and the no-gesture `remove()`. Injected so the whole module
   * stays node-testable; defaults to the lazy real `chrome.permissions`.
   */
  permissions?: PermissionsApiLike;
  now?: () => number;
  /**
   * V5-2 **TASK-V5-145** (ADR-V5-005 §1/§3 · FR-ALLN-075~078) — the **op single
   * execution body**, injected by the surface (side panel / options page). The four
   * overlapping settings actions below delegate here, so their `execute` bodies live
   * exactly once (the shared surface-agnostic bodies in `settings/op-bodies.ts`, which
   * every surface — panel / settings / options — injects its own atoms into; see
   * V5-2 review R2 **N-02** docstring fix) and the settings surface owns no native
   * implementation statement (`deps.store.save` / `removeCapabilityPermission` /
   * the auto-auth message) any more.
   *
   * `surface` is the **consent carrier** disclosure: `settings` / `options` skip the
   * stream cards because the surface's own explicit control IS the consent (登记为
   * 「同执行体、不同 consent 载体」). Absent ⇒ the legacy in-module behaviour (so the
   * existing unit tests keep their seam).
   */
  dispatchOp?: (
    opId: string,
    ctx: { value?: string },
    surface: 'settings' | 'options',
  ) => Promise<{ ok: boolean; reason?: string; receipt?: { kind?: string; text: string } }>;
  /** Which surface this instance serves (the delegation's consent carrier). */
  surface?: 'settings' | 'options';
}

export type OpMessageKind = 'ok' | 'warn' | 'err' | '';

/** Uniform result every surface renders identically. */
export interface OpResult<T = unknown> {
  ok: boolean;
  kind: OpMessageKind;
  text: string;
  data?: T;
  /** The execute body's machine reason (carried through the delegation for post-checks). */
  reason?: string;
  /**
   * V5-2 review R1 **BLOCK-01** — the execute body's own receipt, **carried through the
   * delegation**. `text` is already the rendered copy; the structured receipt is what the
   * post-checks (capability revoke's 不假成功 / the panel's capability receipt) read, so a
   * surface can never fall back to a generic sentence while the body knew better.
   */
  receipt?: { kind?: string; text: string };
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
  /** FR-054 / FR-055: optional-permission capabilities. */
  loadCapabilities(): Promise<OpResult<CapabilitiesView>>;
  setCapabilityPrivacy(cap: OptionalCapability, scope: 'read' | 'write', enabled: boolean): Promise<OpResult<CapabilitiesView>>;
  /** Re-reconcile after a gesture-driven `chrome.permissions.request` settles. */
  notifyCapabilityPermissionChanged(cap: OptionalCapability): Promise<OpResult<CapabilitiesView>>;
  /**
   * TASK-040: revoke a capability's optional permission (`chrome.permissions.remove`
   * — no gesture required), then re-reconcile the tool surface through the
   * existing `capabilities/permission-changed` path (tool leaves the surface +
   * audit). Never silent: a failed remove returns a readable error receipt.
   */
  revokeCapability(cap: OptionalCapability): Promise<OpResult<CapabilitiesView>>;
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

  const permissionsApi = (): PermissionsApiLike | undefined => deps.permissions ?? capabilityPermissionsApi();

  /**
   * TASK-040: measure the **real** grant for every capability in the extension
   * page (`chrome.permissions.contains`). This is the single source of truth for
   * the UI — the persisted privacy toggles never decide authorization.
   */
  async function measuredGrants(): Promise<MeasuredCapabilityGrants> {
    const api = permissionsApi();
    const out: MeasuredCapabilityGrants = {};
    for (const cap of OPTIONAL_CAPABILITIES) out[cap] = await hasCapabilityPermission(api, cap);
    return out;
  }

  /** Normalize a raw background payload, then override grants with the measured values. */
  async function measuredView(raw: unknown): Promise<CapabilitiesView> {
    return applyMeasuredGrants(capabilitiesView(raw), await measuredGrants());
  }

  /** Re-read the capability status through the ONE existing message (the op delegation's data). */
  async function freshCapabilities(): Promise<CapabilitiesView | undefined> {
    try {
      const res = await send<CapabilitiesView>(makeMessage('capabilities', { action: 'status' }));
      return res.ok && res.data ? await measuredView(res.data) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Re-read the auto-auth rows through the ONE existing message (the op delegation's data). */
  async function freshAutoAuthRows(): Promise<AutoAuthRecordView[]> {
    try {
      const res = await send<{ origins?: AutoAuthRecordView[] }>(makeMessage('auto-auth', { action: 'get' }));
      return res.ok && res.data ? autoAuthRows(res.data.origins) : [];
    } catch {
      return [];
    }
  }

  /** The LLM tool surface as the background reports it (the honest re-read for receipts). */
  async function capabilityToolSet(): Promise<readonly string[]> {
    try {
      const res = await send<{ tools?: string[] }>(makeMessage('capabilities', { action: 'status' }));
      return res.ok && res.data ? res.data.tools ?? [] : [];
    } catch {
      return [];
    }
  }

  /**
   * V5-2 review R1 **BLOCK-01 / I-02** (ADR-V5-005 §1/§3 · FR-ALLN-042/044/075/076) —
   * the **surface-agnostic execute bodies**. They live in `./op-bodies.ts` (the ONE
   * place the four consolidated actions' semantics are written down); every atom is a
   * seam. The production surfaces inject an op pipeline (`deps.dispatchOp`); the
   * fallback below (no op surface — the unit-test seam) drives the **same body**, so no
   * second implementation exists and this module owns **zero** native statement.
   */
  const bodies = createOpBodies(
    defaultOpBodyDeps({
      store: deps.store,
      transport: { send: (msg) => deps.transport.send(msg) },
      ...(deps.permissions ? { permissions: deps.permissions } : {}),
    }),
  );

  /** Render one body outcome as the surface's `OpResult` (receipt first, op copy second). */
  const fromBody = <T = unknown>(opId: string, out: OpBodyOutcome, data?: T): OpResult<T> => ({
    ok: out.ok,
    kind: (out.receipt?.kind ?? (out.ok ? 'ok' : 'err')) as OpMessageKind,
    text: out.receipt?.text ?? opReceiptText(opId, out),
    ...(out.reason !== undefined ? { reason: out.reason } : {}),
    ...(data !== undefined ? { data } : {}),
  });

  /** The surface's typed-op delegation (absent ⇒ the caller keeps the legacy path). */
  async function viaOp<T = unknown>(opId: string, value?: string): Promise<OpResult<T>> {
    const surface = deps.surface ?? 'settings';
    const out = await deps.dispatchOp!(opId, value === undefined ? {} : { value }, surface);
    // review R1 BLOCK-01 / I-02：the body's own receipt (the same string the panel stream
    // renders) is the copy every surface shows — 一个执行体，一份回执文案。
    return {
      ok: out.ok,
      kind: (out.receipt?.kind ?? (out.ok ? 'ok' : 'err')) as OpMessageKind,
      text: out.receipt?.text ?? opReceiptText(opId, out),
      ...(out.reason !== undefined ? { reason: out.reason } : {}),
      ...(out.receipt ? { receipt: out.receipt } : {}),
    };
  }

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
      // V5-2 TASK-V5-145 / review R1 BLOCK-01: the execute body is the op's (one source,
      // `op-bodies.ts`). The form input travels in the **ctx value** (never through
      // `dispatch`, so 法八 holds: no stream payload, no digest entry, no attribute).
      const data = { providerName: providerById(input.providerId).name, model: input.model };
      if (deps.dispatchOp) {
        const out = await viaOp<{ providerName: string; model: string }>('op.llm-config', JSON.stringify(input));
        return out.ok ? { ...out, data } : out;
      }
      // No op surface (unit-test seam) ⇒ the SAME execute body, called directly.
      return fromBody<{ providerName: string; model: string }>('op.llm-config', await bodies.llmConfigForm(JSON.stringify(input)), data);
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

    async loadCapabilities() {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<CapabilitiesView>(makeMessage('capabilities', { action: 'status' }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 读取能力权限状态失败：${res.error ?? '后台无响应'}` };
        const view = await measuredView(res.data);
        return {
          ok: true,
          kind: '',
          text: `${bookmarksCapabilityStatus(view.bookmarks)}；${downloadsCapabilityStatus(view.downloads)}；${notifyCapabilityStatus(view.notify)}；${clipboardCapabilityStatus(view.clipboard)}`,
          data: view,
        };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 读取能力权限状态失败：${errText(err)}` };
      }
    },

    async setCapabilityPrivacy(cap, scope, enabled) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<CapabilitiesView>(makeMessage('capabilities', { action: 'set', capability: cap, scope, enabled }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 保存能力开关失败：${res.error ?? '后台无响应'}` };
        const view = await measuredView(res.data);
        const label =
          cap === 'bookmarks' ? '书签' : cap === 'downloads' ? '下载记录' : cap === 'notify' ? '系统通知' : '剪贴板';
        const scopeLabel = cap === 'notify' ? '' : scope === 'write' ? '·写' : '·读';
        return {
          ok: true,
          kind: '',
          text: `已${enabled ? '开启' : '关闭'}「${label}${scopeLabel}」；工具面已即时更新（不静默）。`,
          data: view,
        };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 保存能力开关失败：${errText(err)}` };
      }
    },

    async notifyCapabilityPermissionChanged(cap) {
      if (!deps.env.inExtension) return notExtension();
      try {
        const res = await send<CapabilitiesView>(makeMessage('capabilities', { action: 'permission-changed', capability: cap }));
        if (!res.ok || !res.data) return { ok: false, kind: 'err', text: `✖ 同步权限状态失败：${res.error ?? '后台无响应'}` };
        return { ok: true, kind: '', text: '权限状态已同步。', data: await measuredView(res.data) };
      } catch (err) {
        return { ok: false, kind: 'err', text: `✖ 同步权限状态失败：${errText(err)}` };
      }
    },

    async revokeCapability(cap) {
      if (!deps.env.inExtension) return notExtension();
      // V5-2 review R1 I-02: the revoke body lives in `op-bodies.ts` (ONE implementation);
      // this method only chooses the route (op pipeline in production, the same body for
      // the unit-test seam) and does the **不假成功** post-read.
      const out: OpBodyOutcome = deps.dispatchOp
        ? await viaOp<CapabilitiesView>('op.revoke', `permission:${cap}`)
        : await bodies.revoke(`permission:${cap}`);
      const data = await freshCapabilities();
      if (!out.ok) {
        // 权限面**没有**真的撤销（`permission-still-held` / remove 失败 / 未在册）⇒ 如实失败。
        return {
          ok: false,
          kind: 'err',
          text: capabilityRevokeFailureReceipt(cap, out.reason ?? '未知原因').text,
          reason: out.reason,
          ...(data ? { data } : {}),
        };
      }
      // 不假成功（EC-V23-003）的**权威判据 = 权限面**：执行体内 `contains` 的有界重读已确认
      // 该权限真的离开浏览器。工具面是 SW 的第二视图（依赖 SW 自身对授予态的读法 + 隐私开关），
      // 与页面测得的授予态可能**环境性/暂时**不一致（真实浏览器 + 手势桩实测：页面 remove 生效、
      // SW 复读尚未落定），因此它只作**附加说明**，不再推翻权限面的结论。
      // 〖review R1 修复轮〗R2 曾用工具面单次复读把成功回执换成失败文案 —— journey `#54s` 的
      // 真机运行证明该判据会把「已撤销」误报为「失败」（假失败），现按权限面重锚。
      const toolHeld = (await capabilityToolSet()).includes(OPTIONAL_CAPABILITY_TOOL[cap]);
      return {
        ok: true,
        kind: (out.receipt?.kind ?? 'ok') as OpMessageKind,
        text: (out.receipt?.text ?? opReceiptText('op.revoke', out)) + (toolHeld ? '（工具面对账仍在进行，界面会自动刷新）' : ''),
        ...(data ? { data } : {}),
      };
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
      // V5-2 review R1 I-02: the `auto-auth clear` body moved to `op-bodies.ts` (ONE
      // implementation); both routes reach the SAME body.
      const out: OpBodyOutcome = deps.dispatchOp
        ? await viaOp<AutoAuthRecordView[]>('op.revoke', `auto-auth:${origin}`)
        : await bodies.revoke(`auto-auth:${origin}`);
      if (!out.ok) return fromBody<AutoAuthRecordView[]>('op.revoke', out);
      const rows = await freshAutoAuthRows();
      return { ...fromBody<AutoAuthRecordView[]>('op.revoke', out, rows) };
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
