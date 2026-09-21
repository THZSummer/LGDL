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
  SIDEPANEL_CEILING_CAP_RECORD,
  SIDEPANEL_CEILING_CAP_ROLE,
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

test('V2-2 size: sidepanel regression ceiling is floor(baseline × 1.05) — 判定无 cap（V3-VOL-1 ①）', () => {
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05);
  assert.equal(SIDEPANEL_CEILING, Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05));
  assert.equal(
    SIDEPANEL_CEILING,
    SIDEPANEL_CEILING_UNCAPPED,
    'ceiling 必须等于「未加 cap 的公式值」——判定里不得存在任何隐藏上限',
  );
  assert.equal(SIDEPANEL_CEILING, 562612, 'ceiling = floor(507,315 × 1.05)（V4.5-1 review R1 修复轮重登记后由公式抬高）');
  // 裁决 V3-VOL-1 ②：cap 降级为**纯记录字段**，判定路径不得再读取它。
  assert.equal(SIDEPANEL_CEILING_CAP_ROLE, 'record-only', 'cap 只能是记录字段');
  assert.equal(SIDEPANEL_CEILING_CAP_RECORD, 306_099, 'cap 历史值仅作记录');
  assert.equal(SIDEPANEL_CEILING_CAP, SIDEPANEL_CEILING_CAP_RECORD);
  assert.notEqual(
    SIDEPANEL_CEILING,
    SIDEPANEL_CEILING_CAP_RECORD,
    'cap 不得再充当判定上限（否则裁决 V3-VOL-1 ② 未落地）',
  );
  // 判定不含 cap 的**机器证据**：cap 之上的实测必须 PASS，且判定函数的 ceiling 不取 cap。
  const aboveCap = evaluateSidepanelSize(SIDEPANEL_CEILING_CAP_RECORD + 1);
  assert.equal(aboveCap.ok, true, 'cap 值之上仍 PASS → cap 已不参与判定');
  assert.equal(aboveCap.ceilingBytes, SIDEPANEL_CEILING);
  // 反证：若 cap 仍在判定里，同一实测会 FAIL（cap 真的是「不再参与」而非换个名字）。
  assert.ok(SIDEPANEL_CEILING > SIDEPANEL_CEILING_CAP_RECORD, '公式值必须高于记录 cap（否则本反证无意义）');
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
  assert.ok(size <= SIDEPANEL_CEILING, `实测 ${size}B 超出公式判定上限 ${SIDEPANEL_CEILING}B`);
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
  // 上一轮 291,523 B / ceiling 306,099 B 保留为 previous*。
  // v3-3 build 轮 (2026-09-16, leaf specs-tree-v3-3-l2-on-demand-views)：按真实产物
  // **显式提升**至 349,880 B（L2 四视图 + 真值计数 + 视图替换），ceiling 由公式给出（367,374 B）。
  // v3-3 修复轮（同叶，审查 R1 后）：F-01 反证订正 + I-01 逐目标 aria-controls + expectFailPattern
  // 防呆 → 按真实产物再登记为 349,925 B（+45 B，registry-fidelity-round），ceiling floor(349,925 × 1.05) = 367,421 B。
  // v3-4 build 轮（2026-09-16，leaf specs-tree-v3-4-page-as-input）：按真实产物**显式提升**至
  // 362,777 B（+12,852 B，+3.67%）：面板侧接线（pick-input.ts 5,085 B 新模块 + sidepanel/panels/view-model/shell 接线），
  // 页面侧交互层落在独立产物 pick-layer.js（自有 PICK_LAYER_* 无容差上限）；content.js 仍 177,076 B 逐字节不变。
  // R2 缺陷修复轮（2026-09-17，收口后，作者裁决「修：退避+稳态显示」）：按真实产物**显式提升**至 368,662 B
  // （+1,774 B，+0.48%）—— 声明探测指数退避（15s→5min 封顶，按 origin 独立计数，结论变化即重置）
  // + 退避等待期的稳态「低频自动复查中」风险行（消除每 15 秒闪烁）；退避调度器在 service-worker bundle，
  // 本产物只承载面板侧接线（view-model / sidepanel / risk-rail / shell）。
  // R1 缺陷修复轮（2026-09-17，收口后）：按真实产物**显式提升**至 366,755 B（+3,978 B，+1.10%）——
  // 「无有效站点声明时拾取引用出生即死」的修复（SW declarationStatus + 摄取补全捕获事实 + D4 状态一致性）
  // 与引用回合 busy 残留修复；**该轮**六处改动全在既有模块（逐模块归因见
  // SIDEPANEL_GROWTH_BREAKDOWN.closeoutRoundRows —— 注意：那是 **R1 轮**的表，不是当前轮）；
  // content.js 177,076 B 与 pick-layer.js 33,900 B 逐字节不变（sha256 复核）。
  // ceiling 由公式抬高 floor(368,529 × 1.05) = 386,955 B；容差 5% 未动、cap 仍 record-only。
  // 〖review 修复轮 I13③〗本注释块是**历史链**（R1 → R2 → R3 → v4-1），此前停在 R1、
  // 且上一轮 ceiling 说明仍写 R1 的 385,092 B，容易被误读成「当前轮」；现补全 v4-1 轮并订正。
  // R2 缺陷修复轮（2026-09-17）：366,755 → 368,529 B（退避 + 稳态显示；四处既有模块接线）。
  // R3 缺陷修复轮（2026-09-17）：368,529 → 375,102 B（引用重锚救援；五处既有模块接线，
  // 逐模块归因见 SIDEPANEL_GROWTH_BREAKDOWN.r3RoundRows）。
  // v4-1 三区骨架轮（2026-09-19，leaf specs-tree-v4-1-zone-shell-density）：375,102 → **385,319 B**
  // （+10,217 B，+2.72%）：三区骨架 + 工具栏/状态栏/主题 + 密度口径单源（4 个新必需模块 + 7 处接线
  // / 2 处退役面收缩，逐模块归因见 SIDEPANEL_GROWTH_BREAKDOWN.v41RoundRows）；
  // content.js 177,076 B 与 pick-layer.js 33,900 B 逐字节不变（sha256 复核）。
  // v4-3 审查修复轮（2026-09-19，leaf specs-tree-v4-3-ask-auth-inflow）：440,698 → **445,300 B**
  // （+4,602 B，+1.04%）：评审 BLOCK-01~04 + I-01~I-08 的落地字节（逐模块归因见
  // SIDEPANEL_GROWTH_BREAKDOWN.v43ReviewfixRows）；content.js 177,076 / pick-layer.js 33,900 逐字节不变。
  assert.equal(SIDEPANEL_BASELINE_BYTES, 535821);
  // previousBaselineBytes 是 GROWTH_BREAKDOWN 的**参照树**基线（v3-1 I6 的 295,225 B），不是上一轮登记值；
  // previousCeilingBytes 是**本轮（v4-1）之前**的 ceiling = **393,857 B**（R3 缺陷修复轮的
  // floor(375,102 × 1.05)）。〖review 修复轮 I13③〗原注释写「R1 的 385,092 B」是过时链（已订正）。
  assert.equal(SIDEPANEL_BASELINE_META.previousBaselineBytes, 295_225);
  assert.equal(SIDEPANEL_BASELINE_META.previousCeilingBytes, 393_857);
  assert.equal(SIDEPANEL_BASELINE_META.direction, 'raised');
  assert.equal(
    SIDEPANEL_BASELINE_META.ceilingDirection,
    'raised-formula',
    'ceiling 由公式抬高（cap 已撤销，裁决 V3-VOL-1 ①②）',
  );
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
  // 裁决 V3-VOL-1 ②：cap 已撤销 → ceiling = 公式值（R2 后为 386,955，**不是** 306,099）。
  assert.equal(SIDEPANEL_CEILING, 562612, 'ceiling = floor(507,315 × 1.05)（未加 cap 的公式值，V4.5-1 review R1 修复轮重登记）');
  assert.equal(SIDEPANEL_CEILING_CAP_ROLE, 'record-only', 'cap 只能作记录（裁决 V3-VOL-1 ②）');
  assert.equal(SIDEPANEL_CEILING_CAP_RECORD, 306_099, 'cap 的历史值保留为记录');
  assert.equal(SIDEPANEL_CEILING_UNCAPPED, Math.floor(535821 * 1.05), '未加 cap 的公式值必须被记录');
  assert.equal(SIDEPANEL_CEILING, SIDEPANEL_CEILING_UNCAPPED, '本轮判定必须完全等于公式值（无 cap）');
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05, '容差不得因重登记而放宽');
  // 重登记后的自洽：产物必须落在公式判定之内（红线冲突已由裁决 V3-VOL-1 解除）。
  assert.ok(
    SIDEPANEL_BASELINE_BYTES <= SIDEPANEL_CEILING,
    `重登记后产物 ${SIDEPANEL_BASELINE_BYTES}B 必须落在公式判定上限 ${SIDEPANEL_CEILING}B 之内`,
  );
  // 零注入红线随本轮**收紧**（不是放宽）。
  assert.equal(CONTENT_MAX_BYTES, 177_076, 'content.js 硬上限同步收紧到 2026-09-14 实测值');
});

