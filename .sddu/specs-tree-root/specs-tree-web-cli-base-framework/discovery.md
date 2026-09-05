# 问题挖掘报告：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 问题挖掘报告 — 盘点 web-cli-base 框架化的问题域与现状基线，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点；立项来源见 state.json notes：作者对话 2026-09-05，bash 类比）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-05
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建（只读盘点 + 问题界定，不设计技术方案）

---

## 0. 本阶段说明（任务书对齐）

- **角色边界**：本阶段只做问题挖掘与现状盘点（只读），**不设计技术方案（plan 职责）、不写代码、不定义需求（spec 职责）**。文末的边界映射与开放点均为「问题域界定」，供 spec/plan 裁决，非方案。
- **探查范围**（全部基于代码实测，引用 `文件:行号`）：`packages/web-cli-base/src/`、`packages/lgdl-web/src/ai/`、`packages/lgdl-web/src/App.tsx`、`packages/lgdl-web-op-cli/src/`、`packages/lgdl-web-cli/src/`（含 `adapters/`）、`packages/lgdl-cli/src/registry.ts`、`.sddu/specs-tree-root/ROADMAP.md`。
- **方法**：工具分发/执行入口/注册机制/时序机制四维盘点 → domain-neutral 归属识别 → 问题清单（按影响分级）→ 边界初步映射 → 开放点。证据以 `文件:行号` 标注，无臆测项。
- **上下文**：v0.6 V2（specs-tree-web-cli-v2）已完成 9 包体系、web-cli-base 纯机制化（零 lgdl 依赖）；本 Feature 是 V2 之后的框架化进阶（用户决策见 §1.2）。当前基线：9 包测试 420 全绿（v0.6 完成态，见 specs-tree-web-cli-v2 state.json）。

---

## 1. 问题定义

### 1.1 Feature 定位与 bash 类比（概述）

用户的核心类比：**web-cli-base 应像 bash** —— 一个完整自足的 AI-CLI 环境，而不是「机制零件 + 碎片工具」的集合。bash 的能力分层是：

| bash 分层 | 含义 | web-cli-base 现况 |
|-----------|------|------------------|
| shell 解释器/路由 | 把命令名解析并分发到内建/函数/外部命令（PATH） | ❌ 缺失 —— 工具分发在 lgdl-web 视图层手写 `tc.name` if/else（§3.2） |
| 内建命令 | shell 自带的常用命令（cd/echo/…），开箱即用 | ⚠️ 部分 —— web-fetch/sleep 已居 base，但需消费方手写分支接入（§3.4） |
| 可注册业务命令 | 外部程序/函数挂进 shell，路由自然识别 | ❌ 碎片化 —— 四种注册/枚举机制并存（§3.3） |
| 独立存在 | 装即用，不依赖任何业务包 | ⚠️ 机制层已独立（零 lgdl 依赖），但"AI-CLI 接线"（schema 组装/分发/agent 循环）仍沉在 lgdl-web（§3.5） |

**一句话命题**：把「{tool, args} → executor」的统一路由（CommandRouter）与 domain-neutral 能力收编进 web-cli-base，使任何项目装 web-cli-base 即可搭建自己的 AI-CLI，业务包（lgdl-web-cli / lgdl-web-op-cli）通过注册注入，lgdl-web 只保留 LGDL 特有。

### 1.2 用户决策（立项依据，作者已裁决 → 非待挖问题）

| # | 决策 | 出处 |
|---|------|------|
| D-1 | 新 Feature 立项，纳入 ROADMAP | state.json description / notes（2026-09-05） |
| D-2 | 全局 delay 连带落地（CommandRouter 统一路由时挂通用 delay 机制） | state.json notes |
| D-3 | 完全不兼容，内测，无历史债（允许破坏性重构） | state.json description / notes |
| D-4 | 核心原则：非 LGDL 特有的场景能力一律归 web-cli-base 复用；lgdl-web 只留 LGDL 特有 | state.json description / notes（作者原话：bash 类比） |

### 1.3 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| 工具分发/注册知识散落 lgdl-web 视图层与多个注册面，base 不自知自己的工具集合（Q-001/Q-005） | 任何新场景（bash 类比的目标）必须复制 lgdl-web 的分发/组装代码；工具增删改需同步 ≥3 处 | 框架定位落空：web-cli-base 只是"零件库"，永远长不成 bash；重复造轮子持续累积 |
| base 缺统一 CommandRouter（{tool,args}→executor），五工具执行入口异构（Q-002） | 路由、agent 循环、工具反馈、help 聚合均无法复用；lgdl-web 的 AiPanel 是事实上的"路由层"但不可移植 | 每个新 AI-CLI 场景从 lgdl-web 拷贝整个面板接线；无全局钩子（delay 等）可挂 |
| createExecutor 是"单领域文档管线"通用壳，非"任意命令路由"（Q-003） | 非文档型 AI-CLI 场景套不上 DomainApi 管线；把每类工具都塞进一个管线不成立 | 路由层缺失的根因：bash 的模型是"命令名→不同执行器"，不是"一个通用管线" |
| 全局 delay 无落点：只有显式 sleep 工具，时序责任推给模型（Q-004） | AI 必须自己记得在 UI 操作间插 sleep；无隐式统一等待/节流，行为不稳定 | delay 决策（②）无法落地；时序问题成为各场景反复手搓的隐性负担 |
| lgdl-web 承担大量中性"AI-CLI 接线"（schema 组装/help 聚合/循环/反馈）（Q-006/Q-011） | 违背 D-4 原则：中性能力留在 lgdl-web，lgdl-web 包体与职责膨胀 | lgdl-web 只留 LGDL 特有能力的目标无法达成 |

