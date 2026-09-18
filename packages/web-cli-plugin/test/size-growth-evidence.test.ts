/**
 * V3-2 fix round (2026-09-16, orchestrator ruling **V3-VOL-1** ②③④) — the
 * *replacement guards* that took over from the revoked `SIDEPANEL_CEILING_CAP`
 * hard cap.
 *
 * Why this file exists: the v3-2 build round hit a red-line conflict (the shipped
 * artifact 327,679 B exceeded the frozen 306,099 B cap) and reported it instead of
 * widening anything. The orchestrator ruled (V3-VOL-1):
 *
 *   ② every re-registration must be **explicitly disclosed** (before/after + date +
 *      source + buildCommand + measuredBy + reason + `_HISTORY`/TIMELINE verbatim
 *      retention + zero assertion deletion);
 *   ③ a **growth-justification evidence** must accompany it: a per-module `dist`
 *      increment breakdown proving the growth comes from modules this leaf
 *      *requires* — not from duplicated/redundant code;
 *   ④ a **directional guard**: two consecutive re-registrations inside one Feature
 *      whose cumulative growth exceeds **15%** must be **reported** (readable alert
 *      or assertion) so growth can never be silent.
 *
 * Everything here is machine-checked against `test/size-baseline.ts` (the single
 * source of truth) and, for ③, against the real esbuild metafile emitted by
 * `build.mjs` (`dist/build-meta.json`) so the numbers cannot be decorative.
 *
 * Caliber note (I4③): this file's `test(` registrations count towards the *static*
 * node-test caliber only; it adds no runtime Chromium assertion.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  SIDEPANEL_BASELINE_BYTES,
  SIDEPANEL_BASELINE_BYTES_HISTORY,
  SIDEPANEL_BASELINE_BYTES_TIMELINE,
  SIDEPANEL_BASELINE_META,
  SIDEPANEL_BASELINE_TOLERANCE,
  SIDEPANEL_CEILING,
  SIDEPANEL_CEILING_CAP_RECORD,
  SIDEPANEL_CEILING_CAP_ROLE,
  SIDEPANEL_FINAL_ARTIFACT_BYTES,
  SIDEPANEL_GROWTH_BREAKDOWN,
  SIDEPANEL_RE_REGISTRATIONS,
  distArtifact,
  evaluateConsecutiveReRegistrationGrowth,
  readArtifactSize,
  type SizeReRegistration,
} from './size-baseline.js';

const LEDGER = new URL('../../docs/v3-supersession-ledger.json', import.meta.url);

function ledgerEntryIds(): Set<string> {
  const raw = JSON.parse(readFileSync(LEDGER, 'utf8')) as {
    entries: Array<{ id: string }>;
    modifiedRanges: Array<{ oldId: string }>;
  };
  const ids = new Set<string>();
  for (const e of raw.entries) ids.add(e.id);
  for (const m of raw.modifiedRanges) ids.add(m.oldId);
  return ids;
}

// ── ② explicit re-registration disclosure ───────────────────────────────────

test('V3-VOL-1 ② registry: every re-registration discloses before/after + date + source + buildCommand + measuredBy + reason', () => {
  assert.ok(SIDEPANEL_RE_REGISTRATIONS.length >= 3, '重登记登记册必须覆盖 v3-1 / v3-1-i6 / v3-2');
  for (const r of SIDEPANEL_RE_REGISTRATIONS) {
    assert.ok(r.id.length > 0, `${r.id}: 轮次标识必填`);
    assert.equal(r.source, 'packages/web-cli-plugin/dist/sidepanel.js', `${r.id}: 来源必须是被测产物`);
    assert.equal(
      r.buildCommand,
      'npm run build --workspace @lgdl/web-cli-plugin',
      `${r.id}: buildCommand 必填且一致`,
    );
    assert.ok(r.measuredBy.length > 0, `${r.id}: measuredBy 必填`);
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/, `${r.id}: 日期必填（YYYY-MM-DD）`);
    assert.ok(r.reason.length >= 20, `${r.id}: 理由必填且非套话`);
    // 前后值必须与数值方向一致（不得静默上调/下调）。
    const dir = r.baselineAfterBytes > r.baselineBeforeBytes ? 'up' : 'down';
    assert.equal(
      dir,
      'up',
      `${r.id}: 本 Feature 的每一轮都是显式增重（若出现下调必须改断言并显式说明）`,
    );
    assert.equal(
      r.baselineAfterBytes > r.baselineBeforeBytes,
      true,
      `${r.id}: 提升轮必须 baselineAfter > baselineBefore`,
    );
  }
});

test('V3-VOL-1 ② registry: the round chain is continuous and ends at the current baseline', () => {
  const rounds = SIDEPANEL_RE_REGISTRATIONS;
  for (let i = 1; i < rounds.length; i += 1) {
    assert.equal(
      rounds[i].baselineBeforeBytes,
      rounds[i - 1].baselineAfterBytes,
      `${rounds[i].id}.before 必须 == ${rounds[i - 1].id}.after（链条首尾相接，不得有未披露的中间值）`,
    );
    assert.equal(
      rounds[i].ceilingBeforeBytes,
      rounds[i - 1].ceilingAfterBytes,
      `${rounds[i].id}.ceilingBefore 必须 == ${rounds[i - 1].id}.ceilingAfter`,
    );
    assert.ok(rounds[i].date >= rounds[i - 1].date, `${rounds[i].id}: 日期必须单调不减`);
  }
  assert.equal(
    rounds[rounds.length - 1].baselineAfterBytes,
    SIDEPANEL_BASELINE_BYTES,
    '登记册末项必须等于当前基线',
  );
  assert.equal(rounds[rounds.length - 1].baselineAfterBytes, SIDEPANEL_FINAL_ARTIFACT_BYTES);
  assert.equal(rounds[rounds.length - 1].ceilingAfterBytes, SIDEPANEL_CEILING, '末项 ceiling 必须等于当前 ceiling');
  //
  // ── BLOCK-2 (review R1) machine assertion ──────────────────────────────────
  // The v3-4 round shipped `ceilingUncappedFormulaBytes = 380,271` — the formula
  // evaluated over an **intermediate build measurement** (362,163) instead of the
  // registered baseline (362,777). Nothing judged it, so the registry carried two
  // mutually exclusive ceilings for one artifact. From now on the field is derived,
  // not typed: it must equal `floor(baselineAfterBytes × 1.05)` for EVERY round, and a
  // round's ceiling may only ever be that formula value or the (retired, record-only)
  // cap — never a third number.
  for (const r of rounds) {
    assert.equal(
      r.ceilingUncappedFormulaBytes,
      Math.floor(r.baselineAfterBytes * 1.05),
      `${r.id}: ceilingUncappedFormulaBytes 必须 = floor(baselineAfterBytes × 1.05)（不得与基线脱钩）`,
    );
    assert.ok(
      r.ceilingAfterBytes === r.ceilingUncappedFormulaBytes || r.ceilingAfterBytes === SIDEPANEL_CEILING_CAP_RECORD,
      `${r.id}: ceilingAfterBytes ${r.ceilingAfterBytes} 既不是公式值 ${r.ceilingUncappedFormulaBytes} 也不是记录 cap ${SIDEPANEL_CEILING_CAP_RECORD}（同一事实不得有两个 ceiling）`,
    );
  }
});

test('V3-VOL-1 ② registry: `_HISTORY` / TIMELINE retain every disclosed value verbatim', () => {
  const history: number[] = [...SIDEPANEL_BASELINE_BYTES_HISTORY];
  const timeline: number[] = [...SIDEPANEL_BASELINE_BYTES_TIMELINE];
  for (const r of SIDEPANEL_RE_REGISTRATIONS) {
    assert.ok(r.historyRetainedBytes.length > 0, `${r.id}: 必须列出本轮逐字保留的历史值`);
    for (const value of r.historyRetainedBytes) {
      assert.ok(
        timeline.includes(value),
        `${r.id}: 历史值 ${value} 必须仍在 TIMELINE 中逐字存在（历史不得被改写）`,
      );
    }
    // 上一轮基线值必须在 TIMELINE 中留档（HISTORY 保持其单调不减的旧链条）。
    assert.ok(
      timeline.includes(r.baselineBeforeBytes),
      `${r.id}: 上一轮基线 ${r.baselineBeforeBytes} 必须在 TIMELINE 中留档`,
    );
  }
  for (const value of [1_068_165, 1_085_389, 1_110_744, 1_132_748, 1_159_856, 1_162_942]) {
    assert.ok(history.includes(value), `v1~R2 历史值 ${value} 必须保留`);
  }
  for (const value of [266_500, 291_523, 295_225]) {
    assert.ok(timeline.includes(value), `后惰性化历史值 ${value} 必须保留`);
  }
  assert.equal(timeline[timeline.length - 1], SIDEPANEL_BASELINE_BYTES, 'TIMELINE 末项 = 当前基线');
});

test('V3-VOL-1 ② registry: zero assertion deletion is registered in the supersession ledger', () => {
  const ids = ledgerEntryIds();
  for (const r of SIDEPANEL_RE_REGISTRATIONS) {
    assert.ok(r.assertionNonRemovalEntries.length > 0, `${r.id}: 必须登记「断言零删减」的台账条目`);
    for (const entry of r.assertionNonRemovalEntries) {
      assert.ok(ids.has(entry), `${r.id}: 台账条目 ${entry} 不存在（不得悬空引用）`);
    }
  }
  // 「断言零删减」不只是台账条目名：本轮 size-budget 的 `test(` 注册数必须 ≥ v3-1 时的
  // 规模（静态口径另有台账兜底；这里断言寄存器必须存在且非空，避免空转）。
  assert.ok(SIDEPANEL_RE_REGISTRATIONS.every((r) => r.assertionNonRemovalEntries.length > 0));
});

// ── ③ growth justification evidence ─────────────────────────────────────────

test('V3-VOL-1 ③ growth: the recorded per-module breakdown sums to the measured delta', () => {
  const b = SIDEPANEL_GROWTH_BREAKDOWN;
  assert.equal(b.deltaBytes, SIDEPANEL_BASELINE_BYTES - SIDEPANEL_BASELINE_META.previousBaselineBytes);
  // R2 缺陷修复轮：四处既有模块的接线（view-model +1,006 / sidepanel +388 / risk-rail +352 /
  // shell +28 = +1,774，退避调度器在 service-worker bundle 不计入本产物）⇒ 累计增量 71,530 → 73,304；
  // R3 缺陷修复轮：五处既有模块的救援接线（pick-input +2,450 / sidepanel +1,762 / ref-validity +1,057 /
  // panels +1,007 / ref-store +222 = +6,498，只读探测模块在 service-worker bundle 不计入）⇒ 73,304 → 79,877。
  // （同一条断言，仅数值按实测重 pin；四类分解与逐模块表同步，Σ 由真实 metafile 双向核对）。
  // R1 缺陷修复轮（历史值逐字保留）：六处既有模块的修复（ref-validity +1,762 / sidepanel +854 /
  // pick-input +724 / ref-store +256 / chat-state +220 / view-model +162 = +3,978）⇒ 67,552 → 71,530。
  // BLOCK-2（review R1）：原注释写 `5,053`（中间测量，实测归因表为 5,085）与 `66,938`
  // （与实测 67,552 不符）—— 注释与实测必须同源。
  assert.equal(b.deltaBytes, 79_877);
  const bucketSum =
    b.newRequiredModuleBytes + b.wiringBytes + b.attributionShiftBytes + b.unattributedHelperDeltaBytes;
  assert.equal(bucketSum, b.deltaBytes, '四类分解之和必须等于总增量（否则有未披露的膨胀）');
  const rowSum = b.rows.reduce((s, r) => s + r.deltaBytes, 0);
  assert.equal(
    rowSum + b.unattributedHelperDeltaBytes,
    b.deltaBytes,
    '逐模块增量之和 + 未归因胶水必须等于总增量（逐模块表不得漏项）',
  );
  assert.equal(
    b.rows.reduce((s, r) => s + (r.beforeBytes === null ? r.afterBytes : r.deltaBytes), 0),
    b.newRequiredModuleBytes + b.wiringBytes + b.attributionShiftBytes,
    '三类明细行之和必须等于对应分类小计',
  );
});

test('V3-VOL-1 ③ growth: every new/wiring row cites the requirement that forces it (no unexplained bytes)', () => {
  for (const row of SIDEPANEL_GROWTH_BREAKDOWN.rows) {
    assert.ok(row.requiredBy.length > 0, `${row.module}: 必须写明要求来源`);
    assert.equal(row.deltaBytes, row.afterBytes - (row.beforeBytes ?? 0), `${row.module}: Δ 必须自洽`);
    if (row.kind === 'new-required-module') {
      assert.equal(row.beforeBytes, null, `${row.module}: 新必需模块在 v3-1 树中必须不存在`);
      assert.ok(row.deltaBytes > 0, `${row.module}: 新必需模块必须贡献正字节`);
      assert.match(row.requiredBy, /FR-V3-0\d\d|NFR-V3-0\d\d/, `${row.module}: 必须引到 FR/NFR`);
    }
    if (row.kind === 'wiring') {
      assert.ok(row.beforeBytes !== null && row.beforeBytes > 0, `${row.module}: 接线模块必须两轮都存在`);
      assert.match(row.requiredBy, /FR-V3-0\d\d|NFR-V3-0\d\d/, `${row.module}: 必须引到 FR/NFR`);
    }
    if (row.kind === 'attribution-shift') {
      assert.match(row.requiredBy, /源码未改/, `${row.module}: 位移行必须说明源码未改`);
    }
  }
  // 结论可核：必需增量（新模块 + 接线）必须解释绝大头寸，冗余/重复不得进入这两类。
  const explained = SIDEPANEL_GROWTH_BREAKDOWN.newRequiredModuleBytes + SIDEPANEL_GROWTH_BREAKDOWN.wiringBytes;
  assert.ok(
    explained / SIDEPANEL_GROWTH_BREAKDOWN.deltaBytes > 0.95,
    `必需增量占比必须 >95%（实测 ${((explained / SIDEPANEL_GROWTH_BREAKDOWN.deltaBytes) * 100).toFixed(1)}%）`,
  );
  assert.ok(
    SIDEPANEL_GROWTH_BREAKDOWN.attributionShiftBytes + SIDEPANEL_GROWTH_BREAKDOWN.unattributedHelperDeltaBytes <
      1_000,
    '未解释字节必须 <1,000 B（远小于任何一层的实现）',
  );
});

test('V3-VOL-1 ③ growth: the duplicate-code check states a falsifiable claim', () => {
  const check = SIDEPANEL_GROWTH_BREAKDOWN.duplicationCheck;
  assert.ok(check.length > 0, '必须给出「无重复/冗余代码」的可核判据');
  assert.match(check, /互不相同|Δ=0/, '判据必须点明「模块路径唯一 / 共享模块增量为 0」');
  // 复用而非复制：共享的 v2 模块必须在明细表里以 Δ=0 或「首次共享引入」出现。
  const shared = SIDEPANEL_GROWTH_BREAKDOWN.rows.filter((r) => /tree-receipt|ownership-tree/.test(r.module));
  assert.ok(shared.length >= 1, '共享 v2 模块必须出现在明细表（证明是复用）');
  assert.ok(
    shared.some((r) => r.deltaBytes === 0 || r.kind === 'new-required-module'),
    '共享模块要么 Δ=0（已共享），要么是首次共享引入 —— 不得是被复制的第二份实现',
  );
});

test('V3-VOL-1 ③ growth: the real esbuild metafile agrees with the recorded breakdown (when built)', (t) => {
  const metaPath = distArtifact('build-meta.json');
  let exists = false;
  try {
    exists = existsSync(metaPath);
  } catch {
    exists = false;
  }
  if (!exists) {
    t.skip('dist/build-meta.json not present — run `npm run build` to emit the esbuild metafile');
    return;
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as {
    outputs: Record<string, { bytes: number; inputs: Record<string, { bytesInOutput: number }> }>;
  };
  const outKey = Object.keys(meta.outputs).find((k) => k.endsWith('sidepanel.js'));
  assert.ok(outKey, 'metafile 必须含 sidepanel.js 输出');
  const out = meta.outputs[outKey as string];
  assert.equal(out.bytes, SIDEPANEL_BASELINE_BYTES, '真实 metafile 的输出字节必须等于登记基线（登记值 == 实测产物）');
  // 每个「本轮来源模块」的字节贡献必须能在真实 metafile 中逐条命中。
  const inputs = out.inputs;
  const paths = Object.keys(inputs);
  assert.equal(new Set(paths).size, paths.length, '输入模块路径必须互不相同（无重复模块）');
  for (const row of SIDEPANEL_GROWTH_BREAKDOWN.rows) {
    const key = paths.find((p) => p.endsWith(row.module));
    assert.ok(key, `metafile 缺少模块 ${row.module}`);
    assert.equal(
      inputs[key as string].bytesInOutput,
      row.afterBytes,
      `${row.module}: metafile bytesInOutput ${inputs[key as string].bytesInOutput} ≠ 登记 ${row.afterBytes}`,
    );
  }
  // 共享模块的「复用非复制」断言：tree-receipt 只出现一次且增量为 0。
  const receiptPaths = paths.filter((p) => p.endsWith('src/ui/tree/tree-receipt.ts'));
  assert.equal(receiptPaths.length, 1, '共享模块 tree-receipt.ts 只能出现一次（复制会出现第二份）');
  const receiptRow = SIDEPANEL_GROWTH_BREAKDOWN.rows.find((r) => r.module.endsWith('tree-receipt.ts'));
  assert.ok(receiptRow, '无重复判据必须引用 tree-receipt.ts 的 Δ=0');
  assert.equal(receiptRow?.deltaBytes, 0);
  assert.equal(
    inputs[receiptPaths[0] as string].bytesInOutput,
    receiptRow?.afterBytes,
    '共享模块的当前字节必须与明细表一致（Δ=0 的两端同值）',
  );
  const attributed = Object.values(inputs).reduce((s, v) => s + v.bytesInOutput, 0);
  assert.ok(
    out.bytes - attributed < out.bytes * 0.01,
    '未归因运行时胶水必须 <1% 输出（否则明细表的解释力不足）',
  );
});

// ── ④ directional guard (>15% over two consecutive rounds ⇒ report) ─────────

test('V3-VOL-1 ④ directional guard: two consecutive feature rounds >15% MUST raise a reportable alert', () => {
  const verdict = evaluateConsecutiveReRegistrationGrowth();
  assert.equal(verdict.threshold, 0.15);
  assert.equal(verdict.feature, 'specs-tree-web-cli-plugin-v3-ui');
  assert.deepEqual(
    [...verdict.rounds],
    SIDEPANEL_RE_REGISTRATIONS.filter((r) => r.roundKind === 'feature-round').map((r) => r.id),
    '方向性守卫只按**功能轮**计「连续两轮」',
  );
  assert.ok(verdict.cumulativePct > 0.15, `当前累计增幅 ${(verdict.cumulativePct * 100).toFixed(2)}% 必须 >15%`);
  assert.ok(verdict.warning !== null, '>15% 时必须产出可读告警（不得无声膨胀）');
  assert.match(verdict.warning ?? '', /回报编排器/, '告警必须点明「显式回报编排器」');
  assert.match(verdict.warning ?? '', /22\.9\d%|累计增幅/, '告警必须给出可读的百分比');
  // 告警与元数据必须同源（防止「注释里说报警、机器里没有」）。
  assert.match(SIDEPANEL_BASELINE_META.consecutiveGrowthAlert, /已触发/);
  assert.equal(SIDEPANEL_BASELINE_META.consecutiveGrowthAlertThreshold, 0.15);
  console.log(`  ℹ 方向性守卫：${verdict.warning}`);
});

test('V3-VOL-1 ④ directional guard REVERSE PROOF: below-threshold growth does NOT alert (non-vacuous)', () => {
  const mk = (
    id: string,
    before: number,
    after: number,
  ): SizeReRegistration => ({
    id,
    roundKind: 'feature-round',
    feature: 'synthetic-feature',
    date: '2026-09-16',
    source: 'synthetic',
    buildCommand: 'synthetic',
    measuredBy: 'synthetic',
    reason: 'synthetic',
    baselineBeforeBytes: before,
    baselineAfterBytes: after,
    ceilingBeforeBytes: 0,
    ceilingAfterBytes: 0,
    assertionNonRemovalEntries: ['synthetic'],
    historyRetainedBytes: [before],
    ceilingUncappedFormulaBytes: 0,
  });
  // 连续两轮各 +4% / +1.9% → 累计 6%（相对第一轮起点）→ 不告警。
  const mild = evaluateConsecutiveReRegistrationGrowth(
    [mk('r1', 100_000, 104_000), mk('r2', 104_000, 106_000)],
    'synthetic-feature',
  );
  assert.equal(mild.warning, null, '阈值以下不得告警（否则守卫恒真）');
  assert.ok(mild.cumulativePct < 0.15);
  // 同一组数据把阈值调到 1% → 必须告警（证明告警真的由数值驱动）。
  const strict = evaluateConsecutiveReRegistrationGrowth(
    [mk('r1', 100_000, 104_000), mk('r2', 104_000, 106_000)],
    'synthetic-feature',
    0.01,
  );
  assert.ok(strict.warning !== null, '阈值 1% 时必须告警 ⇒ 判据由数值驱动');
  assert.match(strict.warning ?? '', /回报编排器/);
  // 只有一轮时不告警（连续两轮是前提）。
  const single = evaluateConsecutiveReRegistrationGrowth([mk('r1', 100_000, 120_000)], 'synthetic-feature');
  assert.equal(single.warning, null, '一轮不足以触发方向性守卫');
});

test('V3-VOL-1 ④ directional guard: the alert is also surfaced in the density registry volume block', () => {
  const registry = JSON.parse(
    readFileSync(new URL('../../docs/v3-density-baseline.json', import.meta.url), 'utf8'),
  ) as { volume: Record<string, unknown> };
  const v = registry.volume;
  assert.equal(v.registeredBaselineBytes, SIDEPANEL_BASELINE_BYTES, '登记表基线必须与代码同源');
  assert.equal(v.ceilingBytes, SIDEPANEL_CEILING, '登记表 ceiling 必须与代码同源');
  assert.equal(v.tolerance, SIDEPANEL_BASELINE_TOLERANCE);
  assert.equal(v.ceilingCapRole, 'record-only', 'cap 在登记表中也必须标为纯记录');
  assert.equal(v.ceilingCapRecordBytes, SIDEPANEL_CEILING_CAP_RECORD);
  assert.equal(v.ceilingCapRecordBytes, 306_099);
  assert.equal(SIDEPANEL_CEILING_CAP_ROLE, v.ceilingCapRole);
  assert.match(String(v.directionalAlert ?? ''), /回报编排器/, '登记表必须带上方向性告警（可读、可核）');
  assert.equal(v.ceilingFormula, 'floor(baseline × (1 + tolerance))');
});
