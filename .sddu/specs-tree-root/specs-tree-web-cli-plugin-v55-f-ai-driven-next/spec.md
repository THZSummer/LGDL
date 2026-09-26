# Feature Specification：specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v5.5.3「AI 驱动 next：LLM 结构化产出 next 候选 + 确定性注册表退居兜底与安全闸」）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本目录 `discovery.md` v1.0（2026-09-26）——问题清单 **Q-ADN-001~024**（核心 14 / 次要 5 / 潜在 5）/ 假设 **A-ADN-001~011** / 风险 **R-ADN-001~014** / 开放问题 **O-ADN-001~016**（附推荐）/ 事实附录 §7（推荐层现状映射 §7.1 / 载体零新增 kind 论证 §7.2 / **AI 候选校验链 5 判据 §7.3** / 三档清分闸落点 §7.3 / 显式取代候选 **X-ADN-1~11** §7.4 / 命名与版本位占用核验 §7.5）/ 叶拆分建议（2 叶，依存序）
> **直接输入**: ① **作者裁决（2026-09-25，立法级，逐字保留）**：「这个推荐对吗，是不是还是写死的，**有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出**」② **编排器裁决 O-ADN-001~016（全部采纳 discovery 推荐项；本规范登记为「已裁决」）** ③ 编排器已完成的只读诊断（推荐层「确定性面 vs AI 面」已有 / 缺失映射、`chat-result` 载荷无结构化 next 字段、`pressDecision` 铁律①「候选恒由注册表产出」）④ 上游收口总账 `../specs-tree-web-cli-plugin-v55-f-input-as-next/closeout.md`（F-35 两叶 `validated`；体积 `598,577` → **R8 `38565ac` 重登记 `598,926`**；`1443` 测试基线）+ R8 门禁（`r8-open-next-entry.test.ts`）⑤ 相关立法（法一 / 法七 / 法八 / 法九；`v4-chat/spec.md`；v5.5 `ADR-V55-008/009/010`；v5 `ADR-V5-001`；F-35 `ADR-IAN-001/002`）⑥ 仓库现状（分支 `feature/web-cli-plugin` @ `7b9d50e`（F-36 discovery）；spec 阶段只读复核，**零运行时验证**）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建（web-cli-plugin F-36 / v0.11.3「AI 驱动 next」需求规范：父 Feature = 轻量规范容器 + **2 个叶子子 Feature**（依存序，`adn-1-ai-next-produce-and-verify → adn-2-deterministic-fallback-and-merge`）；含编排器对 O-ADN-001~016 十六条开放点的逐条裁决落位 + **AI 候选 5 道校验链口径** + **三档清分「候选接受判定」vs「按下判定」分层** + **S0''' 首验收场景四支线机器化口径** + X-ADN-1~11 显式取代的判据等价重写映射 + N-ADN-001~030 红线 + **体积分列预算表（B 列 SW 优先；距档 15,474 B 结论）**）

web-cli-plugin v5.5.3「AI 驱动 next（AI-driven next）」需求规范 —— 把作者裁决（**有连接 LLM 则 AI 驱动，next 也应交给 AI 驱动输出**）与既有诊断证据（**推荐层仍是确定性内核 `recommendNextStep` 独占产出；AI 在回合结题时口述的 4 条下一步没有结构化通道进 chips；chips 那一排仍显示陈旧的确定性候选**）转成可验收的需求：**「下一步推荐」这一层是「一切皆 next」主线上最后一块仍由确定性代码独占产出的内容面——LLM 已经能在回合内驱动工具 / 命令，也已经能「答案后零按键自动成回合」，却唯独不能「结构化产出下一步候选」**。作者看到的「AI 口述 4 条有用下一步 vs 那排陈旧 chip」（两张皮）正是这个面**产出者与被推荐内容脱钩**的可观察症状。

编号一律 `FR-ADN-*` / `NFR-ADN-*` / `EC-ADN-*` / `AC-ADN-*` / `NG-ADN-*`（ADN = AI-driven next；与 v1/v2/v3/v4/v4.5/v5/v5.5/v5.5.1/F-34/F-35 零冲突；discovery §7.5 本轮实测 `F-36` / `v0.11.3` 全仓 0 命中）。**父 Feature 定位 = 轻量规范容器**（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 / F-34 / F-35 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**），实施由 **2 个叶**按依存序承接。

**题眼（本 Feature 名 `ai-driven-next` 的语义）**：v5（F-32）把「**一切操作皆 next 流内闭环**」立法；v5.5（F-33）把「**下一步由谁按**」转移到系统 / AI 侧（`pressCandidate` + `driveAnsweredTurn`）；v5.5.1（F-34）把「**按的范围**」兑现为模型可见事实；v5.5.2（F-35）把「**输入面**」收编进 next 流内。**v5.5.3 的题眼 = 「产什么 next 也交给 AI」** —— 即把 next 候选的**产出权**从确定性注册表独占，改为「**LLM 结构化产出 → 确定性校验链放行 → 确定性注册表退居兜底与安全闸**」；AI 只获得一张**受 5 道校验约束的「口」**，而**不**获得「按下的手」（按下语义 `diff=0`，v5.5 已立法）。

**决定性事实（承 discovery §0.2 / §7，spec 阶段只读复核沿用）**：`recommendNextStep(input)` 是推荐产出的**唯一内核**（`recommend.ts:487`）；候选**全部**来自确定性 provider 注册表（`candidateRules` 遍历 `resolveOrder()`，`recommend.ts:436`；**11 行** provider，`providers.ts:124-201`）；真值白名单**恰 7 源**（`recommend.ts:121`）、模块白名单**恰 5 模块**（`:138`）、模块头自陈**必须零新 LLM 面**（`:11-12,24`，FR-CHAT-060）；`chat-result` 载荷字段穷举 = `variant`/`text`/`retrying`/`tool`/`ok`/`ms`/`targetSelector`——**无任何结构化 next 字段**（`chat-events.ts:48-66`）；AI 口述的下一步只能落成 `assistant` 文本（`sidepanel.ts:4185`），**不进 chips**；`pressCandidate` 接收的 opId **恒由注册表提供**（`ai-drive.ts:8` 铁律①）⇒ **今天没有任何「AI 产出候选 → 校验」入口**。**⇒ 本 Feature 的验收锚 = 让 AI 的结构化候选经 5 道校验注入 chips（替代陈旧候选），并让确定性注册表退居兜底与安全闸且 R8 零死端不回归。**

**与 F-35 / R8 的具体关系（承上、不替下）**：F-35（`validated`）与其两叶、R8 快修轮（`38565ac`）、F-34 / F-33 / F-32 / v4.5 / v4 / v5.5 产物**原样保留、零改写**（D7 / N-ADN-005）——本 Feature 以**并列新主题**立项，**不**上溯改写任何 `validated` / `tracked` 终态；R8 建立的「首开必有 free-input 终端」是**兜底红线**（N-ADN-008 / N-ADN-025，**不得回归**）。**唯一授权立法例外 = X-ADN-1 的「next 产出权转移」显式取代登记**（走 supersession 台账 + old→new，**不是**静默改写）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v55-f-ai-driven-next（web-cli-plugin v5.5.3「AI 驱动 next」，ROADMAP **F-36**） |
| 名称 | web-cli-plugin v5.5.3「AI 驱动 next」——① **AI 结构化产出 next 候通道**（时机 = 复用既有 `'idle'` 回合结题挂点；载体 = 既有 `chat-result` 载荷 **type-only 加法字段**，**零新增 kind**；候选结构 `{opId,label,ref?,params?}`）② **AI 候选校验链（5 道）**（opId 在册 → 三档清分 → ref 有效 → param 在 `AskSpec` 内 → 越界/非法**丢弃 + 留痕**）③ **三档清分闸复用 `tierOf` 单源**并**区分「候选接受判定」与「按下判定」**（`auto` 可提案可按下 / `confirm` 可提案但 consent 须用户答、**不可自动按下** / `gesture`（`op.authorize`/`op.perm.request`）**恒拒绝连提案都拒**）④ **确定性注册表退居兜底与安全闸**（未配 LLM / AI 未产出 / 非法被拦 ⇒ 确定性产卡；**free-input 终端恒常驻** R8 不回归）⑤ **合并口径**（同台争单卡位、多候选取前 N ≤3、R6 同因去重扩展、不破单卡 / 3-chip）⑥ **护栏**（过六常量、**提案不耗回合预算**、关断偏好涵盖 AI next）⑦ **首开保持确定性**（首屏零 LLM 往返依赖）⑧ **判据重锚与门禁处置**（新增 1 node 门禁 `ai-next-candidate`；升级 `recommendation-sources` / `NEXTSTEP_PRIORITY` 4 / `DRIVER_DECLS_SRC` 双向包含 11↔11→12↔12 / `op-wiring` 计数 / R6 同因去重 / `driver-timings` 恰 5；`CHROMIUM_GATES === 9` 不动） |
| 优先级 | P0（核心 / 产品语义一致性；承「让助手像助手」主线） |
| 目标版本 | **v0.11.3**（**全新版本位**，discovery §7.5 本轮实测 `v0.11.3` 全仓 = **0**；**patch 语义** = v0.11.0（F-33 v5.5）主题的补丁级跟进轮，承 F-34 `v0.11.1` / F-35 `v0.11.2` 先例）；登记留给收口，本阶段 **ROADMAP 零 diff** |
| 命名与版本位（**O-ADN-001 已裁决**） | 目录名 **`v55-f-ai-driven-next`**（`-f-` = 补丁级跟进轮，承 `v45-f-regularization` / `v55-f-scope-governance` / `v55-f-input-as-next` 先例）+ 版本位 **`v0.11.3`**（patch）；语义 = 「**v5.5 主题（一切操作皆 next / 让助手像助手）的 next 产出权收编补丁级跟进轮**」，见 §11.1 DC-ADN-001。**不采纳** ② 单独立大版本、③ 并入 F-35 树（与 D7 冲突） |
| 分支 | `feature/web-cli-plugin`（与 v1~v0.11.2 同分支继续堆；**不合 main、不发布**；**不碰 `main`**） |
| 当前 HEAD（立项时） | `7b9d50e`（`docs(sddu): F-36 discovery —— AI 驱动 next（v0.11.3）：LLM 结构化产出 next 候选 + 确定性注册表退居兜底与安全闸`，2026-09-26）；本规范为其上的 spec 产物 |
| 上游 / 底座 | F-35 `specs-tree-web-cli-plugin-v55-f-input-as-next`（v0.11.2，两叶 `validated`，**唯一直接上游**：free-input 终端 / 零死端 floor / `op.turn` 槽 / `requestTurn(` 恰 1 / 法四「输入即 next」）+ **R8 缺陷修复轮 `38565ac`**（首开 `maybeRecommendOpenEntry` 复用 `'idle'`；体积 `598,577 → 598,926`）+ F-34 `-v55-f-scope-governance`（v5.5.1；法九范围读数）+ F-33 `-v55-self-driven`（v5.5；`pressCandidate` / `driveAnsweredTurn` / 三档清分 / 护栏六常量 / 留痕三要素）+ F-32 `-v5-all-in-next`（v5；next 注册表契约 v2 / op 三档 / 12 kind / 零宿主 / 真值 7 源）+ v4.5 / v4（法一~法九 / 三区 / `#stream`）—— 全部**只读复用、零改写**（唯一授权例外 = X-ADN-1 产出权转移的**显式取代登记**，见 §5.10 / §12） |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = **2 个叶**（depth=2，见 §14） |
| 叶子 | ① `specs-tree-adn-1-ai-next-produce-and-verify`（**叶1 / 通道 + 安全核心**：AI 结构化产出通道（`'idle'` 时机 + `chat-result` 加法字段 + 零新增 kind）+ **5 道校验链**（opId 在册 / 三档清分（gesture 恒拒）/ ref / param / 丢弃+留痕）+ `tierOf` 单源复用 + **「候选接受」与「按下」判定分层** + `ai-next` provider 登记（`rule: ref-action` 位）+ `DRIVER_DECLS_SRC` 11→12 + `NextCtx` 加法字段登记 + SW 侧解析 / 校验（**B 列优先**）+ 留痕三要素 + 新 node 门禁 `ai-next-candidate`）→ ② `specs-tree-adn-2-deterministic-fallback-and-merge`（**叶2 / 兜底 + 合并 + 边界**：确定性退居兜底（未配 / 未产出 / 非法被拦）+ **free-input 终端恒常驻（R8 保底不回归）** + AI / 规则候选**合并 / 优先级 / 去重 / 上限**（同单卡位、前 N ≤3、R6 同因去重扩展）+ 首开边界落地（保持确定性）+ **S0''' 双支线终态**（已配置 AI 路径 / 未配置确定性路径）+ 体积重登记 + 门禁逐条重锚（含保护段决策））**依存序，必须串行**（叶2 依赖叶1 已建立通道与校验链 —— **先立通道与安全闸，再收兜底与合并口径**） |
| 相关干系人 | 作者（插件当前唯一真实用户 + 立项人 + 唯一决策者；**已授权编排器代行决策、全流程自行调度**，D1）；编排器（D1~D8 + **O-ADN-001~016 十六条裁决**）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-ADN-001~014（核心）/ Q-ADN-015~019（次要）/ Q-ADN-020~024（潜在）；母问题 = §2.2 Q-ADN-001 |
| 关联风险 | R-ADN-001~014（discovery 继承）+ R-ADN-901~910（spec 新增，见 §15.2） |
| 关联红线 | N-ADN-001~020（本规范从 discovery 约束 + 编排裁决红线编成，见 §13.1）+ **N-ADN-021~030（spec 新增红线，见 §13.2）** |
| 关联取代 | X-ADN-1~11（discovery §7.4 显式取代候选）→ §12 判据等价重写映射表 |

### 1.1 编号命名空间声明（**强制**）

| 命名空间 | 本 Feature 使用 | 历史占用（**零冲突，禁止复用**） |
|---|---|---|
| 功能需求 | `FR-ADN-###` | v1 `FR-001~055`；v2 `FR-V2-*`；v3 `FR-V3-*`；v4 `FR-CHAT-*`；v4.5 `FR-V45-*`；v5 `FR-ALLN-*`；v5.5 `FR-SELF-*`；F-34 `FR-SGO-*`；F-35 `FR-IAN-*` |
| 非功能需求 | `NFR-ADN-###` | v1 `NFR-001~010`；v2~F-35 `NFR-*` |
| 边界情况 | `EC-ADN-###` | v1 `EC-001~026`；v2~F-35 `EC-*` |
| 验收标准 | `AC-ADN-###` | v1 `AC-001~012`；v2~F-35 `AC-*` |
| 非目标 | `NG-ADN-###` | v2~F-35 `NG-*` |
| 目标 / 用户故事 | `G-ADN-###` / `US-ADN-###` | — |
| 裁决记录 | `DC-ADN-###` | v5 `DC-ALLN-*`；v5.5 `DC-SELF-*`；F-34 `DC-SGO-*`；F-35 `DC-IAN-*` |
| spec 新增风险 | `R-ADN-9xx` | v5 `R-ALLN-9xx`；v5.5 `R-SELF-9xx`；F-34 `R-SGO-9xx`；F-35 `R-IAN-9xx` |
| 红线（本规范编成 + 新增） | `N-ADN-001~020` / `N-ADN-021~030` | F-35 `N-IAN-001~028` |
| 缺口编号（本规范派生，见 §10.0） | `GAP-ADN-01~08` | F-35 `GAP-IAN-01~08` |
| 遗留开放点（spec 未裁决，交 plan / 后续轮） | `PD-ADN-0xx` | F-35 `PD-IAN-0xx` |
| 复核订正（spec 阶段只读复核与 discovery 不一致者） | `COR-ADN-*` | F-35 `COR-IAN-1~5` |
| 沿用 discovery | `Q-ADN-###` / `A-ADN-###` / `R-ADN-0xx` / `O-ADN-###` / `X-ADN-1~11` / `D1~D8` | — |
| 叶内编号（子规范） | `LG-ADN-x-###`（叶目标）/ `LNG-ADN-x-###`（叶非目标）/ `LD-ADN-x-###`（叶裁决） | F-35 叶 `LG-IAN-x-*` |

---

## 2. 上下文

### 2.1 立项来源（**编排指示逐字保留，不得转述走样**）

| # | 指示（逐字 / 提炼自 discovery §0.3） | 本规范承载体 |
|---|---|---|
| **P1** | 「**形态**：AI 在**何时**（回合结题 idle？首开 open？探测 ready？answered 后？）以**何载体**（chat 结构化字段？专用消息 kind？type-only？）产出结构化 next 候选 `{opId,label,ref?,params?}`；与既有 `chat` 载荷 / `refs` type-only 先例的关系；**零新增 kind 优先论证**」 | §5.2 **CHAN**（FR-ADN-010~019）；裁决 = O-ADN-002 / 003 |
| **P2** | 「**校验与安全（核心）**：AI 产出的 op 候选必须过**三档清分闸**——auto/confirm 档可提案、**gesture（authorize/perm.request）恒拒绝**；opId 必须在注册表在册（未知 op 拒绝）；ref 必须存在且有效；参数在 op 参数 schema 内；越界/非法一律**丢弃 + 留痕**，不得静默接受」 | §5.3 **VERIFY**（FR-ADN-020~029）+ §5.4 **TIER**（FR-ADN-030~035）；裁决 = O-ADN-004 / 005 / 006 |
| **P3** | 「**确定性兜底**：注册表 chips 保留为**安全兜底与降级**（未配 LLM / AI 未产出 / AI 产出非法被拦时）；free-input 终端**恒常驻**（R8 floor 保底不回归）；AI 候选与规则候选的**合并/优先级/去重/上限**（`MAX_NEXTSTEP_CARDS_PER_ROUND=1` 与多卡渲染现状——AI 多候选如何呈现？）」 | §5.5 **FALLBACK**（FR-ADN-040~046）+ §5.6 **MERGE**（FR-ADN-050~056）；裁决 = O-ADN-007 / 008 |
| **P4** | 「**护栏**：AI 候选同样过六常量（频次/同因/冷却/链深/预算）；AI 候选是否消耗回合预算；防刷屏（同因去重扩展）；关断偏好是否涵盖 AI next」 | §5.7 **GUARD**（FR-ADN-060~065）；裁决 = O-ADN-009 |
| **P5** | 「**首开（open）AI 化**：R8 的 open 入口在已配置时是否也由 AI 产初始 next（问候/能力探测建议），还是保持确定性（free-input+capability）？——**边界裁决点**」 | §5.8 **OPEN**（FR-ADN-070~073）；裁决 = O-ADN-010 |
| **P6** | 「**时机源扩展**：是否需要新增触发词（如 `idle` 复用 vs 新 `turn-done`）——优先复用，破 DT-2/DT-3 恰 5 需等价重锚论证」 | §5.2 FR-ADN-010；裁决 = O-ADN-011 |
| **P7** | 「**风险**：AI 候选幻觉 op（必须校验）/ 候选与在飞回合竞争（chatBusy 仲裁）/ 体积（AI 候选解析+校验在 SW or 面板——B 列优先）/ 门禁重锚（recommendation-sources / NEXTSTEP_PRIORITY / DRIVER_DECLS_SRC 双向包含 / op-wiring 计数）/ 保护段」 | §5.11 **GATE** + §5.12 **VOL** + §15 风险登记；裁决 = O-ADN-012 / 014 |
| **P8** | 「**命名**：F-36、v0.11.3、树名建议 `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（承 F-34/F-35 patch 系）；ROADMAP 登记留收口」 | §1 元数据 · FR-ADN-001；裁决 = O-ADN-001 |
| **约束** | 「作者已授权编排器代行决策；开放点收集附推荐（spec 批量裁决）。`.sddu` 外零触碰；commit `docs(sddu): F-36 spec …`；推送 gh 凭据形式（SSH 阻断则 `GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper='!gh auth git-credential' push https://github.com/THZSummer/LGDL.git HEAD:refs/heads/feature/web-cli-plugin`）+ fetch 同步」 | §16 纪律表；本规范已遵守 |

> **口径声明（如实）**：作者**除 §0.1 裁决原话外**未给出进一步实现约束；P1~P8 均为**编排器转述的指示要点**。形态 / 载体 / 校验 / 合并 / 首开 / 体积位置全部在 discovery 登记为 `O-ADN-001~016`，**本阶段由编排器批量裁决**（D1 / D2），逐条落位于 §11。**本规范不新增作者未表达的需求**。

### 2.2 只读诊断证据（**已完成，本规范复核并引用，不重开诊断**）

**推荐层现状映射（确定性面 vs AI 面：已有 / 缺失；spec 阶段逐条只读复核 ✅）**