---

## 2. 用户画像与场景

| 用户角色 | 典型场景 | 关键痛点（原话/证据） | 当前应对方式 |
|---------|---------|-------------------|------------|
| 作者（单维护者 / 架构决策人） | 规划 web-cli-base 定位；为 F-14（v1.1 消费端）铺路 | 「非 LGDL 特有的场景能力一律归 web-cli-base 复用」「base = 完整自足 AI-CLI 环境 + 内置命令 + 可注册业务命令」（state.json notes / description，原话） | 逐版本抽取（V2 已纯机制化）；本 Feature 为下一步框架化 |
| LGDL Web 工作台 AI 使用者 | 让 AI 帮忙绘图，观察 AI 逐步操作预览/编辑器 | 不直接感知框架问题，但承受其后果：AI 需自行记得 UI 时序（sleep 描述即要求 AI 插等待，`web-cli-base/src/tools.ts:59`）；命令系统行为依赖模型对碎片约定的记忆 | 忍受（AI 偶发时序失败）；提示词兜底（prompts.ts 要求"每完成一步关键修改就 preview-click"） |
| 未来复用场景开发者（F-14 消费端 / 其他 AI-CLI 项目） | 装 web-cli-base 搭自己的 AI-CLI | 「任何项目装 web-cli-base 即可搭 AI-CLI，无业务包耦合」（state.json description，原话）——现况不成立：路由与循环都在 lgdl-web | 无（场景尚未出现；ROADMAP §F-14 依赖协议发现机制，当前 ❌，ROADMAP.md:223） |
| 下游 spec/plan Agent | 消费本 discovery.md 产出 spec | 需要「现状/缺口/边界」以证据可追溯（文件:行号），而非泛泛而谈 | 本文件 §3/§4 提供基线；开放点 O-001~O-006 需作者裁决 |

> 注：本 Feature 为框架重构，无终端用户访谈；「痛点原话」仅引用可溯源的项目内作者原话与代码文案，不编造访谈记录。

---

## 3. 现状基线盘点（证据：文件:行号）

### 3.1 五工具一览：schema / 执行入口 / help / 文本前缀

| 工具名 | schema 定义源 | function-calling 执行入口 | help 源 | 文本前缀 |
|--------|--------------|--------------------------|---------|---------|
| `lgdl-web-cli`（图内容操作） | `lgdl-web-cli/src/tools.ts:9-51`（WEB_CLI_TOOL，enum 17 子命令） | `createExecutor(...).executeSubcommand` —— `lgdl-web-cli/src/adapters/lgdl.ts:106-115` 的 lgdlExecutor；DomainApi 19 符号组装 `adapters/lgdl.ts:65-85`；管线在 `web-cli-base/src/exec.ts:135-308` | `lgdl-web-cli/src/help.ts`（webCliHelp） | `lgdl-web-cli` |
| `lgdl-web-op-cli`（UI 操作） | `lgdl-web-op-cli/src/tool.ts:11-55`（WEB_OP_TOOL，enum 由 OP_SUBCOMMANDS 派生 `ops.ts:87-90`） | `OpHandlerRegistry.execute` —— `lgdl-web-op-cli/src/handlers.ts:19-42`；17 个 handler 由 **lgdl-web 视图层**注入（`lgdl-web/src/App.tsx:986-1119`，AiPanel 经 onWebOp 调用 `App.tsx:1121-1124`） | `lgdl-web-op-cli/src/help.ts`（webOpHelp，元数据源 OP_COMMANDS `ops.ts:11-75`） | `lgdl-web-op-cli` |
| `web-fetch`（web 获取，base 内建） | `web-cli-base/src/tools.ts:11-47` | `executeWebFetch`（`web-cli-base/src/web-fetch.ts:54-79`；结构化调用由 AiPanel 直调 `AiPanel.tsx:440-444`） | `web-cli-base/src/help.ts:26-37`（webFetchHelp） | `web-fetch` |
| `sleep`（时序等待，base 内建） | `web-cli-base/src/tools.ts:50-77` | `parseSleepCommand` + `executeSleep`（`web-cli-base/src/sleep.ts:17-60`；结构化调用由 AiPanel 特判拼接命令文本后重解析 `AiPanel.tsx:445-470`） | `web-cli-base/src/help.ts:40-51`（webSleepHelp） | `sleep` |
| `web-cli-help`（顶层工具发现） | `web-cli-base/src/tools.ts:80-105` | **场景侧** HelpAggregator：`lgdl-web/src/ai/help-aggregator.ts:11-15`（base 聚合器 + 2 业务工具注册）；每次调用新建实例 `AiPanel.tsx:475` | 聚合器条目（base 预注册 web-fetch/sleep `help-aggregator.ts:40-44`） | `web-cli-help` |

