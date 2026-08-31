# Feature Specification：specs-tree-web-cli-v2（web-cli V2 抽取与包体系重构）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md（现状基线 / 抽取面边界 A1-A10·B1-B8·C1-C6 / 风险 R1-R9 / 约束 C1-C7 / 3 项 spec 确认点）+ F-13 ① spec（specs-tree-web-cli-extract，已完成）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 作者决策已闭环（4 项裁决 + 任务书 5 组需求），零访谈；discovery §7 遗留 3 项 spec 确认点（A-001/A-003/A-004）自主决策记录已写入 §9（D-001~D-003）

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | F-13 ②（web-cli V2 收敛部分；开源细节属 v1.1 范畴，不在本 Feature，见 NG-002） |
| 名称 | web-cli V2 抽取与包体系重构 |
| 优先级 | P0（作者指令 2026-08-31） |
| 目标版本 | 承接 F-13 ①（v0.6 收口期）完成后执行；具体版本窗口待 ROADMAP 排布（本 Feature 不自行绑定版本） |

## 2. 上下文
> 回顾问题背景和目标用户

### 2.1 要解决的问题

F-13 ① 已把 web-cli 底座从 core/web 抽为独立包 `@lgdl/web-cli-base`（transitional dual-surface export，ADR-003，index.ts 头注释自述 "to be converged at F-13 ②"）。V2 即该收敛点，discovery 只读盘点确认四类遗留问题（discovery §1）：

| 核心问题 | 现状证据（discovery §2） | 业务影响 |
|---------|------------------------|---------|
| **web-cli-base 框架与 LGDL 业务耦合** | 9 个 LGDL 增量命令（commands.ts:28-92）、LgdlOperation 协议（operations.ts/protocol.ts）、WEB_CLI_TOOL（tools.ts:12-54）、lgdl-web-cli 前缀解析（protocol.ts:44-52）、19 个领域符号注入面（exec.ts:40-65）混在框架包内 | 框架无法承载第二个领域场景；每加一个领域命令都在污染框架核心 |
| **包命名不对称** | 6 包（core/layout/render/router/cli/web）目录无 lgdl 前缀，与新包 lgdl-* 命名体系不一致 | 包身份识别混乱；@lgdl/web-cli-base 与 @lgdl/lgdl-web-cli 命名极易混淆 |
| **LGDL 业务分布散落** | LGDL 业务跨 3 包散落（web-cli-base commands/operations/protocol/help/tools/adapters + web WEB_OP_TOOL/next-actions/web-fetch + cli 9 命令调用） | "谁的业务归谁"无法落实；修改 LGDL 业务需横跨 3 包排查 |
| **web-fetch 平台能力滞留应用层** | lgdl-web-fetch 工具/解析/help 全留 web（provider.ts:261-289、web-fetch.ts:19-44、help.ts:126-137） | 平台级能力未纳入框架，其他领域场景无法复用 |

### 2.2 作者已裁决项（决策闭环记录，来源 state.json notes，本阶段不重新讨论）

| # | 裁决 | 含义 |
|---|------|------|
| ① | base 不依赖 lgdl-core，相关类型迁 lgdl-web-cli | web-cli-base 纯化为零 lgdl 依赖的公共框架（类似 Spring，保持中性名） |
| ② | op-cli 业务合理即独立，不管薄厚 | @lgdl/lgdl-web-op-cli 独立成包，UI 操作元数据归它 |
| ③ | web-fetch 归 web-cli-base 通用化 | lgdl-web-fetch 中性化改名 web-fetch 纳入 base 通用工具 |
| ④ | 谁的业务归谁，lgdl 命令归 lgdl-web-cli | 9 个增量命令/协议/help 归 @lgdl/lgdl-web-cli |

### 2.3 目标用户

| 用户角色 | 场景 | 诉求 |
|---------|------|------|
| LGDL 作者/维护者 | V2 收敛 F-13 ① 遗留的双面导出，完成包体系重构 | 重构零回归；框架与业务边界最终收敛 |
| 下游框架使用者（潜在第二领域适配者） | 复用「AI 可调用命令执行框架」 | base 完全中性（零 lgdl 依赖、泛型化契约），可承载任意领域 |
| AI 实战链路（web workbench AiPanel 调用方） | 重构期间持续使用 AI 面板 | 三工具（lgdl-web-cli / lgdl-web-op-cli / web-fetch）行为不变 |

### 2.4 与现有功能的关系

- **上游**：F-13 ①（specs-tree-web-cli-extract）已完成——web-cli-base 已存在，本 V2 是其收敛点（§2.1）；
- **命名对齐**：F-13 ① 的 D-011 曾决策 WEB_OP_TOOL/WEB_FETCH_TOOL 留 web——V2 作者裁决③④推翻该归属，WEB_OP_TOOL 迁 lgdl-web-op-cli、WEB_FETCH_TOOL 归 base（本 spec §5 FR-014/FR-022）；
- **不变接口**：工具/命令对 AI 与用户可见的协议文本前缀（`lgdl-web-cli`/`lgdl-web-op-cli`）与 bin 名 `lgdl-cli` 不随包名变化（A-002，见 FR-004）；
- **下游**：@sddu-plan（依赖本 spec.md 完成技术规划）。

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)
> 明确本次要达成的业务目标

