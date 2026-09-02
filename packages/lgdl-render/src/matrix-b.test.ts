/**
 * matrix-b.test.ts — B 档等价类合成文档（FR-003，plan §7 表；NFR-006）。
 *
 * 每条 B 档 = MATRIX_DOCS_B[i].source → renderDoc → auditGeometry（KNOWN_B 已知
 * 缺口集或 0 违例）+ 文档专属语义断言（折叠 / 语义锁 / 元素存在性）。等价类归属
 * （E1~E6）见各条文件头注释与 registry intent（matrix-docs-b.ts）。B 档文档设计
 * 按 plan §7 表逐行：
 *
 *   B1（E2 全 kind 混排 + 双向边 + 中英 label，Q-004/Q-012）
 *   B2（E3 uml-class 折叠：无 polygon/pill/圆柱 path + members 行定位，Q-004）
 *   B3（Q-013/U-1 语义锁：mindmap+group 折叠 + 双渲染一致，EC-004）
 *   B4a/B4b（Q-013 语义锁：sequence participant=3 / gantt dep=任务依赖数，EC-004）
 *   B5（Q-005 聚合边 g→n：白底 label + M/L 正交）
 *   B6（Q-006 扇出标签合并：同 label 渲染 1 次）
 *   B7（Q-008/D4 gantt 负日期 + 依赖三型：gap≥20 / gap≈0 / 目标在左）
 *   B8（Q-007/E2 er 混 kind + 基数全枚举 22px 外置不压框）
 *   B9（Q-009/EC-003 datastream `_other` 混合态：lane rect=2 现状锁 + 双渲染一致，
 *       开放问题 #7 实证：layout 合成 `_other` 尾列节点（legacy/report）无 SVG
 *       lane rect 底框 → G5 泳道检查降级画布（audit 0 反证无越界））
 *   B10a/B10b（Q-011 state 多入口/纯环 → 无 <g class="lgdl-initial">）
 *   B11（P2，Q-001 大图 >120 grid；LGDL_MATRIX_B11=1 启用，默认 skip）
 *
 * G6 沿框边借道（2026-09-03 新增检查项，engine 贴边走线另 Feature 修复）使
 * B1/B4b/B5/B7/B9 现已知 G6 缺口 → 按 KNOWN_B 记录（EC-001 同款：记录不上报
 * 放宽，引擎修复后 KNOWN_B 列表会红提示收编回 clean 组）。
 *
 * 语义锁（B3/B4a/B4b/B9）：静默忽略/漏画不判六类违例（EC-004/EC-003），现状锁定 =
 * 二次渲染字节一致（引擎确定性 A-002）+ 元素级断言（tasks 微决策 1，不扩 manifest）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditGeometry, type Violation } from './test-support/geometry-audit.js';
import { renderDoc } from './test-support/render-harness.js';
import { MATRIX_DOCS_B, type BDocMeta } from './test-support/matrix-docs-b.js';
import { EXAMPLES_SOURCES } from './test-support/examples-sources.js';

function meta(id: string): BDocMeta {
  return MATRIX_DOCS_B.find((d) => d.id === id)!;
}

/** B 档已知缺口期望（EC-001 记录，语义同 matrix-a KNOWN_A；见文件头 G6 说明） */
interface KnownViolation {
  type: Violation['type'];
  docRef: string;
  textIncludes: string;
}

const KNOWN_B: Record<string, KnownViolation[]> = {
  B1: [
    { type: 'G6', docRef: 'edges[3]', textIncludes: '沿 n3 框上边借道' },
    { type: 'G6', docRef: 'edges[4]', textIncludes: '沿 n4 框上边借道' },
  ],
  B4b: [{ type: 'G6', docRef: 'edges[0]', textIncludes: '沿 t3 框左边借道' }],
  B5: [{ type: 'G6', docRef: 'edges[2]', textIncludes: '沿 out 框下边借道' }],
  B7: [
    { type: 'G6', docRef: 'edges[1]', textIncludes: '沿 t2 框左边借道' },
    { type: 'G6', docRef: 'edges[2]', textIncludes: '沿 t3 框左边借道' },
  ],
  B9: [{ type: 'G6', docRef: 'edges[1]', textIncludes: '沿 svc 框右边借道' }],
};

