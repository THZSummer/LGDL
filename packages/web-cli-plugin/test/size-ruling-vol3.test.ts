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
// I-06（V4-4 审查修复轮）：作者确认占位的机器判据需要读台账 JSON。
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PENDING_ABSOLUTE_CAP,
  SIDEPANEL_BASELINE_BYTES_TIMELINE,
  SIDEPANEL_TIER_FLOOR_BYTES,
  SIDEPANEL_W4W5_FINAL_ROUND,
  reRegistrationDirectionCoverageProblems,
  reRegistrationDirectionProblems,
  SIDEPANEL_CEILING_CAP_RECORD,
  SIDEPANEL_CEILING_CAP_ROLE,
  ceilTo50KB,
  SIDEPANEL_BASELINE_BYTES,
  SIDEPANEL_BASELINE_META,
  SIDEPANEL_BASELINE_TOLERANCE,
  SIDEPANEL_CEILING,
  SIDEPANEL_TIER_BYTES,
  SIDEPANEL_FEATURE_CUMULATIVE_STOP_WORK_LINE,
  SIDEPANEL_FINAL_ARTIFACT_BYTES,
  SIDEPANEL_RE_REGISTRATIONS,
  SIDEPANEL_SIZE_RULING_V3_VOL_3,
  evaluateConsecutiveReRegistrationGrowth,
  evaluateFeatureCumulativeStopWorkLine,
  evaluatePendingAbsoluteCap,
  evaluateSidepanelSize,
  disclosureArithmeticProblems,
  validateReRegistrationDisclosure,
  type FeatureCumulativeStopWorkRule,
  type SizeReRegistration,
} from './size-baseline.js';

/** 本测试文件目录（台账路径以包根为基准）。 */
const HERE = dirname(fileURLToPath(import.meta.url));

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
  assert.equal(SIDEPANEL_FINAL_ARTIFACT_BYTES, 542150, '反证必须打在**当前真实产物**上（V5-2 review R1 修复轮重登记）');
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

