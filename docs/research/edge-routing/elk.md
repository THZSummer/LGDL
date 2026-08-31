> 📜 历史文档，包名已更名为 @lgdl/lgdl-router（本文档为调研记录，引用旧名 @lgdl/router 属历史上下文）
# 竞品深度调研：ELK（Eclipse Layout Kernel）正交边路由

> 所属主题：[edge-routing](../README.md) · 调研日期 2026-08-28 · 只读调研，未改任何代码。
> 核心代码：本目录 [`code/elk/`](code/elk/)。

---

## 0. 一句话结论

**ELK 是"分层通道 + hyperedge-segment 偏序"的正交路由：节点在 P1-P4 已分层定位到相邻层通道，每条边抽象成一根超边主干（HyperEdgeSegment），再用"冲突/交叉加权 + 拓扑编号 + 破环/拆段"决定每根主干该占哪条路由槽，从而得到恰好 0 或 2 个 bend 的正交折线。** 它不做全局寻路，而是把"重叠/交叉"当**约束求解**来做。

---

## 1. 前置：ELK Layered = Sugiyama 分层

5 阶段：P1 破环 → P2 分层 → P3 排序 → P4 定位 → **P5 边缘路由**。
**边缘路由只在"相邻两层之间的通道(channel)"里做**。此时节点已分层/排序/定位到固定 x/y、端口固定。输入不是自由 2D 平面，而是一串相邻层对。这和我们 A* 在整张图自由平面寻路有本质差别。

## 2. 算法分发

- `EdgeRouterFactory.create()`（行57-69）：`POLYLINE→PolylineEdgeRouter`；`SPLINES→SplineEdgeRouter`；默认 `ORTHOGONAL→OrthogonalEdgeRouter`。正交是默认。
- `OrthogonalEdgeRouter` = 调度器/编排器：读 spacing 参数（行221-226）；实例化 `OrthogonalRoutingGenerator`（行229-230）；按层对逐调用 `routeEdges`（行257-258）；用返回的 slot 数推算通道宽度；动态叠加中间处理器（属性驱动，行169-214）。
- `OrthogonalRoutingGenerator` = 真正算法本体。
- `PolylineEdgeRouter` = 非正交折线（斜段）。

## 3. 核心数据结构：HyperEdgeSegment（超边主干）

- 代表一条超边沿路由方向的主段（左→右布局里是**垂直主干**），记录两侧端口连接进入/离开的坐标。
- 字段：`routingSlot`（路由槽号）、`startPosition/endPosition`（主段 y 范围）、`incoming/outgoingConnectionCoordinates`、`incoming/outgoingSegmentDependencies`、`splitPartner/splitBy`。
- **不是 visibility graph / 通道图**，而是 hyperedge segment 间**依赖图(DAG)的节点**：每条边/超边一个 segment，segment 间有向依赖表示"谁在左谁在右"，权重=冲突/交叉代价。
- `addPortPositions()`（行123-144）：从端口递归把一个超边所有端口并入同一 segment（**超边合并**）。
- `representsHyperedge()` = 连接数>2；`isDummy()` = 被拆出的假段。

## 4. 算法流程（routeEdges，行159-242）

```
createHyperEdgeSegments(sourceLayer/targetLayer)
→ createDependencyIfNecessary (两两建依赖)
→ breakCriticalCycles (critical 依赖>=2 则拆段)
→ breakNonCriticalCycles
→ topologicalNumbering (分配 routingSlot)
→ 依 slot + edgeSpacing 算 bend 点
```
核心：**把边缘排序问题转成段与段的左右偏序问题，再拓扑编号**。

## 5. 代价/依赖建模（对比 Mermaid 的跨边硬罚）

`createDependencyIfNecessary`（行325-385）对每对超边段比较两种左右摆法的代价：
```java
depValue = CONFLICT_PENALTY*conflicts + CROSSING_PENALTY*crossings;
// CONFLICT_PENALTY=1, CROSSING_PENALTY=16  (行77-79) —— crossing 比 overlap 严重 16 倍
if (depValue1 < depValue2)  createAndAddRegular(he1, he2, depValue2 - depValue1);
```
- `countConflicts`（行397-426）：`conflictThreshold = 0.5 * edgeSpacing`（行72/134）；`criticalConflictThreshold = 0.2 * minHorizontalSegmentDistance`（行74/176）。
- `countCrossings`（行436-446）：统计落在某段 `[start,end]` 关键区间的坐标个数。

## 6. 破环与拓扑编号

