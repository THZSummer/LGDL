# Feature Specification：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md v1.0（问题清单 Q-001~Q-012 / A-B-C 归属三档 / 风险 R-001~R-006 / 开放点 O-001~O-006）+ 用户 4 决策（D-1~D-4）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-05
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建（用户决策 + discovery 基线闭环；O-001~O-006 自主决策记录见 §9，D-001~D-006）

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | web-cli-base 框架化（V2 后进阶；bash 类比） |
| 名称 | web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属 |
| 优先级 | P1（作者指令立项，非发布阻塞；按 F-13/F-14 先例以作者指令语义权重排布） |
| 目标版本 | 待 ROADMAP 排布（D-1 已裁决立项纳入 ROADMAP；建议窗口 = v0.6 收口完成后，与 v0.7 工程质量期并行或紧随，作为 F-14/v1.1 消费线的前置铺垫） |
| 上游 | specs-tree-web-cli-v2（v0.6 V2，✅ 已完成：9 包体系 + web-cli-base 纯机制化零 lgdl 依赖，9 包 420 测试全绿） |
| 下游关联 | F-14 web-cli-plugin（v1.1 线）依赖本 Feature 的统一注册/路由雏形（ROADMAP §F-14，A-002） |

## 2. 上下文
> 回顾问题背景和目标用户

### 2.1 要解决的问题（bash 类比）

用户核心类比：**web-cli-base 应像 bash** —— 完整自足的 AI-CLI 环境（shell 路由 + 内建命令 + 可注册业务命令），而非「机制零件 + 碎片工具」集合。对照 bash 分层，现状缺口（discovery §1.1 / §3 证据）：

- **shell 路由缺失**：工具分发在 lgdl-web 视图层手写 `tc.name` if/else（AiPanel.tsx:421-489）；同名路由知识在 schema 组装（provider.ts:247-275 buildTools）、文本前缀映射（AiPanel.tsx:154-170 toolCallToCommand）、执行分发、help 聚合（§3.3 ④）**四处重复维护**（Q-001）；base 无法自举自身工具目录。
- **无统一 CommandRouter**：五工具四种异构执行入口（executor.executeSubcommand / OpHandlerRegistry.execute / executeWebFetch / aggregator 查询），agent 循环沉在 React 组件（AiPanel.tsx:383-524）（Q-002）；createExecutor 是"单领域文档管线"非"任意命令路由"（Q-003）——这是路由必须下沉的根因。
- **业务注册机制碎片化**：lgdl-web-cli（DomainApi+createExecutor 注入）/ lgdl-web-op-cli（OpHandlerRegistry）/ schema（buildTools 静态数组）/ help（HelpAggregator 场景注册）**四种注册面并存**，同一工具名集合四处维护；base 内建工具（web-fetch/sleep）无"自动注册"（Q-005）。
- **全局 delay 无落点**：仅显式 sleep（AI 自觉调用，时序责任在模型），无隐式统一等待/节流机制（Q-004，决策 D-2 需落地面）。
- **中性"AI-CLI 接线"滞留 lgdl-web**：schema 组装 / help 场景聚合 / agent 循环 / 名→前缀映射均 domain-neutral 却留在 lgdl-web，违背 D-4；lgdl-web 无法瘦身（Q-006）。

### 2.2 任务本质与用户 4 决策（立项红线，本规范贯彻）

| # | 决策（作者 2026-09-05） | 本规范的贯彻方式 |
|---|------------------------|-----------------|
| D-1 | 新 Feature 立项，纳入 ROADMAP | 目标版本 = 待 ROADMAP 排布（§1）；FR 全部以框架化主线展开 |
| D-2 | **连带落地全局 delay**（CommandRouter 统一路由入口挂通用 delay 机制） | DLY 组 FR-013~017；挂点 = CommandRouter 统一分发入口，非执行器级 |
| D-3 | **完全不兼容**（内测阶段，无历史债，允许破坏性重构，不保旧行为） | 内部接线允许破坏（如静默兜底改显式报错）；用户可感知闭环行为等价/改进（FR-024、NFR-003）；测试策略按 O-005 决策（D-005） |
| D-4 | **核心原则**：非 LGDL 特有场景能力一律归 web-cli-base 复用（base = 完整自足 AI-CLI 环境 + 内置命令 + 可注册业务命令）；lgdl-web 只留 LGDL 特有 | UPL 组 FR-006~012 上收；C 档内容一律不动（NG-001）；lgdl-web 收敛为场景组装 + LGDL 特有（FR-022~024） |

### 2.3 目标用户

| 用户角色 | 场景 | 诉求 |
|---------|------|------|
| 作者（单维护者/架构决策人） | 规划 web-cli-base 定位，为 F-14（v1.1 消费端）铺路 | base 长成 bash：装 web-cli-base 即得完整 AI-CLI，业务命令注册注入，不复制 lgdl-web 面板接线 |
| 未来复用场景开发者（F-14/v1.1） | 装 web-cli-base 搭自己的 AI-CLI | 无业务包耦合、开箱即得路由/帮助/内建命令/时序机制 |
| LGDL Web 工作台 AI 使用者 | 让 AI 绘图与操作 UI | 不感知框架变化；AI 行为更稳（隐式命令间隔，不靠模型自记 sleep） |
| 下游 spec/plan/validate Agent | 消费本规范 | FR/NFR/EC/AC 可测试可追溯（引用 discovery Q/O/A/R/D 编号） |

### 2.4 与既有 V2 的关系

