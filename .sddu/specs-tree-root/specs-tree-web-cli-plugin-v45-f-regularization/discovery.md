# 问题挖掘报告：specs-tree-web-cli-plugin-v45-f-regularization

> **文档定位**: SDDU 问题挖掘报告 — 记录 web-cli-plugin v4.5「F 还原度转正」的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = ① `packages/web-cli-plugin/docs/f-fidelity-fix-2026-09-20.md`（F 还原度快修轮 + §5 deferred 清单——v4.5 的直接输入）② `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/closeout.md` §7 deferred 1/2/9 ③ `design/ui-redesign/option-f-chat-stream.html` 头注（三区法则 ⑤ 法一~法五）与页脚「相对 E 的变化点」④ 仓库现状（分支 `feature/web-cli-plugin` @ `08e3932`，`packages/web-cli-plugin` 现行实现与门禁基线）⑤ 编排器代作者决策（2026-09-21）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（v4.5「F 还原度转正」问题挖掘）

web-cli-plugin v4.5「F 还原度转正」问题挖掘报告 —— 把 F 方案（聊天流统一承载）的**结构性收尾**从「已登记为 deferred 的过渡形态」转为「可验收的纯形」：**5 条提示带的可见投影退役（单写化）** + **4 个固定位置宿主退役（流成为纯时间序卡列表）**；核心问题 = 同一事实在流内外双写（事实面不唯一）· 流被 4 个固定位置宿主切段（时间序被结构打断）· 过渡态被注册表**固化为永久**（收口义务在制度上被消解）· 空态首屏被 6 个 0 计数控件占据（噪音）。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（deferred 清单 / 快修轮文档 / 仓库实测 / 编排器代作者决策），供 spec 阶段追溯；不加入任何方案推断，不写需求条文。

### 0.1 立项来源（**三条 deferred 登记的逐字引用**）

v4.5 **不是新增想法**，而是把 v4 收口时**已登记、已给出理由、已明确"结构性、需单独立项"**的 deferred 项转正。

| 来源 | 原文（逐字引用） | 落点 |
|---|---|---|
| `docs/f-fidelity-fix-2026-09-20.md` §5.3 | 「**strips 单写化**（退役可读投影、事件行为唯一面）—— 动保护门禁 pin 的容器，结构性，需单独立项。」 | v4.5 核心项 1 |
| `docs/f-fidelity-fix-2026-09-20.md` §5.4 | 「**宿主时间序化**（`decision` / `l1-panels` / `strips` 并入时间序）—— 同上，结构性，需单独立项。」 | v4.5 核心项 2 |
| `docs/f-fidelity-fix-2026-09-20.md` §5.1 | 「**FIX-5（空态 L1 噪音）—— deferred**。先评估：`#l1-local-tree-toggle` / `#l1-history-toggle` / `#l1-receipt-toggle` 在 `test/ui/l0.mjs` ⑧（`EXPECTED_TRIGGERS` 逐条「存在 + 非空文字 + 目标含摘要或计数」）、`test/ui/l1.mjs` ②（展开几何「不遮挡」点击它们）/ ⑫（openAll/closeAll 往返）、`disclosure.ts` 注册表与 `l1-disclosure.test.ts` 中被**保护门禁 pin**；隐藏 0 计数会同时改写 density 默认档 31 格与 L1 结构断言 ⇒ **门禁非零破坏**，按约定顺延。」 | v4.5 附带项 1（**按 §5.2 的"被核心项 2 覆盖则消解"口径**） |
| `docs/f-fidelity-fix-2026-09-20.md` §5.2 | 「**`src/ui/options/index.html` 的授权指引文案** —— 该文件在 v3 台账 `zeroDiffFiles` 中冻结（且 v3 台账为冻结历史，不得解冻）。**若要改需先走一次显式解冻登记，属治理动作**，本轮不做。」 | v4.5 附带项 2（**待 spec 裁决是否解冻**） |
| `v4-chat/closeout.md` §7 deferred 1（N-05） | 「**N-05 重锚按钮不在流内卡内**（v4-4，**口径裁决**）：spec FR-CHAT-052 的「卡内」按「**恢复路径可达即可**（L1 面板与卡内二选一）」读 —— 一键重锚按钮 `#l1-ref-rescue` 位于 **L1 引用证据面板**（唯一文本匹配时可见）……**升级条件：真机反馈需要卡内按钮 ⇒ 小改进项**。」 | v4.5 核心项 2 的**裁决对象**（`#l1-ref` 证据面板的去向） |
| `v4-chat/closeout.md` §7 deferred 9 | 「**密度打开态类残余**（承 v3 口径）：……v4-1 起密度基线改为 31 登记格 + RP-V4-09，**打开态未新增登记格**。」 | v4.5 风险预登记输入 |
| `v4-chat/closeout.md` §7 deferred 2（`KL-N-10`） | 「**`test:binding` 环境性 flake**……串行链首轮偶发红且**每次失败项不同**……**纪律**：串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞收口」 | v4.5 验证纪律继承 |
| `v4-chat/closeout.md` §7 deferred 8 | 「**V3-VOL-3 绝对上限的作者确认仍挂起**：`authorConfirmation.status = pending-author-line`……**属未闭合义务，不是已完成项**。」 | v4.5 风险预登记输入（重构改变基线 ⇒ 需同步前移该占位） |

> **「F 还原度转正」的语义（本 Feature 名 f-regularization 的题眼）**：v4 的收口结论是「**F 方案的形态目标未完全达成，但残余已被登记为结构性遗留**」（`host-registry.ts:1-33` 的模块注释逐字承认：四个宿主是「**permanent structural home now**」，理由之一是「**its content is pinned by protection gates**，所以 v4-1 的『过渡』读法不再适用、标记是被当作 **CLOSED state** 移除的，不是用来消音的」）。v4.5 要做的，是把这条**由门禁反推出的合法性**推翻：**让实现服从 F 稿的纯形，再让门禁去描述新形态**——而不是让形态停在门禁能读的位置。

### 0.2 编排器代作者决策（2026-09-21，**已为定论，本报告直接作为约束记录，不重新讨论**）

| # | 决策 | 性质 |
|---|------|------|
| D1 | **作者已授权编排器代行决策、全流程自行调度**（本轮及后续 spec/plan/tasks/build/review/validate 均按此口径） | 定论（作者授权） |
| D2 | **Feature 目录 = `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v45-f-regularization/`** | 定论 |
| D3 | **ROADMAP 编号 = F-31（候选）**；`F-29`（A2A 候选）保持原样不动、`F-30` 已用。**本轮实测复核：`F-31` 在 ROADMAP 中 0 命中**（见 §6.1） | 定论 + 本轮复核 |
| D4 | **版本位 = v0.9.1（v4 维护版本段）**；**本轮实测复核：`v0.9.1` 在 ROADMAP 中 0 命中**（见 §6.2） | 建议（本轮零冲突，登记留给收口） |
| D5 | **范围 = 核心 2 项 + 附带 2 项**（见 §1.3 范围表与 §7.1 非目标） | 定论 |
| D6 | **纪律：`.sddu/**` 只写本 Feature 目录；不改任何 `src/`、`test/`、`dist/`、`docs/`、`design/` 与 ROADMAP**（本轮为 discovery，零运行时验证） | 定论（本轮已遵守） |

### 0.3 设计基准与 F 的「纯形」目标（**逐字口径，供 spec 直接引用**）

设计基准 = `packages/web-cli-plugin/design/ui-redesign/option-f-chat-stream.html`（1,927 行 / S1~S7 场景 + `option-f-shim.mjs` 60/60），由 `test/design-contract.test.ts` **sha256 冻结**：

| 冻结对象 | sha256 | 事实 |
|---|---|---|
| `design/ui-redesign/option-f-chat-stream.html` | `49ce27fc1daba083cc361639d3d0a1ad991b961f0fa0f45fc016815e0fe2e526` | `test/design-contract.test.ts:70` 常量 `DRAFT_SHA256`（本轮实测逐字节命中） |
| `design/ui-redesign/option-f-shim.mjs` | `8ca5db6f7a152c2890814cff2fe58dc11345338890b26de62b3355837f591ed4` | 同上 `SHIM_SHA256`（`SHIM_CHECK_CALLS = 60`） |

> **推论（约束，不是需求）**：`design/**` 与 shim 是**同一契约的两面**，改动必须同时满足 shim 60/60 并更新常量 + 台账。**v4.5 不触碰 `design/**`**——本 Feature 修的是**实现层形态**，不是 12 卡类型学或三区法则本身。

**三区法则（`option-f-chat-stream.html:31-73`，逐字要点）**：

- 工具栏（顶部一行常驻）：只放 ① 站点摘要（读只读 status，不可点）② 常驻导航（树 / 命令 / 审计 / 设置 + 主题切换）；**可点元素合计 ≤5**；**禁止：任何一次性交互（问答 / 授权 / 推荐）出现在工具栏**。
- 聊天流（主体，**唯一交互面**）：**追加式消息流，正序排列**，自动滚到底，可上滚回看（= 留痕）；**一切交互皆 7 类消息卡之一**。
- 状态栏（底部常驻，永不折叠）：连接状态一行 + 活跃风险 chips；**永不折叠**。

**五法（`option-f-chat-stream.html:62-72`，逐字要点）**：

| 法则 | 逐字要点 | v4.5 相关性 |
|---|---|---|
| 法一 一切交互皆消息 | 问答 / 授权 / 推荐 / 系统事件一律入流；一次性交互禁止出现在工具栏或浮层 | 直接相关（宿主里的残留交互） |
| 法二 留痕即事实 | 卡片只固化不撤销；流 = 会话审计线索 | 直接相关（双写破坏"事实唯一面"） |
| 法三 三区各司其职 | 工具栏只放常驻导航与站点摘要；状态栏只放常驻状态与风险；**一切「过程」进流** | 直接相关（提示带/决策壳 = 过程未归流） |
| 法四 输入按需出现 | 无常驻输入框；ask-user text 输入框只在问题卡内 | 相关（`#composer` 宿主保持 hidden） |
| 法五 默认密度继承 | 默认屏可点 = 工具栏 + 状态栏合计 ≤7；**聊天流内容不计入默认密度**（它是记录，不是控件预算） | 相关（豁免口径 = `#stream` 子树） |

**「相对 E 的变化点」（`option-f-chat-stream.html:1487-1499`，逐字要点——**这是 F 纯形目标的验收锚**）：

| # | E（渐进式披露） | F（聊天流统一承载） | v4.5 现状差距 |
|:-:|---|---|---|
| 1 | L0 只有「当前那一张决策卡」独占一个槽位，历史收进 L1「已决策历史」 | **对话历史 = 流本身**；当前题就是流里最新一条消息，旧卡原样留在上方 | 🔴 `#l0-decision` 宿主仍**独占槽位**（kicker / 更多选项 / 回执摘要 / 引用开关）+ `l1-panels` 的「已决策 0 步」仍与流并存 |
| 2 | 问答在决策卡槽位里就地完成，未入流 | ask-user 卡内联在流中，应答/取消后**固化不可逆** | 🟢 已达成（v4-3）；残余 = `#l1-more` / `#l1-consequences` 仍在决策壳内 |
| 3 | 授权批准就地发生，事后在审计里查 | 权限申请卡入流，批准/拒绝固化 + 时间戳 + 「查看审计」跳转 | 🟢 已达成（v4-3）；残余 = `#notice` 回执仍双写 |
| 4 | 引用失效住在 `#risk-rail`（常驻风险位） | 失效 = 系统事件行 + 失效引用卡（卡内「重新拾取 / 改用描述」）+ 状态栏 chip，**三处呼应** | 🟡 部分（N-05：一键重锚按钮在 **L1 面板**而非卡内，已登记为已知偏差） |
| 5 | 状态栏是「入口按钮」：点开是 L2 入口面板 | 状态栏右移为常驻状态 + 风险 chip；四个视图入口上移到工具栏 | 🟢 已达成（v4-1） |

