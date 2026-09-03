# 审查策略：specs-tree-engine-defect-fixes（引擎缺陷修复）

> **文档定位**: SDDU 审查策略（ADR-004 产物拆分 — 步骤 1）— 定义本 Feature 自主审查清单 C1~CN（审查对象/基准/维度/方法）与质量门槛；逐项执行结果见 review-report.md（步骤 2）
> **前置依赖**: spec.md（13 FR/8 NFR/10 EC/D-001~D-005）、plan.md（4 ADR 提案 内联 §7）、tasks.md（15 任务/6 波次）、build.md（15/15 完成，6 commit）、state.json（notes 含 build 4 项偏差）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 策略自主定义：C1~C22（规范符合性 11 条 / 架构一致性 4 条 / 测试质量 5 条 / 代码质量 2 条），13 FR 全覆盖 + 8 NFR + 10 EC + 4 ADR + build 4 偏差专项复核

---

## 1. 审查概要（规划口径，执行结果见 review-report.md）

| 维度 | 规划数值 |
|------|:--:|
| 审查项总数（C1~CN） | 22 |
| FR 覆盖 | 13/13（每个 FR ≥1 个 Cx） |
| 四维度覆盖 | 4/4（规范符合/架构一致/测试质量/代码质量各 ≥1） |
| 审查文件数（源/测试/资产） | 3 包源码 + 3 测试文件 + 1 registry + 11 golden 资产 |
| build 偏差复核 | 4/4 专项 |

## 2. 自主审查清单（C1~C22）

**审查对象来源**：
- `spec.md`：FR-001~FR-013 / NFR-001~008 / EC-001~010 / D-001~D-005
- `plan.md`：§4.2 落地设计（桶 R1/RD/RP/LL/T6）+ §4.3 迁移 M0~M6 + §5 文件影响 + §7 ADR-001~004
- `build.md`：文件变更清单、6 commit、守恒 505、0 违例声明
- `state.json` notes：build 4 项偏差（① 平行容差收敛口径微调 ② M3「目标在左」分支改动 ③ uml-class rel-label 近墙守卫 ④ 专项断言内嵌）
- 代码现状：`lgdl-router/src/index.ts`、`lgdl-render/src/index.ts`、`lgdl-layout/src/layered.ts`、matrix-a/b/geometry-audit 测试、golden 快照

