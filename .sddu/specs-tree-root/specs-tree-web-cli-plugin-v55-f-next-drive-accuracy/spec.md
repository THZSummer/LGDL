# Feature Specification：specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v5.5.4「next 驱动机制的准确落地：围栏块口述 → next 工具（function calling）+ 无条件触发 + 未配置确定性引导 + LLM 异常兜底链」）

> **文档定位**: SDDU 需求规范 — 定义功能需求、非功能需求和边界情况，作为 plan 阶段的输入
> **前置依赖**: 本目录 `discovery.md` v1.0（2026-09-27）——问题清单 **Q-NDA-001~024**（核心 13 / 次要 6 / 潜在 5）/ 假设 **A-NDA-001~009** / 风险 **R-NDA-001~013** / 开放问题 **O-NDA-001~014**（附推荐）/ 事实附录 §0.2（F-36 现状 A 产出通道 / B 触发范围 / C 未配置路径 / D 异常兜底 / E 上游底座 / **F function calling 底座** / G plan 否决 tool-call / H 体积门禁）/ §7（保留 K-1~K-9 / 推翻 S-1~S-4 / deferred 转正 T-1~T-4）/ 叶拆分建议（2 叶，依存序）
> **直接输入**: ① **作者裁决（2026-09-27，本次对话定稿，逐字保留于 discovery §0.1）**：顶层原则「**有配置 LLM 的时候，LLM 驱动；没有配置 LLM 的时候，系统驱动用户配置 LLM**」+ 口径①「对话结束如果 LLM **没有调用 next 工具**，记得你要**提醒 LLM**，做好最后兜底，如果 LLM **始终无法给你 next（LLM 坏了等情况）**，那就应该由**系统给出兜底的推荐，推荐用户配置新的 LLM 等操作**」+ 口径②「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」+ 价值锚「只有**准确无误、高可靠**的做到这些，那我们之前做的 all-in-chat/next 才是有意义，有价值的」② **编排器裁决 O-NDA-001~014（全部采纳 discovery 推荐项 + 逐条细化；本规范登记为 `ruled`，DC-NDA-001~014）** ③ 前序 Feature **F-36** `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（v0.11.3，父 + 两叶 `validated/completed`；**被修正对象 + 保留资产来源**）④ 上游底座（v5.5 F-33 / v5.5.1 F-34 / v5.5.2 F-35 / R8 首开 floor / v5.5 F-32）⑤ 相关立法（法一 / 法七 / 法八 / 法九）⑥ 仓库现状（分支 `feature/web-cli-plugin` @ `a75466a`；spec 阶段只读复核，**零运行时验证**）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（web-cli-plugin F-37 / v0.11.4「next 驱动机制的准确落地」需求规范：父 Feature = 轻量规范容器 + **2 个叶子子 Feature**（依存序，`nda-1-next-tool-channel → nda-2-fallback-and-gates`）；含 O-NDA-001~014 十四条开放点的逐条裁决落位 + **`next` 工具 schema 口径** + **提醒补一次的有界机制** + **LLM 异常判定闭集** + **系统兜底推荐形态** + **未配置确定性引导 + 自由输入分相** + **围栏块通道替换** + **首开边界** + 与 F-36 的取代台账 X-NDA-1~12 + N-NDA-001~030 红线 + 体积分列预算表）

web-cli-plugin v5.5.4「**next 驱动机制的准确落地**」需求规范 —— F-36 已把「next 产出权交给 AI」的**原则**立住，但把**机制**做偏了：它用「**文本尾随 `next` 围栏块 + 正则解析**」冒充**函数调用**（`ref-context.ts:52-59` / `ai-next.ts:58-87`，F-36 plan 显式否决 tool-call `plan.md:127-133`）；把触发范围**收敛到「有引用」上下文**（`ref-context.ts:97-100`；`providers.ts:162-175`；`plan.md:290` PD-ADN-005）；把「未配置 LLM」的 next 实现成**恒真的「自由输入」终端**（`providers.ts:217`）；并且**没有 LLM 异常兜底**（`service-worker.ts:1027-1043`）。关键事实（discovery §0.2-F）：**LLM 回合早已支持 function calling**（基座 `web-cli-base/src/llm.ts:23-75,82-197` + `runner.ts:140-190` 工具循环 + **`hooks.intercept` 缝** `runner.ts:50-55,158-164`，其注释**逐字点名先例**「**next-actions 胶囊由此接入**」），**但插件今天没有接线**（`service-worker.ts:1045-1059` 只传 `onToolDone`）—— 本 Feature 正是把这处**机制落差**补齐（**零改基座**）。

**题眼（本 Feature 名 `next-drive-accuracy` 的语义）**：v5.5（F-33）把「**下一步由谁按**」转移到系统 / AI 侧；v5.5.2（F-35）把「**输入面**」收编进 next 流内；v5.5.3（F-36）把「**产什么 next**」从确定性注册表收编给 AI。**v5.5.4 的题眼 = 「把 F-36 的实现机制校正到作者已立的原则」** —— 产出机制换轨为**真正的 `next` 工具（function calling）**、触发范围改为**无条件（配置 LLM ⇒ 对话结束即驱动）**、未配置路径改为**确定性「去配置 LLM」引导（自由输入不可行、不显示）**、并补上**「提醒 LLM 补一次 → 仍失败由系统兜底推荐配置新 LLM」**的兜底链。**价值锚 = 只有准确无误、高可靠地做到这些，all-in-chat/next 才有意义。**

**与 F-36 的具体关系（并列新主题，不回头改）**：F-36 及其两叶、F-35 / F-34 / F-33 / R8 / F-32 / v5.5 / v5 / v4.5 / v4 产物**原样保留、零改写**（N-NDA-005 / NG-NDA-006）——本 Feature 以**并列新主题**立项，**不**上溯改写任何 `validated` / `completed` 终态；F-36 建的正确资产（**5 道校验链 / `admitCandidate` vs `pressDecision` 分层 / `tierOf` 单源 / `chat-result.aiNext` type-only 加法字段 / 确定性退居兜底 / 已配置时 free-input 终端恒常驻 / R6 同因去重扩展 / 留痕零明文**）**逐条保留**（§5.4 / §12）；**唯一授权立法例外 = X-NDA-1~5 的四处机制偏颇显式取代登记**（走 supersession 台账 old→new，**不是**静默改写）。

编号一律 `FR-NDA-*` / `NFR-NDA-*` / `EC-NDA-*` / `AC-NDA-*` / `NG-NDA-*` / `G-NDA-*` / `US-NDA-*`（NDA = Next-Drive Accuracy；与 v1/v2/v3/v4/v4.5/v5/v5.5/v5.5.1/v5.5.2/v5.5.3 及 **F-36 的 `FR-ADN-*` 零冲突**；discovery §0.2-H 本轮实测 `F-37` / `v0.11.4` 全仓 **0 命中**）。**父 Feature 定位 = 轻量规范容器**（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 / F-34 / F-35 / F-36 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**、不产父层 `tasks.json`），实施由 **2 个叶**按依存序承接。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-web-cli-plugin-v55-f-next-drive-accuracy（web-cli-plugin v5.5.4「next 驱动机制的准确落地」，ROADMAP **F-37**） |
| 名称 | web-cli-plugin v5.5.4「next 驱动机制的准确落地（修正 F-36 的四处偏颇）」——① **产出机制换轨**：注册 `next` 工具（`LlmToolDef{name:'next',description,parameters}`），经基座 **`hooks.intercept`** 缝捕获工具调用参数（返回合成 `ToolResult` 跳过 dispatch），替换文本围栏块口述 + 正则解析；② **触发范围无条件**：只要**配置 LLM**，**对话结束**即由 LLM 驱动（不再只并入有引用分支 / 不再骑 `ref-action` 位独占）；③ **未配置 LLM**：next = **确定性「去配置 LLM」引导**，**不显示自由输入终端**（自由输入无 LLM 不可行）；④ **LLM 异常兜底链**：**提醒 LLM 补一次**（有界恰一次）→ 仍失败 ⇒ **系统兜底推荐「配置新的 LLM」**（确定性）；⑤ **保留 F-36 正确资产**（5 道校验链 / 判定分层 / `tierOf` 单源 / `chat-result.aiNext` 加法字段 / 确定性退居兜底 / 已配置终端恒常驻 / R6 去重 / 留痕零明文）；⑥ **门禁重锚 + `parity` 新条目 + 体积分列预算**（距档 9,798 B） |
| 优先级 | P0（**产品语义 / 可靠性一致性**；承「让助手像助手」主线 + all-in-chat/next 价值锚） |
| 目标版本 | **v0.11.4**（**全新版本位**，discovery §0.2-H 本轮实测 `v0.11.4` 全仓 = **0**；**patch 语义** = v0.11.0（F-33 v5.5）主题的补丁级跟进轮，承 F-34 `v0.11.1` / F-35 `v0.11.2` / F-36 `v0.11.3` 先例）；登记留给收口，本阶段 **ROADMAP 零 diff** |
| 命名与版本位（**O-NDA-001 已裁决**） | 目录名 **`v55-f-next-drive-accuracy`**（`-f-` = 补丁级跟进轮，承 `v45-f-regularization` / `v55-f-scope-governance` / `v55-f-input-as-next` / `v55-f-ai-driven-next` 先例）+ Feature ID **F-37** + 版本位 **`v0.11.4`**（patch）；语义 = 「**v5.5 主题的 next 产出机制校正补丁级跟进轮**」，见 §11.1 DC-NDA-001 |
| 分支 | `feature/web-cli-plugin`（与 v1~v0.11.3 同分支继续堆；**不合 main、不发布**；**不碰 `main`**） |
| 当前 HEAD（立项时） | `a75466a`（`chore: 配置 npm 源（默认走镜像，@lgdl 走官方源用于发布）`，F-36 收口 `103e981` 之后）；本规范为其上的 spec 产物 |
| 上游 / 底座 | **F-36** `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（v0.11.3，父 + 两叶 `validated/completed`，**被修正对象 + 保留资产来源**：围栏块协议 / `ai-next` provider / 5 道校验链 / 判定分层 / `chat-result.aiNext` / free-input 恒常驻 / `ai-next-candidate` 门禁）+ F-35 `-v55-f-input-as-next`（v0.11.2；free-input 终端 / 零死端 floor / `op.turn` 槽 / `requestTurn(` 恰 1 / 法四）+ **R8 `38565ac`**（首开 `maybeRecommendOpenEntry` 复用 `'idle'`）+ F-34 `-v55-f-scope-governance`（v5.5.1；法九）+ F-33 `-v55-self-driven`（v5.5；`pressCandidate` / `driveAnsweredTurn` / 三档清分 / 护栏六常量 / 留痕三要素）+ F-32 `-v5-all-in-next`（v5；next 注册表契约 v2 / op 三档 / 12 kind / 零宿主 / 真值 7 源）+ **基座 function calling 底座**（`web-cli-base/src/llm.ts` `LlmToolDef`/`WebCliToolCall` + `runner.ts` `hooks.intercept`；**只复用、零改**）—— 全部**只读复用、零改写**（唯一授权例外 = X-NDA-1~5 的显式取代登记，见 §12） |
| 目录深度 | depth=1（父 Feature，轻量规范容器）；子 Feature = **2 个叶**（depth=2，见 §14） |
| 叶子 | ① `specs-tree-nda-1-next-tool-channel`（**首叶 / 机制叶**：**产出机制换轨**（`next` 工具 schema + `host.ts` 工具注册面 + `runChatTurn` 的 `hooks.intercept` 接线 + 合成 `ToolResult`）+ **触发范围无条件**（不再只并入有引用分支；`ai-next` provider 规则位等价重锚）+ **5 道校验链保留接入**（输入从围栏块解析项 → 工具参数项）+ **围栏块通道替换**（`NEXT_CONTRACT_GUIDANCE` / `FENCE` 停止）+ `chat-result.aiNext` 装配保持 + `DRIVER_DECLS_SRC` 加法保持 + `parity` 新 `pluginExtra` 条目 + `ai-next-candidate` 门禁改写 + S0'''' 主线 / 支线 B 的 node 面）→ ② `specs-tree-nda-2-fallback-and-gates`（**末叶 / 兜底与判据叶**：**未配置确定性「去配置 LLM」引导 + 自由输入分相（未配置不显示 / 已配置恒常驻）** + **提醒补一次（有界恰一次）+ LLM 异常判定闭集 + 系统兜底推荐「配置新 LLM」** + 首开边界落地（保持确定性）+ **S0'''' 支线 C/D/E 终态** + 体积分列预算 + 门禁逐条重锚（含保护段）+ `X-NDA-1~12` 台账终态）**依存序，必须串行**（叶2 依赖叶1 已建立工具通道与校验链接入 —— **先立工具通道与安全闸，再收未配置 / 异常兜底与门禁口径**） |
| 相关干系人 | 作者（插件当前唯一真实用户 + 立项人 + 唯一决策者；**已授权编排器代行决策、全流程自行调度**，D1）；编排器（D1~D8 + **O-NDA-001~014 十四条裁决**）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | Q-NDA-001~013（核心）/ Q-NDA-014~019（次要）/ Q-NDA-020~024（潜在）；母问题 = Q-NDA-001 |
| 关联风险 | R-NDA-001~013（discovery 继承）+ R-NDA-901~910（spec 新增，见 §15.2） |
| 关联红线 | N-NDA-001~020（本规范从 discovery 约束 + 编排裁决红线编成，见 §13.1）+ **N-NDA-021~030（spec 新增红线，见 §13.2）** |
| 关联取代 | **X-NDA-1~12**（与 F-36 的取代 / 保留 / 未发生，见 §12） |

### 1.1 编号命名空间声明（**强制**）

| 命名空间 | 本 Feature 使用 | 历史占用（**零冲突，禁止复用**） |
|---|---|---|
| 功能需求 | `FR-NDA-###` | v1 `FR-001~055`；v2 `FR-V2-*`；v3 `FR-V3-*`；v4 `FR-CHAT-*`；v4.5 `FR-V45-*`；v5 `FR-ALLN-*`；v5.5 `FR-SELF-*`；F-34 `FR-SGO-*`；F-35 `FR-IAN-*`；**F-36 `FR-ADN-*`** |
| 非功能需求 | `NFR-NDA-###` | v1 `NFR-001~010`；v2~F-36 `NFR-*` |
| 边界情况 | `EC-NDA-###` | v1 `EC-001~026`；v2~F-36 `EC-*` |
| 验收标准 | `AC-NDA-###` | v1 `AC-001~012`；v2~F-36 `AC-*` |
| 非目标 | `NG-NDA-###` | v2~F-36 `NG-*` |
| 目标 / 用户故事 | `G-NDA-###` / `US-NDA-###` | — |
| 裁决记录 | `DC-NDA-###` | v5 `DC-ALLN-*`；v5.5 `DC-SELF-*`；F-34 `DC-SGO-*`；F-35 `DC-IAN-*`；**F-36 `DC-ADN-*`** |
| spec 新增风险 | `R-NDA-9xx` | v5 `R-ALLN-9xx`；…；F-36 `R-ADN-9xx` |
| 红线（本规范编成 + 新增） | `N-NDA-001~020` / `N-NDA-021~030` | F-35 `N-IAN-001~028`；F-36 `N-ADN-001~030` |
| 缺口编号（本规范派生，见 §10.0） | `GAP-NDA-01~08` | F-36 `GAP-ADN-01~08` |
| 与 F-36 的取代台账 | `X-NDA-1~12` | F-35 `X-IAN-1~n`；F-36 `X-ADN-1~11` |
| 遗留开放点（spec 未裁决，交 plan / 后续轮） | `PD-NDA-0xx` | F-36 `PD-ADN-0xx` |
| 复核订正（spec 阶段只读复核与 discovery 不一致者） | `COR-NDA-*` | F-35 `COR-IAN-*`；F-36 `COR-ADN-1~5` |
| 沿用 discovery | `Q-NDA-###` / `A-NDA-###` / `R-NDA-0xx` / `O-NDA-###` / `D1~D8` | — |
| 叶内编号（子规范） | `LG-NDA-x-###`（叶目标）/ `LNG-NDA-x-###`（叶非目标）/ `LD-NDA-x-###`（叶裁决） | F-36 叶 `LG-ADN-x-*` |

---

## 2. 上下文

### 2.1 立项来源（**编排指示逐字保留，不得转述走样**）

| # | 指示（逐字 / 提炼自 discovery §0.1 + 本次编排指示） | 本规范承载体 |
|---|---|---|
| **P1** | 「**产出机制**：next 工具（function calling），替换围栏块口述 + 正则解析」（作者口径①「没有调用 **next 工具**」） | §5.2 **TOOL**（FR-NDA-010~020）+ §5.3 **CAPTURE**（FR-NDA-021~028）+ §5.9 **FENCE**（FR-NDA-080~083）；裁决 = O-NDA-002 / 003 / 006 |
| **P2** | 「**触发范围**：无条件：配置 LLM ⇒ 对话结束即驱动」（作者口径①「**对话结束**如果 LLM 没有调用 next 工具」） | §5.5 **UNCOND**（FR-NDA-040~045）；裁决 = O-NDA-010 |
| **P3** | 「**未配置 LLM**：「去配置 LLM」确定性引导，不显示自由输入终端」（作者口径②） | §5.6 **UNCONF**（FR-NDA-050~056）；裁决 = O-NDA-007 / 008 |
| **P4** | 「**LLM 异常**：提醒补一次 → 系统兜底推荐配置新 LLM」（作者口径①） | §5.7 **NUDGE**（FR-NDA-060~066）+ §5.8 **ABNORMAL**（FR-NDA-070~076）；裁决 = O-NDA-004 / 005 / 007 |
| **P5** | 「**保留 F-36 正确资产**（5 道校验链 / 分层 / `tierOf` 单源 / `aiNext` 字段 / 兜底 / 已配置终端恒常驻 / R6 去重）」 | §5.4 **VERIFY-KEEP**（FR-NDA-030~036）+ §12 X-NDA-6；裁决 = discovery §7.1 |
| **P6** | 「**门禁重锚 + `parity` 新工具条目 + 体积分列预算**（距档 9,798 B）」 | §5.13 **GATE**（FR-NDA-130~137）+ §5.14 **VOL**（FR-NDA-140~145）；裁决 = O-NDA-012 / 013 |
| **P7** | 「**首开边界**（PD-ADN-001 转正判定）」 | §5.10 **OPEN**（FR-NDA-090~093）；裁决 = O-NDA-009 |
| **P8** | 「**命名 / 版本位**：F-37 / v0.11.4；ROADMAP 登记留收口」 | §1 元数据 · FR-NDA-001；裁决 = O-NDA-001 |
| **约束** | 「只写本 Feature 目录；不改生产代码 / 测试 / ROADMAP；routing.v1 = `local_or_compute → none`」 | §16 纪律表；本规范已遵守 |

> **口径声明（如实）**：作者**除 §0.1 裁决原话外**未给出进一步实现约束；P1~P8 均为**编排器转述的指示要点**。工具的精确 schema / 提醒机制 / 异常判定 / 兜底形态 / 围栏块去留 / 首开边界全部在 discovery 登记为 `O-NDA-001~014`，**本阶段由编排器批量裁决**（D1 / D2），逐条落位于 §11。**本规范不新增作者未表达的需求**。

### 2.2 现状事实核对（**spec 阶段只读复核，零运行时验证**）

#### A. F-36 现状（discovery §0.2 逐条比对）

| 面 | discovery 表述 | spec 复核 | 订正 |
|---|---|---|---|
| 产出契约 | 尾随 `next` 围栏块 + 严格 JSON（`ref-context.ts:52-59`） | ✅ 命中（`NEXT_CONTRACT_GUIDANCE`） | — |
| 产出条件 | 只并入「有引用」分支（`ref-context.ts:97-100`） | ✅ 命中（`valid.length === 0 ⇒ return ''`） | — |
| 解析 | SW 取最后 assistant 文本的最后一个 `next` 围栏块；三反引号正则 + `JSON.parse`（`ai-next.ts:58-87`） | ✅ 命中（`FENCE` / `lastNextFenceBody` / `parseAiNextItems`） | — |
| 校验链 | 5 道顺序即优先级（`ai-next.ts:98-158`） | ✅ 命中（`admitCandidate` 五判据 + `validateAiNext`） | — |
| 装配点 | SW `onFinish` → `chat-result{done, aiNext?}`（`service-worker.ts:976-977,1003-1008,1027-1043`） | ✅ 命中 | — |
| `ai-next` provider | 骑 `ref-action` 位；`priority:2` + `prepend:true`（`providers.ts:162-175`） | ✅ 命中 | — |
| 驱动者声明 | `ai-next` 第 12 行；`DRIVER_DECLS_SRC` 11→12（`providers.ts:247,267`） | ✅ 命中 | — |
| `free-input` 终端 | `when` 恒真（`providers.ts:205-221,217`） | ✅ 命中（未配置也显示） | — |
| 未配置提交 | `variant:'llm-unconfigured'` 零 token 路径（`service-worker.ts:945-956`） | ✅ 命中 | — |
| 未配置引导底座 | `llm.unconfigured` risk → `op.llm-config` chip（`sidepanel.ts:4167-4194`；`providers.ts:52-61`） | ✅ 命中（**已有确定性引导底座，被恒真终端稀释**） | — |
| 异常兜底 | LLM 连续失败 ⇒ `finish('llm-failed')`（`runner.ts:107-117`）；面板只 `maybeRecommend('idle')`（`sidepanel.ts:4140-4152`）；**无「配置新 LLM」推荐** | ✅ 命中 | — |
| **function calling 底座** | `LlmToolDef` / `WebCliToolCall`；OpenAI `tools`/`tool_calls` + Claude `tool_use`/`tool_result`（`llm.ts:23-75,82-197`）；插件已传 `deriveTools()`（`service-worker.ts:986-991`）；**`hooks.intercept` 缝**（`runner.ts:50-55,158-164`，注释逐字「next-actions 胶囊由此接入」）；**插件未 wire**（`service-worker.ts:1045-1059` 只 `onToolDone`） | ✅ 命中 | — |
| 工具注册面 | `router.register(entry)` / `deriveTools()`（`host.ts:295-333,338-364,546-548`） | ✅ 命中 | — |
| parity 门禁 | `host.deriveTools()` 名字集对 `baseline-catalog.json`；新增工具需 `pluginExtra`（reason + basis）（`parity.test.ts:168,183-248`） | ✅ 命中 | — |
| 门禁 `ai-next-candidate` | AI-N-1 钉死围栏块解析（`test/ai-next-candidate.test.ts:8,78`）；`CHROMIUM_GATES === 9` | ✅ 命中（**换机制必破，须改写**） | — |

#### B. 门禁 / 冻结面 / 体积（**引自已入库产物 + discovery 本轮只读实测，本轮未复跑**）