- **V2（specs-tree-web-cli-v2，v0.6）已完成**：9 包体系 + web-cli-base **纯机制化**（A 档机制层：commands/operations/protocol/llm/help/help-aggregator/web-fetch/sleep/tools/exec，零 lgdl 依赖）+ 工具 schema 形态统一（`{subcommand,args}`/`{args}` 嵌套 args）+ LLM 侧 toolCalls 单列表契约（llm.ts:26 注释明示「消费方按名分发」）——**但分发本身仍在消费方**（discovery §3.1）。
- **本 Feature = V2 之后的框架化进阶**：补齐 bash 缺失的 shell 层（CommandRouter）、内建命令自动注册、统一注册模型、全局 delay；把 V2 未上收的中性接线（schema 组装/help 聚合/agent 循环/前缀映射/sleep 接入）收编 base。**不动** V2 已定的 schema 形态与单列表契约（保持），**不动** LGDL 语义层。

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| G-001 | **CommandRouter 下沉 base**：统一工具注册模型 + 统一分发执行契约（{tool,args}→executor）；路由知识从 lgdl-web 四处重复（schema 组装/前缀映射/分发 if/else/help 聚合）收敛进注册表单一数据源（Q-001/Q-002 的解） |
| G-002 | **内建命令自动注册 + 业务命令注册注入**：web-fetch/sleep/web-cli-help 由 base 自动注册即得 schema+执行+help；lgdl-web-cli / lgdl-web-op-cli 整体作为工具注册注入；lgdl-web 只留 LGDL 特有（Q-005，D-4） |
| G-003 | **全局 delay 落地**：通用等待/节流机制挂 CommandRouter 统一分发入口（跨所有工具，含未来新注册工具自动获得），与显式 sleep 分工且不叠加（Q-004，D-2） |
| G-004 | **domain-neutral 接线面上收 base**：schema 派生 / 名→前缀派生 / help 注册即得 / sleep function-calling 原生接入 / 中性 agent 循环（Q-006/B 档，O-003 边界见 D-003） |
| G-005 | **注册机制收敛为一**：四种注册碎片面 → 统一注册表；op-cli 顶层 OpHandlerRegistry 分发角色由 CommandRouter 承接（O-004，D-004）；工具名集合唯一维护 |
| G-006 | **base 中性纯度收尾 + lgdl-web 场景收敛**：base 文案 LGDL 残留清理（Q-012）；AiPanel 分发/特判面删除、死接线收敛（Q-007）；AI 工作台闭环用户可感知行为等价（D-3 声明边界内） |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-001 | **不改 LGDL 特有语义（C 档）**：图内容语义（lgdl-web-cli 9 增量命令 + 17 子命令 + exec 管线内命令族 + webCliHelp 文案）、UI 操作语义（op-cli OP_COMMANDS 元数据 + App 16 React handler 的 UI 行为与文案）、语言引擎（core/layout/render/router）、场景内容（LGDL_SYSTEM_PROMPT/PRESET_PROMPTS/README-CLI 指南/示例图）均不动 |
| NG-002 | **不做 exec（DomainApi 文档管线）的全泛化重构**：createExecutor 管线保留为 base 中性机制 + 作为 lgdl-web-cli 注册工具的内部执行器（O-001 决策 D-001）；不把单文档管线改造成通用命令路由 |
| NG-003 | **不上收 React/AI 面板 UI**：消息渲染（web-cli 命令块/胶囊/next-actions 卡片/tool 结果）、编辑器写回与 UI 回调（onApply/onWebOp）、pending/设置等 React 状态留 lgdl-web（O-003 边界 D-003）；agent 循环仅上收中性逻辑 |
| NG-004 | **provider 应用态不上收**：多厂商 PROVIDERS + localStorage Key 管理留 lgdl-web（§4.4 已标注待 spec 讨论 → 决策：留场景，不做通用 settings 骨架，见 §9 后置开放） |
| NG-005 | **不引入"工具描述覆盖/自定义示例"新注册面**：Q-012 场景引导由 lgdl-web system prompt/guideDoc 自动注入承担（现状已具备，AiPanel.tsx:391-395）；内置工具描述保持中性（O-006 决策 D-006） |
| NG-006 | **不改 5 工具名**：lgdl-web-cli / lgdl-web-op-cli / web-fetch / sleep / web-cli-help 名称保持现状（A-001）——改名牵连 prompts 协议描述与 C 档文案，零收益 |
| NG-007 | **不修既有领域缺陷**：与 LGDL 图/UI 语义相关的行为问题不属本 Feature；纯框架重构 + 行为等价/声明改进 |
| NG-008 | **不做开源/F-14 决策**：本 Feature 的统一注册模型是 F-14 协议发现机制的"可能前置雏形"（A-002），但仅标注关联、不承诺、不预设立场 |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | 作者/架构决策人 | web-cli-base 像 bash 一样装即自足（shell 路由 + 内建命令开箱可用） | 任何项目装 web-cli-base 即可搭 AI-CLI，业务命令注册注入即可，无需从 lgdl-web 拷贝面板接线 |
| US-002 | 未来复用场景开发者（F-14/v1.1 线） | 注册自己的业务工具（schema/执行器/帮助一次登记）后自动获得分发/帮助/时序能力 | 用最小代码搭出 AI-CLI，工具增删改不再同步多处 |
| US-003 | LGDL Web 工作台 AI 使用者 | AI 操作图与 UI 时行为稳定、不因忘记插 sleep 而时序失败 | 框架隐式保证命令间隔，AI 结果更可靠 |
| US-004 | lgdl-web 维护者 | 分发/接线代码瘦身，只留 LGDL 特有（图操作/UI 操作/场景内容） | 框架能力回归 base，后续场景演进不再重复造轮子 |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；按 RTR（路由下沉）/ UPL（复用面上收）/ DLY（全局 delay）/ REG（注册收敛）/ IN（场景收敛注入）五组组织
> 引用 discovery 问题编号（Q-xxx / A-B-C 档 / O-xxx / R-xxx / A-00x）

