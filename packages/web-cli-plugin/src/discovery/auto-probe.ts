/**
 * Automatic discovery probe + bounded backoff retry (TASK-032 / FR-047).
 *
 * The side panel used to expose a manual「重新探测」button for the `unknown`
 * discovery state. That forced the user to understand an internal state machine
 * and to click before anything happened. This module makes probing **automatic**:
 * the background re-runs discovery on panel-open / tab-switch / navigation /
 * content-script `hello`, and retries a failed probe with a bounded backoff until
 * a fresh signal (site fixed / refresh / tab switch) makes it succeed.
 *
 * Design constraints (see tasks.md TASK-032):
 *  - **Dedupe per origin**: an in-flight probe is never started twice.
 *  - **Bounded backoff**: 500ms → 1s → 2s → 4s → 8s → 15s steady (never a
 *    tight loop; never a background-wide poll).
 *  - **Stop conditions**: success / origin change / panel close / revoke.
 *  - **Temporary vs terminal**: both keep retrying (terminal at the 15s soft
 *    floor once the schedule saturates), but the readable copy differs.
 *
 * Pure + dependency-injected (`probe`, timers) so the whole decision table is
 * node-testable with a controllable clock — no `chrome.*` / no real timers.
 */

/** Backoff schedule for the first retries (ms). */
export const BACKOFF_MS: readonly number[] = [500, 1000, 2000, 4000, 8000];
/** Steady-state cap: never retry faster than this (ms). */
export const BACKOFF_CAP_MS = 15000;

/** Delay before retry number `retryNo` (1-based). Saturated at {@link BACKOFF_CAP_MS}. */
export function delayForRetry(retryNo: number): number {
  if (!Number.isFinite(retryNo) || retryNo < 1) return BACKOFF_MS[0];
  return retryNo <= BACKOFF_MS.length ? BACKOFF_MS[retryNo - 1] : BACKOFF_CAP_MS;
}

export type ProbeFailureClass = 'temporary' | 'terminal';

export interface ProbeOutcome {
  /** Discovery three-state result. */
  state: 'supported' | 'unsupported' | 'unknown';
  /** Aggregated discovery failure kind (`transient` / `invalid-declaration` / …). */
  failureKind?: string;
  /** Readable reason (never a raw phase name). */
  reason?: string;
  /**
   * True when the probe was deliberately skipped because the origin is not
   * authorized (auto-probe ≠ auto-authorize → zero injection, no retry until
   * the user authorizes).
   */
  blocked?: boolean;
}

export type ProbePhase = 'idle' | 'probing' | 'waiting' | 'ready' | 'blocked';

export interface AutoProbeStatus {
  origin: string | null;
  tabId: number | null;
  phase: ProbePhase;
  /** Completed probe attempts since the last reset. */
  attempts: number;
  /** Retries scheduled since the last reset (copy uses「第 N 次重试」). */
  retries: number;
  inFlight: boolean;
  lastReason?: string;
  lastClass?: ProbeFailureClass;
  /** Last discovery failure kind (for precise terminal copy). */
  lastKind?: string;
  /** Delay (ms) of the currently scheduled retry, when `phase === 'waiting'`. */
  nextDelayMs?: number;
}

export interface AutoProbeDeps {
  probe(origin: string, tabId: number): Promise<ProbeOutcome>;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  /** Fired on every meaningful status transition (never on a no-op). */
  onStatus?(status: AutoProbeStatus): void;
}

export interface AutoProbe {
  /** Panel focus gate: retries only run while a panel (or an equivalent consumer) is attached. */
  setFocused(focused: boolean): void;
  /** Idempotent: start a probe for (origin, tabId) when idle; never resets a live backoff. */
  ensure(origin: string, tabId: number): void;
  /** Fresh external signal (tab switch / navigation / content-script hello / authorize): resets backoff and probes now. */
  kick(origin: string, tabId: number): void;
  /** Record an out-of-band outcome (the content script's own discovery report). */
  note(origin: string, outcome: ProbeOutcome): void;
  /** Stop retries and forget the target (panel close / revoke / unbind). */
  stop(): void;
  status(): AutoProbeStatus;
}

/**
 * Classify a failed probe:
 *  - `terminal`: the site declaration is definitively absent / invalid / a version
 *    mismatch — only a site-side fix (then a refresh) can succeed.
 *  - `temporary`: the page / content script / host / network is not ready yet.
 */
export function classifyFailure(outcome: ProbeOutcome): ProbeFailureClass {
  if (outcome.state === 'supported') return 'temporary'; // not used for success
  if (outcome.state === 'unsupported') return 'terminal';
  if (
    outcome.failureKind === 'no-declaration' ||
    outcome.failureKind === 'invalid-declaration' ||
    outcome.failureKind === 'version-mismatch'
  ) {
    return 'terminal';
  }
  return 'temporary';
}

