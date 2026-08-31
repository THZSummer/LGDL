# Feature Specification：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: discovery.md（问题清单，Q-001~Q-013 / R-001~R-010 / C-001~C-007）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建（作者指令已闭环，零访谈；Q-010~Q-013 自主决策记录已写入 §9）

## 1. 元数据
> Feature 基本信息

| 字段 | 值 |
|------|-----|
| Feature ID | F-13 ① |
| 名称 | web-cli 独立包抽取（第一阶段） |
| 优先级 | P0（作者指令 2026-08-31 由 v0.8 提前至 v0.6） |
| 目标版本 | v0.6.0（2026-09-01 ~ 09-12 收口期第 2 周窗口；超窗则从发布剥离、顺延至 v0.6 后立即执行） |
| 排布依赖 | F-04/F-05 先行关闭 → F-13 ① 紧随启动（C-007） |

## 2. 上下文
> 回顾问题背景和目标用户

### 2.1 要解决的问题

LGDL monorepo（现 6 包：core/layout/router/render/cli/web）中，「AI 可调用命令执行框架」底座与 LGDL 领域语义深度交织，无法作为独立可复用/可开源包剥离：

- **core 侧**：COMMANDS 命令注册表（commands.ts:26-289）+ 执行层操作协议（operations.ts:31-220）承载框架能力，但内嵌 LGDL 图类型语义（defaultKindFor、LgdlOperation 判别联合、9 个 mutation 强绑定）；
- **web 侧**：执行管线 executeSubcommand→buildOperation→applyOperation→validate→serialize（ops.ts:80-331）直调 13 个 core 领域 API（ops.ts:10-30），接线层锁死在 web 包内；
- **影响**：web-cli 开源线（F-13 ②，v1.1）被阻塞；LGDL 每轮语义演进（命令集、图类型）同步波及接线层；框架能力无法脱离 LGDL 复用于其他领域。

### 2.2 任务本质（作者指令原话，ROADMAP.md:129-131）

> 「monorepo 新增独立包（第 7 个包，与 core/layout/router/render/cli/web 并列），抽取与 LGDL 领域解耦的『AI 可调用命令执行框架』底座 = core 命令注册表（COMMANDS）+ 执行层（executeSubcommand → buildOperation → applyOperation → validate → serialize）+ function-calling 工具定义（tools schema），LGDL 作为首个适配场景；web 侧接线（ops.ts / provider.ts）迁出至新包。**零破坏**：仅位置迁移、不改语义模型；web 107 / core 281 测试全量回归。」

**本 Feature 是纯重构抽取**：零新增功能、零语义改动、零破坏。开源细节（许可/命名/仓库/发布管道）决策待定，属 F-13 ②（v1.1）范畴，本步不预设立场（C-005）。

### 2.3 目标用户

| 用户角色 | 场景 | 诉求 |
|---------|------|------|
| LGDL 作者/维护者 | v0.6 收口期抽取 web-cli 底座 | 抽取不引入回归；不阻塞 v0.6 发布 |
| 下游 AI 工具链使用者（潜在适配者） | 非 LGDL 领域复用「AI 可调用命令执行框架」 | 底座与领域解耦，可独立接入 |
| AI 实战链路（web workbench AiPanel 调用方） | 抽取期间持续使用 AI 面板 | web 107 / core 281 全绿 + AI 面板手测通过 |

### 2.4 与现有功能的关系

- 共享接线面：F-04（lgdl-web-fetch 注册进 tools）、F-05（preview-click 反馈）同在 provider.ts/ops.ts 层——**排布原则：F-04/F-05 先行关闭 → F-13 ① 紧随启动**（ROADMAP.md:134，C-007）；
- 护栏：F-02（CI 测试工作流）作 v0.6 内基础回归护栏；v0.7 补 F-06/F-11 专项测试（护栏后置补课，ROADMAP.md:147）；
- 基建依赖：F-01（deploy-pages.yml 补 router 构建）已修复——F-13 不得回退该修复（R-007）。

## 3. 目标与非目标
> 明确需求范围，防止范围蔓延

### 3.1 目标 (Goals)
> 明确本次要达成的业务目标

