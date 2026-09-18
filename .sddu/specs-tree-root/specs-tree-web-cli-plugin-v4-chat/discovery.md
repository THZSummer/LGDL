# 问题挖掘报告：specs-tree-web-cli-plugin-v4-chat

> **文档定位**: SDDU 问题挖掘报告 — 记录 F-30「web-cli-plugin v4 聊天流统一承载（方案 F 重构）」的问题域、痛点、场景与事实证据，作为 spec 阶段的输入
> **前置依赖**: 无（工作流起点）；事实输入 = 作者 2026-09-17 真机反馈（逐字）+ 作者 2026-09-18 确认立项 + 设计基准 `packages/web-cli-plugin/design/ui-redesign/option-f-chat-stream.html`（+ `option-f-shim.mjs` 60 断言，本轮实测 **60 passed / 0 failed**）+ 仓库现状（分支 `feature/web-cli-plugin` @ `187c205`，2026-09-18）+ 编排器裁决（Feature 命名 / F-30 / 五法则红线 / 不动面 / 随带硬义务）
> **创建人**: SDDU Discovery Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Discovery Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（v4「聊天流统一承载」问题挖掘）

web-cli-plugin v4（F-30，方案 F 重构）问题挖掘报告 —— 核心问题 = **过程性交互（问答 / 授权申请 / 下一步推荐 / 系统事件 / 引用生命周期）全部落在聊天流之外**，散落在「聊天流之上的独占决策槽 + 底部 6 条瞬时提示条 + 顶部永不折叠风险带 + 3 处引用投影」中，**解析即消失、不留痕、不可回看**；作者真机现场的一段完整过程（编号问答 → 回答 → 引用失效 → 重拾 → 追问）**在界面上根本不存在**。方案 F 的正面主张 = **一切交互皆消息**（7 类卡，只追加/只固化），把三区收拢为「工具栏（≤5 可点）+ 聊天流（唯一交互面）+ 状态栏（常驻风险）」；本报告的职责是把「为什么现在不行」挖清楚并登记约束，不写需求、不写方案。

---

## 0. 立项来源、裁决与边界

> 本节记录立项的事实来源（作者原话 / 编排器裁决 / 仓库实测 / 设计基准），供 spec 阶段追溯；不加入需求条文，不做方案评价。

### 0.1 作者立项记录（**原话逐字保留**）

| 日期 | 来源 | 原话（逐字引用） |
|------|------|----------------|
| 2026-09-17 | 作者真机反馈（立项主诉） | 「**所有过程性的问答，建议放到聊天框里面，同时也方便看到授权记录，不要放到上面，丢失过程信息，每一步交互，尽可能都在聊天框留痕，作为事实依据，包括推荐的下一步操作，都放到聊天框里面**」 |
| 2026-09-17 | 作者布局主张 | 「**整体布局简化，工具栏、聊天框、状态栏**」 |
| 2026-09-17 | 作者内容主张 | 「**聊天框包含：AI答复聊天、下一步推荐、问答、权限申请**」 |
| 2026-09-17 | 作者设计指令 | 「先在 design/ui-redesign 输出一份方案F吧，输出完对着它进行重构」 |
| 2026-09-18 | 作者确认 | 「**开启重构的SDDU流程**」 |

**真机痛点现场（作背景，原作者描述事实，不美化）**：翻译指令 → `ask-user` 编号提问**浮在上层**（`#l0-decision`，聊天流之上）→ 回答「页面原地翻译」→ **引用 1 失效**（选择器断链、目标文字仍可见——R3 已修判定语义）→ 「重新拾取 / 改用描述」→ AI 又追问一轮 → **整段过程散落无留痕**。

> 三句原话是同一问题的三层：① **症状**（过程信息不在聊天框、在「上面」）② **结构主张**（工具栏 / 聊天框 / 状态栏三区）③ **内容主张**（聊天框四类内容 = AI答复 + 下一步推荐 + 问答 + 权限申请）。作者本人是插件当前**唯一真实用户**（见 §5.1 A-CHAT-008），其反馈是一手事实来源。

### 0.2 编排器裁决（2026-09-18，**已定案；本报告作为约束记录，不重新讨论**）

| # | 决策 | 性质 |
|---|------|------|
| D1 | **Feature 命名** = `specs-tree-web-cli-plugin-v4-chat`（目录 `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/`），继承 v1/v2/v3 命名惯例 | 定论 |
| D2 | **ROADMAP 编号 = F-30**（F-28 已被 v3-ui 占用、F-29 为 A2A 候选保留）。**本轮实测复核：`F-30` 在 `.sddu/specs-tree-root/ROADMAP.md` 中 **0 命中**（未占用）→ 无需改 F-31** | 定论 + 本轮复核 |
| D3 | **版本落点预判 = v0.9.0 同批叠加第三 Feature**（F-27 v0.8 同批第二、F-28 v0.9 同批的既有先例），由 discovery 核实后给出建议（见 §6） | 预判 → 本报告给出建议 |
| D4 | **设计基准** = `option-f-chat-stream.html`（1,927 行，S1~S7 场景）+ `option-f-shim.mjs`（60 断言 = 设计契约）；**A~E 稿存档保留、不推翻** | 定论 |
| D5 | **设计五法则为红线**（见 §0.3），任何实施不得违反 | 定论 |
| D6 | **不动面**（上游基线，零改动）：`dist/content.js` **177,076 B**、`dist/pick-layer.js` **33,900 B** 冻结；判定链 pin（`src/security/policy.ts` / `src/security/auto-authorize.ts`）；**manifest 零新增权限、无 `contextMenus`**；**风险永不折叠**原则；R1/R2/R3 修复语义（引用 declaration 状态一致性 / 探测退避 / 重锚救援） | 定论 |
| D7 | **随带硬义务（必须进 spec 验收）= V3-VOL-3**：本 Feature 收口时**重定 sidepanel 体积基线 + 设绝对值上限**（`test/size-baseline.ts#PENDING_ABSOLUTE_CAP` 的闭合必须带值）；取代 v3 面板资产走**取代台账**（测试守恒不降）；密度门禁按新布局**重新定标**（阈值哲学 7/15 · 9/20 · 17/35 保留，登记格重算） | 定论 |

### 0.3 设计基准与五法则红线（`option-f-chat-stream.html:31-74` 逐字口径）

**三区骨架**（`:33-46`）：

```
┌ 工具栏（顶部，一行，常驻）─ 站点摘要（只读 status）+ 常驻导航（树/命令/审计/设置）
│                            可点 ≤5；禁止：任何一次性交互（问答/授权/推荐）
├ 聊天流（主体，唯一交互面）─ 追加式正序流，自动滚底、可上滚回看（=留痕）
│                            一切交互皆 7 类消息卡之一
└ 状态栏（底部，常驻，永不折叠）─ ① 连接状态一行 ② 活跃风险 chips（有则显示）
                                 点 chip → 展开详情 + 滚动定位到流内相关卡
```

**7 类消息卡契约（`:48-60`）**：`ai` / `user` / `nextstep`（chips 即指令）/ `askuser`（应答或取消后**固化不可逆**）/ `auth`（批准或拒绝后**固化不可逆**）/ `system`（单行 + 时间戳，只追加）/ `ref`（有效/失效，失效卡保留，新引用序号递增）。固化态统一契约 = `data-*` 状态属性 + `[hidden]` 切换表单/固化区 + `.ts` 时间戳 + `.card-fixed`；**不存在「撤销回答 / 撤销批准」控件 —— 撤销本身是一条新的系统事件行**。

**五条设计法则（红线）**：

| 法则 | 内容（逐字口径） |
|------|----------------|
| 法一 | **一切交互皆消息**：问答 / 授权 / 推荐 / 系统事件一律入流；一次性交互禁止出现在工具栏或浮层（可静态核验） |
| 法二 | **留痕即事实**：卡片只固化不撤销（回答 / 批准 / 失效都是既成事实）；流 = 会话审计线索；完整台账仍走工具栏「审计」视图 |
| 法三 | **三区各司其职**：工具栏只放常驻导航与站点摘要；状态栏只放常驻状态与风险；一切「过程」进流 |
| 法四 | **输入按需出现**：无常驻输入框（沿用 E 的「页面即输入」主线）；`ask-user` text 型输入框只在问题卡内出现，卡内还有「其他…（我来描述）」兜底 |
| 法五 | **默认密度继承**：默认屏可点元素 = 工具栏 + 状态栏合计 **≤7**；**聊天流内容不计入**（它是记录，不是控件预算） |

> 设计稿自检（`option-f-shim.mjs`）：本轮**实测 60 passed / 0 failed**（纯 Node DOM 垫片，非项目 Chromium 门禁、零副作用、零构建、未改 dist）。覆盖三区结构 / 7 类卡 / 问答与授权固化 / 事件时间戳 / 密度预算 / 三宽度三主题 / 风险 chip 永不折叠。

### 0.4 时间线一页（R1 / R2 / R3 / V3-VOL-1~3，供 spec 阶段对齐口径）

| 日期 | 事件 | 与 v4 的关系 |
|------|------|-------------|
| 2026-09-15 | 作者真机反馈「布局凌乱、密度太高」（v3 立项，F-28） | v4 的**上游基线**：v3 的三层披露（L0/L1/L2）是 F 稿「继承 E 的视觉语言」的对象 |
| 2026-09-16 | v3-1~v3-4 建设（48 任务）；**V3-VOL-1**（撤销自加的 `SIDEPANEL_CEILING_CAP` 判定作用，降级 `record-only`）；**V3-VOL-2**（`pick-layer.js` 32,391 → 33,900 显式重登记） | v4 需继承「重登记五要素披露」纪律 |
| 2026-09-17 | v3 父收口（四叶 `validated`，F-28 登记进 ROADMAP）；收口后缺陷修复轮 **R1**（`0b60951`：无有效声明时拾取引用「出生即死」→ SW `declarationStatus` 单一事实源 + 摄取补全捕获事实 + D4 状态一致性口径） | D6「R1 修复语义」= 必须保留 |
| 2026-09-17 | **R2**（`a0b93c9`：站点声明探测指数退避 15s→5min 封顶 + 稳态「低频自动复查中」去闪烁；导航/切标签仍立即重试） | D6「R2 修复语义」= 必须保留 |
| 2026-09-17 | 作者真机反馈「过程性交互进聊天框」→ **F 稿立项** | §0.1 |
| 2026-09-17 | 方案 F 设计稿提交（`131f546`，shim 60/60） | 设计契约 |
| 2026-09-17 | **R3**（`3bff311`：引用重锚救援 —— 选择器断链时只读文本候选定位 + 唯一匹配一键重锚；**旧引用零改动 = append-only 留痕契约**；fail-closed 结论枚举不变；`dist/sidepanel.js` 368,529 → **375,102 B**） | ① D6「R3 修复语义」= 必须保留；② **R3 已在引用层落地 append-only 语义**，是 v4 流模型最直接的可复用先例（见 §7.1 A4） |
| 2026-09-18 | **V3-VOL-3 裁决**（`187c205`）：撤销 Feature 级 40% 累计停工线（`enforced:false` + `revokedBy`），**保留**单轮披露纪律，登记 `PENDING_ABSOLUTE_CAP`（`resolved:false`，F 收口必须带新基线 + 绝对上限值） | D7 硬义务的来源与机器判据 |
| 2026-09-18 | 作者确认「开启重构的 SDDU 流程」 | 本阶段 |

### 0.5 本阶段边界（discovery 职责声明）

- **只做**：问题挖掘、事实盘点、约束登记、假设与风险识别、初步分解建议。
- **不做**：不写 FR/NFR/AC（属 spec）、不写技术方案与 ADR（属 plan）、不排任务（属 tasks）、不评估方案优劣、不做替代方案对比。
- 所有「约束」均为**事实登记**（用于判断问题域可行性与风险），**不构成需求条文**。
- 本阶段**零运行时验证**：未跑 Chromium / e2e / test:ui / test:insight / test:binding / test:l0 / test:l1 / test:l2 / test:density / test:page-input；未构建、未改 `dist/**`。**唯一执行过的脚本**是设计稿自带的 Node 垫片 `option-f-shim.mjs`（只读、零网络、零构建、不触碰产物），用于核实「60 断言 = 设计契约」这一事实。
- 本阶段**只读代码 + 只写本 Feature 目录**：未改生产代码 / 测试 / 其他 SDDU 目录 / ROADMAP；未 commit / push。

---

## 1. 问题定义

> 概括核心问题及其业务影响，回答"为什么需要关注"

### 1.1 一句话问题陈述

