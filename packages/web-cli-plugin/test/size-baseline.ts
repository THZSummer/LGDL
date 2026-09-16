/**
 * V2-2 — side-panel bundle size snapshot + regression-guard logic (NFR-V2-001 /
 * NFR-V2-002, ADR-V2-007).
 *
 * ── Baseline ≠ target budget; do NOT conflate them ──────────────────────────
 *
 * The side panel has **no byte target** (there is no NFR goal for it). What this
 * file records is a *regression baseline*: a measured value used to FAIL when a
 * change grows `dist/sidepanel.js` beyond `baseline × (1 + tolerance)`. The meta
 * block pins `targetBudgetBytes: null` / `targetMet: null` so the guard can never
 * drift into the v1 content-bundle「目标达成」narrative (D31 stays where it is).
 *
 * `dist/content.js` is different: its ceiling is a hard **no-growth** limit
 * (`CONTENT_MAX_BYTES`, no tolerance) pinned to the **latest re-measured value**,
 * so V2 can never silently fatten the injected bundle (NFR-V2-002 red line).
 *
 * Measurement discipline: re-measure after `npm run build` and update
 * `SIDEPANEL_BASELINE_BYTES` / `SIDEPANEL_CEILING` / `SIDEPANEL_BASELINE_META`
 * explicitly (date + source + build command). Never widen the tolerance or delete
 * an assertion to make a gate green.
 *
 * ── Guard-tighten round (2026-09-14): lock in the SDK-lazification result ─────
 *
 * Commit `0df2273` (base `src/llm.ts` static → lazy dynamic `import()`) shrank the
 * artifacts sharply, but the guards still carried the *pre-fix* ceilings
 * (`CONTENT_MAX_BYTES = 1,073,453`; side-panel ceiling `1,217,848`) — so
 * `content.js` could silently regrow to ~1 MiB without tripping anything. This
 * round **re-registers both at the measured post-fix values** (direction: strictly
 * tighter, never wider):
 *   - `CONTENT_MAX_BYTES` ....... 1,073,453 → **177,076** (no tolerance; one byte fails)
 *   - `SIDEPANEL_BASELINE_BYTES`  1,159,856 → **266,500** (ceiling 279,825 = ×1.05)
 * Every superseded value stays in `SIDEPANEL_BASELINE_BYTES_HISTORY` and the
 * reverse proofs were re-driven so they still FAIL at the new values.
 */
// Re-export the v1 reader unchanged (it swallows ONLY `ENOENT`; every other stat
// failure propagates — see `test/perf-budget.test.ts` for the reverse proof).
export { readArtifactSize, type StatLike } from './perf-baseline.js';

/**
 * Regression baseline for `dist/sidepanel.js`.
 *
 * ── Re-registration history (never silently widen; keep every value on record) ──
 *   - v1 measured value .......... 1,068,165 B
 *   - V2-2 (2026-09-13) .......... 1,085,389 B (+20,000 B: floating-tree UI, TASK-008)
 *   - V2-3 (2026-09-13) .......... 1,110,744 B (revoke/undo surface, `f45c124`)
 *   - V2-4 (2026-09-13) .......... 1,132,748 B (read-only command archive surface)
 *   - V2 R2 (2026-09-13) ......... 1,159,856 B (real nested tree UI + per-level
 *     allow/ask/deny policy controls + archive layering; R2 closeout re-measure
 *     recorded 1,162,942 B)
 *   - **current (2026-09-14)** ... 266,500 B (tightened after base LLM SDK
 *     lazification, commit `0df2273`; direction = down, see below)
 *
 * W4 fix round (2026-09-13): the V2-2 baseline (1,085,389 B) was NOT re-registered
 * after V2-3 added the revoke/confirm/receipt surface, so the guard's effective
 * headroom (~29 KB) was larger than the declared 5%. This is an explicit
 * re-registration at the **re-measured** value (not a silent widen): the previous
 * values stay recorded above and the reason for the increase is the intentional
 * V2-3 weight. The tolerance (5%) is unchanged and no assertion was removed.
 *
 * V2-4 re-registration (2026-09-13): `src/insight/archive-catalog.ts` (new) +
 * `tree-drawer.ts` archive sub-view grew the side panel by 22,004 B.
 *
 * R2 re-registration (2026-09-13, R2-V22-05): the real nested tree renderer
 * (`tree-view.ts` nested model + `tree-drawer.ts` role=tree/keyboard/breadcrumb/
 * layered controls) + archive layering grew the side panel by 27,108 B over
 * 1,132,748 B. Re-measured after `npm run build --workspace @lgdl/web-cli-plugin`
 * (stat: 1,159,856 B). Previous values retained in the history array; tolerance
 * unchanged (5%); `targetBudgetBytes` / `targetMet` remain null.
 *
 * Guard-tighten re-registration (2026-09-14, R3-perf follow-up): after commit
 * `0df2273` (base LLM SDK lazification) the side panel measured **266,500 B**, so
 * the pre-fix baseline 1,159,856 B (ceiling 1,217,848 B) was left holding ~950 KB
 * of silent headroom. This is an explicit **tightening** re-registration at the
 * re-measured value — source command
 * `npm run build --workspace @lgdl/web-cli-plugin` then `stat -c %s dist/sidepanel.js`.
 * Direction = **down** (previous recorded value 1,159,856 B; the R2 closeout
 * measurement 1,162,942 B is also retained on record). Tolerance still 5%; no
 * assertion removed.
 */
/**
 * ── v3-1 re-registration (2026-09-16, ADR-V3-011 / EC-V3-013) ────────────────
 *
 * The v3-1 L0 skeleton (`l0/{shell,decision-card,status-bar,risk-rail}.ts` +
 * `disclosure.ts` + the L0 view model) is an **intentional** weight increase: it
 * is the disclosure restructuring the whole v3 Feature is built on. Re-measured
 * after `npm run build --workspace @lgdl/web-cli-plugin`:
 *
 *   - `dist/content.js` ..... 177,076 B (UNCHANGED — v3-1 does not touch
 *     `src/content/**`; the hard, tolerance-free ceiling still holds byte-for-byte)
 *   - `dist/sidepanel.js` ... 266,500 → 291,523 B (+25,023 B, +9.4%)
 *     ceiling 279,825 → 306,099 B = floor(291,523 × 1.05)
 *
 * ── v3-1 review fix round re-registration (2026-09-16, review I6) ────────────
 *
 * The 291,523 B entry above was published as the re-registration **value** while
 * the FINAL artifact of that round measured **294,874 B** (+3,351 B, produced by
 * the three gate-discovered regressions fixed *after* the re-registration) — so
 * the registry (and its `note`) did not describe the shipped artifact.
 *
 * The fix round re-registers the **real artifact** and, at the same time, forbids
 * the ceiling from being raised by that bookkeeping (the old ceiling already
 * covers the artifact):
 *
 *   - `SIDEPANEL_BASELINE_BYTES` ... 291,523 → **295,225 B** (measured on the fix
 *     round's final build: L0 review fixes I1/I3/I5, +351 B over 294,874 B)
 *   - `SIDEPANEL_CEILING` ......... **306,099 B, UNCHANGED**: the ceiling is now
 *     `min(floor(baseline × 1.05), SIDEPANEL_CEILING_CAP)` and the cap is the
 *     previously registered ceiling, i.e. the ceiling may only ever go DOWN. The
 *     value the formula alone would produce (309,986 B) is therefore *not* taken —
 *     `floor(295,225 × 1.05) = 309,986 > 306,099` would have widened the guard by
 *     3,887 B purely for a registry-fidelity fix.
 *   - tolerance ................... **5% unchanged**; the effective headroom is
 *     now 3.68% (stricter, never wider);
 *   - `targetBudgetBytes` / `targetMet` stay **null**; the size assertions were not
 *     deleted — the ones that encoded「baseline > previous ceiling」were re-pinned
 *     to the direction-sensitive「ceiling ≤ previous ceiling」claim (registered in
 *     `docs/v3-supersession-ledger.json`, entry `V31-S10`).
 */