### 0.4 时间线一页（R1 / R2 / R3 / V3-VOL-1~3 / f-fidelity-fix 轮，供 spec 对齐口径）

| 时点 | 事件 | 与本 Feature 的关系 |
|---|---|---|
| v1（F-14）2026-09-12 | 插件基础 SDDU 全流程 validated；`sidepanel.js` 基线 **266,500 B** | 体积链起点 |
| v2（F-27）2026-09-13 | any insight（连接树可见/可控）：`1,132,748 B` | 历史链 |
| v3（F-28）2026-09-17 | UI 渐进式披露（方案 E）：`266,500 → 362,777 B`（+36.13%）；**V3-VOL-1**：自加 `SIDEPANEL_CEILING_CAP` 硬上限**撤销**，降为 `record-only`（教训 = 不设自缚装置） | 体积判定公式来源 |
| v3-2 修复轮 | baseline 显式重登记 **327,679 B**；ceiling = 纯公式（无 cap） | `test/size-budget.test.ts:45-53` |
| v4-1（F-30）2026-09-19 | 三区骨架 + 密度新口径；`#log` → `#stream`；`journey` 保护段**八步显式取代**（old `42766..54004` / sha `6b45c3fa…` → new `43054..55259` / sha `e2b500df…`）；`binding` 保护段 decision = **keep**（`107780..115930` / sha `be9ad0e9…`） | **v4.5 的取代成本基准** |
| v4-2 / v4-3 / v4-4 | 流事件模型 / ask·auth 流内化 / 引用卡·系统行·推荐卡 + **V3-VOL-3 八步带值闭合**（`B_final = 465,000` / 档位 `ceilTo50KB = 512,000` / 绝对上限 `563,200 = 512,000 × 1.10`） | 绝对上限来源 |
| v4 父收口 2026-09-20 | `sidepanel.js` **479,021 B**；生效上限 `min(563,200, floor(479,021 × 1.05) = 502,972) = 502,972`；`authorConfirmation.status = pending-author-line` | v4.5 的**基线起点** |
| **f-fidelity-fix 快修轮 2026-09-20** | FIX-1~FIX-4（授权 chip 直达 / 过时文案 / 工具栏 digest / kicker 收敛）；`sidepanel.js` **479,021 → 480,026 B**（+1,005 B / +0.21%）；`V3-VOL-3.newBaselineBytes` 同源前移 **480,026**（档位 512,000 与绝对上限 563,200 **未变**）；ceiling = `floor(480,026 × 1.05)` = **504,027 B**；密度 28 格显式重锚；`npm test` 992 → **1001**；l0 221 → **223**；recommendation 49 → **56** | **v4.5 的直接上游：基线 480,026 B / 生效上限 504,027 B** |

> **本轮（v4.5）实测复核**：`dist/sidepanel.js` = **480,026 B**（与 `test/size-baseline.ts:301 SIDEPANEL_BASELINE_BYTES = 480_026` 一致）；`dist/content.js` = **177,076 B** / sha `52a82620…`；`dist/pick-layer.js` = **33,900 B** / sha `5f567d7e…`（红线产物逐字节未动）。

### 0.5 本阶段边界（discovery 职责声明）

- **负责**：挖掘问题、梳理问题、记录问题；输出问题清单 + 目标态描述 + 风险预登记 + 开放问题。
- **不负责**：不定义需求（不写"系统应支持 XXX"）、不分类 Must/Should/Could、不定义验收标准、不做方案评估与替代方案对比、不写 ADR、不排任务、不改代码。
- **本轮零运行时验证**：未跑 `npm test` / Chromium 门禁 / 构建；所有数字均来自**带 `file:line` 的源码与已入库产物**（§7.1 逐条给出），未自造实测值。

---

## 1. 问题定义

### 1.1 一句话问题陈述

> v4（方案 F）把「一切交互皆消息」做成了**行为**，但没有做成**形态**：`ol#stream` 里仍有 **4 个固定位置宿主**（`decision` / `composer` / `l1-panels` / `strips`）把时间序切段，**5 条提示带的可见投影与流内系统事件行对同一事实双写**，其中 4 条宿主还被 `host-registry.ts` 以「内容被保护门禁 pin」为理由**登记为永久结构宿主**——于是「F 的纯形」既没有达成，也**在制度上被判定为已收口**；同时空态首屏仍被 6 个 0 计数控件占据（`更多选项（还有 0 个）` / `引用 0 条` / `归属（局部树）· 0 个节点` / `已决策 0 步` / `回执证据（0 行）` / `页面交互说明（6 个手势）`）。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **同一事实在流内外双写，事实面不唯一** | 用户看到「提示带」与「流内系统行」两份同义事实，**无法判断哪一份是权威留痕**；法二「流 = 会话审计线索」被削弱（审计线索之外还有一份并行的可读投影） | 每一次「过程事实」都继续产生两份；越修越像两套系统；后续任何"事实相关"的改动都要**同时改两处**（双写点越多，漂移面越大） |
| **流被 4 个固定位置宿主切段，时间序被结构打断** | `ol#stream` 的 DOM 顺序是 `[decision 宿主][卡…][composer 宿主][l1-panels 宿主][strips 宿主]`（卡由 `stream-render.ts:69-71` 的 `messageAnchor` **插到 composer 宿主之前**）⇒ 「正序时间序」在**头尾两端**被固定位置结构包夹；`#stream` 之上还实测出现过 `#l0-decision` **跑到视口上方 −511px 且不可滚动到达** | 会话越长，流中「非卡内容」的占比不降；F 稿「对话历史 = 流本身」在第 1 条变化点上**始终差一步**；每次新增流内卡族都要重新论证宿主相对位置 |
| **过渡态被注册表固化为永久（收口义务在制度上被消解）** | `host-registry.ts:47-51` 逐字写「Each is a **permanent structural home now**」「the v4-1「过渡」reading **no longer applies**」；其 `RETIRED_HOST_IDS` 只剩 2 个 v4 早期容器（`l0-pick` / `l0-status-band`）。**BLOCK-02 的教训是"删属性充数"，但修法是"把剩下的登记为永久"**——判据从「过渡是否关闭」变成「登记是否与实存一致」 | 「过渡态清零」（R4-18 / ADR-V4-005 §6）这条 v4 自设义务**永久无法达成**；下一次重构仍会面对同一套宿主与同一套 pin |
| **空态首屏被 0 计数控件占据（噪音）** | 4 个 L1 触发器 + 决策壳的 2 个 0 计数控件在**默认/空态**恒可见（`l1/panels.ts:345-346,363-364` 只在计数处填数字，**没有任何隐藏分支**）；实测默认档 `clickables = 5 / lines = 7`（阈值 7/15）说明它们**不在密度预算内却被用户看见**——即"预算看不见的噪音" | 首屏「一眼看懂在哪 / 谁在管 / 下一步做什么」被 6 个「0」稀释；空态是**新用户的第一印象** |

### 1.3 v4.5 范围（**从 deferred 清单转正**）

| # | 项 | 性质 | 来源 | 目标态（**问题域描述，非需求**） |
|:-:|---|---|---|---|
| 核心 1 | **strips 单写化** | 结构性（动保护门禁 pin 的容器） | f-fidelity-fix §5.3 | 5 条提示带（`env-guard` / `site-hint` / `onboarding` / `discovery-notice` / `notice`）的**可见投影退役**——事实只以「流内系统事件行 / 流内卡」**单次可见** |
| 核心 2 | **宿主时间序化** | 结构性（动保护门禁 pin 的容器 + 注册表） | f-fidelity-fix §5.4 + v4-chat closeout §7 deferred 1 | `decision` 壳（kicker / 更多选项 / 回执摘要 / 引用开关 / `#l1-ref` 证据面板）与 `l1-panels` 组（归属 / 已决策 / 回执 / 手势 4 开关）**去固定位置**；`ol#stream` 成为**纯时间序卡列表**，固定位置宿主**清零或降到最小** |
| 附带 1 | **FIX-5 空态 L1 噪音** | 被核心 2 覆盖则消解 | f-fidelity-fix §5.1 | 空态首屏不再被 0 计数控件占据（消解口径 = 若核心 2 已使这些控件不再恒驻，则本项**不单独存在**） |
| 附带 2 | **`options/index.html` 授权文案** | 治理动作（v3 `zeroDiffFiles` 冻结面） | f-fidelity-fix §5.2 | 需**显式解冻裁决**（`docs/v3-supersession-ledger.json#zeroDiffFiles` 含 `src/ui/options/index.html`）——是否解冻、解冻范围、如何登记，属 spec 裁决项（§7.4 O-REG-004） |

**核心 2 的候选方向（编排器预登记，供 spec 裁决；discovery 不作方案评估）**：

- 并入流内卡（如 `ref` 卡携带证据 + 恢复入口——**已有先例**：firstRun 卡 `view-model.ts:1044-1065` 把 `#onboarding`/`#discovery-notice` 合并为流内卡，且 `terminable` 保留原「已终结」谓词）；
- 迁 L2 视图（`#view-host` 的**视图替换**机制已存在：`#view-host` 是 `#stream` 的兄弟节点，`hidden` 时显示视图，ADR-V3-025/ADR-V4-022）；
- 空态隐藏（0 计数不渲染触发器）。

**富内容去向的开放点（需 spec 裁决）**：`site-hint` 不是单行文本——它有 `sh-title` / `sh-detail` / `sh-action` 三段 + `#rebind`（重新绑定当前标签页）**可点动作**（`index.html:1335-1439`、`sidepanel.ts:1558`、`sidepanel.ts:2634-2635`）；`discovery-notice` 有 `dn-title` / `dn-detail` 两段（`index.html`）+ 退避重试语义（`test/hardening.mjs:352`、`test/ui/journey.mjs:592`）。**「单行系统事件行」能否承载这两条富内容、其"重试/恢复"策略是否需要详情面、在哪**——属 spec 裁决（§7.4 O-REG-001）。

### 1.4 非目标（**明确排除，逐字取自编排器决策 D5**）

| 非目标 | 理由 |
|---|---|
| `src/content/**`（`content.js`）/ `pick-layer.js` | 字节冻结红线：`content.js` **177,076 B** / sha `52a82620…`，`pick-layer.js` **33,900 B** / sha `5f567d7e…`（v4 全程零触碰） |
| SW / `KIND_SET` / 判定链 / `manifest.json` | 零新增权限、零判定链改动 |
| L2 视图**内部**（tree / commands / audit 三视图内容） | 不属本轮形态收尾范围 |
| A2A（`F-29`） | 未立项未排期，**保持原样不动** |
| `design/**` 与 `option-f-shim.mjs` | sha256 冻结契约（60 断言）；改动需同步常量 + 台账 |
| 12 卡类型学 / 三区法则本身 | 本 Feature 修**实现形态**，不改类型学与法则 |

---

## 2. 用户画像

> **口径声明（如实）**：本 Feature 的受影响用户 = **插件的唯一真实使用者（作者本人）**，与 v3/v4 同一事实基础（v3 报告假设 `A-UI-009` 已登记「作者是插件当前唯一真实用户」；v4 报告用户画像同为作者真机反馈）。**本报告不编造用户调研数据**；「用户原话」栏引用的是作者既有反馈与文档中保留的观测事实。

