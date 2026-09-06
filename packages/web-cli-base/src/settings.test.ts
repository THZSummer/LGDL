import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryKv, createLocalStorageKv, createSettingsStore } from './settings.js';
import { createSettingsToolEntry, executeSettings } from './settings.js';
import type { SettingsKv } from './settings.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

/** 假 localStorage（node 面）。 */
function withLocalStorage(storage: Record<string, string>, fn: () => void) {
  const orig = (globalThis as Record<string, unknown>).localStorage;
  const fake = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => {
      storage[k] = v;
    },
    removeItem: (k: string) => {
      delete storage[k];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (i: number) => Object.keys(storage)[i] ?? null,
  };
  (globalThis as Record<string, unknown>).localStorage = fake;
  try {
    fn();
  } finally {
    (globalThis as Record<string, unknown>).localStorage = orig;
  }
}

test('settings: memory 后端 SettingsStore CRUD + list（FR-015）', () => {
  const store = createSettingsStore(createMemoryKv(), 'app');
  assert.equal(store.get('theme'), null);
  store.set('theme', 'dark');
  assert.equal(store.get('theme'), 'dark');
  const list = store.list();
  assert.deepEqual(list, [{ name: 'theme', value: 'dark' }]);
  store.remove('theme');
  assert.equal(store.get('theme'), null);
  assert.deepEqual(store.list(), []);
});

test('settings: 命名空间隔离（互不串扰；list 只列本命名空间）', () => {
  const kv = createMemoryKv();
  const a = createSettingsStore(kv, 'ns-a');
  const b = createSettingsStore(kv, 'ns-b');
  a.set('theme', 'dark');
  b.set('theme', 'light');
  assert.equal(a.get('theme'), 'dark');
  assert.equal(b.get('theme'), 'light');
  assert.deepEqual(a.list(), [{ name: 'theme', value: 'dark' }]);
  assert.deepEqual(b.list(), [{ name: 'theme', value: 'light' }]);
  b.remove('theme');
  assert.equal(a.get('theme'), 'dark'); // 不受影响
});

test('settings: localStorage 适配器读写 + node 无 LS 降级 memory', () => {
  // node 无 localStorage → 降级 memory（可写可读可枚举）
  const fallback = createLocalStorageKv();
  fallback.set('k', 'v');
  assert.equal(fallback.get('k'), 'v');
  assert.deepEqual(fallback.keys?.() ?? [], ['k']);
  // 注入假 localStorage → 真读写
  withLocalStorage({}, () => {
    const ls = createLocalStorageKv();
    ls.set('x', '1');
    assert.equal(ls.get('x'), '1');
    assert.deepEqual(ls.keys?.() ?? [], ['x']);
    ls.remove('x');
    assert.equal(ls.get('x'), null);
  });
});

test('settings: 工具 executeSettings get/set/list/remove（同步语义）', () => {
  const kv: SettingsKv = createMemoryKv();
  const entry = createSettingsToolEntry(kv, 'tool-ns');
  const store = createSettingsStore(kv, 'tool-ns');
  const set = executeSettings(store, 'set', { name: 'a', value: '1' });
  assert.equal(set.ok, true);
  const get = executeSettings(store, 'get', { name: 'a' });
  assert.equal(get.output, 'a = 1');
  const missing = executeSettings(store, 'get', { name: 'b' });
  assert.equal(missing.ok, false);
  assert.match(missing.output, /未设置/);
  const list = executeSettings(store, 'list', {});
  assert.match(list.output, /配置（1 个）：/);
  assert.match(list.output, /- a = 1/);
  const rm = executeSettings(store, 'remove', { name: 'a' });
  assert.equal(rm.ok, true);
  assert.equal(executeSettings(store, 'get', { name: 'a' }).ok, false);
  // 元数据：settings 工具条目
  assert.equal(entry.name, 'settings');
  assert.equal(entry.group, 'settings');
  assert.equal(entry.risk, 'state');
});

test('settings: 经 CommandRouter 注册派发', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register(createSettingsToolEntry(createMemoryKv(), 'demo'));
  const r = await router.dispatch(tc('settings', { name: 'x', value: 'y' }, 'set'));
  assert.equal(r.ok, true);
  assert.match(r.output, /x = y/);
  const g = await router.dispatch(tc('settings', { name: 'x' }, 'get'));
  assert.equal(g.output, 'x = y');
});
