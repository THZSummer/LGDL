# 审查策略：specs-tree-examples-consolidation（示例图整合）

> **文档定位**: SDDU 审查策略（ADR-004 双文件之一）— 定义 C1~CN 自主审查清单（审查对象 / 基准 / 维度 / 方法），作为 review-report.md 的执行依据
> **前置依赖**: spec.md v1.0（14 FR / 5 NFR / 7 EC / D-001~D-004）、plan.md v1.0（9 图 DSL 终态 / 24 项文件变更 / ADR-001）、build.md v1.0（TASK-001~010 全绿 + 偏差 5 项记录）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-04
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-04
> **更新说明**: 初始创建 — 从 spec+plan+build 产物自主提取审查对象，定义 C1~C17 审查清单（含 build 2 项 EC-001 作者裁决偏差重点复核）

## 1. 审查范围与对象

### 1.1 审查对象来源

| 来源 | 内容 | 用途 |
|------|------|------|
| spec.md | 14 FR（五组：内容定案/删除清理/生成链路/镜像 golden/测试联动）+ 5 NFR + 7 EC + D-001~D-004 | 逐项核验实现完整性 |
| plan.md | §2.3 三图 DSL 终态、§4.2 快照 diff 审阅 5 判据、§5 文件影响表（24 项）、ADR-001 | 架构遵循性检查 |
| build.md | §2 文件变更表、§4 任务验证、§5 偏差记录 5 项 | 覆盖完整性 + 偏差复核 |
| 实际产物 | `packages/lgdl-web/src/examples.ts`、`packages/lgdl-render/src/test-support/examples-sources.ts`、`examples/*.{lgdl,svg,png}`、`packages/lgdl-render/test-assets/golden/*`、`kind-coverage.test.ts`、`snapshot.test.ts`、`matrix-a/b.test.ts`、`scripts/gen-examples.mjs`、`scripts/render-one.mjs`、`packages/lgdl-layout/src/index.ts` | 代码质量与事实比对 |

### 1.2 四维度覆盖要求（质量门槛）

- 每个 FR ≥ 1 个 Cx（FR-001~FR-014 → C1~C14 全覆盖）
- 四个审查维度每维度 ≥ 1 条：规范符合性（C1~C11、C14）、架构一致性（C12~C14）、代码质量（C15）、测试质量（C16~C17）
- 无法静态核验项显式标注「不适用/待 validate」并说明原因

### 1.3 build 偏差重点复核对象（用户指定 + 本 Agent 自主强化）

| # | 偏差 | 复核重点 |
|---|------|---------|
| 偏差① | D-002「platform contains 4 域」→「只 contains shopping」（EC-001 作者裁决） | 是否合理？4 域全包触发真实聚合边违例（G2/G4/G5），是引擎 bug 还是示例设计不当？FR-002 验收锚点（rect 5 + platform 外含 shopping + matrix-a 0 违例）是否仍满足？ |
| 偏差② | NFR-001 例外：lgdl-layout/src/index.ts layoutGrouped 嵌套组框顶 keep-on-canvas 微修复（EC-001 作者裁决） | **scope.out 越界定性**：是否真实修复 vs 绕过门禁？影响面是否如声称「仅嵌套越界图生效、其余 8 图 + B 档零影响」？是否应剥离为独立 Feature？build 声称的「作者裁决」在产物中的记录是否充分？ |

