/**
 * V5-1 **TASK-V5-116 / 117** (ADR-V5-001 **R7** · FR-ALLN-036 / 037 · AC-ALLN-004 / 005) —
 * the **证明义务表** (proof-obligation table): one row per op, four elements each
 * (功能名 / 触发 provider / 挂载点·模式 / 失败语义), plus the tail that states the
 * contract obligation itself.
 *
 * ── Why this module is NOT imported by the panel bundle ──────────────────────
 *
 * The table is a **contract artifact**: the thing it must guarantee is「新增 provider
 * 只改注册表条目，`handleCardAction` 分发器 diff = 0」. It is read by the static
 * gate (`test/next-obligation-table.test.ts`) and by `v5-2` when the nine ops are
 * registered — the running panel never needs it. Keeping it out of the bundle graph
 * is therefore both correct and what lets this leaf stay inside its (exhausted)
 * byte budget; the size gates assert the bundle is unaffected.
 *
 * ── 零重复字面量（同一常量对象）───────────────────────────────────────────────
 *
 * {@link OP_SPECS} is the **single** object holding every op's four elements. The
 * rows ({@link OBLIGATION_ROWS}) are *derived* from it by `Object.entries`, so a
 * functional name / provider id / semantics string exists exactly once in the
 * source — and `v5-2`'s op descriptions read the same object instead of restating
 * the copy (ADR-V5-011 §3 减体积优先级 3).
 *
 * `mode` is **not** restated either: it is `MOUNT_MODE[mountPoint]`, the one
 * authoritative table (`next-registry/definition.ts`).
 *
 * @module ui/sidepanel/next-registry/obligation-table
 */
import { BLOCKED_TERMINALS, MOUNT_MODE, type NextMountPoint } from './definition.js';

/** R5 — the failure-semantics levels an op may declare (①/②/③ of FR-ALLN-034). */
export const OBLIGATION_FAIL_SEMANTICS = Object.freeze([
  'card-boundary',
  'register-loud',
  'snapshot-rollback',
] as const);
export type ObligationFailSemantics = (typeof OBLIGATION_FAIL_SEMANTICS)[number];

/** The four elements of one row (plus the landing status used by the gate). */
export interface OpSpec {
  /** ① 功能名（用户面语义；与 op 描述共用本对象，禁止第二份字面量）. */
  readonly functionalName: string;
  /** ② 触发 provider（谁的 chip 会引出这个 op）. */
  readonly providerId: string;
  /** ③ 挂载点（模式由 `MOUNT_MODE` 派生，不在此重复字面量）. */
  readonly mountPoints: readonly NextMountPoint[];
  /** ④ 失败语义（R5 三级之一）. */
  readonly failSemantics: ObligationFailSemantics;
  /**
   * 落地状态。v5-1 交付 6 个可注册 op（`registered`），其余 3 个登记为
   * `pending-v5-2`；**v5-2 TASK-V5-123 已把 9 个 op 全部注册**，故 9 行现均为
   * `registered`（翻转由 `test/next-obligation-table.test.ts` OT-1 双向钉住：
   * 只要「已注册集 ≠ 义务表 registered 集」任一侧漂移即红）。
   */
  readonly status: 'registered' | 'pending-v5-2';
}

/**
 * The **9 ops** (`DC-ALLN-001`: 设计稿 8 + `op.turn`) and their four elements —
 * the single source the obligation rows and (v5-2) the descriptions read.
 *
 * The three blocked-terminal provider ids are **derived** from the one declaration
 * source (`definition.ts#BLOCKED_TERMINALS`): re-writing any of those five strings
 * here would be exactly the「第二处字面量」the single-source scan forbids.
 */
const SITE_UNAUTHORIZED = BLOCKED_TERMINALS[0];
const LLM_UNCONFIGURED = BLOCKED_TERMINALS[1];
const PERM_MISSING = BLOCKED_TERMINALS[2];

