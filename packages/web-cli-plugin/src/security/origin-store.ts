/**
 * Per-origin authorization / trust store (FR-023 / FR-012).
 *
 * Authorization (may we act on this origin) and trust (do we trust its
 * declaration) are separate fields. Every change is audited. The storage
 * backend is injected so the module is node-testable.
 */
import type { PluginAuditSink } from './audit-sink.js';

export interface PluginKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export type TrustState = 'untrusted' | 'trusted';

export interface OriginRecord {
  origin: string;
  authorized: boolean;
  trust: TrustState;
  authorizedAt?: number;
  updatedAt: number;
  note?: string;
}

export interface OriginStore {
  list(): Promise<OriginRecord[]>;
  get(origin: string): Promise<OriginRecord | undefined>;
  authorize(origin: string, opts?: { note?: string }): Promise<OriginRecord>;
  revoke(origin: string): Promise<boolean>;
  setTrust(origin: string, trust: TrustState): Promise<OriginRecord>;
  isAuthorized(origin: string): Promise<boolean>;
  trustOf(origin: string): Promise<TrustState>;
}

export const ORIGINS_STORAGE_KEY = 'web-cli:origins';

/** Normalize an origin string (lowercase scheme+host, drop trailing slash). */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase();
}

export function createOriginStore(
  kv: PluginKv,
  opts: { now?: () => number; audit?: PluginAuditSink } = {},
): OriginStore {
  const now = opts.now ?? (() => Date.now());
  const audit = opts.audit;

  const readAll = async (): Promise<Record<string, OriginRecord>> => {
    const stored = await kv.get<Record<string, OriginRecord>>(ORIGINS_STORAGE_KEY);
    return stored && typeof stored === 'object' ? stored : {};
  };
  const writeAll = async (all: Record<string, OriginRecord>): Promise<void> => {
    await kv.set(ORIGINS_STORAGE_KEY, all);
  };

  return {
    async list() {
      const all = await readAll();
      return Object.values(all).sort((a, b) => a.origin.localeCompare(b.origin));
    },
    async get(origin) {
      const all = await readAll();
      return all[normalizeOrigin(origin)];
    },
    async authorize(origin, o) {
      const key = normalizeOrigin(origin);
      const all = await readAll();
      const prev = all[key];
      const ts = now();
      const record: OriginRecord = {
        origin: key,
        authorized: true,
        trust: prev?.trust ?? 'untrusted',
        authorizedAt: ts,
        updatedAt: ts,
        ...(o?.note ? { note: o.note } : prev?.note ? { note: prev.note } : {}),
      };
      all[key] = record;
      await writeAll(all);
      audit?.recordPlugin({ type: 'origin-authorize', ts, origin: key, trust: record.trust, detail: o?.note ?? '用户显式授权' });
      return record;
    },
    async revoke(origin) {
      const key = normalizeOrigin(origin);
      const all = await readAll();
      const prev = all[key];
      if (!prev || !prev.authorized) return false;
      const ts = now();
      all[key] = { ...prev, authorized: false, updatedAt: ts };
      await writeAll(all);
      audit?.recordPlugin({ type: 'origin-revoke', ts, origin: key, detail: '用户撤销授权' });
      return true;
    },
    async setTrust(origin, trust) {
      const key = normalizeOrigin(origin);
      const all = await readAll();
      const prev = all[key];
      const ts = now();
      const record: OriginRecord = {
        origin: key,
        authorized: prev?.authorized ?? false,
        trust,
        ...(prev?.authorizedAt ? { authorizedAt: prev.authorizedAt } : {}),
        updatedAt: ts,
        ...(prev?.note ? { note: prev.note } : {}),
      };
      all[key] = record;
      await writeAll(all);
      audit?.recordPlugin({ type: 'origin-authorize', ts, origin: key, trust, detail: `信任态变更为 ${trust}` });
      return record;
    },
    async isAuthorized(origin) {
      const rec = await this.get(origin);
      return rec?.authorized === true;
    },
    async trustOf(origin) {
      const rec = await this.get(origin);
      return rec?.trust === 'trusted' ? 'trusted' : 'untrusted';
    },
  };
}
