# 问题挖掘报告：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 问题挖掘报告 — 纯重构抽取任务的现状基线摸底，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点；需求源 ROADMAP v1.2.0 §二 v0.6 F-13 ①，作者指令 2026-08-31 已闭环，本阶段不做访谈）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建（全自主执行，作者指令明确，零访谈）

---

## 1. 问题定义
> 概括核心问题及其业务影响，回答"为什么需要关注"

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| LGDL monorepo 中「AI 可调用命令执行框架」底座（core COMMANDS 命令注册表 + 执行层 executeSubcommand→buildOperation→applyOperation→validate→serialize + function-calling tools schema）与 LGDL 领域语义深度交织，web 侧接线（ops.ts / provider.ts）锁死在 web 包内，无法作为独立可复用/可开源包剥离 | web-cli 开源线（F-13 ②，v1.1）被阻塞——独立项目、独立发布/维护无从谈起；LGDL 每轮语义演进（命令集、图类型）都需同步波及接线层；AI 工具链能力无法脱离 LGDL 复用于其他领域 | 该底座永远锁死在 LGDL 仓库内；接线层与领域层互相拖累，v1.1 开源线无限期搁置；越晚抽取，耦合面随功能增长越厚，重构成本单调上升 |
| 抽取动作自身带风险：COMMANDS/执行层/tools 被 core、cli、web 三方引用（文件:行号证据见 §3），任意一方引用断裂即构成构建/运行破坏 | 违反「零破坏」原则（web 107 / core 281 全量回归门禁）会让 v0.6 收口期引入新回归，动摇「语义优先、可预测」立身之本 | 回归需要返工重测；与 F-04/F-05 共享接线面，若排布不当会叠加风险 |

**任务本质（作者指令原话，ROADMAP §二 v0.6 F-13 ①）**：
> 「monorepo 新增独立包（第 7 个包，与 core/layout/router/render/cli/web 并列），抽取与 LGDL 领域解耦的『AI 可调用命令执行框架』底座 = core 命令注册表（COMMANDS）+ 执行层（executeSubcommand → buildOperation → applyOperation → validate → serialize）+ function-calling 工具定义（tools schema），LGDL 作为首个适配场景；web 侧接线（ops.ts / provider.ts）迁出至新包。**零破坏**：仅位置迁移、不改语义模型；web 107 / core 281 测试全量回归。」（ROADMAP.md:129-131）

## 2. 用户画像
> 描述受影响用户角色及其场景，回答"谁遇到了什么问题"

| 用户角色 | 典型场景 | 关键痛点（用户原话） | 当前应对方式 |
|---------|---------|-------------------|------------|
| LGDL 作者/维护者 | v0.6 收口期决定将 web-cli 底座独立成包 | 「web-cli 独立包抽取提高优先级，放到当前开发的版本」（ROADMAP.md:129，作者指令 2026-08-31 由 v0.8 提前至 v0.6） | 原排布 v0.8；作者指令提前后纳入 v0.6 收口期第 2 周窗口（ROADMAP.md:138-145） |
| 下游 AI 工具链使用者（潜在 web-cli 适配者） | 希望在非 LGDL 领域复用「AI 可调用命令执行框架」 | 框架与 LGDL 领域语义（LgdlDocument/NodeKind/图类型）强绑定，无法脱离 LGDL 独立接入 | 无（能力未开放，等待 F-13 ① 抽取后成为首个适配场景） |
| AI 实战链路（web workbench AiPanel 调用方） | 每次接线层改动都要全量回归（web 107 / core 281 + 手动 AI 闭环） | 「回归门禁：测试全绿 + AI 面板手测通过」（ROADMAP.md:144） | 维持现状，抽取期间不得破坏；F-04/F-05 先行关闭避免叠加（ROADMAP.md:134） |

## 3. 现状基线（代码证据）
> 摸底结果：包结构、依赖方向、抽取点位置，全部以 文件:行号 佐证（只读探查，未改任何代码）

### 3.1 包结构与依赖方向

| 包 | 依赖（package.json） | 说明 |
|----|--------------------|------|
| @lgdl/core | 零依赖（core/package.json 无 dependencies） | parser/model/validation + COMMANDS 注册表 + 执行层（现状承载抽取目标） |
| @lgdl/layout | → @lgdl/core | 布局引擎 |
| @lgdl/router | 零依赖 | 纯几何布线 |
| @lgdl/render | → @lgdl/core, @lgdl/layout, @lgdl/router | SVG/PNG 渲染 |
| @lgdl/cli | → @lgdl/core, @lgdl/render, commander | 终端 CLI（bin: lgdl-cli） |
| @lgdl/web | → @lgdl/core, @lgdl/layout, @lgdl/render + openai/anthropic/react 等 | Web 工作台（含 AI 接线） |