| 项 | 值 | 来源 |
|---|---|---|
| `sidepanel.js` 基线 | **604,602 B** | discovery §0.2-H（F-36 后 `dist` 实测字节相等；`test/size-baseline.ts:389`） |
| 档位 / 绝对上限 / 生效上限 | **614,400** / **675,840** / `floor(604,602 × 1.05) = `**`634,832`**（余量 **30,230 B**） | `size-baseline.ts:389`；discovery H-2 |
| **距档** | **9,798 B**（**薄**） | discovery H-2 |
| 冻结面 | `content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** | discovery H-5/H-6（F-36 全程未动） |
| 门禁基线 | `npm test` **1507**（**F-36 收口自报；discovery 本轮未复跑**）· `CHROMIUM_GATES === 9` | discovery H-3/H-4 |
| `zeroDiffFiles` | **恰 9 项**（内容哈希 pin）；`packages/web-cli-base/**` 零 diff 机核 | 上游（`insight-no-escalation`）；本轮引用 |
| 保护段（活跃 pin） | journey `[43484,59347)` / sha `7b309258…`；binding `[107780,115930)` / sha `be9ad0e9…` | 上游收口；本轮引用 |
| `authorConfirmation` | `pending-author-line`（**未闭合义务**） | 上游 |

#### C. 复核订正（**spec 阶段只读复核与 discovery 表述不一致者，逐条如实登记**）

| # | discovery 表述 | 复核事实 | 处置 |
|---|---|---|---|
| **COR-NDA-1** | discovery §0.2-H 记「`npm test` 基线 **1507**（F-36 收口自报，**本轮未复跑**）」 | **✅ 语义成立**（引自 F-36 `closeout.md`）；但本 Feature **spec 阶段零运行时验证** ⇒ 1507 **非**本轮实测值 | 本规范把 1507 标注为**引用值（未复跑）**；plan / tasks / build / validate 各自的**起点实测**为准；**不得**据引用值充当实测（承 F-36 `COR-ADN-1` 同构纪律） |
| **COR-NDA-2** | discovery G-1 记 F-36 plan「**方案 C：新增 tool-call**」落选（`plan.md:127-133`） | **✅ 成立**（方案 A 围栏块被推荐；方案 C 缺点 = 「新增工具面（`toolCount` / 工具目录 / parity 契约全动）；改回合内驱动语义」） | 本 Feature **正是**把「方案 C」转正（O-NDA-002/003）；其列出的**成本面**（parity / `toolCount` / 工具目录）**如实继承为本 Feature 的已知门禁成本**（FR-NDA-020 / §9.5），**不**视为阻却 |
| **COR-NDA-3** | discovery §0.2-A2 记围栏块解析在 `ai-next.ts:58-87` | **✅ 成立**（`FENCE` `:58` / `lastNextFenceBody` / `parseAiNextItems` 同段） | 替换时按**函数符号语义**逐条（`FENCE` / `lastNextFenceBody` / `parseAiNextItems` / `NEXT_CONTRACT_GUIDANCE`），不按单一行号；COR-NDA-3 显式登记 |
| **COR-NDA-4** | discovery §0.2-F6 记「插件未 wire `intercept`」 | **✅ 成立**（`hooks:{onToolDone}` `service-worker.ts:1045-1059`） | 接线时**只新增** `hooks.intercept`，**不动** `onToolDone` 既有语义；COR-NDA-4 显式登记 |
| **COR-NDA-5** | discovery §0.2-E3 记 `tierOf` 三档（`op-table.ts:173-187`） | **✅ 成立**（`layer==='sw'` ⇒ gesture；`hasConsent` ⇒ confirm；否则 auto） | 校验链接入按**派生式单源**读取（零第二档位表）；COR-NDA-5 显式登记 |

> **口径**：以上订正**不改变**任何 discovery 的问题判定 / 编号 / 风险等级；只把 spec 阶段只读复核到的**更精确事实**显式登记（承 F-34 `COR-SGO-*` / F-35 `COR-IAN-*` / F-36 `COR-ADN-*` 先例）。

### 2.3 目标用户

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 本 Feature 的应对（需求层） |
|---|---|---|---|
| **作者（唯一真实用户 + 唯一决策者）** | 真机侧栏（`platform.deepseek.com`）：一个**无引用**的普通对话回合刚结束 | F-36 的产出契约句只并入有引用分支（`ref-context.ts:97-100`）⇒ 无引用时 LLM 未被提示产 next ⇒ 退回确定性注册表。作者口径：「**对话结束**如果 LLM 没有调用 next 工具……」——「对话结束」是**无条件**的 | **触发范围无条件**（FR-NDA-040~045） |
| **作者（已配置 LLM，AI 偶尔没产 next）** | 回合结束，但 LLM 没走 `next` 工具 | 作者口径：「如果 LLM 没有调用 next 工具，**记得你要提醒 LLM，做好最后兜底**」——现状**无提醒机制**（`service-worker.ts:1027-1043` 只校验装配） | **提醒补一次**（FR-NDA-060~066） |
| **作者（已配置 LLM，但 LLM 坏了 / 异常）** | 某回合 LLM 连续失败（`finish('llm-failed')`）或始终给不出 next | 作者口径：「LLM **始终无法给你 next（LLM 坏了等情况）**，那就应该由**系统给出兜底的推荐，推荐用户配置新的 LLM 等操作**」——现状**无「配置新 LLM」兜底** | **系统兜底推荐**（FR-NDA-070~076） |
| **作者（未配置 / 冷启动场景）** | 未配 LLM：推荐卡末端仍显示「自由输入…」终端 | 作者口径②：「自由输入在没有 LLM 的场景下，**是不可行的**，只能给**确定性操作**」。现状 `free-input.when` 恒真 ⇒ 点了走零 token `llm-unconfigured` 返场 ⇒ **不可行** | **未配置确定性引导 + 自由输入分相**（FR-NDA-050~056） |
| **高级用户 / 维护者（AI Agent / 未来重构者）** | 需要回答「next 是怎么被产出的？」 | 现状答案 = **两套机制并存**：① 确定性注册表（12 行）② 文本围栏块口述 + SW 正则解析。F-36 plan 里 tool-call 被**显式否决** ⇒ 「next 工具」无处安放 | **单一产出通道 = `next` 工具（function calling）**（FR-NDA-010~028 / 080~083） |
| **审查者 / 验证者** | 需要证明「AI 候选不能触达特权 / 不能绕过 consent」且「兜底不回归」且「提醒不自杀成环」 | LLM 输出不确定 ⇒ 门禁无法直接断言输出；提醒机制有环风险 | S0''''（§5.11）+ 纯函数判据 + 注入反证族（FR-NDA-102 / 105）+ 有界性判据（FR-NDA-062 / 063） |

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）+ 唯一决策者**，与 v2~F-36 同一事实基础。**本规范不编造用户调研数据**；「用户原话」栏引用 discovery §0.1 作者裁决逐字与代码事实。

### 2.4 与上游 / 下游 Feature 的关系（**边界**）

| 关系 | 对象 | 口径 |
|---|---|---|
| **被修正对象（只读 + 显式取代）** | F-36 `specs-tree-web-cli-plugin-v55-f-ai-driven-next`（v0.11.3，父 + 两叶 `validated/completed`） | 四处机制偏颇**显式取代**（X-NDA-1~5）；其余正确资产**逐条保留**（X-NDA-6 / K-1~K-9）；**不回头改 F-36 产物**（N-NDA-005） |
| **直接上游（只读复用）** | F-35 `-v55-f-input-as-next`（v0.11.2）+ R8 `38565ac` | free-input 终端 / 零死端 floor / `op.turn` 槽 / `requestTurn(` 恰 1 / 法四 / 首开入口复用 `'idle'` —— **原样继承，零改写**（N-NDA-005 / N-NDA-008） |
| **底座（只读复用，硬红线）** | 基座 `packages/web-cli-base/**`（`llm.ts` function calling + `runner.ts` `hooks.intercept`） | **只复用，零改基座**（`insight-no-escalation.test.ts:147` 机核零 diff；N-NDA-007 / NG-NDA-005） |
| **底座（只读复用）** | F-34 / F-33 / F-32 / v4.5 / v4 | 法九 / `pressCandidate` + `driveAnsweredTurn` + 三档清分 + 护栏六常量 + 留痕三要素 / next 注册表契约 v2 + op 三档 + 12 kind + 零宿主 / 法一~法九 —— **零改写** |
| **唯一授权例外（显式取代）** | F-36 的产出机制 / 触发范围 / 未配置路径 / 异常兜底 | O-NDA-001 / X-NDA-1~5 = **机制校正**；**必须**走 supersession 台账 old→new（**不是**静默改写） |
| **明确不动** | F-29（A2A 候选，未立项未排期） | 保持原样不动（NG-NDA-020） |
| **下游** | @sddu-plan（依赖 `spec.md` 完成） → … → 两叶各自 build/review/validate | 父为轻量规范容器 |

---

## 3. 目标与非目标

### 3.1 目标 (Goals)

| # | 目标描述 | 判据锚 |
|---|---|---|
| **G-NDA-001** | **产出机制换轨**：next 候选由 LLM 通过 **`next` 工具（function calling）** 产出（工具 schema 保证结构）；经基座 **`hooks.intercept`** 缝捕获（返回合成 `ToolResult` 跳过 dispatch）；**不再**靠文本 `next` 围栏块口述 + 正则解析 | AC-NDA-002 / 003 / S0''''-1 |
| **G-NDA-002** | **触发范围无条件**：只要**配置 LLM**，**对话结束**即由 LLM 驱动（下发 `next` 工具）；不再只并入有引用分支、不再骑 `ref-action` 位独占 | AC-NDA-005 / S0''''-2 |
| **G-NDA-003** | **未配置 LLM ⇒ 确定性引导**：next = 确定性「去配置 LLM」引导（复用 `op.llm-config`）；**不显示自由输入终端**（自由输入无 LLM 不可行）；已配置时 free-input 终端**恒常驻**（R8/F-35 不回归） | AC-NDA-006 / 007 / S0''''-4 |
| **G-NDA-004** | **LLM 异常兜底链**：① LLM 未调用 `next` 工具 ⇒ **提醒补一次**（有界恰一次）② 仍失败/LLM 坏 ⇒ **系统兜底推荐「配置新的 LLM」**（确定性） | AC-NDA-008 / 009 / S0''''-3 / 7 |
| **G-NDA-005** | **保留 F-36 正确资产（零误伤）**：5 道校验链 / `admitCandidate` vs `pressDecision` 分层 / `tierOf` 单源 / `chat-result.aiNext` type-only 加法字段 / 确定性退居兜底 / 已配置终端恒常驻 / R6 同因去重 / 留痕零明文 —— 逐条保留 | AC-NDA-004 / 010 / §12 X-NDA-6 |
| **G-NDA-006** | **零改基座 / 零新增 kind / 冻结面零触碰**：`packages/web-cli-base/**` 零 diff；`KIND_SET` 40 / 12 kind / 零宿主；`content.js` / `pick-layer.js` / 判定链 / `zeroDiffFiles` 逐字不动 | AC-NDA-026 / 028 / 029 |
| **G-NDA-007** | **门禁强度不降 + 体积可管理**：`ai-next-candidate` 改写（等价或更强）；`parity` 新 `pluginExtra` 条目；`NEXTSTEP_PRIORITY` / `driver-timings` / `driver-quadruple` / `op-wiring` / `recommendation-sources` 逐条等价重锚；`assertionsRemoved = 0`；**先出分列预算**（B 列 SW 优先；距档 9,798 B） | AC-NDA-018~025 / §5.14 |
| **G-NDA-008** | **可机核（S0'''' 五支线）**：工具产出合法 / 提醒补一次成功 / 提醒仍失败→系统兜底 / 未配置确定性引导 / 首开确定性 —— 逐步可判（node + Chromium 双面） | AC-NDA-001 / §5.11 |

### 3.2 非目标 (Non-Goals)

| # | 明确不做 | 理由（来源） |
|---|---|---|
| **NG-NDA-001** | **改动 `pressCandidate` / `driveAnsweredTurn` 的自动按下或自动成回合语义** | v5.5 已闭环（discovery E-1/E-2）；本 Feature 只改「**产出** next 候选」的机制与触发，按下 / 成回合 **diff=0** |
| **NG-NDA-002** | **改动三档清分档位定义（`tierOf` / `OP_TIER_TABLE` / `hasConsent`）** | 派生式单源（E-3）；本 Feature 只**接入**该闸 |
| **NG-NDA-003** | **改动护栏六常量阈值（`guard.ts`）/ 新增第二份阈值** | 单源（E-4）；本 Feature 只接线 / 复用 |
| **NG-NDA-004** | **改动 LLM 回合内的其它工具 / 命令驱动语义** | v5.5 已建；本 Feature 只**新增一个 `next` 工具**（结构化产出通道），不动既有工具行为 |
| **NG-NDA-005** | **改动基座 `packages/web-cli-base/**`** | 硬红线（`insight-no-escalation.test.ts:147` 机核零 diff）；本 Feature **只复用**基座的 function calling + `hooks.intercept` 缝 |
| **NG-NDA-006** | **F-36 / F-35 / F-34 / F-33 / F-32 / R8 / v4.5 / v4 / v5 / v5.5 产物改写** | 并列新主题（**唯一授权例外 = X-NDA-1~5 的显式取代登记**） |
| **NG-NDA-007** | **`src/content/**`（`content.js` 177,076 B）/ `pick-layer.js`（34,358 B）语义改动** | 字节冻结红线（零容差） |
| **NG-NDA-008** | **判定链（`security/policy.ts` / `auto-authorize.ts`）与 `zeroDiffFiles`（9 项）冻结面触碰** | 硬底线（内容哈希 pin） |
| **NG-NDA-009** | **新增消息 kind（第 41 项）/ 新增卡 kind（第 13 种）/ 新宿主** | 零新增 kind / 零宿主纪律（F-36 已用 type-only 加法字段达成） |
| **NG-NDA-010** | **特权 op（`op.authorize` / `op.perm.request`）发起方式 / AI 代答 consent** | 红线：特权 op 恒 `gesture`、AI 不可代答 |
| **NG-NDA-011** | **法八（零明文）放宽** | `law8` 门禁必绿；候选文本 / **工具参数** / 留痕不得把明文写进流内 payload / digest / 审计 / DOM 四面 |
| **NG-NDA-012** | **`next` 工具执行任何真实页面动作 / 触达真实写** | 它是**纯结构化产出通道**（同 `ask-user` 纯协议工具先例）；捕获后返回**合成** `ToolResult`，dispatch 被跳过 |
| **NG-NDA-013** | **双产出通道（围栏块与工具并存）** | O-NDA-006 裁决 = **替换**（单一产出通道，避免双通道漂移）；若 plan 认为需过渡兼容 ⇒ 显式登记 `PD-NDA-*` + 门禁 |
| **NG-NDA-014** | **未配置 LLM 时显示 / 保留自由输入终端** | 作者口径②：自由输入无 LLM **不可行**；未配置只给确定性操作 |
| **NG-NDA-015** | **破坏「已配置 ⇒ free-input 终端恒常驻」（R8 / F-35 不回归）** | 未配置分相**不得**波及已配置场景（R-NDA-003，**高**） |
| **NG-NDA-016** | **提醒机制无界 / 自触发环 / 绕过 `proactivity` 护栏** | R-NDA-002（**高**）；提醒**恰一次**，越限直接进系统兜底 |
| **NG-NDA-017** | **首开（open / ready）AI 化** | O-NDA-009 裁决 = 保持首开确定性；`PD-ADN-001` **不转正**，登记 `PD-NDA-001` |
| **NG-NDA-018** | **「LLM 坏了」新写第二词表 / 与 `llm.unconfigured` 词表漂移** | R-NDA-010；异常判定复用既有失败面 + 「无工具调用」，分相不新写词根 |
| **NG-NDA-019** | **断言删除 / 降级 / 保护段静默改写** | 替换必须**等价重锚**（断言力不降、计数只增）并留台账（N-NDA-012 / N-NDA-024） |
| **NG-NDA-020** | **F-29（A2A 候选）状态变更 / 外部竞品调研** | 未立项未排期 / O-NDA-011 裁决 = 不需要（**不得**据此外推） |
| **NG-NDA-021** | **在 plan 之前排「全量落地」** | R-NDA-013 / v5 教训（plan Σ 低估 2.8×）；先出分列预算再排落地 |
| **NG-NDA-022** | **把提醒补一次实现成「无界重试 / 无限续轮」** | R-NDA-002；有界恰一次 |

---

## 4. 用户故事

| # | 作为… | 我想要… | 以便… |
|---|---|---|---|
| **US-NDA-001** | 作者 | 回合结束时，next 候选由 LLM 通过**工具调用**结构化产出（而不是在文本里贴一个靠提示词软约定的块） | 产出稳定、遵守 schema、不因模型不遵从提示词而丢候选 |
| **US-NDA-002** | 作者 | **任何**对话回合（有引用或无引用）结束后都由 LLM 驱动 next | 不再「只有带引用才有 AI 建议」，无引用日常问答也有下一步 |
| **US-NDA-003** | 作者 | LLM 偶尔忘了产 next 时，系统**提醒它补一次** | 不白丢一次 AI 建议的机会 |
| **US-NDA-004** | 作者 | LLM **始终给不出**（坏了 / 异常）时，系统**明确告诉我该去配置新的 LLM** | 不卡在无知觉的死端，知道该做什么修复 |
| **US-NDA-005** | 作者 | **没配 LLM 时**，界面只给**确定性操作**（去配置 LLM），**不要**给我一个点了没用的「自由输入」 | 不被引导点死路 |
| **US-NDA-006** | 作者 | **已配置 LLM 时**，自由输入终端**仍然在**（R8 / F-35 成果不回归） | 流内输入即 next 的能力不被误伤 |
| **US-NDA-007** | 作者 | AI 给多个建议时**不刷屏**，最多一卡几项 | 推荐区仍是「引导」而不是「列表」 |
| **US-NDA-008** | 作者 | AI **永远不能**替我做需要我确认 / 授权的事 | 我的 consent 与特权动作不被 AI 代答 |
| **US-NDA-009** | 维护者 | 新增一条「AI 产出的 next」只改 **一个工具注册 + 一处 `intercept` 捕获 + 一个校验器** | 扩展点固定，不靠碰巧；「next 是怎么被产出的」只有一个答案 |
| **US-NDA-010** | 审查者 | 能用一条**可机核样板**证明：工具产出的合法候选被采纳、非法候选被拦且留痕、提醒有界、兜底可达、确定性不回归 | 不靠人工观感判断「这次机制换对了」 |

---

## 5. 功能需求 (FR)

> 编号 `FR-NDA-###`；每条**可测试**；P0 = 本 Feature 必需，P1 = 必需但可在同叶内后置，P2 = 记录性（门禁 / 台账）。**FR → 叶 覆盖矩阵见 §14.3。**

### 5.1 GOV — 立案、结构与纪律（横切）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-001** | 本 Feature 登记为 **F-37 / v0.11.4**（patch 跟进轮），目录名 `specs-tree-web-cli-plugin-v55-f-next-drive-accuracy`；**ROADMAP 零 diff**（登记由收口承接） | §1 元数据齐备；`git diff --stat -- .sddu/specs-tree-root/ROADMAP.md` = 0 | P0 |
| **FR-NDA-002** | 父 Feature = **轻量规范容器**（不承接 build/review/validate、不产父层 `tasks.json`）+ **2 叶（依存序串行，`nda-1 → nda-2`）**；叶目录**直接嵌套**（`specs-tree-nda-1-*` / `-nda-2-*`），**禁止 `children/` 中间层** | §14.1/§14.2 结构裁决齐备；state.json `childrens` 恰 2 项 | P0 |
| **FR-NDA-003** | 纪律：`.sddu/**` 只写本 Feature 树；spec 阶段**零改动** `src/` `test/` `dist/` `design/` `docs/` 与 `ROADMAP.md` | `git status --short` 仅本 Feature 目录 | P0 |
| **FR-NDA-004** | 命名空间声明（§1.1）齐备；**断言零删除零降级、门禁计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 每条 AC 有唯一 ID；门禁对账表（§9.5）无减少项 | P0 |
| **FR-NDA-005** | 红线编制 **N-NDA-001~030** 逐条承载 + **X-NDA-1~12** 逐条等价重锚 / 保留 / 取代登记（§12 / §13）；**未发生的取代须如实登记「未发生」** | §12 / §13 无遗漏；台账条目与 X 项一一对应 | P0 |
| **FR-NDA-006** | **主流程零扩张**：**不改基座**；`pressCandidate` / `driveAnsweredTurn` / `op.turn` 槽 / `turn-queue.ts` 语义 **diff = 0**；`requestTurn(` 恰 1 / `nextAfterSettle` 1 定义 10 调用点 **等价重锚**（提醒续轮若新增调用点 ⇒ 计数只增 + 说明） | `test/op-wiring.test.ts` / `turn-arbitration` / `op-three-tier` 绿 + 逐条反证；基座零 diff | P0 |
| **FR-NDA-007** | **编排裁决落位**：O-NDA-001~014 **全部** `ruled` 并逐条落位 §11（DC-NDA-001~014）；**开放点不得在 spec 前被顺手定下** | §11 全 `ruled`；§8 只剩 `PD-NDA-*` | P0 |

### 5.2 TOOL — `next` 工具（function calling）产出通道（**核心 1**，叶1）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-010** | **唯一产出载体 = `next` 工具**：注册 `LlmToolDef{name:'next',description,parameters}`（基座 `llm.ts:61-75` 契约）；插件侧注册（`host.ts` 工具注册面或等价模块）⇒ **出现在 `deriveTools()`**；**替换**文本围栏块口述 | 工具定义出现在 `deriveTools()` 名字集（可判）；围栏块路径不再承载产出（FR-NDA-080~083） | P0 |
| **FR-NDA-011** | **工具 schema 形态（口径 1）**：`parameters = {type:'object', required:['candidates'], additionalProperties:false, properties:{candidates:{type:'array', minItems:0, maxItems:3, items:{type:'object', required:['opId','label'], additionalProperties:false, properties:{opId:{type:'string'}, label:{type:'string'}, ref:{type:'string'}, params:{type:'object'}}}}}}`；`opId` 可带 **`enum`（由 `OP_IDS` 单源派生，软约束）**；`maxItems ≤ MAX_CHIPS_PER_CARD = 3` | schema 结构与既有 `AiNextCandidate{opId,label,ref?,params?}` **同构可判**；`maxItems` = 3 逐字；`enum` 与 `OP_IDS` 同源（反证：第二份 op 清单 ⇒ 必红） | P0 |
| **FR-NDA-012** | **schema 是软约束，校验链是权威**：`enum` / `maxItems` 只辅助模型；**在册 / 档位 / ref / param 的权威判据 = 运行时 5 道校验链**（FR-NDA-030~036），**不得**以 schema 通过替代校验链 | 反证：构造 schema 合法但运行时非法（如 `params` 越界）的候选 ⇒ **必拦** | P0 |
| **FR-NDA-013** | **`description` 约束**：逐字含三项约束——① 仅**回合结束**（回答完全结束后）调用一次；② `opId` 必须是系统已注册动作；③ **不执行任何页面操作**（纯产出通道） | `description` 文本可判（三项约束各有一句）；**零明文**（不得写正文 / 凭据） | P0 |
| **FR-NDA-014** | **纯协议工具（不触达真实写）**：`next` 工具无执行体 / 不 dispatch；捕获后返回**合成 `ToolResult`（ok）**；**不得**触达页面动作 / 网络 / 时钟 | 反证：「`next` 工具触达真实写 ⇒ 必红」；合成 `ToolResult` 可判 | P0 |
| **FR-NDA-015** | **无条件下发**：**配置 LLM ⇒ 回合结束即下发 `next` 工具**（工具面**始终**含 `next`）；**不再**只在有引用分支（`refContextSegment` 无引用 ⇒ `''` 的路径不再拦产出提示） | 反证：「无引用回合 ⇒ 工具面仍含 `next`」（可判）；旧「只并入有引用分支」不再存在（FR-NDA-041） | P0 |
| **FR-NDA-016** | **零新增 kind / 零宿主**：候选仍经**既有 `chat-result.aiNext` type-only 加法字段**回面板（K-4）；`KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` 逐字不动 | `messaging` / `stream-model` / `host-registry` 断言绿；反证「新增 kind ⇒ 必红」 | P0 |
| **FR-NDA-017** | **零新增 LLM 往返（主链）**：工具调用发生在**同一次回合内**（基座 agent 循环），非新增调用；主链不新增网络 | 反证「主链新增 `fetch(` ⇒ 必红」；`recommendation-sources` ④ 绿 | P0 |
| **FR-NDA-018** | **未配置 ⇒ 不下发 `next` 工具**：未配 LLM 时不产生工具面候选（零产出、零网络）；面板走确定性（FR-NDA-050~056） | 反证：「未配置 ⇒ 工具面不得含 `next` 产出」；零网络调用断言 | P0 |
| **FR-NDA-019** | **载荷只增不改**：既有 `chat-result` 字段（`variant`/`text`/`retrying`/`tool`/`ok`/`ms`/`targetSelector`）**逐字保留**；`aiNext` **缺席时**面板行为与现状逐字一致 | 字段穷举对比 + 「新字段缺席 ⇒ 现状行为」断言 | P0 |
| **FR-NDA-020** | **`parity` 工具目录门禁处置**：新增 `next` 工具 ⇒ `test/parity/baseline-catalog.json` 的 `pluginExtra` 新增条目（**reason + basis 非空**）；`toolCount` 增量如实登记；**断言零删除** | `parity.test.ts` 绿；新条目可判；反证「无 `pluginExtra` 条目 ⇒ 必红」 | P0 |

### 5.3 CAPTURE — `hooks.intercept` 捕获与装配（**核心 1**，叶1）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-021** | **接线基座 `hooks.intercept` 缝**（`runner.ts:50-55,158-164`）：`runChatTurn` 的 `hooks` **新增** `intercept`（**不动**既有 `onToolDone`）；探针在 **dispatch 前** | `hooks.intercept` 存在可判；既有 `onToolDone` 语义逐字不变（COR-NDA-4） | P0 |
| **FR-NDA-022** | **捕获判据**：`tc.name === 'next'`；参数经基座 `parseToolArguments` 解析；解析失败 ⇒ 视为「未产出」（**不抛错中断回合**） | 反证「`tc.name` 非 `next` ⇒ 不捕获」；解析失败不中断断言 | P0 |
| **FR-NDA-023** | **跳过真实 dispatch**：捕获后返回**合成 `ToolResult`**（ok）；真实 `dispatch` 被跳过；**零改基座**（只复用缝） | 反证「捕获后仍执行真实 dispatch ⇒ 必红」；基座零 diff 机核 | P0 |
| **FR-NDA-024** | **执行位置 = SW 侧（B 列优先）**：捕获 / 解析 / 5 道校验 / 装配全在 `background`（SW 已持有 `op-table` 镜像 + LLM 输出）；面板只接收**已校验**候选并渲染 | 归因表可判（捕获 / 校验在 B 列）；panel `sidepanel.js` A 列增量如实分列（§5.14.1） | P0 |
| **FR-NDA-025** | **同回合多次 `next` 调用的合并口径**：一个回合内 `intercept` 捕获到**多次** `next` 调用 ⇒ **取最后一次**（或等价确定口径，plan 裁决）；**总候选 ≤3**（截断）；合并 / 去重**单源**（不新增第二合并器） | 反证「多次调用 ⇒ 候选 ≤3 且口径唯一（非并集漂移）」；口径可判 | P1 |
| **FR-NDA-026** | **捕获结果装配到 `chat-result{done, aiNext?}`**（SW `onFinish`）**替换**围栏块解析路径；`aiNext` 载荷面**保持**（K-4） | 装配点可判；旧解析路径不再装配（FR-NDA-081） | P0 |
| **FR-NDA-027** | **候选接受后仍经既有 5 道校验**（FR-NDA-030~036）**先于**任何装配 / 渲染；**未校验候选不得进 chips** | 反证「未校验候选被渲染 / 被按下 ⇒ 必红」（N-NDA-021） | P0 |
| **FR-NDA-028** | **留痕（产出者声明）**：`driver=<id> \| timing=idle \| evidence=<工具参数字段名>`（三要素，**只含字段名不含值**）+ `blocked=<reason>`；**零明文**；`evidence` 与工具机制**同源** | DQ-1/DQ-3 双向包含保持；留痕逐行断言；法八绿 | P0 |

### 5.4 VERIFY-KEEP — 保留 F-36 校验链 / 判定分层 / 三档（**核心 5**，叶1）

> **本节 = 「保留资产」的显式承载**（Q-NDA-006 / discovery §7.1 K-1~K-3）。换机制时，输入从「围栏块解析项」变为「工具参数项」，**校验链本身整体保留**。

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-030** | **5 道校验链整体保留**：① opId 在册 → ② 三档清分 → ③ ref 有效 → ④ param 在 `AskSpec` 内 → ⑤ 越界/非法**丢弃 + 留痕**；**顺序即语义优先级**；校验器为**纯函数**（输入 = 候选 + 既有真值事实；输出 = 接受 / 拒绝 + 原因闭集） | 校验器纯函数可判（无 DOM / 时钟 / IO）；五判据逐一可判；门禁可直接调用 | P0 |
| **FR-NDA-031** | **① opId 在册**：`opId` 必须 ∈ 注册表 **9 op**（`OP_IDS` / `opDescriptor`）；未知 op ⇒ **拒绝 + 留痕**（复用 `unknown-op` 词表） | 反证「幻觉 op（如 `op.ghost`）⇒ 必拦 + `blocked=unknown-op`」 | P0 |
| **FR-NDA-032** | **② 三档清分（复用 `tierOf` 单源）**：档位**必须**取自 `tierOf`（`op-table.ts:173-187`），**零手写档位表 / 零第二阈值**；`gesture`（`op.authorize`/`op.perm.request`）**恒拒绝（连提案都拒）** | 反证「第二份档位表 ⇒ 必红」；反证「AI 产 `gesture` 候选 ⇒ 必拦 + `blocked=tier`」 | P0 |
| **FR-NDA-033** | **②' `confirm` 可提案，不可自动按下**：`op.llm-config` / `op.revoke` 的候选**可见可点**，但提交后**必须**走既有 consent 卡由用户作答；**AI 不可代答 / 不可自动按下** | 反证「AI 代答 `confirm` consent ⇒ 必红」；`admit=true ∧ press=blocked:tier` 可判 | P0 |
| **FR-NDA-034** | **③ `ref` 存在且有效**：候选若带 `ref`，该引用必须**存在且有效**（读既有 `ref-store`，**零新真值源**）；不存在 / 已失效 ⇒ **拒绝 + 留痕** | 反证「越界 ref ⇒ 必拦 + 留痕」；引用判定 3 结果语义不变 | P0 |
| **FR-NDA-035** | **④ `param` 在 op 参数 schema 内**：候选 `params` 必须落在该 op 的 `params: AskSpec` 内；越界 ⇒ **拒绝 + 留痕** | 反证「param 越界 ⇒ 必拦」；`AskSpec` 比对可判 | P0 |
| **FR-NDA-036** | **⑤ 丢弃 + 留痕（不静默接受 / 不死端）** + **判定分层保持**：非法候选**丢弃**并写**可读行**（`blocked=<reason>`，**零明文**）；`admitCandidate`（接受层：`auto`/`confirm` 接受、`gesture` 拒）与 `pressDecision`（按下层：仅 `auto`，**语义 diff=0**）**保持分层**，共享 `tierOf` 单源 | 四类非法各有一条可读留痕 + 非法候选**不渲染**；分层真值表可判；反证「把 `confirm` 也拒 / 把 `gesture` 放行 ⇒ 必红」 | P0 |

### 5.5 UNCOND — 触发范围无条件（**核心 2**，叶1）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-040** | **无条件触发**：只要**配置 LLM**，**对话结束**（`chat-result` `variant='done'` / `'error'` 结题时）即由 LLM 驱动 —— **不**以「有引用 / `ref-action` 命中」为前提 | 反证：「无引用回合结束 ⇒ `next` 工具仍在工具面且被驱动」；「未配置 ⇒ 不驱动」 | P0 |
| **FR-NDA-041** | **产出提示不再限定有引用分支**：`refContextSegment`（`ref-context.ts:97-100`）不再承载「是否产 next」的开关；**`NEXT_CONTRACT_GUIDANCE`（`:52-59`）停止使用**（围栏块提示句取消） | 反证「无引用 ⇒ 不得因 `valid.length === 0` 而丢失产出提示」；旧提示句不再存在可判 | P0 |
| **FR-NDA-042** | **规则位等价重锚**：`ai-next` provider **不再骑 `ref-action` 位独占**（无条件触发后该位在无引用时为假）；改为 **AI 驱动独立通道**（新规则位或「AI 候选优先于全部规则」的独立入口）；`NEXTSTEP_PRIORITY` **等价重锚**（X-NDA-5；**若破「恰 4」须显式取代 + 台账 + 密度重锚**） | 规则位判据可判；反证「无引用时 AI 候选无处落 ⇒ 必红」；`recommendation-sources` 重锚而非删除 | P0 |
| **FR-NDA-043** | **时机仍复用既有 `'idle'`**：**不新增触发词**（`DRIVER_TIMINGS` 恰 5 / 旧 4 逐字不动）；本 Feature 只改**触发条件**（有引用 → 无条件），不改**时机词** | `driver-timings` DT-2/DT-3 绿；反证「新增第 6 触发词 ⇒ 必红」 | P0 |
| **FR-NDA-044** | **已配置但 AI 未产出 / 非法被拦 ⇒ 确定性兜底**（保留 K-5）：确定性注册表产卡；**不**因「无条件」而取消兜底 | 反证「删兜底 ⇒ 无候选」；三情形（未产出 / 非法 / 提醒用尽）各有确定性接管断言 | P0 |
| **FR-NDA-045** | **无死端**：任何路径（未配 / AI 未产出 / 非法被拦 / 提醒用尽 / LLM 坏）都**必须**有可达 next | `no-dead-end` **只增必绿**；反证「构造 AI 失败且兜底缺失 ⇒ 必红」 | P0 |

### 5.6 UNCONF — 未配置 LLM 确定性引导（**核心 3**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-050** | **未配置 ⇒ 系统性确定性引导**：未配 LLM 时，next = **确定性「去配置 LLM」引导**（复用既有 `llm.unconfigured` risk → `OPS_RECOVERY_ROWS` → `op.llm-config` op-direct chip 底座）；引导须**明确、单一、可行** | 「未配置 ⇒ `op.llm-config` 引导可达」断言；反证「未配置无引导 ⇒ 必红」 | P0 |
| **FR-NDA-051** | **未配置 ⇒ 不显示自由输入终端**：`free-input` 终端在**未配置**时不显示（自由输入无 LLM 不可行；`service-worker.ts:945-956` 零 token 返场证明其不可行） | 反证「未配置仍显示自由输入 ⇒ 必红」；未配置推荐卡无 `.next-terminal` 断言 | P0 |
| **FR-NDA-052** | **已配置 ⇒ free-input 终端恒常驻（R8 / F-35 不回归）**：`configured === true` 时任何推荐卡**必须有** `.next-terminal`（恒最末；`data-act='free-input'`；非 `.next-chip`、不进 `MAX_CHIPS_PER_CARD`） | `r8-open-next-entry` / `free-input-next` 判据绿；反证「已配置删终端 ⇒ 必红」 | P0 |
| **FR-NDA-053** | **分相判据单源**：新增「**是否配置 LLM**」**单源判据**（`configured`）；`free-input.when` 由**恒真**改为按该判据分相；**不写第二份偏好键 / 第二份配置真相**（复用既有配置读取单源） | 反证「第二份配置判据 / 第二偏好键 ⇒ 必红」；分相两相均可判（非恒真） | P0 |
| **FR-NDA-054** | **引导形态 = 确定性 op 驱动**：复用 `op.llm-config`（既有 `confirm` 档配置引导 op）；`op-direct` chip（非 AI 产出）；点击 ⇒ 既有配置流程 | 反证「未配置引导依赖 LLM ⇒ 必红」；点击路径可达断言 | P0 |
| **FR-NDA-055** | **不死端（未配置相）**：未配置路径**必有可达 next**（= 去配置 LLM 引导）；无「未配置且无 next」终态 | `no-dead-end` 绿；反证「未配置无引导 ⇒ 必红」 | P0 |
| **FR-NDA-056** | **不破既有零 token 路径**：未配置提交仍走 `variant:'llm-unconfigured'`（**不发起 provider 调用**/零 token）语义不变 | 零 token / 零网络断言保持；反证「未配置发起 provider 调用 ⇒ 必红」 | P0 |

