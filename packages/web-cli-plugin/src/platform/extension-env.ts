/**
 * PlatformEnv implementation for the extension background (ADR-002 / ADR-005).
 *
 * - `fetch`   → extension-privileged fetch (host-permission gated)
 * - `kv`      → synchronous view over `chrome.storage.local` (non-secret settings)
 * - `dom`/`events` → remote seams via the content script (wave 2+, optional)
 *
 * Secrets (LLM keys) never use `kv`; they live in the dedicated key-store.
 * The chrome API is only touched inside these factories, keeping the rest of the
 * plugin importable in node for unit tests.
 */
import type { PlatformEnv, PlatformKv } from '@lgdl/web-cli-base';

/** Async KV backed by `chrome.storage.local` (used by security stores). */
export interface AsyncKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

function storageArea(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

/** Async KV over `chrome.storage.local`, key-prefixed per namespace. */
export function createChromeAsyncKv(prefix = 'web-cli'): AsyncKv {
  const full = (key: string) => `${prefix}:${key}`;
  return {
    async get<T>(key: string) {
      const res = await storageArea().get(full(key));
      return res[full(key)] as T | undefined;
    },
    async set(key: string, value: unknown) {
      await storageArea().set({ [full(key)]: value });
    },
    async remove(key: string) {
      await storageArea().remove(full(key));
    },
  };
}

/** Session-scoped async KV over `chrome.storage.session` (runtime state, EC-013). */
export function createChromeSessionKv(prefix = 'web-cli'): AsyncKv {
  const full = (key: string) => `${prefix}:${key}`;
  return {
    async get<T>(key: string) {
      const res = await chrome.storage.session.get(full(key));
      return res[full(key)] as T | undefined;
    },
    async set(key: string, value: unknown) {
      await chrome.storage.session.set({ [full(key)]: value });
    },
    async remove(key: string) {
      await chrome.storage.session.remove(full(key));
    },
  };
}

export interface SyncKvHandle {
  kv: PlatformKv;
  /** Hydrate the in-memory cache from storage (call once at startup). */
  hydrate(): Promise<void>;
}

/**
 * Synchronous `PlatformKv` view (upstream contract is sync) with write-through to
 * `chrome.storage.local`. Values are cached in memory after hydration; writes are
 * fire-and-forget persisted. Suitable for non-secret settings only.
 */
export function createChromeSyncKv(prefix = 'web-cli'): SyncKvHandle {
  const cache = new Map<string, string>();
  const full = (key: string) => `${prefix}:${key}`;
  const kv: PlatformKv = {
    get(key) {
      return cache.has(key) ? (cache.get(key) as string) : null;
    },
    set(key, value) {
      cache.set(key, value);
      void storageArea().set({ [full(key)]: value });
    },
    remove(key) {
      cache.delete(key);
      void storageArea().remove(full(key));
    },
  };
  return {
    kv,
    async hydrate() {
      const res = await storageArea().get(null);
      for (const [k, v] of Object.entries(res)) {
        if (k.startsWith(`${prefix}:`) && typeof v === 'string') cache.set(k.slice(prefix.length + 1), v);
      }
    },
  };
}

/** Extension fetch (privileged; host permissions govern reachability). */
export function chromeFetch(): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)) as typeof fetch;
}

export interface ExtensionEnvOptions {
  /** Injected overrides (tests / wave-2 remote seams). */
  overrides?: Partial<PlatformEnv>;
  /** Sync kv namespace (default `web-cli`). */
  namespace?: string;
}

/**
 * Build the background `PlatformEnv`. `dom`/`events` are intentionally absent in
 * P0 (wave 2 remote DOM seam); capability callers translate the missing seam.
 */
export function extensionEnv(opts: ExtensionEnvOptions = {}): PlatformEnv {
  const syncKv = createChromeSyncKv(opts.namespace ?? 'web-cli');
  const env: PlatformEnv = {
    kind: 'browser',
    fetch: chromeFetch(),
    kv: syncKv.kv,
    permissions: {
      async query(name: string) {
        try {
          const granted = await chrome.permissions.contains({ permissions: [name as chrome.runtime.ManifestPermission] });
          return granted ? 'granted' : 'prompt';
        } catch {
          return 'prompt';
        }
      },
    },
    ...(opts.overrides ?? {}),
  };
  return env;
}
