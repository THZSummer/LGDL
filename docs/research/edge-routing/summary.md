> 📜 历史文档，包名已更名为 @lgdl/lgdl-router（本文档为调研记录，引用旧名 @lgdl/router 属历史上下文）
# Edge-Routing 调研总结报告

> 主题：[docs/research/edge-routing/](../edge-routing/) · 调研日期 2026-08-28 · 分支 `feature/group-as-node`
> 竞品：**Mermaid / ELK / dagre / Cytoscape.js**（四库细到代码与算法）· 只读调研，未改任何 router 代码。

---

## 0. TL;DR（先给结论）

1. **真正做"正交避障路由"的只有 Mermaid 与 ELK**。dagre 是纯布局（边=直连+裁剪，不避障）；Cytoscape.js 只有"直角外观"（taxi/segments），无避障路由。
2. **Mermaid 核心 = 管道/轨道（channel）法**（Wybrow/Marriott/Stuckey《Orthogonal Connector Routing》）。最值得借鉴：**防贴边是"结构性硬约束"——所有可走管道线都放在障碍边界 ± margin(15) 处，搜索图里根本不存在贴着节点边框的轨道。**
3. **ELK 核心 = 分层通道 + hyperedge-segment 偏序**（冲突×1 + 交叉×16 + 破环/拆段），得到天然 0/2 折点。
4. **我们 @lgdl/router 现状 = uniform 网格 A\*（cell=6, clear=8）+ 障碍膨胀 + 软 clearance**。差距不在"选型"而是三点：①贴边只软评分；②穿越只一次性 flag；③折点/方向不进 A* 代价。
5. **落地建议（AI 评审结论）**：**不推翻 A\*，在 A\* 框架内增量引入 3 件事**——① `clear 8→14`（防贴边硬下限，最便宜）② `-5e5 flag` 升级为"真实交叉计数 + 布边顺序 + A* cost += 1000×次数"（价值最大）③ A* 加 `bendPenalty`/`dirPenalty` + A* 前直连 L/直线快路径（低成本减折点）。顺序即优先级：**贴边 → 穿越 → 折点**。

---

## 1. 四库能力对比矩阵

| 维度 | **Mermaid** | **ELK** | **dagre** | **Cytoscape.js** |
|---|---|---|---|---|
| 独立边路由器 | ✅ `orthogonalRouter/router.ts`（2283 行） | ✅ `p5edges/OrthogonalEdgeRouter`+`OrthogonalRoutingGenerator` | ❌ 无（布局副产物） | ❌ 无（仅外观） |
| 算法本质 | 管道/轨道通道法 + 管道交点 A\* | 分层通道 + hyperedge-segment 偏序 + 拓扑编号 | 纯布局（rank/order/position） | 无，纯几何 taxi/segments |
| 防贴边 | ✅ 管道线放 `边界 ± margin`（结构性硬约束） | ✅ `SPACING_EDGE_NODE_BETWEEN_LAYERS` 间隙 + 端口侧向约束 | ❌ 无 | ❌ 无（会直穿） |
| 防穿越 | ✅ crossing 硬罚(+1000/次) + 布边顺序 | ✅ 交叉权 ×16 + 破环/拆段 | ❌ 不避障 | ❌ 不避障 |
| 减折点 | ✅ dirPenalty + bendPenalty + 直线快路径 | ✅ 结构自带 0/2 折点 | ❌ | 🟡 最多 2 转折（L/Z） |
| 跨分组/泳道 | lane 只影响布边顺序（group 不作障碍） | cluster 边=dummy 节点（外部/层级端口） | cluster=border dummy 节点 | compound 节点（布局层面） |
| layout 耦合 | 泳道 Sugiyama（pipeline.ts） | 分层 Sugiyama（P1-P4） | 分层 Sugiyama | 布局可插拔 |
| 依赖库 | 自研 | 自研 | 自研 | 核心零依赖 |
| 成熟度 | 活跃 develop | 成熟（学术/工业） | 经典但边缘路由缺失 | 活跃 |

