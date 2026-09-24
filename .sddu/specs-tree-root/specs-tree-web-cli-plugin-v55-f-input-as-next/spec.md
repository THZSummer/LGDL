# Feature Specification：specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本目录 `discovery.md` v1.0（2026-09-24）——问题清单 **Q-IAN-001~018**（核心 7 / 次要 5 / 潜在 6）/ 假设 **A-IAN-001~010** / 风险 **R-IAN-001~013** / 开放问题 **O-IAN-001~011**（附推荐）/ 事实附录 §7（`#composer` 依赖面全景 A1~B28 / 「自由输入」next 现状映射 / 四处兜底入口 / 门禁盘点（node 10 + Chromium 8 + 2 保护段）/ 显式取代候选 **X-IAN-1~11** / 命名占位实测）/ 叶拆分建议（2 叶，依存序）
> **直接输入**: ① **作者裁决（2026-09-24，立法级，逐字保留）**：「不能打破 all-in-chat/next。既然由 next/chat 驱动用户选择/输入，那自然输入框也是在 chat 里面的 next 里面的一个选项，**不应该存在单独的输入框**」② **编排器裁决 O-IAN-001~011（全部采纳 discovery 推荐项；本规范登记为「已裁决」）** ③ 编排器已完成的只读诊断（`#composer` 显隐「与历史相关而非与状态相关」的三处缺陷 D-A / D-B / D-C）④ 上游收口总账 `../specs-tree-web-cli-plugin-v55-f-scope-governance/closeout.md`（F-34 两叶 `validated` + 体积 / 门禁基线）⑤ 相关立法（法一 / 法四 / 法七 / 法九；`v4-chat/spec.md:116,225,385` 法四逐字）⑥ 仓库现状（分支 `feature/web-cli-plugin` @ `2e9c4e9`；spec 阶段只读复核）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-24
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（web-cli-plugin F-35 / v0.11.2「输入即 next：废除流外独立输入框」需求规范：父 Feature = 轻量规范容器 + **2 个叶子子 Feature**（依存序，`ian-1-free-input-next → ian-2-abolish-composer`）；含编排器对 O-IAN-001~011 十一条开放点的逐条裁决落位 + **流内「自由输入…」next 面口径** + **法四原地修订（old→new 逐字）** + **S0'' 首验收场景（两段：中间态保护 / 终态零可达）机器化口径** + X-IAN-1~11 显式取代的判据等价重写映射 + N-IAN-001~028 红线继承 + **体积分列预算表（含 ian-2 净负增量口径）**）

web-cli-plugin v5.5.2「输入即 next（input-as-next）：废除流外独立输入框」需求规范 —— 把作者裁决（**废除流外独立输入框；自由文本输入是流内 next 里面的一个选项**）与既有诊断证据（**`#composer` 双写者 `syncComposerVisibility` vs `l0.revealFallback` + `fallbackOpen` 锁存无生产复位 + 设置态漏隐藏**，其显隐「与历史相关而非与状态相关」）转成可验收的需求：**产品语言已经说了「一切操作在 chat 的 next 里闭环」（F-32 v5 主题，已立法），但界面上仍保留着一个流外的、独立于 next 的输入框（`#composer`）——它是 all-in-chat/next 主线上唯一未收编的交互面**（不参与 next 注册表、不受 chip 的 op 分发、不住在 `ol#stream` 内）。作者的困扰（`#composer` 时隐时现）只是这个面**本来就自相矛盾**的可观察症状；作者的裁决不止于修缺陷，而是**废除该面本身**：**输入天然是 next 的一个选项，next 在 chat 里面，因此不该有单独的输入框**。

编号一律 `FR-IAN-*` / `NFR-IAN-*` / `EC-IAN-*` / `AC-IAN-*` / `NG-IAN-*`（与 v1/v2/v3/v4/v4.5/v5/v5.5/v5.5.1 零冲突；discovery §7.6 本轮实测 `input-as-next` / `inputAsNext` 全仓 0 命中）。**父 Feature 定位 = 轻量规范容器**（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 / F-34 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**），实施由 **2 个叶**按依存序承接。

**题眼（本 Feature 名 `input-as-next` 的语义）**：v5（F-32）把「**一切操作皆 next 流内闭环**」立法 —— 但**输入**这一最基本的用户动作仍住在流外（v4.5 把它「出流」到 `body` 尾并**保留**为「兼容读取面」，`host-registry.ts:144-146`）；v5.5（F-33）把「**下一步由谁按**」转移到系统 / AI 侧；F-34（v5.5.1）把「**下一步按的范围是什么**」兑现为模型可见事实 + 可判读数。v5.5.2 的题眼 = **「输入面本身也必须在 next 里」** —— 即把「自由输入」从「一个流外的例外」收编为**流内 next 的一个选项**，并**真退役**那个流外面：① 流内「自由输入…」next 项（点开就地展开卡内输入；提交经 `op.turn` 槽）；② `#composer` / `#input` / `#send` DOM 真退役 + 双写者 / 历史锁存 / 设置态漏隐藏一并消解；③ 四处兜底入口收敛到卡内 `.ask-fallback`（唯一兜底输入载体）；④ **法四原地修订**为「输入即 next：自由文本输入是流内 next 的一个选项；**流外零输入面**」+ supersession 台账 old→new。

**决定性事实（承 discovery §0.2 / §7，spec 阶段只读复核沿用）**：`#composer` 是「自由文本 → 发起回合」的**唯一**流外面（`index.html:1419-1422`；`A-IAN-001` 已证）；四处兜底入口**全部**收敛到 `revealAskFallback()`（卡内 `.ask-fallback`，正确），而 `#composer` **没有独立入口**，只被 `revealAskFallback → l0.revealFallback`（`l0/shell.ts:90-105`）**附带** reveal（`A-IAN-002` 已证）；「输入发生在卡内」**已有可用先例**（`.ask-fallback`，含互斥披露 + focus，`askuser.ts:71-86,263-300`）；R6 有界队列语义**与输入面位置解耦**（裁决在 SW，`turn-queue.ts`），但**唯一用户入口与草稿回填载体都绑在 composer 上**（`sidepanel.ts:3756` 是 `requestTurn(` 恰 2 的第二处；`:3984-3991` 回填 `#input`）。**⇒ 本 Feature 的验收锚 = 让「自由输入」在流内可达、可提交、可排队、可回填，并让流外面真退役后门禁强度不降。**

**与 F-34 的具体关系（承上、不替下）**：F-34（`validated`）与其两叶、R6 快修轮（`74d76c1`）、v5.5 / v5 / v4.5 / v4 产物**原样保留、零改写**（D7 / N-IAN-004）——**唯一授权例外 = 法四原地修订**（O-IAN-007 / 编排裁决 ⑦：old→new 逐字台账登记，**不是**静默改写，**不升格**法十）。F-34 的法九（范围读数）/ 引用载荷 / `--ref` 锚定 / 批量授权**全部继承为底座，逐条不退化**。本 Feature 是**并列补丁级跟进轮**（`-f-` 段承 `v45-f-regularization` / `v55-f-scope-governance` 先例）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v55-f-input-as-next（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」，ROADMAP **F-35**） |
| 名称 | web-cli-plugin v5.5.2「输入即 next」——① **流内「自由输入…」next 面**（推荐区按需最末项 → 点开就地展开卡内输入（`.ask-fallback` 先例）→ 提交复用 `op.turn` 槽）② **`#composer` 废除面**（DOM 真退役 + 双写者 / 历史锁存 / 设置态漏隐藏消解 + 测试钩子 / `NEVER_FOLDABLE` / 兼容读取面登记退役 + a11y focus 落卡内）③ **R6 排队 / 草稿回填迁移**（SW 有界队列语义保留；入口与回填载体迁流内，回填不覆盖新输入）④ **四处兜底入口收敛**到卡内 `.ask-fallback`（唯一兜底输入载体）⑤ **法四原地修订**（old→new 逐字 + supersession 台账）⑥ **判据重锚与 18 门禁逐一处置**（含 2 保护段） |
| 优先级 | P0（核心 / 产品语义一致性） |
| 目标版本 | **v0.11.2**（**全新版本位**，discovery §7.6 本轮实测 `v0.11.2` 全仓 = **0**；**patch 语义** = v0.11.0（F-33 v5.5）主题的补丁级跟进轮，承 F-34 v0.11.1 先例）；登记留给收口，本阶段 **ROADMAP 零 diff** |
| 命名与版本位（**O-IAN-001 已裁决**） | 目录名 **`v55-f-input-as-next`**（`-f-` = 补丁级跟进轮，承 `v45-f-regularization` 先例）+ 版本位 **`v0.11.2`**（patch）；语义 = 「**v5.5 主题（一切操作皆 next 流内闭环）的输入面收编补丁级跟进轮**」，见 §11 DC-IAN-001。**不采纳** ② `v56` + `v0.12.0`、③ 并入 F-34 树（与 D7 冲突） |
| 分支 | `feature/web-cli-plugin`（与 v1~v5.5.1 同分支继续堆；**不合 main、不发布**；**不碰 `main`**） |
| 当前 HEAD（立项时） | `2e9c4e9`（`docs(sddu): F-35 discovery —— 输入即 next（废除流外独立输入框，自由文本输入成为流内 next 的一个选项）`，2026-09-24）；本规范为其上的 spec 产物 |
| 上游 / 底座 | F-34 `specs-tree-web-cli-plugin-v55-f-scope-governance`（v0.11.1，两叶 `validated`，**唯一直接上游**）+ F-33 `-v55-self-driven`（v5.5；驱动者层 / 法七扩展 / 护栏六常量）+ F-32 `-v5-all-in-next`（v5；next 注册表契约 v2 / op 三档 / 12 kind / 零宿主）+ F-31 `-v45-f-regularization`（v4.5；宿主时间序化 / 「出流」先例 / 单写化）+ F-30 `-v4-chat`（v4；法一 / **法四** / 法三 / 三区）+ R6 `74d76c1`（有界队列 / 草稿回填）—— 全部**只读复用、零改写**（唯一授权例外 = 法四原地修订，见 §5.7） |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = **2 个叶**（depth=2，见 §14） |
| 叶子 | ① `specs-tree-ian-1-free-input-next`（**叶1 / 新面**：流内「自由输入…」next 通道 —— 推荐区按需最末项 + 卡内输入 + `op.turn` 槽 value 相 + 手输 / AI 驱动留痕区分 + R6 双入口并存 + a11y focus）→ ② `specs-tree-ian-2-abolish-composer`（**叶2 / 废面**：`#composer` DOM 真退役 + 双写者 / 锁存 / 设置态护栏消解 + 四处兜底收敛 + 状态提示重锚 + 法四原地修订 / 台账 + 18 门禁与 2 保护段重锚 + 体积重登记）**依存序，必须串行**（叶2 依赖叶1 已建立流内输入面 —— 先立新面、再拆旧面，**中间态无「无输入可用」窗口**） |
| 相关干系人 | 作者（插件当前唯一真实用户 + 立项人 + 唯一决策者；**已授权编排器代行决策、全流程自行调度**，D1）；编排器（D1~D7 + **O-IAN-001~011 十一条裁决**）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-IAN-001~007（核心）/ Q-IAN-008~012（次要）/ Q-IAN-013~018（潜在）；根因 = §2.2（D-A / D-B / D-C + 依赖面全景） |
| 关联风险 | R-IAN-001~013（discovery 继承）+ R-IAN-901~910（spec 新增，见 §15.2） |
| 关联红线 | N-IAN-001~020（本规范从 discovery 约束 + 编排裁决红线编成，见 §13.1）+ **N-IAN-021~028（spec 新增红线，见 §13.2）** |
| 关联取代 | X-IAN-1~11（discovery §7.5 显式取代候选）→ §12 判据等价重写映射表 |

### 1.1 编号命名空间声明（**强制**）

| 命名空间 | 本 Feature 使用 | 历史占用（**零冲突，禁止复用**） |
|---|---|---|
| 功能需求 | `FR-IAN-###` | v1 `FR-001~055`；v2 `FR-V2-*`；v3 `FR-V3-*`；v4 `FR-CHAT-*`；v4.5 `FR-V45-*`；v5 `FR-ALLN-*`；v5.5 `FR-SELF-*`；F-34 `FR-SGO-*` |
| 非功能需求 | `NFR-IAN-###` | v1 `NFR-001~010`；v2~v5.5.1 `NFR-V2/V3/CHAT/V45/ALLN/SELF/SGO-*` |
| 边界情况 | `EC-IAN-###` | v1 `EC-001~026`；v2~v5.5.1 `EC-V2/V3/CHAT/V45/ALLN/SELF/SGO-*` |
| 验收标准 | `AC-IAN-###` | v1 `AC-001~012`；v2~v5.5.1 `AC-V2/V3/CHAT/V45/ALLN/SELF/SGO-*` |
| 非目标 | `NG-IAN-###` | v2~v5.5.1 `NG-V2/V3/CHAT/V45/ALLN/SELF/SGO-*` |
| 目标 / 用户故事 | `G-IAN-###` / `US-IAN-###` | — |
| 裁决记录 | `DC-IAN-###` | v5 `DC-ALLN-*`；v5.5 `DC-SELF-*`；F-34 `DC-SGO-*` |
| spec 新增风险 | `R-IAN-9xx` | v5 `R-ALLN-9xx`；v5.5 `R-SELF-9xx`；F-34 `R-SGO-9xx` |
| 红线（本规范编成 + 新增） | `N-IAN-001~020` / `N-IAN-021~028` | F-34 `N-SGO-001~030` |
| 缺口编号（本规范派生，见 §10.0） | `GAP-IAN-01~08` | — |
| 遗留开放点（spec 未裁决，交 plan / 后续轮） | `PD-IAN-0xx` | F-34 `PD-SGO-0xx` |
| 复核订正（spec 阶段只读复核与 discovery 不一致者） | `COR-IAN-*` | F-34 `COR-SGO-1~5` |
| 沿用 discovery | `Q-IAN-###` / `A-IAN-###` / `R-IAN-0xx` / `O-IAN-###` / `X-IAN-1~11` / `D1~D7` | — |
| 叶内编号（子规范） | `LG-IAN-x-###`（叶目标）/ `LNG-IAN-x-###`（叶非目标）/ `LD-IAN-x-###`（叶裁决） | v5 叶 `LG-V5-x-*`；v5.5 叶 `LG-V55-x-*`；F-34 叶 `LG-V55F-x-*` |

---

## 2. 上下文

### 2.1 立项来源（**编排指示逐字保留，不得转述走样**）

| # | 指示（逐字 / 提炼自 discovery §0.3） | 本规范承载体 |
|---|---|---|
| **P1** | 「**「自由输入」next 的形态**：下一步推荐区常驻一个「自由输入…」选项？还是按需出现（何时）？点开后流内输入行 / 卡内输入（`.ask-fallback` 先例扩展）？提交后走什么（新 op？复用 `op.turn` 的 value 相？注意 `requestTurn` 恰 2 门禁）」 | §5.2 **FIM**（FR-IAN-010~019）+ §5.3 **CHAN**（FR-IAN-020~025）；裁决 = O-IAN-002 |
| **P2** | 「**`#composer` 废除面**：`index.html` 元素、view-model `buttonStates`/`#send-reason`、R6 排队入口迁移、状态栏原因行去留、测试钩子 `hideFallback`、a11y（focus 流）」 | §5.5 **ABOL**（FR-IAN-040~049）+ §5.4 **R6Q**（FR-IAN-030~034）+ §5.6 **CONV**（FR-IAN-050~056）；裁决 = O-IAN-003 / 004 / 006 |
| **P3** | 「**四处兜底入口改流内**：改用描述 / `op.describe` / l1 / describe 空值 —— 全部改为流内输入卡？卡内 `.ask-fallback` 统一？」 | §5.6 **CONV**（FR-IAN-050~052）；裁决 = O-IAN-005 |
| **P4** | 「**法四修订**：新法条文本（如「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」）+ supersession 台账（法四原文修订登记）+ 密度 / l0 / journey 判据重锚清单」 | §5.7 **LAW4**（FR-IAN-060~064）+ §5.9 **SUPERSEDE**（FR-IAN-080）；裁决 = O-IAN-007 |
| **P5** | 「**风险**：R6 排队 / 草稿回填回归、text ask 期间输入路径、无障碍、体积（删 composer 应为负增量；流内输入卡新增）、门禁只增不减与删除面的张力（保护段 / 判据重锚纪律）」 | §5.10 **GATE** + §5.11 **VOL** + §15 风险登记；裁决 = O-IAN-008 / 009 |
| **P6** | 「**命名**：F-35、v0.11.2、树名建议 `specs-tree-web-cli-plugin-v55-f-input-as-next`；ROADMAP 登记留收口」 | §1 元数据 · FR-IAN-001；裁决 = O-IAN-001 |
| **纪律** | 「作者已授权编排器代行决策；开放点收集附推荐（spec 批量裁决）。`.sddu` 外零触碰；commit `docs(sddu): F-35 spec …`」 | 本规范已遵守；§16 纪律表 |

> **口径声明（如实）**：作者**除 §0.1 裁决原话外**未给出进一步实现约束；P1~P6 均为**编排器转述的指示要点**。形态 / 法条载体 / 门禁处置 / 体积全部在 discovery 登记为 `O-IAN-001~011`，**本阶段由编排器批量裁决**（D1 / D2），逐条落位于 §11。**本规范不新增作者未表达的需求**。

### 2.2 只读诊断证据（**已完成，本规范复核并引用，不重开诊断**）

**母问题**：`#composer`（`<form id="composer" hidden><input id="input" …><button id="send">`，`index.html:1419-1422`）是**唯一**的「自由文本 → 发起回合」面，却住在 `ol#stream` 之外（v4.5 起迁 `body` 尾 —— 「出流」，`index.html:1414-1418` 注释 / `host-registry.ts:114-145`）。

| # | 缺陷（诊断结论） | 事实（`file:line`，spec 阶段逐条只读复核 ✅） |
|:-:|---|---|
| **D-A** | **双写者**：护栏 writer vs 无条件直写 writer 并存 ⇒ 最终值取决于**调用顺序**（历史），而非当前状态 | ① 护栏 = `syncComposerVisibility()`（`sidepanel.ts:2884-2891`，`composer.hidden = !(fallbackOpen && chatVisible)`）；② 无条件直写 = `l0.revealFallback/hideFallback`（`l0/shell.ts:90-105`，`composer.hidden = false/true`）**不经护栏** |
| **D-B** | **锁存无生产复位**：`fallbackOpen` 只被置真，生产路径**永不复位** | `let fallbackOpen = false`（`sidepanel.ts:2883`）；置真 = `revealAskFallback()`（`:2893-2898`）；**唯一复位 = 测试钩子 `__v3.testing.hideFallback()`（`:854-858`）**；生产路径（`render()` `:2245` / `openL2View` 非 settings `:3616` / 视图切换）**均不复位** |
| **D-C** | **设置态漏隐藏**：进入设置视图的路径**不调用护栏** | `openL2View('settings')`（`sidepanel.ts:3607-3613`）**提前 return，不调 `syncComposerVisibility()`**（对比非 settings 分支 `:3616` 调了）；且 `body.settings-open` 的 CSS（`index.html:670-672`）只隐藏 `#region-toolbar / #region-stream / #region-statusbar`，**不含 `#composer`** |

**关键事实（spec 阶段只读复核 ✅）**

