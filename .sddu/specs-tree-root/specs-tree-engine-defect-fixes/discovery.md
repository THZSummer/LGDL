# 问题挖掘报告：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露项摸底）

> **文档定位**: SDDU 问题挖掘报告 — 记录门禁（specs-tree-render-gate，G1~G6）暴露的三类引擎缺陷的精确位置、成因、修复方向与风险，作为 spec 阶段的输入
> **前置依赖**: 无（作者指令 2026-09-02「修复引擎缺陷」已闭环，本阶段为源码只读摸底，无访谈）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建（摸底型 discovery，全部结论附文件:行号实证）

---

## 1. 问题定义

> 概括核心问题及其业务影响，回答"为什么需要关注"。

门禁 feature（specs-tree-render-gate，b69bbbf）以「精确已知集断言」方式记录了引擎的 29 项几何违例（matrix-a KNOWN_A 22 项 + matrix-b KNOWN_B 7 项，当前 96 测试全绿）。这些违例不是门禁误报，而是引擎真实缺陷——修复目标是让门禁从「已知集断言」回归「0 违例」，即 KNOWN 集清空、违例归零、引擎修复后门禁提示收编回 clean。

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| ① EC-001 四项渲染文本/标签缺陷：er/uml-class 基数标签落实体框内（G4）、state 边 label 贴右缘越界 4px（G5）、gantt 里程碑/窄条时间文本越界 ~5px（G5） | 关系图/状态机/甘特图渲染产物存在标签压框、文字出画布等可见质量问题，门禁只能"记录已知"而无法"断言干净" | 门禁失去回归价值；渲染产物带病交付，每个新文档都可能触发同类缺陷却无守护 |
| ② B2-LR 布局缺陷：layered.ts LR 方向画布/rank 按节点**高度**估算，宽>高卡片相邻 rank 重叠 16px 并撑破画布 72px（潜在，未门禁） | er/uml-class 等 LR 布局文档在"宽>高的短卡片"形态下互相压叠、出画布 | LR 布局在常见类图/ER 短卡片场景不可用；缺陷隐藏，无测试守护，随时被新文档触发 |
| ③ G6 贴边走线：routeEdge/routeRectilinear/renderGantt 三种路径生成均可能产生与节点/容器框边线共线的走线段（大段 40~120px 借道 + 末端 1~16px 微借道） | 连边贴框边滑行视觉上"粘在框上"，与作者裁决「容器也是 node，不允许贴边走」冲突；门禁 G6 记 18+7 项 KNOWN | G6 检查项长期带已知集运行，新增文档无法获得干净断言 |

**总体修复目标（state.json 已声明）**：三类缺陷修复 + matrix-a/matrix-b KNOWN 集清空回 clean（门禁断言 G1~G6 规则不动，快照走显式重建 + diff 审阅），测试守恒不降。

---

## 2. 用户画像 / 受影响方

> 描述受影响角色及其场景。本 Feature 无终端用户访谈（作者指令已闭环），受影响方为引擎消费者与门禁守护方。

| 用户角色 | 典型场景 | 关键痛点（原话/实证） | 当前应对方式 |
|---------|---------|-------------------|------------|
| 引擎渲染/布局消费者（render/layout/router 调用方） | er/uml-class 基数标注关系图；state 长状态机；gantt 里程碑图；LR 布局类图 | "基数 '1' 怎么落到实体框里了"（er edges[0] text@(110,56) 压 user 框）；"文本出画布了"（state label 右溢 4px、gantt 右溢 5.4px） | 忍受：这些形态在 A/B 档被 KNOWN 集"记录在案"而非修复 |
| 门禁维护方（本 feature 作者/后续 spec/plan） | 每次渲染改动后跑 matrix-a/matrix-b + snapshot | "修一个不能坏十个；KNOWN 集会红提示收编回 clean" | KNOWN 精确集断言（violations.length === known.length 一一配对） |
| 下游路由引擎 | G6 判定"沿框边借道"为违例且**无端点豁免** | "为什么我垂直进锚点不算、平行滑 1px 也算？" | 门禁以「段与框边线共线且重合 >0.5px」硬判定（geometry-audit.ts:434-473/960-1007） |

