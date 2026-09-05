# 任务分解：web-cli-base 框架化：CommandRouter 路由下沉 + domain-neutral 能力归属（specs-tree-web-cli-base-framework）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: plan.md（技术方案 + 4 ADR + 影响面 NEW12/MODIFY12/DELETE4）、spec.md（24 FR 五组 + 8 NFR + 12 EC + 12 AC + D-001~D-006）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-05
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-05
> **更新说明**: 初始创建（基于 plan §5 文件影响面 + §8 交接清单拆分为 13 个原子任务 / 9 个波次；测试增删依据 D-005 记录于 §4.3）

---

## 1. 依赖拓扑总览

> 任务依赖关系和执行顺序；每任务带「独立可验证」标志（✅ = 任务自身验证命令可自证完成，不依赖后续任务）

### 1.1 任务总览表

| 编号 | 模块/落点 | 复杂度 | 依赖 | 独立可验证 | 一句话目标 |
|------|----------|:--:|------|:--:|------|
| TASK-001 | web-cli-base | M | 无 | ✅ | delay.ts DelayGate + Clock 契约 + delay.test.ts |
| TASK-002 | web-cli-base | M | 无 | ✅ | sleep.ts 增 executeSleepFromArgs + sleep.test.ts 增补（FR-009/EC-011） |
| TASK-003 | web-cli-base | S | 无 | ✅ | tools.ts/help.ts 文案中性化（FR-012） |
| TASK-004 | web-cli-base | L | 001/002/003 | ✅ | router.ts CommandRouter + 3 内建自动注册 + router.test.ts |
| TASK-005 | web-cli-base | L | 004 | ✅ | runner.ts AgentRunner 中性循环 + runner.test.ts |
| TASK-006 | web-cli-base | S | 004/005 | ✅ | base index.ts 导出面扩展（router/delay/runner + 类型） |
| TASK-007 | lgdl-web-cli | M | 006 | ✅ | tool-entry.ts createLgdlWebCliTool + index.ts + tool-entry.test.ts |
| TASK-008 | lgdl-web-op-cli | M | 006 | ✅ | tool-entry.ts createOpCliToolEntry + index.ts + tool-entry.test.ts |
| TASK-009 | lgdl-web | M | 006 | ✅ | provider.ts 删 buildTools + chat(tools?) + provider.test.ts 改写 |
| TASK-010 | lgdl-web | M | 007/008/009 | ✅ | session.ts 单一组装点 + session.test.ts（承接派生顺序/fetch dispatch） |
| TASK-011 | lgdl-web | L | 010 | ✅ | AiPanel.tsx 分发面删除 + App.tsx session 持有/op 工具执行器注入 |
| TASK-012 | lgdl-web + base | M | 010/011 | ✅ | 删除面：help-aggregator ×2 / lgdl-web.ts / lgdl-web.test.ts + package.json 重列 |
| TASK-013 | 全仓 | M | 001~012 | ✅ | 全仓测试门禁 + grep 零残留断言 + D-005 增删依据核验 |

### 1.2 串行依赖链（主干）

```
base 前置链（无外部依赖，可先并行开工）：
  TASK-001 delay ────────────┐
  TASK-002 sleep fc ─────────┼──▶ TASK-004 router ──▶ TASK-005 runner ──▶ TASK-006 base index 导出
  TASK-003 中性化 ───────────┘                              （router 是唯一先决：runner 类型契约）
                                                           
业务注册链（依赖 base 导出面）：
  TASK-006 ──▶ TASK-007 lgdl-web-cli tool-entry ──┐
  TASK-006 ──▶ TASK-008 lgdl-web-op-cli tool-entry ──┴──▶ TASK-010 session.ts（注册二者 + delay 600）
  TASK-006 ──▶ TASK-009 provider.ts（chat tools 参数）──▶ TASK-010

场景收敛链（依赖组装点）：
  TASK-010 ──▶ TASK-011 AiPanel/App 收敛 ──▶ TASK-012 删除面 ──▶ TASK-013 全仓门禁
```

### 1.3 并行分组（Wave）