/**
 * ── v3-2 re-registration (2026-09-16, ADR-V3-011 / EC-V3-013, leaf
 *    specs-tree-v3-2-l1-disclosure-refs) ──────────────────────────────────────
 *
 * The v3-2 L1 layer (eight in-place content classes + the fail-closed reference
 * judge + the receipt triple + the local-tree slice) is an **intentional** weight
 * increase. Re-measured after `npm run build --workspace @lgdl/web-cli-plugin`:
 *
 *   - `dist/content.js` ..... 177,076 B (UNCHANGED — v3-2 does not touch
 *     `src/content/**`; the hard, tolerance-free ceiling still holds byte-for-byte)
 *   - `dist/sidepanel.js` ... 295,225 → **327,679 B** (+32,454 B, +11.0%)
 *
 * Direction = **raised** (deliberate feature weight), the ceiling is **HELD**:
 *
 *   - the previous value 295,225 B is retained in
 *     `SIDEPANEL_BASELINE_META.previousBaselineBytes` + `reRegisteredFrom` and in
 *     `SIDEPANEL_BASELINE_BYTES_TIMELINE` / `docs/v3-density-baseline.json#volume`;
 *   - the tolerance stays **5%** (`SIDEPANEL_BASELINE_TOLERANCE` untouched);
 *   - `targetBudgetBytes` / `targetMet` stay **null** (still a regression
 *     baseline, never a target — ADR-V2-007's narrative stays banned);
 *   - the size assertions were **not** deleted — the direction-sensitive ones are
 *     re-pinned (registered in `docs/v3-supersession-ledger.json`, entries
 *     `V32-S1`…`V32-S4`);
 *   - the one-byte reverse proof is re-driven at the (unchanged) ceiling.
 *
 * ── ⚠️ 本轮的**红线冲突**（必须显式上报，不得静默放宽）─────────────────────────
 *
 * `SIDEPANEL_CEILING_CAP = 306,099 B` 是**只降不升**的冻结上限（v3-1 I6 轮设立，
 * v3-2 编排器红线 ⑧ 明文禁止抬高）。同文件底部 `SIDEPANEL_CEILING` 因此仍等于
 * 306,099 B，而本轮产物实测 **327,679 B** → 产物**超出被冻结的 ceiling 21,580 B**，
 * 且：
 *
 *   - `test/size-budget.test.ts`「实测 ≤ cap」断言；
 *   - `test/ui/density.mjs` 阶段 F「产物 ≤ 机读上限」断言
 *
 * 会**如实 FAIL**。本叶**未**抬高 cap、**未**放宽容差、**未**删除任何断言、**未**
 * 把代码搬到 `sidepanel.js` 之外以绕开门禁 —— 按红线「若某目标只能靠放宽达成 → 停下
 * 如实上报」处理：需要编排器裁决（抬高 cap 至 ≥327,679 B，或削减本叶范围）。
 */
/**
 * ── v3-2 修复轮（2026-09-16，**编排器裁决 V3-VOL-1**）────────────────────────
 *
 * 裁决（原文要点）：① **批准** `sidepanel.js` 基线显式重登记至实测 **327,679 B**；
 * ② **撤销** v3-1 修复轮自加的 `SIDEPANEL_CEILING_CAP` 硬上限机制 —— 该 cap **不是
 * spec/作者要求**，是为证明「ceiling 只降不升」而自缚的装置，现已挡住合法功能：
 * 「移除它（或改为纯记录字段、不再参与判定）」；③ 以 4 条替代守卫取代之（见下）。
 * ④ 不变项：`content.js` 177,076 B 无容差、密度阈值逐字不变。
 *
 * 本文件据此落地：
 *
 *   ① **公式守卫（唯一判定）**：`SIDEPANEL_CEILING = floor(baseline × 1.05)`，
 *      容差 **5% 不变**。`SIDEPANEL_CEILING_CAP` 降级为**纯记录字段**
 *      （`SIDEPANEL_CEILING_CAP_RECORD`，值仍 306,099 B，附 `…_ROLE = 'record-only'`），
 *      **不参与任何判定**；`evaluateSidepanelSize()` 也不再接受 cap 形参。
 *   ② **重登记披露登记册**：`SIDEPANEL_RE_REGISTRATIONS` 逐轮记录「前后值 + 日期 +
 *      来源 + buildCommand + measuredBy + 理由 + 断言零删减台账条目 + 历史逐字保留值」，
 *      并由 `test/size-budget.test.ts` 断言字段齐备 / 链条首尾相接 / 历史值逐字保留。
 *   ③ **增长正当性证据**：`SIDEPANEL_GROWTH_BREAKDOWN`（esbuild metafile
 *      `bytesInOutput`，v3-1 树 vs v3-2 树，同一 absWorkingDir 几何）逐模块分解
 *      **+32,454 B**：新必需模块 26,156 B / 接线 5,848 B / 归因位移 220 B /
 *      未归因运行时胶水 230 B；`test/size-growth-evidence.test.ts` 用真实 metafile 复核。
 *   ④ **方向性守卫**：`evaluateConsecutiveReRegistrationGrowth()` —— 同一 Feature 内
 *      **连续两轮**重登记累计增幅 > **15%** 时产出**可读告警**（`warning !== null`），
 *      告警文本要求「显式回报编排器」。该告警由 `test/size-budget.test.ts` 断言
 *      **必须存在**（可读、可复现、可 FAIL），不靠人读日志。
 *
 * `content.js` 177,076 B（无容差、不可重登记）与密度阈值在本轮**零改动**。
 */
