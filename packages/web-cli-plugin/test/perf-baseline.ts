/**
 * NFR-007 — content-bundle size snapshot + regression-guard logic.
 *
 * ── Two distinct numbers; do NOT conflate them ───────────────────────────────
 *
 * 1. TARGET BUDGET = `CONTENT_BUNDLE_TARGET_BYTES` (64 KiB, NFR-007).
 *    The *goal*: a small on-demand-injected payload so host-page jank stays
 *    negligible (zero static `content_scripts`). It is **NOT met today** — the
 *    measured bundle is ~16.4× the target. This is an open, disclosed deviation
 *    (D31: the author deferred code-splitting), and it MUST NOT be silently
 *    redefined to the measured size in order to claim success.
 *
 * 2. REGRESSION BASELINE = `CONTENT_BUNDLE_BASELINE_BYTES` (a measured value).
 *    The guard FAILS when a change grows the bundle beyond
 *    `baseline × (1 + tolerance)`. Raising the baseline is a deliberate act and
 *    must be accompanied by a note here (date + source) plus updates in
 *    `build.md §11.5`, `docs/dev.md §8` and `state.json`.
 *
 * Snapshot (2026-09-13, branch `feature/web-cli-plugin`): `dist/content.js`
 * measured after `npm run build` = **1,073,453 B** (≈1,048.3 KiB ≈1.02 MiB).
 * Independently confirmed by validate R4 (`validate-report.md` §R4-11). The
 * growth was introduced with commit `8b06a43` (inlining the base DOM value
 * import + the LLM SDK) — see `build.md §27.5`.
 */
import { statSync } from 'node:fs';

export const CONTENT_BUNDLE_TARGET_BYTES = 64 * 1024;
export const CONTENT_BUNDLE_BASELINE_BYTES = 1_073_453;
export const CONTENT_BUNDLE_BASELINE_TOLERANCE = 0.05;

export const CONTENT_BUNDLE_BASELINE_META = {
  measuredOn: '2026-09-13',
  source: 'packages/web-cli-plugin/dist/content.js',
  measuredBy: 'SDDU build round 9 (re-measured; matches validate R4 §R4-11)',
  buildCommand: 'npm run build --workspace @lgdl/web-cli-plugin',
  targetBudgetBytes: CONTENT_BUNDLE_TARGET_BYTES,
  /** The 64 KiB NFR-007 target is explicitly recorded as NOT met (open deviation D31). */
  targetMet: false,
  note: '内联 base DOM 值导入 + LLM SDK（提交 8b06a43 起）后约 1.0MB；分包优化由作者暂缓（D31）。',
} as const;

export interface ContentBundleSizeVerdict {
  /** Regression guard: true when `measuredBytes <= ceilingBytes`. */
  ok: boolean;
  measuredBytes: number;
  baselineBytes: number;
  tolerance: number;
  /** `floor(baselineBytes × (1 + tolerance))` — the regression ceiling. */
  ceilingBytes: number;
  /** NFR-007 goal (64 KiB) — independent from the regression baseline. */
  targetBytes: number;
  targetMet: boolean;
  measuredOverTargetRatio: number;
  measuredOverBaselineRatio: number;
  excessBytes: number;
  message: string;
}

/**
 * Pure verdict for a measured `dist/content.js` size.
 *
 * - `ok`         : regression guard (measured ≤ baseline × (1 + tolerance)).
 * - `targetMet`  : NFR-007 goal (64 KiB) — currently false; kept separate.
 */
export function evaluateContentBundleSize(
  measuredBytes: number,
  baselineBytes: number = CONTENT_BUNDLE_BASELINE_BYTES,
  tolerance: number = CONTENT_BUNDLE_BASELINE_TOLERANCE,
): ContentBundleSizeVerdict {
  const ceilingBytes = Math.floor(baselineBytes * (1 + tolerance));
  const ok = measuredBytes <= ceilingBytes;
  const targetMet = measuredBytes <= CONTENT_BUNDLE_TARGET_BYTES;
  const excessBytes = Math.max(0, measuredBytes - ceilingBytes);
  const measuredOverBaselineRatio = baselineBytes > 0 ? measuredBytes / baselineBytes : Number.POSITIVE_INFINITY;
  const measuredOverTargetRatio = measuredBytes / CONTENT_BUNDLE_TARGET_BYTES;
  const targetClause = targetMet
    ? `NFR-007 目标预算 ${CONTENT_BUNDLE_TARGET_BYTES}B 已达成`
    : `NFR-007 目标预算 ${CONTENT_BUNDLE_TARGET_BYTES}B 尚未达成（当前约 ${measuredOverTargetRatio.toFixed(1)}× 目标，未达成项 D31 已如实登记）`;

  const message = ok
    ? `content.js ${measuredBytes}B ≤ 回归上限 ${ceilingBytes}B` +
      `（基线 ${baselineBytes}B × ${(1 + tolerance).toFixed(2)} 容差；实测/基线 ${measuredOverBaselineRatio.toFixed(3)}×）。` +
      `注意区分：${targetClause}。`
    : `content.js 体积回归：实测 ${measuredBytes}B > 回归上限 ${ceilingBytes}B` +
      `（基线 ${baselineBytes}B × ${(1 + tolerance).toFixed(2)} 容差）；超出 ${excessBytes}B（实测/基线 ${measuredOverBaselineRatio.toFixed(3)}×）。` +
      `若为有意增重，请显式更新 test/perf-baseline.ts 的 CONTENT_BUNDLE_BASELINE_BYTES 并注明测量日期与来源，` +
      `同步 build.md §11.5 / docs/dev.md §8 / state.json；不得改容差或删断言来掩盖。` +
      `另：${targetClause}。`;

  return {
    ok,
    measuredBytes,
    baselineBytes,
    tolerance,
    ceilingBytes,
    targetBytes: CONTENT_BUNDLE_TARGET_BYTES,
    targetMet,
    measuredOverTargetRatio,
    measuredOverBaselineRatio,
    excessBytes,
    message,
  };
}

export type StatLike = (path: URL) => { size: number };

/**
 * Read an artifact size. **ONLY** `ENOENT` (artifact not built) is tolerated and
 * returns `undefined`; every other error MUST propagate.
 *
 * A bare `catch` here is exactly what silently disabled this guard: the old
 * implementation wrapped the size assertion in `try { … } catch {}`, so the
 * `AssertionError` was swallowed and the suite went green even with a 16×
 * over-budget bundle (validate R4 §R4-11 — false-green gate).
 */
export function readArtifactSize(path: URL, stat: StatLike = statSync): number | undefined {
  try {
    return stat(path).size;
  } catch (err) {
    if ((err as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') return undefined;
    throw err;
  }
}
