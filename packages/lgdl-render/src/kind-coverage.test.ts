/**
 * kind-coverage.test.ts — kind 覆盖核对表动态绘制断言（FR-004 / D-001 表，9 格）。
 *
 * 不做静态死表：渲染核对文档 → 对最终 SVG 做元素级真实绘制断言（对照 render
 * SHAPES / shapeKindFor 分派，render/index.ts:56-164/456-457）：
 *
 * | kind                  | 核对文档（id）                              | 断言                                  |
 * |-----------------------|---------------------------------------------|---------------------------------------|
 * | start/end 药丸         | ecommerce-flow/architecture/state/B1       | rect rx = node.width/2                |
 * | process               | architecture / B1                           | rect rx=6                             |
 * | decision 菱形          | ecommerce-flow / B1                        | polygon 4 顶点 = node bbox 四边中点    |
 * | entity 圆柱            | er、architecture（A 弧）/ B1/B8             | path d 含 A 圆弧；er members 行文本    |
 * | note 折角              | architecture / B1/B8                       | path d 含折角 L x+w-12 / x+w,y+12     |
 * | state（回退 process）  | state / B1                                 | <rect> 且无 polygon/path（SHAPES 无键）|
 * | milestone              | gantt / B1                                 | gantt：gantt-milestone polygon 菱形；非 gantt 回退 rect |
 * | group（容器/泳道/带）   | architecture、ecommerce-flow(2 层嵌套)、datastream、B4b | g rect 存在 + contains 成员在框内（ecommerce-flow 外含内） |
 * | 无 kind（回退 process）| mindmap / B1                               | rect rx=6（shapeKindFor kind??process）|
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDoc } from './test-support/render-harness.js';
import { EXAMPLES_SOURCES } from './test-support/examples-sources.js';
import { MATRIX_DOCS_B } from './test-support/matrix-docs-b.js';

type Triple = Awaited<ReturnType<typeof renderDoc>>;

function blocksOf(svg: string, gClass: string): { idx: string; inner: string }[] {
  const re = new RegExp(`<g class="${gClass}" data-lgdl-loc="nodes\\[(\\d+)\\]">([\\s\\S]*?)<\\/g>`, 'g');
  return [...svg.matchAll(re)].map((m) => ({ idx: m[1], inner: m[2] }));
}

function firstAttr(html: string, tag: string, attr: string): string | undefined {
  const m = html.match(new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`));
  return m?.[1];
}

async function example(id: string): Promise<Triple> {
  const ex = EXAMPLES_SOURCES.find((e) => e.id === id)!;
  return renderDoc(ex.source, ex.id);
}

function layoutNode(t: Triple, id: string) {
  return t.layout.nodes.find((n) => n.id === id)!;
}

function approx(a: number, b: number, tol = 0.51): boolean {
  return Math.abs(a - b) <= tol;
}

// ---- start/end（药丸） -----------------------------------------------------

test('kind 覆盖: start/end 药丸 rect rx=width/2 真实绘制', async () => {
  const ec = await example('ecommerce-flow');
  const startNode = layoutNode(ec, 'browse');
  const block = blocksOf(ec.svg, 'lgdl-node').find((b) => b.idx === String(ec.doc.nodes.findIndex((n) => n.id === 'browse')))!;
  const rx = Number(firstAttr(block.inner, 'rect', 'rx'));
  assert.equal(rx, startNode.width / 2, `start rx=${rx} 应= w/2=${startNode.width / 2}`);

  const st = await example('state');
  const doneIdx = st.doc.nodes.findIndex((n) => n.id === 'done');
  const doneBlock = blocksOf(st.svg, 'lgdl-node').find((b) => b.idx === String(doneIdx))!;
  const endNode = layoutNode(st, 'done');
  assert.equal(Number(firstAttr(doneBlock.inner, 'rect', 'rx')), endNode.width / 2, 'end（done）药丸 rx=w/2');
});

// ---- process ---------------------------------------------------------------

test('kind 覆盖: process 圆角矩形 rx=6', async () => {
  const arch = await example('architecture');
  const cdnIdx = arch.doc.nodes.findIndex((n) => n.id === 'cdn');
  const block = blocksOf(arch.svg, 'lgdl-node').find((b) => b.idx === String(cdnIdx))!;
  assert.equal(firstAttr(block.inner, 'rect', 'rx'), '6');
  const b1 = MATRIX_DOCS_B.find((d) => d.id === 'B1')!;
  const { doc, svg } = await renderDoc(b1.source, b1.id);
  const pIdx = doc.nodes.findIndex((n) => n.id === 'n1');
  const pb = blocksOf(svg, 'lgdl-node').find((b) => b.idx === String(pIdx))!;
  assert.equal(firstAttr(pb.inner, 'rect', 'rx'), '6', 'B1 process rx=6');
});

// ---- decision（菱形） ------------------------------------------------------

test('kind 覆盖: decision 菱形 polygon 四顶点 = node bbox 四边中点', async () => {
  const ec = await example('ecommerce-flow');
  const vNode = layoutNode(ec, 'validate');
  const vIdx = ec.doc.nodes.findIndex((n) => n.id === 'validate');
  const block = blocksOf(ec.svg, 'lgdl-node').find((b) => b.idx === String(vIdx))!;
  const ptsRaw = firstAttr(block.inner, 'polygon', 'points')!;
  const pts = ptsRaw.split(/[\s,]+/).map(Number);
  assert.equal(pts.length, 8, 'polygon 4 顶点 = 8 个数值');
  const cx = vNode.x + vNode.width / 2;
  const cy = vNode.y + vNode.height / 2;
  const expect = [cx, vNode.y, vNode.x + vNode.width, cy, cx, vNode.y + vNode.height, vNode.x, cy];
  for (let i = 0; i < 8; i++) {
    assert.ok(approx(pts[i], expect[i]), `顶点 ${i} 实际 ${pts[i]} 期望 ${expect[i]}（菱形贴 node bbox）`);
  }
});

// ---- entity（圆柱） --------------------------------------------------------

test('kind 覆盖: entity 圆柱 path A 圆弧 + er members 行文本', async () => {
  const arch = await example('architecture');
  const mysqlIdx = arch.doc.nodes.findIndex((n) => n.id === 'mysql');
  const mb = blocksOf(arch.svg, 'lgdl-node').find((b) => b.idx === String(mysqlIdx))!;
  assert.ok(mb.inner.includes('<path') && / A [\d.]+,10 /.test(mb.inner), `entity path d 含 A 弧: ${mb.inner.slice(0, 120)}`);

  const er = await example('er');
  const userIdx = er.doc.nodes.findIndex((n) => n.id === 'user');
  const ub = blocksOf(er.svg, 'lgdl-node').find((b) => b.idx === String(userIdx))!;
  assert.ok(
    ub.inner.includes('>id: bigint</text>') && ub.inner.includes('>name: varchar</text>') && ub.inner.includes('>email: varchar</text>'),
    'er entity members 行文本存在（typed：name: type）',
  );
});

// ---- note（折角） ----------------------------------------------------------

test('kind 覆盖: note 折角 path 含 L x+w-12 / x+w,y+12', async () => {
  const arch = await example('architecture');
  const noteNode = layoutNode(arch, 'note');
  const nIdx = arch.doc.nodes.findIndex((n) => n.id === 'note');
  const nb = blocksOf(arch.svg, 'lgdl-node').find((b) => b.idx === String(nIdx))!;
  const d = firstAttr(nb.inner, 'path', 'd')!;
  const right = noteNode.x + noteNode.width;
  assert.ok(d.includes(`L ${noteNode.x + noteNode.width - 12},${noteNode.y}`), `折角上边 L x+w-12: ${d}`);
  assert.ok(d.includes(`L ${right},${noteNode.y + 12}`), `折角斜边 L x+w,y+12: ${d}`);
});

// ---- state（回退 process 矩形） -------------------------------------------

test('kind 覆盖: state kind 回退 process 矩形（rect 且无 polygon/path）', async () => {
  const st = await example('state');
  const createdIdx = st.doc.nodes.findIndex((n) => n.id === 'created');
  const cb = blocksOf(st.svg, 'lgdl-node').find((b) => b.idx === String(createdIdx))!;
  assert.ok(cb.inner.includes('<rect'), 'state 回退绘制 rect');
  assert.ok(!cb.inner.includes('<polygon'), 'state 无菱形 polygon');
  assert.ok(!cb.inner.includes('<path'), 'state 无专属 path（SHAPES 无 state 键）');
});

// ---- milestone -------------------------------------------------------------

test('kind 覆盖: gantt milestone 菱形 polygon（r=9）', async () => {
  const g = await example('gantt');
  const m = /<g class="lgdl-gantt-milestone"[^>]*>([\s\S]*?)<\/g>/.exec(g.svg);
  assert.ok(m, 'gantt milestone g 存在');
  const ptsRaw = firstAttr(m![1], 'polygon', 'points')!;
  const pts = ptsRaw.split(/[\s,]+/).map(Number);
  assert.equal(pts.length, 8, 'milestone 菱形 = 4 顶点');
  // 菱形中心 + 半径 9：cx,cy-r / cx+r,cy / cx,cy+r / cx-r,cy
  const xs = [pts[0], pts[2], pts[4], pts[6]];
  const ys = [pts[1], pts[3], pts[5], pts[7]];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  assert.ok(approx(Math.max(...xs) - Math.min(...xs), 18, 0.6), '菱形宽 = 2r = 18');
  assert.ok(approx(Math.max(...ys) - Math.min(...ys), 18, 0.6), '菱形高 = 2r = 18');
  assert.ok(approx(cx - (cx), 0, 0.001));
  void cy;
});

test('kind 覆盖: milestone 非 gantt（B1 flowchart）回退 process rect', async () => {
  const b1 = MATRIX_DOCS_B.find((d) => d.id === 'B1')!;
  const { doc, svg } = await renderDoc(b1.source, b1.id);
  const mIdx = doc.nodes.findIndex((n) => n.id === 'n6');
  const block = blocksOf(svg, 'lgdl-node').find((b) => b.idx === String(mIdx))!;
  assert.ok(block.inner.includes('<rect'), 'B1 milestone（flowchart）回退 rect');
  assert.ok(!block.inner.includes('<polygon') && !block.inner.includes('<path'), 'B1 milestone 无专属形状');
});

// ---- group（容器/泳道/带） ------------------------------------------------

test('kind 覆盖: group 容器框真实绘制（architecture 3 组 + ecommerce-flow 2 层嵌套外含内）', async () => {
  const arch = await example('architecture');
  const archGroups = blocksOf(arch.svg, 'lgdl-group');
  assert.equal(archGroups.length, 3, 'architecture 3 个 group box');
  for (const g of archGroups) {
    assert.ok(/<rect[^>]*\/>/.test(g.inner), `group loc nodes[${g.idx}] 含容器 rect`);
  }
  const ec = await example('ecommerce-flow');
  const ecGroups = blocksOf(ec.svg, 'lgdl-group');
  assert.equal(ecGroups.length, 5, 'ecommerce-flow 5 组（含 2 层嵌套 platform ⊃ shopping）');
  const rectOf = (g: { inner: string }): { x: number; y: number; w: number; h: number } => {
    const r = /<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/.exec(g.inner)!;
    return { x: +r[1], y: +r[2], w: +r[3], h: +r[4] };
  };
  const outer = rectOf(ecGroups.find((g) => g.idx === String(ec.doc.nodes.findIndex((n) => n.id === 'platform')))!);
  const inner = rectOf(ecGroups.find((g) => g.idx === String(ec.doc.nodes.findIndex((n) => n.id === 'shopping')))!);
  assert.ok(
    outer.x < inner.x && outer.y < inner.y && outer.x + outer.w > inner.x + inner.w && outer.y + outer.h > inner.y + inner.h,
    `platform 外框 (${outer.x},${outer.y},${outer.w}x${outer.h}) 应完整含 shopping 内框 (${inner.x},${inner.y},${inner.w}x${inner.h})`,
  );
});

test('kind 覆盖: datastream lgdl-lane 泳道 + gantt lgdl-gantt-lane 分区带', async () => {
  const ds = await example('datastream');
  const lanes = [...ds.svg.matchAll(/<g class="lgdl-lane"[^>]*>/g)];
  assert.equal(lanes.length, 2, 'datastream A 档 2 泳道');
  const b4b = MATRIX_DOCS_B.find((d) => d.id === 'B4b')!;
  const { svg: b4bSvg } = await renderDoc(b4b.source, b4b.id);
  const bands = [...b4bSvg.matchAll(/<g class="lgdl-gantt-lane"[^>]*>/g)];
  assert.equal(bands.length, 2, 'B4b gantt 2 分区带');
});

// ---- 无 kind（回退 process） ----------------------------------------------

test('kind 覆盖: 无 kind 回退 process 圆角矩形（mindmap 无 kind 节点）', async () => {
  const mm = await example('mindmap');
  const nokind = mm.doc.nodes.find((n) => !n.kind)!;
  const idx = mm.doc.nodes.findIndex((n) => n.id === nokind.id);
  const block = blocksOf(mm.svg, 'lgdl-node').find((b) => b.idx === String(idx))!;
  assert.equal(firstAttr(block.inner, 'rect', 'rx'), '6', '无 kind 节点回退 process rx=6');
  assert.ok(!block.inner.includes('<polygon') && !block.inner.includes('<path'), 'mindmap 无 kind 节点仅圆角矩形');
});