| # | 目标描述 |
|---|---------|
| G-001 | monorepo 新增第 7 个独立包，承载与 LGDL 领域解耦的「AI 可调用命令执行框架」底座：COMMANDS 命令注册表 + 执行层（executeSubcommand→buildOperation→applyOperation→validate→serialize）+ function-calling 工具定义（tools schema）+ 命令文本协议解析器 + help 自文档框架 |
| G-002 | web 侧接线（ops.ts / provider.ts / web-cli.ts / help.ts）迁出至新包；LGDL 作为首个适配场景，领域 API 经适配接口接入新包执行骨架，不改执行路径语义 |
| G-003 | 引用切换无断裂：cli 9 个 mutation 命令及 queries/option-hints/shared/convert/init/import、web UI（AiPanel/App/SettingsPanel）的 import 目标切至新包；core 导出面收敛且保持零依赖 |
| G-004 | 零破坏达成：web 107 / core 281 测试全量回归全绿 + AI 面板实战闭环手测通过，行为与输出逐字节一致（纯位置迁移） |

### 3.2 非目标 (Non-Goals)
> 明确本次不涉及的范围，防止需求蔓延

| # | 明确不做 |
|---|---------|
| NG-001 | 不新增任何功能：不新增命令/工具/行为/输出（C-001，零新增功能红线） |
| NG-002 | 不改语义模型：包括类型层——LgdlOperation/LgdlDocument/NodeKind 等类型定义零改动（C-002；类型引用路径可迁移，定义与语义不变） |
| NG-003 | 不迁出 LGDL 领域逻辑：core 领域类型全集与领域函数（mutations/parser/serialize/queries/status/templates/groups/converters/mermaid/plantuml/json）、web 领域/UI（prompts/next-actions/AiPanel/SettingsPanel/App/locate/snap/examples）均留原包（Q-006/Q-007） |
| NG-004 | 不做开源细节决策：许可/命名/仓库/发布管道属 F-13 ②（v1.1），决策待定（C-005） |
| NG-005 | 不修复既有缺陷：W-D1（provider.ts:504 OpenAI 端点缺 WEB_FETCH_TOOL）归 F-04；source-loc 链路（R-D2/W-D3）归 F-03/F-05——只搬不移 |
| NG-006 | 不修订文档：docs/v0.5-web-ai.md:142 位置描述漂移列入 v0.6 已知 20 项漂移清单，由文档对齐（F-08 类）另行处理，不阻塞抽取（R-008） |
| NG-007 | 不做类型中性化/泛型化重写：Q-013 决策为「新包→core 单向依赖保类型」（见 §9），框架接口的类型泛型化演进不在本步范围 |

## 4. 用户故事
> 以用户视角描述功能需求

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| US-001 | LGDL 作者/维护者 | 把 web-cli 底座独立成第 7 个包 | v1.1 开源线（F-13 ②）不被阻塞，LGDL 语义演进不再波及接线层 |
| US-002 | 下游 AI 工具链使用者（潜在适配者） | 一个与 LGDL 领域解耦的「AI 可调用命令执行框架」 | 在非 LGDL 领域复用命令注册/执行/tools 能力 |
| US-003 | AI 实战链路调用方（web workbench AiPanel） | 抽取期间零破坏（web 107 / core 281 全绿 + AI 面板手测通过） | v0.6 收口期不引入回归，AI 闭环行为不变 |

