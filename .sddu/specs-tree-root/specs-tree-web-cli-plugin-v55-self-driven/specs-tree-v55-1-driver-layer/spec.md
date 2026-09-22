# Feature Specification：specs-tree-v55-1-driver-layer（V5.5-1 驱动者层 + 法七扩展底座）

> **文档定位**: SDDU 需求规范（叶子切片） — 本叶承载的父 FR / NFR / EC / AC 的**实施范围切片**；权威条文见父 `../spec.md`
> **前置依赖**: 父 `../spec.md` v1.0（2026-09-22）+ 父 `../discovery.md` v1.0（2026-09-22，Q-SELF-001~015 / R-SELF-001~012 / O-SELF-001~007 已全裁决）；上游底座 = `specs-tree-web-cli-plugin-v5-all-in-next`（F-32，v5 父 + 三叶**全 `validated`、零改写**）
> **创建人**: SDDU Spec Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Spec Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（V5.5-1 叶子规范：驱动者层 + 法七扩展底座 + 时机源扩张 + 答案驱动化 + S0 全链机器化；**首叶 / P0 / 依赖链起点**）

本叶 = v5.5 的**首叶 / 底座叶**，交付「可以让『用户已表达意图』之后**有人接手**」的那一层：**驱动者**成为**注册表条目**（不再是散落调用点），**时机源**扩张到能覆盖「已答」（`'answered'`），**已答 ask / 已交描述**进入**驱动者终态词汇**，`applyRefAction` 从「只计数」变为「有驱动」，`submitDescribe` 补齐驱动，后台 ask 迟到作答不再裸 `errorResponse`；并把 **S0（真机 22:49 序列）全链机器化**为可判回归（地位 = v5 之 S2）。**本叶不做主题① 的引导内容**（那是 `v55-2`）、**不做主题② 的主动性与护栏**（那是 `v55-3`）。

---

## 1. 元数据

| 字段 | 值 |
|------|-----|
| Feature ID | specs-tree-v55-1-driver-layer（V5.5-1 驱动者层 + 法七扩展底座） |
| 父 Feature | specs-tree-web-cli-plugin-v55-self-driven（depth=1，**F-33**，v0.11.0） |
| 名称 | V5.5-1 驱动者层 + 法七扩展底座——驱动者注册表化（四元组机核 + `driverClass`）+ 时机源扩张（`'answered'`）+ `ref-action` 抑制重锚 + 驱动者终态词汇（已答 ask 三型 / 已交描述）+ `applyRefAction` 驱动化 + `commandSends` 消费面登记 + `submitDescribe` 补齐 + 后台 ask 迟到作答非死端 + 死端守护门禁扩张（双向反证）+ **S0 全链机器化** |
| 优先级 | P0 |
| 目标版本 | v0.11.0（登记留给收口） |
| 目录深度 | depth=2（叶子，`leaf: true`） |
| 交付顺序 | **position = 1（首叶）**；叶内执行序见 §8.4 |
| 分支 / HEAD | `feature/web-cli-plugin` / `1022f8d`（spec 阶段起点） |
| 基线产物 | `dist/sidepanel.js` = **549,609 B**（生效上限 **577,089 B**，余量 **27,480 B**）；`dist/content.js` = **177,076 B**（零容差）；`dist/pick-layer.js` = **34,358 B**（零容差） |
| 依赖 | **无前置叶**（本叶是依赖链起点） |
| 下游叶 | `specs-tree-v55-2-deterministic-onboarding`（依赖本叶的**时机源 / 终态词汇 / 驱动者四元组 / 悬置任务入口**）；`specs-tree-v55-3-ai-driven-orchestration`（间接：依赖驱动者层的「候选来自注册表」语义） |
| 相关干系人 | 作者（唯一真实用户 + 决策者，已授权编排器代行决策）；编排器（DC-SELF-003 / 005）；下游 @sddu-plan / @sddu-tasks / @sddu-build / @sddu-review / @sddu-validate |
| 关联问题 | **Q-SELF-001 / 002 / 005 / 006 / 009 / 011**（核心与次要）；关联 Q-SELF-004（为时机源提供承载） |
| 关联风险 | **R-SELF-002**（门禁取代面，高）/ **R-SELF-003**（半驱动者堆积，中高）/ **R-SELF-007**（法七扩展判据真空，中高）/ R-SELF-008（`askBridge` 生命周期，中）；+ **R-SELF-901 / 902 / 903 / 904 / 908** |
| 关联缺口 | **GAP-SELF-01 / 02 / 03 / 04 / 05 / 06**（§14 覆盖矩阵） |

