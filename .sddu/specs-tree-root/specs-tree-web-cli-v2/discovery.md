# 问题挖掘报告：specs-tree-web-cli-v2（web-cli V2 抽取与包体系重构）

> **文档定位**: SDDU 问题挖掘报告 — 记录「web-cli V2 抽取与包体系重构」的现状基线、抽取面迁移边界与风险，作为 spec 阶段的输入
> **前置依赖**: F-13 ①（specs-tree-web-cli-extract）已完成，web-cli-base 已存在（state.json notes）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建 — 作者决策已闭环（2026-08-31），本阶段为只读现状基线盘点，不访谈

---

## 0. 本阶段说明（任务书对齐）

- **执行模式**：作者决策已闭环（4 个架构疑问已裁决，见 §5.3 记录），本阶段**只做现状基线盘点**，不做访谈、不评估方案。
- **只读范围**：全部代码证据来自只读检查（packages/、package.json、package-lock.json、.github/、tsconfig.json），未修改任何源代码。
- **交付物**：现状基线（文件:行号证据）→ §2；三块抽取面迁移边界清单（重命名 / lgdl-web-cli / op-cli+web-fetch）→ §3；测试基线 → §4；假设与风险 → §5；约束清单 → §6；无待答问题说明 → §7。

## 1. 问题定义

> 概括核心问题及其业务影响，回答"为什么需要关注"

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **web-cli-base 框架与 LGDL 业务耦合**：`@lgdl/web-cli-base` 名义上是"AI-callable 命令执行框架"，但内部混有 9 个 LGDL 增量命令、LgdlOperation 协议、lgdl-web-cli 前缀解析、WEB_CLI_TOOL 工具定义、19 个 LGDL 领域符号注入面（`src/commands.ts:28-92`、`src/protocol.ts:44-52`、`src/tools.ts:12-54`、`src/exec.ts:40-65`），并非中性框架 | 框架无法承载第二个领域场景（当前 header 注释自认"LGDL as first adapter"，`web-cli-base/package.json:3`）；每加一个领域命令都在污染框架核心 | 框架与业务继续互相拖累：业务演进要动框架代码，框架中性化诉求被业务细节阻塞 |
| **包命名不对称**：6 个现有包（core/layout/render/router/cli/web）目录名无 lgdl 前缀（`packages/core` 等），与 lgdl-web-cli / lgdl-web-op-cli 的 lgdl-* 命名体系不一致 | 仓库内包身份识别混乱；新包 @lgdl/lgdl-web-cli 与旧包 @lgdl/web-cli-base 命名极易混淆（web-cli vs web-cli-base） | 命名歧义持续存在，文档/工具/新人认知成本累积 |
| **LGDL 业务分布散落**：LGDL 业务逻辑跨包散落（web-cli-base 的 commands/operations/protocol/help/tools/adapters + web 的 WEB_OP_TOOL/webOpHelp/next-actions/web-fetch + cli 的 9 命令调用），无单一业务归属 | "谁的业务归谁"原则无法落实；修改 LGDL 业务需横跨 3 个包排查 | 维护面继续扩大，V2 抽取窗口期过后再拆成本更高 |
| **web-fetch 平台能力滞留应用层**：`lgdl-web-fetch` 工具定义、协议解析、help 文案均留在 web 包（`provider.ts:261-289`、`web-fetch.ts:19-44`、`help.ts:126-137`），属平台级能力却未纳入框架 | base 框架缺一项通用基础工具；web 包承载平台能力与 React 应用态耦合 | 平台能力复用面受限（其他领域场景无法使用 fetch 工具） |

## 2. 现状基线盘点（文件:行号证据）

> 本 Feature 的"问题空间"是代码现状。以下为只读盘点，所有结论可复现。

### 2.1 包体系总览与重命名影响面

**包身份与依赖（7 个包，根 workspace 通配符）**

| 目录 | npm name | 依赖（dependencies） | 备注 |
|------|---------|---------------------|------|
| packages/core | `@lgdl/core`（package.json:2） | 零依赖（:3） | 语言核心 |
| packages/layout | `@lgdl/layout`（:2） | `@lgdl/core`（:18） | |
| packages/render | `@lgdl/render`（:2） | `@lgdl/core`、`@lgdl/layout`、`@lgdl/router`（:15-17） | |
| packages/router | `@lgdl/router`（:2） | 零依赖 | |
| packages/cli | `@lgdl/cli`（:2） | `@lgdl/web-cli-base`、`@lgdl/core`、`@lgdl/render`、commander（:14-17） | bin: lgdl-cli（:9） |
| packages/web | `@lgdl/web`（:2） | `@lgdl/web-cli-base`、`@lgdl/core`、`@lgdl/layout`、`@lgdl/render` + react/vite 等（:25-41） | private:true（:6） |
| packages/web-cli-base | `@lgdl/web-cli-base`（:2） | `@anthropic-ai/sdk`、`@lgdl/core`、openai（:21-24） | exports 含 `./lgdl` 子路径（:13-15） |

