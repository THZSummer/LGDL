/**
 * V3-4 TASK-411 (ADR-V3-031 / NFR-V3-003 / NFR-V3-004 / AC-V3-015) — the new
 * artifact's own guard.
 *
 * `dist/pick-layer.js` is the page-side pick layer. It exists **because** the
 * resident `dist/content.js` has zero headroom (177,076 B = `CONTENT_MAX_BYTES`, no
 * tolerance), so the one thing this file must prove is that the new artifact did not
 * become a loophole:
 *
 *   - it has its **own** no-growth ceiling (`PICK_LAYER_CEILING` = the first measured
 *     value, tolerance 0) and `+1 B` must FAIL;
 *   - it is **not** merged with `content.js` — the two are asserted separately, so
 *     neither can buy headroom with the other's slack;
 *   - `content.js` is still exactly 177,076 B and the three frozen source files still
 *     hash to their pins (this leaf must not have touched them).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import {
  CONTENT_MAX_BYTES,
  CONTENT_SOURCE_SHA256,
  PICK_LAYER_BASELINE_BYTES,
  PICK_LAYER_BASELINE_BYTES_HISTORY,
  PICK_LAYER_BASELINE_META,
  PICK_LAYER_CEILING,
  PICK_LAYER_FINAL_ARTIFACT_BYTES,
  PICK_LAYER_RE_REGISTRATIONS,
  distArtifact,
  evaluateContentCeiling,
  evaluatePickLayerCeiling,
} from './size-baseline.js';
/** sha256 of a UTF-8 string (the repo's frozen-file discipline). */
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function sizeOf(url: URL): number | undefined {
  try {
    return statSync(url).size;
  } catch {
    return undefined;
  }
}