```
Wave 1 ─── (无依赖，全部并行)
  TASK-001 [M] base delay 模块
  TASK-002 [M] base sleep fc 接入
  TASK-003 [S] base 文案中性化

Wave 2 ─── (依赖 Wave 1)
  TASK-004 [L] base CommandRouter 模块

Wave 3 ─── (依赖 TASK-004)
  TASK-005 [L] base AgentRunner 模块

Wave 4 ─── (依赖 TASK-004/005)
  TASK-006 [S] base index.ts 导出面

Wave 5 ─── (依赖 TASK-006；三任务并行)
  TASK-007 [M] lgdl-web-cli 工具注册
  TASK-008 [M] lgdl-web-op-cli 工具注册
  TASK-009 [M] lgdl-web provider chat 改造

Wave 6 ─── (依赖 Wave 5)
  TASK-010 [M] lgdl-web session 单一组装点

Wave 7 ─── (依赖 TASK-010)
  TASK-011 [L] lgdl-web AiPanel/App 场景收敛

Wave 8 ─── (依赖 TASK-010/011)
  TASK-012 [M] 删除面（base + lgdl-web）

Wave 9 ─── (依赖全部)
  TASK-013 [M] 全仓门禁 + grep 断言
```

---

## 2. 任务列表

> 每个任务的详细定义

### TASK-001: base delay 模块（DelayGate + Clock 契约）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR** | FR-013~017；EC-005/009；AC-005 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.4（DelayGate 挂点/语义/Clock 契约/钳制/观测）+ §3.3 方案 A；spec DLY 组 FR-013~017、EC-005、EC-009、AC-005、ADR-003

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/delay.ts |
| NEW | packages/web-cli-base/src/delay.test.ts |

**输出**: delay.ts 导出 `Clock`（now/sleep）、真实时钟、`DelayGate`（命令间最小间隔、首分发不等待、补齐语义）+ clamp 工具；delay.test.ts 以 fake clock 验证（同步记账 + 手动推进，零真实等待）

**验收标准**:
- [ ] delay.ts 零 LGDL import/文案（NFR-001）
- [ ] DelayGate 语义：距上一命令完成时刻 < effDelay 则补齐；首个分发（lastCompletion=null）不等待
- [ ] 非法配置（<0 或 >5000）钳制到 [0,5000] 且仅记录一次警告（EC-009）
- [ ] stats（waitCount/waitedMs）与 onDelay 观测面存在（FR-017）
- [ ] delay.test.ts fake clock 覆盖：首分发不等待 / 连续两分发间隔=max(delayMs,执行耗时) / sleep 长等待不追加 / sleep 短于 delayMs 补齐至间隔（EC-005）/ 单工具免除（FR-016）/ 非法值钳制（EC-009）/ stats 观测（FR-017）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-002: base sleep fc 接入（executeSleepFromArgs）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR** | FR-009；EC-011 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.6.1（sleep 内建条目 executor = executeSleepFromArgs，ms/seconds 归一 + 缺参友好文案等价 AiPanel.tsx:455 语义 + clamp 10 分钟保留 sleep.ts:46）；spec FR-009、EC-011；R-008

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/sleep.ts |
| MODIFY | packages/web-cli-base/src/sleep.test.ts |

**输出**: sleep.ts 新增 `executeSleepFromArgs(args)`（从 fc args 直调，不经文本重建-重解析间接层——删除 AiPanel:458 式二次 parseSleepCommand 的间接必要性）；sleep.test.ts 增补 EC-011 用例

**验收标准**:
- [ ] executeSleepFromArgs：ms 与 seconds 归一正确；缺参返回 ok:false + 友好提示（含 --ms/--seconds 用法）；超 10 分钟 clamp 保留
- [ ] 原 parseSleepCommand/executeSleep 行为零回归（既有用例仍绿）
- [ ] 独立函数形态可被 router 内建注册直接引用（FR-009，供 TASK-004 消费）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-003: base 文案中性化（tools.ts / help.ts）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR** | FR-012；Q-012(O-006)；AC-012 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.7.4 + §5.1；spec FR-012/D-006；实测锚点 tools.ts:27/:38、help.ts:34（`lgdl/web/workbench/README-CLI.md` 示例残留）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/tools.ts |
| MODIFY | packages/web-cli-base/src/help.ts |

**输出**: web-fetch schema description 示例路径 + path 参数描述示例 + webFetchHelp 示例替换为中性示例（如 `guide.md` / `https://example.com/doc.md`）；schema 结构零改动（A-001 协议描述零改写仅文案）