---

## 3. 问题清单（缺陷定位与证据）

> 三类缺陷逐一给出：现状（文件:行号）、成因、修复方向、风险、与门禁 KNOWN 的对应。全部结论来自源码只读 + 门禁测试复跑（96 绿）+ 路由/审计实测复现。

### 3.1 缺陷① EC-001 四项（render 层标签/文本位置）

#### Q-001 er/uml-class 基数标签落实体框内（G4）

**现状（证据链）**
- 基数绘制点：`packages/lgdl-render/src/index.ts:896-930`。锚点取路由折线两端点（:900-901），方向取**折线端点处局部方向**（:908-917），基数外置 22px 沿该方向推进（src :920 / dst :921），绘制时 y 再 -6（:929-930）。
- 实测（er A 档，edges[0] user→order）：
  - 路由折线 = `[(110,40),(110,161.58),(240,161.58)]` —— 起点在 user **顶边**（user.y=40），首段竖直**向下穿过 user 自身实体内部**（box 40,40,140x104）。
  - 基数 `"1"` 绘制于 `(110,56)`，估宽 bbox (104.28,46..115.72,66) 压 user 框 → auditGeometry G4 `压 user 框`。
- audit 命中记录：`matrix-a.test.ts:39`（KNOWN_A.er）、文件头 :11-12（"路由锚点自源框顶指向体内"）。

**成因（三层叠加，非单一处）**
1. **collapseGridPath 允许"垂直穿过自身节点内部"的 L 捷径**：A*（router/index.ts:613-747）对自身节点框做 14px 膨胀（:628-645）+ 锚点外走廊（:660-693），原始网格路径不可能穿自身框；但 `collapseGridPath`（:754-812）的 `segClear`（:763-784）只对**第三方框**判内部穿越（:763-775），对**自身框只查"平行贴墙>20px"**（:776-782）——一条从锚点竖直穿过自身框中心列的段既不平行贴墙、又不属第三方，被判 clear → 绕行被塌缩成穿体直线。
2. **pathHitsOwnBody 漏判"起于边界、穿体而过"的段**：`pathHitsOwnBody`（router/index.ts:80-106）的 `segInside`（:90-102）要求**两端点都严格在框外**才判"段穿框"；而锚点是实体顶弧浮点解 `y=40.00000000000005`（entity 形状求交 `shapeEdgePoint` :259-283），比 box.y 大 5e-14 → 起点被含入"框内侧" → segInside 短路不判 → 穿体段通过 :213 的复查。
3. **基数 22px 外置依赖"端点局部方向 = 出体方向"的隐含假设**：当路由段沿错误面出体/穿体时，局部方向指向体内，22px 外置自然落入框内（render/index.ts:918-921 无兜底）。

**修复方向建议**（spec 需组合决策）
- 方向 A（router 主修，清根因）：`collapseGridPath.segClear` 增加"自身框内部穿越"拒绝（垂直/水平段横穿 own box 即拒，不只查平行贴墙）；把 :776-782 的平行贴墙容差 ≤20px 收敛到 0（对齐 G6 判定 >0.5px）；路径末尾 detick：保证入/出端点的相邻段与锚点所在面**严格垂直**（消除 1px tick 与浮点列差）。ER 案例修复后应从 user **下/右面**垂直出体，基数随局部方向自然外置。
- 方向 B（renderer 兜底，不强依赖路由质量）：基数偏移改沿**锚点所在面的外法线**推进（anchor 在上边 → 向外向上 22px），而非沿折线局部方向；仍与路由穿体场景解耦。
- 建议 A 主 B 辅（B 使基数定位与路由缺陷解耦，A 消除穿体走线本身——穿体目前**无门禁项覆盖**，是 visual defect + G4 根因）。

**风险**：A 改动 collapse 语义可能提高 A* 无解率 → 需全量矩阵回归确认 orthogonalize 兜底不增；锚点浮点（R-006）需在 router 侧稳定化。

**清空 KNOWN**：`matrix-a er G4 edges[0]`（1 项）。

