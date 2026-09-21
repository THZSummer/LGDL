/**
 * V5-1 TASK-V5-107/108/109/110 (ADR-V5-002 机制侧) — the **one** op pipeline
 * (`runOp` 四态) + `pendingOps` FIFO 仲裁 (EC-ALLN-010) + 快照 / 回滚**语义位**
 * + R5 失败语义三级. 本叶只交付机制：9 个 op 的执行体由 v5-2 填。
 *
 * 铁律：`op.execute(` 在 `src/ui/sidepanel/**` 中**恰 1 调用点**（本文件 runOp）。
 *
 * @module ui/sidepanel/next-registry/pipeline
 */
import { MAX_OPEN_ASKS, REF_ROUND_PREFIX } from '../stream-model.js';
import type { NextOp, OpCtx, OpOutcome } from './definition.js';

/** R5 ① — the typed failure the pipeline produces on a missing op (loud). */
export type OpFailure = { readonly ok: false; readonly reason: string };
/** The four-state outcome marker returned when params/consent were refused. */
export type SettleState = 'completed' | 'cancelled' | 'rejected';
/** A multi-table snapshot (op.revoke 三表整体回滚预留 — **禁止单表接口**). */
export interface OpSnapshot {
  readonly tables: readonly { readonly name: string; readonly rows: readonly unknown[] }[];
}

const REJECTED = Symbol('rejected');
const OK: OpOutcome = Object.freeze({ ok: true });

/* ── panel entry binding (sidepanel.ts 注册既有单一入口，保持零双路径) ── */
export interface PanelOps {
  turn?(text: string): void;
  pick?(): void;
  describe?(value?: string): void;
  authorize?(): void;
  rebind?(): void;
  help?(): void;
  notice?(text: string): void;
}
let PANEL: PanelOps = {};
export function bindPanelOps(ops: PanelOps): void {
  PANEL = ops;
}

/** Build a panel-local op (keeps the 6 entries a single, compact table). */
const op = (opId: string, risk: NextOp['risk'], run: (ctx: OpCtx) => void): NextOp => ({
  opId,
  risk,
  layer: 'panel',
  execute: async (ctx) => {
    run(ctx);
    return OK;
  },
});

/** The op table (单源；v5-2 补 op.llm-config / op.perm.request / op.revoke). */
export const OPS_BY_ID: Readonly<Record<string, NextOp>> = Object.freeze({
  'op.turn': op('op.turn', 'low', (c) => PANEL.turn?.(String(c.value ?? ''))),
  'op.pick': op('op.pick', 'low', () => PANEL.pick?.()),
  'op.describe': op('op.describe', 'low', (c) => PANEL.describe?.(c.value)),
  'op.authorize': op('op.authorize', 'mid', () => PANEL.authorize?.()),
  'op.rebind': op('op.rebind', 'low', () => PANEL.rebind?.()),
  'op.help': op('op.help', 'low', () => PANEL.help?.()),
});

/** The single pipeline entry marker (TASK-V5-110 「恰 1 调用点」判据的锚). */
export const PIPELINE_ENTRY = 'runOp';
/** R5 ③ — an op is mutating iff it is not low risk (改状态 ⇒ 快照). */
export function isMutating(op: Pick<NextOp, 'risk'>): boolean {
  return op.risk !== 'low';
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

/* ── 语义位（v5-2 填具体表读写；本叶只保证管线唯一 + 结构正确） ── */
const nullAsync = async (..._a: unknown[]): Promise<void> => {};
async function defaultCollectParams(): Promise<unknown> {
  return undefined;
}
async function defaultCollectConsent(): Promise<'allow' | 'reject'> {
  return 'allow';
}
async function defaultExecSw(): Promise<OpOutcome> {
  return { ok: false, reason: 'sw' };
}
async function defaultSnapshot(): Promise<OpSnapshot> {
  return { tables: [] };
}
async function defaultErrorWithRecovery(op: NextOp, boundary: string, err: unknown): Promise<OpOutcome> {
  return { ok: false, reason: `${boundary}:${op.opId}:${String(err)}` };
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
    PANEL.notice?.(`还有 ${n} 个待答，先答完再继续`);
    return { ok: false, reason: 'queued' };
  }
  const settle = deps.settle ?? nullAsync;
  if (op_.params) {
    const p = await (deps.collectParams ?? defaultCollectParams)(op_, ctx);
    if (p === REJECTED) {
      await settle(op_, 'cancelled', ctx);
      return { ok: false, reason: 'cancelled' };
    }
  }
  if (op_.consent) {
    const consent = await (deps.collectConsent ?? defaultCollectConsent)(op_, ctx);
    if (consent === 'reject') {
      await settle(op_, 'rejected', ctx);
      return { ok: false, reason: 'rejected' };
    }
  }
  const snap = isMutating(op_) ? await (deps.snapshot ?? defaultSnapshot)(op_, ctx) : undefined;
  try {
    const out = op_.layer === 'sw' ? await (deps.execSw ?? defaultExecSw)(op_, ctx) : await op_.execute(ctx);
    await settle(op_, 'completed', ctx, snap);
    return out;
  } catch (err) {
    if (snap) await (deps.rollback ?? nullAsync)(snap);
    return (deps.errorWithRecovery ?? defaultErrorWithRecovery)(op_, 'card-boundary', err);
  }
}

/** A `params` spec whose collection was refused maps to this sentinel (tests). */
export const PARAMS_REJECTED: typeof REJECTED = REJECTED;
