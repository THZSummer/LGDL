# 技术计划：specs-tree-web-cli-v2（web-cli V2 抽取与包体系重构）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: spec.md（需求规范，25 FR 五组 + 7 NFR + 10 EC + AC-001~010 + 决策 D-001~D-004）+ discovery.md（边界 A1-A10/B1-B8/C1-C6/风险 R1-R9/约束 C1-C7）
> **参考**: F-13 ①（specs-tree-web-cli-extract/plan.md，前一轮 8 ADR，V2 在其上演进收敛）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-08-31
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-08-31
> **更新说明**: 初始创建（基于 discovery 基线文件:行号核实 + spec 决策 D-001~D-004，全自主执行，作者指令已闭环）

---

## 1. 前置检查

> 启动技术规划前必须验证的前置条件

| 检查项 | 状态 |
|--------|:--:|
| spec.md 存在 | ✅（`.sddu/specs-tree-root/specs-tree-web-cli-v2/spec.md`，254 行） |
| discovery.md 存在 | ✅（273 行，边界/风险/约束/测试基线齐全） |
| 外部 API 文档缓存 | ⚠️ 不适用（纯内部代码重构抽取，无外部服务；llm 依赖 openai/anthropic SDK 为既有依赖，不新增） |
| 输出模板 | ⚠️ **模板缺失**：用户自定义 `.sddu/templates/agents/output/sddu-plan.md.hbs` 与插件内置 `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs` 均不存在（`.sddu/` 下无 templates/，`.opencode/plugins/` 不存在）。按规则显式报错：**沿用前一轮 F-13 ① plan.md 既有格式作为兜底骨架**（保证两轮产物章节可衔接），tasks 阶段可据此重建模板 |
| 前置依赖已满足 | ✅（F-13 ① 已完成，web-cli-base 已存在；作者 4 项裁决 + spec D-001~D-004 已闭环） |

**基线核实说明**：本 plan 所有文件:行号均基于 2026-08-31 对实际源码的只读核实（与 discovery 基线一致，并修正/细化若干处）：
1. **protocol.test.ts 用例分布**（27 例）：tokenizeCli 1（:6）+ parseWebCliCommand 18（:17/:29/:35/:41/:52/:56/:60/:65/:69/:75/:80/:97/:113/:117/:121/:126/:140/:146）+ parseWebCliBatch 7（:103/:132/:152/:163/:169/:178/:184）+ formatStatus 1（:190，依赖 lgdl-core 领域函数）——拆分为「tokenizeCli 1 例留 base / 其余 26 例随迁 lgdl-web-cli」；
2. **exec.test.ts 用例分布**（22 例）：executeCommands 面 15（:20/:29/:38/:44/:52/:58/:64/:71/:78/:85/:93/:101/:152/:167/:176）+ executeSubcommand 面 7（:107/:115/:122/:128/:135/:141/:184）——全部经 lgdlDomain 组装，22 例整体随迁 lgdl-web-cli（测 lgdlExecutor 行为，间接覆盖 base 机制）；
3. **llm.test.ts 用例分布**（6 例）：classifyError 3 + parseToolArguments 2 + **WEB_CLI_TOOL 1（:42）**——WEB_CLI_TOOL 用例随迁 lgdl-web-cli（tools.test.ts），其余 5 例留 base（去分流耦合后调整断言）；
4. **web/ai/help.test.ts**（4 例）：webOpHelp 3（:5/:13/:20）+ webFetchHelp 1（:27）——webOpHelp 随迁 lgdl-web-op-cli，webFetchHelp 随迁 base（web-fetch help 面）；
5. **provider.test.ts**（14 例）：PROVIDERS/localStorage/浏览器直连 12 例 + WEB_OP_TOOL 1（:190）+ WEB_FETCH_TOOL 1（:197）——后 2 例分别随迁 lgdl-web-op-cli / base（改名 web-fetch），前 12 例留 web；
6. **WEB_CLI_TOOL 子命令计数**：discovery/spec 记「19 子命令 enum」，实测 tools.ts:35-43 含 help 共 **20 项**（status/validate/init/convert + 9 增量 + doc-info/get-node/get-edge/find-node + list-node-kinds/list-diagram-types + help）——属计数口径差异，本 Feature 逐字节保留（FR-009/NFR-002），**不构成改动点**，后续 grep/断言以逐字节为准；
7. **cli 9 个 mutation 命令 import**：均在第 4 行 `import { applyOperation, buildOperation } from '@lgdl/web-cli-base';`（add-node.ts:4/remove-edge.ts:4/update-group.ts:4 等，与 discovery §2.1 一致）；
8. **base 测试脚本**：`tsc src/*.test.ts` 通配（web-cli-base/package.json:20），**无显式文件列表**——纯化后测试文件集合变化（6→5 文件）脚本零改动，但 dist-test 残留旧编译产物需清理（见 §4.2 测试执行要点）。

---

## 2. 架构分析

> 分析现有架构影响和需要的新组件

### 2.1 现状架构与影响面

