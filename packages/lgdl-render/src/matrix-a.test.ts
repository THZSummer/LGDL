/**
 * matrix-a.test.ts — A 档 11 事实源文档全链路审计（FR-001/FR-002，E1 type 穷举）。
 *
 * 每条 = EXAMPLES_SOURCES[i].source → renderDoc（parse→layout→render 统一基座）
 * → auditGeometry → 断言违例清单。全部真实 DSL 文本全链路，**禁手造 fixture**
 * （代码内无 LayoutResult fixture 字面量；基座链路可用性由首条 FR-001 自举用例证明）。
 * 快照字节比对归 snapshot.test.ts 承担（FR-007 职责分离，避免同源双处渲染断言）。
 *
 * EC-001 已知缺口（2026-09-02 build 实证，记录不上报放宽审计；引擎修复后这些
 * 文档应回到 0 违例——届时相应 KNOWN_A 期望列表会红，提示收编回 clean 组）：
 *   - er        [G4 edges[0]]  边 user→order 路由锚点自源框顶指向体内 → 基数 "1"
 *                              22px 外置锚点落入源实体框内（路由穿越自身节点缺陷的伴生可见项）
 *   - uml-class [G4 edges[1]]  同上：基数 "1" 落入目标实体框内
 *   - state     [G5 edges[5]]  边 label "用户取消" 居中于画布右缘 → 估宽越界 ~4px
 *   - gantt     [G5 nodes[4]]  里程碑窄条（w<64）时间文本置于条外右侧 → 估宽越画布右缘 ~5px
 *
 * G6 沿框边借道新增盲区（2026-09-03 build 实证，engine 贴边走线属另 Feature 修复，
 * NG-004 不修引擎 → 同 EC-001 流程记录，不上报放宽审计）：
 *   - architecture / microservices / login-flow / ecommerce-flow / mindmap /
 *     uml-class / gantt：连边（含聚合边）存在与某框边线共线的段——大段真实「平行
 *     滑入/滑出」借道（architecture edges[10] user→core 贴 core 顶边 83px、沿 user
 *     底边滑出 40px；uml-class edges[1] 贴 infra 底边 98px 等）与末端锚点微借道
 *     （1~16px，端点自身框：无端点豁免规则如实上报）。KNOWN_A 按 doc 如实记录。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditGeometry, type Violation } from './test-support/geometry-audit.js';
import { renderDoc } from './test-support/render-harness.js';
import { EXAMPLES_SOURCES } from './test-support/examples-sources.js';

/** EC-001 已知缺口期望：按 (type, docRef) + element 文本片段匹配（详见文件头） */
interface KnownViolation {
  type: Violation['type'];
  docRef: string;
  textIncludes: string;
}

const KNOWN_A: Record<string, KnownViolation[]> = {
  er: [{ type: 'G4', docRef: 'edges[0]', textIncludes: '>1</text>' }],
  'uml-class': [
    { type: 'G4', docRef: 'edges[1]', textIncludes: '>1</text>' },
    { type: 'G6', docRef: 'edges[1]', textIncludes: '沿 infra 框下边借道' },
    { type: 'G6', docRef: 'edges[1]', textIncludes: '沿 payment 框下边借道' },
  ],
  state: [{ type: 'G5', docRef: 'edges[5]', textIncludes: '用户取消' }],
  gantt: [
    { type: 'G5', docRef: 'nodes[4]', textIncludes: '18d +1d' },
    { type: 'G6', docRef: 'edges[0]', textIncludes: '沿 design 框左边借道' },
    { type: 'G6', docRef: 'edges[1]', textIncludes: '沿 develop 框左边借道' },
    { type: 'G6', docRef: 'edges[2]', textIncludes: '沿 test 框左边借道' },
    { type: 'G6', docRef: 'edges[3]', textIncludes: '沿 launch 框左边借道' },
  ],
  architecture: [
    { type: 'G6', docRef: 'edges[10]', textIncludes: '沿 user 框下边借道' },
    { type: 'G6', docRef: 'edges[10]', textIncludes: '沿 core 框上边借道' },
    { type: 'G6', docRef: 'edges[0]', textIncludes: '沿 cdn 框上边借道' },
    { type: 'G6', docRef: 'edges[6]', textIncludes: '沿 worker 框上边借道' },
  ],
  microservices: [
    { type: 'G6', docRef: 'edges[11]', textIncludes: '沿 redis 框上边借道' },
    { type: 'G6', docRef: 'edges[17]', textIncludes: '沿 es 框上边借道' },
    { type: 'G6', docRef: 'edges[0]', textIncludes: '沿 gateway 框上边借道' },
    { type: 'G6', docRef: 'edges[18]', textIncludes: '沿 oss 框下边借道' },
  ],
  'login-flow': [{ type: 'G6', docRef: 'edges[3]', textIncludes: '沿 fail 框上边借道' }],
  'ecommerce-flow': [{ type: 'G6', docRef: 'edges[14]', textIncludes: '沿 refund 框上边借道' }],
  mindmap: [
    { type: 'G6', docRef: 'edges[3]', textIncludes: '沿 llm 框下边借道' },
    { type: 'G6', docRef: 'edges[8]', textIncludes: '沿 edge 框下边借道' },
  ],
};

function assertAudit(docId: string, violations: Violation[]): void {
  const known = KNOWN_A[docId] ?? [];
  if (known.length === 0) {
    assert.deepEqual(violations, [], `A 档 ${docId} 应 0 违例`);
    return;
  }
  // EC-001 记录：必须恰为已知集（不哑火不漏报），element/detail 文本片段兜底防漂移；
  // 同一 docRef 可有同型多条（G6 多段命中）→ 已知条目与违例一一配对（不重复消费）
  assert.equal(violations.length, known.length, `A 档 ${docId} 违例数应=${known.length}，实际=${JSON.stringify(violations)}`);
  const used = new Set<number>();
  for (const exp of known) {
    const idx = violations.findIndex((v, i) => {
      if (used.has(i)) return false;
      return v.type === exp.type && v.docRef === exp.docRef && `${v.element} | ${v.detail}`.includes(exp.textIncludes);
    });
    assert.ok(idx >= 0, `A 档 ${docId} 应含已知违例 ${exp.type}@${exp.docRef} ~ "${exp.textIncludes}": ${JSON.stringify(violations)}`);
    used.add(idx);
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
  test(`A 档 ${ex.id}: 全链路审计 ${(KNOWN_A[ex.id] ?? []).length === 0 ? '0 违例' : '已知违例集（EC-001）'}`, async () => {
    const { doc, layout, svg } = await renderDoc(ex.source, ex.id);
    const violations = auditGeometry(doc, layout, svg);
    assertAudit(ex.id, violations);
  });
}
