# 系统架构 — 全景入口

> **文档定位**: sddu-docs-overview — 本级全景入口
> **输出文件名**: docs-overview.md
> **数据来源**: 代码扫描生成（用户指令触发）；素材为 packages/*/package.json、tsconfig.json、根配置、.github/workflows、scripts/
> **创建时间**: 2026-08-30
> **版本**: v1.0（feature/group-as-node @ 15e5b6b）
> **生成方式**: 全量构建

---

## 1. 业务全景

### 1.1 自身概述

| 属性 | 值 |
|------|-----|
| **类型** | npm workspaces monorepo（6 包，TypeScript ESM） |
| **职责描述** | 把「语义优先」的 `.lgdl` 文本编译为自动布局的 SVG/PNG/ASCII 图；为终端用户与 AI Agent 分别提供 CLI 与 Web 两个入口 |
| **所属业务域** | LGDL 项目根 |
| **版本** | 根 package.json 0.5.0（各子包均 0.5.0；web 为 private 不发布） |

### 1.2 子组件

| 组件 | 类型 | 描述 | 关系说明 |
|------|------|------|---------|
| **core** | 库包 | 语言核心：解析器（手写 YAML 子集）、语义模型（group-as-node）、严格校验、增量变更协议、命令注册表、格式转换注册表。零依赖 | 被其余全部 5 包依赖——唯一的「语言事实来源」 |
| **layout** | 库包 | 确定性布局引擎：自研 Sugiyama 分层（`layered.ts`）+ 分组感知两层布局 + 径向树/时序/泳道/甘特/网格 5 种专用布局。仅依赖 core | 依赖 core；被 render 与 web 直接依赖 |
| **router** | 库包 | 正交边布线引擎：A* 网格搜索 + 形状边界锚定，纯几何、零依赖、不知 DOM 与样式。⚠️ README 未提及此包 | 零包间依赖；被 render 依赖（从 render 抽出，commit `203a000`） |
| **render** | 库包 | SVG/ASCII 渲染器：形状映射、锚点系统、标签避让、`data-lgdl-loc` 源映射。依赖 core + layout + router | 流水线末端；同时被 cli 与 web 消费 |
| **cli** | 应用包 | 终端 `lgdl-cli`：19 个命令（init/render/status/queries/convert/import/9 个增量编辑），commander + `--file` 磁盘 IO。依赖 core + render + commander | 发布到 npm 的门面包 |
| **web** | 应用包（private） | Web 工作台：React 18 + Vite + CodeMirror 6，内嵌与终端同管线的编译循环 + AI 助手（原生 function calling 三工具）。依赖 core + layout + render + React 系 + AI SDK 系 | 部署到 GitHub Pages 的 SPA |

### 1.3 子组件分类

| 分类 | 包含组件 |
|------|---------|
| **语言与语义层** | core |
| **几何计算层（纯函数、零 DOM）** | layout、router |
| **呈现层** | render |
| **消费入口层** | cli（终端）、web（浏览器） |

---

## 2. 技术全景

### 2.1 分层与依赖方向

![LGDL 四层架构与依赖方向](../diagrams/architecture-layers.visual-check.1440x900.light.png)

> **[打开交互图：LGDL 四层架构与依赖方向](../diagrams/architecture-layers.html)**
> 自包含 HTML（Archify 编译，IR 源文件 `diagrams/ir/architecture-layers.json`），支持亮/暗主题切换、平移缩放、聚焦与上下游依赖追踪。

依赖规则（实测自各 package.json `dependencies`）：

| 依赖方 | 被依赖方 | 版本约束 | 证据 |
|--------|---------|---------|------|
| layout | core | ^0.5.0 | packages/layout/package.json |
| render | core + layout + router | ^0.5.0 ×3 | packages/render/package.json |
| cli | core + render + commander | ^0.5.0 / ^12.0.0 | packages/cli/package.json |
| web | core + layout + render + 11 个前端运行时依赖 | ^0.5.0 ×3 | packages/web/package.json |
| router | （无） | — | packages/router/package.json `"dependencies": {}` |
| core | （无） | — | package.json 描述「zero dependencies」 |

构建体系：根 `tsconfig.json` 用 project references 串起 core → layout → router → render → cli（**web 不在其中**——它是 Vite 应用，`moduleResolution: Bundler`，`noEmit`，由 `vite build` 单独打包；`predev` 钩子会先构建四个依赖包）。

### 2.2 router 包职责澄清（README 缺口补充）

README.md:164-175 的架构树只列 5 包。从代码澄清的 router 定位：

- **是什么**：`@lgdl/router` —— 正交边布线引擎。输入「布局折线 + 两端节点盒/形状 kind + 障碍盒集合」，输出「90° 正交、绕开所有第三方盒子的最终折线」（router/src/index.ts:1-10 模块头注释）。
- **从哪来**：commit `203a000`「refactor(render): 把走线抽到独立的 @lgdl/router 包」——从 render 内部抽出成独立包（main 分支无此包）。
- **为什么独立**：纯几何、零依赖、可独立测试（8 条回归测试）；render 只负责「画」，路由只负责「走线怎么绕」。
- **关键导出**：`routeEdge`（A* 主入口）、`shapeEdgePoint`/`roundedRectPoint`（形状方程求交锚点）、`orthogonalize`（降级正交化）、`routeRectilinear`（候选通道法）、`pathClearanceInterior`/`pathHugLength`/`countCrossingsWithRouted`（质量度量）。

### 2.3 架构决策记录（ADR）

| 编号 | 标题 | 状态 | 影响范围 |
|:--:|------|:--:|---------|
| ADR-001 | 布局引擎三阶段演进：dagre → elkjs → 彻底自研 | ACCEPTED | layout、web 打包 |
| ADR-002 | 语义模型统一：group-as-node | ACCEPTED（开发分支） | core、layout、render 及全部下游 |
| ADR-003 | 布线抽出独立 router 包 | ACCEPTED | render、router |
| ADR-004 | 双 CLI 物理分离 + core 命令注册表单一实现 | ACCEPTED | cli、web、core |
| ADR-005 | error-only 严格校验（无静默降级） | ACCEPTED | core parser |
| ADR-006 | AI 不直接写源码，只走增量命令 | ACCEPTED | web AI、cli |
| ADR-007 | markdown 协议块升级为原生 function calling | ACCEPTED | web AI |
| ADR-008 | 增量编辑协议（AI 永不整图重写） | ACCEPTED | core、cli、web |

> 详见根级 [adr-index.md](../adr-index.md)（含每条的决策/备选/理由/证据锚点）。

### 2.4 部署拓扑

| 通道 | 机制 | 触发 | 证据 |
|------|------|------|------|
| **npm 包** | `@lgdl/cli`（bin: lgdl-cli），files 仅 dist | 手动发布（v0.5.0 已上 npm） | packages/cli/package.json |
| **GitHub Pages** | deploy-pages.yml：checkout → node 20 → `npm ci` → 构建 core/layout/render → `GH_PAGES=true vite build` web → upload-pages-artifact | push 到 main 且路径命中 packages/{web,core,layout,render}/** | .github/workflows/deploy-pages.yml |

> ⚠️ G1 缺口：workflow 的 paths 触发与 build 步骤均**不含 packages/router**。main 现无 router 所以能跑通；v0.6 合入后 render 的 `import '@lgdl/router'` 将因 dist 缺失而构建失败。仅记录，未修改。

## 修订记录

| 生成时间 | 变更 Feature | 生成方式 | 修订人 |
|---------|-------------|:--:|--------|
| 2026-08-30 | 代码级扫描全量生成 | 全量构建 | sddu-docs Agent |
