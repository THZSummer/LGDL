# 问题挖掘报告：specs-tree-web-cli-plugin-v55-f-scope-governance

> **文档定位**: SDDU 问题挖掘报告 — 记录 web-cli-plugin「**范围治理（scope governance）：引用即范围**」的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = ① 作者编排指示（2026-09-23，**P1/P2 为核心，P3/P4/P5 已由 R6 修复不重复立项**，逐字保留于 §0.3）② 真机体验证据 **`ty.md`**（1963 行；本 Feature 第一证据，本轮**入库**，来源与处置见 §0.1）③ 已完成根因诊断（逐条 `file:line`，本轮**只读复核**于 §7.1）④ R6 缺陷快修轮产物（`packages/web-cli-plugin/docs/r6-ty-experience-fix-2026-09-23.md`，P3/P4/P5 已闭环）⑤ 上游收口总账（`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/closeout.md`：F-33 三叶 `validated` + 体积两次升档 + `pending-author-line`）⑥ 仓库现状（分支 `feature/web-cli-plugin` @ `74d76c1`（R6）；本轮实测）⑦ 编排器代作者决策（2026-09-23：作者已授权编排器代行决策；**不访谈作者基本框架，开放点收集后附推荐，spec 阶段批量裁决**）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（web-cli-plugin F-34「范围治理：引用即范围」问题挖掘）

web-cli-plugin「**范围治理（scope governance）**」问题挖掘报告 —— 把作者编排指示（**引用事实必须进回合 / 引用即范围的法则 / 工具面 ref 锚定 / 任务级批量授权**）与真机证据 `ty.md`（**用户拾取引用 ① → 答「原地翻译为中文」→ AI 把「原地」理解为整页就地替换 → 42 处 `set-text` 全页改写 + 42 张同文案授权卡**）转成可验收的问题域：**用户已经用「引用」把范围指出来了，但系统在机制上不知道这件事** —— 引用的事实（id / 文本摘要 / 选择器 / `data-wcli-ref` 标记）**没有进入回合**（回合的 `user` 载荷只有答案原文），提示词里**没有任何范围法则**，工具面**没有 `--ref` 锚定参数**，而写入的授权是**逐条**的（42 次同文案点击），于是"用户指的是哪一处"这件事在整个链路上**全程不可见**，最终产物是"任务完成、范围远超意图"。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（编排指示 / 真机证据 / 代码根因 / 前轮修复 / 编排器决策 / 仓库实测），供 spec 阶段追溯；**不加入任何方案推断，不写需求条文**。

### 0.1 第一证据 `ty.md` —— 本轮入库处置（**如实登记**）

| 项 | 事实 |
|---|---|
| 文件 | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/ty.md`（**1963 行**，真机侧栏会话全文，21:28:28 – 21:32:29） |
| 入库前状态 | **未跟踪**（`git status --short` 唯一 `??` 项） |
| 处置 | **原地提交入库**（**不移动**）——理由：① R6 快修记录（`packages/web-cli-plugin/docs/r6-ty-experience-fix-2026-09-23.md:5`）、`test/size-baseline.ts` 的 R6 登记理由、v55 收口总账均**按该路径引用**它；移动 = 未登记的跨树改写（v55 产物零改写纪律，D7 先例）；② 它本身就是 **v5.5 真机现场**的原始记录，住在 v55 树内是事实归属。**本 Feature 以「引用 + 标注来源」的方式把它作为第一证据**，不改其一个字节 |
| 来源标注 | 作者真机体验（2026-09-23，`platform.deepseek.com`，侧栏「系统事件 / 页面引用 / ask-user / 命令 / 授权申请 / AI 答复」时序全文） |
| 证据性质 | **会话记录**（人工转录，非截图 / 非录屏）；本报告不声称有截图证据 |

### 0.2 真机现场（`ty.md` 实测数字，**本轮逐项 `grep` 复核，非引用二手**）

| # | 实测项 | 值 | 复核方式 |
|:-:|---|--:|---|
| S1 | `dom set-text` **调用**（命令行形态） | **42** | `grep -c "^dom set-text"`（43）− 1 处 AI 叙述行（`ty.md:1930`，`text=Close` 失败自述） |
| S2 | `授权申请` 卡 | **42** | `grep -c "^授权申请$"` |
| S3 | `已批准` | **42** | `grep -c "^已批准$"` |
| S4 | 同文案授权理由 | **42** 次逐字相同：「选中『dom：需确认：命中缺省 ask 取向（敏感面）』后本轮按该选项推进」 | `grep -c "需确认：命中缺省 ask 取向"` |
| S5 | `✓ 已设置文本` 成功回执 | **40**（另 1 处 `text=Close` 失败，AI 已如实报告；余 1 处回执未见于所录片段 — **如实登记**） | `grep -c "✓ 已设置文本"` |
| S6 | `dom find` 探测 | **99** | `grep -c "dom find"` |
| S7 | `dom structure` / `snapshot` / `read-element` 探测 | **37 / 3 / 3** | 同法逐项 |
| S8 | 会话时长 | 拾取 21:28:44 → 收尾 21:32:29（**≈3 分 45 秒**），AI 首轮思考 **209.1 s** | `ty.md:8,27,1948` |

> **口径纠正（如实）**：编排指示中「~60 条只读探测 / 35 处 set-text / 35 张授权卡」为**作者口径的约数**；本轮 `grep` 实测 = **只读探测 ≥142 条**（`find` 99 + `structure` 37 + `snapshot` 3 + `read-element` 3）、**写入调用 42 处**、**授权卡 42 张**。本报告**以实测为准**并保留差异说明（不得以约数充当判据）。

#### 关键现场片段（逐字）

```
ty.md:8    21:28:44  ① div._06da35f:nth-of-type(2) > … > p.ds-enhanced-text__p > s…   ← 拾取引用 ①（出生有效）
ty.md:13   21:28:44  已答：原地翻译为中文
ty.md:15   21:28:57  下一步推荐：用引用 1 做原地翻译 / 查看引用证据（选择器 / 语义路径 / 文本摘要）
ty.md:21   21:28:57  driver=ref-action | timing=answered | evidence=ref.validCount,ref.latestRefNum
ty.md:24   21:28:57  我：原地翻译为中文                       ← ★ 回合 user 载荷 = 答案原文；引用范围【未进回合】
ty.md:27   21:28:57  已思考 209.1s
ty.md:92   21:29:11  「我按『原地替换（in-place）』的思路，先把要改的文案逐个定位…」 ← ★「原地」被理解为【整页】
ty.md:550  21:29:44  attributes: data-wcli-ref="ref_1"        ← ★ AI 亲手读到引用标记（引用目标的属性）
ty.md:566  21:30:02  find "[data-wcli-ref]"：共匹配 1 个元素   ← ★ 恰 1 个（就是引用目标）——能力已在，信息未达
ty.md:1208 21:31:06  「定位已全部唯一化。现在开始原地写入（set-text …）」 ← ★ 全页 42 处写入开始
ty.md:1216 21:31:06  会发生什么：选中「dom：需确认：命中缺省 ask 取向（敏感面）」… ← ★ 同文案授权卡 ×42
```

* **决定性反证**：AI 在 `ty.md:545-551` 用 `dom read-element --selector text*=Peak/Off-Peak --attributes true` 已经**读到** `attributes: data-wcli-ref="ref_1"`，并在 `ty.md:563-567` 用 `dom find --selector [data-wcli-ref]` 命中**恰 1 个元素**；**它仍然没有锚定**，而是继续用 42 个不同的选择器覆盖整页 ⇒ 问题**不是"AI 能力不足"，而是"引用事实在链路上不可见 + 提示词没有范围法则 + 工具面无 ref 参数"**。
* **任务完成、范围远超意图**：21:32:26 的完成交代逐字：「当前页 … 已在原地把界面英文文案改写为中文」+ 一张 15 行改写清单；用户只说了「原地翻译为中文」并**只在最后一处**（`Balance alert disabled`）被问了 A/B/C 三选一（`ty.md:1885-1893`）。

### 0.3 编排指示（**原话逐字保留，不美化**）与既往轮次边界

| # | 指示（逐字 / 提炼自 2026-09-23 编排器转达） | 落地形态 |
|---|---|---|
| **P1** | 「**引用事实进回合**：驱动者组合的回合（及手动回合）应把活跃引用事实（id / 文本摘要 / 选择器 / `data-wcli-ref` 标记）注入 LLM 上下文（系统段），让 AI 知道『用户指的是什么』」 | 本稿登记为**核心 1** |
| **P1′** | 「**范围法则**：提示词立规 ——『用户引用了 N ⇒ 任务范围默认限定于引用目标；扩大范围必须先 ask-user 征询』（**法七式立法？还是提示词约定？—— discovery 论证载体与判据**）」 | 本稿登记为**核心 2**（载体与机核性 = 开放点 O-SGO-002 / O-SGO-007） |
| **P3** | 「**工具面 ref 锚定**：`dom set-text --ref <n>`（读命令 read-element / structure 是否也加 —— **论证**）；引用解析单节点保证；失配 / 失效非静默口径（EC 家族）」 | 本稿登记为**核心 3** |
| **P2** | 「**任务级批量授权**：AI 先出写入计划（N 处 目标+原文→译文 清单）→ **一次 consent 覆盖整批**；逐条审计保留（零明文）；中途可中止；非批次写入仍逐条批准。与 confirm 档 consent 卡机制的关系（扩展不绕过；特权 op 恒手势不受影响）；35 连批审批疲劳的解」 | 本稿登记为**核心 4** |
| **纪律** | 「载体纪律：批量授权卡尽量复用既有 kind（零新增 kind 优先论证）；三冻结面（content / pick-layer）预期零触碰；体积预算继承现行口径 … **可能触发再次升档 pending-author-line**」 | 本稿登记为 §1.4 非目标 + §5.2 R-SGO-00x + §7.2 N-SGO-00x |
| **已修不重开** | 「**已修（R6 `74d76c1`，不重复立项）**：P3 答案双消费 once-语义 / P4 用户输入排队统一 / P5 完成后同动作去重 + 引用改写重评（判定链新增 `text-changed` 维度）」 | **本稿 §1.4 显式排除**；仅在 §7.1 作为**现状底座**引用 |

> **口径声明（如实）**：P1/P1′/P2/P3 均为**编排器转述的指示要点**；作者**未**指定实现形态、未指定法则的载体（机制 vs 提示词）、未指定批量授权的范围绑定方式 —— 这些**全部登记为开放点（§7.4 O-SGO-\*）**，**不在本阶段预设答案**。

### 0.4 编排器代作者决策（2026-09-23；**已为定论，本报告直接作为约束记录，不重新讨论**）

| # | 决策 | 性质 |
|---|---|---|
| D1 | **作者已授权编排器代行决策、SDDU 全流程自行调度**（discovery → spec → plan → tasks → build → review → validate 均按此口径） | 定论（作者授权） |
| D2 | **本轮 discovery 不访谈作者基本框架**：开放点**收集后附推荐项**，由 spec 阶段**批量裁决** | 定论（编排器要求） |
| D3 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-scope-governance/`**（承 v2/v3/v4/`v45-f-regularization`/v5/`v55-self-driven` 命名惯例；`-f-` 段承「补丁级跟进轮」先例） | 定论（**命名与版本位配对的语义辨析见 §6.2 / O-SGO-001**） |
| D4 | **ROADMAP 编号 = F-34**；**本轮实测复核：`F-34` 在仓库（`*.md` / `*.json` / `*.ts`，排除 `node_modules` / `.git`）0 命中**（§6.1） | 定论 + 本轮复核 |
| D5 | **版本位 = v0.11.1（patch 主题）**；**本轮实测：`v0.11.1` 全仓 0 命中**（§6.2）⇒ 全新版本位（登记留给收口；本阶段 **ROADMAP 零 diff**） | 定论（登记留给收口） |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录（+ `ty.md` 入库，见 §0.1）；不改任何 `src/`、`test/`、`dist/`、`design/`、`docs/` 与 `ROADMAP.md`**（本轮为 discovery，**零产品运行时验证**） | 定论（本轮已遵守） |
| D7 | **不上溯改写 v55 / R6 产物**：v55 父 + 三叶全部 `validated` 终态、R6 的 `docs/r6-ty-experience-fix-*.md` 与体积登记**原样保留**；本 Feature 以**并列新主题**立项 | 定论（本轮已遵守） |
| D8 | **P3/P4/P5 已由 R6 `74d76c1` 闭环，本 Feature 不重复立项**（仅在现状基线中作为底座引用） | 定论（编排器明文） |

### 0.5 本阶段边界（discovery 职责声明）

