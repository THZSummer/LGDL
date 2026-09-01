# 核心引擎 — layout 布局引擎深潜

> **文档定位**: sddu-docs-deepdive-layout — @lgdl/lgdl-layout 包深潜：自研 Sugiyama 分层、分组感知两层布局、5 种专用布局与降级规则
> **输出文件名**: layout-布局引擎.md
> **数据来源**: 代码扫描生成（实读 `packages/lgdl-layout/src/index.ts` 798 行 + `layered.ts` 260 行 + `packages/lgdl-layout/package.json`，当日实测）
> **创建人**: sddu-docs Agent
> **创建时间**: 2026-08-30
> **版本**: v2.0（feature/group-as-node @ `d03dca4`，V2 包名更名）
> **更新说明**: 初始创建（批次 2a 几何层引擎深潜之一）；V2 增量更新：包名与路径更名（见 §1）

---

## 1. 包定位与依赖

| 属性 | 值 |
|------|-----|
| **包名** | `@lgdl/lgdl-layout`（packages/layout/） |
| **版本** | 0.5.0（package.json:3） |
| **定位** | 确定性布局引擎：只产出节点的**坐标盒子**（x/y/width/height）与边的**中心到中心粗折线**，不绘制、不走线 |
| **运行时依赖** | **仅 `@lgdl/lgdl-core` ^0.5.0**（package.json:19-21 `"dependencies": { "@lgdl/lgdl-core": "^0.5.0" }`） |
| **测试** | 无独立测试文件（`packages/lgdl-layout/src/` 下无 `*.test.*`，当日 `ls` 实测）——布局逻辑被 render/core 测试间接覆盖（根级 G4 缺口） |
| **被谁消费** | **render 与 web 直接依赖**（render/package.json 依赖 lgdl-core+lgdl-layout+lgdl-router；web/App.tsx:12 `import { layoutDocument } from '@lgdl/lgdl-layout'`） |
| **核心导出** | `layoutDocument`（唯一对外入口，index.ts:120）、类型 `LayoutResult`/`LayoutNode`/`LayoutEdge`（index.ts:19-38） |

**包内文件结构**：

| 文件 | 职责 | 规模 |
|------|------|------|
| `src/index.ts` | 类型定义、dispatch 主入口、节点尺寸估算、分组感知两层布局、5 种专用布局 | 798 行 |
| `src/layered.ts` | 自研 Sugiyama 分层引擎（四阶段，被 index.ts 两处调用） | 260 行 |

---

## 2. 核心导出与入口：dispatch 逻辑

**唯一对外入口**：`export async function layoutDocument(doc: LgdlDocument): Promise<LayoutResult>`（index.ts:120）。

**输出契约**（index.ts:19-38）：

```ts
interface LayoutResult {
  nodes: LayoutNode[];   // { id, x, y, width, height } — 左上角坐标
  edges: LayoutEdge[];   // { from, to, points[] } — 中心到中心粗折线
  width: number; height: number;
}
```

**dispatch 决策树**（index.ts:120-155，按优先级从上到下）：

```
layoutDocument(doc)
├─ [1] 降级判定（index.ts:124-129）：非 group 节点 > 120 且类型 ∈ {flowchart, state, er}
│      → layoutGrid(doc)（O(n) 网格，见 §6）
├─ [2] 分组感知判定（index.ts:134-138）：deriveGroups 非空且类型 ∈ {flowchart, arch, state, uml-class, er}
│      → layoutGrouped(doc, rankdir)（rankdir：uml-class/er 用 'LR'，其余 'TB'）
│      （datastream/mindmap/sequence/gantt 的 group 是泳道/分区语义，不走两层布局——index.ts:130-133 注释）
└─ [3] 按类型分派（index.ts:139-154）：
      mindmap    → layoutMindmap   （径向树，根在中心）
      sequence   → layoutSequence  （时序，参与者按列）
      datastream → layoutSwimlane  （泳道，每组一竖列）
      uml-class / er → layoutHierarchical(doc, 'LR')（左右分层）
      gantt      → layoutGantt     （时间轴甘特）
      state / default → layoutHierarchical(doc, 'TB')（上下分层）
```