**执行入口异质性**：五工具四种入口范式（executor.executeSubcommand / registry.execute / 直调 execute / aggregator 查询），无一统一执行契约。base 已统一了 **schema 形态**（`{subcommand,args}` 与 `{args}` 约定，最近一次提交 4e5cdb9 对齐嵌套 args）与 **LLM 侧 toolCalls 单列表契约**（`web-cli-base/src/llm.ts:34-41,193-210`，注释明示「消费方按名分发」llm.ts:26）——但**分发本身**仍在消费方。

### 3.2 路由与分发现状（为什么该下沉）

**结构化分发主现场**：`lgdl-web/src/ai/AiPanel.tsx:421-489`，agent 循环内对 `res.toolCalls` 逐条 `tc.name` 五分支 if/else：

```
AiPanel.tsx:425  tc.name === 'lgdl-web-op-cli'  → next-actions 拦截(428) 或 onWebOp(438)→App opRegistry.execute
AiPanel.tsx:440  tc.name === 'web-fetch'        → executeWebFetch(tc.args.path)(442)
AiPanel.tsx:445  tc.name === 'sleep'            → 特判：seconds→ms 归一 + parseSleepCommand 重解析(447-470)
AiPanel.tsx:471  tc.name === 'web-cli-help'     → 新建场景聚合器 getTool/listAll(475-478)
AiPanel.tsx:480  else（默认）                   → executeSubcommand → lgdl-web-cli 执行器(482)
```

**同名路由知识在 ≥3 处重复维护**：

1. schema 组装：`provider.ts:247-275` buildTools 硬编码 5 工具数组（顺序有讲究，注释 :243-246：业务工具在前、web-fetch/sleep/web-cli-help 置末避免 tool_choice 优先序漂移）；provider.test.ts:191 断言顺序 `['lgdl-web-cli','lgdl-web-op-cli','web-fetch','sleep','web-cli-help']`。
2. 文本前缀映射：`AiPanel.tsx:154-170` toolCallToCommand（`tc.name` → 命令前缀，default 兜底 `'lgdl-web-cli'`）。
3. 执行分发：`AiPanel.tsx:425-489`（default else 兜底 executeSubcommand）。

**两个"隐性默认路由"**：未知工具名在 toolCallToCommand 与分发 else 中均**静默按 lgdl-web-cli 处理**（AiPanel.tsx:164, 481）——无"未注册工具"显式错误概念。

**关键结论**：工具名（`tc.name`）事实上就是路由键，但路由表（名字 → schema + 前缀 + 执行器 + help）不存在于任何一处；base 提供全部零件却看不到自己的工具集合（无自举目录）。这正是 CommandRouter（register/dispatch）要填补的空位；同时 agent 循环（`AiPanel.tsx:383-524`：turns 管理、MAX_ROUNDS、tool 结果回填、失败重试）与消息渲染（564-570 等）耦合在 React 组件内，循环逻辑本身是 domain-neutral 的。

### 3.3 业务注册机制现状（四种注册/枚举面并存）

| 注册面 | 机制 | 位置 | 注册内容 |
|--------|------|------|---------|
| ① 领域命令注册（lgdl-web-cli） | `lgdlDomain` 19 符号 DomainApi 注入 + `createExecutor(lgdlDomain, {commandPrefix:'lgdl-web-cli', parseBatch, describeSubcommand})` | `lgdl-web-cli/src/adapters/lgdl.ts:65-115`；executor 经包 exports `./lgdl` 深导出（package.json），AiPanel:5 直引 | 子命令执行：增量命令走 COMMANDS 注册表 + buildOperation（`lgdl-web-cli/src/commands.ts`）；只读/status/init/convert 是 **exec.ts 内硬编码分支**（见 Q-003） |
| ② UI 操作注册（lgdl-web-op-cli） | `OpHandlerRegistry.register(subcommand, handler)`，未知子命令 → 错误文案 | `lgdl-web-op-cli/src/handlers.ts:19-38`；执行回调在 `lgdl-web/src/App.tsx:986-1119`（17 个 React handler） | 子命令级 handler；与未来 CommandRouter 的"工具级注册"存在机制重复风险（O-004） |
| ③ 工具 schema 组装 | `buildTools()` 静态 5 元数组 | `lgdl-web/src/ai/provider.ts:247-275`（D-011 注记：注册组装留 web） | 工具名 + description + parameters |
| ④ help 聚合注册 | `HelpAggregator.register({name, summary, render})`；base 预注册 web-fetch/sleep，场景方注册业务工具 | base 机制 `web-cli-base/src/help-aggregator.ts:14-45`；场景注册 `lgdl-web/src/ai/help-aggregator.ts:11-15` | 工具 → help 一览/详情 |

