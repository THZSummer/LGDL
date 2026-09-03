# 任务分解：specs-tree-engine-defect-fixes（引擎缺陷修复 — 门禁暴露的渲染/布局/走线缺陷）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md（技术方案 v1.0，4 ADR 内联 + 桶级落地 R1/RD/RP/LL/T6 + 迁移 M0~M6）、spec.md（13 FR/8 NFR/10 EC/D-001~005）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 将 plan §4.3 迁移步骤（M0~M6，router → render → layout → 收编批）分解为 15 个原子任务、6 个执行波次；标注依赖与并行窗口（M2/M3 内部部分并行）；每任务含文件:行号、验收标准（引用测试名/KNOWN 映射/命令）与验证命令；关键路径 11 任务

---

## 1. 依赖拓扑总览
> 任务依赖关系和执行顺序

```
Wave 1 ─── (M0 基线，单任务)
  TASK-001 [S]  M0 全仓基线记录（503 绿 + git clean）

Wave 2 ─── (M1 router 桶 R1 + render RD.1，串行链 + 部分并行，同波收口 1 commit)
  TASK-002 [S]  R1.6 RIDE_TOL_PX 导出 + R1.1 snapPt 锚点数值稳定化
  TASK-003 [M]  R1.2 pathHitsOwnBody.segInside 交集判据重写 + R1.3 collapse 自身框穿越拒绝 + 容差收敛
  TASK-004 [M]  R1.5 ride 全集硬拒（router）+ RD.1 render 调用点传 ride 全集
  TASK-005 [L]  R1.4 detickPath 输出 pass + M1 波次验证门 + M1 commit

Wave 3 ─── (M2/M3 renderer 桶，并行窗口，波末分别收 M2、M3 两个 commit)
  TASK-006 [M]  M2-RP.3 renderGantt dep gap∈[-4,20) 三段式垂直进面（可并行）
  TASK-007 [M]  M3-RD.2 基数面法线外置 faceNormalOf（可并行）
  TASK-008 [M]  M3-RP.1 placeLabelBox 画布约束 + clamp 兜底（可并行）
  TASK-009 [M]  M3-RP.2 gantt 窄条文本近右缘回退 + textWidthEst（可并行）
  TASK-010 [S]  M2+M3 波次验证门 + M2/M3 独立 commit

Wave 4 ─── (M4 layout 桶 LL，串行，波末收口 1 commit)
  TASK-011 [M]  LL.1 秩轴尺寸按 rankdir 取维度 + LL.2 LR 画布宽 maxNodeRight 兜底
  TASK-012 [M]  LL.3 B12 回归档 + B2 注释 + M4 验证门（含修复前红取证）+ M4 commit

Wave 5 ─── (M5 收编批 T6，串行，两个独立 commit)
  TASK-013 [L]  KNOWN 29 项清空 + 断言 0 违例 + 专项断言 + RIDE_TOL_PX 一致性测试 + 收编 commit
  TASK-014 [L]  LGDL_UPDATE_SNAPSHOTS=1 快照显式重建 + 逐张 diff 审阅 + 独立 commit

Wave 6 ─── (M6 验证交接，单任务)
  TASK-015 [S]  全仓守恒 ≥505 + 门禁归零 + 29 项清空映射核对 + validate 交接
```

### 依赖图（edges）

```
TASK-001 → TASK-002 → TASK-003 ─┐
                    └→ TASK-004 ─┴→ TASK-005 → TASK-006 ─┐
                                              ├→ TASK-007 ─┤
                                              ├→ TASK-008 ─┼→ TASK-010 → TASK-011 → TASK-012
                                              └→ TASK-009 ─┘                                    │
                                                                                                ↓
TASK-015 ←────────────────────────── TASK-014 ←──────────── TASK-013 ←──────────────────────────┘
```

### 关键路径（Critical Path，11 任务）

```
TASK-001 → TASK-002 → TASK-003 → TASK-005 → TASK-006 → TASK-010 → TASK-011 → TASK-012 → TASK-013 → TASK-014 → TASK-015
```

（TASK-004 与 TASK-003 同层并行、TASK-007/008/009 与 TASK-006 同层并行，均不延长关键路径；最长依赖深度 = 11）

### 波次-迁移步-KNOWN 清空映射总览

| 波次 | 迁移步 | 任务 | 预期清空 KNOWN（按 discovery §3.4 口径） |
|:--:|:--:|------|------|
| W1 | M0 | TASK-001 | —（基线 503 绿） |
| W2 | M1 | TASK-002~005 | 基数穿体根因 + M1/M2 router 面（uml-class G6 infra98、architecture edges[10]×2、B5 out120 + 13 项末端微借道 + er/uml G4 若自愈）——逐项在 TASK-005 输出核对，无新违例 |
| W3 | M2/M3 | TASK-006~010 | gantt G6×4、B4b×1、B7×2（M2/RP.3）；state G5、gantt G5、er/uml G4 兜底（M3/RD.2+RP.1+RP.2） |
| W4 | M4 | TASK-011~012 | B2-LR 潜伏项 → B12 档新增守护（0 KNOWN 可清，补 +1 test） |
| W5 | M5 | TASK-013~014 | 29 项 KNOWN 全部清空 + 断言收编 0 违例 + 快照显式重建 |
| W6 | M6 | TASK-015 | 终验：KNOWN 无残留、0 违例、守恒 ≥505 |