## 2. 自主审查清单（C1~CN）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | examples.ts 缩编 11→9（删 microservices/login-flow、保留 9 例相对序、EXAMPLES[0]=architecture、头注释保留、单行转义格式） | FR-001 / spec D-001 / plan §5.1 | 规范符合性 | git diff 审阅 + 脚本抽取 id 序 + 与磁盘 .lgdl 逐字双向比对 |
| C2 | ecommerce-flow 2 层嵌套 group（platform 声明、group rect 5、platform⊃shopping 外含内、14 节点 17 边零改动、**偏差①：contains 由 4 域缩为 [shopping]**） | FR-002 / spec D-002 / build §5 偏差-1 | 规范符合性 + 架构一致性 | git diff + golden ecommerce-flow.svg 静态核验（5 个 lgdl-group、platform/shopping rect 外含内、聚合边正交路由）+ kind-coverage 断言迁移比对 |
| C3 | er 增强（5 实体 typed members 16 行、amount-note 混 kind、6 边=5 带基数 + 1 约束边、基数五值 1/0..1/0..*/1..*/n:m、edges[0]=user→order 守序、promotion 实体语义） | FR-003 / spec D-003 / plan §2.3.3 | 规范符合性 | git diff source 逐行比对 D-003 表 + er.svg 静态核验（5 实体卡片、typed 文本、note 折角、基数锚点文本、edges[0] path 存在） |
| C4 | gantt 增强（launch duration=0、doc/retro 新增、6 依赖边覆盖三型：gap≈0×4 / 目标在左 test→doc / gap≥20 test→retro） | FR-004 / spec D-004 / ADR-001 / plan §2.3.4 | 规范符合性 | source 数值逐边验算（target.start=source.end / < / ≥+20）+ gantt.svg 静态核验（`18d +0d` 文本、7 任务行、6 依赖边路径几何） |
| C5 | 保留 6 图 source 零 diff（architecture/datastream/mindmap/sequence/state/uml-class；state 单入口 B10 对照组、uml-class edges 序锁定） | FR-005 / FR-013② / plan §5.8 | 规范符合性 | git diff 确认 6 例 source 无任何字符变化 + matrix-b.test.ts 零改动确认 |
| C6 | 磁盘删 12 组三件套 36 文件（10 孤儿 + microservices/login-flow），无孤儿残留 | FR-006 / discovery §2.1 / plan §5.6 | 规范符合性 | `ls examples/` 计数（9/9/9）+ 残留孤儿 grep（应空） |
| C7 | gen-examples.mjs / render-one.mjs 包路径修复（4+3 处 → lgdl-*），其余逻辑零改动 | FR-007 / plan §5.3/§5.4 / EC-006 | 规范符合性 | git diff 审阅 + 全仓旧路径残留 grep（排除历史注释） |
| C8 | 磁盘产物重生成 9 组三件套：.lgdl 与 examples.ts source 逐字一致 9/9、.svg 当前引擎渲染、.png 存在或跳过记录 | FR-008 / NFR-002 / plan §5.6 | 规范符合性 | 脚本双向比对（examples.ts↔磁盘 .lgdl）+ 磁盘↔golden svg 字节比对 |
| C9 | examples-sources.ts 镜像同步 11→9（删 2、3 条逐字同步、头注释 9 source、保留 6 条零 diff、禁止 import web） | FR-009 / ADR-002 / plan §5.2 | 规范符合性 + 代码质量 | git diff + 逐字比对脚本 + import web 检查 |
| C10 | snapshot.test.ts 硬断言 11→9（:73 ids.length、注释文案），更新门 LGDL_UPDATE_SNAPSHOTS=1 无普通写盘分支 | FR-010 / FR-011 / NFR-003 / plan §5.5 | 规范符合性 | git diff 审阅 + "11" 残留 grep + 更新门代码走查 |
| C11 | golden 快照 11→9 显式重建 + diff 审阅 5 判据（①变更集上界 ②仅 3 svg 变更 + 删 2 + 6 svg 0 diff ③manifest 语义 ④三 svg diff 内容核验 ⑤重建后回归） | FR-011 / NFR-003 / NFR-005 / plan §4.2 | 规范符合性 | git diff golden 目录 + sha256 双校验（manifest↔文件）+ 三 svg 特征核验 + 6 svg 0 diff 确认 |
| C12 | **偏差②复核**：lgdl-layout/src/index.ts layoutGrouped 嵌套组框顶 keep-on-canvas 修复（+36 行） | NG-003 / NG-004 / NFR-001 / EC-001 / FR-014⑤ | 架构一致性（重点） | 代码走查（修复逻辑真实性、条件触发、与 renderer computeGroupBox 同构性、对普通组零影响论证）+ 影响面分析（B 档嵌套组 fixture 检索）+ golden 0 diff 佐证 + 独立 Feature 剥离必要性判断 + author 裁决记录完备性检查 |
| C13 | 偏差①复核：platform contains [shopping] 收窄是否合理（根因 = routeRectilinear 障碍豁免缺祖先组 → 引擎缺陷 vs 示例设计）；FR-002 验收锚点是否保持；D-003/D-004 覆盖语义未降级 | EC-001 / FR-002 / build §5 偏差-1 | 架构一致性（重点） | 引擎 routeRectilinear 障碍集代码走查（render index.ts:798-805 区域）+ golden 证据 + 与 spec EC-001 最小调整路径比对 |
| C14 | 文件影响对齐：变更集 ⊆ plan §5 清单 + 无 scope.out 越界（README/docs/op-cli 文档串/App.tsx/matrix 测试零改动）；9 id × 9 type 映射不变 | FR-014⑤ / NG-001~007 / plan §5.8 | 规范符合性 + 架构一致性 | git status/diff 全仓扫 + 文件集合比对 |
| C15 | examples.ts 单行转义字符串格式保持（gen-examples.mjs:25 正则硬解析）、source 编辑质量、镜像与 web 源逐字同步的工程实现 | FR-001 / EC-006 / NFR-002 / plan §4.1 | 代码质量 | 代码走查 + 正则抽取 9/9 parse 兼容 + 双向比对 |
| C16 | kind-coverage.test.ts 断言迁移语义等价（start→browse、decision→validate、group 计数 3→5、platform/shopping 外含内、er typed 行文本、gantt milestone r=9 菱形断言未动、datastream/mindmap 用例未动）、NFR-004 断言守恒（无删弱化） | FR-012 / NFR-004 / plan §5.7 | 测试质量 | git diff 逐处比对 FR-012 清单 + 断言强度等价评估 |
| C17 | 测试质量综合：测试文件存在性、核心路径覆盖（matrix-a 遍历 9 条 + 专项 edges[0]/edges[1]）、边界覆盖（golden 显式重建门 / manifest 无时间戳）、引擎改动直接测试覆盖（lgdl-layout 包测试文件存在性） | NFR-003 / NFR-005 / FR-013 / 测试质量门槛 | 测试质量 | 测试文件清单核验 + lgdl-layout 测试资产检查 + 断言有效性走查 |

