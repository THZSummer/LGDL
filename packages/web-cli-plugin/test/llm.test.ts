import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  // W3: no key-derived string (not even a mask) is produced any more.
  assert.equal('apiKeyMasked' in masked, false);
  assert.equal(JSON.stringify(masked).includes('•'), false);

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

test('AC-007: key store never touches the built-in assistant storage (no auto-migration)', () => {
  const src = readFileSync(new URL('../../src/llm/key-store.ts', import.meta.url), 'utf8');
  assert.equal(/lgdl-ai-settings|localStorage|sessionStorage/.test(src), false);
});

test('EC-009: every provider endpoint is covered by a manifest host permission (extension SW direct)', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')) as {
    host_permissions: string[];
  };
  // Claude uses the native Messages API (baseURL null) → default Anthropic host.
  const claudeHost = 'api.anthropic.com';
  const covered = PROVIDERS.map((p) => {
    const host = p.baseURL ? new URL(p.baseURL).host : claudeHost;
    return { id: p.id, host, ok: manifest.host_permissions.includes(`https://${host}/*`) };
  });
  assert.deepEqual(
    covered.filter((c) => !c.ok),
    [],
    `uncovered provider hosts: ${covered.filter((c) => !c.ok).map((c) => c.id).join(', ')}`,
  );
  // Volcano's three endpoints are the G-KEY-verified direct cases (browserDirect=false marker).
  const volcHosts = PROVIDERS.filter((p) => p.id.startsWith('volc')).map((p) => new URL(p.baseURL!).host);
  assert.deepEqual([...new Set(volcHosts)], ['ark.cn-beijing.volces.com']);
});