| 用户角色 | 典型场景 | 关键痛点（**原话 / 逐字事实**） | 当前应对方式 |
|---------|---------|-------------------|------------|
| **作者（唯一真实用户）+ 唯一决策者** | 真机侧栏首屏：会话中/空态；构造「页面原地翻译」链（ask-user 三连问 → 答 → 引用 1 失效 → 重新拾取/改用描述 → AI 追问） | ①（v4 立项原话，仍是本 Feature 的母问题）「每一步交互，尽可能都在聊天框留痕，**作为事实依据**」——但**事实出现两份**（提示带 + 流内行）②（v4 closeout §8 人工面 7）「系统事件行观感：6+ 通道归并后的稳态降噪效果（**是否会刷屏** / 「持续：」行是否可读）」③（v4 closeout §8 人工面 1）「三区布局真机观感……**一眼看懂在哪 / 谁在管 / 下一步做什么**」 | 忍受（残余已登记为 deferred 并顺延）；用真机截图/口头反馈驱动下一轮 |
| **未来的使用者（尚未存在，仅作推理边界）** | 首装首屏（无 site / 未授权 / 探测中） | 空态首屏是**唯一一次**「第一印象」：当前会看到 `更多选项（还有 0 个）` / `引用 0 条` / `归属（局部树）· 0 个节点` / `已决策 0 步` / `回执证据（0 行）` —— 6 个「0」 | 无（此角色尚不存在；**不得据此声称普适收益**——登记为假设 `A-REG-003`，标注「待验证」） |
| **下游维护者（AI Agent / 未来重构者）** | 需要回答「`ol#stream` 的哪些子节点是卡、哪些是固定结构」 | `host-registry.ts` 把 4 个宿主声明为**永久**，`RETIRED_HOST_IDS` 只剩 2 条；任何新宿主「必须走注册表 + 裁决」（`evaluateHostRegistry` 第 2 条问题串） | 服从注册表（即**形态被治理结构锁定**） |

---

## 3. 问题清单

> 编号空间 `Q-REG-###`（v4.5 = regularization）。核心 / 次要 / 潜在按「影响面 × 影响深度 × 影响频率」分级；每条标注信息来源。

### 3.1 核心问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-REG-001** | **同一事实在流内外双写，事实面不唯一（5 条提示带）**。`host-registry.ts:74-76` 对 `strips` 宿主的 `reason` 逐字承认：「The five merged strips **keep their readable status projection**（protection gates pin `#notice` / `#discovery-notice` / `#site-hint` / `#env-guard`），but **every fact is ALSO append-recorded** through the one system channel (eventized).」——即**同一条事实同时存在于「可见提示带」与「流内系统事件行」两处**。`STRIP_CHANNEL_KINDS` 逐条登记了 6 个通道（含已归并的 `notice`）与各自 kind。**法二的强度被削弱**：流不是唯一事实面，而是"并列事实面之一"。<br>**佐证**：`src/ui/sidepanel/system-events.ts:8-20` 的模块注释逐字记录 v4-4 之前的 6+ 瞬时通道与 `#notice` 的**覆盖语义**（「the fact had no timestamp, no order, and the next render could replace it」）——v4-4 建了唯一追加通道，但**没有退役旧投影**。 | 全部使用场景（每条提示事实都双写）；影响深度 = 明显痛点（事实权威性）；频率 = 持续存在 |
| **Q-REG-002** | **流被 4 个固定位置宿主切段，时间序被结构打断**。`index.html:1239-1348` 的 `ol#stream` 子节点顺序恒为 `li[data-host="decision"]` → `li[data-host="composer"]` → `li[data-host="l1-panels"]` → `li[data-host="strips"]`；卡由 `stream-render.ts:66-71` 的 `messageAnchor()`（`container.querySelector(':scope > li[data-host="composer"]')`）**插入到 composer 宿主之前**（`render()` 反序遍历 + `insertBefore(node, ref)`，`stream-render.ts:126-136`）⇒ 最终 DOM = `[decision 宿主][卡…][composer 宿主][l1-panels 宿主][strips 宿主]`。<br>**F 稿第一变化点要求「对话历史 = 流本身」**（`option-f-chat-stream.html:1494`），而现状是「流 = 4 个固定位置结构 + 中间一段卡」；`#l0-decision` 作为**流内第一个子节点**在视觉上仍是「屏幕上的独占槽位」（恰是 E 的形态，不是 F 的）。<br>**实测佐证（源码注释，v4-1）**：`index.html:296-299` 逐字记录「flex 居中的起始溢出在 Chrome 里是**不可滚动到达**的（`#l0-decision` 实测跑到视口上方 **−511px**）」——固定位置宿主曾直接造成**内容不可达**。 | 全部使用场景；影响深度 = 核心阻碍（F 的形态目标本身未达成）；频率 = 持续存在 |
| **Q-REG-003** | **过渡态被注册表固化为永久，收口义务在制度上被消解**。v4-1 的原始义务（`host-registry.ts:6-12` 逐字）：「v4-1 put every displaced container into a `li[data-transitional-host]` inside `#stream` with the obligation「只建不销 → v4 收口清零」」；v4-4 的 review（BLOCK-02）**正确指出**「R2 closeout satisfied the *count* judgement by **removing the attribute** from the four live hosts, which made「计数 = 0」vacuously true while the containers stayed」，并称其为「**自我裁决自我验收**」。<br>但修复的落点是**把 4 个宿主登记为永久**（`REGISTERED_STRUCTURAL_HOSTS` 的 `transitional: false` + reason），`RETIRED_HOST_IDS` 只补了 `l0-pick` / `l0-status-band` 两个 v4 早期容器。判据从「过渡是否关闭」变成「登记集合 == 实存集合」——**形态停止演进被制度化**：任何未来的宿主退役都必须先改注册表（`evaluateHostRegistry` 会报「登记的结构宿主 X 缺失」）。 | 全部下游重构；影响深度 = 核心阻碍（治理结构反向锁定形态）；频率 = 持续存在（只要不改注册表） |
| **Q-REG-004** | **空态/默认首屏被 0 计数控件占据（噪音）**。`index.html:1297-1333` 的 `l1-panels` 组 4 个触发器**无任何隐藏分支**：`#l1-local-tree-toggle`（`归属（局部树）· 0 个节点`）/ `#l1-history-toggle`（`已决策 0 步`）/ `#l1-receipt-toggle`（`回执证据（0 行）`）/ `#l1-gestures-toggle`（`页面交互说明（6 个手势）`）；计数只在 `l1/panels.ts:345-346,363-364` 填数字。决策壳内另有 `#l0-more`（`更多选项（还有 0 个）`）与 `#l0-ref-toggle`（`引用 0 条`）。<br>**关键事实**：这些控件**全部位于 `#stream` 子树内**，而 `density-scope.ts:38` 的 `DENSITY_EXCLUDED_SUBTREES = ['#stream']` 把整个流排除出密度预算 ⇒ **它们是"预算看不见的噪音"**（实测默认档 `clickables = 5 / lines = 7`，阈值 7/15 —— 预算余量与此无关）。 | 首装/空态/会话空窗；影响深度 = 明显痛点（第一印象）；频率 = 周期性（每次进入空态） |

### 3.2 次要问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-REG-005** | **`#l1-ref` 证据面板承载「一键重锚」救援路径，位置与 F 稿的「卡内」不一致**（已知偏差 N-05）。`v4-chat/closeout.md` §7 deferred 1 逐字：「spec FR-CHAT-052 的「卡内」按「**恢复路径可达即可**（L1 面板与卡内二选一）」读 —— 一键重锚按钮 `#l1-ref-rescue` 位于 **L1 引用证据面板**（唯一文本匹配时可见）……**升级条件：真机反馈需要卡内按钮 ⇒ 小改进项**」。宿主时间序化必然要裁决本面板去向（并入 `ref` 卡 / 迁 L2 / 保留），**该裁决同时决定 N-05 是关闭还是保留**。 | 引用失效恢复链；深度 = 轻微不便（功能等价、位置不同）；频率 = 偶发（仅选择器断链） |
| **Q-REG-006** | **`#notice` 同时是「授权回执」的可见面与密度夹具的稳态锚**。`test/ui/binding.mjs:896` 读 `#notice` 文本 `/已授权/` 作为授权回执断言；`test/ui/density.mjs:346-364` 的 `settledProbe` / `assertFixtureSettled()` **以 `#notice` 存在且非 hidden 作为"夹具已达同一稳态"的锚**（注释逐字：「the 29-char `#notice` of the settled session is present, not absent」）。退役 `#notice` 可见投影会**同时**改一条授权回执断言与密度夹具的稳态定义。 | journey/binding/density 三门禁 + 夹具定义；深度 = 明显痛点（夹具确定性依赖一个被裁决的投影）；频率 = 持续（每个密度格都过该锚） |
| **Q-REG-007** | **`options/index.html` 的授权指引文案仍指向已消失的位置，但被冻结面保护**。f-fidelity-fix §2 表格逐字登记：该文件「在 **v3 台账 `zeroDiffFiles`** 冻结（零注入/零权限/零依赖红线，且 v3 台账为冻结历史，**不得解冻**）」。`docs/v3-supersession-ledger.json#zeroDiffFiles` 实测含 `src/ui/options/index.html`（共 9 项）。用户从 options 页读到「在侧栏『授权当前站点』」→ **位置已不存在**（v4-4 已迁入「设置 → 站点与授权」）。 | options 页用户指引；深度 = 轻微不便（文案过时）；频率 = 偶发 |
| **Q-REG-008** | **「已决策历史」与流本身语义重复**。F 稿变化点 1 要求「对话历史 = 流本身」（`option-f-chat-stream.html:1494`）；现状 `l1-panels` 仍保留 `#l1-history-toggle`（`已决策 0 步`）+ `#l1-history`（「回看只读：不重放、不改变任何已执行动作（零副作用）」）。两份「决策历史」的**权威面**未裁决（v4-3 已把 `rounds[]` 改为由流内终态卡**事件派生**——`closeout.md` §6 第 3 条：「`rounds[]` 改由 `project()` 的已终态 `askuser`/`auth` 卡事件派生」——即数据已单源、**投影仍两份**）。 | L1 面 + 流面；深度 = 轻微不便（重复投影）；频率 = 持续 |

### 3.3 潜在问题

| ID | 问题描述 | 影响范围 |
|----|---------|---------|
| **Q-REG-009** | **体积余量只有 ~24 KB，重构可能净增**。`sidepanel.js` 现 **480,026 B** ≤ 生效上限 **504,027 B**（= `floor(480,026 × 1.05)`）⇒ 余量 **24,001 B（+4.76%）**；距绝对上限 **563,200 B** 余量 **83,174 B**。`test/size-budget.test.ts:53,300,439` 与 `test/size-baseline.ts:360-366` 均断言「登记基线 == 实测产物」与「ceiling 严格 == `floor(baseline × 1.05)`、**无 cap**」⇒ **任何 byte 变化都必须走一次五要素重登记**（前后值 / 日期 / 来源 / 理由 / 历史保留 + 构建命令 + 逐模块 metafile 归因；`test/size-growth-evidence.test.ts:126-133` + I-10 的 `validateReRegistrationDisclosure` **披露算术机核**）。退役投影应**净减**，但新增详情面/卡型可能**净增**。 | 体积门禁 + V3-VOL-3 三值同源前移 + `authorConfirmation` 占位；深度 = 中（可管理但不可忽略）；频率 = 每轮 |
| **Q-REG-010** | **密度 31 登记格的耦合面存在口径分歧（需实测澄清，禁沿用未验证断言）**。f-fidelity-fix §5.1 称隐藏 0 计数「会同时改写 **density 默认档 31 格**与 L1 结构断言」；但**源码口径**显示这些控件在 `#stream` 子树内、而 `#stream` 整棵子树被密度口径**排除**（`density-scope.ts:38`；v4-1 登记的核心事实：`#log` → `#stream` 迁移后默认档实测 `clickables = 5`＝工具栏 4 入口 + 主题切换）。**真正与密度耦合的是 `#notice` 的稳态锚**（Q-REG-006）与「若内容迁出 `#stream` 则落入被测量的区壳」这两种情形。⇒ **两条读法并存，必须由 spec 以 Chromium 实测裁决**（禁止按未验证断言排工作量）。 | density / l0 / l1 三门禁 + 31 登记格；深度 = 中；频率 = 一次性（本轮） |
| **Q-REG-011** | **`journey` 保护段已是被取代后的新 pin，二次取代需重走八步**。journey 的 `protectedRanges[0]` 现为 **active pin `43054..55259` / sha `e2b500df…`**（`supersededFrom = 6b45c3fa…` / `oldPin 42766..54004` / `leafBase 187c205`）；`assertionRewrite` 逐条登记了 `#15a~#15q` 的同编号改写（`#15b` 门槛 45% → **≥65.0%**、`#15c` 法四显式取代）。**本轮再次改动流结构 ⇒ 可能需要第二次八步取代**（§7.3 给出迁移量估计）。 | journey 门禁 + 取代台账 + 反证 RP-V4-08；深度 = 中高；频率 = 一次性 |
| **Q-REG-012** | **`hardening` / `insight` 门禁对 strips 有独立断言，退役会连带失效**。`test/ui/hardening.mjs:205,224-227` 断言 `#env-guard` **存在**（`hasGuard`）、`display !== 'none'`（`guardShown`）与 `guardText`；`test/env-guard.test.ts` 是该能力的独立单测；`test/ui/journey.mjs:658-670` 断言 `#site-hint` 的 `display !== 'none'`（`#11c 无活跃站点时显示可解释块`）与具体文案（`#11d` / `#11e`）。**这些是"可见投影存在"的正面断言**，与「投影退役」直接冲突。 | hardening / journey / env-guard 单测；深度 = 中高；频率 = 一次性 |

