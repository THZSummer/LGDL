> 📜 历史文档，包名已更名为 @lgdl/lgdl-router（本文档为调研记录，引用旧名 @lgdl/router 属历史上下文）
# 对照基准：LGDL @lgdl/router 当前实现

> 所属主题：[edge-routing](../README.md) · 调研日期 2026-08-28 · 现状描述（未改任何代码）。
> 源码：`packages/router/src/index.ts`（660 行）· `packages/render/src/index.ts`（调用方）。

---

## 0. 一句话现状

**@lgdl/router 用 uniform 网格 A\* 做整图自由平面正交路由**（`clear=8px` 障碍膨胀、`cell=max(6,floor(clear/2))=6`），用 `quality()` 打分选最优路径。与竞品（Mermaid 管道/轨道、ELK 通道偏序）相比：**缺"按 margin 摆放的通道"硬约束，crossing 只是 flag 不与已布边逐段计数，无方向/折点硬罚。**

---

## 1. 调用链（render → router）

`packages/render/src/index.ts:827` 调用：
```ts
const ortho = routeEdge({
  points: pts,                                 // layout 中心线
  srcNode: srcNode, dstNode: dstNode,          // 端点节点盒
  srcKind, dstKind,                            // 端点形状 kind
  obstacles: routeBoxes,                       // 障碍
  bounds: { w: layout.width, h: layout.height } // 整图 bounds
});
```

`routeBoxes`（813-820）= **第三方节点框 + 非所属 group 框**，排除边自身端点及其所属 group：
```ts
const routeBoxes = [
  ...layout.nodes
    .filter((n) => n.id !== edge.from && n.id !== edge.to)
    .map((n) => ({ x: n.x, y: n.y, w: n.width, h: n.height })),
  ...[...boxOf.entries()]
    .filter(([gid]) => !(groupsOwning(edge.from)?.has(gid) || groupsOwning(edge.to)?.has(gid)))
    .map(([, b]) => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
];
```
> **注意**：我们把 group 框当作**障碍**；Mermaid 把 group 作为**布边顺序因素**（障碍过滤掉 `isGroup`）。这是两者本质差异之一（见 summary 落地建议）。

## 2. 关键参数

| 参数 | 值 | 说明 |
|---|---|---|
| `clear` | 8 px | 障碍膨胀量（`routeAStar` 默认 clear=8，行 471） |
| `cell` | `max(6, floor(clear/2))`=6 | uniform 网格单元 |
| `bends` | `(len-2)*20` | 折点惩罚（行 142） |
| `crossHit` | `pathCrosses ? -5e5 : 0` | 是否穿障碍的 flag（行 141） |
| `ownHit` | `pathHitsOwnBody ? -1e6 : 0` | 是否穿自身端点（行 140） |
| `clearance` | `min(pathClearanceInterior,1000)` | 到墙的最小间距（软评分，行 146） |

## 3. A* 网格细节

- `routeAStar`（464-543）：uniform grid，`gx=floor(bounds.w/cell)+1`，把障碍格子按 `clear=8` 膨胀标记为 blocked（479-492），ownBox（自身端点）不 block（480-482）。
- 端点 cell 强制 unblock（498-500）；`collapseGridPath`（550-602）把阶梯折线折叠成 L 角。
- 反复尝试 4 组 src/dst 锚点对（130-135），保留质量最高者；失败回退 `orthogonalize` 启发式（162）。

## 4. 缺陷根因（对照竞品）

1. **贴边**：uniform 网格线等距，边可能落在"障碍-8/-12"等距位；且 clearance 是软评分被 `-bends` 抵消，被逼到墙边时若唯一/最优解仍会被选。Mermaid 用"管道线只放 `边界±15`"，搜索图里根本没有贴边轨道。
2. **穿越**：crossing 只是 `-5e5` flag，**不与"已布边"逐段计数** → 贪心短路径易穿过旁支边汇流区。Mermaid 的 `crossingPenalty` 对每条已布边 +1000。
3. **折点偏多**：`bends=(len-2)*20` 无方向/交叉硬罚，A* 可能为躲穿越绕向反方向。Mermaid 有 `dirPenalty`+`bendPenalty`+直线快路径。
4. **无分层利用**：layout 已有 `layoutLayered`（Sugiyama）+ `RANK_SEP=96` + `layoutGrouped`（group 作 super-node 分层），但 `routeEdge` 在整图自由平面跑 A*，**未利用层间通道结构**（对应 ELK 通道、mermaid 泳道）。

## 5. 已具备的结构基础（落地空间）

- `layoutLayered`（自研 Sugiyama）：`packages/layout/src/layered.js`。
- `RANK_SEP=96`：层间垂直间距，留给走线的空间大。
- `layoutGrouped`：把 group 作为 super-node 分层，节点已按层组织。
- A* 已内置，可**增量**加入：通道 margin 摆放、crossing 真实计数、方向/折点惩罚、直线快路径，而**不必推翻重写**。

---

*本报告为 @lgdl/router 现状的对照基准，供 summary 的落地建议引述。未改任何代码。*
