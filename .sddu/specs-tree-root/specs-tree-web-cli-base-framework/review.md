# 审查策略：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md（24 FR 五组 RTR/UPL/DLY/REG/IN + 8 NFR + 12 EC + AC-001~012 + D-001~D-006）、plan.md（技术方案 + ADR-001~004 + 文件影响面）、tasks.md（13 任务 / 9 波次）、build.md（构建报告 + §5 六项实现口径）、state.json（builded）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-05
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建 — 基于 spec（24 FR / 8 NFR / 12 EC / AC-001~012）+ plan（4 ADR + §5 文件影响面）+ build（§2 变更清单 + §5 六项实现口径）自主定义 C1~C28 审查清单（规范符合性 18 / 架构一致性 8 / 代码质量 1 / 测试质量 1）+ O1~O6 实现口径复核清单

> **执行模式说明**：本 Feature 用户指令「build 已完成（全仓 581 测试 0 失败），策略设计 + 报告执行可一并执行」——review.md（策略）与 review-report.md（报告）同轮产出。策略先行定义于本文档，报告基于 build 产物代码实况逐项落实（V2 先例一致）。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查对象 | web-cli-base（router/delay/runner/sleep/tools/help/web-fetch/index）+ lgdl-web-cli/op-cli（tool-entry）+ lgdl-web（session/provider/AiPanel/App/package.json/删除面 4 文件）|
| 审查清单 | C1~C28（规范符合性 18 / 架构一致性 8 / 代码质量 1 / 测试质量 1）+ O1~O6（build 实现口径复核）|
| 变更面 | git status + build.md 实测：NEW 12（base 6 + lgdl-web-cli 2 + op-cli 2 + lgdl-web 2）/ MODIFY 15（含 TASK-003 扩围 web-fetch.ts/web-fetch.test.ts 与 adapters/lgdl.ts 注释）/ DELETE 4 文件（base+lgdl-web help-aggregator ×2 / lgdl-web.ts / lgdl-web.test.ts）|
| 质量门槛 | 每个 FR ≥ 1 个 Cx；四维度（代码质量/规范符合性/架构一致性/测试质量）各 ≥ 1 条；无法审查项显式标注「不适用」|

## 2. 自主审查清单（C1~CN）

**审查对象来源**：
- `spec.md`：FR-001~024（五组 RTR/UPL/DLY/REG/IN）逐项核验实现完整性 + 正确性；NFR-001~008；EC-001~012；AC-001~012；D-001~D-006
- `plan.md`：ADR-001~004 → 架构遵循性检查；§2.3~2.8 设计契约（ToolEntry/dispatch/DelayGate/AgentRunner 循环映射/注册收敛/session 组装）→ 落点对照；§5 文件影响面 → 完整性
- `build.md`：§2 文件变更清单 → 覆盖完整性；§5 六项实现口径（O1~O6）→ 逐一复核
- 重构后代码实况（git status + src 全量）：packages/web-cli-base/src、packages/lgdl-web-cli/src、packages/lgdl-web-op-cli/src、packages/lgdl-web/src + package.json

