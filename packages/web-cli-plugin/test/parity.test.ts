/**
 * Tool-surface parity gate (FR-051 / TASK-029) — the MECHANISM FIX.
 *
 * ROOT CAUSE this closes: the plugin's tool surface had silently drifted from
 * the original built-in assistant (`dom`, `chrome` screenshot/print/reload/back/
 * forward …全部丢失), yet every existing test passed — because tests only
 * asserted *internal* behaviour and `docs/capability-matrix.md` was a
 * HAND-WRITTEN table with no executable consumer.
 *
 * This test is the executable consumer. It machine-compares the plugin's real
 * `deriveTools()` surface against `test/parity/baseline-catalog.json` (itself
 * machine-extracted from the `main` registration matrix) and requires every
 * baseline tool to be EITHER:
 *   1. provided under the same name (subcommand-by-subcommand), or
 *   2. explicitly waived in `test/parity/waivers.json` (reason + basis).
 *
 * The gate is BIDIRECTIONAL: a plugin tool that is neither a baseline name nor a
 * registered `pluginExtras` entry also fails, so a new LLM-facing tool can never
 * appear unregistered.
 *
 * A failure prints the missing/extra entries and the exact fix (implement, or
 * register a waiver) — never a bare assertion.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { PlatformEnv, PlatformEventHub } from '@lgdl/web-cli-base';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createRemoteDomOps } from '../src/content/dom-agent.js';
import { createRemoteEventHub } from '../src/tools/remote-events.js';

interface CatalogTool {
  name: string;
  subcommands: string[];
  risk: string | null;
  group: string;
  enabled: boolean;
  source: string | null;
}
interface BaselineCatalog {
  provenance: { commit: string; extractedAt: string; sessionMatrix: string };
  toolCount: number;
  tools: CatalogTool[];
}
interface WaiverEntry {
  status: 'mapped' | 'not-applicable' | 'delegated' | 'pending-permission' | 'baseline-disabled';
  reason: string;
  basis: string;
  providedAs?: string;
  permission?: string;
  pending?: boolean;
}
interface Waivers {
  waivers: Record<string, WaiverEntry>;
  pluginExtras: Record<string, { reason: string; basis: string }>;
}

const readJson = <T>(rel: string): T => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8')) as T;

const baseline = readJson<BaselineCatalog>('../../test/parity/baseline-catalog.json');
const waivers = readJson<Waivers>('../../test/parity/waivers.json');

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

/**
 * Build the *full* extension surface: the same seams the real service worker
 * passes (tabs + controlled web-fetch + browserTools). The remote DOM ops proxy
 * behaves like the real content-script transport (every optional op resolves to
 * a function), so optional families (wait/extract/export) register exactly as in
 * the shipped extension.
 */
function buildFullHost() {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const ops = createRemoteDomOps({ request: async () => ({ ok: true, output: '' }) });
  const env = {
    kind: 'browser',
    fetch: globalThis.fetch,
    dom: { state: { snapshot: async () => ({ unavailable: true }) }, ops },
    filePicker: { save: async () => ({ ok: true }), download: async () => {} },
    events: createRemoteEventHub({ request: async () => ({ ok: false, error: 'test transport' }) }) as PlatformEventHub,
  } as unknown as PlatformEnv;

  return createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    tabs: {
      listTabs: async () => [],
      switchToTab: async () => ({ ok: true, output: '' }),
      openTab: async () => ({ ok: true, output: '' }),
      isAuthorized: () => false,
      sessionIdForOrigin: (origin) => origin,
      audit,
    },
    tabsEnabled: true,
    webFetch: {
      currentOrigin: () => undefined,
      hasHostPermission: async () => false,
      fetchImpl: globalThis.fetch,
    },
    browserTools: { env },
  });
}

interface Surface {
  host: ReturnType<typeof buildFullHost>;
  subcommands: Map<string, string[]>;
  names: string[];
}