**验收标准**:
- [ ] base 包内 grep 无 `lgdl/web/workbench`、`README-CLI`、`lgdl-web-cli` 残留（help-aggregator tip 除外——随 TASK-012 删除）
- [ ] WEB_FETCH_TOOL/SLEEP_TOOL/WEB_CLI_HELP_TOOL 结构字段不变（description 文本可中性化）
- [ ] base build + 既有测试全绿（无 schema 形状断言回归）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base && grep -rn "README-CLI\|lgdl/web/workbench" packages/web-cli-base/src/ || echo "CLEAN"
```

### TASK-004: base CommandRouter 模块（router.ts + router.test.ts）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-001、TASK-002、TASK-003 |
| **执行波次** | Wave 2 |
| **对应 FR** | FR-001~005/007/010/013-016/020/021；EC-001/003/004/010/012；AC-001/003/004/006 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.3（ToolEntry 契约 + dispatch 语义 + schema/help/前缀派生与双契约顺序）+ §2.4.1（delay gate 接线）+ §2.6.1（3 内建自动注册）+ §3.1 方案 A；spec RTR/REG 组；ADR-001/003/004

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/router.ts |
| NEW | packages/web-cli-base/src/router.test.ts |

**输出**: router.ts 导出 ToolEntry/ToolResult/ToolContext/ToolExecutor/ToolCallArgs + RouterOptions + CommandRouter 类 + createCommandRouter 工厂（构造自动注册 3 内建：web-fetch/sleep/web-cli-help——sleep 条目 delayMs:0、web-cli-help 条目 listed:false）；router.test.ts 专项（§4.2 测试策略）

**验收标准**:
- [ ] register：重复同名抛错（EC-003）；has/names 查询可用
- [ ] dispatch：已注册名 → delay gate → 执行器 → ToolResult；未注册名 → `{ok:false, output:'✖ 未注册工具 "x"'}`（FR-003/EC-001）；执行器抛异常 → 捕获转 ok:false + 稳定文案，异常明细仅 error 字段（EC-012）
- [ ] deriveTools() 顺序 = [业务(注册序)] + [内建置末 web-fetch→sleep→web-cli-help]（FR-005/AC-006）；幂等
- [ ] deriveCommand() 前缀派生 + args 引号规则（逐字节复制 AiPanel.tsx:165-168）；未知名 → null（FR-007）
- [ ] listHelp()/helpFor() 注册即得（FR-010/AC-003）；web-cli-help 不自列、自查返回未知（EC-010）；一览 tip 中性（FR-012）
- [ ] 内建自动注册：新实例 router 即含 3 内建、可列可查可派发（FR-020/AC-001）
- [ ] delay gate 接线：dispatch 查 effDelay（entry.delayMs ?? options.delayMs）→ before/after（FR-013/016）
- [ ] 空业务注册场景下 web-fetch/sleep/help dispatch 冒烟通过（NFR-001 自足）
- [ ] router.ts 零 react/LGDL import（NFR-001/008）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-005: base AgentRunner 模块（runner.ts + runner.test.ts）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-004 |
| **执行波次** | Wave 3 |
| **对应 FR** | FR-006；EC-006~008；AC-011；NFR-008 |
| **模块** | packages/web-cli-base |

**输入**: plan §2.5（上收边界清单 + AgentRunnerOptions/AgentRun/RunOutcome + 循环语义逐点映射表 §2.5.3）+ §3.2 方案 A；spec UPL FR-006 + D-003 边界；ADR-002；R-007/R-009

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/web-cli-base/src/runner.ts |
| NEW | packages/web-cli-base/src/runner.test.ts |

**输出**: runner.ts 中性 agent 循环（turns 维护/轮次上限/多 toolCalls 逐条/按 toolCallId 回填/失败聚合/LLM 错误重试一次/可停止）+ events（onAssistantText/onCommandLine/onToolOutput/onRoundLimit/onEmptyReply/onLLMError/onFailAggregate/onFinish）+ hooks（intercept/onToolDone）；runner.test.ts 专项（纯 node）

**验收标准**:
- [ ] runner.ts 无 react import（静态 grep 断言，NFR-008/AC-011）
- [ ] 循环语义逐点覆盖：turns 初始化/回填 toolCallId / MAX_ROUNDS 超限 onRoundLimit+停止（EC-008）/ 多 toolCalls 逐条、单条失败不吞后续（EC-006）/ 失败聚合标记 + 纠正 user turn（EC-007）/ stop() 当前工具完成后退出 / LLM 错误重试一次、连续失败停止
- [ ] 事件面完整（FR-006：新增 assistant 文本/工具完成/失败聚合/轮次超限/停止）
- [ ] hooks.intercept（dispatch 前拦截返回 ToolResult 则跳过）与 onToolDone（changed/source 完成回调）可注入（D-003 边界：LGDL 回调经 hooks 接入）
- [ ] runner.test.ts 事件序列断言（为 FR-024/AC-008 等价验证提供事件录制面）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base && grep -n "from 'react'\|from \"react\"" packages/web-cli-base/src/runner.ts || echo "CLEAN"
```