---

## 2. 任务列表
> 每个任务的详细定义

### TASK-001: M0 全仓基线记录
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR** | FR-013（守恒基线）/ NFR-003 |

**一句话摘要**: 跑通全仓测试确认 503 绿基线 + git clean，为 M6 守恒门禁锚定 `test(` 计数基准。

**描述**: 全仓 `npm test` 记录 503 绿基线（2026-09-03 render-gate b69bbbf 口径）与全仓 `test(` 计数（作为 TASK-013/TASK-015 守恒核对基准）；确认 git 工作区除本 feature 目录（`.sddu/...` 未跟踪）外无其他改动。纯记录任务，不产生代码 commit；基线记录到 build 会话笔记供收编批引用。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| —（无代码变更，仅记录基线） | — |

**验收标准**:
- [ ] `npm test` 全绿且测试计数 ≥ 503（记录实际计数 N₀）
- [ ] `git status --short` 除 `.sddu/specs-tree-root/specs-tree-engine-defect-fixes/` 未跟踪目录外无任何改动
- [ ] 基线计数 N₀ 已记录（供 TASK-013「N₀ + B12 +1 + 一致性 +1 ≥ 505」核对）

**验证命令**:
```bash
npm test
git status --short
```

### TASK-002: M1-① R1.6 RIDE_TOL_PX 常量导出 + R1.1 snapPt 锚点数值稳定化
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-001 |
| **执行波次** | Wave 2 |
| **对应 FR** | EC-005（浮点先置）/ EC-006（同源化）→ 支撑 FR-001/FR-002/FR-009 |

**一句话摘要**: 导出 `RIDE_TOL_PX=0.5` 常量并新增 `snapPt` 稳定化锚点，先置消除 5e-14 浮点噪声对后续判定边界的放大。

**描述**: `lgdl-router/src/index.ts`：(1) 新增 `export const RIDE_TOL_PX = 0.5`，注释声明对齐 render test-support `geometry-audit.ts` `AUDIT_TOL.edgeRideTolPx`（EC-006/ADR-003 载体，TASK-013 一致性测试消费）；(2) 新增 `snapPt`（`(v)=>Math.round(v*1e6)/1e6` 级）并接入 routeEdge 的 `srcPt`/`dstPt` 封装（:145-146）与 routeRectilinear 入口 src/dst——消除 entity 顶弧 `y=40.00000000000005`（shapeEdgePoint :259-283 浮点解）级噪声（R-006）。本任务为纯稳定化，行为不变。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-router/src/index.ts` |

**验收标准**:
- [ ] lgdl-router 编译通过；`RIDE_TOL_PX` 从包导出且值 = 0.5（import 冒烟断言）
- [ ] `router.test.ts` 全绿（稳定化不改变任何既有路由行为）
- [ ] 冒烟：entity 顶弧锚点 snap 后 = 精确框边坐标（如 y=40，非 40.00000000000005）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-router
```

### TASK-003: M1-② R1.2 segInside 交集判据重写 + R1.3 collapse 自身框穿越拒绝 + 平行容差收敛
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 2 |
| **对应 FR** | FR-001（D-001-A-2）/ FR-002 / FR-009（D-004-M2 源收敛） |

**一句话摘要**: 重写 `pathHitsOwnBody.segInside` 为「段-框内部交集」判据，并给 `collapseGridPath.segClear` 增加自身框内部穿越拒绝 + 平行贴墙容差从 20px 收敛到 `RIDE_TOL_PX`（堵死竖穿自身框的 L 捷径根因）。

