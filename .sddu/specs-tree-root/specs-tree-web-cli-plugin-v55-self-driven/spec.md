# Feature Specification：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本目录 `discovery.md` v1.0（2026-09-22）——问题清单 **Q-SELF-001~015**（核心 6 / 次要 4 / 潜在 5）/ 假设 **A-SELF-001~010** / 风险 **R-SELF-001~012** / 开放问题 **O-SELF-001~007** / 现状基线 §7.1（A~E 全量 `file:line` 证据）/ 红线继承 **N-SELF-001~020** + 显式取代候选 **X-SELF-1~7** / 门禁影响面预判 §7.3
> **直接输入**: ① 作者主题指示（2026-09-22，逐字）② 真机会话 B（22:49，`platform.deepseek.com`）+ 会话 A（20:15）文字现场（逐字）③ 编排器代作者决策 D1~D7 + **开放点批量裁定 O-SELF-001~007（2026-09-22 定稿；本规范登记为「已裁决」）** ④ 上游收口总账 `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v5-all-in-next/closeout.md`（F-32 / v5 终态 + 数字总账 + deferred 14 条 + 人工面 9 项）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（web-cli-plugin v5.5「self / ai-driven：让助手像助手」需求规范：父 Feature = 轻量规范容器 + **3 个叶子子 Feature**（依存序）；含编排器对 O-SELF-001~007 七条开放点的逐条裁决落位 + X-SELF-1~7 显式取代的判据等价重写映射 + N-SELF-001~020 红线继承逐条承载 + **S0 首验收场景（真机 22:49 序列）机器化口径**）

web-cli-plugin v5.5「self / ai-driven：让助手像助手」需求规范 —— 把作者主题（**没有配置 LLM 时由系统代码流程驱动用户去配置 LLM；已配置 LLM 时让 AI 来启动整个 chat/next**）转成可验收的需求：**把「下一步由谁按」从用户侧转移到系统 / AI 侧**。v5（F-32）已把「下一步**是什么**」从 provider 自愿升级为管线强制保证（阻塞终态必有可达 next，死端 = 0）；v5.5 的题眼 = **「下一步由谁按」** —— 新增**驱动者层（drive ownership）**：凡「用户已表达意图」的时刻（已答 ask / 已交描述 / 绑定完成 / 拾取完成 / 探测稳态 / 授权回执 / 回合结束）之后，**存在一个被承认的驱动者**接手续接；**主题①** = LLM 缺席时的**确定性系统流**（代码驱动，非 AI，零 token）；**主题②** = LLM 已配置时的 **AI 驱动编排**（AI 有权启动回合 / 推进 next，但受三档 op 清分 + 护栏三件套约束）；**法七扩展** = 已答 ask / 已交描述入终态词汇。编号一律 `FR-SELF-*` / `NFR-SELF-*` / `EC-SELF-*` / `AC-SELF-*` / `NG-SELF-*`（与 v1/v2/v3/v4/v4.5/v5 零冲突）。**父 Feature 定位 = 轻量规范容器**（不承接 build/review/validate，不产出 tasks.json），实施由 **3 个叶**按依存序承接。

**题眼（本 Feature 名 `self-driven` 的语义）**：v5 证明了「**下一步是什么**」可以由注册表保证（`NextProvider` 契约 v2 + 阻塞候选可达 + 死端守护门禁）；但**「谁来按下一步」仍然是用户**——唯一回合发起入口是用户手势触发的 `requestTurn`（调用点被门禁钉死**恰 2 处**），推荐器求值时机是**恰 4 项闭集**（`pick`/`stale`/`idle`/`firstRun`，**无 `'answered'`**）。于是**凡「用户已表达意图」之后都没有驱动者接手**，真机会话 B 暴露了其中最硬的一条：**引用回合 ask 已答 ⇒ 答案被丢弃（`applyRefAction` 只计数）⇒ 彻底静默**。v5.5 的题眼 = **把「驱动权」从用户侧转移到系统 / AI 侧，而这条转移之所以能长期成立，靠的不是多加几个 `maybeRecommend(...)` 调用点，而是把「驱动者」收进注册表（新增驱动者 = 注册一个 `when(ctx)` 谓词 + 一个时机源，主流程 diff = 0）**。

**与 v5 的具体关系（承上、不替下）**：v5（F-32，`validated`）**原样保留、零改写**（D7 / N-SELF-016）；v5.5 是**并列新主题**（不是 v5 的维护轮）：v5 的 9 op / `NextProvider` 契约 v2 / 死端守护门禁 / `BLOCKED_TERMINALS` 恰 5 / 授权 chip 唯一载体 / 法八四面零明文 —— **全部继承为底座，逐条不退化**（N-SELF-019 / N-SELF-010 / N-SELF-009）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」，ROADMAP **F-33**） |
| 名称 | web-cli-plugin v5.5「self / ai-driven：让助手像助手」——驱动者层（drive ownership）+ 主题① 确定性系统流（LLM 缺席 → 引导配置 → 自动续接）+ 主题② AI 驱动编排（AI 启动 chat/next）+ 法七扩展（已答 ask / 已交描述入终态）+ op 三档清分（auto / confirm / gesture）+ 主动性护栏三件套（打扰 / token 成本 / 防环） |
| 优先级 | P0（核心） |
| 目标版本 | **v0.11.0**（**全新版本位**，本轮实测 `grep -c "v0.11.0" ROADMAP.md` = **0**；与 v0.10.0（F-32 +「AI 增强与生态」同版并列）**有同版并列先例可循**；登记留给收口，本阶段 **ROADMAP 零 diff**） |
| 命名与版本位语义（**O-SELF-001 已裁决**） | 目录名保持 **`v55`**（承 `v45` = v4.5 系列惯例）+ 版本位 **`v0.11.0`** 并列登记，并在本规范与收口**明示语义**：「**v5.5 = v5（F-32）驱动者层的结构性收尾**，作为 `v0.11.0` 主题登记」（读法①，见 §11 DC-SELF-001） |
| 分支 | `feature/web-cli-plugin`（与 v1/v2/v3/v4/v4.5/v5 同分支继续堆；**不合 main、不发布**；`main` 未动 = `2ddc922`） |
| 当前 HEAD | `1022f8d`（2026-09-22，**F-33 discovery 产物**）；本规范为其上的 spec 产物 |
| 上游/底座 | v1 `specs-tree-web-cli-plugin`（F-14）+ v2 `specs-tree-web-cli-plugin-v2-insight`（F-27）+ v3 `specs-tree-web-cli-plugin-v3-ui`（F-28）+ v4 `specs-tree-web-cli-plugin-v4-chat`（F-30）+ v4.5 `specs-tree-web-cli-plugin-v45-f-regularization`（F-31）+ **v5 `specs-tree-web-cli-plugin-v5-all-in-next`（F-32，唯一直接上游，`validated` 终态）** —— 全部**只读复用、零改写** |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = **3 个叶**（depth=2，见 §14） |
| 叶子 | ① `specs-tree-v55-1-driver-layer`（**驱动者层 + 法七扩展底座**：驱动者形态定论 + 时机源扩张 + 已答 ask / 已交描述入终态 + `applyRefAction` 驱动化 + `submitDescribe` 补齐 + 后台 ask 非死端 + 死端守护门禁扩张 + **S0 首验收机器化**）→ ② `specs-tree-v55-2-deterministic-onboarding`（**主题①**：`runChat` 前置配置判据 + 确定性引导流 + 配置完成自动续接 + 首装 / 已装未配两场景）→ ③ `specs-tree-v55-3-ai-driven-orchestration`（**主题②**：AI/系统启动回合机制 + op 三档清分 + 护栏三件套 + 并发仲裁 + 门禁等价重锚收口）**依存序，必须串行** |
| 相关干系人 | 作者（插件当前唯一真实用户 + 立项人 + 唯一决策者；**已授权编排器代行决策、全流程自行调度**，D1）；编排器（D2~D7 + **O-SELF-001~007 批量裁定**）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-SELF-001~006（核心）/ Q-SELF-007~010（次要）/ Q-SELF-011~015（潜在）；根因 R1~R6（discovery §0.3） |
| 关联风险 | R-SELF-001~012（discovery 继承）+ R-SELF-901~910（spec 新增，见 §15.2） |
| 关联红线 | N-SELF-001~020（discovery §7.2 红线继承）+ **N-SELF-021~026（spec 新增红线，见 §13）** |
| 关联取代 | X-SELF-1~7（discovery §7.2 显式取代候选）→ §12 判据等价重写映射表 |

### 1.1 编号命名空间声明（**强制**）

| 命名空间 | 本 Feature 使用 | 历史占用（**零冲突，禁止复用**） |
|---|---|---|
| 功能需求 | `FR-SELF-###` | v1 `FR-001~055`；v2 `FR-V2-*`；v3 `FR-V3-*`；v4 `FR-CHAT-*`；v4.5 `FR-V45-*`；v5 `FR-ALLN-*` |
| 非功能需求 | `NFR-SELF-###` | v1 `NFR-001~010`；v2~v4.5 `NFR-V2/V3/CHAT/V45-*`；v5 `NFR-ALLN-*` |
| 边界情况 | `EC-SELF-###` | v1 `EC-001~026`；v2~v4.5 `EC-V2/V3/CHAT/V45-*`；v5 `EC-ALLN-*` |
| 验收标准 | `AC-SELF-###` | v1 `AC-001~012`；v2~v4.5 `AC-V2/V3/CHAT/V45-*`；v5 `AC-ALLN-*` |
| 非目标 | `NG-SELF-###` | v2~v4.5 `NG-V2/V3/CHAT/V45-*`；v5 `NG-ALLN-*` |
| 目标 / 用户故事 | `G-SELF-###` / `US-SELF-###` | — |
| 裁决记录 | `DC-SELF-###` | v5 `DC-ALLN-*` |
| spec 新增风险 | `R-SELF-9xx` | v5 `R-ALLN-9xx` |
| 缺口编号（本规范派生，见 §10.0） | `GAP-SELF-01~09` | — |
| 沿用 discovery | `Q-SELF-###` / `A-SELF-###` / `R-SELF-0xx` / `O-SELF-###` / `X-SELF-1~7` / `N-SELF-001~020` / `D1~D7` / `R1~R6` | — |
| 叶内编号（子规范） | `LG-V55-x-###`（叶目标）/ `LNG-V55-x-###`（叶非目标）/ `LD-V55-x-###`（叶裁决） | v5 叶 `LG-V5-x-*` / `LNG-V5-x-*` |

---

## 2. 上下文

### 2.1 立项来源（**作者原话逐字，不得转述走样**）

| # | 作者原话（逐字 / 提炼自 2026-09-22 指示） | 本规范承载体 |
|---|---|---|
| **主题①** | 「**没有配置 LLM 时：由系统代码流程驱动用户去配置 LLM**」（确定性系统流，**不是 AI**） | §5.5 **ONBOARD**（FR-SELF-040~052）+ AC-SELF-007 / 013；**零 LLM 调用、零 token** |
| **主题②** | 「**已配置 LLM 时：让 AI 来启动整个 chat/next**」（AI 驱动编排） | §5.6 **AIDRIVE**（FR-SELF-060~070）+ AC-SELF-008 / 014 |
| **母理念** | 「**主动帮用户、引导用户解决用户的问题、完成用户的需求，而不是被动接受任务，被动发挥的价值太小了**」 | §5.2 **DRIVE**（驱动者层）+ §3.1 **G-SELF-001**（本 Feature 的母命题） |

> **口径声明（如实）**：作者原话为**指示要点**（编排器 2026-09-22 转达）；作者**未**指定实现形态、未指定触发时机、未指定安全边界——这些已在 discovery 登记为 `O-SELF-001~007`，**本阶段由编排器代作者批量裁定**（D1 / D2），逐条落位于 §11。**本规范不新增作者未表达的需求**。

### 2.2 真机现场（**第一现场证据；已完成只读诊断，本轮直接引用，不重查**）

#### 会话 B（22:49，`platform.deepseek.com`）——**本 Feature 的母缺陷现场 = S0 首验收基准**

```
绑定 ✓ → 拾取引用 ① 出生有效 → ask-user 已答「原地翻译为中文」→ 彻底静默
                                          （无思考 / 无 next / 无事件 / 无 ✖）
```

| 环节 | 事实 | 判定 |
|---|---|---|
| 绑定 | `✓` 绑定成功 | 正常 |
| 拾取引用 | ① **出生有效**（引用有效，`validCount ≥ 1`） | 正常（注：R4 之前「出生即死」缺陷已由 `0a60740` 根修；本会话 22:49 在 R4 提交 22:45 **之后**） |
| ask-user | 卡已答「原地翻译为中文」，**已结算** | **✅ 用户已表达意图** |
| 之后 | **彻底静默**：无思考、无 next、无事件、无 ✖ | **✖ 驱动者缺位**（= 死端的新形态：不是「无出口」，而是「无推进者」） |

#### 会话 A（20:15）——**证明显式断层早已存在**

> 答了两遍「翻译」后，**靠手动重打才启动回合**。

⇒ 断层**不是**会话 B 偶发：用户答完 ask 后，系统**不**启动任何回合；用户**必须手打**同样的指令，回合才跑起来。会话 A 的「答了两遍仍无反应 ⇒ 只好重打」= **同一缺陷的早期证据**。

> **证据缺口（如实登记，不美化）**：真机截图 / 录屏**未入库**；会话 A / B 来自作者提供的**文字记录**（20:15 / 22:49）。**本规范不声称**有截图证据；S0 的可机核口径见 §5.12 / §9.1（**机器化部分全部机核、人工观感逐项标注 `⏳ 未执行`，不冒充 PASS**）。

### 2.3 代码根因映射（discovery §0.3 逐条 `file:line`；本规范只读复核沿用）

| # | 根因（要点） | 仓库侧证据（`file:line`） | 本规范承载 |
|:-:|---|---|---|
| **R1** | **引用回合 ask 的答案被丢弃**：`submitAskFor` 对 `ref-round-<refId>` 走 `applyRefAction(refId, trimmed)`；而 `applyRefAction` 只做有效性裁决，**从不发回合** | `sidepanel.ts:2557-2588`（`:2587` `if (refId && !isCanceled && trimmed) applyRefAction(refId, trimmed);`）+ `:2177-2189` | FR-SELF-025 / 022 / AC-SELF-003 / 010 |
| **R2** | **`applyRefAction` 的唯一副作用是「计数」**：`l1.dispatchRefAction` → `ref-store.dispatch` 通过有效性后**只做 `sends += 1`** 并返回 `{allowed:true}`；`commandSends` 无**驱动语义**消费者 | `l1/ref-store.ts:280-291`（`:290` `sends += 1;`）+ `:292` `commandSends: () => sends`〔**spec 复核订正 COR-1**：见 §2.4 复核订正表〕 | FR-SELF-025 / 026 / X-SELF-5 |
| **R3** | **唯一回合启动者是 `requestTurn`，答案路径没复用**：`requestTurn` 是面板**唯一**回合发起入口（composer 提交 + `op.turn` 槽）；`op-wiring` 门禁钉死**恰 2 处调用点** | `sidepanel.ts:277-297` + 调用点 `:3232`（composer submit）+ `:3256`（`bindPanelOps.turn`）= **恰 2 处**；门禁 `test/op-wiring.test.ts#requestTurnProblems`（「必须恰 2 处」） | FR-SELF-060 / 100 / X-SELF-1 |
| **R4** | **本该接手的 ref-action 推荐 chip 被硬抑制**：`ref-action` 的 `when` 含 `ctx.session.openAsks === 0`（ask 开着时抑制）；而答完后**没有重跑时机**（`RecommendTrigger` 恰 4 项，**无 `'answered'`**） | `next-registry/providers.ts:136-148`（`when: ctx.ref.validCount >= 1 && ctx.session.openAsks === 0 && ctx.ref.latestRefNum !== undefined`）+ `sidepanel.ts:1791` + 生产调用点 7 处（`:1909/2241/2383/2453/3281/3380/3399`） | FR-SELF-030 / 031 / 101 / 063 |
| **R5** | **LLM 配置检查在这条路径完全缺席**：`runChat` **无配置门禁**（`keys.load()` 后直接 `providerChat`）；未配置时表现为 **LLM 错误事件 → idle 推荐**（被动）。`llm.unconfigured` 阻塞事实**只在 `op.llm-config` 分支被动写入**（「observed block event」） | `background/service-worker.ts:878-941`（`:893` `s.keys.load()`）+ `sidepanel.ts:1290-1302`（`noteLlmBlockedFact`） | FR-SELF-040 / 041 / 102 / X-SELF-3 |
| **R6** | **旁路死端：「改用描述」只 dispatch 从不 send** —— `submitDescribe` 只产 `ask-resolved`，**没有任何发送 / 驱动** | `sidepanel.ts:2541-2546` + 调用点 `:3260`（`PANEL.describe` 槽） | FR-SELF-027 / 105 / X-SELF-6 |

**断流的因果链（会话 B 逐环节，逐字保留）**：绑定 ✓ → 拾取 ✓（引用出生有效）→ ask 卡登记（`openAsks.length = 1`）→ `ref-action` provider **被 `openAsks === 0` 抑制**（R4）⇒ 此刻**无 next**；用户作答 → `submitAskFor` 走 `applyRefAction`（R1）→ `ref-store.dispatch` **只 `sends += 1`**（R2）→ **无 `requestTurn`**（R3）→ **无 `'answered'` 时机重跑推荐**（R4）⇒ **彻底静默**。

### 2.4 现状事实核对（**spec 阶段只读复核，零运行时验证**）

> **口径**：下表为本轮（spec 阶段）对 discovery §7.1 基线的**只读复核**（`grep` / `sed` / 字节 / sha / 类型读取），**未跑任何门禁 / 构建 / Chromium**。凡与 discovery 表述不一致者，**在「复核订正」逐条如实登记**（不美化、不掩盖）。

#### A. 驱动者缺位面（对象 = Q-SELF-001 / 002）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| A1 | `submitAskFor` 是 ask 答案的**唯一**结算实现；ref 回合作答走 `applyRefAction` | `sidepanel.ts:2557-2588`（`:2587` 调用点逐字命中） | FR-SELF-020~027 |
| A2 | 面板本地 op `params` ask 走 `opAskResolvers` —— **正确驱动 op**（**不是缺口**） | `sidepanel.ts:2562-2570`（`settleOp` 分支）+ `pipeline.ts`（`resolvePending`） | §10.0 缺口边界说明（避免误修） |
| A3 | 非 ref 的 `rid` 走 `send('ask-user-response')` —— 交给后台，**但后台只在在飞回合内结算** | `sidepanel.ts:2576-2578` + `service-worker.ts:2813-2822`（`askBridge.settle`，未命中 ⇒ `errorResponse`） | FR-SELF-028 / EC-SELF-008 |
| A4 | `applyRefAction` **只裁决、不发回合** | `sidepanel.ts:2177-2189` | FR-SELF-025 / X-SELF-5 |
| A5 | `ref-store.dispatch` 通过有效性后**唯一副作用 = `sends += 1`** | `l1/ref-store.ts:280-291`（`:290`）+ `:292` | FR-SELF-025 / 026 |
| A6 | `requestTurn` 是**唯一**回合发起入口；门禁钉死**恰 2 处调用点** | `sidepanel.ts:277-297` + `:3232` + `:3256`；`test/op-wiring.test.ts#requestTurnProblems`（「必须恰 2 处」逐字命中） | FR-SELF-060 / 100 / X-SELF-1 |
| A7 | `ref-action` provider 的 `when` 含 `openAsks === 0` ⇒ ask 开着时抑制 | `next-registry/providers.ts:136-148` | FR-SELF-031 / X-SELF-2 |
| A8 | `RecommendTrigger` 恰 **4 项**，**无 `'answered'`** | `sidepanel.ts:1791`（`type RecommendTrigger = 'pick' \| 'stale' \| 'idle' \| 'firstRun'`）逐字命中 | FR-SELF-030 / X-SELF-2 |
| A9 | 推荐器**生产调用点**仅 **7 处** | `sidepanel.ts:1909`（firstRun）`:2241`（stale）`:2383`（pick·force）`:2453`（pick）`:3281`（idle·force）`:3380`（idle）`:3399`（idle，受 `openAsks===0` 门控）逐行命中 | FR-SELF-015 / 019 / NG-SELF-018 |
| A10 | 「改用描述」只 `dispatch` 从不 `send` | `sidepanel.ts:2541-2546` + 调用点 `:3260` | FR-SELF-027 / X-SELF-6 |
| A11 | S2 自动续流先例（阻塞解除 → **自动恢复**）已机器化 | `test/s2-deadend-chain.test.ts` + `test/ui/fixtures/s2-chain.mjs`（纯数据 + 注入式依赖） | FR-SELF-045 / 130（范式复用） |
| A12 | 死端判据**只判 5 类阻塞**（不含「已答 ask」） | `test/ui/no-dead-end.mjs` + `test/g-design-map.ts:77-87`（F1~F11 逐条〔**COR-2**〕） | FR-SELF-020~024 / X-SELF-4 |

#### B. 主题① 面（对象 = Q-SELF-003 / 007 / 008）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| B1 | `runChat` **无配置门禁**：`chatBusy` 检查后直接 `keys.load()` → `providerById` → `providerChat` | `service-worker.ts:878-941`（`:879-885` chatBusy；`:893` `s.keys.load()`） | FR-SELF-040 |
| B2 | 未配置时**表现为 LLM 错误事件** | `service-worker.ts:920-921`（`onLLMError` → `llmErrorEvent`）+ `:925`（`onFinish` → `variant:'done'`） | FR-SELF-040 / 066 |
| B3 | `llm.unconfigured` 阻塞事实**只在 op 分支被动写入**（“observed block event”） | `sidepanel.ts:1290-1302`（`observedBlocked` + `noteLlmBlockedFact`；注释逐字「observed block event」） | FR-SELF-041 / X-SELF-3 |
| B4 | `llm.unconfigured` / `perm.missing` 的修复 next **即 op 自身** | `providers.ts#OPS_RECOVERY_ROWS` + `definition.ts:60-68`（`BLOCKED_RECOVERY_TRIGGER` 两者为 `null` = op-driven；**按终态键控对象，非位置数组**——v5-3 I-05 已修） | FR-SELF-041 / 044 / 051 |
| B5 | `onboarding` provider 仅首装（`firstRun && pendingSteps.length > 0`） | `providers.ts:125-134` + `sidepanel.ts:1835-1836` / `:1094` | FR-SELF-043 / 051 |
| B6 | 首装入口「每次面板生命**至多消费一次**」 | `sidepanel.ts:1895-1909`（`maybeRecommendFirstRunEntry`） | FR-SELF-046 / NFR-SELF-013 |
| B7 | 设置视图 **8 分区**承载全部配置面（LLM / 授权 / 能力 / 会话 / 诊断…） | `src/ui/settings/sections.ts` + `settings/panel.ts` | FR-SELF-044 / NG-SELF-016 |