### 5.1 RTR — CommandRouter 路由下沉（base 本体）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **统一工具注册模型**：web-cli-base 提供工具注册能力，一个工具条目完整表达当前散落四处的全部路由知识——工具名 / function-calling schema（name+description+parameters）/ 执行器 / 文本命令前缀 / help 渲染入口 / 注册顺序 / delay 声明（可选）。lgdl-web 现 5 工具全部以此模型表达；注册模型是路由/分发/schema 派生/help 派生的**唯一数据源**（Q-001/Q-005，替代 §3.3 ①~④ 四处碎片面） | 一个工具的全部路由知识只存在于一处注册条目；grep 代码库不存在"注册表之外的第二处"工具元数据定义面（schema 手写数组/前缀手写映射/help 手写注册/分发手写分支均不得再承载工具名集合） | P0 |
| FR-002 | **统一分发执行契约**：web-cli-base 提供 dispatch（{tool, args} → 执行注册执行器），输出统一结果形态（成功/失败、输出文本；文档变更类工具额外携带"变更标记 + 变更后文档"能力面，场景侧决定如何应用自身状态——不绑定 React）。现 5 工具四种异构入口（executeSubcommand / OpHandlerRegistry.execute / executeWebFetch / aggregator 查询）收敛为经统一分发入口执行（Q-002/Q-003） | 5 工具的每一次执行均经过统一分发入口；不存在绕过分发的消费方直调旧入口（grep 断言）；文档变更类工具的"changed+source"语义在契约中显式表达且与现 AiPanel onApply 行为一致 | P0 |
| FR-003 | **未知工具名显式报错（去隐性兜底）**：对未注册工具名的 dispatch 返回显式错误（如「✖ 未注册工具 "x"」），**不再静默兜底按 lgdl-web-cli 执行**（现 AiPanel.tsx:164,481 的隐性默认路由删除）（Q-001 的 R-002 面，D-3 允许的行为变更） | dispatch 未注册名 → ok:false + 指明"未注册"的错误文案；工具名不落入任何执行器；toolCallToCommand 的 default 兜底 'lgdl-web-cli' 消失；错误不中断会话（AI 可读反馈后自我纠正） | P0 |
| FR-004 | **注册表自举查询**：注册表可列出/查询自身工具集合（list / 按名查询 / 派生 schema 数组 / 派生 help 一览与详情 / 派生文本前缀）——支撑 web-cli-help 工具发现、LLM schema 供给、场景渲染与测试断言（Q-001 的"base 自举自身工具目录"） | 不注册任何消费方代码，仅凭注册表即可回答"有哪些工具/某工具 schema/某工具帮助/某工具前缀"；输出与注册条目一致 | P0 |
| FR-005 | **schema 派生顺序契约**：派生 schema 数组的输出顺序 = 注册顺序，且**业务工具注册在前、base 内建自动注册追加置末**（保留现 buildTools 顺序契约与 tool_choice 优先序观察，provider.ts:243-246 / provider.test.ts:191 断言等价承接）（A-006） | 派生数组顺序 = [业务工具…（注册序）] + [内建工具…（固定置末）]；有专项测试断言顺序与现 provider.test.ts:191 顺序（业务 2 + 内建 3）等价 | P0 |

### 5.2 UPL — domain-neutral 复用面上收 base（D-4）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-006 | **中性 agent 循环上收 base**：把 AiPanel.tsx:383-524 中 domain-neutral 的 AI-tool-workflow 逻辑抽为 base 的 agent runner——turns 消息序列维护、轮次上限（MAX_ROUNDS）与超限处理、单 assistant 消息内多 toolCalls 逐条执行、tool 结果按 toolCallId 回填、失败聚合与中止语义、可停止。**边界（D-003）**：不含 React/AI 面板 UI、不含 LGDL 回调（onApply 编辑器写回 / onWebOp UI handler / next-actions 胶囊 / web-cli 命令块渲染）——runner 以"纯逻辑 + 事件/回调"形态暴露，场景侧驱动渲染（Q-002/Q-006/Q-011，A-004） | base 新增 runner 模块：无 react import（NFR-008）；暴露增量事件（新增 assistant 文本 / 工具执行完成（命令文本+结果）/ 失败聚合 / 轮次超限 / 停止）；lgdl-web 经 runner 驱动后消息流与现 AiPanel 等价（用户可感知行为一致，FR-024）；场景可注入 LGDL 特有处理点（next-actions 拦截、onApply/onWebOp 应用、命令块渲染） | P0 |
| FR-007 | **工具名 → 文本命令前缀派生上收**：toolCallToCommand（AiPanel.tsx:154-170）等价物下沉 base——命令文本由注册表条目的工具名 + 前缀 + args 派生，**删除 default 兜底 'lgdl-web-cli'**（与 FR-003 联动）（Q-001/B 档） | 任何已注册工具可派生其规范命令文本（含子命令与 args 引号规则）；消费方无手写前缀映射；无 lgdl-web-cli 兜底分支 | P0 |
| FR-008 | **schema 收集/组装下沉**：provider.buildTools（provider.ts:247-275 手写 5 元数组）由注册表派生替代——LLM 侧 tool schema 数组 = router 派生数组（含顺序契约 FR-005）（Q-006/Q-009/B 档） | lgdl-web 不再维护静态 buildTools 数组；chat 调用侧 schema 供给切至注册表派生；provider.test.ts:191 顺序断言改由派生顺序测试承接 | P0 |
| FR-009 | **sleep function-calling 原生接入**：sleep 作为已注册内建工具，其 function-calling 调用经统一分发路径原生执行（ms/seconds 归一、缺参友好提示为执行器自身职责），**删除 AiPanel.tsx:445-470 特判块与"文本重建→二次 parseSleepCommand"冗余间接层**（Q-004/Q-008/B 档） | sleep 工具走与其他工具相同的注册/分发路径；AiPanel 无 sleep 特判；缺参提示与现文案语义等价；clamp（10 分钟上限）行为保留 | P0 |
| FR-010 | **help 聚合注册即得**：web-cli-help 作为注册表驱动的内建工具随路由上收——一览/详情由注册表派生（注册即得），替代场景侧手写聚合注册（lgdl-web/ai/help-aggregator.ts 注册面消除）与每次调用新建聚合器（AiPanel.tsx:475 消除）（Q-006/Q-007/Q-010/B 档） | web-cli-help 执行无需消费方组装；注册新工具后一览自动包含该工具；base 的 HelpAggregator 机制如被注册表派生取代则标记废弃/迁移（D-3 允许） | P0 |
| FR-011 | **死接线收敛**：lgdl-web/src/ai/lgdl-web.ts 中"仅测试消费"的第二个 lgdlExecutor 单例 + fetch 行处理器注入 + 陈旧注释（注释称"AiPanel 经 './lgdl-web' 消费"，实际 AiPanel.tsx:5 深导出 `@lgdl/lgdl-web-cli/lgdl`）收敛——消除或显式降级为测试夹具；lgdl-web.ts 若不再有真实消费方则删除，其 fetch 行处理器职责归属按新架构明确（Q-007） | lgdl-web 源码无"两条 executor 接线"并存；无指向已删除接线的 import/注释残留；测试消费面显式声明 | P1 |
| FR-012 | **base 文案 LGDL 残留清理**：base 内置工具默认文案中性化——web-fetch schema/help 示例路径 `lgdl/web/workbench/README-CLI.md`（tools.ts:27,38、help.ts:34）换中性示例；help-aggregator 一览提示 `web-cli-help lgdl-web-cli` 残留（help-aggregator.ts:28）随 FR-010 消除或中性化（Q-012/O-006，D-006） | base 包内 grep 无 lgdl/LGDL/README-CLI 残留；lgdl-web 场景引导由 system prompt/guideDoc 自动注入承担（不依赖 base 描述里的 LGDL 路径），场景侧连带检查引导语不缺 README 提示 | P1 |

