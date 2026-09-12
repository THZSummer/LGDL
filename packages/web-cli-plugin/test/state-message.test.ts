/**
 * W1 — `state` message persistence of the per-origin authorization.
 *
 * The background is the only holder of the persisted OriginStore, so its
 * `state` reply must carry `authorized` for the bound origin. Regression here
 * re-introduces the "reopen the side panel → 未授权 / authorize clickable again"
 * bug (the panel is not authoritative).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStateMessage, projectActiveTab, restrictedPageReason } from '../src/background/state-message.js';

const ACTIVE = { tabId: 7, origin: 'https://a.test', discoveryState: 'supported', invalidated: false };

test('W1 state: authorized origin reports authorized=true (and keeps active/tools)', async () => {
  const payload = await buildStateMessage({
    active: ACTIVE,
    tools: ['site.notes-list'],
    isAuthorized: async (origin) => origin === 'https://a.test',
  });
  assert.equal(payload.authorized, true);
  assert.deepEqual(payload.active, ACTIVE);
  assert.deepEqual(payload.tools, ['site.notes-list']);
});

test('W1 state: known-but-unauthorized origin reports authorized=false', async () => {
  const payload = await buildStateMessage({
    active: ACTIVE,
    tools: [],
    isAuthorized: async () => false,
  });
  assert.equal(payload.authorized, false);
  assert.deepEqual(payload.active, ACTIVE);
});

test('W1 state: no bound origin → authorized=false and never queries the store', async () => {
  let queried = 0;
  const payload = await buildStateMessage({
    active: null,
    tools: [],
    isAuthorized: async () => {
      queried += 1;
      return true;
    },
  });
  assert.equal(payload.authorized, false);
  assert.equal(payload.active, null);
  assert.equal(queried, 0, 'no origin → do not touch the OriginStore');
});

test('W1 state: the authorization bit is read for the *bound* origin', async () => {
  const seen: string[] = [];
  await buildStateMessage({
    active: ACTIVE,
    tools: [],
    isAuthorized: async (origin) => {
      seen.push(origin);
      return true;
    },
  });
  assert.deepEqual(seen, ['https://a.test']);
});

// ── TASK-020 任务 B: active-tab projection (non-sensitive, node-testable) ────

test('active tab projection: http(s) tab yields a bindable origin (no path/title leaked)', () => {
  const view = projectActiveTab({ url: 'https://app.test/path?q=secret#frag' });
  assert.equal(view.present, true);
  assert.equal(view.restricted, false);
  assert.equal(view.origin, 'https://app.test');
  assert.equal(JSON.stringify(view).includes('secret'), false);
});

test('active tab projection: restricted pages are readable and marked injectable:false', () => {
  for (const [url, re] of [
    ['chrome://extensions', /chrome:\/\//],
    ['chrome-extension://abc/sidepanel.html', /chrome-extension:\/\//],
    ['https://chromewebstore.google.com/detail/x', /应用商店/],
    ['file:///tmp/options.html', /file:\/\//],
    ['about:blank', /about:/],
  ] as const) {
    const view = projectActiveTab({ url });
    assert.equal(view.restricted, true, `${url} must be restricted`);
    assert.equal(view.present, true);
    assert.match(view.reason ?? '', re, `reason for ${url}`);
  }
});

test('active tab projection: no tab / unknown URL fail readably (never silent)', () => {
  assert.deepEqual(projectActiveTab(undefined), { present: false, restricted: true, reason: '没有可用标签页' });
  assert.deepEqual(projectActiveTab(null), { present: false, restricted: true, reason: '没有可用标签页' });
  const empty = projectActiveTab({});
  assert.equal(empty.restricted, true);
  assert.ok((empty.reason ?? '').length > 0);
  assert.match(restrictedPageReason(''), /没有可读取的地址/);
});

test('state payload (TASK-020 B): the active-tab projection is carried (or explicit null)', async () => {
  const tab = projectActiveTab({ url: 'https://a.test' });
  const withTab = await buildStateMessage({ active: null, tools: [], isAuthorized: async () => false, tab });
  assert.deepEqual(withTab.tab, tab);
  const without = await buildStateMessage({ active: null, tools: [], isAuthorized: async () => false });
  assert.equal(without.tab, null);
});

test('state payload: the projection carries no key / page content (zero plaintext)', async () => {
  const tab = projectActiveTab({ url: 'https://a.test' });
  const payload = await buildStateMessage({ active: null, tools: [], isAuthorized: async () => false, tab });
  const json = JSON.stringify(payload);
  assert.equal(/sk-|apiKey|token/i.test(json), false);
});