test('W4 size REVERSE PROOF: the tightened ceiling still FAILS on one byte over', () => {
  // v3-2 修复轮（2026-09-16，裁决 V3-VOL-1）：cap 撤销 → ceiling = 公式值；
  // v3-4 重登记后的产物 362,777 B **在**判定之内（红线冲突已由裁决解除）。
  assert.equal(evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).ok, true);
  const over = evaluateSidepanelSize(SIDEPANEL_CEILING + 1);
  assert.equal(over.ok, false, '新 ceiling + 1 必须 FAIL');
  assert.equal(over.ceilingBytes, 562612);
  assert.throws(() => assert.equal(over.ok, true, over.message), /体积回归/);
  // 方向敏感的张力证明：
  //   ① 上一轮基线（291,523 B）在新守卫下仍然 PASS —— 重登记不是「偷偷放宽」；
  //   ② 公式判定不得被任何隐藏上限压回旧 ceiling：ceiling 必须严格高于记录 cap
  //      （撤销 cap 的**可 FAIL** 证据；若 cap 仍参与判定，这一条立刻红灯）。
  assert.equal(
    evaluateSidepanelSize(SIDEPANEL_BASELINE_META.previousBaselineBytes).ok,
    true,
    '上一轮基线 291,523 B 仍在新守卫接受范围内',
  );
  assert.ok(
    SIDEPANEL_CEILING > SIDEPANEL_CEILING_CAP_RECORD,
    `ceiling ${SIDEPANEL_CEILING}B 必须严格高于记录 cap ${SIDEPANEL_CEILING_CAP_RECORD}B（cap 已不参与判定）`,
  );
  // v3-2 修复轮：重登记后的基线**必须**通过公式判定（这正是裁决的目的：
  // 显式重登记 + 撤销自缚 cap，而不是放宽容差或删断言）。
  assert.equal(
    evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).ok,
    true,
    'v3-2 修复轮后基线必须落在公式判定之内（裁决 V3-VOL-1 ①）',
  );
  assert.equal(evaluateSidepanelSize(SIDEPANEL_BASELINE_BYTES).excessBytes, 0);
  assert.equal(evaluateSidepanelSize(SIDEPANEL_CEILING).ok, true, 'ceiling 本身仍 PASS（边界含等号）');
  assert.equal(evaluateSidepanelSize(SIDEPANEL_CEILING).ceilingBytes, 562612);
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
  // 静默上调不可能）。v3-2 修复轮（裁决 V3-VOL-1 ②）撤销自加 cap 后，ceiling 由公式
  // 给出 → 本轮 ceiling 高于上一轮记录 ceiling 是**裁决许可的公式结果**，不是放宽：
  // 容差未动、断言零删减、重登记登记册可核（SIDEPANEL_RE_REGISTRATIONS）。
  assert.ok(
    SIDEPANEL_BASELINE_BYTES > SIDEPANEL_BASELINE_META.previousBaselineBytes,
    `v3-1 提升轮后当前基线 ${SIDEPANEL_BASELINE_BYTES}B 必须严格大于上一轮 ${SIDEPANEL_BASELINE_META.previousBaselineBytes}B`,
  );
  assert.equal(
    SIDEPANEL_CEILING,
    Math.floor(SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE)),
    `ceiling ${SIDEPANEL_CEILING}B 必须严格等于公式 floor(baseline × 1.05)（cap 已撤销）`,
  );
  assert.equal(SIDEPANEL_BASELINE_TOLERANCE, 0.05, '容差仍是 5%（撤销 cap 不等于放宽容差）');
});

