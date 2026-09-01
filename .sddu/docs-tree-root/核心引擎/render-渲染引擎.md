# 核心引擎 — render 渲染引擎深潜

> **文档定位**: sddu-docs-deepdive-render — @lgdl/lgdl-render 包深潜：SVG/ASCII 双渲染器、形状映射与 15° 锚点系统、标签避让、data-lgdl-loc 源映射、router 消费链
> **输出文件名**: render-渲染引擎.md
> **数据来源**: 代码扫描生成（实读 `packages/lgdl-render/src/index.ts` 1162 行 + `ascii.ts` 805 行 + `svg.test.ts`/`ascii.test.ts` + `packages/lgdl-render/package.json`，当日实测测试 21/21 通过）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v2.0（feature/group-as-node @ `d03dca4`，V2 包名更名）
> **更新说明**: 初始创建（批次 2b 呈现层引擎深潜；承接批次 2a 遗留核实 L-D1/R-D1 全仓定论）；V2 增量更新：包名与路径更名（见 §1）

---

## 1. 包定位：SVG/ASCII 双渲染器、纯函数

| 属性 | 值 |
|------|-----|
| **包名** | `@lgdl/lgdl-render`（packages/render/） |
| **版本** | 0.5.0（package.json:3） |
| **定位** | 把「布局坐标 + 语义文档」渲染为 SVG / ASCII 字符串（package.json:4 description）——**纯函数**：`renderSvg(doc, layout)` / `renderAscii(doc, layout)`，无副作用、无 DOM 依赖 |
| **运行时依赖** | **core + layout + router 三包**（package.json:19-23）——消费 core 的语义模型、layout 的坐标、router 的走线 |
| **测试** | svg.test.ts（7 条）+ ascii.test.ts（14 条），**当日实测 21/21 通过（396ms）** |
| **被谁消费** | **cli**（commands/render.ts:7 `import { renderSvg, renderAscii }`）与 **web**（App.tsx:13 `import { renderSvg }`） |

**包内文件结构**：

| 文件 | 职责 | 规模 |
|------|------|------|
| `src/index.ts` | SVG 渲染器：renderSvg 主入口 + 形状库 + 标签避让 + 走线编排 + 各图型专属渲染 | 1162 行 |
| `src/ascii.ts` | ASCII 渲染器：renderAscii（网格字符画，自有 rank 布局） | 805 行 |
| `src/svg.test.ts` / `src/ascii.test.ts` | 21 条回归测试 | 221+260 行 |

**编排边界（重要澄清）**：`layoutDocument`（布局编排）**不在 render 内**——render 只消费 `LayoutResult`。完整编排链在消费方：

```
web App.tsx:546-547    const layout = await layoutDocument(doc); const svg = renderSvg(doc, layout);
cli render.ts:29,52    const layout = await layoutDocument(doc); 然后 renderSvg / renderAscii
```

render 与 layout 的接口契约：`LayoutResult { nodes[], edges[], width, height }`（layout/index.ts:19-38），render 按 node.id 与 doc.nodes 对位（index.ts:607-609），边缘点取 layout.edges 的折线或 `routeDefault` 兜底（index.ts:821）。

---

## 2. 核心导出：renderSvg dispatch + renderAscii

**`renderSvg(doc, layout)`**（index.ts:339-360）——按 `doc.type` dispatch 到四个渲染器：

| 类型分支 | 渲染器 | 位置 |
|---------|--------|------|
| sequence | `renderSequence`（生命线/激活条/消息箭头） | index.ts:363-432 |
| gantt | `renderGantt`（时间轴/任务条/依赖/里程碑） | index.ts:1015-1161 |
| uml-class / datastream / er / mindmap / state | `renderGeneral(doc, layout, mode)` | index.ts:435-932 |
| flowchart / arch / default | `renderGeneral(doc, layout, 'default')` | index.ts:355-358 |