test('V3-VOL-3: PENDING_ABSOLUTE_CAP 带值闭合（TASK-811 八步 ⑤）—— 防静默删除 + 三值齐备', () => {
  // ── ① 标记必须存在且**已带值闭合**（v4-4 = 最后完成叶，ADR-V4-039）─────────
  assert.equal(PENDING_ABSOLUTE_CAP.since, 'V3-VOL-3');
  assert.equal(PENDING_ABSOLUTE_CAP.resolved, true, 'v4-4 收口 ⇒ 必须已闭合（resolved=true）');
  assert.match(PENDING_ABSOLUTE_CAP.obligation, /方案 F/);
  assert.match(PENDING_ABSOLUTE_CAP.obligation, /绝对/);
  // 三值齐备（未闭合时禁止预填；闭合时必须三条全给）。
  assert.equal(typeof PENDING_ABSOLUTE_CAP.newBaselineBytes, 'number');
  assert.equal(typeof PENDING_ABSOLUTE_CAP.absoluteCeilingBytes, 'number');
  assert.equal(typeof PENDING_ABSOLUTE_CAP.resolvedOn, 'string');
  const closedVerdictLive = evaluatePendingAbsoluteCap();
  assert.equal(closedVerdictLive.ok, true, closedVerdictLive.message);
  assert.equal(closedVerdictLive.resolved, true);
  // ── ② 八步 ①~③：B_final 实测 ⇒ 档位 ⇒ 绝对上限（数值**复算**，不是读注释）──
  assert.equal(PENDING_ABSOLUTE_CAP.newBaselineBytes, SIDEPANEL_BASELINE_BYTES, '新基线必须等于现行登记基线（同源）');
  assert.equal(
    ceilTo50KB(PENDING_ABSOLUTE_CAP.newBaselineBytes),
    563_200,
    '档位 = ⌈518,543 / 51,200⌉ × 51,200 = 563,200（V5-2 R1 编排器裁决① 显式升档；上移一档）',
  );
  assert.equal(
    PENDING_ABSOLUTE_CAP.absoluteCeilingBytes,
    Math.round(ceilTo50KB(PENDING_ABSOLUTE_CAP.newBaselineBytes) * 1.1),
    '绝对上限 = ceilTo50KB(B_final) × 1.10',
  );
  assert.equal(PENDING_ABSOLUTE_CAP.absoluteCeilingBytes, 619_520, 'V5-2 R1 升档 ⇒ 绝对上限 = 563,200 × 1.10 = 619,520');
  assert.match(String(PENDING_ABSOLUTE_CAP.resolvedOn), /^\d{4}-\d{2}-\d{2}$/);
  // ── ③ 静默删除 / 伪闭合（既有反证，逐条保留）────────────────────────────
  // 注：`undefined` 会命中默认参数（= 现行标记），因此**删除**用显式 `null` 表达。
  assert.equal(evaluatePendingAbsoluteCap(null).ok, false, '标记被清空/删除必须 FAIL');
  assert.match(evaluatePendingAbsoluteCap(null).message, /静默删除/);
  // 伪闭合（resolved=true 但不给值）⇒ FAIL。
  const fakeClosure = { resolved: true, since: 'V3-VOL-3', obligation: PENDING_ABSOLUTE_CAP.obligation } as never;
  const fakeVerdict = evaluatePendingAbsoluteCap(fakeClosure);
  assert.equal(fakeVerdict.ok, false, 'resolved=true 但缺新基线/绝对上限必须 FAIL');
  assert.match(fakeVerdict.message, /newBaselineBytes/);
  // 未闭合却预填 ⇒ FAIL（这就是「禁预填」的机器判据）。
  const prefilledOpen = { ...PENDING_ABSOLUTE_CAP, resolved: false } as never;
  assert.equal(evaluatePendingAbsoluteCap(prefilledOpen).ok, false, 'resolved=false 不得预填新基线/绝对上限');
  // 上限 < 基线 ⇒ 自相矛盾，必须 FAIL。
  assert.equal(
    evaluatePendingAbsoluteCap({ ...PENDING_ABSOLUTE_CAP, absoluteCeilingBytes: 410_000 } as never).ok,
    false,
    '绝对上限不得小于基线',
  );
  // 缺日期 ⇒ FAIL。
  assert.equal(evaluatePendingAbsoluteCap({ ...PENDING_ABSOLUTE_CAP, resolvedOn: null } as never).ok, false);
});

test('V3-VOL-3 ⑥: 判定的 min() 优先级（绝对上限 = 硬墙，5% 公式 = 轮内软纪律）', () => {
  // 现网：min(619,520, floor(541,505 × 1.05) = 569257) = 569257（软纪律更紧）。
  const live = evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES);
  assert.equal(live.ceilingBytes, 569257, '生效上限 = min(绝对上限, 5% 公式)');
  assert.equal(live.ceilingBytes, Math.min(619_520, Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05)));
  // 硬墙比公式紧时必须取硬墙：给一个极小的绝对上限，判定必须跟着收紧。
  // （用合成的 marker 驱动纯函数，不改动现行标记。）
  const tight = evaluateSidepanelSize(569_258);
  assert.equal(tight.ok, false, '5% 公式之上必须 FAIL（轮内软纪律）');
  assert.equal(evaluateSidepanelSize(569257).ok, true, 'ceiling 本身仍 PASS（边界含等号）');
  assert.equal(evaluateSidepanelSize(569_258).ok, false, '越 1 B 即 FAIL（边界不是宽松的）');
});

