/**
 * render-harness — 全链路门禁测试基座（FR-001）。
 *
 * renderDoc(source, id?) = parseLgdl → 断言 valid → await layoutDocument →
 * renderSvg → 返回 { doc, layout, svg }。矩阵（matrix-a/b）、快照（snapshot）、
 * kind 覆盖（kind-coverage）三方共享同一基座；矩阵用例一律真实 DSL 文本全链路，
 * **禁止手造 LayoutResult fixture**（唯一例外 = degraded-paths.test.ts，FR-007 授权）。
 *
 * 模块级渲染缓存：以 `id ?? source` 为键，同进程同文档只渲一次（引擎确定性
 * A-002 支撑——同输入必同输出，缓存不改变语义）。跨测试文件复用需传 id。
 *
 * 相对 `.js` 扩展 import（NodeNext + test 脚本 --rewriteRelativeImportExtensions，
 * 同 svg.test.ts `./index.js` 先例）。test-support 经 import 图进 dist-test/，
 * 不被 node --test 顶层 glob 当测试执行（ADR-001）。
 */
import { parseLgdl, type LgdlDocument } from '@lgdl/lgdl-core';
import { layoutDocument, type LayoutResult } from '@lgdl/lgdl-layout';
import { renderSvg } from '../index.js';

export interface RenderTriple {
  doc: LgdlDocument;
  layout: LayoutResult;
  svg: string;
}

const cache = new Map<string, RenderTriple>();

/**
 * 全链路渲染：非法文档抛错（错误信息含 parse issues，供测试定位）。
 * 合法文档返回 { doc, layout, svg }；带 id 的重复调用命中模块级缓存。
 */
export async function renderDoc(source: string, id?: string): Promise<RenderTriple> {
  const key = id ?? source;
  const hit = cache.get(key);
  if (hit) return hit;

  const parsed = parseLgdl(source);
  if (!parsed.valid) {
    const detail = parsed.issues.map((i) => `${i.severity}: ${i.message}${i.location ? ` @${i.location}` : ''}`).join(' | ');
    throw new Error(`renderDoc: 文档解析失败 (id=${id ?? '<inline>'}) — ${detail}`);
  }
  const layout = await layoutDocument(parsed.document);
  const svg = renderSvg(parsed.document, layout);
  const triple: RenderTriple = { doc: parsed.document, layout, svg };
  cache.set(key, triple);
  return triple;
}

/** 渲染缓存条目数（供自检/审计测试观察缓存命中语义）。 */
export function renderCacheSize(): number {
  return cache.size;
}
