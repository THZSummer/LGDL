# 审查策略：specs-tree-render-gate（补全 LGDL 门禁测试用例）

> **文档定位**: SDDU 审查策略（ADR-004 产物拆分）— 定义 C1~CN 自主审查清单（审查对象/基准/维度/方法），作为 review-report.md 执行审查的依据。执行结果与逐项结论见 **review-report.md**（本轮 R1）。
> **前置依赖**: spec.md（12 FR / 6 NFR / 8 EC / D-001~D-006）、plan.md（技术方案 + ADR-001~004）、build.md（13/13 任务完成 + 偏差记录）、tasks.md
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 依据 spec FR/NFR/EC + plan 4 ADR + build 偏差记录自主定义 C1~C18 审查清单（18 项，覆盖 12 FR 全量映射 + 四维度 + build 偏差复核）；用户指令允许策略与报告一并执行（build 已完成）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查清单项数 | C1~C18（18 项） |
| 审查文件数 | 10 个（4 test-support + 6 顶层 test）+ 12 快照资产 + 4 ADR（对照基准） |
| 四维度覆盖 | 代码质量（C2/C3）/ 规范符合性（C4/C6~C13/C15）/ 架构一致性（C1/C5/C14/C16/C17）/ 测试质量（C8/C10/C11/C18） |
| FR 映射覆盖 | FR-001~FR-012 各 ≥1 个 Cx（映射见 §2 表） |

> 执行结果（通过/改进/阻塞计数、逐项结论、问题清单）见 review-report.md。

## 2. 自主审查清单（C1~C18）

**审查对象来源**：spec.md（FR/NFR/EC → 实现完整性与正确性）+ plan.md（ADR/文件影响 → 架构遵循）+ build.md（偏差记录 → 重点复核）+ `packages/lgdl-render/src/` 实际产物（代码/测试质量）。