**已绑定并授权站点的 web-cli-plugin 日常使用者（首位真实用户即作者本人），在一次完整任务回合（提问 → 澄清 → 拾取引用 → 执行 → 授权 → 回执 → 追问）中，无法在界面上看到自己刚刚走过的过程** —— 因为 `ask-user` 问答与破坏性确认被渲染在**聊天流之上**的一个独占槽位（`#l0-decision` / `#ask` / `#confirm`，`index.html:1228-1300`）且**解析即置 `null`**（`chat-state.ts:169-185`）；站点授权与撤销按钮藏在默认隐藏的 L1 状态面板里（`index.html:1141-1169`）；「下一步推荐」**根本不存在**（无生产者、无通道、无 UI，实测 grep 零命中）；系统事件散落在底部 **6 条瞬时提示条**（`index.html:1370-1391`）与顶部**永不折叠风险带**（`index.html:1128`）中，无时间戳、无顺序、会被下一次 `render()` 覆盖；引用生命周期被投影到 **3 个互不相邻的位置**（L0 chip / L1 证据面板 / 风险行）。代价是作者真机给出的「**不要放到上面，丢失过程信息**」——即**过程事实在界面上不存在**，用户无法回看「我是怎么走到这一步的」、无法把「刚才批准了什么」当作事实依据，而这正是插件作为「受信任的自动化代理」的信任基础；同时 F 稿把布局收敛为「工具栏 / 聊天流 / 状态栏」三区后，**v3 的既有门禁（l0 164 / l1 103 / l2 71 / density 127）与受哈希保护的门禁区段（journey 保护段含 `#log` / `#composer`）大面积落在被取代面上**，重构的验证成本与「测试守恒」压力是第二类必须正视的问题。

### 1.2 核心问题与业务影响

| 核心问题 | 业务影响 | 不解决的成本 |
|---------|---------|------------|
| **过程性交互不在聊天流内、解析即消失（无留痕）**：问答 / 破坏性确认渲染在流之上的独占槽位，`resolveAsk` / `resolveConfirm` 后槽位置 `null`；唯一「历史」是 L1 面板里的 `rounds[]`（1 次交互之外、仅内存、只覆盖 ask 不覆盖授权/引用/系统事件） | 作者原话诉求未被满足；「每一步交互都在聊天框留痕，作为事实依据」无法成立；插件作为自动化代理的**可审计性**缺失 | 作者已明确报出（2026-09-17）；信任基础继续缺失，用户无法复核自己的授权与回答 |
| **授权/权限决策不可回看**：`#authorize` / `#revoke` 在默认 `hidden` 的 `#topbar` 内（L1）；`confirm` 批准/拒绝结果只改一次 DOM 即消失；命令级决策虽进审计（`AUDIT_FIELD_WHITELIST` 含 `decision`），但**站点授权与确认批准不在流内可读** | 作者原话「同时也方便看到授权记录」直接落空；高风险决策（写操作/破坏性）的可追溯性依赖用户主动去审计视图翻查 | 授权记录与「我当时批准了什么」不可当场回看 → 高后果操作的信任成本高 |
| **「下一步推荐」完全缺失**：实测 `src/**` 内无推荐生产者 / 无推荐 UI / 无推荐通道（`grep 推荐|nextstep|suggest` 仅命中 `tree-receipt.ts` 的 `nextStep` 文案、`view-model.ts` 的静态提示串）；现状的「下一步」只以 5 种零散静态字符串存在（onboarding / site-hint / send-reason / 手势表 / 树回执） | 作者原话「包括推荐的下一步操作，都放到聊天框里面」失去承载面；用户每回合都要自己判断下一步 | 无法把「能力发现」变成「一步步被引导」；新用户（生态用户）发现成本高 |
| **布局无稳定三区心智**：现状是 6 个纵向带（`#risk-rail` → `#panel-top` → `#panel-main`(决策槽 + `#log` + `#view-host`) → `#l0-statusbar` → `#l2-entries` → `#panel-bottom`）+ 2 个 body 直挂常驻块 + 4 个入口面板 + 2 个整屏替换视图，`index.html` 含 **109 个 `id`** | 作者原话「整体布局简化」对应的结构症状；v3 的 L0/L1/L2 三层披露**已把密度压到 ≤7**，但**过程仍不在流里** —— 密度问题解决 ≠ 过程问题解决 | 后续任何过程类能力（推荐、留痕、回看）都没有承载面，只能继续往「上面」加槽位，重演同一问题 |

---

## 2. 用户画像

> 描述受影响用户角色及其场景，回答"谁遇到了什么问题"

| 用户角色 | 典型场景 | 关键痛点（用户原话） | 当前应对方式 |
|---------|---------|-------------------|------------|
| **日常站点使用者（首位真实用户 = 作者本人，当前唯一真实用户）** | 在已授权站点（真机现场：deepseek 页）让插件「把这页原地翻译」；过程中被 `ask-user` 问 3 个编号问题、拾取了一个引用、批准了一次写操作 | 「**所有过程性的问答，建议放到聊天框里面……不要放到上面，丢失过程信息**」；「每一步交互，尽可能都在聊天框留痕，作为事实依据」 | **忍受 + 提出诉求**：真机里继续用，但过程链条断了；明确表达「放在聊天框里」的理想状态（= 不满足于现状的显式信号） |
| 需要复核自己授权的使用者（同一人，风险场景） | 承上：批准了 `dom.click` 单次授权后，想确认「我刚才批准的是什么、批准了几次」 | 「**同时也方便看到授权记录**」 | 忍受：只能去「设置 → 更多 → 查看审计」翻六列白名单投影（命令名/动作 id/结果/耗时/时间/去参站点），且**站点级授权与确认批准不在其中可读** |
| 窄侧栏使用者（320–560px，窄屏优先） | 侧栏拖窄到 320px 仍要完成同一批任务 | 无原话；事实约束 = 既有门禁保证 320px 零水平溢出 + 默认档密度三视口逐项相等（`docs/v3-density-baseline.json#tiers.default`） | 忍受纵向滚动（推断，🟠 待验证；F 稿自身承认「流会随会话变长」，见 §7.1 D3） |
| 新用户 / 生态用户（后续 web-cli 站点用户） | 首次安装：先遇 onboarding + discovery-notice，再遇「下一步做什么」为空槽 | 无原话（作者本人已过首装期）；痛点与首行者同源但更重 —— **推荐能力 = 0** 对首行者最不友好 | 放弃（推断，🟠 待验证；见 A-CHAT-008） |
| 维护者 / 开发者（AI Agent + 作者） | 每次 UI 改动都要过 12 道门禁（含 9 个 Chromium 门禁） | 无原话；事实约束 = 门禁大量通过 `querySelector`/`getElementById` 直接钉住当前 DOM，且 journey 有一段**字节哈希保护段**（`#log` / `#composer` 布局契约） | 走「取代台账 + 断言只增不减」既有先例（`docs/v3-supersession-ledger.json`，按行判定） |

**用户旅程（现状，痛点位置标注）**：

```
[绑定 + 授权] → 授权按钮在默认隐藏的 #topbar(L1) 内（1 次交互）…  ← ★痛点 A：授权入口与记录都不在流里
    ↓
[表达意图] → 面板无常驻输入框（v3 已定）；「从页面拾取」或兜底输入框（须先选中「其他…」）
    ↓
[AI 提问] → ask-user 渲染在 #l0-decision（聊天流【之上】的独占槽）  ← ★痛点 B：过程不在流里
    ↓        回答 → resolveAsk → state.ask = null → 该问答【从界面消失】
[引用] → L0 chip「引用 N 条」→（1 次交互）L1 证据面板 →（另一处）风险行
    ↓                                                      ← ★痛点 C：引用生命周期分散 3 处
[破坏性确认] → #confirm 在同一个独占槽 → 批准 #confirm-resolution → 置 null → 消失  ← ★痛点 B 复现
    ↓
[执行 / 回执] → tool 卡进 #log ✓（唯一真正在流里的过程信息）
    ↓
[想知道下一步] → 无推荐卡；只有静态提示串散落 5 处  ← ★痛点 D：推荐能力为 0
    ↓
[想回看] → L1 面板「已决策 N 步」（1 次交互之外、仅内存、只覆盖 ask）  ← ★痛点 B 的补救缺口
```

**关键转折点**：上述 **★痛点 B**（过程不在流里、解析即消失）是作者原话的直接对应物，也是 F 稿「一切交互皆消息 + 留痕即事实」两条法则要解决的核心；★痛点 D（推荐能力为 0）是「内容主张」里唯一**需要新增生产者**的一条（其余三类内容已有数据源）；★痛点 A/C 是「过程信息」的另外两个面，且都与**安全/信任**耦合（授权记录、引用失效）。

---

## 3. 问题清单

> 按影响程度分级梳理所有识别到的问题，每项赋予唯一编号。
> **编号口径**：本 Feature 使用 `Q-CHAT-xxx` 前缀，与 v1 `Q-001~Q-020`、v3 `Q-UI-001~012` 零冲突；`A/R/O` 同此口径。
> 每条问题均给出「现状证据（`file:line`）→ 痛点 → F 稿对应解法（仅作对照，不构成需求）」。

### 3.1 核心问题

> 影响面大、频率高、用户强烈感知

| ID | 问题描述（现状证据 → 痛点 → F 稿对照） |
|----|--------------------------------------|
| **Q-CHAT-001** | **过程性问答与确认渲染在聊天流之外，且解析即消失（无留痕）。** 证据：`ask-user` 与破坏性确认的唯一宿主是 `#l0-decision`（`src/ui/sidepanel/index.html:1228-1300`），它是 `#log`（`:1301`）的**前一个兄弟节点** —— 结构上就在聊天流「之上」；`l0/decision-card.ts:1-14` 自述「**exactly one card at a time**」「an older round's card cannot linger」；状态模型里 `ask: AskState \| null`（`chat-state.ts:72`）、`confirm: ConfirmState \| null`（`:71`），`ask-resolved` / `confirm-resolved` 直接把槽位置 `null`（`:169-185`）。痛点：作者真机现场「整段过程散落无留痕」；用户无法回看「我曾经回答过什么 / 批准过什么」。F 稿对照：`askuser` / `auth` 两类卡 + 固化不可逆契约（`option-f-chat-stream.html:48-60`）。影响范围：100% 使用场景、每回合至少一次。 |
| **Q-CHAT-002** | **「已决策历史」是唯一的失败补救，且不覆盖三类关键过程。** 证据：`l1/panels.ts:228`（`rounds: DecisionRound[]`）、`:379-398`（`observe()` 靠**差分 `ask` 字段变化**推断「上一轮被回答了」，而非事件驱动）、`:353`（渲染进 `#l1-history-rows`）；计数与入口在 `#l1-history-toggle`（`index.html:1189`），**默认 `hidden`、1 次交互之外**，且**仅内存、切换会话即丢**（无持久化：`background/session-store.ts:76-80` 的 `projectHistory` 只保留 `{role, text}` 四种 role，ask/授权/引用从不落库）。痛点：`rounds[]` **只记录 ask** —— 站点授权 / 破坏性确认批准 / 引用失效与重锚**完全不在内**；且「已决策 N 步」把「过程」降级为一个需要主动点开的折叠计数。F 稿对照：「流 = 会话审计线索」（法二）。影响范围：所有需要复核的过程性操作。 |
| **Q-CHAT-003** | **「下一步推荐」能力完全缺失（无生产者 / 无通道 / 无 UI）。** 证据（本轮实测 grep）：`packages/web-cli-plugin/src/**` 内 `推荐/nextstep/suggest` 无任何「推荐卡」实现；仅有的「下一步」是 5 处零散静态字符串 —— `ui/tree/tree-receipt.ts:132` 的 `nextStep`（树内回执文案）、`ui/sidepanel/view-model.ts:288-297`（`sendDisabledReason`）、`:331`（`buildOnboarding` 步骤）、`:237`（`activeSiteNotice.action`）、`l1/panels.ts:82-89`（手势效果表）。面板与 SW 之间的 chat 事件词汇表只有 `variant ∈ {assistant, tool, command, error, done}`（`background/chat-events.ts:20`）—— **没有可承载「推荐」的变体**。痛点：作者原话点名要进流的一类内容**当前不存在**；用户每回合自行判断下一步。F 稿对照：`nextstep` 卡（chips 即指令，点击即发起）。影响范围：能力发现路径 100%；对首装/新用户尤重。 |
| **Q-CHAT-004** | **现状布局不是三区，过程没有承载面。** 证据：`index.html` 的纵向结构 = `#risk-rail`（body 直挂，`:1128`）→ `#panel-top`（`#l0-status-band` + L1 `#topbar` + `#l1-group` 五个折叠组，`:1133-1218`）→ `#panel-main`（`#l0-decision` + `#log` + `#scroll-bottom` + `#view-host`，`:1221-1343`）→ `#l0-statusbar`（`:1347`）→ `#l2-entries`（`:1351`）→ `#panel-bottom`（6 条 strips + composer，`:1370-1391`）；全文 **109 个 `id`**、68,408 B。痛点：作者原话「整体布局简化，工具栏、聊天框、状态栏」对应的结构症状；**v3 已把密度压到 ≤7，但过程仍未入流** → 密度问题与过程问题是两个不同的问题。F 稿对照：三区法则（`:31-46`）。影响范围：决定「留痕 / 推荐 / 授权记录」是否有承载面。 |

### 3.2 次要问题

> 影响面中等、或为核心问题的衍生问题