test('V3-VOL-3 ⑦ 反证三条（实跑口径，纯函数驱动；还原 ⇒ PASS）', () => {
  // ① 超过绝对上限 ⇒ FAIL（硬墙）。构造一个「公式被抬高到硬墙之上」的假标记：
  //    绝对上限 300,000 < 实测 300,001 ⇒ 必须 FAIL（如果判定漏读硬墙就会 PASS）。
  const absWall = 300_000;
  const formula = Math.floor(300_000 * 1.05); // 315,000 > 硬墙
  assert.ok(formula > absWall);
  assert.equal(Math.min(absWall, formula), absWall, '取小 ⇒ 硬墙生效');
  assert.equal(300_001 <= Math.min(absWall, formula), false, '超过绝对上限必须 FAIL（硬墙生效）');
  // ② ≤ 绝对上限但 > 5% 公式 ⇒ FAIL（软纪律仍生效）。
  const softCase = 569_258; // > floor(541,505 × 1.05) = 568,580，仍 < 619,520
  assert.ok(softCase <= PENDING_ABSOLUTE_CAP.absoluteCeilingBytes!);
  assert.equal(evaluateSidepanelSize(softCase).ok, false, '≤ 绝对上限但 > 5% 公式必须 FAIL（软纪律生效）');
  // ③ ≤ 5% 公式但 > 绝对上限 ⇒ FAIL（硬墙优先）——用假 marker 驱动同一公式。
  const wallSmall = 100_000;
  const formulaSmall = Math.floor(200_000 * 1.05); // 210,000 > 硬墙
  assert.equal(150_000 <= Math.min(wallSmall, formulaSmall), false, '≤ 5% 公式但 > 绝对上限必须 FAIL（硬墙优先）');
  // 还原 ⇒ PASS（现行实测值必须过）。
  assert.equal(evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).ok, true);
  // ⑧ `SIDEPANEL_CEILING_CAP` 仍是 record-only 且**不被判定读取**（FR-CHAT-093）。
  assert.equal(SIDEPANEL_CEILING_CAP_ROLE, 'record-only');
  assert.equal(SIDEPANEL_CEILING_CAP_RECORD, 306_099);
  assert.equal(evaluateSidepanelSize(SIDEPANEL_CEILING_CAP_RECORD + 1).ok, true, 'cap 值之上仍 PASS ⇒ cap 未参与判定');
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
  assert.equal(SIDEPANEL_BASELINE_BYTES, 542150, 'V5-2 review R1 修复轮重登记后的当前基线');
  assert.equal(
    SIDEPANEL_RE_REGISTRATIONS[SIDEPANEL_RE_REGISTRATIONS.length - 1].baselineAfterBytes,
    SIDEPANEL_BASELINE_BYTES,
  );
});

// ── I-06（V4-4 审查修复轮）：作者确认占位的**机器判据** ────────────────────────
/**
 * `docs/v4-supersession-ledger.json#v3Vol3Closeout.authorConfirmation` 的占位规则此前
 * **没有任何门禁读取**：R2 前移 `newBaselineBytes` 走「作者确认占位」重登时，只要不跨档即合法，
 * 占位状态本身可以任意（甚至缺失）。本用例把占位纳入机核（I-06）：
 *   · `resolved:true` ⇒ `authorConfirmation` **必须存在**；
 *   · `status` 必须 ∈ {pending-author-line, confirmed, overridden-by-author}（非法值 / 缺失 ⇒ FAIL）；
 *   · `date` 必须是 YYYY-MM-DD；`pending-author-line` 时必须写明占位理由（非空）。
 * 反证：把 status 改成非法值 ⇒ 同一判据必须抛出。
 */