**定位一句话**：dagre / Cytoscape.js 都不做避障，**给不了"防贴边"参考**；真正可比的是 **Mermaid（通道+显式 margin）与 ELK（通道+偏序排序）**，两者思路不同、互为补充。

---

## 2. 各库一句话结论（链接到深度报告）

| 竞品 | 一句话 | 报告 |
|---|---|---|
| Mermaid | 管道/轨道通道法：所有走线被硬性约束在`障碍边界±15`的安全距离轨道上，搜索图上无贴边轨道；A\* 目标含 crossing(+1000)/反向(+50~100)/折点(+50)。 | [mermaid.md](mermaid.md) |
| ELK | 分层通道+hyperedge-segment 偏序：边被抽象成主干，用冲突×1/交叉×16+破环/拆段决定每条边占哪条槽，天然 0/2 折点。 | [elk.md](elk.md) |
| dagre | 纯布局引擎，无独立边路由器；边=两点直连+裁到节点矩形，不避障。 | [dagre.md](dagre.md) |
| Cytoscape.js | 核心无内置路由/不依赖 edgehandles；`taxi/segments` 只是按端点算的直角外观，会直穿。 | [cytoscape.md](cytoscape.md) |
| @lgdl/router | 现状对照基准：uniform 网格 A\*（cell=6, clear=8）+ 软 clearance。 | [lgdl-router-current.md](lgdl-router-current.md) |

---

## 3. 关键机制详解（跨库对比）

### 3.1 防贴边：结构性硬约束 vs 软评分
- **Mermaid**（结构性硬约束，`router.ts:1102-1111`）：
  ```js
  // Do NOT create pipes at exact boundaries - that allows edges to hug nodes
  getOrAddPipe('horizontal', obs.minY - hMargin, ...); // hMargin=15
  getOrAddPipe('vertical',   obs.minX - vMargin, ...); // vMargin=15
  ```
  搜索图里**不存在贴着障碍边界的坐标线**，边物理上无贴边轨道可选。
- **ELK**（间隙参数，`OrthogonalEdgeRouter.java:221-226`）：`SPACING_EDGE_NODE_BETWEEN_LAYERS`（边-节点间隙）+ `SPACING_EDGE_EDGE_BETWEEN_LAYERS`（边-边间隙），由 spacing 推算通道宽度。
- **@lgdl/router**（软评分）：`clear=8` 膨胀 + `min(clearance,1000)` 评分，被 `-bends` 抵消，被逼到墙边时若唯一/最优解仍会被选。
- **结论**：Mermaid 的"结构性硬约束"最可靠。但**轻量改法**即可接近它：把 `clear 8→14`（cell 跟随变大），并在 `quality()` 加"贴边硬罚"（`clearance<10 则 -1e5`）作安全网。**不必上整套管道体系。**

### 3.2 防穿越：真实计数 vs flag
- **Mermaid**（`crossingPenalty`，router.ts:276-327/332-368）：每穿一条已布边 +1000（`CROSSING_PENALTY`），且**向后看** `allRoutedSegments`（只对已布段）；配布边顺序（跨泳道先布、短边先布）。
- **ELK**（`createDependencyIfNecessary`，行325-385）：`冲突×1 + 交叉×16` 比较两两摆法，破环/拆段。**依赖相邻层通道 slot**，与我们"自由平面、边不预知层级"冲突，不能直接落地。
- **@lgdl/router**（`-5e5 flag`，行141）：穿 0 次与穿 5 次等价，A\* 内部无穿越代价。**太粗糙**。
- **结论**：升级为"模块级 `routedSegments` 注册表 + 确定性布边顺序 + A\* `cost += 1000×穿越次数`，`quality` 改真实计数"。惩罚量级排序：`ownHit(1e6) > dirPenalty(数千) > crossing(1000/次) > bend(50~100) > clearance`。

