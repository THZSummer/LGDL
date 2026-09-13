/**
 * TASK-040 — optional-permission **revocation** plumbing + tool-surface wiring.
 *
 * Covers:
 *  - `SettingsOps.revokeCapability` calls `chrome.permissions.remove` (no gesture),
 *    sends the explicit `capabilities/permission-changed` reconcile and returns
 *    the explicit revoke / failure receipts (never silent);
 *  - a successful revoke removes the tool from `deriveTools()` and a re-grant
 *    restores it (the `suppressCapability` mechanism the SW reconciliation uses);
 *  - a real `remove` failure (e.g. a required permission) is surfaced readably.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSettingsOps } from '../src/ui/settings/ops.js';
import type { KeyStore } from '../src/llm/key-store.js';
import type { EnvGuardResult } from '../src/platform/env-guard.js';
import type { PermissionsApiLike } from '../src/platform/capability-permissions.js';
import { createWebCliHost } from '../src/background/host.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import type { PluginMessage, PluginResponse } from '../src/background/messaging.js';

const ENV_IN: EnvGuardResult = { inExtension: true, hasChrome: true, hasRuntime: true, hasStorage: true, reasons: [], banner: '' };

function memoryKv(): PluginKv {
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

/** Background `capabilities` payload with every capability un-granted. */
function capabilitiesPayload(grantedMap: Partial<Record<string, boolean>> = {}) {
  return {
    bookmarks: { read: true, write: false, granted: grantedMap.bookmarks === true, revoked: false },
    downloads: { read: true, granted: grantedMap.downloads === true, revoked: false },
    notify: { enabled: true, granted: grantedMap.notify === true, revoked: false },
    clipboard: { read: false, write: true, granted: grantedMap.clipboard === true, revoked: false },
    tools: [],
  };
}

function makeOps(opts: {
  permissions: PermissionsApiLike;
  payload?: unknown;
  onSend?: (msg: PluginMessage) => void;
}) {
  const store = {} as unknown as KeyStore;
  return createSettingsOps({
    env: ENV_IN,
    permissions: opts.permissions,
    transport: {
      async send<T>(msg: PluginMessage): Promise<PluginResponse<T>> {
        opts.onSend?.(msg);
        if (msg.kind === 'capabilities') {
          return { ok: true, data: (opts.payload ?? capabilitiesPayload()) as T };
        }
        return { ok: true, data: undefined as T };
      },
    },
    store,
    buildStamp: 'test',
    manifestVersion: () => '0.0.0-test',
  });
}

test('TASK-040 revoke: permissions.remove (no gesture) + permission-changed reconcile + explicit receipt', async () => {
  const removeCalls: Array<{ permissions?: string[] }> = [];
  const permissions: PermissionsApiLike = {
    contains: async () => false,
    request: async () => true,
    remove: async (p) => {
      removeCalls.push(p);
      return true;
    },
  };
  const sent: PluginMessage[] = [];
  const ops = makeOps({ permissions, onSend: (m) => sent.push(m) });

  const res = await ops.revokeCapability('bookmarks');
  assert.equal(res.ok, true);
  assert.equal(res.kind, 'ok');
  assert.match(res.text, /✅ 已撤销书签权限：Chrome 权限已移除（助手工具已从 LLM 工具面移除）/);
  assert.deepEqual(removeCalls, [{ permissions: ['bookmarks'] }], 'remove must target the exact capability permissions');
  assert.ok(
    sent.some((m) => m.kind === 'capabilities' && m.action === 'permission-changed' && m.capability === 'bookmarks'),
    'the explicit permission-changed reconcile must be sent (tool leaves the surface)',
  );
});

test('TASK-040 revoke: clipboard removes BOTH permissions and reports readably', async () => {
  const seen: Array<{ permissions?: string[] }> = [];
  const permissions: PermissionsApiLike = {
    contains: async () => false,
    request: async () => true,
    remove: async (p) => {
      seen.push(p);
      return true;
    },
  };
  const ops = makeOps({ permissions });
  const res = await ops.revokeCapability('clipboard');
  assert.equal(res.ok, true);
  assert.deepEqual(seen, [{ permissions: ['clipboardRead', 'clipboardWrite'] }]);
  assert.match(res.text, /已撤销剪贴板权限/);
});

