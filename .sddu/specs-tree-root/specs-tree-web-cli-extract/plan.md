# 技术计划：specs-tree-web-cli-extract（F-13 ① web-cli 独立包抽取）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md（需求规范，11 FR / 7 NFR / 10 EC / AC-001~010 / 决策 D-010~D-013）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建（基于 discovery 基线文件:行号 + spec 决策 D-010~D-013，全自主执行，作者指令已闭环）

---

## 1. 前置检查
> 启动技术规划前必须验证的前置条件
| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在 | ✅（`.sddu/specs-tree-root/specs-tree-web-cli-extract/spec.md`，206 行） |
| 外部 API 文档缓存 | ⚠️ 不适用（纯内部代码抽取，无外部服务依赖；LLM 客户端依赖 openai/anthropic SDK 为既有依赖，不新增） |
| 前置依赖已满足 | ✅（discovery.md 基线核实完成；作者指令已闭环、零访谈；F-04/F-05 排布门禁由 build 阶段执行前确认） |

**基线核实说明**：本 plan 所有文件:行号均基于 2026-08-31 只读探查的实际源码（与 discovery 基线一致，并修正/细化若干处：AiPanel.tsx/SettingsPanel.tsx 实际位于 `web/src/ai/` 下；cli 涉迁 import 实为 9 处而非 13 处——queries/option-hints/shared/convert/init/import 均为领域符号留 core；ops.ts 直调领域符号实为 19 个而非 13 个）。

## 2. 架构分析
> 分析现有架构影响和需要的新组件

### 2.1 现有架构与影响面

| 包 | 依赖 | 与本次抽取的关系 |
|----|------|----------------|
| @lgdl/core | 零依赖（core/package.json 无 dependencies） | 迁出面：commands.ts（注册表）、operations.ts（操作协议）；保留面：领域类型/函数（Q-006/Q-007） |
| @lgdl/cli | → core, render, commander | 引用切换面：9 个 mutation 命令（add-node.ts:4 等，`applyOperation`/`buildOperation`）；shared/queries/option-hints/convert/init/import 为领域符号留 core |
| @lgdl/web | → core, layout, render + openai/anthropic/react | 接线迁出面：ops.ts / provider.ts / web-cli.ts / help.ts；UI 引用切换面：AiPanel.tsx:5-6、App.tsx:19-20、SettingsPanel.tsx:4-12 |
| @lgdl/layout / render / router | — | 不涉及 |

抽取对象三件套 + 接线（Q-001~Q-005/Q-009）已由 discovery §4 与 spec §5 明确定界，此处不重复。

### 2.2 新包命名（候选 + 推荐）

> 约束：C-005（开源细节不决策，属 F-13 ②）+ 用户指令「命名应中性、不绑定 LGDL 前缀——本步只给推荐不预设」

| 候选 | 包名（workspace 内） | 定位契合 | 中性度 | 备注 |
|------|--------------------|---------|--------|------|
| **A（推荐）** | `@lgdl/ai-command-kit` | 高：「AI 可调用命令执行框架」= 命令注册表 + 执行管线 + tools schema + 协议解析 + help 自文档，恰为「command kit」全集 | 高（开源名 `ai-command-kit`，无 LGDL 字样） | kebab-case 与既有六包命名风格一致；scope 仅作 monorepo 内部命名空间，开源时剥离 |
| B | `@lgdl/command-exec` | 中：偏「执行引擎」，覆盖注册表/协议/help 面稍弱 | 高（开源名 `command-exec`） | 语义窄于框架完整定位 |
| C | `@lgdl/agent-toolkit` | 中：偏「agent 工具面」，与 tools schema 契合但弱化命令执行 | 高（开源名 `agent-toolkit`） | 与「命令执行」主题偏泛 |

**推荐 A：`@lgdl/ai-command-kit`**。理由：① 完整覆盖「AI 可调用命令执行框架」四件套定位；② 中性命名（ai-command-kit 不绑定 LGDL 领域语义），v1.1 独立开源可同名或去 scope 直接发布，不与 LGDL 品牌耦合；③ 与既有包风格（core/layout/router/render/cli/web）一致。⚠️ 最终命名决策归 F-13 ② 作者决策（C-005），本步为推荐不预设；tasks/build 阶段按本推荐实施，若作者后续变更仅涉及包名替换（dependencies/exports/import 面），不改变结构设计。

### 2.3 新包结构与模块设计

```
packages/ai-command-kit/
├── package.json          # name: @lgdl/ai-command-kit; type: module; dependencies: @lgdl/core
├── tsconfig.json         # 参考 packages/layout/tsconfig.json 模式
└── src/
    ├── index.ts          # 框架导出面（含 LGDL 适配单例，过渡形态见 ADR-003）
    ├── commands.ts       # 注册表底座（迁自 core/src/commands.ts:26-289，defaultKindFor 注入化见 ADR-004）
    ├── operations.ts     # 操作协议（迁自 core/src/operations.ts:31-220，分派器注入化见 ADR-005）
    ├── exec.ts           # 执行骨架（迁自 web/src/ai/ops.ts:34-44,80-331,351-376，DomainApi 注入见 ADR-006）
    ├── protocol.ts       # 协议解析（迁自 web/src/ai/web-cli.ts:23-289，不含 fetch 部分）
    ├── help.ts           # help 自文档（迁自 web/src/ai/help.ts:13-209 的 webCliHelp 面）
    ├── tools.ts          # WEB_CLI_TOOL schema（迁自 web/src/ai/provider.ts:282-324）
    ├── llm.ts            # LLM 客户端（迁自 provider.ts:196-229,392-547，中性化改造）
    ├── adapters/
    │   └── lgdl.ts       # LGDL 首个适配场景单点（ADR-003）：lgdlKindResolver / lgdlBuildOperation / lgdlApplier / lgdlDomain / lgdlExecutor
    ├── commands.test.ts  # 随迁 core/src/commands.test.ts（14 例）
    ├── operations.test.ts# 随迁 core/src/operations.test.ts（9 例）
    ├── exec.test.ts      # 随迁 web/src/ai/ops.test.ts 中 22 例
    ├── protocol.test.ts  # 随迁 web/src/ai/web-cli.test.ts 中 27 例
    ├── help.test.ts      # 随迁 web/src/ai/help.test.ts 中 webCliHelp 4 例
    └── llm.test.ts       # 随迁 web/src/ai/provider.test.ts 中 6 例
```