/** B 档审计断言：KNOWN_B 已知集一一配对；无记录档 = 0 违例 */
function assertAuditKnown(id: string, violations: Violation[]): void {
  const known = KNOWN_B[id] ?? [];
  if (known.length === 0) {
    assert.deepEqual(violations, [], `B 档 ${id} 应 0 违例: ${JSON.stringify(violations)}`);
    return;
  }
  assert.equal(violations.length, known.length, `B 档 ${id} 违例数应=${known.length}（已知 G6 集），实际=${JSON.stringify(violations)}`);
  const used = new Set<number>();
  for (const exp of known) {
    const idx = violations.findIndex((v, i) => {
      if (used.has(i)) return false;
      return v.type === exp.type && v.docRef === exp.docRef && `${v.element} | ${v.detail}`.includes(exp.textIncludes);
    });
    assert.ok(idx >= 0, `B 档 ${id} 应含已知违例 ${exp.type}@${exp.docRef} ~ "${exp.textIncludes}": ${JSON.stringify(violations)}`);
    used.add(idx);
  }
}

function countOf(svg: string, re: RegExp): number {
  return (svg.match(re) ?? []).length;
}

/** 全部节点块（lgdl-node / lgdl-class）按 data-lgdl-loc 索引 */
function nodeBlock(svg: string, idx: number): string | undefined {
  const re = new RegExp(`<g class="(?:lgdl-node|lgdl-class)" data-lgdl-loc="nodes\\[${idx}\\]">([\\s\\S]*?)<\\/g>`);
  return re.exec(svg)?.[1];
}

/** 渲染 + 审计（KNOWN_B 已知集或 0 违例） */
async function renderClean(id: string): Promise<Awaited<ReturnType<typeof renderDoc>>> {
  const b = meta(id);
  const t = await renderDoc(b.source, `mb-${id}`);
  const v = auditGeometry(t.doc, t.layout, t.svg);
  assertAuditKnown(id, v);
  return t;
}

/** 语义锁：同源二次渲染字节一致 */
async function assertDoubleRenderStable(id: string, t: Awaited<ReturnType<typeof renderDoc>>): Promise<void> {
  const b = meta(id);
  const again = await renderDoc(b.source, `mb-${id}-2nd`);
  assert.equal(again.svg, t.svg, `B 档 ${id} 双渲染字节一致（语义锁现状）`);
}

// ---------------------------------------------------------------------------
// B1 全 kind 混排（E2）
// ---------------------------------------------------------------------------

test('B1 flowchart 全 kind 混排: 形状真实出现 + 双向边两向均渲染 + 审计=已知 G6 集', async () => {
  const t = await renderClean('B1');
  const { doc, svg } = t;
  const defsEnd = svg.indexOf('</defs>');
  const outside = svg.slice(defsEnd);
  // decision 菱形 / entity 圆柱 / note 折角 真实出现（非回退）
  assert.ok(countOf(outside, /<polygon/g) >= 1, 'B1 decision 菱形 polygon 出现');
  assert.ok(/<g class="lgdl-node" data-lgdl-loc="nodes\[3\]">[\s\S]*?<path[^>]*A /.test(svg), 'B1 entity 圆柱 A 弧出现');
  assert.ok(/<g class="lgdl-node" data-lgdl-loc="nodes\[4\]">[\s\S]*?<path[^>]*Z/.test(svg), 'B1 note 折角 path 出现');
  // state/milestone 回退 process rect（无专属形状）
  const stIdx = doc.nodes.findIndex((n) => n.id === 'n5');
  const msIdx = doc.nodes.findIndex((n) => n.id === 'n6');
  const stB = nodeBlock(svg, stIdx)!;
  const msB = nodeBlock(svg, msIdx)!;
  assert.ok(stB.includes('<rect') && !stB.includes('<polygon') && !stB.includes('<path'), 'B1 state kind 回退 rect');
  assert.ok(msB.includes('<rect') && !msB.includes('<polygon') && !msB.includes('<path'), 'B1 milestone 回退 rect');
  // 双向边 A→B / B→A 均渲染（edges[0] n0→n1 与 edges[1] n1→n0）
  assert.ok(svg.includes('>进入 Enter</text>') && svg.includes('>回退 Back</text>'), 'B1 双向边 label 均渲染');
  assert.equal(countOf(svg, /<g class="lgdl-edge" data-lgdl-loc="edges\[\d+\]">/g), doc.edges.length, 'B1 全部节点边渲染');
});