- **根 package.json**：`workspaces: ["packages/*"]`（:12-14，通配符，**无显式包列表**）；`dependencies: { "@lgdl/cli": "^0.5.0" }`（:19-21）。重命名后根依赖名需同步。
- **根 tsconfig.json**：references 列 5 包 `packages/core|layout|router|render|cli`（:3-7），**不含 web 与 web-cli-base**。
- **CI `.github/workflows/deploy-pages.yml`**：
  - 触发 paths：`packages/web/**`、`packages/core/**`、`packages/layout/**`、`packages/render/**`、`packages/web-cli-base/**`（:9-13，**未含 router/cli**）
  - build 步骤：`npm run build --workspace @lgdl/core --workspace @lgdl/layout --workspace @lgdl/render --workspace @lgdl/web-cli-base`（:38）→ 重命名后 workspace 名与 paths 均需改。
- **package-lock.json**：`@lgdl/cli`（:2643）、`@lgdl/core`（:2657）、`@lgdl/layout`（:2666）、`@lgdl/render`（:2675）、`@lgdl/router`（:2685）、`@lgdl/web`（:2691）、`@lgdl/web-cli-base`（:2719）七个 workspace 条目；根依赖 `@lgdl/cli`（:15）；`node_modules/@lgdl/` 下 7 个链接目录（cli/core/layout/render/router/web/web-cli-base）。重命名后需 `npm install` 重建 lock 与链接。
- **包内 scripts 对 workspace 名的引用**：`packages/web/package.json` predev 显式 `npm run build --workspace @lgdl/core --workspace @lgdl/layout --workspace @lgdl/router --workspace @lgdl/render`（:29-31）；web test 脚本显式列出 7 个测试文件路径（:24-26）。

**跨包 import 全量（packages/src，dist 为构建产物不列）**

| 被 import 的包 | 消费方（文件:行号） |
|---------------|-------------------|
| `@lgdl/core` | layout/src/index.ts:16；render/src/index.ts:7-8、ascii.ts:9-10、ascii.test.ts:4、svg.test.ts:4；cli/src/shared.ts:11、option-hints.ts:9、commands/{convert.ts:6, import.ts:5, init.ts:4, queries.ts:4, render.ts:6}；web-cli-base/src/{commands.ts:14, exec.ts:15-22, operations.ts:20-30, operations.test.ts:20, protocol.ts:23, protocol.test.ts:4, index.ts:25}；web/src/App.tsx:11 |
| `@lgdl/layout` | render/src/index.ts:9、ascii.ts:11、svg.test.ts:5；cli/src/commands/render.ts:6；web/src/App.tsx:12 |
| `@lgdl/render` | cli/src/commands/render.ts:7 |
| `@lgdl/router` | render/src/index.ts:10 |
| `@lgdl/web-cli-base` | cli/src/commands/{add,remove,update}-{node,edge,group}.ts 共 9 文件，均在 :4（`applyOperation, buildOperation`）；web/src/ai/{AiPanel.tsx:5（子路径 `@lgdl/web-cli-base/lgdl`）, lgdl-web.ts:10-11, provider.ts:16-19, web-fetch.ts:11} |
| `@lgdl/cli` | 根 package.json:20（用户侧 npm install -g，README.md:45-52、docs/cli-guide.md:7-10 有引用） |

> **关键发现**：cli 的 9 个增量命令直接依赖 `@lgdl/web-cli-base` 的 LGDL 业务符号（buildOperation/applyOperation）——V2 抽取后这些符号迁往 `@lgdl/lgdl-web-cli`，**cli 的依赖边会从 web-cli-base 改为 lgdl-web-cli**（详见 §3.2）。

### 2.2 web-cli-base 逐模块「留 base / 迁 lgdl-web-cli」清单

`packages/web-cli-base/src/` 共 9 个源文件 + 1 个测试目录文件组（6 个 .test.ts）。index.ts 头注释（:7-9）自述："index exports both framework core and the LGDL adapter singleton (transitional dual-surface export, ADR-003; to be converged at F-13 ②)" —— **F-13 ② 即本 V2 的收敛点**。

