/**
 * FR-054 — optional-permission plumbing.
 *
 * Covers the pure helpers (`hasCapabilityPermission` / gesture request /
 * change detection) and the privacy-toggle store (defaults, persistence,
 * normalization), without a browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OPTIONAL_CAPABILITY_PERMISSIONS,
  changeTouchesCapability,
  hasCapabilityPermission,
  permissionsOf,
  removeCapabilityPermission,
  requestCapabilityPermissionOnGesture,
  type PermissionsApiLike,
} from '../src/platform/capability-permissions.js';
import {
  CAPABILITY_SETTING_DEFAULTS,
  CAPABILITY_SETTING_KEY,
  createCapabilitySettingStore,
  type CapabilitySettingKv,
} from '../src/background/capability-setting.js';
import { capabilitiesView, capabilityStateLabel, bookmarksCapabilityStatus, downloadsCapabilityStatus, SETTINGS_SECTIONS } from '../src/ui/settings/view.js';

function memoryKv(): CapabilitySettingKv & { get<T>(k: string): Promise<T | undefined>; set(k: string, v: unknown): Promise<void> } {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
  };
}

test('FR-054 permissions: exact manifest permission lists', () => {
  assert.deepEqual(permissionsOf('bookmarks'), ['bookmarks']);
  assert.deepEqual(permissionsOf('downloads'), ['downloads']);
  assert.deepEqual(OPTIONAL_CAPABILITY_PERMISSIONS.bookmarks, ['bookmarks']);
});

test('FR-054 permissions: contains is fail-safe false; request uses the injected api', async () => {
  assert.equal(await hasCapabilityPermission(undefined, 'bookmarks'), false);
  const throwing: PermissionsApiLike = {
    contains: async () => {
      throw new Error('boom');
    },
    request: async () => true,
  };
  assert.equal(await hasCapabilityPermission(throwing, 'bookmarks'), false, 'a contains() failure never reads as granted');

  const calls: Array<{ permissions?: string[] }> = [];
  const api: PermissionsApiLike = {
    contains: async (p) => {
      calls.push(p);
      return true;
    },
    request: async (p) => {
      calls.push(p);
      return true;
    },
  };
  assert.equal(await hasCapabilityPermission(api, 'downloads'), true);
  assert.deepEqual(calls[0], { permissions: ['downloads'] });

  const granted = await requestCapabilityPermissionOnGesture('bookmarks', api);
  assert.equal(granted.granted, true);
  assert.deepEqual(calls.at(-1), { permissions: ['bookmarks'] });

  const deniedApi: PermissionsApiLike = { contains: async () => false, request: async () => false };
  const denied = await requestCapabilityPermissionOnGesture('bookmarks', deniedApi);
  assert.equal(denied.granted, false);
  assert.match(denied.error ?? '', /未授予/);

  const noApi: PermissionsApiLike = { contains: async () => false, request: async () => true };
  assert.equal((await removeCapabilityPermission(noApi, 'downloads')).removed, false);
});

test('FR-054 permissions: change detection matches a capability grant/revoke', () => {
  assert.equal(changeTouchesCapability({ permissions: ['bookmarks'] }, 'bookmarks'), true);
  assert.equal(changeTouchesCapability({ permissions: ['bookmarks'] }, 'downloads'), false);
  assert.equal(changeTouchesCapability({ origins: ['https://a.test/*'] }, 'bookmarks'), false);
  assert.equal(changeTouchesCapability(undefined, 'bookmarks'), false);
});

test('FR-054 capability store: documented defaults (read on/on, write off)', async () => {
  const kv = memoryKv();
  const store = createCapabilitySettingStore(kv);
  await store.load();
  assert.deepEqual(store.get(), { ...CAPABILITY_SETTING_DEFAULTS });
  assert.equal(store.get().bookmarksRead, true);
  assert.equal(store.get().bookmarksWrite, false);
  assert.equal(store.get().downloadsRead, true);
});

test('FR-054 capability store: persists + reloads + merges partial patches', async () => {
  const kv = memoryKv();
  const a = createCapabilitySettingStore(kv);
  await a.load();
  await a.save({ bookmarksWrite: true });
  assert.equal(a.get().bookmarksWrite, true);
  assert.equal(a.get().bookmarksRead, true, 'partial patch keeps the other fields');

  const raw = await kv.get<Record<string, unknown>>(CAPABILITY_SETTING_KEY);
  assert.equal(Boolean(raw), true);

  const b = createCapabilitySettingStore(kv);
  await b.load();
  assert.deepEqual(b.get(), { bookmarksRead: true, bookmarksWrite: true, downloadsRead: true });

  await b.save({ downloadsRead: false });
  assert.equal(b.get().downloadsRead, false);
});

test('FR-054 capability store: a storage read failure keeps the documented defaults', async () => {
  const kv: CapabilitySettingKv = {
    async get() {
      throw new Error('storage down');
    },
    async set() {
      /* noop */
    },
  };
  const store = createCapabilitySettingStore(kv);
  await store.load();
  assert.deepEqual(store.get(), { ...CAPABILITY_SETTING_DEFAULTS });
});

test('FR-054 view: capability labels + status text cover 已开启/未开启/已撤销', () => {
  assert.equal(capabilityStateLabel(true, false), '已开启');
  assert.equal(capabilityStateLabel(false, false), '未开启');
  assert.equal(capabilityStateLabel(false, true), '已撤销');

  const view = capabilitiesView({
    bookmarks: { read: true, write: false, granted: false, revoked: false },
    downloads: { read: true, granted: false, revoked: true },
    tools: ['tabs'],
  });
  assert.match(bookmarksCapabilityStatus(view.bookmarks), /未开启/);
  assert.match(bookmarksCapabilityStatus(view.bookmarks), /开启/);
  assert.match(downloadsCapabilityStatus(view.downloads), /已撤销/);
  assert.equal(capabilityStateLabel(view.bookmarks.granted, view.bookmarks.revoked), '未开启');

  // The settings section list advertises the capability section.
  assert.equal(SETTINGS_SECTIONS.some((s) => s.key === 'capabilities'), true);
});
