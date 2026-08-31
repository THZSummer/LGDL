# 审查策略：specs-tree-web-cli-v2（web-cli V2 抽取与包体系重构）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md（需求规范，25 FR 五组 / 7 NFR / 10 EC / AC-001~010 + 决策 D-001~004）、plan.md（技术方案，M0~M11 / 9 ADR）、tasks.md（任务清单，21 任务）、state.json（builded，notes 含 build 4 项偏差记录）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-01
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-01
> **更新说明**: 初始创建 — 基于 spec 的 AC-001~010 + plan 的 9 项 ADR + build 的 4 项偏差，自主定义 C1~C25 审查清单 + B1~B4 偏差复核清单

> **执行模式说明**：本 Feature 用户指令「build 已完成，策略设计 + 报告执行可一并执行」——review.md（策略）与 review-report.md（报告）同轮产出。策略已基于 spec/plan/build 摘要先行定义，报告执行基于重构后代码实况逐项落实。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查对象 | 9 包（6 改名 + web-cli-base 纯化 + lgdl-web-cli + lgdl-web-op-cli）+ 根配置/CI/lock + 文档面 |
| 审查清单 | C1~C25（四维度：规范符合性 16 / 零语义 4 / 架构一致性 6 / 测试质量 1）+ B1~B4（build 偏差复核） |
| 审查基线 | git tag `pre-v2-rename`（5ea98f3）逐字节 diff；spec AC-001~010 / NFR-001~007 / FR-001~025 |
| 质量门槛 | 每个 FR ≥ 1 个 Cx；四维度至少 1 条；无法审查项显式标注「不适用」 |

## 2. 自主审查清单（C1~CN）

**审查对象来源**：
- `spec.md`：FR-001~025（五组 REN/CLI/OPC/BAS/WEB）→ 逐项核验实现完整性；NFR-001~007；EC-001~010；AC-001~010
- `plan.md`：ADR-001~009 → 架构遵循性检查
- `state.json` notes：build 4 项偏差记录（①TASK-014 提前并批、②WEB_OP_TOOL 枚举收敛、③WEB_FETCH_TOOL 描述微调、④base 注释/夹具清理）→ 逐一复核
- 重构后代码：9 包 src + package.json 全量；根 package.json/tsconfig/CI；package-lock.json；README/docs