- **负责**：挖掘问题、梳理问题、记录问题；输出问题清单 + 目标态描述 + 红线继承与显式取代候选清单 + 风险预登记 + 开放问题（附推荐）。
- **不负责**：不定义需求（不写「系统应支持 XXX」）、不分类 Must/Should/Could、不定义验收标准、不做方案评估与替代方案对比、不写 ADR、不排任务、不改代码、**不决定范围法则的载体与判据**（= 开放点）。
- **本轮零产品运行时验证**：未跑 `npm test` / Chromium 门禁 / 构建；所有数字均来自**带 `file:line` 的源码、已入库产物、`ty.md` 的 `grep` 实测与本轮只读复核**（§7.1 逐条给出），未自造实测值。

---

## 1. 问题定义

### 1.1 一句话问题陈述

> **「用户已经用引用把范围指出来了，系统在机制上不知道这件事」** —— 回合的输入只有答案原文（`sidepanel.ts:329` 的 `chat` 消息体**只有 `user`**；`service-worker.ts:887` 的 `runChat(s, user)` 是裸字符串；系统段是**静态常量** `SYSTEM_PROMPT`（`:107-118`），**零引用注入路径**），提示词里**没有任何范围法则**，`dom` 工具面**没有 `--ref` 锚定**（base `dom-tools.ts:462-470` 只认 `--selector`/`--text`），而写入授权是**逐条**的（base `PermissionGate` 的 `ask` 档 → `confirm.ts:84-156` → `auth` 卡，`ty.md` 实测 **42 张同文案卡**）⇒ 于是 `ty.md` 里 AI 把「原地」理解为**整页就地替换**：明明**已经读到**引用标记（`ty.md:550` `data-wcli-ref="ref_1"`）、**已经证实它恰 1 个**（`ty.md:566`），仍然执行了 **42 处全页改写**——**任务完成、范围远超意图，且全程没有任何一步是"不可判"的错**：系统真的没有告诉过 AI「用户指的是这里」。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---|---|---|
| **引用事实不进回合（= 范围的指称信息在链路上丢失）** | 用户在引用上下文里说的每一句话（「原地翻译」「改短一点」「这行删掉」）都缺**指称对象**；AI 只能自行猜范围。`ty.md` 实证：猜成**整页**，42 处改写。**这不是 AI 的错**——`SYSTEM_PROMPT`（`service-worker.ts:107-118`）里没有一个字提到"引用"，`chat` 载荷（`sidepanel.ts:329`）里没有一个字段携带引用 | 「引用」是 v3 起主推交互（「页面即输入」）与 v5.5 「引用即下一步」的产品语言（`providers.ts:155-158` 的 chip 文案「用引用 N 做原地翻译」）；**产品语言已经承诺了"引用=范围"，机制层却零承载** ⇒ 每一次引用回合作答都可能范围漂移；且范围漂移**不可判**（无读数、无留痕、无门禁） |
| **无范围法则：扩大作用域不需要征询** | `SYSTEM_PROMPT` 全文无"范围 / 引用 / 越界先问"条款（现存条款仅：工具说明 / 尊重授权与确认 / 失败必报 / 未授权指引）；`dom` 工具的写入面只有**单点** `--selector`（`dom-tools.ts:462-470`），没有范围概念；`ty.md:92` 的 AI 自述「按『原地替换（in-place）』的思路 … 先把要改的文案逐个定位」= **它把"原地"读成了"整页"并且没有任何机制拦一下** | 用户说 A、系统做 B（且 B 更大）——**这是安全问题而非体验问题**：42 处破坏性原地写（`auth` 卡文案逐字：「该选项含破坏性子命令，执行后无法从插件侧撤销」，`ty.md:1218`）。不可逆 + 不可判 + 无征询 |
| **工具面无 ref 锚定（含单节点保证与失配口径）** | base `dom-tools.ts` 的 32 个子命令**无一个**接受引用参数；`set-text` 只认 `--selector`（`:463-468`）。可用锚点其实**已经存在**：`data-wcli-ref="ref_<n>"`（`content/ref-capture.ts:67,370`，值 = refId，写在**捕获时的单一节点**上）⇒ `[data-wcli-ref="ref_1"]` 天然是**单节点**选择器（`ty.md:566` 实测恰 1）。但 ① 无参数形态（AI 只能"碰巧"用它）；② **失配口径未定义**（0 命中 / 多命中 / 标记缺失 / 节点被替换 ⇒ 静默？报错？回退？）；③ 引用表在**面板**（`l1/ref-store.ts`），工具调用在 **SW**（`service-worker.ts:951` `s.host.dispatch`），SW **不持有**引用表 ⇒ `--ref <n>` 需要先把引用事实送进 SW/回合（= 核心问题的连带） | 探针在**没有范围锚**的情况下运行：`ty.md` 实测只读探测 ≥142 条（`find` 99 / `structure` 37 / `snapshot` 3 / `read-element` 3），**其中一条（`ty.md:563-567`）已经命中引用目标恰 1 个**——工具面不给锚，AI 就只能靠"多跑几条"来降低不确定性，成本直接转成 token 与时间（首轮思考 **209.1 s**） |
| **逐条授权在批量写入下退化为"连点"** | 每次 write 走 base 的 `ask` 档缺省取向（`packages/web-cli-base/src/permission.ts:16,333`，理由串逐字「需确认：命中缺省 ask 取向（敏感面）」；`dom-tools.ts:763` `set-text → 'write'`）→ plugin `createConfirmBridge`（`confirm.ts:84-156`）→ SW `confirm-request`（`service-worker.ts:634-644`）→ 面板 `confirm` 事件（`sidepanel.ts:3837-3845`）→ **既有 `auth` 卡**（`chat-state.ts:616-622`，12 kind 之一）。`ty.md` 实测 **42 张同文案卡 / 42 次已批准** | 授权从**判断**退化为**连点**：用户看不到"整批将要写什么"（目标+原文→译文清单），因此**无法否决计划本身**，只能在第 42 次点击里意识到"它改的不止一处"。同时**逐条安全语义被稀释**（连点 42 次后，第 43 次会形成习惯）——这是**授权疲劳**的经典失效模式，且它**恰好掩盖了**范围漂移（每一张卡都"合法"） |

### 1.3 本 Feature 范围（**问题域描述，非需求**）

| # | 主题 | 性质 | 来源 | 目标态（**问题域描述**） |
|:-:|---|---|---|---|
| 核心 1 | **引用事实进回合（ref-context-in-turn）** | 载荷 + 系统段 | P1 + `ty.md` 21:28:57 | 回合（含驱动者自动成回合与手动回合）携带**活跃引用事实**（id / 序号 / 文本摘要 / 选择器 / `data-wcli-ref` 标记），使「用户指的是什么」成为**模型可见事实**而非猜测 |
| 核心 2 | **范围法则（scope law）** | 提示词 + 判据 | P1′ + `ty.md` 全页改写 | 「引用存在 ⇒ 任务范围默认限定于引用目标；扩大范围必须先征询」成为**可判事实**（法则的载体与机核性 = 开放点 O-SGO-002 / O-SGO-007） |
| 核心 3 | **工具面 ref 锚定（ref anchor）** | 工具参数 + EC 口径 | P3 + `ty.md:550,566` | 写入（至少 `set-text`）可按**引用**锚定；解析 = **单节点保证**；**失配 / 失效非静默**（对齐既有 EC-001 / EC-002 家族）；读命令是否同加 = 论证项 |
| 核心 4 | **任务级批量授权（batch consent）** | 授权 + 审计 | P2 + `ty.md` 42 张卡 | AI 先出**写入计划**（N 处 目标+原文→译文）→ **一次 consent 覆盖整批**；**逐条审计保留（零明文）**；**中途可中止**；**非批次写入仍逐条批准**；**特权 op 恒手势不受影响** |
| 附带 1 | **范围读数（scope reading）与越界留痕** | 可判事实 | 核心 2 的判据面 | 「本次动作是否落在引用范围内 / 是否已征询」成为**可读、可判、可机核**的读数（否则"法则"退化为约定） |
| 附带 2 | **end-to-end 验收锚** | 门禁样本 | `ty.md` 全链 | 一条可机核的样板：拾取引用 → 答 → 自动成回合 → **范围受限写入** → 完成；含**双向反证**（去掉引用事实 / 去掉法则 ⇒ 必红） |

### 1.4 非目标（**明确排除**）

| 非目标 | 理由 |
|---|---|
| **P3/P4/P5（R6 已修）**：答案双消费 once 语义 · 用户输入排队统一 · 完成后同动作去重 · 引用改写后重评（`text-changed`） | D8：R6 `74d76c1` 已闭环（`docs/r6-ty-experience-fix-2026-09-23.md` 全四条 + `test/r6-ty-experience-fix.test.ts`）；**本 Feature 不重开、不改写其产物**，仅作为现状底座引用（§7.1） |
| **`src/content/**`（`content.js`）/ `pick-layer.js` 的语义改动** | 字节冻结红线：`content.js` **177,076 B** / `pick-layer.js` **34,358 B**（**零容差**，§7.2 N-SGO-001/002）。引用标记的**写入**（`ref-capture.ts:370`）已存在，本 Feature 只**消费**它 |
| **`packages/web-cli-base/**` 的改动** | 硬红线：`test/insight-no-escalation.test.ts:147` 机核 `../web-cli-base` **零 diff**（「base 零改动」红线，2026-09-14 作者仅放行性能修复）⇒ `--ref` **不得**直接加进 base 的 dom 工具；须论证 plugin 侧包装路径（先例 `src/tools/chrome-host.ts:206`）或显式解冻（须作者放行） |
| **特权 op（`op.authorize` / `op.perm.request`）的发起方式** | 红线：特权 op **恒 gesture**、**AI 不可代答**（`test/supersession-ledger.test.ts:2266` RL-06 / `test/op-three-tier.test.ts:332,372` OT-⑩）；批量授权**不得**成为绕过面 |
| **判定链（`src/security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles` 冻结面** | 硬底线：`docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项内容哈希 pin）。批量授权走**既有 confirm 面**（`confirm.ts` 不在冻结集），**不得**触碰策略档位裁决 |
| **法八（零明文）放宽** | `test/ui/law8-plaintext.mjs`（36 断言）必绿：批量授权卡 / 计划清单**不得**把明文正文写进流内 payload / digest / 审计 / DOM 四面（「留痕的是事实，不是值」） |
| **12 kind 卡类型学新增（第 13 种）** | v5 已固化「零新增卡类型」；批量授权卡**复用既有 `auth` kind**（编排纪律明文：零新增 kind 优先论证） |
| **零宿主判据（`REGISTERED_STRUCTURAL_HOSTS = []`）** | v4.5 清零的判据不得回退；批量计划**不得**新增流内固定容器 |
| **v55 / R6 产物（父 + 三叶 + R6 记录）的改写** | D7：全部原样保留；本 Feature 为并列新主题 |
| **F-29（A2A 候选）** | 未立项未排期，**保持原样不动** |
| **安装期静态权限 / `manifest` 静态面 / 存储加密 / 会话分组收编 op** | 与本问题域无耦合（v5 `PO-ALLN-001` deferred 保持） |

---

## 2. 用户画像

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2/v3/v4/v4.5/v5/v5.5 同一事实基础。**本报告不编造用户调研数据**；「用户原话」栏引用 `ty.md` 逐字与会话内 AI 自述。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 当前应对方式 |
|---|---|---|---|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏（`platform.deepseek.com`）：绑定 → 拾取引用 ①（Peak/Off-Peak 提示 span）→ 答「原地翻译为中文」 | ①（意图，逐字）「**原地**翻译为中文」——他用的是**指称**（"这里/原地"），系统把它读成了**全局**（`ty.md:92` AI 自述「按『原地替换（in-place）』的思路…逐个定位」）②（后果，逐字）完成交代：「**当前页 … 已在原地把界面英文文案改写为中文**」+ 15 行改写清单（用户只想要 1 处）③（成本，逐字）**42 张**同文案「授权申请」逐条点击 | 忍受 + 真机反馈驱动下一轮（会话内**只在最后 1 处**被 AI 反问 A/B/C 三选一，`ty.md:1885-1893`——**说明只要问了，他会答**；问题是系统**没在范围层面问过**） |
| **作者（授权判断场景）** | 面对第 N 张「dom：需确认：命中缺省 ask 取向（敏感面）」卡 | 卡上只有**单条**命令的摘要（`confirm.ts:22-31` 的 `buildOperationSummary`：站点 / 工具 / 风险档位 / 掩码参数 / 理由），**没有"这一批将要写什么"**；42 张卡**逐字相同**（除目标选择器） | 连续点击「已批准」42 次（`ty.md` 实测）；**无法在写之前否决计划**——只能在事后从完成清单里发现范围 |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「新增一种『引用范围内的动作』，要改哪些文件？」 | 现状答案 = **回合载荷（恰 1 个 `user` 字段）+ 静态 `SYSTEM_PROMPT` + base 工具参数面（无 ref）+ 逐条 confirm 桥** ⇒ 范围语义**无处安放**（无字段、无参数、无读数） | 服从既有形态（即**扩张被现行架构锁死**）——与 v5 的 `Q-ALLN-003`、v5.5 的 `Q-SELF-015` 同构，但层次再上一层：v5 缺"操作可注册"、v5.5 缺"驱动者可注册"、**本 Feature 缺"范围可声明"** |

---

## 3. 问题清单

> 编号空间 `Q-SGO-###`（SGO = scope governance）。核心 / 次要 / 潜在按「影响面 × 影响深度 × 影响频率」分级；每条标注信息来源（真机 `ty.md` / 源码 `file:line` / 编排指示 / 假设）。