| 包 | 依赖（package.json） | 与本次重构的关系 |
|----|--------------------|----------------|
| packages/core（@lgdl/core） | 零依赖（core/package.json） | 改名 @lgdl/lgdl-core，仅目录+name+import 源，零语义改动（C2） |
| packages/layout | @lgdl/core（:18） | 改名 @lgdl/lgdl-layout + import 源 |
| packages/render | @lgdl/core、@lgdl/layout、@lgdl/router（:15-17） | 改名 @lgdl/lgdl-render + import 源 |
| packages/router | 零依赖 | 改名 @lgdl/lgdl-router + import 源 |
| packages/cli | @lgdl/web-cli-base、@lgdl/core、@lgdl/render、commander（:14-17）；bin lgdl-cli（:6-8） | 改名 @lgdl/lgdl-cli；**依赖边变更**：9 mutation 命令 import `@lgdl/web-cli-base`（commands/*.ts:4）→ `@lgdl/lgdl-web-cli`（FR-013/R2/EC-002） |
| packages/web | @lgdl/web-cli-base、@lgdl/core、@lgdl/layout、@lgdl/render + react/vite 等（:14-29）；private:true（:6） | 改名 @lgdl/lgdl-web；WEB_OP_TOOL/WEB_FETCH_TOOL 迁出（FR-014/FR-022）；三工具分发调整（FR-023/FR-024） |
| packages/web-cli-base | @anthropic-ai/sdk、@lgdl/core、openai（:22-26）；exports 含 ./lgdl 子路径（:13-15） | **纯化**：去 @lgdl/core（FR-018）、DomainApi 泛型化（FR-018）、注册表机制留 base（FR-019）、createOperationApplier 泛型化回留（FR-020）、ChatResult 单列表（FR-021）、web-fetch 纳入（FR-022）；目录与 name 不动（C3） |

**跨包 import 全量（discovery §2.1，已核实）**：
- `@lgdl/core` ← layout/index.ts:16、render 4 文件、cli 9 文件（shared/option-hints/commands×6）、web-cli-base 8 文件、web/App.tsx:11；
- `@lgdl/layout` ← render 3 文件、cli/commands/render.ts:6、web/App.tsx:12；
- `@lgdl/render` ← cli/commands/render.ts:7；
- `@lgdl/router` ← render/index.ts:10；
- `@lgdl/web-cli-base` ← cli 9 文件（:4）+ web 4 文件（AiPanel.tsx:5 子路径 /lgdl、lgdl-web.ts:10-11、provider.ts:16-19、web-fetch.ts:11）；
- 根 package.json:20 dependencies `@lgdl/cli`。

### 2.2 目标包体系（9 包）与依赖方向

```
packages/  (workspaces 通配 packages/* 自动纳入，根 package.json:7-9 零改动)
├── lgdl-core           @lgdl/lgdl-core      —— 零依赖（语言核心，仅改名）
├── lgdl-layout         @lgdl/lgdl-layout    —— → lgdl-core
├── lgdl-router         @lgdl/lgdl-router    —— 零依赖
├── lgdl-render         @lgdl/lgdl-render    —— → lgdl-core/lgdl-layout/lgdl-router
├── lgdl-cli            @lgdl/lgdl-cli       —— → lgdl-web-cli/lgdl-core/lgdl-render + commander；bin lgdl-cli 不变
├── lgdl-web            @lgdl/lgdl-web       —— → lgdl-web-cli/lgdl-web-op-cli/web-cli-base/lgdl-core/lgdl-layout/lgdl-render + react/vite
├── lgdl-web-cli        @lgdl/lgdl-web-cli   —— NEW → web-cli-base/lgdl-core（FR-006）
├── lgdl-web-op-cli     @lgdl/lgdl-web-op-cli—— NEW → web-cli-base（仅 HelpArg/HelpEntry 类型；零 React/DOM，NFR-004）
└── web-cli-base        @lgdl/web-cli-base   —— 纯化：→ @anthropic-ai/sdk + openai（零 @lgdl/*，FR-018/NFR-004）
```

```
依赖方向（单向无环，NFR-004/AC-006）：
  lgdl-core（零依赖）
      ▲
      ├── lgdl-layout ──▶ lgdl-render ◀── lgdl-cli（+ lgdl-web-cli）
      ├── lgdl-router ──▶ lgdl-render
      ├── web-cli-base（零 lgdl 依赖，纯机制）◀── lgdl-web-cli ◀── lgdl-web-op-cli / cli / web
      └── lgdl-web-cli ──▶ cli / web
  cli → lgdl-web-cli → {web-cli-base, lgdl-core} 与 cli → lgdl-core 并存（R2/EC-002 核验点）
```

**关键依赖设计**（对应作者裁决①④）：
- **web-cli-base 零 @lgdl/* 依赖**（C3/FR-018）：机制契约（DomainApi<Op,Doc>/createOperationApplier<Op,Doc>/CommandSpec/KindResolver/tokenizeCli/parseArgs/createExecutor/HelpArg/HelpEntry）全部泛型化或中性化，不引用任何 LGDL 类型；lgdl-core 类型由 lgdl-web-cli 以类型参数实例化（TS 结构化类型兼容，见 ADR-003）；
- **lgdl-web-cli → web-cli-base + lgdl-core**（FR-006/NFR-004）：依赖 base 的泛型机制（createExecutor/createOperationApplier/tokenizeCli/parseArgs/HelpArg/HelpEntry），依赖 lgdl-core 的类型契约（LgdlOperation/LgdlDocument 等，NG-003 类型引用路径迁移）——这是任务书明确的依赖形态；
- **lgdl-web-op-cli → web-cli-base**（FR-014）：仅 import HelpArg/HelpEntry 类型（web/help.ts:9-24 与 base/help.ts:16-31 重复定义统一以 base 为基准）；无 React/DOM/localStorage（FR-016/NFR-004 验收 grep）；
- **无环**：web-cli-base 不依赖任何 lgdl-* 包；lgdl-web-cli 不依赖 web/cli；op-cli 不依赖 web。

### 2.3 重命名设计（REN，FR-001~FR-005）

**执行策略**：`git mv` 目录 + package.json name 改身份 → 跨包 import 改源 → 根/CI/tsconfig/predev 引用同步 → `npm install` 重建 lock。**顺序：先改包身份再改引用**（身份先行使 workspace 解析立即指向新目录，随后逐文件改 import，每批构建验证）。

| 步骤 | 内容 | 验证 |
|------|------|------|
| R-1 | `git mv packages/{core,layout,render,router,cli,web} packages/lgdl-{core,layout,render,router,cli,web}`（git 保留历史） | `ls packages/` 9 目录 |
| R-2 | 6 包 package.json name：`@lgdl/x` → `@lgdl/lgdl-x`（D-001 锁死 scoped 形式，EC-001 不返工） | name 字段核验 |
| R-3 | 跨包 import 改源（discovery §2.1 全量表 ~30 处）：layout/render/cli/web/web-cli-base 内 `from '@lgdl/core'` → `'@lgdl/lgdl-core'` 等（`@lgdl/web-cli-base` 不改） | FR-002 grep 零残留 |
| R-4 | 根 package.json:20 dependencies `@lgdl/cli` → `@lgdl/lgdl-cli`（FR-003-A4） | grep |
| R-5 | 根 tsconfig.json:3-7 references 5 包路径改新目录（FR-003-A8） | `tsc -b` 通过 |
| R-6 | web/package.json predev:12 workspace 名改新 + test:11 文件列表按 §4.2 更新（FR-003-A7） | predev 冒烟 |
| R-7 | CI deploy-pages.yml：触发 paths:7-11 与 build:38 workspace 名改新 + 补 lgdl-web-cli/lgdl-web-op-cli 构建（FR-003-A6） | CI 文件 grep |
| R-8 | `npm install` 重建 package-lock.json（7→9 workspace 条目）与 node_modules/@lgdl 链接（FR-003-A5/EC-007） | lock 条目 + 链接核验 |
| R-9 | 文档面（FR-005，P2）：README.md:45-52、docs/cli-guide.md:7-10 改新名；docs/research/edge-routing/* 加文件头注「历史文档，包名已更名为 @lgdl/lgdl-router」（NG-006 二选一，本 plan 取**加注**，成本最低且保留历史引用完整性） | 文档 grep |

**不变面**：bin `lgdl-cli`（cli/package.json:6-8，FR-004-A10）；协议前缀 `lgdl-web-cli`/`lgdl-web-op-cli`（A-002）；web-cli-base 目录与 name（C3）；唯一改名例外 = web-fetch 中性化（FR-022）。

### 2.4 lgdl-web-cli 新包设计（FR-006~FR-013）

```
packages/lgdl-web-cli/
├── package.json          # name @lgdl/lgdl-web-cli；deps: @lgdl/web-cli-base + @lgdl/lgdl-core；
│                         # type module / main / types / exports（含 ./lgdl 子路径）；build=tsc；
│                         # test=tsc src/*.test.ts + node --test（web-cli-base/package.json:20 模式）
├── tsconfig.json         # 参考 packages/lgdl-layout/tsconfig.json 模式
└── src/
    ├── index.ts          # 导出面：COMMANDS 系 + buildOperation + WEB_CLI_TOOL + parseWebCliCommand/Batch +
    │                     # webCliHelp + describeOperation/createOperationApplier(泛型工厂的 lgdl 分派) + lgdl 适配单例具名
    ├── commands.ts       # COMMANDS 9 命令注册表（:28-92）+ KNOWN_PARAMS（:95-100）+ requireParams（:103）+
    │                     # assertChangeRequested（:112）+ buildOperation（:139-236）+ parseAttrsSpec（:242）+
    │                     # parseMemberSpec（:266）+ defaultKindFor（:126-130）——逐字节迁自 base/commands.ts LGDL 面；
    │                     # import `@lgdl/core` → `@lgdl/lgdl-core`；CommandSpec/KindResolver 类型自 base 导入（机制）
    ├── operations.ts     # describeOperation（:35-56）+ OperationMutations 接口（:59-69）+ LgdlOperation re-export（:32）+
    │                     # lgdlDispatch 9 变体分派映射（:92-154 switch case 体逐行复制）+ 调 base 泛型工厂
    │                     # createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)（FR-008/FR-020）
    ├── protocol.ts       # parseWebCliCommand（前缀校验 :44-52 + 17 子命令枚举 :85-153 + --doc 语义 :70-82）+
    │                     # parseWebCliBatch（调 base 泛型批量骨架 createBatchParser，:231-290 循环结构）
    │                     # tokenizeCli/parseArgs 自 base 导入复用（D-004）；ParsedCommand<LgdlOperation>/ParsedBatch<LgdlOperation>
    ├── help.ts           # PARAM_DESC（:34-54）+ WEB_CLI_EXTRA（:61-124）+ INCR_EXAMPLES（:127-137）+
    │                     # INCR_SUMMARIES（:140-150）+ webCliEntryFor/webCliHelpOne/webCliHelp（:152-211）
    │                     # HelpArg/HelpEntry 类型自 base 导入（机制）；COMMANDS 引用本包注册表（单一数据源 R-009）
    ├── tools.ts          # WEB_CLI_TOOL 全量（base/tools.ts:12-54）逐字节；20 子命令 enum 逐字节保留
    ├── adapters/
    │   └── lgdl.ts       # 组装单点（自 base/adapters/lgdl.ts:1-104 全量随迁）：lgdlKindResolver（:49）+
    │                     # lgdlApplier = createOperationApplier(lgdlDispatch)（:56-66 调用形态不变）+ lgdlBuildOperation（:69-73）+
    │                     # lgdlDomain 19 符号组装（:76-96）+ lgdlExecutor = createExecutor(lgdlDomain, lgdlExecutorOptions)
    │                     # （:99，options 注入 commandPrefix/parseBatch/describeSubcommand，见 §2.6）+ 具名导出（:102-104）
    ├── commands.test.ts  # 随迁 14 例
    ├── operations.test.ts# 随迁 9 例
    ├── protocol.test.ts  # 随迁 26 例（parseWebCli* + formatStatus；tokenizeCli 1 例留 base）
    ├── help.test.ts      # 随迁 4 例
    ├── exec.test.ts      # 随迁 22 例（lgdlExecutor 行为面）
    └── tools.test.ts     # 随迁 llm.test.ts 的 WEB_CLI_TOOL 1 例
```

**模块迁移源对照**（逐字节复制 + 三类改造点：import 源 / 机制引用自 base / 硬编码前缀留在业务包）：

| 新包模块 | 迁移源（文件:行号） | 迁入改造点 |
|---------|-------------------|-----------|
| commands.ts | base/commands.ts:14-298 的 LGDL 面（COMMANDS/KNOWN_PARAMS/requireParams/assertChangeRequested/buildOperation/parseAttrsSpec/parseMemberSpec/defaultKindFor） | ① import `@lgdl/core`（:14）→ `@lgdl/lgdl-core`；② CommandSpec/KindResolver 类型自 base 导入（base/commands.ts:17-26/:124 机制壳保留）；③ 函数体逐字节零改写 |
| operations.ts | base/operations.ts:32-154 的 LGDL 面（describeOperation/OperationMutations/LgdlOperation re-export/分派 switch case 体） | ① 分派 switch（:92-154）改为 `lgdlDispatch: Record<string, (doc, op) => MutationResult>` 映射（case 体逐行复制）；② 调 base 泛型工厂 `createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)`（FR-020）；③ import `@lgdl/core` 类型 → `@lgdl/lgdl-core` |
| protocol.ts | base/protocol.ts:38-157 的 LGDL 路由面（前缀校验/17 子命令/--doc/--help）+ :231-290 批量循环 | ① tokenizeCli/parseArgs 改自 base 导入（D-004）；② parseWebCliBatch 调 base `createBatchParser` 骨架（循环/失败即停/doc 一致性保留）；③ 'lgdl-web-cli'/'lgdl-web-fetch' 硬编码（:44-52/:79/:151 等 17 处）**随迁**（业务包内允许）；④ ParsedCommand/ParsedBatch 泛型化为 `ParsedCommand<Op>/ParsedBatch<Op>` 自 base 导入 + 本包实例化 LgdlOperation |
| help.ts | base/help.ts:34-211 的 LGDL 面（PARAM_DESC/WEB_CLI_EXTRA/INCR_EXAMPLES/INCR_SUMMARIES/webCliHelp 系列） | HelpArg/HelpEntry 自 base 导入；COMMANDS 引用本包 commands.ts（R-009 单一数据源闭环）；'lgdl-web-cli' 硬编码（27 处）随迁 |
| tools.ts | base/tools.ts:12-54 全量 | 逐字节零改动（FR-009/NFR-002） |
| adapters/lgdl.ts | base/adapters/lgdl.ts:1-104 全量 | ① import 源改本包（operations/commands/exec/help 相对路径 + `@lgdl/lgdl-core`）；② lgdlExecutor 组装 options 注入 §2.6 参数（commandPrefix='lgdl-web-cli'/parseBatch/describeSubcommand） |

**消费方接线（FR-013/B8）**：
- `cli/src/commands/{add-node,remove-node,update-node,add-edge,remove-edge,update-edge,add-group,remove-group,update-group}.ts` 各 :4：`from '@lgdl/web-cli-base'` → `from '@lgdl/lgdl-web-cli'`（符号名 applyOperation/buildOperation 不变 → 调用点零改动，ADR-003 双面导出价值延续）；
- `web/src/ai/AiPanel.tsx:5`：`from '@lgdl/web-cli-base/lgdl'` → `from '@lgdl/lgdl-web-cli/lgdl'`（executeSubcommand）；
- `web/src/ai/lgdl-web.ts:10-11`、`web/src/ai/provider.ts:16-19`：import 源更新（§2.7）。

### 2.5 lgdl-web-op-cli 新包设计 + handler 注入面（FR-014~FR-017，核心难点）

```
packages/lgdl-web-op-cli/
├── package.json          # name @lgdl/lgdl-web-op-cli；deps: @lgdl/web-cli-base（仅类型）；
│                         # type module / main / types / exports；build=tsc；test=tsc + node --test
├── tsconfig.json
└── src/
    ├── index.ts          # 导出面：WEB_OP_TOOL / OP_COMMANDS / OP_SUBCOMMANDS / webOpHelp /
    │                     # NextAction / parseNextActions / OpHandlerRegistry / createOpHandlerRegistry / OP_HANDLER_* 类型
    ├── ops.ts            # OP_COMMANDS 元数据注册表（16 条，自 web/help.ts WEB_OP_ENTRIES:27-89 逐字节，含 export 别名:34-39）+
    │                     # OP_SUBCOMMANDS = Object.keys(OP_COMMANDS)（单一数据源，FR-016）
    ├── tool.ts           # WEB_OP_TOOL（自 web/provider.ts:205-255 全量逐字节；name/description 保留；
    │                     # parameters.enum 由 OP_SUBCOMMANDS 生成，顺序与现状一致 → schema 逐字节不变）
    ├── help.ts           # webOpHelpOne/webOpHelp（自 web/help.ts:91-123 逐字节）；HelpArg/HelpEntry 自 base 导入（FR-014 统一重复定义）
    ├── next-actions.ts   # NextAction + parseNextActions（自 web/next-actions.ts:12-35 全量）
    ├── handlers.ts       # handler 注入面（本包核心新增设计，见下）
    ├── tool.test.ts      # WEB_OP_TOOL schema 断言（随迁 provider.test.ts:190 1 例）
    ├── ops.test.ts       # webOpHelp 面（随迁 web/ai/help.test.ts 3 例）
    └── next-actions.test.ts # 随迁 4 例
```

**op 协议契约 = 单一数据源（FR-016/R9 范围界定）**：现状「工具定义（WEB_OP_TOOL.parameters.enum，provider.ts:232-239）+ help 元数据（WEB_OP_ENTRIES，help.ts:27-89）」双份并存（discovery §2.3 发现）→ V2 收敛：`OP_COMMANDS` 注册表为唯一事实源，`OP_SUBCOMMANDS` 派生枚举供工具 schema 与分发判别共用。**不新增** lgdl-web-cli 前缀文本行解析器（FR-017/NG-004：现状 web 侧无文本解析，抽取不得新增能力面——只有工具定义 + 元数据 + next-actions 解析）。

**handler 注入面设计（ADR-006，包定义协议/分发，web 注入 React 执行回调）**：

```ts
// lgdl-web-op-cli/src/handlers.ts —— 包内纯协议，零 React/DOM 引用
/** op 执行结果：结果文本（供 AI 反馈）或错误文本。 */
export interface OpExecResult { ok: boolean; output: string; }

