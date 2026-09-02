/**
 * geometry-audit — LGDL 渲染产物几何审计 helper（FR-005 / ADR-004）。
 *
 * 门禁旁路实现：对 (doc, layout, svg) 三元组独立判定六类几何违例（G1~G6），
 * 以「最终 SVG 元素解析」为判定真值（LayoutResult.edges 仅是中心线初值，
 * 最终折线由 render 侧 routeEdge/routeRectilinear 生成）。
 *
 * ADR-004 独立视角：本文件**不 import 任何 router/render 运行函数**
 * （segmentCrosses/pathCrosses 等仅作语义参照不复用），避免门禁与业务实现
 * 共享同一缺陷；仅 import core/layout 的**类型**（擦除后无运行时依赖）。
 *
 * 判定语义与容差常量对齐 spec D-003 表（常量命名导出，validate 校准走 EC-008，
 * 禁静默放宽）。数据流：
 *   matrix/snapshot/kind 测试 → render-harness（parse→layout→render）
 *   → auditGeometry(doc, layout, svg) → Violation[] → node:test assert。
 *
 * SVG 解析器适用范围：引擎机器生成标记（单行、属性双引号、text 内容经 escapeXml、
 * defs/style 可定位），鲁棒性由 geometry-audit.test.ts 正反例锚定（FR-006）。
 */
import type { LgdlDocument, LgdlNode } from '@lgdl/lgdl-core';
import type { LayoutResult } from '@lgdl/lgdl-layout';

export type ViolationKind = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

export interface Violation {
  type: ViolationKind;
  /** 定位串：class/坐标/d 段（NFR-003 可定位） */
  element: string;
  detail: string;
  /** 'nodes[i]' | 'edges[i]'（优先取 SVG data-lgdl-loc） */
  docRef?: string;
}

/** D-003 容差常量表（命名导出供 EC-008 校准；validate 实测校准需作者批准） */
export const AUDIT_TOL = {
  /** G2 斜段判定阈值：>0.51px 视为非正交（15° 锚点量化偏移豁免带内） */
  orthoTolPx: 0.51,
  /** G5 画布越界容忍（数字舍入/贴边） */
  canvasPadPx: 1,
  /** G4 标签判交四周外扩 */
  labelPadPx: 2,
  /** ER/uml 基数锚点外置距离（不应误报压框） */
  cardinalityOffsetPx: 22,
  /** 组框标题带高度（文档化参照，障碍框取自 SVG 不重算） */
  groupHeaderH: 30,
  /** 组框内边距（文档化参照） */
  groupPad: 20,
  /** G6 沿框边借道：段与框边线共线距离 / 重合长度判定阈值（<0.5px 视为点接触噪声） */
  edgeRideTolPx: 0.5,
} as const;

/** 连边祖先 class（G2/G3 选择器仅这四类） */
const EDGE_G_CLASSES = new Set(['lgdl-edge', 'lgdl-aggregate-edge', 'lgdl-dep', 'lgdl-message']);

/** 宿主豁免：文本所在 g 属节点/卡片/参与者/条/里程碑 → 宿主 = 对应 LayoutResult 节点框 */
const HOST_NODE_G_CLASSES = new Set(['lgdl-node', 'lgdl-class', 'lgdl-participant', 'lgdl-gantt-bar', 'lgdl-gantt-milestone']);
/** 宿主豁免：文本所在 g 属容器 → 宿主 = 同 g 内最大 rect */
const HOST_CONTAINER_G_CLASSES = new Set(['lgdl-group', 'lgdl-lane']);
/** G3/G5 容器框提取的 g class（gantt 带对 G3 计障碍、对 G4 不计——背景带非压框对象） */
const CONTAINER_G_CLASSES = new Set(['lgdl-group', 'lgdl-lane', 'lgdl-gantt-lane']);
/** G4 障碍框容器 class（gantt-lane 背景带除外：行 label/轴 label 按设计落在带内） */
const G4_CONTAINER_CLASSES = new Set(['lgdl-group', 'lgdl-lane']);

const NUM_RE = /^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

// ---------------------------------------------------------------------------
// 轻量 SVG 解析器
// ---------------------------------------------------------------------------

interface SvgAttrs {
  [k: string]: string;
}

export interface SvgElement {
  tag: string;
  attrs: SvgAttrs;
  /** 祖先 <g class> 链（外→内），仅含带 class 的 g */
  gClasses: string[];
  /** 最近祖先 g 的 data-lgdl-loc（宿主解析用） */
  gLoc?: string;
  /** 元素自身 data-lgdl-loc，无则继承祖先 g 的（docRef 定位用） */
  loc?: string;
  inDefs: boolean;
  text: string;
}

