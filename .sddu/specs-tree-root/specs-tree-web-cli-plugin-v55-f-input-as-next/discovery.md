# 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-input-as-next

> **文档定位**: SDDU 问题挖掘报告 — 记录 web-cli-plugin「**输入即 next（input-as-next）：废除流外独立输入框，自由文本输入成为流内 next 的一个选项**」的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = ① **作者裁决（2026-09-24，立法级，逐字保留于 §0.1）** ② 编排器已完成的**只读诊断证据**（逐条 `file:line`，本报告 §0.2 / §7 **复核并引用，不重开诊断**）③ 上游收口总账（`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-scope-governance/closeout.md`：F-34 两叶 `validated` + `authorConfirmation = pending-author-line`）④ 相关立法（法四 / 法一 / 法七 / 法九；v4-chat spec.md 逐字）⑤ 仓库现状（分支 `feature/web-cli-plugin` @ `ce29665`；本轮实测）⑥ 编排器代作者决策（2026-09-24：作者已授权编排器代行决策；**不访谈作者基本框架，开放点收集后附推荐，spec 阶段批量裁决**）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（web-cli-plugin F-35「输入即 next」问题挖掘）

web-cli-plugin「**输入即 next（input-as-next）**」问题挖掘报告 —— 把作者裁决（**废除流外独立输入框；自由文本输入是流内 next 里面的一个选项**）与既有诊断证据（**`#composer` 双写者 + `fallbackOpen` 锁存无生产复位 + 设置态漏隐藏**，其显隐「与历史相关而非与状态相关」）转成可验收的问题域：**产品语言已经说了「一切操作在 chat 的 next 里闭环」，但界面上仍然保留着一个流外的、独立于 next 的输入框（`#composer`）——它是 all-in-chat/next 主线上唯一未收编的交互面**。作者的困扰（`#composer` 时隐时现）只是这个面**本来就自相矛盾**的可观察症状；作者的裁决不止于修缺陷，而是**废除该面本身**。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（作者裁决 / 诊断证据 / 代码事实 / 上游产物 / 编排器决策 / 仓库实测），供 spec 阶段追溯；**不加入任何方案推断，不写需求条文**。

### 0.1 作者裁决（2026-09-24，**原话逐字保留，不美化**，立法级）

> 「不能打破 all-in-chat/next。既然由 next/chat 驱动用户选择/输入，那自然输入框也是在 chat 里面的 next 里面的一个选项，**不应该存在单独的输入框**」

| 要素 | 逐字要点 | 性质 |
|---|---|---|
| **顶层约束** | 「不能打破 all-in-chat/next」 | **不可逆立法**（承 F-32 v5 主题「一切操作皆 next 流内闭环」） |
| **推导** | 「既然由 next/chat 驱动用户选择/输入，那自然输入框也是在 chat 里面的 next 里面的一个选项」 | 产品语言：输入 = next 的一个选项 |
| **结论** | 「**不应该存在单独的输入框**」 | **废除面**（不是修缺陷；`#composer` 本体应消失） |

**背景（编排器转述，事实）**：作者被 `#composer`（`<form id="composer"><input id="input" …><button id="send">`，`src/ui/sidepanel/index.html:1419-1422`）**时隐时现**困扰；编排器已完成根因诊断（§0.2），确认其显隐「**与历史相关而非与状态相关**」的三处缺陷 —— 但作者裁决**不止于修缺陷，而是废除该面**。

> **口径声明（如实）**：作者**未**指定「自由输入」next 的形态（常驻选项 vs 按需出现、流内输入行 vs 卡内输入、提交走什么通道）、**未**指定法四的修订方式、**未**指定门禁/保护段如何重锚 —— 这些**全部登记为开放点（§6.2 O-IAN-\*）**，**不在本阶段预设答案**。

### 0.2 诊断证据（**只读已完成，本报告复核并引用，不重开诊断**）

> 编排器已完成诊断，结论为：`#composer` 的显隐「**与历史相关而非与状态相关**」。以下三条缺陷**逐条复核 `file:line`**（本轮只读，未改任何源码）。

| # | 缺陷（诊断结论） | 事实（`file:line`，本轮逐条复核） |
|:-:|---|---|
| **D-A** | **双写者**：护栏 writer vs 无条件直写 writer 并存 | ① 护栏 = `syncComposerVisibility()`（`src/ui/sidepanel/sidepanel.ts:2884-2891`）：「`composer.hidden = !(fallbackOpen && chatVisible)`」；② 无条件直写 = `l0.revealFallback/hideFallback`（`src/ui/sidepanel/l0/shell.ts:90-105`）：「`composer.hidden = false/true`」**不经护栏**。两处对同一 `hidden` 属性写值 ⇒ 最终值取决于**调用顺序**（历史），而非当前状态 |
| **D-B** | **锁存无生产复位**：`fallbackOpen` 只被置真，生产路径**永不复位** | `let fallbackOpen = false`（`sidepanel.ts:2883`）；置真 = `revealAskFallback()`（`:2896`）；**唯一复位 = 测试钩子 `__v3.testing.hideFallback()`（`:856`）**；生产路径（`render()` / `openL2View` / 视图切换）**均不复位** ⇒ 一旦兜底展开过一次，该标记此后恒真（历史锁存） |
| **D-C** | **设置态漏隐藏**：进入设置视图的路径**不调用护栏** | `openL2View('settings')`（`sidepanel.ts:3607-3613`）**提前 return，不调 `syncComposerVisibility()`**（对比非 settings 分支 `:3616` 调了）；且 `body.settings-open` 的 CSS（`index.html:670-672`）只隐藏 `#region-toolbar / #region-stream / #region-statusbar`，**不含 `#composer`** ⇒ 若兜底态跨入设置视图，`#composer` 可能浮在设置视图之上 |

**关键事实（诊断补充，本轮复核）**：

| # | 事实 | `file:line` |
|:-:|---|---|
| F-1 | 静态默认 `hidden`（法四：默认屏无常驻输入框） | `index.html:1419`（`<form id="composer" hidden>`） |
| F-2 | text 型 ask 直开兜底 ⇒ 连带 reveal `#composer` | `sidepanel.ts:2312`「`if (state.ask?.kind === 'text') l0?.revealFallback();`」 |
| F-3 | **卡内已有输入先例**：`.ask-fallback` 内联输入（`#ask-fallback` / `#ask-input` / `#ask-submit` / `#ask-cancel`），默认收起（text 型除外），`setCardFallbackOpen` 互斥披露 + focus | `cards/askuser.ts:263-300`（构造）/ `:71-86`（互斥 + focus）/ `:94-103`（文档级 `setAskFallbackOpen`） |
| F-4 | 兜底入口**四处**全部收敛到 `revealAskFallback()`（卡内），`#composer` 只是被**附带**reveal 的次级通道（**无独立入口**） | 见 §7.3 |
| F-5 | `#composer` 的可见条件 = 「兜底展开」（即只在 text ask / 改用描述 / op.describe 时可见）——**"时隐时现"部分按法四是设计**，作者困扰的是它**存在**且显隐依赖历史 | §7.1 |

> **纪律**：D-A / D-B / D-C **不是独立缺陷快修项**——它们随「废除 `#composer` 面」**一并消解**（面没了，双写者/锁存/漏隐藏都不复存在）。本 Feature **不重复立项为缺陷快修**（§1.4 显式排除「只修缺陷不废面」的路径）。

### 0.3 编排指示（**原话要点，逐字保留**）

| # | 指示 | 落地形态 |
|---|---|---|
| **P1** | 「**1.「自由输入」next 的形态**：下一步推荐区常驻一个「自由输入…」选项？还是按需出现（何时）？点开后流内输入行/卡内输入（`.ask-fallback` 先例扩展）？提交后走什么（新 op？复用 op.turn 的 value 相？注意 `requestTurn` 恰 2 门禁——输入提交是否经注册表内既有通道）」 | 本稿登记为**核心 1**（§3 Q-IAN-003） |
| **P2** | 「**2. `#composer` 废除面**：`index.html` 元素、view-model `buttonStates/#send-reason`、R6 排队入口迁移（在飞时自由输入 next 是否仍可见→排队语义保留）、状态栏原因行去留（状态提示≠输入面，可留？）、测试钩子 `hideFallback`、a11y（focus 流）」 | 本稿登记为**核心 2**（§3 Q-IAN-001/002/004/008） |
| **P3** | 「**3. 四处兜底入口改流内**：改用描述 / op.describe / l1 / describe 空值——全部改为流内输入卡？卡内 `.ask-fallback` 统一？」 | 本稿登记为**核心 5**（§3 Q-IAN-007） |
| **P4** | 「**4. 法四修订**：新法条文本（如「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」）+ supersession 台账（法四原文修订登记）+ 密度 / l0 / journey 判据重锚清单」 | 本稿登记为**核心 6**（§3 Q-IAN-005/006） |
| **P5** | 「**5. 风险**：R6 排队/草稿回填回归、text ask 期间输入路径、无障碍、体积（删 composer 应为负增量；流内输入卡新增）、门禁只增不减与删除面的张力（保护段/判据重锚纪律）」 | 本稿登记为**核心 4/7 + §5.2** |
| **P6** | 「**6. 命名**：F-35、v0.11.2、树名建议 `specs-tree-web-cli-plugin-v55-f-input-as-next`（承 F-34 patch 系）；ROADMAP 登记留收口」 | 本稿登记为 §6.1 O-IAN-001 + §7.6 |
| **约束** | 「作者已授权编排器代行决策；开放点收集附推荐（spec 批量裁决）。`.sddu` 外零触碰；commit `docs(sddu): F-35 discovery …`；推送 `git push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin`（推后 HTTPS refspec fetch 同步 tracking）」 | 本稿 §0.4 D1~D7 + §0.5 |

> **口径声明（如实）**：以上**均为编排器转述的指示要点**；作者除 §0.1 的裁决原话外**未**给出进一步实现约束。

### 0.4 编排器代作者决策（2026-09-24；**已为定论，本报告直接作为约束记录，不重新讨论**）