**`renderAscii(doc, layout)`**（ascii.ts:165-472）——**注意：`void layout`（ascii.ts:166）**：ASCII 渲染**忽略布局坐标**，用自己的 BFS rank 网格布局（ascii.ts:172-197）独立排布。cli render.ts:29 显式注释「ascii ignores layout pixels; rank layout is internal」——两个渲染器的几何输入源不同（见 §9 R-D3）。

---

## 3. 形状映射与锚点系统

### 3.1 形状映射（kind → SVG 形状，SHAPES 表 index.ts:56-126）

| kind | 形状 | 实现 | 位置 |
|------|------|------|------|
| start / end | 胶囊（圆角矩形 rx=w/2） | `rect(x,y,w,h,w/2)` | index.ts:58-73 |
| process | 圆角矩形 rx=6 | `rect(...,6)` | index.ts:75-82 |
| decision | 菱形 | `<polygon>` 四顶点 | index.ts:84-104 |
| entity | 圆柱（椭圆顶/底） | `<path>` 两弧 + 直边；**sweep=0** 注释（106-107：sweep=1 会把顶边画没） | index.ts:108-116 |
| note | 折角便签 | `<path>` 右上 12px 折角 | index.ts:118-126 |

**颜色映射**：`FILL_BY_KIND` / `STROKE_BY_KIND`（index.ts:148-164）；分组盒底色按嵌套深度循环 `GROUP_FILLS`（index.ts:168, 580）；mindmap 分支色板 `MIND_COLORS/MIND_FILLS`（index.ts:171-172）+ BFS 深度/分支计算 `computeMindmapInfo`（index.ts:179-214）。

**模式覆盖形状**（index.ts:446-447 `shapeKindFor` + 623）：mindmap 与 uml-class 模式**所有节点按圆角矩形渲染**（思维导图无菱形/胶囊概念——注释 619-622：用分支色 + 字号层级表达结构，index.ts:627-637）；er 模式 entity 把 members 行拼进 label 显示（index.ts:642-650）；uml-class 走 `renderClassNode` 卡片（index.ts:945-1003：头 32px + 属性/方法分区行 18px/行，可见性符号来自 core `VIS_SYMBOL`，index.ts:955）。

### 3.2 15° 锚点量化（24 锚点，与 router 形状方程求交）

**锚点生成**（hover 锚点 + 聚合边锚点统一用 `shapeEdgePoint`）：

```ts
for (let k = 0; k < 24; k++) {
  const th = (k * Math.PI) / 12;                          // 24 × 15° 方向
  const ap = shapeEdgePoint(shapeKind, node, {            // router 形状方程求交
    x: cx + Math.cos(th), y: cy + Math.sin(th),
  });
  ...
}
// index.ts:661-669（节点）；index.ts:533-537（分组盒，rx=8 传给 shapeEdgePoint）
```

- 方向量化到最近 15°（24 个）→ 调 router `shapeEdgePoint` 与**真实形状轮廓**求交——与 router 文档 §2 的 15° 锚点集（router/src/index.ts:244-248）完全一致，hover 露出的锚点圆点与边线端点精确重合（注释 index.ts:655-658「dots sit exactly under the line endpoints」）
- 分组盒用 `shapeEdgePoint('process', box, dir, 8)` 带 rxOverride=8（index.ts:535-538, 717-718）——圆角求交（router `roundedRectPoint` 的 rxOverride 通道）
- 悬停显示：CSS adjacent-sibling 规则 `.lgdl-node:hover + .lgdl-anchors { opacity: 1 }`（index.ts:455），边悬停显示两端端点圆（index.ts:927）

---

## 4. 标签避让：placeLabelBox（Bug1 修复）

**问题**（注释 index.ts:230-237）：标签不能互相重叠、也不能压在节点/分组盒上。

**策略**（index.ts:282-336，实读确认）：