**常量**（index.ts:41-52）：`NODE_SIZE` 按 kind 给默认盒子尺寸（start/end 120×48、process 160×56、decision 140×80、entity/note 140×60）；`GRAPH_MARGIN=40`、`RANK_SEP=96`（层间垂直间距，为堆叠分组框留白）、`NODE_SEP=80`（节点水平间距）。

**尺寸估算**：`nodeSizes`（index.ts:159-184）——按 kind + 成员内容（uml-class 行高 18px、er 行高 18px）动态算盒子；`textWidth`（index.ts:76-82）估算文本宽度（CJK 字形 ≈ fontSize、拉丁/数字 ≈ 0.62×fontSize），保证长 label 不出框。uml-class 用 `memberRows`（index.ts:59-69）带可见性符号（`VIS_SYMBOL` 来自 core，index.ts:16）。

**边预处理**：`nodeEdges`（index.ts:92-98）——仅保留两端都是普通节点（非 group）的边；任一端是 group id 的边是**聚合边**，由 renderer 在分组框之间绘制，**永不参与节点布局**。

---

## 3. 自研 Sugiyama 分层（layered.ts）

> ADR-001 锚点：这是「dagre → elkjs → 彻底自研」三阶段演进的最终实现。模块头（layered.ts:1-21）明确声明：算法思想遵循 Sugiyama 框架（1981, Kōzō Sugiyama et al.，「Methods for Visual Understanding of Hierarchical System Structures」），**实现完全自研**（no dagre/elkjs），且**确定性**：同输入必同输出（无随机）。

入口：`export function layoutLayered(nodes, edges, rankdir): LayeredResult`（layered.ts:161-260）。`rankdir` 只是显示提示——内部 rank 轴统一按「竖直」计算，'LR' 时末尾交换 x/y（layered.ts:157-159, 244-248）。

### 3.1 四阶段流水线

**阶段 1 — 去环（cycle removal）**（layered.ts:166-185）
- DFS 三色标记（0 未访问 / 1 在栈 / 2 完成），发现回边（`s === 1`）时记入 `reversed` 集合（layered.ts:172-181）
- 回边在构图时**反向**（`{ from: e.to, to: e.from }`），保证后续阶段拿到 DAG（layered.ts:183-185）
- 与 dagre/elkjs 的去环策略差异：本地实现不做最小回边集优化，仅按 DFS 遍历顺序取反，胜在确定性与简单

**阶段 2 — 分层（layer assignment，最长路径法）**（`assignLayers`，layered.ts:44-75）
- 拓扑序处理：`rank = max(rank, 源rank + 1)`（layered.ts:69）
- 源节点 rank=0；环已被阶段 1 消除，拓扑序必然完整

**阶段 3 — 层内排序（ordering，barycenter 启发）**（`orderLayers`，layered.ts:81-134）
- 每层按**质心（barycenter）**排序：节点取其所有前驱（向下扫）/后继（向上扫）的当前位置均值（`barycenter`，layered.ts:136-149）
- **2 轮完整扫描**（下→上→下→上，layered.ts:108-132），无邻居的节点质心取 `MAX_SAFE_INTEGER/2` 沉到层尾（layered.ts:138）
- 平局用**文档序**稳定打破（layered.ts:116-117, 128）——确定性关键
- 与 dagre/elkjs 差异：dagre 用 median 启发 + 随机扰动重试取最优，本实现只用 barycenter + 文档序平局，不做多随机种子——确定性优先于交叉数最优

