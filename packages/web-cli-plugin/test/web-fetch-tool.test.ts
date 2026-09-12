/**
 * FR-050 / EC-023 — controlled `web-fetch` seam.
 *
 * The real defect: the base builtin `web-fetch` fetched any URL from the
 * extension service worker, so an un-host-permitted origin was always
 * CORS-blocked (and the error only reached the LLM context). These tests pin the
 * pre-flight contract: an unauthorized target must produce a readable refusal and
 * **zero fetch calls**.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWebFetchToolEntry,
  resolveWebFetchTarget,
  untrustedOriginGuidance,
  WEB_FETCH_TOOL_NAME,
} from '../src/tools/web-fetch-tool.js';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import type { ToolResult } from '@lgdl/web-cli-base';

function memoryKv(): PluginKv {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key: string) {
      map.delete(key);
    },
  };
}

/** Injected fetch that records every requested URL (asserted to stay empty on refusal). */
function countingFetch(body = 'REMOTE BODY') {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    calls.push(typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url);
    return new Response(body, { status: 200, headers: { 'content-type': 'text/plain' } });
  }) as typeof fetch;
  return { calls, impl };
}

function makeHost(webFetch?: Parameters<typeof createWebCliHost>[0]['webFetch']) {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  return createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async (): Promise<ToolResult> => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    ...(webFetch ? { webFetch } : {}),
  });
}

const call = (path: string) => ({ id: 'wf', name: WEB_FETCH_TOOL_NAME, subcommand: '', args: { path }, rawArguments: '{}' });

// ── pure resolution ──────────────────────────────────────────────────────────

test('FR-050: a relative path resolves against the bound site origin', () => {
  const r = resolveWebFetchTarget('guide.md', 'https://site.test');
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.url, 'https://site.test/guide.md');
    assert.equal(r.origin, 'https://site.test');
    assert.equal(r.sameOrigin, true);
  }
});

test('FR-050: an absolute http(s) URL keeps its own origin (not same-origin)', () => {
  const r = resolveWebFetchTarget('https://other.test/a?b=1', 'https://site.test');
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.origin, 'https://other.test');
    assert.equal(r.sameOrigin, false);
  }
});

test('FR-050: a relative path without a bound origin is refused readably (zero resolution)', () => {
  const r = resolveWebFetchTarget('guide.md', undefined);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.output, /没有已绑定站点/);
    assert.match(r.output, /可执行指引/);
  }
});

test('FR-050: non-http(s) schemes are refused readably', () => {
  for (const scheme of ['file:///etc/passwd', 'data:text/plain,hi', 'javascript:alert(1)', 'chrome://extensions']) {
    const r = resolveWebFetchTarget(scheme, 'https://site.test');
    assert.equal(r.ok, false, `${scheme} must be refused`);
    if (!r.ok) assert.equal(r.error, 'web-fetch-scheme-rejected');
  }
});

test('FR-050: the untrusted-origin guidance includes the reason and both actionable paths', () => {
  const text = untrustedOriginGuidance('https://www.baidu.com', 'https://www.baidu.com/');
  assert.match(text, /该域名未授权给本插件/);
  assert.match(text, /CORS/);
  assert.match(text, /授权当前站点/);
  assert.match(text, /tabs open/);
  assert.match(text, /未发出任何网络请求/);
});

// ── executor / host integration ──────────────────────────────────────────────

test('FR-050/EC-023: unauthorized absolute URL → readable refusal + ZERO fetch calls', async () => {
  const { calls, impl } = countingFetch();
  let permChecks = 0;
  const host = makeHost({
    currentOrigin: () => 'https://bound.test',
    hasHostPermission: async () => {
      permChecks += 1;
      return false;
    },
    fetchImpl: impl,
  });
  const res = await host.dispatch(call('https://www.baidu.com/'));
  assert.equal(res.ok, false);
  assert.match(res.output, /未授权/);
  assert.match(res.output, /授权当前站点/);
  assert.match(res.output, /tabs open/);
  assert.equal(permChecks, 1, 'the permission gate must be consulted exactly once');
  assert.deepEqual(calls, [], 'the injected fetch must NOT be called for an unauthorized origin');
});

test('FR-050: unauthorized relative path → readable refusal + ZERO fetch calls', async () => {
  const { calls, impl } = countingFetch();
  const host = makeHost({
    currentOrigin: () => 'https://unauthed.test',
    hasHostPermission: async () => false,
    fetchImpl: impl,
  });
  const res = await host.dispatch(call('guide.md'));
  assert.equal(res.ok, false);
  assert.match(res.output, /未授权/);
  assert.deepEqual(calls, []);
});