### 5.7 NUDGE — 提醒 LLM 补一次（**核心 4①**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-060** | **提醒判定**：已配置 LLM ∧ 回合**正常结束**（`completed`）∧ 本回合 **`intercept` 未捕获任何 `next` 工具调用** ⇒ 触发**提醒** | 判定可判（三类条件齐）；反证「捕获到 `next` 却仍提醒 ⇒ 必红」 | P0 |
| **FR-NDA-061** | **提醒机制（口径 2）**：插件侧发起**恰一次**带 nudge 的**续轮**（同 `runChatTurn` 会话 / 同 provider cfg）；nudge 内容 = 「你还没有调用 `next` 工具，请现在调用一次给出下一步候选；若确无建议，调用 `next` 并给空 `candidates`」 | 续轮可判（nudge 文本 + 发起点）；反证「无续轮 ⇒ 必红」 | P0 |
| **FR-NDA-062** | **有界（恰一次）**：**每回合至多提醒 1 次**（`nudgeUsed` 事件作用域单布尔）；提醒轮**仍无产出 / 非法全拦 / 提醒轮本身失败** ⇒ **不再提醒**，直接进系统兜底（§5.8） | 反证「提醒两次 ⇒ 必红」；有界性判据（非恒真，可 FAIL） | P0 |
| **FR-NDA-063** | **防环**：提醒轮**不得**再触发提醒；**不得**绕过 `proactivity` 护栏（不得增加自动成回合次数）；提醒是**回合内续轮**，**不得**新增 `nextAfterSettle` 调用点 | 反证「自触发环（无限续轮）⇒ 必红」；护栏计数断言不变 | P0 |
| **FR-NDA-064** | **计数等价重锚**：若提醒续轮新增 `requestTurn(` / `maybeRecommend` 调用点 ⇒ **等价重锚**（计数只增 + 说明 + `expectFailPattern` 更新）；若复用同回合续轮通道 ⇒ `requestTurn(` 恰 1 保持 | `op-wiring` / `driver-timings` 判据可 FAIL；反证「删判据 ⇒ 必红」 | P0 |
| **FR-NDA-065** | **提醒轮仍失败 ⇒ 进系统兜底**：提醒后仍无合法候选 ⇒ **不再重试**，走 §5.8 系统兜底链 | 端到端：提醒 → 无产出 → 系统兜底可达断言 | P0 |
| **FR-NDA-066** | **提醒不得成为第二产出通道**：提醒只复用 `next` 工具 / 同一 5 道校验链；**不得**新增解析器 / 第二校验器 | 反证「提醒路径新增第二解析 / 校验器 ⇒ 必红」 | P0 |

### 5.8 ABNORMAL — LLM 异常判定 + 系统兜底推荐（**核心 4②**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-070** | **异常判定闭集（口径 3）**：`no-tool-call`（回合正常结束但无 `next` 工具调用，且提醒已用尽）/ `llm-failed`（`finish('llm-failed')` / 提醒轮失败）/ `all-blocked`（捕获到候选但 5 道校验链全部拒绝，`accepted = []`）—— 三情形可判 | 三情形逐一断言（真值表可判、非恒真）；判定单源 | P0 |
| **FR-NDA-071** | **词表不新写 / 与 `llm.unconfigured` 分相**：异常判定**复用**既有失败面（`finish` 原因）+「无工具调用」；**「未配置」（`llm.unconfigured`）与「配置了但异常」分相**；**不新写第二词根**（若 plan 认为须新 provider ⇒ 走 DQ-1/DQ-3 双向登记 + 显式取代） | 反证「与 `llm.unconfigured` 词表混同 ⇒ 必红」；两相可判（非恒真） | P0 |
| **FR-NDA-072** | **系统兜底推荐形态（口径 4）**：复用 **`op.llm-config`**（既有配置引导 op，`confirm` 档，`op-table.ts:120`）；**文案强调「配置新的 LLM」**（切换 / 重配），与未配置引导（首次配置）**共享 op、文案分相** | `op.llm-config` 兜底 chip 可达断言；文案分相可判（两句可区分） | P0 |
| **FR-NDA-073** | **兜底触发**：① 提醒用尽仍无合法候选 ② LLM 坏（`llm-failed`）⇒ **系统给出兜底推荐**（确定性，不依赖 LLM） | 反证「异常时无兜底推荐 ⇒ 必红」；兜底推荐确定性可判 | P0 |
| **FR-NDA-074** | **兜底必可达（零死端）**：异常相推荐卡**必有**可达 next（兜底推荐 + 已配置相 free-input 终端）；**不**出现「LLM 坏了 ⇒ 面板无下一步」 | `no-dead-end` 绿；反证「异常且兜底缺失 ⇒ 必红」 | P0 |
| **FR-NDA-075** | **零第二阈值 / 零第二词表**：轮数上限（提醒 1 次）**零第二份阈值**（复用既有护栏单源）；异常词表**零新写**（分相复用） | 源码扫描「无第二份阈值 / 词表」；反证「新增第二份 ⇒ 必红」 | P0 |
| **FR-NDA-076** | **兜底推荐发起方式不破红线**：`op.llm-config` 为 `confirm` 档，**由用户作答**；AI **不代答 / 不自动按下** | 反证「AI 代答兜底推荐 consent ⇒ 必红」；特权 / consent 红线保持 | P0 |

### 5.9 FENCE — 围栏块通道去留（**附带 1**，叶1）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-080** | **替换（单一产出通道）**：围栏块解析（`FENCE` / `lastNextFenceBody` / `parseAiNextItems`，`ai-next.ts:58-87`）**被 `next` 工具捕获替换**；**不做双通道并存**（避免双通道漂移） | 围栏块路径不再产出候选可判；反证「围栏块仍能产出 ⇒ 必红」 | P0 |
| **FR-NDA-081** | **停用围栏块提示与解析**：`NEXT_CONTRACT_GUIDANCE`（`ref-context.ts:52-59`）停止注入；`FENCE` 正则 / `lastNextFenceBody` / `parseAiNextItems` 停止承载产出；**保留** `admitCandidate` / `validateAiNext` 校验链（FR-NDA-030~036） | 源码层面「提示句不再注入 + 解析函数不再被调用」可判；校验链仍在且被调用 | P0 |
| **FR-NDA-082** | **门禁 `ai-next-candidate` 改写（等价或更强）**：AI-N-1（钉死围栏块解析，`test/ai-next-candidate.test.ts:8,78`）**不得**静默删除 / 降级；改写为钉死「工具调用捕获 + 5 道校验链 + 判定分层 + 提醒有界」；**断言数只增不减**，`assertionsRemoved = 0` | 门禁前后断言对账（无减少项）；反证「删 AI-N-1 而不补等价判据 ⇒ 必红」 | P0 |
| **FR-NDA-083** | **「零新 LLM 往返」契约仍成立**：工具调用在**同一次回合内**（非新增往返）；若 plan 认为需要过渡期双通道兼容 ⇒ **显式登记 `PD-NDA-*` + 门禁 + 台账**，**不得**静默保留 | 主链零新增网络断言绿；兼容诉求有 PD 承载（否则 NG-NDA-013） | P0 |

### 5.10 OPEN — 首开（open / ready）边界（**附带 4**，叶2）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-090** | **首开保持确定性**：`maybeRecommendOpenEntry`（`sidepanel.ts:2279-2286`）在 `authorized ∧ configured` 时仍走**确定性**路径（free-input 终端 + capability-discovery）；**不**由 AI 产初始 next | 首开判据绿（终端在场；无 LLM 依赖）；反证「首开走 AI ⇒ 必红」 | P0 |
| **FR-NDA-091** | **未配置首开由「去配置 LLM」确定性引导承接**：未配置首开（冷启动）⇒ 确定性「去配置 LLM」引导（FR-NDA-050）；**不显示自由输入**（FR-NDA-051） | 未配置首开有引导可判；反证「未配置首开无引导 ⇒ 必红」 | P0 |
| **FR-NDA-092** | **首屏零 LLM 往返依赖**：首屏可达性**不**依赖网络 / 延迟；首开入口复用既有 `'idle'`（R8-2 逐字） | R8 入口判据不降；「无网络 ⇒ 首屏仍有引导 / 终端」断言 | P0 |
| **FR-NDA-093** | **让位 `firstRun` 语义保持 + PD 登记**：`firstRunCard.visible === !(configured ∧ authorized)`（**零双卡**）逐字不动；**不做首开 AI 化**（`PD-ADN-001` **不转正**，登记为 `PD-NDA-001`） | 零双卡判据绿；`PD-NDA-001` 登记存在 | P0 |

### 5.11 S0'''' — 首验收场景机器化（**地位 = F-36 之 S0''' / F-35 之 S0'' / F-34 之 S0′ / v5.5 之 S0**）

> **本 Feature 的首验收场景（对作者裁决的机核化）**：**已配置 LLM ⇒ 回合结束由 LLM 通过 `next` 工具结构化产出候选 ⇒ 经 5 道校验 ⇒ 注入 chips**；**LLM 忘了 ⇒ 提醒补一次**；**LLM 坏了 / 仍给不出 ⇒ 系统兜底推荐「配置新的 LLM」**；**未配 LLM ⇒ 确定性「去配置 LLM」引导（不显示自由输入）**；**首开保持确定性**。

```
【S0'''' 已配置 LLM · 主线 A（工具调用产出合法候选）】
回合结束（chat-result variant='done'，openAsks===0）
  → 基座 agent 循环中 LLM 调用 next 工具
  → hooks.intercept 捕获（tc.name==='next'）⇒ 返回合成 ok ToolResult ⇒ 跳过真实 dispatch
  → 5 道校验：① opId 在册 → ② tierOf 三档（gesture 恒拒）→ ③ ref 有效 → ④ param 在 AskSpec 内 → ⑤ 丢弃+留痕
  → SW 装配 chat-result{done, aiNext}（替换围栏块解析）
  → 面板注入 → AI 驱动独立通道 → chips（≤3）
  → 已配置 ⇒ free-input 终端恒常驻（恒最末）

【S0'''' 已配置 LLM · 支线 B（LLM 未调用 next 工具 ⇒ 提醒补一次 ⇒ 成功）】
回合完成（completed）且 intercept 未捕获 next ⇒ 插件侧恰一次 nudge 续轮
  → LLM 补调 next 工具 ⇒ 捕获 ⇒ 校验 ⇒ 装配 chips（≤3）

【S0'''' 已配置 LLM · 支线 C（LLM 始终给不出 / 坏 ⇒ 系统兜底）】
nudge 用尽仍无 next（no-tool-call）/ llm-failed / 候选全被拦（all-blocked）
  → 系统兜底推荐「配置新的 LLM」（op.llm-config，确定性）+ 确定性候选 + 已配置终端可达

【S0'''' 未配置 LLM · 支线 D（确定性引导）】
未配置 ⇒ 不下发 next 工具、零候选、零网络
  → 确定性「去配置 LLM」引导（op.llm-config op-direct chip）
  → 不显示 free-input 终端（自由输入不可行）

【S0'''' 首开 · 支线 E（保持确定性）】
首开（authorized ∧ configured）⇒ 复用 idle 入口、确定性路径（capability-discovery + 终端）
  → 零 LLM 往返依赖；让位 firstRun（零双卡）
```

