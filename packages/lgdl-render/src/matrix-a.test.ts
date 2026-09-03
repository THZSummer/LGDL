/**
 * matrix-a.test.ts — A 档 11 事实源文档全链路审计（FR-001/FR-002，E1 type 穷举）。
 *
 * 每条 = EXAMPLES_SOURCES[i].source → renderDoc（parse→layout→render 统一基座）
 * → auditGeometry → 断言违例清单。全部真实 DSL 文本全链路，**禁手造 fixture**
 * （代码内无 LayoutResult fixture 字面量；基座链路可用性由首条 FR-001 自举用例证明）。
 * 快照字节比对归 snapshot.test.ts 承担（FR-007 职责分离，避免同源双处渲染断言）。
 *
 * 引擎缺陷修复收编（2026-09-02 specs-tree-engine-defect-fixes，M1~M4 落地）：
 * 原 EC-001 已知缺口（er/uml-class 基数落实体框内 G4、state label 越界 G5、gantt
 * 里程碑文本越界 G5）与 G6 沿框边借道已知集（router 贴边硬拒 + detick、renderGantt
 * 三段式垂直进面、基数面法线外置、label 画布约束、gantt 窄条回退、layout LR 修复）
 * 全部归零 → 断言收编为 **0 违例（clean）**。KNOWN_A 已全清，violations 必须为空。
 *
 * 专项断言（D-001-4 / R-007，FR-001-③）：G3 豁免端点 → 门禁 0 违例不足以证明
 * 「穿体消除」。er edges[0] / uml-class edges[1] 即缺陷实证本体（基数落实体框根因），
 * 在 A 档内对这两条边做测试侧自查：折线任一段不与 from/to 端点实体框内部相交
 * （锚点边界除外）。非新增 G 规则，仅为穿体视觉缺陷的回归守护。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditGeometry, type Violation } from './test-support/geometry-audit.js';
import { renderDoc } from './test-support/render-harness.js';
import { EXAMPLES_SOURCES } from './test-support/examples-sources.js';

/** A 档 audit 收编断言：全部文档 0 违例（KNOWN 已清空，EC-001/G6 已知缺口已修复） */
function assertAudit(docId: string, violations: Violation[]): void {
  assert.deepEqual(violations, [], `A 档 ${docId} 应 0 违例（引擎修复后 clean）: ${JSON.stringify(violations)}`);
}

/** 轻量 path d 解析（仅 M/L，本项目自产路径格式，M/L 命令稳定）→ 顶点序列 */
function pathPtsFromD(d: string): { x: number; y: number }[] {
  const tokens = d.split(/[\s,]+/).filter((t) => t.length > 0);
  const pts: { x: number; y: number }[] = [];
  let expectY = false;
  let cur: { x: number; y: number } | null = null;
  for (const t of tokens) {
    if (/^[A-Za-z]$/u.exec(t)) {
      if (t === 'M' || t === 'L') {
        expectY = false;
        continue;
      }
      break; // 非 M/L 命令 → 停止（本断言只服务纯折线边）
    }
    const num = Number(t);
    if (!Number.isFinite(num)) break;
    if (!expectY) {
      cur = { x: num, y: 0 };
      pts.push(cur);
      expectY = true;
    } else if (cur) {
      cur.y = num;
      expectY = false;
      cur = null;
    }
  }
  return pts.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/** 轴对齐段 a→b 是否与框内部相交（>0.5px 余量，锚点贴边不算；与 router segInside 同构） */
function segCrossesBoxInterior(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
): boolean {
  if (Math.abs(a.x - b.x) < 0.5) {
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    if (!(a.x > box.x + 0.5 && a.x < box.x + box.width - 0.5)) return false;
    return Math.min(hi, box.y + box.height) - Math.max(lo, box.y) > 0.5;
  }
  if (Math.abs(a.y - b.y) < 0.5) {
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    if (!(a.y > box.y + 0.5 && a.y < box.y + box.height - 0.5)) return false;
    return Math.min(hi, box.x + box.width) - Math.max(lo, box.x) > 0.5;
  }
  return false;
}

/**
 * FR-001-③ 专项断言：edges[docEdgeIdx] 折线任一段不与 from/to 实体框内部相交
 * （锚点边界除外——G3 豁免端点故门禁 0 违例不足证，测试侧自查穿体消除）。
 */
async function assertNoOwnBoxPierce(
  docId: string,
  docEdgeIdx: number,
): Promise<void> {
  const ex = EXAMPLES_SOURCES.find((e) => e.id === docId)!;
  const { doc, layout, svg } = await renderDoc(ex.source, docId);
  const edgeDoc = doc.edges[docEdgeIdx];
  const fromNode = layout.nodes.find((n) => n.id === edgeDoc.from);
  const toNode = layout.nodes.find((n) => n.id === edgeDoc.to);
  assert.ok(fromNode && toNode, `${docId} edges[${docEdgeIdx}] from/to 布局节点存在`);
  const re = new RegExp(`<g class="lgdl-edge" data-lgdl-loc="edges\\[${docEdgeIdx}\\]"><path d="([^"]*)"`);
  const m = re.exec(svg);
  assert.ok(m, `${docId} edges[${docEdgeIdx}] path 存在`);
  const pts = pathPtsFromD(m![1]);
  assert.ok(pts.length >= 2, `${docId} edges[${docEdgeIdx}] 折线顶点 ≥2`);
  for (let i = 0; i < pts.length - 1; i++) {
    for (const [tag, box] of [
      ['from', fromNode],
      ['to', toNode],
    ] as const) {
      assert.ok(
        !segCrossesBoxInterior(pts[i], pts[i + 1], box),
        `${docId} edges[${docEdgeIdx}] 段 (${pts[i].x},${pts[i].y})->(${pts[i + 1].x},${pts[i + 1].y}) 穿 ${tag} 实体框内部（穿体应已消除，D-001-A）`,
      );
    }
  }
}

test('FR-001 基座自举: 2 节点 1 边最小文档走通 parse→layout→render→audit 0 违例', async () => {
  const source = `title: 自举\ntype: flowchart\n\nnodes:\n  - id: a\n    label: 甲\n  - id: b\n    label: 乙\n\nedges:\n  - from: a\n    to: b\n    label: 去\n`;
  const { doc, layout, svg } = await renderDoc(source, 'bootstrap');
  assert.equal(doc.nodes.length, 2);
  assert.equal(doc.edges.length, 1);
  assert.ok(svg.includes('<svg'));
  const violations = auditGeometry(doc, layout, svg);
  assert.deepEqual(violations, [], `基座自举应 0 违例: ${JSON.stringify(violations)}`);
});

for (const ex of EXAMPLES_SOURCES) {
  test(`A 档 ${ex.id}: 全链路审计 0 违例（引擎修复收编 clean）`, async () => {
    const { doc, layout, svg } = await renderDoc(ex.source, ex.id);
    const violations = auditGeometry(doc, layout, svg);
    assertAudit(ex.id, violations);
    // FR-001-③ 专项断言（D-001-4 / R-007，同用例内加断言不新增用例）：
    // er edges[0] / uml-class edges[1] 即基数落实体框缺陷实证本体——G3 豁免端点，
    // 门禁 0 违例不足以证明穿体消除，此处对折线做 from/to 框内部判交自查。
    if (ex.id === 'er') await assertNoOwnBoxPierce('er', 0);
    if (ex.id === 'uml-class') await assertNoOwnBoxPierce('uml-class', 1);
  });
}
