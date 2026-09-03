# 审查报告：specs-tree-engine-defect-fixes（引擎缺陷修复）

> **文档定位**: SDDU 审查报告（ADR-004 产物拆分 — 步骤 2）— 逐项记录 R1 轮审查执行结果（C1~C22），作为 validate 阶段的输入
> **审查策略**: review.md（C1~C22 审查清单 + 四维度指引 + build 4 偏差复核计划）
> **前置依赖**: review.md、spec.md、plan.md、build.md、state.json、修复后代码（git b69bbbf..c59dab7）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-02
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始执行 — 静态走查 router/render/layout 三包源码 + matrix/snapshot/golden 资产 + 程序化快照结构核验；22 项审查通过 20、改进 2、阻塞 0；build 4 偏差复核 4/4 通过（①② 记录为实现必要微调、③④ 与声明一致）；门禁归零确证为真实修复（geometry-audit.ts 全 0 diff + KNOWN 收编为更强 0 违例断言）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 22 |
| 通过 | 20 |
| 警告 | 2（C9 低 / C20 低） |
| 失败 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项审查结果（C1~C22）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | matrix-a/b KNOWN 清空回 clean | FR-011 / D-005-1 | ✅ | KNOWN_A 22 项（er1/uml3/state1/gantt5/arch4/ms4/login1/ecom1/mm2）+ KNOWN_B 7 项（B1×2/B4b1/B5 1/B7×2/B9 1）= 29 项全删；`grep KNOWN_A/KNOWN_B` 无定义；assertAudit（matrix-a.test.ts:25-27）与 assertAuditKnown（matrix-b.test.ts:44-46）收编为 `assert.deepEqual(violations, [])`——断言由「已知集一一配对」**增强为 0 违例硬断言**，非删测试 | — |
| C2 | 门禁判定与容差常量零改动 | NFR-001 / NG-001 | ✅ | `git diff b69bbbf c59dab7 -- geometry-audit.ts` 输出为**空**——G1~G6 判定、AUDIT_TOL 全常量（edgeRideTolPx=0.5/canvasPadPx=1/labelPadPx=2 等）、auditG6 障碍集零改动；「归零是引擎适配门禁、非门禁放宽」的最强证据 | — |
| C3 | 测试守恒只增不删 | FR-013 / NFR-003 | ✅ | 全仓 27 个 *.test.ts 的 `test(` 计数 b69bbbf→c59dab7 逐文件比对：**仅 2 处变化**——matrix-b 18→19（B12 +1）、geometry-audit 25→26（一致性 +1）；其余 25 文件零变化（含 matrix-a 2、degraded-paths 4、svg 7、kind-coverage 13、snapshot 4）。505 = 503 + 2 ✓ | — |
| C4 | 不引入新违例 | NFR-004 | ✅ | build §4：matrix-a 11 档 + matrix-b 14 档 audit 全 0 违例、KNOWN 无残留、violations 无未知 type/docRef；快照文档 audit 0（validate 将复跑实证） | — |
| C5 | 头注释/文档同步 clean | FR-011-③ / NFR-008 | ✅ | matrix-a.test.ts 头注释由「EC-001 已知缺口 + G6 盲区」改写为「引擎修复收编 clean + 专项断言说明」；matrix-b.test.ts 头注释同步；matrix-docs-b.ts 头注释（B12 说明 + B1~B12 集合）、B2 intent 注释均更新引用 B12 | — |
| C6 | RIDE_TOL_PX 与 audit 口径同源 | EC-006 / ADR-003 | ✅ | router/index.ts:39 `export const RIDE_TOL_PX = 0.5`（注释声明对齐 AUDIT_TOL.edgeRideTolPx）；geometry-audit.test.ts:388-395 新增一致性断言（`edgeRideTolPx === RIDE_TOL_PX` + `=== 0.5`）；import 方向 render(test)→router（devDeps 既有），无反向依赖 | — |
| C7 | 基数落实体框外（穿体根因清除） | FR-001/002 / D-001 A+B | ✅ | router 侧：segInside 重写为段-框内部交集判据（捕获起于边界穿体 L 捷径，浮点短路修复）；collapse segClear 自身框内部穿越拒绝；snapPt 消除 5e-14 噪声。render 侧：faceNormalOf 按锚点距 4 边最近判面取外法线，srcCard/dstCard 22px 外推解耦折线局部方向。**golden 实证**：uml-class edges[1] 由 6 折点 `M 456,189 L 609,189 L 609,322 L 714,322 L 714,302 L 716,302`（沿 infra 底边 y=322 借道 98px）→ 3 折点 `M 496,189 L 756,189 L 756,220` 垂直进 payment 顶面中点（基数 '1'@(756,192) 外置于框外 22px）；er edges[0] src 锚点由旧顶面竖穿改底面 (110,144) 垂直出体、基数 '1'@(110,160) 外置 | — |
| C8 | er/uml 穿体专项断言 | FR-001-③ / R-007 | ✅ | matrix-a.test.ts:76-109 `assertNoOwnBoxPierce`：`pathPtsFromD` 轻量 M/L 解析 + `segCrossesBoxInterior`（>0.5px 内部交集、锚点贴边不算，与 router segInside 同构）；er edges[0]/uml edges[1] 在 A 档用例内调用（:131-132），同用例内嵌不新增 test()；断言有效性成立（G3 豁免端点 → 门禁 0 不足证，测试侧自查补位） | — |
| C9 | M1/M2 ride 硬拒 + detick 兜底（偏差①②③复核载体） | FR-008/009 / ADR-001/002 | ⚠️ | segRideOnAnyBox（:611-638）与 audit segRideOnBox 几何同构（共线<RIDE_TOL_PX 且重合>0.5px，零长/斜段豁免——与 audit 斜段归 G2 一致）；routeRectilinear 候选 pathRidesAnyBox 硬拒（:796）+ routeEdge quality ride 全集默认 clearBoxes（:233）+ detickPath 出口双路（best :262 / orthogonalize :265）。golden 实证：arch edges[0] 4 折点→3（`L 350,246 L 354,246` tick 消除）、microservices edges[0] 末端 1px 微借道（`623,346 L 624,346`）消除。⚠️ **发现（低）**：render 普通边 routeEdge 调用（render/index.ts:931-940）**未传** rideBoxesAll（仅聚合边 routeRectilinear :808 传第 6 参）——RD.1 声明「普通边调用点同步 ride 全集」未完全落地；当前靠默认 set（obstacles+src/dst 节点框，owning 容器若为 layout node 亦在内）+ audit 严格门禁兜底，corpus 0 违例不受影响，属潜在鲁棒性缺口（详见 §5 改进 1） | 低 |
| C10 | renderGantt dep 三段式垂直进面（偏差②复核） | FR-010 / EC-008 | ✅ | gap∈[8,20)：垂直列 cx=a.x+gap/2（距两缘 ≥4px）；gap∈[-4,8)：回穿源右缘 clear=10（cx=a.x-10 >0.5px 余量充足）；gap≥20 分支代码原样未动。**偏差②复核通过**：「目标在左」分支 drop 列由 `min(a.x-20, b.x)` 改 `min(a.x-20, b.x-clear)`——原 drop=b.x 恰骑目标左缘 16px（B7 edges[2] 实证），左移 clear 后末段水平垂直进 b.x、不共线不贴边；绕行方向/形态未变，正交与 x≥轴起点保持（B7 断言绿）。属实现必要微调：满足 FR-010 验收（0 actual）而 EC-008 字面「分支不动」被突破——**建议同步回 plan/spec 语义记录**（见 §5 改进 3，文档不同步非代码缺陷） | — |
| C11 | placeLabelBox 画布约束 + clamp | FR-003 / D-002 / R-010 | ✅ | 签名增 canvasW/canvasH（:298-299）；isFree 首查 onCanvas（估宽 bbox 完整在画布内，canvasPad=1 与 audit 同款容忍，:304-308）；候选/回退越界候选自然被拒；最终兜底改 clamp（x∈[halfW, canvasW-halfW]，y∈[8, canvasH-8]，:356-365）→ auditG5 必 0；三调用点（聚合 :822 / rel :994 / 普通 :1002）均传 layout.width/height；聚合 bg rect 级 clamp（:825-828）。**golden 实证**：state「用户取消」由 (700,925)（估宽右缘 724>720 越界 4px）→ (690,1434)（右缘 714≤720 ✓） | — |
| C12 | gantt 窄条文本回退 + textWidthEst | FR-004 / EC-007 | ✅ | textWidthEst（:251-256，CJK>0x2e80 1.0×fs 否则 0.62×fs）与 labelBoxAt 共用（:259 复用）；renderGantt 外置分支（:1226-1243）：outsideX+估宽 ≤ 画布 → 原样外置；越界 → milestone 钻石上方居中（cy-13，:1233-1235）/ 普通窄条条左侧 end 对齐；`${start}d +${dur}d` 语义不变。**golden 实证**：launch「18d +1d」由 (1022,296)（fs10 估宽 43.4 → 右缘 1065>1060 越界 5.4px）→ milestone 上方 (998,283)（右缘 ≈1020 ≤ 1060 ✓）；dur=0 milestone 同分支覆盖（B4b/B7 绿） | — |
| C13 | 修复不误伤合法形态 | EC-009 / R-009 / R-010 | ✅ | B8 基数全枚举（1/0..1/0..*/1..* 双向 22px 外置不压框）、B5/B6 聚合 label 断言文件未弱化且 build §4 全绿；faceNormalOf 容差判面天然覆盖 roundedRect r=6 / entity 顶弧 r=10（弧点距弧面 <r 判该面）与 4 面 + 15° 锚点（tie 倾向顶/上）。压框风险由 R-010 clamp 兜底（clamp 后仍注册 placed 防堆叠） | — |
| C14 | layered.ts LR 秩轴 + 画布兜底 | FR-005/006 / D-003 | ✅ | rankMaxW 新增（layered.ts:204-209）；axisStart 步进按 rankdir 取 `(LR?rankMaxW[r]:rankMaxH[r])+RANK_SEP`（:214-224）——TB 分支步进仍 rankMaxH **零变化**；LR 画布宽 `Math.max(maxNodeRight+GRAPH_MARGIN, totalRankExtent+GRAPH_MARGIN)`（:250-258）镜像 TB 兜底。golden 实证：LR 文档画布 er 584→692、uml-class 876→916（rank 步进变宽），TB 文档（arch 740×1360、ms 1280×1304 等）画布零变化 | — |
| C15 | B12 回归档 + B2 注释 | FR-007 / EC-010 | ✅ | matrix-docs-b.ts B12 条目（LR 4×160×48 无成员卡链 a→b→c→d，intent 注明修复前红证据）；matrix-b.test.ts:296-334 B12 用例：overlapPx 两两不相交 + 全节点 x+width≤画布 + 宽>高形态 + renderClean audit 0——**显式断言补 audit 盲区**（重叠/溢出非 G1~G6，FR-007-①）；B2 intent 注释更新引用 B12；`test(` +1 与 C3 核验一致。修复前红取证（stash 取证）由 build 记录，validate 可复核 | — |
| C16 | fallback/orthogonalize 兜底语义保持 | NFR-005 / EC-003/004 | ✅ | degraded-paths.test.ts（场景 1~3）**不在 feature diff 内**（未改动）+ build §4 全绿；detickPath 对 orthogonalize 兜底输出也过（routeEdge :265 `detickPath(orthogonalize(...))`）→ 兜底 ride-safe；routeRectilinear best 初始 = fallback（:789）→ detickPath 不会收到 undefined；R-002（无解率不增）由矩阵 0 违例观察承接 | — |
| C17 | 引擎确定性 | NFR-007 | ✅ | B3/B4a/B4b/B9 双渲染字节一致语义锁文件未改动；快照普通模式 0 diff 自证（build §4 + TASK-014 验收）；golden sha256 manifest version=1 无时间戳（确定性载体不变） | — |
| C18 | 快照显式重建 + diff 审阅 + 独立 commit | FR-012 / EC-002 / ADR-003 | ✅ | commit c59dab7 独立于收编 commit 4db766d（ADR-003 分离可追溯）；manifest 仅 10 文件 sha 更新、version 与 sequence sha 不变；**程序化结构核验**：10 个重建 svg 的 element tag 数前后一致（如 architecture 512=512、uml-class 288=288），tag 序列差异仅存在于 `<path d>` 内**折点数量**（走线形态变化，属预期——如 uml edges[1] 6→3 点即借道消除的直接结果），**零** tag/class/text 内容差异（text 序列 100% 一致）；无未解释结构性变化（EC-002 通过） | — |
| C19 | SVG 结构语义不破坏 | NFR-006 / D-005-4 | ✅ | svg.test.ts / kind-coverage.test.ts 不在 feature diff 内（结构断言零改动零弱化）；快照核验 data-lgdl-loc/class/元素类型 100% 保留（C18 证据同源）；修复只改几何，无 DSL/API/LayoutResult 结构变更 | — |
| C20 | router 新增函数代码质量 | §5.1 / 项目宪法 | ⚠️ | 整体优秀：segRideOnAnyBox/detickPath 注释含与 audit 同构说明、命名自解释、R-008 保留原路径不静默劣化、detick 修正后复验 pathCrosses+pathHitsOwnBody。⚠️ **发现（低）**：`detickSegment`（:702-711）对 **n=2 路径**（routeRectilinear 直连 fallback [src,dst]）贴边段取 segIdx===0 分支 → candidate=[a,l,r]（`pts.slice(2)` 为空）**丢失目标端点 b**，终点变 (b.x, s2) 距锚点 4px（bump 偏移）；n≥3 时首段分支正确保留 b（slice(2) 含后续点）。当前 corpus 未触发（矩阵/snapshot 0 违例 + 无悬空端点），但属潜在边界缺陷；`detickPath` 内 `!fixed → break`（:739）中止整段后续修正语义偏保守（R-008 兼容，可接受） | 低 |
| C21 | render/layout 新增代码质量 | §5.1 / 项目宪法 | ✅ | textWidthEst 单一估宽源（labelBoxAt 复用消除双处漂移）；faceNormalOf 注释含判面容差依据；placeLabelBox 画布化后三调用点口径一致；RP.2 回退三变体分支清晰、语义注释完整；magic number 有常量（clear=10/bump=4/22px/RANK_SEP）且注释声明对齐审计口径；layered.ts rowY→axisStart 语义重命名名副其实 | — |
| C22 | commit 序列纪律 + 文件影响（偏差④复核） | EC-001 / ADR-004 / plan §5 | ✅ | git log 核验 6 commit 序列与 tasks 波次映射一致：M1(dbab85f router+render RD.1)→M2(4068304 RP.3)→M3(80d8bdf RD.2+RP.1+RP.2)→M4(de4456f LL+B12)→M5 收编(4db766d)→M5 快照(c59dab7)；修复桶与 KNOWN 清空同批（收编批 4db766d 恰在引擎修复后），快照单列 commit——无「修了未收编/收了未修」中间态（EC-001）；文件变更面 = plan §5 所列 18 文件、**零新增源文件**、无 plan 外文件；**偏差④复核通过**：er/uml 专项断言同用例内嵌（matrix-a.test.ts:131-132）不新增 test()，与守恒口径 505=503+B12+1+一致性+1 完全一致 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 2 | 1 | 1 | 0 | 50% |
| 规范符合性 | 11 | 11 | 0 | 0 | 100% |
| 架构一致性 | 4 | 4 | 0 | 0 | 100% |
| 测试质量 | 5 | 4 | 1 | 0 | 80% |