---

## 2. 上下文与边界

### 2.1 上下文

v5（F-32）已把「下一步**是什么**」做成管线强制保证（`BLOCKED_TERMINALS` 恰 5 + 死端守护门禁 39 断言 + S2 十环节全链），但**「下一步由谁按」仍是用户**：

- **唯一**回合发起入口 = `requestTurn`（`sidepanel.ts:277-297`），调用点被 `test/op-wiring.test.ts#requestTurnProblems` 钉死**恰 2 处**（`:3232` composer / `:3256` `op.turn` 槽）。
- 推荐器求值时机 = **恰 4 项闭集**（`sidepanel.ts:1791`：`'pick' | 'stale' | 'idle' | 'firstRun'`），**无 `'answered'`** ⇒ **答完之后推荐器永不重新求值**。
- 本该接手的 `ref-action` provider 又被 `when: … && ctx.session.openAsks === 0`（`providers.ts:136-148`）**硬抑制**（ask 开着时抑制）。
- 于是真机会话 B（22:49）：绑定 ✓ → 拾取引用（出生有效）→ ask 已答「原地翻译为中文」→ **彻底静默**。根因链：`submitAskFor`（`:2557-2588`）走 `applyRefAction`（`:2177-2189`）→ `ref-store.dispatch`（`l1/ref-store.ts:280-291`）通过有效性后**唯一副作用 `sends += 1`** ⇒ **答案物理上被丢弃**。会话 A（20:15）证明这不是偶发：**答两遍后靠手动重打才启动回合**。
- 旁路死端：「改用描述」`submitDescribe`（`:2541-2546`）只 `dispatch({type:'ask-resolved'})`，**从不 send / 从不驱动**。
- 后台 ask 在回合结束后到达 ⇒ `askBridge.settle` 返回 `false` ⇒ 裸 `errorResponse('无待回答的 ask-user 请求')`（`service-worker.ts:2813-2822`）。

本叶的工作 = **把「驱动权」变成可注册、可去重、可机核的一层，并把「用户已表达的话」全部接入它**。

### 2.2 范围（做 / 不做）

**做（in）**：

- **驱动者注册表化**：驱动者 = 既有 `NextProvider` 契约 v2 条目；**驱动者集合 ≡ 注册表 provider 集合**；四元组（`driverId` / `timing` / `evidence` / `ops`）可机核；`driverClass: 'deterministic' | 'ai-driven'` 单源标注。
- **时机源扩张**：`RecommendTrigger` 从 4 项扩到 **≥5**（含 `'answered'`）；求值入口**仍恰一处**（`maybeRecommend` 家族）；`ref-action` 的 `openAsks === 0` 抑制**显式重锚**（答完后必须重跑）；防抖三常量逐字不动。
- **驱动者终态词汇**：新增**独立单源**（与 `STREAM_TERMINALS` 6 项**正交**）——「已答 ask」（三型）+「已交描述」；每终态必有可达 next（双向反证）。
- **「已答」口径四判据**：非取消 + 非空 = 已答；取消（含空）= 已取消（另记）；`ASK_CANCEL_REASONS` 4 项不变；后台 ask 迟到 ⇒ **不记已答**。
- **答案驱动化**：`applyRefAction` = 裁决 + **驱动**（有效 ⇒ 交驱动者层；无效 ⇒ 既有阻塞终态 + 可达 next）；`commandSends` 消费面**显式登记**（COR-1 口径：1 处只读投影 + 3 处测试，零驱动语义）或退役。
- **`submitDescribe` 补齐驱动**（空描述 ⇒ 卡内校验、零副作用、**不入终态**）。
- **后台 ask 迟到作答非死端**：固化事实 + 可达 next，**不裸 `errorResponse`**。
- **死端守护门禁扩张**：新增「驱动者终态词汇」判据 + 双向注入反证（禁恒真断言）。
- **S0 全链机器化**：真机 22:49 序列全链（① 绑定 → ② 探测 → ③ 拾取引用 → ④ ask 登记 → ⑤ 已答 → ⑥ **答案产生驱动** → ⑦ **分支** → ⑧ 终局）；本叶交付**全链骨架 + 分支 A（已配置 ⇒ 自动续流）的机制侧 + 分支 B 的识别侧**（分支 B 的「引导内容 + 配置完成自动续接」由 `v55-2` 交付，见 `../specs-tree-v55-2-deterministic-onboarding/spec.md`）。

