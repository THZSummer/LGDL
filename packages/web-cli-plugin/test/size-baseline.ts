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
 * (`CONTENT_MAX_BYTES`, no tolerance) pinned to the v1 measured value, so V2 can
 * never silently fatten the injected bundle (NFR-V2-002 red line).
 *
 * Measurement discipline: re-measure after `npm run build` and update
 * `SIDEPANEL_BASELINE_BYTES` / `SIDEPANEL_CEILING` / `SIDEPANEL_BASELINE_META`
 * explicitly (date + source + build command). Never widen the tolerance or delete
 * an assertion to make a gate green.
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
 *   - **current (2026-09-13)** ... 1,159,856 B (V2 R2: real nested tree UI + per-level
 *     allow/ask/deny policy controls + archive layering)
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
 */
export const SIDEPANEL_BASELINE_BYTES = 1_159_856;

/** Previous registered baselines (V2-2 / V2-3 / V2-4, 2026-09-13) — kept on record. */
export const SIDEPANEL_BASELINE_BYTES_HISTORY = [1_068_165, 1_085_389, 1_110_744, 1_132_748] as const;

/** Allowed growth over the baseline before the guard fails. */
export const SIDEPANEL_BASELINE_TOLERANCE = 0.05;

/** `floor(baseline × (1 + tolerance))` — the regression ceiling. */
export const SIDEPANEL_CEILING = Math.floor(
  SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE),
);

/**
 * Machine-readable provenance. `targetBudgetBytes` / `targetMet` are **null on
 * purpose**: this is a regression baseline, not a target. Asserting them null is
 * how the suite forbids「目标达成」wording here (ADR-V2-007).
 */
export const SIDEPANEL_BASELINE_META = {
  kind: 'regression-baseline-only',
  measuredOn: '2026-09-13',
  source: 'packages/web-cli-plugin/dist/sidepanel.js',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  measuredBy:
    'SDDU build v2 R2 round 2: re-measured after the real nested-tree renderer (tree-view.ts nested ownership model + tree-drawer.ts role=tree/keyboard/breadcrumb + per-level allow/ask/deny policy controls) and archive layering. Previous baseline 1,132,748 B (V2-4); V2-3 1,110,744 B; V2-2 1,085,389 B; v1 1,068,165 B. Explicit re-registration — previous values retained in SIDEPANEL_BASELINE_BYTES_HISTORY.',
  previousBaselineBytes: 1_132_748,
  reRegisteredFrom: 'V2-4 1,132,748 B',
  targetBudgetBytes: null,
  targetMet: null,
  note: 'sidepanel.js 无字节目标；本值为「不得回退」回归基线（基线 ≠ 目标预算）。2026-09-13 v2 R2 显式重登记：真层级树 UI（逐层展开/键盘/面包屑/三态覆盖控件）+ 档案分层有意增重后实测 1,159,856 B；历史值 1,068,165 / 1,085,389 / 1,110,744 / 1,132,748 保留在案；容差 5% 不变。',
} as const;

/**
 * Hard no-growth ceiling for the injected `dist/content.js` (NFR-V2-002): the v1
 * measured value, no tolerance. V2 must not add a single byte here.
 */
export const CONTENT_MAX_BYTES = 1_073_453;

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

/** Pure verdict for a measured `dist/sidepanel.js` size (regression guard). */
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
      `基线 ${baselineBytes}B × ${(1 + tolerance).toFixed(2)} 容差；基线 ≠ 目标预算`,
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