### TASK-006: base index.ts 导出面扩展

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-004、TASK-005 |
| **执行波次** | Wave 4 |
| **对应 FR** | FR-001；NFR-007 |
| **模块** | packages/web-cli-base |

**输入**: plan §5.1（index.ts 导出 router/delay/runner 类型与工厂；help-aggregator 导出本波保留，TASK-012 再移除）；spec NFR-007（导出面完整性）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/web-cli-base/src/index.ts |

**输出**: index.ts 新增导出——CommandRouter/createCommandRouter、RouterOptions、ToolEntry/ToolResult/ToolContext/ToolExecutor/ToolCallArgs（router.ts）；Clock/DelayGate/真实时钟（delay.ts）；AgentRunner/AgentRun/RunOutcome/AgentRunnerOptions（runner.ts）。help-aggregator 导出（HelpAggregator/createHelpAggregator/ToolHelpEntry）**暂留**——消费方 lgdl-web 场景未删

**验收标准**:
- [ ] base 类型导出面覆盖 router/delay/agent runner 全部新能力类型（NFR-007）
- [ ] base build（tsc）零错误
- [ ] lgdl-web-cli/lgdl-web-op-cli/lgdl-web 可正常消费新导出（TASK-007/008/009 编译依赖此任务完成）
- [ ] help-aggregator 导出仍存在（TASK-012 之前不破坏既有消费方）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base
```

### TASK-007: lgdl-web-cli 工具注册（tool-entry.ts）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-006 |
| **执行波次** | Wave 5 |
| **对应 FR** | FR-018；AC-002 |
| **模块** | packages/lgdl-web-cli |

**输入**: plan §2.6.2（createLgdlWebCliTool 契约：schema=WEB_CLI_TOOL / executor 内部走 lgdlExecutor.executeSubcommand / help=webCliHelp / summary）+ §5.2；spec FR-018、D-001（createExecutor 保留为工具内部执行器，不做全泛化）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-cli/src/tool-entry.ts |
| MODIFY | packages/lgdl-web-cli/src/index.ts |
| NEW | packages/lgdl-web-cli/src/tool-entry.test.ts |

**输出**: createLgdlWebCliTool(): ToolEntry——schema = WEB_CLI_TOOL 逐字节；executor = `(tc, ctx) => lgdlExecutor.executeSubcommand(ctx.source ?? '', tc.subcommand, tc.args, ctx.docId)` → 映射 ToolResult（ok/output=lines.join/changed/source/error）；help = webCliHelp；index.ts 导出该工厂

**验收标准**:
- [ ] C 档零改动：adapters/lgdl.ts / commands / operations / protocol / help / tools 源码不动（NG-001/NG-002）
- [ ] 条目 schema 与 WEB_CLI_TOOL.function 逐字段一致（AC-002）
- [ ] executor 子命令执行行为与现 executeSubcommand 路径一致（结果文本/changed/source 语义等价）
- [ ] tool-entry.test.ts 断言 schema 映射 + 至少一例子命令 executor 往返（changed/source 语义）
- [ ] lgdl-web-cli build + test 全绿（test 脚本通配自动纳入 tool-entry.test.ts）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run build --workspace @lgdl/lgdl-web-cli && npm run test --workspace @lgdl/lgdl-web-cli
```

### TASK-008: lgdl-web-op-cli 工具注册（tool-entry.ts）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-006 |
| **执行波次** | Wave 5 |
| **对应 FR** | FR-019；AC-002 |
| **模块** | packages/lgdl-web-op-cli |

**输入**: plan §2.6.3（createOpCliToolEntry(registry) 契约：schema=WEB_OP_TOOL / prefix='lgdl-web-op-cli' / executor=registry.execute / help=webOpHelp）+ §5.3；spec FR-019、D-004（OpHandlerRegistry 顶层角色移交 CommandRouter）；R-005

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web-op-cli/src/tool-entry.ts |
| MODIFY | packages/lgdl-web-op-cli/src/index.ts |
| NEW | packages/lgdl-web-op-cli/src/tool-entry.test.ts |