// ---------------------------------------------------------------------------
// B2 uml-class 折叠（E3）
// ---------------------------------------------------------------------------

test('B2 uml-class 折叠: 全卡片无 polygon/pill/圆柱 path + members 行 data-lgdl-loc', async () => {
  const t = await renderClean('B2');
  const { doc, svg } = t;
  const defsEnd = svg.indexOf('</defs>');
  const outside = svg.slice(defsEnd);
  assert.equal(countOf(outside, /<polygon/g), 0, 'B2 无菱形 polygon');
  assert.equal(countOf(outside, /<path[^>]*A /g), 0, 'B2 无圆柱 A 弧 path');
  assert.equal(countOf(outside, /rx="\d+(\.\d+)?0"/g), 0, 'B2 无药丸 pill rect');
  // 5 节点全为 lgdl-class 卡片（含 process/decision/note/无 kind 折叠）
  assert.equal(countOf(svg, /g class="lgdl-class"/g), doc.nodes.length, 'B2 全部节点渲染为类卡片');
  // entity members 行以 nodes[i].members[j] 定位
  const orderIdx = doc.nodes.findIndex((n) => n.id === 'order');
  assert.ok(svg.includes(`data-lgdl-loc="nodes[${orderIdx}].members[0]"`), 'B2 成员行 members[0] 定位');
  assert.ok(svg.includes(`data-lgdl-loc="nodes[${orderIdx}].members[${doc.nodes[orderIdx].members!.length - 1}]"`), 'B2 末成员行定位');
});

// ---------------------------------------------------------------------------
// B3 mindmap + group 语义锁（Q-013 / U-1）
// ---------------------------------------------------------------------------

test('B3 mindmap + group: 折叠无 polygon + 渲染不炸 + 审计 0 + 双渲染一致（语义锁）', async () => {
  const t = await renderClean('B3');
  const { svg } = t;
  const defsEnd = svg.indexOf('</defs>');
  const outside = svg.slice(defsEnd);
  assert.equal(countOf(outside, /<polygon/g), 0, 'B3 mindmap 折叠：decision 叶为圆角 rect 无 polygon');
  // group 绘制行为（U-1 张力）以快照/双渲染为准，不强断言绘制或忽略
  await assertDoubleRenderStable('B3', t);
});

// ---------------------------------------------------------------------------
// B4a / B4b 语义锁（Q-013 / EC-004）
// ---------------------------------------------------------------------------

test('B4a sequence + group: participant=3（group 不产生参与者头）+ 审计 0 + 双渲染一致', async () => {
  const t = await renderClean('B4a');
  assert.equal(countOf(t.svg, /<g class="lgdl-participant"/g), 3, 'B4a 3 个参与者头（group 非参与者）');
  await assertDoubleRenderStable('B4a', t);
});