/**
 * ── v3-2 收口轮（2026-09-16，**validate R1 之后的收口轮**）─────────────────────
 *
 * 收口轮处置 validate R1 的 N-04/N-05/N-07/N-08（引用重拾不再自证、`reset()` 真清空
 * env、D4 原因写明哪一项变化、退役原因冻结）—— 四处都在 `src/ui/sidepanel/**`，因此
 * 产物**显式增重** +797 B：
 *
 *   - `dist/content.js` ..... 177,076 B（**UNCHANGED** —— 收口轮不碰 `src/content/**`，
 *     无容差硬上限逐字节保持）
 *   - `dist/sidepanel.js` ... 327,679 → **328,476 B**（+797 B，+0.24%）
 *
 * 方向 = **提升**（同一叶内的更正轮：`roundKind: 'registry-fidelity-round'`，故 ④ 的
 * 「连续两个**功能轮**」告警口径不变）。重登记按裁决 V3-VOL-1 ② 的披露要求逐项登记：
 *
 *   - 前值 327,679 B 保留在 `SIDEPANEL_RE_REGISTRATIONS` 链条 /
 *     `SIDEPANEL_BASELINE_BYTES_TIMELINE` / `reRegisteredFrom`；
 *   - 容差 **5% 不变**；`targetBudgetBytes` / `targetMet` 仍为 **null**；
 *   - ceiling 仍由**公式**给出：`floor(328,476 × 1.05)` = **344,899 B**（cap 保持
 *     `record-only`，不参与判定）；
 *   - 断言零删减：方向敏感断言按新实测值重新 pin，并登记台账条目 `V32-S17`。
 *
 * `previousBaselineBytes` **有意保留 295,225 B**：它是 {@link SIDEPANEL_GROWTH_BREAKDOWN}
 * 所比较的那棵树（v3-1 I6 轮的树）的基线，`deltaBytes` 因此仍是「v3-1 树 → 当前树」的
 * **累计**增量 33,251 B；**逐轮**前后值由 `SIDEPANEL_RE_REGISTRATIONS` 承载体（末项
 * `v3-2-closeout`：327,679 → 328,476）。两者分工明确、不得混用。
 */
export const SIDEPANEL_BASELINE_BYTES = 349_880;

/** Previous registered baselines (v1 / V2-2 / V2-3 / V2-4 / V2 R2) — kept on record. */
export const SIDEPANEL_BASELINE_BYTES_HISTORY = [
  1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942,
] as const;

/**
 * The **chronological** registry of every value this file has ever published
 * (2026-09-16, I6). `SIDEPANEL_BASELINE_BYTES_HISTORY` keeps the monotonically
 * non-decreasing v1→V2-R2 chain; the post-lazification values are *smaller*, so
 * appending them there would break its monotonicity assertion. This timeline is
 * the "keep every previous value" record the re-registration discipline demands —
 * appending is the only allowed edit (history may never be rewritten).
 */
export const SIDEPANEL_BASELINE_BYTES_TIMELINE = [
  1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942, 266_500, 291_523, 295_225, 327_679, 328_476,
  349_880,
] as const;

/** Allowed growth over the baseline before the guard fails. */
export const SIDEPANEL_BASELINE_TOLERANCE = 0.05;

/**
 * 纯记录字段（v3-2 修复轮，编排器裁决 **V3-VOL-1 ②**）—— **不再参与任何判定**。
 *
 * v3-1 的 I6 轮曾把这个值（306,099 B = 当时的 ceiling）当成「只降不升」的硬上限
 * （`min(floor(baseline × 1.05), cap)`）。该机制**未经 spec/作者要求**，是修复轮自加的
 * 自缚装置：它让「按真实产物重登记」这件事无法在不「放宽守卫」的前提下完成，最终挡住
 * 了 v3-2 里 spec 明文的 L1 功能。裁决据此**撤销其判定作用**，仅保留历史值以备审计。
 *
 * ⚠️ `SIDEPANEL_CEILING` / `evaluateSidepanelSize()` **不得**再读取本值；任何把 cap 重新
 * 接回判定的改动都是对本裁决的违反。角色由 `SIDEPANEL_CEILING_CAP_ROLE` 显式声明，
 * 并由 `test/size-budget.test.ts` 断言（`record-only` + 判定不含 cap）。
 */
export const SIDEPANEL_CEILING_CAP_RECORD = 306_099;

/** `'record-only'` —— cap 的历史值只作记录，**不参与判定**（裁决 V3-VOL-1 ②）。 */
export const SIDEPANEL_CEILING_CAP_ROLE = 'record-only' as const;

/**
 * 兼容别名（值同 `SIDEPANEL_CEILING_CAP_RECORD`）。**纯记录**，不得用于判定 ——
 * 保留旧名字只为让「cap 已撤销」这件事在 diff 里可见（旧名若被重新用于守护，
 * 门禁会因 `SIDEPANEL_CEILING_CAP_ROLE !== 'record-only'` 之外的断言而暴露）。
 */
export const SIDEPANEL_CEILING_CAP = SIDEPANEL_CEILING_CAP_RECORD;

/**
 * 判定公式（裁决 V3-VOL-1 ①）：`floor(baseline × (1 + tolerance))`。
 * 容差 5% 不变；**没有任何 cap 参与**（这正是撤销 cap 的落地处）。
 */
export const SIDEPANEL_CEILING = Math.floor(
  SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE),
);

/**
 * 「不加 cap 时公式会给出的值」。撤销 cap 之后它与 `SIDEPANEL_CEILING` **必须相等** ——
 * 该等式本身就是「判定里没有隐藏上限」的机器证据（`test/size-budget.test.ts` 断言）。
 */
export const SIDEPANEL_CEILING_UNCAPPED = Math.floor(
  SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE),
);

/**
 * The bytes `dist/sidepanel.js` actually has (I6: 登记值 == 实测产物). Asserted
 * equal to the measured artifact by `test/size-budget.test.ts`, and compared at
 * runtime against the density registry by `test/ui/density.mjs` stage F.
 */
export const SIDEPANEL_FINAL_ARTIFACT_BYTES = 349_880;

/**
 * Machine-readable provenance. `targetBudgetBytes` / `targetMet` are **null on
 * purpose**: this is a regression baseline, not a target. Asserting them null is
 * how the suite forbids「目标达成」wording here (ADR-V2-007).
 */