**模块职责与迁移源对照**：

| 新包模块 | 迁移源（文件:行号） | 迁入后的改造点 |
|---------|-------------------|---------------|
| commands.ts | core/src/commands.ts:26-289（COMMANDS/KNOWN_PARAMS/requireParams/assertChangeRequested/buildOperation/parseAttrsSpec/parseMemberSpec） | ① `defaultKindFor`（:223-227）不再内嵌导出，转为 `buildOperation` 第 4 参 `kindResolver?` 注入（ADR-004）；② `LgdlOperation` 类型 import 目标由 `./operations.js` 改为 `@lgdl/core`（保类型，D-013）；③ `LgdlMember/LgdlAttrs` 类型同改 `@lgdl/core` |
| operations.ts | core/src/operations.ts:31-220（LgdlOperation/describeOperation/applyOperation/applyOperations/OperationBatchResult） | ① 9 个 mutation 不再 import（operations.ts:16-27 删除），改为 `createOperationApplier(mutations)` 注入工厂（ADR-005）；② `LgdlDocument/NodeKind/LgdlMember/LgdlAttrs` 类型 import 目标改为 `@lgdl/core` |
| exec.ts | web/src/ai/ops.ts:34-44（CommandExecResult）、:80-253（executeSubcommand 管线）、:260-331（executeCommands 循环）、:351-376（describeCommandLine） | ① 19 个领域符号直调（ops.ts:10-30）改为 `createExecutor(domain: DomainApi, options?)` 注入面（ADR-006）；② executeCommands 增 `handleLine` 扩展点（fetch 行处理器由 web 侧注入，ADR-007）；③ `webCliHelp` 引用改自新包 help.ts |
| protocol.ts | web/src/ai/web-cli.ts:23-289（ParsedCommand/tokenizeCli/parseArgs/parseWebCliCommand/parseWebCliBatch/ParsedBatch） | ① `buildOperation` import（:20-21）改自新包 commands.ts（未注入 resolver = 现状行为，见 ADR-004）；② 前缀 `lgdl-web-cli` 保留为默认配置（可参数化，见 ADR-004 默认原则）；③ `parseWebFetchCommand/ParsedWebFetch`（:291-327）**不迁入**（web fetch 留 web，ADR-007） |
| help.ts | web/src/ai/help.ts:13-209（HelpArg/HelpEntry/PARAM_DESC/WEB_CLI_EXTRA/INCR_EXAMPLES/INCR_SUMMARIES/webCliEntryFor/webCliHelpOne/webCliHelp） | ① `COMMANDS` import（:11）改自新包自身注册表（R-009 单一数据源闭环）；② `WEB_OP_ENTRIES/webOpHelp/webFetchHelp`（:212-322）**不迁入**（留 web，ADR-007） |
| tools.ts | web/src/ai/provider.ts:282-324（WEB_CLI_TOOL） | 逐字节搬运，name/description/parameters 零改动（FR-004 验收：schema 逐字节不变） |
| llm.ts | web/src/ai/provider.ts:196-229（ChatTurn/WebCliToolCall/ChatResult）、:392-527（chat 双路径）、:530-547（parseToolArguments）、:550-581（classifyError） | ① `ProviderSettings`/`ProviderConfig`（web 应用态）不迁入，chat 改收中性 `LlmConfig`（含 `provider: LlmProviderInfo`）；② `PROVIDERS`（:41-50）、localStorage Key 管理（:62-194）、`testConnection`（:371-386）留 web（ADR-007）；③ web 侧 chat 薄包装保持 `chat(settings, turns)` 签名，AiPanel.tsx:390 调用点不变 |
| adapters/lgdl.ts | 新建（LGDL 首个适配场景组装） | `lgdlKindResolver`（= 现状 defaultKindFor 逻辑逐字节，commands.ts:223-227）；`lgdlApplier = createOperationApplier(9 mutations)`；`lgdlDomain`（19 领域符号 + applier + buildOperation + webCliHelp）；`lgdlExecutor = createExecutor(lgdlDomain)` |

### 2.4 依赖方向

```
core（零依赖） ← ai-command-kit（dependencies: @lgdl/core） ← cli / web
```

- **单向**：新包 → @lgdl/core（D-013 决策，保类型契约：LgdlOperation/LgdlDocument/NodeKind/LgdlMember/LgdlAttrs 类型引用不变）；
- **core 保持零依赖**：core/package.json 不新增 dependencies（NFR-003 验收）；
- **无环**：core 删除迁出符号（FR-009），不 re-export 新包任何符号（EC-002 红线）；cli/web → 新包 → core 为线性链；
- **新包不反向依赖 web/cli**（NFR-003）：web fetch 平台能力（fetch/parseWebFetchCommand/executeWebFetch）留在 web，经 `handleLine` 扩展点注入（ADR-007），新包 exec.ts 不含 fetch 分支。

### 2.5 关键机制设计

#### 2.5.1 执行层管线迁移（executeSubcommand → buildOperation → applyOperation → validate → serialize）

- **迁入后管线形态不变**：`createExecutor(domain)` 返回的 `executeSubcommand` 内部仍是 `parseLgdl → 只读命令分派 → buildOperation → applyOperation → validate → serializeLgdl`（ops.ts:99-252 逐行复制），仅领域符号从 import 改为 `domain` 注入参数引用；
- **失败即停语义保持**：`executeCommands` 逐行循环（ops.ts:269-329）与 `applyOperations` 首个失败即停（operations.ts:199-220）行为不变；
- **零语义改动保障**：管线分支（help 优先 :92-95、只读命令 :105-202、增量命令 :204-252）逐字节复制，不重写任何逻辑分支（A-002「适配器注入，不改行为」）；
- **扩展点**：`executeCommands` 增可选 `options.handleLine`（fetch 行处理），不注入时行为 = 仅处理 web-cli 行（框架中性默认），LGDL web 侧注入 fetch 处理器后行为 = 现状（ops.ts:271-293 逐字节复制到 web 侧组装层，ADR-007）。

#### 2.5.2 COMMANDS 注册表迁出与 cli 引用切换

