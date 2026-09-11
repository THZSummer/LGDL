import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasOriginPermission,
  originPermissionPattern,
  removeOriginPermission,
  requestOriginPermission,
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