#### Q-002 uml-class 基数 "1" 落入目标框内（G4，同 edges[1] 伴 G6）

**现状**
- uml-class A 档 edges[1] = order→payment（order∈domain 组、payment∈infra 组）。路由折线 = `[(456,189),(609,189),(609,322),(714,322),(714,302),(716,302)]`。
- 末端 `(714,302)→(716,302)` **沿 payment 底边滑入 2px**（G6），基数的 dst 局部方向 = (1,0)（水平），`dstCard = (716,302) - (1,0)*22 = (694,302)`，y-6=296 → 文本 bbox (688.28,286..699.72,306) 压 payment 框 (636,200,160x102) → G4。
- audit 命中：`matrix-a.test.ts:40-44`（KNOWN_A['uml-class'] G4+G6×2）。

**成因**：与 Q-001 同根的**末端滑入 + 基数沿局部方向外推**。滑入本身来自：routeEdge 障碍集排除"拥有端点的组"（render/index.ts:853-855 → 排除 infra），A*/collapse 通道恰好落在 infra 底边线（y=322，见 Q-008 M1 同款），最后 2px tick 沿目标底边进锚。

**修复方向**：同 Q-001（router 消滑入 + renderer 面法线外置）；两者任一先落地都可能使本 G4 自愈，但组合最稳。

**清空 KNOWN**：`matrix-a uml-class G4 edges[1]`（1 项；与 Q-008 的 G6 同边联动）。

#### Q-003 state 边 label 贴右缘越界 4px（G5）

**现状**
- state A 档 edges[5]（pending→cancelled，"用户取消"），画布 720x1796。路由折线最长段 = x=700 的竖直段（y 378→1480，距右缘仅 20px）。label 经 `placeLabelBox`（render/index.ts:282-336）选中该段中点 (700,925)，CJK 估宽 48px（4×12）→ 右缘 724 > 720 → G5 `text 越界 4px`（bbox 676,917..724,933）。
- audit 命中：`matrix-a.test.ts:45`。

**成因**：`placeLabelBox`（:282-336）**无画布边界概念**——候选/回退逻辑只避节点障碍与已放置标签（`labelBoxAt` :246-251、`isFree` :288-293），从不检查候选是否越 viewBox；`longestSegmentMid`（:258-271）倾向选长段（此处恰为贴右缘的竖直长段），无"越界候选剔除"。

**修复方向**：placeLabelBox 增加画布宽高参数（render 侧有 layout.width/height），`isFree` 与候选回退补"估宽 bbox 必须落在画布内（含边距）"约束；必要时越界时回退到水平段/夹取。注意 `placeLabelBox` 同时服务普通边 label（:932）与聚合边 label（:758），口径需一致。

**清空 KNOWN**：`matrix-a state G5 edges[5]`（1 项）。

#### Q-004 gantt 里程碑/窄条时间文本越界 ~5px（G5）

**现状**
- gantt A 档 launch（milestone，dur=1）layout 节点 = (980,280,36x32)，画布 1060 宽，colW=40。条宽 36 < 64 → 时间文本 `18d +1d` 外置右侧（render/index.ts:1131-1135：`inside = node.width >= 64`，否则 `text(node.x + node.width + 6, cy, …, 'start')`），文本起点 x=1022、fs=10 估宽 43.4px → 右缘 1065.4 > 1060 → G5 `越界 ~5.4px`（audit bbox 1022..1065.4）。milestone diamond（r=9，:1136-1143）中心在 node.x+width/2=998，最右 1007，文本区在其右侧 1022 起。
- audit 命中：`matrix-a.test.ts:46-47`（nodes[4] '18d +1d'）。milestone dur=0（mermaid 导入常态，mermaid-import.ts:1109/1255）条宽 = max(0*colW-4,20)=20，机制相同。

**成因**：窄条外置文本策略未考虑画布右缘——layoutGantt 画布宽（layout/index.ts:718 `width = MARGIN*2 + LABEL_W + span*colW`）只覆盖到**末条右缘**，未为"条宽<64 时的外置文本"预留宽度；renderer 对最右侧窄条不做内侧回退。

