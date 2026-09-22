# 问题挖掘报告：specs-tree-web-cli-plugin-v55-self-driven

> **文档定位**: SDDU 问题挖掘报告 — 记录 web-cli-plugin v5.5「self / ai-driven：让助手像助手」的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = ① 作者主题指示（2026-09-22，原话提炼，逐字保留于 §0.1）② 真机会话现场 B（22:49，`platform.deepseek.com`）+ 会话 A（20:15）复盘（逐字保留于 §0.2）③ 只读代码根因诊断（`file:line`，本轮复核于 §0.3 / §7.1）④ 上游收口总账 `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/closeout.md`（F-32 / v5 终态 + 数字总账 + deferred 14 条 + 人工面 9 项）⑤ 仓库现状（分支 `feature/web-cli-plugin` @ `0a60740`，`packages/web-cli-plugin` 现行实现与门禁基线，本轮实测）⑥ 编排器代作者决策（2026-09-22：作者已授权编排器代行决策；**不访谈作者基本框架，开放点收集后附推荐项，spec 阶段批量裁决**）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（web-cli-plugin v5.5「self / ai-driven」问题挖掘）

web-cli-plugin v5.5「self / ai-driven：让助手像助手」问题挖掘报告 —— 把作者主题（**没有配置 LLM 时由系统代码流程驱动用户去配置 LLM；已配置 LLM 时让 AI 来启动整个 chat/next**；理念 = **主动帮用户、引导用户解决用户的问题、完成用户的需求，而不是被动接受任务**）转成可验收的问题域：**驱动权（drive ownership）全在用户侧** —— v5 已把「下一步」从「provider 自愿」升级为「管线强制保证」（阻塞终态必有可达 next），但**「谁来按下一步」仍是用户**：凡「用户已表达意图」的时刻（答完 ask / 交完描述 / 绑定完成 / 拾取完成 / 探测稳态 / 授权回执 / 回合结束），**之后没有任何驱动者接手**，流停在原地等用户再敲一次；且**权威基线有一条 v5 留下的未覆盖静默**（真机会话 B：引用回合 ask 已答 ⇒ 彻底静默）。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（作者指示 / 真机现场 / 代码根因 / 资产盘点 / 编排器决策 / 仓库实测），供 spec 阶段追溯；不加入任何方案推断，不写需求条文。

### 0.1 作者立项记录（**原话逐字保留，不美化**）

| # | 作者原话（逐字 / 提炼自 2026-09-22 指示） | 落地形态 |
|---|---|---|
| **主题①** | 「**没有配置 LLM 时：由系统代码流程驱动用户去配置 LLM**」（确定性系统流，**不是 AI**） | 系统侧**确定性 wizard / 引导流**：在 LLM 缺席时由**代码**（非 LLM）把用户引导到配置完成；本稿登记为**主题①** |
| **主题②** | 「**已配置 LLM 时：让 AI 来启动整个 chat/next**」（AI 驱动编排） | LLM 侧**主动性编排**：AI 有权**启动**回合 / 推进 next，而不是等用户发话；本稿登记为**主题②** |
| **母理念** | 「**主动帮用户、引导用户解决用户的问题、完成用户的需求，而不是被动接受任务，被动发挥的价值太小了**」 | **主动性 / 驱动权**从**用户侧**转移到**系统 / AI 侧**——本 Feature 的母命题 |

> **口径声明（如实）**：作者原话为**指示要点**（编排器 2026-09-22 转达），本报告**逐字保留主题①②与母理念的表述**；作者**未**指定实现形态、未指定触发时机、未指定安全边界——这些**全部登记为开放点（§7.4 O-SELF-*）**，**不在本阶段预设答案**。

### 0.2 真机现场（**第一现场证据；已完成只读诊断，本轮直接引用，不重查**）

#### 会话 B（22:49，`platform.deepseek.com`）——**本 Feature 的母缺陷现场**

```
绑定 ✓ → 拾取引用 ① 出生有效 → ask-user 已答「原地翻译为中文」→ 彻底静默
                                          （无思考 / 无 next / 无事件 / 无 ✖）
```

| 环节 | 事实 | 判定 |
|---|---|---|
| 绑定 | `✓` 绑定成功 | 正常 |
| 拾取引用 | ① **出生有效**（引用有效，`validCount ≥ 1`） | 正常（注：R4 之前「出生即死」缺陷已由 `0a60740` 根修；本会话 22:49 在 R4 提交 22:45 **之后**，引用出生有效） |
| ask-user | 卡已答「原地翻译为中文」，**已结算** | **✅ 用户已表达意图** |
| 之后 | **彻底静默**：无思考、无 next、无事件、无 ✖ | **✖ 驱动者缺位（= 死端的新形态：不是"无出口"，而是"无推进者"）** |

#### 会话 A（20:15）——**证明显式断层早已存在**

> 答了两遍「翻译」后，**靠手动重打才启动回合**。

⇒ 断层**不是**会话 B 偶发：用户答完 ask 后，系统**不**启动任何回合；用户**必须手打**同样的指令，回合才跑起来。会话 A 的「答了两遍仍无反应 ⇒ 只好重打」= **同一缺陷的早期证据**。

> **证据缺口（如实登记）**：真机截图 / 录屏**未入库**；会话 A / B 来自作者提供的**文字记录**（22:49 / 20:15）。本报告**不声称**有截图证据。

### 0.3 代码根因映射（**本轮只读复核，逐条 `file:line`**）

| # | 根因（要点） | 仓库侧证据（本轮实测，`file:line`） |
|:-:|---|---|
| **R1** | **引用回合 ask 的答案被丢弃**：`submitAskFor` 对 `ref-round-<refId>` 走 `applyRefAction(refId, trimmed)`；而 `applyRefAction` 只做有效性裁决，**从不发回合** | `sidepanel.ts:2557-2588`（答案分流 + `:2587` `if (refId && !isCanceled && trimmed) applyRefAction(refId, trimmed);`）+ `sidepanel.ts:2177-2189`（`applyRefAction` 全文） |
| **R2** | **`applyRefAction` 的唯一副作用是"计数"**：`l1.dispatchRefAction` → `ref-store.dispatch` 通过有效性后**只做 `sends += 1`** 并返回 `{allowed:true}`；**`sends` 零生产消费者**（仅测试读） | `l1/ref-store.ts:280-291`（`dispatch` 守卫后 `sends += 1; return {allowed:true,...}`）+ `:292`（`commandSends: () => sends`）+ 消费者仅 `test/ui/l1.mjs:516-519` / `test/ui/page-input.mjs:241` / `test/l1-ref-validity.test.ts:171,175,437`（**无 `src/` 消费者**） |
| **R3** | **唯一回合启动者是 `requestTurn`，答案路径没复用**：`requestTurn` 是面板**唯一**回合发起入口（composer 提交 + `op.turn` 槽）；op-wiring 门禁把它**钉死恰 2 处调用点**，因此**答案路径不能（也不得）自行发回合** | `sidepanel.ts:277-297`（`requestTurn` 定义）+ 调用点 `:3232`（composer submit）+ `:3256`（`bindPanelOps.turn` 槽）= **恰 2 处**；门禁 `test/op-wiring.test.ts:117-124`（`requestTurn(` 必须恰 2 处） |
| **R4** | **本该接手的 ref-action 推荐 chip 被硬抑制**：`ref-action` provider 的 `when` 含 `ctx.session.openAsks === 0` —— ask **开着时被抑制**；而**答完后没有任何重跑时机**（`RecommendTrigger` 恰 4 项，**无 `'answered'`**） | `next-registry/providers.ts:136-148`（`id:'ref-action'`，`when: ctx.ref.validCount >= 1 && ctx.session.openAsks === 0 && ctx.ref.latestRefNum !== undefined`，`chips: [ACT_TO_OP.next, ACT_TO_OP.next]`）+ `sidepanel.ts:1791`（`type RecommendTrigger = 'pick' \| 'stale' \| 'idle' \| 'firstRun'`）+ 生产调用点仅 `:1909`(firstRun) `:2241`(stale) `:2383`(pick) `:2453`(pick) `:3281`(idle) `:3380`(idle) `:3399`(idle) |
| **R5** | **LLM 配置检查在这条路径完全缺席**：`runChat` 无配置门禁（`keys.load()` 后直接 `providerChat`）；未配置时表现为 **LLM 错误事件 → idle 推荐**（被动）。`llm.unconfigured` 阻塞事实**只在 `op.llm-config` 分支被动写入** | `background/service-worker.ts:878-941`（`runChat` 全文，无 `configured` 判据；`:893` `s.keys.load()` → `:894` `providerById` → providerChat → `onLLMError`）+ `sidepanel.ts:1290-1302`（`observedBlocked` / `noteLlmBlockedFact`，仅由 op 失败/拒绝**观测**得） |
| **R6** | **旁路死端：「改用描述」只 dispatch 从不 send** —— `submitDescribe` 只产 `ask-resolved`，**没有任何发送 / 驱动** | `sidepanel.ts:2541-2546`（`submitDescribe` 全文：`ensureTextAskCard()` + `dispatch({type:'ask-resolved',...})`，**无 send**）+ 调用点 `:3260`（`PANEL.describe` 槽） |

**断流的因果链（会话 B 逐环节）**：绑定 ✓ → 拾取 ✓（引用出生有效）→ ask 卡登记（`openAsks.length = 1`）→ `ref-action` provider **被 `openAsks===0` 抑制**（R4）⇒ 此刻**无 next**；用户作答 → `submitAskFor` 走 `applyRefAction`（R1）→ `ref-store.dispatch` **只 `sends += 1`**（R2）→ **无 `requestTurn`**（R3）→ **无 `'answered'` 时机重跑推荐**（R4）⇒ **彻底静默**。

### 0.4 现有资产盘点起点（**"已有什么 vs 缺什么"——须完整映射**）

> 本节只记录**仓库内已存在、已验收**的机制先例（事实，非方案）；它们是主题①②的**可用底座**，也是"缺什么"的对照面。

| # | 已有资产（事实） | 证据 | 与主题①②的关系（**缺什么**） |
|:-:|---|---|---|
| **A1** | **`BLOCKED_TERMINALS` 恰 5 类**（`site.unauthorized` / `llm.unconfigured` / `perm.missing` / `binding.stale` / `ref.all-invalid`），其中 `llm.unconfigured` / `perm.missing` 由**修复 op 自驱动**（`OPS_RECOVERY_ROWS` → `op.llm-config` / `op.perm.request`） | `next-registry/definition.ts:34-41` + `providers.ts:57-58` + `BLOCKED_RECOVERY_TRIGGER`（`definition.ts:60-68`） | **被动式**：阻塞事实**先出现**（op 失败被观测）才推荐修复 ⇒ 主题①要的是**主动式**（LLM 缺席即驱动用户去配置，不必先撞一次墙） |
| **A2** | **NextProvider 契约 v2 注册表**（`when(ctx)` 纯谓词候选 + `chips` = opId）+ **9 op**（`op.turn` / `op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.authorize` / `op.llm-config` / `op.perm.request` / `op.revoke`）+ `op.turn` 槽 = `PANEL.turn` = 唯一回合入口 | `next-registry/registry.ts` + `providers.ts:120-158` + `ops.ts:290-332` + `sidepanel.ts:3255-3256` | **能力齐备、缺驱动者**：注册表能**按 ctx 产出 next**，但 **ctx 变化后没人重新求值**（无 `'answered'` 等时机）⇒ 主题②的"启动"缺**时机源** |
| **A3** | **S2 断流自动续流先例**（v5 首验收）：「阻塞解除 → **自动恢复**」已被机器化并入库 | `.sddu/.../v5-all-in-next/closeout.md:189`（「✖ 行带授权 next → 点击 → 握手 → ✓ → **自动续流**」）+ `test/s2-deadend-chain.test.ts:39-53` + `test/ui/no-dead-end.mjs` | **"自动接续"已是既有范式**：v5 解决的是「阻塞解除后自动续**阻塞前**的任务」；**尚未**覆盖「用户已答 / 已交描述 / 绑定完成 … 之后由谁推进」⇒ 主题②可复用该范式（**候选，非承诺**） |
| **A4** | **ask-user 卡三种**：① 面板本地 op `params` ask（`opAskResolvers` 四态管线内，**已正确驱动 op**）/ ② 后台 ask（`ask-user-request` ⇄ `ask-user-response`，由 `askBridge.settle` 在**在飞回合内**结算）/ ③ **引用回合 ask（`ref-round-<refId>`）** | `sidepanel.ts:2557-2588` + `pipeline.ts:83-90`（`resolvePending` 每 requestId 恰排空 1 个 op）+ `service-worker.ts:465-471` + `:2813-2822`（`askBridge.settle`） | **第③种是 stub**（R1/R2：答了 = 计数）；**第②种在回合结束后也无驱动者**（`settle` 返回 `false` ⇒ `errorResponse('无待回答的 ask-user 请求')`）⇒ 「已答 ask」**不是**一个被承认的**终态** |
| **A5** | **R-ONBOARDING 首装单行**（`onboarding` provider：`firstRun && pendingSteps.length > 0` → 2 chip）+ `maybeRecommendFirstRunEntry()`（每次面板生命至多消费一次） | `providers.ts:125-134` + `sidepanel.ts:1895-1909` + `:1835-1836`（`pendingSteps` 仅首装非空：`['授权当前站点']`） | **确定性引导的原型**：单行 / 单时机 / 单场景；主题①要的是**多步 wizard** + **配置完成即续接悬置任务** ⇒ **卡在 `⇒ 行不在`**（仅首装） |
| **A6** | **AI 驱动局部先例**：LLM **已能在回合内驱动命令 / 工具**（思考 / 命令指示器 + dom read-state + tool 卡） | `service-worker.ts:878-941`（`runChatTurn` 的 `onAssistantText` / `onCommandLine` / `onToolOutput`）+ v5-2 9 op 流内闭环 | **驱动权只到"回合内"为止**：AI **不能启动回合**（回合起点恒为 `requestTurn`，恰 2 处调用点）⇒ 主题②的"启动整个 chat/next"**无载体** |
| **A7** | **法七（禁止死端）/ 法八（值不入流）已立法 + 机器化**：`BLOCKED_TERMINALS` 单源、死端 = 0 门禁、S2 十环节可判 | `test/ui/no-dead-end.mjs`（CHROMIUM 门禁）+ `test/s2-deadend-chain.test.ts` + `git-design-map.ts:77-87`（F1~F11 法七逐条） | **法七覆盖"阻塞终态"，未覆盖"已表达意图之后的静默"**：已答 ask 卡**不在**任何终态词汇 / 死端判据内 ⇒ **当前是无「法七」保护的静默区** |

