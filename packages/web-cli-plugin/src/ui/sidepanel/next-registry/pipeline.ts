/**
 * V5-1 TASK-V5-107/108/109/110 (ADR-V5-002 机制侧) — the **one** op pipeline
 * (`runOp` 四态) + `pendingOps` FIFO 仲裁 (EC-ALLN-010) + 快照 / 回滚**语义位**
 * + R5 失败语义三级. V5-2 (TASK-V5-124~137) fills the nine execution bodies, which
 * live in {@link ./ops.js} — this module stays the *mechanism*.
 *
 * 铁律：`op.execute(` 在 `src/ui/sidepanel/**` 中**恰 1 调用点**（本文件 runOp）。
 *
 * ── V5-2 wiring (ADR-V5-002 §1 / ADR-V5-003) ────────────────────────────────
 *
 * The pipeline is the ONE place a state transition can happen, so the production
 * seams are resolved here (never in the dispatcher — `handleCardAction` stays a single
 * lookup with zero per-op branches, FR-ALLN-058):
 *
 *   ① `params` / `consent` collectors — the panel's stream cards (`ops.ts` seam);
 *   ② `execSw` — the privileged-op handshake with the service worker;
 *   ③ `settle` — the ONE receipt / non-dead-end row writer.
 *
 * @module ui/sidepanel/next-registry/pipeline
 */
import { MAX_OPEN_ASKS, REF_ROUND_PREFIX } from '../stream-model.js';
import type { NextOp, OpCtx, OpOutcome } from './definition.js';
import { OPS_BY_ID, collectOpConsent, collectOpParams, panelNotice, swExec } from './ops.js';

// V5-2: the panel seam and the op table moved to `ops.ts` (the single op source);
// they are re-exported here so every existing consumer/gate keeps one import site.
export { OPS_BY_ID, bindPanelOps, reachableOpIds, type PanelOps } from './ops.js';

/** R5 ① — the typed failure the pipeline produces on a missing op (loud). */
export type OpFailure = { readonly ok: false; readonly reason: string };
/** The four-state outcome marker returned when params/consent were refused. */
export type SettleState = 'completed' | 'cancelled' | 'rejected';
/** A multi-table snapshot (op.revoke 三表整体回滚预留 — **禁止单表接口**). */
export interface OpSnapshot {
  readonly tables: readonly { readonly name: string; readonly rows: readonly unknown[] }[];
}

const REJECTED = Symbol('rejected');

/** The single pipeline entry marker (TASK-V5-110 「恰 1 调用点」判据的锚). */
export const PIPELINE_ENTRY = 'runOp';
/** R5 ③ — an op is mutating iff it is not low risk (改状态 ⇒ 快照). */
export function isMutating(op: Pick<NextOp, 'risk'>): boolean {
  return op.risk !== 'low';
}

/**
 * V5-2 — the op whose `execute` body writes its own stream row (a local, read-only
 * action reusing an existing single entry) does not get a second, generic receipt.
 */
function emitsOwnRow(op: NextOp): boolean {
  return op.layer === 'panel' && op.risk === 'low';
}

/* ── pendingOps FIFO + MAX_OPEN_ASKS 仲裁 (EC-ALLN-010) ── */
const PENDING: string[] = [];
const RESOLVED = new Set<string>();
/** Queue an op when the open-ask budget is exhausted. Local rounds never queue. */
export function enqueuePending(opId: string, requestId?: string): number {
  if (requestId !== undefined && requestId.startsWith(REF_ROUND_PREFIX)) return PENDING.length;
  PENDING.push(opId);
  return PENDING.length;
}
export function drainOne(): string | undefined {
  return PENDING.shift();
}
export function queueLength(): number {
  return PENDING.length;
}
/** `ask-resolved` — idempotent per request id; drains exactly one queued op. */
export function resolvePending(requestId: string): boolean {
  if (RESOLVED.has(requestId)) return false;
  RESOLVED.add(requestId);
  drainOne();
  return true;
}

/* ── 语义位（V5-2: 生产默认实现接面板 / SW 缝；单测仍可注入） ── */
const nullAsync = async (..._a: unknown[]): Promise<void> => {};
async function defaultExecSw(op: NextOp, ctx: OpCtx): Promise<OpOutcome> {
  return swExec(op, ctx);
}

/**
 * V5-2 (FR-ALLN-034 ① / 法七不破 / TASK-V5-143 上游) — the default settle:
 *
 *   · `completed` → a mutating or privileged op gets its declared receipt row
 *     (a low-risk local op already wrote its own, richer row);
 *   · `cancelled` / `rejected` → a **reachable** row (拒绝不是死端): the reason is
 *     stated and the user keeps the rest of the surface — nothing is silently dropped.
 */
