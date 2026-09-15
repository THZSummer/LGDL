/**
 * V2-2 — size-budget gate (NFR-V2-001 / NFR-V2-002, ADR-V2-007).
 *
 * New file: the v1 `test/perf-baseline.ts` / `test/perf-budget.test.ts` are left
 * untouched (the content 64 KiB target narrative / open deviation D31 stays
 * exactly where it was). This gate covers:
 *   1. `sidepanel.js ≤ SIDEPANEL_CEILING` (regression baseline × 1.05);
 *   2. `content.js ≤ CONTENT_MAX_BYTES` (hard no-growth ceiling, no tolerance);
 *   3. reverse proof: `ceiling + 1`, `177_077` and `1_073_454` must FAIL (not a
 *      false-green) — the old 1 MiB-scale value is kept on record as an explicit
 *      "the pre-lazification ceiling no longer passes" proof;
 *   4. the reader swallows ONLY `ENOENT`; `EACCES` / a bare `Error` propagate;
 *   5. baseline ≠ target budget (`targetBudgetBytes === null`, `targetMet === null`);
 *   6. consistency with v1: `CONTENT_BUNDLE_TARGET_BYTES === 64 KiB` and its
 *      snapshot records `targetMet === false` (D31 is NOT redefined).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  CONTENT_MAX_BYTES,
  CONTENT_SOURCE_SHA256,
  SIDEPANEL_BASELINE_BYTES,
  SIDEPANEL_BASELINE_BYTES_HISTORY,
  SIDEPANEL_BASELINE_BYTES_TIMELINE,
  SIDEPANEL_BASELINE_META,
  SIDEPANEL_BASELINE_TOLERANCE,
  SIDEPANEL_CEILING,
  SIDEPANEL_CEILING_CAP,
  SIDEPANEL_CEILING_UNCAPPED,
  SIDEPANEL_FINAL_ARTIFACT_BYTES,
  distArtifact,
  evaluateContentCeiling,
  evaluateSidepanelSize,
  readArtifactSize,
} from './size-baseline.js';
import {
  CONTENT_BUNDLE_BASELINE_META,
  CONTENT_BUNDLE_TARGET_BYTES,
} from './perf-baseline.js';

test('V2-2 size: sidepanel regression ceiling is min(baseline × 1.05, cap) — 只降不升（I6）', () => {
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05);
  assert.equal(
    SIDEPANEL_CEILING,
    Math.min(Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05), SIDEPANEL_CEILING_CAP),
  );
  assert.equal(
    SIDEPANEL_CEILING,
    Math.min(SIDEPANEL_CEILING_UNCAPPED, SIDEPANEL_CEILING_CAP),
    'ceiling 必须等于「公式值与 cap 取小」',
  );
  // 收紧方向：cap 必须真的生效（否则登记保真会变相放宽 3.9KB）。
  assert.ok(
    SIDEPANEL_CEILING <= SIDEPANEL_CEILING_CAP,
    `ceiling ${SIDEPANEL_CEILING} 不得超过 cap ${SIDEPANEL_CEILING_CAP}`,
  );
  assert.ok(
    SIDEPANEL_CEILING_UNCAPPED >= SIDEPANEL_CEILING_CAP,
    '本轮 cap 生效（未加 cap 的公式值不得低于 cap）',
  );
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
  // I6: the registered value must equal the SHIPPED artifact (登记值 == 实测产物).
  assert.equal(
    size,
    SIDEPANEL_BASELINE_BYTES,
    `登记基线 ${SIDEPANEL_BASELINE_BYTES}B ≠ 实测产物 ${size}B —— 必须按真实产物重登记（不得让登记值滞后于产物）`,
  );
  assert.equal(
    size,
    SIDEPANEL_FINAL_ARTIFACT_BYTES,
    `artifact 登记值 ${SIDEPANEL_FINAL_ARTIFACT_BYTES}B ≠ 实测产物 ${size}B`,
  );
  assert.ok(size <= SIDEPANEL_CEILING_CAP, `实测 ${size}B 超出只降不升的 ceiling cap ${SIDEPANEL_CEILING_CAP}B`);
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
    177_076,
    'content.js 上限 = 2026-09-14 实测值（零注入红线：不增长，无容差）；不得改写上限来「宣布通过」',
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
  assert.equal(over.excessBytes, 1_073_454 - CONTENT_MAX_BYTES);
  assert.throws(
    () => assert.equal(over.ok, true, over.message),
    /体积回归/,
  );
});

// ---------------------------------------------------------------------------
// 守卫收紧轮（2026-09-14，锁死 base LLM SDK 惰性化战果）
// 追加段：新实测值下的反证必须仍会 FAIL（不只旧值会 FAIL）。
// ---------------------------------------------------------------------------

test('guard-tighten REVERSE PROOF: 177,077 B content.js FAILS the tightened hard ceiling', () => {
  // content.js 实测 177,076 B（2026-09-14）；多 1 字节即必须 FAIL。
  assert.equal(CONTENT_MAX_BYTES, 177_076, '硬上限 = 2026-09-14 实测值');
  const atCeiling = evaluateContentCeiling(177_076);
  assert.equal(atCeiling.ok, true, '实测值本身必须通过（否则守卫自相矛盾）');
  const over = evaluateContentCeiling(177_077);
  assert.equal(over.ok, false, '收紧后 +1 字节必须 FAIL');
  assert.equal(over.excessBytes, 1);
  assert.throws(
    () => assert.equal(over.ok, true, over.message),
    /体积回归/,
    '反证：收紧后的硬上限 +1 字节必须让断言抛错（不得因收紧而虚绿）',
  );
});

test('guard-tighten REVERSE PROOF: the pre-lazification value 1,073,453 B now FAILS', () => {
  // 旧上限（= 旧实测值）在新上限下必须不通过 —— 证明「悄悄长回 1 MiB」不再可能。
  const oldCeiling = evaluateContentCeiling(1_073_453);
  assert.equal(oldCeiling.ok, false, '旧 1 MiB 级值不得再通过新守卫');
  assert.equal(oldCeiling.excessBytes, 1_073_453 - CONTENT_MAX_BYTES);
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
// W4 修复轮（2026-09-13）～ v2 R2 第 2 轮（2026-09-13，R2-V22-05）～
// 守卫收紧轮（2026-09-14，锁死 base LLM SDK 惰性化战果）
// 本节钉死值随各轮**显式**重登记更新，断言结构零删减；全部历史值保留在
// SIDEPANEL_BASELINE_BYTES_HISTORY / SIDEPANEL_BASELINE_META。
// ---------------------------------------------------------------------------

test('W4 size: sidepanel baseline explicitly re-registered (history retained; guard-tighten round)', () => {
  // v2 R2 (2026-09-13) pinned 1,159,856 B (real nested tree UI + layered policy
  // controls + archive layering). 守卫收紧轮 (2026-09-14) re-measured after the
  // base LLM SDK lazification → 266,500 B and TIGHTENED (direction = down).
  // v3-1 (2026-09-16)：L0 骨架 + 折叠控制器为**有意增重**，按实测**提升**重登记。
  // v3-1 review 修复轮 (2026-09-16, I6)：上一轮的 291,523 B 与该轮**最终产物**
  // 294,874 B 不符 → 按真实产物重登记为 295,225 B（修复轮最终构建）；
  // 上一轮 291,523 B / ceiling 306,099 B 保留为 previous*，且 ceiling **未抬高**。
  assert.equal(SIDEPANEL_BASELINE_BYTES, 327_679);
  assert.equal(SIDEPANEL_BASELINE_META.previousBaselineBytes, 295_225);
  assert.equal(SIDEPANEL_BASELINE_META.previousCeilingBytes, 306_099);
  assert.equal(SIDEPANEL_BASELINE_META.direction, 'raised');
  assert.equal(SIDEPANEL_BASELINE_META.ceilingDirection, 'held', 'ceiling 不得为登记保真而抬高');
  assert.equal(SIDEPANEL_BASELINE_META.finalArtifactBytes, SIDEPANEL_FINAL_ARTIFACT_BYTES);
  // 历史值全保留（含 v2 R2 的 1,159,856 与 R2 收口实测 1,162,942）；
  // 2026-09-14 的 266,500 B 与 2026-09-16 的 291,523 B 由 META.previousBaselineBytes /
  // reRegisteredFrom / TIMELINE 保留（HISTORY 保持单调不减的链条）。
  assert.deepEqual(
    [...SIDEPANEL_BASELINE_BYTES_HISTORY],
    [1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942],
  );
  assert.ok(SIDEPANEL_BASELINE_BYTES_TIMELINE.includes(295_225), 'TIMELINE 必须保留 295,225 B');
  assert.ok(SIDEPANEL_BASELINE_BYTES_TIMELINE.includes(291_523), 'TIMELINE 必须保留 291,523 B');
  assert.ok(SIDEPANEL_BASELINE_BYTES_TIMELINE.includes(266_500), 'TIMELINE 必须保留 266,500 B');
  assert.equal(
    SIDEPANEL_BASELINE_BYTES_TIMELINE[SIDEPANEL_BASELINE_BYTES_TIMELINE.length - 1],
    SIDEPANEL_BASELINE_BYTES,
    'TIMELINE 末项必须是当前基线',
  );
  // 方向必须与数值一致（上调/下调都必须显式记录，不得静默）。
  assert.ok(
    SIDEPANEL_BASELINE_BYTES > SIDEPANEL_BASELINE_META.previousBaselineBytes,
    '本轮为「提升」重登记：当前基线必须严格大于前值',
  );
  // I6：ceiling 保持 306,099（= 上一轮 ceiling；公式值 309,986 未被采用 → 只降不升）。
  assert.equal(SIDEPANEL_CEILING, 306_099, 'ceiling 未抬高：仍 = 上一轮 ceiling（cap 生效）');
  assert.equal(SIDEPANEL_CEILING_CAP, 306_099);
  assert.equal(SIDEPANEL_CEILING_UNCAPPED, Math.floor(327_679 * 1.05), '未加 cap 的公式值必须被记录');
  assert.ok(SIDEPANEL_CEILING_UNCAPPED > SIDEPANEL_CEILING, '本轮 cap 必须真的收紧（否则是变相放宽）');
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05, '容差不得因重登记而放宽');
  // v3-2 (2026-09-16)：本轮**如实**超出被冻结的 ceiling（红线冲突已上报，未放宽）。
  assert.ok(
    SIDEPANEL_BASELINE_BYTES > SIDEPANEL_CEILING,
    `v3-2 产物 ${SIDEPANEL_BASELINE_BYTES}B 必须如实高于冻结 ceiling ${SIDEPANEL_CEILING}B（不得被「修好」）`,
  );
  // 零注入红线随本轮**收紧**（不是放宽）。
  assert.equal(CONTENT_MAX_BYTES, 177_076, 'content.js 硬上限同步收紧到 2026-09-14 实测值');
});

test('W4 size REVERSE PROOF: the tightened ceiling still FAILS on one byte over', () => {
  // v3-2（2026-09-16）：当前基线 = 327,679 B，**超出**被冻结的 ceiling（红线冲突已
  // 上报）；本条断言按实测方向重 pin —— 不得改回 `true` 来掩盖冲突。
  assert.equal(evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).ok, false);
  const over = evaluateSidepanelSize(SIDEPANEL_CEILING + 1);
  assert.equal(over.ok, false, '新 ceiling + 1 必须 FAIL');
  assert.equal(over.ceilingBytes, 306_099);
  assert.throws(() => assert.equal(over.ok, true, over.message), /体积回归/);
  // 方向敏感的张力证明（v3-1 提升轮 + I6 修复轮）：
  //   ① 上一轮基线（291,523 B）在新守卫下仍然 PASS —— 重登记不是「偷偷放宽」；
  //   ② I6：ceiling **不得**因基线提升而被抬高 —— 当前 ceiling 必须 ≤ 上一轮 ceiling
  //      （旧版本断言「baseline > 上一轮 ceiling」，那在「cap 只降不升」的新纪律下
  //      不再成立，且它证明的是「旧 ceiling 已被突破」，与 I6 的目标相反）。
  assert.equal(
    evaluateSidepanelSize(SIDEPANEL_BASELINE_META.previousBaselineBytes).ok,
    true,
    '上一轮基线 291,523 B 仍在新守卫接受范围内',
  );
  assert.ok(
    SIDEPANEL_CEILING <= SIDEPANEL_BASELINE_META.previousCeilingBytes,
    `ceiling ${SIDEPANEL_CEILING}B 必须 ≤ 上一轮 ceiling ${SIDEPANEL_BASELINE_META.previousCeilingBytes}B（只降不升）`,
  );
  // v3-2：新基线**不再**通过守卫（这正是本轮的红线冲突；断言按实测方向重 pin，
  // 不得改成 `true` 来「宣布通过」）。
  assert.equal(
    evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).ok,
    false,
    'v3-2 产物超出冻结 ceiling —— 守卫必须如实 FAIL',
  );
  assert.equal(evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).excessBytes, 327_679 - 306_099);
});

// ---------------------------------------------------------------------------
// V2-4（2026-09-13）：重登记一致性 + content.js 零增长源码哈希 pin
// 守卫收紧轮（2026-09-14）：同一段断言结构零删减，仅钉死值随收紧更新
// ---------------------------------------------------------------------------

test('V2-4 size: baseline re-registration history is retained and monotonic', () => {
  const history = [...SIDEPANEL_BASELINE_BYTES_HISTORY];
  assert.ok(history.includes(1_068_165), 'v1 值保留');
  assert.ok(history.includes(1_085_389), 'V2-2 值保留');
  assert.ok(history.includes(1_110_744), 'V2-3 值保留');
  assert.ok(history.includes(1_132_748), 'V2-4 值保留');
  assert.ok(history.includes(1_159_856), 'v2 R2 值保留');
  assert.ok(history.includes(1_162_942), 'R2 收口实测值保留');
  for (let i = 1; i < history.length; i += 1) {
    assert.ok(history[i] >= history[i - 1], 'HISTORY 必须单调不减');
  }
  // v3-1 提升轮（I6 修复轮重述）：当前基线必须严格**高于上一轮登记值**（方向显式；
  // 静默上调不可能）；但 ceiling **不得**随基线提升而抬高 —— 只允许持平或下降。
  assert.ok(
    SIDEPANEL_BASELINE_BYTES > SIDEPANEL_BASELINE_META.previousBaselineBytes,
    `v3-1 提升轮后当前基线 ${SIDEPANEL_BASELINE_BYTES}B 必须严格大于上一轮 ${SIDEPANEL_BASELINE_META.previousBaselineBytes}B`,
  );
  assert.ok(
    SIDEPANEL_CEILING <= SIDEPANEL_BASELINE_META.previousCeilingBytes,
    `ceiling ${SIDEPANEL_CEILING}B 不得高于上一轮 ceiling ${SIDEPANEL_BASELINE_META.previousCeilingBytes}B（只降不升，I6）`,
  );
});

test('V2-4 size: re-registration meta carries date/source/reason and is NOT a target budget', () => {
  assert.equal(SIDEPANEL_BASELINE_META.measuredOn, '2026-09-16');
  assert.equal(SIDEPANEL_BASELINE_META.source, 'packages/web-cli-plugin/dist/sidepanel.js');
  assert.equal(SIDEPANEL_BASELINE_META.buildCommand, 'npm run build --workspace @lgdl/web-cli-plugin');
  assert.ok(SIDEPANEL_BASELINE_META.note.includes('提升'), 'note 必须写明本轮重登记方向（基线提升）');
  assert.ok(SIDEPANEL_BASELINE_META.note.includes('未抬高'), 'note 必须写明 ceiling 未被抬高（I6）');
  assert.ok(SIDEPANEL_BASELINE_META.note.includes('327,679'), 'note 必须写明本轮实测值 327,679');
  assert.ok(SIDEPANEL_BASELINE_META.note.includes('295,225'), 'note 必须保留前值 295,225（本轮上一轮）');
  assert.ok(SIDEPANEL_BASELINE_META.note.includes('291,523'), 'note 必须保留前值 291,523（含其产物 294,874 的失真点）');
  assert.ok(SIDEPANEL_BASELINE_META.note.includes('266,500'), 'note 必须保留更早前值 266,500（历史可核）');
  // 历史保留：V2-4 / v2 R2 的重登记事实仍可在 HISTORY 中核对（不因新一轮收紧而丢失）。
  assert.ok(SIDEPANEL_BASELINE_BYTES_HISTORY.includes(1_132_748), 'V2-4 历史值保留');
  assert.ok(SIDEPANEL_BASELINE_BYTES_HISTORY.includes(1_159_856), 'v2 R2 历史值保留');
  assert.match(
    SIDEPANEL_BASELINE_META.reRegisteredFrom,
    /295,225 B/,
    'reRegisteredFrom 必须写明上一轮基线（295,225 B）',
  );
  assert.match(
    SIDEPANEL_BASELINE_META.reRegisteredFrom,
    /291,523 B/,
    'reRegisteredFrom 必须保留更早一轮基线（291,523 B）',
  );
  assert.match(
    SIDEPANEL_BASELINE_META.reRegisteredFrom,
    /306,099 B/,
    'reRegisteredFrom 必须写明上一轮 ceiling（306,099 B）',
  );
  assert.match(
    SIDEPANEL_BASELINE_META.reRegisteredFrom,
    /266,500 B/,
    'reRegisteredFrom 必须保留更早一轮基线（266,500 B）',
  );
  assert.match(
    SIDEPANEL_BASELINE_META.reRegisteredFrom,
    /279,825 B/,
    'reRegisteredFrom 必须保留更早一轮 ceiling（279,825 B）',
  );
  assert.equal(SIDEPANEL_BASELINE_META.targetBudgetBytes, null);
  assert.equal(SIDEPANEL_BASELINE_META.targetMet, null);
});

test('V2-4 size: ceiling stays structurally consistent (min(floor(baseline × 1.05), cap))', () => {
  assert.equal(
    SIDEPANEL_CEILING,
    Math.min(Math.floor(SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE)), SIDEPANEL_CEILING_CAP),
  );
  assert.equal(
    SIDEPANEL_CEILING_UNCAPPED,
    Math.floor(SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE)),
    '未加 cap 的公式值必须 = floor(baseline × 1.05)',
  );
  assert.equal(SIDEPANEL_CEILING, 306_099, 'v3-1 I6 后 ceiling 仍 = 306,099（cap 生效，未抬高）');
  const over = evaluateSidepanelSize(SIDEPANEL_CEILING + 1);
  assert.equal(over.ok, false);
  assert.equal(over.ceilingBytes, SIDEPANEL_CEILING_CAP, 'cap 生效时纯判定函数的 ceiling 也必须取 cap');
  assert.throws(
    () => assert.equal(over.ok, true, over.message),
    /体积回归/,
    '反证：重登记后 ceiling + 1 仍必须 FAIL',
  );
  // 反证（cap 的真实性）：若把 cap 放开到公式值，同一实测会从 FAIL 变 PASS —— 证明
  // 「只降不升」是真的在收紧，而不是一句注释。
  const uncapped = evaluateSidepanelSize(SIDEPANEL_CEILING + 1, SIDEPANEL_BASELINE_BYTES, 0.05, Number.POSITIVE_INFINITY);
  assert.equal(uncapped.ok, true, '反证前提：无 cap 时该实测会 PASS（本轮的 3,887B 余量就是这样来的）');
  assert.ok(uncapped.ceilingBytes > SIDEPANEL_CEILING_CAP, '反证前提：无 cap 的 ceiling 更高');
});

test('V2-4 size: content.js source files are frozen by content hash (zero-injection red line)', () => {
  for (const [file, pinned] of Object.entries(CONTENT_SOURCE_SHA256)) {
    const text = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert.equal(
      createHash('sha256').update(text, 'utf8').digest('hex'),
      pinned,
      `${file} 内容哈希漂移（零注入红线：src/content/** 不得改动；若为有意改动须显式更新 pin 并注明日期与理由）`,
    );
  }
  // 反证：改一个字节必须改变哈希（不得虚绿）
  const victim = 'src/content/content-script.ts';
  const text = readFileSync(new URL(`../../${victim}`, import.meta.url), 'utf8');
  assert.notEqual(
    createHash('sha256').update(`${text} `, 'utf8').digest('hex'),
    CONTENT_SOURCE_SHA256[victim],
    '反证：追加一字节必须改变内容哈希',
  );
  assert.equal(CONTENT_MAX_BYTES, 177_076);
  const size = readArtifactSize(distArtifact('content.js'));
  if (size !== undefined) {
    assert.equal(evaluateContentCeiling(size).ok, true, `content.js ${size}B > ${CONTENT_MAX_BYTES}B`);
  }
});