#### C. 主题② 面（对象 = Q-SELF-004 / 010）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| C1 | **特权 op 恰 2**（`op.authorize` / `op.perm.request`），`layer:'sw'` | `next-registry/ops.ts:24`（逐字「the pipeline never calls their `execute` …routes them through `bindSwExecutor`」）+ `IMPL` 行内二者的 `execute = null` | FR-SELF-081 / N-SELF-005 / N-SELF-021 |
| C2 | 「SW 永不调用 `.request(`」判据（可申请权限**必须**用户手势） | `test/capability-wiring.test.ts:51-58` | FR-SELF-081 / 067 |
| C3 | **9 op 清单** + `op.turn` 为唯一回合入口 | `ops.ts#IMPL`（`op.turn` / `op.pick` / `op.describe` / `op.rebind` / `op.help` / `op.authorize` / `op.llm-config` / `op.perm.request` / `op.revoke`）逐项命中 | §5.7 三档清分 + §5.5 契约假设 |
| C4 | 契约 v2 注册表（`when(ctx)` 纯谓词 + `chips` = opId）+ 4 规则 provider | `next-registry/registry.ts` + `providers.ts` + `recommend.ts:56`（`NEXTSTEP_PRIORITY`） | FR-SELF-010~019 |
| C5 | `chatBusy` 单飞；并发第二条**被丢弃**（回错误） | `service-worker.ts:879-885`（逐字「上一条消息仍在处理中，请稍候再发送。」） | FR-SELF-061 / 096 / X-SELF-7 |
| C6 | AI 驱动权**止于回合内**（thinking / command / tool 指示器） | `service-worker.ts:908-926`（`onAssistantText` / `onCommandLine` / `onToolOutput`） | FR-SELF-060 |
| C7 | 判定链冻结（内容哈希 pin，9 项，含 `policy.ts` / `auto-authorize.ts`） | `docs/v3-supersession-ledger.json#zeroDiffFiles` | FR-SELF-067 / N-SELF-006 |
| C8 | v5 注册表契约的**服务面 / 模式面 / 挂载面** | `next-registry/definition.ts:10-30`（`NEXT_SERVICES` **6**：`session`/`snapshot`/`credentials`/`permissions`/`siteRegistry`/`pageSide`；`NEXT_MODES` **2**：`waterfall`/`emit`；`NEXT_MOUNT_POINTS` **5** + `MOUNT_MODE` 表） | FR-SELF-015 / 018 / NG-SELF-013 |

#### D. 流 / 卡 / 宿主契约（对象 = Q-SELF-005 / 014 / 006）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| D1 | **12 kind** 契约（7 主类 `ai/user/nextstep/askuser/auth/system/ref` + 5 过程卡 `tool/command/thinking/error/notice`）；v5 已立「零新增卡类型」 | `stream-model.ts:51-75`（`PRIMARY_CARD_TYPES` 7 + `PROCESS_CARD_TYPES` 5）逐项命中 | NG-SELF-001 / FR-SELF-062 / 095 |
| D2 | **6 终态**（`answered`/`cancelled`/`approved`/`rejected`/`invalidated`/`completed`）+ `MAX_OPEN_ASKS = 2` + `ASK_CANCEL_REASONS` 4 项（`user`/`timeout`/`superseded`/`aborted`）+ `REF_ROUND_PREFIX = 'ref-round-'` | `stream-model.ts:86-121` | FR-SELF-020 / 023 / EC-SELF-005 |
| D3 | 零宿主判据：`REGISTERED_STRUCTURAL_HOSTS = []`（v4.5 清零） | `host-registry.ts` + `test/host-registry.test.ts` | FR-SELF-062 / NG-SELF-014 |
| D4 | 法八四面零明文机核（掩码 secret 卡 + 值直达 key-store） | `test/ui/law8-plaintext.mjs`（25）+ v5 `ADR-V5-010` | FR-SELF-049 / N-SELF-010 |
| D5 | `KIND_SET` **恰 40 项逐字**；`content-script.ts` import 该模块 ⇒ 打进 `content.js` | `background/messaging.ts`（本轮实测 **40 项**逐字：`ping`…`clipboard-op`）+ `content-script.ts:20` | NG-SELF-006 / N-SELF-008 / FR-SELF-123 |
| D6 | type-only 先例家系（`command-policy` / `pick-layer-*` / `ref-rescue` / `op-*`） | `messaging.ts:68-89` + `src/background/op-protocol.ts` | FR-SELF-123 / NG-SELF-006 |
| D7 | 推荐器防抖常量：单卡 ≤ **3** chip（`MAX_CHIPS_PER_CARD = 3`）/ 最小间隔 **10 s**（`NEXTSTEP_MIN_INTERVAL_MS = 10_000`） | `recommend.ts:50,60` 逐字命中 | FR-SELF-034 / 090 / NFR-SELF-013 |

#### E. 体积与冻结面（**本轮实测 / 只读复核**）

| # | 项 | 值 | 来源（本轮复核） |
|:-:|---|---|---|
| E1 | `dist/content.js` | **177,076 B** / sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | 本轮 `stat` + `sha256sum` 命中；`test/size-baseline.ts:2703`（`CONTENT_MAX_BYTES = 177_076`，**零容差**） |
| E2 | `dist/pick-layer.js` | **34,358 B** / sha256 `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e` | 本轮实测命中；`test/size-baseline.ts:2510-2516`（`PICK_LAYER_BASELINE_BYTES = PICK_LAYER_CEILING = PICK_LAYER_FINAL_ARTIFACT_BYTES = 34_358`，**零容差**） |
| E3 | `dist/sidepanel.js` | **549,609 B** | 本轮实测；`test/size-baseline.ts:329`（`SIDEPANEL_BASELINE_BYTES = 549_609`） |
| E4 | 生效上限（公式） | **577,089 B** = `min(619,520, floor(549,609 × 1.05))` | 算术复核：549,609 × 1.05 = 577,089.45 → floor = 577,089；`min` 因 577,089 < 619,520 |
| E5 | 余量 | **27,480 B（+5.00%）**；距档位 **13,591 B**；距绝对上限 **69,911 B** | 计算：577,089 − 549,609 = 27,480；563,200 − 549,609 = 13,591；619,520 − 549,609 = 69,911 |
| E6 | 档位 / 绝对上限 | **563,200 B** / **619,520 B** | `test/size-baseline.ts:3020`（`SIDEPANEL_TIER_BYTES = ceilTo50KB(549_609)`；`ceilTo50KB(x) = ceil(x / 51_200) × 51_200` ⇒ 11 × 51,200 = **563,200**）+ `:3036`（`absoluteCeilingBytes = round(563,200 × 1.10) = 619,520`）——**本轮复核：派生公式与登记值一致**（v5 段显式升档后未再变动） |
| E7 | `SIDEPANEL_CEILING_CAP` | **`record-only`**（不设自缚装置）；`authorConfirmation.status = pending-author-line` | `test/size-baseline.ts:425` + `docs/v4-supersession-ledger.json#v3Vol3Closeout`（**未闭合义务，不得伪称已确认**） |
| E8 | `KIND_SET` 项数 | **40**（逐字） | 本轮实测（`messaging.ts` 抽取 40 项） |
| E9 | 门禁计数（**引自 v5 收口总账 §4，本轮未复跑**） | `npm test` **1181** · law8 **25** · dead-end **39** · auth-chip **37** · insight **118** · density **242** · l0 **248** · journey **171** · binding **192** · stream **73** · ask-auth **71** · zero-injection **28** · supersession **36** · gate-integrity **15** · size-ruling-vol3 **12** · design-contract **19** · recommendation **65** · page-input **108** · hardening **24** · l1 **116** · l2 **74** · l1-reverse **9** · l2-reverse **10** · ref-pick-wiring **11** · `CHROMIUM_GATES === 9`；新门禁 11（其中 8 个入 `V5_NEW_GATE_FILES`） | v5 `closeout.md` §4 |
| E10 | 保护段 | journey `43054..58287` / sha `cc79f413…` / **240 行**；binding `107780..115930` / sha `be9ad0e9…`（`decision = keep`）——v5 段**保段**，未发生第三次取代 | v5 `closeout.md` §4 + `docs/v4-supersession-ledger.json#protectedRanges` |

#### 复核订正（**spec 阶段只读复核与 discovery 表述不一致者，逐条如实登记**）

| # | discovery 表述 | 本轮复核事实 | 处置 |
|:-:|---|---|---|
| **COR-1** | 「`commandSends` **零 `src/` 消费者**」（§0.3 R2 / §7.1 A5） | **不准确**：`src/ui/sidepanel/l1/panels.ts:451` 存在 **1 处 `src` 消费者**（`report().commandSends`，供 L1 报告投影 / 门禁读取），另有测试侧 3 文件消费者（`test/ui/l1.mjs:516-519` / `test/ui/page-input.mjs:241` / `test/l1-ref-validity.test.ts:171,175,437`） | **结论不变、表述订正**：「**无任何驱动语义消费者**（零回合 / 零 next / 零状态变更消费者）」成立；「零 `src/` 消费者」按事实订正为「1 处只读投影消费者 + 3 处测试消费者，**零驱动语义消费者**」。FR-SELF-026 按订正后口径判定（`commandSends` 若保留须**显式登记其只读投影消费面**） |
| **COR-2** | 「`test/gist-design-map.ts:77-87`（F1~F11）」（§0.4 A7 / §7.1 A12） | 文件名**误写**：仓库实际文件为 **`test/g-design-map.ts`**（`:77-87` 确为 `F1~F11` 法七逐条映射，本轮逐行复核命中） | 本规范统一写作 `test/g-design-map.ts:77-87`；**不改写 discovery 原文**（不改上游产物，仅本规范内订正） |
| **COR-3** | 基准数字来源混用：`pick-layer.js` 在 v5 收口为 **33,900 B / `5f567d7e…`**，discovery 实测为 **34,358 B / `77796bab…`** | 两者皆为真（差异 = `0a60740`（R4）轮的**显式解冻重登记**：33,900 → 34,358） | 本规范**一律采用现行实测值**（E2）；红线继承表（§13）**显式注明 v5 收口值为历史值**；以 `test/size-baseline.ts:2510-2516` 的现行常量为准 |

> **未发现其他不一致**：discovery 的 `requestTurn` 恰 2 处 / `RecommendTrigger` 恰 4 项 / `KIND_SET` 40 项 / 9 op 清单 / 特权 op 恰 2 / `BLOCKED_TERMINALS` 恰 5 / 12 kind / 6 终态 / `MAX_OPEN_ASKS = 2` / `NEXT_SERVICES` 6 / 防抖三常量 —— **逐条复核命中**。

### 2.5 编排器代作者决策承接（**定论，直接作为需求约束，不重新讨论**）

| # | 决策（discovery §0.5 逐字要点） | 本规范承载体 |
|---|---|---|
| D1 | **作者已授权编排器代行决策、SDDU 全流程自行调度** | §11 裁决记录（DC-SELF-001~007）；§16 纪律 |
| D2 | **本轮 discovery 不访谈作者基本框架**；开放点收集后附推荐、由 spec 阶段**批量裁决** | §8 开放问题（**O-SELF-001~007 全部 `ruled`**）+ §11 落位表 |
| D3 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/`** | §1 / §14 |
| D4 | **ROADMAP 编号 = F-33**（本轮实测 0 命中；repo-wide 2 处为文字说明，不构成占用）；`F-29` 保持原样不动 | §1 / NG-SELF-012 |
| D5 | **版本位 = v0.11.0（全新，并列新主题）**；登记留给收口（本阶段 ROADMAP **零 diff**） | §1 / FR-SELF-001 |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录**；不改任何 `src/` / `test/` / `dist/` / `design/` / `docs/` 与 `ROADMAP.md`（spec 阶段 = 纯文档阶段，**零产品运行时验证**） | §16 / FR-SELF-005 / NG-SELF-012 |
| D7 | **不上溯改写 v5 产物**：v5 父 / 三叶全部 `validated` 终态**原样保留**；本 Feature 以**并列新主题**立项 | NG-SELF-022 / N-SELF-016 |

### 2.6 目标用户

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v3/v4/v4.5/v5 同一事实基础。**本规范不编造用户调研数据**；「用户原话」栏引用作者既有指示与真机文字记录。

| 角色 | 场景 | 本 Feature 的改善目标 |
|------|------|---------------------|
| **作者（插件唯一真实用户 + 唯一决策者）** | 真机侧栏（`platform.deepseek.com`）：绑定 → 拾取引用 → ask 卡作答「原地翻译为中文」 | ① **答完不再静默**：答案**不被丢弃**，流内**立刻**出现下一个驱动者（已配置 ⇒ AI 自动成回合续流；未配置 ⇒ 系统流主动驱动去配置）；② **不必重打指令**（会话 A 的「答两遍 + 手动重打」不再复现）；③ **主动性可信任**：AI 主动有边界（三档清分）与护栏（打扰 / 成本 / 防环），且**随时可关断** |
| **作者（首次配置 LLM 场景）** | 装好插件、未配置 LLM，第一次打开侧栏 / 第一次在未配置状态下拾取引用 | 主题①逐字：「没有配置 LLM 时：由系统代码流程驱动用户去配置 LLM」——**不必撞一次错误**才知道要配置；配置面**只在流内**（掩码 Key、零明文），**配置完成自动续接**刚才想做的事（悬置任务） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种『用户已表达意图之后该做什么』，要改哪些文件？」 | 答案变成「**注册一个驱动者（`when(ctx)` 谓词）+ 声明一个时机源 + 自带测试**」——主流程（回合入口 / 推荐器求值 / 分发器）**diff = 0** 由机核强制；新增驱动者不再撞「回合入口恰 2 处」与「时机闭集 4 项」双锁（Q-SELF-011 / R-SELF-003 的根因消除） |

### 2.7 与上游 Feature 的关系（**边界**）

- **只读复用**：`NextProvider` 契约 v2 注册表（`definition.ts` / `registry.ts` / `providers.ts` / `pipeline.ts` / `dispatch.ts` / `obligation-table.ts`）；9 op 执行体（`ops.ts` / `op-bodies.ts` / `op-executors.ts` / `snapshot.ts`）；`op-*` type-only 协议（`op-protocol.ts`）；SW 双层执行器 + 两段握手（`bindSwExecutor`）；`BLOCKED_TERMINALS` 恰 5（单源）+ `BLOCKED_RECOVERY_TRIGGER`（按终态键控）；死端守护门禁（`test/ui/no-dead-end.mjs` + `test/s2-deadend-chain.test.ts` + `test/ui/fixtures/s2-chain.mjs`）；流 12 kind + 6 终态 + `MAX_OPEN_ASKS = 2`；L1 引用判定链（`l1/ref-store.ts`）；设置面（`settings/{sections,panel,ops,op-bodies}.ts`）；掩码 secret 卡与法八四面机核；授权 chip 唯一载体（`#auth-state`）。
- **零改写**：v1~v5 的 spec/plan/tasks/build/review/validate/closeout 产物**一字不动**；`docs/v3-supersession-ledger.json` 为**冻结历史，不得解冻**（N-SELF-006）；v5 父 + 三叶 `state.json` / `TREE.md` 零触碰（N-SELF-016）。
- **继承义务**：取代台账八步机制（`docs/v4-supersession-ledger.json`）；体积五要素重登记 + 披露算术机核；V3-VOL-3 三值同源 + `authorConfirmation` 占位口径；保护段（journey / binding）；反证不空转（RP 机制）；`KL-N-10` / `KL-N-08` 已知识别；门禁严格串行纪律；`test/gate-integrity` 受审集合只增（`CHROMIUM_GATES === 9` 不动）。
- **本 Feature 新增面（不越界）**：驱动者层（注册表内扩张）、时机源扩张、确定性引导流（复用既有 `op.llm-config` 与掩码卡）、AI 主动编排（复用 `op.turn` 槽与既有流/卡 taxonomy）、op 三档清分（**静态清分表 + 机核**，不改判定链）、护栏三件套（常量 + 门禁）。**不新增卡类型 / 不新增流内宿主 / 不新增静态权限 / 不新增真值源**。

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 |
|---|---------|
| **G-SELF-001** | **驱动者层成立（母命题）**：「用户已表达意图」的**每一个**时刻（已答 ask / 已交描述 / 绑定完成 / 拾取完成 / 探测稳态 / 授权回执 / 回合结束）之后，**存在一个被承认的驱动者**接手续接；「驱动权归属」**可判**（驱动者 id + 时机源 + 依据的 ctx 事实 + 触发的 opId 四元组可机核）。 |
| **G-SELF-002** | **答案不再被丢弃（法七扩展）**：引用回合 ask 的答案、面板 op ask 的答案、后台 ask 的答案、「改用描述」的文本——**四类「用户已表达的话」都必须产生驱动**；已答 ask / 已交描述成为**被承认的终态**，且**必有下一个驱动者**（可机核、双向反证、禁恒真断言）。 |
| **G-SELF-003** | **主题① 确定性系统流（非 AI）**：LLM 缺席时由**代码**（**零 LLM 调用、零 token**）主动识别并引导用户完成配置（多步、流内闭环、不跳走、不重复打扰）；**配置完成 → 自动续接悬置任务**（S2 范式复用）；首装 / 已装未配**两场景**均覆盖。 |
| **G-SELF-004** | **主题② AI 驱动编排（有界主动性）**：LLM 已配置时 AI / 系统有权**启动回合 / 推进 next**；但主动性受 **op 三档清分**（`auto` / `confirm` / `gesture`）与**护栏三件套**（打扰控制 / token 预算 / 防环）约束，且**用户可随时关断**；**特权 op 恒手势**（不可让渡）。 |
| **G-SELF-005** | **驱动者注册表化（架构可扩张）**：新增一种「用户已表达意图之后该做什么」的改动面 = **注册一个驱动者谓词 + 声明时机源 + 自带测试**；主流程（`requestTurn` 调用点数 / 推荐器求值入口 / 分发器）**diff = 0** 由静态机核强制；**不得**新增第 8 个散落 `maybeRecommend(...)` 调用点。 |
| **G-SELF-006** | **S0 首验收机器化（地位 = v5 之 S2）**：真机 22:49 序列在 headless 下**全链可判**（绑定 → 探测 → 拾取引用 → ask 已答 → **答案产生驱动** → 「已配置 ⇒ AI 自动续流」/「未配置 ⇒ 系统流驱动配置 + 配置完成自动续接」**双分支**），断言「**答案不被丢弃** ∧ **静默 = 0** ∧ **死端 = 0**」；不可合成部分入人工面（不冒充 PASS）。 |
| **G-SELF-007** | **安全与治理不退化**：op 三档清分**静态机核**（新 op 必须归档；未归档 ⇒ FAIL）；特权 op 恰 2 恒 `gesture`；「SW 永不调用 `.request(`」语义等价保留；判定链（`zeroDiffFiles` 9 项）**零触碰**；法八四面零明文不退化；12 kind / 零宿主 / `KIND_SET` 40 逐字 / `content.js` 零容差全部不破。 |
| **G-SELF-008** | **取代与体积等价重锚**：X-SELF-1~7 七项显式取代**全部走判据等价重锚**（断言力不降、计数只增、≥1 注入反证、台账留痕）；**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」落地**；体积先预算后落地（余量 **27,480 B**），越限走五要素重登记 + 档位显式登记（`pending-author-line` **不得伪称已确认**）。 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 |
|---|---------|
| NG-SELF-001 | **不新增卡类型**：12 kind = 7 主类 + 5 过程卡契约不动；驱动者的可见载体**复用既有 taxonomy**（`nextstep` 卡 / 系统事件行 / 既有过程卡）。 |
| NG-SELF-002 | **不改三区法则本身**（法一~法五 / 工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠）；**不改流 = 唯一交互面**这一前提（主题① 的配置引导**必须流内闭环**，不得跳设置页）。 |
| NG-SELF-003 | **不改 `src/content/**` / `dist/content.js` / `dist/pick-layer.js`**（**零容差冻结**：177,076 B / 34,358 B 逐字节；`src/content/**` 零 diff）。 |
| NG-SELF-004 | **不动判定链**（`src/security/policy.ts` / `auto-authorize.ts`，内容哈希 pin）与 `zeroDiffFiles` 冻结面（9 项）；`docs/v3-supersession-ledger.json` **零 diff**。 |
| NG-SELF-005 | **不新增安装期静态权限**：`manifest.permissions` 逐字 5 项（`activeTab`/`scripting`/`sidePanel`/`storage`/`tabs`）/ `host_permissions` 6 条 / 无 `<all_urls>` / 无静态 `content_scripts` / `minimum_chrome_version` 116 逐字不变；**本 Feature 连 `optional_permissions` 也不新增**（驱动者 / 引导 / 主动性均不需要新权限）。 |
| NG-SELF-006 | **不改 `KIND_SET`**：任何新消息族（若有）走 **type-only 先例**（不进 `KIND_SET`；运行时校验落独立模块）；若主张进 `KIND_SET`，须先证 `content.js` **逐字节零增长**（默认禁止）。 |
| NG-SELF-007 | **不放宽任何阈值与口径**：密度 `7/15 · 9/20 · 17/35` 逐字不动；豁免只认 `hidden`；防滥用（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1）不动；`STREAM_HEIGHT_RATIO_MIN = 0.65` **只允许上调**；chips ≤3 / 每回合 ≤1 张推荐卡 / 10 s 防抖不动；`MAX_OPEN_ASKS = 2` 不动。 |
| NG-SELF-008 | **不删除、不降级任何断言**；唯一例外 = 保护段按台账**显式八步取代**并留痕（**不是静默删除**）；断言计数**只增不减**。 |
| NG-SELF-009 | **不设自缚装置**：`SIDEPANEL_CEILING_CAP` 保持 **`record-only`**（V3-VOL-1 ② 教训）；不引入新 cap。 |
| NG-SELF-010 | **不收编会话 / 分组 / tabs 设置 / 诊断 / 主题 / 告警**（v5 `PO-ALLN-001` 已登记 `deferred`）：除非与「驱动者」强耦合，否则不纳入本 Feature。 |
| NG-SELF-011 | **不做外部竞品调研**（**O-SELF-007 裁决：不需要**；登记「未执行，不阻塞」；**不编造竞品结论**）。 |
| NG-SELF-012 | 不改 `ROADMAP.md`（F-33 / v0.11.0 登记留给收口）；`F-29`（A2A 候选）区段**一字不动 / 字节相等**；不改 `packages/web-cli-base/**`；无新依赖；不合 main、不发布、不 force push；`git add` 必须 path-limited（**禁 `git add -A` / `.`**）；禁改 `.opencode/opencode.json`。 |
| NG-SELF-013 | **不新增真值源**：驱动者的 `when(ctx)` 只读**既有** state 字段（`NEXT_SERVICES` 6 项服务面内）；不新增 LLM 产物 / 网络 / 隐私 / 成本面；不新增静态权限。 |
| NG-SELF-014 | **不做 L2 视图内部重构**（tree / commands / audit 三视图既有内容不动）；不改零宿主判据（`REGISTERED_STRUCTURAL_HOSTS = []` 保持；驱动者 / 引导 / 护栏的可见载体**不在流内新增固定宿主**）。 |
| NG-SELF-015 | **存储侧加密 / 凭据生命周期不在本 Feature**（v5 `PO-ALLN-003` 口径延续：只保证**流内零明文**；**不得被误读为「存储已加密」**）。 |
| NG-SELF-016 | **不新造配置面**：主题① 的配置执行体**恒为既有 `op.llm-config`**（掩码 secret 卡 + 值直达 key-store + 法八零明文）；设置视图保留为**管理面**（法六不变）；不得出现第二套配置引导 / 第二套凭据写入路径。 |
| NG-SELF-017 | **不以「AI 主动」名义绕过 `confirm` / `gesture`**：不得降档、不得代答 consent 卡、不得把特权 op 实现为「AI 先发起、用户后补手势」的隐式路径（`gesture` 档 = **用户手势先行**）。 |
| NG-SELF-018 | **不把「主动」实现为第二份半驱动者**：不得新增散落调用点（第 8 个 `maybeRecommend(...)`）；驱动者的**唯一**求值入口 = 推荐器（经时机源），**唯一**回合入口 = `requestTurn`（经 `op.turn` 槽）。 |
| NG-SELF-019 | **不以自动判据冒充人工验收**：真机观感 / 读屏 / 真机主动体感等 headless 不可合成项，逐项标注 `⏳ 未执行` 或 `PASS`，**不得冒充 PASS**。 |
| NG-SELF-020 | **不静默放宽护栏**：打扰 / token 成本 / 防环三条控制不得因实现困难 / 体积不足而取消或放宽（若确需调整须走显式取代登记，**不得静默**）。 |
| NG-SELF-021 | **不把「主动性」做成无条件常驻**：AI 主动**必须**有可关断路径（总开关 / 一次性否决），且默认值必须在 spec 裁决中显式登记（见 FR-SELF-069 / 094 / 096）。 |
| NG-SELF-022 | **不改写 v5 产物**（父 + 三叶全部 `validated` 终态 / pin / 台账 / state 零触碰）；**不删除**任何 v5 已建门禁（只允许**追加**与**等价重锚**）。 |

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| **US-SELF-001** | 作者（真机引用回合作答「原地翻译为中文」后） | **答完就有人接手**：已配置 LLM 时 AI 自动成回合续流；未配置时系统流主动驱动我去配置 | 我不必**重打同一句指令**（会话 A 的「答两遍 + 手动重打」不再复现；会话 B 的「彻底静默」不再复现） |
| **US-SELF-002** | 作者（首次用插件、还没配 LLM） | 被**系统主动**告知「需要先配置 LLM」，并在**流内**逐步完成（厂商 / 模型 / 掩码 Key） | 我不会在一个没有出口的状态里猜；也不必离开流去设置页找 |
| **US-SELF-003** | 作者（配置 LLM 正是为了刚才那件事） | 配置完成后，**系统自动把我刚才想做的事接上**（不丢） | 我配 LLM 的**目的**被系统记住，不必再说一遍 |
| **US-SELF-004** | 作者（想让助手更主动） | 助手在合适的时候**自己**发起下一步（例如拾取完引用后主动问我怎么用、答完后主动开回合） | 我少敲几次键盘，助手像助手而不是像命令解释器 |
| **US-SELF-005** | 作者（担心助手太主动） | 主动性**有边界**（授权 / 权限申请**永远要我自己点**）且**可关断**、不会无限自转、不会偷偷烧 token | 我敢让它主动，而不必担心它替我做了不该做的事 |
| **US-SELF-006** | 作者（答完了引用回合的 ask，但引用在这期间失效了） | 系统**在流内**告诉我引用失效，并给我可达的下一步（重新拾取 / 改用描述） | 「已答」不是一个把我关死的门；失败也是**有出口的终态** |
| **US-SELF-007** | 下游维护者（AI Agent / 未来重构者） | 新增一种「用户已表达意图之后该做什么」= **注册一个驱动者 + 声明时机源 + 自带测试** | 主流程**一行都不用改**；我不会再撞「回合入口恰 2 处 / 时机闭集 4 项」双锁 |
| **US-SELF-008** | 下游维护者（治理） | 「驱动权归属」有**机器证据**（驱动者 ↔ 时机源 ↔ opId 四元组可核）；七项旧红线被取代时**判据等价重锚**而非放宽 | 我不会把「加了驱动者但没接线」或「依赖数悄悄变少」当成绿 |
| **US-SELF-009** | 作者（未配置 LLM 且**正在**打字 / 刚提交一条消息） | 主题① 的驱动与我的输入**不互相吞掉**（不出现「其中一条被静默丢弃」） | 我的输入不会凭空消失（`chatBusy` 的丢弃语义被可判仲裁取代） |
| **US-SELF-010** | 作者（事后回看） | 每一次 AI / 系统**主动**发起的动作都**留痕可审计**（谁发起 / 何时 / 依据什么） | 我能回答「刚才那一步是它自己做的还是我让它做的」 |

