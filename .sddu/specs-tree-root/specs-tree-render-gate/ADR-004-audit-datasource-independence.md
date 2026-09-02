# ADR-004: 几何审计数据源与独立实现策略（SVG 为真值 + 不复用 router 运行函数）

## 状态
ACCEPTED

## 背景
spec D-003 已钉死五类判定（G1~G5）以「最终 SVG 元素解析」为真值（LayoutResult.edges 只是中心线初值，最终折线在 render 侧 routeEdge/routeRectilinear 生成，render/index.ts:746/874-876）；FR-005 允许 helper「只读复用 router 导出的纯函数或独立实现（plan 定）」。discovery §3.5 架构建议「成品级审计、独立视角拦截」（archify 经验：router 软评分漏网由独立视角兜底，lessons-for-lgdl.md:114-125）；复用业务实现共享同一缺陷会削弱门禁价值。

## 决策
1. `geometry-audit` helper **独立实现**，仅 import `@lgdl/lgdl-core`、`@lgdl/lgdl-layout` 的**类型**（擦除后无运行时依赖）；**不 import router/render 的运行函数**（segmentCrosses/pathCrosses 等只作语义参照不复用）。
2. 内置**轻量 SVG 解析器**（扫描式标签/属性/`<g>` 嵌套栈/`<path d>` 命令切分），只服务本审计，覆盖引擎实际发射的元素族（rect/circle/line/polygon/path/text/g，class：lgdl-node/lgdl-class/lgdl-group/lgdl-lane/lgdl-participant/lgdl-gantt-lane/lgdl-gantt-bar/lgdl-gantt-milestone/lgdl-edge/lgdl-aggregate-edge/lgdl-dep/lgdl-message/lgdl-initial/lgdl-lifeline/lgdl-activation/lgdl-anchors/lgdl-edge-anchors/lgdl-gantt-axis；defs 子树对 G4/G5/G3 豁免、G1 仍全量扫）。
3. 数据源：G1 双源（layout 全数值字段 + SVG 数值属性/path token）；G2 仅连边元素（祖先 g class ∈ 四连边类）的 path M/L 段与 line，path 含非 M/L 命令 → fail-safe 报「无法判定」；G3 障碍 = LayoutResult.nodes bbox + SVG 提取的 lgdl-group/lgdl-lane rect（不复算 render 私有 computeGroupBox），豁免自身端点节点与其所属组（含嵌套，镜像 render groupsOwning 语义 render/index.ts:523-536）；G4 估宽镜像 renderer labelBoxAt 同款启发式（CJK≈1.0fs、Latin≈0.62fs，render/index.ts:246-251），按 text-anchor 定宽向；G5 以 viewBox 为权威 + datastream 泳道列检查（EC-003 降级规则内置）。
4. 全部容差/豁免常量（正交 0.51px、画布 1px、label 扩边 2px 等）按 D-003 表落为**命名导出常量**，validate 校准走 EC-008 审批。

## 后果
- 审计可对任意 `(doc, layout, svg)` 三元组判定 → FR-006 正反例可全合成、FR-007 退化路径可直接驱动 renderSvg 输出审计；
- 独立视角不继承 router/render 的潜在同源缺陷（门禁价值）；代价 = 相交/估宽/解析逻辑需自测锚定（geometry-audit.test.ts ≥10 正反例 + A/B 档 22 文档实测校准，误报走 EC-008 调容差而非静默放宽）；
- helper 不进任何包 exports、不依赖任何内部未导出函数 → 与 NFR-001 旁路约束自洽。
