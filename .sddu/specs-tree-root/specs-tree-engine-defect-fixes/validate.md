# 验证策略：specs-tree-engine-defect-fixes（引擎缺陷修复）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；逐项执行结果见 validate-report.md
> **前置依赖**: spec.md（13 FR/8 NFR/10 EC/D-001~005）、review-report.md（R1：20 通过/2 警告/0 阻塞，结论 ✅ passed）、plan.md（桶级落地 R1/RD/RP/LL/T6 + 迁移 M0~M6）、tasks.md（15 任务/6 波次）、build.md（15/15，6 commit，守恒 505）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 依据 spec FR/NFR/EC 验收标准 + review-report C1~C22 + 用户指令（门禁归零/引擎修复效果/兜底语义/快照纪律/口径同源/测试守恒/B12 红证据/2 项改进合成用例）自主定义 V1~V12 验证场景；Feature 类型 = **代码类**（router/render/layout 三包引擎修复 + 门禁矩阵收编 + golden 显式重建），执行方式 = 动态验证（跑测试/跑命令/git diff/SVG 取证/合成用例）

## 1. 验证概要
> 验证结果的量化总览（执行后回填，见 validate-report.md）

| 维度 | 实测数据 | 达标？ |
|------|---------|:--:|
| FR 测试覆盖 | 13/13（100%） | ✅ |
| NFR 测试覆盖 | 8/8（100%） | ✅ |
| 构建 | 退出码 0 | ✅ |
| 接口/数据一致性 | 快照 11/11 字节 + 结构核验 10/10（无 API/DB，以 SVG 几何/字节为数据面） | — |
| 漂移项 | 见 V12（执行后回填） | ✅ |
| 阻塞问题 | 0 项 | ✅ |

## 2. 自主验证场景（V1~V12）
> 验证 Agent 根据 spec/NFR/EC/产物自主定义具体验证场景。Feature 类型 = **代码类**（引擎几何修复），验证以「门禁归零真实性 + 修复效果几何取证 + 快照纪律 + 守恒」为核心；接口/数据维度以 golden SVG 字节/几何与审计输出替代（无 API/DB 调用面）。