export const SIDEPANEL_BASELINE_META = {
  kind: 'regression-baseline-only',
  measuredOn: '2026-09-16',
  source: 'packages/web-cli-plugin/dist/sidepanel.js',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  measuredBy:
    'SDDU v3-3 build round (2026-09-16, leaf specs-tree-v3-3-l2-on-demand-views): re-measured on the final artifact of the L2 on-demand views (view replacement + the four views +真值计数 + the tree-ownership migration). Previous rounds: SDDU v3-2 build round + fix round + closeout round (2026-09-16, leaf specs-tree-v3-2-l1-disclosure-refs): re-measured on the final artifact of the L1 layer (eight in-place content classes + the fail-closed five-dimension reference judge + the receipt triple + the local-tree slice). The fix round executed orchestrator ruling V3-VOL-1 (baseline explicitly re-registered at 327,679 B, ceiling = the plain formula, self-imposed SIDEPANEL_CEILING_CAP hard cap REVOKED and demoted to a record-only field). The CLOSEOUT round dispositions validate R1 findings N-04/N-05/N-07/N-08 in `src/ui/sidepanel/**` and re-registers the measured 328,476 B (+797 B) as a registry-fidelity round. Previous registered baselines: 327,679 B (v3-2 fix round) / 295,225 B (v3-1 I6 round; also the reference tree of SIDEPANEL_GROWTH_BREAKDOWN) / 291,523 B (whose final artifact measured 294,874 B — the discrepancy the I6 round fixed) / 266,500 B (tighten round 2026-09-14, ceiling 279,825 B) / 1,159,856 B (R2, ceiling 1,217,848 B) / R2 closeout 1,162,942 B / V2-4 1,132,748 B / V2-3 1,110,744 B / V2-2 1,085,389 B / v1 1,068,165 B. Every previous value is retained in SIDEPANEL_BASELINE_BYTES_HISTORY / SIDEPANEL_BASELINE_BYTES_TIMELINE / SIDEPANEL_RE_REGISTRATIONS.',
  /**
   * ⚠️ 语义（收口轮明写）：本字段 = {@link SIDEPANEL_GROWTH_BREAKDOWN} 所比较的**参照树**
   * 的基线（v3-1 I6 轮 295,225 B），因此 `deltaBytes` 是「v3-1 树 → 当前树」的**累计**
   * 增量。**逐轮**前后值（含 327,679 → 328,476）在 `SIDEPANEL_RE_REGISTRATIONS`。
   */
  previousBaselineBytes: 295_225,
  previousCeilingBytes: 344_899,
  direction: 'raised',
  ceilingDirection: 'raised-formula',
  finalArtifactBytes: 349_880,
  /** 裁决 V3-VOL-1 ②：cap 已撤销，仅作记录（判定路径不含它）。 */
  ceilingFormula: 'floor(baseline × (1 + tolerance))',
  ceilingCapRole: 'record-only',
  ceilingCapRecordBytes: 306_099,
  /** 裁决 V3-VOL-1 ④：同 Feature 连续两轮累计增幅 > 15% 时的可读告警（非 null 即须回报编排器）。 */
  consecutiveGrowthAlertThreshold: 0.15,
  consecutiveGrowthAlert: '已触发：见 SIDEPANEL_RE_REGISTRATIONS 与 evaluateConsecutiveReRegistrationGrowth()（v3-2 + v3-3 两个功能轮累计 +18.51% > 15%，已显式回报编排器；从 266,500 B 起算的 Feature 累计 +31.29% 亦已在 v3-3 回报中显式列出）',
  reRegisteredFrom:
    'v3-2 收口轮 328,476 B（ceiling 344,899 B，公式判定）；更早 v3-2 修复轮 327,679 B（ceiling 344,062 B）、v3-1 I6 轮 295,225 B（ceiling 306,099 B，cap 只降不升）与 291,523 B（该轮最终产物实测 294,874 B）、266,500 B（ceiling 279,825 B，2026-09-14 收紧轮）、1,159,856 B（ceiling 1,217,848 B）与 R2 收口实测 1,162,942 B',
  targetBudgetBytes: null,
  targetMet: null,
  reason:
    'sidepanel.js 无字节目标；本值为「不得回退」回归基线（基线 ≠ 目标预算）。2026-09-16 **v3-3 显式提升重登记：328,476 → 349,880 B（+21,404 B，+6.52%）**，' +
    '全部来自 spec 明文要求的 L2 按需视图（父 FR-V3-045~054 / AC-V3-026）：新增 5 个必需模块（l2/counts.ts 2,932 / l2/view-host.ts 3,206 / ' +
    'l2/command-catalog.ts 6,106 / l2/audit.ts 4,145 / settings/sections.ts 226 = 16,615 B）+ 接线（sidepanel.ts / view-model.ts / l0/status-bar.ts / ' +
    'l0/shell.ts）+ 归因位移；ceiling 由公式抬高 floor(349,880 × 1.05) = **367,374 B**，容差 5% 未动、cap 仍为 record-only、' +
    'targetBudgetBytes/targetMet 仍为 null；从 266,500 B 起算的 Feature 累计 **+31.29%**（>30%）已在 v3-3 回报中显式列出。' +
    '更早轮次：2026-09-16 v3-2 显式**提升**重登记：L1 八类就地展开 + 引用失效 fail-closed 判定 + 回执三件套 + 局部树为 spec 明文要求的**必需增重**（父 spec FR-V3-030~040 / AC-V3-008~010 / AC-V3-022/023），实测 327,679 B（前值 295,225 B，+32,454 B）。修复轮按裁决 V3-VOL-1 ② 撤销自加 cap（该 cap 非 spec/作者要求），判定恢复为公式值。**收口轮**再 +797 B 至 **328,476 B**（前值 327,679 B）：四处改动都在 `src/ui/sidepanel/**`，逐条对应 validate R1 的 N-04（`repick()` 不再自证 `resolved`，观测由调用方传入）/ N-05（`setEnv({}, replace=true)` 真清空 env）/ N-07（D4 原因写明 hash 或 version 哪一项变化）/ N-08（退役记录冻结退役时的可读原因），无冗余或重复代码；ceiling 仍由公式给出 floor(328,476 × 1.05) = **344,899 B** —— 由公式抬高，而不是靠「放宽容差」或「删断言」达成；容差 5% 未动。累计增量构成见 §SIDEPANEL_GROWTH_BREAKDOWN（v3-1 树 → 当前树：新必需模块 26,913 B / 接线 5,888 B / 归因位移 220 B / 未归因胶水 230 B = +33,251 B）。历史值 1,068,165 / 1,085,389 / 1,110,744 / 1,132,748 / 1,159,856 / 1,162,942 / 266,500 / 291,523 / 295,225 / 327,679 全保留；断言零删减（方向敏感断言按新实测值重新 pin，见 docs/v3-supersession-ledger.json 的 V32-S1~S6 / V32-S17 / V32-MR-FIX）；targetBudgetBytes/targetMet 保持 null；+1 B 反证在**当前 ceiling** 上重跑。',
  note: '（保留字段名与历史断言连续性；本轮语义已由 reason 承载）sidepanel.js 回归基线**提升**重登记至 349,880 B（前值 328,476 B；更早 327,679 / 295,225 / 291,523（产物实测 294,874）/ 266,500）。v3-2 修复轮已按裁决 V3-VOL-1 ② 撤销自加 cap（cap 降级为 record-only，判定只走公式）。v3-3 提升后 ceiling = floor(baseline × 1.05) = 367,374 B（cap 仍不参与判定）。历史值全保留，容差 5% 不变，断言零删减。',
} as const;