---

## 4. 竞品参考

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

本 Feature 是**既有设计的结构性收尾**（F 稿的形态还原），不涉及新交互模型选型 ⇒ 未做外部竞品调研。**不得**据此声称「竞品也这么做」或「无竞品这么做」。若 spec/plan 阶段认为需要（例如「聊天式 agent 面板如何组织流外管理面」这一问题的外部参照），应显式登记为待调研项（§7.4 O-REG-005）。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

> 本节只记录「本仓库已存在、已验收、可复用」的机制先例——它们是**事实**，不是推荐方案。

| 参照 | 事实 | 与 v4.5 的关系（只述差异，不评优劣） |
|---|---|---|
| **E 稿（v3，`option-e-progressive.html`，已验收）** | L0 常驻骨架 + L1 就地展开 + L2 按需视图；`#l0-decision` **就是**「当前那一张决策卡」的独占槽位；L1 层曾以 `#l0-status-band`/`#l0-more`/`#l0-ref-toggle` 为唯一入口 | v4.5 的残余正是**E 的形态在 F 里的遗留**；F 稿变化点 1/5 明确要求替换它 |
| **firstRun 卡先例（v4-4，`view-model.ts:1044-1065`）** | `firstRunCard(onboarding)` 把 `#onboarding` / `#discovery-notice` 合并为**流内卡**（`FirstRunCardView`：`visible` / `title`（逐字 = v1 onboarding 标题） / `lines` / `terminable`），`terminable` **保留原「已终结」谓词**（`!open`）⇒ 「归并不丢语义」有机器证据 | **`onboarding` / `discovery-notice` 两条提示带已有流内卡承载先例**——核心 1 对这两条不是"从零建承载面" |
| **单系统事件通道（v4-4，`system-events.ts`）** | `appendSystem(kind, text, ts)`：① 净化（`assertStreamPlaintext`，URL query / secret / 命令参数体 / raw markup 均抛错）② 去重窗口（`SYSTEM_DEDUPE_WINDOW_MS = 5000`，`dedupeKey = kind + ':' + normalizedText`）③ 速率上限（`SYSTEM_ROWS_PER_MINUTE_CAP = 20`，溢出计入 `dropped` 且**不静默**）④ 追加（`BORN_FROZEN`）；`SYSTEM_CONTINUED_PREFIX = '持续：'` 承载「窗口外同事实再出现」 | **5 条提示带的事实已全部走该通道**（`STRIP_CHANNEL_KINDS` 逐条绑定 kind）——核心 1 是**退役投影**，不是新建事实通道 |
| **视图替换机制（v3-3 / ADR-V3-025 / ADR-V4-022）** | `#view-host` 是 `#stream` 的**兄弟节点**；打开视图即 `hidden` 掉 `#stream` 并显示 `#view-host`；**同一时刻恰一个 `[data-l2-view]` 可见**；「返回」按钮 `#l2-back`（返回后展开态与密度复原） | 核心 2 的「迁 L2 视图」候选方向**有现成机制**；但 `#view-host` **不在**密度豁免子树内（`density-scope.ts:38` 只豁免 `#stream`）⇒ 迁入会**进入密度预算**（Q-REG-010 的第二种耦合情形） |
| **`ref` 卡内救援 + 卡内兜底提交（v4-4）** | `cards/ref.ts` 渲染失效卡；失效卡有「重新拾取 / 改用描述」；`handleCardAction` 落地 `submitDescribe`（BLOCK-03 修） | 核心 2 的「并入流内卡（`ref` 卡携带证据 + 恢复入口）」候选方向**有现成卡型**；但 N-05 的一键重锚按钮当前在 L1 面板（Q-REG-005） |
| **取代台账机制（`docs/v4-supersession-ledger.json`）** | `protectedSupersession` 八步（①记录 old ②逐段决策 ③同编号等价改写 ④登记 `modifiedRanges[]` ⑤计算并写入新 pin ⑥计数守恒 ⑦`redlineRemap[]` ⑧RP-V4-08 反证）；`knownGap` 字段由 `test/supersession-ledger.test.ts` **机核强制**（`status=complete-steps-1-8` 时必须为空或仅声明闭环） | 核心 1/2 的取代**必须复用同一机制**（Q-REG-011） |
| **密度口径的反滥用三层（v4-1/v4-2/v4-3）** | 单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1（`density-scope.ts`）；`assertChromeNotInStream()` 形态判据（`[data-chrome-control]` / `[data-toolbar-slot]` / `.view-btn` 出现在 `#stream` ⇒ 抛错）；RP-V4-09 in-gate 反证 | 核心 1/2 若把控件在 `#stream` 内外搬动，**必须重跑这三层**（尤其 `assertChromeNotInStream` 的方向性） |

---

## 5. 假设与风险

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| **A-REG-001** | 5 条提示带的「事实」已 100% 由流内系统事件行 / 流内卡承载，**退役可见投影不会丢事实** | 逐通道核对 `STRIP_CHANNEL_KINDS` 的 6 条绑定是否各有真实生产 emitter（`host-registry.ts:25-27` 逐字声称「a node gate asserts each kind really has a production emitter call site」）；已在 v4-4 落地的 `system-merge.test.ts` 只覆盖 2 条**自动**通道 ⇒ **剩余 4 条需 spec 复算**（待验证） |
| **A-REG-002** | `site-hint` / `discovery-notice` 的**富内容**（三段/两段 + `#rebind` 可点动作 + 退避重试文案）在「单行系统事件行 + 卡」的承载下**不丢语义** | 需 spec 逐条比对 `#site-hint-title/-detail/-action` 与 `#discovery-title/-detail` 的**全部文案分支**（`sidepanel.ts:1558`、`journey.mjs:658-670` 的 `#11c~#11e`）——**待验证**（这是 A-REG-001 的最强反例温床） |
| **A-REG-003** | 「空态 0 计数控件」对**未来使用者**构成噪音（当前唯一用户是作者，尚无真实空态首屏反馈） | 作者确认（一行）；本报告**不据此声称普适收益**——标注「待验证」 |
| **A-REG-004** | 核心 2 的三条候选方向（并入卡 / 迁 L2 / 空态隐藏）**至少一条能同时满足**法一~法五 + 可点 ≤5 工具栏预算 + `assertChromeNotInStream` 形态判据 | spec/plan 阶段逐方向对账；若三条都不满足，需回到 discovery 重议（登记为**回退条件**） |
| **A-REG-005** | 退役投影会使 `sidepanel.js` **净减**（至少不超 `floor(480,026 × 1.05) = 504,027 B`） | `npm run build` + `stat -c %s dist/sidepanel.js` + 逐模块 metafile 归因（五要素重登记）——**待验证**（Q-REG-009） |
| **A-REG-006** | `journey` / `binding` 保护段的**语义**（而非字节）可在不降低断言力的前提下重锚 | 八步取代 + `countEvidence`（journey 下界 167）+ RP-V4-08 反证——**待验证**（Q-REG-011） |
| **A-REG-007** | 密度 31 登记格**不因隐藏 0 计数而变**（口径：`#stream` 豁免）；f-fidelity-fix §5.1 的「改写 31 格」表述与实际耦合面相符或不相符 | Chromium 实跑 `npm run test:density` 前后对比；**禁止沿用未验证断言排工作量**（Q-REG-010） |
| **A-REG-008** | 本轮 `.sddu/**` 只写本 Feature 目录、`src/`/`test/`/`dist/` 零改动，不影响任何既有门禁 | `git status --short` + `git diff --quiet -- packages/web-cli-plugin` 复核（本轮已遵守） |

### 5.2 主要风险（**含"保护门禁迁移量"预登记**）

