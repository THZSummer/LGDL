/**
 * TASK-032: automatic discovery probe + bounded backoff retry (node, mock timers).
 *
 * Pins the behaviour the side panel now relies on: no manual「重新探测」button —
 * the background probes automatically and retries with a bounded schedule,
 * dedupes concurrent probes per origin, stops on success / origin change /
 * panel close / revoke, and classifies temporary vs terminal failures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKOFF_CAP_MS,
  BACKOFF_MS,
  classifyFailure,
  createAutoProbe,
  delayForRetry,
  type AutoProbeStatus,
  type ProbeOutcome,
} from '../src/discovery/auto-probe.js';

type ProbeImpl = (origin: string, tabId: number, attempt: number) => Promise<ProbeOutcome>;

function makeHarness(impl: ProbeImpl) {
  const timers = new Map<number, { fn: () => void; ms: number }>();
  const statuses: AutoProbeStatus[] = [];
  const calls: Array<{ origin: string; tabId: number; attempt: number }> = [];
  let nextId = 1;
  const flush = () => new Promise((r) => setImmediate(r));
  const ap = createAutoProbe({
    probe: async (origin, tabId) => {
      const attempt = calls.length + 1;
      calls.push({ origin, tabId, attempt });
      return impl(origin, tabId, attempt);
    },
    setTimer: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimer: (h) => {
      timers.delete(h as number);
    },
    onStatus: (s) => statuses.push(s),
  });
  /** Fire the oldest scheduled retry; returns its delay (or undefined when none). */
  const fireNext = async (): Promise<number | undefined> => {
    const entry = [...timers.entries()][0];
    if (!entry) return undefined;
    const [id, t] = entry;
    timers.delete(id);
    t.fn();
    await flush();
    return t.ms;
  };
  const pendingDelays = () => [...timers.values()].map((t) => t.ms);
  return { ap, calls, statuses, fireNext, pendingDelays, flush };
}

test('delayForRetry: 500/1s/2s/4s/8s then saturated at 15s', () => {
  assert.deepEqual([...BACKOFF_MS], [500, 1000, 2000, 4000, 8000]);
  assert.equal(BACKOFF_CAP_MS, 15000);
  assert.equal(delayForRetry(1), 500);
  assert.equal(delayForRetry(2), 1000);
  assert.equal(delayForRetry(3), 2000);
  assert.equal(delayForRetry(4), 4000);
  assert.equal(delayForRetry(5), 8000);
  assert.equal(delayForRetry(6), 15000);
  assert.equal(delayForRetry(7), 15000);
  assert.equal(delayForRetry(99), 15000);
});

test('classifyFailure: temporary vs terminal', () => {
  assert.equal(classifyFailure({ state: 'unsupported' }), 'terminal');
  assert.equal(classifyFailure({ state: 'unknown', failureKind: 'no-declaration' }), 'terminal');
  assert.equal(classifyFailure({ state: 'unknown', failureKind: 'invalid-declaration' }), 'terminal');
  assert.equal(classifyFailure({ state: 'unknown', failureKind: 'version-mismatch' }), 'terminal');
  assert.equal(classifyFailure({ state: 'unknown', failureKind: 'transient' }), 'temporary');
  assert.equal(classifyFailure({ state: 'unknown' }), 'temporary');
});

test('temporary failure: bounded backoff 500→1s→2s→4s→8s→15s, then steady 15s', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'transient', reason: '页面未就绪' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();

  assert.equal(h.calls.length, 1, 'first probe fires immediately');
  const delays: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const d = await h.fireNext();
    assert.ok(d !== undefined, `retry ${i + 1} scheduled`);
    delays.push(d!);
  }
  assert.deepEqual(delays, [500, 1000, 2000, 4000, 8000, 15000]);
  assert.ok(h.calls.length >= 6);
  assert.equal(h.ap.status().phase, 'waiting');
  assert.equal(h.ap.status().lastClass, 'temporary');
  assert.equal(h.ap.status().lastReason, '页面未就绪');
  // never a tight loop: the pending retry is always the 15s cap
  assert.deepEqual(h.pendingDelays(), [15000]);
});

test('terminal failure still retries (soft) but is classified terminal', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'invalid-declaration', reason: '声明无效' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  assert.equal(h.ap.status().lastClass, 'terminal');
  assert.equal(h.ap.status().lastKind, 'invalid-declaration');
  const d = await h.fireNext();
  assert.equal(d, 500, 'terminal keeps the bounded schedule (no manual click needed)');
  assert.equal(h.calls.length, 2);
});

