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
 *  - **Bounded backoff**: transient failures keep the fast schedule
 *    500ms → 1s → 2s → 4s → 8s → 15s steady (never a tight loop; never a
 *    background-wide poll).
 *  - **Stop conditions**: success / origin change / panel close / revoke.
 *  - **Temporary vs terminal**: both keep retrying, but the readable copy and the
 *    schedule differ — see the R2 note below.
 *
 * ── R2 (2026-09-17, post-closeout defect-fix round) ─────────────────────────
 *
 * Author's real-device report at HEAD `6d9ed5d`: on a site whose declaration is
 * **permanently invalid** (deepseek returns HTML), the coordinator re-probed every
 * 15 s forever. Two visible symptoms: the risk zone flipped「探测中」↔「站点声明存在
 * 但无效」every 15 s (looks like a hang), and an eternally-invalid site got a
 * never-ending pointless retry.
 *
 * Adjudicated fix (author's ruling "修：退避+稳态显示", 2026-09-17):
 *  1. **Terminal failures get their own exponential schedule**
 *     `15s → 30s → 60s → 120s → 300s` (cap), counted **per origin** and reset the
 *     moment the terminal conclusion changes. Transient failures keep the fast
 *     schedule above — a page that is still loading must not wait 15 s for its
 *     first retry.
 *  2. **Steady marker**: while waiting on a terminal failure the status carries
 *     `steady: true` + `declarationAttempt`, and no `phase: 'probing'` is emitted
 *     (the fetch itself is the only thing that is ever「探测中」). The panel renders
 *     a stable「低频自动复查中」line instead of blinking to nothing.
 *  3. **Recovery is not weakened**: navigation / refresh / tab switch / content-script
 *     hello / authorize / panel (re)visible all still `kick()` → immediate probe and
 *     the backoff restarts from the first step.
 *
 * Pure + dependency-injected (`probe`, timers) so the whole decision table is
 * node-testable with a controllable clock — no `chrome.*` / no real timers.
 */

/** Backoff schedule for the first transient retries (ms). */
export const BACKOFF_MS: readonly number[] = [500, 1000, 2000, 4000, 8000];
/** Steady-state cap for transient failures: never retry faster than this (ms). */
export const BACKOFF_CAP_MS = 15000;

/** Delay before transient retry number `retryNo` (1-based). Saturated at {@link BACKOFF_CAP_MS}. */
export function delayForRetry(retryNo: number): number {
  if (!Number.isFinite(retryNo) || retryNo < 1) return BACKOFF_MS[0];
  return retryNo <= BACKOFF_MS.length ? BACKOFF_MS[retryNo - 1] : BACKOFF_CAP_MS;
}

/**
 * R2: the **declaration** (terminal) backoff schedule — 15 s → 5 min cap. The last
 * entry IS the cap, so `declarationDelayForAttempt` can index directly.
 */
export const DECLARATION_BACKOFF_MS: readonly number[] = [15000, 30000, 60000, 120000, 300000];
/** R2: the declaration backoff cap (5 min) — the last {@link DECLARATION_BACKOFF_MS} step. */
export const DECLARATION_BACKOFF_CAP_MS = 300000;

/**
 * R2: delay before declaration attempt number `attemptNo` (1-based, where 1 is the
 * FIRST terminal failure and therefore schedules 15 s). Saturated at
 * {@link DECLARATION_BACKOFF_CAP_MS}.
 */
export function declarationDelayForAttempt(attemptNo: number): number {
  if (!Number.isFinite(attemptNo) || attemptNo < 1) return DECLARATION_BACKOFF_MS[0];
  const index = Math.min(Math.floor(attemptNo), DECLARATION_BACKOFF_MS.length) - 1;
  return DECLARATION_BACKOFF_MS[index];
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
  /**
   * R2: consecutive terminal attempts for the current origin (0 when the current
   * wait is not a declaration backoff). Keyed by origin + terminal conclusion, so it
   * never leaks across origins and resets when the conclusion changes.
   */
  declarationAttempt: number;
  /**
   * R2 — the steady marker. `true` exactly while the coordinator is **waiting on a
   * terminal declaration failure** (no fetch in flight, low-frequency re-check
   * scheduled). The panel renders the steady「站点声明存在但无效（低频自动复查中）」
   * line for this state; a `phase: 'probing'` status is emitted only when a fetch is
   * actually issued.
   */
  steady: boolean;
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

/**
 * R2: the identity of a terminal conclusion. Two consecutive terminal failures
 * extend the same backoff only when this key is unchanged; any other key (or a
 * non-terminal outcome) restarts the schedule.
 */
function terminalKey(outcome: ProbeOutcome): string {
  return outcome.failureKind ?? outcome.state;
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
  /**
   * R2: consecutive terminal attempts, **keyed by origin** (never shared between
   * origins) plus the conclusion each count belongs to, so a changed conclusion
   * restarts the schedule instead of inheriting a long delay.
   */
  const declarationAttempts = new Map<string, number>();
  const declarationKinds = new Map<string, string>();

  function declarationAttemptFor(origin: string | null): number {
    return (origin && declarationAttempts.get(origin)) || 0;
  }

  /** R2: a changed terminal conclusion resets the count; the same one extends it. */
  function bumpDeclarationAttempt(origin: string, kind: string): number {
    const next = declarationKinds.get(origin) === kind ? declarationAttemptFor(origin) + 1 : 1;
    declarationKinds.set(origin, kind);
    declarationAttempts.set(origin, next);
    return next;
  }

  /** R2: success / transient / blocked / fresh signal ⇒ the terminal backoff restarts. */
  function clearDeclarationAttempt(origin: string): void {
    declarationAttempts.delete(origin);
    declarationKinds.delete(origin);
  }

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
      declarationAttempt: declarationAttemptFor(target?.origin ?? null),
      // R2: the steady marker is exactly "waiting on a terminal declaration
      // problem" — never true while a fetch is in flight.
      steady: phase === 'waiting' && lastClass === 'terminal',
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
    // R2: a newly focused origin starts from the first step — its backoff is its own.
    clearDeclarationAttempt(origin);
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
      // R2: the site fixed its declaration → a future failure starts at 15 s again.
      clearDeclarationAttempt(probeTarget.origin);
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
      clearDeclarationAttempt(probeTarget.origin);
      report();
      return;
    }

    lastClass = classifyFailure(outcome);
    lastKind = outcome.failureKind;
    lastReason = outcome.reason;
    retries += 1;
    if (lastClass === 'terminal') {
      // R2: a terminal (declaration invalid / absent / version mismatch) failure gets
      // the exponential declaration schedule — 15 s → 30 s → 60 s → 120 s → 300 s cap.
      // The count is per origin + per conclusion: a changed conclusion restarts it.
      const attemptNo = bumpDeclarationAttempt(probeTarget.origin, terminalKey(outcome));
      nextDelayMs = declarationDelayForAttempt(attemptNo);
    } else {
      // Transient (page / content script / network not ready) keeps the fast schedule
      // so a still-loading page is re-probed quickly.
      clearDeclarationAttempt(probeTarget.origin);
      nextDelayMs = delayForRetry(retries);
    }
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
      // A fresh signal (refresh / tab switch / hello / authorize / panel re-visible)
      // restarts the backoff from the first step but never overlaps an in-flight probe.
      // R2: this is also what keeps「站点修复后立即恢复」true under the longer schedule.
      retries = 0;
      nextDelayMs = undefined;
      clearDeclarationAttempt(origin);
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
        clearDeclarationAttempt(origin);
        report();
        return;
      }
      // While a probe is in flight the probe's own outcome wins (no double count);
      // otherwise mirror the reported failure so the panel copy is immediate.
      if (inFlight) return;
      if (outcome.blocked) {
        phase = 'blocked';
        lastReason = outcome.reason;
        clearDeclarationAttempt(origin);
        report();
        return;
      }
      lastClass = classifyFailure(outcome);
      lastKind = outcome.failureKind;
      lastReason = outcome.reason;
      // R2: an out-of-band content-script report is a *fresh* signal — like `kick`, it
      // restarts the declaration schedule rather than inheriting a long delay.
      clearDeclarationAttempt(origin);
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
      declarationAttempts.clear();
      declarationKinds.clear();
      report();
    },
    status: snapshot,
  };
}