| # | 目标描述 |
|---|---------|
| G-001 | **6 包重命名加 lgdl 前缀**：core/layout/render/router/cli/web → lgdl-*（目录 + package.json name + 全部跨包 import + lock + CI + tsconfig + 测试脚本引用同步），web-cli-base 保持中性名不动（discovery A1-A10） |
| G-002 | **新包 @lgdl/lgdl-web-cli 落位**：9 个增量命令 + LgdlOperation 协议 + WEB_CLI_TOOL + lgdl 前缀协议解析 + help 示例 + 全部依赖 lgdl-core 的类型 + adapters 组装单点，自 web-cli-base 迁出（discovery B 面） |
| G-003 | **新包 @lgdl/lgdl-web-op-cli 落位**：WEB_OP_TOOL + UI 操作命令元数据（WEB_OP_ENTRIES/webOpHelp）+ op 协议（子命令枚举/参数 schema 单一数据源）+ next-actions，自 web 迁出；执行 handler 由 web 注入（discovery C 面 op 部分） |
| G-004 | **web-cli-base 纯化**：DomainApi 泛型化 DomainApi<Op,Doc>、去除 lgdl-core 依赖、注册表机制保留但不含具体命令、86 处 lgdl 硬编码参数化/随迁、web-fetch 通用工具纳入（lgdl-web-fetch 中性化改名 web-fetch）（discovery §3.2-8 / §3.3-5） |
| G-005 | **web 包调整**：三工具分发（provider chat() 工具组装 + AiPanel 分发）+ op/fetch 执行 handler 注入（discovery §3.3-6） |
| G-006 | **零回归闭环**：测试守恒（V2 后分布 ≥ 388 基线，预估 407-435）、全仓构建通过、协议文本/bin 名不变（discovery §4） |

### 3.2 非目标 (Non-Goals)
> 明确本次不涉及的范围，防止需求蔓延