| ID | 问题描述（现状证据 → 痛点 → F 稿对照） |
|----|--------------------------------------|
| **Q-CHAT-005** | **系统事件无统一承载，且无时间戳 / 无顺序 / 会被覆盖。** 证据：6 条瞬时提示条各自为政 —— `#env-guard`、`#site-hint`、`#onboarding`、`#discovery-notice`、`#notice`、`#send-reason`（`index.html:1370-1391`），全部住在**底部** `#panel-bottom` 的 `.strips` 里；`sidepanel.ts:846-850` 把 `state.notice` 写进 `#notice` 并在无 notice 时 `hidden`；`chat-state.ts:165-167` 的导航失效提示只在 false→true 跳变时写一次，随后仍可能被新 notice 覆盖；`l0/risk-rail.ts` 的风险行走**顶部** `#risk-rail`（永不折叠）—— 同一个「系统在告诉你什么」被拆到**两个区**、共 6+ 条通道。`state.notice` / `send-reason` 都是**覆盖式单例**（`chat-state.ts:74`，`view-model.ts:288-297`）。痛点：过程性事实（导航失效、探测退避、页面侧不可用）不留痕、无时间戳、无法回看顺序。F 稿对照：`system` 卡（单行 + `HH:MM:SS` 时间戳，只追加）。影响范围：所有异常/状态类过程信息。 |
| **Q-CHAT-006** | **引用生命周期被投影到 3 个互不相邻的位置，流内无引用卡。** 证据：① L0 chip `#l0-ref-toggle` + 失效徽标 `#l0-ref-badge`（`index.html:1249-1254`，`l0/shell.ts:106-113`）；② L1 证据面板 `#l1-ref`（默认 `hidden`，四要素只读投影 + 三条恢复路径，`index.html:1264-1281`，`panels.ts:271-305`）；③ 顶部风险行（`l0/risk-rail.ts` 的 `staleRef` 类 + `shell.ts:120`）。引用记录本身**已经是 append-only 语义**（`l1/ref-store.ts:117-130` 序号单调不复用、`:170-176` 退役不删除、`:158-168` 退役原因冻结），但**这些事实没有任何一处以「时间线」形式呈现**。痛点：真机现场「引用 1 失效 → 重拾」这一段过程不可见；R3 的「旧引用零改动」在界面上不可见（只在新引用里体现）。F 稿对照：`ref` 卡（失效卡保留，新引用序号递增）。影响范围：每次页面拾取 / 引用失效 / 重锚。 |
| **Q-CHAT-007** | **独占决策槽 ⇒ 新回合覆盖旧回合，且 R1 的既有修法只做「取消」不做「留痕」。** 证据：`l0/decision-card.ts:1-14` 明示决策卡是「唯一一张卡」的**唯一写者**；`chat-state.ts:173-185` 的 `ask` 动作直接**替换** `state.ask`；R1（2026-09-17）为此新增 `REF_ROUND_PREFIX` + `supersededAsk()`（`chat-state.ts:203-229`），把被取代的后台提问**settle 为 canceled**（fail-closed，可读），**但不产生任何留痕条目**；`sidepanel.ts:1140-1146` 消费该函数。痛点：R1 只解决了「回合永远卡在处理中」这一**可用性缺陷**，未解决「被取代的回合去哪了」这一**留痕缺陷**（作者 2026-09-17 的主诉）。F 稿对照：流内卡 + 只追加。影响范围：拾取回合与后台提问交错时（真机现场正是此形态）。 |
| **Q-CHAT-008** | **「更多选项」折叠入口与 v3 的 7 可点预算被一次性交互占满，准入规则缺失。** 证据：`view-model.ts:681`（`OTHER_OPTION_LABEL`）、`:684`（`L0_VISIBLE_RECOMMENDED = 2`）；`docs/v3-density-baseline.json#tiers.default` 的默认档实测 **7 可点** = 状态带(1) + 拾取(1) + 2 推荐选项(2) + 「更多选项」(1) + 引用 chip(1) + 一行状态栏(1)；`l1/panels.ts:5-20` 明写「**The L0 default tier's clickable budget is exactly full (7/7)**……Adding one entry per L1 class would push the measured default tier over its ceiling, which is a hard red line」，因此**三个既有 L0 披露点被复用为整个 L1 的入口**。痛点：当前预算全被「当前这一张卡」的一次性交互占用；F 稿要把它**反过来**花在**常驻导航**（4 视图 + 1 主题 = 5）与风险 chips（≤2）上 → 预算语义反转，**「哪些常驻入口有资格占用预算」的准入规则在现状中不存在**。F 稿对照：法五 + 工具栏 ≤5。影响范围：决定后续任何新增入口的可行性。 |
| **Q-CHAT-009** | **流随会话变长的可读性策略未定（F 稿自认留给重构）。** 证据：F 稿 `option-f-chat-stream.html:1504` 逐字：「流会随会话变长 —— 靠『自动滚到底 + 可上滚回看 + 系统事件行轻量化』控制感知重量；**长会话的折叠/摘要策略留给重构**」；现状侧栏已有相关前科：工具卡按长度自动折叠 + 记忆用户开关（`sidepanel.ts:103-110`，`TOOL_LONG_CHARS = 480` / `TOOL_LONG_LINES = 10`），但**没有系统事件行的折叠阈值、没有已闭合卡的压缩规则、没有流内检索**。痛点：「留痕」与「可读」在长会话（`MAX_SESSION_TURNS = 40`，`background/chat-session.ts:16`）下会直接冲突。F 稿对照：未覆盖（自认开放）。影响范围：长期使用者的日常体验。 |

### 3.3 潜在问题

> 目前影响小但可能恶化，或信息不足待验证

| ID | 问题描述（现状证据 → 风险点） |
|----|------------------------------|
| **Q-CHAT-010** | **既有门禁大面积钉住当前 DOM，且有一段受字节哈希保护。** 证据（门禁末轮实测计数，`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/closeout.md:13,50-55`）：journey **167** / insight **116** / binding **192** / hardening **24** / gate-integrity **12** / l0 **164** / l1 **103** / l2 **71** / zero-injection **27** / page-input **102** / density **127**；`test/sidepanel-view.test.ts` **38** 用例含 4 项布局/样式契约。`docs/v3-supersession-ledger.json#protectedRanges` 登记 **journey `42766..54004` sha256 `6b45c3fa…`**（该段逐字读取 `getElementById('log')` / `('composer')` 并按 `getComputedStyle` 断言 `flexGrow` / 高度占比 / 贴底）与 **binding `107780..115930` sha256 `be9ad0e9…`**。**该保护段直接落在 F 稿要动的面上**（`#log` + `#composer`）。→ 见 R-CHAT-002 / R-CHAT-003。 |
| **Q-CHAT-011** | **体积缺口：本 Feature 是净增重构，而绝对上限义务尚未闭合。** 证据：`dist/sidepanel.js` = **375,102 B**（= `SIDEPANEL_BASELINE_BYTES`，ceiling `393,857` = ×1.05），`test/size-baseline.ts:286-289`；v3 累计 **+40.75%**（266,500 → 375,102，`SIDEPANEL_BASELINE_META.consecutiveGrowthAlert`）；`PENDING_ABSOLUTE_CAP`（`size-baseline.ts:1371-1378`）**`resolved: false`**、`newBaselineBytes`/`absoluteCeilingBytes`/`resolvedOn` 全为 `null`，且 `evaluatePendingAbsoluteCap()`（`:1387-1440`）**明确禁止在 `resolved:false` 时预填值**（防伪闭合）。痛点：把「过程」搬进流（消息合并 / 卡渲染 / 状态机 / 留痕持久化）必然显著增体积，而**绝对上限的数值口径与来源尚未定义**（见 O-CHAT-004）。→ 见 R-CHAT-010。 |
| **Q-CHAT-012** | **7 类流事件没有统一通道，而扩通道会撞 `content.js` 冻结面。** 证据：现状「过程」分散在 **5 条互不相干的通道**上 —— ① `chat-events` 的 `variant {assistant,tool,command,error,done}`（`background/chat-events.ts:20`，经 `chat-result` 到达面板）；② `ask-user-request`/`ask-user-response`（`background/messaging.ts:24,120`）；③ `confirm-request`/`confirm-response`（`:22,118`）；④ `pick-layer-*` / `ref-captured` / `ref-highlight` / `ref-rescue`（`src/content/pick-protocol.ts:39-49` + `messaging.ts:76-92`，**故意不进 `KIND_SET`**）；⑤ 面板本地派生（onboarding / site-hint / notice / probe / risk）。**关键约束**：`KIND_SET`（`messaging.ts:103+`）被打包进 `dist/content.js`，而该产物有 **177,076 B 无容差上限**；`pick-protocol.ts:9-12` 逐字记录：把 6 个 kind 字符串加进 `KIND_SET` 实测 **+307 B = 红线突破**，因此新面一律走**独立校验器**。痛点：若 v4 要新增流事件 kind（如推荐 / 流快照 / 留痕持久化），**必须延续「不进 KIND_SET」的既有模式**，否则撞冻结面。→ 见 R-CHAT-009。 |
| **Q-CHAT-013** | **站点级授权 / 会话切换 / 隐私开关 / 知情同意在 F 的三区法则下暂无归属。** 证据：这些控件现状住在 L1 的 `#topbar` 内 —— `#open-settings`、`#authorize`、`#more-actions`(撤销/重新绑定/查看审计/会话盒/分组)、`#l1-status-extra`(知情同意 + 自动授权开关)、`#llm-test-result`（`index.html:1141-1173`）；`sidepanel.ts:1284-1402` 的 `renderConsent()` / `renderAutoAuth()` 都是它们的写者。而 F 稿的三区法则：**工具栏**「禁止任何一次性交互」（只放站点摘要 + 常驻导航，`option-f-chat-stream.html:33-37`）、**状态栏**「只放常驻状态与风险」（`:42-46`）、**流内**只有 7 类卡且**无「站点授权」型**（`:48-57`）。F 稿中「设置」视图列了 4 分区（`option-f-chat-stream.html:946-951`：授权与策略档 / LLM 连接 / 页面交互手势 / 留痕与台账）—— 可推测这些控件应迁入设置，但**首次授权的可发现性**与**无卡片类型承载**的问题在 F 稿中未被显式解答。→ 见 O-CHAT-005。 |

---

## 4. 竞品参考

> 记录竞品对类似问题的处理方式，回答"别人怎么做的、我们有什么不同"

### 4.1 外部竞品调研状态：🟠 **本轮未执行（如实登记，不编造结论）**

本轮**未取得任何外部竞品事实**，因此**不填任何未经核实的外部产品结论**。

- **原因（如实登记）**：本会话的 routing.v1 计划在本回合已按「只读仓库摸底 + 本地产物」提交为 `local_or_compute / none`（单次提交，`routing.v1` 要求每回合恰一次）→ **本回合未授权任何受管 Provider**（`doubao_search` 等）。按路由纪律，**不得**在未提交对应计划的情况下调用受管 Provider，也**不得**静默回退到其他受管 Provider，更**不得**编造竞品事实。
- **处置**：登记为**待调研项**（O-CHAT-009）。解除条件 = 下一回合提交 `latest_public_web → doubao_search` 计划后补齐（或由作者直接提供所掌握的竞品事实）。
- **范围提示（不构成结论）**：若要补齐，与本问题域最相关的外部事实类型为「对话式代理 UI 的过程留痕 / 授权卡片 / 推荐 chips」的公开设计实践。

### 4.2 仓库内可比参照（**事实，可核验；非竞品**）

外部竞品暂缺时，仓库内已有**同一问题域的 6 种布局取向对照**（作者自身设计探索，`packages/web-cli-plugin/design/ui-redesign/`，全部已入版本库），其中 E 是 v3 的基准、**F 是本 Feature 的基准**：

| 参照稿 | 是否处理过同类问题（过程留痕 / 三区） | 处理方式（事实描述，不做评价） | 与 F 的差异 |
|------|-------------------|---------|----------------|
| A 单列分区带 | 部分（纵向「带」分信息类别，全部常驻） | 信息类别常驻而非按需；保留常驻输入框 | 过程信息仍以「常驻带」形式存在，非流内留痕 |
| B Workbench 双栏 | 否（一级导航 5 视图，一次一个） | 图标导航 + 内容区；树升为一级公民拿全高 | 一次只显示一个视图 → 看树时对话不可见 |
| C 对话优先浮层 | 部分（对话为唯一主视图 + 操作坞唤起统一浮层） | 树仍是覆盖式浮层，打开时遮挡聊天 | 一次性交互仍在浮层（违反法一） |
| **D 无输入框选择题（高密度参照物）** | 部分 | 每回合一道选择题（标签+后果+风险徽标+数字键，末项「其他…」）；树升为常驻主操作面 | 密度 = E 的 9~15 倍；**仍把「当前一张卡」放在流外** |
| **E 渐进式披露（v3 基准，仍为现状实现基础）** | 部分（解决了密度与层级，未解决过程留痕） | 三层披露 L0/L1/L2 + 摘要/计数/入口 + 风险位独立常驻；默认 7 可点 / 7 行 | E 的 L0「当前那一张决策卡」是**屏幕上的独占槽位**；对话历史 = 「L1 已决策历史」面板 → **F 正是推翻这一条** |
| **F 聊天流统一承载（本 Feature 基准）** | **是（同哲学，正面处理过程留痕）** | 三区（工具栏 ≤5 可点 / 聊天流唯一交互面 / 状态栏常驻风险）；**7 类消息卡只追加、只固化**；风险从「顶部独立带」改为「底部状态栏 chips」（永不折叠不变） | 与 E 的关系：**继承 E 的视觉语言与「无常驻输入框」，但推翻 E 的「独占决策槽」与「L1 历史面板」**（`option-f-chat-stream.html:22-29` 逐字自述） |

