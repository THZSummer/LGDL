/**
 * 作者裁决 **V3-VOL-3**（2026-09-18，选 **B**）—— 撤销 Feature 级 40% 累计停工线。
 *
 * 本文件是**工程纪律裁决的机器落点**（not a feature change; `dist/*` zero-byte):
 *   1. 撤销是**显式登记**（`enforced: false` + `revokedBy: 'V3-VOL-3'`），不是静默删除；
 *   2. **反证**：恢复该线（`enforced: true` = 裁决前口径）⇒ 当前真实产物 375,102 B（+40.75%）
 *      的判定**必然 FAIL** —— 证明该线真实存在过，且撤销是显式的；
 *   3. **守恒自检**（保留项不得被本次裁决顺手放松，全部可 FAIL）：
 *      · 单轮 5% 容差（模拟 +6% 重登记 ⇒ FAIL）
 *      · 重登记五要素披露（缺 `reason` 的合成条目 ⇒ 违规）
 *      · 相邻两轮 >15% 告警 + `ceiling = floor(当前值 × 1.05)`（零改动）
 *   4. **新增义务（硬约束）**：`PENDING_ABSOLUTE_CAP` 必须存在且 `resolved === false`
 *      （防静默删除）；F 收口置 `true` 时必须同时给出新基线 + 绝对上限（断言本轮先写好）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PENDING_ABSOLUTE_CAP,
  SIDEPANEL_BASELINE_BYTES,
  SIDEPANEL_BASELINE_META,
  SIDEPANEL_BASELINE_TOLERANCE,
  SIDEPANEL_CEILING,
  SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE,
  SIDEPANEL_FINAL_ARTIFACT_BYTES,
  SIDEPANEL_RE_REGISTRATIONS,
  SIDEPANEL_SIZE_RULING_V3_VOL_3,
  evaluateConsecutiveReRegistrationGrowth,
  evaluateFeatureCumulativeStopWorkLine,
  evaluatePendingAbsoluteCap,
  evaluateSidepanelSize,
  validateReRegistrationDisclosure,
  type FeatureCumulativeStopWorkRule,
  type SizeReRegistration,
} from './size-baseline.js';

test('V3-VOL-3: the Feature-level 40% cumulative stop-work line is explicitly REVOKED (registered, not silently bypassed)', () => {
  // ── 裁决记录本身 ──────────────────────────────────────────────────────────
  assert.equal(SIDEPANEL_SIZE_RULING_V3_VOL_3.id, 'V3-VOL-3');
  assert.equal(SIDEPANEL_SIZE_RULING_V3_VOL_3.date, '2026-09-18');
  assert.equal(SIDEPANEL_SIZE_RULING_V3_VOL_3.decidedBy, 'author');
  assert.equal(SIDEPANEL_SIZE_RULING_V3_VOL_3.choice, 'B');
  assert.ok(
    SIDEPANEL_SIZE_RULING_V3_VOL_3.retained.length >= 4,
    '裁决必须逐项登记「保留项」（单轮 5% / 五要素披露 / 15% 告警 / ceiling 公式）',
  );
  assert.match(SIDEPANEL_SIZE_RULING_V3_VOL_3.newObligation, /方案 F/);
  assert.match(SIDEPANEL_SIZE_RULING_V3_VOL_3.newObligation, /绝对/);
  // ── 已撤销规则模型：不再判定，但撤销出处必须可读 ──────────────────────────
  assert.equal(SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE.threshold, 0.4, '历史阈值 = 40%');
  assert.equal(SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE.fromBytes, 266_500, '历史累计起点 = 266,500 B');
  assert.equal(SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE.enforced, false, '该线必须已撤销（不再参与判定）');
  assert.equal(SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE.revokedBy, 'V3-VOL-3');
  const verdict = evaluateFeatureCumulativeStopWorkLine();
  assert.equal(verdict.ok, true, verdict.message);
  assert.equal(verdict.enforced, false);
  assert.match(verdict.message, /V3-VOL-3/, '撤销后必须给出**显式**出处（静默绕过 = 违规）');
  assert.ok(verdict.cumulativePct > 0.4, `当前累计 ${(verdict.cumulativePct * 100).toFixed(2)}% 必须已越过 40%`);
  assert.equal(verdict.wouldFail, true, '历史口径下当前产物确实越线（该线真实存在过）');
  // ── 撤销也被写进活动登记（meta），历史事实逐字保留 ────────────────────────
  assert.equal(SIDEPANEL_BASELINE_META.cumulativeStopWorkLineStatus, 'revoked-by-V3-VOL-3');
  assert.match(SIDEPANEL_BASELINE_META.consecutiveGrowthAlert, /V3-VOL-3/, '活动登记必须写明撤销');
  assert.match(
    SIDEPANEL_BASELINE_META.consecutiveGrowthAlert,
    /40\.75%/,
    '撤销**不得**抹掉历史事实（+40.75% 与「R3 后越过 40% 停工线」必须逐字保留）',
  );
  assert.match(SIDEPANEL_BASELINE_META.consecutiveGrowthAlert, /40% 停工线/, '历史事实句逐字保留');
});

test('V3-VOL-3 REVERSE PROOF: restoring the 40% cumulative line FAILS on the real artifact 375,102 B (+40.75%)', () => {
  assert.equal(SIDEPANEL_FINAL_ARTIFACT_BYTES, 426_487, '反证必须打在**当前真实产物**上');
  // ① 回退裁决（恢复 40% 累计线原样：enforced=true）⇒ 必须 FAIL
  const revived: FeatureCumulativeStopWorkRule = {
    ...SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE,
    enforced: true,
  };
  const revivedVerdict = evaluateFeatureCumulativeStopWorkLine(SIDEPANEL_FINAL_ARTIFACT_BYTES, revived);
  assert.equal(revivedVerdict.enforced, true);
  assert.equal(revivedVerdict.ok, false, '恢复 40% 累计线后，当前产物必须 FAIL（证明该线真实实现过）');
  assert.ok(revivedVerdict.cumulativePct > 0.4);
  assert.match(revivedVerdict.message, /停工/, '失败文案必须点明「停工」语义');
  assert.throws(
    () => assert.equal(revivedVerdict.ok, true, revivedVerdict.message),
    /停工/,
    '反证：恢复裁决后 375,102 B 的判定必须让断言抛错（该线不是「从来没实现」的装饰文本）',
  );
  // ② 还原裁决 ⇒ PASS，且撤销出处可读（不是恒真：同一函数在上一条里刚给出 false）
  const restoredVerdict = evaluateFeatureCumulativeStopWorkLine(SIDEPANEL_FINAL_ARTIFACT_BYTES);
  assert.equal(restoredVerdict.ok, true, restoredVerdict.message);
  assert.equal(restoredVerdict.wouldFail, true, 'wouldFail 给出与 enabled 无关的真值（可核该线真实存在）');
  assert.match(restoredVerdict.message, /V3-VOL-3/);
});

test('V3-VOL-3 守恒自检：单轮 5% 容差纪律仍生效（模拟 +6% 重登记 ⇒ FAIL）', () => {
  // 裁决只撤销「Feature 级累计百分比线」，**没有**放松单轮纪律。
  const simulated = Math.ceil(SIDEPANEL_BASELINE_BYTES * 1.06);
  assert.ok(
    simulated > SIDEPANEL_CEILING,
    `模拟值 ${simulated}B 必须超出 ceiling ${SIDEPANEL_CEILING}B（否则本自检无意义）`,
  );
  const verdict = evaluateSidepanelSize(simulated);
  assert.equal(verdict.ok, false, '单轮 +6% 重登记必须 FAIL（5% 容差未被本次裁决放松）');
  assert.match(verdict.message, /体积回归/);
  assert.throws(
    () => assert.equal(verdict.ok, true, verdict.message),
    /体积回归/,
    '守恒自检必须可 FAIL（超 ceiling 的重登记不得被放过）',
  );
  // 边界不变：ceiling 本身 PASS、+1 B FAIL；容差逐字 5%。
  assert.equal(evaluateSidepanelSize(SIDEPANEL_CEILING).ok, true);
  assert.equal(evaluateSidepanelSize(SIDEPANEL_CEILING + 1).ok, false);
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05, '单轮容差必须仍是 5%');
  assert.equal(SIDEPANEL_CEILING, Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05));
  // 相邻两轮 >15% 告警（保留项）仍必然触发：v3-1 + v3-2 = +22.96%。
  const directional = evaluateConsecutiveReRegistrationGrowth();
  assert.ok(directional.warning !== null, '相邻两轮 >15% 告警是保留项，必须仍然触发');
  assert.ok(directional.cumulativePct > 0.15);
  assert.match(directional.warning ?? '', /回报编排器/);
});

test('V3-VOL-3 守恒自检：重登记五要素披露仍生效（缺 reason 的合成条目 ⇒ 违规）', () => {
  // 真实登记册必须零违规（保留项在真实数据上成立）。
  assert.deepEqual(
    [...validateReRegistrationDisclosure(SIDEPANEL_RE_REGISTRATIONS)],
    [],
    '真实重登记登记册必须满足五要素披露（前后值 / 日期 / 来源 / 理由 / 历史保留 + buildCommand/measuredBy）',
  );
  const sample = SIDEPANEL_RE_REGISTRATIONS[SIDEPANEL_RE_REGISTRATIONS.length - 1];
  const missingReason: SizeReRegistration = { ...sample, id: 'synthetic-missing-reason', reason: '' };
  const reasonViolations = validateReRegistrationDisclosure([missingReason]);
  assert.ok(
    reasonViolations.some((v) => v.field === 'reason'),
    `缺 reason 的重登记必须报违规，实际 ${JSON.stringify(reasonViolations)}`,
  );
  assert.throws(
    () => assert.deepEqual([...validateReRegistrationDisclosure([missingReason])], [], '合成条目应当违规'),
    '缺 reason 的重登记必须让披露断言抛错（守恒自检可 FAIL）',
  );
  // 缺日期 / 缺历史保留 / 方向不是增重 ⇒ 各自报违规（判据不是只认 reason 一项）。
  const missingDate: SizeReRegistration = { ...sample, id: 'synthetic-missing-date', date: '2026/09/18' };
  assert.ok(validateReRegistrationDisclosure([missingDate]).some((v) => v.field === 'date'));
  const noHistory: SizeReRegistration = { ...sample, id: 'synthetic-no-history', historyRetainedBytes: [] };
  assert.ok(validateReRegistrationDisclosure([noHistory]).some((v) => v.field === 'historyRetainedBytes'));
  const shrunk: SizeReRegistration = {
    ...sample,
    id: 'synthetic-shrunk',
    baselineBeforeBytes: sample.baselineAfterBytes,
    baselineAfterBytes: sample.baselineAfterBytes,
  };
  assert.ok(validateReRegistrationDisclosure([shrunk]).some((v) => v.field === 'baseline'));
});

test('V3-VOL-3: PENDING_ABSOLUTE_CAP 存续（防静默删除）；F 收口必须带新基线 + 绝对上限', () => {
  // ── 标记必须存在且未闭合（禁静默删除）─────────────────────────────────────
  assert.equal(PENDING_ABSOLUTE_CAP.since, 'V3-VOL-3');
  assert.equal(PENDING_ABSOLUTE_CAP.resolved, false, 'F 尚未收口 ⇒ 必须仍为未闭合');
  assert.match(PENDING_ABSOLUTE_CAP.obligation, /方案 F/);
  assert.match(PENDING_ABSOLUTE_CAP.obligation, /绝对/);
  assert.equal(PENDING_ABSOLUTE_CAP.newBaselineBytes, null, '未闭合时不得预填新基线（避免伪闭合）');
  assert.equal(PENDING_ABSOLUTE_CAP.absoluteCeilingBytes, null);
  const pending = evaluatePendingAbsoluteCap();
  assert.equal(pending.ok, true, pending.message);
  assert.equal(pending.resolved, false);
  assert.match(pending.message, /待办未闭合/);
  // 静默删除/被清空 ⇒ FAIL（这就是「不可静默删除」的机器判据）。
  // 注：`undefined` 会命中默认参数（= 现行标记），因此**删除**用显式 `null` 表达
  //     （未类型化的 JS 调用方传入的非对象同样落到这一支）。
  assert.equal(evaluatePendingAbsoluteCap(null).ok, false, '标记被清空/删除必须 FAIL');
  assert.match(evaluatePendingAbsoluteCap(null).message, /静默删除/);
  // 伪闭合（resolved=true 但不给值）⇒ FAIL。
  const fakeClosure = { ...PENDING_ABSOLUTE_CAP, resolved: true };
  const fakeVerdict = evaluatePendingAbsoluteCap(fakeClosure);
  assert.equal(fakeVerdict.ok, false, 'resolved=true 但缺新基线/绝对上限必须 FAIL');
  assert.match(fakeVerdict.message, /newBaselineBytes/);
  // ── 真闭合（F 收口时）⇒ PASS：断言本轮先写好，届时自然生效 ────────────────
  const closed = {
    ...PENDING_ABSOLUTE_CAP,
    resolved: true,
    newBaselineBytes: 420_000,
    absoluteCeilingBytes: 441_000,
    resolvedOn: '2027-01-15',
  };
  const closedVerdict = evaluatePendingAbsoluteCap(closed);
  assert.equal(closedVerdict.ok, true, closedVerdict.message);
  assert.equal(closedVerdict.resolved, true);
  assert.match(closedVerdict.message, /420,000|420000/);
  // 上限 < 基线 ⇒ 自相矛盾，必须 FAIL。
  assert.equal(
    evaluatePendingAbsoluteCap({ ...closed, absoluteCeilingBytes: 410_000 }).ok,
    false,
    '绝对上限不得小于基线',
  );
  // 缺日期 ⇒ FAIL。
  assert.equal(evaluatePendingAbsoluteCap({ ...closed, resolvedOn: null }).ok, false);
});

test('V3-VOL-3 历史保真：各轮 reason 里的「40% 停工线」逐字保留（只追加，不改写）', () => {
  const r3 = SIDEPANEL_RE_REGISTRATIONS.find((r) => r.id === 'v3-4-r3');
  assert.ok(r3, 'v3-4-r3 轮必须仍在登记册（历史不得删除）');
  assert.match(r3?.reason ?? '', /40% 停工线/, 'R3 轮 reason 的历史文本必须逐字保留');
  assert.match(r3?.reason ?? '', /40\.75%/);
  const r2 = SIDEPANEL_RE_REGISTRATIONS.find((r) => r.id === 'v3-4-r2');
  assert.ok(r2, 'v3-4-r2 轮必须仍在登记册（历史不得删除）');
  assert.match(r2?.reason ?? '', /1,774 B/, 'R2 轮 reason 的历史增量文本必须逐字保留');
  assert.match(SIDEPANEL_BASELINE_META.reason, /40% 停工线/);
  assert.match(SIDEPANEL_BASELINE_META.reason, /\+36\.13%/, 'v3-4 轮的 +36.13% 历史登记保留');
  // 撤销只许追加：HISTORY / TIMELINE 与登记链条数值不得因本次裁决变动。
  assert.equal(SIDEPANEL_BASELINE_BYTES, 426_487, 'v4-2 收口轮重登记后的当前基线');
  assert.equal(
    SIDEPANEL_RE_REGISTRATIONS[SIDEPANEL_RE_REGISTRATIONS.length - 1].baselineAfterBytes,
    SIDEPANEL_BASELINE_BYTES,
  );
});
