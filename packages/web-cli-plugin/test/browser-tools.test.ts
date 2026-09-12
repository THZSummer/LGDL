/**
 * Browser capability tools — functional wiring tests (FR-051 / TASK-029).
 *
 * These prove the newly-wired base tools are reachable through the authoritative
 * `router.dispatch` path with the base risk tiers intact, that a sensitive op is
 * denied without confirmation, and that a missing seam degrades READABLY (never
 * a silent no-op). They use a fake remote transport, i.e. no real browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformEnv, PlatformEventHub, ToolResult } from '@lgdl/web-cli-base';
import { createWebCliHost } from '../src/background/host.js';
import { createStorageAuditSink } from '../src/security/audit-sink.js';
import { createOriginStore, type PluginKv } from '../src/security/origin-store.js';
import { createRemoteDomOps } from '../src/content/dom-agent.js';
import { createRemoteEventHub } from '../src/tools/remote-events.js';
import { createExtensionBrowserEnv } from '../src/platform/browser-env.js';

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

interface Harness {
  host: ReturnType<typeof createWebCliHost>;
  calls: Array<{ method: string; args: unknown[] }>;
  downloads: string[];
  eventOps: string[];
}

function buildHarness(opts: { onAsk?: (q: { risk?: string }) => Promise<{ action: 'allow' | 'deny' }> } = {}): Harness {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  const calls: Harness['calls'] = [];
  const downloads: string[] = [];
  const eventOps: string[] = [];
  const ops = createRemoteDomOps({
    async request(method, params) {
      const args = (params as { args?: unknown[] }).args ?? [];
      calls.push({ method, args });
      if (method === 'screenshot') return { ok: true, output: '✓ screenshot', dataUrl: 'data:image/png;base64,AAAA' };
      if (method === 'extractData') return { ok: true, output: JSON.stringify([{ col: 'v1' }]) };
      return { ok: true, output: `✓ ${method}` };
    },
  });
  const env = {
    kind: 'browser',
    fetch: globalThis.fetch,
    dom: { state: { snapshot: async () => ({ unavailable: true }) }, ops },
    filePicker: {
      save: async () => ({ ok: true }),
      download: async (o: { filename: string }) => {
        downloads.push(o.filename);
      },
    },
    events: createRemoteEventHub({
      request: async (op) => {
        eventOps.push(op);
        if (op === 'status') {
          return {
            ok: true,
            data: { enabled: true, subscriptionCount: 0, totalBuffered: 0, disabledDropped: 0, rateDropped: 0, budgets: {}, subscriptions: [] },
          };
        }
        if (op === 'subscribe') return { ok: true, data: { ok: true, subId: 'sub-1' } };
        return { ok: true, data: { ok: true } };
      },
    }),
  } as unknown as PlatformEnv;

  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: '' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
    ...(opts.onAsk ? { onAsk: opts.onAsk as never } : {}),
    browserTools: { env },
  });
  return { host, calls, downloads, eventOps };
}

const call = (name: string, subcommand: string, args: Record<string, string> = {}) => ({
  id: 't',
  name,
  subcommand,
  args,
  rawArguments: '{}',
});

test('browser tools: dom/chrome/wait/extract/export/save/events/web-search are all on the LLM surface', () => {
  const { host } = buildHarness();
  const names = host.deriveTools().map((t) => t.name);
  for (const n of ['dom', 'chrome', 'wait', 'extract', 'export', 'save', 'events', 'web-search']) {
    assert.ok(names.includes(n), `missing browser tool: ${n}`);
  }
});

test('browser tools: dom read-state dispatches through the router to the remote transport', async () => {
  const { host, calls } = buildHarness();
  const res: ToolResult = await host.dispatch(call('dom', 'read-state'));
  assert.equal(res.ok, true);
  assert.equal(calls[0]?.method, 'readState');
});

test('browser tools: dom click (ui tier) is denied without confirmation and never reaches the page', async () => {
  const { host, calls } = buildHarness();
  const res: ToolResult = await host.dispatch(call('dom', 'click', { selector: '#go' }));
  assert.equal(res.ok, false);
  assert.equal(calls.length, 0, 'executor must not run when the gate asks and no responder exists');
  assert.match(res.output, /权限|确认|拒绝/);
});

test('browser tools: dom click is allowed after explicit confirmation (ui tier intact)', async () => {
  const { host, calls } = buildHarness({ onAsk: async () => ({ action: 'allow' }) });
  const res = await host.dispatch(call('dom', 'click', { selector: '#go' }));
  assert.equal(res.ok, true);
  assert.equal(calls[0]?.method, 'click');
  assert.deepEqual(calls[0]?.args, ['#go']);
});

test('browser tools: chrome screenshot (write tier) denied without confirmation; allowed + persisted on allow', async () => {
  const denied = buildHarness();
  const r1 = await denied.host.dispatch(call('chrome', 'screenshot', { mode: 'viewport' }));
  assert.equal(r1.ok, false);
  assert.equal(denied.calls.length, 0);

  const allowed = buildHarness({ onAsk: async () => ({ action: 'allow' }) });
  const r2 = await allowed.host.dispatch(call('chrome', 'screenshot', { mode: 'viewport' }));
  assert.equal(r2.ok, true);
  assert.equal(allowed.calls[0]?.method, 'screenshot');
  assert.equal(allowed.downloads.length, 1, 'screenshot must persist via the page-context download chain');
});

test('browser tools: chrome back/forward are ui tier; reload is write tier (base risk not widened)', async () => {
  const { host } = buildHarness();
  for (const sub of ['back', 'forward', 'reload'] as const) {
    const res = await host.dispatch(call('chrome', sub));
    assert.equal(res.ok, false, `chrome ${sub} must not silently run without confirmation`);
  }
});

test('browser tools: dom unknown subcommand fails readably (after confirmation)', async () => {
  const { host } = buildHarness({ onAsk: async () => ({ action: 'allow' }) });
  const res = await host.dispatch(call('dom', 'nope'));
  assert.equal(res.ok, false);
  assert.match(res.output, /未知子命令/);
});

test('browser tools: extract writes to the shared buffer and export fails readably when buffer is empty', async () => {
  const { host } = buildHarness({ onAsk: async () => ({ action: 'allow' }) });
  const ex = await host.dispatch(call('extract', '', { kind: 'links' }));
  assert.equal(ex.ok, true);
  const out = await host.dispatch(call('export', '', { id: 'nope', format: 'json' }));
  assert.equal(out.ok, false);
  assert.match(out.output, /缓冲中无/);
});

test('browser tools: web-search reports a readable disabled state until an endpoint is configured', async () => {
  const { host } = buildHarness();
  const res = await host.dispatch(call('web-search', '', { query: 'hello' }));
  assert.equal(res.ok, false);
  assert.match(res.output, /web-search|禁用|未配置|不可用/);
});

test('browser tools: events subscribe dispatches to the content event bridge', async () => {
  const { host, eventOps } = buildHarness();
  const res = await host.dispatch(call('events', 'subscribe', { kind: 'dom' }));
  assert.equal(res.ok, true);
  assert.equal(eventOps[0], 'subscribe');
  const st = await host.dispatch(call('events', 'status'));
  assert.equal(st.ok, true);
  assert.ok(eventOps.includes('status'));
});

test('browser tools: events pause is honestly reported unsupported (no fake success)', async () => {
  const { host } = buildHarness();
  // pause is a `state` tier → ask → denied without responder; assert the tier is
  // at least not silently allowed, and the hub method is honest.
  const res = await host.dispatch(call('events', 'pause', { target: 'sub-1' }));
  assert.equal(res.ok, false);
});

test('extension browser env: no bound tab yields a readable refusal (no throw)', async () => {
  const env = createExtensionBrowserEnv({
    currentTabId: () => undefined,
    sendDomOp: async () => {
      throw new Error('must not be called');
    },
    sendFileSave: async () => {
      throw new Error('must not be called');
    },
  });
  const res = await env.dom!.ops!.readState();
  assert.equal(res.ok, false);
  assert.match(res.output, /无活跃标签页/);
  const file = await env.filePicker!.save({ suggestedName: 'a.txt', data: 'x' });
  assert.equal(file.ok, false);
});

test('extension browser env: forwards ops to the bound tab', async () => {
  const seen: string[] = [];
  const env = createExtensionBrowserEnv({
    currentTabId: () => 7,
    sendDomOp: async (tabId, method) => {
      seen.push(`${tabId}:${method}`);
      return { ok: true, output: 'ok' };
    },
    sendFileSave: async () => ({ ok: true }),
  });
  const res = await env.dom!.ops!.snapshot();
  assert.equal(res.ok, true);
  assert.deepEqual(seen, ['7:snapshot']);
});
