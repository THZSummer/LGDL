/**
 * Settings view-model — pure, DOM-free and node-testable (TASK-033).
 *
 * TASK-033 moved the settings **logic** into `src/ui/settings/` so the side
 * panel's in-panel settings view (primary) and `options.html` (fallback shell)
 * render the same decisions from a single source. This file owns the readable
 * string/state derivation; the DOM wiring lives in `panel.ts` (side panel) and
 * `options.ts` (fallback page).
 *
 * Nothing here touches `chrome`/`document`; every function is a pure mapping so
 * both surfaces stay in lockstep and can be unit-tested in node.
 */
import { PROVIDERS, providerById } from '../../llm/providers.js';
import type { LlmSettings } from '../../llm/key-store.js';
import { OPTIONAL_CAPABILITIES, permissionsOf, type OptionalCapability } from '../../platform/capability-permissions.js';

// ── LLM API key state (single source for both surfaces) ────────────────────

/** Empty key box copy — the key is written but never re-echoed. */
export const API_KEY_PLACEHOLDER_EMPTY = '仅写入扩展存储，不回显明文';
/** Saved-but-not-echoed copy (TASK-020 A: an empty box must not read as failure). */
export const API_KEY_PLACEHOLDER_SAVED = '已保存（不回显）；如需更换请重新输入';

export function apiKeyPlaceholder(hasKey: boolean): string {
  return hasKey ? API_KEY_PLACEHOLDER_SAVED : API_KEY_PLACEHOLDER_EMPTY;
}

export interface KeyStateView {
  /** `ok` when a key is stored, `warn` otherwise (drives colour only). */
  kind: 'ok' | 'warn';
  text: string;
}

/** Zero-plaintext key-state marker (derived only from the boolean `hasKey`). */
export function keyStateView(hasKey: boolean): KeyStateView {
  return hasKey
    ? { kind: 'ok', text: 'Key ✅ 已写入（不回显）' }
    : { kind: 'warn', text: '⚠ 未配置 Key —— 保存后仍无法调用 LLM' };
}

export interface ProviderOption {
  value: string;
  label: string;
  selected: boolean;
}

/** Provider <option> list (single source for both surfaces). */
export function providerOptions(selected: string): ProviderOption[] {
  return PROVIDERS.map((p) => ({
    value: p.id,
    label: `${p.name}${p.browserDirect ? '' : '（需 G-KEY 验证直连）'}`,
    selected: p.id === selected,
  }));
}

/** Readable hint for a provider, including the browser-direct limitation note. */
export function providerHint(id: string): string {
  const provider = providerById(id);
  return `${provider.hint}${provider.browserDirect ? '' : '；⚠ 该厂商浏览器直连受限（G-KEY），可在「测试连接」查看可读原因'}`;
}

export interface SavedSummaryView {
  kind: 'ok' | 'warn' | '';
  text: string;
}

/** Non-sensitive stored-config echo (never the key itself). */
export function savedSummaryView(cfg: Pick<LlmSettings, 'providerId' | 'model' | 'apiKey'>): SavedSummaryView {
  const provider = providerById(cfg.providerId);
  const keyState = cfg.apiKey ? 'Key ✅' : 'Key ⚠未配置';
  return {
    kind: cfg.apiKey ? '' : 'warn',
    text: `当前配置：${provider.name} · ${cfg.model} · ${keyState}`,
  };
}

/** Unconfigured warning copy ('' when a key is present → hidden). */
export function keyWarningText(configured: boolean): string {
  return configured ? '' : '⚠ 尚未配置 API Key：插件无法调用 LLM。请在下方选择厂商、填入 API Key 并保存。';
}

// ── tabs-management privacy toggle ─────────────────────────────────────────

/** Readable status for the `tabs` privacy switch (single source). */
export function tabsSettingStatus(enabled: boolean, tools?: string[]): string {
  const hasTool = !tools || tools.includes('tabs');
  if (enabled) {
    return hasTool
      ? '已开启：LLM 工具面包含 tabs（list / switch / open / mute / pin / move / close）。'
      : '已开启：tabs 应已进入 LLM 工具面（若未显示，请重新加载扩展）。';
  }
  return hasTool
    ? '⚠ 已关闭但工具面仍含 tabs：请重新加载扩展后重试（这是异常，不静默）。'
    : '已关闭：tabs 已从 LLM 工具面移除（助手无法查看/切换标签页）。';
}

