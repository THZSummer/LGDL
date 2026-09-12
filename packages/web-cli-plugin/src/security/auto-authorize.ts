/**
 * Per-origin auto-authorization (FR-052 / ADR-017).
 *
 * The author requirement: two checkboxes「读操作自动」/「写操作自动」. When a tier
 * is enabled **for a given origin**, an operation of that tier no longer opens the
 * manual second-confirmation dialog.
 *
 * This module is the *policy* half (pure, node-testable): it decides whether a
 * concrete `ask` may be auto-resolved to `allow`. The *state* half
 * ({@link createAutoAuthStore}) persists the per-origin switches and audits every
 * change. Both live behind the injected storage backend so nothing here touches
 * `chrome.*`.
 *
 * ── HARD FLOOR (never bypassed by this switch; also surfaced verbatim in UI/docs)
 *   1. unauthorized origin            → still `deny` (S1; authorization ≠ auto-auth)
 *   2. unknown / missing / illegal risk → still `deny` (S3, fail-closed)
 *   3. `evaluate` tier                → still `deny` (design floor, never allow)
 *   4. destructive write              → still `ask` (denylist verbs; NOT in write-auto)
 *   5. `ui` / `state` / `external`    → no auto switch this round (still `ask`)
 *
 * The switch is **not** a global toggle: settings are keyed by normalized origin,
 * matching the existing per-origin authorization model (FR-023).
 */
import type { ToolRisk } from '@lgdl/web-cli-base';
import type { PluginAuditSink } from './audit-sink.js';
import { normalizeOrigin } from './origin-store.js';

/** The only two tiers this round can auto-authorize. */
export type AutoRiskTier = 'read' | 'write';

export interface AutoAuthSettings {
  /** Read-tier auto (default true: current behavior already allows reads). */
  read: boolean;
  /** Write-tier auto (default false: opt-in, and excludes destructive ops). */
  write: boolean;
}

export interface AutoAuthRecord extends AutoAuthSettings {
  origin: string;
  updatedAt: number;
}

export interface AutoAuthKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Storage key (namespaced by the injected `chrome.storage` kv). */
export const AUTO_AUTH_STORAGE_KEY = 'web-cli:auto-auth';

/**
 * Defaults — read auto ON (identical to the current `read→allow` policy), write
 * auto OFF. A missing/invalid record always resolves to these defaults so the
 * fail-safe direction is preserved.
 */
export const AUTO_AUTH_DEFAULTS: Readonly<AutoAuthSettings> = { read: true, write: false };

/** Hard-floor copy that must stay visible next to the checkboxes. */
export const AUTO_AUTH_HARD_LINES: readonly string[] = [
  '写操作自动不含破坏性操作（删除 / 清空 / 重置等仍需确认）。',
  'evaluate 档与未授权站点永不自动放行。',
];

/** Single-line hard-floor summary (side panel / options). */
export const AUTO_AUTH_NOTE = AUTO_AUTH_HARD_LINES.join('');

/** The always-visible marker shown while auto-authorization is active. */
export function autoAuthBadge(settings: AutoAuthSettings | undefined): string {
  if (!settings) return '';
  const tiers: string[] = [];
  if (settings.read) tiers.push('读');
  if (settings.write) tiers.push('写');
  return tiers.length ? `⚡ 自动授权：${tiers.join('+')}` : '';
}

export interface AutoAuthStore {
  /** Hydrate the cached map from storage (call once at startup). */
  load(): Promise<void>;
  /** Effective settings for an origin (persisted value or documented defaults). */
  get(origin: string): AutoAuthSettings;
  /** True when the origin has an explicit persisted record. */
  has(origin: string): boolean;
  /** Persisted records (sorted by origin) — options page management view. */
  list(): AutoAuthRecord[];
  /** Merge + persist a partial settings change; returns the full record. */
  set(origin: string, next: Partial<AutoAuthSettings>): Promise<AutoAuthRecord>;
  /** One-click off for an origin: disable BOTH tiers; returns the (new) record. */
  clear(origin: string): Promise<AutoAuthRecord>;
  /** Whether `tier` is auto-authorized for `origin` (defaults when unset). */
  isEnabled(origin: string, tier: AutoRiskTier): boolean;
}

const boolOf = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

/** One safe implementation of `set` used by both `set` and `clear`. */
function normalizeRecord(origin: string, stored: unknown, ts: number): AutoAuthRecord | undefined {
  if (!stored || typeof stored !== 'object') return undefined;
  const rec = stored as Partial<AutoAuthRecord>;
  return {
    origin,
    read: boolOf(rec.read, AUTO_AUTH_DEFAULTS.read),
    write: boolOf(rec.write, AUTO_AUTH_DEFAULTS.write),
    updatedAt: typeof rec.updatedAt === 'number' ? rec.updatedAt : ts,
  };
}

