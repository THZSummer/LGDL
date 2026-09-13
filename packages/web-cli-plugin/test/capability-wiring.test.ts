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

test('FR-054/FR-055 manifest: static permissions unchanged; every capability is optional only', () => {
  const manifest = JSON.parse(read('../../manifest.json')) as {
    permissions: string[];
    optional_permissions?: string[];
    host_permissions: string[];
    optional_host_permissions: string[];
    content_scripts?: unknown[];
    minimum_chrome_version?: string;
  };
  const staticPermissions = [...manifest.permissions].sort();
  assert.deepEqual(
    staticPermissions,
    ['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs'],
    'static permissions must NOT gain bookmarks/downloads/notify/clipboard',
  );
  const optional = [...(manifest.optional_permissions ?? [])].sort();
  assert.deepEqual(optional, ['bookmarks', 'clipboardRead', 'clipboardWrite', 'downloads', 'notifications']);
  // The three new permissions must never leak into the static install surface.
  for (const p of ['notifications', 'clipboardRead', 'clipboardWrite']) {
    assert.equal(staticPermissions.includes(p), false, `${p} must stay optional (never static)`);
    assert.equal(optional.includes(p), true, `${p} must be declared optional`);
  }
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
  // TASK-040: one three-state control per capability (dynamic label + action).
  assert.match(panel, /capabilityActionView\(row\.cap, grant\.granted, grant\.revoked\)/);
  assert.match(panel, /requestCapability\(row\)/);
  assert.match(panel, /revokeCapability\(row\)/);
  assert.match(panel, /for \(const row of capRows\)/);
  assert.match(panel, /row\.button\.addEventListener\('click'/);
  assert.match(panel, /id: `settings-cap-\$\{cap\}-request`/);
  assert.match(panel, /'settings-cap-clipboard-read'/);
  assert.match(panel, /'settings-cap-clipboard-write'/);
  assert.match(panel, /ops\.revokeCapability\(cap\)/);
  assert.match(panel, /CAPABILITY_EXPLANATION\[cap\]/);
  assert.match(panel, /settings-cap-\$\{cap\}-receipt/);

  const options = read('../../src/ui/options/options.ts');
  assert.match(options, /requestCapabilityPermissionOnGesture/);
  assert.match(options, /CAPABILITY_BUTTON_ID\[cap\]/);
  assert.match(options, /settingsOps\.revokeCapability\(cap\)/);
  assert.match(options, /button\.dataset\.mode === 'revoke'/);
  assert.match(options, /capabilityActionView\(cap, grant\.granted, grant\.revoked\)/);
  const html = read('../../src/ui/options/index.html');
  for (const id of [
    'cap-bookmarks-request',
    'cap-downloads-request',
    'cap-bookmarks-status',
    'cap-downloads-status',
    'cap-notify-request',
    'cap-notify-status',
    'cap-clipboard-request',
    'cap-clipboard-status',
    'cap-clipboard-read',
    'cap-clipboard-write',
    // TASK-040: the three-state badge + persistent receipt + explanation per row.
    'cap-bookmarks-badge',
    'cap-bookmarks-receipt',
    'cap-bookmarks-explain',
    'cap-notify-badge',
    'cap-notify-receipt',
    'cap-clipboard-badge',
    'cap-clipboard-receipt',
  ]) {
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

test('FR-054/FR-055: dedicated audit event types + destructive remove wiring exist', () => {
  const audit = read('../../src/security/audit-sink.ts');
  assert.match(audit, /'bookmarks'/);
  assert.match(audit, /'downloads'/);
  assert.match(audit, /'notify'/);
  assert.match(audit, /'clipboard'/);
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

test('FR-055: notify/clipboard are provided under the baseline name (no waiver, no pluginExtra)', () => {
  const waivers = JSON.parse(read('../../test/parity/waivers.json')) as {
    waivers: Record<string, unknown>;
    pluginExtras: Record<string, unknown>;
  };
  // Same-name baseline tools: coverage is enforced by the parity gate itself.
  assert.equal(waivers.waivers.notify, undefined, 'notify must no longer be waived');
  assert.equal(waivers.waivers.clipboard, undefined, 'clipboard must no longer be waived');
  assert.equal(waivers.pluginExtras.notify, undefined, 'notify is a baseline name, not a pluginExtra');
  assert.equal(waivers.pluginExtras.clipboard, undefined, 'clipboard is a baseline name, not a pluginExtra');

  // `notify` runs on the real chrome.notifications host API (base notify is a
  // page-context Notification face and cannot run in the SW).
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /chrome\.notifications\.create/);
  assert.match(sw, /chrome\.notifications\.getAll/);
  // `clipboard` forwards to an extension page (the SW has no navigator.clipboard).
  assert.match(sw, /makeMessage\('clipboard-op'/);
  const clipboardPage = read('../../src/platform/clipboard-page.ts');
  assert.match(clipboardPage, /performClipboardOp/);
  assert.match(clipboardPage, /navigator\.clipboard/);
  assert.match(clipboardPage, /execCommand/);
  // Both extension surfaces answer the forwarded op (side panel primary; options
  // page is the open surface in the headless e2e harness).
  assert.match(read('../../src/ui/sidepanel/sidepanel.ts'), /handleClipboardOpMessage/);
  assert.match(read('../../src/ui/options/options.ts'), /handleClipboardOpMessage/);
  // The SW still never calls permissions.request (gesture-only).
  assert.equal(/\.request\s*\(/.test(sw), false, 'the service worker must never call chrome.permissions.request');

  const notify = read('../../src/tools/notify-tools.ts');
  assert.match(notify, /export const NOTIFY_TOOL_NAME = 'notify'/);
  const clipboard = read('../../src/tools/clipboard-tools.ts');
  assert.match(clipboard, /export const CLIPBOARD_TOOL_NAME = 'clipboard'/);
  // Cropped rich subcommands remain declared (parity subcommand coverage) but refuse.
  assert.match(clipboard, /CLIPBOARD_CROPPED_SUBCOMMANDS/);
});

test('FR-055: clipboard read is state-tier; the confirm/audit path scrubs content args', () => {
  const clipboard = read('../../src/tools/clipboard-tools.ts');
  assert.match(clipboard, /read: 'state'/, 'clipboard read must be the state tier');
  assert.match(clipboard, /CLIPBOARD_CROPPED_TEXT/);
  const confirm = read('../../src/security/confirm.ts');
  assert.match(confirm, /scrubContentArgs/);
  assert.match(confirm, /CONTENT_ARG_TOOLS/);
});
