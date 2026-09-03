# 技术计划：specs-tree-engine-defect-fixes（引擎缺陷修复 — 三类缺陷选型 + 落地 + 迁移 + 收编）

> **文档定位**: SDDU 技术方案 — 将 spec（13 FR / 8 NFR / 10 EC / D-001~D-005）转化为可执行技术方案：三类缺陷（① EC-001 四项 ② B2-LR ③ G6 贴边三机制）的机制选型、落地文件:行号设计、迁移步骤、测试策略（B12 新档 + KNOWN 清空 + 守恒）、风险矩阵、与门禁 audit 口径同源化（EC-006）；同时消解 spec 开放问题 #2/#3/#4/#6（#1/#5/#7 移交 roadmap/作者/validate）
> **前置依赖**: spec.md（需求规范 v1.0）+ discovery.md（缺陷定位 Q-001~Q-008 / 风险 R-001~R-007 / 29 项 KNOWN 清空映射）——全部源码证据已于 2026-09-02 复核一致（本 plan 行号以当日读码为准，构建前如有漂移以最新为准）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 完成三类缺陷修复方案选型与落地设计；承接 spec D-001~D-005 全部设计决策；消解开放问题 #2（M1 机制）、#3（容差同源化）、#4（gantt 窄条文本策略）、#6（专项断言落点）；输出迁移顺序（router → render → layout → 收编批）与测试策略（B12 / KNOWN 清空 / 守恒 / 一致性 / 专项断言）；ADR 提案 4 项内联本 plan（遵守"只落盘 plan.md"约束不单独建文件，tasks 阶段直接消费）

---

## 1. 前置检查

| 检查项 | 状态 | 说明 |
|--------|:--:|------|
| spec.md 存在 | ✅ | `.sddu/specs-tree-root/specs-tree-engine-defect-fixes/spec.md`（249 行，13 FR/8 NFR/10 EC/5 决策） |
| discovery.md 存在 | ✅ | 同目录（277 行，Q-001~Q-008 + 29 项 KNOWN 映射 + R-001~R-007） |
| 外部 API 文档缓存 | ✅ | 不适用 —— 本 Feature 为**引擎内部缺陷修复**，spec §2.3 无外部服务引用（NG-002 明确不引入第三方布线器）；无 `.sddu/api-docs/` 依赖 |
| 源码行号证据复核 | ✅ | 本次读码复核 router/render/layout/audit/matrix 关键行号与 discovery/spec 一致（偏差 ≤1 行内），证据可信 |
| 前置依赖已满足 | ✅ | 上游 render-gate（b69bbbf）G1~G6 判定与 AUDIT_TOL 常量在库（geometry-audit.ts:35-50）；matrix-a/b KNOWN_A/B、快照更新门（snapshot.test.ts:51-67）在位 |

> **门禁口径锚点（全 plan 的验收基准，不可漂移）**：
> - G6 判定 = `segRideOnBox`（geometry-audit.ts:434-473）：轴对齐段与任一节点/容器框边线共线（距离 < `AUDIT_TOL.edgeRideTolPx=0.5`，:49）且重合 >0.5px 即违例，**无端点豁免**（auditG6 :956-958 注释）；垂直进锚点（重合≈0）天然合法。
> - G4 判定 = 文本与框判交（`labelPadPx=2` 外扩，auditG4 :752-849）：连边文本豁免"端点所在容器"（:774-788）但**不豁免节点框** → 基数落实体框即命中。
> - G5 判定 = 画布越界容忍 `canvasPadPx=1`（auditG5 :861+）。

---

## 2. 架构分析

> 分析现有架构影响和需要的新组件。本 Feature **不新增文件级组件**（修复全落在既有函数内部 + 测试档追加数据条目），架构影响是"三包行为修正 + 一处跨包常量一致性契约"。

### 2.1 现有代码面（均已读码确认）

| 包/文件 | 涉及函数与行号 | 在本 Feature 中的角色 |
|--------|---------------|---------------------|
| `lgdl-router/src/index.ts`（870 行） | `pathHitsOwnBody`(:80-106，segInside :90-102)；`shapeEdgePoint`(:233-317)；`routeEdge`(:119-221，quality :187-206，复查 :213，orthogonalize 兜底 :219-220)；`routeRectilinear`(:563-603，候选 :585-601)；`routeAStar`(:613-747，自身框膨胀 :629-645，锚点走廊 :660-693)；`collapseGridPath`(:754-812，segClear :763-784，自身框平行容差 :776-782)；`pathHugLength`(:523-554) | **缺陷根因主战场**：① 基数穿体（collapse 允许竖穿自身框 + pathHitsOwnBody 浮点短路）③ G6 M1/M2（routeRectilinear/routeEdge 贴边滑行、末端 tick） |
| `lgdl-render/src/index.ts`（1177 行） | `placeLabelBox`(:282-336，isFree :288-293，兜底 :334)；`labelBoxAt`(:246-251，估宽口径)；聚合边路由 :716-770（routeBoxesAgg :737-744，调用 :745，聚合 label :758）；普通边路由 :833-942（routeBoxes :849-855，routeEdge 调用 :863-872，基数绘制 :887-935，src/dst 外推 :908-921，label 绘制 :929-933）；`renderGantt`(:1028-1176，dep 手写 L :1089-1117 gap 分支 :1103-1113，窄条文本 :1131-1135)；`shapeKindFor`(:456-457) | **缺陷②/③ 的 renderer 落点**：① 基数面法线外置兜底（B 面）；① state label 画布夹取（placeLabelBox）；① gantt 窄条文本回退；③ M3 renderGantt dep 垂直进面；③ M1 ride 障碍全集调用点 |
| `lgdl-layout/src/layered.ts`（260 行） | `rankMaxH`(:200-207)；`rowY`(:215-221)；`totalRankH`(:221)；LR 坐标交换 :244-245；LR 画布 :253-256；TB 画布兜底 :258-259 | **缺陷②（B2-LR）根因主战场**：秩轴步进量错误绑定节点高度；LR 画布宽缺 maxNodeRight 兜底 |
| `lgdl-layout/src/index.ts`（798 行） | 入口分发 :120-155（uml-class/er → layoutHierarchical 'LR' :146-148；带组 → layoutGrouped 'LR' :134-138）；`layoutGrouped`(:219-345) 与 `layoutHierarchical`(:349-385) 共用 `layeredRun`/`layoutLayered`；`layoutGantt`(:698-748，画布宽 :718)；`nodeSizes`(:159-184，uml-class 卡 160×48 形态来源 :174) | 缺陷② 受益面（两条入口共用 layered 引擎）；gantt 画布宽上下文（可选辅修，本 plan 决策**不落地**，见 §3.4/§4.1） |
| 测试面 | `matrix-a.test.ts`（KNOWN_A :38-71 + 头注释 :9-23 + assertAudit :73-91）；`matrix-b.test.ts`（KNOWN_B :48-60 + 头注释 :23-25 + assertAuditKnown :63-79）；`test-support/matrix-docs-b.ts`（registry，B2 :110-165 含 B2-LR 偏差注释 :118-120）；`geometry-audit.test.ts`（helper 正反例，25 test）；`degraded-paths.test.ts`（场景 3 :106-159）；`snapshot.test.ts`（11 svg + manifest，更新门 :51-67）；`svg.test.ts`/`kind-coverage.test.ts`（结构断言） | KNOWN 收编目标 + 回归守护载体 |

### 2.2 三类缺陷机制链与修复面总览

