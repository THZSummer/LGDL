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
import { buildStateMessage } from '../src/background/state-message.js';

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