**修复方向建议**
- (i) layout 侧：右缘余量纳入"窄条外置文本"估宽（需镜像 renderer 的估宽口径 fs=10，Latin 0.62×）；
- (ii) renderer 侧：近右缘窄条（node.x+width+6+textW > layout.width）回退为条内左对齐/条左侧/里程碑上方等策略；
- (iii) 保持时间文本语义（`${start}d +${dur}d`）不变。
- 建议 ii 为主（改动面收敛在 renderGantt），配合 golden 重建审阅。

**清空 KNOWN**：`matrix-a gantt G5 nodes[4]`（1 项）。

### 3.2 缺陷② B2-LR 布局缺陷（layout 层，宽>高卡片 LR 重叠破画布）

#### Q-005 layered.ts LR 方向按节点高估算 rank 轴距与画布宽（G5/重叠，潜在未门禁）

**现状（源码证据）**
- `packages/lgdl-layout/src/layered.ts`：
  - rank 内最大**高度** `rankMaxH`（:200-207）同时充当 TB/LR 的秩轴步进基准；
  - 秩轴行距 `rowY`（:215-221）：`yCursor += rankMaxH[r] + RANK_SEP(96)` —— **两种方向都用高度**；
  - LR 坐标交换（:244-245）：`pos.set(id, { x: y(=rowY[r]), y: x(=层内排布) })` —— LR 的秩轴（x）步距 = 高度驱动；
  - LR 画布（:253-256）：`width = totalRankH + GRAPH_MARGIN`，而 `totalRankH = rowY[maxRank]+rankMaxH[maxRank]`（:221）—— **画布宽按末秩高度估算**，未取末秩节点实际右缘（对比 TB 分支 :258-259 有 `maxNodeRight + MARGIN` 兜底，LR 分支缺失）。
- 节点尺寸来源（layout/index.ts `nodeSizes` :159-184）：uml-class 卡片 `width = max(160, longest+24)`、`height = 32+rows*18+16` —— 短卡片（0~1 行成员）**宽 160 > 高 48~66**。
- **实测复现**（LR 链 4 张无成员 uml 卡 a→b→c→d，门禁基座 renderDoc）：
  - rank 轴步距 = 48(高)+96 = 144px，卡片宽 160 → **相邻 rank 重叠 16px×48**（a∩b/b∩c/c∩d 均实测）；
  - 画布 = 560 宽，末卡 d 右缘 = 472+160 = 632 → **右溢 72px** → audit G5（rect+文本+分隔线三条 nodes[3] 越界）。
- 该缺陷在门禁内**已被规避记录**：`matrix-docs-b.ts:118-120`（B2 build 偏差记录 B2-LR，B2 文档因此取"单 rank 纵排"零边形态）。

**成因**：Sugiyama 坐标阶段把「秩轴推进量」错误绑定到**节点高度**，未按 rankdir 选择对应维度——LR 时秩轴是 x，推进量应取该秩 **max 节点宽度**（+秩距）；同时 LR 画布宽缺少"按节点实际右缘外扩"的兜底（:253-256 vs :258-259）。

**修复方向建议**（方案评估属 plan）
- layered.ts 把「秩轴尺寸」显式按 rankdir 取维度：LR → 每秩 `rankMaxW`（max width）+ RANK_SEP 做 x 步进；TB → 维持 `rankMaxH`。
- LR 画布宽改为 `max over nodes (x + width) + GRAPH_MARGIN`（镜像 TB 的 maxNodeRight 兜底 :258-259），或按末秩 max(x+width) 计算。
- 注意 `rowY`/`rankMaxH` 语义重命名（秩轴 vs 交叉轴），layoutGrouped（layout/index.ts:219-345，两层 LR）与 layoutHierarchical（:349-385）共用 layeredRun → 一并受益。
- B2 文档（matrix-docs-b.ts:110-164）可恢复多 rank 形态以锁回归（**测试档变更需 spec 决策**，或新增 LR 多 rank 宽卡片矩阵档）。

**风险**：LR 坐标系统性漂移 → er/uml-class golden svg 大面积变化，需显式重建 + diff 审阅；B2 现行为（单 rank 纵排）不受影响。