| 步 | 环节 | 机核断言 |
|:-:|---|---|
| S0''''-1 | 已配置 ⇒ 工具产出结构化候选 | `next` 工具调用被 `intercept` 捕获；候选结构 `{opId,label,ref?,params?}` 可判（注入式样本） |
| S0''''-2 | **无条件触发** | 无引用回合结束仍驱动（工具面含 `next`）；未配置不驱动 |
| S0''''-3 | **提醒补一次（有界）** | 未捕获 ⇒ 恰一次 nudge 续轮；**再未捕获 ⇒ 不再提醒**（进兜底） |
| S0''''-4 | **未配置 ⇒ 确定性引导 + 无自由输入** | `op.llm-config` 引导可达 ∧ 推荐卡**无** `.next-terminal` |
| S0''''-5 | **已配置 ⇒ free-input 恒在** | 已配置任意支线推荐卡均有 `.next-terminal`（恒最末） |
| S0''''-6 | **非法候选被拦 + 留痕** | 幻觉 op / 越界 ref / `gesture` op / param 越界 **四类各** `admit=false` + 可读 `blocked=` 行（零明文） |
| S0''''-7 | **系统兜底推荐可达** | `no-tool-call` / `llm-failed` / `all-blocked` 三情形各 ⇒ `op.llm-config` 兜底 chip 可达 |
| S0''''-8 | **判定分层** | `confirm` 候选：`admit=true ∧ press=blocked:tier`；`gesture`：`admit=false` |
| S0''''-9 | **围栏块通道已替换** | 围栏块不再产出候选；`next` 工具为唯一产出通道 |
| S0''''-10 | **零新增载体** | `KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字 |
| S0''''-11 | **首开确定性** | 首开走确定性；零 LLM 往返依赖；零双卡 |
| S0''''-12 | **留痕三要素 + 零明文** | `driver=<id> \| timing=idle \| evidence=<参数字段名>`；不含候选 label / params 值 |

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-100** | **S0'''' 全链机器化**：上表 S0''''-1~12 逐步可判（node 面 + Chromium 面双面），样本单源 | 双面全绿；**Chromium 面只在既有 `s0-self-driven.mjs` 加断言不加文件** | P0 |
| **FR-NDA-101** | **已配置主线机核（四条硬断言）**：① 工具调用被捕获且候选 opId 在册且非 gesture ② 非法候选（幻觉 op / 越界 ref / gesture op / param 越界）被拦 + 留痕 ③ 未配置 ⇒ 确定性引导且无自由输入 ④ 已配置 ⇒ free-input 恒在 | 四条各自可判 + 各自反证 | P0 |
| **FR-NDA-102** | **注入反证族（必须实跑）**：AI 产 `gesture` op ⇒ **必拦**；幻觉 op ⇒ **必拦**；删兜底 ⇒ 死端 ⇒ **必红**；AI 代答 `confirm` consent ⇒ **必红**；**提醒两次 ⇒ 必红**；**未配置仍显示自由输入 ⇒ 必红** | 六条反证记录（注入点 + `expectFailPattern` + 逐字节还原 sha256） | P0 |
| **FR-NDA-103** | **Chromium 面只加断言不加文件**：S0'''' 的 Chromium 面走既有 `test/ui/s0-self-driven.mjs`；`CHROMIUM_GATES === 9` **不动** | 门禁计数 = 9；断言增量如实登记 | P0 |
| **FR-NDA-104** | **人工面如实登记**：真机观感 / 「AI 建议是否稳定出现在 chips」体感 / 读屏等 headless 不可合成项逐项标注 `⏳ 未执行`，**不冒充 PASS** | §9.4 人工面清单；无 `PASS` 冒充 | P0 |
| **FR-NDA-105** | **判据禁恒真 + 真源切片**：S0'''' 判据**不得**恒真（须能 FAIL）；真源 = 生产源码 + 生产注册表（**不得**读测试自建常量 / 自我裁决）；提醒有界性 / 分相判据**必须**能 FAIL | 每条判据有双向反证 + 三段控制（`ok`/`violated`/`n/a`） | P0 |
| **FR-NDA-106** | **提醒 / 兜底链的确定性可判**：提醒判定 / 有界 / 兜底触发**不得**依赖真实 LLM 输出；判据须落在**可注入的纯逻辑**（捕获结果 + 判定闭集）+ 注入式反证 | 提醒 / 兜底判据可被 node 门禁直接调用；反证「靠真实 LLM 才能判 ⇒ 不合格」 | P0 |

### 5.12 SUPERSEDE — 与 F-36 的取代 / 保留（`X-NDA-1~12`，判据等价重锚）

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-110** | **X-NDA-1** F-36 产出机制（文本 `next` 围栏块 + 正则解析；`ref-context.ts:52-59`；`ai-next.ts:58-87`；F-36 plan PD-ADN-002 方案 A）→ **取代为 `next` 工具（function calling）+ `intercept` 捕获**（old→new 台账 + 理由 + 日期 + 落点） | FR-NDA-010~028 / 080~083 + 台账条目 + 作者裁决引用 | P0 |
| **FR-NDA-111** | **X-NDA-2** F-36 触发范围（只在有引用上下文；`ref-context.ts:97-100`；`providers.ts:162-175`；F-36 plan PD-ADN-005）→ **取代为无条件**（配置 LLM ⇒ 对话结束即驱动） | FR-NDA-040~045 + 台账 old→new | P0 |
| **FR-NDA-112** | **X-NDA-3** F-36 未配置路径（恒真 free-input 终端；`providers.ts:205-221,217`）→ **取代为分相**（未配置不显示自由输入；已配置恒常驻） | FR-NDA-051~053 + 台账 old→new（**`free-input.when` 恒真 → `configured` 分相**） | P0 |
| **FR-NDA-113** | **X-NDA-4** F-36 无 LLM 异常兜底（`service-worker.ts:1027-1043`；`sidepanel.ts:4140-4152`）→ **新增「提醒补一次 → 系统兜底推荐配置新 LLM」**（**新增判据，非删除既有**）；F-36「未配置 ⇒ 纯确定性」**保持** | FR-NDA-060~076 + 台账（新增项）；反证「提醒无界 / 兜底缺失 ⇒ 必红」 | P0 |
| **FR-NDA-114** | **X-NDA-5** F-36 `ai-next` provider 骑 `ref-action` 位（`providers.ts:162-175`）→ **规则位等价重锚**（无条件触发后改 AI 驱动独立通道 / 新位；`NEXTSTEP_PRIORITY` 恰 4 等价重锚，**非**放宽） | FR-NDA-042 + 台账 old→new + `recommendation-sources` 判据可 FAIL | P0 |
| **FR-NDA-115** | **X-NDA-6 保留（keep）**：F-36 K-1~K-9 逐条保留，登记为「**未发生取代**」——① 5 道校验链 ② `admitCandidate` vs `pressDecision` 分层 ③ `tierOf` 单源 ④ `chat-result.aiNext` type-only 加法字段 ⑤ 确定性退居兜底 + R8 floor ⑥ **已配置时** free-input 恒常驻 ⑦ R6 同因去重扩展 ⑧ 留痕零明文 + 可判 ⑨ 护栏六常量 / 关断偏好接线 | 台账 9 行 `keep` + 各判据绿；反证「删任一项 ⇒ 必红」 | P0 |
| **FR-NDA-116** | **X-NDA-7** F-36 门禁 `ai-next-candidate` 的 AI-N-1（钉死围栏块解析）→ **改写（等价或更强）**：钉死「工具调用捕获 + 5 道校验链 + 判定分层 + 提醒有界」；**断言只增** | FR-NDA-082 + 门禁前后对账；`assertionsRemoved = 0` | P0 |
| **FR-NDA-117** | **X-NDA-8** F-36 `parity` 工具目录（`deriveTools()` 名字集）→ **等价重锚**：新增 `next` 工具 ⇒ `pluginExtra`（reason + basis）+ `baseline-catalog.json` 更新 + `toolCount` 增量如实登记；**旧条目保留** | `parity` 绿 + 新条目 + 旧条目逐字保留 | P0 |
| **FR-NDA-118** | **X-NDA-9 保持**：F-36 时机源恰 5（复用 `'idle'`）→ **保持**（未发生取代）；**零新增触发词** | `driver-timings` DT-2/DT-3 绿 + 台账 `no-supersession` | P0 |
| **FR-NDA-119** | **X-NDA-10 保持**：F-36 首开保持确定性（`PD-ADN-001` deferred）→ **保持**（**不转正**；登记 `PD-NDA-001`） | FR-NDA-090~093 + 台账 `no-supersession` | P0 |
| **FR-NDA-120** | **X-NDA-11** F-36 `requestTurn(` **恰 1** / `maybeRecommend` 1 定义 8 调用点 / `nextAfterSettle` 1 定义 10 调用点 → **等价重锚**（提醒续轮若新增调用点 ⇒ 计数只增 + 说明；`requestTurn(` 恰 1 优先保持） | `op-wiring` / `driver-timings` / `driver-quadruple` 判据 + 台账 old→new | P0 |
| **FR-NDA-121** | **X-NDA-12** F-36 围栏块协议的「零新 LLM 往返」契约（复用同一次回合输出）→ **保持**（工具调用在同一回合内）；登记「**未发生取代**」 | FR-NDA-017 / 083 + 台账 `no-supersession` | P0 |
| **FR-NDA-122** | **未发生的取代如实登记「未发生」**：任何 X-NDA 项若确认不需要取代 ⇒ **显式登记 `no-supersession` + 理由**，**不得留空 / 不得伪造**；取代台账与判据重锚**同轮完成**，不得拆到「下一轮补」 | §12 每行有「已发生 / 未发生 / 保留」状态；台账条目与 X 项一一对应 | P0 |

### 5.13 GATE — 门禁等价重锚与台账

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-130** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段显式取代 + 台账留痕） | 各门禁前后计数对账表（§9.5）无减少项 | P0 |
| **FR-NDA-131** | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | 每个新增 / 重锚判据附反证记录（注入点 + 还原 sha） | P0 |
| **FR-NDA-132** | **取代台账登记**：X-NDA-1~12 逐条落 `docs/*-supersession-ledger.json`（或等价台账），含 `knownGap` 一致性；**老台账条目（v3/v4/v5/v5.5/F-34/F-35/F-36）一律保留不动** | 台账新增条目 + 一致性门禁绿 | P0 |
| **FR-NDA-133** | **保护段处置**：journey `[43484,59347)` / sha `7b309258…` + binding `[107780,115930)` / sha `be9ad0e9…` 逐段决策（`keep` / 八步显式取代）；**若取代 ⇒ 走八步 + 哈希变更 old→new + 理由 + 日期台账留痕**；若 `keep` ⇒ **字节中立**（段前等长补偿 ⇒ 双绿）；**禁静默改写** | 保护段门禁绿；八步记录或字节中立证明齐备 | P0 |
| **FR-NDA-134** | **门禁逐一处置清单（禁漏项）**：**改写 2**（`ai-next-candidate` AI-N-1 换机制 / `parity` 新工具条目）+ **等价重锚 N**（`recommendation-sources` 真值 7 / 模块 5 / 规则位 / `driver-timings` 恰 5 / `driver-quadruple` 双向包含 / `op-wiring` 计数 / R6 同因去重 / `gate-integrity` 下界）+ **保留**项；每条给出「保留 / 等价重锚 / 显式取代（+台账）」三态之一 + old→new 定位 | §9.5 处置表齐备且三态齐；无「未处置」项 | P0 |
| **FR-NDA-135** | **新增 / 改写门禁登记**：`ai-next-candidate` 改写后仍纳入 `gate-integrity` 受审集合（下界**只增**）；**不新增 Chromium 门禁文件**（`CHROMIUM_GATES === 9` 不动） | `gate-integrity` 绿 + 下界 ≥ 前值；Chromium 计数 = 9 | P0 |
| **FR-NDA-136** | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile）；`KL-N-10` 处置 = 首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口** | 执行记录 + `gate-integrity` 绿 | P0 |
| **FR-NDA-137** | **双面镜像门禁保持**：`shared/op-table.ts` 与 SW 侧 `SW_OPS` 双面一致性（`sw-op-mirror`）**不降级**；`next` 工具捕获读同一单源 | `sw-op-mirror` 绿；反证「双面漂移 ⇒ 必红」 | P0 |

### 5.14 VOL — 体积分列预算

| ID | 需求描述 | 验收标准 | 优先级 |
|----|---------|---------|--------|
| **FR-NDA-140** | **分列预算**：明列 **A 列（`dist/sidepanel.js`，计入账本）** / **B 列（`dist/background.js`，不计入 sidepanel 账本）** / **C 列（冻结面）**；**逐叶分列**（nda-1 工具通道 / nda-2 未配置 + 提醒 + 兜底 + 重锚）；给出上下界 + 15% 缓冲（§5.14.1 表） | 预算表逐格可核（含 15% 缓冲列）；**先预算后落地** | P0 |
| **FR-NDA-141** | **距档结论**：A 基线 **604,602 B** · 距档 **9,798 B**（档位 614,400）· 生效上限 `floor(604,602 × 1.05) = `**`634,832`**；给出「**不触发升档**」结论与余量；同时按 **v5 历史低估 2.8×** 给最坏情形 ⇒ **预置升档 EC 路径** | §5.14.1 两行结论（正常口径 / 2.8× 最坏口径）；EC-NDA-016 已登记 | P0 |
| **FR-NDA-142** | **冻结面零容差**：`content.js` **177,076 B** / `pick-layer.js` **34,358 B** / `KIND_SET` **40** —— 逐字节 / 逐字不变（量值 + sha 双锚） | 构建后 `stat` + sha256 前后一致；冻结面判据绿 | P0 |
| **FR-NDA-143** | **越限路径 = EC 显式路径 + 作者一行**：若实测越**生效上限**（`floor(baseline × 1.05)`）⇒ 显式重登记基线（同源前移）；若越**档位 614,400** ⇒ 走 EC 显式升档路径 + **作者一行**；`authorConfirmation` **不得**伪称已确认 | EC-NDA-016 逐分支；`authorConfirmation` 读值断言 | P0 |
| **FR-NDA-144** | **每叶收口实测重登记**（不等两叶合计）：**五要素**（前后值 / 日期 / 来源 / 理由 / 历史保留）+ **三值**（`newBaselineBytes` / `absoluteCeilingBytes` / 生效上限）同源前移；**B 列增量不计入 sidepanel 账本**（如实标注列别） | 逐叶登记条目存在；五要素齐备；算术机核绿 | P0 |
| **FR-NDA-145** | **预算不得跨列混算规避**：**不得**为绕门禁把 A 列改动搬进 / 搬出 sidepanel（归因必须逐模块）；B 列改动如实标注「不计账」 | 落地归因表（逐模块 → 产物）；反证「把 A 列改动搬 B 列规避 ⇒ 必红」 | P0 |

#### 5.14.1 体积分列预算表（**spec 阶段先出，禁止未预算先排落地**）

**统一前提（引 discovery §0.2-H 只读实测）**：A 基线 **604,602 B** · 生效上限 `floor(604,602 × 1.05) = `**`634,832`** B（余量 **30,230 B**）· **档位 614,400 B**（**距档 9,798 B，薄**）· 绝对上限 **675,840 B** · `authorConfirmation = pending-author-line`（**未闭合义务**）· **B 列（`dist/background.js`）不计入 sidepanel 账本**。

| 列 | 产物 | 叶1（nda-1 工具通道 / 触发 / 校验接入）落地项 | 叶2（nda-2 未配置 / 提醒 / 兜底 / 重锚）落地项 | 计入账本 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | 工具面接线（`next` 出现在 `deriveTools()`）+ 候选渲染**复用既有 `nextstep`**（零新渲染面）+ **分相判据薄接线**（`configured`）+ 规则位重锚薄接线 | 未配置引导接线 + free-input 分相 + 提醒 / 兜底接线 + 重锚（`op-wiring` / `driver-timings` / `driver-quadruple` 断言）+ 门禁对账 | ✅ |
| **B** | `dist/background.js` | **`next` 工具 def + `hooks.intercept` 接线 + 捕获 / 解析 + 5 道校验链接入 + `chat-result.aiNext` 装配**（SW 侧；复用 `shared/op-table.ts` 镜像）+ 留痕 | **提醒续轮编排 + 异常判定闭集 + 系统兜底接线 + 分相判据终态** | ❌（不计账） |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1（nda-1） | 叶2（nda-2） | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（sidepanel 净增）** | **+0.4 ~ +1.2 KB**（薄接线：工具面 + 分相薄接线 + 规则位重锚） | **+0.4 ~ +1.2 KB**（未配置引导 + 分相 + 提醒 / 兜底接线 + 重锚） | **+0.8 ~ +2.4 KB** | **+0.9 ~ +2.8 KB** | **距档 9,798 B ⇒ 正常口径下不触发升档**（亦远未越生效上限 30,230 B） |
| **B 列（background.js，不计账）** | **+1.5 ~ +4.0 KB**（工具 def + intercept + 捕获 / 校验 + 装配） | **+1.0 ~ +3.0 KB**（提醒编排 + 异常判定 + 兜底 + 分相终态） | **+2.5 ~ +7.0 KB** | — | **不计入 sidepanel 账本**（B 列优先正是为旁路档位压力） |
| **v5 历史低估系数 2.8× 最坏情形（A 列 Σ 上界 2.4 KB）** | — | — | **≈6.7 KB** | **≈7.7 KB** | **仍 < 9,798 B，但余量仅 ~2.1 KB（薄）** ⇒ **必须预置 EC-NDA-016 显式升档路径 + 作者一行** |

> **口径与纪律**：① 上表为 **spec 阶段估算（非承诺）**；② **每叶收口实测重登记**（FR-NDA-144），不得以估算充当实测；③ **B 列优先**的唯一理由 = 旁路 sidepanel 档位压力（距档仅 9,798 B），**不得**把它读成「B 列无成本」；④ **不得**把 B 列改动搬进 A 列 / 把 A 列搬出以绕开门禁（FR-NDA-145）；⑤ 升档须走 EC-NDA-016 + **作者一行**（**未闭合义务不得伪称已确认**，N-NDA-013）；⑥ **2.8× 最坏余量薄（~2.1 KB）** ⇒ plan / tasks 阶段应把 A 列改动**从紧预算**并优先落 B 列。

---

## 6. 非功能需求 (NFR)