## 5. 功能需求 (FR)
> 每个需求必须有唯一标识符且可测试；抽取范围按「新包骨架 / 底座三件套 / web 接线随迁 / 引用切换」四组组织

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-001 | **新包骨架**：monorepo 新增第 7 个独立包，与 core/layout/router/render/cli/web 并列；含 package.json（type:module/main/types/exports）、tsconfig、src 入口；根 workspace 配置纳入新包 | packages/ 下新增包目录与六者并列；package.json name 与既有包无冲突；`npm run build`（或等价全仓构建）通过且产物含新包 | P0 |
| FR-002 | **底座① COMMANDS 注册表迁入**：COMMANDS 注册表（9 增量命令 CommandSpec）、KNOWN_PARAMS、requireParams、assertChangeRequested、buildOperation、parseAttrsSpec、parseMemberSpec 自 core/src/commands.ts 迁入新包（Q-001；defaultKindFor 按 Q-010 决策处理，见 §9） | 新包导出以上符号；随迁测试（core commands.test.ts 14 例）在新包全绿；对同一输入，buildOperation 输出 op 与迁移前逐字段一致 | P0 |
| FR-003 | **底座② 执行层迁入**：core 侧 LgdlOperation 操作协议、describeOperation、applyOperation/applyOperations 分派器 + web 侧 executeSubcommand 管线骨架、executeCommands 逐行循环、CommandExecResult 迁入新包（Q-002），形成 ROADMAP 所述 executeSubcommand→buildOperation→applyOperation→validate→serialize 全链 | 新包导出上述符号；随迁测试（core operations.test.ts 9 例 + web ops.test.ts 27 例）在新包全绿；管线顺序与失败即停行为与迁移前一致 | P0 |
| FR-004 | **底座③ tools schema + LLM 客户端迁入**：WEB_CLI_TOOL（lgdl-web-cli 工具 schema，18 子命令 enum）与 LLM 客户端 chat（openai/anthropic 双路径）、parseToolArguments、classifyError 自 provider.ts 迁入新包（Q-003；WEB_OP_TOOL/WEB_FETCH_TOOL 按 Q-011 决策留 web，见 §9） | 新包导出 WEB_CLI_TOOL/chat/parseToolArguments/classifyError；随迁测试（web provider.test.ts 20 例中对应用例）在新包全绿；工具 name/description/parameters 逐字节不变 | P0 |
| FR-005 | **协议解析器迁入**：tokenizeCli/parseArgs（通用语法）+ parseWebCliCommand 解析骨架（前缀/子命令路由）迁入新包；--doc 提取作为 LGDL 适配参数由适配层提供（Q-004） | 新包导出解析符号；随迁测试（web web-cli.test.ts 30 例）在新包全绿；解析结果与迁移前逐字节一致 | P1 |
| FR-006 | **help 自文档框架迁入**：webCliHelp 动态生成机制迁入新包，其 COMMANDS 单一数据源来源切换为新包注册表（Q-005；R-009）；webOpHelp/webFetchHelp 留 web 侧（对应工具留 web） | 新包导出 webCliHelp；help 输出与迁移前逐字符一致（增量命令帮助仍由注册表动态生成）；随迁测试（web help.test.ts 8 例中对应用例）全绿 | P1 |
| FR-007 | **web 接线随迁 + LGDL 适配注入**：ops.ts 整体（executeSubcommand/executeCommands/executeWebFetch/describeCommandLine）与 provider.ts 组装层迁出至新包（Q-009）；LGDL 领域 API（parseLgdl/validate/serializeLgdl/formatStatus/query 系列/template/convert/listFormats 等 13 个，ops.ts:10-30）经适配接口注入新包执行骨架（R-004），不改执行路径；web 侧保留 localStorage Key 管理（Q-012）、WEB_OP_TOOL/WEB_FETCH_TOOL 定义与注册组装（Q-011），AiPanel.tsx:5-6/App.tsx:19-20/SettingsPanel.tsx:12 import 目标切至新包 | 新包提供适配接口（注入领域 API 的执行骨架）；web 侧 import 目标全部切换完成且无残留旧路径引用；executeWebFetch 与 describeCommandLine 行为不变；随迁测试全绿 | P0 |
| FR-008 | **cli 引用切换**：cli 9 个 mutation 命令（add/remove/update × node/edge/group）及 queries.ts/option-hints.ts/shared.ts/convert.ts/init.ts/import.ts 中从 '@lgdl/core' 导入的 buildOperation/applyOperation 等符号切换为新包导入（R-002），cli 包构建/运行不破 | cli 包 tsc 构建通过；`lgdl-cli <mutation 命令>` 冒烟执行结果与迁移前一致（op 构造/应用路径行为不变） | P0 |
| FR-009 | **core 导出面收敛与依赖方向**：core/src/index.ts 中迁出符号（COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec、LgdlOperation/applyOperation/applyOperations/describeOperation/OperationBatchResult 等）删除；core 保持零依赖（core/package.json 不新增 dependencies）；不形成 core↔新包 循环依赖（R-001） | core/package.json 无 dependencies 字段新增；依赖方向检查：新包→core 单向、无 core→新包 反向边、无环；core 及全仓构建通过 | P0 |
| FR-010 | **测试迁移与回归**：涉迁测试随代码同步迁移——core 23 例（commands 14 + operations 9）、web 85 例（ops 27 + web-cli 30 + help 8 + provider 20）及引用调整（web-cli.test.ts:4 等 import 目标切换）；迁移不改动用例数量与断言语义（R-005） | web 107（8+4+27+20+30+10+8）与 core 281（14+206+9+52）全量回归全绿，用例计数与迁移前一致；迁移后断言输出与迁移前基线逐字节一致 | P0 |
| FR-011 | **CI 构建补齐**：.github/workflows/deploy-pages.yml 为新包补构建步骤（web 依赖新包时），且不回退 F-01 已修复的 router 构建（R-007） | workflow 文件含新包构建步骤；CI 模拟构建（或本地等价命令）通过；router 构建步骤仍存在 | P1 |