| # | 风险描述 | 影响程度 | 预登记证据 / 应对方向（**不作方案承诺**） |
|---|---------|:--:|---|
| **R-REG-001** | **`journey` 保护段需二次显式取代**：`#15a~#15q` 内的结构/几何断言（`regionStreamFlexGrow`、`#15b` ≥65.0% 占比、`#15c` 法四、`#15f~#15w` 卡族、`#15p/#15r/#15s/#15t` 滚动跟随、`#15q` 320px 无溢出）逐条读 `#stream` / `#region-stream` 的**直接子节点与顺序**；宿主清零会改变 `#stream` 的子节点集合 ⇒ 可能触发**第二次八步取代**（新 pin 重算 + `supersededFrom` 链式保留 + `redlineRemap[]` 追加 + 计数守恒 ≥167 + RP-V4-08 反证） | **中高** | `docs/v4-supersession-ledger.json#protectedSupersession`（active pin `43054..55259` / sha `e2b500df…`，`supersededFrom 6b45c3fa…`）+ `#protectedRanges[0]`；`assertionRewrite.outsideSegment` 已登记 `#33f/#33n`（「v4 把提示带/占位宿主同构迁入 `#stream`，v3 时它们在 `#log` 之外，故「整段文本长度」不再是等价的量」）——**同类判决会再出现一次** |
| **R-REG-002** | **`binding` 保护段（`107780..115930` / sha `be9ad0e9…`，decision = keep）之外的 `binding` 断言直接读 `#notice`**：`binding.mjs:896` 等 `#notice` 文本 `/已授权/`（`#4b/#4c` 授权回执），另一处 `binding.mjs:2256` 读 `#discovery-notice`（`AP#4b`）。保护段*本体*可保持零 diff，但**段外断言会红** ⇒ 需要在取代台账 `modifiedRanges[]` 逐行登记（同 v4-1 的 `modifiedRanges[]` 先例） | **中高** | `docs/v4-supersession-ledger.json#protectedRanges[1]`（`decision = keep`）+ `test/ui/binding.mjs:896,2256` |
| **R-REG-003** | **`l0.mjs` 的 `EXPECTED_TRIGGERS` 12 条与 `disclosure.ts` 的 7 条白名单/7 对布线/`NEVER_FOLDABLE`（含 `'l0-decision'`）是同一套结构的双份声明**：退役 `l0-more` / `l0-ref-toggle` / `l1-*-toggle` 会同时改 `test/ui/l0.mjs:647-676` 的 ⑧ 组（逐条「存在 + 非空文字 + `aria-expanded`+`aria-controls` 成对 + 目标存在 + 目标含摘要或计数」）与 `test/l0-disclosure.test.ts`（`COLLAPSIBLE_TARGETS` / `DISCLOSURE_WIRING` / `NEVER_FOLDABLE`）。**断言零删除**是硬口径 ⇒ 只能等价重锚 | **中高** | `test/ui/l0.mjs:647-676`（12 条 `EXPECTED_TRIGGERS`）+ `src/ui/sidepanel/disclosure.ts:66-103`（7/7/含 `l0-decision`）+ `test/l0-disclosure.test.ts` |
| **R-REG-004** | **`l1.mjs` ②/⑫ + `page-input.mjs` 的几何/往返断言依赖这 4 个触发器的可见性**：`f-fidelity-fix` §5.1 逐字「`test/ui/l1.mjs` ②（展开几何「不遮挡」点击它们）/ ⑫（openAll/closeAll 往返）」；`EXPECTED_TRIGGERS` 也要求它们「有非空文字标签（禁「只有图标」）」⇒ 空态隐藏会与「非空文字」判据直接冲突（需要新判据形态，而非放宽） | **中** | `test/ui/l1.mjs`（②/⑫）+ `test/ui/page-input.mjs`（引用 L1 面板）+ `l0.mjs:670-690` |
| **R-REG-005** | **`hardening` / `env-guard` 单测是"投影存在"的正面断言**：`hardening.mjs:205,224-227`（`hasGuard` / `guardShown` / `guardText`）、`test/env-guard.test.ts`；`journey.mjs:658-670` 的 `#11c~#11e`（`#site-hint` `display !== 'none'` + 具体原因文案 + 下一步动作）。⇒ 退役投影会**正面冲突**，必须逐条等价改写（不是删断言） | **中高** | `test/ui/hardening.mjs:205,224-227`、`test/env-guard.test.ts`、`test/ui/journey.mjs:658-670` |
| **R-REG-006** | **密度夹具的稳态锚 = `#notice`**：`test/ui/density.mjs:346-364`（`settledProbe` + `assertFixtureSettled()`，逐字「the 29-char `#notice` of the settled session is present, not absent」）；重写夹具稳态定义会牵动 31 登记格的**夹具确定性**论证（该锚本身是 closeout 轮 validate R1 F2/K-1 的修复产物，**不得静默回退**） | **中** | `test/ui/density.mjs:310-364` + `docs/v4-density-baseline.json#counts`（31 格 / 28 机对 + 3 名义）+ `#knownLimitations` |
| **R-REG-007** | **体积五要素重登记 + 算术机核**：任何 `dist/sidepanel.js` byte 变化都必须① 重登记 `SIDEPANEL_BASELINE_BYTES` + `SIDEPANEL_RE_REGISTRATIONS` 新轮（前后值/日期/来源/理由/历史保留）② 保持 `SIDEPANEL_CEILING == floor(baseline × 1.05)`（**无 cap**，V3-VOL-1 ①）③ 披露算术逐项一致（I-10 `validateReRegistrationDisclosure`：元组前后值/Δ/% 必须与登记字段相等，`META.measuredBy` 与末条登记同源）④ `V3-VOL-3.newBaselineBytes` 同源前移、**档位 512,000 与绝对上限 563,200 不变**、`authorConfirmation.status` 仍为 `pending-author-line`（closeout §7 deferred 8：**未闭合义务，不得伪称已确认**）⑤ 逐模块 metafile 归因 Σ + glue == 登记增量 | **中** | `test/size-baseline.ts:301,360-366,395-510,940-992`；`test/size-budget.test.ts:45-53,300-303,429-444`；`test/size-growth-evidence.test.ts:126-133`；`docs/v4-supersession-ledger.json#v3Vol3Closeout` |
| **R-REG-008** | **密度 31 登记格的分歧口径（Q-REG-010）可能导致工作量误估**：若按 f-fidelity-fix §5.1 的「改写 31 格」排期，而实际 `#stream` 豁免、只需改夹具锚与（若迁出流外的）区壳读数，则会**高估或低估**；反之若内容迁入 `#view-host`（**不豁免**），则会**真实改写**区壳读数与 `riskIncrementRegistry` 的双向精确期望 | **中** | `src/ui/sidepanel/density-scope.ts:29-42`（`DENSITY_EXCLUDED_SUBTREES = ['#stream']`、`DENSITY_SHELL_ROOTS` 三区）+ `docs/v4-density-baseline.json#riskIncrementRegistry` |
| **R-REG-009** | **RP-V4-09 / RP-V4-01~07 反证必须仍然会红**：v4 的 13 条密度对抗探针与 86 条 v4-4 独立探针是"判据非空转"的机器证据；形态搬动后若反证不再 FAIL，则等于**判据空转**（v4-4 BLOCK-02 的同类教训：**删属性充数**）。⇒ 每条被改动的判据都要配**可 FAIL 反证** + sha 逐字节还原 | **中高** | `v4-chat/closeout.md` §6 第 15 条（对抗探针清单）+ `docs/v4-density-baseline.json#knownLimitations`（RP-V4-06 双层防线 / RP-V4-09） |
| **R-REG-010** | **`host-registry.ts` 自身是"判据即结构"的耦合体**：改宿主集合必须同步 ①`REGISTERED_STRUCTURAL_HOSTS` ②`RETIRED_HOST_IDS` ③`STRIP_CHANNEL_KINDS` ④`evaluateHostRegistry` 的 5 类问题串 ⑤ `test/density-thresholds.test.ts:715`（「归并矩阵：每个 strip 通道（除已归并的 `#notice` 外）必须 id 仍在 DOM 且绑定一个 kind」）——**而"退役投影"与"id 仍在 DOM"直接矛盾** ⇒ 该判据必须重写（不是放宽） | **中高** | `src/ui/sidepanel/host-registry.ts:52-114` + `test/density-thresholds.test.ts:715` + `test/system-merge.test.ts:61,102-107`（「TASK-033 的 v1 可读槽语义**保留**：`#notice` 元素仍读到同一条事实」） |
| **R-REG-011** | **`test/size-baseline.ts` / `test/ui/density.mjs` 等"门禁自身"出现形态漂移会抬高元门禁成本**：`test/gate-integrity`（12 条，判定器 selftest 15）+ `STATIC_ONLY_GATES` 只静态覆盖 ⇒ 新门禁需纳入受审集合；**串行纪律**（`test` / `test:ui` / `test:binding` **绝不并发**，1.5 GB 机器 OOM 前科） | **低** | `v4-chat/closeout.md` §7 deferred 10 + ROADMAP 立项纪律第 ④ 条（串行跑门禁） |
| **R-REG-012** | **`test:binding` 既知环境性 flake（`KL-N-10`）在重构轮会被误读为回归**：串行链首轮偶发红且**每次失败项不同**（`#6l residual=undefined` / `#8d/#8e no confirm`），隔离复跑即绿 | **低** | `docs/v4-supersession-ledger.json#knownLimitations` `KL-N-10`；`v4-chat/closeout.md` §7 deferred 2（纪律：隔离复跑 ≥2 / 日志全量 / 仍红如实记录**不阻塞**收口） |
| **R-REG-013** | **`options/index.html` 解冻是治理动作，可能打开更大面**：该文件在 `zeroDiffFiles` 冻结（零注入/零权限/零依赖红线）；解冻需显式登记。若连带触发 `zero-injection`（27 断言）等门禁重估，成本可能超出「改一行文案」的直觉 | **低** | `docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项，含 `src/ui/options/index.html`）+ `docs/v3-supersession-ledger.json` 为**冻结历史，不得解冻**（f-fidelity-fix §5.2 逐字） |
| **R-REG-014** | **`STREAM_HEIGHT_RATIO_MIN = 0.65` 是只允许上调的收紧型阈值**：宿主清零会改变 `#stream` 的内容高度分布 ⇒ `journey #15b`（`#region-stream` 高度占比 ≥65.0%）与 `test/ui/l0.mjs:874-875`（三视口结构集合含 `l0-decision`）可能需要重锚；**阈值不得下调**（`redlineRemap` 第 1 条明确「收紧到 65%」） | **中** | `docs/v4-density-baseline.json#streamRatioSpike`（12/12 PASS，最差格 0.7273）+ `docs/v4-supersession-ledger.json#redlineRemap[0]` + `test/ui/l0.mjs:874-875` |
| **R-REG-015** | **v4.5 若净增超 24,001 B 则直接 FAIL**（生效上限 504,027 B）；净减超单轮阈值会触发 `test/size-growth-evidence` 的相邻对告警口径（v4 段最差相邻对 +10.41%，<15% 告警线） | **中** | `test/size-budget.test.ts:53`（`504_027`）+ `v4-chat/closeout.md` §5（最差相邻对口径） |

### 5.3 风险预登记摘要（**保护门禁迁移量估计**）

> 口径：以下计数为**静态引用规模**（`grep` 实测，`packages/web-cli-plugin/test/**`），用作**工作量上界**参考；**不是**"要改的断言数"（等价重锚可能一条多改）。**discovery 不做估算承诺**。

| 组 | 元素 id | 涉及门禁文件数 | 元素 id 静态引用（`getElementById('…')` + `#id` 字面） | 主要门禁 |
|---|---:|:--:|---:|---|
| **strips（5 条）** | `env-guard` / `site-hint` / `onboarding` / `discovery-notice` / `notice` / `send-reason` | **15** | 44（`notice` 17+2 / `env-guard` 5 / `discovery-notice` 6 / `onboarding` 5 / `site-hint` 2 / `send-reason` 3） | `journey` / `binding` / `hardening` / `density` / `insight` / `recommendation` / `density-thresholds.test.ts` / `env-guard.test.ts` / `settings.test.ts` / `sidepanel-view.test.ts` / `capability-revoke.test.ts` / `tree-ops.test.ts` / `insight-security.test.ts` / `size-baseline.ts` / `density-metrics.mjs` |
| **decision 壳** | `l0-more` / `l0-ref-toggle` / `l0-receipt-summary` / `l0-decision` / `l1-more` / `l1-ref` / `l1-consequences-toggle` | **9** | 58（`l0-more` 16 / `l0-ref-toggle` 11 / `l0-decision` 18 / `l1-ref` 10 / `l1-more` 2 / `l0-receipt-summary` 2 / `l1-consequences-toggle` 1） | `l0.mjs` / `l1.mjs` / `l1-reverse.mjs` / `density.mjs` / `page-input.mjs` / `l0-disclosure.test.ts` / `l1-ref-validity.test.ts` / `density-thresholds.test.ts` / `size-baseline.ts` |
| **l1-panels 组** | `l1-local-tree-toggle` / `l1-history-toggle` / `l1-receipt-toggle` / `l1-gestures-toggle` | **4** | 6（3/2/0/1，`#id` 字面 0） | `l0.mjs` ⑧ / `l1.mjs` ②⑫ / `page-input.mjs` / `l0-disclosure.test.ts` |
| **保护 pin** | journey `43054..55259`（sha `e2b500df…`）/ binding `107780..115930`（sha `be9ad0e9…`） | 2 段 | — | `supersession-ledger.test.ts`（八步 + RP-V4-08 反证 + `knownGap` status↔一致性机核） |
| **体积链** | `SIDEPANEL_BASELINE_BYTES=480_026` / ceiling `504_027` / `RE_REGISTRATIONS` / `GROWTH_BREAKDOWN` / `PENDING_ABSOLUTE_CAP` | 4 | — | `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts` / `size-baseline.ts` |
| **密度登记格** | 31 格（28 机对 + 3 名义）+ `riskIncrementRegistry` + `RP-V4-01~09` | 3 | — | `density.mjs` / `density-thresholds.test.ts` / `density-metrics.mjs` |
| **`src` 侧同步点** | `strips` 13 文件 / `decision 壳` 8 文件 / `l1-panels` 3 文件（含 `index.html` 与 `disclosure.ts`） | — | — | `host-registry.ts` / `system-events.ts` / `stream-model.ts` / `view-model.ts` / `l1/panels.ts` / `sidepanel.ts` / `chat-state.ts` / `disclosure.ts` |

---

## 6. 下一步建议

