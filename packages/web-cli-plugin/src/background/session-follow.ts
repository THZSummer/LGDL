/**
 * D-128 / TASK-031: tab-follow by URL (session following on tab switch / navigation).
 *
 * We hold the `tabs` permission, so `tab.url` is **authoritative**: a tab switch
 * (or a completed navigation) can resolve the origin and adopt that origin's
 * session *before* — and without — any content-script handshake. This is the fix
 * for the real defect "switching to a new domain's TAB never auto-creates a
 * session; the old registration only bound via the content-script `whoami`
 * handshake, which cannot exist for an origin that has not been injected yet".
 *
 * Behaviour (see tasks.md TASK-031 / build.md §29):
 *  - http(s) origin  → activate/adopt (create when missing) that origin's session
 *    and push it to the panel (`session-changed`), regardless of authorization.
 *    A new/unauthorized origin gets its own session — it is **not** a dead end.
 *  - authorized      → additionally ensure the content script + kick discovery so
 *    the site tools assemble without an icon click.
 *  - unauthorized    → adopt the session but perform **zero injection**; the
 *    panel shows the「授权当前站点」path. Auto-switch ≠ auto-authorize.
 *  - restricted/unreadable URL → try the `whoami` handshake as a supplement, then
 *    fall back to the pre-existing readable "stale" degradation; never create a
 *    session and never inject.
 *
 * Dependency-injected (no `chrome.*` here) so the full decision table is
 * node-testable with mock chrome.
 */

export interface FollowActiveBinding {
  tabId: number;
  origin: string;
  sessionId: string;
  invalidated: boolean;
}

export interface FollowTabDeps {
  /** Current binding (null before the first bind). */
  current(): FollowActiveBinding | null;
  /** Read the tab's URL; `undefined` when unreadable (restricted / gone). */
  getTabUrl(tabId: number): Promise<string | undefined>;
  /** Content-script `whoami` handshake; `false` on a silent miss (no script). */
  autoBindFromTab(tabId: number): Promise<boolean>;
  /** Adopt an origin's existing session (create when missing) and push the panel. */
  bindOrigin(tabId: number, origin: string): Promise<void>;
  isAuthorized(origin: string): Promise<boolean>;
  /** Ensure the content script is present; `false` when injection failed. */
  ensureContentScript(tabId: number): Promise<boolean>;
  /** Ask the content script to re-run discovery (fire-and-forget). */
  kickDiscovery(tabId: number): void;
  /** Mark the current binding stale (restricted-page readable degradation). */
  markStale(): void;
  persist(): Promise<void>;
  /** One-shot readable panel notice. */
  notice(text: string): void;
}

export type FollowReason = 'activated' | 'navigated';

export interface FollowOutcome {
  action: 'bound' | 'handshake-bound' | 'stale' | 'noop';
  origin?: string;
  authorized?: boolean;
  injected?: boolean;
}

/** Origin of an http(s) URL, or null for restricted / unparseable / empty URLs. */
export function tabOrigin(url: string | undefined): string | null {
  try {
    const u = new URL(url ?? '');
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
  } catch {
    /* restricted / unparseable */
  }
  return null;
}

/**
 * Follow the active tab. Idempotent: an already-active binding for the same
 * tab+origin (not invalidated) is a no-op, so a `whoami` handshake racing this
 * path never double-binds or re-notifies.
 */
export async function followActiveTab(
  deps: FollowTabDeps,
  tabId: number,
  reason: FollowReason = 'activated',
): Promise<FollowOutcome> {
  const url = await deps.getTabUrl(tabId).catch(() => undefined);
  const origin = tabOrigin(url);

  if (!origin) {
    // The URL could not be read. Keep the `whoami` handshake as a supplement /
    // fallback (a content script — from a prior activeTab injection — may still
    // identify the tab). Only when that also misses do we degrade readably.
    if (await deps.autoBindFromTab(tabId)) return { action: 'handshake-bound' };
    const cur = deps.current();
    // No bound session → nothing to invalidate (the old `if (!session) return;`
    // must not block the *URL* path, but on the restricted path there is simply
    // no session to mark stale).
    if (!cur) return { action: 'noop' };
    if (cur.invalidated) return { action: 'noop' };
    deps.markStale();
    deps.notice(
      '已切换标签页：当前标签页不支持注入（浏览器内置/扩展页面或地址不可读），原绑定站点已标记失效。' +
        '请在目标站点标签页点击插件工具栏图标，或先在侧栏「授权当前站点」。',
    );
    await deps.persist();
    return { action: 'stale' };
  }

  const cur = deps.current();
  // Already the active binding for this tab+origin and still valid → idempotent
  // no-op (do not re-bind, do not re-notify).
  if (cur && cur.tabId === tabId && cur.origin === origin && !cur.invalidated) {
    return { action: 'noop' };
  }

  // URL-driven: adopt/create the origin's session BEFORE any handshake. Same
  // origin → the same session is reused (no new session; LRU untouched beyond a
  // touch); a new origin → a new session is created. The panel is pushed the
  // `session-changed` event from inside `bindOrigin`, so an open side panel
  // follows without being reopened.
  await deps.bindOrigin(tabId, origin);

  const authorized = await deps.isAuthorized(origin);
  let injected = false;
  if (authorized) {
    injected = await deps.ensureContentScript(tabId);
    if (injected) {
      // Force a fresh discovery so the site tools assemble without an icon click.
      deps.kickDiscovery(tabId);
      deps.notice(`已自动识别站点 ${origin}（无需点击图标），已切换到对应会话。`);
    } else {
      deps.notice(
        `已切换到 ${origin} 的会话，但页面脚本注入失败（页面可能受限或尚未加载完成）；刷新页面或切换标签页后插件会自动重试探测。`,
      );
    }
  } else {
    // Auto-switch ≠ auto-authorize: the session is adopted, but we do **not**
    // inject and we do not error — the panel exposes the actionable「授权当前站点」.
    deps.notice(`已切换到站点 ${origin} 的会话；该站点尚未授权，可点【授权当前站点】后使用站点工具。`);
  }

  await deps.persist();
  return { action: 'bound', origin, authorized, injected };
}
