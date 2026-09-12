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
      ? '已开启：LLM 工具面包含 tabs（list / switch / open；不含 close）。'
      : '已开启：tabs 应已进入 LLM 工具面（若未显示，请重新加载扩展）。';
  }
  return hasTool
    ? '⚠ 已关闭但工具面仍含 tabs：请重新加载扩展后重试（这是异常，不静默）。'
    : '已关闭：tabs 已从 LLM 工具面移除（助手无法查看/切换标签页）。';
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
  key: 'llm' | 'auto-auth' | 'tabs' | 'sessions' | 'diagnostics' | 'compliance' | 'migration';
}

export const SETTINGS_SECTIONS: readonly SettingsSectionDescriptor[] = [
  { id: 'llm', title: 'LLM 配置', key: 'llm' },
  { id: 'auto-auth', title: '自动授权（按站点）', key: 'auto-auth' },
  { id: 'tabs', title: '标签页管理（隐私）', key: 'tabs' },
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