/**
 * ── 替代守卫 ②（裁决 V3-VOL-1 ③②）：**重登记披露登记册** ────────────────────────
 *
 * 每一次重登记都必须**显式登记**：前后值 + 日期 + 来源 + `buildCommand` +
 * `measuredBy` + **理由** + 「断言零删减」的台账条目 + 本轮逐字保留的历史值。
 * 这不是文档，而是判定数据：`test/size-budget.test.ts` 逐条断言字段齐备、链条
 * 首尾相接（上一轮的 after == 下一轮的 before）、历史值必须仍在
 * `_HISTORY` / `_TIMELINE` 中逐字存在。
 *
 * `roundKind` 区分**功能轮**（一个叶交付）与**登记保真轮**（同一叶内的更正）：
 * 替代守卫 ④ 的方向性告警只按**功能轮**计「连续两轮」。
 */
export interface SizeReRegistration {
  /** 轮次标识（feature-round 形如 `v3-1`，登记保真轮形如 `v3-1-i6`）。 */
  readonly id: string;
  readonly roundKind: 'feature-round' | 'registry-fidelity-round';
  readonly feature: string;
  readonly date: string;
  readonly source: string;
  readonly buildCommand: string;
  readonly measuredBy: string;
  /** 理由（必填、非空；须写明为何必须增重）。 */
  readonly reason: string;
  readonly baselineBeforeBytes: number;
  readonly baselineAfterBytes: number;
  readonly ceilingBeforeBytes: number;
  readonly ceilingAfterBytes: number;
  /** 「断言零删减」的台账条目 id（`docs/v3-supersession-ledger.json`）。 */
  readonly assertionNonRemovalEntries: readonly string[];
  /** 本轮**逐字保留**的历史值（必须仍在 HISTORY / TIMELINE 中）。 */
  readonly historyRetainedBytes: readonly number[];
  /** 重登记时的实际候选 ceiling（撤销 cap 前 = cap 生效值；撤销后 = 公式值）。 */
  readonly ceilingUncappedFormulaBytes: number;
}