- `breakCriticalCycles`（行455-465）：找 critical 环 → `HyperEdgeSegmentSplitter.splitSegments` **拆段绕行**（消除重叠，代价=更多折点）。
- `breakNonCriticalCycles`（行471-483）：权0依赖删除、非0反向。
- `topologicalNumbering`（行493-562）：拓扑排序赋 routingSlot，把只有右向水平段的 target 推到最右（避免回边离目标太远）。

## 7. 贴边 / clearance

明确有参数（`OrthogonalEdgeRouter.java:221-226`）：
```java
SPACING_NODE_NODE_BETWEEN_LAYERS
SPACING_EDGE_EDGE_BETWEEN_LAYERS   // 边-边间隙（路由槽间距）
SPACING_EDGE_NODE_BETWEEN_LAYERS   // 边-节点最小间隙（= 防贴边 clearance）
```
`process()` 用 edgeNodeSpacing 定首条槽起点（行256），`routingWidth=(slots-1)*edgeEdgeSpacing + edgeNodeSpacing*（左右层是否存在）`（行267-280），且 `routingWidth >= nodeNodeSpacing`（行278-280）。

## 8. 避障（不是 A*、不是通用可见图）

分层通道 + hyperedge-segment 偏序：节点已分层定位，边只走层间通道，通道内无自由 2D 障碍。避障靠依赖排序 + critical 破环/拆段；与节点避让靠 spacing 间隙 + 端口侧向约束（P3/P4 前的 `NORTH_SOUTH_PORT_PREPROCESSOR` / `INVERTED_PORT_PROCESSOR` 把北/南端口规约到东/西侧维持正交）。

## 9. 跨分组 / cluster / border

- 把跨分组边建模成**外部/层级端口的 dummy 节点**（`HIERARCHICAL_PORT_*` 处理器，行130-139；含专门的 `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER` 给 border 侧补 bend 点）。
- 触发条件：图含 `GraphProperties.EXTERNAL_PORTS`（行193-195）。
- 分组边界本身是层边界；组内边走组内通道，跨组边规约到边界端口所在相邻通道。

## 10. 折点 / crossing 最少化

- **crossing 最少化：核心**（CROSSING_PENALTY=16 vs CONFLICT_PENALTY=1），两两比较选 crossing 少者。
- **bend 最少化：结构自带**（每边仅一条垂直主干 + 两端水平接线，天然 0 或 2 个 bend；直线不占 slot 不产生 bend，行230-232）。critical 拆段会**牺牲** bend 换无重叠。

## 11. 调研边界

> ⚠️ 未提供源码（据上层逻辑推断，非字面码）：`HyperEdgeSegmentSplitter`、`HyperEdgeSegmentDependency`、`HyperEdgeCycleDetector`、`BaseRoutingDirectionStrategy`/`IRoutingDirectionStrategy`、`SplineEdgeRouter`。涉及拆段/破环/层级端口路由的具体实现为推断。

## 12. 与 LGDL @lgdl/router 的本质区别（一句话）

ELK 不是"自由平面 A* 找避障最短路"，而是"分层把节点固定到层间通道，每条边抽象成一根 hyperedge 主干，用冲突/交叉加权 + 拓扑编号 + 破环/拆段决定该占哪条路由槽，从而得到 0 或 2 个 bend 的正交折线"。

| 维度 | ELK 正交 Layered | LGDL @lgdl/router (A*) |
|---|---|---|
| 本质 | 结构化通道内偏序/排序 + 约束求解 | 自由平面路径搜索/寻路 |
| 避障 | 通道内无自由障碍；依赖排序 + critical 破环/拆段 | 网格绕开障碍方格 |
| 代价 | crossing 最少为核心（×16）、overlap 次之（×1）、bend 结构控制 | 路径最短 + 可含折点惩罚 |
| 场景 | 分层(Sugiyama)布局，节点已排好、只在层间走线 | 任意图，需自由绕行 |
| 贴边 | 全局 spacing（edge-node/edge-edge）+ 端口侧向约束 | 容易贴边 |

**给 LGDL 的启示**：若图可近似分层，可借鉴"通道 + hyperedge-segment 排序"减少贴边/穿越，天然 0/2 折点；但自由布局（多跨组、无明确层次）未必适用，仍须保留 A* 做自由避障，此时把"贴边惩罚、第三方穿越惩罚"叠加进 A* 代价函数。

---

*本报告基于 ELK `master` 分支源码精读；核心源码见 [`code/elk/`](code/elk/)。*