**描述**: `lgdl-router/src/index.ts`：(1) `pathHitsOwnBody.segInside`（:90-102）由「两端严格在框外 `out(a)&&out(c)`」重写为轴对齐段与框内部交集判据——垂直段满足 `box.x+0.5 < x < box.x+box.w-0.5` 且 y 范围与框体交集 > 0.5px 即判穿体（水平段镜像）；锚点贴边（y=box.y）时段伸入框内即产生正交集 → 正确捕获「起于边界、穿体而过」，合法垂直进上/下面不受影响；(2) `collapseGridPath.segClear`（:763-784）对 `ownBoxes` 增加两语义：内部穿越拒绝（与 R1.2 同判据，堵死「走廊绕行被塌成穿体 L 捷径」）+ 平行贴墙容差 `pathHugLength>20`（:782）收敛为 `>RIDE_TOL_PX` 即拒（A-005 已裁决为缺陷）。第三方 boxes 循环（:765-774）不动；该函数被 routeEdge 复查（:213）与 quality（:188）调用 → 重写后穿体候选自动被弃、A* 换锚点对重试（:210-216）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-router/src/index.ts` |

**验收标准**:
- [ ] `router.test.ts` 全绿；`degraded-paths.test.ts` 场景 1/2（直驱 routeEdge）语义保持（不抛/有限/正交，最终以 TASK-005 门禁确认）
- [ ] 合成几何冒烟（可选临时用例）：「锚点顶出 + 目标右下」routeEdge 输出不再竖穿 src 自身框内部（>0.5px 交集）
- [ ] collapse 不再塌缩出「沿自身框平行段 > 0.5px」或「横穿 own box 全程」的候选

**验证命令**:
```bash
npm test -w @lgdl/lgdl-router
```

### TASK-004: M1-③ R1.5 ride 全集硬拒（router）+ RD.1 render 调用点 ride 全集
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-002（可与 TASK-003 并行，同文件异函数区间） |
| **执行波次** | Wave 2 |
| **对应 FR** | FR-008（D-004-1，方案 3.1-A / ADR-001）/ FR-002 联动 G6 |

**一句话摘要**: router 侧新增 `segRideOnAnyBox` 并接入 routeRectilinear 候选过滤与 routeEdge quality 的 ride 全集；render 聚合/普通边调用点同步传 ride 全集（含端点组/owning 组，与 auditG6 障碍集同构）。

**描述**: router（`lgdl-router/src/index.ts`）：新增 `segRideOnAnyBox(a,b,boxes)`（与 audit `segRideOnBox` :434-473 几何同构：共线距离 <`RIDE_TOL_PX` 且重合 >0.5px）；`routeRectilinear` 候选循环（:594-601）在 `pathCrosses`（:595）后加 ride 检查弃贴边候选；`routeEdge` quality（:187-206）clearBoxes（:191-193）扩展为 ride 全集——新增 `opts.rideBoxes` 入参（缺省 = clearBoxes，签名向后兼容，degraded-paths :70/:119 直驱不传保持绿）。render（`lgdl-render/src/index.ts`）：聚合边 `routeRectilinear` 调用（:745）与普通边 `routeEdge` 调用（:863）传 `rideBoxes` = 全 layout.nodes + 全 boxOf 容器（与 auditG6 :961-972 障碍集同构）；**避障 boxes 不变**（可达性不变，仅 ride 判定用全集）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-router/src/index.ts` |
| MODIFY | `packages/lgdl-render/src/index.ts` |

**验收标准**:
- [ ] `router.test.ts` 全绿；degraded 直驱缺省参数调用语义保持（场景 2）
- [ ] lgdl-render 编译通过（RD.1 调用点与新签名匹配）
- [ ] 冒烟：uml-class 几何下 routeRectilinear/routeEdge 不再产出沿 owning 组（infra）底边 >0.5px 共线段（最终以 TASK-005 matrix 核对为准）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-router
npm run build -w @lgdl/lgdl-render
```

### TASK-005: M1-④ R1.4 detickPath 输出 pass + M1 波次验证门 + M1 commit
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-002、TASK-003、TASK-004 |
| **执行波次** | Wave 2 |
| **对应 FR** | FR-009（D-004-2 detick / ADR-002）/ FR-001/FR-002（出/入段垂直化）/ NFR-005 |

**一句话摘要**: 新增 `detickPath` 对 routeEdge 与 routeRectilinear 输出做末段垂直化 + 中间段 bump 修正，消除 1~16px 末端微借道；随后跑 M1 全量验证门并创建 M1 commit（router + render 调用点）。

**描述**: router（`lgdl-router/src/index.ts`）：新增 `detickPath(pts, srcAnchor, dstAnchor, srcNode, dstNode, rideBoxes)`——(1) 首末段若与锚点所在面平行（沿面滑行）或与任一 rideBox 边线共线（距离 <`RIDE_TOL_PX`）且重合 >0.5px → 相邻折点移到锚点面法向坐标，使入/出段严格垂直（垂直段与框边重合≈0，天然不命中 G6）；(2) 中间段贴 rideBox 边线者 bump（向框外侧平移 `RIDE_TOL_PX`+ε 或插入 8px 垂直折点），修正后复验 `pathCrosses` + `pathHitsOwnBody`（不穿第三方/不穿自身，通不过则保留原路径并记录，R-008）；(3) routeEdge 返回前（:217 `if(best)` 与 :220 orthogonalize 兜底两路）与 routeRectilinear 返回前（:602 前）统一接入 → fallback/orthogonalize 输出也 ride-safe。

**M1 波次验证门**（本任务收口）：按 plan M1 验证点①~④ 执行；**M1 commit**（lgdl-router 全部 R1 + lgdl-render RD.1 同 commit，EC-001 无中间态）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-router/src/index.ts` |

