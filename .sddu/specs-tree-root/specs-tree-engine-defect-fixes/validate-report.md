# 验证报告：specs-tree-engine-defect-fixes（引擎缺陷修复）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md（V1~V12 验证场景 + 五维度指引）
> **前置依赖**: validate.md、spec.md（13 FR/8 NFR/10 EC/D-001~005）、review-report.md（R1：20 通过/2 警告/0 阻塞，结论 ✅ passed）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-02
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建（R1）— V1~V12 全部动态执行（跑 matrix/snapshot/degraded/全仓测试 / git diff 取证 / golden sha 独立比对与结构核验 / 无静默写盘实验 / B12 修复前红 stash 复核 / review 改进 1/2 合成用例直调 router API），结论 ✅ 通过

## 1. 验证概要
> 验证结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 12（V1~V12） |
| 通过 | 12 |
| 失败 | 0 |
| 无法执行 | 0 |
| 阻塞问题 | 0 |

## 2. 逐项验证结果（V1~V12）
> 对照 validate.md 中定义的验证场景，逐项执行并记录实测结果

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | 门禁归零 + KNOWN 29 项无残留（FR-011/NFR-001/EC-001） | 单跑 matrix-a/matrix-b + grep KNOWN | audit 0 违例；KNOWN 无定义残留 | matrix-a **12/12 pass**（基座自举 1 + A 档 11 档全 `deepEqual(violations,[])` clean）；matrix-b **14 注册 13 pass + 1 skip(B11)**（B1~B12 全 clean）；`grep KNOWN_A/KNOWN_B` 仅存于 4 处头注释/说明文本（matrix-a:13、matrix-b:27/44、matrix-docs-b:8/12），**零代码定义残留**；violations 无未知 type/docRef | ✅ |
| V2 | EC-001 四项修复实测（FR-001~004） | golden SVG 取证 + B8/B5/B6 回归 | 基数外置框外、label/文本画布内、无压框 | 见 §3.2 数据面：er edges[0] `M 110,144 L 110,162 L 276,162` 自 user 实体底面 (110,144) 垂直出体（旧态竖穿顶面），基数 '1'@(110,160) 落框外（底弧最低点 y=144 下方）；uml-class edges[1] `M 496,189 L 756,189 L 756,220` 3 折点垂直进 payment 顶面（旧态 6 折点沿 infra 底边 y=322 借道 98px），基数 '1'@(756,192) 框外上方；state「用户取消」@(690,1434) 右缘 ≈714 ≤ 720 ✓（旧 (700,925) 右缘 724>720）；gantt「18d +1d」@(998,283) 里程碑上方，右缘 ≈1020 ≤ 1060 ✓（旧 (1022,296) 右缘 1065>1060）；B8 全枚举绿、B5/B6 聚合 label 0 违例；matrix-a 专项断言 assertNoOwnBoxPierce（er edges[0]/uml edges[1] 折线不穿 from/to 框内部）随 A 档全绿 | ✅ |
| V3 | G6 M1+M2 归零（FR-008/009） | git diff old/new golden path d | 借道/tick 消除、垂直进锚点 | architecture edges[10]（聚合边）`M 242,88 L 202,88 L 202,600 L 353,600`（沿 x=202 借道）→ `M 242,88 L 242,580 L 353,580 L 353,600`；末端 tick 全消：arch edges[0] `L 350,246 L 354,246`→`L 354,246`、arch edges[6]、ms edges[0]/[6]/[11]/[17]/[18]、ecom edges[14] `L 462,1746 L 466,1746`→`L 466,1746`、login edges[3]、mindmap edges[3]/[8] 均末段垂直化；全部 A/B 档 0 违例佐证 | ✅ |
| V4 | M3 renderGantt dep 垂直进面（FR-010/EC-008） | B7/B4b 断言 + dep path 取证 | dep 正交不骑左缘；B7/B4b 绿 | B7 三型（gap≥20/gap≈0/目标在左）dep 全正交（段级轴对齐断言通过）+ x≥轴起点保持；B4b dep 数=1（任务依赖数）且双渲染一致；gantt A 档 audit 0（M3 4 项 KNOWN 消失）；「目标在左」分支 drop 列左移 clear=10 属实现必要微调（review 偏差②复核通过），末段水平垂直进 b.x | ✅ |
| V5 | 兜底语义（NFR-005/EC-003/004） | 单跑 degraded-paths + 代码走查 | 3 场景全绿、兜底 ride-safe | degraded-paths **3/3 pass**（场景 1 routeDefault 零长不抛 / 场景 2 A* 无解→orthogonalize 有限正交 / 场景 3 routeRectilinear fallback 直驱 + renderSvg 端到端不抛）；detickPath 出口双路覆盖（routeEdge :262 best 与 :265 orthogonalize 兜底均过 detick）；degraded-paths.test.ts 不在 feature diff（git diff 0 改动）；矩阵 0 违例观察无兜底新增穿越/贴边 | ✅ |
| V6 | 快照纪律（FR-012/NFR-002/EC-002） | 独立脚本 sha + 结构核验 + 无写盘实验 + git log | 11/11 字节一致；结构性变化 0；普通模式 0 写盘；独立 commit | 磁盘 11 svg ↔ manifest sha **11/11 一致**（version=1、ids 11、无时间戳）；结构核验 10/10 重建 svg：**元素 tag 序列 100% 一致**（arch 512=512、uml-class 288=288、ms 806=806…）、text 内容 100% 一致（10~33 条/档）、class 集合一致，仅 path d 折点/坐标变化（预期）；普通模式重跑 render 全绿且 golden sha 前后 diff 空（**无静默写盘**）；c59dab7 独立 commit 仅含 golden 10 svg + manifest（11 文件、各 ±2 行） | ✅ |
| V7 | 口径同源（NFR-001/EC-006） | git diff audit + 一致性测试 | geometry-audit.ts 0 diff；三值一致 | `git diff b69bbbf c59dab7` `test-support/geometry-audit.ts` **0 diff**（G1~G6 判定 + AUDIT_TOL 全常量零改动：edgeRideTolPx=0.5/canvasPadPx=1/labelPadPx=2 在位）；一致性测试 `EC-006/ADR-003: audit edgeRideTolPx 与 router RIDE_TOL_PX 同源一致（=0.5）` 单跑 ✅ pass；router `export const RIDE_TOL_PX = 0.5`（index.ts:39）| ✅ |
| V8 | 测试守恒 503→505（FR-013/NFR-003） | git archive 逐文件比对 | 505 ≥ 503；仅 2 文件 +1 | 基线 b69bbbf 全仓 `test(` = **503**，收口 c59dab7 = **505**；逐文件 diff 仅 matrix-b 18→19（B12 +1）与 geometry-audit 25→26（一致性 +1），其余 26 文件零变化（matrix-a 保持 2——专项断言同用例内嵌，degraded 4/snapshot 4/svg 7/kind-coverage 13/router 8 均不变）；git diff 无既有 *.test.ts 删除行 | ✅ |
| V9 | B12 修复前红证据复核（FR-005~007/EC-010） | layered.ts 临时回退 80d8bdf → 重建 → 跑 B12 → 恢复 | 修复前红（画布 560 < 632）；恢复绿 + dist 还原 | 回退后 B12 **红**：`G5×3 all nodes[3]`——`rect x=472 w=160 越界 viewBox 0 0 560 240`（末卡右缘 632 溢 **72px**）+ text + line（与档 intent 注释「画布 560 < 末卡右缘 632 溢出 72px」逐字一致）；`git checkout HEAD` 恢复 + 重建后 B12 **绿**（1/1 pass），layout dist sha（layered.js `178c2d03…` / index.js `df20e63c…`）与实验前**逐字节一致**；B12 两两 bbox 不相交 + x+width≤画布 + 宽>高形态断言全绿；M4 commit de4456f = layered 修复 + B12 同批（EC-010 无红档单合） | ✅ |
| V10 | review 改进 1/2 合成实证（C9/C20） | 直调 router API 合成用例 | 见 §3.5 | **C20 复现**：detickPath 对 n=2 贴边 2 点路径输出 `[(0,10),(0,6),(100,6)]`——目标端点 (100,10) **丢失**（终点悬空 4px=bump），与 review C20 描述一致；对照：若按建议尾段分支应得 `[a,l,r,b]`（末段垂直进面 G6-safe）。**C9 确认**：render 普通边 routeEdge 调用（:931-940）确实未传 rideBoxes（聚合边 :808 传第 6 参 rideBoxesAll）；合成几何（owning 容器排除出 obstacles 且不在缺省 rideBoxes）实证 routeEdge 输出沿容器上边线贴行 120px 无惩罚；对照实验：容器入 obstacles（第三方语义）即自动绕行干净、detickPath 对 avoid 内框可抬离贴边段——证明缺口仅限「owning 容器排除面」，当前 corpus 经 audit 兜底 0 违例未触发 | ✅ |
| V11 | 构建/全仓回归 + 确定性/结构（NFR-006/007） | 全仓 npm test + render 计时 | exit 0；语义锁绿；结构断言绿 | 全仓 `npm test --workspaces` **exit 0**（513 tests / 512 pass / 1 skip(B11) / 0 fail）；render 包 99 tests / 98 pass / 1 skip / 0 fail，耗时 ≈12.5s（npm 包装含 tsc）；router 8/8 pass（含 routeEdge 不沿自身源边滑行等 anti-ride 单测）；B3/B4a/B4b/B9 双渲染语义锁全绿（确定性）；svg.test 7/7 + kind-coverage 11/11 + geometry-audit 26/26 全绿（结构断言零弱化） | ✅ |
| V12 | 漂移检测（NFR-008/EC-001） | git diff --stat + 映射核对 | 0 孤立/0 缺失/0 规格漂移；commit 纪律 | 文件变更面 = plan §5 所列 **18 文件**（router/render/layered/3 测试/matrix-docs-b/golden 10 svg+manifest），**0 新增源文件、0 plan 外文件**；6 commit 序列 M1 dbab85f → M2 4068304 → M3 80d8bdf → M4 de4456f（layered+B12 同批）→ 收编 4db766d（KNOWN 清空+断言收编，3 测试文件）→ 快照 c59dab7（仅 golden+manifest）——无「修了未收编/收了未修」中间态；spec.md v1.0 单一版本未再修改；新增函数均映射 FR/D-xxx（见 §3.5） | ✅ |