/** 单个 UI 操作执行回调（web 注入）：输入子命令参数，返回结果文本。 */
export type OpHandler = (args: Record<string, string>) => OpExecResult;

/** 子命令 → handler 注册表（分发核心）。 */
export class OpHandlerRegistry {
  private handlers = new Map<string, OpHandler>();
  /** 注册执行回调（web 侧在 App 层注入 16 个分支实现）。 */
  register(subcommand: string, handler: OpHandler): void;
  /** 校验子命令是否已注册（next-actions 由 AiPanel 拦截时用于判别）。 */
  has(subcommand: string): boolean;
  /** 分发执行：未注册子命令 → { ok:false, output:'✖ 未知操作 "x"' }（与 App.tsx:1053 现状文案一致）。 */
  execute(subcommand: string, args: Record<string, string>): OpExecResult;
}
export function createOpHandlerRegistry(): OpHandlerRegistry;
```

**web 侧注入（FR-024/C6）**：`App.tsx:943-1055` 的 handleWebOp 16 分支（navigator.clipboard:946 / setAiCollapsed:952-961 / downloadSvg·downloadPng:963-967 / previewRef.zoomBy·wheelZoom·panBy·resetView:979-1001 / jumpToIssue:1006 / document.querySelector('.lgdl-hovered'):1013-1021 / EXAMPLES·selectExample:1024-1038 / webOpHelp:1050）**逐分支复制为注册回调**：

```ts
// App.tsx —— React 强耦合留 web，经 registry 注入
const opRegistry = useMemo(() => {
  const reg = createOpHandlerRegistry();
  reg.register('copy-source', () => { navigator.clipboard.writeText(source); setCopied(true); setTimeout(() => setCopied(false), 1500); return { ok: true, output: '✓ 源码已复制到剪贴板' }; });
  reg.register('preview-zoom', ({ factor, direction, delta, anchorX, anchorY }) => { /* :978-990 逐行复制 */ });
  // … 16 分支全量（含 next-actions 防御兜底 :1045-1047、help :1048-1051）
  return reg;
}, [source, downloadSvg, downloadPng, jumpToIssue, selectExample, applyAiSource]);
// 暴露给 AiPanel：onWebOp = (sub, args) => opRegistry.execute(sub, args)
```

**AiPanel 分发（:414-428 维持现状逻辑、执行面切换）**：next-actions → parseNextActions + 胶囊卡片（:415-424，React UI 留 web）；其他 → `onWebOp(tc.subcommand, tc.args)`（:427，App 内转发 opRegistry.execute）——**行为与迁移前一致**（App.tsx:1053 未知操作文案由 registry.execute 未注册分支复现）。

### 2.6 web-cli-base 纯化设计（FR-018~FR-022）

**① DomainApi 泛型化 `DomainApi<Op, Doc>`（FR-018，ADR-003）**：

```ts
// base/exec.ts —— 机制契约（泛型化；LGDL 具体实例随 adapters 迁 lgdl-web-cli）
export interface DomainApi<Op, Doc> {
  parseLgdl: (source: string) => ParseResult<Doc>;                    // ParseResult 泛型化（结构化兼容）
  validate: (doc: Partial<Doc>, issues?: Issue[]) => ParseResult<Doc>;
  serializeLgdl: (doc: Doc) => string;
  applyOperation: (doc: Doc, operation: Op) => MutationResult<Doc>;   // MutationResult 泛型化
  applyOperations: (doc: Doc, ops: Op[]) => OperationBatchResult<Doc>;// OperationBatchResult<Doc> 泛型化（FR-008 机制面）
  formatStatus: (doc: Doc) => string;
  templateForType: (type: string) => string | null;
  supportedTemplateTypes: () => readonly string[];
  convert: (doc: Doc, format: string) => string;
  listFormats: () => string[];
  buildOperation: (command: string, args: Record<string, string | undefined>, docType?: string, kindResolver?: KindResolver) => Op;
  listNodeKinds: () => string;
  queryDocInfo: (doc: Doc) => string[];
  queryNode: (doc: Doc, id: string) => string[] | null;
  queryEdge: (doc: Doc, from?: string, to?: string, label?: string) => string[] | null;
  findNodes: (doc: Doc, q: string) => string[];
  DIAGRAM_TYPES: readonly string[];                                    // DiagramType 收窄为 string 索引（结构兼容）
  DIAGRAM_TYPE_LABELS: Record<string, string>;
  webCliHelp: (topic?: string) => string;
}
```

**结构化类型兼容说明（零语义改动的关键）**：base 定义最小契约接口 `ParseResult<Doc>{valid, document, issues}`、`MutationResult<Doc>{document, summary}`、`Issue{severity, location?, message}`、`OperationBatchResult<Doc>{document, results, failedIndex, error}`（exec.ts:27-80 现状字段全量收口）；lgdl-core 的具体类型（exec.ts:15-22 现状 import 的 LgdlDocument/LgdlOperation/MutationResult/ParseResult/LgdlIssue 等）只要字段超集即可经 TS 结构化类型系统赋给契约——**类型定义零改动（NG-003），管线内访问字段（parsedDoc.valid/:122、issue.severity/:187、r.summary/:274 等）全部在契约内**。

**② 去 lgdl-core 依赖（FR-018）**：base/package.json:24 移除 `@lgdl/core`；base/src 全部 `@lgdl/core` import 清除——commands.ts:14（随迁）、operations.ts:20-30（随迁）、exec.ts:15-22（改泛型契约）、protocol.ts:23（随迁）、index.ts:25（删除 LgdlOperation re-export）、adapters/lgdl.ts:21-46（整体随迁）。

**③ 注册表机制保留（FR-019）**：CommandSpec（commands.ts:17-26）+ requireParams（:103）+ assertChangeRequested（:112）+ KindResolver（:124）留 base（机制壳）；**COMMANDS 9 命令注册表（:28-92）+ KNOWN_PARAMS（:95-100）+ buildOperation（:139-236）+ parseAttrsSpec/parseMemberSpec/defaultKindFor 全部随迁 lgdl-web-cli**。

**④ exec 管线参数化注入面（FR-019，ADR-005）**——base 保留 createExecutor 管线骨架（:101-370），泛型化 + 4 个注入参数：

```ts
export interface ExecutorOptions<Op> {
  /** fetch 行处理器（web 注入，ADR-007 延续——V2 后 fetch 工具归 base，处理器仍由 web 组装注入） */
  handleLine?: (line: string) => LineHandleResult | null | Promise<LineHandleResult | null>;
  /** describeCommandLine 的 fetch 行描述（同步） */
  describeFetchLine?: (line: string) => string | null;
  /** 命令前缀（lgdl-web-cli 注入 'lgdl-web-cli'；base 默认空 = 无前缀识别）——替代现状 exec.ts:376 硬编码 */
  commandPrefix?: string;
  /** 单行批量解析（lgdl-web-cli 注入 parseWebCliBatch；base 默认 = 内置 createBatchParser 骨架） */
  parseBatch: (line: string) => ParsedBatch<Op>;
  /** 子命令描述（lgdl-web-cli 注入 describeLgdlSubcommand；base 默认 = `${sub} ${args}` fallback，现状 :366） */
  describeSubcommand?: (subcommand: string, args: Record<string, string>) => string | null;
}
```

**base 内 21 处 'lgdl-web-cli' 硬编码处理**（exec 21 处）：前缀判断 :376 → commandPrefix；describeCommandLine 描述文案 :352-365 → describeSubcommand（lgdl-web-cli 侧实现，文案逐字节）；get-node 错误文案 :146 内嵌前缀 → `（可用 ${commandPrefix} status 查看全部节点）` 模板化（注入 'lgdl-web-cli' 后逐字节一致）；其余（:147/:156/:167/:177/:184/:187/:190/:199/:203/:210/:215/:221/:233/:245/:257/:267/:274 等）为纯业务文案无前缀，随管线保留。

**⑤ createOperationApplier 泛型化回留 base（FR-020，ADR-004）**：

```ts
// base/operations.ts —— 泛型注入分派器（机制留 base；9 mutations 映射随业务迁 lgdl-web-cli）
export interface OperationBatchResult<Doc> { document: Doc; results: (MutationResult<Doc> | null)[]; failedIndex: number; error: string | null; }