**输出**: createOpCliToolEntry(registry: OpHandlerRegistry): ToolEntry——schema = WEB_OP_TOOL（enum 已由 OP_SUBCOMMANDS 派生 ops.ts:87-90）；prefix = 'lgdl-web-op-cli'；executor = `registry.execute(tc.subcommand, tc.args)` → ToolResult（ok/output/error）；help = webOpHelp；index.ts 导出该工厂

**验收标准**:
- [ ] C 档零改动：ops.ts / tool.ts / handlers.ts / help.ts / next-actions.ts 源码不动（NG-001/D-004）
- [ ] 条目 executor 映射正确：已注册 handler 执行成功 / 未注册子命令返回 ok:false（与现 registry.execute 一致）
- [ ] next-actions 语义由场景拦截（runner hooks.intercept）承接，不在本条目内
- [ ] tool-entry.test.ts 断言 schema + executor 映射（构造独立 registry 注入 handler 验证）
- [ ] op-cli build + test 全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run build --workspace @lgdl/lgdl-web-op-cli && npm run test --workspace @lgdl/lgdl-web-op-cli
```

### TASK-009: lgdl-web provider chat 改造

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-006 |
| **执行波次** | Wave 5 |
| **对应 FR** | FR-008；AC-006；R-011 |
| **模块** | packages/lgdl-web |

**输入**: plan §2.7（chat tools 供给切至 router.deriveTools()）+ §5.4（provider.ts 删 buildTools + chat 增可选 tools 参数；provider.test.ts 删 :189-196）；spec FR-008、NFR-005/D-005（顺序断言改写承接至 session.test + base router.test）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-web/src/ai/provider.ts |
| MODIFY | packages/lgdl-web/src/ai/provider.test.ts |

**输出**: provider.ts 删除 buildTools()（:247-275）与相关 schema 常量 import（:17-20 调整）；`chat(settings, turns, tools?: LlmToolDef[])` 增可选 tools 参数（缺省不带 tools——testConnection 零改动，provider.ts:231-234）；provider.test.ts 删 buildTools 顺序用例（:189-196）+ 对应 import 清理

**验收标准**:
- [ ] lgdl-web 源码无 buildTools 手写数组残留（FR-008/NFR-003）
- [ ] chat 签名向后兼容：testConnection 调用（不带 tools）编译通过且语义不变（R-011）
- [ ] provider.test.ts 其余用例（PROVIDERS/localStorage/直连标记等，约 12 例）保持绿；被删顺序用例的承接记录写入任务 §4.3
- [ ] lgdl-web 既有测试（locate/snap/provider）全绿

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli && npm run test --workspace @lgdl/lgdl-web
```

### TASK-010: lgdl-web session 单一组装点（session.ts + session.test.ts）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-007、TASK-008、TASK-009 |
| **执行波次** | Wave 6 |
| **对应 FR** | FR-008/015/022；AC-005/006/007 |
| **模块** | packages/lgdl-web |

**输入**: plan §2.7.1（AiSessionDeps/createAiSession 契约：router delayMs=600 + 注册 2 业务工具 + runner 装配）+ §4.2（session.test.ts 承接派生顺序断言 AC-006 + delay 配置 AC-005 + web-fetch dispatch 用例）；spec FR-022、FR-015、D-002/D-005

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | packages/lgdl-web/src/ai/session.ts |
| NEW | packages/lgdl-web/src/ai/session.test.ts |
| MODIFY | packages/lgdl-web/package.json |

**输出**: session.ts 导出 AiSessionDeps/AiSession/createAiSession——组装点 = base 内建自动注册 + register(createLgdlWebCliTool()) + register(createOpCliToolEntry(opRegistry)) + delayMs=600（FR-015）+ runAgent() 装配 AgentRunner（chatFn = provider.chat(settings, turns, router.deriveTools())；dispatch = router 绑定 + ctx 每调用取 getSource）；session.test.ts（派生顺序断言承接 provider.test.ts:191 + delay 配置生效 600 + web-fetch dispatch 2 例承接 lgdl-web.test.ts）；package.json test 脚本列表增 session.test.ts

