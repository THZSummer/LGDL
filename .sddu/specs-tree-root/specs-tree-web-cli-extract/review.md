# 审查报告：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md（需求规范，11 FR / 7 NFR / 10 EC / AC-001~010）、plan.md（技术方案，M0~M12 / 8 ADR）、tasks.md（任务清单，13 任务）、state.json（builded，notes 含 build 9 项偏差记录）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建（基于 spec 的 AC-001~010 + plan 的 8 项 ADR + build 的 9 项偏差，自主定义 C1~C24 审查清单）

## 1. 审查概要
> 审查结果的量化总览

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 26 个（新包 15 + core 3 + web 7 + cli 10 中的涉迁面 + CI 1） |
| 通过项 | 24（C1~C24 全项 PASS，其中 2 项附 WARN 级发现） |
| 改进建议 | 4 |
| 阻塞问题 | 0 |

## 2. 自主审查清单（C1~CN）
> 审查 Agent 根据 spec/plan/build 产物自主定义具体审查项。

**审查对象来源**：
- `spec.md`：FR-001~011 / NFR-001~007 / EC-001~010 / AC-001~010 → 逐项核验实现完整性
- `plan.md`：ADR-001~008 → 架构遵循性检查
- `state.json` notes：build 9 项偏差记录（①门禁、②deploy-pages、③LgdlOperation 契约、④SDK 依赖、⑤双面导出提前、⑥cli 切换提前、⑦ops.ts 删除、⑧具名导出、⑨test 脚本更新）→ 逐一复核
- `src/` + `tests/`：新包 7 模块 1 适配 + 6 测试；core index/types；web provider/help/web-fetch/lgdl-web/AiPanel；cli 9 命令