### 5.3 DLY — 全局 delay 机制（决策 D-2；O-002 闭环见 D-002）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-013 | **统一挂点**：全局 delay 机制挂在 **CommandRouter 统一分发入口**（命令执行前），跨所有已注册工具生效——含未来新注册工具自动获得；**不提供"执行器级自行等待"旁路**（防业务包各自造轮子）（Q-004，D-2 原文） | 机制代码只存在于路由层；任一已注册工具的分发均受统一间隔约束（或被 FR-016 显式免除）；无业务包内自行 setTimeout 等待的实现（grep 断言） | P0 |
| FR-014 | **最小间隔语义 + 与显式 sleep 不叠加**：delay 语义 = "命令间最小间隔"——每次分发前，若距上一命令**完成时刻**不足 delayMs 则自动等待补齐；首个分发不等待。显式 sleep 是经路由执行的普通工具，其完成时刻作为间隔起点 → sleep 长等待后自然满足间隔、**不产生双重等待**（R-003 面） | 时钟注入测试：连续两分发间隔 = max(delayMs, 执行耗时)；首个分发无等待；sleep(长) 后随后的命令不追加等待；sleep(短于 delayMs) 补齐至间隔 | P0 |
| FR-015 | **配置与默认值**：delayMs 场景级可配置（0 = 关闭）。**base 中性默认 0**（任何项目装上不被强加等待）；**lgdl-web 场景启动组装 router 时声明开启并设默认值 600ms**，上限钳制 5000ms（非法值按 EC-009 处理）。默认值以 validate 阶段 AI 实战闭环校准（本规范定初始推荐值，非冻结） | base 默认（未配置）delayMs = 0 且分发路径零额外开销（NFR-006）；lgdl-web 场景默认 600ms 生效；>5000ms 配置被钳制 | P0 |
| FR-016 | **单工具声明免除/覆盖**：工具注册条目可显式声明 delay（覆盖全局值或 0 = 该工具免除间隔）——保留统一挂点前提下，为"高频无副作用只读类"等场景提供最小必要出口（O-002 的作用域决策） | 注册条目声明 0 的工具不受全局间隔约束；未声明工具受全局约束；路由层实现免除逻辑，非执行器自行跳过 | P0 |
| FR-017 | **sleep 保留分工 + 观测性**：显式 sleep 工具**保留不退役**（bash 类比：显式等待原语；模型可声明的确定性长等待），与隐式 delay 分工（delay = 框架保证的命令间最小间隔；sleep = 模型显式控制的长等待）；delay 静默生效（不注入 tool 结果文本、不产生额外消息），提供路由级观测/时钟注入能力供测试与调试（Q-004/O-002） | sleep 工具 schema/执行/help 语义保留；delay 不改变任何工具结果文本（结果与无 delay 时一致，仅时间轴不同）；测试经时钟注入验证等待行为 | P0 |

### 5.4 REG — 注册机制收敛（O-001/O-004 闭环）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-018 | **lgdl-web-cli 整体注册为一个工具**：图内容操作工具经统一注册注入 router；其内部 lgdlDomain + createExecutor 管线作为该工具的执行器机制保留，17 子命令 / 9 增量命令 / exec 命令族语义（C 档）**零改动**；消费方不再"深导出 lgdlExecutor + else 兜底"式接入（O-001 决策 D-001，Q-003/Q-010） | lgdl-web-cli 以一个注册条目接入 router；注册后其 schema/help/分发自动派生；子命令执行行为与现 executeSubcommand 路径一致（结果文本/changed/source 语义等价） | P0 |
| FR-019 | **lgdl-web-op-cli 注册接入（OpHandlerRegistry 角色收敛）**：UI 操作工具整体注册为一个工具；**顶层 OpHandlerRegistry 的"工具级注册/分发"角色被 CommandRouter 承接**——消费方不再经 opRegistry.execute 直连分发；op-cli 包内 OP_COMMANDS / OP_SUBCOMMANDS / 子命令 handler 注入面（App.tsx 16 个 React handler）保留为该工具执行器的内部机制（场景 React 回调必须由场景提供）；next-actions 拦截语义保留为场景交互（O-004 决策 D-004，Q-005/Q-009/R-005） | router 中存在 lgdl-web-op-cli 工具条目；AiPanel 无 opRegistry 直连；App 层 16 handler 经"该工具执行器组装"注入；next-actions 交互（胶囊卡片）行为不变；OP_SUBCOMMANDS 派生 schema 经注册进入派生数组（Q-009 收敛） | P0 |
| FR-020 | **内建命令自动注册**：base 初始化 CommandRouter 时自动注册 web-fetch / sleep / web-cli-help（一次登记 → schema + 文本前缀 + 执行 + help 四得），替代现状三处手工登记（provider.buildTools 静态列 / AiPanel 特判分支 / createHelpAggregator 预注册）（Q-005/§3.3） | 新实例化 router 即含 3 个内建工具（可列可查可派发）；消费方零手工登记内建；删除三处手工登记后功能等价 | P0 |
| FR-021 | **唯一工具名集合**：全仓 5 工具名除注册条目外无第二维护处——schema/文本前缀/help/分发/顺序全部自注册表派生；新增/改名工具 = 单点变更（Q-001/Q-005/Q-009） | grep 断言：lgdl-web 无硬编码工具名分发 if/else、无手写前缀映射、无手写 schema 数组、无手写 help 注册（注册点除外）；改一个工具名仅注册条目 + 需要时场景文案联动 | P0 |

