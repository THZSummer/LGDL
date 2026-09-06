import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVIDERS,
  defaultModelFor,
  providerById,
  loadSettings,
  saveSettings,
  loadProviderSettings,
  saveProviderInputs,
  saveWebSearch,
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
  assert.equal(defaultModelFor('deepseek'), 'deepseek-v4-flash');
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
    const saved: ProviderSettings = { providerId: 'qwen', apiKey: 'sk-123', model: 'qwen-max', maxRounds: 500 };
    saveSettings(saved);
    const loaded = loadSettings();
    assert.deepEqual(loaded, { ...saved, baseURL: undefined, maxRounds: 500 });
  });
});

test('loadSettings defaults maxRounds to 1000 when not set', () => {
  withStorage({}, () => {
    saveSettings({ providerId: 'qwen', apiKey: 'sk', model: 'qwen-max' });
    assert.equal(loadSettings().maxRounds, 1000);
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

test('per-provider: each provider keeps its OWN apiKey/model; switching does not leak', () => {
  withStorage({}, () => {
    // 填 DeepSeek 的 key
    saveSettings({ providerId: 'deepseek', apiKey: 'sk-deepseek-1', model: 'deepseek-chat' });
    // 切到 Qwen 填不同的 key
    saveSettings({ providerId: 'qwen', apiKey: 'sk-qwen-2', model: 'qwen-plus' });
    // 切回 DeepSeek：应显示它自己的 key，而不是最近输入的 Qwen key
    const ds = loadProviderSettings('deepseek');
    assert.equal(ds.apiKey, 'sk-deepseek-1');
    assert.equal(ds.model, 'deepseek-chat');
    // Qwen 保持自己的
    const qw = loadProviderSettings('qwen');
    assert.equal(qw.apiKey, 'sk-qwen-2');
    // active 指向最后一次保存的 provider
    assert.equal(loadSettings().providerId, 'qwen');
  });
});

test('per-provider: saveProviderInputs stores without touching the active pointer', () => {
  withStorage({}, () => {
    saveSettings({ providerId: 'deepseek', apiKey: 'sk-ds', model: 'deepseek-chat' });
    // 用户切到 qwen 前暂存输入（active 应仍为 deepseek）
    saveProviderInputs('qwen', { apiKey: 'sk-qw', model: 'qwen-plus' });
    assert.equal(loadSettings().providerId, 'deepseek');
    assert.equal(loadProviderSettings('qwen').apiKey, 'sk-qw');
  });
});

test('legacy single-object storage migrates to per-provider format', () => {
  withStorage(
    {
      'lgdl-ai-settings': JSON.stringify({ providerId: 'volc-coding', apiKey: 'ark-old', model: 'deepseek-v4-flash' }),
    },
    () => {
      const s = loadSettings();
      assert.equal(s.providerId, 'volc-coding');
      assert.equal(s.apiKey, 'ark-old');
      // 迁移后再次保存，其他 provider 不受影响
      saveSettings({ providerId: 'deepseek', apiKey: 'sk-new', model: 'deepseek-chat' });
      assert.equal(loadProviderSettings('volc-coding').apiKey, 'ark-old');
      assert.equal(loadSettings().providerId, 'deepseek');
    },
  );
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

test('browserDirect flags: deepseek/qwen/tencent/openai/claude direct, volc blocked', () => {
  assert.equal(providerById('deepseek').browserDirect, true);
  assert.equal(providerById('qwen').browserDirect, true);
  assert.equal(providerById('tencent').browserDirect, true);
  assert.equal(providerById('openai').browserDirect, true);
  assert.equal(providerById('claude').browserDirect, true);
  assert.equal(providerById('volc').browserDirect, false);
  assert.equal(providerById('volc-coding').browserDirect, false);
  assert.equal(providerById('volc-plan').browserDirect, false);
});

// D-005 记录：buildTools 顺序断言（旧 :189-196）已删除——schema 派生顺序契约
// （[lgdl-web-cli, lgdl-web-op-cli, web-fetch, sleep, web-cli-help]）由
// base router.test（deriveTools 顺序）+ lgdl-web session.test（派生顺序）承接。

test('F-04: OpenAI-compatible endpoints share the five-tool set (claude parity)', () => {
  const nonClaude = PROVIDERS.filter((p) => p.id !== 'claude');
  assert.equal(nonClaude.length, 7); // openai/deepseek/qwen/tencent/volc/volc-coding/volc-plan
  for (const p of nonClaude) assert.ok(p.baseURL, `${p.id} is OpenAI-compatible`);
  // 工具集一致由 session 统一经 router.deriveTools() 供给（单一数据源），chat 不再内建组装
});



// ================= v2：webSearch BYOK 配置位（FR-040；key 只存 storage 位） =================

test('webSearch: 未配置缺省为 undefined（loadSettings）', () => {
  withStorage({}, () => {
    const s = loadSettings();
    assert.equal(s.webSearch, undefined);
  });
});

test('webSearch: saveSettings 读写 round-trip；仅存端点+key 完整时生效', () => {
  withStorage({}, () => {
    const saved: ProviderSettings = {
      providerId: 'deepseek',
      apiKey: 'sk',
      model: 'm',
      webSearch: { endpoint: 'https://search.example.com/api', apiKey: 'ws-key-123' },
    };
    saveSettings(saved);
    const loaded = loadSettings();
    assert.deepEqual(loaded.webSearch, { endpoint: 'https://search.example.com/api', apiKey: 'ws-key-123' });
    // 其他 provider 字段不受影响
    assert.equal(loaded.providerId, 'deepseek');
    // 端点/key 任一缺失 → 不落位（缺省禁用语义 EC-006）
    saveSettings({ ...saved, webSearch: { endpoint: '', apiKey: 'k' } });
    assert.equal(loadSettings().webSearch, undefined);
  });
});

test('webSearch: saveWebSearch 专用 setter（不动 provider 键/激活态）', () => {
  withStorage({}, () => {
    saveSettings({ providerId: 'deepseek', apiKey: 'sk-ds', model: 'm' });
    saveWebSearch({ endpoint: 'https://s.example.com', apiKey: 'key' });
    assert.deepEqual(loadSettings().webSearch, { endpoint: 'https://s.example.com', apiKey: 'key' });
    assert.equal(loadSettings().providerId, 'deepseek'); // 激活态未被改动
    // 清空
    saveWebSearch(undefined);
    assert.equal(loadSettings().webSearch, undefined);
    assert.equal(loadProviderSettings('deepseek').apiKey, 'sk-ds');
  });
});
test('webSearch: 既有 localStorage 读写零回归（旧格式无 webSearch 字段）', () => {
  withStorage(
    {
      'lgdl-ai-settings': JSON.stringify({ providerId: 'qwen', apiKey: 'sk-old', model: 'qwen-max' }),
    },
    () => {
      const s = loadSettings();
      assert.equal(s.providerId, 'qwen');
      assert.equal(s.apiKey, 'sk-old');
      assert.equal(s.webSearch, undefined);
      // 保存后 webSearch 缺省不产生字段噪音（load 仍为 undefined，provider 键保持）
      saveSettings({ providerId: 'qwen', apiKey: 'sk-old', model: 'qwen-max' });
      assert.equal(loadSettings().webSearch, undefined);
      assert.equal(loadProviderSettings('qwen').apiKey, 'sk-old');
    },
  );
});