**四处维护同一工具名集合**（2+3+4+3.2 的分发），彼此无单一数据源。另：base 内建工具（web-fetch/sleep）**没有"自动注册"**——它们的 schema 靠 provider.buildTools 静态列出、执行靠 AiPanel 特判分支、help 靠 createHelpAggregator 预注册（help-aggregator.ts:42-43），三处分别手工登记，违背"内建命令自动注册"目标。

### 3.4 delay 现状：sleep 原语 vs 全局 delay 落点

**现状（显式 sleep，已居 base）**：
- schema：SLEEP_TOOL（`web-cli-base/src/tools.ts:50-77`），`args.ms` / `args.seconds` 二选一必填；
- 解析/执行：`parseSleepCommand`（sleep.ts:17-50，上限 10 分钟 clamp :46）、`executeSleep`（sleep.ts:56-60）；
- help：webSleepHelp（help.ts:40-51）。
- **语义定位**：显式时序原语 —— AI 自己决定何时插等待。工具描述示例即 UI 场景：`page-fullscreen on → sleep → page-fullscreen off`（tools.ts:59）；prompts.ts:49-53 要求 AI 每完成一步关键修改就做 UI 操作（preview-click/hover）——**时序编排责任完全在模型**：模型要记得 UI 生效/过渡需要时间，并主动拼 `sleep` 调用。
- **消费方式**：AiPanel 特判块（AiPanel.tsx:445-470）——把 `{ms|seconds}` 归一为 `sleep --ms N` 文本再走 parseSleepCommand（458 行重构文本重解析，属冗余间接层）；缺参时给友好提示（454-456）。

**全局 delay（决策 ② 的落点分歧）**：
- 目标语义：**隐式**通用等待/节流 —— 命令执行前由框架统一插入，与 AI 是否记得调用 sleep 无关。
- 落点候选与证据：
  - **CommandRouter 路由/分发入口**（跨所有工具统一挂点）——决策 ② 原文「CommandRouter 统一路由时挂通用 delay 机制」，与 bash 类比的 shell 级钩子同层；能覆盖"任意命令执行前"的通用场景（含未来新注册工具自动获得）。
  - **执行器级**（仅声明需要 delay 的 executor/handler 自行等待）——贴近现状（各 handler 同步无等待，App.tsx:986-1119 全部同步返回），但会退化为每个业务包自造轮子，与 D-4 冲突。
- **现状无任何隐式等待机制**：op 的 17 个 handler 全部同步即时执行；命令间"自然间隔"来自 LLM 往返延迟（非机制保证）。sleep 是唯一时序工具。
- **待界定的关系**（O-002）：隐式全局 delay 与显式 sleep 并存时是否叠加？默认值/上限是否复用 sleep 的 clamp？作用域是否区分"读类命令"（query/status，无需 delay）与"写/UI 类命令"（op-cli 系、fullscreen、zoom）？

### 3.5 domain-neutral 能力识别清单（归属三档）

**A 档 —— 已在 base（中性机制/内建工具，本 Feature 不动或仅补路由）**：
`commands.ts`（CommandSpec/requireParams）、`operations.ts`（createOperationApplier 泛型分派）、`protocol.ts`（tokenizeCli/parseArgs/createBatchParser）、`llm.ts`（chat/parseToolArguments/classifyError/契约）、`help.ts`（HelpArg/HelpEntry）、`help-aggregator.ts`（HelpAggregator）、`web-fetch.ts`/`sleep.ts`（内建工具）、`tools.ts`（三个内建工具 schema）、`exec.ts`（createExecutor 管线，见 Q-003 局限）。

**B 档 —— 中性模式但内容/位置在 lgdl-web（候选上收 base，D-4 原则）**：

