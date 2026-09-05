# 构建报告：specs-tree-web-cli-base-framework（web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: tasks.md（任务清单）、plan.md（技术方案）、spec.md（需求规范）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-05
> **版本**: v1.0
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建 — 13/13 任务全绿。base 三新模块（delay/router/runner）+ 中性化收尾 + sleep fc 接入；lgdl-web-cli/op-cli tool-entry 注册；lgdl-web provider/session/AiPanel/App 收敛 + 删除面；全仓 9 包测试 0 失败。记录 6 处实现口径说明（delay 参考时刻、runner user/deriveCommand 契约落点、TASK-003 范围扩至 web-fetch.ts、router delayMs/warnings 只读暴露、App ref 间接、D-005 增删承接）。

## 1. 构建概要
> 本次构建的整体统计

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | 13 / 13 |
| 复杂度分布 | S×2 / M×8 / L×3 |
| 新增文件 | 12 个源码/测试 + 1 个本报告 |
| 修改文件 | 16 个（源码/测试/配置/package.json） |
| 删除文件 | 4 个（base help-aggregator / lgdl-web 场景 help-aggregator / lgdl-web.ts / lgdl-web.test.ts） |
| 各包测试 | web-cli-base 26→**71**（+45：delay 10 / router 13 / runner 12 / sleep 增补等）；lgdl-web-cli →**84**（含 tool-entry 5）；lgdl-web-op-cli →**15**（含 tool-entry 4）；lgdl-web 35→**41**（净变化：删 provider buildTools 顺序 1 + 删 lgdl-web.test 2 + 增 session 9） |
| 全仓门禁 | `npm run build` + `npm test` 全绿（0 失败；lgdl-render 1 env-skip 为既有 LGDL_MATRIX_B11 门控，与本次无关）；4 个改动包 `tsc --noEmit` 零错误；lgdl-web vite build 零错误 |