function pluginSurface(): Surface {
  const host = buildFullHost();
  const names = host.deriveTools().map((t) => t.name);
  const subcommands = new Map<string, string[]>();
  for (const name of names) {
    const entry = host.router.query({ name })[0];
    const params = entry?.schema?.parameters as
      | { properties?: { subcommand?: { enum?: string[] } } }
      | undefined;
    const sub = params?.properties?.subcommand;
    subcommands.set(name, Array.isArray(sub?.enum) ? sub.enum : []);
  }
  return { host, subcommands, names };
}

test('parity: baseline catalog has provenance and a machine-extracted tool list', () => {
  assert.match(baseline.provenance.commit, /^[0-9a-f]{40}$/, 'baseline commit must be a full main SHA');
  assert.equal(baseline.tools.length, baseline.toolCount, 'toolCount must match tools.length');
  assert.ok(baseline.tools.length >= 30, 'baseline catalog looks truncated');
  for (const t of baseline.tools) {
    assert.equal(typeof t.name, 'string');
    assert.ok(Array.isArray(t.subcommands));
  }
});

interface CoverageGaps {
  missing: string[];
  missingSubs: string[];
  unregistered: string[];
}

/** Pure coverage check so the gate itself can be self-tested (see below). */
function findCoverageGaps(
  baselineTools: CatalogTool[],
  names: string[],
  subcommands: Map<string, string[]>,
  w: Waivers,
): CoverageGaps {
  const missing: string[] = [];
  const missingSubs: string[] = [];
  const nameSet = new Set(names);
  for (const tool of baselineTools) {
    if (w.waivers[tool.name]) continue;
    if (!nameSet.has(tool.name)) {
      missing.push(tool.name);
      continue;
    }
    const provided = subcommands.get(tool.name) ?? [];
    for (const sub of tool.subcommands) {
      if (!provided.includes(sub)) missingSubs.push(`${tool.name} ${sub}`);
    }
  }
  const baselineNames = new Set(baselineTools.map((t) => t.name));
  const extras = new Set(Object.keys(w.pluginExtras));
  const unregistered = names.filter((n) => !baselineNames.has(n) && !extras.has(n));
  return { missing, missingSubs, unregistered };
}

test('parity SELF-TEST: the gate actually catches a dropped dom/chrome tool (anti-regression)', () => {
  // Simulate the 2026-09 defect: the plugin surface without dom/chrome.
  const names = ['web-fetch', 'sleep', 'web-cli-help', 'ask-user', 'tabs'].filter((n) => n !== 'dom' && n !== 'chrome');
  const subs = new Map<string, string[]>();
  const gaps = findCoverageGaps(baseline.tools, names, subs, waivers);
  assert.ok(gaps.missing.includes('dom'), 'gate must flag a missing dom tool');
  assert.ok(gaps.missing.includes('chrome'), 'gate must flag a missing chrome tool');

  // Simulate an unregistered new LLM-facing tool.
  const gaps2 = findCoverageGaps(baseline.tools, [...names, 'brand-new-tool'], subs, waivers);
  assert.ok(gaps2.unregistered.includes('brand-new-tool'), 'gate must flag an unregistered new tool');
});

test('parity: every waiver carries a reason + basis, and pending-permission names the permission', () => {
  for (const [name, waiver] of Object.entries(waivers.waivers)) {
    assert.ok(waiver.reason && waiver.reason.length > 0, `waiver for ${name} needs a reason`);
    assert.ok(waiver.basis && waiver.basis.length > 0, `waiver for ${name} needs a basis`);
    if (waiver.status === 'pending-permission') {
      assert.ok(waiver.permission, `pending-permission waiver for ${name} must name the permission`);
      assert.equal(waiver.pending, true, `pending-permission waiver for ${name} must set pending:true`);
    }
  }
  for (const [name, extra] of Object.entries(waivers.pluginExtras)) {
    assert.ok(extra.reason && extra.reason.length > 0, `pluginExtra ${name} needs a reason`);
    assert.ok(extra.basis && extra.basis.length > 0, `pluginExtra ${name} needs a basis`);
  }
});