- **迁移面**：core/src/commands.ts:26-289 全量迁入新包 commands.ts（defaultKindFor 除外，见 2.5.3）；
- **cli 切换面（实测 9 处，非 discovery 所述 13 处）**：`packages/cli/src/commands/{add-node,remove-node,update-node,add-edge,remove-edge,update-edge,add-group,remove-group,update-group}.ts` 各 :4 `import { applyOperation, buildOperation } from '@lgdl/core'` → `from '@lgdl/ai-command-kit'`。**diff = 仅包名**：新包 index.ts 同时导出框架 `buildOperation`（注入面默认 = 现状行为）与 LGDL 适配单例 `applyOperation`（lgdlApplier 实例），符号名不变 → cli 9 命令调用点零改动（ADR-003 双面导出的价值）；
- **不切换面**：queries.ts:4（queryStatus 等 6 查询）、option-hints.ts:9（listFormats）、shared.ts:5-11（parseLgdl/validate/serializeLgdl/LgdlDocument/MutationResult）、convert.ts:6、init.ts:4、import.ts:5 均为领域符号 → 留 `@lgdl/core`，零改动；
- **原子落地**（EC-001）：cli 引用切换与 core 导出面收敛必须同一 commit（M8/M10 连续执行，build 门禁拦截任何一方先行）。

#### 2.5.3 defaultKindFor 注入化（Q-010 / D-010 落地）

- **现状**：`commands.ts:223-227` defaultKindFor（er/uml-class→entity、state→state、默认 process），被 buildOperation 内部 :141 调用；
- **设计**：新包 `buildOperation(command, args, docType?, kindResolver?)`——第 4 参可选 `kindResolver: (docType?: string) => string`；**内置默认 resolver = 现状 defaultKindFor 逻辑逐字节复制**（未注入 = 现状行为，符合 D-010「未注入时回退到默认实现」）；
- **显式注入**：新包 `adapters/lgdl.ts` 导出 `lgdlKindResolver`（同逻辑）+ `lgdlBuildOperation`（预注入 resolver），LGDL 调用方经适配单例显式使用，保证「适配层提供」语义；
- **零语义改动验证**：`buildOperation('add-node', {id}, 'er')` 注入/未注入均得 `kind: 'entity'`；随迁 commands.test.ts 14 例全绿即证（其中 defaultKindFor 相关用例调整 import 目标为新包 adapters 导出）。

#### 2.5.4 tools schema 迁出范围（Q-011 / D-011 落地）

- **迁入新包**：仅 `WEB_CLI_TOOL`（provider.ts:282-324，lgdl-web-cli，18 子命令 enum）→ tools.ts；name/description/parameters 逐字节零改动；
- **留 web**：`WEB_OP_TOOL`（:232-281，UI 操作）、`WEB_FETCH_TOOL`（:330-358，平台 fetch）——provider.ts 保留二者定义与注册组装（:405-420 Claude 3 工具 / :504 OpenAI 2 工具注册面留 web，避免移动 F-04 修复点 W-D1，R-006）；
- **注册组装留 web**：Claude 路径引用新包 WEB_CLI_TOOL（import 目标切换），OpenAI 路径同；工具名不变 → prompts.ts LGDL_SYSTEM_PROMPT 三工具协议描述不受影响（NFR-005）。

#### 2.5.5 web 接线随迁与拆分（Q-009/Q-012 / D-012 落地 + ADR-007）

| 原文件 | 迁入新包 | 留 web（重组） |
|--------|---------|--------------|
| ops.ts（376 行） | exec.ts（executeSubcommand/executeCommands/describeCommandLine 骨架 + CommandExecResult） | `web/src/ai/web-fetch.ts`（executeWebFetch，ops.ts:52-71，用平台 fetch :59）+ `web/src/ai/lgdl-web.ts`（fetch 行处理器，ops.ts:271-293 逻辑 + 透传 lgdlExecutor 单例） |
| provider.ts（581 行） | tools.ts（WEB_CLI_TOOL）+ llm.ts（chat/parseToolArguments/classifyError/ChatTurn/WebCliToolCall/ChatResult） | provider.ts 保留 PROVIDERS（:41-50）/ProviderSettings/localStorage Key 管理（:62-194）/WEB_OP_TOOL/WEB_FETCH_TOOL/testConnection + `chat(settings, turns)` 薄包装（构造 LlmConfig 调新包 chat） |
| web-cli.ts（327 行） | protocol.ts（:23-289 解析骨架） | web-fetch.ts（parseWebFetchCommand/ParsedWebFetch，:291-327） |
| help.ts（322 行） | help.ts（webCliHelp 面，:13-209） | help.ts 保留 webOpHelp/webFetchHelp（:212-322） |

**UI import 切换**：
- `AiPanel.tsx:5`：`from './ops'` → `from '@lgdl/ai-command-kit/lgdl'`（executeSubcommand）+ `from './web-fetch'`（executeWebFetch）；:6 仍 `from './provider'`（chat 包装保留同名导出）；:390/:430/:435 调用点不变；
- `App.tsx:19-20`：不变（loadSettings/saveSettings/webOpHelp 留 web）；
- `SettingsPanel.tsx:4-12`：不变（provider 留 web 部分）。

### 2.6 数据流变更与依赖关系图

```
【迁移前】                                          【迁移后】
AiPanel ──chat──▶ provider.chat                    AiPanel ──chat──▶ web provider.chat(包装) ──▶ 新包 llm.chat
   │                                                    │
   ├─▶ ops.executeSubcommand ──▶ @lgdl/core            ├─▶ 新包 lgdlExecutor.executeSubcommand ──▶ domain(注入) ──▶ @lgdl/core 领域
   │      （直调 19 个领域 API）                        │         └─▶ 新包 buildOperation ──▶ kindResolver(注入)
   └─▶ ops.executeWebFetch（平台 fetch）                └─▶ web executeWebFetch（平台 fetch，留 web）
cli 9 命令 ──▶ @lgdl/core                                cli 9 命令 ──▶ @lgdl/ai-command-kit（buildOperation + lgdlApplier.applyOperation）
  （applyOperation/buildOperation）                           └─▶ @lgdl/core（领域：parse/validate/serialize/mutations 经注入）
```