test('V2-4 size: re-registration meta carries date/source/reason and is NOT a target budget', () => {
  assert.equal(SIDEPANEL_BASELINE_META.measuredOn, '2026-09-22');
  assert.equal(SIDEPANEL_BASELINE_META.source, 'packages/web-cli-plugin/dist/sidepanel.js');
  assert.equal(SIDEPANEL_BASELINE_META.buildCommand, 'npm run build --workspace @lgdl/web-cli-plugin');
  assert.ok(SIDEPANEL_BASELINE_META.note.includes('提升'), 'note 必须写明本轮重登记方向（基线提升）');
  assert.ok(
    SIDEPANEL_BASELINE_META.note.includes('撤销自加 cap'),
    'note 必须写明 cap 已撤销（裁决 V3-VOL-1 ②）——旧断言要求「未抬高」已被该裁决取代',
  );
  assert.ok(
    SIDEPANEL_BASELINE_META.reason.includes('撤销自加 cap'),
    'reason 必须写明撤销 cap 的理由（替代守卫 ②）',
  );
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

test('V2-4 size: ceiling stays structurally consistent (floor(baseline × 1.05), no cap)', () => {
  assert.equal(
    SIDEPANEL_CEILING,
    Math.floor(SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE)),
  );
  assert.equal(
    SIDEPANEL_CEILING_UNCAPPED,
    Math.floor(SIDEPANEL_BASELINE_BYTES * (1 + SIDEPANEL_BASELINE_TOLERANCE)),
    '未加 cap 的公式值必须 = floor(baseline × 1.05)',
  );
  assert.equal(SIDEPANEL_CEILING, 562612, 'V4.5-1 review R1 修复轮重登记后 ceiling = floor(507,315 × 1.05)（公式判定，cap 已撤销）');
  const over = evaluateSidepanelSize(SIDEPANEL_CEILING + 1);
  assert.equal(over.ok, false);
  assert.equal(
    over.ceilingBytes,
    Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05),
    '纯判定函数的 ceiling 必须等于公式值（不得再被任何 cap 压回）',
  );
  assert.throws(
    () => assert.equal(over.ok, true, over.message),
    /体积回归/,
    '反证：重登记后 ceiling + 1 仍必须 FAIL',
  );
  // 反证（cap 已撤销的真实性）：旧记录 cap（306,099 B）**不再是判定边界** ——
  // 若 cap 仍参与判定，`cap + 1` 会 FAIL；撤销后它必须 PASS，且判定 ceiling 仍是公式值。
  assert.equal(SIDEPANEL_CEILING_CAP_ROLE, 'record-only');
  const aboveRecordedCap = evaluateSidepanelSize(SIDEPANEL_CEILING_CAP_RECORD + 1);
  assert.equal(aboveRecordedCap.ok, true, '反证：记录 cap 之上必须 PASS ⇒ cap 已不在判定里');
  assert.equal(
    aboveRecordedCap.ceilingBytes,
    SIDEPANEL_CEILING,
    '反证：判定 ceiling 永远是公式值，与记录 cap 无关',
  );
  // 公式的边界仍然严格（含等号）：公式值本身 PASS，公式值 + 1 FAIL。
  assert.equal(evaluateSidepanelSize(evaluateSidepanelSize(0).ceilingBytes).ok, true);
  assert.equal(evaluateSidepanelSize(evaluateSidepanelSize(0).ceilingBytes + 1).ok, false);
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