### 5.5 IN — lgdl-web 场景收敛与注入

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-022 | **lgdl-web 单一路径组装**：lgdl-web 场景持有唯一 CommandRouter 实例 = base 内建自动注册（FR-020）+ lgdl-web-cli / lgdl-web-op-cli 注册（FR-018/019）+ LGDL 特有回调注入（onApply 编辑器写回 / onWebOp 与 16 handler / next-actions 拦截 / web-cli 命令块渲染定制）；chat 的 tool schema 供给 = 该 router 派生数组（FR-008）；全局 delay 场景默认开启（FR-015）（Q-005/Q-006/Q-011） | lgdl-web 存在单一组装点（构造 router + 注入 LGDL 特有面）；provider.buildTools 手写数组与场景 help-aggregator 注册面删除；AI 会话的 schema 与分发均源自该 router 实例 | P0 |
| FR-023 | **AiPanel 分发/特判面删除**：AiPanel 的 tc.name 五分支 if/else（421-489）、toolCallToCommand 前缀映射（154-170）、sleep 特判（445-470）、web-cli-help 每次新建聚合器（471-479）全部删除，改经 runner（FR-006）+ router（FR-002）执行；LGDL 特有**渲染**保留 lgdl-web（web-cli 命令块消息 / next-actions 胶囊卡片 / tool 结果渲染 / 消息流）（Q-002/Q-006/Q-008/B 档） | AiPanel 中无工具分发/前缀/sleep/help 聚合逻辑残留；渲染面（LGDL 特有 UI）保留且行为不变 | P0 |
| FR-024 | **AI 闭环用户可感知行为等价**：重构后 lgdl-web AI 会话的**用户可感知行为**（工具执行结果文本、消息顺序、轮次/失败/超限语义、next-actions 交互、UI 操作效果）与重构前等价；D-3 允许的破坏性差异仅限**声明项**（未知工具名从静默兜底 → 显式报错 FR-003；内部接线面删除）；prompts 协议描述与 5 工具名不变（A-001），无需改写 LGDL_SYSTEM_PROMPT 的工具协议段（R-002 差异在模型容错面，经 AI 闭环验证确认可自愈） | AI 闭环行为测试/手测清单逐项通过（工具执行/消息顺序/失败与超限语义/next-actions）；验证记录中无未声明的用户可感知差异 | P0 |

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | domain-neutral 纯度 | web-cli-base **零 LGDL 依赖**：新增模块（router/注册表/delay/runner）源码零 `@lgdl/lgdl-web*` import、零 LGDL 专属文案/路径/提示；base 无业务包时**独立可用**（自足 AI-CLI：router + 3 内建可列 schema/查 help/派发 fetch/sleep/help 冒烟） | 全仓 grep base 包无 lgdl-web* import 与 Q-012 残留文案；base 独立构建 + 独立测试通过；存在"无业务包场景 base 自足"冒烟测试（注册假工具全链可见） |
| NFR-002 | 依赖方向 | 业务包 → web-cli-base 单向；lgdl-web-cli / lgdl-web-op-cli / lgdl-web 不反向依赖 base 的业务内容；base 保持零依赖或仅自身必需依赖；全仓无环 | package.json 声明 + 依赖图谱核验：无 base → 业务包边、无环；业务包间不新增依赖 |
| NFR-003 | 破坏性重构边界（D-3） | 允许破坏内部接线与旧行为（内测无历史债）；但破坏性差异需**声明且可审计**：删除面（旧接线符号/兜底/特判）在 lgdl-web 源码无残留引用；用户可感知闭环行为等价或按 FR-024 声明项改进 | grep 断言旧接线（opRegistry 直连 / toolCallToCommand 兜底 / sleep 特判 / buildTools 手写数组 / 场景 help 注册）在 lgdl-web 源码零残留；行为差异清单 = FR-003 等声明项 |
| NFR-004 | 单一数据源 | 任一工具的 schema / 文本前缀 / 执行器 / help / 顺序**五元信息**不得在注册表之外出现第二维护处；工具增删改 = 注册条目单点变更 | 变更冒烟测试：新增一个假工具仅注册一处 → schema 派生/help 一览/分发/前缀四链自动可见（AC-003 承载） |
| NFR-005 | 测试门禁（O-005） | D-3 下**放弃 V2「只增不删」守恒**：允许删除/改写被重构替代的测试（如 AiPanel 分发用例改 router dispatch 用例、provider.test.ts:191 顺序断言改写派生顺序断言）；门禁 = 行为级等价或更优覆盖 + 全仓测试全绿（等价/更优，非用例数守恒）（D-005） | 全仓 9 包测试命令全绿；新机制专项测试存在（router dispatch / 未注册名 / delay / 注册顺序 / 内建自动注册 / help 派生 / runner）；测试改写有依据记录 |
| NFR-006 | 性能 | dispatch 为同步内存查找（无 I/O，delay 除外）；base 默认 delayMs=0 时路径零额外开销；schema/help 派生结果幂等（同一注册表多次派生一致） | 无 delay 配置时分发无额外等待；派生函数幂等（重复调用输出一致） |
| NFR-007 | 类型与构建完整性 | 全仓 TypeScript 构建零错误；base 类型导出面完整覆盖 router / 注册表 / delay / agent runner，可被 lgdl-web-cli / lgdl-web-op-cli / lgdl-web 正常消费 | 各包 build（或全仓等价命令）零错误退出；base index 导出面含新能力类型 |
| NFR-008 | runner 环境无关 | base 新增 agent runner 模块**不依赖 React**（纯 TS 逻辑 + 事件/回调形态），可被非 React 场景复用（呼应 bash 类比 / F-14 浏览器场景） | base 包内新增模块源码无 react import；runner 单测在纯 node 环境通过 |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | 未知/未注册工具名 dispatch（原静默兜底面，R-002） | 返回 ok:false + 显式「✖ 未注册工具 "x"」类文案（FR-003）；错误作为 tool 结果回填给 AI，会话不中断、轮次继续；与旧"静默按 lgdl-web-cli 执行"的行为差异在 validate AI 闭环确认模型可自愈 |
| EC-002 | 已注册工具，但子命令/参数非法（执行器级错误） | 由工具执行器返回 ok:false + 描述性错误（各工具现有错误文案风格保持）；router 不做业务级校验猜测；错误正常回填 AI |
| EC-003 | 重复注册同名工具 | 注册表拒绝并抛错（防静默覆盖）；场景单 router 单实例；测试各自新建实例避免冲突 |
| EC-004 | 空工具集合（全新场景仅实例化 router 未注册业务工具） | 派生 schema = 内建集合（或空）；任意业务名 dispatch → EC-001 未注册报错；web-cli-help 一览只含内建；chat 无业务工具直答——场景自足语义不破 |
| EC-005 | delay 与显式 sleep 组合（R-003 双重等待面） | 不叠加：显式 sleep 是普通工具，间隔起点 = sleep 完成时刻；AI sleep(3000) 且 delayMs=600 → 总等待 3000 不追加；sleep(200) → 补齐至 600 |
| EC-006 | 单 assistant 消息携带多个 toolCalls（混合工具） | runner 逐条分发（FR-006）；命令间最小间隔生效（FR-014）；全部结果按序回填同一轮 turns（toolCallId 关联）；单条失败不吞掉后续调用 |
| EC-007 | 工具执行失败（ok:false） | 结果文本回填 AI + 失败聚合标记；对齐现 AiPanel 行为（失败提示后下一轮由 AI 自我修正）；不因单工具失败中断会话 |
| EC-008 | 轮次达上限（MAX_ROUNDS） | runner 输出超限消息并停止（现 AiPanel 语义保留）；场景设置可调上限不变 |
| EC-009 | delayMs 场景配置非法（负数 / 超上限） | 钳制到合法域（0 ≤ v ≤ 5000）并记录一次警告（或拒绝加载用默认值，二选一由 plan 定，行为可测）；不静默产生意外长等待 |
| EC-010 | web-cli-help 查询未注册/未知工具名 | 现友好文案保留（「✖ 未知工具 "x"（web-cli-help 列出全部可用工具）」）；经注册表查询实现，语义不变 |
| EC-011 | sleep 缺参 / 超 clamp | 缺参友好提示与现文案等价（sleep --ms <毫秒> 或 --seconds <秒>）；10 分钟上限 clamp 保留（sleep.ts:46）——执行器自身职责，不依赖消费方特判 |
| EC-012 | 工具执行器抛出异常（非返回 ok:false） | router/runner 捕获转 ok:false + 稳定错误文案（防单工具崩溃炸整个 agent 循环）；异常明细进调试/日志面，不进 AI 结果文本（避免噪声） |