test('B4b gantt + group 分区: lgdl-dep=任务依赖数（group→task 不成 dep）+ 审计=已知 G6 + 双渲染一致', async () => {
  const t = await renderClean('B4b');
  // 文档任务级依赖 1 条（t2→t3）；group→task 聚合边不成 dep
  assert.equal(countOf(t.svg, /<g class="lgdl-dep"/g), 1, 'B4b dep 数 = 任务依赖数');
  assert.equal(countOf(t.svg, /<g class="lgdl-gantt-lane"/g), 2, 'B4b 2 分区带');
  await assertDoubleRenderStable('B4b', t);
});

// ---------------------------------------------------------------------------
// B5 聚合边 g→n（Q-005）
// ---------------------------------------------------------------------------

test('B5 聚合边 g→n: 正交 M/L path + label 白底 rect + 审计=已知 G6（g1→out 贴 out 下边 120px）', async () => {
  const t = await renderClean('B5');
  const m = /<g class="lgdl-aggregate-edge"[^>]*><path d="([^"]*)"/.exec(t.svg);
  assert.ok(m, 'B5 aggregate-edge path 存在');
  const d = m![1];
  assert.ok(/^M [\d.]+,[\d.]+( L [\d.]+,[\d.]+)+$/.test(d), `B5 聚合边 d 仅 M/L: ${d}`);
  assert.ok(/<g class="lgdl-aggregate-edge"[^>]*><path[^>]*\/><rect/.test(t.svg), 'B5 聚合 label 白底 rect 存在');
});

// ---------------------------------------------------------------------------
// B6 扇出标签合并（Q-006）
// ---------------------------------------------------------------------------

test('B6 扇出合并: 同 label 渲染 1 次 + 异 label 各 1 次 + 审计 0', async () => {
  const t = await renderClean('B6');
  assert.equal(countOf(t.svg, />转发<\/text>/g), 1, 'B6 同 label "转发" 只渲染 1 次（owner 合并）');
  assert.equal(countOf(t.svg, />审计<\/text>/g), 1, 'B6 异 label "审计" 渲染 1 次');
});

// ---------------------------------------------------------------------------
// B7 gantt 负日期 + 依赖三型（Q-008 / D4 / U-2）
// ---------------------------------------------------------------------------

test('B7 gantt: 负日期条不从轴外起 + 三型依赖全正交 + 审计=已知 G6 集', async () => {
  const t = await renderClean('B7');
  const { svg } = t;
  // t0（start=-3，归一后 day0）条 x=260 = 轴起点（不出轴外/不为负）
  const barX = svg.match(/<g class="lgdl-gantt-bar"[^>]*><rect x="([\d.-]+)"/);
  assert.ok(barX && Number(barX[1]) >= 260, `B7 负日期条不从轴外起（t0 bar x=${barX?.[1]} ≥ axisX=260）`);
  // 三型依赖（gap≥20 / gap≈0 / 目标在左）全部正交（dep path d 仅 M/L 轴对齐）
  const deps = [...svg.matchAll(/<g class="lgdl-dep"[^>]*><path d="([^"]*)"/g)].map((m) => m[1]);
  assert.equal(deps.length, 3, 'B7 3 条依赖');
  for (const d of deps) {
    const segs = d.replace(/^M /, '').split(' L ');
    for (let i = 1; i < segs.length; i++) {
      const [ax, ay] = segs[i - 1].split(',').map(Number);
      const [bx, by] = segs[i].split(',').map(Number);
      assert.ok(Math.abs(ax - bx) < 0.51 || Math.abs(ay - by) < 0.51, `B7 dep 段 (${ax},${ay})->(${bx},${by}) 正交`);
    }
  }
});

// ---------------------------------------------------------------------------
// B8 er 基数全枚举 + 混 kind（Q-007 / E2）
// ---------------------------------------------------------------------------