**四维度覆盖**：规范符合性（FR 逐项核验为主，C1~C24）→ 架构一致性（ADR/边界/依赖/影响面，C6/C8/C10/C18/C19/C22/C27/C28）→ 代码质量（新模块走查，C25）→ 测试质量（覆盖/D-005 增删合法性/断言有效性，C26）。build 六项口径独立复核（O1~O6）。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | CommandRouter ToolEntry 注册条目契约（name/schema/prefix/executor/help/delayMs/listed 七元表达，单一数据源） | FR-001 / NFR-004 / AC-003 / ADR-001 / plan §2.3.1 | 规范符合性 | 读 router.ts ToolEntry 接口定义逐字段对照 plan §2.3.1；双业务包 tool-entry.ts 组装核验；grep lgdl-web 无注册表外第二维护面（schema 手写数组/前缀手写映射/help 手写注册/分发手写分支） |
| C2 | 统一分发执行契约 dispatch（{tool,args}→ToolResult 成功/失败统一形态 + changed/source 能力面） | FR-002 / EC-002 / AC-002 / plan §2.3.3 | 规范符合性 | 读 router.ts:257-270 dispatch 与 ToolResult 接口；5 工具执行是否全部经统一入口（lgdl-web 侧 grep 旧直连入口 executeSubcommand/executeWebFetch/opRegistry.execute 零命中）；文档变更类工具 changed+source 透传链路（web-cli tool-entry → runner hooks.onToolDone → onApply） |
| C3 | 未知工具名显式报错「✖ 未注册工具 "x"」（去静默兜底） | FR-003 / EC-001 / AC-004 | 规范符合性 | 读 router.ts dispatch 未注册分支（ok:false+文案+error+不落入执行器）；grep toolCallToCommand default 兜底与 else 静默兜底残留；router.test 专项断言 |
| C4 | 注册表自举查询（has/names/deriveTools/deriveCommand/listHelp/helpFor 派生面齐备） | FR-004 / AC-003 | 规范符合性 | 读 router.ts:188-249 六个查询/派生方法；router.test「假工具四链」用例（注册一处 → schema/help/dispatch/前缀全可见） |
| C5 | schema 派生顺序契约 deriveTools = [业务（注册序）] + [内建置末 web-fetch→sleep→web-cli-help] + 幂等 | FR-005 / AC-006 / ADR-004 / plan §2.3.4 | 规范符合性 | 读 router.ts names()/deriveTools()（Map 保序 + BUILTIN_ORDER）；router.test + session.test 派生顺序断言；与旧 provider.test.ts:191 顺序（5 工具）等价核验 |
| C6 | 中性 agent 循环上收 base（AgentRunner：turns 维护/轮次上限/多 toolCalls 逐条/按 toolCallId 回填/失败聚合/LLM 错误重试一次/可停止）+ 边界（D-003：零 React、渲染/onApply/next-actions 留场景经 events/hooks 注入） | FR-006 / EC-006~008 / D-003 / ADR-002 / plan §2.5 | 架构一致性 | 读 runner.ts 全量逐语义对照 plan §2.5.3 映射表；静态 grep runner.ts 无 react import；AiPanel.tsx 是否仅注入 system/events/hooks（渲染面保留）；runner.test 12 例语义点覆盖 |
| C7 | deriveCommand 文本命令前缀派生（前缀 + 子命令 + args 引号规则逐字节对齐旧 AiPanel:165-168；未知名→null；无 lgdl-web-cli 兜底） | FR-007 / AC-004 | 规范符合性 | 读 router.ts:210-219 引号正则 /[\s"]/ 对照旧实现；runner 内 commandLine 派生注入（session.ts deriveCommand 绑定）；router.test 引号/未知名用例；grep lgdl-web 无手写前缀映射 |
| C8 | schema 组装下沉：provider.buildTools 手写 5 元数组删除；chat schema 供给切至 router.deriveTools() | FR-008 / AC-006 / R-011 | 架构一致性 | git diff provider.ts（buildTools 删除 + chat(settings,turns,tools?) 可选参数）；session.ts chatFn 是否传 deriveTools()；provider.test 顺序用例改写（D-005）；testConnection 调用零 tools 兼容（编译面） |
| C9 | sleep function-calling 原生接入 executeSleepFromArgs（ms/seconds 归一/缺参友好文案等价旧 AiPanel:455/clamp 10min 保留；不经文本重建二次解析） | FR-009 / EC-011 / R-008 | 规范符合性 | 读 sleep.ts normalizeSleepArgs/executeSleepFromArgs（缺参文案逐字对照旧 AiPanel:455 / clamp Math.min 600000）；router.ts sleep 内建条目 executor 直调；AiPanel sleep 特判删除（grep）；sleep.test 增补用例 |
| C10 | help 聚合注册即得：listHelp/helpFor 自注册表派生；场景 help-aggregator 与 base help-aggregator 双删除；web-cli-help 内建条目 listed:false 保持旧一览语义 | FR-010 / EC-010 / AC-007 / ADR-004 | 架构一致性 | 读 router.ts listHelp/helpFor + web-cli-help 内建 executor（self-query 未知语义）；全仓 grep HelpAggregator/createHelpAggregator 零命中；git D 两 help-aggregator 文件；一览顺序（内建先业务后）与 tip 中性化 |
| C11 | 死接线收敛：lgdl-web/src/ai/lgdl-web.ts 删除（第二条 executor 接线 + fetch 行处理器注入 + 陈旧注释）；残留引用清理 | FR-011 / NFR-003 / plan §2.7.3 | 规范符合性 | git D lgdl-web.ts/lgdl-web.test.ts；全仓 grep 指向 lgdl-web.ts 的 import/注释零残留；adapters/lgdl.ts 注释是否更新（fetch 行处理器归属说明）；lgdl-web.ts 原 lgdlExecutor 消费方清零核验 |
| C12 | base 文案中性化（web-fetch schema/help 示例路径 README-CLI → guide.md；help 一览 tip 中性） | FR-012 / D-006 / AC-012 | 规范符合性 | grep base 无 README-CLI/lgdl/web/workbench 残留（TASK-003 扩围 web-fetch.ts 一并核验）；schema 结构零改动（A-001）；router.listHelp tip 中性文本；AiPanel guideDoc 注入保留（场景引导不回归） |
| C13 | 全局 delay 统一挂点 = CommandRouter.dispatch 入口（跨所有已注册工具；业务包无自行 setTimeout 旁路） | FR-013 / D-002 / ADR-003 | 规范符合性 | 读 router.ts dispatch gate 接线（effDelay = entry.delayMs ?? 全局；>0 才 before）；grep lgdl-web/lgdl-web-cli/op-cli 无 setTimeout 等待旁路（UI debounce 计时器除外）；delay 机制代码仅存路由层 |
| C14 | DelayGate 最小间隔语义（首个分发不等待；连续两分发间隔 = max(delayMs,执行耗时)；与显式 sleep 不叠加 EC-005 两场景） | FR-014 / EC-005 / AC-005 / plan §2.4.1 + build §5#1 口径 | 规范符合性 | 读 delay.ts DelayGate.before 记账逻辑（起点参考口径复核）；fake clock 注入语义；delay.test 首分发/间隔 max/慢命令/EC-005×2 断言按验收式；router.test delay 接线 EC-005；build §5#1（起点参考 vs spec 字面「完成时刻」）口径复核 |
| C15 | delayMs 配置与默认（base 默认 0 零开销；lgdl-web 场景 600ms；上限钳制 [0,5000] + 一次警告 EC-009；NaN/负数钳制） | FR-015 / EC-009 / AC-005 / plan §2.4.1 + build §5#4 | 规范符合性 | 读 router.ts 构造钳制 + warnings 记录（console.warn 一次）+ delayMs 只读暴露；delay.ts clampDelayMs；session.ts delayMs:600；router.test EC-009 钳制警告用例；build §5#4（只读观测面）复核 |
| C16 | 单工具 delay 声明免除/覆盖（entry.delayMs 0 = 免除；sleep 条目 delayMs:0 实现与 sleep 不叠加） | FR-016 / ADR-003 / plan §3.3 A | 规范符合性 | 读 router.ts sleep 内建条目 delayMs:0 注释（ADR-003 理由）；effDelay 解析优先级（entry 覆盖全局）；delay.test 免除不更新起点用例；机制层零工具名特判（grep gate 无 sleep 硬编码） |
| C17 | sleep 保留分工 + delay 静默 + 观测面（stats waitCount/waitedMs + onDelay + 时钟注入；不注入 tool 结果文本） | FR-017 / AC-005 | 规范符合性 | 读 delay.ts stats/onDelay/Clock 契约；router.stats 透传；sleep 工具条目 schema/执行/help 保留；dispatch 结果文本不含等待信息（delay 静默）；delay.test stats/onDelay 用例 |
| C18 | lgdl-web-cli 整体注册为一个 ToolEntry（schema=WEB_CLI_TOOL 逐字节 / executor 内部走 lgdlExecutor.executeSubcommand / help=webCliHelp / changed+source 透传；C 档零改动） | FR-018 / AC-002 / D-001 / NG-002 | 架构一致性 | 读 lgdl-web-cli/tool-entry.ts 全量 + 与 WEB_CLI_TOOL 逐字段对照；git status 核验 web-cli C 档文件（adapters/commands/operations/protocol/help/tools）零改动；tool-entry.test 5 例（schema/status/add-node changed+source/失败/空 source）；消费方不再深导出 lgdlExecutor + else 兜底（AiPanel grep） |
| C19 | lgdl-web-op-cli 整体注册 + OpHandlerRegistry 顶层「工具级注册/分发」角色移交 CommandRouter（handler 注入收敛为该工具执行器内部机制；next-actions 场景拦截） | FR-019 / AC-002 / D-004 / R-005 | 架构一致性 | 读 op-cli/tool-entry.ts（schema=WEB_OP_TOOL/prefix/executor→registry.execute/help）；App.tsx opRegistry 组装保留 + 经 createOpCliToolEntry 注入 session；AiPanel 无 opRegistry 直连（grep）；next-actions 由 runner hooks.intercept 拦截（AiPanel.tsx）且 op-cli 条目内不特判（tool-entry.test 末例）；OP_SUBCOMMANDS 派生 schema 经注册进派生数组（session.test） |
| C20 | 内建命令自动注册（新实例 router 即含 web-fetch/sleep/web-cli-help；一次登记 → schema+前缀+执行+help 四得；sleep delayMs:0 / web-cli-help listed:false） | FR-020 / AC-001 / EC-004 | 规范符合性 | 读 router.ts 构造 builtins 自动注册循环 + buildBuiltinEntry 三内建（executor 映射正确性：fetch→executeWebFetch/sleep→executeSleepFromArgs/help→listHelp·helpFor 闭包）；router.test 内建自足冒烟（AC-001/EC-004）；空业务场景可列可查可派发 |
| C21 | 唯一工具名集合（5 工具名除注册条目外无第二维护处；grep lgdl-web 无分发 if/else、无前缀映射、无 schema 数组、无 help 注册；注册假工具四链单点可见） | FR-021 / NFR-004 / AC-003 | 规范符合性 | grep lgdl-web/src 五工具名硬编码分发/映射/数组/help 注册零命中（注册点除外）；router.test AC-003 四链用例；tools.ts 3 内建 schema 常量与 router 内建条目一致性 |
| C22 | lgdl-web 单一路径组装 session.ts（唯一 CommandRouter 持有处：内建自动注册 + 2 业务注册 + delayMs=600 + runAgent 装配 chatFn(deriveTools)/dispatch(ctx run-local source)/deriveCommand；App 持有 useMemo；AiPanel 收 session prop） | FR-022 / AC-007 / plan §2.7.1 + build §5#5 | 架构一致性 | 读 session.ts 全量（组装点唯一性、chat 每轮 settings()/deriveTools、dispatch ctx 组装 + run-local source 推进 R-009、runAgent 注入面）；App.tsx aiSession useMemo + sourceRef/aiSettingsRef 间接（build §5#5 复核）；AiPanel props 变更（onWebOp 删/session 增）；session.test 组装断言；零 React import（可 node 测试） |
| C23 | AiPanel 分发/特判/前缀/help 聚合面删除（tc.name 五分支/sleep 特判/每次新建聚合器/toolCallToCommand/深导入全部移除），渲染面保留 | FR-023 / AC-007 / NFR-003 | 规范符合性 | git diff AiPanel.tsx（删除面逐一确认）+ 当前文件 grep 零残留；保留面（命令块/胶囊卡片/tool 结果/markdown/guideDoc/PRESET/pending）核验；events→appendMessage / hooks→next-actions 拦截 + onApply 写回映射完整 |
| C24 | AI 闭环用户可感知行为等价（消息流/顺序/失败/超限语义/next-actions 交互；差异仅限 FR-003 声明项；事件↔旧 appendMessage 类型一一映射） | FR-024 / AC-008 / plan §2.5.3 | 规范符合性 | 静态对照 plan §2.5.3 事件↔AiPanel 消息类型映射表（文本/命令块/tool 输出/失败提示/超限/空回复/LLM 错误/next-actions 卡片次序与文案）；runner.test 事件序列断言有效性；未声明差异排查（含 op 工具 !ok 现统一进失败聚合 = EC-007 一致性面，validate AC-008 动态确认） |
| C25 | 新模块代码质量走查（router/delay/runner/session/tool-entry×2：可读性/职责单一/错误处理/无魔法数与硬编码） | 项目宪法 / §5.1 方法 | 代码质量 | 逐文件走查：命名清晰度、函数单一职责（delay gate/router dispatch/runner step 各自内聚）、异常路径覆盖（dispatch 捕获 executor 抛错 EC-012；runner system/chat 错误分类处理）、常量提取（BUILTIN_ORDER/600/clamp 区间/1000 maxRounds 参数化）、注释准确性 |
| C26 | 测试质量与 D-005 测试增删合法性（新机制专项覆盖：router 13/delay 10/runner 12/sleep 增补/tool-entry×2/session 9；删除改写有据：provider 顺序断言、lgdl-web.test 2 例；断言有效性/弱断言排查） | NFR-005 / AC-009 / D-005 / tasks §4.2 | 测试质量 | 读 7 个新/改测试文件：覆盖点对照 tasks §4.1 清单；删除依据对照 tasks §4.2 与承接落点（router.test 派生顺序/session.test 派生顺序+web-fetch dispatch 2 例）；断言强度抽样（deepEqual/match/计数 vs 弱 ok 断言）；package.json test 文件列表一致性 |
| C27 | base 零 LGDL 依赖 + 零 react + 依赖方向无环（base 独立可用） | NFR-001/002/008 / AC-001/010/011 | 架构一致性 | base/package.json dependencies 核验（零 @lgdl/*）；grep base/src 零 @lgdl import/react import（router/delay/runner 专项）；runner.test 静态断言存在；依赖图谱：业务包→base 单向、base→{} 无业务边、全仓无环（package.json 声明核验） |
| C28 | C 档 LGDL 特有内容不动 + 文件影响面完整性（NEW12/MODIFY15/DELETE4 与 plan §5 对照；语言引擎/图语义/UI 操作/prompts/provider 应用态零改动；5 工具名不变） | NG-001~008 / plan §5.5 | 架构一致性 | git status 变更清单与 plan §5 影响面逐文件对照（无遗漏/无多余）；lgdl-core/lgdl-layout/lgdl-render/lgdl-router/lgdl-cli 零改动核验；lgdl-web-cli C 档（adapters/commands/operations/protocol/help/tools）与 op-cli C 档（ops/tool/handlers/help/next-actions）零改动核验（注释级除外）；prompts.ts/README/provider 应用态不动 |

**实现口径复核清单（O1~O6，build.md §5 六项逐一设复核点）**：

| # | build 记录口径 | 复核要点 |
|---|---------------|---------|
| O1 | DelayGate 参考时刻 = 上一 delay-eligible 命令**执行起点**（before() 记账；sleep 免除不更新），以满足 FR-014「间隔 = max(delayMs, 执行耗时)」验收式 | 代码（delay.ts before 记账 + router dispatch 仅 effDelay>0 调 before）与验收式自洽；EC-005 两场景（3000 不追加/200 补齐 600）在 delay.test/router.test 按验收式断言成立；spec 字面「完成时刻」措辞漂移已记录、非行为偏差 |
| O2 | AgentRunnerOptions 增 `user`（run() 无参、重复调用幂等）与可选 `deriveCommand` 注入（场景绑定 router.deriveCommand；null/缺省 → 显示原始名）——保持 runner 不依赖 router 类型 | runner.ts user/deriveCommand 字段存在且被 step 消费；run() 幂等（runPromise 缓存）；session.runAgent 注入 deriveCommand；runner.test 覆盖 commandLine 派生与幂等 |
| O3 | TASK-003 中性化范围扩至 web-fetch.ts（错误文案/注释残留）与 web-fetch.test.ts/sleep.test.ts fixture | base grep README-CLI/lgdl/web/workbench 零命中（含 web-fetch.ts 内部文案）；web-fetch.test fixture 中性化且断言语义不变（git diff 核验） |
| O4 | CommandRouter 暴露只读 delayMs（钳制后）与 warnings（EC-009 一次警告）供可测断言 | router.ts:108-110 readonly delayMs/warnings 存在；session.test 断言 delayMs=600/warnings=[]；router.test 钳制警告断言 |
| O5 | session 组装：chat 每轮 deps.settings() + deriveTools；dispatch run-local source（首次 getSource，changed 后推进）；App sourceRef/aiSettingsRef 间接 | session.ts dispatch/chat 实现；App.tsx ref 间接 + aiSession useMemo deps（opRegistry 依赖 source 时随其重建 = 既定依赖）；AiPanel/App 同批原子落地（TASK-011 红线） |
| O6 | D-005 增删承接：provider 顺序断言 → router.test+session.test；lgdl-web.test 2 例 → session.test web-fetch dispatch 2 例；AiPanel 无单测 → validate AC-008 | 承接落点逐一存在（router.test deriveTools 顺序/session.test 派生顺序 + data URL 成功/缺 path 2 例）；删除面记录（tasks §4.2/§4.3）与实际改动一致 |

## 3. 审查执行说明

- **审查方式**：静态阅读 + grep 门禁 + git diff/status 基线对照（build 产物 = 工作区当前状态）；**不运行测试**（动态验证归 validate 阶段，build 已实测全仓 581 例 0 失败，review 只核验测试存在性与断言强度）。
- **结论标准**（§6）：阻塞问题 0 个、改进项 < 5 个、规范符合率 100% → 通过；改进项存在但不阻塞 → ⚠️ 有条件通过（建议修复后验证）；存在阻塞 → ❌ 不通过。
- **无法动态审查项标注**：FR-024/AC-008 的「AI 实战闭环行为等价」「delay 600ms 调参」属 validate 动态验证面，本报告静态面只核验映射一致性与代码路径等价，显式标注「动态面移交 validate」。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 spec（24 FR/8 NFR/12 EC/AC-001~012/D-001~D-006）+ plan（ADR-001~004 + §5 影响面）+ build（§2 变更清单 + §5 六项口径）定义 C1~C28 审查清单（24 FR 逐一映射 + 代码质量/测试质量/依赖纯度/影响面四条横切）+ O1~O6 口径复核；质量门槛四维度覆盖 | 2026-09-05 | SDDU Review Agent |