---

## 5. 功能需求 (FR)

> **每组前缀含义**：**GOV** 立案与纪律 / **DRIVE** 驱动者层（drive ownership）/ **LAW7X** 法七扩展（终态词汇）/ **TIMING** 驱动时机源 / **ONBOARD** 主题① 确定性系统流 / **AIDRIVE** 主题② AI 驱动编排 / **OPSAFE** op 三档清分 / **GUARD** 护栏三件套 / **SUPERSEDE** X-SELF-1~7 显式取代 / **GATE** 门禁等价重锚与台账 / **VOL** 体积与 V3-VOL-3 / **S0** 首验收场景机器化。
>
> **共 95 条 FR**（GOV 5 / DRIVE 10 / LAW7X 9 / TIMING 7 / ONBOARD 13 / AIDRIVE 11 / OPSAFE 7 / GUARD 8 / SUPERSEDE 8 / GATE 7 / VOL 5 / S0 5）。

### 5.1 GOV — 立案、结构与纪律（横切）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-001 | 本 Feature 使用独立编号空间 `FR-SELF-*` / `NFR-SELF-*` / `EC-SELF-*` / `AC-SELF-*` / `NG-SELF-*`；ROADMAP 编号 **F-33**、版本位 **v0.11.0（并列新主题）** 仅在本规范登记，**不在本轮写入 ROADMAP**（留给收口）；**命名口径明示**：「v5.5 = v5（F-32）驱动者层的结构性收尾，作为 v0.11.0 主题登记」（O-SELF-001 裁决） | `grep -c "F-33" ROADMAP.md` 与 `grep -c "v0.11.0" ROADMAP.md` 均仍为 **0**；`git diff --quiet -- .sddu/specs-tree-root/ROADMAP.md` 通过；本规范与收口文档含命名语义明示句 | P0 |
| FR-SELF-002 | 父 Feature 为**轻量规范容器**（`depth=1`，不承接 build/review/validate，不产出 tasks.json）；实施由 **3 个叶**按依存序承接：`v55-1-driver-layer` → `v55-2-deterministic-onboarding` → `v55-3-ai-driven-orchestration` | 父目录只含 `discovery.md` / `spec.md` / `TREE.md` / `state.json` + 3 个叶目录；叶 `state.json` `leaf:true` / `parent=specs-tree-web-cli-plugin-v55-self-driven` / `deliveryOrder` 1..3 | P0 |
| FR-SELF-003 | **断言零删除零降级、计数只增不减**：任何门禁断言只能**等价重写为新语义**（数量不减）或走**保护段显式取代**（唯一例外，须台账留痕）；v5 已建门禁（11 新门禁 + 既有）**全部保留** | 各门禁计数 ≥ §9.5 基线（逐项）；`npm test ≥1181`；无「断言删除 / 降级 / 静默改常量」 | P0 |
| FR-SELF-004 | **三叶共享面必须一次做完**：体积五要素重登记 / journey 与 binding 保护段处置 / 取代台账（`modifiedRanges[]` / `redlineRemap[]`）/ `knownGap` 一致性，四类被 ≥2 叶触碰 ⇒ **不可分叶**，须在同一轮以统一口径完成并留痕 | 四类共享面各自**恰一次**登记（台账 / 门禁可核）；无「两叶各改一次同一条目」 | P0 |
| FR-SELF-005 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7.1 + 本规范 §2.4）；本轮未跑任何门禁 / 构建 / Chromium；**只读复核**（`grep` / `sed` / 字节 / sha / 类型读取）已执行，差异见 §2.4「复核订正」 | 本轮 `git status --short` 仅含本 Feature 目录；`git diff --quiet -- packages/web-cli-plugin` 通过 | P0 |

### 5.2 DRIVE — 驱动者层（drive ownership，**O-SELF-003 已裁决 = 注册表化**）

> **口径（本 Feature 的核心抽象）**：**驱动者（driver）** = 「在某个**时机**（timing）、依据某组**已有 ctx 事实**（`when(ctx)` 纯谓词）、有权产出某个**下一步**（`chips` = opId 集）」的**注册表条目**。驱动者**不新造执行面**——它产出的永远是既有 9 op 之一（经既有管线执行）。「**驱动权归属可判**」= 「驱动者 id + 时机源 + 依据事实 + 产出 opId」四元组可从**唯一声明源**抽取并机核。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-010 | **驱动者 = 注册表条目**（O-SELF-003 ①）：驱动者形态**恒为** `NextProvider` 契约 v2 条目（`{id, deps, priority, mode, fail, when(ctx), chips}`）；**驱动者集合 = 注册表 provider 集合**，二者**同源**（不得存在「注册表外的驱动者」或「驱动者专用旁路」） | 「驱动者集合 ≡ 注册表 provider 集合」机核断言（双向包含）；反证：在注册表外新增一处驱动逻辑 ⇒ FAIL | P0 |
| FR-SELF-011 | **驱动者四元组机核（驱动权可判）**：每个驱动者必须能机核出四元组——① `driverId`（provider id，唯一）② `timing`（触发的时机源，∈ 时机源闭集）③ `evidence`（`when(ctx)` 读取的 ctx 字段集，⊆ `NEXT_SERVICES` 派生面）④ `ops`（`chips` 的 opId 集，全部 ∈ 9 op 注册表，**无悬空**） | 四元组抽取机核（新门禁）全绿；反证：任一驱动者缺任一元 ⇒ FAIL；chips 悬空 ⇒ FAIL（复用 v5 义务表机核形态） | P0 |
| FR-SELF-012 | **七类「已表达意图」时刻枚举（驱动者覆盖面）**：**恰好 7 类**——① 已答参考回合 ask ② 已交描述（改用描述）③ 绑定完成 ④ 拾取完成 ⑤ 探测稳态 ⑥ 授权回执（批准 / 拒绝）⑦ 回合结束。该枚举**单一声明源**，任何驱动者必须能归属到 ≥1 类 | 枚举从源文本抽取后**恰 7 项**；「声明恰一次」扫描绿；每类**逐类**断言「存在 ≥1 个驱动者归属」；反证：移除某类的全部驱动者 ⇒ FAIL | P0 |
| FR-SELF-013 | **「必有下一个驱动者」判据（驱动者层核心）**：任一「已表达意图」时刻发生后的 **N = 0**（同屏紧随，**不引入新的等待窗口**）内，**必然存在**可达的驱动者（可见形态 = 流内出现 `nextstep` 卡 / 已发生自动续接 / 已产出可达 next）；判定对「新增时刻却无驱动者」与「已有驱动者被删」**双向**变红 | 7 类逐类断言 + 双向注入反证各 FAIL → 还原 PASS；判据纳入 `gate-integrity` 受审集合 | P0 |
| FR-SELF-014 | **驱动者去重（同因不重复）**：同一「因」（同一 `driverId` × 同一 ctx 事实快照）**不得**产出第二条相同推荐 / 不得重复发起；去重键 = `driverId + ctx 摘要`（单源常量） | 同因重复注入反证（连续两次求值 ⇒ 产出数不增）；去重键单源扫描绿 | P0 |
| FR-SELF-015 | **驱动者不得新增散落调用点**（NG-SELF-018）：**求值入口恰一处**（推荐器 `maybeRecommend` 家族）+ **回合入口恰一处语义**（`requestTurn`，经 `op.turn` 槽）；驱动者**不得**自带调用点 | 生产调用点计数机核：`maybeRecommend(` **定义点恰 1 处**、**调用点不增**（基线 = 7 处，**只允许在既有入口内新增时机源**）；`requestTurn(` 调用点计数按 X-SELF-1 口径（§12）；反证：新增第 8 个调用点 ⇒ FAIL | P0 |
| FR-SELF-016 | **驱动者的执行体恒为既有 opId**：驱动者产出的下一步**只能是** 9 op 之一（经既有统一管线 `next chip →（params?）→（consent?）→ execute → receipt`）；**不得**为驱动者新造执行路径 / 新 op 执行体 | 「驱动者 chips ⊆ 9 opId」机核；「管线唯一」判据（无 per-op / per-driver 旁路）全绿 | P0 |
| FR-SELF-017 | **确定性驱动 vs AI 驱动清分（同一注册表）**：**主题①** 的驱动者**恒为确定性**（零 LLM 调用，`when(ctx)` 仅读既有事实）；**主题②** 的驱动者**可由 AI 参与决策**（是否自动按下）；两类**同处一个注册表**、**同用一套四元组**，以 `driverClass: 'deterministic' \| 'ai-driven'` 显式标注（单源） | 每个驱动者**恰属一类**；`driverClass` 单源 + 机核；「确定性驱动者零 LLM 调用」断言（FR-SELF-047） | P0 |
| FR-SELF-018 | **驱动者求值顺序可判**：多源并发时的求值顺序**显式化**（继承并扩张 `NEXTSTEP_PRIORITY` 既有优先级语义）；新增驱动者**必须**声明 `priority`；同优先级以 `prepend` 语义定序（继承 v5 R3） | 优先级表单源 + 逐驱动者 `priority` 非空断言；列表位置置换测试（顺序不因列表位置而变）；反证：`priority` 缺失 ⇒ FAIL | P0 |
| FR-SELF-019 | **驱动者层的声明单源 + 门禁抽取**：驱动者四元组表 / 七类时刻枚举 / 时机源闭集 / `driverClass` 四者各**恰一处**声明，且由门禁**从源文本抽取**机核（不得靠注释 / 人工对账） | 「声明恰一次」扫描逐项绿；任一处出现第二声明确实红（反证） | P0 |

### 5.3 LAW7X — 法七扩展（已答 ask / 已交描述入终态词汇，**X-SELF-4**）

> **法七原形（v5）**：5 类**阻塞终态**流内必有可达 next（死端 = 0）。**v5.5 扩展**：把「**已表达意图**」也纳入终态词汇——**已答 ask / 已交描述**成为**被承认的终态**，且**必有下一个驱动者**。**法七不退化**（N-SELF-019）：既有 5 类阻塞判据**全部保留**。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-020 | **终态词汇扩张（单源）**：新增两个「已表达意图」终态类别——① **已答 ask**（三型：引用回合 `ref-round-<refId>` / 面板 op `params` ask / 后台 ask）② **已交描述**（`ref-describe`）；该扩张**不得**改写既有 6 终态常量（`STREAM_TERMINALS` 6 项逐字不动），而是新增**独立的「驱动者终态词汇」单源**（与流终态**正交**：流终态 = 卡的生命周期；驱动者终态 = 「用户已表达意图」的可判事件） | 新词汇单源**恰一处**声明；`STREAM_TERMINALS` 6 项逐字不变（等价重锚，非改写）；两词表关系（正交 / 派生）文档化 + 机核 | P0 |
| FR-SELF-021 | **已答 ask 必有可达 next**：任一型 ask 被「已答」结算后 **N = 0** 内流内存在可达 next（或自动续接已发生）；判定对「新增一种 ask 却无 next」与「已答后 next 被移除」**双向**变红 | 三型 ask **逐型**断言；双向注入反证各 FAIL → 还原 PASS | P0 |
| FR-SELF-022 | **答案必须产生驱动（引用回合）**：`submitAskFor` 对 `ref-round-<refId>` 的作答路径**必须**在结算后产生**可判的驱动**（自动回合续流 **或** 流内可达 next），**不得**止于「有效性裁决 + 计数」（X-SELF-5） | 「答案 → 驱动」链路机核：断言「答案文本作为回合输入 / 悬置任务输入**可判命中**」∧ 断言「`sends` 递增**不足以**满足本判据」；反证：恢复为「只计数」⇒ FAIL | P0 |
| FR-SELF-023 | **「已答」判定口径显式化（禁恒真断言）**：已答的判定必须**可证伪**且穷举口径——① 非取消（`canceled = false`）且 trimmed 非空 ⇒ **已答**；② 取消（含空提交）⇒ **已取消**（也是终态，但语义不同，**不得**记作「已答」）；③ 取消原因 ∈ `ASK_CANCEL_REASONS` 4 项（`user`/`timeout`/`superseded`/`aborted`）逐字不变；④ 后台 ask 在回合结束后到达 ⇒ **不记「已答」**（见 FR-SELF-028） | 四口径逐条断言；「已答」判据在「取消 / 空值」注入下**必不成立**（反证）；`ASK_CANCEL_REASONS` 4 项逐字命中；**无恒真断言**（每条判据可注入违反面） | P0 |
| FR-SELF-024 | **终态判据不得空转（双向反证 + 注入必红）**：新增 / 改动的每条终态判据必须 ① 注入违反面 → **实跑 FAIL**（声明 `expectFailPattern`）② **逐字节还原**（sha256 前后相同）→ 实跑 PASS；**禁止**「删属性充数 / 换口径充数 / 自我裁决自我验收」（v4.5 三类「反证恒绿」教训） | 每条判据留有「注入 FAIL → 还原 PASS」两段证据（日志全量）；无「不再 FAIL 的判据」遗留；注入文件 sha256 前后逐字节相同 | P0 |
| FR-SELF-025 | **`applyRefAction` 语义重定义（X-SELF-5）**：从「**只做有效性裁决 + 计数**」重定义为「**裁决 + 驱动**」——有效性通过后，**必须**把答案交给驱动者层（作为悬置任务 / 回合输入），使其产生下一个驱动；无效（`ref.all-invalid`）时走**既有阻塞终态**路径（法七既有判据，非死端） | `applyRefAction` 调用点**恰一处**（既有路径）；「有效 ⇒ 驱动」与「无效 ⇒ 阻塞终态 + 可达 next」两条路径逐条断言 + 反证 | P0 |
| FR-SELF-026 | **`commandSends` 消费面显式登记（或退役）**：`commandSends` 若保留，必须在台账 / 文书中**显式登记其消费面**（按 §2.4 **COR-1** 订正后的口径 = **1 处只读投影消费者 + 3 处测试消费者，零驱动语义消费者**）；若退役，须走显式取代登记（**不得静默删除**） | 消费面登记条目存在且与实测一致；「零驱动语义消费者」断言；二选一（保留登记 / 退役登记）**显式**，无第三态 | P0 |
| FR-SELF-027 | **「改用描述」补齐驱动（X-SELF-6）**：`submitDescribe` 在 `ask-resolved` 留痕之后**必须**产生可判的驱动（流内可达 next / 自动续接），**不得**止于 `dispatch`（R6 旁路死端消除）；空描述 ⇒ **卡内校验、零副作用**（不产回执、不改状态、不驱动） | 「已交描述 ⇒ 驱动」链路机核；空描述零副作用断言；反证：恢复为「只 dispatch」⇒ FAIL | P0 |
| FR-SELF-028 | **后台 ask 迟到作答非死端**：`askBridge.settle` 在回合已结束时返回 `false` 的路径**不得**止于裸 `errorResponse`——必须**在流内固化该事实**（「回合已结束，未接住该答案」）并给出**可达 next**（重发该答案 / 重新提问 / 改用描述，由驱动者产出）；**不得**静默丢弃用户的答案（用户已表达意图 ⇒ 必经终态词汇） | 「迟到作答」路径断言「固化 + 可达 next」；反证：恢复为裸 `errorResponse`（无固化无 next）⇒ FAIL；与 FR-SELF-023 ④ 口径一致 | P0 |

### 5.4 TIMING — 驱动时机源（**O-SELF-005 已裁决 = 优先注册表内扩张**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-030 | **时机源扩张：新增 `'answered'`（及必要的同族时机）**：`RecommendTrigger` 从恰 4 项（`'pick'\|'stale'\|'idle'\|'firstRun'`）**扩张**为 4 + N 项，其中**必须**含 `'answered'`（语义 = 「某个已表达意图的终态刚刚发生」）；扩张**必须是等价重锚**（旧 4 项语义与判据逐条保留，计数只增） | 时机源闭集单源抽取后含 `'answered'` 且**旧 4 项逐字仍在**；旧 4 项各自判据不减；反证：删除旧项 ⇒ FAIL（等价重锚非放宽） | P0 |
| FR-SELF-031 | **`ref-action` 抑制条件显式重锚（X-SELF-2）**：`ref-action` 的 `when` 含 `ctx.session.openAsks === 0`（ask 开着时抑制）——该抑制**必须显式裁决**：答完之后（`'answered'` 时机）**必须**重新求值并产出可达 next（不再「答完永不重跑」）。允许的读法：① **时机侧解决**（`'answered'` 触发重新求值，`when` 保留）② **`when` 侧等价重锚**（抑制条件改为「无**未答** ask」而非「无开口 ask」）；二选一须**显式登记** | 答完后**恰在一次 `'answered'` 求值内**产出可达 next；反证：把时机删掉 ⇒ FAIL（复现会话 B 静默）；`when` 语义变更须显式台账登记 | P0 |
| FR-SELF-032 | **时机源闭集单源 + 计数机核**：时机源集合**恰一处**声明，门禁从源文本抽取；扩张后**元素数 ≥ 5**（4 + `'answered'`）且 `'answered'` ∈ 集合；**不得**以字符串字面量散落（除单源与调用点白名单外不得出现裸字面量） | 单源扫描绿；计数 ≥5 且含 `'answered'`；散落字面量扫描零命中；反证：新增第 5 项却未入单源 ⇒ FAIL | P0 |
| FR-SELF-033 | **时机源触发点不增（扩张不靠散落调用点）**：允许新增**触发点**，但全部**必须**经既有**单一求值入口**（`maybeRecommend` 家族）；**禁止**新增第二个求值入口 / 第二个推荐器 | 求值入口计数机核（**恰一处定义**）；反证：新增第二个推荐器 ⇒ FAIL | P0 |
| FR-SELF-034 | **时机源继承既有防抖与预算（不破）**：新增时机源**不得**绕过既有防抖与上限——`NEXTSTEP_MIN_INTERVAL_MS = 10_000` / 单卡 ≤ **3** chip / 每回合 ≤ **1** 张推荐卡；新增时机源的出现**不得**使上述常量被改（**逐字不动**） | 三常量逐字命中（`recommend.ts:50,60`）；10 s 内重复触发被抑制的断言；反证：放宽任一常量 ⇒ FAIL | P0 |
| FR-SELF-035 | **时机源与 `firstRun` 语义不冲突**：新增时机源**不得**与 `firstRun`（首装单次消费）语义混淆；「每次面板生命至多消费一次」的既有纪律（`maybeRecommendFirstRunEntry`）**保持**且**仅**适用于 firstRun 面；新时机源**不得**复用该「至多一次」语义（否则会漏掉第二次已答） | firstRun 至多一次断言不减；新时机源在**同一次面板生命内可多次**触发（受 FR-SELF-014 去重与 FR-SELF-034 防抖约束）的断言；反证：把新时机并入「至多一次」⇒ FAIL | P0 |
| FR-SELF-036 | **时机源 ↔ 驱动者映射表机核**：维护「时机源 × 驱动者」映射表（哪些驱动者在哪些时机求值），并**从源文本抽取**机核；映射表须能回答「**答完之后谁会接手**」（= 至少一个 `driverClass` 明确的驱动者） | 映射表存在 + 行数 / 元素集与注册表**同源**一致；「答完之后恰 ≥1 个驱动者」断言；注入「映射表多一行 / 少一行 / 悬空 timing」三类反证各 FAIL | P0 |

### 5.5 ONBOARD — 主题① 确定性系统流（LLM 未配置 → 引导配置 → 自动续接，**O-SELF-002 已裁决**）

