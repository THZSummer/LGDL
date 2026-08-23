import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVIDERS,
  defaultModelFor,
  providerById,
  loadSettings,
  saveSettings,
  type ProviderSettings,
} from './provider.js';

/** localStorage 不存在于 Node——用 stub 模拟。 */
function withStorage(storage: Record<string, string>, fn: () => void) {
  const orig = (globalThis as Record<string, unknown>).localStorage;
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
  } as Storage;
  try {
    fn();
  } finally {
    (globalThis as Record<string, unknown>).localStorage = orig;
  }
}

test('PROVIDERS covers all vendors; volc split into three endpoint plans', () => {
  const ids = PROVIDERS.map((p) => p.id);
  assert.deepEqual(ids, [
    'deepseek',
    'qwen',
    'volc',
    'volc-coding',
    'volc-plan',
    'tencent',
    'openai',
    'claude',
  ]);
  for (const p of PROVIDERS) {
    assert.ok(p.defaultModel);
    assert.ok(p.hint);
  }
  assert.equal(providerById('claude').baseURL, null);
  assert.equal(providerById('qwen').baseURL, 'https://dashscope.aliyuncs.com/compatible-mode/v1');
  assert.equal(providerById('volc-coding').baseURL, 'https://ark.cn-beijing.volces.com/api/coding/v3');
  assert.equal(providerById('volc-plan').baseURL, 'https://ark.cn-beijing.volces.com/api/plan/v3');
  assert.equal(providerById('volc-coding').defaultModel, 'deepseek-v4-flash');
});

test('defaultModelFor returns the provider default', () => {
  assert.equal(defaultModelFor('deepseek'), 'deepseek-chat');
  assert.equal(defaultModelFor('volc-coding'), 'deepseek-v4-flash');
  assert.equal(defaultModelFor('claude'), 'claude-3-5-haiku-latest');
});

test('loadSettings returns defaults when storage is empty', () => {
  withStorage({}, () => {
    const s = loadSettings();
    assert.equal(s.providerId, 'deepseek');
    assert.equal(s.apiKey, '');
  });
});

test('loadSettings round-trips a saved settings object', () => {
  withStorage({}, () => {
    const saved: ProviderSettings = { providerId: 'qwen', apiKey: 'sk-123', model: 'qwen-max' };
    saveSettings(saved);
    const loaded = loadSettings();
    assert.deepEqual(loaded, { ...saved, baseURL: undefined });
  });
});

test('loadSettings preserves a custom baseURL (volc coding endpoint)', () => {
  withStorage({}, () => {
    const saved: ProviderSettings = {
      providerId: 'volc',
      apiKey: 'ark-xxx',
      model: 'deepseek-v4-flash',
      baseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3',
    };
    saveSettings(saved);
    const loaded = loadSettings();
    assert.equal(loaded.baseURL, 'https://ark.cn-beijing.volces.com/api/coding/v3');
    assert.equal(loaded.providerId, 'volc');
  });
});

test('loadSettings falls back to provider default model when model is blank', () => {
  withStorage(
    {},
    () => {
      saveSettings({ providerId: 'volc', apiKey: 'k', model: '' });
    },
  );
  withStorage(
    {
      'lgdl-ai-settings': JSON.stringify({ providerId: 'volc', apiKey: 'k', model: '' }),
    },
    () => {
      const s = loadSettings();
      assert.equal(s.model, 'doubao-seed-1-6-250615');
    },
  );
});

test('loadSettings tolerates corrupted storage', () => {
  withStorage(
    {
      'lgdl-ai-settings': 'not json{{{',
    },
    () => {
      const s = loadSettings();
      assert.equal(s.providerId, 'deepseek');
      assert.ok(s.model);
    },
  );
});