**仓库内另一条强先例（事实）**：**R3 修复已在引用层落地 append-only 留痕语义** —— `src/background/ref-rescue.ts` 的「一键重锚」**生成新引用（新 id、序号递增）+ 旧引用零改动**（`test/size-baseline.ts:255-260` 与 `option-f-shim.mjs`/`docs` 均有登记；实现见 `ui/sidepanel/l1/ref-store.ts:117-130,170-176`）。这说明「只追加、旧记录不改」在**数据层已有可复制先例**，v4 的问题不是「没做过」，而是**没有把它提升为全流模型**。

---

## 5. 假设与风险

> 记录问题挖掘过程中识别的假设和风险，供后续阶段验证和关注

### 5.1 关键假设

| # | 假设内容 | 验证方式 |
|---|---------|---------|
| **A-CHAT-001** | 作者「放到聊天框里面」= **把过程承载面从「流之上的槽位」搬到「流内」**，而**不是**「增加一个历史列表/日志面板」 | 作者原话三次出现「聊天框 / 聊天流留痕」+ F 稿 7 类卡已定；spec 阶段需以「过程 = 流内消息」为前提，不以「新增历史视图」实现 |
| **A-CHAT-002** | 过程搬进流后，**能力集不变**（同一批问答 / 授权 / 引用 / 回执），只是承载位置与留痕语义变化 | 逐类做「能力等价回溯」：7 类卡是否覆盖现状全部过程来源（见 §7.1 B 表 + R-CHAT-013 的分类学缺口） |
| **A-CHAT-003** | 默认密度预算可由「花在一次性交互上」**改为「花在常驻导航上」**，且仍 ≤7 | F 稿 shim F1/F2 已在设计稿上实测 toolbar 5 + statusbar ≤2 ≤7（60/60）；spec 需在**真实产物**上按新口径复测 |
| **A-CHAT-004** | 既有门禁断言可经「取代台账（old→new + 理由 + 计数不减）」迁移，且**校验强度不降** | 复用既有两个先例：`docs/r2-supersession-ledger.json`（v2）与 `docs/v3-supersession-ledger.json`（v3，**按行判定** + `pureAdditionFiles` + `expectFailPattern`）；元门禁 `test/gate-integrity.test.ts` 的 9 个 Chromium 门禁集合与 `SDC_GATES_ROOT` 反证缝可复用 |
| **A-CHAT-005** | **不动面可守住**：`content.js` 177,076 B 与 `pick-layer.js` 33,900 B 逐字节不变；manifest 零新增权限（→ 无 `contextMenus`，主题切换只能用已有 `storage`） | 逐轮 `sha256sum` 复核 + `test/zero-injection.test.ts`（27 断言）+ `manifest.json` 零 diff |
| **A-CHAT-006** | 「流」的事件模型可以**在不重写判定链（policy/auto-authorize pin）**的前提下建立 | 事件模型只落在 `src/ui/sidepanel/**` 与「SW→面板」消息面；判定链是只读调用方（R3 已验证「只读探测 + 同一摄取管线」的模式可行） |
| **A-CHAT-007** | 风险位的「永不折叠」是**语义**约束（可发现、不被任何展开/收起影响），**不绑定「必须在顶部」这一实现位置** | F 稿把风险迁到状态栏 chips 且 shim H5/H8 断言「状态栏本体无 `hidden`、chip 容器可见、展开任何视图后 chips 仍可见」；spec 阶段需就此口径取得显式确认（→ O-CHAT-007） |
| **A-CHAT-008** | 作者（样本 = 1）的反馈可代表目标用户；但**样本量为 1 是已知局限** | 🟠 待验证：生态用户/新用户痛点同源属**推断**（§2 已标注）；后续可由真实用户反馈校正 |
| **A-CHAT-009** | 「推荐下一步」的**内容来源**可从既有真值派生（不新增 LLM 调用）：如 L2 计数（`l2/counts.ts:90 deriveCounts`）、风险类（五类）、引用状态（`ref-store`）、探测状态（`auto-probe`）、onboarding 步骤 | **需 spec/spike 判定**：F 稿只给了 chips 形态，未给推荐的产生规则；若必须新增 LLM 侧产物则属新面（→ O-CHAT-006） |

### 5.2 主要风险

| # | 风险描述 | 影响程度 |
|---|---------|---------|
| **R-CHAT-001** | **既有 UI 门禁大面积落在被取代面上（头号风险）。** v3 末轮实测：l0 **164** / l1 **103** / l2 **71** / density **127** / journey **167** / insight **116** / binding **192**。F 重构会移除 `#l0-decision`（→ l0 的「唯一决策卡」契约、l1 的「三个 L0 披露入口」契约、density 的「风险类归属 + 22 比对格」全部失效）、把 `#l0-statusbar`/`#l2-entries` 的入口搬到工具栏（→ l2 的「入口 ≡ 摘要 ≡ 视图标题三处同源」四入口契约失效）、把 `#risk-rail` 迁为底部 chips。纪律是**零删除、零降级**（取代必须走台账且计数不减）。 | 🔴 **高** |
| **R-CHAT-002** | **journey 受哈希保护段与 AC-V2-002 量化断言在 F 下语义失效。** `docs/v3-supersession-ledger.json#protectedRanges` 对 journey `42766..54004` 做了 **sha256 字节冻结**，该段（`test/ui/journey.mjs` 的 `#15a~#15q`）以 `getElementById('log')` / `('composer')` + `getComputedStyle` 断言 `#log` `flex-grow=1`、高度占比、composer 贴底；v2 的 **AC-V2-002 / FR-V2-023**（`specs-tree-web-cli-plugin-v2-insight/spec.md:255`）把 `#log` 稳态 `clientHeight ≥589px` + 占比 ≥65.0% + composer 底边−视口底 ∈[0,+8px] 写成 P0 量化红线。F 稿把聊天流改为 `ol#stream`、composer 变为**卡内按需输入**（非常驻）→ 上述断言必须显式取代或重新定标，而**保护段的字节哈希不允许静默改写**。 | 🔴 **高** |
| **R-CHAT-003** | **DOM id / 结构契约迁移的连带面。** `#log`（`div` + `.entry/.msg-*` 子结构，`sidepanel.ts:206-240`）、`#panel-main`、`#composer`、`#l0-decision`、`#ask`、`#confirm`、`#l0-statusbar`、`#l2-entries`、`#l0-pick`、`#l0-ref-toggle`、`#l0-more`、`#l0-status-band` 等 id 均有门禁引用（l1 的 `L1_TRIGGERS` 映射 `l1/panels.ts:71-80`、l0 的 `SKELETON_EXEMPT_TARGETS` 等）；`test/sidepanel-view.test.ts`（38 用例）以**静态正则**断言 `#log.empty:not(:has(> *))`、`#panel-main { position: relative; flex: 1 1 auto; … }`、`#log { … flex: 1 1 auto; … overflow-y: auto; }`（`sidepanel-view.test.ts:127-138`）。F 稿的结构（`main > ol#stream[role=log]`）与这些断言直接冲突。 | 🔴 **高** |
| **R-CHAT-004** | **密度口径必须重新定义，否则新布局实测必然「爆表」。** 现行 C1 口径逐字（`docs/v3-density-baseline.json#caliber.C1`）：「可点元素：非 `hidden` 祖先 ∧ (tag ∈ {BUTTON,A,INPUT,SELECT,TEXTAREA} ∨ tabindex ≠ -1)；display/visibility/opacity/pointer-events/视口位置/aria-hidden 一律不豁免」，测量根 = **`document.body`**（`measurementRoot`）。**F 稿的流内卡片含按钮**（`askuser` 选项、`auth` 批准/拒绝、`nextstep` chips、`ref` 重拾）→ 若沿用旧口径，默认档实测可点元素会远超 7。F 稿法五因此明写「聊天流内容**不计入**默认密度」（`:72-73`）→ **这是一次口径变更**，必须定义「测什么根、豁免什么子树、如何防豁免被滥用」；`test/ui/density.mjs` 的 9 强制格 + 15 风险格 + worst（22 比对格，`closeout.md:55`）需按新布局重算。 | 🔴 **高** |
| **R-CHAT-005** | **风险位形态迁移可能被读成破坏「风险永不折叠」。** 现状的机器判据是三重结构化的：`disclosure.ts:86` 的 `NEVER_FOLDABLE = ['risk-rail','confirm','l0-decision','ask','log','composer']` + `assertFoldable()` 抛错（`:111-117`，注释明写「`assertFoldable('#risk-rail')` 仍throws」）+ `#risk-rail` 是 **body 直挂独立 section**（`index.html:1128`）+ `test/ui/l0.mjs` 的祖先闭包探针与 `test/ui/density.mjs` 的风险类增量归属（`isRiskClassSource`）。F 稿把风险移到**状态栏 chips**（含 chip 点击展开详情 + 滚动定位到流内卡）→ 位置、形态、交互全变；「永不折叠」的**机器表达**（探针、豁免清单、密度归属）需要重写，且**不得**放宽为「风险可以藏在展开里」。 | 🔴 **高** |
| **R-CHAT-006** | **append-only 事件模型 vs 既有可变 state 的迁移。** 现状：`entries` 是 append-only 数组（`chat-state.ts:111-128`，`nextId` 单调）✓，但 `ask`/`confirm` 是**单槽可变 + 置 null**（`:169-185`）、`notice`/`auditCount`/`probe`/`discoveryState`/`authorized` 是**末值标量槽**（`:55-75`）、`#log` 每次 `render()` **全量清空重建**（`sidepanel.ts:816-824`，靠 `toolOpenState: Map<number,boolean>`（`:110`）按 entry id 记忆折叠态）。痛点：F 的「卡片只固化不撤销」需要一个**不可变、单调、可回放**的流模型（含 ask/auth/ref/system 四类新条目），而这四类当前都以「瞬时 UI + 单槽」形式存在；迁移还要处理**会话切换**（`chat-state.ts:188-195` 的 `history` 动作**整体替换** entries 且把 tool 卡的 `ok/ms/tool` 元数据丢掉 → 与「留痕即事实」直接冲突）。 | 🔴 **高** |
| **R-CHAT-007** | **ask 迁移后的 busy / 回合语义。** 现状 `pending` 是**全局互斥**：`sendDisabledReason`（`view-model.ts:288-297`）在 `pending` 时给出「发送已禁用：上一条指令仍在处理中，请稍候。」；`ask-bridge` 默认 **60 s 超时即 canceled**（`background/ask-bridge.ts:41,58-65`），`ask-user-request` 由 SW 推送（`service-worker.ts:461-465`）。ask 卡进入流后，「未答的卡」与「后续轮次 / 拾取回合 / 会话切换」的关系需要重新定义（多张未答卡是否允许并存？卡内提交是否仍受 `pending` 门控？R1 的 `supersededAsk` 语义是否升级为「留痕 + 取消」？）。 | 🟡 **中高** |
| **R-CHAT-008** | **留痕内容与既有安全/零明文红线冲突的可能。** 授权卡与系统事件一旦入流留痕，就要面对：① 回执的**零明文纪律** —— `l1/receipt.ts:53` 的 `FORBIDDEN` 正则 + `assertNoPlaintext()`（`:71-77`）在**渲染时抛错**，白名单行只允许 8 个字段（`:38-47`）；② 审计视图的字段白名单 8 项（`l2/audit.ts:24-32`，含 `decision`）+ URL 去参；③ key / 剪贴板 / 通知 / 书签正文**永不入明文**（NFR-V2-006 / NFR-V3-016）。若流内授权卡或系统事件行把命令参数体、URL query、页面文本带进留痕，即破红线。 | 🟡 **中高** |
| **R-CHAT-009** | **SW↔面板消息契约扩展触碰 `content.js` 冻结面。** `KIND_SET`（`background/messaging.ts:103+`）被打包进 `dist/content.js`（**177,076 B，无容差，+1 B 即 FAIL**）；先例：v2-3 的 `command-policy` 家族与 v3-4 的 6 个 `pick-layer-*` / `ref-rescue` **一律不进 `KIND_SET`**，改由独立校验器（`insight-protocol.ts` / `content/pick-protocol.ts`）校验，原因逐字记录在 `pick-protocol.ts:9-12`（加 6 个字符串实测 **+307 B**）。若 v4 的新流事件（推荐 / 流快照 / 留痕持久化）需要新增 kind，必须延续该模式。 | 🟡 **中高** |
| **R-CHAT-010** | **体积绝对上限的数值来源未定，且本 Feature 是净增。** `PENDING_ABSOLUTE_CAP`（`test/size-baseline.ts:1371-1378`）要求 F 收口时 `resolved: true` 且**同时**给出 `newBaselineBytes` / `absoluteCeilingBytes` / `resolvedOn`（`≥` 基线），否则 FAIL（`:1416-1431`）；当前 `resolved: false` 且**禁止预填**（`:1403-1405`），并另有「防静默删除」断言（标记缺失即 FAIL）。难点：① F 是**净增**（流模型 + 卡渲染 + 留痕），新基线会再上台阶；② 「绝对值上限」是**独立于 5% 公式**的第二个判据，其数值哲学（安全裕度？Feature 冻结上限？）无先例 —— v3 曾自设的 `SIDEPANEL_CEILING_CAP` 已被 **V3-VOL-1 ②** 判定为「未经要求的自缚装置」并降级为 `record-only`。 | 🟡 **中高** |
| **R-CHAT-011** | **「五可点工具栏」的准入规则缺失，且现状工具栏远超 5。** 现状 `#panel-top` 的 L1 面板内含 8+ 个控件（设置 / 授权 / 更多(撤销/重新绑定/审计/会话盒/分组) / LLM 测试 / 同意与自动授权开关），`index.html:1141-1173`；F 稿工具栏 = 站点摘要（只读，不可点）+ 4 视图入口 + 1 主题切换 = **5**（`option-f-chat-stream.html:836-903` + shim F1/F4/F5/G5）。**新增任何常驻入口都要挤掉现有 5 个之一**，而「谁有资格常驻」的规则与置换流程在现状中不存在；此外 **主题切换是一个新控件**（现状面板跟随系统、无手动主题态）。 | 🟡 中 |
| **R-CHAT-012** | **面板侧「从页面拾取」入口消失带来的可发现性/救援路径断裂。** 现状 `#l0-pick`「从页面拾取」是 L0 常驻入口（`index.html:1243`，`l0/shell.ts:100-102` 渲染禁用态与原因），而 F 稿把拾取入口放在**页面侧**（`option-f-chat-stream.html:792-795`：「页面侧（宿主页；拾取入口在页面里，不占面板密度预算）」）。连带：① 引用卡的「重新拾取」路径**复用了 `#l0-pick.click()`**（`l1/panels.ts:259`）→ 该复用点失效；② v3 的可发现性契约「凡收起必有摘要/计数 + 文字入口」（FR-V3-021）在面板侧失去对应的拾取入口；③ 页面侧注入只在**已授权站点**存在（零注入红线），未授权时的拾取引导路径需重新定义。 | 🟡 中 |
| **R-CHAT-013** | **「7 类卡」分类学与现状过程类型不完全对齐。** F 稿的 7 类是 `ai / user / nextstep / askuser / auth / system / ref`（`option-f-chat-stream.html:48-57`，shim `CARD_TYPES` 逐字一致，B1 断言）。而现状 `#log` 内实际存在的过程类型还有：**工具卡**（`details.tool-card` + `ok`/`ms`/预览，`sidepanel.ts:132-174`）、**命令行**（`.cmd`，`:118-130`）、**思考指示**（`.msg-thinking`，`:176-191`）、**错误条目**（`.entry-error`，`:206-240`）、**工具通知**（`.msg-notice`，`:220-227`）。F 稿的 7 类**没有独立的 tool 卡型**（设计稿里 `--tool-bg` 只用于 AI 卡内的代码块）。若把工具卡硬塞进 `ai`/`system`，会丢失现状已有的「工具名 + 状态 + 耗时 + 折叠」信息（TASK-023 的既有能力）与门禁断言。→ 见 O-CHAT-008。 | 🟡 中 |
| **R-CHAT-014** | **流内固化的可交互性/无障碍回归。** 固化契约 = 「表单收起、固化区显示、不存在撤销控件」（`option-f-chat-stream.html:58-60`），意味着**已答卡内的输入/按钮消失**：① 键盘 / 读屏用户的可达顺序需要重新设计（`ol[role=log]` + 固化区的 `aria-live` 语义）；② 「自动滚到底」与「用户上滚回看」的冲突已有前科（`scroll-policy.ts`，`BOTTOM_THRESHOLD_PX = 48`；`sidepanel.ts:753-800` 的 `followToBottom` / `updateScrollHint`）；③ 320px 下流内卡的换行/截断（v3 的 EC-V3-008 只覆盖 L0/L2）。 | 🟡 中 |
| **R-CHAT-015** | **测试守恒与元门禁压力。** 取代 v3 资产必须同时满足：`docs/v3-supersession-ledger.json` 的**按行判定**（受保护文件相对 base 的每条删除行必须逐条命中台账，否则 FAIL）+ `gate-integrity.test.ts` 的元门禁（受审集合、R1a~R4d、`expectFailPattern` 至少 15 条、`CHROMIUM_GATES.length === 9`）+ 计数下界（journey 167 / insight 108 / binding 192 / nodeTestRuntime 646 **只增不减**）。F 重构会有**大量删除行** → 台账工作量与「不得橡皮图章」的专业性要求都显著高于 v3。 | 🟡 中 |
| **R-CHAT-016** | **门禁执行资源约束（工程纪律）。** 本机内存紧张（约 1.5GB，历史曾 OOM）；9 个 Chromium 门禁必须**严格串行、一次一个 Chromium**、日志完整落盘（禁 tail 截断）。本 Feature 的取代面会显著增加门禁轮次 → 排期与验证成本需前置计入。 | 🟡 中 |