## 6. 非功能需求 (NFR)
> 性能、安全、可用性等跨切面需求

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-001 | 零破坏回归门禁 | 抽取全程保证 web 107 / core 281 测试全量回归（与 ROADMAP 门禁口径一致，C-003）；迁移不改变测试数量与断言 | 包级测试命令（或全仓等价命令）输出全绿；用例计数 107/281 不变；测试失败数 = 0 |
| NFR-002 | 零语义改动 | 行为与输出逐字节一致：错误消息、status 文本、序列化结果、help 输出、工具 schema 均与迁移前基线完全一致；「零语义改动」含类型层（A-002 定义：仅位置迁移 + 适配器注入，不改行为） | 对同一输入，迁出前后模块输出逐字节比对一致（由随迁测试断言承载）；无任何行为分支被改写 |
| NFR-003 | 包依赖方向约束 | 新包 → @lgdl/core 单向依赖（Q-013 决策，见 §9）；core 保持零依赖根；全仓无循环依赖；新包不反向依赖 web/cli | core/package.json 无 dependencies 新增；依赖图谱检查（node_modules 解析或 package.json 声明核验）无环、无反向边 |
| NFR-004 | 领域解耦 | 新包不含 LGDL 领域实现逻辑：Q-006/Q-007 留下对象（领域类型/函数/UI）不迁入；LGDL 领域 API 只经适配接口注入，新包核心逻辑不 import '@lgdl/core' 以外的领域模块 | 新包 src 中无 LGDL 领域函数实现代码；新包仅 import '@lgdl/core'（类型+适配所需领域 API 由注入传入）；grep 新包源码无 mutations/parser/queries 等领域模块引用 |
| NFR-005 | 零新增功能 | 不新增命令/工具/行为/输出；工具名不变（lgdl-web-cli/lgdl-web-op-cli/lgdl-web-fetch）——prompts.ts LGDL_SYSTEM_PROMPT 三工具协议描述不受影响 | 工具名与 prompts 引用字符串比对一致；迁移前后功能面（命令数 9、工具数 3、子命令 18）不变 |
| NFR-006 | 构建与类型完整性 | 全仓库 TypeScript 构建通过，无类型错误；新包类型导出可被 cli/web 正常消费 | `tsc`（各包 build 脚本或全仓等价命令）零错误退出；cli/web 构建产物引用新包类型无误 |
| NFR-007 | 手动 AI 实战闭环门禁 | AI 面板实战链路手测通过（ROADMAP.md:144，R-010）：chat 文本→markdown、lgdl-web-cli 工具调用执行、手动文本命令执行、web fetch 工具四条路径 | 人工按验收清单逐条手测，四条路径行为与迁移前一致；手测结果记录于 validate 阶段产物 |

