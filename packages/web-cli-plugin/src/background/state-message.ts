/**
 * Side-panel `state` message payload (FR-017 / W1).
 *
 * The background owns the persisted `OriginStore`; the side panel does not.
 * Every `state` request must therefore carry the bound origin's authorization
 * so a panel reload / service-worker restart cannot show a stale "未授权" while
 * the origin is still authorized (users would re-authorize for no reason).
 *
 * Kept dependency-free (a plain async projection) so it is node-testable.
 */
import type { AutoAuthSettings } from '../security/auto-authorize.js';
import type { AutoProbeStatus } from '../discovery/auto-probe.js';

export interface ActiveSessionView {
  tabId: number;
  origin: string;
  discoveryState?: string;
  /** Readable discovery failure reason (TASK-019 任务 B). */
  discoveryReason?: string;
  invalidated: boolean;
}

/**
 * Non-sensitive projection of the current browser tab (TASK-020 任务 B).
 *
 * The side panel needs to explain *why* there is no active site (restricted
 * page vs. not-bound-yet vs. no tab) — none of which the controller knows. Only
 * `origin` is carried (never the full URL / title / content), so no page data
 * leaks to the panel.
 */
export interface ActiveTabView {
  /** Whether a tab is currently active in this window. */
  present: boolean;
  /** Origin of the active tab when it is an injectable http(s) page. */
  origin?: string;
  /** True when the plugin cannot inject into this tab. */
  restricted: boolean;
  /**
   * True when Chrome gave the plugin no URL at all (D-064). This is the common
   * "未绑定" state: without the `tabs` permission / an activeTab grant from an
   * icon click, `chrome.tabs.query().url` is `undefined` even for a perfectly
   * normal http(s) page. It is *not* a restricted page, so the panel must not
   * claim "不可注入" — it must point at the icon click instead.
   */
  addressUnreadable?: boolean;
  /** Readable reason when restricted / no tab. */
  reason?: string;
}

const WEBSTORE_HOSTS = ['chrome.google.com/webstore', 'chromewebstore.google.com'];

/** A readable reason for a tab the plugin cannot inject into. */
export function restrictedPageReason(url: string): string {
  if (url.startsWith('chrome://')) return '浏览器内置页面（chrome://），扩展无法注入';
  if (url.startsWith('chrome-extension://')) return '扩展页面（chrome-extension://），扩展无法注入';
  if (url.startsWith('edge://')) return '浏览器内置页面（edge://），扩展无法注入';
  if (url.startsWith('devtools://')) return '开发者工具页面，扩展无法注入';
  if (url.startsWith('about:')) return '浏览器空白/内置页面（about:），扩展无法注入';
  if (url.startsWith('file://')) return '本地文件页面（file://），扩展默认无法注入';
  if (WEBSTORE_HOSTS.some((h) => url.includes(h))) return '浏览器应用商店页面，扩展禁止注入';
  if (!url)
    return (
      '无法读取当前标签页地址（Chrome 尚未把该地址交给插件——通常是还没在目标站点点击插件图标授权）；' +
      '请在目标站点标签页点击浏览器工具栏的插件图标'
    );
  return '当前标签页不是 http(s) 站点，扩展无法注入';
}

/**
 * Project a `chrome.tabs.Tab`-like object to the non-sensitive panel view.
 * Pure and node-testable — no chrome API touched here.
 */
export function projectActiveTab(tab: { url?: string } | undefined | null): ActiveTabView {
  if (!tab) return { present: false, restricted: true, reason: '没有可用标签页' };
  const url = tab.url ?? '';
  // D-064: an empty/absent URL is *unreadable*, not restricted. Chrome hides
  // `tab.url` until the extension holds `tabs` or a host/activeTab grant, so the
  // very common "user is on the site but has not clicked the icon" case lands
  // here. Report it distinctly so the panel can point at the actionable fix.
  if (!url) {
    return { present: true, restricted: true, addressUnreadable: true, reason: restrictedPageReason('') };
  }
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') ||
      url.startsWith('devtools://') || url.startsWith('about:') || url.startsWith('file://') ||
      WEBSTORE_HOSTS.some((h) => url.includes(h))) {
    return { present: true, restricted: true, reason: restrictedPageReason(url) };
  }
  let origin: string | undefined;
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') origin = u.origin;
  } catch {
    /* not a parseable URL (about:blank, empty, …) → treated as restricted */
  }
  if (!origin) return { present: true, restricted: true, reason: restrictedPageReason(url) };
  return { present: true, origin, restricted: false };
}

export interface StateMessagePayload {
  active: ActiveSessionView | null;
  tools: string[];
  /**
   * OriginStore authorization of the bound origin. Semantics: "is this origin
   * authorized" — always `false` when there is no bound origin.
   */
  authorized: boolean;
  /**
   * TASK-023: trust of the bound origin (`trusted`/`untrusted`). Trust and
   * authorization are separate concerns (FR-012); the panel only displays it.
   * Always `untrusted` when there is no bound origin.
   */
  trust: 'trusted' | 'untrusted';
  /** Non-sensitive active-tab projection (TASK-020 任务 B). */
  tab?: ActiveTabView | null;
  /** decision ② / FR-048: the current multi-session projection (null when unbound). */
  session?: SessionView | null;
  /**
   * FR-052 / ADR-017: the bound origin's auto-authorization switches. Carried so
   * the side panel's checkboxes/badge stay in sync with the authoritative store
   * (and reflect an immediate off). Absent when no origin / no lookup supplied.
   */
  autoAuth?: AutoAuthSettings;
  /**
   * TASK-032: automatic discovery-probe projection for the bound origin. Carries
   * the retry count / latest reason / temporary-vs-terminal class so the panel can
   * render「正在自动探测…（第 N 次重试）」without ever exposing an internal phase
   * name or asking the user to click a manual retry button.
   */
  probe?: AutoProbeStatus | null;
}

/** decision ② / FR-048: non-sensitive multi-session projection for the panel. */
export interface SessionView {
  sessionId: string;
  label: string;
  origins: string[];
  authorized: boolean;
}

export async function buildStateMessage(input: {
  active: ActiveSessionView | null;
  tools: string[];
  isAuthorized: (origin: string) => Promise<boolean>;
  /** TASK-023: optional trust lookup; absent → `untrusted` for every origin. */
  trustOf?: (origin: string) => Promise<'trusted' | 'untrusted'>;
  tab?: ActiveTabView | null;
  session?: SessionView | null;
  /** FR-052: optional auto-authorization lookup for the bound origin. */
  autoAuthOf?: (origin: string) => AutoAuthSettings;
  /** TASK-032: optional automatic-probe projection for the bound origin. */
  probe?: AutoProbeStatus | null;
}): Promise<StateMessagePayload> {
  const { active, tools, isAuthorized } = input;
  const authorized = active ? await isAuthorized(active.origin) : false;
  const trust = active && input.trustOf ? await input.trustOf(active.origin) : 'untrusted';
  const autoAuth = active && input.autoAuthOf ? input.autoAuthOf(active.origin) : undefined;
  return {
    active,
    tools,
    authorized,
    trust: trust === 'trusted' ? 'trusted' : 'untrusted',
    tab: input.tab ?? null,
    session: input.session ?? null,
    ...(autoAuth ? { autoAuth } : {}),
    ...(input.probe ? { probe: input.probe } : {}),
  };
}