| 候选能力 | 现位置 | 中性面 / LGDL 面 | 上收形态（仅界定，不设计） |
|---------|--------|------------------|--------------------------|
| 工具分发（tc.name → executor） | AiPanel.tsx:421-489 | 模式中性，内容 LGDL 5 工具 | → base CommandRouter.dispatch（O-001） |
| 工具 schema 收集/组装 | provider.ts:247-275 buildTools | 模式中性（收集注册表 schema），列表 LGDL | → base 从路由注册表派生 schema 数组（替代手写数组） |
| 工具名 → 文本前缀映射 | AiPanel.tsx:154-170 toolCallToCommand | 模式中性，default 兜底 LGDL | → base 注册表自带文本前缀（或派生） |
| help 聚合场景组装 | lgdl-web/ai/help-aggregator.ts:11-15 | 模式中性（聚合器注册），条目 LGDL | → base 从注册表派生 help 一览（注册即得） |
| agent 循环（turns/轮次/工具反馈/失败重试） | AiPanel.tsx:371-524（send/step） | 循环逻辑中性，绑 LGDL 的是 onApply/onWebOp/渲染 | → base 中性 agent runner（O-003 范围线） |
| web-cli-help 执行器（listAll/getTool 语义） | AiPanel.tsx:471-479 | 中性 | → 注册表驱动，随 CommandRouter 上收 |
| sleep function-calling 接入（ms/seconds 归一 + 执行） | AiPanel.tsx:445-470 | 中性（本应内建工具自带） | → 内建命令自动注册后无需消费方特判 |
| op 命令元数据 → handler 注册模式 | lgdl-web-op-cli（OpHandlerRegistry/OP_COMMANDS/tool/help 整套） | 机制与 CommandRouter 重复；**命令内容 LGDL（UI 操作）** | 业务包整体作为一个工具注册进 base（O-004） |

**C 档 —— LGDL 特有（不动，留 lgdl-web / lgdl-web-cli / lgdl-web-op-cli）**：
- 图内容语义：lgdl-web-cli 的 COMMANDS 9 增量命令 + buildOperation + lgdlDispatch/operations（`lgdl-web-cli/src/commands.ts`、`operations.ts`）、17 子命令文本协议（`protocol.ts:30-156`）、webCliHelp 文案（help.ts）；
- UI 操作语义：op-cli OP_COMMANDS 元数据与 App.tsx 16 个 React handler（copy-source/export-svg/preview-zoom/preview-click/fullscreen/…）；
- 语言引擎：lgdl-core/lgdl-layout/lgdl-render/lgdl-router 全部语义；
- 场景内容：LGDL_SYSTEM_PROMPT（`lgdl-web/src/ai/prompts.ts:12-64`）、PRESET_PROMPTS（AiPanel.tsx:40-149）、README-CLI 使用指南（路径 `lgdl/web/workbench/README-CLI.md` 硬编码于 AiPanel.tsx:302 与 web-fetch schema tools.ts:27）、provider 应用态（PROVIDERS/localStorage `lgdl-ai-settings`，provider.ts:53-206）。

**残留观察（base 文案非中性）**：base 自带文案仍含 LGDL 烙印——help-aggregator 一览提示 `web-cli-help lgdl-web-cli`（help-aggregator.ts:28）；web-fetch schema 示例路径 `lgdl/web/workbench/README-CLI.md`（tools.ts:27、38）；webFetchHelp 示例同（help.ts:34）。见 Q-012。

---

## 4. 问题清单与缺口

### 4.1 核心问题（影响面大、直接阻断框架化目标）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-001 | **工具路由知识三处重复、无单一数据源**：`tc.name → {schema(buildTools provider.ts:247-275), 文本前缀(toolCallToCommand AiPanel.tsx:154-170), 执行器(if/else AiPanel.tsx:425-489)}` 分别在 lgdl-web 三处维护；另有 help 聚合第四处（§3.3 ④）。新增/改名工具需同步 ≥3 处，且 base 无法自举自身工具目录 | 全部消费方与未来场景；lgdl-web 单点维护 5 工具全生命周期 |
| Q-002 | **base 缺统一 CommandRouter（{tool,args}→executor）**：五工具执行入口异构（executeSubcommand / OpHandlerRegistry.execute / executeWebFetch / executeSleep / aggregator 查询），无统一执行契约与返回形态；agent 循环（turns/工具反馈/失败重试）沉在 React 组件（AiPanel.tsx:383-524）——任何新场景必须从 lgdl-web 复制整个面板接线才能得到一个 AI-CLI | base 整体定位；bash 类比的核心（shell 路由）缺失 |
| Q-003 | **createExecutor 是"单领域文档管线"，非"任意命令路由"**：executeSubcommand 内硬编码命令族（help/list-node-kinds/list-diagram-types/doc-info/get-node/get-edge/find-node/status/validate/init/convert，exec.ts:145-257），语法按 LGDL 文档形状（doc/source/type）；非文档型场景无法套用。bash 模型是"命令名→各自执行器"，多工具场景需要按工具名路由，而非把所有工具塞进一个 DomainApi 管线——这是路由必须下沉的根因 | base exec.ts 的泛化边界；未来多域场景 |
| Q-004 | **全局 delay 无落点**：现状仅显式 sleep（AI 自觉调用，时序责任在模型；prompts/sleep 描述把 UI 时序编排推给模型），无隐式统一等待/节流机制；delay 应挂在 CommandRouter 统一分发入口（跨所有工具）还是执行器级未决，与显式 sleep 的叠加关系未定；sleep 的 function-calling 接入需消费方特判（AiPanel.tsx:445-470） | 决策 ② 的全部落地面；AI 行为稳定性 |
| Q-005 | **业务注册机制碎片化（四种并存）**：lgdl-web-cli 走 DomainApi+createExecutor 注入（adapters/lgdl.ts:106-110）、lgdl-web-op-cli 走 OpHandlerRegistry（handlers.ts:19-38）、schema 靠 buildTools 静态数组、help 靠 HelpAggregator 场景注册——同一工具名集合四处维护无单一数据源；内建命令（web-fetch/sleep）无自动注册（需三处手工登记） | 注册模型的完整性；Q-001 的结构性根因 |

