# 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy

> **文档定位**: SDDU 问题挖掘报告 — 记录 web-cli-plugin「**next 驱动机制的准确落地（修正 F-36 的偏颇）**」的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = ① **作者裁决（2026-09-27，本次对话定稿，逐字保留于 §0.1）** ② 前序 Feature F-36 `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（v0.11.3「AI 驱动 next」）**已收口（validated/completed）的现状产物与源码** ③ 上游底座（v5.5 F-33 的 AI 驱动编排 / v5.5.1 F-34 / F-35 的 free-input 终端 / R8 首开 floor）④ 仓库现状（分支 `feature/web-cli-plugin` @ `a75466a`；本轮只读实测）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（web-cli-plugin F-37「next 驱动机制的准确落地」问题挖掘）

web-cli-plugin「**next 驱动机制的准确落地**」问题挖掘报告 —— F-36 已把「next 产出权交给 AI」立了法，但**机制做偏了**：它把「LLM 驱动」实现成「**文本围栏块（```next）口述 + 解析**」，把触发范围**收敛到「有引用」上下文**，把「未配置 LLM」的 next 实现成**恒真的「自由输入」终端**，并且**没有 LLM 异常兜底**。作者已逐字纠正（§0.1）：**「有配置 LLM 的时候，LLM 驱动；没有配置 LLM 的时候，系统驱动用户配置 LLM」**。本 Feature 是对 F-36 的**机制级修正**（后续轮，不回头改已收口的 F-36，用新 Feature 承载）：把产出机制换成**真正的函数调用（function calling）「next 工具」**、把触发范围改为**无条件（只要配置 LLM，回合结束就由 LLM 驱动）**、把未配置路径改为**确定性「去配置 LLM」引导（自由输入不可行、不显示）**、并补上**「提醒 LLM 补一次 → 仍失败由系统兜底推荐配置新 LLM」**的兜底链。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（作者裁决 / F-36 现状产物 / 代码事实 / 仓库实测），供 spec 阶段追溯；**不加入任何方案推断，不写需求条文**。

### 0.1 作者裁决（2026-09-27，**原话逐字保留，不美化**，本次对话定稿）

**顶层原则（价值锚，不可逆立法）**：

> 「**有配置 LLM 的时候，LLM 驱动；没有配置 LLM 的时候，系统驱动用户配置 LLM**」

**口径①（已配置 LLM 时——提醒 + 最后兜底）**：

> 「是的，但是对话结束如果 LLM 没有调用 next 工具，记得你要提醒 LLM，做好最后兜底，如果 LLM 始终无法给你 next（LLM 坏了等情况），那就应该由系统给出兜底的推荐，推荐用户配置新的 LLM 等操作」

**口径②（未配置 LLM 时——确定性操作）**：

> 「是的，因为自由输入在没有 LLM 的场景下，是不可行的，只能给确定性操作」

**价值锚（为什么必须准确无误）**：

> 「只有准确无误、高可靠的做到这些，那我们之前做的 all-in-chat/next 才是有意义，有价值的」

**F-36 原裁决（承接，逐字，F-36 §0.1 已登记）**：

> 「这个推荐对吗，是不是还是写死的，有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出」

| 要素 | 逐字要点 | 性质 |
|---|---|---|
| **顶层原则** | 「有配置 LLM 的时候，**LLM 驱动**；没有配置 LLM 的时候，**系统驱动用户配置 LLM**」 | **不可逆立法**（承 F-33 v5.5「已配置 ⇒ AI 零按键驱动」/ F-36「AI 驱动 next」；本 Feature 把 F-36 的**实现机制**校正到该原则） |
| **推导 1（产出机制）** | 「如果 LLM 没有调用 **next 工具**」 | 产品语言：next 的产出载体应是**工具调用（function calling）**，**不是**文本围栏块口述 |
| **推导 2（触发范围）** | 「**对话结束**如果 LLM 没有调用 next 工具」 | 触发条件 = **对话结束**（无条件），**不是**「有引用才产出」 |
| **推导 3（异常兜底）** | 「**提醒 LLM**，做好最后兜底 …… LLM 始终无法给你 next（LLM 坏了等情况）⇒ 由**系统给出兜底的推荐**，推荐用户配置新的 LLM 等操作」 | 二级兜底链：① 提醒补一次 → ② 仍失败 ⇒ 系统兜底（推荐配置新 LLM 等确定性操作） |
| **推导 4（未配置）** | 「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」 | 未配置 LLM 时，next **不得含自由输入**；只给确定性引导（去配置 LLM） |

> **口径声明（如实）**：作者本轮**只给了原则与两条口径**，**未**指定「next 工具的精确 schema」「提醒机制如何实现（新一轮？系统提示？）」「LLM 异常的判定口径」「系统兜底推荐的精确形态」「围栏块通道去留」「与 op.turn / ai-drive 的关系」。这些**全部登记为开放点（§6.2 O-NDA-\*）**，**不在本阶段预设答案**。

### 0.2 F-36 现状（**已收口产物 + 本轮只读代码复核，逐条 `file:line`**）

> 以下为 F-36 落地后的现状（v0.11.3，父 + 两叶 `validated`）。本轮**只读复核，未改任何源码**。它是「偏颇」的事实底座（§3 逐条列出）。

**A. F-36 产出通道（**文本围栏块**，本轮复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| A-1 | **产出契约 = 尾随 `next` 围栏块 + 严格 JSON 数组**（系统提示句）；且**只并入「有引用」分支** | `background/ref-context.ts:52-59`（`NEXT_CONTRACT_GUIDANCE`）；`:97-100`（`valid.length === 0 ⇒ return ''` ⇒ 无引用时**系统段不含该句**） |
| A-2 | **解析在 SW**：取**本回合最后一条** assistant 文本的**最后一个** `next` 围栏块；三反引号正则 + `JSON.parse`；顶层非数组 ⇒ 零候选 | `background/ai-next.ts:58-87`（`FENCE` / `lastNextFenceBody` / `parseAiNextItems`） |
| A-3 | **5 道校验链**（顺序即优先级）：opId 在册（9）→ `tierOf` 三档（gesture 恒拒）→ ref 有效 → param 与 `ask` 相容 → label 形状 + 零明文 | `background/ai-next.ts:98-143`（`admitCandidate`）；`:145-158`（`validateAiNext`） |
| A-4 | **装配点**：SW `onFinish` 取 `lastAssistantText` → `validateAiNext` → `chat-result{done, aiNext?}` | `background/service-worker.ts:976-977,1003-1008,1027-1043` |
| A-5 | **载荷加法字段**：`ChatResultEvent.aiNext?: AiNextPayload`（type-only；缺席 ⇒ 现状逐字） | `background/chat-events.ts:49-72` |
| A-6 | **候选类型**：`AiNextCandidate{opId,label,ref?,params?}` / `AiNextPayload{accepted,blocked}` | `next-registry/definition.ts:100-113` |
| A-7 | **provider 骑 `ref-action` 位**：`id:'ai-next'`，`priority:2` + `prepend:true`，`rule:'ref-action'`，`when: session.aiNext?.length>0 ∧ openAsks===0`，`chipsFor` 权威 | `next-registry/providers.ts:162-175` |
| A-8 | **驱动者声明第 12 行**：`ai-next`（`timings:['idle']` / `driverClass:'ai-driven'` / `evidence:['session.aiNext']`）；`DRIVER_DECLS_SRC` 11→12 | `next-registry/providers.ts:247,267` |
| A-9 | **注入槽**：`NextCtx.session.aiNext?`（type-only 加法字段；缺席 ⇒ 现状逐字） | `next-registry/definition.ts:135`；`sidepanel.ts:2074` |
| A-10 | **R6 同因去重扩展覆盖 AI**：`refActionDigest` 家系预过滤 `session.aiNext`；全被压 ⇒ provider 不占规则位 ⇒ 确定性接管 | `recommend.ts:134-169`；`:500-536`（`candidateRules` + `chipsFor`） |
| A-11 | **面板消费**：`chat-result{done}` → `consumeAiNext(msg.aiNext)` 喂事件作用域单槽；被拦留痕恰一行（`driverBlockedLine`） | `sidepanel.ts:1996-2003,2074,4213-4230`；`next-registry/ai-drive.ts:123-125` |

**B. F-36 触发范围（**只在有引用上下文产出**，本轮复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| B-1 | **产出契约句只挂在「有引用」分支** ⇒ 无引用时 LLM **根本未被提示**要产 `next` | `background/ref-context.ts:97-100` |
| B-2 | **provider 骑 `ref-action` 规则位** ⇒ 与引用动作共享同一规则槽 | `next-registry/providers.ts:162-175` |
| B-3 | **plan 显式裁决**：「PD-ADN-005 是否只在 `ref-action` 规则上下文产出 ⇒ **本轮是**（提示只出现在有引用分支 + 骑 `ref-action` 位）；更泛产出面登记后续轮」 | F-36 `plan.md:290` |