## 3. 方案对比
> 2-3 个可行方案的对比分析（对比主题：**LGDL 适配层落位**——R-003/R-004 解耦的核心决策）

| 维度 | 方案 A：新包内建 adapters/lgdl.ts 单点 + index 双面导出 | 方案 B：适配层放各调用方（cli/web 各自组装） | 方案 C：新包内建 adapter + 子路径 exports（严格分层） |
|------|:--|:--|:--|
| 描述 | 新包 `adapters/lgdl.ts` 承载 LGDL 首个适配场景（kindResolver/applier/domain/executor 单例）；index.ts 同时导出框架核心与 LGDL 适配单例（过渡形态） | cli 建 `src/lgdl-adapter.ts`、web 建 `ai/lgdl-adapter.ts`，各自 import @lgdl/core 组装 domain/applier | 同 A 的 adapter 位置，但 index.ts 只导框架核心；LGDL 适配经 package.json exports 子路径 `./lgdl` 暴露 |
| 优点 | 适配单点不重复；cli 切换 diff 最小（9 处仅换包名）；执行路径最接近现状 | 新包 index 纯净（零 LGDL 痕迹）；「LGDL 侧提供适配」字面最贴合 C-004 | 框架核心面纯净 + 适配显式；开源时 exports 面已收敛 |
| 缺点 | 新包 index 含 LGDL 适配导出（框架与适配同面）；NFR-004「新包无领域实现」验收需按「核心 vs 适配层」口径细化（见 §6 风险补充） | 胶水代码在 cli/web 各复制一份（~40 行 ×2），破坏「业务逻辑只写一次」原则；两处组装易漂移，回归面加倍 | cli/web import 路径变长（`@lgdl/ai-command-kit/lgdl`）；index 仍需导出 framework 符号，实际 diff 比 A 多 9 处 cli 行改动 + web 组装行 |
| 风险 | 低（执行路径与现状逐字节对齐；适配单点便于回归比对） | 中（双份胶水漂移风险；F-04 接线面叠加） | 低（同 A，仅引用面复杂度略增） |
| 工作量 | 约 6.5 人日 | 约 7.5 人日（双份组装） | 约 7 人日（exports 配置 + 引用调整） |

## 4. 推荐方案
> 推荐方案及选择理由

**推荐**: 方案 A（新包内建 adapters/lgdl.ts 单点 + index 双面导出过渡）
**理由**:
1. **零破坏风险最低**：cli 9 处切换 diff = 仅包名（`from '@lgdl/core'` → `from '@lgdl/ai-command-kit'`），调用点零改动；web 侧组装单点，执行路径与现状逐字节对齐，最契合「纯搬移」定位；
2. **单一数据源**：LGDL 适配（kindResolver/applier/domain）只写一次，cli 与 web 共享，延续 commands.ts 头注释「业务逻辑只写一次」原则，避免 B 方案双份胶水漂移；
3. **「LGDL 作为首个适配场景」落地形态**：适配层放新包内即「框架自带首个适配」，开源（F-13 ②）时既可作为示例保留、也可剥离独立成适配包——两步走弹性最大；
4. **过渡形态声明**：index 双面导出是 v0.6 内为最小化 diff 的过渡决策（ADR-003），v1.1 开源时收敛 exports 为「框架核心 `.` + 适配子路径 `./lgdl`」是独立决策，不阻塞本步。

### 4.1 迁移步骤序列（纯搬移顺序）

> 约束：C-007（F-04/F-05 先行关闭后才启动）；每步完成即运行相关包测试，回归门禁分段验证

| 步 | 动作 | 内容 | 验证 |
|----|------|------|------|
| M0 | 前置门禁与基线 | 确认 F-04/F-05 已关闭（C-007）；git 基线 tag/commit；运行 `npm test`（web 107 / core 281）确认全绿基线 | 全绿基线快照 |
| M1 | 新包骨架 | 建 `packages/ai-command-kit/`（package.json: type module/dependencies `@lgdl/core`/build=tsc/test=tsc+node --test；tsconfig 参考 layout）；root workspaces `packages/*` 通配自动纳入（root package.json 零改动）；`.github/workflows/deploy-pages.yml` 补新包构建步骤 + paths 触发（FR-011，不回退 F-01 router 构建 :37） | `npm run build` 通过（含新包）；workflow 文件含新包构建 |
| M2 | 迁底座① commands | core/src/commands.ts:26-289 → 新包 src/commands.ts（kindResolver 注入化 ADR-004）；core/src/commands.test.ts 14 例随迁 → 新包；**core 暂保留导出**（防 M3 未就绪断链） | 新包 `npm test` 新包用例全绿；core 仍绿 |
| M3 | 迁底座② operations | core/src/operations.ts:31-220 → 新包 src/operations.ts（createOperationApplier ADR-005）；operations.test.ts 9 例随迁（import `./parser.js`/`./groups.js` → `@lgdl/core`）；core/src/operations.ts 删除 | 新包 23 例全绿；core 258 例全绿（281-23） |
| M4 | 迁底座③ tools + llm | provider.ts:282-324（WEB_CLI_TOOL）→ 新包 tools.ts；provider.ts:196-229,392-547 → 新包 llm.ts（中性化 LlmConfig）；provider.ts 拆分（留 web 部分）；provider.test.ts 6 例随迁 → 新包 llm.test.ts | 新包 llm/tools 用例全绿；web provider.test.ts 14 例全绿 |
| M5 | 迁底座④ protocol + help | web-cli.ts:23-289 → 新包 protocol.ts；help.ts:13-209（webCliHelp 面）→ 新包 help.ts；web-cli.test.ts 27 例随迁 → 新包 protocol.test.ts；help.test.ts 4 例随迁 → 新包 help.test.ts；web 侧新建 web-fetch.ts（parseWebFetchCommand/ParsedWebFetch，:291-327）+ web-fetch.test.ts 3 例 | 新包 protocol/help 用例全绿；web 剩余用例全绿 |
| M6 | 迁底座⑤ exec 执行骨架 | ops.ts:34-44,80-331,351-376 → 新包 exec.ts（createExecutor(domain) ADR-006 + handleLine 扩展点）；ops.test.ts 22 例随迁 → 新包 exec.test.ts；web 侧新建 web-fetch.ts 增 executeWebFetch（ops.ts:52-71）+ web-fetch.test.ts 增 3 例 + lgdl-web.ts（fetch 行处理器 + 透传 executor）+ lgdl-web.test.ts 2 例 | 新包 exec 用例全绿；web fetch/组装用例全绿 |
| M7 | 组装 LGDL 适配 | 新包 adapters/lgdl.ts（lgdlKindResolver/lgdlApplier/lgdlDomain/lgdlExecutor + index 双面导出）；web provider.ts chat 薄包装（构造 LlmConfig） | `npm run build` 全仓通过；新包 + web 用例全绿 |
| M8 | 切 cli 引用 | cli 9 个 mutation 命令 :4 import 切至 `@lgdl/ai-command-kit`（applyOperation/buildOperation 符号名不变）；cli/package.json dependencies 加新包 | `lgdl-cli <mutation 命令>` 冒烟：op 构造/应用路径行为与迁移前一致（FR-008） |
| M9 | 切 web 接线 | AiPanel.tsx:5 import 切至新包/lgdl-web；ops.ts/web-cli.ts 删除；App.tsx/SettingsPanel.tsx 不动 | web 构建 + 剩余测试全绿；grep 无旧路径残留 |
| M10 | core 导出面收敛 | core/src/index.ts 删除 :28-33（operations 面）、:44-45（commands 面）导出；core/src/commands.ts、commands.test.ts 删除；core/package.json 零依赖复核 | core 258 例全绿；依赖方向核验（NFR-003）；`npm run build` 全仓通过 |
| M11 | 全量回归 + 无残留 + 手测 | `npm test` 全仓（新包 + core 258 + web 剩余）；grep 核验（AC-006）；AI 面板四条路径手测（NFR-007/AC-009） | 总用例 388 全绿；无残留；手测清单记录 |
| M12 | 收口 | state.json 更新（本步为 plan 收尾，build 阶段完成后由 validate 收口）；v0.7 补 F-06/F-11 专项测试（护栏后置补课，ROADMAP.md:147） | — |

