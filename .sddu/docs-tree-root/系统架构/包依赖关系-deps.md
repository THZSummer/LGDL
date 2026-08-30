# 系统架构 — 包依赖关系

> **文档定位**: sddu-docs-relation-deps — 描述本级组件之间的调用依赖关系，含调用方、被调用方、调用类型和依赖方向
> **输出文件名**: 包依赖关系-deps.md
> **数据来源**: 代码扫描生成（packages/*/package.json + import 语句 grep 实测）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v1.0
> **更新说明**: 初始创建

---

## 1. 依赖关系总览

| 调用方 | 被调用方 | 调用类型 | 依赖方向 | 说明 |
|--------|---------|---------|:--:|------|
| **@lgdl/layout** | @lgdl/core | 编译期 + 运行时 | 单向 | 引 `VIS_SYMBOL`、`deriveGroups`、类型（layout/index.ts:16） |
| **@lgdl/router** | （无） | — | — | 纯几何零依赖（package.json `"dependencies": {}`） |
| **@lgdl/render** | @lgdl/core | 编译期 + 运行时 | 单向 | 类型 + `VIS_SYMBOL` + `deriveGroups`（render/index.ts:7-8） |
| **@lgdl/render** | @lgdl/layout | 编译期 + 运行时 | 单向 | 引 `LayoutResult` 契约类型（render/index.ts:9） |
| **@lgdl/render** | @lgdl/router | 编译期 + 运行时 | 单向 | 引 `routeEdge`/`shapeEdgePoint`/`routeRectilinear`（render/index.ts:10）——**v0.6 新增，main 上不存在** |
| **@lgdl/cli** | @lgdl/core | 编译期 + 运行时 | 单向 | 解析/变更/查询/status/转换/模板 全走 core 单一实现 |
| **@lgdl/cli** | @lgdl/render | 编译期 + 运行时 | 单向 | render 命令调 `layoutDocument` + `renderSvg`/`renderAscii` |
| **@lgdl/cli** | commander ^12 | 运行时 | 单向 | 唯一第三方运行时依赖（cli.ts:9） |
| **@lgdl/web** | @lgdl/core + layout + render | 运行时（Vite 打包） | 单向 | App.tsx:11-13 编译管线三件套；ai/ops.ts 引 core 查询与变更 |
| **@lgdl/web** | react / react-dom 18.3 | 运行时 | 单向 | UI 框架 |
| **@lgdl/web** | codemirror 6 系（codeMirror/lang-yaml/autocomplete/lint） | 运行时 | 单向 | 编辑器：高亮/补全/红波浪线诊断 |
| **@lgdl/web** | openai ^7.5 / @anthropic-ai/sdk ^0.120 | 运行时 | 单向 | 多厂商 AI 接入（OpenAI 兼容端点走 openai SDK；Claude 走 anthropic） |
| **@lgdl/web** | react-markdown + remark-gfm | 运行时 | 单向 | AI 回复 markdown 渲染 |
| **scripts/gen-examples.mjs** | core/layout/render（dist 产物） | 脚本期 | 单向 | 从 web/src/examples.ts 单一来源生成 examples/ 三件套 |

**反向约束（谁依赖谁的不变量）**：
- core 不依赖任何兄弟包（语言事实下沉）；
- router 不依赖任何兄弟包（纯几何可独立复用）；
- layout 不依赖 router / render（布局与走线解耦——布局输出中心到中心的粗折线，走线是 render 编排 router 完成的后续阶段）。

## 2. 依赖图概述

![LGDL 包依赖关系](../diagrams/architecture-deps.visual-check.1440x900.light.png)

> **[打开交互图：LGDL 包依赖关系](../diagrams/architecture-deps.html)**
> 自包含 HTML（Archify 编译，IR 源文件 `diagrams/ir/architecture-deps.json`），支持亮/暗主题切换、平移缩放、聚焦与上下游依赖追踪。

关键调用链（代码证据）：

1. **渲染主链**：`render/index.ts:10` 从 router 引入 `routeEdge`——每条边的最终折线由 router 的 A* 网格搜索决定，render 只把折线画出来。这条 import 是 v0.6「布线抽出」重构的落点（commit `203a000`），也是 README 架构树（5 包）与实际（6 包）漂移的根源。
2. **web 的直连 layout**：web 不经过 cli，`App.tsx compile()` 直接 `parseLgdl → layoutDocument → renderSvg`（App.tsx:520-547）——浏览器内完成与终端完全相同的编译管线。
3. **测试隔离**：router 有独立 8 条回归测试（router.test.ts），可在不启动 render 的情况下验证绕障行为——独立成包的直接收益。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 | 2026-08-30 | sddu-docs Agent |