**C. F-36 未配置 LLM 路径（**恒真「自由输入」终端**，本轮复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| C-1 | **`free-input` provider `when` 恒真**（`busy===true \|\| busy===false`）⇒ **任意配置状态下**推荐卡末端都铸「自由输入…」终端 | `next-registry/providers.ts:205-221`（终端声明）；`recommend.ts:583-592,597-599`（终端注入 + floor） |
| C-2 | **终端是集 A 协议动作**（`data-act='free-input'`，零 `data-op`），不是 op | `cards/nextstep.ts:86-94`；`dispatch.ts:35-49`；`FREE_INPUT_LABEL='自由输入…'` `dispatch.ts:49` |
| C-3 | **未配置 ⇒ 提交走零 token 路径**：SW 返 `variant:'llm-unconfigured'`（**不发起 provider 调用**） | `background/service-worker.ts:945-956` |
| C-4 | **未配置 ⇒ 面板确定性引导**：`llm-unconfigured` 分支 → 折叠进 `risk`（`LLM_BLOCKED_RISK`）→ `nextAfterSettle({kind:'answered'})` → `llm.unconfigured` provider 产 `op.llm-config` op-direct chip | `sidepanel.ts:4167-4194`；`next-registry/providers.ts:52-61,131-141`（`OPS_RECOVERY_ROWS`）；`definition.ts:34-64`（`BLOCKED_TERMINALS` / `llm.unconfigured → null → op 驱动恢复`） |
| C-5 | **首开保持确定性**（PD-ADN-001 deferred）：`maybeRecommendOpenEntry` 复用 `'idle'`；首屏由 floor 铸「仅含终端」最小卡 | `sidepanel.ts:2279-2286`；`recommend.ts:506-517,585-592`；F-36 `plan.md` PD-ADN-001 |

**D. F-36 LLM 异常兜底（**无**，本轮复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| D-1 | **LLM 调用失败**：base runner 首次失败 push 纠错 user turn 重试一次，连续第二次 ⇒ `finish('llm-failed')` | `web-cli-base/src/runner.ts:107-117`（`handleLlmError`） |
| D-2 | **SW 结题只做「校验 + 装配」**：`onFinish` 无「LLM 未产 next ⇒ 提醒补一次」逻辑；`onLLMError` 只上报 | `background/service-worker.ts:1025-1043` |
| D-3 | **失败回合的 next**：只有面板 `variant:'error'` → `maybeRecommend('idle')`（确定性兜底） | `sidepanel.ts:4140-4152` |
| D-4 | **「LLM 始终给不出 next」无系统兜底推荐**：无「推荐配置新 LLM」等异常态推荐（`llm.unconfigured` 只在**未配置**时给出，非「配置了但坏了」） | `next-registry/providers.ts:52-61` 仅覆盖 `llm.unconfigured` / `perm.missing` |

**E. F-36 的上游底座（v5.5 / F-33 的 AI 驱动编排，本轮复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| E-1 | **AI 自动按下单源**：`pressCandidate`（铁律①「候选恒由注册表产出」）；`confirm`/`gesture` 恒拒 | `next-registry/ai-drive.ts:6-13,139-155`；`pressDecision` `:67-78` |
| E-2 | **答案后零按键自动成回合**：`driveAnsweredTurn` 经**既有** `op.turn` 槽抛回合 | `sidepanel.ts:2120-2145,2165+` |
| E-3 | **三档清分**（派生式）：`tierOf`（`layer==='sw'` ⇒ gesture；`hasConsent` ⇒ confirm；否则 auto） | `shared/op-table.ts:173-187`；9 op `:113-133` |
| E-4 | **护栏六常量** + 关断偏好 `web-cli:proactive` | `next-registry/guard.ts` |
| E-5 | **统一结算→时机入口**：`nextAfterSettle`（定义恰 1）；`maybeRecommend` 1 定义 + 8 调用点 | `sidepanel.ts:2137-2145,2039`；门禁 `test/op-wiring.test.ts` / `driver-timings` |

**F. ★ 关键发现：LLM 回合**已经支持函数调用（function calling）**，但插件**未接线**（本轮只读复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| F-1 | **基座 LLM 客户端支持 function calling**：`LlmToolDef{name,description,parameters}` + `WebCliToolCall{id,name,arguments}`；OpenAI `tools`/`tool_calls` 与 Claude `tool_use`/`tool_result` 双协议；`parseToolArguments` | `web-cli-base/src/llm.ts:23-75,82-197` |
| F-2 | **基座工具定义来自调用方注入**（模块头逐字「tools 由调用方组装注入（D-011 注册组装留 web）」） | `web-cli-base/src/llm.ts:6` |
| F-3 | **插件的 LLM 回合已在传工具**：`providerChat(cfg, turns, s.host.deriveTools())` | `background/service-worker.ts:986-991`；`llm/providers.ts:64-79` |
| F-4 | **基座 agent 循环逐轮执行 toolCalls**：assistant 的 `toolCalls` → 逐条 `dispatch` → tool 结果回填 → 下一轮；无 tool_calls ⇒ `finish('completed')` | `web-cli-base/src/runner.ts:140-190` |
| F-5 | **★ 基座有「dispatch 前拦截」缝 `hooks.intercept`**：返回 `ToolResult` 则**跳过 dispatch**；其文档注释**逐字点名先例**「**next-actions 胶囊由此接入**」 | `web-cli-base/src/runner.ts:50-55,158-164` |
| F-6 | **插件今天未 wire `intercept`**：`runChatTurn` 的 `hooks` 只传 `onToolDone`（无 `intercept`） | `background/service-worker.ts:1045-1059`（`hooks:{onToolDone}`） |
| F-7 | **工具注册面**（插件侧）：`router.register(entry)`；`deriveTools()` 返回路由器的工具集；插件级工具（admin / ask-user / browser / tabs / bookmarks / downloads…）均在此注册 | `background/host.ts:295-333,338-364,546-548` |
| F-8 | **工具目录 parity 门禁**：`host.deriveTools()` 的名字集对 `test/parity/baseline-catalog.json` 机核；新增工具需 `pluginExtra` 条目（reason + basis 非空） | `test/parity.test.ts:168,183-248`；`test/parity/baseline-catalog.json`；`test/parity/waivers.json` |

**G. F-36 的 plan 曾**显式考虑并否决**「tool-call 方案」（本轮复核，关键上下文）**

| # | 事实 | `file:line` |
|:-:|---|---|
| G-1 | **方案对比表**：「方案 A：复用 `chat-result` 加法字段 + **围栏块**（**推荐**）」 vs 「**方案 C：新增 tool-call（模型调「产 next」工具）**」；方案 C 缺点 = 「新增工具面（`toolCount` / 工具目录 / parity 契约全动）；改回合内驱动语义」 ⇒ **落选** | F-36 `plan.md:127-133` |
| G-2 | **PD-ADN-002**（协议形态）= 围栏块 + 严格 JSON；**PD-ADN-005** = 只在 `ref-action` 上下文 | F-36 `plan.md:287,290` |
| G-3 | **PD-ADN-001**（首开 AI 化）= deferred | F-36 `state.json#openPointsDeferred` |

**H. 体积 / 门禁 / 仓库基线（本轮实测 / 引用）**

| # | 事实 | `file:line` / 来源 |
|:-:|---|---|
| H-1 | 分支 `feature/web-cli-plugin` @ **`a75466a`**（F-36 收口 `103e981` 之后的 `chore: 配置 npm 源`） | 本轮 `git rev-parse` |
| H-2 | `sidepanel.js` 基线 **604,602 B**（F-36 后；本轮 `dist` 实测字节相等）；档位 **614,400**；距档 **9,798 B**；绝对上限 675,840；生效上限 `floor(604602×1.05)=634,832` | `test/size-baseline.ts:389`；本轮 `ls -l` |
| H-3 | `npm test` 基线 **1507**（F-36 收口自报；**本轮未复跑**） | F-36 `closeout.md` |
| H-4 | 新 node 门禁 `ai-next-candidate`（**AI-N-1 钉死围栏块解析**）；`CHROMIUM_GATES === 9` | `test/ai-next-candidate.test.ts:8,78` |
| H-5 | `content.js` 177,076 B / `pick-layer.js` 34,358 B（字节冻结红线，F-36 全程未动） | F-36 `closeout.md` |
| H-6 | **F-37 / v0.11.4 全仓零占用**（`*.md` / `*.json` / `*.ts` / `*.mjs`，排除 `node_modules` / `.git`） | 本轮 `grep -rIl` 实测 |
| H-7 | ROADMAP 文档版本 **1.33.0**（F-36 已登记 v0.11.3） | `.sddu/specs-tree-root/ROADMAP.md:3` |

### 0.3 本阶段边界（discovery 职责声明）

- **负责**：固化作者口径（逐字）；现状摸底（只读 `file:line`）；整理结构化问题清单；登记 F-36「保留 / 推翻 / deferred 转正」清单；给出命名 / 版本位 / 范围 in-out / 叶子拆分建议；登记开放点（附推荐）。
- **不负责**：不定义需求（不写「系统应支持 XXX」）、不分类 Must/Should/Could、不定义验收标准、不做方案评估与 ADR、不排任务、不改代码、**不决定 next 工具 schema / 提醒机制 / 异常判定 / 兜底推荐形态 / 围栏块去留**（= 开放点）。
- **本轮零产品运行时验证**：未跑 `npm test` / Chromium 门禁 / 构建；所有数字均来自**带 `file:line` 的源码、已入库产物与本轮只读复核**，未自造实测值。
- **纪律**：只读代码 + 只写本 Feature 目录（`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/**`）；不改生产代码 / 测试 / `dist` / ROADMAP；routing.v1 = `local_or_compute → none`（不调用受管 Provider）。