| # | 明确不做 |
|---|---------|
| NG-001 | 不新增任何业务功能：不新增命令/工具/行为/输出（C1）——纯重构与抽取 |
| NG-002 | 不做开源决策：许可/命名/仓库/发布管道属 v1.1 范畴，决策待定（C5） |
| NG-003 | 不改语言核心语义：lgdl-core 等语言核心包仅改名不动语义（C2）；LgdlOperation/LgdlDocument 等类型定义与语义零改动（类型引用路径可迁移） |
| NG-004 | 不新增 op 文本命令解析能力（R9 范围界定）：lgdl-web-op-cli 现状无独立文本协议解析器（web 侧只有工具定义 + help 元数据 + AiPanel 结构化分发），op 协议 = 元数据契约（子命令枚举/参数 schema），抽取不新增能力（见 FR-017） |
| NG-005 | 不修复既有缺陷：W-D1（provider.ts:326 OpenAI 端点缺 WEB_FETCH_TOOL 的现场保留）只保持现状不修复；不引入新功能面 |
| NG-006 | 不修订历史调研文档：docs/research/edge-routing/* 的 @lgdl/router 引用（A9）属纯历史文档，可留不改（以标注为准，见 FR-005） |
| NG-007 | 不改协议文本格式：工具名/命令前缀 `lgdl-web-cli`、`lgdl-web-op-cli` 与 bin `lgdl-cli` 不随包名变化（A-002）；唯一改名例外 = web-fetch 中性化（`lgdl-web-fetch` → `web-fetch`，作者裁决③） |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | LGDL 作者/维护者 | 6 个现有包加 lgdl 前缀、两个新业务包 lgdl-web-cli/lgdl-web-op-cli 落位 | 包身份清晰，@lgdl/web-cli-base 与 @lgdl/lgdl-web-cli 不再混淆 |
| US-002 | 框架使用者（潜在第二领域适配者） | web-cli-base 纯化为零 lgdl 依赖、泛型化契约（DomainApi<Op,Doc>）的中性框架 | 在非 LGDL 领域复用命令注册/执行/tools/help 机制 |
| US-003 | LGDL 业务维护者 | LGDL 业务（命令/协议/tools/help/组装）收敛于 lgdl-web-cli，UI 操作元数据收敛于 lgdl-web-op-cli | 改 LGDL 业务只动归属包，无需横跨 3 包排查 |
| US-004 | AI 实战链路调用方（AiPanel） | 三工具（lgdl-web-cli / lgdl-web-op-cli / web-fetch）重构期间行为不变 | AI 闭环不回归（聊天/命令执行/UI 操作/fetch 四路径） |
| US-005 | 平台能力复用方 | web-fetch 作为中性通用工具（改名 web-fetch）纳入框架 | 其他领域场景复用平台 fetch 能力 |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；按任务书五组组织：组1 重命名 6 包（REN）/ 组2 抽取 lgdl-web-cli（CLI）/ 组3 抽取 lgdl-web-op-cli（OPC）/ 组4 base 纯化（BAS）/ 组5 web 调整（WEB）。需求描述引用 discovery 边界编号（A#/B#/C#）可追溯。

### 组 1：6 包重命名加 lgdl 前缀（对应 discovery §3.1 A1-A10）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **目录与包名重命名（A1/A2）**：packages/{core,layout,render,router,cli,web} 目录重命名为 packages/lgdl-{core,layout,render,router,cli,web}；各包 package.json name `@lgdl/x` → `@lgdl/lgdl-x`（scoped 形式，D-001 已确认）；web-cli-base 目录与 name `@lgdl/web-cli-base` 均不动 | `ls packages/` 见 9 个目录（6 改名 + web-cli-base + 2 新包）；6 包 package.json name 为 `@lgdl/lgdl-*`；web-cli-base name 仍为 `@lgdl/web-cli-base` | P0 |
| FR-002 | **跨包 import 改源（A3）**：discovery §2.1 跨包 import 全量表（layout/render/cli/web/web-cli-base 消费 `@lgdl/core` 等 ~30 处 import）全部更新为新包名 | `grep -rn "from '@lgdl/core'\|from '@lgdl/layout'\|from '@lgdl/render'\|from '@lgdl/router'\|from '@lgdl/cli'\|from '@lgdl/web'"` 在 packages/*/src 无残留（`@lgdl/web-cli-base` 除外） | P0 |
| FR-003 | **根与构建链引用同步（A4/A5/A6/A7/A8）**：根 package.json dependencies `@lgdl/cli` → `@lgdl/lgdl-cli`（A4）；package-lock.json 重建（A5，7 workspace 条目 → 9 条）；CI deploy-pages.yml build workspace 名（:38）与触发 paths（:9-13）改新名（A6）；web/package.json predev workspace 引用（:29-31）与 test 脚本文件列表（:24-26）改新名（A7）；根 tsconfig references（:3-7）改新路径（A8） | 根/CI/web 配置文件 grep 无旧 workspace 名；`npm install` 后 package-lock.json 含 9 个 workspace 条目且 node_modules/@lgdl/ 链接指向新目录；CI 文件 build 步骤引用新 workspace 名 | P0 |
| FR-004 | **bin 名与协议文本前缀不变（A10 + A-002）**：cli bin `lgdl-cli` 保持不变；协议文本前缀 `lgdl-web-cli`/`lgdl-web-op-cli` 不随包名变化（`lgdl-web-fetch` 按作者裁决③改名 web-fetch 为唯一例外） | cli/package.json bin 仍为 lgdl-cli；协议前缀字符串在 lgdl-web-cli/lgdl-web-op-cli 包内保持原值 | P0 |
| FR-005 | **文档面同步（A9，P2）**：README.md:45-52、docs/cli-guide.md:7-10 的 `@lgdl/cli` 引用改新名；docs/research/edge-routing/* 的 `@lgdl/router` 引用（11 处）为纯历史调研文档，可在文件头加注「历史文档，包名已更名为 @lgdl/lgdl-router」或整体不处理（NG-006），二选一由 plan 阶段按一致性成本决策 | 非 research 文档 grep 无旧包名残留；research 文档按上述二选一落地 | P2 |

### 组 2：抽取 @lgdl/lgdl-web-cli（对应 discovery §3.2 B 面）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-006 | **新包骨架（B1）**：packages/lgdl-web-cli 新建，含 package.json（name `@lgdl/lgdl-web-cli`，dependencies 含 `@lgdl/lgdl-core`，type:module/main/types/exports）、tsconfig、src 入口；根 workspace 纳入 | packages/lgdl-web-cli/ 存在且字段完整；包级 build 通过；workspace 解析正常 | P0 |
| FR-007 | **9 命令注册表迁入（B2）**：自 web-cli-base commands.ts 迁入 LGDL 面——COMMANDS 9 命令注册表（:28-92，add/remove/update × node/edge/group）、KNOWN_PARAMS（:95-100）、buildOperation（:139-236）、requireParams（:103）、assertChangeRequested（:112）、parseAttrsSpec（:242）、parseMemberSpec（:266）、defaultKindFor（:126-130）；import 源 `@lgdl/core` → `@lgdl/lgdl-core` | lgdl-web-cli 导出上述全部符号；随迁 commands.test.ts 14 例在 lgdl-web-cli 全绿；对同一输入 buildOperation 输出 op 与迁移前逐字段一致 | P0 |
| FR-008 | **LgdlOperation 协议迁入（B3）**：自 web-cli-base operations.ts 迁入全量——describeOperation（:35-56）、OperationMutations（:59-69，9 mutation 签名 + LgdlDocument/AddNodeOptions 等 LGDL 类型）、分派 switch 9 op 变体（:92-154）、LgdlOperation re-export（:32）、OperationBatchResult（:71-80，机制面按 plan 细化归属）；import 源 `@lgdl/core` → `@lgdl/lgdl-core` | lgdl-web-cli 导出上述符号；随迁 operations.test.ts 9 例全绿；LgdlOperation 判别联合与 9 变体协议形状零改动（NG-003） | P0 |
| FR-009 | **lgdl-web-cli 工具迁入（B4）**：自 web-cli-base tools.ts 迁入 WEB_CLI_TOOL 全量（:12-54：name `lgdl-web-cli`、19 子命令 enum） | lgdl-web-cli 导出 WEB_CLI_TOOL；工具 name/description/parameters 与迁移前逐字节一致（NFR-002） | P0 |
| FR-010 | **协议解析迁入（B5）**：自 web-cli-base protocol.ts 迁入 LGDL 面——'lgdl-web-cli' 前缀校验（:44-52）、17 子命令枚举 switch（:85-153）、--doc 语义（:70-82）、parseWebCliCommand/parseWebCliBatch 的 LGDL 路由面；**tokenizeCli（:160）/parseArgs（:184）为通用语法解析（无领域引用），留 base**（D-004 补充决策） | lgdl-web-cli 导出解析路由；随迁 protocol.test.ts 27 例中 LGDL 面用例全绿；解析结果与迁移前逐字节一致；tokenizeCli/parseArgs 仍在 base 导出 | P0 |
| FR-011 | **help 示例迁入（B6）**：自 web-cli-base help.ts 迁入 LGDL 面——PARAM_DESC（:34-54）、WEB_CLI_EXTRA（:61-124）、INCR_EXAMPLES（:127-137）、INCR_SUMMARIES（:140-150）、webCliEntryFor/webCliHelpOne/webCliHelp 文案（:152-211） | lgdl-web-cli 导出 webCliHelp 系列；help 输出与迁移前逐字符一致（随迁 help.test.ts 4 例全绿） | P0 |
| FR-012 | **组装单点迁入（B7）**：自 web-cli-base adapters/lgdl.ts 迁入全量——lgdlKindResolver、lgdlApplier、lgdlBuildOperation、lgdlDomain 19 符号组装、lgdlExecutor + 具名导出 executeSubcommand/executeCommands/describeCommandLine；DomainApi 具体实例（19 符号）随迁（对应 exec.ts:40-65 LGDL 面）；import 源 `@lgdl/core` → `@lgdl/lgdl-core` | lgdl-web-cli 导出 lgdl* 系列；随迁 exec.test.ts LGDL 面用例全绿；19 符号组装结果与迁移前一致 | P0 |
| FR-013 | **消费方接线（B8）**：cli/src/commands/{add,remove,update}-{node,edge,group}.ts 共 9 文件（:4）import 源 `@lgdl/web-cli-base` → `@lgdl/lgdl-web-cli`（**cli 依赖边变更**：cli → lgdl-web-cli → lgdl-core，见 R2/EC-002）；web/src/ai/{AiPanel.tsx:5, lgdl-web.ts:10-11, provider.ts:16-17} import 源更新 | 9 个 cli 命令文件 import 源为 `@lgdl/lgdl-web-cli`；web 3 文件 import 源更新完成；cli 包 tsc 构建通过、`lgdl-cli <mutation 命令>` 冒烟行为不变 | P0 |

### 组 3：抽取 @lgdl/lgdl-web-op-cli（对应 discovery §3.3 C 面 op 部分）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-014 | **新包骨架 + 工具/元数据迁入（C1）**：packages/lgdl-web-op-cli 新建（name `@lgdl/lgdl-web-op-cli`）；自 web 迁入——WEB_OP_TOOL 全量（provider.ts:205-255：name `lgdl-web-op-cli`、16 子命令 enum、export 别名说明 :226、args 说明 :241-250）、WEB_OP_ENTRIES 16 条命令元数据（help.ts:27-89）+ webOpHelpOne/webOpHelp（help.ts:91-123）；HelpArg/HelpEntry 与 base 的重复定义（web/help.ts:9-24 vs base/help.ts:16-31）在迁出时统一（以 base 定义为基准，或经机制层导出） | lgdl-web-op-cli 导出 WEB_OP_TOOL/webOpHelp 系列；工具 name/description/parameters 逐字节一致；16 子命令枚举不变；help 输出逐字符一致（随迁 web/ai/help.test.ts webOpHelp 面 4 例全绿）；包级 build 通过 | P0 |
| FR-015 | **next-actions 迁入（C2）**：自 web 迁入 next-actions.ts 全量——NextAction 接口（:12-17）+ parseNextActions（:20-35，纯 JSON 解析校验） | lgdl-web-op-cli 导出 NextAction/parseNextActions；随迁 next-actions.test.ts 4 例全绿；解析行为与迁移前一致 | P0 |
| FR-016 | **op 协议契约 + 执行 handler 注入机制（C3）**：op 协议 = 子命令枚举/参数 schema 统一单一数据源（WEB_OP_TOOL.parameters.enum + WEB_OP_ENTRIES 收敛为唯一契约，消除现状"工具定义 + help 元数据"双份并存）；新包定义执行 handler 注入签名（如 OpHandler 注册表：subcommand → handler 映射），**不含 React/DOM 实现** | lgdl-web-op-cli 源码无 React/DOM/localStorage 引用；handler 注册表签名类型可被 web 消费；WEB_OP_TOOL 与 WEB_OP_ENTRIES 数据源收敛为单一来源 | P0 |
| FR-017 | **op 范围界定（C4，R9）**：不新增 lgdl-web-op-cli 文本命令解析能力——op 协议仅为元数据契约（子命令枚举/参数 schema），不实现 `lgdl-web-op-cli` 前缀文本行解析器（现状 web 侧即无，抽取不得新增能力面） | lgdl-web-op-cli 包内无文本行解析模块；能力面与迁移前一致（工具定义 + 元数据 + next-actions 解析） | P0 |

### 组 4：web-cli-base 纯化（对应 discovery §3.2-8 配套 + §3.3-5 web-fetch 归位）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-018 | **DomainApi 泛型化 + 去 lgdl-core 依赖（B8-①）**：exec.ts:40-65 的 DomainApi 接口（19 个 LGDL 领域符号）泛型化为 `DomainApi<Op, Doc>`（机制契约）；具体 DomainApi 实例随 adapters 迁 lgdl-web-cli（FR-012）；base/package.json 移除 `@lgdl/core` 依赖（:22）；base 源码全部 `@lgdl/core` import（commands.ts:14、operations.ts:20-30、exec.ts:15-22、protocol.ts:22-23、index.ts:25 等）清除 | base/package.json 无任何 `@lgdl/*` dependencies；`grep -rn "@lgdl/"` 在 packages/web-cli-base/src 与 package.json 无命中；base 导出 `DomainApi<Op, Doc>` 泛型契约，任意领域可实例化 | P0 |
| FR-019 | **注册表机制保留 + 硬编码参数化（B8-②）**：base 保留机制壳——CommandSpec/KindResolver（commands.ts:17-26/:124）、createExecutor 管线骨架（exec.ts:101-370）、CommandExecResult/LineHandleResult/ExecutorOptions/Executor、批量解析骨架（parseWebCliBatch :231-290）、help 生成骨架（webCliHelp 函数结构 :152-211）；**不含任何具体命令**；exec/protocol/help/tools/llm 中合计 86 处 'lgdl-web-cli' 等硬编码（exec 21 + protocol 17 + help 27 + tools 6 + llm 15）全部参数化（前缀经配置/参数注入）或随迁 | `grep -rn "lgdl-web-cli\|lgdl-web-op-cli\|lgdl-web-fetch"` 在 packages/web-cli-base/src 无命中（中性名 web-fetch 除外）；base 机制符号导出面完整（CommandSpec/KindResolver/createExecutor 等）；无具体命令注册表残留 | P0 |
| FR-020 | **createOperationApplier 泛型化回留 base（A-003 → D-002）**：operations.ts 的 createOperationApplier 注入工厂（:86-192）泛型化为通用注入分派器（op 名称 → mutation 函数的查找与执行管线，`Op` 类型参数化），**回留 base**；9 个 op 变体的具体分派映射（LGDL 协议形状）随 LgdlOperation 迁 lgdl-web-cli（FR-008），由 lgdl-web-cli 组装时调用泛型工厂 | base 导出泛型化 createOperationApplier（无 LGDL 类型引用）；lgdl-web-cli adapters 组装（lgdlApplier = createOperationApplier(9 mutations)）仅换 import 源、调用形态不变；注入相同 mutations 集时分派输出与迁移前逐字节一致 | P0 |
| FR-021 | **llm.ts 三工具分流去耦（A-004 → D-003）**：ChatResult 收敛为**通用 toolCalls 单列表**（删除 toolCalls/opCalls/fetchCalls 三字段，:34-45）；chat() 删除按工具名过滤（:135-137、:187-189、:194-196 硬编码 lgdl-web-cli/lgdl-web-op-cli/lgdl-web-fetch）改为透传全部工具调用由消费方分发；llm.ts 内 15 处 lgdl 引用清零；消费方（provider.ts:395 起 / AiPanel）同步改为按工具名分发（FR-023） | `grep -rn "lgdl"` 在 packages/web-cli-base/src/llm.ts 无命中；ChatResult 仅含通用 toolCalls 列表字段；llm.test.ts 6 例按新契约调整后全绿 | P0 |
| FR-022 | **web-fetch 归位与中性化改名（C5）**：自 web 迁入 base——WEB_FETCH_TOOL（provider.ts:261-289）、parseWebFetchCommand（web-fetch.ts:19-44）、executeWebFetch（web-fetch.ts:54-79，浏览器 fetch API :67 与 Node 20+ 全局 fetch 兼容）、webFetchHelp（help.ts:126-137）；工具名与协议前缀 `lgdl-web-fetch` → **`web-fetch`**（中性化，作者裁决③）；web 侧改名联动：lgdl-web.ts:17/:32 前缀判断、AiPanel.tsx:154/:431、prompts.ts:20/:27-28/:43 | base 导出 web-fetch 全套（工具定义/解析/执行/help）；`grep -rn "lgdl-web-fetch"` 全仓无残留；web-fetch.test.ts 6 例随迁改名后全绿 | P0 |

### 组 5：web 包调整（对应 discovery §3.3-6）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-023 | **三工具分发接线（C6）**：provider.ts chat() 工具组装（:328-357，Claude 3 工具 / OpenAI 2 工具 W-D1 现场保留 :326）改为引用——lgdl-web-cli 包 WEB_CLI_TOOL、lgdl-web-op-cli 包 WEB_OP_TOOL、base web-fetch 工具；AiPanel 三工具分发（:395-443）维持现状逻辑、import 源更新、按新契约（FR-021 单列表 toolCalls）以工具名判别分流（lgdl-web-cli / lgdl-web-op-cli / web-fetch） | web 构建通过；provider.test.ts 14 例全绿；三工具注册完整（Claude 3 三工具 / OpenAI 二工具路径与现状一致，W-D1 现场保留不变）；AiPanel 分发三分支行为与迁移前一致 | P0 |
| FR-024 | **op/fetch 执行 handler 注入（C6）**：web 注入——op 执行 handler（App.tsx:943-1055 handleWebOp 16 分支：clipboard/UI 态/export/preview/DOM/EXAMPLES/webOpHelp，React 强耦合留 web）经 lgdl-web-op-cli 的 handler 注册表签名（FR-016）注入；fetch 执行器经 base exec 扩展点注入（ADR-007 模式，lgdl-web.ts handleFetchLine/describeFetchLine 改名点 :16-32 同步）；AiPanel 胶囊卡片渲染（:226-228/:414-428）留 web | web 注入接线完成；op 16 分支行为与迁移前一致（downloadSvg/Png、clipboard、preview zoom/pan/reset、jumpToIssue、EXAMPLES 切换）；fetch 执行经扩展点注入、行为不变 | P0 |
| FR-025 | **测试脚本与全量回归（R5）**：web/package.json test 脚本显式文件列表（:24-26）按迁移后文件集合重列（web-fetch.test.ts/web-fetch 相关迁出、webOpHelp 面迁出、接线测试新增）；全仓测试全量回归 | web test 脚本覆盖迁移后实际文件集合（无指向已迁移文件的旧路径）；全仓测试计数 ≥ 388（NFR-003）、失败数 = 0 | P0 |

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | 零新增功能 | 不新增命令/工具/行为/输出（C1）：功能面（命令数 9、工具数 3、子命令 19+16+1）与迁移前一致，仅位置/命名迁移 | 迁移前后功能面对比清单一致；新增物仅为接线测试与元数据测试（非业务功能） |
| NFR-002 | 零语义改动 | 行为与输出逐字节一致：错误消息、status 文本、help 输出、工具 schema、协议解析结果均与迁移前基线一致（A-002 精神：仅位置迁移 + 注入，不改行为）；唯一例外 = web-fetch 中性化改名（工具 name/前缀 `lgdl-web-fetch` → `web-fetch`，属命名改动非语义改动） | 随迁测试断言（逐字段/逐字符比对）全绿即证；无任何行为分支被改写（plan/review 阶段 diff 复核） |
| NFR-003 | 测试守恒 | V2 后全仓测试分布 ≥ 388 基线（C4，只搬家不删测试；discovery 实测 390 = 82+48+260，用户基线 388 为口径差异，守恒对比基准取 388）；预估 V2 后分布 407-435（含接线/元数据新增测试，discovery §4.2） | 全仓测试计数 ≥ 388；无测试因重构被删除；随迁测试断言语义不弱化 |
| NFR-004 | 依赖方向约束 | base 零 lgdl 依赖（C3 + 作者裁决①）：web-cli-base 不依赖任何 @lgdl/* 包；lgdl-* 包单向依赖：lgdl-web-cli → lgdl-core、cli → lgdl-web-cli/lgdl-core 并存无环（R2）；lgdl-web-op-cli 不依赖 React/DOM/web 包；全仓无循环依赖 | 各包 package.json dependencies 声明核验；依赖图检查无环、无 base→lgdl 反向边；lgdl-web-op-cli 源码 grep 无 react/dom 引用 |
| NFR-005 | 泛型化契约 | 机制面泛型化（DomainApi<Op,Doc>、createOperationApplier、ChatResult 单列表）后契约行为不变：注入等价配置/传入等价数据时输出与迁移前逐字节一致 | 随迁测试承载（注入相同 9 mutations / 相同领域 API 实例时行为不变）；泛型签名可被任意领域实例化（plan 阶段类型级验证） |
| NFR-006 | 构建与类型完整性 | 全仓库 TypeScript 构建零错误；9 包类型导出可互消费（cli/web/lgdl-web-cli/lgdl-web-op-cli 交叉引用类型正确解析） | 全仓 build（或等价 tsc 命令）零错误退出；cli/web 构建产物引用新包类型无误 |
| NFR-007 | 命名一致性 | 包命名体系统一：业务/语言包 = `@lgdl/lgdl-*`（scoped + lgdl 前缀并存，与 @angular/core 同构，D-001）；框架包 = `@lgdl/web-cli-base`（中性名保持，C3）；bin `lgdl-cli` 与协议前缀 `lgdl-web-cli`/`lgdl-web-op-cli` 为用户/AI 可见接口不随包名变（A-002） | 9 包 name 核验清单与 D-001 一致；FR-004 验收项通过 |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | 命名约定返工（R1）：若 scoped 形式推断错误，A1-A8 全部返工 | D-001 已定 scoped 形式（@lgdl/lgdl-*）——spec 层锁死命名约定，plan 阶段不得再改；"lgdl" 双写经 D-001 理由确认可接受 |
| EC-002 | cli 依赖边变更/循环（R2）：cli 9 命令依赖边 web-cli-base → lgdl-web-cli，依赖链 cli→lgdl-web-cli→lgdl-core 与 cli→lgdl-core 并存 | NFR-004 依赖图核验为验收项：确认无循环、web-cli-base 纯化后不再依赖 lgdl-core（FR-018）；plan 阶段 package.json 声明先行核对 |
| EC-003 | 硬编码字符串面（R3）：86 处 'lgdl-web-cli' 等硬编码（exec 21 + protocol 17 + help 27 + tools 6 + llm 15），base 纯化漏改一处即残留 | FR-019 grep 零残留验收兜底；协议文本与描述文案的测试断言随迁同步调整（NFR-002） |
| EC-004 | llm.ts 分流耦合（R4）：ChatResult 三字段是 AiPanel 分发（:395）直接依赖，重构（D-003 单列表化）需同步改消费方 | FR-021 + FR-023 原子落地（llm.ts 改契约与 web 消费方改分发同批交付）；回归集中在 provider.test 14 例与 AiPanel 接线，测试守恒兜底 |
| EC-005 | web 测试脚本显式文件列表（R5）：迁移后文件集合变化，脚本漏改则 CI 测试缺失 | FR-025 重列文件列表；验收比对脚本列表与实际文件集合一致 |
| EC-006 | predev/CI workspace 引用（R6）：web/package.json predev（:29-31）与 CI build（deploy-pages.yml:38）与重命名强绑定 | FR-003 覆盖；重命名组（FR-001~FR-003）与抽取组原子交付，build 门禁拦截半程状态 |
| EC-007 | dist 产物与 node_modules 链接残留（R7）：重命名后旧 @lgdl/* 链接残留，import 解析到旧包 | 重命名交付时执行 `npm install` + 全量 rebuild 一次性动作；验收 grep 确认 node_modules/@lgdl/ 链接与源码引用一致 |
| EC-008 | 文档面滞后（R8）：README/docs 未同步包名，不影响构建但影响一致性 | FR-005 P2 同步；research 历史文档按 NG-006 二选一处理，不阻塞 |
| EC-009 | op 无独立文本协议解析器（R9）：若 spec 要求 op 文本命令解析则属新增能力 | FR-017 范围界定：op 协议 = 元数据契约（子命令枚举/参数 schema），**不新增**文本行解析能力；能力面与现状一致 |
| EC-010 | 测试迁移遗漏：随迁测试引用旧路径或遗漏搬运 | 「无残留」验收（AC-002/AC-005）兜底：全仓 grep 确认无指向已迁移路径的 import、无旧位置迁出符号定义残留；迁移完成态以测试计数 ≥ 388 校验 |

## 8. 验收标准（总体验收清单）
> 可验证的总体验收清单（包结构就位 / 重命名零残留 / base 纯化 / 三工具归位 / 测试全绿）

| # | 验收项 | 验证方式 | 关联 |
|----|--------|---------|------|
| AC-001 | **包结构 9 包就位**：packages/ 下 9 个目录（6 改名 lgdl-* + web-cli-base + lgdl-web-cli + lgdl-web-op-cli）；9 包 name 分别为 `@lgdl/lgdl-{core,layout,render,router,cli,web}`、`@lgdl/web-cli-base`、`@lgdl/lgdl-web-cli`、`@lgdl/lgdl-web-op-cli`；根 workspace 全部纳入 | `ls packages/` 核对 9 目录；各包 package.json name 字段逐项核验；`npm install` 后 lock 含 9 个 workspace 条目 | FR-001, FR-006, FR-014 |
| AC-002 | **重命名零残留**：全仓（packages/*/src + 根配置 + CI）无 `@lgdl/core`/`@lgdl/layout`/`@lgdl/render`/`@lgdl/router`/`@lgdl/cli`/`@lgdl/web` 旧名引用（`@lgdl/web-cli-base` 除外）；根 dependencies/CI workspace 名/tsconfig references/predev 脚本已更新 | `grep -rn "@lgdl/core\b\|@lgdl/layout\b\|@lgdl/render\b\|@lgdl/router\b\|@lgdl/cli\b\|@lgdl/web\b"`（排除 web-cli-base 与 lock 重建验证）逐条核验；CI/tsconfig/predev 文件 grep 核验 | FR-002, FR-003 |
| AC-003 | **base 无 lgdl 依赖与硬编码**：web-cli-base package.json 无 `@lgdl/*` dependencies；base/src 无 `@lgdl/` import、无 'lgdl-web-cli'/'lgdl-web-op-cli'/'lgdl-web-fetch' 硬编码（中性名 web-fetch 除外）；DomainApi<Op,Doc> 泛型契约导出 | 检查 base/package.json；`grep -rn "@lgdl/\|lgdl-web-cli\|lgdl-web-op-cli\|lgdl-web-fetch"` 于 packages/web-cli-base 零命中（web-fetch 中性名除外）；检查 base index 导出面 | FR-018~FR-021, NFR-004 |
| AC-004 | **三工具归位**：WEB_CLI_TOOL 定义存在于 lgdl-web-cli 包；WEB_OP_TOOL + WEB_OP_ENTRIES + webOpHelp + next-actions 存在于 lgdl-web-op-cli 包；WEB_FETCH_TOOL（改名 web-fetch）存在于 base；web 包无三工具定义残留（仅组装/分发引用） | `grep -rn "WEB_CLI_TOOL\|WEB_OP_TOOL\|WEB_FETCH_TOOL\|WEB_OP_ENTRIES\|webFetchHelp\|parseNextActions"` 定位定义位置逐项核验 | FR-007~FR-009, FR-014~FR-016, FR-022 |
| AC-005 | **测试全绿且守恒**：全仓测试计数 ≥ 388（预估 407-435），失败数 = 0；无测试因重构删除；web test 脚本文件列表与迁移后实际文件集合一致 | 运行各包测试命令（或全仓等价命令）；比对计数与迁移前基线；失败数 = 0 | FR-025, NFR-003, EC-010 |
| AC-006 | **依赖方向核验**：无循环依赖；无 base→lgdl 反向边；lgdl-web-op-cli 无 React/DOM 依赖；cli→lgdl-web-cli→lgdl-core 链成立且 cli→lgdl-core 并存无冲突 | 各包 package.json dependencies 声明核验 + 依赖图检查（构建解析或声明核验） | FR-013, FR-018, NFR-004, EC-002 |
| AC-007 | **消费方接线完成**：cli 9 个 mutation 命令 import 源为 `@lgdl/lgdl-web-cli`；web AiPanel/lgdl-web/provider import 源更新为新包/base；bin 名 `lgdl-cli` 不变；协议前缀 `lgdl-web-cli`/`lgdl-web-op-cli` 文本不变 | 检查 9 个 cli 命令文件与 web 3 文件 import 源；cli/package.json bin；协议前缀 grep 比对 | FR-004, FR-013, FR-023, FR-024 |
| AC-008 | **构建与 CI 通过**：全仓 tsc 构建零错误；CI deploy-pages.yml 引用新 workspace 名且含新包构建；web predev 构建链可用 | 全仓 build 零错误退出；检查 CI 文件；web predev 冒烟 | FR-003, NFR-006, EC-006 |
| AC-009 | **行为逐字节一致**：随迁测试断言（错误消息/status/help 文本/tools schema/协议解析）与迁移前基线完全一致；改名面仅 web-fetch 工具 name 一处例外 | 随迁测试全绿即证；抽样 diff 关键输出（help 文本、tools schema JSON）与迁移前基线 | NFR-002, NFR-005 |
| AC-010 | **文档面同步（P2）**：README/docs/cli-guide 无旧包名残留；research 历史文档按 NG-006 处理 | 文档 grep 核验（P2，可滞后至 validate 阶段复核） | FR-005, EC-008 |