## 8. 验收标准（总体验收清单）
> 可验证的总体验收清单（路由正确性 / delay 生效 / base 独立可用 / lgdl-web 收敛 / 测试基线 / 中性化）

| # | 验收项 | 验证方式 | 关联 |
|----|--------|---------|------|
| AC-001 | **base 独立可用**：无业务包环境下 web-cli-base 自足（router + 3 内建自动注册）——可列 schema、查 help、派发 fetch/sleep/help 冒烟通过；base 包零 LGDL 依赖与文案残留 | base 独立构建+独立测试全绿；无业务包注册场景的冒烟/单测通过；grep base 源码无 '@lgdl/lgdl-web*'、无 README-CLI/lgdl 文案残留 | FR-020, NFR-001, FR-012 |
| AC-002 | **路由正确性**：5 工具经统一 dispatch 的结果映射与现 AiPanel 分支等价——op→handler（含 next-actions 场景拦截）、fetch→executeWebFetch、sleep→归一+执行+缺参提示、help→一览/详情、cli→子命令执行+changed/onApply 语义 | 行为测试逐路断言（结果文本/失败语义/文档变更标记）；与重构前路径输出对比 | FR-002/018/019, FR-024 |
| AC-003 | **单一数据源冒烟**：注册一个假工具仅一处注册 → schema 派生、help 一览、dispatch、前缀派生四链自动可见；lgdl-web 无第二维护面 | 冒烟测试 + grep 断言（无 buildTools 手写数组、无分发 if/else、无前缀手写映射、无场景 help 手写注册） | FR-001/004/021, NFR-004 |
| AC-004 | **未注册名显式报错**：旧静默兜底（toolCallToCommand default + dispatch else）删除；未知工具名 → ok:false + 显式未注册文案；会话不中断 | 专项测试（dispatch 未知名/前缀派生未知名两路）；grep 无兜底残留 | FR-003/007, EC-001 |
| AC-005 | **delay 生效**：时钟注入测试证明——命令间最小间隔补齐、首命令不等待、显式 sleep 长等待不叠加；lgdl-web 场景默认 600ms、上限 5000ms 钳制、base 默认 0 | fake timer / 时钟注入专项测试；场景配置生效测试 | FR-013~017, EC-005/009 |
| AC-006 | **schema 顺序契约**：派生数组 = [业务工具（注册序）] + [内建工具（置末）]；与旧 provider.test.ts:191 顺序（lgdl-web-cli / lgdl-web-op-cli / web-fetch / sleep / web-cli-help）等价 | 派生顺序专项断言（顺序规则测试承接旧断言改写） | FR-005/008, NFR-005 |
| AC-007 | **lgdl-web 收敛**：AiPanel 分发/前缀/sleep/help 聚合面删除（FR-023）；场景单一路径组装（FR-022）；lgdl-web.ts 死接线收敛（FR-011） | grep AiPanel/App/lgdl-web.ts 无上述逻辑残留；组装点单一可指认 | FR-022/023/011, NFR-003 |
| AC-008 | **AI 闭环行为等价**：LGDL AI 会话核心路径（chat 文本→markdown / 工具调用执行 / 轮次·失败·超限语义 / next-actions 交互 / UI 操作）与重构前用户可感知等价；无未声明差异 | 行为测试 + validate 阶段人工 AI 实战闭环清单（现四条路径 + next-actions/op 路径） | FR-024, NFR-003, EC-006~008 |
| AC-009 | **测试基线**：全仓 9 包测试全绿；新机制专项覆盖齐全；被重构替代的旧用例改写/删除有依据（放弃只增不删守恒，等价/更优覆盖） | 全仓测试命令全绿；专项测试清单存在；改写记录可审计 | NFR-005, O-005(D-005) |
| AC-010 | **依赖方向与构建**：全仓 tsc 零错误；依赖图无环、无 base→业务 反向边；base 类型导出面完整 | 构建命令零错误；package.json/依赖图谱核验；base index 导出面清单 | NFR-002/007 |
| AC-011 | **runner 中性**：base agent runner 无 react import；场景侧驱动 runner 的消息流渲染与原 AiPanel 等价 | grep base 无 react import；runner 纯 node 单测通过；lgdl-web 渲染行为对比 | FR-006, NFR-008, O-003(D-003) |
| AC-012 | **中性纯度收尾**：Q-012 残留清单逐项清零（base 内）；lgdl-web 场景引导不因清理缺失 README 提示（guideDoc/system prompt 承担） | grep base 文案清单逐项核验；lgdl-web AI 实战中"使用指南"能力不回归 | FR-012, Q-012(O-006) |