**清空 KNOWN**：**无** —— 当前门禁无 LR 宽卡片用例（B2 已绕开）；此缺陷为"潜伏项"，修复后**建议补回归档**（否则无守护，易复发）。

### 3.3 缺陷③ G6 贴边走线（router/render 层）

**门禁判定口径（先钉死）**：auditG6（`geometry-audit.ts:960-1007`）——连边轴对齐段与**任一**节点/容器框边线共线（距离 <0.5px，tol :48-50）且重合 >0.5px 即违例；**无端点豁免**（:956-958 注释：作者裁决 group 也是 node）。垂直进锚点（段垂直于面、只交一点）天然不命中；平行滑入/滑出命中。`segRideOnBox` :434-473。

#### Q-006 机制 M1：routeRectilinear 聚合边沿端点框边线大段借道（40~120px）

**现状**
- 聚合边路由入口：render/index.ts:716-770，routeBoxesAgg **排除两个端点组与端点节点框**（:737-744，注释 :735-736 "edge may leave/enter its own group"）。
- routeRectilinear（router/index.ts:563-603）：通道/行含 `src.y/dst.y`（:573-583），候选直连/单折/双折（:586-590）；障碍判交 `pathCrosses`（:434-460）只判**严格内部**穿越——**沿被排除框的边线滑行既不穿障也无净空惩罚**；评分（:592-601）无防贴边项。
- 实证（复现）：
  - architecture edges[10]（user→core 节点→组聚合）：折线 `M 242,88 L 202,88 L 202,600 L 353,600` → 沿 user 底边 40px + 沿 core 组顶边 83px（KNOWN_A:54-55）。
  - B5 edges[2]（g1→out 组→节点聚合）：`M 260,197 L 512,197 L 512,96 L 392,96` → 沿 out 底边 **120px** 滑入终点锚（KNOWN_B:54）。
  - uml-class edges[1]（order→payment 普通边，见 Q-002）：routeEdge 障碍集排除 owning 组 infra（render/index.ts:853-855）→ 沿 infra 底边 98px（KNOWN_A:42）。

**成因**：障碍集排除端点（组/节点）+ 判交仅严格内部 + 通道天然含 src/dst 坐标 → "沿自己端点框边滑行"是零成本通道，被净空/少折评分选中。改动障碍集为"加入端点框"并不能消除——**贴边滑行本就不构成内部穿越**，必须引入膨胀或贴边拒判。

**修复方向建议**
- (a) routeRectilinear 对 boxes（含端点框）做**贴边硬拒**：候选任一段与任一障碍/端点框边线共线（>tol）即拒；或
- (b) 引入**障碍膨胀 + 锚点外走廊**（复用 routeAStar 模型 :637-693：端点框膨胀 clear、锚点向外开 1 格宽走廊），使"合法出/入"= 垂直于面离开/接近，平行滑行被膨胀边界挡死；或
- (c) 聚合边与普通边统一走 routeEdge（A*）——消除双正交路径器的语义分叉（涉及 router 出口与 render 调用点，需 plan 评估）。
- 保留"垂直进锚点"合法（与 G6 判定一致）；fallback（:592 `best=fallback`）不得贴边。

**风险**：候选全拒 → fallback 直连可能穿越（degraded-paths.test.ts 场景 3 断言不抛/有限/正交，需保持）；聚合边在有 dense 障碍时可用通道减少 → 视觉绕行变长（非违例）。

**清空 KNOWN（M1 部分）**：uml-class G6×2（infra 98 + payment 2）、architecture G6 edges[10]×2（user 40 + core 83）、B5 G6×1（out 120）—— 5 项。

#### Q-007 机制 M2：routeEdge/routeRectilinear 末端锚点微借道 1~16px