## 9. 开放问题与设计决策
> discovery §7 遗留 3 项 spec 确认点（A-001/A-003/A-004）——作者任务书明确自主决策，由 Spec Agent 基于工程合理性与作者裁决闭环给出结论，作为**已定决策记录**（理由充分，供 plan 阶段据此细化；如需推翻须作者确认）。另有 1 项补充决策（D-004）。

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | A-001 新包名 scoped 形式（@lgdl/lgdl-core 等） | ✅ 已决策（见 D-001） |
| 2 | A-003 createOperationApplier 泛型化归属（机制留 base vs 随业务迁 lgdl-web-cli） | ✅ 已决策（见 D-002） |
| 3 | A-004 llm.ts 三工具分流去耦方式（ChatResult 三字段如何中性化） | ✅ 已决策（见 D-003） |
| 4 | 补充：tokenizeCli/parseArgs 归属（discovery §3.2 B 面第 4 条"留 base 或随迁由 spec 定"） | ✅ 已决策（见 D-004） |

### D-001 新包名 scoped 形式：确认 `@lgdl/lgdl-core` 等（scope + lgdl 前缀并存，与 @angular/core 同构）

**决策**：6 包重命名采用 scoped 形式——`@lgdl/lgdl-core`、`@lgdl/lgdl-layout`、`@lgdl/lgdl-render`、`@lgdl/lgdl-router`、`@lgdl/lgdl-cli`、`@lgdl/lgdl-web`；新包 `@lgdl/lgdl-web-cli`、`@lgdl/lgdl-web-op-cli`；`@lgdl/web-cli-base` 保持中性名（不加 lgdl 前缀）。"lgdl" 双写（@lgdl/lgdl-*）可接受。

