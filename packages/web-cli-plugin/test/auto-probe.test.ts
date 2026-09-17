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
  DECLARATION_BACKOFF_CAP_MS,
  DECLARATION_BACKOFF_MS,
  classifyFailure,
  createAutoProbe,
  declarationDelayForAttempt,
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

test('terminal failure keeps the soft retry (automatic), now on the R2 declaration schedule', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'invalid-declaration', reason: '声明无效' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  assert.equal(h.ap.status().lastClass, 'terminal');
  assert.equal(h.ap.status().lastKind, 'invalid-declaration');
  // R2 (2026-09-17): a terminal declaration problem no longer retries at 500ms and
  // then every 15s forever — the first re-check is scheduled 15s out and grows.
  const d = await h.fireNext();
  assert.equal(d, 15000, 'terminal keeps retrying automatically, on the 15s→5min schedule');
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

// ══ R2 (2026-09-17, post-closeout defect-fix round) ═════════════════════════
//
// Author ruling「退避+稳态显示」: an eternally-invalid site declaration must stop
// producing a 15s-forever retry loop (the risk zone blinked「探测中」↔「站点声明存在
// 但无效」every cycle). Terminal failures get their own exponential schedule
// (15s→30s→60s→120s→300s cap, per origin, reset when the conclusion changes), and
// the status carries a `steady` marker so the panel can render a stable line.

test('R2 declarationDelayForAttempt: 15s/30s/60s/120s then saturated at 5min', () => {
  assert.deepEqual([...DECLARATION_BACKOFF_MS], [15000, 30000, 60000, 120000, 300000]);
  assert.equal(DECLARATION_BACKOFF_CAP_MS, 300000);
  assert.equal(declarationDelayForAttempt(0), 15000);
  assert.equal(declarationDelayForAttempt(1), 15000);
  assert.equal(declarationDelayForAttempt(2), 30000);
  assert.equal(declarationDelayForAttempt(3), 60000);
  assert.equal(declarationDelayForAttempt(4), 120000);
  assert.equal(declarationDelayForAttempt(5), 300000);
  assert.equal(declarationDelayForAttempt(6), 300000);
  assert.equal(declarationDelayForAttempt(99), 300000);
  assert.equal(declarationDelayForAttempt(Number.NaN), 15000);
  // The transient schedule is untouched (a still-loading page must not wait 15s).
  assert.deepEqual([...BACKOFF_MS], [500, 1000, 2000, 4000, 8000]);
  assert.equal(BACKOFF_CAP_MS, 15000);
});

test('R2 terminal failure: exponential declaration backoff 15→30→60→120→300→300 (cap)', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'invalid-declaration', reason: '声明无效' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();

  const delays: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    const d = await h.fireNext();
    assert.ok(d !== undefined, `declaration retry ${i + 1} scheduled`);
    delays.push(d!);
  }
  assert.deepEqual(delays, [15000, 30000, 60000, 120000, 300000, 300000], '15s→30s→60s→120s→5min 封顶');
  assert.deepEqual(h.pendingDelays(), [300000], 'never faster than the cap once saturated');
  // 1 (ensure) + 6 scheduled retries = 7 consecutive terminal attempts on this origin.
  assert.equal(h.ap.status().declarationAttempt, 7);
  assert.equal(h.ap.status().lastClass, 'terminal');
});

test('R2 steady marker: no `probing` status while a terminal backoff waits, and steady=true', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'invalid-declaration', reason: '声明无效' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();

  // exactly one fetch so far → exactly one `probing` status (never a per-retry blink)
  const probingCount = () => h.statuses.filter((s) => s.phase === 'probing').length;
  assert.equal(probingCount(), 1);
  const waiting = h.ap.status();
  assert.equal(waiting.phase, 'waiting');
  assert.equal(waiting.steady, true, '退避等待期必须带稳态标记（面板据此渲染稳态文案）');
  assert.equal(waiting.declarationAttempt, 1);
  assert.equal(waiting.nextDelayMs, 15000);
  assert.ok(
    h.statuses.some((s) => s.phase === 'waiting' && s.steady === true),
    '稳态标记必须被广播出去（不是只在本地状态里）',
  );

  // Two more cycles: the fetch count and the `probing` broadcast count stay 1:1 —
  // i.e. the steady wait itself never broadcasts `probing`.
  await h.fireNext();
  await h.fireNext();
  assert.equal(probingCount(), 3, '每次真正发起 fetch 才有一次 probing 广播');
  assert.equal(h.calls.length, 3);
  const last = h.ap.status();
  assert.equal(last.phase, 'waiting');
  assert.equal(last.steady, true);
  assert.equal(last.declarationAttempt, 3);
  assert.equal(last.nextDelayMs, 60000);
});