**验收标准**:
- [ ] session.ts 零 React import（可纯 node 测试）
- [ ] 派生数组顺序 = [lgdl-web-cli, lgdl-web-op-cli] + [web-fetch, sleep, web-cli-help]（AC-006，与旧 provider.test.ts:191 等价）
- [ ] router 配置 delayMs=600 生效（构造 session 或 router 层断言）
- [ ] web-fetch 经 router dispatch 行为等价：`data:` URL 获取成功 / 缺 path 返回 ok:false（承接 lgdl-web.test.ts 2 例，lgdl-web.test.ts 删除有据 D-005）
- [ ] 组装点单一可指认（AC-007：lgdl-web 内 router 实例唯一持有处）
- [ ] lgdl-web test 全绿（package.json 显式列表已含 session.test.ts）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli && npm run test --workspace @lgdl/lgdl-web
```

### TASK-011: lgdl-web AiPanel/App 场景收敛

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-010 |
| **执行波次** | Wave 7 |
| **对应 FR** | FR-007/019/023；AC-004/007；R-001/R-009 |
| **模块** | packages/lgdl-web |

**输入**: plan §2.7.2（AiPanel 删除面清单 + 保留面清单）+ §2.8 数据流变更图 + §5.4（AiPanel.tsx / App.tsx 行号锚点）；spec FR-023、D-003（渲染留场景）；R-001（范围红线）

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | packages/lgdl-web/src/ai/AiPanel.tsx |
| MODIFY | packages/lgdl-web/src/App.tsx |

**输出**: AiPanel.tsx 删除 toolCallToCommand（:154-170）/ tc.name 五分支分发（:421-489）/ sleep 特判（:445-470）/ web-cli-help 新建聚合器（:471-479）/ 相关 import（:5-10 等）——改经 session.runAgent 驱动（events→appendMessage、hooks→next-actions 拦截/onApply 写回）；App.tsx 建 session（useMemo，deps=applyAiSource/source/docId/opRegistry/settings）、删 handleWebOp（:1121-1124）与 AiPanel onWebOp prop、opRegistry 19 handler 组装（:986-1117）保留并经 createOpCliToolEntry 注入

**验收标准**:
- [ ] AiPanel.tsx grep 零残留：toolCallToCommand / tc.name 分发 / sleep 特判 / createWebCliHelpAggregator / lgdl-web-cli 深导入 lgdlExecutor（FR-023/AC-007/NFR-003）
- [ ] lgdl-web 源码无 opRegistry 直连（AiPanel 不再 execute）——op handler 仅经 tool-entry executor（FR-019）
- [ ] 渲染保留面不变：web-cli 命令块 / next-actions 胶囊卡片 / tool 结果渲染 / markdown / 消息流组件不动（D-003）
- [ ] guideDoc 自动注入（:297-310/:391-395）与 PRESET/pending 语义保留
- [ ] source 状态推进正确：hooks.onToolDone 在 onApply 后更新 sourceRef 再继续（R-009/EC-006）
- [ ] vite build（lgdl-web）零错误 + `npx tsc --noEmit -p packages/lgdl-web/tsconfig.json` 零错误（vite 不做类型检查，需显式 tsc）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base --workspace @lgdl/lgdl-web-cli --workspace @lgdl/lgdl-web-op-cli && npm run build --workspace @lgdl/lgdl-web && npx tsc --noEmit -p packages/lgdl-web/tsconfig.json
```

### TASK-012: 删除面（base + lgdl-web）

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-010、TASK-011 |
| **执行波次** | Wave 8 |
| **对应 FR** | FR-010/011；AC-007/012；NFR-003 |
| **模块** | packages/lgdl-web + packages/web-cli-base |

**输入**: plan §5.1（base help-aggregator.ts 删除 + index.ts 同步删导出）+ §5.4（lgdl-web/ai/help-aggregator.ts + lgdl-web.ts + lgdl-web.test.ts 删除 + lgdl-web/package.json test 列表重列）+ §2.7.3（fetch 行处理器职责归属：lgdl-web 场景不再需要文本管线注入，exec.ts handleLine 扩展点作为 base 中性机制保留）；spec FR-011/D-005

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| DELETE | packages/web-cli-base/src/help-aggregator.ts |
| MODIFY | packages/web-cli-base/src/index.ts |
| DELETE | packages/lgdl-web/src/ai/help-aggregator.ts |
| DELETE | packages/lgdl-web/src/ai/lgdl-web.ts |
| DELETE | packages/lgdl-web/src/ai/lgdl-web.test.ts |
| MODIFY | packages/lgdl-web/package.json |