**阶段 4 — 坐标分配（coordinate assignment）**（layered.ts:197-250）
- 每 rank 取**最大节点高**作为行间距基准 `rankMaxH`（layered.ts:201-207），行顶 y 累加 `rankMaxH + RANK_SEP`（layered.ts:216-220）
- 每层宽度 = Σ(节点宽 + NODE_SEP) − NODE_SEP（layered.ts:224-231）；每层**以画布中线为中心**水平放置（`xCursor = GRAPH_MARGIN + (maxLayerW - layW)/2`，layered.ts:238）
- 常量：`NODE_SEP=80`、`RANK_SEP=96`（layered.ts:209-210，与 index.ts:51-52 同值）
- 'LR' 时交换 x/y（layered.ts:244-248），画布尺寸对应换算（layered.ts:253-259）

### 3.2 确定性保证

全链路无随机数：去环按 DFS 顺序、排序平局按文档序、坐标纯算术。**同输入 → 同输出**（layered.ts:20 模块头声明）。

---

## 4. 分组感知两层布局（layoutGrouped / deriveGroups）

> ADR-002 锚点：group-as-node 模型下，分组框是 `kind:'group'` 节点携带 `contains`（core 侧已删除顶层 `groups` 字段）；layout 用 `deriveGroups(doc)` 投影（core/src/groups.ts:24）取回组列表。`layoutGrouped` 入口在 index.ts:219。

**问题动机**（index.ts:200-218 注释）：单层分层把所有节点平铺，不同组的节点互相穿插，renderer 事后画的分组框会**重叠**。修复方案 = 把每个组当作一等「超节点」参与顶层布局。

**三步算法**：

| 步骤 | 代码 | 说明 |
|------|------|------|
| **1. 组内布局** | index.ts:228-249 | 对每个组：取组内成员 + 组内边（两端都在组内），跑一次 `layeredRun` 得组内局部布局；由成员包围盒得组内尺寸 `groupBox`（`maxX-minX` 等，index.ts:243-248） |
| **2. 顶层布局（组=超节点）** | index.ts:251-277 | 顶层节点 = 每个组的超节点（尺寸 = 组内盒 + padX=40/padY=50 内边距 + 头部条，index.ts:259-260）+ 所有未入组普通节点；边按 `unitOf`（组聚合其成员，index.ts:252）折叠到单元级、去重（`\u0000` 连接，index.ts:268-272），再跑一次 `layeredRun` |
| **3. 合并（偏移回填）** | index.ts:279-306 | 组内成员位置 = 超节点位置 + pad + (局部坐标 − 组内最小坐标)（**rebase 归一**：不归一会把成员推到负坐标、分组框出画布，index.ts:291-296 注释）；未入组节点直接用顶层位置（index.ts:303-305） |

**画布边界处理**（index.ts:309-324）：组盒不在 `finalPos` 里（成员才是），但超节点的包围盒（顶层位置 + 加 pad 后的尺寸）必须计入画布范围——否则分组框伸出画布被裁剪（「group 出画布」缺陷的修复，index.ts:314-318 注释）。

**边输出**（index.ts:332-342）：跨组边按成员节点中心连线，输出带中点的 4 点折线（`[srcC, midX@srcY, midX@dstY, dstC]`），render 侧再做正交化避障（走线不属于 layout 职责——与 router 包的边界，见 router 文档 §1）。

**组间永不重叠的不变量**：组是顶层独立节点，间隔 `RANK_SEP`/`NODE_SEP`；组内成员聚类；阅读顺序两层均保持（两层都用分层引擎）。

---

## 5. 5 种专用布局

### 5.1 径向树（mindmap）— `layoutMindmap`（index.ts:405-538）