> 代码质量 50% 系 C20 的 n=2 边界发现（低危）；规范符合 100% = 13 FR 全部满足验收口径（0 违例/守恒/专项断言落位）。整体 20/22 通过、0 失败、0 阻塞。

## 4. build 4 项偏差复核结论

| # | 偏差 | 复核结论 | 判定 |
|---|------|---------|:--:|
| ① | R1.3 平行容差收敛微调（>20px 守卫保留 + segRideOnAnyBox 0.5 同源 + detick 输出兜底） | **通过**。plan/tasks 字面要求 collapse 直接收敛 0.5；build 选择「collapse 中间态保留 ≤20px 走廊 snap-back + 输出级 detick 兜底」。复核判断：pathHugLength 语义是「距墙<clear 的平行段长」≠ G6「共线贴边」判据，直接 0.5 会破坏 collapse 的 corridor snap-back（垂直直落路由劣化，且 er/uml rel-label 落点会贴框产生新 G4——即偏差③动机）；**G6 判定的输出级口径（共线<0.5px）由 detickPath 在出口统一保证**，最终验收（matrix 0 违例 + audit 0 diff）达成。与 plan §3.2 方案 B「源收敛 + 输出 detick」的**意图一致**，仅实现机制内部分配不同——记录为实现必要微调，非缺陷；建议 validate 以输出级 0 违例实证收口 | ✅ |
| ② | M3「目标在左」分支由「不动」改 drop 列 min(a.x-20, b.x-clear) | **通过**。原 drop=b.x 在目标远左时恰骑目标左缘 16px（B7 edges[2] 实证），「不动」无法满足 FR-010 0 actual；左移 clear=10 后末段水平垂直进目标左缘、不共线。分支形态/绕行方向未变、B7 三型断言（正交 + x≥轴起点）保持绿、gap≥20 与 gap≥8 分支不受影响（C10 走查）。属实现必要微调（spec/plan 的「不动」表述基于未预见的 B7 远左几何），建议同步更新 plan.md §4.2 RP.3 与 spec EC-008 语义描述 | ✅ |
| ③ | uml-class edges[2] rel-label 曾贴 user 框 → collapse 近墙守卫修复 | **通过**。近墙长段守卫（pathHugLength>20，collapse segClear :1005）保留的动机即此：无此防线 A* 净空走廊会被 collapse 压到贴源框 ~10px 平行长段 → rel-label 理想落点随之下移贴框（新 G4）。代码注释（:1000-1003）明示；M1 末矩阵回归 0 违例；golden edges[2] 走线/label 位置正常 | ✅ |
| ④ | er/uml 专项断言内嵌（不新增 test 用例） | **通过**。matrix-a.test.ts:131-132 在既有 A 档用例内调用 assertNoOwnBoxPierce；`test(` 计数全仓仅 +2（B12 + 一致性），与 build 声明 505 一致；断言有效性经 C8 走查成立（G3 豁免端点故须测试侧自查） | ✅ |