**理由**：
1. **作者任务书既成事实**：任务书明示新包 `@lgdl/lgdl-web-cli` / `@lgdl/lgdl-web-op-cli`，且要求 6 包"加 lgdl 前缀"——两者合并即 scope + lgdl 前缀并存，无第二种自洽读法；
2. **命名体系一致性**：现有 7 包全部在 `@lgdl` scope 下（discovery §2.1），统一 scope 保持"@lgdl/* 均为本仓库包"的身份规则；前缀 `lgdl-` 是包名可读标识（业务归属），scope 是发布命名空间，二者语义不冲突；
3. **同构先例**：@angular 生态（@angular/scope + 包名前缀角标体系）即 scope + 前缀并存；"lgdl" 双写与 @angular/core 场景同构，npm 命名规范允许，无技术障碍；
4. **命名即边界**：`@lgdl/web-cli-base`（中性框架，无 lgdl 前缀）vs `@lgdl/lgdl-*`（业务/语言包，带 lgdl 前缀）——命名直接承载作者"base 类似 Spring、谁的业务归谁"的边界裁决，消除 @lgdl/web-cli-base 与 @lgdl/lgdl-web-cli 的混淆（discovery §1 核心问题 2）；
5. **风险锁定**：A-001 是 A1-A8 全部改动形态的第一输入（discovery §9 高优先级建议），spec 锁死后 plan 无需再决策，EC-001 拦截返工。