**现状**
- A* 网格 cell=7px（router/index.ts:622）+ 锚点走廊（:660-693）+ collapseGridPath（:754-812）；`segClear` 对自身框**只拒平行贴墙 >20px**（:776-782，注释明示"短平行滑入 ≤~2 cells ≈14px 是简化需要"）。
- 锚点是 15° 量化浮点（shapeEdgePoint :233-317），网格列/行为 7px 整数 → 终点前"垂直落列 ≠ 锚点列"产生 1~6px 的水平 tick 恰好骑在框边线上（入/出段平行于面）；>20px 阈值允许的 ≤14px 平行滑入也直接命中 G6（>0.5px 即算）。
- 实证（复现，均为**端点自身框**上的末段 tick）：
  - architecture edges[0] cdn 上 4px、edges[6] worker 上 6px（KNOWN_A:56-57）
  - microservices edges[0] gateway 上 1px、edges[11] redis 上 4px、edges[17] es 上 6px、edges[18] oss 下 2px（KNOWN_A:59-63）
  - login-flow edges[3] fail 上 4px（:65）；ecommerce-flow edges[14] refund 上 4px（:66）
  - mindmap edges[3] llm 下 2px、edges[8] edge 下 6px（:67-70）
  - B1 edges[3] n3 上 1px、edges[4] n4 上 1px（KNOWN_B:50-51）
  - B9 edges[1] svc 右 4px（KNOWN_B:59）

**成因**：网格量化（7px）与浮点 15° 锚点列的固有列差 + collapse 允许 ≤20px 自身框平行段（:776-782 阈值与 G6 的 0.5px 判定**语义冲突**——这是设计取舍点，注释称"≤2 cells 平行滑入是特性"）→ 末段 1~16px 贴边 tick。G6 无端点豁免 → 全部上报。

**修复方向建议**
- 收敛 :776-782 的平行贴墙容差：从 20px → 对齐 G6 口径（>0.5px 即不允许），或对**最终输出**加 detick pass：扫描与任何框边共线的段，将折点移到锚点列/行使入/出段垂直于面（垂直段在边界上重合长度≈0，天然不命中 G6）；
- 锚点/走廊精度：网格末段改用锚点真实坐标做"最后一跳"（垂直段直落锚点），消除列差 tick；
- routeRectilinear 侧同款（其候选通道量化 20px 步进 :574/580 也可能产生同类 tick，B9 svc 4px 实证）。

**风险**：detick 可能使部分折线多一个折点（评分微降，非违例）；走廊过窄可能增加无解 → 回归验证 orthogonalize 兜底频率。

**清空 KNOWN（M2 部分）**：architecture G6×2（edges[0]/[6]）、microservices G6×4、login-flow G6×1、ecommerce-flow G6×1、mindmap G6×2、B1 G6×2、B9 G6×1 —— 13 项。

#### Q-008 机制 M3：renderGantt 依赖边 L 落点骑目标条左缘 16px（同属 G6 但**不经 router**）

**现状**
- renderGantt 依赖边**手写 L 路径**（render/index.ts:1089-1117）：gap≈0 分支（:1108-1109）`d = M a.x,a.y L b.x,a.y L b.x,b.y` —— 竖直段 x=b.x = **目标条左边界**，从源行中心垂直落到目标条中心，重合目标条上半（条高 32 → 16px）→ G6。
- 实证（复现）：gantt A 档 edges[0..3] 各沿 design/develop/test/launch 框**左边**借道 16px（KNOWN_A:48-51）；B4b edges[0] t3 左 16px（KNOWN_B:53）；B7 edges[1]/[2] t2/t3 左 16px（KNOWN_B:56-57）。gap≥20（:1105-1107）与"目标在左"（:1110-1112）分支无此命中。

**成因**：依赖边的正交化不经过 routeEdge/routeRectilinear，落点垂直段直接取目标左缘列（b.x），未做"距目标条 clearance 后水平垂直进面"处理。修复**不在 router**，在 renderGantt（若门禁 G6 要清零，此项必须纳入，不能只修 routeRectilinear）。

**修复方向建议**：gap≈0 分支改为三段：先水平到 `b.x - clear`（clear≈8~12）→ 垂直到 `b.y` → 水平垂直进目标左面锚点（末段垂直于面、不贴边）；或竖直落列选 `b.x - clear`。约束：保持正交、不穿中间条、不改变"目标在左绕行"分支（B7 三型断言只验正交与 x≥轴起点，路径形态可微调）。