// ── FR-054: optional-permission capabilities (bookmarks / downloads) ────────

export interface CapabilityGrantView {
  /** Privacy toggle for the read group (bookmarks list/search/tree; downloads list/search). */
  read: boolean;
  /** Privacy toggle for the write group (bookmarks only). */
  write?: boolean;
  /**
   * Whether the optional permission is currently granted. Author UX round
   * (TASK-040): every render derives this from a **live**
   * `chrome.permissions.contains()` probe (never from the persisted privacy
   * toggle), so a toggle that reads「开」while the permission is gone can never
   * masquerade as granted.
   */
  granted: boolean;
  /** True when an explicit revocation removed it (distinct from「never requested」). */
  revoked: boolean;
  /** Current deriveTools() surface (optional; for the「已从工具面移除」note). */
  tools?: string[];
}

export interface CapabilitiesView {
  bookmarks: CapabilityGrantView & { write: boolean };
  downloads: CapabilityGrantView;
  /** FR-055: notify privacy toggle (default ON). */
  notify: CapabilityGrantView;
  /** FR-055: clipboard read/write toggles (read default OFF / write default ON). */
  clipboard: CapabilityGrantView & { write: boolean };
  /** Current deriveTools() surface (for the「已从工具面移除」回执). */
  tools?: string[];
}

/** A measured-grant map keyed by capability (from a live `contains()` probe). */
export type MeasuredCapabilityGrants = Partial<Record<OptionalCapability, boolean>>;

/**
 * TASK-040: override the background-reported `granted` flags with the values
 * **measured in the extension page** via `chrome.permissions.contains()`.
 *
 * The privacy toggles (`read` / `write`) are persisted preferences and are
 * deliberately ignored here: authorization is decided by the measured grant
 * only. `granted=true` also clears a stale `revoked` flag (a re-grant after a
 * revoke must not keep reading as「已撤销」).
 */
export function applyMeasuredGrants(view: CapabilitiesView, measured: MeasuredCapabilityGrants): CapabilitiesView {
  const next: CapabilitiesView = {
    bookmarks: { ...view.bookmarks },
    downloads: { ...view.downloads },
    notify: { ...view.notify },
    clipboard: { ...view.clipboard },
    ...(view.tools ? { tools: view.tools } : {}),
  };
  for (const cap of OPTIONAL_CAPABILITIES) {
    const m = measured[cap];
    if (typeof m !== 'boolean') continue;
    const row = next[cap] as CapabilityGrantView;
    row.granted = m;
    if (m) row.revoked = false;
  }
  return next;
}

/** Short capability label for readable receipts / action copy. */
export const CAPABILITY_SHORT_LABEL: Readonly<Record<OptionalCapability, string>> = {
  bookmarks: '书签',
  downloads: '下载记录',
  notify: '系统通知',
  clipboard: '剪贴板',
};

/**
 * TASK-040 (defect ③): readable explanation of what each capability enables and
 * **why Chrome prompts at all** (optional permission + mandatory user gesture),
 * so「不直观」is answered on the row itself.
 */
export const CAPABILITY_EXPLANATION: Readonly<Record<OptionalCapability, string>> = {
  bookmarks:
    '「书签访问」= 让助手读取/整理你的书签栏与书签管理器条目；Chrome 把 bookmarks 列为可选权限，必须由你在扩展页面点一次才会弹窗授权。',
  downloads:
    '「下载记录（只读）」= 让助手查看你的下载历史（不做取消/删除/打开）；Chrome 把 downloads 列为可选权限，必须由你在扩展页面点一次才会弹窗授权。',
  notify:
    '「系统通知」= 让助手读取当前通知并通过 Chrome 发送系统通知；Chrome 把 notifications 列为可选权限，必须由你在扩展页面点一次才会弹窗授权。',
  clipboard:
    '「剪贴板访问」= 让助手读取/写入系统剪贴板文本（读取为 state 档、永不自动放行）；Chrome 把 clipboardRead/clipboardWrite 列为可选权限，必须由你在扩展页面点一次才会弹窗授权。',
};