## 3. 审查判定标准

| 条件 | 要求 |
|------|------|
| 阻塞问题 | 0 个（FAIL） |
| 改进项 | < 5 个（不含低优先记录项） |
| 规范符合率 | 100%（例外须有 author 裁决记录支撑并在此标注） |

**偏差② 的判定分档**（本 Feature 特有）：
- ✅ 通过：修复真实（非绕过门禁：未放宽审计口径、未删断言、未静默更新基线）+ 影响面与声称一致 + author 裁决记录充分（build.md/state 双记录）→ 记改进项（建议 spec 例外书面化）
- ❌ FAIL：修复系绕过门禁（删违例/改审计/静默重建），或影响面超出声称且未记录，或 build 无 author 裁决记录擅自改引擎

## 4. 结论类型

- ✅ **通过** — 可进入 validate 动手验证
- ⚠️ **有条件通过** — 有改进项不阻塞；偏差② 若判定「真实修复 + 裁决记录充分」则归此类，但须作者在 validate 前追认 NFR-001 例外
- ❌ **不通过** — 存在阻塞问题（含偏差② 判 FAIL 情形），需打回重新实现/修订 spec

## 5. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — C1~C17 审查清单（14 FR 全覆盖 + 四维度 ≥1 + build 偏差①/② 专项复核 + EC-001 作者裁决判定分档） | 2026-09-04 | SDDU Review Agent |