export function createAutoAuthStore(
  kv: AutoAuthKv,
  opts: { now?: () => number; audit?: PluginAuditSink } = {},
): AutoAuthStore {
  const now = opts.now ?? (() => Date.now());
  const audit = opts.audit;
  let records = new Map<string, AutoAuthRecord>();

  const persist = async (): Promise<void> => {
    const all: Record<string, AutoAuthRecord> = {};
    for (const rec of records.values()) all[rec.origin] = rec;
    await kv.set(AUTO_AUTH_STORAGE_KEY, all);
  };

  return {
    async load() {
      records = new Map();
      try {
        const stored = await kv.get<Record<string, unknown>>(AUTO_AUTH_STORAGE_KEY);
        if (stored && typeof stored === 'object') {
          for (const [rawOrigin, raw] of Object.entries(stored)) {
            const origin = normalizeOrigin(rawOrigin);
            const rec = normalizeRecord(origin, raw, now());
            if (rec) records.set(origin, rec);
          }
        }
      } catch (err) {
        // A read failure keeps the documented defaults (read auto on, write auto
        // off). Never silently flip to "everything auto": that would widen
        // permission on a storage error.
        records = new Map();
        void err;
      }
    },
    get(origin) {
      const key = normalizeOrigin(origin);
      const rec = records.get(key);
      return rec ? { read: rec.read, write: rec.write } : { ...AUTO_AUTH_DEFAULTS };
    },
    has(origin) {
      return records.has(normalizeOrigin(origin));
    },
    list() {
      return [...records.values()].sort((a, b) => a.origin.localeCompare(b.origin)).map((r) => ({ ...r }));
    },
    async set(origin, next) {
      const key = normalizeOrigin(origin);
      const prev = records.get(key);
      const ts = now();
      const rec: AutoAuthRecord = {
        origin: key,
        read: boolOf(next.read, prev?.read ?? AUTO_AUTH_DEFAULTS.read),
        write: boolOf(next.write, prev?.write ?? AUTO_AUTH_DEFAULTS.write),
        updatedAt: ts,
      };
      records.set(key, rec);
      await persist();
      const tier: AutoRiskTier | undefined = next.read !== undefined ? 'read' : next.write !== undefined ? 'write' : undefined;
      if (tier) {
        const enabled = rec[tier] === true;
        audit?.recordPlugin({
          type: 'auto-authorize',
          ts,
          origin: key,
          risk: tier,
          decision: enabled ? 'enabled' : 'disabled',
          reason: `自动授权（用户设置）：${tier} 档已${enabled ? '开启' : '关闭'}（按 origin）`,
          detail: `origin=${key}；${tier}=${rec[tier]}（设置变更，非放行记录）`,
        });
      }
      return { ...rec };
    },
    async clear(origin) {
      const key = normalizeOrigin(origin);
      const ts = now();
      // One-click off disables BOTH tiers (not "restore defaults"): the read tier
      // is on by default, so restoring it would keep the marker visible and fail
      // to honour the user's "关闭" intent.
      const rec: AutoAuthRecord = { origin: key, read: false, write: false, updatedAt: ts };
      records.set(key, rec);
      await persist();
      audit?.recordPlugin({
        type: 'auto-authorize',
        ts,
        origin: key,
        decision: 'disabled',
        reason: '自动授权（用户设置）：已关闭该站点的读/写自动授权',
        detail: `origin=${key}；一键关闭自动授权（读+写都关）`,
      });
      return { ...rec };
    },
    isEnabled(origin, tier) {
      const key = normalizeOrigin(origin);
      const rec = records.get(key);
      return rec ? rec[tier] === true : AUTO_AUTH_DEFAULTS[tier];
    },
  };
}

// ---------------------------------------------------------------------------
// Pure decision seam (host `onAsk` pre-check)
// ---------------------------------------------------------------------------

export interface AutoAuthDecision {
  /** True → resolve the ask as `allow` without a manual confirmation. */
  allow: boolean;
  /** The tier the decision applies to (when determined). */
  tier?: AutoRiskTier;
  /** True → the ask must be resolved as `deny` (never delegated to confirmation). */
  hardDeny?: boolean;
  /** Readable reason (audit / explanation). */
  reason: string;
}

/**
 * Decide whether a pending `ask` may be auto-resolved. Defaults to "do not
 * auto-allow" for anything outside the two supported, non-destructive tiers.
 *
 * `destructive` must come from the plugin's own denylist (never guessed): the
 * host derives it from the activated descriptor + invoked subcommand.
 */
export function decideAutoAuthorization(input: {
  origin?: string;
  group?: string;
  risk?: ToolRisk;
  destructive?: boolean;
  settings?: AutoAuthSettings;
}): AutoAuthDecision {
  const { origin, group, risk, destructive, settings } = input;
  if (!origin) return { allow: false, reason: '无绑定站点 origin，不自动放行（保持确认/拒绝）' };
  if (group !== 'site') return { allow: false, reason: '非站点工具不纳入按 origin 自动授权（保持确认/拒绝）' };
  // Hard floor 3: evaluate is a design floor — never auto, never even asked.
  if (risk === 'evaluate') {
    return { allow: false, hardDeny: true, reason: 'evaluate 档为设计硬底线，永不自动放行（直接拒绝）' };
  }
  // Hard floor 2: unknown / missing / illegal risk never reaches a manual allow.
  if (risk !== 'read' && risk !== 'write') {
    return { allow: false, hardDeny: true, reason: `${risk ?? '未知'} 档不可分类，fail-closed 直接拒绝` };
  }
  // Hard floor 4: destructive write stays on the manual-confirmation path.
  if (risk === 'write' && destructive) {
    return { allow: false, reason: '破坏性写操作不纳入「写操作自动」，仍需人工确认' };
  }
  const tier: AutoRiskTier = risk;
  const enabled = settings ? settings[tier] === true : false;
  if (!enabled) return { allow: false, tier, reason: `${tier} 档未开启自动授权，保持人工确认` };
  return {
    allow: true,
    tier,
    reason: `自动授权（用户设置）：${tier} 档非破坏性操作，按用户设置直接放行（未经人工二次确认）`,
  };
}