> ⏭️ 无无法执行项（全部场景本地真实执行；无外部 API/DB 依赖；B12 红取证经可逆换源 + dist 还原验证）。

## 3. 验证详细信息
> 按验证维度展开的详细执行结果

### 3.1 测试覆盖
> 运行测试套件的结果（实测命令输出摘要）

| 需求 ID | spec 描述 | 测试用例 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-001 | er 基数落实体框外 | matrix-a.test.ts::A 档 er（audit 0 + assertNoOwnBoxPierce edges[0]） | ✅ | 已覆盖 |
| FR-002 | uml-class 基数落实体框外 + 滑入消除 | matrix-a.test.ts::A 档 uml-class（audit 0 + assertNoOwnBoxPierce edges[1]） | ✅ | 已覆盖 |
| FR-003 | state 边 label 画布内夹取 | matrix-a.test.ts::A 档 state（audit 0） | ✅ | 已覆盖 |
| FR-004 | gantt 窄条/里程碑文本不越界 | matrix-a.test.ts::A 档 gantt（audit 0） | ✅ | 已覆盖 |
| FR-005 | LR 秩轴按宽估算 | matrix-b.test.ts::B12（两两不相交 + 宽>高形态） | ✅ | 已覆盖 |
| FR-006 | LR 画布宽兜底 | matrix-b.test.ts::B12（全节点 x+width ≤ 画布宽） | ✅ | 已覆盖 |
| FR-007 | B12 回归档新增 | matrix-b.test.ts::B12（+1 test；修复前红证据 V9） | ✅ | 已覆盖 |
| FR-008 | M1 大段借道消除 | matrix-a/b 全档 audit 0 + V3 折点取证 | ✅ | 已覆盖 |
| FR-009 | M2 末端微借道消除 | matrix-a/b 全档 audit 0 + V3 detick 取证 | ✅ | 已覆盖 |
| FR-010 | M3 dep 垂直进面 | matrix-b.test.ts::B7（正交三型）+ B4b（dep 数） | ✅ | 已覆盖 |
| FR-011 | KNOWN 收编回 clean | matrix-a 12 + matrix-b 14 全 `deepEqual([],violations)` | ✅ | 已覆盖 |
| FR-012 | 快照显式重建 + 审阅 | snapshot.test.ts::12 pass + V6 独立比对/结构核验/无写盘 | ✅ | 已覆盖 |
| FR-013 | 测试守恒 + 无新违例 | V8 计数 505 + 全仓 0 fail + 无新 KNOWN | ✅ | 已覆盖 |