**清空 KNOWN（M3 部分）**：gantt G6×4、B4b G6×1、B7 G6×2 —— 7 项。

### 3.4 与门禁测试的对应总表（KNOWN 清空映射）

修复后 matrix-a/matrix-b 断言将先红（KNOWN 期望在但无违例可配），需**同批**把 KNOWN 集清空回 clean 组：

| 修复桶 | 涉及代码 | 清空的 KNOWN 条目 | 数量 |
|--------|---------|------------------|------|
| Q-001/Q-002 基数定位（router anti-dive/垂直出体 + renderer 面法线外置） | router collapseGridPath/pathHitsOwnBody/shapeEdgePoint；render 918-921 | matrix-a er G4×1；uml-class G4×1 | 2 |
| Q-003 label 画布夹取 | render placeLabelBox 282-336（含调用点 758/924/932） | matrix-a state G5×1 | 1 |
| Q-004 gantt 窄条文本 | render 1131-1135（可选 layout 718） | matrix-a gantt G5×1 | 1 |
| Q-008 renderGantt dep 落点 | render 1089-1117 | matrix-a gantt G6×4；matrix-b B4b×1、B7×2 | 7 |
| Q-006/Q-007 引擎级 anti-ride（routeEdge + routeRectilinear + detick） | router index.ts（routeEdge/routeAStar/collapseGridPath/routeRectilinear）；render 737-744/847-855（端点/owning 组排除面） | matrix-a uml-class G6×2、architecture G6×4、microservices G6×4、login-flow×1、ecommerce-flow×1、mindmap×2；matrix-b B1×2、B5×1、B9×1 | 18 |
| Q-005 B2-LR（layered LR 按宽估算） | layout/layered.ts 200-221/244-245/253-259 | **无 KNOWN 可清**（潜伏缺陷；建议补回归档，spec 决策） | 0 |
| **合计** | | | **29** |

> 一致性核验：matrix-a KNOWN 22 项（er1 + uml3 + state1 + gantt5 + arch4 + micro4 + login1 + ecom1 + mindmap2）+ matrix-b KNOWN 7 项（B1 2 + B4b 1 + B5 1 + B7 2 + B9 1）= 29 项，与上表逐桶相加 2+1+1+7+18 = 29 ✓（Q-005 为无 KNOWN 的潜伏项，不计入清空）。

KNOWN 落点：`matrix-a.test.ts:38-71`（KNOWN_A 表 + :9-23 头部注释）；`matrix-b.test.ts:48-60`（KNOWN_B 表 + :23-25 头部注释）。引擎修复后需同步清空这些表与注释（收编回 clean 断言），golden 快照走 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 + diff 审阅（snapshot.test.ts）。

---

## 4. 竞品参考