---

## 6. 下一步建议

> 给出后续工作的优先级建议，回答"接下来优先做什么"

| 优先级 | 事项 | 说明 |
|--------|------|------|
| **高** | 聚焦 **Q-CHAT-001 / 002 / 003 / 004**（4 个核心问题） | 四者共同构成作者三句原话的完整对应物：001+002 = 「过程留痕 / 授权记录」，003 = 「下一步推荐」，004 = 「三区布局」。spec 阶段应以这 4 条为问题输入主干 |
| **高** | 把 **R-CHAT-004（密度口径重定义）** 与 **R-CHAT-002/003（journey 保护段 + id 契约迁移）** 作为 spec/plan 的**前置约束** | 这两组决定「三区骨架能否在真实产物上全门禁绿」；建议 spec 阶段先确立①新密度口径（测量根 / 豁免边界 / 防滥用）与②受保护门禁区段的显式处置原则，避免后续返工 |
| **高** | 把 **D7 随带硬义务（V3-VOL-3）** 逐条写进 spec 验收：① 收口重定 sidepanel 基线 + 绝对上限（带值闭合 `PENDING_ABSOLUTE_CAP`）② 取代台账守恒（按行判定 + 计数不减）③ 密度门禁按新布局重定标（阈值哲学 7/15 · 9/20 · 17/35 保留、登记格重算） | 这三条是**已定案的义务**，且都有**可 FAIL 的机器判据**（`evaluatePendingAbsoluteCap()` / `supersession-ledger.test.ts` / `test/ui/density.mjs` 阶段 F）——遗漏即收口 FAIL |
| **中** | 裁决 **O-CHAT-001~009**（尤其 001/002/003/004 四条设计稿预判难点） | 见 §7.5；这些是 spec 阶段的输入，不需要作者在 discovery 阶段拍板，但 spec 不得在无裁决的情况下自行假设 |
| **中** | 复核 **A-CHAT-009**（推荐内容的真值来源）与 **Q-CHAT-003** 的生产者边界 | 「推荐」是本 Feature 唯一需要**新增生产者**的内容类型；若必须引入 LLM 侧产物则属新面，应显式登记而非隐含 |
| **中** | 补齐 **§4.1 外部竞品调研**（O-CHAT-009） | 本轮因 routing 计划为 local-only 而未执行；下一回合可提交 `latest_public_web → doubao_search` 计划后补齐，或由作者直接提供事实 |
| **中** | 复核 **A-CHAT-003 真实产物密度复测**：按**新口径**对真实 `dist/sidepanel.html` 跑同口径测量 | 设计稿 shim 的数字（toolbar 5 / total ≤7）不等于真实产物数字（v3 的 A-UI-001 教训：设计稿 7/10/47/6 vs 实测 7/12/51/6，落差已登记） |
| **低** | **A-CHAT-007 风险位形态口径**：确认「永不折叠」在 F 下是否以「底部 chips + 顶层语义」实现 | 若 spec 阶段出现「必须仍在顶部 rail」的解读，会与 F 稿冲突 → 需在 spec 前定口径 |
| **低** | 版本落点与 ROADMAP 登记（见下方事实与建议） | 属 roadmap / 父收口职责；本报告只给建议 + 事实，不代拍板、不改 ROADMAP |

### 6.1 F-30 占用复核结果（本轮实测）

| 项 | 结果 | 证据 |
|---|------|------|
| `F-30` 是否被占用 | **未占用（0 命中）** | `grep -c "F-30" .sddu/specs-tree-root/ROADMAP.md` → **0** |
| `F-29` 状态 | **A2A 双向候选，未立项未排期，保持原样不动** | `ROADMAP.md:910-912`（性质声明）+ `:961`（v1.25.0 追加） |
| `F-28` 状态 | **已被 v3-ui 占用且已收口**（`validated`，父 tasked） | `ROADMAP.md:32,389,412` |
| 编号结论 | **登记为 F-30 即可，无需改 F-31** | — |

### 6.2 版本落点建议（复核编排器预判）

| 项 | 事实 | 建议 |
|---|------|------|
| `v0.9.0` 当前登记 | 已被 **F-28（v3-ui，✅ 已完成）+「工程质量与文档对齐」** 双主题占据（`ROADMAP.md:53,383,389`）；`ROADMAP.md:414` 有「v0.9.0 同批 Feature（F-28）」小节 | 与编排器预判一致 |
| 同批叠加先例 | **v0.8 = F-14（v1）+ F-27（v2）同批两 Feature**；**v0.7 = F-25 + F-26 同批**（后者自述「v0.7 内第三个 Feature」）；**v0.9 = F-28 + 工程质量双主题** | ✅ **建议采纳编排器预判：F-30 落 `v0.9.0` 同批叠加（本批第三个 Feature）**，理由是：① 与 F-27/F-28 先例同形（同一分支 `feature/web-cli-plugin` 上叠加、合入/发布由作者决定）；② **依赖关系**：F 重构直接消费 v3 交付的四类 L2 视图 + page-as-input 拾取层 + L0/L1 骨架，与 v3 同批可避免跨版本基线漂移；③ 版本位零冲突（v0.9.0 尚未发布，`main = 2ddc922` 未动） |
| 需登记的口径变化 | `ROADMAP.md:389` 现表述为「**双主题并列**」→ 加入 F-30 后将变为**三主题/三 Feature** | **属父收口职责**：登记编号 + 版本位 + 同批小节；本报告**未改 ROADMAP**（纪律要求），仅给出事实与建议供父收口执行 |

---

## 7. 附录

### 7.1 现状基线（§2 摸底结果，**全部带 `file:line` 证据**）

> 本节是 spec/plan 的事实底座。所有行均在本轮**只读**核对过（分支 `feature/web-cli-plugin` @ `187c205`）。

#### A. 消息 / 会话状态模型：距「append-only 事件流模型」有多远

| 子项 | 现状事实 | 证据（`file:line`） | 距 append-only 的距离 |
|------|---------|-------------------|---------------------|
| **A1 聊天条目** | `entries: ChatEntry[]` + `nextId: number`；`append()` 返回新对象、id 单调递增 | `src/ui/sidepanel/chat-state.ts:25-38`（`ChatEntry` = `id/role/text/kind` + 可选 `tool/ok/ms`）、`:55-57`、`:111-128` | ✅ **已是 append-only**（数据层）。但 `role` 只有 4 类（`user/assistant/tool/system`，`:7`）、`kind` 4 类（`text/command/tool/error`，`:8`）→ 缺 ask/auth/ref/nextstep 条目类型 |
| **A2 ask 槽** | `ask: AskState \| null`（单槽）；`{type:'ask'}` **替换**槽位；`ask-resolved` 置 `null` | `chat-state.ts:47-53, 72, 173-185` | ❌ **可变单槽、解析即消失** → 与「只追加」相反 |
| **A3 confirm 槽** | `confirm: ConfirmState \| null`（单槽）；`confirm` 动作**替换**；`confirm-resolved` 置 `null` | `chat-state.ts:40-44, 71, 169-172` | ❌ 同上 |
| **A4 引用注册表** | `createRefStore()`：`seq` 单调**永不复用**（含 `reset()` 之后）；`judge()` 全量重判；`retireUnusable()` **退役不删除**；退役原因**冻结**（N-08）；`stale()` = 未退役的不可用项 | `src/ui/sidepanel/l1/ref-store.ts:117-130, 158-176` | ✅ **已是 append-only + 留痕语义**（v4 的现成先例）。缺口：**没有时间线视图**（3 处投影，见 §7.1 B6） |
| **A5 决策历史** | `rounds: DecisionRound[]`（内存）；`observe(input)` 通过**差分 `ask` 字段**推断回合闭合；`history()` 返回副本 | `src/ui/sidepanel/l1/panels.ts:228, 379-398, 513` | 🟠 **半 append-only**：数组只追加，但「闭合」是**推断**（非事件），且**只覆盖 ask**、仅内存、默认 `hidden`（1 次交互） |
| **A6 会话持久化** | `projectHistory(turns)` 只投影 `role ∈ {user,assistant,tool,system}` + `text`；`MAX_SESSION_TURNS = 40`；`boundHistory` 从 `user` 轮开始截断 | `src/background/session-store.ts:76-80`、`background/chat-session.ts:16, 58` | ❌ `kind`/`tool`/`ok`/`ms` **丢失**；ask/授权/引用 **从不落库** |
| **A7 会话切换替换** | `{type:'history'}` **整体替换** `entries`，tool 条目降级为 `kind:'tool'`（无卡元数据） | `chat-state.ts:188-195` | ❌ 与「留痕即事实」直接冲突（切换会话即丢过程） |
| **A8 DOM 渲染** | `render()` 每次 `log.textContent = ''` → 全量重建 → 再 append；折叠态由 `toolOpenState: Map<number,boolean>`（按 entry id）记忆 | `src/ui/sidepanel/sidepanel.ts:809-833`（清空在 `:816`）、`:103-110` | 🟠 **DOM 非 append-only**（每次重建）；但按 id 记忆的状态表证明「同一 id 稳定」这一前提已存在 |
| **A9 其他标量槽** | `pending` / `activeOrigin` / `discoveryState` / `probe` / `authorized` / `trust` / `autoAuth` / `invalidated` / `auditCount` / `notice` 均为**末值标量** | `chat-state.ts:55-75`；`notice` 覆盖语义见 `:74` + `:196-197`（`notice` 动作直接替换） | ❌ 全部是「当前值」而非「事件」；过程信息（探测重试、导航失效、状态翻转）**无历史** |
| **A10 参考：R3 的 append-only 实现** | R3 重锚 = 生成**新引用**（新 id + 序号递增）+ **旧引用零改动** + 退役记录保留 | `test/size-baseline.ts:255-260`（登记文本）、`l1/ref-store.ts:452-477`（`repick`）、`l1/panels.ts:452-477` | ✅ 已落地的范式：**新事实追加、旧事实冻结** —— v4 流模型可直接沿用同一纪律 |