| # | 事实 | `file:line` |
|:-:|---|---|
| F-1 | 静态默认 `hidden`（法四：默认屏无常驻输入框） | `index.html:1419`（`<form id="composer" hidden>`） |
| F-2 | text 型 ask 直开兜底 ⇒ 连带 reveal `#composer` | `sidepanel.ts:2311-2312`「`if (state.ask?.kind === 'text') l0?.revealFallback();`」 |
| F-3 | **卡内已有输入先例**：`.ask-fallback` 内联输入（`#ask-fallback` / `#ask-input` / `#ask-submit` / `#ask-cancel`），默认收起（text / secret 型除外），`setCardFallbackOpen` 互斥披露 + focus | `cards/askuser.ts:263-300`（构造）/ `:71-86`（互斥 + `input.focus()`）/ `:94-103`（文档级 `setAskFallbackOpen`） |
| F-4 | 兜底入口**四处**全部收敛到 `revealAskFallback()`（卡内），`#composer` 只是被**附带** reveal 的次级通道（**无独立入口**） | 见 §2.4 |
| F-5 | `#composer` 的可见条件 = 「兜底展开」（即只在 text ask / 改用描述 / `op.describe` 时可见）——**「时隐时现」部分按法四是设计**；作者困扰的是它**存在**且显隐依赖历史 | `sidepanel.ts:2884-2891` + `:2312` |
| F-6 | `#send-reason` **不是**退役 id，是**保留载体**（状态栏 `#region-statusbar` 内） | `host-registry.ts:295-321` + `density-thresholds.test.ts:787-814,864` + `index.html:497,513,576` |
| F-7 | `requestTurn` 定义 `:313`；调用点**恰 2** = composer submit `:3756` + `op.turn` 槽 `:3783` | `op-wiring.test.ts:127-134`（机核「恰 2」） |

> **纪律**：D-A / D-B / D-C **不是独立缺陷快修项** —— 它们随「废除 `#composer` 面」**一并消解**（面没了，双写者 / 锁存 / 漏隐藏都不复存在）。本 Feature **不重复立项为缺陷快修**（§3.2 NG-IAN-001 显式排除「只修缺陷不废面」的路径）。

### 2.3 「自由输入」next 现状映射（**已有 / 缺失**，spec 复核沿用）

| 维度 | **已有**（可复用事实） | **缺失**（本 Feature 问题域） |
|---|---|---|
| **next 选项机制** | `NextProvider` 注册表（契约 v2；`next-registry/registry.ts` / `providers.ts`；10 provider）；chip 渲染（`cards/nextstep.ts`，`MAX_CHIPS_PER_CARD = 3`）；`ACT_TO_OP` 单源分发（`next-registry/dispatch.ts`） | **无**「自由输入…」provider / act / chip；chip **不承接任意文本**（`nextstep.ts:8-11`「chip 即指令，不填 composer」） |
| **回合发起通道** | `requestTurn(text)`（`sidepanel.ts:313`）= **唯一**回合入口；`op.turn` 槽（`bindPanelOps.turn`，`:3782-3784`）；`op.turn` 行 `['op.turn','panel','card-boundary',false,false]`（`op-table.ts:99`）；∈ **`auto`** 档（`op-table.ts:134` 段注） | composer submit（`:3756`）**不走注册表**，是 `requestTurn` 的**第二个直连调用点**；**无**「输入提交」的注册表内通道（`requestTurn(` 恰 2 的作用） |
| **输入载体** | `.ask-fallback` 卡内输入（`askuser.ts:263-300`；含 `:71-86` 互斥 + focus；`:94-103` 文档级解析）——**既有先例**；text 型 ask 直开（`sidepanel.ts:2312`） | 卡内 `.ask-fallback` 只服务「作答 / 描述」，**不服务「发起任意新回合」**；`#composer` 是**唯一**自由输入面且**在流外** |
| **排队 / 草稿** | SW 有界队列（`turn-queue.ts` `TURN_QUEUE_MAX = 1` / `classifyChatRequest` 三分支 / `drain` / `QueuedTurn.refs`；`service-worker.ts:924-940` 入队 / `:1050-1056` drain）；面板 `queued`/`busy-rejected` 留痕 + 回填 `#input`（`sidepanel.ts:3904-3991`） | **入口与回填载体绑 `#composer`**；流内输入尚无对应路径 |
| **本地描述通道** | `op.describe`：有值 ⇒ `submitDescribe`（本地 ask 结算，**不发 SW、不成回合**）；无值 ⇒ `revealAskFallback`（`sidepanel.ts:3786-3789`；`ops.ts:62-63`） | 「描述」与「自由输入发起回合」**语义不同**，不得混用（`nextstep.ts:66-68` 已防 label 被当输入） |
| **法条** | 法四（输入按需出现：无常驻输入框；text 输入框只在卡内；`v4-chat/spec.md:116,225,385`）；法一（一切交互皆消息）；法七（禁止死端）；法九（范围读数） | **无**「流外零输入面」法条；法四**默许**流外按需输入框（Q-IAN-005） |

### 2.4 四处兜底入口（**逐条 `file:line`**，spec 复核 ✅）

| # | 入口 | 位置 | 现状调用 | 目标（本 Feature 问题域） |
|:-:|---|---|---|---|
| E1 | 决策区末项「其他…（我来描述）」 | `cards/decision-region.ts:162-170`（`terminal.addEventListener('click', () => deps.onRevealFallback?.())`，`aria-controls="ask-fallback"`） | → `onRevealFallback`（`sidepanel.ts:222-223`）→ `revealAskFallback()` | 只 reveal 卡内 `.ask-fallback`（现状已对；**停止**附带 reveal `#composer`） |
| E2 | `op.describe` 参数相（无值） | `sidepanel.ts:1512-1515`（`if (op.opId === 'op.describe') { revealAskFallback(); … }`） | → `revealAskFallback()` | 同上 |
| E3 | L1 面板装配 | `sidepanel.ts:3650`（`revealFallback: () => revealAskFallback()`） | → `revealAskFallback()` | 同上 |
| E4 | `bindPanelOps.describe` 空值 | `sidepanel.ts:3786-3789`（`if (value) submitDescribe(value); else revealAskFallback();`） | → `revealAskFallback()`（空值）/ `submitDescribe`（有值） | 空值相同上；**有值相不变**（描述 ≠ 回合） |
| **+** | **附带 writer（唯一把流外面拉进来的点）** | `sidepanel.ts:2893-2895` → `l0?.revealFallback()` → `l0/shell.ts:90-105` | **无条件 reveal `#composer`** | **废除**（收敛到卡内） |
| **+** | `ref` 卡「改用描述」按钮 | `cards/ref.ts`（`data-act="describe"`）→ `recommend.ts`（`describe: '改用描述'`）→ `nextstep.ts` chip → `bindPanelOps.describe` | 经 E4 | 不变（经 E4 收敛） |

> **结论性事实（A-IAN-002 已证）**：四个入口**全部**汇聚到 `revealAskFallback()`；`#composer` **没有独立入口**，只被 `revealAskFallback → l0.revealFallback` **附带**展开。

### 2.5 现状事实核对（**spec 阶段只读复核，零运行时验证**）

#### A. `#composer` 依赖面（复核对账）

| 面 | discovery 枚举 | spec 复核 | 订正 |
|---|---|---|---|
| DOM / CSS | `index.html:1419-1422`（form/input/button）/ `:577-598`（CSS）/ `:670-672`（settings-open 三区）/ `:1414-1418`（出流注释） | ✅ 逐条命中（`#composer` display:flex `:577`；`#input` `:578-587`；`#send` `:591-598`；settings-open `:670-672`） | — |
| 写者 | `sidepanel.ts:2883`（锁存）/ `:2884-2891`（护栏）/ `:2893-2898`（reveal）/ `:2312`（text ask 直开）/ `:2245` / `:3616` / `:3607-3613`（settings 漏调）/ `l0/shell.ts:90-105` | ✅ 逐条命中（`fallbackOpen` `2883`；函数 `2884-2891`；`revealAskFallback` `2893-2898`；`render()` 调 `:2245`；`openL2View` 非 settings `:3616`；settings 分支提前 return `:3607-3613`） | — |
| 入口 / 读取面 | `sidepanel.ts:3749-3760`（submit）/ `:850-858`（钩子）/ `:1337-1341`（draft）/ `:2394-2423`（`#send-reason`）/ `:3980-3991`（回填）/ `view-model.ts:298-315,350,384-400,404-423` / `disclosure.ts:164` / `host-registry.ts:114-146,235,295-321` | ✅ 逐条命中（submit `$('composer').addEventListener('submit'` 起于 `3749`，`requestTurn(input.value)` `3756`；钩子 `851-858`；draft `1337-1341`；`renderSendReason` `2395-2423`；回填 `3984-3991`；`ONBOARDING_TEXTS[4]` `350`；`sendDisabled` `398`；`NEVER_FOLDABLE` 含 `'composer'` `164`；PRESERVED 注 `144-146`；`send-reason` 通道 `295-321`） | 钩子区间统一记 **`851-858`**（discovery 记 `850-858`） |

#### B. 门禁 / 冻结面 / 体积（**引自上游收口，本轮未复跑**）

| 项 | 值 | 来源 |
|---|---|---|
| `sidepanel.js` 基线 | **591,946 B** | `test/size-baseline.ts:363`（`SIDEPANEL_BASELINE_BYTES`） |
| 生效上限 | `floor(591,946 × 1.05) = `**`621,543`** B（容差 5% 不动，`SIDEPANEL_CEILING_CAP` = `record-only`） | `test/size-baseline.ts:467,483,497-507,513-517` |
| 档位 / 绝对上限 | **614,400** / **675,840**（**距档位 22,454 B**） | F-34 closeout / ROADMAP v1.31.0 |
| `authorConfirmation` | `pending-author-line`（**未闭合义务，承接 v5.5 两次升档；不得伪称已确认**） | F-34 closeout |
| 冻结面 | `content.js` **177,076 B**（sha `52a82620…`）/ `pick-layer.js` **34,358 B**（sha `77796bab…`）/ `KIND_SET` **40** / 12 kind / 零宿主（`REGISTERED_STRUCTURAL_HOSTS = []`）/ base 零 diff | F-34 closeout（本轮引用，未复跑） |
| 门禁计数 | `npm test` **1394** / `l0` 248 / `density` 242 / `journey` 171 / `insight` 118 / `binding` 192 / `page-input` 125 / `CHROMIUM_GATES === 9` | F-34 closeout（本轮引用，未复跑） |
| 保护段（**活跃 pin**） | journey **`43054..58287`** / sha **`cc79f413…`**（v4.5 pin）；binding **`107780..115930`** / sha **`be9ad0e9…`** | `docs/v4-supersession-ledger.json#protectedSupersession`（`newPin` + `protectedRanges`）+ `test/supersession-ledger.test.ts:839-887,942-1009` |

#### C. 复核订正（**spec 阶段只读复核与 discovery 表述不一致者，逐条如实登记**）

| # | discovery 表述 | 复核事实 | 处置 |
|---|---|---|---|
| **COR-IAN-1** | §7.4 / §0.2 引用保护段 journey `42766..54004`（sha `6b45c3fa…`） | 该值是 **v3 原始 pin**（保留在 `supersessionChain` / `history[0]`，可逐字节复算）；**当前活跃 pin = journey `43054..58287` / sha `cc79f413…`**（v4.5 第二次显式取代后的重算 pin，`status:"active"`） | 本 Feature 的重锚对象 = **当前活跃 pin**；旧 pin 作为**历史链节保留**（**不得**据此误判「段已变」）。discovery 的旧数字**不改写**，本规范以 §2.5B 为准并以 COR-IAN-1 显式登记 |
| **COR-IAN-2** | §7.1C 门禁命中数（如 `insight.mjs` 41 / `journey.mjs` 23）表述为「命中」 | 该数是**含注释的行数**，**不是断言数** | 重锚清单（FR-IAN-104）按**断言 / 选择器**逐条，不按行数；不得以行数充当「处置完成」证据 |
| **COR-IAN-3** | §7.1B B9 记测试钩子为 `:850-858` | 实测 `revealFallback()` 起 `851`、`hideFallback()` `854-858`；`refresh()` 结束 `849` | 统一记 **`851-858`**（§2.5A） |
| **COR-IAN-4** | §7.1A A3 把 `#send-reason` CSS 记为 `:513,576` | 实测 `:513`（`white-space/ellipsis` 契约，状态栏文字面）/ `:576`（`margin/color/font-size`）；`#send-reason` 本体在 `#region-statusbar`（`:497` 区）内 | 保留；断言重锚以 §2.5A + `host-registry.ts:295-321` 为准 |
| **COR-IAN-5** | §7.1B B8 记 submit 区间 `3749-3760` | 实测 `$('composer').addEventListener('submit'` 起 `3749`，`requestTurn(input.value)` 起 `3756`，`proactivity.noteUserTurn()` `3757`，`input.value = ''` `3758`；**`noteUserTurn` 在 `requestTurn` 之外**（注释 `:3752-3755` 明示：放进槽内会锁住 AI 的答案后续流） | 该位置事实**是本 Feature 手输语义迁移的关键锚**（FR-IAN-023）；区间沿用 `3749-3760` |

> **口径**：以上订正**不改变**任何 discovery 的问题判定 / 编号 / 风险等级；只把 spec 阶段只读复核到的**更精确事实**显式登记（承 F-34 `COR-SGO-*` 先例）。

### 2.6 目标用户

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 本 Feature 的应对（需求层） |
|---|---|---|---|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏（`platform.deepseek.com`）：想自由输入一句指令 | ①（裁决逐字）「**不应该存在单独的输入框**」；② 被 `#composer` **时隐时现**困扰（D-A/B/C） | 流内「自由输入…」next 项 + `#composer` 真退役（FR-IAN-010~016 / 040~049） |
| **作者（文本作答场景）** | 点「其他…（我来描述）」/ 收到 text 型 ask 卡 | 卡内**已有**输入框（`.ask-fallback`），**同时又多出** `#composer` ⇒ **两个输入面同时出现**，语义重叠 | 卡内 `.ask-fallback` 成为**唯一**兜底输入载体（FR-IAN-050~052） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种『自由输入』交互，要改哪些文件？」 | 现状 = 一个流外 form + 两个 writer + 一个历史锁存 + 一个兼容读取面登记 + 一条设置态护栏 ⇒ 「自由输入」语义**无处安放** | 扩展点收敛：一个 next provider + 一个卡内输入载体 + 一个 `op.turn` 槽（FR-IAN-010 / 020 / 050） |
| **审查者 / 验证者** | 需要证明「流外零输入面」且不静默降强度 | 删除面与门禁只增的张力（Q-IAN-006） | S0''（§5.8）+ 18 门禁逐一处置（FR-IAN-104）+ 台账（FR-IAN-102） |

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2/v3/v4/v4.5/v5/v5.5/v5.5.1 同一事实基础。**本规范不编造用户调研数据**；「用户原话」栏引用 discovery §0.1 作者裁决逐字与代码事实。

### 2.7 与上游 / 下游 Feature 的关系（**边界**）

