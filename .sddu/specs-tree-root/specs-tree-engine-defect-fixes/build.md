# 构建报告：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md（任务清单）、plan.md（技术方案）、spec.md（需求规范）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 15/15 任务完成，6 个独立 commit（M1/M2/M3/M4/M5 收编/M5 快照）；门禁归零、KNOWN 29 项全清、测试守恒 505（≥503）、0 违例、快照显式重建 + diff 审阅

## 1. 构建概要
> 本次构建的整体统计

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 15 / 15 |
| 复杂度分布 | S×4 / M×8 / L×3 |
| 新增文件 | 0 个（修复全落在既有函数内；无新源文件） |
| 修改文件 | 5 个源/测试注册文件 + 11 个 golden 资产 |

## 2. 文件变更
> 本次构建涉及的全部文件操作（含源码、测试、配置等所有类型）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/lgdl-router/src/index.ts` | TASK-002~005 | R1.1~R1.6：RIDE_TOL_PX/snapPt 常量与稳定化、segInside 交集判据重写、collapse 自身框穿越拒绝 + G6 同源贴墙判定 + 近墙长段守卫、detickPath 输出 pass、ride 全集硬拒（segRideOnAnyBox/pathRidesAnyBox）、routeEdge/routeRectilinear 出口 detick |
| MODIFY | `packages/lgdl-render/src/index.ts` | TASK-004、TASK-006~009 | RD.1 ride 全集调用点（聚合 routeRectilinear 第 6 参 + 普通 routeEdge rideBoxes）；RP.3 renderGantt dep 三段式垂直进面；RD.2 faceNormalOf 基数面法线外置；RP.1 placeLabelBox 画布约束 + clamp 兜底 + textWidthEst；RP.2 gantt 窄条文本近右缘回退 |
| MODIFY | `packages/lgdl-layout/src/layered.ts` | TASK-011 | LL.1 秩轴按 rankdir 取维度（LR=rankMaxW，axisStart 语义重命名）；LL.2 LR 画布 maxNodeRight 兜底 |
| MODIFY | `packages/lgdl-render/src/test-support/matrix-docs-b.ts` | TASK-012 | B12 LR 宽>高卡片链回归档新增（D-003-3）；B2 intent 注释更新引用 B12；registry 头注释（14 条） |
| MODIFY | `packages/lgdl-render/src/matrix-b.test.ts` | TASK-012/013 | B12 用例（两两不相交 + 不溢出 + audit 0）；收编：KNOWN_B 7 项全删、assertAuditKnown 收编 0 违例 |
| MODIFY | `packages/lgdl-render/src/matrix-a.test.ts` | TASK-013 | 收编：KNOWN_A 22 项全删、assertAudit 收编 0 违例、头注释 clean；er/uml-class 穿体专项断言（FR-001-③，同用例内嵌） |
| MODIFY | `packages/lgdl-render/src/geometry-audit.test.ts` | TASK-013 | EC-006 一致性断言：`AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX === 0.5`（import @lgdl/lgdl-router，+1 test） |
| MODIFY | `packages/lgdl-render/test-assets/golden/*.svg`（10 个）+ `manifest.json` | TASK-014 | LGDL_UPDATE_SNAPSHOTS=1 显式重建（sequence 无变化，未列）；token 级 diff 审阅：结构/text 100% 一致、仅坐标/走线 |

## 3. 任务完成清单
> 每个任务的完成状态

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-001 | M0 基线（503 绿 + git clean） | S | ✅ completed | FR-013/NFR-003 |
| TASK-002 | RIDE_TOL_PX 导出 + snapPt 锚点稳定化 | S | ✅ completed | EC-005/EC-006 |
| TASK-003 | segInside 交集判据重写 + collapse 自身框穿越拒绝 + 容差收敛 | M | ✅ completed | FR-001/FR-002/FR-009 |
| TASK-004 | ride 全集硬拒（router）+ render 调用点传 ride 全集 | M | ✅ completed | FR-008/ADR-001 |
| TASK-005 | detickPath + M1 波次验证门 + M1 commit | L | ✅ completed | FR-009/NFR-005 |
| TASK-006 | renderGantt dep gap∈[-4,20) 三段式垂直进面 | M | ✅ completed | FR-010/EC-008 |
| TASK-007 | faceNormalOf 基数面法线外置 | M | ✅ completed | FR-001/FR-002/EC-009 |
| TASK-008 | placeLabelBox 画布约束 + clamp 兜底 | M | ✅ completed | FR-003/EC-007 |
| TASK-009 | gantt 窄条文本近右缘回退 + textWidthEst | M | ✅ completed | FR-004/EC-007 |
| TASK-010 | M2+M3 波次验证门 + M2/M3 独立 commit | S | ✅ completed | NFR-001/004/005/007 |
| TASK-011 | layered.ts LR 秩轴 rankMaxW 步进 + 画布兜底 | M | ✅ completed | FR-005/FR-006 |
| TASK-012 | B12 回归档 + B2 注释 + stash 红取证 + M4 commit | M | ✅ completed | FR-007/EC-010 |
| TASK-013 | KNOWN 29 项全清 + 断言 0 违例 + 专项断言 + 一致性测试 + 收编 commit | L | ✅ completed | FR-011/FR-013/EC-006 |
| TASK-014 | LGDL_UPDATE_SNAPSHOTS=1 快照重建 + diff 审阅 + 独立 commit | L | ✅ completed | FR-012/EC-002 |
| TASK-015 | M6 终验：守恒 ≥505 + 门禁归零 + 29 项映射核对 + state 交接 | S | ✅ completed | NFR-001~008/FR-013 |

## 4. 测试覆盖
> 测试结果与守恒核对

| 维度 | 结果 |
|------|:--:|
| 基线 test( 计数 N₀ | 503 |
| 收编后 test( 计数 | **505**（= 503 + B12 +1 + 一致性 +1） |
| 新增断言（不计 test 计数） | er/uml 穿体专项断言（同用例内嵌）、B12 两两不相交/不溢出显式断言 |
| 既有测试删除/弱化 | 无（KNOWN 条目删除属断言收编为更强 0 违例） |
| 全仓 npm test | 全绿（lgdl-render 99 test：98 pass + 1 skip[B11 P2 默认关]） |
| 门禁矩阵 audit | matrix-a 11 档 + matrix-b 各档 **0 违例**（KNOWN 无残留） |
| degraded-paths 1~3 | 全绿（fallback/orthogonalize ride-safe，NFR-005） |
| 语义锁 B3/B4a/B4b/B9 | 双渲染字节一致全绿（NFR-007） |
| B8 基数全枚举 / B2 折叠 | 全绿（EC-009 / 无 LR 回归） |
| snapshot | 重建后全绿；普通模式 0 diff（无静默写盘） |

## 5. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-engine-defect-fixes` 开始审查 |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 15 任务全完成，6 commit（M1 dbab85f / M2 4068304 / M3 80d8bdf / M4 de4456f / 收编 4db766d / 快照 c59dab7）；门禁归零 + 守恒 505 + 快照显式重建审阅 | 2026-09-02 | SDDU Build Agent |
