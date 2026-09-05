# 验证报告：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: validate.md v1.0（V1~V12 验证场景，五维度：测试覆盖 / 接口数据 / 构建 / 性能边界 / 漂移检测）
> **前置依赖**: validate.md（策略）、spec.md（24 FR / 8 NFR / 12 EC / AC-001~012）、review-report.md v1.0（⚠️ 有条件通过：28/28 PASS、阻塞 0、改进 4）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-05
> **验证轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建 — 依据 validate.md V1~V12 场景矩阵逐项真实执行（测试/构建/脚本/read/grep/git），记录实测数据与证据；Review 改进 IMP-1/2/4 前置处理 + 动态验证（IMP-3 记遗留）；结论 ⚠️ 有条件通过（全部门禁指标达标，遗留 2 项移交收口人工清单）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 12（V1~V12）|
| 通过 | 12（V10 机械面 ✅；真实 AI 闭环 ⏭️ 子面移交收口，见 §2 说明）|
| 失败 | 0 |
| 无法执行 | 0（⏭️ 子面 2 项：真实 AI 闭环 / 真实厂商端点实测——需浏览器 + API Key，移交收口人工清单）|
| 阻塞问题 | 0 |

## 2. 逐项验证结果（V1~VN）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| V1 | AC-009/NFR-005 全仓测试门禁 | `npm test`（9 workspace 依序真实执行） | 9 包 0 失败 | **582 pass / 0 fail / 1 skip**（lgdl-render 95 例中 1 env-skip 为既有 LGDL_MATRIX_B11 门控，与本次无关）：lgdl-cli 0 / lgdl-core 267 / lgdl-layout 0 / lgdl-render 95(94+1skip) / lgdl-router 8 / lgdl-web 41 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / web-cli-base 73（基线 71 + IMP-2 增补 2） | ✅ |
| V2 | NFR-007/AC-010 类型完整性 | `npx tsc --noEmit -p` × 4 改动包 | 退出码 0 | 4 包全部退出码 0、零错误（web-cli-base / lgdl-web-cli / lgdl-web-op-cli / lgdl-web） | ✅ |
| V3 | NFR-007/AC-010 lgdl-web 构建 | `npm run build --workspace @lgdl/lgdl-web`（vite） | 退出码 0 | 退出码 0，✓ built in 8.33s（chunk 体积 / anthropic node:fs externalize 为既有提示非错误） | ✅ |
| V4 | AC-009 base 新机制专项 | `npm test --workspace @lgdl/web-cli-base` + 逐文件计数 | 全绿 + 专项覆盖齐全 | 73 pass / 0 fail；抽核：router.test **18** / delay.test **10** / runner.test **13**（11+IMP-2 新增 2）/ sleep.test **15**（含 EC-011 executeSleepFromArgs 增补） | ✅ |
| V5 | AC-009/006/007 业务注册 + 场景组装专项 | 逐文件 node --test | 全绿 | session.test **9** / lgdl-web-cli tool-entry.test **5** / lgdl-web-op-cli tool-entry.test **4** / provider.test **13** 全绿；session.test:41-47 派生顺序断言通过 | ✅ |
| V6 | AC-005/FR-013~017/EC-005/009 DelayGate 最小间隔 | 自主脚本（fake clock 注入真实编译产物） | 验收式全部成立 | **20/20 断言通过**：首分发不等待 / 连续两分发补齐 delayMs-执行耗时（起点间隔=max）/ 慢命令不补齐 / sleep(3000) 不追加（EC-005）/ sleep(200) 补齐 400 / 未注册名不经 gate / stats+onDelay / 默认 0 零开销 / EC-009 钳制+一次警告 / NaN·Infinity 静默（IMP-4） | ✅ |
| V7 | AC-006/FR-005/008 派生顺序 + AC-003 四链 + EC-010 help | 自主脚本（真实 session 组装） | 顺序等价 + 四链可见 | **25/25 断言通过**：真实 lgdl-web session deriveTools 顺序 = [lgdl-web-cli, lgdl-web-op-cli, web-fetch, sleep, web-cli-help]（= 旧 provider.test:191 等价）+ 幂等；空业务自足冒烟（AC-001）；fake-adder 一处注册四链可见（AC-003）；help 一览 4 工具 + EC-010 未知文案 | ✅ |
| V8 | NFR-001/008/012/AC-001/011/012 中性纯度 grep 门禁 | grep 断言 × 13 组 | 全 CLEAN | base/src：零 react import（含 router/delay/runner 专项）/ 零 `@lgdl/` import（仅 index.ts 头注释包自名 + package.json name）/ 零 README-CLI·lgdl/web/workbench 残留；lgdl-web：toolCallToCommand / buildTools / opRegistry.execute / parseSleepCommand / HelpAggregator / ai/lgdl-web 深导入 / help-aggregator 全仓零命中（仅 provider.test:188、provider.ts:15、App.tsx:989 等**删除动作文档化注释**，属允许残留面） | ✅ |
| V9 | AC-007/NFR-003/FR-022/023 场景收敛（TASK-011 同批原子） | read AiPanel/App + git status | 分发面删净、组装点单一、同批原子 | AiPanel 经 session.runAgent 驱动（events→appendMessage ×8 / hooks→intercept next-actions + onToolDone onApply，AiPanel.tsx:348-407）；无 tc.name 分发/前缀映射/sleep 特判/help 聚合/深导入（imports 仅 PROVIDERS/prompts/parseNextActions/AiSession 类型）；App aiSession useMemo 单一组装点（App.tsx:1134-1143）+ sourceRef/aiSettingsRef 间接 + opRegistry 19 handler 注入 createOpCliToolEntry；AiPanel.tsx 与 App.tsx 同工作区同批（TASK-011 原子性成立）；渲染保留面（命令块/胶囊/pre 工具输出/markdown/pending）在 | ✅ |
| V10 | AC-008/FR-006/024/EC-006/007 runner 驱动闭环（机械面） | 自主脚本：真实 session.runAgent + 本地 mock LLM 端点（真实 router dispatch + 真实 lgdl-web-cli 工具） | 闭环事件流等价 | **17/17 断言通过**：① 变更闭环 add-node → 事件序列 assistantText→commandLine→toolOutput→assistantText→finish、命令文本 `lgdl-web-cli add-node --id c --label C`（FR-007 派生）、onToolDone 携带 changed+source、第 2 轮 tool 结果按 toolCallId=call_1 回填、delay 静默（结果文本无等待信息）；② 失败聚合闭环（ghost-tool 未注册 + status 同轮）→ 单败不吞后、EC-001 显式错误回填、两条 tool 结果均回填、纠正 user turn 入 turns、onFinish 必达；③ 纯文本闭环 → 请求 wire 携带 5 个派生 schema（顺序 = deriveTools，FR-008）。**⏭️ 子面**：真实 AI（浏览器 + 模型 + 消息流人工对比）闭环无法在无浏览器/无 API Key 环境执行 → 移交收口人工清单（review §7 同口径） | ✅（机械面）/ ⏭️（真实 LLM 面移交） |
| V11 | NFR-005/AC-009 D-005 测试增删合法性 | git status + read + grep | 删除有据、承接等价 | 删除面 4 文件在 git（base + lgdl-web help-aggregator.ts / lgdl-web.ts / lgdl-web.test.ts）；provider.test.ts:188-190 D-005 注释记录顺序断言删除 → router.test:149-160 + session.test:41-47 派生顺序承接；lgdl-web.test.ts 2 例（fetch 行路由）→ session.test:66-80 web-fetch dispatch（data URL 成功 / 缺 path 错误）承接（同一 executeWebFetch 路径，行为级等价）；lgdl-web/package.json test 列表 = 显式含 session.test.ts、无 lgdl-web.test.ts | ✅ |
| V12 | review IMP-1/2/4 处理确认 + 门禁复核 | 见 §3.1 + §4 脚本 + 门禁重跑 | 修复生效、门禁不破 | IMP-1：llm.ts 两协议路径 tools 空省略字段，mock 端点动态断言 **5/5**（OpenAI 兼容 + Anthropic：空 tools → wire 无 tools 字段；有 tools → 携带）；IMP-2：runner per-tool try/catch + runner.test 新增 2 例通过（含 onFinish 必达）；IMP-4：NaN/Infinity → 0 静默无警告（router.test EC-009 18/18 不回退）；IMP-3 记录遗留。处理后门禁复核：base 73 / lgdl-web 41 全绿 + 4 包 tsc 0 错误（V1/V2 已含） | ✅（IMP-3 遗留） |