test('B8 er: 基数 1/0..1/0..*/1..* 双向渲染 + 22px 外置不压框（G4 0）+ decision/note 真实绘制 + 审计 0', async () => {
  const t = await renderClean('B8'); // audit 0 已含 G4 基数不压框
  const { svg } = t;
  const defsEnd = svg.indexOf('</defs>');
  const outside = svg.slice(defsEnd);
  // 基数全枚举文本各出现（3 边 × from/to）
  assert.equal(countOf(svg, />1<\/text>/g), 2, '基数 1 ×2');
  assert.equal(countOf(svg, />\*<\/text>/g), 1, '基数 * ×1');
  assert.equal(countOf(svg, />0\.\.1<\/text>/g), 1, '基数 0..1 ×1');
  assert.equal(countOf(svg, />0\.\.\*<\/text>/g), 1, '基数 0..* ×1');
  assert.equal(countOf(svg, />1\.\.\*<\/text>/g), 1, '基数 1..* ×1');
  // er mode 下 decision 菱形 / note 折角真实绘制（混 kind，E2）
  assert.ok(countOf(outside, /<polygon/g) >= 1, 'B8 er decision 菱形 polygon');
  const noteIdx = t.doc.nodes.findIndex((n) => n.id === 'note1');
  assert.ok(/<path[^>]*Z/.test(nodeBlock(svg, noteIdx)!), 'B8 er note 折角 path');
});

// ---------------------------------------------------------------------------
// B9 datastream `_other` 混合态（Q-009 / EC-003）
// ---------------------------------------------------------------------------

test('B9 datastream `_other`: lane rect=2（无底框现状锁）+ `_other` 列画布降级 + 审计=已知 G6 + 双渲染一致', async () => {
  const t = await renderClean('B9'); // 审计 = KNOWN_B 已知 G6（svc 右边缘末端微借道 4px）
  const { doc, layout, svg } = t;
  assert.equal(countOf(svg, /<g class="lgdl-lane"/g), 2, 'B9 真实组泳道 lane rect = 2（`_other` 合成列无底框，开放 #7）');
  // `_other` 列节点（legacy/report）位于所有 lane rect 之外（无 lane 覆盖）
  const legacy = layout.nodes.find((n) => n.id === 'legacy')!;
  const laneXs = [...svg.matchAll(/<g class="lgdl-lane"[^>]*><rect x="([\d.-]+)" width="260"/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
  const lastLaneRight = Math.max(...laneXs) + 260;
  assert.ok(legacy.x >= lastLaneRight, `B9 legacy 节点 (x=${legacy.x}) 位于末泳道右缘 ${lastLaneRight} 之外（合成 _other 列）`);
  void doc;
  await assertDoubleRenderStable('B9', t);
});

// ---------------------------------------------------------------------------
// B10 state 多入口 / 纯环（Q-011）
// ---------------------------------------------------------------------------

test('B10a state 多入口: 无 lgdl-initial + 审计 0', async () => {
  const t = await renderClean('B10a');
  assert.equal(countOf(t.svg, /<g class="lgdl-initial"/g), 0, 'B10a 多入口（2 个 in-degree 0）不画 initial');
});

test('B10b state 纯环: 无 lgdl-initial + 审计 0', async () => {
  const t = await renderClean('B10b');
  assert.equal(countOf(t.svg, /<g class="lgdl-initial"/g), 0, 'B10b 纯环（全体 in-degree≥1）不画 initial');
  // 对照：A 档 state 单入口有 initial
  const st = EXAMPLES_SOURCES.find((e) => e.id === 'state')!;
  const stT = await renderDoc(st.source, 'mb-state-control');
  assert.ok(countOf(stT.svg, /<g class="lgdl-initial"/g) >= 1, 'A 档 state（单入口）对照组有 initial');
});

// ---------------------------------------------------------------------------
// B11 大图 grid（P2，默认 skip）
// ---------------------------------------------------------------------------

test('B11 flowchart 130 节点 grid: 审计 0 违例（P2，LGDL_MATRIX_B11=1 启用）', { skip: !process.env.LGDL_MATRIX_B11 }, async () => {
  const t = await renderClean('B11');
  assert.equal(t.doc.nodes.filter((n) => n.kind !== 'group').length, 130, 'B11 130 节点（>120 grid 分支）');
});
