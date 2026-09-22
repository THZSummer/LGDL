/**
 * V5-1 TASK-V5-101 (ADR-V5-001) — the NextProvider / NextOp **Definition**
 * (Seam 三件套之一). Pure TS: zero DOM, zero chrome, zero side effects — the
 * registry (Provider) and the dispatcher (Consumer) both build on this shape.
 *
 * @module ui/sidepanel/next-registry/definition
 */

/** R2 — the services a provider may declare a dependency on (`deps ⊆ NEXT_SERVICES`). */
export const NEXT_SERVICES = Object.freeze(['session', 'snapshot', 'credentials', 'permissions', 'siteRegistry', 'pageSide'] as const);
export type NextService = (typeof NEXT_SERVICES)[number];

/** R4 — the dispatch modes. */
export const NEXT_MODES = Object.freeze(['waterfall', 'emit'] as const);
export type NextMode = (typeof NEXT_MODES)[number];

/** R4 — the mount points of the one pipeline. */
export const NEXT_MOUNT_POINTS = Object.freeze(['next', 'params', 'consent', 'execute', 'receipt'] as const);
export type NextMountPoint = (typeof NEXT_MOUNT_POINTS)[number];

/** R4 — the mount-point × mode table (唯一权威): 4 waterfall + `receipt` emit. */
export const MOUNT_MODE: Readonly<Record<NextMountPoint, NextMode>> = Object.freeze({
  next: 'waterfall',
  params: 'waterfall',
  consent: 'waterfall',
  execute: 'waterfall',
  receipt: 'emit',
});

/**
 * FR-ALLN-010 / ADR-V5-009 — the blocked terminals (**恰 5 项**). This is the
 * **only** place the five literals may be written; every other site must derive.
 */
export const BLOCKED_TERMINALS = Object.freeze([
  'site.unauthorized',
  'llm.unconfigured',
  'perm.missing',
  'binding.stale',
  'ref.all-invalid',
] as const);
export type BlockedTerminal = (typeof BLOCKED_TERMINALS)[number];

/**
 * The idle-state anti-flicker interval — a **re-export** of the ONE declaration in
 * `recommend.ts` (V5-1 validate R1 finding I-04: this module used to carry a second,
 * product-unreferenced copy of the literal `10_000`; two independent declarations of
 * one value is a drift seam this module must not own). Nothing in the bundle reads it
 * through this path, so the re-export tree-shakes to zero bytes.
 */
export { NEXTSTEP_MIN_INTERVAL_MS } from '../recommend.js';

/** The 7 allowed truth sources — the field set of {@link NextCtx} (逐字). */
export const NEXT_SOURCE_NAMES = Object.freeze(['ref', 'session', 'site', 'catalog', 'probe', 'risk', 'onboarding'] as const);
export type NextSourceName = (typeof NEXT_SOURCE_NAMES)[number];

/** The pure input a `when(ctx)` predicate may read (exactly the 7 sources). */
export interface NextCtx {
  readonly ref: { readonly validCount: number; readonly staleCount: number; readonly latestRefNum?: number };
  readonly session: { readonly openAsks: number; readonly busy: boolean };
  readonly site: { readonly authorized: boolean; readonly trust?: 'trusted' | 'untrusted' };
  readonly catalog: { readonly toolCount: number; readonly subcommandCount: number };
  readonly probe: { readonly phase?: string; readonly steady: boolean };
  readonly risk: readonly string[];
  readonly onboarding: { readonly firstRun: boolean; readonly pendingSteps: readonly string[] };
}

export interface AskSpec {
  readonly prompt: string;
  readonly kind?: 'choice' | 'confirm' | 'text' | 'secret' | 'form';
}
export interface ConsentSpec {
  readonly prompt: string;
}
export interface ReceiptSpec {
  readonly text: string;
}

/** R1/R2/R3/R4/R5 — one registry row. */
export interface NextProvider {
  readonly id: string;
  readonly deps: readonly NextService[];
  readonly priority: 0 | 1 | 2 | 3;
  readonly prepend?: boolean;
  readonly mode: NextMode;
  readonly fail: 'card-boundary' | 'snapshot-rollback';
  when(ctx: NextCtx): boolean;
  /** The chips as **opId** list (the pipeline owns rendering / clicking). */
  readonly chips: readonly string[];
  /** Optional static/dynamic chip copy, positionally aligned with {@link NextProvider.chips}. */
  readonly textOf?: (ctx: NextCtx) => readonly string[];
  /** The migrated rule id this provider belongs to (one candidate per rule). */
  readonly rule?: string;
  dispose?(): void;
}

/** The context handed to `op.execute()` by the pipeline (the caller's value slot). */
export interface OpCtx {
  readonly value?: string;
}
export interface OpOutcome {
  readonly ok: boolean;
  readonly reason?: string;
  /**
   * V5-2 review R1 **BLOCK-01** (ADR-V5-005 §1/§3) — the execute body's **own receipt
   * copy**. The body knows what it did (which provider / which capability / which
   * target), so the settings surfaces render THIS instead of a generic per-op sentence:
   * one body, one copy, both surfaces (settings panel + `options.html`) and the stream
   * settle all read the same string. Absent (a body that only reports `ok`) falls back to
   * the op table's declared receipt text.
   */
  readonly receipt?: { readonly kind?: string; readonly text: string };
}
/** FR-ALLN-055 — one op, mounted on the one pipeline. */
export interface NextOp {
  readonly opId: string;
  readonly risk: 'low' | 'mid' | 'high';
  readonly layer: 'panel' | 'sw';
  readonly params?: AskSpec;
  readonly consent?: ConsentSpec;
  execute(ctx: OpCtx): Promise<OpOutcome>;
  readonly receipt?: ReceiptSpec;
}
