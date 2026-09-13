/**
 * FR-054 static wiring guards for the optional-permission capabilities.
 *
 * Pins the security-critical shape without a browser:
 *  - the **static** `permissions` set is unchanged (zero install-surface drift);
 *    the two new capabilities live ONLY in `optional_permissions`;
 *  - no `<all_urls>` and no wildcard all-origin pattern, and no static
 *    `content_scripts` appear;
 *  - `chrome.permissions.request` is called from the extension-page click path
 *    (side panel + options), NEVER from the service worker;
 *  - the tools are registered in `test/parity/waivers.json#pluginExtras`;
 *  - both capabilities are audited with dedicated event types.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('FR-054 manifest: static permissions unchanged; bookmarks/downloads are optional only', () => {
  const manifest = JSON.parse(read('../../manifest.json')) as {
    permissions: string[];
    optional_permissions?: string[];
    host_permissions: string[];
    optional_host_permissions: string[];
    content_scripts?: unknown[];
    minimum_chrome_version?: string;
  };
  assert.deepEqual(
    [...manifest.permissions].sort(),
    ['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs'],
    'static permissions must NOT gain bookmarks/downloads',
  );
  assert.deepEqual([...(manifest.optional_permissions ?? [])].sort(), ['bookmarks', 'downloads']);
  const all = [
    ...manifest.permissions,
    ...(manifest.optional_permissions ?? []),
    ...manifest.host_permissions,
    ...manifest.optional_host_permissions,
  ];
  assert.equal(all.includes('<all_urls>'), false);
  assert.equal(all.includes('*://*/*'), false);
  assert.equal(manifest.content_scripts, undefined, 'no static content_scripts');
  assert.equal(manifest.minimum_chrome_version, '116', 'minimum_chrome_version unchanged');
  // host_permissions stays the 6 LLM endpoints.
  assert.equal(manifest.host_permissions.length, 6);
});

test('FR-054: chrome.permissions.request lives in the extension page click path, not the SW', () => {
  const sw = read('../../src/background/service-worker.ts');
  // The SW may check/count grants, but must never *request* (no gesture there).
  assert.equal(/\.request\s*\(/.test(sw), false, 'the service worker must never call chrome.permissions.request');

  const helper = read('../../src/platform/capability-permissions.ts');
  assert.match(helper, /requestCapabilityPermissionOnGesture/);
  // The request call is syntactically inside the gesture helper.
  assert.match(helper, /request\(\{ permissions: permissionsOf\(cap\) \}\)/);

  const panel = read('../../src/ui/settings/panel.ts');
  assert.match(panel, /requestCapabilityPermissionOnGesture\(cap\)/);
  assert.match(panel, /requestCapability\('bookmarks'/);
  assert.match(panel, /requestCapability\('downloads'/);
  assert.match(panel, /bkRequest\.addEventListener\('click'/);
  assert.match(panel, /dlRequest\.addEventListener\('click'/);
  assert.match(panel, /id: 'settings-cap-bookmarks-request'/);
  assert.match(panel, /id: 'settings-cap-downloads-request'/);

  const options = read('../../src/ui/options/options.ts');
  assert.match(options, /requestCapabilityPermissionOnGesture/);
  assert.match(options, /\$\('cap-bookmarks-request'\)\.addEventListener\('click'/);
  assert.match(options, /\$\('cap-downloads-request'\)\.addEventListener\('click'/);
  const html = read('../../src/ui/options/index.html');
  for (const id of ['cap-bookmarks-request', 'cap-downloads-request', 'cap-bookmarks-status', 'cap-downloads-status']) {
    assert.match(html, new RegExp(`id="${id}"`), `options.html must expose #${id}`);
  }
});

test('FR-054: the tools are registered as parity pluginExtras with reason + basis', () => {
  const waivers = JSON.parse(read('../../test/parity/waivers.json')) as {
    pluginExtras: Record<string, { reason: string; basis: string }>;
  };
  for (const name of ['bookmarks', 'downloads']) {
    const extra = waivers.pluginExtras[name];
    assert.ok(extra, `${name} must be registered in pluginExtras`);
    assert.ok(extra.reason.length > 0, `${name} needs a reason`);
    assert.ok(extra.basis.includes('FR-054'), `${name} basis must reference FR-054`);
  }
});

test('FR-054: dedicated audit event types + destructive remove wiring exist', () => {
  const audit = read('../../src/security/audit-sink.ts');
  assert.match(audit, /'bookmarks'/);
  assert.match(audit, /'downloads'/);
  assert.match(audit, /'optional-permission'/);

  const host = read('../../src/background/host.ts');
  assert.match(host, /isPluginDestructiveInvocation/);
  assert.match(host, /isBookmarksDestructive/);
  assert.match(host, /suppressCapability/);

  const bookmarks = read('../../src/tools/bookmarks-tools.ts');
  assert.match(bookmarks, /BOOKMARKS_DESTRUCTIVE_SUBCOMMANDS/);
  assert.match(bookmarks, /destructive/);
  // No dot in the LLM function name.
  assert.match(bookmarks, /export const BOOKMARKS_TOOL_NAME = 'bookmarks'/);
  const downloads = read('../../src/tools/downloads-tools.ts');
  assert.match(downloads, /export const DOWNLOADS_TOOL_NAME = 'downloads'/);
  // cancel/pause/erase/open intentionally refused.
  assert.match(downloads, /DOWNLOADS_UNSUPPORTED_SUBCOMMANDS/);
});