export function createOperationApplier<Op, Doc>(
  dispatch: Record<string, (doc: Doc, op: Op) => MutationResult<Doc>>,  // op 名称 → mutation 调用
): {
  applyOperation: (doc: Doc, operation: Op) => MutationResult<Doc>;
  applyOperations: (doc: Doc, ops: Op[]) => OperationBatchResult<Doc>;  // 失败即停循环（:168-189 逐行复制）
}
```

- 分派查找：`applyOperation` 内 `const name = (operation as { op?: string }).op;` → dispatch[name] 查表，未命中抛错（现状 switch default 行为）；
- 9 个 op 变体的解构调用（:92-154 case 体：`mutations.addNode(doc, { id: op.id, ... })`）随迁 lgdl-web-cli/operations.ts 的 `lgdlDispatch`（case 体逐行复制，零改写）；
- **注入相同 9 mutations 时分派输出与迁移前逐字节一致（NFR-005 验收）**：lgdlApplier = createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)（adapters/lgdl.ts:56-66 调用形态不变）。

**⑥ llm.ts 三工具分流去耦（FR-021，D-003）**：

```ts
// base/llm.ts —— ChatResult 收敛为通用 toolCalls 单列表（删除 :34-45 三字段）
export interface ChatResult {
  content: string;
  /** 全部工具调用（lgdl-web-cli / lgdl-web-op-cli / web-fetch 透传，由消费方按工具名分发） */
  toolCalls: WebCliToolCall[];
  model: string;
}
```

- chat() 删除按工具名过滤（:135-137/:187-189/:194-196 的 `filter(c => c.name === 'lgdl-web-cli')` 等）→ 全量返回 allCalls（Claude 路径 :130-132 / OpenAI 路径 :183-191 已解析全部，仅去掉分桶）；
- `WebCliToolCall` 类型名保留（:22-32，字段 id/name/subcommand/args/rawArguments 均中性，无 lgdl 字样）；llm.ts 内 15 处 lgdl 引用清零（:25 注释、:135-137/:187-189/:194-196 过滤）→ `grep lgdl` 零命中（FR-021 验收）；
- 消费方同步（EC-004 原子）：provider.ts chat 薄包装返回新契约；AiPanel :395 `[...res.toolCalls, ...res.opCalls, ...res.fetchCalls]` → `res.toolCalls`（FR-023）。

**⑦ web-fetch 归位与中性化改名（FR-022，ADR-007）**——自 web 迁 base + 改名（作者裁决③，唯一命名例外）：

| 迁移物 | 源（web） | 落位（base） | 改名 |
|--------|----------|-------------|------|
| WEB_FETCH_TOOL | provider.ts:261-289 | base/tools.ts（新增导出） | name `lgdl-web-fetch` → `web-fetch`（:271） |
| parseWebFetchCommand | web-fetch.ts:19-44 | base/web-fetch.ts（新文件） | 前缀校验 `lgdl-web-fetch` → `web-fetch`（:24/:27） |
| executeWebFetch | web-fetch.ts:54-79 | base/web-fetch.ts | 错误文案 :63/:69 前缀同步 |
| webFetchHelp | web/help.ts:126-137 | base/help.ts（新增导出） | 文案 `lgdl-web-fetch` → `web-fetch` |

- web 侧改名联动：lgdl-web.ts:17/:32 前缀判断、AiPanel.tsx:154/:431、prompts.ts:20/:27-28/:43（lgdl-web-fetch → web-fetch）；
- base 零 lgdl 依赖约束下 `web-fetch` 中性名合法（FR-019 grep 例外项）。

**⑧ base 纯化后导出面**：

```
index.ts（收敛，删除 LGDL 面）：
  保留：CommandSpec/KindResolver（类型）、tokenizeCli/parseArgs/createBatchParser（泛型批量骨架）、
        createOperationApplier（泛型）、createExecutor（泛型）+ DomainApi/ExecutorOptions/Executor/LineHandleResult/
        CommandExecResult/ParsedCommand<Op>/ParsedBatch<Op>/OperationBatchResult<Doc>（泛型类型）、
        chat/parseToolArguments/classifyError + ChatTurn/WebCliToolCall/ChatResult/LlmConfig/LlmProviderInfo/LlmToolDef、
        HelpArg/HelpEntry（类型）、web-fetch 全套（WEB_FETCH_TOOL/parseWebFetchCommand/executeWebFetch/webFetchHelp）
  删除：COMMANDS/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec、
        describeOperation、WEB_CLI_TOOL、parseWebCliCommand/parseWebCliBatch、webCliHelp、
        LgdlOperation re-export、lgdl 适配单例（lgdlKindResolver/lgdlBuildOperation/lgdlApplier/lgdlDomain/lgdlExecutor）+ applyOperation/applyOperations 具名、./lgdl 子路径 exports
```

### 2.7 web 包调整设计（FR-023~FR-025）

| 文件 | 调整 |
|------|------|
| provider.ts | ① WEB_OP_TOOL 定义（:205-255）删除 → import 自 @lgdl/lgdl-web-op-cli；② WEB_FETCH_TOOL 定义（:261-289）删除 → import 自 @lgdl/web-cli-base（改名 web-fetch）；③ chat() 工具组装（:328-357）引用三工具新源（WEB_CLI_TOOL 自 lgdl-web-cli / WEB_OP_TOOL 自 op-cli / WEB_FETCH_TOOL 自 base），Claude 3 工具 + OpenAI 2 工具 W-D1 现场保留（:326，NG-005 不修复）；④ chat 薄包装返回新 ChatResult 单列表契约（FR-021） |
| AiPanel.tsx | ① :5 import `@lgdl/web-cli-base/lgdl` → `@lgdl/lgdl-web-cli/lgdl`；② :7 WebCliToolCall 类型 import 源随 provider 调整；③ :395 `[...toolCalls, ...opCalls, ...fetchCalls]` → `res.toolCalls`（单列表）；④ :414-443 三工具分发逻辑维持（tc.name 判别 lgdl-web-cli/lgdl-web-op-cli/web-fetch），import 源更新；⑤ :154 toolCallToCommand 前缀映射 `lgdl-web-fetch` → `web-fetch` |
| lgdl-web.ts | ① :10-11 import `@lgdl/web-cli-base`（lgdlDomain/createExecutor）→ `@lgdl/lgdl-web-cli`（lgdlDomain）+ `@lgdl/web-cli-base`（createExecutor/LineHandleResult）；② :17/:32 前缀判断 `lgdl-web-fetch` → `web-fetch`；③ lgdlExecutor 组装改：createExecutor(lgdlDomain, { ...lgdl 注入参数, handleLine: handleFetchLine, describeFetchLine }) |
| App.tsx | handleWebOp :943-1055 → opRegistry 注入（§2.5）；:1050 webOpHelp import 源 → @lgdl/lgdl-web-op-cli |
| web/help.ts | webOpHelp 面（:26-123）+ webFetchHelp（:126-137）删除（迁出）；HelpArg/HelpEntry 重复定义（:9-24）删除 → 自 base/@lgdl/lgdl-web-op-cli 导入类型 |
| prompts.ts | :20/:27-28/:43 `lgdl-web-fetch` → `web-fetch`；三工具协议描述文案其余不变 |
| web/package.json | dependencies：@lgdl/core→@lgdl/lgdl-core、@lgdl/layout→@lgdl/lgdl-layout、@lgdl/render→@lgdl/lgdl-render、+@lgdl/lgdl-web-cli、+@lgdl/lgdl-web-op-cli（@lgdl/web-cli-base 保留）；test:11 文件列表按 §4.2 更新；predev:12 workspace 名更新 |
| web-fetch.ts / web-fetch.test.ts | 迁出 base（FR-022），web 侧删除 |
| next-actions.ts / next-actions.test.ts | 迁出 op-cli（FR-015），web 侧删除 |

### 2.8 数据流变更与依赖关系图

```
【迁移前】                                             【迁移后】
AiPanel ──chat──▶ web provider.chat                     AiPanel ──chat──▶ web provider.chat(薄包装)
   │                 │(三工具组装 WEB_CLI/OP/FETCH)             │                 │(三工具自新源组装)
   │                 └─▶ web-cli-base llm.chat                  │                 └─▶ web-cli-base llm.chat
   │                      (三桶分流 ChatResult)                  │                      (单列表 toolCalls 透传)
   ├─▶ executeSubcommand ◀─ @lgdl/web-cli-base/lgdl              ├─▶ executeSubcommand ◀─ @lgdl/lgdl-web-cli/lgdl
   │       (lgdlExecutor, domain 19 符号)                        │       (lgdlExecutor, lgdlDomain 组装)
   ├─▶ onWebOp(16 分支) ──▶ App.handleWebOp                     ├─▶ onWebOp ──▶ App.opRegistry(16 handler 注入)
   │                                                             │       └─▶ lgdl-web-op-cli OpHandlerRegistry.execute
   ├─▶ executeWebFetch ◀─ web/web-fetch.ts                      └─▶ web-fetch ◀─ web-cli-base/web-fetch.ts(中性化)
cli 9 命令 ──▶ @lgdl/web-cli-base                                 cli 9 命令 ──▶ @lgdl/lgdl-web-cli
   (applyOperation/buildOperation)                                    (lgdlApplier.applyOperation / buildOperation)
                                                                          └─▶ web-cli-base(泛型工厂/执行骨架) + lgdl-core(类型/领域)
