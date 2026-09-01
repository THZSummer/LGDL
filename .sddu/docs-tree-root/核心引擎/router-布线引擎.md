# 核心引擎 — router 布线引擎深潜

> **文档定位**: sddu-docs-deepdive-router — @lgdl/lgdl-router 包深潜：A* 网格搜索、形状边界锚定、质量度量与降级策略
> **输出文件名**: router-布线引擎.md
> **数据来源**: 代码扫描生成（实读 `packages/lgdl-router/src/index.ts` 870 行 + `router.test.ts` 191 行 + `packages/lgdl-router/package.json`，当日实测测试 8/8 通过）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v2.0（feature/group-as-node @ `d03dca4`，V2 包名更名）
> **更新说明**: 初始创建（批次 2a 几何层引擎深潜之二）；V2 增量更新：包名与路径更名（见 §1）

---

## 1. 包定位：纯几何、零依赖

| 属性 | 值 |
|------|-----|
| **包名** | `@lgdl/lgdl-router`（packages/router/） |
| **版本** | 0.5.0（package.json:3） |
| **定位** | 正交边布线引擎：输入「布局折线 + 两端节点盒/形状 kind + 障碍盒集合」，输出「90° 正交、绕开所有第三方盒子的最终折线」（index.ts:1-10 模块头注释） |
| **运行时依赖** | **`"dependencies": {}`（零依赖，package.json:18 实读确认）**——纯几何，不知 DOM、样式、节点如何绘制（index.ts:4-9） |
| **测试** | 8 条回归测试（router.test.ts），**当日实测 8/8 通过（381ms）** |
| **被谁消费** | 仅 render（render/src/index.ts:10 `import { routeEdge, shapeEdgePoint, routeRectilinear } from '@lgdl/lgdl-router'`） |
| **来源** | commit `203a000`「refactor(render): 把走线抽到独立的 @lgdl/lgdl-router 包」——render/index.ts 1858→1103 行；**main 分支（停在 `de2381e`）无此包** |

**包内文件结构**：

| 文件 | 职责 |
|------|------|
| `src/index.ts` | 全部路由逻辑：routeEdge 主入口 + 形状锚定 + A* + 正交化 + 质量度量 + MinHeap |
| `src/router.test.ts` | 8 条回归测试（node:test） |

**依赖方向约束**（与 layout 的边界）：layout 只出**中心到中心粗折线**；router 把它变成绕障正交折线。layout 不依赖 router（layout/package.json 仅 core）——「布局与走线解耦」（包依赖关系-deps.md:34-35 已述，本档从代码侧确认：layout 输出 4 点折线 `[srcC, midX@srcY, midX@dstY, dstC]`，layout/index.ts:340，正是 router 的输入形态）。

---

## 2. 核心导出清单（实读确认的职责与行号）

| 导出 | 行号 | 职责 |
|------|------|------|
| **`routeEdge`** | index.ts:119-221 | **A\* 主入口**：整体编排——锚点生成（最多 24 组候选）→ 逐组 A* → 质量评分取最优 → 无解降级 |
| **`recentreExit`** | index.ts:40-73 | 出口锚点重居中：按边的**行进方向**（非锚点位置）选出口面；45° 纯分界（`|dy| > |dx|` 判竖直）防对角误判（index.ts:56-61 注释）；锚点沿面滑向源投影（clamp 到面内）避免长贴边段（index.ts:63-67） |
| **`shapeEdgePoint`** | index.ts:233-317 | 形状方程求交锚点：从盒中心向 `p` 的射线与**真实形状轮廓**求交（菱形/胶囊椭圆/圆柱/折角便签/圆角矩形五种 fidelity）；方向先量化到最近 **15° 锚点**（24 个，index.ts:244-248）——与 renderer hover 暴露的锚点集一致（routeEdge 注释 index.ts:138-144；router.test.ts:94-123 测试 6 验证） |
| **`roundedRectPoint`** | index.ts:324-361 | 圆角矩形射线求交：直边 vs 角弧（`&&` 判角区使对角射线落在角弧上——旧 `||` 会把 150° 射线错误地打在底边，index.ts:340-345 注释）；`rxOverride` 供 group 用（index.ts:313-315） |
| **`orthogonalize`** | index.ts:373-416 | 降级正交化：把对角线段强制改 90°；横穿节点的水平段推到**净空通道**（`clearY` 按 14px 步进 ±84px 搜索，index.ts:387-398） |
| **`routeRectilinear`** | index.ts:563-603 | 候选通道法：枚举直连/单折/双折通道（通道 = 中点/端点 ±20~120px 步进 + 障碍盒外 12px，index.ts:570-583），取**净空最大**且不穿障碍的候选；全不通返回 fallback |
| **`pathClearanceInterior`** | index.ts:481-513 | 质量度量①：内部腿到盒墙的**最小净空**（含首腿——首腿沿源自身边缘滑行也是贴边，index.ts:483-488 注释） |
| **`pathHugLength`** | index.ts:523-555 | 质量度量②：沿墙平行且 < 10px（`hugGap`）滑行的**总长度**——区分「贴 25px」与「贴 80px」 |
| **`countCrossingsWithRouted`** | index.ts:462-474 | 质量度量③：与**已布边**的横向穿越真实计数（每次 -1000，不再用 boolean） |
| `pathCrosses` / `segmentCrosses` | index.ts:419-437 | 辅助：折线/线段是否穿过障碍盒 |
| `MinHeap` | index.ts:837-870 | A* 开集：手写二叉最小堆（数值优先级） |