**不做（out）**：

- **不做主题① 的引导流内容**（多步 wizard / `runChat` 前置判据 / 配置完成自动续接）——那是 `v55-2`；本叶只保证「未配置」能被**识别为已表达意图之后的终态**并**有驱动者**（可产出「配置」这一 next 的**承载**）。
- **不做主题② 的 AI 主动性与护栏**（经 `op.turn` 主动发回合 / 三档清分 / 打扰·成本·防环）——那是 `v55-3`。
- 不碰 `src/content/**` / `dist/content.js` / `dist/pick-layer.js`；不动判定链（`zeroDiffFiles` 9 项）；不改 `KIND_SET`（40 项逐字）；不改 `manifest.json`；不新增静态权限（**连 `optional_permissions` 也不新增**）。
- 不改 12 kind 卡类型学 / 三区法则；**不新增流内固定宿主**（`REGISTERED_STRUCTURAL_HOSTS = []` 保持）；不改 ROADMAP；不碰 `design/**`；不改写 v5 产物。

### 2.3 与父规范的关系

- **权威条文 = 父 `../spec.md`**（§5.2 DRIVE / §5.3 LAW7X / §5.4 TIMING / §5.9 SUPERSEDE 的 X-SELF-1·2·4·5·6 / §5.10 GATE / §5.12 S0 / §12 / §13 / §14）。本叶只做**范围切片 + 实施口径**，不新增与父冲突的需求；若必须偏离，须先回父规范做显式取代登记。
- 父 §12 的 **X-SELF-2 / 4 / 5 / 6** = 本叶的**判据重写施工图**（X-SELF-1 在本叶按读法①「不发生取代」如实登记）；父 §9 的 **AC-SELF-001 / 002 / 003 / 004 / 009 / 010 / 011 / 015 / 016 / 017 / 020** = 本叶的**验收锚点**。

---

## 3. 目标与非目标（本叶）

### 3.1 目标

| # | 目标 |
|---|------|
| **LG-V55-1-001** | **驱动者层成立**：驱动者 = 注册表条目（**集合 ≡ provider 集合**）；四元组可机核；新增驱动者**主流程 diff = 0**（`requestTurn` 仍恰 2 / `maybeRecommend` 定义恰 1 / 分发器不变）。 |
| **LG-V55-1-002** | **答完有人接手**：`'answered'` 时机落地 ⇒ 答完之后**恰在一次求值内**产出可达 next（会话 B 的「彻底静默」不再复现）。 |
| **LG-V55-1-003** | **答案不被丢弃**：`applyRefAction` = 裁决 + 驱动（`sends += 1` **不再**是唯一副作用）；`submitDescribe` 补齐驱动。 |
| **LG-V55-1-004** | **法七扩展**：已答 ask（三型）/ 已交描述入**驱动者终态词汇**（正交单源）；每终态必有可达 next；**双向反证 + 禁恒真断言**。 |
| **LG-V55-1-005** | **S0 首验收机器化**：真机 22:49 序列 headless 全链可判，断言「**答案不被丢弃** ∧ **静默窗口 = 0** ∧ **死端 = 0**」。 |
| **LG-V55-1-006** | **零退化**：v5 的 5 类阻塞 / 39 死端断言 / 9 op / 12 kind / `KIND_SET` 40 / 判定链 pin / 双稿双 shim —— **逐条不减**。 |