> **确定性口径（作者原话逐字）**：「由系统**代码**流程驱动用户去配置 LLM」。⇒ **零 LLM 调用、零 token**；同输入同路径；纯 `when(ctx)` 可判；可机核。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-040 | **`runChat` 前置配置判据（主动式，O-SELF-002 ①）**：「**意图需要 LLM 即主动识别**」——`runChat` 在**发起 provider 调用之前**必须做**确定性**配置判据：若 LLM 未配置（凭据 / provider / model 任一缺失），**不得**先撞 provider 再以错误事件收场（R5），而应**主动**产出确定性引导（系统流）；判据**确定性可判**（零 LLM 调用） | `runChat` 前置判据存在且**先于** `providerChat` 执行（源码序可核）；未配置注入 ⇒ 「产出引导」而非「LLM 错误事件」；反证：删掉前置判据 ⇒ FAIL（复现 R5 被动式） | P0 |
| FR-SELF-041 | **`llm.unconfigured` 触发语义升级：从「被观测」→「被识别」（X-SELF-3）**：阻塞事实的产生**不再仅**依赖「op 失败 / 被拒后被动写入」（`noteLlmBlockedFact` 的 “observed block event” 语义**保留**），而是**新增主动识别**路径（确定性判据命中即成立）；**两条路径并存**，且**不得**削弱既有 op 恢复链（`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` 逐条保留） | 两条路径**均**可产出 `llm.unconfigured` 事实（双源一致：同一终态词汇）；既有 op 恢复链判据全部不减；反证：把被动路径删掉 ⇒ FAIL（合法降级场景丢失） | P0 |
| FR-SELF-042 | **确定性引导流（多步）形态**：主题① 的引导为**多步确定性流**（步骤集合单源、顺序确定、每步可判）：至少覆盖 **① 识别环节（发现未配置）→ ② 引导环节（在流内产出「配置 LLM」next）→ ③ 采集环节（复用 `op.llm-config` 的 params/consent 管线）→ ④ 完成环节（回执 + 自动续接）**；步骤集合**恰一处**声明且机核 | 步骤集合从源文本抽取后与需求描述一致；每步**逐步**可判（存在性 + 顺序）；反证：删掉任一步 ⇒ FAIL | P0 |
| FR-SELF-043 | **首装 / 已装未配两场景覆盖**：① **首装**（`firstRun`，既有 `R-ONBOARDING` 单行引导**保留不取代**）② **已装未配**（`firstRun = false ∧ LLM 未配置`，**当前零覆盖**，v5 仅首装）——两场景**均**必须被主题① 驱动覆盖 | 两场景各自断言「产出配置引导 next」；反证：注入 `firstRun = false`（已装未配）仍须产出（**不得**依赖 firstRun）；既有 `R-ONBOARDING` 判据不减（扩张不取代） | P0 |
| FR-SELF-044 | **既有 `op.llm-config` 为唯一配置执行体（不新造配置面）**：主题① 的配置采集 / 写入**恒经**既有 `op.llm-config`（掩码 secret 卡 + consent 卡 + 值直达 key-store + 法八零明文 + 失败快照回滚）；**不得**新增第二套配置引导 / 第二套凭据写入路径 | 「凭据写入 sink **恰一处**」断言（继承 v5 法八机核）；配置执行入口**唯一**；反证：新增第二写入点 ⇒ FAIL | P0 |
| FR-SELF-045 | **配置完成 → 自动续接悬置任务（S2 范式复用）**：① **悬置任务**必须**单一登记**（谁在等、等什么、依据什么事实；单源）；② 配置完成（`op.llm-config` 成功回执）后，系统**自动**把悬置任务接上（等价语义 = 把**触发配置的那次「已表达意图」**作为回合输入 / 驱动重新按下）；③ **不得**要求用户重新输入 | 「悬置任务单一登记点」扫描绿；「配置完成 ⇒ 自动续接」机器化（S0 分支 B 的核心，见 FR-SELF-131）；反证：删掉自动续接 ⇒ FAIL（复现「配完还要重说一遍」） | P0 |
| FR-SELF-046 | **取消 / 放弃引导非死端 + 不重复打扰**：用户取消 / 关闭引导 ⇒ **不重复弹同一条引导**（同因不重复，继承 FR-SELF-014；继承 `maybeRecommendFirstRunEntry` 的三纪律：**事件化 / 至多一次 / 事实到位**）；且取消本身**必有可达 next**（不是死端） | 取消后**不再**产出同因引导（同会话内）；取消路径「固化 + 可达 next」断言；反证：取消后立即重复弹 ⇒ FAIL | P0 |
| FR-SELF-047 | **确定性可核（零 LLM 调用）**：主题① 全流程**不得**产生任何 LLM 调用（无 token 消耗、无网络请求面）；同输入 ⇒ 同路径（可重复）；判据可机核 | 「主题① 路径零 LLM 调用」机核断言（调用点 / 事件流双向）；同输入两次运行路径一致断言；反证：在主题① 注入一次 provider 调用 ⇒ FAIL | P0 |
| FR-SELF-048 | **引导不跳走（流内闭环）**：引导**必须在流内**完成（next 卡 / 流内 ask 卡 / 流内回执），**不得**打开设置页 / 切换视图 / 跳转 options；设置视图保留为**管理面**（法六不变） | 「引导路径零视图切换 / 零 `#open-settings` 调用」断言；反证：把引导实现为打开设置页 ⇒ FAIL（违 NG-SELF-002） | P0 |
| FR-SELF-049 | **掩码 secret 卡复用 + 法八不退化**：配置采集复用既有掩码卡（`type="password"` / `data-secret="true"`）；**流内 payload / digest / 审计 / DOM value 四面零明文**机核**不退化**（25 断言基线不减） | `test/ui/law8-plaintext.mjs` 计数 ≥25 且全绿；四面逐面断言不减；反证：让引导路径把值落流内 ⇒ FAIL | P0 |
| FR-SELF-050 | **配置完成回执 + 续接的可判顺序**：顺序必须是「**配置成功回执** → **续接发生**」（不得续接在前 / 不得在配置失败时续接）；配置失败（连接测试失败等）⇒ 快照回滚（旧配置逐字段不变）+ 错误卡 + 可达 next + **悬置任务保留**（不丢） | 顺序机核（事件序）；失败路径「回滚 + next + 悬置保留」断言；反证：配置失败仍续接 ⇒ FAIL | P0 |
| FR-SELF-051 | **与 v5 `R-ONBOARDING` 的关系 = 扩张不取代**：既有 `onboarding` provider（`firstRun && pendingSteps.length > 0` → 2 chip）**保留原样**；主题① 新增的驱动者**不得**与之冲突（同 ctx 下**不得**产出重复 chip / 不得把 `pendingSteps` 语义改写） | `onboarding` provider 的 `when` / `chips` / `textOf` 语义零改写（等价重锚可，但判据不减）；同 ctx 下无重复 chip 断言 | P0 |
| FR-SELF-052 | **配置探测 = 确定性可判**：定义并单源声明「已配置 LLM」的确定性判据（至少 = 凭据存在 ∧ `providerId` 有效 ∧ `model` 非空；**具体字段由 plan 定**，但**判据必须确定性、可机核、无 LLM 调用**）；该判据是主题① ↔ 主题② 的**唯一分流依据** | 判据单源 + 机核；分流断言（已配置 ⇒ 主题② 路径；未配置 ⇒ 主题① 路径，**互斥且完备**）；反证：判据不确定（依赖 LLM 输出）⇒ FAIL | P0 |

### 5.6 AIDRIVE — 主题② AI 驱动编排（**O-SELF-005 ① 已裁决：注册表内扩张**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-060 | **AI / 系统有权启动回合（经既有 `op.turn` 槽）**：启动回合**必须**经**既有** `op.turn` 槽（= 既有唯一回合入口 `requestTurn` 的既有接线），**不得**新增 `requestTurn` 调用点（X-SELF-1 读法 ①：**保持恰 2 处，diff = 0**）；只有「谁触发 `op.turn`」的**驱动者**是新增的 | `requestTurn(` 调用点数**仍恰 2 处**（门禁原判据**不改**）；「AI 主动发起回合」的路径**唯一**经 `op.turn`；反证：新增第三个 `requestTurn(` 调用点 ⇒ FAIL | P0 |
| FR-SELF-061 | **并发仲裁可判（`chatBusy` 语义重锚，X-SELF-7）**：AI / 系统主动发起回合与用户手输**撞车**时，**不得**静默丢弃任何一方（现语义：第二条被丢弃 + 回错误）；必须**可判仲裁**（候选：排队 / 合并 / 明确拒绝并保留用户输入；**具体策略由 plan 定**，但必须：① 用户输入**永不静默丢失** ② 仲裁结果**留痕可判** ③ 仲裁**有界**） | 并发注入断言：AI 主动 + 用户提交同时发生 ⇒ **用户输入不丢**（可判：进入队列 / 被明确告知）；仲裁结果留痕断言；反证：用户输入被静默吞掉 ⇒ FAIL | P0 |
| FR-SELF-062 | **可见载体复用既有 taxonomy（零新增 kind / 零新增宿主）**：AI 主动的可见留痕**只能**复用 12 kind（`nextstep` 卡 / 系统事件行 / 既有过程卡）；**不得**新增第 13 kind；**不得**新增流内固定宿主（`REGISTERED_STRUCTURAL_HOSTS = []` 保持；「任意深度零 `[data-host]`」判据不减） | 12 kind 常量逐字不变；`REGISTERED_STRUCTURAL_HOSTS` 仍为 `[]`；零宿主判据全绿；反证：新增 kind / 宿主 ⇒ FAIL | P0 |
| FR-SELF-063 | **AI 主动的驱动来源可判（留痕）**：每次 AI / 系统主动发起，必须在流内**可判地**留下「**谁发起**（driverId）/ **何时** / **依据什么**（ctx 事实摘要）」三要素（复用既有系统事件行 / 卡；**零明文**口径不破——摘要不得含敏感值） | 三要素可判断言（从流内可读出 driverId + ts + 依据摘要）；零明文同 FR-SELF-049；反证：去掉留痕 ⇒ FAIL | P0 |
| FR-SELF-064 | **AI 主动有界（不自转）**：AI 主动**必须**有终止条件——冷却 + 连续自动链深度上限（见 FR-SELF-092）；达界后**不得**继续自动发起（转为等待用户手势 / 产出「需要你决定」的 next）；达界本身**非死端** | 连续链达深度上限即停的断言（达界后不再自动发起）；达界后仍有可达 next 断言；反证：无限自转（深度上限被绕过）⇒ FAIL | P0 |
| FR-SELF-065 | **分工：注册表定「候选」，驱动者定「是否自动按下」**：AI 主动**不得**自造候选——候选**恒**由注册表 `when(ctx)` 产出（v5 契约 v2 语义不变）；AI / 驱动者只决定「**是否自动按下**某个已产出的候选」（仅 `driverClass: 'ai-driven'` 的驱动者有此权） | 「候选来源 = 注册表」（禁止 AI 自造 chip / opId）断言；`driverClass` 权限矩阵机核（确定性驱动者**无**「自动按下」权）；反证：AI 产出非注册表 opId ⇒ FAIL | P0 |
| FR-SELF-066 | **AI 主动失败非死端**：AI 主动发起的回合若失败（provider 错误 / 超时）⇒ 单卡边界捕获 + 固化 + **可达 next**（继承 v5 R5 ① 语义）；**不得**触发无限重试（重试受 FR-SELF-064 约束） | 失败路径「固化 + 可达 next」断言；「重试有界」断言；反证：失败后静默 ⇒ 或无限重试 ⇒ FAIL | P0 |
| FR-SELF-067 | **AI 主动不得触碰安全判定**：判定链（`src/security/policy.ts` / `auto-authorize.ts`，`zeroDiffFiles` 内容哈希 pin 9 项）**零触碰**；AI 主动**不得**绕过 `confirm` / `gesture` 档（不得降档、不得代答 consent）；**特权 op 恒手势** | `zeroDiffFiles` 内容哈希逐项命中；「AI 主动路径不得调用判定链写入面」断言；「特权 op 恒 gesture」同 FR-SELF-081；反证：AI 代答 consent / 降档 ⇒ FAIL | P0 |
| FR-SELF-068 | **AI 主动的用户否决权**：用户对一次 AI 主动的否决 ⇒ ① **本次**不再发生（不立即重试）② **可登记为「同类不再主动」**（会话内 / 持久，**具体范围由 plan 定**但必须可判）；否决本身**非死端** | 否决后「本次不复发」断言；「同类不再主动」登记可判断言；否决路径可达 next 断言 | P0 |
| FR-SELF-069 | **AI 主动的总开关（可关断）**：必须存在**可判**的关断面（`默认值` 显式登记）；关断后 AI **不得**主动发起；**主题① 是否随总开关关断须显式裁决**——**本规范裁决：主题① 不受 AI 主动开关控制**（因其零 token、确定性、且是「不配置则功能不可用」的必要引导），该口径须**显式登记** | 关断后「AI 主动零发起」断言；「主题① 仍工作」断言（口径显式登记）；默认值在文书与实现**同源**声明；反证：关断失效 ⇒ FAIL | P0 |
| FR-SELF-070 | **主题② 的成立前提 = 已配置 LLM**：`driverClass: 'ai-driven'` 的驱动者**仅**在配置判据（FR-SELF-052）成立时激活；未配置 ⇒ **恒**走主题①（不得出现「未配置却尝试 AI 主动」） | 分流互斥完备断言（未配置 ⇒ 零 AI 主动发起）；反证：未配置时 AI 主动发起 ⇒ FAIL | P0 |

### 5.7 OPSAFE — op 三档清分（安全边界清单，**O-SELF-004 已裁决**）

> **三档定义（单源，机核）**：
> - **`auto`（AI 可自主）**：**不写安全面状态**（不新增 / 不修改授权 · 权限 · 凭据三表；不产生不可逆效果）⇒ AI 可自主发起。**成员恰 5**：`op.pick` / `op.describe` / `op.help` / `op.rebind`（幂等读）/ `op.turn`（发声回合，受护栏约束）。
> - **`confirm`（AI 可发起，需用户点确认）**：**写状态或不可逆** ⇒ AI 可**发起**，但 **consent 卡必须由用户作答**（AI **不得**代答）。**成员恰 2**：`op.llm-config`（写凭据）/ `op.revoke`（高 · 不可逆）。
> - **`gesture`（必须用户手势）**：**特权（浏览器侧权限 / 站点 origin 权限）** ⇒ AI **不可发起**，也不得代答 consent。**成员恰 2**：`op.authorize` / `op.perm.request`（**恒在此档**）。
> - **合计 9 = 5 + 2 + 2**（与 v5 的 9 op 清单**一一对应，零遗漏零新增**）。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-080 | **三档清分表（单源）**：9 op **逐个**归入 `auto` / `confirm` / `gesture` 三档**恰一档**；清分表**恰一处**声明、机核（计数 5 / 2 / 2 + 成员集逐字） | 清分表从源文本抽取后 = `{auto: 5, confirm: 2, gesture: 2}` 且成员集与本节表一致；「恰一档」断言（无未归档 / 无多重归档） | P0 |
| FR-SELF-081 | **特权 op 恒 `gesture`**：`op.authorize` / `op.perm.request` **恒**在 `gesture` 档；「**SW 永不调用 `.request(`**」的既有语义**等价保留**（运行时申请仍在用户手势路径内 / 页面侧）；**AI 不可自动执行**（不可让渡） | 特权 op 清单**恰 2**；`.request(` 调用点唯一 + 手势路径断言（等价重写，**计数不减**）；反证：AI 自动执行特权 op ⇒ FAIL | P0 |
| FR-SELF-082 | **`confirm` 档语义机核**：`op.llm-config` / `op.revoke` 的 `consent` 卡**禁止**被 AI / 系统代答（作答方必须可判为「用户」）；且 AI 发起 `confirm` 档时**必须**产出可见的 confirm next（不得隐式执行） | 「consent 作答方 = 用户」机核；「AI 发起 confirm ⇒ 产出可见 next」断言；反证：AI 代答 consent ⇒ FAIL | P0 |
| FR-SELF-083 | **`auto` 档边界语义机核**：`auto` 档成员**不得**产生对授权 / 权限 / 凭据三表的写入；对三表的写入**只允许**出现在 `confirm` / `gesture` 档的 op 内（写入点 = 既有 sink，单源） | 「`auto` 档 op 零三表写入」断言（静态 + 运行期）；写入 sink 单源扫描；反证：让 `auto` 档 op 写凭据 ⇒ FAIL | P0 |
| FR-SELF-084 | **新 op 必须归档（机核清单）**：**任何**新增 op **必须**归入三档之一；未归档 ⇒ 门禁 FAIL；同样规则适用于**新增特权面**（新特权 ⇒ 恒 `gesture`） | 「注册表 opId 集 == 清分表 opId 集」双向一致断言；注入「新增 op 未归档」⇒ FAIL（即红）；注入「新特权未归 gesture」⇒ FAIL | P0 |
| FR-SELF-085 | **AI 不得降档**：AI / 系统**不得**把 `confirm` / `gesture` 档 op 当作 `auto` 执行；**不得**实现「AI 先发起 + 用户后补手势」的隐式路径（`gesture` = **用户手势先行**） | 「AI 发起路径 ⊆（`auto` ∪ `confirm` 发起）」断言；「`gesture` 档 op 的发起方 = 用户手势」机核；反证：AI 先发起特权 op ⇒ FAIL | P0 |
| FR-SELF-086 | **清分表与既有 op 风险级 / consent / 执行层声明一致**：清分表必须与既有 `ops.ts#IMPL` 的 `riskLevel` / `consent` / `layer` 声明**一致**（不一致即红）；`op.turn` 归 `auto` 的**理由**（发声回合不写安全面 + 受护栏约束）在文书显式登记 | 一致性机核（逐 op 对照 `riskLevel` / `consent` / `layer`）；`op.turn` 归档理由文书存在；反证：清分与 `IMPL` 声明冲突 ⇒ FAIL | P0 |

### 5.8 GUARD — 主动性护栏三件套（**O-SELF-006 已裁决 = 三控制全入 spec + 载体零新增**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-090 | **打扰控制**：① **频次上限**（单位时间内的主动发起次数上限，单源常量）② **同因不重复**（继承 FR-SELF-014）③ **静默期**（用户刚否决 / 刚交互后的一段时间内不主动）④ 继承既有 10 s 防抖（**不改常量**） | 上限常量单源 + 越限被抑制断言；静默期断言；同因重复注入 ⇒ 不产出；反证：删掉任一条 ⇒ FAIL | P0 |
| FR-SELF-091 | **token 成本控制**：AI 主动回合**必须**有**预算上限**（单源常量：单位时间内 / 单位会话内的主动回合数上限，或**等价口径**，由 plan 定）；达上限 ⇒ **不再** AI 主动（转确定性路径 / 等待用户手势），**非死端** | 预算常量单源 + 达界停发断言；达界后可达 next 断言；反证：预算被绕过（无限主动回合）⇒ FAIL | P0 |
| FR-SELF-092 | **防环控制**：① **连续自动链深度上限**（AI 主动 → 产出 next → 又主动 … 的链深度上限，单源常量）② **冷却**（两次自动发起间的最小间隔，与既有 10 s 防抖**同源或显式登记关系**）③ 达界 ⇒ 强制转用户手势 | 深度上限常量单源 + 达界停链路断言；冷却断言；反证：构造自触发环 ⇒ 必须在上限处被截断（**无上限 ⇒ FAIL**） | P0 |
| FR-SELF-093 | **三控制的单源 + 机核**：三个上限常量（频次 / 预算 / 链深度）各**恰一处**声明且门禁从源文本抽取；**不得**散落字面量 | 单源扫描逐项绿；散落字面量零命中；反证：在别处写第二份 ⇒ FAIL | P0 |
| FR-SELF-094 | **用户可关断（总控）**：护栏之上存在**用户可判的关断面**（同 FR-SELF-069），关断后**所有** AI 主动停止（主题① 除外，口径显式登记）；关断状态**持久可判** | 关断面存在 + 关断后零主动断言；关断状态持久化断言；主题① 例外口径登记 | P0 |
| FR-SELF-095 | **载体零新增（kind / 宿主 / 消息族）**：护栏与主动性的可见载体**复用既有 taxonomy**（12 kind、系统事件行、既有 op 管线）；**零新增 kind / 零新增流内宿主 / 零新增 `KIND_SET` 项** | 12 kind 逐字不变；`REGISTERED_STRUCTURAL_HOSTS = []`；`KIND_SET` 40 项逐字不变；反证：任一新增 ⇒ FAIL | P0 |
| FR-SELF-096 | **打断不可丢用户输入**：护栏触发的抑制 / 拒绝**不得**丢弃用户已提交的输入（同 FR-SELF-061）；抑制必须**留痕可判**（用户能看到「刚才是被抑制了还是没反应」） | 「抑制留痕」断言；「用户输入零丢失」断言；反证：抑制静默 ⇒ FAIL | P0 |
| FR-SELF-097 | **护栏越限的如实降级**：若某控制因客观原因无法落地（例如实现层不可测），**必须**显式登记（台账 + 未闭合义务），**不得**静默放宽 / 删除（NG-SELF-020）；越限本身**不得**被当成 PASS | 三控制各自有「已落地 / 显式登记未落地」二态之一；无「护栏缺失但无登记」；反证：删掉护栏常量而无登记 ⇒ FAIL | P0 |

### 5.9 SUPERSEDE — X-SELF-1~7 显式取代（**判据等价重锚，不是放宽**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-100 | **X-SELF-1 `requestTurn` 恰 2 处**：**优先**「既有注册表内扩张」（AI / 系统经**既有** `op.turn` 槽驱动，`requestTurn(` 调用点**保持恰 2 处，diff = 0**）；**只有**在 ① 被证不可行时，才**显式放宽计数**（新增具名「主动回合」入口 + 等价重锚判据 + 台账留痕）；**默认取 ①** | 默认判定为 ① 时：`requestTurn(` 调用点**恰 2**（门禁原判据不改）；若走 ②：须有「① 不可行」的**实证** + 等价重锚判据（断言力不降）+ 台账条目；**无第三种静默态** | P0 |
| FR-SELF-101 | **X-SELF-2 `RecommendTrigger` 4 项**：时机词汇**扩张**（新增 ≥ `'answered'`）+ `ref-action` 的 `openAsks === 0` 抑制**显式裁决**（答完之后如何重新求值）；旧 4 项判据**逐条等价重锚**（计数只增） | 见 FR-SELF-030 / 031 / 032；旧 4 项各自判据不减；反证：任一旧项判据被删 / 被放宽 ⇒ FAIL | P0 |
| FR-SELF-102 | **X-SELF-3 `llm.unconfigured` 触发语义**：从「**被观测**」（op 失败后才写）→「**被识别**」（确定性主动判据）；**并存不取代**：既有 op 恢复链（`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` 按终态键控对象）**逐条保留** | 见 FR-SELF-040 / 041；`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` 元素集与键控形态逐条不变（v5-3 I-05 的「按终态键控」语义**不得退回位置数组**）；反证：删掉 op 恢复链 ⇒ FAIL | P0 |
| FR-SELF-103 | **X-SELF-4 死端判据 5 类 → 终态词汇扩张**：`BLOCKED_TERMINALS` **恰 5 项逐字不变**（阻塞面）；**新增**「已表达意图」终态词汇（已答 ask / 已交描述）与之**正交**并机核；死端守护门禁**扩**（终态词汇扩张）而**不削弱** 5 类阻塞判据 | `BLOCKED_TERMINALS` 5 项逐字命中；`no-dead-end` 计数 ≥39（增）；新终态词汇判据（FR-SELF-021）全绿；反证：删任一阻塞类判据 ⇒ FAIL | P0 |
| FR-SELF-104 | **X-SELF-5 `applyRefAction` 计数 → 驱动**：语义重定义（见 FR-SELF-025）；`commandSends` 消费面显式登记或退役（见 FR-SELF-026） | 见 FR-SELF-025 / 026；`test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` / `test/ui/page-input.mjs` 判据**等价重锚**（旧计数断言可保留为新语义的一部分，**计数不减**） | P0 |
| FR-SELF-105 | **X-SELF-6 `submitDescribe` 只 dispatch → 必有驱动**：补齐发送 / 驱动路径（见 FR-SELF-027）；空描述口径不变（卡内校验零副作用） | 见 FR-SELF-027；`test:ask-auth` 计数 ≥71（增）；反证：恢复「只 dispatch」⇒ FAIL | P0 |
| FR-SELF-106 | **X-SELF-7 `chatBusy` 丢弃 → 可判仲裁**：回合并发语义从「第二条被丢弃 + 回错误」改为**可判仲裁**（见 FR-SELF-061）；**用户输入永不静默丢失** | 见 FR-SELF-061；`test/ui/journey.mjs`（≥171）/ `test:ask-auth`（≥71）判据等价重锚且**增**；反证：用户输入静默丢失 ⇒ FAIL | P0 |
| FR-SELF-107 | **七项取代一律「等价重锚」**：不得以「放宽阈值 / 删除断言 / 静默改常量 / 静默替换冻结对象」落地；每项须：① 台账明文登记 ② 判据力不降（可逐条对账）③ 计数不减 ④ ≥1 条注入反证；**取代与实现同轮完成**（不得拆到「下一轮补」） | §12 映射表逐项有落点；七项各自有台账条目 + 判据对账；反证留证（注入 → FAIL → 还原 → PASS） | P0 |