| 优先级 | 事项 | 说明 |
|--------|------|------|
| 高 | **先裁决 §7.4 的 5 个开放问题（O-REG-001~005）**，特别是 **O-REG-001（富提示详情去向）** 与 **O-REG-002（已决策历史与流的关系）** | 它们是核心 1/2 的**前置**：详情面无归属则投影无法退役；历史面未裁决则 `l1-panels` 无法去固定位置 |
| 高 | **实测澄清 Q-REG-010 的分歧口径**（`#stream` 豁免 ⇒ 31 格是否真受影响） | 禁止沿用未验证断言排工作量（A-REG-007） |
| 高 | **把 R-REG-001/R-REG-002 的保护段取代成本写进 spec 的范围与验收** | 取代是**显式动作 + 台账留痕**，不是"顺手改测试" |
| 中 | **对账 A-REG-001/A-REG-002**：逐条核对 6 条 `STRIP_CHANNEL_KINDS` 是否各有生产 emitter；逐条比对 `site-hint` / `discovery-notice` 的全部文案分支 | 这是"退役不丢事实"的**唯一证据路径** |
| 中 | **确认 F 纯形目标的可验收描述**（§1.3 + `option-f-chat-stream.html:1494-1498` 五条变化点逐条可判） | 供 spec 转成 AC；避免"形态目标"停留在散文 |
| 中 | **外部竞品调研（如需）**：若 spec/plan 认为「聊天式 agent 面板如何组织流外管理面」需要外部参照，显式登记为待调研项 | 本轮未执行，不编造结论（§4.1） |
| 低 | **`options/index.html` 解冻的治理动作评估**（O-REG-004） | 属可选项；若裁决不解冻，FIX-2 的 deferred 继续保留 |

### 6.1 F-31 占用复核结果（**本轮实测**）

| 项 | 实测命令 | 结果 |
|---|---|---|
| `F-28` / `F-29` / `F-30` | `grep -c "F-28" / "F-29" / "F-30" .sddu/specs-tree-root/ROADMAP.md` | 已占用（F-28 = v3-ui 已收口 / F-30 = v4-chat 已收口；**F-29 = A2A 候选，未立项未排期，保持原样不动**） |
| **`F-31`** | `grep -c "F-31" .sddu/specs-tree-root/ROADMAP.md` → **0** | **未占用**（ROADMAP 中 0 命中） |
| `F-31` 的仓库其他命中 | `grep -rn "F-31" .`（排除 `node_modules`）→ **4 处** | 全部是 v4-chat 产物中的**文字说明**（`state.json:249` 的 `idOccupancyCheck` 与 `discovery.md:39,287` 的「F-30 未占用，无需改 F-31」）——**不是** Feature 登记，**不构成占用** |
| `F-32` / `F-33` | `grep -rc` → **0** | 未占用（无需考虑） |
| **编号结论** | — | **登记为 F-31 即可，无需顺延**；本轮不改 ROADMAP（登记留给收口） |

### 6.2 版本位核验（**本轮实测**）

| 项 | 实测 | 结果 |
|---|---|---|
| ROADMAP 文档版本 | `> **文档版本**: 1.27.0` | — |
| **`v0.9.1`** | `grep -c "v0.9.1" .sddu/specs-tree-root/ROADMAP.md` → **0** | **零冲突**（版本总览表中无 v0.9.1 行；v0.9.0 现为**三主题并列**：工程质量与文档对齐 / F-28 v3-ui / F-30 v4-chat） |
| 「v4 维护版本段」先例 | `grep -c "f-fidelity-fix\|FIX-1\|FIXFID" .sddu/specs-tree-root/ROADMAP.md` → **0** | **f-fidelity-fix 快修轮根本未登记进 ROADMAP**（它是独立成本文档 `docs/f-fidelity-fix-2026-09-20.md`）⇒ **v4.5 将是第一个"维护轮"版本位**，`v0.9.1` 命名**无先例可循、也无冲突** |
| 版本位结论 | — | **建议采纳 `v0.9.1`（v4 维护版本段）**，措辞建议区分于 v0.9.0 的三主题并列：v0.9.1 = **v4（F-30）的维护收尾**（不是新主题）。**登记留给收口**；`F-29` 区段一字不动 |

### 6.3 建议的叶子拆分草案（**供 spec 参考；discovery 只提建议不执行**）

> 依据：核心 2 项**取代的对象、门禁面、取代台账条目**互不重叠（strips 面向 `interaction`/`host` 通道；宿主时间序面向 `#stream` 结构），具备独立成叶的判据；但**两者共享同一次 `scope` 体积重登记与同一次 journey 结构重锚** ⇒ 必须串行（deliveryOrder 明确）。

| 叶 | 名称（建议） | 内容 | 依赖 |
|:-:|---|---|---|
| v4.5-1 | `specs-tree-v45-1-strips-single-write`（**strips 单写化**） | 退役 5 条提示带的可见投影；`STRIP_CHANNEL_KINDS` 与「id 仍在 DOM」判据重写；`#notice` 稳态锚迁移；`env-guard` / `hardening` / `journey #11c~#11e` / `binding #4b~#4c` 等价改写；富提示详情面落地（依 O-REG-001 裁决） | —（P0） |
| v4.5-2 | `specs-tree-v45-2-host-timeline`（**宿主时间序化**） | `decision` 壳与 `l1-panels` 组去固定位置；`host-registry.ts` 语义重写（"永久宿主" → "零/最小固定宿主"）；`ol#stream` 纯时间序判据；`l0.mjs EXPECTED_TRIGGERS` / `disclosure.ts` 注册表 / `l1.mjs` ②⑫ 等价重锚；FIX-5 消解（若被覆盖） | v4.5-1（同一次 journey/体积重锚串行） |
| v4.5-3 | `specs-tree-v45-3-options-unfreeze`（**`options/index.html` 授权文案**，可选叶） | 依 O-REG-004 裁决：若解冻，则改文案 + 显式解冻登记；若不解冻，本叶**不建**（deferred 保留） | v4.5-1/2 之后（治理动作，独立登记） |

> **父 Feature** = 轻量规范容器（同 v3-ui / v4-chat 先例：`phase=tasked / workflow=4.tasks / agent=sddu-tasks`，不承接 build/review/validate）。

---

## 7. 附录

### 7.1 现状基线（§2 摸底结果，**全部带 `file:line` 证据**）

#### A. `ol#stream` 的固定位置结构（核心 2 的对象）

| # | 事实 | 证据（`file:line`） |
|:-:|---|---|
| A1 | `#stream` 有 **4 个** `li[data-host]` 直接子节点：`decision` / `composer` / `l1-panels` / `strips` | `src/ui/sidepanel/index.html:1239-1348`（`<ol id="stream">` 内 `<li data-host="…">`） |
| A2 | 卡被插入到 **composer 宿主之前** ⇒ DOM = `[decision][卡…][composer][l1-panels][strips]` | `src/ui/sidepanel/stream-render.ts:66-71`（`messageAnchor()`）+ `:126-136`（反序 `insertBefore`） |
| A3 | `decision` 宿主的实际内容 = `#l0-kicker`（「决策 · 回执 · 引用」）+ `#l0-more`（`更多选项（还有 0 个）`）+ `#l0-receipt-summary`（`hidden`）+ `#l0-ref-toggle`（`引用 0 条`）+ `#l0-ref-badge` + `#l1-more` + `#l1-consequences` + **`#l1-ref`（引用证据面板，含 `#l1-ref-repick` / `#l1-ref-describe` / `#l1-ref-rescue`）** | `src/ui/sidepanel/index.html:1244-1284` |
| A4 | `l1-panels` 宿主的实际内容 = `#l1-local-tree-toggle` / `#l1-history-toggle` / `#l1-receipt-toggle` / `#l1-gestures-toggle` 4 个触发器 + 各自 `hidden` 面板 | `src/ui/sidepanel/index.html:1297-1333` |
| A5 | `#composer` 保持 `hidden`（法四）；`#input` / `#send` 被 journey/binding 读取 | `src/ui/sidepanel/index.html:1287-1292` + `host-registry.ts:59-64` |
| A6 | 固定位置宿主曾造成**不可滚动到达**（`#l0-decision` 跑到视口上方 −511px） | `src/ui/sidepanel/index.html:296-299`（v4-1 修订注释） |

#### B. 提示带与通道绑定（核心 1 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| B1 | `STRIP_CHANNEL_KINDS` 登记 **6 条**绑定（`env-guard→env` / `site-hint→site` / `onboarding→firstRun` / `discovery-notice→probe` / `send-reason→send` / `notice→notice`） | `src/ui/sidepanel/host-registry.ts:107-114` |
| B2 | 每条绑定的 `reason` 都声明「同时保留 DOM 可读投影 + 已事件化」 | 同上 `:108-113` |
| B3 | `strips` 宿主的 `reason` 逐字承认双写：「keep their readable **status projection**（protection gates pin …），but every fact is **ALSO append-recorded** through the one system channel」 | `host-registry.ts:74-76` |
| B4 | v4-4 之前的 6+ 瞬时通道与 `#notice` **覆盖语义**（无时间戳、无顺序、可被下次 render 替换） | `src/ui/sidepanel/system-events.ts:8-20` |
| B5 | 单通道的 4 条规则与常量：去重窗口 **5000 ms** / 速率上限 **20 行/分钟** / 「持续：」前缀 / `dropped` 不静默 | `system-events.ts:44-58` |
| B6 | `#site-hint` 是**富内容**（三段 + `#rebind` 可点动作）；`#discovery-notice` 是**两段**（title/detail） | `index.html:1335-1345`（`sh-title`/`sh-detail`/`sh-action`）+ `index.html:1431`（`#rebind`）+ `sidepanel.ts:1558`（`site-hint-action`）+ `sidepanel.ts:2634-2635`（`rebind` 监听） |
| B7 | `test/system-merge.test.ts` 只覆盖 **2 条自动通道**（导航失效 + `#notice` 覆盖槽）；并断言「`#notice` 元素仍读到同一条事实」 | `test/system-merge.test.ts:8-15,61,102-107` |
| B8 | 归并矩阵判据要求「每个 strip 通道（除已归并的 `#notice` 外）必须 **id 仍在 DOM** 且绑定一个 kind」 | `test/density-thresholds.test.ts:715` |

#### C. 注册表与退役台账（核心 3 的对象）

| # | 事实 | 证据 |
|:-:|---|---|
| C1 | `REGISTERED_STRUCTURAL_HOSTS` = 4 条，全部 `transitional: false` + 逐条 reason | `host-registry.ts:52-77` |
| C2 | 模块注释逐字：「Each is a **permanent structural home now**」「the v4-1「过渡」reading **no longer applies**」「the marker was removed as part of the **CLOSED state** — not as a way to silence the count」 | `host-registry.ts:46-51` |
| C3 | `RETIRED_HOST_IDS` 只剩 2 个 v4 早期容器（`l0-pick` / `l0-status-band`） | `host-registry.ts:89-92` |
| C4 | `evaluateHostRegistry` 的 5 类问题串（登记缺失 / 未登记新增 / `transitional !== false` / 过渡标记非 0 / 已退役容器仍在 DOM） | `host-registry.ts:132-152` |
| C5 | v4-1 原始义务与 BLOCK-02 判决（「删属性充数」= **自我裁决自我验收**） | `host-registry.ts:6-12` |
| C6 | `l0.mjs` 的 `REGISTERED_TRANSITIONAL_HOSTS = 0` 与「断言从『等于登记值』升级为结构性判据」 | `test/ui/l0.mjs:71-83` |
| C7 | `l0.mjs` ⑧ 的 `EXPECTED_TRIGGERS` **12 条**（含 `l0-more` / `l0-ref-toggle` / `l1-consequences-toggle` / 4 个 `l1-*-toggle`）与逐条判据（存在 + 非空文字 + `aria-expanded`/`aria-controls` 成对 + 目标存在 + 目标含摘要或计数） | `test/ui/l0.mjs:647-690` |
| C8 | `disclosure.ts` 三份声明：`COLLAPSIBLE_TARGETS`（7 项）/ `DISCLOSURE_WIRING`（7 对）/ `NEVER_FOLDABLE`（含 `'l0-decision'`） | `src/ui/sidepanel/disclosure.ts:66-103` |