### 4.2 次要问题（影响中等 / 核心问题的衍生）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-006 | **中性"AI-CLI 接线"滞留 lgdl-web**：schema 组装、help 场景聚合、agent 循环、工具名→前缀映射均为 domain-neutral 模式却留在 lgdl-web（§3.5 B 档），违背 D-4；lgdl-web 无法瘦身到"只留 LGDL 特有" | lgdl-web 包边界；复用承诺（决策 ④） |
| Q-007 | **接线存在"仅测试消费"与"每次重建"的冗余路径**：`lgdl-web/src/ai/lgdl-web.ts`（fetch 行处理器注入 + 第二个 lgdlExecutor 单例）当前只有测试引用（lgdl-web.test.ts），AiPanel 实际走 `@lgdl/lgdl-web-cli/lgdl` 深导出（AiPanel.tsx:5）——注释仍称"AiPanel 经 './lgdl-web' 消费"（lgdl-web.ts:6,39，陈旧）；web-cli-help 每次调用新建聚合器（AiPanel.tsx:475）。文本协议执行路径（executeCommands/describeCommandLine）当前无 UI 消费方，仅测试覆盖 | 接线层可信度；重构时的死面识别 |
| Q-008 | **sleep 的 function-calling 语义依赖消费方手写特判**：seconds→ms 归一、缺参提示、命令文本重建后二次 parseSleepCommand（AiPanel.tsx:445-470）——内建工具未体现"自动注册即接入" | 内建命令接入模型；延迟（458 行重建-重解析冗余） |
| Q-009 | **schema enum 与文本协议前缀双轨硬编码**：lgdl-web-cli 17 子命令 enum（tools.ts:33-40）与 lgdl-web-op-cli OP_SUBCOMMANDS（ops.ts:87-90）是静态 schema；文本执行前缀 `commandPrefix: 'lgdl-web-cli'`（adapters/lgdl.ts:107）另一处维护；op-cli export 别名不出现在 enum 的收敛规则靠注释维持（ops.ts:82-86） | 文本路径与 function-calling 的一致性；schema 漂移风险 |

### 4.3 潜在问题（影响小但可能恶化 / 信息不足待验证）

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| Q-010 | **exec.ts help 分支依赖 domain.webCliHelp 具名注入**（exec.ts:147-150，DomainApi 字段 webCliHelp:82）——路由化后 help 语义由注册表统一派生还是仍由 domain 注入未定 | exec.ts 与 CommandRouter 的职责分层（O-001） |
| Q-011 | **agent 循环泛化边界未明**：循环逻辑（可中性化）与 LGDL 交互面（onApply 写回编辑器 / onWebOp UI handler / web-cli 命令块渲染 / next-actions 胶囊 / PRESET prompts）耦合于 AiPanel——上收范围过大则重构风险陡增，过小则 Q-006 未解 | Feature 范围线（O-003）；回归风险 |
| Q-012 | **base 自带文案的 LGDL 残留**：help-aggregator tip `web-cli-help lgdl-web-cli`（help-aggregator.ts:28）、web-fetch schema/help 示例路径 `lgdl/web/workbench/README-CLI.md`（tools.ts:27,38、help.ts:34）——V2 纯化后的中性残留，影响 base 的"自足中性"观感；但清理需同步场景侧引导（README 路径提示是 lgdl-web 用法） | base 中性纯度；lgdl-web 场景引导的连带更新 |

### 4.4 边界界定初步映射（spec 输入；非方案）

**→ base 承接（in，候选）**
- CommandRouter：`register(tool)` / `dispatch({tool,args})` 统一路由与执行契约（Q-001/Q-002/Q-005 的解）；
- 内建命令自动注册：web-fetch / sleep / web-cli-help 经注册表即得 schema + 执行 + help（替代 buildTools 静态数组 + AiPanel 特判 + createHelpAggregator 预注册三处手工登记）；
- 全局 delay 机制挂路由统一入口（决策 ②；与 sleep 的关系按 O-002 裁决）；
- 工具 schema 收集、help 一览/详情派生（注册表驱动，替代场景侧手写聚合注册）；
- 工具名 → 文本前缀映射上收（toolCallToCommand 等价物）；
- （候选，按 O-003）agent 循环中性化（turns/轮次/工具反馈/失败重试）；
- base 文案 LGDL 残留清理（Q-012，需场景侧注入自定义示例的能力配合）。