test('parity: every baseline tool is provided or explicitly waived (no silent drift)', () => {
  const { subcommands, names } = pluginSurface();
  const gaps = findCoverageGaps(baseline.tools, names, subcommands, waivers);

  if (gaps.missing.length || gaps.missingSubs.length) {
    const lines = ['工具面对账失败（基线有 / 插件无）—— 修复路径：实现该工具，或在 test/parity/waivers.json 登记豁免（理由+依据）'];
    if (gaps.missing.length) lines.push(`  缺失工具：${gaps.missing.join(', ')}`);
    if (gaps.missingSubs.length) lines.push(`  缺失子命令：${gaps.missingSubs.join(', ')}`);
    assert.fail(lines.join('\n'));
  }
  assert.equal(names.length > 0, true);
});

test('parity: no unregistered LLM-facing tool (bidirectional gate)', () => {
  const { names } = pluginSurface();
  const baselineNames = new Set(baseline.tools.map((t) => t.name));
  const extras = new Set(Object.keys(waivers.pluginExtras));
  const unregistered: string[] = [];
  for (const name of names) {
    if (baselineNames.has(name)) continue;
    if (extras.has(name)) continue;
    unregistered.push(name);
  }
  if (unregistered.length) {
    assert.fail(
      `插件新增了未登记的面向 LLM 的工具：${unregistered.join(', ')}\n` +
        '  修复路径：在 test/parity/waivers.json 的 pluginExtras 中登记（理由+依据）。',
    );
  }
  // No stale pluginExtra either.
  for (const extra of extras) {
    assert.ok(names.includes(extra), `pluginExtras 登记了不存在的工具 "${extra}" —— 请删除该过期条目`);
  }
});

test('parity: no stale waiver for a tool that no longer exists in the baseline', () => {
  const baselineNames = new Set(baseline.tools.map((t) => t.name));
  for (const name of Object.keys(waivers.waivers)) {
    assert.ok(baselineNames.has(name), `waiver "${name}" 不在基线目录中 —— 基线已变更，请复核并删除`);
  }
});

test('parity: tool names are flat and LLM-legal (no dot / namespace separator)', () => {
  const { names } = pluginSurface();
  for (const name of names) {
    assert.match(name, /^[a-zA-Z0-9_-]+$/, `tool "${name}" is not a legal flat function name`);
  }
});

test('parity REGRESSION: the two author-named missing families are present with their full subcommand sets', () => {
  const { names, subcommands } = pluginSurface();
  // `dom` — the 30-subcommand page DOM tool face.
  assert.ok(names.includes('dom'), 'dom tool is missing');
  const dom = subcommands.get('dom') ?? [];
  for (const sub of ['read-state', 'snapshot', 'click', 'interactives', 'read-element', 'find', 'structure', 'type', 'fill', 'set-value']) {
    assert.ok(dom.includes(sub), `dom is missing subcommand "${sub}"`);
  }
  assert.ok(dom.length >= 30, `dom must expose the full 30-subcommand face (got ${dom.length})`);
  // `chrome` — browser shell incl. the author-named “浏览器截图”.
  assert.ok(names.includes('chrome'), 'chrome tool is missing (browser screenshot/print/reload/back/forward)');
  const chrome = subcommands.get('chrome') ?? [];
  for (const sub of ['screenshot', 'print', 'reload', 'back', 'forward']) {
    assert.ok(chrome.includes(sub), `chrome is missing subcommand "${sub}"`);
  }
  // Other directly-provided families.
  for (const name of ['events', 'extract', 'export', 'save', 'wait', 'web-search']) {
    assert.ok(names.includes(name), `${name} tool is missing`);
  }
});