### 3.2 非目标（本叶）

继承父 §3.2 的 `NG-SELF-001~022` 全部适用。**本叶额外强调**：

| # | 本叶明确不做 |
|---|-------------|
| **LNG-V55-1-001** | **不把「驱动者」实现为「在分发器 / 主流程里加一个 if」**：驱动者集合必须 ≡ 注册表 provider 集合；主流程 diff = 0。 |
| **LNG-V55-1-002** | **不新增第二个推荐器 / 第二个求值入口**（时机源扩张只在既有 `maybeRecommend` 家族内进行）。 |
| **LNG-V55-1-003** | **不改写 `STREAM_TERMINALS` 6 项**：驱动者终态词汇以**新增独立单源**实现（正交，不是改写既有终态）。 |
| **LNG-V55-1-004** | **不把「已答」判据写成恒真**（例如「卡存在即已答」）；取消 / 空值 / 迟到作答**必须**使其不成立。 |
| **LNG-V55-1-005** | **不提前落地 `v55-2` / `v55-3` 的内容**：主题① 的引导内容 / 主题② 的主动性与护栏不在本叶。 |
| **LNG-V55-1-006** | **不静默删除 `commandSends`**：保留则登记消费面，退役则走显式取代登记（二选一显式）。 |
| **LNG-V55-1-007** | **不触碰保护段**：journey `43054..58287` / binding `107780..115930` **优先保段**。 |

---

## 4. 功能需求（本叶承载的父 FR）

> 需求条文以父为准；下表给出**本叶落地切入点**。