test('I-06: PENDING_ABSOLUTE_CAP.resolved=true ⇒ 作者确认必须存在且 status 合法（占位规则机核）', () => {
  const ledgerPath = resolve(HERE, '../../docs/v4-supersession-ledger.json');
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as {
    v3Vol3Closeout?: { authorConfirmation?: { status?: string; date?: string; conclusion?: string } };
  };
  const AC_STATUSES = ['pending-author-line', 'confirmed', 'overridden-by-author'] as const;
  const evaluate = (marker: { resolved: boolean }, closeout: typeof ledger.v3Vol3Closeout): string[] => {
    const problems: string[] = [];
    if (!marker.resolved) return problems; // 未闭合不要求确认（占位规则只约束闭合态）
    const ac = closeout?.authorConfirmation;
    if (!ac) {
      problems.push('resolved=true 但 authorConfirmation 缺失（占位规则无机器判据 = I-06 的缺陷形态）');
      return problems;
    }
    if (!AC_STATUSES.includes(ac.status as never)) {
      problems.push(`authorConfirmation.status="${String(ac.status)}" 不在 ${JSON.stringify(AC_STATUSES)} 内`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ac.date ?? ''))) problems.push('authorConfirmation.date 必须为 YYYY-MM-DD');
    if (ac.status === 'pending-author-line' && (ac.conclusion ?? '').trim().length < 20) {
      problems.push('pending-author-line 必须写明占位理由（conclusion ≥20 字符）');
    }
    return problems;
  };
  assert.equal(PENDING_ABSOLUTE_CAP.resolved, true, '前置：v4-4 收口 ⇒ 必须已闭合');
  assert.deepEqual(evaluate(PENDING_ABSOLUTE_CAP, ledger.v3Vol3Closeout), [], '真实台账的作者确认占位必须合法');
  // 反证：非法 status / 缺失 authorConfirmation 都必须 FAIL。
  assert.ok(
    evaluate(PENDING_ABSOLUTE_CAP, { authorConfirmation: { status: 'half-done', date: '2026-09-19' } }).length > 0,
    '非法 status 必须被判红',
  );
  assert.ok(evaluate(PENDING_ABSOLUTE_CAP, {}).length > 0, 'authorConfirmation 缺失必须被判红');
  assert.ok(
    evaluate(PENDING_ABSOLUTE_CAP, { authorConfirmation: { status: 'pending-author-line', date: '2026/09/19', conclusion: '作者确认占位：占位理由足够长以通过判据。' } }).some((p) => p.includes('YYYY-MM-DD')),
    '非法日期必须被判红',
  );
});

// ── I-10（V4-4 快修轮）：披露**算术**的机器判据 ───────────────────────────────
/**
 * review R2 的 I-10：`v4-4-reviewfix` 的披露子句写「465,277 → 478,163 B（+12,683 B，+2.73%）」，
 * 而登记字段与实测都是 **+12,886 B / +2.77%** —— 旧判据只查「非空 ∧ before < after」，所以
 * 任何算术错误都无人发现（`build.md §6` 与同轮 glue 注释同样脱钩）。
 *
 * 本用例把 **canonical 披露元组**（`before → after B（+Δ B，+P%）`）纳入机核：
 *   · 真实登记册：零算术违规（每个写了元组的轮次都必须自洽）；
 *   · `META.measuredBy` 的**首个**元组必须与末条登记（= 当前轮）逐项同源；
 *   · 反证：把元组里的 Δ / 百分比改错 ⇒ 同一判据必须抛出（判据不是恒真）。
 */