**排布约束**：M2~M10 与 F-04/F-05 接线面不重叠（F-04 先行关闭）；抽取期冻结 web AI 功能变更（ROADMAP.md:339）；若超 v0.6 第 2 周窗口（09-07~09-11）按 C-006 剥离顺延。

### 4.2 测试策略

**计数守恒原则**（ADR-008）：迁移纯搬移，用例数不增不减——总用例 388（迁移前 web 107 + core 281）守恒；「web 107」按 ROADMAP「web 侧测试面」口径解释（含新包承载的随迁用例），验收以「总用例数 + 全绿 + 断言输出逐字节」为准。

| 测试面 | 迁移前 | 迁移后 | 处置 |
|--------|-------|--------|------|
| core commands.test.ts | 14 | → 新包 14 | 随迁（import `./commands.js` → 新包相对路径；defaultKindFor 用例改导新包 adapters） |
| core operations.test.ts | 9 | → 新包 9 | 随迁（parser/groups import → `@lgdl/core`） |
| core mutations/parser.test.ts | 258 | core 剩 258 | 留 core，零改动 |
| web ops.test.ts | 27 | 新包 exec.test.ts 22 + web-fetch.test.ts 3（executeWebFetch）+ lgdl-web.test.ts 2（fetch 路由） | 随迁拆分；fetch 相关 5 例留 web（平台能力） |
| web web-cli.test.ts | 30 | 新包 protocol.test.ts 27 + web-fetch.test.ts 3（parseWebFetchCommand） | 随迁拆分；web-cli.test.ts:4 `import '@lgdl/core'`（formatStatus/parseLgdl）随迁后保持（领域符号留 core） |
| web help.test.ts | 8 | 新包 help.test.ts 4（webCliHelp）+ web 留 4（webOpHelp 3 + webFetchHelp 1） | 随迁拆分 |
| web provider.test.ts | 20 | 新包 llm.test.ts 6（classifyError 3 + parseToolArguments 2 + WEB_CLI_TOOL 1）+ web 留 14（PROVIDERS/localStorage/WEB_OP/FETCH） | 随迁拆分；随迁用例的 provider 参数改中性 `LlmProviderInfo`（断言不变） |
| web next-actions/locate/snap | 22 | web 剩 22 | 零改动 |
| **合计** | **388** | **新包 82 + web 48 + core 258 = 388** | 守恒 ✓ |

**测试执行要点**：
1. 随迁测试与代码同 commit（EC-006 无残留兜底：全仓 grep 确认无指向已删除路径的 import）；
2. 新包 package.json test 脚本采用 web 模式（tsc 编译 + `node --test`，web/package.json:11 参考）；
3. web package.json:11 test 脚本文件列表更新（删 ops/web-cli，增 web-fetch/lgdl-web）；
4. 断言零改动：随迁测试的断言（错误消息/status 文本/序列化输出/help 文本/tools schema）逐字节保持（AC-007）；
5. 逐字节比对抽样：help 文本（webCliHelp 顶层/单命令）、WEB_CLI_TOOL schema JSON 迁移前后 diff 一致。

### 4.3 工作量评估

| 块 | 内容 | 人日 |
|----|------|:--:|
| 骨架 + CI | M1（新包骨架/tsconfig/CI 构建） | 0.5 |
| 底座三件套 | M2~M4（commands/operations/tools+llm + 测试随迁） | 1.5 |
| 协议 + help | M5（protocol/help + 测试随迁 + web-fetch 拆分） | 1.0 |
| 执行骨架 + 适配 | M6~M7（exec/DomainApi/adapters/lgdl + provider 拆分） | 1.0 |
| 引用切换 | M8~M10（cli 9 处 + web UI + core 收敛） | 0.5 |
| 回归 + 手测 | M11（全量回归 + 无残留 + AI 面板四条路径） | 1.0 |
| **合计** | | **≈ 6.5 人日** |

与 ROADMAP Effort 2（F-13 ① v1.2.0 重评）量级一致；单作者制第 2 周窗口（09-07~09-11）可承载；超窗按 C-006 剥离顺延。