| 父 FR | 本叶落地切入点 | 优先级 |
|---|---|---|
| FR-SELF-010 | 驱动者 = 注册表条目；「集合 ≡ provider 集合」双向包含机核 | P0 |
| FR-SELF-011 | 四元组（`driverId` / `timing` / `evidence` / `ops`）抽取机核；`chips` 无悬空 | P0 |
| FR-SELF-012 | 七类「已表达意图」时刻枚举单源（恰 7 项）+ 逐类「存在 ≥1 驱动者」 | P0 |
| FR-SELF-013 | 「必有下一个驱动者」判据（N = 0）+ **双向**注入反证 | P0 |
| FR-SELF-014 | 驱动者去重（`driverId + ctx 摘要`，单源） | P0 |
| FR-SELF-015 | 求值入口**恰一处定义**；调用点不增（基线 7 处）；`requestTurn` 计数按 X-SELF-1 口径 | P0 |
| FR-SELF-016 | 驱动者 `chips ⊆` 9 opId；管线唯一（无 per-driver 旁路） | P0 |
| FR-SELF-017 | `driverClass` 单源（本叶只落 `'deterministic'` 分支；`'ai-driven'` 由 `v55-3` 消费） | P0 |
| FR-SELF-018 | 驱动者 `priority` 必填 + 列表位置置换测试 | P0 |
| FR-SELF-019 | 四者声明单源 + 门禁从源文本抽取 | P0 |
| FR-SELF-020 | **驱动者终态词汇单源**（已答 ask 三型 / 已交描述；与 `STREAM_TERMINALS` 正交） | P0 |
| FR-SELF-021 | 三型 ask 逐型「必有可达 next」+ 双向反证 | P0 |
| FR-SELF-022 | `ref-round-<refId>` 作答 ⇒ **可判驱动**；「`sends` 递增不足以满足」断言 | P0 |
| FR-SELF-023 | 「已答」四口径（非取消+非空 / 取消另记 / `ASK_CANCEL_REASONS` 4 项 / 迟到不记） | P0 |
| FR-SELF-024 | 终态判据两段证伪（注入 FAIL → 逐字节还原 PASS） | P0 |
| FR-SELF-025 | `applyRefAction` = 裁决 + 驱动；无效 ⇒ 既有阻塞终态 + 可达 next | P0 |
| FR-SELF-026 | `commandSends` 消费面显式登记（COR-1 口径）或退役 | P0 |
| FR-SELF-027 | `submitDescribe` 补齐驱动；空描述零副作用且**不入终态** | P0 |
| FR-SELF-028 | 后台 ask 迟到作答：固化 + 可达 next；**不裸 `errorResponse`** | P0 |
| FR-SELF-030 | `RecommendTrigger` 扩张含 `'answered'`；旧 4 项逐字保留 | P0 |
| FR-SELF-031 | `ref-action` 抑制条件显式重锚（答完后必须重跑） | P0 |
| FR-SELF-032 | 时机源闭集单源 + 计数 ≥5 + 散落字面量零命中 | P0 |
| FR-SELF-033 | 求值入口恰一处定义；禁止第二个推荐器 | P0 |
| FR-SELF-034 | 10 s / 单卡 ≤3 / 每回合 ≤1 **逐字不动** | P0 |
| FR-SELF-035 | 新时机源**不**复用 firstRun「至多一次」语义 | P0 |
| FR-SELF-036 | 时机源 ↔ 驱动者映射表机核（「答完之后恰 ≥1 驱动者」） | P0 |
| FR-SELF-100 | **X-SELF-1 读法①**：`requestTurn(` **仍恰 2 处**（如实登记「**未发生取代**」） | P0 |
| FR-SELF-101 | **X-SELF-2**：时机词汇扩张 + `ref-action` 抑制裁决（等价重锚） | P0 |
| FR-SELF-103 | **X-SELF-4**：`BLOCKED_TERMINALS` 5 项逐字不变 + 终态词汇**新增** | P0 |
| FR-SELF-104 | **X-SELF-5**：`applyRefAction` 语义重定义 + `commandSends` 登记 | P0 |
| FR-SELF-105 | **X-SELF-6**：`submitDescribe` 补齐驱动 | P0 |
| FR-SELF-107 | 取代一律等价重锚；**未发生取代须如实登记** | P0 |
| FR-SELF-110 | 门禁等价重锚（本叶主责：`op-wiring` / `recommendation-sources` / `local-act-wiring` / `no-dead-end` / `s2-deadend-chain` / `l1-ref-validity` / `page-input` / `ask-auth-inflow` / `ask-bridge`） | P0 |
| FR-SELF-111 | 反证不空转（两段证伪） | P0 |
| FR-SELF-113 | `knownGap` 一致性机核 | P0 |
| FR-SELF-115 | 新门禁纳入 `gate-integrity` 受审集合（`CHROMIUM_GATES === 9` 不动） | P0 |
| FR-SELF-116 | 本叶面计数只增（各门禁 ≥ §9.5 基线） | P0 |
| FR-SELF-120 / 123 | 体积五要素（本叶增量）+ 红线逐字节复核（content / pick-layer / 判定链 / v3 台账 / `KIND_SET` 40 / 12 kind / 零宿主） | P0 |
| FR-SELF-130 | **S0 全链骨架**（①~⑧ 逐环节可判；fixture 沿用 `s2-chain.mjs` 形态） | P0 |
| FR-SELF-131 | **S0 分支 A 机制侧**（已配置 ⇒ 自动成回合续流）+ 分支 B **识别侧**（未配置 ⇒ 识别为终态 + 有驱动者；引导内容由 `v55-2`） | P0 |
| FR-SELF-132 | 「答案不被丢弃」三断言（命中 + 计数不足 + 无「无驱动者」窗口） | P0 |
| FR-SELF-133 | 「静默窗口 = 0」机核（窗口定义单源） | P0 |

