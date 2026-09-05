# 审查报告：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C28 审查清单 + O1~O6 口径复核清单，v1.0）
> **前置依赖**: review.md、spec.md、plan.md、tasks.md、build.md、state.json（builded，含 notes build 摘要）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-05
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建 — 基于 build 产物代码实况（git status/diff + 全量 src 静态阅读 + grep 门禁）逐项执行 C1~C28 与 O1~O6 复核；零测试运行（动态面移交 validate）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 28（C1~C28）+ 6（O1~O6 口径复核） |
| 通过 | 28（C1~C28 全部 PASS） |
| 警告 | 0 |
| 失败 | 0 |
| 阻塞问题 | 0 |
| 改进建议 | 4（均低严重度，不阻塞 validate） |

**结论：⚠️ 有条件通过** — 代码质量合格、规范符合率 100%、无阻塞问题；4 项低严重度改进建议不阻塞 validate 启动（其中 IMP-1/IMP-2 建议 validate 网络实测前顺手处理）。

## 2. 逐项审查结果（C1~CN）

> 对照 review.md 中定义的审查清单，逐项评估并记录发现（evidence = 文件:行号）

| # | 审查对象 | 审查基准 | 评估 | 发现（含 evidence） | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | ToolEntry 注册条目契约 | FR-001 / NFR-004 / AC-003 / ADR-001 | ✅ | router.ts:39-56 ToolEntry 七字段（name/summary/schema/prefix/executor/help/delayMs/listed）与 plan §2.3.1 契约一致；router.ts:104-106 business/builtins 双 Map 保序注册表为唯一工具名集合；lgdl-web-cli/tool-entry.ts:22-43 + op-cli/tool-entry.ts:23-33 整体注册组装；lgdl-web grep buildTools/手写 schema 数组/前缀映射/help 场景注册零命中（删除面见 C23/C10） | — |
| C2 | 统一分发执行契约 | FR-002 / EC-002 / AC-002 | ✅ | router.ts:58-68 ToolResult{ok/output/changed/source/error} + :257-270 dispatch 统一入口；5 工具执行全部经 router：lgdl-web 无旧直连（grep executeSubcommand/executeWebFetch/executeSleep/opRegistry.execute 于 lgdl-web/src 零命中，仅 App.tsx:989 注释提及）；changed+source 链路：lgdl-web-cli/tool-entry.ts:35-41 透传 → runner hooks.onToolDone（runner.ts:160）→ AiPanel.tsx:402-404 onApply 写回（FR-002「changed+source 契约 + onApply 行为一致」达成） | — |
| C3 | 未知工具名显式报错 | FR-003 / EC-001 / AC-004 | ✅ | router.ts:258-261 dispatch 未注册分支：`{ok:false, output:'✖ 未注册工具 "x"', error:'unregistered tool'}` 且不调用任何执行器；AiPanel 旧 toolCallToCommand default（'lgdl-web-cli'）与 else 兜底分支已删除（git diff AiPanel.tsx 全删）；router.test.ts:118-127 断言文案+error+executed=false；错误回填 AI 不中断会话由 runner 失败聚合承接（EC-001） | — |
| C4 | 注册表自举查询 | FR-004 / AC-003 | ✅ | router.ts has(:188-190)/names(:193-195)/deriveTools(:198-203)/deriveCommand(:210-219)/listHelp(:229-241)/helpFor(:244-249) 六查询/派生面齐备；router.test.ts:208-230「注册假工具 fake-adder 一处 → schema 派生/help 一览+详情/dispatch/前缀派生四链全可见」= AC-003 冒烟 | — |
| C5 | deriveTools 顺序契约 | FR-005 / AC-006 / ADR-004 | ✅ | router.ts names() = [...business.keys(), ...builtins.keys()]（业务=Map 注册序）+ 内建固定 BUILTIN_ORDER（router.ts:89 web-fetch→sleep→web-cli-help）；deriveTools 幂等（无状态派生）；router.test.ts:149-160 断言 [biz-1,biz-2,web-fetch,sleep,web-cli-help] + 幂等；session.test.ts:41-47 断言 lgdl-web 场景派生顺序 = 旧 provider.test.ts:191 等价（D-005 承接） | — |
| C6 | AgentRunner 中性循环上收 | FR-006 / EC-006~008 / ADR-002 | ✅ | runner.ts:121-182 step 循环语义与 plan §2.5.3 逐点对应（turns 初始化 :92 / maxRounds 超限 :123-126 onRoundLimit+finish / 多 toolCalls 逐条 :153-164 / toolCallId 回填 :163 / 失败聚合 :165-169 纠正 user turn / LLM 错误重试一次 :108-119 / stop :189-191）；事件 8 个（runner.ts:30-47）齐全 + hooks intercept/onToolDone（:50-55）；**零 react import**（静态 grep + runner.test.ts:9-12 断言）；D-003 边界：AiPanel.tsx:348-407 仅注入 system/events/hooks，渲染留场景 | — |
| C7 | deriveCommand 前缀派生 | FR-007 / AC-004 | ✅ | router.ts:210-219 deriveCommand：prefix 缺省=name、引号正则 `/[\s"]/` 逐字节对齐旧 AiPanel:165-168（含内嵌引号不转义行为）；未知名→null；session.ts:80 绑定 router.deriveCommand 注入 runner；router.test.ts:162-178 覆盖无子命令/引号包裹/prefix 覆盖/未知名→null；lgdl-web 无手写前缀映射残留（grep toolCallToCommand 零命中） | — |
| C8 | schema 组装下沉 | FR-008 / AC-006 / R-011 | ✅ | git diff provider.ts：buildTools()（旧 :247-275）整体删除 + 三工具 schema import 清理；chat(settings,turns,tools?: LlmToolDef[]) 可选 tools（:240-256，缺省 []）；session.ts:73-78 chatFn 每轮传 router.deriveTools()；testConnection(:217-232) 调用不带 tools 编译兼容；provider.test.ts 顺序用例删除 + D-005 注释记录（承接见 C26） | — |
| C9 | sleep fc 原生接入 | FR-009 / EC-011 / R-008 | ✅ | sleep.ts normalizeSleepArgs(:79-96)：ms 优先/seconds×1000/缺参友好文案 `'✖ sleep 需要一个时长参数：sleep --ms <毫秒> 或 --seconds <秒>，如 sleep --ms 5000'` 逐字等价旧 AiPanel:455、clamp Math.min(ms,600000) 保留；executeSleepFromArgs(:102-108) fc 直调不经文本重建；router.ts:155-157 sleep 内建 executor 直调；AiPanel sleep 特判块删除（grep parseSleepCommand 于 lgdl-web/src 零命中）；sleep.test.ts 增补 6 例（归一/缺参/非法/clamp 零真实等待/端到端） | — |
| C10 | help 聚合注册即得 | FR-010 / EC-010 / AC-007 / ADR-004 | ✅ | router.ts listHelp(:229-241 一览=内建先业务后、web-cli-help 不自列、tip 中性)/helpFor(:244-249 未知/未列→null)；web-cli-help 内建条目 listed:false（router.ts:167）executor 自查→未知文案（:171 `✖ 未知工具 "x"（web-cli-help 列出全部可用工具）`= EC-010 旧文案）；全仓 grep HelpAggregator/createHelpAggregator 源码零命中；git D base help-aggregator.ts + lgdl-web/ai/help-aggregator.ts；listHelp 一览 4 工具语义（router.test:186-206/session.test:108-117 断言） | — |
| C11 | 死接线收敛 | FR-011 / NFR-003 | ✅ | git D lgdl-web/ai/lgdl-web.ts + lgdl-web.test.ts；全仓 grep `lgdl-web\.ts|ai/lgdl-web` 零命中（含 import/注释）；adapters/lgdl.ts 头注释（:10-13）更新为「web-fetch 是 base 独立内建工具，exec.ts handleLine 扩展点保留为 base 中性机制」消除陈旧引用；原 lgdl-web.ts 的 lgdlExecutor 单例/第二条接线无残留消费方 | — |
| C12 | base 文案中性化 | FR-012 / D-006 / AC-012 | ✅ | tools.ts:28/39 web-fetch description+path 示例 → guide.md、:92 WEB_CLI_HELP_TOOL 示例 → my-cli；help.ts:34 webFetchHelp 示例 → guide.md；TASK-003 扩围 web-fetch.ts（错误文案 4 处示例 → guide.md）+ web-fetch.test.ts fixture 中性化（O3 复核）；grep base/src 无 README-CLI/lgdl/web/workbench 残留（仅 router.ts:5/tools.ts:8 开发者注释提及 lgdl-web-cli 业务工具名，非 AI 可见文案，AC-012 清单面合规）；router.listHelp tip 中性（router.ts:239）；AiPanel guideDoc 注入保留（AiPanel.tsx:271-284 fetch + :355-363 system 注入），场景引导不回归 | — |
| C13 | delay 统一挂点 | FR-013 / ADR-003 | ✅ | router.ts:262-263 dispatch 内 `effDelay = e.delayMs ?? this.delayMs; if (effDelay > 0) await this.gate.before(...)` — 机制只存路由层、跨所有已注册工具；业务包无 setTimeout 等待旁路（grep lgdl-web/lgdl-web-cli/op-cli：lgdl-web 6 处 setTimeout 均为 UI debounce/复制提示/snap 节流，非命令执行等待；业务包内零命中）；sleep/web-fetch/web-cli-help 内建同样经 gate（sleep 经 FR-016 免除） | — |
| C14 | DelayGate 最小间隔语义 | FR-014 / EC-005 / AC-005 | ✅ | delay.ts:57-91 DelayGate.before：lastSlotStart null（首分发）不等待、需补齐则 waitCount/waitedMs/onDelay/clock.sleep、记账「执行起点」（O1 口径）；连续两分发起点间隔 = max(delayMs, 执行耗时) 与 FR-014 验收式精确自洽；EC-005 两场景由 delay.test.ts:90-111（3000 不追加 / 200 补齐 400）+ router.test.ts:247-272 按验收式断言成立（build §5#1 口径与 plan §2.4.1 推导一致，spec 字面「完成时刻」为措辞漂移已记录，见 IMP-3） | — |
| C15 | delayMs 配置与默认 | FR-015 / EC-009 / AC-005 | ✅ | router.ts:113-120 构造钳制（clampDelayMs）+ 超出 [0,5000] 记录一次 warnings + console.warn（EC-009「钳制并警告」plan 裁决）；delay.ts:33-37 clampDelayMs（<0/NaN/∞→0、>5000→5000）；router.ts:110 readonly delayMs（O4 口径）暴露钳制后值；session.ts:56 `createCommandRouter({ delayMs: 600 })` 场景默认 600（FR-015）；base 未配置 = 0 零开销（delay.ts:77 `delayMs<=0 直接返回`）；router.test.ts:286-306 EC-009 钳制+一次警告断言；session.test.ts:49-53 delayMs=600/warnings=[] 断言 | — |
| C16 | 单工具免除/覆盖 | FR-016 / ADR-003 | ✅ | router.ts:262 effDelay 优先级 = entry.delayMs ?? 全局（FR-016）；sleep 内建条目 delayMs:0（router.ts:153-154 注释「自带显式时长即间隔来源 ADR-003」）；gate 不认识工具名、零特判（delay.ts 无 sleep 硬编码）；delay.test.ts:80-88 免除命令不等待不更新起点 + 后续 gated 命令行为断言 | — |
| C17 | sleep 保留 + 静默 + 观测 | FR-017 / AC-005 | ✅ | sleep 工具条目 schema=SLEEP_TOOL/executor=executeSleepFromArgs/help=webSleepHelp 全保留（router.ts:148-160）；delay 静默：dispatch 结果文本不含等待信息（ToolResult.output 仅执行器输出）；观测面：delay.ts:39-44 DelayStats + :63-70 stats getter + onDelay 构造注入 + Clock 注入（router Options.clock router.ts:95）；router.stats 透传（:273-275）；delay.test.ts:113-128 stats+onDelay 断言 | — |
| C18 | lgdl-web-cli 整体注册 | FR-018 / AC-002 / D-001 | ✅ | lgdl-web-cli/tool-entry.ts:21-44 createLgdlWebCliTool()：schema=WEB_CLI_TOOL.function 逐字段引用（非拷贝，单一数据源）、executor 内部 lgdlExecutor.executeSubcommand(ctx.source ?? '', subcommand, args, ctx.docId)（:29-34）、output=lines.join 或 (无输出)、changed/source/error 透传、help=webCliHelp()；git status 核验 web-cli C 档（adapters/lgdl.ts 除注释外、commands/operations/protocol/help/tools）零改动（NG-001/NG-002）；tool-entry.test.ts 5 例（schema 逐字段/status 只读往返/add-node changed+source/失败映射/空 source）；lgdl-web 不再深导出 lgdlExecutor（AiPanel grep 零命中） | — |
| C19 | op-cli 注册 + 角色移交 | FR-019 / AC-002 / D-004 | ✅ | op-cli/tool-entry.ts:22-34 createOpCliToolEntry(registry)：schema=WEB_OP_TOOL/prefix/executor=registry.execute(tc.subcommand, tc.args)→{ok,output,error}、next-actions 不特判（tool-entry.test.ts:50-58 末例证明）；App.tsx opRegistry useMemo 19 handler 组装保留（:983-1126）+ handleWebOp 删除（:1121-1124 旧转发）；AiPanel 无 opRegistry 直连（grep 仅 App.tsx:989 注释）；next-actions 由 AiPanel.tsx:390-399 hooks.intercept 场景拦截；OP_SUBCOMMANDS 派生 schema 经注册进派生数组（session.test.ts:41-47 5 工具含 op-cli） | — |
| C20 | 内建自动注册 | FR-020 / AC-001 / EC-004 | ✅ | router.ts:122-132 构造自动注册（builtins:false/子集可选）+ :135-177 buildBuiltinEntry 三内建（fetch executor→executeWebFetch :142-145 / sleep→executeSleepFromArgs + delayMs:0 :155-159 / help→listHelp·helpFor 闭包 + listed:false :168-174）；router.test.ts:44-48 新实例含 3 内建可列、:50-75 空业务自足冒烟（fetch data URL 成功/sleep 1ms/help 一览 2 个 + 未注册业务名显式报错）= AC-001/EC-004；三处手工登记（provider.buildTools/AiPanel 特判/help-aggregator 预注册）全删除 | — |
| C21 | 唯一工具名集合 | FR-021 / NFR-004 / AC-003 | ✅ | 5 工具名唯一维护面 = router 注册表（business/builtins 双 Map）；lgdl-web grep 工具名分发 if/else/手写前缀映射/手写 schema 数组/场景 help 注册零命中；tools.ts 3 内建 schema 常量与 router 内建条目 name 一致（router.ts 引用 WEB_FETCH_TOOL.function 等，无第二处拷贝）；register 重复名（含与内建同名）抛错（router.ts:181-183 + router.test.ts:93-100）保唯一性；AC-003 四链单点可见（router.test.ts:208-230） | — |
| C22 | lgdl-web 单一路径组装 | FR-022 / AC-007 | ✅ | session.ts:54-92 createAiSession：唯一 router 实例（delayMs=600）+ register(createLgdlWebCliTool())+register(createOpCliToolEntry(opRegistry)) + runAgent 装配（chatFn=provider.chat(settings(),[{system}...turns],deriveTools()) :73-78 / dispatch ctx={docId,source:runSource} + changed 推进 run-local source :82-89 / deriveCommand 绑定 :80）；零 React import（grep）；App.tsx aiSession useMemo（:1128-1140）+ sourceRef/aiSettingsRef 间接（O5 复核通过：opRegistry 依赖 source 时 session 随其重建为既定依赖，运行中 run 持旧 session 闭包不受影响）；AiPanel 收 session prop（onWebOp prop 删除，git diff App.tsx/AiPanel.tsx）；session.test 9 例组装面断言 | — |
| C23 | AiPanel 分发/特判面删除 | FR-023 / AC-007 / NFR-003 | ✅ | git diff AiPanel.tsx：toolCallToCommand(:154-170)/tc.name 五分支(:421-489)/sleep 特判/每次新建聚合器/深导入 `@lgdl/lgdl-web-cli/lgdl`(:5)/createWebCliHelpAggregator 全删除（-249 行）；保留面核验：web-cli 命令块(:444-447)/tool 结果 pre(:442-443)/markdown/next-actions 胶囊卡片(:439-441)/guideDoc(:271-284)/PRESET/pending(:455-463) 均在；events→appendMessage（onAssistantText/onCommandLine/onToolOutput/onRoundLimit/onEmptyReply/onLLMError/onFailAggregate/onFinish → :366-386）+ hooks（intercept next-actions :390-399 / onToolDone onApply :401-404）映射完整 | — |
| C24 | AI 闭环行为等价（静态面） | FR-024 / AC-008 / plan §2.5.3 | ✅ | 事件↔旧 appendMessage 消息类型逐点对照成立：assistant 文本/命令块/工具输出/失败提示文案（`部分命令执行失败…`）/超限文案（`⚠ 已达到 N 轮上限…`）/空回复文案（`⚠ AI 返回了空内容…`）/LLM 错误文案（`✖ msg` + 连续失败停）逐字一致（AiPanel.tsx:366-386 vs 旧代码 diff）；next-actions 卡片次序（web-cli 命令消息 → 胶囊卡片 → tool 输出）等价；差异仅限声明项：①未知名静默兜底→显式报错（FR-003）；②op 工具 !ok 现统一进失败聚合（旧 op 分支漏标 failed）——该差异为 EC-007/FR-006「失败聚合」语义的统一符合面，非回归，validate AC-008 动态确认；③命令间新增 600ms 间隔（FR-015 声明能力）。**动态面（AI 实战闭环/消息流逐条 diff）移交 validate AC-008** | — |
| C25 | 新模块代码质量走查 | 项目宪法 / §5.1 | ✅ | router.ts/delay.ts/runner.ts 职责单一（注册表+派生+分发 / 间隔闸门 / 循环编排三者边界清晰互不越权）；命名语义自明（effDelay/lastSlotStart/listHelp/onToolDone）；错误处理覆盖（router dispatch 捕获 executor 抛错转 ok:false + 稳定文案 router.ts:264-269 EC-012 / runner system·chat 错误分派 handleLlmError / clamp 防御非法配置）；常量提取（BUILTIN_ORDER/1000 maxRounds 参数化/[0,5000] 域集中在 clampDelayMs）；注释含设计理由（sleep delayMs:0 ADR-003 注释 router.ts:153、gate 起点口径 delay.ts:49-55）可读性良好；仅两处低影响观察：router 构造 NaN 配置会触发 warning 文案（见 IMP-4）、runner 对 hooks/dispatch 抛异常未设防（见 IMP-2） | — |
| C26 | 测试质量与 D-005 合法性 | NFR-005 / AC-009 / D-005 | ✅ | 新专项覆盖齐全：delay.test 10 例（fake clock 注入）/router.test 13 例/runner.test 12 例（含零 react 静态断言 :9-12）/sleep.test 增补 6 例/lgdl-web-cli tool-entry 5 例/op-cli tool-entry 4 例/session.test 9 例（tasks §4.1 清单 7 文件全落地）；断言强度抽查：deepEqual/strict match 为主，无弱断言（如 router.test dispatch 顺序/runner 事件序列 deepEqual）；D-005 删除有据逐项核验：①provider.test 旧 buildTools 顺序断言 → router.test:149-160 + session.test:41-47 派生顺序承接（文件内 D-005 注释记录 :188-190）；②lgdl-web.test.ts 2 例（fetch 行路由）删除 → session.test:66-80 web-fetch dispatch data URL 成功/缺 path 错误承接（行为等价：同一 executeWebFetch 路径）；③AiPanel 无单测 → validate AC-008 承接（tasks §4.2 记录一致）；lgdl-web/package.json test 列表重列（删 lgdl-web.test.ts/增 session.test.ts）与文件实况一致 | — |
| C27 | base 零 LGDL + 零 react + 依赖方向 | NFR-001/002/008 / AC-001/010/011 | ✅ | base/package.json dependencies = {openai, @anthropic-ai/sdk} 零 @lgdl/*（NFR-002 无反向边）；grep base/src 零 `@lgdl/` import、零 `from 'react'`（router/delay/runner 专项零命中）；runner.test.ts:9-12 静态断言存在（AC-011）；依赖图谱：lgdl-web-cli→{web-cli-base,lgdl-core}、op-cli→{web-cli-base 仅类型}、lgdl-web→{base+cli+op-cli} 单向无环（package.json 声明核验，无新增依赖）；base 独立可用由 router.test 空业务冒烟（AC-001）证明 | — |
| C28 | C 档不动 + 影响面完整性 | NG-001~008 / plan §5.5 | ✅ | git status 全量变更 = NEW 12/MODIFY 15/DELETE 4，与 build.md §2 一致、plan §5 影响面无遗漏无多余（新增实际比 plan 多的 3 个 MODIFY = TASK-003 扩围 web-fetch.ts/web-fetch.test.ts + adapters/lgdl.ts 注释，O3/build §5#3 已记录有据）；语言引擎 5 包（lgdl-core/layout/render/router/cli）零改动；lgdl-web-cli C 档（adapters 源码外/commands/operations/protocol/help/tools）零改动；op-cli C 档（ops/tool/handlers/help/next-actions）零改动；lgdl-web 场景内容（prompts.ts/SettingsPanel/examples/locate/snap/README/provider 应用态 PROVIDERS+localStorage）零改动；5 工具名不变（NG-006）；未改 exec 文档管线语义（NG-002） | — |

## 3. build 口径复核（O1~O6）

| # | build 记录口径 | 复核结果 | 证据 |
|:--:|--------------|:--:|------|
| O1 | DelayGate 参考时刻 = 执行起点（before() 记账；sleep 免除不更新） | ✅ 通过 | delay.ts:76-91 before() 以分发时刻为起点记账 + :77 `delayMs<=0` 直接返回不更新；router.ts:262-263 仅 effDelay>0 调 before（免除命令不经 gate）；「间隔=max(delayMs,执行耗时)」在起点口径下精确成立（delay.test:58-78/router.test:234-245 按验收式断言）；EC-005 两场景结果两模型一致；与 plan §2.4.1/§3.3 推导自洽 |
| O2 | runner user + deriveCommand 契约字段（run() 无参幂等） | ✅ 通过 | runner.ts:59 user 字段（:92 turns 初始化）、:67 deriveCommand 可选（:155 消费，null/缺省→原始名）；:185-188 run() runPromise 缓存幂等；session.ts:80 注入 router.deriveCommand；runner.test:73-85/97-120 覆盖 user 初始化 + 幂等 + commandLine 派生 |
| O3 | TASK-003 中性化扩至 web-fetch.ts + fixture | ✅ 通过 | git diff web-fetch.ts 4 处示例/注释路径 README-CLI → guide.md；web-fetch.test.ts/sleep.test.ts fixture 中性化（lgdl-web-cli 前缀 → my-cli，断言语义不变）；grep base/src README-CLI/lgdl/web/workbench 零命中；schema 结构零改动（A-001） |
| O4 | router 只读 delayMs/warnings 暴露 | ✅ 通过 | router.ts:108 readonly warnings、:110 readonly delayMs（钳制后）；session.test:49-53/ router.test:286-306 直接断言；EC-009 可测性达成 |
| O5 | session 组装 ref 间接 + run-local source | ✅ 通过 | App.tsx aiSettingsRef（:931-934）/sourceRef 间接供值；session.ts:65 runSource=首次 getSource、:85-87 changed 后推进 run-local source（R-009）；AiPanel hooks.onToolDone onApply（:401-404）→ App.applyAiSource 写回；AiPanel/App 同批原子落地（同一提交区，git status 同批） |
| O6 | D-005 增删承接落点 | ✅ 通过 | 承接落点逐一存在：router.test:149-160 + session.test:41-47（派生顺序）/ session.test:66-80（web-fetch dispatch 2 例）；lgdl-web/package.json test 列表重列；删除面 4 文件 + provider.test 顺序用例改写与 tasks §4.2 记录一致（可审计） |

**build 口径复核小结**：6 项实现口径全部与代码实况一致。O1（delay 参考时刻）是与 spec FR-014 字面措辞的唯一差异点，但实现精确满足 plan 推导与验收公式（起点间隔 = max(delayMs, 执行耗时)）且 delay.test/router.test 按验收式断言——判为合法口径选择，非偏差（spec 措辞建议后续对齐，见 IMP-3）。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无（FAIL=0，无阻塞问题） | — | — |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| IMP-1 | packages/lgdl-web/src/ai/provider.ts:252（+ base llm.ts:85/:170） | chat 缺省 `tools: tools ?? []`——空数组仍作为 `tools: []` 字段发往远端；重构前 testConnection 一直携带 5 工具定义，现为零工具空数组，个别 OpenAI 兼容网关对空 tools 数组可能报错（行为差异，validate 网络实测前建议规避） | C8/C17 | tools 为空时省略 tools 字段（base llm.ts 两路径 `tools.length ? ... : 省略`）；validate 阶段对 testConnection 各厂商端点实测确认 |
| IMP-2 | packages/web-cli-base/src/runner.ts:153-164 | runner 对 dispatch/intercept/onToolDone 抛异常未设防：router 已保证 executor 不抛（EC-012 捕获），但 hooks.intercept/onToolDone（场景注入）或自定义 dispatch/时钟异常仍可穿透 run() 导致 onFinish 不触发（lgdl-web pending 卡死面） | C6/C25 | per-tool 循环内 try/catch：捕获异常转 ok:false + 稳定文案（复用 router EC-012 风格），保证单工具异常不炸整个循环且 onFinish 必达 |
| IMP-3 | spec.md FR-014/EC-005 措辞 vs delay.ts:49-55 实现 | spec 字面「距上一命令**完成时刻**不足 delayMs 则补齐」与实现（执行**起点**参考）不一致——实现精确满足验收公式 max(delayMs,执行耗时) 且 build §5#1 已记录，但 spec 措辞会造成后续维护歧义 | C14 | 收口时对齐 spec FR-014/EC-005 措辞为「执行起点间隔」（或补注释说明两模型 EC-005 结果等价），消除文字与代码口径差 |
| IMP-4 | packages/web-cli-base/src/router.ts:114-119 | 构造传入 NaN（typeof number 但非有限值）时 clampDelayMs(NaN)=0 但 `clamped !== rawDelay` 成立 → 触发 `delayMs=NaN 超出合法域` 的语义含糊警告噪音 | C15 | NaN/非有限值走静默关闭分支（不告警）或警告文案明确「非数字按 0 处理」；与 clampDelayMs 注释（delay.ts:29-32「NaN/非数字→0」）语义对齐 |

## 6. 维度汇总

| 审查维度 | 审查项 | 结果 |
|---------|-------|:--:|
| 规范符合性 | C1,C2,C3,C4,C5,C7,C9,C11,C12,C13,C14,C15,C16,C17,C20,C21,C23,C24（18 项） | ✅ 全部通过（C24 附动态面移交说明） |
| 架构一致性 | C6,C8,C10,C18,C19,C22,C27,C28（8 项） | ✅ 全部通过 |
| 代码质量 | C25 | ✅ 通过（附 IMP-2/IMP-4） |
| 测试质量 | C26 | ✅ 通过 |
| build 口径复核 | O1~O6 | ✅ 6/6 通过 |

## 7. 总结论

**结论：⚠️ 有条件通过**（阻塞 0 / 警告 0 / 改进 4 / 规范符合率 100%）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 28/28（100%） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | 0 项（O1 delay 口径为合法实现选择，非偏差） |
| 可进入 validate | 是 |

**核心达成**：
- **CommandRouter 契约与路由正确性**（FR-001~005/020/021）：ToolEntry 七元单一数据源、dispatch 未注册显式报错（`✖ 未注册工具 "x"`）、重复注册抛错、executor 异常→ok:false 稳定文案（EC-012）、deriveTools 顺序=[业务注册序]+[内建置末] 幂等、deriveCommand 引号规则逐字节对齐、listHelp/helpFor 注册即得、3 内建自动注册（sleep delayMs:0/web-cli-help listed:false）
- **AgentRunner 边界/零 react**（FR-006/EC-006~008）：事件 8 + hooks intercept/onToolDone、toolCallId 回填、失败聚合+纠正 turn、LLM 错误重试一次、stop、run() 幂等；runner.ts 零 react import（静态断言存在）
- **DelayGate 机制**（FR-013~017/EC-005/EC-009）：路由层统一挂点、起点间隔=max(delayMs,执行耗时)、首个不等待、sleep delayMs:0 免除实现不叠加（EC-005 两场景按验收式断言）、默认 0/场景 600/钳制 [0,5000]+一次警告、stats/onDelay/时钟注入、静默不注入结果文本
- **注册收敛**（FR-018/019/022/023）：双业务包 tool-entry 整体注册（C 档零改动）、OpHandlerRegistry 顶层角色移交 router、lgdl-web 单一组装点 session.ts（delayMs=600 + run-local source）、AiPanel 分发/特判/前缀/help 聚合面全删、App/AiPanel 同批原子收敛
- **base 纯度**（NFR-001/008）：base/src 零 @lgdl import/零 react import/零 README-CLI 残留（grep CLEAN 复核）；依赖方向单向无环
- **D-005 测试增删合法性**：删除有据、承接落点齐全（派生顺序→router.test+session.test；fetch 2 例→session.test）；7 个新测试文件专项覆盖齐全、断言强度达标
- **C 档不动**：语言引擎 5 包、lgdl-web-cli/op-cli C 档源码、prompts/provider 应用态零改动（git status 核验）

**改进建议（不阻塞 validate，按优先级）**：
1. IMP-1（validate 前建议处理）：空 tools 数组发往远端的兼容风险（testConnection 路径）
2. IMP-2（validate 前建议处理）：runner per-tool 异常设防（hooks/dispatch 抛异常防穿透）
3. IMP-3/IMP-4：spec FR-014 措辞对齐 + router NaN 告警文案（文档/低优先）

**动态面移交 validate**：AC-008 AI 实战闭环（四条路径 + next-actions/op + 消息流逐条 diff + op !ok 统一失败聚合 UX 确认）、AC-005 delay 600ms 实战校准、testConnection 各厂商端点实测（IMP-1）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：R1 轮审查——C1~C28 逐项执行（28 PASS / 0 WARN / 0 FAIL）+ O1~O6 口径复核（6/6 通过）；产出改进建议 4 项（IMP-1~4，均低严重度）；结论 ⚠️ 有条件通过；动态面（AC-008/AC-005/testConnection 实测）移交 validate | 2026-09-05 | SDDU Review Agent |