| 缺陷类 | 根因链（discovery 实证） | 修复面（本 plan 落地范围） | KNOWN 清空映射 |
|-------|------------------------|--------------------------|---------------|
| ①-1/2 基数落实体框内（G4×2，Q-001/Q-002） | collapseGridPath segClear 只对第三方框判穿（:765-774），对**自身框只查平行贴墙>20px**（:776-782）→ 竖穿自身框的 L 捷径可塌出；pathHitsOwnBody.segInside 要求两端**严格**在框外（:92）→ 锚点浮点 `y=40.00000000000005`（5e-14）被含入框内短路漏判；基数 22px 沿折线局部方向外推（render:908-921）遇滑入/穿体时方向指向体内 | **A 面（router，清根因）**：collapse segClear 自身框内部穿越拒绝 + pathHitsOwnBody 判据重写（先 EC-005 锚点数值稳定化）+ detick；**B 面（renderer，防复发）**：基数沿锚点所在面**外法线**外推 22px（D-001 A+B 强组合） | matrix-a er G4×1 + uml-class G4×1（= 2） |
| ①-3 state 边 label 越界 4px（G5×1，Q-003） | placeLabelBox（render:282-336）无画布边界概念：isFree 只避节点/已放置（:288-293），longestSegmentMid 偏爱贴右缘长竖直段（:258-271），兜底 :334 直接返回越界点 | render `placeLabelBox` 增画布参数 + isFree/候选/回退/兜底全链画布内约束（普通边 :932 与聚合边 :758 与 rel label :924 三调用点口径一致，D-002-1） | matrix-a state G5×1（= 1） |
| ①-4 gantt 里程碑/窄条时间文本越界 ~5.4px（G5×1，Q-004） | 窄条（w<64）外置文本策略（render:1131-1135 text 于条右 6px 起排）未考虑画布右缘；layoutGantt 画布宽（layout/index.ts:718）只覆盖末条右缘 | renderGantt 近右缘检测 + 回退（条左侧/里程碑上方）；**不做 layout 右缘预留**（开放 #4 决策：见 §3.4 对比 B） | matrix-a gantt G5×1（= 1） |
| ② B2-LR 宽>高卡片重叠破画布（Q-005，潜伏 0 KNOWN） | layered.ts 秩轴步进量 = `rankMaxH`（高度）驱动（:215-221 rowY → LR 交换 :244-245 后 x 步距 = 高+RANK_SEP=144 < 卡宽 160 → 重叠 16px）；LR 画布宽 = `totalRankH+MARGIN`（:253-256）按末秩高度估算缺 TB :258-259 的 maxNodeRight 兜底 → 右溢 72px | `layered.ts` 秩轴尺寸按 rankdir 取维度（LR=rankMaxW+RANK_SEP）+ LR 画布宽 = max over nodes(x+width)+GRAPH_MARGIN；语义重命名（rankSize/axisStart）；**新增 B12 回归档**（D-003） | 无 KNOWN 可清；B12 补守护（修复前红证明有效，EC-010） |
| ③-1 M1 大段借道 40~120px（G6，Q-006） | 聚合边 routeBoxesAgg 排除两端点组（render:737-744）；普通边 routeBoxes 排除 owning 组（:853-855）；routeRectilinear 判交仅严格内部（pathCrosses :434-460）→ 沿被排除框边滑行零成本通道被选；routeEdge quality 的 clearBoxes(:191-193) 不含 owning 组 → hug 惩罚不生效 | **净空硬拒（选型见 §3.1）**：routeRectilinear 候选过滤（ride 全集）+ routeEdge quality 纳入 ride 全集；render 两调用点传 ride 全集；fallback/orthogonalize 输出 ride-safe（detick/bump） | matrix-a uml-class G6×2、architecture G6×2、B5 G6×1（= 5 属 M1） |
| ③-2 M2 末端微借道 1~16px（G6，Q-007） | 网格 cell=7 量化（router:622）与浮点 15° 锚点（shapeEdgePoint）列差 + collapse 自身框平行容差 ≤20px（:776-782，与 G6 >0.5px 判定语义冲突，A-005 作者裁决为缺陷）；routeRectilinear 20px 步进通道（:574/580）同类 | collapse 自身框**内部穿越拒绝**（共享 D-001-A 改动）；平行容差语义收敛；**输出 detick pass**（末段用锚点真实坐标垂直落点）；锚点浮点稳定化（EC-005）；routeRectilinear 出口同款（选型见 §3.2） | matrix-a architecture×2、microservices×4、login-flow×1、ecommerce-flow×1、mindmap×2、matrix-b B1×2、B9×1（= 13 属 M2） |
| ③-3 M3 renderGantt dep 骑目标条左缘 16px（G6，Q-008） | renderGantt 依赖边**手写 L 路径**不经 router（render:1108-1109 gap∈[-4,20) 分支）：竖直落列 x=b.x = 目标条左边界 → 垂直段与目标左缘共线 | renderGantt gap 分支重写：gap≥8 用缘间空隙中列；gap≈0 用回穿源右缘 clear 列的**三段式垂直进面**（末段水平垂直进目标左缘；约束：正交/不穿中间条/"目标在左"与 gap≥20 分支不动，B7 断言保绿） | matrix-a gantt G6×4、matrix-b B4b×1、B7×2（= 7 属 M3） |
| ④ KNOWN 收编与回归（FR-011~013） | 修复后 KNOWN_A/B 期望在但无违例可配 → 断言红；golden 坐标漂移 → 快照 diff | 同批收编：KNOWN 全清 + 断言 0 违例 + 头注释更新；快照 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 + diff 审阅 + 独立 commit（D-005）；测试守恒 ≥503；不引新违例 | 29 项全部（2+1+1+5+13+7 = 29 ✓） |

> 一致性核验：上表清空合计 = 基数 2 + state 1 + gantt G5 1 + M1 5 + M2 13 + M3 7 = **29** ✓（与 discovery §3.4 总表、spec D-005-3 核对一致；M1/M2 分组口径 = uml-class infra 98px 属 M1、uml-class payment 2px 属 M2——两处各计入，KNOWN 条目层面 uml-class G6 恰好 2 条分别属 infra(98)/payment(2)，与 discovery 表「uml-class G6×2」一致）。

### 2.3 数据流变更与依赖关系

- **数据流（走线）**：render（聚合 :716-770 / 普通 :833-942 边）→ router（routeRectilinear/routeEdge）→ 折线 pts → renderer 消费（path d + 基数外推 + label 放置）。修复点分布在：**调用方（render 传 ride 全集）→ 路由判定（routeRectilinear 候选过滤 / routeEdge quality）→ 输出后处理（detick/bump）**。
- **数据流（坐标）**：layout（layoutLayered）→ LayoutResult.nodes → renderer。修复点在 layoutLayered 坐标阶段（rankdir 维度化），下游 er/uml-class（含 layoutGrouped 两层）一并受益。
- **数据流（文本定位）**：render 内部函数 `placeLabelBox` / renderGantt 文本策略 → 需新增画布上下文（layout.width/height 已在其作用域内，无需跨层传参）。
- **新增组件**（函数级，无新文件）：
  1. `detickPath`（router，输出级末端垂直化 + 贴边段 bump 修正）——routeEdge/routeRectilinear 出口统一调用；
  2. `segRideOnAnyBox` 或 router 侧 ride 判定 helper（与 audit `segRideOnBox` 几何同构：共线距离 <0.5px + 重合 >0.5px）；
  3. `RIDE_TOL_PX`（router 导出常量 = 0.5，EC-006 同源化载体）；
  4. `faceNormalOf`（render，基数面法线判定，覆盖 entity 顶弧/roundedRect 角弧的容差判面）；
  5. `textWidthEst`（render 或复用 labelBoxAt 口径的通用估宽，CJK 1.0×fs / Latin 0.62×fs）——placeLabelBox 画布检测与 renderGantt 窄条回退共用。