## 5. 文件影响分析
> 所有需要创建/修改/删除的文件

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | packages/ai-command-kit/package.json | 新包清单：name `@lgdl/ai-command-kit`、dependencies `@lgdl/core`、build=tsc、test=tsc+node --test |
| NEW | packages/ai-command-kit/tsconfig.json | 参考 packages/layout/tsconfig.json |
| NEW | packages/ai-command-kit/src/index.ts | 框架导出面 + LGDL 适配单例（过渡形态，ADR-003） |
| NEW | packages/ai-command-kit/src/commands.ts | 迁自 core/src/commands.ts:26-289（defaultKindFor 注入化，ADR-004） |
| NEW | packages/ai-command-kit/src/operations.ts | 迁自 core/src/operations.ts:31-220（createOperationApplier，ADR-005） |
| NEW | packages/ai-command-kit/src/exec.ts | 迁自 web/src/ai/ops.ts:34-44,80-331,351-376（DomainApi 注入，ADR-006） |
| NEW | packages/ai-command-kit/src/protocol.ts | 迁自 web/src/ai/web-cli.ts:23-289（不含 fetch 部分） |
| NEW | packages/ai-command-kit/src/help.ts | 迁自 web/src/ai/help.ts:13-209（webCliHelp 面） |
| NEW | packages/ai-command-kit/src/tools.ts | 迁自 web/src/ai/provider.ts:282-324（WEB_CLI_TOOL） |
| NEW | packages/ai-command-kit/src/llm.ts | 迁自 web/src/ai/provider.ts:196-229,392-547（中性化 LlmConfig） |
| NEW | packages/ai-command-kit/src/adapters/lgdl.ts | LGDL 首个适配场景单点（kindResolver/applier/domain/executor） |
| NEW | packages/ai-command-kit/src/commands.test.ts | 随迁 core/src/commands.test.ts（14 例） |
| NEW | packages/ai-command-kit/src/operations.test.ts | 随迁 core/src/operations.test.ts（9 例） |
| NEW | packages/ai-command-kit/src/exec.test.ts | 随迁 web/src/ai/ops.test.ts 中 22 例 |
| NEW | packages/ai-command-kit/src/protocol.test.ts | 随迁 web/src/ai/web-cli.test.ts 中 27 例 |
| NEW | packages/ai-command-kit/src/help.test.ts | 随迁 web/src/ai/help.test.ts 中 4 例 |
| NEW | packages/ai-command-kit/src/llm.test.ts | 随迁 web/src/ai/provider.test.ts 中 6 例 |
| NEW | packages/web/src/ai/web-fetch.ts | 新建：parseWebFetchCommand/ParsedWebFetch（web-cli.ts:291-327）+ executeWebFetch（ops.ts:52-71） |
| NEW | packages/web/src/ai/web-fetch.test.ts | 新建：6 例（parseWebFetchCommand 3 + executeWebFetch 3） |
| NEW | packages/web/src/ai/lgdl-web.ts | 新建：web 侧接线组装（fetch 行处理器 ops.ts:271-293 逻辑 + 透传 lgdlExecutor 单例） |
| NEW | packages/web/src/ai/lgdl-web.test.ts | 新建：2 例（fetch 行路由，随迁 ops.test.ts:185,193） |
| MODIFY | packages/web/package.json | dependencies + `@lgdl/ai-command-kit`；test 脚本文件列表更新（删 ops/web-cli，增 web-fetch/lgdl-web） |
| MODIFY | packages/cli/package.json | dependencies + `@lgdl/ai-command-kit` |
| MODIFY | packages/web/src/ai/AiPanel.tsx | :5 import 切至新包/lgdl-web（executeSubcommand/executeWebFetch）；:6 不变（provider 保留 chat 包装）；:390/:430/:435 调用点零改动 |
| MODIFY | packages/web/src/ai/provider.ts | 删 chat/parseToolArguments/classifyError/WEB_CLI_TOOL 迁出面；保留 PROVIDERS/localStorage/WEB_OP_TOOL/WEB_FETCH_TOOL/testConnection + chat 薄包装 |
| MODIFY | packages/web/src/ai/help.ts | 删 webCliHelp 面（:13-209 迁出）；保留 webOpHelp/webFetchHelp（:212-322） |
| MODIFY | packages/web/src/ai/provider.test.ts | 删 6 例（随迁）；保留 14 例 |
| MODIFY | packages/web/src/ai/help.test.ts | 删 4 例（随迁）；保留 4 例 |
| MODIFY | .github/workflows/deploy-pages.yml | paths 触发 + 构建步骤补新包（FR-011）；router 构建（:37）保留不回退 |
| MODIFY | packages/cli/src/commands/{add-node,remove-node,update-node,add-edge,remove-edge,update-edge,add-group,remove-group,update-group}.ts | 各 :4 import `@lgdl/core` → `@lgdl/ai-command-kit`（符号名不变） |
| MODIFY | packages/core/src/index.ts | 删 :28-33（operations 面）、:44-45（commands 面）迁出导出（FR-009） |
| DELETE | packages/core/src/commands.ts | 迁出后删除（M10） |
| DELETE | packages/core/src/operations.ts | 迁出后删除（M3） |
| DELETE | packages/core/src/commands.test.ts | 随迁（M2） |
| DELETE | packages/core/src/operations.test.ts | 随迁（M3） |
| DELETE | packages/web/src/ai/ops.ts | 迁出后删除（M9） |
| DELETE | packages/web/src/ai/web-cli.ts | 迁出后删除（M9） |
| DELETE | packages/web/src/ai/ops.test.ts | 随迁拆分（M6） |
| DELETE | packages/web/src/ai/web-cli.test.ts | 随迁拆分（M5） |

**不改动面**：root package.json（workspaces `packages/*` 通配自动纳入新包）；web App.tsx/SettingsPanel.tsx；cli queries/option-hints/shared/convert/init/import（领域符号留 core）；core 领域模块（mutations/parser/serialize/queries/status/templates/groups/converters/mermaid/plantuml/json/mermaid-import）；web prompts/next-actions/locate/snap/examples。

