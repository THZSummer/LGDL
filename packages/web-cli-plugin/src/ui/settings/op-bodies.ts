/**
 * V5-2 review R1 **BLOCK-01** (ADR-V5-005 §1/§3 · FR-ALLN-042/043/044/075/076 ·
 * AC-ALLN-007/011) — the **surface-agnostic execute bodies** of the consolidated
 * settings actions.
 *
 * ── Why this module exists ──────────────────────────────────────────────────
 *
 * R2 moved the 4 overlapping settings actions onto the ONE op pipeline, but the
 * `execute` body itself lived only inside `sidepanel.ts`'s `bindPanelOps` call — so
 * the **options** surface (`PANEL = {}`) ran a body-less op and reported a **假成功**
 * (`{"ok":true}` + a success receipt with zero side effects). The fix is structural:
 * the *semantics* of「表单值 → 凭据落储」/「撤销三目标」/「权限两段握手」live here, once,
 * and **every atom** (the credential write / the permission remove / the gesture
 * request / the tool-surface reconcile / the SW `op-exec` transport) is **injected** by
 * the surface — the same seam pattern as `next-registry/snapshot.ts`'s table adapters.
 *
 * That is what makes「同执行体、不同 consent 载体」(ADR-V5-005 §3) a machine fact
 * instead of a comment: the body is one function, the surface supplies its own
 * explicit control (button / form submit) as the consent carrier.
 *
 * ── 法八（零明文）────────────────────────────────────────────────────────────
 *
 * A form payload travels in the **op ctx value** (never through `dispatch`), and the
 * only write is the injected `saveCredentials` sink — the same single key-store sink the
 * masked card uses. A body returns a **receipt** (fact-only copy) and never echoes a value.
 *
 * @module ui/settings/op-bodies
 */
import { makeMessage, type PluginMessage, type PluginResponse } from '../../background/messaging.js';
import { providerById } from '../../llm/providers.js';
import type { KeyStore, LlmSettings } from '../../llm/key-store.js';
import {
  OPTIONAL_CAPABILITIES,
  capabilityPermissionsApi,
  hasCapabilityPermission,
  isRegisteredCapability,
  removeCapabilityPermission,
  requestCapabilityPermissionOnGesture,
  unregisteredCapabilityIds,
  type OptionalCapability,
  type PermissionsApiLike,
} from '../../platform/capability-permissions.js';
import { capabilityRevokeFailureReceipt, capabilityRevokeReceipt } from './view.js';
import type { OpMessageKind } from './ops.js';

/**
 * A body's typed outcome. `receipt` carries the **settings-surface copy** (the same
 * strings the pre-consolidation implementation rendered), so the fallback route and the
 * delegated route cannot drift on what the user reads.
 */
export interface OpBodyOutcome {
  readonly ok: boolean;
  readonly reason?: string;
  readonly receipt?: { readonly kind?: string; readonly text: string };
}

/** The **atoms** a body needs — every one of them is a surface-injected seam. */
export interface OpBodyDeps {
  /** The ONE credential write sink (the panel passes its `writeCredentials`). */
  saveCredentials(cfg: LlmSettings): Promise<void> | void;
  /** The stored key of one provider (`''` when none) — the form's keep-existing rule. */
  loadProviderKey(providerId: string): Promise<string> | string;
  /** The stored credential row (the `credential` revoke target's restore base). */
  loadCredentials(): Promise<LlmSettings> | LlmSettings;
  /** `chrome.permissions.remove` (no gesture) — the ONE capability removal entry. */
  removePermission(cap: OptionalCapability): Promise<{ removed: boolean; error?: string }>;
  /** The **gesture** request entry (`requestCapabilityPermissionOnGesture`). */
  requestOnGesture(cap: OptionalCapability): Promise<{ granted: boolean; error?: string }>;
  /** Re-read the browser's actual grant (`chrome.permissions.contains`). */
  isGranted(cap: OptionalCapability): Promise<boolean>;
  /** The tool-surface reconcile after a grant / removal (`capabilities/permission-changed`). */
  reconcile(cap: OptionalCapability): Promise<void>;
  /** The existing message transport (`chrome.runtime.sendMessage`). */
  send<T = unknown>(msg: PluginMessage): Promise<PluginResponse<T>>;
  /**
   * The **site-authorization** revoke target. It is panel-owned (it needs the live
   * bound origin); a surface without an active site **refuses loudly** instead of
   * pretending it revoked something.
   */
  revokeSiteAuth?(origin: string): Promise<OpBodyOutcome> | OpBodyOutcome;
}

export interface OpBodies {
  /** `op.llm-config` — the settings **form payload** (JSON) → masked credential write. */
  llmConfigForm(raw?: string): Promise<OpBodyOutcome>;
  /** `op.revoke` — `site-auth:<origin>` / `permission:<cap>` / `auto-auth:<origin>` / `credential`. */
  revoke(target?: string): Promise<OpBodyOutcome>;
  /** `op.perm.request` — the runtime「新增项在册」judge + the two-stage handshake. */
  permRequest(ids: readonly string[]): Promise<OpBodyOutcome>;
}