test('V3-4 size: dist/pick-layer.js 独立无容差上限（+1 B 反证）且不与 content.js 合并计数', (t) => {
  const size = sizeOf(distArtifact('pick-layer.js'));
  if (size === undefined) {
    // I-09 (review R1): a missing artifact must **FAIL**, not skip. `t.skip` passes the
    // test without judging anything, so an unbuilt tree would silently have no size
    // guard at all (`npm test` does not build by itself). `npm run test:v3` builds
    // first, so this branch only ever fires when the guard would otherwise be vacuous.
    t.diagnostic('dist/pick-layer.js not present — run `npm run build --workspace @lgdl/web-cli-plugin` first');
    assert.fail('dist/pick-layer.js 不存在：体积守卫必须失败而不是跳过（先 npm run build）');
  }
  // ① the registered value IS the shipped artifact (same discipline as sidepanel/content).
  assert.equal(size, PICK_LAYER_FINAL_ARTIFACT_BYTES, `登记 ${PICK_LAYER_FINAL_ARTIFACT_BYTES}B ≠ 实测 ${size}B（按真实产物登记）`);
  assert.equal(size, PICK_LAYER_BASELINE_BYTES);
  assert.equal(PICK_LAYER_CEILING, PICK_LAYER_BASELINE_BYTES, '新 artifact 的上限 = 首轮实测值（无容差）');
  assert.equal(PICK_LAYER_BASELINE_META.tolerance, 0, '无容差不得被悄悄放宽');
  // ② the guard really fails: +1 B over the ceiling.
  assert.equal(evaluatePickLayerCeiling(size).ok, true);
  const over = evaluatePickLayerCeiling(PICK_LAYER_CEILING + 1);
  assert.equal(over.ok, false, 'ceiling + 1 必须 FAIL');
  assert.equal(over.excessBytes, 1);
  assert.throws(() => assert.equal(over.ok, true, over.message), /体积回归/, '反证：+1 B 必须命中体积回归判据');
  // ③ NOT merged with content.js: the two ceilings are independent numbers, and the
  //    proof is that each one's failure mode is evaluated on its own artifact.
  assert.notEqual(PICK_LAYER_CEILING, CONTENT_MAX_BYTES);
  assert.equal(evaluatePickLayerCeiling(CONTENT_MAX_BYTES + 1).ok, false, 'pick-layer 的守卫不得拿 content.js 的余量兜底');
  assert.equal(evaluateContentCeiling(PICK_LAYER_CEILING + 1).ok, true, 'content.js 的守卫不得用 pick-layer 的上限');
  // ④ metadata provenance is complete (no anonymous baseline).
  for (const key of ['measuredOn', 'source', 'buildCommand', 'measuredBy', 'direction'] as const) {
    assert.ok(String(PICK_LAYER_BASELINE_META[key]).length > 0, `PICK_LAYER_BASELINE_META.${key} 必填`);
  }
  assert.equal(PICK_LAYER_BASELINE_META.previousBaselineBytes, 32_391, '前值必须是首轮实测的 32,391 B');
  assert.equal(PICK_LAYER_BASELINE_META.direction, 'raised');
  assert.equal(PICK_LAYER_BASELINE_META.source, 'packages/web-cli-plugin/dist/pick-layer.js');
  assert.ok(
    PICK_LAYER_BASELINE_META.disambiguation.includes('不得合并计数'),
    '元数据必须写明与 content.js 的关系（不合并计数）',
  );
  // ⑤ the TASK-401 spike bound is retained as the source of the feasibility claim.
  assert.ok(PICK_LAYER_BASELINE_META.spikeSkeletonBytes <= PICK_LAYER_BASELINE_META.spikeLimitBytes);
  assert.equal(PICK_LAYER_BASELINE_META.spikeLimitBytes, 60_000);

  // ── ⑥ V3-VOL-2 显式重登记的**披露五要素**（review BLOCK-2/R1 立下的纪律）────────
  // 与本用例既有断言同一形态：登记值必须 == 实测产物，增长必须**显式**而不是靠压缩。
  assert.equal(PICK_LAYER_BASELINE_META.measuredOn, '2026-09-17', '五要素之一：日期');
  assert.equal(PICK_LAYER_BASELINE_META.buildCommand, 'npm run build --workspace @lgdl/web-cli-plugin', '五要素之一：来源（构建命令）');
  // 历史值**逐字保留**（只追加，不得改写）——前值必须仍在 HISTORY 里，且必须仍在 META 的散文里。
  assert.ok(
    PICK_LAYER_BASELINE_BYTES_HISTORY.includes(32_391),
    '历史值 32,391 B 必须逐字保留在 PICK_LAYER_BASELINE_BYTES_HISTORY（重登记不得抹掉前值）',
  );
  assert.match(PICK_LAYER_BASELINE_META.reRegisteredFrom, /32,391 B/, 'reRegisteredFrom 必须写明前值');
  assert.match(PICK_LAYER_BASELINE_META.reason, /32,391 → 33,900 B（\+1,509 B \/ \+4\.66%）/, 'reason 必须写明前后值与增幅');
  // 登记册（前后值 / 日期 / 来源 / 理由 / 断言零删减 / 历史保留）链条首尾相接，末项 == 当前登记值。
  assert.ok(PICK_LAYER_RE_REGISTRATIONS.length >= 2, '重登记登记册必须覆盖首轮与 V3-VOL-2 两次登记');
  for (const [i, r] of PICK_LAYER_RE_REGISTRATIONS.entries()) {
    for (const key of ['id', 'feature', 'date', 'source', 'buildCommand', 'measuredBy', 'reason'] as const) {
      assert.ok(String(r[key]).length > 0, `PICK_LAYER_RE_REGISTRATIONS[${i}].${key} 必填`);
    }
    assert.ok(r.assertionNonRemovalEntries.length > 0, `${r.id}: 必须登记「断言零删减」的台账条目`);
    assert.ok(r.reason.trim().length >= 40, `${r.id}: 理由必须可读（≥40 字符）`);
    assert.equal(
      r.ceilingUncappedFormulaBytes,
      r.baselineAfterBytes,
      `${r.id}: 本 artifact 容差为 0 ⇒ ceiling 候选值必须等于本轮登记值`,
    );
    assert.equal(r.ceilingAfterBytes, r.baselineAfterBytes, `${r.id}: ceilingAfterBytes 必须等于 baselineAfterBytes（无容差）`);
    if (i > 0) {
      const prev = PICK_LAYER_RE_REGISTRATIONS[i - 1];
      assert.equal(r.baselineBeforeBytes, prev.baselineAfterBytes, `${r.id}: 链条必须首尾相接（上一轮 after == 本轮 before）`);
    }
    for (const kept of r.historyRetainedBytes) {
      assert.ok(
        (PICK_LAYER_BASELINE_BYTES_HISTORY as readonly number[]).includes(kept),
        `${r.id}: historyRetainedBytes 里的 ${kept} 必须仍在 HISTORY 中逐字存在`,
      );
    }
  }
  const last = PICK_LAYER_RE_REGISTRATIONS[PICK_LAYER_RE_REGISTRATIONS.length - 1];
  assert.equal(last.baselineAfterBytes, PICK_LAYER_BASELINE_BYTES, '登记册末项必须 == 当前登记基线');
  // +1 B 反证落在**新值**上：33,901 必须 FAIL（无容差口径在新基线上重跑，不是只在新基线上「更大所以更松」）。
  assert.equal(evaluatePickLayerCeiling(PICK_LAYER_BASELINE_BYTES + 1).ok, false, '新值 +1 B（33,901）必须 FAIL');
  assert.equal(evaluatePickLayerCeiling(PICK_LAYER_BASELINE_BYTES + 1).measuredBytes, 33_901);
  assert.equal(evaluatePickLayerCeiling(33_901).excessBytes, 1);
  // 旧值上必须**不再**被判超限（否则等于把新基线的余量白扣掉）：32,391 通过。
  assert.equal(evaluatePickLayerCeiling(32_391).ok, true, '前值 32,391 B 不影响判定（历史值只作记录）');
});

