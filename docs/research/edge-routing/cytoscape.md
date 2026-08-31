> 📜 历史文档，包名已更名为 @lgdl/lgdl-router（本文档为调研记录，引用旧名 @lgdl/router 属历史上下文）
# 竞品深度调研：Cytoscape.js 边路由能力

> 所属主题：[edge-routing](../README.md) · 调研日期 2026-08-28 · 只读调研，未改任何代码。

---

## 0. 一句话结论

**Cytoscape.js 核心没有内置正交边路由器，也不依赖 edgehandles 来做避障。** 它唯一的"正交外观"是样式 `curve-style: taxi / segments`，但那只是按源/目标位置算的**纯几何直角折线**（不超过 2 次转折），不感知其他节点 → 会直穿。因此它给不了 @lgdl/router 任何"防贴边/防穿越"算法参考。

---

## 1. 来源

- 仓库：`cytoscape/cytoscape.js` unstable（v3.35.0-unstable）。本仓库不在本地，用 `gh api` 拉取确认。
- 定位：**Graph theory (network) library for visualisation and analysis**（数据/渲染容器）。

## 2. 核心证据：核心无内置边路由，也不依赖 edgehandles

- `orthogonal` 在整仓 `gh search code` 命中 **0**（`total_count=0`）——任何"正交路由"实现都不存在。
- `edgehandles` 只在文档出现（`documentation/md/extensions.md`、`documentation/docmaker.json`），文档原文：
  > `edgehandles` (https://github.com/cytoscape/cytoscape.js-edgehandles) : **UI for connecting nodes with edges.**
  
  → edgehandles 是**第三方扩展**，用途是"**用 UI 拖拽建边**"，**不是**边路由/避障。Cytoscape 核心不依赖它。
- `src/extensions/index.mjs` 只 bundle **`layout` + `renderer`** 两类扩展：
  ```js
  import layout from './layout/index.mjs';
  import renderer from './renderer/index.mjs';
  export default [ {type:'layout', extensions:layout}, {type:'renderer', extensions:renderer} ];
  ```
  `src/extensions/layout/` = `breadthfirst, circle, concentric, cose, grid, null, preset, random` —— **全为"节点定位"布局，无一是边路由**（如 Router/OrthogonalRouter/AStarEdgeRouter）。
- 核心**零运行时依赖**（`package.json` 只有 `devDependencies`，无 `dependencies`/`peerDependencies`）。

## 3. 唯一的"正交外观"：curve-style taxi / segments（不避障）

`src/extensions/renderer/base/coord-ele-math/edge-control-points.mjs` 的 `findTaxiPoints`：
```js
BRp.findTaxiPoints = function( edge, pairInfo ){
  rs.edgeType = 'segments';
  const { posPts, srcW, srcH, tgtW, tgtH } = pairInfo;   // 只取源/目标位置和尺寸
  ...
  rs.segpts = [ posPts.x1, posPts.y2 ];   // L-shape
};
```
- **输入只有 `pairInfo`（源/目标位置 + 宽高），不含其他节点/障碍物。**
- `taxi`（直角折线，最多两次转折）、`segments`（多段直线）是**纯几何**：把源、目标两点连成直角折线；两端太近时回退为 L 形/Z 形。
- 文档（`documentation/md/style.md:384`）：`taxi` (right-angled lines, hierarchically bundled)、`round-taxi` (right-angled lines ... with rounded corners)。
- **关键**：`taxi` 只是"两个点之间的直角折线"，**不会扫描图中的其他节点、不会绕开它们**。所以 Cytoscape.js **只有"直角外观"，没有"避障路由"**。

## 4. 库内 A* 不是边路由

`src/collection/algorithms/a-star.mjs`：
```js
aStar: function( options ){
  let { root, goal, heuristic, directed, weight } = aStarDefaults(options);
  root = cy.collection(root)[0];
  goal = cy.collection(goal)[0];
  ...  // gScore / fScore / openSet (Heap) Dijkstra 加权最短路径
}
```
→ A*（root→goal 的图搜索，Dijkstra 加权最短路径）返回**节点路径**，**不生成边折线、不避开节点、不为 edge 布线**。它常用于"两节点在图上的最短路径"，与 edge-routing 无关。

## 5. 与 @lgdl/router 的关系（一句话）

Cytoscape.js 的 `taxi/segments` 是"**直角外观**"，不是"**障碍规避路由**"；`edgehandles` 是"**建边 UI**"，≠ edge-routing。要做真避障，得另接第三方算法或直接接 @lgdl/router 这类。因此它给不了 @lgdl/router 的"防贴边/防穿越"参考——**真正可比的是 Mermaid 与 ELK**。

---

*本报告基于 cytoscape.js `unstable` 分支 gh api 确认；因仓库不在本地，核心源码未逐行复制（详见 `code/` 目录说明）。*