async function defaultSettle(op: NextOp, state: SettleState): Promise<void> {
  if (state === 'completed') {
    if (!emitsOwnRow(op) && op.receipt) panelNotice(op.receipt.text);
    return;
  }
  panelNotice(`${state === 'cancelled' ? '已取消' : '已拒绝'}：${op.opId} 未执行（可继续其他操作）`);
}
async function defaultSnapshot(): Promise<OpSnapshot> {
  return { tables: [] };
}
async function defaultErrorWithRecovery(op: NextOp, boundary: string, err: unknown): Promise<OpOutcome> {
  const reason = `${boundary}:${op.opId}:${String(err)}`;
  panelNotice(`✖ ${op.opId} 失败：${err instanceof Error ? err.message : String(err)}（可重试）`);
  return { ok: false, reason };
}
async function defaultFail(reason: string): Promise<OpOutcome> {
  return { ok: false, reason };
}

/** Injectable seams (unit tests drive the four states without touching the registry). */
export interface PipelineDeps {
  readonly ops?: Readonly<Record<string, NextOp>>;
  readonly collectParams?: (op: NextOp, ctx: OpCtx) => Promise<unknown>;
  readonly collectConsent?: (op: NextOp, ctx: OpCtx) => Promise<'allow' | 'reject'>;
  readonly execSw?: (op: NextOp, ctx: OpCtx) => Promise<OpOutcome>;
  readonly settle?: (op: NextOp, state: SettleState, ctx: OpCtx, snap?: OpSnapshot) => Promise<void>;
  readonly snapshot?: (op: NextOp, ctx: OpCtx) => Promise<OpSnapshot>;
  readonly rollback?: (snap: OpSnapshot) => Promise<void>;
  readonly errorWithRecovery?: (op: NextOp, boundary: string, err: unknown) => Promise<OpOutcome>;
  readonly fail?: (reason: string, opId?: string) => Promise<OpOutcome>;
  readonly openAsks?: number;
  readonly maxOpenAsks?: number;
}

/**
 * The **one** pipeline: `params? → consent? → snapshot? → execute → receipt`,
 * with a single-card-boundary catch + whole-snapshot rollback.
 */
export async function runOp(opId: string, ctx: OpCtx = {}, deps: PipelineDeps = {}): Promise<OpOutcome> {
  const ops = deps.ops ?? OPS_BY_ID;
  const fail = deps.fail ?? defaultFail;
  const op_ = ops[opId];
  if (!op_) return fail('unknown-op', opId);
  const openAsks = deps.openAsks ?? 0;
  const maxOpen = deps.maxOpenAsks ?? MAX_OPEN_ASKS;
  if ((op_.params || op_.consent) && openAsks >= maxOpen) {
    const n = enqueuePending(opId);
    panelNotice(`还有 ${n} 个待答，先答完再继续`);
    return { ok: false, reason: 'queued' };
  }
  const settle = deps.settle ?? defaultSettle;
  // V5-2: the collected answer becomes the execute context (`op.describe` reads it).
  let ectx = ctx;
  if (op_.params) {
    const p = await (deps.collectParams ?? collectOpParams)(op_, ctx);
    if (p === REJECTED) {
      await settle(op_, 'cancelled', ctx);
      return { ok: false, reason: 'cancelled' };
    }
    if (typeof p === 'string') ectx = { value: p };
  }
  if (op_.consent) {
    const consent = await (deps.collectConsent ?? collectOpConsent)(op_, ctx);
    if (consent === 'reject') {
      await settle(op_, 'rejected', ctx);
      return { ok: false, reason: 'rejected' };
    }
  }
  const snap = isMutating(op_) ? await (deps.snapshot ?? defaultSnapshot)(op_, ctx) : undefined;
  try {
    const out = op_.layer === 'sw' ? await (deps.execSw ?? defaultExecSw)(op_, ectx) : await op_.execute(ectx);
    await settle(op_, 'completed', ctx, snap);
    return out;
  } catch (err) {
    if (snap) await (deps.rollback ?? nullAsync)(snap);
    return (deps.errorWithRecovery ?? defaultErrorWithRecovery)(op_, 'card-boundary', err);
  }
}

/** A `params` spec whose collection was refused maps to this sentinel (tests). */
export const PARAMS_REJECTED: typeof REJECTED = REJECTED;