export const SIDEPANEL_RE_REGISTRATIONS: readonly SizeReRegistration[] = [
  {
    id: 'v3-1',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-1 build round (leaf specs-tree-v3-1-l0-shell-density)',
    reason: 'L0 常驻骨架 + 单一折叠控制器 + L0 视图模型为 v3 披露改造的有意增重。',
    baselineBeforeBytes: 266_500,
    baselineAfterBytes: 291_523,
    ceilingBeforeBytes: 279_825,
    ceilingAfterBytes: 306_099,
    assertionNonRemovalEntries: ['V31-S6', 'V31-S7'],
    historyRetainedBytes: [
      1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942, 266_500,
    ],
    ceilingUncappedFormulaBytes: 306_099,
  },
  {
    id: 'v3-1-i6',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-1 review fix round (I6, registry fidelity)',
    reason:
      '登记保真更正：上一轮发表的 291,523 B 与该轮最终产物 294,874 B 不符（I6），按真实产物 295,225 B 重登记；当时 cap 生效故 ceiling 未动。',
    baselineBeforeBytes: 291_523,
    baselineAfterBytes: 295_225,
    ceilingBeforeBytes: 306_099,
    ceilingAfterBytes: 306_099,
    assertionNonRemovalEntries: ['V31-S10', 'V31-S11', 'V31-S12'],
    historyRetainedBytes: [291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 309_986,
  },
  {
    id: 'v3-2',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy:
      'SDDU v3-2 build round + fix round (leaf specs-tree-v3-2-l1-disclosure-refs, 编排器裁决 V3-VOL-1)',
    reason:
      'L1 八类就地展开 + 引用失效 fail-closed 五维判定 + 回执三件套 + 局部树为父 spec FR-V3-030~040 明文必需；修复轮按裁决 V3-VOL-1 撤销自加 cap，ceiling 恢复为公式值 floor(baseline × 1.05)。',
    baselineBeforeBytes: 295_225,
    baselineAfterBytes: 327_679,
    ceilingBeforeBytes: 306_099,
    ceilingAfterBytes: 344_062,
    assertionNonRemovalEntries: [
      'V32-S1',
      'V32-S2',
      'V32-S3',
      'V32-S4',
      'V32-S5',
      'V32-S6',
    ],
    historyRetainedBytes: [295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 344_062,
  },
  {
    id: 'v3-2-closeout',
    roundKind: 'registry-fidelity-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-2 closeout round (leaf specs-tree-v3-2-l1-disclosure-refs, after validate R1)',
    reason:
      'validate R1 的 N-04/N-05/N-07/N-08 处置全部落在 `src/ui/sidepanel/**`（重拾观测化 / env 真清空 / D4 原因指项 / 退役原因冻结），产物按实测 328,476 B 显式重登记（+797 B，+0.24%）。同一叶内的更正轮 → registry-fidelity-round（④ 的「连续两个功能轮」口径不变）。',
    baselineBeforeBytes: 327_679,
    baselineAfterBytes: 328_476,
    ceilingBeforeBytes: 344_062,
    ceilingAfterBytes: 344_899,
    assertionNonRemovalEntries: ['V32-S17'],
    historyRetainedBytes: [327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 344_899,
  },
  {
    id: 'v3-3',
    roundKind: 'feature-round',
    feature: 'specs-tree-web-cli-plugin-v3-ui',
    date: '2026-09-16',
    source: 'packages/web-cli-plugin/dist/sidepanel.js',
    buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
    measuredBy: 'SDDU v3-3 build round (leaf specs-tree-v3-3-l2-on-demand-views)',
    reason:
      'L2 按需视图为父 spec FR-V3-045~054 / AC-V3-026 明文必需：四视图默认零占用 + 「计数 + 入口」（真值派生）+ 视图替换与 ← 返回（返回后展开态与密度复原）+ ' +
      'L2 期间风险位常驻可见 + 命令目录分列/零控件 + 审计零明文 + 树归属迁移（role=dialog→region）+ 能力集等价 8 项。' +
      '新增 5 个必需模块（counts / view-host / command-catalog / audit / settings-sections = 16,615 B）与接线（sidepanel.ts +4,501 / status-bar +267）；' +
      '`l0/shell.ts` 与 `view-model.ts` 因骨架期临时逻辑被真实实现取代而**净减** 213 B。ceiling 由公式抬高 floor(349,880 × 1.05) = 367,374 B；' +
      '容差 5% 未动、cap 仍为 record-only、targetBudgetBytes/targetMet 仍为 null。',
    baselineBeforeBytes: 328_476,
    baselineAfterBytes: 349_880,
    ceilingBeforeBytes: 344_899,
    ceilingAfterBytes: 367_374,
    assertionNonRemovalEntries: ['V33-S1', 'V33-S5', 'V33-S7', 'V33-S9', 'V33-MR-01', 'V33-MR-06'],
    historyRetainedBytes: [328_476, 327_679, 295_225, 291_523, 266_500, 1_162_942, 1_159_856],
    ceilingUncappedFormulaBytes: 367_374,
  },
] as const;

/**
 * ── 替代守卫 ③（裁决 V3-VOL-1 ③）：**增长正当性证据** ─────────────────────────
 *
 * `+32,454 B` 不是一句「有意增重」，而是**逐模块可分解**的：用 esbuild metafile 的
 * `bytesInOutput`，在几何完全相同的两棵树里分别构建（v3-1 树 = `cf2af32` 的
 * `packages/web-cli-plugin/src`；v3-2 树 = `615bd0f` 的同路径），得到每个输入模块的
 * 字节贡献与其差值。两棵树的 `absWorkingDir` 深度/相对路径完全一致，因此
 * 「模块注释路径长度」这一构建噪声在两边相同 —— 实测两棵树 `dist/content.js`
 * 同为 177,440 B（等于允许的路径噪声常量），`sidepanel.js` 差值 = **32,454 B**，
 * 与登记基线之差逐字节相等（复现见 `test/size-attribution.mjs` / `npm run size:attribution`）。
 *
 * 结论：增量由 **spec 必需的 L1 模块（26,156 B，80.6%）** 与**接线（5,848 B，18.0%）**
 * 构成，另有 220 B 的**归因位移**（源码未改，仅因新引用者导致 esbuild 分摊变化）与
 * 230 B 的未归因运行时胶水；**没有任何重复/冗余代码**（47 个输入模块路径互不相同，
 * 共享的 v2 模块 `tree-receipt.ts` 增量 = 0 —— 复用而非复制）。
 */
export interface GrowthAttributionRow {
  readonly module: string;
  /** v3-1 树的字节贡献（`null` = v3-1 树不存在该模块）。 */
  readonly beforeBytes: number | null;
  readonly afterBytes: number;
  readonly deltaBytes: number;
  readonly kind: 'new-required-module' | 'wiring' | 'attribution-shift';
  /** 该模块字节由哪条需求/任务要求（新必需模块与接线必填）。 */
  readonly requiredBy: string;
}

export const SIDEPANEL_GROWTH_BREAKDOWN = {
  method:
    'esbuild metafile bytesInOutput；v3-1 树（cf2af32 的 packages/web-cli-plugin/src）vs **当前树**（v3-3 build round 工作树；`afterBytes` 取自真实 ' +
    '`dist/build-meta.json`，`beforeBytes` 取自 v3-1 树）—— 同一 absWorkingDir 几何 + web-cli-base 同源拷贝。该表按**累计**口径（v3-1 树 → 当前树）登记，' +
    '`baselineReferenceBytes` 即它所比较的参照基线。',
  reproduceCommand:
    'npm run size:attribution -- --rev cf2af32 --rev WORKTREE（v3-3 工作树；`--worktree`/`WORKTREE` 为 v3-3 新增，用于给未提交的工作树做归因）',
  measuredOn: '2026-09-16',
  /** The baseline whose **tree** this breakdown compares against (v3-1 I6). */
  baselineReferenceBytes: 295_225,
  /** 累计：当前基线 − `baselineReferenceBytes`。 */
  deltaBytes: 54_655,
  /** 逐轮（v3-3 自身）的产物增量（328,476 → 349,880）。 */
  closeoutDeltaBytes: 21_404,
  newRequiredModuleBytes: 43_528,
  wiringBytes: 10_443,
  attributionShiftBytes: 265,
  unattributedHelperDeltaBytes: 419,
  /** 模块路径互不相同（无重复模块）；共享 v2 模块增量为 0（复用非复制）。 */
  duplicationCheck:
    '输入模块数 51（v3-1 为 41，v3-2 为 47），路径互不相同；共享模块 src/ui/tree/tree-receipt.ts Δ=0 B —— 审计/命令目录/树视图复用既有投影模块' +
    '（src/insight/archive-catalog.ts / src/ui/tree/**）而非复制实现；l2/{counts,view-host,command-catalog,audit}.ts 与 settings/sections.ts 是**唯一**新增模块，' +
    '无第二份实现。',
  /** v3-3 自身的逐模块增量（v3-2 收口轮工作树 328,476 B → v3-3 工作树），同几何实测。 */
  closeoutRoundRows: [
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 48_889, afterBytes: 53_390, deltaBytes: 4_501 },
    { module: 'src/ui/sidepanel/l2/command-catalog.ts', beforeBytes: null, afterBytes: 6_106, deltaBytes: 6_106 },
    { module: 'src/ui/sidepanel/l2/audit.ts', beforeBytes: null, afterBytes: 4_145, deltaBytes: 4_145 },
    { module: 'src/ui/sidepanel/l2/view-host.ts', beforeBytes: null, afterBytes: 3_206, deltaBytes: 3_206 },
    { module: 'src/ui/sidepanel/l2/counts.ts', beforeBytes: null, afterBytes: 2_932, deltaBytes: 2_932 },
    { module: 'src/ui/sidepanel/l0/status-bar.ts', beforeBytes: 1_382, afterBytes: 1_649, deltaBytes: 267 },
    { module: 'src/ui/settings/sections.ts', beforeBytes: null, afterBytes: 226, deltaBytes: 226 },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 3_376, afterBytes: 3_275, deltaBytes: -101 },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 17_778, afterBytes: 17_666, deltaBytes: -112 },
  ] as readonly { module: string; beforeBytes: number | null; afterBytes: number; deltaBytes: number }[],
  rows: [
    { module: 'src/ui/sidepanel/l1/panels.ts', beforeBytes: null, afterBytes: 13_280, deltaBytes: 13_280, kind: 'new-required-module', requiredBy: 'FR-V3-031/032/037/038/039（八类就地展开、后果两段、阻断呈现、两条恢复、回执三件套）' },
    { module: 'src/ui/sidepanel/l2/command-catalog.ts', beforeBytes: null, afterBytes: 6_106, deltaBytes: 6_106, kind: 'new-required-module', requiredBy: 'FR-V3-049/053（命令目录逐条有档 + delay 单源措辞 + 硬底线零控件 + 分列）' },
    { module: 'src/ui/sidepanel/l1/ref-validity.ts', beforeBytes: null, afterBytes: 6_078, deltaBytes: 6_078, kind: 'new-required-module', requiredBy: 'FR-V3-036（五维 + 不确定即失效 fail-closed）+ N-07（D4 原因指项）' },
    { module: 'src/ui/sidepanel/l2/audit.ts', beforeBytes: null, afterBytes: 4_145, deltaBytes: 4_145, kind: 'new-required-module', requiredBy: 'FR-V3-050 / NFR-V3-016（审计零明文字段白名单 + URL 去参）' },
    { module: 'src/ui/sidepanel/l1/ref-store.ts', beforeBytes: null, afterBytes: 3_723, deltaBytes: 3_723, kind: 'new-required-module', requiredBy: 'FR-V3-071/037（引用 id 单源 + 受保护派发 + 阻断）+ N-08（退役原因冻结）' },
    { module: 'src/ui/sidepanel/l2/view-host.ts', beforeBytes: null, afterBytes: 3_206, deltaBytes: 3_206, kind: 'new-required-module', requiredBy: 'FR-V3-047/048/054（视图替换 + ← 返回 + 展开态复原 + 单滚动容器）' },
    { module: 'src/ui/sidepanel/l2/counts.ts', beforeBytes: null, afterBytes: 2_932, deltaBytes: 2_932, kind: 'new-required-module', requiredBy: 'FR-V3-046 / EC-V3-016（四类计数真值派生 + {live,baseline} 分列）' },
    { module: 'src/ui/sidepanel/l1/receipt.ts', beforeBytes: null, afterBytes: 2_833, deltaBytes: 2_833, kind: 'new-required-module', requiredBy: 'FR-V3-039 + NFR-V3-008/016（回执三件套 + 零明文）' },
    { module: 'src/ui/sidepanel/l1/local-tree.ts', beforeBytes: null, afterBytes: 658, deltaBytes: 658, kind: 'new-required-module', requiredBy: 'FR-V3-034（局部树 ≤3 节点）' },
    { module: 'src/insight/ownership-tree.ts', beforeBytes: null, afterBytes: 341, deltaBytes: 341, kind: 'new-required-module', requiredBy: 'FR-V3-034（复用 v2 主归属链，首次被侧栏 bundle 引用 → 共享而非复制）' },
    { module: 'src/ui/settings/sections.ts', beforeBytes: null, afterBytes: 226, deltaBytes: 226, kind: 'new-required-module', requiredBy: 'FR-V3-051 / FR-V3-046（设置分区登记表 —— 让设置入口的计数可派生而非豁免）' },
    { module: 'src/ui/sidepanel/sidepanel.ts', beforeBytes: 44_845, afterBytes: 53_390, deltaBytes: 8_545, kind: 'wiring', requiredBy: 'FR-V3-031~040（L1 挂载 + 单一派发器）+ FR-V3-045/047/048/054（L2 视图替换接线 + 计数真值读入 + 审计通道读）' },
    { module: 'src/ui/sidepanel/view-model.ts', beforeBytes: 17_123, afterBytes: 17_666, deltaBytes: 543, kind: 'wiring', requiredBy: 'FR-V3-031（L1 契约纯函数）+ FR-V3-046/015（L2 计数载体 + 入口面板摘要）' },
    { module: 'src/ui/sidepanel/l0/risk-rail.ts', beforeBytes: 5_665, afterBytes: 6_058, deltaBytes: 393, kind: 'wiring', requiredBy: 'FR-V3-037（失效行可读原因；风险位唯一写入者不变）' },
    { module: 'src/ui/sidepanel/l0/status-bar.ts', beforeBytes: 1_382, afterBytes: 1_649, deltaBytes: 267, kind: 'wiring', requiredBy: 'FR-V3-015 / FR-V3-046（入口标签 + 面板摘要写入 + 逐目标 aria 对）' },
    { module: 'src/ui/sidepanel/disclosure.ts', beforeBytes: 4_547, afterBytes: 5_318, deltaBytes: 771, kind: 'wiring', requiredBy: 'FR-V3-031（白名单 4 → 9 个目标 + 5 条 wiring）' },
    { module: 'src/ui/sidepanel/l0/shell.ts', beforeBytes: 3_351, afterBytes: 3_275, deltaBytes: -76, kind: 'wiring', requiredBy: 'FR-V3-047（入口路由交还 view-host；删去 v3-1 骨架期直接显隐 #view-host 的临时逻辑 —— 净减 76 B）' },
    { module: 'src/ui/tree/tree-drawer.ts', beforeBytes: 39_779, afterBytes: 39_893, deltaBytes: 114, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移（归属迁移只改 index.html 的容器与 CSS）' },
    { module: 'src/ui/settings/panel.ts', beforeBytes: 37_040, afterBytes: 37_111, deltaBytes: 71, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/ui/sidepanel/markdown.ts', beforeBytes: 13_417, afterBytes: 13_454, deltaBytes: 37, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/build-info.ts', beforeBytes: 232, afterBytes: 237, deltaBytes: 5, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移（含构建戳字面量长度）' },
    { module: 'src/ui/tree/tree-view.ts', beforeBytes: 21_240, afterBytes: 21_267, deltaBytes: 27, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/ui/sidepanel/scroll-policy.ts', beforeBytes: 826, afterBytes: 830, deltaBytes: 4, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/insight/archive-catalog.ts', beforeBytes: 13_175, afterBytes: 13_179, deltaBytes: 4, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移（被 L2 命令目录只读复用）' },
    { module: 'src/ui/settings/view.ts', beforeBytes: 13_222, afterBytes: 13_225, deltaBytes: 3, kind: 'attribution-shift', requiredBy: '源码未改；esbuild 分摊位移' },
    { module: 'src/ui/tree/tree-receipt.ts', beforeBytes: 2_719, afterBytes: 2_719, deltaBytes: 0, kind: 'attribution-shift', requiredBy: '源码未改且字节未变（Δ=0）—— 回执三件套/审计出口复用 v2 模块，未被复制出第二份实现' },
  ] as readonly GrowthAttributionRow[],
} as const;

/**
 * ── 替代守卫 ④（裁决 V3-VOL-1 ④）：**方向性守卫（防无声膨胀）** ─────────────────
 *
 * 同一 Feature 内**连续两轮**功能轮重登记，累计增幅 > `threshold`（默认 15%）时
 * **必须显式回报编排器**。实现为可读告警（`warning !== null`，附 feature / 轮次 /
 * 百分比 / 必须动作），并由门禁断言「当前状态必须触发它」+「阈值以下不触发它」
 * （可 FAIL、非恒真）。它不是静默日志：`test/size-budget.test.ts` 会把文本打到门禁
 * 输出，且 `SIDEPANEL_BASELINE_META.consecutiveGrowthAlert` 必须与之同源。
 */
export interface ConsecutiveGrowthVerdict {
  readonly feature: string;
  readonly rounds: readonly string[];
  readonly fromBytes: number;
  readonly toBytes: number;
  readonly cumulativePct: number;
  readonly threshold: number;
  /** 非 `null` 即为**必须显式回报编排器**的可读告警。 */
  readonly warning: string | null;
}

export function evaluateConsecutiveReRegistrationGrowth(
  entries: readonly SizeReRegistration[] = SIDEPANEL_RE_REGISTRATIONS,
  feature = 'specs-tree-web-cli-plugin-v3-ui',
  threshold = 0.15,
): ConsecutiveGrowthVerdict {
  const rounds = entries.filter((e) => e.feature === feature && e.roundKind === 'feature-round');
  if (rounds.length < 2) {
    return {
      feature,
      rounds: rounds.map((r) => r.id),
      fromBytes: rounds[0]?.baselineBeforeBytes ?? 0,
      toBytes: rounds[rounds.length - 1]?.baselineAfterBytes ?? 0,
      cumulativePct: 0,
      threshold,
      warning: null,
    };
  }
  const previous = rounds[rounds.length - 2];
  const last = rounds[rounds.length - 1];
  const fromBytes = previous.baselineBeforeBytes;
  const toBytes = last.baselineAfterBytes;
  const cumulativePct = (toBytes - fromBytes) / fromBytes;
  const warning =
    cumulativePct > threshold
      ? `⚠️ 体积方向性告警（裁决 V3-VOL-1 ④）：Feature ${feature} 内连续两轮重登记 ` +
        `${previous.id}（${fromBytes} B → ${previous.baselineAfterBytes} B）+ ${last.id}（${last.baselineBeforeBytes} B → ${toBytes} B）` +
        `累计增幅 ${(cumulativePct * 100).toFixed(2)}% > ${(threshold * 100).toFixed(0)}% —— **必须显式回报编排器**（不得无声膨胀）；` +
        `累计 +${toBytes - fromBytes} B；增量构成见 SIDEPANEL_GROWTH_BREAKDOWN。`
      : null;
  return { feature, rounds: rounds.map((r) => r.id), fromBytes, toBytes, cumulativePct, threshold, warning };
}

/**
 * Hard no-growth ceiling for the injected `dist/content.js` (NFR-V2-002).
 *
 * Guard-tighten re-registration (2026-09-14): the v1-era value 1,073,453 B was
 * measured *before* the base LLM SDK lazification (commit `0df2273`). Leaving it
 * there let `content.js` silently regrow to ~1 MiB with every guard green. It is
 * now re-registered at the post-fix measured value **177,076 B** (source:
 * `npm run build --workspace @lgdl/web-cli-plugin` + `stat -c %s dist/content.js`).
 * Semantics are unchanged: **no tolerance — one byte over FAILS** (reverse proof
 * drives `177_077` → FAIL). Previous value 1,073,453 B stays on record.
 */
export const CONTENT_MAX_BYTES = 177_076;

/**
 * `src/content/**` source content hashes (W3 discipline): the injected bundle's
 * sources are **frozen by content hash** (not by a post-commit-恒绿 `git diff`).
 * Any byte change — including whitespace — must FAIL unless the pin is explicitly
 * updated with a dated reason. Pinned 2026-09-13 (V2-4 build; zero-injection red line).
 */
export const CONTENT_SOURCE_SHA256: Readonly<Record<string, string>> = {
  'src/content/content-script.ts': 'a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82',
  'src/content/dom-agent.ts': '7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f',
  'src/content/page-bridge.ts': '5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac',
};


export interface SizeVerdict {
  ok: boolean;
  measuredBytes: number;
  ceilingBytes: number;
  excessBytes: number;
  message: string;
}

function sizeMessage(
  artifact: string,
  measuredBytes: number,
  ceilingBytes: number,
  ok: boolean,
  baselineClause: string,
): string {
  const excess = Math.max(0, measuredBytes - ceilingBytes);
  return ok
    ? `${artifact} ${measuredBytes}B ≤ 回归上限 ${ceilingBytes}B（${baselineClause}）。`
    : `${artifact} 体积回归：实测 ${measuredBytes}B > 回归上限 ${ceilingBytes}B（${baselineClause}）；超出 ${excess}B。` +
      '若为有意增重，请显式更新 test/size-baseline.ts 的基线并注明测量日期与来源；不得改容差或删断言来掩盖。';
}

/**
 * Pure verdict for a measured `dist/sidepanel.js` size (regression guard).
 *
 * The ceiling is the plain formula `floor(baseline × (1 + tolerance))` — **no cap
 * participates** (orchestrator ruling V3-VOL-1 ② revoked the v3-1 I6
 * `SIDEPANEL_CEILING_CAP` hard cap; it is a record-only field now). The guard's
 * integrity is carried by the four replacement guards instead:
 *   ① the formula + 5% tolerance here,
 *   ② `SIDEPANEL_RE_REGISTRATIONS` (explicit disclosure per round),
 *   ③ `SIDEPANEL_GROWTH_BREAKDOWN` (per-module growth justification),
 *   ④ `evaluateConsecutiveReRegistrationGrowth()` (>15% over two rounds ⇒ alert).
 */
export function evaluateSidepanelSize(
  measuredBytes: number,
  baselineBytes: number = SIDEPANEL_BASELINE_BYTES,
  tolerance: number = SIDEPANEL_BASELINE_TOLERANCE,
): SizeVerdict {
  const ceilingBytes = Math.floor(baselineBytes * (1 + tolerance));
  const ok = measuredBytes <= ceilingBytes;
  return {
    ok,
    measuredBytes,
    ceilingBytes,
    excessBytes: Math.max(0, measuredBytes - ceilingBytes),
    message: sizeMessage(
      'sidepanel.js',
      measuredBytes,
      ceilingBytes,
      ok,
      `基线 ${baselineBytes}B × ${(1 + tolerance).toFixed(2)} 容差（公式判定，无 cap —— 裁决 V3-VOL-1 ②）；基线 ≠ 目标预算`,
    ),
  };
}

/** Pure verdict for a measured `dist/content.js` size (**hard ceiling, no tolerance**). */
export function evaluateContentCeiling(
  measuredBytes: number,
  maxBytes: number = CONTENT_MAX_BYTES,
): SizeVerdict {
  const ok = measuredBytes <= maxBytes;
  return {
    ok,
    measuredBytes,
    ceilingBytes: maxBytes,
    excessBytes: Math.max(0, measuredBytes - maxBytes),
    message: sizeMessage('content.js', measuredBytes, maxBytes, ok, '零注入红线：不增长，无容差'),
  };
}

/** Read `dist/...` relative to this module (works from `dist-test/test/`). */
export function distArtifact(relative: string): URL {
  return new URL(`../../dist/${relative}`, import.meta.url);
}
