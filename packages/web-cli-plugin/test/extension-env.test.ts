import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  hasOriginPermission,
  originPermissionPattern,
  removeOriginPermission,
  requestOriginPermission,
  requestOriginPermissionDetailed,
} from '../src/platform/extension-env.js';

test('extension-env: origin permission pattern is http(s)-only and normalized', () => {
  assert.equal(originPermissionPattern('https://Example.com/'), 'https://example.com/*');
  assert.equal(originPermissionPattern('http://127.0.0.1:8080'), 'http://127.0.0.1:8080/*');
  assert.equal(originPermissionPattern('https://a.test/path?q=1'), 'https://a.test/*');
  assert.equal(originPermissionPattern('chrome://extensions'), null);
  assert.equal(originPermissionPattern('file:///tmp/x'), null);
  assert.equal(originPermissionPattern('not a url'), null);
  assert.equal(originPermissionPattern(''), null);
});

// D-064: http dev origins (e.g. the vite dev server on localhost:5173) must be
// requestable, so the manifest must declare http://*/* as an optional host
// permission (https-only silently rejected every local dev site).
test('extension-env: manifest declares http://*/* optional host permission (D-064)', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')) as {
    optional_host_permissions: string[];
    minimum_chrome_version: string;
    permissions: string[];
  };
  assert.ok(manifest.optional_host_permissions.includes('http://*/*'), 'http origins must be requestable');
  assert.ok(manifest.optional_host_permissions.includes('https://*/*'), 'https remains requestable');
  assert.ok(Number(manifest.minimum_chrome_version) >= 116, 'sidePanel.open needs Chrome 116+');
  assert.equal(manifest.permissions.includes('tabs'), false, 'must not escalate to the tabs permission');
});

test('extension-env: http origin yields the right pattern and a readable reason on denial (D-064)', async () => {
  const original = (globalThis as { chrome?: unknown }).chrome;
  (globalThis as { chrome?: unknown }).chrome = {
    permissions: { request: async () => false },
  };
  try {
    const denied = await requestOriginPermissionDetailed('http://localhost:5173');
    assert.equal(denied.pattern, 'http://localhost:5173/*');
    assert.equal(denied.granted, false);
    assert.match(denied.reason ?? '', /未授予|拒绝|取消/);

    (globalThis as { chrome?: unknown }).chrome = { permissions: { request: async () => true } };
    const granted = await requestOriginPermissionDetailed('http://localhost:5173');
    assert.equal(granted.granted, true);
    assert.equal(granted.pattern, 'http://localhost:5173/*');

    const nonHttp = await requestOriginPermissionDetailed('chrome://extensions');
    assert.equal(nonHttp.pattern, null);
    assert.match(nonHttp.reason ?? '', /http\(s\)/);
  } finally {
    if (original === undefined) delete (globalThis as { chrome?: unknown }).chrome;
    else (globalThis as { chrome?: unknown }).chrome = original;
  }
});

test('extension-env: permission request degrades to false without chrome (never throws)', async () => {
  // In node there is no chrome global: both helpers must resolve false, not throw.
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await requestOriginPermission('https://a.test'), false);
    assert.equal(await hasOriginPermission('https://a.test'), false);
    assert.equal(await removeOriginPermission('https://a.test'), false);
    assert.equal(await requestOriginPermission('not a url'), false);
  } finally {
    console.warn = warn;
  }
});

test('extension-env: EC-008 revoke → permission removed, status false, re-request works', async () => {
  const original = (globalThis as { chrome?: unknown }).chrome;
  let granted = true;
  const calls: string[] = [];
  (globalThis as { chrome?: unknown }).chrome = {
    permissions: {
      contains: async () => granted,
      remove: async () => {
        calls.push('remove');
        granted = false;
        return true;
      },
      request: async () => {
        calls.push('request');
        granted = true;
        return true;
      },
    },
  };
  try {
    assert.equal(await hasOriginPermission('https://a.test'), true);
    assert.equal(await removeOriginPermission('https://a.test'), true);
    assert.equal(await hasOriginPermission('https://a.test'), false);
    assert.equal(await requestOriginPermission('https://a.test'), true);
    assert.deepEqual(calls, ['remove', 'request']);
  } finally {
    if (original === undefined) delete (globalThis as { chrome?: unknown }).chrome;
    else (globalThis as { chrome?: unknown }).chrome = original;
  }
});