#### B. 七类消息卡的映射面（F 稿 7 类 ↔ 现状渲染位置）

| F 稿卡型 | 现状对应物 | 现状渲染位置（证据） | 迁移缺口 |
|---------|-----------|-------------------|---------|
| **1 `ai`（AI 回复）** | ✅ assistant 气泡（安全 Markdown） | `#log` 内；`sidepanel.ts:206-240`、`:233-235`（`renderMarkdown`）；样式 `index.html:263-268` | 无（最小） |
| **2 `user`（用户发言）** | ✅ user 气泡（右对齐） | `#log` 内；`sidepanel.ts:229-238`；样式 `index.html:257-262` | 无（最小） |
| **3 `nextstep`（下一步推荐）** | ❌ **不存在** | 无 UI、无通道；仅 5 处静态字符串：`ui/tree/tree-receipt.ts:132`、`view-model.ts:237,288-297,331`、`l1/panels.ts:82-89` | **需新增生产者 + 通道 + 卡渲染**（见 Q-CHAT-003 / A-CHAT-009） |
| **4 `askuser`（问答）** | 🟠 独占决策卡（唯一一张卡） | `#l0-decision > #ask`（`index.html:1230-1241`，位于 `#log` **之上**）；写者 `l0/decision-card.ts:122-197`；状态 `chat-state.ts:72,173-185`；回应 `sidepanel.ts:1185-1195`（`submitAsk`）；SW 推送 `background/service-worker.ts:461-465`；超时 60 s `background/ask-bridge.ts:41` | **需搬进流内 + 固化 + 留痕**；`#ask` 的 `hidden` 契约与 `aria-controls="ask-fallback"` 需重锚 |
| **5 `auth`（权限/授权申请）** | 🟠 两类混在一起，且**都不在流内**：（a）**破坏性二次确认** `#confirm`；（b）**站点级授权** `#authorize`/`#revoke` | （a）`#l0-decision > #confirm`（`index.html:1291-1299`），状态 `chat-state.ts:40-44,71,169-172`，写者 `sidepanel.ts:852-858,1859-1867`，SW 推送 `service-worker.ts:629`；（b）`#authorize`/`#revoke` 在**默认 `hidden`** 的 `#topbar`（`index.html:1143,1151`），SW 处理 `service-worker.ts:2091-2118`（**写审计** `s.audit.recordPlugin`） | **需区分**「单次操作授权卡 `auth`」与「站点级授权动作」；后者在 F 的三区法则下**无卡型**（见 Q-CHAT-013 / O-CHAT-005） |
| **6 `system`（系统事件行）** | ❌ 散落 6+ 条通道、无时间戳、可被覆盖 | `#panel-bottom` 的 6 条 strips（`index.html:1370-1391`）；写者 `sidepanel.ts:843-864, 966-1004`；`#notice` 覆盖 `chat-state.ts:74,196-197`；导航失效提示仅跳变写一次 `chat-state.ts:161-167`；探测态 `view-model.ts:166-222`；顶部风险行 `l0/risk-rail.ts` + `shell.ts:120` | **需统一事件模型 + 时间戳 + 只追加**（见 Q-CHAT-005） |
| **7 `ref`（引用卡）** | 🟠 3 处分散投影、流内无卡 | ① L0 chip + 徽标 `index.html:1249-1254` / `l0/shell.ts:106-113`；② L1 证据面板（默认 `hidden`）`index.html:1264-1281` / `l1/panels.ts:271-305`；③ 风险行 `l0/risk-rail.ts` + `shell.ts:120`；数据 `l1/ref-store.ts` | **需流内引用卡**（有效/失效/新序号递增）；救援路径复用 `#l0-pick`（`l1/panels.ts:259`）需重锚（见 R-CHAT-012） |
| **未覆盖（F 稿缺）** | **工具卡 / 命令行 / 思考指示 / 错误条目 / 工具通知** | 工具卡 `sidepanel.ts:132-174`；命令行 `:118-130`；思考 `:176-191`；错误样式 `:206-240`；通知 `:220-227`；样式 `index.html:277-361` | **F 的 7 类没有 tool 卡型** → 分类学缺口（见 R-CHAT-013 / O-CHAT-008） |

#### C. 门禁与测试面（重定标影响面）

| 门禁 | 末轮实测断言数 | 主要落点（受 F 影响面） | 存活/取代预判 |
|------|:---:|----------------------|--------------|
| `test:ui`（journey.mjs） | **167** | 三区 flex 布局、`#log`/`#composer` 几何（`#15a~#15q`）、会话切换、LLM 状态、消息渲染 | **低存活**：`#15a~#15q` 在**字节哈希保护段**内（`42766..54004`, sha256 `6b45c3fa…`） |
| `test:insight`（insight.mjs） | **116** | 连接树 / 命令目录 / 审计 / 设置 四视图与视图替换 | **中高存活**：F 稿同样用「视图替换」模型（`#view-layer` 替换流），`l2/view-host.ts` 的替换机制可复用；入口位置（底部面板 → 顶部工具栏）需取代 |
| `test:binding`（binding.mjs） | **192** | 授权链、标签页绑定、探测、R1/R2/R3 现场 | **高存活**（这是**后台/协议**门禁，非布局）；但含第二段字节哈希保护段（`107780..115930`, sha256 `be9ad0e9…`） |
| `test:hardening`（hardening.mjs） | **24** | 加固/负控 | **高存活**（非布局） |
| `test:gate-integrity`（元门禁） | **12**（判定器 selftest 15） | 受审集合、按行判定、`expectFailPattern` | **必须存活且只增**（否则取代台账失去强制力） |
| `test:l0`（l0.mjs） | **164** | L0 骨架：状态带 / 决策卡 / 风险位永不折叠（祖先闭包探针）/ 可点预算 / 豁免清单 | **最低存活**：`#l0-status-band`、`#l0-decision`、`#ask`、`#l0-pick`、`#l0-ref-toggle`、`#l0-more`、`#risk-rail` 全部被 F 取代 → **整文件需重写** |
| `test:l1`（l1.mjs） | **103** | 8 类就地展开 + 三个 L0 触发器（`L1_TRIGGERS`）+ 引用证据 + 回执三件套 | **最低存活**：三个触发器（`#l0-status-band` / `#l0-more` / `#l0-ref-toggle`）全部消失 → 入口机制重写（ref 卡/ask 卡内联承载） |
| `test:l2`（l2.mjs） | **71** | 四视图默认零占用 + 「计数 + 入口」+ ≤2 次交互视图替换 | **中高存活**：视图本体与 `l2/counts.ts` 计数单源可复用；入口面板 `#l2-entries` 迁到工具栏 → 断言迁移 |
| `test:zero-injection`（zero-injection.mjs） | **27** | manifest 静态面 / 结构面 / 源码面 | **高存活**（不动面；F 不新增权限） |
| `test:page-input`（page-input.mjs） | **102** | 拾取层按需注入 / 拖选气泡 / 右键菜单 / 双向联动 | **高存活**（页面侧产物 `pick-layer.js` 冻结；仅面板侧拾取入口消失，见 R-CHAT-012） |
| `test:density`（density.mjs） | **127** | 口径 C1~C4 + 3 档 × 3 视口 9 强制格 + 5 风险子场景 × 3 视口 15 登记格 + worst + 阶段 F 基线机器比对（22 格） | **必须重定标**：口径与全部登记格（见 R-CHAT-004） |
| `test:supersession`（supersession-ledger.test.ts） | — | 按行判定 + 保护段 sha256 + 计数下界 | **必须存活且加强**（F 删除行远多于 v3） |
| `test/sidepanel-view.test.ts` | **38**（含 4 项布局/样式契约） | 三区 flex、`#log.empty:not(:has(> *))`、`#panel-main`/`#log` CSS、composer 为底区末元素（`sidepanel-view.test.ts:127-138,141+`） | **低存活**（布局契约重写） |
| 插件单测（`npm test` 运行期用例） | **832**（`docs/v3-supersession-ledger.json#counts.nodeTestRuntime.currentRuntime`） | 纯逻辑层（view-model / chat-state / ref-store / counts …） | **中高存活**：纯函数层可大量复用；流事件模型的纯 reducer 部分应新增用例 |

> **`dist` 相关现状（实测 `stat`）**：`content.js` **177,076 B**（= 无容差上限，`test/size-baseline.ts:13`）；`pick-layer.js` **33,900 B**（自有「不增长」上限）；`sidepanel.js` **375,102 B**（= 基线；ceiling **393,857** = ×1.05）；`background.js` 1,606,637 B；`options.js` 82,093 B；`sidepanel.html` 68,408 B。全部为**只读核对**，本轮未构建、未改 `dist/**`。

#### D. 体积与约束现状（V3-VOL-3 与 PENDING_ABSOLUTE_CAP）

| 项 | 事实 | 证据 |
|---|------|------|
| 当前基线 / 上限 | `SIDEPANEL_BASELINE_BYTES = 375_102`；`SIDEPANEL_CEILING = floor(375_102 × 1.05) = 393_857`；容差 **5%** | `test/size-baseline.ts:286-289, 318-320` |
| 历史链（只增不减的记录） | `SIDEPANEL_BASELINE_BYTES_TIMELINE` = 1,068,165 → … → 266,500 → 291,523 → 295,225 → 327,679 → 328,476 → 349,880 → 349,925 → 362,777 → 366,500 → 366,755 → 368,529 → **375,102** | `test/size-baseline.ts:303-306` |
| Feature 累计 | v3 累计 **+40.75%**（266,500 → 375,102），已越过历史「40% 停工线」并**如实上报**；最差相邻对 **+22.96%**（v3-1+v3-2） | `SIDEPANEL_BASELINE_META.consecutiveGrowthAlert`（`size-baseline.ts` 内） |
| **V3-VOL-3 裁决（2026-09-18）** | Feature 级 40% 累计停工线**显式撤销**（`enforced: false` + `revokedBy: 'V3-VOL-3'`，保留可 FAIL 的反证 `wouldFail`）；**保留**单轮披露纪律（五要素：前后值 / 日期 / 来源 / 理由 / 历史保留） | `size-baseline.ts:401-414, 1236-1285`；`test/size-ruling-vol3.test.ts`（6 用例） |
| **PENDING_ABSOLUTE_CAP（硬义务）** | `resolved: false`；`newBaselineBytes` / `absoluteCeilingBytes` / `resolvedOn` **全为 `null`**；纯判定 `evaluatePendingAbsoluteCap()`：① 标记缺失 ⇒ FAIL（防静默删除）② `resolved:false` 时**禁止预填**（防伪闭合）③ `resolved:true` ⇒ 必须三值齐备且 `absoluteCeilingBytes ≥ newBaselineBytes` 且 `resolvedOn` 形如 `YYYY-MM-DD` | `size-baseline.ts:1359-1378`（定义）、`:1387-1440`（判定）、`:1373`（义务原文：「方案 F 重构（聊天流统一承载）落地收口时，必须重新定 sidepanel 体积基线并设置绝对值上限」） |
| 已撤销的旧机制（不可重演） | `SIDEPANEL_CEILING_CAP` 的**判定作用**已被 **V3-VOL-1 ②** 撤销（降级 `SIDEPANEL_CEILING_CAP_ROLE = 'record-only'`），原因是「未经 spec/作者要求的自缚装置，挡住了合法功能」；`SIDEPANEL_CEILING` **不得**再读取它 | `size-baseline.ts:146-176` + `test/size-budget.test.ts` 断言 |
| 不动面（冻结产物） | `content.js` **177,076 B 无容差不可重登记**（`:13`）；`pick-layer.js` 33,900 B（自有零容差上限，`PICK_LAYER_*`） | `size-baseline.ts:13, 458`；`test/pick-layer-budget.test.ts` |

#### E. 上游 Feature 产物关系：取代 / 保留清单草案（**spec 阶段细化**）

