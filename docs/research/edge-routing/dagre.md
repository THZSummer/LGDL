> 📜 历史文档，包名已更名为 @lgdl/lgdl-router（本文档为调研记录，引用旧名 @lgdl/router 属历史上下文）
# 竞品深度调研：dagre 边路由能力

> 所属主题：[edge-routing](../README.md) · 调研日期 2026-08-28 · 只读调研，未改任何代码。
> 核心代码：本目录 [`code/dagre/`](code/dagre/)。

---

## 0. 一句话结论

**dagre 是纯布局引擎（破环→分层→排序→定位），没有独立边缘路由器。** 边不是被"路由"的，而是布局完之后的副产品——两点中心连线再裁到节点矩形边界，不避障、不改道。因此它**给不了 @lgdl/router 任何"防贴边/防穿越"的算法参考**（因为它根本不避障）。

---

## 1. 来源与定位

- 仓库：`dagrejs/dagre` master（`@dagrejs/dagre` v3.1.2-pre），`lib/` 源码。
- 定位：**Directed graph layout for JavaScript**，即 Gansner/dagre 论文的 **layering + ordering + positioning**。
- `lib/` 目录：`acyclic | add-border-segments | coordinate-system | data | debug | graph-lib | greedy-fas | layout | nesting-graph | normalize | order | parent-dummy-chains | position | rank | types | util | version`。
- **没有任何 `route` / `orthogonal` / `edge-router` / `visibility` 文件**。

## 2. 关键证据：管线里没有"边路由器"阶段

`layout.ts` 的 `runLayout` 管线 = `rank`（分层）→ `order`（排序，含 mincross）→ `position`（定坐标），加上处理自环/标签/边界 dummy 的若干步骤：

```
makeSpaceForEdgeLabels → removeSelfEdges → acyclic → nestingGraph.run
→ rank → injectEdgeLabelProxies → removeEmptyRanks → normalizeRanks
→ normalize.run → parentDummyChains → addBorderSegments → order
→ insertSelfEdges → adjustCoordinateSystem → position → positionSelfEdges
→ removeBorderNodes → normalize.undo → assignNodeIntersects → reversePoints
→ acyclic.undo
```
**没有 A*、没有网格、没有避障、没有折线搜索。**

## 3. 边如何生成（证据）

- `layout.ts:397`：`inputLabel.points = layoutLabel.points` —— 边点直接来自分层/排序/定位阶段产物，**不是独立路由算的**。
- `normalize.ts:47`：`edgeLabel.points = []`；`:81`：`origLabel.points.push({x: node.x, y: node.y})` —— **边只是穿过 dummy 节点的折线**（用 dummy 链串起源→目标经过的层），无避障。
- `position/` = Brandes-Köpf 坐标分配（`bk.ts`），只算节点 x/y，不算边。
- `coordinate-system.ts` 只是对 points 做 `reverseY`/`swapXY`（rankdir 变换），无算法。

`assignNodeIntersects`（layout.ts:583-601）：非自环边 = 两点中心连线，首尾用 `util.intersectRect` 裁到节点矩形边界，**不绕行、不避中间节点**。

## 4. 自环与 cluster

- **自环**：硬编码 7 点样条（`insertSelfEdges`/`positionSelfEdges`，layout.ts:667-754），与避障无关。
- **`add-border-segments.ts`**（47 行）：给带 `minRank/maxRank` 的 **cluster（compound）** 每个 rank 造 `_bl`/`_br` 的 **border dummy 节点**（`dummy="border"`），用 `weight:1` 串起来挂到 cluster 名下；随后被 `removeBorderNodes` 用来反推 cluster 的宽高中心并删除。它服务的是 **cluster 边框/尺寸**（compound 边界的虚拟表示），**不是跨组边走线避障**。跨组边仍是"连线+裁剪"，只是视觉上因 border 节点参与 rank/order 而贴住边框穿过。

## 5. clearance / 贴边 / margin

dagre 的 spacing 参数（layout.ts:408-417）：
```ts
const graphNumAttrs = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
const graphDefaults = {ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "TB", rankalign: "center"};
```
- `nodesep`：同层节点间距。
- `ranksep`：相邻层间距。
- `edgesep`：**平行边之间**的分离度（同一对节点间多条边分开的距离），是"边-边间距"，不是"边-节点间距"。
- `marginx/y`：**外页边距**，仅用于 `translateGraph` 把画布整体平移 + 打宽高。
- `makeSpaceForEdgeLabels`：仅为边标签腾地方（`ranksep /= 2`、`edge.minlen *= 2`）。
- **没有**"让边保持与某个非相邻节点 ≥ clearance 距离"的避障概念。它的"贴边/穿越"问题在算法层面根本不存在——因为它不避障。

## 6. 与 @lgdl/router 的关系（一句话）

**dagre 是"排布器"，边是布局副产物**，天然不需要也不做避障。它对标的应该是 @lgdl/layout（布局）而非 @lgdl/router（走线避障）。@lgdl/router 的"贴边/第三方穿越"在 dagre 这里不适用（不避障），所以 dagre 是**对比中的"缺失项"而非"baseline"**——参考价值在 Mermaid 与 ELK。

---

*本报告基于 dagre `master` 分支源码精读；核心源码见 [`code/dagre/`](code/dagre/)。*
