/**
 * LLM key store (FR-033 / FR-035, ADR-005 / S-007 / S-015).
 *
 * Keys live in `chrome.storage.local` (never `sync`), are only read by the
 * background, and are never echoed in plaintext. The plugin does NOT read or
 * write the built-in assistant's page-storage settings (no auto migration).
 */
import { PROVIDERS, providerById, DEFAULT_MAX_ROUNDS, type ProviderId } from './providers.js';

/** Async KV backend (structurally compatible with the security stores). */
export interface KeyKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface LlmSettings {
  providerId: ProviderId;
  apiKey: string;
  model: string;
  baseURL?: string;
  maxRounds?: number;
}

export interface MaskedLlmConfig {
  providerId: ProviderId;
  providerName: string;
  model: string;
  baseURL?: string;
  maxRounds: number;
  /** True when a key is stored — the only key-derived information exposed. */
  hasKey: boolean;
  browserDirect: boolean;
}

export interface KeyStore {
  load(): Promise<LlmSettings>;
  save(settings: LlmSettings): Promise<void>;
  loadProvider(providerId: ProviderId): Promise<LlmSettings>;
  clear(providerId?: ProviderId): Promise<void>;
  maskedConfig(): Promise<MaskedLlmConfig>;
}

export const KEY_STORAGE_KEY = 'web-cli:llm';

interface PersistedKeys {
  active: ProviderId;
  providers: Partial<Record<ProviderId, { apiKey: string; model?: string; baseURL?: string }>>;
  maxRounds?: number;
}

const EMPTY: PersistedKeys = { active: 'deepseek', providers: {} };

function isProviderId(v: unknown): v is ProviderId {
  return typeof v === 'string' && PROVIDERS.some((p) => p.id === v);
}

export function createKeyStore(kv: KeyKv): KeyStore {
  const read = async (): Promise<PersistedKeys> => {
    const stored = await kv.get<PersistedKeys>(KEY_STORAGE_KEY);
    if (!stored || typeof stored !== 'object') return { ...EMPTY, providers: {} };
    const active = isProviderId(stored.active) ? stored.active : 'deepseek';
    return {
      active,
      providers: stored.providers ?? {},
      maxRounds: typeof stored.maxRounds === 'number' && stored.maxRounds > 0 ? stored.maxRounds : DEFAULT_MAX_ROUNDS,
    };
  };
  const write = async (store: PersistedKeys): Promise<void> => {
    await kv.set(KEY_STORAGE_KEY, store);
  };

  return {
    async load() {
      const store = await read();
      const provider = providerById(store.active);
      const state = store.providers[store.active];
      return {
        providerId: store.active,
        apiKey: state?.apiKey ?? '',
        model: state?.model?.trim() ? state.model : provider.defaultModel,
        ...(state?.baseURL?.trim() ? { baseURL: state.baseURL } : {}),
        maxRounds: store.maxRounds ?? DEFAULT_MAX_ROUNDS,
      };
    },
    async save(settings) {
      const store = await read();
      store.active = isProviderId(settings.providerId) ? settings.providerId : 'deepseek';
      store.providers[store.active] = {
        apiKey: settings.apiKey,
        ...(settings.model?.trim() ? { model: settings.model } : {}),
        ...(settings.baseURL?.trim() ? { baseURL: settings.baseURL } : {}),
      };
      store.maxRounds = settings.maxRounds && settings.maxRounds > 0 ? settings.maxRounds : DEFAULT_MAX_ROUNDS;
      await write(store);
    },
    async loadProvider(providerId) {
      const store = await read();
      const provider = providerById(providerId);
      const state = store.providers[providerId];
      return {
        providerId,
        apiKey: state?.apiKey ?? '',
        model: state?.model?.trim() ? state.model : provider.defaultModel,
        ...(state?.baseURL?.trim() ? { baseURL: state.baseURL } : {}),
      };
    },
    async clear(providerId) {
      const store = await read();
      if (providerId) {
        delete store.providers[providerId];
        await write(store);
        return;
      }
      await kv.remove(KEY_STORAGE_KEY);
    },
    async maskedConfig() {
      const store = await read();
      const provider = providerById(store.active);
      const state = store.providers[store.active];
      const apiKey = state?.apiKey ?? '';
      return {
        providerId: store.active,
        providerName: provider.name,
        model: state?.model?.trim() ? state.model : provider.defaultModel,
        ...(state?.baseURL?.trim() ? { baseURL: state.baseURL } : {}),
        maxRounds: store.maxRounds ?? DEFAULT_MAX_ROUNDS,
        hasKey: apiKey.length > 0,
        browserDirect: provider.browserDirect,
      };
    },
  };
}