> **盘点结论（缺什么）**：**能力齐备（9 op + 注册表 + 管线）、时机单一（推荐器只在 4 个非"已表达意图"时机求值）、驱动者唯一（回合只能由用户手势经 `requestTurn` 发起）**。v5 把「下一步**是什么**」交由注册表保证；**v5.5 的问题 = 「下一步**由谁按**」**。

### 0.5 编排器代作者决策（2026-09-22；**已为定论，本报告直接作为约束记录，不重新讨论**）

| # | 决策 | 性质 |
|---|---|---|
| D1 | **作者已授权编排器代行决策、SDDU 全流程自行调度**（本轮及后续 spec/plan/tasks/build/review/validate 均按此口径） | 定论（作者授权） |
| D2 | **本轮 discovery 不访谈作者基本框架**：开放点**收集后附推荐项**，由 spec 阶段**批量裁决** | 定论（编排器要求） |
| D3 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/`**（承 v3-ui / v4-chat / v45-f-regularization / v5-all-in-next 命名惯例） | 定论（**命名与版本位配对的语义辨析见 §6.2 / O-SELF-001**） |
| D4 | **ROADMAP 编号 = F-33**；**本轮实测复核：`F-33` 在 ROADMAP 中 0 命中**（§6.1）；`F-29`（A2A 候选）保持原样不动、`F-30`/`F-31`/`F-32` 已用 | 定论 + 本轮复核 |
| D5 | **版本位 = v0.11.0（并列主题）**；**本轮实测：`v0.11.0` 在 ROADMAP 中 0 命中**（§6.2）⇒ 新版本位（登记留给收口；本阶段 ROADMAP **零 diff**） | 定论（登记留给收口） |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录；不改任何 `src/`、`test/`、`dist/`、`design/`、`docs/` 与 `ROADMAP.md`**（本轮为 discovery，**零产品运行时验证**） | 定论（本轮已遵守） |
| D7 | **不上溯改写 v5 产物**：v5 父 / 三叶全部 `validated` 终态**原样保留**；本 Feature 以**并列新主题**立项，不复用 v5 目录、不改其 pin / 台账 | 定论（本轮已遵守） |

### 0.6 本阶段边界（discovery 职责声明）

- **负责**：挖掘问题、梳理问题、记录问题；输出问题清单 + 目标态描述 + 红线继承与显式取代候选清单 + 风险预登记 + 开放问题（附推荐）。
- **不负责**：不定义需求（不写「系统应支持 XXX」）、不分类 Must/Should/Could、不定义验收标准、不做方案评估与替代方案对比、不写 ADR、不排任务、不改代码、**不决定主题①②的触发时机与安全边界**（= 开放点）。
- **本轮零产品运行时验证**：未跑 `npm test` / Chromium 门禁 / 构建；所有数字均来自**带 `file:line` 的源码、已入库产物与本轮只读实测**（§7.1 逐条给出），未自造实测值。

---

## 1. 问题定义

### 1.1 一句话问题陈述

> v5 把「**下一步是什么**」从「provider 自愿」升级为「**管线强制保证**」（阻塞终态必有可达 next，死端 = 0），但**「下一步由谁按」没有解决**：系统的**驱动权（drive ownership）全部留在用户侧** —— **唯一**回合发起入口是用户手势触发的 `requestTurn`（调用点被门禁钉死**恰 2 处**），推荐器的求值时机是**恰 4 项**（`pick`/`stale`/`idle`/`firstRun`，**无 `'answered'`**），于是**凡「用户已表达意图」的时刻之后都没有驱动者接手**；真机会话 B 暴露了其中**最硬的一条**：**引用回合 ask 已答 ⇒ 答案被丢弃（`applyRefAction` 只计数）⇒ 彻底静默**（无思考 / 无 next / 无事件 / 无 ✖）；同时**主题①的确定性系统流也不存在** —— `runChat` 无 LLM 配置门禁（未配置时表现为 LLM 错误 → idle 推荐，**被动撞墙式**），`llm.unconfigured` 阻塞事实**只在 op 失败被观测后才写入**。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **驱动者缺位：已表达意图之后无人接手** | 用户在流里**说了话**（答了 ask / 交了描述），系统**听完就停**——不是"难用"，是**用户的话没有下一个人**。真机会话 B：`彻底静默`；会话 A：答两遍后**只好手动重打**同一指令 | 每一个「用户已表达意图」的环节都可能静默；用户被迫**重复输入**（会话 A 实证）；作者母理念「主动帮用户…而不是被动接受任务」在**机制上不成立**——系统连"接住用户已说的话"都做不到 |
| **引用回合 ask 的答案被丢弃（最硬的一条）** | `submitAskFor` 对 ref 回合走 `applyRefAction` → `l1.dispatchRefAction` → `ref-store.dispatch`：通过有效性后**唯一副作用 `sends += 1`**，而 `sends`（`commandSends`）**零 `src/` 消费者** ⇒ 答案**物理上被丢弃**。v5 的「S2 自动续流」保证**不覆盖**这条路径 | 引用是 v3 起的主推交互（「页面即输入」）；**每次引用回合作答都是一次静默**。且该路径**不在任何法七判据内**（`no-dead-end` 只判 5 类阻塞终态）⇒ 修了也可能再退化（**无回归闸门**） |
| **主题①不存在：LLM 未配置时无确定性系统流** | `runChat`（`service-worker.ts:878`）**无配置门禁**：`keys.load()` → `providerById` → `providerChat`；未配置时**表现为 LLM 错误事件**（`onLLMError`）→ 落 idle 推荐。`llm.unconfigured` 阻塞事实**只在 `op.llm-config` 分支被"观测"写入**（`sidepanel.ts:1298-1302`） | 用户第一次打开面板（已装未配）**不会被告知"你需要先配置 LLM"并**被引导完成它**；只能等撞一次错误。作者主题①的「由系统代码流程驱动用户去配置 LLM」**当前无任何载体** |
| **主题②不存在：AI 不能启动回合 / 推进 next** | AI 的驱动权**止于回合内**（能驱动 thinking / 命令 / tool），**回合起点恒为用户手势**（`requestTurn` 恰 2 处调用点，门禁 `op-wiring.test.ts:117-124` 钉死）。ref-action 推荐 chip 本该在答完后接手，却被 `when: ctx.session.openAsks === 0` **硬抑制**，且答完后**无重跑时机** | 「让 AI 来启动整个 chat/next」**在架构上不可达**：不是缺一个 chip，而是缺**允许 AI/系统发起回合**这一层；且**安全边界未定义**（特权 op 恰 2 = `op.authorize` / `op.perm.request` **必须用户手势**——AI 不可自动执行）⇒ 若不加约束地放开"AI 主动"，会直接撞既有安全红线 |

### 1.3 本 Feature 范围（**主题①②的问题域描述，非需求**）

| # | 主题 | 性质 | 来源 | 目标态（**问题域描述**） |
|:-:|---|---|---|---|
| 核心 1 | **驱动者层（drive ownership）** | 机制（跨层：推荐 / 回合 / op / 流） | 母理念 + 会话 A/B | 「用户已表达意图」的每个时刻之后，**存在一个被承认的驱动者**接手续接（不是"多几个 chip"，而是**驱动权归属可判**） |
| 核心 2 | **主题① 确定性系统流（LLM 未配置 → 引导配置）** | 系统流程（**非 AI**） | 作者主题① + R5 | LLM 缺席时由**代码**驱动用户完成配置；**配置完成 → 续接悬置任务**（S2 自动续流范式复用为候选）；确定性（同输入同路径、可机核、零 LLM 调用） |
| 核心 3 | **主题② AI 驱动编排（已配置 → AI 启动 chat/next）** | AI 主动性 | 作者主题② + R3/R4 | AI / 系统有权**启动**回合与推进 next；**安全边界**（特权 op 恰好 2 必须用户手势 · 打扰控制 · token 成本 · 防环）**必须在 spec 显式裁决** |
| 核心 4 | **法七扩展：已表达意图之后的静默入终态词汇** | 法则 + 判据 | R1/R2/R6 + 会话 B | 已答 ask（含 ref 回合 / 面板 op ask / 后台 ask）与「改用描述」成为**被承认的终态**，且**必有下一个驱动者**（机核化） |
| 附带 1 | **驱动时机源（`'answered'` 等）** | 注册表时机面 | R4 | 推荐器求值时机**不得只有用户手势触发**；至少新增「已答」时机（语义与命名待 spec） |
| 附带 2 | **`submitDescribe` 旁路死端** | 单点缺陷 | R6 | 「改用描述」作答后不得无驱动（当前只 `dispatch` 从不 `send`） |

### 1.4 非目标（**明确排除**）

| 非目标 | 理由 |
|---|---|
| `src/content/**`（`content.js`）/ `pick-layer.js` 的**语义改动** | 字节冻结红线：`content.js` **177,076 B** / `pick-layer.js` **34,358 B**（R4 已显式解冻重登记，**本轮再动需再走一次显式解冻**——登记为 `X-SELF-?` 候选） |
| **A2A**（`F-29`） | 未立项未排期，**保持原样不动**（ROADMAP 相关区段**一字不动**） |
| **12 kind 卡类型学**（新增第 13 种卡） | v5 已固化「零新增卡类型」；AI 主动权若需可见载体，应复用既有 taxonomy（**待 spec 裁决**，O-SELF-006） |
| **安装期静态权限 / `manifest` 静态面** | 主题①②均**不需要**新静态权限；若确需，须走 v5 的 `X1` 先例（等价改写判据，非放宽） |
| **判定链**（`src/security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面 | 硬底线：判定链在 v3 台账 `zeroDiffFiles`（内容哈希 pin）；**AI 主动权不得触碰安全判定**——反而必须**加固**（O-SELF-004 / R-SELF-004） |
| **存储侧加密 / 凭据生命周期** | v5 已登记 out-of-scope（`PO-ALLN-003`）；主题①只涉及**配置引导**，不涉及凭据存储安全性 |
| **v5 产物（父 / 三叶）的改写** | D7：v5 全部 `validated` 终态原样保留；本 Feature 为并列新主题 |
| **会话 / 分组 / tabs / 诊断收编 op** | v5 已登记 deferred（`PO-ALLN-001`）；除非与"驱动者"强耦合，否则不纳入本 Feature |

---

## 2. 用户画像

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v3/v4/v4.5/v5 同一事实基础。**本报告不编造用户调研数据**；「用户原话」栏引用作者既有指示与真机文字记录。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 当前应对方式 |
|---------|---------|-------------------|------------|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏（`platform.deepseek.com`）：绑定 → 拾取引用 → ask 卡作答「原地翻译为中文」 | ①（本 Feature 母命题，逐字）「**主动帮用户、引导用户解决用户的问题、完成用户的需求，而不是被动接受任务，被动发挥的价值太小了**」②（会话 B，逐字事实）答完 ask 后**彻底静默**（无思考 / 无 next / 无事件 / 无 ✖）③（会话 A，逐字事实）答了两遍「翻译」后**靠手动重打才启动回合** | 忍受 + 真机反馈驱动下一轮（会话 A → 会话 B **两轮**均复现同一断层） |
| **作者（首次配置 LLM 场景）** | 装好插件、未配置 LLM，第一次打开侧栏 | 主题①逐字：「**没有配置 LLM 时：由系统代码流程驱动用户去配置 LLM**」——当前**无载体**：不会被告知要配置，只能撞一次 LLM 错误 | 去设置视图 / `options` 页自己找（**跳来跳去**——与 v5 的主题正面冲突） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种『用户已表达意图之后该做什么』，要改哪些文件？」 | 现状答案 = **回合入口门禁（`requestTurn` 恰 2 处）+ 推荐时机闭集（4 项）+ provider `when` 抑制条件 + 无 `'answered'` 时机** ⇒ 新增一种驱动者在当前架构下**无处安放** | 服从既有形态（即**扩张被现行架构锁死**——与 v5 的 `Q-ALLN-003` 同构，但层次更高：v5 缺"操作可注册"，v5.5 缺"驱动者可注册"） |

---

## 3. 问题清单

> 编号空间 `Q-SELF-###`（SELF = self / ai-driven）。核心 / 次要 / 潜在按「影响面 × 影响深度 × 影响频率」分级；每条标注信息来源。

### 3.1 核心问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-SELF-001** | **驱动者缺位（本 Feature 母问题）：凡"用户已表达意图"的时刻之后无人接手。** 系统的驱动权**全部**在用户侧：唯一回合入口 `requestTurn`（`sidepanel.ts:277`）只能被**用户手势**触发，且调用点被门禁钉死**恰 2 处**（`test/op-wiring.test.ts:117-124`：composer 提交 `:3232` + `op.turn` 槽 `:3256`）；推荐器求值时机是**恰 4 项闭集**（`sidepanel.ts:1791` `'pick' \| 'stale' \| 'idle' \| 'firstRun'`，**无 `'answered'`**）。⇒ 「用户已表达意图」的每个时刻（已答 ask / 已交描述 / 绑定完成 / 拾取完成 / 探测稳态 / 授权回执 / 回合结束）**之后都没有下一个驱动者**。**佐证**：会话 B 彻底静默；会话 A 答两遍后手动重打；作者母理念逐字（§0.1）。 | 全部交互路径；深度 = **核心阻碍**（主动性在机制上不成立）；频率 = 每个"已表达意图"时刻**持续复现** |
| **Q-SELF-002** | **引用回合 ask 的答案被丢弃（会话 B 的直接根因）。** `submitAskFor`（`sidepanel.ts:2557-2588`）对 `ref-round-<refId>` 作答走 `applyRefAction(refId, trimmed)`（`:2587`）；`applyRefAction`（`:2177-2189`）**只做有效性裁决、从不发回合**；其下游 `l1.dispatchRefAction` → `ref-store.dispatch`（`l1/ref-store.ts:280-291`）通过有效性后**唯一副作用 = `sends += 1`**，而 `commandSends: () => sends`（`:292`）**零 `src/` 消费者**（仅 `test/ui/l1.mjs` / `test/ui/page-input.mjs` / `test/l1-ref-validity.test.ts` 读）。⇒ **答案物理上被丢弃**，与 ask 卡"已结算"的可见事实**自相矛盾**。**佐证**：会话 B（22:49）逐环节。 | 引用回合（v3 起主推交互）；深度 = **核心阻碍**（用户的话被系统吞掉）；频率 = **每次引用回合作答** |
| **Q-SELF-003** | **主题①无载体：LLM 未配置时不存在确定性系统流。** `runChat`（`background/service-worker.ts:878-941`）**无任何配置门禁**：`s.keys.load()` → `providerById(settings.providerId)` → `providerChat(...)`；未配置时**表现为 LLM 错误事件**（`onLLMError` → `llmErrorEvent`）→ 落 idle 推荐。`llm.unconfigured` 阻塞事实**只在 `op.llm-config` 分支被动写入**（`sidepanel.ts:1298-1302` 的 `noteLlmBlockedFact`，注释逐字：「their fact is an **observed block event**（the repairing op failed / was refused），not a static preference」）。⇒ 主题①要求的「**由系统代码流程驱动用户去配置 LLM**」（**确定性、非 AI**）**没有任何实现面**。 | LLM 未配置的全部场景（首装 / 清空凭据 / 换机）；深度 = **明显痛点 — 核心阻碍**（新用户第一步即撞墙）；频率 = 每个未配置会话 |
| **Q-SELF-004** | **主题②无载体：AI 不能启动回合，推荐器答完后无重跑时机。** 两层耦合：① **回合起点恒为用户手势** —— `requestTurn` 是面板唯一回合发起入口，门禁**钉死恰 2 处**（`op-wiring.test.ts:117-124`），AI **无法**发起回合（AI 的驱动权止于"回合内"，见 §0.4 A6）；② **本该接手的 ref-action chip 被硬抑制** —— `id:'ref-action'` provider（`next-registry/providers.ts:136-148`）的 `when` 含 `ctx.session.openAsks === 0`（ask **开着时抑制**），而答完后**没有任何重跑时机**（`RecommendTrigger` 无 `'answered'`）⇒ **答完后推荐器永不重新求值**。⇒ 「让 AI 来启动整个 chat/next」**架构上不可达**。**佐证**：会话 B 静默；R4 代码链。 | 全部 AI 主动性场景；深度 = **核心阻碍**（主题②无落点）；频率 = 持续 |
| **Q-SELF-005** | **"已答 ask" 不是被承认的终态，法七不覆盖。** `BLOCKED_TERMINALS` 恰 5 类（`next-registry/definition.ts:34-41`）**只描述"阻塞"**；已答 ask / 已交描述**不在**任何终态词汇内，`test/ui/no-dead-end.mjs` 与 `test/s2-deadend-chain.test.ts` 的死端判据**只判 5 类阻塞**（`gist-design-map.ts:77-87` F1~F11 逐条）。更硬的是**三种 ask 的驱动者各不相同且第三种是 stub**：① 面板 op `params` ask → `opAskResolvers` **已正确驱动 op**；② 后台 ask → `askBridge.settle`（`service-worker.ts:2813-2822`），**回合已结束时返回 `false` ⇒ `errorResponse('无待回答的 ask-user 请求')`** = **也无驱动者**；③ 引用回合 ask → **答案被丢弃**（Q-SELF-002）。⇒ **"用户答完了"这件事在系统里不是一个可判的终态**。 | 全部 ask 路径（3 种）；深度 = **核心阻碍**（法七判据真空 ⇒ 修了会再退化）；频率 = 持续 |
| **Q-SELF-006** | **旁路死端：「改用描述」只 dispatch 从不 send。** `submitDescribe`（`sidepanel.ts:2541-2546`）全文只做 `ensureTextAskCard()` + `dispatch({type:'ask-resolved', requestId:'ref-describe', ...})`，**没有任何发送 / 驱动**；调用点 `:3260`（`PANEL.describe` 槽）。⇒ 用户「改用描述」作答后，**事实留痕了、但没有任何下一个驱动者**——v5 后遗症（法七只管阻塞场景，未覆盖此本地动作）。 | 引用失效恢复路径（`ref.all-invalid` 的恢复动作之一）；深度 = **明显痛点**；频率 = 引用失效时 |

### 3.2 次要问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-SELF-007** | **绑定完成 / 拾取完成 / 探测稳态后无主动驱动。** 会话 B 序列：绑定 `✓` → 自动探测 → 拾取引用（出生有效）→ **无人推进授权**。`capability-discovery` provider 的 `when` 含 `ctx.site.authorized && ctx.probe.phase === 'ready' && !ctx.session.busy`（`providers.ts:151-153`）⇒ **`authorized` 未成立时永不产出**；`site.unauthorized` 的恢复 candidate 由 `activeRecoveryTrigger` / 阻塞事实驱动（`recommend.ts:112-134`），**不是"绑定完成即主动推进"**。⇒ 探测到达稳态 → 用户**不被告知下一步**。 | 绑定 / 探测 / 授权链；深度 = 明显痛点；频率 = 每次首次绑定站点 |
| **Q-SELF-008** | **首装引导是单行 / 单时机 / 单场景（确定性 wizard 的雏形不足）。** `R-ONBOARDING` 只在 `firstRun && pendingSteps.length > 0` 成立（`providers.ts:131`），而 `pendingSteps` **仅首装非空且恒为 `['授权当前站点']`**（`sidepanel.ts:1835-1836` / `:1094`）；`maybeRecommendFirstRunEntry()`（`:1895-1909`）**每次面板生命至多消费一次**。⇒ 主题①要的**多步确定性 wizard**（识别缺什么 → 逐步引导 → 配置完成 → 续接）**没有形态**；且首装与"已装未配 LLM"是**两个不同场景**，后者（主题①的核心场景）**当前零覆盖**。 | 首装 / 已装未配；深度 = 明显痛点；频率 = 每次新环境 |
| **Q-SELF-009** | **后台 ask 在回合结束后无驱动者（与 Q-SELF-005 ② 同源）。** `askBridge.settle(rid, …)`（`service-worker.ts:2813-2822`）是后台 ask 的唯一结算点；它只在**在飞 `runChatTurn`** 内被 await。回合已结束 ⇒ `settle` 返回 `false` ⇒ `errorResponse('无待回答的 ask-user 请求：<rid>')`。面板侧 `submitAskFor` 对非 ref 的 `rid` 仍会 `send(ask-user-response)`（`sidepanel.ts:2576-2578`），**但 SW 端无人接**。 | 后台 ask（工具内澄清问题）；深度 = 中；频率 = 回合结束后的迟到作答 |
| **Q-SELF-010** | **AI 主动发起 op 的安全边界未定义。** v5 立下**特权 op 恰 2**（`op.authorize` / `op.perm.request`，`layer:'sw'`，`ops.ts:24` 逐字：「the pipeline never calls…」），且在册事实 = **它们必须由用户手势触发**（`test/capability-wiring.test.ts:51-58` 逐字「SW 永不调用 `.request(`」）。但 **AI 可主动发起哪些 op 的清单不存在**，也没有判据区分"AI 可自主"（低风险：`op.pick` / `op.describe` / `op.help` / `op.detect?`）与"必须用户确认"（`op.authorize` / `op.perm.request` / `op.revoke` / `op.llm-config`）。⇒ 若"AI 主动"无边界约束地落地，会**直接违反**既有安全红线。 | 全部 op；深度 = 中高（安全）；频率 = 一次性（本轮裁决） |

### 3.3 潜在问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-SELF-011** | **半驱动者堆积风险（诊断建议：不要第二份半驱动者）。** 现状已有**多处**推荐求值调用点（`sidepanel.ts:1909/2241/2383/2453/3281/3380/3399`）+ 两条 S2 续流路径。若主题②以"再加一处 `maybeRecommend('answered')`"的方式落地，会形成**第二份半驱动者**（与既有 7 处并列），语义漂移 / 求值顺序不可判 / 防环无主。⇒ **需要"驱动者"的统一设计（注册表化 vs 调用点散落）**，本项为**风险预登记**（取舍留给 spec，O-SELF-003）。 | 架构可扩张性；深度 = 中高；频率 = 一次性（本轮设计决策） |
| **Q-SELF-012** | **AI 主动启动与用户手输的并发语义未定（composer 双发）。** `runChat` 首行即 `if (chatBusy) → '上一条消息仍在处理中，请稍候再发送。'`（`service-worker.ts:879-885`，**丢弃**）。⇒ 若 AI 主动发起回合时用户也在打字，**其中一条会被静默丢弃**（用户只看到一句错误）。AI 主动性的**并发 / 仲裁语义**当前无定义。 | AI 主动 + 用户输入的交叉面；深度 = 中；频率 = 偶发（但一旦发生 = 用户输入丢失） |
| **Q-SELF-013** | **打扰控制 / token 成本 / 防环无判据。** v5 有防抖常量（`NEXTSTEP_MIN_INTERVAL_MS` = 10 s、单卡 ≤3 chip、每回合推荐卡 ≤1，`recommend.ts:43,46,56`）与「每次面板生命至多消费一次」（首装）。但"AI 主动"一旦成立，会引入**新的**成本面：主动回合的 **token 消耗**、**主动跨轮**、**自触发环**（AI 主动 → 产生 next → 又主动 → …）。⇒ 三条控制（打扰 / 成本 / 防环）**当前零判据**。 | 成本与稳定性；深度 = 中高；频率 = 持续（若无限主动） |
| **Q-SELF-014** | **冻结面与体积余量。** 现行实测：`dist/content.js` = **177,076 B**（sha `52a82620…`，**零容差**）· `dist/pick-layer.js` = **34,358 B**（sha `77796bab…`，**零容差**，R4 `0a60740` 显式解冻重登记后 `PICK_LAYER_CEILING = PICK_LAYER_BASELINE_BYTES`，`test/size-baseline.ts:2510-2516`）· `dist/sidepanel.js` = **549,609 B**（`SIDEPANEL_BASELINE_BYTES = 549_609`，`test/size-baseline.ts:329`）≤ 生效上限 **577,089 B** = `floor(549,609 × 1.05)` ⇒ **余量 27,480 B（+5.00%）**；档位 **563,200 B**（距 13,591 B）/ 绝对上限 **619,520 B**。**`KIND_SET` 恰 40 项逐字**（`messaging.ts:103-141`，被 `content-script.ts:20` 打进 `content.js`）。⇒ 本 Feature 若需新消息族 / 新卡 / 新容器，**必须先过红线**（登记为 `X-SELF-?` / `N-SELF-?`）。 | 体积门禁 + 红线；深度 = 中高（可管理但**必须预算评估**）；频率 = 每轮 |
| **Q-SELF-015** | **v5 资产是新底座、也是新耦合：`op.turn` 槽是"唯一回合入口"的双刃。** `bindPanelOps.turn`（`sidepanel.ts:3255-3256`）为 `op.turn` 提供回合入口，使"推荐 chip → 回合"可注册；**同时**门禁把 `requestTurn(` 钉死恰 2 处 ⇒ 任何"让系统/AI 发回合"的尝试都会**先撞门禁**。⇒ 本 Feature 必然触发**门禁等价重锚**（取代 vs 并存两读法，O-SELF-005），是**工作量与风险的最大不确定面**。 | 门禁迁移面；深度 = 中高；频率 = 一次性（本轮） |

---

## 4. 竞品参考

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

**未做**外部竞品调研（如"主动式浏览器助手 / copilot 如何在用户沉默时推进""agent 主动发起 vs 用户手势的边界"）。v5 的架构对标物（`deepseek-ai/deepseek-harness`，已 gh 核实）由作者在设计稿阶段确认，本 Feature **未新增外部对标**。

> **不得**据此声称「竞品也这么做」或「无竞品这么做」。若 spec/plan 认为需要外部参照（"主动式助手的打扰控制 / 安全边界"是该领域成熟话题），应显式登记为待调研项（O-SELF-007）。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

> 本节只记录「本仓库已存在、已验收、可复用」的机制先例——它们是**事实**，不是推荐方案。

| 参照 | 事实 | 与 v5.5 的关系（只述差异，不评优劣） |
|---|---|---|
| **S2 断流自动续流（v5 首验收，既有）** | 「阻塞解除 → **自动恢复**」已机器化：`test/s2-deadend-chain.test.ts`（10 环节可判 / 死端 = 0 / 拒绝非死端 / 反向证明）+ `test/ui/no-dead-end.mjs`（CHROMIUM 门禁） | v5.5 的**最近邻先例**：v5 证明"自动接续"可行（阻塞解除→续流）；v5.5 问的是**更广的接续面**（已答 / 已描述 / 绑定完成 / …）。差异：v5 的触发源是"阻塞事实解除"，v5.5 的触发源是"**用户已表达意图**"（语义更宽，需新时机源） |
| **`op.llm-config` / `op.perm.request`（v5 修复 op，既有）** | `OPS_RECOVERY_ROWS`（`providers.ts:57-58`）+ `BLOCKED_RECOVERY_TRIGGER`（`definition.ts:60-68`）：`llm.unconfigured` / `perm.missing` 的修复 next **就是 op 自身** | 主题①的**现成终点**：v5 已有"配置 LLM"这个 op（掩码 secret 卡 + 值直达 key-store + 法八零明文）⇒ 主题①**不必新造配置面**，缺的是**主动性触发 + 多步引导 + 配置后续接**（**事实，非承诺**） |
| **`maybeRecommendFirstRunEntry()`（v4.5，既有）** | 「每次面板生命**至多消费一次**」的事件化入口（`sidepanel.ts:1895-1909`），并要求两条事实均已到位（`llmLoaded` + 已应用一次 `state` 回包）以避免半加载误推荐 | 主题①的**防重复先例**：若做"主动驱动"，必须继承"事件化 + 至多一次 + 事实到位"三纪律，否则打扰 / 重复推荐 |
| **`RecommendTrigger` + provider `when(ctx)`（v5 契约 v2，既有）** | 候选 = **注册表纯谓词**（`when(ctx)`），求值时机 = **外部传入的 trigger**（4 项闭集）；`handleCardAction` per-op **diff = 0** | 主题②的**现成扩张面**：新增"驱动者"最自然的落点是**新增 trigger 值 / 新增 provider**（走注册表），而不是改主流程——但 `RecommendTrigger` 类型与 4 项闭集**当前被钉死**（需显式取代，O-SELF-005） |
| **`chatBusy` 单飞回合（v4，既有）** | `runChat` 首行 `if (chatBusy) → 丢弃并回错误`（`service-worker.ts:879-885`） | AI 主动性的**既有硬约束**：系统**不能**并发两个回合；若 AI 主动发起与用户手输撞车，必有一条被丢（Q-SELF-012） |
| **`askBridge`（FR-017/R7，既有）** | 后台 ask 的唯一结算点，**失败 / 超时 fail-closed**（`service-worker.ts:465-471` + `:2813-2822`） | 主题①②的**风险面**：ask 结算与回合生命周期**强耦合**（回合结束 ⇒ 无待答 ⇒ 无驱动者），Q-SELF-009 |
| **法七机器化门禁（v5，既有）** | `no-dead-end.mjs` 判 5 类阻塞终态 + `gist-design-map.ts` F1~F11 逐条映射设计稿 | v5.5 的**判据底座**：扩展"终态词汇"可**复用该门禁形态**（双向反证 / 注入必红）——**事实，非承诺** |

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| **A-SELF-001** | 「已表达意图之后无人接手」是**系统性**的（不止 ref 回合 ask 一处）：已答 ask（3 种）/ 已交描述 / 绑定完成 / 拾取完成 / 探测稳态 / 授权回执 / 回合结束——**每处都可复制"驱动者缺位"** | 逐处核对源码链已证：ref ask（R1/R2 已证）/ describe（R6 已证）/ 后台 ask（Q-SELF-009 已证）/ 绑定-探测（Q-SELF-007 已证）/ 回合结束（idle 推荐**是**驱动者，**反例**则需 spec 复核）——**部分待验证** |
| **A-SELF-002** | 「主动帮用户」在**当前架构下**不可达，且**不是**缺一个 chip：回合入口（`requestTurn` 恰 2 处）+ 时机闭集（4 项）**双锁** | 门禁逐字：`test/op-wiring.test.ts:117-124` + `sidepanel.ts:1791`——**已证** |
| **A-SELF-003** | 主题①的"确定性系统流"**不需要 LLM**（纯代码可判），因此**不消耗 token** 且**可机核** | 主题①逐字（"由系统代码流程…**不是 AI**"）+ `runChat` 无门禁事实——**已证（设计口径）**；实现面待 spec |
| **A-SELF-004** | 主题①的"配置完成 → 自动续接悬置任务"**可以复用** S2 自动续流范式（阻塞解除→自动恢复） | 需 spec 裁决：S2 的续接对象是"阻塞前的任务"，主题①的续接对象是"配置前用户想做的事"——**语义是否同构待验证**（O-SELF-002） |
| **A-SELF-005** | 特权 op 恰 2（`op.authorize` / `op.perm.request`）**必须**保留用户手势，AI **不可**自动执行——这是**不可让渡**的安全红线 | `ops.ts:24` + `test/capability-wiring.test.ts:51-58`（逐字「SW 永不调用 `.request(`」）——**已证（既有红线）**；须在 spec 显式继承（N-SELF-005） |
| **A-SELF-006** | AI 主动性的安全边界可**穷举为一张清单**（哪些 op 可自主 / 哪些须用户确认），且可**机器化** | 参照 v5 的 `obligation-table.ts`（证明义务表静态机核）与 `op-wiring` 门禁形态——**待验证**（O-SELF-004） |
| **A-SELF-007** | 引入"驱动者"**不需要**新增卡类型 / 不需要新增流内固定宿主（v4.5 的零宿主判据 `REGISTERED_STRUCTURAL_HOSTS = []` 可保持） | 待 spec 裁决：AI 主动若需可见载体，可能需新卡或新容器 ⇒ **直接撞 v4.5 判据 + v5 的 12 kind 契约**（O-SELF-006） |
| **A-SELF-008** | 体积可在余量内完成：`sidepanel.js` 现 **549,609 B**，余量 **27,480 B（+5.00%）** | `npm run build` + `stat -c %s dist/sidepanel.js` + 逐模块 metafile 归因；**禁止**在预算未评估前排"全量落地"——**待验证**（Q-SELF-014） |
| **A-SELF-009** | `content.js` 零容差红线可保持（**不**往 `KIND_SET` 加字符串；新消息族若有，走 type-only 先例） | 复跑 `npm run build` + `stat` + sha 逐字节命中 `52a82620…` + `test/content.test.ts` —— **待验证** |
| **A-SELF-010** | 本轮 `.sddu/**` 只写本 Feature 目录、`src/` `test/` `dist/` `design/` `docs/` `ROADMAP.md` 零改动 | `git status --short` + `git diff --quiet -- packages/web-cli-plugin` 复核（**本轮已遵守**） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 | 预登记证据 / 应对方向（**不作方案承诺**） |
|---|---------|:--:|---|
| **R-SELF-001** | **安全边界被"主动性"侵蚀（最高危）**：AI/系统主动发起若不加边界，会撞**特权 op 恰 2 必须用户手势**（`op.authorize` / `op.perm.request`）+ `SW 永不 .request(` 判据 + `zeroDiffFiles`（`policy.ts` / `auto-authorize.ts` 内容哈希 pin）⇒ 可能**打开权限提升面** | **高** | `ops.ts:24` + `test/capability-wiring.test.ts:51-58` + `docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项）+ v5 `N-06`/`N-07`（安全小项 deferred：SW 无发送方校验 / 能力在册校验） |
| **R-SELF-002** | **门禁取代面（`requestTurn` 恰 2 处 + `RecommendTrigger` 4 项 + provider `when` 抑制）**：任何"让系统/AI 发回合"的改法都先撞门禁；取代 vs 并存两读法**工作量差一个量级** | **高** | `test/op-wiring.test.ts:117-124` + `sidepanel.ts:1791` + `next-registry/providers.ts:136-148` + `recommend.ts:52,56`（`NEXTSTEP_PRIORITY` / 常量） |
| **R-SELF-003** | **半驱动者堆积 / 时机语义散落**：若以"再加一处 `maybeRecommend(...)`"落地，会形成第二份半驱动者（现状 7 个调用点并列），求值顺序 / 防环 / 去重无主 | **中高** | `sidepanel.ts:1909/2241/2383/2453/3281/3380/3399`（7 个生产调用点）+ `recommend.ts:43,46,56`（防抖常量）+ v5 `Q-ALLN-003` 同构（"新增操作必须改主流程"） |
| **R-SELF-004** | **token 成本 / 自触发环无判据**：AI 主动一旦成立，"主动 → 产 next → 又主动"可能形成环；且主动回合**真实消耗 token** | **中高** | 无既有判据（零基线）；参照 `NEXTSTEP_MIN_INTERVAL_MS = 10_000` / 单卡 ≤3 / 每回合卡 ≤1 + `chatBusy` 单飞（`service-worker.ts:879`） |
| **R-SELF-005** | **`content.js` / `pick-layer.js` 零容差 + `KIND_SET` 40 逐字**：若驱动者需新消息族而误入 `KIND_SET`，直接撞红线（历史 +307 B / 6 字符串） | **高** | `test/size-baseline.ts:2703`（`CONTENT_MAX_BYTES = 177_076`）+ `:2510-2516`（`PICK_LAYER_* = 34_358`，零容差）+ `messaging.ts:68-89`（type-only 先例）+ v5 `X2` |
| **R-SELF-006** | **体积余量仅 27,480 B（+5.00%）**：本 Feature 若含"驱动者注册表 + 主动时机 + 引导 wizard + 安全清单"，体量存在越限可能（v5 段 plan Σ 预算曾低估 **2.8×**） | **中高** | `test/size-baseline.ts:329`（`549_609`）+ `test/size-budget.test.ts`（ceiling `577_089`）+ 档位 `563,200` / 绝对上限 `619,520` + v5 closeout（预算低估 2.8× 如实登记） |
| **R-SELF-007** | **法七扩展的判据真空**："已答 ask 入终态"目前**无任何门禁**（`no-dead-end.mjs` 只判 5 类阻塞）⇒ 修了无回归保护；且"已答"的**判定口径**（谁算已答？超时？取消？）未定 ⇒ 可能造出**恒真断言**（v4.5 教训：反证恒绿三类缺陷） | **中高** | `test/ui/no-dead-end.mjs` + `test/s2-deadend-chain.test.ts:39-53` + `gist-design-map.ts:77-87` + v4.5 closeout §4 第 6 条（反证恒绿三教训） |
| **R-SELF-008** | **`askBridge` 生命周期耦合**：后台 ask 结算依赖在飞回合；"让 ask 答案总能被接住"需要动 **SW 回合生命周期**（`chatBusy` / `runChatTurn` / `persistChatHistory`） | **中** | `service-worker.ts:465-471`、`:878-941`、`:2813-2822` + `test/ask-auth-inflow.mjs`（71 断言，v5 后计数） |
| **R-SELF-009** | **零宿主判据 / 12 kind 契约**：AI 主动若引入流内固定容器或新卡类型，直接违反 v4.5 `REGISTERED_STRUCTURAL_HOSTS = []` 与 v5「零新增卡类型」 | **中** | `host-registry.ts:105,187,200` + `test/host-registry.test.ts` + `stream-model.ts:72-78`（12 kind）+ v5 `N19` |
| **R-SELF-010** | **门禁严格串行 + 既知环境 flake**（`KL-N-10`：`test:binding` 首轮偶发红且每次失败项不同）⇒ 重构轮会被误读为回归 | **低** | v5 closeout §8 第 9 条 + `docs/v4-supersession-ledger.json#knownLimitations`；纪律 = 隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞 |
| **R-SELF-011** | **断言只增的门禁规模**：现行基数（v5 后）`npm test` **1181** · l0 248 · density 242 · journey 171 · binding 192 · ask-auth 71 · stream 73 · recommendation 65 · dead-end 39 · law8 25 · auth-chip 37 · design-contract 19… **只增不减**；本 Feature 新增判据会叠加大批量断言 + 可能的等价重锚 | **中** | v5 closeout §3 / §4（新门禁 11 项）+ `test/gate-integrity.test.ts`（`CHROMIUM_GATES === 9` 不动） |
| **R-SELF-012** | **方案先行风险**：主题①②的**触发时机 / 安全边界 / 打扰控制**若在 spec 前被"顺手定下"，会绕过开放点裁决 ⇒ 作者母理念被窄化为一个实现 | **中高** | 编排器 D2（开放点收集后附推荐，spec 批量裁决）+ 本报告 §7.4 O-SELF-001~007 **全部附推荐但未定论** |

### 5.3 风险预登记摘要（**Top5 + 门禁迁移量估计**）

> 口径：以下计数为**静态引用规模**（本报告逐条 `file:line` 给出的证据规模），用作**工作量上界**参考；**不是**「要改的断言数」（等价重锚可能一条多改）。**discovery 不做估算承诺**。

**Top5（按「阻塞程度 × 影响面」排序）**：

| 序 | 风险 | 为什么是 Top5 |
|:-:|---|---|
| 1 | **R-SELF-002 门禁取代面** | 决定 v5.5 是「新增驱动者层」还是「重构回合/时机层」；`requestTurn` 恰 2 处 + `RecommendTrigger` 4 项双锁，若读法错，工作量差一个量级 |
| 2 | **R-SELF-001 安全边界** | 唯一**红线级**风险（特权 op + `zeroDiffFiles` + `SW 永不 .request(`）；"主动性"若边界不清 = 权限提升面 |
| 3 | **R-SELF-003 + R-SELF-004 半驱动者堆积 / 防环** | 决定「驱动者」是**注册表化**还是**第 8 个调用点**；影响架构可扩张性与长期成本 |
| 4 | **R-SELF-007 法七扩展判据真空** | 本 Feature 唯一"验收锚"（会话 B 静默）；无可判据 ⇒ 修了会再退化，且易造恒真断言 |
| 5 | **R-SELF-005 + R-SELF-006 红线与体积** | `content.js` 零容差 + `KIND_SET` 40 逐字 + 余量 27,480 B = **两条零容差 + 一条预算偏紧** |

**门禁迁移量估计（静态引用规模）**：

| 组 | 对象 | 涉及门禁文件数 | 主要门禁 |
|---|---|:--:|---|
| 回合入口 / 驱动时机 | `sidepanel.ts`（`requestTurn` 恰 2 处 + 7 个 `maybeRecommend` 调用点）+ `RecommendTrigger` 4 项 + `recommend.ts`（`NEXTSTEP_PRIORITY` / 3 常量） | **4~6** | `op-wiring.test.ts` / `local-act-wiring.test.ts` / `recommendation-sources.test.ts` / `test/ui/recommendation.mjs`（65）/ `test/ui/no-dead-end.mjs` |
| ask 生命周期 | `sidepanel.ts:2557-2588` + `pipeline.ts:83-90` + `service-worker.ts:2813-2822` + `askBridge` | **3~4** | `ask-auth-inflow.mjs`（71）/ `test/ui/stream.mjs`（73）/ `op-wiring.test.ts` |
| 引用动作 | `applyRefAction` + `l1/ref-store.ts:280-292`（`dispatch` / `commandSends`） | **3** | `test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` / `test/ui/page-input.mjs`（108） |
| 主题① 配置流 | `service-worker.ts:878-941`（`runChat`）+ `sidepanel.ts:1298-1302`（`noteLlmBlockedFact`）+ `providers.ts`（`OPS_RECOVERY_ROWS`） | **3~4** | `test/ui/stream.mjs` / `ask-auth-inflow.mjs` / `test/recommendation-sources.test.ts` |
| 安全边界 | `ops.ts`（特权恰 2）+ `capability-permissions.ts` + `manifest.json` + `zeroDiffFiles` | **4** | `capability-wiring.test.ts` / `binding-wiring.test.ts` / `test:zero-injection`（28）/ `hardening`（24） |
| 红线（消息族） | `background/messaging.ts`（`KIND_SET` 40 / type-only）+ `content-script.ts` import 边 | **2~3** | `content.test.ts` / `pick-layer-budget.test.ts` / `op-protocol`（先例） |
| 体积链 | `SIDEPANEL_BASELINE_BYTES=549_609` / ceiling `577_089` / `RE_REGISTRATIONS` / `GROWTH_BREAKDOWN` | **4** | `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts`（12） |
| 流 / 卡契约 | `stream-model.ts`（12 kind / 终态 / `MAX_OPEN_ASKS`）+ 宿主判据 | **3~4** | `test/ui/stream.mjs`（73）/ `host-registry.test.ts` / `test/ui/l0.mjs`（248） |
| 保护 pin | journey `43054..58287` / sha `cc79f413…` / 240 行；binding `107780..115930` / sha `be9ad0e9…` | 2 段 | `supersession-ledger.test.ts`（36，八步 + RP-V4-08 + `knownGap` 机核） |

---

## 6. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | **先裁决 §7.4 开放问题（O-SELF-001~007）**，特别是 **O-SELF-002（主题①触发时机与终点）**、**O-SELF-003（驱动者统一形态：注册表 vs 散落调用点）**、**O-SELF-004（AI 可主动发起的 op 清单 / 安全边界）** | 三者决定 v5.5 的**结构层级**（新增层 vs 重构层）与叶拆分；不裁决则任务无法排 |
| 高 | **把 R-SELF-001 安全边界写进 spec 的范围与验收**：特权 op 恰 2 必须用户手势（AI 不可自动）+ `zeroDiffFiles` 零触碰 | **零容差红线**；判据必须**等价改写**（不是放宽） |
| 高 | **确立法七扩展的判据形态（Q-SELF-005 / R-SELF-007）**：「已答 ask」入终态词汇 + 双向反证 + 注入必红（禁恒真断言） | 会话 B 是本 Feature 的验收锚；无可判据 = 缺陷可复发 |
| 高 | **体积预算评估（Q-SELF-014）**：先算 `sidepanel.js` 净增上下界，再决定是否拆叶控体积 / 是否预登记档位调整 | 余量 27,480 B；**禁止**在预算未评估前排"全量落地"（v5 教训：plan Σ 低估 2.8×） |
| 中 | **裁决驱动者形态（Q-SELF-011 / O-SELF-003）**：注册表化（新增 provider / 新 trigger）vs 新增第 8 个调用点 | 决定是否触发 `RecommendTrigger` / `requestTurn` 门禁的显式取代 |
| 中 | **裁决主题①是否复用 S2 自动续流范式与既有 `op.llm-config`（A-SELF-004）** | 复用 = 少造面；不复用 = 需新配置面（与 v5 的 9 op 面重复） |
| 中 | **裁决并发 / 打扰 / 成本 / 防环三控制（Q-SELF-012 / Q-SELF-013 / O-SELF-006）** | AI 主动性的**必要护栏**；不裁决则"主动"落地即为隐患 |
| 低 | **外部竞品调研（如需，O-SELF-007）**：若 spec/plan 认为"主动式助手的安全边界"需要外部参照，显式登记为待调研项 | 本轮未执行，不编造结论（§4.1） |

### 6.1 F-33 占用复核结果（**本轮实测**）

| 项 | 实测命令 / 结果 | 结论 |
|---|---|---|
| `F-30` / `F-31` / `F-32` | `grep -c` → 已占用（v4-chat / v4.5 / v5 均已收口） | 已用 |
| **`F-33`** | `grep -c "F-33" .sddu/specs-tree-root/ROADMAP.md` → **0** | **未占用** |
| `F-33` 仓库其他命中 | `grep -rn "F-33"`（排除 `node_modules` / `.git`）→ **2 处** | 唯一命中 = v4.5 `discovery.md:290` + v5 `discovery.md:320` 的**表格说明文字**（「未占用（备查）」）——**是文字说明，不是 Feature 登记，不构成占用** |
| **编号结论** | — | **登记为 F-33 即可，无需顺延**；本轮**不改 ROADMAP**（登记留给收口） |

### 6.2 版本位核验（**本轮实测**）

| 项 | 实测 | 结果 |
|---|---|---|
| ROADMAP 文档版本 | `> **文档版本**: 1.29.0`（v5 收口后） | — |
| **`v0.11.0`** | `grep -c "v0.11.0" ROADMAP.md` → **0** | **未占用 ⇒ 全新版本位** |
| `v0.10.0` | 已存在（8 处「AI 增强与生态」规划段 + **F-32 登记行**） | v5 已占 |
| 同版并列先例 | `v0.9.0` = 三主题并列（工程质量 / F-28 / F-30）；`v0.10.0` = 同版并列新主题（「AI 增强与生态」+ F-32） | **有先例可循** |
| **版本位结论** | — | **建议采纳 `v0.11.0`（全新版本位，F-33 为其新主题）**；登记留给收口；`F-29` 区段**一字不动**；本阶段 ROADMAP **零 diff** |

> **⚠️ 命名与版本位的语义辨析（须 spec / 收口显式确认，O-SELF-001）**：本 Feature 目录命名为 `v55`（= v5.5），**承 `v45` = v4.5 的系列惯例**；但 v4.5（F-31）的版本位是 **v0.9.1「v4 的维护收尾」**，语义 = **维护轮**。而本 Feature 的版本位被编排器定为 **v0.11.0（并列新主题，非维护段）** ⇒ **命名（v55 = 维护语义）与版本位（v0.11.0 = 新主题语义）存在语义错位**。两种自洽读法皆可（见 O-SELF-001 候选 + 推荐），本报告**按编排器给定执行**并在开放点中如实登记。

### 6.3 建议的叶子拆分草案（**供 spec 参考；discovery 只提建议不执行**）

> 依据：主题的**取代对象 / 门禁面 / 台账条目**是否重叠。**共同风险 = 驱动者层是共享底座**（回合入口 + 时机源），故建议**先定底座、再做两主题**。

| 叶 | 名称（建议） | 内容 | 依赖 |
|:-:|---|---|---|
| v5.5-1 | `specs-tree-v55-1-driver-layer`（**驱动者层 + 法七扩展**） | 驱动者形态定论（注册表 vs 调用点）+ `'answered'` 等时机源 + 已答 ask 入终态词汇 + `applyRefAction` 答案不再丢弃 + `submitDescribe` 旁路死端 + 死端守护门禁扩展（双向反证）；**S2 / 会话 B 断流样板机器化**（首验收） | —（P0，底座） |
| v5.5-2 | `specs-tree-v55-2-deterministic-onboarding`（**主题① 确定性系统流**） | LLM 缺席的确定性引导（多步 wizard 形态，非 AI）+ `runChat` 配置门禁（主动式）+ 配置完成 → 续接悬置任务（S2 范式复用为候选）+ 首装 / 已装未配两场景 | v5.5-1（时机源与驱动者底座） |
| v5.5-3 | `specs-tree-v55-3-ai-driven-orchestration`（**主题② AI 驱动编排**） | AI/系统启动回合的机制 + 安全边界清单（可自主 / 须确认的 op 清分）+ 打扰 / token / 防环三控制 + 并发仲裁（`chatBusy` 语义）+ 门禁等价重锚 | v5.5-1（底座）+ v5.5-2（主题①的确定性对照面） |

> **父 Feature** = 轻量规范容器（同 v3-ui / v4-chat / v4.5 / v5 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**）。
> **若 spec 判定主题①②不可分割**（共享驱动者底座且体积必须一次重登记），可退化为**单叶 + 内部分组**——**登记为 O-SELF-002 的连带开放点**。

---

## 7. 附录

### 7.1 现状基线（**全部带 `file:line` 证据；本轮只读实测**）

#### A. 驱动者缺位：回答路径的四层根因（Q-SELF-001 / 002 的对象）

| # | 事实 | 证据（`file:line`） |
|:-:|---|---|
| A1 | `submitAskFor` 是 ask 答案的**唯一**结算实现；ref 回合作答走 `applyRefAction` | `sidepanel.ts:2557-2588`（`isRef` / `refId` 派生 + `:2587` `if (refId && !isCanceled && trimmed) applyRefAction(refId, trimmed);`） |
| A2 | 面板本地 op `params` ask 走 `opAskResolvers` —— **正确驱动 op**（不是缺口） | `sidepanel.ts:2562-2570`（`settleOp` 分支）+ `pipeline.ts:83-90`（`resolvePending`） |
| A3 | 非 ref 的 `rid` 走 `send('ask-user-response')` —— 交给后台，**但后台只在在飞回合内结算** | `sidepanel.ts:2576-2578` + `service-worker.ts:2813-2822`（`askBridge.settle`，未命中 ⇒ `errorResponse`） |
| A4 | `applyRefAction` **只裁决、不发回合** | `sidepanel.ts:2177-2189`（全文；`dispatchRefAction` → 失败仅 `notice`） |
| A5 | `ref-store.dispatch` 通过有效性后**唯一副作用 = `sends += 1`**；`commandSends()` **零 `src/` 消费者** | `l1/ref-store.ts:280-291`（`:290` `sends += 1;` / `:291` `return {allowed:true,...}`）+ `:292` `commandSends: () => sends`；消费者仅 `test/ui/l1.mjs:516-519` / `test/ui/page-input.mjs:241` / `test/l1-ref-validity.test.ts:171,175,437` |
| A6 | `requestTurn` 是**唯一**回合发起入口；`op-wiring` 门禁**钉死恰 2 处调用点** | `sidepanel.ts:277-297` + 调用点 `:3232`（composer submit）+ `:3256`（`bindPanelOps.turn`）；门禁 `test/op-wiring.test.ts:117-124` |
| A7 | `ref-action` provider 的 `when` 含 `openAsks === 0` ⇒ ask 开着时抑制 | `next-registry/providers.ts:136-148` |
| A8 | `RecommendTrigger` 恰 **4 项**，**无 `'answered'`** | `sidepanel.ts:1791`（`type RecommendTrigger = 'pick' \| 'stale' \| 'idle' \| 'firstRun'`） |
| A9 | 推荐器**生产调用点**仅 7 处（firstRun / stale / pick×2 / idle×3） | `sidepanel.ts:1909`（firstRun）`:2241`（stale）`:2383`（pick, force）`:2453`（pick）`:3281`（idle, force）`:3380`（idle）`:3399`（idle, 受 `openAsks===0` 门控） |
| A10 | 「改用描述」只 `dispatch` 从不 `send` | `sidepanel.ts:2541-2546`（`submitDescribe`）+ 调用点 `:3260` |
| A11 | S2 自动续流先例（阻塞解除 → **自动恢复**）已机器化 | `.sddu/.../v5-all-in-next/closeout.md:189` + `test/s2-deadend-chain.test.ts:39-53`（`S2-2-dead-end-zero` / `S2-4-refusal-not-dead-end`） |
| A12 | 死端判据**只判 5 类阻塞**（不含"已答 ask"） | `test/ui/no-dead-end.mjs` + `test/gist-design-map.ts:77-87`（F1~F11） |

#### B. 主题① 的对象：LLM 缺席路径（Q-SELF-003 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| B1 | `runChat` **无配置门禁**：`chatBusy` 检查后直接 `keys.load()` → `providerById` → `providerChat` | `service-worker.ts:878-941`（`:879-885` chatBusy；`:893-894` load / provider；`:901-907` providerChat） |
| B2 | 未配置时**表现为 LLM 错误事件** | `service-worker.ts:920-921`（`onLLMError` → `llmErrorEvent`）+ `:925`（`onFinish` → `variant:'done'`） |
| B3 | `llm.unconfigured` 阻塞事实**只在 op 分支被动写入**（"observed block event"） | `sidepanel.ts:1290-1302`（`observedBlocked` + `noteLlmBlockedFact`；注释逐字：「their fact is an **observed block event**（the repairing op failed / was refused），not a static preference」） |
| B4 | `llm.unconfigured` / `perm.missing` 的修复 next **即 op 自身** | `next-registry/providers.ts:57-58`（`OPS_RECOVERY_ROWS`）+ `definition.ts:60-68`（`BLOCKED_RECOVERY_TRIGGER`，两者为 `null` = op-driven） |
| B5 | `onboarding` provider 仅首装 + `pendingSteps` 恒 `['授权当前站点']` | `providers.ts:125-134` + `sidepanel.ts:1835-1836` / `:1094` |
| B6 | 首装入口「每次面板生命至多消费一次」 | `sidepanel.ts:1895-1909`（`maybeRecommendFirstRunEntry`） |
| B7 | 设置视图 8 分区承载全部配置面（LLM / 授权 / 能力 / 会话 / 诊断…） | `src/ui/settings/sections.ts:35-44` + `settings/panel.ts:130-179`（`#settings-apiKey:153`） |

#### C. 主题② 的对象：AI 驱动与安全边界（Q-SELF-004 / 010 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| C1 | 特权 op 恰 2（`op.authorize` / `op.perm.request`），`layer:'sw'` | `next-registry/ops.ts:24`（逐字「the pipeline never calls…」）+ `:307`（`op.authorize`）+ `:317`（`op.perm.request`） |
| C2 | 「SW 永不调用 `.request(`」判据（可申请权限**必须**用户手势） | `test/capability-wiring.test.ts:51-58` |
| C3 | 9 op 清单 + `op.turn` 为唯一回合入口 | `ops.ts:290-332`（`OPS_BY_ID`）+ `sidepanel.ts:3255-3256` |
| C4 | 契约 v2 注册表（`when(ctx)` 纯谓词 + `chips` = opId）+ 4 规则 provider | `next-registry/registry.ts` + `providers.ts:120-158` + `recommend.ts:52`（`NEXTSTEP_PRIORITY`） |
| C5 | `chatBusy` 单飞；并发第二条**被丢弃** | `service-worker.ts:879-885` |
| C6 | AI 驱动权**止于回合内**（thinking / command / tool 指示器） | `service-worker.ts:908-926`（`onAssistantText` / `onCommandLine` / `onToolOutput`） |
| C7 | 判定链冻结（内容哈希 pin） | `docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项，含 `src/security/policy.ts` / `auto-authorize.ts`） |
| C8 | v5 deferred 安全小项：SW **无发送方校验**（`op-exec` 与 `authorize` 同等可伪造）；`op.perm.request` 在册判据在页侧 | v5 closeout §8 第 1、2 条（`N-06` / `N-07`） |

#### D. 流 / 卡 / 宿主契约（Q-SELF-005 / 014 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| D1 | **12 kind** 契约（7 主类 + 5 过程卡）；v5 已立「零新增卡类型」 | `stream-model.ts:72-78` + v5 `N19` |
| D2 | 6 终态 + `MAX_OPEN_ASKS = 2` + `ASK_CANCEL_REASONS` 4 项 | `stream-model.ts:86-121` |
| D3 | 零宿主判据：`REGISTERED_STRUCTURAL_HOSTS = []`（v4.5 清零） | `host-registry.ts:105,187,200` + `test/host-registry.test.ts` |
| D4 | 法八四面零明文机核（掩码 secret 卡 + 值直达 key-store） | `test/ui/law8-plaintext.mjs`（25 断言）+ v5 `X`/`ADR-V5-010` |
| D5 | `KIND_SET` **恰 40 项逐字**；`content-script.ts` import 该模块 ⇒ 打进 `content.js` | `messaging.ts:103-141`（本轮实测 40 项）+ `content-script.ts:20` |
| D6 | type-only 先例家系（`command-policy` / `pick-layer-*` / `ref-rescue` / `op-*`） | `messaging.ts:68-89` + `content/pick-protocol.ts:9-15`（历史 +307 B 实测） |

#### E. 体积与冻结面（**本轮实测**）

| # | 项 | 值 | 来源 |
|:-:|---|---|---|
| E1 | `dist/content.js` | **177,076 B** / sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | 本轮实测 + `test/size-baseline.ts:2703`（`CONTENT_MAX_BYTES`，零容差） |
| E2 | `dist/pick-layer.js` | **34,358 B** / sha256 `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e` | 本轮实测 + `test/size-baseline.ts:2510-2516`（`PICK_LAYER_BASELINE_BYTES = PICK_LAYER_CEILING = PICK_LAYER_FINAL_ARTIFACT_BYTES = 34_358`，**零容差**；R4 `0a60740` 显式解冻重登记，前值 **33,900**） |
| E3 | `dist/sidepanel.js` | **549,609 B** | 本轮实测 + `test/size-baseline.ts:329`（`SIDEPANEL_BASELINE_BYTES = 549_609`） |
| E4 | 生效上限（公式） | **577,089 B** = `floor(549,609 × 1.05)` | 计算（单轮容差 **5%** 未动） |
| E5 | 余量 | **27,480 B（+5.00%）**；距档位 **13,591 B**；距绝对上限 **69,911 B** | 计算（563,200 − 549,609 = 13,591；619,520 − 549,609 = 69,911） |
| E6 | 档位 / 绝对上限 | **563,200 B** / **619,520 B**（= 档位 × 1.10）；`authorConfirmation.status = pending-author-line` | v5 closeout §5 / §8 第 12 条（**未闭合义务，不得伪称已确认**） |
| E7 | `KIND_SET` 项数 | **40**（逐字，本轮实测） | `messaging.ts:103-141` |
| E8 | 门禁计数（**引自 v5 收口总账 §3，本轮未复跑**） | `npm test` **1181** · law8 **25** · dead-end **39** · auth-chip **37** · insight **118** · density **242** · l0 **248** · journey **171** · binding **192** · stream **73** · ask-auth **71** · zero-injection **28** · supersession **36** · gate-integrity **15** · size-ruling-vol3 **12** · design-contract **19** · recommendation **65** · page-input **108** · hardening **24** · e2e PASS | v5 closeout §3；**新门禁 11**（其中 8 个入 `V5_NEW_GATE_FILES`；`CHROMIUM_GATES === 9` 不动） |
| E9 | 保护段 | journey `43054..58287` / sha `cc79f413…` / **240 行**；binding `107780..115930` / sha `be9ad0e9…`（`decision = keep`）——**v5 保段，未发生第三次取代** | v5 closeout §3 / §4 + `docs/v4-supersession-ledger.json#protectedRanges` |

### 7.2 干系人约束清单：**红线继承（N）** + **显式取代候选（X）**

> **本清单为约束（不是需求）**；spec 必须逐条落为 `NG-*` / `AC-*`，**不得改写数值或放宽口径**。

#### N. 红线继承（**逐字保留阈值 / 冻结面；来源 = v5 收口总账 + 本轮实测**）

| # | 红线（**逐字**） | 来源 |
|:-:|---|---|
| **N-SELF-001** | `dist/content.js` = **177,076 B**，sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（**零容差**） | `test/size-baseline.ts:2703` + 本轮实测 |
| **N-SELF-002** | `dist/pick-layer.js` = **34,358 B**，sha256 `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`（**零容差**；R4 已显式解冻重登记，**再动需再登记**） | `test/size-baseline.ts:2510-2516` + 本轮实测 + `0a60740` |
| **N-SELF-003** | `sidepanel.js` ≤ 生效上限 **577,089 B** = `floor(549,609 × 1.05)`；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`**（V3-VOL-1 ②：不设自缚装置） | `test/size-baseline.ts:329` + `test/size-budget.test.ts` |
| **N-SELF-004** | V3-VOL-3 三值：档位 = **563,200 B**、绝对上限 = **619,520 B**（= 档位 × 1.10）、`newBaselineBytes` 随现行基线**同源前移**；`authorConfirmation.status ∈ {pending-author-line, confirmed, overridden-by-author}`，**不得伪称已确认** | v5 closeout §5 / §8 第 12 条 + `docs/v4-supersession-ledger.json#v3Vol3Closeout` |
| **N-SELF-005** | **特权 op 恰 2 必须用户手势**：`op.authorize` / `op.perm.request`（`layer:'sw'`）；「**SW 永不调用 `.request(`**」；**AI 不可自动执行**（不可让渡的安全红线） | `ops.ts:24,307,317` + `test/capability-wiring.test.ts:51-58` |
| **N-SELF-006** | **判定链零触碰**：`src/security/policy.ts` / `src/security/auto-authorize.ts` 在 `zeroDiffFiles` 冻结（内容哈希 pin，9 项） | `docs/v3-supersession-ledger.json#zeroDiffFiles` |
| **N-SELF-007** | **安装期静态面零变化**：`manifest.permissions` 逐字 5 项（`activeTab`/`scripting`/`sidePanel`/`storage`/`tabs`）；`host_permissions` 6 条；无 `<all_urls>` / 无静态 `content_scripts`；`minimum_chrome_version: 116` | `test/capability-wiring.test.ts:20-50` + `test/binding-wiring.test.ts:50-58` |
| **N-SELF-008** | **`KIND_SET` 40 项逐字不增**；新消息族（若有）走 **type-only 先例**（进 `KIND_SET` = 增长 `content.js`，默认禁止） | `messaging.ts:103-141`（本轮实测 40）+ `content-script.ts:20` + `pick-protocol.ts:9-15`（历史 +307 B） |
| **N-SELF-009** | **12 kind 契约不动**（7 主类 + 5 过程卡）；**零新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []` + 「任意深度零 `[data-host]`」） | `stream-model.ts:72-78` + `host-registry.ts:105,187,200` + `test/host-registry.test.ts` |
| **N-SELF-010** | **法八零明文不退化**：流内 payload / digest / 审计 / DOM **四面零明文**（掩码 secret 卡 + `maskedLength` 只落长度类别） | `test/ui/law8-plaintext.mjs`（25）+ v5 `ADR-V5-010` |
| **N-SELF-011** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账**显式取代**并留痕，**不是静默删除**） | v5 closeout §4 规律 |
| **N-SELF-012** | 保护 pin：journey **`43054..58287` / sha `cc79f413…` / 240 行**；binding **`107780..115930` / sha `be9ad0e9…`**（`decision = keep`） | `docs/v4-supersession-ledger.json#protectedRanges` |
| **N-SELF-013** | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile；`test` / `test:ui` / `test:binding` **绝不并发**）；`CHROMIUM_GATES === 9` 不动 | `test/gate-integrity.test.ts:225-242` + v5 closeout |
| **N-SELF-014** | 纪律：**不碰 `main`、不 force push、path-limited `git add`（禁 `git add -A` / `.`）、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖**；**不合 main、不发布** | v5 closeout §10 + ROADMAP 立项纪律 |
| **N-SELF-015** | **`F-29`（A2A 候选）未立项未排期，保持原样不动**（ROADMAP 相关区段**一字不动 / 字节相等**） | v5 closeout §8 第 13 条 |
| **N-SELF-016** | **v5 产物零改写**：v5 父 + 三叶全部 `validated` 终态原样保留；不改 v5 目录 / pin / 台账（D7） | v5 closeout + D7 |
| **N-SELF-017** | `KL-N-10` 处置纪律：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | `docs/v4-supersession-ledger.json#knownLimitations` + v5 closeout §8 第 9 条 |
| **N-SELF-018** | 取代台账 `knownGap` 一致性：`status = complete-steps-1-8` 时该字段**必须为空或仅声明闭环**（机核强制） | `test/supersession-ledger.test.ts`（36）+ `docs/v4-supersession-ledger.json#protectedSupersession.knownGap` |
| **N-SELF-019** | **法七不退化**：5 类阻塞终态流内**必有可达 next**（死端 = 0）——本 Feature 只**扩展**终态词汇，**不得**削弱既有判据 | `test/ui/no-dead-end.mjs`（39）+ `test/s2-deadend-chain.test.ts` |
| **N-SELF-020** | 纪律：**开放点不得在 spec 前被"顺手定下"**；主题①②的触发时机 / 安全边界 / 打扰控制 = **spec 批量裁决**（D2） | 编排器 D2 + 本报告 §7.4（全部附推荐、未定论） |

#### X. **显式取代候选清单（须在 spec / 台账逐条显式登记，不得静默）**

> **口径**：**「显式取代」≠「放宽」**——判据必须**等价重锚**（断言力不降、计数只增），并留台账。**X-SELF-1~3 为编排器给定的三项**须显式取代/裁决的既有红线形态；**X-SELF-4~7 为本轮新识别**。

| # | 既有红线（现状逐字） | 取代 / 裁决内容（依据） | 连带门禁（须等价重写，非放宽） |
|:-:|---|---|---|
| **X-SELF-1** | **`requestTurn(` 恰 2 处调用点**（composer submit + `op.turn` 槽），被门禁逐字钉死 | **允许系统 / AI 发起回合**（主题②）——取代读法有二：① **保持恰 2 处**（AI 通过 `op.turn` 槽在既有注册表内驱动，**diff = 0**，推荐）；② **显式放宽计数**（新增具名"主动回合"入口 + 等价重锚判据）。**默认取 ①**，只有 ① 被证不可行时才走 ② | `test/op-wiring.test.ts:117-124` / `test/local-act-wiring.test.ts:282-318,417` / `test/authorize-chip-wiring.test.ts:199` |
| **X-SELF-2** | **`RecommendTrigger` 恰 4 项**（`'pick'\|'stale'\|'idle'\|'firstRun'`），无 `'answered'` | **新增驱动时机源**（至少含"已答"）——取代 = 时机词汇**扩张**（新增值），并同步 provider 的 `when` 抑制条件（`ref-action` 的 `openAsks === 0` 需**显式裁决**：答完后应如何重新求值） | `sidepanel.ts:1791` + `next-registry/providers.ts:136-148` + `test/recommendation-sources.test.ts` / `test/ui/recommendation.mjs`（65） |
| **X-SELF-3** | **`llm.unconfigured` 阻塞事实只在 op 分支被动写入**（"observed block event"）；`runChat` 无配置门禁 | **主题① 主动式系统流**：LLM 缺席成为**主动驱动源**（而非等 op 失败才观测）；`runChat` 增加**确定性**配置判据。取代面 = 阻塞事实的**触发语义**（从"被观测"→"被识别"）——**不得**削弱既有 op 恢复链（`OPS_RECOVERY_ROWS` 保留） | `sidepanel.ts:1290-1302` + `service-worker.ts:878-941` + `next-registry/providers.ts:57-58` + `test/ask-auth-inflow.mjs`（71） |
| **X-SELF-4** | **死端判据只判 5 类阻塞终态**（`BLOCKED_TERMINALS` 恰 5） | **法七扩展：已答 ask / 已交描述入终态词汇**——取代 = **终态枚举扩张**（不是改布尔值）；须伴随"必有下一个驱动者"判据 + 双向反证 | `test/ui/no-dead-end.mjs`（39）+ `test/gist-design-map.ts:77-87`（F1~F11）+ `test/s2-deadend-chain.test.ts` |
| **X-SELF-5** | **`applyRefAction` 的唯一副作用 = 计数**（`sends += 1`，`commandSends` 零生产消费者） | **答案必须产生驱动**——取代 = 语义重定义（从"计数"→"驱动/续接"）；`commandSends` 若保留须**显式登记**其消费面（或退役） | `sidepanel.ts:2177-2189` + `l1/ref-store.ts:280-292` + `test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` |
| **X-SELF-6** | **`submitDescribe` 只 `dispatch` 从不 `send`**（旁路死端） | **"改用描述"作答后必有下一个驱动者**——取代 = 补齐发送/驱动路径（当前 `ask-resolved` 是唯一副作用） | `sidepanel.ts:2541-2546,3260` + `test/ui/ask-auth-inflow.mjs`（71） |
| **X-SELF-7** | **`chatBusy` 单飞：第二条回合被丢弃**（错误回执） | **AI 主动与用户输入的并发仲裁语义**（须显式裁决：排队 / 抢占 / 拒绝 / 合并）——取代 = `chatBusy` 的**丢弃语义**改为**可判仲裁** | `service-worker.ts:879-885` + `test/ui/journey.mjs`（171）/ `ask-auth-inflow.mjs`（71） |

> **须注意的边界**：**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」的方式落地**；默认优先"**在既有注册表内扩张（diff = 0）**"的读法（X-SELF-1 ①），只有当等价重锚被证不可行时才显式放宽计数并留台账。

### 7.3 门禁影响面预判（**迁移量估计，不是承诺**）

| 门禁 | 预判存活度 | 主要冲击点 |
|---|---|---|
| `npm test`（1181） | **中** | 新增驱动者层 / 时机源 / 配置判据；`op-wiring` / `local-act-wiring` / `recommendation-sources` **可能整体重锚** |
| `test:ui` journey（171） | **中** | 保护段 `43054..58287`（240 行）**可能第三次八步取代**（若改回合启动 / 流结构）；段外回合 / 滚动 / 卡族逐条受影响 |
| `test:l0`（248） | **中** | 主动态 / 首装引导若改状态栏或工具栏语义会连锁 |
| `test:density`（242） | **中** | 若引入主动引导卡 / 多步 wizard 容器 ⇒ 密度预算（**阈值不得变**） |
| `test:recommendation`（65） | **低—中** | 真实产品路径的推荐卡断言（时机 → 驱动者后逐条等价重锚） |
| `test:stream`（73）/ `ask-auth`（71） | **低—中** | 「已答」入终态 + `submitDescribe` 补齐 ⇒ 断言**增**（终态词汇扩张） |
| `test/binding`（192） | **中** | 主题①若涉及授权 / 能力的主动引导，需与 binding 链避让（保护段 keep） |
| `test:law8`（25）/ `no-dead-end`（39） | **低—中** | 法八不动（**必绿**）；死端判据 **扩**（终态词汇扩张 + 双向反证） |
| `test:page-input`（108）/ `ref-pick-wiring`（11） | **中** | 引用动作链（`applyRefAction`）语义重定义 ⇒ 拾取 / 描述单一入口判据重锚 |
| `test:insight`（118） | **低** | 不涉形态 |
| `test:hardening`（24）/ `zero-injection`（28） | **高** | 不涉形态（但安全边界改动须复跑确认不回归） |
| `test:supersession`（36） | **低** | `knownGap` 一致性 + 八步 + RP-V4-08；新增取代条目必须登记 |
| `test:size-*`（在 `test` 内 + `size-ruling-vol3` 12） | **低—中** | 强制五要素重登记 + 算术机核 + V3-VOL-3 三值前移 + 逐模块 metafile 归因 |
| `test:gate-integrity`（15）/ `e2e` | **高** | 新门禁需纳入受审集合（`CHROMIUM_GATES === 9` 不动） |
| `test:l1-reverse`（9）/ `l2-reverse`（10） | **中** | 反证**注入点**若被搬走，反证需重写（判据不得空转） |

### 7.4 开放问题清单（**给 spec 阶段批量裁决；每条附推荐，但未定论**）

| ID | 开放问题 | 为什么必须在 spec 裁决（不裁决的后果） | 候选（编排器预登记，**非方案评估**） |
|---|---|---|---|
| **O-SELF-001** | **命名与版本位的语义配对**：目录名 `v55`（= v5.5，承 `v45` = v4.5 维护语义）vs 版本位 `v0.11.0`（并列**新主题**语义）——**两者语义错位**，须显式确认 | 不裁决 ⇒ 收口登记时命名 / 版本位口径不一（v4.5 先例 = 维护轮 → v0.9.1；本 Feature 是"新主题"还是"v5 的结构性收尾"？），后续追溯混乱 | ① **保持 `v55-self-driven` + v0.11.0**（按编排器给定；登记时明示"v5.5 = v5 驱动者层的结构性收尾，作为 v0.11.0 主题登记"）**【推荐】** ② 改名 `v6-self-driven`（与 `v0.11.0` 新主题语义一致，但偏离编排列举） ③ 版本位改 `v0.10.1`（维护段语义，与 `v55` 一致，但与"并列主题"表述冲突） |
| **O-SELF-002** | **主题①的触发时机与终点**：确定性系统流在**何时**被触发（首开面板？拾取后？意图需要 LLM 的时刻？）？终点是什么（配置完成 → **自动续接悬置任务**？S2 范式复用？还是仅提示"配置完成"）？与既有**被动阻塞**（`llm.unconfigured`）的关系 = **升级 / 并存 / 取代**？ | 不裁决 ⇒ 主题①无边界（"主动"可无限外扩）；且与 v5 的 op 恢复链冲突（双套配置引导） | ① **`runChat` 前置判据（意图需要 LLM 即识别）+ 配置完成自动续接**（主动式，S2 范式复用）+ 既有 `op.llm-config` 为唯一配置执行体（不新造面）**【推荐】** ② 仅首开面板时识别（窄，覆盖不足） ③ 全场景常驻识别（宽，打扰风险） |
| **O-SELF-003** | **驱动者的统一形态**：注册表化（新增 provider / 新 trigger，走 v5 契约 v2 注册表，主流程 diff = 0）vs 散落调用点（再加第 8 个 `maybeRecommend(...)`）？"驱动者"是否需**证明义务表**式静态登记？ | 不裁决 ⇒ 半驱动者堆积（现状 7 个调用点 + 若再加）；求值顺序 / 防环 / 去重无主（Q-SELF-011 / R-SELF-003） | ① **注册表化：驱动者 = 注册表里的 `when(ctx)` 纯谓词 + 新增时机源**，并要求"新增驱动者主流程 diff = 0"机核**【推荐】** ② 散落调用点 + 台账登记 ③ 混合（底座注册表 + 少量具名入口） |
| **O-SELF-004** | **AI 可主动发起哪些 op（安全边界清单）**：特权 op 恰 2（`op.authorize` / `op.perm.request`）**必须**用户手势 = 不可让渡；其余 op 的清分（可自主 / 须用户确认）如何**穷举并机核**？ | 不裁决 ⇒ "主动性"侵蚀安全面（R-SELF-001）；且无判据区分"AI 自主"与"必须确认" | ① **三档清分（`auto` 只读低危 / `confirm` 写状态 / `gesture` 特权恰 2）+ 机核清单（any new op 必须归入一档）**【推荐】** ② 仅列"不可自主"（黑名单，弱） ③ 全部须用户确认（等于放弃主动性） |
| **O-SELF-005** | **`requestTurn` 恰 2 处 / `RecommendTrigger` 4 项两个门禁的取代方式**：在既有注册表内扩张（diff = 0）vs 显式放宽计数？二者门禁面完全不同 | 不裁决 ⇒ 工作量差一个量级（R-SELF-002 / Top5 第 1 条） | ① **优先"注册表内扩张"（AI 经 `op.turn` 槽 / 新增 trigger 值），只在证不可行时显式放宽 + 等价重锚**【推荐】** ② 直接显式放宽计数 ③ 并存期（双词汇 + 映射表） |
| **O-SELF-006** | **主动性的护栏三件套**：打扰控制（频次 / 静默期 / 用户可否关断）· token 成本（主动回合的次数 / 预算上限）· 防环（自触发链的终结条件）；以及**可见载体**是否复用 12 kind / 零宿主判据 | 不裁决 ⇒ "主动"落地即隐患（Q-SELF-012 / 013 / A-SELF-007 / R-SELF-004） | ① **三控制均入 spec（频次上限 + 成本上限 + 环深度上限）+ 载体复用既有 taxonomy（零新增卡 / 零新增宿主）**【推荐】** ② 只做防环（其余观察） ③ 由用户开关总控（简单但不解决默认值） |
| **O-SELF-007** | **是否需要外部竞品调研**（"主动式助手如何做打扰控制 / 安全边界 / 主动性治理"） | 若需要而未做 ⇒ 论证缺外部参照；若不需要而未显式裁决 ⇒ 后续可能被质疑遗漏 | ① **不需要**（有 v5 同业 + 仓库内 S2 先例；作者母理念为最高价值源）**【推荐】** ② 需要，登记为待调研项（交付前完成） |

### 7.5 证据台账（文件级）

| 路径 | 用途 |
|---|---|
| `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | **核心证据源**：`submitAskFor`（`:2557-2588`，答案唯一结算）/ `applyRefAction`（`:2177-2189`）/ `submitDescribe`（`:2541-2546`）/ `requestTurn`（`:277-297`）+ 调用点（`:3232` composer / `:3256` `op.turn` 槽）/ `RecommendTrigger`（`:1791`）+ 7 个 `maybeRecommend` 调用点 / `noteLlmBlockedFact`（`:1290-1302`）/ `maybeRecommendFirstRunEntry`（`:1895-1909`） |
| `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts` | 引用动作计数（`dispatch` `:280-291` + `commandSends` `:292`，**零生产消费者**） |
| `packages/web-cli-plugin/src/ui/sidepanel/next-registry/{definition,providers,ops,pipeline,registry,dispatch}.ts` | 契约 v2 注册表 / `BLOCKED_TERMINALS` 恰 5（`definition.ts:34-41`）/ `BLOCKED_RECOVERY_TRIGGER`（`:60-68`）/ `ref-action` 抑制（`providers.ts:136-148`）/ 特权 op 恰 2（`ops.ts:24,307,317`）/ `op.turn` 槽（`:290`）/ 管线四态（`pipeline.ts:83-90`） |
| `packages/web-cli-plugin/src/background/service-worker.ts` | `runChat` 无配置门禁（`:878-941`）/ `chatBusy` 单飞（`:879-885`）/ `askBridge` + `ask-user-response`（`:465-471` + `:2813-2822`） |
| `packages/web-cli-plugin/src/background/messaging.ts` | `KIND_SET` **40 项逐字**（`:103-141`）+ type-only 先例家系（`:68-89`） |
| `packages/web-cli-plugin/src/ui/settings/{sections,panel,ops}.ts` | 主题①的设置面底座（8 分区 + `#settings-apiKey:153` + `SettingsOps`） |
| `packages/web-cli-plugin/test/op-wiring.test.ts` | `requestTurn(` **恰 2 处**判据（`:117-124`）+ 本地 op 槽接线 + 排队门禁 |
| `packages/web-cli-plugin/test/{recommendation-sources,local-act-wiring,authorize-chip-wiring}.test.ts` | 推荐器取代面（源白名单 / 闭集 / 单一入口） |
| `packages/web-cli-plugin/test/ui/{no-dead-end.mjs,s2-chain fixture}` + `test/s2-deadend-chain.test.ts` | 法七死端判据（5 类阻塞）+ S2 十环节 + 双向反证（**判据底座**） |
| `packages/web-cli-plugin/test/ui/{law8-plaintext,auth-chip,ask-auth-inflow,recommendation,l0,density,journey}.mjs` | 门禁计数与覆盖（law8 25 / auth-chip 37 / ask-auth 71 / recommendation 65 / l0 248 / density 242 / journey 171） |
| `packages/web-cli-plugin/test/size-baseline.ts` + `size-budget.test.ts` | `SIDEPANEL_BASELINE_BYTES = 549_609`（`:329`）/ `PICK_LAYER_* = 34_358`（`:2510-2516`）/ `CONTENT_MAX_BYTES = 177_076`（`:2703`）/ 五要素登记册 / V3-VOL-3 三值 |
| `packages/web-cli-plugin/test/capability-wiring.test.ts` + `binding-wiring.test.ts` | 特权 op 手势红线（`SW 永不 .request(` `:51-58`）+ 静态 / 可选 / host 集合逐字 |
| `packages/web-cli-plugin/test/gate-integrity.test.ts` | 门禁受审集合 + `CHROMIUM_GATES`（`:225-242`） |
| `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | `zeroDiffFiles`（9 项，含 `policy.ts` / `auto-authorize.ts`） |
| `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | 保护段八步 + `supersessionChain` + `redlineRemap` + `knownLimitations`（`KL-N-10`）+ V3-VOL-3 三值 + `designContractChanges` |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/closeout.md` | **直接上游**：v5 终态 / 数字总账（`npm test` 1181 / 新门禁 11 / sidepanel 547,558→**现 549,609**）/ deferred 14 条 / 人工面 9 项 / §10 建议（含 S2 自动续流真机验收） |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/discovery.md` | v5 的 `X1~X6` 取代先例 + `N1~N21` 红线继承 + O-ALLN 开放点形态（**本报告的体例基准**） |
| `.sddu/specs-tree-root/ROADMAP.md`（v1.29.0） | 编号空间（`F-30`/`F-31`/`F-32` 占用；`F-33` **0 命中**）+ 版本位（`v0.11.0` **0 命中**；`v0.10.0` 已含 F-32）+ `F-29` 区段（**一字不动**） |

> **证据缺口（如实登记）**：① **真机截图 / 录屏未入库**——会话 A / B 来自作者提供的**文字记录**（20:15 / 22:49），本报告不声称有截图证据；② **外部竞品调研未执行**（§4.1）；③ **门禁计数全部引自 v5 收口总账 §3**（本轮未跑门禁 / 构建 / Chromium，**零产品运行时验证**）；④ **R4 之后的 volume 数字为本轮实测**（`sidepanel.js` 549,609 B / `pick-layer.js` 34,358 B），与 v5 closeout 的 547,558 / 33,900 差异 = `0a60740`（R4）轮产物，**已如实分别标注来源**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5.5「self / ai-driven：让助手像助手」问题挖掘）：作者主题①②与母理念逐字保留 + 真机会话 B（22:49 静默）/ 会话 A（20:15 手动重打）现场逐字；代码根因 R1~R6 全量 `file:line` 映射（`submitAskFor` → `applyRefAction` → `ref-store.dispatch` 只 `sends += 1` 且 `commandSends` 零消费者；`requestTurn` 恰 2 处；`RecommendTrigger` 无 `'answered'`；`runChat` 无配置门禁；`submitDescribe` 只 dispatch）；**现有资产盘点 A1~A7（已有什么 vs 缺什么）**；**F-33 零占用核验**（ROADMAP 0 命中；仓库 2 处均为文字说明，不构成占用）+ **v0.11.0 零占用核验**（全新版本位）+ **命名 / 版本位语义错位辨析**；范围（核心 4 + 附带 2）+ 非目标 8 项；问题清单 Q-SELF-001~015（核心 6 / 次要 4 / 潜在 5）；假设 A-SELF-001~010；风险 R-SELF-001~012（含 Top5 + 门禁迁移量估计）；**红线继承 N-SELF-001~020 + 显式取代候选 X-SELF-1~7**；开放问题 O-SELF-001~007（**全部附推荐**）；叶子拆分草案 3 叶（v5.5-1 驱动者层 → v5.5-2 主题① → v5.5-3 主题②，串行）；现状基线 §7.1 A~E 全量 `file:line` 证据（含本轮实测 `sidepanel.js` 549,609 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 项） | 2026-09-22 | SDDU Discovery Agent |