---

## 1. 问题定义

### 1.1 一句话问题陈述

> **F-36 把「next 交给 AI 驱动」的**原则**立住了，但把**机制**做偏了** —— 它用「**文本围栏块（```next）口述 + 解析**」代替了真正的**函数调用（next 工具）**；把触发范围**收敛到「有引用」上下文**（产出契约句只并入有引用分支，`ref-context.ts:97-100`），而不是「**对话结束**就由 LLM 驱动」；把「未配置 LLM」的 next 实现成**恒真的「自由输入」终端**（`providers.ts:217`），而不是「**系统驱动用户配置 LLM**」的确定性引导；并且**没有 LLM 异常兜底**（`service-worker.ts:1027-1043` 无「提醒补一次 → 系统兜底」）。** 作者已逐字纠正（§0.1）：「有配置 LLM 的时候，LLM 驱动；没有配置 LLM 的时候，系统驱动用户配置 LLM」。关键事实（§0.2-F）：**LLM 回合其实早就支持函数调用**（基座 `llm.ts` + `runner.ts` 的 `hooks.intercept` 缝，注释逐字点名「next-actions 胶囊由此接入」），**但插件今天没有接线** —— 这正是本 Feature 要补的机制落差。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---|---|---|
| **产出机制错位：用「围栏块口述」冒充「工具调用」（母问题）** | F-36 把「LLM 驱动 next」实现成「LLM 在**文本**里贴一个 ```next 围栏块、SW **正则解析**」（`ai-next.ts:58-87`）。这与作者口径「**如果 LLM 没有调用 next 工具**」直接冲突：**工具调用**（function calling）是模型的原生结构化通道，**文本围栏块**是「靠模型遵从提示词的软约定」。⇒ 可靠性差（不遵从 ⇒ 零候选）、无法用 schema 约束、与「回合内已有工具调用」能力**脱节**（§0.2-F：工具面早就在跑） | ① 产出**不稳定**（编成/JSON 违规/漏块 ⇒ 支线 C 兜底，AI 的价值兑现率低）；② 「**高可靠**」不成立 —— 作者价值锚「只有**准确无误、高可靠**的做到这些，all-in-chat/next 才是有意义、有价值的」**无法兑现** |
| **触发范围过窄：只在「有引用」上下文产出** | 产出契约句（`NEXT_CONTRACT_GUIDANCE`）**只并入有引用分支**（`refContextSegment` 无引用 ⇒ 返回 `''`，`ref-context.ts:97-100`）；`ai-next` provider 骑 `ref-action` 位（`providers.ts:162-175`）；plan 显式裁决 PD-ADN-005 = 「本轮只在 `ref-action` 上下文」（`plan.md:290`）。⇒ **无引用的普通对话回合结束后，LLM 根本不被提示产 next**，next 又退回确定性注册表 ⇒ 作者口径「**对话结束**如果 LLM 没有调用 next 工具」的**无条件**语义落空 | 绝大多数**无引用**对话（日常问答）结束后，next 层仍是确定性规则（陈旧的 capability-discovery / ref-action 兜底），AI 驱动**在有引用时才生效** ⇒ 与「有配置 LLM 就 LLM 驱动」原则**同构地冲突** |
| **未配置 LLM 路径错位：恒真「自由输入」终端** | `free-input` provider `when` 恒真（`providers.ts:217`），⇒ **未配置 LLM 时，推荐卡末端仍显示「自由输入…」**。但作者口径②逐字：「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」（§0.1）——无 LLM 处理输入，自由输入点了也走零 token 的 `llm-unconfigured` 返场（`service-worker.ts:945-956`），是**不可行的死路** | 未配置用户被**引导点击一个不可行的入口**（自由输入 ⇒ 提交 ⇒ 只得到「未配置」）⇒ 体验上是「点了没用」；正确口径应是**明确、单一的确定性引导**（去配置 LLM），把用户推向真正的解锁动作 |
| **LLM 异常兜底缺位：无「提醒 → 系统兜底」链** | F-36 的 `onFinish` 只「校验 + 装配」（`service-worker.ts:1027-1043`）；LLM 未调用工具（文本围栏块未出现）⇒ **静默零候选** ⇒ 退回确定性兜底；LLM **坏了**（连续失败 ⇒ `finish('llm-failed')`，`runner.ts:107-117`）⇒ 面板只 `maybeRecommend('idle')`（`sidepanel.ts:4140-4152`）。**没有**作者口径①要求的「**提醒 LLM 补一次**」与「**仍失败 ⇒ 系统兜底推荐配置新 LLM**」（`§0.2-D`） | ① AI 偶尔「忘了」产 next 时，用户**得不到 AI 的真实建议**（白丢一次机会）；② LLM 坏掉时，next 层**没有指向修复动作**的推荐（用户不知道「该去配置/切换新 LLM」）⇒ 破「无死端」精神 |
| **F-36 的「保留资产」面临误伤风险** | F-36 建了不少**正确的安全/兜底资产**：5 道校验链（`ai-next.ts:98-158`）、`admitCandidate` vs `pressDecision` 分层、`tierOf` 单源复用、`chat-result.aiNext` type-only 加法字段、确定性退居兜底、free-input 终端恒常驻（R8 不回归）、R6 同因去重扩展。⇒ 本 Feature **只修正「机制/触发/未配置/异常」四点**，**必须保留**这些资产（否则会把 F-36 的正确部分一起推倒，造成回归） | 若「推翻围栏块」时**连带推翻**校验链/分层/合并口径，则 AI 候选**重新裸露**于幻觉 op / 特权 op ⇒ 破安全红线；若「未配置不显示自由输入」时**连带**把已配置场景的终端也去掉 ⇒ 破 R8/F-35 的「流内输入即 next」成果 |

### 1.3 本 Feature 范围（**问题域描述，非需求**）

