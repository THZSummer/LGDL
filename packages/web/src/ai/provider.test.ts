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
  classifyError,
  parseToolArguments,
  WEB_CLI_TOOL,
  WEB_FETCH_TOOL,
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

test('classifyError: Connection error hints at CORS / browser-direct limits', () => {
  const p = providerById('volc-coding');
  const err = classifyError(new Error('Connection error.'), p);
  assert.match(err.message, /浏览器直连失败/);
  assert.match(err.message, /CORS/);
});

test('classifyError: 401 hints at invalid key', () => {
  const p = providerById('deepseek');
  const err = classifyError({ status: 401 } as unknown as Error, p);
  assert.match(err.message, /API Key 可能无效/);
});

test('classifyError: 404 on volc suggests switching plan provider', () => {
  const p = providerById('volc-coding');
  const err = classifyError({ status: 404 } as unknown as Error, p);
  assert.match(err.message, /火山方舟/);
  assert.match(err.message, /Coding/);
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

test('parseToolArguments: parses subcommand and args', () => {
  const tc = parseToolArguments('call_1', 'lgdl-web-cli', '{"subcommand":"add-node","args":{"id":"user","label":"用户","kind":"entity"}}');
  assert.equal(tc.id, 'call_1');
  assert.equal(tc.subcommand, 'add-node');
  assert.deepEqual(tc.args, { id: 'user', label: '用户', kind: 'entity' });
});

test('parseToolArguments: tolerates malformed JSON', () => {
  const tc = parseToolArguments('call_2', 'lgdl-web-cli', 'not json');
  assert.equal(tc.subcommand, '');
  assert.deepEqual(tc.args, {});
});

test('WEB_CLI_TOOL: exposes lgdl-web-cli function schema', () => {
  assert.equal(WEB_CLI_TOOL.function.name, 'lgdl-web-cli');
  const props = WEB_CLI_TOOL.function.parameters.properties as Record<string, unknown>;
  assert.ok(props.subcommand);
  assert.ok(props.args);
  // fetch-doc 已从 lgdl-web-cli 移除（web 获取是独立基础工具 lgdl-web-fetch）
  const enumList = (props.subcommand as { enum: string[] }).enum;
  assert.ok(!enumList.includes('fetch-doc'));
  assert.ok(enumList.includes('list-diagram-types'));
});

test('WEB_FETCH_TOOL: exposes lgdl-web-fetch as an independent base tool', () => {
  assert.equal(WEB_FETCH_TOOL.function.name, 'lgdl-web-fetch');
  const props = WEB_FETCH_TOOL.function.parameters.properties as Record<string, unknown>;
  assert.ok(props.path);
  const required = (WEB_FETCH_TOOL.function.parameters as { required?: string[] }).required;
  assert.deepEqual(required, ['path']);
});
