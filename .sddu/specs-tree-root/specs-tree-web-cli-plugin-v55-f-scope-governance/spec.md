# Feature Specification：specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本目录 `discovery.md` v1.0（2026-09-23）——问题清单 **Q-SGO-001~015**（核心 6 / 次要 3 / 潜在 6）/ 假设 **A-SGO-001~010** / 风险 **R-SGO-001~011** / 开放问题 **O-SGO-001~009** / 现状基线 §7.1 A~E（全量 `file:line` 证据）/ 红线继承 **N-SGO-001~023** + 显式取代候选 **X-SGO-1~7** / 门禁影响面预判 §7.3 / 叶拆分草案 §6.3
> **直接输入**: ① 编排指示（2026-09-23，P1 引用事实进回合 / P1′ 范围法则 / P3 工具面 ref 锚定 / P2 任务级批量授权；**P3/P4/P5 已由 R6 `74d76c1` 修复，本 Feature 不重复立项**）② 真机会话全文 **`ty.md`**（1963 行；第一证据，位于 `../specs-tree-web-cli-plugin-v55-self-driven/ty.md`，**本轮入库、零改写**）③ 编排器代作者决策 **D1~D8** + **开放点批量裁定 O-SGO-001~009（2026-09-23 定稿；本规范登记为「已裁决」）** ④ 上游收口总账 `../specs-tree-web-cli-plugin-v55-self-driven/closeout.md`（F-33 三叶 `validated` + 数字总账 + 体积两次升档 + `pending-author-line`）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（web-cli-plugin F-34 / v0.11.1「范围治理：引用即范围」需求规范：父 Feature = 轻量规范容器 + **2 个叶子子 Feature**（依存序）；含编排器对 O-SGO-001~009 九条开放点的逐条裁决落位 + **法则双轨口径** + **范围读数（法九）立法** + **S0′ 首验收场景（`ty.md` 原案重放）机器化口径** + X-SGO-1~7 显式取代的判据等价重写映射 + N-SGO-001~023 红线继承逐条承载 + **体积分列预算表**）

web-cli-plugin v5.5.1「范围治理（scope governance）：引用即范围」需求规范 —— 把编排指示（**引用事实必须进回合 / 引用即范围的法则 / 工具面 ref 锚定 / 任务级批量授权**）与真机证据 `ty.md`（**用户拾取引用 ① → 答「原地翻译为中文」→ AI 把「原地」理解为整页就地替换 → 42 处 `set-text` 全页改写 + 42 张同文案授权卡**）转成可验收的需求：**用户已经用「引用」把范围指出来了，但系统在机制上不知道这件事** —— 引用的事实（id / 文本摘要 / 选择器 / `data-wcli-ref` 标记）**没有进入回合**（回合 `user` 载荷只有答案原文，`sidepanel.ts:329`），提示词里**没有任何范围法则**（`SYSTEM_PROMPT` 静态常量，`service-worker.ts:107-118` 全文无「引用」二字），工具面**没有 `--ref` 锚定参数**（base `dom-tools.ts:462-470` 只认 `--selector`/`--text`），而写入授权是**逐条**的（`ty.md` 实测 42 张同文案卡）⇒ **「用户指的是哪一处」在整个链路上全程不可见**，最终产物是「任务完成、范围远超意图」。

编号一律 `FR-SGO-*` / `NFR-SGO-*` / `EC-SGO-*` / `AC-SGO-*` / `NG-SGO-*`（与 v1/v2/v3/v4/v4.5/v5/v5.5 零冲突）。**父 Feature 定位 = 轻量规范容器**（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**），实施由 **2 个叶**按依存序承接。

**题眼（本 Feature 名 `scope-governance` 的语义）**：v5 把「**下一步是什么**」做成管线强制保证（阻塞终态必有可达 next，死端 = 0）；v5.5 把「**下一步由谁按**」从用户侧转移到系统 / AI 侧（驱动者层 + 确定性引导 + AI 驱动编排 + 法七扩展）。v5.5.1 的题眼 = **「下一步按的范围是什么」** —— 即**把「引用」从产品语言（chip 文案「用引用 1 做原地翻译」，`providers.ts:155-158`）兑现为模型可见事实 + 可判读数**：① 引用事实进回合（结构化载荷 + 系统段）；② 范围法则**双轨**（**机制范围读数 = 判据 / 提示词 = 引导**）；③ 工具面 `--ref <n>` 锚定（plugin 侧包装，**base 零 diff**）；④ 任务级批量授权（**一次用户手势覆盖计划指纹，计划外逐条回落，特权 op 恒不入批**）。

**决定性反证（承 discovery §0.2）**：AI 在 `ty.md:545-551` 用 `dom read-element --selector text*=Peak/Off-Peak --attributes true` **已经读到** `attributes: data-wcli-ref="ref_1"`，并在 `ty.md:563-567` 用 `dom find --selector [data-wcli-ref]` 命中**恰 1 个元素** —— **它仍然没有锚定**，而是继续用 42 个不同选择器覆盖整页 ⇒ 问题**不是「AI 能力不足」，而是「引用事实在链路上不可见 + 提示词没有范围法则 + 工具面无 ref 参数 + 授权逐条」**。本 Feature 的验收锚 = 把这条真机序列**机器化**（§5.9 S0′）。

**与 v5.5 的具体关系（承上、不替下）**：v5.5（F-33，`validated`）与其三叶、R6 快修轮（`74d76c1`）**原样保留、零改写**（D7 / D8 / N-SGO-020）；本 Feature 是**并列补丁级跟进轮**（`-f-` 段承 `v45-f-regularization` 先例，O-SGO-001 ①）。v5.5 的驱动者层 / 悬置任务单源 / 法七扩展终态词表 / 三档 op 清分 / 12 kind / 零宿主 / `KIND_SET` 40 / 法八四面零明文 —— **全部继承为底座，逐条不退化**（N-SGO-009~015）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v55-f-scope-governance（web-cli-plugin v5.5.1「范围治理：引用即范围」，ROADMAP **F-34**） |
| 名称 | web-cli-plugin v5.5.1「范围治理：引用即范围」——① **引用事实进回合**（引用事实结构化载荷 + 系统段组装）② **范围法则双轨**（机制范围读数 = 判据 + 提示词 = 引导；扩大范围须先征询）③ **工具面 `--ref <n>` 锚定**（plugin 侧包装；单节点保证；失配 / 失效 fail-closed 非静默）④ **任务级批量授权**（写入计划 → 一次用户手势覆盖整批；计划外逐条回落；逐条审计保留零明文；中途可中止；特权 op 恒不入批） |
| 优先级 | P0（核心 / 安全） |
| 目标版本 | **v0.11.1**（**全新版本位**，discovery §6.2 本轮实测 `grep -c "v0.11.1"` 全仓 = **0**；**patch 语义** = v0.11.0（F-33）主题的补丁级跟进）；登记留给收口，本阶段 **ROADMAP 零 diff** |
| 命名与版本位语义（**O-SGO-001 已裁决**） | 目录名 **`v55-f-scope-governance`**（`-f-` = 补丁级跟进轮，承 `v45-f-regularization` 先例）+ 版本位 **`v0.11.1`**（patch）；语义显式登记为「**v5.5 主题（引用即下一步）的范围治理补丁级跟进轮**」，见 §11 DC-SGO-001。**不采纳** ② `v56` + `v0.12.0`（偏离编排器给定版本位）、③ 并入 v55 树（与 D7 冲突） |
| 分支 | `feature/web-cli-plugin`（与 v1~v5.5 同分支继续堆；**不合 main、不发布**；**不碰 `main`**） |
| 当前 HEAD（立项时） | `a9b294e`（`docs(sddu): F-34 discovery —— 目录导航（sddu-tree 生成 TREE.md）`，2026-09-23）；本规范为其上的 spec 产物 |
| 上游/底座 | v1 `specs-tree-web-cli-plugin`（F-14）+ v2 `-v2-insight`（F-27）+ v3 `-v3-ui`（F-28）+ v4 `-v4-chat`（F-30）+ v4.5 `-v45-f-regularization`（F-31）+ v5 `-v5-all-in-next`（F-32）+ **v5.5 `-v55-self-driven`（F-33，唯一直接上游，三叶全 `validated`）** —— 全部**只读复用、零改写** |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = **2 个叶**（depth=2，见 §14） |
| 叶子 | ① `specs-tree-v55f-1-ref-context-and-anchor`（**范围底座 / 首叶**：引用事实进回合 + 系统段组装（含法则引导）+ 范围读数（法九）+ `--ref` 锚定（写命令先落）+ 失配非静默 + 留痕 + **S0′ 双向样板**）→ ② `specs-tree-v55f-2-batch-consent`（**末叶**：任务级批量授权：计划指纹 + 一次手势 + 计划外回落 + 逐条审计零明文 + 中途可中止 + 特权不入批 + 批量变体注入必红）**依存序，必须串行**（v55f-2 依赖 v55f-1 的范围读数与锚定底座） |
| 相关干系人 | 作者（插件当前唯一真实用户 + 立项人 + 唯一决策者；**已授权编排器代行决策、全流程自行调度**，D1）；编排器（D2~D8 + **O-SGO-001~009 批量裁定**）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-SGO-001~006（核心）/ Q-SGO-007~009（次要）/ Q-SGO-010~015（潜在）；根因 = 现状基线 §2.3（A~R 各面） |
| 关联风险 | R-SGO-001~011（discovery 继承）+ R-SGO-901~910（spec 新增，见 §15.2） |
| 关联红线 | N-SGO-001~023（discovery §7.2 红线继承）+ **N-SGO-024~030（spec 新增红线，见 §13.2）** |
| 关联取代 | X-SGO-1~7（discovery §7.2 显式取代候选）→ §12 判据等价重写映射表 |

### 1.1 编号命名空间声明（**强制**）

| 命名空间 | 本 Feature 使用 | 历史占用（**零冲突，禁止复用**） |
|---|---|---|
| 功能需求 | `FR-SGO-###` | v1 `FR-001~055`；v2 `FR-V2-*`；v3 `FR-V3-*`；v4 `FR-CHAT-*`；v4.5 `FR-V45-*`；v5 `FR-ALLN-*`；v5.5 `FR-SELF-*` |
| 非功能需求 | `NFR-SGO-###` | v1 `NFR-001~010`；v2~v5.5 `NFR-V2/V3/CHAT/V45/ALLN/SELF-*` |
| 边界情况 | `EC-SGO-###` | v1 `EC-001~026`；v2~v5.5 `EC-V2/V3/CHAT/V45/ALLN/SELF-*` |
| 验收标准 | `AC-SGO-###` | v1 `AC-001~012`；v2~v5.5 `AC-V2/V3/CHAT/V45/ALLN/SELF-*` |
| 非目标 | `NG-SGO-###` | v2~v5.5 `NG-V2/V3/CHAT/V45/ALLN/SELF-*` |
| 目标 / 用户故事 | `G-SGO-###` / `US-SGO-###` | — |
| 裁决记录 | `DC-SGO-###` | v5 `DC-ALLN-*`；v5.5 `DC-SELF-*` |
| spec 新增风险 | `R-SGO-9xx` | v5 `R-ALLN-9xx`；v5.5 `R-SELF-9xx` |
| spec 新增红线 | `N-SGO-024~` | discovery 已占 `N-SGO-001~023` |
| 缺口编号（本规范派生，见 §10.0） | `GAP-SGO-01~09` | — |
| 遗留开放点（spec 未裁决，交 plan / 后续轮） | `PD-SGO-0xx` | — |
| 复核订正（spec 阶段只读复核与 discovery 不一致者） | `COR-SGO-*` | v5.5 `COR-1~3` |
| 沿用 discovery | `Q-SGO-###` / `A-SGO-###` / `R-SGO-0xx` / `O-SGO-###` / `X-SGO-1~7` / `N-SGO-001~023` / `D1~D8` | — |
| 叶内编号（子规范） | `LG-V55F-x-###`（叶目标）/ `LNG-V55F-x-###`（叶非目标）/ `LD-V55F-x-###`（叶裁决） | v5 叶 `LG-V5-x-*`；v5.5 叶 `LG-V55-x-*` |

---

## 2. 上下文

### 2.1 立项来源（**编排指示逐字保留，不得转述走样**）

| # | 指示（逐字 / 提炼自 2026-09-23 编排器转达） | 本规范承载体 |
|---|---|---|
| **P1** | 「**引用事实进回合**：驱动者组合的回合（及手动回合）应把活跃引用事实（id / 文本摘要 / 选择器 / `data-wcli-ref` 标记）注入 LLM 上下文（系统段），让 AI 知道『用户指的是什么』」 | §5.2 **REFCTX**（FR-SGO-010~019）+ AC-SGO-002 |
| **P1′** | 「**范围法则**：提示词立规 ——『用户引用了 N ⇒ 任务范围默认限定于引用目标；扩大范围必须先 ask-user 征询』（**法七式立法？还是提示词约定？**）」 | §5.3 **SCOPE**（FR-SGO-020~028）+ §5.7 **LAW9**（FR-SGO-070~077）；载体 = **双轨**（DC-SGO-002） |
| **P3** | 「**工具面 ref 锚定**：`dom set-text --ref <n>`（读命令是否也加 —— **论证**）；引用解析单节点保证；失配 / 失效非静默口径（EC 家族）」 | §5.4 **ANCHOR**（FR-SGO-030~038）+ EC-SGO-001~004 / 015~017 |
| **P2** | 「**任务级批量授权**：AI 先出写入计划（N 处 目标+原文→译文 清单）→ **一次 consent 覆盖整批**；逐条审计保留（零明文）；中途可中止；非批次写入仍逐条批准」 | §5.5 **BATCH**（FR-SGO-040~050）+ §5.6 **WIDEN**（FR-SGO-060~063） |
| **纪律** | 「载体纪律：批量授权卡尽量复用既有 kind（零新增 kind 优先论证）；三冻结面（content / pick-layer）预期零触碰；体积预算继承现行口径 … **可能触发再次升档 `pending-author-line`**」 | §5.5 FR-SGO-041 / §5.12 **VOL**（FR-SGO-120~125）+ §3.2 NG-SGO-003 / NG-SGO-006 |
| **已修不重开** | 「**已修（R6 `74d76c1`，不重复立项）**：P3 答案双消费 once-语义 / P4 用户输入排队统一 / P5 完成后同动作去重 + 引用改写重评（`text-changed`）」 | §3.2 **NG-SGO-001** 显式排除；仅在 §2.4 作为**现状底座**引用（D8） |

> **口径声明（如实）**：P1/P1′/P2/P3 均为**编排器转述的指示要点**；作者**未**指定实现形态、未指定法则的载体（机制 vs 提示词）、未指定批量授权的范围绑定方式 —— 这些已在 discovery 登记为 `O-SGO-001~009`，**本阶段由编排器代作者批量裁定**（D1 / D2），逐条落位于 §11。**本规范不新增作者未表达的需求**。

### 2.2 真机现场（**第一现场证据；已完成只读诊断，本轮直接引用，不重查**）

**会话（`ty.md`，1963 行，21:28:28–21:32:29，`platform.deepseek.com`）——本 Feature 的母缺陷现场 = S0′ 首验收基准**

```
拾取引用 ①（出生有效，21:28:44）→ ask-user 已答「原地翻译为中文」（21:28:44）
→ 自动成回合（21:28:57，回合 user 载荷 = 答案原文，引用范围【未进回合】）
→ AI 首轮思考 209.1 s → 「按『原地替换（in-place）』的思路，先把要改的文案逐个定位…」（21:29:11）
→ AI 读到 data-wcli-ref="ref_1"（21:29:44）且 dom find [data-wcli-ref] 恰 1 个（21:30:02）
→ 仍然「定位已全部唯一化。现在开始原地写入」（21:31:06）
→ 42 处 dom set-text 全页改写 + 42 张同文案授权卡（21:31:06–21:32:26）
→ 完成交代：「当前页 … 已在原地把界面英文文案改写为中文」+ 15 行改写清单
```

| # | 实测项 | 值 | 复核方式（discovery §0.2，`grep` 实测） |
|:-:|---|--:|---|
| S1 | `dom set-text` **调用**（命令行形态） | **42** | `grep -c "^dom set-text"`（43）− 1 处 AI 叙述行 |
| S2 | `授权申请` 卡 | **42** | `grep -c "^授权申请$"` |
| S3 | `已批准` | **42** | `grep -c "^已批准$"` |
| S4 | 同文案授权理由 | **42** 次逐字相同：「选中『dom：需确认：命中缺省 ask 取向（敏感面）』后本轮按该选项推进」 | `grep -c "需确认：命中缺省 ask 取向"` |
| S5 | `✓ 已设置文本` 成功回执 | **40**（另 1 处 `text=Close` 失败，AI 已如实报告；余 1 处回执未见于所录片段 — **如实登记**） | `grep -c "✓ 已设置文本"` |
| S6 | `dom find` 探测 | **99** | `grep -c "dom find"` |
| S7 | `dom structure` / `snapshot` / `read-element` 探测 | **37 / 3 / 3**（只读探测合计 **≥142**） | 同法逐项 |
| S8 | 会话时长 / 首轮思考 | **≈3 分 45 秒** / **209.1 s** | `ty.md:8,27,1948` |

**关键现场片段（逐字）**

| 位置 | 事实 | 判定 |
|---|---|---|
| `ty.md:24` | `我：原地翻译为中文` ← ★ 回合 `user` 载荷 = 答案原文；**引用范围未进回合** | **✖ Q-SGO-001** |
| `ty.md:92` | 「我按『原地替换（in-place）』的思路，先把要改的文案逐个定位…」 ← ★「原地」被理解为**整页** | **✖ Q-SGO-002** |
| `ty.md:550` | `attributes: data-wcli-ref="ref_1"` ← ★ AI 亲手读到引用标记 | **能力已在** |
| `ty.md:566` | `find "[data-wcli-ref]"：共匹配 1 个元素` ← ★ 恰 1 个（就是引用目标） | **信息未达** |
| `ty.md:1208` | 「定位已全部唯一化。现在开始原地写入（set-text …）」 ← ★ 全页 42 处写入开始 | **✖ Q-SGO-004** |
| `ty.md:1216` | 会发生什么：选中「dom：需确认：命中缺省 ask 取向（敏感面）」… ← ★ 同文案授权卡 ×42 | **✖ Q-SGO-004** |