| 上游 | 保留（v4 继续成立） | 取代/重定标（v4 改变承载或语义） |
|------|-------------------|------------------------------|
| **v1（F-14，`specs-tree-web-cli-plugin`）** FR-001~055 / NFR-001~010 / EC-001~026 / AC-001~012 | 三区 flex 全高布局（`#panel-top` / 主滚动区 / 底部区）**概念**；消息渲染（Markdown / 工具卡折叠 / 命令样式）；`scroll-policy`（48px 跟随）；会话/审计/设置/权限门禁全部语义；`FR-050`（失败工具卡可见）；`decision ②` 会话切换 | `AC-001~012` 中与**布局/入口位置**相关的量化断言（三区 = `#panel-top`/`#panel-main`/`#panel-bottom`、composer 末元素、`#log` 唯一滚动区）→ 由三区新定义取代；`#15a~#15q` 的几何断言重定标 |
| **v2（F-27，`specs-tree-web-cli-plugin-v2-insight`）** FR-V2-001~079 | 四维度数据模型与投影（`insight/*`）；真层级树 + 逐层 allow/ask/deny 覆盖层 + 硬底线 clamp（**判定链 pin 不动**）；撤销/取消授权 ops；命令档案对账（34 工具 / 142 子命令）；零明文与零新权限纪律 | **`AC-V2-002` / `FR-V2-023` / `NFR-V2-004`**（侧栏布局量化红线：`#log` `flex-grow=1`、稳态 `clientHeight ≥589px`、占比 ≥65.0%、composer 底边−视口底 ∈[0,+8px]、入口与 composer 不相交）→ 与 F 的三区/流内 composer 语义**直接冲突**，必须显式取代；`#tree-fab` 归属（v3 已从浮层迁为视图内按钮）→ v4 迁为工具栏入口 |
| **v3（F-28，`specs-tree-web-cli-plugin-v3-ui`）** FR-V3-001~087 / NFR-V3-001~018 / EC-V3-001~017 / AC-V3-001~027 | 视觉语言与设计令牌（`:root` 变量、双主题对称）；`l2/counts.ts` **计数单源**（`deriveCounts`，四视图标题/入口/摘要三处同源）；`l2/view-host.ts` **视图替换机制**（隐藏流 ↔ 显示宿主、滚动复原、焦点移动）；`l1/ref-store.ts` 五维判定 + 引用序号单调不复用 + 退役留痕；`l1/ref-validity.ts` fail-closed 判定；零明文回执（`l1/receipt.ts` 白名单 + `assertNoPlaintext`）；`page-as-input`（v3-4 页面侧层 + 零注入）；`disclosure.ts` 的 `hidden` 唯一折叠通道纪律 | **整个 L0 骨架**（`#l0-status-band` / `#l0-decision` / `#l0-kicker` / `#l0-pick` / `#l0-more` / `#l0-ref-toggle` / 决策卡唯一性）→ 被 F 三区取代；**整个 L1 层**（8 类 `[data-l1-panel]` + 三个 L0 触发器 + `L1_TRIGGERS` 映射 + ≤1 次交互契约）→ 承载位置改为流内卡；**L2 入口机制**（`#l0-statusbar` + `#l2-entries` + 四入口 aria 成对）→ 迁到工具栏；**风险位形态**（`#risk-rail` body 直挂 + 五类行 + 密度风险类归属）→ 迁为状态栏 chips（永不折叠语义保留）；**密度口径与全部登记格**（C1~C4 + 22 比对格 + 阈值登记）→ 重定标 |
| **v1/v2/v3 共同** | 不动面：判定链 pin、manifest 零新增权限、`content.js` 177,076、`pick-layer.js` 33,900、零明文纪律、fail-closed 结论枚举、R1/R2/R3 修复语义、取代台账 + 门禁守恒纪律 | — |

### 7.2 约束登记（**事实，非需求条文**）

| 类别 | 约束（事实） | 来源 |
|------|------------|------|
| 仓库 / 分支 / HEAD | `/home/usb/wks/gits/GitHub/LGDL`，`feature/web-cli-plugin` @ **`187c205`**（2026-09-18）；`main = 2ddc922`（**不合、不发布**）；工作区干净 | `git rev-parse` / `git status --short`（本轮实测） |
| 设计基准 | **F 稿** = `design/ui-redesign/option-f-chat-stream.html`（**116,130 B**，1,927 行）作为**契约**由 `option-f-shim.mjs`（33,368 B，**60 断言**）机器化；A~E 稿 + `index.html` 存档保留、不推翻；**全部已入版本库**（`git ls-files` 命中 7 个文件） | `stat` / `git ls-files` / shim 实跑 60/60 |
| 五法则红线 | 见 §0.3（法一~法五） | 编排器裁决 D5 + F 稿 `:62-74` |
| 不动面 | `dist/content.js` **177,076 B** 冻结；`dist/pick-layer.js` **33,900 B** 冻结；判定链 pin（`policy.ts` / `auto-authorize.ts` 内容哈希）；manifest 零新增权限 + 无 `contextMenus`；**风险永不折叠**原则；R1（declaration 状态一致性）/ R2（探测退避 + 稳态）/ R3（重锚救援 + 旧引用零改动）语义 | 编排器裁决 D6 + `test/size-baseline.ts:13,458` + `test/zero-injection.test.ts`（27） |
| 随带硬义务（必须进 spec 验收） | **V3-VOL-3**：① 收口重定 sidepanel 基线 + **绝对上限（带值闭合 `PENDING_ABSOLUTE_CAP`）**；② 取代 v3 面板资产走**取代台账**（测试守恒不降）；③ 密度门禁按新布局**重新定标**（阈值哲学 7/15 · 9/20 · 17/35 保留、登记格重算） | 编排器裁决 D7 + `test/size-baseline.ts:1359-1440` + `test/size-ruling-vol3.test.ts` |
| 权限 | 静态 `activeTab / scripting / storage / sidePanel / tabs`；可选 `bookmarks / downloads / notifications / clipboardRead / clipboardWrite`；**无 `contextMenus`** → 主题切换等新 UI 只能使用**已有** `storage` 能力 | `manifest.json`（当前未改） |
| 注入模型 | 零静态 `content_scripts`；绑定后按 origin 登记注入（`registerContentScripts` 对无 host permission 的 origin 失败）→ 未授权站点零注入 | `src/background/content-script-registry.ts` + `test/zero-injection.test.ts` |
| 主题与尺寸 | Chrome 侧栏 **320–560px（窄屏优先）**，跟随系统深浅色（**明暗双主题都要成立**）；无障碍需 `aria-expanded`/`aria-controls`（收起一律用 `hidden`，非 CSS 视觉隐藏）+ `:focus-visible` + 不靠颜色单独传达状态 | v3 门禁视口 320/400/520 × 900 + `docs/v3-density-baseline.json` |
| 密度口径（现状） | C1 可点 / C2 可见正文行（`⌈字符数 ÷ 34⌉`）/ C3 文本块（只登记）/ C4 常驻分区（只登记）；测量根 = `document.body`；**只豁免 `hidden` 属性**（`display/visibility/opacity/pointer-events`/视口位置/`aria-hidden` 一律不豁免） | `docs/v3-density-baseline.json#caliber` + `index.html:107-112` |
| 门禁纪律 | **严格串行、一次一个 Chromium**、日志完整落盘（禁 tail 截断）；断言**只增不减**、只强不弱；反证必须实跑（FAIL → 还原 → PASS）且逐条声明 `expectFailPattern`；本机内存紧张（约 1.5GB，历史曾 OOM） | v3 收口纪律 + `test/gate-integrity.test.ts` |
| 消息契约扩展约束 | 新增 SW↔面板 kind **不得**加入 `KIND_SET`（该集合进 `content.js`，+1 B 即 FAIL）；沿用独立校验器模式（先例：`insight-protocol.ts` / `content/pick-protocol.ts`，后者逐字记录「6 个 kind 实测 +307 B = 红线」） | `src/background/messaging.ts:69-100`、`src/content/pick-protocol.ts:9-12` |
| 零明文纪律 | 回执白名单 8 字段 + 渲染时 `assertNoPlaintext()` 抛错；审计字段白名单 8 项 + URL 去参；key / 剪贴板 / 通知 / 书签正文永不入明文 | `l1/receipt.ts:38-77`、`l2/audit.ts:24-32` |
| 本阶段纪律 | 只读代码 + 只写本 Feature 目录；未改生产代码 / 测试 / 其他 SDDU 目录 / ROADMAP；未改 `dist`；未跑 Chromium 门禁；未 commit/push | 编排器约束 |

### 7.3 门禁影响面预判（journey / l0 / l1 / l2 / density）

| 门禁 | 断言数 | 判定 | 预判比例（**粗估，供 spec 参考，非承诺**） |
|------|:---:|------|------|
| journey | 167 | **低存活** | ~15% 存活（会话/LLM/消息渲染部分）· ~45% 取代（布局几何 + 三区定义）· ~40% 重定标（几何阈值按新三区重算，且涉**保护段**） |
| l0 | 164 | **整文件重写** | ~0~10% 存活；L0 骨架本体被 F 三区取代（`#l0-status-band`/`#l0-decision`/`#l0-pick`/`#l0-more`/`#l0-ref-toggle` 全部消失） |
| l1 | 103 | **入口机制重写** | ~10% 存活（引用判定 / 回执 / 局部树 / 手势数据的**内容**契约可保留）；三个 L0 触发器与 `[data-l1-panel]` 体系被流内卡取代 |
| l2 | 71 | **中高存活** | ~50~60% 存活（四视图本体 + 计数单源 + 视图替换机制）；入口面板/aria 成对断言迁移到工具栏 |
| density | 127 | **必须重定标** | ~30% 存活（口径实现骨架 + 反证判定器）；C1 豁免边界 + 9 强制格 + 15 风险格 + worst + 阶段 F 基线比对（22 格）**全部重算** |
| binding / insight / hardening / zero-injection / page-input | 192 / 116 / 24 / 27 / 102 | **高存活** | binding/zero-injection/page-input 基本不动（后台 + 页面侧，属不动面）；insight 中「入口位置」相关少量取代；hardening 不动 |
| 元门禁（gate-integrity 12）+ 取代台账 | 12 + 台账 | **必须存活且加强** | F 的删除行远多于 v3 → 台账条目数与「按行命中」校验压力显著上升 |

### 7.4 取代台账与登记处置建议（**spec/plan 细化**）

| 产物 | 现状 | 建议处置方向（不构成需求） |
|------|------|--------------------------|
| `docs/v3-supersession-ledger.json` | v3 台账（按行判定 + `protectedRanges` 两段 sha256 + `pureAdditionFiles` + `countCalibers`） | **保留为 v3 历史**（不改写）；v4 新建自己的台账（`docs/v4-supersession-ledger.json`）并在其中**显式登记**「接管 v3 台账的后续取代」；两条保护段需**逐段决策**（保留 id 兼容 / 显式解除并新 pin） |
| `docs/v3-density-baseline.json` | v3 密度基线（caliber + 3 档 × 3 视口 + risk 15 格 + volumes） | **保留为 v3 历史**；v4 建**新基线文件**（新口径 + 新登记格），并在新文件中登记「与 v3 基线的差异与理由」（方向：`tighten-only` 精神延续，但**口径本身变了**，属「换口径重定标」而非「放宽」） |
| `test/ui/density.mjs` + `test/ui/density-metrics.mjs` | 127 断言 + 口径单源 | 复用口径**实现骨架**与反证判定器；豁免边界与登记格重算；新口径必须配套**反证**（防豁免被滥用为「把控件藏进流子树来降密度」） |
| `test/size-baseline.ts` | 375,102 / 393,857 / `PENDING_ABSOLUTE_CAP(resolved:false)` | 收口时按 V3-VOL-3 闭合：置 `resolved:true` + `newBaselineBytes` + `absoluteCeilingBytes` + `resolvedOn`；**不得**预填、不得静默删除标记（两者都有可 FAIL 断言） |

### 7.5 开放问题（**给 spec 阶段裁决**）

