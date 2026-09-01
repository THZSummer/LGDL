# 验证策略：group 命令合并（specs-tree-unify-group-cmd）

> **文档定位**: SDDU 验证策略 — 指导 validate Agent 执行自主验证的场景和方法；验证结果见 validate-report.md
> **前置依赖**: spec.md（需求规范，21 FR / 7 NFR / 10 EC / 3 DD）、review-report.md（审查报告，状态 passed，17 通过/1 警告/0 阻塞）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-02
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-02
> **更新说明**: 初始创建 — 基于 spec 21 FR + 7 AC + review 结论自主定义 V1~V14 验证场景（五维度全覆盖：测试覆盖/接口数据/构建/性能边界/漂移检测，本 Feature 无性能 NFR → §6 标注不适用）；因 build 已完成（9 任务 completed）且 review 通过，策略与报告同轮产出

## 1. 验证概要

| 维度 | 计划 |
|------|------|
| 验证项 | 14 项（V1~V14） |
| FR 覆盖 | 21/21（每 FR ≥ 1 Vx） |
| NFR 覆盖 | 7/7 |
| EC 覆盖 | 10/10（护栏实测覆盖关键项） |
| Feature 类型 | 代码类 → 全五维度验证 |

## 2. 自主验证场景（V1~V14）

**验证对象来源**：
- `spec.md`：21 FR（A~E 五组）/ 7 NFR / 10 EC / 3 DD（= ADR-001~003）→ 逐项验证
- `review-report.md`：C1~C18 结论（17 通过/1 警告/0 阻塞）+ 4 项改进建议 → 复核与跟踪
- `build.md`：9 任务 7 波次 → 验证门禁复核（tsc/test/grep/git diff）
- `src/` + `tests/`：源码与测试 → 动态实测

**Feature 类型自适应**：代码类 Feature（跨 4 包命令层收敛重构）→ 全维度。性能 NFR 无定义（NFR-001~007 均为架构/范围/可用性/等价/守恒/编译类）→ §6 性能边界标注「本 Feature 无性能 NFR，跳过性能压测；EC 边界行为以护栏实测覆盖」。