> **决定性反证（逐字保留）**：`ty.md:545-551` 已读到 `data-wcli-ref="ref_1"`，`ty.md:563-567` 已证恰 1 命中，**仍然没有锚定** ⇒ 问题**不是「AI 能力不足」，而是「引用事实在链路上不可见 + 提示词没有范围法则 + 工具面无 ref 参数 + 授权逐条」**。

> **证据缺口（如实登记，不美化）**：真机**截图 / 录屏未入库**（`ty.md` 为人工转录的**会话文字记录**，作者提供，21:28:28–21:32:29）；外部竞品调研**未执行**（O-SGO-009 已裁决「不需要」）；门禁计数**全部引自 R6 记录**（本轮零产品运行时验证，未跑 `npm test` / Chromium / build）；编排指示约数（「~60 探测 / 35 写入 / 35 卡」）与本轮 `grep` 实测（**≥142 探测 / 42 写入 / 42 卡**）的差异**已登记**（discovery §0.2）；「同类范围漂移是否在其它会话命中」**未统计**（无历史会话库）。**本规范不声称**有截图证据；S0′ 的机核部分全部**机器可验**，人工观感项逐项标注 `⏳ 未执行`，**不冒充 PASS**。

### 2.3 代码根因映射（discovery §1.1 / §7.1 逐条 `file:line`；本规范只读复核沿用）

| # | 根因（要点） | 仓库侧证据（`file:line`） | 本规范承载 |
|:-:|---|---|---|
| **A** | **回合载荷只有 `user`**（唯一回合载荷）⇒ 引用事实**物理缺失** | `sidepanel.ts:329` `send(makeMessage('chat', { user: trimmed }))`；`service-worker.ts:887` `runChat(s, user)`（裸字符串）；`:943` `system: SYSTEM_PROMPT`；`:948` `[{role:'system',content:system},...turns]` | FR-SGO-010~015 / X-SGO-1 |
| **B** | **系统段 = 静态常量 `SYSTEM_PROMPT`**（全文无「引用」/「范围」条款） | `service-worker.ts:107-118`（条款仅：工具说明 / 尊重授权 / 不泄密 / 失败必报 / 未授权指引） | FR-SGO-016~017 / X-SGO-2 |
| **C** | **base `dom` 工具零 `ref` 参数**；`set-text` 只认 `--selector`/`--text`；`set-text` 属 **write 组**（缺省 ask） | `packages/web-cli-base/src/dom-tools.ts:462-470`（set-text 分支）· `:99-103`（`SUBCOMMANDS`）· `:763`（`'set-text':'write'`）· `packages/web-cli-base/src/permission.ts:16,157,333`（缺省 ask + 理由串逐字） | FR-SGO-030~038 / X-SGO-3 |
| **D** | **锚点其实已存在**：`data-wcli-ref` = refId，写在捕获时的**单一节点**上（**best-effort**） | `content/ref-capture.ts:67`（`REF_MARK_ATTR`）· `:370`（`el.setAttribute(REF_MARK_ATTR, refId)`）· `:372`（frozen / SVG 可能写不上）· `:409`（观察回报 `refMark`）；`ty.md:566` 实测恰 1 | FR-SGO-030~033 / EC-SGO-001~003 |
| **E** | **跨进程断层**：引用表在**面板**（`l1/ref-store.ts`），工具调用在 **SW**（`service-worker.ts:951` `s.host.dispatch`）⇒ SW **不持有** refId→节点映射 | `service-worker.ts:951` + 面板 `l1/ref-store.ts`（面板 bundle） | FR-SGO-019 / FR-SGO-031 |
| **F** | **插件侧工具条目包装先例**（覆写 `schema` + 替换 `executor`，基线 `baseExecutor` 仍被调用） | `src/tools/chrome-host.ts:206-235`（`wrapChromeEntryForHost`）· `src/tools/browser-tools.ts:1-40`（`createDomToolEntry` + 「risk 永不放宽」纪律） | FR-SGO-031~032 / X-SGO-3 |
| **G** | **逐条授权链路**：base 权限门 `ask` 档 → plugin `createConfirmBridge`（fail-closed + 单条摘要 + 审计）→ SW `confirm-request` → 面板 `confirm` → **既有 `auth` 卡** | `security/confirm.ts:84-156`（`:22-31` 单条摘要；`:112-143` 审计）· `service-worker.ts:634-644` · `sidepanel.ts:3837-3845` · `chat-state.ts:616-622`（`kind:'auth'`，12 kind 之一） | FR-SGO-040~050 / X-SGO-4 |
| **H** | **引用事实结构已现成**（`RefFacts` + 投影），无需新造真值源 | `l1/ref-validity.ts:116-129`（refId/selector/semanticPath/textDigest/origin/documentId/navSeq/declarationHash/capturedAt）· `:139-146`（`refMark`/`nodeCount`）· `l1/ref-store.ts:140-142`（`refNum`/`refLabel`/`refState`）· `:33`（`TEXT_DIGEST_MAX = 80`）· `:241`（截断） | FR-SGO-010~013 / FR-SGO-021 |
| **I** | **引用判定 = 3 结果（fail-closed）+ 6 维度** | `l1/ref-validity.ts:1-60` + `:80`（R6 `text-changed`） | FR-SGO-018 / FR-SGO-072 / X-SGO-5 |
| **J** | **留痕只含字段名 / 不含值** | `next-registry/ai-drive.ts:85`（注释逐字「只含**字段名**，**不含任何值**」）；真机例 `ty.md:21` 逐字：`driver=ref-action · timing=answered · evidence=ref.validCount,ref.latestRefNum` | FR-SGO-080~084 |
| **K** | **主流程调用点计数门禁**：`requestTurn(` **恰 2**；`maybeRecommend(` 恰 7；`nextAfterSettle` 单入口 | `sidepanel.ts:304`（定义）· `:3581`（composer）· `:3608`（`op.turn` 槽）· `:1983`（`nextAfterSettle`）· `:2011-2050`（`driveAnsweredTurn`）；门禁 `test/op-wiring.test.ts:128-133,297` | FR-SGO-006 / FR-SGO-014 / FR-SGO-028 / X-SGO-7 |
| **L** | **载体冻结面**：`KIND_SET` 40 逐字 / 12 kind / 零宿主；**type-only 先例家系已存在** | `background/messaging.ts:103-141`（40）· `:68-97,110-117`（`ChatResultVariant` 注释逐字「a `variant` value, never a `KIND_SET` kind … the type union is erased by the compiler and costs **zero runtime bytes on every face**」）· `stream-model.ts:51-73`（12 kind）· `host-registry.ts:105`（`REGISTERED_STRUCTURAL_HOSTS = []`） | FR-SGO-010 / FR-SGO-041 / X-SGO-1 |
| **M** | **红线⑥（consent 不得被 AI 代答）可机核 + 特权 op 恒 gesture** | `test/supersession-ledger.test.ts:2266`（`RL-06-consent-no-proxy` + `expectFailPattern`）· `:2339-2347`（`tierOf` + `pressDecision` 实判据）· `test/op-three-tier.test.ts:332,372-383`（OT-⑩ + 注入反证）· `next-registry/ops.ts:24,307,317` · `test/capability-wiring.test.ts:51-58`（「SW 永不调用 `.request(`」） | FR-SGO-043~045 / FR-SGO-049 / X-SGO-4 |
| **N** | **base 零 diff 红线（可机核）** | `test/insight-no-escalation.test.ts:147`（`assert.equal(gitDiffStatus(['../web-cli-base']), 0, …)`；注释「base 零改动」红线，2026-09-14 仅放行**性能修复**） | FR-SGO-031 / N-SGO-007 / X-SGO-3 |
| **O** | **既有 EC 口径**（未找到 ≠ 错误；多匹配按首元素）不足以表达「引用锚定失败」 | `ty.md:596,604`（EC-001）· `ty.md:521`（EC-002）· `dom-tools.ts:105` | EC-SGO-001~004 / FR-SGO-034 |
| **P** | **体积 / 冻结面三值 + 未闭合义务** | `test/size-baseline.ts:351`（`SIDEPANEL_BASELINE_BYTES = 578_623`）· `:506`（`SIDEPANEL_FINAL_ARTIFACT_BYTES`）· `:522`（R6 登记：档位 **614,400** / 绝对上限 **675,840** / 生效上限 `floor(578,623×1.05) = 607,554`）· `:406,2703` 邻域（`CONTENT_MAX_BYTES = 177,076`）· `:2510-2516`（`PICK_LAYER_* = 34,358`）· `authorConfirmation = pending-author-line` | FR-SGO-120~125 / N-SGO-001~004 |
| **Q** | **法七扩展门禁形态（可复用为法则判据）**：双向反证 + 三段控制禁恒真 + 真源切片 | `test/law7x-ext.test.ts`（`:79` `readingOf`；`:151` `patchBranch` 真源注入；`DRIVER_DECLS_SRC` 单源）· `test/ui/no-dead-end.mjs`（49，注入必红） | FR-SGO-071~077 / X-SGO-6 |
| **R** | **法八四面零明文机核**（①流内 payload ②digest ③审计面 ④DOM value / 全部属性；每面一个 `expectFailPattern`） | `test/ui/law8-plaintext.mjs:56-61,231,383`（`FACES` 4 项）· `cards/auth.ts` 头注释（预演 = **静态三段模板**；动态生成有把参数写进 trace 的风险） | FR-SGO-046 / FR-SGO-050 / N-SGO-011 / X-SGO-4 |

### 2.4 现状事实核对（**spec 阶段只读复核，零运行时验证**）

> **口径**：下表为本轮（spec 阶段）对 discovery §7.1 基线的**只读复核**（`grep` / `sed` / 类型与集合读取），**未跑任何门禁 / 构建 / Chromium**。凡与 discovery 表述不一致者，在「复核订正」逐条如实登记。

#### A. 回合与系统段面（对象 = Q-SGO-001 / 002 / 006 / 007）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| A1 | `chat` 载荷**只有 `user`**（唯一回合载荷） | `sidepanel.ts:329` 逐字命中 | FR-SGO-010~014 |
| A2 | `runChat(s, user)` 收**裸字符串**；系统段 = 静态常量 | `service-worker.ts:887` + `:943` + `:948` | FR-SGO-015~016 |
| A3 | `SYSTEM_PROMPT` 全文**无「引用」/「范围」条款**（5 条条款逐字核对） | `service-worker.ts:107-118` | FR-SGO-016~017 / FR-SGO-020~022 |
| A4 | `requestTurn(` **恰 2**（入口定义 + composer）；`op.turn` 槽复用同一入口 | `sidepanel.ts:304` / `:3581` / `:3608`；门禁 `test/op-wiring.test.ts:128-133` | FR-SGO-014 / X-SGO-7 |
| A5 | 驱动者自动成回合（`nextAfterSettle({kind:'answered'})` → `driveAnsweredTurn`）；悬置 `instruction` = 用户原话 | `sidepanel.ts:1983,1990,2011-2050`；`next-registry/drivers.ts:258,281` | FR-SGO-013 |
| A6 | 留痕**只含字段名不含值**（引用事实值不在留痕里） | `next-registry/ai-drive.ts:85` + `ty.md:21` | FR-SGO-080~083 |
| A7 | `RefFacts` 字段集（9 + 可选）；`textDigest` = **截断 80 字的页面文本**（**非哈希**） | `l1/ref-validity.ts:116-129` + `l1/ref-store.ts:33,241` | FR-SGO-011~012 / FR-SGO-018 |
| A8 | 引用判定 3 结果（valid / invalid / unknown，**fail-closed**）+ 6 维度 + R6 `text-changed` | `l1/ref-validity.ts:1-60,80` | FR-SGO-018 / FR-SGO-072 |
| A9 | 引用标记 `data-wcli-ref` = refId（**单节点**；best-effort 写） | `content/ref-capture.ts:67,370,372,409` | FR-SGO-030~033 / EC-SGO-003 |
| A10 | R6 反向通道（写后重评）已存在：`dom set-text` 成功携带 `targetSelector` → 面板只读重观测 → 重判 | `service-worker.ts:976-988` + `sidepanel.ts:2515-2536` | FR-SGO-038（复用同一只读观测面） |

#### B. 工具面（对象 = Q-SGO-003）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| B1 | base `dom` 工具**零 `ref` 参数**；`set-text` 只认 `--selector`/`--text` | `packages/web-cli-base/src/dom-tools.ts:462-470`（参数面 `grep` `ref` = 0 命中） | FR-SGO-030 |
| B2 | `set-text` 属 **write 组**（缺省 ask；理由串逐字） | `dom-tools.ts:763` + `packages/web-cli-base/src/permission.ts:16,157,333` | FR-SGO-030 / FR-SGO-048 |
| B3 | 包装先例可覆写 `schema` + 替换 `executor`，基线 `baseExecutor` 仍被调用 | `src/tools/chrome-host.ts:206-235` | FR-SGO-031~032 / X-SGO-3 |
| B4 | 「risk / `subcommandRisks` **永不放宽**」为既有纪律（头注释） | `src/tools/browser-tools.ts:1-40` | FR-SGO-032 / N-SGO-007 |
| B5 | SW 侧工具分发点（**SW 不持有引用表**） | `service-worker.ts:951` + 面板 `l1/ref-store.ts` | FR-SGO-019 / FR-SGO-031 |
| B6 | 既有 EC-001 / EC-002 口径**不足以**表达「引用锚定失败」 | `ty.md:521,596,604` | EC-SGO-001~004 |

#### C. 授权 / 批量（对象 = Q-SGO-004 / 005）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| C1 | confirm 桥（fail-closed）+ 单条摘要 + 审计（ask / allow / deny） | `security/confirm.ts:84-156`（`:22-31` 摘要 / `:112-143` 审计） | FR-SGO-040 / 046 / 049 |
| C2 | SW → 面板 confirm 请求 / 应答（`confirm-request` 属既有 kind） | `service-worker.ts:634-644` + `sidepanel.ts:251,3837-3845` | FR-SGO-041 |
| C3 | `confirm` → 既有 **`auth` kind**（12 kind 之一，**零新增**）；6 终态含 `cancelled` | `chat-state.ts:616-622` + `stream-model.ts:51-73` + `cards/auth.ts:43-56`（`decisionState` 含 `cancelled`） | FR-SGO-041 / 047 / X-SGO-4 |
| C4 | `auth` 卡 = **固化文案 / 静态三段预演模板**（动态生成有破法八风险） | `cards/auth.ts:56-130`（`authFixedText` / `template#l1-consequence-tpl`） | FR-SGO-050 / N-SGO-011 |
| C5 | 红线⑥ + 特权手势**可机核**（`tierOf` + `pressDecision` + 注入反证） | `test/supersession-ledger.test.ts:2266,2339-2347` + `test/op-three-tier.test.ts:332,372-383` | FR-SGO-043~045 / 049 / N-SGO-006 |
| C6 | 真机批量事实：42 调用 / 42 卡 / 42 批准 / ≈3 分 45 秒 | `ty.md:1208-1860` + 本规范 §2.2 S1~S8 | S0′（§5.9） |

#### D. 流 / 卡 / 宿主 / 门禁契约（对象 = Q-SGO-010 / 013 / 014）

| # | 事实 | 证据（本轮复核） | 本规范用途 |
|:-:|---|---|---|
| D1 | `KIND_SET` **恰 40 项逐字**；**type-only 先例家系已存在** | `background/messaging.ts:103-141` + `:68-97,110-117` | FR-SGO-010 / 041 / N-SGO-009 |
| D2 | 12 kind 契约（7 主类 + 5 过程卡）；零新增流内固定宿主 | `stream-model.ts:51-73` + `host-registry.ts:105`（`Object.freeze([])`） | FR-SGO-041 / N-SGO-010 |
| D3 | 法八四面（①流内 payload ②digest ③审计面 ④DOM value / 全部属性），每面一个 `expectFailPattern` | `test/ui/law8-plaintext.mjs:56-61,231,383` | FR-SGO-046 / 050 / N-SGO-011 |
| D4 | 法七扩展门禁形态：四类逐类五段 + **双向反证** + **三段控制禁恒真**（`ok`/`violated`/`n/a`）+ 真源切片 | `test/law7x-ext.test.ts:79,151`；`DRIVER_TERMINALS` 恰 4（`terminals.ts:41`），与 `STREAM_TERMINALS`（6）**正交**（`:73`） | FR-SGO-070~077 / X-SGO-6 |
| D5 | `gate-integrity`：`CHROMIUM_GATES === 9` **不动**；node 门禁下界**只增不减**；`law7x-ext` 已入受审集合 | `test/gate-integrity.test.ts:224-244,286-298`（「本轮零新增 Chromium 门禁文件，`law8` / `stream` 只加断言不加文件」） | FR-SGO-072 / 077 / 115 / N-SGO-017 |
| D6 | 主流程调用点计数门禁 + 反证件（新增第 3 个 `requestTurn(` ⇒ 必红） | `test/op-wiring.test.ts:128-133,297` | FR-SGO-014 / X-SGO-7 |
| D7 | 判定链冻结面（`zeroDiffFiles` 9 项）+ 保护 pin（journey `43054..58287` / 240 行；binding `107780..115930`；`decision = keep`） | `docs/v3-supersession-ledger.json#zeroDiffFiles`；`docs/v4-supersession-ledger.json#protectedRanges` | FR-SGO-113 / N-SGO-008 / 016 |

#### E. 体积与冻结面（**本轮只读复核 / 引自 R6 登记**）

