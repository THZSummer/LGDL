/**
 * V5-2 **TASK-V5-123** (ADR-V5-003 §2 · FR-ALLN-068 · AC-ALLN-010) — the **op
 * descriptor table**: the ONE place the nine ops of the first batch are declared as
 * data.
 *
 * ── Why this module exists (double-sided single source) ─────────────────────
 *
 * The panel registry (`ui/sidepanel/next-registry/ops.ts`) and the service-worker
 * executor mirror (`background/op-executors.ts`) must agree on **which ops exist**,
 * **which layer executes them** and **what their failure semantics are**. Two
 * hand-written lists would be exactly the drift seam FR-ALLN-068 forbids, so both
 * sides derive from {@link OP_DESCRIPTORS} instead:
 *
 *   · panel  : `OPS_BY_ID` keys + each op's `layer` (the pipeline routes on it)
 *   · SW     : `SW_OPS` = `OP_DESCRIPTORS.filter(layer === 'sw')`, mirroring exactly
 *              the four fields `{id, mode, fail, audit}` (the inner two are dropped
 *              because the layer IS the predicate)
 *
 * ── Pure data (zero chrome / zero DOM / zero side effects) ──────────────────
 *
 * The module is deliberately runtime-dependency-free: the `definition.js` imports are
 * `import type` only, so **no code, no string table and no constant is pulled in** by
 * importing it from either bundle. That is what lets the panel side carry it inside
 * the (exhausted) `sidepanel.js` budget and the SW side carry it inside
 * `background.js` without either bundle importing the other's world.
 *
 * ── The nine rows (ADRs V5-002 §2.2 / V5-003 §3) ────────────────────────────
 *
 *   | id              | layer | mode      | fail              | audit |
 *   |-----------------|-------|-----------|-------------------|-------|
 *   | op.turn         | panel | waterfall | card-boundary     | no    |
 *   | op.pick         | panel | waterfall | card-boundary     | no    |
 *   | op.describe     | panel | waterfall | card-boundary     | no    |
 *   | op.authorize    | sw    | waterfall | snapshot-rollback | yes   |
 *   | op.rebind       | panel | waterfall | card-boundary     | no    |
 *   | op.help         | panel | waterfall | card-boundary     | no    |
 *   | op.llm-config   | panel | waterfall | snapshot-rollback | yes   |
 *   | op.perm.request | sw    | waterfall | snapshot-rollback | yes   |
 *   | op.revoke       | panel | waterfall | snapshot-rollback | yes   |
 *
 * `mode` is the **one** dispatch mode an op row carries; every op mounts on the one
 * waterfall pipeline (`MOUNT_MODE.execute`), and `receipt` (the one `emit` mount
 * point) is a *pipeline* fact, not an op fact — hence no row carries `emit`.
 *
 * `fail` mirrors the obligation table's `failSemantics` (`card-boundary` ⇔
 * `card-boundary`, `snapshot-rollback` ⇔ `snapshot-rollback`); `test/sw-op-mirror`
 * asserts the two tables agree, so neither can drift alone.
 *
 * `audit` marks the four ops whose execution writes an audit record (the mutating
 * ones — `op.authorize` / `op.perm.request` / `op.llm-config` / `op.revoke`), which
 * is the SW mirror's fourth field (FR-ALLN-068).
 *
 * `hasConsent` is the V5.5-3 addition (same four mutating rows): it is the second input
 * of {@link tierOf}, kept in sync with `ops.ts#IMPL` by `test/op-three-tier.test.ts`.
 *
 * @module shared/op-table
 */
import type { NextProvider } from '../ui/sidepanel/next-registry/definition.js';

/** Where an op's `execute` runs (FR-ALLN-065: 双层执行器). */
export type OpLayer = 'panel' | 'sw';
/** The pipeline's failure semantics for the row (a re-statement of R5 ② / ③). */
export type OpFail = NextProvider['fail'];
/** The dispatch mode (ADR-V5-001 R4). */
export type OpMode = NextProvider['mode'];

/** One op descriptor row (the SW mirror's field set is this minus `layer`). */
export interface OpDescriptor {
  readonly id: string;
  readonly layer: OpLayer;
  readonly mode: OpMode;
  readonly fail: OpFail;
  readonly audit: boolean;
  /**
   * V5.5-3 **TASK-V55-302** (ADR-V55-008 §1 · FR-SELF-080/086) — the **consent
   * existence** promoted to a descriptor field so the tier partition derives from ONE
   * fact instead of a second hand-written list:
   *
   *   · `tests/op-three-tier` asserts `hasConsent === Boolean(OPS_BY_ID[id].consent)`
   *     row by row (the one consistency edge the promotion adds — it is a
   *     **tightening**, never a relaxation).
   *   · `tierOf` reads ONLY `layer` + `hasConsent`, so「改 `consent`/`layer` ⇒ 清分同步变」
   *     is structurally guaranteed (a paper list could drift; a function cannot).
   */
  readonly hasConsent: boolean;
}

