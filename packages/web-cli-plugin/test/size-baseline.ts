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
export const SIDEPANEL_BASELINE_BYTES = 327_679;

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
  1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942, 266_500, 291_523, 295_225, 327_679,
] as const;

/** Allowed growth over the baseline before the guard fails. */
export const SIDEPANEL_BASELINE_TOLERANCE = 0.05;

/**
 * Tighten-only cap on the regression ceiling (I6 fix round).
 *
 * The ceiling is the *operative* guard; letting it grow whenever the registered
 * baseline grows would turn every registry-fidelity fix into an invisible
 * widening. The cap pins the previously registered ceiling (306,099 B) as an
 * upper bound: `SIDEPANEL_CEILING` and `evaluateSidepanelSize()` both take the
 * minimum of the formula and this cap, so the ceiling can only ever decrease.
 */
export const SIDEPANEL_CEILING_CAP = 306_099;

/** `min(floor(baseline × (1 + tolerance)), SIDEPANEL_CEILING_CAP)` — only ever ↓. */
export const SIDEPANEL_CEILING = Math.min(
  Math.floor(SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE)),
  SIDEPANEL_CEILING_CAP,
);

/**
 * `floor(baseline × 1.05)` without the cap — recorded so the *tightening* is
 * visible: `SIDEPANEL_CEILING === SIDEPANEL_CEILING_UNCAPPED` would mean the cap
 * is inactive; `SIDEPANEL_CEILING < SIDEPANEL_CEILING_UNCAPPED` is the honest
 * statement of "the ceiling was NOT raised for this re-registration".
 */
export const SIDEPANEL_CEILING_UNCAPPED = Math.floor(
  SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE),
);

/**
 * The bytes `dist/sidepanel.js` actually has (I6: 登记值 == 实测产物). Asserted
 * equal to the measured artifact by `test/size-budget.test.ts`, and compared at
 * runtime against the density registry by `test/ui/density.mjs` stage F.
 */
export const SIDEPANEL_FINAL_ARTIFACT_BYTES = 327_679;

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
    'SDDU v3-2 build round (2026-09-16, leaf specs-tree-v3-2-l1-disclosure-refs): re-measured on the final artifact of the L1 layer (eight in-place content classes + the fail-closed five-dimension reference judge + the receipt triple + the local-tree slice). This is a RAISED re-registration of the BASELINE (327,679 B) with a NON-RAISED ceiling (306,099 B = the previous ceiling, kept as a tighten-only cap) — the artifact therefore EXCEEDS the frozen ceiling by 21,580 B, which is reported as an explicit red-line conflict rather than widened away. Previous registered baseline 295,225 B (v3-1 I6 round); before that 291,523 B (whose final artifact measured 294,874 B — the discrepancy the I6 round fixed); before that 266,500 B (tighten round 2026-09-14, ceiling 279,825 B); before that 1,159,856 B (R2, ceiling 1,217,848 B); R2 closeout measurement 1,162,942 B; V2-4 1,132,748 B; V2-3 1,110,744 B; V2-2 1,085,389 B; v1 1,068,165 B. Every previous value is retained in SIDEPANEL_BASELINE_BYTES_HISTORY / SIDEPANEL_BASELINE_BYTES_TIMELINE.',
  previousBaselineBytes: 295_225,
  previousCeilingBytes: 306_099,
  direction: 'raised',
  ceilingDirection: 'held',
  finalArtifactBytes: 327_679,
  reRegisteredFrom:
    'v3-1 I6 轮 295,225 B（ceiling 306,099 B，cap 只降不升）；更早 291,523 B（该轮最终产物实测 294,874 B）与 266,500 B（ceiling 279,825 B，2026-09-14 收紧轮），再早 1,159,856 B（ceiling 1,217,848 B）与 R2 收口实测 1,162,942 B',
  targetBudgetBytes: null,
  targetMet: null,
  note: 'sidepanel.js 无字节目标；本值为「不得回退」回归基线（基线 ≠ 目标预算）。2026-09-16 v3-2 显式**提升**重登记：L1 八类就地展开 + 引用失效 fail-closed 判定 + 回执三件套 + 局部树为**有意增重**，实测 327,679 B（前值 295,225 B，+32,454 B），**ceiling 未抬高**（仍为 306,099 B = 上一轮 ceiling，cap 只降不升）→ 产物超出冻结上限 **21,580 B**，`≤ cap` 断言如实 FAIL（红线冲突，已上报）。历史值 1,068,165 / 1,085,389 / 1,110,744 / 1,132,748 / 1,159,856 / 1,162,942 / 266,500 / 291,523 / 295,225 全保留；容差 5% 不变；断言零删减（方向敏感断言按新实测值重新 pin）；targetBudgetBytes/targetMet 保持 null；+1 B 反证在**当前 ceiling** 上重跑。',
} as const;

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
 * The ceiling is `min(floor(baseline × (1 + tolerance)), ceilingCapBytes)` — the
 * cap (I6 fix round) makes the guard **tighten-only**: a re-registration that
 * raises the baseline can never widen the pass/fail boundary. Pass
 * `ceilingCapBytes: Number.POSITIVE_INFINITY` to inspect the uncapped formula.
 */
export function evaluateSidepanelSize(
  measuredBytes: number,
  baselineBytes: number = SIDEPANEL_BASELINE_BYTES,
  tolerance: number = SIDEPANEL_BASELINE_TOLERANCE,
  ceilingCapBytes: number = SIDEPANEL_CEILING_CAP,
): SizeVerdict {
  const ceilingBytes = Math.min(Math.floor(baselineBytes * (1 + tolerance)), ceilingCapBytes);
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
      `基线 ${baselineBytes}B × ${(1 + tolerance).toFixed(2)} 容差（ceiling 只降不升，cap ${ceilingCapBytes}B）；基线 ≠ 目标预算`,
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