/** The honest failure of an atom a surface did not inject (never a silent success). */
const NO_ATOM = (what: string): OpBodyOutcome => ({ ok: false, reason: `op-body-atom-missing:${what}` });

export function createOpBodies(deps: OpBodyDeps): OpBodies {
  /** The `settings/ops.ts` fallback route (no op surface): the receipts stay the legacy ones. */
  const stored = (cap: OptionalCapability): { kind: OpMessageKind; text: string } => capabilityRevokeReceipt(cap);

  return {
    async llmConfigForm(raw) {
      if (deps.saveCredentials === undefined) return NO_ATOM('saveCredentials');
      // A non-JSON value means the caller is the chat path (the masked `secret` card),
      // which owns its own body — this one only ever serves the settings form payload.
      if (typeof raw !== 'string' || !raw.trim().startsWith('{')) {
        return { ok: false, reason: 'llm-config-not-a-form-payload' };
      }
      const input = JSON.parse(raw) as {
        providerId?: string;
        apiKey?: string;
        model?: string;
        baseURL?: string;
        maxRounds?: string | number;
      };
      const provider = providerById(input.providerId ?? '');
      const key = (input.apiKey ?? '').trim();
      const existing = await deps.loadProviderKey(provider.id);
      if (!key && !existing) {
        return {
          ok: false,
          reason: 'llm-key-missing',
          receipt: {
            kind: 'warn',
            text: `⚠ 未保存：未填写 ${provider.name} 的 API Key，且该厂商尚无已保存的 Key。请填入 Key 后重试。`,
          },
        };
      }
      const model = (input.model ?? '').trim() || provider.defaultModel;
      const maxRounds = Number(input.maxRounds);
      // 法八：the value travels in the ctx, and only this ONE sink writes it.
      await deps.saveCredentials({
        providerId: provider.id,
        apiKey: key || existing,
        model,
        ...(input.baseURL !== undefined ? { baseURL: input.baseURL } : {}),
        ...(Number.isFinite(maxRounds) && maxRounds > 0 ? { maxRounds } : {}),
      });
      return {
        ok: true,
        receipt: { kind: 'ok', text: `✓ 已保存：${provider.name} · ${model} · Key ✅ 已写入（chrome.storage.local，不回显）` },
      };
    },

    async revoke(target) {
      const [head, arg] = String(target ?? '').split(':');
      if (head === 'site-auth') {
        if (!deps.revokeSiteAuth) return { ok: false, reason: 'revoke-no-site-surface' };
        return deps.revokeSiteAuth(arg);
      }
      if (head === 'auto-auth') {
        if (!arg) return { ok: false, reason: 'revoke-no-origin' };
        const res = await deps.send<{ origins?: unknown[] }>(makeMessage('auto-auth', { action: 'clear', origin: arg }));
        if (!res.ok) return { ok: false, reason: res.error ?? 'auto-auth-clear-failed' };
        return { ok: true, receipt: { kind: '', text: `已关闭 ${arg} 的自动授权（读/写都关）。` } };
      }
      if (head === 'permission') {
        const caps = (arg ? [arg] : [...OPTIONAL_CAPABILITIES]) as readonly string[];
        const bad = unregisteredCapabilityIds(caps);
        if (bad.length > 0) return { ok: false, reason: `revoke-unregistered:${bad.join(',')}` };
        for (const id of caps) {
          const cap = id as OptionalCapability;
          const removed = await deps.removePermission(cap);
          if (!removed.removed) {
            return { ok: false, reason: removed.error ?? `revoke-permission-failed:${cap}`, receipt: capabilityRevokeFailureReceipt(cap, removed.error) };
          }
          // 不假成功（EC-V23-003）：`permissions.remove` 对**静态**授权是 no-op（仍解析
          // true），所以必须用 `contains` 复读实际授予态 —— 仍持有 ⇒ 如实返回失败。
          // 〖review R1 修复轮〗Chrome 的授予态**跨进程落定不是同步的**：`remove` 刚返回时
          // 单次复读可能仍读到 true（真实浏览器实测：干净档撤销书签 ⇒ 误判「仍持有」并把
          // 成功回执换成失败文案）。判据不变、只把复读改为**有界重读**（≤3 次 / 150 ms），
          // 真正仍持有的情形（静态授权 / 用户拒绝）依旧如实失败。
          let held = await deps.isGranted(cap);
          for (let attempt = 0; attempt < 2 && held; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            held = await deps.isGranted(cap);
          }
          if (held) {
            return {
              ok: false,
              reason: `permission-still-held:${cap}`,
              receipt: capabilityRevokeFailureReceipt(cap, '权限仍被浏览器持有（静态授权不可静默回收）'),
            };
          }
          await deps.reconcile(cap);
        }
        return { ok: true, receipt: caps.length === 1 ? stored(caps[0] as OptionalCapability) : { kind: '', text: `已撤销 ${caps.join('、')} 的权限（工具面已即时更新）。` } };
      }
      if (head === 'credential') {
        const current = await deps.loadCredentials();
        await deps.saveCredentials({ ...current, apiKey: '' });
        return { ok: true, receipt: { kind: '', text: '已清除本机保存的 LLM 凭据（不可逆）。' } };
      }
      return { ok: false, reason: `revoke-unknown-target:${head}` };
    },

    async permRequest(ids) {
      const unknown = unregisteredCapabilityIds(ids);
      if (unknown.length > 0) {
        return {
          ok: false,
          reason: `perm-not-registered:${unknown.join(',')}`,
          receipt: { kind: 'err', text: `✖ 申请未提交：${unknown.join('、')} 不在册（新增项必须先在册）` },
        };
      }
      const granted: string[] = [];
      const denied: string[] = [];
      for (const id of ids) {
        const cap = id as OptionalCapability;
        if (!isRegisteredCapability(cap)) return { ok: false, reason: `perm-not-registered:${cap}` };
        const consentToken = `op.perm.request:${cap}`;
        const probe = await deps.send<{ needsGesture?: boolean }>(
          makeMessage('op-exec', { opId: 'op.perm.request', phase: 'probe', consentToken, permission: cap }),
        );
        if (!probe.ok) {
          return { ok: false, reason: probe.error ?? 'perm-probe-failed', receipt: { kind: 'err', text: `✖ 权限申请未提交：${probe.error ?? '后台无响应'}` } };
        }
        // The ONE gesture entry (inside the click path) — never a request from the SW.
        const res = await deps.requestOnGesture(cap);
        const commit = await deps.send(
          makeMessage('op-exec', {
            opId: 'op.perm.request',
            phase: 'commit',
            consentToken,
            permission: cap,
            gestureResult: { granted: res.granted, ...(res.error ? { reason: res.error } : {}) },
          }),
        );
        if (!commit.ok) {
          return { ok: false, reason: commit.error ?? 'perm-commit-failed', receipt: { kind: 'err', text: `✖ 权限申请裁决失败：${commit.error ?? '后台无响应'}` } };
        }
        if (res.granted) {
          granted.push(cap);
          // The existing reconcile so the tool surface follows the grant (ONE path).
          await deps.reconcile(cap);
        } else {
          denied.push(cap);
        }
      }
      // 双固化（FR-ALLN-043）: the approve and the deny paths each write their own fact row.
      if (granted.length > 0 && denied.length === 0) {
        return { ok: true, receipt: { kind: 'ok', text: `✓ 已处理浏览器权限申请（${granted.join('、')} 已授予）` } };
      }
      if (granted.length === 0) {
        return {
          ok: false,
          reason: 'perm-denied',
          receipt: {
            kind: 'warn',
            text: `已拒绝：未授予 ${denied.join('、')} 权限；浏览器权限的回收须你在浏览器确认（插件不做静默回收），可稍后重试。`,
          },
        };
      }
      return { ok: true, receipt: { kind: 'ok', text: `✓ 已处理浏览器权限申请（已授予 ${granted.join('、')}；未授予 ${denied.join('、')}）` } };
    },
  };
}

