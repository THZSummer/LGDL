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
  SIDEPANEL_V553_FINAL_ROUND,
  SIDEPANEL_W4W5_FINAL_ROUND,
  PENDING_ABSOLUTE_CAP,
  SIDEPANEL_TIER_BYTES,
  ceilTo50KB,
  distArtifact,
  reRegistrationDirectionProblems,
  evaluateConsecutiveReRegistrationGrowth,
  readArtifactSize,
  type SizeReRegistration,
} from './size-baseline.js';

const LEDGER = new URL('../../docs/v3-supersession-ledger.json', import.meta.url);

function ledgerEntryIds(): Set<string> {
  // V4-1（双台账）：v4 取代台账同样是合法登记来源（`docs/v4-supersession-ledger.json`
  // 的 entries/modifiedRanges）。判据方向不变：引用必须**真的存在**，不得悬空。
  const read = (url: URL) => {
    const raw = JSON.parse(readFileSync(url, 'utf8')) as {
      entries: Array<{ id: string }>;
      modifiedRanges: Array<{ oldId: string }>;
    };
    const out = new Set<string>();
    for (const e of raw.entries) out.add(e.id);
    for (const m of raw.modifiedRanges) out.add(m.oldId);
    return out;
  };
  const ids = read(LEDGER);
  for (const id of read(new URL('../../docs/v4-supersession-ledger.json', import.meta.url))) ids.add(id);
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
    // 〖V5-2 收口轮〗首个**显式净减轮**（`direction: 'lowered'`，validate R1 N-01：删一条重复写）
    // 允许存在 —— 但净减**必须**显式声明 `direction === 'lowered'`（静默下调仍红）；方向与 Δ 的
    // 双向一致另由 `size-ruling-vol3.test.ts` 的 `reRegistrationDirectionProblems()` 机核。
    const dir =
      r.baselineAfterBytes > r.baselineBeforeBytes
        ? 'up'
        : r.baselineAfterBytes < r.baselineBeforeBytes
          ? 'down'
          : 'flat';
    if (dir === 'down') {
      assert.equal(r.direction, 'lowered', `${r.id}: 净减轮必须显式声明 direction='lowered'（不得静默下调）`);
      assert.ok(r.baselineAfterBytes < r.baselineBeforeBytes, `${r.id}: 净减轮必须 baselineAfter < baselineBefore`);
    } else if (dir === 'flat') {
      assert.equal(r.direction, 'unchanged', `${r.id}: 零字节轮必须显式声明 direction='unchanged'`);
    } else {
      assert.equal(r.direction, 'raised', `${r.id}: 提升轮必须显式声明 direction='raised'`);
      assert.equal(
        r.baselineAfterBytes > r.baselineBeforeBytes,
        true,
        `${r.id}: 提升轮必须 baselineAfter > baselineBefore`,
      );
    }
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
  // 〖V4-4 R2〗基线 465,000 → 465,277（+277，chat-state 自动归并接线）⇒ 累计增量 169,775 → **170,052**。
  // 〖V5-2 收口轮〗基线 542,150 → **542,064**（−86：`permRequest` 删去重复 notice 写者）⇒ 累计 246,925 → **246,839**。
  // 〖V5-3 R2（末叶 / 收口叶 + 三叶合计终轮）〗基线 542,064 → **546,370**（+4,306：授权 chip / `data-narrow` /
  // 密度口径解耦 / `error` 出生恢复区 / 法八面③ `maskedLength` 审计列）⇒ 累计 246,839 → **251,145**。
  // 〖R4 缺陷修复轮（2026-09-22）〗sidepanel 547,558 → **549,609**（+2,051：选择器截断根修 + 诊断分离 +
  // 捕获回环校验止血）⇒ 累计增量 252,333 → **254,384**。
  // 〖V5.5-1 R1/R2（2026-09-23）〗R1 中间登记 549,609 → **554,576**（+4,967）⇒ 累计 259,351；
  // R2 收口登记 554,576 → **557,761**（+3,185：答案驱动化 + S0 双面 + 判据升级）⇒ 累计 **262,536**。
  // 〖IAN-1 R1（2026-09-24）〗累计口径随基线前移：598,282 − 295,225 = **303,057**。
  assert.equal(b.deltaBytes, 303_701);
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
      // V4-1：引用面放宽到 v4 的 FR-CHAT/NFR-CHAT（方向不变 —— 仍必须引到一条 FR/NFR，不得是空话）。
      assert.match(row.requiredBy, /FR-(V3|CHAT|V45|ALLN|SELF|SGO|IAN)-\d\d\d|NFR-(V3|CHAT|V45|ALLN|SELF|SGO|IAN)-\d\d\d/, `${row.module}: 必须引到 FR/NFR（v4.5-1 起接受 FR-V45-*；V5.5F-1 起接受 FR-SGO-*；IAN-1 起接受 FR-IAN-*）`);
    }
    if (row.kind === 'wiring') {
      assert.ok(row.beforeBytes !== null && row.beforeBytes > 0, `${row.module}: 接线模块必须两轮都存在`);
      assert.match(row.requiredBy, /FR-(V3|CHAT|V45|ALLN|SELF|SGO|IAN)-\d\d\d|NFR-(V3|CHAT|V45|ALLN|SELF|SGO|IAN)-\d\d\d/, `${row.module}: 必须引到 FR/NFR（v4.5-1 起接受 FR-V45-*；V5.5F-1 起接受 FR-SGO-*；IAN-1 起接受 FR-IAN-*）`);
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
  // V4-2 重登记：绝对口径 1,000 → 1,500 B（esbuild 共享胶水随输入模块数 57 → 69 自然增长，
  // 实测 1,060 B），**同时新增更严的相对口径 <2%**（实测 (265+1,060)/131,262 = 1.01%）——
  // 阈值不是纯放宽：相对判据是本轮新增的收紧面。〖v4-2 review 修复轮 I-02〗分母按最终基线订正
  // （130,217 → 129,869 → 131,262），分子不变（修复轮减重全部落在 rows 上，胶水口径回到 1,060）。
  // 〖V5-2 R2 登记 · review R1 I-05 订正措辞〗绝对口径 1,500 → **2,500 B** 是一次**放宽**
  // （不是「更强判据」）：输入模块数 83 → 86（+3）使 esbuild 共享胶水在本轮实测 1,778 B，
  // 维持 1,500 会假红。放宽的依据是**公式**而非随手抬阈值：上界 ≈ 600 B（常量胶水）
  // + 400 B × 本叶新增模块数 = 1,800 B，口径取 2,500 B 作为跨轮余量。同一处的相对口径
  // <2%（实测 0.74%）**同时**作为主判据 —— 两条并存，任一条失效都红（见下方两条断言）。
  const unexplained = SIDEPANEL_GROWTH_BREAKDOWN.attributionShiftBytes + SIDEPANEL_GROWTH_BREAKDOWN.unattributedHelperDeltaBytes;
  const perModuleBound = 25 * SIDEPANEL_GROWTH_BREAKDOWN.duplicationCheckInputModuleCount;
  assert.ok(
    unexplained < perModuleBound,
    `未解释字节必须仍小于「每输入模块 25 B」线性上界 ${perModuleBound} B（口径放宽的公式依据，实测 ${unexplained} B）`,
  );
  assert.ok(
    unexplained < 2_500,
    `未解释字节必须 <2,500 B（放宽后的绝对口径；实测 ${unexplained} B）`,
  );
  assert.ok(
    (SIDEPANEL_GROWTH_BREAKDOWN.attributionShiftBytes + SIDEPANEL_GROWTH_BREAKDOWN.unattributedHelperDeltaBytes) /
      SIDEPANEL_GROWTH_BREAKDOWN.deltaBytes <
      0.02,
    '未解释字节必须 <2% 的累计增量（v4-2 新增相对口径）',
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
  // 〖V5-2 R2 等价重锚〗v3 段累计 `rows` 是「v3-1 树 → 当前树」的**构成说明**（数值由
  // `npm run size:attribution` 的**几何同构沙箱**给出，与仓库内 metafile 的路径注释噪声不同）；
  // 「逐模块 afterBytes == 真实 metafile」的判据改由**最新一轮** rows（仓库内几何、可逐值相等）
  // 承担 —— 判据力只升：最新一轮的每一行都必须与 metafile 逐值相等，且 Σ+glue == 该轮登记增量。
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
  // 逐值相等的判据跑在**最新一轮**（V5-3 R2；仓库内几何）。v3 段累计表的 `afterBytes`
  // 取自沙箱几何，其 Δ 自洽由上面的对账用例判定（来源不同、判据互不替代）。
  // 〖V5-3 R2（2026-09-22，末叶 / 收口叶）〗随轮次重指向 v5-2-reviewfix → v5-3-r2
  // 〖V5.5-3 R1（2026-09-23，TASK-V55-301~307）〗再重指向 v552R3 → **v553R1Rows**
  // （v5-2 各轮的历史 rows 逐字保留在 `v52*Rows` / `v552*Rows` 与 `SIDEPANEL_BASELINE_META` 的历史段）。
  // ★ R8 缺陷修复轮：最新一轮 = `r8Rows`（+349 B；其 afterBytes 必须等于真实 metafile）。
  for (const row of SIDEPANEL_GROWTH_BREAKDOWN.r8Rows) {
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
  assert.equal(receiptRow?.beforeBytes, 2_719, '共享模块的 v3-1 参照值必须保留');
  assert.equal(receiptRow?.deltaBytes, 2);
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

// ── ③c V4-1 round rows + input-module count (review fix round I8/I9) ─────────

test('V3-VOL-1 ③(V4-1) growth: the v4-1 round rows sum to `closeoutDeltaBytes` (I9)', () => {
  const b = SIDEPANEL_GROWTH_BREAKDOWN;
  assert.ok(Array.isArray(b.v41RoundRows) && b.v41RoundRows.length > 0, 'v4-1 轮的逐模块增量必须登记（不得只在 reason 叙述里）');
  for (const row of b.v41RoundRows) {
    assert.ok(row.module.endsWith('.ts'), `${row.module}: 必须是源码模块路径`);
    assert.equal(
      row.deltaBytes,
      row.afterBytes - (row.beforeBytes ?? 0),
      `${row.module}: Δ 必须自洽（after − before）`,
    );
  }
  const rowSum = b.v41RoundRows.reduce((s, r) => s + r.deltaBytes, 0);
  const v41Reg = SIDEPANEL_RE_REGISTRATIONS.find((r) => r.id === b.roundRowRegistrationIds.v41RoundRows);
  assert.ok(v41Reg, 'v4-1 轮的登记条目必须存在（roundRowRegistrationIds 映射）');
  assert.equal(
    rowSum + b.v41RoundUnattributedGlueBytes,
    v41Reg!.baselineAfterBytes - v41Reg!.baselineBeforeBytes,
    'v4-1 轮逐模块增量之和 + 未归因胶水必须 == 该轮登记增量（本轮数字不得无断言）',
  );
  // 本轮增量必须自洽于「基线 − 前值」：closeoutDeltaBytes == 当前基线 − v4-1 基线。
  // V4-2 泛化：`closeoutDeltaBytes` 语义固定为「**最新一轮**登记增量」（v4-2 起 = 425,442 − 385,319）；
  // v4-1 轮自身的 Σ 判据改由 `roundRowRegistrationIds.v41RoundRows` 的登记值驱动（不再借 closeoutDeltaBytes）。
  // 〖V5-2 R2 等价重锚〗`closeoutDeltaBytes` 的语义恒为「**最新一轮**登记增量」（v4-2 起
  // 明文如此）；〖V5-3 R2〗最新一轮 = `v5-3-r2`（542,064 → **546,370**，+4,306）
  // ⇒ 与它的登记条目同源复算（`SIDEPANEL_BASELINE_BYTES − 542,064 = 4,306`）。
  // 〖R4 缺陷修复轮（2026-09-22）〗`r4-selector-fix`（547,558 → **549,609**，+2,051）作为历史锚点保留。
  // 〖V5.5-1 review R1 修复轮（2026-09-23，BLOCK-01/02 + I-01~03）〗最新一轮 = `v55-2-r1`
  // （557,883 → **562,073**，+4,190）⇒ 与它的登记条目同源复算（历史轮次 v55-1-r2 的 554,576 → 557,761
  // 逐字保留在 `SIDEPANEL_RE_REGISTRATIONS` 与 `SIDEPANEL_BASELINE_BYTES_TIMELINE`）。
  // 〖V5.5-2 R2〗`closeoutDeltaBytes` 语义恒为「**最新一轮**登记增量」⇒ 与本叶 R2 的登记条目同源复算
  // （563,145 → 563,780，+635）；R1 的中间登记值 557,883 → 562,273 逐字保留在 `SIDEPANEL_RE_REGISTRATIONS` 与 TIMELINE。
  assert.equal(b.closeoutDeltaBytes, SIDEPANEL_BASELINE_BYTES - 598_577);
  // 新必需模块（beforeBytes=null）恰好 4 个（toolbar / theme / density-scope / statusbar）。
  const newModules = b.v41RoundRows.filter((r) => r.beforeBytes === null);
  assert.equal(newModules.length, 4, `v4-1 新增必需模块必须恰为 4 个（实测 ${newModules.length}）`);
});

test('V3-VOL-1 ③(V4-1) growth: the v4-1 round `afterBytes` must match the real metafile (I9)', (t) => {
  // 〖V5-2 R2 等价重锚〗该用例的语义是「**最新一轮** rows 的 afterBytes == 真实 metafile」，
  // 因此随轮次重指向（v4-1 → v5-2-r2）。v4-1 的历史 rows 仍逐字保留在本文件与 `v41RoundRows`。
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
  const inputs = meta.outputs[outKey as string].inputs;
  const paths = Object.keys(inputs);
  // V4-2 泛化 / 收口轮：本断言打的是**最新一轮**的 rows（其 `afterBytes` 必须等于真实 metafile）；
  // v4-1 与 v4-2（build+review 修复轮）的历史值不再等于当前产物，其 Σ/Δ 自洽由 N-05 的
  // `roundRowProblems` 组判据承担。〖v4-2 收口轮〗最新一轮 = `v42CloseoutRows`（4 行，Σ +1,393）。
  // 〖v4-4 R2（2026-09-19，KL-V44-01 裁决落地轮）〗最新一轮 = `v44R2Rows`（1 行：
  // `chat-state.ts` 15,838 → 16,115 = +277 B；glue 0 ⇒ Σ + 0 == 465,277 − 465,000）；
  // v4-4 收口轮的历史值（15 行，Σ +18,822 + glue 1,200 = +20,022）不再等于当前产物，
  // 其 Σ/Δ 自洽由 N-05 的 `roundRowProblems` 组判据承担。
  // 〖v4-4 审查修复轮〗最新一轮 = `v44ReviewfixRows`（11 行，Σ +12,846 + glue 40）；
  // 〖v4-4 快修轮（2026-09-20，review R2 I-09~I-11）〗最新一轮 = `v44I09fixRows`（1 行：
  // `sidepanel.ts` 78,892 → 79,626 = +734 B；glue 0 ⇒ Σ + 0 == 478,897 − 478,163）。
  // 〖F 还原度快修轮（2026-09-20，FIX-1~FIX-4）〗最新一轮 = `fFidelityFixRows`（5 行，Σ +1,005 + glue 0）。
  // 〖V4-4 收口轮（2026-09-20，F-01 + N-01~N-05）〗历史 = `v44CloseoutRows`（1 行：
  // `sidepanel.ts` 79,626 → 79,750 = +124 B；glue 0 ⇒ Σ + 0 == 479,021 − 478,897）。
  // 〖V4.5-1 R1（2026-09-21，W1+W2 = TASK-V45-101~106）〗最新一轮 = `v45W1W2Rows`（6 行，Σ +870 + glue 0）。
  // 〖V4.5-1 review R1 修复轮（2026-09-21，BLOCK-01~04 + I-01~06）〗最新一轮 = `v45ReviewfixRows`
  // （2 行：host-registry +2,145 / sidepanel +2,875；glue 0 ⇒ Σ + 0 == 498,521 − 493,501）。
  // 〖V5-2 review R1 修复轮〗历史 = `v52ReviewfixRows`（9 行，Σ +6,294 + glue 35）。
  // 〖R4 缺陷修复轮（2026-09-22）〗最新一轮 = `r4SelectorFixRows`（4 行，Σ +2,051 + glue 0）；
  // 〖V5-3 review R1 修复轮〗历史 = `v53FixRows`（7 行，Σ +1,188 + glue 0）；〖V5-3 R2〗历史 = `v53Rows`（9 行，Σ +4,306 + glue 0
  // == 546,370 − 542,064）；`v52CloseoutRows`（1 行 −86）的历史值逐字保留在本文件的注释与
  // `SIDEPANEL_GROWTH_BREAKDOWN.v52CloseoutRows`（其 Σ/Δ 自洽由 N-05 的组判据承担）。
  // ★ R8 缺陷修复轮：最新一轮 = `r8Rows`（afterBytes == 真实 metafile）。
  for (const row of SIDEPANEL_GROWTH_BREAKDOWN.r8Rows) {
    const key = paths.find((p) => p.endsWith(row.module));
    assert.ok(key, `metafile 缺少最新一轮模块 ${row.module}`);
    assert.equal(
      inputs[key as string].bytesInOutput,
      row.afterBytes,
      `${row.module}: 真实 metafile bytesInOutput ${inputs[key as string].bytesInOutput} ≠ 最新一轮登记 ${row.afterBytes}`,
    );
  }
});

test('V3-VOL-1 ③ growth: the registered input-module count equals the real metafile inputs (I8)', (t) => {
  // review 修复轮 I8：`duplicationCheck` 曾写「输入模块数 53」而真实 metafile 已随 v4-1 变为 57。
  // 散文里的数字必须是可核的：登记值 == `Object.keys(inputs).length`（登记 ↔ 实测 不得脱钩）。
  const registered = SIDEPANEL_GROWTH_BREAKDOWN.duplicationCheckInputModuleCount;
  assert.equal(typeof registered, 'number', '必须登记可核的输入模块数（不得只写在散文里）');
  assert.match(SIDEPANEL_GROWTH_BREAKDOWN.duplicationCheck, new RegExp(String(registered)), '散文里的模块数必须与登记值一致');
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
  const paths = Object.keys(meta.outputs[outKey as string].inputs);
  assert.equal(
    paths.length,
    registered,
    `真实 metafile inputs=${paths.length} ≠ 登记输入模块数 ${registered}（登记值与实测脱钩）`,
  );
});

// ── ④ directional guard (>15% over two consecutive rounds ⇒ report) ─────────

test('V3-VOL-1 ④ directional guard: two consecutive feature rounds >15% MUST raise a reportable alert', () => {
  // V4-1：守卫按 **Feature 作用域**判定（v4-chat 是另一个 Feature，不能把它的轮次并进
  // v3-ui 的「连续两轮」）。v3-ui 的历史判定保持不变（显式传作用域 = 不放宽）。
  const verdict = evaluateConsecutiveReRegistrationGrowth(SIDEPANEL_RE_REGISTRATIONS, 'specs-tree-web-cli-plugin-v3-ui');
  assert.equal(verdict.threshold, 0.15);
  assert.equal(verdict.feature, 'specs-tree-web-cli-plugin-v3-ui');
  assert.deepEqual(
    [...verdict.rounds],
    SIDEPANEL_RE_REGISTRATIONS.filter(
      (r) => r.roundKind === 'feature-round' && r.feature === 'specs-tree-web-cli-plugin-v3-ui',
    ).map((r) => r.id),
    '方向性守卫只按**功能轮**计「连续两轮」（V4-1：按 Feature 作用域过滤 —— v4-chat 的轮次不并入 v3-ui）',
  );
  assert.ok(verdict.cumulativePct > 0.15, `当前累计增幅 ${(verdict.cumulativePct * 100).toFixed(2)}% 必须 >15%`);
  assert.ok(verdict.warning !== null, '>15% 时必须产出可读告警（不得无声膨胀）');
  assert.match(verdict.warning ?? '', /回报编排器/, '告警必须点明「显式回报编排器」');
  assert.match(verdict.warning ?? '', /22\.9\d%|累计增幅/, '告警必须给出可读的百分比');
  // 告警与元数据必须同源（防止「注释里说报警、机器里没有」）。
  assert.match(SIDEPANEL_BASELINE_META.consecutiveGrowthAlert, /已触发/);
  assert.equal(SIDEPANEL_BASELINE_META.consecutiveGrowthAlertThreshold, 0.15);
  console.log(`  ℹ 方向性守卫：${verdict.warning}`);
  // V4-1 自身（新 Feature 作用域）必须同样可判：首轮累计 +2.72%，低于 15% 线 ⇒ 不告警。
  const v41 = evaluateConsecutiveReRegistrationGrowth(SIDEPANEL_RE_REGISTRATIONS, 'specs-tree-web-cli-plugin-v4-chat');
  assert.deepEqual([...v41.rounds], ['v4-1'], 'v4-chat 作用域只应含 v4-1 功能轮');
  assert.equal(v41.warning, null, '单轮 +2.72% 不应触发 >15% 告警');
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
  // V4-1（TASK-512）：**当前**体积登记载体是 v4 密度基线；v3 基线冻结为历史（375,102 B）。
  const currentPath = new URL('../../docs/v4-density-baseline.json', import.meta.url);
  const frozen = JSON.parse(
    readFileSync(new URL('../../docs/v3-density-baseline.json', import.meta.url), 'utf8'),
  ) as { volume: Record<string, unknown> };
  assert.equal(frozen.volume.registeredBaselineBytes, 375_102, 'v3 基线体积登记值必须逐字冻结为历史');
  const registry = JSON.parse(readFileSync(currentPath, 'utf8')) as { volume: Record<string, unknown> };
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

// ── ③d 全部 round rows 的「Δ 自洽 + Σ == 该轮登记总增量」（N-05 收口轮） ──────
/**
 * 〖N-05（收口轮，v4-1 validate R1）〗
 *
 * I9 只给 `v41RoundRows` 加了自洽断言；**历史两组 round rows**（`closeoutRoundRows` /
 * `r3RoundRows`）既无 Δ 自洽断言、也无「Σ == 登记总增量」断言，结果 `5cf1ba8` 的一处机械
 * 改写把它们改成累计口径却**没有任何门禁变红**（5 处 `deltaBytes ≠ afterBytes − beforeBytes`）。
 * 本判据把 I9 的口径**推广到全部 round rows**：
 *   ① 每行 `deltaBytes == afterBytes − (beforeBytes ?? 0)`；
 *   ② 每行 `beforeBytes` 非空时必须是正数（历史轮次两轮都在）；
 *   ③ 每组 rows 的 `Σ(deltaBytes) + 该组未归因胶水` == `SIDEPANEL_RE_REGISTRATIONS[登记 id]`
 *      的 `baselineAfterBytes − baselineBeforeBytes`（**登记值与逐模块归因不得脱钩**）。
 * 组 ↔ 登记 id 的映射登记在基线自身（`roundRowRegistrationIds`），不在测试里写魔数。
 */
interface RoundRow {
  readonly module: string;
  readonly beforeBytes: number | null;
  readonly afterBytes: number;
  readonly deltaBytes: number;
}

function roundRowProblems(
  groupName: string,
  rows: readonly RoundRow[],
  expectedTotalBytes: number,
  glueBytes = 0,
): string[] {
  const problems: string[] = [];
  if (rows.length === 0) problems.push(`${groupName}: rows 不得为空`);
  for (const row of rows) {
    const expected = row.afterBytes - (row.beforeBytes ?? 0);
    if (row.deltaBytes !== expected) {
      problems.push(`${groupName}/${row.module}: Δ ${row.deltaBytes} ≠ after − before = ${expected}（口径混用）`);
    }
    if (row.beforeBytes !== null && row.beforeBytes <= 0) {
      problems.push(`${groupName}/${row.module}: beforeBytes 必须为正数（实测 ${row.beforeBytes}）`);
    }
  }
  const sum = rows.reduce((s, r) => s + r.deltaBytes, 0);
  if (sum + glueBytes !== expectedTotalBytes) {
    problems.push(
      `${groupName}: Σ(Δ)=${sum} + glue=${glueBytes} ≠ 该轮登记总增量 ${expectedTotalBytes}（逐模块归因与登记值脱钩）`,
    );
  }
  return problems;
}

test('V3-VOL-1 ③(N-05) 全部 round rows：每行 Δ 自洽 ∧ Σ == 该轮登记总增量（含 closeout/r3 历史组）', () => {
  const b = SIDEPANEL_GROWTH_BREAKDOWN;
  const groups: Array<{ name: string; rows: readonly RoundRow[]; glue: number }> = [
    { name: 'closeoutRoundRows', rows: b.closeoutRoundRows, glue: 0 },
    { name: 'r3RoundRows', rows: b.r3RoundRows, glue: 0 },
    { name: 'v41RoundRows', rows: b.v41RoundRows, glue: b.v41RoundUnattributedGlueBytes },
    { name: 'v42RoundRows', rows: b.v42RoundRows, glue: b.v42RoundUnattributedGlueBytes },
    { name: 'v42CloseoutRows', rows: b.v42CloseoutRows, glue: b.v42CloseoutUnattributedGlueBytes },
    { name: 'v43RoundRows', rows: b.v43RoundRows, glue: b.v43RoundUnattributedGlueBytes },
    { name: 'v43ReviewfixRows', rows: b.v43ReviewfixRows, glue: b.v43ReviewfixUnattributedGlueBytes },
    // V4-4（TASK-811）：追加本叶段（第 8 组）。断言只增不减（7 → 8）。
    { name: 'v44RoundRows', rows: b.v44RoundRows, glue: b.v44RoundUnattributedGlueBytes },
    // V4-4 R2（KL-V44-01 裁决落地轮）：追加第 9 组（只增不减）。
    { name: 'v44R2Rows', rows: b.v44R2Rows, glue: b.v44R2UnattributedGlueBytes },
    // V4-4 审查修复轮（BLOCK-01~03 + I-01~I-08）：追加第 10 组（只增不减）。
    { name: 'v44ReviewfixRows', rows: b.v44ReviewfixRows, glue: b.v44ReviewfixUnattributedGlueBytes },
    // V4-4 快修轮（I-09~I-11）：追加第 11 组（只增不减）。
    { name: 'v44I09fixRows', rows: b.v44I09fixRows, glue: b.v44I09fixUnattributedGlueBytes },
    // V4-4 收口轮（F-01 + N-01~N-05）：追加第 12 组（只增不减）。
    { name: 'v44CloseoutRows', rows: b.v44CloseoutRows, glue: b.v44CloseoutUnattributedGlueBytes },
    // F 还原度快修轮（FIX-1~FIX-4）：追加第 13 组（只增不减）。
    { name: 'fFidelityFixRows', rows: b.fFidelityFixRows, glue: b.fFidelityFixUnattributedGlueBytes },
    // V4.5-1 R1（W1+W2，TASK-V45-101~106）：追加第 14 组（只增不减）。
    { name: 'v45W1W2Rows', rows: b.v45W1W2Rows, glue: b.v45W1W2UnattributedGlueBytes },
    // V4.5-1 review R1 修复轮（BLOCK-01~04 + I-01~06）：追加第 15 组（只增不减）。
    { name: 'v45ReviewfixRows', rows: b.v45ReviewfixRows, glue: b.v45ReviewfixUnattributedGlueBytes },
    // V5-1 R1（TASK-V5-101~113）：追加第 16 组（只增不减）。
    { name: 'v51R1Rows', rows: b.v51R1Rows, glue: b.v51R1UnattributedGlueBytes },
    // V5-2 R1（TASK-V5-123~137；编排器裁决① 显式升档）：追加第 17 组（只增不减）。
    { name: 'v52R1Rows', rows: b.v52R1Rows, glue: b.v52R1UnattributedGlueBytes },
    // V5-2 R2（TASK-V5-138~152）：追加第 18 组（只增不减）。
    { name: 'v52R2Rows', rows: b.v52R2Rows, glue: b.v52R2UnattributedGlueBytes },
    { name: 'v52ReviewfixRows', rows: b.v52ReviewfixRows, glue: b.v52ReviewfixUnattributedGlueBytes },
    // V5-2 收口轮（2026-09-22，validate R1 N-01 + N-04~N-09 / KL-N-10 登记）：追加第 20 组（只增不减）。
    { name: 'v52CloseoutRows', rows: b.v52CloseoutRows, glue: b.v52CloseoutUnattributedGlueBytes },
    // V5-3 R2（末叶 / 收口叶 + 三叶合计终轮）：追加第 21 组（只增不减）。
    { name: 'v53Rows', rows: b.v53Rows, glue: b.v53UnattributedGlueBytes },
    // V5-3 review R1 修复轮（BLOCK-01 + I-01~05）：追加第 22 组（只增不减）。
    { name: 'v53FixRows', rows: b.v53FixRows, glue: b.v53FixUnattributedGlueBytes },
    // 〖R4 缺陷修复轮（2026-09-22）〗追加第 23 组（只增不减）。
    { name: 'r4SelectorFixRows', rows: b.r4SelectorFixRows, glue: b.r4SelectorFixUnattributedGlueBytes },
    // 〖V5.5-1 R1（W1+W2 驱动者层底座轮；2026-09-23）〗追加第 24 组（只增不减）。
    { name: 'v551R1Rows', rows: b.v551R1Rows, glue: b.v551R1UnattributedGlueBytes },
    // 〖V5.5-1 R2（2026-09-23，W3+W4 收口轮）〗追加第 25 组（只增不减）。
    { name: 'v551R2Rows', rows: b.v551R2Rows, glue: b.v551R2UnattributedGlueBytes },
    // 〖V5.5-1 review R1 修复轮（2026-09-23，BLOCK-01/02 + I-01~03）〗追加第 26 组（只增不减）。
    { name: 'v551FixRows', rows: b.v551FixRows, glue: b.v551FixUnattributedGlueBytes },
    // 〖V5.5-2 R1（2026-09-23，W1~W4 中间登记）〗追加第 27 组（只增不减）。
    { name: 'v552R1Rows', rows: b.v552R1Rows, glue: b.v552R1UnattributedGlueBytes },
    // 〖V5.5-2 R2（2026-09-23，W5 = 本叶最终登记）〗追加第 28 组（只增不减）。
    { name: 'v552R2Rows', rows: b.v552R2Rows, glue: b.v552R2UnattributedGlueBytes },
    // 〖V5.5-2 小修轮（2026-09-23，review R1 的 I-01~04）〗追加第 29 组（只增不减）。
    { name: 'v552R3Rows', rows: b.v552R3Rows, glue: b.v552R3UnattributedGlueBytes },
    // 〖V5.5-3 R1（2026-09-23，W1+W2 三档清分 + `pressCandidate` + AI 自动成回合）〗追加第 30 组（只增不减）。
    { name: 'v553R1Rows', rows: b.v553R1Rows, glue: b.v553R1UnattributedGlueBytes },
    // 〖V5.5-3 R2（2026-09-23，W3 仲裁 + W4 护栏）〗追加第 31 组（只增不减）。
    { name: 'v553R2Rows', rows: b.v553R2Rows, glue: b.v553R2UnattributedGlueBytes },
    // 〖R6 缺陷快修轮（2026-09-23，真机体验 ty.md）〗追加第 32 组（只增不减）。
    { name: 'r6TyFixRows', rows: b.r6TyFixRows, glue: b.r6TyFixUnattributedGlueBytes },
    // 〖V5.5F-1 R1+R2（2026-09-24，leaf specs-tree-v55f-1-ref-context-and-anchor；W1~W4）〗追加第 33 组（只增不减）。
    { name: 'v55f1R1R2Rows', rows: b.v55f1R1R2Rows, glue: b.v55f1R1R2UnattributedGlueBytes },
    // 〖V5.5F-2 R1+R2（2026-09-24，leaf specs-tree-v55f-2-batch-consent；W1~W3）〗追加第 34 组（只增不减）。
    { name: 'v55f2R1R2Rows', rows: b.v55f2R1R2Rows, glue: b.v55f2R1R2UnattributedGlueBytes },
    // 〖IAN-1 R1（2026-09-24，leaf specs-tree-ian-1-free-input-next；W1+W2）〗追加第 35 组（只增不减）。
    { name: 'ian1R1Rows', rows: b.ian1R1Rows, glue: b.ian1R1UnattributedGlueBytes },
    // 〖IAN-1 R2（2026-09-25，W3 = 叶1 收口终值）〗追加第 36 组（只增不减；`ian1Rows` 是整叶聚合组，不在此表）。
    { name: 'ian1R2Rows', rows: b.ian1R2Rows, glue: b.ian1R2UnattributedGlueBytes },
    // 〖★ IAN-2 R1（2026-09-25，leaf specs-tree-ian-2-abolish-composer）〗追加第 37 组（净负轮；只增不减）。
    { name: 'ian2Rows', rows: b.ian2Rows, glue: b.ian2UnattributedGlueBytes },
    // 〖★ R8 缺陷修复轮（2026-09-25，首开 / ready 入口）〗追加第 38 组（只增不减）。
    { name: 'r8Rows', rows: b.r8Rows, glue: b.r8UnattributedGlueBytes },
  ];
  const problems: string[] = [];
  for (const g of groups) {
    const id = b.roundRowRegistrationIds[g.name];
    assert.ok(typeof id === 'string' && id.length > 0, `${g.name} 必须登记对应的 SIDEPANEL_RE_REGISTRATIONS 条目 id`);
    const registration = SIDEPANEL_RE_REGISTRATIONS.find((r) => r.id === id);
    assert.ok(registration, `${g.name} 登记的 ${id} 在 SIDEPANEL_RE_REGISTRATIONS 中不存在（悬空登记）`);
    const total = registration!.baselineAfterBytes - registration!.baselineBeforeBytes;
    problems.push(...roundRowProblems(g.name, g.rows, total, g.glue));
  }
  assert.deepEqual(problems, [], `round rows 与登记值不自洽（N-05）：\n${problems.join('\n')}`);
  // 每组都必须真的被判（否则本断言可被空集合空转）。V4-4 追加第 8 组、R2 追加第 9 组、
  // 审查修复轮第 10 组、快修轮第 11 组、收口轮第 12 组、V4.5-1 R1 第 14 组、
  // V4.5-1 review R1 修复轮第 15 组、V5.5-2 R1 第 27 组、V5.5-2 R2 第 28 组（只增不减）。
  assert.equal(groups.length, 38);
  console.log(
    `  ℹ round rows：${groups.map((g) => `${g.name}=${g.rows.reduce((s, r) => s + r.deltaBytes, 0)}`).join(' / ')}`,
  );
});

test('V3-VOL-1 ③(N-05) REVERSE PROOF: round-row 判据必须能红（Δ 混用 / Σ 脱钩 / 空组）', () => {
  const rows: RoundRow[] = [
    { module: 'a.ts', beforeBytes: 100, afterBytes: 150, deltaBytes: 50 },
    { module: 'b.ts', beforeBytes: 200, afterBytes: 260, deltaBytes: 60 },
  ];
  assert.deepEqual(roundRowProblems('g', rows, 110), [], '自洽且 Σ == 登记总增量时不得误报');
  assert.ok(
    roundRowProblems('g', [{ module: 'a.ts', beforeBytes: 100, afterBytes: 150, deltaBytes: 999 }], 999).length > 0,
    'Δ ≠ after − before 必须判红（这正是 5cf1ba8 的污染形态）',
  );
  assert.ok(roundRowProblems('g', rows, 111).length > 0, 'Σ + glue ≠ 登记总增量必须判红（脱钩）');
  assert.ok(roundRowProblems('g', rows, 110, 7).length > 0, 'glue 不匹配必须判红');
  assert.ok(roundRowProblems('g', [], 0).length > 0, '空 rows 组必须判红（否则断言可空转）');
  assert.ok(
    roundRowProblems('g', [{ module: 'a.ts', beforeBytes: -1, afterBytes: 1, deltaBytes: 2 }], 2).length > 0,
    'beforeBytes ≤ 0 必须判红',
  );
});

/**
 * 〖V4.5-1 R3（TASK-V45-118 / ADR-V45-011 §3）〗**零字节轮的逐模块归因**。
 *
 * 终轮（W4+W5）登记 Δ = 0，因此它的逐模块归因不是「一组 rows 的和 == Δ」，
 * 而是**更强**的一条：真实 esbuild metafile 与 W3 轮逐模块**逐值相等**
 * （Σ Δ = 0 ∧ 未归因胶水 0）。这条把「真的没变」变成可机核事实 ——
 * 与「登记滞后」互为反证：若 R3 偷偷改了任一模块，metafile 与 W3 轮登记的
 * `afterBytes` 就会不等，本判据立即 FAIL。
 *
 * R3 唯一的 `src` 改动是 `src/ui/options/index.html` 的纯文案行（不进 `sidepanel.js`），
 * 因此这条等式成立本身也是对「改的是文案而不是产物」的机器证据。
 */
test('V4.5-1 R3 growth: 终轮（Δ=0）历史登记 + 最新一轮 metafile 逐值一致（Σ Δ 可核）', (t) => {
  // 前置：终轮登记必须是零字节 + unchanged（否则本判据的语义不成立）。
  assert.equal(SIDEPANEL_W4W5_FINAL_ROUND.direction, 'unchanged', '终轮方向必须是 unchanged');
  assert.equal(
    SIDEPANEL_W4W5_FINAL_ROUND.baselineAfterBytes - SIDEPANEL_W4W5_FINAL_ROUND.baselineBeforeBytes,
    0,
    '终轮登记必须是 Δ = 0',
  );
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
  const paths = Object.keys(out.inputs);
  // ① 真实产物的总字节必须等于登记基线（Δ=0 的基线仍与产物同源）。
  assert.equal(out.bytes, SIDEPANEL_BASELINE_BYTES, '真实 metafile 输出字节必须等于登记基线');
  // ② 逐模块：与**最新一轮**（V5.5-1 review R1 修复轮）登记的 afterBytes 逐值相等 ⇒ 真实 metafile
  //    与最新登记同源（历史各轮的 Δ 由 N-05 组判据承担；此后任何一轮都必须重新登记）。
  let judged = 0;
  // ★ R8 缺陷修复轮：最新一轮 = `r8Rows`（+349 B）；其 afterBytes 必须与真实 metafile 逐值相等。
  for (const row of SIDEPANEL_GROWTH_BREAKDOWN.r8Rows) {
    const key = paths.find((p) => p.endsWith(row.module));
    assert.ok(key, `metafile 缺少模块 ${row.module}`);
    assert.equal(
      out.inputs[key as string].bytesInOutput,
      row.afterBytes,
      `${row.module}: 最新一轮 metafile ${out.inputs[key as string].bytesInOutput} ≠ 登记 ${row.afterBytes}（归因等式被打破）`,
    );
    judged += 1;
  }
  assert.ok(judged > 0, '零字节轮的归因必须真的判到模块（否则是空转）');
  // ③ 本轮的逐模块归因集**为空**（没有任何模块被移动）—— 空集不是省略，而是登记事实：
  //    Σ([]) + glue(0) == 登记增量 0。归因集为空 + ② 的逐值相等，共同表述「真的没变」。
  const rows = SIDEPANEL_GROWTH_BREAKDOWN.v45W4W5Rows;
  assert.equal(rows.length, 0, '终轮的逐模块 rows 必须为空（无模块移动）—— 非空即说明有未登记的产物变化');
  const rowsSum = (rows as readonly { deltaBytes: number }[]).reduce((n, r) => n + r.deltaBytes, 0);
  const registeredDelta = SIDEPANEL_W4W5_FINAL_ROUND.baselineAfterBytes - SIDEPANEL_W4W5_FINAL_ROUND.baselineBeforeBytes;
  assert.equal(
    rowsSum + SIDEPANEL_GROWTH_BREAKDOWN.v45W4W5UnattributedGlueBytes,
    registeredDelta,
    'Σ 逐模块 Δ（空集 = 0）+ 未归因胶水（0）必须 == 登记增量（0）',
  );
  assert.equal(registeredDelta, 0);
});

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-3 **TASK-V55-319**（体积收口定稿）· FR-SELF-120~124 · AC-SELF-023/024 · ADR-V55-011
 *
 * 本叶（末叶）**终轮**：R3 `src/**` **零字节改动** ⇒ Δ = **0**。零字节轮也要**留痕**
 * （否则「登记滞后」与「真的没变」无法区分）；「未跨档位」是**二态显式**结论之一。
 * ──────────────────────────────────────────────────────────────────────────── */
test('R6 缺陷快修轮体积定稿：五要素齐备 ∧ 未跨档位 ∧ 三值同源 ∧ pending-author-line 未伪称', (t) => {
  // 〖R6 缺陷快修轮（2026-09-23）〗随轮次重指向：最新一轮 = `r6-ty-fix`（V5.5-3 R3 的历史
  // 零字节事实逐字保留在 ③b，不得删改；「终轮 after == 当前基线」的语义不降级，只是末轮前移）。
  const fr = SIDEPANEL_RE_REGISTRATIONS[SIDEPANEL_RE_REGISTRATIONS.length - 1];
  assert.ok(fr, '登记册不得为空');
  // 〖★ R8 缺陷修复轮（2026-09-25）〗末条前移：最新一轮 = `r8-open-next-entry`
  // （IAN-2 R1 / IAN-1 R2 / R1 与 V5.5F-2 的历史五要素逐字保留在登记册与元数据段）。
  assert.equal(fr.id, 'r8-open-next-entry', '末条登记必须是 R8（最新一轮）');
  // ① **提升轮**：方向 `raised` ∧ Δ == after − before > 0（不得伪装成净减/零字节）。
  assert.equal(fr.direction, 'raised', 'R8 必须登记为提升轮（`raised`）');
  assert.ok(fr.baselineAfterBytes - fr.baselineBeforeBytes > 0, 'R8 必须是正增量');
  assert.deepEqual(reRegistrationDirectionProblems([...SIDEPANEL_RE_REGISTRATIONS]), [], '方向 ↔ Δ 必须双向一致（含 R6）');
  // ② 五要素终值同源。
  assert.equal(fr.baselineAfterBytes, SIDEPANEL_BASELINE_BYTES, '最新一轮 after 必须 == 当前基线');
  assert.equal(fr.ceilingAfterBytes, SIDEPANEL_CEILING, '最新一轮 ceiling 必须 == 当前生效上限（公式派生）');
  assert.equal(fr.ceilingUncappedFormulaBytes, Math.floor(SIDEPANEL_BASELINE_BYTES * 1.05));
  assert.equal(fr.ceilingUncappedFormulaBytes, 628_872);
  assert.equal(SIDEPANEL_CEILING_CAP_ROLE, 'record-only', 'cap 必须仍是纯记录字段');
  assert.equal(PENDING_ABSOLUTE_CAP.newBaselineBytes, SIDEPANEL_BASELINE_BYTES, '三值同源：newBaselineBytes');
  assert.equal(PENDING_ABSOLUTE_CAP.absoluteCeilingBytes, SIDEPANEL_TIER_BYTES * 1.1, '三值同源：absoluteCeilingBytes');
  const closeout = JSON.parse(
    readFileSync(new URL('../../docs/v4-supersession-ledger.json', import.meta.url), 'utf8'),
  ) as { v3Vol3Closeout?: { authorConfirmation?: { status?: string } } };
  assert.equal(closeout.v3Vol3Closeout?.authorConfirmation?.status, 'pending-author-line', '作者确认保持占位（不得伪称已确认）');
  // ③ **未跨档位**（二态显式）：档位 == ceilTo50KB(基线) ∧ 基线 ≤ 档位 ⇒ 无需升档。
  assert.equal(SIDEPANEL_TIER_BYTES, ceilTo50KB(SIDEPANEL_BASELINE_BYTES), '档位必须与 ceilTo50KB(基线) 同源');
  assert.ok(SIDEPANEL_BASELINE_BYTES <= SIDEPANEL_TIER_BYTES, '基线必须仍在档位内（未跨档位）');
  assert.equal(SIDEPANEL_TIER_BYTES, 614_400);
  assert.equal(PENDING_ABSOLUTE_CAP.absoluteCeilingBytes, 675_840);
  // ③b **V5.5-3 R3 历史零字节轮**：Δ=0 / `unchanged` / ceiling 602,095 / rows 空集逐字保留。
  assert.equal(SIDEPANEL_V553_FINAL_ROUND.direction, 'unchanged', 'V5.5-3 R3 历史零字节轮方向逐字保留');
  assert.equal(SIDEPANEL_V553_FINAL_ROUND.baselineAfterBytes - SIDEPANEL_V553_FINAL_ROUND.baselineBeforeBytes, 0, 'V5.5-3 R3 Δ=0 历史事实保留');
  assert.equal(SIDEPANEL_V553_FINAL_ROUND.ceilingUncappedFormulaBytes, 602_095, 'V5.5-3 R3 ceiling 历史值保留');
  assert.equal(SIDEPANEL_GROWTH_BREAKDOWN.v553R3Rows.length, 0, 'V5.5-3 R3 零字节轮的逐模块 rows 为空（历史事实）');
  assert.equal(SIDEPANEL_GROWTH_BREAKDOWN.v553R3UnattributedGlueBytes, 0);
  // ④ 最新一轮逐模块归因：Σ + glue == 登记增量（净负轮）。
  const rows = SIDEPANEL_GROWTH_BREAKDOWN.r8Rows;
  assert.ok(rows.length > 0, 'R8 逐模块 rows 必须非空（提升轮）');
  assert.equal(
    rows.reduce((n, r) => n + r.deltaBytes, 0) + SIDEPANEL_GROWTH_BREAKDOWN.r8UnattributedGlueBytes,
    fr.baselineAfterBytes - fr.baselineBeforeBytes,
    'R8 Σ 逐模块 + glue 必须 == 登记增量（提升）',
  );
  // ⑤ 真实 metafile 与**最新一轮**（R2）逐模块逐值相等 ⇒ 「真的没变」是机器事实。
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
  assert.equal(out.bytes, SIDEPANEL_BASELINE_BYTES, '真实产物字节必须等于登记基线（Δ=0 仍与产物同源）');
  let judged = 0;
  for (const row of SIDEPANEL_GROWTH_BREAKDOWN.r8Rows) {
    const key = Object.keys(out.inputs).find((p) => p.endsWith(row.module));
    assert.ok(key, `metafile 缺少模块 ${row.module}`);
    assert.equal(out.inputs[key as string].bytesInOutput, row.afterBytes, `${row.module}: 最新一轮 metafile 必须与登记逐值相等`);
    judged += 1;
  }
  assert.ok(judged > 0, '零字节轮的归因必须真的判到模块（否则是空转）');
  // ⑥ 三冻结面（真实产物字节）。
  assert.equal(readArtifactSize(distArtifact('content.js')), 177_076);
  assert.equal(readArtifactSize(distArtifact('pick-layer.js')), 34_358);
  assert.equal(readArtifactSize(distArtifact('sidepanel.js')), SIDEPANEL_BASELINE_BYTES);
  console.log(`  ℹ R8 提升轮：Δ=${rows.reduce((n: number, r: { deltaBytes: number }) => n + r.deltaBytes, 0)} · 五要素 = ${SIDEPANEL_BASELINE_BYTES} / ${SIDEPANEL_CEILING} / ${SIDEPANEL_TIER_BYTES} / ${PENDING_ABSOLUTE_CAP.absoluteCeilingBytes} / pending-author-line（未跨档位）`);
});

/* ────────────────────────────────────────────────────────────────────────────
 * ★ IAN-1 **TASK-IAN-126**（ADR-IAN-010 §④ · FR-IAN-114 · AC-IAN-025）——
 * **叶1 收口终值**的**整叶**逐模块聚合判据（`ian1Rows`；W1+W2+W3）。
 *
 * 与 N-05 的单轮组不同，`ian1Rows` 是**整叶聚合**（不映射单轮登记条目）：其 Σ + glue
 * 必须 == 叶起点（`ian-1-r1.baselineBeforeBytes = 591,946`）→ 叶终值（当前基线）的整叶增量。
 * ──────────────────────────────────────────────────────────────────────────── */
test('IAN-1 体积叶1 收口：整叶 Σ（ian1Rows）== 叶起点 → 叶终值（+7,179）∧ 五要素终值同源', () => {
  const b = SIDEPANEL_GROWTH_BREAKDOWN;
  const leafStart = SIDEPANEL_RE_REGISTRATIONS.find((r) => r.id === 'ian-1-r1')?.baselineBeforeBytes;
  assert.equal(leafStart, 591_946, '叶起点（IAN-1 R1 的 before）必须逐字保留');
  const leafEnd = 599_125; // IAN-1 R2 叶终值（历史常量；★ IAN-2 后当前基线前移，本条只判叶1 自身的整叶 Σ）
  const leafDelta = leafEnd - (leafStart as number);
  assert.equal(leafDelta, 7_179, '整叶增量 = 599,125 − 591,946 = +7,179');
  assert.equal(
    b.ian1Rows.reduce((s, r) => s + r.deltaBytes, 0) + b.ian1UnattributedGlueBytes,
    leafDelta,
    '整叶 Σ 逐模块 + 未归因胶水必须 == 整叶增量（逐模块表不得漏项）',
  );
  // 逐行 Δ 自洽。
  for (const row of b.ian1Rows) {
    assert.equal(row.deltaBytes, row.afterBytes - row.beforeBytes, `${row.module}: Δ 必须自洽`);
    assert.ok(row.deltaBytes > 0, `${row.module}: 整叶聚合行必须为正增量`);
  }
  // R2 单轮组与 R1 单轮组之和 == 整叶聚合（无重叠、无遗漏）。
  const r1Sum = b.ian1R1Rows.reduce((s, r) => s + r.deltaBytes, 0);
  const r2Sum = b.ian1R2Rows.reduce((s, r) => s + r.deltaBytes, 0);
  assert.equal(r1Sum + r2Sum + b.ian1UnattributedGlueBytes, leafDelta, 'R1 + R2 单轮组之和必须 == 整叶增量');
  // 预算结算（越叶预算如实登记）：整叶 +7,179 B ≈ 7.01 KiB 越 ADR-IAN-010 §② 预算 +2.5~4.5 KB 与 +15% 上界。
  assert.ok(leafDelta > 5_200, '整叶增量必须如实登记为**越叶预算上界**（> +5.2 KB）');
  // ⑤ 三冻结面 + 未跨档位 + pending-author-line（二态显式）。
  assert.equal(SIDEPANEL_TIER_BYTES, ceilTo50KB(SIDEPANEL_BASELINE_BYTES));
  assert.ok(SIDEPANEL_BASELINE_BYTES <= SIDEPANEL_TIER_BYTES, '基线必须仍在档位内（未跨档位）');
  assert.ok(SIDEPANEL_BASELINE_BYTES <= SIDEPANEL_CEILING, '基线必须在生效上限内');
  console.log(`  ℹ IAN-1 叶1 收口：整叶 +${leafDelta} B（R1 +${r1Sum} / R2 +${r2Sum} / glue ${b.ian1UnattributedGlueBytes}）· 五要素 = ${SIDEPANEL_BASELINE_BYTES} / ${SIDEPANEL_CEILING} / ${SIDEPANEL_TIER_BYTES} / ${PENDING_ABSOLUTE_CAP.absoluteCeilingBytes} / pending-author-line`);
});