## 5. 改进建议（非阻塞）

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | packages/lgdl-render/src/index.ts:931-940 | 普通边 routeEdge 调用未传 rideBoxesAll（RD.1 声明「普通边调用点同步 ride 全集」），默认集合不含「非 layout node 的 owning 容器」——当前 corpus 经 obstacles+audit 兜底 0 违例，但语义与代码注释/commit 说明（dbab85f 称普通边也传全集）不完全一致，未来含纯容器组的 intra-group 边可能回潮 | C9 | 普通边调用补 `rideBoxes: rideBoxesAll`（接口已支持，:166）；或更新 RD.1 注释/commit 说明为「普通边依赖 obstacles+端点框默认集合、聚合边显式传全集」以避免文档与实现漂移；validate 建议加一条合成「组内容器边」用例实证 | 低 |
| 2 | packages/lgdl-router/src/index.ts:702-711 | detickSegment 对 n=2 贴边直线段（segIdx===0 且 ===n-2）走首段分支丢目标端点 b（candidate=[a,l,r]），终点偏移 bump=4px；n≥3 正常 | C20 | n===2 时并入尾段分支（candidate=[a,l,r,b]，末段 r→b 垂直进面天然 G6-safe），或显式 return null 保留原路径（R-008 语义）；validate 补合成直连贴边回归用例 | 低 |
| 3 | plan.md §4.2 RP.3 / spec.md EC-008 | 偏差①② 的「分支不动」「容差直接收敛」字面表述与最终实现（drop 列左移 clear、>20px 守卫+detick 兜底）不同步，git 历史与代码注释已自洽但文档层未回写 | C10/C9 | 本 feature 收尾时同步回写 plan/spec 语义描述（或经变更记录留痕），防下游 validate 误判 | 低 |