/** The non-`chrome` transport shape a surface always has (`chrome.runtime.sendMessage`). */
export interface SendLike {
  send<T = unknown>(msg: PluginMessage): Promise<PluginResponse<T>>;
}

/**
 * The **no-surface** atoms (used by `settings/ops.ts`'s test-only fallback route — its
 * unit tests drive the ops without an op pipeline). Production surfaces inject their own
 * atoms, so this file stays the ONE place the raw platform entries are named.
 */
export function defaultOpBodyDeps(input: {
  store: KeyStore;
  transport: SendLike;
  permissions?: PermissionsApiLike;
}): OpBodyDeps {
  const api = (): PermissionsApiLike | undefined => input.permissions ?? capabilityPermissionsApi();
  return {
    saveCredentials: (cfg) => input.store.save(cfg),
    loadProviderKey: async (id) => (await input.store.loadProvider(providerById(id).id)).apiKey,
    loadCredentials: () => input.store.load(),
    removePermission: (cap) => removeCapabilityPermission(api(), cap),
    requestOnGesture: (cap) => requestCapabilityPermissionOnGesture(cap),
    isGranted: (cap) => hasCapabilityPermission(api(), cap),
    reconcile: async (cap) => {
      await input.transport.send(makeMessage('capabilities', { action: 'permission-changed', capability: cap }));
    },
    send: (msg) => input.transport.send(msg),
  };
}
