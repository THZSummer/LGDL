/**
 * LGDL 布局引擎配置。
 *
 * `LAYOUT_ENGINE` 决定分层图（flowchart / arch / er / uml-class / state 等走
 * 分层布局的类型）用哪个引擎做节点定位：
 * - `'elkjs'`（默认，迁移目标）——ELK（elkjs, wasm）`elk.layered` 分层布局，原生
 *   支持 `elk.edgeRouting: ORTHOGONAL` 正交布线，可同时输出干净的边折点。
 * - `'dagre'`（旧引擎，可回退）——自研布局沿用 dagre 分层 + 渲染层自研正交化。
 *
 * 自研算法（`orthogonalize`/`placeLabelBox`/mindmap/sequence/gantt/swimlane/grid）
 * 一律保留，不被这里的切换删除；本配置只切"分层布局的节点定位引擎"。
 *
 * 覆盖方式（任选其一，避免改代码重编译）：
 * - 运行时环境变量 `LGDL_LAYOUT_ENGINE=elkjs|dagre`；
 * - 直接修改下面的 `LAYOUT_ENGINE`。
 */
export type LayoutEngine = 'elkjs' | 'dagre';

const env = (typeof process !== 'undefined' && process.env?.LGDL_LAYOUT_ENGINE) as LayoutEngine | undefined;
export const LAYOUT_ENGINE: LayoutEngine =
  env === 'elkjs' || env === 'dagre' ? env : 'elkjs';