## 7. 边界情况 (EC)
> 异常场景和边界条件的处理方式

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-001 | cli 引用断裂：core 删除迁出导出时 cli 9 个 mutation 命令等未同步切换 import（R-002） | 引用切换（FR-008）与 core 导出面收敛（FR-009）必须同步原子落地；build 门禁拦截任何一方先行 |
| EC-002 | 依赖方向死锁：core 以 re-export 保留迁出符号，形成 core→新包 边与循环依赖（R-001） | 明确禁止 core re-export 新包符号；依赖方向检查（NFR-003）作为验收项拦截；core 只删除迁出导出、不新增依赖 |
| EC-003 | applyOperation 分派器强绑定 9 个 mutation 领域函数（R-003） | spec 定约束：不改变分派行为；解耦方式（注入领域变更函数 vs 保持 import）由 plan 阶段细化，但不得改动操作分派语义 |
| EC-004 | web 执行层 13 个领域 API 直调（R-004） | 适配接口注入（FR-007）：新包执行骨架通过适配接口接收 parse/serialize/validate/query/template/convert 等实现；适配层由 LGDL 侧提供，行为与现直调路径逐字节一致 |
| EC-005 | W-D1 缺陷共存：provider.ts:504 OpenAI 端点 tools 注册缺 WEB_FETCH_TOOL（R-006） | 排布门禁：F-04 先行关闭后才启动 F-13 ①（C-007）；F-13 只搬移接线、不参与修复决策，不得在未修复接线上叠加改动 |
| EC-006 | 测试迁移遗漏：随迁测试引用旧路径或遗漏搬运（R-005） | 迁移完成态以「无残留」验收（§8 AC-006）兜底：全仓 grep 确认无指向已删除路径的 import、无旧位置迁出符号定义残留 |
| EC-007 | 文档漂移加剧：docs/v0.5-web-ai.md:142「协议实现在 web/ops.ts」过时（R-008） | 界定为不阻塞抽取：列入 v0.6 已知 20 项漂移清单，归文档对齐另行处理（NG-006）；抽取产物中不附带文档改写 |
| EC-008 | 手测依赖人工：AI 面板手测无法全自动覆盖（R-010） | 手测清单（NFR-007 四条路径）排入 validate 阶段人工复核环节；作者/评审确认后关闭 |
| EC-009 | 超窗与排布漂移（C-006/C-007） | 若超 v0.6 第 2 周窗口：从 v0.6 发布剥离、顺延至发布后立即执行，不阻塞发布；F-04/F-05 未关闭前不得启动抽取 |
| EC-010 | help 单一数据源断裂：help 随迁后 COMMANDS 来源未切换（R-009） | FR-006 明确定义：webCliHelp 的 COMMANDS 来源切换为新包注册表；help.test.ts 断言保证动态生成输出不变 |

## 8. 验收标准（总体验收清单）
> 可验证的总体验收清单（测试全绿 / 包结构就位 / 引用切换完成 / 无残留）

| # | 验收项 | 验证方式 | 关联 |
|----|--------|---------|------|
| AC-001 | 包结构就位：packages/ 下新增第 7 个包目录，含 package.json/tsconfig/src 入口，与六包并列；workspace 已纳入 | `ls packages/` 见 7 个包；包 package.json 字段完整；`npm run build`（等价全仓构建）通过 | FR-001 |
| AC-002 | 底座三件套就位：新包导出 COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec（注册表）、LgdlOperation/describeOperation/applyOperation/applyOperations + executeSubcommand/executeCommands/CommandExecResult（执行层）、WEB_CLI_TOOL + chat/parseToolArguments/classifyError（tools+LLM）、tokenizeCli/parseArgs/parseWebCliCommand（协议解析）、webCliHelp（help） | 检查新包 index 导出面清单与 §5 一致；对每个符号有随迁测试覆盖 | FR-002~006 |
| AC-003 | 引用切换完成：cli 13 处 '@lgdl/core' 引用中涉迁符号（9 mutation + queries/option-hints/shared + convert/init/import 的 buildOperation/applyOperation 等）切至新包；web AiPanel.tsx/App.tsx/SettingsPanel.tsx import 切至新包；help COMMANDS 来源切至新包 | `grep -rn "from '@lgdl/core'"`（cli/web）逐条核验涉迁符号已无遗留；web UI 三文件 import 目标为新包 | FR-007/008 |
| AC-004 | core 导出面收敛且零依赖：core index.ts 不再导出迁出符号；core/package.json 无 dependencies 新增；无 core→新包 反向边、无循环依赖 | 检查 core/src/index.ts 导出清单；检查 core/package.json；依赖方向核验（package.json 声明 + 构建解析） | FR-009, NFR-003 |
| AC-005 | 测试全绿：web 107（ops 27 + web-cli 30 + help 8 + provider 20 + next-actions 4 + locate 10 + snap 8）与 core 281（commands 14 + operations 9 + mutations 206 + parser 52）全量通过，用例计数与迁移前一致 | 运行 web/core 包级测试命令；比对用例计数 107/281；失败数 = 0 | FR-010, NFR-001 |
| AC-006 | 无残留：旧位置（core/src/commands.ts、core/src/operations.ts、web/src/ai/ops.ts、provider.ts、web-cli.ts、help.ts）无迁出符号定义残留；无 import 指向已删除/已迁移路径；无 '@lgdl/core' 中已迁出符号的遗留引用（领域留用除外） | `grep -rn 'defaultKindFor\|WEB_CLI_TOOL\|executeSubcommand\|buildOperation'` 定位核验：定义只存在于新包（或按 Q-010/Q-011 决策留 web/core 的例外项）；`grep -rn "from '@lgdl/core'"` 遗留引用逐条判定 | FR-009, EC-006 |
| AC-007 | 行为逐字节一致：随迁测试断言（错误消息/status 文本/序列化输出/help 文本/tools schema）与迁移前基线完全一致 | 随迁测试全绿即证；抽样 diff 比对关键输出（help 文本、tools schema JSON） | NFR-002, NFR-005 |
| AC-008 | CI 更新：deploy-pages.yml 含新包构建步骤，router 构建步骤仍在（不回退 F-01） | 检查 workflow 文件；CI 构建（或本地等价）通过 | FR-011 |
| AC-009 | AI 面板手测通过：chat 文本→markdown、lgdl-web-cli 工具调用、手动文本命令、web fetch 四条路径行为与迁移前一致 | 人工手测清单逐条执行并记录 | NFR-007, EC-008 |
| AC-010 | 排布与发布门禁：F-04/F-05 已关闭后才启动抽取；抽取在 v0.6 窗口内完成或按 C-006 剥离顺延 | 检查 ROADMAP 排布状态与 v0.6 发布记录 | EC-009, EC-005 |