**审查方法学**：静态分析——读代码、git diff/status 核对、grep/比对脚本取证、产物对照规范逐行评估；不动手跑测试/调接口（validate 职责）。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | **旁路零运行时改动**（render/router/layout/core 四包 src 零 diff + dist 产物 hash 不变 + 配置面仅 tsconfig 一行 exclude） | NFR-001 / NG-001 / plan §5·§10 | 架构一致性 | `git status`/`git diff --stat` 核对 src 业务文件零改动；`sha256sum dist/index.js` == 基线 `2ec5c0a5…`；确认 ci.yml / package.json 零 diff |
| C2 | **render-harness 基座**（parse→layout→render→audit 统一链路 + valid 断言 + 模块级缓存） | FR-001 / plan §6.2 / tasks TASK-005 | 代码质量 | 代码走查：链路完整、invalid 抛错含 issues、缓存键语义、无手造 fixture |
| C3 | **geometry-audit helper 代码质量**（SVG 轻量解析器鲁棒性 / 函数单一职责 / 错误处理 / 违例定位串与 docRef） | FR-005 / NFR-003 / ADR-004 | 代码质量 | 代码走查：解析器对引擎单行机器标记适用性、Violation.element 定位风格、docRef 取自 data-lgdl-loc |
| C4 | **G1~G5 判定语义与容差常量**（逐行对照 D-003 表：G1 双源硬判定 / G2 仅四连边 min(\|dx\|,\|dy\|)>0.51 + fail-safe / G3 开区间+豁免+零长不判 / G4 宿主豁免+2px 扩边 / G5 viewBox±1px+defs 豁免+泳道列+EC-003 降级） | D-003 表 / EC-008 / plan §6.1 | 规范符合性 | 代码逐段对照 D-003 表；AUDIT_TOL 六常量（0.51/1/2/22/30/20）与自测锁定断言核对；确认无放宽 |
| C5 | **ADR-004 审计独立实现**（不复用 router/render 运行函数，独立视角） | ADR-004 / plan §2.2 | 架构一致性 | grep import 面：geometry-audit.ts 仅类型 import core/layout，无 router/render 运行时引用 |
| C6 | **A 档 11 事实源矩阵**（matrix-a：自举 + 11 例全链路；输入 = examples-sources 镜像；断言审计结果） | FR-002 / E1 / ADR-002 | 规范符合性 | 代码走查 + 镜像与 lgdl-web examples.ts 11 条 source 逐字节比对脚本（ADR-002/R-008） |
| C7 | **B 档矩阵**（registry 13 条：B1~B10a/b + B11；matrix-b 逐文档审计 0 + 语义断言；折叠/语义锁/计数断言） | FR-003 / D-001 E2~E6 / EC-004 / plan §7 | 规范符合性 | registry 逐条对照 plan §7 表（type/qRefs/语义锁/optional）；matrix-b 断言走查 |
| C8 | **kind 覆盖核对表 9 格动态断言**（元素级真实绘制断言：药丸/圆角/菱形/圆柱/折角/回退/组嵌套/泳道/无 kind） | D-001 核对表 / FR-004 / plan §6.2 | 测试质量 | 逐格对照核对表 9 kind → 测试映射；断言元素级定位（非 includes 字符串粗断言） |
| C9 | **Q-xxx 覆盖映射与文档可追溯**（registry qRefs/intent + 测试文件头注释） | FR-004 / NFR-006 / spec.md:160 | 规范符合性 | 抽查 registry 注释头与 matrix-a/b/snapshot 文件头；qRefs 对照 spec 映射表 |
| C10 | **审计自测正反例 ≥10**（geometry-audit.test：五类各 ≥1 必报 + ≥1 不报） | FR-006 | 测试质量 | 计数（期望 ≥10）；逐类核对正例「必报」反例「不报」语义与 D-003 判定口径一致 |
| C11 | **退化/兜底专项**（degraded-paths 3 场景：routeDefault 零长 / A* 无解→orthogonalize / routeRectilinear fallback；fixture 例外授权 + 开放问题 #5 实证注释） | FR-007 / EC-005 / D-005 / 开放问题 #5 | 测试质量 | 代码走查：3 场景齐全、断言输出有限/正交/不抛、文件头记录 #5 结论 |
| C12 | **golden 快照**（对象集 = 镜像 11 源；字节 + sha256 双校验；manifest 完整性 version/ids/files；无时间戳；可再生成链路自洽） | FR-008 / FR-010 / D-002 / ADR-003 | 规范符合性 | manifest.json 读取核对（11 ids / sha256 hex / 无时间戳字段）；快照测试代码走查 |
| C13 | **快照更新门禁静默**（普通模式无写分支；LGDL_UPDATE_SNAPSHOTS=1 显式才写 + 写后自断言；重建走独立 commit） | FR-009 / EC-002 / ADR-003 | 规范符合性 | 代码走查写分支唯一性（before + env 门）；确认无任何隐式写盘路径 |
| C14 | **门禁收集面 / CI / 时长**（新测试落入 render 顶层 glob 自动收集；package.json 与 ci.yml 零改动；tsconfig 一行 exclude 为唯一配置面改动；NFR-004 ≤60s 预算） | FR-011 / EC-007 / NFR-004 / ADR-001 | 架构一致性 | git diff 核对配置面；测试文件命名/位置核对顶层 glob 收集语义 |
| C15 | **测试守恒**（全仓 `test(` 计数 ≥437 只增不删；既有断言零弱化） | FR-012 / R-007 | 规范符合性 | `grep -ro "test(" packages --include="*.test.ts" \| wc -l`；git diff 确认既有 *.test.ts 零改动 |
| C16 | **build 偏差复核**（① EC-001 已知缺口 4 项 =「精确已知集」断言而非放宽审计；② B2-LR 引擎缺陷如实记录不修引擎（NG-004）；③ G4 实现口径（障碍/豁免集合、gantt-lane 不计 G4）；④ 快照独立 commit 未执行；附 B3 U-1 / B9 #7 / B7 U-2 / 开放 #5 / registry 13 条 / 快照路径） | EC-001 / NG-004 / EC-003 / EC-004 / build.md §3 | 架构一致性 | 逐项代码证据对照：KNOWN_A 断言语义（长度相等 + type/docRef + element 命中，引擎修复即红）；registry intent B2-LR 注释；G4 豁免规则代码；git 提交状态 |
| C17 | **ADR-001/002 落位**（test-support 非 *.test.ts 不进 build dist；exclude 生效 dist 无 test-support；镜像 DO NOT EDIT 头注 + 无 lgdl-web import） | ADR-001 / ADR-002 | 架构一致性 | dist 目录核对（无 test-support）；镜像头注与 import 面 grep |
| C18 | **断言有效性抽查**（弱断言/恒真断言/无效测试识别） | 测试质量方法论 / NFR-003 | 测试质量 | 逐测试文件抽查断言强度（重点 kind-coverage / matrix-b 元素断言 / 自测定位串断言） |