/**
 * The nine rows, compactly: `[id, layer, fail, audit, hasConsent]` in `OP_SPECS` order.
 * `mode` is constant across the batch (see the module note), so the mapper attaches it
 * rather than repeating it in nine tuples. (Comments inside a literal survive bundling
 * and cost bytes; the row-by-row table lives in the module JSDoc above.)
 *
 * `hasConsent` mirrors `ops.ts#IMPL`'s third element (`op.authorize` / `op.llm-config` /
 * `op.perm.request` / `op.revoke` carry one) — the consistency is machine-checked in
 * `test/op-three-tier.test.ts`.
 */
const OP_ROWS: readonly (readonly [string, OpLayer, OpFail, boolean, boolean])[] = Object.freeze([
  ['op.turn', 'panel', 'card-boundary', false, false],
  ['op.pick', 'panel', 'card-boundary', false, false],
  ['op.describe', 'panel', 'card-boundary', false, false],
  ['op.authorize', 'sw', 'snapshot-rollback', true, true],
  ['op.rebind', 'panel', 'card-boundary', false, false],
  ['op.help', 'panel', 'card-boundary', false, false],
  ['op.llm-config', 'panel', 'snapshot-rollback', true, true],
  ['op.perm.request', 'sw', 'snapshot-rollback', true, true],
  ['op.revoke', 'panel', 'snapshot-rollback', true, true],
]);

/** The **one** op table (panel registry and SW mirror both derive from it). */
export const OP_DESCRIPTORS: readonly OpDescriptor[] = Object.freeze(
  OP_ROWS.map(([id, layer, fail, audit, hasConsent]) =>
    Object.freeze({ id, layer, mode: 'waterfall' as OpMode, fail, audit, hasConsent }),
  ),
);

/** The op ids in declaration order (the registry's op vocabulary). */
export const OP_IDS: readonly string[] = Object.freeze(OP_DESCRIPTORS.map((d) => d.id));

/** The **privileged** rows — `layer === 'sw'` (FR-ALLN-066: exactly two). */
export const SW_OP_DESCRIPTORS: readonly OpDescriptor[] = Object.freeze(
  OP_DESCRIPTORS.filter((d) => d.layer === 'sw'),
);

/** Look one row up by id (the layer decision the pipeline makes). */
export function opDescriptor(id: string): OpDescriptor | undefined {
  return OP_DESCRIPTORS.find((d) => d.id === id);
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-3 **TASK-V55-302** (ADR-V55-008 §1 · FR-SELF-080/086) — the **derived** three-tier
 * partition of「AI 可以主动发起哪些 op」.
 *
 *   · `auto`    — AI may press it autonomously (5: op.turn / op.pick / op.describe /
 *                 op.help / op.rebind): no consent card, panel layer ⇒ no irreversible
 *                 write to the authorization / permission / credential tables.
 *   · `confirm` — AI may *offer* it, but the consent card must be answered by the user
 *                 (2: op.llm-config / op.revoke).
 *   · `gesture` — user gesture only; the AI can neither press nor answer it
 *                 (2, **always**: op.authorize / op.perm.request — `layer === 'sw'`).
 *
 * There is deliberately **no hand-written tier table**: `tierOf` is a function of the two
 * existing declarations, so「清分与声明脱钩」(R-SELF-906) is structurally impossible.
 * `OP_TIER_TABLE` is a **materialization** (for source-text extraction by the gate), not a
 * second dataset.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The three tiers (declared exactly once). */
export const OP_TIERS = Object.freeze(['auto', 'confirm', 'gesture'] as const);
export type OpTier = (typeof OP_TIERS)[number];

/**
 * The **only** tier decision: derived from `layer` / `hasConsent`.
 *   · `layer === 'sw'`  ⇒ `gesture` (privileged; the browser-side gesture is not delegable)
 *   · otherwise consent ⇒ `confirm`
 *   · otherwise         ⇒ `auto`
 */
export function tierOf(d: Pick<OpDescriptor, 'layer' | 'hasConsent'>): OpTier {
  if (d.layer === 'sw') return 'gesture';
  return d.hasConsent ? 'confirm' : 'auto';
}

/** The materialized tier table (generated by {@link tierOf} — **not** a second dataset). */
export const OP_TIER_TABLE: Readonly<Record<string, OpTier>> = Object.freeze(
  Object.fromEntries(OP_DESCRIPTORS.map((d) => [d.id, tierOf(d)])),
);

/** The tier of one opId (`undefined` for an op outside the table — the loud case). */
export function tierOfId(id: string): OpTier | undefined {
  const d = opDescriptor(id);
  return d ? tierOf(d) : undefined;
}