#### D. 门禁基线（f-fidelity-fix 轮后，**逐条来自已入库文档**）

| 门禁 | 计数 | 来源 |
|---|---|---|
| `npm test` | **1001**（轮前 992，+9） | `docs/f-fidelity-fix-2026-09-20.md` §2 |
| `test:supersession` | 33（值重 pin，断言零删减） | 同上 |
| `test:l0` | **223**（轮前 221，+2） | 同上 |
| `test:l1` | 111 | 同上 |
| `test:l2` | 74 | 同上 |
| `test:density` | **175**（阈值 7/15 · 9/20 · 17/35 零改动；28 登记格显式重锚） | 同上 |
| `test:journey` | **167** | 同上 + `v4-chat/closeout.md` §4 |
| `test:insight` | 116 | 同上 |
| `test:binding` | **192** | 同上（`#KL-N-10` 串行 flake，隔离复跑 rc=0） |
| `test:hardening` | 24 | 同上 |
| `test:e2e` | PASS | 同上 |
| `test:gate-integrity` | 12（判定器 selftest 15） | 同上 |
| `test:design-contract` | 6（node 文件；shim 60/60 + 双 sha 冻结未动） | 同上 |
| `test:zero-injection` | 27 | 同上 |
| `test:page-input` | 106 | 同上 |
| `test:stream` | 63 | 同上 |
| `test:ask-auth` | 61 | 同上 |
| `test:recommendation` | **56**（轮前 49，+7） | 同上 |
| `test:ref-pick-wiring` | 11 | 同上 |
| `test:size-ruling-vol3` | 10 | 同上 |
| `test:l1-reverse` / `test:l2-reverse` | 9 / 10 | 同上 |
| `test:ui` | 167（全量串行命中一次 `#54g` flake，隔离复跑 rc=0） | 同上 |

#### E. 体积与 V3-VOL-3（本轮实测复核）

| 项 | 值 | 证据 |
|---|---|---|
| `dist/sidepanel.js` | **480,026 B** | `ls -l`（本轮实测）+ `test/size-baseline.ts:301 SIDEPANEL_BASELINE_BYTES = 480_026` |
| 生效上限 | **504,027 B** = `floor(480,026 × 1.05)` | `test/size-baseline.ts:360-366` + `test/size-budget.test.ts:53,300,439` |
| 余量 | **24,001 B（+4.76%）** | 计算 |
| 绝对上限 | **563,200 B** = `ceilTo50KB(465,000) = 512,000 × 1.10` | `docs/v4-supersession-ledger.json#v3Vol3Closeout` + `v4-chat/closeout.md` §5 |
| 距绝对上限余量 | **83,174 B（+17.57%）** | `v4-chat/closeout.md` §5（轮前数字同口径） |
| `PENDING_ABSOLUTE_CAP` | `resolved: true`（三值齐备：`newBaselineBytes` 随基线前移至 480,026 / `absoluteCeilingBytes` 563,200 / `resolvedOn` 2026-09-19） | `test/size-baseline.ts:461` + `v4-chat/closeout.md` §5 |
| `SIDEPANEL_CEILING_CAP` | `record-only`（V3-VOL-1 ② 教训：不设自缚装置） | `test/size-baseline.ts:348-358` |
| `authorConfirmation` | **`status: "pending-author-line"`**（⏳ **未闭合义务**，作者可一行否决改值） | `v4-chat/closeout.md` §5 + §7 deferred 8 |
| `dist/content.js` | **177,076 B** / sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | 本轮实测 |
| `dist/pick-layer.js` | **33,900 B** / sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | 本轮实测 |

#### F. 密度口径（本轮实测复核）

| # | 事实 | 证据 |
|:-:|---|---|
| F1 | **`#stream` 整棵子树被排除出密度口径**（唯一豁免声明点） | `src/ui/sidepanel/density-scope.ts:38 DENSITY_EXCLUDED_SUBTREES = ['#stream']` |
| F2 | 三区壳根（**不豁免**，仅归因用）：`#region-toolbar` / `#region-stream` / `#region-statusbar` | `density-scope.ts:41-45` |
| F3 | 反滥用常量（单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡） | `density-scope.ts:47-60+` + `docs/v4-density-baseline.json#perCardBudget` |
| F4 | 阈值：`default 7/15` · `firstRun 9/20` · `risk 17/35`（**逐字保留**） | `docs/v4-density-baseline.json#thresholds` |
| F5 | 登记格 **31**（28 实测机对 + 3 名义）；composition = 9 强制 + 15 风险子场景 + 3 空态 + 3 风险详情展开 + 1 worst | `docs/v4-density-baseline.json#counts` |
| F6 | 默认档实测读数（fidelity-fix 轮重锚后）：320/400 = `5/7/15/4/211`、520 = `5/7/15/4/213`（clickables/lines/blocks/regions/chars） | `docs/v4-density-baseline.json#tiers.default` |
| F7 | 夹具稳态锚 = **`#notice` 存在且非 `hidden`**（逐字：「the 29-char `#notice` of the settled session is present, not absent」） | `test/ui/density.mjs:310-364` |
| F8 | 豁免守卫生效 + 阶段 F 基线兜底两层（`assertChromeNotInStream()` + 逐格比对） | `density-scope.ts` + `docs/v4-density-baseline.json#knownLimitations`（N-02） |
| F9 | `riskIncrementRegistry` 双向精确期望 + 溯源门槛字段（`rulingId`/`rulingDate`/`approvedBy`/`reason`，缺任一 ⇒ FAIL） | `docs/v4-density-baseline.json#riskIncrementRegistry` |

### 7.2 干系人约束红线清单（**从 closeout 继承，逐字保留阈值 / 冻结面**）

> 本清单为**约束**（不是需求）；spec 必须逐条落为 `NG-REG-*` 或 `AC-REG-*`，**不得改写数值或放宽口径**。

| # | 红线（**逐字**） | 来源 |
|:-:|---|---|
| N1 | `dist/content.js` = **177,076 B**，sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（**零容差**） | `f-fidelity-fix` §4 + 本轮实测 |
| N2 | `dist/pick-layer.js` = **33,900 B**，sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59`（**零容差**） | 同上 |
| N3 | `sidepanel.js` ≤ 生效上限 **504,027 B** = `floor(480,026 × 1.05)`；单轮容差 **5%** 未动；`SIDEPANEL_CEILING_CAP` 保持 **`record-only`**（V3-VOL-1 ②：不设自缚装置） | `test/size-baseline.ts:348-366` + `f-fidelity-fix` §3 |
| N4 | V3-VOL-3 三值：档位 `ceilTo50KB(465,000)` = **512,000**、绝对上限 = **563,200**（= 512,000 × 1.10）、`newBaselineBytes` 随现行基线**同源前移**；`authorConfirmation.status ∈ {pending-author-line, confirmed, overridden-by-author}`，**不得伪称已确认** | `docs/v4-supersession-ledger.json#v3Vol3Closeout` |
| N5 | 密度阈值 **7/15 · 9/20 · 17/35 逐字保留**；豁免口径**只认 `hidden`**；防滥用单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 | `docs/v4-density-baseline.json#thresholds` + `#perCardBudget` |
| N6 | **`STREAM_HEIGHT_RATIO_MIN = 0.65`（只允许上调）**；`journey #15b` 「`#region-stream` 高度占比 ≥65.0%」 | `docs/v4-supersession-ledger.json#redlineRemap[0]` + `docs/v4-density-baseline.json#streamRatioSpike` |
| N7 | **风险位永不折叠**（`#region-statusbar` 本体永不带 `hidden`；`#risk-chips` 有风险时无 `hidden`；`#l0-decision` 在 `NEVER_FOLDABLE` 内） | `index.html:1370-1385` + `disclosure.ts:93-103` |
| N8 | **零新增静态权限**（`manifest.json` 不动、无 `contextMenus`） | `f-fidelity-fix` §3 红线核验 |
| N9 | **判定链零触碰**：`src/security/policy.ts` / `src/security/auto-authorize.ts` 在 `zeroDiffFiles` 冻结（内容哈希 pin） | `docs/v3-supersession-ledger.json#zeroDiffFiles`（9 项） |
| N10 | `src/ui/options/index.html` 在 `zeroDiffFiles` 冻结；**要改需先走一次显式解冻登记**（治理动作）；v3 台账为**冻结历史，不得解冻** | `f-fidelity-fix` §5.2 + `docs/v3-supersession-ledger.json:2771-2781` |
| N11 | `design/**` 与 `test/design-contract.test.ts`（shim）**未触碰**；改稿必须同时满足 shim **60/60** + 更新 `DRAFT_SHA256` / `SHIM_SHA256` / `ASSERTION_MAP` + 台账登记 `designContractChanges`（FR-CHAT-036 禁静默改断言） | `test/design-contract.test.ts:61-73,158-211` + `f-fidelity-fix` §4 |
| N12 | **断言零删除零降级、计数只增不减**（唯一例外：保护段按 ADR-V4-008 **显式取代**并留台账，**不是静默删除**） | `v4-chat/closeout.md` §4 纪律 + `f-fidelity-fix` §2 |
| N13 | 保护 pin：journey **`43054..55259` / sha `e2b500df…`**（`supersededFrom 6b45c3fa…`，leafBase `187c205`）；binding **`107780..115930` / sha `be9ad0e9…`**（`decision = keep`） | `docs/v4-supersession-ledger.json#protectedRanges` |
| N14 | **门禁严格串行**（一次一个 Chromium，`finally` 自清 profile；`test` / `test:ui` / `test:binding` **绝不并发**） | ROADMAP 立项纪律第 ④ 条 |
| N15 | 纪律：**不碰 `main`、不 force push、path-limited `git add`（禁 `git add -A` / `.`）、禁改 `.opencode/opencode.json`、禁改 `packages/web-cli-base/**`、无新依赖**；**不合 main、不发布** | ROADMAP 立项纪律第 ⑤⑥ 条 |
| N16 | 取代台账 `knownGap` 一致性：`status = complete-steps-1-8` 时该字段**必须为空或仅声明闭环**（`test/supersession-ledger.test.ts` 机核强制） | `docs/v4-supersession-ledger.json#protectedSupersession.knownGap` |
| N17 | `F-29`（A2A 候选）**未立项未排期，保持原样不动**（ROADMAP 相关区段一字不动） | `v4-chat/closeout.md` §7 deferred 11 + §9 C-5 |
| N18 | `KL-N-10` 处置纪律：首轮异常**隔离复跑 ≥2**、日志全量、**仍红如实记录不阻塞收口**（不伪造串行绿） | `docs/v4-supersession-ledger.json#knownLimitations` + `f-fidelity-fix` §2 |

### 7.3 门禁影响面预判（**迁移量估计，不是承诺**）

