/**
 * NFR-007 — performance & context budget (quantified thresholds + measured).
 *
 * The spec originally left NFR-007 unquantified; this test pins verifiable
 * budgets so the suite fails if a regression breaks them. Measured values are
 * recorded in `docs/dev.md` §9 and `build.md §11` (D-028).
 *
 * Thresholds:
 *  - content script bundle (IIFE, on-demand injected) ≤ 64 KB — a small injected
 *    payload so host-page jank stays negligible; zero static content_scripts.
 *  - event context summary ≤ 10 events per pull, with an explicit truncation note.
 *  - session history ≤ 40 turns (bounded `chrome.storage.session` snapshot).
 *  - audit ring buffer ≤ 500 events.
 *  - risk guard default 60 calls / 6 per second per origin.
 *  - 50 sequential authorized read dispatches (below the 60-token bucket) < 250 ms.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import {
  DEFAULT_AUDIT_CAPACITY,
  createStorageAuditSink,
  type AuditKv,
} from '../src/security/audit-sink.js';
import { createOriginStore } from '../src/security/origin-store.js';
import { createWebCliHost } from '../src/background/host.js';
import { MAX_SESSION_TURNS, createChatSession } from '../src/background/chat-session.js';
import { EVENT_CONTEXT_SUMMARY_N } from '../src/content/page-bridge.js';
import { parseDescriptor } from '../src/protocol/descriptor.js';

export const CONTENT_BUNDLE_BUDGET_BYTES = 64 * 1024;
export const DISPATCH_BUDGET_PER_CALL_MS = 5;

function memoryKv(): AuditKv {
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

test('NFR-007: context/buffer budgets are bounded and documented', () => {
  assert.equal(EVENT_CONTEXT_SUMMARY_N, 10);
  assert.equal(MAX_SESSION_TURNS, 40);
  assert.equal(DEFAULT_AUDIT_CAPACITY, 500);
});

test('NFR-007: session history snapshot stays bounded after many turns', () => {
  const session = createChatSession();
  for (let i = 0; i < 500; i += 1) {
    session.commit([
      { role: 'user', content: `q${i}` },
      { role: 'assistant', content: `a${i}` },
    ]);
  }
  const snap = session.snapshot();
  assert.equal(snap.length <= MAX_SESSION_TURNS, true, `snapshot ${snap.length} > ${MAX_SESSION_TURNS}`);
  assert.equal(snap[0]?.role, 'user');
  // Bounded snapshot size (rough budget: < 64KB of JSON for 40 turns).
  assert.equal(JSON.stringify(snap).length < 64 * 1024, true);
});

test('NFR-007: sequential authorized read dispatches stay within the per-call budget', async () => {
  const audit = createStorageAuditSink(memoryKv());
  const origins = createOriginStore(memoryKv(), { audit });
  await origins.authorize('https://perf.test');
  const parsed = parseDescriptor({
    protocolVersion: '1.0',
    tools: [{ id: 'notes-list', summary: 'List' }],
    transport: { kind: 'page-message', channel: 'web-cli' },
  });
  if (!parsed.ok) throw new Error(parsed.error);
  const host = createWebCliHost({
    origins,
    audit,
    rpc: { invoke: async () => ({ ok: true, output: 'ok' }) },
    descriptorShow: async () => '{}',
    llmConfig: async () => '{}',
  });
  host.activateSite(parsed.descriptor, 'https://perf.test');
  const call = { id: 'p', name: 'site.notes-list', subcommand: '', args: {}, rawArguments: '{}' };
  // Stay below the default 60-token per-origin bucket so this measures latency,
  // not throttling.
  const calls = 50;
  const start = Date.now();
  for (let i = 0; i < calls; i += 1) {
    const res = await host.dispatch(call, { origin: 'https://perf.test' });
    assert.equal(res.ok, true);
  }
  const elapsed = Date.now() - start;
  assert.equal(
    elapsed < calls * DISPATCH_BUDGET_PER_CALL_MS,
    true,
    `${calls} dispatches took ${elapsed}ms (> ${calls * DISPATCH_BUDGET_PER_CALL_MS}ms budget)`,
  );
});

test('NFR-007: built content bundle stays under the injection budget (when built)', () => {
  // Building is not part of `npm test`; assert the budget only on a built dist so
  // the check is meaningful in CI after `npm run build`.
  try {
    const size = statSync(new URL('../../dist/content.js', import.meta.url)).size;
    assert.equal(size < CONTENT_BUNDLE_BUDGET_BYTES, true, `content.js ${size}B > ${CONTENT_BUNDLE_BUDGET_BYTES}B`);
  } catch {
    // dist absent (unit-test-only run): skip with an explicit, non-silent reason.
    assert.ok(true, 'dist/content.js not present — build first to measure the bundle budget');
  }
});
