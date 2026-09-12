/**
 * TASK-031 / D-128: URL-driven tab-follow unit tests (node, mock chrome).
 *
 * These pin the real-defect fix: switching to a **new domain** TAB must
 * auto-create/switch that origin's session (and push the panel) instead of
 * falling into the old `markStale` dead end, while an authorized origin also
 * injects + kicks discovery and an unauthorized one performs **zero injection**.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followActiveTab, tabOrigin, type FollowActiveBinding, type FollowTabDeps } from '../src/background/session-follow.js';

interface Harness {
  deps: FollowTabDeps;
  sessions: Map<string, string>;
  pushes: string[];
  injects: number[];
  discovered: number[];
  notices: string[];
  stale: number;
  handshakeCalls: number[];
  setTab(tabId: number, url: string | undefined): void;
  setCurrent(binding: FollowActiveBinding | null): void;
  current(): FollowActiveBinding | null;
  authorize(origin: string): void;
  setInjectResult(v: boolean): void;
  setHandshakeResult(v: boolean): void;
}

function makeHarness(): Harness {
  const tabUrls = new Map<number, string | undefined>();
  const authorized = new Set<string>();
  const sessions = new Map<string, string>();
  const pushes: string[] = [];
  const injects: number[] = [];
  const discovered: number[] = [];
  const notices: string[] = [];
  const handshakeCalls: number[] = [];
  let current: FollowActiveBinding | null = null;
  let injectResult = true;
  let handshakeResult = false;
  let stale = 0;

  const deps: FollowTabDeps = {
    current: () => current,
    getTabUrl: async (tabId) => tabUrls.get(tabId),
    autoBindFromTab: async (tabId) => {
      handshakeCalls.push(tabId);
      if (handshakeResult) {
        current = { tabId, origin: 'https://handshake.test', sessionId: 'https://handshake.test', invalidated: false };
        pushes.push('https://handshake.test');
      }
      return handshakeResult;
    },
    bindOrigin: async (tabId, origin) => {
      let sid = sessions.get(origin);
      if (!sid) {
        sid = origin;
        sessions.set(origin, sid);
      }
      current = { tabId, origin, sessionId: sid, invalidated: false };
      // bindOrigin → switchSession → session-changed push (panel follow).
      pushes.push(sid);
    },
    isAuthorized: async (origin) => authorized.has(origin),
    ensureContentScript: async (tabId) => {
      injects.push(tabId);
      return injectResult;
    },
    kickDiscovery: (tabId) => {
      discovered.push(tabId);
    },
    markStale: () => {
      stale += 1;
      if (current) current = { ...current, invalidated: true };
    },
    persist: async () => undefined,
    notice: (text) => {
      notices.push(text);
    },
  };

  return {
    deps,
    sessions,
    pushes,
    injects,
    discovered,
    notices,
    get stale() {
      return stale;
    },
    handshakeCalls,
    setTab: (tabId, url) => tabUrls.set(tabId, url),
    setCurrent: (binding) => {
      current = binding;
    },
    current: () => current,
    authorize: (origin) => authorized.add(origin),
    setInjectResult: (v) => {
      injectResult = v;
    },
    setHandshakeResult: (v) => {
      handshakeResult = v;
    },
  };
}

test('tabOrigin only accepts http(s) and rejects restricted/unreadable URLs', () => {
  assert.equal(tabOrigin('https://a.test/x?y#z'), 'https://a.test');
  assert.equal(tabOrigin('http://localhost:5173/'), 'http://localhost:5173');
  assert.equal(tabOrigin('chrome://settings/'), null);
  assert.equal(tabOrigin('chrome-extension://abc/sidepanel.html'), null);
  assert.equal(tabOrigin('about:blank'), null);
  assert.equal(tabOrigin(''), null);
  assert.equal(tabOrigin(undefined), null);
});

test('unauthorized new domain: creates + switches its session, pushes the panel, ZERO injection', async () => {
  const h = makeHarness();
  h.setCurrent({ tabId: 1, origin: 'https://old.test', sessionId: 'https://old.test', invalidated: false });
  h.setTab(2, 'https://new.test/page');

  const outcome = await followActiveTab(h.deps, 2, 'activated');

  assert.equal(outcome.action, 'bound');
  assert.equal(outcome.origin, 'https://new.test');
  assert.equal(outcome.authorized, false);
  assert.equal(outcome.injected, false);
  // A new session exists AND the panel was pushed (session-changed) so it follows
  // without being reopened.
  assert.equal(h.sessions.get('https://new.test'), 'https://new.test');
  assert.deepEqual(h.pushes, ['https://new.test']);
  assert.equal(h.current()?.tabId, 2);
  // Auto-switch ≠ auto-authorize: absolutely no injection, no discovery.
  assert.deepEqual(h.injects, []);
  assert.deepEqual(h.discovered, []);
  // No error; a readable notice points at the actionable authorize path.
  assert.equal(h.stale, 0);
  assert.ok(h.notices.some((n) => /尚未授权/.test(n) && /授权当前站点/.test(n)), h.notices.join(' | '));
});

test('authorized domain: switches session + injects + kicks discovery', async () => {
  const h = makeHarness();
  h.authorize('https://ok.test');
  h.setTab(8, 'https://ok.test/dashboard');

  const outcome = await followActiveTab(h.deps, 8, 'activated');

  assert.equal(outcome.action, 'bound');
  assert.equal(outcome.authorized, true);
  assert.equal(outcome.injected, true);
  assert.deepEqual(h.injects, [8]);
  assert.deepEqual(h.discovered, [8]);
  assert.deepEqual(h.pushes, ['https://ok.test']);
  assert.ok(h.notices.some((n) => /已自动识别站点 https:\/\/ok\.test/.test(n)), h.notices.join(' | '));
});

test('same origin, another tab: reuses the SAME session (no new session)', async () => {
  const h = makeHarness();
  h.authorize('https://same.test');
  h.setCurrent({ tabId: 1, origin: 'https://same.test', sessionId: 'https://same.test', invalidated: false });
  // Seed the existing session as the store would have.
  h.sessions.set('https://same.test', 'https://same.test');
  h.setTab(2, 'https://same.test/other');

  const outcome = await followActiveTab(h.deps, 2, 'activated');

  assert.equal(outcome.action, 'bound');
  assert.equal(h.sessions.size, 1);
  assert.equal(h.current()?.sessionId, 'https://same.test');
  assert.equal(h.current()?.tabId, 2);
  assert.deepEqual(h.pushes, ['https://same.test']);
});

test('restricted page: does NOT create a session; readable degradation preserved', async () => {
  const h = makeHarness();
  h.setTab(9, 'chrome://settings/');

  // No bound session → nothing to invalidate, no session created.
  const noop = await followActiveTab(h.deps, 9, 'activated');
  assert.equal(noop.action, 'noop');
  assert.equal(h.sessions.size, 0);
  assert.deepEqual(h.pushes, []);
  assert.equal(h.stale, 0);

  // A bound session → the pre-existing readable stale degradation.
  h.setCurrent({ tabId: 1, origin: 'https://old.test', sessionId: 'https://old.test', invalidated: false });
  const stale = await followActiveTab(h.deps, 9, 'activated');
  assert.equal(stale.action, 'stale');
  assert.equal(h.stale, 1);
  assert.ok(h.notices.some((n) => /已切换标签页/.test(n)), h.notices.join(' | '));
  assert.equal(h.sessions.size, 0, 'restricted page must not create a session');
});

test('unreadable URL: whoami handshake is kept as the supplement/fallback', async () => {
  const h = makeHarness();
  h.setCurrent({ tabId: 1, origin: 'https://old.test', sessionId: 'https://old.test', invalidated: false });
  h.setTab(4, undefined);
  h.setHandshakeResult(true);

  const outcome = await followActiveTab(h.deps, 4, 'activated');

  assert.equal(outcome.action, 'handshake-bound');
  assert.deepEqual(h.handshakeCalls, [4]);
  assert.equal(h.stale, 0);
});

test("onUpdated(complete): a navigation to a new domain switches/creates the session", async () => {
  const h = makeHarness();
  h.setCurrent({ tabId: 5, origin: 'https://a.test', sessionId: 'https://a.test', invalidated: true });
  h.setTab(5, 'https://b.test/landing');

  const outcome = await followActiveTab(h.deps, 5, 'navigated');

  assert.equal(outcome.action, 'bound');
  assert.equal(outcome.origin, 'https://b.test');
  assert.equal(h.current()?.origin, 'https://b.test');
  assert.equal(h.current()?.invalidated, false);
  assert.deepEqual(h.pushes, ['https://b.test']);
});

test('no current session on first activate: still creates the session (old early-return not regressed)', async () => {
  const h = makeHarness();
  h.setCurrent(null);
  h.setTab(3, 'https://first.test/');

  const outcome = await followActiveTab(h.deps, 3, 'activated');

  assert.equal(outcome.action, 'bound');
  assert.equal(h.current()?.origin, 'https://first.test');
  assert.deepEqual(h.pushes, ['https://first.test']);
});

test('idempotent: the already-active binding is a no-op (no re-bind, no notice, no push)', async () => {
  const h = makeHarness();
  h.authorize('https://ok.test');
  h.setCurrent({ tabId: 6, origin: 'https://ok.test', sessionId: 'https://ok.test', invalidated: false });
  h.setTab(6, 'https://ok.test/');

  const outcome = await followActiveTab(h.deps, 6, 'activated');

  assert.equal(outcome.action, 'noop');
  assert.deepEqual(h.pushes, []);
  assert.deepEqual(h.injects, []);
  assert.deepEqual(h.notices, []);
});

test('authorized but injection fails: readable notice, no discovery kick, no throw', async () => {
  const h = makeHarness();
  h.authorize('https://ok.test');
  h.setInjectResult(false);
  h.setTab(11, 'https://ok.test/');

  const outcome = await followActiveTab(h.deps, 11, 'activated');

  assert.equal(outcome.action, 'bound');
  assert.equal(outcome.injected, false);
  assert.deepEqual(h.discovered, []);
  assert.ok(h.notices.some((n) => /注入失败/.test(n)), h.notices.join(' | '));
});