- 忽略 group 节点（径向树无容器概念，index.ts:406-408）
- 建树：入度为 0 者为根（无入度节点时退回第一个节点，index.ts:431-433）；BFS 展开子节点并**防环**（visited 集合，index.ts:436-450）
- 子树叶子数自底向上统计（`computeLeaves`，index.ts:453-462）——叶子数决定子节点的**角跨度**占比（index.ts:473）
- 角度分配：根占整圆（-90° 起点，顶部开始，index.ts:478）；子节点按叶子占比切分角区间
- 坐标：极坐标→直角坐标（`r = depth × MIND_LEVEL_SEP`，`MIND_LEVEL_SEP=180`，index.ts:402, 490-494），整体平移至正坐标 + 边距（index.ts:504-505）
- 边：父子直线，终点用 `borderPoint` 停在目标盒子边界（箭头可见，index.ts:105-118, 523）
- 常量：`MIND_ANGLE_UNIT = 14° / 叶子`（index.ts:403）

### 5.2 时序图（sequence）— `layoutSequence`（index.ts:548-588）

- 每个参与者一列（宽 `SEQ_COL_W=220`，index.ts:545）；参与者头盒 160×44 居列顶（index.ts:558-564）
- 每条消息占一行，y 按文档序递增（`SEQ_MSG_GAP=60`，index.ts:573-585）——**保持消息文档序 = 时序语义**
- 画布：`width = 列数×220 + 2×40`，`height = 头部70 + 消息行数×60 + 60 + 40`（index.ts:553-555）

### 5.3 泳道（datastream）— `layoutSwimlane`（index.ts:597-675）

- 每个 group = 一竖条泳道（`LANE_W=260`、`LANE_HEADER=36`，index.ts:594-595）；无 group 时退化为单条「流程」泳道（index.ts:602-605）；未入组节点进末尾「其他」泳道（index.ts:611-616）
- 泳道内节点按**文档序竖直堆叠**（间距 40，index.ts:634）；两趟：先算每道内容高、整体取 max（index.ts:629-638），再放置时**垂直居中**短泳道（`y = contentTop + (maxContent - total)/2`，index.ts:647）——短泳道底部不留大空带
- 边：中心到中心直线，终点 `borderPoint` 贴目标边界（index.ts:661-672）

### 5.4 甘特（gantt）— `layoutGantt`（index.ts:698-748）

- 每个节点 = 任务条（`attrs.start` 天数偏移 / `attrs.duration` 天数，缺省 0/1，index.ts:701-702）；边 = 依赖（renderer 画竖线连接，index.ts:734-745）
- **自适应时间刻度**：`colW = clamp(GANTT_CHART_W_TARGET / span, 14, 40)`（index.ts:713-716）——90 天项目不再膨胀到 ~3700px 宽（「过扁」缺陷修复，index.ts:693-697 注释）；renderer 从 width 反推刻度
- 负天数归一（`minStart` 平移，index.ts:705）；全负项目 maxEnd 从首个任务算起，画布不爆到 30000px（index.ts:706-709 注释）
- 常量：行高 48、标签列宽 220、时间轴头 40、目标图表宽 1100（index.ts:681-686）

### 5.5 网格（grid）— `layoutGrid`（index.ts:762-797）

- O(n) 网格：节点按文档序放入 6 列网格（`GRID_COLS=6`、`GRID_NODE_W=150`、`GRID_NODE_H=44`，index.ts:754-756），行距 `RANK_SEP`、列距 `NODE_SEP`
- 身份双重：既是大图**降级**布局（§6），也承担「快速兜底」角色——质量牺牲换交互流畅（index.ts:759-761 注释）
- 边：中心连线 + `borderPoint` 贴边

---

## 6. 降级规则（>120 节点自动降级网格）

**规则**（index.ts:85 常量 + 124-129 判定，实读确认）：

```ts
export const LARGE_GRAPH_THRESHOLD = 120;                        // index.ts:85
if (
  doc.nodes.filter((n) => n.kind !== 'group').length > LARGE_GRAPH_THRESHOLD &&  // index.ts:125
  (doc.type === 'flowchart' || doc.type === 'state' || doc.type === 'er')        // index.ts:126
) {
  return layoutGrid(doc);                                        // index.ts:128
}
```