## 2. 文件变更
> 本次构建涉及的全部文件操作（含源码、测试、配置）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | packages/web-cli-base/src/delay.ts | TASK-001 | Clock 契约 + realClock + clampDelayMs + DelayGate（命令间最小间隔/首分发不等待/免除零开销/stats+onDelay；零 LGDL） |
| NEW | packages/web-cli-base/src/delay.test.ts | TASK-001 | fake clock 专项 10 例（首分发/间隔 max/慢命令/免除/EC-005×2/stats/零开销/钳制） |
| MODIFY | packages/web-cli-base/src/sleep.ts | TASK-002 | 增 normalizeSleepArgs + executeSleepFromArgs（fc 直调，缺参友好文案=旧 AiPanel 语义，clamp 保留）；零回归 |
| MODIFY | packages/web-cli-base/src/sleep.test.ts | TASK-002 | 增补 EC-011 用例（ms/seconds 归一/缺参/非法/10min clamp 零等待/端到端小等待） |
| MODIFY | packages/web-cli-base/src/tools.ts | TASK-003 | web-fetch description/示例路径 + WEB_CLI_HELP_TOOL 示例中性化（lgdl/web/workbench→guide.md；lgdl-web-cli→my-cli）；schema 结构零改动 |
| MODIFY | packages/web-cli-base/src/help.ts | TASK-003 | webFetchHelp 示例路径中性化 |
| MODIFY | packages/web-cli-base/src/web-fetch.ts | TASK-003 | 文案中性化（错误/示例/注释内 lgdl/web/workbench 路径 → guide.md）——范围说明见 §5 |
| MODIFY | packages/web-cli-base/src/web-fetch.test.ts | TASK-003 | fixture 中性化（断言语义不变） |
| MODIFY | packages/web-cli-base/src/help-aggregator.ts | TASK-003 | 一览 tip 中性化（file 后随 TASK-012 删除） |
| NEW | packages/web-cli-base/src/router.ts | TASK-004 | CommandRouter + ToolEntry/ToolResult/ToolContext/ToolExecutor/ToolCallArgs/ToolFunctionDef/RouterOptions + createCommandRouter + 3 内建自动注册（sleep delayMs:0、web-cli-help listed:false）+ register/dispatch/deriveTools/deriveCommand/listHelp/helpFor + delay gate 接线 |
| NEW | packages/web-cli-base/src/router.test.ts | TASK-004 | 专项 13 例（内建自足/重复注册/未注册显式错误/异常稳定文案/dispatch 顺序/派生引号/help 注册即得/AC-003 四链/EC-005 免除/钳制警告） |
| NEW | packages/web-cli-base/src/runner.ts | TASK-005 | AgentRunner 中性循环（turns/轮次上限/多 toolCalls 逐条/toolCallId 回填/失败聚合/LLM 错误重试一次/stop）+ events 8 + hooks intercept/onToolDone；零 react import |
| NEW | packages/web-cli-base/src/runner.test.ts | TASK-005 | 专项 12 例（纯 node；事件序列/toolCallId/超限/多调用不吞/失败聚合/stop/LLM 重试/拦截） |
| MODIFY | packages/web-cli-base/src/index.ts | TASK-006/012 | 导出 router/delay/runner 类型与工厂（TASK-006）；TASK-012 移除 help-aggregator 导出 |
| MODIFY | packages/lgdl-web-cli/src/index.ts | TASK-007 | 导出 createLgdlWebCliTool |
| NEW | packages/lgdl-web-cli/src/tool-entry.ts | TASK-007 | createLgdlWebCliTool()：schema=WEB_CLI_TOOL 逐字节 / executor→lgdlExecutor.executeSubcommand 映射（ok/output=lines.join/changed/source/error）/ help=webCliHelp |
| NEW | packages/lgdl-web-cli/src/tool-entry.test.ts | TASK-007 | schema 逐字段 + status 往返 + add-node changed/source + 失败映射（5 例） |
| MODIFY | packages/lgdl-web-op-cli/src/index.ts | TASK-008 | 导出 createOpCliToolEntry |
| NEW | packages/lgdl-web-op-cli/src/tool-entry.ts | TASK-008 | createOpCliToolEntry(registry)：schema=WEB_OP_TOOL / prefix / executor→registry.execute / help=webOpHelp（next-actions 由场景拦截） |
| NEW | packages/lgdl-web-op-cli/src/tool-entry.test.ts | TASK-008 | schema + handler 转发 + 未注册 ok:false + next-actions 不特判（4 例） |
| MODIFY | packages/lgdl-web/src/ai/provider.ts | TASK-009 | 删 buildTools() 与三工具 schema import；chat(settings, turns, tools?: LlmToolDef[]) 增可选 tools（缺省 []；testConnection 零改动） |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts | TASK-009 | 删 buildTools 顺序用例（D-005 承接记录：→ router.test + session.test 派生顺序断言）；其余 12+ 例保持绿 |
| NEW | packages/lgdl-web/src/ai/session.ts | TASK-010 | 单一组装点 createAiSession：router(delayMs=600) + 注册 2 业务工具 + runAgent 装配（chatFn 带 deriveTools / dispatch ctx.source run-local 推进 / deriveCommand 绑定）；零 React |
| NEW | packages/lgdl-web/src/ai/session.test.ts | TASK-010 | 派生顺序（AC-006）/delay 600（AC-005）/5 工具集合/web-fetch dispatch 2 例承接（data URL 成功/缺 path）/cli status+add-node/op copy-source/help 一览（9 例） |
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx | TASK-011 | 删 toolCallToCommand/五分支分发/sleep 特判/web-cli-help 聚合器/深导入 lgdlExecutor；改经 session.runAgent 驱动（events→appendMessage、hooks→next-actions 拦截 + onApply 写回）；渲染面/PRESET/guideDoc/pending 保留 |
| MODIFY | packages/lgdl-web/src/App.tsx | TASK-011 | 删 handleWebOp 与 AiPanel onWebOp prop；opRegistry 19 handler 组装保留并经 createOpCliToolEntry 注入；新增 aiSession useMemo（唯一组装点）+ sourceRef/aiSettingsRef 间接 |
| MODIFY | packages/lgdl-web/package.json | TASK-010/012 | test 文件列表增 session.test.ts、删 lgdl-web.test.ts |
| DELETE | packages/web-cli-base/src/help-aggregator.ts | TASK-012 | HelpAggregator 机制符号废弃（router listHelp/helpFor 派生取代，FR-010/ADR-004） |
| DELETE | packages/lgdl-web/src/ai/help-aggregator.ts | TASK-012 | 场景 help 注册面删除 |
| DELETE | packages/lgdl-web/src/ai/lgdl-web.ts | TASK-012 | 死接线删除（fetch 行处理器职责：web-fetch 为独立内建工具；exec.ts handleLine 扩展点保留为 base 中性机制） |
| DELETE | packages/lgdl-web/src/ai/lgdl-web.test.ts | TASK-012 | 2 例已由 session.test.ts 承接（D-005） |
| MODIFY | packages/lgdl-web-cli/src/adapters/lgdl.ts | TASK-012 | 注释更新（fetch 行处理器归属/消费方说明，消除指向已删 lgdl-web.ts 的陈旧引用） |
| NEW | .sddu/specs-tree-root/specs-tree-web-cli-base-framework/build.md | — | 本构建报告 |

## 3. 测试覆盖
> 新增/改写测试清单（纯 node，零真实网络/长等待）