function parseAttrs(attrText: string): SvgAttrs {
  const out: SvgAttrs = {};
  for (const m of attrText.matchAll(/([\w:.-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function decodeXml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * 扫描式 SVG 解析。返回全部 rect/circle/line/polygon/path/text 元素
 * （含 defs 内元素——G1 需要全量扫；G4/G5/G3 侧按 inDefs 过滤）。
 * 对引擎机器生成标记确定适用（属性双引号、无内嵌 '>'、text 内容已 XML 转义）。
 */
export function parseSvgElements(svg: string): SvgElement[] {
  const out: SvgElement[] = [];
  interface Frame {
    tag: string;
    cls?: string;
    loc?: string;
    defs: boolean;
  }
  const stack: Frame[] = [];
  let i = 0;
  const n = svg.length;
  const pushElement = (tag: string, attrs: SvgAttrs, text: string): void => {
    const gClasses: string[] = [];
    let gLoc: string | undefined;
    let loc: string | undefined;
    let inDefs = false;
    // stack 顺序：外层在前 → gClasses 外→内；gLoc 取「最内层」带 loc 的 g
    for (let k = stack.length - 1; k >= 0; k--) {
      const f = stack[k];
      if (f.defs) inDefs = true;
      if (f.tag === 'g') {
        if (f.cls) gClasses.unshift(f.cls);
        if (f.loc && gLoc === undefined) gLoc = f.loc;
      }
    }
    if (attrs['data-lgdl-loc'] !== undefined) loc = attrs['data-lgdl-loc'];
    else if (gLoc !== undefined) loc = gLoc;
    out.push({ tag, attrs, gClasses, gLoc, loc, inDefs, text });
  };

  while (i < n) {
    const lt = svg.indexOf('<', i);
    if (lt === -1) break;
    const gt = svg.indexOf('>', lt);
    if (gt === -1) break;
    const raw = svg.slice(lt + 1, gt).trim();
    i = gt + 1;
    if (raw === '' || raw.startsWith('!')) continue;
    if (raw.startsWith('/')) {
      // closing tag
      const name = raw.slice(1).trim().split(/\s+/)[0];
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag === name) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    const nameMatch = /^([\w:.-]+)/.exec(raw);
    if (!nameMatch) continue;
    const tag = nameMatch[1];
    const selfClosing = /\/\s*$/.test(raw);
    const attrs = parseAttrs(raw);
    if (selfClosing) {
      pushElement(tag, attrs, '');
      continue;
    }
    // container or text with raw content
    if (tag === 'text' || tag === 'style') {
      const closeTag = `</${tag}>`;
      const closeIdx = svg.indexOf(closeTag, i);
      if (closeIdx !== -1) {
        if (tag === 'text') {
          pushElement(tag, attrs, decodeXml(svg.slice(i, closeIdx)));
        }
        i = closeIdx + closeTag.length;
        continue;
      }
      // unterminated — treat rest as content
      if (tag === 'text') pushElement(tag, attrs, decodeXml(svg.slice(i)));
      break;
    }
    // generic container (svg/g/defs/marker/…)：压栈后继续逐子扫描，
    // 由后续 `</tag>` 分支弹栈（不可跳过子元素）。
    stack.push({
      tag,
      cls: tag === 'g' ? attrs.class : undefined,
      loc: tag === 'g' ? attrs['data-lgdl-loc'] : undefined,
      defs: tag === 'defs' || (stack.some((f) => f.defs)),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 几何小工具
// ---------------------------------------------------------------------------

export interface AuditBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function toNum(attrs: SvgAttrs, k: string): number | undefined {
  const v = attrs[k];
  if (v === undefined) return undefined;
  const num = Number(v);
  return Number.isFinite(num) ? num : NaN;
}

/** 文本估宽（镜像 renderer labelBoxAt/textWidth：CJK≈1.0fs、Latin≈0.62fs） */
export function estimateTextWidth(txt: string, fontSize: number): number {
  let w = 0;
  for (const ch of txt) w += (ch.codePointAt(0) ?? 0) > 0x2e80 ? fontSize : fontSize * 0.62;
  return w;
}

/** 单行 <text> 的估宽 bbox（text-anchor 定 x 向，行高 fs+4 定 y 向） */
function textBoxOf(e: SvgElement): { x: number; y: number; w: number; h: number } | undefined {
  const x = toNum(e.attrs, 'x');
  const y = toNum(e.attrs, 'y');
  const fsRaw = e.attrs['font-size'];
  if (x === undefined || y === undefined || fsRaw === undefined) return undefined;
  const fs = Number(fsRaw);
  if (!Number.isFinite(fs)) return undefined;
  const w = estimateTextWidth(e.text, fs);
  const h = fs + 4;
  const anchor = e.attrs['text-anchor'] ?? 'middle';
  let bx: number;
  if (anchor === 'start') bx = x;
  else if (anchor === 'end') bx = x - w;
  else bx = x - w / 2;
  return { x: bx, y: y - h / 2, w, h };
}

function overlapArea(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}

/** 把 path d 解析为 (M/L) 顶点序列；非 M/L 命令返回 null（无法判定） */
function pathPointsFromD(d: string): { x: number; y: number }[] | null {
  const tokens = d.split(/[\s,]+/).filter((t) => t.length > 0);
  const pts: { x: number; y: number }[] = [];
  let expect = 'M'; // pending command for next pair
  let mode: 'M' | 'L' = 'M';
  let pendingX: number | undefined;
  for (const t of tokens) {
    if (/^[A-Za-z]$/.test(t)) {
      if (t === 'M' || t === 'L') {
        mode = t;
        expect = 'pair';
        continue;
      }
      // C/Q/A/Z/… —— 非纯 M/L 折线（entity 圆柱弧 / note 折角等形状或非正交连边）
      if (t === 'Z' && pts.length > 0) continue;
      return null;
    }
    const num = Number(t);
    if (!Number.isFinite(num)) return null;
    if (expect === 'pair' && pendingX === undefined) {
      pendingX = num;
    } else if (expect === 'pair') {
      pts.push({ x: pendingX as number, y: num });
      pendingX = undefined;
      mode = 'L';
    } else {
      return null;
    }
  }
  // 单点退化（routeDefault 零长 M x,y 无 L 段）仍返回单点集 → G2 侧无段可判即跳过；
  // 仅「非 M/L 命令 / 非有限 token」返回 null 触发 fail-safe
  return pts.length >= 1 ? pts : null;
}

/**
 * 按命令解析 path d 的绝对坐标点（G5 越界用）：M/L/H/V/A/C/S/Q/T 取落点，
 * Z 关闭不取。A 弧凸出量在实体圆柱等形状上不超端点连线 ± 半径（本审计对
 * 节点形状外接已按 LayoutResult 框兜底），落点外接足够且避免把弧参误当坐标。
 */
function pathExtentPoints(d: string): { x: number; y: number }[] | null {
  const tokens = d.split(/[\s,]+/).filter((t) => t.length > 0);
  const pts: { x: number; y: number }[] = [];
  let cur: { x: number; y: number } | undefined;
  let cmd = 'M';
  let ti = 0;
  const num = (): number | undefined => {
    if (ti >= tokens.length) return undefined;
    const t = tokens[ti];
    if (/^[A-Za-z]$/.test(t)) return undefined;
    const n = Number(t);
    if (!Number.isFinite(n)) return undefined;
    ti++;
    return n;
  };
  while (ti < tokens.length) {
    const t = tokens[ti];
    if (/^[A-Za-z]$/.test(t)) {
      cmd = t;
      ti++;
      if (cmd === 'Z' || cmd === 'z') continue;
      continue;
    }
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L': {
        const x = num(); const y = num();
        if (x === undefined || y === undefined) return pts.length ? pts : null;
        cur = { x, y };
        pts.push(cur);
        cmd = 'L'; // 后续隐式坐标视为 L
        break;
      }
      case 'H': {
        const x = num();
        if (x === undefined || !cur) return pts.length ? pts : null;
        cur = { x, y: cur.y };
        pts.push(cur);
        break;
      }
      case 'V': {
        const y = num();
        if (y === undefined || !cur) return pts.length ? pts : null;
        cur = { x: cur.x, y };
        pts.push(cur);
        break;
      }
      case 'A': {
        // rx ry rot laf sf x y（7 参数）
        for (let k = 0; k < 6; k++) { const _ = num(); if (_ === undefined) return pts.length ? pts : null; }
        const x = num(); const y = num();
        if (x === undefined || y === undefined || !cur) return pts.length ? pts : null;
        cur = { x, y };
        pts.push(cur);
        break;
      }
      case 'C': {
        for (let k = 0; k < 4; k++) { const _ = num(); if (_ === undefined) return pts.length ? pts : null; }
        const x = num(); const y = num();
        if (x === undefined || y === undefined || !cur) return pts.length ? pts : null;
        cur = { x, y };
        pts.push(cur);
        break;
      }
      case 'S':
      case 'Q': {
        for (let k = 0; k < 2; k++) { const _ = num(); if (_ === undefined) return pts.length ? pts : null; }
        const x = num(); const y = num();
        if (x === undefined || y === undefined || !cur) return pts.length ? pts : null;
        cur = { x, y };
        pts.push(cur);
        break;
      }
      case 'T': {
        const x = num(); const y = num();
        if (x === undefined || y === undefined || !cur) return pts.length ? pts : null;
        cur = { x, y };
        pts.push(cur);
        break;
      }
      default:
        return pts.length ? pts : null;
    }
  }
  return pts.length ? pts : null;
}

// ---------------------------------------------------------------------------
// 语义数据小工具（镜像 deriveGroups / groupsOwning 语义，独立实现）
// ---------------------------------------------------------------------------

/** doc 中的 group 节点（kind === 'group'），文档序（镜像 deriveGroups） */
function groupNodesOf(doc: LgdlDocument): LgdlNode[] {
  return doc.nodes.filter((n) => n.kind === 'group');
}

/** 拥有某节点 id 的全部组 id（任意嵌套，镜像 render groupsOwning） */
function groupsOwningId(doc: LgdlDocument, id: string | undefined): Set<string> {
  const out = new Set<string>();
  if (id === undefined) return out;
  const groups = groupNodesOf(doc);
  const collect = (nid: string): void => {
    for (const g of groups) {
      if ((g.contains ?? []).includes(nid) && !out.has(g.id)) {
        out.add(g.id);
        collect(g.id);
      }
    }
  };
  collect(id);
  return out;
}

/** 是否连边元素（祖先 g class ∈ 四连边类）——返回命中的连边类 */
function edgeClassOf(e: SvgElement): string | undefined {
  for (let k = e.gClasses.length - 1; k >= 0; k--) {
    if (EDGE_G_CLASSES.has(e.gClasses[k])) return e.gClasses[k];
  }
  return undefined;
}

function segCrossesBox(a: { x: number; y: number }, b: { x: number; y: number }, box: AuditBox): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx < 0.5 && dy > 0.5) {
    // vertical
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    return box.x < a.x && a.x < box.x + box.w && box.y < hi && box.y + box.h > lo;
  }
  if (dy < 0.5 && dx > 0.5) {
    // horizontal
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    return box.y < a.y && a.y < box.y + box.h && box.x < hi && box.x + box.w > lo;
  }
  return false;
}

/** G6 命中：轴对齐段与框边线共线且重合长度 >0.5px（0/1/2 条边）。 */
interface BoxRideHit {
  /** 框边：上/下/左/右 */
  edge: string;
  /** 重合长度 px */
  overlap: number;
}

/**
 * G6 沿框边借道判定：仅轴对齐段。水平段查框的上/下边，垂直段查框的左/右边；
 * 段与边线距离 < AUDIT_TOL.edgeRideTolPx 视为共线，重合长度 > 0.5px 即命中。
 * 垂直进锚点（段垂直框边线、只交一点）重合≈0 天然不命中；平行滑入/滑出命中。
 */
function segRideOnBox(a: { x: number; y: number }, b: { x: number; y: number }, box: AuditBox): BoxRideHit[] {
  const out: BoxRideHit[] = [];
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx < 0.5 && dy < 0.5) return out; // 零长段（routeDefault 退化）
  if (dx > 0.5 && dy > 0.5) return out; // 斜段归 G2，不判借道
  const tol = AUDIT_TOL.edgeRideTolPx;
  if (dy < 0.5) {
    // 水平段：段 y 是否落在框上/下边线带内
    const y = a.y;
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    const overlapX = (): number => Math.min(x1, box.x + box.w) - Math.max(x0, box.x);
    if (Math.abs(y - box.y) < tol) {
      const n = overlapX();
      if (n > 0.5) out.push({ edge: '上', overlap: n });
    }
    const bottom = box.y + box.h;
    if (Math.abs(y - bottom) < tol) {
      const n = overlapX();
      if (n > 0.5) out.push({ edge: '下', overlap: n });
    }
  } else {
    // 垂直段：段 x 是否落在框左/右边线带内
    const x = a.x;
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    const overlapY = (): number => Math.min(y1, box.y + box.h) - Math.max(y0, box.y);
    if (Math.abs(x - box.x) < tol) {
      const n = overlapY();
      if (n > 0.5) out.push({ edge: '左', overlap: n });
    }
    const right = box.x + box.w;
    if (Math.abs(x - right) < tol) {
      const n = overlapY();
      if (n > 0.5) out.push({ edge: '右', overlap: n });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 容器框提取（G3/G4/G5 共用）
// ---------------------------------------------------------------------------

interface ContainerInfo {
  box: AuditBox;
  gClass: string;
  loc?: string;
}

/**
 * 从 SVG 提取容器框：祖先 g class ∈ lgdl-group / lgdl-lane / lgdl-gantt-lane 的
 * <rect>，每个容器 g 取最大高度 rect（背景带；头部小 rect 被覆盖）。
 */
export function extractContainerBoxes(elems: SvgElement[]): ContainerInfo[] {
  const byG = new Map<string, ContainerInfo>();
  for (const e of elems) {
    if (e.tag !== 'rect' || e.inDefs) continue;
    const x = toNum(e.attrs, 'x');
    const y = toNum(e.attrs, 'y');
    const w = toNum(e.attrs, 'width');
    const h = toNum(e.attrs, 'height');
    if (x === undefined || y === undefined || w === undefined || h === undefined) continue;
    let gClass: string | undefined;
    for (let k = e.gClasses.length - 1; k >= 0; k--) {
      if (CONTAINER_G_CLASSES.has(e.gClasses[k])) {
        gClass = e.gClasses[k];
        break;
      }
    }
    if (!gClass) continue;
    const key = `${e.gClasses.join('|')}|${e.gLoc ?? ''}`;
    const prev = byG.get(key);
    if (!prev || h > prev.box.h) {
      byG.set(key, { box: { x, y, w, h }, gClass, loc: e.loc });
    }
  }
  return [...byG.values()];
}

// ---------------------------------------------------------------------------
// G1~G6（G5 与 G6 定义见本区段尾部：auditG5 / auditG6）
// ---------------------------------------------------------------------------

function auditLayoutFinite(doc: LgdlDocument, layout: LayoutResult, v: Violation[]): void {
  for (const nd of layout.nodes) {
    for (const [k, val] of [
      ['x', nd.x], ['y', nd.y], ['width', nd.width], ['height', nd.height],
    ] as const) {
      if (!finite(val)) {
        v.push({ type: 'G1', element: `LayoutResult.nodes[${layout.nodes.indexOf(nd)}] (id=${nd.id}).${k}`, detail: `${k}=${String(val)} 非有限坐标` });
      }
    }
  }
  for (const e of layout.edges) {
    for (const p of e.points) {
      if (!finite(p.x) || !finite(p.y)) {
        v.push({ type: 'G1', element: `LayoutResult.edges[${layout.edges.indexOf(e)}] (${e.from}->${e.to}).points`, detail: `点 (${String(p.x)},${String(p.y)}) 非有限坐标` });
      }
    }
  }
  if (!finite(layout.width) || !finite(layout.height)) {
    v.push({ type: 'G1', element: 'LayoutResult.width/height', detail: `画布 ${String(layout.width)}x${String(layout.height)} 非有限` });
  }
}

function auditSvgNumeric(elems: SvgElement[], v: Violation[]): void {
  const numericAttrs: [string, string[]][] = [
    ['rect', ['x', 'y', 'width', 'height', 'rx', 'ry']],
    ['circle', ['cx', 'cy', 'r']],
    ['line', ['x1', 'y1', 'x2', 'y2']],
    ['polygon', ['points']],
    ['text', ['x', 'y', 'font-size']],
  ];
  for (const e of elems) {
    for (const [tag, keys] of numericAttrs) {
      if (e.tag !== tag) continue;
      for (const k of keys) {
        const raw = e.attrs[k];
        if (raw === undefined) continue;
        if (tag === 'polygon' && k === 'points') {
          for (const tok of raw.split(/[\s,]+/).filter(Boolean)) {
            if (!NUM_RE.test(tok) || !Number.isFinite(Number(tok))) {
              v.push({ type: 'G1', element: `<polygon points="${raw.slice(0, 60)}"`, detail: `points token "${tok}" 非法/非有限`, docRef: e.loc });
            }
          }
          continue;
        }
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          v.push({ type: 'G1', element: `<${tag} ${k}="${raw}"`, detail: `${k}=${raw} 非有限数值`, docRef: e.loc });
        }
      }
    }
    if (e.tag === 'path') {
      const d = e.attrs.d;
      if (d === undefined) continue;
      for (const tok of d.split(/[\s,]+/).filter(Boolean)) {
        if (/^[A-Za-z]$/.test(tok)) continue;
        if (!NUM_RE.test(tok) || !Number.isFinite(Number(tok))) {
          v.push({ type: 'G1', element: `<path d="${d.slice(0, 60)}"`, detail: `d token "${tok}" 非法/非有限`, docRef: e.loc });
        }
      }
    }
  }
}

function auditG2(elems: SvgElement[], v: Violation[]): void {
  for (const e of elems) {
    if (e.inDefs) continue;
    const cls = edgeClassOf(e);
    if (!cls) continue;
    let pts: { x: number; y: number }[] | null = null;
    if (e.tag === 'line') {
      const x1 = toNum(e.attrs, 'x1');
      const y1 = toNum(e.attrs, 'y1');
      const x2 = toNum(e.attrs, 'x2');
      const y2 = toNum(e.attrs, 'y2');
      if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
        pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      }
    } else if (e.tag === 'path') {
      pts = pathPointsFromD(e.attrs.d ?? '');
      if (pts === null) {
        v.push({
          type: 'G2',
          element: `<path d="${(e.attrs.d ?? '').slice(0, 60)}"`,
          detail: '连边 path 含非 M/L 命令（C/Q/A…）——无法判定段正交性（fail-safe）',
          docRef: e.loc,
        });
        continue;
      }
    } else {
      continue;
    }
    if (!pts || pts.length < 2) continue;
    const loc = e.loc;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const dx = Math.abs(b.x - a.x);
      const dy = Math.abs(b.y - a.y);
      if (dx > AUDIT_TOL.orthoTolPx && dy > AUDIT_TOL.orthoTolPx) {
        v.push({
          type: 'G2',
          element: `${cls} ${loc ?? ''} 段 (${a.x},${a.y})->(${b.x},${b.y})`,
          detail: `斜段 dx=${dx.toFixed(2)}px dy=${dy.toFixed(2)}px 均 > ${AUDIT_TOL.orthoTolPx}px（非正交）`,
          docRef: loc,
        });
      }
    }
  }
}

function auditG3(doc: LgdlDocument, layout: LayoutResult, elems: SvgElement[], v: Violation[]): void {
  const nodeBoxes = new Map<string, AuditBox>();
  for (const nd of layout.nodes) nodeBoxes.set(nd.id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height });
  const containers = extractContainerBoxes(elems);
  const groupIds = new Set(groupNodesOf(doc).map((g) => g.id));
  const isGroupId = (id: string): boolean => groupIds.has(id);

  for (const e of elems) {
    if (e.inDefs) continue;
    const cls = edgeClassOf(e);
    if (!cls) continue;
    let pts: { x: number; y: number }[] | null = null;
    if (e.tag === 'line') {
      const x1 = toNum(e.attrs, 'x1');
      const y1 = toNum(e.attrs, 'y1');
      const x2 = toNum(e.attrs, 'x2');
      const y2 = toNum(e.attrs, 'y2');
      if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
        pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      }
    } else if (e.tag === 'path') {
      pts = pathPointsFromD(e.attrs.d ?? '');
    }
    if (!pts || pts.length < 2) continue;

    // from/to（优先 loc）
    let from: string | undefined;
    let to: string | undefined;
    if (e.loc) {
      const m = /^edges\[(\d+)\]$/.exec(e.loc);
      if (m) {
        const ed = doc.edges[Number(m[1])];
        if (ed) {
          from = ed.from;
          to = ed.to;
        }
      }
    }
    if (from === undefined || to === undefined) {
      // 兜底：按端点坐标反查 layout.edges → 再从 doc.edges 同名匹配
      const p0 = pts[0];
      const pn = pts[pts.length - 1];
      const hit = layout.edges.find((le) => {
        if (le.points.length < 2) return false;
        const la = le.points[0];
        const lb = le.points[le.points.length - 1];
        return (
          Math.abs(la.x - p0.x) < 0.6 && Math.abs(la.y - p0.y) < 0.6 &&
          Math.abs(lb.x - pn.x) < 0.6 && Math.abs(lb.y - pn.y) < 0.6
        );
      });
      if (hit) {
        from = hit.from;
        to = hit.to;
      }
    }

    // 豁免：端点自身节点框 + 拥有端点的组框（含嵌套，递归）——组端点本身及其
    // 祖先组一并豁免（嵌套组内聚合边合法穿过自身祖先容器，镜像 render 口径）
    const exemptGroupIds = new Set<string>();
    const exemptNodeIds = new Set<string>();
    if (from !== undefined) {
      if (isGroupId(from)) {
        exemptGroupIds.add(from);
        for (const g of groupsOwningId(doc, from)) exemptGroupIds.add(g);
      } else {
        exemptNodeIds.add(from);
        for (const g of groupsOwningId(doc, from)) exemptGroupIds.add(g);
      }
    }
    if (to !== undefined) {
      if (isGroupId(to)) {
        exemptGroupIds.add(to);
        for (const g of groupsOwningId(doc, to)) exemptGroupIds.add(g);
      } else {
        exemptNodeIds.add(to);
        for (const g of groupsOwningId(doc, to)) exemptGroupIds.add(g);
      }
    }

    // 障碍：LayoutResult.nodes bbox（端点节点豁免）+ SVG 容器 rect
    // （容器 loc nodes[i] → 该组 id 属 exemptGroupIds 则豁免）
    const obstacles: { box: AuditBox; id: string }[] = [];
    for (const [nid, box] of nodeBoxes) {
      if (exemptNodeIds.has(nid)) continue;
      obstacles.push({ box, id: nid });
    }
    for (const c of containers) {
      let gid: string | undefined;
      if (c.loc) {
        const m = /^nodes\[(\d+)\]$/.exec(c.loc);
        if (m) gid = doc.nodes[Number(m[1])]?.id;
      }
      if (gid !== undefined && exemptGroupIds.has(gid)) continue;
      obstacles.push({ box: c.box, id: gid ?? c.loc ?? c.gClass });
    }

    const segs: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      // 只判轴对齐段；斜段由 G2 兜底；零长段不判
      if (dx < 0.5 && dy < 0.5) continue;
      if (dx > 0.5 && dy > 0.5) continue;
      segs.push({ a, b });
    }
    for (const seg of segs) {
      for (const o of obstacles) {
        if (segCrossesBox(seg.a, seg.b, o.box)) {
          v.push({
            type: 'G3',
            element: `${cls} ${e.loc ?? ''} 段 (${seg.a.x},${seg.a.y})->(${seg.b.x},${seg.b.y})`,
            detail: `穿 ${o.id} 框 (${o.box.x},${o.box.y},${o.box.w}x${o.box.h})`,
            docRef: e.loc,
          });
        }
      }
    }
  }
}

function auditG4(doc: LgdlDocument, layout: LayoutResult, elems: SvgElement[], v: Violation[]): void {
  const nodeBoxById = new Map<string, AuditBox>();
  for (const nd of layout.nodes) nodeBoxById.set(nd.id, { x: nd.x, y: nd.y, w: nd.width, h: nd.height });
  const containers = extractContainerBoxes(elems).filter((c) => G4_CONTAINER_CLASSES.has(c.gClass));

  // 容器 loc（nodes[i]）→ 组节点 id（用于「自身容器/祖先容器」豁免）
  const gidOfLoc = (loc: string | undefined): string | undefined => {
    if (!loc) return undefined;
    const m = /^nodes\[(\d+)\]$/.exec(loc);
    if (!m) return undefined;
    const g = doc.nodes[Number(m[1])];
    return g?.kind === 'group' ? g.id : undefined;
  };
  const containerByLoc = new Map<string, AuditBox>();
  for (const c of containers) {
    if (c.loc) containerByLoc.set(c.loc, c.box);
  }

  const allBoxes: { box: AuditBox; id: string; gid?: string }[] = [];
  for (const [id, b] of nodeBoxById) allBoxes.push({ box: b, id });
  for (const c of containers) allBoxes.push({ box: c.box, id: c.loc ?? c.gClass, gid: gidOfLoc(c.loc) });

  /** 连边标签（edge/aggregate/dep/message 内 text）端点所在容器 → 豁免 */
  const endpointContainersOf = (e: SvgElement): Set<string> => {
    const out = new Set<string>();
    if (!e.loc) return out;
    const m = /^edges\[(\d+)\]$/.exec(e.loc);
    if (!m) return out;
    const ed = doc.edges[Number(m[1])];
    if (!ed) return out;
    const groups = new Set(groupNodesOf(doc).map((g) => g.id));
    for (const ep of [ed.from, ed.to]) {
      if (groups.has(ep)) out.add(ep);
      else for (const g of groupsOwningId(doc, ep)) out.add(g);
    }
    return out;
  };

  for (const e of elems) {
    if (e.tag !== 'text' || e.inDefs) continue;
    const tb = textBoxOf(e);
    if (!tb) continue;
    const pad = AUDIT_TOL.labelPadPx;
    const padded = { x: tb.x - pad, y: tb.y - pad, w: tb.w + pad * 2, h: tb.h + pad * 2 };

    // 宿主解析（最内层 host g）：节点/卡片/参与者/条/里程碑 → 对应 LayoutResult
    // 节点框；group/lane → 同 g 内 rect。成员行 text 的 loc 是 nodes[i].members[j]，
    // 宿主定位必须用祖先 g 的 gLoc（nodes[i]）。
    let hostClass: string | undefined;
    for (let k = e.gClasses.length - 1; k >= 0; k--) {
      const g = e.gClasses[k];
      if (HOST_NODE_G_CLASSES.has(g) || HOST_CONTAINER_G_CLASSES.has(g)) {
        hostClass = g;
        break;
      }
    }
    let hostBox: AuditBox | undefined;
    let hostGid: string | undefined; // 宿主容器组 id（文本在容器内）
    if (hostClass !== undefined && e.gLoc) {
      const m = /^nodes\[(\d+)\]$/.exec(e.gLoc);
      const locIdx = m ? Number(m[1]) : -1;
      if (locIdx >= 0 && locIdx < doc.nodes.length) {
        const nd = doc.nodes[locIdx];
        if (HOST_NODE_G_CLASSES.has(hostClass)) {
          hostBox = nodeBoxById.get(nd.id);
          if (hostBox === undefined && nd.kind === 'group') hostGid = nd.id;
        } else if (HOST_CONTAINER_G_CLASSES.has(hostClass)) {
          hostBox = containerByLoc.get(e.gLoc);
          hostGid = gidOfLoc(e.gLoc);
        }
      }
    }

    // 豁免的容器组：宿主节点所在容器 + 宿主容器及其祖先（含嵌套，递归）
    const exemptGids = new Set<string>();
    if (hostGid !== undefined) {
      exemptGids.add(hostGid);
      for (const g of groupsOwningId(doc, hostGid)) exemptGids.add(g);
    } else if (hostBox !== undefined && hostClass !== undefined && HOST_NODE_G_CLASSES.has(hostClass) && e.gLoc) {
      const m = /^nodes\[(\d+)\]$/.exec(e.gLoc);
      if (m) {
        const nd = doc.nodes[Number(m[1])];
        if (nd) for (const g of groupsOwningId(doc, nd.id)) exemptGids.add(g);
      }
    }
    // 无宿主文本（edge/聚合/基数/轴 label…）：豁免边端点所在容器
    if (hostClass === undefined) {
      for (const g of endpointContainersOf(e)) exemptGids.add(g);
    }

    const targets = allBoxes.filter((b) => {
      if (hostBox !== undefined && b.box === hostBox) return false;
      if (b.gid !== undefined && exemptGids.has(b.gid)) return false;
      return true;
    });

    for (const t of targets) {
      if (overlapArea(padded, t.box) > 0) {
        v.push({
          type: 'G4',
          element: `<text x="${tb.x}" y="${tb.y}" font-size="${e.attrs['font-size']}" anchor="${e.attrs['text-anchor'] ?? 'middle'}">${e.text.slice(0, 20)}</text>`,
          detail: `文本 bbox (${padded.x},${padded.y},${padded.w}x${padded.h}) 压 ${t.id} 框 (${t.box.x},${t.box.y},${t.box.w}x${t.box.h})`,
          docRef: e.loc,
        });
      }
    }
  }
}

function auditG5(svg: string, doc: LgdlDocument, layout: LayoutResult, elems: SvgElement[], v: Violation[]): void {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!vb) return;
  const W = Number(vb[1]);
  const H = Number(vb[2]);
  const tol = AUDIT_TOL.canvasPadPx;
  const out = (x0: number, y0: number, x1: number, y1: number, element: string, detail: string, loc?: string): void => {
    if (x0 < -tol || y0 < -tol || x1 > W + tol || y1 > H + tol) {
      v.push({ type: 'G5', element, detail: `${detail} (bbox ${x0},${y0}..${x1},${y1}) 越界 viewBox 0 0 ${W} ${H}`, docRef: loc });
    }
  };

  const pointExtent = (pts: { x: number; y: number }[], element: string, detail: string, loc?: string): void => {
    if (pts.length === 0) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    out(x0, y0, x1, y1, element, detail, loc);
  };

  for (const e of elems) {
    if (e.inDefs) continue;
    // hover 锚点（lgdl-anchors / lgdl-edge-anchors）是隐藏交互把手（opacity:0），
    // r=3 圆点在边界节点/泳道底边合法外探——不计画布越界（可见几何才构成回归）
    if (e.gClasses.some((c) => c === 'lgdl-anchors' || c === 'lgdl-edge-anchors')) continue;
    const loc = e.loc;
    if (e.tag === 'rect') {
      const x = toNum(e.attrs, 'x');
      const y = toNum(e.attrs, 'y');
      const w = toNum(e.attrs, 'width');
      const h = toNum(e.attrs, 'height');
      if (x !== undefined && y !== undefined && w !== undefined && h !== undefined) {
        out(x, y, x + w, y + h, `<rect x="${x}" y="${y}" w=${w} h=${h}`, 'rect 越界', loc);
      }
    } else if (e.tag === 'circle') {
      const cx = toNum(e.attrs, 'cx');
      const cy = toNum(e.attrs, 'cy');
      const r = toNum(e.attrs, 'r');
      if (cx !== undefined && cy !== undefined && r !== undefined) {
        out(cx - r, cy - r, cx + r, cy + r, `<circle cx="${cx}" cy="${cy}" r=${r}`, 'circle 越界', loc);
      }
    } else if (e.tag === 'line') {
      const x1 = toNum(e.attrs, 'x1'); const y1 = toNum(e.attrs, 'y1');
      const x2 = toNum(e.attrs, 'x2'); const y2 = toNum(e.attrs, 'y2');
      if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
        out(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2), `<line x1=${x1} y1=${y1} x2=${x2} y2=${y2}`, 'line 越界', loc);
      }
    } else if (e.tag === 'polygon') {
      const pts: { x: number; y: number }[] = [];
      const nums = (e.attrs.points ?? '').split(/[\s,]+/).filter((t) => t !== '');
      for (let k = 0; k + 1 < nums.length; k += 2) {
        const x = Number(nums[k]); const y = Number(nums[k + 1]);
        if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
      }
      pointExtent(pts, `<polygon points="${(e.attrs.points ?? '').slice(0, 60)}"`, 'polygon 越界', loc);
    } else if (e.tag === 'path') {
      const pts = pathExtentPoints(e.attrs.d ?? '');
      if (pts) pointExtent(pts, `<path d="${(e.attrs.d ?? '').slice(0, 60)}"`, 'path 越界', loc);
    } else if (e.tag === 'text') {
      const tb = textBoxOf(e);
      if (tb) out(tb.x, tb.y, tb.x + tb.w, tb.y + tb.h, `<text x="${tb.x}" y="${tb.y}">${e.text.slice(0, 20)}</text>`, 'text 越界', loc);
    }
  }

  // datastream 泳道列检查（EC-003：无 lane rect 覆盖的合成列节点降级为画布检查——上面已做）
  if (doc.type === 'datastream') {
    const laneRects = extractContainerBoxes(elems)
      .filter((c) => c.gClass === 'lgdl-lane')
      .map((c) => c.box)
      .sort((a, b) => a.x - b.x);
    if (laneRects.length > 0) {
      for (const nd of layout.nodes) {
        const cx = nd.x + nd.width / 2;
        const lane = laneRects.find((l) => cx >= l.x && cx <= l.x + l.w);
        if (!lane) continue; // `_other`/`_default` 合成列：无底框 → 降级画布检查
        const lo = lane.x - 1;
        const hi = lane.x + lane.w + 1;
        if (nd.x < lo || nd.x + nd.width > hi) {
          const docIdx = doc.nodes.findIndex((dn) => dn.id === nd.id);
          v.push({
            type: 'G5',
            element: `nodes[${docIdx >= 0 ? docIdx : layout.nodes.indexOf(nd)}] id=${nd.id} bbox (${nd.x},${nd.y},${nd.width}x${nd.height})`,
            detail: `节点越泳道列 [${lo}, ${hi}]（lane x=${lane.x} w=${lane.w}）`,
            docRef: docIdx >= 0 ? `nodes[${docIdx}]` : undefined,
          });
        }
      }
    }
  }
}