依赖方向：`core ← layout ← render`；`core ← cli`；`core ← web`（web 亦依赖 layout/render）。**新包将成为第 7 个包**，与六者并列（ROADMAP.md:129）。

### 3.2 抽取点 ①：core COMMANDS 命令注册表 + 参数构造
- `packages/core/src/commands.ts:26-90` — `COMMANDS` 注册表（9 个增量命令：add/remove/update × node/edge/group，CommandSpec: required/changeKeys/optional）
- `commands.ts:93-98` — `KNOWN_PARAMS`（已知参数名集合）
- `commands.ts:100-116` — `requireParams` / `assertChangeRequested`（必填校验 / no-change 校验）
- `commands.ts:124-220` — `buildOperation`（参数→LgdlOperation 唯一实现，业务逻辑单一来源）
- `commands.ts:233-289` — `parseAttrsSpec` / `parseMemberSpec`（attrs/member 解析器）
- **⚠️ LGDL 语义内嵌点**：`commands.ts:223-227` — `defaultKindFor`（docType 'er'/'uml-class'→'entity'、'state'→'state'、默认'process'，纯 LGDL 图类型语义，被 buildOperation 内部调用，见 commands.ts:141）
- **引用依赖**：`commands.ts:11-12` → `./operations.js`（LgdlOperation 类型）+ `./types.js`（LgdlMember/LgdlAttrs）

### 3.3 抽取点 ②：执行层（executeSubcommand → buildOperation → applyOperation → validate → serialize）
- **web 侧执行骨架**：`packages/web/src/ai/ops.ts:80-253` — `executeSubcommand`（完整管线：:99 `parseLgdl` → :217 `buildOperation` → :229 `applyOperation` → :239 `validate` → :249 `serializeLgdl`）；`:260-331` — `executeCommands`（逐行执行循环，失败即停）；`:34-44` — `CommandExecResult` 接口
- **core 侧操作协议**：`packages/core/src/operations.ts:31-84` — `LgdlOperation` 类型（op 判别联合）；`:87-108` — `describeOperation`；`:111-175` — `applyOperation`（单操作分派）；`:199-220` — `applyOperations`（批量，首个失败即停）
- **⚠️ 强耦合**：`operations.ts:16-27` import `./mutations.js` 全部 9 个 mutation 函数 + `./types.js`（LgdlDocument/NodeKind/LgdlMember/LgdlAttrs）——`applyOperation` 是分派器但强绑定 LGDL 领域函数与类型
- **⚠️ web 执行层直接调用 13 个 core 领域 API**：`ops.ts:10-30` import 清单（parseLgdl/validate/serializeLgdl/applyOperation/applyOperations/formatStatus/templateForType/supportedTemplateTypes/convert/listFormats/buildOperation/listNodeKinds/queryDocInfo/queryNode/queryEdge/findNodes/DIAGRAM_TYPES/DIAGRAM_TYPE_LABELS/LgdlOperation）

### 3.4 抽取点 ③：function-calling tools schema
- `packages/web/src/ai/provider.ts:232-281` — `WEB_OP_TOOL`（lgdl-web-op-cli，UI 操作工具定义）
- `provider.ts:282-324` — `WEB_CLI_TOOL`（lgdl-web-cli，图内容操作工具定义，子命令 enum 覆盖 18 个）
- `provider.ts:330-358` — `WEB_FETCH_TOOL`（lgdl-web-fetch，独立基础工具）
- 注册点：`provider.ts:405-420`（Claude 注册 3 个工具）；**`provider.ts:504`（OpenAI 兼容端点只注册 `[WEB_CLI_TOOL, WEB_OP_TOOL]` 两个，缺 WEB_FETCH_TOOL —— 即 W-D1 缺陷现场，F-04 修复点）**
- 同文件还含 LLM 客户端：`provider.ts:392-527`（`chat`，openai SDK / anthropic SDK 双路径）、`:530-547`（`parseToolArguments`）、`:550-581`（`classifyError`）