| ID | 类别 | 需求描述 | 验收标准 |
|----|------|---------|---------|
| **NFR-NDA-001** | 性能/体积 | `dist/sidepanel.js` ≤ 生效上限 `floor(baseline × 1.05)`；**判定 = 公式唯一**（`SIDEPANEL_CEILING_CAP` 保持 `record-only`） | `size-baseline` / `size-ruling-vol3` 绿；实测 ≤ 上限；越限走 EC-NDA-016 |
| **NFR-NDA-002** | 安全 | 特权 op（`op.authorize` / `op.perm.request`）**恒 `gesture`**；AI 候选**既不提案也不按下**（连可见都拒） | 注入必红（`gesture` 候选 ⇒ 必拦）+ `op-three-tier` / `capability-wiring` 绿 |
| **NFR-NDA-003** | 安全 | consent / `gesture` **不得**被 AI 代答 / 代填 / 自动提交（含 `confirm` 档候选与系统兜底推荐） | 注入必红（AI 代答 `confirm` consent）；红线⑥精神保持 |
| **NFR-NDA-004** | 安全 | 法八**四面零明文不退化**（流内 payload / digest / 审计 / DOM value 与全部属性）；候选 `label` / `params` / **工具参数** / 留痕**不回显值** | `law8-plaintext` 断言全绿、**零降级** |
| **NFR-NDA-005** | 安全 | `packages/web-cli-base/**` **零 diff**（**只复用** function calling + `hooks.intercept`）；判定链（`policy.ts` / `auto-authorize.ts`）**零触碰**（`zeroDiffFiles` 9 项哈希 pin 不变） | `insight-no-escalation` 绿 + `zeroDiffFiles` 机核绿 |
| **NFR-NDA-006** | 安全 | 校验链**不得放松**任何既有 fail-closed 方向（引用判定 3 结果 / 档位语义 / `safety` 抑制） | 反证族逐条；`ref-validity` 3 结果 / `tierOf` 语义不变 |
| **NFR-NDA-007** | 兼容 | **零新增载体**：`KIND_SET` **40** / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` / `ACT_TO_OP` 6 行 | `messaging` / `stream-model` / `host-registry` / `next-dispatch-diff0` 断言绿 |
| **NFR-NDA-008** | 兼容 | `recommendNextStep` 保持 **pure**（无 DOM / 时钟 / IO / `chrome`）；真值白名单 7 / 模块白名单 5 不动 | `recommendation-sources` 判据绿（含 ④ 零网络） |
| **NFR-NDA-009** | 可机核 | **校验器 / 捕获 / 提醒判定可机核**：纯函数 + 双向反证 + 注入必红 + **三段控制禁恒真** + 真源切片 | 改写后的 `test/ai-next-candidate.test.ts` 全绿 |
| **NFR-NDA-010** | 可用性 | **零死端**：任何路径（未配 / AI 未产出 / 非法被拦 / 提醒用尽 / LLM 坏）均有可达 next（含引导 / 终端 / 兜底推荐） | `no-dead-end` **只增必绿** |
| **NFR-NDA-011** | 兼容 | **在飞不产卡**（`pending` 硬门）不退化；提醒**不得**在飞时抢回合（撞既有仲裁 ⇒ `blocked:busy` / `ai-deferred` 语义不变） | `recommend.ts` 四闸判据绿 + `turn-arbitration` |
| **NFR-NDA-012** | 环境/纪律 | 门禁**严格串行**；**无新依赖**；**不改** `.opencode/opencode.json`；`F-29` 区段一字不动 | 执行记录 + §16 纪律表逐条 |
| **NFR-NDA-013** | 可维护 | **扩展点固定 / 单源**：一个 `next` 工具 + 一处 `intercept` 捕获 + 一个校验器 + 一个档位单源（`tierOf`）+ 一个分相判据（`configured`）；第二份 ⇒ FAIL | 反证：第二工具入口 / 第二校验器 / 第二档位表 / 第二配置判据 ⇒ 必红 |
| **NFR-NDA-014** | 可判 | **判定分层可判** + **提醒有界可判**：`confirm` 情形 `admit=true ∧ press=false`；提醒相 `nudgeUsed=true ⇒ 不再提醒` | 分层判据 + 有界判据 + 双向反证（均**非恒真**） |
| **NFR-NDA-015** | 性能 | **主链零新增 LLM 往返 / 零新增网络**：工具调用在既有回合内（`fetch(` / `chrome.` / `Date.now` 在 `recommend.ts` 仍零命中）；**提醒轮是唯一允许的有界新增往返（恰 1 次）** | `recommendation-sources` ④ 绿；提醒往返次数 ≤1 断言 |
| **NFR-NDA-016** | 可回溯 | **留痕可判且零明文**：`driver=<id> \| timing=idle \| evidence=<参数字段名>` + `blocked=<reason>`；两值（工具产出 / 手输）可判 | 留痕逐行断言；`ai-drive.ts:85` 零值纪律保持 |

---

## 7. 边界情况 (EC)

| ID | 场景 | 处理方式 |
|----|------|---------|
| **EC-NDA-001** | **AI 幻觉 opId**（不存在于 9 op） | **拒绝 + 留痕**（`blocked=unknown-op`）；不渲染为 chip；不死端（兜底候选 + 引导 / 终端仍在） |
| **EC-NDA-002** | **AI 提案 `gesture` op**（`op.authorize` / `op.perm.request`） | **恒拒绝（连提案都拒）** + 留痕（`blocked=tier`）；特权面零触达 |
| **EC-NDA-003** | **AI 提案 `confirm` op**（`op.llm-config` / `op.revoke`） | **接受为可见 chip**；点击 ⇒ 既有 consent 卡（**用户答**）；AI **不可自动按下**（`press=blocked:tier`） |
| **EC-NDA-004** | **AI 候选引用越界 ref**（不存在 / 已失效） | **拒绝 + 留痕**；引用判定 3 结果语义不变 |
| **EC-NDA-005** | **AI 候选 `params` 越界**（不在该 op `AskSpec` 内） | **拒绝 + 留痕**；不把越界值透传给 op |
| **EC-NDA-006** | **AI 产出多条候选**（如 4 条） | 按顺序取前 N（**N ≤ 3**）；超出**截断**；不新增卡 / 不越 3-chip |
| **EC-NDA-007** | **AI 未调用 `next` 工具**（回合正常结束但无工具调用） | **提醒补一次**（有界）；补成功 ⇒ 走主线；补失败 ⇒ 进系统兜底 |
| **EC-NDA-008** | **提醒已用尽仍无合法候选** | **不再提醒**；确定性兜底（注册表候选 + 已配置终端）**+** 系统兜底推荐「配置新的 LLM」 |
| **EC-NDA-009** | **LLM 坏 / 异常**（`finish('llm-failed')` / 提醒轮失败 / 候选全被拦） | **系统兜底推荐**（`op.llm-config`，确定性，文案强调「配置新的 LLM」）+ 确定性候选可达；零死端 |
| **EC-NDA-010** | **未配 LLM** | **不显示自由输入终端**；next = 确定性「去配置 LLM」引导（`op.llm-config` op-direct chip）；零候选 / 零网络 |
| **EC-NDA-011** | **已配置 LLM** | free-input 终端**恒常驻**（恒最末；R8 / F-35 不回归） |
| **EC-NDA-012** | **在飞（`pending`）时结题** | `recommendNextStep` 不产卡（硬门保持）；提醒**不得**抢回合（撞仲裁 ⇒ `blocked:busy` / `ai-deferred` 语义不变） |
| **EC-NDA-013** | **在飞时提醒续轮撞车** | 撞既有仲裁 ⇒ `blocked:busy`（**不排队**）；不破 `turn-queue.ts` |
| **EC-NDA-014** | **同回合多次 `next` 工具调用** | 取最后一次（或等价确定口径，plan 裁决）；总候选 ≤3；合并单源 |
| **EC-NDA-015** | **`next` 工具参数解析失败 / 非法 JSON** | 视为「未产出」（进提醒 / 兜底链）；**不抛错中断回合** |
| **EC-NDA-016** | **体积越限**（越生效上限 / 越档位 / 越绝对上限） | 越生效上限 ⇒ 显式重登记基线（同源前移）；越档位 ⇒ 走 EC 显式升档路径 + **作者一行**；越绝对上限 ⇒ 停止并请示作者；`authorConfirmation` **不得**伪称已确认 |
| **EC-NDA-017** | **注入第 41 个 `KIND_SET` 成员 / 第 13 种卡 kind / 新宿主** | **必红**（零新增 kind / 零宿主判据非恒真） |
| **EC-NDA-018** | **AI 代答 / 自动提交 `confirm` consent**（含兜底推荐） | **必红**（`expectFailPattern` 声明 + 逐字节还原）；红线⑥精神不被新通道绕过 |
| **EC-NDA-019** | **确定性兜底被删 / 已配置 free-input 终端被删** | **必红**（`r8-open-next-entry` / `free-input-next` / `no-dead-end` 判据可 FAIL） |
| **EC-NDA-020** | **围栏块通道被保留为「影子产出」** | **必红**（FR-NDA-080 判据）；若确需过渡兼容 ⇒ 显式 `PD-NDA-*` 登记（否则 NG-NDA-013） |
| **EC-NDA-021** | **提醒机制无界（递归续轮 / 自触发）** | **必红**（FR-NDA-062 / 063 有界判据可 FAIL）；越限直接进系统兜底 |
| **EC-NDA-022** | **AI 候选 label 含凭据形值 / 正文 / 工具参数含明文** | 仅作显示文本 / 结构化参数；**不入**流内 payload / digest / 审计 / DOM 四面（法八）；留痕只含字段名 |
| **EC-NDA-023** | **窄视口（320px）** AI 候选 chips | 不越密度阈值（7/15 · 9/20 · 17/35 逐字不动）；不水平溢出 |
| **EC-NDA-024** | **首开 / ready（`authorized ∧ configured`）/ 未配置冷启动** | 首开走确定性（capability-discovery + 终端）；未配置 ⇒ 「去配置 LLM」引导且无自由输入；**零 LLM 往返依赖**；让位 `firstRun`（零双卡） |
| **EC-NDA-025** | **门禁环境性 flake（`KL-N-10` 家族：`s0-self-driven` / `recommendation` / `binding` 相位）** | 隔离复跑 ≥2、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） |

---

## 8. 开放问题

> **口径**：discovery 的 **O-NDA-001~014 已由编排器批量裁决**（D1 / D2），逐条落位见 §11，**本节不再重复列入**。下表为 **spec 阶段新识别 / 明确留待 plan 或后续轮**的开放点（`PD-NDA-0xx`），**不在本阶段预设答案**。

| # | 问题 | 为什么可以后置 | 状态 |
|---|---|---|---|
| **PD-NDA-001** | **首开 AI 化**（AI 产初始 next：问候 / 能力探测建议） | 已裁决**本轮不做**（O-NDA-009 / NG-NDA-017）；若后续做，须保留确定性兜底 + 超时降级（FR-NDA-093） | 待后续轮 |
| **PD-NDA-002** | **`next` 工具 `description` 的精确提示词**（措辞 / 是否含示例 / 是否含「无建议则空数组」引导）与解析严格度 | 裁决已定「工具 schema + 必须校验」（FR-NDA-011 / 012 / 013）；**提示词措辞**属实现自由度，只要 schema 结构与校验链成立 | 待裁决（plan） |
| **PD-NDA-003** | **`label` 的净化 / 截断口径**（长度上限、去换行、去控制字符）与与 `stream-plaintext.label` 的关系 | 法八「零明文 / 不回显值」已定（NFR-NDA-004）；净化细则属实现自由度，且密度门禁会给出显示上界 | 待裁决（plan / 密度门禁） |
| **PD-NDA-004** | **候选 `ref` 字段的语义面**（引用编号 vs `refId`）与与 F-34 引用载荷的关系（校验链 ref 语义保持） | 裁决已定「ref 必须存在且有效」（FR-NDA-034）；字段编码属实现自由度（复用既有 `ref-store` 事实即可） | 待裁决（plan） |
| **PD-NDA-005** | **`next` 工具驱动者 id 的精确字面量**（如 `next` / `ai-next`）与 `evidence` 字段名 | 裁决已定「显式声明 + 三要素 + 零明文」（FR-NDA-028）；字面量属实现自由度，只要 DQ-1/DQ-3 双向包含成立 | 待裁决（plan） |
| **PD-NDA-006** | **`ai-next` provider 规则位的精确落点**（新规则位 vs 独立通道「AI 优先于全部规则」）与 `NEXTSTEP_PRIORITY` 重锚形态 | 裁决已定「不再骑 `ref-action` 独占 + 等价重锚」（FR-NDA-042 / 114）；落点属实现自由度，只要判据可 FAIL 且计数只增 | 待裁决（plan） |
| **PD-NDA-007** | **提醒续轮的通道形态**（复用同回合续轮 vs 新增 `runChatTurn` 调用点）与 `requestTurn(` 计数重锚形态 | 裁决已定「恰一次 + 有界 + 等价重锚」（FR-NDA-061 / 062 / 064）；通道形态属实现自由度 | 待裁决（plan） |
| **PD-NDA-008** | **系统兜底推荐的精确文案与 provider 落点**（新增 `llm.abnormal` provider vs 复用 `llm.unconfigured` 分相） | 裁决已定「复用 `op.llm-config` + 文案强调配置新 LLM + 词表不新写」（FR-NDA-071 / 072）；落点属实现自由度 | 待裁决（plan） |
| **PD-NDA-009** | **`recommendation-sources` 白名单是否需为工具驱动 / 分相判据新增条目** | FR-NDA-134 裁决 = 白名单保持 5（若新增导入 ⇒ 等价重锚）；具体落点属实现自由度 | 待裁决（plan） |
| **PD-NDA-010** | **围栏块通道的过渡兼容**（是否保留一个开关 / 仅删代码） | 裁决已定「替换、单一通道」（FR-NDA-080）；过渡诉求若有须显式登记（EC-NDA-020） | 待裁决（plan） |
| **PD-NDA-011** | **同回合多次 `next` 调用的精确合并口径**（取最后一次 vs 取并集去重） | 裁决已定「口径唯一 + ≤3 + 单源」（FR-NDA-025 / EC-NDA-014）；口径细节属实现自由度 | 待裁决（plan） |

---

## 9. 验收标准（总体验收清单，含门禁映射）

> **口径**：AC 为**总体验收**（可跨多条 FR）；每条有唯一 ID 且**可机核或如实标注人工面**。`⏳` = 本轮未执行（spec 阶段零运行时验证）。

### 9.1 核心验收（S0'''' 五支线 / 工具产出 / 捕获 / 校验保留 / 无条件 / 未配置 / 提醒 / 异常兜底 / 围栏块 / 首开）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-NDA-001** | **S0'''' 全链机器化（五支线）**：S0''''-1~12 逐步可判（node + Chromium 双面；样本单源）；**① 已配置工具产出合法走 AI 候选；② 提醒补一次成功；③ 提醒仍失败 ⇒ 系统兜底；④ 未配置 ⇒ 确定性引导且无自由输入；⑤ 首开确定性** | FR-NDA-100~106 | 改写后的 `test/ai-next-candidate.test.ts`（node）+ `test/ui/s0-self-driven.mjs`（**只加断言不加文件**） |
| **AC-NDA-002** | **`next` 工具产出通道**：工具注册出现在 `deriveTools()` + schema `{candidates:[{opId,label,ref?,params?}]}` maxItems ≤3 + description 三约束 + 纯协议工具 | FR-NDA-010~014 | 工具定义断言 + schema 结构断言 + `description` 文本断言 |
| **AC-NDA-003** | **`hooks.intercept` 捕获**：接线（不动 `onToolDone`）+ `tc.name==='next'` 捕获 + 合成 `ToolResult` 跳过 dispatch + SW 侧位置 + `chat-result.aiNext` 装配 | FR-NDA-021~028 | 捕获判据 + 反证「捕获后仍 dispatch ⇒ 必红」+ 归因表（B 列） |
| **AC-NDA-004** | **5 道校验链 + 判定分层保留**：opId 在册（9）→ `tierOf` 单源三档（gesture 恒拒）→ ref 有效 → param 在 `AskSpec` 内 → 丢弃+留痕；`admitCandidate`（接受层）/ `pressDecision`（按下层，diff=0）分层 | FR-NDA-030~036 | 校验器真值表 + 分层真值表 + 四类注入反证（幻觉 op / gesture / 越界 ref / param 越界） |
| **AC-NDA-005** | **触发范围无条件**：配置 LLM ⇒ 对话结束即驱动（无引用回合亦然）；`ai-next` 规则位等价重锚；时机仍 `idle`（恰 5 不动） | FR-NDA-040~043 | 反证「无引用 ⇒ 仍驱动」+ `driver-timings` DT-2/DT-3 + `recommendation-sources` 重锚判据 |
| **AC-NDA-006** | **未配置 ⇒ 确定性引导**：`op.llm-config` 引导可达 + 单一明确可行 + 零 token 路径不破 | FR-NDA-050 / 054 / 055 / 056 | 未配置引导可达断言 + 零网络断言 + 反证「未配置无引导 ⇒ 必红」 |
| **AC-NDA-007** | **自由输入分相**：未配置 ⇒ **不显示** `.next-terminal`；已配置 ⇒ **恒常驻**（R8 / F-35 不回归）；分相判据单源 | FR-NDA-051~053 | 两相判据（非恒真）+ `r8-open-next-entry` / `free-input-next` 绿 + 反证双向 |
| **AC-NDA-008** | **提醒补一次（有界）**：未捕获 ⇒ 恰一次 nudge 续轮；再未捕获 ⇒ 不再提醒；防环；不全新增 `nextAfterSettle` 调用点 | FR-NDA-060~066 | 有界判据（可 FAIL）+ 反证「提醒两次 / 无限续轮 ⇒ 必红」+ 护栏计数不变 |
| **AC-NDA-009** | **LLM 异常判定 + 系统兜底**：三情形闭集（no-tool-call / llm-failed / all-blocked）；复用 `op.llm-config` 兜底推荐（文案强调配置新 LLM）；与 `llm.unconfigured` 分相不混同；零死端 | FR-NDA-070~076 | 三情形真值表 + 兜底 chip 可达 + 反证「无兜底 / 词表混同 ⇒ 必红」 |
| **AC-NDA-010** | **围栏块通道替换**：`NEXT_CONTRACT_GUIDANCE` 停止注入 + `FENCE` / `lastNextFenceBody` / `parseAiNextItems` 停止承载产出；**单一产出通道**；`ai-next-candidate` 门禁改写（断言只增） | FR-NDA-080~083 / 116 | 反证「围栏块仍能产出 ⇒ 必红」；门禁前后断言对账无减少项 |
| **AC-NDA-011** | **首开确定性不破**：首开 / ready 走确定性；零 LLM 往返依赖；未配置首开由「去配置 LLM」引导承接；让位 `firstRun`（零双卡） | FR-NDA-090~093 | R8 入口判据 + 「无网络仍有引导 / 终端」断言 + 零双卡判据 |

### 9.2 功能验收（按下 / 留痕 / 法八 / 在飞 / parity / 兼容 / 人工面）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-NDA-012** | **自动按下路径 diff = 0**：仍经 `pressCandidate` → `dispatchChipAction`（恰 1）→ `op.turn` 槽；`requestTurn(` 恰 1（或等价重锚） | FR-NDA-006 / 114 / 120 | `op-wiring` ⑦ + 反证（AI 路径直连 `requestTurn` ⇒ 必红） |
| **AC-NDA-013** | **留痕三要素 + 零明文**：`driver=<id> \| timing=idle \| evidence=<参数字段名>` + `blocked=<reason>`；工具产出 / 手输两值可判；不回显值 | FR-NDA-028 / 036 | 留痕逐行断言 + `ai-drive.ts:85` 零值纪律 |
| **AC-NDA-014** | **法八四面零明文不退化**：候选 label / params / **工具参数** / 留痕只走既有载荷；不回显值 | FR-NDA-016 / NFR-NDA-004 | `law8-plaintext`（**零降级**） |
| **AC-NDA-015** | **在飞语义不变**：`pending` 不产卡；提醒 / AI 撞车 ⇒ `blocked:busy`（不排队）/ `ai-deferred` 四值逐字不动 | FR-NDA-045 / NFR-NDA-011 | `recommend.ts` `pending` 判据 + `turn-arbitration` |
| **AC-NDA-016** | **`parity` 工具目录**：新增 `next` 工具 ⇒ `pluginExtra`（reason + basis 非空）+ `baseline-catalog.json` 增量；旧条目逐字保留 | FR-NDA-020 / 117 | `parity.test.ts` 绿 + 新条目 + 反证「无条目 ⇒ 必红」 |
| **AC-NDA-017** | **未配置零 token 路径不破** + 零候选零网络 | FR-NDA-018 / 056 | 「未配置 ⇒ 零网络 / 零 token」断言 |
| **AC-NDA-018** | **F-35 输入面不回归**：free-input / `op.turn` 槽 / `requestTurn(` 恰 1 语义不因机制换轨回归 | FR-NDA-006 / 052 | `free-input-next` / `turn-arbitration` 判据不降 |
| **AC-NDA-019** | **人工面如实登记**：真机观感 / 「AI 建议是否稳定出现在 chips」体感 / 读屏逐项 `⏳ 未执行`，不冒充 PASS | FR-NDA-104 | §9.4 人工面清单（下表） |

### 9.3 取代台账与门禁治理（**改写 2 + 等价重锚 N + 保留**）

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-NDA-020** | **断言零删除零降级、计数只增**（唯一例外 = 保护段显式取代 + 台账） | FR-NDA-004 / 130 | §9.5 计数对账表无减少项 |
| **AC-NDA-021** | **反证实跑 + 逐字节还原**（sha256 前后相同）；六类反证（gesture op / 幻觉 op / 删兜底 / AI 代答 consent / 提醒两次 / 未配置仍显示自由输入） | FR-NDA-102 / 131 | 反证记录（注入点 + 还原 sha） |
| **AC-NDA-022** | **取代台账登记**（X-NDA-1~12 逐条；未发生者标 `no-supersession`；老条目保留） | FR-NDA-005 / 115 / 122 / 132 | 台账条目 + 一致性门禁 |
| **AC-NDA-023** | **保护段逐段决策**：journey `[43484,59347)`（sha `7b309258…`）+ binding `[107780,115930)`（sha `be9ad0e9…`）→ `keep`（字节中立双绿）或八步取代（台账留痕） | FR-NDA-133 | 保护段门禁 + `supersession-ledger.test.ts` |
| **AC-NDA-024** | **门禁受审集合只增**：`ai-next-candidate` 改写后仍在集合（下界只增）；`CHROMIUM_GATES === 9` | FR-NDA-135 | `gate-integrity` 绿 |
| **AC-NDA-025** | **门禁严格串行 + `KL-N-10` 处置**（隔离复跑 ≥2；仍红如实记录） | FR-NDA-136 | 执行记录 + `gate-integrity` 绿 |
| **AC-NDA-026** | **等价重锚完成且非恒真**：`recommendation-sources`（真值 7 / 模块 5 / 规则位）/ `driver-timings`（恰 5）/ `driver-quadruple`（双向包含）/ `op-wiring`（计数）/ `parity`（新条目）/ `gate-integrity`（下界） | FR-NDA-134 / 137 | §9.5 处置表 + 各门禁绿 + 逐条反证 |

### 9.4 红线、体积与人工面

| ID | 验收内容 | 关联 FR | 判据 / 门禁 |
|----|---------|---------|------|
| **AC-NDA-027** | **冻结面零容差**：`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 逐字节逐字 | FR-NDA-142 | `stat` + sha256 前后一致 + 冻结面判据 |
| **AC-NDA-028** | **体积分列预算 + 距档结论 + 2.8× 最坏 + 15% 缓冲**；B 列优先（不计账）；升档走 EC 显式路径 + 作者一行 | FR-NDA-140~145 | §5.14.1 表 + 逐叶重登记 + EC-NDA-016 |
| **AC-NDA-029** | **base 零 diff + 判定链零触碰**（含 `zeroDiffFiles` 9 项哈希 pin） | FR-NDA-003 / NFR-NDA-005 | `insight-no-escalation` + `zeroDiffFiles` 机核 |
| **AC-NDA-030** | **零新增载体（红线）**：`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 逐字 | FR-NDA-016 | `messaging` / `stream-model` / `host-registry` / `next-dispatch-diff0` 断言绿 |
| **AC-NDA-031** | **`recommend.ts` 仍 pure + 主链零新 LLM 面**（真值 7 / 模块 5 / 无 `fetch(`·`chrome.`·时钟）；提醒轮 = 唯一有界新增往返（恰 1） | FR-NDA-017 / NFR-NDA-008 / 015 | `recommendation-sources` ①~④ 绿 + 提醒往返 ≤1 断言 |
| **AC-NDA-032** | **人工面如实登记**：真机观感 / 机制换轨体感逐项 `⏳ 未执行`，不冒充 PASS | FR-NDA-104 | 下表 §9.4 人工面清单 |

**§9.4 人工面清单（headless 不可合成项，逐项如实标注）**

| # | 人工项 | 判据来源 | 本轮状态 |
|:-:|---|---|:--:|
| M1 | AI 候选在真机上的**相关性 / 有用度**（作者能否一眼看出「这正是我刚被建议的下一步」） | 真机观感（机核只证「工具产出经校验注入 + 替换围栏块通道」） | `⏳ 未执行` |
| M2 | **工具调用产出的稳定性体感**（换轨后 AI 建议是否更少丢） | 作者体感 | `⏳ 未执行` |
| M3 | **提醒补一次的体感**（提醒后 AI 是否确实补上建议 / 是否显突兀） | 作者体感 | `⏳ 未执行` |
| M4 | **系统兜底推荐的体感**（LLM 坏时是否明确知道「去配置新的 LLM」） | 作者体感 | `⏳ 未执行` |
| M5 | **未配置场景体感**（不再被引导点「自由输入」死路） | 作者体感 | `⏳ 未执行` |
| M6 | **读屏可用性**（工具产出 chip / 兜底推荐 / `blocked=` 留痕可朗读性） | 读屏观感 | `⏳ 未执行` |

### 9.5 门禁处置与计数对账（**计数只增，逐项处置；改写 2 + 等价重锚 N + 保留；禁漏项**）

> **口径**：基线数引自 **F-36 收口 + discovery 本轮只读实测**（本轮未复跑，§2.2B）；处置三态 = **保留** / **等价重锚** / **显式取代（+台账）**。**本轮全部标 `⏳`。**

| # | 层 | 门禁 | F-37 起点基线（引用） | 钉了「围栏块产出机制」的位置（发现面） | 处置三态 | 本轮 |
|:-:|:-:|---|--:|---|---|:--:|
| 1 | node | **`test/ai-next-candidate.test.ts`（改写）** | 族内（F-36 AI-N-1~11） | **AI-N-1 钉死围栏块解析**（`:8,78`） | **改写（等价或更强）**：钉「工具调用捕获 + 5 道校验链 + 判定分层 + 提醒有界 + 真源切片」；**断言只增** | `⏳` |
| 2 | node | `test/parity.test.ts` | （族内） | `deriveTools()` 名字集对 `baseline-catalog.json`；新增工具需 `pluginExtra` | **等价重锚**：新增 `next` 条目（reason + basis）+ `toolCount` 增量；旧条目逐字保留 | `⏳` |
| 3 | node | `test/recommendation-sources.test.ts` | 族内 | 真值白名单 7 / 模块白名单 5 / `NEXTSTEP_PRIORITY` 恰 4 / 单卡 / ④ 零新 LLM | **等价重锚**（规则位重锚 + 分相判据登记；**零删除**；④ 保持） | `⏳` |
| 4 | node | `test/driver-timings.test.ts` | 族内 | DT-2 恰 5 / DT-3 旧 4 逐字 / DT-4 调用点 / DT-6 `NextCtx` 字段登记 | **等价重锚**（恰 5 保持；提醒续轮调用点登记只增） | `⏳` |
| 5 | node | `test/driver-quadruple.test.ts` | 族内 | DQ-1 `DRIVER_DECLS_SRC` ↔ `builtinProviders()` 双向包含（12↔12） | **等价重锚**（`evidence` 与工具机制同源；旧 12 行逐字） | `⏳` |
| 6 | node | `test/op-wiring.test.ts` | 14 | `maybeRecommend` 1/8 · `requestTurn(` 恰 1 · `nextAfterSettle` 1/10 | **等价重锚**（计数只增；`requestTurn(` 恰 1 优先保持；新增调用点 ⇒ 更新 + 说明） | `⏳` |
| 7 | node | `test/turn-arbitration.test.ts` | 7（TA-8） | `ARBITRATION_RESULTS` 四值 + `KIND_SET` 40 / AI 撞车 `blocked:busy` | **保留 / 等价重锚**（提醒续轮撞车继承） | `⏳` |
| 8 | node | `test/op-three-tier.test.ts` | 族内 | `tierOf` 派生式三档 + `OP_TIER_TABLE` 物化 + 特权恒 `gesture` | **保留 + 加严**（工具参数项共享 `tierOf`；零第二档位表反证） | `⏳` |
| 9 | node | `test/proactivity-guard.test.ts` | 族内 | 六常量单源 + 越限真抑制 + 关断偏好 | **保留 / 等价重锚**（提醒不绕护栏；零第二阈值断言） | `⏳` |
| 10 | node | `test/sw-op-mirror.test.ts` | 族内 | `SW_OPS` ↔ `shared/op-table.ts` 双面一致 | **保留**（工具捕获 / 校验读同一单源） | `⏳` |
| 11 | node | `test/gate-integrity.test.ts` | 24 | Chromium 门禁字面表（**恰 9**）+ node 受审下界 | **等价重锚**（下界 ≥ 前值；`CHROMIUM_GATES === 9` 逐字不动） | `⏳` |
| 12 | node | `test/r8-open-next-entry.test.ts` | （R8 新） | R8-1~6：首开入口单源 / 复用 `'idle'` / 零死端 floor / 让位 firstRun | **保留**（首开保持确定性；**不得回归**） | `⏳` |
| 13 | node | `test/free-input-next.test.ts` | 22 | FIN-0~9：free-input provider 恒真 + 恒最末终端 + `op.turn` 槽 | **等价重锚**（恒真 → `configured` 分相；**已配置相仍恒常驻**） | `⏳` |
| 14 | node | `test/supersession-ledger.test.ts` | 53（F-36 收口） | 保护段 journey / binding；`law4InplaceRevision` | **保留 + 新增**（X-NDA-1~12 台账；保护段逐段决策） | `⏳` |
| 15 | node | `test/insight-no-escalation.test.ts` | 族内 | `../web-cli-base` 零 diff | **保留**（只复用 intercept 缝，零改基座） | `⏳` |
| 16 | node | `test/size-baseline.ts` / `test/size-ruling-vol3.test.ts` | 13 | 体积五要素 / 档位 / 生效上限 / 历史链节 | **等价重锚 / 新增登记**（逐叶五要素；旧条目保留；**B 列不计账**） | `⏳` |
| 17 | node | `test/next-dispatch-diff0.test.ts` | 族内 | 集 B 零 per-op 分支 + `ACT_TO_OP`/`OP_TO_ACT` 单源 | **保留**（候选 chip 经 `data-op` 单源分发） | `⏳` |
| 18 | node | `test/driver-terminals.test.ts` / `test/blocked-terminals.test.ts` | 族内 | 终端 / 阻止项契约 | **等价重锚**（未配置分相 + 兜底推荐落位） | `⏳` |
| 19 | Chromium | `test/ui/s0-self-driven.mjs` | 族内（R8 后） | 驱动式主验收面 | **等价重锚 + S0'''' 断言增量（只加断言不加文件）** | `⏳` |
| 20 | Chromium | `test/ui/recommendation.mjs` | （F-35 后 79） | chip 即指令 / pending 门控 / 系统行去噪 | **等价重锚**（工具候选渲染 / 分相终端；不新增文件） | `⏳` |
| 21 | Chromium | `test/ui/journey.mjs` | 171 | `#15c` 等（**保护段**） | **保留**（保护段逐段决策：`keep` 或八步取代） | `⏳` |
| 22 | Chromium | `test/ui/binding.mjs` | 192 | 诊断面（**保护段**） | **保留**（保护段逐段决策；字节中立或八步） | `⏳` |
| 23 | Chromium | `test/ui/l0.mjs` / `l1.mjs` / `no-dead-end.mjs` / `law8-plaintext.mjs` | 251 / 132 / 53 / 60 | 单写 / 输入面单一 / 零死端 / 法八四面 | **保留 / 等价重锚**（零死端只增必绿；法八零降级） | `⏳` |

> **间接 / 对账面（不计入上表主 23 行，但须逐条确认无遗漏）**：`test/op-protocol.test.ts` / `test/next-registry.test.ts` / `test/next-obligation-table.test.ts` / `test/ai-next-candidate.test.ts`（改写）/ `test/settings.test.ts` / `test/design-contract.test.ts`（契约计数）。**`CHROMIUM_GATES === 9` 不动**（**不新增 Chromium 门禁文件**）。**断言零删除零降级；`assertionsRemoved = 0`。**

---

## 10. 覆盖矩阵

### 10.0 缺口全景（**GAP-NDA-01~08**，本规范派生的规范化解构）

> **口径**：discovery 的 24 条问题（Q-NDA-001~024）在**需求层**可归约为 8 个**缺口面**；下表证明**无孤儿**（每缺口有 FR + AC 承载）。

| # | 缺口（需求层） | 由哪些 Q 归约 | 承载 FR | 承载 AC |
|---|---|---|---|---|
| **GAP-NDA-01** | **母问题**：next 产出机制与「LLM 驱动」原则脱钩（用错 LLM 能力） | Q-NDA-001 / 002 | FR-NDA-010~028 / 080~083 / 110 | AC-NDA-002 / 003 / 010 |
| **GAP-NDA-02** | **触发范围过窄**（只在有引用上下文产出） | Q-NDA-003 | FR-NDA-015 / 040~045 / 111 / 114 | AC-NDA-005 / 012 |
| **GAP-NDA-03** | **未配置 LLM 路径错位**（恒真自由输入终端） | Q-NDA-004 | FR-NDA-050~056 / 112 | AC-NDA-006 / 007 |
| **GAP-NDA-04** | **LLM 异常兜底链缺位**（无提醒 / 无系统兜底） | Q-NDA-005 / 008 / 009 / 010 | FR-NDA-060~076 / 113 | AC-NDA-008 / 009 |
| **GAP-NDA-05** | **F-36 正确资产误伤风险**（回归面） | Q-NDA-006 | FR-NDA-030~036 / 115 | AC-NDA-004 / 007 / 018 |
| **GAP-NDA-06** | **工具 schema / 落点 / 捕获未定**（结构核心） | Q-NDA-007 / 016 | FR-NDA-010~028 | AC-NDA-002 / 003 |
| **GAP-NDA-07** | **围栏块通道去留 + 规则位去留** | Q-NDA-011 / 015 | FR-NDA-042 / 080~083 / 114 | AC-NDA-005 / 010 |
| **GAP-NDA-08** | **门禁重锚 + `parity` + 体积 + 首开 + 留痕 + 法一/七/八/九一致性**（次生面） | Q-NDA-012 / 013 / 014 / 017 / 018 / 019 / 020 / 021 / 022 / 023 | FR-NDA-019 / 020 / 028 / 090~093 / 130~145 | AC-NDA-011 / 013 / 016 / 020~032 |

> **边界说明（避免误修）**：「外部竞品调研未执行」（Q-NDA-024 / O-NDA-011）与「门禁计数 / 体积值引自上游」（本轮零运行时验证）**不是**本 Feature 的缺口 ⇒ 前者登记为 NG-NDA-020，后者登记为 §2.2B 证据口径 + §9 全 `⏳`；「环境性 flake」（Q-NDA-023）登记为 EC-NDA-025 + FR-NDA-136，**不**当作产品缺口修。

### 10.1 问题覆盖矩阵（Q-NDA-001~024 → FR / AC 逐条可追溯）

| Q | 问题（要点） | 承载 FR | 承载 AC |
|---|---|---|---|
| **Q-NDA-001** | 母问题：next 产出机制与「LLM 驱动」原则脱钩 | FR-NDA-110 / 010~028 | AC-NDA-002 / 010 |
| **Q-NDA-002** | 产出机制错位：文本围栏块口述 ≠ function calling | FR-NDA-010~020 / 080~083 | AC-NDA-002 / 010 |
| **Q-NDA-003** | 触发范围过窄：只在有引用上下文产出 | FR-NDA-015 / 040~045 | AC-NDA-005 |
| **Q-NDA-004** | 未配置路径错位：恒真「自由输入」终端 | FR-NDA-050~056 | AC-NDA-006 / 007 |
| **Q-NDA-005** | LLM 异常兜底链缺位 | FR-NDA-060~076 | AC-NDA-008 / 009 |
| **Q-NDA-006** | F-36 正确资产误伤风险（校验链 / 分层 / `tierOf` / `aiNext` / 兜底 / 终端 / R6） | FR-NDA-030~036 / 115 | AC-NDA-004 / 007 / 018 |
| **Q-NDA-007** | `next` 工具 schema 与落点未定 | FR-NDA-010~014 / 021~024 | AC-NDA-002 / 003 |
| **Q-NDA-008** | 「提醒 LLM 补一次」无既有先例（基座无回合后钩子） | FR-NDA-061~066 | AC-NDA-008 |
| **Q-NDA-009** | LLM 异常判定口径未定 | FR-NDA-070~071 / 075 | AC-NDA-009 |
| **Q-NDA-010** | 系统兜底推荐形态未定 | FR-NDA-072~076 | AC-NDA-009 |
| **Q-NDA-011** | 围栏块通道去留未定 | FR-NDA-080~083 | AC-NDA-010 |
| **Q-NDA-012** | 门禁重锚 + `parity` 工具目录成本 | FR-NDA-020 / 082 / 116 / 117 / 130~137 | AC-NDA-016 / 020 / 024 / 026 |
| **Q-NDA-013** | 体积分列预算（距档 9,798 B） | FR-NDA-140~145 | AC-NDA-028 |
| **Q-NDA-014** | 已配置场景 free-input 终端不回归（分相判据） | FR-NDA-052 / 053 | AC-NDA-007 / 018 |
| **Q-NDA-015** | `ai-next` provider 规则位去留（`NEXTSTEP_PRIORITY` 恰 4） | FR-NDA-042 / 114 | AC-NDA-005 / 026 |
| **Q-NDA-016** | 候选来源与回合内工具面关系（纯协议工具，不触真实写） | FR-NDA-013 / 014 / 023 | AC-NDA-002 / 003 |
| **Q-NDA-017** | 留痕 / driver 三要素扩展（DQ 双向包含） | FR-NDA-028 | AC-NDA-013 |
| **Q-NDA-018** | 法八零明文口径保持（含工具参数） | FR-NDA-036 / NFR-NDA-004 | AC-NDA-014 / 022 |
| **Q-NDA-019** | 首开与 AI next 让位关系 | FR-NDA-090~093 | AC-NDA-011 |
| **Q-NDA-020** | 法一 / 法七 / 法九一致性 | FR-NDA-045 / 080~083 / 130~137 | AC-NDA-018~010 / 026 |
| **Q-NDA-021** | 「提醒补一次」防环 / 有界性 | FR-NDA-062 / 063 | AC-NDA-008 |
| **Q-NDA-022** | AI 候选可判性（纯函数 + 注入反证） | FR-NDA-030 / 105 / 106 | AC-NDA-001 / 021 |
| **Q-NDA-023** | 环境性 flake 家族被误读为回归（`KL-N-10`） | FR-NDA-136 | AC-NDA-025 |
| **Q-NDA-024** | 外部竞品调研未执行（如实登记） | NG-NDA-020 | —（非缺口） |

### 10.2 根因覆盖（discovery §0.2 A~H 关键事实 → FR）

| 根因 | 承载 FR |
|---|---|
| **A. 产出机制 = 围栏块口述 + 正则解析**（`ref-context.ts:52-59` / `ai-next.ts:58-87`） | FR-NDA-010~020 / 080~083 / 110 |
| **B. 触发只在有引用分支**（`ref-context.ts:97-100`；`providers.ts:162-175`） | FR-NDA-015 / 040~045 / 111 / 114 |
| **C. 未配置恒真 free-input 终端**（`providers.ts:217`） | FR-NDA-050~056 / 112 |
| **D. 无异常兜底**（`service-worker.ts:1027-1043` / `sidepanel.ts:4140-4152`） | FR-NDA-060~076 / 113 |
| **E. 上游底座（pressCandidate / driveAnsweredTurn / 三档 / 护栏 / 留痕）** | FR-NDA-006 / 030~036 / 130~137（**diff=0 / 保留**） |
| **F. function calling 底座已就位但未接线**（`llm.ts` + `runner.ts` `hooks.intercept`） | FR-NDA-010~028 |
| **G. F-36 plan 曾否决 tool-call（成本面）** | FR-NDA-020 / 117（**parity 成本如实继承**） |
| **H. 体积 / 门禁基线（距档 9,798 B / `ai-next-candidate` 钉死围栏块）** | FR-NDA-140~145 / 116 / 130~137 |

---

## 11. 开放点裁决落位表（O-NDA-001~014 → 条文）

> **口径**：编排器裁决（2026-09-27）**全部采纳 discovery 推荐项 + 逐条细化**；下表逐条落位并给出裁决记录（DC-NDA-001~014）。

| O | 开放问题（要点） | **裁决（编排器）** | 落位条文 | 裁决记录 |
|---|---|---|---|---|
| **O-NDA-001** | 命名与版本位 | **① 采纳**：树名 `specs-tree-web-cli-plugin-v55-f-next-drive-accuracy`（承 `v55-f-` 补丁级跟进轮惯例）+ Feature ID **F-37** + 版本位 **v0.11.4**（v0.11.0（F-33）主题的 patch 级跟进轮）；ROADMAP 登记**留给收口**（本阶段零 diff） | §1 元数据 · FR-NDA-001 · §14.1 | **DC-NDA-001** |
| **O-NDA-002** | **`next` 工具 schema 形态** | **① 采纳 + 细化**：工具名 **`next`**；`parameters = {type:'object', required:['candidates'], additionalProperties:false, properties:{candidates:{type:'array', maxItems:3, items:{type:'object', required:['opId','label'], properties:{opId, label, ref?, params?}}}}}`；与既有 `AiNextCandidate` **同构**；`maxItems ≤ MAX_CHIPS_PER_CARD = 3`；`opId` 可带 `enum`（**软约束**，由 `OP_IDS` 单源派生）；`description` 含三约束（仅回合结束 / 仅已注册 op / 不执行页面操作）。**权威判据 = 运行时 5 道校验链**（非 schema） | FR-NDA-010~014 · §5.2 | **DC-NDA-002** |
| **O-NDA-003** | **`next` 工具落点 / 如何捕获** | **① 采纳**：**插件侧注册**（`host.ts` 工具面或等价模块 ⇒ 出现在 `deriveTools()`）；经基座 **`hooks.intercept(tc, commandText)`** 捕获（返回**合成 `ToolResult`** ⇒ 跳过真实 dispatch）；**插件只接线，零改基座**（N-NDA-007） | FR-NDA-021~024 | **DC-NDA-003** |
| **O-NDA-004** | **「提醒 LLM 补一次」机制** | **① 采纳**：回合**正常结束但无 `next` 工具调用** ⇒ 插件侧发起**恰一次**带 nudge 的续轮（有界；`nudgeUsed` 事件作用域单布尔）；**越限 / 仍失败 ⇒ 直接进系统兜底**；防环（提醒轮不得再提醒 / 不绕护栏 / 不新增 `nextAfterSettle` 调用点）；`requestTurn(` 计数**等价重锚** | FR-NDA-060~066 · NFR-NDA-014 | **DC-NDA-004** |
| **O-NDA-005** | **「LLM 坏了」判定口径** | **① 采纳 + 细化**：异常判定**闭集三情**——`no-tool-call`（正常结束无工具调用且提醒用尽）/ `llm-failed`（`finish('llm-failed')` / 提醒轮失败）/ `all-blocked`（候选全被拦）；**复用既有失败面，词表不新写**；与 `llm.unconfigured` **分相**（未配置 vs 配置了但异常） | FR-NDA-070~071 / 075 | **DC-NDA-005** |
| **O-NDA-006** | **围栏块通道去留** | **① 采纳**：**替换**（单一产出通道，避免双通道漂移）；`NEXT_CONTRACT_GUIDANCE` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` 停止承载产出；**保留** `admitCandidate` / `validateAiNext` 校验链；「零新 LLM 往返」契约仍成立（工具调用在同一次回合内） | FR-NDA-080~083 · FR-NDA-121 | **DC-NDA-006** |
| **O-NDA-007** | **系统兜底推荐形态** | **① 采纳**：复用 **`op.llm-config`**（既有配置引导 op，`confirm` 档）；文案强调「**配置新的 LLM**」（切换 / 重配）；与未配置引导**共享 op、文案分相**；**确定性**（不依赖 LLM） | FR-NDA-072~076 | **DC-NDA-007** |
| **O-NDA-008** | **未配置时 free-input 终端显示分相** | **① 采纳**：新增「**是否配置 LLM**」**单源判据**（`configured`）；未配置 ⇒ **不显示**终端（确定性引导）；已配置 ⇒ **恒常驻**（R8 / F-35 不回归）；**不写第二份偏好键 / 第二配置真相** | FR-NDA-051~053 | **DC-NDA-008** |
| **O-NDA-009** | **首开（PD-ADN-001）转正与否** | **① 采纳**：**保持首开确定性**（不首屏依赖 LLM 往返）；未配置首开由「去配置 LLM」确定性引导承接；`PD-ADN-001` **不转正**，登记 `PD-NDA-001`（待后续轮） | FR-NDA-090~093 · NG-NDA-017 | **DC-NDA-009** |
| **O-NDA-010** | **规则位去留（`ai-next` 骑 `ref-action` vs 新位）** | **① 采纳 + 细化**：触发无条件后**不再骑 `ref-action` 位独占**；改为 **AI 驱动独立通道**（新规则位或「AI 优先于全部规则」的独立入口）；`NEXTSTEP_PRIORITY` 恰 4 **等价重锚**（**显式取代 + 台账 + 密度重锚**，**非放宽**） | FR-NDA-042 · FR-NDA-114 | **DC-NDA-010** |
| **O-NDA-011** | 外部竞品调研 | **① 采纳**：**不需要**（纯内部架构一致性问题，无外部对标必要）；**不得**据此外推（承 F-35 / F-36 同构裁决） | NG-NDA-020 | **DC-NDA-011** |
| **O-NDA-012** | 门禁处置 | **① 采纳**：先出**逐条重锚清单**（§9.5）；`ai-next-candidate` **改写（等价或更强）**；`parity` 新 `pluginExtra`；`CHROMIUM_GATES === 9` **不动**；保护段逐段决策（`keep` / 八步）；每条 **`assertionsRemoved = 0`**；改写 2 + 等价重锚 N + 保留 | FR-NDA-116 / 117 / 130~137 | **DC-NDA-012** |
| **O-NDA-013** | 校验 / 捕获 / 兜底执行位置 | **① 采纳**：**B 列优先（SW）**——工具捕获 / 解析 / 5 道校验 / 装配 / 提醒编排 / 异常判定 / 兜底接线在 `background`（旁路 sidepanel 档位压力）；面板只接收**已校验**候选并渲染；校验单源仍复用 `shared/op-table.ts`（双面镜像） | FR-NDA-024 · §5.14.1 | **DC-NDA-013** |
| **O-NDA-014** | 留痕 / driver 三要素 | **① 采纳**：复用 `driver=<id> \| timing=idle \| evidence=<参数字段名>` + `blocked=` / `suppressed=`；`evidence` 与**工具机制同源**；**零明文**（只含字段名）；DQ-1/DQ-3 双向包含保持 | FR-NDA-028 · NFR-NDA-016 | **DC-NDA-014** |

### 11.1 裁决记录（DC-NDA-001~014 理由一句话）

| # | 对应 | 理由（一句话） |
|---|---|---|
| **DC-NDA-001** | O-NDA-001 | 本 Feature 是 **v5.5 主题的 next 产出机制校正补丁级跟进** —— 不是新主题，也不并入 F-36 树（D7 禁止改写 F-36 产物），故 `-f-` + patch 版本位与先例同构。 |
| **DC-NDA-002** | O-NDA-002 | next 是**结构化产出契约**（非动作），用 `LlmToolDef.parameters` 表达最贴合模型原生 tool schema 能力；候选结构与既有 `AiNextCandidate` 同构 ⇒ 校验链入口零漂移（R-NDA-008 被消解）；`maxItems ≤3` 与 `MAX_CHIPS_PER_CARD` 单源；**schema 只是软约束**，权威仍在运行时校验链（否则「幻觉但 schema 合法」会绕过安全闸）。 |
| **DC-NDA-003** | O-NDA-003 | 基座 `hooks.intercept` 缝的注释**逐字点名先例**「next-actions 胶囊由此接入」（`runner.ts:51,158`）⇒ 捕获 `next` 工具调用**恰是该缝的设计用途**；返回合成 `ToolResult` 即可让基座 agent 循环继续（无需真执行），**零改基座**是硬红线下的唯一正解。 |
| **DC-NDA-004** | O-NDA-004 | 作者口径①要求「LLM 没调用 next 工具 ⇒ **提醒 LLM**，做好最后兜底」；基座在 assistant 无 `tool_calls` 时即 `finish('completed')`（无回合后钩子）⇒ 提醒只能在**插件侧**做；**必须有界恰一次**（R-NDA-002 高），否则会破 `proactivity` 有界性并可能自触发成环。 |
| **DC-NDA-005** | O-NDA-005 | 「LLM 始终无法给你 next（LLM 坏了等情况）」需**可判**：正常结束无工具调用 / 显式失败 / 输出全被拦是三类不同事实，必须闭集化；**词表不新写**（复用 `finish` 原因）以避免与 `llm.unconfigured` 形成第二词表（R-NDA-010），且「未配置」与「配置了但异常」是**不同分相**，不可混同（否则未配置用户会被推荐「配置新 LLM」而其实他从未配置）。 |
| **DC-NDA-006** | O-NDA-006 | 双通道（围栏块 + 工具）会带来**双产出语义漂移**与门禁不可判（哪个是权威？）⇒ 必须**单一产出通道**；「零新 LLM 往返」契约不受影响（工具调用在**同一回合**内，仍非新增调用）；校验链与载体解耦，可整体保留。 |
| **DC-NDA-007** | O-NDA-007 | 「推荐用户配置新的 LLM 等操作」在既有动作域里**有 op 可落**（`op.llm-config`，`confirm` 档）⇒ 零新增 op / 零新增动作；与未配置引导**同 op 分文案**避免第二引导面（NFR-NDA-013）；确定性（不依赖 LLM）才能覆盖「LLM 坏了」的相。 |
| **DC-NDA-008** | O-NDA-008 | 口径②「自由输入在没有 LLM 的场景下是不可行的」⇒ 未配置不显示终端；但 R8 / F-35 的「已配置 ⇒ 流内输入即 next」是**既有成果**，**不得**被未配置分相误伤 ⇒ 必须以「**是否配置 LLM**」为**唯一分相判据**（单源，不写第二偏好键，R-NDA-003 高）。 |
| **DC-NDA-009** | O-NDA-009 | 首屏可达性是 R8 刚立的地板；若首开依赖 LLM 往返，则网络 / 延迟 / 失败会**直接**影响首屏（可达性倒退）⇒ 首开保持确定性；AI 初始 next 作为后续轮增强（`PD-NDA-001`），本轮**不转正**。 |
| **DC-NDA-010** | O-NDA-010 | P2 裁决「无条件触发」后，`ai-next` 原骑的 `ref-action` 位在**无引用时恒假** ⇒ 候选「无处落」；故必须改为**独立通道**；`NEXTSTEP_PRIORITY` 恰 4 是「推荐不是列表」立法载体 ⇒ **等价重锚**（显式取代 + 台账 + 密度重锚），**绝不放宽**（R-NDA-007）。 |
| **DC-NDA-011** | O-NDA-011 | 本问题是**纯内部架构一致性**（「next 产出机制与已立法原则脱钩」），外部产品的 AI 推荐表述**不可核**且不构成判据；仓库内已有可核先例（`hooks.intercept` 注释 / `ask-user` 纯协议工具 / 5 道校验链）⇒ 调研不执行，且**不得**据此外推（承 F-35 / F-36 同构）。 |
| **DC-NDA-012** | O-NDA-012 | 判据必须落在**纯函数捕获 / 校验 + 注入反证**（LLM 输出不确定 ⇒ 门禁不能断言输出，R-NDA-011）；`ai-next-candidate` 的 AI-N-1 钉死的是**已被推翻的机制** ⇒ 必须改写为钉死新机制，且**断言只增**（否则门禁静默降强度，R-NDA-005 高）；`parity` 是新增工具的**已知成本**（COR-NDA-2），如实登记为 `pluginExtra`（reason + basis）。 |
| **DC-NDA-013** | O-NDA-013 | 距档仅 **9,798 B**（薄），而捕获 / 校验 / 提醒 / 兜底是**新增逻辑主体**；SW 已持有 LLM 输出与 `op-table` 镜像（`SW_OPS` / `sw-op-mirror` 先例）⇒ 放 B 列（`background.js` 不计 sidepanel 账本）是**旁路档位压力**的唯一低风险选择；校验单源仍在 `shared/op-table.ts`（双面镜像不破）。 |
| **DC-NDA-014** | O-NDA-014 | `DRIVER_DECLS_SRC` 是**手写第二源**、与 provider 集合互为**双向包含**判据（DQ-1），刻意保留「声明 ↔ 注册表漂移」可见失败面 ⇒ 机制换轨后 `evidence` 面须与**工具机制同源**，否则门禁必红；留痕零明文是法八红线（N-NDA-009）。 |

---

## 12. 与 F-36 的取代台账（`X-NDA-1~12`，**取代 / 保留 / 未发生** → 判据等价重写映射表）

> **口径**：**「显式取代」≠「放宽」** —— 判据必须**等价重锚**（断言力不降、计数只增），并留台账（FR-NDA-122 / 132）。**本 Feature 是「产出机制换轨」，故取代是显式的**（不静默改写）；**未发生者如实登记 `no-supersession`**。**F-36 产物零改写**（N-NDA-005）。

| X | F-36 既有形态（现状逐字） | 本 Feature 处置 | 等价重写判据（**不得放宽**） | 状态 |
|---|---|---|---|---|
| **X-NDA-1** | **产出机制 = 文本尾随 `next` 围栏块 + 严格 JSON + SW 正则解析**（`ref-context.ts:52-59`；`ai-next.ts:58-87`；F-36 plan PD-ADN-002 方案 A） | **取代**：`next` 工具（function calling）+ `hooks.intercept` 捕获 + 合成 `ToolResult`；围栏块提示与解析停止承载产出 | 工具 schema 结构与 `AiNextCandidate` 同构；5 道校验链**整体保留**；反证「围栏块仍能产出 ⇒ 必红」；台账 old→new 逐字 | **已发生**（叶1） |
| **X-NDA-2** | **触发只在有引用上下文**（`ref-context.ts:97-100`；`ai-next` 骑 `ref-action`；F-36 plan PD-ADN-005） | **取代**：无条件（配置 LLM ⇒ 对话结束即驱动）；产出提示不再限定有引用分支 | 反证「无引用回合 ⇒ 仍驱动」；未配置仍不驱动；台账 old→new | **已发生**（叶1） |
| **X-NDA-3** | **未配置 ⇒ 恒真「自由输入」终端**（`providers.ts:205-221,217`） | **取代**：分相 —— 未配置 ⇒ 不显示终端（确定性「去配置 LLM」引导）；已配置 ⇒ 恒常驻 | 两相判据均**非恒真**；反证「未配置仍显示 ⇒ 必红」+「已配置删终端 ⇒ 必红」；台账 old→new | **已发生**（叶2） |
| **X-NDA-4** | **无 LLM 异常兜底**（`service-worker.ts:1027-1043`；`sidepanel.ts:4140-4152`） | **新增**：提醒补一次（有界）→ 仍失败 ⇒ 系统兜底推荐「配置新的 LLM」；F-36「未配置 ⇒ 纯确定性」**保持** | 新增判据（**非删除既有**）；反证「提醒无界 / 兜底缺失 ⇒ 必红」；台账（新增项） | **已发生**（叶2） |
| **X-NDA-5** | **`ai-next` provider 骑 `ref-action` 位**（`providers.ts:162-175`） | **等价重锚**：改 AI 驱动独立通道 / 新位；`NEXTSTEP_PRIORITY` 恰 4 等价重锚（**非放宽**） | 规则位判据可 FAIL；`recommendation-sources` 重锚而非删除；反证「无引用时 AI 候选无处落 ⇒ 必红」 | **已发生**（叶1） |
| **X-NDA-6** | **F-36 正确资产**：5 道校验链（`ai-next.ts:98-158`）/ `admitCandidate` vs `pressDecision` 分层 / `tierOf` 单源 / `chat-result.aiNext` type-only 加法字段 / 确定性退居兜底 + R8 floor / **已配置时** free-input 恒常驻 / R6 同因去重扩展 / 留痕零明文 / 护栏六常量 | **保留（keep）**：逐条登记 `no-supersession` | 九条各自判据绿；反证「删任一项 ⇒ 必红」；台账 9 行 `keep` | **未发生取代**（叶1 + 叶2） |
| **X-NDA-7** | **门禁 `ai-next-candidate` 的 AI-N-1 钉死围栏块解析**（`test/ai-next-candidate.test.ts:8,78`） | **改写（等价或更强）**：钉「工具调用捕获 + 5 道校验链 + 判定分层 + 提醒有界 + 真源切片」 | 门禁前后断言对账（无减少项）；`assertionsRemoved = 0`；反证「删 AI-N-1 而不补等价 ⇒ 必红」 | **已发生**（叶1） |
| **X-NDA-8** | **`parity` 工具目录**：`deriveTools()` 名字集对 `baseline-catalog.json`；新增工具需 `pluginExtra`（reason + basis）（`parity.test.ts:168,183-248`） | **等价重锚**：新增 `next` 条目 + `toolCount` 增量；旧条目逐字保留 | `parity` 绿 + 新条目可判；反证「无 `pluginExtra` ⇒ 必红」 | **已发生**（叶1） |
| **X-NDA-9** | **时机源恰 5（复用 `'idle'`）**（`drivers.ts:31-36`；DT-2/DT-3） | **保持**（未发生取代）：仍复用 `'idle'`；**零新增触发词** | DT-2（恰 5）/ DT-3（旧 4 逐字）绿；反证「新增第 6 词 ⇒ 必红」；台账 `no-supersession` | **未发生取代**（叶1） |
| **X-NDA-10** | **首开保持确定性**（F-36 `PD-ADN-001` deferred；`maybeRecommendOpenEntry` 复用 `'idle'`） | **保持**（**不转正**）；未配置首开由「去配置 LLM」引导承接；登记 `PD-NDA-001` | R8 入口判据绿；零双卡判据绿；台账 `no-supersession` | **未发生取代**（叶2） |
| **X-NDA-11** | **`requestTurn(` 恰 1 / `maybeRecommend` 1 定义 8 调用点 / `nextAfterSettle` 1 定义 10 调用点** | **等价重锚**：提醒续轮若新增调用点 ⇒ 计数只增 + 说明；`requestTurn(` 恰 1 优先保持 | `op-wiring` / `driver-timings` / `driver-quadruple` 判据可 FAIL；台账 old→new | **预登记**（触发 = 提醒续轮通道形态；落地 = 叶2） |
| **X-NDA-12** | **围栏块协议的「零新 LLM 往返」契约**（复用同一次回合输出，F-36 A-4） | **保持**（未发生取代）：工具调用在**同一回合内** | 主链零新增网络断言绿；台账 `no-supersession` | **未发生取代**（叶1） |

> **边界**：**任何 X 项都不得以「放宽阈值 / 删除断言 / 静默改常量」的方式落地**；默认优先「**等价重锚（断言力不降）**」的读法，只有当等价重锚被证不可行时才显式放宽并留台账（FR-NDA-122）。**未发生取代须如实登记 `no-supersession`。**

### 12.1 与 F-36 的 FR 取代台账（**取代哪些 FR / 保留哪些 FR**）

> **口径**：F-36 的 FR 编号为 `FR-ADN-*`；本 Feature **不复用**其编号，以 X-NDA 台账显式登记「取代 / 保留 / 扩展」关系（承 F-36 §12 之于 F-35 的处置方式）。

| F-36 段 | F-36 FR | 处置 | 本 Feature 承载体 |
|---|---|---|---|
| CHAN（产出通道） | FR-ADN-010（时机 `'idle'`） | **保留**（时机词不变） | FR-NDA-043 / 118 |
| CHAN | FR-ADN-011（载体 `chat-result` 加法字段） | **保留**（载荷面不变） | FR-NDA-016 / 019 |
| CHAN | FR-ADN-012（候选结构 `{opId,label,ref?,params?}`） | **保留 + 落到工具 schema** | FR-NDA-011 |
| CHAN | FR-ADN-013（产出者声明三要素） | **保留 + evidence 与工具同源** | FR-NDA-028 |
| CHAN | FR-ADN-014（`ai-next` provider `rule: ref-action`） | **取代**（无条件 ⇒ 独立通道） | FR-NDA-042 / 114 / X-NDA-5 |
| CHAN | FR-ADN-015（注入槽 `session.aiNext`） | **保留** | FR-NDA-016 / 115 |
| CHAN | FR-ADN-016（解析 + 校验在 SW / B 列） | **保留 + 扩到捕获** | FR-NDA-024 / 115 |
| CHAN | FR-ADN-017（零新 LLM 调用） | **保留**（主链）；提醒轮为有界例外 | FR-NDA-017 / 121 / NFR-NDA-015 |
| CHAN | FR-ADN-018（载荷只增不改） | **保留** | FR-NDA-019 / 122（N-NDA-029 同义） |
| CHAN | FR-ADN-019（未配置 ⇒ 无候选） | **保留 + 扩展**（加确定性引导） | FR-NDA-018 / 050~056 |
| VERIFY | FR-ADN-020~029（5 道校验链） | **整体保留**（输入改工具参数项） | FR-NDA-030~036 / 115 / X-NDA-6 |
| TIER | FR-ADN-030~035（判定分层） | **整体保留**（diff=0） | FR-NDA-030 / 033 / 036 / 115 |
| FALLBACK | FR-ADN-040~046（确定性退居兜底） | **保留**（除 FR-ADN-043 未配置语义被扩展） | FR-NDA-044 / 045 / 115 |
| FALLBACK | FR-ADN-043（未配置 ⇒ 纯确定性现状逐字） | **扩展**（未配置 ⇒ 确定性「去配置 LLM」引导 + 不显示自由输入） | FR-NDA-050~056 / X-NDA-3 |
| FALLBACK | FR-ADN-041 / 042（free-input 恒常驻 / floor） | **取代 + 保留**（分相；已配置相恒常驻；floor 语义不变） | FR-NDA-051~052 / X-NDA-3 |
| MERGE | FR-ADN-050~056（合并 / 优先级 / 去重 / 上限） | **保留**（除 FR-ADN-052 规则位被等价重锚） | FR-NDA-042 / NFR-NDA-013 |
| GUARD | FR-ADN-060~065（六常量 / 提案不耗预算 / 关断） | **保留** | NFR-NDA-012 / 013；FR-NDA-063 |
| OPEN | FR-ADN-070~073（首开确定性） | **保留**（且未配置首开由引导承接） | FR-NDA-090~093 / X-NDA-10 |
| S0''' | FR-ADN-080~085（S0''' 四支线） | **取代为 S0'''' 五支线**（新增提醒 / 兜底 / 未配置引导） | FR-NDA-100~106 |
| SUPERSEDE | FR-ADN-090~101（X-ADN 台账） | **保留在 F-36 树内不改**；本 Feature 自建 X-NDA-1~12 台账 | §5.12 / §12 / FR-NDA-132 |
| GATE | FR-ADN-110~117 | **保留在 F-36 树内不改**；本 Feature 自建 GATE | FR-NDA-130~137 |
| VOL | FR-ADN-120~125 | **保留在 F-36 树内不改**；本 Feature 自建 VOL | FR-NDA-140~145 |
| **无对应**（F-36 缺口） | —— | **新增**：产出机制换轨（工具）/ 无条件触发 / 未配置引导 / 提醒 / 异常判定 / 系统兜底 | FR-NDA-010~028 / 040~045 / 050~056 / 060~076 |

> **确定性结论**：F-36 的 **24 条 CHAN~MERGE FR 中，18 条保留 / 4 条取代 / 2 条扩展**；**新增 47 条 FR-NDA**（GOV 7 + TOOL 11 + CAPTURE 8 + VERIFY-KEEP 7 + UNCOND 6 + UNCONF 7 + NUDGE 7 + ABNORMAL 7 + FENCE 4 + OPEN 4 + S0'''' 7 + SUPERSEDE 13 + GATE 8 + VOL 6 = 102，其中与 F-36 保留面重叠的以「保留」登记，不重复计数）。**取代台账与判据重锚同轮完成**（FR-NDA-122）。

---

## 13. 红线表（N-NDA-001~020 编成 + N-NDA-021~030 spec 新增）

### 13.1 红线编成（**自 discovery §1.4 非目标 + §5.2 风险 + 编排裁决红线，逐条来源可核**）

> **口径**：discovery **未**给出 `N-*` 编号清单（与 F-34 / F-35 / F-36 discovery 同构）⇒ 本节把 discovery 已明示的红线约束**编成编号表**并标注来源；**不新增 discovery 未表达的约束**（新增项一律入 §13.2）。

| # | 红线（**逐字口径**） | 来源（discovery / 上游） | 本规范承载 |
|---|---|---|---|
| **N-NDA-001** | `dist/content.js` = **177,076 B**（**零容差**） | §1.4 非目标 + F-36 收口 | FR-NDA-142 / AC-NDA-027 / NG-NDA-007 |
| **N-NDA-002** | `dist/pick-layer.js` = **34,358 B**（**零容差**） | §1.4 非目标 + F-36 收口 | FR-NDA-142 / AC-NDA-027 / NG-NDA-007 |
| **N-NDA-003** | **`KIND_SET` 40 项逐字不增**；新载体走 **type-only 先例** | §1.4 非目标（12 kind 零宿主） | FR-NDA-016 / NFR-NDA-007 / NG-NDA-009 |
| **N-NDA-004** | **12 kind 契约不动**；**零新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []`） | §1.4 非目标 + F-36 N-ADN-004 | FR-NDA-016 / NFR-NDA-007 / NG-NDA-009 |
| **N-NDA-005** | **上游产物零改写**：F-36 / F-35 / F-34 / F-33 / F-32 / R8 / v4.5 / v4 / v5 / v5.5 产物**原样保留**；**唯一授权例外 = X-NDA-1~5 的显式取代登记 + old→new 台账** | D7 + §1.4 非目标 | FR-NDA-005 / 110~114 / 132 / NG-NDA-006 |
| **N-NDA-006** | **X-NDA-1~5 取代必须走 supersession 台账 old→new**（逐字 old / 逐字 new / 理由 / 日期 / 落点）；**禁静默改写** | §5.2 R-NDA-001 + 编排裁决 | FR-NDA-110~114 / 132 / AC-NDA-022 |
| **N-NDA-007** | **`packages/web-cli-base/**` 零 diff**（跨包硬红线；**只复用** function calling + `hooks.intercept`） | §1.4 非目标 + §0.2-F | NFR-NDA-005 / AC-NDA-029 / NG-NDA-005 |
| **N-NDA-008** | **已配置 LLM ⇒ free-input 终端恒常驻**（R8 / F-35 保底）：任何推荐卡必有终端（恒最末，非 `.next-chip`） | §1.4 非目标 + F-36 N-ADN-008 | FR-NDA-052 / AC-NDA-007 / NG-NDA-015 |
| **N-NDA-009** | **法八零明文不退化**：流内 payload / digest / 审计 / DOM **四面零明文**；候选 `label` / `params` / **工具参数** / 留痕不回显值 | §1.4 非目标 + F-36 N-ADN-009 | FR-NDA-036 / NFR-NDA-004 / NG-NDA-011 |
| **N-NDA-010** | **AI 候选不得自造 op / 不得绕过注册表**：opId 必须 ∈ 9 op；`pressCandidate` 铁律① 保持 | §5.2 R-NDA-001 + `ai-drive.ts:8` | FR-NDA-031 / NFR-NDA-002 / NG-NDA-010 |
| **N-NDA-011** | **特权 op 恒 `gesture`**：`op.authorize` / `op.perm.request` 是**恰 2** 必须用户手势者；AI **不可自动执行 / 不可代答** | §1.4 非目标 + F-36 N-ADN-011 | FR-NDA-032 / 033 / NFR-NDA-002 / 003 |
| **N-NDA-012** | **断言零删除零降级、计数只增不减**（唯一例外 = 保护段按台账显式取代并留痕） | §1.4 非目标 + §5.2 R-NDA-005 | FR-NDA-004 / 130 / NG-NDA-019 |
| **N-NDA-013** | **`authorConfirmation.status = pending-author-line` 属未闭合义务**；任何文档 / 台账**不得**伪称体积档位已确认；升档须走 EC 显式路径 | 上游 + §5.2 R-NDA-006 | FR-NDA-143 / EC-NDA-016 / NG-NDA-021 |
| **N-NDA-014** | **`F-29`（A2A 候选）未立项未排期，保持原样不动**（ROADMAP 相关区段**一字不动**） | §1.4 非目标 | NG-NDA-020 / §16 第 2 条 |
| **N-NDA-015** | **保护段必须逐段决策**：journey `[43484,59347)` / sha `7b309258…`；binding `[107780,115930)` / sha `be9ad0e9…`；哈希变更**必须台账留痕**、**禁静默改写** | §5.2 R-NDA-005 + 上游 | FR-NDA-133 / AC-NDA-023 |
| **N-NDA-016** | **判定分层不得混同**：`admitCandidate`（接受层）与 `pressDecision`（按下层）**必须**分离；`gesture` **不得**与 `confirm` 混同（gesture 连接受都拒） | F-36 §12 + §0.2-F | FR-NDA-033 / 036 / NFR-NDA-014 |
| **N-NDA-017** | **consent / `gesture` 不得被 AI 代答**（含 `confirm` 档候选的 consent 与系统兜底推荐） | §1.4 非目标 + 红线⑥ | FR-NDA-033 / 076 / NFR-NDA-003 / NG-NDA-010 |
| **N-NDA-018** | **判定链零触碰**：`src/security/policy.ts` / `auto-authorize.ts` 在 `zeroDiffFiles` 冻结（9 项） | §1.4 非目标 | NFR-NDA-005 / AC-NDA-029 / NG-NDA-008 |
| **N-NDA-019** | **门禁严格串行**（一次一个 Chromium，绝不并发）；`CHROMIUM_GATES === 9` 不动 | F-35 / F-36 N-* | FR-NDA-135 / 136 / NFR-NDA-012 |
| **N-NDA-020** | **纪律**：不碰 `main`、不 force push、path-limited `git add`、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖；`.sddu` 外零触碰；不合 main、不发布 | D6 + §0.3 约束 | §16 纪律表 / FR-NDA-003 |

### 13.2 spec 新增红线（**本规范新增，与 N 同等级**）

| # | 红线（**本规范新增，逐字口径**） | 依据 | 承载 |
|---|---|---|---|
| **N-NDA-021** | **AI 候选校验链不可旁路**：任何 AI 候选进入 chips / 执行前**必须**过 5 道校验；「未经校验的 AI 候选被渲染或执行」⇒ FAIL | FR-NDA-027 / 030 / Q-NDA-006 | AC-NDA-003 / 004 / NFR-NDA-009 |
| **N-NDA-022** | **产出通道单源**：`next` 工具是**唯一**产出载体；围栏块 / 第二解析器 / 第二工具入口 ⇒ FAIL | FR-NDA-010 / 080 / Q-NDA-002 / 011 | AC-NDA-002 / 010 |
| **N-NDA-023** | **schema 不得替代运行时校验**：以「schema 合法」为由放行未过运行时校验链的候选 ⇒ FAIL | FR-NDA-012 / R-NDA-008 | AC-NDA-003 |
| **N-NDA-024** | **提醒有界**：提醒**恰一次**；「提醒两次 / 递归续轮 / 自触发」⇒ FAIL | FR-NDA-062 / 063 / Q-NDA-021 | AC-NDA-008 / EC-NDA-021 |
| **N-NDA-025** | **未配置不得显示自由输入**：未配置 LLM 时推荐卡含 `.next-terminal` ⇒ FAIL | FR-NDA-051 / Q-NDA-004 | AC-NDA-007 / EC-NDA-010 |
| **N-NDA-026** | **未配置不得被推荐「配置新 LLM」**（词表分相）：把「未配置」与「配置了但异常」混同 ⇒ FAIL | FR-NDA-071 / R-NDA-010 | AC-NDA-009 / EC-NDA-009 |
| **N-NDA-027** | **兜底门禁必绿且禁恒真**：`r8-open-next-entry` / `free-input-next` / `no-dead-end` 必绿；每条判据必须有双向反证与三段控制；**恒真断言 ⇒ 视为缺陷** | FR-NDA-045 / 105 | AC-NDA-007 / 021 |
| **N-NDA-028** | **首开零 LLM 依赖**：首开 / ready 路径**不得**因机制换轨引入 LLM 往返依赖；首屏必有引导 / 终端 ⇒ 违反即 FAIL | FR-NDA-090~092 / Q-NDA-019 | AC-NDA-011 / EC-NDA-024 |
| **N-NDA-029** | **载荷加法字段缺席时行为逐字不变**：`aiNext` 缺席 ⇒ 面板 / 推荐行为与现状**逐字一致**（向后兼容不可破）⇒ 违反即 FAIL | FR-NDA-019 | AC-NDA-002 / 017 |
| **N-NDA-030** | **未发生取代如实登记**：X-NDA 项未取代者必须登记 `no-supersession` + 理由；**留空 / 伪造「已取代」⇒ FAIL** | FR-NDA-122 / 132 | AC-NDA-022 / 020 |

---

## 14. 子 Feature 拆分与交付顺序

### 14.1 结构裁决（**2 叶，依存序，串行**）

**裁决（DC-NDA-002 / DC-NDA-010 / DC-NDA-013 + discovery §6.3）**：本 Feature 拆 **2 叶**，**必须串行** `nda-1 → nda-2`；叶目录**直接嵌套**于父目录下（**不使用 `children/` 中间层**，目录树即特性树）：

```
specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/
├── discovery.md                              # 问题挖掘（已入库）
├── spec.md                                   # 本文件（父级完整规范）
├── TREE.md / state.json                      # 导航 / 状态（父 = 轻量规范容器）
├── specs-tree-nda-1-next-tool-channel/       # 叶1 = 产出机制换轨（next 工具）+ 无条件触发 + 校验链接入（首叶，机制核心）
└── specs-tree-nda-2-fallback-and-gates/      # 叶2 = 未配置引导 + 提醒 / 异常兜底 + 首开 + 体积 + 门禁重锚（末叶，依赖叶1）
```

**为什么必须「先立工具通道与安全闸、再收未配置 / 异常兜底与门禁口径」（三条论证，供 plan / 后续轮复核）**：

1. **安全先行（决定性）**：AI 候选一旦能经工具调用进 chips / 被按下，**5 道校验链接入必须先就位** —— 若先接工具产出、后补校验，中间态会**裸放**工具参数触达特权 / 不可逆面（R-NDA-001 / R-NDA-008）。叶1 一次交付「工具通道 + 捕获 + 5 道校验（保留接入）+ 判定分层 + 围栏块替换」，中间态即**安全可达**。
2. **风险面不同**：叶1 的风险面 = **工具 schema / 捕获正确性 / 校验链入口漂移 / 围栏块替换 / parity 门禁**（机制正确性）；叶2 的风险面 = **未配置分相回归 / 提醒有界性 / 异常判定词表漂移 / 兜底可达 / 首开可达性 / 体积 / 门禁与保护段**（结构性与治理）。耦在一轮会让「机制正确性」与「门禁重锚」互相掩盖（承 F-34 / F-35 / F-36 §14.1 同构论证）。
3. **体积必须分列 + 责任相反**：叶1 主要是 **A 列薄接线 + B 列捕获 / 校验主体**（B 列不计账）；叶2 是 **A 列分相 / 兜底接线 + 重锚**；混算会抵成一笔、**无法定位归因**（FR-NDA-144 / 145）。验收锚层次也不同：叶1「工具调用被捕获 / 合法候选被采纳 / 非法候选被拦且留痕 / 围栏块不再产出」；叶2「未配置不显示自由输入 / 已配置终端恒在 / 提醒有界 / 兜底可达 / 首开确定性 / 门禁强度不降」。

> **备选评估（如实登记，不推荐）**：**3 叶（nde-1 工具通道 / nda-2 未配置 + 异常兜底 / nda-3 门禁 + 体积 + 首开）**—— 会使「未配置分相」与「异常兜底」拆到两叶，而二者共享**同一分相判据（`configured`）**与**同一兜底 op（`op.llm-config`）**，拆分反而制造跨叶耦合与二次重锚；**单叶 + 内部分组**——会在同一轮内同时承担「工具机制 + 校验安全语义」与「未配置 + 提醒 + 兜底 + 门禁 + 保护段」两类风险，且无法证明中间态安全（S0'''' 支线 B/C 无法独立验收）；体积亦无法分列。故 **均不采纳**，取 **2 叶**（承 F-35 / F-36 先例）。

### 14.2 交付顺序与叶职责

| 序 | 叶 | 职责（交付形态） | 依赖 | 承载 FR |
|:-:|---|---|---|---|
| 1 | `specs-tree-nda-1-next-tool-channel`（**机制叶 / 首叶**） | **`next` 工具注册（schema）** + **`hooks.intercept` 接线与捕获**（合成 `ToolResult`）+ **5 道校验链保留接入**（工具参数项）+ **判定分层保持** + **触发范围无条件**（不再只并入有引用分支）+ **`ai-next` 规则位等价重锚** + **围栏块通道替换**（提示与解析停止承载）+ `chat-result.aiNext` 装配保持 + `DRIVER_DECLS_SRC` / 留痕保持 + **`parity` 新 `pluginExtra` 条目** + **`ai-next-candidate` 门禁改写** + **S0'''' 主线 A / 支线 B 的 node 面** | —（P0，底座） | GOV 001~007 · TOOL 010~020 · CAPTURE 021~028 · VERIFY-KEEP 030~036 · UNCOND 040~045 · FENCE 080~083 · S0'''' 100~103 / 105 / 106（主线侧）· SUPERSEDE 110 / 111 / 114~118 / 121 · GATE 130~137（改写门禁 + 反证族）· VOL 140~145（B 列归因） |
| 2 | `specs-tree-nda-2-fallback-and-gates`（**兜底与判据叶 / 末叶**） | **未配置 ⇒ 确定性「去配置 LLM」引导** + **自由输入分相**（未配置不显示 / 已配置恒常驻；分相判据单源）+ **提醒补一次（有界恰一次）+ 防环** + **LLM 异常判定闭集** + **系统兜底推荐「配置新 LLM」** + **首开边界落地（保持确定性）** + 🆕 **S0'''' 支线 C/D/E 终态** + **体积逐叶重登记** + **门禁逐条等价重锚（含保护段决策）** + **`X-NDA-1~12` 台账终态** | `specs-tree-nda-1-next-tool-channel` | UNCONF 050~056 · NUDGE 060~066 · ABNORMAL 070~076 · OPEN 090~093 · S0'''' 100~104（终态侧）· SUPERSEDE 112 / 113 / 119 / 120 / 122 · GATE 130~137（重锚终态 + 保护段）· VOL 141~145（终态侧） |

> **父 Feature** = 轻量规范容器（承 v3-ui / v4-chat / v4.5 / v5 / v5.5 / F-34 / F-35 / F-36 先例：父 `phase=tasked`、`agent=sddu-tasks`，**不承接 build/review/validate**，不产父层 `tasks.json`）。

### 14.3 FR → 叶 覆盖矩阵（**每条 FR 恰属一叶的「主责面」；共享面另标**）

| FR 段 | FR 编号 | 主责叶 | 共享面 |
|---|---|---|---|
| GOV（立案 / 结构 / 纪律） | FR-NDA-001~007 | **叶1**（父级结构 + 纪律，共享面在此一次做完） | 叶2 引用 002 / 004 / 005 / 006 |
| TOOL（工具产出通道） | FR-NDA-010~020 | **叶1** | 叶2 引用 016 / 019 |
| CAPTURE（intercept 捕获 / 装配） | FR-NDA-021~028 | **叶1** | 叶2 引用 026（分相 / 兜底装配接线） |
| VERIFY-KEEP（5 道校验链 / 分层） | FR-NDA-030~036 | **叶1** | 叶2 引用 036（兜底留痕接线） |
| UNCOND（触发无条件） | FR-NDA-040~045 | **叶1** | 叶2 引用 044 / 045（兜底终态） |
| UNCONF（未配置确定性引导） | FR-NDA-050~056 | **叶2** | 叶1 引用 050 / 056（骨架） |
| NUDGE（提醒补一次） | FR-NDA-060~066 | **叶2** | 叶1 引用 064（计数重锚） |
| ABNORMAL（异常判定 + 系统兜底） | FR-NDA-070~076 | **叶2** | 叶1 引用 071（词表分相骨架） |
| FENCE（围栏块替换） | FR-NDA-080~083 | **叶1** | — |
| OPEN（首开边界） | FR-NDA-090~093 | **叶2** | — |
| S0''''（首验收） | FR-NDA-100~106 | **叶1**（100 / 101 / 102 / 105 / 106 主线侧）/ **叶2**（103 / 104 + 终态侧） | 共享 100 / 105 |
| SUPERSEDE（X 映射） | FR-NDA-110~122 | **叶1**（110 / 111 / 114~118 / 121）/ **叶2**（112 / 113 / 119 / 120 / 122） | 共享 122 |
| GATE（门禁 / 台账） | FR-NDA-130~137 | **叶1**（改写门禁 / 反证族 / 串行纪律 / 对账表骨架）/ **叶2**（等价重锚 + 保护段 + 台账终态） | 共享 130~137 |
| VOL（体积分列） | FR-NDA-140~145 | **叶1** 出表 + B 列归因 / **两叶各自收口实测登记** | 共享预算表（140~142） |

---

## 15. 风险登记（discovery 继承 R-NDA-001~013 + spec 新增 R-NDA-901~910）

### 15.1 继承风险（discovery §5.2，逐条保留等级与预登记证据）

| # | 风险 | 等级 | 承载条文 / 应对 |
|---|---|:--:|---|
| **R-NDA-001** | 换机制时**误伤** F-36 校验链 / 分层 / 合并口径 ⇒ AI 候选裸奔（幻觉 op / 特权 op）或 R8 回归 | **高** | FR-NDA-030~036 / 115；AC-NDA-004；N-NDA-021；**校验链先于任何候选接受；`gesture` 恒拒；纯函数校验器 + 注入反证必红** |
| **R-NDA-002** | 「提醒补一次」引入**自触发环**或破 `proactivity` 有界性 | **高** | FR-NDA-062 / 063；AC-NDA-008；N-NDA-024；**恰一次 + 防环 + 不绕护栏** |
| **R-NDA-003** | 「未配置不显示自由输入」误波及**已配置**场景 ⇒ 破 R8 / F-35 的流内输入成果 | **高** | FR-NDA-051~053；AC-NDA-007；N-NDA-008 / 025；**分相判据单源 + 双相反证** |
| **R-NDA-004** | 新增 `next` 工具撞 **`parity` 工具目录门禁**（`pluginExtra` / `baseline-catalog.json` / `toolCount`） | **中高** | FR-NDA-020 / 117；AC-NDA-016；**先出 `parity` 新条目（reason + basis）+ 旧条目逐字保留** |
| **R-NDA-005** | `ai-next-candidate` 门禁（AI-N-1 钉死围栏块）**须替换** ⇒ 门禁静默降强度 | **高** | FR-NDA-082 / 116；AC-NDA-010 / 020；N-NDA-012；**改写为等价或更强 + `assertionsRemoved = 0`** |
| **R-NDA-006** | 体积越档位（距档 9,798 B；工具 + 兜底链 + 提醒轮） | **中高** | FR-NDA-140~145；AC-NDA-028；EC-NDA-016；**B 列优先（SW）+ 先出分列预算 + 逐叶重登记 + 2.8× 最坏预置升档路径** |
| **R-NDA-007** | 「无条件触发」破 `NEXTSTEP_PRIORITY 恰 4` / `driver-timings 恰 5` 等既有计数（须等价重锚） | **中高** | FR-NDA-042 / 043 / 114 / 120；AC-NDA-005 / 026；**等价重锚（判据可 FAIL，非删除）+ 台账 old→new** |
| **R-NDA-008** | 工具 schema 与候选结构（`{opId,label,ref?,params?}`）不一致 ⇒ 校验链入口漂移 | **中高** | FR-NDA-011 / 012 / 030；AC-NDA-002 / 003；**schema 同构 + schema 不替代运行时校验** |
| **R-NDA-009** | 法八零明文被工具参数 / 留痕撞破 | **中高** | FR-NDA-028 / 036；NFR-NDA-004；N-NDA-009；**参数与候选仅走既有载荷；留痕只含字段名** |
| **R-NDA-010** | 「LLM 坏了」的判定与既有 `llm.unconfigured` 词表漂移（第二词表） | **中** | FR-NDA-071 / 075；AC-NDA-009；N-NDA-026；**复用失败面 + 分相不新写词根** |
| **R-NDA-011** | 门禁无法断言不确定的 LLM 工具调用（可判性） | **中** | FR-NDA-022 / 030 / 105 / 106；AC-NDA-021；**判据落在纯函数捕获 / 校验 + 注入式反证** |
| **R-NDA-012** | 环境性 flake 被误读为回归（`KL-N-10`） | **低—中** | FR-NDA-136；EC-NDA-025；**隔离复跑 ≥2 + 如实记录不阻塞** |
| **R-NDA-013** | 方案先行（未定开放点被 spec 之前擅自裁定） | **中高** | §11（全部 `ruled`）+ §8 `PD-NDA-*`；FR-NDA-007；**discovery 零预设** |

### 15.2 spec 新增风险

| # | 风险 | 等级 | 说明 / 应对 |
|---|---|:--:|---|
| **R-NDA-901** | **约定「下一个该做什么」的 schema 约束被误当作安全闸**（schema 合法即放行，绕过运行时校验） | **高** | FR-NDA-012 / 027；N-NDA-021 / 023；**运行时 5 道校验链为唯一权威；反证「schema 合法但 param 越界 ⇒ 必拦」** |
| **R-NDA-902** | **围栏块「影子产出」残留**（解析函数未删净，仍能被触发 ⇒ 双通道漂移） | **高** | FR-NDA-080 / 081；AC-NDA-010；N-NDA-022；**反证「围栏块仍能产出 ⇒ 必红」 ；EC-NDA-020** |
| **R-NDA-903** | **提醒机制被实现成「无限重试 / 递归续轮」**（自杀成环 / 烧 LLM 往返） | **高** | FR-NDA-062 / 063；N-NDA-024；**有界恰一次（可 FAIL 判据）+ 不新增 `nextAfterSettle` 调用点** |
| **R-NDA-904** | **未配置分相写歪**：把「未配置」判成「异常」⇒ 未配置用户被推荐「配置新 LLM」却其实从未配置；或分相误伤已配置场景 | **高** | FR-NDA-053 / 071；N-NDA-008 / 026；**分相单源（`configured`）+ 两相双向反证** |
| **R-NDA-905** | **`next` 工具被实现成「第二产出内核 / 有执行体」**（触达真实写 / 绕过 `recommendNextStep` 单内核） | **高** | FR-NDA-014 / 023 / 026；NG-NDA-012；**纯协议工具（合成 `ToolResult`）+ 单内核保持；反证必红** |
| **R-NDA-906** | **捕获写在面板侧（A 列）**，撞体积档位（距档 9,798 B） | **中高** | FR-NDA-024；§5.14.1；DC-NDA-013；**B 列 SW 优先 + 归因逐模块 + 2.8× 最坏预置 EC** |
| **R-NDA-907** | **`parity` 工具目录条目缺失 / 敷衍**（reason / basis 空 ⇒ 门禁被形式化绕过） | **中高** | FR-NDA-020 / 117；AC-NDA-016；**reason + basis 非空机核 + 反证「空条目 ⇒ 必红」** |
| **R-NDA-908** | **`ai-next-candidate` 改写时静默删断言**（AI-N-1 删而补不足） | **高** | FR-NDA-116；AC-NDA-020；N-NDA-012；**门禁前后断言对账 + `assertionsRemoved = 0`** |
| **R-NDA-909** | **S0'''' 被写成「脚本绿」而非「链路可判」**（用假 provider / 桩跳过真实捕获与注入） | **中高** | FR-NDA-100~106；**真源切片 + 双向反证（承 v5-2 review BLOCK-03 / F-36 R-ADN-909 教训）** |
| **R-NDA-910** | **门禁处置「看起来齐」但漏项**（行数当断言数；间接面未确认） | **中高** | FR-NDA-134；AC-NDA-026；COR-NDA-3；**按断言语义逐条 + 三态齐 + 间接面对账面（§9.5）** |

---

## 16. 纪律与验证契约

| # | 纪律 | 依据 |
|:-:|---|---|
| 1 | **`.sddu/**` 只写本 Feature 目录**；**spec 阶段零改动** `src/` / `test/` / `dist/` / `design/` / `docs/` 与 `ROADMAP.md` | D6 / FR-NDA-003 |
| 2 | **path-limited `git add`**（禁 `git add -A` / `.`）；不 force push；不合 main；不发布；无新依赖；不改 `packages/web-cli-base/**`；不改 `.opencode/opencode.json`；`F-29` 区段一字不动 | N-NDA-014 / 020 / NG-NDA-005 / 020 |
| 3 | **门禁严格串行**（`test` / `test:ui` / `test:binding` **绝不并发**；一次一个 Chromium；`finally` 自清 profile） | N-NDA-019 / FR-NDA-136 |
| 4 | **`KL-N-10` 处置纪律**：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | R-NDA-012 / EC-NDA-025 |
| 5 | **断言零删除零降级、计数只增不减**（唯一例外：保护段显式取代 + 台账留痕）；**`assertionsRemoved = 0`** | N-NDA-012 / FR-NDA-004 / 130 |
| 6 | **反证必须实跑**：注入 → FAIL（声明 `expectFailPattern`）→ 逐字节还原（sha256 前后相同）→ PASS；禁止「删属性充数 / 自我裁决 / 换口径放松」 | FR-NDA-131 / AC-NDA-021 |
| 7 | **人工面如实登记**：真机观感 / 机制换轨体感 / 提醒体感等 headless 不可合成项逐项 `⏳ 未执行`，**不得冒充 PASS** | FR-NDA-104 / AC-NDA-032 / §9.4 |
| 8 | **本阶段（spec）零运行时验证**：所有数字与 `file:line` 均引自已入库产物与源码（discovery §0.2 + 本规范 §2.2）；未跑任何门禁 / 构建 / Chromium | D6 / §2.2 |
| 9 | **体积预算先评估后落地**：先出分列净增上下界与越限路径口径（含 2.8× 最坏），再排落地；`authorConfirmation` **不得静默改写** | R-NDA-006 / N-NDA-013 / FR-NDA-140 / 143 |
| 10 | **不编造外部结论**：竞品调研**未执行**（口径 = 「未执行，不阻塞」），不得据此外推 | NG-NDA-020 / O-NDA-011 |
| 11 | **取代与实现同轮完成**：X-NDA-1~12 的台账登记与判据重锚**不得**拆到「下一轮补」；**未发生取代的 X 项须如实登记 `no-supersession`** | FR-NDA-122 / 132 / §12 |
| 12 | **两叶串行 + 共享面一次做完**：`nda-1 → nda-2`；体积 / 保护段 / 取代台账 / `knownGap` 四类共享面**恰一次**登记（叶1 承接共享面骨架，叶2 增量 + 终态） | FR-NDA-002 / 005 / AC-NDA-022 / 028 |
| 13 | **安全不可旁路**：唯一产出通道（`next` 工具）+ 唯一校验器（5 道链）+ 唯一档位单源（`tierOf`）+ 唯一按下路径（`pressCandidate`）+ 唯一分相判据（`configured`）；**不得**新增散落候选面 / 第二校验器 / 第二档位表 / 第二配置判据 | N-NDA-021 / 022 / NFR-NDA-013 |
| 14 | **判定分层不可退化为文档**：门禁真源切片指向**生产源码**（`op-table.ts` / `ref-store` / `providers.ts` / `deriveTools()`）；**不得**以「文档写了」为通过条件 | N-NDA-016 / FR-NDA-105 |
| 15 | **`authorConfirmation` 占位口径**：生效上限 `floor(604,602 × 1.05) = 634,832` / 档位 614,400 / 绝对上限 675,840 —— `pending-author-line` **未闭合义务，不得伪称已确认** | N-NDA-013 / FR-NDA-143 |
| 16 | **路由纪律**：`routing.v1 = local_or_compute → none`（spec 阶段不调用受管 Provider；本轮已提交 RoutePlan 并遵守） | 编排约束 / discovery §0.3 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（web-cli-plugin v5.5.4「next 驱动机制的准确落地」需求规范）：**父 Feature = 轻量规范容器 + 2 叶**（`specs-tree-nda-1-next-tool-channel` → `specs-tree-nda-2-fallback-and-gates`，依存序串行，**已论证不退化单叶 / 3 叶**）；**O-NDA-001~014 十四条开放点全部裁决**（status 一律 `ruled`，DC-NDA-001~014，采纳 discovery 推荐项 + 逐条细化）；**FR 102 条**（GOV 7 / TOOL 11 / CAPTURE 8 / VERIFY-KEEP 7 / UNCOND 6 / UNCONF 7 / NUDGE 7 / ABNORMAL 7 / FENCE 4 / OPEN 4 / S0'''' 7 / SUPERSEDE 13 / GATE 8 / VOL 6）；**NFR 16** / **EC 25** / **NG 22** / **US 10** / **G 8** / **AC 32**（核心 = 001 **S0'''' 五支线全链机器化（工具产出合法 / 提醒补一次成功 / 提醒仍失败→系统兜底 / 未配置确定性引导且无自由输入 / 首开确定性）** / 002 `next` 工具产出通道 / 003 `hooks.intercept` 捕获 / 004 **5 道校验链 + 判定分层保留** / 005 **触发无条件** / 006 未配置确定性引导 / 007 **自由输入分相（未配置不显示 / 已配置恒常驻）** / 008 **提醒补一次（有界）** / 009 **异常判定闭集 + 系统兜底推荐** / 010 围栏块替换 / 011 首开确定性）；**关键口径**：**① `next` 工具 schema** = `{candidates:[{opId,label,ref?,params?}]}`（`maxItems ≤ MAX_CHIPS_PER_CARD = 3`；`description` 三约束；**软约束 ≠ 安全闸，运行时 5 道校验链为权威**）· **② 提醒补一次** = 插件侧**恰一次**带 nudge 的续轮（`nudgeUsed` 单布尔；越限 / 仍失败 ⇒ 系统兜底；防环；不新增 `nextAfterSettle` 调用点）· **③ LLM 异常判定** = 闭集三情 `no-tool-call` / `llm-failed` / `all-blocked`（复用失败面，词表不新写，与 `llm.unconfigured` **分相**）· **④ 系统兜底推荐** = 复用 `op.llm-config`（文案强调「配置**新的** LLM」，确定性）· **⑤ 未配置引导** = 确定性「去配置 LLM」（`op.llm-config` op-direct chip）+ **不显示自由输入终端**（分相判据 `configured` 单源）· **⑥ 围栏块通道** = **替换**（单一产出通道；`NEXT_CONTRACT_GUIDANCE` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` 停止承载；校验链整体保留）· **⑦ 首开边界** = 保持确定性（`PD-ADN-001` **不转正**，登记 `PD-NDA-001`）· **零改基座**（只复用 `llm.ts` function calling + `runner.ts` `hooks.intercept`）· **保留 F-36 正确资产 9 项（K-1~K-9）** · **与 F-36 取代台账 X-NDA-1~12**（已发生 8 / 未发生 4：X-NDA-6 / 9 / 10 / 12）· **体积分列预算**（A 基线 604,602 B / 距档 **9,798 B**（薄）/ 生效上限 **634,832**；A 列 Σ +0.8~+2.4 KB（+15% ⇒ +0.9~+2.8 KB）；B 列 +2.5~+7.0 KB 不计账；**2.8× 最坏 ≈6.7 KB（+15% ≈7.7 KB）仍 < 9,798，余量仅 ~2.1 KB（薄）⇒ 预置升档 EC + 作者一行**；冻结面 `content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 **零容差**）· **门禁：改写 2（`ai-next-candidate` AI-N-1 换机制 / `parity` 新工具条目）+ 等价重锚 N + 保留**（`assertionsRemoved = 0`；`CHROMIUM_GATES === 9` 不动）· **N-NDA-001~030 红线**（编成 20 + 新增 10）· **R-NDA-901~910 新增风险** · 纪律 16 条。**本轮零产品运行时验证、零受管 Provider 调用（routing.v1 = local_or_compute → none）**；`.sddu` 外零触碰；ROADMAP 零 diff。 | 2026-09-27 | SDDU Spec Agent |