**审查立场（静态分析）**：阅读代码 + git diff + 快照 diff + 测试文件核验，不跑测试/不调接口/不测性能（动态验证归 validate）。**重点核实两件事**：
1. 「门禁归零」是引擎真实修复而非放宽门禁判定（G1~G6 规则与 AUDIT_TOL 零改动 = 最强证据）；
2. 快照重建的 diff 审阅无结构性变化（tag/class/text 不变，仅坐标/走线）。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | matrix-a/b KNOWN 集清空回 clean | FR-011 / D-005-1 | 规范符合性 | git diff + 文件阅读：KNOWN_A 22 / KNOWN_B 7 全删无残留；assertAudit/assertAuditKnown 收编为 `deepEqual(violations, [])`（断言**增强**非删除）；grep KNOWN_A/B 无定义 |
| C2 | 门禁判定与容差常量零改动 | NFR-001 / NG-001 / A-001 | 规范符合性 | git diff b69bbbf..c59dab7 `geometry-audit.ts`（G1~G6 判定 + AUDIT_TOL 全量）→ 期望 0 diff；RIDE_TOL_PX 收敛在 router 侧而非 audit 放宽 |
| C3 | 测试守恒只增不删 | FR-013 / NFR-003 | 测试质量 | 全仓 `test(` 计数 b69bbbf vs c59dab7 逐文件比对 → 期望仅 matrix-b(+1 B12) 与 geometry-audit(+1 一致性)；无既有 *.test.ts 删除行/断言弱化（KNOWN 删除属数据清理） |
| C4 | 不引入新违例 | NFR-004 / FR-013-③ | 规范符合性 | 收编后 matrix-a 11 档 + matrix-b 14 档断言 = 0 违例；violations 无未知 type/docRef；快照文档 audit 0（build.md §4 核对） |
| C5 | 头注释/文档同步 clean | FR-011-③ / NFR-008 | 规范符合性 | matrix-a/b 文件头 EC-001/G6 已知缺口描述更新为 clean 说明；B2 intent 注释引用 B12；registry 头注释同步 |
| C6 | RIDE_TOL_PX 与 audit 口径同源 | EC-006 / ADR-003 | 架构一致性 | router 导出 `RIDE_TOL_PX=0.5`；geometry-audit.test 一致性断言 `AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX === 0.5`；无反向包依赖（router 不 import render test-support） |
| C7 | er/uml-class 基数落实体框外（穿体根因清除） | FR-001 / FR-002 / D-001 A+B / EC-005 | 规范符合性 | 代码走查：collapseGridPath.segClear 自身框内部穿越拒绝（:982-995）+ pathHitsOwnBody.segInside 段-框交集判据（:99-150）+ snapPt 锚点稳定（:43-56）+ faceNormalOf 面法线外置 22px（render :483-496/:973-1000）；golden 实证 er/uml edges 走线变化 |
| C8 | er/uml 穿体专项断言（门禁 0 不足证） | FR-001-③ / D-001-4 / R-007 | 测试质量 | matrix-a.test 内嵌 `assertNoOwnBoxPierce`：解析 er edges[0]/uml edges[1] path d，任一段与 from/to 实体框内部判交（>0.5px，锚点除外）；断言有效性走查 |
| C9 | M1/M2 ride 硬拒 + detick 输出级兜底（含**偏差①复核**） | FR-008 / FR-009 / D-004 / ADR-001 / ADR-002 | 架构一致性 | segRideOnAnyBox 与 audit segRideOnBox 几何同构（共线 <0.5px + 重合 >0.5px）；routeRectilinear 候选 ride 硬拒 + routeEdge quality ride 全集；detickPath 出口（best + orthogonalize 两路）；**复核偏差①**：collapse 平行容差保留 pathHugLength>20 守卫 + segRideOnAnyBox 0.5 同源 + detick 输出兜底 vs plan「直接收敛 0.5」——评估是否与 plan 输出级口径意图一致；**复核偏差③**：uml-class edges[2] rel-label 贴 user 框由近墙守卫修复 |
| C10 | renderGantt dep 三段式垂直进面（含**偏差②复核**） | FR-010 / EC-008 / ADR-004 | 规范符合性 | renderGantt gap 分支：gap≥8 缘间中列 / gap∈[-4,8) 回穿源右缘 clear=10 / gap≥20 不动；**复核偏差②**：「目标在左」由 min(a.x-20,b.x) 改 min(a.x-20,b.x-clear)——评估 drop 列左移是否满足 FR-010 0 actual 且未伤 B7 正交/x≥轴起点断言 |
| C11 | placeLabelBox 画布约束 + clamp 兜底 | FR-003 / D-002 / R-010 | 规范符合性 | isFree/候选/回退全链 onCanvas（canvasPadPx=1 同款容忍）+ 最终 clamp 放置；三调用点（普通边 :1002 / 聚合边 :822 / rel :994）传 layout.width/height；聚合 bg rect 级 clamp；state edges[5]「用户取消」黄金移动实证 |
| C12 | gantt 窄条文本近右缘回退 + textWidthEst | FR-004 / EC-007 / NG-005 | 规范符合性 | textWidthEst（CJK 1.0×fs / Latin 0.62×fs）与 labelBoxAt 共用口径；外置越界 → milestone 上方/条左侧 end 回退；`${start}d +${dur}d` 语义不变；dur=0 milestone 同机制；golden 实证 launch「18d +1d」位置 |
| C13 | 修复不误伤合法形态（基数/label 回归） | EC-009 / EC-007 / R-009 | 测试质量 | B8（基数全枚举双向 22px 外置不压框）与 B5/B6（聚合 label/bg）回归绿（build §4）；faceNormalOf 判面覆盖 4 面 + 15°/弧点容差 |
| C14 | layered.ts LR 秩轴按宽步进 + 画布兜底 | FR-005 / FR-006 / D-003 | 规范符合性 | 代码走查：rankMaxW 新增 + axisStart 步进按 rankdir 取维度（LR=rankMaxW+RANK_SEP）+ LR 画布 width=maxNodeRight+GRAPH_MARGIN；TB 分支步进仍 rankMaxH（行为零变化） |
| C15 | B12 LR 宽卡片回归档 + B2 注释 | FR-007 / EC-010 | 测试质量 | matrix-docs-b B12 条目（LR 4×160×48 卡链）+ matrix-b 用例（两两 bbox 不相交 overlapPx===0 + 全节点 x+width≤画布 + 宽>高形态 + renderClean audit 0）；B2 intent 注释引用 B12；matrix-b `test(` +1 佐证 |
| C16 | fallback/orthogonalize 兜底语义保持 | NFR-005 / EC-003 / EC-004 / R-001 / R-002 | 规范符合性 | degraded-paths.test.ts 场景 1~3 未改动（不在 feature diff 内）且全绿；detickPath 对 orthogonalize 兜底输出过（routeEdge :265）；无解率不增观察（build §4 matrix 0 违例） |
| C17 | 引擎确定性（双渲染字节一致） | NFR-007 / A-002 | 规范符合性 | B3/B4a/B4b/B9 双渲染语义锁文件未改动 + build §4 全绿；快照重建后本地/CI 字节一致 |
| C18 | golden 快照显式重建 + diff 审阅 + 独立 commit | FR-012 / EC-002 / NFR-002 / ADR-003 | 架构一致性 | git diff c59dab7：快照独立 commit、与收编 commit 分离；程序化核验 10 svg 的 tag/class/text 序列前后一致（结构性变化 = 0，仅坐标/折点数量走线变化）；sequence 无变化；manifest version 不变仅 sha 更新；snapshot.test.ts 更新门未改 |
| C19 | SVG 结构语义不破坏（结构断言） | NFR-006 / D-005-4 / NG-004 | 规范符合性 | svg.test.ts / kind-coverage.test.ts 未在 feature diff 内（结构断言零改动零弱化）；data-lgdl-loc/class/元素类型在快照中 100% 保留 |
| C20 | router 新增函数代码质量 | 项目宪法 / §5.1 方法论 | 代码质量 | 阅读 segRideOnAnyBox/pathRidesAnyBox/detickSegment/detickPath/snapPt/collapseGridPath 改动：命名清晰、职责单一、错误处理（R-008 保留原路径）、注释完整；**专项关注**：detickSegment 对 2 点路径贴边段的分支处理、detickPath 遇不可修段的 break 语义 |
| C21 | render/layout 新增代码质量 | 项目宪法 / §5.1 方法论 | 代码质量 | 阅读 textWidthEst/faceNormalOf/placeLabelBox 画布化/RP.2 回退/axisStart 重命名：可读性、硬编码值提取（clear=10、bump=4、22px、RANK_SEP 常量）、注释与 ADR 引用一致 |
| C22 | commit 序列纪律 + 文件影响对齐（含**偏差④复核**） | EC-001 / D-005 / ADR-004 / plan §5 | 架构一致性 | git log 核验 6 commit（M1 dbab85f / M2 4068304 / M3 80d8bdf / M4 de4456f / 收编 4db766d / 快照 c59dab7）与 tasks 波次映射；无「修了未收编/收了未修」中间态；文件变更面 = plan §5 ± 0 新增源文件；**复核偏差④**：er/uml 专项断言为同用例内嵌不新增 test 用例（守恒口径 505 一致） |