**质量门槛满足性**：FR 映射 = FR-001→C2、FR-002→C6、FR-003→C7、FR-004→C8/C9、FR-005→C3/C4、FR-006→C10、FR-007→C11、FR-008→C12、FR-009→C13、FR-010→C12、FR-011→C14、FR-012→C15（每个 FR ≥1 Cx ✓）；四维度各 ≥4 Cx ✓；Cx 总数 18 ≥ max(12, 4) ✓。

## 3. 审查详情（执行指引）

### 3.1 代码质量（C2/C3）
- C2：render-harness 单一职责（只做 parse→layout→render + 缓存）、错误信息可定位、缓存键 = id ?? source。
- C3：geometry-audit 解析器（parseSvgElements：标签/属性正则 + `<g>` 嵌套栈 + text 捕获）对引擎单行机器标记确定适用；各判定函数单责；定位串含 class/坐标/d 段（NFR-003）。

### 3.2 规范符合性（C4/C6~C13/C15）
- C4：D-003 表五行逐行对照（判据、选择器、容差、豁免）。
- C6/C7：A/B 档矩阵与 D-001 等价类原则、plan §7 表逐条核对。
- C10：FR-006 正反例 ≥10 的语义有效性。
- C12/C13：FR-008/009/010 快照三需求（建档/回归/再生成）。
- C15：守恒 ≥437。

### 3.3 架构一致性（C1/C5/C14/C16/C17）
- C1/C17：旁路约束 + test-support 落位 + ADR-001~004 遵循。
- C16：build 偏差 4+6 项逐项代码取证复核。

### 3.4 测试质量（C8/C10/C11/C18）
- C8：9 格 kind 动态断言元素级（对照 render SHAPES 分派）。
- C18：逐断言抽查弱断言（恒真、无效、空断言）。

## 4. 待作者/validate 事项（非审查执行项）
- EC-001 已知缺口 4 项（er/uml-class 基数入框、state/gantt 文本贴边越界）→ 引擎修复即红提示收编，裁决见作者。
- B2-LR layered.ts LR 画布/rank 宽度估算缺陷 → 建议另立 Feature 修复（NG-004，本 Feature 不修）。
- datastream `_other` 无底框（开放问题 #7）→ 待作者裁决是否另立引擎修复。
- validate 阶段：NFR-003 注入实测、NFR-004 时长实测、NFR-005 跨环境快照一致性、EC-008 容差校准。

## 5. 阻塞问题
> 执行后填写（见 review-report.md）

## 6. 结论
> 执行后填写（见 review-report.md，ADR-004 产物拆分：本文件只定义策略）

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — C1~C18 审查清单定义（覆盖 12 FR 全映射 + 四维度 + build 偏差复核 4+6 项），等待执行审查产出 review-report.md R1 | 2026-09-02 | SDDU Review Agent |