## 9. 开放问题与设计决策
> 待决策事项和需要进一步调研的内容；Q-010~Q-013 为 discovery §4.4 标记的待决策议题——**作者指令明确无需访谈决策**，由 Spec Agent 基于工程合理性与 ROADMAP 约束自主给出推荐结论，作为已定决策记录（理由充分，供 plan 阶段据此细化；如需推翻须作者确认）

| # | 问题 | 状态 |
|---|------|:--:|
| 1 | Q-010 defaultKindFor 归属 | ✅ 已决策（见 D-010） |
| 2 | Q-011 WEB_OP_TOOL/WEB_FETCH_TOOL 归属 | ✅ 已决策（见 D-011） |
| 3 | Q-012 localStorage Key 管理归属 | ✅ 已决策（见 D-012） |
| 4 | Q-013 LgdlOperation 类型中性化 vs 新包依赖 core | ✅ 已决策（见 D-013） |

### D-010 defaultKindFor：参数化/注入（中性化 + LGDL 默认 resolver）

**决策**：`defaultKindFor`（docType 'er'/'uml-class'→'entity'、'state'→'state'、默认'process'，commands.ts:223-227）不随 COMMANDS 底座内嵌迁出，也不留在 core——改为**参数化注入**：新包 buildOperation 接受可选的 kindResolver（docType→kind 函数）注入；LGDL 适配层提供与现状逐字节一致的默认 resolver，领域调用方无感。

**理由**：
1. C-004「新包与 LGDL 领域解耦，LGDL 侧提供适配」是作者指令明文（ROADMAP.md:129）——defaultKindFor 是纯 LGDL 图类型→kind 语义映射，正是「领域解耦」的典型对象；
2. 零语义改动（C-002）不受损：未注入 resolver 时回退到默认实现，注入后行为与现状逐字节一致；「注入适配器而不改行为」已被 A-002 明确定义为允许的迁移形态；
3. 注入点收敛于 LGDL 适配层（cli 9 命令与 web 执行骨架均经适配层调用 buildOperation），领域调用方签名无感；
4. 避免「COMMANDS 底座不完整」与「LGDL 语义内嵌新包」两个相反方向的残缺——参数化是唯一同时满足底座完整性与领域解耦的方案。

### D-011 WEB_OP_TOOL / WEB_FETCH_TOOL：留 web，作为 LGDL 适配侧工具注册

**决策**：仅 WEB_CLI_TOOL（lgdl-web-cli，图内容操作工具）随框架迁入新包（FR-004）；WEB_OP_TOOL（lgdl-web-op-cli，UI 操作工具）与 WEB_FETCH_TOOL（lgdl-web-fetch，平台 web fetch 基础工具）**留在 web 侧定义与注册**，由 web 组装层在注册工具时一并引用新包导出的 WEB_CLI_TOOL。