**质量门槛**：FR 覆盖 13/13 ✓；四维度覆盖 4/4 ✓（规范符合 11 + 架构 4 + 测试 5 + 代码质量 2 = 22）；无法静态确认项显式标注「不适用/交 validate」并说明。

## 3. build 4 项偏差专项复核计划

| # | 偏差（state.json notes） | 复核方法 | 判定准则 |
|---|------------------------|---------|---------|
| ① | R1.3 平行容差：pathHugLength>20→0.5 调整为「segRideOnAnyBox 同源 + 保留 >20 近墙长段守卫」，0.5 口径由 detickPath 兜底 | 走查 collapseGridPath.segClear（:982-1005）+ detickPath 出口 + geometry-audit 0 diff | 与 plan 输出级 0.5 验收口径一致 = 通过；若 collapse 中间态残留贴墙段且 detick 未清 → 阻塞 |
| ② | M3「目标在左」分支改 drop 列 min(a.x-20, b.x-clear) | 走查 renderGantt gap 分支 + B7 断言 + gantt 快照 diff | drop 列距目标左缘 clear>0.5px、末段垂直进面、正交保持、B7 三型断言绿 = 通过（属实现必要微调，记录语义扩展） |
| ③ | uml-class edges[2] rel-label 曾贴 user 框 → collapse 近墙守卫修复 | 快照 diff（edges[2] 走线 + rel label 位置）+ C7/C9 联动 | 修复后 0 违例且 label 不压框 = 通过 |
| ④ | er/uml 专项断言内嵌同用例（不新增 test） | matrix-a.test.ts 阅读 + 全仓 `test(` 计数比对 | 断言有效（path d 级判交）且守恒 505 = 503+2 = 通过 |

## 4. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — C1~C22 审查清单 + 四维度覆盖 + build 4 偏差专项复核计划；13 FR/8 NFR/10 EC/4 ADR 映射 | 2026-09-02 | SDDU Review Agent |