/**
 * G6 沿框边借道：连边（lgdl-edge/aggregate-edge/dep/message）的轴对齐段沿任一
 * 框边线共线滑行（重合 > 0.5px）→ 违例。障碍框 = 全部节点（LayoutResult.nodes
 * bbox）+ 全部容器（SVG 提取）——**无端点豁免**（作者裁决：group 也是 node，
 * 容器/节点都不允许被贴边走线；含端点自身框）。
 */
function auditG6(doc: LgdlDocument, layout: LayoutResult, elems: SvgElement[], v: Violation[]): void {
  const obstacles: { box: AuditBox; id: string }[] = [];
  for (const nd of layout.nodes) {
    obstacles.push({ box: { x: nd.x, y: nd.y, w: nd.width, h: nd.height }, id: nd.id });
  }
  for (const c of extractContainerBoxes(elems)) {
    let gid: string | undefined;
    if (c.loc) {
      const m = /^nodes\[(\d+)\]$/.exec(c.loc);
      if (m) gid = doc.nodes[Number(m[1])]?.id;
    }
    obstacles.push({ box: c.box, id: gid ?? c.loc ?? c.gClass });
  }

  for (const e of elems) {
    if (e.inDefs) continue;
    const cls = edgeClassOf(e);
    if (!cls) continue;
    let pts: { x: number; y: number }[] | null = null;
    if (e.tag === 'line') {
      const x1 = toNum(e.attrs, 'x1');
      const y1 = toNum(e.attrs, 'y1');
      const x2 = toNum(e.attrs, 'x2');
      const y2 = toNum(e.attrs, 'y2');
      if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
        pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      }
    } else if (e.tag === 'path') {
      pts = pathPointsFromD(e.attrs.d ?? '');
    }
    if (!pts || pts.length < 2) continue;

    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      for (const o of obstacles) {
        for (const hit of segRideOnBox(a, b, o.box)) {
          v.push({
            type: 'G6',
            element: `${cls} ${e.loc ?? ''} 段 (${a.x},${a.y})->(${b.x},${b.y})`,
            detail: `沿 ${o.id} 框${hit.edge}边借道 (重合 ${hit.overlap.toFixed(1)}px)`,
            docRef: e.loc,
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

/**
 * 几何审计主入口（FR-005）：对 (doc, layout, svg) 三元组返回六类违例清单。
 * - G1 非有限坐标：双源（LayoutResult 数值字段 + SVG 数值属性/path token），硬判定；
 * - G2 非正交斜段：仅连边元素（lgdl-edge/aggregate-edge/dep/message）M/L 段与 line，
 *   任一段 |dx|、|dy| 均 > 0.51 → 违例；path 含非 M/L 命令 → fail-safe 报；
 * - G3 穿节点：连边水平/垂直段 ×（LayoutResult.nodes bbox + SVG 容器 rect），
 *   开区间内部相交；豁免端点节点与拥有端点的组（含嵌套）；贴边/零长不判；
 * - G4 标签压框：text 估宽 bbox + 2px 外扩 × 非宿主框；宿主豁免（节点框/自身容器框）；
 * - G5 越界：全部几何元素超 viewBox ±1px；datastream 泳道列检查（EC-003 降级内置）；
 * - G6 沿框边借道：连边轴对齐段与任一框边线共线（距离 <0.5px）且重合 >0.5px →
 *   违例；无端点豁免（含端点自身节点/组框），垂直进锚点（点相交）天然不触发。
 */
export function auditGeometry(doc: LgdlDocument, layout: LayoutResult, svg: string): Violation[] {
  const violations: Violation[] = [];
  const elems = parseSvgElements(svg);

  auditLayoutFinite(doc, layout, violations);
  auditSvgNumeric(elems, violations);
  auditG2(elems, violations);
  auditG3(doc, layout, elems, violations);
  auditG4(doc, layout, elems, violations);
  auditG5(svg, doc, layout, elems, violations);
  auditG6(doc, layout, elems, violations);

  return violations;
}
