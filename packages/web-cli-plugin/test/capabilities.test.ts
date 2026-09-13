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
import { capabilitiesView, capabilityStateLabel, bookmarksCapabilityStatus, downloadsCapabilityStatus, notifyCapabilityStatus, clipboardCapabilityStatus, SETTINGS_SECTIONS } from '../src/ui/settings/view.js';
import {
  applyMeasuredGrants,
  CAPABILITY_EXPLANATION,
  capabilityActionView,
  capabilityDeniedReceipt,
  capabilityGrantReceipt,
  capabilityRevokeFailureReceipt,
  capabilityRevokeReceipt,
} from '../src/ui/settings/view.js';

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

test('FR-054/FR-055 permissions: exact manifest permission lists', () => {
  assert.deepEqual(permissionsOf('bookmarks'), ['bookmarks']);
  assert.deepEqual(permissionsOf('downloads'), ['downloads']);
  assert.deepEqual(permissionsOf('notify'), ['notifications']);
  assert.deepEqual(permissionsOf('clipboard'), ['clipboardRead', 'clipboardWrite']);
  assert.deepEqual(OPTIONAL_CAPABILITY_PERMISSIONS.bookmarks, ['bookmarks']);
  assert.deepEqual(OPTIONAL_CAPABILITY_PERMISSIONS.clipboard, ['clipboardRead', 'clipboardWrite']);
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

test('FR-054/FR-055 permissions: change detection matches a capability grant/revoke', () => {
  assert.equal(changeTouchesCapability({ permissions: ['bookmarks'] }, 'bookmarks'), true);
  assert.equal(changeTouchesCapability({ permissions: ['bookmarks'] }, 'downloads'), false);
  assert.equal(changeTouchesCapability({ permissions: ['notifications'] }, 'notify'), true);
  assert.equal(changeTouchesCapability({ permissions: ['notifications'] }, 'clipboard'), false);
  // `clipboard` requires BOTH permissions (every()).
  assert.equal(changeTouchesCapability({ permissions: ['clipboardRead'] }, 'clipboard'), false);
  assert.equal(changeTouchesCapability({ permissions: ['clipboardRead', 'clipboardWrite'] }, 'clipboard'), true);
  assert.equal(changeTouchesCapability({ origins: ['https://a.test/*'] }, 'bookmarks'), false);
  assert.equal(changeTouchesCapability(undefined, 'bookmarks'), false);
});

test('FR-054/FR-055 capability store: documented defaults (read on/on, write off; notify on; clipboard read off / write on)', async () => {
  const kv = memoryKv();
  const store = createCapabilitySettingStore(kv);
  await store.load();
  assert.deepEqual(store.get(), { ...CAPABILITY_SETTING_DEFAULTS });
  assert.equal(store.get().bookmarksRead, true);
  assert.equal(store.get().bookmarksWrite, false);
  assert.equal(store.get().downloadsRead, true);
  assert.equal(store.get().notify, true, 'FR-055: notify defaults ON');
  assert.equal(store.get().clipboardRead, false, 'FR-055: clipboard READ defaults OFF (privacy-sensitive)');
  assert.equal(store.get().clipboardWrite, true, 'FR-055: clipboard write defaults ON');
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
  assert.deepEqual(b.get(), { ...CAPABILITY_SETTING_DEFAULTS, bookmarksWrite: true });

  await b.save({ downloadsRead: false, notify: false, clipboardRead: true });
  assert.equal(b.get().downloadsRead, false);
  assert.equal(b.get().notify, false);
  assert.equal(b.get().clipboardRead, true);
  assert.equal(b.get().clipboardWrite, true, 'partial patch keeps the other defaults');
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

test('FR-054/FR-055 view: capability labels + status text cover 已开启/未开启/已撤销', () => {
  assert.equal(capabilityStateLabel(true, false), '已开启');
  assert.equal(capabilityStateLabel(false, false), '未开启');
  assert.equal(capabilityStateLabel(false, true), '已撤销');

  const view = capabilitiesView({
    bookmarks: { read: true, write: false, granted: false, revoked: false },
    downloads: { read: true, granted: false, revoked: true },
    notify: { enabled: true, granted: false, revoked: false },
    clipboard: { read: false, write: true, granted: false, revoked: false },
    tools: ['tabs'],
  });
  assert.match(bookmarksCapabilityStatus(view.bookmarks), /未开启/);
  assert.match(bookmarksCapabilityStatus(view.bookmarks), /开启/);
  assert.match(downloadsCapabilityStatus(view.downloads), /已撤销/);
  assert.match(notifyCapabilityStatus(view.notify), /系统通知/);
  assert.match(notifyCapabilityStatus(view.notify), /未开启/);
  assert.match(clipboardCapabilityStatus(view.clipboard), /剪贴板/);
  assert.match(clipboardCapabilityStatus(view.clipboard), /永不自动放行/);
  assert.equal(capabilityStateLabel(view.bookmarks.granted, view.bookmarks.revoked), '未开启');

  // FR-055 defaults survive normalization: notify ON, clipboard read OFF / write ON.
  assert.equal(view.notify.read, true, 'notify defaults ON');
  assert.equal(view.clipboard.read, false, 'clipboard read defaults OFF');
  assert.equal(view.clipboard.write, true, 'clipboard write defaults ON');

  // The settings section list advertises the capability section.
  assert.equal(SETTINGS_SECTIONS.some((s) => s.key === 'capabilities'), true);
});

// ── TASK-040: three-state action control + receipts + measured-priority ──────

test('TASK-040 view: every capability exposes a readable explanation (what it enables + why Chrome prompts)', () => {
  for (const cap of ['bookmarks', 'downloads', 'notify', 'clipboard'] as const) {
    const text = CAPABILITY_EXPLANATION[cap];
    assert.ok(text.length > 20, `${cap} explanation must be substantive`);
    assert.match(text, /可选权限/, `${cap} explanation must say it is an optional permission`);
    assert.match(text, /点一次|手势/, `${cap} explanation must explain why the user must click once`);
  }
});

test('TASK-040 view: three-state button (未授权 → 授权；已授权 → 撤销 + ✅ 徽标；已撤销 → 授权 + 上次已撤销)', () => {
  // 1) never requested → request button
  const never = capabilityActionView('bookmarks', false, false);
  assert.equal(never.mode, 'request');
  assert.equal(never.buttonLabel, '授权 Chrome 书签权限');
  assert.equal(never.badge, '');
  assert.equal(never.showRequest, true);
  assert.equal(never.showRevoke, false);
  assert.equal(never.revokedNote, '');

  // 2) granted → revoke button + ✅ badge (授权按钮不再显示)
  const granted = capabilityActionView('bookmarks', true, false);
  assert.equal(granted.mode, 'revoke');
  assert.equal(granted.buttonLabel, '撤销 Chrome 权限');
  assert.equal(granted.badge, '✅ 已授权');
  assert.equal(granted.showRequest, false);
  assert.equal(granted.showRevoke, true);

  // 3) revoked → back to request button + readable「上次已撤销」
  const revoked = capabilityActionView('clipboard', false, true);
  assert.equal(revoked.mode, 'request');
  assert.equal(revoked.buttonLabel, '授权 Chrome 剪贴板权限');
  assert.match(revoked.revokedNote, /上次已撤销/);
  assert.match(revoked.revokedNote, /clipboardRead\/clipboardWrite/);

  // All 4 capabilities switch labels (not just bookmarks).
  assert.equal(capabilityActionView('downloads', true, false).buttonLabel, '撤销 Chrome 权限');
  assert.equal(capabilityActionView('notify', false, false).buttonLabel, '授权 Chrome 系统通知权限');
  assert.equal(capabilityActionView('clipboard', false, false).buttonLabel, '授权 Chrome 剪贴板权限');
});

test('TASK-040 view: success / denied / revoked / revoke-failure receipts are explicit and readable', () => {
  const granted = capabilityGrantReceipt('bookmarks');
  assert.equal(granted.kind, 'ok');
  assert.match(granted.text, /✅ 已开启书签访问：Chrome 权限已授予（助手工具已进入 LLM 工具面）/);

  const denied = capabilityDeniedReceipt('clipboard');
  assert.equal(denied.kind, 'warn');
  assert.match(denied.text, /✖ 未开启：Chrome 未授予 clipboardRead\/clipboardWrite 权限；可再次点击重试/);

  const revoked = capabilityRevokeReceipt('downloads');
  assert.equal(revoked.kind, 'ok');
  assert.match(revoked.text, /✅ 已撤销下载记录权限：Chrome 权限已移除（助手工具已从 LLM 工具面移除）/);

  const failed = capabilityRevokeFailureReceipt('notify', 'You cannot remove required permissions.');
  assert.equal(failed.kind, 'err');
  assert.match(failed.text, /✖ 撤销系统通知权限失败：You cannot remove required permissions./);
  assert.match(failed.text, /Chrome 权限仍保留/);
});

test('TASK-040: 实测权限优先于本地开关（开关=开但 contains=false → 必须显示未授权）', () => {
  // The persisted toggles read「开」but the live `contains()` probe says the
  // permission is gone (revoked): the row MUST render as unauthorized.
  const stale = capabilitiesView({
    bookmarks: { read: true, write: true, granted: true, revoked: false },
    downloads: { read: true, granted: true, revoked: false },
    notify: { enabled: true, granted: true, revoked: false },
    clipboard: { read: true, write: true, granted: true, revoked: false },
    tools: ['bookmarks', 'downloads', 'notify', 'clipboard'],
  });
  const measured = applyMeasuredGrants(stale, {
    bookmarks: false,
    downloads: false,
    notify: false,
    clipboard: false,
  });
  for (const cap of ['bookmarks', 'downloads', 'notify', 'clipboard'] as const) {
    assert.equal(measured[cap].granted, false, `${cap}: the measured contains=false must win over the「开」toggle`);
    assert.equal(capabilityActionView(cap, measured[cap].granted, measured[cap].revoked).mode, 'request');
  }
  assert.match(bookmarksCapabilityStatus(measured.bookmarks), /未开启/);
  assert.match(bookmarksCapabilityStatus(measured.bookmarks), /权限未授予（不生效）/);
  assert.doesNotMatch(bookmarksCapabilityStatus(measured.bookmarks), /读开关 开/);
  assert.match(notifyCapabilityStatus(measured.notify), /权限未授予（不生效）/);

  // And a live grant overrides a stale background「granted:false / revoked:true」.
  const revokedView = capabilitiesView({
    bookmarks: { read: true, write: false, granted: false, revoked: true },
    downloads: { read: true, granted: false, revoked: true },
    notify: { enabled: true, granted: false, revoked: true },
    clipboard: { read: false, write: true, granted: false, revoked: true },
  });
  const regranted = applyMeasuredGrants(revokedView, { bookmarks: true, downloads: true, notify: true, clipboard: true });
  for (const cap of ['bookmarks', 'downloads', 'notify', 'clipboard'] as const) {
    assert.equal(regranted[cap].granted, true);
    assert.equal(regranted[cap].revoked, false, 'a re-grant clears the stale 已撤销 flag');
  }
  assert.match(bookmarksCapabilityStatus(regranted.bookmarks), /读开关 开/);
});