**验证对象来源**：
- `spec.md`：13 FR / 8 NFR / 10 EC / D-001~005 验收标准（29 KNOWN 清空映射、0.5px 口径、面法线外置、画布夹取、垂直进面）
- `review-report.md`：C1~C22 + build 4 偏差复核 + 改进建议 3 项（跟踪）
- `plan.md`：桶级落地设计（R1/RD/RP/LL）+ 迁移 M0~M6 + 测试策略表
- 产物：`packages/lgdl-router/src/index.ts`、`packages/lgdl-render/src/index.ts`、`packages/lgdl-layout/src/layered.ts`、matrix-a/b/geometry-audit/snapshot/degraded 测试、test-assets/golden/（11 svg + manifest）
- 代码基线：git b69bbbf（render-gate 交付）.. c59dab7（本 Feature 收口）

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|---------|---------|
| V1 | **门禁归零 + KNOWN 29 项无残留**（FR-011/NFR-001/EC-001） | ① 单跑 matrix-a（12 用例）；② 单跑 matrix-b（14 注册）；③ `grep KNOWN_A/KNOWN_B` 全仓源码 | matrix-a 11 档 + matrix-b 各档 audit 断言 = `deepEqual(violations,[])` 0 违例；KNOWN 无定义残留（仅头注释历史说明） | 测试覆盖 | node --test + grep |
| V2 | **EC-001 四项修复实测**（FR-001~FR-004/D-001/D-002） | ① er.svg edges[0] 折线不穿 user 实体框 + 基数 '1' bbox 落框外（面法线外置实证）；② uml-class.svg edges[1] 同（payment）；③ state.svg edges[5] label 右缘 ≤ 画布宽；④ gantt.svg launch 时间文本右缘 ≤ 画布宽；⑤ B8 基数全枚举回归绿（EC-009 不误伤）；⑥ B5/B6 聚合 label 0 违例 | 基数 '1' 文本落实体框外（22px 面法线 + y-6）；label/文本 bbox 完整在画布内（估宽口径 CJK/Latin）；专项断言（assertNoOwnBoxPierce）随 matrix-a 绿 | 接口/数据面（SVG 几何）+ 测试覆盖 | SVG path/text 抽取 + 回归测试 |
| V3 | **G6 M1 大段借道 + M2 末端微借道归零**（FR-008/FR-009/D-004/EC-005） | ① architecture edges[10]（聚合边）old vs new path d 对比——x=202 借道消除；② architecture edges[0]/[6]、microservices edges[0]/[6]/[11]/[17]/[18]、ecommerce edges[14]、login-flow edges[3]、mindmap edges[3]/[8] 末端 tick 消除；③ matrix 0 违例佐证 | 大段借道（40~120px）折点消除、入/出段垂直锚点面；1~16px tick 消除（末段垂直落点）；对应 KNOWN 清空后无新违例 | 接口/数据面（SVG 折线几何）+ 测试覆盖 | git diff old/new golden + node --test |
| V4 | **M3 renderGantt dep 三段式垂直进面**（FR-010/EC-008） | ① gantt edges[0..3] dep 不再骑目标条左缘；② B7 三型断言（正交 + x≥轴起点）绿；③ B4b dep 数 = 任务依赖数 + 双渲染一致；④ gap≥20/目标在左分支无回归 | dep path 正交（段轴对齐）、不贴目标条左缘、不穿中间条；B7/B4b 断言全绿 | 接口/数据面 + 测试覆盖 | node --test + SVG dep path 抽取 |
| V5 | **fallback/orthogonalize 兜底语义保持**（NFR-005/EC-003/EC-004/R-001/R-002） | ① 单跑 degraded-paths（场景 1~3）；② 代码走查 detickPath 对 routeEdge best 与 orthogonalize 两路出口均过（:262/:265）；③ 全量矩阵 0 违例观察（无解/兜底不增新违例） | degraded 3/3 绿（不抛/有限/正交）；兜底输出 ride-safe（detick 覆盖）；degraded-paths.test.ts 不在 feature diff 内 | 测试覆盖 + 构建 | node --test + 代码走查 + git diff |
| V6 | **golden 快照显式重建 + 无静默更新**（FR-012/NFR-002/EC-002/ADR-003） | ① 独立脚本磁盘 11 svg sha ↔ manifest 比对；② 结构核验：10 个重建 svg 旧/新 tag 元素序列 + text 内容 + class 集合一致性（EC-002 零结构性变化）；③ 普通模式重跑 render 测试前后 golden sha 不变（无静默写盘）；④ git log 核验快照独立 commit（c59dab7 仅含 golden+manifest） | 11/11 sha 一致；结构性变化 0（仅坐标/折点类 path d 变化）；普通模式 0 写盘；快照 commit 与收编 commit 分离可追溯 | 数据面 + 漂移 | 独立 node 脚本 + sha256sum + git |
| V7 | **口径同源 RIDE_TOL_PX===0.5===edgeRideTolPx**（NFR-001/EC-006/NG-001） | ① git diff b69bbbf..c59dab7 `geometry-audit.ts` 为 0 diff（G1~G6 判定与 AUDIT_TOL 常量零改动）；② 一致性测试单跑（EC-006/ADR-003）；③ router `RIDE_TOL_PX = 0.5` 导出核查 | geometry-audit.ts 0 diff；`AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX === 0.5` 断言绿 | 构建 + 漂移 | git diff + node --test |
| V8 | **测试守恒 503→505 只增不删**（FR-013/NFR-003） | ① 全仓 `grep -ro test(` 计数（b69bbbf vs c59dab7 逐文件比对）；② 变化文件 = 仅 matrix-b(+1 B12) + geometry-audit(+1 一致性)；③ 无既有 *.test.ts 删除行/断言弱化 | 计数 505 ≥ 503；逐文件 diff 仅 2 文件 +1；matrix-a 保持 2（专项断言内嵌不新增用例） | 测试覆盖 + 漂移 | grep + git archive 比对 |
| V9 | **B12 修复前红证据复核**（FR-005/006/007/EC-010） | ① 临时将 layered.ts 回退至 de4456f^（80d8bdf 修复前态）→ 重建 layout → 跑 B12 用例取证红 → 恢复 → 重建 → 复跑绿；② dist 恢复后 sha 与实验前一致 | 修复前 B12 红（G5 nodes[3] rect 越界 viewBox 560，末卡右缘 632 溢 72px——与档 intent 注释一致）；恢复后绿 + layout dist 逐字节还原 | 性能边界（EC）+ 测试覆盖 | git show 换源 + npm build + node --test |
| V10 | **review 2 项改进合成实证**（C9/C20 跟踪） | ① C20：直调 detickPath 构造 n=2 贴边 2 点路径 → 验证输出末点丢目标端点 b（悬空 4px）；② C9：代码核查 render 普通边 routeEdge 调用（:931-940）未传 rideBoxes vs 聚合边（:808）传第 6 参；合成 routeEdge 几何实证缺省 rideBoxes 沿 owning 容器边贴行的潜在通道 + 对照（容器入 obstacles 即绕行 / detick 对 avoid 内框可修正） | C20 复现：n=2 输出 `[a,l,r]` 丢 b（对照建议尾段分支可得 `[a,l,r,b]`）；C9 确认代码级缺口 + 潜在贴边通道存在但 corpus 0 违例未触发（audit 兜底）；两项均非阻塞 | 漂移 + 测试覆盖 | 合成 node 脚本直调 router API |
| V11 | **构建/全仓回归 + 确定性/结构语义**（NFR-006/007） | ① 全仓 `npm test --workspaces` exit 0；② render 包计时；③ B3/B4a/B4b/B9 双渲染语义锁绿（matrix-b 内）；④ svg.test/kind-coverage 结构断言绿（不在 feature diff、零弱化） | 全仓 exit 0 0 fail；确定性语义锁全绿；结构断言绿 | 构建 + 性能边界（时长） | npm test + time |
| V12 | **漂移检测**（NFR-008/EC-001） | ① 文件变更面 = plan §5 所列（router/render/layout/3 测试/matrix-docs-b/golden 10+manifest = 18 文件、0 新增源文件）；② 孤立代码：新增函数（segRideOnAnyBox/detickPath/snapPt/faceNormalOf/textWidthEst/axisStart 语义）↔ FR/D-xxx 映射；③ 需求缺失：13 FR ↔ Vx 落点；④ 规格漂移：spec.md 未再修改（v1.0 单一版本）+ git 历史 6 commit 无「修了未收编/收了未修」中间态 | 0 孤立代码 / 0 需求缺失 / 0 规格漂移；commit 纪律（M1 dbab85f→M2 4068304→M3 80d8bdf→M4 de4456f→收编 4db766d→快照 c59dab7）可追溯 | 漂移 | git diff --stat + grep + git log |