| 测试文件 | 归属任务 | 验证点 | 结果 |
|---------|:--:|------|:--:|
| web-cli-base/src/delay.test.ts | TASK-001 | fake clock：首分发不等待/连续两分发=max(delayMs,执行耗时)/慢命令不补齐/免除不更新起点/EC-005（3000 不追加、200 补齐 600）/stats+onDelay/零开销/钳制 | ✅ 10 例 |
| web-cli-base/src/router.test.ts | TASK-004 | 内建自动注册/空业务自足冒烟/重复注册抛错/未注册显式错误/异常→稳定文案/executor ok:false 直通/deriveTools 顺序+幂等/deriveCommand 引号/help 注册即得+EC-010/AC-003 四链/delay gate 接线+EC-005/未注册不等待/EC-009 钳制一次警告 | ✅ 13 例 |
| web-cli-base/src/runner.test.ts | TASK-005 | 零 react import 静态断言/纯文本完成/空回复 empty/toolCallId 回填/事件序列/多 toolCalls 逐条+单败不吞后/失败聚合+纠正 turn/max-rounds 超限/stop 当前工具后退出/LLM 错误重试一次+连续停止/onToolDone(changed/source)/intercept 短路 | ✅ 12 例 |
| web-cli-base/src/sleep.test.ts 增补 | TASK-002 | executeSleepFromArgs/normalizeSleepArgs：ms·seconds 归一（ms 优先）/缺参友好/非法负值/10min clamp 零真实等待/端到端小等待 | ✅ 增 6 例 |
| lgdl-web-cli/src/tool-entry.test.ts | TASK-007 | schema 与 WEB_CLI_TOOL 逐字段一致/status 只读往返/add-node changed+source/失败映射/空 source 往返 | ✅ 5 例 |
| lgdl-web-op-cli/src/tool-entry.test.ts | TASK-008 | schema 逐字段+prefix/registered handler 转发（成功+失败+error 语义）/未注册 ok:false/next-actions 不在条目内特判 | ✅ 4 例 |
| lgdl-web/src/ai/session.test.ts | TASK-010 | 派生顺序=[lgdl-web-cli,lgdl-web-op-cli]+[web-fetch,sleep,web-cli-help]（AC-006）/delayMs=600（AC-005）/5 工具集合/web-fetch dispatch data URL 成功+缺 path 错误（承接 lgdl-web.test 2 例）/lgdl-web-cli status+add-node/op handler/help 一览 4 工具 | ✅ 9 例 |

## 4. 任务完成清单
> 每个任务的完成状态

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR/验收 |
|------|------|:--:|:--:|------|
| TASK-001 | base delay 模块（DelayGate + Clock 契约） | M | ✅ completed | FR-013~017/EC-005/EC-009/AC-005 |
| TASK-002 | base sleep fc 接入（executeSleepFromArgs） | M | ✅ completed | FR-009/EC-011 |
| TASK-003 | base 文案中性化（tools.ts/help.ts + web-fetch.ts） | S | ✅ completed | FR-012/D-006/AC-012 |
| TASK-004 | base CommandRouter 模块（router.ts + router.test.ts） | L | ✅ completed | FR-001~005/010/013-016/020/021；AC-001/003/004/006 |
| TASK-005 | base AgentRunner 模块（runner.ts + runner.test.ts） | L | ✅ completed | FR-006/EC-006~008/AC-011/NFR-008 |
| TASK-006 | base index.ts 导出面扩展 | S | ✅ completed | FR-001/NFR-007 |
| TASK-007 | lgdl-web-cli 工具注册（tool-entry.ts） | M | ✅ completed | FR-018/AC-002/D-001 |
| TASK-008 | lgdl-web-op-cli 工具注册（tool-entry.ts） | M | ✅ completed | FR-019/AC-002/D-004 |
| TASK-009 | lgdl-web provider chat 改造 | M | ✅ completed | FR-008/AC-006/R-011 |
| TASK-010 | lgdl-web session 单一组装点（session.ts + session.test.ts） | M | ✅ completed | FR-008/015/022；AC-005/006/007 |
| TASK-011 | lgdl-web AiPanel/App 场景收敛（同批原子） | L | ✅ completed | FR-007/019/023；AC-004/007/R-009 |
| TASK-012 | 删除面（base + lgdl-web） | M | ✅ completed | FR-010/011；AC-007/012；NFR-003 |
| TASK-013 | 全仓门禁 + grep 零残留断言 | M | ✅ completed | NFR-001/002/003/005/007/008；AC-001~012；D-005 |

## 5. 实现口径说明（review 核验点）
> 实现中的关键解释与偏差记录（tasks.md/plan 未尽处）