## 6. 结论

**结论**: ✅ 通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 20/22 = 90.9%（警告不计失败） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项（13 FR 验收口径全达成） |
| 可进入 validate | 是 |

**理由**：
1. **门禁归零是真实修复而非放宽判定**——geometry-audit.ts（G1~G6 判定 + AUDIT_TOL）在整个 feature 期间 **0 diff**，KNOWN 收编为更强的 `deepEqual(violations, [])` 硬断言（C1/C2 双重证据）；
2. **29 项 KNOWN 清空逐项有代码与快照实证**——uml-class infra 底边 98px 借道（6→3 折点垂直进面）、er 竖穿自身框 + 基数外置、state/gantt 文本越界夹取回退、13 处末端微借道 detick 消除、LR 画布/秩轴修复（C7/C10/C11/C12/C14 golden 实证）；
3. **快照重建纪律合规**——显式重建独立 commit、10 svg 程序化核验零结构性变化（tag/class/text 100% 一致，仅坐标/走线折点）、sequence 无变化、manifest version 不变（C18）；
4. **测试守恒 505 = 503 + 2** 逐文件核实只增不删（C3）；
5. **build 4 项偏差复核 4/4 通过**——①② 为实现必要微调（输出级口径与 spec 意图一致，文档需回写）、③④ 与声明一致；
6. 2 项改进建议均为低危潜在边界（普通边 rideBoxes 显式化、detick n=2 分支），不阻塞 validate，建议 validate 阶段补合成用例实证或顺手修复。

👉 运行 `@sddu-validate specs-tree-engine-defect-fixes` 开始动手验证（建议重点：复跑全量矩阵 + snapshot 普通模式 0 diff + B12 修复前红证据复核 + 改进 1/2 的合成用例）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始执行 — C1~C22 全项走查；20 通过 / 2 警告 / 0 阻塞；build 4 偏差复核通过；结论 ✅ 通过 | 2026-09-02 | SDDU Review Agent |