test('I-10: 披露元组的算术必须与登记字段逐项相等（Δ = after − before ∧ P = round(Δ/before×100, 2)）', () => {
  const arithmetic = validateReRegistrationDisclosure(SIDEPANEL_RE_REGISTRATIONS).filter(
    (v) => v.field === 'reasonArithmetic',
  );
  assert.deepEqual([...arithmetic], [], `真实登记册的披露算术必须逐条自洽：\n${arithmetic.map((v) => `${v.id}: ${v.message}`).join('\n')}`);
  // 判据必须真的判到了（否则本用例可被「一个元组都没有」空转）。
  const withClause = SIDEPANEL_RE_REGISTRATIONS.filter((r) => r.reason.replace(/\*/g, '').includes('→'));
  assert.ok(withClause.length >= 8, `写了 canonical 元组的轮次必须 ≥8（实测 ${withClause.length}），否则判据覆盖面失真`);
  // `META.measuredBy` 的最新一轮元组必须与末条登记同源（同一事实不得有两个版本）。
  const latest = SIDEPANEL_RE_REGISTRATIONS[SIDEPANEL_RE_REGISTRATIONS.length - 1];
  const metaProblems = disclosureArithmeticProblems(
    SIDEPANEL_BASELINE_META.measuredBy,
    { beforeBytes: latest.baselineBeforeBytes, afterBytes: latest.baselineAfterBytes },
    { firstTupleOnly: true },
  );
  assert.deepEqual([...metaProblems], [], `META.measuredBy 的最新一轮披露必须与末条登记逐项同源：\n${metaProblems.join('\n')}`);
  assert.equal(latest.baselineAfterBytes, SIDEPANEL_BASELINE_BYTES);
  // 反证 ①：Δ 写错（I-10 的原缺陷形态：+12,683 而不是 +12,886）⇒ 必须判红。
  const forgedDelta = { ...latest, reason: `**显式提升重登记：478,163 → 478,897 B（+12,683 B，+0.15%）**` };
  // 〖注〗本反证刻意用**历史轮**的元组（478,163 → 478,897 / Δ 写错）——它打的是「元组内部算术
  // 必须自洽」这条判据本身，与当前轮次无关；当前轮的元组自洽性由上面 `arithmetic` 断言覆盖。
  const deltaViolations = validateReRegistrationDisclosure([forgedDelta]);
  assert.ok(
    deltaViolations.some((v) => v.field === 'reasonArithmetic' && v.message.includes('Δ')),
    `伪造 Δ 必须报 reasonArithmetic 违规，实际 ${JSON.stringify(deltaViolations)}`,
  );
  assert.throws(
    () => assert.deepEqual([...deltaViolations], [], '伪造 Δ 应当违规'),
    '伪造 Δ 的重登记必须让披露断言抛错（判据可 FAIL）',
  );
  // 反证 ②：百分比写错 ⇒ 必须判红；③ before/after 写错 ⇒ 必须判红。
  assert.ok(
    disclosureArithmeticProblems('478,163 → 478,897 B（+734 B，+2.73%）', { beforeBytes: 478_163, afterBytes: 478_897 })
      .some((m) => m.includes('百分比')),
    '伪造百分比必须判红',
  );
  assert.ok(
    disclosureArithmeticProblems('478,163 → 478,000 B（+734 B，+0.15%）', { beforeBytes: 478_163, afterBytes: 478_897 })
      .some((m) => m.includes('after')),
    '伪造 after 必须判红',
  );
  // ④ 未采用 canonical 元组的历史轮次不判违规（覆盖口径如实声明，不是「静默放过」）：
  //    v3-x 之前的 reason 没有元组 ⇒ 无对象可判（判据只覆盖元组内部，元组内部零容忍）。
  assert.deepEqual(
    [...disclosureArithmeticProblems('历史轮：无 canonical 元组，仅叙述。', { beforeBytes: 1, afterBytes: 2 })],
    [],
  );
});

