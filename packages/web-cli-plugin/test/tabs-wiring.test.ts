/**
 * FR-049 (author decision ③ + author reversal 2026-09-13) static wiring guards.
 *
 * The runtime proof of the tab tool lives in `test/tabs-tools.test.ts` (node,
 * injected deps) and in `test/ui/binding.mjs` (real dist + real Chrome + mock
 * LLM). These cheap assertions pin the shape so a refactor cannot silently drop
 * the privacy toggle or the safety handling of `close` (risk tier, single-tab
 * guard, irreversibility copy), or escalate the permission surface beyond the
 * approved set.
 *
 * NOTE (2026-09-13 author reversal): the previous assertions
 * 「no close implementation exists anywhere in the tabs surface」 were **replaced**
 * (not deleted) by the positive counterparts below — `close` now exists and must
 * keep `write`→ask risk, single-tab (no batch) semantics and the irreversibility
 * disclosure. See spec.md FR-049 revision + build.md §35.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABS_SUBCOMMANDS, TABS_SUBCOMMAND_RISKS } from '../src/tools/tabs-tools.js';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('FR-049: background wires the tabs tool + privacy toggle', () => {
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /createTabsDeps\(/);
  assert.match(sw, /tabs: tabsDeps/);
  assert.match(sw, /tabsEnabled: tabsSetting\.get\(\)/);
  assert.match(sw, /case 'tabs-setting'/);
  assert.match(sw, /s\.host\.setTabsEnabled\(/);
  assert.match(read('../../src/background/tabs-setting.ts'), /TABS_SETTING_KEY/);
});

test('FR-049: options page exposes the privacy toggle and talks to the background', () => {
  const html = read('../../src/ui/options/index.html');
  assert.match(html, /id="tabs-enabled"/);
  assert.match(html, /允许助手查看\/切换标签页/);
  assert.match(html, /--full/);
  // Author reversal (2026-09-13): the options copy now advertises close + its
  // single-tab + irreversible safety contract (the old「不含 close」copy is gone).
  assert.equal(/不含 close|明确不关闭标签页/.test(html), false, 'no stale "no close" copy');
  assert.match(html, /close/);
  assert.match(html, /不可逆/);
  assert.match(html, /一次只关一个/);
  const opts = read('../../src/ui/options/options.ts');
  // TASK-033: the request itself lives in the shared ops module (panel parity);
  // the options page still wires the toggle and delegates to it.
  assert.match(opts, /from '\.\.\/settings\/ops\.js'/);
  assert.match(read('../../src/ui/settings/ops.ts'), /makeMessage\('tabs-setting'/);
  assert.match(opts, /\$\('tabs-enabled'\)\.addEventListener\('change'/);
});

test('FR-049: close is implemented with write→ask risk, single-tab + irreversibility guards', () => {
  // Positive counterpart (replaces the removed「no close」assertion).
  assert.equal((TABS_SUBCOMMANDS as readonly string[]).includes('close'), true, 'close must be a subcommand');
  assert.equal(TABS_SUBCOMMAND_RISKS.close, 'write', 'close must stay write → ask (never widened)');
  const src = read('../../src/tools/tabs-tools.ts');
  assert.match(src, /'\s*close\s*'/, 'close subcommand case must exist');
  assert.match(src, /closeTab/, 'the close op must be wired through deps');
  assert.match(src, /禁止批量|不支持 --all/, 'batch close must be rejected');
  assert.match(src, /不可逆/, 'close must disclose irreversibility');
  // The background implementation audits + strips query/fragment from URLs.
  const sw = read('../../src/background/service-worker.ts');
  assert.match(sw, /closeTab:/);
  assert.match(sw, /关闭标签页不可逆/);
  assert.match(sw, /redactTabUrl\(/);
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