### 3.1 核心问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-SGO-001** | **引用事实不进回合（本 Feature 母问题）：范围指称在链路上物理缺失。** 回合载荷只有答案原文：面板 `requestTurn`（`sidepanel.ts:304`）→ `send(makeMessage('chat', { user: trimmed }))`（`:329`，**唯一**回合载荷）→ SW `runChat(s, user)`（`service-worker.ts:887`，裸字符串）→ 系统段 = **静态常量** `SYSTEM_PROMPT`（`:107-118`，全文无"引用"二字）+ `[{role:'system', content: system}, ...turns]`（`:948`）。驱动者路径同源：`driveAnsweredTurn`（`sidepanel.ts:2011-2050`）把 `live.instruction`（`drivers.ts:258`，= **答案原话**）经 `pressCandidate('op.turn', …)`（`:2030-2044`）交出去，而留痕纪律明确「只含**字段名**，不含任何值」（`ai-drive.ts:85`）。⇒ **AI 永远不知道"用户指的是什么"**。**反证（决定性）**：AI **已经读到** `data-wcli-ref="ref_1"`（`ty.md:550`）且 `dom find [data-wcli-ref]` **恰 1 个**（`ty.md:566`）**仍然没有锚定**——信息确实**没有到达**，而不是没被看到。 | 全部引用回合（v3 起主推交互）；深度 = **核心阻碍**（产品语言「用引用 N 做…」= 范围承诺，机制层零承载）；频率 = **每次引用回合作答** |
| **Q-SGO-002** | **无范围法则：越界不需要征询，且"越界"本身不可判。** `SYSTEM_PROMPT`（`service-worker.ts:107-118`）全文条款 = 工具说明 / 「Always respect authorization and confirmation prompts」/ 「Never reveal secrets」/ 失败必报 / 未授权指引——**零"范围"条款**。工具面亦无范围概念：`dom set-text` 只接 `--selector` 单点 + `--text`（base `dom-tools.ts:462-470`）；多匹配语义是 **EC-002**（`ty.md:521`「定位匹配 2 个元素，按首元素执行（多匹配语义 EC-002）」）⇒ 每条命令**天然是单点**，AI 用 **42 条单点命令**覆盖了整页（`ty.md:1213-1860`）。⇒ 「用户引用 1 处、AI 改 42 处」这件事**不是违规**——**规则不存在**。 | 全部写入 / 修改类任务；深度 = **核心阻碍**（不可逆破坏性写 + 无征询）；频率 = **每次引用范围被扩大的任务** |
| **Q-SGO-003** | **工具面无 ref 锚定，且失配口径未定义；`--ref` 的实现面被两条红线夹住。** ① **无参数**：base `dom-tools.ts` 32 子命令**零 ref 参数**（`grep` 0 命中；`set-text` 分支 `:462-470` 只认 `--selector`/`--text`）；② **锚点其实已存在**：`REF_MARK_ATTR = 'data-wcli-ref'`，值 = **refId**（`content/ref-capture.ts:67,370` `el.setAttribute(REF_MARK_ATTR, refId)`），写在**捕获时的单一节点**上 ⇒ `[data-wcli-ref="ref_1"]` **天然单节点**（`ty.md:566` 实测恰 1）；③ **失配 / 失效口径未定义**：0 命中 / 多命中 / 标记缺失（`:372` 注释：frozen / SVG 元素标记是 **best-effort**）/ 节点被替换 ⇒ 静默还是报错？（既有 EC-001「未找到非错误」/ EC-002「多匹配按首元素」不足以表达"引用锚定失败"）；④ **实现面被红线夹住**：dom 工具属 `packages/web-cli-base/**`（`test/insight-no-escalation.test.ts:147` 机核零 diff）⇒ 不能在 base 加参数；plugin 侧包装有先例（`src/tools/chrome-host.ts:206` `wrapChromeEntryForHost` 覆写 schema + executor）但**未被本问题域论证过**；⑤ **跨进程断层**：引用表在**面板**（`l1/ref-store.ts`），工具调用在 **SW**（`service-worker.ts:951` `s.host.dispatch(tc, …)`）⇒ SW **不持有** refId→节点映射 ⇒ `--ref <n>` 必须先把引用事实送进 SW（= Q-SGO-001 的连带）。 | 全部按引用锚定的写 / 读动作；深度 = **明显痛点—核心阻碍**（无参 = 只能"碰巧"用；失配无口径 = 可能静默写错节点）；频率 = 每次引用范围任务 |
| **Q-SGO-004** | **逐条授权在批量写入下退化为连点（42 次同文案）。** 链路：base `PermissionGate` 缺省取向（`packages/web-cli-base/src/permission.ts:16`：write/external/ui/state ⇒ ask；`:333` 理由串逐字「需确认：命中缺省 ask 取向（敏感面）」；`dom-tools.ts:763` `'set-text': 'write'`）→ plugin `createConfirmBridge`（`src/security/confirm.ts:84-156`，`:104-111` `buildOperationSummary` = 单条摘要；`:112-143` 审计 `confirm` 事件）→ SW `confirm-request`（`service-worker.ts:634-644`）→ 面板 `confirm` 事件 → **既有 `auth` 卡**（`sidepanel.ts:3837-3845` → `chat-state.ts:616-622` `kind:'auth'`、`askKind:'confirm'`）。`ty.md` 实测：**42 调用 / 42 卡 / 42 批准 / 理由串 42 次逐字相同**。⇒ 用户**无法在写之前看到并否决计划**；且**逐条语义被稀释**（连点 42 次后第 43 次是习惯动作），**恰好掩盖范围漂移**（每张卡都"合法"）。 | 全部多目标写入任务；深度 = **核心阻碍**（安全语义被稀释 + 范围漂移被掩盖）；频率 = 每次批量任务 |
| **Q-SGO-005** | **批量授权的"范围绑定"判据缺失（与 consent 机制的关系未定义）。** 若批量卡覆盖"计划内 N 处写"，则必须回答：① 计划外的第 N+1 处写**是否**回落到逐条确认（否则一次点击 = 放开无限写）；② 批量卡与 `confirm` 档 / `gesture` 档的关系（**红线⑥**：`test/supersession-ledger.test.ts:2266` RL-06「consent 档（confirm / gesture）**不得被 AI 代答**」+ `test/op-three-tier.test.ts:332,372-383` OT-⑩ 与 AI 代答注入反证 ⇒ 批量**不得**成为"AI 代答 41 次"的合法外衣）；③ 特权 op（`op.authorize` / `op.perm.request`）**恒 gesture 不受影响**的机核（`ops.ts:24` / `test/capability-wiring.test.ts:51-58`）；④ 中途中止后的**部分完成**如何留痕（既有 `auth` 卡 6 终态含 `cancelled` / `rejected`，`stream-model.ts:86-121`）。 | 全部多目标写入任务；深度 = **中高（安全）**；频率 = 一次性（本 Feature 裁决）但影响长期授权习惯 |
| **Q-SGO-006** | **引用事实进回合的"载荷与零明文口径"未定。** 可注入的既有事实 = `RefFacts`（`l1/ref-validity.ts:116-129`：refId / selector / semanticPath / **textDigest** / origin / documentId / navSeq / declarationHash / capturedAt）+ 投影（`l1/ref-store.ts:140-142`：refNum / refLabel / refState）。**关键口径事实**：`textDigest` **不是哈希**，是**截断 80 字的页面文本**（`ref-store.ts:33` `TEXT_DIGEST_MAX = 80`；`:241` `truncate(raw.textDigest ?? '', …)`）⇒ 注入它 = 把**页面文本**送进 LLM 上下文。与既有纪律的关系：① v5.5 留痕纪律「只含字段名不含值」（`ai-drive.ts:85`）；② 法八管的是**凭据值**（`test/ui/law8-plaintext.mjs` 36 断言）——**页面文本不属凭据**，但"哪些字段可进 LLM 上下文 / 哪些可入 digest 与审计"**需显式裁决**；③ **载体面**：`chat` 消息体加字段（type-only，**不新增 kind** ⇒ `KIND_SET` 40 不动）vs 面板把引用拼进 `user` 文本（零新消息面，但**污染用户可见行**，且与「我」行留痕语义冲突）。 | 核心 1 的落地面；深度 = **中高**（口径不清 ⇒ 要么漏注入、要么过度外送）；频率 = 每次引用回合 |

### 3.2 次要问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-SGO-007** | **手动回合与驱动者回合的"引用可见性"不对称。** 驱动者路径有**悬置任务**承载用户原话（`drivers.ts:258,281` + `next-registry/suspension.ts`），也有 `evidence` 字段（但只装**字段名**与 origin/session 摘要）；手动路径（composer 提交 `sidepanel.ts:3581`）**连悬置都没有**，是裸文本。⇒ 「引用事实进回合」要同时覆盖两条入口（`requestTurn` 恰 2 处调用点，`test/op-wiring.test.ts` 钉死），否则手动回合仍是范围黑洞。 | 回合入口面；深度 = 中；频率 = 每次手动回合 |
| **Q-SGO-008** | **"引用"的多义性未被系统承认**：同一个引用既是**证据**（ref 卡：选择器 / 语义路径 / 文本摘要，只读）也是**范围**（用户想动的地方），还是**下一步推荐的语境**（chip「用引用 N 做…」，`providers.ts:155-158`）。三者当前**共用一份 `RefFacts`**，但语义不同（证据=可核；范围=可写；语境=可执行）。⇒ 范围语义若不加区分，可能把只读证据与写授权混为一谈（授权面）。 | 引用语义面；深度 = 中；频率 = 一次性（本轮裁决） |
| **Q-SGO-009** | **范围漂移缺"留痕"**。既有留痕三要素（`ai-drive.ts:85`）只记 `driverId/timing/evidence(字段名)`；`ty.md:21` 的 `driver=ref-action | timing=answered | evidence=ref.validCount,ref.latestRefNum` 里**没有任何"范围"读数**。⇒ 事后无法回答「这次动作是否在引用范围内 / 是否征询过」。 | 可判性；深度 = 中；频率 = 持续 |

### 3.3 潜在问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-SGO-010** | **"法则"退化为提示词约定的风险（机核性）。** 法七 / 法八是**可机核的机制**（`test/law7x-ext.test.ts` 四类逐类 + 双向反证 + 三段控制禁恒真；`test/ui/law8-plaintext.mjs` 36 断言）。而"范围默认限定引用、扩大必先征询"若**只写进 `SYSTEM_PROMPT`**（`service-worker.ts:107`），则**零机核**（现无任何门禁读取提示词内容；`grep SYSTEM_PROMPT test/` = 0 命中）⇒ 「法」实为**约定**，改一行提示词即可静默失效。⇒ **载体与判据必须 spec 裁决**（O-SGO-002 / O-SGO-007）。 | 判据形态；深度 = **中高**（决定本 Feature 是"机制"还是"文档"）；频率 = 一次性（本轮裁决） |
| **Q-SGO-011** | **"引用即范围"的过度约束反风险。** 若"有引用 ⇒ 范围默认 = 引用目标"，则用户**确实想全页**但顺手带了一个引用时会**被多问一次**（甚至被"卡住"）。⇒ 法则必须给出「扩大范围」的**正向路径**（征询 + 用户确认 = 范围扩张的可判事实），而**不是禁止**；且"引用存在但非本次意图"也要有出口（如引用已失效 / 用户明确说"整页"）。 | 体验面；深度 = 中；频率 = 每次"引用在但不指它"的任务 |
| **Q-SGO-012** | **体积：距档位仅 35,777 B（⚠️）。** 现行登记（R6 后实测）：`SIDEPANEL_BASELINE_BYTES = 578_623`（`test/size-baseline.ts:351`）· 生效上限 `floor(578,623 × 1.05) = **607,554**`（距 **28,931 B**）· 档位 **614,400**（距 **35,777 B**）· 绝对上限 **675,840** · `authorConfirmation.status = pending-author-line`（**未闭合义务**，v55 closeout §5）。历史教训：v5 的 plan Σ 预算低估 **2.8×**（实测 +49,037 B）；v55 段三叶合计**超预算 +6,015 / 超上界 +915**；R6 再 **+5,199 B**。本特性若含「提示词法则 + 引用注入 + 批量卡 + 工具面包装 + 门禁」，有**再次升档**可能。**缓和事实**：SW 侧改动（`runChat` 系统段组装 / `confirm-request` 批量判定）落 `background.js`，**不计入 sidepanel 账本**（ADR-V55-011 §1 已登记口径）。 | 体积门禁；深度 = 中高（可管理但**必须先预算**）；频率 = 每轮 |
| **Q-SGO-013** | **越界写的终态词汇缺位（法七扩展的第二个面）。** v5.5 已把「已表达意图」4 类入终态（`next-registry/terminals.ts` `DRIVER_TERMINALS` 恰 4，与 `STREAM_TERMINALS` 正交），但**「范围被扩大」不是任何终态**——它既不在 5 类阻塞（`definition.ts:34-41`），也不在 4 类已表达意图。⇒ 若要让"未征询的越界写"可判，须**显式扩张终态/读数词汇**（不是改布尔值），并配双向反证（禁恒真）。 | 判据形态；深度 = 中高；频率 = 一次性 |
| **Q-SGO-014** | **端到端验收锚缺失。** `ty.md` 全链（拾取 → 答 → 自动成回合 → 范围受限写 → 完成）当前**无任何门禁**：v5.5 的 S0 只验「作答后 `[data-op]` 点击 = 0 ∧ 恰 1 条 chat 原文 ∧ 留痕三要素独立成行」（`test/ui/s0-self-driven.mjs` 59）——**它验的是"零按键"，不验"范围"**。⇒ 无可判锚 ⇒ 修了会再退化（v4.5 教训：反证恒绿三类缺陷）。 | 验收面；深度 = 中高；频率 = 一次性 |
| **Q-SGO-015** | **`data-wcli-ref` 标记的耐久性**：标记写在**捕获时的节点**上（`ref-capture.ts:370`），但 SPA 重渲染会丢（`ty.md:1928` AI 自述「刷新或路由跳转后会被前端重新渲染覆盖」）⇒ 引用锚定**只对当前渲染实例有效**。这是**既有事实**，但作为"范围锚"被依赖后，其失效必须**非静默**（与 Q-SGO-003 ③ 同源）。 | 锚定可靠性；深度 = 中；频率 = 每次 SPA 导航 |