**→ 业务包注册注入（lgdl-web-cli / lgdl-web-op-cli 内容不动）**
- lgdl-web-cli 整体注册为一个工具（其内部 lgdlDomain/COMMANDS/17 子命令语义保留，O-001 裁决与 exec 管线关系）；
- lgdl-web-op-cli 整体注册为一个工具；OpHandlerRegistry 保留为业务包内部机制或并入统一注册（O-004）。

**→ lgdl-web 剩余（out / 保持 LGDL 特有）**
- 图操作/UI 操作语义（§3.5 C 档）；
- React 视图面：面板/渲染/胶囊/next-actions 卡片/消息渲染；
- 场景内容：LGDL_SYSTEM_PROMPT、PRESET_PROMPTS、README-CLI 指南、示例图；
- provider 应用态（多厂商 PROVIDERS + localStorage 管理）——是否上收 base 为通用 settings 骨架不在本 Feature 承诺范围（可留 lgdl-web，标注待 spec 讨论）。

**→ 明确不动**
- lgdl-core/lgdl-layout/lgdl-render/lgdl-router 语言引擎语义；
- lgdl-cli（终端 commander + 自身 registry.ts 模式，与 web 侧分发解耦）；
- 开源决策（v1.1 范畴，state.json out 已列）。

---

## 5. 竞品参考（事实记录，不做方案评价）

| 竞品/参照 | 是否处理过类似问题 | 处理方式（事实） | 与我们场景的差异 |
|----------|-------------------|----------------|----------------|
| bash / zsh（用户直接类比对象） | 是（数十年 shell 路由范式） | 命令名解析 → 内建 / shell function / PATH 外部命令；`type`/`help`/`compgen` 做命令发现；`sleep` 是外部命令（显式等待），shell 无隐式全局 delay（各命令自带节流或用户显式调用） | bash 是进程模型 + 文本输入；我们是浏览器内 function-calling 路由 + 文档态工具（返回新文档）与副作用工具（UI 操作），且需向 LLM 暴露 schema |
| Claude Code / Codex / Cursor 类 agent harness | 是（工具 schema 集合 → 名称分发内建于运行时） | 每会话按注册工具集生成 schema 发给模型；tool_use 按 name/id 路由到 handler 并回填结果；工具集由 harness 统一维护，非消费方散落 if/else | 它们是完整产品（自带 UI/模型路由/会话）；我们要下沉的是**可复用框架层**（web-cli-base），且 LGDL 的图工具会返回「新文档」而非常规文本结果 |
| 仓库内先例：lgdl-cli 终端 CLI（registry.ts） | 是（同一仓库内的注册表先例） | `COMMANDS` 数组 + `registerAll(program)`（lgdl-cli/src/registry.ts:22-66），注册即得 help/示例；注释「main entry never changes」 | 终端 commander 模型，注册单元=命令模块；web 侧工具是 function-calling 形态，且有多执行器异构问题 |
| 仓库内先例：web-cli-base 自身（exec.ts DomainApi） | 部分（泛型注入做了一半） | DomainApi<Op,Doc> 注入面 + createOperationApplier 分派表（exec.ts:57-83, operations.ts:34-46）——把"领域语义"与"执行机制"分离 | 只覆盖单文档管线，无工具级路由；路由（按工具名选执行器）缺位（Q-003） |

> 注：以上只记录事实与差异，不推导"我们应该怎么做"（方案评估是 plan 职责）。

---

## 6. 假设与风险

### 6.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | 工具名（`tc.name`）是稳定的事实路由键，5 工具集合在重构后保持同名（或改名仅在 base 内建范围内） | spec 阶段确认工具名契约与改名面 |
| A-002 | bash 类比的复用价值成立：确有非 LGDL 场景消费 web-cli-base（ROADMAP F-14 消费端依赖"web-cli 协议发现/声明机制"，当前 ❌，ROADMAP.md:223；本 Feature 的统一注册模型可能为其前置雏形） | v1.1 开源线立项（非本 Feature 承诺，标注关联即可） |
| A-003 | 全局 delay 的目标命令主要是 UI/副作用类（op-cli 系、fullscreen/zoom 等 DOM 依赖场景）——证据：sleep 工具描述示例即 UI 场景（tools.ts:59），op handler 全部同步无等待（App.tsx:986-1119） | AI 实战闭环中 sleep 调用模式统计 |
| A-004 | AiPanel 的 agent 循环逻辑（turns/轮次/工具反馈/失败重试）可中性化而不损失 LGDL 特有交互（胶囊/web-cli 命令块/工具结果渲染） | O-003 裁决后抽取验证 + 行为回归 |
| A-005 | 测试守恒基线继续作为回归门禁（v0.6 完成态 9 包 420 全绿；V2 先例：测试只增不删）——但 D-3（完全不兼容）是否豁免/调整守恒规则需作者确认 | spec 阶段与作者确认（O-005） |
| A-006 | 工具 schema 顺序影响模型 tool_choice 优先序的观察成立（buildTools 置末注释 provider.ts:243-246；provider.test.ts:191 断言顺序）——注册表派生 schema 时需保留顺序契约 | spec 阶段评审该契约是否保留 |