**验收标准**:
- [ ] ① `degraded-paths.test.ts` 场景 1~3 全绿（fallback/orthogonalize 语义保持：不抛/有限/正交，NFR-005/R-001 兜底）
- [ ] ② `geometry-audit.test.ts` / `svg.test.ts` / `kind-coverage.test.ts` 全绿
- [ ] ③ matrix-a/b 运行输出核对：M1/M2 router 面目标 KNOWN 消失——uml-class G6（infra 98px）、architecture G6 edges[10]×2（user 40 + core 83）、B5 G6（out 120）、architecture edges[0]/[6]、microservices×4、login-flow edges[3]、ecommerce-flow edges[14]、mindmap edges[3]/[8]、B1 edges[3]/[4]、B9 edges[1] 逐项核对 0 actual；**无新违例**（violations 不出现未知 type/docRef）。断言红属预期（KNOWN 期望在但 0 违例）——禁止放宽断言/新增 KNOWN 掩盖
- [ ] ④ snapshot 红属预期（走线变化字节 diff），**不重建**
- [ ] M1 commit 存在（含 router + render RD.1）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-router
npm test -w @lgdl/lgdl-render   # 解读：matrix 红仅限 KNOWN 消失配对；degraded/audit-helper/svg/kind-coverage 绿
git add packages/lgdl-router/src/index.ts packages/lgdl-render/src/index.ts && git commit -m "fix(router): ... M1 桶 R1 + RD.1"
```

### TASK-006: M2 RP.3 renderGantt dep gap∈[-4,20) 三段式垂直进面
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-005 |
| **执行波次** | Wave 3 |
| **对应 FR** | FR-010（D-004-3）/ EC-008 |

**一句话摘要**: 重写 renderGantt 依赖边 gap≈0 分支为缘间空隙中列/回穿 clear 列的三段垂直进面，消除骑目标条左缘 16px（M3/Q-008）。

**描述**: `lgdl-render/src/index.ts` renderGantt（:1103-1113）：`gap∈[-4,20)` 分支重写（现 :1108-1109 单 L 骑目标左缘）——
- `gap≥8`：垂直列取缘间空隙中列 `cx = a.x + gap/2`（不贴源右缘/目标左缘）→ 四段 `M a L (cx,a.y) L (cx,b.y) L b`；
- `gap<8`（≈0 两缘相接）：垂直列取回穿源右缘 clear 列 `cx = a.x - clear`（clear≈8~12，>0.5px 判定余量充足）→ `M a L (cx,a.y) L (cx,b.y) L b`（末段水平从 cx 进 b.x 与目标左缘垂直；回穿源条的短段属 dep 自身端点 from，G3 豁免；与源条右缘距离 clear 不共线）。

硬约束（EC-008）：保持正交、不穿中间条；`gap≥20`（:1105-1107）与「目标在左」（:1110-1112）分支**不动**（B7 三型断言只验形态性质，须实测绿）。clear 参数值若 build 需微调须记录。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/index.ts` |

**验收标准**:
- [ ] matrix-a gantt G6×4 KNOWN 消失（edges[0..3] design/develop/test/launch 0 actual）
- [ ] matrix-b B4b edges[0]（t3）、B7 edges[1]/[2]（t2/t3）G6 KNOWN 消失（0 actual）
- [ ] B7 三型断言（正交 + x≥轴起点）保持绿；依赖边不穿中间任务条（auditG2 兜底）
- [ ] gap≥20 与「目标在左」分支路径未变（B7 全绿 + 快照 diff 局限在预期分支）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-render   # matrix 红仅限 KNOWN 消失配对；B7 形态断言绿
```

### TASK-007: M3-① RD.2 基数面法线外置 faceNormalOf
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-005（可与 TASK-008/009 并行） |
| **执行波次** | Wave 3 |
| **对应 FR** | FR-001/FR-002（D-001-B 兜底）/ EC-009 |

**一句话摘要**: 新增 `faceNormalOf(box, anchor)` 按锚点最近面取外法线，基数 22px 外推与折线局部方向解耦，防基数回落框内。

**描述**: `lgdl-render/src/index.ts`（:896-930）：新增 `faceNormalOf(box, anchor)`——anchor 距 4 边取最近（容差 ~1px，覆盖 roundedRect 角弧 r=6 与 entity 顶弧 r=10 弧点），外法线 = 上(0,-1)/下(0,1)/左(-1,0)/右(1,0)；基数 `srcCard = p0 + normal_src*22`、`dstCard = pn + normal_dst*22`（:920-921 替换，不再依赖折线端点局部方向 :908-917）；绘制 y-6（:929-930）保持。EC-009：B8（基数全枚举双向 22px 外置不压框）必须保绿 → 面法线对 4 面 + 15° 锚点全覆盖；正常出体场景与原局部方向一致，仅滑入/穿体场景翻转修正。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/index.ts` |

**验收标准**:
- [ ] er/uml-class A 档 G4 KNOWN 消失（M1 已自愈则回归确认 0 actual；未自愈则本任务兜底后 0 actual）
- [ ] B8（matrix-b 基数全枚举 1/0..1/0..*/1..* 双向 22px 外置不压框）回归绿（EC-009，R-009 防误判面）
- [ ] 基数文本 bbox 完全落在实体框外（G4 判定不命中）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-render
```

### TASK-008: M3-② RP.1 placeLabelBox 画布约束 + clamp 兜底
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-005（可与 TASK-007/009 并行） |
| **执行波次** | Wave 3 |
| **对应 FR** | FR-003（D-002-1）/ EC-007 / R-010 |

**一句话摘要**: `placeLabelBox` 增加画布参数并在 isFree/候选/回退/兜底全链约束估宽 bbox 落画布内，消除 state label 越界 4px。

**描述**: `lgdl-render/src/index.ts` placeLabelBox（:282-336）：签名增画布参数（layout.width/height 已在作用域内）；`isFree`（:288-293）增加「labelBoxAt 估宽 bbox 完整落在画布内」约束（右/下缘 ≤ 画布 + `canvasPadPx=1` 同款容忍；左/上缘 ≥ 0）；候选（:319-325）与回退（:327-333）越界候选自然被拒；**最终兜底 :334 改 clamp 后放置**（`x=clamp(ideal.x, w/2, canvasW-w/2)`），保证无路径返回越界点 → auditG5 必 0。三调用点口径一致（D-002-1）：普通边 label（:932）、聚合边 label（:758）、rel label（:924），均传画布宽高；聚合边 bg rect（:759-762）在调用点做 bg 级 clamp（bg 不出画布）。影响预期：state edges[5]「用户取消」贴右缘竖直段中点 (700,925)（估宽 48 → 724>720）候选剔除后落到合法候选。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/index.ts` |