---

## 5. 非功能需求（本叶相关）

| 父 NFR | 本叶关注点 | 验收锚点 |
|---|---|---|
| NFR-SELF-004 | **单源 + 机核**：四元组 / 七类时刻 / 时机源闭集 / `driverClass` / 驱动者终态词汇 —— 各**恰一处**声明 | 「声明恰一次」扫描 + 反证 |
| NFR-SELF-007 | 每条新 / 改判据**可 FAIL** 并声明 `expectFailPattern` | 反证留证（父 §16 第 6 条） |
| NFR-SELF-009 | **主题① 对照面**：本叶交付的「识别侧」**零 LLM 调用**（判据确定性） | 「零 provider 调用」断言 |
| NFR-SELF-010 | 可逆性 / 一致性：答案驱动的**幂等**（同因不重复驱动） | 同因重复注入 ⇒ 不重复驱动 |
| NFR-SELF-005 | `sidepanel.js` ≤ **577,089 B**；本叶 byte 变化走五要素重登记 | `test:size-budget` / `size-growth-evidence` |
| NFR-SELF-001 | 驱动者求值（纯谓词）+ 时机源扩张不得使首屏 / 滚动变差 | `journey` 相关断言 |
| NFR-SELF-006 | 兼容读取面（`#input` / `#send` / `#composer` 等）不破 | 兼容面逐 id 断言 |
| NFR-SELF-011 | 驱动者归因可读（driverId / timing / 依据）+ **零明文** | 归因可读断言 + `law8` 不减 |

---

## 6. 边界情况（本叶相关）

父 `EC-SELF-001~022` 全部适用；本叶执行时**重点验**：

| 父 EC | 本叶执行要点 |
|---|---|
| EC-SELF-001 | 重复 `driverId` ⇒ **拒绝 + loud 红显**（绝不静默覆盖） |
| EC-SELF-002 | 未知时机源 ⇒ 注册校验 loud 失败；不进活跃集 |
| EC-SELF-003 | 四元组缺元 / `when(ctx)` 越 `NEXT_SERVICES` ⇒ loud 失败 |
| EC-SELF-004 | `'answered'` 抖动 / 多次求值 ⇒ 受去重 + 10 s 防抖约束，**不弹第二条** |
| EC-SELF-005 | 「已答」歧义（取消 / 超时 / superseded / aborted）⇒ 走四口径；取消**不记已答** |
| EC-SELF-006 | 引用在驱动前失效（`ref.all-invalid`）⇒ **既有阻塞终态** + 可达 next（与终态词汇**不互斥**） |
| EC-SELF-007 | `op.describe` 空描述 ⇒ 卡内校验零副作用 + **不入终态** |
| EC-SELF-008 | 后台 ask 迟到作答 ⇒ 固化 + 可达 next；**不裸 `errorResponse`** |
| EC-SELF-020 | 保护段被波及（journey 第三次取代风险）⇒ **优先保段**；若必须改走八步 |

---

## 7. 验收锚点（本叶 → 父 AC）