| 关系 | 对象 | 口径 |
|---|---|---|
| **直接上游（只读复用）** | F-34 `specs-tree-web-cli-plugin-v55-f-scope-governance`（v0.11.1，两叶 `validated`） | 法九 / 引用载荷 / `--ref` 锚定 / 批量授权 / 四值读数 / 门禁基线 / 体积登记 —— **原样继承，零改写**（N-IAN-004） |
| **底座（只读复用）** | F-33 `-v55-self-driven`；F-32 `-v5-all-in-next`；F-31 `-v45-f-regularization`；F-30 `-v4-chat`；R6 `74d76c1` | next 注册表契约 v2 / op 三档 / 12 kind / 零宿主 / 宿主时间序化 / 「出流」先例 / 法一~法六 / 有界队列 + 回填 —— **零改写** |
| **唯一授权例外（原地修订）** | `v4-chat/spec.md` 的**法四**三处（`:116` 法则表 / `:225` FR-CHAT-014 / `:385` AC-CHAT-007） | O-IAN-007 裁决 = **原地修订**；由**叶2**在 build 阶段执行；**必须** old→new 逐字入 supersession 台账（X-IAN-1 / FR-IAN-060~062 / N-IAN-005）。**不是静默改写**；**不升格**法十 |
| **明确不动** | F-29（A2A 候选，未立项未排期） | 保持原样不动（NG-IAN-017） |
| **下游** | @sddu-plan（依赖 `spec.md` 完成） → … → 两叶各自 build/review/validate | 父为轻量规范容器 |

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 | 判据锚 |
|---|---|---|
| **G-IAN-001** | **「自由输入」在流内可达**：存在一个流内 next 选项「自由输入…」（按需最末项），点开就地展开卡内输入，**不常驻、不新增 kind** | AC-IAN-002 / S0''-3 |
| **G-IAN-002** | **手输与 AI 驱动**：卡内输入提交复用 `op.turn` 槽（**唯一**生产输入提交点）；手输与 AI 驱动回合在留痕上**显式可区分**；用户手输不被 AI 代答 | AC-IAN-003 / AC-IAN-004 |
| **G-IAN-003** | **流外零输入面**：`#composer` / `#input` / `#send` **DOM 真退役**（非 `hidden`）；双写者 / 历史锁存 / 设置态漏隐藏**一并消解** | AC-IAN-005 / S0''-7 |
| **G-IAN-004** | **输入面单一化**：四处兜底入口只展开卡内 `.ask-fallback`；卡内输入成为**唯一**兜底输入载体（无「双 reveal」） | AC-IAN-006 / S0''-7 |
| **G-IAN-005** | **R6 零回归**：SW 有界队列语义保留；入口与草稿回填载体迁流内；**不丢原话 / 不覆盖新输入 / 有可读行** | AC-IAN-007 / S0''-5/6 |
| **G-IAN-006** | **立法一致**：法四原地修订为「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」+ supersession 台账 old→new + 判据重锚 | AC-IAN-008 / FR-IAN-060~064 |
| **G-IAN-007** | **门禁强度不降**：18 门禁（node 10 + Chromium 8）逐一处置；**断言零删除零降级**（唯一例外 = 保护段显式取代 + 台账留痕）；`CHROMIUM_GATES === 9` 不动 | AC-IAN-013~017 / FR-IAN-100~106 |
| **G-IAN-008** | **零新增载体 + 体积可管理**：`KIND_SET` 40 / 12 kind / 零宿主 / base 零 diff 逐字不动；先出**分列预算**（ian-1 正增量 / ian-2 净负）再排落地 | AC-IAN-009 / AC-IAN-018~021 / §5.11 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 | 理由（来源） |
|---|---|---|
| **NG-IAN-001** | **「只修 D-A/B/C 三缺陷、保留 `#composer`」的路径** | 作者裁决明文「**不应该存在单独的输入框**」；诊断证据只作**现状底座**引用；本 Feature **不重复立项为缺陷快修**（discovery §0.2 纪律） |
| **NG-IAN-002** | **F-34 / F-33 / F-32 / R6 / v4 产物改写** | D7：全部原样保留；**唯一授权例外 = 法四原地修订**（叶2 执行 + old→new 台账；非静默改写） |
| **NG-IAN-003** | **`src/content/**`（`content.js` **177,076 B**）/ `pick-layer.js`（**34,358 B**）语义改动** | 字节冻结红线（**零容差**，N-IAN-001/002） |
| **NG-IAN-004** | **`packages/web-cli-base/**` 任何改动** | 硬红线：`test/insight-no-escalation.test.ts:147` 机核 `../web-cli-base` **零 diff**（N-IAN-007） |
| **NG-IAN-005** | **判定链（`src/security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面触碰** | 硬底线：`docs/v3-supersession-ledger.json#zeroDiffFiles`（内容哈希 pin 不变）；本 Feature 全部改动集中在 `src/ui/sidepanel/**` 与其门禁 |
| **NG-IAN-006** | **SW 有界队列的裁决逻辑本身（`turn-queue.ts` 三分支）** | R6 已闭环（`74d76c1`）；本 Feature 只**迁移入口与回填载体**，不改裁决语义（N-IAN-008） |
| **NG-IAN-007** | **法八（零明文）放宽** | `test/ui/law8-plaintext.mjs` 必绿：卡内输入**不得**把正文写进流内 payload / digest / 审计 / DOM 四面（N-IAN-009） |
| **NG-IAN-008** | **12 kind 卡类型学新增（第 13 种）/ 新增流内固定宿主** | v4/v5 已固化「零新增卡类型 / 零宿主」；流内输入**复用既有 `askuser` kind + `.ask-fallback` 先例**（零新增 kind 优先论证，N-IAN-010） |
| **NG-IAN-009** | **常驻输入框**（默认屏可见输入框） | 法四（旧）已禁「常驻」；本 Feature **加严**为「流外零输入面」（N-IAN-011） |
| **NG-IAN-010** | **特权 op（`op.authorize` / `op.perm.request`）的发起方式** | 红线：特权 op **恒 gesture**、**AI 不可代答**（`op-table.ts:159-160`）；`op.turn` ∈ `auto` 档的语义边界见 FR-IAN-024 |
| **NG-IAN-011** | **`KIND_SET` 增长 / 新消息 kind 进 `content.js`** | 零容差（N-IAN-003）；新载体一律走 **type-only 先例** |
| **NG-IAN-012** | **外部竞品调研** | O-IAN-010 已裁决「不需要」：内部架构一致性问题，「把流外输入面并入 next」无外部对标必要；**不得**据此外推（承 F-34 NG-SGO-018） |
| **NG-IAN-013** | **升格「法十」并 supersede 法四** | O-IAN-007 裁决 = **原地修订**（不升格）；升格会切断法则清单连续性并制造两套并行法条（DC-IAN-007） |
| **NG-IAN-014** | **新驱动时机 / 新驱动者 / 新 op** | FR-IAN-006：主流程零扩张优先读法；`requestTurn(` 只减不增（重锚为恰 1） |
| **NG-IAN-015** | **断言删除 / 降级 / 保护段静默改写** | N-IAN-012：替换必须**等价重锚**（断言力不降、计数只增）并留台账 |
| **NG-IAN-016** | **伪称体积档位已确认**（`authorConfirmation` 改写） | N-IAN-013：`pending-author-line` 属**未闭合义务** |
| **NG-IAN-017** | **F-29（A2A 候选）状态变更** | 未立项未排期，保持原样不动（N-IAN-014） |
| **NG-IAN-018** | **安装期静态权限 / `manifest` 静态面 / 存储加密 / 会话分组收编 op** | 与本问题域无耦合（v5 `PO-ALLN-001` deferred 保持） |
| **NG-IAN-019** | **在 plan 之前排「全量落地」** | R-IAN-005 / v5 教训（plan Σ 低估 **2.8×**；v55 三叶超预算 +6,015；F-34 叶2 越预算基线上界） |
| **NG-IAN-020** | **`op.turn` `auto` 档语义退化**（手输退化为 AI 可代答的自动通道） | R-IAN-004：承红线⑥精神；手输与 AI 驱动必须可区分（FR-IAN-022~024） |

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|---|---|---|
| **US-IAN-001** | 作者 | 点面板里的「自由输入…」就能打字发起回合 | 不必去找一个**有时在有时不在**的输入框 |
| **US-IAN-002** | 作者 | 输入发生在**流内卡片里**（和「其他…（我来描述）」同一处） | 所有交互都在 chat 里闭环，符合已立的产品语言 |
| **US-IAN-003** | 作者 | 面板里**只有一个**输入面 | 不再出现「卡内一个、底部又一个」的语义重叠 |
| **US-IAN-004** | 作者 | 在飞（AI 正在处理）时也能输入并提交 | 输入不被硬禁用；要么排队、要么明确拒绝并把我的话放回来 |
| **US-IAN-005** | 作者 | 被拒时我的话**原样回到输入处**，且**不覆盖**我已经在打的新内容 | 不丢话、不丢新输入 |
| **US-IAN-006** | 作者 | 卡片收起时若发生回填，**自动重新展开**输入处 | 我不用先找回来再粘贴 |
| **US-IAN-007** | 作者 | 我手打的回合，AI 不要抢先 / 代答 / 自动提交 | 我的手输是「我」的动作，不是 AI 的动作 |
| **US-IAN-008** | 维护者 | 新增「自由输入」交互只改**一个 next provider + 一个卡内输入载体 + 一个 `op.turn` 槽** | 扩展点固定，不靠碰巧 |
| **US-IAN-009** | 维护者 | 法条与实现一致（法四 = 输入即 next / 流外零输入面），且修订**有台账** | 立法不漂移、历史可追溯 |
| **US-IAN-010** | 审查者 | 能用一条可机核样板（**中间态 + 终态**两段）证明：先立新面不破坏现网、终态旧面零可达、门禁强度不降 | 不靠人工观感判断「这次没删面没降强度」 |

---

## 5. 功能需求 (FR)

> 编号 `FR-IAN-###`；每条**可测试**；P0 = 本 Feature 必需，P1 = 必需但可在同叶内后置，P2 = 记录性（门禁 / 台账）。**FR → 叶覆盖矩阵见 §14.3。**

### 5.1 GOV — 立案、结构与纪律（横切）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-001** | 本 Feature 登记为 **F-35 / v0.11.2**（patch 跟进轮），目录名 `specs-tree-web-cli-plugin-v55-f-input-as-next`；**ROADMAP 零 diff**（登记由收口承接） | §1 元数据齐备；`git diff --stat -- .sddu/specs-tree-root/ROADMAP.md` = 0 | P0 |
| **FR-IAN-002** | 父 Feature = **轻量规范容器**（不承接 build/review/validate、不产 `tasks.json`）+ **2 叶（依存序串行，`ian-1 → ian-2`）**；叶目录**直接嵌套**（`specs-tree-ian-1-*` / `-ian-2-*`），**禁止 `children/` 中间层** | §14.1/§14.2 结构裁决齐备；state.json `childrens` 恰 2 项 | P0 |
| **FR-IAN-003** | 纪律：`.sddu/**` 只写本 Feature 树；spec 阶段**零改动** `src/` `test/` `dist/` `design/` `docs/` 与 `ROADMAP.md`（**含 `v4-chat/spec.md` —— 法四修订由叶2 在 build 阶段执行，spec 阶段只定义不落笔**） | `git status --short` 仅本 Feature 目录 | P0 |
| **FR-IAN-004** | 命名空间声明（§1.1）齐备；**断言零删除零降级、门禁计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 每条 AC 有唯一 ID；门禁对账表（§9.5）无减少项 | P0 |
| **FR-IAN-005** | 红线编制 **N-IAN-001~020** 逐条承载 + **X-IAN-1~11** 逐条等价重锚（§12 / §13）；**未发生的取代须如实登记「未发生」** | §12 / §13 无遗漏；台账条目与 X 项一一对应 | P0 |
| **FR-IAN-006** | **主流程零扩张优先读法**：本 Feature **不得**引入新驱动时机 / 新驱动者 / 新 op；`requestTurn(` 重锚为**恰 1**（唯一生产输入提交点 = `op.turn` 槽；见 FR-IAN-021）；`maybeRecommend` 1 定义 / 7 调用点、`nextAfterSettle` 1 定义 / 10 调用点**不变** | `test/op-wiring.test.ts` 绿 + 反证（第 2 个 `requestTurn(` 调用点 ⇒ 必红） | P0 |
| **FR-IAN-007** | **编排裁决落位**：O-IAN-001~011 **全部** `ruled` 并逐条落位 §11（DC-IAN-001~011）；**开放点不得在 spec 前被顺手定下** | §11 全 `ruled`；§8 只剩 `PD-IAN-*` | P0 |