1. **候选采样**：对折线**每一段**（跳过 <12px 的箭头残段，:305）取中点，生成垂直微调候选（dy ∈ [0, ±14, ±28, ±42]，:315-316）——比「只挪最长段中点」多段采样，把密集扇出（多服务→同一数据节点）的标签**摊到不同段**而不是全堆在共享下降通道（注释 :273-280）
2. **rank 排序**：`rank = dist(理想点) + (1-水平段)×40 − len/100`（:314）——最长段优先、水平段加分（横排可读性）、远者靠后；同段 dy 微调 `+ |dy|×0.2`
3. **isFree 检查**（:288-293）：候选盒不重叠障碍（节点盒 +2px 膨胀、分组盒）+ 已放置标签
4. **fallback**（:326-335）：全部候选被占时沿理想点 ±14..84px 强力上移；**绝不丢弃标签**——最后强制放理想点（:334-335）

**共享状态**：`placedLabels`/`labelObstacles` 在聚合边循环**之前**声明（index.ts:689-702），聚合边标签与普通边标签共用避让空间——修复「聚合标签压普通标签」缺陷（注释 :689-694）。

**宽度估算**：`labelBoxAt`（index.ts:246-251）——CJK ≈ 12px、拉丁 ≈ 0.62×12px，与 layout `textWidth`（layout/index.ts:76-82）同口径。

---

## 5. data-lgdl-loc 源映射（Web 点击定位依赖）

**发射点**（全部为文档序索引，svg.test.ts:166-193 专门测试）：

| 元素 | loc 格式 | 发射位置 |
|------|---------|---------|
| 时序参与者 / 消息 | `nodes[i]` / `edges[i]` | index.ts:411 / :427 |
| 泳道 / 分组盒 | `groups[i]` | index.ts:549 / :585 |
| state 初始伪节点 | `nodes[i]` | index.ts:599 |
| 普通节点 | `nodes[i]` | index.ts:652 |
| 聚合边 / 普通边 | `edges[i]` | index.ts:753 / :925 |
| uml-class 卡片 / 成员行 | `nodes[i]` / `nodes[i].members[j]` | index.ts:1002 / :984,:997（svg.test.ts:195-221 测试） |
| 甘特泳道 / 依赖 / 里程碑 / 任务条 | `groups[i]` / `edges[i]` / `nodes[i]` | index.ts:1064 / :1100 / :1127 / :1131 |

**Web 消费链**（实读）：App.tsx:467-473 `clickLocate` —— 点击 SVG 元素 `closest('[data-lgdl-loc]')` → `onLocate(loc)` → `locateIssue`（web/src/locate.ts）把 loc 字符串解析为源码字符区间 → 编辑器跳转。locate.ts:5-6 头注释明示数据来源即 renderer 的 `data-lgdl-loc` 属性。

---

## 6. router 消费链（承接批次 2a R-D1 定论）

### 6.1 导入面（render/index.ts:10）

```ts
import { routeEdge, shapeEdgePoint, routeRectilinear } from '@lgdl/lgdl-router';
```

### 6.2 routeEdge 调用点与参数（render/index.ts:850-860）

```ts
const ortho = routeEdge({
  points: pts,                                   // :851  layout 的 4 点中心折线（:821）
  srcNode: srcNode ?? undefined,                 // :852-853  两端节点盒
  dstNode: dstNode ?? undefined,
  srcKind, dstKind,                              // :854-855  shapeKindFor 生效 kind（mindmap/uml-class 全圆角）
  obstacles: routeBoxes,                         // :856      障碍盒集合
  bounds: { w: layout.width, h: layout.height }, // :857      画布
  routedSegments: routedEdges,                   // :858      已布边累积（贪心序）
});
routedEdges.push({ pts: ortho });                // :860
```

**obstacles 构造**（render/index.ts:836-843）：其他所有节点盒 + **除本边两端所属组外的所有组盒**——`groupsOwning`（:513-526）递归收集嵌套包含；边允许离开/进入自己的组（:834-835 注释）。