| # | 验证对象 | 验证步骤 | 预期结果 | 验证维度 | 验证方法 |
|---|---------|---------|---------|:--:|:--:|
| V1 | AC-01 三命令零残留（FR-005/006/019/020/021） | 全仓 grep `add-group\|remove-group\|update-group`（排除 NG-005 例外清单）；按命令定义面/终端面/AI 面/文档面逐面核查；cli `--help` 命令计数 | packages/docs/README 零残留；cli 16 命令、web-cli 6 增量命令；例外清单仅 docs/reviews-2026-08-24 命中 | 漂移检测 | grep + 目检 |
| V2 | AC-04 LgdlOperation 9→6 + 分派面（FR-008/009） | types.ts 联合类型审查；operations.ts describeOperation/OperationMutations/lgdlDispatch 计数；git diff 范围确认 | 6 变体（add-node 含 contains、update-node 含 containsAdd/containsRemove）；operations 6 case；index.ts 无三符号导出 | 测试覆盖 + 漂移 | git diff + 源码审查 |
| V3 | AC-04 mutations 收敛（FR-010/011/012/013） | grep addGroup/removeGroup/updateGroup/AddGroupOptions/UpdateGroupOptions；mutations.ts 五符号删除确认；index.ts 导出确认 | lgdl-core/web-cli 零残留；逻辑并入 node 三函数 | 漂移检测 | grep + 源码审查 |
| V4 | AC-06 零语义模型改动（NFR-001） | git diff --name-only 全文件清单；parser/serialize/layout/render 文件核查；lgdl-layout/lgdl-render 包 diff 核查；types.ts diff 区域审查 | 41 文件清单无 parser/serialize/layout/render；types.ts 仅 LgdlOperation 联合收缩（+3 字段、-3 变体） | 漂移检测 | git diff |
| V5 | AC-05 测试全绿（FR-016/017，NFR-006） | 逐包运行测试：lgdl-core / lgdl-web-cli / lgdl-web test；lgdl-cli tsc --noEmit；另 lgdl-core/lgdl-web-cli tsc | core 267 pass / web-cli 79 pass / web 35 pass / cli tsc 0；四包 tsc 全绿（lgdl-web 除外，见 V13） | 测试覆盖 + 构建 | npm test + tsc |
| V6 | AC-03 三入口 loud reject 实测（FR-006/007，NFR-003） | ① cli：`lgdl-cli add-group/remove-group/update-group` 实跑；② web-cli：parseWebCliCommand 三命令实调（编译产物）；③ AI：tools.ts enum 核查 | cli 报 unknown command（退出码 1）；web-cli 报「分组命令已并入 node 命令」含改用指引；tools enum 无三命令且 description 引导 node 形态 | 接口数据 | 命令实跑 + 脚本 |
| V7 | AC-02 add-node 行为等价（FR-001/002） | 编写行为等价脚本：addNode kind:'group'+contains 创建、四类校验（自含/未知成员/重复归属/嵌套冲突）、summary 文案 | 创建 kind:'group' 节点含成员；四类校验消息与旧 addGroup 一致；summary node 口径 | 测试覆盖 + 接口数据 | 自主脚本（ADR-003） |
| V8 | DD-001 行为等价（FR-013/014/015） | 脚本：updateNode containsAdd/containsRemove 追加/移除、summary contains±、非 group 节点 loud 报错、EC-008 空串/空白报错 | containsAdd 追加、containsRemove 移除、summary 记 contains±；非 group 报错含口径；空串报错 | 测试覆盖 + 接口数据 | 自主脚本（ADR-003） |
| V9 | DD-002 护栏双保险（FR-003/004） | 脚本：addNode contains 不配 kind（核心层）；cli 端到端 add-node --contains 不配 --kind；commands.test DD-002 断言 | 两处均 loud 报错含 "kind"/"group" 指引；无文档变更 | 接口数据 + 测试覆盖 | 自主脚本 + cli 实跑 |
| V10 | DD-003 kind 护栏（EC-004） | 脚本：updateNode group→entity 报错、同值 no-op、反向 entity→group 允许；cli 端到端 | group→非 group 报错含「分组节点不允许修改 kind」；同值 no-op 保留 contains；反向允许无孤儿 | 接口数据 + 测试覆盖 | 自主脚本 + cli 实跑 |
| V11 | DD-001 先 add 后 remove（EC-005 顺序） | 脚本：同批 containsAdd+containsRemove | 先 add 后 remove（对齐旧 updateGroup :509-511）；contains 终值正确 | 测试覆盖 | 自主脚本 |
| V12 | AC-05 测试守恒（FR-018，NFR-005） | 迁移矩阵比对：mutations.test 12 用例（addGroup 7→addNode、removeGroup 4→removeNode、updateGroup 1 拆三段）；commands.test 9→6；operations.test 2 迁移；护栏 9 项测试存在 | 15 项迁移无缺项；护栏 9 项独立断言（DD-002/EC-002/EC-003/EC-004/DD-003 反向/FR-014×2/EC-008/FR-002 原子性） | 测试覆盖 | grep + 矩阵比对 |
| V13 | lgdl-web tsc 基线复核（NFR-006） | lgdl-web tsc --noEmit 实跑统计错误数；错误全部定位 App.tsx OpHandler 契约；git log 溯源 handlers.ts（d03dca4）与 App.tsx（0489db9）；git diff 确认两者不在本 feature | 17 错误全为 `() => string` 不匹配 OpHandler；App.tsx/handlers.ts 均不在本 feature diff → V2 遗留基线；记录欠债 | 构建 + 漂移 | tsc + git log |
| V14 | review 4 项改进跟踪 | 逐一核查改进项现状：① help.ts:6 头注释 ② App.tsx 17 基线 ③ docs-tree-root 路径引用 ④ KNOWN_PARAMS 'to' 重复 | 现状确认并记录跟踪状态（本 feature 不改源代码，待后续处置） | 漂移检测 | 源码审查 + grep |

> **质量门槛校验**：FR 21 全覆盖（V1~V14 映射 21 FR 无遗漏）；五维度全覆盖（测试覆盖 V5/V7/V8/V12、接口数据 V6~V10、构建 V5/V13、性能边界 §6 标注不适用（无性能 NFR，EC 边界以护栏实测替代）、漂移检测 V1~V4/V14）。清单合格。

## 3. 测试覆盖验证（计划）

### 3.1 功能需求 (FR) — 计划覆盖率 100%

