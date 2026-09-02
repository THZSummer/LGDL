/**
 * degraded-paths.test.ts — 退化/兜底路径专项单测（FR-007 / Q-010 / D-005）。
 *
 * 矩阵内唯一允许合成 LayoutResult fixture 的例外（FR-007 明示授权）；真实 DSL
 * 无法稳定构造 "A* 无解 / routeDefault 零长" 输入，故以合成数据直接驱动
 * renderSvg / @lgdl/lgdl-router 导出，断言「输出无 NaN/斜段/越界且不抛」。
 *
 * 开放问题 #5 实证结论（2026-09-02 build）：
 *   1. routeDefault 零长退化：layout.edges 空 points + 无布局节点 → renderSvg 输出
 *      `<path d="M 0,0">`（routeEdge 单点退化），不抛；audit G1/G2/G3/G5 兜底无违例。
 *   2. A* 无解 → orthogonalize 回退：全高墙形障碍使 routeAStar 无路（无解分支 100%
 *      复现——回退输出穿墙即证），routeEdge 回退输出有限/正交/不抛。
 *   3. routeRectilinear fallback：该分支输入无法经真实 DSL 传入 renderSvg（renderSvg
 *      内部先做绕行搜索，候选列/行常可逃逸），故 fallback 分支以 router 直接驱动
 *      固定阻塞布局验证（输出 = 直线 fallback、正交有限），renderSvg 侧以正常聚合
 *      边端到端验证无抛 + G2/G5 干净（#5 保持 open 至 validate）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSvg } from './index.js';
import { routeEdge, routeRectilinear } from '@lgdl/lgdl-router';
import { auditGeometry } from './test-support/geometry-audit.js';
import type { LgdlDocument } from '@lgdl/lgdl-core';
import type { LayoutResult } from '@lgdl/lgdl-layout';

function isOrthogonalPolyline(pts: { x: number; y: number }[]): boolean {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    if (dx > 0.51 && dy > 0.51) return false;
  }
  return true;
}

test('退化场景 1: routeDefault 零长（M 0,0）不抛 + 审计兜底无违例', () => {
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    edges: [{ from: 'a', to: 'b' }],
  };
  // layout 无节点框 + 边 points 为空 → renderer 走 routeDefault 零长退化
  const layout: LayoutResult = {
    nodes: [],
    edges: [{ from: 'a', to: 'b', points: [] }],
    width: 200,
    height: 200,
  };
  const svg = renderSvg(doc, layout); // 不抛
  assert.ok(/<path d="M 0,0"/.test(svg), `应含退化零长路径: ${svg.slice(0, 400)}`);
  const v = auditGeometry(doc, layout, svg);
  const bad = v.filter((x) => x.type === 'G1' || x.type === 'G2' || x.type === 'G3' || x.type === 'G5');
  assert.deepEqual(bad, [], `零长退化 G1/G2/G3/G5 兜底应无违例: ${JSON.stringify(v)}`);
});

test('退化场景 2: A* 无解 → orthogonalize 回退（有限/正交/不抛）', () => {
  const srcNode = { x: 40, y: 40, width: 60, height: 40 };
  const dstNode = { x: 200, y: 40, width: 60, height: 40 };
  // 全高墙 + 上下封边：A* 无绕行空间 → 必然回退 orthogonalize（穿墙输出即证无解分支）
  const obstacles = [
    { x: 120, y: 0, w: 60, h: 280 },
    { x: 0, y: 0, w: 300, h: 14 },
    { x: 0, y: 266, w: 300, h: 14 },
  ];
  const raw = [
    { x: 100, y: 60 },
    { x: 260, y: 60 },
  ];
  const pts = routeEdge({
    points: raw,
    srcNode,
    dstNode,
    srcKind: 'process',
    dstKind: 'process',
    obstacles,
    bounds: { w: 300, h: 280 },
    routedSegments: [],
  });
  assert.ok(pts.length >= 2, '回退输出应含折线');
  for (const p of pts) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `输出有限: ${JSON.stringify(p)}`);
  }
  assert.ok(isOrthogonalPolyline(pts), `输出正交: ${JSON.stringify(pts)}`);
  // 回退分支证据：输出穿越了不可绕行的墙（A* 不可能给穿墙解）
  const crossesWall = pts.some((p, i) => {
    if (i === 0) return false;
    const a = pts[i - 1];
    const b = p;
    if (Math.abs(a.y - b.y) < 0.5) {
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      return 120 < hi && 180 > lo && 0 < a.y && a.y < 280;
    }
    if (Math.abs(a.x - b.x) < 0.5) {
      const lo = Math.min(a.y, b.y);
      const hi = Math.max(a.y, b.y);
      return 120 < a.x && a.x < 180 && 0 < hi && 280 > lo;
    }
    return false;
  });
  assert.ok(crossesWall, `回退输出应穿越全高墙（证明 A* 无解分支命中）: ${JSON.stringify(pts)}`);
  // 开放问题 #5：无法从真实 DSL 触发该分支（文档注释见文件头），保持 open 至 validate
});

test('退化场景 3: routeRectilinear fallback 直线回退（router 直驱）+ renderSvg 端到端不抛', () => {
  const src = { x: 100, y: 100 };
  const dst = { x: 300, y: 100 };
  // 固定阻塞布局（2026-09-02 随机搜索实证）：所有候选通道/行均被截 → 回退 [src,dst]
  const boxes = [
    { x: 260, y: 205, w: 62, h: 42 },
    { x: 307, y: 123, w: 66, h: 76 },
    { x: 201, y: 106, w: 30, h: 67 },
    { x: 290, y: 87, w: 45, h: 74 },
    { x: 331, y: 79, w: 38, h: 49 },
    { x: 89, y: 21, w: 51, h: 66 },
  ];
  const fallback = [src, dst];
  const r = routeRectilinear(src, dst, boxes, fallback);
  assert.deepEqual(r, fallback, '应命中 fallback 直线回退');
  assert.ok(isOrthogonalPolyline(r), 'fallback 直线正交（src/dst 同 y）');
  for (const p of r) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));

  // fallback 输出（水平直线）灌入 audit：无 G1/G2/G5
  const doc: LgdlDocument = {
    type: 'flowchart',
    nodes: [
      { id: 'ma', label: '甲' },
      { id: 'mb', label: '乙' },
      { id: 'g1', label: '组一', kind: 'group', contains: ['ma'] },
      { id: 'g2', label: '组二', kind: 'group', contains: ['mb'] },
    ],
    edges: [{ from: 'g1', to: 'g2', label: '跨组' }],
  };
  const layout: LayoutResult = {
    nodes: [
      { id: 'ma', x: 20, y: 80, width: 60, height: 40 },
      { id: 'mb', x: 360, y: 80, width: 60, height: 40 },
    ],
    edges: [],
    width: 440,
    height: 200,
  };
  const d = r.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="200" viewBox="0 0 440 200">` +
    `<rect x="0" y="0" width="440" height="200" fill="#fff"/>` +
    `<g class="lgdl-aggregate-edge" data-lgdl-loc="edges[0]"><path d="${d}" fill="none" stroke="#7c3aed"/></g>` +
    `</svg>`;
  const v = auditGeometry(doc, layout, svg);
  const bad = v.filter((x) => x.type === 'G1' || x.type === 'G2' || x.type === 'G5');
  assert.deepEqual(bad, [], `fallback 直线无 G1/G2/G5: ${JSON.stringify(v)}`);

  // renderSvg 端到端：正常聚合边（绕行成功路径）不抛 + audit G2/G5 干净
  const svg2 = renderSvg(doc, layout);
  const v2 = auditGeometry(doc, layout, svg2);
  const bad2 = v2.filter((x) => x.type === 'G1' || x.type === 'G2' || x.type === 'G5');
  assert.deepEqual(bad2, [], `renderSvg 聚合边无 G1/G2/G5: ${JSON.stringify(v2)}`);
});