| # | 主题 | 性质 | 来源 | 目标态（**问题域描述**） |
|:-:|---|---|---|---|
| 核心 1 | **产出机制换轨：围栏块口述 → `next` 工具（function calling）** | 产出载体 | 作者口径①（「没有调用 next 工具」）+ §0.2-F | next 候选由 **LLM 通过工具调用**产出（工具 schema 保证结构），**不再**靠文本 ```next 围栏块口述 + 解析；SW 经既有 `hooks.intercept` 缝**捕获**工具调用参数（零新增 kind / 零新增消息） |
| 核心 2 | **触发范围无条件：只要配置 LLM，对话结束就由 LLM 驱动** | 触发条件 | 作者原则 + 口径①（「**对话结束**如果 LLM 没有调用 next 工具」） | 产出提醒/工具**无条件**下发给已配置 LLM（不再只在有引用分支；不再骑 `ref-action` 规则位独占）；无引用回合结束也走 AI 驱动 |
| 核心 3 | **未配置 LLM：确定性「去配置 LLM」引导（自由输入不可行、不显示）** | 未配置路径 | 作者口径② | 未配置 ⇒ next = **确定性操作**（去配置 LLM），**不显示自由输入终端**（无 LLM 处理输入）；确定性引导须明确、单一、可行 |
| 核心 4 | **LLM 异常兜底链：提醒补一次 → 仍失败 ⇒ 系统兜底推荐** | 兜底 | 作者口径① | ① LLM 未调用 `next` 工具 ⇒ **提醒 LLM 补一次**（最后兜底）；② LLM 始终给不出（坏了/异常）⇒ **系统给出兜底推荐**（推荐用户配置新的 LLM 等确定性操作） |
| 保留 1 | **F-36 5 道校验链 / 判定分层 / 三档清分** | 安全资产（保留） | §1.2 保留资产 | opId 在册 / gesture 恒拒 / ref 有效 / param 相容 / 丢弃+留痕 逐条保留；`admitCandidate` vs `pressDecision` 分层保留 |
| 保留 2 | **确定性退居兜底 + free-input 终端（已配置时）+ R8 floor** | 兜底资产（保留） | §1.2 保留资产 + R8 | 未配/AI 未产出/AI 非法 ⇒ 确定性接管；**已配置**时 free-input 终端仍恒常驻（R8/F-35 不回归）——**与核心 3 的「未配置不显示」不矛盾**（口径按「是否配置 LLM」分相） |
| 附带 1 | **围栏块通道的去留** | 通道收敛 | §0.2-A/G | 围栏块解析（`ai-next.ts:58-87`）是**替换**还是**保留为兼容**？——**开放点 O-NDA-006**（推荐：替换，单一产出通道，避免双通道漂移） |
| 附带 2 | **门禁重锚 + 体积分列预算** | 门禁/体积 | §0.2-H | `ai-next-candidate`（AI-N-1 钉死围栏块解析）须替换/重锚；`parity`（新增工具 ⇒ `pluginExtra` + `baseline-catalog.json`）；`op-wiring` / `driver-timings` / `driver-quadruple` / `recommendation-sources` 逐条重锚；距档 **9,798 B**（604,602 / 614,400）分列预算 |
| 附带 3 | **与 `op.turn` 槽 / `ai-drive` 的关系** | 机制耦合 | §0.2-E | 本 Feature 只动「**产出** next 候选」；`pressCandidate` / `driveAnsweredTurn` / `op.turn` 槽语义**diff=0**（按下 / 成回合不动） |
| 附带 4 | **首开（open）边界（PD-ADN-001 转正候选）** | 首屏 | F-36 PD-ADN-001 | F-36 把「首开 AI 化」**deferred**；本 Feature 若「未配置 ⇒ 系统驱动配置 LLM」触及首开，则 PD-ADN-001 可能**转正** —— 开放点 O-NDA-009 |
| 附带 5 | **留痕 / driver 声明** | 留痕 | §0.2-A8/A11 | next 工具调用产出的候选，driver 声明 / 留痕（`driver=… \| timing=… \| evidence=…`）须与 F-36 同形态（零明文、可判） |

### 1.4 非目标（**明确排除**）

| 非目标 | 理由 |
|---|---|
| **改动 `pressCandidate` / `driveAnsweredTurn` 的自动按下或自动成回合语义** | v5.5 已闭环（E-1/E-2）；本 Feature 只改「**产出** next 候选」的机制与触发，按下 / 成回合 **diff=0** |
| **改动三档清分档位定义（`tierOf` / `OP_TIER_TABLE`）** | 派生式单源（E-3）；本 Feature 只**接入**该闸 |
| **改动护栏六常量阈值（`guard.ts`）** | 单源（E-4）；本 Feature 只接线 / 复用，不新增第二份阈值 |
| **改动 LLM 回合内的其它工具 / 命令驱动语义** | v5.5 已建；本 Feature 只**新增一个 `next` 工具**（结构化产出通道），不动既有工具行为 |
| **改动基座 `packages/web-cli-base/**`** | 硬红线（`insight-no-escalation.test.ts` 机核零 diff）；本 Feature **只复用**基座的 function calling + `hooks.intercept` 缝，**不改基座** |
| **F-36 / F-35 / F-34 / F-33 / R8 / v5 / v4 产物改写** | 本 Feature 为**并列新主题**（后续轮）；F-36 已 `validated/completed`，**不回头改**，以新 Feature 承载 + 显式取代登记（§7） |
| **`src/content/**`（`content.js` 177,076 B）/ `pick-layer.js`（34,358 B）语义改动** | 字节冻结红线（零容差） |
| **判定链（`security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面** | 硬底线（内容哈希 pin） |
| **新增消息 kind / 卡 kind / 新宿主** | 零新增 kind / 零宿主纪律（F-36 A-5/A-6 已用 type-only 加法字段达成） |
| **特权 op（`op.authorize` / `op.perm.request`）发起方式 / AI 代答 consent** | 红线：特权 op 恒 gesture、AI 不可代答（E-1/E-3） |
| **法八（零明文）放宽** | `law8` 门禁必绿；候选文本 / 留痕不得把明文写进流内 payload / digest / 审计 / DOM 四面 |
| **F-29（A2A 候选）** | 未立项未排期，保持原样不动 |

---

## 2. 用户画像

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2/v3/v4/v4.5/v5/v5.5/v5.5.1/F-35/F-36 同一事实基础。**本报告不编造用户调研数据**；「用户原话」栏引用 §0.1 作者裁决逐字与代码事实。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 当前应对方式 |
|---|---|---|---|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏（`platform.deepseek.com`）：一个**无引用**的普通对话回合刚结束 | F-36 的产出契约句只并入有引用分支（`ref-context.ts:97-100`）⇒ **无引用时 LLM 未被提示产 next** ⇒ next 退回确定性注册表。作者口径（逐字）：「**对话结束**如果 LLM 没有调用 next 工具……」——**「对话结束」是无条件的** | 本轮立法：**触发范围改为无条件**（核心 2） |
| **作者（已配置 LLM，AI 偶尔没产 next）** | 回合结束，但 LLM 没走 `next` 工具（F-36 里是没贴围栏块） | 作者口径（逐字）：「如果 LLM 没有调用 next 工具，**记得你要提醒 LLM，做好最后兜底**」——现状**无提醒机制**（`service-worker.ts:1027-1043` 只校验装配） | 本轮立法：**提醒 LLM 补一次**（核心 4 ①） |
| **作者（已配置 LLM，但 LLM 坏了 / 异常）** | 某回合 LLM 连续失败（`finish('llm-failed')`）或始终给不出 next | 作者口径（逐字）：「LLM **始终无法给你 next（LLM 坏了等情况）**，那就应该由**系统给出兜底的推荐，推荐用户配置新的 LLM 等操作**」——现状**无「配置新 LLM」兜底推荐**（`llm.unconfigured` 只覆盖「未配置」） | 本轮立法：**系统兜底推荐**（核心 4 ②） |
| **作者（未配置 / 冷启动场景）** | 未配 LLM：推荐卡末端仍显示「自由输入…」终端 | 作者口径（逐字）：「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」。现状 `free-input.when` 恒真（`providers.ts:217`）⇒ 未配置也显示自由输入 ⇒ 点了走零 token `llm-unconfigured` 返场 ⇒ **不可行** | 本轮立法：**未配置 ⇒ 确定性「去配置 LLM」引导，不显示自由输入**（核心 3） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「next 是怎么被产出的？」 | 现状答案 = **两套机制并存**：① 确定性注册表（11 行）② 文本围栏块口述 + SW 正则解析（`ai-next.ts:58-87`）。F-36 plan 里「tool-call 方案」被**显式否决**（`plan.md:127-133`）⇒ 「next 工具」无处安放 | 服从既有形态（**扩张被「围栏块协议」锁死**）——与 v5 的 `Q-ALLN-003`、v5.5 的 `Q-SELF-015`、F-36 的 `Q-ADN-002` 同构，但层次再进一步：**本 Feature 是「next 的产出机制本身用错了 LLM 能力」** |

---

## 3. 问题清单

> 编号空间 `Q-NDA-###`（NDA = Next-Drive Accuracy）。核心 / 次要 / 潜在按「影响面 × 影响深度 × 影响频率」分级；每条标注信息来源（源码 `file:line` / 作者裁决 / 现状复核 / 假设）。

### 3.1 F-36 四处偏颇（**本 Feature 要修正的，已与作者确认**）

> **口径说明**：立项标题的「**两处偏颇**」指**机制级**两处（**产出机制** + **触发范围**，即 Q-NDA-002 / Q-NDA-003）；下表**四处**为逐维度完整清单（另含**未配置路径** + **异常兜底**两处口径级偏颇）。二者不矛盾：两处为机制根因，四处为完整维度。

| 维度 | F-36 现状（`file:line`） | 正确口径（作者） | 问题编号 |
|---|---|---|---|
| **产出机制** | 文本「尾随 `next` 围栏块 + 严格 JSON」口述 + 解析（`ref-context.ts:52-59`；`ai-next.ts:58-87`） | **`next` 工具**（function calling / tool schema），LLM 通过工具调用产出候选 | Q-NDA-002 |
| **触发范围** | 只在有引用（ref-action 上下文）产出（`ref-context.ts:97-100`；`providers.ts:162-175`；`plan.md:290` PD-ADN-005） | **无条件**：只要配置 LLM，**对话结束**就由 LLM 驱动 | Q-NDA-003 |
| **未配置 LLM 的 next** | 「自由输入」确定性终端（`providers.ts:217` 恒真） | 「**去配置 LLM**」确定性引导（自由输入不可行，**不显示**） | Q-NDA-004 |
| **LLM 异常兜底** | 无（`service-worker.ts:1027-1043`；`sidepanel.ts:4140-4152`） | **提醒 LLM** → 仍失败 → **系统兜底推荐**「配置新 LLM」 | Q-NDA-005 |

### 3.2 核心问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-NDA-001** | **母问题：next 的产出机制与「LLM 驱动」原则脱钩（用错了 LLM 能力）。** F-36 把「LLM 驱动 next」实现成「**文本围栏块软约定 + 正则解析**」（`ai-next.ts:58-87`），而 LLM 回合**本就有**原生结构化通道 —— **函数调用（function calling）**（§0.2-F：`llm.ts:23-75` + `runner.ts:50-55,140-190` + 插件已传 `deriveTools()` `service-worker.ts:986-991`）。作者口径逐字点出「**没有调用 next 工具**」（§0.1）⇒ 产出载体应是**工具**。⇒ F-36 的「AI 驱动 next」在机制上**不可靠**（依赖模型遵从提示词的软约定），「**准确无误、高可靠**」的价值锚无法兑现。 | 全部 next 产出；深度 = **核心阻碍**（机制级）；频率 = 每次回合结束 |
| **Q-NDA-002** | **产出机制错位：文本围栏块 ≠ 工具调用。** 证据链：① 产出契约是**自然语言提示句**（`NEXT_CONTRACT_GUIDANCE`，`ref-context.ts:52-59`）；② 解析是**三反引号正则 + `JSON.parse`**（`FENCE`，`ai-next.ts:58-87`）；③ F-36 plan **显式否决**了「方案 C：tool-call」并选「方案 A：围栏块」（`plan.md:127-133`）。⇒ 结构无 schema 保证、不遵从 ⇒ 零候选、与回合内既有工具面**脱节**。**对照事实**：基座 `hooks.intercept` 缝的注释**逐字点名先例**「**next-actions 胶囊由此接入**」（`runner.ts:51,158`）——历史上正是用工具调用承载 next 的；插件今天**未 wire**（`service-worker.ts:1045-1059` 只 `onToolDone`）。 | 全部 AI next 产出；深度 = **核心阻碍**；频率 = 每次 AI 提案 |
| **Q-NDA-003** | **触发范围过窄：只在「有引用」上下文产出。** 产出契约句只并入有引用分支（`refContextSegment` 无引用 ⇒ `''`，`ref-context.ts:97-100`）；`ai-next` provider 骑 `ref-action` 位（`providers.ts:162-175`）；plan 显式裁决 PD-ADN-005 = 「本轮只在 `ref-action` 上下文」（`plan.md:290`）。⇒ **无引用的普通对话结束后 LLM 不被提示产 next**，重落确定性注册表 ⇒ 破「**对话结束**（无条件）」语义。 | 全部无引用回合；深度 = **核心阻碍**（原则落空）；频率 = 每次无引用回合结束 |
| **Q-NDA-004** | **未配置 LLM 路径错位：恒真「自由输入」终端。** `free-input.when` 恒真（`providers.ts:205-221`）⇒ 未配置 LLM 时推荐卡**仍显示「自由输入…」**。作者口径②逐字：「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」。可行性事实：未配置提交走 `variant:'llm-unconfigured'`（**零 token，不发起调用**，`service-worker.ts:945-956`）⇒ 自由输入**点了无结果**（不可行）。现状**已有**确定性引导底座（`llm.unconfigured` risk → `op.llm-config` chip，`sidepanel.ts:4167-4194`；`providers.ts:52-61`），但**被恒真终端稀释**（未配置也显示自由输入）。 | 未配置 / 冷启动场景；深度 = **核心阻碍**（引导用户点死路）；频率 = 每次未配置 |
| **Q-NDA-005** | **LLM 异常兜底链缺位。** 作者口径①逐字：「如果 LLM 没有调用 next 工具，**记得你要提醒 LLM，做好最后兜底**，如果 LLM **始终无法给你 next（LLM 坏了等情况）**，那就应该由**系统给出兜底的推荐，推荐用户配置新的 LLM 等操作**」。现状：① `onFinish` 只「校验 + 装配」，**无提醒**（`service-worker.ts:1027-1043`）；② LLM 连续失败 ⇒ `finish('llm-failed')`（`runner.ts:107-117`），面板只 `maybeRecommend('idle')`（`sidepanel.ts:4140-4152`），**无「配置新 LLM」推荐**（`llm.unconfigured` 只覆盖「未配置」，不覆盖「配置了但坏了」）。 | 全部 AI 未产出 / LLM 异常回合；深度 = **高**（无死端精神 + 可靠性）；频率 = 每次 AI 漏产 / LLM 失败 |
| **Q-NDA-006** | **F-36 正确资产的误伤风险（回归面）。** F-36 建了正确的安全/兜底资产：5 道校验链（`ai-next.ts:98-158`）、`admitCandidate` vs `pressDecision` 分层、`tierOf` 单源复用（`op-table.ts:173-187`）、`chat-result.aiNext` type-only 加法字段（`chat-events.ts:49-72` / `definition.ts:100-113`）、确定性退居兜底、free-input 终端恒常驻（R8）、R6 同因去重扩展（`recommend.ts:134-169`）。⇒ 本 Feature **换产出机制**时，**必须保留**这些资产（校验链、分层、合并口径、兜底），**只推翻**围栏块协议 / 有条件触发 / 未配置自由输入 / 无异常兜底四点。 | 全部 next 安全面；深度 = **高**（安全 + R8 回归）；频率 = 一次性 |
| **Q-NDA-007** | **`next` 工具的 schema 与落点未定（结构核心）。** 工具需 `LlmToolDef{name,description,parameters}`（`llm.ts:61-75`）。候选结构（`{opId,label,ref?,params?}`，`definition.ts:100-105`）需落成 JSON-schema。**落点事实**：① 工具注册 = 插件侧 `router.register(entry)` / `deriveTools()`（`host.ts:295-333,546-548`）；② 捕获 = 基座 `hooks.intercept(tc, commandText)`（返回 `ToolResult` 则跳过 dispatch，`runner.ts:50-55,158-164`）；③ 插件今天**未 wire intercept**（F-6）。⇒ schema 形态 / 注册模块 / intercept 接线 / 与既有工具面共存，全部待定。 | 产出通道实现面；深度 = **高**（决定机制可行）；频率 = 一次性 |
| **Q-NDA-008** | **「提醒 LLM 补一次」的机制无既有先例（兜底核心）。** 基座 agent 循环在 assistant **无 tool_calls** 时即 `finish('completed')`（`runner.ts:186-190`）——**没有**「回合完成后可再注入一轮」的钩子。⇒ 「提醒 LLM 补一次」需**插件侧**设计（新增一轮带 nudge 的 `runChatTurn`？在 `onFinish` 后触发二次回合？）。**有界性 / 防环**（与既有 `proactivity` 护栏、`driveAnsweredTurn` 的事件作用域纪律）必须明确。 | 兜底链实现面；深度 = **高**（可靠性的「最后兜底」）；频率 = 每次 AI 漏产 |
| **Q-NDA-009** | **LLM 异常的判定口径未定。** 「LLM 始终无法给你 next（**LLM 坏了等情况**）」需可判：① 「未调用工具」= 回合正常结束但无 `next` 工具调用；② 「坏了」= `finish('llm-failed')` / 连续失败（`runner.ts:107-117`）/ 输出非法被校验链全拦。⇒ 三者判定面 / 退避 / 与 `noteLlmBlockedFact` 的关系待定（避免与既有 `llm.unconfigured` 词表漂移）。 | 兜底触发面；深度 = **中高**；频率 = 每次异常 |
| **Q-NDA-010** | **系统兜底推荐的形态未定。** 作者口径：「系统给出兜底的推荐，**推荐用户配置新的 LLM 等操作**」。⇒ 是复用 `op.llm-config`（既有配置引导 op，`op-table.ts:120`）/ 新增推荐行 / 指向「切换 provider」？与既有 `OPS_RECOVERY_ROWS`（`providers.ts:52-61`）的关系待定。 | 兜底推荐面；深度 = **中高**；频率 = 每次 LLM 异常 |
| **Q-NDA-011** | **围栏块通道的去留未定。** `ai-next.ts:58-87` 的围栏块解析是**直接替换**还是**保留为兼容兜底**？⇒ 单一产出通道（避免双通道漂移）vs 向后兼容。**「零新 LLM 往返」契约**（F-36 A-4：复用同一次回合输出）在换成工具后**仍成立**（工具调用就在同一次回合内），须复核。 | 通道收敛面；深度 = **中高**；频率 = 一次性 |
| **Q-NDA-012** | **门禁重锚 + `parity` 目录成本。** ① 新 node 门禁 `ai-next-candidate` 的 **AI-N-1 钉死围栏块解析**（`test/ai-next-candidate.test.ts:8,78`）⇒ 换机制必破，须替换/重锚；② **新增工具** ⇒ `test/parity.test.ts:168,183-248` 对 `baseline-catalog.json` 的 `pluginExtra` 需新增条目（reason + basis），`toolCount` / 目录动；③ `op-wiring`（`maybeRecommend 1/8` / `nextAfterSettle 1/10` / `requestTurn(` 恰 1）、`driver-timings`（恰 5 / 恰 8）、`driver-quadruple`（双向包含 12↔12）、`recommendation-sources`（真值 7 / 模块 5 / `NEXTSTEP_PRIORITY` 恰 4 / 零新 LLM）逐条重锚；④ 若提醒机制新增回合 ⇒ `requestTurn` / 调用点计数可能动。 | 门禁面；深度 = **高**；频率 = 一次性 |
| **Q-NDA-013** | **体积分列预算（换机制 + 新增工具 + 兜底链）。** 距档 **9,798 B**（604,602 / 614,400，`size-baseline.ts:389`）。本 Feature 触：新工具 def + intercept 接线 + schema + 兜底链 + 提醒轮。⇒ 解析/校验/兜底的**执行位置**（SW vs 面板——B 列优先）与**分列预算**须先出（承 F-36 `ADR-ADN-008` 的 A/B/C 分列；v5 plan 低估 2.8× 教训）。 | 体积门禁；深度 = **中高**；频率 = 每轮 |

### 3.3 次要问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-NDA-014** | **已配置场景的 free-input 终端「不回归」。** 核心 3「未配置不显示自由输入」**不得**波及已配置场景：已配置时 free-input 终端仍须恒常驻（R8/F-35 成果，`providers.ts:205-221` + `recommend.ts:583-592`）。⇒ 「是否配置 LLM」成为终端显示的分相依据（**新增一个分相维度**，须有单源判据，不写第二份偏好）。 | 已配置场景；深度 = 中高；频率 = 每张推荐卡 |
| **Q-NDA-015** | **`ai-next` provider 的规则位去留。** F-36 让 `ai-next` **骑 `ref-action` 规则位**（`providers.ts:162-175`）。触发改为**无条件**后，是否仍骑该位（⇒ 无引用时该位为假，AI 候选无处落）还是**新规则位 / 独立通道**？⇒ `NEXTSTEP_PRIORITY` 恰 4（`recommend.ts:60`）可能被破 ⇒ 门禁重锚（X-NDA）。 | 规则位面；深度 = 中高；频率 = 一次性 |
| **Q-NDA-016** | **候选来源与「回合内工具面」的关系。** `next` 工具是**唯一新增工具**（`toolCount` 动，`parity` 动）；它**不执行页面动作**（纯结构化产出通道），须与「工具=动作」的既有语义区分（对照：`ask-user` 是纯问答工具先例，`ask-user.ts`）。⇒ 「next 工具」的 dispatch 语义（`intercept` 捕获后返回 ok 的合成 `ToolResult`）须明确，**不得**触达真实写。 | 工具语义面；深度 = 中高；频率 = 一次性 |
| **Q-NDA-017** | **留痕 / driver 三要素扩展。** next 工具产出的候选的 driver 声明与留痕须与 F-36 同形态：`driver=<id> \| timing=<时机> \| evidence=<字段名>`（`ai-drive.ts:85`）；`DRIVER_DECLS_SRC` 是**手写第二源**，与 provider 集合双向包含（`providers.ts:247`；门禁 DQ-1）。⇒ 若新增 provider / 驱动者 / 改 evidence 面，须同步登记声明行（零明文、可判）。 | 留痕 / 门禁；深度 = 中；频率 = 一次性 |
| **Q-NDA-018** | **法八（零明文）口径保持。** 候选 `label` / `ref` / `params` 若含正文 / 页面明文 ⇒ 撞法八四面。既有先例：`driverTraceLine` 只含**字段名不含值**（`ai-drive.ts:85`）；`assertNoPlaintext` 预筛（`ai-next.ts:126-132`）。⇒ 换工具后 label 净化 / 截断口径须保持（含 `AI_NEXT_LABEL_MAX` 先扫后截）。 | 安全；深度 = 中；频率 = 每次候选 |
| **Q-NDA-019** | **首开（open）与 AI next 的让位关系。** F-36 首开保持确定性（PD-ADN-001 deferred）；本 Feature 若「未配置 ⇒ 系统驱动配置 LLM」触及首开，须与 `firstRun` 让位语义一致（零双卡，`sidepanel.ts:2282-2283`）。 | 首装 / 首屏；深度 = 中；频率 = 每次首开 |

### 3.4 潜在问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-NDA-020** | **法一 / 法七 / 法九一致性。** 法一「一切交互皆消息」（新增工具是否动法一载体？—— 工具调用是回合内消息，不是新 kind）；法七「禁止死端」（未配置不显示自由输入 ⇒ 须保证「去配置 LLM」可达）；法九「范围读数」（无引用回合 AI 候选的 ref 语义）。⇒ 三者逐条对齐。 | 立法；深度 = 中；频率 = 一次性 |
| **Q-NDA-021** | **「提醒补一次」的防环 / 有界性。** 提醒轮若再失败 ⇒ 是否再提醒（**须有界**，一次）；与既有 `proactivity` 护栏（六常量 / 事件作用域）关系须明确。 | 并发 / 有界；深度 = 中高；频率 = 每次 AI 漏产 |
| **Q-NDA-022** | **AI 候选可判性（LLM 输出不确定）。** 换工具后门禁仍**不能直接断言**「LLM 调用了 next 工具」；判据须落**纯函数**（schema 校验 / 5 道链 / intercept 捕获逻辑）+ 注入式反证（承 F-36「注入反证族」先例）。 | 门禁可测性；深度 = 中；频率 = 一次性 |
| **Q-NDA-023** | **环境性 flake 家族被误读为回归（`KL-N-10`）。** F-36 段登记 `s0-self-driven` / `recommendation` / `binding` 相位 flake；本 Feature 触 `recommendation` / `s0-self-driven` / parity 面较深 ⇒ 重构轮须隔离复跑 ≥2、不伪称首跑绿。 | 门禁执行；深度 = 低—中；频率 = 每轮 |
| **Q-NDA-024** | **外部竞品调研未执行（如实登记）。** 未做外部对标（如「AI 助手如何用 function calling 产出可点击下一步」「LLM 异常时的兜底引导形态」）。 | 参照面；深度 = 低；频率 = 一次性 |

---

## 4. 竞品参考

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

**未做**外部竞品调研。v5.5 / F-34 / F-35 / F-36 段亦未新增外部对标（`O-SELF-007` / `O-SGO-009` / `O-IAN-010` / `O-ADN-015`）。

> **不得**据此声称「竞品也这么做」或「无竞品这么做」。若 spec/plan 认为需要外部参照，应显式登记为待调研项（**O-NDA-011**）。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

| 参照 | 事实 | 与本题域的关系（只述差异，不评优劣） |
|---|---|---|
| **★ 基座 function calling（已存在，待复用）** | `LlmToolDef` schema + OpenAI `tools`/`tool_calls` / Claude `tool_use`/`tool_result`（`llm.ts:23-75,82-197`）；插件已传 `deriveTools()`（`service-worker.ts:986-991`） | 「next 工具」的**机制底座已就位**；差异：今天**没有** `next` 工具，next 靠文本围栏块 |
| **★ `hooks.intercept`（已存在，待接线）** | dispatch 前拦截缝；注释逐字「**next-actions 胶囊由此接入**」（`runner.ts:51,158`） | 捕获 `next` 工具调用**恰是该缝的设计用途**；差异：插件今天**未 wire**（F-6） |
| **`ask-user` 纯协议工具先例** | `ask-user` 是任务内澄清工具（问答，不写页面）；无 responder ⇒ 可读禁用态（`ask-user.ts:2,65-71`） | 「next 工具」可**同构**为「纯结构化产出、不执行动作」的工具；差异：`ask-user` 的属性在既有工具面，`next` 需新增 |
| **5 道校验链（已存在，待保留）** | `admitCandidate`：opId 在册 → `tierOf`（gesture 恒拒）→ ref → param → label（`ai-next.ts:98-143`） | 换机制后**校验链可整体保留**（输入从「围栏块解析项」变为「工具调用参数项」）；差异：仅**上游来源**变化 |
| **`type-only` 加法字段先例** | `chat-result.aiNext?`（`chat-events.ts:49-72`）/ `NextCtx.session.aiNext?`（`definition.ts:135`） | 换机制后**载荷面可保持**（`aiNext` 字段照旧，填入工具调用捕获的候选）；差异：无 |
| **确定性退居兜底 + R8 floor** | 未配/AI 未产出/AI 非法 ⇒ 注册表接管；free-input 终端恒常驻 + 首开 floor（`recommend.ts:506-517,583-592`） | 兜底面**已就位**；差异：未配置时的终端显示分相（核心 3）需新增判据 |
| **`ok.llm-config` 配置引导 op（已存在）** | `op.llm-config`（`op-table.ts:120`，`confirm` 档，`ask:'choice'`）；`llm.unconfigured` risk ⇒ 产该 chip（`providers.ts:52-61`） | 「系统兜底推荐配置新 LLM」**有 op 可落**；差异：今天只在「未配置」触发，未覆盖「配置了但坏了」 |
| **`driverTraceLine` / `driverBlockedLine` 留痕（零明文）** | `driver=<id> \| timing=… \| evidence=…`（只含字段名，`ai-drive.ts:85`）；`blocked=`（`:123-125`） | 留痕形态可**复用**；差异：evidence 面须与工具机制同源 |
| **`parity` 工具目录门禁** | `deriveTools()` 名字集对 `baseline-catalog.json`；新增工具需 `pluginExtra`（reason+basis）（`parity.test.ts:168,183-248`） | 新增 `next` 工具 = **一道已知的门禁成本**（F-36 plan 方案 C 曾据此判「成本高」）；差异：事实，非阻却 |

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| A-NDA-001 | 基座 function calling 机制（`llm.ts` `tools`/`tool_calls` + `runner.ts` 工具循环）**可直接复用**，无需改基座 | 已证（只读：`llm.ts:82-197` + `runner.ts:140-190`；基座红线段**只复用不改**） |
| A-NDA-002 | `hooks.intercept` 缝可用于**捕获** `next` 工具调用并**跳过**真实 dispatch | 已证（缝存在：`runner.ts:50-55,158-164`；插件未 wire = 待接线） |
| A-NDA-003 | `next` 工具可作为**纯协议工具**注册（不执行页面动作） | 部分已证（`ask-user` 先例；须确认 intercept 返回合成 `ToolResult` 即可闭环） |
| A-NDA-004 | 5 道校验链可**整体保留**（输入改为工具参数项） | 部分已证（校验链是纯函数，与上游载体解耦：`ai-next.ts:98-158`） |
| A-NDA-005 | 「无条件触发」不需要新增时机源（仍可复用 `idle` = 回合结题） | 待验证（F-36 已复用 `idle`；本 Feature 只改**触发条件**不改**时机词**） |
| A-NDA-006 | 「未配置不显示自由输入」不影响已配置场景（分相可行） | 待验证（须新增「是否配置」判据；`free-input.when` 目前恒真） |
| A-NDA-007 | 「提醒补一次」可在插件侧实现且有界 | 待验证（基座无回合后钩子；须设计，见 O-NDA-004） |
| A-NDA-008 | F-36 正确资产可保留而不被换机制误伤 | 待验证（须逐条列「保留 / 推翻 / 转正」清单，§7） |
| A-NDA-009 | 冻结面零触碰（`content.js` / `pick-layer.js` / 基座 / `KIND_SET` 40） | 待验证（本 Feature 动 SW + 面板 + 工具注册面，须逐条守线） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| R-NDA-001 | 换机制时**误伤** F-36 校验链 / 分层 / 合并口径 ⇒ AI 候选裸奔（幻觉 op / 特权 op）或 R8 回归 | **高** |
| R-NDA-002 | 「提醒补一次」引入**自触发环**或破 `proactivity` 有界性 | **高** |
| R-NDA-003 | 「未配置不显示自由输入」误波及**已配置**场景 ⇒ 破 R8/F-35 的流内输入成果 | **高** |
| R-NDA-004 | 新增 `next` 工具撞 **`parity` 工具目录门禁**（`pluginExtra` / `baseline-catalog.json` / `toolCount`） | **中高** |
| R-NDA-005 | `ai-next-candidate` 门禁（AI-N-1 钉死围栏块）**须替换** ⇒ 门禁静默降强度 | **高** |
| R-NDA-006 | 体积越档位（距档 9,798 B；新工具 + 兜底链 + 提醒轮） | **中高** |
| R-NDA-007 | 「无条件触发」破 `NEXTSTEP_PRIORITY 恰 4` / `driver-timings 恰 5` 等既有计数（须等价重锚） | **中高** |
| R-NDA-008 | 工具 schema 与候选结构（`{opId,label,ref?,params?}`）不一致 ⇒ 校验链入口漂移 | **中高** |
| R-NDA-009 | 法八零明文被工具参数 / 留痕撞破 | **中高** |
| R-NDA-010 | 「LLM 坏了」的判定与既有 `llm.unconfigured` 词表漂移（第二词表） | **中** |
| R-NDA-011 | 门禁无法断言不确定的 LLM 工具调用（可判性） | **中** |
| R-NDA-012 | 环境性 flake 被误读为回归（KL-N-10） | **低—中** |
| R-NDA-013 | 方案先行（未定开放点被 spec 之前擅自裁定） | **中高** |

---

## 6. 立项基线

### 6.1 命名 / 版本位（建议）

| 项 | 建议 | 依据 / 实测 |
|---|---|---|
| **Feature 编号** | **F-37** | 承 F-33~F-36 顺延；**本轮实测 `F-37` 全仓零命中**（H-6） |
| **版本位** | **v0.11.4**（v0.11.0（F-33）主题的 patch 级跟进轮，承 F-34 v0.11.1 / F-35 v0.11.2 / F-36 v0.11.3） | **本轮实测 `v0.11.4` 全仓零命中**（H-6） |
| **树名（推荐）** | `specs-tree-web-cli-plugin-v55-f-next-drive-accuracy` | 承 `v55-f-` 惯例（F-34/F-35/F-36）；语义 = 「next 驱动机制的准确落地」（正文口径 = 有配置 LLM ⇒ LLM 驱动；无配置 ⇒ 系统驱动配置 LLM） |
| **树名（备选 1）** | `specs-tree-web-cli-plugin-v55-f-ai-next-via-tool` | 强调「产出机制换轨 = 工具调用」 |
| **树名（备选 2）** | `specs-tree-web-cli-plugin-v55-f-llm-next-driver-accuracy` | 强调「LLM 驱动/系统驱动 的原则落地」 |
| **版本名（建议）** | 「**next 驱动机制的准确落地（function-calling 换轨 + 双相兜底）**」 | 承 F-36 命名风格；待 spec/收口定稿 |
| **ROADMAP 登记** | **留给收口**（本阶段 ROADMAP 零 diff；当前文档版本 1.33.0） | 承 F-36 D5 先例 |

### 6.2 范围 in / out（建议）

**In**（问题域层面，非需求）

| # | 主题 | 说明 |
|:-:|---|---|
| IN-1 | **产出机制换轨：`next` 工具（function calling）** | 注册 `next` 工具（schema）；经 `hooks.intercept` 捕获工具调用参数；`chat-result.aiNext` 照旧填充（替换围栏块解析） |
| IN-2 | **触发范围无条件** | 只要**配置 LLM**，**对话结束**即下发 next 工具/提醒（不再只并入有引用分支；不再骑 `ref-action` 位独占） |
| IN-3 | **未配置 LLM：确定性「去配置 LLM」引导** | 未配置 ⇒ next = 确定性操作（去配置 LLM）；**不显示自由输入终端**（自由输入不可行） |
| IN-4 | **LLM 异常兜底链** | ① 未调用 `next` 工具 ⇒ 提醒补一次；② 仍失败 / LLM 坏 ⇒ 系统兜底推荐（推荐配置新 LLM 等） |
| IN-5 | **保留 F-36 正确资产** | 5 道校验链 / `admitCandidate` vs `pressDecision` 分层 / `tierOf` 单源 / `chat-result.aiNext` 加法字段 / 确定性退居兜底 / 已配置时 free-input 终端恒常驻 / R6 同因去重扩展 |
| IN-6 | **门禁重锚 + 体积分列预算** | `ai-next-candidate` 替换/重锚；`parity` 新工具条目；`op-wiring`/`driver-timings`/`driver-quadruple`/`recommendation-sources` 逐条重锚；距档 9,798 B 分列预算 |
| IN-7 | **围栏块通道收敛** | 围栏块解析替换 / 保留（**开放点 O-NDA-006**） |
| IN-8 | **首开边界（PD-ADN-001 转正判定）** | 未配置/首开是否卷入（**开放点 O-NDA-009**） |

**Out**

| 非目标 | 说明 |
|---|---|
| 改 `pressCandidate` / `driveAnsweredTurn` / `op.turn` 槽语义 | 按下 / 成回合 diff=0 |
| 改 `tierOf` / 护栏六常量阈值 | 单源，只接入 |
| 改既有回合内工具行为 | 只新增 `next` 工具 |
| 改基座 `packages/web-cli-base/**` | 硬红线（只复用 function calling + intercept） |
| 改 F-36 / F-35 / F-34 / F-33 / R8 / v5 / v4 产物 | 并列新主题，不回头改 |
| 改 `src/content/**` / `pick-layer.js` / 判定链 / `zeroDiffFiles` | 冻结面 |
| 新增消息 kind / 卡 kind / 新宿主 | 零新增 kind |
| 特权 op 发起方式 / AI 代答 consent / 法八放宽 | 红线 |
| F-29（A2A） | 保持原样不动 |

### 6.3 叶子拆分建议

> 体量判定：本 Feature 触「产出机制换轨（工具）+ 触发范围 + 未配置路径 + 异常兜底链 + 门禁/体积重锚」，体量与 F-36 相当（F-36 为 2 叶 / 50 任务）⇒ **建议 2 叶硬串行**（承 F-35/F-36 先例）。

| 序 | 叶树名（建议） | 范围 | 依赖 |
|:-:|---|---|---|
| 1 | `specs-tree-nda-1-next-tool-channel`（**首叶 / 机制叶**） | **产出机制换轨 + 触发范围无条件**：`next` 工具注册（schema）+ `hooks.intercept` 接线 + `chat-result.aiNext` 装配 + 5 道校验链**保留接入** + `admitCandidate` 分层保持 + 触发条件改为「配置 LLM ⇒ 对话结束无条件」+ 围栏块通道替换（或兼容）+ 与既有工具面共存（成对 `parity`）+ 门禁：`ai-next-candidate` 重写 + `parity` 新条目 | — |
| 2 | `specs-tree-nda-2-fallback-and-gates`（**末叶 / 兜底与判据叶**） | **未配置路径 + 异常兜底链 + 门禁/体积重锚**：未配置 ⇒ 确定性「去配置 LLM」引导 + **不显示自由输入**（已配置仍恒常驻）+ 提醒补一次（有界）+ LLM 异常判定 + 系统兜底推荐（配置新 LLM）+ 首开边界落地 + 体积分列预算 + 门禁逐条重锚（含保护段）+ S0 四支线双面 | `nda-1` |

> **3 叶备选**：若「提醒机制 + 异常判定 + 兜底推荐」与「未配置路径 + 门禁重锚」体量足够，可拆 3 叶（`nda-1` 工具通道 / `nda-2` 未配置+异常兜底 / `nda-3` 门禁+体积+首开），仍硬串行；**默认推荐 2 叶**。

### 6.4 开放点清单（**附推荐；由 spec 阶段批量裁决**）

| ID | 开放点 | 推荐（discovery 建议，非裁决） |
|---|---|---|
| O-NDA-001 | 命名 / Feature 编号 / 版本位 | 树名 `specs-tree-web-cli-plugin-v55-f-next-drive-accuracy` / **F-37** / **v0.11.4**；ROADMAP 登记留收口 |
| O-NDA-002 | **`next` 工具 schema 形态** | 工具名 `next`；参数 = `{candidates: [{opId, label, ref?, params?}]}`（与既有 `AiNextCandidate` 结构同源，`maxItems` ≤3，与 `MAX_CHIPS_PER_CARD` 一致）；description 含「only end-of-turn / only these ops」约束 |
| O-NDA-003 | **`next` 工具挂在哪 / 如何捕获** | 插件侧注册（`host.ts` 工具面或新模块）；经基座 `hooks.intercept` 捕获（返回合成 `ToolResult`，跳过真实 dispatch）；插件**只接线**，**零改基座** |
| O-NDA-004 | **「提醒 LLM 补一次」机制** | 回合正常结束但无 `next` 工具调用 ⇒ 插件侧发起**恰一次**带 nudge 的续轮（有界；不进 `requestTurn(` 计数或等价重锚）；越限 ⇒ 直接进系统兜底 |
| O-NDA-005 | **「LLM 坏了」判定口径** | 复用既有失败面（`finish('llm-failed')` / 连续失败）+「无 `next` 工具调用」；词表不新写（与 `llm.unconfigured` 分相：未配置 vs 配置了但异常） |
| O-NDA-006 | **围栏块通道去留** | **替换**（单一产出通道，避免双通道漂移）；「零新 LLM 往返」契约仍成立（工具调用在同一次回合内） |
| O-NDA-007 | **系统兜底推荐形态** | 复用 `op.llm-config`（既有配置引导 op，`confirm` 档）；文档 / 文案强调「配置**新的** LLM」（切换 / 重配） |
| O-NDA-008 | **未配置时 free-input 终端的显示分相** | 新增「是否配置 LLM」单源判据：未配置 ⇒ 不显示终端（确定性引导）；已配置 ⇒ 恒常驻（R8 不回归）；不写第二份偏好键 |
| O-NDA-009 | **首开（PD-ADN-001）转正与否** | 倾向：**保持首开确定性**（不首屏依赖 LLM 往返）；未配置首开由「去配置 LLM」确定性引导承接；如涉 AI 首开单列 |
| O-NDA-010 | **规则位去留（`ai-next` 骑 `ref-action` vs 新位）** | 若触发无条件 ⇒ 需新位或独立通道；**优先复用 + 等价重锚**（破 `NEXTSTEP_PRIORITY` 恰 4 须显式取代 + 台账） |
| O-NDA-011 | 外部竞品调研 | 推荐不需要（或显式登记待调研） |
| O-NDA-012 | 门禁处置 | 先出逐条重锚清单；`ai-next-candidate` 换机制后**改写（等价或更强）**；`parity` 新 `pluginExtra`；`CHROMIUM_GATES === 9` 优先不动；保护段逐段决策；`assertionsRemoved = 0` |
| O-NDA-013 | 校验 / 兜底执行位置 | B 列优先（SW）——旁路 sidepanel 档位；面板只接收已校验候选 |
| O-NDA-014 | 留痕 / driver 三要素 | 复用 `driver=… \| timing=… \| evidence=…` + `blocked=` / `suppressed=`；evidence 与工具机制同源；零明文 |

---

## 7. 与 F-36 的关系定性（**保留 / 推翻 / deferred 转正**）

> F-36（`specs-tree-web-cli-plugin-v55-f-ai-driven-next`，v0.11.3，父 + 两叶 `validated/completed`）**不回头改**；本 Feature 为**并列新主题**，以**显式取代**登记差异。

### 7.1 保留（keep，逐条）

| # | F-36 资产 | `file:line` | 为什么保留 |
|:-:|---|---|---|
| K-1 | **5 道校验链**（opId 在册 → `tierOf` 三档 gesture 恒拒 → ref → param → label） | `ai-next.ts:98-158` | 换机制只改**上游来源**（工具参数替代围栏块解析项），校验链是纯函数、与载体解耦；保留 = 安全资产不漏 |
| K-2 | **判定分层**（`admitCandidate` 接受层 vs `pressDecision` 按下层） | `ai-next.ts:105-143`；`ai-drive.ts:67-78` | 解决「confirm 可提案不可自动按下」的张力；与产出机制无关 |
| K-3 | **`tierOf` 单源复用**（`op-table.ts:173-187`） | — | 零第二阈值 / 零第二档位表 |
| K-4 | **`chat-result.aiNext` type-only 加法字段** | `chat-events.ts:49-72`；`definition.ts:100-113` | 换机制后载荷面**照旧**（填入工具捕获的候选）；零新增 kind 保持 |
| K-5 | **确定性退居兜底 + R8 floor** | `recommend.ts:566-600` | 未配 / AI 未产出 / AI 非法 ⇒ 注册表接管 |
| K-6 | **已配置时 free-input 终端恒常驻** | `providers.ts:205-221`；`recommend.ts:583-592` | R8/F-35 成果；仅在**未配置**分相（核心 3） |
| K-7 | **R6 同因去重扩展覆盖 AI** | `recommend.ts:134-169` | 防「刚做完又推同一件事」 |
| K-8 | **留痕零明文 + 可判** | `ai-drive.ts:85,123-125`；`ai-next.ts:126-132` | 法八 + 法七 |
| K-9 | **护栏六常量 / 关断偏好接线** | `guard.ts`；`sidepanel.ts:2074` | 零第二阈值 |

### 7.2 推翻（supersede，逐条 — 显式取代，须台账）

| # | F-36 现状 | 处置 | 依据 |
|:-:|---|---|---|
| S-1 | **产出机制 = 文本 `next` 围栏块 + 解析**（`ref-context.ts:52-59`；`ai-next.ts:58-87`；`plan.md:127-133` 方案 A） | **取代为** `next` 工具（function calling）：删/停用围栏块提示句与解析，改走工具 schema + `hooks.intercept` 捕获 | 作者口径①「没有调用 **next 工具**」；§0.2-F 底座已就位；G-1 plan 曾否决 tool-call |
| S-2 | **触发只在有引用上下文**（`ref-context.ts:97-100`；`providers.ts:162-175`；`plan.md:290` PD-ADN-005） | **取代为** 无条件（配置 LLM ⇒ 对话结束即驱动）：产出提示/工具不再限定有引用分支 | 作者原则 + 口径①「**对话结束**……」 |
| S-3 | **未配置 ⇒ 恒真「自由输入」终端**（`providers.ts:217`） | **取代为** 未配置 ⇒ 确定性「去配置 LLM」引导，**不显示**自由输入 | 作者口径②（自由输入无 LLM 不可行） |
| S-4 | **无 LLM 异常兜底**（`service-worker.ts:1027-1043`；`sidepanel.ts:4140-4152`） | **取代为** 提醒补一次 → 仍失败 ⇒ 系统兜底推荐配置新 LLM | 作者口径① |

### 7.3 deferred 转正（candidate）

| # | F-36 deferred | 本 Feature 处置 |
|:-:|---|---|
| T-1 | **PD-ADN-001 首开 AI 化 = deferred** | **候选转正**（仅当「未配置 ⇒ 系统驱动配置 LLM」触及首开）—— 开放点 O-NDA-009；倾向保持首开确定性 |
| T-2 | **PD-ADN-002 协议形态（围栏块）** | **由 S-1 取代**（改工具 schema） |
| T-3 | **PD-ADN-005 只在 ref-action 上下文** | **由 S-2 取代**（改无条件） |
| T-4 | **PD-ADN-004 ref 字段语义面** | 随 S-1 保留校验链的 ref 语义（保持） |

---

## 8. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | **裁决 O-NDA-002/003/004（工具 schema / 落点 / 提醒机制）** | 决定机制可行性的三个结构核心；spec 阶段批量裁决 |
| 高 | **固化「保留 / 推翻」清单（§7）为 spec 的 FR/NG** | 防换机制误伤 F-36 正确资产（R-NDA-001） |
| 高 | **`next` 工具与 `parity` 门禁的可行性先验（spike）** | 新增工具 ⇒ `pluginExtra` + `baseline-catalog.json`；先出成本（R-NDA-004） |
| 高 | **`ai-next-candidate` 门禁重写清单（AI-N-1 换机制）** | 防静默降强度（R-NDA-005） |
| 中 | **「提醒补一次」有界性与防环设计（O-NDA-004）** | 与 `proactivity` 护栏关系（R-NDA-002 / Q-NDA-021） |
| 中 | **未配置分相判据（O-NDA-008）** | 单源「是否配置」，不写第二偏好键（R-NDA-003） |
| 中 | **体积分列预算（A/B/C 列）** | 距档 9,798 B；先预算后实现（R-NDA-006） |
| 低 | **外部竞品调研（O-NDA-011）** | 如需外部参照则显式登记 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin F-37「next 驱动机制的准确落地」问题挖掘）：作者口径逐字固化（顶层原则 + 口径①/② + 价值锚）+ F-36 现状复核（产出机制 A / 触发范围 B / 未配置路径 C / 异常兜底 D / 上游底座 E / **function calling 底座 F** / plan 否决 tool-call G / 体积门禁 H）+ 四处偏颇表 + Q-NDA-001~024 + A-NDA-001~009 + R-NDA-001~013 + 提名/版本位/范围 in-out + 2 叶拆分建议 + O-NDA-001~014（附推荐）+ 与 F-36 的保留/推翻/转正清单（§7）。**本轮零产品运行时验证、零受管 Provider 调用（routing.v1 = local_or_compute → none）**；`.sddu` 外零触碰；ROADMAP 零 diff。 | 2026-09-27 | SDDU Discovery Agent |
