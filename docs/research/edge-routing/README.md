# Edge-Routing 调研（竞品边路由算法）

> LGDL 主题调研 · 日期 2026-08-28 · 分支 `feature/group-as-node`
> 目标：为 @lgdl/router 的"贴边 / 第三方穿越 / 折点过多"问题找可借鉴机制。只读调研，未改任何 router 代码。

## 一句话结论

> **真正做"正交避障路由"的只有 Mermaid 与 ELK。** Mermaid 用"管道/轨道通道法"（走线被硬性约束在 `障碍边界±15` 安全轨道，搜索图上无贴边轨道）；ELK 用"分层通道 + hyperedge-segment 偏序"（天然 0/2 折点）。我们 @lgdl/router 用 uniform 网格 A\*（cell=6, clear=8）+ 软 clearance，差距在"贴边只软评分、穿越只 flag、折点/方向不进代价"。**建议不推翻 A\*，在 A\* 框架内增量引入：① `clear 8→14`（防贴边）、② 真实交叉计数 + 布边顺序 + `A* += 1000×次数`（防穿越）、③ `bendPenalty`/`dirPenalty` + 直连快路径（减折点）。** 详见 [summary.md](summary.md)。

## 目录

| 文件 | 内容 |
|---|---|
| [summary.md](summary.md) | **总总结报告**：TL;DR、四库对比矩阵、关键机制详解、落地建议、AI 算法评审结论、参考常量汇总 |
| [mermaid.md](mermaid.md) | Mermaid 深度报告：管道/轨道通道法、结构性防贴边、crossing 硬罚、postProcessing、验证机制 |
| [elk.md](elk.md) | ELK 深度报告：分层通道 + hyperedge-segment 偏序、CONFLICT/CROSSING 权重、破环/拆段、spacing 间隙 |
| [dagre.md](dagre.md) | dagre 深度报告：纯布局引擎、无独立边路由器（边=直连+裁节点矩形）、border dummy 节点 |
| [cytoscape.md](cytoscape.md) | Cytoscape.js 深度报告：核心无内置路由、不依赖 edgehandles、`taxi/segments` 只是直角外观 |
| [lgdl-router-current.md](lgdl-router-current.md) | 对照基准：@lgdl/router 当前实现（调用链、参数、路径、缺陷根因、已具备结构基础） |

## 核心代码

`code/` 目录每个竞品一份：

```
code/
├── mermaid/   mermaid-router.ts(88KB主文件) · postProcessing.ts · pipeline.ts · border-hugging 测试×2
├── elk/       OrthogonalEdgeRouter.java · OrthogonalRoutingGenerator.java · HyperEdgeSegment.java
│              PolylineEdgeRouter.java · EdgeRouterFactory.java
└── dagre/     layout.ts · add-border-segments.ts · normalize.ts · position-bk.ts
```

> 源码是只读调研时用 `gh api` 从各仓库抓取的关键文件，供审阅与落地时对照。Cytoscape.js 仓库不在本地，核心源码未抓取（已用 gh api 确认其无内置路由）。

## 相关现状

- @lgdl/router 源码：`packages/router/src/index.ts`（A* 网格路由，660 行）
- 调用方：`packages/render/src/index.ts`（routeEdge 传入 obstacles + bounds）
- 布局：`packages/layout/src/index.ts`（自研 Sugiyama + `RANK_SEP=96` + `layoutGrouped`）