| 门禁 | 预判存活度 | 主要冲击点 |
|---|---|---|
| `test:journey`（167） | **低—中** | 保护段 `#15a~#15q` 内 `#15f~#15w`（卡族）/ `#15p/#15r/#15s/#15t`（滚动跟随）/ `#15q`（320px）可能需二次取代；**段外** `#11c~#11e`（`#site-hint` `display !== 'none'` + 原因文案 + 动作文案）、`#AP`（`#discovery-notice` 文本不含「重新探测」）、`#16d~#16g` / `#16p~#16t`（会话切换 / 二次确认的前置步骤读 `#settings-back` / `#confirm-*`）逐条受影响 |
| `test:binding`（192） | **中—高** | 保护段 `107780..115930`（`#22a~#22l`，override chain）**可保持零 diff**；段外 `#4b/#4c`（`#notice` 授权回执）、`AP#4b`（`#discovery-notice`）需等价改写并逐行登记 |
| `test:l0`（223） | **低** | ⑧ 组 `EXPECTED_TRIGGERS` 12 条 + 逐条判据（存在 / 非空文字 / ARIA 成对 / 目标含摘要或计数）随宿主退役改写；`:874-875` 三视口结构集合含 `l0-decision` |
| `test:l1`（111） | **低—中** | ②（展开几何「不遮挡」4 个 `l1-*-toggle`）/ ⑫（openAll/closeAll 往返） |
| `test:l2`（74） | **高** | 只读 L2 视图内部不动；若核心 2 走「迁 L2」方向则新增内容但不删断言 |
| `test:density`（175） | **中** | 夹具稳态锚（`#notice`）必改；若内容迁出 `#stream` 落入区壳 ⇒ 31 格与 `riskIncrementRegistry` 双向期望重算；阈值**不得变** |
| `test:insight`（116） | **中** | `#discovery-notice` / `#env-guard` 文本读取点 |
| `test:recommendation`（56） | **中** | ⑬ 前置读 `#onboarding` 可见性（首装态驱动） |
| `test:hardening`（24） | **低** | `#env-guard` `hasGuard` / `guardShown` / `guardText` 三条正面断言 |
| `test:stream`（63）/ `test:ask-auth`（61）/ `test:ref-pick-wiring`（11） | **高** | 事件模型 / 卡族 / 布线不因宿主退役而变（若 `ref` 卡携带证据，则 `ref` 卡断言会**增**） |
| `test:page-input`（106） | **中** | `#l1-ref` 面板与 `#l1-*` 触发器的引用/L1 交互面 |
| `test:supersession`（33） | **低** | `knownGap` 一致性 + 八步 + RP-V4-08；新增取代条目必须登记 |
| `test:size-*`（`test` 内） | **低—中** | 强制五要素重登记 + 算术机核 + `V3-VOL-3` 三值前移 + 逐模块 metafile 归因 |
| `test:design-contract`（6） | **高** | 只要不碰 `design/**` 即恒绿（N11） |
| `test:e2e` / `test:gate-integrity` / `test:zero-injection` | **高** | 不涉形态；新门禁需纳入受审集合 |
| `test:l1-reverse`（9）/ `test:l2-reverse`（10） | **中** | 反证的**注入点**若被搬走，反证需重写（判据不得空转，R-REG-009） |

### 7.4 开放问题清单（**给 spec 阶段裁决**）

| ID | 开放问题 | 为什么必须在 spec 裁决（不裁决的后果） | 候选（编排器预登记，**非方案评估**） |
|---|---|---|---|
| **O-REG-001** | **富提示的详情面去向**：`site-hint` 三段 + `#rebind` 可点动作、`discovery-notice` 两段 + 退避重试语义，**是否需要详情面、在哪**（流内卡内的展开区 / 系统事件行 + 卡 / L2 视图 / 保留轻量投影） | 不裁决 ⇒「单行系统事件行」能否承载富文本 + 可点动作无法判定，核心 1 无法落地 | ① 流内卡携带（firstRun 卡先例）② 系统事件行 + 独立详情面（L2 或设置视图）③ 保留**最小**只读投影但去重写（**与"单写化"冲突，需显式裁决是否可接受**） |
| **O-REG-002** | **「已决策历史」与流的关系**：`#l1-history`（`已决策 N 步`）在「流本身即历史」下**是否重复、是否退役、退役后 N-05 式的"可回看"语义由谁承载** | 不裁决 ⇒ `l1-panels` 无法去固定位置（历史触发器是 4 个之一）；且 `rounds[]` 已单源于流（v4-3），投影退役的语义缺口需确认 | ① 退役（流即历史，`rounds[]` 已单源）② 保留为**计数 + 入口**但入口位置迁移 ③ 并入流内摘要卡 |
| **O-REG-003** | **手势说明（`#l1-gestures-toggle`，「6 个手势」表）的去向** | 它既非 0 计数（恒为 6）也非过程事实——是**静态帮助内容**；F 的三区法则与 7 类卡**都没有它的归属**（v4 报告曾把「站点级授权/会话/隐私开关/知情同意在 F 三区法则下无归属」登记为 `Q-CHAT-013`/`O-CHAT-005`，同类问题） | ① 迁 L2 视图 ② 并入设置视图 ③ 保留但移出 `#stream`（进工具栏？**与 ≤5 可点预算冲突**，需显式裁决） |
| **O-REG-004** | **`options/index.html` 授权文案是否解冻**（`zeroDiffFiles` 治理动作） | 不解冻 ⇒ FIX-2 的 deferred 永久保留（文档-实现不一致继续存在）；解冻 ⇒ 需显式登记 + 可能连带 `zero-injection` 等门禁重估 | ① 不解冻（**保留 deferred**，如实登记）② 显式解冻单文件 + 登记 ③ 解冻但把改动限制为**纯文案替换**（零结构/零权限/零依赖） |
| **O-REG-005** | **是否需要外部竞品调研**（「聊天式 agent 面板如何组织流外管理面」） | 若需要而未做 ⇒ spec 的方案论证缺少外部参照；若不需要而未显式裁决 ⇒ 后续可能被质疑遗漏 | ① 不需要（本 Feature 是既有设计的形态收尾，非选型）② 需要，登记为待调研项（交付前完成） |
| **O-REG-006** | **密度耦合口径的实测裁决**（Q-REG-010 / A-REG-007） | 两读法并存 ⇒ 工作量与验收面不同 | ① `#stream` 豁免成立 ⇒ 31 格不变（只改夹具锚 + 可能的区壳读数）② 存在**未被识别的耦合**（如 `l0.mjs` 的 fixture 供给 density）⇒ 需逐格重测 |
| **O-REG-007** | **`host-registry.ts` 的最终形态**：宿主清零后的判据是「集合为空」「集合等于最小集」还是「注册表退役为纯注释」？ | 不裁决 ⇒ 核心 3（治理结构反向锁定形态）无法关闭，`evaluateHostRegistry` 的 5 类问题串无终态 | ① 清零 + 注册表改为「禁止新增宿主」的**反向**判据 ② 保留最小集（如仅 composer，法四需要）③ 注册表降为文档（不承判据」 |
| **O-REG-008** | **N-05（重锚按钮位置）是否随之关闭** | 若 `#l1-ref` 面板退役或迁移，N-05 的处置必须重述（关闭 / 保留 / 改为卡内） | ① 随 `#l1-ref` 裁决一并关闭 ② 若仍不在卡内则**保留 deferred** |
| **O-REG-009** | **`FIX-5` 是否作为独立验收项**（还是被核心 2 覆盖后**消解**、仅登记为"已由 v4.5-2 覆盖"） | 影响叶拆分与 AC 归属 | ① 消解（不单独成叶/成条） ② 独立成 AC |

### 7.5 证据台账（文件级）

| 路径 | 用途 |
|---|---|
| `packages/web-cli-plugin/docs/f-fidelity-fix-2026-09-20.md` | v4.5 的**直接输入**（FIX-1~4 + §5 deferred 1~4 + 门禁对账 + 体积五要素 + 红线核验） |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/closeout.md` | v4 父收口总账（§4 门禁总账 / §5 体积 + V3-VOL-3 / §6 过程真问题 / §7 deferred 1~12 / §8 人工面 12 项 / §9 下一步） |
| `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/state.json` | v4 的 `roadmap.id = F-30` + `idOccupancyCheck`（F-31 顺延依据）+ `pendingObligations`（V3-VOL-3） |
| `.sddu/specs-tree-root/ROADMAP.md`（v1.27.0） | 编号空间与版本位（F-28/F-29/F-30 占用事实；v0.9.0 三主题并列；v0.9.1 零命中） |
| `packages/web-cli-plugin/design/ui-redesign/option-f-chat-stream.html` | **F 纯形契约**（三区法则 ⑤ 法一~法五 + ④ 7 类卡 + 相对 E 的 5 条变化点 + 已知取舍） |
| `packages/web-cli-plugin/test/design-contract.test.ts` | shim 60/60 + `DRAFT_SHA256` / `SHIM_SHA256` 冻结常量 |
| `packages/web-cli-plugin/src/ui/sidepanel/host-registry.ts` | **核心 1/2/3 的对象**（4 宿主登记 + 2 退役 + 6 通道绑定 + 5 类问题串 + 模块注释的自我承认） |
| `packages/web-cli-plugin/src/ui/sidepanel/index.html` | **DOM 骨架**（`ol#stream` 的 4 个 `li[data-host]` + 各宿主内容 + `#view-host` 视图替换 + `#region-statusbar`） |
| `packages/web-cli-plugin/src/ui/sidepanel/stream-render.ts` | 卡的插入锚（`messageAnchor` = composer 宿主）+ 反序 `insertBefore` |
| `packages/web-cli-plugin/src/ui/sidepanel/system-events.ts` | 单系统事件通道（4 条规则 + 3 个常量 + 「持续：」前缀） |
| `packages/web-cli-plugin/src/ui/sidepanel/density-scope.ts` | 密度豁免唯一声明点（`['#stream']`）+ 三区壳 + 反滥用常量 + `assertChromeNotInStream` |
| `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` | `COLLAPSIBLE_TARGETS`（7）/ `DISCLOSURE_WIRING`（7 对）/ `NEVER_FOLDABLE`（含 `l0-decision`） |
| `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | `firstRunCard`（`1044-1065`，归并先例）+ `L0_KICKER` / `toolbarDigest`（FIX-3/FIX-4 落点） |
| `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts` | 4 个 `l1-*-toggle` 的计数渲染（`345-346,363-364`，**无隐藏分支**） |
| `packages/web-cli-plugin/test/ui/{journey,binding,l0,l1,l2,density,hardening,insight,recommendation,page-input}.mjs` | 门禁读数点（逐条 §7.3） |
| `packages/web-cli-plugin/test/{env-guard,l0-disclosure,density-thresholds,system-merge,size-budget,size-growth-evidence,size-ruling-vol3,supersession-ledger}.test.ts` | 单测/元门禁（含 `zeroDiffFiles` 与 `protectedRanges` 依赖） |
| `packages/web-cli-plugin/test/size-baseline.ts` | `SIDEPANEL_BASELINE_BYTES = 480_026` / ceiling 公式 / 五要素登记册 / V3-VOL-3 三值 |
| `packages/web-cli-plugin/docs/v4-density-baseline.json` | 阈值 / 31 格 / `tiers.default` 读数 / `riskIncrementRegistry` / `knownLimitations`（RP 反证） |
| `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | 保护段八步 + active pins + `redlineRemap` + `knownLimitations`（`KL-N-08/10`）+ `v3Vol3Closeout` |
| `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | `zeroDiffFiles`（9 项，含 `src/ui/options/index.html` / `policy.ts` / `auto-authorize.ts`）+ 冻结历史口径 |

> **证据缺口（如实登记）**：① **真机首屏截图未入库**——`f-fidelity-fix` 文档记录的是"真机首屏评估的实现 ↔ 设计偏差"的**结论与修法**，仓库内未发现对应的截图/录屏产物（`grep` 范围见 §0.5）；本报告的问题陈述因此**以源码事实（§7.1 A~F）+ 文档中保留的观测事实**为准，**不声称有截图证据**。② **外部竞品调研未执行**（§4.1）。③ **`#l0-decision` 跑到视口上方 −511px** 是 v4-1 注释中的**历史实测值**（本轮未复现，登记为"源码注释记录"而非"本轮实测"）。④ **门禁计数全部引自 f-fidelity-fix §2 与 v4 closeout §4**（本轮未跑门禁）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v4.5「F 还原度转正」问题挖掘）：F-31 零占用核验 + v0.9.1 零冲突核验；范围 = 核心 2（strips 单写化 / 宿主时间序化）+ 附带 2（FIX-5 空态噪音 / options 解冻）+ 非目标 6 项；问题清单 Q-REG-001~012（核心 4 / 次要 4 / 潜在 4）；假设 A-REG-001~008；风险 R-REG-001~015（含保护门禁迁移量预登记）；开放问题 O-REG-001~009；叶子拆分草案 3 叶 | 2026-09-21 | SDDU Discovery Agent |