/** 已开启 / 未开启 / 已撤销 (single source for panel + options). */
export function capabilityStateLabel(granted: boolean, revoked: boolean): '已开启' | '未开启' | '已撤销' {
  if (granted) return '已开启';
  return revoked ? '已撤销' : '未开启';
}

/**
 * TASK-040 (defect ①): the three-state action control derived **only** from the
 * measured grant.
 *  - not granted → one「授权 Chrome ＜能力＞权限」button (opens the gesture prompt);
 *  - granted     → the button flips to「撤销 Chrome 权限」+ a `✅ 已授权` badge;
 *  - revoked     → back to the request button, plus a readable「上次已撤销」note.
 */
export interface CapabilityActionView {
  mode: 'request' | 'revoke';
  buttonLabel: string;
  badge: string;
  showRequest: boolean;
  showRevoke: boolean;
  revokedNote: string;
}

export function capabilityActionView(cap: OptionalCapability, granted: boolean, revoked: boolean): CapabilityActionView {
  if (granted) {
    return {
      mode: 'revoke',
      buttonLabel: '撤销 Chrome 权限',
      badge: '✅ 已授权',
      showRequest: false,
      showRevoke: true,
      revokedNote: '',
    };
  }
  return {
    mode: 'request',
    buttonLabel: `授权 Chrome ${CAPABILITY_SHORT_LABEL[cap]}权限`,
    badge: '',
    showRequest: true,
    showRevoke: false,
    revokedNote: revoked
      ? `上次已撤销：Chrome 未授予 ${permissionsOf(cap).join('/')} 权限，助手工具已从 LLM 工具面移除；可再次点击「授权」重新申请。`
      : '',
  };
}

/** Persistent action receipt (TASK-040 defect ②) — kind drives colour only. */
export interface CapabilityReceipt {
  kind: 'ok' | 'warn' | 'err' | '';
  text: string;
}

export function capabilityGrantReceipt(cap: OptionalCapability): CapabilityReceipt {
  return {
    kind: 'ok',
    text: `✅ 已开启${CAPABILITY_SHORT_LABEL[cap]}访问：Chrome 权限已授予（助手工具已进入 LLM 工具面）`,
  };
}

export function capabilityDeniedReceipt(cap: OptionalCapability, detail?: string): CapabilityReceipt {
  const extra = detail && detail.trim() ? `（${detail}）` : '';
  return {
    kind: 'warn',
    text: `✖ 未开启：Chrome 未授予 ${permissionsOf(cap).join('/')} 权限；可再次点击重试${extra}`,
  };
}

export function capabilityRevokeReceipt(cap: OptionalCapability): CapabilityReceipt {
  return {
    kind: 'ok',
    text: `✅ 已撤销${CAPABILITY_SHORT_LABEL[cap]}权限：Chrome 权限已移除（助手工具已从 LLM 工具面移除）`,
  };
}

export function capabilityRevokeFailureReceipt(cap: OptionalCapability, detail?: string): CapabilityReceipt {
  return {
    kind: 'err',
    text: `✖ 撤销${CAPABILITY_SHORT_LABEL[cap]}权限失败：${detail && detail.trim() ? detail : '未知原因'}（Chrome 权限仍保留；可重试）`,
  };
}

/**
 * The persistent state note a row shows on every (re-)render — always consistent
 * with the measured grant. Action receipts ({@link capabilityGrantReceipt} /
 * {@link capabilityRevokeReceipt}) are shown on top of it until the next render.
 */
export function capabilityStateNote(cap: OptionalCapability, granted: boolean, revoked: boolean): CapabilityReceipt {
  const perms = permissionsOf(cap).join('/');
  if (granted) {
    return { kind: 'ok', text: `✅ 已授权：Chrome 已授予 ${perms} 权限，助手工具已进入 LLM 工具面。` };
  }
  if (revoked) {
    return {
      kind: 'warn',
      text: capabilityActionView(cap, false, true).revokedNote,
    };
  }
  return { kind: 'warn', text: `未授权：Chrome 未授予 ${perms} 权限；点「授权 Chrome ${CAPABILITY_SHORT_LABEL[cap]}权限」申请。` };
}

