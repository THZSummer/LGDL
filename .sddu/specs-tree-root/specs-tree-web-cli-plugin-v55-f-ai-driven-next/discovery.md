# 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-ai-driven-next

> **文档定位**: SDDU 问题挖掘报告 — 记录 web-cli-plugin「**AI 驱动 next（AI-driven next）：把「下一步推荐」的产出从确定性注册表独占，改为「LLM 结构化产出 next 候选 + 确定性注册表退居兜底与安全闸」**」的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = ① **作者裁决（2026-09-25，方向性，逐字保留于 §0.1）** ② **现状架构诊断（逐条 `file:line`，本报告 §0.2 / §7 复核并引用，不重开诊断）** ③ 上游收口总账（`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-input-as-next/closeout.md`：F-35 两叶 `validated`；`298,926` 体积基线 / 1443 测试基线）④ 相关立法（法一 / 法七 / 法九；v4-chat spec.md 逐字；v5.5 ADR-V55-008/009/010；v5.5.1 ADR-SGO）⑤ 仓库现状（分支 `feature/web-cli-plugin` @ `38565ac`（R8）；本轮实测）⑥ 编排器代作者决策（2026-09-26：作者已授权编排器代行决策；**不访谈作者基本框架，开放点收集后附推荐，spec 阶段批量裁决**）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（web-cli-plugin F-36「AI 驱动 next」问题挖掘）

web-cli-plugin「**AI 驱动 next（AI-driven next）**」问题挖掘报告 —— 把作者裁决（**「有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出」**）与既有诊断证据（**推荐层仍是确定性内核 `recommendNextStep` 独占产出；AI 在回合结题时口述的 4 条下一步没有结构化通道进 chips；chips 那一排仍显示陈旧的确定性候选**）转成可验收的问题域：**「下一步推荐」这一层是「一切皆 next」主线上最后一块仍由确定性代码独占产出的内容面——LLM 已经能在回合内驱动工具 / 命令，也已经能「答案后零按键自动成回合」，却唯独不能「结构化产出下一步候选」**。作者看到的「AI 口述 4 条有用下一步 vs 那排陈旧 chip」（两张皮）正是这个面**产出者与被推荐内容脱钩**的可观察症状。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（作者裁决 / 现状架构 / 代码事实 / 上游产物 / 编排器决策 / 仓库实测），供 spec 阶段追溯；**不加入任何方案推断，不写需求条文**。

### 0.1 作者裁决（2026-09-25，**原话逐字保留，不美化**，方向性）

> 「这个推荐对吗，是不是还是写死的，有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出」

**前情（编排器转述，事实）**：
- 前情①：**R8（`38565ac`）已加首开 floor 终端**——作者在 `authorized ∧ configured` 的首开面板上看到推荐卡末端「自由输入…」终端，确认它**仍是确定性 provider（`free-input`）产出**，于是追问「是不是还是写死的」。
- 前情②：作者此前已提过——**LLM 在回合结题时口述了 4 条很有用的下一步，却进不了 chips；而那一排 chips 却显示陈旧的「用引用 1 做原地翻译」**——**两张皮**（AI 说的与 chips 显示的互不一致）。

| 要素 | 逐字要点 | 性质 |
|---|---|---|
| **顶层原则** | 「有连接 LLM 的情况下的原则是，**AI 驱动**呀」 | **不可逆立法**（承 F-33 v5.5 主题「让助手像助手」/ 「已配置 ⇒ AI 零按键驱动」） |
| **推导** | 「所以 **next 也应该交给 AI 去驱动输出**」 | 产品语言：next 的**产出者**应从确定性注册表转为 AI |
| **结论** | next 层不得再「写死」（确定性内核独占产出） | **面级转移**（不是修缺陷；是产出权的转移） |

> **口径声明（如实）**：作者**未**指定「AI 在**何时**产出 next」「用**什么载体**产出」「AI 候选如何**校验 / 呈现 / 与规则候选合并**」「确定性注册表退到什么位置」「首开是否也 AI 化」「是否需要新时机源」——这些**全部登记为开放点（§6.2 O-ADN-\*）**，**不在本阶段预设答案**。作者原话中的「AI 驱动」是**原则**而非**实现约束**。

### 0.2 现状架构诊断（**只读已完成，本报告复核并引用，不重开诊断**）

> 以下为编排器已确认的现状架构（逐条 `file:line`，本轮**只读复核，未改任何源码**）。它是「确定性面 vs AI 面」的现状底座（§7 全景给出映射）。