| 模块 | 机制部分（留 base） | LGDL 部分（迁 lgdl-web-cli） | 关键证据 |
|------|--------------------|------------------------------|---------|
| **index.ts**（37 行） | 框架核心导出（:10-31）：COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec、CommandSpec/KindResolver、describeOperation/createOperationApplier、WEB_CLI_TOOL、chat/parseToolArguments/classifyError、tokenizeCli/parseArgs/parseWebCliCommand/parseWebCliBatch、webCliHelp、createExecutor + DomainApi 等类型 | `LgdlOperation` re-export（:25）；适配单例导出（:33-37）：lgdlKindResolver/lgdlBuildOperation/lgdlApplier/lgdlDomain/lgdlExecutor + applyOperation/applyOperations 具名 | 双面导出注释 :7-9；LGDL 具名导出 :36-37 |
| **commands.ts**（298 行） | CommandSpec 接口（:17-26）；requireParams 校验（:103）；assertChangeRequested no-change 校验（:112）；KindResolver 类型（:124） | **COMMANDS 9 命令注册表**（:28-92，add/remove/update × node/edge/group）；KNOWN_PARAMS（:95-100，含 file/doc/图语义参数）；**defaultKindFor 领域语义**（:126-130，er/uml-class→entity、state→state、其余→process）；**buildOperation**（:139-236，产出 LgdlOperation）；parseAttrsSpec（:242，LgdlAttrs）；parseMemberSpec（:266，LgdlMember）；import @lgdl/core（:14） | 头注释 :2-13 明示"lgdl-cli 与 lgdl-web-cli 共享的业务逻辑层"；**buildOperation 被 cli 9 命令直接 import（cli/src/commands/*.ts:4）** |
| **operations.ts**（192 行） | createOperationApplier 注入工厂（:86-192，ADR-005 分派模式）；OperationBatchResult（:71-80） | describeOperation（:35-56，LgdlOperation 标签）；**LgdlOperation re-export**（:32）；OperationMutations 接口（:59-69，9 个 mutation 签名 + LgdlDocument/AddNodeOptions 等 LGDL 类型）；分派 switch 9 op 变体（:92-154，LGDL 协议形状）；import @lgdl/core（:20-30） | 任务书决策②"LgdlOperation 协议迁 lgdl-web-cli"→ 本模块整体随迁（含分派器；createOperationApplier 泛型化后是否回留 base 为 spec 决策点，见 §5.2 A-003） |
| **exec.ts**（387 行） | CommandExecResult（:27）；LineHandleResult（:68）；ExecutorOptions（:75-80）；Executor 接口（:82-95）；createExecutor 管线骨架（:101-370）；executeCommands 逐行管线（:283-341）；describeCommandLine 骨架（:344-367）；extractSingleSubcommand 结构（:373-387） | **DomainApi 接口（:40-65）——19 个 LGDL 领域符号**：parseLgdl/validate/serializeLgdl/applyOperation/applyOperations/formatStatus/templateForType/supportedTemplateTypes/convert/listFormats/buildOperation/listNodeKinds/queryDocInfo/queryNode/queryEdge/findNodes/DIAGRAM_TYPES/DIAGRAM_TYPE_LABELS/webCliHelp；LGDL 类型 import（:15-22，LgdlDocument/LgdlOperation/MutationResult/DiagramType/ParseResult/LgdlIssue）；**'lgdl-web-cli' 硬编码 21 处**（describeCommandLine 命令描述 :352-365、extractSingleSubcommand 前缀 :376、错误文案 :147/156/167 等） | 任务书决策①"DomainApi 泛型化 DomainApi<Op,Doc>"；管线内 lgdl 前缀硬编码需参数化后留 base |
| **protocol.ts**（291 行） | tokenizeCli（:160）；parseArgs（:184）；parseWebCliBatch 批量骨架（:231-290）；ParsedCommand/ParsedBatch 结构（:25-35/:210-229） | **'lgdl-web-cli' 前缀校验**（:44-52）；**17 个子命令枚举 switch**（:85-153：9 增量 + status/validate/init/convert + doc-info/get-node/get-edge/find-node/list-node-kinds/list-diagram-types）；--doc 语义（:70-82，对应 lgdl-cli --file）；错误文案含 lgdl-web-fetch（:151）；import buildOperation（:22）+ LgdlOperation（:23）；硬编码 17 处 | 任务书决策②"协议解析（lgdl 前缀）迁 lgdl-web-cli"→ 解析主体随迁 |
| **help.ts**（212 行） | HelpArg/HelpEntry 接口（:16-31）；webCliHelp 生成骨架（:152-211 的函数结构） | PARAM_DESC（:34-54，LGDL 图语义参数）；WEB_CLI_EXTRA 只读+特殊命令（:61-124）；INCR_EXAMPLES（:127-137，lgdl-web-cli 示例）；INCR_SUMMARIES（:140-150）；webCliEntryFor/webCliHelpOne/webCliHelp 文案（:152-211）；硬编码 27 处 | 任务书决策②"help 示例迁 lgdl-web-cli" |
| **tools.ts**（54 行） | —（无机制壳，工具定义即业务） | **WEB_CLI_TOOL 全量**（:12-54）：name `lgdl-web-cli`（:22）、19 子命令 enum（:35-43）；头注释（:7-9）说明 WEB_OP_TOOL/WEB_FETCH_TOOL 留 web（D-011，V2 后归属变化见 §3.3） | 任务书决策②"lgdl-web-cli 工具迁 lgdl-web-cli" |
| **llm.ts**（256 行） | **中性度核实：主体中性**。ChatTurn/LlmProviderInfo/LlmToolDef/LlmConfig（:12-70，无领域引用）；chat()（:76-202，OpenAI/Claude 双路径）；parseToolArguments（:205）；classifyError（:225） | **LGDL 耦合点**：ChatResult 三工具分流字段 toolCalls/opCalls/fetchCalls（:34-45）；chat() 按工具名过滤（:135-137、187-189、194-196，硬编码 lgdl-web-cli/lgdl-web-op-cli/lgdl-web-fetch）；注释提及 lgdl 工具名（:25）；硬编码合计 15 处 | 核实结论：llm.ts 主体可留 base，但三工具分流是 LGDL 应用形状，需决策（§5.2 A-004） |
| **adapters/lgdl.ts**（104 行） | —（组装单点，纯 LGDL） | **全量随迁**：lgdlKindResolver（:49）；lgdlApplier = createOperationApplier(9 mutations)（:56-66）；lgdlBuildOperation（:69-73）；lgdlDomain 19 符号组装（:76-96）；lgdlExecutor（:99）；具名导出 executeSubcommand/executeCommands/describeCommandLine（:102-104）；import @lgdl/core 19 符号（:21-46） | 任务书决策②；此文件即 lgdl-web-cli 新包的组装核心 |
| **测试 6 文件（82 用例）** | 保留机制侧用例 | commands.test.ts:14、operations.test.ts:9、protocol.test.ts:27、help.test.ts:4 基本随迁；exec.test.ts:22 拆分（管线留 base / LGDL 面随迁）；llm.test.ts:6 留 base（去分流耦合后调整） | 分布明细见 §4 |

### 2.3 web 包 op-cli / web-fetch 迁移面

**lgdl-web-op-cli 相关（14+ 命令元数据）**

| 位置 | 内容 | 迁移判定 |
|------|------|---------|
| provider.ts:205-255 | **WEB_OP_TOOL** 定义：name `lgdl-web-op-cli`（:216）；16 子命令 enum（:232-239：copy-source/toggle-editor/collapse-editor/expand-editor/export-svg/export-png/preview-zoom/preview-pan/preview-reset/preview-click/preview-hover/switch-example/list-examples/list-diagram-types/next-actions/help）+ args 说明（:241-250） | **纯元数据，可迁**（含 export 别名说明 :226） |
| help.ts:26-123 | **WEB_OP_ENTRIES 16 条命令元数据**（:27-89，含 export 别名 :34-39）+ webOpHelpOne/webOpHelp（:91-123） | **纯文本元数据，可迁**；注意 web/help.ts:9-24 与 base/help.ts:16-31 的 HelpArg/HelpEntry 接口**重复定义**，迁出时统一 |
| next-actions.ts:12-35 | NextAction 接口（:12-17）+ parseNextActions（:20-35，纯 JSON 解析校验） | **纯逻辑，可迁** |
| App.tsx:943-1055 | **handleWebOp 执行器 16 分支**：navigator.clipboard（:946）、setCopied（:947-949）、setAiCollapsed（:952-961）、downloadSvg/downloadPng（:963-967）、previewRef.current.zoomBy/wheelZoom/panBy/resetView（:979-1001）、jumpToIssue（:1006）、document.querySelector('.lgdl-hovered') DOM 操作（:1013-1021）、EXAMPLES/selectExample（:1024-1038）、webOpHelp（:1050） | **React 强耦合，留 web**——作为 handler 注入新包（任务书："执行 handler 由 web 注入"） |
| AiPanel.tsx:414-428 | op-cli 分发：next-actions → parseNextActions + appendMessage('assistant','','next-actions',actions) 胶囊卡片（:415-424）；其他 → onWebOp(tc.subcommand, tc.args)（:427） | **分发逻辑留 web**（React UI + App 注入）；卡片渲染 :226-228 留 web |
| prompts.ts:18-20/:40-43/:52/:64-65 | system prompt 中 lgdl-web-op-cli 描述与用法文案 | 文案面（web 侧组装），随工具/协议名同步调整 |
| 测试 | help.test.ts:4（webOpHelp 部分）、next-actions.test.ts:4 | 随迁（见 §4） |

> **协议现状发现**：web 侧**没有独立的 op 文本协议解析器**（web-cli 有 parseWebCliCommand / protocol.ts，op-cli 只有工具定义 + help 元数据 + AiPanel 结构化分发 + toolCallToCommand 展示字符串 :153-160）。任务书所说"op 协议"应指子命令枚举/参数 schema（WEB_OP_TOOL.parameters.enum + WEB_OP_ENTRIES），新包以此作为元数据契约。

**web-fetch 相关（中性化改名面）**

| 位置 | 内容 | 迁移判定 |
|------|------|---------|
| web-fetch.ts:19-44 | parseWebFetchCommand：前缀校验 `lgdl-web-fetch`（:24-29）、--path 必填校验（:35-40）、--help（:31-33） | 迁 base（协议解析），前缀中性化 |
| web-fetch.ts:54-79 | executeWebFetch：浏览器 fetch API（:67，`{ cache: 'no-store' }`）、错误归类（:69-77） | 迁 base 候选——Node 20+/浏览器均有全局 fetch，中性工具可行 |
| provider.ts:261-289 | **WEB_FETCH_TOOL** 定义：name `lgdl-web-fetch`（:271）、--path 必填（:280-286） | 迁 base（随工具中性化） |
| help.ts:126-137 | webFetchHelp 文案（lgdl-web-fetch） | 迁 base |
| lgdl-web.ts:16-28/:31-37 | handleFetchLine（line.startsWith('lgdl-web-fetch') :17）/ describeFetchLine（:32） | 前缀改名点；执行器经 exec 扩展点注入的模式不变（ADR-007） |
| AiPanel.tsx:154/:429-433 | toolCallToCommand 前缀映射（:154）；fetch 分发 executeWebFetch（:431） | 改名同步 |
| prompts.ts:20/:27-28/:43 | lgdl-web-fetch 引用文案 | 改名同步 |
| 测试 | web-fetch.test.ts:6 | 随迁改名 |

## 3. 三块抽取面迁移边界清单

### 3.1 抽取面 A：6 包重命名（core/layout/render/router/cli/web → lgdl-*）

| # | 改动点 | 现状证据 | 影响 |
|---|--------|---------|------|
| A1 | 目录重命名 `packages/core|layout|render|router|cli|web` → `packages/lgdl-*` | §2.1 包列表 | 全部相对路径 import 面（包内相对路径不变） |
| A2 | 各包 package.json name：`@lgdl/core` → 新名（scoped 形式推测 `@lgdl/lgdl-core`，见 §5.2 A-001 待 spec 确认） | §2.1 | workspace 解析、exports 子路径 |
| A3 | 全部跨包 import 改源（§2.1 表 6 行） | §2.1 | layout/render/cli/web/cli 内 ~30 处 import 语句 |
| A4 | 根 package.json dependencies `@lgdl/cli`（:20） | 根 package.json:19-21 | 根依赖名 |
| A5 | package-lock.json 7 个 workspace 条目 + node_modules/@lgdl 链接 | §2.1 | `npm install` 重建 |
| A6 | CI deploy-pages.yml：build workspace 名（:38）+ 触发 paths（:9-13） | §2.1 | 部署流水线 |
| A7 | 测试脚本 workspace 引用：web/package.json predev（:29-31） | §2.1 | predev 构建链 |
| A8 | 根 tsconfig references（:3-7，5 包路径） | §2.1 | 项目引用 |
| A9 | 文档面（不改也行，建议同步）：README.md:45-52、docs/cli-guide.md:7-10 中 `@lgdl/cli`；docs/research/edge-routing/* 中 `@lgdl/router` 引用（11 处，纯历史调研文档） | §2.1 | 文档一致性 |
| A10 | **bin 名 `lgdl-cli` 保持不变**（cli/package.json:9）——工具命令名是用户接口，不在重命名面 | cli/package.json:9 | 无 |

### 3.2 抽取面 B：lgdl-web-cli 新包（@lgdl/lgdl-web-cli）

**迁出源 = web-cli-base（§2.2 表格 LGDL 列）+ web 侧 webCliHelp 相关**。新包内容：

1. **9 个增量命令**：COMMANDS 注册表 + buildOperation + requireParams/assertChangeRequested + parseAttrsSpec/parseMemberSpec（commands.ts LGDL 面）
2. **LgdlOperation 协议**：operations.ts 全量（describeOperation + OperationMutations + createOperationApplier + 分派 switch）+ 自 lgdl-core re-export 类型
3. **lgdl-web-cli 工具**：WEB_CLI_TOOL（tools.ts 全量）
4. **协议解析（lgdl 前缀）**：protocol.ts 的 parseWebCliCommand/parseWebCliBatch + 前缀校验 + 17 子命令枚举（tokenizeCli/parseArgs 留 base 或随迁由 spec 定）
5. **help 示例**：help.ts 的 LGDL 面（PARAM_DESC/WEB_CLI_EXTRA/INCR_EXAMPLES/INCR_SUMMARIES/webCliHelp）
6. **全部依赖 lgdl-core 的类型**：DomainApi 19 符号 + LgdlDocument 等（exec.ts LGDL 面 + adapters/lgdl.ts 组装单点全量）
7. **消费方接线**：
   - `cli/src/commands/*.ts:4`（9 文件）import 源 `@lgdl/web-cli-base` → `@lgdl/lgdl-web-cli`（**cli 依赖边变更**，见 R2）
   - `web/src/ai/{AiPanel.tsx:5, lgdl-web.ts:10-11, provider.ts:16-17}` import 源更新
8. **base 纯化配套**（本抽取面的另一面）：
   - DomainApi → 泛型 `DomainApi<Op,Doc>`（exec.ts:40-65 具体化；19 符号的具体 DomainApi 实例随 adapters 迁出）
   - 去除 `@lgdl/core` 依赖（base/package.json:22）
   - 注册表机制保留但不含具体命令（commands.ts 仅留 CommandSpec/KindResolver 等机制壳）
   - exec.ts/protocol.ts/help.ts 中 65 处 'lgdl-web-cli' 硬编码（21+17+27）参数化或随迁

### 3.3 抽取面 C：lgdl-web-op-cli 新包（@lgdl/lgdl-web-op-cli）+ web-fetch 归位

**迁出源 = web 包（§2.3）**。新包内容：

1. **WEB_OP_TOOL**（provider.ts:205-255 全量）+ **WEB_OP_ENTRIES/webOpHelp**（help.ts:26-123 全量）
2. **next-actions**（next-actions.ts 全量：NextAction + parseNextActions）
3. **op 协议**：子命令枚举/参数 schema 契约（工具定义 parameters + help 元数据统一为单一数据源）
4. **执行 handler 注入**：新包定义执行签名（如 `OpHandler`/注册表），**不含 React 实现**；App.tsx:943-1055 的 16 分支执行体 + AiPanel 胶囊卡片留 web，由 web 注入
5. **web-fetch 归 base**：
   - WEB_FETCH_TOOL（provider.ts:261-289）→ base（中性化 name `web-fetch`）
   - parseWebFetchCommand/executeWebFetch（web-fetch.ts）→ base
   - webFetchHelp（help.ts:126-137）→ base
   - 改名联动：lgdl-web.ts:17/:32 前缀判断、AiPanel.tsx:154/:431、prompts.ts:20/:27-28/:43、web-fetch.test.ts
6. **web 接线**：provider.ts chat() 三工具组装（:328-357，Claude 3 工具 / OpenAI 2 工具 W-D1 现场保留 :326）改为引用新包工具定义；AiPanel 三工具分发（:395-443）维持，import 源更新

## 4. 测试基线

### 4.1 当前分布（实测，`\btest\(` 词边界计数）

| 包 | 测试文件 | 用例数 | 合计 |
|----|---------|--------|------|
| web-cli-base | commands.test.ts / exec.test.ts / help.test.ts / llm.test.ts / operations.test.ts / protocol.test.ts | 14 / 22 / 4 / 6 / 9 / 27 | **82** |
| web | ai/help.test.ts / ai/lgdl-web.test.ts / ai/next-actions.test.ts / ai/provider.test.ts / ai/web-fetch.test.ts / locate.test.ts / snap.test.ts | 4 / 2 / 4 / 14 / 6 / 10 / 8 | **48** |
| core | mutations.test.ts / parser.test.ts | 208 / 52 | **260**（用户基线记 258，差 2 为计数口径差异，见下） |
| router | router.test.ts | 8 | 8 |
| render | ascii.test.ts / svg.test.ts | 14 / 7 | 21 |
| layout | 无 src 测试文件（test 脚本 `node --test dist/**/*.test.js` 为空集） | 0 | 0 |
| cli | 无 src 测试文件（同上） | 0 | 0 |

- **用户基线 388 = 82 + 48 + 258**；实测 390 = 82 + 48 + 260。差异在 core（258 vs 260），属 `test(` 计数口径差异（无 test.only/skip/多 test 同行），**不影响守恒原则**——本 Feature 只搬家不删测试。
- 测试运行方式：web-cli-base/render/core 走 `tsc src/*.test.ts → node --test dist-test/*.test.js`（web-cli-base/package.json:11）；web 走显式文件列表 tsc + node --test（web/package.json:24-26）；cli/layout 走 `node --test dist/**/*.test.js`（当前无用例）。

### 4.2 V2 后预估分布（守恒重算）

| 包 | 迁入/迁出 | 预估用例 |
|----|----------|---------|
| lgdl-core | 纯改名，0 变化 | 260 |
| **lgdl-web-cli（新）** | 迁入：commands.test 14 + operations.test 9 + protocol.test 27 + help.test 4（webCliHelp 面）+ exec.test 的 LGDL 面 + web/ai/lgdl-web.test 2 + tools 相关（新增） | **~62-72** |
| **lgdl-web-op-cli（新）** | 迁入：web/ai/help.test 的 webOpHelp 面 + next-actions.test 4 + WEB_OP_TOOL 元数据（新增） | **~6-10** |
| web-cli-base（纯化） | 保留：llm.test 6（去分流耦合后）+ exec.test 机制面 + protocol 的 tokenize/parseArgs 面；**迁入**：web-fetch.test 6（中性化 web-fetch） | **~18-26** |
| web | 保留：provider.test 14 + locate.test 10 + snap.test 8 + 三工具分发接线（新增） | **~32-38** |
| router / render / layout | 改名，0 变化 | 29 |
| **合计** | 守恒：388 基线 → V2 后 ≥ 388（预估 407-435，含新增接线/元数据测试） | **~407-435** |

> 说明：预估区间基于"测试随业务搬家 + 断言按改名调整 + 新增接线测试"，不承诺具体值；**守恒底线 = 无测试因重构而删除**（V2 后分布 ≥ 388）。

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-001 | **新 npm 名采用 scoped 形式 `@lgdl/lgdl-core` 等**（沿用 @lgdl scope + lgdl- 前缀，与任务书明确写的 `@lgdl/lgdl-web-cli`/`@lgdl/lgdl-web-op-cli` 模式一致）；任务书原文 "core → lgdl-core" 未显式写 scope | spec 阶段确认（影响 A1-A8 全部改动） |
| A-002 | bin 名 `lgdl-cli` 与命令前缀 `lgdl-web-cli`/`lgdl-web-op-cli`/`lgdl-web-fetch`（协议文本）**不随包名变化**——工具命名是 AI/用户可见接口，抽取不改协议文本格式 | spec 阶段确认；若协议文本也随前缀改名则影响面扩大至 prompts/测试文案 |
| A-003 | createOperationApplier 的归属：operations.ts 整体随 LgdlOperation 迁出；其**泛型化版本是否回留 base**（作为通用注入分派器）由 spec 决策——两种方案都可行，但影响 base 纯化后的导出面 | spec 阶段决策 |
| A-004 | llm.ts 的 ChatResult 三工具分流（toolCalls/opCalls/fetchCalls）是 LGDL 应用形状；base 中性化需重构为**通用 tool-call 列表**或保留分流字段 | spec 阶段决策；若重构，provider.ts/AiPanel 消费方（:395）同步改 |
| A-005 | core 测试基线按实测 260 计（用户 258 为口径差异），守恒对比基准取 388 | 基线复核（validate 阶段） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R1 | **命名约定不明确**（A-001）：若 scoped 形式推断错误，A1-A8 全部改动返工；@lgdl/lgdl-core 的 "lgdl" 双写是否可接受需作者确认 | 高 |
| R2 | **cli 依赖边变更**：cli 9 命令从 `@lgdl/web-cli-base` 改依赖 `@lgdl/lgdl-web-cli`（cli/src/commands/*.ts:4）；新包若依赖 lgdl-core，则依赖链 cli→lgdl-web-cli→lgdl-core 与 cli→lgdl-core 并存，需确认无循环且 web-cli-base 纯化后不再依赖 lgdl-core（base/package.json:22 移除） | 高 |
| R3 | **硬编码字符串面（86 处）**：exec 21 + protocol 17 + help 27 + tools 6 + llm 15 处 'lgdl-web-cli' 等字符串；base 纯化需全部参数化/随迁，协议文本与描述文案的测试断言同步改动 | 中高 |
| R4 | **llm.ts 分流耦合**（A-004）：ChatResult 三字段是 AiPanel 分发（:395）的直接依赖，重构需同步改消费方，回归风险集中在 provider.test.ts:14 与 AiPanel 接线 | 中 |
| R5 | **web 测试脚本显式文件列表**（web/package.json:24-26）：迁移后文件集合变化，脚本需重列，漏改则 CI 测试缺失 | 中 |
| R6 | **predev 构建链**（web/package.json:29-31）与 CI build（deploy-pages.yml:38）的 workspace 名引用：与重命名 A6/A7 强绑定，漏改则 dev/CI 断裂 | 中 |
| R7 | **dist 产物与 node_modules 链接**：重命名后旧 @lgdl/web-cli-base 链接残留，`npm install` + 全量 rebuild 为一次性动作，遗漏则 import 解析到旧包 | 低 |
| R8 | **文档面滞后**：README/docs/cli-guide/research 的包名引用（§2.1 A9），不改不影响构建但影响一致性 | 低 |
| R9 | **op-cli 无独立文本协议解析器**（§2.3 发现）：新包需从"元数据 + 分发"反推协议契约，若 spec 要求 op 文本命令解析（lgdl-web-op-cli 前缀文本行），属于**新增能力而非抽取**，需明确范围 | 低（范围清晰即可消解） |

### 5.3 作者已裁决项（决策闭环记录，来源 state.json notes）

1. ① base 不依赖 lgdl-core，相关类型迁 lgdl-web-cli；
2. ② op-cli 业务合理即独立，不管薄厚；
3. ③ web-fetch 归 web-cli-base 通用化；
4. ④ 谁的业务归谁，lgdl 命令归 lgdl-web-cli。
本阶段不重新讨论以上裁决。

## 6. 约束清单

| # | 约束 | 依据 |
|---|------|------|
| C1 | 本 Feature 只做**重构与抽取**，不新增任何业务功能 | state.json scope.out |
| C2 | lgdl-core 等语言核心包**仅改名不动语义** | state.json scope.out |
| C3 | web-cli-base 保持中性名（公共框架，类似 Spring），**不依赖 @lgdl/core** | 作者决策① + state.json notes |
| C4 | 测试守恒：V2 后分布 ≥ 388 基线（只搬家不删测试） | 任务书 + state.json scope.in |
| C5 | 开源决策（v1.1 范畴）不在本 Feature | state.json scope.out |
| C6 | 执行 handler（React 面）由 web 注入，lgdl-web-op-cli 包内纯协议/元数据 | 任务书决策 3 |
| C7 | 一个 Feature 内部 task 分工：重命名 + 抽取一体交付，全流程自主执行 | state.json notes |

## 7. 待答问题说明

**无待答问题**：作者 2026-08-31 决策已闭环（§5.3 四项裁决），本阶段为基线盘点而非访谈，不需要向用户追问。

遗留 **3 项 spec 阶段确认点**（非待答问题，属 spec 决策输入，已在 §5.1 标注）：
- A-001：新包名 scoped 形式确认（@lgdl/lgdl-core 等）；
- A-003：createOperationApplier 泛型化后是否回留 base；
- A-004：llm.ts 三工具分流字段去耦方式。

## 8. Feature 拆分建议

任务书已含作者拆分明细（重命名 / lgdl-web-cli / lgdl-web-op-cli / base 纯化 / web 接线），本阶段检测到与其一致的拆分模式，**建议已采纳、无需用户再确认**：

- **框架 + 业务适配模式**（等价于"管理后台+用户端"类模式）：web-cli-base（中性机制框架）← lgdl-web-cli（图内容业务适配）/ lgdl-web-op-cli（UI 操作业务适配）——§2.2/§2.3 的留/迁清单即该拆分的落地边界；
- **平台能力归位模式**：web-fetch 从 web 应用层归位 base 通用工具（§3.3）。

## 9. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | 进入 spec 阶段，先确认 §7 三项确认点（A-001 命名 scoped 形式优先） | 命名决定 A1-A8 全部改动形态，是 spec 的第一输入 |
| 高 | spec 按 §3 三块抽取面组织需求：重命名（A1-A9）/ lgdl-web-cli（B1-B8）/ op-cli+web-fetch（C1-C6） | 边界清单已具备文件:行号证据，可直接落 spec |
| 中 | spec 阶段裁决 R2（cli 依赖边）与 R9（op 文本协议是否新增） | 影响包依赖图与范围界定 |
| 中 | 测试基线按 §4.2 重算分布并写进 spec 的测试守恒要求 | 388 守恒底线 + 预估 407-435 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：现状基线盘点（重命名影响面 / web-cli-base 逐模块留迁 / op-cli+web-fetch 迁移面 / 测试基线）、三块抽取面迁移边界、风险与约束清单、无待答问题说明 | 2026-08-31 | SDDU Discovery Agent |