test('FR-050: an authorized origin fetches normally (same URL, one call)', async () => {
  const { calls, impl } = countingFetch('REMOTE BODY');
  const host = makeHost({
    currentOrigin: () => 'https://allowed.test',
    hasHostPermission: async (origin) => origin === 'https://allowed.test',
    fetchImpl: impl,
  });
  const res = await host.dispatch(call('https://allowed.test/doc.md'));
  assert.equal(res.ok, true);
  assert.match(res.output, /REMOTE BODY/);
  assert.deepEqual(calls, ['https://allowed.test/doc.md']);
});

test('FR-050: an authorized relative path fetches the resolved absolute URL', async () => {
  const { calls, impl } = countingFetch('GUIDE BODY');
  const host = makeHost({
    currentOrigin: () => 'https://allowed.test',
    hasHostPermission: async (origin) => origin === 'https://allowed.test',
    fetchImpl: impl,
  });
  const res = await host.dispatch(call('guide.md'));
  assert.equal(res.ok, true);
  assert.match(res.output, /GUIDE BODY/);
  assert.deepEqual(calls, ['https://allowed.test/guide.md']);
});

test('FR-050: non-http(s) scheme → refusal with NO permission check and NO fetch', async () => {
  const { calls, impl } = countingFetch();
  let permChecks = 0;
  const host = makeHost({
    currentOrigin: () => 'https://bound.test',
    hasHostPermission: async () => {
      permChecks += 1;
      return true;
    },
    fetchImpl: impl,
  });
  const res = await host.dispatch(call('file:///etc/passwd'));
  assert.equal(res.ok, false);
  assert.match(res.output, /拒绝/);
  assert.equal(permChecks, 0, 'scheme refusal must not even query permissions');
  assert.deepEqual(calls, []);
});

test('FR-050 (C): same-origin read prefers the page context (host fetch untouched)', async () => {
  const { calls, impl } = countingFetch('HOST BODY');
  const pageCalls: string[] = [];
  const host = makeHost({
    currentOrigin: () => 'https://bound.test',
    hasHostPermission: async () => true,
    fetchImpl: impl,
    fetchViaPage: async (url) => {
      pageCalls.push(url);
      return { ok: true, text: 'PAGE BODY' };
    },
  });
  const res = await host.dispatch(call('guide.md'));
  assert.equal(res.ok, true);
  assert.match(res.output, /PAGE BODY/);
  assert.deepEqual(pageCalls, ['https://bound.test/guide.md']);
  assert.deepEqual(calls, [], 'the page-context path must not fall through to the host fetch');
});

test('FR-050 (C): page-context transport failure falls back to the (permitted) host fetch', async () => {
  const { calls, impl } = countingFetch('HOST BODY');
  const host = makeHost({
    currentOrigin: () => 'https://bound.test',
    hasHostPermission: async () => true,
    fetchImpl: impl,
    fetchViaPage: async () => ({ ok: false, error: '没有绑定标签页' }),
  });
  const res = await host.dispatch(call('guide.md'));
  assert.equal(res.ok, true);
  assert.match(res.output, /HOST BODY/);
  assert.deepEqual(calls, ['https://bound.test/guide.md']);
});

test('FR-050: the controlled entry REPLACES the base builtin exactly once', () => {
  const host = makeHost({
    currentOrigin: () => 'https://bound.test',
    hasHostPermission: async () => true,
  });
  const names = host.router.names().filter((n) => n === WEB_FETCH_TOOL_NAME);
  assert.deepEqual(names, [WEB_FETCH_TOOL_NAME]);
  assert.equal(host.deriveTools().filter((t) => t.name === WEB_FETCH_TOOL_NAME).length, 1);
  assert.match(host.router.helpFor(WEB_FETCH_TOOL_NAME) ?? '', /web-fetch/);
});

test('FR-050: hosts without the webFetch seam keep the base builtin (zero regression)', () => {
  const host = makeHost();
  assert.equal(host.deriveTools().some((t) => t.name === WEB_FETCH_TOOL_NAME), true);
});

test('FR-050: the executor is directly constructible and refuses before fetching', async () => {
  const { calls, impl } = countingFetch();
  const entry = createWebFetchToolEntry({
    currentOrigin: () => undefined,
    hasHostPermission: async () => true,
    fetchImpl: impl,
  });
  const res = await entry.executor({ subcommand: '', args: { path: 'guide.md' } }, {});
  assert.equal(res.ok, false);
  assert.deepEqual(calls, []);
});