> 注：`recentreExit` 在 index.ts 中**导出但未被 routeEdge 调用**（routeEdge 用 15° 锚点网格 + quality 评分替代重居中——index.ts:138-144 注释明确「hugging 由 clearance 罚分拒绝，而非移动端点出锚点网格」）。实读确认：当前 render 也未 import 它。保留为独立部件（历史遗留导出，候选清理项，见 §8）。

---

## 3. A* 网格搜索算法细节（routeAStar，index.ts:613-747）

### 3.1 网格与障碍集合

- **网格化**：`cell = max(7, floor(clear/2))`，`clear=14` 默认（index.ts:620, 622）；网格尺寸 `gx×gy = ceil(bounds.w/cell)+1 × ceil(bounds.h/cell)+1`（index.ts:623-624）——按画布（layout.width/height）建网格
- **障碍集合 = 第三方盒子 + 自身端点盒子**（index.ts:629-645）：
  - `obstacles`（第三方节点/组盒，render 侧传入，render/index.ts:836-843）→ 阻塞
  - **自身 src/dst 盒子也阻塞**（膨胀 14px）——这是「防贴边」的结构性手段：最短路径最爱沿自身侧墙滑行，不堵死则每个候选都贴边（index.ts:632-636 注释）
- 每个障碍盒按 `clear` 膨胀后整块标记 `blocked`（Uint8Array，index.ts:628, 637-645）

### 3.2 启发函数与代价

- **启发 `hn` = 曼哈顿距离** `|x - dstX| + |y - dstY|`（index.ts:700）——对网格正交路径可采纳
- **移动代价**：`g + 1 + bend + away`（index.ts:723）：
  - `bend = 30`：转向惩罚（`dirIn` 记录进入方向，index.ts:699, 705, 719）——偏好直行，梯级锯齿由 collapseGridPath 后处理消除
  - `away`：往目标反方向的格子每格 +14 小罚（index.ts:721-722）——偏向先接近目标
- 数据结构：手写 MinHeap（index.ts:695, 837-870）+ `Float64Array` gScore + `Int32Array` cameFrom + `Int8Array` dirIn（index.ts:696-699）

### 3.3 绕障策略：锚点走廊（carveCorridor）

自身盒子被膨胀阻塞后，边必须能离开/进入自己的体——在每个锚点**挖一条出向走廊**（index.ts:660-693）：
- 按锚点所在**面**决定外扩轴（左面→向左挖、底角→向下挖，index.ts:675-682）；角（弧）锚点双轴都挖（index.ts:683-690）
- 每条走廊 = 沿轴 `steps = ceil(clear/cell)+2` 格 × 垂直 3 格宽的矩形（index.ts:662-674）——给轴对齐 A* 一条逃生通道
- 该策略使「边能绕开自身被膨胀的盒子」而不破坏防贴边