function capabilityToolNote(tool: string, granted: boolean, revoked: boolean, tools?: string[]): string {
  if (!granted) {
    return revoked
      ? '（权限已被撤销：已从 LLM 工具面移除；可点「授权」重新申请或「撤销」再次确认）'
      : '（点下方「授权」按钮；未授权时调用会得到可读提示，不会静默失败）';
  }
  const inSurface = !tools || tools.includes(tool);
  return inSurface ? '（工具已进入 LLM 工具面）' : '（开关关闭：工具已从 LLM 工具面移除）';
}

/**
 * TASK-040 (defect ③): when the permission is not granted, the privacy toggles
 * must **not** keep reading as「开」— the row falls back to「权限未授予」semantics.
 */
function capabilityTogglesText(granted: boolean, grantedText: string, scopes: string): string {
  if (granted) return grantedText;
  return `${scopes}开关：权限未授予（不生效）`;
}

/** Readable status for the bookmarks capability row. */
export function bookmarksCapabilityStatus(v: CapabilitiesView['bookmarks']): string {
  const label = capabilityStateLabel(v.granted, v.revoked);
  const toggles = capabilityTogglesText(v.granted, `读开关 ${v.read ? '开' : '关'} · 写开关 ${v.write ? '开' : '关'}`, '读/写');
  return `书签访问（可选权限，读+写）：${label}｜${toggles}｜${capabilityToolNote('bookmarks', v.granted, v.revoked, v.tools)}`;
}

/** Readable status for the downloads capability row. */
export function downloadsCapabilityStatus(v: CapabilitiesView['downloads']): string {
  const label = capabilityStateLabel(v.granted, v.revoked);
  const toggles = capabilityTogglesText(v.granted, `读开关 ${v.read ? '开' : '关'}`, '读');
  return `下载记录（可选权限，只读）：${label}｜${toggles}｜${capabilityToolNote('downloads', v.granted, v.revoked, v.tools)}`;
}

/** Readable status for the notify capability row (FR-055). */
export function notifyCapabilityStatus(v: CapabilitiesView['notify']): string {
  const label = capabilityStateLabel(v.granted, v.revoked);
  const toggles = capabilityTogglesText(v.granted, `开关 ${v.read ? '开' : '关'}`, '');
  return `系统通知（可选权限 notifications）：${label}｜${toggles}｜${capabilityToolNote('notify', v.granted, v.revoked, v.tools)}`;
}

/** Readable status for the clipboard capability row (FR-055). */
export function clipboardCapabilityStatus(v: CapabilitiesView['clipboard']): string {
  const label = capabilityStateLabel(v.granted, v.revoked);
  const toggles = capabilityTogglesText(
    v.granted,
    `读开关 ${v.read ? '开' : '关'}（默认关）· 写开关 ${v.write ? '开' : '关'}（默认开）`,
    '读/写',
  );
  return `剪贴板（可选权限 clipboardRead/clipboardWrite）：${label}｜${toggles}｜读取为 state 档、永不自动放行｜${capabilityToolNote('clipboard', v.granted, v.revoked, v.tools)}`;
}

/** Normalize the background `capabilities` reply into a stable view. */
export function capabilitiesView(data: unknown): CapabilitiesView {
  const raw = (data ?? {}) as {
    bookmarks?: Partial<CapabilitiesView['bookmarks']>;
    downloads?: Partial<CapabilitiesView['downloads']>;
    notify?: { enabled?: unknown; granted?: unknown; revoked?: unknown; read?: unknown };
    clipboard?: Partial<CapabilitiesView['clipboard']>;
    tools?: unknown;
  };
  const b = raw.bookmarks ?? {};
  const d = raw.downloads ?? {};
  const n = raw.notify ?? {};
  const c = raw.clipboard ?? {};
  const tools = Array.isArray(raw.tools) ? (raw.tools as string[]) : undefined;
  return {
    bookmarks: {
      read: b.read !== false,
      write: b.write === true,
      granted: b.granted === true,
      revoked: b.revoked === true,
      ...(tools ? { tools } : {}),
    },
    downloads: {
      read: d.read !== false,
      granted: d.granted === true,
      revoked: d.revoked === true,
      ...(tools ? { tools } : {}),
    },
    notify: {
      // The background ships `{enabled}`; the shared view uses `read` as the
      // single-toggle slot so both surfaces render identically.
      read: n.read !== undefined ? n.read !== false : n.enabled !== false,
      granted: n.granted === true,
      revoked: n.revoked === true,
      ...(tools ? { tools } : {}),
    },
    clipboard: {
      read: c.read === true,
      write: c.write !== false,
      granted: c.granted === true,
      revoked: c.revoked === true,
      ...(tools ? { tools } : {}),
    },
    ...(tools ? { tools } : {}),
  };
}