### 5.2 FIM — 流内「自由输入…」next 面（**核心 1**，叶1）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-010** | **「自由输入…」next 项存在**：由 next provider 产出，作为**推荐区的按需最末项**（与「其他…（我来描述）」同构）；**不常驻** | provider 可注册 + 产出项可在推荐卡渲染；断言「该项存在且 `data-act` 落在 `ACT_TO_OP` 单源」 | P0 |
| **FR-IAN-011** | **形态 = 点开后就地展开卡内输入**：复用 / 扩展既有 `.ask-fallback` 先例载体（`#ask-fallback` / `#ask-input` / `#ask-submit` / `#ask-cancel` 家系）；**不新增常驻输入框、不新增卡 kind** | 端到端：点击 → 卡内输入展开（同一卡内就地，非浮层 / 非流外）；`KIND_SET` 40 / 12 kind 不动 | P0 |
| **FR-IAN-012** | **不常驻**：默认屏**零可见输入框**（法四语义保持）；「自由输入…」项**本身不是输入框**（是 chip / 选项） | 默认屏 `input/textarea/select/[contenteditable]` 可见数 = 0；推荐区可点计数不越密度预算 | P0 |
| **FR-IAN-013** | **零死端**：至少存在一条状态使「自由输入…」**可达**（含**无其他 next 候选**时）；不得因候选为空而让自由输入不可达 | 死端门禁（`no-dead-end`）**只增必绿**；反证「候选为空 ⇒ 自由输入不可达 ⇒ 必红」 | P0 |
| **FR-IAN-014** | **末项与预算显式**：恒为推荐区**最末项**；与既有 `MAX_CHIPS_PER_CARD = 3` / 单卡可点 ≤6 / 首屏合计预算的关系**显式裁决**（不越密度阈值；阈值 7/15 · 9/20 · 17/35 逐字不动） | 密度门禁绿；「末项」位置可判；阈值常量逐字未变 | P0 |
| **FR-IAN-015** | **卡内载体语义扩展（不混用）**：`.ask-fallback` 从「作答 / 描述」扩展为「**发起任意新回合**」；**「描述」语义（`op.describe` 有值相 ⇒ `submitDescribe`，本地结算、不成回合）逐字不变**；不得把 label 当输入 | 反证「describe 有值相被改成发起回合 ⇒ 必红」；`nextstep.ts:66-68` 语义保持 | P0 |
| **FR-IAN-016** | **卡内输入提交 = 发起回合**（经 `op.turn` 槽 value 相；详见 §5.3 CHAN） | 端到端：卡内输入 + 提交 ⇒ 成回合；不经第二条通道 | P0 |
| **FR-IAN-017** | **零新增载体**：`KIND_SET` **40** 逐字 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` 逐字不动 | `messaging` / `stream-model` / `host-registry` 断言绿 | P0 |
| **FR-IAN-018** | **输入文本仅走 `chat` `user` 载荷**：不进流内 payload / digest / 审计 / DOM 四面（法八）；卡固化文案不回显值（`askFixedText` 只写 FACT） | `law8-plaintext` 断言**零降级**且必绿；逐面扫描零明文 | P0 |
| **FR-IAN-019** | **可访问性**：展开即 `focus()` 到卡内 input（沿用 `setCardFallbackOpen(open=true)` 先例）；Tab 序可达 + 键盘可提交 + 取消可达 | 键盘路径端到端；无悬空焦点（见 EC-IAN-010） | P0 |

### 5.3 CHAN — 提交通道与「手输 / AI 驱动」区分（**核心 2**，叶1；承 O-IAN-011）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-020** | **提交复用 `op.turn` 槽**：卡内输入提交经 `bindPanelOps.turn`（`sidepanel.ts:3782-3784`）→ `requestTurn`；**不新增**注册表外直连 | 端到端「卡内输入 → `op.turn` 槽 → `requestTurn`」；`ops.ts:29-35` 「`op.turn` is the ONLY `requestTurn` caller」注释与实现一致 | P0 |
| **FR-IAN-021** | **`requestTurn(` 计数重锚为恰 1**：唯一生产输入提交点 = `op.turn` 槽（composer submit 退役后）；门禁从「恰 2」**等价重锚**为「恰 1」并**附反证** | `test/op-wiring.test.ts:127-134` 重锚（`expectFailPattern` 更新）；反证「注入第 2 个 `requestTurn(` 调用点 ⇒ 必红」 | P0 |
| **FR-IAN-022** | **手输与 AI 驱动留痕显式区分**：手输回合与 AI 驱动回合在留痕 **driver 字段**上取值**不同**且可判（两值均在唯一声明源；留痕仍**只含字段名 / 不含值**） | 留痕行逐行断言两值可判；`next-registry/ai-drive.ts:85` 零值纪律保持；反证「两路径同值 ⇒ 必红」 | P0 |
| **FR-IAN-023** | **手输保留「AI 让位 + 静默期」**（`proactivity.noteUserTurn()` 语义，现状在 composer submit `sidepanel.ts:3757`）；**不得**移入 `requestTurn` 内部（否则会锁住 AI 的答案后续流，注释 `:3752-3755`） | 断言「手输路径调用让位语义」+「`requestTurn` 内部不含让位调用」；反证「移入内部 ⇒ 必红」 | P0 |
| **FR-IAN-024** | **`op.turn` ∈ `auto` 档的语义边界**：AI 可自主按 `auto` 档；但**用户手输文本不得被 AI 代答 / 代填 / 自动提交**（手输路径的发起者恒为用户手势） | 注入反证：构造「AI 代提交手输文本」⇒ 必红；`op-three-tier` / 红线⑥判据保持 | P0 |
| **FR-IAN-025** | **特权 op 恒 `gesture` 不受影响**：`op.authorize` / `op.perm.request` 恒 gesture、「SW 永不调用 `.request(`」；流内输入面**不得**成为绕过面 | `test/capability-wiring.test.ts:51-58` + `op-three-tier` 绿；新增「输入面不触及特权 op」断言 | P0 |

### 5.4 R6Q — R6 排队 / 草稿回填迁移（**核心 3**，叶1 + 叶2 分工）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-030** | **SW 有界队列语义保留**：`TURN_QUEUE_MAX = 1` / FIFO / 永不无界 / 永不静默 / `classifyChatRequest` 三分支（`executed`/`queued`/`busy-rejected`）/ `drain()` 引用快照 / `ai-deferred` | `turn-queue` / `turn-arbitration` 判据**不降级**；`turn-queue.ts` 裁决逻辑 diff = 0 | P0 |
| **FR-IAN-031** | **提交入口：双入口并存 → 收敛为流内唯一**（叶1 = 新增流内入口 ∧ **composer 入口保留可用**；叶2 = 删除 composer 入口 ⇒ 唯一化） | 叶1：两入口均可提交（中间态保护，S0''-B）；叶2：`#composer` 不存在 ⇒ 仅流内入口 | P0 |
| **FR-IAN-032** | **草稿回填载体迁移**：`busy-rejected` 回填**流内输入**（叶1 = 新增流内回填支持 ∧ `#input` 回填保留；叶2 = 唯一化到流内） | 叶1：两载体回填均可判；叶2：回填仅流内；语义不变（不丢原话 / 不覆盖新输入 / 有可读行） | P0 |
| **FR-IAN-033** | **回填不覆盖新输入**：仅当输入处为空时回填；卡已收起 ⇒ **重新展开卡内输入并回填**；非空时只留痕（原话仍在流内 `user` 行） | 判据「拒绝后输入处 value == 被拒文本 ∧ 存在可读行」+「非空时不覆盖」；`turn-arbitration.test.ts:49-60` TA-4 **重锚非删除** | P0 |
| **FR-IAN-034** | **留痕行保留**：`queued` ⇒「已排队」行；`busy-rejected` ⇒「正在处理上一条，未发送」行（载体 = 既有 `system`/notice，**零新增 kind**） | 两句留痕可判；`QUEUED_TURN_TEXT` / `BUSY_REJECTED_*_TEXT` 判据重锚 | P0 |

### 5.5 ABOL — `#composer` 废除面（**核心 4**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-040** | **DOM 真退役**：`#composer` / `#input` / `#send` **从 `index.html` 移除**（**非 `hidden`**）；`body` 尾「最后一个布局元素 = `#composer`」断言随之**等价重锚**为「不存在」 | `index.html` 三 id 零命中；`density-thresholds` / `sidepanel-view` 重锚断言 | P0 |
| **FR-IAN-041** | **CSS 退役**：`#composer`（`:577`）/ `#input`（`:578-587`）/ `#input::placeholder` / `#input:disabled` / `#send`（`:591-598`）/ `#send:hover` 规则移除；**不得**留死规则 | CSS 选择器零命中；构建后无死规则 | P0 |
| **FR-IAN-042** | **双写者消解（D-A）**：删除 `syncComposerVisibility()`（`sidepanel.ts:2884-2891`）及其调用点（`:2245` render / `:3616` openL2View）；`l0.revealFallback/hideFallback`（`l0/shell.ts:90-105`）**只操作卡内 `.ask-fallback`**（`setAskFallbackOpen` / `setCardFallbackOpen`），**不再写 `composer.hidden`** | 函数与调用点零命中；`l0/shell.ts` 无 `composer` 写入；断言「唯一输入面 = 卡内」 | P0 |
| **FR-IAN-043** | **历史锁存消解（D-B）**：删除 `fallbackOpen`（`sidepanel.ts:2883`）及其全部读写（`:2896` / `:856`） | 标识符零命中；反证「重新引入历史锁存 ⇒ 状态不可判 ⇒ 必红」 | P0 |
| **FR-IAN-044** | **设置态漏隐藏消解（D-C）**：`openL2View('settings')` 提前 return 路径**不再需要输入面护栏**（面不存在）；`body.settings-open` 隐藏三区（`index.html:670-672`）**逐字不变**（不得借机改动三区语义） | settings 路径无输入面；三区 CSS 逐字未变 | P0 |
| **FR-IAN-045** | **测试钩子重锚**：`__v3.testing.revealFallback/hideFallback`（`sidepanel.ts:851-858`）重锚为**只操作卡内 `.ask-fallback`**（或按台账显式退役）；**不得留死写点 / 空转钩子** | 钩子行为可判（驱动卡内展开 / 收起）；`hideFallback` 不再依赖已删锁存；无死写点 | P0 |
| **FR-IAN-046** | **`NEVER_FOLDABLE` 重锚**：`disclosure.ts:164` 移除 `'composer'`；`:147` 注释的算术（12 − 1 + 3 = 14）同步订正；**保留面计数判据不得恒真** | `NEVER_FOLDABLE` 不含 `'composer'`；计数断言重锚（禁恒真） | P0 |
| **FR-IAN-047** | **兼容读取面登记退役**：X-IAN-2（`host-registry.ts:144-146` PRESERVED 列表移除 `#composer`/`#input`/`#send`）+ X-IAN-3（`#composer` **入** `RETIRED_CONTAINER_IDS`；`density-thresholds.test.ts:775` 反证重锚） | `host-registry` 判据重锚；`RETIRED_CONTAINER_IDS` 长度 / 内容**只增不删**（13 → ≥14）且逐项有去向登记 | P0 |
| **FR-IAN-048** | **陈旧注释同步**：`sidepanel.ts:1107-1108` / `l0/shell.ts:96-99` / `stream-render.ts:66-71` / `index.html:1414-1418` 中「`#composer` 出流保留」类注释**不得与产品态矛盾** | 注释扫描：无「保留 `#composer`」类陈留；注释与实际一致 | P0 |
| **FR-IAN-049** | **法四新条文可机核**：DOM 中**不存在** `#composer` / `#input` / `#send`；`#composer` ∈ `RETIRED_CONTAINER_IDS`；默认屏零可见输入框 ⇒ **「流外零输入面」可判** | 法四门禁（FR-IAN-064）绿 + 反证（注入 `#composer` ⇒ 必红） | P0 |

### 5.6 CONV — 兜底收敛 / 状态提示 / 草稿 / a11y / 引导（叶1 + 叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-050** | **四处兜底入口收敛**：E1（`decision-region.ts:162-170`）/ E2（`sidepanel.ts:1512-1515`）/ E3（`:3650`）/ E4（`:3786-3789` 空值相）**全部只 reveal 卡内 `.ask-fallback`** | 四入口端到端：展开的是卡内输入；无第二输入面 | P0 |
| **FR-IAN-051** | **停止附带 reveal 流外面**：E3 的 `revealFallback: () => revealAskFallback()` 装配**不再**级联到流外第二面（`l0/shell.ts:90-105` 的 `#composer` 写入删除）；「双 reveal」消解 | `revealAskFallback` 调用链无流外面；反证「重新级联 ⇒ 双输入面 ⇒ 必红」 | P0 |
| **FR-IAN-052** | **卡内 `.ask-fallback` = 唯一兜底输入载体**：`op.describe` 无值相 / 「其他…（我来描述）」/ L1 装配 / describe 空值**四处同一载体**；`describe` **有值相**仍走 `submitDescribe`（本地结算） | 「唯一载体」判据可判（不恒真）；`op.describe` 有值相语义不变 | P0 |
| **FR-IAN-053** | **`#send-reason` 保留但断言重锚**：`#send-reason` **仍在** `#region-statusbar` 内（状态提示 ≠ 输入面；`host-registry.ts:295-321` 保留要素）；`density-thresholds.test.ts:787-814,864` 判据**等价重锚** | `#send-reason` 在状态栏（判据非恒真）；离开状态栏必红；单写判据保留 | P0 |
| **FR-IAN-054** | **`sendDisabled` 语义重锚**：`sendDisabledReason`（`view-model.ts:298-315`）/ `buttonStates.sendDisabled`（`:384-400`，R6 = `!hasOrigin`）/ `AskFlowView.sendDisabled`（`:404-423`）重锚到**流内输入面**状态：禁用仅保留**异常态**（无活跃站点 / 未绑定）；**在飞不再硬禁用**（R6 语义保持） | 断言：在飞时流内输入面可提交；无活跃站点 ⇒ 禁用 + 可读原因 | P0 |
| **FR-IAN-055** | **设置 ⇄ chat 草稿保持重锚**：`settingsViewSwitch.getDraft/setDraft`（`sidepanel.ts:1337-1341`，现状读写 `#input.value`）重锚到**流内输入载体**（或按台账显式退役该能力）；`settings.test.ts:191` 判据重锚 | 切设置再回来草稿保持（或显式登记退役 + 台账）；判据不删除 | P0 |
| **FR-IAN-056** | **首装引导改指**：`ONBOARDING_TEXTS[4]`（`view-model.ts:350`「在**输入框**输入指令并发送，开始对话」）改指**流内 next「自由输入…」项**；断言重锚 | 引导文案不指向已废面；文案与流内入口一致 | P0 |

### 5.7 LAW4 — 法四原地修订（**核心 5**，叶2；承 O-IAN-007）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-060** | **新旧条文逐字**：old（**逐字**）=「**输入按需出现**：无常驻输入框（沿用 E 的「页面即输入」主线）；`ask-user` text 型输入框只在问题卡内出现，卡内还有「其他…（我来描述）」兜底」（`v4-chat/spec.md:116`）；new（**逐字**）=「**输入即 next**：自由文本输入是流内 next 的一个选项；**流外零输入面**」；载体 = **原地修订**（**不升格**法十） | 新旧条文逐字入 §5.7；`v4-chat/spec.md` 三处一致；无「法十」新增 | P0 |
| **FR-IAN-061** | **修订落点三处一致**：`v4-chat/spec.md:116`（法则表）/ `:225`（FR-CHAT-014）/ `:385`（AC-CHAT-007）**全部**改为新口径（措辞可因体例微调，**语义逐字等价**） | 三处逐条核对；不得只改一处（半修即红） | P0 |
| **FR-IAN-062** | **supersession 台账登记 old→new**：入 `docs/*-supersession-ledger.json`（或等价台账），含**逐字 old / 逐字 new / 理由 / 日期 / 落点 file:line**；**老 `redlineRemap ≥3`（含「composer 贴底」）逐字保留不删** | 台账新增条目 + 老条目保留；`supersession-ledger.test.ts:1452` 绿（`redlineRemap ≥3` 不降） | P0 |
| **FR-IAN-063** | **法四判据重锚清单**：钉了「法四 / 默认屏无可见常驻输入框 / `#composer` 出流」的断言**逐条重锚**（等价或更强）：`l0.mjs` ③⑪ / `journey.mjs` #15c / `insight.mjs` #I-08b / `binding.mjs` :69 / `density-thresholds` / `sidepanel-view` —— **不得静默删除** | §9.5 对账表逐条有 old→new；断言计数**只增** | P0 |
| **FR-IAN-064** | **法四机核门禁**：新增 node 门禁 `test/law4-input-as-next.test.ts`（形态承 `law7x-ext` / `law9`：**双向反证 + 注入必红 + 三段控制禁恒真 + 真源切片**），读**生产真源**（`index.html` DOM + `host-registry` 判据 + 卡内载体），**不得**读测试自建常量 / 不得自我裁决 | 门禁可 FAIL（注入 `#composer` ⇒ 红；中性输入 ⇒ 不判）；纳入 `gate-integrity` 受审集合（下界只增） | P0 |

### 5.8 S0'' — 首验收场景机器化（**地位 = F-34 之 S0′ / v5.5 之 S0 / v5 之 S2**）

**场景（两段：① 中间态保护 ② 终态零可达；逐环节）**

```
【S0''-A 中间态（ian-1 完成后；新旧并存）】
拾取引用 → 作答（ask 卡）
  → 推荐区出现「自由输入…」（最末项）→ 点开就地展开卡内输入 → 提交补充指令
  → 成回合（经 op.turn 槽；requestTurn( 直连 = 1）
  → 在飞时再输入 → queued（可读留痕）→ 回合结束后自动发送
  → 另一次在飞时提交（队满）→ busy-rejected → 原话回填（不覆盖新输入）
  → ★ 同时：旧 composer submit 入口与 #input 回填【仍可用】（现网行为未破坏）

【S0''-B 终态（ian-2 完成后；无 composer）】
同上全链，且：
  → ① #composer / #input / #send 【不在 DOM】（流外零输入面）
  → ② 唯一输入面 = 流内卡内输入；唯一草稿回填载体 = 流内输入
  → ③ 法四 = 新条文（原地修订已落 + 台账在册）
  → ④ 18 门禁逐一处置完毕、断言计数只增、CHROMIUM_GATES === 9
  → ⑤ 留痕 driver 区分（手输 ≠ AI 驱动）可判
```

| 步 | 环节 | 机核断言 |
|:-:|---|---|
| S0''-1 | 拾取引用（沿用 F-34 引用链） | 引用事实 `validCount ≥ 1` |
| S0''-2 | 作答（ask 卡） | 答案结算 + 原话可读 |
| S0''-3 | **推荐区「自由输入…」**（按需最末项）点击 ⇒ **卡内输入就地展开** | 项存在且为最末项；展开后卡内 input 可见 + 获 focus；`KIND_SET` 40 不动 |
| S0''-4 | **提交补充指令 ⇒ 成回合** | 经 `op.turn` 槽；`requestTurn(` 直连计数 = 1；`chat` `user` 载荷 = 输入原文 |
| S0''-5 | **在飞时再输入 ⇒ `queued`** | 「已排队」行可读；回合结束后自动发送；输入面仍可达 |
| S0''-6 | **队满 ⇒ `busy-rejected` ⇒ 回填** | 回填到**流内输入**；**仅当为空**（不覆盖新输入）；卡收起 ⇒ 重新展开；有可读行 |
| S0''-7 | **流外零输入面** | `#composer`/`#input`/`#send` DOM 零命中；默认屏可见输入框 = 0（终态） |
| S0''-8 | **中间态保护 / 终态零可达** | ian-1：新旧两入口**均可提交**（旧入口未破坏）；ian-2：旧入口**零可达**（元素不存在，非 `hidden`） |
| S0''-9 | **留痕 driver 区分** | 手输回合 driver 值 ≠ AI 驱动回合 driver 值（两值可判；不含值） |
| S0''-10 | **零新增载体 + 红线** | `KIND_SET` 40 / 12 kind / 零宿主 / 法八四面零明文：逐字 / 逐面可判 |

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-070** | **S0'' 全链机器化**：上表 S0''-1~10 逐步可判（node 面 + Chromium 面双面），样本单源 | 双面全绿；**Chromium 面只在既有 `s0-self-driven.mjs` 加断言不加文件** | P0 |
| **FR-IAN-071** | **中间态保护（决定性）**：ian-1 完成时**新旧两入口并存可用**（composer submit 仍能发起回合 + 卡内入口可发起回合）；**不破坏现网行为** | 双入口端到端各跑通一轮；反证「ian-1 破坏旧入口 ⇒ 必红」 | P0 |
| **FR-IAN-072** | **排队 / 回填终态**：在飞时可输入；`queued` / `busy-rejected` 留痕 + 回填（不覆盖）可判 | 三项断言（排队留痕 / 拒绝留痕 / 回填条件）+ 各自反证 | P0 |
| **FR-IAN-073** | **终态流外零输入面**：ian-2 完成时旧面**零可达**（元素不在 DOM）；法四判据绿 | 元素零命中 + 法四门禁绿 + 反证（注入 ⇒ 必红） | P0 |
| **FR-IAN-074** | **人工面如实登记**：真机观感 / 键盘 / 读屏等 headless 不可合成项逐项标注 `⏳ 未执行`，**不冒充 PASS** | §9.4 人工面清单；无 `PASS` 冒充 | P0 |

### 5.9 SUPERSEDE — X-IAN-1~11 显式取代（**判据等价重锚，不是放宽**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-080** | **X-IAN-1** 法四「输入按需出现（无常驻输入框；text 只在卡内）」→ **「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」**（原地修订 + old→new 台账） | FR-IAN-060~064 + 台账条目 + 三处一致 | P0 |
| **FR-IAN-081** | **X-IAN-2** `#composer`/`#input`/`#send` 为**保留（兼容读取面）** → **入退役面**（DOM 真退役）；`host-registry.ts:144-146` PRESERVED 列表同步 | FR-IAN-047 + `host-registry` 判据重锚 | P0 |
| **FR-IAN-082** | **X-IAN-3** 「`#composer` **不得**入 `RETIRED_CONTAINER_IDS`」反证 → **入退役容器册**（`density-thresholds.test.ts:775` 重锚为「必须入册」）；长度 13 → ≥14 且逐项有去向 | FR-IAN-047 + 反证重锚（非删除） | P0 |
| **FR-IAN-083** | **X-IAN-4** `<form id="composer" hidden>` + body 尾 + 「之后无布局元素」断言 → **等价重锚**为「**流外零输入面**（三 id 均不在 DOM）」+「流内输入卡存在且可用」 | `density-thresholds.test.ts:389-409,776` / `sidepanel-view.test.ts:657-659` / `journey.mjs` #15c / `l0.mjs` ③⑪ / `insight.mjs` #I-08b / `binding.mjs` :69 逐条重锚 | P0 |
| **FR-IAN-084** | **X-IAN-5** `#I-08`（composer 贴底 ∈[0,+8px]）/ `#I-09`（`#tree-fab` ∩ `#composer` = 0）→ **随元素退役消解**或重锚到流内输入卡几何（**可判性显式登记**，不得留悬空读面） | `insight.mjs:18-19,358-382,461-471,655` 逐条处置；几何读面对不存在元素**不得**静默 `null` 通过 | P0 |
| **FR-IAN-085** | **X-IAN-6** `requestTurn(` **恰 2** → **重锚为恰 1**（唯一生产输入提交点 = `op.turn` 槽） | `op-wiring.test.ts:127-134,361` 重锚 + 反证 | P0 |
| **FR-IAN-086** | **X-IAN-7** `busy-rejected` 草稿回填 `#input` → **重锚到流内输入**（语义不变：不丢原话 / 不覆盖新输入 / 有可读行） | `turn-arbitration.test.ts:49-60` TA-4 重锚（**删回填仍必红**）+ `sidepanel.ts:3984-3991` 重锚 | P0 |
| **FR-IAN-087** | **X-IAN-8** 设置 ⇄ chat 草稿保持 `#input` → **重锚**（流内输入载体）或**显式退役**该能力（二择一并留台账） | `sidepanel.ts:1337-1341` + `settings.test.ts:191` 重锚；二择状态登记 | P0 |
| **FR-IAN-088** | **X-IAN-9** `NEVER_FOLDABLE` 含 `'composer'` → **退役**（元素不存在 ⇒ 无需永不折叠）；计数口径同步 | FR-IAN-046；`disclosure.ts:69,147,164` 三处一致 | P0 |
| **FR-IAN-089** | **X-IAN-10** 首装引导「在**输入框**输入指令并发送」 → **改指**流内 next「自由输入…」项 | FR-IAN-056 + 断言重锚 | P0 |
| **FR-IAN-090** | **X-IAN-11** `binding.mjs` `DIAG_SELECTORS` 含 `composer` + 真实键入 `#input`/`#send`（`:115,905,1034-1038,1094-1096`）→ **重锚**诊断面到流内输入；真实键入路径等价 | FR-IAN-103/104 + `binding` 保段双绿（若动段前则字节中立补偿） | P0 |
| **FR-IAN-091** | **未发生的取代如实登记「未发生」**：任何 X-IAN 项若在 plan 评估后确认不需要取代（如某断言天然仍成立）⇒ **显式登记「未发生」+ 理由**，**不得留空 / 不得伪造**；取代台账与判据重锚**同轮完成**，不得拆到「下一轮补」 | §12 每行有「已发生 / 未发生」状态；台账条目与 X 项一一对应 | P0 |

### 5.10 GATE — 门禁等价重锚与台账

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-100** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 各门禁前后计数对账表（§9.5）无减少项 | P0 |
| **FR-IAN-101** | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | 每个新增 / 重锚判据附反证记录（注入点 + 还原 sha） | P0 |
| **FR-IAN-102** | **取代台账登记**：X-IAN-1~11 逐条落 `docs/*-supersession-ledger.json`（或等价台账），含 `knownGap` 一致性；**老台账条目（v3/v4/v5/v5.5/F-34）一律保留不动** | 台账新增条目 + 一致性门禁绿 | P0 |
| **FR-IAN-103** | **保护段处置**：journey **活跃 pin `43054..58287` / sha `cc79f413…`** + binding **`107780..115930` / sha `be9ad0e9…`** 逐段决策（`keep` / 八步显式取代）；**若取代 ⇒ 走八步 + 哈希变更 old→new + 理由 + 日期台账留痕**；若 `keep` ⇒ **字节中立**（段前等长补偿 ⇒ 双绿）；**禁静默改写** | 保护段门禁绿；八步记录或字节中立证明齐备 | P0 |
| **FR-IAN-104** | **18 门禁逐一处置清单**（**禁漏项**）：node **10** = `op-wiring` / `turn-arbitration` / `r6-ty-experience-fix` / `sidepanel-view` / `density-thresholds` / `host-registry` / `supersession-ledger` / `insight-tree-hierarchy` / `settings` / `size-baseline`；Chromium **8** = `insight` / `journey` / `l0` / `binding` / `recommendation` / `s0-self-driven` / `l1` / `hardening`；每条给出「保留 / 等价重锚 / 显式取代（+台账）」三态之一 + old→new 定位 | §9.5 处置表 18 行齐备且三态齐；无「未处置」项 | P0 |
| **FR-IAN-105** | **新增门禁登记**：新 node 门禁 `test/free-input-next.test.ts`（FR-IAN-010~019）+ `test/law4-input-as-next.test.ts`（FR-IAN-064）纳入 `gate-integrity` 受审集合（下界**只增**）；**不新增 Chromium 门禁文件**（`CHROMIUM_GATES === 9` 不动） | `gate-integrity` 绿 + 下界 = 前值 + 2；Chromium 门禁计数 = 9 | P0 |
| **FR-IAN-106** | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile）；`KL-N-10` 处置 = 首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口** | 执行记录 + `gate-integrity` 绿 | P0 |

### 5.11 VOL — 体积分列预算

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-IAN-110** | **分列预算**：明列 **A 列（`dist/sidepanel.js`，计入账本）** 与 **B 列（`dist/background.js`，不计入 sidepanel 账本）**；**逐叶分列**（ian-1 正增量 / ian-2 净负增量）；冻结面单列；给出上下界 + 15% 缓冲（§5.11.1 表） | 预算表逐格可核（含 15% 缓冲列）；**先预算后落地** | P0 |
| **FR-IAN-111** | **距档结论**：按 15% 缓冲口径给出「**不触发升档**」结论与余量；同时按 **v55 历史低估 2.8×** 给出最坏情形 ⇒ **预置升档 EC 路径** | §5.11.1 两行结论（正常口径 / 2.8× 最坏口径）；EC-IAN-016 已登记 | P0 |
| **FR-IAN-112** | **冻结面零容差**：`content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** —— 逐字节 / 逐字不变（量值 + sha 双锚） | 构建后 `stat` + sha256 前后一致；`content.test.ts` 绿 | P0 |
| **FR-IAN-113** | **越限路径 = EC 显式路径 + 作者一行**：若叶收口实测越**生效上限**（`floor(baseline × 1.05)`）⇒ 显式重登记基线（同源前移）；若越**档位 614,400** ⇒ 走 EC 显式升档路径 + **作者一行**；`authorConfirmation` **不得**伪称已确认 | EC-IAN-016 逐分支；`authorConfirmation` 读值断言 | P0 |
| **FR-IAN-114** | **每叶收口实测重登记**（不等两叶合计）：**五要素**（前后值 / 日期 / 来源 / 理由 / 历史保留）+ V3-VOL-3 **三值**（`newBaselineBytes` / `absoluteCeilingBytes` / 生效上限）同源前移；**ian-2 的净负增量必须如实登记为负值**（不得只报 Σ） | 逐叶登记条目存在；五要素齐备；算术机核绿；ian-2 登记为负或显式说明非负 | P0 |
| **FR-IAN-115** | **预算不得跨叶混算规避**：ian-2 **不得**以 ian-1 的余量掩盖自身净增（**删面应净负增量**）；**不得**为绕门禁把代码搬进 / 搬出 sidepanel（归因必须逐模块） | 落地归因表（逐模块 → 产物）；反证「把 A 列改动搬 B 列规避 ⇒ 必红」 | P0 |

#### 5.11.1 体积分列预算表（**spec 阶段先出，禁止未预算先排落地**）

**统一前提（本轮只读复核，§2.5B）**：A 基线 **591,946 B** · 生效上限 `floor(591,946 × 1.05) = `**`621,543`** B（余量 **29,597 B**）· **档位 614,400 B**（**距档 22,454 B**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（**未闭合义务**）。**B 列（`dist/background.js`）不计入 sidepanel 账本**。

| 列 | 产物 | 叶1（ian-1 新面）落地项 | 叶2（ian-2 废面）落地项 | 计入账本 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | next provider「自由输入…」产出 + 卡内输入渲染（`.ask-fallback` 家系扩展）· 卡内输入 → `op.turn` 槽接线 · 手输 driver 留痕 + 让位语义 · 流内回填支持 + 卡内 focus | **删除**：`#composer`/`#input`/`#send` DOM + CSS + `syncComposerVisibility` + `fallbackOpen` 锁存 + 钩子重锚 + `NEVER_FOLDABLE` 项 − **新增**：四处兜底收敛接线 + `#send-reason`/`sendDisabled` 重锚 + draft 重锚 + 引导文案 | ✅ |
| **B** | `dist/background.js` | （无 —— 本 Feature 不触 SW 队列本体；`turn-queue.ts` 零 diff） | （无） | ❌ |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1（ian-1） | 叶2（ian-2） | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增）** | **+2.5 ~ +4.5 KB**（正增量：新面 + 通道 + 回填迁移） | **−2.5 ~ −1.0 KB**（**净负增量**：删面 > 新增收敛接线） | **−0.0 ~ +3.5 KB** | **−0.0 ~ +4.0 KB** | **距档余量 = 22,454 B ⇒ 正常口径下不触发升档**（远未越生效上限 29,597 B） |
| **B 列（background.js，不计账）** | 0 KB（零改动） | 0 KB（零改动） | 0 KB | — | 本 Feature 不改 SW 面 |
| **v55 历史低估系数 2.8× 最坏情形（A 列 Σ 上界 3.5 KB）** | — | — | **≈9.8 KB** | **≈11.3 KB** | **仍 < 22,454 B ⇒ 即使 2.8× 低估也不触发升档**（**预置 EC-IAN-016 显式升档路径 + 作者一行**以防实测越界） |

> **口径与纪律**：① 上表为 **spec 阶段估算（非承诺）**；② **每叶收口实测重登记**（FR-IAN-114），不得以估算充当实测；③ **ian-2 必须净负**（FR-IAN-115）——若 plan 评估显示 ian-2 净值 > 0，须显式登记「为什么删面没有净负」并重新校准（承 F-34 叶2 越预算基线上界的诚实登记先例）；④ **不得**把 B 列改动搬进 A 列规避 / 或把 A 列搬出以绕开门禁；⑤ 升档须走 EC-IAN-016 + **作者一行**（**未闭合义务不得伪称已确认**，N-IAN-013）。

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| **NFR-IAN-001** | 性能/体积 | `dist/sidepanel.js` ≤ 生效上限 `floor(baseline × 1.05)`；**判定 = 公式唯一**（`SIDEPANEL_CEILING_CAP` 保持 `record-only`） | `size-budget` 绿；实测 ≤ 上限；越限走 EC-IAN-016 |
| **NFR-IAN-002** | 安全 | 特权 op（`op.authorize` / `op.perm.request`）**恒 gesture**；流内输入面**不触达** | `test/capability-wiring.test.ts` 绿 + 新增反证 |
| **NFR-IAN-003** | 安全 | consent / gesture **不得**被 AI 代答 / 代填 / 自动提交（**含手输变体**） | 注入必红（红线⑥精神扩手输变体） |
| **NFR-IAN-004** | 安全 | 法八**四面零明文不退化**（流内 payload / digest / 审计 / DOM value 与全部属性）；输入文本仅走 `chat` `user` 载荷 | `law8-plaintext` 断言全绿、**零降级** |
| **NFR-IAN-005** | 安全 | `packages/web-cli-base/**` **零 diff**；判定链（`policy.ts` / `auto-authorize.ts`）**零触碰** | `insight-no-escalation` 绿 + `zeroDiffFiles` 哈希 pin 绿 |
| **NFR-IAN-006** | 安全 | 兜底收敛 / 面退役**不得放松**任何既有 fail-closed 方向（引用判定 / 授权档位 / 描述结算） | 反证族逐条；`ref-validity` 3 结果 / `tierOf` 语义不变 |
| **NFR-IAN-007** | 兼容 | **零新增载体**：12 kind 逐字 / `REGISTERED_STRUCTURAL_HOSTS = []` / `KIND_SET` **40** | `stream-model` / `host-registry` / `messaging` 断言绿 |
| **NFR-IAN-008** | 兼容/可用性 | 卡内 `.ask-fallback` 复用时**不改变**「作答 / 描述」既有语义（`op.describe` 有值相仍本地结算、不成回合） | 端到端：作答 / 描述路径逐字不变；反证「描述被改成发起回合 ⇒ 必红」 |
| **NFR-IAN-009** | 可访问性 | **focus 落卡内输入**：展开即 focus；Tab 序无悬空焦点；键盘可提交 / 可取消 | 键盘路径端到端 + 无悬空焦点断言 |
| **NFR-IAN-010** | 可机核 | **法四可机核**：双向反证 + 注入必红 + **三段控制禁恒真** + 真源切片 | `test/law4-input-as-next.test.ts` 全绿 |
| **NFR-IAN-011** | 可用性 | **零死端**：自由输入在无其他候选时仍可达；禁止「下一步：无」式假推荐 | `no-dead-end` **只增必绿** |
| **NFR-IAN-012** | 环境/纪律 | 门禁**严格串行**；**无新依赖**；**不改** `.opencode/opencode.json`；`F-29` 区段一字不动 | 执行记录 + §16 纪律表逐条 |
| **NFR-IAN-013** | 兼容 | **默认屏零可见常驻输入框**不退化（法四语义保持） | 默认屏可见输入框 = 0 断言绿 |
| **NFR-IAN-014** | 可维护 | **扩展点固定**：一个 next provider + 一个卡内输入载体 + 一个 `op.turn` 槽；**唯一声明 / 唯一载体**（第二声明 / 第二载体 ⇒ FAIL） | 反证：第二 provider / 第二输入载体 ⇒ 必红 |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| **EC-IAN-001** | 推荐区**无其他 next 候选**（仅有「自由输入…」） | **自由输入仍可达**（不得因候选为空而不可达）；零死端门禁必绿 |
| **EC-IAN-002** | 在飞（`pending`）时点开「自由输入…」并提交 | 输入面**不被硬禁用**（R6 语义）；提交走 SW 有界仲裁（`queued` / `busy-rejected`）；留痕可读 |
| **EC-IAN-003** | `busy-rejected`（队列已满） | 原话**回填流内输入**；卡已收起 ⇒ **重新展开**并回填；**仅当为空**（不覆盖用户新输入）；有可读行 |
| **EC-IAN-004** | 卡内输入**为空**提交 | **不产生空回合**（显式判据：空 / 纯空白不提交，且**不静默**）；不得静默吞掉 |
| **EC-IAN-005** | 输入文本含**凭据形值** | 仅走 `chat` `user` 载荷；**不入**流内 payload / digest / 审计 / DOM 四面（法八）；卡固化文案不回显值 |
| **EC-IAN-006** | **设置视图打开时**（`body.settings-open`） | 流外零输入面成立（无 `#composer` 需隐藏）；三区隐藏 CSS（`:670-672`）逐字不变；**不得**因删面改动三区语义 |
| **EC-IAN-007** | **text 型 ask 卡**与「自由输入…」卡内输入**并存** | 两个流内输入面共存的口径显式：各自 `focus` 归属可判；互斥披露（`setCardFallbackOpen`）不得互相干扰；密度预算不越 |
| **EC-IAN-008** | 四处兜底入口（E1~E4）触发 | 只展开**卡内** `.ask-fallback`；**不再**出现第二输入面（无「双 reveal」） |
| **EC-IAN-009** | **ian-1 中间态**：新旧两入口并存 | **两入口均可提交**（旧 composer 未破坏）；**双回填载体**均可判；不得出现「新面吃掉旧面」或反之 |
| **EC-IAN-010** | 键盘路径：删除 `#input` 后 | Tab 序**无悬空焦点**；focus 落卡内输入；`Escape` / 取消可达 |
| **EC-IAN-011** | 视图切换（settings ⇄ chat）时的**草稿** | 草稿保持重锚到流内输入载体（或显式登记退役 + 台账）；**不得**静默丢草稿 |
| **EC-IAN-012** | 在飞时 **AI 自动成回合** 与 **用户手输** 撞车 | SW 既有仲裁：AI 路径不排队（`ai-deferred`）；用户手输按 `queued` / `busy-rejected`；两者留痕 driver 可区分 |
| **EC-IAN-013** | `op.turn` 被 **AI 自主按**（`auto` 档） | **不产生「手输」留痕**（driver 区分可判）；用户手输不得被 AI 代答 |
| **EC-IAN-014** | 窄视口（**320px**）下卡内输入 | 卡内输入不造成水平溢出；密度阈值（7/15 · 9/20 · 17/35）逐字不动且不越 |
| **EC-IAN-015** | 门禁环境性 flake（`KL-N-10` 家族：`page-input` 陈旧 fixture / `binding` CDP / `ask-auth` 陈旧 profile） | 隔离复跑 ≥2、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） |
| **EC-IAN-016** | 体积**越限**（越生效上限 / 越档位 / 越绝对上限） | **越生效上限** ⇒ 显式重登记基线（同源前移）；**越档位 614,400** ⇒ 走 EC 显式升档路径 + **作者一行**；**越绝对上限 675,840** ⇒ 停止并请示作者；`authorConfirmation` **不得**伪称已确认 |
| **EC-IAN-017** | `#composer` 元素**仍在 DOM**（回归 / 半修） | 法四门禁**必红**（真退役，非 `hidden`）；`host-registry` 退役判据必红 |
| **EC-IAN-018** | **注入**：AI 代填 / 自动提交用户手输文本 | **必红**（`expectFailPattern` 声明 + 逐字节还原）；红线⑥判据不被新面绕过 |

---

## 8. 开放问题

> **口径**：discovery 的 **O-IAN-001~011 已由编排器批量裁决**（D1 / D2），逐条落位见 §11，**本节不再重复列入**。下表为 **spec 阶段新识别 / 明确留待 plan 或后续轮**的开放点（`PD-IAN-0xx`），**不在本阶段预设答案**。

| # | 问题 | 为什么可以后置 | 状态 |
|---|---|---|---|
| **PD-IAN-001** | 「自由输入…」**触发的精确候选集合**（恒作末项 ∧ 与其他 provider 的产出次序 ∧ 是否在特定 `timing` 下抑制） | 裁决已定「按需最末项 + 零死端」（FR-IAN-010/013/014）；具体 provider 规则属**寄存器实现细节**，两种读法均满足判据；不影响新面成立 | 待裁决（plan / `next-registry` 评估） |
| **PD-IAN-002** | 卡内输入面**是否与既有 text ask 卡复用同一 `#ask-*` id 家系**，还是**同 kind 内**新增渲染分支（**不新增 kind** 前提不变） | 零新增 kind 是红线（已定）；「复用同一 id 家系 vs 同 kind 内第二渲染分支」是**实现自由度**，两种读法均满足 FR-IAN-011/017；涉及 L2 卡面 id 唯一性（`askuser.ts:94-103` 文档级解析） | 待裁决（plan 评估卡面 id 唯一性 / 密度） |
| **PD-IAN-003** | 手输 driver 字段的**精确取值字面量**（如 `driver=input` vs `timing=manual`）与承载面（`ai-drive.ts` 留痕 vs 新增字段名） | 裁决已定「driver 字段不同值且可判」（FR-IAN-022）；字面量与承载面是**实现自由度**，只要两值可判且留痕零值纪律保持 | 待裁决（plan） |
| **PD-IAN-004** | 「自由输入…」项与「其他…（我来描述）」**在同卡并存时的互斥披露口径**（谁是末项 / 是否同屏两个兜底入口） | FR-IAN-014 只要求「恒为最末项 + 不越预算」；两者并存时的次序 / 互斥属卡面渲染自由度；L2 密度门禁会给出上界约束 | 待裁决（plan / 密度门禁评估） |
| **PD-IAN-005** | 卡内输入面**是否入 L2 卡面上下文**（如是否触发 `aria-controls` / `data-act` 新值） | 裁决已定「不新增 kind / `data-act` 走 `ACT_TO_OP` 单源」（FR-IAN-010/017）；是否需新 act 名属实现细节，须满足「不新增 kind」前提 | 待裁决（plan） |
| **PD-IAN-006** | 设置 ⇄ chat 草稿保持**重锚 vs 显式退役**的最终二择 | FR-IAN-055 允许二择（均须台账）；plan 依体积与必要性裁决；不影响「流外零输入面」成立 | 待裁决（plan 评估） |

---

## 9. 验收标准（总体验收清单，含门禁映射）

> **口径**：AC 为**总体验收**（可跨多条 FR）；每条有唯一 ID 且**可机核或如实标注人工面**。`⏳` = 本轮未执行（spec 阶段零运行时验证）。

### 9.1 核心验收（S0'' 两段 / 自由输入 next / 流内提交 / 流外零输入面 / 取代 / 零新增）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-IAN-001** | **S0'' 全链机器化（两段）**：S0''-1~10 逐步可判（node + Chromium 双面；样本单源）；**① 无 composer 的新面板全链只走流内面；② 中间态新旧并存可用 + 终态旧面零可达** | FR-IAN-070~074 | `test/free-input-next.test.ts`（node）+ `test/ui/s0-self-driven.mjs`（**只加断言不加文件**） |
| **AC-IAN-002** | **流内「自由输入…」next 面**：按需最末项 + 点开就地展开卡内输入 + 不常驻 + 零死端 | FR-IAN-010~014 | `test/free-input-next.test.ts` + 密度门禁 + `no-dead-end` |
| **AC-IAN-003** | **流内提交唯一通道**：卡内输入经 `op.turn` 槽发起回合；`requestTurn(` **恰 1** | FR-IAN-020~021 | 载荷 / 通道断言 + `test/op-wiring.test.ts`（重锚恰 1）+ 反证 |
| **AC-IAN-004** | **手输 ≠ AI 驱动**：留痕 driver 两值可判；用户手输不被 AI 代答 / 自动提交（注入必红）；让位语义保留 | FR-IAN-022~025 | 留痕行断言 + 注入反证（`expectFailPattern`）+ `op-three-tier` |
| **AC-IAN-005** | **流外零输入面**：`#composer`/`#input`/`#send` 不在 DOM；`#composer` ∈ `RETIRED_CONTAINER_IDS`；默认屏零可见输入框 | FR-IAN-040~049 / 049 | **法四门禁**（`test/law4-input-as-next.test.ts`）+ `density-thresholds` + `host-registry` |
| **AC-IAN-006** | **输入面单一化**：四处兜底入口只展开卡内 `.ask-fallback`；无「双 reveal」；卡内为唯一兜底载体 | FR-IAN-050~052 | 四入口端到端 + 反证 |
| **AC-IAN-007** | **R6 零回归**：队列语义保留；入口 / 回填载体迁移；**不丢原话 / 不覆盖新输入 / 有可读行**；`queued`/`busy-rejected` 留痕保留 | FR-IAN-030~034 | `turn-arbitration`（TA-4 重锚）+ `turn-queue` 判据 |
| **AC-IAN-008** | **法四原地修订**：old→new 逐字 + 三处一致 + 台账（老 `redlineRemap ≥3` 保留）；法四可机核 | FR-IAN-060~064 | 条文核对 + 台账 + 法四门禁 |
| **AC-IAN-009** | **零新增载体**：`KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` | FR-IAN-017 / 011 | `messaging` / `stream-model` / `host-registry` 断言绿 |
| **AC-IAN-010** | **X-IAN-1~11 等价重锚**（逐条判据重写，非放宽；未发生者如实登记） | FR-IAN-080~091 | §12 映射表 + 各既有门禁绿 + 台账条目 |

### 9.2 功能验收（状态提示 / 草稿 / a11y / 引导 / 法八 / 排队）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-IAN-011** | **`#send-reason` 保留且判据重锚**：仍在 `#region-statusbar`；状态提示 ≠ 输入面 | FR-IAN-053 | `density-thresholds:787-814,864` + `host-registry:295-321`（非恒真） |
| **AC-IAN-012** | **`sendDisabled` 重锚**：禁用仅异常态；**在飞不再硬禁用**（R6 语义保持） | FR-IAN-054 | `view-model` 判据 + 在飞可提交断言 |
| **AC-IAN-013** | **草稿保持**：切设置再回 chat 草稿保持（或显式登记退役 + 台账）；不静默丢 | FR-IAN-055 / EC-IAN-011 | `settings.test.ts:191` 重锚 |
| **AC-IAN-014** | **a11y focus**：展开即 focus 卡内输入；Tab 序无悬空焦点；键盘可提交 / 取消 | FR-IAN-019 / 045 | 键盘路径端到端 + 无悬空焦点断言 |
| **AC-IAN-015** | **首装引导改指**：不再指向已废面 | FR-IAN-056 | `ONBOARDING_TEXTS` 断言重锚 |
| **AC-IAN-016** | **法八四面零明文不退化**：输入文本仅走 `chat` `user` 载荷；卡固化不回显值 | FR-IAN-018 | `law8-plaintext`（**零降级**） |
| **AC-IAN-017** | **排队 / 回填三路径**：在飞可输入 + `queued` 留痕 + `busy-rejected` 回填（不覆盖）| FR-IAN-072 | 三项断言 + 各自反证 |

### 9.3 取代台账与门禁治理（**18 门禁逐一处置**）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-IAN-018** | **断言零删除零降级、计数只增**（唯一例外 = 保护段显式取代 + 台账） | FR-IAN-004 / 100 | §9.5 计数对账表无减少项 |
| **AC-IAN-019** | **反证实跑 + 逐字节还原**（sha256 前后相同） | FR-IAN-101 | 反证记录（注入点 + 还原 sha） |
| **AC-IAN-020** | **取代台账登记**（X-IAN-1~11 逐条；未发生者标「未发生」；老条目保留） | FR-IAN-005 / 091 / 102 | 台账条目 + 一致性门禁 |
| **AC-IAN-021** | **保护段逐段决策**：journey `43054..58287`（sha `cc79f413…`）+ binding `107780..115930`（sha `be9ad0e9…`）→ `keep`（字节中立双层绿）或八步取代（台账留痕） | FR-IAN-103 | 保护段门禁 + `supersession-ledger.test.ts` |
| **AC-IAN-022** | **门禁受审集合只增**：2 新 node 门禁入集合；`CHROMIUM_GATES === 9` | FR-IAN-105 | `gate-integrity` 绿 |
| **AC-IAN-023** | **门禁严格串行 + `KL-N-10` 处置**（隔离复跑 ≥2；仍红如实记录） | FR-IAN-106 | 执行记录 + `gate-integrity` 绿 |

### 9.4 红线、体积与人工面

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-IAN-024** | **冻结面零容差**：`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 逐字节逐字 | FR-IAN-112 | `stat` + sha256 前后一致 + `content.test.ts` |
| **AC-IAN-025** | **体积分列预算 + 距档结论 + 15% 缓冲**；ian-2 净负；升档走 EC 显式路径 + 作者一行 | FR-IAN-110~115 | §5.11.1 表 + 逐叶重登记 + EC-IAN-016 |
| **AC-IAN-026** | **base 零 diff + 判定链零触碰**（含 `zeroDiffFiles` 哈希 pin） | FR-IAN-005 / 003 | `insight-no-escalation` + `zeroDiffFiles` 机核 |
| **AC-IAN-027** | **人工面如实登记**：真机观感 / 键盘体感 / 读屏逐项 `⏳ 未执行`，不冒充 PASS | FR-IAN-074 | §9.4 人工面清单（下表） |

**§9.4 人工面清单（headless 不可合成项，逐项如实标注）**

| # | 人工项 | 判据来源 | 本轮状态 |
|:-:|---|---|:--:|
| M1 | 「自由输入…」在真机上的**可发现性 / 可理解度**（作者是否一眼看到并明白它就是自由输入入口） | 真机观感（机核只证「项存在 + 可点开 + 可提交」） | `⏳ 未执行` |
| M2 | **时隐时现困扰是否消失**（体感） | 作者体感 | `⏳ 未执行` |
| M3 | 卡内输入的**真机键盘手感 / 焦点流转观感**（Tab / Shift+Tab / Esc） | 作者观感 | `⏳ 未执行` |
| M4 | **读屏可用性**（卡内输入 + `#send-reason` 状态行的可朗读性） | 读屏观感 | `⏳ 未执行` |
| M5 | **排队体感**（在飞时输入的反馈是否足够明确） | 作者体感 | `⏳ 未执行` |

### 9.5 门禁处置与计数对账（**计数只增，逐项处置；18 行禁漏**）

> **口径**：基线数**引自 F-34 closeout**（本轮未复跑，§2.5B）；处置三态 = **保留** / **等价重锚** / **显式取代（+台账）**。**本轮全部标 `⏳`。**

| # | 层 | 门禁 | F-34 后基线 | 钉了 `#composer`/`#input`/`#send` 的位置（发现面） | 处置三态 | 本轮 |
|:-:|:-:|---|--:|---|---|:--:|
| 1 | node | `test/op-wiring.test.ts` | （族内） | `:11,:66,:127-134`（`requestTurn(` 恰 2）/ `:361` | **等价重锚**（恰 2 → **恰 1**）+ 反证 | `⏳` |
| 2 | node | `test/turn-arbitration.test.ts` | 6 | `:12,:49,:60`（TA-4 `busy-rejected` 回填 `#input` 必红） | **等价重锚**（回填载体 → 流内；**删回填仍必红**） | `⏳` |
| 3 | node | `test/r6-ty-experience-fix.test.ts` | （族内） | `:9,:169-173`（在飞不硬禁用 composer） | **等价重锚**（在飞不硬禁用 → 流内输入面） | `⏳` |
| 4 | node | `test/sidepanel-view.test.ts` | （族内） | `:115-120`（R6 在飞仍可提交）/ `:281`（`#input` CSS flex）/ `:657-659`（`<form id="composer" hidden>`） | **等价重锚**（→ 流内输入面 / 三 id 不存在） | `⏳` |
| 5 | node | `test/density-thresholds.test.ts` | 242 | `:102,:115-116,:141`（保留面）/ `:389-409`（body 尾 + hidden）/ `:754-776`（`RETIRED_HOST_ATTRS` 含 `composer`；`:775` 不得入容器册；`:776` form hidden）/ `:787-814,:864`（`#send-reason` 保留） | **等价重锚**（`:775` 反证转「必须入册」；`:389-409` → 「三 id 不存在」；`#send-reason` 保留且非恒真） | `⏳` |
| 6 | node | `test/host-registry.test.ts` | 11 | `:191`（零宿主反证含 `composer`）/ `:260`（`RETIRED_HOST_ATTRS` = decision/composer/l1-panels/strips）/ `:282,:313` | **等价重锚**（`#composer` 入 `RETIRED_CONTAINER_IDS`；长度 13 → ≥14） | `⏳` |
| 7 | node | `test/supersession-ledger.test.ts` | 42 | `:1452`（`redlineRemap ≥3`，含「composer 贴底」） | **保留 + 新增**（老条目逐字保留；新增 X-IAN-1 法四 old→new） | `⏳` |
| 8 | node | `test/insight-tree-hierarchy.test.ts` | （族内） | `:527,:656-657`（journey 保护段显式取代先例，段内逐字读 `#log`/`#composer`） | **保留**（作为取代纪律先例引用）+ 若本轮再取代则走八步 | `⏳` |
| 9 | node | `test/settings.test.ts` | （族内） | `:191`（composer draft restored） | **等价重锚**（draft → 流内载体）或显式退役 + 台账 | `⏳` |
| 10 | node | `test/size-baseline.ts` | （族内） | `:560,:1279,:1504-1506`（v4.5 composer 出流登记）/ `:2237,:3098,:3177,:3246` | **等价重锚 / 新增登记**（逐叶五要素重登记；旧条目保留） | `⏳` |
| 11 | Chromium | `test/ui/insight.mjs` | 118 | `:18-19`（`#I-08` 贴底 / `#I-09` FAB∩composer）/ `:70,:128,:358,:423,:461-471,:655,:818` | **显式取代 / 消解**（几何读面 → 流内输入卡；不得静默 `null` 通过） | `⏳` |
| 12 | Chromium | `test/ui/journey.mjs` | **171** | `:668`（`#send.disabled`）/ `:843-885`（#15c 法四 + 出流 + body 尾 + hidden；**保护段**）/ `:1088,:1106,:1338,:1367` | **等价重锚**（#15c → 「流外零输入面」）+ **保护段**逐段决策 | `⏳` |
| 13 | Chromium | `test/ui/l0.mjs` | 248 | `:18,:228,:321,:375-376`（③ composer hidden + body 尾 + 不进 `#stream`）/ `:1076`（⑪ 默认 hidden）/ `:1081-1095`（⑪ 兜底展开后 `#ask-fallback` 与 `#composer` 均可见）/ `:1321`（BLOCK-03 单写判据） | **等价重锚**（③⑪ → 卡内唯一输入面；单写判据 → 输入面单一） | `⏳` |
| 14 | Chromium | `test/ui/binding.mjs` | 192 | `:49,:59,:69`（`composerHidden` + `inputDisabled`）/ `:115`（`DIAG_SELECTORS` 含 `composer`）/ `:905`（`#send.disabled` + `#send-reason`）/ `:1034-1038`（真实键入 `#input` + realClick `#send`）/ `:1094-1096`（**保护段**） | **等价重锚**（诊断面 → 流内输入；真实键入路径等价）+ **保护段**逐段决策 | `⏳` |
| 15 | Chromium | `test/ui/recommendation.mjs` | 72 | `:146-161,:261,:296`（chip 提交**不填** `#input`） | **等价重锚**（→ chip / 卡内输入语义；不填旧面） | `⏳` |
| 16 | Chromium | `test/ui/s0-self-driven.mjs` | 70 | `:900-902`（驱动 `#input` + `#composer` submit 事件） | **等价重锚**（→ 流内输入驱动）+ **新增 S0'' 断言（只加断言不加文件）** | `⏳` |
| 17 | Chromium | `test/ui/l1.mjs` | 131 | 间接 | **保留**（若因删面而需微调 ⇒ 等价重锚 + 台账） | `⏳` |
| 18 | Chromium | `test/ui/hardening.mjs` | 24 | 间接 | **保留** | `⏳` |

> **间接 / 对账面（不计入 18，但须逐条确认无遗漏）**：`test/notify-tools.test.ts`（6 命中多为消息 `send()`，**非 `#send` 按钮**，逐条区分）/ `test/settings-help.test.ts`（1）/ `test/system-merge.test.ts`（1）/ `test/parity/baseline-catalog.json`（对账基线登记）。**新增门禁**：`test/free-input-next.test.ts`（新）+ `test/law4-input-as-next.test.ts`（新）。**`CHROMIUM_GATES === 9` 不动**（**不新增 Chromium 门禁文件**）。

---

## 10. 覆盖矩阵

### 10.0 缺口全景（**GAP-IAN-01~08**，本规范派生的规范化解构）

> **口径**：discovery 的 18 条问题（Q-IAN-001~018）在**需求层**可归约为 8 个**缺口面**；下表证明**无孤儿**（每缺口有 FR + AC 承载）。

| # | 缺口（需求层） | 由哪些 Q 归约 | 承载 FR | 承载 AC |
|---|---|---|---|---|
| **GAP-IAN-01** | 自由输入**无法在流内表达**（无 provider / act / chip / 流内输入） | Q-IAN-003 | FR-IAN-010~014 / 016 | AC-IAN-002 / 001 |
| **GAP-IAN-02** | 流外输入面与 all-in-chat/next 主线**自相矛盾**（母问题） | Q-IAN-001 | FR-IAN-040~041 / 047 / 049 | AC-IAN-005 / 001 |
| **GAP-IAN-03** | `#composer` 显隐**与历史相关、不可判**（D-A/B/C） | Q-IAN-002 | FR-IAN-042~045 | AC-IAN-005 |
| **GAP-IAN-04** | R6 排队 / 草稿回填**绑在流外面** | Q-IAN-004 | FR-IAN-030~034 | AC-IAN-007 / 017 |
| **GAP-IAN-05** | 手输通道与 AI 驱动**不可区分**（`op.turn` auto 档语义边界） | Q-IAN-014 / 015 | FR-IAN-020~025 | AC-IAN-003 / 004 |
| **GAP-IAN-06** | 法四**默许「流外按需输入框」**（立法与主线冲突） | Q-IAN-005 / 016 | FR-IAN-060~064 | AC-IAN-008 |
| **GAP-IAN-07** | **门禁只增 vs 删除面**的张力（判据重锚纪律 + 2 保护段） | Q-IAN-006 / 012 | FR-IAN-080~091 / 100~106 | AC-IAN-010 / 018~023 |
| **GAP-IAN-08** | 次生面：**双 reveal / 状态提示耦合 / 草稿 / a11y / 引导 / 法八** | Q-IAN-007 / 008 / 009 / 010 / 011 / 017 | FR-IAN-015 / 018 / 019 / 050~056 | AC-IAN-006 / 011~016 |

> **边界说明（避免误修）**：「外部竞品调研未执行」（O-IAN-010）与「门禁计数 / 体积值引自 F-34 closeout」（本轮零运行时验证）**不是**本 Feature 的缺口 ⇒ 前者登记为 NG-IAN-012，后者登记为 §2.5B 证据口径 + §9 全 `⏳`；「环境性 flake」（Q-IAN-018）登记为 EC-IAN-015 + FR-IAN-106，**不**当作产品缺口修。

### 10.1 问题覆盖矩阵（Q-IAN-001~018 → FR / AC 逐条可追溯）

| Q | 问题（要点） | 承载 FR | 承载 AC |
|---|---|---|---|
| **Q-IAN-001** | 母问题：流外独立输入框与主线自相矛盾 | FR-IAN-040~049 / 060~064 | AC-IAN-005 / 008 |
| **Q-IAN-002** | `#composer` 显隐不可判（D-A 双写者 / D-B 锁存 / D-C 设置态漏调） | FR-IAN-042 / 043 / 044 | AC-IAN-005 |
| **Q-IAN-003** | 「自由输入」作为 next 选项的形态缺位 | FR-IAN-010~016 | AC-IAN-002 / 003 |
| **Q-IAN-004** | R6 排队 / 草稿回填语义绑定在 composer 上 | FR-IAN-030~034 | AC-IAN-007 / 017 |
| **Q-IAN-005** | 法四只禁「常驻」未禁「流外按需」 | FR-IAN-060~061 | AC-IAN-008 |
| **Q-IAN-006** | 门禁只增不减 vs 删除面的张力（+ 2 保护段） | FR-IAN-100~106 / 080~091 | AC-IAN-018~023 |
| **Q-IAN-007** | 四处兜底入口载体收敛未完成（双 reveal） | FR-IAN-050~052 | AC-IAN-006 |
| **Q-IAN-008** | `#send-reason` / `sendDisabled` 去留与重锚未定 | FR-IAN-053 / 054 | AC-IAN-011 / 012 |
| **Q-IAN-009** | 设置视图 ⇄ chat 草稿保持依赖 `#input` | FR-IAN-055 | AC-IAN-013 |
| **Q-IAN-010** | a11y focus 流断裂风险 | FR-IAN-019 / 045 | AC-IAN-014 |
| **Q-IAN-011** | 首装引导文案指向将被废除的面 | FR-IAN-056 | AC-IAN-015 |
| **Q-IAN-012** | `#composer` 兼容读取面退役牵动 e2e/binding 诊断面 | FR-IAN-047 / 090 / 104 | AC-IAN-010 / 021 |
| **Q-IAN-013** | 体积距档仅 22,454 B；净增量方向不明 | FR-IAN-110~115 | AC-IAN-025 |
| **Q-IAN-014** | `op.turn` auto 档与「用户手输」的语义边界 | FR-IAN-022 / 023 / 024 | AC-IAN-004 |
| **Q-IAN-015** | `requestTurn(` 恰 2 门禁与废除面的张力 | FR-IAN-021 / 085 | AC-IAN-003 |
| **Q-IAN-016** | 法四修订的载体未定（原地修订 vs 新法条） | FR-IAN-060 / 062 | AC-IAN-008 |
| **Q-IAN-017** | 流内输入卡的可访问性与法八 / 零明文口径 | FR-IAN-018 / 019 | AC-IAN-014 / 016 |
| **Q-IAN-018** | 环境性 flake 家族被误读为回归（`KL-N-10`） | FR-IAN-106 | AC-IAN-023 |

### 10.2 根因覆盖（§2.2 D-A/B/C + §2.4 附带 writer）

| 根因 | 承载 FR |
|---|---|
| **D-A** 双写者（护栏 vs 无条件直写） | FR-IAN-042 |
| **D-B** `fallbackOpen` 历史锁存无生产复位 | FR-IAN-043 |
| **D-C** 设置态漏隐藏（提前 return + CSS 不含 composer） | FR-IAN-044 |
| **附带 writer**（`revealAskFallback → l0.revealFallback`） | FR-IAN-051 / 052 |
| **F-1** 静态默认 hidden（法四：默认屏无常驻输入框） | FR-IAN-012 / NFR-IAN-013 |
| **F-2** text 型 ask 直开兜底（连带 reveal 流外面） | FR-IAN-011 / 050 |
| **F-3** 卡内输入先例（`.ask-fallback` + focus + 互斥披露） | FR-IAN-011 / 019 |
| **F-4** 四处入口全收敛到 `revealAskFallback`（composer 无独立入口） | FR-IAN-050 / 051 |
| **F-6** `#send-reason` = 保留载体（状态提示 ≠ 输入面） | FR-IAN-053 / 054 |
| **F-7** `requestTurn(` 恰 2（入口 + composer 提交） | FR-IAN-021 / 085 |

---

## 11. 开放点裁决落位表（O-IAN-001~011 → 条文）

> **口径**：编排器裁决（2026-09-24）**全部采纳 discovery 推荐项**；下表逐条落位并给出裁决记录。

| O | 开放问题（要点） | **裁决（编排器，全按 discovery 推荐）** | 落位条文 | 裁决记录 |
|---|---|---|---|---|
| **O-IAN-001** | 命名与版本位 | **① 采纳**：树名 `specs-tree-web-cli-plugin-v55-f-input-as-next`（承 `v55-f-` 补丁级跟进轮惯例）+ Feature ID **F-35** + 版本位 **v0.11.2**（v0.11.0（F-33）主题的 patch 级跟进轮）；ROADMAP 登记**留给收口**（本阶段零 diff） | §1 元数据 · FR-IAN-001 · §14.1 | **DC-IAN-001** |
| **O-IAN-002** | 「自由输入」next 形态 | **① 采纳**：**推荐区按需最末项「自由输入…」**（与「其他…（我来描述）」同构，**不常驻**）→ 点开**就地展开卡内输入**（复用 / 扩展 `.ask-fallback` 先例；**不新增常驻输入框、不新增 kind**）→ 提交**复用 `op.turn` 槽**（`bindPanelOps.turn → requestTurn`）；**不采纳** ② 常驻选项、③ 新 op / 新 kind | FR-IAN-010~016 · NG-IAN-008 / 014 | **DC-IAN-002** |
| **O-IAN-003** | `#composer` 废除面处置 | **① 采纳**：`#composer`/`#input`/`#send` **真退役（DOM 移除，非 `hidden`）**；删 `syncComposerVisibility` + `fallbackOpen` 锁存；`l0.revealFallback/hideFallback` **只操作卡内 `.ask-fallback`**；测试钩子重锚（或台账退役）；`NEVER_FOLDABLE` / 兼容读取面登记同步退役；a11y focus 落卡内；**不采纳** ② 保留面只修缺陷、③ 退化为 `hidden` | FR-IAN-040~049 | **DC-IAN-003** |
| **O-IAN-004** | R6 排队 / 草稿回填去向 | **① 采纳**：**保留** SW 有界队列语义（`TURN_QUEUE_MAX=1` / drain / `queued` / `busy-rejected`）；提交入口改为流内输入经 `op.turn` 槽；`busy-rejected` **草稿回填载体迁流内**（卡收起 ⇒ 重新展开并回填；仍**不覆盖**用户新输入）；**不采纳** ② 退役队列、③ 回填改上屏而不回填 | FR-IAN-030~034 · NG-IAN-006 | **DC-IAN-004** |
| **O-IAN-005** | 四处兜底入口统一形态 | **① 采纳**：全部统一到卡内 `.ask-fallback`（现状已收敛）；`op.describe` 无值相 = 展开卡内兜底输入（不变）；有值相 = 提交描述（不变）；**停止** `l0.revealFallback` 附带 reveal 流外面；**不采纳** ② 新建独立流内输入行、③ 保留双面 | FR-IAN-050~052 | **DC-IAN-005** |
| **O-IAN-006** | 状态栏 `#send-reason` / `sendDisabled` 去留 | **① 采纳**：**保留**（状态提示 ≠ 输入面；`host-registry.ts:295-321` 本就是保留要素），但**重新锚定**到流内输入的 disabled reason（仅无活跃站点等异常态）；**不采纳** ② 随输入面一起退役、③ 原样不动（会钉死已废面） | FR-IAN-053 / 054 | **DC-IAN-006** |
| **O-IAN-007** | 法四修订载体 | **① 采纳**：**原地修订法四**（重写 `v4-chat/spec.md:116` / `:225` FR-CHAT-014 / `:385` AC-CHAT-007 为「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」）+ supersession 台账登记 old→new；**不升格「法十」**；**不采纳** ② 立法新法条 + supersede（切断法条连续性） | FR-IAN-060~064 · 080 · NG-IAN-013 | **DC-IAN-007** |
| **O-IAN-008** | `requestTurn(` 恰 2 门禁重锚 | **① 采纳**：显式取代 X-IAN-6 —— 重锚为「**恰 1 个生产输入提交点**（流内输入卡，经 `op.turn` 槽）」；**不采纳** ② 保 2（把直连点语义重定义会掩盖「唯一入口」事实） | FR-IAN-021 / 085 | **DC-IAN-008** |
| **O-IAN-009** | 体积预算与叶拆分 | **① 采纳**：spec **先出分列预算 + 15% 缓冲**（§5.11.1；距档 22,454 B；**正常与 2.8× 最坏均不触发升档**）；**2 叶（依存序）**（§14.1）；升档走 EC 显式路径 + **作者一行**；**不采纳** ② 单叶、③ 先排全量 | FR-IAN-002 / 110~115 · §14 | **DC-IAN-009** |
| **O-IAN-010** | 是否需要外部竞品调研 | **① 采纳**：**不需要**（内部架构一致性问题；「把流外输入面并入 next」无外部对标必要；有仓库内可核先例）；**不采纳** ② 登记待调研 | NG-IAN-012 | **DC-IAN-010** |
| **O-IAN-011** | `op.turn` auto 档与手输语义边界 | **① 采纳**：手输提交**不复用** `op.turn` 的 AI 自主档**语义** —— 在**留痕 / 档位**上显式区分「用户手输回合」与「AI 驱动回合」（**driver 字段不同值**；承红线⑥精神，**注入必红**）；**不采纳** ② 两路径同档同留痕（不可判） | FR-IAN-022~024 · EC-IAN-013 / 018 | **DC-IAN-011** |

### 11.1 裁决记录（DC-IAN-001~011 理由一句话）

| # | 对应 | 理由（一句话） |
|---|---|---|
| **DC-IAN-001** | O-IAN-001 | 本 Feature 是 **v5.5 主题（一切操作皆 next 流内闭环）的输入面收编补丁级跟进** —— 不是新主题（不构成 `v56`），也不并入 F-34 树（D7 禁止改写 F-34 产物），故 `-f-` + patch 版本位与先例同构。 |
| **DC-IAN-002** | O-IAN-002 | 「输入 = next 的一个选项」是作者裁决的**产品语言**（`nextstep.ts:8-11`「chip 即指令，不填 composer」已是同向证据）⇒ 按需最末项 + 卡内输入 + `op.turn` 槽是**唯一同时满足**「不常驻 / 零新增 kind / 复用既有通道」三约束的形态；常驻选项（②）会撞法四，新 op / 新 kind（③）会撞零新增载体红线。 |
| **DC-IAN-003** | O-IAN-003 | 作者裁决明文「**不应该存在单独的输入框**」⇒ 面必须**真退役**（`hidden` 只是「看不见」，面仍在且仍可被历史路径拉出：D-A/B/C 三缺陷正是「面存在」的后果）；删面即**同时消解**双写者 / 锁存 / 漏隐藏三类缺陷（面没了，两者不复存在）⇒ 比「修缺陷保面」更少维护面、更可判。 |
| **DC-IAN-004** | O-IAN-004 | 队列**语义与裁决在 SW**（`turn-queue.ts` 纯逻辑，不看 DOM）⇒ 与「输入面在 DOM 哪里」**解耦**；只需把**入口与回填载体**迁到流内（`QueuedTurn.refs` 的零漂移语义不变）。退役队列（②）会回归 R6 修复成果；回填改上屏（③）会丢「原话回到输入处」的可判性。 |
| **DC-IAN-005** | O-IAN-005 | 四个入口**全部已汇聚**到 `revealAskFallback()`（`A-IAN-002` 已证）—— 收敛问题**只剩「停止附带 reveal 流外面」这一处**（`sidepanel.ts:2895 → l0/shell.ts:98-99`）；新建独立行（②）是**再增加一个流内输入面**，与「唯一载体」目标相反。 |
| **DC-IAN-006** | O-IAN-006 | `#send-reason` 是**状态提示**（「为什么发不出去」），不是输入面；`host-registry.ts:295-321` 明列为**保留要素**（「不是退役 id」）⇒ 随输入面一起退役（②）会把「无活跃站点」这一**状态事实**的可读面一起删掉（可用性倒退）；原样不动（③）则会留下钉死 `#composer` 的判据。 |
| **DC-IAN-007** | O-IAN-007 | 法四的**缺陷是「只禁常驻、未禁流外按需」**（Q-IAN-005）—— 原地修订把条文**加严**为「流外零输入面」，语义连续（法四 → 法四·修订版），法则清单不断裂；升格法十（②）会留下一个「已被取代但仍编号在册」的法四 + 一个平行法十，读者需同时读两条才能判「输入面允许在哪」，**可判性下降**。 |
| **DC-IAN-008** | O-IAN-008 | 门禁的原意是「`requestTurn` 只能有受限调用点，不得散落」——composer 提交退役后，**受限调用点自然收敛为 1**（`op.turn` 槽）；把计数停在 2（②）意味着让一个**不存在的调用点**留在判据里，判据会**恒真**（v4.5 教训：反证恒绿）。故重锚为恰 1 + 反证。 |
| **DC-IAN-009** | O-IAN-009 | 本 Feature **同时含正增量（新面）与负增量（删面）** —— 两叶混算会把「删面净负」与「新面净增」抵成一笔、**无法定位归因**（承 v5 plan 低估 2.8× / F-34 叶2 越基线上界教训）；分列 + 逐叶重登记是唯一能定位归因的口径；距档 22,454 B 在正常与 2.8× 最坏口径下均不触发升档 ⇒ 无需预先升档，但 EC 路径仍预置。 |
| **DC-IAN-010** | O-IAN-010 | 本问题是**纯内部架构一致性**（「流外唯一输入面与已立法主线矛盾」），外部产品（IDE 侧栏 / 命令面板）的「自由输入归属」表述**不可核**且不构成判据；仓库内已有可核先例（`.ask-fallback` / next 注册表 / `op.turn` 槽 / R6 队列）⇒ 调研不执行，且**不得**据此外推（承 F-34 DC-SGO-009 同构）。 |
| **DC-IAN-011** | O-IAN-011 | `op.turn` ∈ `auto` 档（AI 可自主按）是**驱动者层**的合法能力（v5.5 已立法）；但「用户手输」是**用户动作** ⇒ 若两路径在留痕上同值，则「谁发起了这个回合」**不可判**，AI 代答手输（红线⑥精神）会**无痕**发生；driver 字段两值（可判）+ 注入必红是**最小充分**的区分手段（`ai-drive.ts:85` 零值纪律保持）。 |

---

## 12. X-IAN-1~11 显式取代 → 判据等价重写映射表（**映射摘要**）

> **口径**：**「显式取代」≠「放宽」** —— 判据必须**等价重锚**（断言力不降、计数只增），并留台账（FR-IAN-091 / 102）。**本 Feature 是「删一个面」，故取代是显式的**（不静默改写）。

| X | 既有形态（现状逐字） | 取代 / 裁决内容 | 等价重写判据（**不得放宽**） | 状态 |
|---|---|---|---|---|
| **X-IAN-1** | 法四「**输入按需出现**：无常驻输入框；`ask-user` text 输入框只在问题卡内出现，卡内还有「其他…（我来描述）」兜底」（`v4-chat/spec.md:116,225,385`） | **原地修订**为「**输入即 next**：自由文本输入是流内 next 的一个选项；**流外零输入面**」+ old→new 台账 | 三处一致 + 法四机核门禁（双向反证 / 禁恒真 / 真源切片）+ 老 `redlineRemap ≥3` 保留 | **已发生（本轮立项裁决）**；条文落地 = 叶2 |
| **X-IAN-2** | `#composer`/`#input`/`#send` 为**保留（兼容读取面）**（`host-registry.ts:144-146`；`density-thresholds.test.ts:115-116,768` 保留面反证） | **入退役面**（DOM 真退役，非 `hidden`）；PRESERVED 列表移除三项 | `host-registry` 判据重锚（保留面反证 → 退役面判据）+ `density-thresholds` 等价改写 | 预登记（待叶2 落地） |
| **X-IAN-3** | 「`#composer` **不得**入 `RETIRED_CONTAINER_IDS`」反证（`density-thresholds.test.ts:775`） | **入退役容器册**（本体真退役） | 反证**重锚为非恒真**（「必须入册」）+ 长度 13 → ≥14 且逐项有去向 | 预登记（待叶2 落地） |
| **X-IAN-4** | `<form id="composer" hidden>` + `body` 尾 + 「之后无布局元素」（`density-thresholds.test.ts:389-409,776` / `sidepanel-view.test.ts:657-659` / `journey.mjs` #15c / `l0.mjs` ③⑪ / `insight.mjs` #I-08b / `binding.mjs` :69） | **等价重锚**为「**流外零输入面**（三 id 均不在 DOM）」+「流内输入卡存在且可用」 | 六面逐条 old→new；断言计数只增；反证（注入 `#composer` ⇒ 必红） | 预登记（待叶2 落地） |
| **X-IAN-5** | `#I-08`（composer 贴底 ∈[0,+8px]）/ `#I-09`（`#tree-fab` ∩ `#composer` = 0）（`insight.mjs:18-19,461-471,655`） | **随元素退役消解**或**重锚**到流内输入卡几何（**可判性显式登记**） | 不得静默 `null` 通过；消解必须**显式登记**（不是删断言）；若重锚 ⇒ 等价几何判据 | 预登记（待叶2 落地） |
| **X-IAN-6** | `requestTurn(` **必须恰 2**（入口 + composer 提交）（`op-wiring.test.ts:127-134,361`） | **重锚为恰 1**（唯一生产输入提交点 = `op.turn` 槽） | 判据可 FAIL（注入第 2 点 ⇒ 必红）；`expectFailPattern` 更新 | 预登记（待叶2 落地） |
| **X-IAN-7** | `busy-rejected` 草稿回填 `#input`（`turn-arbitration.test.ts:49,60` / `sidepanel.ts:3984-3991`） | **重锚**回填载体到流内输入（语义不变：不丢原话 / 不覆盖新输入 / 有可读行） | TA-4 **删回填仍必红** + 三条语义断言保留 + 新增「卡收起 ⇒ 重新展开」 | 预登记（叶1 支持 / 叶2 唯一化） |
| **X-IAN-8** | 设置 ⇄ chat 草稿保持 `#input`（`sidepanel.ts:1337-1341` / `settings.test.ts:191`） | **重锚**到流内输入（**或**显式退役该能力） | 二择一并留台账；判据不删除；不得静默丢草稿 | 预登记（待叶2 落地） |
| **X-IAN-9** | `NEVER_FOLDABLE` 含 `'composer'`（`disclosure.ts:164` + `:69,147`） | **退役**（元素不存在 ⇒ 无需永不折叠）；计数（12 − 1 + 3 = 14）同步 | 保留面计数判据**重锚且非恒真**；三处注释一致 | 预登记（待叶2 落地） |
| **X-IAN-10** | 首装引导「在**输入框**输入指令并发送」（`view-model.ts:350`） | **改指**流内 next「自由输入…」项 | 文案断言重锚；不指向已废面 | 预登记（待叶2 落地） |
| **X-IAN-11** | `binding.mjs` `DIAG_SELECTORS` 含 `composer` + 真实键入 `#input`/`#send`（`:115,905,1034-1096`） | **重锚**诊断面到流内输入；真实键入路径等价 | 诊断选择器替换 + 真实键入等价（不删路径）；保护段逐段决策 | 预登记（待叶2 落地） |

> **边界**：**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」的方式落地**；默认优先「**等价重锚（断言力不降）**」的读法，只有当等价重锚被证不可行时才显式放宽并留台账（FR-IAN-091）。**未发生取代须如实登记「未发生」**。

---

## 13. 红线表（N-IAN-001~020 编成 + N-IAN-021~028 spec 新增）

### 13.1 红线编成（**自 discovery §1.4 非目标 + §5.2 风险 + 编排裁决红线，逐条来源可核**）

> **口径**：discovery **未**给出 `N-*` 编号清单（与 F-34 discovery 不同）⇒ 本节把 discovery 已明示的红线约束**编成编号表**并标注来源；**不新增 discovery 未表达的约束**（新增项一律入 §13.2）。

| # | 红线（**逐字口径**） | 来源（discovery / 上游） | 本规范承载 |
|---|---|---|---|
| **N-IAN-001** | `dist/content.js` = **177,076 B**（sha `52a82620…`，**零容差**） | §1.4 非目标 + F-34 closeout | FR-IAN-112 / AC-IAN-024 / NG-IAN-003 |
| **N-IAN-002** | `dist/pick-layer.js` = **34,358 B**（sha `77796bab…`，**零容差**） | §1.4 非目标 + F-34 closeout | FR-IAN-112 / AC-IAN-024 / NG-IAN-003 |
| **N-IAN-003** | **`KIND_SET` 40 项逐字不增**；新消息族走 **type-only 先例** | §1.4 非目标（12 kind 零宿主） | FR-IAN-017 / NFR-IAN-007 / NG-IAN-011 |
| **N-IAN-004** | **12 kind 契约不动**；**零新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []`） | §1.4 非目标 + F-34 N-SGO-010 | FR-IAN-017 / NFR-IAN-007 / NG-IAN-008 |
| **N-IAN-005** | **上游产物零改写**：F-34 / F-33 / F-32 / R6 / v4 产物**原样保留**；**唯一授权例外 = 法四原地修订 + old→new 台账** | D7 + §1.4 非目标 | FR-IAN-005 / 060~062 / NG-IAN-002 |
| **N-IAN-006** | **法四修订必须走 supersession 台账 old→new**（逐字 old / 逐字 new / 理由 / 日期 / 落点）；**禁静默改写** | §5.2 R-IAN-006 + 编排裁决 ⑦ | FR-IAN-062 / AC-IAN-008 / 020 |
| **N-IAN-007** | **`packages/web-cli-base/**` 零 diff**（跨包红线；须作者放行方可再动） | §1.4 非目标 + F-34 N-SGO-007 | NFR-IAN-005 / AC-IAN-026 / NG-IAN-004 |
| **N-IAN-008** | **SW 有界队列裁决逻辑（`turn-queue.ts` 三分支）零改动**；本 Feature 只迁移入口与回填载体 | §1.4 非目标 | FR-IAN-030 / NG-IAN-006 |
| **N-IAN-009** | **法八零明文不退化**：流内 payload / digest / 审计 / DOM **四面零明文**；输入文本仅走 `chat` `user` 载荷 | §1.4 非目标 + F-34 N-SGO-011 | FR-IAN-018 / NFR-IAN-004 / NG-IAN-007 |
| **N-IAN-010** | **零新增卡类型（第 13 种）**：流内输入**复用 `askuser` kind + `.ask-fallback` 先例** | §1.4 非目标 | FR-IAN-011 / 017 / NG-IAN-008 |
| **N-IAN-011** | **法四（默认屏无常驻输入框）不退化**；本 Feature **加严**为「流外零输入面」 | §1.4 非目标 + 法四 | FR-IAN-012 / 049 / NFR-IAN-013 |
| **N-IAN-012** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账显式取代并留痕） | §1.4 非目标 + §5.2 R-IAN-001 | FR-IAN-004 / 100 / NG-IAN-015 |
| **N-IAN-013** | **`authorConfirmation.status = pending-author-line` 属未闭合义务**；任何文档 / 台账**不得**伪称体积档位已确认；升档须走 EC 显式路径 | 上游 F-34 closeout + §5.2 R-IAN-005 | FR-IAN-113 / EC-IAN-016 / NG-IAN-016 |
| **N-IAN-014** | **`F-29`（A2A 候选）未立项未排期，保持原样不动**（ROADMAP 相关区段**一字不动**） | §1.4 非目标 | NG-IAN-017 / §16 第 2 条 |
| **N-IAN-015** | **保护段必须逐段决策**：journey 活跃 pin `43054..58287` / sha `cc79f413…`；binding `107780..115930` / sha `be9ad0e9…`；哈希变更**必须台账留痕**、**禁静默改写** | §5.2 R-IAN-001 + `v4-chat/spec.md:489` + COR-IAN-1 | FR-IAN-103 / AC-IAN-021 |
| **N-IAN-016** | **特权 op 恰 2 必须用户手势**：`op.authorize` / `op.perm.request`；「**SW 永不调用 `.request(`**」；**AI 不可自动执行** | §1.4 非目标 + F-34 N-SGO-005 | FR-IAN-025 / NFR-IAN-002 / NG-IAN-010 |
| **N-IAN-017** | **consent / gesture 不得被 AI 代答**（含手输变体）；**`op.turn` `auto` 档语义不得退化** | §1.4 非目标 + 红线⑥ + §3.3 Q-IAN-014 | FR-IAN-024 / NFR-IAN-003 / NG-IAN-020 |
| **N-IAN-018** | **判定链零触碰**：`src/security/policy.ts` / `auto-authorize.ts` 在 `zeroDiffFiles` 冻结 | §1.4 非目标 | NFR-IAN-005 / AC-IAN-026 / NG-IAN-005 |
| **N-IAN-019** | **门禁严格串行**（一次一个 Chromium，绝不并发）；`CHROMIUM_GATES === 9` 不动 | F-34 N-SGO-017 | FR-IAN-105 / 106 / NFR-IAN-012 |
| **N-IAN-020** | **纪律**：不碰 `main`、不 force push、path-limited `git add`、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖；`.sddu` 外零触碰；不合 main、不发布 | D6 + §0.3 约束 | §16 纪律表 / FR-IAN-003 |

### 13.2 spec 新增红线（**本规范新增，与 N 同等级**）

| # | 红线（**本规范新增，逐字口径**） | 依据 | 承载 |
|---|---|---|---|
| **N-IAN-021** | **流内输入面唯一**：兜底**恰 1** 个输入载体（卡内 `.ask-fallback`）；「第二输入面」**任何形态**（流外 / 第二卡 / 浮层）⇒ FAIL | FR-IAN-011 / 050~052 / Q-IAN-007 | AC-IAN-006 / NFR-IAN-014 |
| **N-IAN-022** | **生产输入提交点唯一**：`requestTurn(` **恰 1**（经 `op.turn` 槽）；**第二直连调用点 ⇒ FAIL** | FR-IAN-021 / Q-IAN-015 | AC-IAN-003 |
| **N-IAN-023** | **手输可判**：手输回合与 AI 驱动回合的留痕 driver 字段取值**必须不同**；**同值 ⇒ FAIL**；用户手输被 AI 代答 / 自动提交 ⇒ FAIL | FR-IAN-022~024 / Q-IAN-014 | AC-IAN-004 / EC-IAN-013 / 018 |
| **N-IAN-024** | **法四门禁必绿且禁恒真**：`test/law4-input-as-next.test.ts` 必绿；每条判据必须有双向反证与三段控制（`ok` / `violated` / `n/a`）；**恒真断言 ⇒ 视为缺陷** | FR-IAN-064 / R-IAN-001 | AC-IAN-005 / 008 / 019 |
| **N-IAN-025** | **真退役（非 `hidden`）**：`#composer` / `#input` / `#send` **不得**以任何形态在 DOM 中存在（含 `hidden` / `display:none` / 迟挂载） | FR-IAN-040 / 049 / Q-IAN-001 | AC-IAN-005 / EC-IAN-017 |
| **N-IAN-026** | **回填三语义不退化**：`busy-rejected` 回填必须 ① 不丢原话 ② 不覆盖用户新输入 ③ 有可读行；**任一缺失 ⇒ FAIL**（删回填仍必红） | FR-IAN-032 / 033 / R-IAN-002 | AC-IAN-007 / 017 |
| **N-IAN-027** | **中间态不破坏现网**：叶1 完成时旧入口（composer submit）与新入口**均可用**；**不得**出现「无输入可用」窗口 | FR-IAN-071 / S0''-8 | AC-IAN-001 |
| **N-IAN-028** | **`#send-reason` 保留面判据非恒真**：`#send-reason` 必须在 `#region-statusbar` 内；离开状态栏 ⇒ FAIL；**不得**以「恒真断言」冒充保留 | FR-IAN-053 / R-IAN-011 | AC-IAN-011 |

---

## 14. 子 Feature 拆分与交付顺序

### 14.1 结构裁决（**2 叶，依存序，串行**）

**裁决（DC-IAN-009 / O-IAN-009 ①）**：本 Feature 拆 **2 叶**，**必须串行** `ian-1 → ian-2`；叶目录**直接嵌套**于父目录下（**不使用 `children/` 中间层**，目录树即特性树）：

```
specs-tree-web-cli-plugin-v55-f-input-as-next/
├── discovery.md                      # 问题挖掘（已入库）
├── spec.md                           # 本文件（父级完整规范）
├── TREE.md / state.json              # 导航 / 状态
├── specs-tree-ian-1-free-input-next/     # 叶1 = 流内「自由输入…」next 通道（首叶）
└── specs-tree-ian-2-abolish-composer/    # 叶2 = 废除 #composer + 法四修订（末叶，依赖叶1）
```

**为什么必须「先立新面、再拆旧面」（三条论证，供 plan / 后续轮复核）**：
1. **交付序安全（决定性）**：若先删 `#composer` 再建流内输入，则在两叶之间会出现**「无输入可用」窗口**（用户无任何自由输入入口）⇒ 违反 N-IAN-027 / FR-IAN-071。**先立新面**保证中间态**新旧并存可用**。
2. **风险面不同**：叶1 的风险面 = **新入口 / 唯一通道 / 手输语义 / 排队迁移**（通道与语义）；叶2 的风险面 = **DOM 退役 / 门禁重锚 / 保护段 / 立法台账 / 体积净负**（结构性拆除）。耦在一轮会让「删面的门禁重锚」与「新面的通道语义」互相掩盖（承 F-34 §14.1 同构论证）。
3. **体积必须分列 + 方向相反**：叶1 是**正增量**（新面），叶2 目标是**净负增量**（删面 > 新增收敛接线）；混算会抵成一笔、**无法定位归因**（FR-IAN-114/115）。验收锚层次也不同：叶1「输入仍可达 + 排队/回填不回归 + 旧入口不破坏」；叶2「流外零输入面 + 法四一致 + 18 门禁强度不降」。

> **备选评估（如实登记，不推荐）**：**单叶 + 内部分组**——会在同一轮内同时承担「新面通道语义」与「删面退役 + 立法 + 保护段」两类风险，且**无法证明中间态无「无输入可用」窗口**（S0''-A 无法独立验收）；体积亦无法分列。故 **不采纳**。

### 14.2 交付顺序与叶职责

| 序 | 叶 | 职责（交付形态） | 依赖 | 承载 FR |
|:-:|---|---|---|---|
| 1 | `specs-tree-ian-1-free-input-next`（**新面 / 首叶**） | 流内「自由输入…」next 项（按需最末项）+ 卡内输入就地展开 + 提交经 `op.turn` 槽 + 手输 / AI 驱动留痕区分 + 让位语义保留 + **R6 双入口并存（composer 入口保留可用）** + 流内回填支持 + a11y focus + 零死端 + S0''-A 中间态样板 | —（P0，底座） | GOV 001~007 · FIM 010~019 · CHAN 020~025 · R6Q 030~033（叶1 侧）· CONV 050 / 052（流内载体内）· S0'' 070~072 / 074 · SUPERSEDE 086（叶1 侧）· GATE 100~106 · VOL 110~115（叶1 侧） |
| 2 | `specs-tree-ian-2-abolish-composer`（**废面 / 末叶**） | `#composer`/`#input`/`#send` DOM 真退役 + CSS 退役 + 双写者 / 锁存 / 设置态护栏消解 + 测试钩子 / `NEVER_FOLDABLE` / 兼容读取面登记退役 + 四处兜底收敛（去双 reveal）+ `#send-reason`/`sendDisabled`/draft/引导重锚 + **法四原地修订 + 台账** + 18 门禁与 2 保护段重锚 + 体积净负重登记 + S0''-B 终态样板 | `specs-tree-ian-1-free-input-next` | ABOL 040~049 · CONV 051 / 053~056 · LAW4 060~064 · R6Q 031 / 032（唯一化侧）/ 034 · S0'' 073 · SUPERSEDE 080~085 / 087~091 · GATE 100~106（终态侧）· VOL 113~115（终态侧） |

> **父 Feature** = 轻量规范容器（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 / F-34 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**，不产 `tasks.json` 于父层）。

### 14.3 FR → 叶 覆盖矩阵（**每条 FR 恰属一叶的「主责面」；共享面另标**）

| FR 段 | FR 编号 | 主责叶 | 共享面 |
|---|---|---|---|
| GOV（立案 / 结构 / 纪律） | FR-IAN-001~007 | **叶1**（父级结构 + 纪律，共享面在此一次做完） | 叶2 引用 002 / 004 / 005 / 006 |
| FIM（流内自由输入面） | FR-IAN-010~019 | **叶1** | 叶2 引用 011 / 017（退役后仍须成立） |
| CHAN（通道 / 手输区分） | FR-IAN-020~025 | **叶1** | 叶2 引用 021（恰 1 在叶2 兑现） |
| R6Q（排队 / 回填迁移） | FR-IAN-030~034 | **叶1**（031 / 032 的**新增 + 并存**侧）/ **叶2**（031 / 032 的**唯一化**侧 + 034） | 共享 030 / 033 |
| ABOL（废除面） | FR-IAN-040~049 | **叶2** | — |
| CONV（兜底 / 状态提示 / 草稿 / a11y / 引导） | FR-IAN-050~056 | **叶1**（050 / 052 的流内载体内）/ **叶2**（051 / 053~056 + 050/052 的**收敛终态**） | 共享 050 / 052 |
| LAW4（法四原地修订） | FR-IAN-060~064 | **叶2** | — |
| S0''（首验收） | FR-IAN-070~074 | **叶1**（070 / 071 / 072 / 074 的中间态侧）/ **叶2**（073 + 070/072 的终态侧） | 共享 070 / 072 / 074 |
| SUPERSEDE（X 映射） | FR-IAN-080~091 | **叶2**（080~085 / 087~090）/ **叶1**（086 的流内回填侧） | 共享 091 / 102 |
| GATE（门禁 / 台账） | FR-IAN-100~106 | **叶1**（新增门禁 / 串行纪律 / 对账表骨架）/ **叶2**（18 门禁重锚 + 保护段 + 台账终态） | 共享 100~106 |
| VOL（体积分列） | FR-IAN-110~115 | **叶1** 出表 / **两叶各自收口实测登记**（ian-1 正 / ian-2 负） | 共享预算表（110 / 111） |

---

## 15. 风险登记（discovery 继承 R-IAN-001~013 + spec 新增 R-IAN-901~910）

### 15.1 继承风险（discovery §5.2，逐条保留等级与预登记证据）

| # | 风险 | 等级 | 承载条文 / 应对 |
|---|---|:--:|---|
| **R-IAN-001** | **门禁 / 保护段重锚纪律被破坏**（最高危）：删断言 = 静默降强度；保护段哈希变更必须台账留痕、**禁静默改写** | **高** | FR-IAN-100~104；AC-IAN-018~023；N-IAN-012 / 015 / 024；**先出逐条重锚清单再动面**；八步或字节中立二选一并留痕 |
| **R-IAN-002** | **R6 排队 / 草稿回填回归**：入口迁移后队列收不到用户输入，或 `busy-rejected` 回填断裂 | **高** | FR-IAN-030~034；AC-IAN-007 / 017；N-IAN-026；**入口迁移 + 回填载体迁流内（卡收起 ⇒ 重新展开），语义不变；TA-4 必绿** |
| **R-IAN-003** | **`requestTurn(` 恰 2 门禁与废除面冲突**（删 composer 提交点 ⇒ 计数变 1） | **高** | FR-IAN-021 / 085；AC-IAN-003；N-IAN-022；**显式取代 X-IAN-6（恰 1 + 反证），不得静默改数** |
| **R-IAN-004** | **`op.turn` `auto` 档 vs 用户手输语义混淆** ⇒ 手输沦为 AI 可代答通道（侵蚀红线⑥精神） | **高** | FR-IAN-022~024；AC-IAN-004；N-IAN-017 / 023；**手输 / AI 驱动 driver 两值 + 注入必红** |
| **R-IAN-005** | **体积越档位**：距档仅 **22,454 B**；删面负增量 vs 新增输入卡正增量净值不明 | **中高** | FR-IAN-110~115；AC-IAN-025；EC-IAN-016；**先出分列预算 + 15% 缓冲 + 逐叶重登记**；升档须**作者一行** |
| **R-IAN-006** | **法四修订的 supersession 台账不完整**（老 `redlineRemap ≥3` 不得删） | **中高** | FR-IAN-062；AC-IAN-008 / 020；N-IAN-006；**老 remap 保留 + 新增本轮 old→new 条目** |
| **R-IAN-007** | **法八（零明文）被输入卡撞破**：任意用户文本若进流内 payload / digest / 审计 / DOM 四面 ⇒ 直接红 | **中高** | FR-IAN-018；NFR-IAN-004；N-IAN-009；**输入文本仅走 `chat` `user` 载荷；固化只写 FACT；`law8` 零降级** |
| **R-IAN-008** | **`KIND_SET` 40 / 12 kind / 零宿主被撞** | **高** | FR-IAN-011 / 017；NFR-IAN-007；N-IAN-003 / 004；**复用 `askuser` kind + `.ask-fallback` 先例（零新增 kind 优先论证）** |
| **R-IAN-009** | **a11y focus 流断裂**（`#input` 是既有 focus 目标） | **中** | FR-IAN-019 / 045；AC-IAN-014；NFR-IAN-009；**focus 落卡内（`askuser.ts:71-86` 先例）+ 无悬空焦点断言** |
| **R-IAN-010** | **e2e / binding 诊断面牵动**（`DIAG_SELECTORS` / 真实键入 `#input`+`#send` / `#send.disabled`） | **中高** | FR-IAN-090 / 104；AC-IAN-021；**诊断选择器替换为流内输入；真实键入路径等价；保护段逐段决策** |
| **R-IAN-011** | **`#send-reason` / `buttonStates` 耦合面误删**（状态提示 ≠ 输入面） | **中** | FR-IAN-053 / 054；AC-IAN-011 / 012；N-IAN-028；**先裁决状态提示去留（已裁决 = 保留）再动面** |
| **R-IAN-012** | **环境性 flake 被误读为回归（`KL-N-10`）** | **低—中** | FR-IAN-106；EC-IAN-015；**隔离复跑 ≥2 + 如实记录不阻塞** |
| **R-IAN-013** | **方案先行**：开放点在 spec 前被顺手定下 | **中高** | §11（全部 `ruled`）+ §8 PD 清单；FR-IAN-007 |

### 15.2 spec 新增风险

| # | 风险 | 等级 | 说明 / 应对 |
|---|---|:--:|---|
| **R-IAN-901** | **中间态被跳过**：为赶进度在叶1 就删 `#composer` ⇒ 出现「无输入可用」窗口 | **高** | FR-IAN-071；AC-IAN-001；N-IAN-027；**S0''-A 独立验收（双入口均可提交）** |
| **R-IAN-902** | **「真退役」被实现成 `hidden` / `display:none` / 迟挂载** ⇒ 面仍在（且仍可被历史路径拉出） | **高** | FR-IAN-040 / 049；EC-IAN-017；N-IAN-025；**DOM 零命中断言 + 注入 `#composer` ⇒ 必红** |
| **R-IAN-903** | **法四判据被写成恒真**（如「只要 `#composer` 不存在就绿」而注入路径不覆盖 ⇒ 判据永不 FAIL） | **中高** | FR-IAN-064；N-IAN-024；**三段控制 + 双向反证 + 真源切片** |
| **R-IAN-904** | **卡内输入复用导致「描述」语义被改**（`op.describe` 有值相被改成发起回合） | **高** | FR-IAN-015；NFR-IAN-008；**反证「describe 有值相发起回合 ⇒ 必红」** |
| **R-IAN-905** | **回填实现成「覆盖用户新输入」**（善意：把被判原话放回） | **中高** | FR-IAN-033；N-IAN-026；**仅当为空 + 非空时只留痕；判据双向** |
| **R-IAN-906** | **手输 driver 与 AI 驱动 driver 被实现成同值**（只加注释不落判据） | **中高** | FR-IAN-022；EC-IAN-013；N-IAN-023；**留痕逐行两值断言 + 同值必红** |
| **R-IAN-907** | **「第二输入面」以新形态回归**（如键盘快捷键弹浮层输入 / 第二卡输入） | **中高** | N-IAN-021；NFR-IAN-014；**「唯一载体」判据（第二载体 ⇒ FAIL）** |
| **R-IAN-908** | **ian-2 净值非负却谎报净负**（体积重登记失真） | **中高** | FR-IAN-114 / 115；**逐模块归因 + 登记为负或显式说明非负** |
| **R-IAN-909** | **S0'' 被写成「脚本绿」而非「链路可判」**（用假 provider / 桩跳过真实卡内输入与通道） | **中高** | FR-IAN-070 / 073；**真源切片 + 双向反证（承 v5-2 review BLOCK-03 / F-34 R-SGO-909 教训）** |
| **R-IAN-910** | **18 门禁处置「看起来齐」但漏项**（行数当断言数；间接面未确认） | **中高** | FR-IAN-104；AC-IAN-018；COR-IAN-2；**按断言 / 选择器逐条 + 三态齐 + 间接面对账面** |

---

## 16. 纪律与验证契约

| # | 纪律 | 依据 |
|:-:|---|---|
| 1 | **`.sddu/**` 只写本 Feature 目录**；**spec 阶段零改动** `src/` / `test/` / `dist/` / `design/` / `docs/` 与 `ROADMAP.md`（**含 `v4-chat/spec.md`** —— 法四修订由叶2 在 build 阶段执行） | D6 / FR-IAN-003 |
| 2 | **path-limited `git add`**（禁 `git add -A` / `.`）；不 force push；不合 main；不发布；无新依赖；不改 `packages/web-cli-base/**`；不改 `.opencode/opencode.json`；`F-29` 区段一字不动 | N-IAN-014 / 020 / NG-IAN-004 / 017 |
| 3 | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile） | N-IAN-019 / FR-IAN-106 |
| 4 | **`KL-N-10` 处置纪律**：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | R-IAN-012 / EC-IAN-015 |
| 5 | **断言零删除零降级、计数只增不减**（唯一例外：保护段显式取代 + 台账留痕） | N-IAN-012 / FR-IAN-004 / 100 |
| 6 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | FR-IAN-101 / AC-IAN-019 |
| 7 | **人工面如实登记**：真机观感 / 语义遵从体感等 headless 不可合成项逐项 `⏳ 未执行`，**不得冒充 PASS** | FR-IAN-074 / AC-IAN-027 / §9.4 |
| 8 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7 + 本规范 §2.2 / §2.3 / §2.4 / §2.5）；未跑任何门禁 / 构建 / Chromium | D6 / §2.5 |
| 9 | **体积预算先评估后落地**：先出分列净增上下界与越限路径口径，再排落地；`authorConfirmation` **不得静默改写** | R-IAN-005 / N-IAN-013 / FR-IAN-110 / 113 |
| 10 | **不编造外部结论**：竞品调研**未执行**（口径 = 「未执行，不阻塞」），不得据此外推 | NG-IAN-012 / O-IAN-010 |
| 11 | **取代与实现同轮完成**：X-IAN-1~11 的台账登记与判据重锚**不得**拆到「下一轮补」；**未发生取代的 X 项须如实登记「未发生」** | FR-IAN-091 / 102 / §12 |
| 12 | **两叶串行 + 共享面一次做完**：`ian-1 → ian-2`；体积 / 保护段 / 取代台账 / `knownGap` 四类共享面**恰一次**登记（叶1 承接共享面骨架，叶2 增量 + 终态） | FR-IAN-002 / 005 / AC-IAN-020 / 025 |
| 13 | **输入面单一化不可旁路**：唯一输入载体（卡内）+ 唯一提交点（`op.turn` 槽）+ 唯一兜底入口汇聚点；**不得**新增散落输入面 / 第二提交点 / 第二通道 | N-IAN-021 / 022 / NFR-IAN-014 |
| 14 | **法四不可退化为文档**：门禁真源切片指向**生产真源**（`index.html` DOM + `host-registry` 判据 + 卡内载体）；**不得**以「文档写了」为通过条件 | N-IAN-024 / FR-IAN-064 |
| 15 | **`authorConfirmation` 占位口径**：生效上限 `floor(591,946 × 1.05) = 621,543` / 档位 614,400 / 绝对上限 675,840 —— `pending-author-line` **未闭合义务，不得伪称已确认** | N-IAN-013 / FR-IAN-113 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5.5.2「输入即 next：废除流外独立输入框」需求规范）：**父 Feature = 轻量规范容器 + 2 叶**（`specs-tree-ian-1-free-input-next` → `specs-tree-ian-2-abolish-composer`，依存序串行，**已论证不退化单叶**）；**O-IAN-001~011 十一条开放点全部裁决**（status 一律 `ruled`，DC-IAN-001~011，采纳 discovery 推荐项）；**FR 80 条**（GOV 7 / FIM 10 / CHAN 6 / R6Q 5 / ABOL 10 / CONV 7 / LAW4 5 / S0'' 5 / SUPERSEDE 12 / GATE 7 / VOL 6）；**NFR 14** / **EC 18** / **NG 20** / **US 10** / **G 8** / **AC 27**（核心 = 001 **S0'' 两段全链机器化（中间态保护 + 终态零可达）** / 002 流内「自由输入…」next 面 / 003 流内提交唯一通道 / 004 手输 ≠ AI 驱动 / 005 **流外零输入面** / 008 **法四原地修订** / 010 X-IAN 等价重锚）；**关键口径**：**流内「自由输入…」next 项 = 推荐区按需最末项 + 点开就地展开卡内输入（`.ask-fallback` 先例）+ 提交复用 `op.turn` 槽（不常驻 / 不新增 kind）** · `#composer`/`#input`/`#send` **DOM 真退役（非 `hidden`）** + 双写者 / `fallbackOpen` 锁存 / 设置态漏调护栏**一并消解** · **R6 有界队列语义保留**（入口与草稿回填迁流内；回填**不覆盖**新输入；卡收起 ⇒ 重新展开）· 四处兜底入口**收敛到卡内**（去「双 reveal」）· **`#send-reason` 保留但断言重锚**（状态提示 ≠ 输入面）· **法四原地修订**（old→new 逐字：「输入按需出现：无常驻输入框…」→「输入即 next：自由文本输入是流内 next 的一个选项；流外零输入面」；**不升格**法十）+ supersession 台账 · **`requestTurn(` 恰 2 → 恰 1**（唯一生产输入提交点 = `op.turn` 槽）+ 反证 · **手输 / AI 驱动 driver 字段两值可判**（注入必红）· **18 门禁逐一处置**（node 10 + Chromium 8；三态齐）+ 2 新 node 门禁（`free-input-next` / `law4-input-as-next`）+ `CHROMIUM_GATES === 9` 不动 · **体积分列预算**（ian-1 +2.5~4.5 KB / ian-2 **−2.5~−1.0 KB 净负** / Σ −0.0~+3.5 KB / +15% 缓冲 −0.0~+4.0 KB ⇒ **距档 22,454 B 不触发升档**；2.8× 最坏 ≈9.8 KB 仍不触发）；冻结面 `content.js` 177,076 B / `pick-layer.js` 34,358 B **零容差**；**X-IAN-1~11 → 判据等价重写映射表**；**N-IAN-001~020 红线编成 + N-IAN-021~028 spec 新增**；R-IAN-001~013 继承 + R-IAN-901~910 新增；**缺口全景 GAP-IAN-01~08 + Q-IAN-001~018 覆盖矩阵 + 根因 A/B/C + F-1~F-7 覆盖**；遗留开放点 PD-IAN-001~006；**现状事实核对 §2.5 + 5 条复核订正 COR-IAN-1~5** | 2026-09-24 | SDDU Spec Agent |