| # | 主题 | 说明 |
|---|------|------|
| 1 | DelayGate 参考时刻 | 采用「上一 delay-eligible 命令的**执行起点**」作间隔参考（before() 记账，sleep 免除不更新）。按 plan 字面「完成时刻」语义推导，连续两分发会被恒定补齐至整 delayMs，**不满足** FR-014「间隔 = max(delayMs, 执行耗时)」验收（慢命令场景）；起点参考下该式精确成立。EC-005 两场景（sleep 3000 不追加 / sleep 200 补齐 600）在两种模型下结果一致，delay.test/router.test 已按验收式断言。 |
| 2 | runner 契约落点 | AgentRunnerOptions 增加 `user`（初始 user 指令；run() 无参、重复调用幂等）与可选 `deriveCommand` 注入（场景绑定 router.deriveCommand；null/缺省 → 显示原始工具名）——plan §2.5.2 伪代码未显式列这两个字段但循环语义映射表（§2.5.3）要求命令文本派生在 runner 内发生；注入保持 runner 不依赖 router 类型（NFR-008）。 |
| 3 | TASK-003 范围 | 中性化除 tasks 列出的 tools.ts/help.ts 外，扩至 web-fetch.ts（错误文案/注释内 `lgdl/web/workbench/README-CLI.md` 残留）与 web-fetch.test.ts/sleep.test.ts fixture（my-cli/guide.md）——否则 TASK-003 自带验证命令 `grep README-CLI|lgdl/web/workbench packages/web-cli-base/src/` 无法 CLEAN。schema 结构零改动（A-001）。 |
| 4 | router 观测面 | CommandRouter 暴露只读 `delayMs`（钳制后）与 `warnings`（EC-009 一次警告），供 AC-005/EC-009 可测断言（plan 仅口头提及 router.warnings）。 |
| 5 | session 组装 | AiSession.runAgent 的 chat 每轮调 `deps.settings()` 取最新设置、schema=router.deriveTools()；dispatch 用 run-local source（首次 deps.getSource()，changed 后推进，R-009）；App 经 sourceRef/aiSettingsRef 间接供值——router 不随每次编辑器输入重建（opRegistry 依赖 source 时仍随其重建，属既定依赖）。AiPanel/App 改动同批落地（TASK-011 红线）。 |
| 6 | D-005 增删承接 | provider.test 旧 buildTools 顺序断言删除 → base router.test「deriveTools 顺序」+ session.test「派生顺序」承接；lgdl-web.test.ts 2 例（fetch 行路由）删除 → session.test web-fetch dispatch 2 例承接（行为等价）；AiPanel 无单测 → validate AI 实战闭环承接（AC-008）；sleep.test 增补 executeSleepFromArgs 专项。 |
| 7 | C 档零改动核验 | 图语义（lgdl-web-cli 17 子命令/exec 命令族/adapters·commands·operations·protocol·help·tools 源码）、op-cli（ops/tool/handlers/help/next-actions）、prompts/README/provider 应用态（PROVIDERS/localStorage/testConnection）均未动；5 工具名保持现状。 |

## 6. 门禁结果
> TASK-013 最终验证

| 门禁项 | 结果 |
|------|:--:|
| 全仓 `npm run build`（含 lgdl-web vite） | ✅ 零错误 |
| 全仓 `npm test`（9 包） | ✅ 0 失败（web-cli-base 71 / lgdl-web-cli 84 / lgdl-web-op-cli 15 / lgdl-web 41 / core 267 / render 95〔1 env-skip 既有〕/ router 8 / cli·layout 无测试用例） |
| `tsc --noEmit`（4 改动包） | ✅ 零错误 |
| grep：base 无 README-CLI / lgdl/web/workbench / @lgdl/lgdl-web import / react import（router·delay·runner） | ✅ CLEAN |
| grep：lgdl-web 无 opRegistry.execute / toolCallToCommand / sleep 特判 / buildTools 数组 / 场景 help 注册 / lgdl-web.ts 残留 / lgdl-web-cli/lgdl 深导入 | ✅ CLEAN（仅文档化注释提及删除动作） |
| grep：全仓 HelpAggregator / createHelpAggregator / lgdl-web.test 源码 | ✅ CLEAN |
| AC-003 假工具四链冒烟（schema/help/dispatch/前缀） | ✅ router.test 专项 |

## 7. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-web-cli-base-framework` 开始代码审查 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：13/13 任务完成；base delay/router/runner + 中性化 + sleep fc；双业务包 tool-entry；lgdl-web provider/session/AiPanel/App 收敛 + 删除面；全仓全绿；6 处实现口径说明 + D-005 增删承接记录 | 2026-09-05 | SDDU Build Agent |