## 9. 开放问题与设计决策
> 待决策事项和需要进一步调研的内容；O-001~O-006 为 discovery §6.3 开放点——依据用户红线（D-2/D-3/D-4）自主决策闭环，记录为 D-001~D-006（理由充分，供 plan 细化；如需推翻须作者确认）

| # | 开放点（discovery） | 状态 |
|---|--------------------|:--:|
| 1 | O-001 CommandRouter 与 createExecutor(DomainApi) 的关系 | ✅ 已决策（D-001） |
| 2 | O-002 全局 delay 语义（挂点时点/默认值/作用域/与 sleep 叠加/反馈） | ✅ 已决策（D-002） |
| 3 | O-003 范围线：agent 循环是否上收 base | ✅ 已决策（D-003） |
| 4 | O-004 op-cli 机制去留（OpHandlerRegistry 并入统一注册？） | ✅ 已决策（D-004） |
| 5 | O-005 测试策略（D-3 下是否仍测试守恒） | ✅ 已决策（D-005） |
| 6 | O-006 Q-012 文案残留清理归属与场景引导方式 | ✅ 已决策（D-006） |

### D-001（O-001）：CommandRouter = 顶层工具级路由；createExecutor 保留为工具内部执行器机制，不做全泛化

**决策**：CommandRouter 是唯一顶层路由（工具级：按工具名 → 该工具执行器），lgdl-web 现 5 工具全部作为"工具"注册。createExecutor(DomainApi) 管线**保留在 base**（A 档中性机制），作为 **lgdl-web-cli 注册工具的内部执行器**被使用（FR-018）；其内部子命令族硬编码分发（exec.ts:145-257）属 lgdl-web-cli 的 LGDL 文档领域内容（C 档）——**不在本 Feature 泛化重构**。Q-010 的 help 依赖：工具级 help 入口随注册条目提供（webCliHelp 作为 lgdl-web-cli 工具的 help 渲染入口），顶层 web-cli-help 由注册表派生（FR-010），不再依赖消费方手写聚合注册。

**理由**：(1) bash 类比下 createExecutor 对应"某命令自己的实现方式"，shell（router）不关心命令内部结构——工具级注册使 exec 内部语义自然封装；(2) D-4 说"非 LGDL 特有归 base"，exec 管线的**机制**（A 档）已在 base，其**内容**（命令族/语法）是 LGDL 特有应留业务包；(3) 全泛化 DomainApi 是重写型改动（R-004 两套半路由风险），收益低于风险；(4) 破坏性只发生在"分发面"（AiPanel 接线），领域执行路径不动，行为等价可验证。

### D-002（O-002）：全局 delay = 路由层"命令间最小间隔"，默认值分级，与显式 sleep 不叠加

**决策**：delay **挂 CommandRouter 统一分发入口**（D-2 原文；FR-013），语义 = **命令间最小间隔**（FR-014）：每次分发前若距上一命令**完成时刻** < delayMs 则自动补齐，首个分发不等待。**不区分读/写/UI 类**（"读紧跟写"正是需要间隔的场景；读/写分类需工具内子命令级判定，属领域内容、会让机制碎片化）——以"单工具声明免除"（FR-016）作为最小必要出口。默认值：base 中性默认 **0（关闭）**；lgdl-web 场景默认 **600ms**、上限钳制 **5000ms**（FR-015；初始推荐值，validate 实战校准）。与显式 sleep：**不叠加**——sleep 是普通工具，间隔起点 = sleep 完成时刻，长 sleep 后自然满足间隔；sleep 保留不退役（显式长等待语义，FR-017）。delay 静默生效，不注入 tool 结果文本；观测/时钟注入供测试。

**理由**：(1) 挂路由入口使未来新注册工具自动获得间隔（D-4/bash 一致），执行器级会退化为业务包造轮子（discovery §3.4 落点分歧）；(2) "最小间隔"天然规避 R-003 双重等待，无需去重逻辑；(3) 不分类避免把领域知识（哪个子命令是写）吸进中性层；(4) base 默认 0 保证"装即不被强加等待"的中性承诺（任何项目装上行为可预期），lgdl-web 场景按需开启；(5) delay 静默避免污染 AI 上下文（等待是框架时序责任，不是需要 AI 决策的信息）。

### D-003（O-003）：agent 循环**上收 base**（本 Feature 内），边界 = "中性 AI-tool-workflow"不含 React/UI 面

**决策**：上收（FR-006，贯彻 D-4 + 作者倾向）。上收内容 = AiPanel.tsx:383-524 中 domain-neutral 逻辑：turns 序列维护 / MAX_ROUNDS 轮次上限与超限处理 / 单消息多 toolCalls 逐条执行 / tool 结果按 toolCallId 回填 / 失败聚合与中止 / 可停止。**边界（明确不上收）**：React 消息渲染（web-cli 命令块 / next-actions 胶囊卡片 / tool 结果渲染）、LGDL 回调（onApply 编辑器写回与 source 状态 / onWebOp 与 16 UI handler / next-actions 拦截交互）、场景内容（PRESET/PROMPTS/guideDoc 注入内容）、pending/设置等 UI 状态。runner 以**纯逻辑 + 事件/回调**形态存在（无 react import，NFR-008），场景侧驱动并渲染（FR-023）；场景特有处理（next-actions 拦截、命令块渲染）经 runner 暴露的注入/事件点接入。