> **⏭️ 标注说明**：V10 的「真实 AI 实战闭环」（浏览器 AI 会话 + 真实模型 + 用户可感知消息流逐条对比，AC-008）与 IMP-1 附带的「testConnection 各厂商真实端点实测」需 lgdl-web UI + 厂商 API Key 凭证——本环境不具备，机械面闭环已由 V10 脚本 + mock 端点 wire 断言承接，真实面移交整体收口人工清单（与 review-report §7 动态面移交口径一致）。

## 3. 验证详细信息

### 3.1 测试覆盖

**功能需求（FR）— 24/24（100%）**

| 需求 ID | spec 描述 | 测试用例（证据） | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| FR-001 | 统一工具注册模型（ToolEntry 单一数据源） | router.test: register makes tool visible + AC-003 假工具四链（:208-230）；lgdl-web-cli/op-cli tool-entry.test schema 逐字段 | ✅ | 已覆盖 |
| FR-002 | 统一分发执行契约（dispatch + changed/source） | router.test: dispatch routes / ok:false 直通（:104-145）；session.test cli add-node changed+source（:90-99）；V10a onToolDone 数据面 | ✅ | 已覆盖 |
| FR-003 | 未知工具名显式报错（去静默兜底） | router.test:118-127；V10b ghost-tool 显式错误回填 | ✅ | 已覆盖 |
| FR-004 | 注册表自举查询（has/names/derive*/listHelp/helpFor） | router.test:44-91/182-230；V7b/V7d | ✅ | 已覆盖 |
| FR-005 | deriveTools 顺序契约 | router.test:149-160（业务注册序+内建置末+幂等）；session.test:41-47；V7a | ✅ | 已覆盖 |
| FR-006 | 中性 agent 循环上收（AgentRunner） | runner.test 13 例（回填/超限/失败聚合/stop/重试）；V10 | ✅ | 已覆盖 |
| FR-007 | deriveCommand 前缀派生（去兜底） | router.test:162-178（引号/未知名）；V10a 命令文本 `lgdl-web-cli add-node --id c --label C` | ✅ | 已覆盖 |
| FR-008 | schema 收集/组装下沉（provider→router 派生） | session.test:41-47；provider.test:192-197（chat 不再内建组装注释）；V10c wire 5 schema | ✅ | 已覆盖 |
| FR-009 | sleep fc 原生接入（executeSleepFromArgs） | sleep.test 15 例（normalize/缺参/clamp/端到端）；router.test sleep 内建条目冒烟 | ✅ | 已覆盖 |
| FR-010 | help 聚合注册即得 | router.test:182-206；session.test:108-117；V7d（一览 4 工具/详情/未知文案） | ✅ | 已覆盖 |
| FR-011 | 死接线收敛（lgdl-web.ts 删除） | git D + 全仓 grep ai/lgdl-web 零命中（V8/V11） | ✅ | 已覆盖 |
| FR-012 | base 文案 LGDL 残留清理 | grep base README-CLI/lgdl/web/workbench 零命中 + tip 中性（V7d 断言） | ✅ | 已覆盖 |
| FR-013 | delay 统一挂点（dispatch 入口） | router.test:234-245（全局 delayMs gate 业务分发）；V6e | ✅ | 已覆盖 |
| FR-014 | 最小间隔语义 = max(delayMs, 执行耗时) | delay.test 10 例 + router.test:234-284；V6a/b（补齐 350 / 慢命令不补齐） | ✅ | 已覆盖 |
| FR-015 | delayMs 配置与默认（0/600/钳制 5000） | session.test:49-53（delayMs=600+warnings=[]）；router.test:286-306（EC-009）；V6f/g | ✅ | 已覆盖 |
| FR-016 | 单工具免除/覆盖（sleep delayMs:0） | router.test:247-272（EC-005 两场景）；delay.test；V6c/d | ✅ | 已覆盖 |
| FR-017 | sleep 保留 + 静默 + 观测（stats/onDelay/时钟） | delay.test stats+onDelay 用例；V6e；V10a delay 静默断言 | ✅ | 已覆盖 |
| FR-018 | lgdl-web-cli 整体注册为一个工具 | cli tool-entry.test 5 例；session.test:82-99（status/add-node 经 router）；V10a | ✅ | 已覆盖 |
| FR-019 | lgdl-web-op-cli 注册接入（角色移交） | op tool-entry.test 4 例（含 next-actions 不特判）；session.test:101-106；V9 App 注入面 | ✅ | 已覆盖 |
| FR-020 | 内建命令自动注册 | router.test:44-80（自动注册/空业务自足/builtins 选项）；V7b | ✅ | 已覆盖 |
| FR-021 | 唯一工具名集合 | router.test:93-100（重复注册+与内建同名拒绝）；grep 删除面零命中（V8） | ✅ | 已覆盖 |
| FR-022 | lgdl-web 单一路径组装（session.ts） | session.test 9 例（5 工具集合/派生顺序/delay 600）；V9 App 组装点 read | ✅ | 已覆盖 |
| FR-023 | AiPanel 分发/特判面删除 | AiPanel read（:348-407 仅注入 events/hooks）；grep 删除面零命中（V8/V9） | ✅ | 已覆盖 |
| FR-024 | AI 闭环行为等价 | runner.test 事件序列 + V10 机械闭环 17 断言（消息顺序/失败/超限/回填）；**真实 AI 闭环 ⏭️ 移交收口人工清单** | ✅（机械面） | 部分覆盖（动态面移交） |