### 3.4 路径后处理

- **重建**：cameFrom 回溯 + 反转（index.ts:734-738）；终点/起点精确锚到 src/dst（index.ts:744-745）
- **collapseGridPath**（index.ts:754-812）：8 轮折叠——3 点梯级肘（a→p→c）若 L 角两点净空则替换（index.ts:787-810）；`segClear` 对第三方盒严格（膨胀 m=clear 判交，index.ts:763-775），对自身盒只拒绝**真平行贴墙 > 20px**（index.ts:776-782 注释：阈值要低于真实贴边 40px，防止把绕障解折叠回贴墙）
- **collinearCollapse**（index.ts:818-834）：去共线/重复点，只留拐点

### 3.5 无解处理

`routeAStar` 找不到通路返回 null（index.ts:732, 737）→ routeEdge 内该锚点组被跳过（index.ts:212），全部锚点组无解时降级（见 §4）。

---

## 4. 降级路径：A* → orthogonalize 启发式

**实读确认**（index.ts:219-220）：

```ts
// No A* route found — fall back to the orthogonalize heuristic.
return orthogonalize(trimmed, obstacles);
```

**触发条件**：24 组锚点候选全部 A* 无解（或被 `pathHitsOwnBody` 拒绝，index.ts:213）。

**降级行为**：`orthogonalize`（index.ts:373-416）把 layout 原始折线强制 90° 正交（对角段 → 直拐），横穿节点的水平段由 `clearY` 在 ±14~84px 步进里找净空通道。**不保证绕开所有障碍**——仅保证正交 + 尽量避让；这是启发式兜底，质量低于 A* 解。返回原折线 `trimmed`（两端已 snap 到形状边界，index.ts:131-134）。

**触发概率**：低——A* 网格覆盖整个画布，障碍集合有限，通常只在障碍密布/画布边界挤压时无解。

---

## 5. 锚点系统：routeEdge 的 24 组候选生成

`routeEdge` 不把端点定死在单一锚点，而是生成**最多 24 组** src/dst 锚点对，逐组 A* + quality 评分取最优（index.ts:148-216）：

| 组别 | 行号 | 策略 |
|------|------|------|
| 对角参照 ×4 | index.ts:152-155 | 对面中心 / layout 折线局部方向 互指 → 15° 量化 |
| 基本方向 ×8 | index.ts:161-168 | UP/DN/LF/RT（±100000 远点使 15° 量化干净落到 0/90/180/270° 面心锚）——覆盖两盒沿一轴重叠的场景 |
| 混合 ×8 | index.ts:175-182 | 一端面心锚 + 另一端指向对方——消除重叠轴上的贴边（注释 index.ts:169-174） |
| 无节点盒时 ×1 | index.ts:183-185 | 直接取折线两端 |

**质量函数 `quality`**（index.ts:187-206）——选优的评分：

```
ownHit(穿自身节点体)  -1e6      ← 结构性否决级
crossHit(穿第三方盒)  -5e5      ← 结构性否决级
hugPenalty(净空<10px) -1e5      ← 贴边硬罚（结构下限，防 clear 软分被 bends 抵消）
hugLen(贴边长度)      -20/px    ← 区分贴 25px 与贴 80px
crossRouted(穿已布边) -1000/次  ← 真实计数
clear(最小净空)       +min(clear,1000)
bends(拐点数)         -20/个
```

---

## 6. 质量度量如何服务 render（消费链）

**直接消费**：`pathClearanceInterior` / `pathHugLength` / `countCrossingsWithRouted` 均**只在 routeEdge 内部 quality() 被调用**（index.ts:194, 200, 202-204）——render **不直接 import** 三者（render/src 实读：仅 import `routeEdge`/`shapeEdgePoint`/`routeRectilinear`，render/index.ts:10）。