### 3.5 抽取点 ④：web 侧接线（协议解析 / help / 执行器）
- `packages/web/src/ai/web-cli.ts:36-155` — `parseWebCliCommand`（lgdl-web-cli 前缀 + 18 子命令 + --doc 提取）；`:158-198`（tokenizeCli / parseArgs）；`:229-289`（parseWebCliBatch 批量解析）；`:302-327`（parseWebFetchCommand，独立工具解析）
- `packages/web/src/ai/help.ts:190-209` — `webCliHelp`（**:11 import `COMMANDS` from '@lgdl/core' 动态生成增量命令帮助——单一数据源**）；`:293-308`（webOpHelp）；`:311-322`（webFetchHelp）
- `packages/web/src/ai/ops.ts:52-71` — `executeWebFetch`（平台 web fetch 执行）；`:351-375` — `describeCommandLine`（UI 预览）
- **UI 引用侧**：`AiPanel.tsx:5-8`（import ops/provider/prompts/next-actions）、`:390`（chat）、`:430`（executeWebFetch）、`:435`（executeSubcommand）；`App.tsx:19-20`（provider/help）；`SettingsPanel.tsx:12`（provider）

### 3.6 抽取点 ⑤：CLI 入口引用（core 导出面的消费者）
- **9 个 mutation 命令全部 `import { applyOperation, buildOperation } from '@lgdl/core'`**：`packages/cli/src/commands/add-node.ts:4`（代表，其余 remove-node/update-node/add-edge/remove-edge/update-edge/add-group/remove-group/update-group 同构）
- `cli/src/commands/queries.ts:4`（queryStatus/listNodeKinds/queryDocInfo/queryNode/queryEdge/findNodes）；`cli/src/option-hints.ts:9`（listFormats）；`cli/src/shared.ts:5-11`（parseLgdl/validate/serializeLgdl/LgdlDocument/MutationResult）
- **core 导出面**：`packages/core/src/index.ts:44`（COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec/defaultKindFor）、`:28-33`（applyOperation/applyOperations/describeOperation/LgdlOperation/OperationBatchResult）、`:34`（formatStatus）、`:35-42`（queries 系列）、`:43`（templates 系列）——**core 若删除这些导出，cli 立即构建失败**

### 3.7 测试引用面与回归门禁
| 测试文件 | 用例数 | 迁移面 |
|---------|-------|--------|
| core/src/commands.test.ts | 14 | 直测 ./commands.js（COMMANDS/buildOperation/parseAttrsSpec 等）——随迁候选 |
| core/src/operations.test.ts | 9 | 直测 ./operations.js + ./parser.js + ./groups.js——随迁候选 |
| core 其余（mutations 206 / parser 52） | 258 | LGDL 领域，留下 |
| **core 合计** | **281** | 与 ROADMAP 门禁一致（ROADMAP.md:131） |
| web/src/ai/ops.test.ts | 27 | 直测 ./ops.js（executeSubcommand/executeCommands/executeWebFetch） |
| web/src/ai/web-cli.test.ts | 30 | 直测 ./web-cli.js；**:4 import '@lgdl/core'（formatStatus/parseLgdl）** |
| web/src/ai/help.test.ts | 8 | 直测 ./help.js |
| web/src/ai/provider.test.ts | 20 | 直测 ./provider.js |
| web 其余（next-actions 4 / locate 10 / snap 8） | 22 | LGDL/UI，留下 |
| **web 合计** | **107** | 与 ROADMAP 门禁一致 |

### 3.8 其他引用面
- **CI**：`.github/workflows/deploy-pages.yml:37`（构建 core/layout/render）、`:40`（构建 web）——新包若被 web 依赖，需补构建（与 F-01 修复的 router 缺失同类问题）
- **文档**：`docs/v0.5-web-ai.md:142` 明文「协议实现在 web/ops.ts」——迁移后位置描述过时（v0.6 已知 20 项文档漂移之一，ROADMAP.md:18）
- **web-cli 工具名被 prompts 引用**：`web/src/ai/prompts.ts` LGDL_SYSTEM_PROMPT 描述三工具协议（迁移不改工具名则提示词不受影响——**零语义改动的隐含约束**）

## 4. 问题清单（抽取边界）
> 按「迁出 / 留下 / 随迁 / 待决策」四类组织；每个问题一句话概括 + 证据行号

### 4.1 迁出（与 LGDL 领域解耦的可复用底座 → 新包）