export const OP_SPECS: Readonly<Record<string, OpSpec>> = Object.freeze({
  'op.turn': {
    functionalName: '发回合（chips 即指令）',
    providerId: 'ref-action',
    mountPoints: ['next', 'execute', 'receipt'],
    failSemantics: 'card-boundary',
    status: 'registered',
  },
  'op.pick': {
    functionalName: '页面拾取',
    providerId: 'ref.stale',
    mountPoints: ['next', 'execute', 'receipt'],
    failSemantics: 'card-boundary',
    status: 'registered',
  },
  'op.describe': {
    functionalName: '改用描述',
    providerId: 'ref.stale',
    mountPoints: ['next', 'params', 'execute', 'receipt'],
    failSemantics: 'card-boundary',
    status: 'registered',
  },
  'op.authorize': {
    functionalName: '授权当前站点',
    providerId: SITE_UNAUTHORIZED,
    mountPoints: ['next', 'consent', 'execute', 'receipt'],
    failSemantics: 'snapshot-rollback',
    status: 'registered',
  },
  'op.rebind': {
    functionalName: '重新绑定当前标签页',
    providerId: SITE_UNAUTHORIZED,
    mountPoints: ['next', 'execute', 'receipt'],
    failSemantics: 'card-boundary',
    status: 'registered',
  },
  'op.help': {
    functionalName: '看看能做什么',
    providerId: 'onboarding',
    mountPoints: ['next', 'execute', 'receipt'],
    failSemantics: 'card-boundary',
    status: 'registered',
  },
  'op.llm-config': {
    functionalName: '配置 LLM',
    providerId: LLM_UNCONFIGURED,
    mountPoints: ['next', 'params', 'consent', 'execute', 'receipt'],
    failSemantics: 'snapshot-rollback',
    status: 'registered',
  },
  'op.perm.request': {
    functionalName: '申请浏览器权限',
    providerId: PERM_MISSING,
    mountPoints: ['next', 'params', 'consent', 'execute', 'receipt'],
    failSemantics: 'snapshot-rollback',
    status: 'registered',
  },
  'op.revoke': {
    functionalName: '撤销授权 / 权限 / 凭据',
    providerId: SITE_UNAUTHORIZED,
    mountPoints: ['next', 'consent', 'execute', 'receipt'],
    failSemantics: 'snapshot-rollback',
    status: 'registered',
  },
});

/** One derived row: the opId + the four elements + the derived mount modes. */
export interface ObligationRow extends OpSpec {
  readonly opId: string;
  /** `mountPoint → mode`, derived from the one authoritative {@link MOUNT_MODE}. */
  readonly mountModes: Readonly<Record<string, string>>;
}

/** The obligation rows — **derived**, never a second hand-written copy. */
export const OBLIGATION_ROWS: readonly ObligationRow[] = Object.freeze(
  Object.entries(OP_SPECS).map(([opId, spec]) =>
    Object.freeze({
      opId,
      ...spec,
      mountModes: Object.freeze(
        Object.fromEntries(spec.mountPoints.map((mp) => [mp, MOUNT_MODE[mp]])),
      ),
    }),
  ),
);

/** The op ids the obligation table declares (the registry's op vocabulary). */
export const OBLIGATION_OP_IDS: readonly string[] = Object.freeze(OBLIGATION_ROWS.map((r) => r.opId));

/**
 * 表尾**明示契约义务**（FR-ALLN-036 / N22）—— the sentence the whole leaf exists to
 * make true, kept where the table itself cannot be read without seeing it.
 */
export const OBLIGATION_TAIL =
  '契约义务：新增 provider / op 只改注册表条目（OP_SPECS + registry.ts），handleCardAction 分发器 diff = 0。';

/**
 * The coverage hook (`FR-ALLN-037`): any op that enters the registry must have a row
 * — an unmapped op is `unknown` and must be refused, never silently accepted.
 * `v5-2` calls this at registration time; the static gate calls it on `OPS_BY_ID`.
 */
export function unmappedOpIds(opIds: readonly string[]): string[] {
  return opIds.filter((id) => !(id in OP_SPECS));
}

/** Throwing form of {@link unmappedOpIds} — the loud half of the hook. */
export function assertObligationCoverage(opIds: readonly string[]): void {
  const unmapped = unmappedOpIds(opIds);
  if (unmapped.length > 0) throw new Error(`obligation-rows-missing:${unmapped.join(',')}`);
}