---

## 4. 竞品参考

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

**未做**外部竞品调研（如「编辑器/助手如何做 selection-scoped action 的范围绑定」「批量破坏性操作的授权聚合如何不牺牲审计粒度」「范围法则的机核化（prompt-as-policy vs policy-as-code）」。v5.5 段亦未新增外部对标（`O-SELF-007`）。

> **不得**据此声称「竞品也这么做」或「无竞品这么做」。若 spec/plan 认为需要外部参照（「范围治理 / 批量授权」是 agent 安全领域的成熟话题），应显式登记为待调研项（O-SGO-009）。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

> 本节只记录「本仓库已存在、已验收、可复用」的机制先例——它们是**事实**，不是推荐方案。

| 参照 | 事实 | 与本题域的关系（只述差异，不评优劣） |
|---|---|---|
| **引用即意图的**产品语言**已存在** | `next-registry/providers.ts:155-158` 的 chip 文案 = `用引用 ${refNum} 做原地翻译` / `查看引用证据（选择器 / 语义路径 / 文本摘要）`；`recommend.ts:78` `REF_ACTION_TEXT = /^用引用\s*(\d+)\s*做/` 单源正则（R6 引入，用于去重 digest） | **产品面已经承诺"引用 = 范围"**（chip 把 `引用 <n>` 与动作写在**同一句话**里），机制面零承载 ⇒ 本 Feature 是把承诺兑现。差异：chip 是**推荐文案**，不是**模型可见事实** |
| **引用证据面板（只读）** | ref 卡证据行 = 选择器 / 语义路径 / **文本摘要** / 捕获时间（`l1/ref-store.ts:116`）；证据投影 `cardProjection()`（`ref-store.ts:140-142`） | **现成的"引用事实"结构化来源**：`RefFacts` + projection 已含 id / 序号 / 摘要 / 选择器 ⇒ 注入不需要新造真值源（**事实，非承诺**） |
| **引用标记（单节点锚）** | `content/ref-capture.ts:67` `REF_MARK_ATTR='data-wcli-ref'`；`:370` `el.setAttribute(REF_MARK_ATTR, refId)`（值 = refId）；`:372` best-effort（frozen/SVG 可能写不上）；`:409` 观察面回报 `refMark` | **`[data-wcli-ref="ref_1"]` 已是单节点选择器**（`ty.md:566` 实测恰 1）⇒ 工具面锚定的**可用载体已存在**；缺的是**参数形态 + 失配口径**（**事实，非承诺**） |
| **插件侧工具条目包装先例** | `src/tools/chrome-host.ts:206` `wrapChromeEntryForHost(entry, env)`：**覆写 `schema` + 替换 `executor`**，基线 `baseExecutor` 仍被调用；`src/tools/browser-tools.ts` 用 `createDomToolEntry(...)` 注册 base 条目 | **`--ref` 不必改 base 的可行路径**（plugin 侧包装 → 解析 ref → 合成 `[data-wcli-ref="ref_n"]` → 交 base executor）；**风险**：不得放宽 risk / `subcommandRisks`（`browser-tools.ts` 头注释「never widened here」）（**事实，非承诺**） |
| **既有 confirm 桥 + `auth` 卡（含 6 终态）** | `src/security/confirm.ts:84-156`（fail-closed：无应答器 / 异常 / 非 allow ⇒ deny）+ `auth` 卡（`cards/auth.ts`：批准/拒绝 + 「范围与后果预演」三段模板 + 审计出口 + 6 终态含 `cancelled`） | 批量授权的**载体已存在**（复用 `auth` kind + `confirm` 事件，**零新增 kind**）；`auth.ts` 头注释明确「预演 = **既有静态三段模板**，动态生成有把命令参数写进 trace 的风险（法八）」⇒ 批量计划如何**不破法八**是硬问题 |
| **一次性 consent 的既有先例（op 侧）** | `next-registry/pipeline.ts:186-192`：op 的 `consent` 步（`collectConsent` → allow/reject）+ `settings/ops.ts` 的「同执行体、不同 consent 载体」（`:223-236`） | 「一次用户决定覆盖一个操作」**已在 op 面成立**；批量写是**跨命令**的聚合，面不同（命令级 confirm 由 base 权限门发起） |
| **授权不代答红线（可机核）** | `test/supersession-ledger.test.ts:2266` RL-06（`expectFailPattern`）+ `:2339-2347` 实判据（`tierOf` 单源 + `pressDecision`）+ `test/op-three-tier.test.ts:332,372-383`（AI 代答 ⇒ 必红，注入反证） | 批量授权的**边界判据底座**：任何"AI 代答 consent"的变体都必须**必红**（**事实，非承诺**） |
| **法七扩展门禁形态（可复用为法则判据）** | `test/law7x-ext.test.ts`：四类逐类五段 + **双向反证** + **三段控制禁恒真**（`ok`/`violated`/`n/a`）+ 生产路径真源切片 | 「范围法则」若要机核，**形态已有先例**（双向反证 + 禁恒真 + 真源切片）——**事实，非承诺** |
| **R6 引用改写重评（现状底座）** | `sidepanel.ts:2515-2536` `reobserveAfterWrite(selector)`（成功 `dom set-text` 携带 `targetSelector` → 只读重观测 → 重判）；`l1/ref-validity.ts:80` 新维度 `text-changed`；SW `observeIdentity` 返回当前摘要（`service-worker.ts:1102-1133`） | R6 已建立「**工具结果 → 引用事实**」的**反向**通道（写后重评）；本 Feature 要的是**正向**通道（引用事实 → 回合/工具）⇒ 两向可共用同一份事实与同一只读观测面（**事实，非承诺**） |
| **S2 / S0 门禁样本范式** | `test/s2-deadend-chain.test.ts`（S2 十环节）+ `test/ui/s0-self-driven.mjs`（S0 59/0：作答后 `[data-op]` 点击 = 0 ∧ 恰 1 条 chat 原文） | 本 Feature 的验收锚可**复用该范式**（样板 + 双向反证）；差异：S0 判「谁按」，本 Feature 判「**按的范围**」（**事实，非承诺**） |

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---|---|
| **A-SGO-001** | 「范围指称信息在链路上缺失」是**系统性的**（不止一条入口）：驱动者回合（`driveAnsweredTurn` → `pressCandidate('op.turn', instruction)`）与手动回合（composer submit）**都**只传文本 | 已证：`sidepanel.ts:329`（唯一 `chat` 载荷）+ `:887`（`runChat(s, user)`）+ `:107-118`（静态系统段）+ `drivers.ts:258`（instruction = 原话）+ `ai-drive.ts:85`（留痕只含字段名）——**已证** |
| **A-SGO-002** | 引用锚点在页面侧**已经可用**（`[data-wcli-ref="ref_n"]` 单节点），本问题域**不需要**新的页面侧能力 | 已证：`ref-capture.ts:67,370`（写入）+ `ty.md:566`（恰 1 命中）+ `ref-validity.ts:139-142`（`refMark` / `nodeCount` 已回报）——**已证**；best-effort 边界见 `ref-capture.ts:372`（Q-SGO-015） |
| **A-SGO-003** | `--ref` **可以**在不改 `packages/web-cli-base/**` 的前提下实现（plugin 侧条目包装） | 部分已证：包装先例 `chrome-host.ts:206` 覆写 `schema` + `executor`；base 零 diff 红线 `test/insight-no-escalation.test.ts:147`——**实现面待验证**（是否所有必需参数都能在包装层补齐 / 是否触发其它门禁） |
| **A-SGO-004** | 批量授权的载体**可以**零新增 kind（复用 `auth` + `confirm` 事件 + type-only payload 字段） | 部分已证：`chat-state.ts:616-622`（confirm → `auth`）+ `cards/auth.ts`（6 终态 + 预演模板）+ `messaging.ts` 的 type-only 先例家系（`:68-97`）——**待 spec 裁决**（O-SGO-005） |
| **A-SGO-005** | 范围法则**可以**机核（有可判读数），不必退化为纯提示词 | 参照已证：`test/law7x-ext.test.ts`（双向反证 + 三段控制）+ `test/ui/no-dead-end.mjs`（注入必红）——**判据形态待验证**（O-SGO-007） |
| **A-SGO-006** | 批量授权**不会**侵蚀红线⑥（AI 不得代答 consent）与特权 op 恒 gesture | 待验证：批量卡必须是**用户手势**（一次）且**范围绑定**到计划指纹；`RL-06` / `OT-⑩` 的注入反证须扩到"批量"变体（O-SGO-005） |
| **A-SGO-007** | 引用事实进回合**不破法八**（页面文本 ≠ 凭据值；但仍需口径裁决） | 待验证：`law8-plaintext.mjs`（36）判据面 + `ai-drive.ts:85` 零值纪律；需 spec 明确"哪些字段可入 LLM 上下文"（Q-SGO-006 / O-SGO-003） |
| **A-SGO-008** | 体积可在余量内完成，或**必须先预算再落地** | 现行实测：基线 578,623 B / 生效上限 607,554 B / 档位 614,400 B（`test/size-baseline.ts:351`）——**待验证**（禁止未预算先排"全量落地"，v5 教训 2.8×） |
| **A-SGO-009** | 三冻结面可保持零触碰（`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40） | 复跑构建 + sha 逐字节核对 + `test/content.test.ts`——**待验证**（A 项在本轮零产品运行时验证） |
| **A-SGO-010** | 本轮 `.sddu/**` 只写本 Feature 目录（+ `ty.md` 入库）且 `src/` `test/` `dist/` `design/` `docs/` `ROADMAP.md` 零改动 | `git status --short` 复核（**本轮已遵守**） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 | 预登记证据 / 应对方向（**不作方案承诺**） |
|---|---------|:--:|---|
| **R-SGO-001** | **批量授权被误用为"AI 代答 consent"的合法外衣（最高危）**：若批量卡由 AI 建议、AI 代填、且自动放行后续 N 条，则实质是**绕过红线⑥**（`RL-06` / `OT-⑩`），并可能波及特权 op | **高** | `test/supersession-ledger.test.ts:2266,2339-2347`（RL-06，`pressDecision` 真判据）+ `test/op-three-tier.test.ts:332,372-383`（OT-⑩ 注入反证）+ `ops.ts:24`（特权层）+ `test/capability-wiring.test.ts:51-58`（SW 永不 `.request(`）。**方向**：一次**用户手势** + **范围指纹绑定** + 计划外回落逐条 + 批量变体必须**注入必红** |
| **R-SGO-002** | **范围漂移的不可判性**：法则若无读数与门禁，修了会再退化（无回归保护），且极易造**恒真断言**（v4.5 教训：反证恒绿三类缺陷） | **高** | `test/law7x-ext.test.ts`（双向反证 + 三段控制禁恒真）+ `test/ui/no-dead-end.mjs`（注入必红）+ v4.5 closeout §4 第 6 条。**方向**：先定"范围读数"再定法则 |
| **R-SGO-003** | **`packages/web-cli-base/**` 零 diff 红线被撞**：`--ref` 若走 base 改动 ⇒ 直接红（且是跨包红线 + 历史只放行性能修复一次） | **高** | `test/insight-no-escalation.test.ts:147`（`gitDiffStatus(['../web-cli-base']) === 0`）+ `N-SELF-014`（禁改 base）。**方向**：plugin 侧包装（`chrome-host.ts:206` 先例）；若证不可行 ⇒ 显式解冻须**作者放行** |
| **R-SGO-004** | **失配静默 ⇒ 写错节点**：引用锚定失败（0 命中 / 多命中 / 标记缺失 / 节点被替换 / SPA 丢标记）若静默，会退化为"改了别的地方" | **高** | `ref-validity.ts`（3 结果 + 6 维度 fail-closed `unknown`）+ `EC-001`/`EC-002`（`ty.md:596,521`）+ `ref-capture.ts:372`（best-effort 标记）。**方向**：锚定失败**必须非静默**且**不改动判定链既有 fail-closed 方向** |
| **R-SGO-005** | **法八（零明文）被批量计划清单撞破**：N 处「原文→译文」清单若把正文写进流内 payload / digest / 审计 / DOM ⇒ 直接红 | **高** | `test/ui/law8-plaintext.mjs`（36 断言）+ `cards/auth.ts` 头注释（预演用**静态模板**，动态生成有把参数写进 trace 的风险）+ `ai-drive.ts:85`（留痕只含字段名）。**方向**：**逐条审计保留（零明文）**必须是硬判据 |
| **R-SGO-006** | **体积越档位（距档位仅 35,777 B）+ 历史低估**：v5 plan Σ 低估 **2.8×**；v55 三叶**超预算 +6,015 / 超上界 +915**；R6 +5,199 | **中高** | `test/size-baseline.ts:351`（578,623）+ `size-budget.test.ts`（生效上限 607,554）+ 档位 614,400 / 绝对 675,840 + `authorConfirmation = pending-author-line`（**未闭合义务，不得伪称已确认**）。**方向**：spec 阶段先出**分列预算 + 缓冲校验**；不足 ⇒ 拆叶 / 减面；升档须**作者一行** |
| **R-SGO-007** | **`KIND_SET` / 12 kind / 零宿主被撞**：批量卡若新增 kind、引用注入若新增消息 kind ⇒ `content.js` 增长（零容差） | **高** | `messaging.ts:103-141`（`KIND_SET` 40 逐字；type-only 先例家系 `:68-97`）+ `stream-model.ts:51-63`（12 kind）+ `host-registry.ts:105,187,200`（零宿主）。**方向**：批量卡复用 `auth`；载荷走 type-only |
| **R-SGO-008** | **回合载荷扩张引发主流程门禁重锚**：`chat` 消息体加字段 / `requestTurn(` 恰 2 / `maybeRecommend(` 恰 7 / `nextAfterSettle` 单入口 —— 任何"新时机 / 新驱动者"都会先撞门禁（v5.5 `X-SELF-2` 同构） | **中高** | `test/op-wiring.test.ts`（`requestTurnProblems` / 调用点登记表）+ `sidepanel.ts:1983`（`nextAfterSettle` 单入口）+ `:304`（`requestTurn` 定义）+ 7 处生产 `maybeRecommend` 调用点（`1988/2152/2499/2676/2746/3761/3829`）。**方向**：优先"既有注册表内扩张（diff = 0）"读法 |
| **R-SGO-009** | **门禁严格串行 + 既知环境 flake（`KL-N-10` 家族）** ⇒ 重构轮被误读为回归 | **低—中** | v55 closeout §8 第 9 条 + `docs/v4-supersession-ledger.json#knownLimitations`；纪律 = 隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞 |
| **R-SGO-010** | **断言只增的门禁规模**：现行基数（R6 后）`npm test` **1330** · journey 171 · binding 192 · s0 59 · dead-end 49 · law8 36 · supersession 37 · recommendation 72 · page-input 118 · l1 120 · l2 74 · density 242 · l0 248 · insight 116/118（口径见来源）… **只增不减**；本 Feature 新增判据会叠加 + 可能的等价重锚 | **中** | `docs/r6-ty-experience-fix-2026-09-23.md:147-163`（R6 门禁对账表）+ `test/gate-integrity.test.ts`（`CHROMIUM_GATES === 9` 不动） |
| **R-SGO-011** | **方案先行风险**：范围法则的**载体**（机制 vs 提示词）、批量授权的**范围绑定**、`--ref` 的**读命令是否同加**若在 spec 前被"顺手定下"，会绕过开放点裁决 ⇒ 问题域被窄化为一个实现 | **中高** | D2（开放点收集后附推荐，spec 批量裁决）+ 本报告 §7.4 O-SGO-001~009 **全部附推荐但未定论** |

### 5.3 风险预登记摘要（**Top5**）

> 口径：按「阻塞程度 × 影响面」排序；**discovery 不做估算承诺**。

| 序 | 风险 | 为什么是 Top5 |
|:-:|---|---|
| 1 | **R-SGO-001 批量授权与红线⑥的边界** | 唯一**红线级**风险（授权语义被稀释 / 可能波及特权 op）；边界不清 = 一次点击放开无限破坏性写 |
| 2 | **R-SGO-002 + R-SGO-004 范围不可判 / 锚定失配静默** | 决定本 Feature 是"机制"还是"话术"；失配静默 = 写错节点（不可逆） |
| 3 | **R-SGO-003 base 零 diff 红线** | 决定 `--ref` 的**实现载体**（plugin 包装 vs 解冻 base）；读法错 ⇒ 直接红或工作量翻倍 |
| 4 | **R-SGO-005 法八 + R-SGO-007 载体零新增** | 「计划清单」天然想把正文带进流内 ⇒ 与法八正面冲突；批量卡载体若新造 kind ⇒ 撞 `content.js` 零容差 |
| 5 | **R-SGO-006 体积距档 35,777 B + R-SGO-008 主流程门禁重锚** | 一条预算偏紧 + 一组调用点计数门禁；两者都决定任务排布与叶拆分 |

---

## 6. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | **先裁决 §7.4 开放问题（O-SGO-002 / 004 / 005 / 007）**：范围法则的载体与判据、`--ref` 的实现载体（plugin 包装 vs base 解冻）、批量授权的范围绑定与 consent 关系、法则是否机核化 | 四者决定本 Feature 的**结构层级**与叶拆分；不裁决则任务无法排 |
| 高 | **把 R-SGO-001 写进 spec 的范围与验收**：一次用户手势 + 范围指纹绑定 + 计划外回落逐条 + 批量变体注入必红 + 特权 op 恒 gesture 不受影响 | **零容差红线**；判据必须**等价重锚**（不是放宽） |
| 高 | **确定"范围读数"的形态（Q-SGO-005 / 009 / 013 / O-SGO-007）**：「本次是否落在引用范围内 / 是否已征询」可读可判 + 双向反证 + 注入必红（**禁恒真断言**） | 会话 `ty.md` 是本 Feature 的验收锚；无可判据 = 缺陷可复发 |
| 高 | **体积预算评估（Q-SGO-012 / R-SGO-006）**：先算 sidepanel 净增上下界 + SW 侧（`background.js`，不计账本）分列，再决定拆叶 / 预登记升档 | 距档位 35,777 B；**禁止**未预算先排"全量落地"（v5 plan 低估 2.8×） |
| 中 | **裁决 `--ref` 的读命令是否同加（Q-SGO-003 / O-SGO-004）**：只写 + 读都加 + 都不加三者的论证（写是风险面，读是探测成本面） | 决定工具面包裹面与门禁面 |
| 中 | **裁决引用事实进回合的载荷形态（Q-SGO-006 / O-SGO-003）**：`chat` type-only 字段 vs 面板拼文本；注入字段集（id / 序号 / 摘要 / 选择器 / 标记）；零明文口径 | 决定是否触发 `KIND_SET` / 流内文案 / 审计 |
| 中 | **裁决手动回合是否同享（Q-SGO-007）**：驱动者回合有悬置，手动回合裸文本 | 决定"引用可见性"的覆盖完整性 |
| 低 | **外部竞品调研（如需，O-SGO-009）**：若 spec/plan 认为"selection-scoped action / 批量破坏性操作授权聚合"需要外部参照，显式登记 | 本轮未执行，不编造结论（§4.1） |

### 6.1 F-34 占用复核结果（**本轮实测**）

| 项 | 实测命令 / 结果 | 结论 |
|---|---|---|
| `F-30` / `F-31` / `F-32` / `F-33` | 已占用（v4-chat / v4.5 / v5 / v5.5 均已收口） | 已用 |
| **`F-34`** | `grep -c "F-34" .sddu/specs-tree-root/ROADMAP.md` → **0**；全仓（`*.md` / `*.json` / `*.ts`，排除 `node_modules` / `.git`）→ **0** | **未占用** |
| **编号结论** | — | **登记为 F-34 即可，无需顺延**；本轮**不改 ROADMAP**（登记留给收口） |

### 6.2 版本位核验 + 命名辨析（**本轮实测**）

| 项 | 实测 | 结果 |
|---|---|---|
| ROADMAP 文档版本 | `> **文档版本**: 1.30.0`（v5.5 收口后） | — |
| **`v0.11.1`** | `grep -c "v0.11.1"`（ROADMAP）→ **0**；全仓 → **0** | **未占用 ⇒ 全新版本位** |
| `v0.11.0` | 已存在（F-33 行 + v1.30.0 素材增补 + §二 v0.11.0 小节） | v5.5 已占 |
| 命名先例 | `v2-insight` / `v3-ui` / `v4-chat` / **`v45-f-regularization`**（F-31，补丁级跟进轮）/ `v5-all-in-next` / `v55-self-driven` | 系列**均带版本段**；补丁级跟进轮有 `-f-` 先例 |
| **命名结论** | 本轮采纳 **`specs-tree-web-cli-plugin-v55-f-scope-governance`**（`-f-` = 补丁级跟进轮语义，与 `v0.11.1` patch 语义一致；保持系列命名一致） | 登记留给收口；**ROADMAP 零 diff** |

> **⚠️ 命名 / 版本位的语义辨析（须 spec / 收口显式确认，O-SGO-001）**：① 采纳 `v55-f-…` + `v0.11.1`（patch 跟进，与 `v45-f-regularization` 先例同构）【推荐】；② 若 spec 判定本 Feature 实为**新主题**而非 v5.5 的结构性收尾 ⇒ 改名 `v56-scope-governance` + 版本位 `v0.12.0`（但编排器给定 v0.11.1）；③ 若判定为 v5.5 的**缺陷收尾** ⇒ `v0.11.0` 内的延续（需重开 v55 树，**与 D7 冲突**）。

### 6.3 建议的叶子拆分草案（**供 spec 参考；discovery 只提建议不执行**）

> 依据：取代对象 / 门禁面 / 台账条目是否重叠，以及**体积必须先分列预算**。**共同风险 = 「范围读数」是共享底座**（引用事实的载荷与解析），故建议**先定底座、再做批量授权**。

| 叶 | 名称（建议） | 内容 | 依赖 |
|:-:|---|---|---|
| v55f-1 | `specs-tree-scope-1-ref-context-and-anchor`（**范围底座：引用事实进回合 + 范围法则 + 工具面 ref 锚定**） | 引用事实载荷（type-only）+ 系统段组装（含范围法则）+ `--ref` 锚定（plugin 侧包装；写命令先落地）+ 单节点保证 + 失配 / 失效非静默口径（EC 家族）+ 范围读数与留痕 + 端到端样板（双向反证） | —（P0，底座） |
| v55f-2 | `specs-tree-scope-2-batch-consent`（**任务级批量授权**） | 写入计划（N 处 目标+原文→译文）→ 一次 consent（复用 `auth` kind）+ 范围指纹绑定 + 计划外回落逐条 + 逐条审计保留（零明文）+ 中途可中止 + 特权 op 不受影响机核 + 批量变体注入必红 | v55f-1（范围读数与锚定底座） |

> **父 Feature** = 轻量规范容器（同 v3-ui / v4-chat / v4.5 / v5 / v5.5 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**）。
> **若 spec 判定两叶不可分割**（共享底座且体积必须一次重登记），可退化为**单叶 + 内部分组**——**登记为 O-SGO-008 的连带开放点**。

---

## 7. 附录

### 7.1 现状基线（**全部带 `file:line` 证据；本轮只读复核**）

#### A. 引用事实链路（Q-SGO-001 / 003 / 006 的对象）

| # | 事实 | 证据（`file:line`） |
|:-:|---|---|
| A1 | **回合载荷只有 `user`**（唯一回合载荷） | `src/ui/sidepanel/sidepanel.ts:329` `void send(makeMessage('chat', { user: trimmed }));` |
| A2 | **`runChat` 收裸字符串**；系统段 = **静态常量**；消息体 = `[{role:'system', content: system}, ...turns]` | `src/background/service-worker.ts:887`（`async function runChat(s: Singletons, user: string)`）· `:107-118`（`SYSTEM_PROMPT` 全文，**无引用 / 无范围**）· `:943`（`system: SYSTEM_PROMPT`）· `:948` |
| A3 | **唯一回合入口** `requestTurn(text)`；调用点 **恰 2**（composer 提交 + `op.turn` 槽） | `sidepanel.ts:304`（定义）· `:3581`（composer）· `:3608`（`bindPanelOps.turn`）；门禁 `test/op-wiring.test.ts`（`requestTurnProblems`，区域 `:124-132`） |
| A4 | **驱动者自动成回合**：`nextAfterSettle({kind:'answered'})` → `driveAnsweredTurn()` → 悬置 `instruction`（= **用户原话**）→ `pressCandidate('op.turn', …)` | `sidepanel.ts:1983`（`nextAfterSettle` 定义）· `:1990`（`if (src.kind === 'answered') driveAnsweredTurn()`）· `:2011-2050`（`driveAnsweredTurn`，`:2030-2044` 按下）· `next-registry/drivers.ts:258`（`Suspension.instruction`）· `:281`（`registerSuspension`） |
| A5 | **留痕只含字段名 / 不含值**（引用事实值**不**在留痕里） | `next-registry/ai-drive.ts:85`（`driverTraceLine`，注释逐字「只含**字段名**，**不含任何值**（零明文：Key / 答案全文 / URL query 都不进摘要）」）；真机例：`ty.md:21` `driver=ref-action | timing=answered | evidence=ref.validCount,ref.latestRefNum` |
| A6 | **引用事实（结构）**：`RefFacts` 含 refId / selector / semanticPath / textDigest / origin / documentId / navSeq / declarationHash / capturedAt | `src/ui/sidepanel/l1/ref-validity.ts:116-129` |
| A7 | **`textDigest` = 截断 80 字的页面文本**（非哈希） | `l1/ref-store.ts:33`（`TEXT_DIGEST_MAX = 80`）· `:241`（`truncate(raw.textDigest ?? '', TEXT_DIGEST_MAX)`）· `:116`（证据行「文本摘要」） |
| A8 | **引用投影（序号 / 标签 / 状态）** | `l1/ref-store.ts:140-142`（`refNum` / `refLabel` / `refState`）· `:205`（`glyph`） |
| A9 | **引用可判定层**：3 结果（valid / invalid / unknown，**fail-closed**）+ 6 维度（D1 `dom-gone` / D1b `invalid-selector` / D2 `origin-changed` / D3 `navigated` / D4 `declaration-changed` / D5 `authorization-revoked`）+ **R6 新增 `text-changed`** | `l1/ref-validity.ts:1-60`（头注释五维 + unknown 口径）· `:80`（R6 `text-changed`）· `:139-146`（`refMark` / `nodeCount` / R6 当前摘要） |
| A10 | **引用标记**：`data-wcli-ref` = refId，写在捕获节点上（best-effort） | `src/content/ref-capture.ts:67` · `:370` · `:372`（frozen / SVG 注释）· `:409`（观察回报 `refMark`） |
| A11 | **真机反证**：AI 读到 `data-wcli-ref="ref_1"` 且 `[data-wcli-ref]` 恰 1 个 ⇒ 仍未锚定 | `ty.md:545-551`（read-element 读到属性）· `:563-567`（`find "[data-wcli-ref]"：共匹配 1 个元素`） |
| A12 | **R6 反向通道（写后重评）已存在**：成功 `dom set-text` 携带 `targetSelector` → 面板只读重观测 → 重判 | `service-worker.ts:976-988`（`hooks.onToolDone`）· `sidepanel.ts:2515-2536`（`reobserveAfterWrite`）· `background/chat-events.ts:60` |

#### B. 工具面（Q-SGO-003 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| B1 | **base `dom` 工具无 `ref` 参数**；`set-text` 只认 `--selector` / `--text` | `packages/web-cli-base/src/dom-tools.ts:462-470`（set-text 分支）· `:99-103`（`SUBCOMMANDS` 全清单）· 参数面 `grep` `ref` = **0** |
| B2 | `set-text` 属 **write 组**（缺省 ask） | `packages/web-cli-base/src/dom-tools.ts:763`（`'set-text': 'write'`）· `:23-26`（头注释：write 组 ⇒ 'write'） |
| B3 | 工具 schema 声明（selector / text 描述；**无 ref**） | `packages/web-cli-base/src/dom-tools.ts:634`（selector）· `:651`（text） |
| B4 | **插件侧工具条目包装先例**（覆写 schema + executor） | `src/tools/chrome-host.ts:206-235`（`wrapChromeEntryForHost`）· `src/tools/browser-tools.ts:1-40`（`createDomToolEntry` 注册 + 「risk 永不放宽」纪律） |
| B5 | **base 零 diff 红线（可机核）** | `test/insight-no-escalation.test.ts:147`（`assert.equal(gitDiffStatus(['../web-cli-base']), 0, …)`，注释：「base 零改动」红线 2026-09-14 经作者放行调整，**仅限性能修复**） |
| B6 | 多匹配 / 未找到的**既有 EC 口径** | `ty.md:521`（EC-002：多匹配按首元素）· `:596,604`（EC-001：未找到 ≠ 错误，非静默）· `dom-tools.ts:105`（「参数解析小工具（executor 面；EC-002 可读错误 + 指引）」） |
| B7 | SW 侧工具分发点（**SW 不持有引用表**） | `service-worker.ts:951`（`dispatch: (tc) => s.host.dispatch(tc, { origin: … })`）· 引用表在面板 `l1/ref-store.ts`（面板 bundle） |

#### C. 授权 / 批量（Q-SGO-004 / 005 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| C1 | **缺省取向**：write / external / ui / state ⇒ **ask**；理由串逐字 | `packages/web-cli-base/src/permission.ts:16`（默认取向注释）· `:157`（按敏感面的缺省取向表）· `:333`（`'需确认：命中缺省 ask 取向（敏感面）'`） |
| C2 | **confirm 桥**（fail-closed）+ 单条摘要 + 审计 | `src/security/confirm.ts:84-156`（`createConfirmBridge`）· `:22-31`（`buildOperationSummary`）· `:112-143`（`confirm` 审计事件，ask / allow / deny） |
| C3 | **SW → 面板** confirm 请求 / 应答 | `service-worker.ts:634-644`（`ask: (question) => …` + `confirm-request`）· `:2887`（`confirmResponder?.(rid, message.allow === true)`）· 面板 `sidepanel.ts:251`（`confirm-response`）· `:3837-3845`（收 `confirm-request` → `dispatch({type:'confirm'})`） |
| C4 | **`confirm` → 既有 `auth` 卡**（12 kind 之一，零新增） | `chat-state.ts:616-622`（`kind: 'auth'`，`askKind: 'confirm'`）· `stream-model.ts:51-63`（`PRIMARY_CARD_TYPES` 含 `'auth'`）· `cards/auth.ts:1-40`（预演 = **静态三段模板**；6 终态；「no repeat decision」） |
| C5 | **红线⑥（AI 不得代答 consent）可机核** | `test/supersession-ledger.test.ts:2266`（`RL-06-consent-no-proxy`）· `:2339-2347`（实判据：`tierOf` + `pressDecision`）· `test/op-three-tier.test.ts:332`（AI 代答判据）· `:372-383`（OT-⑩ + 注入反证） |
| C6 | **特权 op 恒 gesture** | `next-registry/ops.ts:24`（逐字「the pipeline never calls…」）· `:307,317`· `test/capability-wiring.test.ts:51-58`（「SW 永不调用 `.request(`」） |
| C7 | **真机批量事实**：42 调用 / 42 卡 / 42 批准 / 4.5 分钟 | `ty.md:1213-1860`（逐条）+ §0.2 实测表（S1–S5） |
| C8 | op 面的一次性 consent 先例（面不同） | `next-registry/pipeline.ts:186-192`（`collectConsent` → allow / reject）· `:223-236`（settings「同执行体、不同 consent 载体」） |

#### D. 流 / 卡 / 宿主契约（Q-SGO-007 / 012 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| D1 | **12 kind** 契约（7 主类 + 5 过程卡）；v5 已立「零新增卡类型」 | `stream-model.ts:51-73`（`PRIMARY_CARD_TYPES` / `PROCESS_CARD_TYPES` / `STREAM_EVENT_KINDS`） |
| D2 | 6 终态 + `MAX_OPEN_ASKS = 2` + `ASK_CANCEL_REASONS` 4 项 + `REF_ROUND_PREFIX` | `stream-model.ts:86-121` |
| D3 | 零宿主判据：`REGISTERED_STRUCTURAL_HOSTS = []` | `host-registry.ts:105,187,200` + `test/host-registry.test.ts` |
| D4 | 法八四面零明文机核 | `test/ui/law8-plaintext.mjs`（36 断言，R6 后）+ v5 `ADR-V5-010` |
| D5 | `KIND_SET` **恰 40 项逐字**；type-only 先例家系 | `background/messaging.ts:103-141`（40）· `:68-97`（type-only 家系注释）· `content-script.ts:20`（import ⇒ 打进 `content.js`） |
| D6 | 法七扩展终态词表（**恰 4**，与 `STREAM_TERMINALS` **正交**） | `next-registry/terminals.ts:1-60`（`DRIVER_TERMINALS` / `DRIVER_TERMINAL_OF_SOURCE`）· `test/law7x-ext.test.ts:1-50`（双向反证 + 三段控制） |

#### E. 体积与冻结面（**本轮实测 / 引自 R6 登记**）

| # | 项 | 值 | 来源 |
|:-:|---|---|---|
| E1 | `dist/content.js` | **177,076 B**（sha `52a82620…`，**零容差**） | `test/size-baseline.ts:2703`（`CONTENT_MAX_BYTES`）+ R6 记录 |
| E2 | `dist/pick-layer.js` | **34,358 B**（sha `77796bab…`，**零容差**） | `test/size-baseline.ts:2510-2516`（`PICK_LAYER_*`） |
| E3 | `dist/sidepanel.js` 登记基线 | **578,623 B** | `test/size-baseline.ts:351`（`SIDEPANEL_BASELINE_BYTES`，R6 登记） |
| E4 | 生效上限（公式） | **607,554 B** = `floor(578,623 × 1.05)` | 计算（容差 **5%** 未动） |
| E5 | **余量** | 距生效上限 **28,931 B**；**距档位 35,777 B**；距绝对上限 **97,217 B** | 计算（614,400 − 578,623 = 35,777；675,840 − 578,623 = 97,217） |
| E6 | 档位 / 绝对上限 / 授权线 | **614,400 B** / **675,840 B** / `authorConfirmation.status = pending-author-line`（**未闭合义务，不得伪称已确认**） | v55 closeout §5 / §8 第 12 条 + R6 记录 §体积 |
| E7 | `KIND_SET` 项数 | **40**（逐字，R6 后未增） | `messaging.ts:103-141` |
| E8 | 门禁计数（**引自 R6 记录 §门禁对账，本轮未复跑**） | `npm test` **1330** · journey **171** · binding **192** · s0-self-driven **59** · density 242 · page-input 118 · l0 248 · l1 120 · l2 74 · law8 36 · dead-end 49 · auth-chip 37 · stream 76 · ask-auth 78 · hardening 24 · insight 116 · e2e PASS · design-contract 60 · supersession 37 · zero-injection 28 · recommendation 72 · l1-reverse 9 · l2-reverse 10 | `docs/r6-ty-experience-fix-2026-09-23.md:147-163`（**R6 后**；本轮未跑门禁） |
| E9 | R6 体积登记 | 573,424 → **578,623 B**（+5,199 B，+0.91%），逐模块 `r6TyFixRows`（`sidepanel.ts` +2,513 / `recommend.ts` +977 / `view-model.ts` +453 / `l1/ref-validity.ts` +596 / `pick-input.ts` +258 / `next-registry/drivers.ts` +402） | `test/size-baseline.ts:439,519` + R6 记录 §体积五要素 |

### 7.2 干系人约束清单：**红线继承（N）** + **显式取代候选（X）**

> **本清单为约束（不是需求）**；spec 必须逐条落为 `NG-*` / `AC-*`，**不得改写数值或放宽口径**。

#### N. 红线继承（**逐字保留阈值 / 冻结面；来源 = 上轮收口 + 本轮实测**）

| # | 红线（**逐字**） | 来源 |
|:-:|---|---|
| **N-SGO-001** | `dist/content.js` = **177,076 B**（sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`，**零容差**） | `test/size-baseline.ts:2703` |
| **N-SGO-002** | `dist/pick-layer.js` = **34,358 B**（sha `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`，**零容差**；再动需再登记） | `test/size-baseline.ts:2510-2516` + R6 记录 |
| **N-SGO-003** | `sidepanel.js` ≤ 生效上限 **607,554 B** = `floor(578,623 × 1.05)`；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`** | `test/size-baseline.ts:351,459,489` + `test/size-budget.test.ts` |
| **N-SGO-004** | V3-VOL-3 三值：档位 = **614,400 B**、绝对上限 = **675,840 B**（= 档位 × 1.10）、`newBaselineBytes` 随现行基线**同源前移**；`authorConfirmation.status ∈ {pending-author-line, confirmed, overridden-by-author}`，**不得伪称已确认** | v55 closeout §5 / §8 第 12 条 + `docs/v4-supersession-ledger.json#v3Vol3Closeout` |
| **N-SGO-005** | **特权 op 恰 2 必须用户手势**：`op.authorize` / `op.perm.request`（`layer:'sw'`）；「**SW 永不调用 `.request(`**」；**AI 不可自动执行** | `next-registry/ops.ts:24,307,317` + `test/capability-wiring.test.ts:51-58` |
| **N-SGO-006** | **consent 档（confirm / gesture）不得被 AI 代答**（红线⑥，含实判据 `pressDecision` + 注入反证） | `test/supersession-ledger.test.ts:2266,2339-2347` + `test/op-three-tier.test.ts:332,372-383` |
| **N-SGO-007** | **`packages/web-cli-base/**` 零 diff**（跨包红线；历史仅放行性能修复一次，**须作者放行**方可再动） | `test/insight-no-escalation.test.ts:147` + `N-SELF-014` |
| **N-SGO-008** | **判定链零触碰**：`src/security/policy.ts` / `src/security/auto-authorize.ts` 在 `zeroDiffFiles` 冻结（内容哈希 pin，9 项） | `packages/web-cli-plugin/docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项） |
| **N-SGO-009** | **`KIND_SET` 40 项逐字不增**；新消息族（若有）走 **type-only 先例**（进 `KIND_SET` = 增长 `content.js`，默认禁止） | `messaging.ts:103-141` + `:68-97` |
| **N-SGO-010** | **12 kind 契约不动**（7 主类 + 5 过程卡）；**零新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []`） | `stream-model.ts:51-73` + `host-registry.ts:105,187,200` + `test/host-registry.test.ts` |
| **N-SGO-011** | **法八零明文不退化**：流内 payload / digest / 审计 / DOM **四面零明文**（批量计划清单**不得**把正文 / 译文写入这四面） | `test/ui/law8-plaintext.mjs`（36）+ `cards/auth.ts`（预演用静态模板的理由） |
| **N-SGO-012** | **法七不退化**：5 类阻塞终态流内**必有可达 next**（死端 = 0）；本 Feature 只**扩展**词汇 / 读数，**不得**削弱既有判据 | `test/ui/no-dead-end.mjs`（49）+ `test/s2-deadend-chain.test.ts` |
| **N-SGO-013** | **法七扩展终态词表恰 4 项、与 `STREAM_TERMINALS` 正交**；字面量在 `src/**` 只允许出现在 `terminals.ts`（第二声明 ⇒ FAIL） | `next-registry/terminals.ts`（唯一声明）+ `test/driver-terminals.test.ts` + `test/law7x-ext.test.ts` |
| **N-SGO-014** | **主流程调用点计数门禁**：`requestTurn(` 仅允许 2 处（入口定义 + composer 提交）；调用点登记表必须覆盖全部 op（漏登记 / 多出 ⇒ FAIL） | `test/op-wiring.test.ts`（`requestTurnProblems` / `callSiteProblems`） |
| **N-SGO-015** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账**显式取代**并留痕） | v55 closeout §4 规律 + `test/supersession-ledger.test.ts` |
| **N-SGO-016** | 保护 pin：journey **`43054..58287` / sha `cc79f413…` / 240 行**；binding **`107780..115930` / `be9ad0e9…`**（`decision = keep`；**未发生第三次取代**） | `docs/v4-supersession-ledger.json#protectedRanges`（v55 保段） |
| **N-SGO-017** | **门禁严格串行**（一次一个 Chromium；`test` / `test:ui` / `test:binding` **绝不并发**）；`CHROMIUM_GATES === 9` 不动 | `test/gate-integrity.test.ts`（`:225-242`） |
| **N-SGO-018** | 纪律：**不碰 `main`、不 force push、path-limited `git add`（禁 `git add -A` / `.`）、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖**；**不合 main、不发布** | v55 closeout §10 + 立项纪律 |
| **N-SGO-019** | **`F-29`（A2A 候选）未立项未排期，保持原样不动**（ROADMAP 相关区段**一字不动**） | v55 closeout §8 第 13 条 |
| **N-SGO-020** | **v55 / R6 产物零改写**：v55 父 + 三叶 `validated` 终态、R6 记录与体积登记**原样保留**（D7 / D8） | v55 closeout + `docs/r6-ty-experience-fix-2026-09-23.md` |
| **N-SGO-021** | `KL-N-10` 处置纪律：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | `docs/v4-supersession-ledger.json#knownLimitations` |
| **N-SGO-022** | 纪律：**开放点不得在 spec 前被"顺手定下"**；范围法则载体 / 批量授权范围绑定 / `--ref` 读命令取舍 = **spec 批量裁决**（D2） | 编排器 D2 + 本报告 §7.4（全部附推荐、未定论） |
| **N-SGO-023** | **`authorConfirmation.status = pending-author-line` 属未闭合义务**：任何文档 / 台账**不得**伪称体积档位已确认；升档须走 EC 家族显式路径 | v55 closeout §5 / §8 第 12 条 |

#### X. **显式取代候选清单（须在 spec / 台账逐条显式登记，不得静默）**

> **口径**：**「显式取代」≠「放宽」**——判据必须**等价重锚**（断言力不降、计数只增），并留台账。

| # | 既有形态（现状逐字） | 取代 / 裁决内容（依据） | 连带门禁（须等价重写，非放宽） |
|:-:|---|---|---|
| **X-SGO-1** | **回合载荷恰 1 字段**：`makeMessage('chat', { user })`（`sidepanel.ts:329`）；`runChat(s, user)` 裸字符串（`service-worker.ts:887`） | **允许回合携带引用上下文**（type-only 载荷字段 ⇒ **不新增 kind**；`KIND_SET` 40 不动）；两条入口（驱动者 / 手动）同口径 | `test/op-wiring.test.ts`（回合入口）+ `messaging.ts` 的 type-only 先例；若改消息 kind ⇒ `content.test.ts` 必红 |
| **X-SGO-2** | **系统段 = 静态常量** `SYSTEM_PROMPT`（`service-worker.ts:107-118`，`:943` 直接引用） | **系统段可每回合组装**（含范围法则 + 引用事实）；**替换读法**：常量保留为基座 + 追加段（推荐）vs 整体动态化 | 无既有门禁读提示词内容（`grep SYSTEM_PROMPT test/` = 0）⇒ 须**新增**判据（否则"法则"零机核，Q-SGO-010） |
| **X-SGO-3** | **base `dom` 工具参数面零 ref**（`dom-tools.ts:462-470`）；base 零 diff 红线（`insight-no-escalation.test.ts:147`） | **`--ref <n>` 锚定**：走 **plugin 侧条目包装**（`chrome-host.ts:206` 先例）→ 解析为 `[data-wcli-ref="ref_n"]` 交 base executor；**base 零改动**为默认读法（解冻须作者放行） | `test/insight-no-escalation.test.ts`（base 零 diff）+ 工具 risk / `subcommandRisks` **不得放宽**（`browser-tools.ts` 纪律）+ 新增"锚定失败非静默"门禁 |
| **X-SGO-4** | **逐条写入授权**：base `ask` 档 → 每次命令一张 `auth` 卡（`confirm.ts` + `chat-state.ts:616-622`） | **任务级批量授权**：AI 先出计划 → **一次**用户手势覆盖整批；**范围指纹绑定** + **计划外回落逐条** + 逐条审计保留（零明文）+ 中途可中止 | `RL-06` / `OT-⑩`（AI 不得代答）**必须扩到批量变体并注入必红**；`law8` 36 不得降级；`auth` 卡 6 终态语义保持 |
| **X-SGO-5** | **引用判定只回答"可不可用"**（`ref-validity.ts` 3 结果 / 6 维度，fail-closed） | **增设"作为范围锚"的解析读数**（单节点保证 + 失配 / 失效可判）；**不得**改变既有 `valid/invalid/unknown` 的 deny 方向 | `test/l1-ref-validity.test.ts`（112？逐条复核）+ `test/ui/l1.mjs` + `test/ui/page-input.mjs`；新增读数须双向反证 |
| **X-SGO-6** | **终态词汇**：5 类阻塞（`definition.ts:34-41`）+ 4 类已表达意图（`terminals.ts`） | 若"**未征询的越界写**"要可判 ⇒ **词汇扩张**（新读数 / 新终态），须与 `STREAM_TERMINALS` 保持正交、唯一声明 | `test/ui/no-dead-end.mjs`（49）+ `test/law7x-ext.test.ts`（5）+ `test/driver-terminals.test.ts`（第二声明 ⇒ FAIL） |
| **X-SGO-7** | **主流程调用点计数**（`requestTurn(` 恰 2 / `maybeRecommend(` 恰 7 / `nextAfterSettle` 单入口） | **若**范围法则需要新的驱动时机 / 新驱动者 ⇒ 走**既有注册表内扩张**（`driverClass` / timings / moments），**主流程 diff = 0**；否则显式放宽 + 等价重锚 | `test/op-wiring.test.ts` + `test/driver-timings.test.ts` + `test/driver-quadruple.test.ts` + `test/recommendation-sources.test.ts` |

> **须注意的边界**：**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」的方式落地**；默认优先"**在既有注册表内扩张（diff = 0）**"的读法，只有当等价重锚被证不可行时才显式放宽并留台账。

### 7.3 门禁影响面预判（**迁移量估计，不是承诺**）

| 门禁 | 预判存活度 | 主要冲击点 |
|---|---|---|
| `npm test`（1330） | **中** | 新增引用载荷 / 系统段 / 锚定 / 批量授权判据；`op-wiring` / `messaging` / `driver-*` 可能重锚 |
| `test:ui` journey（171） | **中** | 保护段 `43054..58287`（240 行）**可能被再次八步取代**（若改回合载荷或流结构）；段外汇总 / 流内行逐条受影响 |
| `test/ui/s0-self-driven.mjs`（59） | **中** | S0 判「零按键 + 恰 1 条 chat 原文」⇒ 回合载荷扩张 / 范围读数入流会连锁（**样板可扩为"范围受限"必判项**） |
| `test:l0`（248）/ `test:density`（242） | **低—中** | 若范围读数 / 批量卡新增可见行 ⇒ 密度预算（**阈值不得变**）+ 状态栏语义 |
| `test:page-input`（118）/ `test/ui/l1.mjs`（120） | **中** | 引用判定 / 拾取入口（`--ref` 锚定若走拾取解析面） |
| `test:law8`（36）/ `no-dead-end`（49） | **低—中** | 法八**必绿**（批量计划清单是最大风险面）；死端判据**扩**（若新增读数 / 终态） |
| `test:hardening`（24）/ `zero-injection`（28） | **高** | 不涉形态，但安全边界（批量授权）改动须复跑确认不回归 |
| `test:supersession`（37） | **低** | `knownGap` 一致性 + 八步 + 红线终核 12 项；新增取代条目必须登记 |
| `test:size-*`（在 `test` 内 + `size-ruling-vol3` 12） | **中** | 强制五要素重登记 + 算术机核 + V3-VOL-3 三值前移 + 逐模块 metafile 归因（**距档 35,777 B ⇒ 高概率触发**） |
| `test:gate-integrity`（19）/ `e2e` | **高** | 新门禁需纳入受审集合（`CHROMIUM_GATES === 9` 不动） |
| `test:l1-reverse`（9）/ `l2-reverse`（10） | **中** | 反证**注入点**若被搬走，反证需重写（判据不得空转） |
| `test:insight-no-escalation`（base 零 diff） | **高** | `--ref` 若误入 `packages/web-cli-base/**` ⇒ **直接红** |

### 7.4 开放问题清单（**给 spec 阶段批量裁决；每条附推荐，但未定论**）

| ID | 开放问题 | 为什么必须在 spec 裁决（不裁决的后果） | 候选（编排器预登记，**非方案评估**） |
|---|---|---|---|
| **O-SGO-001** | **命名与版本位的语义配对**：目录名 `v55-f-scope-governance`（补丁级跟进轮，承 `v45-f-regularization`）vs 版本位 `v0.11.1`（patch）；或 `v56-scope-governance` + `v0.12.0`（新主题） | 不裁决 ⇒ 收口登记时命名 / 版本位口径不一，后续追溯混乱 | ① **`v55-f-scope-governance` + `v0.11.1`**（与 v45-f 先例同构、patch 语义一致）**【推荐】** ② `v56-scope-governance` + `v0.12.0`（新主题语义，但偏离编排器给定版本位） ③ 并入 v55 树（与 D7「v55 产物零改写」冲突，**不建议**） |
| **O-SGO-002** | **范围法则的载体**：机制（可判读数 + 门禁）vs 提示词约定（`SYSTEM_PROMPT` 加一段）？二者关系（机制为唯一判据 / 提示词为主机制兜底 / 双轨） | 不裁决 ⇒ 法则**零机核**（现无门禁读提示词），改一行提示词即静默失效（Q-SGO-010 / R-SGO-002） | ① **双轨：机制读数 + 提示词表述**（读数是判据，提示词是引导；门禁判读数）**【推荐】** ② 纯机制（模型无引导，可能不知要遵守） ③ 纯提示词（零机核，不可验收） |
| **O-SGO-003** | **引用事实进回合的载荷形态与字段集**：`chat` type-only 字段（结构化引用表）vs 面板把引用拼进 `user` 文本；注入哪些字段（id / 序号 / 摘要 / 选择器 / 标记 / 状态）；**零明文口径**（`textDigest` = 80 字页面文本是否算"可进 LLM 上下文"） | 不裁决 ⇒ 要么漏注入（AI 仍不知）、要么过度外送（与法八 / 留痕纪律边界不清） | ① **type-only 结构化载荷（refId / 序号 / 摘要 / selector / mark / verdict）+ 口径写死"页面文本可进 LLM 上下文、凭据值不可、留痕仍只含字段名"**【推荐】 ② 拼进 `user` 文本（零新字段，但污染用户可见行） ③ 每次引用都注入**当前只读重观测**（最新鲜，但每回合多一次页面探测） |
| **O-SGO-004** | **工具面 ref 锚定**：`--ref <n>`（n = 引用序号）vs `--ref-id <ref_n>`；**只写命令加** vs 读命令也加；实现载体（plugin 侧包装 vs base 解冻）；失配 / 失效口径（回退既有 selector？直接失败？EC 家族新码？） | 不裁决 ⇒ 实现面（跨包红线）与工作量不确定；读命令取舍影响探测成本与面大小（Q-SGO-003 / R-SGO-003） | ① **plugin 侧包装 + `--ref <n>`（序号，与 chip「用引用 N」同词汇）+ 解析为 `[data-wcli-ref="ref_n"]` + 单节点保证 + 失配 fail-closed 非静默；先落写命令，读命令后续裁决**【推荐】 ② 读 + 写都加（面更大，探测也受控） ③ 只加不失败回退（弱） |
| **O-SGO-005** | **批量授权的范围绑定与 consent 关系**：计划由谁生成（AI / 系统）；一次手势如何覆盖 N 条（范围指纹：目标集合 ∧ 动作类型 ∧ 文本对）；计划外第 N+1 条如何回落；与 `confirm` / `gesture` 档的红线⑥关系；中止后的留痕 | 不裁决 ⇒ 批量授权可能退化为"AI 代答 41 次"（R-SGO-001，唯一红线级风险） | ① **计划指纹绑定（目标集合 + 动作类型）+ 一次用户手势 + 计划外**逐条回落**+ 特权 op 不入批 + 批量变体注入必红**【推荐】 ② 时间窗内同范围自动放行（弱：时间与范围都难判） ③ 只做"计划展示"不做批量放行（不解决问题） |
| **O-SGO-006** | **扩大范围的征询形态**：AI 在写之前 `ask-user` 二择（「仅引用范围内」/「整页」）？范围读数入流？只写一行可读留痕？ | 不裁决 ⇒ 只"禁止越界"会**卡住正当的全页任务**（Q-SGO-011） | ① **`ask-user` 二择 + 用户确认 = 范围扩张的可判事实（入留痕）**【推荐】 ② 直接执行但写越界留痕（用户事后才知道） ③ 硬禁止越界（过度约束） |
| **O-SGO-007** | **法则是否立法（机核化）与判据形态**：若机核，判什么（写命令目标 ∈ 引用解析集合？未征询的越界写？）；形态（双向反证 + 三段控制禁恒真，参照 `law7x-ext`） | 不裁决 ⇒ 本 Feature 只剩文档价值；且易造**恒真断言**（v4.5 教训） | ① **立法为"范围读数"的机核判据（双向反证 + 注入必红 + 禁恒真），参考 `law7x-ext` 形态**【推荐】 ② 不立法，仅提示词 + 人工走查 ③ 只做端到端样板（不判读数） |
| **O-SGO-008** | **体积预算与叶拆分**：本 Feature 分列预算（sidepanel 账本 vs `background.js` 不计账）？是否需要**预先登记升档**？两叶 vs 单叶 | 不裁决 ⇒ 任务无法排（v5 教训：plan Σ 低估 2.8×；距档仅 35,777 B） | ① **spec 阶段先出分列预算 + 缓冲校验；不足则拆叶 / 减面；升档走 EC 显式路径 + 作者一行**【推荐】 ② 先排全量再补预算（**禁止**） ③ 单叶 + 内部分组（若两叶共享底座不可分割） |
| **O-SGO-009** | **是否需要外部竞品调研**（selection-scoped action / 批量破坏性操作授权聚合 / prompt-as-policy vs policy-as-code） | 若需要而未做 ⇒ 论证缺外部参照；若不需要而未显式裁决 ⇒ 后续可能被质疑遗漏 | ① **不需要**（有仓库内 S2 / S0 / `law7x-ext` / `auth` 卡先例 + 作者指示为最高价值源）**【推荐】** ② 需要，登记为待调研项（交付前完成） |

### 7.5 证据台账（文件级）

| 路径 | 用途 |
|---|---|
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/ty.md` | **第一证据源（本轮入库）**：真机会话全文 1963 行（21:28:28–21:32:29）；引用拾取（`:8-10`）· 答案（`:13`）· 驱动留痕（`:21`）· 回合文本（`:24`）· 「整页」误解自述（`:92`）· **AI 读到 `data-wcli-ref="ref_1"`（`:550`）与恰 1 命中（`:566`）** · 写入开始（`:1208`）· 授权卡（`:1214-1860`）· 收尾交代（`:1900-1960`） |
| `packages/web-cli-plugin/docs/r6-ty-experience-fix-2026-09-23.md` | **P3/P4/P5 已修证据**（本 Feature **不重开**）：缺陷逐条 + 修法 + 注入反证 + 门禁对账（1330）+ 体积五要素（573,424 → 578,623）+ 零触碰确认 |
| `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | **核心证据源**：`requestTurn`（`:304`）+ 调用点（`:3581` composer / `:3608` `op.turn` 槽）+ **`chat` 载荷只有 `user`（`:329`）** + `nextAfterSettle`（`:1983`）+ `driveAnsweredTurn`（`:2011-2050`）+ `reobserveAfterWrite`（`:2515-2536`）+ `confirm-request` → `auth`（`:3837-3845`）+ `submitAskFor`（`:2861-2934`）+ `applyRefAction`（`:2420-2445`） |
| `packages/web-cli-plugin/src/background/service-worker.ts` | **`SYSTEM_PROMPT` 静态常量（`:107-118`）** + `runChat(s, user)`（`:887`）+ 系统段注入（`:943,948`）+ confirm 桥接线（`:634-644`）+ 工具分发（`:951`）+ R6 `targetSelector`（`:976-988`） |
| `packages/web-cli-plugin/src/security/confirm.ts` | **逐条授权桥**：`createConfirmBridge`（`:84-156`）+ 单条摘要（`:22-31`）+ fail-closed + 审计（`:112-143`） |
| `packages/web-cli-plugin/src/ui/sidepanel/l1/{ref-store,ref-validity}.ts` | **引用事实结构**：`RefFacts`（`ref-validity.ts:116-129`）+ 6 维度 / fail-closed（`:1-60`）+ R6 `text-changed`（`:80`）+ `TEXT_DIGEST_MAX = 80`（`ref-store.ts:33`）+ 投影（`:140-142`） |
| `packages/web-cli-plugin/src/content/ref-capture.ts` | **引用标记**：`REF_MARK_ATTR`（`:67`）+ 写入（`:370`）+ best-effort 边界（`:372`）+ 观察回报（`:409`） |
| `packages/web-cli-plugin/src/ui/sidepanel/next-registry/{drivers,terminals,ai-drive,providers,ops}.ts` | 悬置登记（`drivers.ts:258,281`）· 终态词表（`terminals.ts`）· 留痕三要素（`ai-drive.ts:85`）· ref-action chip 文案（`providers.ts:155-158`）· 特权 op（`ops.ts:24,307,317`） |
| `packages/web-cli-plugin/src/ui/sidepanel/{stream-model,chat-state,cards/auth}.ts` | 12 kind / 6 终态 / `MAX_OPEN_ASKS`（`stream-model.ts:51-121`）· `confirm → auth`（`chat-state.ts:616-622`）· `auth` 卡（预演静态模板 / 6 终态） |
| `packages/web-cli-plugin/src/tools/{browser-tools,chrome-host}.ts` | 工具注册面 + **包装先例** `wrapChromeEntryForHost`（`chrome-host.ts:206-235`）+ 「risk 永不放宽」纪律 |
| `packages/web-cli-base/src/dom-tools.ts` · `src/permission.ts` | **base 工具参数面（无 ref）**（`dom-tools.ts:462-470,763`）· 缺省 ask 取向与理由串（`permission.ts:16,157,333`） |
| `packages/web-cli-plugin/test/{op-wiring,op-three-tier,capability-wiring,insight-no-escalation,supersession-ledger,law7x-ext,driver-terminals,gate-integrity}.test.ts` + `test/ui/{no-dead-end,law8-plaintext,s0-self-driven}.mjs` | 门禁底座：调用点计数 · AI 不代答 consent（RL-06 / OT-⑩）· 特权手势 · **base 零 diff** · 取代台账 · 法七扩展形态 · 终态唯一声明 · 门禁受审集合 · 死端 / 法八 / S0 样板 |
| `packages/web-cli-plugin/test/size-baseline.ts` + `size-budget.test.ts` | `SIDEPANEL_BASELINE_BYTES = 578_623`（`:351`）· 容差（`:459`）· 档位 / 绝对上限 / `record-only`（`:489` 等）· R6 登记（`:439,519`） |
| `packages/web-cli-plugin/docs/{v3,v4}-supersession-ledger.json` | `zeroDiffFiles`（9 项）· 保护段 + 八步 + `knownLimitations` · V3-VOL-3 三值 + `pending-author-line` |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/{closeout,discovery,state}.md/json` | **直接上游**：F-33 三叶终态 / 数字总账 / deferred 14 条 / 人工面 15 项 / 体积两次升档与未闭合义务；v5.5 的 `X-SELF-1~7` / `N-SELF-001~020` / `O-SELF-001~007` 形态（**本报告体例基准**） |
| `.sddu/specs-tree-root/ROADMAP.md`（v1.30.0） | 编号空间（`F-30`~`F-33` 已用；**`F-34` 0 命中**）+ 版本位（**`v0.11.1` 0 命中**；`v0.11.0` 已含 F-33）+ `F-29` 区段（**一字不动**） |

> **证据缺口（如实登记）**：① **真机截图 / 录屏未入库**——`ty.md` 是**会话文字记录**（作者提供），本报告不声称有截图证据；② **外部竞品调研未执行**（§4.1）；③ **门禁计数全部引自 R6 记录的 §门禁对账表**（本轮未跑门禁 / 构建 / Chromium，**零产品运行时验证**）；④ `ty.md` 的「42 / 40」等实测数字为**本轮 `grep` 复核**，与编排指示的约数（「~60 探测 / 35 写入 / 35 卡」）**存在差异，已在 §0.2 显式登记并说明取实测口径**；⑤ 「AI 是否在其它会话命中过同类范围漂移」**未统计**（无历史会话库）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin F-34「范围治理：引用即范围」问题挖掘）：`ty.md`（1963 行）**入库并作为第一证据**（原地提交 + 来源标注；§0.1）+ 真机实测数字（`grep` 复核：`dom set-text` **42** / 授权卡 **42** / 已批准 **42** / 成功回执 **40** / `dom find` **99**；与编排约数的差异如实登记 §0.2）+ 编排指示 P1/P1′/P3/P2 逐字保留（§0.3）+ **P3/P4/P5 = R6 `74d76c1` 已修不重复立项**（D8 / §1.4）+ 核心问题 Q-SGO-001~006 / 次要 007~009 / 潜在 010~015 + 假设 A-SGO-001~010 + 风险 R-SGO-001~011（含 Top5）+ **红线继承 N-SGO-001~023 + 显式取代候选 X-SGO-1~7** + 开放问题 O-SGO-001~009（**全部附推荐**）+ 叶拆分草案 2 叶（v55f-1 范围底座 → v55f-2 批量授权）+ **F-34 / v0.11.1 零占用实测复核**（§6.1 / §6.2）+ 现状基线 §7.1 A~E 全量 `file:line` 证据 | 2026-09-23 | SDDU Discovery Agent |