### 3.2 接口/数据面（golden SVG 几何 + 字节，Feature 无 API/DB）
> 比对测试资产与审计输出，对照 spec 验收

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| 11 golden svg ↔ manifest sha | 独立 node 脚本（crypto sha256） | 11/11 一致 | **11/11 一致**（version=1、ids 11、files 键齐、无时间戳） | ✅ |
| er edges[0] 走线 | golden svg path 抽取 | 不穿 user 框、垂直出体 | `M 110,144 L 110,162 L 276,162`——user 实体底弧最低点 (110,144) 垂直出体，无穿体段 | ✅ |
| er 基数 '1' 位置 | golden svg text 抽取 | bbox 落 user 框外 | '1'@(110,160)：底弧 y=144 下方 16px（22px 面法线外推 + 绘制 y-6），框外 | ✅ |
| uml-class edges[1] 走线 | golden svg path 抽取 | 垂直进 payment 顶面 | `M 496,189 L 756,189 L 756,220` 3 折点，末段垂直进顶面（旧态 6 折点沿 infra 底边 y=322 借道 98px） | ✅ |
| uml-class 基数 '1' 位置 | golden svg text 抽取 | bbox 落 payment 框外 | '1'@(756,192)：payment 顶面上方 28px（dstCard 22px 外推 + y-6），框外 | ✅ |
| state edges[5] label | golden svg text 抽取 | 右缘 ≤ 720（画布宽） | 「用户取消」@(690,1434)，估宽 48 → 右缘 714 ≤ 720 ✓ | ✅ |
| gantt launch 时间文本 | golden svg text 抽取 | 右缘 ≤ 1060 | 「18d +1d」@(998,283) 里程碑钻石上方居中，估宽 43.4 → 右缘 ≈1020 ≤ 1060 ✓ | ✅ |
| M1 聚合边借道 | golden diff（arch edges[10]） | x=202 借道消除 | 旧 `L 202,88 L 202,600`（沿容器左边 512px）→ 新 `L 242,580 L 353,580 L 353,600` 全净空 | ✅ |
| M2 末端 tick | golden diff（9 条边抽样） | 1~16px tick 消除 | arch edges[0] 4→3 折点、ms edges[0] `L 624,346`、ecom edges[14] `L 466,1746`、login edges[3]、mindmap edges[3]/[8] 等末段全部垂直化 | ✅ |
| 结构核验（EC-002） | 独立脚本 tag/text/class 比对 | 结构性变化 0 | 10/10 重建 svg：tag 元素序列 100% 一致、text 内容 100% 一致、class 集合一致（详见 V6） | ✅ |