| 面 | 维度 | 已有（`file:line`） | 缺失（本 Feature 的对象） |
|---|---|---|---|
| **确定性面** | 产出内核 | `recommendNextStep(input)`（`recommend.ts:487`）单内核 | —— |
| | 候选来源 | 注册表 provider（`candidateRules` `recommend.ts:436`；**11 行** `providers.ts:124-201`） | 无「AI 候选」来源 |
| | 真值源 | 7 源白名单（`recommend.ts:121`）+ 模块白名单 5（`:138`） | 无「AI 候选」注入槽 |
| | 规则表 | `NEXTSTEP_PRIORITY` **恰 4**（`recommend.ts:60`） | 无 AI 候选的规则位口径 |
| | 上限 | 单卡 `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（`:51`）+ 3 chip（`:54`） | 无「AI 多候选」合并口径 |
| | 时机 | **恰 5**（`drivers.ts:31-36`）+ `maybeRecommend` **8 调用点**（`sidepanel.ts:2097/2285/2303/2659/2836/2906/4106/4178`） | 无新时机（复用 `'idle'`） |
| | 闸门 | `pending`/`interval`/`empty`/`safety`（`:487-517`） | 无「AI 候选校验」闸 |
| | 兜底 | floor「仅含终端」最小卡（`:506-517`）+ 终端恒真（`providers.ts:195`） | AI 化后兜底位置待定 |
| **AI 面** | 回合内驱动 | thinking / command / tool 卡（`service-worker.ts`；`chat-events.ts:80-102`） | —— |
| | 自动按下 | `pressCandidate`（`ai-drive.ts:128-144`）+ 三档（`op-table.ts`） | AI **不能产出**候选（仅能按注册表给的，铁律① `ai-drive.ts:8`） |
| | 自动成回合 | `driveAnsweredTurn`（`sidepanel.ts:2120-2159`；经**既有** `op.turn` 槽） | 同上 |
| | 护栏 | 六常量（`guard.ts:18-34`）+ 关断偏好（`guard.ts:32`） | 无「AI 候选」的预算 / 关断口径 |
| | 留痕 | `driver=… | timing=… | evidence=…`（`ai-drive.ts:85`）+ `MANUAL_DRIVER_ID='manual'` 两值可判（`:85-101`） | 无「AI 候选产出」的留痕行 |
| | 并发 | SW 有界队列 `TURN_QUEUE_MAX = 1` + `ai-deferred`（`chat-events.ts:45`） | 无「候选产出 vs 在飞」让步口径 |

> **一句话**：**确定性面 = 完整且成熟（产 / 校 / 兜 / 限 齐备）；AI 面 = 有「手」（按下 / 成回合）却没有「口」（产出候选）**。本 Feature = **给 AI 一张受校验约束的「口」**，并让确定性面退居兜底与安全闸。

**关键事实（spec 阶段只读复核 ✅）**

| # | 事实 | `file:line` |
|---|---|---|
| F-1 | **推荐器今天必须「零新 LLM 面」**：模块头逐字「never a new LLM product（FR-CHAT-060: zero new network / privacy / cost surface）」 | `recommend.ts:11-12,24`；`test/recommendation-sources.test.ts:238`（④ 源码不含 `fetch(` / `chrome.` / `Date.now` / `XMLHttpRequest` / `WebSocket`） |
| F-2 | **推荐器真值白名单恰 7 源 + 模块白名单恰 5 模块** | `recommend.ts:121-144`；`test/recommendation-sources.test.ts:109-118,354` |
| F-3 | **AI 口述的「下一步」今天只作为 `assistant` 文本落流**（不参与 chips） | `sidepanel.ts:4185` |
| F-4 | **门禁钉死现状计数**：`requestTurn(` **恰 1** · `maybeRecommend` **1 定义 / 8 调用点** · `nextAfterSettle` **1 定义 / 10 调用点** | `test/op-wiring.test.ts:56,61,130,246-266,370`；`test/driver-timings.test.ts:10-15,87-100`；`test/driver-quadruple.test.ts:13-22` |
| F-5 | **零新增 kind / 零宿主 判据**：`KIND_SET` **恰 40**；`STREAM_EVENT_KINDS` / `CARD_TYPES` **12 kind**；`REGISTERED_STRUCTURAL_HOSTS = []` | `background/messaging.ts`（`KIND_SET`）/ `stream-model.ts:72-83` / `host-registry.ts`；`test/gate-integrity.test.ts` |
| F-6 | **体积（R8 后，本轮实测）**：`dist/sidepanel.js` 基线 **598,926 B**；档位 **614,400**（距档 **15,474 B**）；绝对上限 **675,840**；生效上限 `floor(598,926×1.05) = `**`628,872`**；`authorConfirmation = pending-author-line`；冻结面 `content.js` **177,076 B** / `pick-layer.js` **34,358 B**；**B 列 `dist/background.js` 1,636,621 B 不计入 sidepanel 账本** | `test/size-baseline.ts:381`（`SIDEPANEL_BASELINE_BYTES`）/ `:506-511`（R8 重登记 598,577→598,926，+349）/ `:573`（`FINAL_ARTIFACT_BYTES`）/ `:662`；`stat -c %s` 复核 |
| F-7 | **`ChatResultVariant` / `ARBITRATION_RESULTS` 是 type-only 词汇**（∉ `KIND_SET`；骑既有 `chat-result` kind 作 `variant` 值） | `chat-events.ts:24-46`；`background/messaging.ts:114` |
| F-8 | **SW 侧已有 `op-table` 双面镜像**：`SW_OPS` 由 `shared/op-table.ts` 派生（`filter(layer === 'sw')`），`sw-op-mirror` 门禁扫描 | `background/op-executors.ts:7-44`；`test/sw-op-mirror.test.ts` |
| F-9 | **保护段（活跃 pin）**：journey **`[43484,59347)`** / len **15863** / **249 行** / sha **`7b309258aab783e7…`**；binding **`[107780,115930)`** / len **8150** / sha **`be9ad0e9…`**（F-35 第四次取代后） | `docs/v4-supersession-ledger.json#protectedSupersession`；`test/supersession-ledger.test.ts:933-942` |
| F-10 | **`zeroDiffFiles` 恰 9 项**（内容哈希 pin）；`packages/web-cli-base/**` 零 diff 机核 | `docs/v4-supersession-ledger.json#zeroDiffFiles`；`test/insight-no-escalation.test.ts:147` |

### 2.3 AI 候选注入面（**已有 / 缺失**，spec 复核沿用）

| 维度 | 已有（可复用事实） | 缺失（本 Feature 问题域） |
|---|---|---|
| **产出通道** | `chat-result` 既有 kind + type-only `variant` 值（F-7）；AI 回合内已能驱动工具 / 命令（`service-worker.ts`） | 无「结构化 next 候选」字段；AI 口述下一步只落 `assistant` 文本 |
| **校验判据** | `tierOf`（`op-table.ts:158-160`，派生式单源）、`OP_TIERS`（3）、`OP_TIER_TABLE`（物化）、`OP_DESCRIPTORS` **9**、`tierOfId`（未知 ⇒ `undefined`）、`ref-store`（`l1/ref-store.ts`）、op 的 `params: AskSpec`（`definition.ts:101-104,152`） | **无**「AI 候选 → 在册 / 档位 / ref / param」校验入口（`pressCandidate` 的 opId 恒由注册表提供） |
| **按下判定** | `pressDecision(opId, ctx)` 纯函数（`ai-drive.ts:67-78`）：未注册 ⇒ `unknown-op`；`tierOf(d) !== 'auto'` ⇒ `tier`；`confirm`/`gesture` **恒拒**（对「按下」而言正确） | 无「**候选接受**（提案）」判定层 ⇒ 与「按下」判定混同（今天只有一个 `pressDecision`） |
| **留痕** | `blocked=<reason>`（`ai-drive.ts:138`）+ `suppressed=<reason>`（`:112`）+ `driverTraceLine` 三要素（`:85`，只含字段名零明文） | 无「候选校验失败」的 `blocked=` 子类 |
| **注入槽** | `recommendNextStep(input)` 是 pure、输入是 plain record（`recommend.ts:28-32`）；`RecommendInput` 今天 7 源 + 助手字段 | 无「AI 候选」注入槽（`RecommendInput` / `NextCtx` 无对应字段） |
| **规则位** | `NEXTSTEP_PRIORITY` **恰 4**；`candidateRules` 按优先级取**首个命中规则**（`recommend.ts:441-456`） | 无「AI 候选占规则位」口径 |
| **兜底** | floor「仅含终端」最小卡（`recommend.ts:506-517`）+ 终端恒真（`providers.ts:195`）+ R8 `maybeRecommendOpenEntry`（`sidepanel.ts:2279-2286`） | AI 化后须与 floor / 终端共存 |

### 2.4 现状事实核对（**spec 阶段只读复核，零运行时验证**）

#### A. 复核对账（与 discovery §0.2 逐条比对）

| 面 | discovery 表述 | spec 复核 | 订正 |
|---|---|---|---|
| 推荐内核 | `recommendNextStep` 唯一内核 `:487` | ✅ 命中（`export function recommendNextStep` `:487`） | — |
| provider 集合 | 11 行（5 触发器 + 2 op 驱动 + 3 规则 + 1 `free-input`） | ✅ 命中（`builtinProviders()` 返回 `[...recovery, ...opRecovery, ...rules, ...terminal]` = 11；`FREE_INPUT_PROVIDER_ID` `:95`） | 注释仍写「8」（COR-ADN-4） |
| 驱动者声明表 | 11 行 `providers.ts:224-239` | ✅ 命中（`DRIVER_DECLS_SRC` 恰 11 键） | — |
| 时机源 | 恰 5 `drivers.ts:31-36` | ✅ 命中（`DRIVER_TIMINGS` 5 + `DRIVER_TIMINGS_LEGACY4` 4 + `DRIVER_TIMING_ANSWERED`） | 区间微移（COR-ADN-5） |
| op 三档 | `auto 5` / `confirm 2` / `gesture 2` | ✅ 命中（`tierOf`：`layer==='sw'` ⇒ `gesture`；`hasConsent` ⇒ `confirm`；否则 `auto`；`OP_DESCRIPTORS` 9） | — |
| op 集合 | 9 枚 | ✅ 命中（`OP_IDS`：`op.turn/pick/describe/help/rebind/llm-config/revoke/authorize/perm.request`） | — |
| `pressDecision` | `ai-drive.ts:67-78` | ✅ 命中（顺序：`unknown-op` → `tier` → `driver-class` → `unconfigured` → `busy` → `not-armed` → `guard`） | — |
| `blocked:` / `suppressed:` | `:138` / `:112` | ✅ 命中；`PressBlocked` 闭集含 `unknown-op` / `tier` / `driver-class` / `unconfigured` / `not-armed` / `busy` / `guard` | — |
| `chat-result` 载荷 | 无结构化 next 字段 | ✅ 命中（`ChatResultEvent` 字段穷举 = `variant`/`text`/`retrying`/`tool`/`ok`/`ms`/`targetSelector`） | — |
| `KIND_SET` / 12 kind / 零宿主 | 40 / 12 / `[]` | ✅ 命中 | — |
| 动作集 A | `data-act='free-input'` ∈ 集 A（8→9） | ✅ 命中（`SET_A_PROTOCOL_ACTIONS` 恰 9 项；`ACT_TO_OP` 仍恰 6 行） | — |

#### B. 门禁 / 冻结面 / 体积（**引自上游收口 + R8，本轮未复跑**）

| 项 | 值 | 来源 |
|---|---|---|
| `sidepanel.js` 基线 | **598,926 B** | `test/size-baseline.ts:381`（R8 重登记 `598,577 → 598,926`，+349） |
| 档位 / 绝对上限 / 生效上限 | **614,400** / **675,840** / `floor(598,926 × 1.05) = `**`628,872`**（`SIDEPANEL_CEILING_CAP_ROLE = 'record-only'`） | `size-baseline.ts:506-511,540-550` |
| `authorConfirmation` | `pending-author-line`（**未闭合义务**；承接 v5.5 两次升档；R8 **未新增升档**） | 同上 |
| 冻结面 | `content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** / 12 kind / 零宿主 / base 零 diff | 上游收口 + R8（本轮引用，未复跑） |
| 门禁基线 | `npm test` **1443**（F-35 收口；R8 新增 node 门禁 `r8-open-next-entry.test.ts` 后精确值**未登记** ⇒ 本 Feature 以 F-36 起点实测为准）· `CHROMIUM_GATES === 9` · `supersession` **49** · `gate-integrity` **24** · `journey` **171** · `binding` **192** | F-35 closeout §「关键数字」+ R8（引用，未复跑） |
| 保护段（**活跃 pin**） | journey **`[43484,59347)`** / **15863 B** / **249 行** / sha **`7b309258aab783e7…`**；binding **`[107780,115930)`** / **8150 B** / sha **`be9ad0e9…`** | F-35 ian-2 validate / `supersession-ledger.test.ts`（本轮只读复核 ✅） |
| `zeroDiffFiles` | **恰 9 项**（内容哈希 pin） | `docs/v4-supersession-ledger.json` |

#### C. 复核订正（**spec 阶段只读复核与 discovery 表述不一致者，逐条如实登记**）

| # | discovery 表述 | 复核事实 | 处置 |
|---|---|---|---|
| **COR-ADN-1** | F-6 记 `sidepanel.js` 基线 **598,926 B**、生效上限 **628,872** | **✅ 成立**（`size-baseline.ts:381,573`）；但 **F-35 closeout 记的终值 598,577 B / 628,505 已被 R8 `38565ac` 重登记覆盖**（`598,577 → 598,926`，+349；`sidepanel.ts` +349） | 本 Feature 的**唯一体积锚 = R8 后的 598,926**；F-35 的 598,577 作为**历史链节保留**（`SIDEPANEL_RE_REGISTRATIONS` + `size-baseline.ts:592` 逐字未删）。**不得**据 F-35 closeout 旧值误判档位余量（正确余量 = **15,474**） |
| **COR-ADN-2** | A-1 / DT-5 记「`recommendNextStep(` 在 `sidepanel.ts` **恰 1 个调用点**」 | **门禁实际钉的是**「`export function recommendNextStep(` 在 `recommend.ts` **恰 1 定义**」+「`function maybeRecommend(` 在 `sidepanel.ts` **恰 1 定义**」（`driver-timings.test.ts` `evaluationEntryProblems`）；`sidepanel.ts` 内 `recommendNextStep(` 实为 **2 处**（生产 `maybeRecommend` 内 `:2050` + `window.__v3.testing` 诊断钩子 `:1224`，后者非生产路径、门禁不计） | 重锚口径 = **定义唯一**（内核单源）；discovery 的「调用点恰 1」表述**订正为「生产调用点恰 1（+1 诊断钩子，非生产）」**；discovery 数字不改写，本规范以 COR-ADN-2 显式登记 |
| **COR-ADN-3** | F-4 / §7.4 X-ADN-6 记 `op-wiring.test.ts:370` 为 `maybeRecommend 1/8` 机核 | **✅ 语义成立**；行号漂移（`op-wiring` 现 `:56,61,130,246-266,284-300,370`；`maybeRecommend 8` 在 `:246-266`，`:370` 为 V5.5F-1 复合读数） | 重锚按**断言语义**（`maybeRecommend` 1 定义 / 8 调用点；`nextAfterSettle` 1 定义 / 10 调用点；`requestTurn(` 恰 1）逐条，不按行号；COR-ADN-3 显式登记 |
| **COR-ADN-4** | A-4 记 provider「5 触发器 + 2 op 驱动 + 3 规则 + 1 `free-input` = 11 行」 | **✅ 成立**；但 `providers.ts:124` 的**注释仍写「The 8 built-in providers」**（v5-1 遗留陈旧文案，实际返回 11） | 本 Feature 若新增 provider（11→12）须**同步订正该注释**（真源切片门禁按**实际返回数组**判，不按注释）；COR-ADN-4 显式登记 |
| **COR-ADN-5** | A-6 记时机源 `drivers.ts:31-36` | **✅ 成立**（`:33` `DRIVER_TIMINGS` + `:35` `DRIVER_TIMINGS_LEGACY4` + `:37` `DRIVER_TIMING_ANSWERED`；区间微移） | 重锚按**值集**（恰 5 / 旧 4 逐字 / 含 `answered`）逐条；COR-ADN-5 显式登记 |

> **口径**：以上订正**不改变**任何 discovery 的问题判定 / 编号 / 风险等级；只把 spec 阶段只读复核到的**更精确事实**显式登记（承 F-34 `COR-SGO-*` / F-35 `COR-IAN-*` 先例）。

### 2.5 目标用户

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 本 Feature 的应对（需求层） |
|---|---|---|---|
| **作者（唯一真实用户 + 唯一决策者）** | 真机侧栏（`platform.deepseek.com`）：一个回合刚刚结束，AI 在结题时口述了 4 条有用的下一步 | ①（裁决逐字）「**有连接 LLM 的情况下的原则是，AI 驱动呀，所以 next 也应该交给 AI 去驱动输出**」；②（两张皮）「LLM 结题时口述了 4 条很有用的下一步**却进不了 chips**，而那一排却显示陈旧的『用引用 1 做原地翻译』」 | AI 结构化产出候选 + 5 道校验 + 注入 chips 替代陈旧候选（FR-ADN-010~056） |
| **作者（首开 / 冷启动场景）** | R8 后首开面板：推荐卡末端出现「自由输入…」终端 | 追问「**这个推荐对吗，是不是还是写死的**」——R8 的终端仍是确定性 provider 产出 | **首开保持确定性**（裁决 O-ADN-010）；AI 初始 next 明列后续轮（NG-ADN-014） |
| **作者（未配置 / AI 失败场景）** | 未配 LLM 的冷启动；或已配置但某回合 LLM 超时 / 输出非法 | 隐含需求：**AI 化不得让 next 层死端**（R8 刚修好首开零死端） | 确定性注册表退居兜底 + free-input 恒常驻（FR-ADN-040~046） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一条『AI 产出的 next』要改哪些文件？」 | 现状答案 = **无此通道**：`chat-result` 无 next 字段；`recommendNextStep` 真值白名单 7 源 / 模块白名单 5 / 必须零新 LLM；`pressCandidate` 的 opId 恒由注册表提供（铁律①） | 扩展点固定：一个 `ai-next` provider + 一个注入槽 + 一个校验器（零新增 kind）（FR-ADN-014/015/028） |
| **审查者 / 验证者** | 需要证明「AI 候选不能触达特权 / 不能绕过 consent」且「确定性兜底不回归」 | LLM 输出不确定 ⇒ 门禁无法直接断言输出；须落在**纯函数校验器 + 注入反证** | S0'''（§5.9）+ 纯函数校验器（FR-ADN-028/029）+ 注入反证族（FR-ADN-082） |

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2/v3/v4/v4.5/v5/v5.5/v5.5.1/F-34/F-35 同一事实基础。**本规范不编造用户调研数据**；「用户原话」栏引用 discovery §0.1 作者裁决逐字与代码事实。

### 2.6 与上游 / 下游 Feature 的关系（**边界**）

| 关系 | 对象 | 口径 |
|---|---|---|
| **直接上游（只读复用）** | F-35 `specs-tree-web-cli-plugin-v55-f-input-as-next`（v0.11.2，两叶 `validated`）+ **R8 `38565ac`** | free-input 终端 / 零死端 floor / `op.turn` 槽 / `requestTurn(` 恰 1 / 法四「输入即 next」/ 首开入口复用 `'idle'` —— **原样继承，零改写**（N-ADN-005 / N-ADN-025） |
| **底座（只读复用）** | F-34 `-v55-f-scope-governance`；F-33 `-v55-self-driven`；F-32 `-v5-all-in-next`；v4.5 / v4 | 法九范围读数 / `pressCandidate` + `driveAnsweredTurn` + 三档清分 + 护栏六常量 + 留痕三要素 / next 注册表契约 v2 + op 三档 + 12 kind + 零宿主 / 法一~法九 —— **零改写** |
| **唯一授权例外（显式取代）** | `recommendNextStep` 的「确定性独占产出」 | O-ADN-001 / X-ADN-1 = **产出权转移**；**必须**走 supersession 台账 old→new（**不是**静默改写）；**不升格**任何新法条 |
| **明确不动** | F-29（A2A 候选，未立项未排期） | 保持原样不动（NG-ADN-017） |
| **下游** | @sddu-plan（依赖 `spec.md` 完成） → … → 两叶各自 build/review/validate | 父为轻量规范容器 |

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 | 判据锚 |
|---|---|---|
| **G-ADN-001** | **AI 结构化产出 next 候选**：LLM 在回合结题（`variant='done'`/`'error'`）时产出结构化 next 候选 `{opId,label,ref?,params?}`，经**既有 `chat-result` 载荷 type-only 加法字段**回面板（**零新增 kind**） | AC-ADN-002 / S0'''-1 |
| **G-ADN-002** | **5 道校验链（安全核心）**：opId 在册 → 三档清分 → ref 有效 → param 在 `AskSpec` 内 → 越界/非法**丢弃 + 留痕**（不静默接受 / 不死端） | AC-ADN-003 / 004 / S0'''-2/3 |
| **G-ADN-003** | **三档清分分层**：复用 `tierOf` 单源；**「候选接受判定」与「按下判定」分层**——`auto` 可提案可按下 · `confirm` 可提案但 consent 须用户答、**AI 不可自动按下** · `gesture` **恒拒绝连提案都拒** | AC-ADN-005 / S0'''-8 |
| **G-ADN-004** | **确定性退居兜底与安全闸**：未配 LLM ⇒ 纯确定性（现状不变）；已配置但 AI 未产出 / 非法被拦 ⇒ 确定性产卡；**free-input 终端恒常驻（R8 不回归）** | AC-ADN-006 / S0'''-4/6 |
| **G-ADN-005** | **合并口径**：AI / 规则候选**同台竞争同一单卡位**；多候选取前 N（≤3）；R6 同因去重扩展覆盖 AI；**不破单卡 / 3-chip / `NEXTSTEP_PRIORITY` 恰 4** | AC-ADN-007 / S0'''-5 |
| **G-ADN-006** | **护栏一致**：AI 候选同样过六常量；**提案不耗回合预算**；关断偏好涵盖 AI next（显示 + 自动按下）；零第二阈值 | AC-ADN-008 / S0'''-9 |
| **G-ADN-007** | **首开确定性不破**：首屏不依赖 LLM 往返；首开入口继续复用 `'idle'`（R8 零死端保持） | AC-ADN-009 / S0'''-10 |
| **G-ADN-008** | **门禁强度不降 + 体积可管理**：新增 **1** node 门禁 `ai-next-candidate`；升级 6 项既有门禁（等价重锚，**断言零删除零降级**）；`KIND_SET` 40 / 12 kind / 零宿主 / 三冻结面逐字不动；**先出分列预算**（B 列 SW 优先）再排落地 | AC-ADN-010 / 024 / §5.12 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 | 理由（来源） |
|---|---|---|
| **NG-ADN-001** | **改动 LLM 回合内的工具 / 命令驱动（thinking / command / tool 卡）** | v5.5 已建（discovery B-1）；本 Feature 只动「产 next 候选」，不动「回合内驱动」 |
| **NG-ADN-002** | **改动 `pressCandidate` / `driveAnsweredTurn` 的自动按下或自动成回合语义** | v5.5 已闭环（B-2/B-4）；本 Feature 只新增「候选来源」，按下 / 成回合语义 **diff=0** |
| **NG-ADN-003** | **改动三档清分闸的档位定义（`tierOf` / `OP_TIER_TABLE` / `hasConsent`）** | 派生式单源（B-5）；本 Feature **只接入**该闸，不重新定义档位 |
| **NG-ADN-004** | **改动护栏六常量的阈值 / 新增第二份阈值** | 单源（B-6，`guard.ts:18-34`）；本 Feature 只**接线**（AI 候选同样过） |
| **NG-ADN-005** | **改动 SW 有界队列裁决逻辑（`turn-queue.ts` 三分支）** | R6 已闭环（B-9）；本 Feature 只保证 AI 候选的「自动成回合」仍撞既有仲裁（`ai-deferred`） |
| **NG-ADN-006** | **F-35 / F-34 / F-33 / F-32 / R8 / v4.5 / v4 / v5 / v5.5 产物改写** | D7：全部原样保留；本 Feature 为并列新主题（**唯一授权例外 = X-ADN-1 产出权转移的显式取代登记**） |
| **NG-ADN-007** | **`src/content/**`（`content.js` 177,076 B）/ `pick-layer.js`（34,358 B）语义改动** | 字节冻结红线（零容差）；本 Feature 只动侧栏 / SW 的 next 产出与校验面 |
| **NG-ADN-008** | **`packages/web-cli-base/**` 任何改动** | 硬红线：`insight-no-escalation.test.ts:147` 机核 `../web-cli-base` **零 diff** |
| **NG-ADN-009** | **判定链（`src/security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles`（9 项）冻结面触碰** | 硬底线（内容哈希 pin 不变） |
| **NG-ADN-010** | **新增消息 kind（第 41 项）/ 新增卡 kind（第 13 种）/ 新宿主** | 零新增 kind / 零宿主纪律（F-5）；AI 候选**复用既有 `chat-result` 载荷（type-only 加法字段）** |
| **NG-ADN-011** | **特权 op（`op.authorize` / `op.perm.request`）的发起方式 / AI 代答 consent** | 红线：特权恒 `gesture`、AI 不可代答；本 Feature 把「`gesture` 恒拒（连提案都拒）」列为**校验链硬约束** |
| **NG-ADN-012** | **法八（零明文）放宽** | `law8-plaintext.mjs` 必绿：AI 候选的 `label` / `ref` / `params` / 校验留痕**不得**把明文正文写进流内 payload / digest / 审计 / DOM 四面 |
| **NG-ADN-013** | **在 `recommend.ts` 内直接调用 LLM（触达网络 / `chrome` / 时钟）** | 会破 F-1/F-2 与 FR-CHAT-060；候选**必须由外部（SW）解析后经注入槽**进入（X-ADN-2 保持「未发生取代」） |
| **NG-ADN-014** | **首开（open / ready）AI 化** | O-ADN-010 裁决 = 首开保持确定性（可达性优先）；AI 初始 next 明列后续轮 |
| **NG-ADN-015** | **多卡（>1 卡）/ 破 3-chip 上限 / 新增第 5 规则位** | O-ADN-008 裁决 = 同台争单卡位 + 前 N ≤3 + `NEXTSTEP_PRIORITY` 恰 4 不动（X-ADN-3 / X-ADN-4 未发生取代） |
| **NG-ADN-016** | **断言删除 / 降级 / 保护段静默改写** | 替换必须**等价重锚**（断言力不降、计数只增）并留台账（N-ADN-012 / N-ADN-024） |
| **NG-ADN-017** | **F-29（A2A 候选）状态变更** | 未立项未排期，保持原样不动（N-ADN-014） |
| **NG-ADN-018** | **伪称体积档位已确认**（`authorConfirmation` 改写） | `pending-author-line` 属**未闭合义务**（N-ADN-013） |
| **NG-ADN-019** | **外部竞品调研** | O-ADN-015 裁决 = 不需要；**不得**据此外推（承 F-35 NG-IAN-012） |
| **NG-ADN-020** | **在 plan 之前排「全量落地」** | R-ADN-006 / v5 教训（plan Σ 低估 **2.8×**；F-35 叶1 越预算 +7,179 B）；先出分列预算再排落地 |

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|---|---|---|
| **US-ADN-001** | 作者 | 回合结束时，chips 里显示的是 **AI 刚说过的那些下一步** | 不再看到与当下无关的陈旧推荐（「两张皮」消失） |
| **US-ADN-002** | 作者 | AI 给的下一步能**一键点开**（不是只能读的纯文本） | 有用建议当场兑现为一次点击 |
| **US-ADN-003** | 作者 | AI **永远不能**替我做需要我确认 / 授权的事 | 我的 consent 与特权动作不被 AI 代答 |
| **US-ADN-004** | 作者 | 即使 AI 抽风（说了个不存在的动作 / 引用了失效引用），界面也**不静默**、不出死端 | 我能看出「这条建议被拦了」，且仍有可点的下一步 |
| **US-ADN-005** | 作者 | 没连 LLM 或 AI 失败时，面板**仍然**有下一步可点（含自由输入） | AI 化不把刚修好的首屏可达性打回原形 |
| **US-ADN-006** | 作者 | 首开面板**不因为等 AI** 而空着 / 卡住 | 首屏可达性不依赖网络与延迟 |
| **US-ADN-007** | 作者 | AI 给多个建议时**不刷屏**，最多一卡几项 | 推荐区仍是「引导」而不是「列表」 |
| **US-ADN-008** | 维护者 | 新增一条「AI 产出的 next」只改 **一个 provider + 一个注入槽 + 一个校验器** | 扩展点固定，不靠碰巧 |
| **US-ADN-009** | 维护者 | AI 候选的校验与按下**共用同一份档位单源**（`tierOf`） | 不产生第二份档位表 / 第二套阈值 |
| **US-ADN-010** | 审查者 | 能用一条**可机核样板**证明：合法 AI 候选被采纳、非法候选被拦且留痕、确定性兜底不回归（含注入反证） | 不靠人工观感判断「这次没放行特权 / 没删兜底」 |

---

## 5. 功能需求 (FR)

> 编号 `FR-ADN-###`；每条**可测试**；P0 = 本 Feature 必需，P1 = 必需但可在同叶内后置，P2 = 记录性（门禁 / 台账）。**FR → 叶 覆盖矩阵见 §14.3。**

### 5.1 GOV — 立案、结构与纪律（横切）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-001** | 本 Feature 登记为 **F-36 / v0.11.3**（patch 跟进轮），目录名 `specs-tree-web-cli-plugin-v55-f-ai-driven-next`；**ROADMAP 零 diff**（登记由收口承接） | §1 元数据齐备；`git diff --stat -- .sddu/specs-tree-root/ROADMAP.md` = 0 | P0 |
| **FR-ADN-002** | 父 Feature = **轻量规范容器**（不承接 build/review/validate、不产 `tasks.json`）+ **2 叶（依存序串行，`adn-1 → adn-2`）**；叶目录**直接嵌套**（`specs-tree-adn-1-*` / `-adn-2-*`），**禁止 `children/` 中间层** | §14.1/§14.2 结构裁决齐备；state.json `childrens` 恰 2 项 | P0 |
| **FR-ADN-003** | 纪律：`.sddu/**` 只写本 Feature 树；spec 阶段**零改动** `src/` `test/` `dist/` `design/` `docs/` 与 `ROADMAP.md` | `git status --short` 仅本 Feature 目录 | P0 |
| **FR-ADN-004** | 命名空间声明（§1.1）齐备；**断言零删除零降级、门禁计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 每条 AC 有唯一 ID；门禁对账表（§9.5）无减少项 | P0 |
| **FR-ADN-005** | 红线编制 **N-ADN-001~020** 逐条承载 + **X-ADN-1~11** 逐条等价重锚（§12 / §13）；**未发生的取代须如实登记「未发生」** | §12 / §13 无遗漏；台账条目与 X 项一一对应 | P0 |
| **FR-ADN-006** | **主流程零扩张优先读法**：**不新增 LLM 调用**（候选复用刚结束回合输出）；`pressCandidate` / `driveAnsweredTurn` / `turn-queue.ts` / `requestTurn(`（恰 1）/ `nextAfterSettle`（1 定义 / 10 调用点）**语义 diff = 0**；`maybeRecommend` 调用点只增不减且须等价重锚 | `test/op-wiring.test.ts` / `turn-arbitration` / `op-three-tier` 绿 + 逐条反证 | P0 |
| **FR-ADN-007** | **编排裁决落位**：O-ADN-001~016 **全部** `ruled` 并逐条落位 §11（DC-ADN-001~016）；**开放点不得在 spec 前被顺手定下** | §11 全 `ruled`；§8 只剩 `PD-ADN-*` | P0 |

### 5.2 CHAN — AI 结构化产出 next 通道（**核心 1**，叶1）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-010** | **时机 = 复用既有 `'idle'`**：AI 候选在**回合结题挂点**（`chat-result` `variant='done'` `sidepanel.ts:4168-4184` / `'error'` `:4102-4107`）产出；**不新增触发词**（`DRIVER_TIMINGS` **恰 5** 不动） | `driver-timings` DT-2/DT-3 绿（恰 5 + 旧 4 逐字）；反证「新增第 6 触发词 ⇒ 必红」 | P0 |
| **FR-ADN-011** | **载体 = 既有 `chat-result` 载荷的 type-only 加法字段**（承 `ARBITRATION_RESULTS` 先例）：AI 候选作为 payload 字段（**非消息 kind**）随既有 `chat-result` 回面板；**候选 `{opId,label,ref?,params?}` 结构化** | `KIND_SET` **40** 逐字 / 12 kind / 零宿主不动；载荷加法字段出现在**真源**可判 | P0 |
| **FR-ADN-012** | **候选结构完整**：每条候选含 `opId`（必填）+ `label`（显示文本）+ 可选 `ref` / `params`；缺失 `opId` ⇒ 视为非法（走校验链第 ① 道） | 结构断言 + 缺 `opId` 反证 ⇒ 必拦 | P0 |
| **FR-ADN-013** | **产出者声明（留痕三要素）**：AI next 候选驱动者 id **显式声明**并入 `DRIVER_DECLS_SRC`（`driver=<id> \| timing=idle \| evidence=<字段名>`）；**零明文**（只含字段名） | DQ-1/DQ-3 绿（`DRIVER_DECLS_SRC` ↔ `builtinProviders()` 双向包含）；留痕逐行断言 | P0 |
| **FR-ADN-014** | **`ai-next` provider 登记**：新增 provider `ai-next`（`rule: 'ref-action'` 规则位）——AI 候选在场时**优先于**确定性 `ref-action`（**同规则位竞争，不新增第 5 规则位**）；**不新增 op / 不新增动作**（`ACT_TO_OP` 仍恰 6 行） | provider 注册可判 + `NEXTSTEP_PRIORITY` **恰 4** 不动 + `ACT_TO_OP` 6 行不动 | P0 |
| **FR-ADN-015** | **注入槽登记**：`RecommendInput` / `NextCtx` 新增「AI 候选」**加法字段**并登记 `CTX_FIELD_SERVICE`（DT-6）；注入面**纯数据**（不触达网络 / `chrome` / 时钟） | `driver-timings` DT-6 绿；`recommend.ts` 仍 **pure**（F-1/F-2 判据不动） | P0 |
| **FR-ADN-016** | **解析 + 校验位置 = SW 侧（B 列优先）**：LLM 输出的结构化候选在 `background` 侧解析 + 校验（SW 已持有 `shared/op-table.ts` 镜像，F-8）；面板只接收**已校验**候选并渲染 | 归因表可判（解析 / 校验在 B 列）；panel `sidepanel.js` A 列增量如实分列（§5.12.1） | P0 |
| **FR-ADN-017** | **零新 LLM 调用**：AI 候选**复用刚结束回合的 LLM 输出**（不新增网络 / 不新增成本面）；**FR-CHAT-060 不破** | `recommendation-sources` ④「源码不含 `fetch(`/`chrome.`/`Date.now`」保持绿；反证「在 `recommend.ts` 加 `fetch(` ⇒ 必红」 | P0 |
| **FR-ADN-018** | **载荷只增不改**：既有 `chat-result` 字段（`variant`/`text`/`retrying`/`tool`/`ok`/`ms`/`targetSelector`）**逐字保留**；新字段**缺席时**面板行为与现状逐字一致 | 字段穷举对比 + 「新字段缺席 ⇒ 现状行为」断言 | P0 |
| **FR-ADN-019** | **未配置 ⇒ 无候选产出**：未配 LLM 时**不产生** AI 候选（零产出、零网络）；面板走纯确定性 | 反证「未配置却产出 AI 候选 ⇒ 必红」；未配置路径无网络调用断言 | P0 |

### 5.3 VERIFY — AI 候选校验链（**核心 2 / 安全最高危**，叶1）

> **顺序即语义优先级**（discovery §7.3）：① opId 在册 → ② 三档清分 → ③ ref 有效 → ④ param 在 schema 内 → ⑤ 越界/非法丢弃 + 留痕。**校验先于任何候选接受**。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-020** | **① opId 在册**：`opId` 必须 ∈ 注册表 **9 op**（`OP_IDS` / `opDescriptor`）；未知 op ⇒ **拒绝 + 留痕**（复用 `unknown-op` 词表） | 反证「幻觉 op（如 `op.ghost`）⇒ 必拦 + `blocked=unknown-op` 留痕」 | P0 |
| **FR-ADN-021** | **② 三档清分（复用 `tierOf` 单源）**：档位**必须**取自 `tierOf`（`op-table.ts:158`），**零手写档位表 / 零第二阈值**；`OP_TIER_TABLE` 只作物化（供源文本抽取） | 反证「第二份档位表 ⇒ 必红」；`op-three-tier` 判据不降 | P0 |
| **FR-ADN-022** | **②' `gesture` 恒拒绝（连提案都拒）**：`op.authorize` / `op.perm.request` 的 AI 候选**既不提案也不可见** | 反证「AI 产 `op.authorize` 候选 ⇒ 必拦 + `blocked=tier`」；特权 op 不进 chips 断言 | P0 |
| **FR-ADN-023** | **②'' `confirm` 可提案（consent 须用户答）**：`op.llm-config` / `op.revoke` 的 AI 候选**可见可点**，但提交后**必须**走入既有 consent 卡由用户作答；**AI 不可代答 / 不可自动按下** | 反证「AI 代答 confirm consent ⇒ 必红」；`confirm` 候选渲染 + consent 卡可达断言 | P0 |
| **FR-ADN-024** | **③ `ref` 存在且有效**：候选若带 `ref`，该引用必须**存在且有效**（读既有 `ref-store` 事实，**零新真值源**）；不存在 / 已失效 ⇒ **拒绝 + 留痕** | 反证「越界 ref（不存在 / 已失效）⇒ 必拦 + 留痕」；引用判定 3 结果语义不变 | P0 |
| **FR-ADN-025** | **④ `param` 在 op 参数 schema 内**：候选 `params` 必须落在该 op 的 `params: AskSpec`（`definition.ts:101-104,152`）内；越界 ⇒ **拒绝 + 留痕** | 反证「param 越界 ⇒ 必拦」；`AskSpec` 比对可判 | P0 |
| **FR-ADN-026** | **⑤ 越界 / 非法 ⇒ 丢弃 + 留痕（不静默接受 / 不死端）**：非法候选**丢弃**并写**可读行**（复用 `blocked=<reason>` 形态，**零明文**）；用户可见「该建议被拦」而非「点了没反应」 | 四类非法（幻觉 op / 越界 ref / `gesture` op / param 越界）各有一条可读留痕 + 非法候选**不渲染为 chip** | P0 |
| **FR-ADN-027** | **校验链顺序即语义优先级**：① 未过则不进入 ②；② `gesture` 拒则不进入 ③④；**先 opId 后档位后 ref/param**（避免对未知 op 做 ref/param 判） | 顺序断言（注入「未知 op + 越界 ref」⇒ 只报 `unknown-op`，不报 ref） | P0 |
| **FR-ADN-028** | **纯函数校验器（可机核）**：校验器为**纯函数**（输入 = 候选 + 既有真值事实；输出 = 接受 / 拒绝 + 原因闭集），**不依赖 LLM 输出本身**，可被 node 门禁直接调用 | 纯函数可判（无 DOM / 无时钟 / 无 IO）；门禁直接调用断言 | P0 |
| **FR-ADN-029** | **注入式反证族必须实跑**：幻觉 op / `gesture` op / 越界 ref / param 越界 / 缺 `opId` 五类注入 ⇒ **必红**（声明 `expectFailPattern`）→ 逐字节还原 ⇒ PASS | 五类反证记录（注入点 + 还原 sha256 前后相同） | P0 |

### 5.4 TIER — 三档清分闸复用与判定分层（**核心 3**，叶1；承 O-ADN-005）

> **本节的题眼 = 「判定分层而非混同」**：今天 `pressDecision` 把「非 `auto`」**一律**判 `blocked:tier`（`ai-drive.ts:70-71`）——这对「**按下**」是对的，但若直接拿它当「**候选接受**」判据，则 `confirm` 档的 AI 候选**永远可见不了**，与 discovery §7.3 的裁决（`confirm` 可提案）冲突；反过来若为了让 `confirm` 可见而把闸门放宽成「非 gesture 就放行」，`gesture` 就会与 `confirm` **混同**（特权面泄漏）。**⇒ 必须引入第二层判定（接受层），且两层共享同一档位单源 `tierOf`。**

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-030** | **「候选接受判定」与「按下判定」显式分层**：新增**候选接受判定** `admitCandidate(candidate) → {ok:true} \| {ok:false, blocked:'unknown-op'\|'tier'\|'ref'\|'param'}`；**按下判定** `pressDecision` **语义不动** | 两判定各自纯函数可判；同 `confirm` 候选：`admit=ok` ∧ `press=blocked:tier`（分层可判） | P0 |
| **FR-ADN-031** | **`pressDecision` 语义 diff = 0**：`tierOf(d) !== 'auto'` ⇒ `blocked:tier` **保持**（按下层正确语义 = 只有 `auto` 可自动按下）；`unknown-op` / `driver-class` / `unconfigured` / `busy` / `not-armed` / `guard` 顺序与取值**逐字不动** | `op-wiring` ⑦「逐档拒绝」判据**不删**且绿；反证「`confirm` 被放行自动按下 ⇒ 必红」 | P0 |
| **FR-ADN-032** | **接受判定档位规则（真值表）**：`auto` ⇒ **接受**；`confirm` ⇒ **接受（提案）**；`gesture` ⇒ **拒绝**；未知 op ⇒ **拒绝** | 三档 + 未知四情形逐一断言（真值表可判、非恒真） | P0 |
| **FR-ADN-033** | **两判定共享 `tierOf` 单源**：接受判定与按下判定**必须**读同一个 `tierOf`；**零第二档位表 / 零第二阈值**（`hasConsent` 由 `op-three-tier` 与 `IMPL` 同步） | 反证「第二份档位定义 ⇒ 必红」；`op-three-tier` 绿 | P0 |
| **FR-ADN-034** | **`confirm` 候选的点击路径**：`confirm` 候选渲染为 chip，点击经**既有** `dispatchChipAction` 入既有 op 管线（→ 既有 consent 卡 / 既有执行体）；**不新增执行体 / 不绕过 consent** | 端到端：`confirm` chip 点击 ⇒ consent 卡可达；`capability-wiring` 绿 | P0 |
| **FR-ADN-035** | **分层可判（判据非恒真）**：必须存在一条**可机核**情形证明「接受 ≠ 按下」（`confirm` 情形 `admit=true ∧ press=false`），且**不得**把 `gesture` 与 `confirm` 混同（`gesture` 连接受都拒） | 分层判据 + 反证「把 `confirm` 也拒（退回混同）⇒ 必红」/「把 `gesture` 放行 ⇒ 必红」 | P0 |

### 5.5 FALLBACK — 确定性退居兜底与安全闸（**核心 4**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-040** | **注册表 = 兜底与安全闸**：未配 LLM / AI 未产出 / AI 候选全部被拦 ⇒ **确定性注册表产卡**（`ref-action` 确定性候选 + 终端） | 三情形逐一断言「确定性候选出现」；反证「删兜底 ⇒ 无候选」 | P0 |
| **FR-ADN-041** | **free-input 终端恒常驻（R8 保底不回归）**：任何推荐卡（含 AI 候选在场）**必须有** `.next-terminal`（恒最末；`data-act='free-input'`；非 `.next-chip`、不进 `MAX_CHIPS_PER_CARD`） | `r8-open-next-entry` / `free-input-next` 判据绿；反证「删终端 ⇒ 必红」 | P0 |
| **FR-ADN-042** | **floor 语义保持**：`suppression === 'empty'` 且终端在场 ⇒ 铸「仅含终端」最小卡（`terminal:true`）；`safety`（候选全被 deny）**不走 floor**（fail-closed 不变） | `recommendNextStep` floor 判据不降；反证「`safety` 走 floor ⇒ 必红」 | P0 |
| **FR-ADN-043** | **未配 LLM ⇒ 纯确定性（现状逐字）**：不产出 AI 候选、不新增网络 / LLM 面；候选来源 = 确定性注册表（逐字不变） | 「未配路径行为 = 现状」对比断言；零网络调用断言 | P0 |
| **FR-ADN-044** | **AI 化不得制造零 next 死端**：任何一条路径（AI 失败 / 非法 / 超时 / 未产出）都**必须**有可达 next（含终端） | `no-dead-end` **只增必绿**；反证「构造 AI 失败且兜底缺失 ⇒ 必红」 | P0 |
| **FR-ADN-045** | **兜底判据可判（非恒真）**：兜底存在性判据**不得恒真**（须能 FAIL）；注入「删兜底 / 删终端」⇒ 必红 | 兜底反证记录；判据非恒真机核 | P0 |
| **FR-ADN-046** | **在飞（`pending`）语义不变**：在飞时 `recommendNextStep` **不产卡**（`recommend.ts:488` 硬门保持）；AI 候选在**结题后**（`pending=false`）产出；在飞时 AI 候选**不显示**（与既有仲裁一致） | `pending` 硬门判据不降；反证「在飞产卡 ⇒ 必红」 | P0 |

### 5.6 MERGE — AI / 规则候选合并口径（**核心 5**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-050** | **同台竞争同一单卡位**：AI 候选与规则候选竞争**同一单卡位**（`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` **不动**） | 单卡判据绿；反证「同时两卡 ⇒ 必红」 | P0 |
| **FR-ADN-051** | **多候选取前 N（≤3）**：AI 一次产出多条候选 ⇒ 按 AI 给出的顺序取前 N；**N ≤ `MAX_CHIPS_PER_CARD` = 3**；超出**截断**（不溢出、不新增卡） | 反证「产 5 条 ⇒ 渲染 ≤3 条且不新增卡」；截断判据可判 | P0 |
| **FR-ADN-052** | **`NEXTSTEP_PRIORITY` 恰 4 不动**：AI 候选**不占第 5 规则位**（骑既有 `ref-action` 规则位，同规则内 AI 优先）；规则表逐字不变 | `recommendation-sources` 规则表判据绿（恰 4 逐字）；反证「新增第 5 规则 ⇒ 必红」 | P0 |
| **FR-ADN-053** | **R6 同因去重扩展覆盖 AI 候选**：`refActionDigest` / `completedActions` 家系**纳入** AI 候选（刚完成的同 digest 动作**不得**再由 AI 推荐） | 去重判据扩到 AI 家系；反证「去掉 AI 去重 ⇒ 同 digest 复推 ⇒ 必红」 | P0 |
| **FR-ADN-054** | **单卡 / 3-chip / 密度不破**：`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` / `MAX_CHIPS_PER_CARD = 3` / 卡可点 ≤6 / 密度阈值 **7/15 · 9/20 · 17/35** 逐字不动 | 密度门禁绿；阈值常量逐字未变 | P0 |
| **FR-ADN-055** | **替换口径可判**：AI 候选在场 ⇒ 陈旧的确定性 `ref-action` chip（如「用引用 1 做原地翻译」）**不再出现**（被 AI 候选占位）；AI 候选缺席 ⇒ 确定性候选**照旧** | 双向判据（AI 在场 ⇒ 无陈旧 chip；AI 缺席 ⇒ 陈旧 chip 在）；反证双向 | P0 |
| **FR-ADN-056** | **渲染零 per-op 分支**：AI 候选 chip 的分发依据 = **opId**（`data-op`，经 `ACT_TO_OP` / `OP_TO_ACT` 单源派生）；`dispatchChipAction` **仍然**是一次查表（**零 per-op 分支**） | `next-dispatch-diff0` 判据绿；反证「加 per-op 分支 ⇒ 必红」 | P0 |

### 5.7 GUARD — 护栏、预算与关断偏好（**核心 6**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-060** | **AI 候选同样过六常量**：频次 6/10min · 同因去重 · 静默 60 s · 冷却 10 s · 链深 2 · 回合预算 8 —— 复用 `guard.ts` **单源**（零第二阈值） | `proactivity-guard` 判据不降；AI 候选经同一 `verdict` 断言 | P0 |
| **FR-ADN-061** | **「提案」不消耗回合预算**：AI 候选产出（显示）本身**零额外 LLM 调用** ⇒ **不**记账 `noteProactive`；**只有自动成回合**（`pressCandidate` 成功）才消耗预算（`noteProactive` 语义不变） | 记账断言：「产出候选 ⇒ 预算不变」+「自动成回合 ⇒ 预算 −1」；反证双向 | P0 |
| **FR-ADN-062** | **关断偏好涵盖 AI next**（X-ADN-11）：`web-cli:proactive`（默认 ON）**一处偏好**同时涵盖 AI 候选的**显示**与**自动按下**；关断后主题①（确定性）仍工作 | 关断判据两相（显示相 + 按下相）可判；反证「关断后仍显示 / 仍自动按下 ⇒ 必红」 | P0 |
| **FR-ADN-063** | **零第二阈值**：`ai-drive` / 校验器 / 合并器**不得**自带频次 / 预算常量；越限一律经注入判据（`guardAllowed` / `busy`） | 源码扫描「无第二份六常量」；反证「加第二份阈值 ⇒ 必红」 | P0 |
| **FR-ADN-064** | **自动按下路径 diff = 0**：AI 候选的自动按下仍经**既有** `pressCandidate` → `dispatchChipAction`（恰 1 处）→ `op.turn` 槽；`requestTurn(` **恰 1** | `op-wiring` ⑦ 判据绿；反证「AI 路径直连 `requestTurn` ⇒ 必红」 | P0 |
| **FR-ADN-065** | **在飞仲裁保持**：AI 候选的自动成回合撞车 ⇒ `blocked:busy`（**不排队**）；SW 有界队列 `ai-deferred` / `executed` / `queued` / `busy-rejected` 四值**逐字不动** | `turn-arbitration` 判据不降；`ARBITRATION_RESULTS` 逐字未变 | P0 |

### 5.8 OPEN — 首开（open / ready）边界（**核心 7**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-070** | **首开保持确定性**：`maybeRecommendOpenEntry`（`sidepanel.ts:2279-2286`）在 `authorized ∧ configured` 时仍走**确定性**路径（free-input 终端 + capability-discovery）；**不**由 AI 产初始 next | 首开判据绿（终端在场；无 LLM 依赖）；反证「首开走 AI ⇒ 必红」 | P0 |
| **FR-ADN-071** | **首屏零 LLM 往返依赖**：首屏可达性**不**依赖网络 / 延迟；首开入口复用既有 `'idle'`（R8-2 逐字） | R8 入口判据不降；「无网络 ⇒ 首屏仍有终端」断言 | P0 |
| **FR-ADN-072** | **让位 firstRun 语义保持**：`firstRunCard.visible === !(configured ∧ authorized)`（零双卡）逐字不动；AI 候选**不**改变首开让位 | 零双卡判据绿 | P0 |
| **FR-ADN-073** | **AI 初始 next 明列后续轮**：本 Feature **不做**首开 AI 化；若后续做须保留确定性兜底 + 超时降级（登记为 `PD-ADN-001`） | NG-ADN-014 有承载；PD-ADN-001 登记 | P0 |

### 5.9 S0''' — 首验收场景机器化（**地位 = F-35 之 S0'' / F-34 之 S0′ / v5.5 之 S0**）

> **本 Feature 的首验收场景（对作者裁决的机核化）**：**已配 LLM ⇒ 回合结题时 AI 结构化产出 next 候选（如「改建架构图 / init 新建图 / 切换示例」）⇒ 经 5 道校验 ⇒ 注入 chips（替代陈旧的「用引用 1 做原地翻译」）**；**未配 LLM ⇒ 纯确定性兜底**；**任何路径 free-input 恒在**。

**场景（四支线：已配置 AI 合法 / AI 非法被拦 / AI 未产出 / 未配置；逐环节）**

```
【S0''' 已配置 LLM · 主线（AI 产出合法）】
回合结题（chat-result variant='done'，openAsks===0）
  → SW 解析 LLM 结构化 next 候选（复用刚结束回合的输出；零新增 LLM 调用）
  → 5 道校验：① opId 在册 → ② 三档清分（gesture 恒拒）→ ③ ref 有效 → ④ param 在 AskSpec 内 → ⑤ 越界拒+留痕
  → 接受候选经既有 chat-result 载荷加法字段（type-only）回面板
  → 面板注入注入槽 → ai-next provider 占 ref-action 规则位
  → chips（≤3）显示 AI 候选（如「改建架构图 / init 新建图 / 切换示例」）
     替代陈旧的确定性「用引用 1 做原地翻译」
  → free-input 终端恒常驻（恒最末）
  → 点 chip ⇒ 经既有 dispatchChipAction（data-op 单源）；auto 档 AI 可自动按下（过六常量）

【S0''' 已配置 LLM · 支线 B（AI 产出非法被拦）】
非法候选（幻觉 op / 越界 ref / gesture op / param 越界）⇒ 丢弃 + blocked= 可读留痕
  → 注册表兜底（ref-action 确定性候选）+ free-input 终端

【S0''' 已配置 LLM · 支线 C（AI 未产出）】
无 AI 候选 ⇒ 注册表兜底（现状逐字）

【S0''' 未配置 LLM · 支线 D（纯确定性）】
零 AI 候选产出（零网络）⇒ 确定性注册表 + free-input 终端（现状逐字）
```

| 步 | 环节 | 机核断言 |
|:-:|---|---|
| S0'''-1 | 已配置 ⇒ 结题产出结构化候选 | 候选结构 `{opId,label,ref?,params?}` 可判（注入式样本） |
| S0'''-2 | **AI 候选 opId 在册且非 `gesture`** | 每条接受候选 `opId ∈ OP_IDS` ∧ `tierOf ≠ gesture` |
| S0'''-3 | **非法候选被拦 + 留痕** | 幻觉 op / 越界 ref / `gesture` op / param 越界 **四类各** `admit=false` + 可读 `blocked=` 行（零明文） |
| S0'''-4 | **接受候选注入 chips（替代陈旧候选）** | AI 候选在场 ⇒ 陈旧 `ref-action` chip 不出现；chips ≤3；单卡 |
| S0'''-5 | **free-input 恒在（兜底不回归）** | 任意支线推荐卡均有 `.next-terminal`（恒最末） |
| S0'''-6 | **未配 LLM ⇒ 纯确定性** | 零 AI 候选产出 + 确定性候选 + 终端 |
| S0'''-7 | **零新增载体** | `KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字 |
| S0'''-8 | **判定分层** | `confirm` 候选：`admit=true` ∧ `press=blocked:tier`；`gesture`：`admit=false` |
| S0'''-9 | **提案不耗预算** | 产出候选后回合预算不变；自动成回合后 −1 |
| S0'''-10 | **留痕三要素 + 零明文** | `driver=<id> \| timing=idle \| evidence=<字段名>`；不含候选 label / params 值 |

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-080** | **S0''' 全链机器化**：上表 S0'''-1~10 逐步可判（node 面 + Chromium 面双面），样本单源 | 双面全绿；**Chromium 面只在既有 `s0-self-driven.mjs` 加断言不加文件** | P0 |
| **FR-ADN-081** | **已配置主线机核（四条硬断言）**：① AI 候选 opId 在册且非 gesture ② 非法候选（幻觉 op / 越界 ref / gesture op / param 越界）被拦 + 留痕 ③ free-input 恒在（兜底不回归） ④ 未配 LLM ⇒ 纯确定性兜底 | 四条各自可判 + 各自反证 | P0 |
| **FR-ADN-082** | **注入反证族（必须实跑）**：AI 产 `gesture` op 候选 ⇒ **必拦**；幻觉 op ⇒ **必拦**；删兜底 ⇒ free-input 缺失 ⇒ **必红**；AI 代答 `confirm` consent ⇒ **必红** | 四条反证记录（注入点 + `expectFailPattern` + 逐字节还原 sha256） | P0 |
| **FR-ADN-083** | **Chromium 面只加断言不加文件**：S0''' 的 Chromium 面走既有 `test/ui/s0-self-driven.mjs`；`CHROMIUM_GATES === 9` **不动** | 门禁计数 = 9；断言增量如实登记 | P0 |
| **FR-ADN-084** | **人工面如实登记**：真机观感 / 「两张皮是否消失」体感 / 读屏等 headless 不可合成项逐项标注 `⏳ 未执行`，**不冒充 PASS** | §9.4 人工面清单；无 `PASS` 冒充 | P0 |
| **FR-ADN-085** | **判据禁恒真 + 真源切片**：S0''' 判据**不得**恒真（须能 FAIL）；真源 = 生产源码 + 生产注册表（**不得**读测试自建常量 / 自我裁决） | 每条判据有双向反证 + 三段控制（`ok`/`violated`/`n/a`） | P0 |

### 5.10 SUPERSEDE — X-ADN-1~11 显式取代（**判据等价重锚，不是放宽**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-090** | **X-ADN-1** next 推荐 = 确定性内核独占产出 → **AI 驱动产出候选 + 确定性注册表退居兜底与安全闸**（**产出权转移**，old→new 台账 + 理由 + 日期 + 落点） | FR-ADN-010~056 + 台账条目 + 作者裁决引用 | P0 |
| **FR-ADN-091** | **X-ADN-2** `recommendation-sources` ④「零新增网络 / LLM 面」→ **保持**（候选经注入槽 ⇒ `recommend.ts` 仍 pure）；登记为**「未发生取代」**（仅当 plan 证明确需在 `recommend.ts` 触达 AI ⇒ 显式取代 + 台账） | ④ 判据绿 + 台账 `no-supersession` 行 | P0 |
| **FR-ADN-092** | **X-ADN-3** `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` → **保持**（登记「未发生取代」） | 单卡判据绿 + 台账行 | P0 |
| **FR-ADN-093** | **X-ADN-4** `NEXTSTEP_PRIORITY` 恰 4 → **保持**（AI 骑 `ref-action` 位；登记「未发生取代」+ 若 plan 证必要则显式取代的路径注明） | 规则表判据绿 + 台账行 | P0 |
| **FR-ADN-094** | **X-ADN-5** 时机源恰 5 → **保持**（复用 `'idle'`；登记「未发生取代」） | DT-2/DT-3 绿 + 台账行 | P0 |
| **FR-ADN-095** | **X-ADN-6** `maybeRecommend` 调用点恰 8 / `nextAfterSettle` 1 定义 10 调用点 → **等价重锚**（若新增调用点 ⇒ 计数只增 + 说明；`requestTurn(` 恰 1 不动） | `op-wiring` 判据 + 反证；台账 old→new | P0 |
| **FR-ADN-096** | **X-ADN-7** `DRIVER_DECLS_SRC` ↔ `builtinProviders()` **双向包含 11↔11** → **12↔12**（新增 `ai-next` 声明行；`evidence` 与 `when` 同源；旧 11 行逐字保留） | DQ-1/DQ-3 绿 + 注入反证（缺声明 / 多声明 ⇒ 必红） | P0 |
| **FR-ADN-097** | **X-ADN-8** R6「完成后同动作去重」= `refId#意图摘要` → **扩展覆盖 AI 候选**（**已发生**） | FR-ADN-053 判据 + 台账 | P0 |
| **FR-ADN-098** | **X-ADN-9** `RECOMMEND_MODULE_WHITELIST` 恰 5 模块 → **保持**（若新增导入 ⇒ 等价重锚；登记「未发生取代」） | `recommendation-sources` 模块白名单判据绿 + 台账行 | P0 |
| **FR-ADN-099** | **X-ADN-10** floor = 「仅含 `free-input` 终端」最小卡 → **重锚**（AI 候选进入推荐语义后终端仍恒常驻；floor 语义不变） | FR-ADN-041/042 判据 + 台账 old→new | P0 |
| **FR-ADN-100** | **X-ADN-11** 关断偏好 `web-cli:proactive` 只涵盖「AI 主动回合」→ **扩展涵盖 AI next 候选（显示 / 自动按下）**（**已发生**） | FR-ADN-062 判据 + 台账 | P0 |
| **FR-ADN-101** | **未发生的取代如实登记「未发生」**：任何 X-ADN 项若在 plan 评估后确认不需要取代 ⇒ **显式登记「未发生」+ 理由**，**不得留空 / 不得伪造**；取代台账与判据重锚**同轮完成**，不得拆到「下一轮补」 | §12 每行有「已发生 / 未发生」状态；台账条目与 X 项一一对应 | P0 |

### 5.11 GATE — 门禁等价重锚与台账（**核心 8**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-110** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 各门禁前后计数对账表（§9.5）无减少项 | P0 |
| **FR-ADN-111** | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | 每个新增 / 重锚判据附反证记录（注入点 + 还原 sha） | P0 |
| **FR-ADN-112** | **取代台账登记**：X-ADN-1~11 逐条落 `docs/*-supersession-ledger.json`（或等价台账），含 `knownGap` 一致性；**老台账条目（v3/v4/v5/v5.5/F-34/F-35）一律保留不动** | 台账新增条目 + 一致性门禁绿 | P0 |
| **FR-ADN-113** | **保护段处置**：journey **`[43484,59347)` / sha `7b309258…` / 249 行** + binding **`[107780,115930)` / sha `be9ad0e9…`** 逐段决策（`keep` / 八步显式取代）；**若取代 ⇒ 走八步 + 哈希变更 old→new + 理由 + 日期台账留痕**；若 `keep` ⇒ **字节中立**（段前等长补偿 ⇒ 双绿）；**禁静默改写** | 保护段门禁绿；八步记录或字节中立证明齐备 | P0 |
| **FR-ADN-114** | **门禁逐一处置清单（禁漏项）**：**新增 1**（`ai-next-candidate`：校验链纯函数 + 注入反证 + 真源切片）+ **升级 6**（`recommendation-sources` ④ 零新 LLM / `NEXTSTEP_PRIORITY` 恰 4 / `DRIVER_DECLS_SRC` 双向包含 11↔11→12↔12 / `op-wiring` 计数 / R6 同因去重扩展 / `driver-timings` 恰 5）+ **保留**项；每条给出「保留 / 等价重锚 / 显式取代（+台账）」三态之一 + old→new 定位 | §9.5 处置表齐备且三态齐；无「未处置」项 | P0 |
| **FR-ADN-115** | **新增门禁登记**：新 node 门禁 `test/ai-next-candidate.test.ts` 纳入 `gate-integrity` 受审集合（下界**只增**）；**不新增 Chromium 门禁文件**（`CHROMIUM_GATES === 9` 不动） | `gate-integrity` 绿 + 下界 = 前值 + 1；Chromium 计数 = 9 | P0 |
| **FR-ADN-116** | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile）；`KL-N-10` 处置 = 首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口** | 执行记录 + `gate-integrity` 绿 | P0 |
| **FR-ADN-117** | **双面镜像门禁保持**：`shared/op-table.ts` 与 SW 侧 `SW_OPS` 双面一致性判据（`sw-op-mirror`）**不降级**；AI 校验链读同一单源 | `sw-op-mirror` 绿；反证「双面漂移 ⇒ 必红」 | P0 |

### 5.12 VOL — 体积分列预算

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-ADN-120** | **分列预算**：明列 **A 列（`dist/sidepanel.js`，计入账本）** / **B 列（`dist/background.js`，不计入 sidepanel 账本）** / **C 列（冻结面）**；**逐叶分列**（adn-1 通道 + 校验链 / adn-2 兜底 + 合并 + 门禁重锚）；给出上下界 + 15% 缓冲（§5.12.1 表） | 预算表逐格可核（含 15% 缓冲列）；**先预算后落地** | P0 |
| **FR-ADN-121** | **距档结论**：A 基线 **598,926 B** · 距档 **15,474 B**（档位 614,400）· 生效上限 `floor(598,926 × 1.05) = `**`628,872`**；给出「**不触发升档**」结论与余量；同时按 **v5 历史低估 2.8×** 给最坏情形 ⇒ **预置升档 EC 路径** | §5.12.1 两行结论（正常口径 / 2.8× 最坏口径）；EC-ADN-016 已登记 | P0 |
| **FR-ADN-122** | **冻结面零容差**：`content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** —— 逐字节 / 逐字不变（量值 + sha 双锚） | 构建后 `stat` + sha256 前后一致；冻结面判据绿 | P0 |
| **FR-ADN-123** | **越限路径 = EC 显式路径 + 作者一行**：若实测越**生效上限**（`floor(baseline × 1.05)`）⇒ 显式重登记基线（同源前移）；若越**档位 614,400** ⇒ 走 EC 显式升档路径 + **作者一行**；`authorConfirmation` **不得**伪称已确认 | EC-ADN-016 逐分支；`authorConfirmation` 读值断言 | P0 |
| **FR-ADN-124** | **每叶收口实测重登记**（不等两叶合计）：**五要素**（前后值 / 日期 / 来源 / 理由 / 历史保留）+ **三值**（`newBaselineBytes` / `absoluteCeilingBytes` / 生效上限）同源前移；**B 列增量不计入 sidepanel 账本**（如实标注列别） | 逐叶登记条目存在；五要素齐备；算术机核绿 | P0 |
| **FR-ADN-125** | **预算不得跨列混算规避**：**不得**为绕门禁把 A 列改动搬进 / 搬出 sidepanel（归因必须逐模块）；B 列改动如实标注「不计账」 | 落地归因表（逐模块 → 产物）；反证「把 A 列改动搬 B 列规避 ⇒ 必红」 | P0 |

#### 5.12.1 体积分列预算表（**spec 阶段先出，禁止未预算先排落地**）

**统一前提（本轮只读复核，§2.4B）**：A 基线 **598,926 B** · 生效上限 `floor(598,926 × 1.05) = `**`628,872`** B（余量 **29,946 B**）· **档位 614,400 B**（**距档 15,474 B**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（**未闭合义务**）· **B 列（`dist/background.js`，1,636,621 B）不计入 sidepanel 账本**。

| 列 | 产物 | 叶1（adn-1 通道 + 校验链）落地项 | 叶2（adn-2 兜底 + 合并 + 重锚）落地项 | 计入账本 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | `chat-result` 载荷加法字段解析接线 + 注入槽（`RecommendInput`/`NextCtx` 加字段）+ `ai-next` provider 注册（`providers.ts`）+ 候选渲染**复用既有 `nextstep`**（零新渲染面）+ 三档接受判定接线（薄） | 兜底 / 合并接线 + **替换口径**（AI 在场遮确定性候选）+ R6 去重扩展 + 关断偏好接线 + 重锚（`op-wiring` / `driver-timings` / `driver-quadruple` 断言）+ 门禁对账 | ✅ |
| **B** | `dist/background.js` | **解析 + 5 道校验链主体**（SW 侧；复用 `shared/op-table.ts` 镜像）+ 留痕（`blocked=` 行）+ 载荷字段装配 | **校验链接线终态** + 非法留痕接线 + 与既有 SW 队列仲裁的让步口径（零逻辑改动） | ❌（不计账） |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1（adn-1） | 叶2（adn-2） | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增）** | **+0.8 ~ +2.0 KB**（薄接线：载荷解析 + 注入槽 + provider + 渲染复用） | **+0.5 ~ +1.5 KB**（兜底 / 合并 / 去重接线 + 重锚） | **+1.3 ~ +3.5 KB** | **+1.5 ~ +4.0 KB** | **距档 15,474 B ⇒ 正常口径下不触发升档**（亦远未越生效上限 29,946 B） |
| **B 列（background.js，不计账）** | **+1.5 ~ +3.5 KB**（解析 + 校验器 + 留痕） | **+0.5 ~ +1.5 KB**（终态接线） | **+2.0 ~ +5.0 KB** | — | **不计入 sidepanel 账本**（B 列优先正是为旁路档位压力；如实标注列别） |
| **v5 历史低估系数 2.8× 最坏情形（A 列 Σ 上界 3.5 KB）** | — | — | **≈9.8 KB** | **≈11.3 KB** | **仍 < 15,474 B ⇒ 即使 2.8× 低估也不触发升档**（**预置 EC-ADN-016 显式升档路径 + 作者一行**以防实测越界） |

> **口径与纪律**：① 上表为 **spec 阶段估算（非承诺）**；② **每叶收口实测重登记**（FR-ADN-124），不得以估算充当实测；③ **B 列优先**的唯一理由 = 旁路 sidepanel 档位压力（距档仅 15,474 B），**不得**把它读成「B 列无成本」；④ **不得**把 B 列改动搬进 A 列 / 把 A 列搬出以绕开门禁（FR-ADN-125）；⑤ 升档须走 EC-ADN-016 + **作者一行**（**未闭合义务不得伪称已确认**，N-ADN-013）。

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| **NFR-ADN-001** | 性能/体积 | `dist/sidepanel.js` ≤ 生效上限 `floor(baseline × 1.05)`；**判定 = 公式唯一**（`SIDEPANEL_CEILING_CAP` 保持 `record-only`） | `size-baseline` / `size-ruling-vol3` 绿；实测 ≤ 上限；越限走 EC-ADN-016 |
| **NFR-ADN-002** | 安全 | 特权 op（`op.authorize` / `op.perm.request`）**恒 `gesture`**；AI 候选**既不提案也不按下**（连可见都拒） | 注入必红（`gesture` 候选 ⇒ 必拦）+ `op-three-tier` / `capability-wiring` 绿 |
| **NFR-ADN-003** | 安全 | consent / `gesture` **不得**被 AI 代答 / 代填 / 自动提交（含 `confirm` 档候选） | 注入必红（AI 代答 `confirm` consent）；红线⑥精神保持 |
| **NFR-ADN-004** | 安全 | 法八**四面零明文不退化**（流内 payload / digest / 审计 / DOM value 与全部属性）；候选 `label` / `params` / 留痕**不回显值** | `law8-plaintext` 断言全绿、**零降级** |
| **NFR-ADN-005** | 安全 | `packages/web-cli-base/**` **零 diff**；判定链（`policy.ts` / `auto-authorize.ts`）**零触碰**（`zeroDiffFiles` 9 项哈希 pin 不变） | `insight-no-escalation` 绿 + `zeroDiffFiles` 机核绿 |
| **NFR-ADN-006** | 安全 | 校验链**不得放松**任何既有 fail-closed 方向（引用判定 3 结果 / 档位语义 / `safety` 抑制） | 反证族逐条；`ref-validity` 3 结果 / `tierOf` 语义不变 |
| **NFR-ADN-007** | 兼容 | **零新增载体**：`KIND_SET` **40** / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` / `ACT_TO_OP` 6 行 | `messaging` / `stream-model` / `host-registry` / `next-dispatch-diff0` 断言绿 |
| **NFR-ADN-008** | 兼容 | `recommendNextStep` 保持 **pure**（无 DOM / 时钟 / IO / `chrome`）；真值白名单 7 / 模块白名单 5 不动 | `recommendation-sources` 判据绿（含 ④ 零网络） |
| **NFR-ADN-009** | 可机核 | **校验器可机核**：纯函数 + 双向反证 + 注入必红 + **三段控制禁恒真** + 真源切片 | `test/ai-next-candidate.test.ts` 全绿 |
| **NFR-ADN-010** | 可用性 | **零死端**：任何路径（未配 / AI 失败 / 非法被拦 / 未产出）均有可达 next（含 free-input 终端） | `no-dead-end` **只增必绿** |
| **NFR-ADN-011** | 兼容 | **在飞不产卡**（`pending` 硬门）不退化；AI 候选不绕过 `pending` / `priority` / `safety` | `recommend.ts` 四闸判据绿 |
| **NFR-ADN-012** | 环境/纪律 | 门禁**严格串行**；**无新依赖**；**不改** `.opencode/opencode.json`；`F-29` 区段一字不动 | 执行记录 + §16 纪律表逐条 |
| **NFR-ADN-013** | 可维护 | **扩展点固定 / 单源**：一个 `ai-next` provider + 一个注入槽 + 一个校验器 + 一个档位单源（`tierOf`）；第二份档位 / 第二 provider 入口 ⇒ FAIL | 反证：第二校验器 / 第二档位表 / 第二 provider 入口 ⇒ 必红 |
| **NFR-ADN-014** | 可判 | **判定分层可判**：`confirm` 情形 `admit=true ∧ press=false` 有判据；`gesture` 情形 `admit=false` | 分层判据 + 双向反证 |
| **NFR-ADN-015** | 性能 | **零新增 LLM 往返 / 零新增网络**：AI 候选复用刚结束回合输出（`fetch(` / `chrome.` / `Date.now` 在 `recommend.ts` 仍零命中） | `recommendation-sources` ④ 绿 |
| **NFR-ADN-016** | 可回溯 | **留痕可判且零明文**：`driver=<id> \| timing=idle \| evidence=<字段名>` + `blocked=<reason>`；两值（AI 候选 / 手输）可判 | 留痕逐行断言；`ai-drive.ts:85` 零值纪律保持 |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| **EC-ADN-001** | **AI 幻觉 opId**（不存在于 9 op） | **拒绝 + 留痕**（`blocked=unknown-op`）；不渲染为 chip；不死端（兜底候选 + 终端仍在） |
| **EC-ADN-002** | **AI 提案 `gesture` op**（`op.authorize` / `op.perm.request`） | **恒拒绝（连提案都拒）** + 留痕（`blocked=tier`）；特权面零触达 |
| **EC-ADN-003** | **AI 提案 `confirm` op**（`op.llm-config` / `op.revoke`） | **接受为可见 chip**；点击 ⇒ 既有 consent 卡（**用户答**）；AI **不可自动按下**（`press=blocked:tier`） |
| **EC-ADN-004** | **AI 候选引用越界 ref**（不存在 / 已失效） | **拒绝 + 留痕**；引用判定 3 结果语义不变 |
| **EC-ADN-005** | **AI 候选 `params` 越界**（不在该 op `AskSpec` 内） | **拒绝 + 留痕**；不把越界值透传给 op |
| **EC-ADN-006** | **AI 产出多条候选**（如 4 条） | 按顺序取前 N（**N ≤ 3**）；超出**截断**；不新增卡 / 不越 3-chip |
| **EC-ADN-007** | **AI 未产出候选**（空） | 确定性注册表兜底（`ref-action` 候选 + 终端）；不视为错误 |
| **EC-ADN-008** | **未配 LLM** | **零 AI 候选产出**（零网络）；纯确定性（现状逐字） |
| **EC-ADN-009** | **在飞（`pending`）时结题** | `recommendNextStep` 不产卡（硬门保持）；AI 候选在 `pending=false` 后产出；在飞不显示 |
| **EC-ADN-010** | **AI 候选自动成回合撞车**（在飞） | `pressCandidate` ⇒ `blocked:busy`（**不排队**）；SW 队列 `ai-deferred` 语义不变 |
| **EC-ADN-011** | **关断偏好 OFF**（`web-cli:proactive = false`） | AI 候选**不显示**且**不自动按下**；主题①（确定性）仍工作；手输仍可用 |
| **EC-ADN-012** | **AI 候选与刚完成动作同 digest**（R6 同因） | 去重（扩展后的 `refActionDigest` 家系覆盖 AI）⇒ 不重复推荐 |
| **EC-ADN-013** | **首开 / ready（`authorized ∧ configured`）** | 保持确定性（free-input + capability-discovery；让位 firstRun）；**零 LLM 往返依赖** |
| **EC-ADN-014** | **AI 候选 label 含凭据形值 / 正文** | 仅作显示文本；**不入**流内 payload / digest / 审计 / DOM 四面（法八）；留痕只含字段名 |
| **EC-ADN-015** | **窄视口（320px）** AI 候选 chips | 不越密度阈值（7/15 · 9/20 · 17/35 逐字不动）；不水平溢出 |
| **EC-ADN-016** | **体积越限**（越生效上限 / 越档位 / 越绝对上限） | 越生效上限 ⇒ 显式重登记基线（同源前移）；越档位 ⇒ 走 EC 显式升档路径 + **作者一行**；越绝对上限 ⇒ 停止并请示作者；`authorConfirmation` **不得**伪称已确认 |
| **EC-ADN-017** | **注入第 41 个 `KIND_SET` 成员 / 第 13 种卡 kind / 新宿主** | **必红**（零新增 kind / 零宿主判据非恒真） |
| **EC-ADN-018** | **AI 代答 / 自动提交 `confirm` consent** | **必红**（`expectFailPattern` 声明 + 逐字节还原）；红线⑥精神不被新通道绕过 |
| **EC-ADN-019** | **确定性兜底被删 / free-input 终端被删** | **必红**（`r8-open-next-entry` / `free-input-next` / `no-dead-end` 判据可 FAIL） |
| **EC-ADN-020** | **门禁环境性 flake（`KL-N-10` 家族：`binding` CDP / `page-input` 陈旧 fixture / `recommendation` ④ 相位 / `s0-self-driven` ⑦A）** | 隔离复跑 ≥2、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） |

---

## 8. 开放问题

> **口径**：discovery 的 **O-ADN-001~016 已由编排器批量裁决**（D1 / D2），逐条落位见 §11，**本节不再重复列入**。下表为 **spec 阶段新识别 / 明确留待 plan 或后续轮**的开放点（`PD-ADN-0xx`），**不在本阶段预设答案**。

| # | 问题 | 为什么可以后置 | 状态 |
|---|---|---|---|
| **PD-ADN-001** | **首开 AI 化**（AI 产初始 next：问候 / 能力探测建议） | 已裁决**本轮不做**（O-ADN-010 / NG-ADN-014）；若后续做，须保留确定性兜底 + 超时降级（FR-ADN-073） | 待后续轮 |
| **PD-ADN-002** | **LLM 结构化输出的精确提示 / 协议形态**（tool-call？JSON 段？既有 `chat` 文本内约定？）与解析严格度 | 裁决已定「结构化产出 + 必须校验」（FR-ADN-011 / 012 / 028）；**提示词与解析器形态**属实现自由度，只要候选结构 + 校验链成立 | 待裁决（plan） |
| **PD-ADN-003** | **`label` 的净化 / 截断口径**（长度上限、去换行、去控制字符）与与 `stream-plaintext.label` 的关系 | 法八「零明文 / 不回显值」已定（NFR-ADN-004）；净化细则属实现自由度，且密度门禁会给出显示上界 | 待裁决（plan / 密度门禁） |
| **PD-ADN-004** | **AI 候选 `ref` 字段的语义面**（引用编号 vs `refId`）与与 F-34 引用载荷的关系 | 裁决已定「ref 必须存在且有效」（FR-ADN-024）；字段编码属实现自由度（复用既有 `ref-store` 事实即可） | 待裁决（plan） |
| **PD-ADN-005** | **AI 候选是否只在 `ref-action` 规则上下文产出**（即：无引用 / 无 ref-action 命中时是否也允许 AI 产候选） | 本轮裁决 = 骑 `ref-action` 规则位、同台争单卡位（O-ADN-008 / FR-ADN-014 / 052）；**超出该规则位的产出面**（更泛的 AI next）属扩展面，须重新评估规则位与预算 | 待裁决（plan / 后续轮） |
| **PD-ADN-006** | **AI 候选驱动者 id 的精确字面量**（如 `ai-next` vs `llm-next`）与 `evidence` 字段名 | 裁决已定「显式声明 + 三要素 + 零明文」（FR-ADN-013）；字面量属实现自由度，只要 DQ-1/DQ-3 双向包含成立 | 待裁决（plan） |
| **PD-ADN-007** | **多候选「前 N」的精确 N 与排序依据**（AI 顺序 vs 档位序 vs 与规则候选的交错） | 裁决已定「≤3 + 同单卡位」（FR-ADN-051 / 054）；N 的取值与交错细则属实现自由度（密度 / 3-chip 预算给出硬上界） | 待裁决（plan / 密度门禁） |
| **PD-ADN-008** | **`recommendation-sources` 白名单是否需为注入槽新增条目**（若注入槽落在新模块） | FR-ADN-098 裁决 = 白名单保持 5（若新增导入 ⇒ 等价重锚）；具体落点属实现自由度 | 待裁决（plan） |

---

## 9. 验收标准（总体验收清单，含门禁映射）

> **口径**：AC 为**总体验收**（可跨多条 FR）；每条有唯一 ID 且**可机核或如实标注人工面**。`⏳` = 本轮未执行（spec 阶段零运行时验证）。

### 9.1 核心验收（S0''' 四支线 / AI 候选产出 / 校验链 / 判定分层 / 兜底 / 合并 / 首开 / 取代 / 零新增）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-ADN-001** | **S0''' 全链机器化（四支线）**：S0'''-1~10 逐步可判（node + Chromium 双面；样本单源）；**① 已配置 AI 合法主线走 AI 候选；② AI 非法被拦 + 留痕；③ AI 未产出 ⇒ 确定性兜底；④ 未配置 ⇒ 纯确定性** | FR-ADN-080~085 | `test/ai-next-candidate.test.ts`（node）+ `test/ui/s0-self-driven.mjs`（**只加断言不加文件**） |
| **AC-ADN-002** | **AI 结构化产出通道**：`'idle'` 时机复用 + `chat-result` 载荷 type-only 加法字段 + 候选 `{opId,label,ref?,params?}` + 零新增 kind | FR-ADN-010~012 / 018 | 载荷 / 结构断言 + `KIND_SET` 40 判据 + `driver-timings` DT-2/DT-3 |
| **AC-ADN-003** | **① opId 在册 + ② 三档清分（`gesture` 恒拒）** | FR-ADN-020~022 | 校验器真值表 + 注入反证（幻觉 op / `gesture` op ⇒ 必拦） |
| **AC-ADN-004** | **③ ref 有效 + ④ param 在 `AskSpec` 内 + ⑤ 越界丢弃 + 留痕** | FR-ADN-024~029 | 校验器断言 + 四类注入反证 + 留痕可读行（零明文） |
| **AC-ADN-005** | **判定分层**：`admitCandidate`（接受层）与 `pressDecision`（按下层）分离；`auto`/`confirm` 可提案、`gesture` 恒拒；`confirm` 不可自动按下 | FR-ADN-030~035 | 分层真值表 + 双向反证 + `op-three-tier` / `op-wiring` ⑦ |
| **AC-ADN-006** | **确定性退居兜底 + free-input 恒常驻**：三情形（未配 / 未产出 / 非法被拦）确定性产卡；终端恒最末；R8 不回归 | FR-ADN-040~046 | `r8-open-next-entry` / `free-input-next` / `no-dead-end` + 反证 |
| **AC-ADN-007** | **合并口径**：同单卡位 + 前 N ≤3 + `NEXTSTEP_PRIORITY` 恰 4 + R6 同因去重扩展 + 单卡 / 3-chip / 密度不破 | FR-ADN-050~056 | 单卡 / 截断 / 去重 / 密度判据 + `recommendation-sources` 规则表判据 |
| **AC-ADN-008** | **护栏一致**：六常量同过 + **提案不耗预算** + 关断偏好涵盖（显示 / 自动按下）+ 零第二阈值 | FR-ADN-060~065 | `proactivity-guard` + 记账双向断言 + 关断两相判据 |
| **AC-ADN-009** | **首开确定性不破**：首开 / ready 走确定性；零 LLM 往返依赖；让位 firstRun（零双卡） | FR-ADN-070~073 | R8 入口判据 + 「无网络仍有终端」断言 + 零双卡判据 |
| **AC-ADN-010** | **X-ADN-1~11 等价重锚**（逐条判据重写，非放宽；未发生者如实登记） | FR-ADN-090~101 | §12 映射表 + 各既有门禁绿 + 台账条目 |

### 9.2 功能验收（按下 / 留痕 / 法八 / 在飞 / 人工面）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-ADN-011** | **自动按下路径 diff = 0**：仍经 `pressCandidate` → `dispatchChipAction`（恰 1）→ `op.turn` 槽；`requestTurn(` 恰 1 | FR-ADN-064 | `op-wiring` ⑦ + 反证（AI 直连 `requestTurn` ⇒ 必红） |
| **AC-ADN-012** | **留痕三要素 + 两值可判 + 零明文**：`driver=<id> \| timing=idle \| evidence=<字段名>`；AI 候选 / 手输两值可判；不回显值 | FR-ADN-013 / 026 | 留痕逐行断言 + `ai-drive.ts:85` 零值纪律 |
| **AC-ADN-013** | **法八四面零明文不退化**：候选 label / params 仅走既有载荷；留痕只含字段名 | FR-ADN-011 / 026 | `law8-plaintext`（**零降级**） |
| **AC-ADN-014** | **在飞语义不变**：`pending` 不产卡；AI 撞车 `blocked:busy` / `ai-deferred` 四值逐字不动 | FR-ADN-046 / 065 | `recommend.ts` `pending` 判据 + `turn-arbitration` |
| **AC-ADN-015** | **未配置纯确定性**：零 AI 候选、零网络；确定性行为 = 现状逐字 | FR-ADN-019 / 043 | 「未配路径 = 现状」对比断言 + 零网络调用 |
| **AC-ADN-016** | **F-35 输入面不回归**：free-input / `op.turn` 槽 / `requestTurn(` 恰 1 语义不因 AI 化回归 | FR-ADN-006 / 041 | `free-input-next` / `turn-arbitration` 判据不降 |
| **AC-ADN-017** | **人工面如实登记**：真机观感 / 「两张皮是否消失」体感 / 读屏逐项 `⏳ 未执行`，不冒充 PASS | FR-ADN-084 | §9.4 人工面清单（下表） |

### 9.3 取代台账与门禁治理（**新增 1 + 升级 6 + 保留**）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-ADN-018** | **断言零删除零降级、计数只增**（唯一例外 = 保护段显式取代 + 台账） | FR-ADN-004 / 110 | §9.5 计数对账表无减少项 |
| **AC-ADN-019** | **反证实跑 + 逐字节还原**（sha256 前后相同） | FR-ADN-029 / 082 / 111 | 反证记录（注入点 + 还原 sha） |
| **AC-ADN-020** | **取代台账登记**（X-ADN-1~11 逐条；未发生者标「未发生」；老条目保留） | FR-ADN-005 / 101 / 112 | 台账条目 + 一致性门禁 |
| **AC-ADN-021** | **保护段逐段决策**：journey `[43484,59347)`（sha `7b309258…` / 249 行）+ binding `[107780,115930)`（sha `be9ad0e9…`）→ `keep`（字节中立双绿）或八步取代（台账留痕） | FR-ADN-113 | 保护段门禁 + `supersession-ledger.test.ts` |
| **AC-ADN-022** | **门禁受审集合只增**：1 新 node 门禁入集合；`CHROMIUM_GATES === 9` | FR-ADN-115 | `gate-integrity` 绿 |
| **AC-ADN-023** | **门禁严格串行 + `KL-N-10` 处置**（隔离复跑 ≥2；仍红如实记录） | FR-ADN-116 | 执行记录 + `gate-integrity` 绿 |
| **AC-ADN-024** | **升级 6 项等价重锚完成且非恒真**：`recommendation-sources`（真值 7 / 模块 5 / 零新 LLM / 规则表 4）/ `NEXTSTEP_PRIORITY` 恰 4 / `DRIVER_DECLS_SRC` 双向包含 12↔12 / `op-wiring` 计数 / R6 同因去重扩展 / `driver-timings` 恰 5 | FR-ADN-110~117 | §9.5 处置表 + 各门禁绿 + 逐条反证 |

### 9.4 红线、体积与人工面

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-ADN-025** | **冻结面零容差**：`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 逐字节逐字 | FR-ADN-122 | `stat` + sha256 前后一致 + 冻结面判据 |
| **AC-ADN-026** | **体积分列预算 + 距档结论 + 15% 缓冲**；B 列优先（不计账）；升档走 EC 显式路径 + 作者一行 | FR-ADN-120~125 | §5.12.1 表 + 逐叶重登记 + EC-ADN-016 |
| **AC-ADN-027** | **base 零 diff + 判定链零触碰**（含 `zeroDiffFiles` 9 项哈希 pin） | FR-ADN-003 / NFR-ADN-005 | `insight-no-escalation` + `zeroDiffFiles` 机核 |
| **AC-ADN-028** | **零新增载体（红线）**：`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字 | FR-ADN-011 / 014 | `messaging` / `stream-model` / `host-registry` / `next-dispatch-diff0` 断言绿 |
| **AC-ADN-029** | **`recommend.ts` 仍 pure + 零新 LLM 面**（真值 7 / 模块 5 / 无 `fetch(`·`chrome.`·时钟） | FR-ADN-015 / 017 | `recommendation-sources` ①~④ 绿 |
| **AC-ADN-030** | **人工面如实登记**：真机观感 / 语义遵从体感逐项 `⏳ 未执行`，不冒充 PASS | FR-ADN-084 | 下表 §9.4 人工面清单 |

**§9.4 人工面清单（headless 不可合成项，逐项如实标注）**

| # | 人工项 | 判据来源 | 本轮状态 |
|:-:|---|---|:--:|
| M1 | AI 候选在真机上的**相关性 / 有用度**（作者能否一眼看出「这正是我刚被建议的下一步」） | 真机观感（机核只证「候选经校验注入 + 替换陈旧候选」） | `⏳ 未执行` |
| M2 | **「两张皮」是否消失**（体感） | 作者体感 | `⏳ 未执行` |
| M3 | AI 候选的**数量 / 密度观感**（一卡 ≤3 项是否够用 / 是否仍显陈旧） | 作者观感 | `⏳ 未执行` |
| M4 | **读屏可用性**（AI 候选 chip 与 `blocked=` 留痕行的可朗读性） | 读屏观感 | `⏳ 未执行` |
| M5 | **「被拦」提示的体感**（用户能否理解「这条建议被拦了」而非「点了没反应」） | 作者体感 | `⏳ 未执行` |

### 9.5 门禁处置与计数对账（**计数只增，逐项处置；新增 1 + 升级 6 + 保留；禁漏项**）

> **口径**：基线数引自 **F-35 收口 + R8**（本轮未复跑，§2.4B）；处置三态 = **保留** / **等价重锚** / **显式取代（+台账）**。**本轮全部标 `⏳`。**

| # | 层 | 门禁 | F-36 起点基线 | 钉了「确定性独占产出」的位置（发现面） | 处置三态 | 本轮 |
|:-:|:-:|---|--:|---|---|:--:|
| 1 | node | **`test/ai-next-candidate.test.ts`（NEW）** | — | 新增：5 道校验链纯函数 + 注入反证（幻觉 op / `gesture` / 越界 ref / param 越界 / 缺 opId）+ 判定分层 + 真源切片 | **新增（1）** | `⏳` |
| 2 | node | `test/recommendation-sources.test.ts` | （族内） | 真值白名单 7 / 模块白名单 5 / `NEXTSTEP_PRIORITY` 恰 4 / 单卡 / **④ 零新 LLM**（`:238`） | **等价重锚**（注入槽登记 + 规则表恰 4 + ④ 保持；**零删除**） | `⏳` |
| 3 | node | `test/driver-timings.test.ts` | （族内） | DT-2 恰 5 / DT-3 旧 4 逐字 / DT-4 调用点恰 8 / DT-6 `NextCtx` 字段登记 | **等价重锚**（恰 5 保持 + 新 `NextCtx` 字段入 DT-6 登记） | `⏳` |
| 4 | node | `test/driver-quadruple.test.ts` | （族内） | DQ-1 `DRIVER_DECLS_SRC` ↔ `builtinProviders()` **双向包含 11↔11** | **等价重锚**（→ **12↔12**；新 `ai-next` 声明行 `evidence` 与 `when` 同源；旧 11 逐字） | `⏳` |
| 5 | node | `test/op-wiring.test.ts` | 14 | `:246-266`（`maybeRecommend` 1/8）/ `:284-300`（自动按下恰 1 / `requestTurn(` 恰 1 / `nextAfterSettle` 1/10） | **等价重锚**（计数只增；`requestTurn(` 恰 1 不动；若新增调用点 ⇒ 计数更新 + 说明） | `⏳` |
| 6 | node | `test/turn-arbitration.test.ts` | 7（TA-8） | `:20-46`（`ARBITRATION_RESULTS` 四值 + `KIND_SET` 40）/ TA-8 AI 撞车 `blocked:busy` | **保留 / 等价重锚**（四值逐字；AI 候选撞车继承） | `⏳` |
| 7 | node | `test/op-three-tier.test.ts` | （族内） | `tierOf` 派生式三档 + `OP_TIER_TABLE` 物化 + 特权恒 `gesture` | **保留 + 加严**（接受判定共享 `tierOf`；零第二档位表反证） | `⏳` |
| 8 | node | `test/proactivity-guard.test.ts` | （族内） | 六常量单源 + 越限真抑制 + 关断偏好 | **等价重锚**（AI 候选过同一 `verdict`；**提案不耗预算**断言） | `⏳` |
| 9 | node | `test/sw-op-mirror.test.ts` | （族内） | `SW_OPS` ↔ `shared/op-table.ts` 双面一致 | **保留**（AI 校验链读同一单源） | `⏳` |
| 10 | node | `test/gate-integrity.test.ts` | 24 | Chromium 门禁字面表（**恰 9**）+ node 受审下界 | **等价重锚**（下界 +1 = 25；`CHROMIUM_GATES === 9` 逐字不动） | `⏳` |
| 11 | node | `test/r8-open-next-entry.test.ts` | （R8 新） | R8-1~6：首开入口单源 / 复用 `'idle'` / 零死端 floor / 让位 firstRun | **保留**（首开保持确定性；**不得回归**） | `⏳` |
| 12 | node | `test/free-input-next.test.ts` | 22 | FIN-0~9：free-input provider 恒真 + 恒最末终端 + `op.turn` 槽 | **保留**（终端恒常驻；**不得回归**） | `⏳` |
| 13 | node | `test/supersession-ledger.test.ts` | 49 | 保护段 journey `[43484,59347)` / binding `[107780,115930)`；`law4InplaceRevision` | **保留 + 新增**（X-ADN-1~11 台账；保护段逐段决策） | `⏳` |
| 14 | node | `test/insight-no-escalation.test.ts` | 21 | `../web-cli-base` 零 diff | **保留** | `⏳` |
| 15 | node | `test/size-baseline.ts` / `test/size-ruling-vol3.test.ts` | 13 | 体积五要素 / 档位 / 生效上限 / 历史链节 | **等价重锚 / 新增登记**（逐叶五要素；旧条目保留；**B 列不计账**） | `⏳` |
| 16 | node | `test/next-dispatch-diff0.test.ts` | （族内） | 集 B 零 per-op 分支 + `ACT_TO_OP`/`OP_TO_ACT` 单源 | **保留**（AI 候选 chip 经 `data-op` 单源分发） | `⏳` |
| 17 | Chromium | `test/ui/s0-self-driven.mjs` | （R8 后） | 驱动式主验收面 | **等价重锚 + S0''' 断言增量（只加断言不加文件）** | `⏳` |
| 18 | Chromium | `test/ui/recommendation.mjs` | （F-35 后 79） | chip 即指令 / pending 门控 / 系统行去噪 | **等价重锚**（AI 候选渲染 / 替换口径；不新增文件） | `⏳` |
| 19 | Chromium | `test/ui/journey.mjs` | 171 | `#15c` 等（**保护段**） | **保留**（保护段逐段决策：`keep` 或八步取代） | `⏳` |
| 20 | Chromium | `test/ui/binding.mjs` | 192 | 诊断面（**保护段**） | **保留**（保护段逐段决策；字节中立或八步） | `⏳` |
| 21 | Chromium | `test/ui/l0.mjs` / `l1.mjs` / `no-dead-end.mjs` / `law8-plaintext.mjs` | 251 / 132 / 53 / 60 | 单写 / 输入面单一 / 零死端 / 法八四面 | **保留 / 等价重锚**（零死端只增必绿；法八零降级） | `⏳` |

> **间接 / 对账面（不计入上表主 21 行，但须逐条确认无遗漏）**：`test/op-protocol.test.ts` / `test/next-registry.test.ts` / `test/next-obligation-table.test.ts` / `test/blocked-terminals.test.ts`（op / provider 注册表契约）/ `test/settings.test.ts` / `test/driver-terminals.test.ts` / `test/design-contract.test.ts`（契约计数）。**新增门禁**：`test/ai-next-candidate.test.ts`（新）。**`CHROMIUM_GATES === 9` 不动**（**不新增 Chromium 门禁文件**）。

---

## 10. 覆盖矩阵

### 10.0 缺口全景（**GAP-ADN-01~08**，本规范派生的规范化解构）

> **口径**：discovery 的 24 条问题（Q-ADN-001~024）在**需求层**可归约为 8 个**缺口面**；下表证明**无孤儿**（每缺口有 FR + AC 承载）。

| # | 缺口（需求层） | 由哪些 Q 归约 | 承载 FR | 承载 AC |
|---|---|---|---|---|
| **GAP-ADN-01** | next 产出权与「AI 驱动」原则**脱钩**（母问题） | Q-ADN-001 | FR-ADN-010~019 / 090 | AC-ADN-002 / 010 |
| **GAP-ADN-02** | AI 结构化产出 next 的**通道缺位**（根因：无载荷字段 / 无注入槽） | Q-ADN-002 / 015 | FR-ADN-011~018 | AC-ADN-002 |
| **GAP-ADN-03** | AI 候选**无校验入口**（在册 / 三档 / ref / param 全缺） | Q-ADN-003 / 004 | FR-ADN-020~029 | AC-ADN-003 / 004 |
| **GAP-ADN-04** | 越界 / 非法候选的**「丢弃 + 留痕」口径缺位** | Q-ADN-005 | FR-ADN-026 / 027 | AC-ADN-004 |
| **GAP-ADN-05** | 确定性注册表**兜底位置未定**（R8 回归风险）+ 终端恒常驻 | Q-ADN-006 / 007 / 021 | FR-ADN-040~046 | AC-ADN-006 |
| **GAP-ADN-06** | AI / 规则候选**合并 / 优先级 / 去重 / 上限缺位** | Q-ADN-008 | FR-ADN-050~056 | AC-ADN-007 |
| **GAP-ADN-07** | **护栏 / 预算 / 关断口径未定**（提案 vs 回合成本） | Q-ADN-009 | FR-ADN-060~065 | AC-ADN-008 |
| **GAP-ADN-08** | **首开边界 + 体积位置 + 门禁重锚 + 法一/七/八/九一致性**（次生面） | Q-ADN-010 / 011 / 012 / 013 / 014 / 016 / 017 / 018 / 019 / 020 / 022 / 023 | FR-ADN-070~073 / 110~125 / 090~101 | AC-ADN-009 / 010 / 018~030 |

> **边界说明（避免误修）**：「外部竞品调研未执行」（Q-ADN-024 / O-ADN-015）与「门禁计数 / 体积值引自上游」（本轮零运行时验证）**不是**本 Feature 的缺口 ⇒ 前者登记为 NG-ADN-019，后者登记为 §2.4B 证据口径 + §9 全 `⏳`；「环境性 flake」（Q-ADN-023）登记为 EC-ADN-020 + FR-ADN-116，**不**当作产品缺口修。

### 10.1 问题覆盖矩阵（Q-ADN-001~024 → FR / AC 逐条可追溯）

| Q | 问题（要点） | 承载 FR | 承载 AC |
|---|---|---|---|
| **Q-ADN-001** | 母问题：next 产出权与「AI 驱动」原则脱钩 | FR-ADN-090 / 010~019 | AC-ADN-002 / 010 |
| **Q-ADN-002** | AI 结构化产出 next 的通道缺位（根因） | FR-ADN-011~018 | AC-ADN-002 |
| **Q-ADN-003** | AI 候选必须过三档清分闸（最高危） | FR-ADN-020~023 / 030~035 | AC-ADN-003 / 005 |
| **Q-ADN-004** | AI 候选的合法性校验缺位（幻觉 op / ref / param） | FR-ADN-020 / 024 / 025 | AC-ADN-003 / 004 |
| **Q-ADN-005** | 越界 / 非法候选的「丢弃 + 留痕」口径缺位 | FR-ADN-026 / 027 | AC-ADN-004 |
| **Q-ADN-006** | 确定性注册表兜底位置未定（R8 回归风险） | FR-ADN-040~045 | AC-ADN-006 |
| **Q-ADN-007** | free-input 终端恒常驻不回归 | FR-ADN-041 / 042 | AC-ADN-006 |
| **Q-ADN-008** | AI 候选与规则候选的合并 / 优先级 / 去重 / 上限 | FR-ADN-050~056 | AC-ADN-007 |
| **Q-ADN-009** | AI 候选的护栏 / 预算口径未定 | FR-ADN-060~065 | AC-ADN-008 |
| **Q-ADN-010** | 首开（open）AI 化边界未决 | FR-ADN-070~073 | AC-ADN-009 |
| **Q-ADN-011** | 时机源扩展辨析（复用 vs 新增） | FR-ADN-010 / 094 | AC-ADN-002 / 010 |
| **Q-ADN-012** | AI 候选与在飞回合竞争（仲裁） | FR-ADN-046 / 065 | AC-ADN-014 |
| **Q-ADN-013** | 体积压力 + 校验执行位置未定 | FR-ADN-016 / 120~125 | AC-ADN-026 |
| **Q-ADN-014** | 门禁只增不减 vs 产出面转移的张力（判据重锚纪律） | FR-ADN-110~117 / 090~101 | AC-ADN-018~024 |
| **Q-ADN-015** | AI 候选载体的「零新增 kind」论证 | FR-ADN-011 / 014 | AC-ADN-002 / 028 |
| **Q-ADN-016** | AI 候选文本的法八（零明文）口径 | FR-ADN-026 / NFR-ADN-004 | AC-ADN-012 / 013 |
| **Q-ADN-017** | AI 候选留痕与 driver 声明扩展 | FR-ADN-013 / 096 | AC-ADN-012 |
| **Q-ADN-018** | `recommendation-sources` 真值白名单 vs AI 候选注入 | FR-ADN-015 / 017 / 091 / 098 | AC-ADN-029 |
| **Q-ADN-019** | 首装引导 / `firstRun` 与 AI next 的让位关系 | FR-ADN-072 | AC-ADN-009 |
| **Q-ADN-020** | 法一 / 法七 / 法九一致性 | FR-ADN-044 / 110~117 | AC-ADN-006 / 018~024 |
| **Q-ADN-021** | `chatBusy` / `pending` 的候选显示口径 | FR-ADN-046 | AC-ADN-014 |
| **Q-ADN-022** | AI 候选的确定性可复现性 / 门禁可判性 | FR-ADN-028 / 029 / 085 | AC-ADN-001 / 019 |
| **Q-ADN-023** | 环境性 flake 家族被误读为回归（`KL-N-10`） | FR-ADN-116 | AC-ADN-023 |
| **Q-ADN-024** | 外部竞品调研未执行（如实登记） | NG-ADN-019 | —（非缺口） |

### 10.2 根因覆盖（§2.2 确定性面缺口 A~C + §2.3）

| 根因 | 承载 FR |
|---|---|
| **A. 产出内核单源 / 候选全来自注册表**（`recommendNextStep` / `candidateRules`） | FR-ADN-010~019 / 090 |
| **B. `chat-result` 载荷无结构化 next 字段 / AI 口述只落 `assistant`** | FR-ADN-011~018 |
| **C. `pressCandidate` 铁律①：候选恒由注册表产出（无 AI 候选入口）** | FR-ADN-020~029 / 030~035 |
| **D. 真值白名单 7 / 模块白名单 5 / 零新 LLM 面（F-1/F-2）** | FR-ADN-015 / 017 / 091 / 098 |
| **E. `NEXTSTEP_PRIORITY` 恰 4 / 单卡 / 3-chip** | FR-ADN-050~056 / 052 |
| **F. floor 仅含终端 / 终端恒真（R8 零死端）** | FR-ADN-041 / 042 / 099 |
| **G. 六常量护栏 / 关断偏好（v5.5）** | FR-ADN-060~065 / 100 |
| **H. 留痕三要素 / `blocked:`·`suppressed:` 词表** | FR-ADN-013 / 026 / 096 |
| **I. SW 有界队列 `ai-deferred` / `blocked:busy`** | FR-ADN-046 / 065 |

---

## 11. 开放点裁决落位表（O-ADN-001~016 → 条文）

> **口径**：编排器裁决（2026-09-26）**全部采纳 discovery 推荐项**；下表逐条落位并给出裁决记录。

| O | 开放问题（要点） | **裁决（编排器，全按 discovery 推荐）** | 落位条文 | 裁决记录 |
|---|---|---|---|---|
| **O-ADN-001** | 命名与版本位 | **① 采纳**：树名 `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（承 `v55-f-` 补丁级跟进轮惯例）+ Feature ID **F-36** + 版本位 **v0.11.3**（v0.11.0（F-33）主题的 patch 级跟进轮）；ROADMAP 登记**留给收口**（本阶段零 diff） | §1 元数据 · FR-ADN-001 · §14.1 | **DC-ADN-001** |
| **O-ADN-002** | AI 产出 next 的**时机** | **① 采纳**：**复用既有 `'idle'`**（= 回合结题挂点，`sidepanel.ts:4168/4106`；R8 已先例）；**首开保持确定性**（O-ADN-010）；**不采纳** ② 探测 `ready`、③ `answered` 后另起 | FR-ADN-010 · 070 | **DC-ADN-002** |
| **O-ADN-003** | AI 产出 next 的**载体** | **① 采纳**：**复用既有 `chat` 载荷的加法字段**（承 `ARBITRATION_RESULTS` type-only 先例）；**零新增 kind**（`KIND_SET` 40 不动）；候选 `{opId,label,ref?,params?}` 为 payload 字段**而非消息 kind**；**不采纳** ② 专用 type-only 新消息族、③ 专用消息 kind（⇒ `KIND_SET` 41） | FR-ADN-011 / 012 / 014 · NG-ADN-010 | **DC-ADN-003** |
| **O-ADN-004** | AI 候选 **opId 校验** | **① 采纳**：opId **必须 ∈ 注册表 9 op**；**未知 op ⇒ 拒绝 + 留痕**（复用 `unknown-op` 词表） | FR-ADN-020 | **DC-ADN-004** |
| **O-ADN-005** | AI 候选**三档清分** | **① 采纳**：复用 `tierOf` 单源——`auto` 可提案（AI 可自动按下）；`confirm` 可提案（**consent 仍须用户答**，AI 不可代答）；**`gesture`（`op.authorize`/`op.perm.request`）恒拒绝（连提案都拒）**；**并新增「候选接受判定」层与「按下判定」层分离**（解决 `pressDecision` 现「非 auto 一律 blocked:tier」与「`confirm` 可提案」的张力） | FR-ADN-021~023 / 030~035 | **DC-ADN-005** |
| **O-ADN-006** | AI 候选 **ref / param 校验** | **① 采纳**：`ref` 必须**存在且有效**（`l1/ref-store.ts`）；`param` 必须在 op 参数 schema（`AskSpec`）内；越界 ⇒ **拒绝 + 留痕** | FR-ADN-024~027 | **DC-ADN-006** |
| **O-ADN-007** | **确定性兜底边界** | **① 采纳**：未配 LLM ⇒ **纯确定性（现状不变）**；已配置但 **AI 未产出 / 产出非法被拦 ⇒ 确定性注册表兜底**；**free-input 终端恒常驻**（floor 保底不回归） | FR-ADN-040~046 | **DC-ADN-007** |
| **O-ADN-008** | AI 候选与规则候选的**合并 / 优先级 / 去重 / 上限** | **① 采纳**：AI 候选与规则候选**同台竞争同一单卡位**（走既有 `MAX_NEXTSTEP_CARDS_PER_ROUND=1` 语义）；多候选按 AI 给出的顺序取前 N（**N ≤ `MAX_CHIPS_PER_CARD` = 3**，保守取 3）；扩展 R6 同因去重（`refActionDigest` 家系）覆盖 AI 候选；**不破单卡 / 3-chip 预算**（若确需多卡 ⇒ 显式取代 X-ADN-3 + 密度重锚）。**AI 骑既有 `ref-action` 规则位**（**不新增第 5 规则位** ⇒ `NEXTSTEP_PRIORITY` 恰 4 不动） | FR-ADN-050~056 / 014 / 093 | **DC-ADN-008** |
| **O-ADN-009** | AI 候选的**护栏与预算** | **① 采纳**：AI 候选**同样过六常量**（复用 `guard.ts` 单源）；**「提案」不消耗回合预算**（提案本身不新增 LLM 调用，复用刚结束回合的输出）——**只有自动成回合才消耗**（`noteProactive` 语义不变）；关断偏好 `web-cli:proactive` 涵盖 AI 候选的**显示与自动按下**（一处偏好） | FR-ADN-060~065 / 100 | **DC-ADN-009** |
| **O-ADN-010** | **首开（open）AI 化** | **① 采纳**：**首开保持确定性**（`free-input` + `capability-discovery`；R8 已建），**不在首屏依赖 LLM 往返**（可达性优先）；AI 初始 next 可作后续轮增强（若做，须保留确定性兜底 + 超时降级）；**不采纳** ② 首开也 AI 化 | FR-ADN-070~073 · NG-ADN-014 | **DC-ADN-010** |
| **O-ADN-011** | **时机源** | **① 采纳**：**复用既有 `'idle'`**，**不新增 `turn-done`**（DT-2/DT-3 恰 5 不动）；若 spec 认为语义确需新词 ⇒ 显式取代 X-ADN-5 + 旧 4 逐字 + 纯加法等价重锚（**本轮不触发**） | FR-ADN-010 / 094 | **DC-ADN-011** |
| **O-ADN-012** | AI 候选解析 + 校验的**执行位置** | **① 采纳**：**B 列优先 —— 置 SW（`background`）侧**（SW 已持有 `op-table` 镜像 + LLM 输出；旁路 sidepanel 档位压力，距档仅 15,474 B）；面板只接收**已校验**的候选并渲染；校验判定**单源**仍复用 `shared/op-table.ts`（双面镜像，承 `sw-op-mirror` 先例） | FR-ADN-016 · 117 · §5.12.1 | **DC-ADN-012** |
| **O-ADN-013** | AI 候选**留痕** | **① 采纳**：复用 `driver=<id> \| timing=<时机> \| evidence=<字段名>` 三要素 + `blocked=` / `suppressed=` 可读行；AI next 候选驱动者 id **显式声明**并入 `DRIVER_DECLS_SRC`（**11↔11 → 12↔12**，DQ-1/DQ-3 同步）；**零明文** | FR-ADN-013 / 026 / 096 | **DC-ADN-013** |
| **O-ADN-014** | **门禁处置** | **① 采纳**：先出**逐条重锚清单**（`recommendation-sources` / `driver-timings` / `driver-quadruple` / `op-wiring` / `gate-integrity`；§9.5）；新增 **1 枚 node 门禁**（`ai-next-candidate`：校验器纯函数 + 注入反证 + 真源切片）；`CHROMIUM_GATES === 9` 不动；保护段逐段决策（先例已立）；每条 `assertionsRemoved=0` | FR-ADN-110~117 | **DC-ADN-014** |
| **O-ADN-015** | **是否外部竞品调研** | **① 采纳**：**不需要**（与 v5.5 / F-34 / F-35 一致；内部架构一致性问题，无外部对标必要）；**不得**据此外推 | NG-ADN-019 | **DC-ADN-015** |
| **O-ADN-016** | **FR-CHAT-060「零新 LLM」是否被破** | **① 采纳**：**不破** —— AI 候选**复用刚结束回合的 LLM 输出**（非新增 LLM 调用），且**经注入槽**注入 `recommendNextStep`（保持 pure + 真值白名单 7）；故 `recommendation-sources` ④「零新增网络 / LLM 面」可**保持**（`recommend.ts` 内仍零 `fetch`/`chrome`）；**X-ADN-2 登记「未发生取代」** | FR-ADN-015 / 017 / 091 | **DC-ADN-016** |

### 11.1 裁决记录（DC-ADN-001~016 理由一句话）

| # | 对应 | 理由（一句话） |
|---|---|---|
| **DC-ADN-001** | O-ADN-001 | 本 Feature 是 **v5.5 主题（一切操作皆 next / 让助手像助手）的 next 产出权收编补丁级跟进** —— 不是新主题，也不并入 F-35 树（D7 禁止改写 F-35 产物），故 `-f-` + patch 版本位与先例同构。 |
| **DC-ADN-002** | O-ADN-002 | 回合结题点**已有** `maybeRecommend('idle')` 挂点（`sidepanel.ts:4168/4106`），R8 已证「复用 `'idle'` 零新增触发词」可行 ⇒ 复用是**唯一不破 DT-2/DT-3 恰 5** 且**不新增门禁重锚量**的时机；首开另属边界（DC-ADN-010）。 |
| **DC-ADN-003** | O-ADN-003 | `ARBITRATION_RESULTS` 已立「type-only 词汇骑既有 `chat-result` kind 作 payload 字段」先例（`chat-events.ts:26-46`）⇒ 复用加法字段可同时满足「结构化 / 零新增 kind（`KIND_SET` 40）/ 零宿主 / 可被面板解析后注入」；专用消息 kind（③）会撞 `KIND_SET` 40 与 `content.js` 字节冻结。 |
| **DC-ADN-004** | O-ADN-004 | 注册表在册 op 是**唯一**授权动作域（`OP_DESCRIPTORS` 9）；AI 自由文本若不校验在册，幻觉 op 可能触达不可逆面 ⇒ **在册校验是校验链第一道**（也是 `tierOfId` 未知 ⇒ `undefined` 的 loud 情形的自然复用）。 |
| **DC-ADN-005** | O-ADN-005 | `pressDecision` 今天的 `tierOf(d) !== 'auto'` ⇒ `blocked:tier` 对「**按下**」是正确的（confirm 的 consent 须用户答、gesture 恒特权）；但若把它当「**候选接受**」判据，`confirm` 就永远可见不了，而若为让 `confirm` 可见而放宽为「非 gesture 即放行」，`gesture` 就与 `confirm` **混同** ⇒ 必须**分层**：接受层（auto+confirm 接受、gesture 拒）与按下层（仅 auto 放行）**共享同一 `tierOf` 单源**，分级而非混同。 |
| **DC-ADN-006** | O-ADN-006 | `ref` 有效性（`l1/ref-store.ts`）与 op 参数 schema（`AskSpec`）都是**既有单源事实** ⇒ 校验链只需**读**它们（零新真值源 / 零第二 schema）；越界「拒绝 + 留痕」是法七无死端与安全的双重要求（不静默接受、不静默丢弃）。 |
| **DC-ADN-007** | O-ADN-007 | R8 刚修好「首开零 next 死端」，其修法（floor 铸「仅含终端」最小卡 + 终端 `when` 恒真）只在「无规则候选」触发 ⇒ AI 化后**必须**让确定性路径仍在兜底位（否则一次 AI 往返失败即回归死端）；未配 LLM 时**无候选可产出** ⇒ 纯确定性是唯一正确行为。 |
| **DC-ADN-008** | O-ADN-008 | 现状 `MAX_NEXTSTEP_CARDS_PER_ROUND=1` + `NEXTSTEP_PRIORITY` 恰 4 + `MAX_CHIPS_PER_CARD=3` 是「推荐不是列表」立法的载体 ⇒ AI 多候选**不能**破单卡 / 3-chip；把它挂在 `ref-action` 规则位（同规则内 AI 优先）既满足「替代陈旧候选」的题眼，又**不需要**新增第 5 规则位（避免 X-ADN-4 取代与密度重锚）。 |
| **DC-ADN-009** | O-ADN-009 | 六常量管的是「**主动发起**」的打扰成本（`noteProactive` 只在成功按下后记账）；AI **候选产出**复用刚结束回合的输出、**零额外 LLM 调用** ⇒ 不构成「主动发起」，若记账则会把「显示一条建议」误算成一次 LLM 成本，扭曲预算语义；关断偏好（`web-cli:proactive`）是**一处**开关 ⇒ 显示与自动按下都应受它管辖。 |
| **DC-ADN-010** | O-ADN-010 | 首屏可达性是 R8 刚立的地板（首屏必有入口）；若首开依赖 LLM 往返，则网络 / 延迟 / 失败会**直接**影响首屏（可达性倒退）⇒ 首开保持确定性；AI 初始 next 作为**后续轮增强**（须保留兜底 + 超时降级）。 |
| **DC-ADN-011** | O-ADN-011 | `'idle'` 已是「回合结束 / 失败」的语义承载（`sidepanel.ts:4106,4178`）且 R8 已复用 ⇒ 新增 `turn-done` 只会增加门禁重锚量与词汇漂移风险（DT-2/DT-3 恰 5 + 旧 4 逐字）而无语义收益。 |
| **DC-ADN-012** | O-ADN-012 | 距档仅 **15,474 B**，而解析 + 5 道校验 + 留痕是**新增逻辑主体**；SW 已持有 LLM 输出与 `op-table` 镜像（`SW_OPS` / `sw-op-mirror` 先例）⇒ 放 B 列（`background.js` 不计 sidepanel 账本）是**旁路档位压力**的唯一低风险选择；同时校验单源仍在 `shared/op-table.ts`（双面镜像不破）。 |
| **DC-ADN-013** | O-ADN-013 | `DRIVER_DECLS_SRC` 是**手写第二源**、与 provider 集合互为**双向包含**判据（DQ-1），刻意保留「声明 ↔ 注册表漂移」可见失败面 ⇒ 新增 AI next 驱动者必须**同步声明**（`evidence` 与 `when` 同源，DQ-3），否则门禁必红。 |
| **DC-ADN-014** | O-ADN-014 | 判据必须落在**纯函数校验器 + 注入反证**（LLM 输出不确定 ⇒ 门禁不能断言输出）；`CHROMIUM_GATES === 9` 是既有下界（目录扫描自动纳入，下界只让改名 / 删除可见）⇒ 新门禁走 node 侧（`ai-next-candidate`）+ 既有 `s0-self-driven.mjs` 只加断言。 |
| **DC-ADN-015** | O-ADN-015 | 本问题是**纯内部架构一致性**（「next 产出者与已立法原则脱钩」），外部产品（IDE 侧栏 / 命令面板）的 AI 推荐表述**不可核**且不构成判据；仓库内已有可核先例（`ARBITRATION_RESULTS` / `pressDecision` / `tierOf` / `guard`）⇒ 调研不执行，且**不得**据此外推（承 F-35 DC-IAN-010 同构）。 |
| **DC-ADN-016** | O-ADN-016 | FR-CHAT-060 的语义是「推荐器**自己不新开 LLM / 网络面**」；本 Feature **复用刚结束回合的输出**（既有 LLM 调用的副产品）+ 经注入槽进入 `recommend.ts` ⇒ `recommend.ts` 内仍零 `fetch` / `chrome` / 时钟，pure 与真值白名单 7 均可保持 ⇒ **不破**（仅当 plan 断定必须在 `recommend.ts` 内触达 AI 时才显式取代 X-ADN-2）。 |

---

## 12. X-ADN-1~11 显式取代 → 判据等价重写映射表（**映射摘要**）

> **口径**：**「显式取代」≠「放宽」** —— 判据必须**等价重锚**（断言力不降、计数只增），并留台账（FR-ADN-101 / 112）。**本 Feature 是「产出权转移」，故取代是显式的**（不静默改写）；**未发生者如实登记「未发生」**。

| X | 既有形态（现状逐字） | 取代 / 裁决内容 | 等价重写判据（**不得放宽**） | 状态 |
|---|---|---|---|---|
| **X-ADN-1** | next 推荐 = **确定性内核独占产出**（`recommendNextStep` 单源，真值 7 源 / 规则表 4 / 候选全来自注册表） | **产出权转移**：AI 驱动产出候选 + 确定性注册表**退居兜底与安全闸** + old→new 台账（理由 / 日期 / 落点） | 真值 7 / 模块 5 / 单卡 / `NEXTSTEP_PRIORITY` 恰 4 **逐一保持**；确定性兜底与终端**仍在**；台账 old→new 逐字 | **已发生（本轮立项裁决）**；落地 = 叶1 + 叶2 |
| **X-ADN-2** | `recommendation-sources` ④「零新增网络 / LLM 面：源码不含 `fetch(`/`chrome.`/时钟」（`recommendation-sources.test.ts:238`；`recommend.ts:11-12` FR-CHAT-060） | **保持**（候选经注入槽 ⇒ `recommend.ts` 仍 pure） | ④ 判据**逐字不动**且绿；反证「加 `fetch(` ⇒ 必红」 | **未发生取代**（`no-supersession`；仅当 plan 证必须在 `recommend.ts` 内触达 AI ⇒ 显式取代） |
| **X-ADN-3** | `MAX_NEXTSTEP_CARDS_PER_ROUND = 1`（单卡，`recommend.ts:51`） | **保持**（AI 多候选在单卡内以 ≤3 chip 呈现） | 单卡判据绿；反证「两卡 ⇒ 必红」 | **未发生取代** |
| **X-ADN-4** | `NEXTSTEP_PRIORITY` 恰 4（`recommend.ts:60`；`recommendation-sources.test.ts:139`） | **保持**（AI 骑既有 `ref-action` 规则位；**不新增第 5 规则位**） | 规则表逐字恰 4；反证「新增第 5 规则 ⇒ 必红」；若 plan 证必要 ⇒ 显式取代 + 旧 4 逐字 + 纯加法 | **未发生取代**（路径注明） |
| **X-ADN-5** | 时机源「恰 5」（`drivers.ts:33`；DT-2/DT-3） | **保持**（复用既有 `'idle'`，**不新增 `turn-done`**） | DT-2（恰 5）/ DT-3（旧 4 逐字）绿；反证「新增第 6 词 ⇒ 必红」 | **未发生取代** |
| **X-ADN-6** | `maybeRecommend` 调用点「恰 8」（DT-4；`op-wiring.test.ts:246-266`）+ `nextAfterSettle` 1 定义 / 10 调用点 + `requestTurn(` 恰 1 | **等价重锚**（若新增调用点 ⇒ 计数只增 + 说明；`requestTurn(` 恰 1 **不动**） | `op-wiring` 判据可 FAIL；`expectFailPattern` 更新；计数只增 | **预登记**（触发 = 若新增挂点；落地 = 叶1 / 叶2） |
| **X-ADN-7** | `DRIVER_DECLS_SRC` ↔ `builtinProviders()` **双向包含 11↔11**（DQ-1） | **重锚 12↔12**：新增 `ai-next` 声明行（`driver=<id>` / `timings: ['idle']` / `evidence=<when 同源字段>`）；旧 11 行**逐字保留** | 双向包含 12↔12 + 三类注入反证（缺声明 / 多声明 / `evidence` 漂移 ⇒ 必红） | **已发生**（叶1 落地） |
| **X-ADN-8** | R6「完成后同动作去重」= `refId#意图摘要`（`recommend.ts:87-100`；`completedActions`） | **扩展覆盖 AI 候选**（同因去重纳入 AI 家系） | 去重判据扩到 AI（`refActionDigest` 家系）；反证「去掉 AI 去重 ⇒ 必红」 | **已发生**（叶2 落地） |
| **X-ADN-9** | `RECOMMEND_MODULE_WHITELIST` 恰 5 模块（`recommend.ts:138`） | **保持**（若注入槽落在新模块 ⇒ 等价重锚白名单 + 说明） | 模块白名单判据绿；反证「白名单外导入 ⇒ 必红」 | **未发生取代**（若新增导入 ⇒ 等价重锚） |
| **X-ADN-10** | floor = 「仅含 `free-input` 终端」最小卡（`recommend.ts:506-517`） | **重锚**（AI 候选进入推荐语义后，floor 语义不变、**终端仍恒常驻**） | floor 判据 + 终端恒常驻判据；反证「`safety` 走 floor / 终端缺失 ⇒ 必红」 | **预登记**（落地 = 叶2；终端恒常驻 = 已保持） |
| **X-ADN-11** | 关断偏好 `web-cli:proactive` 只涵盖「AI 主动回合」（`guard.ts:32`） | **扩展涵盖 AI next 候选的显示 / 自动按下** | 关断两相判据；反证「关断后仍显示 / 仍自动按下 ⇒ 必红」 | **已发生**（叶2 落地） |

> **边界**：**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」的方式落地**；默认优先「**等价重锚（断言力不降）**」的读法，只有当等价重锚被证不可行时才显式放宽并留台账（FR-ADN-101）。**未发生取代须如实登记「未发生」**。

---

## 13. 红线表（N-ADN-001~020 编成 + N-ADN-021~030 spec 新增）

### 13.1 红线编成（**自 discovery §1.4 非目标 + §5.2 风险 + 编排裁决红线，逐条来源可核**）

> **口径**：discovery **未**给出 `N-*` 编号清单（与 F-34 / F-35 discovery 同构）⇒ 本节把 discovery 已明示的红线约束**编成编号表**并标注来源；**不新增 discovery 未表达的约束**（新增项一律入 §13.2）。

| # | 红线（**逐字口径**） | 来源（discovery / 上游） | 本规范承载 |
|---|---|---|---|
| **N-ADN-001** | `dist/content.js` = **177,076 B**（sha `52a82620…`，**零容差**） | §1.4 非目标 + F-35 closeout | FR-ADN-122 / AC-ADN-025 / NG-ADN-007 |
| **N-ADN-002** | `dist/pick-layer.js` = **34,358 B**（sha `77796bab…`，**零容差**） | §1.4 非目标 + F-35 closeout | FR-ADN-122 / AC-ADN-025 / NG-ADN-007 |
| **N-ADN-003** | **`KIND_SET` 40 项逐字不增**；新消息族走 **type-only 先例** | §1.4 非目标（12 kind 零宿主） | FR-ADN-011 / 014 / NFR-ADN-007 / NG-ADN-010 |
| **N-ADN-004** | **12 kind 契约不动**；**零新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []`） | §1.4 非目标 + F-35 N-IAN-004 | FR-ADN-011 / NFR-ADN-007 / NG-ADN-010 |
| **N-ADN-005** | **上游产物零改写**：F-35 / F-34 / F-33 / F-32 / R8 / v4.5 / v4 / v5 / v5.5 产物**原样保留**；**唯一授权例外 = X-ADN-1 产出权转移的显式取代登记 + old→new 台账** | D7 + §1.4 非目标 | FR-ADN-005 / 090 / 112 / NG-ADN-006 |
| **N-ADN-006** | **X-ADN-1 取代必须走 supersession 台账 old→new**（逐字 old / 逐字 new / 理由 / 日期 / 落点）；**禁静默改写** | §5.2 R-ADN-004 + 编排裁决 | FR-ADN-090 / 112 / AC-ADN-020 |
| **N-ADN-007** | **`packages/web-cli-base/**` 零 diff**（跨包红线） | §1.4 非目标 + F-35 N-IAN-007 | NFR-ADN-005 / AC-ADN-027 / NG-ADN-008 |
| **N-ADN-008** | **free-input 终端恒常驻**（R8 保底）：任何推荐卡必有终端（恒最末，非 `.next-chip`） | §1.4 非目标 + F-35 N-IAN-021 | FR-ADN-041 / AC-ADN-006 / NG-ADN-015 |
| **N-ADN-009** | **法八零明文不退化**：流内 payload / digest / 审计 / DOM **四面零明文**；候选 `label`/`params`/留痕不回显值 | §1.4 非目标 + F-35 N-IAN-009 | FR-ADN-026 / NFR-ADN-004 / NG-ADN-012 |
| **N-ADN-010** | **AI 候选不得自造 op / 不得绕过注册表**：opId 必须 ∈ 9 op；`pressCandidate` 铁律① 保持 | §5.2 R-ADN-001 + `ai-drive.ts:8` | FR-ADN-020 / 028 / NG-ADN-011 |
| **N-ADN-011** | **特权 op 恒 `gesture`**：`op.authorize` / `op.perm.request` 是**恰 2** 必须用户手势者；「SW 永不调用 `.request(`」；AI **不可自动执行** | §1.4 非目标 + F-35 N-IAN-016 | FR-ADN-022 / NFR-ADN-002 / NG-ADN-011 |
| **N-ADN-012** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账显式取代并留痕） | §1.4 非目标 + §5.2 R-ADN-004 | FR-ADN-004 / 110 / NG-ADN-016 |
| **N-ADN-013** | **`authorConfirmation.status = pending-author-line` 属未闭合义务**；任何文档 / 台账**不得**伪称体积档位已确认；升档须走 EC 显式路径 | 上游 F-35 closeout + §5.2 R-ADN-006 | FR-ADN-123 / EC-ADN-016 / NG-ADN-018 |
| **N-ADN-014** | **`F-29`（A2A 候选）未立项未排期，保持原样不动**（ROADMAP 相关区段**一字不动**） | §1.4 非目标 | NG-ADN-017 / §16 第 2 条 |
| **N-ADN-015** | **保护段必须逐段决策**：journey `[43484,59347)` / sha `7b309258…`；binding `[107780,115930)` / sha `be9ad0e9…`；哈希变更**必须台账留痕**、**禁静默改写** | §5.2 R-ADN-004 + F-35 COR-IAN-1 | FR-ADN-113 / AC-ADN-021 |
| **N-ADN-016** | **判定分层不得混同**：`admitCandidate`（接受层）与 `pressDecision`（按下层）**必须**分离；`gesture` **不得**与 `confirm` 混同（gesture 连接受都拒） | §0.2 §7.3 关键张力 + O-ADN-005 | FR-ADN-030 / 032 / 035 / NFR-ADN-014 |
| **N-ADN-017** | **consent / `gesture` 不得被 AI 代答**（含 `confirm` 档候选的 consent） | §1.4 非目标 + 红线⑥ | FR-ADN-023 / 034 / NFR-ADN-003 / NG-ADN-011 |
| **N-ADN-018** | **判定链零触碰**：`src/security/policy.ts` / `auto-authorize.ts` 在 `zeroDiffFiles` 冻结（9 项） | §1.4 非目标 | NFR-ADN-005 / AC-ADN-027 / NG-ADN-009 |
| **N-ADN-019** | **门禁严格串行**（一次一个 Chromium，绝不并发）；`CHROMIUM_GATES === 9` 不动 | F-35 N-IAN-019 | FR-ADN-115 / 116 / NFR-ADN-012 |
| **N-ADN-020** | **纪律**：不碰 `main`、不 force push、path-limited `git add`、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖；`.sddu` 外零触碰；不合 main、不发布 | D6 + §0.3 约束 | §16 纪律表 / FR-ADN-003 |

### 13.2 spec 新增红线（**本规范新增，与 N 同等级**）

| # | 红线（**本规范新增，逐字口径**） | 依据 | 承载 |
|---|---|---|---|
| **N-ADN-021** | **AI 候选校验链不可旁路**：任何 AI 候选进入 chips / 执行前**必须**过 5 道校验；「未经校验的 AI 候选被渲染或执行」⇒ FAIL | FR-ADN-020~029 / Q-ADN-003 | AC-ADN-003 / 004 / NFR-ADN-009 |
| **N-ADN-022** | **校验器单源**：AI 候选校验器**恰 1 份**；第二份校验器 / 第二份档位表 ⇒ FAIL | FR-ADN-021 / 033 / NFR-ADN-013 | AC-ADN-005 |
| **N-ADN-023** | **AI 候选零新 LLM 面**：产出候选**不得**新增 LLM 调用 / 网络请求；`recommend.ts` 仍零 `fetch(`/`chrome.`/时钟 ⇒ 违反即 FAIL | FR-ADN-017 / NFR-ADN-015 | AC-ADN-029 / EC-ADN-008 |
| **N-ADN-024** | **兜底门禁必绿且禁恒真**：`r8-open-next-entry` / `free-input-next` / `no-dead-end` 必绿；每条判据必须有双向反证与三段控制；**恒真断言 ⇒ 视为缺陷** | FR-ADN-044 / 045 / 085 | AC-ADN-006 / 019 |
| **N-ADN-025** | **首开零 LLM 依赖**：首开 / ready 路径**不得**因 AI 化引入 LLM 往返依赖；首屏必有终端 ⇒ 违反即 FAIL | FR-ADN-070 / 071 / Q-ADN-010 | AC-ADN-009 / EC-ADN-013 |
| **N-ADN-026** | **提案与回合成本分列**：产出候选**不得**记账 `noteProactive` / 不得消耗回合预算；只有自动成回合可消耗 ⇒ 违反即 FAIL | FR-ADN-061 / R-ADN-007 | AC-ADN-008 / S0'''-9 |
| **N-ADN-027** | **单卡 / 3-chip / 密度不破**：`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` / `MAX_CHIPS_PER_CARD = 3` / 阈值 7/15 · 9/20 · 17/35 逐字不动 ⇒ 破坏即 FAIL | FR-ADN-050~054 / O-ADN-008 | AC-ADN-007 |
| **N-ADN-028** | **`ai-next` provider 不得成为「第二产出内核」**：`recommendNextStep` 仍是唯一内核；AI 候选**只能经注入槽 + provider** 进入 ⇒ 第二内核 / 直产卡 ⇒ FAIL | FR-ADN-014 / NFR-ADN-013 | AC-ADN-002 / 007 |
| **N-ADN-029** | **载荷加法字段缺席时行为逐字不变**：新字段缺席 ⇒ 面板 / 推荐行为与现状**逐字一致**（向后兼容不可破） ⇒ 违反即 FAIL | FR-ADN-018 | AC-ADN-002 / 015 |
| **N-ADN-030** | **未发生取代如实登记**：X-ADN 项未取代者必须登记 `no-supersession` + 理由；**留空 / 伪造「已取代」⇒ FAIL** | FR-ADN-101 / R-ADN-004 | AC-ADN-010 / 020 |

---

## 14. 子 Feature 拆分与交付顺序

### 14.1 结构裁决（**2 叶，依存序，串行**）

**裁决（DC-ADN-008 / O-ADN-014 + discovery §6.3）**：本 Feature 拆 **2 叶**，**必须串行** `adn-1 → adn-2`；叶目录**直接嵌套**于父目录下（**不使用 `children/` 中间层**，目录树即特性树）：

```
specs-tree-web-cli-plugin-v55-f-ai-driven-next/
├── discovery.md                              # 问题挖掘（已入库）
├── spec.md                                   # 本文件（父级完整规范）
├── TREE.md / state.json                      # 导航 / 状态
├── specs-tree-adn-1-ai-next-produce-and-verify/    # 叶1 = 产出通道 + 5 道校验链（首叶，安全核心）
└── specs-tree-adn-2-deterministic-fallback-and-merge/  # 叶2 = 兜底 + 合并 + 首开边界 + 体积 + 门禁重锚（末叶，依赖叶1）
```

**为什么必须「先立通道与安全闸、再收兜底与合并口径」（三条论证，供 plan / 后续轮复核）**：

1. **安全先行（决定性）**：AI 候选一旦能进 chips / 被按下，**校验链必须先就位** —— 否则「先接产出、后补校验」的中间态会**裸放** AI 自由文本触达特权 / 不可逆面（R-ADN-001）。叶1 一次交付「通道 + 5 道校验 + 判定分层」，中间态即**安全可达**。
2. **风险面不同**：叶1 的风险面 = **通道形态 / 校验正确性 / 档位分层 / 留痕 / 载荷兼容**（正确性）；叶2 的风险面 = **兜底回归 / 合并溢出 / 首开可达性 / 体积 / 门禁与保护段**（结构性与治理）。耦在一轮会让「校验正确性」与「门禁重锚」互相掩盖（承 F-34 / F-35 §14.1 同构论证）。
3. **体积必须分列 + 责任相反**：叶1 主要是 **A 列薄接线 + B 列校验主体**（B 列不计账）；叶2 是 **A 列合并 / 兜底接线 + 重锚**；混算会抵成一笔、**无法定位归因**（FR-ADN-124 / 125）。验收锚层次也不同：叶1「合法候选被采纳 / 非法候选被拦且留痕 / 判定分层可判」；叶2「兜底不回归 / 终端恒在 / 合并不破单卡 / 首开确定性 / 门禁强度不降」。

> **备选评估（如实登记，不推荐）**：**单叶 + 内部分组**——会在同一轮内同时承担「通道 + 校验安全语义」与「兜底 + 合并 + 门禁 + 保护段」两类风险，且**无法证明中间态安全**（S0''' 的支线 B 无法独立验收）；体积亦无法分列。故 **不采纳**。

### 14.2 交付顺序与叶职责

| 序 | 叶 | 职责（交付形态） | 依赖 | 承载 FR |
|:-:|---|---|---|---|
| 1 | `specs-tree-adn-1-ai-next-produce-and-verify`（**通道 + 安全核心 / 首叶**） | AI 结构化产出通道（`'idle'` 时机 + `chat-result` type-only 加法字段 + 零新增 kind）+ **5 道校验链**（opId 在册 / 三档清分 / ref / param / 丢弃+留痕）+ `tierOf` 单源复用 + **`admitCandidate`（接受层）与 `pressDecision`（按下层）分层** + `ai-next` provider 登记（`rule: ref-action`）+ `DRIVER_DECLS_SRC` 11→12 + `NextCtx` 加法字段登记 + SW 侧解析 / 校验（**B 列优先**）+ 留痕三要素 + 新 node 门禁 `ai-next-candidate` + S0''' 主线（支线 A/B）与支线 D 的 node 面 | —（P0，底座） | GOV 001~007 · CHAN 010~019 · VERIFY 020~029 · TIER 030~035 · S0''' 080~082 / 085（主线侧）· SUPERSEDE 096 · GATE 110~117（新增门禁 + 反证族）· VOL 120~125（B 列归因） |
| 2 | `specs-tree-adn-2-deterministic-fallback-and-merge`（**兜底 + 合并 / 末叶**） | 确定性退居兜底（未配 / 未产出 / 非法被拦）+ **free-input 终端恒常驻（R8 保底不回归）** + floor 语义保持 + **合并 / 优先级 / 去重 / 上限**（同单卡位、前 N ≤3、R6 同因去重扩展、替换口径）+ 护栏（六常量 / 提案不耗预算 / 关断两相）+ 首开边界落地 + 🆕 **S0''' 四支线终态** + 体积逐叶重登记 + **门禁逐条重锚（含保护段决策）** | `specs-tree-adn-1-ai-next-produce-and-verify` | FALLBACK 040~046 · MERGE 050~056 · GUARD 060~065 · OPEN 070~073 · S0''' 083 / 084（终态侧）· SUPERSEDE 090~095 / 097~101 · GATE 110~117（重锚终态 + 保护段）· VOL 121~125（终态侧） |

> **父 Feature** = 轻量规范容器（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 / F-34 / F-35 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**，不产 `tasks.json` 于父层）。

### 14.3 FR → 叶 覆盖矩阵（**每条 FR 恰属一叶的「主责面」；共享面另标**）

| FR 段 | FR 编号 | 主责叶 | 共享面 |
|---|---|---|---|
| GOV（立案 / 结构 / 纪律） | FR-ADN-001~007 | **叶1**（父级结构 + 纪律，共享面在此一次做完） | 叶2 引用 002 / 004 / 005 / 006 |
| CHAN（产出通道） | FR-ADN-010~019 | **叶1** | 叶2 引用 013 / 018 |
| VERIFY（5 道校验链） | FR-ADN-020~029 | **叶1** | 叶2 引用 024 / 026（终态留痕接线） |
| TIER（判定分层） | FR-ADN-030~035 | **叶1** | — |
| FALLBACK（兜底） | FR-ADN-040~046 | **叶2** | 叶1 引用 041（终端恒在骨架） |
| MERGE（合并 / 优先级 / 去重 / 上限） | FR-ADN-050~056 | **叶2** | 叶1 引用 052（规则表恰 4 不动） |
| GUARD（护栏 / 预算 / 关断） | FR-ADN-060~065 | **叶2** | 叶1 引用 064（按下路径 diff = 0） |
| OPEN（首开边界） | FR-ADN-070~073 | **叶2** | — |
| S0'''（首验收） | FR-ADN-080~085 | **叶1**（080 / 081 / 082 / 085 的主线侧）/ **叶2**（083 / 084 + 终态侧） | 共享 080 / 085 |
| SUPERSEDE（X 映射） | FR-ADN-090~101 | **叶2**（090~095 / 097~101）/ **叶1**（096 `DRIVER_DECLS_SRC` 12↔12） | 共享 101 |
| GATE（门禁 / 台账） | FR-ADN-110~117 | **叶1**（新增门禁 / 反证族 / 串行纪律 / 对账表骨架）/ **叶2**（升级 6 + 保护段 + 台账终态） | 共享 110~117 |
| VOL（体积分列） | FR-ADN-120~125 | **叶1** 出表 + B 列归因 / **两叶各自收口实测登记** | 共享预算表（120~122） |

---

## 15. 风险登记（discovery 继承 R-ADN-001~014 + spec 新增 R-ADN-901~910）

### 15.1 继承风险（discovery §5.2，逐条保留等级与预登记证据）

| # | 风险 | 等级 | 承载条文 / 应对 |
|---|---|:--:|---|
| **R-ADN-001** | **AI 候选幻觉 op / 越界 ref / 越界 param 触达特权 / 不可逆面（最高危）** | **高** | FR-ADN-020~029；AC-ADN-003/004；N-ADN-010/016/021；**校验链先于任何候选接受；`gesture` 恒拒；纯函数校验器 + 注入反证必红** |
| **R-ADN-002** | **非法候选「静默接受」（安全）或「静默丢弃」（死端 / 不可判）** | **高** | FR-ADN-026；AC-ADN-004；N-ADN-009；**丢弃 + 可读留痕（零明文）+ 兜底 next 仍可达** |
| **R-ADN-003** | **确定性兜底失守 ⇒ R8 零死端回归** | **高** | FR-ADN-040~045；AC-ADN-006；N-ADN-008/024；**AI 化后确定性路径必须仍可达；未配 ⇒ 纯确定性；终端恒常驻** |
| **R-ADN-004** | **门禁静默降强度**：`recommendation-sources` / `driver-timings` / `driver-quadruple` / `op-wiring` 被静默改动或删除 | **高** | FR-ADN-110~117 / 090~101；AC-ADN-018~024；N-ADN-012/030；**先出逐条重锚清单再动面；`assertionsRemoved=0`** |
| **R-ADN-005** | **AI 多候选溢出（单卡 / 3-chip 预算被破）** | **中高** | FR-ADN-050~056；AC-ADN-007；N-ADN-027；**前 N ≤3 + 截断 + 同单卡位** |
| **R-ADN-006** | **体积越档位**：距档仅 **15,474 B**；解析 / 校验位置影响 A 列增量 | **中高** | FR-ADN-016 / 120~125；AC-ADN-026；EC-ADN-016；**B 列优先（SW 侧）+ 先出分列预算 + 逐叶重登记** |
| **R-ADN-007** | **护栏阈值被新增第二份**（提案 vs 自动回合成本口径混用） | **中高** | FR-ADN-060~063；AC-ADN-008；N-ADN-026；**提案不耗预算（不记账）+ 零第二阈值** |
| **R-ADN-008** | **`KIND_SET` 40 / 12 kind / 零宿主被撞**（若用新 kind 作载体） | **高** | FR-ADN-011 / 014；NFR-ADN-007；N-ADN-003/004；**复用既有 `chat-result` 载荷（type-only 加法字段）** |
| **R-ADN-009** | **法八（零明文）被 AI 候选文本撞破** | **中高** | FR-ADN-026；NFR-ADN-004；N-ADN-009；**候选文本仅走既有载荷；校验 / 摘要 / 留痕不回显值** |
| **R-ADN-010** | **首屏依赖 LLM 往返 ⇒ 首开体验 / 可达性受网络影响** | **中** | FR-ADN-070~073；AC-ADN-009；N-ADN-025；**首开保持确定性兜底** |
| **R-ADN-011** | **在飞时 AI 候选与既有仲裁冲突**（产出 vs 自动成回合） | **中** | FR-ADN-046 / 065；AC-ADN-014；**产出与按下的让步口径分立；`pending` 不产卡** |
| **R-ADN-012** | **门禁无法断言不确定的 LLM 输出** | **中** | FR-ADN-028 / 029 / 085；AC-ADN-019；**判据落在纯函数校验器 + 注入式反证** |
| **R-ADN-013** | **环境性 flake 被误读为回归（`KL-N-10`）** | **低—中** | FR-ADN-116；EC-ADN-020；**隔离复跑 ≥2 + 如实记录不阻塞** |
| **R-ADN-014** | **方案先行**：开放点在 spec 前被顺手定下 | **中高** | §11（全部 `ruled`）+ §8 `PD-ADN-*`；FR-ADN-007；**discovery 零预设** |

### 15.2 spec 新增风险

| # | 风险 | 等级 | 说明 / 应对 |
|---|---|:--:|---|
| **R-ADN-901** | **判定混同**：把「候选接受」判据直接复用 `pressDecision`（或反之），导致 `confirm` 永不可见或 `gesture` 被放行 | **高** | FR-ADN-030~035；N-ADN-016；**分层真值表 + 双向反证（`admit=true ∧ press=false` 必可判）** |
| **R-ADN-902** | **校验链被写成「先展示后校验」**（AI 候选先渲染，再异步补校验） | **高** | FR-ADN-028 / N-ADN-021；**校验先于接受；未校验候选不得进 chips（注入必红）** |
| **R-ADN-903** | **校验器读测试自建常量 / 自我裁决**（判据恒真） | **中高** | FR-ADN-085 / NFR-ADN-009；**真源切片（生产 `op-table` / `ref-store`）+ 三段控制 + 注入必红** |
| **R-ADN-904** | **AI 候选被实现成「第 5 规则位 / 第二产出内核」** | **高** | FR-ADN-014 / 052 / N-ADN-028；**骑 `ref-action` 位；`recommendNextStep` 仍唯一内核；反证必红** |
| **R-ADN-905** | **载荷加法字段破坏向后兼容**（新字段缺席时行为变化） | **中高** | FR-ADN-018 / N-ADN-029；**「新字段缺席 ⇒ 现状逐字」断言** |
| **R-ADN-906** | **提案被记账成主动回合**（预算被误耗 / 关断语义错位） | **中高** | FR-ADN-061 / N-ADN-026；**双向记账断言（产出不耗 / 成回合才耗）** |
| **R-ADN-907** | **替换口径写成「叠加」**（AI 候选与陈旧确定性 chip 同屏 ⇒ 越 3-chip / 语义重叠） | **中高** | FR-ADN-055 / N-ADN-027；**双向判据（AI 在场 ⇒ 无陈旧 chip；AI 缺席 ⇒ 陈旧 chip 在）** |
| **R-ADN-908** | **B 列优先被读成「无成本」**（把 A 列改动搬 B 列规避账本） | **中高** | FR-ADN-125；AC-ADN-026；**逐模块归因 + 列别如实标注 + 反证「搬列规避 ⇒ 必红」** |
| **R-ADN-909** | **S0''' 被写成「脚本绿」而非「链路可判」**（用假 provider / 桩跳过真实校验与注入） | **中高** | FR-ADN-080~085；**真源切片 + 双向反证（承 v5-2 review BLOCK-03 / F-35 R-IAN-909 教训）** |
| **R-ADN-910** | **门禁处置「看起来齐」但漏项**（行数当断言数；间接面未确认） | **中高** | FR-ADN-114；AC-ADN-024；COR-ADN-3；**按断言语义逐条 + 三态齐 + 间接面对账面（§9.5）** |

---

## 16. 纪律与验证契约

| # | 纪律 | 依据 |
|:-:|---|---|
| 1 | **`.sddu/**` 只写本 Feature 目录**；**spec 阶段零改动** `src/` / `test/` / `dist/` / `design/` / `docs/` 与 `ROADMAP.md` | D6 / FR-ADN-003 |
| 2 | **path-limited `git add`**（禁 `git add -A` / `.`）；不 force push；不合 main；不发布；无新依赖；不改 `packages/web-cli-base/**`；不改 `.opencode/opencode.json`；`F-29` 区段一字不动 | N-ADN-014 / 020 / NG-ADN-008 / 017 |
| 3 | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile） | N-ADN-019 / FR-ADN-116 |
| 4 | **`KL-N-10` 处置纪律**：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | R-ADN-013 / EC-ADN-020 |
| 5 | **断言零删除零降级、计数只增不减**（唯一例外：保护段显式取代 + 台账留痕） | N-ADN-012 / FR-ADN-004 / 110 |
| 6 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | FR-ADN-111 / AC-ADN-019 |
| 7 | **人工面如实登记**：真机观感 / 「两张皮是否消失」体感等 headless 不可合成项逐项 `⏳ 未执行`，**不得冒充 PASS** | FR-ADN-084 / AC-ADN-030 / §9.4 |
| 8 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7 + 本规范 §2.2 / §2.4）；未跑任何门禁 / 构建 / Chromium | D6 / §2.4 |
| 9 | **体积预算先评估后落地**：先出分列净增上下界与越限路径口径，再排落地；`authorConfirmation` **不得静默改写** | R-ADN-006 / N-ADN-013 / FR-ADN-120 / 123 |
| 10 | **不编造外部结论**：竞品调研**未执行**（口径 = 「未执行，不阻塞」），不得据此外推 | NG-ADN-019 / O-ADN-015 |
| 11 | **取代与实现同轮完成**：X-ADN-1~11 的台账登记与判据重锚**不得**拆到「下一轮补」；**未发生取代的 X 项须如实登记「未发生」** | FR-ADN-101 / 112 / §12 |
| 12 | **两叶串行 + 共享面一次做完**：`adn-1 → adn-2`；体积 / 保护段 / 取代台账 / `knownGap` 四类共享面**恰一次**登记（叶1 承接共享面骨架，叶2 增量 + 终态） | FR-ADN-002 / 005 / AC-ADN-020 / 026 |
| 13 | **安全不可旁路**：唯一通道（type-only 加法字段）+ 唯一校验器 + 唯一档位单源（`tierOf`）+ 唯一按下路径（`pressCandidate`）；**不得**新增散落候选面 / 第二校验器 / 第二档位表 | N-ADN-021 / 022 / 028 / NFR-ADN-013 |
| 14 | **判定分层不可退化为文档**：门禁真源切片指向**生产源码**（`op-table.ts` / `ref-store` / `providers.ts`）；**不得**以「文档写了」为通过条件 | N-ADN-016 / FR-ADN-085 |
| 15 | **`authorConfirmation` 占位口径**：生效上限 `floor(598,926 × 1.05) = 628,872` / 档位 614,400 / 绝对上限 675,840 —— `pending-author-line` **未闭合义务，不得伪称已确认** | N-ADN-013 / FR-ADN-123 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5.5.3「AI 驱动 next」需求规范）：**父 Feature = 轻量规范容器 + 2 叶**（`specs-tree-adn-1-ai-next-produce-and-verify` → `specs-tree-adn-2-deterministic-fallback-and-merge`，依存序串行，**已论证不退化单叶**）；**O-ADN-001~016 十六条开放点全部裁决**（status 一律 `ruled`，DC-ADN-001~016，采纳 discovery 推荐项）；**FR 89 条**（GOV 7 / CHAN 10 / VERIFY 10 / TIER 6 / FALLBACK 7 / MERGE 7 / GUARD 6 / OPEN 4 / S0''' 6 / SUPERSEDE 12 / GATE 8 / VOL 6）；**NFR 16** / **EC 20** / **NG 20** / **US 10** / **G 8** / **AC 30**（核心 = 001 **S0''' 四支线全链机器化（已配置 AI 合法 / AI 非法被拦 / AI 未产出 / 未配置纯确定性）** / 002 AI 结构化产出通道 / 003 **① opId 在册 + ② 三档清分（gesture 恒拒）** / 004 **③ ref + ④ param + ⑤ 丢弃+留痕** / 005 **判定分层（`admitCandidate` vs `pressDecision`）** / 006 确定性兜底 + free-input 恒常驻 / 007 合并口径 / 008 护栏一致 / 009 首开确定性不破 / 010 X-ADN 等价重锚）；**关键口径**：**AI 候选 = 时机复用 `'idle'` + 载体复用既有 `chat-result` 载荷 type-only 加法字段（零新增 kind：`KIND_SET` 40 / 12 kind / 零宿主逐字不动）+ 结构 `{opId,label,ref?,params?}`** · **5 道校验链**（opId 在册（9 op）→ 三档清分（复用 `tierOf` 单源）→ ref 有效 → param 在 `AskSpec` 内 → 越界/非法**丢弃 + `blocked=` 留痕**）· **判定分层（核心边界）**：`admitCandidate`（接受层：`auto`/`confirm` 接受、`gesture` 拒）与 `pressDecision`（按下层：仅 `auto`，**语义 diff=0**）分离，共享 `tierOf` 单源 ⇒ 解决「`pressDecision` 非 auto 一律 blocked:tier」与「`confirm` 可提案」的张力，**分层而非混同**（`gesture` 连提案都拒）· **确定性注册表退居兜底与安全闸**（未配 ⇒ 纯确定性；未产出 / 非法被拦 ⇒ 确定性产卡；**free-input 终端恒常驻（R8 不回归）**）· **合并**（同单卡位 `MAX_NEXTSTEP_CARDS_PER_ROUND=1` 不动 / 前 N ≤3 / `NEXTSTEP_PRIORITY` 恰 4 不动（AI 骑 `ref-action` 规则位）/ R6 同因去重扩展 / 替换陈旧候选）· **护栏**（六常量同过 / **提案不耗回合预算** / 关断偏好两相涵盖 / 零第二阈值）· **首开保持确定性**（零 LLM 往返依赖）· **`ai-next` provider + `DRIVER_DECLS_SRC` 11↔11 → 12↔12**（DQ-1/DQ-3）· **B 列 SW 优先**（解析 + 校验置 `background`；旁路 sidepanel 档位压力）· **体积分列预算**（A 基线 598,926 B / 距档 **15,474 B** / 生效上限 **628,872**；A 列 Σ +1.3~+3.5 KB（+15% ⇒ +1.5~+4.0 KB）；B 列 +2.0~+5.0 KB 不计账；**2.8× 最坏 ≈9.8 KB（+15% ≈11.3 KB）仍 < 15,474 ⇒ 不触发升档**；冻结面 `content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 **零容差**）· **门禁：新增 1（`ai-next-candidate`）+ 升级 6（`recommendation-sources` ④ 零新 LLM / `NEXTSTEP_PRIORITY` 恰 4 / `DRIVER_DECLS_SRC` 双向包含 11↔11→12↔12 / `op-wiring` 计数 / R6 同因去重扩展 / `driver-timings` 恰 5）+ 保留**；`CHROMIUM_GATES === 9` 不动；保护段 journey `[43484,59347)`（sha `7b309258…`）/ binding `[107780,115930)`（sha `be9ad0e9…`）逐段决策 · **X-ADN-1~11 → 判据等价重写映射表**（已发生 4 / 未发生 4 / 预登记 3）· **N-ADN-001~020 红线编成 + N-ADN-021~030 spec 新增**；R-ADN-001~014 继承 + R-ADN-901~910 新增；**缺口全景 GAP-ADN-01~08 + Q-ADN-001~024 覆盖矩阵 + 根因 A~I 覆盖**；遗留开放点 PD-ADN-001~008；**现状事实核对 §2.4 + 5 条复核订正 COR-ADN-1~5** | 2026-09-26 | SDDU Spec Agent |