**四维度覆盖**：规范符合性（C1~C11 逐 FR）、零语义/零新功能（C12~C15）、架构一致性 ADR（C16~C22）、代码质量+测试质量（C23~C24）；build 偏差复核独立成节（B1~B9）。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 新包骨架（package.json/tsconfig/src/workspace/构建产物） | FR-001 / AC-001 / NFR-006 | 规范符合性 | 目录+package.json 字段核验、root workspaces 确认、dist 产物存在性 |
| C2 | COMMANDS 注册表迁入（commands.ts 全量） | FR-002 / AC-002（注册表面）/ AC-007 | 规范符合性 | git diff 对比 core/src/commands.ts（HEAD）→ 新包 commands.ts；确认 defaultKindFor 注入化外零改动 |
| C3 | 执行层迁入（operations.ts 分派器 + exec.ts 执行链） | FR-003 / AC-002（执行层面）/ EC-003 | 规范符合性 | git diff operations.ts；字符串字面量集合对比 ops.ts → exec.ts；失败即停行为核验 |
| C4 | tools schema + LLM 客户端迁入 | FR-004 / AC-002（tools+LLM 面）/ AC-007 / D-011 / D-012 | 规范符合性 | WEB_CLI_TOOL diff 逐字节；chat 双路径/classifyError/parseToolArguments 字符串对比；WEB_OP/FETCH 留 web 确认 |
| C5 | 协议解析器迁入（protocol.ts） | FR-005 / AC-002（协议面）/ AC-007 | 规范符合性 | web-cli.ts → protocol.ts + web-fetch.ts 字符串集合对比（零丢失零新增） |
| C6 | help 自文档框架迁入（help.ts） | FR-006 / AC-002（help 面）/ EC-010 / R-009 | 规范符合性 | webCliHelp 面字符串对比；COMMANDS 单一数据源 = 新包注册表确认 |
| C7 | web 接线随迁 + LGDL 适配注入（exec/web-fetch/lgdl-web/adapters） | FR-007 / AC-002（适配单点）/ EC-004 / ADR-006 / ADR-007 | 规范符合性 | 19 领域符号 DomainApi 收口确认；fetch/localStorage/WEB_OP/FETCH 留 web 确认；AiPanel 调用点零改动 diff |
| C8 | cli 引用切换（9 mutation 命令） | FR-008 / AC-003 / R-002 / EC-001 | 规范符合性 | 9 命令 import diff（应仅包名）；cli/package.json dependencies；领域符号留 core 零改动 |
| C9 | core 导出面收敛与依赖方向 | FR-009 / AC-004 / NFR-003 / EC-002 | 规范符合性 | core index.ts diff（迁出符号删除）；core/package.json 零依赖；依赖图核验 |
| C10 | 测试迁移与回归（计数守恒） | FR-010 / AC-005 / ADR-008 / R-012 | 规范符合性 | 测试文件静态计数（82+48+258=388）；随迁测试断言抽样 diff |
| C11 | CI 构建补齐（deploy-pages.yml） | FR-011 / AC-008 / R-007 | 规范符合性 | workflow 新包构建步骤+paths 核验；router 步骤存在性（结合偏差②判定） |
| C12 | 零新功能红线 | NFR-005 / NG-001 / C-001 | 规范符合性 | 命令数 9 / 工具数 3 / 子命令 enum / prompts.ts 工具名引用比对 |
| C13 | 零语义改动① help 文本逐字符一致 | NFR-002 / AC-007 / EC-010 | 规范符合性 | webCliHelp 面字符串 diff；help.test.ts 4 例断言与迁移前逐字节对比 |
| C14 | 零语义改动② tools schema 逐字节一致 | FR-004 / AC-007 / NFR-002 | 规范符合性 | WEB_CLI_TOOL diff（应仅头注释）；enum 项与迁移前一致 |
| C15 | 零语义改动③ 协议解析/错误消息逐字节 | NFR-002 / AC-007 | 规范符合性 | web-cli.ts 全部错误消息字符串迁移后存在性核验；parseWebCliCommand 分支结构对比 |
| C16 | ADR-001 命名 + ADR-002 依赖方向 | plan §2.2 / §2.4 / ADR-001~002 | 架构一致性 | 包名 @lgdl/ai-command-kit；core ← kit ← cli/web 线性无环；无 core re-export |
| C17 | ADR-003 适配层落位 + index 双面导出 | plan §3-4 / ADR-003 | 架构一致性 | adapters/lgdl.ts 单点组装 5 符号；index.ts 双面导出确认 |
| C18 | ADR-004 defaultKindFor 注入化 | plan §2.5.3 / ADR-004 / D-010 | 架构一致性 | buildOperation 第 4 参 kindResolver；内置默认 = 现状逻辑逐字节；lgdlKindResolver 显式导出 |
| C19 | ADR-005 createOperationApplier 注入化 | plan §2.5 / ADR-005 / EC-003 | 架构一致性 | createOperationApplier(mutations) 工厂；分派 switch 逐行复制；operations.test.ts 组装验证 |
| C20 | ADR-006 DomainApi 注入面 | plan §2.5.1 / ADR-006 / EC-004 | 架构一致性 | createExecutor(domain) 19 符号收口；管线分支零改写（字符串 diff 证明）；handleLine 扩展点 |
| C21 | ADR-007 web 接线拆分边界 | plan §2.5.5 / ADR-007 / D-011 / D-012 | 架构一致性 | fetch 留 web（web-fetch/lgdl-web）；localStorage 留 web；chat 薄包装保签名；lgdl-web 注释与消费面一致性 |
| C22 | ADR-008 回归门禁口径 | plan §4.2 / ADR-008 | 架构一致性 | 388 守恒口径落实；「web 107」按 web 侧测试面解释 |
| C23 | 无残留 + 代码质量 | EC-006 / AC-006 / 项目宪法 | 代码质量 | grep 旧路径 import/旧定义残留；新包核心零领域实现；模块职责单一/错误处理/可读性走查 |
| C24 | 测试守恒与断言有效性 | FR-010 / ADR-008 / AC-005 | 测试质量 | 用例静态计数；随迁测试断言抽样 diff（commands/operations/protocol/help/llm/exec）；边界与错误场景覆盖核验 |

**build 偏差复核清单（B1~B9，state.json notes 记录 9 项偏差逐一设审查项）**：

| # | 偏差记录（build 摘要） | 复核基准 | 复核方法 |
|---|----------------------|---------|---------|
| B1 | 门禁偏差：F-04/F-05 未关闭（W-D1 provider.ts:504 缺 WEB_FETCH_TOOL、W-D3 jumpToIssue 无 boolean 返回、R-D2 无修复 commit），经作者授权继续 | EC-005 / AC-010 / NG-005 | 现场核验 W-D1（OpenAI 端点 2 工具）；git log 查 F-04/F-05 修复 commit；授权链记录确认 |
| B2 | deploy-pages.yml 原无 router 构建步骤（F-01 未实施），「router 保留」不适用，仅补新包构建+paths | FR-011 / AC-008 / R-007 | workflow 文件 router/新包步骤存在性核验 |
| B3 | LgdlOperation 类型契约迁至 core/types.ts（D-013 保类型，core 中间态 272 → 终态 258） | D-013 / FR-009 | types.ts 类型定义与迁移前 operations.ts 逐字节 diff |
| B4 | 新包 dependencies 增 openai/anthropic SDK（llm.ts 迁移必然依赖） | NFR-003（core 零依赖不受影响） | 新包 package.json deps 核验；SDK 引用面（应仅新包 llm.ts） |
| B5 | index 双面导出/lgdlApplier/lgdlDomain/lgdlExecutor 提前组装（TASK-008 前移） | ADR-003 | index.ts 双面导出 + lgdl.ts 组装核验 |
| B6 | cli 9 命令切换提前执行（恢复 TASK-004 删 core applyOperation 后的断链） | EC-001 / FR-008 | 9 命令 import 目标核验；core 收敛面核验 |
| B7 | ops.ts 转过渡转发层后于 TASK-010 删除 | FR-007 / EC-006 | ops.ts 删除 + 无残留 grep |
| B8 | adapters/lgdl.ts 补 executeSubcommand 具名导出（供 '@lgdl/ai-command-kit/lgdl' 子路径消费） | ADR-003 / FR-007 | lgdl.ts 具名导出核验；AiPanel 子路径消费核验 |
| B9 | web test 脚本文件列表更新提前（删 ops/web-cli 测试，增 web-fetch/lgdl-web） | FR-010 / plan §4.2 | web package.json test 脚本文件列表核验 |

