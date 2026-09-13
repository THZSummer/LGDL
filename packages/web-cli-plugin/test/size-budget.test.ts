/**
 * V2-2 — size-budget gate (NFR-V2-001 / NFR-V2-002, ADR-V2-007).
 *
 * New file: the v1 `test/perf-baseline.ts` / `test/perf-budget.test.ts` are left
 * untouched (the content 64 KiB target narrative / open deviation D31 stays
 * exactly where it was). This gate covers:
 *   1. `sidepanel.js ≤ SIDEPANEL_CEILING` (regression baseline × 1.05);
 *   2. `content.js ≤ CONTENT_MAX_BYTES` (hard no-growth ceiling, no tolerance);
 *   3. reverse proof: `ceiling + 1` and `1_073_454` must FAIL (not a false-green);
 *   4. the reader swallows ONLY `ENOENT`; `EACCES` / a bare `Error` propagate;
 *   5. baseline ≠ target budget (`targetBudgetBytes === null`, `targetMet === null`);
 *   6. consistency with v1: `CONTENT_BUNDLE_TARGET_BYTES === 64 KiB` and its
 *      snapshot records `targetMet === false` (D31 is NOT redefined).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_MAX_BYTES,
  SIDEPANEL_BASELINE_BYTES,
  SIDEPANEL_BASELINE_BYTES_HISTORY,
  SIDEPANEL_BASELINE_META,
  SIDEPANEL_BASELINE_TOLERANCE,
  SIDEPANEL_CEILING,
  distArtifact,
  evaluateContentCeiling,
  evaluateSidepanelSize,
  readArtifactSize,
} from './size-baseline.js';
import {
  CONTENT_BUNDLE_BASELINE_META,
  CONTENT_BUNDLE_TARGET_BYTES,
} from './perf-baseline.js';

test('V2-2 size: sidepanel regression ceiling is baseline × (1 + 5%)', () => {
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05);
  assert.equal(SIDEPANEL_CEILING, Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05));
});

test('V2-2 size: built sidepanel.js stays within the regression ceiling (when built)', (t) => {
  const size = readArtifactSize(distArtifact('sidepanel.js'));
  if (size === undefined) {
    // dist absent (unit-test-only run): explicit, visible skip — never a silent pass.
    t.skip('dist/sidepanel.js not present — build first to measure the side-panel budget');
    return;
  }
  const verdict = evaluateSidepanelSize(size);
  assert.equal(verdict.ok, true, verdict.message);
});

test('V2-2 size: built content.js stays within the hard no-growth ceiling (when built)', (t) => {
  const size = readArtifactSize(distArtifact('content.js'));
  if (size === undefined) {
    t.skip('dist/content.js not present — build first to measure the content ceiling');
    return;
  }
  const verdict = evaluateContentCeiling(size);
  assert.equal(verdict.ok, true, verdict.message);
  assert.equal(
    CONTENT_MAX_BYTES,
    1_073_453,
    'content.js 上限恒为 v1 实测值（零注入红线）；不得改写上限来「宣布通过」',
  );
});

test('V2-2 size REVERSE PROOF: one byte over the sidepanel ceiling FAILS the guard', () => {
  const atCeiling = evaluateSidepanelSize(SIDEPANEL_CEILING);
  assert.equal(atCeiling.ok, true, atCeiling.message);

  const overCeiling = evaluateSidepanelSize(SIDEPANEL_CEILING + 1);
  assert.equal(overCeiling.ok, false, '守卫必须在超出基线容差时 FAIL');
  assert.match(overCeiling.message, /体积回归/);
  assert.match(overCeiling.message, new RegExp(`实测 ${SIDEPANEL_CEILING + 1}B`));
  assert.match(overCeiling.message, /超出 1B/);

  // Run the real assertion path: the over-budget value MUST throw.
  assert.throws(
    () => assert.equal(overCeiling.ok, true, overCeiling.message),
    /体积回归/,
    '反证：超出基线容差的实测必须让断言抛错（旧 bare catch 会吞掉该错 → 恒绿）',
  );
});

test('V2-2 size REVERSE PROOF: 1,073,454 B content.js FAILS the hard ceiling', () => {
  const over = evaluateContentCeiling(1_073_454);
  assert.equal(over.ok, false, 'content.js 增长 1 字节也必须 FAIL');
  assert.equal(over.ceilingBytes, CONTENT_MAX_BYTES);
  assert.equal(over.excessBytes, 1);
  assert.throws(
    () => assert.equal(over.ok, true, over.message),
    /体积回归/,
  );
});

test('V2-2 size guard: only ENOENT is swallowed; other stat failures propagate', () => {
  const url = distArtifact('sidepanel.js');
  const enoent = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
  assert.equal(
    readArtifactSize(url, () => {
      throw enoent;
    }),
    undefined,
    '文件不存在（未构建）是合理情形，按既有语义跳过',
  );

  const eacces = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
  assert.throws(
    () =>
      readArtifactSize(url, () => {
        throw eacces;
      }),
    /permission denied/,
    '非 ENOENT 的 stat 失败不得被吞掉',
  );

  assert.throws(
    () =>
      readArtifactSize(url, () => {
        throw new Error('boom');
      }),
    /boom/,
    '无 errno code 的裸 Error 也必须抛出',
  );
});

test('V2-2 size: the side-panel baseline is a regression baseline, NOT a target budget', () => {
  assert.equal(SIDEPANEL_BASELINE_META.kind, 'regression-baseline-only');
  assert.equal(SIDEPANEL_BASELINE_META.targetBudgetBytes, null);
  assert.equal(SIDEPANEL_BASELINE_META.targetMet, null);
  assert.equal(typeof SIDEPANEL_BASELINE_META.measuredOn, 'string');
  assert.equal(SIDEPANEL_BASELINE_META.source, 'packages/web-cli-plugin/dist/sidepanel.js');
  assert.equal(
    SIDEPANEL_BASELINE_META.buildCommand,
    'npm run build --workspace @lgdl/web-cli-plugin',
  );
});

test('V2-2 size: v1 content 64 KiB target narrative is untouched (D31 not redefined)', () => {
  assert.equal(CONTENT_BUNDLE_TARGET_BYTES, 64 * 1024);
  assert.equal(
    CONTENT_BUNDLE_BASELINE_META.targetBudgetBytes,
    CONTENT_BUNDLE_TARGET_BYTES,
    'v1 基线快照的目标预算记录必须与 CONTENT_BUNDLE_TARGET_BYTES 一致',
  );
  assert.equal(
    CONTENT_BUNDLE_BASELINE_META.targetMet,
    false,
    'v1 的 64 KiB 目标仍未达成（D31）；V2 不得把它改写成达成',
  );
});

// ---------------------------------------------------------------------------
// W4 修复轮（2026-09-13）：sidepanel 基线显式重登记（V2-3 有意增重）
// ---------------------------------------------------------------------------

test('W4 size: sidepanel baseline explicitly re-registered at the V2-3 re-measured value', () => {
  // Re-measured 2026-09-13: `stat -c %s packages/web-cli-plugin/dist/sidepanel.js`
  // → 1,110,744 B (V2-3 revoke/undo surface). V2-2's 1,085,389 B is retained in
  // the history array and in the meta block — never silently overwritten.
  assert.equal(SIDEPANEL_BASELINE_BYTES, 1_110_744);
  assert.deepEqual([...SIDEPANEL_BASELINE_BYTES_HISTORY], [1_068_165, 1_085_389]);
  assert.equal(SIDEPANEL_BASELINE_META.previousBaselineBytes, 1_085_389);
  assert.ok(
    SIDEPANEL_BASELINE_BYTES > SIDEPANEL_BASELINE_META.previousBaselineBytes,
    '重登记为「上调」必须显式记录（不得静默上调，也不得静默下调）',
  );
  assert.equal(SIDEPANEL_CEILING, 1_166_281, 'ceiling = floor(1,110,744 × 1.05)');
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05, '容差不得因重登记而放宽');
  assert.ok(SIDEPANEL_BASELINE_BYTES <= SIDEPANEL_CEILING, '基线与上限自洽');
  // The zero-injection red line must NOT grow as part of the re-registration.
  assert.equal(CONTENT_MAX_BYTES, 1_073_453, 'content.js 硬上限保持不变（零注入红线）');
});

test('W4 size REVERSE PROOF: the re-registered ceiling still FAILS on one byte over', () => {
  assert.equal(evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).ok, true);
  const over = evaluateSidepanelSize(SIDEPANEL_CEILING + 1);
  assert.equal(over.ok, false, '新 ceiling + 1 必须 FAIL');
  assert.equal(over.ceilingBytes, 1_166_281);
  assert.throws(() => assert.equal(over.ok, true, over.message), /体积回归/);
});