### D-002 createOperationApplier 泛型化：泛型化版本回留 base（机制留 base，9 mutations 映射随业务迁）

**决策**：createOperationApplier 注入工厂（operations.ts:86-192，ADR-005 分派模式）**泛型化为通用注入分派器回留 base**（op 名称 → mutation 函数映射的查找与执行管线，Op 类型参数化）；9 个 op 变体的具体分派映射（LGDL 协议形状）随 LgdlOperation 迁 lgdl-web-cli（FR-008），由 lgdl-web-cli 组装时调用泛型工厂（lgdlApplier = createOperationApplier(9 mutations)，adapters/lgdl.ts:56-66 调用形态不变）。

**理由**：
1. **机制/业务切分对齐作者裁决**：注入分派是框架级机制（ADR-005 分派模式），9 个 op 变体 switch 是 LGDL 协议形状（业务）——"机制留 base、业务随迁"正是作者裁决①④的精确投影；
2. **"注册表机制保留"的涵盖**：作者任务书"注册表机制保留但不含具体命令"——注入分派器与命令注册表同属框架机制面，留 base 与任务书表述一致；
3. **base 中性化无冲突**：泛型化后工厂不引用任何 LGDL 类型（Op 由调用方以类型参数传入），满足 FR-018 零 lgdl 依赖约束；lgdl-web-cli 组装单点仅换 import 源；
4. **第二领域复用诉求**：注入分派器是"命令执行框架"的核心复用点（discovery §1 核心问题 1 的框架诉求），其他领域场景可直接复用，不必自带分派器；
5. **零语义改动保障**：泛型化是签名层参数化，分派行为由注入的 mutations 映射决定——lgdl-web-cli 注入相同 9 mutations 时输出与迁移前逐字节一致（NFR-002/NFR-005 承载）。