| ID | 事项 | 现状 / 为什么需要裁决 |
|----|------|---------------------|
| **O-CHAT-001** | **系统事件行折叠阈值 / 已闭合卡压缩 / 流内检索**（设计稿预判难点 ①） | F 稿 `:1504` 自认「长会话的折叠/摘要策略**留给重构**」→ 三个具体口径空缺：① 系统事件行的折叠阈值（现状唯一先例 = 工具卡 480 字符 / 10 行，`sidepanel.ts:107-108`）② 已闭合卡（`data-answered` / `data-decision`）是否压缩、压缩到什么形态 ③ 是否提供流内检索及其边界（与「留痕 = 事实依据」的张力） |
| **O-CHAT-002** | **append-only 事件模型与引用注册表的边界**（设计稿预判难点 ②） | 需裁决：① ask/auth/ref/system 四类流条目的 **id 口径**（是否统一 `nextId` 单调序列；引用仍用 `ref_<n>` 序号）② 与 `ref-store` 的关系（流内 ref 卡是**引用注册表的投影**还是**独立事件**）③ **会话切换**时事件流的保留/截断（现状 `history` 动作整体替换 — `chat-state.ts:188-195`）④ 留痕的**持久化范围**（是否落 `chrome.storage.session`；现状 ask/授权/引用从不落库，`session-store.ts:76-80`） |
| **O-CHAT-003** | **工具栏常驻导航准入规则**（设计稿预判难点 ③） | F 稿工具栏 = 4 视图 + 1 主题 = **5（满额）**；需裁决：① 新增常驻入口的**置换规则**（谁被挤出、挤到哪）② 4 个视图入口是否含**计数徽标**（shim F4 断言「带计数徽标」，与 v3 的 `l2/counts.ts` 单源可复用）③ **主题切换是新增控件**（现状只跟随系统）→ 是否引入手动主题态、状态存哪（只能用已有 `storage` 权限） |
| **O-CHAT-004** | **体积绝对上限的数值来源**（设计稿预判难点 ④） | `PENDING_ABSOLUTE_CAP` 要求 `absoluteCeilingBytes`（绝对值，非百分比）+ `newBaselineBytes`；需裁决：① 新基线取「F 实现完成后的实测产物」还是「F 收口轮的最终产物」② 绝对上限的**数值哲学**（安全裕度百分比？Feature 冻结上限？「只降不升」？）③ 与 5% 公式的关系（两者并存时以谁为判定）④ 注意 **V3-VOL-1 ② 的教训**：不得设立「未经要求的自缚装置」（`SIDEPANEL_CEILING_CAP` 曾被撤销） |
| **O-CHAT-005** | **站点级授权 / 撤销授权 / 会话切换与分组 / 隐私开关 / 知情同意 / 自动授权开关的归属** | 现状住在 L1 的 `#topbar`（`index.html:1141-1173`）；F 的三区法则（工具栏禁止一次性交互 / 状态栏只放状态 / 流内只有 7 类卡且无「站点授权」型）使其**无归属**。需裁决：① 全部迁入「设置」视图吗（F 稿设置分区含「授权与策略档」）② 「授权当前站点」在**未授权首装路径**上如何被发现（工具栏站点摘要为只读不可点）③ 是否新增第 8 类卡（如 `action`/`site`）——若新增则**违反法一?**（法一只禁止一次性交互出现在工具栏/浮层，不禁止新卡型）→ 需明确 |
| **O-CHAT-006** | **「下一步推荐」的内容产生规则** | 前提假设 A-CHAT-009：推荐可**从既有真值派生**（L2 计数 / 五类风险 / 引用状态 / 探测状态 / onboarding 步骤）。需裁决：① 若可派生 → 规则表 + 优先级 + 上限（几张推荐卡、几个 chip）② 若必须引入 LLM 侧产物 → **属新面**（是否超出本 Feature 范围）；③ 推荐的**点击语义**（chips 即指令 = 直接发起回合？是否与 `pending` 门控冲突，见 R-CHAT-007） |
| **O-CHAT-007** | **风险位形态：`#risk-rail`（顶部 body 直挂）→ 状态栏 chips（底部）是否合规「永不折叠」** | 「风险永不折叠」被列为**不动面**；F 稿改变其**位置、形态与交互**（chip 点击展开详情 + 滚动定位流内卡，`option-f-chat-stream.html:42-46`；shim H5/H8 断言状态栏本体无 `hidden`、chips 容器可见、打开任意视图后 chips 仍可见）。需裁决：① 「永不折叠」= **语义**约束（可发现 + 不被展开收起影响）还是**实现**约束（必须常驻最上层）② 若为语义约束 → 需重新定义**机器判据**（祖先闭包探针 / 豁免清单 / 密度风险类归属写入何处）③ 五类风险（未授权 / 探测中 / 硬底线 / 破坏性待确认 / 引用失效）在 chip 形态下如何「有则显示、无则不占行」且**不丢可发现性** |
| **O-CHAT-008** | **F 的 7 类卡与现状 tool / command / thinking / error 的关系** | 现状 `#log` 内的 5 种过程形态（工具卡 / 命令行 / 思考指示 / 错误条目 / 工具通知）**不在 F 的 7 类内**，而工具卡是 TASK-023 的既有能力（工具名 + ✓/✖ + 耗时 + 预览 + 折叠记忆）。需裁决：① 扩充为第 8/9 类（如 `tool`/`command`）还是并入 `ai`/`system` ② 若并入，如何保留「工具名/状态/耗时/折叠」信息与其门禁断言 ③ shim 的 `CARD_TYPES`（B1/H11 断言「7 类」）是否随之扩展（设计稿契约变更的登记方式） |
| **O-CHAT-009** | **外部竞品事实的补齐** | 本轮未执行（routing 计划为 local-only）；解除条件 = 提交 `latest_public_web → doubao_search` 计划后补齐，或作者直接提供事实 |

### 7.6 建议的叶子拆分草案（**供 spec 参考；discovery 只提建议不执行**）

| 叶子（建议名） | 承载问题 | 核心交付（问题域口径，非任务清单） | 为何可独立「全门禁绿」 |
|---------------|---------|--------------------------------|---------------------|
| **v4-1 三区骨架与工具栏/状态栏 + 密度重定标** | Q-CHAT-004 / 005（部分）/ 008 + R-CHAT-004/005/011 + D7③ | 三区落定（工具栏 ≤5 可点 + 站点摘要只读 + 4 视图入口 + 主题切换）；状态栏常驻（连接状态一行 + 风险 chips，永不折叠语义新判据）；密度**新口径**定义 + 反证（防豁免滥用）+ 首轮真实产物登记格；`#log`/`#composer` 契约处置（与 journey 保护段的显式决策） | 骨架先行，其余叶子在其上叠加；密度新口径一旦落地即成共同基线 |
| **v4-2 聊天流 append-only 事件模型与 7 类卡渲染** | Q-CHAT-001（模型层）/ 005 / 007 + R-CHAT-006/013/014 + O-CHAT-002/008 | 流事件模型（不可变、单调、可回放；ask/auth/ref/system/nextstep 条目类型）；7（+N）类卡渲染与固化契约（`data-*` + `[hidden]` + `.ts`）；tool/command/thinking/error 归位；滚动跟随/回看与 320px 换行 | 纯模型 + 渲染层，不依赖 SW 契约变更（可先用既有 5 条通道喂数据） |
| **v4-3 ask-user / 授权卡流内化 + 留痕固化 + 授权记录回看** | Q-CHAT-001（承载层）/ 002 / 007 + R-CHAT-007/008 + O-CHAT-005 | `ask-user`（choice/text）与「单次操作授权（confirm）」从独占槽迁入流内 + 固化不可逆 + 60s 超时/取消留痕；R1 `supersededAsk` 语义升级（取消 + 留痕）；授权记录在流内可回看（与审计视图的分工）；零明文边界 | 依赖 v4-2 的模型与卡渲染，但**不依赖** ref/system 两类卡的迁移 |
| **v4-4 引用卡 / 系统事件行 / 推荐卡流内化 + 页面侧拾取入口迁移** | Q-CHAT-003 / 006 / 005 / 013 + R-CHAT-012 + O-CHAT-006 | 引用卡（有效/失效/新序号递增 + 失效卡保留 + 重拾/重锚留痕）；系统事件行（单行 + 时间戳 + 只追加，6+ 条通道归并）；下一步推荐卡（真值来源 + chips 即指令）；面板侧拾取入口消失后的可发现性与救援路径重锚 | 依赖 v4-2；与 v4-3 无强耦合（可并行） |
| **父 Feature（轻量规范容器）** | — | 聚合 spec/plan 与收口总账（`closeout.md`）；**不承接** tasks/build/review/validate（与 v2/v3 先例一致：父 `phase=tasked` / `workflow=4.tasks` / `agent=sddu-tasks`） | — |

**跨叶硬义务（V3-VOL-3，D7①）的落位建议**：体积基线重定 + 绝对上限（`PENDING_ABSOLUTE_CAP` 带值闭合）只能在**全 Feature 收口**时定值（否则中间态会被反复重登记）。建议：① 作为**父级收口验收锚**登记；② 由**最后完成的叶子**（预计 v4-4）在其收口轮执行「重定基线 + 设绝对上限 + 更新 `test/size-baseline.ts`」；③ 每个叶子在自身轮次内按既有纪律做**中间重登记**（五要素披露，容差 5% 不动）。

**未采纳的调整提议（已评估并放弃，供 spec 参考）**：
- 曾考虑把「取代台账 + 密度重定标」独立成第 5 叶（纯工程/门禁目标）。放弃理由 = 台账与密度重定标**必须与它取代的 DOM 同步落地**（先立台账再改 DOM 会产生「登记了还没被取代的删除行」这一类无法通过按行判定的中间态），独立成叶无法独立全绿，违反「每叶全门禁绿」纪律。故按 v3 先例把门禁/台账工作**内嵌进对应叶子**。

### 7.7 证据台账（文件级）

| 证据 | 路径 / 位置 | 性质 |
|------|-----------|------|
| 作者原话 5 条（逐字） | 编排器传入本任务 §1；与 F 稿头注 `option-f-chat-stream.html:8-14` 一致 | 作者口述（一手） |
| 设计基准 F 稿 | `packages/web-cli-plugin/design/ui-redesign/option-f-chat-stream.html`（116,130 B / 1,927 行，`git ls-files` 命中） | 设计契约 |
| 设计契约机器化 | `.../option-f-shim.mjs`（33,368 B）；**本轮实跑 60 passed / 0 failed** | 实测（Node DOM 垫片，非项目门禁） |
| A~E 稿 + 设计入口页 | `.../option-{a,b,c,d,e}-*.html` + `index.html`（全部已入版本库，存档保留） | 设计依据 |
| 现状侧栏 DOM | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（68,408 B / **109 个 `id`**） | 源码 |
| 消息/会话状态模型 | `src/ui/sidepanel/chat-state.ts`（254 行） | 源码 |
| 面板主控与渲染 | `src/ui/sidepanel/sidepanel.ts`（2,103 行） | 源码 |
| L0 / L1 / L2 实现 | `src/ui/sidepanel/l0/{shell,decision-card,status-bar,risk-rail}.ts`、`l1/{panels,receipt,ref-store,ref-validity,local-tree}.ts`、`l2/{view-host,counts,audit,command-catalog}.ts` | 源码 |
| 折叠器契约 | `src/ui/sidepanel/disclosure.ts`（`NEVER_FOLDABLE` / `COLLAPSIBLE_TARGETS` / `assertFoldable`） | 源码 |
| 视图模型（L0Input/L0View） | `src/ui/sidepanel/view-model.ts`（889 行，`:556-620, 624-760`） | 源码 |
| SW↔面板消息契约 | `src/background/messaging.ts:1-140`（`PluginMessageKind` + `KIND_SET`） | 源码 |
| chat 事件词汇表 | `src/background/chat-events.ts:20`（`variant` 5 值） | 源码 |
| ask 桥与超时 | `src/background/ask-bridge.ts:41,58-65` | 源码 |
| 会话持久化口径 | `src/background/session-store.ts:76-80`、`chat-session.ts:16,58` | 源码 |
| pick 协议（独立校验器先例） | `src/content/pick-protocol.ts:9-12,39-51` | 源码 |
| 引用注册表（append-only 先例） | `src/ui/sidepanel/l1/ref-store.ts:117-130,158-176` | 源码 |
| 体积守卫与 V3-VOL-3 | `test/size-baseline.ts`（375,102 / 393,857 / `PENDING_ABSOLUTE_CAP` / `SIDEPANEL_SIZE_RULING_V3_VOL_3`） | 源码 |
| 体积裁决门禁 | `test/size-ruling-vol3.test.ts`（6 用例） | 源码 |
| 密度基线与口径 | `docs/v3-density-baseline.json`（caliber C1~C4 / thresholds / tiers / volumes） | 历史产物（只读） |
| 取代台账与保护段 | `docs/v3-supersession-ledger.json`（`protectedRanges` / `counts` / `pureAdditionFiles` / `v3GateFloors`） | 历史产物（只读） |
| 门禁清单与计数 | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/closeout.md:13,50-55` | SDDU 产物（只读） |
| v3 四叶状态 | `.sddu/.../specs-tree-v3-1-l0-shell-density/state.json` 等 | SDDU 产物（只读） |
| 上游需求条文 | `.sddu/.../specs-tree-web-cli-plugin/spec.md`（v1 FR-001~055）、`.../specs-tree-web-cli-plugin-v2-insight/spec.md:255,342`（AC-V2-002 / FR-V2-023 / NFR-V2-004）、`.../specs-tree-web-cli-plugin-v3-ui/spec.md`（FR-V3-001~087） | SDDU 产物（只读） |
| 版本位现状 | `.sddu/specs-tree-root/ROADMAP.md`（`F-30` 0 命中 / `F-29` 候选 `:910-912` / `v0.9.0` 双主题 `:53,383,389` / 同批先例 `:32,414`） | 规划文档（只读） |
| dist 实测 | `stat -c %s packages/web-cli-plugin/dist/*`（content 177,076 / pick-layer 33,900 / sidepanel 375,102 / background 1,606,637 / options 82,093 / sidepanel.html 68,408） | 实测（只读，未构建） |
| 仓库状态 | `git rev-parse HEAD` = `187c205…`；`git status --short` = 空；`git log --oneline -18` | 实测 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-30「web-cli-plugin v4 聊天流统一承载（方案 F 重构）」问题挖掘）：作者原话 5 条逐字 + 编排器裁决 D1~D7（含本轮 F-30 零占用复核）+ 五法则红线 + R1/R2/R3/V3-VOL-1~3 时间线 + 现状基线 §7.1（A 消息状态模型 10 项 / B 七类卡映射 8 项 / C 门禁影响面 13 项 / D 体积与 V3-VOL-3 / E 取代-保留清单草案）+ 问题清单 **Q-CHAT-001~013**（核心 4 / 次要 5 / 潜在 4）+ 假设 **A-CHAT-001~009** + 风险 **R-CHAT-001~016** + 开放问题 **O-CHAT-001~009** + 叶子拆分草案（4 叶 + 父容器 + 跨叶硬义务落位）+ 门禁影响面预判 + 证据台账（含 F 稿 shim 实跑 60/60） | 2026-09-18 | SDDU Discovery Agent |