**非功能需求（NFR）— 8/8（100%）**

| 需求 ID | spec 描述 | 验证证据 | 执行结果 | 覆盖率 |
|---------|----------|---------|:--:|:--:|
| NFR-001 | base 零 LGDL 依赖/文案 | grep base 零 @lgdl import + 零残留文案（V8）；base/package.json deps 仅 anthropic/openai | ✅ | 已覆盖 |
| NFR-002 | 依赖方向单向无环 | package.json 声明核验（base 零 @lgdl/*；业务包→base 单向）；tsc 跨包消费通过（V2） | ✅ | 已覆盖 |
| NFR-003 | 破坏性重构边界（删除面零残留） | grep 删除面（toolCallToCommand/opRegistry 直连/sleep 特判/buildTools/help 注册）零命中（V8） | ✅ | 已覆盖 |
| NFR-004 | 单一数据源（五元无第二维护处） | router.test AC-003 假工具四链（:208-230）+ V7c | ✅ | 已覆盖 |
| NFR-005 | 测试门禁（D-005 等价/更优 + 全绿） | V1 全仓 582 pass / 0 fail；V11 增删有据核验 | ✅ | 已覆盖 |
| NFR-006 | 性能（0 零开销/幂等） | delay.test 零开销用例 + V6f（默认 0 零等待）；router.test:159 + V7a 幂等断言。**无数值型性能指标（无并发/响应时间阈值）→ 语义性要求由断言承接** | ✅ | 已覆盖 |
| NFR-007 | 类型与构建完整性 | V2 tsc ×4 零错误 + V3 vite build 退出码 0 | ✅ | 已覆盖 |
| NFR-008 | runner 环境无关（零 react） | runner.test:9-12 静态断言 + V8 grep 零命中 | ✅ | 已覆盖 |

### 3.2 接口数据

> 本 Feature 为纯内部框架重构（无外部服务 API / 无 DB），「接口」= CommandRouter 统一分发契约（{tool,args}→ToolResult）+ LLM wire 请求面。动态数据验证如下：

| 检查项 | 调用方式 | 预期 | 实测 | 一致？ |
|--------|---------|------|------|:--:|
| router.dispatch({lgdl-web-cli, status}) | 脚本真实执行（ctx.source=真实图文档） | ok:true 输出含图结构 | ok + output 含 `a -> b`（V10b） | ✅ |
| router.dispatch({lgdl-web-cli, add-node}) | 脚本真实执行 | changed:true + source 含新节点 | changed:true + source 含 `- id: c`（V7/V10a） | ✅ |
| router.dispatch({未注册名}) | 脚本真实执行 | ok:false + `✖ 未注册工具 "x"` | 逐字命中（V6e/V7b/V10b） | ✅ |
| deriveTools() 派生数组 | 真实 session 组装调用 | [业务 2（注册序）]+[内建 3（置末）] | 顺序逐项一致 + 幂等（V7a） | ✅ |
| listHelp() 一览 | 真实 session dispatch web-cli-help | 4 工具、tip 中性、help 不自列 | `可用工具（4 个）：` + 中性 tip（V7d） | ✅ |
| helpFor 未知/未列 | 真实调用 | null（EC-010） | web-cli-help 自查 null、ghost → null（V7d） | ✅ |
| chat wire：tools 空 | 本地 mock OpenAI 兼容 + Anthropic 端点 | 请求体无 tools 字段（零 schema 请求） | 两协议路径均无 tools 字段（V12 IMP-1，5/5） | ✅ |
| chat wire：tools 非空 | 本地 mock 端点 | 请求体携带 tools | OpenAI `tools[0].function.name=demo` / Anthropic `input_schema`（V12） | ✅ |
| session 会话 wire | session.runAgent + mock LLM | 携带 5 派生 schema | wire tools 顺序 = deriveTools（V10c） | ✅ |

### 3.3 构建脚本

| 命令 | 退出码 | 耗时 | 输出摘要 | 结果 |
|------|:--:|------|---------|:--:|
| `npm test`（root → 9 workspace） | 0 | ~90s | 9 包全绿：582 pass / 0 fail / 1 skip（render env-gate 既有） | ✅ |
| `npm test --workspace @lgdl/web-cli-base` | 0 | ~4s | 73 pass / 0 fail | ✅ |
| `npx tsc --noEmit -p packages/web-cli-base` | 0 | — | 零错误 | ✅ |
| `npx tsc --noEmit -p packages/lgdl-web-cli` | 0 | — | 零错误 | ✅ |
| `npx tsc --noEmit -p packages/lgdl-web-op-cli` | 0 | — | 零错误 | ✅ |
| `npx tsc --noEmit -p packages/lgdl-web` | 0 | — | 零错误 | ✅ |
| `npm run build --workspace @lgdl/lgdl-web`（vite） | 0 | 8.33s | dist 产物完整（632 modules；chunk 体积 + anthropic node:fs externalize 为既有提示，非错误） | ✅ |
| `npm run build --workspace @lgdl/web-cli-base`（tsc→dist，IMP 处理后重建） | 0 | ~3s | dist 更新（下游 lgdl-web 消费） | ✅ |

### 3.4 性能边界

| NFR/EC | 指标要求 | 实测值 | 偏差 | 达标？ |
|-----|---------|-------|------|:--:|
| FR-014/EC-005 间隔语义 | 连续两分发起点间隔 = max(delayMs, 执行耗时)；首分发不等待 | 执行耗时 250 < 600 → 补齐 350（起点间隔 600）；执行耗时 800 > 600 → 不补齐（起点间隔 800） | 无 | ✅ |
| EC-005 sleep 组合 | sleep(3000) 不追加；sleep(200) 补齐至 600 | 3000 场景零追加；200 场景补齐 400 | 无 | ✅ |
| EC-009 非法配置 | <0 或 >5000 钳制 [0,5000] + 一次警告 | 99999→5000（警告 1）、-10→0（警告 1）；NaN/Infinity→0 静默（IMP-4 修复后警告仍为 2 次，仅有限值超界） | 无 | ✅ |
| NFR-006 零开销 | 默认 delayMs=0 分发零额外等待 | fake clock 下 waits=[]（V6f） | 无 | ✅ |
| NFR-006 幂等 | 派生函数重复调用输出一致 | deriveTools 两次 deepEqual（V7a / router.test:159） | 无 | ✅ |
| NFR-006 性能说明 | — | **本 Feature 无并发/响应时间/吞吐量数值型指标**（NFR-006 为语义性：零等待 + 幂等），dispatch 为同步内存查找 + 可选 gate 等待（机制级验证见上）——按 §5.4 规则无数值指标即不构造压测，语义断言全覆盖 | — | ✅（不适用数值压测） |

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 新增 3 模块（delay/router/runner）+ 2 tool-entry + session 逐一对照 FR/ADR 落点 | ✅ 无（每文件均有 FR/ADR 锚点；IMP-2/4/1 修复为 review 改进项落点，非孤立） |
| 需求缺失（有需求无代码） | FR 24 项 × 实现证据对照（§3.1） | ✅ 无（FR-024 真实 AI 面移交收口，机械面已覆盖） |
| 规格漂移（spec 被修改） | spec.md 内容核对（validate 阶段未修改 spec.md；review C28 基线一致） | ✅ 无（IMP-3 建议的 FR-014 措辞对齐 = spec 文字级遗留，代码实现与验收式一致，见 §6 遗留） |
| 删除面残留（NFR-003） | grep 13 组（V8） | ✅ 无（仅删除动作文档化注释，属允许面） |
| C 档零改动 | git status 变更清单 vs plan §5（语言引擎 5 包零改动） | ✅ 无越界 |

## 4. 验证脚本执行记录

> ADR-003：脚本存放于 `/tmp/sddu-validate-specs-tree-web-cli-base-framework-20260905/`，validate Agent 自主编写、直接执行（不走 task→build）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| v6-delay-gate-semantics.mjs | DelayGate 最小间隔语义动态验证（fake clock 注入真实编译产物 delay.js/router.js：首分发/间隔 max/慢命令/EC-005×2/未注册不经 gate/stats·onDelay/默认 0 零开销/EC-009 钳制+NaN·Infinity 静默） | V6 | 0 | pass=20 fail=0（FR-014 验收式 / EC-005 / EC-009 / IMP-4 全部成立） |
| v7-derive-order-registry.mjs | deriveTools 顺序（真实 session 组装 = 旧 provider.test:191 等价 + 幂等）+ AC-001 空业务自足 + AC-003 假工具四链 + EC-010 help 一览/详情/未知文案 | V7 | 0 | pass=25 fail=0（顺序逐项一致；四链可见；tip 中性） |
| v10-closed-loop.mjs | AI 闭环机械面冒烟：真实 session.runAgent + 本地 mock LLM——变更闭环（add-node changed/source + toolCallId 回填）、失败聚合闭环（未注册名+status 单败不吞后+纠正 turn）、纯文本闭环（wire 5 schema） | V10 | 0 | pass=17 fail=0（消息事件流/回填/聚合/onFinish 全符合预期） |
| v12-imp1-wire.mjs | IMP-1 修复 wire 动态断言：本地 mock OpenAI 兼容 + Anthropic 端点——tools 空 → 请求体无 tools 字段；tools 非空 → 携带 | V12（IMP-1） | 0 | pass=5 fail=0（两协议路径空 tools 均省略字段） |

> 脚本迭代说明：v6 首轮 1 条断言因**脚本自身**对 fake clock 流逝量的计算错误（未计入第 2 次执行耗时）而误报，修正脚本断言后 20/20；v10 首轮 1 条断言因**场景意图误设**（session 会话按 FR-008 本就应携带 5 派生 schema，非零 schema 请求路径——零 schema 属 testConnection/provider.chat 无 tools 场景，已由 v12 脚本专门验证）而误报，修正断言后 17/17。两处均为验证脚本问题，非产品缺陷。

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | 无（0 阻塞：全仓 0 失败、tsc 0 错误、构建退出码 0、grep 零残留、脚本断言全过） | — | — |

## 6. 结论

**结论**: ⚠️ 有条件通过（全部可执行门禁指标达标；遗留 2 项非阻塞移交整体收口）

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（24/24） | 24/24（FR-024 机械面覆盖 + 真实 AI 面移交） | ✅ |
| NFR 测试覆盖 | ≥80% | 8/8（100%） | ✅ |
| 构建退出码 | 0 | 0（tsc ×4 + vite + 全仓 test） | ✅ |
| 阻塞问题数 | 0 | 0 | ✅ |
| 漂移项 | 0（严重） | 0（删除面 grep 零残留、C 档零越界、spec 未改） | ✅ |

**理由**：
- **全仓回归**：9 包 `npm test` 582 pass / 0 fail / 1 skip（既有 render env-gate），4 包 `tsc --noEmit` 零错误、lgdl-web vite build 退出码 0——门禁全绿（V1~V3）。
- **专项抽核**：router.test 18 / delay.test 10 / runner.test 13 / sleep.test 15 / session.test 9 / tool-entry（cli 5 + op 4）全绿（V4~V5）；DelayGate EC-005 两场景与 FR-014 验收式（间隔 = max(delayMs, 执行耗时)）经 fake clock 真实编译产物 20 断言成立（V6）；deriveTools 顺序经真实 lgdl-web session 组装实测与旧 provider.test:191 等价、幂等（V7）。
- **中性纯度**：base/src 零 react import、零 @lgdl import、零 LGDL 文案残留；lgdl-web 全部删除面（分发 if/else / 前缀映射 / sleep 特判 / help 聚合 / opRegistry 直连 / 深导入）grep 零命中——grep 13 组全 CLEAN（V8）。
- **场景收敛**：AiPanel 仅注入 system/events/hooks，经 session.runAgent 驱动，App 单一组装点 + refs 间接，渲染保留面完整；AiPanel/App 同批原子（V9）。
- **闭环行为**：session.runAgent 机械闭环 17 断言通过（工具调用→toolCallId 回填→changed/source→失败聚合→纠正 turn→onFinish），消息事件流与 runner.test 期望一致（V10）。
- **D-005 增删合法性**：4 文件删除 + provider.test 顺序断言改写均有承接落点（router.test + session.test 派生顺序、web-fetch dispatch 2 例），行为级等价（V11）。
- **Review 改进**：IMP-1（空 tools 省略 wire 字段，mock 两端点 5 断言）、IMP-2（runner per-tool 异常设防 + 2 例专项）、IMP-4（NaN/Infinity 静默）已处理且门禁不破（base 71→73 全绿）；IMP-3 记录遗留（V12）。

**遗留（非阻塞，移交整体收口）**：
1. **IMP-3**：spec.md FR-014/EC-005 字面「完成时刻」→「执行起点」措辞对齐（review O1 口径复核已确认实现精确满足验收式，非行为偏差，仅文档文字）。
2. **AC-008 真实 AI 实战闭环 + testConnection 各厂商真实端点实测**：需浏览器 UI + 厂商 API Key 凭证，validate 环境不具备——机械面已由 V10/V12 脚本承接，真实面按 review §7 移交收口人工清单执行（含 delay 600ms 实战校准 A-003）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：R1 轮验证——V1~V12 全维度真实执行（全仓 582 pass/0 fail + 4 包 tsc + vite build；专项抽核 router 18/delay 10/runner 13/sleep 15/session 9/tool-entry 9；自主脚本 4 个共 67 断言全过）；Review IMP-1/2/4 前置处理 + 动态确认（IMP-3 记遗留）；结论 ⚠️ 有条件通过（门禁全达标，遗留 2 项移交收口） | 2026-09-05 | SDDU Validate Agent |
