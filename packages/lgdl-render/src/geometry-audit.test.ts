/**
 * geometry-audit.test.ts — 审计 helper 自测（FR-006 / ADR-004）。
 *
 * 六类判定各配 ≥1 合成违规样例（必报）与 ≥1 合成健康样例（不报），共 ≥12 条：
 *   G1 非有限坐标（LayoutResult + SVG 双源）必报 / 全有限不报
 *   G2 非正交斜段（仅四连边类 path/line）必报 / 15° 量化容差内 + 节点形状不报
 *   G3 边穿第三方节点必报 / 贴边、自身端点豁免、零长段不报
 *   G4 edge label 压节点框必报 / 宿主内标签、22px 外置基数不报
 *   G5 越界必报 / defs 豁免、1px 舍入容忍不报；泳道列越界必报
 *   G6 沿框边借道（水平/垂直段与框边线共线重合 >0.5px）必报 ×2（第三方节点顶边 /
 *       group 容器顶边，呼应 user→core）/ 垂直进锚点、空白区正常折线不报
 * 合成输入直接构造 (doc, layout, svg) 驱动 auditGeometry（ADR-004），不依赖真实渲染。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditGeometry, AUDIT_TOL, type Violation } from './test-support/geometry-audit.js';
import type { LgdlDocument } from '@lgdl/lgdl-core';
import type { LayoutResult } from '@lgdl/lgdl-layout';

function docOf(nodes: LgdlDocument['nodes'], edges: LgdlDocument['edges'] = [], type: LgdlDocument['type'] = 'flowchart'): LgdlDocument {
  return { type, nodes, edges };
}

function layoutOf(nodes: LayoutResult['nodes'], w = 400, h = 400): LayoutResult {
  return { nodes, edges: [], width: w, height: h };
}

function hasType(v: Violation[], t: string): boolean {
  return v.some((x) => x.type === t);
}

function typeCount(v: Violation[], t: string): number {
  return v.filter((x) => x.type === t).length;
}

const svgShell = (inner: string, w = 400, h = 400): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

// ---------------------------------------------------------------------------
// G1 非有限坐标
// ---------------------------------------------------------------------------

test('G1 必报: LayoutResult 节点 x=NaN（双源之一）', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: Number.NaN, y: 10, width: 100, height: 40 },
    { id: 'b', x: 10, y: 200, width: 100, height: 40 },
  ]);
  const svg = svgShell('<rect x="0" y="0" width="400" height="400"/>');
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G1'), `应有 G1: ${JSON.stringify(v)}`);
  const g1 = v.find((x) => x.type === 'G1')!;
  assert.ok(g1.element.length > 0 && g1.element.includes('nodes'), 'G1 element 可定位');
});

test('G1 必报: SVG path d 含非法 token（NaN/Infinity）', () => {
  const doc = docOf([{ id: 'a' }]);
  const layout = layoutOf([{ id: 'a', x: 10, y: 10, width: 100, height: 40 }]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M NaN,10 L 200,200"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G1'), `应有 G1: ${JSON.stringify(v)}`);
});

test('G1 不报: 双源全有限（含合法 A/Z 弧命令的节点形状 path）', () => {
  const doc = docOf([{ id: 'a' }]);
  const layout = layoutOf([{ id: 'a', x: 10, y: 10, width: 140, height: 60 }]);
  // entity 圆柱 path 含 A/Z —— 合法 token，非 G1
  const svg = svgShell('<path d="M 10,20 L 10,60 A 70,10 0 0 0 150,60 L 150,20 A 70,10 0 0 0 10,20 Z"/>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G1'), 0, `不应有 G1: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------------------
// G2 非正交斜段
// ---------------------------------------------------------------------------

test('G2 必报: lgdl-edge path 45° 斜段', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 10, y: 10, width: 100, height: 40 },
    { id: 'b', x: 200, y: 10, width: 100, height: 40 },
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 50,30 L 80,80 L 250,30"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G2'), `应有 G2: ${JSON.stringify(v)}`);
  const g2 = v.find((x) => x.type === 'G2')!;
  assert.ok(g2.element.includes('段'), `G2 定位含段信息: ${g2.element}`);
  assert.ok(g2.detail.includes('斜段'), 'detail 说明斜段');
});

test('G2 必报: lgdl-message line 斜段', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 10, y: 10, width: 100, height: 40 },
    { id: 'b', x: 200, y: 10, width: 100, height: 40 },
  ]);
  const svg = svgShell('<g class="lgdl-message" data-lgdl-loc="edges[0]"><line x1="50" y1="30" x2="120" y2="90"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G2'), `应有 G2: ${JSON.stringify(v)}`);
});

test('G2 必报: 连边 path 含非 M/L 命令（fail-safe 无法判定）', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 10, y: 10, width: 100, height: 40 },
    { id: 'b', x: 200, y: 10, width: 100, height: 40 },
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 50,30 C 100,30 100,90 150,90"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G2'), `应有 G2 fail-safe: ${JSON.stringify(v)}`);
});

test('G2 不报: 15° 锚点量化偏移 ≤0.51px（dx、dy 均 ≤0.51 豁免）', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 10, y: 10, width: 100, height: 40 },
    { id: 'b', x: 200, y: 10, width: 100, height: 40 },
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 50,30 L 50.4,30.4 L 250,30"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G2'), 0, `0.4px 偏移应在容差内: ${JSON.stringify(v)}`);
});

test('G2 不报: 节点形状 path（entity 圆柱 A 弧 / note 折角）非连边，不审斜/曲线', () => {
  const doc = docOf([{ id: 'a' }]);
  const layout = layoutOf([{ id: 'a', x: 10, y: 10, width: 140, height: 60 }]);
  const svg = svgShell(
    '<g class="lgdl-node" data-lgdl-loc="nodes[0]"><path d="M 10,20 L 10,60 A 70,10 0 0 0 150,60 L 150,20 A 70,10 0 0 0 10,20 Z"/></g>' +
      '<g class="lgdl-node" data-lgdl-loc="nodes[0]"><path d="M 10,10 L 138,10 L 150,22 L 150,70 L 10,70 Z"/></g>',
  );
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G2'), 0, `节点形状 path 不构成斜段违例: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------------------
// G3 边穿节点
// ---------------------------------------------------------------------------

test('G3 必报: 边水平段穿第三方节点框', () => {
  const doc = docOf(
    [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    [{ from: 'a', to: 'b' }],
  );
  // c 为第三方节点框 (150,60,120x60)；边 a→b 的水平段 y=90 从 x=40 到 360 穿过 c
  const layout = layoutOf([
    { id: 'a', x: 10, y: 70, width: 40, height: 40 },
    { id: 'b', x: 340, y: 70, width: 40, height: 40 },
    { id: 'c', x: 150, y: 60, width: 120, height: 60 },
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 30,90 L 380,90"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G3'), `应有 G3: ${JSON.stringify(v)}`);
  const g3 = v.find((x) => x.type === 'G3')!;
  assert.ok(g3.element.includes('段'), `G3 element 含段: ${g3.element}`);
  assert.ok(g3.detail.includes('c'), `detail 指向肇事节点 c: ${g3.detail}`);
});

test('G3 不报: 贴边段（半开区间）不判穿', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 10, y: 70, width: 40, height: 40 },
    { id: 'b', x: 340, y: 70, width: 40, height: 40 },
    { id: 'c', x: 150, y: 90, width: 120, height: 60 }, // c 顶边 y=90 与段重合 → 贴边
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 30,90 L 380,90"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G3'), 0, `贴边不判穿: ${JSON.stringify(v)}`);
});

test('G3 不报: 边穿过自身端点节点（豁免）', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 40, y: 40, width: 120, height: 120 },
    { id: 'b', x: 200, y: 40, width: 120, height: 120 },
  ]);
  // 段从 a 内部出发再离开 → 仅穿自身端点，豁免
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 80,100 L 80,180 L 320,180"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G3'), 0, `自身端点豁免: ${JSON.stringify(v)}`);
});

test('G3 不报: 零长段（routeDefault 退化）不判穿', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 10, y: 10, width: 40, height: 40 },
    { id: 'b', x: 340, y: 10, width: 40, height: 40 },
    { id: 'c', x: 150, y: 60, width: 120, height: 60 },
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 100,100 L 100,100"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G3'), 0, `零长段不判穿: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------------------
// G4 标签压框
// ---------------------------------------------------------------------------

test('G4 必报: edge label 压第三方节点框', () => {
  const doc = docOf(
    [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    [{ from: 'a', to: 'b', label: '压框标签' }],
  );
  const layout = layoutOf([
    { id: 'a', x: 10, y: 120, width: 80, height: 40 },
    { id: 'b', x: 300, y: 120, width: 80, height: 40 },
    { id: 'c', x: 150, y: 100, width: 120, height: 60 },
  ]);
  // label 文本 center (210, 130) —— 落在 c 框 (150,100,120x60) 内
  const svg = svgShell(
    '<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 50,140 L 340,140"/><text x="210" y="130" font-size="12" text-anchor="middle">压框标签</text></g>',
  );
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G4'), `应有 G4: ${JSON.stringify(v)}`);
  const g4 = v.find((x) => x.type === 'G4')!;
  assert.ok(g4.element.includes('压框标签'), `element 可定位: ${g4.element}`);
  assert.ok(g4.detail.includes('c'), `detail 指向被压节点: ${g4.detail}`);
});

test('G4 不报: 节点标签位于自身节点框内（宿主豁免）', () => {
  const doc = docOf([{ id: 'a', label: '用户服务' }]);
  const layout = layoutOf([{ id: 'a', x: 40, y: 40, width: 200, height: 100 }]);
  const svg = svgShell('<g class="lgdl-node" data-lgdl-loc="nodes[0]"><rect x="40" y="40" width="200" height="100"/><text x="140" y="90" font-size="13" text-anchor="middle">用户服务</text></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G4'), 0, `宿主内标签不报: ${JSON.stringify(v)}`);
});

test('G4 不报: 基数文本 22px 外置不误报压框', () => {
  const doc = docOf(
    [{ id: 'user' }, { id: 'order' }],
    [{ from: 'user', to: 'order', cardinalityFrom: '1', cardinalityTo: '*' }],
  );
  const layout = layoutOf([
    { id: 'user', x: 40, y: 40, width: 140, height: 60 },
    { id: 'order', x: 320, y: 40, width: 140, height: 60 },
  ]);
  // user 右边框 x=180；src 基数 '1' center x=180+22=202 → 22px 外置，不压 user
  // order 左边框 x=320；dst 基数 '*' center x=320-22=298 → 22px 外置，不压 order
  const svg = svgShell(
    '<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 180,70 L 320,70"/>' +
      `<text x="202" y="66" font-size="12" text-anchor="middle">1</text>` +
      `<text x="298" y="66" font-size="12" text-anchor="middle">*</text></g>`,
  );
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G4'), 0, `22px 外置基数不误报: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------------------
// G5 越界（画布 / 泳道）
// ---------------------------------------------------------------------------

test('G5 必报: rect 越出 viewBox 右缘', () => {
  const doc = docOf([{ id: 'a' }]);
  const layout = layoutOf([{ id: 'a', x: 10, y: 10, width: 100, height: 40 }], 300, 300);
  const svg = svgShell('<rect x="200" y="0" width="200" height="40"/>', 300, 300);
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G5'), `应有 G5: ${JSON.stringify(v)}`);
});

test('G5 必报: datastream 节点越泳道列', () => {
  const doc = docOf(
    [
      { id: 'a', label: 'A', kind: 'process' },
      { id: 'g1', label: '泳道一', kind: 'group', contains: ['a'] },
    ],
    [],
    'datastream',
  );
  const layout = layoutOf([{ id: 'a', x: 200, y: 40, width: 200, height: 56 }], 600, 300);
  // lane rect x=40 w=260 → 列 [39,301]；a 的 x=200 w=200 → 右缘 400 > 301 → 越列
  const svg = svgShell('<g class="lgdl-lane" data-lgdl-loc="nodes[1]"><rect x="40" y="40" width="260" height="260"/></g>', 600, 300);
  const v = auditGeometry(doc, layout, svg);
  assert.ok(hasType(v, 'G5'), `应有 G5 泳道越界: ${JSON.stringify(v)}`);
  const g5 = v.find((x) => x.type === 'G5');
  assert.ok(g5 && g5.detail.includes('泳道'), `detail 说明泳道: ${g5?.detail}`);
});

test('G5 不报: defs 子树（marker 模板）不参与画布越界检查', () => {
  const doc = docOf([{ id: 'a' }]);
  const layout = layoutOf([{ id: 'a', x: 10, y: 10, width: 100, height: 40 }]);
  const svg = svgShell(
    '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5"><polygon points="0 0, 400 3.5, 0 7"/></marker></defs>' +
      '<rect x="10" y="10" width="100" height="40"/>',
  );
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G5'), 0, `defs 子树豁免: ${JSON.stringify(v)}`);
});

test('G5 不报: 画布边缘 1px 数字舍入容忍内', () => {
  const doc = docOf([{ id: 'a' }]);
  const layout = layoutOf([{ id: 'a', x: 10, y: 10, width: 100, height: 40 }], 300, 300);
  // 右缘 = W+0.5 ≤ W+1（canvasPadPx=1）
  const svg = svgShell('<rect x="199" y="0" width="101.5" height="40"/>', 300, 300);
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G5'), 0, `1px 容忍内不报: ${JSON.stringify(v)}`);
});

test('G5 不报: 锚点圆（lgdl-anchors 隐藏交互把手）越界不计', () => {
  const doc = docOf([{ id: 'a' }]);
  const layout = layoutOf([{ id: 'a', x: 10, y: 10, width: 100, height: 40 }]);
  const svg = svgShell('<g class="lgdl-anchors"><circle cx="299" cy="299" r="3"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G5'), 0, `锚点豁免: ${JSON.stringify(v)}`);
});

// ---------------------------------------------------------------------------
// G6 沿框边借道（作者指令 2026-09-03：容器也是 node，不允许贴边走；无端点豁免）
// ---------------------------------------------------------------------------

test('G6 必报: 水平段沿第三方节点顶边平行滑入（无端点豁免）', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ from: 'a', to: 'b' }]);
  // c 第三方节点 (100,60,120x60)；段 y=60 与 c 顶边共线，x∈[30,370] 与 c x∈[100,220] 重合 120px
  const layout = layoutOf([
    { id: 'a', x: 10, y: 180, width: 40, height: 40 },
    { id: 'b', x: 340, y: 180, width: 40, height: 40 },
    { id: 'c', x: 100, y: 60, width: 120, height: 60 },
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 30,60 L 370,60"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G6'), 1, `应恰 1 条 G6: ${JSON.stringify(v)}`);
  const g6 = v.find((x) => x.type === 'G6')!;
  assert.ok(g6.element.includes('段 (30,60)->(370,60)'), `element 可定位: ${g6.element}`);
  assert.ok(g6.detail.includes('c') && g6.detail.includes('上边'), `detail 指向 c 顶边: ${g6.detail}`);
  assert.ok(g6.detail.includes('重合 120.0px'), `detail 带重合长度: ${g6.detail}`);
  assert.equal(typeCount(v, 'G3'), 0, `贴边不穿（G3=0）: ${JSON.stringify(v)}`);
});

test('G6 必报: 水平段沿 group 容器顶边借道（user→core 实测几何）', () => {
  const doc = docOf(
    [
      { id: 'user', label: '用户' },
      { id: 'app', label: '应用' },
      { id: 'core', label: '核心服务', kind: 'group', contains: ['app'] },
    ],
    [{ from: 'user', to: 'core' }],
  );
  const layout = layoutOf([
    { id: 'user', x: 176, y: 40, width: 120, height: 48 },
    { id: 'app', x: 300, y: 650, width: 160, height: 56 },
  ]);
  // core 组框 rect (270,600,200x126)；段 y=600 x∈[250,353] 与顶边重合 83px
  const svg = svgShell(
    '<g class="lgdl-group" data-lgdl-loc="nodes[2]"><rect x="270" y="600" width="200" height="126"/></g>' +
      '<g class="lgdl-aggregate-edge" data-lgdl-loc="edges[0]"><path d="M 250,600 L 353,600"/></g>',
  );
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G6'), 1, `应恰 1 条 G6: ${JSON.stringify(v)}`);
  const g6 = v.find((x) => x.type === 'G6')!;
  assert.ok(g6.detail.includes('core') && g6.detail.includes('上边'), `detail 指向 core 顶边: ${g6.detail}`);
  assert.ok(g6.detail.includes('重合 83.0px'), `detail 带 83px 重合: ${g6.detail}`);
});

test('G6 不报: 垂直段垂直到达框顶边锚点（仅一点相交）', () => {
  const doc = docOf([{ id: 'a' }, { id: 'c' }], [{ from: 'a', to: 'c' }]);
  // c (100,100,120x60)；垂直段 x=160 从 y=40 下落到顶边 y=100 锚点 (160,100)，与顶边只交一点
  const layout = layoutOf([
    { id: 'a', x: 170, y: 10, width: 40, height: 30 },
    { id: 'c', x: 100, y: 100, width: 120, height: 60 },
  ]);
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 160,40 L 160,100"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G6'), 0, `垂直进锚点不应报 G6: ${JSON.stringify(v)}`);
  assert.equal(typeCount(v, 'G3'), 0, `垂直进锚点不应穿框: ${JSON.stringify(v)}`);
});

test('G6 不报: 空白区正常折线（各段均不与框边线共线）', () => {
  const doc = docOf([{ id: 'a' }, { id: 'b' }], [{ from: 'a', to: 'b' }]);
  const layout = layoutOf([
    { id: 'a', x: 10, y: 150, width: 40, height: 40 },
    { id: 'b', x: 340, y: 150, width: 40, height: 40 },
  ]);
  // 折线从 a 右边出发、绕中部空白区到达 b 左边：水平/垂直段均不与 a/b 边线共线
  const svg = svgShell('<g class="lgdl-edge" data-lgdl-loc="edges[0]"><path d="M 50,170 L 180,170 L 180,60 L 300,60 L 300,170 L 340,170"/></g>');
  const v = auditGeometry(doc, layout, svg);
  assert.equal(typeCount(v, 'G6'), 0, `空白区折线不应报 G6: ${JSON.stringify(v)}`);
  assert.equal(typeCount(v, 'G2'), 0, `折线全正交: ${JSON.stringify(v)}`);
});

test('AUDIT_TOL 常量与 D-003 表逐字一致', () => {
  assert.equal(AUDIT_TOL.orthoTolPx, 0.51);
  assert.equal(AUDIT_TOL.canvasPadPx, 1);
  assert.equal(AUDIT_TOL.labelPadPx, 2);
  assert.equal(AUDIT_TOL.cardinalityOffsetPx, 22);
  assert.equal(AUDIT_TOL.groupHeaderH, 30);
  assert.equal(AUDIT_TOL.groupPad, 20);
  assert.equal(AUDIT_TOL.edgeRideTolPx, 0.5);
});