test('success stops retries immediately', async () => {
  let attempt = 0;
  const h = makeHarness(async () => {
    attempt += 1;
    return attempt >= 2 ? { state: 'supported' } : { state: 'unknown', failureKind: 'transient', reason: '未就绪' };
  });
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  assert.equal(h.calls.length, 1);
  const d = await h.fireNext();
  assert.equal(d, 500);
  assert.equal(h.calls.length, 2);
  assert.equal(h.ap.status().phase, 'ready');
  assert.equal(h.ap.status().retries, 0);
  assert.deepEqual(h.pendingDelays(), [], 'no retry is scheduled after success');
});

test('concurrent ensure calls are deduped per origin (one in-flight probe)', async () => {
  let resolveProbe: ((v: ProbeOutcome) => void) | undefined;
  const h = makeHarness(
    () =>
      new Promise<ProbeOutcome>((resolve) => {
        resolveProbe = resolve;
      }),
  );
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  h.ap.ensure('https://a.test', 1);
  h.ap.ensure('https://a.test', 1);
  assert.equal(h.calls.length, 1, 'in-flight probe is not restarted');
  assert.equal(h.ap.status().inFlight, true);
  resolveProbe?.({ state: 'supported' });
  await h.flush();
  assert.equal(h.ap.status().phase, 'ready');
});

test('origin change stops the old retries and probes the new origin once', async () => {
  const h = makeHarness(async (origin) => ({ state: 'unknown', failureKind: 'transient', reason: `${origin} 未就绪` }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext(); // schedule a retry for a.test
  assert.ok(h.pendingDelays().length > 0);

  h.ap.ensure('https://b.test', 2);
  await h.flush();
  assert.deepEqual(h.calls.map((c) => c.origin).slice(-1), ['https://b.test']);
  assert.equal(h.ap.status().origin, 'https://b.test');
  // The stale a.test result must not schedule anything for b.test's backoff other
  // than the fresh one for b.test.
  assert.deepEqual(h.pendingDelays(), [500]);
});

test('a stale probe result after an origin change is dropped', async () => {
  let resolveA: ((v: ProbeOutcome) => void) | undefined;
  const h = makeHarness(
    (origin) =>
      new Promise<ProbeOutcome>((resolve) => {
        if (origin === 'https://a.test') resolveA = resolve;
        else resolve({ state: 'supported' });
      }),
  );
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  h.ap.kick('https://b.test', 2);
  await h.flush();
  // b.test resolves immediately → ready; then the stale a.test resolves late.
  resolveA?.({ state: 'unknown', failureKind: 'transient', reason: 'late' });
  await h.flush();
  assert.equal(h.ap.status().origin, 'https://b.test');
  assert.equal(h.ap.status().phase, 'ready');
  assert.equal(h.ap.status().lastReason, undefined, 'stale failure must not leak into the new origin');
});

test('panel close (setFocused(false)) stops retries; refocus resumes automatically', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'transient', reason: '未就绪' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext();
  assert.ok(h.pendingDelays().length > 0);

  h.ap.setFocused(false);
  assert.deepEqual(h.pendingDelays(), [], 'no background retry while no panel is attached');

  h.ap.setFocused(true);
  await h.flush();
  assert.equal(h.calls.length, 3, 'refocus probes again automatically (no click)');
});

test('unauthorized (blocked) outcome performs zero further probes until a new signal', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', blocked: true, reason: '站点尚未授权' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  assert.equal(h.calls.length, 1);
  assert.equal(h.ap.status().phase, 'blocked');
  assert.deepEqual(h.pendingDelays(), [], 'unauthorized → no injection, no retry loop');

  // `kick` on authorize is a fresh signal → probes once.
  h.ap.kick('https://a.test', 1);
  await h.flush();
  assert.equal(h.calls.length, 2);
});

test('revoke/stop forgets the target and cancels the retry timer', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'transient', reason: '未就绪' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext();
  assert.ok(h.pendingDelays().length > 0);

  h.ap.stop();
  assert.deepEqual(h.pendingDelays(), []);
  assert.equal(h.ap.status().origin, null);
  assert.equal(h.ap.status().phase, 'idle');
});

test('an out-of-band supported report stops retries (content-script self-discovery)', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'transient', reason: '未就绪' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext();
  assert.ok(h.pendingDelays().length > 0);

  h.ap.note('https://a.test', { state: 'supported' });
  assert.deepEqual(h.pendingDelays(), []);
  assert.equal(h.ap.status().phase, 'ready');
});

test('setFocused(true) before any target is a safe no-op (no probe, no timer)', async () => {
  const h = makeHarness(async () => ({ state: 'supported' }));
  h.ap.setFocused(true);
  await h.flush();
  assert.equal(h.calls.length, 0);
  assert.equal(h.ap.status().origin, null);
});