**间接服务方式**（render/index.ts:820-860 实读）：
1. render 逐边调用 `routeEdge`（render/index.ts:850），传入：
   - `points`：layout 的 4 点中心折线（render/index.ts:821）
   - `srcNode/dstNode` + `srcKind/dstKind`：节点盒 + 形状 kind（render 侧按 mode 决定有效 kind，如 mindmap 全按圆角矩形，render/index.ts:827-828）
   - `obstacles: routeBoxes`：**其他节点盒 + 除本边两端所属组外的所有组盒**（render/index.ts:836-843——边允许离开/进入自己的组）
   - `bounds`：layout 画布（render/index.ts:857）
   - `routedSegments: routedEdges`：**已布边折线累积**（render/index.ts:858-860）——`countCrossingsWithRouted` 的输入，逐边路由 = 贪心序，交叉罚分压低后续边对已布边的穿越
2. routeEdge 内部用三个度量选出最优折线返回；render 拿最终折线画 path（`M/L` 指令，render/index.ts:861-863）

**效果**：三个度量是 routeEdge 的「质量开关」，render 通过参数（obstacles/routedSegments）控制其输入，间接获得「不穿障碍、不贴边、少交叉、少拐弯」的最优折线——度量的消费方是 router 内部，受益方是 render 的输出。

---

## 7. 独立成包收益：8 条回归测试独立可跑

**当日实测**：`cd packages/lgdl-router && npm test` → **8/8 通过**（tests 8, pass 8, fail 0, 381ms）。

| # | 测试（router.test.ts 行号） | 覆盖行为 |
|---|------|---------|
| 1 | :5-27 | routeEdge 绕开中间障碍盒、全程 90° 正交、端点精确 |
| 2 | :29-42 | 竖直对齐节点直落中线 |
| 3 | :44-53 | shapeEdgePoint 菱形/圆角矩形边界锚定 |
| 4 | :55-61 | routeRectilinear 避障 |
| 5 | :63-92 | 对角重叠时不沿源自身侧墙滑行（mindmap 部署方案→云部署 案例回归） |
| 6 | :94-123 | 端点落在 24 个 15° 量化锚点（与 renderer hover 锚点集一致） |
| 7 | :125-157 | 目标上方时绕行而非沿目标顶边滑行（login-flow verify→ok 案例回归） |
| 8 | :159-190 | y 重叠时不沿源自身侧墙下滑（uml-class order→payment 案例回归） |

**收益**（对齐 ADR-003，adr-index.md:74-91）：
- 走线行为在**不开渲染器**的情况下可测（8 条测试全部纯几何输入）
- render/index.ts 从 1858 行降到 1103 行（commit `203a000` 统计）
- 测试命令独立：`tsc` 编译测试文件到 dist-test 再 `node --test`（package.json scripts.test）——router 是唯一有独立测试的几何层包（layout 0 条，根级 G4）

---

## 8. 与既有文档一致性 & 新发现的漂移/缺口

**一致项**：
- 系统架构/包依赖关系-deps.md:46 记载「render/index.ts:10 引入 routeEdge」——实读确认 ✓
- 系统架构/docs-overview.md:69-74 router 职责澄清 ——实读确认 ✓（关键导出清单与行号本档已补全）
- ADR-003 证据锚点（零依赖、8 条测试、commit 203a000）——全部实读/实测复验 ✓
- 根级 G1（deploy-pages.yml 不含 router）——未改动，本批不涉及

**新发现（本批记录，未修改任何文件）**：

| # | 位置 | 说明 |
|---|------|------|
| R-D1 | router/src/index.ts:40 `recentreExit` 导出但**无任何调用方**（routeEdge 用 15° 锚点 + quality 替代；render 未 import） | 历史遗留导出：ADR-003 描述「出口面重居中」为其职责，但当前实现路径已演进为锚点网格评分制。候选清理项（导出保留不影响行为，但文档/ADR 描述与实现路径有出入） |
| R-D2 | router/package.json:6 description 与 v0.6 CHANGELOG 规划无冲突，但 `main` 分支无此包 | 已在根级 G3（README 未提 router）+ D4（架构树 5 包）记录；本档从代码侧确认 main 停在 `de2381e` 且无 router 目录 |
| R-D3 | `orthogonalize` 降级路径（index.ts:219-220）不保证完全绕障 | 属设计取舍（启发式兜底）而非缺陷，但在 router.test.ts 中**无降级路径的专项测试**——A* 失败分支无直接回归护栏 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（批次 2a：几何层引擎深潜 · router） | 2026-08-30 | sddu-docs Agent |