| ID | 问题描述（迁出对象） | 证据（文件:行号） |
|----|--------------------|------------------|
| Q-001 | COMMANDS 命令注册表 + 参数校验（requireParams/assertChangeRequested）+ buildOperation + attrs/member 解析器（parseAttrsSpec/parseMemberSpec）——「业务逻辑只写一次，两端行为严格一致」的注册表底座 | core/src/commands.ts:26-289（除 defaultKindFor，见 Q-010） |
| Q-002 | 执行层：core 侧 LgdlOperation 操作协议 + describeOperation + applyOperation/applyOperations（分派器）+ web 侧 executeSubcommand 管线骨架 + executeCommands 逐行循环 + CommandExecResult——即 ROADMAP 所述「executeSubcommand→buildOperation→applyOperation→validate→serialize」全链 | core/src/operations.ts:31-220；web/src/ai/ops.ts:34-44,80-331 |
| Q-003 | function-calling 工具定义：WEB_CLI_TOOL（lgdl-web-cli 工具 schema）及 LLM 客户端（chat 双路径）/ parseToolArguments / classifyError——AI 可调用命令执行框架的工具面 | web/src/ai/provider.ts:282-324,392-547 |
| Q-004 | 命令文本协议解析器：tokenizeCli / parseArgs（通用语法）+ parseWebCliCommand 的解析骨架（前缀/子命令路由/--doc 提取为 LGDL 适配参数） | web/src/ai/web-cli.ts:36-198 |
| Q-005 | help 自文档框架：webCliHelp 动态生成机制（基于 COMMANDS 注册表生成增量命令帮助——单一数据源机制本身可复用） | web/src/ai/help.ts:149-209 |

### 4.2 留下（LGDL 领域语义，新包不碰）

| ID | 问题描述（留下对象） | 证据（文件:行号） |
|----|--------------------|------------------|
| Q-006 | core 领域类型全集：LgdlDocument/LgdlNode/LgdlEdge/LgdlGroup/LgdlMember/LgdlAttrs/NodeKind/DiagramType/ParseResult/LgdlIssue 等 | core/src/types.ts:12-208 |
| Q-007 | core 领域函数：mutations.ts（9 个增量编辑）、parser.ts（parseLgdl/validate）、serialize.ts（serializeLgdl）、queries.ts（只读查询）、status.ts（formatStatus）、templates.ts、groups.ts、converters.ts + mermaid/plantuml/json/mermaid-import | core/src/{mutations,parser,serialize,queries,status,templates,groups,converters,mermaid,plantuml,json,mermaid-import}.ts |
| Q-008 | web 领域/UI：prompts.ts（LGDL system prompt）、next-actions.ts（UI 操作参数）、AiPanel.tsx/SettingsPanel.tsx/App.tsx、locate.ts/snap.ts/examples.ts | web/src/ai/prompts.ts、web/src/ai/next-actions.ts、web/src/{App.tsx,locate.ts,snap.ts,examples.ts} |

### 4.3 随迁（web 侧接线迁出至新包，LGDL 侧重接为适配场景）

| ID | 问题描述（随迁对象） | 证据（文件:行号） |
|----|--------------------|------------------|
| Q-009 | ops.ts 整体（executeSubcommand/executeCommands/executeWebFetch/describeCommandLine）+ provider.ts 整体（tools + LLM 客户端 + Key 管理）+ web-cli.ts + help.ts——ROADMAP 原话「web 侧接线（ops.ts / provider.ts）迁出至新包」；迁出后 AiPanel.tsx:5-6/App.tsx:19-20 的 import 目标切换为 @lgdl/web-cli 类新包 | web/src/ai/ops.ts:1-376、provider.ts:1-581、web-cli.ts:1-327、help.ts:1-322；AiPanel.tsx:5-6,19-20 |

### 4.4 待 spec 决策边界（discovery 记录事实，不决策）

| ID | 问题描述（决策点） | 证据（文件:行号） |
|----|--------------------|------------------|
| Q-010 | `defaultKindFor` 归属：纯 LGDL 图类型→kind 语义映射，但内嵌于 buildOperation 调用链（commands.ts:141）；迁出则需参数化/注入（适配器），留下则 COMMANDS 底座不完整 | core/src/commands.ts:223-227 |
| Q-011 | `WEB_OP_TOOL`/`WEB_FETCH_TOOL` 归属：UI 操作（LGDL workbench 特有）与平台 web fetch 是否随框架迁出，还是作为 LGDL 适配侧工具注册 | web/src/ai/provider.ts:232-281,330-358 |
| Q-012 | provider.ts 的 localStorage API Key 管理（loadSettings/saveSettings/saveProviderInputs）是 web 应用状态，是否留在 web（拆分 provider.ts）还是整体随迁 | web/src/ai/provider.ts:62-194 |
| Q-013 | `LgdlOperation`/`applyOperation` 的类型依赖（NodeKind/LgdlMember/LgdlAttrs/LgdlDocument）决定新包依赖方向：新包 → @lgdl/core（保类型，解耦不彻底）vs 类型中性化/泛型化（彻底解耦，但改动类型签名，需澄清「零语义改动」是否含类型层） | core/src/operations.ts:16-28,31-84 |