**四维度覆盖**：重命名完整性（C1~C2）→ base 纯化（C3~C7）→ 抽取正确性（C8~C17）→ 零语义改动（C18~C20）→ 依赖方向与接线（C21~C23）→ 测试守恒与文档（C24~C25）；build 偏差复核独立成节（B1~B4）。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 包结构 9 包就位（目录 + name + workspace） | FR-001 / AC-001 / D-001 | 规范符合性 | `ls packages/` 9 目录；9 包 package.json name 逐项核验（6 个 @lgdl/lgdl-* + @lgdl/web-cli-base + 2 新包）；lock 含 9 新 workspace 条目 |
| C2 | 重命名零残留（跨包 import + 根配置 + CI + predev + tsconfig） | FR-002 / FR-003 / AC-002 / ADR-001 | 规范符合性 | grep 旧包名 `@lgdl/core`/`@lgdl/layout`/`@lgdl/render`/`@lgdl/router`/`@lgdl/cli`/`@lgdl/web`（排除 web-cli-base 与 lgdl-* 新名）；根 package.json dependencies / tsconfig references / CI workspace 名与 paths / predev 核验 |
| C3 | base 零 lgdl 依赖（package.json） | FR-018 / AC-003 / NFR-004 / ADR-002 | 架构一致性 | base/package.json dependencies 核验——应仅 @anthropic-ai/sdk + openai，无任何 @lgdl/* |
| C4 | base src 零硬编码（@lgdl/ import + lgdl-web-* 字样） | FR-018 / FR-019 / FR-021 / AC-003 / EC-003 | 规范符合性 | `grep -rn "@lgdl/"` 与 `grep -rn "lgdl-web-cli\|lgdl-web-op-cli\|lgdl-web-fetch"` 于 packages/web-cli-base/src（web-fetch 中性名除外）；llm.ts 单独 grep lgdl 零命中 |
| C5 | DomainApi<Op,Doc> 泛型化正确性 | FR-018 / ADR-003 / NFR-005 / R10 | 架构一致性 | exec.ts DomainApi 接口 19 方法签名类型参数化；ParseResult<Doc>/MutationResult<Doc>/OperationBatchResult<Doc> 泛型化；Issue 结构化契约；管线访问字段均在契约内；任意领域可实例化 |
| C6 | createOperationApplier 泛型化回留 base | FR-020 / ADR-004 / D-002 | 架构一致性 | base/operations.ts 泛型工厂（dispatch 映射注入、失败即停批量循环）；无 LGDL 类型引用；lgdl-web-cli 组装调用形态不变（lgdlApplier = createOperationApplier(lgdlDispatch)） |
| C7 | llm.ts 三工具分流去耦（ChatResult 单列表） | FR-021 / ADR-003（llm 面）/ D-003 / EC-004 | 规范符合性 | ChatResult 仅 content/toolCalls/model 三字段；chat() 无按工具名过滤；llm.ts grep lgdl 零命中；消费方（provider/AiPanel）已改单列表分发 |
| C8 | lgdl-web-cli：9 命令注册表迁入（commands.ts） | FR-007 / AC-009 / NFR-002 | 规范符合性 | git diff 基线 commands.ts LGDL 面 → 新包 commands.ts：COMMANDS 9 命令/KNOWN_PARAMS/buildOperation/requireParams/assertChangeRequested/parseAttrsSpec/parseMemberSpec 逐字节；CommandSpec/KindResolver 自 base 导入；import 源 @lgdl/lgdl-core |
| C9 | lgdl-web-cli：LgdlOperation 协议 + lgdlDispatch | FR-008 / ADR-004 / NG-003 | 规范符合性 | operations.ts：describeOperation/OperationMutations/LgdlOperation re-export/lgdlDispatch 9 变体（case 体逐行复制）；调 base 泛型工厂；LgdlOperation 判别联合 9 变体协议形状零改动 |
| C10 | lgdl-web-cli：WEB_CLI_TOOL 迁入（tools.ts） | FR-009 / AC-009 / NFR-002 | 规范符合性 | git diff 基线 tools.ts → 新包 tools.ts：工具 name/description/parameters 逐字节；20 子命令 enum 逐字节 |
| C11 | lgdl-web-cli：协议解析迁入（protocol.ts） | FR-010 / D-004 / AC-009 | 规范符合性 | 'lgdl-web-cli' 前缀校验/17 子命令枚举/--doc 语义随迁；tokenizeCli/parseArgs 自 base 导入（D-004）；parseWebCliBatch 调 base createBatchParser；错误消息与基线逐字节（例外 = lgdl-web-fetch→web-fetch 联动） |
| C12 | lgdl-web-cli：help 示例迁入（help.ts） | FR-011 / AC-009 | 规范符合性 | PARAM_DESC/WEB_CLI_EXTRA/INCR_EXAMPLES/INCR_SUMMARIES/webCliHelp 系列随迁；HelpArg/HelpEntry 自 base 导入；help 输出与基线逐字符（例外 = lgdl-web-fetch→web-fetch 联动） |
| C13 | lgdl-web-cli：adapters 组装单点 + 消费方接线 | FR-012 / FR-013 / AC-007 / R2 / EC-002 | 架构一致性 | adapters/lgdl.ts 全量（lgdlKindResolver/lgdlApplier/lgdlBuildOperation/lgdlDomain 19 符号/lgdlExecutor + 具名导出）；cli 9 命令 import 源 @lgdl/lgdl-web-cli；web 3 文件 import 源更新；bin lgdl-cli 不变 |
| C14 | lgdl-web-op-cli：OP_COMMANDS 单一数据源 + WEB_OP_TOOL schema | FR-014 / FR-016 / ADR-008 / R13 | 规范符合性 | OP_COMMANDS 16 条键序与基线 WEB_OP_ENTRIES 一致（含 export 别名）；OP_SUBCOMMANDS 派生 enum 与基线工具 enum 逐项一致；WEB_OP_TOOL name/description 逐字节 |
| C15 | lgdl-web-op-cli：next-actions 迁入 | FR-015 / AC-004 | 规范符合性 | NextAction/parseNextActions 随迁；解析行为与基线一致；web 侧迁出联动（AiPanel import 源切换） |
| C16 | lgdl-web-op-cli：handler 注入面零 React/DOM | FR-016 / ADR-006 / NFR-004 / AC-006 | 架构一致性 | OpHandlerRegistry/OpHandler/OpExecResult 包内纯协议；`grep -rniE "react|document\.|localStorage"` 零命中；包内无文本行解析模块（FR-017）；依赖仅 @lgdl/web-cli-base（类型） |
| C17 | web-fetch 归位与中性化改名 | FR-022 / ADR-007 / NG-007 | 规范符合性 | WEB_FETCH_TOOL/parseWebFetchCommand/executeWebFetch/webFetchHelp 归 base；工具名与前缀 lgdl-web-fetch→web-fetch；全仓 grep 'lgdl-web-fetch' 零残留；web 侧改名联动（lgdl-web.ts/AiPanel/prompts） |
| C18 | web 接线：三工具分发 + 单列表消费 | FR-023 / D-003 / EC-004 | 规范符合性 | provider chat() 三工具组装引用新源；AiPanel 分发三分支（lgdl-web-cli/lgdl-web-op-cli/web-fetch）按工具名判别；res.toolCalls 单列表消费；旧三字段 opCalls/fetchCalls 零残留 |
| C19 | web 接线：op 执行 handler 注入 | FR-024 / ADR-006 / AC-009 | 规范符合性 | App.tsx handleWebOp 16 分支 → opRegistry 注册注入（逐分支复制）；未知操作文案由 registry 未注册分支复现；web/help.ts 迁出面删除；AiPanel 胶囊卡片留 web |
| C20 | 零语义改动总验（help/tools schema/错误消息/协议） | NFR-002 / AC-009 / EC-010 | 规范符合性 | WEB_CLI_TOOL/WEB_OP_TOOL schema diff 逐字节；webCliHelp/webOpHelp 输出 diff；协议错误消息字符串集合对比——唯一允许差异 = web-fetch 中性化改名联动（FR-022/NG-007）；随迁测试断言逐字节保持 |
| C21 | 依赖方向无环 + 构建链完整性 | NFR-004 / NFR-006 / AC-006 / AC-008 / ADR-002 / EC-002 / EC-006 / EC-007 | 架构一致性 | 9 包 package.json 声明核验（base 零 @lgdl/*、lgdl-web-cli→base+lgdl-core、op-cli→base 仅类型、cli→lgdl-web-cli+lgdl-core+lgdl-render、web→六包）；无环无 base→lgdl 反向边；全仓 build 零错误；CI 文件 workspace 名与 paths；tsconfig references；node_modules/@lgdl 链接与源码引用一致 |
| C22 | 测试守恒与随迁完整性 | NFR-003 / AC-005 / ADR-009 / EC-005 / EC-010 | 测试质量 | 各包测试用例静态计数（test( 词边界）；守恒 ≥ 388 基线；无测试因重构删除；随迁测试断言有效性抽样；web test 脚本文件列表与实际文件集合一致性 |
| C23 | 文档面同步（P2） | FR-005 / AC-010 / EC-008 / NG-006 | 规范符合性 | README/docs/cli-guide 无旧包名残留；research 历史文档按「加注」方案落地（7 文件） |
| C24 | 零新功能红线 | NFR-001 / NG-001~NG-007 | 规范符合性 | 命令数 9 / 工具数 3（子命令 20+16+1）/ 协议前缀不变（lgdl-web-cli/lgdl-web-op-cli）；仅新增接线/元数据测试（handlers.test 3 例）；bin lgdl-cli 不变 |
| C25 | 代码质量走查（新包核心） | 项目宪法 / §5.1 方法 | 代码质量 | 新包模块职责单一；命名清晰；错误处理覆盖；无魔法数字/硬编码残留（业务包内 lgdl 前缀属合法随迁）；泛型签名可读性 |

**build 偏差复核清单（B1~B4，state.json notes 记录 4 项偏差逐一设审查项）**：

| # | 偏差内容（build 记录） | 复核要点 |
|---|----------------------|---------|
| B1 | TASK-014 web 最小 import 源切换提前拉入 TASK-012 批内（base 收敛删 lgdlDomain/WEB_CLI_TOOL/./lgdl 子路径会断 web 构建，为守「每步可构建」门禁并批） | DAG 顺序未变（TASK-014 完成其余验收项）；web 构建与测试绿；base 收敛与 web 接线无遗漏 |
| B2 | WEB_OP_TOOL 子命令枚举收敛：OP_SUBCOMMANDS 按「OP_COMMANDS 键去 export 别名 + 追加 help」派生（16 项，FR-014/AC-009 逐字节）；双份并存收敛以工具 schema 为基准 | 派生 enum 与基线工具 enum 逐项一致；export 别名仅 help 文档化；help 子命令经 App default→webOpHelp 可调用 |
| B3 | WEB_FETCH_TOOL 描述文案微调：原描述引用旧工具名（lgdl-web-cli/lgdl-web-op-cli/lgdl-web-fetch），归位 base 后按 AC-003 零 lgdl-web-* 硬编码要求改为中性表述 | 属 FR-022 改名例外组成部分；描述中性化且功能语义保留；base grep 零 lgdl-web-* 命中 |
| B4 | base 注释与测试夹具中 lgdl-web-*/@lgdl/lgdl-* 字样清理（AC-003 字面 grep 门禁，仅注释/夹具非语义） | base/src 源码（含注释）grep 零命中；测试夹具中 lgdl 字样仅剩中性路径引用（lgdl/web/workbench/README-CLI.md） |

## 3. 审查执行说明

- **零语义改动验证基线**：git tag `pre-v2-rename`（5ea98f3）为迁移前基线；重构改动处于 staged/未提交工作区状态，diff 对比用 `git show pre-v2-rename:<path>` vs 当前工作区文件。
- **审查方式**：静态阅读 + 字符串集合 diff + grep 门禁；不运行测试（动态验证归 validate 阶段），测试守恒以静态计数 + build 摘要实测（420 例全绿）交叉核验。
- **结论标准**：阻塞问题 0 个、改进项 < 5 个、规范符合率 100% → ✅ 通过；否则 ⚠️ 有条件通过 / ❌ 不通过。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec（25 FR/7 NFR/10 EC/AC-001~010/D-001~004）+ plan（9 ADR/M0~M11）+ build 4 项偏差，定义 C1~C25 审查清单 + B1~B4 偏差复核清单；四维度覆盖（重命名/base 纯化/抽取正确性/零语义/依赖与接线/测试守恒/文档） | 2026-09-01 | SDDU Review Agent |
