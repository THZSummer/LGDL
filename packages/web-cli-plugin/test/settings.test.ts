/**
 * TASK-033 — shared settings module + in-panel settings view.
 *
 * Covers, without a browser:
 *  - the shared pure view helpers (single source for panel + options page);
 *  - the shared settings ops over the EXISTING message protocol (no new channels);
 *  - the chat ⇄ settings view switch preserving scroll position + draft;
 *  - static proof that no settings entry calls `openOptionsPage()`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  API_KEY_PLACEHOLDER_EMPTY,
  API_KEY_PLACEHOLDER_SAVED,
  AUTO_AUTH_EMPTY_TEXT,
  SETTINGS_SECTIONS,
  apiKeyPlaceholder,
  autoAuthListStatus,
  autoAuthRows,
  groupListView,
  keyStateView,
  keyWarningText,
  providerHint,
  providerOptions,
  savedSummaryView,
  settingsEntryLabel,
  tabsSettingStatus,
} from '../src/ui/settings/view.js';
import { createSettingsOps, type SettingsTransport } from '../src/ui/settings/ops.js';
import { createViewSwitch } from '../src/ui/settings/view-switch.js';
import type { KeyStore, LlmSettings } from '../src/llm/key-store.js';
import type { PluginMessage, PluginResponse } from '../src/background/messaging.js';
import type { EnvGuardResult } from '../src/platform/env-guard.js';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

const IN_EXTENSION: EnvGuardResult = {
  inExtension: true,
  hasChrome: true,
  hasRuntime: true,
  hasStorage: true,
  reasons: [],
  banner: '',
};

const OUT_OF_EXTENSION: EnvGuardResult = {
  inExtension: false,
  hasChrome: false,
  hasRuntime: false,
  hasStorage: false,
  reasons: ['chrome.runtime.id 不可用（非扩展上下文）'],
  banner: '⚠ 当前不在扩展环境（chrome.storage 不可用），配置无法保存。',
};

function fakeStore(initial?: Partial<LlmSettings>): KeyStore {
  let cfg: LlmSettings = {
    providerId: (initial?.providerId as LlmSettings['providerId']) ?? 'deepseek',
    apiKey: initial?.apiKey ?? '',
    model: initial?.model ?? 'deepseek-v4-flash',
    ...(initial?.baseURL ? { baseURL: initial.baseURL } : {}),
    maxRounds: 1000,
  };
  return {
    async load() {
      return { ...cfg };
    },
    async save(next) {
      cfg = { ...next };
    },
    async loadProvider(id) {
      return { ...cfg, providerId: id as LlmSettings['providerId'] };
    },
    async clear() {
      cfg = { providerId: 'deepseek', apiKey: '', model: 'deepseek-v4-flash', maxRounds: 1000 };
    },
    async maskedConfig() {
      return {
        providerId: cfg.providerId,
        providerName: 'DeepSeek',
        model: cfg.model,
        maxRounds: cfg.maxRounds ?? 1000,
        hasKey: cfg.apiKey.length > 0,
        browserDirect: true,
      };
    },
  };
}

// ── shared view helpers ────────────────────────────────────────────────────

test('TASK-033 view: key state / placeholder / warning are single-sourced', () => {
  assert.equal(apiKeyPlaceholder(false), API_KEY_PLACEHOLDER_EMPTY);
  assert.equal(apiKeyPlaceholder(true), API_KEY_PLACEHOLDER_SAVED);
  assert.equal(keyStateView(true).kind, 'ok');
  assert.match(keyStateView(true).text, /已写入/);
  assert.equal(keyStateView(false).kind, 'warn');
  assert.match(keyStateView(false).text, /未配置/);
  assert.equal(keyWarningText(true), '');
  assert.match(keyWarningText(false), /尚未配置 API Key/);
});

test('TASK-033 view: provider options + hint match the provider table', () => {
  const options = providerOptions('openai');
  assert.equal(options.length, 8);
  assert.equal(options.filter((o) => o.selected).length, 1);
  assert.equal(options.find((o) => o.selected)?.value, 'openai');
  assert.match(providerHint('volc'), /G-KEY/);
});

test('TASK-033 view: saved summary / tabs / auto-auth / groups are readable', () => {
  assert.match(savedSummaryView({ providerId: 'deepseek', model: 'x', apiKey: 'k' }).text, /Key ✅/);
  assert.match(savedSummaryView({ providerId: 'deepseek', model: 'x', apiKey: '' }).text, /Key ⚠未配置/);
  assert.match(tabsSettingStatus(false, []), /已从 LLM 工具面移除/);
  assert.match(tabsSettingStatus(true, ['tabs']), /已开启/);

  const rows = autoAuthRows([{ origin: 'https://a.test', read: true, write: false, updatedAt: 1 }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].write, false);
  assert.match(autoAuthListStatus(1), /1 个站点/);
  assert.match(AUTO_AUTH_EMPTY_TEXT, /暂无站点/);

  const groups = groupListView([{ groupId: 'g1', name: '研发', origins: ['https://a.test'] }]);
  assert.equal(groups.empty, false);
  assert.match(groups.rows[0].title, /研发/);
});

test('TASK-033 view: the panel covers every required settings section', () => {
  const keys = SETTINGS_SECTIONS.map((s) => s.key);
  for (const required of ['llm', 'auto-auth', 'tabs', 'sessions', 'diagnostics', 'compliance', 'migration']) {
    assert.ok(keys.includes(required as never), `section ${required} missing`);
  }
  // The shared panel renderer actually creates each section's container.
  const panel = read('../../src/ui/settings/panel.ts');
  for (const id of [
    'settings-llm',
    'settings-auto-auth',
    'settings-tabs',
    'settings-sessions',
    'settings-diagnostics',
    'settings-compliance',
    'settings-migration',
    'settings-provider',
    'settings-apiKey',
    'settings-save',
    'settings-test',
    'settings-clear',
    'settings-tabs-enabled',
    'settings-diag-run',
  ]) {
    assert.match(panel, new RegExp(`'${id}'`), `panel must render #${id}`);
  }
});

test('TASK-033 view: settings entry copy never references an options page', () => {
  assert.match(settingsEntryLabel({ configured: false, warn: true }), /去配置模型/);
  assert.match(settingsEntryLabel({ configured: true, warn: false }), /设置/);
  assert.equal(/options/i.test(settingsEntryLabel(null)), false);
});

// ── view switch preserves chat state ───────────────────────────────────────

test('TASK-033 view switch: chat scroll position + draft survive a round-trip', () => {
  const state = { open: false, scrollTop: 1234, draft: 'half-typed instruction' };
  const switchView = createViewSwitch({
    open: () => {
      state.open = true;
    },
    close: () => {
      state.open = false;
    },
    getScrollTop: () => state.scrollTop,
    setScrollTop: (v) => {
      state.scrollTop = v;
    },
    getDraft: () => state.draft,
    setDraft: (v) => {
      state.draft = v;
    },
  });

  assert.equal(switchView.settingsOpen, false);
  switchView.showSettings();
  assert.equal(switchView.settingsOpen, true);
  // Simulate the scroll/being reset and the user editing nothing while away.
  state.scrollTop = 0;
  state.draft = '';
  switchView.showChat();
  assert.equal(switchView.settingsOpen, false);
  assert.equal(state.scrollTop, 1234, 'scroll position restored');
  assert.equal(state.draft, 'half-typed instruction', 'composer draft restored');
});

test('TASK-033 view switch: repeated open/close is idempotent (no double capture)', () => {
  let opens = 0;
  let closes = 0;
  const sw = createViewSwitch({
    open: () => (opens += 1),
    close: () => (closes += 1),
    getScrollTop: () => 10,
    setScrollTop: () => {},
    getDraft: () => 'x',
    setDraft: () => {},
  });
  sw.showSettings();
  sw.showSettings();
  sw.showChat();
  sw.showChat();
  assert.equal(opens, 1);
  assert.equal(closes, 1);
});

// ── shared ops: existing message channels only ─────────────────────────────

test('TASK-033 ops: save validates an empty key and never invents one', async () => {
  const ops = createSettingsOps({
    env: IN_EXTENSION,
    transport: { send: async () => ({ ok: true, data: {} }) } as SettingsTransport,
    store: fakeStore({ apiKey: '' }),
    buildStamp: 'test',
    manifestVersion: () => '0.0.0',
  });
  const res = await ops.saveLlm({ providerId: 'openai', apiKey: '', model: '', baseURL: '', maxRounds: '' });
  assert.equal(res.ok, false);
  assert.equal(res.kind, 'warn');
  assert.match(res.text, /未保存/);
});

test('TASK-033 ops: save then load round-trips through the key store (existing channel)', async () => {
  const store = fakeStore({ apiKey: '' });
  const ops = createSettingsOps({ env: IN_EXTENSION, transport: { send: async () => ({ ok: true, data: {} }) } as SettingsTransport, store, buildStamp: 'test', manifestVersion: () => '0.0.0' });
  const saved = await ops.saveLlm({ providerId: 'openai', apiKey: 'sk-test-key', model: 'gpt-4o-mini', baseURL: 'http://x/v1', maxRounds: '50' });
  assert.equal(saved.ok, true);
  assert.match(saved.text, /已保存/);
  const loaded = await ops.loadLlm();
  assert.equal(loaded.data?.hasKey, true);
  assert.equal(loaded.data?.model, 'gpt-4o-mini');
  assert.equal(loaded.data?.baseURL, 'http://x/v1');
});

test('TASK-033 ops: test-connection / tabs / auto-auth / sessions use the SAME protocol kinds', async () => {
  const seen: string[] = [];
  const transport: SettingsTransport = {
    send: async <T>(msg: PluginMessage): Promise<PluginResponse<T>> => {
      seen.push(msg.kind);
      if (msg.kind === 'llm-test') {
        return { ok: true, data: { ok: true, message: '✓ mock 连接正常（模型 m，1 ms，最小 ping 请求）' } as T };
      }
      if (msg.kind === 'tabs-setting') return { ok: true, data: { enabled: msg.action === 'set' ? Boolean(msg.enabled) : true, tools: ['tabs'] } as T };
      if (msg.kind === 'auto-auth') return { ok: true, data: { origins: [{ origin: 'https://a.test', read: true, write: false, updatedAt: 1 }] } as T };
      if (msg.kind === 'sessions') return { ok: true, data: { currentSessionId: 'https://a.test', groups: [] } as T };
      if (msg.kind === 'session-group') return { ok: true, data: { groups: [{ groupId: 'g', name: 'n', origins: [] }] } as T };
      return { ok: true, data: {} as T };
    },
  };
  const ops = createSettingsOps({ env: IN_EXTENSION, transport, store: fakeStore({ apiKey: 'sk' }), buildStamp: 'test', manifestVersion: () => '0.0.0' });

  const test = await ops.testConnection({ providerId: 'deepseek' });
  assert.equal(test.ok, true);
  assert.match(test.text, /连接正常/);

  const tabs = await ops.setTabsSetting(false);
  assert.equal(tabs.data?.enabled, false);

  const aa = await ops.setAutoAuth('https://a.test', 'write', true);
  assert.equal(aa.data?.length, 1);

  const sessions = await ops.loadSessions();
  assert.equal(sessions.data?.currentSessionId, 'https://a.test');

  const group = await ops.groupAction({ action: 'create', name: 'n' });
  assert.equal(group.ok, true);

  assert.deepEqual([...new Set(seen)].sort(), ['auto-auth', 'llm-test', 'session-group', 'sessions', 'tabs-setting']);
});

test('TASK-033 ops: out of an extension context every op fails readably (never silently)', async () => {
  const ops = createSettingsOps({ env: OUT_OF_EXTENSION, transport: { send: async () => ({ ok: true }) } as SettingsTransport, store: fakeStore(), buildStamp: 'test', manifestVersion: () => '0.0.0' });
  const res = await ops.saveLlm({ providerId: 'deepseek', apiKey: 'k', model: '', baseURL: '', maxRounds: '' });
  assert.equal(res.ok, false);
  assert.match(res.text, /不在扩展环境/);
});

test('TASK-033 ops: diagnostics report never contains a plaintext key', async () => {
  const transport: SettingsTransport = {
    send: async <T>(msg: PluginMessage): Promise<PluginResponse<T>> => {
      if (msg.kind === 'diag') {
        return { ok: true, data: { version: '0.8.0', buildStamp: 'test', swStartedAt: 1, activeOrigin: null, discoveryState: null, authorizedOrigins: [] } as T };
      }
      if (msg.kind === 'llm-status') return { ok: true, data: { configured: true, providerId: 'deepseek', providerName: 'DeepSeek', model: 'm' } as T };
      return { ok: true, data: {} as T };
    },
  };
  const ops = createSettingsOps({
    env: IN_EXTENSION,
    transport,
    store: fakeStore({ apiKey: 'sk-super-secret' }),
    buildStamp: 'test',
    manifestVersion: () => '0.8.0',
    probeStorage: async () => ({ status: 'ok', detail: '写入测试键 → 读回一致 → 已清理' }),
  });
  const report = await ops.runDiagnostics();
  const json = JSON.stringify(report);
  assert.equal(json.includes('super-secret'), false);
  assert.equal(json.includes('sk-'), false);
});

// ── no openOptionsPage path ────────────────────────────────────────────────

test('TASK-033: the side panel never calls openOptionsPage; both surfaces share the ops module', () => {
  const sp = read('../../src/ui/sidepanel/sidepanel.ts');
  const panel = read('../../src/ui/settings/panel.ts');
  const options = read('../../src/ui/options/options.ts');
  assert.equal(/\.openOptionsPage\s*\(/.test(sp), false);
  assert.equal(/\.openOptionsPage\s*\(/.test(panel), false);
  // Settings entries are in-panel only.
  assert.match(sp, /settingsViewSwitch\.showSettings\(\)/);
  // No duplicated request implementation: both surfaces import the shared ops.
  assert.match(panel, /from '\.\/ops\.js'/);
  assert.match(options, /from '\.\.\/settings\/ops\.js'/);
  assert.match(sp, /from '\.\.\/settings\/panel\.js'/);
});

test('TASK-033: message protocol unchanged (no new kinds for settings)', () => {
  const messaging = read('../../src/background/messaging.ts');
  assert.match(messaging, /'llm-test'/);
  assert.match(messaging, /'tabs-setting'/);
  assert.match(messaging, /'auto-auth'/);
  assert.match(messaging, /'sessions'/);
  assert.match(messaging, /'session-group'/);
  assert.match(messaging, /'diag'/);
  // no bespoke settings channel was added
  assert.equal(messaging.includes("'settings'"), false);
});

test('TASK-033: options.html is retained as the fallback page (manifest unchanged)', () => {
  const manifest = JSON.parse(read('../../manifest.json')) as { options_page?: string };
  assert.equal(manifest.options_page, 'options.html');
  const optionsHtml = read('../../src/ui/options/index.html');
  assert.match(optionsHtml, /id="form"/);
  assert.match(optionsHtml, /id="apiKey"/);
});