test('R2 reset trigger ①「导航 / 刷新 / 切标签页」: kick re-probes now and restarts at 15s', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'invalid-declaration', reason: '声明无效' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext();
  await h.fireNext();
  await h.fireNext();
  assert.equal(h.ap.status().declarationAttempt, 4);
  assert.equal(h.ap.status().nextDelayMs, 120000);

  h.ap.kick('https://a.test', 1); // navigation-complete / tab switch / hello / authorize
  await h.flush();
  assert.equal(h.calls.length, 5, 'kick probes immediately (在飞不重叠)');
  const after = h.ap.status();
  assert.equal(after.declarationAttempt, 1, '退避重置回第一步');
  assert.equal(after.nextDelayMs, 15000);
  await h.fireNext();
  assert.equal(h.ap.status().nextDelayMs, 30000, '重置后从 15s 重新爬升（不是续用 60s）');
});

test('R2 reset trigger ②「结论变化」: a different terminal kind restarts the schedule', async () => {
  let kind = 'invalid-declaration';
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: kind, reason: kind }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext();
  await h.fireNext();
  assert.equal(h.ap.status().declarationAttempt, 3);
  assert.equal(h.ap.status().nextDelayMs, 60000);

  // The site's failure mode changed (invalid-declaration → version-mismatch):
  // a *different* conclusion must not inherit the old attempt count.
  kind = 'version-mismatch';
  await h.fireNext();
  assert.equal(h.ap.status().declarationAttempt, 1, '结论变化 ⇒ attempt 重置');
  assert.equal(h.ap.status().nextDelayMs, 15000);
});

test('R2 reset trigger ③「结论变好」: supported resets everything (site fixed ⇒ normal state)', async () => {
  let fixed = false;
  const h = makeHarness(async () =>
    fixed ? { state: 'supported' } : { state: 'unknown', failureKind: 'invalid-declaration', reason: '声明无效' },
  );
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext();
  await h.fireNext();
  assert.equal(h.ap.status().declarationAttempt, 3);

  fixed = true;
  await h.fireNext();
  assert.equal(h.ap.status().phase, 'ready');
  assert.equal(h.ap.status().declarationAttempt, 0);
  assert.equal(h.ap.status().steady, false);
  assert.deepEqual(h.pendingDelays(), [], '修好后不再有任何重试');
});

test('R2 per-origin counting: a second origin never inherits the first one’s attempt count', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'invalid-declaration', reason: '声明无效' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  await h.fireNext();
  await h.fireNext();
  await h.fireNext();
  assert.equal(h.ap.status().declarationAttempt, 4, 'a.test 已爬升到第 4 步');

  h.ap.ensure('https://b.test', 2); // panel follows the tab to another origin
  await h.flush();
  assert.equal(h.ap.status().origin, 'https://b.test');
  assert.equal(h.ap.status().declarationAttempt, 1, 'b.test 从第 1 步开始（按 origin 独立计数）');
  assert.equal(h.ap.status().nextDelayMs, 15000);
});

test('R2 transient failures never enter the declaration backoff (steady stays false)', async () => {
  const h = makeHarness(async () => ({ state: 'unknown', failureKind: 'transient', reason: '页面未就绪' }));
  h.ap.setFocused(true);
  h.ap.ensure('https://a.test', 1);
  await h.flush();
  const d = await h.fireNext();
  assert.equal(d, 500, '瞬态失败保留 500ms 起的快速退避');
  assert.equal(h.ap.status().steady, false);
  assert.equal(h.ap.status().declarationAttempt, 0);
  const d2 = await h.fireNext();
  assert.equal(d2, 1000);
});