## 6. 风险评估
> 识别技术、依赖和时间风险及缓解措施（R-001~R-010 逐一对应 discovery §6.2）

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| R-001 依赖方向死锁（core re-export 形成 core↔新包 循环） | 低 | 高 | D-013/ADR-002 定案：新包→core 单向，core 只删导出不 re-export（EC-002 红线）；M10 后依赖图核验（package.json 声明 + 构建解析），AC-004 验收拦截 |
| R-002 CLI 引用断裂（core 删导出时 cli 未切） | 中 | 高 | M8（cli 切换）与 M10（core 收敛）连续原子落地（EC-001）；build 门禁（`npm run build` 全仓）拦截任何一方先行；AC-003 grep 核验 |
| R-003 applyOperation 强绑定 9 个 mutation | 中 | 高 | ADR-005：`createOperationApplier(mutations)` 注入工厂，分派 switch 逻辑逐行复制零改动；LGDL adapter 单点注入（M7）；随迁 operations.test.ts 9 例全绿即证分派语义不变（EC-003） |
| R-004 web 执行层领域 API 直调（ops.ts:10-30 实为 19 符号） | 中 | 高 | ADR-006：`createExecutor(domain: DomainApi)` 注入面（19 符号全量收口），LGDL adapter 组装 domain；执行路径逐字节复制（ops.ts:80-253），不重写分支；随迁 exec.test.ts 22 例断言承载（EC-004） |
| R-005 测试迁移面广（core 23 + web 85 涉迁） | 中 | 中 | 随迁与代码同 commit；§4.2 计数守恒核对表（388 = 新包 82 + web 48 + core 258）；EC-006 无残留 grep 兜底；web package.json test 脚本文件列表同步更新 |
| R-006 W-D1 缺陷共存（provider.ts:504 OpenAI 端点缺 WEB_FETCH_TOOL） | 中 | 中 | 排布门禁 C-007：F-04 先行关闭后才启动 F-13（EC-005）；注册组装（:405-420/:504）留 web 不移动，F-13 只搬移接线不参与修复（NG-005） |
| R-007 CI 构建缺口（deploy-pages.yml:37,40 无新包） | 中 | 中 | FR-011：M1 即补新包构建步骤 + paths 触发；router 构建保留不回退 F-01（AC-008）；本地等价构建验证 |
| R-008 文档漂移加剧（docs/v0.5-web-ai.md:142「协议实现在 web/ops.ts」过时） | 低 | 低 | NG-006 界定为不阻塞：列入 v0.6 已知 20 项漂移清单归文档对齐（F-08 类）另行处理（EC-007）；抽取产物不附带文档改写 |
| R-009 help 单一数据源断裂（help 随迁后 COMMANDS 来源） | 低 | 低 | FR-006/ADR-007：webCliHelp 迁入新包后 COMMANDS import 改为新包自身注册表（help.ts:11 → 新包 commands.ts）；随迁 help.test.ts 4 例断言动态生成输出不变（EC-010） |
| R-010 手测依赖人工（AI 面板四条路径无法全自动） | 低 | 低 | NFR-007 手测清单排入 validate 阶段人工复核：chat 文本→markdown / lgdl-web-cli 工具调用 / 手动文本命令 / web fetch（EC-008）；作者/评审确认后关闭 |
| **补充 R-011**：NFR-004「新包无领域实现」验收口径（adapters/lgdl.ts 含 defaultKindFor 逻辑与 mutations 注入） | 低 | 中 | ADR-003 细化验收口径：框架核心（commands/operations/exec/protocol/help/tools/llm/index）零领域引用；LGDL 适配收敛于 adapters/ 单点（属「首个适配场景」而非「领域实现迁入框架」）；AC-006 grep 例外项按 Q-010 决策覆盖 |
| **补充 R-012**：「web 107」门禁口径随测试迁移变化 | 低 | 中 | ADR-008：以计数守恒 388 + 断言逐字节为验收口径；AC-005 的「web 107」按 ROADMAP「web 侧测试面」（含新包随迁）解释，validate 阶段向作者说明口径 |
| **补充 R-013**：executeCommands 无产品运行时消费者（仅测试引用），迁出后行为不可直接手测 | 低 | 低 | 随迁 exec.test.ts 22 例承载行为验证；NFR-007 手动文本路径经 AiPanel 调 executeSubcommand 覆盖（executeCommands 为逐行循环工具，行为由测试保证） |

## 7. 生成的 ADR
> 本次规划产出的架构决策记录（完整正文内嵌本表后；独立 ADR 文件由 tasks 阶段视需要落盘）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | 新包命名与定位：@lgdl/ai-command-kit | PROPOSED |
| ADR-002 | 依赖方向：新包 → @lgdl/core 单向，core 零依赖无环 | PROPOSED |
| ADR-003 | LGDL 适配层落位：新包内 adapters/lgdl.ts 单点 + index 双面导出（过渡） | PROPOSED |
| ADR-004 | defaultKindFor 注入化：buildOperation 第 4 参 kindResolver + 内置默认 = 现状行为 | PROPOSED |
| ADR-005 | applyOperation 分派器注入化：createOperationApplier(mutations) | PROPOSED |
| ADR-006 | 执行层 DomainApi 注入面：createExecutor(domain) | PROPOSED |
| ADR-007 | web 接线拆分边界：provider/help/ops/web-cli 拆分 + fetch 留 web | PROPOSED |
| ADR-008 | 回归门禁口径：计数守恒 388 + 断言逐字节 | PROPOSED |

### ADR-001: 新包命名与定位：@lgdl/ai-command-kit

**状态**: PROPOSED
**背景**: F-13 ① 需新增第 7 个包承载「AI 可调用命令执行框架」底座（COMMANDS 注册表 + 执行管线 + tools schema + 协议解析 + help 自文档）；C-005 规定命名属 F-13 ② 开源决策，本步不预设；但工程实施必须有一个确定包名。
**决策**: 采用 `@lgdl/ai-command-kit`（workspace 内部名）；开源名候选 `ai-command-kit`（中性，可剥离 scope）。
**后果**: cli/web import 面使用该名；若作者后续变更命名，仅需包名替换（package.json/exports/import），结构设计不变。

### ADR-002: 依赖方向：新包 → @lgdl/core 单向，core 零依赖无环