### 3.3 构建脚本
> 构建/测试执行结果（本 Feature 无独立 lint 入口，以 tsc 编译链路 + 全仓测试 + dist sha 为证）

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm test`（全仓 workspaces） | 0 | — | 513 tests / 512 pass / 1 skip(B11) / 0 fail（9 包） | ✅ |
| `npm test -w @lgdl/lgdl-render` | 0 | ≈12.5s（含 tsc；node --test 主体 ≈8s） | 99 tests / 98 pass / 1 skip / 0 fail | ✅ |
| 单跑 matrix-a / matrix-b / geometry-audit / degraded-paths / snapshot | 0 | — | 12/12、13+1skip、26/26、3/3、12/12 | ✅ |
| `npm test -w @lgdl/lgdl-router`（含 build） | 0 | — | router 8/8 pass | ✅ |
| 快照普通模式重跑 | 0 | — | 前后 golden sha diff 空（无静默写盘） | ✅ |
| layout dist 恢复一致性 | 0 | — | 实验前后 layered.js/index.js sha 逐字节一致 | ✅ |

### 3.4 性能边界
> 无量化性能 NFR（spec 8 NFR 均为质量门禁）；EC 边界实测

| NFR/EC | 指标要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| EC-001 | KNOWN 收编无中间态 | 6 commit 序列核验：修复(M1~M4)→收编(4db766d)→快照(c59dab7)，无「修了未收编/收了未修」 | 无 | ✅ |
| EC-002 | 快照无未解释结构变化 | 10/10 svg tag/text/class 零变化，仅 path d 折点/坐标 | 无 | ✅ |
| EC-003/004 | fallback/无解兜底语义 | degraded 3/3 绿；矩阵 0 违例（无兜底贴边/穿越） | 无 | ✅ |
| EC-005 | 锚点浮点稳定化 | M2 tick 全消实证（末段精确垂直落点）；snapPt 双 snap 出口 | 无 | ✅ |
| EC-006 | 容差同源 | `edgeRideTolPx === RIDE_TOL_PX === 0.5` 一致性测试绿 | 无 | ✅ |
| EC-007 | 估宽口径 | textWidthEst 与 labelBoxAt 共用（CJK 1.0×fs/Latin 0.62×fs）；state/gantt 实测无误报漏报 | 无 | ✅ |
| EC-008 | gantt「目标在左」/gap≥20 不误伤 | B7 三型断言绿（正交 + x≥轴起点）；gap≥20 分支代码原样未动 | 无 | ✅ |
| EC-009 | 基数全枚举不误伤 | B8（1/0..1/0..*/1..* 双向 22px 外置）全绿 | 无 | ✅ |
| EC-010 | B12 修复前红 | 回退 layered.ts → B12 红（G5×3 nodes[3] 右溢 72px）；恢复绿（V9） | 无 | ✅ |
| NFR-007 | 引擎确定性 | B3/B4a/B4b/B9 双渲染字节一致全绿；快照普通模式重跑 0 diff | 无 | ✅ |
| （性能观测） | render 测试时长 | ≈12.5s（npm 包装）；无性能劣化迹象 | — | ✅ |

### 3.5 漂移检测
> 实现与规范的偏离扫描

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 新增函数 ↔ FR/D-xxx 映射核对 | ✅ 无（segRideOnAnyBox/pathRidesAnyBox/detickPath/snapPt/RIDE_TOL_PX → FR-008/009/D-004/EC-006；faceNormalOf → FR-001/002/D-001-B；textWidthEst → FR-003/004/EC-007；axisStart 语义重命名 → FR-005；B12 → FR-007） |
| 需求缺失（有需求无代码） | FR-001~013 逐项 ↔ 测试落点核对（§3.1） | ✅ 无（13 FR 全绿） |
| 规格漂移（spec 被修改） | git 历史 + 文件版本核验 | ✅ 无（spec.md v1.0 未动；变更面 18 文件 = plan §5 ± 0 新增源文件） |
| review 改进建议跟踪 | 逐项核对 review-report.md §5 | 见下表（0 阻塞） |

**review 3 项改进建议跟踪**：

| # | 改进建议 | 现状（validate R1 实测） | 判定 |
|---|---------|------------------------|:--:|
| 1 | C9：普通边 routeEdge 调用补 `rideBoxes: rideBoxesAll`（render/index.ts:931-940） | 代码核查确认未传（仅聚合边 :808 传第 6 参）；合成 routeEdge 实证「owning 容器排除面 + 缺省 rideBoxes」下输出可沿容器边贴行 120px 无惩罚；当前 corpus 经 obstacles + audit 兜底 0 违例未触发；对照实验证明容器入 obstacles 即自动绕行、detick 对 avoid 内框可修正 | ⚠️ 低危潜在鲁棒性缺口，建议补参或同步注释（待作者/后续 Feature，非阻塞） |
| 2 | C20：detickSegment n=2 分支丢目标端点 b（router/index.ts:702-711） | 合成用例**复现**：n=2 贴边路径 detick 后输出 `[a,l,r]`，终点悬空 4px 丢 b；建议 n===2 并入尾段分支 `[a,l,r,b]`（末段垂直进面 G6-safe）；当前 corpus 无 2 点轴对齐贴边路径，矩阵/快照 0 违例无悬空端点 | ⚠️ 低危潜在边界缺陷，建议补 n===2 分支（待作者/后续 Feature，非阻塞） |
| 3 | 偏差①②文档回写（plan.md §4.2 RP.3 / spec.md EC-008） | 偏差①（collapse 平行容差「>20px 守卫 + segRideOnAnyBox 0.5 同源 + detick 输出兜底」vs 字面「直接收敛 0.5」）与偏差②（M3「目标在左」drop 列左移 clear）经 review 复核为**实现必要微调**；validate 以输出级 0 违例实测收口（V1/V3/V4）；git 历史与代码注释自洽，文档层语义描述待作者回写 | ✅ 代码侧闭环；文档回写待作者（非阻塞） |

## 4. 验证脚本执行记录
> ADR-003 落地：validate Agent 自主编写并直接执行的验证脚本记录
> 脚本存放路径：`/tmp/sddu-validate-specs-tree-engine-defect-fixes-20260902/`

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| v-snapshot-bytes.mjs | 磁盘 11 svg ↔ manifest sha 独立比对 + version/files 核验 | V6 | 0 | 11/11 一致；version=1；ids 11 |
| v-golden-structure2.mjs | 10 重建 svg tag 元素序列 / text 内容 / class 集合前后一致性核验 | V6 | 0 | 10/10 结构性变化 0（仅 path d 折点/坐标类）；text 100% 一致 |
| golden-before.sha / golden-after.sha + render 重跑 | 普通模式无静默写盘实验 | V6 | 0 | 前后 diff 空（无静默更新路径） |
| v-imp2-c20-detick-n2.mjs | C20 合成：detickPath n=2 贴边路径丢目标端点复现 | V10 | 0 | 输出 `[(0,10),(0,6),(100,6)]`，端点 (100,10) 丢失、悬空 4px |
| v-imp1-c9-rideboxes.mjs | C9 合成：routeEdge 缺省 rideBoxes 沿 owning 容器边贴行通道实证 | V10 | 0 | 缺省输出沿容器上边线贴行 120px（重合 >0.5px 命中 G6 判据） |
| v-imp1-c9b-control.mjs | C9 对照：容器入 obstacles 自动绕行 / detick 对 avoid 内框抬离贴边段 | V10 | 0 | 对照 A 绕行干净不贴边；对照 B 贴边段被抬离框边 4px |
| （B12 红取证，可逆换源） | layered.ts 回退 80d8bdf → 重建 layout → 跑 B12 → checkout 恢复 → 重建 → 复跑 | V9 | 0/1 | 修复前 B12 红：G5×3 nodes[3] `rect 越界 viewBox 0 0 560 240`（右溢 72px）；恢复后绿；layout dist sha 逐字节还原 |

> 路径约定：脚本均写入 `/tmp/sddu-validate-specs-tree-engine-defect-fixes-20260902/`，由 validate Agent 自主编写直接执行；全部断言/取证命令可复跑回溯。

## 5. 阻塞问题
> 必须修复后才能通过验证的问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无（review 2 项改进均为低危潜在边界，corpus 0 违例未触发；改进 3 为文档回写非代码缺陷） | — | — |

## 6. 结论

**结论**: ✅ 通过

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（13/13） | 13/13 全绿（matrix-a 12/12 + matrix-b 13+1skip 覆盖 11 FR + 专项/一致性断言） | ✅ |
| NFR 测试覆盖 | ≥80%（8 项） | 8/8 达标 | ✅ |
| 构建退出码 | 0 | 0（全仓 workspaces 513/512+1skip/0fail；render 99/98+1skip/0fail） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0 | 0（孤立代码 0/需求缺失 0/规格漂移 0；review 改进低危待作者） | ✅ |

**理由**: V1~V12 全部动态执行通过，全部基于实测数据：
1. **门禁归零是真实修复而非放宽判定**（V1/V7）：geometry-audit.ts（G1~G6 判定 + AUDIT_TOL 全常量）在 b69bbbf..c59dab7 全程 **0 diff**；KNOWN_A 22 + KNOWN_B 7 = 29 项清空无定义残留，断言收编为更强的 `deepEqual(violations, [])` 硬断言；matrix-a 12/12 + matrix-b 13+1skip 全 clean。
2. **四类修复效果几何取证**（V2/V3/V4）：er edges[0] 竖穿自身框 → 底面垂直出体、基数 '1' 外置；uml-class edges[1] 沿 infra 底边 98px 借道 6 折点 → 3 折点垂直进 payment 顶面、基数外置；state「用户取消」右缘 724→714 入画布；gantt「18d +1d」右缘 1065→1020 入画布；M1 大段借道（arch edges[10] x=202 列 512px）与 M2 末端 tick（9 条边抽样）全消——全部有 old/new path d 逐字对照。
3. **兜底语义保持**（V5）：degraded-paths 场景 1~3 全绿（不抛/有限/正交），detickPath 对 A* best 与 orthogonalize 兜底两路出口均覆盖（ride-safe）；全量矩阵 0 违例观察无兜底新增贴边/穿越。
4. **快照纪律合规**（V6）：磁盘 11 svg ↔ manifest sha 11/11 独立比对一致；10 重建 svg 程序化结构核验零结构性变化（tag 元素序列/text/class 100% 一致，仅坐标/折点）；普通模式重跑 0 写盘；快照独立 commit（c59dab7）与收编 commit（4db766d）分离可追溯。
5. **口径同源**（V7）：`AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX === 0.5` 一致性断言绿；router 侧收敛而非 audit 放宽。
6. **测试守恒 503→505**（V8）逐文件只增不删（B12 +1、一致性 +1），matrix-a 专项断言内嵌不新增 test()。
7. **B12 修复前红证据复核闭环**（V9）：回退 layered.ts → B12 红（G5×3，末卡右溢 72px，与档注释逐字一致）→ 恢复绿 → layout dist 逐字节还原。
8. **review 2 项改进合成实证**（V10）：C20（detick n=2 丢尾端点）API 层复现、C9（普通边未传 rideBoxes）代码确认 + 潜在通道实证——两者均属低危潜在边界、corpus 0 违例未触发，非阻塞；建议待作者决定顺手修复或后续 Feature 硬化（改进 3 文档回写同待作者）。

> 遗留（非阻塞，待作者）：① C9 普通边 routeEdge 补 `rideBoxes: rideBoxesAll`（低危硬化）；② C20 detickSegment n===2 分支并入尾段（低危边界修复）；③ plan.md §4.2/spec.md EC-008 偏差①②语义回写。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）— V1~V12 全部动态执行：门禁归零 + 修复效果 golden 取证 + 快照纪律 + 口径同源 + 守恒 505 + B12 红复核 + 改进合成实证全通过；结论 ✅ 通过（FR 13/13、NFR 8/8、构建 0、阻塞 0、漂移 0） | 2026-09-02 | SDDU Validate Agent |