| 父 AC | 本叶判定要点 |
|---|---|
| **AC-SELF-001** | **S0 全链机器化**（本叶交付骨架 + 分支 A + 分支 B 识别侧）：逐环节可判（①~⑧）+ 「答案不被丢弃 ∧ 静默窗口 = 0 ∧ 死端 = 0」+ 两段证伪 |
| **AC-SELF-002** | 驱动者层注册表化：集合 ≡ provider 集合 + 四元组 + **主流程 diff = 0** + 无第 8 个散落调用点 |
| **AC-SELF-003** | 法七扩展：终态词汇（正交单源）+ 7 类时刻逐类有驱动者 + 答案驱动化 + describe 补齐 + 后台 ask 非死端 + 双向反证 |
| **AC-SELF-004** | X-SELF-1（**未发生取代**如实登记）/ 2 / 4 / 5 / 6 五项等价重锚 + 台账条目 + 反证 |
| **AC-SELF-009** | 时机源扩张：含 `'answered'` + 旧 4 项逐字 + 求值入口恰一处 + 防抖常量逐字 + 映射表机核 |
| **AC-SELF-010** | 答案路径驱动化：`applyRefAction` 调用点恰一处 + 「有效 ⇒ 驱动」+ `commandSends` 登记 / 退役显式 |
| AC-SELF-011 | 旁路死端消除（本叶主责：describe + 后台 ask） |
| AC-SELF-015 | 驱动者声明单源 + 映射表（与 `v55-3` 共享：本叶交付表，`v55-3` 做门禁收口对账） |
| AC-SELF-016 | 本叶主责门禁等价重锚清单逐项 |
| AC-SELF-017 | 反证不空转（本叶每条新 / 改判据两段证据） |
| AC-SELF-020 | 本叶面计数只增（§9.5 逐项对账） |
| **AC-SELF-026** | **本叶收尾全门禁绿 + 计数只增基线**（含取代台账的**本叶面**登记恰一次） |

---

## 8. 交付与执行

### 8.1 上游依赖

无前置叶。上游只读复用：`next-registry/{definition,registry,providers,pipeline,dispatch,obligation-table}.ts`（契约 v2 + 4 规则 provider）；`ops.ts#IMPL`（9 op）；`sidepanel.ts` 的 `submitAskFor` / `applyRefAction` / `submitDescribe` / `maybeRecommend` / `RecommendTrigger` / `requestTurn`；`l1/ref-store.ts`（`dispatch` / `commandSends`）；`service-worker.ts` 的 `askBridge.settle`；`stream-model.ts`（12 kind / 6 终态 / `MAX_OPEN_ASKS` / `REF_ROUND_PREFIX`）；`test/ui/fixtures/s2-chain.mjs`（纯数据 + 注入式依赖的**先例形态**）。

### 8.2 下游 consumer

| 叶 | 依赖点 |
|---|---|
| `specs-tree-v55-2-deterministic-onboarding` | ① 驱动者终态词汇（「未配置」作为已表达意图之后的终态）② `'answered'` 时机 ③ 驱动者四元组 / `driverClass` ④ **悬置任务入口**（`applyRefAction` 驱动化产出的悬置对象是主题① 的续接目标） |
| `specs-tree-v55-3-ai-driven-orchestration` | ① 「候选恒由注册表产出」（本叶确立）② 驱动者集合 ≡ provider 集合（本叶确立）③ `'answered'` 时机（AI 主动的触发源之一）④ S0 骨架（收口时汇总人工面） |

### 8.3 交付物（本叶）

1. 驱动者四元组抽取 + 机核（新门禁）+ `driverClass` 单源 + `priority` 必填。
2. `RecommendTrigger` 扩张（含 `'answered'`）+ `ref-action` `when` 重锚 + 时机源闭集单源 + 时机源 × 驱动者映射表。
3. **驱动者终态词汇**单源（已答 ask 三型 / 已交描述；与 `STREAM_TERMINALS` 正交）+ 「必有下一个驱动者」判据。
4. `applyRefAction` 驱动化（调用点仍恰一处）+ `commandSends` 消费面登记（或退役登记）。
5. `submitDescribe` 驱动补齐（空描述零副作用、不入终态）。
6. 后台 ask 迟到作答路径（固化 + 可达 next）。
7. **S0 全链门禁**（node + Chromium 两面；骨架 + 分支 A + 分支 B 识别侧）+ fixture（沿用 `s2-chain.mjs` 形态）。
8. 本叶范围的门禁等价重锚 + 反证留证 + 取代台账（X-SELF-2 / 4 / 5 / 6 条目；X-SELF-1 登记「**未发生取代**」）。
9. 体积五要素（本叶增量）+ 红线逐字节复核。

### 8.4 叶内执行序（供 plan / tasks 参考，**不是需求**）