// ── auto-authorization (per origin) ────────────────────────────────────────
export interface AutoAuthRecordView {
  origin: string;
  read: boolean;
  write: boolean;
  updatedAt: number;
}

/** Normalize the background `auto-auth` reply into stable view rows. */
export function autoAuthRows(records: readonly AutoAuthRecordView[] | undefined): AutoAuthRecordView[] {
  return (records ?? [])
    .filter((r) => r && typeof r.origin === 'string' && r.origin.length > 0)
    .map((r) => ({ origin: r.origin, read: r.read === true, write: r.write === true, updatedAt: r.updatedAt ?? 0 }));
}

/** Empty-state copy for the per-origin auto-authorization list. */
export const AUTO_AUTH_EMPTY_TEXT = '暂无站点开启自动授权（侧栏「知情同意与能力边界」区可为当前站点开启）。';

export function autoAuthListStatus(count: number): string {
  return `自动授权：${count} 个站点有显式设置（写操作自动不含破坏性操作；evaluate 档与未授权站点永不自动放行）。`;
}

// ── session groups ─────────────────────────────────────────────────────────

export interface SessionGroupView {
  groupId: string;
  name: string;
  origins: string[];
}

export interface GroupListView {
  empty: boolean;
  rows: Array<{ groupId: string; title: string; originsText: string }>;
}

export function groupListView(groups: readonly SessionGroupView[] | undefined): GroupListView {
  const rows = (groups ?? []).map((g) => ({
    groupId: g.groupId,
    title: `${g.name}（${g.origins.length} 个域名）`,
    originsText: g.origins.length ? g.origins.join('，') : '（暂无域名）',
  }));
  return { empty: rows.length === 0, rows };
}

// ── section descriptors (test anchor for "all sections present") ───────────

export interface SettingsSectionDescriptor {
  id: string;
  title: string;
  /** Covered by the B-section migration checklist (TASK-033). */
  key: 'llm' | 'auto-auth' | 'tabs' | 'capabilities' | 'sessions' | 'diagnostics' | 'compliance' | 'migration';
}

export const SETTINGS_SECTIONS: readonly SettingsSectionDescriptor[] = [
  { id: 'llm', title: 'LLM 配置', key: 'llm' },
  { id: 'auto-auth', title: '自动授权（按站点）', key: 'auto-auth' },
  { id: 'tabs', title: '标签页管理（隐私）', key: 'tabs' },
  { id: 'capabilities', title: '能力与隐私（可选权限）', key: 'capabilities' },
  { id: 'sessions', title: '会话分组（可选）', key: 'sessions' },
  { id: 'diagnostics', title: '环境自检 / 诊断', key: 'diagnostics' },
  { id: 'compliance', title: '合规与能力边界', key: 'compliance' },
  { id: 'migration', title: '迁移指引（不自动迁移）', key: 'migration' },
];

// ── TASK-033: settings entry copy (no more options-page navigation) ─────────

/**
 * Top settings entry label. The side panel opens the in-panel settings view —
 * The options-page opening API is never used as the settings entry anymore.
 */
export function settingsEntryLabel(llm: { configured: boolean; warn: boolean } | null): string {
  if (llm && llm.warn) return '⚙ 去配置模型';
  return '⚙ 设置';
}

/** Onboarding first step — points at the in-panel settings entry, never a page. */
export const ONBOARDING_SETTINGS_STEP = '配置模型：点击上方「⚙ 设置」，在当前面板内选择厂商并填入 API Key';