```

---

## 3. 方案对比

> 2-3 个可行方案对比（两个对比主题：① handler 注入面形态——op-cli 抽取核心决策；② 迁移顺序——重命名与抽取的先后）

### 3.1 对比主题一：op-cli handler 注入面形态（FR-016/FR-024 核心）

| 维度 | 方案 A：注册表对象 + execute 分发（推荐） | 方案 B：函数参数回调直传 | 方案 C：事件总线/命令模式 |
|------|:--|:--|:--|
| 描述 | 包定义 `OpHandlerRegistry`（register/has/execute）+ `OpHandler` 类型；web 注入 16 分支注册回调；分发经 registry.execute 返回 `{ok, output}` | 包只定义 `OpHandler` 类型；web 组装 `Record<subcommand, OpHandler>` 对象直传包内 `dispatchOp(handlers, sub, args)` | 包定义 `OpCommand`/`OpEvent` 消息类型 + 事件总线；web 注册事件监听器 |
| 优点 | 注册表内聚校验（未知子命令 → 与现状 App.tsx:1053 一致的错误文案）；next-actions 判别可复用 has()；单点分发便于测试（handlers.test 可注入桩） | 最小抽象（一个类型 + 一个函数）；diff 最小 | 解耦最彻底；扩展点最灵活 |
| 缺点 | 比 B 多一个注册表类（~30 行） | 无集中校验，未知子命令文案需 web 侧自持；分发逻辑散落在 web | 过度设计——现状无多监听者/异步需求；事件序列化成本高于收益 |
| 风险 | 低（行为与现状 1:1 对应） | 中（未知操作错误文案回归风险） | 中（抽象引入新行为面，违背零新功能 NFR-001） |
| 工作量 | 约 0.7 人日 | 约 0.5 人日 | 约 1 人日 |

**推荐 A**：注册表对象形态。理由：① 未知子命令错误文案（App.tsx:1053 `✖ 未知操作 "${subcommand}"`）由 registry.execute 未注册分支复现，NFR-002 零语义改动的直接保障；② 包内可自测分发（handlers.test.ts 新增 2-3 例不依赖 React）；③ next-actions 特例判别（AiPanel :415）可复用 `registry.has('next-actions')` 语义；④ 注册表是「包定义协议、web 注入实现」的最直接表达（FR-016「handler 注册表签名类型可被 web 消费」验收直指本形态）。

### 3.2 对比主题二：迁移顺序（重命名 vs 抽取先后）

| 维度 | 方案 A：重命名先行（任务书建议，推荐） | 方案 B：抽取先行、重命名后置 |
|------|:--|:--|
| 描述 | M1 先完成 6 包重命名（git mv + name + import + lock + CI/tsconfig/predev 全量），随后 base 纯化 → lgdl-web-cli → op-cli → web 调整 → 回归 | 先建 lgdl-web-cli/lgdl-web-op-cli（从旧目录名消费），完成抽取与 web 接线后再统一重命名 6 包 |
| 优点 | ① 包身份一步到位，后续 lgdl-web-cli 落位时 import 源直接写新名，避免两轮 import 改写；② 命名体系（D-001）是全部后续步骤的引用前提，先行锁定消除歧义；③ 与任务书「重命名先行」一致 | 重命名（纯机械面）与抽取（业务面）解耦，单步回归面小 |
| 缺点 | 重命名一步触及全仓 import/配置，中途状态跨包引用需整批原子提交 | 抽取阶段 import 源写旧名，重命名时需再改一遍 lgdl-web-cli/op-cli 的依赖名与 web/cli 消费面（双重改写，与方案 A 相比多一轮 import 面） |
| 风险 | 中（重命名原子性要求高，FR-003 批内不可分割；R6/R7 绑定） | 中高（lgdl-web-cli 新包落位后立刻面临改名，dependency 名与目录名两套引用易漂移） |
| 工作量 | 约 7.5 人日 | 约 8 人日（多一轮 import 改写） |

**推荐 A**：重命名先行。理由：① 任务书明确顺序；② D-001 已锁死命名（EC-001 不返工），重命名是纯机械面（git mv + 字符串替换），先行完成后 lgdl-web-cli 落位直接使用新依赖名（@lgdl/lgdl-core）与目录路径，lgdl-web-op-cli 同理，避免 B 方案两轮改写；③ 重命名与抽取间以「每步可构建」门禁隔离（M1 完成即全仓绿），风险可控。

---

## 4. 推荐方案

**推荐**：方案 A（§3.1 handler 注册表 + §3.2 重命名先行），整体迁移序列 M0~M11 如下。

### 4.1 迁移步骤序列（每步保持可构建）

> 约束：每步完成即运行相关包测试 + 全仓 build 门禁；随迁测试与代码同 commit（EC-010）；重命名组（M1）与抽取组（M3~M9）按依赖顺序执行

| 步 | 动作 | 内容 | 验证 |
|----|------|------|------|
| M0 | 前置门禁与基线 | git 基线 tag/commit；运行全仓测试记录基线（实测 419 = web-cli-base 82 + web 48 + core 260 + router 8 + render 21；守恒基准 388 口径 = 82+48+260） | 基线快照 |
| M1 | 重命名 6 包（FR-001~FR-003，§2.3 R-1~R-9） | git mv 目录 + 6 包 name + 跨包 import ~30 处 + 根 package.json/tsconfig/predev/CI + `npm install` 重建 lock（7→9 workspace 条目） | 全仓 build 零错误；FR-002 grep 零残留；lock 9 条目 |
| M2 | base 泛型化 + llm 去耦（FR-018 契约面/FR-020/FR-021） | DomainApi → DomainApi<Op,Doc>（结构化契约）；createOperationApplier 泛型化（dispatch 映射）；ChatResult 单列表 + chat() 删过滤；**web 消费方同步**（provider chat 薄包装返回新契约、AiPanel :395 单列表）——EC-004 原子 | base 测试绿（llm.test 5 例调整断言）；web provider.test 12 例 + AiPanel 构建绿 |
| M3 | lgdl-web-cli 骨架 + 底座（FR-006/FR-007/FR-008） | 建包（package.json/tsconfig/index）；commands.ts（9 命令注册表/校验/buildOperation 全量 + CommandSpec/KindResolver 自 base 导入）；operations.ts（describeOperation/OperationMutations/lgdlDispatch + 调 base 泛型工厂）；随迁 commands.test 14 + operations.test 9 | lgdl-web-cli 23 例绿；全仓 build 绿（base 仍含 LGDL 面，未删） |
| M4 | lgdl-web-cli 协议/help/tools/adapters（FR-009~FR-012） | protocol.ts（前缀校验/17 子命令 + 调 base createBatchParser）；help.ts（PARAM_DESC/WEB_CLI_EXTRA/INCR_*/webCliHelp，HelpArg/HelpEntry 自 base）；tools.ts（WEB_CLI_TOOL 逐字节）；adapters/lgdl.ts（lgdlKindResolver/lgdlApplier/lgdlBuildOperation/lgdlDomain/lgdlExecutor + 具名导出）；随迁 protocol.test 26 + help.test 4 + exec.test 22 + tools.test 1 | lgdl-web-cli 76 例绿；base 测试仍绿（LLM 面未动） |
| M5 | base 纯化收敛 + web-fetch 归位（FR-018~FR-022） | base 删 LGDL 面（commands.ts 注册表/buildOperation、operations.ts LGDL 面、protocol.ts 路由面、help.ts LGDL 面、tools.ts WEB_CLI_TOOL、index.ts 收敛、adapters/lgdl.ts、./lgdl exports）；去 @lgdl/core 依赖；exec 硬编码参数化（commandPrefix/parseBatch/describeSubcommand）；web-fetch 全套迁入（WEB_FETCH_TOOL/parseWebFetchCommand/executeWebFetch/webFetchHelp + 改名 web-fetch）；**web 侧同步删** web-fetch.ts/next-actions.ts/help.ts 迁出面 + 改名联动（lgdl-web.ts:17/:32、prompts.ts、AiPanel.tsx:154/:431） | base package.json 无 @lgdl/*；FR-019/FR-021 grep 零残留；web-fetch.test 6 例（改名后）随迁 base 绿；web 剩余测试绿 |
| M6 | 切 cli 引用（FR-013） | 9 个 mutation 命令 :4 import `@lgdl/web-cli-base` → `@lgdl/lgdl-web-cli`；cli/package.json dependencies 更新 | `lgdl-cli <mutation 命令>` 冒烟行为不变（FR-013 验收） |
| M7 | 切 web 基础接线（FR-023） | AiPanel :5 import → `@lgdl/lgdl-web-cli/lgdl`；lgdl-web.ts/provider.ts import 源更新（lgdlDomain 自 lgdl-web-cli、createExecutor/LineHandleResult 自 base）；provider chat() 三工具组装引用新源（WEB_CLI_TOOL 自 lgdl-web-cli / WEB_FETCH_TOOL 自 base 改名 web-fetch / WEB_OP_TOOL 暂留 web 定义） | web 构建 + provider.test 12 例绿；AiPanel 分发逻辑不变 |
| M8 | lgdl-web-op-cli 抽取（FR-014~FR-017） | 建包（package.json/tsconfig/index）；ops.ts（OP_COMMANDS 单一数据源 16 条 + OP_SUBCOMMANDS）；tool.ts（WEB_OP_TOOL 自 provider.ts:205-255 迁入，enum 由 OP_SUBCOMMANDS 生成）；help.ts（webOpHelp 系列，HelpArg/HelpEntry 自 base）；next-actions.ts（NextAction/parseNextActions）；handlers.ts（OpHandlerRegistry/OpHandler/OpExecResult）；随迁 web/ai/help.test 3（webOpHelp）+ next-actions.test 4 + provider.test 1（WEB_OP_TOOL）+ 新增 handlers.test 2-3 | lgdl-web-op-cli 10-11 例绿；grep 无 react/dom 引用（NFR-004） |
| M9 | web op 接线 + fetch 收尾（FR-024/FR-025） | provider.ts 删 WEB_OP_TOOL 定义 → import 自 @lgdl/lgdl-web-op-cli；App.tsx handleWebOp 16 分支 → opRegistry 注册注入（16 分支逐行复制为回调，:1053 未知操作文案由 registry 复现）；web/help.ts 删除迁出面；web test 脚本文件列表重列（§4.2）；AiPanel :415 next-actions 判别维持 + onWebOp 转发 registry | web 构建 + 全部测试绿；三工具分发行为与迁移前一致（FR-023/FR-024 验收） |
| M10 | 全量回归 + 无残留 + 手测 | 全仓测试计数核验（≥388，预估 407-435）；FR-002/AC-002/AC-003 grep 零残留；依赖图核验（AC-006）；CI 文件核验；AI 面板四路径手测（chat 文本 / lgdl-web-cli 工具调用 / lgdl-web-op-cli UI 操作 / web-fetch） | 总用例全绿；无残留；手测清单记录 |
| M11 | 收口（FR-005 P2） | 文档面（README/docs/cli-guide + research 加注）；state.json 更新（plan 阶段完成态由 build 后 validate 收口） | 文档 grep 核验 |

**排布约束**：M2 的 llm 去耦与 M5 的 base 收敛之间保持「base 仍含 LGDL 面但机制已泛型化」的过渡态（可构建）；M5 是 base 纯化的原子收敛点（删 LGDL 面 + 去依赖 + 硬编码清零同批）；M8/M9 连续执行（op-cli 迁出与 web 接线切换原子落地，防 WEB_OP_TOOL 双定义或断引）。

### 4.2 测试策略（守恒 ≥388，NFR-003）

**守恒重算表**（基于 §1 基线核实的用例分布，断言逐字节保持，NFR-002）：

| 测试面 | 迁移前 | 迁移后 | 处置 |
|--------|-------|--------|------|
| web-cli-base commands.test.ts | 14 | → lgdl-web-cli 14 | 随迁（import 源更新） |
| web-cli-base operations.test.ts | 9 | → lgdl-web-cli 9 | 随迁（lgdlDispatch/泛型工厂） |
| web-cli-base protocol.test.ts | 27 | lgdl-web-cli 26 + base 1 | 拆分：parseWebCli*+formatStatus 26 随迁；tokenizeCli 1 留 base |
| web-cli-base exec.test.ts | 22 | → lgdl-web-cli 22 | 随迁（lgdlExecutor 行为面；间接覆盖 base 机制） |
| web-cli-base help.test.ts | 4 | → lgdl-web-cli 4 | 随迁（webCliHelp 面） |
| web-cli-base llm.test.ts | 6 | lgdl-web-cli tools.test 1 + base llm.test 5 | 拆分：WEB_CLI_TOOL 1 随迁；classifyError 3 + parseToolArguments 2 留 base（断言按新契约调整） |
| web provider.test.ts | 14 | web 12 + op-cli tool.test 1 + base 1 | 拆分：PROVIDERS/localStorage 12 留 web；WEB_OP_TOOL 1 → op-cli；WEB_FETCH_TOOL 1 → base（改名 web-fetch） |
| web ai/help.test.ts | 4 | op-cli ops.test 3 + base help 1 | 拆分：webOpHelp 3 → op-cli；webFetchHelp 1 → base |
| web next-actions.test.ts | 4 | → op-cli 4 | 随迁 |
| web web-fetch.test.ts | 6 | → base 6 | 随迁（前缀断言 lgdl-web-fetch → web-fetch 调整） |
| web lgdl-web.test.ts | 2 | web 2 | 留 web（fetch 行路由，前缀断言改名调整） |
| web locate/snap.test.ts | 18 | web 18 | 零改动 |
| **新增** | — | op-cli handlers.test 2-3 | 新增（注册表注册/执行/未注册分支；接线测试，非业务功能，NFR-001 允许） |
| core mutations/parser.test.ts | 260 | lgdl-core 260 | 零改动（纯改名） |
| router/render/layout | 29 | 29 | 零改动（纯改名） |
| **合计** | **419（实测）** | **422-425** | 守恒 ✓（388 口径：130→130~133 + core 260；全仓 419→422-425） |

**测试执行要点**：
1. 随迁测试与代码同 commit（EC-010 无残留兜底：全仓 grep 确认无指向已删除路径的 import、无旧位置迁出符号定义残留）；
2. 新包（lgdl-web-cli / lgdl-web-op-cli）test 脚本采用 web-cli-base 模式（tsc src/*.test.ts + node --test dist-test/*.test.js）；
3. **web/package.json:11 test 脚本文件列表重列**（R5）：删 web-fetch.test.ts/next-actions.test.ts/help.test.ts，留 locate.test.ts/snap.test.ts/provider.test.ts/lgdl-web.test.ts（+ 若新增 web 接线测试文件则列入）；lgdl-web-cli/lgdl-web-op-cli 测试文件集合变化但脚本用通配符（src/*.test.ts），需清理 dist-test 残留旧编译产物（`rm -rf dist-test` 后重建，防 R7 同类问题）；
4. 断言零改动：随迁测试断言（错误消息/status 文本/序列化输出/help 文本/tools schema/协议解析）逐字节保持；唯一例外 = web-fetch 中性化改名相关断言（FR-022）与 llm.test 的 ChatResult 单列表断言（FR-021）；
5. 逐字节比对抽样（AC-009）：webCliHelp 顶层/单命令输出、WEB_CLI_TOOL/WEB_OP_TOOL schema JSON、web-fetch 帮助文案迁移前后 diff 一致；
6. 新增测试仅限接线/元数据（handlers.test 2-3 + 若 web 三工具组装断言），不计入业务功能面（NFR-001）。

### 4.3 工作量评估

| 块 | 内容 | 人日 |
|----|------|:--:|
| 重命名 | M1（git mv/name/import/lock/CI/tsconfig/predev/文档） | 1.0 |
| base 泛型化 | M2（DomainApi<Op,Doc>/createOperationApplier 泛型/ChatResult 单列表 + web 消费方同步） | 1.0 |
| lgdl-web-cli 抽取 | M3~M4（骨架/commands/operations/protocol/help/tools/adapters + 测试随迁 76 例） | 1.5 |
| base 纯化 | M5（删 LGDL 面/去依赖/硬编码参数化/web-fetch 归位改名 + web 侧迁出联动） | 1.2 |
| cli 切换 | M6（9 命令 import + deps + 冒烟） | 0.3 |
| web 基础接线 | M7（AiPanel/lgdl-web/provider import 源 + 三工具组装 + 单列表分发） | 0.5 |
| op-cli 抽取 + web op 接线 | M8~M9（op-cli 包/handler 注册表/App 16 分支注入/测试随迁 + 新增） | 1.2 |
| 回归 + 手测 | M10（全量回归/无残留 grep/依赖图/手测四路径） | 0.8 |
| 收口 | M11（文档 P2 + state.json） | 0.2 |
| **合计** | | **≈ 7.7 人日** |

---

## 5. 文件影响分析

> 所有需要创建/修改/删除/重命名的文件（路径基于迁移前目录名；M1 重命名后以新目录为准）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| RENAME | packages/{core,layout,render,router,cli,web} → packages/lgdl-{core,layout,render,router,cli,web} | git mv 保留历史（FR-001） |
| MODIFY | 6 包 package.json | name → @lgdl/lgdl-*（FR-001） |
| MODIFY | layout/src/index.ts:16；render/src/{index.ts:7-10, ascii.ts:9-11, ascii.test.ts:4, svg.test.ts:4-5}；cli/src/{shared.ts:11, option-hints.ts:9, commands/*.ts:4-7}；web/src/App.tsx:11-12；web-cli-base/src/*.ts 中 `@lgdl/core` import | import 源改 @lgdl/lgdl-*（FR-002） |
| MODIFY | package.json:20 | dependencies `@lgdl/cli` → `@lgdl/lgdl-cli`（FR-003-A4） |
| MODIFY | tsconfig.json:3-7 | references 路径改新目录（FR-003-A8） |
| MODIFY | packages/web/package.json:11-12 | test 文件列表重列 + predev workspace 名（FR-003-A7/FR-025） |
| MODIFY | .github/workflows/deploy-pages.yml:7-11/:38 | 触发 paths + build workspace 名改新 + 补 lgdl-web-cli/lgdl-web-op-cli（FR-003-A6） |
| MODIFY | package-lock.json | `npm install` 重建 9 workspace 条目（FR-003-A5） |
| MODIFY | README.md:45-52、docs/cli-guide.md:7-10 | @lgdl/cli → @lgdl/lgdl-cli（FR-005，P2） |
| MODIFY | docs/research/edge-routing/* | 文件头加注「历史文档，包名已更名为 @lgdl/lgdl-router」（FR-005 二选一：加注） |
| NEW | packages/lgdl-web-cli/package.json | name/deps（@lgdl/web-cli-base + @lgdl/lgdl-core）/exports（./lgdl 子路径）/scripts（FR-006） |
| NEW | packages/lgdl-web-cli/tsconfig.json | 参考 lgdl-layout 模式 |
| NEW | packages/lgdl-web-cli/src/index.ts | 导出面（§2.4） |
| NEW | packages/lgdl-web-cli/src/commands.ts | 迁自 base/commands.ts LGDL 面（FR-007） |
| NEW | packages/lgdl-web-cli/src/operations.ts | 迁自 base/operations.ts LGDL 面（lgdlDispatch + 泛型工厂调用）（FR-008） |
| NEW | packages/lgdl-web-cli/src/protocol.ts | 迁自 base/protocol.ts 路由面 + base createBatchParser（FR-010） |
| NEW | packages/lgdl-web-cli/src/help.ts | 迁自 base/help.ts LGDL 面（FR-011） |
| NEW | packages/lgdl-web-cli/src/tools.ts | 迁自 base/tools.ts WEB_CLI_TOOL 全量（FR-009） |
| NEW | packages/lgdl-web-cli/src/adapters/lgdl.ts | 迁自 base/adapters/lgdl.ts 全量（FR-012） |
| NEW | packages/lgdl-web-cli/src/{commands,operations,protocol,help,exec,tools}.test.ts | 随迁 76 例（§4.2） |
| NEW | packages/lgdl-web-op-cli/package.json | name/deps（@lgdl/web-cli-base）/scripts（FR-014） |
| NEW | packages/lgdl-web-op-cli/tsconfig.json | 参考 lgdl-layout 模式 |
| NEW | packages/lgdl-web-op-cli/src/index.ts | 导出面（§2.5） |
| NEW | packages/lgdl-web-op-cli/src/ops.ts | OP_COMMANDS 单一数据源（FR-016） |
| NEW | packages/lgdl-web-op-cli/src/tool.ts | WEB_OP_TOOL（enum 由 OP_SUBCOMMANDS 生成）（FR-014） |
| NEW | packages/lgdl-web-op-cli/src/help.ts | webOpHelp 系列（FR-014） |
| NEW | packages/lgdl-web-op-cli/src/next-actions.ts | NextAction/parseNextActions（FR-015） |
| NEW | packages/lgdl-web-op-cli/src/handlers.ts | OpHandlerRegistry/OpHandler/OpExecResult（FR-016，ADR-006） |
| NEW | packages/lgdl-web-op-cli/src/{tool,ops,next-actions,handlers}.test.ts | 随迁 8 例 + 新增 2-3 例（§4.2） |
| MODIFY | packages/web-cli-base/src/exec.ts | DomainApi<Op,Doc> 泛型化 + ExecutorOptions 注入参数 + 硬编码参数化（FR-018/FR-019） |
| MODIFY | packages/web-cli-base/src/operations.ts | createOperationApplier 泛型化 + OperationBatchResult<Doc>（FR-020） |
| MODIFY | packages/web-cli-base/src/llm.ts | ChatResult 单列表 + 删过滤（FR-021） |
| MODIFY | packages/web-cli-base/src/tools.ts | 删 WEB_CLI_TOOL；增 WEB_FETCH_TOOL（改名 web-fetch）（FR-019/FR-022） |
| MODIFY | packages/web-cli-base/src/help.ts | 删 LGDL 面；增 webFetchHelp（FR-019/FR-022）；留 HelpArg/HelpEntry |
| MODIFY | packages/web-cli-base/src/protocol.ts | 删路由面；留 tokenizeCli/parseArgs + createBatchParser 泛型骨架（FR-019/D-004） |
| MODIFY | packages/web-cli-base/src/commands.ts | 删 LGDL 面；留 CommandSpec/requireParams/assertChangeRequested/KindResolver 机制壳（FR-019） |
| MODIFY | packages/web-cli-base/src/index.ts | 导出面收敛（§2.6-⑧） |
| NEW | packages/web-cli-base/src/web-fetch.ts | parseWebFetchCommand/executeWebFetch（改名 web-fetch）（FR-022） |
| DELETE | packages/web-cli-base/src/adapters/lgdl.ts | 整体随迁 lgdl-web-cli（M5） |
| DELETE | packages/web-cli-base/src/{commands.test,operations.test,protocol.test(26 例部分),help.test,exec.test}.ts 迁出部分 | 随迁 lgdl-web-cli（M5 清理） |
| MODIFY | packages/cli/src/commands/{add,remove,update}-{node,edge,group}.ts 共 9 文件 :4 | import → @lgdl/lgdl-web-cli（FR-013） |
| MODIFY | packages/cli/package.json:14 | dependencies @lgdl/web-cli-base → @lgdl/lgdl-web-cli |
| MODIFY | packages/web/src/ai/provider.ts | 删 WEB_OP_TOOL/WEB_FETCH_TOOL 定义 + 三工具组装新源 + chat 薄包装新契约（FR-023） |
| MODIFY | packages/web/src/ai/AiPanel.tsx:5/:154/:395/:414-443 | import 源 + 单列表分发 + fetch 前缀改名（FR-023/FR-024） |
| MODIFY | packages/web/src/ai/lgdl-web.ts:10-11/:17/:32 | import 源 + 前缀改名 + executor 组装注入参数（FR-024） |
| MODIFY | packages/web/src/App.tsx:943-1055 | handleWebOp → opRegistry 16 handler 注入（FR-024） |
| MODIFY | packages/web/src/ai/prompts.ts:20/:27-28/:43 | lgdl-web-fetch → web-fetch（FR-022） |
| MODIFY | packages/web/src/ai/help.ts | 删 webOpHelp/webFetchHelp 迁出面（M9） |
| MODIFY | packages/web/src/ai/web-fetch.ts | 迁出 base（M5 删除） |
| MODIFY | packages/web/src/ai/next-actions.ts | 迁出 op-cli（M8 删除） |
| MODIFY | packages/web/src/ai/provider.test.ts | 删 2 例（随迁）；12 例留 + 断言按新契约调整 |
| MODIFY | packages/web/src/ai/help.test.ts | 删 4 例（webOpHelp 3 → op-cli、webFetchHelp 1 → base） |
| MODIFY | packages/web/src/ai/web-fetch.test.ts / next-actions.test.ts / lgdl-web.test.ts | 随迁/留 web 处置（§4.2） |

**不改动面**：root package.json workspaces（通配自动纳入新包）；packages/core/src 全部源码（零语义改动，C2）；web App.tsx 除 handleWebOp 外其余；cli 除 9 命令 import 外其余（shared/queries/option-hints/convert/init/import 保持 lgdl-core 引用改名为新名）。

---

## 6. 风险评估

> R1-R9 逐一对应 discovery §5.2，含缓解措施（EC-001~EC-010 兜底）

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| R1 命名约定不明确（A-001） | 低 | 高 | **已消解**：spec D-001 锁死 scoped 形式（@lgdl/lgdl-*），plan 阶段不得再改（EC-001）；「lgdl 双写」经 D-001 理由确认可接受；M1 实施严格按 D-001 清单 |
| R2 cli 依赖边变更/循环（A-001 之外） | 中 | 高 | NFR-004/AC-006 依赖图核验为验收项：M1 后先核对各包 package.json 声明（cli → lgdl-web-cli → web-cli-base/lgdl-core 与 cli → lgdl-core 并存）；base 纯化后（M5）package.json 移除 @lgdl/core（FR-018）→ 无环；M6 cli 切换与 M5 收敛批间以 build 门禁隔离 |
| R3 硬编码字符串面 86 处（exec 21 + protocol 17 + help 27 + tools 6 + llm 15） | 中高 | 中 | 分类处理：protocol/help/tools 硬编码（50 处）随迁业务包（lgdl-web-cli 内合法）；exec 21 处参数化（commandPrefix/parseBatch/describeSubcommand，ADR-005）；llm 15 处去耦清零（D-003/FR-021）；FR-019 grep 零残留验收兜底（base/src 无 'lgdl-web-cli'/'lgdl-web-op-cli'/'lgdl-web-fetch'，web-fetch 中性名除外）；随迁测试断言同步调整（EC-003） |
| R4 llm.ts 分流耦合（A-004） | 中 | 中 | FR-021 + FR-023 原子落地（M2 同批：llm.ts 改契约与 provider/AiPanel 消费方改分发）；回归集中在 provider.test 12 例 + AiPanel 接线；测试守恒兜底（EC-004） |
| R5 web 测试脚本显式文件列表 | 中 | 中 | FR-025/M9 重列 web/package.json:11 文件列表；M10 验收比对脚本列表与实际文件集合一致（EC-005）；新包测试脚本用通配符 + 清理 dist-test 残留（§4.2-3） |
| R6 predev/CI workspace 引用 | 中 | 中 | FR-003 覆盖（M1 同批更新 web predev + deploy-pages.yml build/paths）；重命名组与抽取组原子交付，build 门禁拦截半程状态（EC-006） |
| R7 dist 产物与 node_modules 链接残留 | 低 | 低 | M1 执行 `npm install` + 全量 rebuild 一次性动作；M10 grep 核验 node_modules/@lgdl/ 链接与源码引用一致（EC-007）；dist-test 残留同步清理（§4.2-3） |
| R8 文档面滞后 | 低 | 低 | FR-005 P2 同步（README/docs/cli-guide）；research 历史文档加注处理（NG-006）；不阻塞构建（EC-008） |
| R9 op 无独立文本协议解析器 | 低 | 低 | **已消解**：FR-017/NG-004 范围界定——op 协议 = 元数据契约（OP_COMMANDS 单一数据源），不新增文本行解析能力（EC-009） |
| **补充 R10**：base 泛型契约与 lgdl-core 类型结构化兼容性（DomainApi<Op,Doc> 契约字段必须覆盖 exec 管线访问面） | 中 | 高 | ADR-003 设计兜底：契约字段全量收口 exec.ts:27-80/101-370 访问面（parsedDoc.valid/document/issues、r.document/summary、issue.severity/location/message、DIAGRAM_TYPES 索引等）；M2 实施时以 `tsc` 编译 + exec.test 随迁用例（M4 后）双重验证；若发现契约缺字段，补契约而非改管线（零语义改动） |
| **补充 R11**：lgdl-web-cli 依赖 web-cli-base 的导出面在 M3~M4 期间与 base 泛型化（M2）的时序耦合 | 中 | 中 | M2 先行（base 泛型化完成并全绿）→ M3/M4 复制时直接使用泛型契约（lgdlDispatch/createBatchParser 等已就位）；base 的 LGDL 面在 M5 前保留（双份存在期 build 绿）；M5 收敛后依赖面固定 |
| **补充 R12**：op-cli 依赖 web-cli-base（HelpArg/HelpEntry）与 base 纯化（M5 删 LGDL 面）的时序 | 低 | 低 | HelpArg/HelpEntry 是机制类型（base/help.ts:16-31 保留），M5 不删除；op-cli（M8）在 M5 之后建包，直接消费纯化后 base，无时序风险 |
| **补充 R13**：lgdl-web-op-cli 的 WEB_OP_TOOL schema 由 OP_SUBCOMMANDS 生成时枚举顺序漂移（FR-014 逐字节验收） | 低 | 中 | OP_COMMANDS 定义顺序 = 现状 WEB_OP_ENTRIES 顺序（web/help.ts:27-89，含 export 别名位 :34-39）+ Object.keys 保序；tool.test 断言 schema 与迁移前 JSON 逐字节 diff（AC-009 抽样） |

---

## 7. 生成的 ADR

> 本次规划产出的架构决策记录（本 Feature 独立编号，与 F-13 ① 的 ADR-001~008 区分；完整正文内嵌本表后，独立 ADR 文件由 tasks 阶段视需要落盘）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-001 | 6 包重命名执行策略：git mv + 身份先行 + 引用后改 + lock 重建 | PROPOSED |
| ADR-002 | 依赖方向：base 零 lgdl 依赖；lgdl-web-cli → base + lgdl-core 单向无环 | PROPOSED |
| ADR-003 | DomainApi<Op,Doc> 泛型化契约：结构化类型兼容，lgdl-core 类型零改动 | PROPOSED |
| ADR-004 | createOperationApplier 泛型化回留 base：dispatch 映射注入，9 变体分派随迁 | PROPOSED |
| ADR-005 | exec 管线参数化注入面：commandPrefix/parseBatch/describeSubcommand + handleLine/describeFetchLine | PROPOSED |
| ADR-006 | op-cli handler 注入面：OpHandlerRegistry 注册表，包定义协议/web 注入 React 回调 | PROPOSED |
| ADR-007 | web-fetch 中性化归位：lgdl-web-fetch → web-fetch，工具/解析/执行/help 归 base | PROPOSED |
| ADR-008 | op 协议单一数据源：OP_COMMANDS 元数据注册表 → WEB_OP_TOOL 动态生成 | PROPOSED |
| ADR-009 | 回归门禁口径：守恒 388 + 断言逐字节 + 新增接线测试（407-435 区间） | PROPOSED |

### ADR-001: 6 包重命名执行策略：git mv + 身份先行 + 引用后改 + lock 重建

**状态**: PROPOSED
**背景**: D-001 锁死 scoped 命名（@lgdl/lgdl-*，EC-001 不返工）；重命名影响面 = 目录/name/跨包 import ~30 处/根依赖/tsconfig/predev/CI/lock（discovery A1-A8），bin 名 lgdl-cli 与协议前缀不变（A10/A-002）。
**决策**: 顺序 = ① `git mv` 目录（保留历史）→ ② 6 包 package.json name 改身份 → ③ 跨包 import 改源（FR-002 grep 零残留）→ ④ 根/tsconfig/predev/CI 同步 → ⑤ `npm install` 重建 lock（7→9 workspace 条目）→ ⑥ 文档面（P2）。「先改包身份再改引用」：身份先行使 workspace 解析立即指向新目录，引用改写逐批可构建。
**后果**: 重命名是纯机械面（git mv + 字符串替换），零语义改动（C2/NFR-002）；FR-002/AC-002 grep 零残留为验收；R7（dist/链接残留）经 npm install + 全量 rebuild 一次性消解（EC-007）。

### ADR-002: 依赖方向：base 零 lgdl 依赖；lgdl-web-cli → base + lgdl-core 单向无环

**状态**: PROPOSED
**背景**: 作者裁决①（base 不依赖 lgdl-core）+ 任务书「lgdl-web-cli 依赖 web-cli-base（泛型机制）+ lgdl-core」；R2 循环风险。
**决策**: web-cli-base 纯化为零 @lgdl/* 依赖的公共框架（deps 仅 @anthropic-ai/sdk + openai）；lgdl-web-cli → {web-cli-base, lgdl-core}；lgdl-web-op-cli → web-cli-base（仅 HelpArg/HelpEntry 类型，零 React/DOM）；cli → {lgdl-web-cli, lgdl-core, lgdl-render}；web → {lgdl-web-cli, lgdl-web-op-cli, web-cli-base, lgdl-core, lgdl-layout, lgdl-render}。
**后果**: 依赖图 `lgdl-core ← lgdl-web-cli ← cli/web` 与 `web-cli-base ← lgdl-web-cli/lgdl-web-op-cli/cli/web` 线性无环（NFR-004/AC-006）；base 纯化后无 base→lgdl 反向边；R2 核验点为 M1 后 package.json 声明核对。

### ADR-003: DomainApi<Op,Doc> 泛型化契约：结构化类型兼容，lgdl-core 类型零改动

**状态**: PROPOSED
**背景**: FR-018 要求 DomainApi（exec.ts:40-65，19 LGDL 符号）泛型化 + base 去 lgdl-core 依赖（FR-018）；NG-003 要求类型定义零语义改动。
**决策**: base 定义 `DomainApi<Op, Doc>` 机制契约（19 方法签名类型参数化：ParseResult<Doc>/MutationResult<Doc>/OperationBatchResult<Doc> 泛型化，DIAGRAM_TYPES 收窄 readonly string[]，Issue 结构化契约）；lgdl-core 具体类型经 TS 结构化类型系统赋给契约（字段超集即可）；具体 DomainApi 实例（lgdlDomain 19 符号）随 adapters 迁 lgdl-web-cli（FR-012）。
**后果**: base 零 lgdl 类型引用（FR-018 grep 验收）；类型定义零改动（NG-003）；管线访问字段全部在契约内（R10 兜底：契约全量收口 exec.ts 访问面）；任意领域可实例化（NFR-005）。

### ADR-004: createOperationApplier 泛型化回留 base：dispatch 映射注入，9 变体分派随迁

**状态**: PROPOSED
**背景**: D-002 决策「泛型化版本回留 base，9 mutations 映射随业务迁」；FR-020 验收「注入相同 mutations 集时分派输出逐字节一致」。
**决策**: base `createOperationApplier<Op, Doc>(dispatch: Record<string, (doc: Doc, op: Op) => MutationResult<Doc>>)` 返回 { applyOperation, applyOperations }——分派查找（op 字段判别）+ 失败即停批量循环（:168-189 逐行复制）；9 个 op 变体的解构调用（:92-154 case 体）随迁 lgdl-web-cli/operations.ts 的 lgdlDispatch；lgdlApplier = createOperationApplier<LgdlOperation, LgdlDocument>(lgdlDispatch)（adapters/lgdl.ts:56-66 调用形态不变）。
**后果**: 机制（注入分派器）留 base、业务（LGDL 协议形状）随迁，与作者裁决①④精确投影（D-002 理由）；零语义改动由「case 体逐行复制 + 注入相同映射输出一致」保证（NFR-005）；随迁 operations.test 9 例承载。

### ADR-005: exec 管线参数化注入面：commandPrefix/parseBatch/describeSubcommand + handleLine/describeFetchLine

**状态**: PROPOSED
**背景**: FR-019 要求 base exec 21 处 'lgdl-web-cli' 硬编码参数化/随迁；D-004 决策 tokenizeCli/parseArgs 留 base、parseWebCliCommand/Batch 路由面随迁。
**决策**: base createExecutor 管线骨架（:101-370）保留，`ExecutorOptions<Op>` 增 3 注入参数——commandPrefix（替代 :376 前缀判断与 :146 错误文案内嵌前缀）、parseBatch（单行批量解析，lgdl-web-cli 注入其 parseWebCliBatch）、describeSubcommand（替代 :352-365 LGDL 描述文案，lgdl-web-cli 注入 describeLgdlSubcommand 逐字节实现）；保留 handleLine/describeFetchLine（ADR-007 延续）；base 默认值 = 无前缀/内置 createBatchParser 骨架/`${sub} ${args}` fallback。
**后果**: base 源码 'lgdl-web-cli' 字符串清零（FR-019 grep 验收）；注入等价参数时行为与迁移前逐字节一致（NFR-005）；lgdl-web-cli/adapters 组装时注入全部参数，web 侧组装叠加 fetch 处理器。

### ADR-006: op-cli handler 注入面：OpHandlerRegistry 注册表，包定义协议/web 注入 React 回调

**状态**: PROPOSED
**背景**: FR-016/FR-024（C6）：op-cli 包不含 React 执行体，16 分支（App.tsx:943-1055）由 web 注入；§3.1 方案对比选定注册表形态。
**决策**: lgdl-web-op-cli 定义 `OpHandler = (args) => OpExecResult` + `OpHandlerRegistry`（register/has/execute，未注册子命令返回与现状 App.tsx:1053 一致文案）；web App.tsx 逐分支复制 16 个实现为注册回调（useMemo 组装，依赖 source/downloadSvg/downloadPng/jumpToIssue/selectExample/applyAiSource）；AiPanel 分发维持（next-actions 拦截 + onWebOp 转发 registry.execute）。
**后果**: 包内纯协议/元数据零 React/DOM（FR-016/NFR-004 grep 验收）；执行行为 1:1 迁移（NFR-002）；handlers.test 2-3 例包内可测（NFR-003 新增接线测试）；其他领域可复用注册表注入自有 UI 操作。

### ADR-007: web-fetch 中性化归位：lgdl-web-fetch → web-fetch，工具/解析/执行/help 归 base

**状态**: PROPOSED
**背景**: 作者裁决③ + FR-022：lgdl-web-fetch 是平台级能力，自 web 归 base 并中性化改名（唯一命名例外，A-002/NG-007）。
**决策**: WEB_FETCH_TOOL（provider.ts:261-289）+ parseWebFetchCommand/executeWebFetch（web-fetch.ts:19-79）+ webFetchHelp（help.ts:126-137）迁 base（tools.ts/web-fetch.ts 新文件/help.ts）；工具 name 与前缀 `lgdl-web-fetch` → `web-fetch`；web 侧改名联动（lgdl-web.ts:17/:32、AiPanel.tsx:154/:431、prompts.ts:20/:27-28/:43、web-fetch.test 6 例断言）。
**后果**: base 平台能力补齐（其他领域可复用）；web 应用层与平台能力解耦（discovery §1 核心问题 4 消解）；改名是命名改动非语义改动（NFR-002 例外声明）；全仓 grep 'lgdl-web-fetch' 零残留（FR-022 验收）。

### ADR-008: op 协议单一数据源：OP_COMMANDS 元数据注册表 → WEB_OP_TOOL 动态生成

**状态**: PROPOSED
**背景**: FR-016 要求消除「工具定义 + help 元数据」双份并存（discovery §2.3 发现：provider.ts:232-239 enum vs help.ts:27-89 entries）；FR-017 界定 op 协议 = 元数据契约。
**决策**: lgdl-web-op-cli 定义 `OP_COMMANDS: Record<string, OpCommandMeta>`（16 条逐字节自 WEB_OP_ENTRIES，含 export 别名:34-39）+ `OP_SUBCOMMANDS = Object.keys(OP_COMMANDS)` 为唯一事实源；WEB_OP_TOOL.parameters.enum 由 OP_SUBCOMMANDS 生成（定义顺序保序 → schema 逐字节不变）；help 与分发判别复用 OP_SUBCOMMANDS。
**后果**: 单一数据源闭环（FR-016 验收）；schema 逐字节验收由 tool.test diff 兜底（R13）；不新增文本解析能力（FR-017/NG-004）。

### ADR-009: 回归门禁口径：守恒 388 + 断言逐字节 + 新增接线测试（407-435 区间）

**状态**: PROPOSED
**背景**: NFR-003 测试守恒（≥388）；discovery §4.2 预估 V2 后 407-435；随迁测试断言需保持逐字节（NFR-002）。
**决策**: 验收口径 = 全仓用例守恒（实测基线 419 = web-cli-base 82 + web 48 + core 260 + router 8 + render 21；守恒基准 388 = 82+48+260 口径）+ 随迁断言输出逐字节一致 + 仅新增接线/元数据测试（op-cli handlers 2-3 例）；web test 脚本文件列表重列（FR-025/EC-005）与新包通配符脚本 + dist-test 清理并行。
**后果**: validate 阶段按守恒口径验收；零新功能红线（NFR-001）顺带验证（新增仅接线测试非业务功能）；R5 测试脚本漏改被验收项拦截（EC-005）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 discovery 基线（文件:行号核实，修正 protocol/exec/llm/help/provider 测试用例分布与 WEB_CLI_TOOL 20 子命令计数口径）+ spec 决策（D-001~D-004）编写技术方案；产出重命名执行策略（git mv/身份先行/引用后改/lock 重建）、lgdl-web-cli/lgdl-web-op-cli 包结构设计、op-cli handler 注入面设计（OpHandlerRegistry）、base 纯化设计（DomainApi<Op,Doc> 泛型契约/createOperationApplier 泛型回留/exec 参数化注入/ChatResult 单列表/web-fetch 归位）、web 接线设计、迁移步骤序列（M0~M11）、测试策略（守恒 388→实测 419→V2 422-425）、风险缓解矩阵（R1-R9 + 补充 R10-R13）、9 项 ADR、工作量评估（≈7.7 人日） | 2026-08-31 | SDDU Plan Agent |
