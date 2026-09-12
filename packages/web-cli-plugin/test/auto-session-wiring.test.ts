/**
 * decision ①/② static wiring guards (companion to the runtime proofs in
 * `test/ui/binding.mjs` and the node units in `session-store.test.ts` /
 * `content-script-registry.test.ts`).
 *
 * These pin the *shape* of the auto-detection + multi-session fix so a refactor
 * cannot silently restore the "must click the icon every time / one global
 * session" behavior without a red test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('decision ①: authorize registers a declarative content script; revoke unregisters', () => {
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /registerSiteContentScript\(s\.contentScripts, origin\)/);
  assert.match(sw, /unregisterSiteContentScript\(s\.contentScripts, origin\)/);
  // Startup + permission lifecycle reconciliation (补齐缺失 / 清理已撤销).
  assert.match(sw, /reconcileContentScripts\(/);
  assert.match(sw, /chrome\.permissions\.onAdded\.addListener/);
  assert.match(sw, /chrome\.runtime\.onInstalled\.addListener/);
  assert.match(read('../../src/background/content-script-registry.ts'), /persistAcrossSessions: true/);
});

test('decision ①: content script self-reports hello and answers whoami', () => {
  const cs = read('../../src/content/content-script.ts');
  assert.match(cs, /makeMessage\('hello'/);
  assert.match(cs, /location\.origin/);
  assert.match(cs, /raw\.kind === 'whoami'/);
});

test('decision ①: tab switch auto-binds via whoami without reading tab.url', () => {
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /autoBindFromTab\(s, activeInfo\.tabId\)/);
  assert.match(sw, /makeMessage\('whoami'\)/);
  // The onActivated handler must remain url-free (least privilege; no tabs perm).
  const onActivated = sw.slice(sw.indexOf('chrome.tabs.onActivated.addListener'));
  const body = onActivated.slice(0, onActivated.indexOf('chrome.tabs.onUpdated.addListener'));
  assert.equal(/\.url/.test(body), false, 'onActivated must not read tab.url');
});

test('decision ②: session switch cancels pending confirm/ask and restores that session history', () => {
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /askBridge\.cancelAll\(\)/);
  assert.match(sw, /cancelPendingConfirm\(\)/);
  assert.match(sw, /chatSession\.restore\(s\.sessions\.historyOf\(sessionId\)\)/);
  assert.match(sw, /sessionIdAtStart/);
  // Per-session persistence (not a single global history key anymore).
  assert.match(sw, /sessions\.setHistory\(sessionId/);
});

test('decision ②: grouping is exposed and documented as NOT authorization', () => {
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /case 'session-group'/);
  assert.match(sw, /case 'session-switch'/);
  assert.match(sw, /case 'sessions'/);
  const html = read('../../src/ui/sidepanel/index.html');
  assert.match(html, /不代表互相授权/);
});

test('decision ①/② + author decision ③: permission set is exactly the approved expansion (tabs approved 2026-09-12; no <all_urls>; no static content_scripts)', () => {
  const manifest = JSON.parse(read('../../manifest.json')) as {
    permissions: string[];
    host_permissions: string[];
    optional_host_permissions: string[];
    content_scripts?: unknown;
  };
  // Author decision ③ (2026-09-12) approved the `tabs` permission for the tab
  // management tool (list/switch/open). The set must contain tabs and must NOT
  // have grown any other broad permission.
  assert.equal(manifest.permissions.includes('tabs'), true, 'tabs permission approved by author decision ③');
  assert.deepEqual(
    [...manifest.permissions].sort(),
    ['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs'],
    'permissions must be exactly the approved set (no other escalation)',
  );
  assert.equal(manifest.content_scripts, undefined, 'no static all-site content_scripts');
  const all = [...manifest.host_permissions, ...manifest.optional_host_permissions];
  assert.equal(all.includes('<all_urls>'), false);
  assert.equal(all.includes('*://*/*'), false);
});