test('V3-4 size: content.js 仍 ≤177,076 B（无容差）且冻结三文件 hash 不变', (t) => {
  const content = sizeOf(distArtifact('content.js'));
  if (content === undefined) {
    // I-09: same caliber as the pick-layer guard — a missing artifact is a FAIL.
    t.diagnostic('dist/content.js not present — run `npm run build --workspace @lgdl/web-cli-plugin` first');
    assert.fail('dist/content.js 不存在：content.js 冻结守卫必须失败而不是跳过（先 npm run build）');
  }
  assert.equal(content, CONTENT_MAX_BYTES, `content.js ${content}B ≠ ${CONTENT_MAX_BYTES}B —— 本叶必须是逐字节零改动`);
  assert.equal(evaluateContentCeiling(content).ok, true);
  assert.equal(evaluateContentCeiling(CONTENT_MAX_BYTES + 1).ok, false, '反证：content.js +1 B 必须 FAIL');
  for (const [file, pinned] of Object.entries(CONTENT_SOURCE_SHA256)) {
    const text = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert.equal(sha256(text), pinned, `${file} 内容 hash 与 pin 不一致（本叶不得改冻结文件）`);
  }
});

/**
 * V3-4 收口轮（validate R1 **F1**，2026-09-17）— 逐文件归因的**保真**判据。
 *
 * R1 的登记失真：`size-baseline.ts` 的 JSDoc / `PICK_LAYER_RE_REGISTRATIONS['v3-4-fix2'].reason`
 * 与台账 `featureHistory.v3-4-fix2.perFileAttribution` 三处都把 **R1 的预估分布**
 * （`615 / 504 / 307 / 83`）写成「受控实验实测」。实测分布是 `661 / 389 / 376 / 83`
 * （validate R1 独立复现 + `build.md §12.1`，Σ 与「交付态 − 全部回退态」逐字节相等）。
 *
 * 本用例把「三处同源 + 四项之和 == 总增幅」变成机器事实：不一致即 FAIL（不是靠人眼比对）。
 */
test('V3-4 size: 逐文件归因三处同源且四项之和 == 总增幅（Σ == +1,509，validate F1）', () => {
  const fix2 = PICK_LAYER_RE_REGISTRATIONS.find((r) => r.id === 'v3-4-fix2');
  assert.ok(fix2, '登记册必须含 v3-4-fix2 这一轮');
  const delta = fix2.baselineAfterBytes - fix2.baselineBeforeBytes;
  assert.equal(delta, 1_509, '本轮总增幅必须仍是 +1,509 B');
  // 实测分布（受控实验：逐文件回退到 R2 前 1e1b798 后重建；validate R1 独立复现同值）。
  const MEASURED: Record<string, number> = { overlay: 661, menu: 389, layer: 376, bridge: 83 };
  const parsed: Record<string, number> = {};
  for (const m of fix2.reason.matchAll(/pick-(overlay|menu|layer|bridge)\s*\+\s*([\d,]+)/g)) {
    parsed[m[1]] = Number(m[2].replace(/,/g, ''));
  }
  assert.equal(Object.keys(parsed).length, 4, `reason 必须逐文件给出四项归因（实测 ${Object.keys(parsed).join(' / ') || '空'}）`);
  assert.deepEqual(parsed, MEASURED, 'reason 的逐文件分布必须是实测值（不是 R1 预估值）');
  const sum = Object.values(parsed).reduce((a, b) => a + b, 0);
  assert.equal(sum, delta, `逐文件归因之和 ${sum} ≠ 总增幅 ${delta}（Σ 断言）`);
  // 第二处落点：JSDoc 必须写实测分布，并保留 F1 订正说明与历史（预估）分布。
  const src = readFileSync(new URL('../../test/size-baseline.ts', import.meta.url), 'utf8');
  assert.ok(
    src.includes('pick-overlay +661 / pick-menu +389 / pick-layer +376 / pick-bridge +83 = **+1,509 B**'),
    'JSDoc 的逐文件归因必须 == 实测分布',
  );
  assert.match(src, /收口轮订正（validate R1 \*\*F1\*\*/, 'JSDoc 必须写明 F1 订正（登记失真）');
  assert.match(src, /`\+615` \/ `\+504` \/ `\+307` \/ `\+83`/, 'F1 订正必须逐字保留历史（预估）分布，不得静默消失');
  // 第三处落点：台账必须同源。
  const ledger = JSON.parse(readFileSync(new URL('../../docs/v3-supersession-ledger.json', import.meta.url), 'utf8')) as {
    featureHistory?: { 'v3-4-fix2'?: { perFileAttribution?: Record<string, number | string> } };
  };
  const attr = ledger.featureHistory?.['v3-4-fix2']?.perFileAttribution;
  assert.ok(attr, '台账 featureHistory.v3-4-fix2.perFileAttribution 必须存在');
  const ledgerAttr = {
    overlay: attr['src/content/pick-overlay.ts'],
    menu: attr['src/content/pick-menu.ts'],
    layer: attr['src/content/pick-layer.ts'],
    bridge: attr['src/content/pick-bridge.ts'],
  };
  assert.deepEqual(ledgerAttr, MEASURED, '台账逐文件归因必须 == 实测分布');
  assert.equal(attr.totalBytes, delta, '台账 totalBytes 必须 == 总增幅');
  assert.equal(sum, attr.totalBytes, 'reason 四项之和 == 台账 totalBytes == 总增幅（三处同源）');
});