### 3.3 减折点
- **ELK** 0/2 折点是通道结构红利，**复制不了**（需层间通道契约）。
- **Mermaid**：`bendPenalty(+50)` + `dirPenalty`（反向强罚）+ A\* 前直连 L/直线快路径（Kandinsky）。可直接照搬。
- **@lgdl/router**：`bends=(len-2)*20` 仅作锚点候选 tiebreaker；**折点真正的来源在搜索层惩罚**。

---

## 4. 落地建议（AI 算法评审结论）

> 评审详见下方"第 6 节 AI 评审"。核心：**不推翻 A\*（中-大改），不引入 ELK 超边段通道（大改、契约冲突），在 A\* 框架内增量叠加**。

### 4.1 优先级排序（贴边 → 穿越 → 折点）

| 优先级 | 改动 | 成本 | 收益 |
|---|---|---|---|
| ① | **`clear 8→14`**（cell 跟随变大）+ `quality` 贴边硬罚（`clearance<10 → -1e5`） | 一行 + 一处评分，**最低** | 根治贴边（结构性下限） |
| ② | **`-5e5 flag` 升级**：`routedSegments` 注册表 + 确定性布边顺序（跨泳道先布、短边先）+ A\* `cost += 1000×穿越次数` | 中等 | **价值最大**（治穿越） |
| ③ | A\* 加 `bendPenalty(+50)` + `dirPenalty` + A\* 前直连 L/直线快路径 | 低 | 减折点 |

### 4.2 不建议（现阶段）
- **全面换成 Mermaid 管道/轨道通道法**：中-大改，但收益主要靠"结构性防贴边"，可用 ① 的轻量改法逼近，没必要强上。
- **引入 ELK 超边段/层间通道法**：大改，且依赖层间通道 slot，与"自由平面、有 group、边不预知层级"的契约冲突。

### 4.3 为什么能增量落地（我们已有的结构基础）
- `layoutLayered`（自研 Sugiyama）+ `RANK_SEP=96` + `layoutGrouped`（group 作 super-node 分层）——**有"层"结构**，为将来若真走通道法铺路。
- A\* 已内置，`routeEdge`/`quality`/`routeAStar` 都在 `packages/router/src/index.ts`，**可在原框架内加惩罚项与 margin 通道，无需重写**。
- 落地时注意惩罚量级：`ownHit(1e6) > dirPenalty(数千) > crossing(1000/次) > bend(50~100) > clearance`，否则会被其他项吞掉。

---

## 6. AI 算法评审结论（独立视角）

> 由独立算法评审子代理（只读源码，不预设立场）给出，作为对第 4 节落地建议的交叉印证。

### 6.1 算法骨架对比（定基调）

| | Mermaid | ELK(orthogonal) | 我们 @lgdl/router |
|---|---|---|---|
| 底层模型 | 障碍±margin(15) 生成 **pipe 管道网格线**，A* 只走管道交叉点 | **超边段竖直主干** + 层间 **slot 通道** | 整图自由平面 uniform 网格 A*（`cell=6, clear=8`） |
| 防穿越 | 布边顺序(跨泳道先、短边先) + `crossingPenalty=1000/次` | `createDependencyIfNecessary`(冲突×1+交叉×16) + 破环/拆段 | 一次性 `-5e5` boolean flag |
| 防贴边 | **结构性**：搜索图无贴边坐标 | 天然 slot 隔离 | 膨胀 blocked cell + 软 `min(clear,1000)` |
| 折点 | dirPenalty + bendPenalty(+50) + 直连L/Kandinsky 直线快路径 | 结构自带 0/2 折点 | `bends=(len-2)*20`（不进 A*） |

