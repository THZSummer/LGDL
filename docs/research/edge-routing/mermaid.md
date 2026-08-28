# 竞品深度调研：Mermaid 正交边路由

> 所属主题：[edge-routing](../README.md) · 调研日期 2026-08-28 · 只读调研，未改任何代码。
> 核心代码：本目录 [`code/mermaid/`](code/mermaid/)。

---

## 0. 一句话结论

**Mermaid 是"管道/轨道（channel）法"正交路由：先在障碍块边界 ± 固定 margin 处确定一组可走管道线，再只在管道交点（可见图）上做 A\*，边被结构性约束在安全距离的轨道上。** 它防贴边靠的是**硬件约束**（搜索图里根本没有贴着节点边框的轨道），而不是我们 A\* 网格那种"膨胀 blocked cell + 软 clearance 评分"。

---

## 1. 来源与命名

- 文件：`packages/mermaid/src/rendering-util/layout-algorithms/swimlanes/orthogonalRouter/router.ts`（88KB，2283 行）
- 注释自述（router.ts:4-12）：遵循 **Wybrow, Marriott & Stuckey《Orthogonal Connector Routing》(libavoid 家族)**；实现内部代号 **"Raykov"**。
- 应用场景：泳道（swimlanes）布局。泳道本体（X/Y 拓扑）由 `pipeline.ts` 的 Sugiyama 布局先行决定（`assignLayers_LaneAwareCompact` / `orderLayers` / `assignCoordinates`）。

## 2. 关键常量（全是带 margin 的"防贴边设计语言"）

| 常量 | 值 | 用途 |
|---|---|---|
| `NODE_PADDING` | 8 | 障碍矩形膨胀 |
| `HORIZONTAL_PIPE_MARGIN` | 15 | 水平管道线离障碍上/下边界偏移 |
| `VERTICAL_PIPE_MARGIN` | 15 | 垂直管道线离障碍左/右边界偏移 |
| `ROUTING_MARGIN` | 25 | 包围盒扩张 |
| `ANCHOR_OFFSET` | 20 | 端口锚点延长段 |
| `TRACK_SPACING` | 10 | 同一管道内并行轨道间距 |
| `MIN_PORT_SPACING` | 8 | 端口分布夹紧下限 |
| `MAX_PORT_SPACING` | 20 | 端口分布上限（避免绕远） |
| `CROSSING_PENALTY` | 1000 | 每穿一条已布边 |

## 3. 数据建模：pipe（管道）/ track（轨道）

```ts
interface Pipe   { id; orientation:'horizontal'|'vertical'; coord; spanMin; spanMax; tracks:Track[] }
interface Track  { index; coord; segments:SegmentRef[] }
interface SegmentRef { edgeIndex; segmentIndex; from; to }
```

- `Pipe` 是"一条绝对坐标的直线通道"，`coord` 即它的 x（纵向）/y（横向）位置。
- `Track` 是同一管道内并行的"跑道"，多边可走不同 track。
- `getOrAddPipe` 按 `(orientation, coord)` 复用同一根 pipe 并扩展 span。

**核心思想**：搜索图**不是 uniform 网格**，而是"管道网格"——路由只能发生在管道的交点上（router.ts:1126 注释 "Vertices: All intersections of hPipes and vPipes"）。A\* 邻居只在**同一条管道上移动**（沿线走到相邻管道），同一管道允许 `TRACK_SPACING` 并行轨道。

## 4. 防贴边（最核心的机制）

`router.ts:1102-1111` 建立管道线时：

```js
// Add horizontal pipes around obstacle - ONLY at safe zone positions (with margins)
// Do NOT create pipes at exact boundaries - that allows edges to hug nodes
const hMargin = HORIZONTAL_PIPE_MARGIN;    // 15
getOrAddPipe('horizontal', obs.minY - hMargin, bbMinX, bbMaxX); // Above obstacle
getOrAddPipe('horizontal', obs.maxY + hMargin, bbMinX, bbMaxX); // Below obstacle
const vMargin = VERTICAL_PIPE_MARGIN;      // 15
getOrAddPipe('vertical',   obs.minX - vMargin, bbMinY, bbMaxY); // Left of obstacle
getOrAddPipe('vertical',   obs.maxX + vMargin, bbMinY, bbMaxY); // Right of obstacle
```

**根因/洞察**：搜索图里**不存在贴着障碍边界的坐标线**——所有可走管道都在 `边界 ± margin` 处。因此边**物理上不可能贴到节点/分组边框**，它没有那条"贴边轨道"可选。注释点明 *"Do NOT create pipes at exact boundaries - that allows edges to hug nodes"*。

> **与我们的本质区别**：这是 `结构性硬约束`；我们 `uniform 网格 cell=6 + 障碍 clear=8 膨胀 + 软 clearance 评分` 是 `评分性软约束`。Mermaid 靠"没有那条轨道"，我们靠"那条轨道代价高"——前者彻底，后者在障碍多/桥接时仍可能选到贴边解。

