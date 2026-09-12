/**
 * FR-049 (author decision ③) static wiring guards.
 *
 * The runtime proof of the tab tool lives in `test/tabs-tools.test.ts` (node,
 * injected deps) and in `test/ui/binding.mjs` (real dist + real Chrome + mock
 * LLM). These cheap assertions pin the shape so a refactor cannot silently drop
 * the privacy toggle, re-add a `close` path, or escalate the permission surface
 * beyond the approved set.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('FR-049: background wires the tabs tool + privacy toggle', () => {
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /createTabsDeps\(/);
  assert.match(sw, /tabs: createTabsDeps\(/);
  assert.match(sw, /tabsEnabled: tabsSetting\.get\(\)/);
  assert.match(sw, /case 'tabs-setting'/);
  assert.match(sw, /s\.host\.setTabsEnabled\(/);
  assert.match(read('../../src/background/tabs-setting.ts'), /TABS_SETTING_KEY/);
});

test('FR-049: options page exposes the privacy toggle and talks to the background', () => {
  const html = read('../../src/ui/options/index.html');
  assert.match(html, /id="tabs-enabled"/);
  assert.match(html, /允许助手查看\/切换标签页/);
  assert.match(html, /不含 close/);
  assert.match(html, /--full/);
  const opts = read('../../src/ui/options/options.ts');
  assert.match(opts, /makeMessage\('tabs-setting'/);
  assert.match(opts, /\$\('tabs-enabled'\)\.addEventListener\('change'/);
});

test('FR-049: no close implementation exists anywhere in the tabs surface', () => {
  const src = read('../../src/tools/tabs-tools.ts');
  assert.equal(/'close'/.test(src), false, 'close must not be a subcommand');
  assert.equal(/subcommand\s*===\s*['"]close/.test(src), false);
  // The only mention of close is the explicit non-support copy.
  assert.match(src, /不支持：close|不含 close|不支持 close/);
});

test('FR-049: permission surface is exactly the approved set (tabs added by author decision ③)', () => {
  const manifest = JSON.parse(read('../../manifest.json')) as {
    permissions: string[];
    host_permissions: string[];
    optional_host_permissions: string[];
  };
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs']);
  const allPerms = [...manifest.host_permissions, ...manifest.optional_host_permissions, ...manifest.permissions];
  assert.equal(allPerms.includes('<all_urls>'), false);
  assert.equal(allPerms.includes('*://*/*'), false);
});

test('FR-049: the tabs tool is not in the disabled base tool set (page-eval/eval-js/... stay off)', () => {
  const sw = read('../../src/background/service-worker.ts');
  for (const banned of ['page-eval', 'eval-js', 'eval-wasm', 'subagent', 'net-tools']) {
    assert.equal(sw.includes(`'${banned}'`), false, `${banned} must not be registered`);
  }
  const host = read('../../src/background/host.ts');
  assert.equal(/from.*page-eval/.test(host), false);
  assert.equal(/from.*eval-tools/.test(host), false);
});