### 6.2 三点核心差距
我们与竞品的差距**不在选型**，而在三点：
1. **贴边只做软评分**（`min(clearance,1000)` 权重远小于 -5e5/-1e6，只是弱 tiebreaker，A* 会被 Manhattan 最短 + 6px 栅格拖成贴边）。
2. **穿越只做一次性 boolean flag**（穿 0 次与穿 5 次等价，A* 内部无穿越代价）。
3. **折点/方向不进入 A\* 代价**（`bends=(len-2)*20` 仅作锚点候选 tiebreaker）。

### 6.3 三条改动建议（按优先级）
> **① `clear` 8→14（先做，根治贴边硬下限，最便宜）；② `-5e5` flag 升级为"全局已布段注册表 + 确定性布边顺序 + A* `+=1000×穿越次数`"（价值最大，治穿越）；③ A* 加 `bendPenalty`/`dirPenalty` + A* 前直连 L/直线快路径（低成本减折点）。**

- **防贴边**：Mermaid 结构性硬约束更可靠；更轻改法 = `clear 8→14`（`cell=max(6,floor(clear/2))` 自动跟随）+ `quality()` 加贴边硬罚（`clearance<10 则 -1e5`）作安全网。**不必上 Mermaid 管道体系。**
- **防穿越**：Mermaid 的 `crossingPenalty=1000×次数`（向后看 `allRoutedSegments`）可直接借鉴——模块级注册表 + 确定性布边顺序 + A\* cost 计次。ELK 方案依赖层间通道 slot，与我们"自由平面、有 group、边不预知层级"冲突，**不建议现在落地**。
- **减折点**：ELK 的 0/2 折点是通道结构红利，复制不了；照搬 Mermaid 三招（bendPenalty + dirPenalty + 直连 L/直线快路径）。`quality` 的 `bends` 留作锚点候选 tiebreaker，但真正减折点在搜索层惩罚。

### 6.4 成本/风险判断
- 换 Mermaid 管道法（中-大改）、换 ELK 超边段通道法（大改、需层间通道、与自由平面契约冲突）——**现阶段都不值得**。
- **推荐增量**：A* 框架内叠加 margin 通道 + 真实交叉计数 + 方向/折点惩罚 + 直连快路径。爆炸半径小、收益大、不破坏对外契约。

### 6.5 依据（源码位置）
- Mermaid：`crossingPenalty` 276-327、排序 332-368、管道线 1096-1112(margin15)、track 分配 2070-2120、dirPenalty 1272-1288、bendPenalty 1292-1298、直连L 1157-1189、Kandinsky 937-+。
- ELK：权重 77-79(CONFLICT=1, CROSSING=16)、`createDependencyIfNecessary` 325-385、破环 455-483、拓扑编号 493-562。
- 我们：`routeEdge` 109-163、`quality` 139-148、`routeAStar` 464-543(clear=8 cell=6)、`pathCrosses` 370-373(boolean)、`pathClearanceInterior` 380-406。

---

## 5. 附：参考常量汇总

| 常量 | 值 | 出处 |
|---|---|---|
| HORIZONTAL/VERTICAL_PIPE_MARGIN | 15 | Mermaid |
| ROUTING_MARGIN | 25 | Mermaid |
| TRACK_SPACING | 10 | Mermaid |
| MIN/MAX_PORT_SPACING | 8 / 20 | Mermaid |
| CROSSING_PENALTY | 1000（每次交叉） | Mermaid |
| bendPenalty | 50（每次转向） | Mermaid |
| dirPenalty | moveDy*100 / moveDx*50 | Mermaid |
| CONFLICT_PENALTY | 1 | ELK |
| CROSSING_PENALTY | 16 | ELK |
| SPACING_EDGE_NODE / EDGE_EDGE | 层间边-节点/边-边间隙 | ELK |
| clear（当前） | 8 | @lgdl/router |
| cell（当前） | 6 | @lgdl/router |
| RANK_SEP | 96（布局层间距） | @lgdl/layout |

---

*本总结报告汇总自四个竞品深度报告（mermaid.md / elk.md / dagre.md / cytoscape.md）及对照基准（lgdl-router-current.md）。核心源码见 [`code/`](code/)。*
