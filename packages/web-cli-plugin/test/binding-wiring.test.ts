/**
 * D-064 / D-065: static wiring guards for the site-binding chain.
 *
 * The runtime end-to-end proof lives in `test/ui/binding.mjs` (real dist + real
 * site + mock LLM). These assertions are the cheap, always-run companion: they
 * pin the *shape* of the fix that made the toolbar icon click bind at all, so a
 * future refactor cannot silently restore the "click only opens the panel, never
 * binds" regression.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('D-064: the action click binds (openPanelOnActionClick must NOT be true)', () => {
  const sw = read('../../src/background/service-worker.ts');

  // The root cause: Chrome suppresses `action.onClicked` while this is true.
  assert.equal(
    /setPanelBehavior\(\{\s*openPanelOnActionClick:\s*true/.test(sw),
    false,
    'openPanelOnActionClick:true kills action.onClicked → the icon could never bind',
  );
  assert.match(sw, /setPanelBehavior\(\{\s*openPanelOnActionClick:\s*false\s*\}\)/);
  assert.match(sw, /void configureSidePanelBehavior\(\)/);

  // The click handler exists, hands the tab callback's URL to the shared binder,
  // and opens the panel in the same gesture.
  assert.match(sw, /chrome\.action\.onClicked\.addListener\(\(tab\)/);
  assert.match(sw, /bindTab\(s, tabId, tab\.url\)/);
  assert.match(sw, /const opening = openSidePanel\(tabId\)/);
  assert.match(sw, /chrome\.sidePanel\.open\(\{\s*tabId\s*\}\)/);
});

test('D-065: switching away from the bound tab marks the session stale, url-free', () => {
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /chrome\.tabs\.onActivated\.addListener/);
  assert.match(sw, /s\.controller\.markStale\(\)/);
  assert.match(sw, /已切换标签页/);
  // No `tabs`-permission-dependent URL read on this path.
  const onActivated = sw.slice(sw.indexOf('chrome.tabs.onActivated.addListener'));
  assert.equal(/onActivated[\s\S]{0,600}\.url/.test(onActivated.slice(0, 700)), false, 'onActivated must not read tab.url');
});

test('D-064: least privilege is preserved (no tabs permission, no <all_urls>)', () => {
  const manifest = JSON.parse(read('../../manifest.json')) as { permissions: string[]; host_permissions: string[]; optional_host_permissions: string[] };
  assert.equal(manifest.permissions.includes('tabs'), false);
  const all = [...manifest.host_permissions, ...manifest.optional_host_permissions];
  assert.equal(all.includes('<all_urls>'), false);
  assert.equal(all.includes('*://*/*'), false);
  // http is requested *optionally* (prompt on authorize), never granted up front.
  assert.ok(manifest.optional_host_permissions.includes('http://*/*'));
  assert.equal(manifest.host_permissions.includes('http://*/*'), false);
});