- **跨包依赖**：新增 **render(test) → router 常量一致性 import**（render 包 devDeps 已含 @lgdl/lgdl-router，degraded-paths.test.ts:21 实证）；router 生产代码**不反向依赖** render/audit（audit 在 render test-support，禁止反向 import）。

### 2.4 约束承接（架构不可侵入面）

1. **门禁零改动**（NG-001/NFR-001）：G1~G6 语义、`AUDIT_TOL` 全常量、画布 1px 容忍不动；修复以 audit 判定为唯一验收准绳。
2. **快照纪律**（NG-003/NFR-002/ADR-003）：快照仅在收编批经 `LGDL_UPDATE_SNAPSHOTS=1` 重建一次 + git diff 逐张审阅 + 独立 commit。
3. **测试守恒**（NFR-003）：`test(` 计数 ≥503 只增不删；KNOWN 删除属"断言收编为更强 0 违例"，非删测试。
4. **无新违例**（NFR-004）：全量矩阵 + 快照文档 audit 全绿 0 违例；degraded-paths 场景 1~3 语义保持（不抛/有限/正交，NFR-005）。
5. **确定性/结构**（NFR-006/007）：B3/B4a/B4b/B9 双渲染字节一致；svg.test/kind-coverage 只允许坐标/文本值变化，元素结构/class/`data-lgdl-loc` 不变。
6. **文件变更边界**：本 plan 仅落盘 plan.md 与 state.json；不创建 ADR 独立文件（ADR 提案内联 §7），不触碰 TREE.md/examples/*.svg。

---

## 3. 方案对比

> spec 已锁死高层决策 D-001~D-005；本阶段只对 spec 开放问题 #2/#3/#4/#6 及实现路线做对比。每张表 ≥2 方案，含风险与工作量预估。

### 3.1 开放问题 #2：M1 大段借道的净空约束机制

| 维度 | 方案 A：候选/质量级贴边硬拒（ride 全集过滤） | 方案 B：障碍膨胀 + 锚点外走廊扩展 | 方案 C：聚合/普通边统一走 A* |
|------|:--|:--|:--|
| 描述 | routeRectilinear 候选在 pathCrosses(:595) 之外加 ride 检查（段与任一 ride 框边共线&重合>0.5px 即弃）；routeEdge 的 quality clearBoxes 由 obstacles+src/dst(:191-193) 扩展为 ride 全集（含 owning 组/端点框，与 auditG6 障碍集同构），使 hugPenalty/hugLen 生效；fallback/orthogonalize 输出经 detick+bump 保证不贴边 | 把 routeAStar 的"自身框膨胀 + 锚点外走廊"模型（:629-645/:660-693）推广：对 owning 组/端点组也做膨胀 blocked + 出/入走廊；routeRectilinear 废弃通道搜索改走网格 A* | 聚合边（:716-770）不再走 routeRectilinear，改经 routeEdge(A*) 统一正交路由 |
| 优点 | 改动收敛（两函数 + 两调用点）；routeRectilinear 保留轻量通道搜索（无网格开销）；与 G6 判定"段级共线"直接同构，口径天然对齐；ride 全集 = auditG6 障碍集 → "修完即绿"可预期 | 在搜索源头杜绝贴边（膨胀即禁入带），无"候选贴边再拒"的二次判定；走廊模型在 routeAStar 已验证（普通边自身框已用） | 消除双正交路径器语义分叉；A* 已有自身框防贴边机制，顺带修复聚合边 |
| 缺点 | 需处理"候选全拒 → fallback 贴边"的兜底（bump）；quality 扩展后 A* 若只产出贴边解会全部降权 → 落到 orthogonalize（R-002 观察项） | owning 组是"容器"，端点在内：全 block 会切断可达（payment 在 infra 内、走廊出不去）→ 需"惩罚带"而非硬 block，实现复杂、语义难调；routeRectilinear 改 A* 属小重构，A* 无解率上升会传导到聚合边 | 聚合边 = group↔node/group，A* 需要处理组框"半障碍"语义（与 B 同理卡壳）；改动面跨 router 出口 + render 调用点，聚合边视觉绕行特征会整体变化，degraded 场景 3 的 routeRectilinear 直驱测试需重写 |
| 风险 | R-001（候选全拒 → fallback 穿越）：以 degraded 场景 3 + bump 双兜底；R-005（口径偏移）：ride 判定与 audit 同构 + RIDE_TOL_PX 一致性测试 | R-002 无解率上升显著；半障碍语义容易误伤聚合边合法进出（group 内出边）；调参面大 | R-001/R-002 叠加 + degraded-paths 场景 3 契约破坏（该测试直驱 routeRectilinear fallback，语义即"通道搜索兜底"） |
| 工作量 | **~2.0 人日**（含 detick/bump + ride helper + 调用点 + 回归） | ~3.5 人日 | ~3.0 人日 + 测试重构 0.5 人日 |

### 3.2 开放问题 #2（衍生）：M2 末端微借道的实现路线

| 维度 | 方案 A：collapse 平行容差直接收敛（20px → 0.5px） | 方案 B：源收敛（穿越拒绝 + 容差收紧）+ 输出 detick pass | 方案 C：仅 detick pass（collapse 容差不动） |
|------|:--|:--|:--|
| 描述 | segClear :776-782 的 `pathHugLength > 20` 判拒直接改为 >0.5px；任何沿自身框 >0.5px 的塌缩候选拒 | segClear 同时加"自身框内部穿越拒绝"（竖/横穿 own box 全程即拒）+ 平行容差收敛（>0.5px 不允许塌缩出贴边段）；**并对最终输出加 detick pass**——末段改用锚点真实坐标垂直落点，消除网格列差 tick；routeRectilinear 出口同款（A-005 已裁决缺陷，spec D-001-1/D-004-2 要求两者**都**做） | collapse 保留 ≤20px 中间许可（注释"塌缩短平行段是简化需要"），仅在 routeEdge/routeRectilinear 出口用 detick 消除与任何框边共线的段 |
| 优点 | 源头干净；与 audit 判定数值同源 | **最贴近 spec D-001/D-004 字面要求（AND 关系）**：穿越拒绝修 Q-001 穿体根因（B 方案独有）；容差收敛 + detick 双保险消除 1~6px 列差 tick；中间许可残留被 detick 全部消灭 → 输出级 0 共线 | 改动最小（纯后处理）；collapse 简化收益完全保留；无解率不升（R-002 最小） |
| 缺点 | 收敛到 0.5px 后 collapse 无法塌缩"snap 回锚轴的短平行段"（原注释明示是特性）→ 折点/路径长度增多；**不解决 Q-001 穿体根因**（穿越拒绝缺失） | 改动面最大（一个函数内三处语义 + 新 detick）；detick 对中间段贴 owning 组的修正（bump）需校验不穿第三方 | **不满足 spec D-004-2 的容差收敛要求**（20px 许可仍在，只是输出被掩盖）；collapse 中间态仍可能生成贴边段靠 detick 擦屁股，语义上不如 B 干净；detick 本身仍需写 |
| 风险 | R-002（折点增多、形态劣化）；修完 Q-001 穿体仍残留 → R-007"门禁归零但视觉缺陷残留" | R-002（穿越拒绝可能提高该锚点对无解 → orthogonalize，全量矩阵回归观察）；R-005（detick 修正不得引入新穿边/贴边） | 与 spec 决策冲突（需作者豁免才可选）；R-005 同 B |
| 工作量 | ~0.75 人日 | **~1.5 人日**（detick ~0.75 + collapse 双语义 ~0.5 + routeRectilinear 同款 ~0.25） | ~0.5 人日 + 作者豁免成本 |

### 3.3 开放问题 #4：gantt 窄条文本修复策略

| 维度 | 方案 A：仅 renderer 近右缘回退 | 方案 B：仅 layout 画布右缘预留 | 方案 C：双落地（A+B） |
|------|:--|:--|:--|
| 描述 | renderGantt :1131-1135：外置文本估宽后若 `x+估宽 > layout.width` → 回退为条左侧（end 对齐）或里程碑上方 | layoutGantt :718 画布宽为"最右窄条外置文本"预留宽度（镜像 renderer fs=10 估宽口径） | renderer 回退 + layout 预留双做 |
| 优点 | 改动面收敛在 renderGantt（一个渲染函数）；通吃所有"最右条恰为窄条"情形（不依赖 layout 预判）；估宽口径留在 renderer 侧无跨包耦合 | layout 一次算好，renderer 逻辑零改；画布宽更"满" | 双保险 |
| 缺点 | 最右窄条文本从右侧挪到左侧/上方（视觉微调，快照 diff） | 需在 layout 包**镜像 renderer 的 fs=10/Latin 0.62 估宽口径** → 跨包口径漂移风险（与 EC-007/EC-006 同类问题）；只对"最右条窄"有意义，其他窄条（右方还有条）外置本就安全，预留多余宽度 | 工作量双份；layout 预留与 renderer 回退可能互相掩盖（估宽口径不一致时 layout 留了但 renderer 仍回退 / 反之） |
| 风险 | R-003 快照 diff（launch 文本位置）→ 显式重建审阅；B4b/B7 回归绿即证明 dur=0 同机制覆盖 | 估宽口径双处维护（违 EC-007"沿用既有口径"最小化原则）；预留不足/过度都会造成新 diff | 两处改动互相干扰，diff 审阅面翻倍 |
| 工作量 | **~0.25 人日** | ~0.5 人日 | ~0.75 人日 |

### 3.4 开放问题 #3：router 容差与 audit 口径同源化（EC-006）

| 维度 | 方案 A：router 导出 `RIDE_TOL_PX=0.5` + render 一致性测试 | 方案 B：跨包 import 单一来源（audit 常量被 router import） | 方案 C：仅注释文档对齐 |
|------|:--|:--|:--|
| 描述 | lgdl-router 定义并导出 `RIDE_TOL_PX`（=0.5，注释声明对齐 geometry-audit `AUDIT_TOL.edgeRideTolPx`）；router 内 ride/detick 判定用该常量；render `geometry-audit.test.ts` 新增一致性断言：`AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX === 0.5` | audit 常量移入共享包（或 router 被 render 的 test-support 常量反向依赖），单一物理来源 | 两处各写 0.5，靠注释互相指向 |
| 优点 | 单一数值来源（router 侧）；一致性测试在构建期捕获漂移；不改包依赖结构（render test devDeps 已含 router，degraded-paths:21 实证）；audit（test-support）保持零生产依赖 | 物理单源最彻底 | 零改动 |
| 缺点 | 两处常量仍物理并存（靠测试锁一致）——语义单源 + 测试锁，非物理单源 | audit 在 render 包 test-support 内，router 是独立 leaf 包 → **反向依赖方向错误**（router 不能 import render 的测试文件）；需把常量下沉 core 包或新共享位置 → 动包结构，违背 NG-002"不换架构"精神 | 漂移零防护（EC-006 明确要求"单一来源或一致性测试"，C 不满足） |
| 风险 | 低（测试失败即红） | 中（包结构调整波及 lgdl-core 或新增共享模块，破坏最小化） | 高（R-005 复发） |
| 工作量 | **~0.25 人日**（常量 + 1 条断言） | ~0.75 人日 + 包结构审查 | ~0.05 人日（不可取） |

### 3.5 开放问题 #6：er/uml-class 穿体消除的专项断言落点

| 维度 | 方案 A：matrix-a 档内路径级断言 | 方案 B：geometry-audit helper 扩展 | 方案 C：独立 router 单测（合成数据） |
|------|:--|:--|:--|
| 描述 | matrix-a.test.ts 中 er/uml-class 文档用例内，解析 edges[0]/edges[1] 的 `<path d>`，断言任一段不与 from/to 实体框内部相交（锚点边界除外；G3 豁免端点故门禁 0 违例不足以证明穿体消除，spec FR-001-③） | 在 geometry-audit.ts 导出新的测试侧断言函数（非 G1~G6 规则），矩阵调用 | router 包新增 routeEdge 直驱测试：合成"锚点顶出 + 目标右下"几何，断言输出不穿 src 自身框 |
| 优点 | 断言绑定**真实 A 档文档**（er edges[0]/uml edges[1] 即缺陷实证本体，fixture 由真实 DSL 构造符合 matrix-a"禁手造 fixture"纪律）；矩阵回归语义正确 | 断言逻辑可复用（未来新文档同样可查） | router 单元级最直接；不依赖 SVG |
| 缺点 | 需在 matrix-a 本地做轻量 path d 解析（M/L token，~15 行）；断言只覆盖 A 档两例 | geometry-audit 语义文件混入"非六类违例"检查 → 污染 audit 纯粹性（文件头自述 G1~G6 六类）；helper 扩展需另起测试入口，仍要 A 档数据驱动 | **合成数据无法覆盖 er/uml A 档真实几何**（两例正是"特定文档的特定锚点组合"踩坑）；与 FR-001-③"matrix-a 专项断言"的验收表述（spec 落点即 A 档）不一致 |
| 风险 | 低（解析器只认本项目自产 path 格式，M/L 命令稳定） | 中（audit 语义污染；svg.test/geometry-audit.test 可能连锁红） | 高（测了不等于 er A 档真绿——验收证据不足） |
| 工作量 | **~0.25 人日** | ~0.5 人日 | ~0.5 人日 |

---

## 4. 推荐方案

### 4.1 决策汇总（承接 spec D-001~D-005 + 开放问题决议）

| 决策项 | 结论 | 理由（对应方案对比） |
|--------|------|---------------------|
| D-001 A+B 落地 | 全量保留：A 面（router 穿越拒绝 + segInside 重写 + 锚点稳定 + detick）+ B 面（renderer 面法线外置） | spec 强需求；B 单独可清 G4 但穿体 visual defect 残留（R-007 不接受） |
| 开放 #2（M1 机制） | **方案 A：候选/质量级贴边硬拒（ride 全集）** | 改动收敛、与 audit 段级判定同构、聚合边保留轻量通道搜索；B/C 的"半障碍膨胀/统一 A*"在 owning 组可达性上卡壳且改动面大 |
| 开放 #2（M2 路线） | **方案 B：源收敛 + 输出 detick pass** | 唯一满足 spec D-004-2（容差收敛 **AND** detick）且覆盖 Q-001 穿体根因；C 与 spec 冲突不可选 |
| 开放 #4（gantt 窄条） | **方案 A：仅 renderer 近右缘回退** | 估宽口径不跨包（EC-007 最小化）；layout 预留需镜像 renderer 口径造成双处漂移面 |
| 开放 #3（容差同源化） | **方案 A：router `RIDE_TOL_PX` 导出 + render 一致性测试** | 满足 EC-006"单一来源或一致性测试"；不破坏包依赖方向 |
| 开放 #6（专项断言） | **方案 A：matrix-a 档内路径级断言** | 绑定真实 A 档实证几何；验收证据与 FR-001-③ 表述一致 |
| D-003 B12 档 | 新增 matrix-docs-b 条目 + matrix-b 测试（断言两两不相交 + 不溢出 + audit 0） | spec 决策；B2 现档维持单 rank 纵排不动，intent 注释更新引用 B12 |
| D-005 收编批次 | KNOWN/断言/头注释与修复**同一收编批**；快照收编批内**一次性**显式重建 + 独立 commit | 避免 er/uml 快照被 router+layout 两轮重建（中间态不重建快照） |
| 迁移顺序 | **router → render → layout → 收编批**（见 §4.3） | router 改动面最集中且清空量最大（18+2）；render 需随 router 同步 ride 调用点；layout LR 独立且 golden 漂移最大 → 后置使中间回归面最小 |

### 4.2 落地设计（按桶，含文件:行号）

#### 桶 R1：router 引擎修复（D-001-A + D-004 M1/M2 的 router 面）

**R1.1 锚点数值稳定化（EC-005，先置条件）**
- `router/index.ts`：routeEdge 的锚点封装 `srcPt`/`dstPt`(:145-146) 输出经 `snapPt`（新增，`(v)=>Math.round(v*1e6)/1e6` 级）稳定化；routeRectilinear 入口对 src/dst 同款 snap。消除 entity 顶弧 `y=40.00000000000005`（shapeEdgePoint :259-283 浮点解）级 5e-14 噪声对后续判定（segInside/ride/detick）的边界放大（R-006）。

**R1.2 `pathHitsOwnBody.segInside` 判据重写（D-001-A-2）**
- `:90-102` 现要求"两端都严格在框外"（`out(a)&&out(c)`，:92）→ 锚点贴边界（snap 后 = box.y）使起点非 out → 短路不判。重写为**段与框内部交集**判据：轴对齐段，垂直段在 `box.x+0.5 < x < box.x+box.w-0.5` 且 `max(lo,box.y) < min(hi,box.y+box.h) - 0.5`（y 范围与框体有 >0.5px 内部交集）→ 穿体；水平段镜像。锚点贴边（y=box.y）时段伸入框内即产生正交集 → 正确捕获"起于边界、穿体而过"；合法垂直进上/下面（段完全在框外，交集 0）不受影响。
- 该函数被 routeEdge 复查 :213 与 quality :188 调用 → 重写后穿体候选自动被弃，A* 换锚点对重试（:210-216）。

**R1.3 `collapseGridPath.segClear` 自身框双语义（D-001-A-1 + D-004-M2）**
- `:763-784`：对 `ownBoxes`（:782 前）增加：
  - **内部穿越拒绝**：段横穿 own box 全程（与 R1.2 同判据）→ 塌缩候选拒（堵死"走廊绕行被塌成穿体 L 捷径"，Q-001 根因）；
  - **平行贴墙容差收敛**：`pathHugLength([a,b],ownBoxes,m)>20`（:782）收紧为对齐 G6 口径 `>RIDE_TOL_PX` 即拒（A-005 已裁决为缺陷；拒绝沿自身墙 >0.5px 的塌缩段）。
- 注意：boxes（第三方）循环 :765-774 不动；自身框语义是增量。

**R1.4 输出 detick pass（D-004-M2，新增函数）**
- 新增 `detickPath(pts, srcAnchor, dstAnchor, srcNode, dstNode, rideBoxes)`（router 内部）：
  - 对首末段：若与 src/dst 锚点所在面**平行**（段沿面滑行）或与任一 rideBox 边线共线（距离 <`RIDE_TOL_PX`）且重合 >0.5px → 将相邻折点移到锚点所在面的法向坐标上，使入/出段与锚点面**严格垂直**（垂直段与框边重合≈0，天然不命中 G6）；
  - 对中间段贴 rideBox 边线者 → 以 bump（段向框外侧平移 `RIDE_TOL_PX`+ε 或插入 8px 垂直偏移折点）修正，修正后重新校验 `pathCrosses`（不穿第三方）与 `pathHitsOwnBody`；
  - routeEdge 返回前（:217 `if(best)` 与 :220 orthogonalize 兜底两路）统一过 detick → **fallback 输出也 ride-safe**。
- routeRectilinear 返回前（:602 前）同款 detick（其 20px 步进通道 :574/580 产生的贴边 tick 一并消除，B9 svc 4px 实证）。

**R1.5 ride 全集硬拒（D-004-M1，方案 3.1-A）**
- router 新增 `segRideOnAnyBox(a,b,boxes)`（与 audit `segRideOnBox` :434-473 同构：水平段查框上/下边、垂直段查左/右边，共线 <`RIDE_TOL_PX` 且重合 >0.5px）：
  - `routeRectilinear` 候选循环（:594-601）在 `pathCrosses`(:595) 后加 ride 检查 → 贴 rideBox 边候选弃；
  - `routeEdge` 的 quality（:187-206）：clearBoxes 由 `obstacles+srcNode+dstNode`(:191-193) 扩展为 **ride 全集**（新增 opts.rideBoxes 入参，缺省 = clearBoxes），使 hugPenalty(:197) 与 hugLen(:200) 对 owning 组/端点框贴边生效。
- 签名向后兼容：`routeEdge`/`routeRectilinear` 新增可选入参（degraded-paths.test.ts:70/:119 直驱调用不传 → 缺省行为 = 现语义 + rideBoxes=boxes，测试保持绿）。

**R1.6 常量导出（EC-006）**
- router 新增 `export const RIDE_TOL_PX = 0.5;`（注释：对齐 render test-support geometry-audit `AUDIT_TOL.edgeRideTolPx`，见一致性测试 T6.4）。

#### 桶 RD：render 调用点同步 + 基数面法线外置（D-001-B）

**RD.1 ride 全集调用点**
- 聚合边 `:745`：`routeRectilinear(src,dst,routeBoxesAgg,[src,dst])` 增加 rideBoxes = **全 layout.nodes + 全 boxOf 容器**（含端点节点/端点组，与 auditG6 :961-972 障碍集同构）——注意**避障 boxes 仍是 routeBoxesAgg**（可达性不变），仅 ride 判定用全集。
- 普通边 `:863` routeEdge opts 增加 `rideBoxes` = 同上的全节点 + 全容器（当前 clearBoxes 不含 owning 组 infra → 贴 infra 底 98px 无惩罚，R1.5 后惩罚生效）。

**RD.2 基数面法线外置（D-001-B，:896-930）**
- 新增 `faceNormalOf(box, anchor)`：anchor 距 4 边取最近（容差 ~1px，覆盖 roundedRect 角弧 r=6 与 entity 顶弧 r=10 弧点——弧点距弧所在面 <r 时判该面）；外法线 = 上(0,-1)/下(0,1)/左(-1,0)/右(1,0)。
- `srcCard = p0 + normal_src * 22`、`dstCard = pn + normal_dst * 22`（:920-921 替换）——dst 外法线指向远离 dst 框方向（与原 `-dUx*22` 的"出体反向"语义一致，但不再依赖折线局部方向，与路由质量解耦）。绘制 y-6（:929-930）保持。
- EC-009：B8（基数全枚举双向 22px 外置不压框）回归必须保绿 → 外法线方向对 4 面 + 15° 锚点全覆盖；若 22px 外推落点与近邻框判交（textBoxOf 估宽），validate 实测确认 B8 不误伤（现 B8 绿 = 现几何 22px 无压框 → 面法线在正常出体场景与原局部方向一致，仅滑入/穿体场景翻转修正）。

#### 桶 RP：render 文本越界（D-002）

**RP.1 `placeLabelBox` 画布夹取（Q-003，:282-336）**
- 签名增画布参数（canvasW/canvasH 或 `{w,h}`）；`isFree`(:288-293) 增加"labelBoxAt 估宽 bbox 完整落在画布内"约束（右/下缘 ≤ 画布边界 + `canvasPadPx=1` 同款容忍；左/上缘 ≥ 0）；
- 候选循环（:319-325）与回退循环（:327-333）的越界候选自然被 isFree 拒；
- **最终兜底 :334 改为 clamp 后放置**（不再无条件返回越界 ideal）：`x=clamp(ideal.x, w/2, canvasW-w/2)` 等，保证无路径返回越界点 → auditG5 必 0；
- 三调用点口径一致（D-002-1）：普通边 label :932、聚合边 label :758、rel label :924，均传 `layout.width/layout.height`。聚合边 bg rect（:759-762，宽 w+8 11px 口径）在调用点对返回点做 bg 级 clamp（细节 build 定，约束 = bg rect 不出画布）。
- 影响预期：state edges[5] "用户取消" 的贴右缘竖直段中点 (700,925)（估宽 48 → 724>720）候选全越界 → 剔除后落到合法水平段/更左候选（最长段仍优先但受画布约束筛选）。

**RP.2 renderGantt 窄条文本回退（Q-004，:1131-1135，方案 3.3-A）**
- 外置分支（`!inside`）：计算外置文本起点 `x = node.x + node.width + 6` 与估宽 `w = textWidthEst(timeText, 10)`（新增估宽 helper，CJK 1.0×fs/Latin 0.62×fs，与 labelBoxAt :249 口径一致；"18d +1d" 全 ASCII → 7×6.2=43.4）；
- 若 `x + w > layout.width`（含容差）→ 回退：**条左侧 end 对齐**（`text(node.x - 6, cy, …, 'end')`）——条与左 label 列间通常有充足空白（launch x=980 vs label 列 248）；里程碑（:1136-1143）可优先"钻石上方居中"变体（build 选一，两变体均满足画布内）；dur=0 milestone（条宽 20）同机制覆盖（:100 mermaid 常态）；
- 文本语义 `${start}d +${dur}d` 不变（NG-005）。不做 layout 右缘预留（layout/index.ts:718 不动）。

**RP.3 renderGantt dep 垂直进面（M3/Q-008，:1103-1113）**
- `gap∈[-4,20)` 分支重写（现 :1108-1109 单 L 骑目标左缘）：
  - `gap≥8`：垂直列取缘间空隙中列 `cx = a.x + gap/2`（不贴源右缘/目标左缘）→ 四段 `M a L (cx,a.y) L (cx,b.y) L b`；
  - `gap<8`（≈0，两缘相接）：垂直列取**回穿源右缘 clear**：`cx = a.x - clear`（clear≈8~12，>0.5px 判定余量充足）→ 三段 `M a L (cx,a.y) L (cx,b.y) L b`（末段水平从 cx 进 b.x，与目标左缘垂直 → 不命中 G6；回穿源条的短段属 dep 自身端点 from，G3 豁免；与源条右缘距离 clear → 不共线不贴边）。
- 硬约束：保持正交；不穿中间条；`gap≥20`（:1105-1107）与"目标在左"（:1110-1112）分支**不动**（B7 三型断言：正交 + x≥轴起点，路径形态可微调 —— 该断言只验形态性质，对本分支形态变化免疫，须实测确认绿）。

#### 桶 LL：layout layered LR 修复（D-003）

**LL.1 `layered.ts` 秩轴尺寸按 rankdir 取维度（:200-221）**
- 保留 `rankMaxH`（现算 :201-207）**仅作 TB 秩轴尺寸与交叉轴参照**；新增每秩 `rankMaxW`（该秩 max 节点宽度）；
- `rowY` 语义重命名为 `axisStart`：步进量按 rankdir 取 `(rankdir==='LR' ? rankMaxW[r] : rankMaxH[r]) + RANK_SEP`（:219 改）；`totalRankH`（:221）仅 TB 用（更名 `totalRankExtent` 或保留并在 LR 分支不再引用）。
- TB 行为零变化（rankdir==='TB' 时步进仍 rankMaxH+RANK_SEP）——FR-005-② 验收。

**LL.2 LR 画布宽按节点实际右缘兜底（:253-256）**
- LR 分支 `width` 改为 `Math.max(...[...pos.values()].map(p=>p.x+p.width)) + GRAPH_MARGIN`（镜像 TB :258-259 的 maxNodeRight 兜底）；height 保持 `maxLayerW + GRAPH_MARGIN*2`（交叉轴层宽）不变。
- 影响面：layoutHierarchical（er flat LR）+ layoutGrouped（uml-class 两层 LR，intra-group 与 top-level 都经 layoutLayered）→ 两入口一并受益（D-003-4）；B2 现档单 rank：width 由 218 → ~240（节点 x+宽+MARGIN），节点坐标不变（单 rank rowY[0]=40 不动），仅画布宽变化 → B2 无 golden，断言绿。

**LL.3 B12 回归档（D-003-3）**
- `matrix-docs-b.ts` registry 追加 B12 条目（uml-class、无 group → layoutHierarchical LR、4 张无成员短卡 a→b→c→d 链、卡 160×48 宽>高，与 discovery Q-005 实证形态一致）；intent 注明"暴露 B2-LR 缺陷的回归档，修复前 G5 红（画布 560 < 末卡右缘 632 溢出 72px），修复后 0 违例"；
- B2 intent 注释（matrix-docs-b.ts:118-120）更新：标注"偏差 B2-LR 已由 B12 档覆盖回归，本文档维持单 rank 纵排折叠验证形态"；
- `matrix-b.test.ts` 新增 B12 用例：`renderClean('B12')`（KNOWN_B 无条目 → 0 违例断言）+ **显式两两不相交断言**（layout.nodes bbox 两两 `overlap===0`）+ 全部节点 `x+width ≤ layout.width`（不溢出）——重叠/溢出本身非 G1~G6，故显式断言不可省（spec FR-007-①）。

#### 桶 T6：收编与回归（D-005，见 §4.3 M5）

### 4.3 迁移步骤（工作顺序 = 提交/验证顺序）

> 顺序原则：**router → render → layout → 收编批**。router 清空量最大（M1 5 + M2 13 + 基数穿体根因）且改动集中于单文件，先行；render 调用点（ride 全集）必须与 router 新签名同步推进（否则中间态语义不一致）；layout LR 独立无依赖但 golden 漂移最大 → 后置使中间渲染回归面最小；**KNOWN 收编与快照重建只在收编批一次性做**（M1~M4 中间态允许 matrix 断言红——KNOWN 期望随修复逐项消失——但 degraded/audit-helper/svg/kind-coverage/snapshot 中**除快照 diff 外**必须保持绿；快照 diff 在收编批前属预期红）。

| 步 | 内容 | 验证点 | 交付形态 |
|----|------|--------|---------|
| M0 | 基线：跑全仓测试记录 503 绿基线 + git clean 确认 | `npm test` 全绿 503 | 基线记录 |
| M1 | **桶 R1**（router 全部改动 R1.1~R1.6）+ **桶 RD.1**（render ride 调用点） | ① degraded-paths 场景 1~3 全绿（fallback/orthogonalize 语义保持）；② geometry-audit.test/svg.test/kind-coverage 绿；③ matrix-a/b 跑一遍记录 KNOWN 消失映射（er/uml G4、各 G6 应逐项转绿；**无新违例出现**——violations 不出现未知 type/docRef）；④ snapshot 预期红（走线变 → 字节 diff）但**不重建** | router 修复 commit（含 render 调用点） |
| M2 | **桶 RP.3**（renderGantt dep 三段式） | matrix-a gantt G6×4 + B4b + B7 转绿；B7 三型断言绿；正交性由 auditG2 兜底验证 | renderGantt M3 commit |
| M3 | **桶 RD.2 + RP.1 + RP.2**（基数面法线 + placeLabelBox 画布 + gantt 窄条文本） | er/uml G4 转绿（若 M1 已自愈则此处回归确认）；state G5、gantt G5 转绿；B8 基数全枚举回归绿（EC-009）；B5/B6 聚合 label 不劣化（0 违例） | renderer 文本 commit |
| M4 | **桶 LL.1~LL.3**（layered LR + B12） | B12 用例绿（两两不相交 + 不溢出 + audit 0）；B2 单 rank 形态绿；er/uml A 档 audit 0（LR 坐标漂移后走线经已修 router 重算仍 0 违例——**关键回归点**）；TB 文档零变化确认（坐标断言/快照除预期外无 TB 文档 diff） | layout + B12 commit |
| M5 | **收编批**（D-005，单一批次）：① matrix-a/b KNOWN_A/B 全清 + 断言收编 0 违例 + 头注释更新（matrix-a.test.ts:9-23/:38-71/:73-91、matrix-b.test.ts:23-25/:48-60/:63-79）；② er/uml 专项断言落位（matrix-a 档内，方案 3.5-A）；③ RIDE_TOL_PX 一致性测试（geometry-audit.test.ts）；④ `LGDL_UPDATE_SNAPSHOTS=1` 快照一次性重建 + sha256 manifest 更新 + **git diff 逐张审阅**（坐标/文本/走线类变化确认有意；结构性变化——形状/class/元素增删——停下审查，EC-002）；⑤ 全量 `npm test` 全绿 ≥503+新增 | ① audit 0 违例（KNOWN 无残留）；② 快照 diff 审阅记录；③ test 计数 = 基线 + B12 + 一致性测试 + 其它新增；④ git 历史无"修了未收编/收了未修"中间态 commit（EC-001） | 收编独立 commit（快照变更单列 commit，ADR-003） |
| M6 | 交接 validate：全量矩阵 + snapshot + degraded + B12 复跑；B12 修复前红证据归档（git stash M4 前 diff 或 commit 历史实证）；容差/估宽参数（clear、detick bump、回退变体）若 build 需微调须记录 | validate 阶段逐 FR 核对清空映射 29 项无遗漏、无幽灵清空（NFR-008） | plan → tasks → build → validate 移交 |

> **为什么收编不逐桶做**：M1（router 走线）与 M4（layout LR 坐标）都改 er/uml-class golden；逐桶收编会让 er/uml 快照重建 2 轮、diff 审阅面翻倍；且收编批把"断言从已知集收编为 0 违例"集中一次完成，CI 只验最终态（EC-001）。

### 4.4 测试策略

| 测试面 | 现有载体 | 本 Feature 动作 | 守恒影响 |
|--------|---------|----------------|---------|
| **B12 新档**（FR-007） | matrix-docs-b.ts registry + matrix-b.test.ts | 新增 B12 条目 + 用例（两两不相交 + 不溢出 + audit 0，修复前红证明档有效 EC-010） | matrix-b `test(` +1 |
| **KNOWN 清空**（FR-011） | matrix-a.test.ts :9-23/:38-71/:73-91、matrix-b.test.ts :23-25/:48-60/:63-79 | KNOWN_A/B 常量删除、头注释更新、assertAudit/assertAuditKnown 收编为 0 违例（`assert.deepEqual(violations, [])`）——**断言增强非删测试**（NFR-003 许可） | 0（删除的是数据/注释非 test()） |
| **专项断言**（FR-001-③） | matrix-a.test.ts | er edges[0] / uml-class edges[1] 用例内加 path d 段与 from/to 框内部判交断言（不新增 G 规则） | 0（同 test() 内加断言） |
| **容差一致性**（EC-006） | geometry-audit.test.ts | 新增：`AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX(===0.5)` | +1 |
| **守恒**（FR-013/G-005） | 全仓 | 收编批后核对 `test(` ≥503+2；git diff 无既有 *.test.ts 删除行/断言弱化（review 核查） | 净增 |
| **degraded/兜底**（NFR-005） | degraded-paths.test.ts（场景 3 :106-159） | 保持全绿（签名向后兼容）；若 routeRectilinear ride 后 fallback 触发频率变化 → 观察记录，必要时补"fallback 输出不贴边"场景 4 | 保持 |
| **语义锁**（NFR-007） | matrix-b B3/B4a/B4b/B9 双渲染 | 保持绿（渲染确定性） | 0 |
| **结构断言**（NFR-006） | svg.test / kind-coverage | 坐标/文本值变化随快照重建同步审阅；元素结构/class/data-lgdl-loc 不变 → 断言不改（D-005-4 不得弱化） | 0 |
| **快照**（FR-012） | snapshot.test.ts（11 svg + manifest） | 收编批 M5 一次性 `LGDL_UPDATE_SNAPSHOTS=1` 重建 + git diff 审阅 + 独立 commit | 0 |
| **修复前红证据**（EC-010） | B12 | M4 前跑 B12 = 红（G5 溢出）；归档复现记录 | — |

---

## 5. 文件影响分析

| 操作 | 文件路径 | 说明（行号按 2026-09-02 读码） |
|:--:|------|------|
| MODIFY | `packages/lgdl-router/src/index.ts` | R1.1 snapPt + srcPt/dstPt(:145-146)/routeRectilinear 入口稳定化；R1.2 pathHitsOwnBody.segInside(:90-102) 交集判据重写；R1.3 collapseGridPath.segClear(:763-784) ownBoxes 穿越拒绝 + 平行容差收敛；R1.4 新增 detickPath + routeEdge(:217/:220)/routeRectilinear(:602 前) 出口调用；R1.5 新增 segRideOnAnyBox + routeRectilinear 候选过滤(:594-601) + routeEdge quality clearBoxes(:191-193) 扩展 rideBoxes + opts 入参(:119-129)；R1.6 新增 RIDE_TOL_PX 常量导出 |
| MODIFY | `packages/lgdl-render/src/index.ts` | RD.1 聚合边 routeRectilinear 调用(:745) + 普通边 routeEdge 调用(:863) 传 ride 全集；RD.2 基数绘制 :896-930（faceNormalOf 新增 + srcCard/dstCard :920-921 外法线外推）；RP.1 placeLabelBox(:282-336) 画布参数 + isFree/兜底 clamp + 三调用点(:758/:924/:932)；RP.2 renderGantt 窄条文本 :1131-1135 近右缘回退 + textWidthEst 新增；RP.3 renderGantt dep :1103-1113 gap 分支三段式重写 |
| MODIFY | `packages/lgdl-layout/src/layered.ts` | LL.1 rankMaxW 新增(:201-207 旁) + rowY→axisStart 步进按 rankdir 取维度(:215-221)；LL.2 LR 画布宽 maxNodeRight 兜底(:253-256)；语义重命名注释 |
| MODIFY | `packages/lgdl-render/src/matrix-a.test.ts` | M5 收编：KNOWN_A(:38-71) 删除、头注释(:9-23) 更新、assertAudit(:73-91) 收编 0 违例；专项断言（er/uml-class 档内 path d 判交） |
| MODIFY | `packages/lgdl-render/src/matrix-b.test.ts` | M5 收编：KNOWN_B(:48-60) 删除、头注释(:23-25) 更新、assertAuditKnown(:63-79) 收编 0 违例；新增 B12 用例（两两不相交 + 不溢出） |
| MODIFY | `packages/lgdl-render/src/test-support/matrix-docs-b.ts` | B12 registry 条目新增；B2 intent 注释(:118-120) 更新引用 B12 |
| MODIFY | `packages/lgdl-render/src/geometry-audit.test.ts` | 一致性断言：`AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX`（import @lgdl/lgdl-router） |
| MODIFY | `packages/lgdl-render/src/test-assets/golden/*.svg` + `manifest.json` | M5 快照显式重建（er/uml-class/state/gantt/architecture/microservices/login-flow/ecommerce-flow/mindmap/datastream 等凡坐标/走线变化者；确切清单以 M5 diff 为准）+ sha256 manifest 更新 —— **仅经 LGDL_UPDATE_SNAPSHOTS=1** |
| NEW（函数级，无新文件） | `lgdl-router`（detickPath / segRideOnAnyBox / snapPt / RIDE_TOL_PX）、`lgdl-render`（faceNormalOf / textWidthEst） | 均落在上述既有文件内，**不新增源文件** |
| DELETE | — | 无文件删除（KNOWN 数据删除在 matrix 文件内完成） |

> 文件变更边界提醒：examples/*.svg 磁盘产物不在本 Feature（NG-003）；TREE.md 由后续目录导航 Skill 按需更新（本 plan 遵守文件约束不触碰）。

---

## 6. 风险评估

> 承接 discovery R-001~R-007 与 spec EC-001~EC-010，补本 plan 选型新增风险。概率/影响高=需缓解动作，缓解后残余风险移交 build/validate。

| # | 风险描述 | 概率 | 影响 | 缓解措施 |
|---|---------|:--:|:--:|----------|
| R-001 | routeRectilinear ride 硬拒后密集障碍候选全拒 → fallback 直连贴边/穿越第三方（degraded 场景 3 语义） | 中 | 中 | fallback 输出过 detickPath（含 bump）保证不贴边；degraded 场景 3 保持绿即契约未破；EC-003 接受视觉绕行变长（非违例）；若 bump 引入穿越 → 触发 degraded 语义核查并上报 |
| R-002 | collapse 穿越拒绝 + 容差收敛 → A* 该锚点对无解 → orthogonalize 兜底增多（形态劣化非违例） | 中 | 中 | M1 全量矩阵回归统计 orthogonalize 触发频率（对比 M0 基线）；B12/新矩阵档重点观察；兜底输出经 detick 不贴边/穿越；若显著恶化上报作者（EC-004） |
| R-003 | 文本改动（基数/label/gantt 文本）+ LR 坐标漂移 ⇒ golden 快照大面积变化 + 结构断言可能红 | 中 | 中 | 收编批一次性显式重建 + git diff 逐张审阅（EC-002：结构性变化停下审查）；svg.test/kind-coverage 只允许坐标/文本值变化，断言语义不弱化 |
| R-004 | B2-LR 修复系统性漂移全部 er/uml-class LR 坐标（A 档 er/uml-class + B2/B8 等） | 中 | 中 | TB 行为零变化（FR-005-② 显式验收）；LR diff 集中审阅；B12 两两不相交断言锁新坐标无重叠 |
| R-005 | "贴边=违例"语义边界张力：垂直进锚合法 / 平行 0.5px 即违例——router 修复未精确对齐 audit 口径 → 修完仍红或误伤 | **高** | **高** | ride/detick 判定与 audit `segRideOnBox` 几何同构（共线 <0.5px + 重合 >0.5px）；`RIDE_TOL_PX` 导出 + 一致性测试（EC-006 落位）；validate 全量矩阵实测"无修完仍红/无误伤" |
| R-006 | 锚点浮点精度（5e-14 级）放大 segInside/ride/detick 边界脆弱性 | 中 | 中 | R1.1 锚点数值稳定化（EC-005）作为 router 修复**先置步骤**；判据含 >0.5px 内部交集容差，边界噪声不再短路 |
| R-007 | 穿体走线本身无门禁项覆盖（G3 豁免端点）——只修 B 面可清 G4 但穿体视觉缺陷残留 | 低 | 低 | D-001 A 面（穿越拒绝 + segInside 重写）消除穿体本身；matrix-a 专项断言（FR-001-③）作为测试侧自查，证明折线不穿 from/to 框内部 |
| R-008（新） | detickPath 的 bump 修正中间段贴边时，修正后与第三方框新产生穿越/贴边（修一个坏一个） | 中 | 中 | detick 修正后强制复验 `pathCrosses` + `pathHitsOwnBody` + ride 检查，通不过则保留原路径并记录（不静默劣化）；全量矩阵 0 违例为最终闸门 |
| R-009（新） | renderer 面法线判面（RD.2）对 entity 顶弧/roundedRect 角弧误判面 → 22px 外推方向翻转、基数误置 | 低 | 中 | faceNormalOf 容差覆盖 r=6/r=10 弧区；B8 基数全枚举回归保绿（EC-009）；validate 实测正常外置基数无回归 |
| R-010（新） | placeLabelBox 画布约束收紧后 dense 边束（B5/B6 聚合 + 普通边同通道）无合法候选 → 兜底 clamp 产生 label 与节点框重叠新 G4 | 中 | 中 | clamp 仅作最后手段且 clamp 后仍过 isFree 障碍检查（优先选合法次优）；B5/B6 回归绿；state 档实测 label 落点可读 |
| R-011（时间） | M5 快照重建 diff 审阅面超出预估（11 档多数变化）+ 收编批一次合入大 diff 难以 review | 中 | 低 | 迁移步骤 M1~M4 分 commit 保持小步可审；快照独立 commit 且 diff 按文档逐张核对；工作量预估已含审阅缓冲（§3 合计 ~6 人日） |
| R-012 | 开放问题 #7 余量：容差收敛后矩阵未覆盖的 1~16px 平行滑入场景（KNOWN 外） | 中 | 低 | M5 全量矩阵实测收集全部 violations（非仅 KNOWN 配对）；若现未知违例 → 属引擎缺陷同批修复（不新增 KNOWN，FR-013 无新违例约束） |

---

## 7. 生成的 ADR

> 本 Feature 的架构决策源 = spec D-001~D-005（已定，不重复成 ADR）；下列 4 项为本 plan 对开放问题的**技术实现选型决议**。遵守任务文件约束（只落盘 plan.md），ADR 以提案表内联记录（PROPOSED），tasks/build 阶段直接消费；如需独立 ADR 文件由后续 Agent 按编号落位（feature 目录当前无 ADR，无编号冲突）。

| ADR | 标题 | 状态 | 内容摘要 |
|-----|------|:--:|---------|
| ADR-001 | M1 大段借道 = 候选/质量级 ride 硬拒（非膨胀非统一 A*） | PROPOSED | routeRectilinear 候选过滤 + routeEdge quality 扩展 ride 全集（与 auditG6 障碍集同构）；避障 boxes 不变、ride 判定用全集；fallback/orthogonalize 输出经 detick 保证不贴边（承接 spec 开放 #2，方案 3.1-A） |
| ADR-002 | M2 末端微借道 = 源收敛 + 输出 detick pass | PROPOSED | collapse 自身框穿越拒绝 + 平行容差收敛至 RIDE_TOL_PX + detickPath 输出级垂直化（锚点真实坐标末段落点）；routeRectilinear 出口同款（承接 spec D-004-2，方案 3.2-B） |
| ADR-003 | router 贴边容差与 audit 口径同源化 = 常量导出 + 一致性测试 | PROPOSED | `RIDE_TOL_PX=0.5` 由 lgdl-router 导出；render geometry-audit.test 断言 `AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX`；不引入反向包依赖（承接 EC-006，方案 3.4-A） |
| ADR-004 | 专项断言与 gantt 窄条策略落点 | PROPOSED | ① er/uml 穿体专项断言放 matrix-a 档内（path d 级，非 G 规则扩展）；② gantt 窄条文本仅 renderer 近右缘回退（不做 layout 预留）（承接开放 #4/#6，方案 3.3-A/3.5-A） |

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：三类缺陷方案选型 + 落地设计（桶 R1/RD/RP/LL/T6，文件:行号级）+ 迁移步骤（M0~M6，router→render→layout→收编批）+ 测试策略（B12/KNOWN 清空/守恒/一致性/专项断言）+ 风险矩阵（R-001~R-012）+ ADR 提案 4 项（内联） | 2026-09-02 | SDDU Plan Agent |