**输出**: base + lgdl-web 场景 help-aggregator 双删除（HelpAggregator 机制符号废弃，router help 派生已取代——FR-010/ADR-004）；lgdl-web.ts 死接线删除（其 lgdlExecutor 单例 + fetch 行处理器注入不再需要——function-calling 架构下 web-fetch 是独立内建工具；测试已迁 TASK-010）；lgdl-web.test.ts 删除（2 例已由 session.test.ts 承接）；lgdl-web/package.json test 脚本移除 lgdl-web.test.ts（重列 locate/snap/provider/session）；base index.ts 移除 help-aggregator 导出

**验收标准**:
- [ ] 全仓 grep `createHelpAggregator|HelpAggregator` 源码零命中（FR-010）
- [ ] lgdl-web 源码无指向 lgdl-web.ts 的 import/注释残留（FR-011/NFR-003）
- [ ] lgdl-web/package.json test 列表不含已删文件、含 session.test.ts；npm test 可运行
- [ ] base index.ts 无 help-aggregator 导出；base build/test 绿
- [ ] 全仓 9 包测试全绿（含本轮修改后）

**验证命令**:
```bash
npm run build --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/web-cli-base && npm run test --workspace @lgdl/lgdl-web && grep -rn "HelpAggregator\|createHelpAggregator\|lgdl-web.test" packages/*/src/ || echo "CLEAN"
```

### TASK-013: 全仓门禁 + grep 零残留断言

> 单个任务的详细定义

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-001 ~ TASK-012 全部 |
| **执行波次** | Wave 9 |
| **对应 FR** | NFR-001/002/003/005/007/008；AC-001~012；D-005 |
| **模块** | 全仓（9 包） |

**输入**: plan §4.2（测试策略门禁 + grep 断言清单）+ §2.7.4（双契约顺序/中性纯度）+ §5.5（不改动面）；spec NFR/AC 汇总 + D-005 测试增删依据

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| —（门禁验证，无源码改动） | 全仓 |

**输出**: 最终验证——全仓 build + test 全绿；grep 断言清单逐项零命中；D-005 测试增删依据记录核验（见 §4.3）

**验收标准**:
- [ ] 全仓 9 包测试命令全绿（AC-009）
- [ ] 全仓 tsc/vite build 零错误（AC-010：含 lgdl-web vite build + base 等包 tsc）
- [ ] grep 断言清单（NFR-003/AC-007）：lgdl-web 无 opRegistry 直连 / 无 toolCallToCommand 兜底 / 无 sleep 特判 / 无 buildTools 手写数组 / 无场景 help 注册——零命中
- [ ] base 零 LGDL 依赖与文案残留（AC-012）；base 新模块无 react import（AC-011）
- [ ] 新增假工具四链可见冒烟（AC-003，可在 router.test 或此处补断言）
- [ ] D-005 增删依据记录完整（§4.3 清单与实际改动一致，可审计）

**验证命令**:
```bash
npm run build && npm test
```

---

## 3. 任务汇总

> 任务数量、复杂度和波次的统计总览

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | 13 |
| S 级 (简单) | 3（TASK-003/006） |
| M 级 (中等) | 8 |
| L 级 (复杂) | 3（TASK-004/005/011） |
| 执行波次 | 9 |

> 注：TASK-003/006 计入 S；实际 S 任务为 TASK-003、TASK-006 两个，若严格按「单文件 <50 行」判定，TASK-002（sleep 增补函数 + 测试增补，均小改动）亦可归 S。表中以 M 计为稳妥执行策略（涉及既有测试文件修改）。

## 4. 执行策略

> 各波次的执行说明

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-001, TASK-002, TASK-003 | 并行执行（base 三个独立文件面，互不阻塞） |
| 2 | TASK-004 | 串行（依赖 Wave 1：DelayGate + executeSleepFromArgs + 中性 schema 就位后 router 才能接线） |
| 3 | TASK-005 | 串行（依赖 router.ts 的类型契约 ToolResult/ToolCallArgs） |
| 4 | TASK-006 | 串行（依赖 router/runner 文件存在；导出面供下游消费） |
| 5 | TASK-007, TASK-008, TASK-009 | 并行执行（两个业务包 tool-entry + provider 改造互不依赖，均只依赖 base 导出面） |
| 6 | TASK-010 | 串行（注册 2 业务工具 + provider.chat 新签名 + base router 内建，缺一不可） |
| 7 | TASK-011 | 串行（AiPanel 删除面依赖 session.runAgent 存在；App/AiPanel 须原子提交防中间态） |
| 8 | TASK-012 | 串行（所有 help-aggregator / lgdl-web.ts 消费方在前序已清理） |
| 9 | TASK-013 | 收尾门禁（全部完成后跑全仓） |