**边路由顺序**（render/index.ts:792-817）：**跨组边优先**（先占直通道，防止灵活的组内边堵死它们）+ 短边优先（`crossGroup` :797-803 + 曼哈顿距离 :806-810）——`routedSegments` 供 router 的 `countCrossingsWithRouted`（router 文档 §2）真实计数穿越。

### 6.3 其它 router 消费

- **聚合边**（group↔node / group↔group）：`routeRectilinear(src, dst, routeBoxesAgg, [src, dst])`（index.ts:732）——候选通道法绕开第三方盒（注释 :719-723：不再需要 offsetX hack）；端点锚定 `shapeEdgePoint('process', box, dir, 8)`（:717-718）
- **hover 锚点**：`shapeEdgePoint` 24 方向求交（:535-538, :661-669）

### 6.4 R-D1 定论（全仓 grep 核实）

**结论：`recentreExit`（router/src/index.ts:40）全仓无任何调用方。** grep 全仓（排除 node_modules/.sddu）仅命中：router/src/index.ts:40 定义 + router/dist / dist-test 编译产物。**render 侧仅 import `routeEdge`/`shapeEdgePoint`/`routeRectilinear` 三个符号**（index.ts:10）——`recentreExit` 未被 render（也未被 cli/web）引用。与批次 2a router 文档 §2/§8 R-D1 记录一致：历史遗留导出（routeEdge 用 15° 锚点网格 + quality 评分替代了重居中），候选清理项。

### 6.5 L-D1 定论（承接，全仓 grep 核实）

**结论：`packages/lgdl-layout/package.json:4` description「with incremental local re-layout」无任何实现痕迹——漂移确认。** grep 全仓（排除 node_modules/.sddu）：`incremental local re-layout` / `re-layout` / `reLayout` / `relayout` / `incrementalLayout` 仅命中 description 自身，**0 处代码实现**。layout 布局始终全量重算（layoutDocument → layeredRun 全量；layout 文档 §1-§4 实读已证）。描述与实现不符，建议修正 description 或补实现（记录，未修改）。

---

## 7. ASCII 渲染：renderAscii 网格文本

**定位**（ascii.ts:1-8 头注释）：把图映射到字符网格，用制表符画框——终端/CI 日志/无图环境可读；**CJK 全宽字符占 2 列**（charWidth ascii.ts:14-29）。

**布局**：自建 BFS rank（ascii.ts:172-197，忽略 layout 坐标）→ 每层盒子按带序排列。**分组列带**（ascii.ts:229-285）：每个顶层组一个独立列带（兄弟组盒永不重叠），未入组节点共享最左带；嵌套组继承顶层组的带。

**关键机制**：
- 字符网格 `Grid`（ascii.ts:46-102）：`put` 遇全宽字符在第二列打 GAP 标记 `\u0001`（:105），渲染时隐藏（:96-98）
- 盒绘制（:200-227）：start/end 圆角 `╭╮╰╯`（:135-136），decision 伪菱形 `< text >`（:217-220）
- 连接器（:325-449）：无分叉直落单行；有分叉/跨列用双行（trunk 行 + drop 行），junction 字符表（:707-724）合并方向；边标签插行（putLabel :112-121）
- **跨级边（跳过 ≥2 rank）不画但计数**（:303, :326-328, :458-460）——输出尾部注明「N cross-level edge(s) skipped — use SVG or status」
- **分组盒覆盖**（overlayGroupBoxes :489-613）：自底向上算盒（子组优先 :498-534），外→内绘制（:563），平移 dx/dy 腾出边框（:565-579），边框与连接器交叉处 `┼` 合并（:586-591, setBorder :693-700 边框让位于连接线）
- **聚合边**（drawAggregateEdges :621-685）：水平（并排盒 `▶/◀`）或垂直（上下堆叠 `▼/▲`），箭头在目标盒外一格（:682）

---

## 8. 测试基线：21 个测试（当日实测复验）