**理由**：(1) D-4 红线：agent 循环 turns/工具循环/反馈重试是任何 AI-CLI 都需要的 AI-tool-workflow，非 LGDL 特有；(2) 作者明确"倾向 上收"且无历史债（D-3），是消除 Q-006 的最佳窗口；(3) R-001 范围蔓延风险由边界控制——**不上收渲染与 LGDL 回调本身**，lgdl-web 保留 React 壳与 LGDL 特有交互；(4) A-004 假设经"抽取 + lgdl-web 行为等价验证（FR-024/AC-008）"闭环证实。

### D-004（O-004）：OpHandlerRegistry 顶层角色被 CommandRouter 承接；op-cli 整体注册为一个工具

**决策**：lgdl-web-op-cli **整体注册为一个工具**进 CommandRouter（FR-019）。OpHandlerRegistry 不再作为"工具级注册/分发面"暴露给消费方（AiPanel 不再直连 opRegistry.execute）；其子命令级 handler 注入机制收敛为 **lgdl-web-op-cli 工具执行器的内部实现**——App.tsx 16 个 React handler 仍是场景必须提供的 UI 回调，注入目标 = 该工具执行器组装（FR-022），而非并行的独立注册面。next-actions 拦截保留为场景交互（AiPanel 特有 UI，经 runner 注入点接入，D-003 边界）。OP_COMMANDS/OP_SUBCOMMANDS 元数据与 enum 派生 schema 是 op-cli 内容（C 档），经注册条目进入统一 schema 派生（Q-009 收敛）；op-cli 包 API 面变化按 D-3（完全不兼容）接受，记入迁移面。

**理由**：(1) O-004 问题本质是"两种工具级分发机制并存"（§3.3 ② vs CommandRouter）；D-3 无历史债下直接收敛，避免两套半路由长期并存（R-005 在可接受面）；(2) UI handler 的 **React 内容**（C 档）不因注册收敛而移动——只移动"注册/分发"机制（中性面），符合 D-4 归属；(3) OP_SUBCOMMANDS schema 静态枚举在注册模型下失去第二维护面价值，派生收敛（Q-009）。

### D-005（O-005）：D-3 下放弃"只增不删"测试守恒，门禁改为"行为级等价/更优覆盖 + 全仓全绿"

**决策**：本 Feature **不沿用 V2「测试只增不删、用例数守恒」规则**（A-005 请求作者确认项，作者 D-3 完全不兼容已隐含豁免）：允许删除/改写被重构取代的测试（如 AiPanel 分发/特判相关用例 → router dispatch 专项；provider.test.ts:191 顺序断言 → 派生顺序规则断言；场景 help-aggregator 注册用例 → 注册表派生用例）。门禁（NFR-005/AC-009）：①全仓 9 包测试命令全绿；②新机制（router/注册表/delay/runner/help 派生/内建自动注册）专项测试覆盖；③行为级等价由 lgdl-web AI 闭环测试 + validate 手测（AC-008）承接；④改写/删除有依据记录可审计。

**理由**：(1) 重构面大（删除整个分发接线层），守恒成本高且保留的旧用例变成"测试死代码"（断言已删除路径）；(2) D-3 的核心含义即"不保旧行为"，守恒规则的前提（旧行为必须持续受测）消失；(3) 门禁重心从"数量守恒"转向"等价覆盖 + 专项覆盖"，更符合重构验证目的。

### D-006（O-006）：base 文案中性化随本 Feature 收尾；场景引导由 system prompt/guideDoc 承担，不引入"描述覆盖"注册面

**决策**：Q-012 残留（web-fetch schema/help 的 `lgdl/web/workbench/README-CLI.md` 示例、help-aggregator 的 `lgdl-web-cli` tip）**在本 Feature 内清理**（FR-012，中性示例替换）。lgdl-web 场景引导的连带影响：AI 获取 README-CLI 指南依赖 system prompt 自动注入的 guideDoc（AiPanel.tsx:391-395 已实现"战略层知识随 system 提供"）——清理 base 描述内的 LGDL 路径不破坏该能力；场景侧仅需核验引导语仍提示指南可用。**不引入**"工具描述覆盖/自定义示例"新注册面（NG-005，YAGNI：避免为单一场景在注册模型上叠加第二个定制面）。

**理由**：(1) base 中性纯度是"装即自足"观感的一部分（discovery §3.5 残留观察）；(2) guideDoc 系统注入已事实替代"AI 用 web-fetch 取 README"路径，base 示例路径是冗余残留（discovery R-006 风险实测为低）；(3) 若未来场景确需工具描述级定制，作为独立需求评估，不混入本 Feature。

### 后置开放（非阻塞，移交 plan/validate 或后续 Feature）

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | delay 默认值 600ms / 上限 5000ms 的最终调参——依赖 AI 实战闭环时序统计（A-003 验证） | 待调研（validate 阶段校准；spec 定初始推荐值） |
| 2 | lgdl-web-op-cli 子命令 handler 分发表的具体内聚形态（工具执行器内部实现） | 移交 plan（spec 已定机制归属，D-004） |
| 3 | lgdl-web-cli 文本协议路径（executeCommands/describeCommandLine，现仅测试消费）在新架构的归属核验 | 移交 plan（倾向 lgdl-web-cli 工具内部保留；Q-007 连带核验） |
| 4 | provider 应用态（多厂商 PROVIDERS + localStorage）是否上收 base 为通用 settings 骨架 | ✅ 已决策留 lgdl-web（NG-004；后置 Feature 候选，非本 Feature 承诺） |
| 5 | F-14/v1.1 关联（A-002）：本 Feature 统一注册模型作为协议发现机制的雏形 | ✅ 已标注关联不承诺（NG-008） |

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 discovery.md v1.0（Q-001~Q-012 / A-B-C 三档 / R-001~R-006 / O-001~O-006）+ 用户 4 决策（D-1~D-4）编写需求规范；定义 24 FR（RTR 5 / UPL 7 / DLY 5 / REG 4 / IN 3）/ 8 NFR / 12 EC / 12 验收项；O-001~O-006 自主决策闭环（D-001~D-006）；后置开放项移交 plan/validate | 2026-09-05 | SDDU Spec Agent |