① 先定 **声明单源**（时机源闭集 / 驱动者终态词汇 / 七类时刻枚举 / `driverClass`）→ ② 再落 **四元组 + 机核**（先把「驱动权可判」做成机器证据）→ ③ 再落 **`'answered'` 时机 + `ref-action` 重锚**（**先证明答完之后会重跑**）→ ④ 再落 **终态词汇 + 「必有下一个驱动者」判据**（双向反证）→ ⑤ 再做 **`applyRefAction` 驱动化 + `commandSends` 登记**（两段证伪）→ ⑥ 再做 **`submitDescribe` 补齐 + 后台 ask 迟到路径** → ⑦ 最后做 **S0 全链**（骨架 → 分支 A → 分支 B 识别侧）+ 体积五要素 + 收尾全门禁。

---

## 9. 风险（本叶）

| # | 风险 | 等级 | 应对 |
|---|---|:--:|---|
| R-SELF-002 | **门禁取代面**：`requestTurn` 恰 2 / `RecommendTrigger` 4 项（本叶**先撞**这两个门禁） | 高 | FR-SELF-100 / 101 / 030~033（默认读法① diff = 0；X-SELF-1 如实登记「未发生取代」） |
| R-SELF-003 | **半驱动者堆积**：驱动者若落为散落调用点 ⇒ 第二份半驱动者 | 中高 | FR-SELF-010 / 015 / 019 / 033（集合 ≡ provider 集合 + 求值入口恰一处） |
| R-SELF-007 | **法七扩展判据真空**：「已答」口径未定 ⇒ 恒真断言 | 中高 | FR-SELF-023 / 024（四口径 + 双向反证 + 两段证伪） |
| R-SELF-008 | **`askBridge` 生命周期耦合**：后台 ask 结算依赖在飞回合 | 中 | FR-SELF-028（固化 + 可达 next；不伪造「接住」） |
| R-SELF-901 | 驱动者 ↔ 注册表漂移 | 中高 | FR-SELF-011 / 015（三类注入反证） |
| R-SELF-902 | 时机源扩张被实现为「第二个推荐器」 | 中高 | FR-SELF-033（求值入口恰一处定义） |
| R-SELF-903 | 「已答」判据恒真 | 中高 | FR-SELF-023（取消 / 空 / 迟到三类必不成立） |
| R-SELF-904 | 悬置任务成为第二条事实通路（双写） | 中高 | FR-SELF-045 的**本叶面**（悬置入口单源；双写由 `v55-2` 收口） |
| R-SELF-908 | S0 被写成「脚本绿」而非「链路可判」 | 中高 | FR-SELF-130~133（逐环节可判 + 两段证伪） |
| R-SELF-006 | 体积越限（本叶余量 27,480 B） | 中高 | FR-SELF-120 / 124（本叶增量登记 + 预算评估） |

---

## 10. 开放问题（本叶相关）

父 §8 的 O-SELF-001~007 **全部已裁决**；本叶直接相关：**O-SELF-003**（驱动者注册表化，DC-SELF-003）、**O-SELF-005**（两门禁取代方式 = 优先注册表内扩张，DC-SELF-005）。**无遗留未决项**。

> **本叶特有的具体策略选择（已由父规范限定边界，plan 可直接选定）**：① `ref-action` 抑制的两种读法（时机侧解决 vs `when` 侧重锚，父 FR-SELF-031 已限定"答完后恰在一次 `'answered'` 求值内产出 next"）② `commandSends` 保留登记 vs 退役（父 FR-SELF-026 已限定"二选一显式，无第三态"）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V5.5-1 叶子规范：驱动者层 + 法七扩展底座 + 时机源扩张 + 答案驱动化 + S0 全链机器化；承载父 §5.2 / §5.3 / §5.4 / X-SELF-1·2·4·5·6 / §5.10 / §5.12 / §13 / §9.1~9.3 共 40 条 FR 的实施切片；**首叶 / P0 / 依赖链起点**） | 2026-09-22 | SDDU Spec Agent |