> **质量门槛（数量基线法）**：FR 11 项 → C1~C11 逐项覆盖 ✓；4 维度各 ≥ 1 条 ✓（规范符合 15、架构一致 7、代码质量 1、测试质量 1）；Cx 总数 24 ≥ max(11 FR, 4) ✓。

## 3. 审查详情
> 按审查维度分类的评估结果

### 3.1 代码质量
> 可读性、职责单一性、错误处理、编码规范

| # | 检查项 | 文件 | 评估 |
|---|--------|------|:--:|
| 1 | 模块职责单一：commands/operations/exec/protocol/help/tools/llm 七模块边界清晰 | packages/ai-command-kit/src/*.ts | ✅ |
| 2 | 适配收敛单点：领域语义只经 adapters/lgdl.ts 注入，核心零领域实现 | packages/ai-command-kit/src/adapters/lgdl.ts | ✅ |
| 3 | 错误处理完善：执行管线 try/catch 覆盖 op 构造/apply/convert/网络异常 | packages/ai-command-kit/src/exec.ts:238-275, llm.ts:140-201 | ✅ |
| 4 | 无硬编码魔法值（除既有基线，迁移零新增） | 全迁移面 | ✅ |
| 5 | 注释与实现一致性（发现 1 处注释漂移，见 §4） | packages/web/src/ai/lgdl-web.ts:6,39 | ⚠️ 注释称 AiPanel 经 './lgdl-web' 消费，实际经子路径消费 |

### 3.2 规范符合性
> 对照 spec.md，逐项核对 FR/NFR/EC 的代码实现

| 需求 ID | spec 描述 | 代码实现位置 | 符合？ |
|---------|----------|------------|:--:|
| FR-001 | 新包骨架 | packages/ai-command-kit/{package.json,tsconfig.json,src/} | ✅ |
| FR-002 | COMMANDS 注册表迁入 | ai-command-kit/src/commands.ts（diff 仅 import+kindResolver 注入） | ✅ |
| FR-003 | 执行层迁入（core operations + web exec 全链） | ai-command-kit/src/operations.ts + exec.ts | ✅ |
| FR-004 | tools schema + LLM 客户端迁入 | ai-command-kit/src/tools.ts + llm.ts | ✅ |
| FR-005 | 协议解析器迁入 | ai-command-kit/src/protocol.ts | ✅ |
| FR-006 | help 自文档框架迁入（COMMANDS 单一数据源闭环） | ai-command-kit/src/help.ts:14 | ✅ |
| FR-007 | web 接线随迁 + LGDL 适配注入 | ai-command-kit/src/exec.ts + adapters/lgdl.ts + web lgdl-web.ts/web-fetch.ts | ✅ |
| FR-008 | cli 引用切换（9 mutation 命令） | packages/cli/src/commands/*.ts:4（diff 仅包名） | ✅ |
| FR-009 | core 导出面收敛与依赖方向 | packages/core/src/index.ts:25-31（删迁出导出）；core/package.json deps:{} | ✅ |
| FR-010 | 测试迁移与回归（计数守恒） | 新包 82 + web 48 + core 258 = 388（静态计数） | ✅ |
| FR-011 | CI 构建补齐 | .github/workflows/deploy-pages.yml（含 ai-command-kit 构建+paths） | ✅ |
| NFR-001 | 零破坏回归门禁 | 388 守恒 + 断言逐字节（静态核验；动态执行留 validate） | ✅ |
| NFR-002 | 零语义改动（含类型层） | 六模块字符串 diff 零行为差异；LgdlOperation 逐字节保 core/types.ts | ✅ |
| NFR-003 | 包依赖方向约束 | core deps:{}；新包→core 单向；无环 | ✅ |
| NFR-004 | 领域解耦 | 新包核心 type-only import @lgdl/core；领域值引用收敛 adapters/lgdl.ts 单点 | ✅ |
| NFR-005 | 零新增功能 | 命令 9 / 工具 3 / 子命令 enum 迁移前后一致 | ✅ |
| NFR-006 | 构建与类型完整性 | dist 产物存在（build 已跑）；tsc 配置就位（动态全量留 validate） | ✅ |
| NFR-007 | 手动 AI 实战闭环门禁 | 冒烟通过（build 摘要⑩）；真实手测留 validate（EC-008） | ⚠️ 转 validate |

### 3.3 架构一致性
> 对照 plan.md 和 ADR，检查代码架构遵循情况

| 检查项 | 依据 | 评估 |
|--------|------|:--:|
| ADR-001 遵循 | @lgdl/ai-command-kit 命名与定位 | ✅ |
| ADR-002 遵循 | core ← ai-command-kit ← cli/web 线性无环 | ✅ |
| ADR-003 遵循 | adapters/lgdl.ts 单点 + index 双面导出（过渡） | ✅ |
| ADR-004 遵循 | buildOperation 第 4 参 kindResolver 注入化 | ✅ |
| ADR-005 遵循 | createOperationApplier(mutations) 注入工厂 | ✅ |
| ADR-006 遵循 | createExecutor(domain) 19 符号收口 | ✅ |
| ADR-007 遵循 | fetch/localStorage/WEB_OP/FETCH 留 web；chat 薄包装 | ✅ |
| ADR-008 遵循 | 388 守恒口径落实 | ✅ |
| 文件影响对齐 | plan.md §5 全量核验（NEW 14 + MODIFY 8 + DELETE 8 全对齐；计划外新增仅 core/types.ts 修改 = 偏差③） | ✅ |
| 目录结构 | 项目宪法（packages/* 并列、src 结构、kebab-case） | ✅ |

### 3.4 测试质量
> 评估测试代码的完整性和有效性

| 检查项 | 评估 |
|--------|:--:|
| 测试文件存在 | ✅ 新包 6 文件 + web 7 文件 + core 2 文件 |
| 核心逻辑覆盖 | ✅ 注册表 14 + 分派 9 + 执行链 22 + 协议 27 + help 4 + llm 6 |
| 边界条件覆盖 | ✅ 未知命令/缺参/无效源码/--doc 不匹配/fetch 缺 path/畸形 JSON |
| 错误场景覆盖 | ✅ 失败即停/校验失败/convert 失败/CORS 归类/HTTP 404 归类 |
| 断言有效性 | ✅ 随迁断言零改动（commands/operations/protocol/help 逐字节；llm 1 例仅夹具中性化） |

## 4. 改进建议
> 非阻塞但建议优化的问题

| # | 位置 | 问题 | 建议 |
|---|------|------|------|
| 1 | packages/web/package.json:8,19 | 迁移后 web/src 已无 openai/@anthropic-ai/sdk 直接引用（SDK 消费迁移至新包 llm.ts），两依赖在 web 侧为冗余 | 从 web dependencies 移除（npm 去重不阻塞，属清理项） |
| 2 | packages/web/src/ai/lgdl-web.ts:6,39 | 注释声称「AiPanel 经 './lgdl-web' 消费 executeSubcommand」，实际 AiPanel.tsx:5 从 '@lgdl/ai-command-kit/lgdl' 子路径消费 | 修正注释为「lgdlExecutor 单例供 executeCommands 逐行场景（fetch 注入）；AiPanel 经子路径消费」 |
| 3 | spec.md FR-004「18 子命令 enum」 | WEB_CLI_TOOL enum 实际 20 项（status/validate/init/convert + 9 mutation + doc-info/get-node/get-edge/find-node + list-node-kinds/list-diagram-types + help）；迁移前后一致（非迁移引入） | spec 修订计数为 20 项（文档口径修正） |
| 4 | build.md 产物缺失 | 前置条件列明 build.md，实际 build 摘要记录于 state.json notes（信息完整但文件未落盘） | 后续 feature 将 build 执行摘要落盘 build.md 或调整前置条件说明 |

## 5. 阻塞问题
> 必须修复后才能进入 validate 阶段

| # | 位置 | 问题 | 修复建议 |
|---|------|------|---------|
| — | — | 无 | — |

## 6. 结论
> 审查最终结论

**结论**: ✅ 通过
**理由**: 24 项审查全项通过（2 项附低严重度发现）；阻塞问题 0、改进建议 4（< 5）；规范符合率 100%（FR 11/11、NFR 6/6 静态可核验 + NFR-007 转 validate、EC 边界全部落实）；零语义改动核心维度经 git diff + 字符串集合对比实证（help/schema/错误消息/协议解析逐字节一致）；测试守恒 388 = 82 + 48 + 258 实证；build 9 项偏差复核无新引入问题。可进入 validate 阶段动手验证。

## 7. 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec AC-001~010 + plan 8 ADR + build 9 偏差，定义 C1~C24 审查清单 + B1~B9 偏差复核清单 | 2026-08-31 | SDDU Review Agent |