### 5.10 GATE — 门禁等价重锚与台账

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-110 | **门禁等价重锚（清单，改写 ≠ 删除）**：至少覆盖 ① `test/op-wiring.test.ts`（`requestTurn` 恰 2 处 / 本地 op 槽 / 排队门禁）② `test/local-act-wiring.test.ts` ③ `test/authorize-chip-wiring.test.ts` ④ `test/recommendation-sources.test.ts`（源白名单 7 项 / 规则表 / 闭集）⑤ `test/ui/recommendation.mjs`（65）⑥ `test/ui/no-dead-end.mjs`（39）⑦ `test/s2-deadend-chain.test.ts`（6）⑧ `test/ui/stream.mjs`（73）⑨ `test/ui/ask-auth-inflow.mjs`（71）⑩ `test/ui/journey.mjs`（171）⑪ `test/ui/l0.mjs`（248）/ `test/ui/density.mjs`（242）⑫ `test/l1-ref-validity.test.ts` + `test/ui/l1.mjs` + `test/ui/page-input.mjs`（108）⑬ `test/ask-bridge.test.ts` ⑭ `test/blocked-terminals.test.ts`（9）⑮ `test/next-registry.test.ts`（16）/ `test/next-pipeline.test.ts`（20）/ `test/next-dispatch-diff0.test.ts`（14）/ `test/next-obligation-table.test.ts`（10）⑯ `test/sw-op-mirror.test.ts`（5）/ `test/op-protocol.test.ts`（6）⑰ `test/capability-wiring.test.ts` / `test/binding-wiring.test.ts` ⑱ `test/supersession-ledger.test.ts`（36）⑲ `test/size-*` + `test:size-ruling-vol3`（12）⑳ `test/ui/law8-plaintext.mjs`（25） | 上述门禁全部**改写而非删除**；每处新判据可 FAIL 反证 + 声明 `expectFailPattern`；对应门禁计数 ≥ §9.5 基线 | P0 |
| FR-SELF-111 | **反证不空转（两段证伪）**：每条被改动 / 新增判据必须 ① 注入违反面 → **实跑 FAIL** ② **逐字节还原**（sha256 前后相同）→ 实跑 PASS；**不得**「删属性充数 / 换口径充数 / 自我裁决自我验收」；注入点若被搬走必须**重写注入点** | 每条判据留有「注入 FAIL → 还原 PASS」两段证据（日志全量）；无「不再 FAIL 的判据」遗留；注入文件 sha256 前后逐字节相同 | P0 |
| FR-SELF-112 | **保护段处置**：journey `43054..58287` / sha `cc79f413…` / **240 行**（`supersessionChain` 3 链节）**优先保段**；若必须改（改回合启动 / 流结构会波及），须走**八步显式取代**（① 记录 old ② 逐段决策 ③ 同编号等价改写 ④ 登记 `modifiedRanges[]` ⑤ 写入新 pin ⑥ **计数守恒 ≥171** ⑦ `redlineRemap[]` 追加 ⑧ RP-V4-08 反证）；binding `107780..115930` / sha `be9ad0e9…`（`decision = keep`）**保段**；段外改写逐行登记 | 保护段 sha 不变（保段）或显式取代留痕（二选一，须显式声明）；段外改写逐行登记且计数不减；RP-V4-08 反证实跑（段内 1 byte 必红 / 段外不红 / 逐字节还原） | P0 |
| FR-SELF-113 | **`knownGap` 一致性机核**：新增取代条目必须让 `test/supersession-ledger.test.ts` 的 `status ↔ knownGap` 一致性检查保持绿（`status = complete-steps-1-8` ⇒ 该字段为空或仅声明闭环） | `test:supersession` ≥36 全绿；新增条目 `oldPin` / `newPin` / `supersededFrom` 链式可机核 | P0 |
| FR-SELF-114 | **门禁严格串行 + `KL-N-10` 纪律**：`test` / `test:ui` / `test:binding` **绝不并发**（一次一个 Chromium，`finally` 自清 profile）；首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | 全部门禁串行复跑日志（落盘全量）；`KL-N-10`（`test:binding` 首轮偶发红且失败项不同）按纪律处置 | P0 |
| FR-SELF-115 | **门禁受审集合更新**：新增门禁（驱动者四元组 / 驱动者终态词汇 / 时机源闭集 / op 三档清分 / 护栏三件套 / S0 全链）必须纳入 `test/gate-integrity` 受审集合；**`CHROMIUM_GATES === 9` 不动**（只追加先例） | `test:gate-integrity` ≥15 且新增门禁逐项在受审集合内；`CHROMIUM_GATES === 9` 逐字；反证：新门禁未纳入受审 ⇒ FAIL | P0 |
| FR-SELF-116 | **计数只增基线**：`npm test` ≥**1181**；各门禁计数 ≥ §9.5 逐项基线（`law8 ≥25` / `dead-end ≥39` / `auth-chip ≥37` / `l0 ≥248` / `density ≥242` / `journey ≥171` / `binding ≥192` / `stream ≥73` / `ask-auth ≥71` / `recommendation ≥65` / `page-input ≥108` / `zero-injection ≥28` / `supersession ≥36` / `gate-integrity ≥15` / `design-contract ≥19` / `size-ruling-vol3 ≥12` / `insight ≥118` / `hardening ≥24` / `l1 ≥116` / `l2 ≥74` / `l1-reverse ≥9` / `l2-reverse ≥10` / `ref-pick-wiring ≥11` / `e2e PASS`） | `npm test` 全量 + 各门禁计数逐项对账（**只增不减**） | P0 |