**质量门槛（数量基线法）**：FR 13 项 → V1~V12 每 FR ≥1 Vx（FR-001~004→V2、FR-005~007→V9、FR-008→V3、FR-009→V3、FR-010→V4、FR-011→V1、FR-012→V6、FR-013→V8）；五维相关维度（测试覆盖/接口数据面/构建/性能边界/漂移）各 ≥1 ✓；用户重点实测（门禁归零/修复效果取证/兜底语义/快照纪律/口径同源/守恒/B12 红证据/改进合成）映射 V1~V12 ✓；review 3 项改进建议跟踪映射 V10（改进 1/2 合成实证）+ V12/改进 3（文档回写待作者）。

## 3. 测试覆盖验证
> 运行测试套件，统计覆盖率，逐项标注（执行后回填，见 validate-report.md §3.1）

### 3.1 功能需求 (FR) — 覆盖率 100%（执行后回填）
| 需求 ID | spec 描述 | 验证场景 | 测试结果 | 覆盖率 |
|---------|----------|:--:|:--:|:--:|
| FR-001 | er 基数落实体框外 | V2/V3 | ✅ | 已覆盖 |
| FR-002 | uml-class 基数落实体框外 + 同边滑入消除 | V2/V3 | ✅ | 已覆盖 |
| FR-003 | state 边 label 画布内夹取 | V2 | ✅ | 已覆盖 |
| FR-004 | gantt 里程碑/窄条时间文本不越界 | V2 | ✅ | 已覆盖 |
| FR-005 | layered.ts LR 秩轴按宽估算 | V9 | ✅ | 已覆盖 |
| FR-006 | LR 画布宽 maxNodeRight 兜底 | V9 | ✅ | 已覆盖 |
| FR-007 | B12 LR 宽卡片回归档 | V9 | ✅ | 已覆盖 |
| FR-008 | M1 大段借道消除 | V3/V5 | ✅ | 已覆盖 |
| FR-009 | M2 末端微借道消除 | V3/V5 | ✅ | 已覆盖 |
| FR-010 | M3 renderGantt dep 垂直进面 | V4 | ✅ | 已覆盖 |
| FR-011 | matrix-a/b KNOWN 集清空回 clean | V1 | ✅ | 已覆盖 |
| FR-012 | golden 快照显式重建 + diff 审阅 | V6 | ✅ | 已覆盖 |
| FR-013 | 测试守恒 + 不引入新违例 | V8/V11 | ✅ | 已覆盖 |