**关键原子性提醒**：
- TASK-011 中 AiPanel.tsx 与 App.tsx **必须同一提交**（props 契约联动：onWebOp 删除 + session 注入），不可分两步提交
- TASK-004 与 TASK-005 虽属 base 三件套并行面，但 runner.ts 引用 router.ts 的 ToolResult/ToolCallArgs 类型契约——实现可并行起草，**合并验证须 router 先绿**（§1.3 Wave 编排已体现）
- 每步沿用「相关包 build + test 绿」门禁（R-012 落地顺序先例）

### 4.1 测试任务清单（新建）

| 测试文件 | 归属任务 | 验证点 |
|---------|---------|--------|
| packages/web-cli-base/src/delay.test.ts | TASK-001 | fake clock 注入验证 FR-014/EC-005/EC-009/FR-016/FR-017 |
| packages/web-cli-base/src/router.test.ts | TASK-004 | register/dispatch/派生/help/内建自足/顺序/未注册显式错误（AC-001/003/004/006） |
| packages/web-cli-base/src/runner.test.ts | TASK-005 | 中性循环/事件序列/超限/失败聚合/stop（AC-011，纯 node） |
| packages/lgdl-web-cli/src/tool-entry.test.ts | TASK-007 | schema 映射 + executor 往返（AC-002） |
| packages/lgdl-web-op-cli/src/tool-entry.test.ts | TASK-008 | schema + executor 映射（AC-002） |
| packages/lgdl-web/src/ai/session.test.ts | TASK-010 | 派生顺序/delay 600/web-fetch dispatch（AC-005/006） |
| packages/web-cli-base/src/sleep.test.ts 增补 | TASK-002 | executeSleepFromArgs 归一/缺参/clamp（EC-011） |

> 各包 test 脚本机制：base / lgdl-web-cli / lgdl-web-op-cli 为 `tsc src/*.test.ts` 通配——新建测试文件**自动纳入**，无需改 package.json；lgdl-web 为**显式文件列表**——session.test.ts 新增 + lgdl-web.test.ts 删除须同步重列（TASK-010/TASK-012 已含 package.json MODIFY）。

### 4.2 既有测试增删依据（D-005 记录）

| 既有测试 | 操作 | 依据（被何承接） |
|---------|------|-----------------|
| provider.test.ts:189-196（buildTools 顺序断言） | 改写/删除（TASK-009） | 顺序契约由 router.test（TASK-004）+ session.test 派生顺序断言（TASK-010）承接，等价覆盖 |
| lgdl-web/ai/lgdl-web.test.ts 2 例（fetch 行路由） | 删除（TASK-012） | web-fetch 经 router dispatch 用例迁至 session.test.ts（TASK-010），行为等价：data: URL 成功 / 缺 path 错误 |
| base 既有 4 测试文件（llm/protocol/sleep/web-fetch） | 保留，sleep.test 增补 | sleep 增补 executeSleepFromArgs 专项（EC-011）；其余机制零语义改动 |
| AiPanel 无单测（UI 组件） | 不新增单测 | 行为等价由 AC-008 手测 + validate AI 实战闭环清单承接（D-005 门禁语义） |

### 4.3 validate 预备移交

build 完成后，validate 阶段 AI 实战闭环清单（四条路径 + next-actions/op + delay 校准）以 AC-008 为准，本文档不展开（属 sddu-validate 输入面）。

## 修订记录

> 记录本文档的版本变更历史

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：基于 plan §5 文件影响面（NEW12/MODIFY12/DELETE4 跨 4 包）+ §8 交接清单拆分为 13 个原子任务 / 9 个波次；串行链 = base delay→router→runner→index 导出→业务 tool-entry→session→场景收敛→删除面→全仓门禁；并行组 = Wave1（delay/sleep/中性化）+ Wave5（两业务包/provider）；每任务独立可验证（build+test 命令）；测试增删依据 D-005 记录于 §4.2；模板缺失用户自定义 hbs，采用插件内置模板骨架 + 任务指令结构要点融合 | 2026-09-05 | SDDU Tasks Agent |