### D-003 llm.ts 三工具分流去耦：ChatResult 收敛为通用 toolCalls 单列表，三桶分流逻辑迁 web 接线层

**决策**：ChatResult 删除 toolCalls/opCalls/fetchCalls 三字段（:34-45），收敛为**通用 toolCalls 单列表**（每条含 name/arguments/解析结果）；chat() 删除按工具名过滤（:135-137/:187-189/:194-196），透传全部工具调用；三桶分流逻辑（按工具名判别 lgdl-web-cli / lgdl-web-op-cli / web-fetch）迁至 web 接线层（AiPanel 分发 :395-443 + provider 组装），由 web 按工具名分发（FR-021/FR-023 原子落地）。

**理由**：
1. **"中性化"是作者明示目标**：opCalls/fetchCalls 三桶分类本身就是 LGDL 应用形状（"op/fetch/cli"三分类是 LGDL 三工具场景特有），中性框架不应感知该分类——单列表化是唯一彻底的中性化形态；
2. **职责归位，符合"谁的业务归谁"**：llm.ts 只负责 LLM 协议往返（OpenAI/Claude 双路径），领域分发是 web 应用层职责；消费方本就做分发（AiPanel :395-443 已按工具分派），把分类从 llm.ts 移到消费方是职责收敛而非新逻辑；
3. **改名面自然缩小**：web-fetch 中性化改名（lgdl-web-fetch → web-fetch）后，llm.ts 不再硬编码工具名，改名只影响 web 消费方与 base 的 web-fetch 侧（FR-022），llm.ts 零改动；
4. **完全中性可复用**：单列表 ChatResult + 透传工具调用使 llm.ts 与工具集完全解耦（15 处 lgdl 引用清零），任意领域/工具集可直接复用 LLM 客户端；
5. **风险可控**：改动集中在 ChatResult 类型 + chat() 过滤逻辑 + web 消费方（provider/AiPanel）三处；llm.test 6 例按新契约调整断言；回归面经测试守恒（NFR-003）与 provider.test 14 例兜底（EC-004）。