### 3.2 非功能需求 (NFR) — 覆盖率 100%（执行后回填）
| 需求 ID | spec 描述 | 验证场景 | 测试结果 | 覆盖率 |
|---------|----------|:--:|:--:|:--:|
| NFR-001 | 门禁归零（断言 clean，G1~G6 零改动） | V1/V7 | ✅ | 已覆盖 |
| NFR-002 | 快照纪律（显式重建 + diff 审阅 + 独立 commit） | V6 | ✅ | 已覆盖 |
| NFR-003 | 测试守恒 ≥503 只增不删 | V8 | ✅ | 已覆盖 |
| NFR-004 | 无新违例（修一个不能坏十个） | V1/V3/V11 | ✅ | 已覆盖 |
| NFR-005 | fallback/退化路径语义保持 | V5 | ✅ | 已覆盖 |
| NFR-006 | DSL/API/输出结构不破坏 | V11/V6 | ✅ | 已覆盖 |
| NFR-007 | 引擎确定性（双渲染字节一致） | V11 | ✅ | 已覆盖 |
| NFR-008 | 修复与收编可追溯 | V12 | ✅ | 已覆盖 |

## 4. 接口与数据实测
> 引擎修复 Feature 无 API/DB；数据面 = golden SVG 几何/字节（V2/V3/V4/V6）+ 审计输出（V1）+ router API 合成输出（V10），见 validate-report.md §3.2

## 5. 构建与脚本验证
> 见 validate-report.md §3.3（全仓 npm test / 单跑矩阵 / 快照重建前后 sha / layout dist 恢复一致性）

## 6. 性能与边界验证
> EC-001（KNOWN 收编中间态，V1/V8）+ EC-002（快照结构变化，V6）+ EC-003/004（fallback/无解率，V5）+ EC-005（锚点浮点稳定化，V3 detick 取证）+ EC-006（口径同源，V7）+ EC-007（估宽口径，V2）+ EC-008（gantt dep 分支，V4）+ EC-009（基数全枚举不误伤，V2）+ EC-010（B12 修复前红，V9）。无量化性能 NFR（spec 8 NFR 均为质量门禁），以测试时长 + 全仓 exit 0 佐证可交付

## 7. 漂移检测
> 执行后回填（V12 + V10 review 改进跟踪）

## 8. 结论
> 执行后回填（见 validate-report.md §6）

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — V1~V12 场景定义（13 FR 全映射 + 五维 + 用户重点门禁归零/修复取证/快照纪律/B12 红证据/2 项改进合成用例），与 validate-report.md 同会话执行（build 已完成 + review passed） | 2026-09-02 | SDDU Validate Agent |
