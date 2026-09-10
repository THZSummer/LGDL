import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MAX_ROUNDS, PROVIDERS, providerById } from '../src/llm/providers.js';
import { createKeyStore, type KeyKv } from '../src/llm/key-store.js';

function memoryKv(): KeyKv {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

test('providers: 8 providers aligned with the built-in assistant', () => {
  assert.equal(PROVIDERS.length, 8);
  const ids = PROVIDERS.map((p) => p.id).sort();
  assert.deepEqual(ids, ['claude', 'deepseek', 'openai', 'qwen', 'tencent', 'volc', 'volc-coding', 'volc-plan']);
  assert.equal(PROVIDERS.filter((p) => p.id.startsWith('volc')).every((p) => p.browserDirect === false), true);
  assert.equal(PROVIDERS.filter((p) => !p.id.startsWith('volc')).every((p) => p.browserDirect === true), true);
  assert.equal(providerById('nope').id, 'deepseek');
  assert.equal(DEFAULT_MAX_ROUNDS, 1000);
});

test('key-store: per-provider persistence + masked config (no plaintext echo)', async () => {
  const kv = memoryKv();
  const store = createKeyStore(kv);
  const initial = await store.load();
  assert.equal(initial.providerId, 'deepseek');
  assert.equal(initial.apiKey, '');

  await store.save({ providerId: 'openai', apiKey: 'sk-secret-value', model: 'gpt-4o-mini' });
  const loaded = await store.load();
  assert.equal(loaded.providerId, 'openai');
  assert.equal(loaded.apiKey, 'sk-secret-value');

  const masked = await store.maskedConfig();
  assert.equal(masked.hasKey, true);
  assert.equal(JSON.stringify(masked).includes('sk-secret-value'), false);
  assert.match(masked.apiKeyMasked, /•/);

  // switching provider does not clobber the other provider's key
  await store.save({ providerId: 'deepseek', apiKey: 'ds-key', model: 'deepseek-v4-flash' });
  const ds = await store.loadProvider('deepseek');
  const oa = await store.loadProvider('openai');
  assert.equal(ds.apiKey, 'ds-key');
  assert.equal(oa.apiKey, 'sk-secret-value');

  await store.clear('openai');
  assert.equal((await store.loadProvider('openai')).apiKey, '');
});

test('key-store: default model falls back to provider default', async () => {
  const store = createKeyStore(memoryKv());
  await store.save({ providerId: 'claude', apiKey: 'k', model: '' });
  const loaded = await store.load();
  assert.equal(loaded.model, providerById('claude').defaultModel);
});