## 5. 竞品参考
> 仅记录事实，不做方案评价（方案评估是 plan 的职责）

| 竞品/参照 | 是否处理过类似问题 | 处理方式（事实） | 与我们场景的差异 |
|------|-------------------|----------------|----------------|
| LGDL monorepo 既有拆分先例（v0.5~v0.6 已实施） | 是 | layout / router / render 已独立成包，依赖方向 core ← layout ← render（render/package.json dependencies），core 保持零依赖；web 通过依赖声明引用（web/package.json） | 已落地且带测试/commit 验证（ROADMAP.md:18）；新包涉及「core 内代码迁出 + web 接线迁出」双向动作，比纯新增包复杂 |
| commander（LGDL cli 已用） | 是 | 命令注册（registry.ts:8-20 LgdlCommand 插件化）+ 参数解析与业务执行分离；cli 命令层只做输入适配（add-node.ts register 内 .action 调 buildOperation/applyOperation） | commander 是通用参数解析库，不承载业务注册表；LGDL 的 COMMANDS 注册表是「语义命令注册 + 参数校验 + op 构造」的自研层（commands.ts 头注释：业务逻辑只写一次，两端行为严格一致） |

## 6. 假设与风险

### 6.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | 作者指令已闭环、无待答问题：抽取内容、排布窗口、零破坏门禁、开源细节不决策均已由 ROADMAP §二 v0.6 F-13 ① 明示（129-145 行），本阶段无需访谈 | ROADMAP.md:127-145 原文核对（已完成） |
| A-002 | 「零语义改动」= 运行时行为与输出逐字节一致（错误消息、status 文本、序列化结果），由测试全绿为证；代码位置迁移允许结构调整（如将领域 API 改为适配器注入，不改变行为） | spec 阶段明确定义；plan 阶段细化；build/review/validate 以 web 107 / core 281 + 手测闭环验证 |
| A-003 | 新包命名/许可/仓库/发布管道属 F-13 ②（v1.1）决策范围，本步不预设立场 | ROADMAP.md:29,131（「开源细节仍决策待定」） |
| A-004 | 回归门禁数字 107/281 与 ROADMAP 一致，且迁移不改动测试数量与断言（零新增功能故用例不增；迁移故用例随迁但语义不变） | §3.7 已逐文件核实计数（web 8+4+27+20+30+10+8=107；core 14+206+9+52=281） |

### 6.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | **依赖方向死锁**：若 core 以 re-export 方式保留 COMMANDS/buildOperation（保持 cli 引用不变），则 core → 新包；而新包要引用 LgdlOperation/LgdlDocument 类型又需 core → 形成 core ↔ 新包 循环依赖，且破坏 core「零依赖」现状（core/package.json） | 高 |
| R-002 | **CLI 引用断裂**：cli 9 个 mutation 命令 + queries/option-hints/shared 均从 @lgdl/core 导入 buildOperation/applyOperation 等（add-node.ts:4 等），core 删除导出即构建失败——零破坏必须覆盖 cli 侧引用迁移 | 高 |
| R-003 | **applyOperation 强绑定领域函数**：operations.ts:16-27 import 全部 9 个 mutation + LgdlDocument——「框架分派器」与「领域变更函数」深度耦合，迁出时的解耦方式（注入 vs 保持依赖）是核心架构决策 | 高 |
| R-004 | **web 执行层 13 个领域 API 直调**：ops.ts:10-30 的 import 清单是 LGDL 适配面；适配接口设计不当会改动执行路径（违背零语义改动）或引入重复实现 | 高 |
| R-005 | **测试迁移面广**：core 23 用例（commands 14 + operations 9）+ web 85 用例（ops 27 + web-cli 30 + help 8 + provider 20）涉迁移；web-cli.test.ts:4 直接 import @lgdl/core——测试引用与代码同步迁移 | 中 |
| R-006 | **W-D1 缺陷共存**：provider.ts:504 OpenAI 端点 tools 缺 WEB_FETCH_TOOL（F-04 修复点）与 F-13 共享接线面——排布上 F-04 先行关闭（ROADMAP.md:134），否则在未修复的接线面上叠加抽取风险 | 中 |
| R-007 | **CI 构建缺口**：deploy-pages.yml:37,40 只构建 core/layout/render + web；新包若被 web 依赖需补构建（与 F-01 修复的 router 缺失同类，F-01 关闭后 F-13 不得回退该修复） | 中 |
| R-008 | **文档漂移加剧**：docs/v0.5-web-ai.md:142 明文「协议实现在 web/ops.ts」，迁移后位置描述过时；v0.6 已知 20 项漂移，F-13 是否附带文档修订需 spec 界定 | 低 |
| R-009 | **help 单一数据源迁移**：help.ts:11 import COMMANDS（core）——随迁后 import 目标切到新包；若新包未导出 COMMANDS 则 help 失去单一数据源 | 低 |
| R-010 | **手测依赖人工**：回归门禁含「AI 面板手测通过」（ROADMAP.md:144），全自动 CI 无法覆盖，需作者/评审人工复核 | 低 |