| # | 项 | 值 | 来源（本轮复核） |
|:-:|---|---|---|
| E1 | `dist/content.js` | **177,076 B**（sha `52a82620…`，**零容差**） | `test/size-baseline.ts:2703` 邻域 + R6 登记 |
| E2 | `dist/pick-layer.js` | **34,358 B**（sha `77796bab…`，**零容差**） | `test/size-baseline.ts:2510-2516` |
| E3 | `dist/sidepanel.js` 登记基线 | **578,623 B** | `test/size-baseline.ts:351,506,519`（R6 登记，2026-09-23） |
| E4 | 生效上限（公式） | **607,554 B** = `floor(578,623 × 1.05)`；容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` = **`record-only`** | 计算 + `test/size-baseline.ts:522,581` |
| E5 | **余量** | 距生效上限 **28,931 B**；**距档位 35,777 B**；距绝对上限 **97,217 B** | 计算（614,400 − 578,623 = 35,777；675,840 − 578,623 = 97,217） |
| E6 | 档位 / 绝对上限 / 授权线 | **614,400 B** / **675,840 B** / `authorConfirmation.status = pending-author-line`（**未闭合义务，不得伪称已确认**） | `test/size-baseline.ts:522` + v55 closeout §5 / §8 第 12 条 |
| E7 | `KIND_SET` 项数 | **40**（逐字，R6 后未增） | `messaging.ts:103-141` |
| E8 | 构建入口 → 产物映射（**决定体积分列**） | `dist/sidepanel.js` ← `src/ui/sidepanel/**`；`dist/background.js` ← `src/background/service-worker.ts`（含 `src/tools/**` 与 `src/security/confirm.ts`）；`content.js` / `pick-layer.js` = 冻结 | `build.mjs:51,58,69,76,85` |
| E9 | 门禁计数（**引自 R6 记录，本轮未复跑**） | `npm test` **1330** · journey **171** · binding **192** · s0-self-driven **59** · density 242 · page-input 118 · l0 248 · l1 120 · l2 74 · law8 36 · dead-end 49 · auth-chip 37 · stream 76 · ask-auth 78 · hardening 24 · insight 116 · e2e PASS · design-contract 60 · supersession 37 · zero-injection 28 · recommendation 72 · l1-reverse 9 · l2-reverse 10 | `docs/r6-ty-experience-fix-2026-09-23.md:147-163`（**R6 后**；本轮未跑门禁） |

#### 复核订正（**spec 阶段只读复核与 discovery 表述不一致者，逐条如实登记**）

| # | discovery 表述 | 本轮复核 | 处置 |
|---|---|---|---|
| **COR-SGO-1** | discovery §7.1-A2 将系统段注入记作 `:943` + `:948` | 复核 `:943` = `system: SYSTEM_PROMPT`（`runChatTurn` 实参）；`:948` = `[{ role: 'system', content: system }, ...turns]` —— **两处表述均正确**，无订正（登记以免后续被读成「两处注入点」） | 无（如实登记） |
| **COR-SGO-2** | discovery §7.1-E1 将 `CONTENT_MAX_BYTES` 记作 `test/size-baseline.ts:2703` | 复核：`2703` 邻域确为 `CONTENT_MAX_BYTES` 声明区（**值 177,076**）；同一文件 `:406` 亦含 content 冻结注释 ⇒ 引用时**以量值 + sha 为准**，不单以行号 | **引用口径收口**（FR-SGO-123） |
| **COR-SGO-3** | discovery §7.1-E4 记「生效上限公式 = floor(baseline × 1.05)」 | 复核 `test/size-baseline.ts:522` 逐字：`floor(578,623 × 1.05) = 607,554`，且 `SIDEPANEL_CEILING_CAP` 为**纯记录字段**（`:581`「本轮起**不再作为停工/放行判据**」）⇒ **判定无 cap，公式唯一**（承 V3-VOL-1 裁决） | 订正为「**判定 = 公式唯一**」（FR-SGO-120 / N-SGO-003） |
| **COR-SGO-4** | discovery §6.3 叶名建议 `specs-tree-scope-1-ref-context-and-anchor` / `specs-tree-scope-2-batch-consent` | 复核 v55 叶命名惯例（`specs-tree-v55-1-driver-layer`）⇒ 本 Feature 叶名统一为 **`specs-tree-v55f-1-ref-context-and-anchor`** / **`specs-tree-v55f-2-batch-consent`**（保留 `v55f` 前缀以配对父目录的 `-f-` 语义，承 COR-SGO-4 与 DC-SGO-001） | 订正（§14.1） |
| **COR-SGO-5** | discovery §7.2 N-SGO-016 记「保护 pin：journey `43054..58287` / sha `cc79f413…` / 240 行；binding `107780..115930` / `be9ad0e9…`」 | 复核台账键名 = `docs/v4-supersession-ledger.json#protectedRanges`（v55 保段）；**未复算 sha**（本轮未跑门禁）⇒ 引用时**以台账为准**，数字**承 discovery 逐字** | 无（如实登记「未复算」） |

### 2.5 编排器代作者决策承接（**定论，直接作为需求约束，不重新讨论**）

| # | 决策 | 本规范承载 |
|---|---|---|
| **D1** | 作者已授权编排器代行决策、SDDU 全流程自行调度 | 全篇（`O-SGO-*` 批量裁决 = §11） |
| **D2** | 本轮不访谈作者基本框架；开放点收集后附推荐，**由 spec 批量裁决** | §11 DC-SGO-001~009（status 一律 `ruled`） |
| **D3** | Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-scope-governance/` | §1 元数据 |
| **D4** | ROADMAP 编号 = **F-34**（实测零占用） | FR-SGO-001 |
| **D5** | 版本位 = **v0.11.1**（实测零占用）；ROADMAP 零 diff，登记留收口 | FR-SGO-001 |
| **D6** | 纪律：`.sddu/**` 只写本 Feature 目录；不改 `src/` `test/` `dist/` `design/` `docs/` `ROADMAP.md` | FR-SGO-003 / §16 第 1 条 |
| **D7** | 不上溯改写 v55 / R6 产物（并列新主题） | FR-SGO-005 / NG-SGO-011 / N-SGO-020 |
| **D8** | P3/P4/P5 已由 R6 `74d76c1` 闭环，**不重复立项** | NG-SGO-001 / §2.4 A10（仅作现状底座） |

### 2.6 目标用户

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2/v3/v4/v4.5/v5/v5.5 同一事实基础。**本规范不编造用户调研数据**。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 本 Feature 的应答 |
|---|---|---|---|
| **作者（唯一真实用户）** | 真机侧栏：拾取引用 ① → 答「原地翻译为中文」 | ①（意图，逐字）「**原地**翻译为中文」——他用的是**指称**（「这里 / 原地」），系统把它读成了**全局**（`ty.md:92`）②（后果，逐字）完成交代：「**当前页 … 已在原地把界面英文文案改写为中文**」+ 15 行清单（用户只想要 1 处）③（成本，逐字）**42 张**同文案授权卡逐条点击 | **范围默认回到引用目标**（FR-SGO-020）+ **写前可否决计划**（FR-SGO-040） |
| **作者（授权判断场景）** | 面对第 N 张「dom：需确认：命中缺省 ask 取向（敏感面）」卡 | 卡上只有**单条**命令摘要（`confirm.ts:22-31`），**没有「这一批将要写什么」**；42 张卡**逐字相同**（除选择器） | **一次手势覆盖计划内全部**（FR-SGO-040~043）+ 计划外逐条回落（FR-SGO-044） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种『引用范围内的动作』，要改哪些文件？」 | 现状 = 回合载荷（恰 1 个 `user`）+ 静态 `SYSTEM_PROMPT` + base 工具参数面（无 ref）+ 逐条 confirm 桥 ⇒ 范围语义**无处安放** | **读数单源 + 载荷 type-only 字段 + plugin 侧包装**（FR-SGO-024 / 010 / 031） |

### 2.7 与上游 / 下游 Feature 的关系（**边界**）

| 关系 | Feature | 本规范的处置 |
|---|---|---|
| **只读复用（零改写）** | v1 / v2 / v3 / v4 / v4.5 / v5 / **v5.5（含三叶）** | 全部 `validated` 产物**原样保留**；本 Feature 是**并列补丁级跟进轮**（D7 / N-SGO-020） |
| **直接底座** | **v5.5 F-33 三叶** | 驱动者层（`drivers.ts`）/ 悬置单源（`suspension.ts`）/ 法七扩展终态词表（`terminals.ts` 恰 4）/ 三档 op 清分（`tierOf`）/ 护栏三件套 / 12 kind / 零宿主 —— **逐条不退化**（N-SGO-009~015） |
| **已修不重开** | **R6 快修轮 `74d76c1`** | P3/P4/P5（答案 once 语义 / 用户输入排队统一 / 完成后同动作去重 + 引用改写重评）**显式排除**（NG-SGO-001 / D8）；`reobserveAfterWrite` 仅作**可复用的只读观测面**引用（FR-SGO-038） |
| **未立项不动** | **F-29（A2A 候选）** | 保持原样不动（N-SGO-019 / NG-SGO-012） |
| **下游** | @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate | 父（depth=1）= 轻量容器（不承接 build/review/validate）；实施由 2 叶承接（§14） |

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 | 判据锚 |
|---|---|---|
| **G-SGO-001** | **把「引用」从产品语言兑现为模型可见事实**：凡回合（驱动者自动成回合 + 手动回合）携带**活跃引用事实**（id / 序号 / 文本摘要 / 选择器 / `data-wcli-ref` 标记 / 可判定状态），使「用户指的是什么」**可判命中** | AC-SGO-002 / S0′-3 |
| **G-SGO-002** | **「引用即范围」成为机制可判事实**：范围读数（`in-scope` / `out-of-scope-authorized` / `out-of-scope-unauthorized` / `no-ref`）**单源可读、可机核、双向反证**；提示词只承担**引导**（双轨） | AC-SGO-003 / 法九门禁 |
| **G-SGO-003** | **写动作可按引用锚定**：`--ref <n>` → `[data-wcli-ref="ref_n"]`，**单节点保证**；失配 / 失效 **fail-closed 且非静默** | AC-SGO-007 / EC-SGO-001~004 |
| **G-SGO-004** | **授权从「连点」回到「判断」**：AI 先出**写入计划**，**一次用户手势**覆盖计划指纹；计划外**逐条回落**；**特权 op 恒不入批** | AC-SGO-005 / FR-SGO-040~045 |
| **G-SGO-005** | **扩大范围走正向路径而非禁止**：写前 `ask-user` 二择，用户确认 = **范围扩张的可判事实**（入留痕） | AC-SGO-003 / FR-SGO-060~062 |
| **G-SGO-006** | **收口真机证据为一条可机核样板**：S0′（`ty.md` 原案重放）含**双向反证**（无范围注入 ⇒ 机制读数为空必红） | AC-SGO-001 / AC-SGO-013 |
| **G-SGO-007** | **零新增载体**：批量卡复用 `auth` kind；载荷走 type-only；`KIND_SET` 40 / 12 kind / 零宿主**逐字不动** | AC-SGO-006 |
| **G-SGO-008** | **体积可管理**：先出**分列预算 + 15% 缓冲**，再排落地；升档走 **EC 显式路径 + 作者一行** | AC-SGO-009 / AC-SGO-024 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 | 理由（来源） |
|---|---|---|
| **NG-SGO-001** | **P3/P4/P5（R6 已修）**：答案双消费 once 语义 · 用户输入排队统一 · 完成后同动作去重 · 引用改写后重评（`text-changed`） | D8：R6 `74d76c1` 已闭环（`docs/r6-ty-experience-fix-2026-09-23.md`）；**不重开、不改写其产物** |
| **NG-SGO-002** | `src/content/**`（`content.js`）/ `pick-layer.js` 的**语义改动** | 字节冻结红线：**177,076 B** / **34,358 B**（**零容差**，N-SGO-001/002）；引用标记的**写入**已存在，本 Feature 只**消费** |
| **NG-SGO-003** | **`packages/web-cli-base/**` 的任何改动**（含「顺手加个参数」） | 硬红线：`test/insight-no-escalation.test.ts:147` 机核**零 diff**（历史仅放行性能修复一次）⇒ `--ref` 走 **plugin 侧包装**；**解冻须作者放行** |
| **NG-SGO-004** | **特权 op（`op.authorize` / `op.perm.request`）的发起方式** | 红线：特权 op **恒 gesture**、**AI 不可代答**（`ops.ts:24` / `test/capability-wiring.test.ts:51-58` / `RL-06` / OT-⑩）；批量授权**不得**成为绕过面 |
| **NG-SGO-005** | **判定链（`src/security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面触碰** | 硬底线：`docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项内容哈希 pin）；批量授权走**既有 confirm 面**（`confirm.ts` 不在冻结集），**不得**触碰策略档位裁决 |
| **NG-SGO-006** | **法八（零明文）放宽** | `test/ui/law8-plaintext.mjs`（36 断言）必绿：批量授权卡 / 计划清单**不得**把**凭据值**写进流内 payload / digest / 审计 / DOM 四面 |
| **NG-SGO-007** | **12 kind 卡类型学新增（第 13 种）** | v5 已固化「零新增卡类型」；批量授权卡**复用既有 `auth` kind**（零新增 kind 优先论证） |
| **NG-SGO-008** | **零宿主判据（`REGISTERED_STRUCTURAL_HOSTS = []`）回退** | v4.5 清零的判据不得回退；批量计划**不得**新增流内固定容器 |
| **NG-SGO-009** | **`KIND_SET` 增长**（新消息 kind 进 `content.js`） | 零容差（N-SGO-009）；新载体一律走 **type-only 先例**（`messaging.ts:68-97`） |
| **NG-SGO-010** | **读命令 `--ref`（`read-element` / `structure`）本阶段落地** | 编排裁决 ④「**先落写命令 set-text**；读命令登记后续裁决」（§8 PD-SGO-001） |
| **NG-SGO-011** | **v5.5 / R6 产物（父 + 三叶 + R6 记录与体积登记）的改写** | D7 / N-SGO-020：全部原样保留 |
| **NG-SGO-012** | **F-29（A2A 候选）** | 未立项未排期，保持原样不动（N-SGO-019） |
| **NG-SGO-013** | **「每回合自动做一次只读重观测」** | 会引入每回合一次页面探测（性能与 token 成本）；本阶段用**回合已有的引用事实**（§8 PD-SGO-002） |
| **NG-SGO-014** | **「把引用拼进 `user` 文本」的载荷形态** | 污染用户可见行 + 与「我」行留痕语义冲突（O-SGO-003 ② 未采纳） |
| **NG-SGO-015** | **硬禁止越界**（「有引用就不许动别处」） | 过度约束（Q-SGO-011）：正当全页任务会被卡住；必须留正向路径（§5.6） |
| **NG-SGO-016** | **把法则只写成提示词**（唯一判据 = 提示词） | Q-SGO-010 / O-SGO-002 ③ 未采纳：零机核 ⇒ 改一行提示词即静默失效 |
| **NG-SGO-017** | **时间窗内同范围自动放行** | O-SGO-005 ② 未采纳：时间与范围都难判，且实质弱化红线⑥ |
| **NG-SGO-018** | **外部竞品调研** | O-SGO-009 已裁决「不需要」（有仓库内 S2 / S0 / `law7x-ext` / `auth` 卡先例 + 作者指示为最高价值源） |
| **NG-SGO-019** | **安装期静态权限 / `manifest` 静态面 / 存储加密 / 会话分组收编 op** | 与本问题域无耦合（v5 `PO-ALLN-001` deferred 保持） |
| **NG-SGO-020** | **放宽或删除任何既有断言 / 阈值 / 冻结值**（含 `law8` 36 降级、保护段静默改写） | N-SGO-015：替换必须**等价重锚**（断言力不降、计数只增）并留台账 |
| **NG-SGO-021** | **伪称体积档位已确认**（`authorConfirmation` 改写） | N-SGO-023：`pending-author-line` 属**未闭合义务** |
| **NG-SGO-022** | **在 plan 之前排「全量落地」** | R-SGO-006 / v5 教训（plan Σ 低估 **2.8×**；v55 三叶超预算 +6,015 / 超上界 +915；R6 +5,199） |

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|-------|---------|-------|
| **US-SGO-001** | 作者 | 拾取引用后直接说「原地翻译为中文」，AI 就只改**那一处** | 不必再看 42 张卡、也不必事后从清单里发现范围跑偏 |
| **US-SGO-002** | 作者 | 确需整页时，AI 先问我「仅引用范围内 / 整页」 | 我的意图被承认，且**我**决定范围 |
| **US-SGO-003** | 作者 | 面对批量写入时，先看到**一份计划**（哪里 / 原文 → 译文） | 在写之前就能**否决计划本身**，而不是在第 42 次点击里才察觉 |
| **US-SGO-004** | 作者 | 一次手势覆盖整批计划，计划外的额外写入仍需我逐条批准 | 少点 41 次，但不放弃安全边界 |
| **US-SGO-005** | 作者 | 中途能中止批量，且中止后的**部分完成**如实记下 | 我知道已经改了什么 |
| **US-SGO-006** | 作者 | 引用目标已消失 / 失效时，AI 明确告诉我而不是悄悄换目标 | 不会出现「改了别的地方」 |
| **US-SGO-007** | 作者 | 引用失效 / 不在范围内时，AI 不把只读证据当成写授权 | 证据与范围不混淆 |
| **US-SGO-008** | 维护者 | 新增一种「引用范围内的动作」时，只需在**一个读数源** + 一个载荷字段上扩展 | 范围语义有固定安放处，不靠碰巧 |
| **US-SGO-009** | 维护者 | 「本次是否越界 / 是否已征询」可从留痕读出 | 事后可判、可回归（修了不会再退化） |
| **US-SGO-010** | 审查者 | 能通过一条可机核样板（含双向反证）证明范围受限 | 不靠人工观感判断「这次没有越界」 |

---

## 5. 功能需求 (FR)

> 编号 `FR-SGO-###`；每条**可测试**；P0 = 本 Feature 必需，P1 = 必需但可在同叶内后置，P2 = 记录性（门禁 / 台账）。**FR → 叶覆盖矩阵见 §14.3。**

### 5.1 GOV — 立案、结构与纪律（横切）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-001** | 本 Feature 登记为 **F-34 / v0.11.1**（patch 跟进轮），目录名 `specs-tree-web-cli-plugin-v55-f-scope-governance`；**ROADMAP 零 diff**（登记由收口承接） | §1 元数据齐备；`git diff --stat -- .sddu/specs-tree-root/ROADMAP.md` = 0 | P0 |
| **FR-SGO-002** | 父 Feature = **轻量规范容器**（不承接 build/review/validate、不产 tasks.json）+ **2 叶（依存序串行）**；叶目录**直接嵌套**（`specs-tree-v55f-1-*` / `-v55f-2-*`），**禁止 `children/` 中间层** | §14.1/§14.2 结构裁决齐备；state.json `childrens` 恰 2 项 | P0 |
| **FR-SGO-003** | 纪律：`.sddu/**` 只写本 Feature 树；spec 阶段**零改动** `src/` `test/` `dist/` `design/` `docs/` 与 `ROADMAP.md` | `git status --short` 仅本 Feature 目录（+ 已入库的 `ty.md`） | P0 |
| **FR-SGO-004** | 命名空间声明（§1.1）齐备；**断言零删除零降级、门禁计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 每条 AC 有唯一 ID；门禁对账表（§9.5）无减少项 | P0 |
| **FR-SGO-005** | 红线继承 **N-SGO-001~023** 逐条承载 + **X-SGO-1~7** 逐条等价重锚（§12 / §13）；**未发生的取代须如实登记「未发生」** | §12 / §13 无遗漏；台账条目与 X 项一一对应 | P0 |
| **FR-SGO-006** | **主流程零扩张优先读法**：范围法则**不得**引入新驱动时机 / 新驱动者；`requestTurn(` 仍**恰 2**、`maybeRecommend(` 仍**恰 7**、`nextAfterSettle` 单入口 | `test/op-wiring.test.ts` 绿 + 反证（第 3 调用点 ⇒ 必红） | P0 |

### 5.2 REFCTX — 引用事实进回合（**核心 1**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-010** | `chat` 消息体新增**引用事实载荷字段**（type-only 结构化引用表；**不新增消息 kind** ⇒ `KIND_SET` **40 逐字不动**） | `messaging.ts` 的 `KIND_SET` 长度 = 40；type-only 字段不产生运行时字节；断言「新字段名 ∉ `KIND_SET`」 | P0 |
| **FR-SGO-011** | 引用表**字段集固定**（每条引用）：`refNum`（序号）/ `refId` / `selector` / `refMark`（`data-wcli-ref` 值）/ `textDigest`（**页面文本摘要，≤80 字**）/ `refState`（`valid` / `invalid` / `unknown`）/ `nodeCount`（若已知） | 字段清单在**唯一构建点**可读；字段名逐字对齐既有 `RefFacts` / 投影（`ref-validity.ts:116-129` + `ref-store.ts:140-142`） | P0 |
| **FR-SGO-012** | **口径写死（零明文边界）**：① **页面文本可以进入 LLM 上下文**（`textDigest` 与选择器属**页面内容**，非凭据）；② **凭据值不可**进入任何面（LLM 上下文 / 法八四面）；③ **留痕仍只含字段名**（不含任何值） | §5.2 口径表逐条可核；`law8` 36 断言必绿；留痕行逐字不含值（对齐 `ai-drive.ts:85`） | P0 |
| **FR-SGO-013** | **两条回合入口同口径**：驱动者自动成回合（`driveAnsweredTurn` → `op.turn` 槽）与手动回合（composer 提交）**都**携带引用事实；不得只补一条 | 门禁：两入口共用**同一构建点**（FR-SGO-014）；反证「只补驱动者入口 ⇒ 手动回合引用缺失 ⇒ 必红」 | P0 |
| **FR-SGO-014** | 引用事实的**唯一构建点** = `requestTurn` 内部（`sidepanel.ts:304`）；**不得**新增 `requestTurn(` 调用点、不得在别处另拼一份载荷 | `requestTurn(` 计数 = 2；「载荷构建表达式恰 1 处」机核 | P0 |
| **FR-SGO-015** | SW 侧 `runChat` 接收**结构化回合载荷**（形如 `{ user, refs }`），替代裸字符串签名；`refs` 缺省 ⇒ 行为与现状**逐字相同** | 类型读取 + 「无引用回合系统段 == 基座」断言（FR-SGO-017） | P0 |
| **FR-SGO-016** | **系统段可每回合组装**：保留 `SYSTEM_PROMPT` 为**基座常量**，**追加**每回合段（引用事实 + 范围法则引导）；不得整体动态化丢掉基座 | `:948` 消息体 = `[{role:'system', content: 基座 + 追加段}, ...turns]`；基座文本逐字包含既有 5 条条款 | P0 |
| **FR-SGO-017** | **零引用回合零漂移**：无活跃引用时**不追加**任何段，系统段 == 基座（现状逐字不变） | 回归断言：无引用回合的 system content 与现行逐字一致 | P0 |
| **FR-SGO-018** | 引用表**只取「活跃且可判为有效」**的引用（`valid`）；`invalid` / `unknown` **不入范围**（fail-closed 方向沿用 `ref-validity.ts`，不得放松） | `refState` 映射表；反证「把 unknown 当 valid 注入 ⇒ 必红」 | P0 |
| **FR-SGO-019** | **跨进程断层显式化**：`--ref` 解析所需的 `refNum → refId → selector` 映射**由 SW 从回合载荷内取用**（面板不直连 SW 表；不新增第三通道） | 数据流单源：SW 持有的引用事实**唯一来源 = 回合载荷**；不得新增面板→SW 的引用表通道 | P0 |

### 5.3 SCOPE — 范围法则（**核心 2**，双轨）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-020** | **法则条文**：① 存在活跃引用 ⇒ 任务范围**默认限定于引用目标**；② **扩大范围必须先征询**用户；③ 征询获准 ⇒ 范围扩张**成立且可判** | 条文逐字入 §5.3；S0′ 机核三项（§5.9） | P0 |
| **FR-SGO-021** | **轨道 A（唯一判据 / 机核）**：**范围读数** —— 把「本次动作的目标集合」与「引用解析集合」比较，给出 `in-scope` / `out-of-scope-authorized` / `out-of-scope-unauthorized` / `no-ref` 四值之一 | 读数四值在**唯一声明源**；`no-ref` 语义 = 「无法判定」（**不是** `in-scope`） | P0 |
| **FR-SGO-022** | **轨道 B（引导）**：每回合系统段追加段含**法则表述**（自然语言 + 引用事实），使模型倾向遵守；提示词**不承担判据职责** | 追加段可读；**反证**：删掉提示词追加段 ⇒ **法九门禁仍须能判**（判据不依赖提示词） | P0 |
| **FR-SGO-023** | **双轨关系写死**：`读数 = 判据`（门禁读它）· `提示词 = 引导`（门禁不读它）；**法规不得以「提示词写了」为通过条件** | 门禁真源切片指向读数模块（**非** `SYSTEM_PROMPT`）；「门禁读提示词」⇒ 视为实现错误 | P0 |
| **FR-SGO-024** | **读数单源**：四值词汇与判定函数**唯一声明**（新模块，如 `l1/ref-scope.ts`）；**第二声明 ⇒ FAIL**（对齐 `terminals.ts` 唯一声明纪律） | 第二声明反证 ⇒ 必红 | P0 |
| **FR-SGO-025** | **越界写必须被拦**：`out-of-scope-unauthorized` 的**写动作**在机制上必须被拦下（fail-closed）；不得以「提示词说了」代替拦截 | 注入反证：构造未征询的越界写 ⇒ 读数 = `out-of-scope-unauthorized` 且被拦 | P0 |
| **FR-SGO-026** | **合法扩围路径**：`out-of-scope-authorized` 只能由 §5.6 WIDEN 的用户确认产生（可判事实），**不得**由 AI 自判 / 自填 | 反证「AI 自填扩围 ⇒ 必红」 | P0 |
| **FR-SGO-027** | **「引用在但非本次意图」的出口**：① 用户明确说「整页 / 全部」⇒ 走 WIDEN 二择；② 引用已失效（`invalid` / `unknown`）⇒ 不入范围，允许按无引用任务继续（但**不得**沿用失效引用的选择器） | EC-SGO-004 / 005 覆盖；反证「沿用失效引用选择器 ⇒ 必红」 | P0 |
| **FR-SGO-028** | **法则不引入新驱动时机 / 驱动者**：读数计算与征询挂在**既有**回合内（`requestTurn` → 工具调用面）；主流程调用点 diff = 0 | `test/op-wiring.test.ts` + `test/driver-timings.test.ts` 绿；调用点计数不变 | P0 |

### 5.4 ANCHOR — 工具面 ref 锚定（**核心 3**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-030** | 写入命令（**本阶段 = `dom set-text`**）支持 `--ref <n>`（n = **引用序号**，与 chip 文案「用引用 N 做…」同词汇）；解析为选择器 **`[data-wcli-ref="ref_n"]`** | `--ref 1` ⇒ 合成 `[data-wcli-ref="ref_1"]`；词法 / 语义单测 + 端到端样板 | P0 |
| **FR-SGO-031** | **实现载体 = plugin 侧条目包装**（`wrapChromeEntryForHost` 先例，`chrome-host.ts:206`）：覆写 `schema`（新增 `--ref`）+ 替换 `executor`（先解析 ref → 再交**基线 `baseExecutor`**）；**`packages/web-cli-base/**` 零 diff、不解冻** | `test/insight-no-escalation.test.ts:147` 绿（`gitDiffStatus(['../web-cli-base']) === 0`）；包装层调用基线 executor 可判 | P0 |
| **FR-SGO-032** | 包装**不得放宽** risk / `subcommandRisks`（`set-text` 仍 `'write'`、仍走缺省 ask）；`--ref` 不引入新子命令 | 逐字段对照：risk 档位与子命令集合与 base **逐字一致**；反证「把 `--ref` 路径的 risk 降档 ⇒ 必红」 | P0 |
| **FR-SGO-033** | **单节点保证**：解析结果**必须恰 1 个节点**；`nodeCount === 1` 为唯一通过条件；0 / 多命中**即失配** | 断言 + 反证（构造 0 命中 / 2 命中 ⇒ 失配） | P0 |
| **FR-SGO-034** | **失配 / 失效 fail-closed 且非静默**：可读错误 + 指引（**不得**静默回退到 `--selector` / **不得**静默按首元素 / **不得**静默改别处）；EC 家族显式新增「引用锚定失败」码 | EC-SGO-001~004 逐条有判定；反证「静默回退 ⇒ 必红」 | P0 |
| **FR-SGO-035** | **先落写命令**：`set-text` 是**唯一**本阶段落地 `--ref` 的写命令；**读命令（`read-element` / `structure`）本阶段不加**，登记为遗留开放点（§8 PD-SGO-001） | `--ref` 出现在读命令 ⇒ 视为越界（NG-SGO-010）；PD-SGO-001 已登记 | P0 |
| **FR-SGO-036** | `--ref` 与 `--selector` **互斥/共存口径显式**：同给 ⇒ **显式错误**（不静默择一）；都不给 ⇒ 沿用 base 既有行为 | 单测 + 反证（同给 ⇒ 必红） | P0 |
| **FR-SGO-037** | 锚定失败**不得改动判定链既有 fail-closed 方向**：`src/security/policy.ts` / `auto-authorize.ts` **零触碰** | `zeroDiffFiles` 9 项哈希 pin 机核绿 | P0 |
| **FR-SGO-038** | 引用锚定的**失效可判**（SPA 重渲染 / 路由跳转丢标记）：锚定失败**非静默**；可复用 R6 只读观测面（`reobserveAfterWrite`）报告事实，**但不得**新增每回合重观测（NG-SGO-013） | EC-SGO-003 / 007 覆盖；「无新增每回合探测」断言 | P1 |

### 5.5 BATCH — 任务级批量授权（**核心 4**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-040** | AI 先出**写入计划**（N 处：目标 + 原文 → 译文）→ **一次 consent 覆盖整批**；非批次写入**仍逐条批准** | 端到端样板：计划 → 一次手势 → 计划内全部放行；单条写入路径不变 | P0 |
| **FR-SGO-041** | 批量卡**复用既有 `auth` kind**（零新增 kind）；计划数据经**既有 kind 的 type-only payload 字段**传递（承 `ChatResultVariant` 先例） | `KIND_SET` = 40；12 kind 不变；零宿主不变；`chat-state.ts` 的 `auth` 投影路径不变 | P0 |
| **FR-SGO-042** | **计划指纹** = 「目标集合 ∧ 动作类型 ∧ 文本对」（范围绑定）；批准后放行**仅限指纹内** | 指纹可读 / 可判；反证「指纹外同一动作 ⇒ 不放行」 | P0 |
| **FR-SGO-043** | **一次用户手势**：批量放行必须由**真实用户手势**发起；卡片**不得**由 AI 代答 / 代填 / 自动放行 / 自动展开 | `RL-06` / OT-⑩ **扩批量变体注入必红**（断言 + `expectFailPattern`） | P0 |
| **FR-SGO-044** | **计划外第 N+1 条回落逐条确认**：超出指纹的写**必须**重新逐条 ask（一次点击**不得**放开无限写） | 反证：计划外写入 ⇒ 触发逐条确认；「一次点击放开无限写」⇒ 必红 | P0 |
| **FR-SGO-045** | **特权 op 恒不入批**：`op.authorize` / `op.perm.request` **不受批量机制影响**（恒 `gesture`；「SW 永不调用 `.request(`」） | `test/capability-wiring.test.ts:51-58` 绿 + 新增「批量路径不触及特权 op」断言 | P0 |
| **FR-SGO-046** | **逐条审计保留（零明文）**：审计逐条记录（工具 / 结果 / 计数 / 指纹摘要 / 字段名），**正文与译文不进**流内 payload / digest / 审计 / DOM 属性四面 | `law8` **36 断言不降级**且必绿；计划清单不进四面（FR-SGO-050） | P0 |
| **FR-SGO-047** | **中途可中止**：批量计划可被用户中止；**部分完成如实留痕**；`cancelled` 终态语义保持（`cards/auth.ts:49-56`） | 中止路径端到端；部分完成留痕可读；6 终态语义逐字不变 | P0 |
| **FR-SGO-048** | **非批次写入仍逐条批准**：无计划时 `set-text` 仍走缺省 ask（`permission.ts:16,157,333` 理由串不变） | 回归断言：无计划写入 ⇒ 逐条 ask（理由串逐字） | P0 |
| **FR-SGO-049** | **与 confirm / gesture 档的关系：扩展不绕过**：`tierOf` 单源不改；批量**不得**改变档位裁决；红线⑥ 判据（AI 不得代答 consent）**扩展覆盖批量** | `tierOf` 逐 op 对照不变；批量变体注入必红（FR-SGO-043） | P0 |
| **FR-SGO-050** | **批量卡文案 = 静态模板**，正文**以 UI 渲染文本**呈现（沿用既有卡渲染面），**不得**作为 payload 值 / digest 值 / 审计值 / DOM 属性写入；若含凭据形值 ⇒ **掩码** | 静态模板断言（对齐 `cards/auth.ts` 头注释理由）；掩码断言；法八四面扫描零命中 | P0 |

### 5.6 WIDEN — 扩大范围征询（**正向路径**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-060** | 写动作前若判定为 `out-of-scope-unauthorized`，AI **必须先 `ask-user` 二择**：「仅引用范围内」/「整页（扩大范围）」 | 端到端：越界写触发二择；`ty.md` 原案重放中「整页」选项可达 | P0 |
| **FR-SGO-061** | 用户选择「整页」⇒ 读数转 `out-of-scope-authorized`（**范围扩张的可判事实**）并**入留痕** | 留痕含扩围事实（字段名 + 读数，不含正文）；读数状态可判 | P0 |
| **FR-SGO-062** | **不得硬禁止越界**：二择之外必须存在「拒绝扩大」后的可行下一步（回到引用范围内任务 / 取消），**不得**形成死端 | 死端门禁（`no-dead-end`，49）必绿且**只增**；反证「拒绝后无下一步 ⇒ 必红」 | P0 |
| **FR-SGO-063** | 二择卡**复用既有 ask / `auth` 机制**（零新增卡类型）；`MAX_OPEN_ASKS = 2` 语义与 `ASK_CANCEL_REASONS` 语义保持 | 12 kind / 零宿主 / `MAX_OPEN_ASKS` 逐字不变 | P0 |

---

### 5.7 LAW9 — 范围读数立法（**机核判据 / 法九**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-070** | **立法「法九：范围法则」**（`law9`）：范围读数成为**可机核判据**（不是文档条款）；法九与既有法七（死端）/ 法七扩展（驱动者终态）/ 法八（零明文）**并列且不重叠** | 法九编号 + 条文逐字入规范；门禁文件命名承 `law7x-ext` 先例（`test/law9-scope-reading.test.ts`，**node 门禁**） | P0 |
| **FR-SGO-071** | **判据形态 = 双向反证 + 注入必红 + 三段控制禁恒真**（`ok` / `violated` / `n/a`）：每个判据必须能 FAIL，且必须有一个**必不判**的中性输入（禁恒真） | 三段控制逐段有反证（对齐 `test/law7x-ext.test.ts` 形态）；「恒真断言」⇒ 视为缺陷 | P0 |
| **FR-SGO-072** | **真源切片**：门禁读**生产路径真源**（读数模块 + 工具包装真源），不得自我裁决 / 不得读测试自建常量 | 反证：改动生产真源（如把 `no-ref` 改判 `in-scope`）⇒ 必红 | P0 |
| **FR-SGO-073** | **必判项 ①**：无引用回合 ⇒ 读数 = `no-ref`（**不得**判 `in-scope`） | 注入反证：无引用 ⇒ 判 `in-scope` ⇒ 必红 | P0 |
| **FR-SGO-074** | **必判项 ②**：有活跃引用且写目标 ∈ 引用解析集合 ⇒ `in-scope`（通过） | 反证：同输入 ⇒ 判 `out-of-scope-*` ⇒ 必红 | P0 |
| **FR-SGO-075** | **必判项 ③**：有活跃引用、目标 ∉ 集合、**未经征询** ⇒ `out-of-scope-unauthorized`（拦截） | 注入反证：越过征询 ⇒ 必红 | P0 |
| **FR-SGO-076** | **必判项 ④**：有活跃引用、目标 ∉ 集合、**已获用户批准** ⇒ `out-of-scope-authorized`（放行） | 反证：已批准仍判 unauthorized ⇒ 必红 | P0 |
| **FR-SGO-077** | 门禁**纳入受审集合**：`gate-integrity` node 门禁下界**只增**；**不新增 Chromium 门禁文件**（`CHROMIUM_GATES === 9` 不动） | `test/gate-integrity.test.ts` 绿；Chromium 门禁计数 = 9 | P0 |

### 5.8 TRACE — 留痕与可判性

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-080** | 留痕三要素**扩展**：新增**范围读数**字段**名**（如 `scope.reading` / `scope.authorized`），**不含任何值**（对齐 `ai-drive.ts:85`） | 留痕行示例；逐字扫描不含值 | P0 |
| **FR-SGO-081** | **扩围事实入留痕**：`out-of-scope-authorized` 的产生必须可从留痕读出（「本次越界已获征询批准」） | 留痕字段名 + 读数可判；反证「扩围不留痕 ⇒ 必红」 | P0 |
| **FR-SGO-082** | **批量计划留痕**：指纹摘要 + 计划条目数 + 手势事实 + 逐条结果计数（**零明文**） | 留痕不含正文 / 译文；计数可判 | P0 |
| **FR-SGO-083** | 留痕**零值纪律不退化**：既不写入正文也不写入凭据值（Key / token / 答案全文均不进摘要） | 扫查断言 + `law8` 面③ 绿 | P0 |
| **FR-SGO-084** | 留痕行**可机核**：S0′ 样板逐行断言（独立成行 + 字段名精确匹配） | S0′ 机核项；「留痕三要素独立成行」承 v5.5 S0 判定 | P0 |

### 5.9 S0′ — 首验收场景机器化（**地位 = v5.5 之 S0 / v5 之 S2**）

**场景（= `ty.md` 原案重放，逐环节）**

```
拾取引用 ①（refNum=1，出生有效）→ 答「原地翻译为中文」→ 自动成回合（载荷含引用事实）
→ SW 系统段 = 基座 + 追加段（引用事实 + 法则引导）
→ 范围读数 = in-scope（本次目标 = 引用目标）
→ 只改写引用目标恰 1 处（改写处数 ≤ 引用数）
→ 若批量计划：一次手势覆盖计划内全部（计划外逐条回落）
→ 若需扩大范围：先 ask-user 二择（选「整页」⇒ 读数转 out-of-scope-authorized + 入留痕）
→ 完成交代如实（清单条数 == 实际改写处数）
→ 留痕行独立成行且含范围读数字段名（不含值）
```

| 步 | 环节 | 机核断言 |
|:-:|---|---|
| S0′-1 | 拾取引用 ①（`refNum = 1`，出生有效） | 引用事实 `validCount ≥ 1` |
| S0′-2 | ask-user 已答「原地翻译为中文」 | 答案结算 + 原话可读 |
| S0′-3 | **自动成回合**（驱动者路径）且**回合载荷含引用事实** | 载荷字段存在且 `refNum=1` / `refState=valid` / `selector` 非空 ⇒ **可判命中** |
| S0′-4 | SW 侧系统段 = 基座 + **追加段**（含引用事实 + 法则引导） | 追加段含引用事实；**基座逐字包含**既有 5 条条款 |
| S0′-5 | **范围读数 = `in-scope`**（本次目标 = 引用目标） | 读数四值判定；`in-scope` 可判 |
| S0′-6 | **只改写引用目标恰 1 处** | **改写处数 ≤ 引用数**（本场景 = 1）；`set-text` 目标选择器 = `[data-wcli-ref="ref_1"]` |
| S0′-7 | 若走**批量计划**：一次手势覆盖计划内全部 | 计划指纹可读；一次手势 ⇒ 计划内全部放行；**计划外回落逐条** |
| S0′-8 | 若需**扩大范围**：先 `ask-user` 二择 | 二择出现；用户选「整页」⇒ 读数转 `out-of-scope-authorized` 并**入留痕** |
| S0′-9 | 完成交代**如实**（只报实际改写处数） | 交代清单条数 == 实际改写处数；不得出现「整页改写」而引用为 1 |
| S0′-10 | 留痕行**独立成行**且含范围读数**字段名** | 字段名精确匹配；不含值 |

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-090** | **S0′ 全链机器化**：上表 S0′-1~10 逐步可判（node 面 + Chromium 面双面），样本单源 | 双面全绿；`test/ui/s0-self-driven.mjs` **只加断言不加文件** | P0 |
| **FR-SGO-091** | **核心机核断言**：**改写处数 ≤ 引用数**（未获批准时）；获批准时须有 `out-of-scope-authorized` 读数 + 留痕 | 反证：改写 2 处而引用 1 且无批准 ⇒ 必红 | P0 |
| **FR-SGO-092** | **双向反证（决定性）**：**去掉范围注入**（不携带引用事实）⇒ **机制读数为空 / `no-ref` 必红**（AI 无法判范围）；`ty.md` 原案序列可复现该反证 | 注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS | P0 |
| **FR-SGO-093** | **批量覆盖断言**（若走批量计划）：一次手势覆盖计划内全部 + 计划外回落 + 中止可判 | 三项断言 + 各自反证 | P0 |
| **FR-SGO-094** | S0′ **人工观感项如实登记**：真机观感 / 「AI 是否真的理解『原地』」等 headless 不可合成项逐项标注 `⏳ 未执行`，**不冒充 PASS** | §9.4 人工面清单；无 `PASS` 冒充 | P0 |

### 5.10 SUPERSEDE — X-SGO-1~7 显式取代（**判据等价重锚，不是放宽**）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-100** | **X-SGO-1** 回合载荷恰 1 字段 → **允许携带引用上下文**（type-only；两条入口同口径）；`KIND_SET` 40 不动 | `test/op-wiring.test.ts` 重锚（入口计数不变）；`messaging` type-only 判据 | P0 |
| **FR-SGO-101** | **X-SGO-2** 系统段静态常量 → **常量基座 + 追加段**（替换读法：常量保留为基座）；**须新增判据**（现无门禁读提示词 ⇒ 否则零机核） | FR-SGO-016/017 + 法九门禁（FR-SGO-070~077） | P0 |
| **FR-SGO-102** | **X-SGO-3** base `dom` 零 ref → **plugin 侧包装**；base 零 diff 为默认读法（解冻须作者放行）；risk 不放宽 | `insight-no-escalation` 绿 + FR-SGO-031/032 | P0 |
| **FR-SGO-103** | **X-SGO-4** 逐条写入授权 → **任务级批量授权**；`RL-06` / OT-⑩ **扩批量变体并注入必红**；`law8` 36 不得降级；`auth` 6 终态语义保持 | `supersession` / `op-three-tier` / `law8` / `auth-chip` 全绿 + 新反证 | P0 |
| **FR-SGO-104** | **X-SGO-5** 引用判定只回答「可不可用」 → **增设「作为范围锚」的解析读数**（单节点保证 + 失配/失效可判）；**不得**改变 `valid/invalid/unknown` 的 deny 方向 | `l1-ref-validity` / `test/ui/l1.mjs` / `page-input` 绿；新增读数**双向反证** | P0 |
| **FR-SGO-105** | **X-SGO-6** 终态词汇 → 本规范**裁决 = 优先以「读数」承载**（不新增终态字面量）；**若** plan 证不可行 ⇒ 显式登记词汇扩张，须与 `STREAM_TERMINALS` 保持正交、唯一声明 | `test/driver-terminals.test.ts`（第二声明 ⇒ FAIL）+ `law7x-ext` 绿；§11 DC-SGO-007 登记读法 | P0 |
| **FR-SGO-106** | **X-SGO-7** 主流程调用点计数 → 走**既有注册表内扩张**（主流程 diff = 0）；**不得**新增 `requestTurn(` / `maybeRecommend(` 调用点 | `test/op-wiring.test.ts` + `driver-timings` / `driver-quadruple` / `recommendation-sources` 绿 | P0 |
| **FR-SGO-107** | **未发生的取代如实登记「未发生」**（台账 + §12）；取代台账与判据重锚**同轮完成**，不得拆到「下一轮补」 | §12 每行有「已发生 / 未发生」状态；台账条目与 X 项逐一对应 | P0 |

### 5.11 GATE — 门禁等价重锚与台账

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-110** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 各门禁前后计数对账表（§9.5）无减少项 | P0 |
| **FR-SGO-111** | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | 每个新增判据附反证记录（注入点 + 还原 sha） | P0 |
| **FR-SGO-112** | **取代台账登记**：X-SGO-1~7 逐条落 `docs/*-supersession-ledger.json`（或等价台账），含 `knownGap` 一致性 | 台账新增条目 + 一致性门禁绿 | P0 |
| **FR-SGO-113** | **保护段处置**：若 journey 保护段 `43054..58287`（240 行）需**再次取代** ⇒ 走八步 + 留痕（`decision = keep` 前提不得静默改写） | 保护段门禁绿；若取代则八步记录齐备 | P0 |
| **FR-SGO-114** | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile）；`KL-N-10` 处置 = 首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞** | 执行记录 + `gate-integrity` 绿 | P0 |
| **FR-SGO-115** | **新增门禁登记**：新 node 门禁（法九）纳入 `gate-integrity` 受审集合（下界**只增**）；**不新增 Chromium 门禁文件** | `CHROMIUM_GATES === 9`；node 下界 = 前值 + 1 | P0 |
| **FR-SGO-116** | **门禁对账表**：收口时给出各门禁**前后计数**（承 R6 记录 §门禁对账表口径） | §9.5 表 + 收口实测（⏳ 待收口，不冒充） | P2 |

### 5.12 VOL — 体积分列预算

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-SGO-120** | **分列预算**：明列 **A 列（`dist/sidepanel.js`，计入账本）** 与 **B 列（`dist/background.js`，不计入 sidepanel 账本，承 ADR-V55-011 §1 口径）**；冻结面单列；给出两叶分列上下界 + 15% 缓冲（§5.12 表） | 预算表逐格可核（含 15% 缓冲列）；**先预算后落地** | P0 |
| **FR-SGO-121** | **充分利用 B 列**：系统段组装（`SYSTEM_PROMPT` 追加）/ `--ref` 包装（`src/tools/**`）/ confirm 桥批量判定 —— **优先落 SW 侧**（B 列不计账），面板侧只留必要构建与渲染 | 落地归因表（逐模块 → 产物）；**不得**为绕门禁把代码搬进 / 搬出 sidepanel | P0 |
| **FR-SGO-122** | **距档结论 + 最坏情形预置**：按 15% 缓冲口径给出「**不触发升档**」结论与余量；同时按 **v55 历史低估 2.8×** 给出最坏情形（**可能跨档位**）⇒ **预置升档 EC 路径** | §5.12 表两行结论（正常口径 / 2.8× 最坏口径）；EC-SGO-022 已登记 | P0 |
| **FR-SGO-123** | **冻结面零容差**：`content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** —— 逐字节 / 逐字不变（量值 + sha 双锚） | 构建后 `stat` + sha256 前后一致；`content.test.ts` 绿 | P0 |
| **FR-SGO-124** | **越限路径 = EC 显式路径 + 作者一行**：若叶收口实测越**生效上限**（607,554）⇒ 显式重登记基线（同源前移）；若越**档位**（614,400）⇒ 走 EC 显式升档路径 + **作者一行**；`authorConfirmation` **不得**伪称已确认 | EC-SGO-022 逐分支；`authorConfirmation` 读值断言 | P0 |
| **FR-SGO-125** | **每叶收口实测重登记**（不等两叶合计）：叶1 落地后即测即登记；登记**五要素**（前后值 / 日期 / 来源 / 理由 / 历史保留）+ V3-VOL-3 三值同源前移 | 逐叶登记条目存在；五要素齐备；算术机核绿 | P0 |

#### 5.12.1 体积分列预算表（**spec 阶段先出，禁止未预算先排落地**）

**统一前提（本轮只读复核，§2.4 E）**：`A` 基线 **578,623 B** · 生效上限 **607,554 B**（距 **28,931 B**）· **档位 614,400 B**（**距 35,777 B**）· 绝对上限 **675,840 B**（距 97,217 B）· `authorConfirmation = pending-author-line`（**未闭合义务**）。**B 列（`dist/background.js`）不计入 sidepanel 账本**（ADR-V55-011 §1 已登记口径）。

| 列 | 产物 | 叶1（范围底座）落地项 | 叶2（批量授权）落地项 | 计入账本 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | `l1/ref-scope.ts`（读数单源）· `sidepanel.ts`（载荷构建 / 追加段事实 / 留痕 / 二择接线）· `l1/ref-store.ts`（投影取用）· S0′ 断言支撑 | `chat-state.ts` / `cards/auth.ts`（计划静态模板渲染）· `next-registry/ai-drive.ts`（留痕字段名）· 计划指纹与回落接线 | ✅ |
| **B** | `dist/background.js` | `service-worker.ts`（系统段组装 + 载荷签名 + `--ref` 解析接线）· `src/tools/*`（`wrapChromeEntryForHost` 包装 + 失配口径） | `security/confirm.ts`（批量判定 + 计划指纹校验 + 计划外回落） | ❌ |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1 | 叶2 | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增上界）** | **6.0~9.0 KB** | **3.5~5.5 KB** | **9.5~14.5 KB** | **10.9~16.7 KB** | **距档余量 = 35,777 − 16,700 ≈ 19,077 B ⇒ 正常口径下不触发升档**（且未越生效上限 28,931 B） |
| **B 列（background.js，不计账）** | 5.0~8.0 KB | 3.0~5.0 KB | 8.0~13.0 KB | — | 不计入 sidepanel 账本（**充分利用**） |
| **v55 历史低估系数 2.8× 最坏情形（A 列）** | — | — | **≈26.6~40.6 KB** | **≈30.6~46.7 KB** | **可能跨档位 614,400** ⇒ **预置 EC-SGO-022 显式升档路径 + 作者一行**（N-SGO-023） |

> **口径与纪律**：① 上表为 **spec 阶段估算（非承诺）**；② **每叶收口实测重登记**（FR-SGO-125），不得以估算充当实测；③ **不得**把 B 列改动搬进 A 列规避 / 或把 A 列搬出以绕开门禁（FR-SGO-121）；④ 若叶1 落地后实测越**生效上限** ⇒ 立即显式重登记基线（同源前移，仍不跨档位）；若越**档位** ⇒ 按 EC-SGO-022 走显式升档 + **作者一行**（**未闭合义务不得伪称已确认**，N-SGO-023）。

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| **NFR-SGO-001** | 性能/体积 | `dist/sidepanel.js` ≤ 生效上限 `floor(baseline × 1.05)`；**判定 = 公式唯一**（`SIDEPANEL_CEILING_CAP` 保持 `record-only`，COR-SGO-3） | `size-budget` 绿；实测 ≤ 上限；越限走 EC-SGO-022 |
| **NFR-SGO-002** | 安全 | 特权 op（`op.authorize` / `op.perm.request`）**恒 gesture**；批量机制**不触达** | `test/capability-wiring.test.ts:51-58` 绿 + 新增反证 |
| **NFR-SGO-003** | 安全 | consent（confirm / gesture）**不得**被 AI 代答 / 代填 / 自动放行（**含批量变体**） | `RL-06` / OT-⑩ 扩批量变体**注入必红** |
| **NFR-SGO-004** | 安全 | 法八**四面零明文不退化**（流内 payload / digest / 审计 / DOM value 与全部属性） | `law8` 36 断言全绿、**零降级** |
| **NFR-SGO-005** | 安全 | `packages/web-cli-base/**` **零 diff**；判定链（`policy.ts` / `auto-authorize.ts`）**零触碰** | `insight-no-escalation` 绿 + `zeroDiffFiles` 9 项哈希 pin 绿 |
| **NFR-SGO-006** | 安全 | 锚定 / 范围判定**一律 fail-closed**：失配、失效、`unknown` **不放松**任何既有 deny 方向 | 反证族逐条；`ref-validity` 3 结果语义不变 |
| **NFR-SGO-007** | 兼容 | **零新增载体**：12 kind 逐字 / `REGISTERED_STRUCTURAL_HOSTS = []` / `KIND_SET` 40 | `stream-model` / `host-registry` / `messaging` 断言绿 |
| **NFR-SGO-008** | 性能 | **引用注入零额外页面探测**：用回合已有引用事实，**不**引入每回合只读重观测 | 「每回合页面探测次数不增」断言（EC-SGO-008 / NG-SGO-013） |
| **NFR-SGO-009** | 兼容 | **无引用回合逐字不变**（系统段 / 载荷 / 留痕 / 卡面）—— 零回归漂移 | 无引用路径 baseline 断言（逐字） |
| **NFR-SGO-010** | 可机核 | 范围法则**可机核**（法九）：双向反证 + 注入必红 + **三段控制禁恒真** | `test/law9-scope-reading.test.ts` 全绿 |
| **NFR-SGO-011** | 可判/可追溯 | 「本次是否落在引用范围内 / 是否已征询」可从**留痕**读出（零值纪律） | 留痕字段名断言 + 不含值扫描 |
| **NFR-SGO-012** | 可用性 | **不卡正当全页任务**（越界有正向路径）；**不跳走**（不打开设置页 / `options` 代偿） | EC-SGO-005 / 006；零视图切换断言 |
| **NFR-SGO-013** | 环境/纪律 | 门禁**严格串行**；**无新依赖**；**不改** `.opencode/opencode.json`；`F-29` 区段一字不动 | 执行记录 + §16 纪律表逐条 |
| **NFR-SGO-014** | 可维护 | **读数单源 + 唯一声明**；新范围动作的扩展点固定（读数模块 + 载荷字段 + 包装层） | FR-SGO-024 反证；扩展点清单可读 |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| **EC-SGO-001** | `--ref <n>` 解析 **0 命中**（引用目标已被移除 / `dom-gone`） | **fail-closed + 非静默**：可读错误（引用锚定失败：目标不存在）+ 指引（重拾取 / 查看引用证据）；**不得**回退 `--selector`、不得静默跳过 |
| **EC-SGO-002** | 解析**多命中**（≥2；同构节点） | **fail-closed**：拒绝锚定（`nodeCount !== 1` 即失配）；显式报告命中数；**不得**按首元素执行（区别于 base EC-002 的多匹配语义） |
| **EC-SGO-003** | `data-wcli-ref` 标记**缺失**（best-effort：frozen / SVG / SPA 重渲染） | 非静默：报告「引用标记不可用」+ 指引（用 `--selector` 显式锚定 / 重拾取）；**不得**静默改用语义路径 |
| **EC-SGO-004** | 引用已**失效**（`invalid` / `unknown`，3 结果 fail-closed） | **不入范围**（`refState !== 'valid'` ⇒ 不写进引用表）；按无引用任务路径处理；**不得**沿用失效引用的选择器 |
| **EC-SGO-005** | 用户明确要求**整页**但存在活跃引用 | 走 **WIDEN 二择**（FR-SGO-060）；用户选「整页」⇒ `out-of-scope-authorized` + 入留痕；**不得**硬拦（NG-SGO-015） |
| **EC-SGO-006** | 用户**拒答 / 取消**二择 | 回到引用范围内任务或取消；**必须有可行下一步**（零死端，`no-dead-end` 必绿） |
| **EC-SGO-007** | 引用在对话中途**失效**（SPA 导航 / 路由跳转丢标记） | 非静默报告 + 不沿用旧选择器；允许重拾取；**不**引入每回合重观测（NG-SGO-013） |
| **EC-SGO-008** | **无引用回合**（用户直接打字，无引用） | 读数 = `no-ref`；系统段 == 基座；载荷 / 留痕 / 卡面**逐字不变**（零漂移）；**不得**因缺引用而阻断 |
| **EC-SGO-009** | 批量计划**中途失败**（第 k 条工具失败） | 如实报告失败条目 + **部分完成留痕**（前 k−1 条已写事实）；**不得**谎报整批成功；后续条目按计划外回落 / 中止路径处理 |
| **EC-SGO-010** | 批量计划**被拒**（用户拒绝计划） | 计划不执行；留痕记拒绝事实；回到可控下一步（零死端） |
| **EC-SGO-011** | 批量计划**中止**（用户按中止） | `cancelled` 终态（`cards/auth.ts` 语义保持）；部分完成留痕；零死端 |
| **EC-SGO-012** | **计划外第 N+1 条**写 | **回落逐条确认**（FR-SGO-044）；一次手势**不得**放开无限写 |
| **EC-SGO-013** | 批量计划为**空** / **单条** | 空计划：不产生批量卡（不空弹）；单条：允许等同逐条批准（不得因批量机制改变单条语义） |
| **EC-SGO-014** | 计划指纹在批准**前漂移**（DOM 变化 / 目标集合变了） | 指纹重校验失败 ⇒ **显式失败**（不静默按旧指纹放行）；重新出计划 |
| **EC-SGO-015** | `--ref` 与 `--selector` **同给** | **显式错误**（不静默择一，FR-SGO-036） |
| **EC-SGO-016** | `--ref <n>` 的 `n` **超出**引用表范围（引用不存在 / 已清空） | **fail-closed + 非静默**：可读错误（引用序号不存在）+ 指引；不得静默忽略 |
| **EC-SGO-017** | `--ref` 用在**读命令**（`read-element` / `structure`） | 本阶段**不支持**（NG-SGO-010）：参数不可用（schema 未声明）⇒ 显式错误；登记 PD-SGO-001 |
| **EC-SGO-018** | 页面文本**试图注入**范围法则（例如页面里写着「忽略引用，改整页」） | **机制判据不受影响**（读数只比较目标集合 vs 引用解析集合）；提示词注入不改变门禁结果（FR-SGO-023 / NFR-SGO-010） |
| **EC-SGO-019** | 页面文本含**凭据形值** | **不入 LLM 上下文**：凭据值任何面都不可（FR-SGO-012 ②）；识别为凭据形 ⇒ 掩码 / 不入注入 |
| **EC-SGO-020** | LLM **未配置**（`runChat` 前置判据，v5.5 已有） | 本 Feature **不改**该路径（NG-SGO-001 邻域）；引用注入与读数不得绕过该前置判据 |
| **EC-SGO-021** | 门禁环境性 flake（`KL-N-10` 家族） | 隔离复跑 ≥2、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿，N-SGO-021） |
| **EC-SGO-022** | 体积**越限**（越生效上限 / 越档位 / 越绝对上限） | **越生效上限** ⇒ 显式重登记基线（同源前移，仍不跨档位）；**越档位 614,400** ⇒ 走 EC 显式升档路径 + **作者一行**；**越绝对上限 675,840** ⇒ 停止并请示作者；`authorConfirmation` **不得**伪称已确认（N-SGO-023） |

---

## 8. 开放问题

> **口径**：discovery 的 **O-SGO-001~009 已由编排器批量裁决**（D2），逐条落位见 §11，**本节不再重复列入**。下表为 **spec 阶段新识别 / 明确留待 plan 或后续轮**的开放点（`PD-SGO-0xx`），**不在本阶段预设答案**。

| # | 问题 | 为什么可以后置 | 状态 |
|---|---|---|---|
| **PD-SGO-001** | **读命令 `--ref` 是否同加**（`read-element` / `structure`）：写是风险面（已落），读是探测成本面（`ty.md` 实测 ≥142 条只读探测） | 编排裁决 ④ 明文「**先落写命令**，读命令登记后续裁决」；不影响范围底座成立（写锚定已是判据面） | 待裁决（后续轮 / plan 评估） |
| **PD-SGO-002** | 是否在**每回合**注入「当前只读重观测」的最新摘要（最新鲜 vs 每回合多一次页面探测） | O-SGO-003 ③ 未采纳；现取回合已有事实（NG-SGO-013）即可判范围；性能风险明确 | 待裁决（若真机显示 `textDigest` 陈旧影响判范围） |
| **PD-SGO-003** | **引用表字段集是否含 `semanticPath` / `origin` / `navSeq`**（本轮取 7 字段最小集） | 最小集已可判命中（`refNum` / `refId` / `selector` / `refMark` / `textDigest` / `refState` / `nodeCount`）；扩字段是加法 | 待裁决（plan 评估体积与必要性） |
| **PD-SGO-004** | **范围读数是否入流内可见面**（用户可见的读数行 vs 仅留痕 + 门禁） | 编排裁决 ⑥ 只要求「入留痕」；入流会动密度预算与 12 kind 面 | 待裁决（plan / 密度门禁评估） |
| **PD-SGO-005** | 批量计划的**生成者**：AI 一次产出完整计划 vs 系统在首次写入后聚合计 | O-SGO-005 已定「计划指纹 + 一次手势 + 计划外回落」，但**生成路径**未定；两读法均满足判据 | 待裁决（plan 评估；不得削弱 FR-SGO-042） |

---

## 9. 验收标准（总体验收清单，含门禁映射）

> **口径**：AC 为**总体验收**（可跨多条 FR）；每条有唯一 ID 且**可机核或如实标注人工面**。`⏳` = 本轮未执行（spec 阶段零运行时验证）。

### 9.1 核心验收（S0′ / 引用进回合 / 范围读数 / 取代 / 批量 / 零新增）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-SGO-001** | **S0′ 全链机器化**（S0′-1~10 逐步可判；node + Chromium 双面；样本单源） | FR-SGO-090~094 | `test/law9-scope-reading.test.ts` + `test/ui/s0-self-driven.mjs`（**只加断言不加文件**） |
| **AC-SGO-002** | **引用事实进回合**：两条入口（驱动者 / 手动）载荷均含引用事实且**可判命中** | FR-SGO-010~015 | 载荷字段断言 + `test/op-wiring.test.ts`（入口计数不变） |
| **AC-SGO-003** | **范围读数（法九）四值可判** + 双向反证 + 三段控制禁恒真 | FR-SGO-020~028 / 070~077 | 法九门禁（node）+ 真源切片反证 |
| **AC-SGO-004** | **X-SGO-1~7 等价重锚**（逐条判据重写，非放宽；未发生者如实登记） | FR-SGO-100~107 | §12 映射表 + 各既有门禁绿 + 台账条目 |
| **AC-SGO-005** | **批量授权不侵蚀红线⑥**：一次真实手势 + 计划指纹 + 计划外回落 + **批量变体注入必红** | FR-SGO-040~049 | `test/supersession-ledger.test.ts`（RL-06 扩批量）+ `test/op-three-tier.test.ts`（OT-⑩ 扩批量） |
| **AC-SGO-006** | **零新增载体**：`KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` | FR-SGO-041 / 063 | `messaging` / `stream-model` / `host-registry` 断言绿 |
| **AC-SGO-007** | **锚定 fail-closed 非静默**：0 命中 / 多命中 / 标记缺失 / 序号越界 四类判定 + 反证 | FR-SGO-033~036 | EC-SGO-001~003 / 015~017 + 反证族 |

### 9.2 功能验收（WIDEN / 留痕 / 法八 / 两条入口 / 载荷形态）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-SGO-008** | **扩大范围正向路径**：二择可达 + 确认转 `out-of-scope-authorized` + 入留痕 | FR-SGO-060~061 | 端到端 + 留痕断言 |
| **AC-SGO-009** | **拒绝扩大不形成死端**（`no-dead-end` 只增必绿） | FR-SGO-062 | `test/ui/no-dead-end.mjs`（49，只增） |
| **AC-SGO-010** | **留痕含范围读数且零值**（字段名 + 不加值；扩围事实可读） | FR-SGO-080~084 | 留痕逐行断言 + 不含值扫描 |
| **AC-SGO-011** | **无引用回合零漂移**（系统段 == 基座 / 读数 `no-ref` / 载荷与卡面逐字不变） | FR-SGO-017 / 018 | 回归 baseline（逐字）+ `no-ref` 断言 |
| **AC-SGO-012** | **引用表只取有效引用**（`invalid` / `unknown` 不入范围） | FR-SGO-018 / 027 | 映射表 + 反证 |
| **AC-SGO-013** | **双向反证决定性**：去掉范围注入 ⇒ 机制读数为空 / `no-ref` **必红** | FR-SGO-092 | 注入 → FAIL（`expectFailPattern`）→ 逐字节还原 → PASS |
| **AC-SGO-014** | **完成交代如实**：清单条数 == 实际改写处数（不得「整页改写」而引用为 1） | FR-SGO-091 / S0′-9 | S0′ 机核 + 反证 |
| **AC-SGO-015** | **计划指纹绑定生效**：指纹内放行 / 指纹外回落 / 漂移显式失败 | FR-SGO-042 / 044 | 三项断言（EC-SGO-012 / 014） |
| **AC-SGO-016** | **中途可中止 + 部分完成留痕**；`cancelled` 终态语义保持 | FR-SGO-047 | 端到端 + 6 终态断言 |

### 9.3 取代台账与门禁治理

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-SGO-017** | **断言零删除零降级、计数只增**（唯一例外 = 保护段显式取代） | FR-SGO-004 / 110 | 各门禁计数对账表无减少项 |
| **AC-SGO-018** | **反证实跑 + 逐字节还原**（sha256 前后相同） | FR-SGO-111 | 反证记录（注入点 + 还原 sha） |
| **AC-SGO-019** | **取代台账登记**（X-SGO-1~7 逐条；未发生者标「未发生」） | FR-SGO-005 / 107 / 112 | 台账条目 + 一致性门禁 |
| **AC-SGO-020** | **门禁受审集合只增**：法九 node 门禁入集合；`CHROMIUM_GATES === 9` | FR-SGO-077 / 115 | `test/gate-integrity.test.ts` 绿 |
| **AC-SGO-021** | **门禁严格串行 + `KL-N-10` 处置**（隔离复跑 ≥2；仍红如实记录） | FR-SGO-114 | 执行记录 + `gate-integrity` 绿 |
| **AC-SGO-022** | **单节点保证**：`nodeCount === 1` 为唯一通过条件（0 / 多 ⇒ 失配） | FR-SGO-033 | 断言 + 双向反证 |

### 9.4 红线、体积与人工面

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-SGO-023** | **冻结面零容差**：`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 逐字节逐字 | FR-SGO-123 | `stat` + sha256 前后一致 + `content.test.ts` |
| **AC-SGO-024** | **体积分列预算 + 距档结论 + 15% 缓冲**；升档走 EC 显式路径 + 作者一行 | FR-SGO-120~125 | §5.12 表 + 逐叶重登记 + EC-SGO-022 |
| **AC-SGO-025** | **base 零 diff + 判定链零触碰**（含 `zeroDiffFiles` 9 项哈希 pin） | FR-SGO-031 / 037 | `insight-no-escalation` + `zeroDiffFiles` 机核 |
| **AC-SGO-026** | **人工面如实登记**：真机观感 / 「AI 是否真理解『原地』」/ 长会话体感 逐项 `⏳ 未执行`，不冒充 PASS | FR-SGO-094 | §9.4 人工面清单（下表） |

**§9.4 人工面清单（headless 不可合成项，逐项如实标注）**

| # | 人工项 | 判据来源 | 本轮状态 |
|:-:|---|---|:--:|
| M1 | 「AI 是否真的把『原地』理解为引用目标」（语义遵从观感） | 真机观感（S0′ 机核只证读数与改写处数） | `⏳ 未执行` |
| M2 | 42 张连点疲劳是否消失（体感） | 作者体感 | `⏳ 未执行` |
| M3 | 批量计划卡在真机的可读性 / 可否决性 | 作者观感 | `⏳ 未执行` |
| M4 | SPA 重渲染下锚定失败提示的实际可理解度 | 真机观感 | `⏳ 未执行` |

### 9.5 门禁基线清单（**计数只增，逐项对账**）

> **口径**：基线数**引自 R6 记录 §门禁对账表**（本轮未复跑，§2.4 E9）；收口时给**实测**计数（FR-SGO-116）。**本轮全部标 `⏳`。**

| 门禁 | R6 后基线（引自 R6 记录） | 本 Feature 预期变化 | 本轮 |
|---|--:|---|:--:|
| `npm test` | 1330 | +（法九门禁 + 载荷 / 取值 / 断言；**只增**） | `⏳` |
| `test:ui` journey | 171 | +（S0′ 范围断言；保护段若取代走八步） | `⏳` |
| `test:binding` | 192 | 不变或 + | `⏳` |
| `test/ui/s0-self-driven.mjs` | 59 | **+**（范围读数 / 改写处数 ≤ 引用数 / 双向反证） | `⏳` |
| `test/ui/law8-plaintext.mjs` | 36 | **零降级**（批量清单零明文 + 掩码） | `⏳` |
| `test/ui/no-dead-end.mjs` | 49 | **+**（WIDEN 二择后零死端） | `⏳` |
| `test:supersession` | 37 | **+**（RL-06 扩批量变体） | `⏳` |
| `test/op-three-tier.test.ts` | （族内） | **+**（OT-⑩ 扩批量变体） | `⏳` |
| `test/op-wiring.test.ts` | （族内） | 入口计数**不变** + 新反证 | `⏳` |
| `test/insight-no-escalation.test.ts` | （族内） | **不变**（base 零 diff 必绿） | `⏳` |
| `test/gate-integrity.test.ts` | 19 | **+**（法九 node 门禁入集合；`CHROMIUM_GATES === 9`） | `⏳` |
| **法九（新）** `test/law9-scope-reading.test.ts` | — | **新增**（双向反证 + 三段控制 + 真源切片） | `⏳` |
| `test:size-*` | （族内） | **逐叶重登记**（五要素 + V3-VOL-3 三值） | `⏳` |
| `test:density`（242）/ `test:l0`（248） | 242 / 248 | 视 PD-SGO-004 裁决（阈值不得变） | `⏳` |
| `test:page-input`（118）/ `test/ui/l1.mjs`（120） | 118 / 120 | **+**（范围锚读数双向反证） | `⏳` |

---

## 10. 覆盖矩阵

### 10.0 缺口全景（**GAP-SGO-01~09**，本规范派生的规范化解构）

> **口径**：discovery 的 15 条问题（Q-SGO-001~015）在**需求层**可归约为 9 个**缺口面**；下表证明**无孤儿**（每缺口有 FR + AC 承载）。

| # | 缺口（需求层） | 由哪些 Q 归约 | 承载 FR | 承载 AC |
|---|---|---|---|---|
| **GAP-SGO-01** | 回合载荷**无引用事实**（范围指称物理缺失） | Q-SGO-001 / 006 / 007 | FR-SGO-010~019 | AC-SGO-002 / 011 / 012 |
| **GAP-SGO-02** | **无范围法则**，越界不可判 | Q-SGO-002 / 011 | FR-SGO-020~028 | AC-SGO-003 / 009 |
| **GAP-SGO-03** | 工具面**无 ref 锚定** + 失配口径未定义 | Q-SGO-003 / 015 | FR-SGO-030~038 | AC-SGO-007 / 022 |
| **GAP-SGO-04** | 逐条授权**退化为连点** | Q-SGO-004 | FR-SGO-040~050 | AC-SGO-005 / 015 / 016 |
| **GAP-SGO-05** | 批量授权的**范围绑定 / consent 关系**缺失 | Q-SGO-005 | FR-SGO-042~045 / 049 | AC-SGO-005 |
| **GAP-SGO-06** | **法则机核性**（载体）未定 ⇒ 法则可静默失效 | Q-SGO-010 / 013 | FR-SGO-070~077 | AC-SGO-003 / 020 |
| **GAP-SGO-07** | 范围漂移**无留痕 / 无读数** | Q-SGO-009 | FR-SGO-080~084 | AC-SGO-010 |
| **GAP-SGO-08** | **端到端验收锚缺失**（S0 只验零按键，不验范围） | Q-SGO-014 | FR-SGO-090~094 | AC-SGO-001 / 013 / 014 |
| **GAP-SGO-09** | **载体 / 体积 / 冻结面**约束（零新增 + 距档 35,777） | Q-SGO-012 + 编排纪律 | FR-SGO-041 / 063 / 120~125 | AC-SGO-006 / 023 / 024 |

> **边界说明（避免误修）**：「引用三义（证据 / 范围 / 语境）共用一份 `RefFacts`」（Q-SGO-008）**不是**本 Feature 的缺口 → 本规范**不新增数据结构**，只**增设读数（范围语义）**并保持证据面只读（FR-SGO-024 / X-SGO-5）；「手动回合无悬置」（Q-SGO-007 的表层）同理由 FR-SGO-013 以**同一构建点**覆盖，不新造悬置。

### 10.1 问题覆盖矩阵（Q-SGO-001~015 → FR / AC 逐条可追溯）

| Q | 问题（要点） | 承载 FR | 承载 AC |
|---|---|---|---|
| **Q-SGO-001** | 引用事实不进回合（母问题） | FR-SGO-010~015 / 018 / 019 | AC-SGO-002 |
| **Q-SGO-002** | 无范围法则（越界不需征询且不可判） | FR-SGO-020~026 | AC-SGO-003 / 009 |
| **Q-SGO-003** | 工具面零 ref + 失配口径未定义 + 红线夹击 | FR-SGO-030~037 | AC-SGO-007 / 022 / 025 |
| **Q-SGO-004** | 逐条授权退化为连点（42 张） | FR-SGO-040~042 / 046 / 048 | AC-SGO-005 / 015 |
| **Q-SGO-005** | 批量范围绑定与 consent 关系未定义 | FR-SGO-042~045 / 049 | AC-SGO-005 |
| **Q-SGO-006** | 载荷与零明文口径未定（`textDigest` = 页面文本） | FR-SGO-011 / 012 | AC-SGO-002 / 010 |
| **Q-SGO-007** | 手动回合与驱动者回合可见性不对称 | FR-SGO-013 / 014 | AC-SGO-002 |
| **Q-SGO-008** | 引用三义未区分（证据 / 范围 / 语境） | FR-SGO-018 / 024（范围语义单独成读数；证据面只读） | AC-SGO-003 / 012 |
| **Q-SGO-009** | 范围漂移无留痕 | FR-SGO-080~084 | AC-SGO-010 |
| **Q-SGO-010** | 法则退化为提示词约定的风险（零机核） | FR-SGO-022 / 023 / 070 | AC-SGO-003 |
| **Q-SGO-011** | 过度约束反风险（正当全页被卡） | FR-SGO-027 / 060~062 | AC-SGO-008 / 009 |
| **Q-SGO-012** | 体积距档仅 35,777 B | FR-SGO-120~125 | AC-SGO-024 |
| **Q-SGO-013** | 越界写终态 / 读数词汇缺位 | FR-SGO-021 / 105 | AC-SGO-003 |
| **Q-SGO-014** | 端到端验收锚缺失 | FR-SGO-090~094 | AC-SGO-001 / 013 |
| **Q-SGO-015** | `data-wcli-ref` 耐久性（SPA 丢标记） | FR-SGO-034 / 038 | AC-SGO-007 |

### 10.2 根因覆盖（§2.3 A~R）

| 根因 | 承载 FR |
|---|---|
| **A** 载荷只有 `user` | FR-SGO-010~015 |
| **B** 系统段静态常量 | FR-SGO-016~017 |
| **C** base 工具零 ref / risk 面 | FR-SGO-030 / 032 |
| **D** 锚点已存在（best-effort） | FR-SGO-033 / 034 |
| **E** 跨进程断层 | FR-SGO-019 / 031 |
| **F** 包装先例 | FR-SGO-031 |
| **G** 逐条授权链路 | FR-SGO-040 / 041 / 048 |
| **H** 引用事实结构现成 | FR-SGO-011 |
| **I** 判定 3 结果 + 6 维度 | FR-SGO-018 / 037 |
| **J** 留痕零值纪律 | FR-SGO-080~083 |
| **K** 调用点计数门禁 | FR-SGO-006 / 014 / 028 |
| **L** 载体冻结面 + type-only 先例 | FR-SGO-010 / 041 |
| **M** 红线⑥ / 特权手势可机核 | FR-SGO-043~045 / 049 |
| **N** base 零 diff | FR-SGO-031 |
| **O** 既有 EC 不足 | FR-SGO-034 |
| **P** 体积 / 冻结面 + 未闭合义务 | FR-SGO-120~125 |
| **Q** 法七扩展形态可复用 | FR-SGO-071~077 |
| **R** 法八四面 | FR-SGO-046 / 050 |

---

## 11. 开放点裁决落位表（O-SGO-001~009 → 条文）

| O | 开放问题（要点） | **裁决（编排器，全按 discovery 推荐）** | 落位条文 | 裁决记录 |
|---|---|---|---|---|
| **O-SGO-001** | 命名与版本位语义配对 | **① 采纳**：`v55-f-scope-governance` + **`v0.11.1`**（`-f-` 补丁级跟进轮，承 `v45-f-regularization` 先例；patch 语义一致）；**不采纳** ② `v56` + `v0.12.0`、③ 并入 v55 树（与 D7 冲突） | §1 元数据 · FR-SGO-001 · §14.1 | **DC-SGO-001** |
| **O-SGO-002** | 范围法则的载体 | **① 双轨**：**机制范围读数 = 唯一判据（机核）** + **提示词表述 = 引导**；**不采纳** ② 纯机制（模型无引导）、③ 纯提示词（零机核） | FR-SGO-020~023 / 070~077 | **DC-SGO-002** |
| **O-SGO-003** | 引用载荷形态与字段集 / 零明文口径 | **① 采纳**：**`chat` type-only 结构化载荷**（字段集见 FR-SGO-011）+ **口径写死**：**页面文本可入 LLM 上下文 / 凭据值不可（法八）/ 留痕仍只含字段名**；**不采纳** ② 拼进 `user` 文本、③ 每回合重观测 | FR-SGO-010~012 · NG-SGO-013 / 014 | **DC-SGO-003** |
| **O-SGO-004** | 工具面 ref 锚定形态与实现载体 | **① 采纳**：**plugin 侧包装**（`chrome-host.ts:206` 先例；**base 零 diff 不解冻**）+ **`--ref <n>`**（序号，与 chip 同词汇）→ **`[data-wcli-ref="ref_n"]`** + **单节点保证** + **失配 fail-closed 非静默**；**先落写命令 `set-text`**，读命令登记后续裁决（PD-SGO-001）；**不采纳** ② 读写都加（本阶段）、③ 只加不回退（弱） | FR-SGO-030~037 · NG-SGO-010 | **DC-SGO-004** |
| **O-SGO-005** | 批量授权的范围绑定与 consent 关系 | **① 采纳**：**计划指纹绑定（目标集合 ∧ 动作类型 ∧ 文本对）+ 一次用户手势 + 计划外逐条回落 + 特权 op 恒不入批 + 批量变体注入必红**；**不采纳** ② 时间窗自动放行、③ 只展示不放行 | FR-SGO-040~049 | **DC-SGO-005** |
| **O-SGO-006** | 扩大范围的征询形态 | **① 采纳**：**`ask-user` 二择**（「仅引用范围内」/「整页」）+ 用户确认 = **范围扩张的可判事实（入留痕）**；**不采纳** ② 直接执行写越界留痕、③ 硬禁止 | FR-SGO-060~063 · NG-SGO-015 | **DC-SGO-006** |
| **O-SGO-007** | 法则是否立法（机核化）与判据形态 | **① 采纳**：**立法「法九：范围读数」机核判据**（**双向反证 + 注入必红 + 三段控制禁恒真**，参考 `law7x-ext` 形态 + `law8` 的 per-face `expectFailPattern`）；**不采纳** ② 仅提示词 + 人工走查、③ 只做端到端样板 | FR-SGO-070~077 · §9.5 | **DC-SGO-007** |
| **O-SGO-008** | 体积预算与叶拆分 | **① 采纳**：**spec 先出分列预算 + 15% 缓冲**（§5.12.1）；**拆 2 叶**（v55f-1 范围底座 → v55f-2 批量授权，依存序）；**升档走 EC 显式路径 + 作者一行**；**不采纳** ② 先排全量、③ 单叶 + 内部分组（**已论证不采纳**，见 §14.1 退化论证） | FR-SGO-120~125 · §14 | **DC-SGO-008** |
| **O-SGO-009** | 是否需要外部竞品调研 | **① 采纳**：**不需要**（有仓库内 S2 / S0 / `law7x-ext` / `auth` 卡先例 + 作者指示为最高价值源）；**不采纳** ② 登记待调研 | NG-SGO-018 | **DC-SGO-009** |

### 11.1 裁决记录（DC-SGO-001~009 理由一句话）

| # | 对应 | 理由（一句话） |
|---|---|---|
| **DC-SGO-001** | O-SGO-001 | 本 Feature 是 **v5.5 主题（引用即下一步）的范围治理补丁级跟进** —— 不是新主题（不构成 `v56`），也不并入 v55 树（D7 禁止改写 v55 产物），故 `-f-` + patch 版本位与先例同构。 |
| **DC-SGO-002** | O-SGO-002 | 纯提示词**零机核**（现无门禁读提示词，改一行即静默失效：Q-SGO-010 / R-SGO-002）；纯机制**无引导**（模型可能不知要遵守）⇒ **读数作判据 + 提示词作引导**是最小充分且可验收的组合。 |
| **DC-SGO-003** | O-SGO-003 | 拼进 `user` 会**污染用户可见行**并与「我」行留痕语义冲突（NG-SGO-014）；每回合重观测引入每回合页面探测（NG-SGO-013）；**type-only 字段零运行时字节**（承 `ChatResultVariant` 先例）⇒ 口径写死（页面文本可入上下文 / 凭据值不可 / 留痕只含字段名）使 A-SGO-007 可验收。 |
| **DC-SGO-004** | O-SGO-004 | base 零 diff 是**跨包硬红线**（`insight-no-escalation.test.ts:147`，历史仅放行性能修复一次）⇒ 包装层是**唯一不需解冻**的路径（先例 `chrome-host.ts:206`）；写命令先落 = 先把**风险面**（越界写）纳入判据，读命令是成本面（PD-SGO-001 后置）。 |
| **DC-SGO-005** | O-SGO-005 | 计划指纹 + **一次真实手势** + 计划外回落 + 特权不入批，是**唯一同时满足**「解 42 连点」与「不弱化红线⑥」的形态；时间窗方案（②）**时间与范围都难判**且有绕过面。 |
| **DC-SGO-006** | O-SGO-006 | 用户**只在最后 1 处**被反问就答了（`ty.md:1885-1893`）⇒ 他愿答、只是系统**没在范围层问过**；硬禁止（③）会把正当全页任务卡住（Q-SGO-011）。 |
| **DC-SGO-007** | O-SGO-007 | 法七 / 法七扩展 / 法八都是**可机核机制**；若范围法则仅入 `SYSTEM_PROMPT` 则 `grep SYSTEM_PROMPT test/` = 0 ⇒ 只能靠人工走查，**修了会再退化**（v4.5 教训：反证恒绿）；**优先以「读数」承载**（不新增终态字面量，保 `STREAM_TERMINALS` 正交），plan 若证不可行再显式登记词汇扩张（FR-SGO-105）。 |
| **DC-SGO-008** | O-SGO-008 | 两叶**共享底座真实存在**（范围读数 + 引用载荷 + 锚定解析），但**批量授权另有一套风险面**（红线⑥ / 法八 / 计划指纹），**且体积必须分列预算**；单叶会把「安全边界裁决」与「载荷形态」耦在一轮 ⇒ **拆 2 叶（依存序）**；退化单叶的论证见 §14.1（不可行的三条理由）。 |
| **DC-SGO-009** | O-SGO-009 | 「selection-scoped action / 批量破坏性操作授权聚合」的外部参照价值低于**仓库内已有可核先例**（S2 十环节 / S0 59 / `law7x-ext` 四类五段 / `auth` 卡 6 终态）⇒ 调研**不执行**，且**不得**据此外推（NG-SGO-018）。 |

---

## 12. X-SGO-1~7 显式取代 → 判据等价重写映射表（**映射摘要**）

> **口径**：**「显式取代」≠「放宽」**——判据必须**等价重锚**（断言力不降、计数只增），并留台账（FR-SGO-107 / 112）。**默认优先「在既有注册表内扩张（diff = 0）」读法。**

| X | 既有形态（现状逐字） | 取代 / 裁决内容 | 等价重写判据（**不得放宽**） | 状态 |
|---|---|---|---|---|
| **X-SGO-1** | 回合载荷恰 1 字段（`sidepanel.ts:329` `{user}`）；`runChat(s,user)` 裸串（`:887`） | **允许回合携带引用上下文**（type-only ⇒ 不新增 kind；两条入口同口径） | `test/op-wiring.test.ts`（`requestTurn(` **仍恰 2**）+ `messaging` type-only 判据（`KIND_SET` **40**） | **已发生** |
| **X-SGO-2** | 系统段 = 静态常量（`:943` / `:948`） | **常量基座 + 每回合追加段**（常量保留为基座） | **新增**法九判据（现无门禁读提示词）+ 基座 5 条条款逐字保留断言 | **已发生** |
| **X-SGO-3** | base `dom` 零 ref；base 零 diff（`insight-no-escalation:147`） | **`--ref <n>` 经 plugin 侧包装**（覆写 schema + executor）；**base 零 diff 不解冻** | `insight-no-escalation` 绿 + risk / `subcommandRisks` **不得放宽** + 新增「锚定失败非静默」判据 | **已发生** |
| **X-SGO-4** | 逐条写入授权（每次命令一张 `auth` 卡） | **任务级批量授权**（计划 → 一次手势 → 计划外回落） | `RL-06` / OT-⑩ **扩批量变体并注入必红**；`law8` 36 **不得降级**；`auth` 6 终态语义保持 | **已发生** |
| **X-SGO-5** | 引用判定只回答「可不可用」（3 结果 / 6 维度，fail-closed） | **增设「作为范围锚」的解析读数**（单节点保证 + 失配 / 失效可判） | `valid/invalid/unknown` 的 **deny 方向不动**；新增读数**双向反证** | **已发生** |
| **X-SGO-6** | 终态词汇（`BLOCKED_TERMINALS` 恰 5 + `DRIVER_TERMINALS` 恰 4） | **本规范裁决 = 优先以「读数」承载**（不新增终态字面量）；若 plan 证不可行 ⇒ 显式登记词汇扩张（正交 + 唯一声明） | `no-dead-end`（49）+ `law7x-ext` + `driver-terminals`（**第二声明 ⇒ FAIL**） | **读数读法（未扩张）**；扩张为条件分支（plan 裁决） |
| **X-SGO-7** | 主流程调用点计数（`requestTurn(` 2 / `maybeRecommend(` 7 / `nextAfterSettle` 单入口） | **走既有注册表内扩张**（主流程 diff = 0） | `op-wiring` + `driver-timings` / `driver-quadruple` / `recommendation-sources` 绿；**不得**新增调用点 | **未发生取代**（登记 ✅） |

> **边界**：**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」的方式落地**；默认优先「**在既有注册表内扩张（diff = 0）**」的读法，只有当等价重锚被证不可行时才显式放宽并留台账。

---

## 13. 红线继承表（N-SGO-001~023 逐条承载 + N-SGO-024~030 spec 新增）

### 13.1 继承红线（discovery §7.2 逐字保留）

| # | 红线（**逐字**） | 本规范承载 |
|---|---|---|
| **N-SGO-001** | `dist/content.js` = **177,076 B**（sha `52a82620…`，**零容差**） | FR-SGO-123 / AC-SGO-023 / NG-SGO-002 |
| **N-SGO-002** | `dist/pick-layer.js` = **34,358 B**（sha `77796bab…`，**零容差**） | FR-SGO-123 / AC-SGO-023 / NG-SGO-002 |
| **N-SGO-003** | `sidepanel.js` ≤ 生效上限 **607,554 B** = `floor(578,623 × 1.05)`；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`** | NFR-SGO-001 / FR-SGO-120 / FR-SGO-124 |
| **N-SGO-004** | V3-VOL-3 三值：档位 = **614,400 B**、绝对上限 = **675,840 B**（= 档位 × 1.10）、`newBaselineBytes` 同源前移；`authorConfirmation.status ∈ {pending-author-line, confirmed, overridden-by-author}`，**不得伪称已确认** | FR-SGO-124 / FR-SGO-125 / N-SGO-023 |
| **N-SGO-005** | **特权 op 恰 2 必须用户手势**：`op.authorize` / `op.perm.request`；「**SW 永不调用 `.request(`**」；**AI 不可自动执行** | FR-SGO-045 / NFR-SGO-002 / NG-SGO-004 |
| **N-SGO-006** | **consent 档（confirm / gesture）不得被 AI 代答**（含实判据 `pressDecision` + 注入反证） | FR-SGO-043 / 049 / NFR-SGO-003 |
| **N-SGO-007** | **`packages/web-cli-base/**` 零 diff**（跨包红线；须作者放行方可再动） | FR-SGO-031 / 032 / NFR-SGO-005 / NG-SGO-003 |
| **N-SGO-008** | **判定链零触碰**：`src/security/policy.ts` / `auto-authorize.ts` 在 `zeroDiffFiles` 冻结（9 项哈希 pin） | FR-SGO-037 / AC-SGO-025 / NG-SGO-005 |
| **N-SGO-009** | **`KIND_SET` 40 项逐字不增**；新消息族走 **type-only 先例** | FR-SGO-010 / 041 / NFR-SGO-007 / NG-SGO-009 |
| **N-SGO-010** | **12 kind 契约不动**；**零新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []`） | FR-SGO-041 / 063 / NG-SGO-007 / 008 |
| **N-SGO-011** | **法八零明文不退化**：流内 payload / digest / 审计 / DOM **四面零明文** | FR-SGO-046 / 050 / NFR-SGO-004 / NG-SGO-006 |
| **N-SGO-012** | **法七不退化**：5 类阻塞终态流内**必有可达 next**（死端 = 0）；本 Feature 只**扩展**词汇 / 读数，**不得**削弱既有判据 | FR-SGO-062 / AC-SGO-009 / NFR-SGO-012 |
| **N-SGO-013** | **法七扩展终态词表恰 4 项、与 `STREAM_TERMINALS` 正交**；字面量在 `src/**` 只允许出现在 `terminals.ts`（第二声明 ⇒ FAIL） | FR-SGO-105 / DC-SGO-007 |
| **N-SGO-014** | **主流程调用点计数门禁**：`requestTurn(` 仅允许 2 处；调用点登记表必须覆盖全部 op | FR-SGO-006 / 014 / 106 / X-SGO-7 |
| **N-SGO-015** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账显式取代并留痕） | FR-SGO-004 / 110 / NG-SGO-020 |
| **N-SGO-016** | 保护 pin：journey **`43054..58287` / sha `cc79f413…` / 240 行**；binding **`107780..115930` / `be9ad0e9…`**（`decision = keep`） | FR-SGO-113（若取代走八步） |
| **N-SGO-017** | **门禁严格串行**（一次一个 Chromium，绝不并发）；`CHROMIUM_GATES === 9` 不动 | FR-SGO-114 / 115 / NFR-SGO-013 |
| **N-SGO-018** | 纪律：**不碰 `main`、不 force push、path-limited `git add`、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖**；**不合 main、不发布** | §16 第 2 条 / NFR-SGO-013 |
| **N-SGO-019** | **`F-29`（A2A 候选）未立项未排期，保持原样不动**（ROADMAP 相关区段**一字不动**） | NG-SGO-012 / §16 第 2 条 |
| **N-SGO-020** | **v5.5 / R6 产物零改写**：v55 父 + 三叶 `validated` 终态、R6 记录与体积登记**原样保留** | FR-SGO-005 / NG-SGO-011 / §2.7 |
| **N-SGO-021** | `KL-N-10` 处置纪律：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | FR-SGO-114 / EC-SGO-021 / §16 第 4 条 |
| **N-SGO-022** | 纪律：**开放点不得在 spec 前被「顺手定下」**；范围法则载体 / 批量授权范围绑定 / `--ref` 读命令取舍 = **spec 批量裁决** | §11（全部 `ruled`）+ §8 PD 清单 |
| **N-SGO-023** | **`authorConfirmation.status = pending-author-line` 属未闭合义务**：任何文档 / 台账**不得**伪称体积档位已确认；升档须走 EC 家族显式路径 | FR-SGO-124 / NG-SGO-021 / EC-SGO-022 |

### 13.2 spec 新增红线（本阶段识别，与 N 同等级）

| # | 红线（**本规范新增，逐字口径**） | 依据 | 承载 |
|---|---|---|---|
| **N-SGO-024** | **法九门禁必绿且禁恒真**：`test/law9-scope-reading.test.ts` 必绿；每条判据必须有双向反证与三段控制（`ok` / `violated` / `n/a`）；**恒真断言 ⇒ 视为缺陷** | FR-SGO-071 / R-SGO-002 | AC-SGO-003 / 020 |
| **N-SGO-025** | **批量卡不得由 AI 代答 / 代填 / 自动放行 / 自动展开**（含「AI 建议计划即视为同意」的任何变体） | FR-SGO-043 / R-SGO-001 | AC-SGO-005 / NFR-SGO-003 |
| **N-SGO-026** | **计划清单「原文 → 译文」零明文口径写死**：正文与译文**仅以 UI 渲染文本**呈现；**不得**作为 payload 值 / digest 值 / 审计值 / DOM 属性写入；凭据形值 ⇒ 掩码 | FR-SGO-046 / 050 / R-SGO-005 | AC-SGO-010 / NFR-SGO-004 |
| **N-SGO-027** | **`--ref` 不得进 `packages/web-cli-base/**`**；锚定包装不得放宽 risk / 子命令集合 | FR-SGO-031 / 032 / R-SGO-003 | AC-SGO-025 |
| **N-SGO-028** | **范围读数唯一声明**：四值词汇与判定函数**恰一处声明**；第二声明 ⇒ FAIL | FR-SGO-024 | AC-SGO-003 |
| **N-SGO-029** | **无引用回合零漂移**：系统段 == 基座、读数 = `no-ref`、载荷 / 留痕 / 卡面逐字不变 | FR-SGO-017 / NFR-SGO-009 | AC-SGO-011 |
| **N-SGO-030** | **升档须作者一行**：任何体积档位变动须走 EC-SGO-022 显式路径并可追溯到作者确认；**未闭合义务不得伪称已确认** | FR-SGO-124 / N-SGO-023 | AC-SGO-024 |

---

## 14. 子 Feature 拆分与交付顺序

### 14.1 结构裁决（**2 叶，依存序，串行**）

**裁决（DC-SGO-008 / O-SGO-008 ①）**：本 Feature 拆 **2 叶**，**必须串行** `v55f-1 → v55f-2`；叶目录**直接嵌套**于父目录下（**不使用 `children/` 中间层**，目录树即特性树）：

```
specs-tree-web-cli-plugin-v55-f-scope-governance/
├── discovery.md                      # 问题挖掘（已入库）
├── spec.md                           # 本文件（父级完整规范）
├── TREE.md / state.json              # 导航 / 状态
├── specs-tree-v55f-1-ref-context-and-anchor/     # 叶1 = 范围底座（首叶）
└── specs-tree-v55f-2-batch-consent/              # 叶2 = 批量授权（末叶，依赖叶1）
```

**为什么不能退化单叶（三条论证，供 plan / 后续轮复核）**：
1. **风险面不同**：叶1 的风险面 = **载荷形态 + 判据形态**（口径与机核）；叶2 的风险面 = **红线⑥ / 法八 / 授权语义**（唯一**红线级**风险 R-SGO-001）。耦在一轮会让「授权边界裁决」被载荷实现细节掩盖（R-SGO-011 方案先行风险）。
2. **体积必须分列**：两叶预算需**分别**收口重登记（FR-SGO-125）；单叶会把两笔净增合并成一次登记，**无法定位归因**（承 v5 教训 2.8× 低估；v55 三叶合计超预算 +6,015）。
3. **验收锚层次不同**：叶1 交付 **S0′ 的范围内核**（读数 + 锚定 + 写处数 ≤ 引用数）；叶2 交付 **批量子链**（一次手势 + 计划外回落）。单叶会让 S0′ 混入批量分支，削弱「不接受批量也能验收范围」的独立性。

### 14.2 交付顺序与叶职责

| 序 | 叶 | 职责（交付形态） | 依赖 | 承载 FR |
|:-:|---|---|---|---|
| 1 | `specs-tree-v55f-1-ref-context-and-anchor`（**范围底座 / 首叶**） | 引用事实进回合（type-only 载荷 + 两入口同口径）+ 系统段组装（基座 + 追加段）+ **范围读数单源（法九）** + `--ref` 锚定（**仅 `set-text`**）+ 单节点保证 + 失配 fail-closed 非静默 + 留痕扩字段 + **S0′ 双向样板（含反证）** | —（P0，底座） | GOV 切片 · REFCTX 全部 · SCOPE 全部 · ANCHOR 全部 · LAW9 全部 · TRACE 全部 · S0′ 全部 · SUPERSEDE 100~102 / 104 / 106 · GATE 全部 · VOL 120~125 |
| 2 | `specs-tree-v55f-2-batch-consent`（**末叶 / 批量授权**） | 写入计划（N 处 目标 + 原文 → 译文）+ **计划指纹** + **一次用户手势** + 计划外回落逐条 + 逐条审计零明文 + 中途可中止 + **特权 op 恒不入批** + 批量变体注入必红 + 批量留痕 | `specs-tree-v55f-1-ref-context-and-anchor` | BATCH 全部 · WIDEN 全部 · TRACE 081 / 082 · SUPERSEDE 103 / 105 / 107 · X-SGO-4 台账 |

> **父 Feature** = 轻量规范容器（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**）。

### 14.3 FR → 叶 覆盖矩阵（**每条 FR 恰属一叶的「主责面」；共享面另标**）

| FR 段 | FR 编号 | 主责叶 | 共享面 |
|---|---|---|---|
| GOV（立案 / 结构 / 纪律） | FR-SGO-001~006 | **叶1**（父级结构 + 纪律，收口由叶1 承接） | 叶2 引用 002 / 004 / 005 |
| REFCTX（引用进回合） | FR-SGO-010~019 | **叶1** | — |
| SCOPE（法则双轨） | FR-SGO-020~028 | **叶1** | 叶2 引用 025 / 026（批量须在范围内） |
| ANCHOR（ref 锚定） | FR-SGO-030~038 | **叶1** | 叶2 引用 030 / 033 / 034 |
| BATCH（批量授权） | FR-SGO-040~050 | **叶2** | — |
| WIDEN（扩围征询） | FR-SGO-060~063 | **叶2** | 叶1 提供读数（021）与其转值（061） |
| LAW9（法九机核） | FR-SGO-070~077 | **叶1** | 叶2 加批量面断言（093） |
| TRACE（留痕） | FR-SGO-080~084 | **叶1**（080 / 083 / 084）/ **叶2**（081 / 082） | 共享字段名纪律 |
| S0′（首验收） | FR-SGO-090~094 | **叶1**（091 / 092 / 094） | 叶2 承接 093（批量覆盖断言） |
| SUPERSEDE（X 映射） | FR-SGO-100~107 | **叶1**（100 / 101 / 102 / 104 / 106）/ **叶2**（103 / 105 / 107） | 台账共享（112） |
| GATE（门禁 / 台账） | FR-SGO-110~116 | **叶1** | 叶2 增量登记 |
| VOL（体积分列） | FR-SGO-120~125 | **叶1** 出表 / **两叶各自收口实测登记** | 共享预算表（121 / 122） |

---

## 15. 风险登记（discovery 继承 R-SGO-001~011 + spec 新增 R-SGO-901~910）

### 15.1 继承风险（discovery §5.2，逐条保留等级与预登记证据）

| # | 风险 | 等级 | 承载条文 / 应对 |
|---|---|:--:|---|
| **R-SGO-001** | **批量授权被误用为「AI 代答 consent」的合法外衣（最高危 / 唯一红线级）** | **高** | FR-SGO-043~045 / 049；AC-SGO-005；N-SGO-025；**一次真实手势 + 计划指纹 + 计划外回落 + 批量变体注入必红** |
| **R-SGO-002** | **范围漂移不可判 + 易造恒真断言**（v4.5 教训：反证恒绿三类缺陷） | **高** | FR-SGO-070~077；AC-SGO-003；N-SGO-024；**先定读数再定法则** |
| **R-SGO-003** | **`packages/web-cli-base/**` 零 diff 红线被撞** | **高** | FR-SGO-031 / 032；AC-SGO-025；N-SGO-027；**plugin 侧包装；解冻须作者放行** |
| **R-SGO-004** | **失配静默 ⇒ 写错节点** | **高** | FR-SGO-033 / 034 / 038；AC-SGO-007 / 022；EC-SGO-001~003；**fail-closed 非静默** |
| **R-SGO-005** | **法八被批量计划清单撞破**（N 处「原文→译文」想把正文带进流内） | **高** | FR-SGO-046 / 050；AC-SGO-010；N-SGO-026；**静态模板 + 正文仅 UI 渲染 + 掩码** |
| **R-SGO-006** | **体积越档位（距档 35,777 B）+ 历史低估**（v5 2.8× / v55 +6,015 / R6 +5,199） | **中高** | FR-SGO-120~125；AC-SGO-024；EC-SGO-022；**先出分列预算 + 15% 缓冲 + 预置升档路径** |
| **R-SGO-007** | **`KIND_SET` / 12 kind / 零宿主被撞** | **高** | FR-SGO-041 / 063；AC-SGO-006；N-SGO-009 / 010；**复用 `auth` kind + type-only** |
| **R-SGO-008** | **回合载荷扩张引发主流程门禁重锚** | **中高** | FR-SGO-006 / 014；AC-SGO-002；X-SGO-7；**优先「既有注册表内扩张（diff = 0）」** |
| **R-SGO-009** | **门禁严格串行 + `KL-N-10` flake 被误读为回归** | **低—中** | FR-SGO-114；EC-SGO-021；**隔离复跑 ≥2 + 如实记录** |
| **R-SGO-010** | **断言只增的门禁规模**（`npm test` 1330 起只增） | **中** | FR-SGO-004 / 110；§9.5 对账表；**等价重锚而非新增同义断言** |
| **R-SGO-011** | **方案先行风险**（载体 / 绑定 / 读命令取舍被顺手定下） | **中高** | §11（`O-SGO-*` 全部 `ruled`）+ §8 PD 清单；N-SGO-022 |

### 15.2 spec 新增风险

| # | 风险 | 等级 | 说明 / 应对 |
|---|---|:--:|---|
| **R-SGO-901** | **读数与引用判定双源漂移**：范围读数另起一套 valid 判定 ⇒ 与 `ref-validity.ts` 的 fail-closed 方向不一致 | 中高 | FR-SGO-018 / 024；AC-SGO-003 / 012；**读数只消费 `refState`，不重判** |
| **R-SGO-902** | **载荷 type-only 被实现成新 kind**（或字段进 `KIND_SET`）⇒ `content.js` 零容差直接红 | 高 | FR-SGO-010 / 041；AC-SGO-006 / 023；**`KIND_SET` 长度断言 + `content.js` sha** |
| **R-SGO-903** | **范围读数被写成恒真**（如「只要有引用就判 `in-scope`」）⇒ 判据永不 FAIL | 中高 | FR-SGO-071 / 073~076；AC-SGO-003；**三段控制 + 四必判项各带反证** |
| **R-SGO-904** | **`--ref` 包装层偷偷放宽 risk**（为让 `--ref` 可用而把 `set-text` 降档）⇒ 安全面退化 | 高 | FR-SGO-032；AC-SGO-025；N-SGO-027；**逐字段对照 base** |
| **R-SGO-905** | **批量计划清单把正文写进 digest / 审计**（「留痕更完整」的善意误用）⇒ 法八红 | 高 | FR-SGO-046 / 050；AC-SGO-010；N-SGO-026；**审计只记字段名 + 计数 + 指纹摘要** |
| **R-SGO-906** | **计划指纹被判成「形状相同即放行」**（不含文本对）⇒ 计划外写被误放行 | 中高 | FR-SGO-042 / 044；AC-SGO-015；**指纹 = 目标集合 ∧ 动作类型 ∧ 文本对** |
| **R-SGO-907** | **WIDEN 二择被实现为「AI 自答」或「默认整页」** | 高 | FR-SGO-026 / 060 / 061；N-SGO-025；**确认必须真人手势 + 入留痕** |
| **R-SGO-908** | **无引用回合出现行为漂移**（追加段误加 / 读数误判 `in-scope`） | 中高 | FR-SGO-017；AC-SGO-011；N-SGO-029；**逐字 baseline 断言** |
| **R-SGO-909** | **S0′ 被写成「脚本绿」而非「链路可判」**（用假 provider 跳过真实读数与包装） | 中高 | FR-SGO-090 / 092；AC-SGO-001 / 013；**真源切片 + 双向反证（承 v5-2 review BLOCK-03 教训）** |
| **R-SGO-910** | **体积评估被跳过 / 单叶合并登记** ⇒ 越限时无可回退 | 中高 | FR-SGO-120 / 125；AC-SGO-024；EC-SGO-022；**先预算后落地 + 逐叶重登记** |

---

## 16. 纪律与验证契约

| # | 纪律 | 依据 |
|:-:|---|---|
| 1 | **`.sddu/**` 只写本 Feature 目录**（+ 已入库 `ty.md`）；本阶段（spec）零改动 `src/` / `test/` / `dist/` / `design/` / `docs/` 与 `ROADMAP.md` | D6 / FR-SGO-003 |
| 2 | **path-limited `git add`**（禁 `git add -A` / `.`）；不 force push；不合 main；不发布；无新依赖；不改 `packages/web-cli-base/**`；不改 `.opencode/opencode.json`；`F-29` 区段一字不动 | N-SGO-018 / 019 / NG-SGO-003 / 012 |
| 3 | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile） | N-SGO-017 / FR-SGO-114 |
| 4 | **`KL-N-10` 处置纪律**：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | N-SGO-021 / EC-SGO-021 |
| 5 | **断言零删除零降级、计数只增不减**（唯一例外：保护段显式取代 + 台账留痕） | N-SGO-015 / FR-SGO-004 / 110 |
| 6 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | FR-SGO-111 / AC-SGO-018 |
| 7 | **人工面如实登记**：真机观感 / 语义遵从体感等 headless 不可合成项逐项 `⏳ 未执行`，**不得冒充 PASS** | FR-SGO-094 / AC-SGO-026 / §9.4 |
| 8 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §7.1 + 本规范 §2.3 / §2.4）；未跑任何门禁 / 构建 / Chromium | D6 / §2.4 |
| 9 | **体积预算先评估后落地**：先出分列净增上下界与越限路径口径，再排落地；`authorConfirmation` **不得静默改写** | R-SGO-006 / 910 / FR-SGO-120 / 124 |
| 10 | **不编造外部结论**：竞品调研**未执行**（口径 = 「未执行，不阻塞」），不得据此外推 | NG-SGO-018 / O-SGO-009 |
| 11 | **取代与实现同轮完成**：X-SGO-1~7 的台账登记与判据重锚**不得**拆到「下一轮补」；**未发生取代的 X 项须如实登记「未发生」** | FR-SGO-107 / 112 / §12 |
| 12 | **两叶串行 + 共享面一次做完**：`v55f-1 → v55f-2`；体积 / 保护段 / 取代台账 / `knownGap` 四类共享面**恰一次**登记（叶1 承接共享面，叶2 增量登记） | FR-SGO-002 / 005 / AC-SGO-019 / 024 |
| 13 | **范围语义不可旁路**：读数单源 + 载荷唯一构建点 + `--ref` 唯一包装层；**不得**新增散落判定点 / 第二声明 / 第二通道 | N-SGO-028 / FR-SGO-014 / 019 / 024 / 031 |
| 14 | **法九不可退化为文档**：门禁真源切片指向读数模块（**不得**读 `SYSTEM_PROMPT`）；**不得**以「提示词写了」为通过条件 | N-SGO-024 / FR-SGO-022 / 023 / 072 |
| 15 | **`authorConfirmation` 占位口径**：档位 614,400 / 绝对上限 675,840 / 生效上限 `floor(578,623 × 1.05) = 607,554` —— `pending-author-line` **未闭合义务，不得伪称已确认** | N-SGO-004 / 023 / FR-SGO-124 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5.5.1「范围治理：引用即范围」需求规范）：**父 Feature = 轻量规范容器 + 2 叶**（`v55f-1-ref-context-and-anchor` → `v55f-2-batch-consent`，依存序串行，**已论证不退化单叶**）；**O-SGO-001~009 九条开放点全部裁决**（status 一律 `ruled`，DC-SGO-001~009，采纳 discovery 推荐项）；**FR 88 条**（GOV 6 / REFCTX 10 / SCOPE 9 / ANCHOR 9 / BATCH 11 / WIDEN 4 / LAW9 8 / TRACE 5 / S0′ 5 / SUPERSEDE 8 / GATE 7 / VOL 6）；**NFR 14** / **EC 22** / **NG 22** / **US 10** / **G 8** / **AC 26**（核心 = 001 **S0′ 全链机器化（地位 = v5.5 之 S0 / v5 之 S2）** / 002 引用事实进回合 / 003 **范围读数（法九）** / 004 X-SGO 等价重锚 / 005 批量授权不侵蚀红线⑥ / 007 锚定 fail-closed）；**关键口径**：**法则双轨（机制读数 = 判据 + 提示词 = 引导）** · **引用载荷 `chat` type-only；口径写死「页面文本可入 LLM 上下文 / 凭据值不可（法八）/ 留痕仍只含字段名」** · `--ref <n>` → `[data-wcli-ref="ref_n"]`（plugin 侧包装，**base 零 diff 不解冻**，`chrome-host.ts:206` 先例）+ 单节点保证 + 失配 fail-closed 非静默 + **先落 `set-text`（读命令登记 PD-SGO-001）** · 批量授权 = **计划指纹 + 一次用户手势 + 计划外逐条回落 + 特权 op 恒不入批** · 扩大范围 = **`ask-user` 二择 + 入留痕** · **立法「法九：范围读数」（双向反证 + 注入必红 + 三段控制禁恒真，参考 `law7x-ext`，node 门禁，`CHROMIUM_GATES === 9` 不动）** · 零新增载体（`auth` kind / `KIND_SET` 40 / 12 kind / 零宿主）· **体积分列预算**（A 列 sidepanel 9.5~14.5 KB、+15% 缓冲 10.9~16.7 KB ⇒ 距档 35,777 B 正常口径不触发升档；2.8× 最坏 ≈46.7 KB ⇒ 预置升档 EC 路径 + 作者一行）· 冻结面 `content.js` 177,076 B / `pick-layer.js` 34,358 B **零容差**；**X-SGO-1~7 → 判据等价重写映射表**（X-SGO-7 = 未发生取代，如实登记）；**N-SGO-001~023 红线继承逐条承载 + N-SGO-024~030 spec 新增红线**；R-SGO-001~011 继承 + R-SGO-901~910 新增；**缺口全景 GAP-SGO-01~09 + Q-SGO-001~015 覆盖矩阵 + A~R 根因覆盖**；遗留开放点 PD-SGO-001~005；**现状事实核对 §2.4 + 5 条复核订正 COR-SGO-1~5** | 2026-09-23 | SDDU Spec Agent |

