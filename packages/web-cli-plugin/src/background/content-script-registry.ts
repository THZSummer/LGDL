/**
 * Declarative site content-script registry (author decision ① / FR-047 / ADR-014).
 *
 * Once a site is authorized **and** its optional host permission is granted, the
 * content script is registered *declaratively* via
 * `chrome.scripting.registerContentScripts({ persistAcrossSessions: true })` so
 * it loads automatically on every future navigation of that origin — no icon
 * click required, and **without** a blanket all-sites static injection
 * (`manifest.json` keeps zero static `content_scripts`; least privilege, FR-006).
 *
 * This module is pure wiring over an injected `ContentScriptsApi`, so the
 * register / unregister / reconcile decision table is node-testable. All failures
 * carry a readable reason (never a silent catch).
 *
 * Note: `registerContentScripts` **fails for an origin without host permission** —
 * callers must check the grant first (the service worker does); when it still
 * fails the reason is surfaced readably.
 */

/** Id prefix identifying plugin-managed site scripts (must not start with `_`). */
export const SITE_SCRIPT_ID_PREFIX = 'wcliSite_';

export interface RegisteredScriptLike {
  id: string;
  matches?: string[];
}

export interface SiteScriptRegistration {
  id: string;
  matches: string[];
  js: string[];
  runAt: 'document_idle';
  persistAcrossSessions: boolean;
}

export interface ContentScriptsApi {
  registerContentScripts(scripts: SiteScriptRegistration[]): Promise<void>;
  unregisterContentScripts(filter?: { ids?: string[] }): Promise<void>;
  getRegisteredContentScripts(filter?: { ids?: string[] }): Promise<RegisteredScriptLike[]>;
}

/** Deterministic 32-bit FNV-1a hash (hex) — stable id across SW restarts. */
export function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Deterministic, collision-resistant content-script id for an origin. */
export function siteContentScriptId(origin: string): string {
  return `${SITE_SCRIPT_ID_PREFIX}${stableHash(origin.trim().toLowerCase())}`;
}

/**
 * Origin match pattern for `registerContentScripts`, e.g. `https://a.test/*`.
 * Returns `null` for non-http(s) origins.
 */
export function siteMatchPattern(origin: string): string | null {
  try {
    const u = new URL(origin.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return `${u.origin}/*`;
  } catch {
    return null;
  }
}

/** Recover an origin from a registered script's match patterns (`<origin>/*`). */
export function originFromMatches(matches: readonly string[] | undefined): string | null {
  for (const pattern of matches ?? []) {
    const m = /^(https?:\/\/[^/]+)\/\*$/.exec(pattern);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

export interface SiteScriptResult {
  ok: boolean;
  id?: string;
  pattern?: string;
  /** Readable reason on failure (never silent). */
  reason?: string;
  /** True when the script was already registered (idempotent no-op). */
  alreadyRegistered?: boolean;
}

/** Register the declarative content script for one origin (idempotent). */
export async function registerSiteContentScript(api: ContentScriptsApi, origin: string): Promise<SiteScriptResult> {
  const pattern = siteMatchPattern(origin);
  if (!pattern) return { ok: false, reason: `无法为 ${origin || '当前站点'} 生成站点注入匹配式（仅支持 http(s) 站点）` };
  const id = siteContentScriptId(origin);
  try {
    const existing = await api.getRegisteredContentScripts({ ids: [id] });
    if (existing.some((s) => s.id === id)) return { ok: true, id, pattern, alreadyRegistered: true };
    await api.registerContentScripts([
      { id, matches: [pattern], js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true },
    ]);
    return { ok: true, id, pattern };
  } catch (err) {
    return {
      ok: false,
      id,
      pattern,
      reason: `声明式注入注册失败（可能未授予站点权限）：${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Unregister the declarative content script for one origin (best-effort, readable). */
export async function unregisterSiteContentScript(api: ContentScriptsApi, origin: string): Promise<SiteScriptResult> {
  const id = siteContentScriptId(origin);
  try {
    await api.unregisterContentScripts({ ids: [id] });
    return { ok: true, id };
  } catch (err) {
    return { ok: false, id, reason: `声明式注入移除失败：${err instanceof Error ? err.message : String(err)}` };
  }
}

export interface ReconcileReport {
  registered: string[];
  alreadyRegistered: string[];
  removed: string[];
  failures: Array<{ origin: string; action: 'register' | 'remove'; reason: string }>;
}

/**
 * Reconcile the declarative registrations against the desired origin set
 * (authorized + host-permission-granted). **补齐缺失 / 清理已撤销**；every failure
 * is reported readably, never swallowed.
 */
export async function reconcileSiteContentScripts(
  api: ContentScriptsApi,
  desiredOrigins: readonly string[],
): Promise<ReconcileReport> {
  const report: ReconcileReport = { registered: [], alreadyRegistered: [], removed: [], failures: [] };
  const desired = new Set(desiredOrigins.map((o) => o.trim().toLowerCase()).filter(Boolean));

  let managed: RegisteredScriptLike[] = [];
  try {
    managed = (await api.getRegisteredContentScripts()).filter((s) => s.id.startsWith(SITE_SCRIPT_ID_PREFIX));
  } catch (err) {
    report.failures.push({
      origin: '(all)',
      action: 'remove',
      reason: `读取已注册声明式注入失败：${err instanceof Error ? err.message : String(err)}`,
    });
    return report;
  }

  // 清理：registered but no longer desired (revoked / host permission dropped).
  const registeredOrigins = new Set<string>();
  for (const script of managed) {
    const origin = originFromMatches(script.matches);
    if (origin) registeredOrigins.add(origin);
    if (!origin || desired.has(origin)) continue;
    try {
      await api.unregisterContentScripts({ ids: [script.id] });
      report.removed.push(origin);
    } catch (err) {
      report.failures.push({
        origin,
        action: 'remove',
        reason: `清理已撤销站点注入失败：${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 补齐：desired but missing (authorized before this build / storage drift).
  for (const origin of desired) {
    if (registeredOrigins.has(origin)) {
      report.alreadyRegistered.push(origin);
      continue;
    }
    const res = await registerSiteContentScript(api, origin);
    if (res.ok && res.alreadyRegistered) report.alreadyRegistered.push(origin);
    else if (res.ok) report.registered.push(origin);
    else report.failures.push({ origin, action: 'register', reason: res.reason ?? '未知原因' });
  }

  return report;
}