辅助机制：
- `NODE_PADDING=8` 预先膨胀障碍矩形；`obstacleDetour` 的绕行点也带 `PIPE_MARGIN`（829-842）。
- `ROUTING_MARGIN=25` 扩张包围盒（1089-1092），保证绕行空间。
- 端口分布（`MIN/MAX_PORT_SPACING`）把同侧多条边沿节点面均匀分布，避免在节点边界打结。
- `ANCHOR_OFFSET=20` + handle waypoints：源/目标锚点陷入障碍时插入带 margin 的绕行点（855-935）。

## 5. 防穿越（三层配合）

1. **布边顺序**（`routingOrder`，346-368）：跨泳道(`crossLane`)的边**先布**（先占直行通路，避免被 lane 内边堵死）→ 短边先布 → id tiebreak。
   论文依据注释：Walk on the Wild Side (LIPIcs.GD.2025.35)；"crossing penalty 只对已布边有效"。
2. **A\* 目标函数**（1300 行）：
   ```js
   const stepCost = dist + penalty + dirPenalty + bendPenalty;
   // penalty    = crossingPenalty(): 每穿一条已布边 +1000 (向后看, 只对已布段)
   // dirPenalty = 纵向反走 |moveDy|*100, 横向反走 |moveDx|*50 (防 A* 为躲 crossing 绕向反方向)
   // bendPenalty = 每转向 +50
   ```
   `crossingPenalty`（278-327）**向后看**统计 `allRoutedSegments` 里已布好的异向段。
3. **Phase 2 轨道级去交叉交换**（1614-2004）：`fixSourceHandleCrossings` / `fixTargetHandleCrossings` / `fixPipeCrossings`，在管道间换道/新建轨道，循环至多 `MAX_ITER=10` 次直到无冲突。

## 6. 减折点

- **直线快路径（Kandinsky 中心直线不变量）**（937-1061）：两端锚点共轴（`anchorsSameX||anchorsSameY`）、无障碍、端口面未被争抢时，直接输出 4 点（port→anchor→anchor→port），后处理折叠成 2 点，避免为"对齐的直边"硬造折点。
- `bendPenalty=50` 每转向一次，偏好折点少。
- 路径简化（`trySimplifyWithDetourX`，1464-1492）：把 A\* 长路径压成 U 形 detour（3-4 折点），用 `findBestReturnY` 让水平回程段贴着障碍边缘 + margin 走（"hugs obstacles instead of going all the way to destination"）。

## 7. 跨分组 / 泳道

- **lane 不作为路由障碍**：障碍集合**过滤掉 `isGroup`**（router.ts:195 `!n.isGroup`）。lane 只影响布边顺序（`crossLane` 优先，339-359）。
- 跨组边走"先布"优先拿到直行路径；lane 内部空白区允许穿越（只避开 lane 内内容节点）。
- 真正"边穿过泳道标题带"由 `postProcessing.ts` 的 `liftTopLaneTitleBandsAboveRails` / `shiftLeftLaneTitleBandsLeftOfRails` 把标题带抬到/移到轨道之外。

> ⚠️ **与我们不同**：我们把 group 框当**障碍**（`render/src/index.ts:818`）；Mermaid 把 group 当**布边顺序因素**。两者权衡不同，值得讨论（见 summary 落地建议）。

## 8. 后处理（postProcessing.ts）

方向变换 → `simplifyPolyline`（折叠共线）→ detour 简化 / 兄弟共面拉直 / portSwap→L型 / label 锚定 / endpointClip → `nudgeSharedInteriorSubpaths` → terminal-lane 拆分 → 去冗余 dogleg → 抬升贴边同侧 rail → 终点双换位降 crossing → `finalizeRenderedEdges`（`resolveRenderedOrthogonalCrossings` / `reassignExternalRailChannels` / `shortcutRedundantOrthogonalJogs`）→ 再 nudge、finalize → lane 标题带抬升。

## 9. 验证机制（最值得借鉴的一环）

- `validateLayout(layout)` 返回 `{ok, breakdown}`，`breakdown.crossings` 必须为 0。
- `15-border-hugging-compare` / `15-border-hugging-lr` 测试：加载 fixture（DDLT 描述），断言 `crossings===0` 且某边 `points.length<=6`。
- **Mermaid 用 fixture + 自动 cross/图校验做回归，而非人眼看图**。这正是我们缺的"可断言的走线质量判据"（我们目前靠肉眼截图审查）。

> ⚠️ 局限：`validateLayout.js` 与 `postProcessing.ts` 依赖的 `direction/*`（`nudgeSharedInteriorSubpaths` / `resolveRenderedOrthogonalCrossings` 等）实现文件不在本调研工作区，上表基于调用序推断其机制，非逐行源码核验。

## 10. 与 LGDL @lgdl/router 的本质区别（一句话）

Mermaid 是**管道/轨道（通道）法**：先在「障碍块边界 ± 固定 margin」处确定一组可走管道网格，再在**这些管道交点**上做 A*（可见图思想），目标函数含 crossing(+1000)/反向(+50~100)/折点(+50)；边被硬性约束在安全距离的轨道上，因此天然不贴边、且全局更少交叉。我们目前是 **uniform 网格 + 膨胀 blocked cell**，缺"按 margin 摆放的通道"与"反向/交叉硬罚"。

---

*本报告基于 mermaid `develop` 分支源码精读；核心源码见 [`code/mermaid/`](code/mermaid/)。*