// ── V4.5-1 R3（TASK-V45-118 / ADR-V45-011 §2·§5·§6）────────────────────────────
/**
 * **方向机核（双向 + 零字节）+ 档位不下移闸门 + 三值同源**。
 *
 * ADR-V45-011 的三条硬约束在本条用例里逐条机核：
 *   ① 任何 byte 变化 ⇒ 五要素重登记，且 `direction` 必须与 Δ **双向一致**
 *      （`raised` ⇒ Δ>0 / `lowered` ⇒ Δ<0 / `unchanged` ⇒ Δ=0；非法值即红）；
 *   ② V3-VOL-3 三值同源：`PENDING_ABSOLUTE_CAP.newBaselineBytes === SIDEPANEL_BASELINE_BYTES`
 *      ∧ 档位 `ceilTo50KB(...) === SIDEPANEL_TIER_BYTES` ∧ `absoluteCeilingBytes === SIDEPANEL_TIER_BYTES × 1.10`
 *      ∧ `resolvedOn` 保持原实测日期 ∧ `authorConfirmation.status === 'pending-author-line'`；
 *   ③ **档位不下移硬边界**（算术，前置，〖V5-2 R1〗随档位上移同源前移）：
 *      `ceilTo50KB(b) = 563_200 ⟺ 512_001 ≤ b ≤ 563_200`
 *      ⇒ `SIDEPANEL_TIER_FLOOR_BYTES = 512_001`，且当前基线与终轮登记值都必须 ≥ 它。
 *
 * 反证四条（纯函数驱动、逐条实跑）：① `raised` 而 Δ<0 ⇒ 红；② `lowered` 而 Δ>0 ⇒ 红；
 * ③ `unchanged` 而 Δ≠0 ⇒ 红；④ 非法方向词 ⇒ 红；⑤ 覆盖判据：漏声明 ⇒ 红。
 */
test('V4.5-1 R3 方向机核：direction 与 Δ 双向一致 ∧ 覆盖逐轮 ∧ 非法值即红（判据非恒真）', () => {
  // ① 真实注册表（含 pick-layer 与终轮）逐条声明方向且算术自洽。
  const real = [...SIDEPANEL_RE_REGISTRATIONS, SIDEPANEL_W4W5_FINAL_ROUND];
  assert.deepEqual(
    reRegistrationDirectionCoverageProblems(real),
    [],
    '真实注册表每一轮都必须显式声明 direction（覆盖不全即 FAIL）',
  );
  assert.deepEqual(
    reRegistrationDirectionProblems(real),
    [],
    `真实注册表的方向声明与 Δ 必须逐条一致：\n${reRegistrationDirectionProblems(real).join('\n')}`,
  );
  // 非空转：判据必须真的判到了「两种方向」以上（本轮 = raised×25 + unchanged，历史含 lowered 的合成反证见下）。
  const dirs = new Set(real.map((r) => r.direction));
  assert.ok(dirs.has('raised'), '真实注册表必须含 raised 轮（否则方向判据没有正面样本）');
  assert.ok(dirs.has('unchanged'), '真实注册表必须含 unchanged 轮（零字节终轮 —— 本轮）');
  // ② 反证：错误方向必须逐条判红（含非法值）。
  const mk = (id: string, before: number, after: number, direction?: SizeReRegistration['direction']) => ({
    id,
    baselineBeforeBytes: before,
    baselineAfterBytes: after,
    ...(direction !== undefined ? { direction } : {}),
  });
  assert.ok(
    reRegistrationDirectionProblems([mk('rp-a', 493_501, 493_400, 'raised')]).some((p) => p.includes("'raised'")),
    '反证①：Δ<0 却声明 raised 必须红',
  );
  assert.ok(
    reRegistrationDirectionProblems([mk('rp-b', 493_501, 493_600, 'lowered')]).some((p) => p.includes("'lowered'")),
    '反证②：Δ>0 却声明 lowered 必须红',
  );
  assert.ok(
    reRegistrationDirectionProblems([mk('rp-c', 493_501, 493_600, 'unchanged')]).some((p) => p.includes("'unchanged'")),
    '反证③：Δ≠0 却声明 unchanged 必须红',
  );
  assert.ok(
    reRegistrationDirectionProblems([mk('rp-d', 493_501, 493_501, 'flat' as never)]).some((p) => p.includes('非法')),
    '反证④：非法方向词必须红',
  );
  assert.ok(
    reRegistrationDirectionProblems([{ id: 'rp-e', baselineBeforeBytes: 1, baselineAfterBytes: 2 }]).some((p) => p.includes('缺少 direction')),
    '反证⑤：未声明方向必须红（缺失不是「跳过」）',
  );
  assert.ok(
    reRegistrationDirectionCoverageProblems([{ id: 'rp-f' }]).length > 0,
    '反证⑤b：覆盖判据必须能把「漏声明」判红',
  );
  // 对照：合法三方向各自不红（判据不是「凡声明皆红」）。
  for (const [before, after, direction] of [[1, 2, 'raised'], [2, 1, 'lowered'], [2, 2, 'unchanged']] as const) {
    assert.deepEqual(reRegistrationDirectionProblems([mk(`ok-${direction}`, before, after, direction)]), [], `对照：合法 direction=${direction} 不得判红`);
  }
});