**A. 推荐层（确定性内核，本轮复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| A-1 | **单内核入口**：`recommendNextStep(input)` 是推荐产出的唯一内核 | `src/ui/sidepanel/recommend.ts:487` |
| A-2 | **规则表 = 注册表 provider**：`candidateRules` 从 `resolveOrder()` 遍历 provider，按 `NEXTSTEP_PRIORITY` 取首个命中规则 | `recommend.ts:436`；`NEXTSTEP_PRIORITY` 恰 4（`recommend.ts:60`） |
| A-3 | **NextProvider 契约 v2**：`when(ctx)` 纯谓词 + `chips`（opId 列表）+ `textOf` | `next-registry/definition.ts:113-128` |
| A-4 | **provider 集合**：5 触发器恢复 + 2 op 驱动恢复 + 3 规则 + **1 `free-input` 终端** = **11 行**（F-35 前为 10；终端为 IAN-1 新增） | `next-registry/providers.ts:124-201`（`builtinProviders`）；`FREE_INPUT_PROVIDER_ID` `:95` |
| A-5 | **驱动者声明表**（与 provider 集合互为**双向包含**判据的**手写第二源**）：**11 行** | `providers.ts:224-239`（`DRIVER_DECLS_SRC`） |
| A-6 | **时机源闭集**：恰 5 = `['pick','stale','idle','firstRun','answered']`（旧 4 逐字保留 + `answered`） | `next-registry/drivers.ts:31-36` |
| A-7 | **`maybeRecommend` 调用点**：**8 处**（1 定义 + 8 调用）；`nextAfterSettle` 恰 1 定义（结算→时机**唯一**收口） | `sidepanel.ts:2007`（定义）；调用点 `:2097/:2285/:2303/:2659/:2836/:2906/:4106/:4178`；`nextAfterSettle` `:2092` |
| A-8 | **五时机闭集**的触发点：`pick` / `stale` / `idle`（回合结束 / 失败）/ `firstRun`（首装）/ `answered`（结算） | `sidepanel.ts:2836,2906`（pick）/ `:2659`（stale）/ `:4106,4178,2285`（idle）/ `:2303`（firstRun）/ `:2097`（answered） |
| A-9 | **两段硬门 + 两段抑制**：`pending`（在飞不生成）/ `interval`（10 s 防抖）/ `empty`（无候选）/ `safety`（候选全被 deny，fail-closed） | `recommend.ts:487-517`；`NEXTSTEP_MIN_INTERVAL_MS` `:64` |
| A-10 | **上限**：`MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（单卡）· `MAX_CHIPS_PER_CARD = 3` | `recommend.ts:51,54`；`cards/nextstep.ts:29` |
| A-11 | **零死端 floor（R8 后）**：无任何候选 ⇒ 铸「仅含 `free-input` 终端」最小卡（`terminal: true`，无规则 id）；首开 / ready 入口复用 `'idle'` 兑现首屏必有终端 | `recommend.ts:395-409,506-517`；`sidepanel.ts:2279-2286`（`maybeRecommendOpenEntry`）；`test/r8-open-next-entry.test.ts` |
| A-12 | **终端非 chip**：`.next-terminal` 不被 `pending` 禁用、不进 `MAX_CHIPS_PER_CARD`；`data-act='free-input'` ∈ 集 A 协议动作（8→9） | `cards/nextstep.ts`（`NEXT_TERMINAL_CLASS`）；`dispatch.ts:35-49` |
| A-13 | **chip 即指令**：chip 的 `data-act`/`data-op` 由单源 `ACT_TO_OP`（恰 6 行）派生；分发 = 一次查表 `dispatchChipAction` | `dispatch.ts:11-24,60-68`；`next-dispatch-diff0.test.ts` |

**B. AI 层（v5.5 已建，本轮复核）**

| # | 事实 | `file:line` |
|:-:|---|---|
| B-1 | **AI 能在回合内驱动命令 / 工具**：思考 / 命令指示器（`onAssistantText` / `onCommandLine` / `onToolOutput`）→ 流内 thinking / command / tool 卡 | `background/service-worker.ts`（`runChatTurn`）；`chat-events.ts:80-102`（`commandEvent` / `toolResultEvent`） |
| B-2 | **`pressCandidate`（AI 自动按下单源）**：AI 只可按 `auto` 档；`confirm`/`gesture` 恒拒 | `next-registry/ai-drive.ts:128-144`；`pressDecision` `:67-78` |
| B-3 | **`driverClass` 权限矩阵**：只有 `ai-driven` 驱动者有权自动按下 | `ai-drive.ts:36-39`；`drivers.ts`（`DRIVER_CLASSES`） |
| B-4 | **已配置 ⇒ 答案后零按键自动成回合**：`driveAnsweredTurn` 经**既有** `op.turn` 槽抛回合 | `sidepanel.ts:2120-2159`（`driveAnsweredTurn`）；`:2099`（`nextAfterSettle` 内调用） |
| B-5 | **op 三档清分**（派生式，非手写表）：`auto 5` / `confirm 2` / `gesture 2`（特权恒 gesture） | `shared/op-table.ts`（`tierOf` / `OP_TIERS` / `OP_TIER_TABLE`）；`test/op-three-tier.test.ts` |
| B-6 | **护栏六常量**：频次 6/10min · 同因去重 · 静默 60 s · 冷却 10 s · 链深 2 · 回合预算 8 | `next-registry/guard.ts:18-34`；`test/proactivity-guard.test.ts` |
| B-7 | **关断偏好**：`web-cli:proactive`（默认 ON）；对 `deterministic` 恒放行 | `guard.ts:30-34,76-88,118-139` |
| B-8 | **留痕两值可判**：AI 恒写候选驱动者声明 id；手输恒写 `MANUAL_DRIVER_ID='manual'`（∉ 声明 id 域） | `ai-drive.ts:85-101`（`driverTraceLine` / `MANUAL_DRIVER_ID`）；`test/free-input-next.test.ts`（FIN-4） |
| B-9 | **并发仲裁**：SW 有界队列（`TURN_QUEUE_MAX = 1`；`executed`/`queued`/`busy-rejected`/`ai-deferred`）；AI 撞车一律不发起（`blocked:busy`） | `background/turn-queue.ts`；`chat-events.ts:45`（`ARBITRATION_RESULTS`）；`test/turn-arbitration.test.ts` |

**C. 回合结题点（AI 产出结构化 next 的**自然挂点**）**

| # | 事实 | `file:line` |
|:-:|---|---|
| C-1 | `chat-result` 的 `variant='done'` ⇒ 置 `pending=false` + 提交 R6 完成去重键 + **`maybeRecommend('idle')`**（若 `openAsks === 0`）+ `driveAnsweredTurn()` | `sidepanel.ts:4168-4184` |
| C-2 | `chat-result` 的 `variant='error'` ⇒ 错误落卡 + **`maybeRecommend('idle')`** | `sidepanel.ts:4102-4107` |
| C-3 | **`chat-result` 载荷的既有字段**：`variant` / `text` / `retrying` / `tool` / `ok` / `ms` / `targetSelector`——**无任何「结构化 next」字段** | `chat-events.ts:48-66`（`ChatResultEvent`） |
| C-4 | **`ChatResultVariant` 是 type-only 词汇**（∉ `KIND_SET`；`KIND_SET` 恰 40） | `chat-events.ts:32-35`；`background/messaging.ts` |

**关键事实（诊断补充，本轮复核）**：

| # | 事实 | `file:line` |
|:-:|---|---|
| F-1 | **推荐器今天必须「零新 LLM 面」**：模块头逐字「never a new LLM product（FR-CHAT-060: zero new network / privacy / cost surface）」；门禁④机核「源码不含 `fetch` / `chrome` / 时钟」 | `recommend.ts:11-12,24`；`test/recommendation-sources.test.ts:238` |
| F-2 | **推荐器真值白名单恰 7 源 + 模块白名单 5 模块**（`recommend.ts` 导入集合 ⊆ 白名单；零 `settings`/`deriveCounts`） | `recommend.ts:121-144`；`test/recommendation-sources.test.ts:109-118,354` |
| F-3 | **AI 口述的「下一步」今天只作为 `assistant` 文本落流**（`variant` 缺省 ⇒ `dispatch({type:'assistant', text})`），**不参与 chips 产出** | `sidepanel.ts:4185`（`else if (text) dispatch({ type: 'assistant', text })`） |
| F-4 | **门禁钉死现状计数**：`op-wiring.test.ts` 机核 `maybeRecommend 1/8` · `nextAfterSettle 1/10` · `requestTurn(` 恰 1；`driver-timings.test.ts` DT-4 机核 `maybeRecommend('<lit>'` **恰 8 处**、DT-2「时机源恰 5」、DT-3「旧 4 逐字」；`driver-quadruple.test.ts` DQ-1「`DRIVER_DECLS_SRC` ↔ `builtinProviders()` 双向包含」 | `test/op-wiring.test.ts:130,370`；`test/driver-timings.test.ts:10-15,87-100`；`test/driver-quadruple.test.ts:13-22` |
| F-5 | **零新增 kind / 零宿主 判据**：`KIND_SET` 恰 40；`stream-model.ts` 12 kind；`host-registry.ts` 零宿主 | `background/messaging.ts`；`test/gate-integrity.test.ts:151,169` |
| F-6 | **体积（R8 后，本轮实测）**：`dist/sidepanel.js` 基线 **598,926 B**；档位 **614,400**（距档 **15,474 B**）；绝对上限 **675,840**；生效上限 `floor(598,926×1.05)=628,872`；`authorConfirmation = pending-author-line`；冻结面 `content.js` **177,076 B** / `pick-layer.js` **34,358 B** | `test/size-baseline.ts:381,573,662`；`grep` 复核 |

### 0.3 编排指示（**原话要点，逐字保留**）

| # | 指示要点 | 本稿登记 |
|---|---|---|
| **P1** | 「**形态**：AI 在**何时**（回合结题 idle？首开 open？探测 ready？answered 后？）以**何载体**（chat 结构化字段？专用消息 kind？type-only？）产出结构化 next 候选 `{opId,label,ref?,params?}`；与既有 `chat` 载荷 / `refs` type-only 先例的关系；**零新增 kind 优先论证**」 | **核心 1** → §3 Q-ADN-002/015 + §6.2 O-ADN-002/003 |
| **P2** | 「**校验与安全（核心）**：AI 产出的 op 候选必须过**三档清分闸**——auto/confirm 档可提案、**gesture（authorize/perm.request）恒拒绝**；opId 必须在注册表在册（未知 op 拒绝）；ref 必须存在且有效；参数在 op 参数 schema 内；越界/非法一律**丢弃 + 留痕**，不得静默接受」 | **核心 2** → §3 Q-ADN-003/004/005 + §7.3（校验链） |
| **P3** | 「**确定性兜底**：注册表 chips 保留为**安全兜底与降级**（未配 LLM / AI 未产出 / AI 产出非法被拦时）；free-input 终端**恒常驻**（R8 floor 保底不回归）；AI 候选与规则候选的**合并/优先级/去重/上限**（`MAX_NEXTSTEP_CARDS_PER_ROUND=1` 与多卡渲染现状——AI 多候选如何呈现？）」 | **核心 3** → §3 Q-ADN-006/007/008 + §6.2 O-ADN-007/008 |
| **P4** | 「**护栏**：AI 候选同样过六常量（频次/同因/冷却/链深/预算）；AI 候选是否消耗回合预算；防刷屏（同因去重扩展）；关断偏好是否涵盖 AI next」 | **核心 4** → §3 Q-ADN-009 + §6.2 O-ADN-009 |
| **P5** | 「**首开（open）AI 化**：R8 的 open 入口在已配置时是否也由 AI 产初始 next（问候/能力探测建议），还是保持确定性（free-input+capability）？——**边界裁决点**」 | **核心 5** → §3 Q-ADN-010 + §6.2 O-ADN-010 |
| **P6** | 「**时机源扩展**：是否需要新增触发词（如 `idle` 复用 vs 新 `turn-done`）——优先复用，破 DT-2/DT-3 恰 5 需等价重锚论证」 | **核心 6** → §3 Q-ADN-011 + §6.2 O-ADN-011 |
| **P7** | 「**风险**：AI 候选幻觉 op（必须校验）/ 候选与在飞回合竞争（chatBusy 仲裁）/ 体积（AI 候选解析+校验在 SW or 面板——B 列优先）/ 门禁重锚（recommendation-sources / NEXTSTEP_PRIORITY / DRIVER_DECLS_SRC 双向包含 / op-wiring 计数）/ 保护段」 | **核心 7** → §3 Q-ADN-004/012/013/014 + §5.2 |
| **P8** | 「**命名**：F-36、v0.11.3、树名建议 `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（承 F-34/F-35 patch 系）；ROADMAP 登记留收口」 | §6.2 O-ADN-001 + §7.6 |
| **约束** | 「作者已授权编排器代行决策；开放点收集附推荐（spec 批量裁决）。`.sddu` 外零触碰；commit `docs(sddu): F-36 discovery …`；推送 gh 凭据形式（SSH 阻断则 `GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper='!gh auth git-credential' push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin`）+ fetch 同步」 | §0.4 D1~D8 + §0.5 |

> **口径声明（如实）**：以上**均为编排器转述的指示要点**；作者除 §0.1 的原则原话外**未**给出进一步实现约束。

### 0.4 编排器代作者决策（2026-09-26；**已为定论，本报告直接作为约束记录，不重新讨论**）

| # | 决策 | 性质 |
|---|---|---|
| D1 | **作者已授权编排器代行决策、SDDU 全流程自行调度**（discovery → spec → plan → tasks → build → review → validate 均按此口径） | 定论（作者授权） |
| D2 | **本轮 discovery 不访谈作者基本框架**：开放点**收集后附推荐项**，由 spec 阶段**批量裁决** | 定论（编排器要求） |
| D3 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-ai-driven-next/`**（承 F-34 `v55-f-scope-governance` / F-35 `v55-f-input-as-next` 的 `v55-f-` 补丁级跟进轮命名惯例） | 定论（**语义辨析见 §7.6 / O-ADN-001**） |
| D4 | **ROADMAP 编号 = F-36**；**本轮实测：`F-36` 全仓（`*.md` / `*.json` / `*.ts` / `*.mjs`，排除 `node_modules` / `.git`）0 命中**（§7.6） | 定论 + 本轮复核 |
| D5 | **版本位 = v0.11.3（patch 主题，承 F-35 的 v0.11.2）**；**本轮实测：`v0.11.3` 全仓 0 命中**（§7.6）⇒ 全新版本位（**登记留给收口**；本阶段 **ROADMAP 零 diff**） | 定论（登记留给收口） |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录；不改任何 `src/`、`test/`、`dist/`、`design/`、`docs/` 与 `ROADMAP.md`**（本轮为 discovery，**零产品运行时验证**；零受管 Provider 调用） | 定论（本轮已遵守） |
| D7 | **不上溯改写 F-35 / F-34 / F-33 / R8 / v4 / v5 产物**：全部 `validated` / `tracked` 终态与 `docs/*.json` 台账**原样保留**；本 Feature 以**并列新主题**立项；作者裁决 = **新立法＋显式取代**（§7.5 X-ADN），**不是**对旧产物的静默改写 | 定论（本轮已遵守） |
| D8 | **事务纪律**：只改 SDDU 文件；commit 文案 `docs(sddu): F-36 discovery …`；推送走 gh 凭据形式（SSH 阻断时用 `GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper='!gh auth git-credential' push <https URL>`）+ HTTPS refspec fetch 同步 tracking | 定论（本轮遵守） |

### 0.5 本阶段边界（discovery 职责声明）

- **负责**：挖掘问题、梳理问题、记录问题；输出问题清单 + 「推荐层确定性面 vs AI 面」现状映射 + AI 候选校验链问题域约束 + 三档清分闸落点 + 风险预登记 + **显式取代候选清单（X-ADN）** + 开放问题（附推荐）+ 叶拆分建议。
- **不负责**：不定义需求（不写「系统应支持 XXX」）、不分类 Must/Should/Could、不定义验收标准、不做方案评估与替代方案对比、不写 ADR、不排任务、不改代码、**不决定 AI 候选的时机 / 载体 / 校验实现 / 合并策略**（= 开放点）。
- **本轮零产品运行时验证**：未跑 `npm test` / Chromium 门禁 / 构建；所有数字均来自**带 `file:line` 的源码、已入库产物与本轮只读复核**（§0.2 / §7 逐条给出），未自造实测值。

---

## 1. 问题定义

### 1.1 一句话问题陈述

> **「next 推荐层是『一切皆 next』主线上最后一块仍由确定性代码独占产出的内容面——LLM 已能在回合内驱动工具 / 命令、能『答案后零按键自动成回合』，却唯独不能『结构化产出下一步候选』；AI 在结题时口述的下一步进不了 chips，chips 那排仍显示陈旧的确定性候选（两张皮）」** —— `recommendNextStep`（`recommend.ts:487`）是推荐产出的**唯一内核**，其候选**全部**来自确定性 provider 注册表（`candidatesRules` 遍历 `resolveOrder()`，`recommend.ts:436`）；AI 侧（`pressCandidate` / `driveAnsweredTurn`）能**按下**候选、能**发起回合**，却**没有通道「产出」候选**。回合结题点（`chat-result` `done`/`error`）是 AI 产出结构化 next 的**自然挂点**（`sidepanel.ts:4106,4178`），但该点只调 `maybeRecommend('idle')`——**又回到确定性内核**。作者的裁决把问题从「R8 首开终端是不是写死的」抬升到「**next 的产出权本该交给 AI**」：连了 LLM 则 AI 驱动，next 也不例外。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---|---|---|
| **next 产出权与「AI 驱动」原则脱钩（母问题）** | 作者已立法「有连接 LLM 则 AI 驱动」（承 F-33 v5.5 理念「主动帮用户、引导用户解决用户的问题，而不是被动接受任务」）；v5.5 已把「**谁按**下一步」移到 AI 侧（`pressCandidate` + `driveAnsweredTurn`），但「**产什么**下一步」仍是确定性注册表独占。⇒ 主线上留了**最后一块未交给 AI 的内容产出面**；`next` 的推荐内容**与 AI 的真实理解无关**（只读 7 个面板级真值源，`recommend.ts:121-129`） | 每一次回合结束，AI 明明刚刚理解了用户意图（甚至口述了 4 条有用下一步），系统却**把 AI 的话丢掉**、转而显示注册表里那条与当下无关的陈旧候选（如「用引用 1 做原地翻译」）⇒ 用户看到的是**过时且低相关的推荐**，next 层的「有用性」上限被确定性规则封死 |
| **AI 结构化产出 next 的通道缺位（根因）** | `chat-result` 载荷字段 = `variant` / `text` / `retrying` / `tool` / `ok` / `ms` / `targetSelector`（`chat-events.ts:48-66`），**无任何结构化 next 字段**；AI 口述的下一步只能落成 `assistant` 文本（`sidepanel.ts:4185`），**不进 chips**（`F-3`）。⇒ 作者的「两张皮」= **AI 说得出一件事，界面显示另一件事**，二者之间没有桥 | 每次 AI 口述下一步都**只增一条会随流滚走的纯文本**，无法沉淀为可点击的 chip；用户要么重打一遍，要么被陈旧 chip 误导 ⇒ AI 的「有用下一步」**无法兑现为一次点击** |
| **AI 候选的校验与安全边界缺位（最高危）** | AI 若被允许产出 op 候选，则**候选来源从「受控注册表」变成「LLM 自由文本」**。既有安全资产：三档清分闸（`tierOf`：`auto 5`/`confirm 2`/`gesture 2`，`op-table.ts`）、`pressDecision` 单源判定（`unknown-op`/`tier`/…，`ai-drive.ts:67-78`）、注册表在册 op（9 枚）。但**今天没有任何「AI 产出候选 → 校验」的入口**：`pressCandidate` 接收的 opId **恒由注册表提供**（标头铁律①，`ai-drive.ts:8`）。⇒ AI 幻觉一个不存在的 op、或直接提案 `op.authorize`（特权恒 gesture）、或引用一个已失效的 `ref` ⇒ 无既有闸门拦住 | 若无「在册校验 + 三档清分 + ref/param 校验 + 丢弃+留痕」链：① 幻觉 op 可能触达**特权 / 不可逆**写（授权 / 权限）；② 越界候选被静默接受 ⇒ 直接破「特权恒 gesture」「consent 不得 AI 代答」红线；③ 非法候选若走**静默丢弃** ⇒ 用户看到「点不动 / 没反应」的死端（破法七） |
| **确定性注册表的兜底位置未定（回归风险）** | R8 刚修好「首开面板零 next 死端」（floor 铸「仅含 free-input 终端」最小卡，`recommend.ts:506-517`）；free-input 终端**恒真**（`providers.ts:195` `when` 恒真）。若 AI 化让确定性产卡路径失守（未配 LLM / AI 未产出 / AI 产出非法被拦时无兜底），则 R8 成果**静默回归** ⇒ 首开 / 未配置 / AI 失败时**再次零 next 死端** | 一次 AI 往返失败（无 LLM / 超时 / 输出非法）就可能让用户**无下一步可点**，把 R8 刚建立的首屏可达性打回原形 |
| **AI 候选与规则候选的合并口径缺位** | 现状 `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（单卡，`recommend.ts:51`），`candidateRules` 按 `NEXTSTEP_PRIORITY`（恰 4）取**首个命中规则**（`recommend.ts:441-456`）；AI 若一次产出**多条**候选（作者提到的「4 条」），现有单卡 / 单规则位 / 3 chip 上限（`MAX_CHIPS_PER_CARD`）**装不下** | 多候选要么被丢弃（AI 产出白费），要么冲破单卡 / 3-chip 预算（破密度与「推荐不是列表」的立法）；无合并 / 优先级 / 去重 / 上限口径 ⇒ AI 化反而制造**溢出或刷屏** |

### 1.3 本 Feature 范围（**问题域描述，非需求**）

| # | 主题 | 性质 | 来源 | 目标态（**问题域描述**） |
|:-:|---|---|---|---|
| 核心 1 | **AI 结构化产出 next 候选（形态）** | 产出通道 + 载体 | P1 + 作者裁决 | AI 在某个**自然挂点**（候选：回合结题 `idle` / 首开 `open` / 探测 `ready` / `answered` 后）产出结构化 next 候选 `{opId,label,ref?,params?}`；载体候选 = 复用既有 `chat` 载荷的**加法字段** / 专用 **type-only** 词汇 / 专用消息 kind；**零新增 kind 优先论证**（形态 = 开放点 O-ADN-002/003） |
| 核心 2 | **AI 候选校验链（安全）** | 安全闸 | P2 | AI 产出的 op 候选**必须过**：① **三档清分闸**（`auto`/`confirm` 档可提案、**`gesture`（`op.authorize`/`op.perm.request`）恒拒绝**）；② **opId 在册**（∈ 注册表 9 op；未知 op 拒绝）；③ **ref 存在且有效**；④ **参数在 op 参数 schema 内**；⑤ 越界/非法一律**丢弃 + 留痕**（不静默接受、不死端） |
| 核心 3 | **确定性注册表退居兜底与安全闸** | 降级面 | P3 + R8 现状 | 注册表 chips 保留为**兜底与降级**（未配 LLM / AI 未产出 / AI 产出非法被拦时）；**free-input 终端恒常驻**（R8 floor 保底不回归）；AI 候选与规则候选的**合并 / 优先级 / 去重 / 上限**（`MAX_NEXTSTEP_CARDS_PER_ROUND=1` 与多卡渲染的现状——AI 多候选如何呈现 = 开放点） |
| 核心 4 | **AI 候选的护栏与预算** | 打扰控制 | P4 | AI 候选同样过**六常量**（频次 / 同因 / 冷却 / 链深 / 回合预算）；「提案」是否消耗回合预算（只有自动成回合才消耗？= 开放点）；防刷屏（同因去重扩展）；关断偏好是否涵盖 AI next（显示 vs 自动按下 = 开放点） |
| 核心 5 | **首开（open）AI 化边界** | 首屏 | P5 + R8 | R8 的 `open` 入口在已配置时是否也由 AI 产初始 next（问候 / 能力探测建议），还是保持确定性（free-input + capability-discovery）？——**边界裁决点**（避免首屏依赖 LLM 往返） |
| 核心 6 | **时机源扩展辨析** | 时机 | P6 | 是否需要新增触发词（如新 `turn-done`）还是**复用既有 `'idle'`**（= 回合结题挂点）；**优先复用**；若破 DT-2/DT-3「恰 5」⇒ 须等价重锚论证（旧 4 逐字保留 + 纯加法） |
| 附带 1 | **门禁重锚与保护段处置** | 门禁 | P7 + F-4 | `recommendation-sources`（真值白名单 7 / 模块白名单 5 / `NEXTSTEP_PRIORITY` 恰 4 / `MAX_NEXTSTEP_CARDS_PER_ROUND=1` / F-1 零新 LLM）/ `driver-timings`（DT-2 恰 5 / DT-3 旧 4 / DT-4 恰 8 调用点）/ `driver-quadruple`（DQ-1 双向包含 11↔11）/ `op-wiring`（`maybeRecommend 1/8` · `nextAfterSettle 1/10` · `requestTurn(` 恰 1）逐条重锚；保护段（若有）逐段决策 |
| 附带 2 | **体积分列预算** | 体积 | P7 + F-6 | 距档 **15,474 B**（598,926 / 614,400）；AI 候选解析 + 校验的**执行位置**（SW vs 面板——**B 列优先**，旁路 sidepanel 档位压力，见 O-ADN-012）+ 分列预算 + 缓冲校验（v5 plan 低估 2.8× 教训） |
| 附带 3 | **零新增 kind / 零宿主 / 法八不破** | 结构约束 | P1 + F-5 | 载体若复用既有 `chat` 载荷（type-only 加法字段）⇒ `KIND_SET` 40 / 12 kind / 零宿主逐字不动；AI 候选文本不得把明文写进流内 payload / digest / 审计 / DOM 四面（法八） |
| 附带 4 | **留痕 / driver 三要素扩展** | 留痕 | B-8 + P4 | AI next 候选的 driver 声明（`driver=<id> | timing=<时机> | evidence=<字段名>`）+ 非法候选的 `blocked=` / `suppressed=` 可读行（零明文） |

### 1.4 非目标（**明确排除**）

| 非目标 | 理由 |
|---|---|
| **改动 LLM 回合内的工具 / 命令驱动（thinking / command / tool 卡）** | v5.5 已建（B-1）；本 Feature 只动「**产 next 候选**」，不动「回合内驱动」 |
| **改动 `pressCandidate` / `driveAnsweredTurn` 的自动按下或自动成回合语义** | v5.5 已闭环（B-2/B-4）；本 Feature 只新增「**候选来源**」，按下 / 成回合语义 **diff=0** |
| **改动三档清分闸的档位定义（`tierOf` / `OP_TIER_TABLE`）** | 派生式单源（B-5）；本 Feature **只接入**该闸，不重新定义档位 |
| **改动护栏六常量的阈值** | 单源（B-6）；本 Feature 只**接线**（AI 候选同样过），不新增第二份阈值 |
| **改动 SW 有界队列裁决逻辑（`turn-queue.ts` 三分支）** | R6 已闭环（B-9）；本 Feature 只保证 AI 候选的「自动成回合」仍撞既有仲裁（`ai-deferred`） |
| **F-35 / F-34 / F-33 / F-32 / R8 / v4 / v5 产物改写** | D7：全部原样保留；本 Feature 为并列新主题 |
| **`src/content/**`（`content.js` 177,076 B）/ `pick-layer.js`（34,358 B）语义改动** | 字节冻结红线（零容差）；本 Feature 只动侧栏 / SW 的 next 产出与校验面 |
| **`packages/web-cli-base/**` 改动** | 硬红线：`test/insight-no-escalation.test.ts:147` 机核 `../web-cli-base` **零 diff** |
| **判定链（`security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面** | 硬底线（`docs/v3-supersession-ledger.json#zeroDiffFiles` 9 项内容哈希 pin） |
| **新增消息 kind（第 41 项）/ 新增卡 kind（第 13 种）/ 新宿主** | 零新增 kind / 零宿主纪律（F-5）；AI 候选**优先**复用既有 `chat` 载荷（type-only 加法字段，承 `ARBITRATION_RESULTS` 先例） |
| **特权 op（`op.authorize` / `op.perm.request`）的发起方式 / AI 代答 consent** | 红线：特权 op **恒 gesture**、AI 不可代答（`op-table.ts` 段注 + v5.5 红线⑥精神）；本 Feature 把「gesture 恒拒绝」列为**校验链的硬约束** |
| **法八（零明文）放宽** | `test/law8-plaintext.mjs` 必绿：AI 候选文本 / 校验留痕**不得**把明文正文写进流内 payload / digest / 审计 / DOM 四面 |
| **F-29（A2A 候选）** | 未立项未排期，**保持原样不动** |
| **安装期静态权限 / `manifest` 静态面 / 存储加密 / 会话分组收编 op** | 与本问题域无耦合（v5 `PO-ALLN-001` deferred 保持） |

---

## 2. 用户画像

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2/v3/v4/v4.5/v5/v5.5/v5.5.1 同一事实基础。**本报告不编造用户调研数据**；「用户原话」栏引用 §0.1 作者裁决逐字与代码事实。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 当前应对方式 |
|---|---|---|---|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏（`platform.deepseek.com`）：一个回合刚刚结束，AI 在结题时口述了 4 条有用的下一步 | ①（裁决，逐字）「**有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出**」；②（两张皮，编排器转述）「**LLM 结题时口述了 4 条很有用的下一步却进不了 chips**，而那一排却显示陈旧的『用引用 1 做原地翻译』」——AI 说的与 chips 显示的**互不一致** | **下一轮立法转移产出权**（不是忍受、不是手动重打）——作者用「AI 驱动」的原则一次性裁决 |
| **作者（首开 / 冷启动场景）** | R8 后首开面板：推荐卡末端出现「自由输入…」终端 | 追问「**这个推荐对吗，是不是还是写死的**」——R8 的终端**仍是确定性 provider 产出**（`free-input`），与「AI 驱动」原则**同构地冲突**（首开是否也该 AI 产初始 next = 边界裁决点） | 把首开 AI 化登记为**边界裁决点**（P5 / O-ADN-010），不擅自决断 |
| **作者（未配置 / AI 失败场景）** | 未配 LLM 的冷启动；或已配置但某回合 LLM 超时 / 输出非法 | 隐含需求：**AI 化不得让 next 层死端**（R8 刚修好首开零死端）——确定性注册表必须**仍在兜底位** | 由本 Feature 的「兜底与降级」主题承接（核心 3） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一条『AI 产出的 next』要改哪些文件？」 | 现状答案 = **无此通道**：`chat-result` 载荷无 next 字段（C-3）；`recommendNextStep` 真值白名单恰 7 源、模块白名单 5 模块、且**必须零新 LLM 面**（F-1/F-2）；`pressCandidate` 的 opId **恒由注册表提供**（`ai-drive.ts:8` 铁律①）⇒ 「AI 产 next」**无处安放**（无载体、无校验入口、无合并口径） | 服从既有形态（即**扩张被「确定性内核独占产出」这一结构锁死**）——与 v5 的 `Q-ALLN-003`（操作无可注册）、v5.5 的 `Q-SELF-015`（驱动者无可注册）同构，但层次再上一层：**本 Feature 是「推荐内容本身没有被 AI 接管」** |

---

## 3. 问题清单

> 编号空间 `Q-ADN-###`（ADN = AI-driven next）。核心 / 次要 / 潜在按「影响面 × 影响深度 × 影响频率」分级；每条标注信息来源（源码 `file:line` / 作者裁决 / 编排指示 / 假设）。

### 3.1 核心问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-ADN-001** | **母问题：next 产出权与「AI 驱动」原则脱钩。** 作者已立法「有连接 LLM 则 AI 驱动」（§0.1）；v5.5 已把「**谁按**下一步」移到 AI 侧（`pressCandidate` `ai-drive.ts:128` + `driveAnsweredTurn` `sidepanel.ts:2120`），但「**产什么**下一步」仍由确定性内核 `recommendNextStep`（`recommend.ts:487`）独占：候选**全部**来自注册表 provider（`candidateRules` `:436`），真值白名单**恰 7 源**（`:121`）、模块白名单**恰 5 模块**（`:138`）、且模块头自陈**必须零新 LLM 面**（`:11`）。⇒ 主线上留了**最后一块未交给 AI 的内容产出面**。作者原话：「**next 也应该交给 AI 去驱动输出**」。 | 全部回合结束后的推荐面；深度 = **核心阻碍**（产品语义缺口）；频率 = 每次回合结束 |
| **Q-ADN-002** | **AI 结构化产出 next 的通道缺位（根因）。** 回合结题点（`chat-result` `done` `sidepanel.ts:4168` / `error` `:4106`）是 AI 产出结构化 next 的**自然挂点**，但该点只调 `maybeRecommend('idle')`（又回确定性内核）。`chat-result` 载荷字段 = `variant`/`text`/`retrying`/`tool`/`ok`/`ms`/`targetSelector`（`chat-events.ts:48-66`），**无任何结构化 next 字段**；AI 口述的下一步只能落成 `assistant` 文本（`sidepanel.ts:4185`），**不进 chips**。⇒ 作者的「两张皮」= AI 说得出一件事、界面显示另一件事，**二者之间没有桥**。 | 全部 AI 口述下一步；深度 = **核心阻碍**（AI 的有用输出无法兑现为点击）；频率 = 每次 AI 口述下一步 |
| **Q-ADN-003** | **AI 候选必须过三档清分闸（安全，最高危）。** 若 AI 可产出 op 候选，候选来源即从「受控注册表」变为「LLM 自由文本」。既有安全资产：`tierOf`（`op-table.ts`；`auto 5`/`confirm 2`/`gesture 2`，特权恒 gesture）、`pressDecision` 单源判定（`ai-drive.ts:67-78`：`unknown-op`/`tier`/`driver-class`/`unconfigured`/`busy`/`not-armed`/`guard`）。但 `pressCandidate` 接收的 opId **恒由注册表提供**（铁律①，`ai-drive.ts:8`）⇒ **今天没有任何「AI 产出候选 → 三档校验」入口**。⇒ `gesture` 档（`op.authorize`/`op.perm.request`）**必须恒拒绝**；`auto`/`confirm` 档可提案（`confirm` 的 consent 仍须用户答）。 | 全部 AI 候选；深度 = **核心阻碍**（安全红线）；频率 = 每次 AI 提案 |
| **Q-ADN-004** | **AI 候选的合法性校验缺位（幻觉 op / ref / param）。** AI 可能产出：① **幻觉 opId**（不存在于注册表 9 op）；② **越界 ref**（不存在 / 已失效的引用）；③ **越界 param**（不在 op 参数 schema，如 `op.describe` 的 value）。既有：注册表在册 op（`op-table.ts` `OP_DESCRIPTORS` 9 枚）、`tierOfId`（未知 op ⇒ `undefined` 的 loud 情形）、`l1/ref-store.ts`（ref 有效性）、op 的 `params: AskSpec`（`definition.ts:101-104`）。但这些校验**今天只服务确定性候选**（opId 恒已注册）。⇒ AI 候选**必须**逐项校验，否则幻觉 op 可能触达特权 / 不可逆面。 | 全部 AI 候选；深度 = **核心阻碍**（幻觉风险）；频率 = 每次 AI 提案 |
| **Q-ADN-005** | **越界 / 非法候选的「丢弃 + 留痕」口径缺位。** 既有纪律：拒绝**不是死端**——`pressCandidate` 被拒时写一行 `blocked=`（`ai-drive.ts:138`），`guard` 越限写 `suppressed=<reason>`（`driverSuppressedLine` `:112`），「被抑制」与「没反应」**必须可判**（`guard.ts:6`）。⇒ 非法 AI 候选**不得静默接受**（安全），也**不得静默丢弃**（死端 / 不可判）——必须**丢弃 + 可读留痕**（零明文）。今天无此口径（无 AI 候选入口）。 | 全部非法 AI 候选；深度 = **高**（安全 + 法七无死端）；频率 = 每次非法提案 |
| **Q-ADN-006** | **确定性注册表的兜底位置未定（R8 回归风险）。** R8 刚修好「首开面板零 next 死端」（floor 铸「仅含 `free-input` 终端」最小卡，`recommend.ts:506-517`；`free-input` `when` 恒真 `providers.ts:195`）。若 AI 化让确定性产卡路径失守（未配 LLM / AI 未产出 / AI 产出非法被拦时无兜底），⇒ R8 成果**静默回归**，首开 / 未配置 / AI 失败时**再次零 next 死端**。 | 未配置 / AI 失败 / AI 无产出场景；深度 = **高**（回归 R8）；频率 = 每次 AI 往返失败 |
| **Q-ADN-007** | **free-input 终端恒常驻不回归。** R8 后首开必有终端（`maybeRecommendOpenEntry` `sidepanel.ts:2279`）；终端**恒最末**且**不是** `.next-chip`（在飞不被禁用、不进 `MAX_CHIPS_PER_CARD`，`cards/nextstep.ts`）。⇒ AI 化改推荐产出后，终端**必须**继续恒常驻（保底输入面，F-35 成果）。 | 全部推荐卡；深度 = **高**（回归 F-35/R8）；频率 = 每张推荐卡 |
| **Q-ADN-008** | **AI 候选与规则候选的合并 / 优先级 / 去重 / 上限缺位。** 现状 `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（单卡 `recommend.ts:51`），`candidateRules` 按 `NEXTSTEP_PRIORITY`（恰 4）取**首个命中规则**（`:441-456`），`MAX_CHIPS_PER_CARD = 3`。AI 若一次产出**多条**候选（作者提到的「4 条」），现有单卡 / 单规则位 / 3-chip 预算**装不下**。⇒ 无合并口径 ⇒ AI 化反而制造**溢出或刷屏**（破「推荐不是列表」立法）。 | 多候选 AI 产出；深度 = **高**（决定 AI 候选如何呈现）；频率 = 每次 AI 多候选 |
| **Q-ADN-009** | **AI 候选的护栏 / 预算口径未定。** 六常量（`guard.ts:18-34`）今天管「AI **主动回合**」（`noteProactive` 只在成功按下后记账 `:51`）。AI **候选产出**（提案）是否算「主动发起」？是否消耗回合预算（`AI_TURN_BUDGET_PER_SESSION=8`）？「提案」与「自动成回合」的成本口径不同（提案本身可能零额外 LLM 调用——复用刚结束回合的输出，见 O-ADN-009 推荐）。关断偏好 `web-cli:proactive`（`guard.ts:32`）是否涵盖 AI next 的**显示**（vs 只涵盖自动按下）？ | 全部 AI 候选；深度 = **中高**（成本 / 打扰）；频率 = 每次提案 |
| **Q-ADN-010** | **首开（open）AI 化边界未决。** R8 的 `open` 入口（`maybeRecommendOpenEntry` `sidepanel.ts:2279`）在 `authorized ∧ configured` 时复用 `'idle'` 求值一次。⇒ 已配置的首开是否也由 AI 产初始 next（问候 / 能力探测建议）？还是保持确定性（free-input + capability-discovery）？**边界裁决点**——若首屏依赖 LLM 往返，则首屏可达性受网络 / 延迟影响（与 R8「首屏必有入口」张力）。 | 首开面板；深度 = **中高**（首屏体验 vs 可达性）；频率 = 每次首开 |
| **Q-ADN-011** | **时机源扩展辨析（复用 vs 新增）。** DT-2/DT-3 机核「时机源**恰 5**」（`driver-timings.test.ts:87-100`）、DT-4 机核「`maybeRecommend('<lit>'` **恰 8 处**」。若 AI next 需要新触发词（如 `turn-done`）⇒ 破「恰 5」⇒ 须**等价重锚**（旧 4 逐字保留 + 纯加法）论证；**优先复用既有 `'idle'`**（= 回合结题挂点，R8 已先例）。 | 时机面；深度 = **中高**（决定门禁重锚量）；频率 = 一次性 |
| **Q-ADN-012** | **AI 候选与在飞回合竞争（仲裁）。** `pressCandidate` 撞车返回 `blocked:busy`（`ai-drive.ts:74`）；SW 有界队列 `ARBITRATION_RESULTS` 含 `ai-deferred`（AI 路径不排队，`chat-events.ts:45`）；`recommendNextStep` 对 `pending` ⇒ 不产卡（`recommend.ts:488`）。⇒ AI 候选的**产出**与**自动成回合**在「在飞」时如何让步（产出是否可显示 / 是否延后）需明确，避免与既有仲裁冲突。 | 在飞时 AI 候选；深度 = **中高**（并发正确性）；频率 = 每次在飞时结题 |
| **Q-ADN-013** | **体积压力 + 校验执行位置未定。** 距档仅 **15,474 B**（`size-baseline.ts:381` 基线 598,926；档位 614,400；生效上限 628,872）。AI 候选的**解析 + 校验**放 **SW** 还是**面板**：放面板 ⇒ 挤压 sidepanel 档位；放 SW（**B 列优先**，`background.js` 无 sidepanel 档位约束，且 SW 已持有 `op-table` 镜像 + LLM 输出）⇒ 旁路档位压力。分列预算 + 缓冲校验必须先出（v5 plan 低估 2.8× 教训）。 | 体积门禁；深度 = **中高**（必须先预算）；频率 = 每轮 |
| **Q-ADN-014** | **门禁只增不减 vs 产出面转移的张力（判据重锚纪律）。** 大量断言钉了「确定性内核独占产出」的现状：`recommendation-sources`（真值 7 / 模块 5 / `NEXTSTEP_PRIORITY` 恰 4 / 单卡 / **零新 LLM** `:238`）、`driver-timings`（DT-2 恰 5 / DT-4 恰 8）、`driver-quadruple`（DQ-1 双向包含 11↔11）、`op-wiring`（`maybeRecommend 1/8` / `nextAfterSettle 1/10` / `requestTurn(` 恰 1）。⇒ 必须**逐条重锚**（等价或更强）或**显式取代 + 台账**，**不得静默删除**。 | 全部门禁；深度 = **高**（决定本 Feature 是否"静默降强度"）；频率 = 一次性 |

### 3.2 次要问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-ADN-015** | **AI 候选载体的「零新增 kind」论证。** 载体 = ① 复用既有 `chat` 载荷的**加法字段**（承 `ARBITRATION_RESULTS` type-only 先例，`chat-events.ts:32-35`）；② 专用 **type-only** 词汇（∉ `KIND_SET`）；③ 专用消息 kind（⇒ `KIND_SET` 40→41，需显式取代）。⇒ **零新增 kind 优先论证**（P1）；`KIND_SET` 40 / 12 kind / 零宿主逐字不动为优选。 | 消息协议；深度 = 中高；频率 = 一次性 |
| **Q-ADN-016** | **AI 候选文本的法八（零明文）口径。** AI 候选的 `label` / `ref` / `params` 若含用户正文 / 页面明文 ⇒ 直接撞法八四面（payload / digest / 审计 / DOM）。既有先例：`driverTraceLine` **只含字段名不含值**（`ai-drive.ts:83-87`）；留痕只写字段名（`ai-drive.ts:85`）。⇒ 候选文本必须**只走既有 chat user / assistant 载荷**，固化 / 摘要 / 留痕**不回显值**。 | 安全；深度 = 中；频率 = 每次候选 |
| **Q-ADN-017** | **AI 候选的留痕与 driver 声明扩展。** `driver=<id> | timing=<时机> | evidence=<字段名>`（`ai-drive.ts:85`）；`DRIVER_DECLS_SRC` 是**手写第二源**，与 provider 集合**双向包含**（DQ-1）。⇒ 若新增「AI next」provider / 驱动者，须**同步登记声明行**（`evidence` 与 `when` 实读面同源，DQ-3），否则 DQ-1/DQ-3 必红。 | 留痕 / 门禁；深度 = 中；频率 = 一次性 |
| **Q-ADN-018** | **`recommendation-sources` 真值白名单 vs AI 候选注入。** 该门禁机核 `recommend.ts` **导入集合 ⊆ 5 模块**（`:109-118`）且**不含 `fetch`/`chrome`/时钟**（`:238`）。⇒ AI 候选**不应**让 `recommend.ts` 自己调 LLM（否则破 F-1/F-2）；干净路径 = 候选**由外部解析后经 `RecommendInput` 注入**（`recommend.ts` 保持 pure，真值白名单可保持）。⇒ 本 Feature **可能不需要**取代 FR-CHAT-060「零新 LLM」（因未新增 LLM 调用，只是复用刚结束回合的输出）——**这是关键辨析，登记为 O-ADN-016**。 | 门禁 / 立法；深度 = 中高；频率 = 一次性 |
| **Q-ADN-019** | **首装引导 / `firstRun` 与 AI next 的让位关系。** R8 已定「让位 firstRun（零双卡）」：`firstRunCard.visible === !(configured ∧ authorized)`（`sidepanel.ts:2282-2283`）。⇒ AI next 进入首开后，须与 `firstRun` 入口的让位语义继续一致（不同时铸两卡）。 | 首装；深度 = 中；频率 = 每次首装 |

### 3.3 潜在问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-ADN-020** | **法一 / 法七 / 法九一致性。** 法一「一切交互皆消息」（AI 候选若走新 kind 则动法一载体）；法七「禁止死端」（非法候选丢弃必须有可达 next）；法九「范围读数」（AI 候选若引用范围 / 引用越界需读数）。⇒ 三者须逐条对齐（承 F-34/F-35 判据）。 | 立法；深度 = 中；频率 = 一次性 |
| **Q-ADN-021** | **`chatBusy` / `pending` 的候选显示口径。** 在飞时 `recommendNextStep` 不产卡（`pending` `recommend.ts:488`）；AI 候选若在在飞时产出，是否缓存 / 丢弃 / 延后？承 TA-8（在飞终端不被硬禁用）。 | 并发 / 显示；深度 = 中；频率 = 每次在飞 |
| **Q-ADN-022** | **AI 候选的确定性可复现性 / 门禁可判性。** LLM 输出不确定 ⇒ 门禁无法直接断言「AI 产出某候选」。⇒ 判据须落在**纯函数校验器**（opId 在册 / 三档 / ref / param）+ 注入式反证（承 F-35「自研行为级 16/16」+ forgery 反证先例），而非断言 LLM 输出本身。 | 门禁可测性；深度 = 中；频率 = 一次性 |
| **Q-ADN-023** | **环境性 flake 家族被误读为回归（`KL-N-10`）。** v55 / F-34 / F-35 均登记 `binding` CDP / `page-input` 陈旧 fixture / `recommendation` ④ 相位 等**环境性 flake**；本 Feature 触 `recommendation` / `s0-self-driven` / `binding` 面较深 ⇒ 重构轮须隔离复跑 ≥2、不伪称首跑绿。 | 门禁执行；深度 = 低—中；频率 = 每轮 |
| **Q-ADN-024** | **外部竞品调研未执行（如实登记）。** 未做外部对标（如「AI 助手如何把 LLM 的下一步建议变成可点击 chip」「AI 候选与规则候选的合并 / 去重策略」）。 | 参照面；深度 = 低；频率 = 一次性 |

---

## 4. 竞品参考

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

**未做**外部竞品调研。v5.5 / F-34 / F-35 段亦未新增外部对标（`O-SELF-007` / `O-SGO-009` / `O-IAN-010`）。

> **不得**据此声称「竞品也这么做」或「无竞品这么做」。若 spec/plan 认为需要外部参照，应显式登记为待调研项（**O-ADN-015**）。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

> 本节只记录「本仓库已存在、已验收、可复用」的机制先例——它们是**事实**，不是推荐方案。

| 参照 | 事实 | 与本题域的关系（只述差异，不评优劣） |
|---|---|---|
| **`type-only` 词汇先例（零新增 kind）** | `ARBITRATION_RESULTS`（`executed`/`queued`/`busy-rejected`/`ai-deferred`）是 **type-only 词汇**：∉ `KIND_SET`，两面板可见项骑**既有 `chat-result` kind** 作 `variant` 值（**payload 字段，非消息 kind**）（`chat-events.ts:26-46`；`turn-arbitration.test.ts` 机核 `KIND_SET` 40） | 「AI 候选」可作为**既有 `chat` 载荷的加法字段**（零新增 kind 先例）；差异：`ARBITRATION_RESULTS` 描述**仲裁结果**，不描述**推荐内容** |
| **AI 回合内驱动先例** | v5.5 已让 AI 在回合内驱动命令 / 工具（thinking / command / tool 卡；`service-worker.ts` `runChatTurn` + `chat-events.ts:80-102`） | 「AI 产出」的机制**已存在**（回合内）；差异：AI 仍**不能产出「回合之后的下一步」**（候选产出面缺位） |
| **AI 自动按下 / 自动成回合先例** | `pressCandidate`（`ai-drive.ts:128`）+ `driveAnsweredTurn`（`sidepanel.ts:2120`）经**既有 `op.turn` 槽**抛回合（`requestTurn(` 调用点不增） | 「AI 决定**按哪个**」已立法（v5.5）；差异：「AI 决定**产哪个**」缺位——本 Feature 正好补这一格 |
| **三档清分闸（已存在，待接入）** | `tierOf`（`op-table.ts`：`layer==='sw'` ⇒ `gesture`；`hasConsent` ⇒ `confirm`；否则 `auto`）+ `OP_TIER_TABLE` 物化 + `test/op-three-tier.test.ts` | AI 候选校验的**第一道闸已就位**（派生式，改 `consent`/`layer` ⇒ 清分同步变）；差异：今天只服务 `pressDecision`，未接「候选产出」 |
| **`pressDecision` 单源判定（已存在，待复用）** | `unknown-op`/`tier`/`driver-class`/`unconfigured`/`busy`/`not-armed`/`guard`（`ai-drive.ts:67-78`） | 校验判据的**单源**已就位（零第二阈值）；差异：其输入 opId 今天**恒由注册表提供**（铁律①），未接 AI 自由文本 |
| **留痕可判先例（零明文）** | `driverTraceLine`（只含**字段名**，`ai-drive.ts:85`）+ `driverSuppressedLine`（`suppressed=<reason>` `:112`）+ `blocked=<reason>`（`:138`） | 「非法候选丢弃」可复用**同一留痕形态**（零明文 + 可判）；差异：需为「候选校验失败」新增 `blocked=` 子类 |
| **零死端 floor 先例（R8）** | 无候选 ⇒ 铸「仅含 `free-input` 终端」最小卡；首开入口复用 `'idle'`（`recommend.ts:506-517`；`sidepanel.ts:2279`；`r8-open-next-entry.test.ts`） | 兜底面**已有底座**（AI 无产出 / 非法被拦时可退）；差异：floor 今天只在「无规则候选」触发，AI 化后须与 AI 候选共存 |
| **纯内核 + 外部注入先例** | `recommendNextStep(input)` 是 pure（无 DOM / 时钟 / IO / chrome，`recommend.ts:28-32`）；输入是 plain data record | AI 候选可**经 `RecommendInput` 注入**，`recommend.ts` 保持 pure（**这是 FR-CHAT-060 可保持的关键**）；差异：`RecommendInput` 今天是 7 源 + 4 辅助字段，无「AI 候选」槽 |
| **保护段显式取代先例** | `insight-tree-hierarchy.test.ts:527,656`（journey 保护段显式取代，走台账 + 等价断言 + 强度不降）；F-35 已发生**第四次**取代（journey 八步） | 若本 Feature 触及保护段 ⇒ **先例已立**，按同一纪律执行（**事实，非承诺**） |
| **零新增 kind / 零宿主 机核** | `KIND_SET` 40 逐字；`stream-model.ts` 12 kind；`host-registry.ts` 零宿主判据 | AI 候选若复用 `chat` 载荷，则 `KIND_SET` / 12 kind / 零宿主**逐字不动**（**事实，非承诺**） |
| **门禁注入反证先例** | `driver-timings`（DT-1~6 逐条 `expectFailPattern` + 反证实跑）· `driver-quadruple`（DQ-1~6 三类注入反证）· `free-input-next`（FIN-0~9 逐条 + forgery）· `law4-input-as-next`（L4-1~7 + 三段控制） | AI 候选校验**可机核**的形态已有先例（纯函数校验器 + 注入反证）；差异：校验器是**新增**（今日无 AI 候选） |

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---|---|
| **A-ADN-001** | `recommendNextStep` 是推荐产出的**唯一**内核（除它以外无第二产出路径） | 已证：`maybeRecommend`（`sidepanel.ts:2007`）是唯一调用点封装；DT-5 机核「`recommendNextStep(` 在 `sidepanel.ts` 恰 1 个调用点」（`driver-timings.test.ts:160-170`）——**已证** |
| **A-ADN-002** | `chat-result` 载荷**今天无任何结构化 next 字段**（AI 口述下一步只能落 `assistant` 文本） | 已证：`ChatResultEvent`（`chat-events.ts:48-66`）字段穷举；`sidepanel.ts:4185` `else if (text) dispatch({type:'assistant',…})`——**已证** |
| **A-ADN-003** | AI 可在**回合结题点**被喂入结构化候选（该点已有 `maybeRecommend('idle')` 挂点） | 部分已证：`done` `sidepanel.ts:4168` / `error` `:4106` 已有挂点；**LLM 输出能否结构化**（即 SW 是否可解析 LLM 的结构化 next）**待验证**（取决于 LLM 提示 / 解析设计 = 开放点） |
| **A-ADN-004** | 三档清分闸（`tierOf`）与 `pressDecision` 单源判定**可直接复用**于 AI 候选校验 | 已证：`tierOf` 是纯函数（`op-table.ts`）；`pressDecision` 是纯函数（`ai-drive.ts:67`）；`opDescriptor` / `tierOfId` 可独立调用——**已证**（接入形态待 spec 裁决） |
| **A-ADN-005** | 注册表在册 op（9 枚）+ ref 有效性 + op param schema 足以校验一个候选 | 已证：`OP_DESCRIPTORS` 9（`op-table.ts`）；`ref-store`（`l1/ref-store.ts`）；`params: AskSpec`（`definition.ts:101-104`）——**已证**（校验器形态待 spec） |
| **A-ADN-006** | 确定性注册表可**保持为兜底**而不与 AI 候选冲突（两者可同台竞争同一单卡位） | 待验证：需 spec 明确合并 / 优先级 / 去重 / 上限（Q-ADN-008）；**实现面待验证** |
| **A-ADN-007** | free-input 终端**恒常驻**可保持（AI 化不回归 R8） | 部分已证：`free-input` `when` 恒真（`providers.ts:195`）；floor 逻辑（`recommend.ts:506`）——**已证（静态）**；AI 化后的接线待验证 |
| **A-ADN-008** | AI 候选可**不让 `recommend.ts` 自己调 LLM**（候选外部解析后注入），从而保持 FR-CHAT-060「零新 LLM」与真值白名单 7 | 部分已证：`recommendNextStep(input)` 是 pure，输入是 plain record（`recommend.ts:28-32,217-249`）——**注入面已证**；**注入槽形态待 spec**（O-ADN-016） |
| **A-ADN-009** | 复用既有 `'idle'` 时机**不需要**新增触发词（不破 DT-2/DT-3 恰 5） | 已证：R8 已用 `maybeRecommend('idle')` 复用既有时机（`sidepanel.ts:2285`；`r8-open-next-entry.test.ts` R8-2）——**先例已证** |
| **A-ADN-010** | 冻结面可保持零触碰（`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 / base 零 diff） | 复跑构建 + sha 逐字节核对——**待验证**（本轮零产品运行时验证） |
| **A-ADN-011** | 本轮 `.sddu/**` 只写本 Feature 目录，且 `src/` `test/` `dist/` `design/` `docs/` `ROADMAP.md` 零改动 | `git status --short` 复核（**本轮已遵守**） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 | 预登记证据 / 应对方向（**不作方案承诺**） |
|---|---------|:--:|---|
| **R-ADN-001** | **AI 候选幻觉 op / 越界 ref / 越界 param 触达特权 / 不可逆面（最高危）**：AI 自由文本若不经在册 + 三档校验，可能提案 `op.authorize` / 不存在的 op / 失效 ref | **高** | `op-table.ts`（`tierOf`：特权恒 gesture）+ `ai-drive.ts:8`（铁律①：候选恒由注册表产出）+ `op-three-tier.test.ts` + 红线⑥精神（consent 不代答）。**方向**：校验链**必须先于**任何候选接受；`gesture` 恒拒绝；纯函数校验器 + 注入反证必红 |
| **R-ADN-002** | **非法候选「静默接受」**（安全）或**「静默丢弃」**（死端 / 不可判） | **高** | `ai-drive.ts:138`（`blocked=` 留痕）+ `driverSuppressedLine`（`suppressed=`）+ `guard.ts:6`（抑制必须可判）+ 法七无死端。**方向**：丢弃 + 可读留痕（零明文）+ 兜底 next 仍可达 |
| **R-ADN-003** | **确定性兜底失守 ⇒ R8 零死端回归**：未配 LLM / AI 未产出 / 非法被拦时无卡可点 | **高** | `recommend.ts:506-517`（floor）+ `providers.ts:195`（终端恒真）+ `sidepanel.ts:2279`（首开入口）+ `r8-open-next-entry.test.ts`。**方向**：AI 化后确定性路径**必须**仍可达；未配 LLM ⇒ 纯确定性（现状不变） |
| **R-ADN-004** | **门禁静默降强度**：`recommendation-sources`（零新 LLM / 真值 7 / 单卡）/ `driver-timings`（DT-2 恰 5 / DT-4 恰 8）/ `driver-quadruple`（DQ-1 双向包含 11↔11）/ `op-wiring`（计数）被静默改动或删除 | **高** | `recommendation-sources.test.ts:109-118,136,139,238` + `driver-timings.test.ts:87-100` + `driver-quadruple.test.ts:13-22` + `op-wiring.test.ts:130,370` + 保护段纪律。**方向**：先出「逐条重锚清单」再动面；每条 deleted 断言必须有 old→new 映射 + 强度不降证明 |
| **R-ADN-005** | **AI 多候选溢出（单卡 / 3-chip 预算被破）** | **中高** | `recommend.ts:51,54`（`MAX_NEXTSTEP_CARDS_PER_ROUND=1` / `MAX_CHIPS_PER_CARD=3`）+ 「推荐不是列表」立法 + 密度门禁。**方向**：合并 / 优先级 / 去重 / 上限口径先定（O-ADN-008） |
| **R-ADN-006** | **体积越档位**：距档仅 **15,474 B**（598,926 / 614,400）；解析 + 校验位置影响 sidepanel 增量 | **中高** | `size-baseline.ts:381`（基线 598,926）+ 生效上限 628,872 + 档位 614,400 / 绝对 675,840 + `authorConfirmation=pending-author-line`。**方向**：**B 列优先**（解析 + 校验置 SW，旁路 sidepanel 档位）+ spec 先出分列预算；升档须作者一行 |
| **R-ADN-007** | **护栏阈值被新增第二份**（AI 候选**提案**与**自动回合**成本口径混用） | **中高** | `guard.ts:18-34`（六常量单源）+ `ai-drive.ts:16-18`（`guardAllowed` / `busy` 是**注入判据**，本模块零第二阈值）。**方向**：提案与回合成本分列；零第二阈值 |
| **R-ADN-008** | **`KIND_SET` 40 / 12 kind / 零宿主被撞**（若用新 kind 作载体） | **高** | `messaging.ts` `KIND_SET` 40 + `stream-model.ts` 12 kind + `host-registry.ts` 零宿主 + `turn-arbitration.test.ts`。**方向**：复用既有 `chat` 载荷（type-only 加法字段）；零新增 kind 优先论证 |
| **R-ADN-009** | **法八（零明文）被 AI 候选文本撞破** | **中高** | `law8-plaintext.mjs`（60 断言）+ `ai-drive.ts:85`（留痕只含字段名）+ `askuser.ts`（固化只写 FACT）。**方向**：候选文本仅走既有载荷；校验 / 摘要 / 留痕不回显值 |
| **R-ADN-010** | **首屏依赖 LLM 往返 ⇒ 首开体验 / 可达性受网络影响**（若 open AI 化） | **中** | `sidepanel.ts:2279-2286`（首开入口）+ R8「首屏必有入口」+ 离线 / 超时场景。**方向**：首开保持确定性兜底（O-ADN-010） |
| **R-ADN-011** | **在飞时 AI 候选与既有仲裁冲突**（产出 vs 自动成回合） | **中** | `ai-drive.ts:74`（`blocked:busy`）+ `chat-events.ts:45`（`ai-deferred`）+ `recommend.ts:488`（`pending` 不产卡）。**方向**：产出与按下的让步口径分立 |
| **R-ADN-012** | **门禁无法断言不确定的 LLM 输出** | **中** | 承 F-35「自研行为级 16/16」+ forgery 反证 + DT/DQ 注入反证先例。**方向**：判据落在**纯函数校验器** + 注入式反证，勿断言 LLM 输出本身 |
| **R-ADN-013** | **环境性 flake 被误读为回归（`KL-N-10`）** | **低—中** | v55 closeout §8 / F-34 / F-35 validate（`binding` CDP / `page-input` / `recommendation` ④ 相位）。**方向**：隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞 |
| **R-ADN-014** | **方案先行**：开放点在 spec 前被顺手定下（如先选时机 / 载体 / 校验位置） | **中高** | 本报告 §6.2 已把时机 / 载体 / 校验 / 合并 / 首开 / 体积位置全部登记为 O-ADN-\*；**方向**：spec 阶段批量裁决，discovery 零预设 |

---

## 6. 下一步建议

### 6.1 优先聚焦（移交 spec 的问题）

| 优先级 | 事项 | 说明 |
|:--:|---|---|
| **高** | **Q-ADN-003/004/005 AI 候选校验链（三档清分闸 + 在册 + ref/param + 丢弃+留痕）** | 本 Feature 的**安全核心**；校验链定了才谈候选接受（形态 = O-ADN-004/005/006） |
| **高** | **Q-ADN-002 AI 结构化产出 next 的时机与载体**（O-ADN-002/003） | 本 Feature 的**新通道**；载体决定零新增 kind 是否成立，时机决定门禁重锚量 |
| **高** | **Q-ADN-006/007 确定性兜底 + free-input 恒常驻**（O-ADN-007） | R8 回归风险；未配 / AI 失败时必须有卡可点 |
| **高** | **Q-ADN-014 门禁重锚清单**（O-ADN-014） | 决定本 Feature 是否静默降强度；**先出清单再动面** |
| **中高** | **Q-ADN-008/009 合并 / 优先级 / 去重 / 上限 + 护栏与预算**（O-ADN-008/009） | 决定 AI 多候选如何呈现与是否刷屏 / 越预算 |
| **中高** | **Q-ADN-010 首开 AI 化边界**（O-ADN-010） | 首屏体验 vs 可达性；**边界裁决点** |
| **中高** | **Q-ADN-013 体积 + 校验执行位置**（O-ADN-012） | 距档 15,474 B；**B 列优先** + 先预算（v5 低估 2.8× 教训） |
| **中** | **Q-ADN-011 时机源复用 vs 新增**（O-ADN-011） | 优先复用 `'idle'`；破 DT-2/DT-3 须等价重锚 |
| **中** | **Q-ADN-015/016/017 载体零新增 kind / 法八 / 留痕扩展** | 随通道与判据一并裁决 |
| **中** | **Q-ADN-012/021 在飞仲裁与候选让步** | 与既有 `chatBusy` / `ai-deferred` 一致 |
| **低** | **Q-ADN-018/020 法一/法七/法九 + FR-CHAT-060 辨析** | 由 spec 在通道与判据一并裁决（O-ADN-016） |

### 6.2 开放问题（**收集后附推荐；由 spec 批量裁决**）

| ID | 开放点 | 推荐（discovery 建议，非定论） |
|---|---|---|
| **O-ADN-001** | **命名与版本位**：树名 / Feature ID / 版本位 | **推荐接受编排器建议**：树名 `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（承 F-34/F-35 `v55-f-` 补丁级跟进轮惯例）、Feature ID `F-36`、版本位 `v0.11.3`（v0.11.0（F-33）主题的 patch 级跟进轮）；ROADMAP 登记**留给收口**（本阶段零 diff） |
| **O-ADN-002** | **AI 产出 next 的时机**：回合结题 `idle`？首开 `open`？探测 `ready`？`answered` 后？ | **推荐**：**复用既有 `'idle'`**（= 回合结题挂点，`sidepanel.ts:4168/4106`；R8 已先例）作为**首选挂点**；首开 **保持确定性**（见 O-ADN-010） |
| **O-ADN-003** | **AI 产出 next 的载体**：既有 `chat` 载荷加法字段？专用 type-only？专用消息 kind？ | **推荐**：**复用既有 `chat` 载荷的加法字段**（承 `ARBITRATION_RESULTS` type-only 先例，`chat-events.ts:26-46`）；**零新增 kind**（`KIND_SET` 40 不动）；候选 `{opId,label,ref?,params?}` 为 payload 字段而非消息 kind |
| **O-ADN-004** | **AI 候选 opId 校验** | **推荐**：opId **必须 ∈ 注册表 9 op**（`OP_DESCRIPTORS` / `OPS_BY_ID`）；**未知 op ⇒ 拒绝 + 留痕**（复用 `unknown-op` 词表，`ai-drive.ts:42`） |
| **O-ADN-005** | **AI 候选三档清分** | **推荐**：复用 `tierOf`（`op-table.ts`）单源——`auto` 档可提案（AI 可自动按下）；`confirm` 档可提案（**consent 仍须用户答**，AI 不可代答）；**`gesture`（`op.authorize`/`op.perm.request`）恒拒绝**（复用 `blocked:tier`，`ai-drive.ts:70`） |
| **O-ADN-006** | **AI 候选 ref / param 校验** | **推荐**：`ref` 必须**存在且有效**（`l1/ref-store.ts`）；`param` 必须在 op 参数 schema（`AskSpec`）内；越界 ⇒ **拒绝 + 留痕** |
| **O-ADN-007** | **确定性兜底边界** | **推荐**：未配 LLM ⇒ **纯确定性（现状不变）**；已配置但 **AI 未产出 / 产出非法被拦 ⇒ 确定性注册表兜底**；**free-input 终端恒常驻**（floor 保底不回归） |
| **O-ADN-008** | **AI 候选与规则候选的合并 / 优先级 / 去重 / 上限** | **推荐**：AI 候选与规则候选**同台竞争同一单卡位**（走既有 `MAX_NEXTSTEP_CARDS_PER_ROUND=1` 语义）；多候选按 AI 给出的顺序取前 N（N 由 spec 与 `MAX_CHIPS_PER_CARD` 共同裁决，保守 ≤3）；扩展 R6 同因去重（`refActionDigest` 家系）覆盖 AI 候选；**不破单卡 / 3-chip 预算**（若确需多卡 ⇒ 显式取代 X-ADN-3 + 密度重锚） |
| **O-ADN-009** | **AI 候选的护栏与预算** | **推荐**：AI 候选**同样过六常量**（频次 / 同因 / 冷却 / 链深 / 预算，复用 `guard.ts` 单源）；**「提案」不消耗回合预算**（提案本身不新增 LLM 调用，复用刚结束回合的输出）——**只有自动成回合才消耗**（`noteProactive` 语义不变）；关断偏好 `web-cli:proactive` 涵盖 AI 候选的**显示与自动按下**（一处偏好） |
| **O-ADN-010** | **首开（open）AI 化** | **推荐**：**首开保持确定性**（`free-input` + `capability-discovery`；R8 已建），**不在首屏依赖 LLM 往返**（可达性优先）；AI 初始 next 可作后续轮增强（若做，须保留确定性兜底 + 超时降级） |
| **O-ADN-011** | **时机源** | **推荐**：**复用既有 `'idle'`**，**不新增 `turn-done`**（DT-2/DT-3 恰 5 不动）；若 spec 认为语义确需新词 ⇒ 显式取代 X-ADN-5 + 旧 4 逐字 + 纯加法等价重锚 |
| **O-ADN-012** | **AI 候选解析 + 校验的执行位置** | **推荐**：**B 列优先 —— 置 SW（`background`）侧**（SW 已持有 `op-table` 镜像 + LLM 输出；旁路 sidepanel 档位压力，距档仅 15,474 B）；面板只接收**已校验**的候选并渲染；校验判定**单源**仍复用 `op-table`（双面镜像，承 `sw-op-mirror` 先例） |
| **O-ADN-013** | **AI 候选留痕** | **推荐**：复用 `driver=<id> | timing=<时机> | evidence=<字段名>` 三要素 + `blocked=` / `suppressed=` 可读行；AI next 候选驱动者 id **显式声明**并入 `DRIVER_DECLS_SRC`（DQ-1/DQ-3 同步）；**零明文** |
| **O-ADN-014** | **门禁处置** | **推荐**：先出**逐条重锚清单**（`recommendation-sources` / `driver-timings` / `driver-quadruple` / `op-wiring` / `gate-integrity`）；新增 **1 枚 node 门禁**（如 `ai-driven-next`：校验器纯函数 + 注入反证 + 真源切片）；`CHROMIUM_GATES === 9` 不动；保护段逐段决策（先例已立）；每条 `assertionsRemoved=0` |
| **O-ADN-015** | **是否外部竞品调研** | **推荐**：**不需要**（与 v5.5 / F-34 / F-35 一致） |
| **O-ADN-016** | **FR-CHAT-060「零新 LLM」是否被破** | **推荐**：**不破**——AI 候选**复用刚结束回合的 LLM 输出**（非新增 LLM 调用），且**经 `RecommendInput` 注入** `recommendNextStep`（保持 pure + 真值白名单 7）；故 `recommendation-sources` ④「零新增网络 / LLM 面」可**保持**（`recommend.ts` 内仍零 `fetch`/`chrome`）；若 spec 选择让 `recommend.ts` 直接触达 AI ⇒ 必须**显式取代 X-ADN-2** |

### 6.3 Feature 拆分建议

**检测到的拆分模式**：AI 候选**产出与校验**（安全核心）↔ AI 候选**兜底 / 合并 / 门禁**（回归与判据）——两者边界清晰、可独立验证，且校验面（安全）应先于合并面（体验）落地。

**推荐：2 叶（硬串行）**

| # | 叶子 Feature（建议目录名） | 范围（问题域） | 交付序 / 依赖 |
|:-:|---|---|---|
| 1 | `specs-tree-adn-1-ai-next-produce-and-verify` | **AI 结构化产出 next 候选 + 校验链**：时机（复用 `'idle'`）+ 载体（`chat` 载荷加法字段，零新增 kind）+ 校验（opId 在册 / 三档清分（gesture 恒拒）/ ref / param / 丢弃+留痕）+ 留痕 driver 声明 + 护栏接线（六常量）+ 判据（纯函数校验器 + 注入反证） | **1/2**（安全核心先落）；无前置叶 |
| 2 | `specs-tree-adn-2-deterministic-fallback-and-merge` | **确定性退居兜底 + 合并 + 门禁**：未配 / AI 无产出 / 非法被拦时的注册表兜底 + **free-input 终端恒常驻**（R8 保底不回归）+ AI/规则候选合并 / 优先级 / 去重 / 上限 + 首开边界落地 + 体积重登记 + 门禁逐条重锚（含保护段决策）+ S0 双面（已配置 AI 路径 / 未配置确定性路径） | **2/2**（硬依赖叶 1） |

> **替代（3 叶）**：若 spec 认为「**首开 AI 化**」与「**体积 / 门禁**」体量足够，可拆为 3 叶（adn-1 产出+校验 / adn-2 兜底+合并 / adn-3 首开+门禁+体积），仍**硬串行**。**默认推荐 2 叶**（与 F-35 先例一致）。
>
> **最终是否拆分由用户 / spec 决定**；discovery 只提建议不执行。

---

## 7. 现状映射、校验链与取代登记

> 本节回答编排回报的四问：推荐层现状映射（确定性面 vs AI 面）、AI 候选校验链设计要点与三档清分闸落点、显式取代候选（X-ADN）、命名与版本位占用核验。

### 7.1 推荐层现状映射（**确定性面 vs AI 面：已有 / 缺失**）

| 面 | 维度 | 已有（`file:line`） | 缺失（本 Feature 的对象） |
|---|---|---|---|
| **确定性面** | 产出内核 | `recommendNextStep`（`recommend.ts:487`）单内核 | —— |
| | 候选来源 | 注册表 provider（`candidateRules` `recommend.ts:436`；11 行 `providers.ts:124-201`） | 无「AI 候选」来源 |
| | 真值源 | 7 源白名单（`recommend.ts:121`）+ 模块白名单 5（`:138`） | 无「AI 候选」注入槽 |
| | 规则表 | `NEXTSTEP_PRIORITY` 恰 4（`recommend.ts:60`） | 无第 5 规则（AI）位 |
| | 上限 | 单卡（`:51`）+ 3 chip（`:54`） | 无「AI 多候选」合并口径 |
| | 时机 | 恰 5（`drivers.ts:31`）+ `maybeRecommend` 8 调用点 | 无新时机（待辨析） |
| | 闸门 | `pending`/`interval`/`empty`/`safety`（`:487-517`） | 无「AI 候选校验」闸 |
| | 兜底 | floor「仅含终端」最小卡（`:506`）+ 终端恒真（`providers.ts:195`） | AI 化后兜底位置未定 |
| **AI 面** | 回合内驱动 | thinking / command / tool 卡（`service-worker.ts`；`chat-events.ts:80-102`） | —— |
| | 自动按下 | `pressCandidate`（`ai-drive.ts:128`）+ 三档（`op-table.ts`） | AI **不能产出**候选（仅能按注册表给的） |
| | 自动成回合 | `driveAnsweredTurn`（`sidepanel.ts:2120`；经 `op.turn` 槽） | 同上 |
| | 护栏 | 六常量（`guard.ts:18-34`）+ 关断偏好 | 无「AI 候选」的预算 / 关断口径 |
| | 留痕 | `driver=… | timing=… | evidence=…`（`ai-drive.ts:85`）+ `manual` 两值可判 | 无「AI 候选产出」的留痕行 |
| | 并发 | SW 队列 + `ai-deferred`（`chat-events.ts:45`） | 无「候选产出 vs 在飞」让步口径 |

**一句话**：**确定性面 = 完整且成熟（产 / 校 / 兜 / 限 齐备）；AI 面 = 有「手」（按下 / 成回合）却没有「口」（产出候选）**。本 Feature = **给 AI 一张受校验约束的「口」**，并让确定性面退居兜底与安全闸。

### 7.2 载体与零新增 kind 论证要点（问题域约束，非方案）

- 现状 `chat-result` 的 `variant` 已证是 **type-only 词汇**（`ARBITRATION_RESULTS` ∉ `KIND_SET`；`KIND_SET` 恰 40，`chat-events.ts:32-35`）。
- ⇒ AI 候选**首选**复用**既有 `chat` 载荷的加法字段**（payload 字段，非消息 kind）：**零新增 kind / 零宿主 / 12 kind 不动**（F-5）可达成。
- 备选「专用消息 kind」⇒ `KIND_SET` 40→41（**须显式取代**，非目标默认排除）。
- 载体须满足：候选**结构化**（`{opId,label,ref?,params?}`）、**零明文**（法八）、**可被面板解析后注入 `recommendNextStep`**（保持 recommend.ts pure）。

### 7.3 AI 候选校验链设计要点 + 三档清分闸落点（**问题域约束**）

**校验链必须覆盖的 5 道判据**（顺序即语义优先级，**问题域约束，非实现**）：

| # | 判据 | 既有单源（可复用） | 落点 |
|:-:|---|---|---|
| ① | **opId 在册**（∈ 注册表 9 op；未知 op 拒绝） | `OP_DESCRIPTORS` / `OPS_BY_ID`（`op-table.ts` / `pipeline.ts`）；`tierOfId` 未知 ⇒ `undefined` | `tierOfId` 已就位；未知 op ⇒ 复用 `unknown-op` 词表 |
| ② | **三档清分**：`auto` 可提案 · `confirm` 可提案（consent 须用户答）· **`gesture` 恒拒绝** | `tierOf`（`op-table.ts`：`layer==='sw'` ⇒ gesture；特权 `op.authorize`/`op.perm.request` 恒 gesture）；`OP_TIER_TABLE` 物化 | **`pressDecision` 的 `tier` 分支**（`ai-drive.ts:70`）**是落点**——`tierOf(d) !== 'auto'` 今天是「一律拒」；接入 AI 候选时须区分「`confirm` 可提案（但按下仍须用户答）」与「`gesture` 恒拒」 |
| ③ | **ref 存在且有效** | `l1/ref-store.ts`（`stale()` / `all()`）；`recommendNextStep` 已读 `ref.staleCount` | 校验器读既有 ref 事实（零新真值源） |
| ④ | **param 在 op 参数 schema 内** | op 的 `params: AskSpec`（`definition.ts:101-104`）；`OP_TABLE` 的 `hasConsent`（与 `IMPL` 一致，`op-three-tier.test.ts`） | 校验器比对待校验 param 与 op schema |
| ⑤ | **越界 / 非法 ⇒ 丢弃 + 留痕（不静默接受 / 不死端）** | `blocked=<reason>`（`ai-drive.ts:138`）+ `suppressed=<reason>`（`:112`）+ 词表闭集（`PressBlocked` `:42` / `GuardBlockReason` `guard.ts:37-44`） | 复用同一留痕形态；补「候选校验失败」子类（零明文） |

**三档清分闸落点（**恰一处**，复用既有单源）**：

| 档 | 成员（5/2/2） | AI 候选处置 | 落点 |
|---|---|---|---|
| `auto` | `op.turn` / `op.pick` / `op.describe` / `op.help` / `op.rebind` | **可提案**（可显示为 chip；AI 可自动按下） | `tierOf` ⇒ `auto`；`pressDecision` 放行分支 |
| `confirm` | `op.llm-config` / `op.revoke` | **可提案**（可见 next，但 **consent 卡须用户答**，AI 不可代答） | `tierOf` ⇒ `confirm`；`pressDecision` 的 `tier` 分支须**新增「提案但不可自动按下」语义** |
| `gesture` | `op.authorize` / `op.perm.request`（**恒，特权**） | **恒拒绝**（AI 既不产也不按） | `tierOf` ⇒ `gesture`；`pressDecision` `blocked:tier`（`:70`）**保持** |

> ⚠️ **关键张力（供 spec 裁决）**：今天 `pressDecision` 把「非 `auto`」**一律**判 `blocked:tier`（`:70-71`）。AI 候选若允许 `confirm` 档**可见**（提案）但**不可自动按下**，则须在「按下判定」与「候选接受判定」之间**区分两件事**——但**不得**把 `gesture` 与之混同（`gesture` 必须连「可见提案」都拒）。这是本 Feature 安全设计的**核心边界**（登记为 O-ADN-005）。

### 7.4 显式取代候选（**X-ADN 登记**，供 spec 阶段逐条处置）

> 纪律：`validated` / `tracked` 终态产物**原样保留**（D7）；下列为**显式取代候选**——每条须有 old→new 映射 + 强度不降 + 台账留痕（承 F-35 X-IAN 先例）。

| ID | 现状（old） | 拟取代（new） | 证据 / 触发条件 |
|---|---|---|---|
| **X-ADN-1** | **next 推荐 = 确定性内核独占产出**（`recommendNextStep` 单源，真值 7 源） | **AI 驱动产出候选 + 确定性注册表退居兜底与安全闸** | 作者裁决（§0.1）；触发 = 本 Feature 立项 |
| **X-ADN-2** | `recommendation-sources` ④「零新增网络 / LLM 面：源码不含 `fetch`/`chrome`/时钟」（`recommendation-sources.test.ts:238`；`recommend.ts:11` FR-CHAT-060） | **保持**（若候选经 `RecommendInput` 注入，`recommend.ts` 仍 pure）；**仅当**选择让 `recommend.ts` 直接触达 AI ⇒ 显式取代 | O-ADN-016 推荐「不破」；条件性取代 |
| **X-ADN-3** | `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（单卡，`recommend.ts:51`）+ 单规则位（`NEXTSTEP_PRIORITY` 恰 4） | AI **多候选**的呈现口径（若确需 >1 卡 / >1 规则位） | Q-ADN-008；触发 = 若 AI 多候选须多卡 |
| **X-ADN-4** | `NEXTSTEP_PRIORITY` 恰 4（`recommend.ts:60`；`recommendation-sources.test.ts:139`） | 若 AI 候选成「第 5 规则」⇒ 等价重锚（追加 + 旧 4 逐字） | Q-ADN-008/011；触发 = 若 AI 走规则位 |
| **X-ADN-5** | 时机源「恰 5」（`drivers.ts:31`；DT-2/DT-3） | 若新增 `turn-done` 等触发词 ⇒ 等价重锚（旧 4 逐字 + 纯加法） | Q-ADN-011；**推荐不触发**（复用 `idle`） |
| **X-ADN-6** | `maybeRecommend` 调用点「恰 8」（DT-4；`op-wiring.test.ts:370` `maybeRecommend 1/8`） | 若新增调用点 ⇒ 等价重锚（计数只增不减 + 说明） | Q-ADN-014；触发 = 若新增挂点 |
| **X-ADN-7** | `DRIVER_DECLS_SRC` ↔ `builtinProviders()` **双向包含 11↔11**（DQ-1） | 若新增「AI next」provider ⇒ 同步新增声明行（`evidence` 与 `when` 同源） | Q-ADN-017；触发 = 若新增 provider |
| **X-ADN-8** | R6「完成后同动作去重」= `refId#意图摘要`（`recommend.ts:87-100`） | 扩展覆盖 **AI 候选**（同因去重纳入 AI） | Q-ADN-009；触发 = AI 候选接入去重 |
| **X-ADN-9** | `RECOMMEND_MODULE_WHITELIST` 恰 5 模块（`recommend.ts:138`；`recommendation-sources.test.ts:109-118`） | 若 `recommend.ts` 引入新模块源 ⇒ 白名单等价重锚 | Q-ADN-018；触发 = 若引入新导入 |
| **X-ADN-10** | floor = 「仅含 `free-input` 终端」最小卡（`recommend.ts:506-517`） | 若 AI 候选进入 floor 语义 ⇒ 重锚（终端仍恒常驻） | Q-ADN-007；触发 = 若 floor 语义变化 |
| **X-ADN-11** | 关断偏好 `web-cli:proactive` 只涵盖「AI 主动回合」（`guard.ts:32`） | 扩展涵盖 **AI next 候选的显示 / 自动按下** | Q-ADN-009；触发 = AI 候选接入偏好 |

### 7.5 命名与版本位占用核验（**本轮实测**）

| 项 | 实测 | 结论 |
|---|---|---|
| `F-36` 全仓（`*.md`/`*.json`/`*.ts`/`*.mjs`，排除 `node_modules`/`.git`） | **0 命中** | 全新编号（§7.6） |
| `v0.11.3` 全仓 | **0 命中** | 全新版本位（§7.6） |
| 树名 `specs-tree-web-cli-plugin-v55-f-ai-driven-next` | 目录**不存在**（本轮创建） | 全新目录 |
| F-35 半成品 | **无**（F-35 已父收口 `validated`；ROADMAP v1.32.0 已登记） | 无冲突 |
| ROADMAP 当前版本 | **v1.32.0**（F-35 / v0.11.2 已登记） | 本 Feature 登记留收口（v1.33.0） |

### 7.6 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin F-36「AI 驱动 next」问题挖掘）：作者裁决逐字 + 现状架构诊断（确定性面 A-1~A-13 / AI 面 B-1~B-9 / 结题点 C-1~C-4 / 关键事实 F-1~F-6）+ 推荐层现状映射（确定性 vs AI 已有/缺失）+ AI 候选校验链 5 判据 + 三档清分闸落点 + Q-ADN-001~024 + A-ADN-001~011 + R-ADN-001~014 + X-ADN-1~11 + O-ADN-001~016（附推荐）+ 2 叶拆分建议；零产品运行时验证、零受管 Provider 调用（routing.v1 = local_or_compute → none）。 | 2026-09-26 | SDDU Discovery Agent |