**理由**：
1. WEB_OP_TOOL 是 LGDL workbench 专属 UI 操作（preview-click 定位等），属「LGDL 应用场景适配工具」，不是「AI 可调用命令执行框架」底座能力——底座只含图内容操作命令（lgdl-web-cli）；
2. WEB_FETCH_TOOL 是平台 web fetch 基础能力（executeWebFetch 调平台 fetch），与命令执行框架无关，归 web 应用平台层；
3. 将 LGDL workbench 专属工具塞入新包会污染「可复用/可开源」的纯净性（F-13 ① 目的即 v1.1 开源铺路），直接违背 C-004；
4. 注册逻辑（Claude 3 工具 / OpenAI 2 工具，provider.ts:405-420,504）恰是 F-04 修复点（W-D1）——注册组装留 web 侧，避免 F-13 移动 F-04 刚修复的代码，最小化与 F-04 的叠加风险（R-006）；
5. 工具名不变（lgdl-web-cli/lgdl-web-op-cli/lgdl-web-fetch），prompts.ts 协议描述不受影响（NFR-005）。

### D-012 localStorage Key 管理：留 web（provider.ts 拆分）

**决策**：provider.ts 的 localStorage API Key 管理（loadSettings/saveSettings/saveProviderInputs，provider.ts:62-194）**留在 web**；provider.ts 按职责拆分：LLM 客户端（chat/parseToolArguments/classifyError）与 WEB_CLI_TOOL 迁入新包，Key 管理留 web，通过注入（client 构造由 web 侧完成或 Key 经参数传入）接入新包 chat 客户端。

**理由**：
1. localStorage 是浏览器 web 平台 API——随迁会使新包依赖 browser runtime，破坏框架「可复用于任何领域/运行时」的中性化（node/CLI 侧复用场景用不到 localStorage）；
2. 它是「web 应用状态持久化」而非「命令执行框架」能力，属 LGDL web 应用适配层（Q-008 留下对象的精神）；
3. 拆分后新包保持环境无关（纯 TS 逻辑 + 领域类型），web 侧保留应用态管理，职责边界清晰且不改变 Key 读写行为。

### D-013 LgdlOperation 类型中性化 vs 新包依赖 core：新包 → @lgdl/core 单向依赖（保类型）

**决策**：**新包单向依赖 @lgdl/core 以保留类型契约**（LgdlOperation/LgdlDocument/NodeKind/LgdlMember/LgdlAttrs 类型引用不变），新包 package.json 声明 `dependencies: @lgdl/core`；core 删除迁出符号（FR-009）、保持零依赖。不做类型中性化/泛型化。

**理由**：
1. **依赖方向约束的实质是「core 零依赖 + 无循环」**（NFR-003）——新包→core 单向依赖完全满足：core/package.json 不新增 dependencies（core 仍是零依赖根）、无 core→新包 反向边（core 删除迁出符号即无 re-export）、无环。R-001 死锁风险源于「core re-export 保留导出」这一反面方案，本决策正面规避；
2. **「零语义改动」含类型层**（A-002）：LgdlOperation 判别联合与领域类型是 LGDL 语义契约；中性化/泛型化必须改写类型签名并波及 cli/web 全部类型消费方（cli/shared.ts、ops.ts 等），属语义层改动，直接违背 C-002 与「仅位置迁移」定位；保类型则类型定义零改动，仅 import 路径变化；
3. **解耦边界重定义**：C-004 解的「LGDL 领域语义不内嵌框架逻辑」指实现逻辑（mutation 函数、图类型运算），不指类型契约——类型保留是新包「面向领域的类型接口」，由 LGDL 作为首个适配场景提供类型实现，属适配面而非逻辑内嵌（R-003 的 applyOperation 与 9 个 mutation 的解耦经「注入领域变更函数」达成，而非类型泛型化）；
4. **风险最小化**：类型中性化是重写型改动，纯搬移定位下引入的回归面远超收益；v1.1 开源时若需类型演进，作为独立决策另行评估，不混入 v0.6 纯搬移。

## 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 discovery 基线（Q-001~Q-013/R-001~R-010/C-001~C-007）+ ROADMAP §二 v0.6 F-13 ① 编写需求规范；定义 11 FR/7 NFR/10 EC/10 验收项；Q-010~Q-013 自主决策记录（D-010~D-013） | 2026-08-31 | SDDU Spec Agent |