**要点**：
- 阈值只对**非 group 节点**计数（group 是容器不算）
- 只对 **flowchart / state / er** 三种类型降级——它们是分层引擎的重负载场景；mindmap/sequence/gantt/datastream 各自 O(n) 或线性，无需降级
- 动机：分层引擎（Sugiyama 排序阶段 O(n·sweeps)）在大图上变慢，网格 O(n) 保住编辑器交互性（index.ts:122-123 注释）——「layered quality matters for small/medium」

---

## 7. 遗留缺口：`layoutDocument` 的 async 签名（G6）

**现状**（实读确认）：`layoutDocument` 声明为 `async`（index.ts:120），但 `index.ts` 与 `layered.ts` 全文件 **0 处 `await`**（当日 `grep -c "await "` = 0）——函数体全同步，返回的 Promise 立即 resolve。

**消费方**：cli（commands/render.ts:29,52）与 web（App.tsx:546）都 `await layoutDocument(doc)` 调用——签名保持不变即接口兼容，无调用方需要改动。

**来源**：elkjs 时代（wasm 加载必须异步）的遗留。ADR-001 记录「引擎全同步（layoutDocument 的 async 签名成为遗留）」（adr-index.md:45）。根级漂移清单 G6 已记录。

**影响**：零功能影响，仅接口语义不精确（async 但无异步操作）。改同步需同步改 2 处消费方的 await，属低优先级清理项。

---

## 8. 与 dagre / elkjs 的差异要点（ADR-001 对齐）

> 三阶段演进全景见根级 adr-index.md:37-54（ADR-001）。本表从代码实读提炼差异：

| 维度 | dagre（v0.1 时代） | elkjs（v0.2 中间态） | **自研 layered.ts（当前）** |
|------|------|------|------|
| 依赖 | 第三方 | wasm 约 1.6MB（打包 20s 慢、需 bundled 修复 commit `13ae5f5`） | **零依赖**（仅 core；package-lock 实测 dagre/elkjs 0 处残留） |
| 异步性 | 同步 | 异步（wasm 加载 → layoutDocument 被迫 async） | **全同步**（async 签名是遗留，§7） |
| 确定性 | 随机扰动重试 | 同左 | **完全确定**（无随机；排序平局按文档序） |
| 分组支持 | cluster 支持差 | 一般 | **一等公民**：组=超节点参与两层布局（§4），与 group-as-node 模型（ADR-002）天然契合 |
| 正交布线 | 需另造轮子 | `edgeRouting: ORTHOGONAL`（布局层能力，随 elkjs 一并移除） | 不负责——**交给 router 包**（ADR-003），layout 只出中心折线 |
| 控制权 | 外部引擎限制 | 同左 | **完全控制**：RANK_SEP/NODE_SEP 常量可调、降级阈值可调、每层居中策略自有 |
| 边端点 | 只裁剪到包围盒（菱形角落悬空） | 同左 | 布局层出中心折线；**真实形状边界锚点由 router 的 `shapeEdgePoint` 负责**（render 侧消费） |

**与既有文档的一致性检查**：docs/design.md:33 与 docs/lgdl-spec.md:23-34 仍写「默认 elkjs / config.ts 可切 dagre」——已过时（根级漂移 D1/D3），**以代码为准**：config.ts 不存在（commit `490636e` 删除），默认即自研分层。

---

## 9. 漂移与缺口（本批新增记录，未修改任何文件）

| # | 位置 | 说明 |
|---|------|------|
| L-D1 | packages/lgdl-layout/package.json:6 description 写「with incremental local re-layout」 | 实读 index.ts/layered.ts 未发现增量局部重布局实现痕迹（布局始终全量重算）——描述与实现不符的候选漂移，建议后续批次核实（本次未 grep 全仓，不作定论） |
| L-D2 | 无独立测试文件 | 复用根级 G4：layout 逻辑靠 render/core 测试间接覆盖，布局回归无直接护栏 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（批次 2a：几何层引擎深潜 · layout） | 2026-08-30 | sddu-docs Agent |
