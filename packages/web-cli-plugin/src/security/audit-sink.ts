/**
 * AuditSink implementation backed by `chrome.storage` (FR-025 / NFR-003).
 *
 * Records a ring buffer (bounded) of audit events with a dropped counter, and
 * supports replay/export. Audit must never break the main flow: writes are
 * best-effort and failures are logged (never swallowed silently).
 *
 * The storage backend is injected (`AuditKv`), so this module is node-testable.
 */
import type { AuditEvent, AuditSink } from '@lgdl/web-cli-base';
import { summarizeArgs } from './redact.js';

/** Async KV backend (structurally compatible with `OriginStore`'s backend). */
export interface AuditKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Plugin-specific audit event types (base union stays untouched). */
export type PluginAuditEventType =
  | 'origin-authorize'
  | 'origin-revoke'
  | 'host-permission'
  | 'descriptor-read'
  | 'protocol-version'
  | 'confirm'
  | 'llm-config'
  | 'tabs';

export interface PluginAuditEvent {
  type: AuditEvent['type'] | PluginAuditEventType;
  ts: number;
  tool?: string;
  subcommand?: string;
  decision?: string;
  reason?: string;
  by?: string;
  ok?: boolean;
  durationMs?: number;
  outputChars?: number;
  origin?: string;
  trust?: 'untrusted' | 'trusted';
  risk?: string;
  /** Masked argument summary — never raw plaintext. */
  argsSummary?: string;
  /** Raw args bag; the sink masks it into `argsSummary` on record (never stored raw). */
  args?: Record<string, string>;
  detail?: string;
}

export interface PluginAuditSink extends AuditSink {
  readonly events: PluginAuditEvent[];
  readonly dropped: number;
  /** Hydrate from storage (call once at startup). */
  load(): Promise<void>;
  /** Persist the current buffer. */
  flush(): Promise<void>;
  /** Record a plugin-specific event. */
  recordPlugin(event: PluginAuditEvent): void;
  /** Read the persisted events (replay/export). */
  exportEvents(): Promise<PluginAuditEvent[]>;
  /** Clear the buffer (memory + storage). */
  clear(): Promise<void>;
}

export const AUDIT_STORAGE_KEY = 'web-cli:audit';
export const DEFAULT_AUDIT_CAPACITY = 500;

interface PersistedAudit {
  events: PluginAuditEvent[];
  dropped: number;
}

function sanitize(event: PluginAuditEvent & { args?: Record<string, string> }): PluginAuditEvent {
  const { args, ...rest } = event;
  return {
    ...rest,
    ...(args ? { argsSummary: summarizeArgs(args) } : {}),
  };
}

export function createStorageAuditSink(
  kv: AuditKv,
  opts: { capacity?: number; now?: () => number; onError?: (err: unknown) => void } = {},
): PluginAuditSink {
  const capacity = opts.capacity ?? DEFAULT_AUDIT_CAPACITY;
  const now = opts.now ?? (() => Date.now());
  const onError = opts.onError ?? ((err: unknown) => console.warn('[web-cli-plugin] audit persist failed:', err));
  let events: PluginAuditEvent[] = [];
  let dropped = 0;
  let dirty = false;

  const persist = async (): Promise<void> => {
    try {
      await kv.set(AUDIT_STORAGE_KEY, { events, dropped } satisfies PersistedAudit);
      dirty = false;
    } catch (err) {
      onError(err);
    }
  };

  return {
    get events() {
      return events;
    },
    get dropped() {
      return dropped;
    },
    record(event: AuditEvent) {
      this.recordPlugin(event as unknown as PluginAuditEvent);
    },
    recordPlugin(event: PluginAuditEvent) {
      const ev = sanitize({ ...event, ts: event.ts || now() });
      events.push(ev);
      if (events.length > capacity) {
        const overflow = events.length - capacity;
        events.splice(0, overflow);
        dropped += overflow;
      }
      dirty = true;
      // best-effort async persist; explicit flush() is available for deterministic tests
      void persist();
    },
    async load() {
      try {
        const stored = await kv.get<PersistedAudit>(AUDIT_STORAGE_KEY);
        if (stored && Array.isArray(stored.events)) {
          events = stored.events.slice(-capacity);
          dropped = typeof stored.dropped === 'number' ? stored.dropped : 0;
        }
      } catch (err) {
        onError(err);
      }
    },
    async flush() {
      await persist();
    },
    async exportEvents() {
      return events.map((e) => ({ ...e }));
    },
    async clear() {
      events = [];
      dropped = 0;
      try {
        await kv.remove(AUDIT_STORAGE_KEY);
      } catch (err) {
        onError(err);
      }
      dirty = false;
    },
  };
}