| 需求 ID | spec 描述 | 验证方式 | 覆盖率 |
|---------|----------|:--:|:--:|
| FR-001~004 | add-node contains 参数与校验 | V7/V9 脚本 + mutations.test 迁移用例 | 已覆盖 |
| FR-005~007 | 三命令移除 + loud reject | V1/V6 grep + 三入口实跑 | 已覆盖 |
| FR-008~010 | LgdlOperation 收缩 + 导出 | V2/V3 git diff + grep | 已覆盖 |
| FR-011~015 | mutations 收敛 + DD-001 语义 | V3/V8/V10/V11 脚本 | 已覆盖 |
| FR-016~018 | 测试迁移 + 守恒 | V5/V12 测试运行 + 矩阵 | 已覆盖 |
| FR-019~021 | AI 提示面 + 文档 + help | V1 grep + help 输出目检 | 已覆盖 |

### 3.2 非功能需求 (NFR) — 计划覆盖率 100%

| 需求 ID | spec 描述 | 验证方式 | 覆盖率 |
|---------|----------|:--:|:--:|
| NFR-001 | 零语义模型改动 | V4 git diff | 已覆盖 |
| NFR-002 | 零新功能（范围约束） | V2/V3 变更清单与 FR 映射审计 | 已覆盖 |
| NFR-003 | loud reject 可用性 | V6 三入口实测 | 已覆盖 |
| NFR-004 | 行为等价 | V7/V8 脚本断言 | 已覆盖 |
| NFR-005 | 测试守恒 | V12 矩阵比对 | 已覆盖 |
| NFR-006 | 编译完整性 | V5/V13 tsc 实跑 | 已覆盖 |
| NFR-007 | 错误消息口径一致 | V7~V10 消息断言对照 §6.2 口径表 | 已覆盖 |

## 4. 接口与数据实测（计划）

| 检查项 | spec 要求 | 实测方式 |
|--------|----------|---------|
| cli 三命令入口 | unknown command（commander 默认） | `lgdl-cli add-group/remove-group/update-group` 实跑 |
| web-cli 三子命令 | 报错含改用指引（add-node --kind group --contains / remove-node / update-node） | parseWebCliCommand 脚本实调 |
| AI tools enum | enum 无三命令 + description 引导 node 形态 | tools.ts 源码核查 |
| cli 端到端链路 | add-node --kind group --contains 创建 / update-node contains-add/remove / remove-node / 不配 kind 报错 | 临时 .lgdl 文件全链路实跑 |
| mutations 核心 | 行为等价 + 三护栏 | 自主脚本 24 断言 |

## 5. 构建与脚本验证（计划）

| 检查项 | 命令 | 预期退出码 |
|--------|------|:--:|
| lgdl-core tsc | `npx tsc --noEmit` | 0 |
| lgdl-web-cli tsc | `npx tsc --noEmit` | 0 |
| lgdl-cli tsc | `npx tsc --noEmit` + `npm run build` | 0 |
| lgdl-web tsc | `npx tsc --noEmit` | 17（App.tsx 基线，V13 定性） |

## 6. 性能与边界验证（计划）

> **本 Feature 无性能 NFR**（NFR-001~007 均为架构/范围/可用性/等价/守恒/编译类），跳过性能压测。边界条件 EC-001~010 以护栏实测覆盖（V8~V11 脚本断言）。

## 7. 漂移检测（计划）

| 漂移类型 | 检测方法 |
|---------|---------|
| 孤立代码 | V3 grep addGroup/removeGroup/updateGroup 零残留 |
| 需求缺失 | V1~V14 逐 FR 映射（21/21） |
| 规格漂移 | git diff 核查 spec.md/plan.md/build.md 未被修改（specs-tree 目录为新增未跟踪） |

## 8. 结论（预期）

**结论**: ✅ 通过（预期：V1~V14 全绿 + 0 阻塞 + 漂移 0；lgdl-web tsc 17 基线错误为 V2 遗留欠债记录，非本 feature 引入）

| 指标 | 预期 |
|------|------|
| FR 覆盖率 | 100%（21/21） |
| NFR 覆盖率 | 100%（7/7） |
| 构建 | ✅（lgdl-web 除外基线，已定性） |
| 漂移 | 0 项 |
| 阻塞 | 0 项 |

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建 — 基于 spec 21 FR + 7 AC + review 结论自主定义 V1~V14（五维度全覆盖、无性能 NFR 标注不适用） | 2026-09-02 | SDDU Validate Agent |