**验收标准**:
- [ ] state A 档 G5 KNOWN 消失（0 actual；edges[5] label 右缘 ≤ 720 + 1px 容忍）
- [ ] B5/B6 聚合 label 0 违例、bg rect 不出画布（R-010：clamp 兜底不产生新 G4 压框）
- [ ] 普通边 label 定位不劣化（A 档其余文档 label 0 违例）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-render
```

### TASK-009: M3-③ RP.2 gantt 窄条文本近右缘回退 + textWidthEst
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-005（可与 TASK-007/008 并行） |
| **执行波次** | Wave 3 |
| **对应 FR** | FR-004（D-002 / 方案 3.3-A / ADR-004-②）/ EC-007 |

**一句话摘要**: 新增 `textWidthEst` 估宽 helper，renderGantt 外置窄条文本近右缘时回退条左侧/里程碑上方，消除 gantt G5 越界 ~5.4px。

**描述**: `lgdl-render/src/index.ts`：(1) 新增 `textWidthEst(text, fs)`（CJK 1.0×fs / Latin 0.62×fs，与 `labelBoxAt` :249 口径一致，「18d +1d」全 ASCII → 7×6.2=43.4）；(2) renderGantt 外置分支（:1131-1135，`!inside` 即条宽 <64）：计算外置起点 `x = node.x + node.width + 6` 与估宽，若 `x + w > layout.width`（含容差）→ 回退：条左侧 end 对齐（`text(node.x - 6, cy, …, 'end')`）或里程碑（:1136-1143）钻石上方居中（build 选一，两变体均画布内）；dur=0 milestone（条宽 20）同机制覆盖。文本语义 `${start}d +${dur}d` 不变（NG-005）。**不做 layout 右缘预留**（layout/index.ts:718 不动，方案 3.3-A）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/index.ts` |

**验收标准**:
- [ ] gantt A 档 G5 KNOWN 消失（nodes[4] launch「18d +1d」0 actual；文本右缘 ≤ 1060 + 1px）
- [ ] 文本语义 `${start}d +${dur}d` 不变（NG-005）
- [ ] dur=0 milestone（条宽 20）同机制覆盖（B4b/B7 回归绿）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-render
```

### TASK-010: M2+M3 波次验证门 + M2/M3 独立 commit
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-006、TASK-007、TASK-008、TASK-009 |
| **执行波次** | Wave 3 |
| **对应 FR** | NFR-001 / NFR-004 / NFR-005 / NFR-007 |

**一句话摘要**: 波次收口验证 M2/M3 目标 KNOWN 全消失且无新违例，按迁移步分别提交 M2（renderGantt dep）、M3（renderer 文本/基数）两个独立 commit。

**描述**: 波次收口——matrix-a/b violations 全量检查：M2 目标（gantt G6×4、B4b G6、B7 G6×2）与 M3 目标（state G5、gantt G5、er/uml G4 兜底）消失且**无新违例**；B8/B5/B6/B7 回归绿；degraded/audit-helper/svg/kind-coverage 保持绿；snapshot 红属预期不重建。按 plan 迁移步创建 **M2 commit**（RP.3）与 **M3 commit**（RD.2+RP.1+RP.2）——顺序执行分别提交（R-011 小步可审）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| —（仅验证与提交） | — |

**验收标准**:
- [ ] M2/M3 目标 KNOWN 全部 0 actual；violations 无未知 type/docRef（NFR-004）
- [ ] B8/B5/B6/B7 断言绿；degraded 场景 1~3、geometry-audit/svg/kind-coverage 全绿
- [ ] snapshot 红属预期未重建（无静默写盘）
- [ ] M2、M3 两个独立 commit 存在，git 历史无混合中间态

**验证命令**:
```bash
npm test -w @lgdl/lgdl-render
git log --oneline -4
```

### TASK-011: M4-① LL.1 秩轴尺寸按 rankdir 取维度 + LL.2 LR 画布宽 maxNodeRight 兜底
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-010（plan 迁移顺序后置；技术上独立，出于 diff 审阅面串行） |
| **执行波次** | Wave 4 |
| **对应 FR** | FR-005 / FR-006（D-003-1/-2/-4） |

**一句话摘要**: layered.ts LR 秩轴步进量从 rankMaxH 改为 rankMaxW + LR 画布宽按节点实际右缘兜底，宽>高卡片不再重叠/溢出（B2-LR 根因）。

**描述**: `lgdl-layout/src/layered.ts`：(1) LL.1——保留 `rankMaxH`（:201-207）仅作 TB 秩轴与交叉轴参照；新增每秩 `rankMaxW`（该秩 max 节点宽度）；`rowY`（:215-221）语义重命名为 `axisStart`，步进量按 rankdir 取 `(LR ? rankMaxW[r] : rankMaxH[r]) + RANK_SEP`（:219）；`totalRankH`（:221）仅 TB 用；(2) LL.2——LR 分支画布 `width`（:253-256）改 `Math.max(...nodes.map(p=>p.x+p.width)) + GRAPH_MARGIN`（镜像 TB :258-259 maxNodeRight 兜底），height 保持 `maxLayerW + GRAPH_MARGIN*2` 不变。TB 行为零变化（FR-005-② 显式验收）。layoutGrouped/layoutHierarchical 两条入口共用 layeredRun 一并受益（D-003-4）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-layout/src/layered.ts` |