**不适用/记录说明**：本 Feature 是引擎内部缺陷修复，无外部竞品对照意义。相关"工程教训"来源为内部 archify 复盘（`docs/research/archify/lessons-for-lgdl.md:114-125`：成品级审计独立视角兜底、orthogonalize/routeRectilinear fallback 专项测试——已在 render-gate 落地为 degraded-paths.test.ts）。留待 spec/plan 决定是否参考成熟正交布线器（如 ELK/klay、dagre）的端点锚定与膨胀参数，本阶段不做方案对比。

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | 门禁 G1~G6 判定规则与容差**不动**（作者裁决），引擎适配门禁而非门禁适配引擎 | spec 阶段核对 state.json scope.out；validate 阶段跑原 audit 确认 0 违例 |
| A-002 | 快照允许显式重建（LGDL_UPDATE_SNAPSHOTS=1）+ diff 审阅，禁止静默更新（state 已声明） | snapshot.test 重建流程 + git diff 审阅 |
| A-003 | 29 项 KNOWN 中 26 项由上述修复桶覆盖；uml-class edges[1] 的 G4 与 G6 同边联动，router 修复后可能自愈 | build/validate 逐项核对 KNOWN 清空映射 |
| A-004 | B2-LR 修复后需补 LR 多 rank 宽卡片回归用例（当前无 KNOWN 守护），否则缺陷可复发 | spec 决策是否新增矩阵档/恢复 B2 多 rank 形态 |
| A-005 | "末端 ≤20px 平行滑入"在 collapseGridPath 是历史设计取舍（:776-781 注释），与 G6 0.5px 口径冲突——作者确认为**缺陷**而非特性 | 见 R-005，需作者最终裁决（scope 已倾向"容器也属 node 不允许贴边走"） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | routeRectilinear 加贴边硬拒/膨胀后，密集障碍场景候选全拒 → fallback 直连可能穿越第三方框（既有 fallback 语义，degraded-paths 场景 3 需保持"不抛+有限+正交"） | 中 |
| R-002 | collapseGridPath 语义收紧 + detick 可能提高 A* 无解 → orthogonalize 兜底增多，输出形态劣化（非违例但视觉差）；需全量矩阵回归确认 | 中 |
| R-003 | 文本位置改动（基数/边 label/gantt 文本）与 LR 坐标漂移 ⇒ golden 快照大面积变化 + svg.test/kind-coverage 结构断言可能红，需同批重建审阅，工作量被低估 | 中 |
| R-004 | B2-LR 修复系统性漂移全部 er/uml-class LR 坐标（A 档 er/uml-class + B2/B8 等），diff 审阅范围大 | 中 |
| R-005 | "贴边=违例"语义边界存在判定张力：垂直进锚点（重合≈0）合法、平行 1px 即违例——router 修复必须精确对齐 audit 的 >0.5px/共线<0.5px 口径，否则"修完仍红"或"误伤" | 高 |
| R-006 | 端点锚点浮点精度（如 entity 顶弧锚 y=40.00000000000005）会放大 pathHitsOwnBody/贴边判定的边界脆弱性，router 修复需先稳定锚点数值 | 中 |
| R-007 | er 基数 G4 的"穿自身节点"走线本身无门禁项覆盖（G3 豁免端点）——若只修 renderer 面法线外置可清 G4，但穿体 visual defect 仍在，需作者确认是否接受"门禁归零但视觉缺陷残留" | 低 |

---

## 6. 下一步建议

> 建议 spec 承接顺序（按"KNOWN 清空收益 × 风险可控"排序）：

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | Q-006/Q-007 引擎级 anti-ride（routeEdge/routeRectilinear detick + 贴边拒判 + collapse 语义收紧） | 清 18 项 KNOWN，量最大；与 R-001/R-002/R-005 联动，需先定"垂直进锚合法、平行 >0.5px 违例"的 router 端实现口径 |
| 高 | Q-008 renderGantt dep 落点改垂直进面（M3） | 独立小改动，清 7 项 KNOWN（gantt×4/B4b/B7×2），注意不在 router |
| 中 | Q-001/Q-002 基数定位（router anti-dive + renderer 面法线外置） | 清 2 项 G4；建议与 Q-006/007 同批（共享 collapse/垂直出体修复），renderer 侧兜底防复发 |
| 中 | Q-003 label 画布夹取 / Q-004 gantt 窄条文本 | 各清 1 项 G5；改动局部、快照影响小 |
| 低 | Q-005 B2-LR layered LR 按宽估算 | 潜伏缺陷（0 KNOWN）；修复 + 补回归档（spec 决策矩阵档形态） |
| 待定 | KNOWN 集清空 + 快照重建 + 回归 | 每桶落地后同步收编 matrix-a/b 断言回 clean；golden 显式重建审阅；测试守恒不降 |

## Feature 拆分建议

三类缺陷虽横跨 render/layout/router 三包，但共享同一修复目标（门禁 29 KNOWN 归零）与同一验收（audit 0 + 快照重建审阅），且 Q-001/Q-002 与 Q-006/Q-007 共享 router 内部修复点（collapse/垂直出体）。**建议不拆分**，作为一个 Feature 交付；内部可按包拆 task（render 文本项 / layout LR / router anti-ride / test KNOWN 收编）。最终是否拆分由用户决定。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：三类缺陷逐一定位（文件:行号实证 + 数值复现）、修复方向、风险、KNOWN 清空映射总表（29 项） | 2026-09-02 | SDDU Discovery Agent |