test('TASK-040 revoke: a false remove result and a throwing remove both return readable failures (never silent)', async () => {
  const denied: PermissionsApiLike = { contains: async () => false, request: async () => true, remove: async () => false };
  const deniedRes = await makeOps({ permissions: denied }).revokeCapability('notify');
  assert.equal(deniedRes.ok, false);
  assert.equal(deniedRes.kind, 'err');
  assert.match(deniedRes.text, /✖ 撤销系统通知权限失败/);
  assert.match(deniedRes.text, /Chrome 权限仍保留；可重试/);

  const throwing: PermissionsApiLike = {
    contains: async () => true,
    request: async () => true,
    remove: async () => {
      throw new Error('You cannot remove required permissions.');
    },
  };
  const throwingRes = await makeOps({ permissions: throwing }).revokeCapability('bookmarks');
  assert.equal(throwingRes.ok, false);
  assert.match(throwingRes.text, /You cannot remove required permissions\./);

  const missing: PermissionsApiLike = { contains: async () => false, request: async () => true };
  const missingRes = await makeOps({ permissions: missing }).revokeCapability('downloads');
  assert.equal(missingRes.ok, false);
  assert.match(missingRes.text, /不支持 chrome\.permissions\.remove/);
});

test('TASK-040: loadCapabilities measures grants live in the page (contains wins over the toggle)', async () => {
  // Background says every capability is granted; the page's live probe says none are.
  const permissions: PermissionsApiLike = { contains: async () => false, request: async () => true, remove: async () => true };
  const res = await makeOps({ permissions, payload: capabilitiesPayload({ bookmarks: true, downloads: true, notify: true, clipboard: true }) }).loadCapabilities();
  assert.equal(res.ok, true);
  assert.ok(res.data);
  for (const cap of ['bookmarks', 'downloads', 'notify', 'clipboard'] as const) {
    assert.equal(res.data[cap].granted, false, `${cap}: measured contains=false must win`);
  }
});

// ── tool surface follows the permission (suppressCapability) ──────────────────

test('TASK-040 tools: suppressCapability removes each capability tool from deriveTools(); re-grant restores it', () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    bookmarks: {
      hasPermission: () => true,
      listBookmarks: async () => [],
      searchBookmarks: async () => [],
      getTree: async () => [],
      addBookmark: async () => ({ ok: true, output: 'added' }),
      removeBookmark: async () => ({ ok: true, output: 'removed' }),
      moveBookmark: async () => ({ ok: true, output: 'moved' }),
      audit,
    },
    downloads: {
      hasPermission: () => true,
      listDownloads: async () => [],
      searchDownloads: async () => [],
      audit,
    },
    notify: {
      hasPermission: () => true,
      listNotifications: async () => ({ entries: [], permissionLevel: 'granted' }),
      createNotification: async () => ({ ok: true, output: 'created' }),
      clearNotification: async () => ({ ok: true, output: 'cleared' }),
      audit,
    },
    clipboard: {
      hasReadPermission: () => true,
      hasWritePermission: () => true,
      readText: async () => ({ ok: true, text: '' }),
      writeText: async () => ({ ok: true, chars: 0 }),
      audit,
    },
  });

  const names = () => host.deriveTools().map((t) => t.name);
  assert.ok(names().includes('bookmarks') && names().includes('downloads') && names().includes('notify') && names().includes('clipboard'));

  for (const cap of ['bookmarks', 'downloads', 'notify', 'clipboard'] as const) {
    host.suppressCapability(cap, true);
    assert.equal(host.isCapabilitySuppressed(cap), true);
    assert.equal(names().includes(cap), false, `${cap} must leave deriveTools() on revoke`);
    host.suppressCapability(cap, false);
    assert.equal(names().includes(cap), true, `${cap} must return to deriveTools() on re-grant`);
  }
});
