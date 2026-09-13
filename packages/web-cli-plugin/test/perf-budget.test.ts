/**
 * NFR-007 — performance & context budget (quantified thresholds + measured).
 *
 * The spec originally left NFR-007 unquantified; this test pins verifiable
 * budgets so the suite fails if a regression breaks them. Measured values are
 * recorded in `docs/dev.md` §8 and `build.md §11` (D-028).
 *
 * Thresholds:
 *  - content script bundle (IIFE, on-demand injected): see the two SEPARATE
 *    numbers below — the NFR-007 **target budget** (64 KiB, currently NOT met,
 *    open deviation D31) and the **regression baseline** (the measured size,
 *    used to fail on new growth). The guard logic + snapshot live in
 *    `./perf-baseline.ts`.
 *  - event context summary ≤ 10 events per pull, with an explicit truncation note.
 *  - session history ≤ 40 turns (bounded `chrome.storage.session` snapshot).
 *  - audit ring buffer ≤ 500 events.
 *  - risk guard default 60 calls / 6 per second per origin.
 *  - 50 sequential authorized read dispatches (below the 60-token bucket) < 250 ms.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
import {
  CONTENT_BUNDLE_BASELINE_BYTES,
  CONTENT_BUNDLE_BASELINE_META,
  CONTENT_BUNDLE_BASELINE_TOLERANCE,
  CONTENT_BUNDLE_TARGET_BYTES,
  evaluateContentBundleSize,
  readArtifactSize,
} from './perf-baseline.js';

/** NFR-007 goal for the injected bundle (kept as an alias for continuity). */
export const CONTENT_BUNDLE_BUDGET_BYTES = CONTENT_BUNDLE_TARGET_BYTES;
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
  const call = { id: 'p', name: 'site_notes-list', subcommand: '', args: {}, rawArguments: '{}' };
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

test('NFR-007: built content bundle stays within the regression baseline (when built)', (t) => {
  // Building is not part of `npm test`; measure the artifact only when it is
  // present (CI after `npm run build`). `readArtifactSize` tolerates ONLY
  // `ENOENT` and rethrows every other failure — see the guard test below for why
  // a bare `catch` here was a false-green gate (validate R4 §R4-11).
  const size = readArtifactSize(new URL('../../dist/content.js', import.meta.url));
  if (size === undefined) {
    // dist absent (unit-test-only run): explicit, visible skip — not a silent pass.
    t.skip('dist/content.js not present — build first to measure the bundle budget');
    return;
  }

  const verdict = evaluateContentBundleSize(size);
  // 1) Regression guard: fail on new growth beyond the recorded baseline.
  assert.equal(verdict.ok, true, verdict.message);

  // 2) NFR-007 target must NOT be silently redefined to the measured size. The
  //    target is pinned to 64 KiB and the snapshot records it as NOT met (D31);
  //    this consistency assertion forces docs/baseline updates either way.
  assert.equal(
    CONTENT_BUNDLE_TARGET_BYTES,
    64 * 1024,
    'NFR-007 目标预算恒为 64 KiB，不得改写成实测值来「宣布达成」',
  );
  assert.equal(
    CONTENT_BUNDLE_BASELINE_META.targetBudgetBytes,
    CONTENT_BUNDLE_TARGET_BYTES,
    '基线快照记录的目标预算必须与 CONTENT_BUNDLE_TARGET_BYTES 一致',
  );
  assert.equal(
    CONTENT_BUNDLE_BASELINE_META.targetMet,
    size <= CONTENT_BUNDLE_TARGET_BYTES,
    `NFR-007 目标登记与实测不一致：基线快照 targetMet=${CONTENT_BUNDLE_BASELINE_META.targetMet}，实测 ${size}B ` +
      `${size <= CONTENT_BUNDLE_TARGET_BYTES ? '≤' : '>'} 目标 ${CONTENT_BUNDLE_TARGET_BYTES}B。` +
      '请同步 test/perf-baseline.ts 元数据 + build.md §11.5 + docs/dev.md §8 + state.json（不得为宣布达成而改写目标）。',
  );
});

test('NFR-007 guard self-check: an over-baseline bundle FAILS the guard (proves it is not a false-green)', () => {
  const ceiling = Math.floor(CONTENT_BUNDLE_BASELINE_BYTES * (1 + CONTENT_BUNDLE_BASELINE_TOLERANCE));

  // Exactly at the regression ceiling → still within tolerance → PASS.
  const atCeiling = evaluateContentBundleSize(ceiling);
  assert.equal(atCeiling.ok, true, atCeiling.message);

  // One byte over the ceiling → must FAIL (a 1.07 MB bundle vs a 64 KiB budget
  // must never report green).
  const overCeiling = evaluateContentBundleSize(ceiling + 1);
  assert.equal(overCeiling.ok, false, '守卫必须在超出基线容差时 FAIL');
  assert.match(overCeiling.message, /体积回归/);
  assert.match(overCeiling.message, new RegExp(`实测 ${ceiling + 1}B`));
  assert.match(overCeiling.message, /超出 1B/);
  assert.match(overCeiling.message, new RegExp(`${CONTENT_BUNDLE_BASELINE_BYTES}B`));

  // Run the actual assertion path: feeding the over-budget value as "measured"
  // MUST throw. The old implementation's bare `catch` swallowed exactly this.
  assert.throws(
    () => assert.equal(overCeiling.ok, true, overCeiling.message),
    /体积回归/,
    '反证：超出基线的实测必须让断言抛错（旧 bare catch 会吞掉该错 → 恒绿）',
  );
});

test('NFR-007 guard: only ENOENT is swallowed; other stat failures propagate', () => {
  const url = new URL('../../dist/content.js', import.meta.url);
  const enoent = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
  assert.equal(
    readArtifactSize(url, () => {
      throw enoent;
    }),
    undefined,
    '文件不存在（未构建）是合理情形，按既有语义跳过',
  );

  const eacces = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
  assert.throws(
    () => readArtifactSize(url, () => {
      throw eacces;
    }),
    /permission denied/,
    '非 ENOENT 的 stat 失败不得被吞掉（旧 bare catch 会把它当作「未构建」）',
  );

  // A plain error without an errno code must also propagate.
  assert.throws(
    () => readArtifactSize(url, () => {
      throw new Error('boom');
    }),
    /boom/,
  );
});
