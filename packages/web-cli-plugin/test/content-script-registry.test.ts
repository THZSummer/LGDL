/**
 * decision ① / FR-047 — declarative site content-script registry unit tests.
 *
 * Covers: deterministic ids/patterns, register idempotency, startup
 * reconciliation (补齐缺失 / 清理已撤销), foreign-script exclusion, and readable
 * failures (never silent).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SITE_SCRIPT_ID_PREFIX,
  originFromMatches,
  reconcileSiteContentScripts,
  registerSiteContentScript,
  siteContentScriptId,
  siteMatchPattern,
  stableHash,
  unregisterSiteContentScript,
  type ContentScriptsApi,
  type RegisteredScriptLike,
  type SiteScriptRegistration,
} from '../src/background/content-script-registry.js';

function fakeApi(seed: SiteScriptRegistration[] = []): ContentScriptsApi & { scripts: SiteScriptRegistration[]; failRegister?: string; failList?: string } {
  const api: ContentScriptsApi & { scripts: SiteScriptRegistration[]; failRegister?: string; failList?: string } = {
    scripts: seed.map((s) => ({ ...s })),
    async registerContentScripts(scripts) {
      if (api.failRegister) throw new Error(api.failRegister);
      for (const s of scripts) {
        if (api.scripts.some((x) => x.id === s.id)) throw new Error(`Duplicate content script ID: '${s.id}'`);
        api.scripts.push({ ...s });
      }
    },
    async unregisterContentScripts(filter) {
      const ids = new Set(filter?.ids ?? api.scripts.map((s) => s.id));
      api.scripts = api.scripts.filter((s) => !ids.has(s.id));
    },
    async getRegisteredContentScripts(filter): Promise<RegisteredScriptLike[]> {
      if (api.failList) throw new Error(api.failList);
      const ids = filter?.ids ? new Set(filter.ids) : undefined;
      return api.scripts.filter((s) => !ids || ids.has(s.id)).map((s) => ({ id: s.id, matches: [...s.matches] }));
    },
  };
  return api;
}

test('registry: ids are deterministic, prefixed and legal', () => {
  const a = siteContentScriptId('https://a.test');
  assert.equal(a, siteContentScriptId('https://a.test'));
  assert.notEqual(a, siteContentScriptId('https://b.test'));
  assert.ok(a.startsWith(SITE_SCRIPT_ID_PREFIX));
  assert.match(a, /^[A-Za-z0-9_]+$/, 'id must be legal for registerContentScripts');
  assert.equal(stableHash('x').length, 8);
});

test('registry: match patterns only cover http(s)', () => {
  assert.equal(siteMatchPattern('http://localhost:5173'), 'http://localhost:5173/*');
  assert.equal(siteMatchPattern('https://a.test/path'), 'https://a.test/*');
  assert.equal(siteMatchPattern('chrome://extensions'), null);
  assert.equal(siteMatchPattern('not a url'), null);
  assert.equal(originFromMatches(['https://a.test/*']), 'https://a.test');
  assert.equal(originFromMatches(['<all_urls>']), null);
});

test('registry: register is idempotent and reports failure readably', async () => {
  const api = fakeApi();
  const first = await registerSiteContentScript(api, 'https://a.test');
  assert.equal(first.ok, true);
  assert.equal(first.alreadyRegistered, undefined);
  assert.equal(api.scripts.length, 1);
  assert.deepEqual(api.scripts[0]!.matches, ['https://a.test/*']);
  assert.equal(api.scripts[0]!.persistAcrossSessions, true);
  assert.equal(api.scripts[0]!.runAt, 'document_idle');

  const second = await registerSiteContentScript(api, 'https://a.test');
  assert.equal(second.ok, true);
  assert.equal(second.alreadyRegistered, true);
  assert.equal(api.scripts.length, 1, 'no duplicate registration');

  const bad = await registerSiteContentScript(fakeApi(), 'chrome://x');
  assert.equal(bad.ok, false);
  assert.match(bad.reason ?? '', /仅支持 http\(s\)/);

  const failing = fakeApi();
  failing.failRegister = 'missing host permission';
  const failure = await registerSiteContentScript(failing, 'https://a.test');
  assert.equal(failure.ok, false);
  assert.match(failure.reason ?? '', /missing host permission/);
});

test('registry: reconcile registers desired, cleans revoked, ignores foreign scripts', async () => {
  const api = fakeApi([
    { id: 'someoneElse_1', matches: ['https://other.test/*'], js: ['x.js'], runAt: 'document_idle', persistAcrossSessions: true },
    { id: siteContentScriptId('https://revoked.test'), matches: ['https://revoked.test/*'], js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true },
  ]);
  const report = await reconcileSiteContentScripts(api, ['https://a.test', 'https://revoked.test'.replace('revoked', 'kept')]);
  // revoked.test is registered but not desired → removed; a.test + kept.test registered.
  assert.deepEqual(report.removed, ['https://revoked.test']);
  assert.deepEqual(report.registered.sort(), ['https://a.test', 'https://kept.test']);
  assert.equal(report.failures.length, 0);
  const ids = api.scripts.map((s) => s.id);
  assert.ok(ids.includes('someoneElse_1'), 'foreign scripts untouched');
  assert.ok(!ids.includes(siteContentScriptId('https://revoked.test')));
});

test('registry: reconcile is idempotent on a second pass (no churn)', async () => {
  const api = fakeApi();
  const desired = ['https://a.test', 'https://b.test'];
  const first = await reconcileSiteContentScripts(api, desired);
  assert.equal(first.registered.length, 2);
  const second = await reconcileSiteContentScripts(api, desired);
  assert.equal(second.registered.length, 0);
  assert.equal(second.alreadyRegistered.length, 2);
  assert.equal(second.removed.length, 0);
  assert.equal(api.scripts.length, 2);
});

test('registry: reconcile failures are readable, never swallowed', async () => {
  const listFail = fakeApi();
  listFail.failList = 'boom-list';
  const listReport = await reconcileSiteContentScripts(listFail, ['https://a.test']);
  assert.equal(listReport.failures.length, 1);
  assert.match(listReport.failures[0]!.reason, /boom-list/);

  const regFail = fakeApi();
  regFail.failRegister = 'no permission';
  const regReport = await reconcileSiteContentScripts(regFail, ['https://a.test']);
  assert.equal(regReport.failures.length, 1);
  assert.equal(regReport.failures[0]!.action, 'register');
  assert.match(regReport.failures[0]!.reason, /no permission/);
});

test('registry: unregister removes the origin script best-effort', async () => {
  const api = fakeApi();
  await registerSiteContentScript(api, 'https://a.test');
  const res = await unregisterSiteContentScript(api, 'https://a.test');
  assert.equal(res.ok, true);
  assert.equal(api.scripts.length, 0);
  const again = await unregisterSiteContentScript(api, 'https://a.test');
  assert.equal(again.ok, true, 'unregistering a missing id is a readable no-op');
});