## 7. 约束清单与下一步建议

### 7.1 约束清单（作者指令已闭环，F-13 ① 执行红线）

| # | 约束 | 来源 |
|---|------|------|
| C-001 | **零新增功能**：仅位置迁移，不新增任何命令/工具/行为/输出 | ROADMAP.md:131（state.json scope.out） |
| C-002 | **零语义改动**：语义模型不变，行为与输出逐字节一致 | ROADMAP.md:131（「仅位置迁移、不改语义模型，对应 v1.0 门槛 4」） |
| C-003 | **零破坏**：web 107 / core 281 全量回归 + 手动 AI 实战闭环门禁 | ROADMAP.md:131,144 |
| C-004 | **领域解耦，LGDL 为首个适配场景**：新包与 LGDL 领域解耦，LGDL 侧提供适配 | ROADMAP.md:129（state.json description） |
| C-005 | **开源细节不决策**：许可/命名/仓库/发布管道属 F-13 ②（v1.1），本步不预设立场 | ROADMAP.md:29,131 |
| C-006 | **不阻塞 v0.6 发布**：若超窗则从发布剥离、顺延至 v0.6 后立即执行 | ROADMAP.md:145 |
| C-007 | **排布顺序**：F-04/F-05 先行关闭 → F-13 ① 紧随启动（第 2 周前段），避免在刚修复的 source-loc 链路上叠加风险 | ROADMAP.md:134,143 |

### 7.2 下一步建议（spec 阶段的决策优先级）

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | **依赖方向决策（Q-013 + R-001/R-002）**：新包与 core 的引用关系（新包→core 保类型 vs 类型中性化）、core 是否保留/删除导出、cli 引用迁移方案——此决策决定抽取的一切形态 | 最先必须定；建议 spec 阶段首个议题 |
| 高 | **适配接口设计（R-004）**：ops.ts 直调的 13 个 core 领域 API 如何注入新包执行骨架（parse/serialize/validate/query/template/convert），确保零语义改动 | 决定「LGDL 作为首个适配场景」的具体形态 |
| 高 | **defaultKindFor 处置（Q-010）**：LGDL 语义内嵌于 COMMANDS 底座，参数化/注入 or 留下 | 影响 Q-001 迁出完整性 |
| 中 | **tools 归属（Q-011/Q-012）**：WEB_OP_TOOL/WEB_FETCH_TOOL/localStorage Key 管理随迁 or 留 web（provider.ts 是否拆分） | 影响 Q-009 边界粒度 |
| 中 | **测试迁移计划（R-005）**：core 23 + web 85 涉迁用例的搬运与引用调整，保证 107/281 门禁口径不变 | 与代码迁移同步设计 |
| 中 | **CI 更新（R-007）**：deploy-pages.yml 为新包补构建（或确认 workspace 解析方式覆盖） | 防止 F-13 回退 F-01 修复 |

**无待答问题说明**：本阶段未执行访谈——作者指令（ROADMAP §二 v0.6 F-13 ①）已闭环抽取内容、排布窗口、回归门禁与边界（开源细节不决策），所有待 spec 决策项（Q-010~Q-013）均已在 §4.4 显性列出并附带证据，交由 spec Agent 在规范阶段处理。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：现状基线摸底（文件:行号证据）+ 抽取边界清单（迁出/留下/随迁/待决策）+ 风险清单 + 约束清单；零访谈（作者指令已闭环） | 2026-08-31 | SDDU Discovery Agent |