**验收标准**:
- [ ] lgdl-layout 编译 + 测试绿（构建产物含测试）
- [ ] TB 行为零变化：现有 TB 文档坐标/断言语义不变（LR 修复不波及）
- [ ] 临时/合成 LR 4×160×48 卡链冒烟：相邻 rank bbox 不相交、画布宽 ≥ 末卡右缘 + MARGIN（正式断言由 TASK-012 B12 落位）

**验证命令**:
```bash
npm run build -w @lgdl/lgdl-layout && npm test -w @lgdl/lgdl-layout
```

### TASK-012: M4-② LL.3 B12 回归档 + M4 验证门 + M4 commit
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-011 |
| **执行波次** | Wave 4 |
| **对应 FR** | FR-007（D-003-3）/ EC-010 |

**一句话摘要**: 新增 B12 LR 宽卡片回归档（两两不相交 + 不溢出 + audit 0），更新 B2 注释，取修复前红证据，跑 M4 关键回归后同批 commit。

**描述**: (1) `matrix-docs-b.ts` registry 追加 **B12** 条目：uml-class、无 group → layoutHierarchical LR、4 张无成员短卡 a→b→c→d 链（160×48 宽>高，与 Q-005 实证形态一致）；intent 注明「暴露 B2-LR 缺陷的回归档，修复前 G5 红（画布 560 < 末卡右缘 632 溢出 72px），修复后 0 违例」；B2 intent 注释（:118-120）更新「偏差 B2-LR 已由 B12 覆盖，本文档维持单 rank 纵排折叠验证形态」。(2) `matrix-b.test.ts` 新增 B12 用例：`renderClean('B12')`（KNOWN_B 无条目 → 0 违例）+ **显式两两 bbox 不相交断言** + 全部节点 `x+width ≤ layout.width`（重叠/溢出非 G1~G6，显式断言不可省 FR-007-①）。(3) **修复前红取证**（EC-010）：`git stash push packages/lgdl-layout/src/layered.ts`（临时回退 TASK-011 修复）→ 跑 B12 断言红（G5 溢出）记录证据 → `git stash pop` 恢复 → B12 绿。matrix-b `test(` 计数 +1。(4) **M4 验证门 + commit**：B12 全绿；B2 单 rank 形态绿；**er/uml-class A 档 audit 0**（LR 坐标漂移后走线经已修 router 重算仍 0 违例——关键回归点，FR-005/FR-006）；TB 文档零变化确认；M4 commit（layered.ts + matrix-docs-b.ts + matrix-b.test.ts 同批，B12 不与修复分离合入）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/test-support/matrix-docs-b.ts` |
| MODIFY | `packages/lgdl-render/src/matrix-b.test.ts` |

**验收标准**:
- [ ] B12 用例绿：audit 0 违例 + 两两 bbox 不相交 + 全部节点不溢出（matrix-b `test(` +1）
- [ ] B2 现档单 rank 折叠形态绿 + intent 注释已更新引用 B12
- [ ] er/uml-class A 档 audit 0（LR 漂移后重算仍 0 违例）；TB 文档无新增 diff（除后续预期快照 diff）
- [ ] 修复前红证据已记录（B12 在 layered.ts 修复 stash 态红 → unstash 绿）
- [ ] M4 commit 存在（layout 修复 + B12 同批）

**验证命令**:
```bash
npm test -w @lgdl/lgdl-render
git stash push packages/lgdl-layout/src/layered.ts && npm test -w @lgdl/lgdl-render  # 取证红
git stash pop && npm test -w @lgdl/lgdl-render                                      # 恢复绿
git add packages/lgdl-layout/src/layered.ts packages/lgdl-render/src/test-support/matrix-docs-b.ts packages/lgdl-render/src/matrix-b.test.ts && git commit
```

### TASK-013: M5-① 收编批：KNOWN 29 项清空 + 断言 0 违例 + 专项断言 + RIDE_TOL_PX 一致性测试
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-012 |
| **执行波次** | Wave 5 |
| **对应 FR** | FR-011（D-005-1）/ FR-001-③（专项断言，方案 3.5-A）/ EC-006（一致性）/ FR-013（守恒）/ NFR-003 |

**一句话摘要**: 同一收编批内清空 KNOWN_A（22）+ KNOWN_B（7）并收编断言为 0 违例，落 er/uml 穿体专项断言与 RIDE_TOL_PX 一致性断言，全量绿后独立 commit（不含快照）。

**描述**: 收编批（D-005，单一批次，EC-001 无中间态）——
1. `matrix-a.test.ts`：KNOWN_A（:38-71）全删、头注释（:9-23）更新 clean、`assertAudit`（:73-91）收编为 0 违例（`assert.deepEqual(violations, [])`）；matrix-a 11 档全 clean；
2. er/uml-class **专项断言**（FR-001-③，matrix-a 档内，方案 3.5-A）：解析 er edges[0] / uml-class edges[1] 的 `<path d>`（M/L token 轻量解析 ~15 行），断言任一段不与 from/to 实体框内部相交（锚点除外）——G3 豁免端点故门禁 0 违例不足证，须测试侧自查（D-001-4，R-007）；
3. `matrix-b.test.ts`：KNOWN_B（:48-60）全删、头注释（:23-25）更新、`assertAuditKnown`（:63-79）收编为 0 违例；B12 等各档全 clean；
4. `geometry-audit.test.ts`：新增一致性断言 `AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX === 0.5`（import `@lgdl/lgdl-router`；EC-006/ADR-003；`test(` +1）；
5. 全量 `npm test` 绿；守恒核对：`test(` 计数 = 基线 N₀（≥503）+ B12(+1) + 一致性(+1) ≥ 505；既有 *.test.ts 无删除行/断言弱化；
6. **收编独立 commit**（不含快照；快照在 TASK-014 单列）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/src/matrix-a.test.ts` |
| MODIFY | `packages/lgdl-render/src/matrix-b.test.ts` |
| MODIFY | `packages/lgdl-render/src/geometry-audit.test.ts` |

**验收标准**:
- [ ] 29 项 KNOWN 全清无残留（基数 2 + state G5 1 + gantt G5 1 + M3 7 + M1/M2 18 = 29；matrix-a 22 + matrix-b 7 核对，grep KNOWN_A/KNOWN_B 无定义）
- [ ] matrix-a 11 档 + matrix-b 各档 audit 断言 = 0 违例（clean）；头注释 EC-001/G6 已知缺口描述已更新
- [ ] er/uml 专项断言绿（edges 无穿 from/to 框内部段）
- [ ] 一致性断言绿（`AUDIT_TOL.edgeRideTolPx === RIDE_TOL_PX === 0.5`）
- [ ] 全仓 `npm test` 全绿；`test(` 计数 ≥ 505（= N₀ + 2 + 其它新增）；git diff 无既有 *.test.ts 删除行/断言弱化（NFR-003/FR-013）
- [ ] 收编 commit 存在且不含 golden 快照变更（EC-001 无「修了未收编/收了未修」中间态）

**验证命令**:
```bash
npm test
npm test -w @lgdl/lgdl-render
git diff --stat   # 审阅：KNOWN 删除为数据清理；无断言弱化
git add packages/lgdl-render/src/matrix-a.test.ts packages/lgdl-render/src/matrix-b.test.ts packages/lgdl-render/src/geometry-audit.test.ts && git commit
```

### TASK-014: M5-② 快照显式重建 + 逐张 diff 审阅 + 独立 commit
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-013 |
| **执行波次** | Wave 5 |
| **对应 FR** | FR-012（D-005-2）/ EC-002 / NFR-002 / ADR-003 |

**一句话摘要**: `LGDL_UPDATE_SNAPSHOTS=1` 一次性显式重建 11 svg + sha256 manifest，逐张 git diff 审阅（坐标/文本/走线类变化确认有意，结构性变化停下审查），独立 commit。

**描述**: 受影响文档（er/uml-class/state/gantt/architecture/microservices/login-flow/ecommerce-flow/mindmap/datastream 等，凡坐标/走线变化者；确切清单以本任务 diff 为准）经 `LGDL_UPDATE_SNAPSHOTS=1` 重建——golden 目录 `packages/lgdl-render/test-assets/golden/`（11 svg + `manifest.json` sha256，version=1 无时间戳）；重建后 snapshot.test 由写路径自证（写坏即红）。**git diff 逐张审阅**：坐标/文本位置/走线类变化确认有意（EC-002）；结构性变化（形状/class/元素增删）→ 停下审查，疑似新缺陷回退定位，确认属预期语义才记录合入。普通模式重跑 0 diff（无静默更新路径）。快照变更**独立 commit**（ADR-003，与收编 commit 分开，git 历史可追溯）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/lgdl-render/test-assets/golden/*.svg`（11 个，以 diff 为准） |
| MODIFY | `packages/lgdl-render/test-assets/golden/manifest.json` |

**验收标准**:
- [ ] 重建后 `npm test` 全绿（snapshot.test 0 diff + manifest sha256 自证一致）
- [ ] diff 审阅记录：坐标/文本/走线类变化确认有意；无未解释的结构性变化（形状/class/元素增删为 0 或已记录确认）
- [ ] 普通模式（无 LGDL_UPDATE_SNAPSHOTS）重跑不写盘（sha 不变）
- [ ] 快照变更独立 commit 存在（与 TASK-013 收编 commit 分离，可追溯）

**验证命令**:
```bash
LGDL_UPDATE_SNAPSHOTS=1 npm test -w @lgdl/lgdl-render
git diff packages/lgdl-render/test-assets/golden/   # 逐张审阅
npm test -w @lgdl/lgdl-render                        # 普通模式 0 diff 自证
git add packages/lgdl-render/test-assets/golden && git commit -m "test(render): golden 快照显式重建（引擎缺陷修复坐标/走线变化）"
```

### TASK-015: M6 验证交接
> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-013、TASK-014 |
| **执行波次** | Wave 6 |
| **对应 FR** | NFR-001~NFR-008 / EC-010 / FR-013 |

**一句话摘要**: validate 前全量终验——门禁归零、守恒 ≥505、29 项清空映射逐项核对无幽灵清空、B12 红证据与快照审阅记录齐备，完成 plan → build → validate 移交。

**描述**: 交接 validate 前终验（plan M6）：全量矩阵 + snapshot + degraded + B12 复跑；B12 修复前红证据归档（git stash M4 前 diff / commit 历史实证）；容差/估宽参数（clear、detick bump、回退变体）若 build 需微调须记录；逐 FR 核对清空映射 **29 项无遗漏、无幽灵清空**（NFR-008：spec→plan→tasks→build 可逐项核对「修了哪条、清了哪项」）；无新违例（无文档新增 KNOWN/未知 type/docRef）；degraded 场景 1~3 + B3/B4a/B4b/B7/B8/B9 语义锁绿（NFR-005/007）。本任务不产生 commit，输出验证记录供 validate 阶段消费。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| —（验证与交接记录） | — |

**验收标准**:
- [ ] `npm test` 全绿且 `test(` 计数 ≥ 505（守恒 NFR-003/FR-013）
- [ ] matrix-a/b + snapshot 全量 0 违例；KNOWN 无残留（grep 无 KNOWN_A/KNOWN_B 定义）
- [ ] 29 项清空映射逐项核对完成（基数2/state1/ganttG5-1/M1-5/M2-13/M3-7 = 29）无遗漏、无幽灵清空
- [ ] B12 修复前红证据、快照 diff 审阅记录齐备（EC-010/FR-012）
- [ ] 交接摘要已生成（可追溯：修复桶 ↔ 清空项 ↔ commit）

**验证命令**:
```bash
npm test
git log --oneline -8   # 提交序列可追溯：M1/M2/M3/M4/收编/快照
```

---

## 3. 任务汇总
> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 15 |
| S 级 (简单) | 4（TASK-001/002/010/015） |
| M 级 (中等) | 8（TASK-003/004/006/007/008/009/011/012） |
| L 级 (复杂) | 3（TASK-005/013/014） |
| 执行波次 | 6（Wave 1~6） |
| 关键路径长度 | 11 任务 |
| Commit 序列 | M1 → M2 → M3 → M4 → M5 收编 → M5 快照（6 个独立 commit） |

## 4. 执行策略
> 各波次的执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001 | 单任务：基线记录（M0），先于一切代码改动 |
| 2 | TASK-002 → TASK-003/004 → TASK-005 | **串行为主**（M1，router 先行）：002 先置（RIDE_TOL_PX + snapPt）；003 与 004 在 002 后**可部分并行**（异函数区间：pathHitsOwnBody/collapseGridPath vs routeRectilinear/routeEdge），但同文件 `lgdl-router/src/index.ts`——跨 session 并行须按函数区间隔离，同 session 顺序执行最稳妥；005（detick + 验证门）收口全部 M1 改动并创建 **M1 commit**（含 render RD.1，EC-001 无中间态）。中间态允许 matrix 断言红（KNOWN 期望随修复逐项消失），但 degraded/audit-helper/svg/kind-coverage 除快照 diff 外必须绿；snapshot 红属预期**不重建** |
| 3 | TASK-006 / 007 / 008 / 009 → TASK-010 | **并行窗口**（M2/M3）：006（RP.3）与 007/008/009（RD.2/RP.1/RP.2）各自函数区间独立（renderGantt dep / 基数外置 / placeLabelBox / gantt 窄条文本），**可部分并行**——但全部落在 `lgdl-render/src/index.ts`，多 session 并行须按函数区间隔离后统一合入；010 收口验证后按迁移步分别创建 **M2 commit**（RP.3）与 **M3 commit**（RD.2+RP.1+RP.2） |
| 4 | TASK-011 → TASK-012 | 串行（M4）：011 先落地 layered.ts LR 修复（不单独 commit）；012 写 B12 档与用例、用 `git stash layered.ts` 取证「修复前红」、恢复后跑 **er/uml A 档 audit 0 关键回归** + TB 零变化确认，创建 **M4 commit**（修复 + B12 同批，EC-010 不单独合入红档） |
| 5 | TASK-013 → TASK-014 | 串行（M5 收编批）：013 先做 KNOWN 清空 + 断言 0 违例 + 专项断言 + 一致性测试 → 全量绿 → **收编 commit**；014 再 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建 + 逐张 diff 审阅 → **快照独立 commit**（ADR-003，禁静默；中间态 matrix 红在此收口为 clean） |
| 6 | TASK-015 | 单任务：M6 全量终验 + 交接 validate（守恒 ≥505 / 门禁归零 / 29 项映射核对 / 证据归档） |

**Commit 纪律**（EC-001/ADR-003/R-011）：迁移步 M1~M4 各自独立 commit 小步可审；M5 拆「收编」与「快照」两个独立 commit；快照只经 `LGDL_UPDATE_SNAPSHOTS=1` 显式重建一次；git 历史不得出现「修了未收编/收了未修」中间态。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 按 plan §4.3 迁移步骤 M0~M6 分解 15 原子任务 / 6 波次；桶级 R1/RD/RP/LL/T6 全覆盖；标注依赖 + 并行窗口（M2/M3 内部部分并行）+ 关键路径（11 任务）；每任务含文件:行号、验收标准（引用测试名/命令/KNOWN 映射）与验证命令；commit 纪律映射迁移步 | 2026-09-02 | SDDU Tasks Agent |