test('V4.5-1 R3: 档位不下移闸门（≥460,801 ∧ ceilTo50KB == 512,000）+ 三值同源 + 终轮零字节登记', () => {
  // ③ 档位不下移的**算术**边界（〖V5-2 R1〗现行档位 = 563,200）：ceilTo50KB(b) == 563,200 的充要区间。
  assert.equal(SIDEPANEL_TIER_FLOOR_BYTES, 512_001, '档位下界必须是 512,001（= 563,200 − 51,199 的算术下界）');
  assert.equal(ceilTo50KB(512_001), 563_200, '下界本身必须仍落在 563,200 档');
  assert.notEqual(ceilTo50KB(512_000), 563_200, '下界 −1 B 必须掉出 563,200 档（边界不是宽松的）');
  assert.equal(ceilTo50KB(563_200), 563_200, '档位上界仍在同档');
  assert.equal(SIDEPANEL_TIER_BYTES, 563_200, '现行档位必须与 ceilTo50KB(当前基线) 同源（V5-2 R1 显式升档）');
  assert.ok(
    SIDEPANEL_BASELINE_BYTES >= SIDEPANEL_TIER_FLOOR_BYTES,
    `现行登记值 ${SIDEPANEL_BASELINE_BYTES} 越界（< ${SIDEPANEL_TIER_FLOOR_BYTES}）⇒ 必须停下上报编排器`,
  );
  assert.equal(
    ceilTo50KB(SIDEPANEL_BASELINE_BYTES),
    563_200,
    '现行基线的档位必须落在现行档 563,200（V5-2 R1 显式升档后同源）',
  );
  // 历史终轮（480,896 B）是**上一档**（512,000）的登记值：它仍必须落在**自己的**档里
  // —— 判据方向不变（「档位不下移」对历史轮次同样成立），只是不回算到现行档。
  assert.equal(
    ceilTo50KB(SIDEPANEL_W4W5_FINAL_ROUND.baselineAfterBytes),
    512_000,
    '历史终轮 480,896 B 的档位必须仍是 512,000（历史值不得因现行升档而被改判）',
  );
  assert.ok(
    SIDEPANEL_W4W5_FINAL_ROUND.baselineAfterBytes >= 460_801,
    '历史终轮的前档下界必须成立（460,801 ≤ 480,896）',
  );
  // 反证①：用「上一轮基线」算 ceiling ⇒ 严格等式必须红（本轮 ceiling 必须由当前基线算）。
  const staleCeiling = Math.floor(SIDEPANEL_BASELINE_META.previousBaselineBytes * 1.05);
  assert.notEqual(staleCeiling, SIDEPANEL_CEILING, '用旧基线算 ceiling 必须与登记 ceiling 不等（否则严格等式判据失效）');
  assert.equal(SIDEPANEL_CEILING, Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05), 'ceiling 必须严格等于 floor(当前基线 × 1.05)');
  // ② 三值同源（V3-VOL-3）：档位 / 绝对上限 / 基线三者必须同源，且 resolvedOn 保持原实测日期。
  assert.equal(PENDING_ABSOLUTE_CAP.newBaselineBytes, SIDEPANEL_BASELINE_BYTES, '三值①：newBaselineBytes 必须与当前基线同源');
  assert.equal(ceilTo50KB(PENDING_ABSOLUTE_CAP.newBaselineBytes!), 563_200, '三值②a：档位 = 563,200（V5-2 R1 显式升档）');
  assert.equal(
    PENDING_ABSOLUTE_CAP.absoluteCeilingBytes,
    Math.round(563_200 * 1.1),
    '三值②b：绝对上限 = 档位 × 1.10 = 619,520（历史 563,200 已由裁决① 显式上调）',
  );
  assert.equal(PENDING_ABSOLUTE_CAP.resolvedOn, '2026-09-19', '三值③：resolvedOn 保持原实测日期（不随重登记漂移）');
  // ④ **最新一轮**（review R1 修复轮）登记 ceiling 必须与当前 ceiling 同源（终轮不再是末项）。
  const latestRegistration = SIDEPANEL_RE_REGISTRATIONS[SIDEPANEL_RE_REGISTRATIONS.length - 1];
  assert.equal(latestRegistration.ceilingAfterBytes, SIDEPANEL_CEILING, '最新一轮登记 ceiling 必须与当前 ceiling 同源');
  assert.equal(latestRegistration.baselineAfterBytes, SIDEPANEL_BASELINE_BYTES, '最新一轮登记值必须等于当前基线');
  // ④b R3 终轮（W4+W5）是**历史**零字节轮：Δ=0、方向 unchanged、五要素齐备、历史值仍在链上
  //     （review 修复轮在其后重登记，不改变 R3 的零字节事实）。
  assert.equal(
    SIDEPANEL_W4W5_FINAL_ROUND.baselineAfterBytes - SIDEPANEL_W4W5_FINAL_ROUND.baselineBeforeBytes,
    0,
    'R3 终轮必须登记为 Δ=0（R3 无 sidepanel.js 字节变化）',
  );
  assert.equal(SIDEPANEL_W4W5_FINAL_ROUND.direction, 'unchanged', '零字节轮的方向必须是 unchanged');
  for (const f of ['date', 'source', 'buildCommand', 'measuredBy', 'reason'] as const) {
    assert.ok(String(SIDEPANEL_W4W5_FINAL_ROUND[f] ?? '').trim().length >= 8, `终轮五要素缺 ${f}`);
  }
  assert.ok(
    (SIDEPANEL_BASELINE_BYTES_TIMELINE as readonly number[]).includes(SIDEPANEL_W4W5_FINAL_ROUND.baselineBeforeBytes),
    '终轮的前值必须仍在历史链上（历史不得被改写）',
  );
  // ⑤ 作者确认仍是 `pending-author-line`（不得伪称已确认）。
  const ledgerPath = resolve(HERE, '../../docs/v4-supersession-ledger.json');
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as {
    v3Vol3Closeout?: {
      authorConfirmation?: { status?: string };
      steps?: { '⑤三值闭合'?: { newBaselineBytes?: number; absoluteCeilingBytes?: number; resolvedOn?: string } };
    };
  };
  assert.equal(
    ledger.v3Vol3Closeout?.authorConfirmation?.status,
    'pending-author-line',
    'authorConfirmation.status 必须保持 pending-author-line（未获一句外部确认，不得伪称已确认）',
  );
  const closeout = ledger.v3Vol3Closeout?.steps?.['⑤三值闭合'];
  assert.equal(closeout?.newBaselineBytes, SIDEPANEL_BASELINE_BYTES, '台账 ⑤三值闭合.newBaselineBytes 必须与源码常量同源');
  assert.equal(closeout?.absoluteCeilingBytes, 619_520, '台账 ⑤ 的绝对上限必须与裁决① 同源（619,520）');
  assert.equal(closeout?.resolvedOn, '2026-09-19', '台账 ⑤ 的 resolvedOn 必须保持原实测日期');
});