export function createAutoProbe(deps: AutoProbeDeps): AutoProbe {
  let target: { origin: string; tabId: number } | null = null;
  let focused = false;
  let phase: ProbePhase = 'idle';
  let attempts = 0;
  let retries = 0;
  let inFlight = false;
  let lastReason: string | undefined;
  let lastClass: ProbeFailureClass | undefined;
  let lastKind: string | undefined;
  let nextDelayMs: number | undefined;
  let timer: unknown = null;
  let lastReported = '';

  function snapshot(): AutoProbeStatus {
    return {
      origin: target?.origin ?? null,
      tabId: target?.tabId ?? null,
      phase,
      attempts,
      retries,
      inFlight,
      ...(lastReason ? { lastReason } : {}),
      ...(lastClass ? { lastClass } : {}),
      ...(lastKind ? { lastKind } : {}),
      ...(phase === 'waiting' && nextDelayMs !== undefined ? { nextDelayMs } : {}),
    };
  }

  function report(): void {
    const serialized = JSON.stringify(snapshot());
    if (serialized === lastReported) return;
    lastReported = serialized;
    deps.onStatus?.(snapshot());
  }

  function clearTimer(): void {
    if (timer !== null) {
      deps.clearTimer(timer);
      timer = null;
    }
  }

  function resetTarget(origin: string, tabId: number): void {
    clearTimer();
    target = { origin, tabId };
    attempts = 0;
    retries = 0;
    phase = 'idle';
    lastReason = undefined;
    lastClass = undefined;
    lastKind = undefined;
    nextDelayMs = undefined;
  }

  function sameTarget(origin: string, tabId: number): boolean {
    return target !== null && target.origin === origin && target.tabId === tabId;
  }

  async function run(): Promise<void> {
    if (!focused || !target || inFlight) return;
    const probeTarget = target;
    inFlight = true;
    phase = 'probing';
    nextDelayMs = undefined;
    report();

    attempts += 1;
    let outcome: ProbeOutcome;
    try {
      outcome = await deps.probe(probeTarget.origin, probeTarget.tabId);
    } catch (err) {
      outcome = {
        state: 'unknown',
        failureKind: 'transient',
        reason: `探测暂不可达：${err instanceof Error ? err.message : String(err)}，将自动重试。`,
      };
    }
    inFlight = false;

    // Origin / tab changed while probing → the result is stale, drop it. A fresh
    // target that arrived mid-flight is started now (never left unprobed).
    if (!target || target.origin !== probeTarget.origin || target.tabId !== probeTarget.tabId) {
      report();
      if (target && (phase as string) === 'idle') void run();
      return;
    }

    if (outcome.state === 'supported') {
      clearTimer();
      phase = 'ready';
      retries = 0;
      lastReason = undefined;
      lastClass = undefined;
      lastKind = undefined;
      nextDelayMs = undefined;
      report();
      return;
    }

    if (outcome.blocked) {
      clearTimer();
      phase = 'blocked';
      lastReason = outcome.reason;
      lastClass = undefined;
      lastKind = undefined;
      nextDelayMs = undefined;
      report();
      return;
    }

    lastClass = classifyFailure(outcome);
    lastKind = outcome.failureKind;
    lastReason = outcome.reason;
    retries += 1;
    nextDelayMs = delayForRetry(retries);
    phase = 'waiting';
    clearTimer();
    timer = deps.setTimer(() => {
      timer = null;
      void run();
    }, nextDelayMs);
    report();
  }

  return {
    setFocused(value) {
      if (focused === value) return;
      focused = value;
      if (!value) {
        // Panel closed → stop retrying (bounded, no background-wide poll).
        clearTimer();
        nextDelayMs = undefined;
        if (phase !== 'ready') phase = 'idle';
        report();
        return;
      }
      if (target) void run();
    },
    ensure(origin, tabId) {
      if (!origin) return;
      if (!sameTarget(origin, tabId)) resetTarget(origin, tabId);
      if (!focused) return;
      if (inFlight || phase === 'ready' || phase === 'blocked' || phase === 'waiting' || phase === 'probing') return;
      void run();
    },
    kick(origin, tabId) {
      if (!origin) return;
      if (!sameTarget(origin, tabId)) resetTarget(origin, tabId);
      // A fresh signal (refresh / tab switch / hello / authorize) restarts the
      // backoff from the first step but never overlaps an in-flight probe.
      retries = 0;
      nextDelayMs = undefined;
      if (!focused) {
        report();
        return;
      }
      if (inFlight) return;
      void run();
    },
    note(origin, outcome) {
      if (!target || target.origin !== origin) return;
      if (outcome.state === 'supported') {
        clearTimer();
        phase = 'ready';
        retries = 0;
        lastReason = undefined;
        lastClass = undefined;
        lastKind = undefined;
        nextDelayMs = undefined;
        report();
        return;
      }
      // While a probe is in flight the probe's own outcome wins (no double count);
      // otherwise mirror the reported failure so the panel copy is immediate.
      if (inFlight) return;
      if (outcome.blocked) {
        phase = 'blocked';
        lastReason = outcome.reason;
        report();
        return;
      }
      lastClass = classifyFailure(outcome);
      lastKind = outcome.failureKind;
      lastReason = outcome.reason;
      report();
    },
    stop() {
      clearTimer();
      target = null;
      phase = 'idle';
      attempts = 0;
      retries = 0;
      lastReason = undefined;
      lastClass = undefined;
      lastKind = undefined;
      nextDelayMs = undefined;
      report();
    },
    status: snapshot,
  };
}
