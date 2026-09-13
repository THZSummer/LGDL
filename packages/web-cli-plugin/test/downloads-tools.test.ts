/**
 * FR-054 — `downloads` tool (read-only, optional permission).
 *
 * Proves: read-only risk table; cancel/pause/erase/open are readable refusals
 * (never a silent no-op); privacy projection (basename only, source URL
 * origin+path by default); unauthorized readable「未开启」for every subcommand with
 * zero chrome calls; the privacy toggle gates the surface; and audit carries zero
 * plaintext.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import {
  DOWNLOADS_MAX_ROWS,
  DOWNLOADS_NOT_ENABLED_TEXT,
  DOWNLOADS_SUBCOMMAND_RISKS,
  DOWNLOADS_TOOL_NAME,
  DOWNLOADS_UNSUPPORTED_SUBCOMMANDS,
  basenameOf,
  createDownloadsToolEntry,
  type DownloadRecord,
  type DownloadsToolDeps,
} from '../src/tools/downloads-tools.js';
import type { ToolEntry } from '@lgdl/web-cli-base';

function memoryKv(): PluginKv {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

const RAW: DownloadRecord[] = [
  { id: 1, filename: '/home/user/Downloads/report.pdf', url: 'https://files.test/report.pdf?token=SECRETDL#x', state: 'complete', bytesReceived: 2048, totalBytes: 2048, mime: 'application/pdf' },
  { id: 2, filename: '/home/user/Downloads/archive.zip', url: 'https://files.test/archive.zip', state: 'interrupted', bytesReceived: 100, totalBytes: 9999 },
];

function makeDeps(overrides: Partial<DownloadsToolDeps> = {}) {
  const audit = createStorageAuditSink(memoryKv());
  const calls = { list: 0, search: 0 };
  const deps: DownloadsToolDeps = {
    hasPermission: async () => true,
    readEnabled: () => true,
    listDownloads: async () => {
      calls.list += 1;
      return RAW;
    },
    searchDownloads: async () => {
      calls.search += 1;
      return [RAW[0] as DownloadRecord];
    },
    audit,
    ...overrides,
  };
  return { deps, audit, calls };
}

const call = (subcommand: string, args: Record<string, string> = {}) => ({
  id: 't',
  name: DOWNLOADS_TOOL_NAME,
  subcommand,
  args,
  rawArguments: '{}',
});

async function run(entry: ToolEntry, subcommand: string, args: Record<string, string> = {}) {
  return (await entry.executor!(call(subcommand, args), {} as never)) as { ok: boolean; output: string; error?: string };
}

test('FR-054 downloads: risk table is read-only (list/search)', () => {
  assert.deepEqual(DOWNLOADS_SUBCOMMAND_RISKS, { list: 'read', search: 'read' });
  assert.equal(basenameOf('/a/b/c.txt'), 'c.txt');
  assert.equal(basenameOf('C:\\Users\\u\\file.zip'), 'file.zip');
});

test('FR-054 downloads: cancel/pause/erase/open are readable refusals (not implemented)', async () => {
  const { deps, calls } = makeDeps();
  const entry = createDownloadsToolEntry(deps);
  for (const sub of DOWNLOADS_UNSUPPORTED_SUBCOMMANDS) {
    const res = await run(entry, sub);
    assert.equal(res.ok, false, `${sub} must be refused`);
    assert.match(res.output, /未实现/);
    assert.match(res.output, /只读/);
  }
  assert.deepEqual(calls, { list: 0, search: 0 }, 'no chrome call for unsupported verbs');
});

test('FR-054 downloads list: basename only + source URL redacted by default', async () => {
  const { deps } = makeDeps();
  const entry = createDownloadsToolEntry(deps);
  const res = await run(entry, 'list');
  assert.equal(res.ok, true);
  assert.match(res.output, /report\.pdf/);
  assert.equal(res.output.includes('/home/user/Downloads'), false, 'local directory tree must not leak');
  assert.equal(res.output.includes('SECRETDL'), false, 'query token must not enter context by default');
  const full = await run(entry, 'list', { full: 'true' });
  assert.match(full.output, /SECRETDL/);
});

test('FR-054 downloads list: bounded + truncation disclosed', async () => {
  const many: DownloadRecord[] = Array.from({ length: DOWNLOADS_MAX_ROWS + 5 }, (_, i) => ({ id: i + 1, filename: `/d/f${i}.bin`, url: 'https://d.test/f', state: 'complete' }));
  const { deps } = makeDeps({ listDownloads: async () => many });
  const entry = createDownloadsToolEntry(deps);
  const res = await run(entry, 'list');
  assert.equal(res.ok, true);
  assert.match(res.output, /已截断/);
  assert.match(res.output, new RegExp(`共 ${DOWNLOADS_MAX_ROWS + 5} 条`));
});

test('FR-054 downloads search requires --query', async () => {
  const { deps, calls } = makeDeps();
  const entry = createDownloadsToolEntry(deps);
  const missing = await run(entry, 'search');
  assert.equal(missing.ok, false);
  assert.match(missing.output, /需要 --query/);
  assert.equal(calls.search, 0);
  const ok = await run(entry, 'search', { query: 'report' });
  assert.equal(ok.ok, true);
  assert.equal(calls.search, 1);
});

test('FR-054 downloads: unknown subcommand is a readable refusal', async () => {
  const { deps } = makeDeps();
  const entry = createDownloadsToolEntry(deps);
  const res = await run(entry, 'wat');
  assert.equal(res.ok, false);
  assert.match(res.output, /未知子命令/);
});

test('FR-054 downloads: unauthorized returns the readable 未开启 notice (zero chrome calls)', async () => {
  const { deps, calls } = makeDeps({ hasPermission: async () => false });
  const entry = createDownloadsToolEntry(deps);
  for (const sub of ['list', 'search']) {
    const res = await run(entry, sub, sub === 'search' ? { query: 'q' } : {});
    assert.equal(res.ok, false);
    assert.match(res.output, /未开启/);
    assert.match(res.output, /⚙ 设置 → 能力与隐私/);
    assert.match(res.output, /开启下载记录访问/);
  }
  assert.deepEqual(calls, { list: 0, search: 0 });
  assert.equal(DOWNLOADS_NOT_ENABLED_TEXT.includes('未开启'), true);
});

test('FR-054 downloads: privacy toggle gates the surface readably', async () => {
  const { deps, calls } = makeDeps({ readEnabled: () => false });
  const entry = createDownloadsToolEntry(deps);
  const res = await run(entry, 'list');
  assert.equal(res.ok, false);
  assert.match(res.output, /已关闭/);
  assert.equal(calls.list, 0);
});

test('FR-054 downloads audit: zero plaintext', async () => {
  const { deps, audit } = makeDeps();
  const entry = createDownloadsToolEntry(deps);
  await run(entry, 'list', { full: 'true' });
  const json = JSON.stringify(audit.events);
  assert.equal(json.includes('SECRETDL'), false);
  assert.equal(audit.events.every((e) => e.type === 'downloads'), true);
});

test('FR-054 host: downloads leaves deriveTools() when its toggle is off; suppression removes it', () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    downloads: {
      hasPermission: async () => true,
      listDownloads: async () => [],
      searchDownloads: async () => [],
      audit,
    },
    downloadsEnabled: true,
  });
  assert.equal(host.deriveTools().some((t) => t.name === DOWNLOADS_TOOL_NAME), true);
  host.setDownloadsEnabled(false);
  assert.equal(host.deriveTools().some((t) => t.name === DOWNLOADS_TOOL_NAME), false);
  host.setDownloadsEnabled(true);
  assert.equal(host.deriveTools().some((t) => t.name === DOWNLOADS_TOOL_NAME), true);
  host.suppressCapability('downloads', true);
  assert.equal(host.deriveTools().some((t) => t.name === DOWNLOADS_TOOL_NAME), false);
});