### 5.11 VOL — 体积与 V3-VOL-3 纪律

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-120 | **体积五要素重登记**：任何 byte 变化 ⇒ 强制重登记（前后值 / 日期 / 来源 / 理由 / 历史保留 + 构建命令 + 逐模块 metafile 归因，**Σ 逐模块 Δ + 未归因胶水 == 登记增量**） | `test/size-budget` / `test/size-growth-evidence` 全绿；metafile 归因 Σ 可复算；**禁止**在预算未评估前排「全量落地」 | P0 |
| FR-SELF-121 | **生效上限与 cap 纪律**：`sidepanel.js` ≤ 生效上限 = `min(619,520, floor(549,609 × 1.05))` = **577,089 B**（当前）；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`**（**不设自缚装置**） | `SIDEPANEL_CEILING == floor(baseline × 1.05)` 严格成立（无 cap）；`SIDEPANEL_CEILING_CAP === 'record-only'` | P0 |
| FR-SELF-122 | **V3-VOL-3 三值同源 + 占位口径**：档位 **563,200 B** = `ceilTo50KB(549,609)` 与绝对上限 **619,520 B**（= 档位 × 1.10）**不变**（不因基线微增而下移）；`newBaselineBytes` 随现行基线**同源前移**；`authorConfirmation.status` 保持 **`pending-author-line`**（**不得伪称已确认**）；越档位 ⇒ 走**显式升档**（非静默） | `docs/v4-supersession-ledger.json#v3Vol3Closeout` 三值一致 + `test:size-ruling-vol3 ≥12` 全绿；`authorConfirmation.status` 枚举值合法且未被静默改写；本规范 / 收口**不得**出现「档位已确认」类表述 | P0 |
| FR-SELF-123 | **红线冻结面逐字节复核**：`dist/content.js` **177,076 B** / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`；`dist/pick-layer.js` **34,358 B** / sha `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`；判定链（`policy.ts` / `auto-authorize.ts`）内容哈希；`docs/v3-supersession-ledger.json` **零 diff**；`KIND_SET` 40 项逐字 | 上述逐字节 / 逐哈希核验通过；`src/content/**` 零 diff；反证：任一命中失败 ⇒ FAIL | P0 |
| FR-SELF-124 | **体积预算前移评估**：余量仅 **27,480 B（+5.00%）**、距档位 **13,591 B**；本 Feature 新增面（驱动者层 + 时机源 + 引导流 + 主动编排 + 清分表 + 护栏 + 新门禁）**存在越限可能**（v5 教训：plan Σ 低估 **2.8×**）⇒ **必须先做净增上下界评估**，再决定是否拆叶控体积 / 是否预登记档位调整；越限路径须显式登记（`pending-author-line` 走占位规则，**不得伪称已确认**） | 评估产物存在（上下界 + 依据 + 逐模块归因方法）；越限路径登记口径明确；`PENDING_ABSOLUTE_CAP` 与 `authorConfirmation.status` 未被静默改写；**禁止**在预算未评估前排「全量落地」 | P0 |

### 5.12 S0 — 首验收场景机器化（**地位 = v5 之 S2**，真机 22:49 序列）

> **S0 = 本 Feature 的验收锚**（对应 discovery 要求的「S0 首验收场景，同 v5 之 S2 地位」）。**口径（如实）**：真机截图未入库；S0 的**可机核部分全部机核**，不可合成部分（真机观感）入人工面清单（`⏳ 未执行` / `PASS`，**不得冒充 PASS**）。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| FR-SELF-130 | **S0 全链机器化（真机 22:49 序列复刻）**：headless 下全链可判 —— ① 绑定 → ② 自动探测 → ③ 拾取引用（引用出生有效，`validCount ≥ 1`）→ ④ ask 卡登记（`openAsks` 含 `ref-round-<refId>`）→ ⑤ **用户作答「原地翻译为中文」且卡已结算** → ⑥ **答案产生驱动**（FR-SELF-022）→ ⑦ **分支**（见 FR-SELF-131）→ ⑧ 终局断言；fixture 形态沿用 v5 `s2-chain.mjs` 先例（**纯数据 + 注入式依赖**，便于逐环节注入与反证） | 全链机器化判据（node + Chromium 两面）全绿；逐环节可判（①~⑧ 每环节有独立断言）；**死端 = 0** 双向反证（注入缺环节 ⇒ FAIL；还原 ⇒ PASS） | P0 |
| FR-SELF-131 | **S0 双分支（主题① / 主题② 的分水岭）**：**分支 A（已配置 LLM）**：⑤ 之后 **AI / 系统自动成回合续流**（**无需用户再敲任何键**）——流内出现回合留痕（thinking / 卡 / 回执），且留痕含 FR-SELF-063 三要素；**分支 B（未配置 LLM）**：⑤ 之后 **系统流主动驱动去配置**——流内产出「配置 LLM」next（`op.llm-config`，`driverClass: 'deterministic'`）→ 掩码卡 → 用户完成配置 → **配置完成自动续接悬置任务**（把 ⑤ 的答案作为悬置任务接上）→ 流内出现续接后的回合留痕 | 两分支**各自**全链机器化判据全绿；**互斥完备**（配置判据 FR-SELF-052 单向分流）；分支 B 的「配置完成 ⇒ 自动续接」为**必判项**（反证：删掉自动续接 ⇒ FAIL）；分支判据**不得互相掩盖**（两侧独立计数） | P0 |
| FR-SELF-132 | **「答案不被丢弃」机器化口径（S0 的题眼）**：必须断言 ① ⑤ 的答案文本**作为回合输入或悬置任务输入可判命中** ② 断言「`commandSends`（或等价计数）递增**不足以**满足本判据」（即：**只计数 = 不通过**）③ 断言在 ⑤ 之后的窗口内**不存在**「无驱动者」的可判状态 | 三条逐一断言；反证：① 把答案路径恢复为 `applyRefAction` 只计数 ⇒ **必 FAIL**（复现会话 B）；② 删除驱动者 ⇒ 必 FAIL；还原 ⇒ PASS（两段证伪，FR-SELF-111） | P0 |
| FR-SELF-133 | **S0 的「静默 = 0」判据**：以「**驱动者归因可见**」替代「无静默」的模糊描述——断言 ⑤ 之后**任一**可判时刻都存在驱动者归因（driverId + timing + 依据），直到本场景收敛（回合结束 / 引导完成）；「静默」被定义为**可判**：「存在一个窗口内既无驱动者归因、又无终态事实、又无可达 next」（该状态在本场景中**必须为 0**） | 「静默窗口 = 0」机核（窗口定义单源）；反证：注入「答完后清空驱动者」⇒ FAIL（静默窗口 ≥1）；还原 ⇒ PASS | P0 |
| FR-SELF-134 | **S0 人工面登记（不冒充 PASS）**：真机观感（主动接手的**体感** / 是否感觉被突然打断 / 引导文案可读性 / 主动回合的等待感）逐项登记，状态 ∈ {`⏳ 未执行`, `PASS`}，**不得**为「未跑却写 PASS」；本 Feature 的 S0 人工面与 v5 的 S2 人工面**并列登记**（不覆盖 v5 既有清单） | 人工面清单条目存在且状态合法；无「未执行却标 PASS」；v5 人工面 9 项清单**零改写**（并列不覆盖） | P0 |

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| NFR-SELF-001 | 性能 | 驱动者求值（纯谓词）/ 时机源扩张 / 主题① 引导**不得**使首屏渲染 / 滚动跟随 / 视图往返变差；`#region-stream` 高度占比 **≥65.0%**（`STREAM_HEIGHT_RATIO_MIN = 0.65`，**只允许上调**）；**不作性能承诺**（如实登记体感于人工面） | `journey` 高度占比断言全绿；滚动跟随断言全绿；`STREAM_HEIGHT_RATIO_MIN` 未被下调；人工面登记体感（FR-SELF-134） |
| NFR-SELF-002 | 可用性 | 320px 窄栏零水平溢出；键盘 Tab 序与 `:focus-visible` 不退化；主动产生的 next 卡 / 引导步骤**键盘可达**；流仍 `role=log`；`data-narrow`（≤360）语义不变 | 320px 断言全绿；键盘断言全绿；`#stream` 仍 `role=log`；`data-narrow` 边界（360/361）不变 |
| NFR-SELF-003 | 安全 | ① **流内零明文四面**（payload / digest / 审计 / DOM value + 全属性）**不退化**；② 判定链 `zeroDiffFiles`（9 项）**零触碰**；③ **特权 op 恒手势**（`gesture` 档，AI 不可自动执行）；④ 净化面（URL query / secret 形状 / 命令参数体 / raw markup 抛错）语义不变 | `test/ui/law8-plaintext.mjs` ≥25 全绿；`zeroDiffFiles` 逐项命中；`test:zero-injection ≥28`；「特权 op 恒 gesture」机核（FR-SELF-081）；属性面注入 secret 反证必抛错 |
| NFR-SELF-004 | 可维护性 | **单源 + 机核**：驱动者四元组表 / 七类时刻枚举 / 时机源闭集 / `driverClass` / op 三档清分表 / 三护栏常量 / 驱动者终态词汇 —— 各自**恰一处**声明，且由门禁**从源文本抽取**机核（不得靠注释与人工对账） | 「声明恰一次」扫描逐项全绿；任一处出现第二声明确实红（反证） |
| NFR-SELF-005 | 体积 | `sidepanel.js` 在生效上限内；任何 byte 变化走五要素重登记 + 披露算术机核；**不设新 cap** | FR-SELF-120 / 121 全绿；`SIDEPANEL_CEILING_CAP === 'record-only'` |
| NFR-SELF-006 | 兼容性 | 既有 id / ARIA 读取契约不破：`#composer` / `#input` / `#send`（journey / binding / `requestTurn`）、`#settings-back` / `#open-settings` / `#authorize` / `#rebind`、`#risk-rail` / `#risk-chips` / `#region-statusbar` / `#statusbar-text`、`#auth-state`、`#l2-title` / `#l2-count`、`#view-host` / `#l2-back`、`ol#stream[role=log]` | 兼容读取面逐 id 断言存在且语义不变；**本 Feature 不新增必需 id**（若新增须为**净新增**且不改既有 id 语义） |
| NFR-SELF-007 | 可测试性 | 每条新 / 改判据都必须**可 FAIL**（可注入违反面）并声明 `expectFailPattern`；**不得**引入不可证伪的断言形态（禁恒真断言） | 每条新 / 改判据留有反证证据（FR-SELF-111 / 024） |
| NFR-SELF-008 | 无障碍 | 主动产出的 next chip 可键盘触发；引导步骤可读（读屏）；`aria-live` 语义不因主动性新增而丢失；`consent` 卡的键盘与读屏可达（**尤须**：AI 发起 `confirm` 档时，用户必须能清楚识别「这一步需要我点」） | chip 键盘可达断言；引导步骤 ARIA 断言；`confirm` 档来源可读断言；读屏走查列入人工面（FR-SELF-134） |
| NFR-SELF-009 | 确定性 | **主题①** 的驱动：同输入 ⇒ 同路径（可重复）；**零 LLM 调用**（零 token）；判据确定性可机核 | FR-SELF-047 全绿；「零 provider 调用」双向断言 |
| NFR-SELF-010 | 可逆性 / 一致性 | 配置改状态 op 有快照 / 回滚（不留半完成态，继承 v5 三表快照语义）；悬置任务在配置失败时**保留**（不丢）；AI 主动的否决 / 关断可逆（可恢复） | FR-SELF-050 全绿；回滚后状态逐字段不变断言；悬置任务保留断言；关断可逆断言 |
| NFR-SELF-011 | 可观测性 | 每次 AI / 系统主动发起都留痕「谁发起 / 何时 / 依据什么」，且**零明文**；驱动者归因可从流内读出（审计面复用既有） | FR-SELF-063 全绿；零明文同 NFR-SELF-003；驱动者归因可读断言 |
| NFR-SELF-012 | 可演进性 | 新增一种「用户已表达意图之后该做什么」的改动面 = **注册一个驱动者谓词 + 声明时机源 + 自带测试**（主流程 diff = 0）；并有判据防止「回归到散落调用点 / per-op 分支」 | FR-SELF-010 / 015 / 016 全绿；「新增驱动者演练」判据（注册一个样例驱动者，主流程文件哈希不变） |
| NFR-SELF-013 | 打扰可控 | 主动性**有界**：频次上限 / 同因不重复 / 静默期 / 冷却 / 链深度上限 / token 预算 —— 六项**全部**可判；且**用户可关断** | FR-SELF-090~094 全绿；六项常量单源 + 越限抑制断言 |
| NFR-SELF-014 | 成本可控 | AI 主动回合的 token 消耗**有预算上限**（单源常量），达界停发且**非死端**；**主题① 零 token**（确定性对照面） | FR-SELF-091 / 047 全绿；达界停发断言；「主题① 零 provider 调用」断言 |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| EC-SELF-001 | **重复 `driverId` 注册** | **拒绝注册并 loud 红显**，**绝不静默覆盖或静默默认**；现有条目不变（继承 v5 R5 ②） |
| EC-SELF-002 | **未知时机源**（驱动者声明了不在时机源闭集内的 timing） | 注册 / 契约校验失败 loud；该驱动者不进活跃集；错误串可读 |
| EC-SELF-003 | **驱动者归因缺失**（无法抽出四元组的任一元 / `when(ctx)` 读取了 `NEXT_SERVICES` 之外的字段） | 注册校验失败 loud；四元组机核同时捕获；**不得**以「注释说明」替代 |
| EC-SELF-004 | **`'answered'` 时机抖动 / 多次求值** | 受 FR-SELF-014（同因去重）+ FR-SELF-034（10 s 防抖）约束；重复求值**不产生**第二条相同推荐；不产生「答一次弹多次」 |
| EC-SELF-005 | **「已答」判定歧义（取消 / 超时 / superseded / aborted）** | 走 FR-SELF-023 四口径：取消**不记「已答」**；`ASK_CANCEL_REASONS` 4 项逐字不变；取消也是终态（必有可达 next），但「已答」判据**必不成立** |
| EC-SELF-006 | **引用在驱动前失效**（`ref.all-invalid`） | 走**既有阻塞终态**路径（法七既有判据）：固化 + 可达 next（重新拾取 / 改用描述）；**不得**因「用户已答」而跳过阻塞判据（两条路径**不互斥**） |
| EC-SELF-007 | **`op.describe` 空描述** | **卡内校验、零副作用**（不投递存储、不改状态、不产回执、**不驱动**）；不进入「已交描述」终态词汇 |
| EC-SELF-008 | **后台 ask 迟到作答（回合已结束）** | 走 FR-SELF-028：**不记「已答」**；流内固化「未接住」事实 + 可达 next（重发 / 重新提问 / 改用描述）；**不得**裸 `errorResponse` |
| EC-SELF-009 | **LLM 未配置 + 用户取消引导** | 走 FR-SELF-046：固化取消 + 可达 next；**不再**重复弹同因引导；后续再次「意图需要 LLM」时可**重新**引导（不是永久静默） |
| EC-SELF-010 | **引导中途用户从设置页手动配置完成**（外部完成） | 系统**必须**能识别「已配置」（FR-SELF-052 判据基于**事实**而非「配置动作」）⇒ 引导**自动收敛**（不重复引导）；悬置任务**仍须**续接（配置来源无关） |
| EC-SELF-011 | **悬置任务在配置完成前已失效**（引用失效 / 站点变更 / 会话切换） | 续接时**重新校验**悬置任务的有效性：失效 ⇒ **不续接**，改为固化「原任务已失效」+ 可达 next（重新拾取 / 改用描述）；**不得**续接一个已失效的任务（不得制造假成功） |
| EC-SELF-012 | **配置完成但悬置任务为空**（无接续对象） | **非死端**：产出可达 next（例如「看看这页能做什么」/「发一条消息开始」）；**不得**静默结束 |
| EC-SELF-013 | **AI 主动回合与用户手输并发** | 走 FR-SELF-061 可判仲裁：**用户输入永不静默丢失**；仲裁结果留痕可判；仲裁有界 |
| EC-SELF-014 | **AI 主动链触及深度上限（防环）** | 走 FR-SELF-064 / 092：达界**立即停**自动发起；转「需要你决定」的可达 next；达界**非死端**；**不得**绕过上限继续 |
| EC-SELF-015 | **AI 主动回合 token 预算耗尽** | 走 FR-SELF-091：达界停发 AI 主动；转确定性路径 / 等待用户手势；可达 next 仍存在（非死端） |
| EC-SELF-016 | **用户关断主动性（总开关）** | 走 FR-SELF-069 / 094：关断后 AI 主动**零发起**；**主题① 仍工作**（口径显式登记）；关断**可逆** |
| EC-SELF-017 | **特权 op 被 AI / 系统尝试自动发起** | **必须拦截**（`gesture` 档）：不执行；转为**用户手势可达**的 next（用户点了才走既有手势路径）；**不得**「先发起后补手势」 |
| EC-SELF-018 | **新 op 未归档档位 / 新特权未归 `gesture`** | 门禁 **FAIL**（即红）；清分表与注册表 opId 集**双向一致**机核捕获（FR-SELF-084） |
| EC-SELF-019 | **体积越限**（越生效上限 / 越档位） | 越限 ⇒ 走五要素重登记 + 档位**显式**升档义务（显式登记），**不得**静默放宽上限 / 也不得引入自缚 cap；`authorConfirmation` 保持占位口径（FR-SELF-121 / 122 / 124） |
| EC-SELF-020 | **保护段被波及（journey 第三次取代风险）** | 优先**保段**；若必须改 ⇒ 走八步显式取代（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒 ≥171 + RP-V4-08 反证）；**不得**静默改 pin |
| EC-SELF-021 | **`KL-N-10` 环境 flake（`test:binding` 首轮偶发红且失败项不同）** | 按纪律：**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿）；**不得**以「flake」为由删断言 |
| EC-SELF-022 | **配置面双套风险**（主题① 引导入口与设置页并存） | 执行体**唯一**（`op.llm-config`，FR-SELF-044）；设置页保留为**管理面但同调 op**（零双路径，继承 v5 SETTINGS 收编语义）；反证：出现第二条凭据写入路径 ⇒ FAIL |

---

## 8. 开放问题

> **口径**：discovery §7.4 的 **O-SELF-001~007 七条**在本阶段**全部裁决**（status 一律 `ruled`；按编排器 2026-09-22 批量裁定，**采纳 discovery 推荐项**）；落位见 §11。裁决依据 = 编排器代作者决策（D1 / D2）。

| # | 问题 | 状态 | 裁决（摘要） |
|---|------|:--:|------|
| 1 | **O-SELF-001** 命名与版本位的语义配对（`v55` = 维护语义 vs `v0.11.0` = 新主题语义） | **已裁决** | 读法①：**保持树名 `v55-self-driven` + 版本位 `v0.11.0`**，并在登记时**明示**「**v5.5 = v5 驱动者层的结构性收尾**，作为 v0.11.0 主题登记」（DC-SELF-001；落地 FR-SELF-001） |
| 2 | **O-SELF-002** 主题① 的触发时机与终点 | **已裁决** | ①：**`runChat` 前置配置判据**（意图需要 LLM 即主动识别）+ **配置完成自动续接悬置任务**（S2 范式复用）+ **既有 `op.llm-config` 为唯一配置执行体**（**不新造配置面**）（DC-SELF-002；落地 FR-SELF-040~052） |
| 3 | **O-SELF-003** 驱动者的统一形态（注册表 vs 散落调用点） | **已裁决** | ①：**注册表化** —— 驱动者 = 注册表里的 `when(ctx)` 纯谓词 + **新增时机源**；并要求「**新增驱动者主流程 diff = 0**」机核（DC-SELF-003；落地 FR-SELF-010~019） |
| 4 | **O-SELF-004** AI 可主动发起的 op 安全边界清单 | **已裁决** | ①：**三档清分** `auto`（AI 可自主）/ `confirm`（AI 可发起需用户点确认）/ `gesture`（必须用户手势 —— **特权 `op.authorize` / `op.perm.request` 恒在此档**）+ **机核清单**（any new op 必须归档）（DC-SELF-004；落地 FR-SELF-080~086 + §5.7 表） |
| 5 | **O-SELF-005** `requestTurn` 恰 2 处 / `RecommendTrigger` 4 项两门禁的取代方式 | **已裁决** | ①：**优先「注册表内等价扩张」**（AI 经 `op.turn` 槽 / 新增 trigger 值），**只在证不可行时才显式放宽计数**（X-登记 + 等价重锚）（DC-SELF-005；落地 FR-SELF-100 / 101 / 030~033） |
| 6 | **O-SELF-006** 主动性护栏三件套 + 可见载体 | **已裁决** | ①：**三控制全入 spec**（打扰控制：主动建议频次上限 + 同因不重复；token 成本：AI 主动回合预算；防环：连续自动链深度上限 + 冷却）+ **载体零新增 kind**（复用 12 kind；复用既有宿主面 ⇒ `REGISTERED_STRUCTURAL_HOSTS` 保持 `[]`）（DC-SELF-006；落地 FR-SELF-090~097） |
| 7 | **O-SELF-007** 是否需要外部竞品调研 | **已裁决** | ①：**不需要**（有 v5 同业 + 仓库内 S2 先例 + 作者母理念为最高价值源）；登记「**未执行，不阻塞**」，**不编造结论**（DC-SELF-007；落地 NG-SELF-011） |

> **裁决记录**：DC-SELF-001~007 的逐条理由见 §11.1。**无遗留未决需求** —— 所有开放点已裁决并落位到具体 FR / AC / EC / NG。
>
> **遗留开放点（如实登记，不阻塞 spec）**：本阶段**无**新开开放点；但以下 **3 项**为**留给 plan 的具体策略选择**（已由本规范**限定边界**，不构成未决需求）：① 并发仲裁的**具体策略**（排队 / 合并 / 明确拒绝三者之一，FR-SELF-061 已限定"用户输入永不静默丢失 + 留痕 + 有界"）② 配置判据的**具体字段组合**（FR-SELF-052 已限定"确定性 + 可机核 + 零 LLM 调用"）③ 「同类不再主动」的**持久范围**（会话内 / 持久，FR-SELF-068 已限定"可判"）。**三项均不影响本规范的可验收性**，plan 可直接选定并在 ADR 留痕。

---

## 9. 验收标准（总体验收清单，含门禁映射）

> **口径**：每条 AC 必须**可验收**（可机核或可实跑），并标注承载门禁。**核心验收 = AC-SELF-001 / 002 / 003 / 004 / 005 / 006**（前六条对应 §3.1 的 G-SELF-001~006）。**AC 一律「可机器验证优先」**（每条给出机核形态；不可机核者显式入人工面）。

### 9.1 核心验收（S0 / 驱动者层 / 法七扩展 / 取代 / 安全 / 护栏）

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| **AC-SELF-001** | **S0 首验收机器化（本 Feature 的验收锚，地位 = v5 之 S2）**：真机 22:49 序列 headless 全链复刻 —— ① 绑定 → ② 探测 → ③ 拾取引用（出生有效）→ ④ ask 登记 → ⑤ 作答「原地翻译为中文」已结算 → ⑥ **答案产生驱动** → ⑦ **双分支**（A 已配置 ⇒ AI 自动成回合续流 / B 未配置 ⇒ 系统流驱动配置 + **配置完成自动续接**）→ ⑧ 终局；断言「**答案不被丢弃** ∧ **静默窗口 = 0** ∧ **死端 = 0**」；**真机观感入人工面**（`⏳` / `PASS`，不得冒充 PASS） | 新 **S0 全链门禁**（node + Chromium 两面）+ `test/ui/no-dead-end.mjs`（等价重锚 + 增）+ 人工面清单（AC-SELF-025） |
| **AC-SELF-002** | **驱动者层注册表化**：驱动者集合 ≡ 注册表 provider 集合（双向包含）；每驱动者四元组（driverId / timing / evidence / ops）可机核；**新增驱动者主流程 diff = 0**（`requestTurn` 仍恰 2 处 / `maybeRecommend` 定义恰 1 处且调用点不增 / 分发器不变）；**无第 8 个散落调用点** | 新 **驱动者四元组门禁** + `test/op-wiring.test.ts`（原判据不改）+ `test/next-dispatch-diff0.test.ts`（不变）+ 反证 |
| **AC-SELF-003** | **法七扩展**：已答 ask（三型）/ 已交描述入**驱动者终态词汇**（新单源，与 `STREAM_TERMINALS` 正交）；每终态**必有可达 next**（7 类时刻逐类断言）；`applyRefAction` 有效 ⇒ 驱动、无效 ⇒ 既有阻塞终态；`submitDescribe` 补齐驱动；后台 ask 迟到作答非死端；**双向反证 + 禁恒真断言** | 新 **驱动者终态词汇门禁** + `test/ui/no-dead-end.mjs`（≥39，等价重锚 + 增）+ `test/ui/ask-auth-inflow.mjs`（≥71）+ `test/l1-ref-validity.test.ts` + 反证 |
| **AC-SELF-004** | **X-SELF-1~7 七项显式取代全部等价重锚**：每项有台账条目 + 判据对账（力不降）+ 计数不减 + ≥1 注入反证；**无「放宽 / 删除 / 静默改常量 / 静默替换冻结对象」**；`requestTurn` 默认保持恰 2 处（读法①） | §12 映射表逐项落点 + 台账（`modifiedRanges[]` / `redlineRemap[]`）+ 各门禁计数对账（§9.5） |
| **AC-SELF-005** | **op 三档清分机核**：清分表 = `{auto: 5, confirm: 2, gesture: 2}` 且成员集逐字；**特权 op 恰 2 恒 `gesture`**；「SW 永不 `.request(`」语义等价保留；`confirm` 档 consent **不得**被 AI 代答；`auto` 档**零三表写入**；**新 op 未归档 ⇒ FAIL** | 新 **op 三档清分门禁** + `test/capability-wiring.test.ts:51-58`（等价重写，计数不减）+ `test/sw-op-mirror.test.ts`（≥5）+ 逐档注入反证 |
| **AC-SELF-006** | **护栏三件套机核**：打扰（频次上限 / 同因不重复 / 静默期）/ token 预算 / 防环（链深度上限 + 冷却）三组常量各单源 + 越限被抑制；**用户可关断**（关断后零 AI 主动，主题① 例外口径登记）；**载体零新增**（12 kind / 零宿主 / `KIND_SET` 40 逐字） | 新 **护栏门禁** + `test/host-registry.test.ts`（不变）+ `test/op-protocol.test.ts`（≥6，`KIND_SET` 逐字）+ 反证 |

### 9.2 功能验收（主题① / 主题② / 时机源 / 答案路径 / 场景覆盖）

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| AC-SELF-007 | **主题① 确定性系统流**：`runChat` 前置配置判据**先于** provider 调用；未配置 ⇒ 产出引导（**非** LLM 错误事件）；多步引导流步骤集合单源且逐步可判；**零 LLM 调用**（零 token）+ 同输入同路径；**不跳走**（零视图切换）；掩码卡 + 法八四面零明文不退化 | 新 **主题① 门禁** + `test/ui/law8-plaintext.mjs`（≥25）+ `test/ui/stream.mjs`（≥73）+ 反证 |
| AC-SELF-008 | **主题② AI 驱动编排**：AI / 系统经**既有** `op.turn` 槽启动回合；主动留痕三要素（driverId / ts / 依据）可读且零明文；候选**恒**由注册表产出（AI 不自造）；失败非死端；**AI 主动不得触碰判定链 / 不得降档** | 新 **AI 主动门禁** + `test/op-wiring.test.ts`（`requestTurn` 恰 2）+ `zeroDiffFiles` 逐项 + 反证 |
| AC-SELF-009 | **时机源扩张**：时机源闭集含 `'answered'` 且旧 4 项逐字仍在（计数 ≥5）；求值入口**恰一处定义**；10 s 防抖 / 单卡 ≤3 / 每回合 ≤1 **逐字不动**；**答完之后恰 ≥1 个驱动者**（映射表机核）；与 `firstRun`「至多一次」语义不混淆 | `test/recommendation-sources.test.ts`（等价重锚 + 增）+ `test/ui/recommendation.mjs`（≥65）+ 新时机源门禁 + 反证 |
| AC-SELF-010 | **答案路径驱动化**：`applyRefAction` 从「裁决 + 计数」变为「裁决 + 驱动」（调用点恰一处）；`commandSends` 消费面**显式登记**（COR-1 口径）或退役（显式取代） | `test/l1-ref-validity.test.ts`（≥3 关键断言不减）+ `test/ui/l1.mjs` + `test/ui/page-input.mjs`（≥108）+ 反证 |
| AC-SELF-011 | **旁路死端消除**：`submitDescribe` 已交描述 ⇒ 驱动（空描述零副作用，**不入终态**）；后台 ask 迟到作答 ⇒ 固化 + 可达 next（**不记「已答」**） | `test/ui/ask-auth-inflow.mjs`（≥71）+ `test/ask-bridge.test.ts` + 新终态词汇门禁 + 反证 |
| AC-SELF-012 | **配置执行体唯一 + 法八不退化**：凭据写入 sink **恰一处**（`keyStore.save(` = 1，继承 v5 法八机核）；配置采集恒经 `op.llm-config`；**无第二写入路径**（EC-SELF-022） | `test/ui/law8-plaintext.mjs`（≥25，「sink 恰 1 处」）+ `test:ask-auth` + 反证 |
| AC-SELF-013 | **首装 / 已装未配两场景**：两场景**各自**产出配置引导 next；`firstRun = false`（已装未配）注入仍须产出（**不得**依赖 firstRun）；既有 `R-ONBOARDING` 判据不减 | 新 **主题① 场景门禁** + `test/next-registry.test.ts`（≥16，`onboarding` provider 语义不变）+ 反证 |
| AC-SELF-014 | **并发仲裁可判**：AI 主动 + 用户提交同时发生 ⇒ **用户输入不丢**（进入队列 / 被明确告知）；仲裁结果留痕可判；仲裁有界 | `test/ui/journey.mjs`（≥171，等价重锚 + 增）+ `test:ask-auth`（≥71）+ 新仲裁门禁 + 反证 |
| AC-SELF-015 | **驱动者清单 / 时机映射表机核**：四元组表 / 七类时刻枚举（恰 7）/ 时机源闭集 / `driverClass` / 映射表 —— 各单源 + 从源文本抽取机核；注入「多一行 / 少一行 / 悬空」三类反证各 FAIL | 新 **驱动者声明单源门禁** + `test:gate-integrity`（受审集合纳入）+ 反证 |

### 9.3 取代台账与门禁治理

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| AC-SELF-016 | **门禁等价重锚清单逐项**（§5.10 FR-SELF-110 的 20 项）：全部**改写而非删除**；每处可 FAIL 反证 + `expectFailPattern`；注入点被搬走必须重写注入点 | 各门禁 + 反证留证 |
| AC-SELF-017 | **反证不空转**：每条改动 / 新增判据有「注入 FAIL → 逐字节还原 PASS」两段证据（日志全量）；无「不再 FAIL 的判据」遗留 | 反证留证（FR-SELF-111 / 024） |
| AC-SELF-018 | **保护段处置留痕**：journey `43054..58287` / `cc79f413…` / 240 行**保段或八步显式取代**（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒 ≥171 + RP-V4-08 反证）；binding `107780..115930` / `be9ad0e9…` **保段**；段外改写逐行登记 | `test:supersession`（≥36）+ `test:journey`（≥171）+ RP-V4-08 实跑 |
| AC-SELF-019 | **`knownGap` 一致性 + 取代同轮完成**：新增条目 `status ↔ knownGap` 一致；X-SELF-1~7 的台账登记与判据重锚**不得**拆到「下一轮补」 | `test:supersession`（≥36）+ 台账逐条 |
| AC-SELF-020 | **计数只增基线**：`npm test ≥1181` 且 §9.5 逐项 ≥ 基线（**只增不减**）；无断言删除 / 降级（保护段显式取代除外） | `npm test` 全量 + 各门禁计数对账（§9.5） |
| AC-SELF-021 | **门禁受审集合 + 串行纪律**：新增门禁逐项在 `test/gate-integrity` 受审集合内；**`CHROMIUM_GATES === 9` 不动**；`test` / `test:ui` / `test:binding` 串行（绝不并发）；`KL-N-10` 按纪律处置 | `test:gate-integrity`（≥15）+ 串行日志 + `test/gate-integrity.test.ts:225-242` |

### 9.4 红线、体积与人工面

| ID | 验收标准 | 承载门禁 |
|----|---------|---------|
| AC-SELF-022 | **红线逐字节**：`content.js` **177,076 B** / `52a82620…`；`pick-layer.js` **34,358 B** / `77796bab…`；判定链内容哈希；`docs/v3-supersession-ledger.json` **零 diff**；`src/content/**` 零 diff；`KIND_SET` **40 项逐字**；12 kind 逐字；`REGISTERED_STRUCTURAL_HOSTS = []` | `test/content.test.ts` + `pick-layer-budget.test.ts` + `test:zero-injection`（≥28）+ `test/op-protocol.test.ts`（≥6）+ `test/host-registry.test.ts` + 逐字节核验 |
| AC-SELF-023 | **体积与 V3-VOL-3**：`sidepanel.js ≤ 577,089 B`（生效上限）或走五要素重登记 + 档位**显式**升档义务登记；`SIDEPANEL_CEILING_CAP === 'record-only'`；档位 563,200 / 绝对上限 619,520 不变；`authorConfirmation.status` **未被伪称已确认** | `test:size-budget` + `size-growth-evidence` + `test:size-ruling-vol3`（≥12）+ `test/ui/density.mjs`（≥242） |
| AC-SELF-024 | **体积预算前移评估**：净增上下界 + 依据 + 逐模块归因方法**先于落地**存在；越限路径登记口径明确；`PENDING_ABSOLUTE_CAP` / `authorConfirmation` 未被静默改写；**禁止**预算未评估前排「全量落地」 | 评估产物（plan / ADR）+ 体积门禁 + 台账 |
| AC-SELF-025 | **人工面清单逐项标注**（`⏳ 未执行` 或 `PASS`，**不得冒充 PASS**）：主动接手体感 / 是否感觉被打断 / 引导文案可读性 / 主动回合等待感 / 读屏（主动 next + consent 来源）/ 双主题 / 320px / 键盘 / 真机 S0 走查；**v5 人工面 9 项清单零改写（并列不覆盖）** | 收口文档的人工面清单（逐项状态）+ v5 closeout §9 清单对照 |
| **AC-SELF-026** | **每叶收尾全门禁绿 + 计数只增基线**：3 个叶**各自**在收尾时（a）全门禁串行复跑全绿（b）各门禁计数 ≥ 基线（§9.5）（c）无断言删除 / 降级（保护段显式取代除外）（d）反证留证齐备。父 Feature 的最终验收 = **3 叶全绿** + 共享面（体积 / journey+binding 保护段 / 取代台账 / `knownGap`）**恰一次**登记 | 3 叶各自的收尾门禁日志 + 计数对账 + 父级共享面登记对账 |

### 9.5 门禁基线清单（**计数只增，逐项对账**）

| 门禁 | 基线（v5 收口） | 本 Feature 预期 | 门禁 | 基线 | 本 Feature 预期 |
|---|---:|---:|---|---:|---:|
| `npm test`（node 全量） | 1181 | ≥1181（增） | `test:l0` | 248 | ≥248（等价重锚 + 增） |
| `test:law8` | 25 | ≥25（增：主题① 面） | `test:dead-end` | 39 | ≥39（**终态词汇扩张 + 增**） |
| `test:auth-chip` | 37 | ≥37 | `test:insight` | 118 | ≥118 |
| `test:density` | 242 | ≥242（阈值逐字不动） | `test:ui`（journey） | 171 | ≥171（保护段**保段**优先） |
| `test:binding` | 192 | ≥192（保护段 **keep**） | `test:stream` | 73 | ≥73（增：终态词汇） |
| `test:ask-auth` | 71 | ≥71（增：describe / 迟到作答） | `op-wiring`（node） | 7 | ≥7（`requestTurn` **仍恰 2**） |
| `sw-op-mirror`（node） | 5 | ≥5（增：三档清分） | `op-protocol`（node） | 6 | ≥6（`KIND_SET` 逐字） |
| `next-registry`（node） | 16 | ≥16（增：驱动者四元组） | `next-pipeline`（node） | 20 | ≥20 |
| `next-dispatch-diff0` | 14 | ≥14（**diff = 0 不变**） | `next-obligation-table` | 10 | ≥10（增：驱动者契约行） |
| `blocked-terminals`（node） | 9 | ≥9（5 类逐字不变） | `s2-deadend-chain`（node） | 6 | ≥6（S0 并列） |
| `test:recommendation` | 65 | ≥65（等价重锚 + 增） | `test:page-input` | 108 | ≥108 |
| `test:zero-injection` | 28 | ≥28 | `test:supersession` | 36 | ≥36（新条目） |
| `test:gate-integrity` | 15 | ≥15（新门禁受审） | `test:design-contract` | 19 | ≥19（**双稿双 shim 不动**） |
| `test:size-ruling-vol3` | 12 | ≥12 | `test:hardening` | 24 | ≥24 |
| `test:l1` | 116 | ≥116 | `test:l2` | 74 | ≥74 |
| `test:l1-reverse` | 9 | ≥9 | `test:l2-reverse` | 10 | ≥10 |
| `test:ref-pick-wiring` | 11 | ≥11 | `CHROMIUM_GATES` | 9 | **=== 9（不动）** |
| `e2e` | PASS | PASS | 新门禁（本 Feature） | — | **≥6**（驱动者四元组 / 终态词汇 / 时机源 / 三档清分 / 护栏 / S0；逐项入受审集合） |

---

## 10. 覆盖矩阵

### 10.0 缺口全景（**GAP-SELF-01~09**，本规范派生的规范化解构）

> **口径**：discovery §0.4「已有什么 vs 缺什么」给出 **A1~A7 七条资产行**（每行末列为「缺什么」）+ §1.3 给出 **核心 1~4 + 附带 1~2 六条范围行** + §0.3 给出 **R1~R6 六条根因**。三套枚举**互有交叠但不重合**。为使「一条不漏」可机核，本规范把它们**归一**为 **9 条缺口**（`GAP-SELF-01~09`）——**每条缺口 ↔ discovery 原始行的溯源列在表内**，且**任一原始行至少映射到一条缺口**（无孤儿）。**不改变 discovery 原文**。

| 缺口 | 缺口描述 | 溯源（discovery 原始行） | 承载 FR | 承载 AC |
|:--:|---|---|---|---|
| **GAP-SELF-01** | **驱动者缺位（母缺口）**：「用户已表达意图」之后**没有下一个驱动者**；驱动权 100% 在用户侧 | §0.4 A2·A3·A7 的三条「缺什么」+ §1.3 核心 1 + Q-SELF-001 + Q-SELF-007 | FR-SELF-010~019 / 013 / 069 | AC-SELF-002 / 015 |
| **GAP-SELF-02** | **引用回合 ask 的答案被丢弃**（计数即终）：`applyRefAction` 只 `sends += 1` | §0.3 R1·R2 + §0.4 A4③ + §1.3 核心 4（部分）+ Q-SELF-002 | FR-SELF-022 / 025 / 026 | AC-SELF-003 / 010 |
| **GAP-SELF-03** | **后台 ask 回合结束后无驱动者**（`settle` 返回 `false` ⇒ 裸 `errorResponse`） | §0.4 A3 / A4② + Q-SELF-009 | FR-SELF-028 / 023 | AC-SELF-003 / 011 |
| **GAP-SELF-04** | **「改用描述」只 dispatch 从不 send（旁路死端）** | §0.3 R6 + §1.3 附带 2 + Q-SELF-006 | FR-SELF-027 | AC-SELF-011 |
| **GAP-SELF-05** | **已答 ask / 已交描述不入终态词汇（法七真空，无回归闸门）** | §0.4 A7 + §1.3 核心 4 + Q-SELF-005 | FR-SELF-020~024 | AC-SELF-003 |
| **GAP-SELF-06** | **推荐器求值时机闭集无 `'answered'`**：答完之后**永不重跑**；`ref-action` 被 `openAsks === 0` 硬抑制 | §0.3 R4（时机侧）+ §1.3 附带 1 + Q-SELF-001（时机面） | FR-SELF-030~036 / 031 | AC-SELF-009 |
| **GAP-SELF-07** | **主题① 无载体**：`runChat` 无配置门禁；`llm.unconfigured` 只见「被观测」；首装引导单行 / 单时机 / 单场景 | §0.3 R5 + §0.4 A1·A5 + §1.3 核心 2 + Q-SELF-003 + Q-SELF-008 + Q-SELF-007（站点授权主动推进面） | FR-SELF-040~052 | AC-SELF-007 / 013 |
| **GAP-SELF-08** | **主题② 无载体**：回合入口恒为用户手势（`requestTurn` 恰 2 处）；AI 驱动权止于回合内 | §0.3 R3 + §0.4 A6 + §1.3 核心 3 + Q-SELF-004 | FR-SELF-060~070 | AC-SELF-008 / 014 |
| **GAP-SELF-09** | **主动性护栏 / 安全边界 / 半驱动者堆积零判据**：无 op 清分清单；打扰 / token / 防环零判据；驱动者形态若散落将造第二份半驱动者 | §0.4（盘点结论「驱动者唯一 / 时机单一」的反面）+ §1.3 核心 3（安全边界面）+ Q-SELF-010 · 011 · 012 · 013 + R-SELF-001 / 003 / 004 | FR-SELF-080~086 / 090~097 / 064 / 061 | AC-SELF-005 / 006 / 014 |

**覆盖结论**：**9/9 缺口各有 ≥2 条 FR + ≥1 条 AC 承载**；discovery 的 **A1~A7（7 行）+ 核心 1~4（4 行）+ 附带 1~2（2 行）** 共 **13 个原始行**全部映射到 ≥1 条缺口（**无孤儿**）；另 **Q-SELF-014 / 015** 属**约束向问题（非缺口）**，由 §11 表格另一端承接（见下表末）。

### 10.1 问题覆盖矩阵（Q-SELF-001~015 → FR/AC 逐条可追溯）

| 问题（discovery） | 级别 | 承载 FR | 承载 AC | 缺口 | 说明 |
|---|:--:|---|---|:--:|---|
| **Q-SELF-001** 驱动者缺位（母问题） | 核心 | FR-SELF-010~019 / 013 / 069 | AC-SELF-002 / 015 | GAP-01 | 注册表化 + 四元组机核 + 七类时刻 + 必有驱动者 |
| **Q-SELF-002** 引用回合 ask 答案被丢弃 | 核心 | FR-SELF-022 / 025 / 026 | AC-SELF-003 / 010 | GAP-02 | `applyRefAction` 语义重定义 + `commandSends` 登记 |
| **Q-SELF-003** 主题① 无载体（`runChat` 无门禁） | 核心 | FR-SELF-040 / 041 / 052 | AC-SELF-007 | GAP-07 | 前置判据 + 触发语义升级 + 分流判据 |
| **Q-SELF-004** 主题② 无载体（AI 不能启动回合） | 核心 | FR-SELF-060~070 | AC-SELF-008 / 014 | GAP-08 | `op.turn` 槽 + 并发仲裁 + 留痕 + 边界 |
| **Q-SELF-005** 「已答 ask」非终态，法七不覆盖 | 核心 | FR-SELF-020~024 | AC-SELF-003 | GAP-05 | 终态词汇单源 + 必有 next + 禁恒真断言 |
| **Q-SELF-006** 「改用描述」只 dispatch 从不 send | 核心 | FR-SELF-027 | AC-SELF-011 | GAP-04 | 补齐驱动 + 空描述零副作用 |
| **Q-SELF-007** 绑定 / 拾取 / 探测稳态后无主动驱动 | 次要 | FR-SELF-012（时刻 ③④⑤⑥）/ 013 / 017 | AC-SELF-002 / 007 | GAP-01 / 07 | 七类时刻覆盖 + 授权回执入词汇 |
| **Q-SELF-008** 首装引导单行 / 单时机 / 单场景 | 次要 | FR-SELF-042 / 043 / 051 | AC-SELF-013 | GAP-07 | 多步 wizard + 两场景 + 扩张不取代 |
| **Q-SELF-009** 后台 ask 回合结束后无驱动者 | 次要 | FR-SELF-028 / 023 | AC-SELF-003 / 011 | GAP-03 | 固化 + 可达 next + 不记「已答」 |
| **Q-SELF-010** AI 主动发起 op 的安全边界未定义 | 次要 | FR-SELF-080~086 | AC-SELF-005 | GAP-09 | 三档清分 + 特权恒 gesture + 新 op 归档 |
| **Q-SELF-011** 半驱动者堆积风险 | 潜在 | FR-SELF-010 / 015 / 016 / 019 | AC-SELF-002 / 015 | GAP-09 | 注册表化 + 调用点不增 + 四元组机核 |
| **Q-SELF-012** AI 主动与用户手输并发语义未定 | 潜在 | FR-SELF-061 / 096 | AC-SELF-014 | GAP-08 / 09 | 可判仲裁 + 用户输入零丢失 |
| **Q-SELF-013** 打扰 / token / 防环无判据 | 潜在 | FR-SELF-090~097 / 064 | AC-SELF-006 | GAP-09 | 三控制全入 spec + 单源机核 + 可关断 |
| **Q-SELF-014** 冻结面与体积余量（**约束向**） | 潜在 | FR-SELF-120~124 | AC-SELF-022 / 023 / 024 | —（约束） | 五要素 + 生效上限 + 预算前移 |
| **Q-SELF-015** `op.turn` 槽双刃 / 门禁取代（**约束向**） | 潜在 | FR-SELF-100 / 101 / 015 / 060 | AC-SELF-004 | —（约束） | 默认注册表内扩张（读法①） |

**覆盖结论**：**15/15 问题各有 ≥1 条 FR + ≥1 条 AC 承载**；无「有问题无需求」与「有需求无来源」的双向缺口。

### 10.2 根因覆盖（R1~R6）

| 根因 | 承载 FR | 承载 AC |
|---|---|---|
| **R1** 引用回合答案被丢弃 | FR-SELF-022 / 025 | AC-SELF-003 / 010 |
| **R2** `applyRefAction` 只计数 | FR-SELF-025 / 026 | AC-SELF-010 |
| **R3** 唯一回合启动者 `requestTurn` | FR-SELF-060 / 100 | AC-SELF-002 / 004 |
| **R4** `ref-action` 硬抑制 + 无 `'answered'` | FR-SELF-030 / 031 / 101 | AC-SELF-009 |
| **R5** `runChat` 无配置门禁 | FR-SELF-040 / 041 / 102 | AC-SELF-007 |
| **R6** `submitDescribe` 只 dispatch | FR-SELF-027 / 105 | AC-SELF-011 |

---

## 11. 开放点裁决落位表（O-SELF-001~007 → 条文）

> **口径**：discovery §7.4 的七条开放点在本阶段**全部裁决**（采纳 discovery 附带的推荐项，按编排器 2026-09-22 批量裁定）；status 一律 `ruled`；每条给出「裁决 / 落位条文 / 落位结构依据」。

| 开放点 | 裁决（DC-SELF-00x） | 落位 FR / AC / EC / NG | 落位结构（原文依据） |
|---|---|---|---|
| **O-SELF-001** 命名与版本位 | **保持树名 `v55-self-driven` + 版本位 `v0.11.0`** 并列登记；明示「v5.5 = v5 驱动者层的**结构性收尾**，作为 v0.11.0 主题登记」 | FR-SELF-001；§1 元数据；§16 纪律 | 编排器 D3/D5 给定；`v0.9.0`（三主题并列）与 `v0.10.0`（F-32 + 既有段并列）**先例可循**；discovery §6.2 的语义错位辨析登记为**已解释**（不阻塞） |
| **O-SELF-002** 主题① 触发时机与终点 | **`runChat` 前置配置判据**（意图需要 LLM 即主动识别）+ **配置完成自动续接悬置任务**（S2 范式复用）+ **既有 `op.llm-config` 为唯一配置执行体**（不新造配置面） | FR-SELF-040~052；AC-SELF-007 / 012 / 013；EC-SELF-009~012 / 022；NG-SELF-016 | §0.4 A1（被动式 → 主动式）+ A3（S2 自动续流先例）+ A5（`maybeRecommendFirstRunEntry` 三纪律）；§7.1 B4（`OPS_RECOVERY_ROWS` 为现成终点） |
| **O-SELF-003** 驱动者统一形态 | **注册表化**：驱动者 = 注册表 `when(ctx)` 纯谓词 + **新增时机源**；要求「**新增驱动者主流程 diff = 0**」机核 | FR-SELF-010~019；AC-SELF-002 / 015；EC-SELF-001~003；NG-SELF-018 | §0.4 A2（契约 v2 注册表为现成扩张面）+ A7（`handleCardAction` per-op diff = 0 先例）；§0.4 盘点结论「驱动者唯一 / 时机单一」 |
| **O-SELF-004** AI 可主动发起的 op 清单 | **三档清分** `auto`（5：`op.pick`/`op.describe`/`op.help`/`op.rebind`/`op.turn`）/ `confirm`（2：`op.llm-config`/`op.revoke`）/ `gesture`（2：`op.authorize`/`op.perm.request`，**恒在此档**）+ **新 op 必须归档的机核清单** | FR-SELF-080~086；AC-SELF-005；EC-SELF-017 / 018；NG-SELF-017 | §7.1 C1（特权 op 恰 2，`layer:'sw'`）+ C2（「SW 永不 `.request(`」）+ C3（9 op 清单）；§5.7 表 |
| **O-SELF-005** 两门禁取代方式 | **优先注册表内等价扩张**（AI 经 `op.turn` 槽；时机词汇新增 `'answered'`）；**只在证不可行时才显式放宽计数**（X-登记 + 等价重锚） | FR-SELF-100 / 101 / 030~033 / 015 / 060；AC-SELF-004 / 009 | §7.2 X-SELF-1 读法①（`op.turn` 槽已在）与 X-SELF-2（时机词汇扩张）；§7.1 C4（契约 v2 为现成扩张面） |
| **O-SELF-006** 护栏三件套 + 载体 | **三控制全入 spec**（频次上限 + 同因不重复 / token 预算 / 链深度上限 + 冷却）+ **载体零新增 kind**（复用 12 kind；复用既有宿主面保持 `[]`） | FR-SELF-090~097 / 064 / 061；AC-SELF-006 / 014；EC-SELF-014 / 015 / 016；NG-SELF-020 / 021 | §7.2 X-SELF-7（`chatBusy` 丢弃语义）+ §7.1 C5（单飞）；§7.1 D1（12 kind）/ D3（零宿主）/ D7（防抖三常量）；§0.4 A7（法七机器化形态可复用） |
| **O-SELF-007** 外部竞品调研 | **不需要**（v5 同业 + 仓库内 S2 先例 + 作者母理念为最高价值源）；登记「未执行，不阻塞」，**不编造结论** | NG-SELF-011；§16 纪律第 10 条 | §4.1（discovery 如实登记未执行）+ §4.2（仓库内可比参照 6 条） |

### 11.1 裁决记录（DC-SELF-001~007 理由一句话）

| # | 裁决 | 落地条文 | 理由（一句话） |
|---|---|---|---|
| **DC-SELF-001** | 树名 `v55` + 版本位 `v0.11.0`，明示「v5 驱动者层的结构性收尾」 | FR-SELF-001 | 保持编排器给定命名（读法①）可让 v3-ui / v4-chat / v45 / v5 的目录系列**连续可读**；同时用一句**显式语义**消除「命名维护语义 vs 版本位新主题语义」的错位（收口登记时一致） |
| **DC-SELF-002** | 主题① = `runChat` 前置判据 + 配置完成自动续接 + 既有 `op.llm-config` 唯一执行体 | FR-SELF-040~052 | 作者主题①逐字要求「由**系统代码流程**驱动用户去配置」——「意图需要 LLM 的时刻」是**唯一必然撞墙**的时刻（`runChat`），故判据落此处；配置面**已被 v5 造好**（掩码卡 + 值直达 sink），新造面会违反「不新增真值源 / 零双写」；「配置完成 → 续接悬置任务」复用 S2 自动续流范式，把「用户配 LLM 的目的」接住 |
| **DC-SELF-003** | 驱动者 = 注册表条目 + 新增时机源 + diff = 0 机核 | FR-SELF-010~019 | 现状已有 7 个 `maybeRecommend` 调用点；若以「再加一处」落地，立刻形成**第二份半驱动者**（Q-SELF-011 / R-SELF-003）——求值顺序 / 防环 / 去重无主。注册表化让驱动者**可注册、可去重、可机核**，且与 v5 契约 v2 的既有 Seam 三件套同构 |
| **DC-SELF-004** | 三档清分（5 / 2 / 2）+ 新 op 必须归档机核 | FR-SELF-080~086 | 「AI 主动」若**无清单**，会直接撞「特权 op 恰 2 必须用户手势」这一不可让渡红线（R-SELF-001）；三档的定义锚点 = **是否写安全面状态 / 是否特权限**（可静态判定、可机核），比黑名单更强、比「全部须确认」更可用（后者等于放弃主动性） |
| **DC-SELF-005** | 优先注册表内扩张；证不可行才显式放宽 | FR-SELF-100 / 101 / 030~033 | `op.turn` 槽**已经存在**（v5 为「chips 即指令」而设）⇒ 让 AI 触发它是**零新增调用点**的；时机词汇扩张同理（新增 trigger 值 ≠ 新增求值入口）。② 路径（放宽 `requestTurn` 计数）会把「唯一回合入口」的治理价值削掉一个量级，故只作**兜底**并强制等价重锚 |
| **DC-SELF-006** | 三控制全入 spec + 载体零新增 | FR-SELF-090~097 | 主动性一旦成立会引入**新的成本面与稳定性面**（token / 跨轮 / 自触发环），而现状**零判据**（Q-SELF-013）；把六项常量做成单源 + 越限抑制 + 可关断，才能让「主动」是可信任的；载体复用 12 kind 则避免同时撞「零新增卡类型」与体积余量（27,480 B）两条红线 |
| **DC-SELF-007** | 不做外部竞品调研 | NG-SELF-011 | 本 Feature 的形状**由作者母理念与仓库内既有先例（S2 / 契约 v2 / 9 op）唯一决定**，不存在「交互模型选型」缺口；登记「未执行」比编造结论更诚实 |

---

## 12. X-SELF-1~7 显式取代 → 判据等价重写映射表（**映射摘要**）

> **口径**：**「显式取代」≠「放宽」**。每项的判据都必须**等价重锚**（断言力不降、计数只增），并留台账。下表给出「取代内容 → 原名门禁 → 等价重写后的判据形态 → 台账落点」。

| # | 既有红线（现状逐字） | 取代内容 | 原名门禁（须等价重写） | **等价重写后的判据形态（摘要）** | 台账落点 |
|---|---|---|---|---|---|
| **X-SELF-1** | **`requestTurn(` 恰 2 处调用点**（composer submit `sidepanel.ts:3232` + `op.turn` 槽 `:3256`），被 `test/op-wiring.test.ts#requestTurnProblems` 逐字钉死 | **允许系统 / AI 发起回合**（主题②）——读法① **保持恰 2 处**（AI 经 `op.turn` 槽在既有注册表内驱动，**diff = 0**）；读法② 仅作兜底（显式放宽 + 等价重锚） | `test/op-wiring.test.ts`（`requestTurnProblems`）/ `test/local-act-wiring.test.ts` / `test/authorize-chip-wiring.test.ts` | ① 默认：`requestTurn(` **仍恰 2**（原判据**一字不改**）② 「AI 主动发起回合」唯一经 `op.turn` ③ 若走读法②：`requestTurn(` 计数断言重写为「**具名入口集**」判据（每个入口在册 + 断言力不减）+ 台账条目 | 取代台账 `modifiedRanges[]`（仅在读法② 时新增条目）；本规范**默认读法① ⇒ 台账零新增**（如实登记「未发生取代」） |
| **X-SELF-2** | **`RecommendTrigger` 恰 4 项**（`'pick'\|'stale'\|'idle'\|'firstRun'`，`sidepanel.ts:1791`），无 `'answered'`；`ref-action` 的 `when` 含 `openAsks === 0` 硬抑制 | **新增驱动时机源（含 `'answered'`）** + `ref-action` 抑制条件的**显式裁决** | `sidepanel.ts:1791` 类型 / `next-registry/providers.ts:136-148` / `test/recommendation-sources.test.ts` / `test/ui/recommendation.mjs`（65） | ① 时机源闭集重写为「**≥5 项且含 `'answered'`**」（旧 4 项**逐字保留**）② 求值入口**恰一处定义**（不新增推荐器）③ 防抖三常量逐字不动 ④ 答完后恰在一次 `'answered'` 求值内产出 next（旧「答完无重跑」的反面判据**增**） | `modifiedRanges[]` + 各门禁计数对账（只增） |
| **X-SELF-3** | **`llm.unconfigured` 阻塞事实只在 op 分支被动写入**（“observed block event”，`sidepanel.ts:1290-1302`）；`runChat` 无配置门禁 | **主题① 主动式系统流**：LLM 缺席成为**主动驱动源**（被识别）；`runChat` 增加**确定性**配置判据 | `sidepanel.ts:1290-1302` / `service-worker.ts:878-941` / `next-registry/providers.ts:57-58`（`OPS_RECOVERY_ROWS`）/ `test/ui/ask-auth-inflow.mjs`（71） | ① 触发语义重写为「**双源并存**」（被动观测**保留** + 主动识别**新增**）② `OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` 元素集与**按终态键控**形态逐条不变 ③ 新增「未配置 ⇒ 产出引导（非错误事件）」判据（**增**） | `modifiedRanges[]` + 主题① 门禁计数对账 |
| **X-SELF-4** | **死端判据只判 5 类阻塞终态**（`BLOCKED_TERMINALS` 恰 5，`definition.ts:34-41`；`no-dead-end.mjs` 39 断言） | **法七扩展：已答 ask / 已交描述入终态词汇**——取代 = **终态枚举扩张**（不是改布尔值） | `test/ui/no-dead-end.mjs`（39）/ `test/g-design-map.ts:77-87`（F1~F11）/ `test/s2-deadend-chain.test.ts`（6）/ `test/blocked-terminals.test.ts`（9） | ① `BLOCKED_TERMINALS` **5 项逐字不变**（阻塞面）② **新增**「驱动者终态词汇」单源（与 `STREAM_TERMINALS` 正交）③ 新词汇下「必有下一个驱动者」判据（**增**）④ 双向反证（新增终态无 next ⇒ FAIL；已有 next 被删 ⇒ FAIL） | `modifiedRanges[]` + `test:dead-end` 计数对账（≥39，增） |
| **X-SELF-5** | **`applyRefAction` 唯一副作用 = 计数**（`sends += 1`，`commandSends` 无驱动语义消费者） | **答案必须产生驱动**——取代 = 语义重定义（从「裁决 + 计数」→「裁决 + 驱动」）；`commandSends` 消费面**显式登记**（COR-1 口径）或退役 | `sidepanel.ts:2177-2189` / `l1/ref-store.ts:280-292` / `test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` / `test/ui/page-input.mjs`（108） | ① `applyRefAction` 调用点**恰一处**（不变）② 「有效 ⇒ 驱动」新增判据（**增**）③ 「无效 ⇒ 既有阻塞终态 + 可达 next」（保留）④ `commandSends` 消费面登记（1 src 只读投影 + 3 测试，零驱动语义）或退役登记（二选一显式） | `modifiedRanges[]` + `test:l1` / `page-input` 计数对账 |
| **X-SELF-6** | **`submitDescribe` 只 `dispatch` 从不 `send`**（`sidepanel.ts:2541-2546`，旁路死端） | **「改用描述」作答后必有下一个驱动者**——取代 = 补齐发送 / 驱动路径 | `sidepanel.ts:2541-2546,3260` / `test/ui/ask-auth-inflow.mjs`（71） | ① 「已交描述 ⇒ 驱动」新增判据（**增**）② 空描述「卡内校验零副作用」保留（且**不入**终态）③ 反证：恢复「只 dispatch」⇒ FAIL | `modifiedRanges[]` + `test:ask-auth` 计数对账（≥71，增） |
| **X-SELF-7** | **`chatBusy` 单飞：第二条回合被丢弃**（`service-worker.ts:879-885`，回错误） | **AI 主动与用户输入的并发仲裁语义**——取代 = `chatBusy` 的**丢弃语义**改为**可判仲裁** | `service-worker.ts:879-885` / `test/ui/journey.mjs`（171）/ `test:ask-auth`（71） | ① 「用户输入永不静默丢失」新增判据（**增**）② 仲裁结果留痕可判（**增**）③ 仲裁有界（**增**）④ 单飞语义本身（同一时刻一个在飞回合）**保留**（不是把单飞删掉） | `modifiedRanges[]` + `journey` / `ask-auth` 计数对账（只增） |

**X 项落地纪律（逐条强制）**：① 每项**不得**以「放宽阈值 / 删除断言 / 静默改常量 / 静默替换冻结对象」落地（FR-SELF-107）② 每项配 ≥1 条注入反证（注入 → FAIL → 逐字节还原 → PASS）③ 每项判据力可**逐条对账**（旧判据 → 新判据映射可核）④ 每项在台账有明文条目（`modifiedRanges[]` / `redlineRemap[]`）；**若某 X 项最终「未发生取代」（例如 X-SELF-1 走读法① = 无 diff），必须如实登记「未发生取代」而非留空**。

---

## 13. 红线继承表（N-SELF-001~020 逐条承载 + N-SELF-021~026 spec 新增）

> **口径**：N-SELF-001~020 为 discovery §7.2 认定的**约束**（不是需求）；本规范**不得改写数值或放宽口径**，逐条给出承载条文与验收锚点。

### 13.1 继承红线（discovery §7.2 逐字保留）

| # | 红线（**逐字**） | 本规范承载 | 验收锚点 |
|---|---|---|---|
| **N-SELF-001** | `dist/content.js` = **177,076 B**，sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（**零容差**） | FR-SELF-123；NG-SELF-003 | AC-SELF-022 |
| **N-SELF-002** | `dist/pick-layer.js` = **34,358 B**，sha256 `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`（**零容差**；R4 已显式解冻重登记，**再动需再登记**）〔**COR-3**：v5 收口值 33,900 B / `5f567d7e…` 为**历史值**〕 | FR-SELF-123；NG-SELF-003 | AC-SELF-022 |
| **N-SELF-003** | `sidepanel.js` ≤ 生效上限 **577,089 B** = `floor(549,609 × 1.05)`；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`**（V3-VOL-1 ②：不设自缚装置） | FR-SELF-121；NG-SELF-009 | AC-SELF-023 |
| **N-SELF-004** | V3-VOL-3 三值：档位 = **563,200 B**、绝对上限 = **619,520 B**（= 档位 × 1.10）、`newBaselineBytes` 随现行基线**同源前移**；`authorConfirmation.status ∈ {pending-author-line, confirmed, overridden-by-author}`，**不得伪称已确认** | FR-SELF-122；NG-SELF-009 | AC-SELF-023 |
| **N-SELF-005** | **特权 op 恰 2 必须用户手势**：`op.authorize` / `op.perm.request`（`layer:'sw'`）；「**SW 永不调用 `.request(`**」；**AI 不可自动执行**（不可让渡的安全红线） | FR-SELF-081 / 067 / 085；NG-SELF-017 | AC-SELF-005 / 022 |
| **N-SELF-006** | **判定链零触碰**：`src/security/policy.ts` / `src/security/auto-authorize.ts` 在 `zeroDiffFiles` 冻结（内容哈希 pin，9 项） | FR-SELF-067 / 123；NG-SELF-004 | AC-SELF-022 |
| **N-SELF-007** | **安装期静态面零变化**：`manifest.permissions` 逐字 5 项（`activeTab`/`scripting`/`sidePanel`/`storage`/`tabs`）；`host_permissions` 6 条；无 `<all_urls>` / 无静态 `content_scripts`；`minimum_chrome_version: 116` | NG-SELF-005 | AC-SELF-022 |
| **N-SELF-008** | **`KIND_SET` 40 项逐字不增**；新消息族（若有）走 **type-only 先例**（进 `KIND_SET` = 增长 `content.js`，默认禁止） | FR-SELF-095 / 123；NG-SELF-006 | AC-SELF-006 / 022 |
| **N-SELF-009** | **12 kind 契约不动**（7 主类 + 5 过程卡）；**零新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []` + 「任意深度零 `[data-host]`」） | FR-SELF-062 / 095；NG-SELF-014 | AC-SELF-006 |
| **N-SELF-010** | **法八零明文不退化**：流内 payload / digest / 审计 / DOM **四面零明文**（掩码 secret 卡 + `maskedLength` 只落长度类别） | FR-SELF-049 / NFR-SELF-003 | AC-SELF-012 |
| **N-SELF-011** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账**显式取代**并留痕，**不是静默删除**） | FR-SELF-003 / 107 / 110 / 116；NG-SELF-008 | AC-SELF-016 / 020 |
| **N-SELF-012** | 保护 pin：journey **`43054..58287` / sha `cc79f413…` / 240 行**；binding **`107780..115930` / sha `be9ad0e9…`**（`decision = keep`） | FR-SELF-112 | AC-SELF-018 |
| **N-SELF-013** | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile；`test` / `test:ui` / `test:binding` **绝不并发**）；`CHROMIUM_GATES === 9` 不动 | FR-SELF-114 / 115；§16 纪律第 3 条 | AC-SELF-021 |
| **N-SELF-014** | 纪律：**不碰 `main`、不 force push、path-limited `git add`（禁 `git add -A` / `.`）、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖**；**不合 main、不发布** | §16 纪律表；NG-SELF-012 | §16 |
| **N-SELF-015** | **`F-29`（A2A 候选）未立项未排期，保持原样不动**（ROADMAP 相关区段**一字不动 / 字节相等**） | NG-SELF-012 | §16 纪律第 2 条 |
| **N-SELF-016** | **v5 产物零改写**：v5 父 + 三叶全部 `validated` 终态原样保留；不改 v5 目录 / pin / 台账（D7） | NG-SELF-022 | AC-SELF-026（共享面登记）+ §16 |
| **N-SELF-017** | `KL-N-10` 处置纪律：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | FR-SELF-114；EC-SELF-021 | AC-SELF-021 |
| **N-SELF-018** | 取代台账 `knownGap` 一致性：`status = complete-steps-1-8` 时该字段**必须为空或仅声明闭环**（机核强制） | FR-SELF-113 | AC-SELF-019 |
| **N-SELF-019** | **法七不退化**：5 类阻塞终态流内**必有可达 next**（死端 = 0）——本 Feature 只**扩展**终态词汇，**不得**削弱既有判据 | FR-SELF-103 / 021；NG-SELF-022 | AC-SELF-003 / 022 |
| **N-SELF-020** | 纪律：**开放点不得在 spec 前被「顺手定下」**；主题①② 的触发时机 / 安全边界 / 打扰控制 = **spec 批量裁决**（D2） | §8 / §11（**已全部裁决**）；§16 纪律第 11 条 | §11 |

### 13.2 spec 新增红线（本阶段识别，与 N 同等级）

| # | 红线（本规范新增） | 承载 | 理由 |
|---|---|---|---|
| **N-SELF-021** | **特权 op 恒 `gesture`**：`op.authorize` / `op.perm.request` **永不在** `auto` / `confirm` 档；**AI 不可发起、不可代答 consent**（「用户手势先行」） | FR-SELF-081 / 085；NG-SELF-017 | 主动性一旦放开，最容易的越界就是「让 AI 顺手把授权也办了」；N-SELF-005 只管「SW 不 `.request(`」，本条把**发起权**也钉死 |
| **N-SELF-022** | **驱动者集合 ≡ 注册表 provider 集合**（双向包含）：**不存在注册表外的驱动者**；驱动者**不得**自带调用点 | FR-SELF-010 / 015；NG-SELF-018 | 「驱动者层」若允许旁路，就会立刻退化为「第 8 个散落调用点」；本条是该层**可治理**的前提 |
| **N-SELF-023** | **「答案必须产生驱动」**：任何「用户已表达的话」（三种 ask + describe）**不得**以「计数 / 留痕 / dispatch」为唯一副作用 | FR-SELF-022 / 025 / 027 | 会话 B 的根因就是「结算 ≠ 驱动」；本条把「结算 = 驱动的入口」写成不可让渡约束 |
| **N-SELF-024** | **主题① 零 LLM 调用 / 零 token**（确定性对照面）：作者原话「由系统**代码**流程」的机核形态 | FR-SELF-047 / NFR-SELF-009 / 014 | 若主题① 走 LLM，则「未配置 ⇒ 主动引导」在逻辑上自相矛盾（没有 LLM 怎么调用 LLM）；本条把该自相矛盾封死 |
| **N-SELF-025** | **AI 主动不得改档 / 不得新增真值源 / 不得新增静态权限** | FR-SELF-085 / 067；NG-SELF-013 / 005 | 主动性的成本必须落在既有安全面内；任何「为了主动而扩权」都是 R-SELF-001 的实现 |
| **N-SELF-026** | **护栏不可静默取消**：三控制（频次 / 预算 / 链深度）**必须**在 spec 有判据；未落地须**显式登记**（台账 + 未闭合义务） | FR-SELF-090~097 / NFR-SELF-013；NG-SELF-020 | Q-SELF-013 的本体是「零判据」；若允许「实现时再删掉」，等于把该缺口原样留到下一轮 |

---

## 14. 子 Feature 拆分与交付顺序

### 14.1 结构裁决（**3 叶，依存序，串行**）

| 项 | 裁决 | 理由 |
|---|---|---|
| 父 Feature | `specs-tree-web-cli-plugin-v55-self-driven`，`depth=1`，**轻量规范容器**（不承接 tasks/build/review/validate，不产出 `tasks.json`） | v3-ui / v4-chat / v4.5 / v5 先例 |
| 子 Feature | **3 叶**：① `specs-tree-v55-1-driver-layer` ② `specs-tree-v55-2-deterministic-onboarding` ③ `specs-tree-v55-3-ai-driven-orchestration` | 采纳 discovery §6.3 建议；见下「不可分割性复核」 |
| 拆分依据 | 四类共享面（体积五要素 / journey+binding 保护段 / 取代台账 / `knownGap`）被 ≥2 叶触碰 ⇒ **共享面必须一次做完**（FR-SELF-004）；但**驱动者层 + 法七扩展**（机制层）、**主题① 确定性系统流**（系统流程层）、**主题② AI 驱动编排 + 治理收口**（AI 主动性层 + 收口）三者的**取代对象 / 门禁主面 / 台账条目**互不重叠，具备独立成叶的判据 | 与 discovery §6.3 草案**一致**（命名沿用 `v55-1` / `v55-2` / `v55-3`） |
| **不可分割性复核（硬性要求 3）** | **判为可分割**（**3 叶成立**，不退化单叶）：① **底座独立性**：`v55-1` 的全部产出（驱动者注册表化 + 时机源 + 终态词汇 + 答案驱动化 + S0 机器化）在**没有任何主题①②**的情况下**自身可验收**（S0 分支 B 的「识别未配置」由 `v55-1` 的终态词汇 + 时机源**打通**，而「引导流内容」属 `v55-2`）② **风险分层**：`v55-3` 是唯一触碰**安全边界**（三档清分 / 特权恒 gesture / 降档禁止）与**护栏**的叶，单独成叶可让安全评审独立进行 ③ **体积可控**：三叶各自可独立做五要素重登记（`v55-3` 收口时做共享面对账），避免「一次重登记吞掉全部预算」 | discovery §6.3 + O-SELF-002 连带开放点 |
| 串行理由 | `v55-2` 依赖 `v55-1` 的**时机源 / 终态词汇 / 驱动者四元组**；`v55-3` 依赖 `v55-1` 的驱动者层底座 + `v55-2` 的**确定性对照面**（主题① 是主题② 的分流另一端） | 依赖方向明确，叶间不可并行 |
| 否决的替代结构 | ① **单叶 + 内部分组**：会把「安全边界评审 + S0 首验收 + 两主题」压在同一轮，违背 v5「一叶一收口」的验证纪律，且体积一次重登记无回退 ② **4 叶**（把「S0 首验收」独立成叶）：S0 的判据**贯穿三叶**（分支 B 必判项在 `v55-2`），独立成叶会造成「同一判据三叶各改一次」 | FR-SELF-004 |

### 14.2 交付顺序与叶职责

| 顺序 | 叶 | 职责 | 依赖 |
|:--:|---|---|---|
| 1 | **`specs-tree-v55-1-driver-layer`**（P0，**底座叶**） | **驱动者层 + 法七扩展底座**：驱动者形态定论（注册表化 + 四元组 + `driverClass`）+ **时机源扩张（`'answered'`）** + `ref-action` 抑制重锚 + **驱动者终态词汇**（已答 ask 三型 / 已交描述）+ `applyRefAction` 驱动化 + `commandSends` 消费面登记 + `submitDescribe` 补齐 + 后台 ask 迟到作答非死端 + 死端守护门禁扩张（双向反证）+ **S0 全链机器化（分支 A 的 AI 续流机制 + 分支 B 的识别侧；承载 S0 判据骨架）** | 无前置叶（依赖链起点） |
| 2 | **`specs-tree-v55-2-deterministic-onboarding`**（P0，**主题①叶**） | **主题① 确定性系统流**：`runChat` 前置配置判据 + `llm.unconfigured` 触发语义升级（双源并存）+ 多步确定性引导流（步骤单源 + 零 LLM 调用）+ **配置完成 → 自动续接悬置任务**（S2 范式复用 + 悬置任务单源 + 失效重校验）+ 首装 / 已装未配两场景 + 取消非死端 + 不跳走 + 掩码卡复用；**承载 S0 分支 B 的必判项** | `v55-1`（时机源 / 终态词汇 / 驱动者四元组） |
| 3 | **`specs-tree-v55-3-ai-driven-orchestration`**（P0，**主题② + 收口叶**） | **主题② AI 驱动编排 + 安全治理 + 共享面收口**：AI / 系统经 `op.turn` 槽启动回合 + **op 三档清分（5/2/2 + 新 op 归档机核）** + **护栏三件套**（打扰 / token 预算 / 防环）+ 并发仲裁（`chatBusy` 语义重锚）+ AI 主动留痕三要素 + 否决 / 关断 + 零新增载体（12 kind / 零宿主 / `KIND_SET` 40）；**三叶共享面收口**（体积五要素 / journey+binding 保护段 / 取代台账 / `knownGap` 一致性） | `v55-1`（底座）+ `v55-2`（主题① 的**确定性对照面**：分流判据的另一端） |

### 14.3 FR → 叶 覆盖矩阵（**每条 FR 恰属一叶的「主责面」；共享面另标**）

| FR 组 | FR 编号 | 主责叶 | 共享面 |
|---|---|---|---|
| GOV | FR-SELF-001~005 | 父（结构 / 纪律）；各叶各自执行 | 体积 / 保护段 / 取代台账 / `knownGap` |
| DRIVE | FR-SELF-010~019 | **v55-1**（驱动者层底座） | — |
| LAW7X | FR-SELF-020~028 | **v55-1**（终态词汇 + 答案驱动化 + describe + 后台 ask） | `test:stream` / `test:ask-auth` |
| TIMING | FR-SELF-030~036 | **v55-1**（时机源扩张；verifier 面） | `test:recommendation` |
| ONBOARD | FR-SELF-040~052 | **v55-2** | `test:ask-auth`（掩码卡）/ `test:law8` |
| AIDRIVE | FR-SELF-060~070 | **v55-3**（主题②） | `test/op-wiring` / `journey` |
| OPSAFE | FR-SELF-080~086 | **v55-3**（安全边界清单） | `capability-wiring` / `sw-op-mirror` |
| GUARD | FR-SELF-090~097 | **v55-3**（护栏三件套） | `test:stream` / `l0` |
| SUPERSEDE | FR-SELF-100~107 | **v55-1**（X-SELF-1·2·4·5·6 的机制侧）· **v55-2**（X-SELF-3）· **v55-3**（X-SELF-7 + 逐项对账收口） | **取代台账（共享面）** |
| GATE | FR-SELF-110~116 | 各叶按主责面；**父级共享面（保护段 / 台账）一次做完** | **共享面** |
| VOL | FR-SELF-120~124 | 各叶按自身增量登记；**收口在 v55-3** | **共享面** |
| S0 | FR-SELF-130~134 | **v55-1**（全链骨架 + 分支 A）· **v55-2**（分支 B 必判项）· **v55-3**（人工面汇总） | 新 S0 门禁（跨叶） |

**覆盖结论**：父 §5 全部 **95 条 FR** 各有主责叶；**无「无主 FR」**；**共享面（体积 / 保护段 / 取代台账 / `knownGap`）明确标注为「一次做完」**（FR-SELF-004）。**S0 是跨叶判据**（骨架在 `v55-1`、分支 B 必判项在 `v55-2`、人工面汇总在 `v55-3`），因此**不得**把 S0 拆成独立叶（见 §14.1 否决项②）。

---

## 15. 风险登记（discovery 继承 R-SELF-001~012 + spec 新增 R-SELF-901~910）

### 15.1 继承风险（discovery §5.2，逐条保留等级与预登记证据）

| # | 风险 | 等级 | 承载条文 / 应对 |
|---|---|:--:|---|
| **R-SELF-001** | **安全边界被「主动性」侵蚀（最高危）**：AI/系统主动发起若不加边界，会撞**特权 op 恰 2 必须用户手势** + 「SW 永不 `.request(`」+ `zeroDiffFiles`（9 项）⇒ 可能打开**权限提升面** | **高** | FR-SELF-080~086 / 067 / 085；N-SELF-005 / 021 / 025；AC-SELF-005 / 022；**三档清分 + 特权恒 gesture + 新增红线 N-SELF-021** |
| **R-SELF-002** | **门禁取代面**（`requestTurn` 恰 2 处 + `RecommendTrigger` 4 项 + `ref-action` 抑制）：任何「让系统/AI 发回合」的改法都先撞门禁；取代 vs 并存两读法**工作量差一个量级** | **高** | FR-SELF-100 / 101 / 030~033；AC-SELF-004 / 009；**默认读法①（diff = 0）**；只有证不可行才显式放宽 |
| **R-SELF-003** | **半驱动者堆积 / 时机语义散落**：若以「再加一处 `maybeRecommend(...)`」落地，会形成第二份半驱动者（现状 7 个调用点），求值顺序 / 防环 / 去重无主 | **中高** | FR-SELF-010 / 014 / 015 / 019 / 033；AC-SELF-002 / 009 / 015；**注册表化 + 单源 + 调用点不增机核** |
| **R-SELF-004** | **token 成本 / 自触发环无判据**：AI 主动一旦成立，「主动 → 产 next → 又主动」可能成环；且主动回合**真实消耗 token** | **中高** | FR-SELF-064 / 091 / 092 / 093；AC-SELF-006；N-SELF-026；EC-SELF-014 / 015 |
| **R-SELF-005** | **`content.js` / `pick-layer.js` 零容差 + `KIND_SET` 40 逐字**：驱动者若需新消息族而误入 `KIND_SET`，直接撞红线 | **高** | FR-SELF-095 / 123；NG-SELF-003 / 006；AC-SELF-006 / 022 |
| **R-SELF-006** | **体积余量仅 27,480 B（+5.00%）**：本 Feature 体量存在越限可能（v5 段 plan Σ 曾低估 **2.8×**） | **中高** | FR-SELF-120~124；AC-SELF-023 / 024；**禁止在预算未评估前排「全量落地」** |
| **R-SELF-007** | **法七扩展的判据真空**：「已答 ask 入终态」目前**无任何门禁**；「已答」判定口径未定 ⇒ 可能造出**恒真断言**（v4.5 教训） | **中高** | FR-SELF-020~024；AC-SELF-003 / 016；**四口径 + 双向反证 + 禁恒真断言** |
| **R-SELF-008** | **`askBridge` 生命周期耦合**：后台 ask 结算依赖在飞回合；「让 ask 答案总能被接住」需动 SW 回合生命周期 | **中** | FR-SELF-028；EC-SELF-008；AC-SELF-011 |
| **R-SELF-009** | **零宿主判据 / 12 kind 契约**：AI 主动若引入流内固定容器或新卡类型，直接违反 v4.5 `REGISTERED_STRUCTURAL_HOSTS = []` 与 v5「零新增卡类型」 | **中** | FR-SELF-062 / 095；NG-SELF-001 / 014；AC-SELF-006 |
| **R-SELF-010** | **门禁严格串行 + 既知环境 flake**（`KL-N-10`）⇒ 重构轮会被误读为回归 | **低** | FR-SELF-114；EC-SELF-021；AC-SELF-021 |
| **R-SELF-011** | **断言只增的门禁规模**：现行基数（v5 后）`npm test` **1181** 等**只增不减**；本 Feature 新增判据会叠加大批量断言 + 可能的等价重锚 | **中** | FR-SELF-003 / 110 / 116；AC-SELF-016 / 020 |
| **R-SELF-012** | **方案先行风险**：主题①② 的触发时机 / 安全边界 / 打扰控制若在 spec 前被「顺手定下」，会绕过开放点裁决 ⇒ 作者母理念被窄化为一个实现 | **中高** | §8 / §11（**O-SELF-001~007 已全部批量裁决**）；N-SELF-020；§16 第 11 条 |

### 15.2 spec 新增风险

| # | 风险 | 等级 | 说明 / 应对 |
|---|---|:--:|---|
| **R-SELF-901** | **驱动者声明与实际注册表漂移**：四元组表写了但注册表没有 / 注册表有但表缺行 / `chips` 悬空 ⇒ 「驱动权可判」变成纸面 | 中高 | FR-SELF-011 / 015 / 019；AC-SELF-002 / 015（三类注入反证） |
| **R-SELF-902** | **时机源扩张被实现为「第二个推荐器」**（写新 trigger 但另起求值入口）⇒ 半驱动者复辟 | 中高 | FR-SELF-033 / 015；AC-SELF-009（「求值入口恰一处定义」机核） |
| **R-SELF-903** | **「已答」口径被写成恒真**（例如「只要卡存在就算已答」）⇒ 判据永不 FAIL | 中高 | FR-SELF-023 / 024；AC-SELF-003 / 017（四口径 + 注入必红） |
| **R-SELF-904** | **悬置任务被实现为「第二条事实通路」**（与流内事实双写）⇒ 双写复辟（v4.5 教训） | 中高 | FR-SELF-045 / 046；EC-SELF-011；AC-SELF-007（单源 + 重校验） |
| **R-SELF-905** | **主题① 引导「跳走」**（为了省事直接打开设置页 / `options`）⇒ 违作者「不允许让用户跳来跳去」 | 中 | FR-SELF-048；AC-SELF-007（零视图切换断言） |
| **R-SELF-906** | **三档清分表与实际 `IMPL` 声明脱钩**（改了 `consent` 但没改清分）⇒ 清分纸面化 | 中高 | FR-SELF-086；AC-SELF-005（逐 op 对照 `riskLevel` / `consent` / `layer`） |
| **R-SELF-907** | **护栏常量被实现为「只写不判」**（常量存在但越限不抑制）⇒ 护栏空转 | 中高 | FR-SELF-090~093 / 097；AC-SELF-006（越限抑制断言 + 反证） |
| **R-SELF-908** | **S0 被写成「场景脚本绿」而非「链路可判」**（例如用假 provider 跳过真实驱动路径）⇒ 首验收失真（v5-2 review BLOCK-03 教训） | 中高 | FR-SELF-130~133；AC-SELF-001 / 017（逐环节可判 + 两段证伪） |
| **R-SELF-909** | **主题② 主动性与确定性路径互相掩盖**（未配置时仍走 AI 主动 / 已配置时仍弹配置引导）⇒ 分流失真 | 中 | FR-SELF-052 / 070；AC-SELF-008 / 013（互斥完备断言） |
| **R-SELF-910** | **体积评估被跳过**（先实现后登记）⇒ 发现越限时已无可回退（v5-2 R1 越档位先例） | 中高 | FR-SELF-124；AC-SELF-024；§16 第 9 条 |

---

## 16. 纪律与验证契约

| # | 纪律 | 依据 |
|:-:|---|---|
| 1 | **`.sddu/**` 只写本 Feature 目录**；本阶段（spec）零改动 `src/` / `test/` / `dist/` / `docs/` / `design/` 与 `ROADMAP.md` | D6 / FR-SELF-005 |
| 2 | **path-limited `git add`**（禁 `git add -A` / `.`）；不 force push；不合 main；不发布；无新依赖；不改 `packages/web-cli-base/**`；不改 `.opencode/opencode.json`；`F-29` 区段一字不动 | N-SELF-014 / 015 / NG-SELF-012 |
| 3 | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile） | N-SELF-013 / FR-SELF-114 |
| 4 | **`KL-N-10` 处置纪律**：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | N-SELF-017 / FR-SELF-114 |
| 5 | **断言零删除零降级、计数只增不减**（唯一例外：保护段显式取代 + 台账留痕） | N-SELF-011 / FR-SELF-003 |
| 6 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决自我验收 / 换口径放松」 | R-SELF-007 / 903 / FR-SELF-111 |
| 7 | **人工面如实登记**：真机观感 / 读屏 / 主动体感等 headless 不可合成项逐项标注 `⏳ 未执行` 或 `PASS`，**不得冒充 PASS** | R-SELF-014 邻域 / AC-SELF-025 / NG-SELF-019 |
| 8 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7.1 + 本规范 §2.4）；未跑任何门禁 / 构建 / Chromium | D6 / FR-SELF-005 |
| 9 | **体积预算先评估后落地**：先出净增上下界与越限路径口径，再排落地；`PENDING_ABSOLUTE_CAP` / `authorConfirmation` **不得静默改写** | R-SELF-006 / 910 / FR-SELF-124 |
| 10 | **不编造外部结论**：竞品调研**未执行**（PASS 口径 = 「未执行，不阻塞」），不得据此外推 | NG-SELF-011 / O-SELF-007 |
| 11 | **取代与实现同轮完成**：X-SELF-1~7 的台账登记与判据重锚**不得**拆到「下一轮补」；**未发生取代的 X 项须如实登记「未发生」** | FR-SELF-107 / §12 |
| 12 | **三叶串行 + 共享面一次做完**：`v55-1 → v55-2 → v55-3`；体积 / 保护段 / 取代台账 / `knownGap` 四类共享面**恰一次**登记 | FR-SELF-002 / 004 / AC-SELF-026 |
| 13 | **驱动者层不可旁路**：驱动者集合 ≡ 注册表 provider 集合；不得新增散落调用点（第 8 个 `maybeRecommend(...)`）；AI 主动唯一经 `op.turn` | N-SELF-022 / FR-SELF-010 / 015 / 060 |
| 14 | **护栏不可静默取消**：三控制未落地时须显式登记（台账 + 未闭合义务） | N-SELF-026 / NG-SELF-020 / FR-SELF-097 |
| 15 | **`authorConfirmation` 占位口径**：档位 563,200 / 绝对上限 619,520 / 生效上限 577,089 —— `pending-author-line` **未闭合义务，不得伪称已确认** | N-SELF-004 / FR-SELF-122 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5.5「self / ai-driven：让助手像助手」需求规范）：**父 Feature = 轻量规范容器 + 3 叶**（`v55-1-driver-layer` → `v55-2-deterministic-onboarding` → `v55-3-ai-driven-orchestration`，依存序串行，**已复核不退化单叶**）；**O-SELF-001~007 七条开放点全部裁决**（status 一律 `ruled`，DC-SELF-001~007，采纳 discovery 推荐项）；**FR 95 条**（GOV 5 / DRIVE 10 / LAW7X 9 / TIMING 7 / ONBOARD 13 / AIDRIVE 11 / OPSAFE 7 / GUARD 8 / SUPERSEDE 8 / GATE 7 / VOL 5 / S0 5）；**NFR 14** / **EC 22** / **NG 22** / **US 10** / **G 8** / **AC 26**（核心 = 001 **S0 全链机器化（地位 = v5 之 S2）** / 002 驱动者层注册表化 / 003 法七扩展 / 004 X-SELF-1~7 等价重锚 / 005 op 三档清分 / 006 护栏三件套）；**X-SELF-1~7 → 判据等价重写映射表**（§12）；**N-SELF-001~020 红线继承逐条承载 + N-SELF-021~026 spec 新增红线**（§13）；**缺口全景 GAP-SELF-01~09**（§10.0，无孤儿）+ **Q-SELF-001~015 / R1~R6 覆盖矩阵**（§10.1 / §10.2）；R-SELF-001~012 继承 + R-SELF-901~910 新增（§15）；门禁基线清单 26 项（§9.5，**只增不减**）；FR → 叶覆盖矩阵（§14.3）；**现状事实核对 §2.4 + 3 条复核订正**（COR-1 `commandSends` 消费面 / COR-2 `g-design-map.ts` 文件名 / COR-3 pick-layer 历史值）。**关键口径**：`content.js` 177,076 B（零容差）/ `pick-layer.js` 34,358 B（零容差）/ `sidepanel.js` 549,609 B ≤ 577,089 B（余量 27,480）· 档位 563,200 / 绝对上限 619,520 / `pending-author-line` · `KIND_SET` 40 项逐字 · `requestTurn` 恰 2 处 · `RecommendTrigger` 恰 4 项 + `'answered'` 新增 · 12 kind / 零宿主 · 特权 op 恰 2 恒 `gesture` | 2026-09-22 | SDDU Spec Agent |