### D-004 tokenizeCli/parseArgs：留 base（通用语法解析，机制面）

**决策**：protocol.ts 的 tokenizeCli（:160）与 parseArgs（:184）为通用命令行语法解析（无领域引用），**留 base**；parseWebCliCommand/parseWebCliBatch 的 'lgdl-web-cli' 前缀校验（:44-52）、17 子命令枚举（:85-153）、--doc 语义（:70-82）等 LGDL 路由面随迁 lgdl-web-cli（FR-010）。

**理由**：
1. tokenizeCli/parseArgs 无任何 lgdl 引用，是纯语法机制（分词/参数解析），与 base 中性定位一致——留 base 满足 FR-018 零 lgdl 依赖；
2. 与 D-002 同构：机制（语法解析）留 base、业务（lgdl 前缀路由/子命令语义）随迁，保持"机制/业务切分"决策一致性；
3. lgdl-web-cli 的解析路由可复用 base 的 tokenizeCli/parseArgs（import 源 base），避免重复实现；17 子命令枚举与 --doc 映射随迁后，lgdl-web-cli 成为完整业务解析层。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 discovery 基线（A1-A10/B1-B8/C1-C6/R1-R9/C1-C7/测试基线）+ 作者裁决 4 项 + 任务书 5 组需求编写；定义 25 FR / 7 NFR / 10 EC / 10 验收项；discovery 遗留 3 项确认点自主决策记录（D-001~D-003）+ 补充决策 D-004 | 2026-08-31 | SDDU Spec Agent |
