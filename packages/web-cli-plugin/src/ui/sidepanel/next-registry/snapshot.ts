/**
 * V5-2 **TASK-V5-142** (ADR-V5-002 §1 ④ · FR-ALLN-034 ③ / 044 · **R-ALLN-904** ·
 * EC-ALLN-011 · AC-ALLN-004) — the **three-table** snapshot / whole rollback.
 *
 * ── Why a table set instead of three ad-hoc rollbacks ───────────────────────
 *
 * `op.revoke` / `op.llm-config` can touch three independent stores — the
 * **authorization** table (OriginStore + auto-auth), the **permission** table
 * (optional-permission grants) and the **credential** table (the LLM key store). A
 * per-table rollback leaves a **half-finished state**: table A restored, table B not,
 * so a cross-table reference (e.g. an auto-auth record pointing at a credential the
 * user just revoked) dangles. R-ALLN-904 is exactly that failure, and the fix is
 * structural: snapshot **all** tables, and on failure restore **all** of them, in one
 * whole-snapshot pass — `restoreThreeTableSnapshot` never returns early on a table and
 * never skips one.
 *
 * ── Injectable adapters (so the judge is a unit test, not a browser) ────────
 *
 * Each table is a `{name, read, write}` adapter. The production adapters live in
 * `sidepanel.ts` over the existing single entries (auto-auth message / capability
 * reconcile / the ONE credential write), and the node judge drives fakes — the same
 * seam pattern `pipeline.ts#PipelineDeps` uses.
 *
 * @module ui/sidepanel/next-registry/snapshot
 */
import type { OpSnapshot } from './pipeline.js';

/** The three tables (逐字, in snapshot order) — a missing one is a loud failure. */
export const SNAPSHOT_TABLE_NAMES = Object.freeze(['authorization', 'permission', 'credential'] as const);
export type SnapshotTableName = (typeof SNAPSHOT_TABLE_NAMES)[number];

/** One injectable table (read = snapshot, write = restore). */
export interface TableAdapter<Row = unknown> {
  readonly name: SnapshotTableName;
  read(): Promise<readonly Row[]> | readonly Row[];
  write(rows: readonly Row[] | undefined): Promise<void> | void;
}

/** What a whole snapshot must carry: **≥3** tables, each with its verbatim rows. */
export function snapshotProblems(snap: OpSnapshot): string[] {
  const problems: string[] = [];
  const names = snap.tables.map((t) => t.name);
  if (names.length < SNAPSHOT_TABLE_NAMES.length) {
    problems.push(`三表快照必须登记 ${SNAPSHOT_TABLE_NAMES.length} 表（实测 ${names.length}：${names.join(', ')}）`);
  }
  for (const want of SNAPSHOT_TABLE_NAMES) {
    if (!names.includes(want)) problems.push(`三表快照缺表 ${want}（禁止单表接口，R-ALLN-904）`);
  }
  return problems;
}

/** Collect the **whole** snapshot (every table reads once; no table may be skipped). */
export async function collectThreeTableSnapshot(
  adapters: readonly TableAdapter[],
): Promise<OpSnapshot> {
  const tables = await Promise.all(
    adapters.map(async (a) => Object.freeze({ name: a.name as string, rows: Object.freeze([...(await a.read())]) })),
  );
  const snap: OpSnapshot = Object.freeze({ tables: Object.freeze(tables) });
  const problems = snapshotProblems(snap);
  if (problems.length > 0) throw new Error(`snapshot-incomplete:${problems.join(' / ')}`);
  return snap;
}

/**
 * Restore **every** table of the snapshot (整体回滚). The loop never short-circuits on a
 * table (a `for … of` with no `break`/`continue`), which is the structural difference
 * from the single-table rollback the reverse proof injects.
 */
export async function restoreThreeTableSnapshot(
  adapters: readonly TableAdapter[],
  snap: OpSnapshot,
): Promise<void> {
  const problems = snapshotProblems(snap);
  if (problems.length > 0) throw new Error(`rollback-incomplete:${problems.join(' / ')}`);
  for (const name of SNAPSHOT_TABLE_NAMES) {
    const table = snap.tables.find((t) => t.name === name);
    const adapter = adapters.find((a) => a.name === name);
    if (!adapter) throw new Error(`rollback-adapter-missing:${name}`);
    // 逐表回写（**不** `break`、**不** `continue`）：任一张表失败都必须抛错 ⇒ 调用方
    // 看到的是「整体回滚失败」，而不是「部分回滚成功」。
    await adapter.write(table?.rows);
  }
}