**状态**: PROPOSED
**背景**: R-001 依赖方向死锁风险；D-013 已决策「新包→core 单向保类型」。
**决策**: 新包 package.json `dependencies: @lgdl/core`（保 LgdlOperation/LgdlDocument/NodeKind 等类型契约）；core 删除迁出符号、保持零依赖、不 re-export 新包符号。
**后果**: 类型定义零改动（零语义改动含类型层）；依赖图 `core ← ai-command-kit ← cli/web` 线性无环；v1.1 类型中性化作为独立决策另行评估（D-013 理由 4）。

### ADR-003: LGDL 适配层落位：新包内 adapters/lgdl.ts 单点 + index 双面导出（过渡）

**状态**: PROPOSED
**背景**: R-003/R-004 需要解耦 applyOperation 的 mutation 强绑定与执行层领域 API 直调；方案对比（§3）选定 A：适配单点避免 cli/web 双份胶水。
**决策**: 新包 `src/adapters/lgdl.ts` 承载 LGDL 首个适配场景（lgdlKindResolver/lgdlBuildOperation/lgdlApplier/lgdlDomain/lgdlExecutor）；index.ts 过渡期同时导出框架核心与适配单例，使 cli 9 处切换 diff 仅包名。
**后果**: 框架核心零领域引用，适配收敛单点；NFR-004 验收口径细化（见 R-011）；v1.1 开源时收敛 exports 为「核心 `.` + 适配 `./lgdl`」为独立决策。

### ADR-004: defaultKindFor 注入化：buildOperation 第 4 参 kindResolver + 内置默认 = 现状行为

**状态**: PROPOSED
**背景**: Q-010/D-010 决策 defaultKindFor（commands.ts:223-227）不内嵌迁出、不留在 core；需同时满足底座完整性与零语义改动。
**决策**: 新包 `buildOperation(command, args, docType?, kindResolver?)`；内置默认 resolver = 现状 defaultKindFor 逻辑逐字节（未注入 = 现状行为）；adapters/lgdl.ts 显式导出 `lgdlKindResolver`。
**后果**: LGDL 调用方注入/默认均得现状行为（er/uml-class→entity、state→state、默认 process）；其他领域可注入自有 resolver；随迁 commands.test.ts 14 例全绿即证。

### ADR-005: applyOperation 分派器注入化：createOperationApplier(mutations)

**状态**: PROPOSED
**背景**: R-003 operations.ts:16-27 强绑定 9 个 mutation；EC-003 开放注入 vs 保持 import；NFR-004 定「适配所需领域 API 由注入传入」。
**决策**: 新包 `createOperationApplier(mutations)` 注入工厂，返回 `{ applyOperation, applyOperations }`；分派 switch（operations.ts:111-220）逐行复制零改动；LGDL adapter 注入 9 mutations 得单例。
**后果**: 框架 operations.ts 零领域依赖（仅 type import @lgdl/core）；分派语义不变（随迁 9 例全绿即证）；cli/web 共享 lgdlApplier 单例。

### ADR-006: 执行层 DomainApi 注入面：createExecutor(domain)

**状态**: PROPOSED
**背景**: R-004 ops.ts:10-30 直调 19 个领域符号；FR-007 要求「LGDL 领域 API 经适配接口注入执行骨架，不改执行路径」。
**决策**: 新包 `createExecutor(domain: DomainApi, options?)` 返回 `{ executeSubcommand, executeCommands, describeCommandLine }`；DomainApi 收口 19 符号（parse/validate/serialize/formatStatus/template/convert/query/DIAGRAM_*/applyOperation/buildOperation/webCliHelp）；executeCommands 增 `handleLine` 扩展点（fetch 行由 web 注入）。
**后果**: 执行管线（ops.ts:80-253）逐字节复制、分支不重写；LGDL adapter 组装 domain 后行为与现状一致；其他领域注入自有 domain 复用骨架。

### ADR-007: web 接线拆分边界：provider/help/ops/web-cli 拆分 + fetch 留 web

**状态**: PROPOSED
**背景**: Q-011/Q-012 决策（D-011 WEB_OP/FETCH 留 web、D-012 localStorage 留 web）；需明确 ops.ts/web-cli.ts/help.ts/provider.ts 四文件的拆分粒度。
**决策**: ① tools 面：仅 WEB_CLI_TOOL 迁入；WEB_OP_TOOL/WEB_FETCH_TOOL 与注册组装（provider.ts:405-420,504）留 web（避免移动 F-04 修复点）；② Key 管理：localStorage 全套（:62-194）留 web，chat 改收中性 LlmConfig，web 侧薄包装保 `chat(settings, turns)` 签名；③ fetch：parseWebFetchCommand/executeWebFetch/webFetchHelp 留 web（新 web-fetch.ts/lgdl-web.ts），经 handleLine 注入；④ help：webCliHelp 迁入（COMMANDS 单一数据源闭环 R-009），webOpHelp/webFetchHelp 留 web。
**后果**: 新包保持环境无关（纯 TS 逻辑 + 领域类型，无 localStorage/fetch 依赖）；web 侧拆分后职责边界清晰（应用态 vs 框架）；AiPanel/App/SettingsPanel 消费面明确。

### ADR-008: 回归门禁口径：计数守恒 388 + 断言逐字节

**状态**: PROPOSED
**背景**: 测试随代码迁移后「web 107」文件级计数变化（ops/web-cli 测试文件迁出）；AC-005 验收需明确口径避免误判。
**决策**: 验收口径 = 总用例数守恒（迁移前 web 107 + core 281 = 388；迁移后新包 82 + web 48 + core 258 = 388）+ 全绿 + 随迁断言输出逐字节一致；「web 107」按 ROADMAP「web 侧测试面」（含新包随迁用例）解释。
**后果**: validate 阶段按守恒口径验收并向作者说明；用例不增不减（零新功能红线 C-001 顺带验证）。

## 8. 修订记录
> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 discovery 基线（文件:行号核实）+ spec 决策（D-010~D-013）编写技术方案；产出新包命名推荐（@lgdl/ai-command-kit）、包结构/依赖方向、关键机制设计（执行管线迁移/COMMANDS 切换/defaultKindFor 注入化/tools 范围/web 接线拆分）、迁移步骤序列（M0~M12）、测试策略（计数守恒 388）、风险缓解矩阵（R-001~R-010 + 补充 R-011~013）、8 项 ADR、工作量评估（≈6.5 人日） | 2026-08-31 | SDDU Plan Agent |