### 6.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-001 | **范围蔓延**：若把 agent 循环/面板/渲染全部 base 化（Q-006/Q-011 全解），lgdl-web 仅剩 React 壳，工作量与回归风险陡增——需 spec 明确本 Feature 核心 = CommandRouter + delay + 注册收编，循环下沉按 O-003 划定 | 高 |
| R-002 | **隐性默认路由的行为变化**：现况未知工具名静默按 lgdl-web-cli 执行（AiPanel.tsx:164,481）；改显式注册后未知名将报"未注册工具"——AI 容错行为变化，需定义未注册名策略并显性化差异 | 中 |
| R-003 | **全局 delay 的体验/叠加风险**：隐式 delay × 命令数叠加拉长任务；AI 已显式 sleep 时双重等待——默认值、作用域、与 sleep 去重需裁决（O-002） | 中 |
| R-004 | **两套"半路由"并存**：exec.executeSubcommand 内部子命令路由（exec.ts:145-257 硬编码族）与顶层 CommandRouter 职责不清，可能出现路由层叠或语义分裂（Q-003/Q-010） | 中 |
| R-005 | **op-cli 机制重复的处理**：OpHandlerRegistry 若强并入统一注册，op-cli 业务包 API 面变化；D-3（完全不兼容）下可接受但需记入 spec 迁移面 | 低 |
| R-006 | **base 文案中性化清理的连带影响**：README 路径提示从 web-fetch schema 移除后，lgdl-web 场景的 AI 引导依赖场景侧注入自定义示例能力（Q-012） | 低 |

### 6.3 待确认开放点（需作者裁决，供 spec 输入）

| # | 开放点 | 关联问题 |
|---|--------|---------|
| O-001 | **CommandRouter 与 createExecutor(DomainApi) 的关系**：lgdl-web-cli 整体作为"一个工具"注册（exec 管线保留为一种内置执行器）？还是把 DomainApi 文档管线也泛化重构？exec 硬编码命令族（exec.ts:145-257）去留 | Q-002/Q-003/Q-010 |
| O-002 | **全局 delay 语义**：隐式 delay 挂统一路由入口的哪个时点（分发前/执行后）；默认开/关、默认值、上限（是否复用 sleep 10 分钟 clamp）；作用域（全部工具 or 仅声明需要者 or 按读/写分类）；与显式 sleep 的叠加关系；delay 是否反馈给 AI（tool 结果是否含等待信息） | Q-004/R-003 |
| O-003 | **范围线：agent 循环是否上收 base**（中性 agent runner，React 渲染留场景）——本 Feature 做 or 后置 | Q-006/Q-011/R-001 |
| O-004 | **op-cli 机制去留**：OpHandlerRegistry 并入统一 CommandRouter（子命令级 handler 注册）还是保留为业务包内部机制、仅整体注册工具？OP_SUBCOMMANDS 派生 enum 的静态 schema 是否改为注册表动态派生 | Q-005/Q-009 |
| O-005 | **测试策略**：D-3（完全不兼容）下是否仍要求测试守恒（V2 先例 420 全绿基线只增不删），还是允许本 Feature 按需增删（重构面大时守恒成本高） | A-005 |
| O-006 | **Q-012 文案残留清理的归属**：base 工具描述/帮助内 LGDL 路径与名称（tools.ts:27,38,91、help.ts:34、help-aggregator.ts:28）是否本 Feature 清理，场景侧如何注入自定义示例/引导 | Q-012/R-006 |

---

## 7. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | 以 Q-001/Q-002/Q-005 为核心问题域进入 spec：定义 CommandRouter 的注册模型（工具 schema/执行器/help/文本前缀四合一注册？）与内建命令自动注册契约 | 这是框架化的主干；spec 需产出 FR 级契约描述（不设计实现） |
| 高 | 作者裁决 §6.3 开放点（尤其 O-003 范围线与 O-002 delay 语义）——建议先裁范围再细化契约 | 防止 R-001 范围蔓延 |
| 中 | 全局 delay 的语义细化输入 spec（挂点时点/默认值/作用域/与 sleep 去重） | 决策 ② 落地；关联 Q-004 |
| 中 | §3.5 B 档 domain-neutral 候选清单逐项核验后作为 spec 的迁移面输入（哪些随本 Feature、哪些后置） | 关联 Q-006/Q-011 |
| 中 | exec.ts 与 CommandRouter 的分层关系专项评审（Q-003/Q-010），避免两套半路由并存 | R-004 |
| 低 | Q-012 文案中性化残留清单（含 lgdl-web 场景引导连带更新）纳入 spec 收尾项 | R-006 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：只读盘点 web-cli-base 框架化问题域（路由/注册/delay/domain-neutral 四维证据基线 + Q/A/R/O 编号界定），产物供 spec 阶段输入 | 2026-09-05 | SDDU Discovery Agent |
