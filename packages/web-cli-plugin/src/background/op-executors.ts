/**
 * V5-2 **TASK-V5-132 / 133** (ADR-V5-003 §2/§3 · FR-ALLN-066 / 068 · AC-ALLN-010 ·
 * R-V5-101) — the **service-worker op executor mirror**.
 *
 * ── Same source, no second list (FR-ALLN-068) ───────────────────────────────
 *
 * {@link SW_OPS} is **derived** from `shared/op-table.ts` — `filter(layer === 'sw')`
 * — and mirrors exactly the four fields `{id, mode, fail, audit}` (the inner object
 * drops the layer, because the layer *is* the predicate). A hand-written second copy
 * is what the `sw-op-mirror` gate scans for and fails.
 *
 * ── The two-stage handshake (ADR-V5-003 §3) ─────────────────────────────────
 *
 * Chrome requires the permission request to happen in a **user gesture inside an
 * extension page**, and `test/capability-wiring` pins「the SW never asks」. So
 * 「the privileged op runs in the SW」is implemented as: **the SW is
 * the 裁决 / 快照 / 审计 owner, the page supplies the gesture**:
 *
 *   probe  → validate consent / snapshot the authorization table / compute the host
 *            pattern → reply `{needsGesture: true, origin, pattern}` (NO state change)
 *   commit → the page reports the gesture outcome → the SW commits the authorization
 *            (through the ONE `authorizeOrigin` routine) or refuses → reply the record
 *
 * **The commit phase is the only commit point**: a probe/transport failure leaves the
 * authorization table byte-identical, which is what lets `op.authorize` declare
 * `fail: 'snapshot-rollback'` and stay honest.
 *
 * @module background/op-executors
 */
import { SW_OP_DESCRIPTORS } from '../shared/op-table.js';
import type { OpExecRequest, OpExecResult } from './op-protocol.js';

/**
 * The SW mirror: `{ id → { mode, fail, audit } }`, derived from the ONE table. The
 * value objects are frozen so a caller cannot mutate the mirror at runtime.
 */
export const SW_OPS: Readonly<Record<string, { readonly mode: string; readonly fail: string; readonly audit: boolean }>> =
  Object.freeze(
    Object.fromEntries(
      SW_OP_DESCRIPTORS.map((d) => [d.id, Object.freeze({ mode: d.mode, fail: d.fail, audit: d.audit })]),
    ),
  );

/** The mirror's field names — the exactly-four contract `test/sw-op-mirror` pins. */
export const SW_OP_FIELDS: readonly string[] = Object.freeze(['mode', 'fail', 'audit']);

/** What the executor needs from the worker (injected, so the judge is unit-testable). */
export interface OpExecDeps {
  /** The ONE origin-authorization routine (shared with the legacy `authorize` message). */
  authorize(origin: string, granted: boolean): Promise<unknown>;
  /** Read-only snapshot of the authorization table (the probe phase; R-V5-101). */
  snapshot(): Promise<readonly unknown[]>;
  /** The bound tab's origin (`undefined` ⇒ no target ⇒ loud refusal). */
  activeOrigin(): string | undefined;
  /** Host pattern of an origin (`platform/extension-env#originPermissionPattern`). */
  patternOf(origin: string): string | null;
  /** An audit row for the executor's decision (type `origin-authorize`, one source). */
  audit(origin: string, decision: 'granted' | 'denied', reason: string): void;
  /**
   * V5-2 TASK-V5-139 — the `op.perm.request` audit row (the capability grant/deny the
   * **page gesture** produced; the SW records the裁决, Chrome owns the grant itself).
   * Optional so the existing `op.authorize` judges stay unchanged.
   */
  auditCapability?(capability: string, decision: 'granted' | 'denied', reason: string): void;
}

function refusal(error: string): OpExecResult {
  return { ok: false, error };
}

/**
 * Execute one `op-exec` request. The opId is checked against the mirror **first**, so
 * a kind the panel did not register can never reach an executor body.
 */
export async function execSwOp(req: OpExecRequest, deps: OpExecDeps): Promise<OpExecResult> {
  const row = SW_OPS[req.opId];
  if (!row) return refusal(`op-exec: 未注册的特权 op（${req.opId}）`);
  const origin = req.origin ?? deps.activeOrigin();
  if (!origin) return refusal(`op-exec: 无法确定目标 origin（${req.opId}）`);
  const pattern = deps.patternOf(origin);

  if (req.phase === 'probe') {
    // R-V5-101: the probe is read-only — a snapshot for the rollback contract and the
    // gesture instruction. Nothing about the authorization table changes here.
    const rows = await deps.snapshot();
    return {
      ok: true,
      data: { opId: req.opId, phase: 'probe', origin, pattern, needsGesture: true, snapshotRows: rows.length },
    };
  }

  // ── commit: the ONLY commit point ──────────────────────────────────────────
  const granted = req.gestureResult?.granted === true;
  if (req.opId !== 'op.authorize') {
    // V5-2 TASK-V5-139 (`op.perm.request`): the SW is the 裁决 / 快照 / 审计 owner;
    // the grant itself happens in the **page gesture** (Chrome refuses here), so the
    // commit records the gesture outcome and audits it. No authorization-table write.
    const capability = req.permission;
    if (!capability) return refusal(`op-exec: ${req.opId} 的 commit 必须携带 permission（在册能力 id）`);
    if (row.audit) deps.auditCapability?.(capability, granted ? 'granted' : 'denied', `${req.opId} 经 SW 执行器裁决（${req.phase} · ${capability}）`);
    return { ok: true, data: { opId: req.opId, phase: 'commit', capability, granted, needsUserRemoval: true } };
  }
  try {
    const record = await deps.authorize(origin, granted);
    if (row.audit) {
      deps.audit(origin, granted ? 'granted' : 'denied', `op.authorize 经 SW 执行器裁决（${req.opId} · ${req.phase}）`);
    }
    return { ok: true, data: { opId: req.opId, phase: 'commit', origin, pattern, granted, record } };
  } catch (err) {
    // A throwing commit wrote nothing ⇒ no rollback is needed and no state changed.
    return refusal(`op-exec: 授权登记失败（${err instanceof Error ? err.message : String(err)}）`);
  }
}