| # | 决策 | 性质 |
|---|---|---|
| D1 | **作者已授权编排器代行决策、SDDU 全流程自行调度**（discovery → spec → plan → tasks → build → review → validate 均按此口径） | 定论（作者授权） |
| D2 | **本轮 discovery 不访谈作者基本框架**：开放点**收集后附推荐项**，由 spec 阶段**批量裁决** | 定论（编排器要求） |
| D3 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-input-as-next/`**（承 F-34 `specs-tree-web-cli-plugin-v55-f-scope-governance` 的 `v55-f-` 补丁级跟进轮命名惯例） | 定论（**语义辨析见 §7.6 / O-IAN-001**） |
| D4 | **ROADMAP 编号 = F-35**；**本轮实测：`F-35` 全仓（`*.md` / `*.json` / `*.ts` / `*.mjs`，排除 `node_modules` / `.git`）0 命中**（§7.6） | 定论 + 本轮复核 |
| D5 | **版本位 = v0.11.2（patch 主题，承 F-34 的 v0.11.1）**；**本轮实测：`v0.11.2` 全仓 0 命中**（§7.6）⇒ 全新版本位（**登记留给收口**；本阶段 **ROADMAP 零 diff**） | 定论（登记留给收口） |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录；不改任何 `src/`、`test/`、`dist/`、`design/`、`docs/` 与 `ROADMAP.md`**（本轮为 discovery，**零产品运行时验证**；零受管 Provider 调用） | 定论（本轮已遵守） |
| D7 | **不上溯改写 F-34 / F-33 / R6 / v4 产物**：全部 `validated` 终态与 `docs/*.json` 台账**原样保留**；本 Feature 以**并列新主题**立项；作者裁决 = **新立法＋显式取代**（§7.5 X-IAN），**不是**对旧产物的静默改写 | 定论（本轮已遵守） |

### 0.5 本阶段边界（discovery 职责声明）

- **负责**：挖掘问题、梳理问题、记录问题；输出问题清单 + `#composer` 依赖面全景 + 「自由输入」next 现状映射 + 风险预登记 + **显式取代候选清单（X-IAN）** + 开放问题（附推荐）+ 叶拆分建议。
- **不负责**：不定义需求（不写「系统应支持 XXX」）、不分类 Must/Should/Could、不定义验收标准、不做方案评估与替代方案对比、不写 ADR、不排任务、不改代码、**不决定「自由输入」next 的形态与法条载体**（= 开放点）。
- **本轮零产品运行时验证**：未跑 `npm test` / Chromium 门禁 / 构建；所有数字均来自**带 `file:line` 的源码、已入库产物与本轮只读复核**（§7 逐条给出），未自造实测值。

---

## 1. 问题定义

### 1.1 一句话问题陈述

> **「产品语言已经承诺『一切操作在 chat 的 next 里闭环』，但界面上仍存在一个流外的、独立于 next 的输入框——它是 all-in-chat/next 主线上唯一未收编的交互面」** —— `#composer`（`<form id="composer"><input id="input" …><button id="send">`，`index.html:1419-1422`）是**唯一**的「自由文本 → 发起回合」面（composer submit `sidepanel.ts:3749-3760` → `requestTurn(input.value)`），却**住在 `ol#stream` 之外**（v4.5 起迁 `body` 尾，「出流」——`index.html:1414-1422` 注释 / `host-registry.ts:114-145`）。而它的显隐**不由当前状态决定，而由历史决定**（D-A 双写者 / D-B 锁存无复位 / D-C 设置态漏隐藏）：`syncComposerVisibility()` 的护栏（`sidepanel.ts:2884-2891`）与 `l0.revealFallback/hideFallback` 的无条件直写（`l0/shell.ts:90-105`）争抢同一个 `hidden` 属性，`fallbackOpen` 锁存（`:2883`）在生产路径**永不归零**，进入设置视图的路径**根本不调护栏**（`:3607-3613`）⇒ 用户看到的输入框时隐时现，且**没有任何一个当前状态能解释它的显隐**。作者的裁决把问题从「修这个显隐 bug」抬升到「**这个面本就不该存在**」：输入天然是 next 的一个选项，next 在 chat 里面，因此**不该有单独的输入框**。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---|---|---|
| **流外独立输入框与 all-in-chat/next 主线自相矛盾（母问题）** | 「一切操作在 chat 的 next 里闭环」（F-32 v5 主题）是**已立法**的产品语言；法四是「输入按需出现（无常驻输入框）」——它**默许了流外按需出现的输入框**，`#composer` 正是这个例外（`v4-chat/spec.md:116,225,385`）。⇒ 主线上留了一个**未收编的交互面**：它不参与 next 注册表、不受 chip 的 op 分发、不进流（只追加不固化的消息纪律），是**产品语义的破口** | 每一次用户「自由输入」都走一条**与 next 平行的第二通道**（`requestTurn(` 恰 2 的第二处 = composer submit）；这条通道**没有 next 的推荐/留痕/终态词汇**，也无法被后续「一切皆 next」的治理覆盖 ⇒ 每加一个 next 能力，都要再考虑「composer 那一侧怎么办」 |
| **`#composer` 显隐不可判（与历史相关）** | 三条可判缺陷（§0.2 D-A/B/C）：双写者顺序决定最终值、`fallbackOpen` 历史锁存、设置态不隐藏。⇒ 用户（作者本人）**被时隐时现困扰**（真机体验驱动本轮立项）；更实质的问题：**没有任何单一状态能预测它是否可见**，因此**任何门禁都无法稳定断言它**（现门禁只能断言"默认屏 hidden"，无法覆盖跨态的历史路径） | 若只修 D-A/B/C（不废面）：仍需为「一个流外输入框」维护**两个 writer + 一个锁存 + 一条设置态护栏**，且未来每一处「展开/收起」都要重新论证；**修缺陷不改变"这个面与主线矛盾"的事实**——作者已裁决**废面** |
| **「自由输入」作为 next 选项的形态缺位** | next 注册表（契约 v2）已把「下一步是什么」做成**可注册的 provider/chip**（`next-registry/registry.ts` / `providers.ts`：10 个 provider；`cards/nextstep.ts:8-11`「chip 即指令，不填 composer」）；但**没有**「自由输入…」这样的 next 选项。⇒ 「想自由输入」这件事**只能去那个流外的框**，无法在流内表达 | 无法用既有 next 机制覆盖「自由输入」这一最基本的用户意图；chip 只能选**预设**动作，**不能承接任意文本** ⇒ next 闭环在"自由输入"这一格上**缺口** |
| **R6 排队/草稿回填语义绑定在 composer 上** | R6（`74d76c1`）把在飞时的用户提交改为**SW 有界队列**（`turn-queue.ts` `TURN_QUEUE_MAX = 1`；`classifyChatRequest` → `executed/queued/busy-rejected`；`service-worker.ts:924-940` 入队、`:1050-1056` drain）；面板侧**可见留痕 + 草稿回填 `#input`**（`sidepanel.ts:3904-3991`；`busy-rejected` ⇒ `draftInput.value = rejected`）。⇒ 这套机制**唯一的用户入口是 composer submit**；composer 废除后，**队列的入口与回填载体都要迁移**，否则 R6 的排队语义（`AC-SELF-014` / `R-V55-107`）会静默失效 | 若迁移不当：在飞时用户提交**丢失可见留痕**（「不是没反应」的承诺失效）或**草稿丢失**（`busy-rejected` 回填断裂）⇒ 直接回归 R6 修复成果 |
| **门禁只增不减 vs 删除面的张力** | 项目纪律是**门禁只增不减**、保护段哈希变更**必须台账留痕**、断言**等价重锚强度不降**（`supersession-ledger.test.ts` / `insight-tree-hierarchy.test.ts:527,656` / `v4-chat/spec.md:489`）。而本 Feature **要删一个面**：大量断言**钉了 `#composer` / `#input` / `#send`**（§7.4 全景：node 10 个文件 + Chromium 8 个门禁，含**两个保护段** journey `42766..54004` / binding `107780..115930`）⇒ 必须**逐条重锚**（等价或更强）或**显式取代 + 台账**，**不得静默删除** | 静默删除断言 = 静默降低强度（历史教训：反证恒绿 / 空心断言 / 保护段静默改写被 BLOCK）；漏一条 = 门禁与产品态不一致 ⇒ 下一次改动可能"合法地"绕开已废面 |

### 1.3 本 Feature 范围（**问题域描述，非需求**）

| # | 主题 | 性质 | 来源 | 目标态（**问题域描述**） |
|:-:|---|---|---|---|
| 核心 1 | **「自由输入」next 的形态** | 交互面 + 通道 | P1 + 作者裁决 | 自由文本输入成为**流内 next 的一个选项**（形态 = 开放点 O-IAN-002）；点开后输入发生在**流内**（行/卡内输入）；提交走**注册表内既有通道**（`op.turn` 槽 = `requestTurn`；`requestTurn(` 计数语义 = 开放点 O-IAN-008） |
| 核心 2 | **`#composer` 废除面** | DOM 退役 + writer 收敛 | P2 + 作者裁决「不应该存在单独的输入框」 | `#composer` / `#input` / `#send` **真退役**（**非 `hidden`**）；双写者（`syncComposerVisibility` vs `l0.reveal/hideFallback`）+ `fallbackOpen` 锁存 + 设置态漏隐藏**一并消解**（面没了即不存在）；测试钩子 `hideFallback`、`NEVER_FOLDABLE`、兼容读取面登记同步退役 |
| 核心 3 | **R6 排队/草稿回填迁移** | 通道 + 留痕 | P2 + R6 现状 | SW 有界队列语义（上限 1 / drain / `queued` / `busy-rejected`）**保留**；用户提交入口迁到流内输入；**草稿回填载体**迁到流内输入（不丢原话、不静默） |
| 核心 4 | **四处兜底入口收敛到流内** | 入口 + 载体 | P3 + F-3 | 改用描述（`decision-region.ts:169`）/ `op.describe` 参数相（`sidepanel.ts:1513`）/ L1 面板（`:3650`）/ `bindPanelOps.describe` 空值（`:3788`）——**全部只 reveal 卡内 `.ask-fallback`**，不再附带 reveal 流外 `#composer`；卡内 `.ask-fallback` 成为**唯一**的兜底输入载体 |
| 核心 5 | **法四修订（输入即 next）** | 立法 + 判据 | P4 + 作者裁决 | 法四（**输入按需出现：无常驻输入框；text 输入框只在卡内**）修订为「**输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面**」（载体 = 开放点 O-IAN-007）；法条修订入 **supersession 台账**（old→new） |
| 附带 1 | **判据重锚与保护段处置** | 门禁 | P4 + §7.4 | 密度 / l0 / journey / insight / binding / host-registry / density-thresholds / op-wiring / turn-arbitration / settings 等**钉了 `#composer` 的断言**逐条重锚或显式取代；journey `42766..54004` + binding `107780..115930` 两个**保护段**逐段决策 + 哈希变更台账留痕 |
| 附带 2 | **状态提示面去留** | 状态栏 | P2 | `#send-reason`（状态栏原因行）与 `buttonStates.sendDisabled` / `sendDisabledReason`（`view-model.ts:298-315,384-400`）的**去留与重新锚定**（状态提示 ≠ 输入面；开放点 O-IAN-006） |
| 附带 3 | **a11y / focus 流** | 可访问性 | P2 | 删除 `#composer` 后 focus 目标与焦点流不断裂（卡内 `setCardFallbackOpen` 的 focus 先例：`askuser.ts:85`） |

### 1.4 非目标（**明确排除**）

| 非目标 | 理由 |
|---|---|
| **「只修 D-A/B/C 三缺陷、保留 `#composer`」的路径** | 作者裁决明文「**不应该存在单独的输入框**」；诊断证据只作**现状底座**引用，本 Feature **不重复立项为缺陷快修**（§0.2 纪律） |
| **F-34 / F-33 / F-32 / R6 / v4 产物改写** | D7：全部原样保留；本 Feature 为并列新主题；`ty.md` 等证据零改写 |
| **`src/content/**`（`content.js` 177,076 B）/ `pick-layer.js`（34,358 B）语义改动** | 字节冻结红线（零容差）；本 Feature 只动侧栏 UI（`sidepanel.js`）与其门禁 |
| **`packages/web-cli-base/**` 改动** | 硬红线：`test/insight-no-escalation.test.ts:147` 机核 `../web-cli-base` **零 diff** |
| **判定链（`security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面** | 硬底线（`docs/v3-supersession-ledger.json#zeroDiffFiles` 9 项内容哈希 pin） |
| **SW 有界队列的裁决逻辑本身（`turn-queue.ts` 三分支）** | R6 已闭环（`74d76c1`）；本 Feature 只**迁移入口与回填载体**，不改裁决语义 |
| **法八（零明文）放宽** | `test/ui/law8-plaintext.mjs` 必绿：流内输入卡**不得**把明文正文写进流内 payload / digest / 审计 / DOM 四面 |
| **12 kind 卡类型学新增（第 13 种）/ 新宿主** | v4/v5 已固化「零新增卡类型 / 零宿主」；流内输入**复用既有 `askuser` kind + `.ask-fallback` 先例**（编排纪律：零新增 kind 优先论证） |
| **特权 op（`op.authorize` / `op.perm.request`）的发起方式** | 红线：特权 op **恒 gesture**、AI 不可代答（`op-table.ts:134` 段注：`gesture` = `op.authorize` / `op.perm.request`）；`op.turn` ∈ `auto` 档的语义边界见 R-IAN-004 |
| **F-29（A2A 候选）** | 未立项未排期，**保持原样不动** |
| **安装期静态权限 / `manifest` 静态面 / 存储加密 / 会话分组收编 op** | 与本问题域无耦合（v5 `PO-ALLN-001` deferred 保持） |

---

## 2. 用户画像

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2/v3/v4/v4.5/v5/v5.5/v5.5.1 同一事实基础。**本报告不编造用户调研数据**；「用户原话」栏引用 §0.1 作者裁决逐字与代码事实。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 当前应对方式 |
|---|---|---|---|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏（`platform.deepseek.com`）：想自由输入一句指令，看向面板底部 | ①（裁决，逐字）「**不应该存在单独的输入框**」；②（困扰，编排器转述）被 `#composer` **时隐时现**困扰 —— 它有时在（text ask / 改用描述兜底展开时），有时不在（默认屏 / 设置视图），且**显隐无法用当前状态解释**（D-A/B/C） | **下一轮立法废除该面**（不是忍受、不是找临时方案）——作者用「all-in-chat/next」的顶层约束一次性裁决 |
| **作者（文本作答场景）** | 点了「其他…（我来描述）」/ 收到 text 型 ask 卡 | 卡内**已经有**一个输入框（`.ask-fallback`，`askuser.ts:263-300`）；**同时又多出一个** `#composer`（`l0.revealFallback` 连带 reveal，`shell.ts:98-99`）⇒ **两个输入面同时出现**，语义重叠 | 忍受双面；本轮裁决**只保留卡内这一面** |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种『自由输入』交互，要改哪些文件？」 | 现状答案 = **一个流外 form（`#composer`）+ 两个 writer（`syncComposerVisibility` / `l0.reveal-hideFallback`）+ 一个历史锁存（`fallbackOpen`）+ 一个兼容读取面登记 + 一条设置态护栏** ⇒ 「自由输入」语义**无处安放**（没有 next 选项、没有 op、没有卡内统一） | 服从既有形态（即**扩张被"流外输入框"这一结构锁死**）——与 v5 的 `Q-ALLN-003`（操作无可注册）、v5.5 的 `Q-SELF-015`（驱动者无可注册）同构，但层次再上一层：**本 Feature 是「交互面本身没有被 next 收编」** |

---

## 3. 问题清单

> 编号空间 `Q-IAN-###`（IAN = input-as-next）。核心 / 次要 / 潜在按「影响面 × 影响深度 × 影响频率」分级；每条标注信息来源（源码 `file:line` / 作者裁决 / 编排指示 / 假设）。

### 3.1 核心问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-IAN-001** | **母问题：流外独立输入框与 all-in-chat/next 主线自相矛盾。** 产品语言已立法「一切操作在 chat 的 next 里闭环」（F-32）；`#composer`（`index.html:1419-1422`）是**唯一**的「自由文本 → 回合」面，却**住在流外**（v4.5「出流」迁 `body` 尾；`host-registry.ts:114-145` 明确它是「退役的**宿主值**」但 `#composer` **本体保留**为「兼容读取面」）。它不参与 next 注册表、不受 chip 的 op 分发、不进流。⇒ **主线上留了一个未收编的交互面**。作者裁决逐字：「**不应该存在单独的输入框**」。 | 全部自由输入回合；深度 = **核心阻碍**（产品语义破口）；频率 = 每次用户自由输入 |
| **Q-IAN-002** | **`#composer` 显隐不可判（与历史相关，三条可判缺陷）。** D-A 双写者（护栏 `syncComposerVisibility` `sidepanel.ts:2884-2891` vs 无条件直写 `l0.revealFallback/hideFallback` `shell.ts:90-105`）；D-B `fallbackOpen` 锁存（`:2883`）**无生产复位**（唯一复位 = 测试钩子 `:856`）；D-C 进入设置视图路径（`:3607-3613`）**不调护栏**且 CSS（`index.html:670-672`）**不含 `#composer`**。⇒ **没有任何单一状态能预测它是否可见**，门禁只能断言"默认屏 hidden"，无法覆盖跨态历史路径。作者困扰（时隐时现）即此。 | 全部面板状态；深度 = **明显痛点—核心阻碍**（不可判 ⇒ 不可稳定门禁）；频率 = 每次兜底展开 / 视图切换 |
| **Q-IAN-003** | **「自由输入」作为 next 选项的形态缺位。** next 注册表已把「下一步是什么」做成可注册 provider/chip（`registry.ts` / `providers.ts`：10 provider；`nextstep.ts:8-11`「chip 即指令，不填 composer」），但**没有**「自由输入…」这样的 next 选项：chip 只能选**预设**动作，**不能承接任意文本**。⇒ 「想自由输入」只能去流外那个框。⇒ next 闭环在"自由输入"这一格**缺口**。 | 全部自由输入意图；深度 = **核心阻碍**（最基本用户意图无法在流内表达）；频率 = 每次用户想输入任意指令 |
| **Q-IAN-004** | **R6 排队/草稿回填语义绑定在 composer 上。** SW 有界队列（`turn-queue.ts` `TURN_QUEUE_MAX=1`；`service-worker.ts:924-940` 入队 / `:1050-1056` drain）+ 面板可见留痕 + `busy-rejected` 草稿回填 `#input`（`sidepanel.ts:3904-3991`；`turn-arbitration.test.ts:49,60` TA-4 机核「删掉回填即红」）。⇒ **唯一用户入口 = composer submit**（`requestTurn(` 恰 2 的第二处）；composer 废除后**入口与回填载体都要迁移**，否则 R6 成果静默回归。 | 在飞时用户提交；深度 = **高**（回归 R6 修复）；频率 = 每次在飞时提交 |
| **Q-IAN-005** | **法四与作者裁决冲突（法四只禁"常驻"，未禁"流外按需"）。** 法四逐字（`v4-chat/spec.md:116`）：「输入按需出现：**无常驻输入框**（沿用 E 的「页面即输入」主线）；`ask-user` text 型输入框只在问题卡内出现，卡内还有「其他…（我来描述）」兜底」；FR-CHAT-014（`:225`）/ AC-CHAT-007（`:385`）同源。⇒ 法四**默许了"按需出现的流外输入框"**（`#composer` 正是这个例外：默认 hidden，兜底时 reveal）。作者裁决要求「**流外零输入面**」——**超出法四**。 | 全部输入面；深度 = **中高**（立法层）；频率 = 一次性（本轮裁决） |
| **Q-IAN-006** | **门禁只增不减 vs 删除面的张力（判据重锚纪律）。** 项目纪律：门禁只增不减 / 保护段哈希变更必须台账留痕 / 断言等价重锚强度不降（`supersession-ledger.test.ts:1452` / `insight-tree-hierarchy.test.ts:527,656` / `v4-chat/spec.md:489`）。而本 Feature 要**删一个面**：大量断言钉了 `#composer`/`#input`/`#send`（§7.4：node 10 文件 + Chromium 8 门禁，含**两个保护段** journey `42766..54004` / binding `107780..115930`）⇒ 必须**逐条重锚**或**显式取代 + 台账**。 | 全部门禁；深度 = **高**（决定本 Feature 是否"静默降强度"）；频率 = 一次性（本轮裁决） |
| **Q-IAN-007** | **四处兜底入口的载体收敛未完成（双 reveal）。** 四个入口（`decision-region.ts:169` / `sidepanel.ts:1513` / `:3650` / `:3788`）**全部**调用 `revealAskFallback()`（→ 卡内 `.ask-fallback`，正确），但 `revealAskFallback` **同时**调 `l0.revealFallback()`（`shell.ts:98-99`）**无条件 reveal 流外 `#composer`** ⇒ **两个输入面同时出现**（§7.3）。⇒ 卡内 `.ask-fallback`（F-3 既有先例）本可独立承载，流外 composer 是**冗余的第二面**。 | 全部兜底态；深度 = **中**（语义重叠 + 密度占位）；频率 = 每次兜底展开 |

### 3.2 次要问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-IAN-008** | **`#send-reason` 状态栏原因行与 `sendDisabled` 语义的去留/重锚未定。** `sendDisabledReason`（`view-model.ts:298-315`）与 `buttonStates.sendDisabled`（`:384-400`，R6 改为 `!hasOrigin`）驱动 `#send` 的 disabled 与 `#send-reason`（`sidepanel.ts:2394-2423`）。`#send-reason` 是**状态栏保留要素**（`host-registry.ts:295-321` 明确「**不是**退役 id，是保留载体」）。⇒ 输入面废除后，「发送禁用原因」这一**状态提示**是否保留、锚到哪里 = 开放点 O-IAN-006。 | 状态栏；深度 = 中；频率 = 每次无活跃站点 |
| **Q-IAN-009** | **设置视图 ⇄ chat 的草稿保持依赖 `#input`。** `settingsViewSwitch` 的 `getDraft`/`setDraft`（`sidepanel.ts:1337-1341`）读写 `#input.value`（`settings.test.ts:191`「composer draft restored」）。⇒ 废除 `#input` 后草稿保持断链。 | 视图切换；深度 = 中；频率 = 每次切设置 |
| **Q-IAN-010** | **a11y focus 流断裂风险。** 卡内 `setCardFallbackOpen(open=true)` 会 `input.focus()`（`askuser.ts:85`）——流内输入已有 focus 先例；但 `#composer` 的 `#input` 也是既有 focus 目标（`l0.mjs` ⑪ 断言"输入可用"）。⇒ 删除后 focus 目标需重锚，不得断裂。 | 键盘 / 读屏；深度 = 中；频率 = 每次兜底展开 |
| **Q-IAN-011** | **首装引导文案指向将被废除的面。** `ONBOARDING_TEXTS[4]`（`view-model.ts:350`）逐字「在**输入框**输入指令并发送，开始对话」——它指向的正是 `#composer`/`#input`。⇒ 流内输入成为唯一入口后，引导步要改指流内 next 输入选项。 | 首装引导；深度 = 中；频率 = 一次性（首装） |
| **Q-IAN-012** | **`#composer` 作为「兼容读取面」的退役牵动 e2e/binding 诊断面。** `binding.mjs` 的 `DIAG_SELECTORS`（`:115`）含 `'composer'`；`:905` 读 `#send.disabled` / `#send-reason`；`:1034-1096` 真实键入走 `#input`/`#send`；`insight.mjs` `#I-08/#I-09`（贴底 / FAB∩composer）也读 `#composer` 几何。⇒ 退役须同步重锚（§7.4）。 | e2e / binding；深度 = 中；频率 = 一次性 |

### 3.3 潜在问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-IAN-013** | **体积：距档位仅 22,454 B（⚠️）。** 现行登记（F-34 后实测）：`sidepanel.js` **591,946 B**；生效上限 `floor(591,946 × 1.05) = **621,543**`；**档位 614,400**（距 **22,454 B**）· 绝对上限 675,840 · `authorConfirmation.status = pending-author-line`（**未闭合义务**，F-34 承接 v5.5 两次升档）。历史教训：v5 plan Σ 低估 **2.8×**；v55 三叶超预算 +6,015；F-34 叶2 越预算基线上界。**本 Feature 的净增量方向不明**：删 `#composer` 是**负增量**（DOM + CSS + 两个 writer + 锁存 + 读取面），但**流内输入卡新增**是**正增量**。 | 体积门禁；深度 = 中高（**必须先预算**）；频率 = 每轮 |
| **Q-IAN-014** | **`op.turn` 的 `auto` 档与"用户手输"的语义边界。** `op.turn` ∈ `auto` 档（`op-table.ts:134` 段注：「`auto` — AI may press it autonomously（5: `op.turn` / `op.pick` / `op.describe` / `op.help` / `op.rebind`）」）。⇒ 若「自由输入」提交**复用 `op.turn` 槽**，需明确：**用户手输的文本**不得退化为 AI 可代答的自动通道（承红线⑥精神：consent/手势面不得被 AI 代答）。 | op 三档语义；深度 = 中高；频率 = 一次性（本轮裁决） |
| **Q-IAN-015** | **`requestTurn(` 恰 2 门禁与废除面的张力。** `op-wiring.test.ts:128-133` 机核「`requestTurn(` 必须恰 2 处（入口 + composer 提交）」。若 composer submit 点（`sidepanel.ts:3756`）被删且流内输入走 `op.turn` 槽（`:3783`，已计 1），则计数降为 **1** ⇒ 必须**显式取代/重锚**该断言（X-IAN-6）。 | 主流程门禁；深度 = 中高；频率 = 一次性 |
| **Q-IAN-016** | **法四修订的载体未定。** 「原地修订法四（FR-CHAT-014 / AC-CHAT-007 重写）」vs「立法新法条（法十）+ supersede 法四」——两者对台账、密度/l0/journey 判据重锚清单、以及「法则清单」的连续性影响不同（F-34 已立法「法九」）。 | 立法层；深度 = 中高；频率 = 一次性 |
| **Q-IAN-017** | **流内输入卡的可访问性与法八/零明文口径。** 若输入卡**复用一个 `askuser` kind 卡**承载任意用户文本，则须确认：① 法八（明文不入流内 payload / digest / 审计 / DOM 四面）不被撞破（`law8-plaintext.mjs` 36→52 断言）；② 提交的文本**不是**一条 `chat` `user` 载荷以外的字段；③ 卡固化文案（`askFixedText`，`askuser.ts:112-124`）不泄漏值。 | 安全 / 可访问性；深度 = 中；频率 = 每次自由输入 |
| **Q-IAN-018** | **环境性 flake 家族被误读为回归（`KL-N-10`）。** v55 closeout §8 / F-34 validate 均登记 `page-input` 陈旧 fixture / `binding` CDP / `ask-auth` 陈旧 profile 等**环境性 flake**；本 Feature 触 `binding` / `journey` / `insight` 面较深 ⇒ 重构轮须隔离复跑 ≥2、不伪称首跑绿。 | 门禁执行；深度 = 低—中；频率 = 每轮 |

---

## 4. 竞品参考

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

**未做**外部竞品调研（如「AI 助手/IDE 侧栏如何把『自由输入』统一为一个 next/命令面板选项」「命令面板（command palette）与自由输入如何互斥或统一」「撤销一个流外输入面后的键盘/a11y 迁移」）。v5.5 / F-34 段亦未新增外部对标（`O-SELF-007` / `O-SGO-009`）。

> **不得**据此声称「竞品也这么做」或「无竞品这么做」。若 spec/plan 认为需要外部参照，应显式登记为待调研项（O-IAN-010）。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

> 本节只记录「本仓库已存在、已验收、可复用」的机制先例——它们是**事实**，不是推荐方案。

| 参照 | 事实 | 与本题域的关系（只述差异，不评优劣） |
|---|---|---|
| **卡内输入既有先例（`.ask-fallback`）** | `cards/askuser.ts:263-300`：`#ask-fallback`（`.ask-fallback`）内含 `#ask-input` / `#ask-submit`（`data-act="answer"`）/ `#ask-cancel` / hint；默认收起（text 型或 secret 除外，`:266`）；`:71-86` `setCardFallbackOpen` 互斥披露（展开即收起选项行）+ `input.focus()`；`:94-103` `setAskFallbackOpen` 文档级解析 `#ask-fallback` 归属卡 | **「输入发生在卡内」的现成先例**：本 Feature 的「自由输入 next」可直接扩展/复用该载体（**事实，非承诺**）；差异：`.ask-fallback` 现只服务「作答 / 描述」，**不服务"发起任意新回合"** |
| **next 注册表 + chip 即指令** | `next-registry/registry.ts`（`NextProvider` 注册）+ `providers.ts`（10 provider：5 触发恢复 + 2 op 驱动恢复 + 3 规则）；`cards/nextstep.ts:8-11`「chip 即指令，不填 composer」；`MAX_CHIPS_PER_CARD = 3`（`:30`）；chip 的 `data-act` / `data-op` 由 `ACT_TO_OP` 单源派生（`:52-63`） | 「自由输入…」若要成为 next 选项，**注册机制已存在**（新增 provider/act 的形态 = 开放点）；差异：现 chip **不承接任意文本**（`nextstep.ts:66-68` 明确「local act 的 label 不是输入」） |
| **`op.turn` = 唯一回合发起通道** | `ops.ts:29-35`「`op.turn` is the ONLY `requestTurn` caller」；`bindPanelOps.turn = (text) => requestTurn(text)`（`sidepanel.ts:3782-3784`）；`requestTurn` 定义 `:313`；`op.turn` ∈ `auto` 档 | 「输入提交」可复用 `op.turn` 槽（**与 chip 同一入口**）；差异：composer submit 现**不走注册表**（是 `requestTurn` 的第二个直连调用点），而 chip 走 `op.turn` 槽 |
| **SW 有界队列（R6）** | `turn-queue.ts`：`TURN_QUEUE_MAX = 1`、`classifyChatRequest`（`executed`/`queued`/`busy-rejected`）、`drain()` 自带引用快照（`QueuedTurn.refs`）；`service-worker.ts:924-940` 入队 + `chat-result{variant:'queued'}`；`:1050-1056` drain；`ARBITRATION_RESULTS`（`chat-events.ts:45`）含 `ai-deferred`（AI 路径不排队） | 队列**语义与裁决在 SW**，与"输入面在 DOM 哪里"**解耦**；本 Feature 只需保证**新入口仍调用 `runChat` 的用户路径**（**事实，非承诺**） |
| **面板侧排队留痕 + 草稿回填** | `sidepanel.ts:3904-3991`：`queued` ⇒「已排队」行（`system`/notice 载体，零新增 kind）；`busy-rejected` ⇒「正在处理上一条，未发送」+ `draftInput.value = rejected`（仅当输入框为空，否则不覆盖）；`turn-arbitration.test.ts` TA-4 机核「删掉回填即红」 | 回填载体是 `#input`（将被废除）；迁移要点 = **回填不可丢**、**不覆盖用户新输入**（**事实，非承诺**） |
| **法七扩展门禁形态 / 法九机核形态** | `test/law7x-ext.test.ts`（四类逐类 + 双向反证 + 三段控制禁恒真 + 真源切片）；F-34 新立 `test/law9-scope-reading.test.ts`（双向反证 + 注入必红 + 真源切片） | 「输入即 next」若要机核（法条可判），**形态已有先例**（**事实，非承诺**） |
| **保护段显式取代先例** | `insight-tree-hierarchy.test.ts:527,656`：v4-1 首次把 journey 保护段**显式取代**（保护段内读的是已退役的 `#log`/`#composer`，「零删除行」在语义上不可能成立）——走台账（`docs/v3-supersession-ledger.json`）+ 等价断言 + 强度不降 | 本 Feature 是**第二次**对同一批断言（含 journey/binding 保护段）做取代 —— **先例已立**，本轮按同一纪律执行（**事实，非承诺**） |
| **宿主结构性退役先例** | v4.5「4 宿主时间序化」（`decision`/`composer`/`l1-panels`/`strips` 清零）+ v5.5「5 条提示带单写化」（DOM 移除、**非 `hidden`**）；`host-registry.ts` `RETIRED_CONTAINER_IDS` + `RETIRED_HOST_ATTRS`（含 `composer` 宿主值） | 「**真退役（DOM 移除，非 hidden）**」的纪律与机制**已存在**；差异：`#composer` 本体被 v4.5 **明确保留**为兼容读取面（`host-registry.ts:144`），本 Feature 是**把这个保留决定反过来**（= 显式取代，**事实，非承诺**） |
| **零新增 kind / 零宿主 机核** | `messaging.ts` `KIND_SET` 40 逐字；`stream-model.ts` 12 kind；`host-registry.ts` 零宿主判据（`REGISTERED_STRUCTURAL_HOSTS = []`） | 流内输入若复用 `askuser` kind，则 **`KIND_SET` / 12 kind / 零宿主逐字不动**（**事实，非承诺**） |

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---|---|
| **A-IAN-001** | `#composer` 是「自由文本 → 发起回合」的**唯一**流外面（除它以外无第二处输入框） | 已证：`index.html` 仅 `#composer` 一个 `<form>`；`l0.mjs` ⑪ 读「工具栏/状态栏零输入框」（`#readOnlyPanel === 0`）——**已证（静态）** |
| **A-IAN-002** | 四处兜底入口**全部**收敛到 `revealAskFallback()`，而 `#composer` 只被**附带**reveal（无独立入口） | 已证：§7.3 逐条 `file:line`——**已证** |
| **A-IAN-003** | 「输入发生在卡内」**已有可用先例**（`.ask-fallback`），本问题域**不需要**新造输入机制 | 已证：`askuser.ts:263-300` + `:71-86`（含 focus / 互斥披露）——**已证**；边界：现只服务作答/描述（Q-IAN-003） |
| **A-IAN-004** | SW 有界队列语义**与输入面位置解耦**，新入口仍可走 `runChat` 用户路径 | 部分已证：`turn-queue.ts` 纯逻辑 + `service-worker.ts` 只按 `classifyChatRequest` 裁决（不看 DOM）——**实现面待验证** |
| **A-IAN-005** | `#composer` 的 DOM 退役**是负增量**（删 > 增），净体积可能不升档 | **待验证**（删面 ≈ 元素 + CSS + 两 writer + 锁存 ≈ 小负值；流内输入卡新增为正 ⇒ 净值须 spec 阶段**先预算**） |
| **A-IAN-006** | 门禁可**只增不减**地完成本 Feature（所有被删断言都有等价/更强重锚） | 参照已证：v4-1 保护段显式取代 + 等价改写先例（`insight-tree-hierarchy.test.ts`）——**逐条可行性待 spec 裁决**（O-IAN-008） |
| **A-IAN-007** | 流内输入**不新增 kind / 不新增宿主 / 不破法八** | 待验证：`KIND_SET` 40 + 12 kind + `law8-plaintext.mjs` 判据面；需 spec 明确"输入文本不进流内 payload / digest / 审计 / DOM 四面" |
| **A-IAN-008** | 手输提交复用 `op.turn` 槽**不会**侵蚀「AI 不得代答手势/consent」红线 | 待验证：`op.turn` ∈ `auto` 档（AI 可自主按）；需明确"用户手输"与"AI 驱动回合"在留痕/档位上可区分（Q-IAN-014） |
| **A-IAN-009** | 冻结面可保持零触碰（`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 / `base` 零 diff） | 复跑构建 + sha 逐字节核对——**待验证**（本轮零产品运行时验证） |
| **A-IAN-010** | 本轮 `.sddu/**` 只写本 Feature 目录，且 `src/` `test/` `dist/` `design/` `docs/` `ROADMAP.md` 零改动 | `git status --short` 复核（**本轮已遵守**） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 | 预登记证据 / 应对方向（**不作方案承诺**） |
|---|---------|:--:|---|
| **R-IAN-001** | **门禁/保护段重锚纪律被破坏（最高危）**：删断言 = 静默降强度；保护段 journey `42766..54004` / binding `107780..115930` 哈希变更**必须台账留痕**、**禁静默改写** | **高** | `v4-chat/spec.md:489`（保护段处置纪律）+ `supersession-ledger.test.ts:1452`（redlineRemap ≥3）+ `insight-tree-hierarchy.test.ts:527,656`（v4-1 取代先例）+ v4.5 closeout §4 第 6 条（反证恒绿教训）。**方向**：先出「逐条重锚清单」再动面；每条 deleted 断言必须有 old→new 映射 + 强度不降证明 |
| **R-IAN-002** | **R6 排队/草稿回填回归**：入口迁移后队列收不到用户输入，或 `busy-rejected` 回填断裂 | **高** | `turn-queue.ts` + `service-worker.ts:924-940,1050-1056` + `sidepanel.ts:3984-3991` + `turn-arbitration.test.ts:49,60`（TA-4 必红）。**方向**：回填载体迁移但**语义不变**（不丢原话 / 不覆盖新输入 / 有可读行） |
| **R-IAN-003** | **`requestTurn(` 恰 2 门禁与废除面冲突**（删 composer 提交点 ⇒ 计数变 1） | **高** | `op-wiring.test.ts:128-133`（机核恰 2）。**方向**：显式取代/重锚（X-IAN-6），不得静默改数 |
| **R-IAN-004** | **`op.turn` `auto` 档 vs 用户手输语义混淆** ⇒ 手输沦为 AI 可代答通道（侵蚀红线⑥精神） | **高** | `op-table.ts:134` 段注（auto 5 项含 `op.turn`）+ 红线⑥（consent/gesture 不得 AI 代答）+ `test/op-three-tier.test.ts`。**方向**：手输提交的档位/留痕显式区分；注入反证必须必红 |
| **R-IAN-005** | **体积越档位**：距档位仅 **22,454 B**（591,946 / 614,400），删面负增量 vs 新增输入卡正增量净值不明 | **中高** | `size-baseline.ts`（基线 591,946）+ `size-budget.test.ts`（生效上限 621,543）+ 档位 614,400 / 绝对 675,840 + `authorConfirmation = pending-author-line`（**未闭合义务，不得伪称已确认**）。**方向**：spec 先出**分列预算 + 缓冲校验**；不足 ⇒ 拆叶/减面；升档须**作者一行** |
| **R-IAN-006** | **法四修订的 supersession 台账不完整**（§二 保护段 + 历史 `redlineRemap` ≥3 不得删） | **中高** | `docs/v3-supersession-ledger.json` + `supersession-ledger.test.ts:1452` + `v4-chat/spec.md:308,489`（FR-CHAT-082 / 保护段逐段决策）。**方向**：老 remap 保留 + 新增本轮 old→new 条目 |
| **R-IAN-007** | **法八（零明文）被输入卡撞破**：任意用户文本若进流内 payload / digest / 审计 / DOM 四面 ⇒ 直接红 | **中高** | `law8-plaintext.mjs`（36→52 断言）+ `askuser.ts` `askFixedText`（固化只写 FACT）+ `ai-drive.ts:85`（留痕只含字段名）。**方向**：输入文本仅走 `chat` `user` 载荷；固化文案不得回显值 |
| **R-IAN-008** | **`KIND_SET` 40 / 12 kind / 零宿主被撞**：输入卡若新增 kind、输入若新增消息 kind ⇒ `content.js` 增长（零容差） | **高** | `messaging.ts` `KIND_SET` 40 + `stream-model.ts` 12 kind + `host-registry.ts` 零宿主。**方向**：复用 `askuser` kind + 既有 `chat` 载荷；type-only 先例家系 |
| **R-IAN-009** | **a11y focus 流断裂**（`#input` 是既有 focus 目标） | **中** | `askuser.ts:85`（卡内 focus 先例）+ `l0.mjs` ⑪（"输入可用"）。**方向**：focus 落到流内输入；键盘路径等价 |
| **R-IAN-010** | **e2e / binding 诊断面牵动**（`DIAG_SELECTORS` / 真实键入 `#input`+`#send` / `#send.disabled`） | **中高** | `binding.mjs:69,115,905,1034-1096` + v2 保护段 `107780..115930`。**方向**：诊断选择器替换为流内输入；真实键入路径等价 |
| **R-IAN-011** | **`#send-reason` / `buttonStates` 耦合面误删**（状态提示 ≠ 输入面） | **中** | `view-model.ts:298-315,384-400` + `host-registry.ts:295-321`（保留要素）+ `sidepanel.ts:2394`。**方向**：先裁决状态提示去留（O-IAN-006）再动面 |
| **R-IAN-012** | **环境性 flake 被误读为回归（`KL-N-10`）** | **低—中** | v55 closeout §8 + F-34 validate（`page-input` / `binding` / `ask-auth` flake）。**方向**：隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞 |
| **R-IAN-013** | **方案先行**：开放点在 spec 前被顺手定下（如先选形态/法条载体） | **中高** | 本报告 §6.2 已把形态/载体/计数/体积全部登记为 O-IAN-\*；**方向**：spec 阶段批量裁决，discovery 零预设 |

---

## 6. 下一步建议

### 6.1 优先聚焦（移交 spec 的问题）

| 优先级 | 事项 | 说明 |
|:--:|---|---|
| **高** | **Q-IAN-003「自由输入」next 形态**（O-IAN-002） | 本 Feature 的**新面**；形态定了才能定通道与体积。**先于废除面**（先立新面再拆旧面，避免中间态无输入可用） |
| **高** | **Q-IAN-001/002 `#composer` 废除面 + 双写者/锁存消解**（O-IAN-003） | 作者裁决核心；DOM 真退役 + 两个 writer + 锁存 + 设置态护栏一并消解 |
| **高** | **Q-IAN-004 R6 排队/草稿回填迁移**（O-IAN-004） | 直接回归风险；入口迁移不改队列语义，回填载体迁移不丢原话 |
| **高** | **Q-IAN-006 门禁/保护段重锚清单**（O-IAN-008） | 决定本 Feature 是否静默降强度；**先出清单再动面** |
| **中** | **Q-IAN-005/016 法四修订载体**（O-IAN-007） | 原地修订 vs 新法条 + supersede；影响台账与判据清单 |
| **中** | **Q-IAN-007 四处兜底收敛**（O-IAN-005） | 现状已收敛到卡内；只需停止"附带 reveal 流外面" |
| **中** | **Q-IAN-008/009/010/011 状态提示 / 草稿 / a11y / 引导文案**（O-IAN-006 + 重锚清单） | 次生面；随废除面一起处理 |
| **中** | **Q-IAN-013 体积分列预算**（O-IAN-009） | 距档仅 22,454 B；**先预算再落地**（v5 低估 2.8× 教训） |
| **低** | **Q-IAN-014/015/017 `op.turn` 档位 / `requestTurn(` 计数 / 法八口径** | 由 spec 在通道与判据一并裁决 |

### 6.2 开放问题（**收集后附推荐；由 spec 批量裁决**）

| ID | 开放点 | 推荐（discovery 建议，非定论） |
|---|---|---|
| **O-IAN-001** | **命名与版本位**：树名 / Feature ID / 版本位 | **推荐接受编排器建议**：树名 `specs-tree-web-cli-plugin-v55-f-input-as-next`（承 F-34 `v55-f-` 补丁级跟进轮惯例）、Feature ID `F-35`、版本位 `v0.11.2`（v0.11.0（F-33）主题的 patch 级跟进轮）；ROADMAP 登记**留给收口**（本阶段零 diff） |
| **O-IAN-002** | **「自由输入」next 的形态**：常驻选项？按需出现（何时）？点开后流内输入行 / 卡内输入（`.ask-fallback` 先例扩展）？提交走什么？ | **推荐**：在**下一步推荐区按需出现一个最末项「自由输入…」**（与「其他…（我来描述）」同构，**不常驻**）；点开后**就地展开卡内输入**（复用/扩展现有 `#ask-input` / `.ask-fallback` 先例；**不新增常驻输入框、不新增卡 kind**）；提交**复用 `op.turn` 槽**（`bindPanelOps.turn → requestTurn`）；何时出现 = 开放给 spec（候选：无其他 next 时 / 恒作末项 / 仅文本意图时） |
| **O-IAN-003** | **`#composer` 废除面的处置**：DOM 元素、`view-model buttonStates/#send-reason`、R6 排队入口、测试钩子 `hideFallback`、a11y focus | **推荐**：① `#composer` / `#input` / `#send` **真退役（DOM 移除，非 `hidden`）**；② 删除 `syncComposerVisibility` + `fallbackOpen` 锁存；`l0.revealFallback/hideFallback` 只操作卡内 `.ask-fallback`；③ 测试钩子 `hideFallback` 重锚或退役；④ `NEVER_FOLDABLE` / 兼容读取面登记同步退役；⑤ a11y focus 落到卡内输入（沿用 `askuser.ts:85` 先例） |
| **O-IAN-004** | **R6 排队 / 草稿回填去向** | **推荐**：**保留** SW 有界队列语义（`TURN_QUEUE_MAX=1` / drain / `queued` / `busy-rejected`）；提交入口改为流内输入经 `op.turn` 槽；`busy-rejected` **草稿回填载体迁到流内输入**（若卡已收起 ⇒ 重新展开并回填；仍**不覆盖**用户新输入） |
| **O-IAN-005** | **四处兜底入口统一形态** | **推荐**：全部统一到卡内 `.ask-fallback`（现状已收敛）；`op.describe` 无值相 = 展开卡内兜底输入（不变），有值相 = 提交描述（不变）；**停止** `l0.revealFallback` 附带 reveal 流外面 |
| **O-IAN-006** | **状态栏原因行 `#send-reason` / `sendDisabled` 去留** | **推荐**：**保留**（状态提示 ≠ 输入面；`host-registry.ts:295-321` 本就是保留要素），但**重新锚定**到流内输入的 disabled reason（仅无活跃站点） |
| **O-IAN-007** | **法四修订载体** | **推荐**：**原地修订法四**（重写 `v4-chat/spec.md:116` / FR-CHAT-014 / AC-CHAT-007 为「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」）+ supersession 台账登记 old→new；**可选**升格「法十」并 supersede 法四（若强调语义断裂）；判据重锚清单同步 |
| **O-IAN-008** | **`requestTurn(` 恰 2 门禁重锚** | **推荐**：显式取代 X-IAN-6 —— 重锚为「**恰 1 个生产输入提交点**（流内输入卡，经 `op.turn` 槽）」；若需保 2，则流内输入提交点即原 composer 提交位的等价物（语义重定义） |
| **O-IAN-009** | **体积预算与叶拆分** | **推荐**：spec **先出分列预算 + 缓冲校验**（距档 22,454 B；净增须 ≤ 余量否则拆叶/减面；升档走 EC 显式路径 + 作者一行）；**2 叶**（见 §6.3） |
| **O-IAN-010** | **是否需要外部竞品调研** | **推荐不需要**（内部架构一致性问题；「把流外输入面并入 next」无外部对标必要） |
| **O-IAN-011** | **`op.turn` `auto` 档与手输语义边界** | **推荐**：手输提交**不复用 `op.turn` 的 AI 自主档语义**——在留痕/档位上显式区分「用户手输回合」与「AI 驱动回合」（承红线⑥精神，注入必红） |

### 6.3 叶拆分建议（**discovery 只提建议，最终由 spec/作者裁决**）

**🔍 检测到可能存在 Feature 拆分机会**（编排器预判 + 本报告复核）：

```
- 新面/旧面 分离模式：本主题同时包含「建立一个流内输入面」与「废除一个流外输入面」两类工作，
  风险面与提交序不同（新面必须先立，旧面才能拆）
  建议拆分为:
  - specs-tree-ian-1-free-input-next: 流内「自由输入…」next 通道（形态 + 卡内输入 + op.turn 槽 + R6 排队/回填迁移 + a11y focus）
  - specs-tree-ian-2-abolish-composer: 废除 #composer 流外面（DOM 真退役 + 双写者/锁存消解 + 四处兜底收敛 + 法四修订/台账 + 判据与保护段重锚 + 体积重登记）
```

| 方案 | 叶序 | 交付 | 理由 |
|---|---|---|---|
| **推荐：2 叶（依存序）** | 叶1 `...-ian-1-free-input-next` → 叶2 `...-ian-2-abolish-composer` | 叶1 = 新入口 + 通道 + 迁移；叶2 = 废面 + 立法 + 门禁/保护段重锚 | ① **交付序安全**：先立流内输入，再拆流外输入 ⇒ 中间态无"无输入可用"窗口；② **风险面不同**（新通道/队列迁移 vs DOM 退役/门禁重锚/立法台账）；③ **体积必须分列**（叶1 正增量、叶2 负增量 ⇒ 净值不可混算）；④ 验收锚层次不同（叶1「输入仍可达 + 排队/回填不回归」；叶2「流外零输入面 + 门禁强度不降」） |
| 备选：单叶 | — | 全部 | 若工作量小且体积可在余量内一次闭合，可退化为单叶 + 内部分组；本报告**不推荐**（删除面 + 保护段重锚 + 立法，工作与风险面足以分叶） |

> **拆分由用户/spec 决策**：回复 `accept`（接受上述 2 叶）/ `reject`（拒绝，单叶）/ `custom`（自定义）。

### 6.4 移交清单

- **移交 spec**：§3 问题清单（Q-IAN-001~018）+ §5 假设/风险 + §6.2 开放点（附推荐）+ §7 事实附录（依赖面全景 / 现状映射 / 兜底入口 / 门禁盘点 / 取代候选 / 命名占位）。
- **移交 plan**：§7.4 门禁盘点（逐文件断言位置）+ §7.5 取代候选（X-IAN）+ §5.2 体积/保护段风险。
- **本阶段零方案承诺**：§6.2 的"推荐"仅用于 spec 批量裁决参考，**不构成方案评估**。

---

## 7. 事实附录（**逐条 `file:line`，供 spec/plan 追溯；不构成方案**）

### 7.1 `#composer` 依赖面全景（**枚举**）

> 写作/读取 `#composer` / `#input` / `#send` 的生产点与门禁点。**行号 = 本轮 HEAD `ce29665` 实测。**

**A. DOM 定义与样式**

| # | 位置 | 事实 |
|:-:|---|---|
| A1 | `src/ui/sidepanel/index.html:1419-1422` | `<form id="composer" hidden><input id="input" type="text" placeholder="输入指令…" autocomplete="off" /><button id="send" type="submit">发送</button></form>`（`body` 尾，`#settings-view` 之后、`<script>` 之前） |
| A2 | `src/ui/sidepanel/index.html:577-598` | CSS：`#composer`（`display:flex`）/ `#input`（`:578`）/ `#input::placeholder` / `#input:disabled` / `#send` / `#send:hover` |
| A3 | `src/ui/sidepanel/index.html:513, 576` | `#send-reason` CSS（状态栏内，与 composer 无关但同族） |
| A4 | `src/ui/sidepanel/index.html:670-672` | `body.settings-open` 隐藏 `#region-toolbar` / `#region-stream` / `#region-statusbar` —— **不含 `#composer`**（D-C） |
| A5 | `src/ui/sidepanel/index.html:1414-1418` | 注释：v4.5「出流」，id / ARIA / 内部结构「**零变化**」 |

**B. 生产 JS（写者 / 读者 / 入口）**

| # | 位置 | 事实 |
|:-:|---|---|
| B1 | `src/ui/sidepanel/sidepanel.ts:2883` | `let fallbackOpen = false;`（历史锁存，D-B） |
| B2 | `src/ui/sidepanel/sidepanel.ts:2884-2891` | `syncComposerVisibility()`（护栏 writer；`composer.hidden = !(fallbackOpen && chatVisible)`） |
| B3 | `src/ui/sidepanel/sidepanel.ts:2893-2898` | `revealAskFallback()` → `ensureTextAskCard()` + `l0?.revealFallback()` + `fallbackOpen = true` + sync |
| B4 | `src/ui/sidepanel/sidepanel.ts:2312` | `if (state.ask?.kind === 'text') l0?.revealFallback();`（text ask 直开） |
| B5 | `src/ui/sidepanel/sidepanel.ts:2245` | `render()` 内调 `syncComposerVisibility()` |
| B6 | `src/ui/sidepanel/sidepanel.ts:3616` | `openL2View()` 非 settings 分支调 `syncComposerVisibility()` |
| B7 | `src/ui/sidepanel/sidepanel.ts:3607-3613` | `openL2View('settings')` **提前 return，不调 sync**（D-C） |
| B8 | `src/ui/sidepanel/sidepanel.ts:3749-3760` | `$('composer').addEventListener('submit', …)` → `requestTurn(input.value)` + `proactivity.noteUserTurn()` + `input.value = ''` |
| B9 | `src/ui/sidepanel/sidepanel.ts:850-858` | 测试钩子 `__v3.testing.revealFallback()/hideFallback()`（`hideFallback` = **唯一生产外复位**） |
| B10 | `src/ui/sidepanel/sidepanel.ts:1337-1341` | `settingsViewSwitch` `getDraft`/`setDraft` 读写 `#input.value` |
| B11 | `src/ui/sidepanel/sidepanel.ts:2394-2423` | `renderSendReason()` 写 `#send-reason`（由 `sendDisabledReason` 派生） |
| B12 | `src/ui/sidepanel/sidepanel.ts:3980-3991` | `chat-result` `queued`/`busy-rejected` 分支；`busy-rejected` ⇒ `draftInput.value = rejected`（`$('input')`） |
| B13 | `src/ui/sidepanel/l0/shell.ts:90-105` | `revealFallback`/`hideFallback`（**第二 writer**，无条件直写 `composer.hidden`，D-A） |
| B14 | `src/ui/sidepanel/l0/shell.ts:34-36` | `L0Handle` 声明 `revealFallback` / `hideFallback` |
| B15 | `src/ui/sidepanel/sidepanel.ts:3650` | `l0` 装配 `revealFallback: () => revealAskFallback()` |
| B16 | `src/ui/sidepanel/view-model.ts:298-315` | `sendDisabledReason()`（读 `flow.sendDisabled` / `canSubmitOpenAsk`） |
| B17 | `src/ui/sidepanel/view-model.ts:384-400` | `buttonStates()`（R6：`sendDisabled: !hasOrigin`） |
| B18 | `src/ui/sidepanel/view-model.ts:404-423` | `AskFlowView`（`sendDisabled` / `canSubmitOpenAsk` / `recommendDisabled`） |
| B19 | `src/ui/sidepanel/view-model.ts:350` | `ONBOARDING_TEXTS[4]`「在输入框输入指令并发送，开始对话」（指向 `#input`） |
| B20 | `src/ui/sidepanel/disclosure.ts:164` | `NEVER_FOLDABLE` 含 `'composer'`（`:147` 注释说明 12−1+3=14） |
| B21 | `src/ui/sidepanel/disclosure.ts:69` | 注释：`#composer` 永不折叠 |
| B22 | `src/ui/sidepanel/host-registry.ts:114-145` | `composer` ∈ `RETIRED_HOST_ATTRS`（退役**宿主值**）；但 `#composer`/`#input`/`#send` 为 **PRESERVED 兼容读取面**（`:144-146`） |
| B23 | `src/ui/sidepanel/host-registry.ts:235, 295-321, 352-386` | `send-reason` 通道条目（保留要素）+ 单写判据（`#send-reason` 必须仍在状态栏） |
| B24 | `src/ui/sidepanel/sidepanel.ts:1107-1108` | 注释：`composer` 是退役宿主值，而 `#composer` 本体是保留兼容面 |
| B25 | `src/ui/sidepanel/stream-render.ts:66-71` | 注释：`composer` 宿主已随锚点退役 |
| B26 | `src/ui/settings/view-switch.ts:7` | 注释：draft 跨视图保持 |
| B27 | `src/ui/sidepanel/nextstep.ts:8-11` | 「chip 即指令，**不填 composer**」（产品语义证据） |
| B28 | `src/ui/sidepanel/stream-model.ts:247` | 注释：`next` 经 composer 自身入口；`repick`/`describe` 为本地恢复 |

**C. 门禁盘点（**哪些断言钉了 `#composer` / `#input` / `#send`**）**

> 逐文件、逐位置；「命中数」= 该文件含 `composer` / `'input'` / `'send'` 字面量（含注释）的行数（本轮实测）。**注意**：`insight.mjs` / `notify-tools.test.ts` 的多数命中是消息 `send()`，非 `#send` 按钮；下表已区分。

| 层 | 文件 | 命中 | 关键断言位置（逐条） |
|---|---|---|---|
| node | `test/op-wiring.test.ts` | 5 | `:11` / `:66` / `:128-133`（**`requestTurn(` 必须恰 2：入口 + composer 提交**）/ `:361` |
| node | `test/turn-arbitration.test.ts` | 2(+6) | `:12` / `:49`（**TA-4 `busy-rejected` 必须回填 `#input`，删掉即红**）/ `:60`（`draftInput.value = rejected`） |
| node | `test/r6-ty-experience-fix.test.ts` | 3 | `:9` / `:169-173`（**在飞不再硬禁用 composer**） |
| node | `test/sidepanel-view.test.ts` | 4 | `:115-120`（**R6：在飞仍可提交**）/ `:281`（`#input` CSS flex）/ `:657-659`（`<form id="composer" hidden>`） |
| node | `test/density-thresholds.test.ts` | 22 | `:102` / `:115-116`（`#composer`/`#input`/`#send`/`#send-reason` **保留**）/ `:141`（idsIndex 列表）/ `:389-409`（**#composer body 尾 + hidden + 之后无布局元素**）/ `:754-776`（`RETIRED_HOST_ATTRS` 含 composer；`:775` **`#composer` 不得入 `RETIRED_CONTAINER_IDS`**；`:776` `<form id="composer" hidden>`）/ `:787-814`（`#send-reason` 保留）/ `:864`（离开状态栏必红） |
| node | `test/host-registry.test.ts` | 4 | `:191`（零宿主反证含 `composer`）/ `:260`（`RETIRED_HOST_ATTRS` = decision/composer/l1-panels/strips）/ `:282` / `:313` |
| node | `test/supersession-ledger.test.ts` | 1 | `:1452`（**redlineRemap ≥3，含「composer 贴底」**） |
| node | `test/insight-tree-hierarchy.test.ts` | 3 | `:527` / `:656-657`（**journey 保护段显式取代：段内逐字读 `#log`/`#composer`**） |
| node | `test/settings.test.ts` | 1 | `:191`（**composer draft restored**） |
| node | `test/size-baseline.ts` | 7 | `:560` / `:1279` / `:1504-1506`（v4.5 composer 出流登记）/ `:2237` / `:3098` / `:3177` / `:3246` |
| Chromium | `test/ui/insight.mjs` | 41 | `:18-19`（`#I-08` 贴底 / `#I-09` FAB∩composer）/ `:70` / `:128`（法四默认 hidden）/ `:358` / `:423` / `:461-471`（兜底展开态 composer 可见 + 不越视口 + 交面积 0）/ `:655`（原始口径）/ `:818` |
| Chromium | `test/ui/journey.mjs` | 23 | `:668`（`#send.disabled`）/ `:843-885`（**#15c 法四 + 出流 + body 尾 + hidden**；**保护段 `42766..54004`**）/ `:1088`（窄宽 composerW）/ `:1106` / `:1338`（草稿 `#input.value`）/ `:1367` |
| Chromium | `test/ui/l0.mjs` | 21 | `:18` / `:228` / `:321` / `:375-376`（③ composer hidden + body 尾 + 不进 `#stream`）/ `:1076`（⑪ 默认 hidden）/ `:1081-1095`（**⑪ 兜底展开后 `#ask-fallback` 与 `#composer` 均可见** + 收起后均 hidden）/ `:1321`（BLOCK-03 单写判据） |
| Chromium | `test/ui/binding.mjs` | 11 | `:49` / `:59` / `:69`（`composerHidden` + `inputDisabled`）/ `:115`（**`DIAG_SELECTORS` 含 `composer`**）/ `:905`（`#send.disabled` + `#send-reason`）/ `:1034-1038`（**真实键入 `#input` + realClick `#send`**）/ `:1094-1096`（**保护段 `107780..115930`**） |
| Chromium | `test/ui/recommendation.mjs` | 6 | `:146-161` / `:261` / `:296`（chip 提交**不填** `#input`） |
| Chromium | `test/ui/s0-self-driven.mjs` | 2 | `:900-902`（驱动 `#input` + `#composer` submit 事件） |
| Chromium | `test/ui/l1.mjs` | 1 | 间接 |
| Chromium | `test/ui/hardening.mjs` | 1 | 间接 |
| 其他 | `test/notify-tools.test.ts` | 6 | 多为消息 `send()`（**非 `#send` 按钮**，须逐条区分） |
| 其他 | `test/settings-help.test.ts` / `test/system-merge.test.ts` | 1 / 1 | 间接 |
| 对账 | `test/parity/baseline-catalog.json` | 1 | 对账基线登记 |

> **门禁计数（上游实测，本轮引用不自造）**：`npm test` **1394** · l0 **248** · density **242** · journey **171** · insight **118** · binding **192** · page-input **125** · `CHROMIUM_GATES === 9`。
> **保护段（须逐段决策 + 哈希变更台账留痕）**：journey `42766..54004`（`#15a~#15q`，sha256 `6b45c3fa…`；逐字读 `getElementById('log')` / `('composer')`）；binding `107780..115930`。

### 7.2 「自由输入」next 现状映射（**已有 / 缺失**）

| 维度 | **已有**（可复用事实） | **缺失**（本 Feature 问题域） |
|---|---|---|
| **next 选项机制** | `NextProvider` 注册表（契约 v2；`registry.ts` / `providers.ts`；10 provider；`registerNextProvider`）；chip 渲染（`nextstep.ts`，`MAX_CHIPS_PER_CARD = 3`）；`ACT_TO_OP` 单源分发（`dispatch.ts`） | **无**「自由输入…」provider / act / chip；chip **不承接任意文本**（`nextstep.ts:66-68`） |
| **回合发起通道** | `requestTurn(text)`（`sidepanel.ts:313`）= **唯一**回合入口；`op.turn` 槽（`bindPanelOps.turn`，`:3782-3784`）；`op.turn` 行 `['op.turn','panel','card-boundary',false,false]`（`op-table.ts:100`）；`chat` 载荷 = `{ user }` | composer submit（`:3756`）**不走注册表**，是 `requestTurn` 的**第二个直连调用点**；**无**「输入提交」的注册表内通道（`requestTurn(` 恰 2 的作用） |
| **输入载体** | `.ask-fallback` 卡内输入（`askuser.ts:263-300`；`#ask-input`/`#ask-submit`/`#ask-cancel`；`:71-86` 互斥 + focus；`:94-103` 文档级解析）——**既有先例**；text ask 直开（`sidepanel.ts:2312`） | 卡内 `.ask-fallback` 只服务「作答 / 描述」，**不服务"发起任意新回合"**；`#composer` 是**唯一**自由输入面且**在流外** |
| **排队 / 草稿** | SW 有界队列（`turn-queue.ts`；`service-worker.ts:924-940,1050-1056`）；面板 `queued`/`busy-rejected` 留痕 + 回填 `#input`（`sidepanel.ts:3904-3991`） | **入口与回填载体绑 `#composer`**；流内输入尚无对应路径 |
| **本地描述通道** | `op.describe`：有值 ⇒ `submitDescribe`（本地 ask 结算，**不发 SW、不成回合**）；无值 ⇒ `revealAskFallback`（`sidepanel.ts:3786-3789`；`ops.ts:62-63`） | 「描述」与「自由输入发起回合」**语义不同**，不得混用（`nextstep.ts:66-68` 已防 label 被当输入） |
| **法条** | 法四（输入按需出现：无常驻输入框；text 输入框只在卡内；`v4-chat/spec.md:116,225,385`）；法一（一切交互皆消息）；法七（禁止死端）；法九（范围读数） | **无**「流外零输入面」法条；法四**默许**流外按需输入框（Q-IAN-005） |

### 7.3 四处兜底入口（**逐条 `file:line`**）

| # | 入口 | 位置 | 现状调用 | 目标（问题域描述） |
|:-:|---|---|---|---|
| E1 | 决策区末项「其他…（我来描述）」 | `cards/decision-region.ts:163-170`（`terminal.addEventListener('click', () => deps.onRevealFallback?.())`） | → `onRevealFallback`（`sidepanel.ts:223`）→ `revealAskFallback()` | 只 reveal 卡内 `.ask-fallback`（现状已对；**停止**附带 reveal `#composer`） |
| E2 | `op.describe` 参数相（无值） | `sidepanel.ts:1512-1515` | → `revealAskFallback()` | 同上 |
| E3 | L1 面板装配 | `sidepanel.ts:3650`（`revealFallback: () => revealAskFallback()`） | → `revealAskFallback()` | 同上 |
| E4 | `bindPanelOps.describe` 空值 | `sidepanel.ts:3786-3789`（`if (value) submitDescribe(value); else revealAskFallback();`） | → `revealAskFallback()`（空值）/ `submitDescribe`（有值） | 空值相同上；有值相不变 |
| **+** | **附带 writer** | `sidepanel.ts:2895` → `l0?.revealFallback()` → `l0/shell.ts:98-99` | **无条件 reveal `#composer`** | **废除**（这是唯一把流外面拉进来的点） |
| **+** | `ref` 卡「改用描述」按钮 | `cards/ref.ts:154-170`（`data-act="describe"`）→ `recommend.ts:315`（`describe: '改用描述'`）→ `nextstep.ts` chip → `bindPanelOps.describe` | 经 E4 | 不变（经 E4 收敛） |

> **结论性事实**：四个入口**全部**汇聚到 `revealAskFallback()`；`#composer` **没有独立入口**，只被 `revealAskFallback → l0.revealFallback` **附带**展开（§0.2 F-4 / A-IAN-002）。

### 7.4 门禁盘点（汇总，逐条见 §7.1C）

| 类别 | 数量 | 说明 |
|---|---|---|
| node 测试文件钉了 `#composer`/`#input`/`#send` | **10** | `op-wiring` / `turn-arbitration` / `r6-ty-experience-fix` / `sidepanel-view` / `density-thresholds` / `host-registry` / `supersession-ledger` / `insight-tree-hierarchy` / `settings` / `size-baseline`（另 `notify-tools` / `settings-help` / `system-merge` 为间接或消息 `send`） |
| Chromium 门禁钉了 `#composer` | **8** | `insight` / `journey` / `l0` / `binding` / `recommendation` / `s0-self-driven` / `l1` / `hardening` |
| **保护段** | **2** | journey `42766..54004`（sha `6b45c3fa…`）/ binding `107780..115930`（哈希变更须台账留痕） |
| 历史取代台账条目 | ≥3 | `redlineRemap` 含「composer 贴底」（`supersession-ledger.test.ts:1452`）——**须保留** |

### 7.5 显式取代候选（**X-IAN-\*；spec 阶段逐条裁决**）

> 本 Feature **要删一个面**，因此取代是**显式**的（不静默改写）。每条 = old → new（等价/更强）+ 台账留痕。

| ID | 被取代对象（old） | 事实位置 | 取代方向（new，**问题域描述，非方案**） | 状态预登记 |
|---|---|---|---|---|
| **X-IAN-1** | **法四**「输入按需出现：无常驻输入框；`ask-user` text 输入框只在卡内」 | `v4-chat/spec.md:116`（法则表）/ `:225`（FR-CHAT-014）/ `:385`（AC-CHAT-007） | **修订为**「输入即 next：自由文本输入是流内 next 的一个选项；**流外零输入面**」 | **已发生（本轮立项裁决）**；条文落地待 spec（O-IAN-007） |
| **X-IAN-2** | `#composer`/`#input`/`#send` 为**保留（兼容读取面）** | `host-registry.ts:144-146`（PRESERVED 列表）/ `density-thresholds.test.ts:115-116, 768`（保留面反证） | **入退役面**（DOM 真退役，非 `hidden`） | 预登记（待 spec） |
| **X-IAN-3** | `#composer` **不得**入 `RETIRED_CONTAINER_IDS`（反证） | `density-thresholds.test.ts:775` | **入退役容器册**（本体真退役） | 预登记 |
| **X-IAN-4** | `<form id="composer" hidden>` + body 尾 + 「之后无布局元素」 | `density-thresholds.test.ts:776, 389-409` / `sidepanel-view.test.ts:657-659` / `journey.mjs:843-885`（#15c）/ `l0.mjs:375-376,1076`（③⑪）/ `insight.mjs:128,655`（#I-08b）/ `binding.mjs:69` | **等价重锚**为「**流外零输入面**（`#composer`/`#input`/`#send` 均不在 DOM）」+ 流内输入卡存在与可用 | 预登记 |
| **X-IAN-5** | `#I-08`（composer 贴底 ∈[0,+8px]）/ `#I-09`（`#tree-fab` ∩ `#composer` = 0） | `insight.mjs:18-19, 461-471, 655` | **随元素退役消解**或重锚到流内输入卡几何（v4 已把「贴底」取代，本轮退役元素本身） | 预登记 |
| **X-IAN-6** | `requestTurn(` **必须恰 2**（入口 + composer 提交） | `op-wiring.test.ts:128-133, 361` | **重锚**为「恰 1 个生产输入提交点（流内输入，经 `op.turn` 槽）」或语义重定义 | 预登记（O-IAN-008） |
| **X-IAN-7** | `busy-rejected` 草稿回填 `#input` | `turn-arbitration.test.ts:49,60` / `sidepanel.ts:3984-3991` | **重锚**回填载体到流内输入（语义不变：不丢原话 / 不覆盖新输入 / 有可读行） | 预登记（O-IAN-004） |
| **X-IAN-8** | 设置 ⇄ chat 草稿保持 `#input` | `sidepanel.ts:1337-1341` / `settings.test.ts:191` | **重锚**到流内输入（或明确退役该能力） | 预登记（Q-IAN-009） |
| **X-IAN-9** | `NEVER_FOLDABLE` 含 `'composer'` | `disclosure.ts:164`（+ `:69,147`） | **退役**（元素不存在 ⇒ 无需永不折叠） | 预登记 |
| **X-IAN-10** | 首装引导「在**输入框**输入指令并发送」 | `view-model.ts:350`（`ONBOARDING_TEXTS[4]`） | **改指**流内 next 的「自由输入…」选项 | 预登记（Q-IAN-011） |
| **X-IAN-11** | `binding.mjs` `DIAG_SELECTORS` 含 `composer` + 真实键入 `#input`/`#send` | `binding.mjs:115, 905, 1034-1096` | **重锚**诊断面到流内输入 | 预登记（Q-IAN-012） |

> **注意**：X-IAN 是**取代候选清单**（供 spec/plan 裁决与台账登记），**不是**已裁决的取代。老台账条目（v4/v4.5/v5/v5.5/F-34 的 `X-*`）**一律保留不动**。

### 7.6 命名 / 版本 / 占位实测（**本轮只读复核**）

| 项 | 实测值 | 方式 |
|---|---|---|
| 分支 / HEAD | `feature/web-cli-plugin` @ **`ce29665`** | `git rev-parse HEAD` |
| 工作区 | **clean**（`nothing to commit, working tree clean`） | `git status` |
| F-35 半成品 | **无**（无 `specs-tree-web-cli-plugin-v55-f-input-as-next/` 目录、无 `F-35` 命中） | `ls` + `grep` |
| `F-35` 占用 | **0 命中** | `grep -rn "F-35" --include=*.md/--include=*.json/--include=*.ts/--include=*.mjs`（排除 `node_modules`/`.git`） |
| `v0.11.2` 占用 | **0 命中** | 同上 |
| `input-as-next` / `inputAsNext` 占用 | **0 命中** | 同上 |
| 上游版本 | ROADMAP **v1.31.0**（F-34 v0.11.1 已登记） | `ROADMAP.md` 头部 |
| 体积现状 | `sidepanel.js` **591,946 B** · 档位 **614,400** · 绝对上限 **675,840** · 生效上限 `floor(591,946×1.05)=`**621,543** · 距档位 **22,454 B** · `authorConfirmation = pending-author-line` | F-34 closeout（`state.json#closeout`）+ ROADMAP v1.31.0 |
| 冻结面 | `content.js` **177,076 B**（sha `52a82620…`）· `pick-layer.js` **34,358 B**（sha `77796bab…`）· `KIND_SET` **40** · 12 kind · 零宿主 · base 零 diff | F-34 closeout |
| 门禁计数 | `npm test` **1394** · l0 248 · density 242 · journey 171 · insight 118 · binding 192 · page-input 125 · `CHROMIUM_GATES === 9` | F-34 closeout（**本轮引用，未复跑**） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin F-35「输入即 next：废除流外独立输入框」问题挖掘）—— 含作者裁决逐字（§0.1）+ 诊断证据三条缺陷复核（§0.2）+ `#composer` 依赖面全景枚举（§7.1）+ 「自由输入」next 现状映射（§7.2）+ 四处兜底入口盘点（§7.3）+ 门禁盘点（§7.4）+ 显式取代候选 X-IAN-1~11（§7.5）+ 命名/版本/占位实测（§7.6）+ 问题清单 Q-IAN-001~018 + 假设 A-IAN-001~010 + 风险 R-IAN-001~013 + 开放点 O-IAN-001~011（附推荐）+ 叶拆分建议（2 叶） | 2026-09-24 | SDDU Discovery Agent |