**当日实测**：`cd packages/lgdl-render && npm test` → **21/21 通过（fail 0，396ms）**。

**svg.test.ts（7 条）**：

| # | 测试（行号） | 覆盖行为 |
|---|-------------|---------|
| 1 | :13-44 | 外层组盒先画（嵌套可见——外盒不遮内盒边框） |
| 2 | :46-82 | 聚合边 rectilinear path + 锚点落在组盒边框（g1 底边 128 / g2 顶边 250） |
| 3 | :84-113 | uml-class 卡片由结构化 members 渲染（无 `\n` 泄漏） |
| 4 | :115-140 | er 模式：关系名居中 + 多重性在端点；label 不再混 `1..*` |
| 5 | :142-164 | uml-class 显式多重性端点渲染 |
| 6 | :166-193 | **data-lgdl-loc 源映射**：nodes/edges/groups 文档序索引 |
| 7 | :195-221 | 成员行携带 `nodes[i].members[j]` 映射 |

**ascii.test.ts（14 条）**：盒子绘制 / 圆角 start / decision `< >` / rank 连接 / CJK 对齐 / fork 多箭头 / 链上边标签 / 组盒 / 嵌套组 / 仅含子组的组 / 兄弟组列带分离 / 聚合边箭头 / 长标签不截断 / 全宽 CJK 边标签对齐。

---

## 9. 漂移与缺口（本批记录，未修改任何文件）

**承接核实（批次 2a 遗留，全仓定论）**：

| # | 结论 |
|---|------|
| **L-D1** | layout/package.json:4「incremental local re-layout」——**漂移确认**：全仓 grep 仅命中 description 自身，0 处实现痕迹；布局始终全量重算（详见 §6.5） |
| **R-D1** | router/src/index.ts:40 `recentreExit`——**无调用方确认**：全仓 grep 仅定义 + dist 产物；render 只 import routeEdge/shapeEdgePoint/routeRectilinear（详见 §6.4） |

**本批新发现**：

| # | 位置 | 说明 |
|---|------|------|
| R-D2 | render 发射 `groups[i]` loc ↔ web locate.ts 解析 | **跨包断裂（新发现）**：renderer 发射 `data-lgdl-loc="groups[i]"`（index.ts:549,585,1064），但 web locate.ts 按**顶层 `groups:` 节**解析（locate.ts:67-79 找 `groups:` 行），而 group-as-node 序列化器 serialize.ts **从不输出顶层 `groups:`**（组是 `kind: group` 节点）→ **Web 工作台点击分组盒/泳道无法定位到源码**（locateIssue 返回 null，无跳转）。且 locate.test.ts:24-26 的 SRC fixture 仍是旧版 `groups:` 语法，该路径未被现代模型覆盖（core 文档 §9 C-D2 关联）。建议：locate.ts 支持 group 节点（按 `kind: group` 的节点行解析）或将 group loc 改发射 `nodes[i]` |
| R-D3 | renderAscii 忽略 LayoutResult（ascii.ts:166 `void layout`） | ASCII 用自己的 rank 网格布局，与 SVG（layout 引擎坐标）几何输入源不同——大图降级/泳道语义下两者结构可能不一致。属设计选择（终端场景拓扑优先），cli render.ts:29 有显式注释，记录 |
| R-D4 | lgdl-render/package.json:4 description「LGDL SVG/PNG renderer」 | render 包自身只产 SVG/ASCII 字符串（index.ts:1162 导出面确认）；PNG 由 web 层导出（App.tsx export-png，canvas 下载）——description 中的 PNG 归因不精确，低优先级描述漂移 |
| R-D5 | routeDefault 兜底（index.ts:935-943） | 返回 `[{0,0},{0,0}]` 零长折线——注释自称「degenerate fallback（dagre 时代的残留）」，正常布局总有 points 不会触发；无测试覆盖该分支，记录 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（批次 2b：呈现层引擎深潜 · render） | 2026-08-30 | sddu-docs Agent |
