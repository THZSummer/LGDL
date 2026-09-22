# 技术计划：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案（**父 / 跨切契约与索引**）—— 记录跨切架构、总体方案取舍、聚合文件影响、红线继承、体积预算与实施波次，以及 **12 条 ADR 的索引**（正文见本目录 `ADR-V55-001~012-*.md`），作为 3 叶实施、审查与收口的单一参照
> **前置依赖**: 本目录 `spec.md` v1.0（**95 FR / 14 NFR / 22 EC / 26 AC / 22 NG / 10 US / 8 G**；O-SELF-001~007 全 `ruled`；§12 X-SELF-1~7 等价重写映射；§13 N-SELF-001~026 红线；§14 3 叶拆分）+ `discovery.md` v1.0（Q-SELF-001~015 / A-SELF-001~010 / R-SELF-001~012 / O-SELF-001~007 / §7.1 基线 A~E 全量 `file:line`）+ 3 叶 `spec.md` v1.0 + 唯一直接上游 `specs-tree-web-cli-plugin-v5-all-in-next/plan.md` + `ADR-V5-001~012`（**v5 全链 `validated`，零改写**）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（父 `plan.md` + 3 叶 `plan.md` + **ADR-V55-001~012 正文**同批产出：驱动者注册表形态 / `'answered'` 时机源与 `ref-action` 时机侧重锚 / 驱动者终态词汇（法七扩展）/ 答案驱动化与悬置任务 / S0 全链机器化 / 配置探测判据与 `runChat` 前置判据 / 确定性引导流与配置完成自动续接 / op 三档清分单源形态 / 护栏三件套与关断否决 / 并发仲裁 / 体积预算与档位跨越登记 / 取代台账与每叶验收门禁清单。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP，不改 v1~v5 SDDU 目录，不动 `main`，**不跑门禁 / 构建 / Chromium**，**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | 本目录 `spec.md`（853 行，v1.0，2026-09-22，phase=specified） |
| 3 叶 `spec.md` 存在 | ✅ | `specs-tree-v55-1-driver-layer/spec.md`（273 行）/ `specs-tree-v55-2-deterministic-onboarding/spec.md`（258 行）/ `specs-tree-v55-3-ai-driven-orchestration/spec.md`（284 行），均 v1.0 |
| 叶数量与结构 | ✅ | 3 叶（`leaf:true` / `depth:2` / `deliveryOrder` 1..3 / `dependsOn` 链式 `v55-1 → v55-2 → v55-3`）；父 `depth=1` 轻量规范容器 |
| 外部 API 文档缓存 | ✅ N/A | 零外部 API / 零新依赖 / 零新权限（`manifest.json` **零 diff**，连 `optional_permissions` 也不新增，NG-SELF-005）；无 `/sddu:api-docs` 需求 |
| 参数化模板 | ✅ | `.opencode/plugins/sddu/templates/output/sddu-plan.md.hbs`（79 行；**无**用户级覆盖 `.sddu/templates/agents/output/sddu-plan.md.hbs`） |
| 上游先例 | ✅ | v5 `plan.md`（父 + 3 叶 + ADR-V5-001~012，本 Feature 沿用「ADR 正文独立成文件」落法：agent 模板 §5.7） |
| 分支 / HEAD / 工作区 | ✅ | `feature/web-cli-plugin` / `b075c01`（F-33 spec 产物）/ `git status --short` 空；`origin` 落后 2（F-33 discovery + spec 未推送，本提交一并推送） |
| 保护 pin（**本轮只读复算命中**） | ✅ | journey `startByte 43054` / `endByte 58287` / sha `cc79f413…` **双绿**；binding `startByte 107780` / `endByte 115930` / sha `be9ad0e9…` **双绿**（口径 = `supersession-ledger.test.ts#protectedPinFailures`：锚点切片 sha + 两侧字节偏移，见 ADR-V55-012 §4） |
| 红线现值（**本轮只读实测**） | ✅ | `dist/content.js` **177,076 B** / `52a82620…`；`dist/pick-layer.js` **34,358 B** / `77796bab…`；`dist/sidepanel.js` **549,609 B**（生效上限 577,089 / 余量 27,480 / 档位 563,200 / 绝对上限 619,520）；`KIND_SET` **40 项逐字**；`REGISTERED_STRUCTURAL_HOSTS === []` |
| 写入范围 | ✅ | 仅本 Feature SDDU 目录（父 + 3 叶 `plan.md` / 12 ADR / `state.json` / `TREE.md`）；**未跑任何门禁 / 构建 / Chromium** |

### 1.1 偏差登记（父 `plan.md` 的产出 vs 父 spec 的「轻量规范容器」定位）

父 `spec.md` §14.1 明定父 Feature = 轻量规范容器（不承接 build/review/validate，不产出 `tasks.json`）。本阶段按编排器任务书产出**父 + 3 叶两份层级的 `plan.md`**，与 v4 / v4.5 / v5 先例同口径**显式登记**：

| 项 | 内容 |
|---|---|
| 偏差 | 父产出 `plan.md`（spec §14.1 未列出父 `plan.md`） |
| 理由 | 跨切契约（红线继承 N-SELF-001~026 / 不动面 / 取代台账 / 体积预算与档位策略 / 波次 / 门禁集合 / ADR 编号）需要**单点定义**，否则 3 叶与收口各持一套口径 |
| 容器内核仍遵守 | 父**不产出** `tasks.md` / `tasks.json`；父**不承接** build/review/validate；实施全部由 3 叶承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变 |
| 引用方式 | 叶对父的引用 = 「父 FR/AC + `ADR-V55-0xx` 编号」，不依赖父 `plan.md` 的物理存在性 ⇒ 本文件可整篇作废而不牵连叶 |
| 不消耗 ADR 编号 | `ADR-V55-001~012` 已由编排器任务书逐项指派；本偏差不另占编号 |

### 1.2 本阶段的两条硬性约束（**先写结论**）

| 约束 | 结论 | 依据 |
|---|---|---|
| **体积** | Σ 三叶预算 **17,800 B** ⇒ ×1.15 = **20,470 B ≤ 27,480 B** ✅；**上界情形** Σ 22,900 B ⇒ ×1.15 = **26,335 B ≤ 27,480 B** ✅（余量 1,145 B）。**可行，不触发停机上报**（§7.4 / ADR-V55-011） | 生效上限 577,089（§1） |
| **档位** | 三叶**累计投影** 549,609 → 556,609 → 561,509 → **567,409 B** ⇒ **v55-3 收口轮预计跨过现行档位 563,200 B（约 +4,209 B）** ⇒ 走**显式升档登记**（`ceilTo50KB(567,409) = 614,400` / 绝对上限 `×1.10 = 675,840`），`authorConfirmation` 保持 **`pending-author-line`**，**不得伪称已确认**。**不静默**（EC-SELF-019 / FR-SELF-122 / ADR-V55-011 §4） | 档位 563,200 / 距档位 13,591 |

> 口径：`sidepanel.js` 是**唯一**带字节预算的产物；`background.js`（SW bundle）/ `options.js` / `test/**`（门禁与 fixtures）**不计入**该账本（v5 先例逐字：「落在 **service-worker** 产物（不在本 bundle，故不计入）」）。本 Feature 的**大部分工作量**（S0 双面门禁 / 6 个新门禁 / fixtures / 台账 / 文档）**零字节**，这是体积可行的结构性原因。

---

## 2. 架构分析

### 2.1 问题定性（题眼）

v5（F-32）已把「下一步**是什么**」做成管线强制保证（`BLOCKED_TERMINALS` 恰 5 + 死端守护门禁 + S2 十环节全链）；但「下一步**由谁按**」**仍然是用户**：

1. **唯一回合发起入口** = `requestTurn`（`sidepanel.ts:277-297`），调用点被 `test/op-wiring.test.ts#requestTurnProblems` 钉死**恰 2 处**（`:3232` composer / `:3256` `bindPanelOps.turn`）。
2. **推荐器求值时机** = **恰 4 项闭集**（`sidepanel.ts:1791`：`'pick'|'stale'|'idle'|'firstRun'`），**无 `'answered'`** ⇒ **答完之后推荐器永不重新求值**；本该接手的 `ref-action` provider 又被 `when: … && ctx.session.openAsks === 0`（`providers.ts:136-148`）硬抑制 ⇒ 真机会话 B（22:49）「答完『原地翻译为中文』后彻底静默」；会话 A（20:15）「答两遍 + 手动重打」证明断层早已存在。
3. **答案物理上被丢弃**：`submitAskFor`（`:2557-2588`）对 `ref-round-<refId>` 走 `applyRefAction`（`:2177-2189`）→ `ref-store.dispatch`（`l1/ref-store.ts:280-291`）通过有效性后**唯一副作用 `sends += 1`**（`:290`）；`commandSends` **零驱动语义消费者**（COR-1 订正口径：1 处只读投影 + 3 处测试消费者）。
4. **旁路死端与迟到答案**：`submitDescribe`（`:2541-2546`）只 `dispatch` 从不驱动；后台 ask 在回合结束后到达 ⇒ `askBridge.settle` 返回 `false` ⇒ 裸 `errorResponse`（`service-worker.ts:2813-2822`）。
5. **LLM 缺席无载体**：`runChat`（`service-worker.ts:878-941`）**无配置门禁**（`:893` `s.keys.load()` 后直落 `providerChat`）；未配置时表现为 **LLM 错误事件**（`:920-921`）→ idle 推荐（被动撞墙）；`llm.unconfigured` 阻塞事实**只在 op 分支被动写入**（`sidepanel.ts:1290-1302`）。
6. **AI 驱动权止于回合内**：AI 不能启动回合（作者主题② 在架构上不可达）；且「AI 可主动发起哪些 op」**当前零清单**；`chatBusy` 单飞（`service-worker.ts:879-885`）对并发第二条**直接丢弃 + 回错误**；主动性一旦成立会引入 **token 成本 / 主动跨轮 / 自触发环** 三个新面而**当前零判据**。

**v5.5 的题眼** = **把「驱动权」从用户侧转移到系统 / AI 侧**；而这条转移之所以能长期成立，靠的不是多加几个 `maybeRecommend(...)` 调用点，而是**把「驱动者」收进注册表**（新增驱动者 = 声明一个时机源 + 一个 `when(ctx)` 谓词 + 自带测试，**主流程 diff = 0**）。

### 2.2 目标架构（跨切）

```
packages/web-cli-plugin/src/
├── llm/status.ts                        ←【改】**配置探测判据**（+`isLlmConfigured` 纯函数，双侧可导入；零 LLM / 零网络）
├── shared/op-table.ts                   ←【改】9 行描述符增 `tier`（派生式，见 ADR-V55-008）+ `tierOf()`
├── ui/sidepanel/
│   ├── next-registry/
│   │   ├── definition.ts                ←【改】`NextCtx` **加法式**扩字段（见 §2.3 口径）+ 类型 re-export（零语义改写）
│   │   ├── drivers.ts                   ←【新】**驱动者声明单源**：时机源闭集(5) / 七类时刻(7) / `driverClass` / 四元组抽取 / 去重键 / 时机→驱动者映射
│   │   ├── terminals.ts                 ←【新】**驱动者终态词汇单源**（4：三型已答 + 已交描述；与 `STREAM_TERMINALS` 6 正交）
│   │   ├── guard.ts                     ←【新】护栏三件套常量 + 链深度/去重/静默期/冷却状态 + 关断偏好读取（单源）
│   │   ├── ai-drive.ts                  ←【新】主动性**按下策略**（`auto` 档唯一自动按下点 + 留痕三要素 + `pressCandidate` 单源）
│   │   ├── suspension.ts                ←【新】**悬置任务单源**（登记 / 有效性重校验 / 续接）
│   │   ├── onboarding-flow.ts           ←【新】**确定性引导流**（步骤集合单源 4 步 + 文案 + `op.llm-config` op-direct chip）
│   │   ├── providers.ts                 ←【改】`ref-action` 时机声明 + 驱动者行注释（`when` **逐字不动**）
│   │   └── ops.ts / pipeline.ts         ←【改】`reachableNext` → `nextAfterSettle`（**同一闭合，零新增 `maybeRecommend(` 调用点**）
│   ├── recommend.ts                     ←【改】`RecommendTrigger` 类型**移出**（re-export 自 `drivers.ts`，单源）
│   ├── sidepanel.ts                     ←【改】`nextAfterSettle` 单入口 / 答案驱动化 / describe 补齐 / 引导 + 续接 / 仲裁续传 / 否决
│   └── settings/panel.ts                ←【改】主动性开关（既有分区内，**零新增分区 / 零新增必需 id**）
└── background/
    ├── service-worker.ts                ←【改】`runChat` **前置配置判据**（SW bundle，**零 sidepanel 字节**）+ `chatBusy` **有界仲裁队列** + `askBridge` 迟到答案固化
    └── messaging.ts                     ←【改】union **type-only**（`KIND_SET` **40 项逐字不动**）；`chat-result` 增 payload `variant`（**不进 `KIND_SET`**）
```

**六条结构性不变量**（本 Feature 的验收骨架，ADR 逐条落地）：

| # | 不变量 | 判据 | 承载 ADR |
|:-:|---|---|---|
| I1 | **驱动权可判** | 驱动者集合 ≡ 注册表 provider 集合（**双向包含**）；每驱动者四元组（`driverId`/`timing`/`evidence`/`ops`）可机核；七类时刻**逐类** ≥1 驱动者 | ADR-V55-001 |
| I2 | **答案必产生驱动** | `applyRefAction` 的**有效**分支必产生可判驱动；「`sends` 递增」**不足以**通过；describe / 迟到后台 ask 各有可达 next；**双向注入必红** | ADR-V55-003 / 004 |
| I3 | **主流程 diff = 0** | `requestTurn(` **仍恰 2**；`maybeRecommend(` **定义 1 / 调用点 7 不增**；`nextAfterSettle(` 定义 1；集 B per-op 分支 0；`op.execute(` 恰 1 | ADR-V55-001 |
| I4 | **档位清分终局** | 9 op 逐 op **恰一档** 且派生自既有 `layer`/`consent`（5/2/2）；特权恒 `gesture`；新 op 未归档 ⇒ **FAIL** | ADR-V55-008 |
| I5 | **护栏不可静默取消** | 六项（频次 / 同因 / 静默 / 冷却 / 链深度 / 回合预算）**各单源 + 越限被抑制 + 可关断**；未落地须显式登记 | ADR-V55-009 |
| I6 | **载体零新增** | 12 kind 逐字 / `REGISTERED_STRUCTURAL_HOSTS === []` / `KIND_SET` 40 逐字 / `content.js` 177,076 / `pick-layer.js` 34,358 | ADR-V55-009 / 011 / 012 |

### 2.3 数据流与依赖（跨切）

| 面 | 变更方向 | 关键契约 |
|---|---|---|
| 时机源 | 4 项闭集 → **5 项**（`+'answered'`，旧 4 **逐字保留**） | 单源 = `drivers.ts#DRIVER_TIMINGS`；`sidepanel.ts` re-export（**零第二声明**）；求值入口**仍恰 1** |
| 驱动者 | 注册表 provider 集合 → **+ 驱动者声明表**（`id → {driverClass, timings, moments, priority}`） | 双向包含机核（`listProviders()` ↔ `DRIVERS` 键集）；`when(ctx)` **零改写** |
| 答案 | `applyRefAction` = 裁决 + 计数 → **裁决 + 驱动** | 调用点**仍恰 1**；答案交 `nextAfterSettle({kind:'answered', terminal})` + 悬置任务登记（恰 1 处） |
| describe | 只 `dispatch` → `dispatch` + **驱动** | 空描述 ⇒ 卡内校验、零副作用、**不入终态**（逐字保留） |
| 回合入口 | AI/系统**不得**新增调用点 → 经**既有** `op.turn` 槽 | 自动按下 = `pressCandidate('op.turn', text, {by})` → `dispatchChipAction` → `runOp` → `PANEL.turn` → `requestTurn`（**计数不变**） |
| 并发 | `chatBusy` 丢弃 → **可判仲裁**（有界队列 1 + 留痕 + 草稿保存） | 用户输入**永不静默丢失**；仲裁结果 ∈ 闭集 4 项；AI 主动撞车 ⇒ **不发起 + 留痕**（不入队） |
| LLM 缺席 | 「被观测」→ **双源并存**（被动保留 + 主动识别） | SW 前置判据先于 `providerChat`；`chat-result` payload `variant:'llm-unconfigured'`（**非** LLM 错误事件） |
| 配置面 | 唯一执行体 = 既有 `op.llm-config` | 凭据写入 sink 恰 1（继承法八机核）；设置页保留管理面但**同调 op** |
| 主动性 | 零判据 → **三档清分 + 护栏三件套 + 可关断** | `tier` 派生自既有描述符；新 op 归档机核；本 Feature **零新增 op**（10th op 会破 5/2/2，故否决，见 ADR-V55-008 §4） |
| 载体 | 复用 12 kind | 留痕 = 既有 `system` 行（净化）+ 既有 `nextstep` 卡；**零 `[data-host]`** |
| 体积 | 余量 27,480 B → **预算表 + 档位跨越显式预案** | 五要素重登记；`cap` 保持 `record-only` |

**`NextCtx` 扩字段的边界口径（本计划的两条硬规则，供机核）**：

1. **只允许加法**：`NextCtx` 既有 7 键**一个不改名 / 不删**；新增键必须①由**既有** `NEXT_SERVICES` 6 项服务面派生（`when` 仍只读既有 state），②在 `drivers.ts#CTX_FIELD_SERVICE`（**单一映射表**）中登记 `字段 → 服务`，③由注册校验 loud 拦截未登记字段（EC-SELF-003）。本 Feature 实际只加 **1 个**字段组：`session.proactive`（`{ enabled: boolean; allowed: boolean }`，来源 = 持久偏好 + 护栏状态，属既有 `session` 服务面）。
2. **候选与按下分离**：候选**恒**由注册表 `when(ctx)` 产出（v5 契约 v2 语义不变）；「是否自动按下」是**按下策略**（`ai-drive.ts`），**不产出候选**（零第二份半驱动者）。

### 2.4 六条设计任务的定案（编排器任务书 1~6 的正面回答）

> 完整论证见对应 ADR；此处给出**结论 + 判据锚**，供 tasks 阶段直接引用。

| # | 任务 | **定案** | 判据锚 |
|:-:|---|---|---|
| 1 | **驱动者注册表化** | 驱动者 = **注册表 provider + `drivers.ts` 声明行**（表驱动，**不扩 v5 契约接口**）；`driverClass` 决定「候选可否被自动按下」；**主流程 diff = 0**：`requestTurn(` 仍 2 / `maybeRecommend(` 定义 1 调用点 7 / `nextAfterSettle(` 定义 1 / 集 B per-op 分支 0；X-SELF-1 **未发生取代**（如实登记） | ADR-V55-001 |
| 2 | **主题① 确定性系统流** | 配置判据 = `isLlmConfigured`（**3 字段**：`hasKey ∧ providerId ∈ PROVIDERS ∧ model 非空`，后二者由 key-store 读归一化**结构性保证**）⇒ 实质等价 `hasKey`，**零 LLM / 零网络 / 全函数**；「意图需要 LLM」判据 = `runChat` 前置（SW bundle，**零 sidepanel 字节**）；悬置任务 = `suspension.ts` **单源 + MAX=1 + 有效期重校验**，`op.llm-config` 成功回执后**自动续接**（复用 S2「阻塞解除 → 自动恢复」范式）；配置执行体**恒**既有 `op.llm-config`（op-direct chip，**零新执行面**） | ADR-V55-006 / 007 |
| 3 | **主题② AI 驱动** | 自动成回合的载体 = **`op.turn` 槽复用**（`pressCandidate` → `dispatchChipAction` → `runOp` → `PANEL.turn` → `requestTurn`）⇒ **零新增 `requestTurn` 调用点**；`auto` 档自动按下点**恰 1 处**；`confirm`/`gesture` 档**不可自动按下**（consent 卡**只能用户作答**）；**并发仲裁 = 有界队列 1 + 明确告知 + 草稿恢复**（用户输入零丢失 / 留痕 / 有界） | ADR-V55-010 |
| 4 | **护栏三件套常量** | 单源 `guard.ts`：频次 `6/10min`（滚动窗）/ 同因不重复（`driverId + ctx 摘要`）/ 静默期 `60 s` / 冷却 `= NEXTSTEP_MIN_INTERVAL_MS`（**re-export，零新字面量**）/ 链深度 `2` / 回合预算 `8`（**等价口径 = 主动回合数**，非 token 计数，口径缺口显式登记）；越限 ⇒ **抑制 + 留痕**；关断 = **本 Feature 唯一新增持久偏好**（默认 **ON**，显式登记） | ADR-V55-009 |
| 5 | **法七扩展** | `STREAM_TERMINALS` 6 **逐字不动**；新增**正交** `DRIVER_TERMINALS` 4（`answered-ref` / `answered-op` / `answered-bg` / `describe-submitted`）；「必有下一个驱动者」= N=0 同屏可达；**禁恒真断言** = 每条判据**三段控制**（正常绿 / 端态存在但驱动者被移除 ⇒ 必红 / 端态不存在 ⇒ 不要求） | ADR-V55-003 |
| 6 | **op 三档清分表** | **派生式单源**：`tierOf(d) = d.layer === 'sw' ? 'gesture' : (d.consent ? 'confirm' : 'auto')` ⇒ **自动得 5/2/2**（9 = 5 + 2 + 2），**无第二份手写清单 ⇒ 漂移不可能**；与 `IMPL` 的 `risk`/`consent`/`layer` 一致性 = 逐字段机核；新 op 未归档 ⇒ **FAIL** | ADR-V55-008 |

### 2.5 X-SELF-1~7 逐条处置（**显式取代台账的规约**）

| # | 现状红线 | 处置 | 落地 | 台账动作 |
|---|---|---|---|---|
| **X-SELF-1** | `requestTurn(` 恰 2 处 | **读法①，未发生取代**（AI 经既有 `op.turn` 槽）⇒ **判据一字不改** | `test/op-wiring.test.ts`（`callSites: 2` + `requestTurnProblems`） | **无条目**（如实登记「未发生取代」，不留空） |
| **X-SELF-2** | `RecommendTrigger` 恰 4 项；`ref-action` `openAsks===0` 硬抑制 | **取代 = 等价重锚（读法①：时机侧解决）**：值集 4→5（含 `'answered'`）且旧 4 逐字；`ref-action` 的 `when` **不写一个字**（答完 ⇒ 结算已在同一次 dispatch 内完成 ⇒ `openAsks===0` 自然成立 ⇒ 恰在一次 `'answered'` 求值内产出 next） | `test/recommendation-sources.test.ts`（+时机集断言）/ `test/ui/recommendation.mjs`（+answered 面，计数增）/ 新 `test/driver-timings.test.ts` | `modifiedRanges[]`（`sidepanel.ts:1791` 类型外移 + `providers.ts` 注释级）+ 计数只增 |
| **X-SELF-3** | `llm.unconfigured` **仅被观测** | **取代 = 双源并存（不取代被动路径）**：SW 新增确定性主动识别（前置判据）⇒ 同一 `llm.unconfigured` 终态词汇（fold 进既有 `risk` 源）；`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER`（按终态键控）**逐条不变** | `test/ask-auth-inflow.mjs`（≥71 增）/ `test/blocked-terminals.test.ts`（9 不减）/ 新主题① 场景门禁 | `modifiedRanges[]` + 主题① 门禁计数对账 |
| **X-SELF-4** | 死端判据只判 5 类阻塞 | **取代 = 终态枚举扩张（不是改布尔值）**：`BLOCKED_TERMINALS` 5 **逐字不动**；新 `DRIVER_TERMINALS` 4（正交）；判据从「5 类」升为「5 类阻塞 **∧** 4 类已表达意图」 | `test/ui/no-dead-end.mjs`（39 → 增）/ `test/blocked-terminals.test.ts` / 新 `test/driver-terminals.test.ts` | `modifiedRanges[]` + `test:dead-end` 计数对账 |
| **X-SELF-5** | `applyRefAction` 唯一副作用 = `sends += 1` | **取代 = 语义重定义（裁决 + 驱动）**；`commandSends` **保留 + 显式登记消费面**（COR-1：1 处只读投影 + 3 处测试、**零驱动语义消费者**）⇒ **零删除** | `test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` / `test/ui/page-input.mjs`（108 不减） | `modifiedRanges[]` + l1 / page-input 计数对账 |
| **X-SELF-6** | `submitDescribe` 只 dispatch | **取代 = 补齐驱动**；空描述「卡内校验零副作用 + 不入终态」逐字保留 | `test/ui/ask-auth-inflow.mjs`（增）/ 新终态词汇门禁 | `modifiedRanges[]` + `test:ask-auth` 计数对账 |
| **X-SELF-7** | `chatBusy` 丢弃第二条 | **取代 = 丢弃语义 → 可判仲裁**；单飞本身（同一时刻一个在飞回合）**保留** | `test/ui/journey.mjs`（171 保段优先 / 计数增）+ 新仲裁门禁 | `modifiedRanges[]` + journey 计数对账 |

> **落地纪律**（逐条强制，FR-SELF-107）：① 无「放宽阈值 / 删除断言 / 静默改常量 / 静默替换冻结对象」；② 每项 ≥1 注入反证（注入 ⇒ 实跑 FAIL ⇒ **逐字节还原**（sha256 前后相同）⇒ PASS）；③ 判据力可逐条对账；④ **未发生取代者（X-SELF-1）如实登记**，不留空。

### 2.6 红线继承表（**N-SELF-001~026 逐条**）

| # | 红线（逐字要点） | 继承动作 | 承载 ADR | 验收锚点 |
|:-:|---|---|---|---|
| N-SELF-001 | `content.js` **177,076 B** / `52a82620…`（零容差） | **不动**（零 `src/content/**` 改动） | V55-012 | AC-SELF-022 |
| N-SELF-002 | `pick-layer.js` **34,358 B** / `77796bab…`（零容差；R4 已解冻重登记） | **不动** | V55-012 | AC-SELF-022 |
| N-SELF-003 | `sidepanel.js ≤ 577,089`（`floor(549,609×1.05)`）；容差 5% 未动；cap `record-only` | **预算前移**（ADR-V55-011） | V55-011 | AC-SELF-023 |
| N-SELF-004 | V3-VOL-3 三值（档位 563,200 / 绝对 619,520 / `newBaselineBytes` 同源前移）；`authorConfirmation` 不得伪称已确认 | **保持 + 跨档位显式升档预案** | V55-011 | AC-SELF-023 |
| N-SELF-005 | 特权 op **恰 2** 恒手势（`op.authorize`/`op.perm.request`，`layer:'sw'`）；「SW 永不 `.request(`」 | **逐字保留**（三档清分只**加固**） | V55-008 | AC-SELF-005 |
| N-SELF-006 | 判定链零触碰（`policy.ts`/`auto-authorize.ts`，`zeroDiffFiles` 9 项） | **不动** | V55-012 | AC-SELF-022 |
| N-SELF-007 | 安装期静态面零变化（静态 5 / host 6 / 无 `all_urls` / `minimum_chrome_version 116`） | **逐字不动**（连 `optional_permissions` 也不新增） | V55-012 | AC-SELF-022 |
| N-SELF-008 | `KIND_SET` **40 项逐字不增**；新消息族走 type-only | **逐字不动**（`chat-result` 只加 payload `variant`） | V55-010 | AC-SELF-006 |
| N-SELF-009 | 12 kind 契约不动；零宿主（`REGISTERED_STRUCTURAL_HOSTS === []`） | **逐字不动**（载体全复用） | V55-009 | AC-SELF-006 |
| N-SELF-010 | 法八四面零明文不退化（payload/digest/审计/DOM 全属性） | **不退化**（留痕三要素**零明文**） | V55-003 / 010 | AC-SELF-012 |
| N-SELF-011 | 断言零删除零降级、计数只增（唯一例外 = 保护段显式取代） | **逐字遵守** | V55-012 | AC-SELF-016/020 |
| N-SELF-012 | 保护 pin：journey `43054..58287`/`cc79f413…`；binding `107780..115930`/`be9ad0e9…` | **保段优先**（本轮复算双绿） | V55-012 | AC-SELF-018 |
| N-SELF-013 | 门禁严格串行（一次一个 Chromium，`finally` 自清 profile）；`CHROMIUM_GATES === 9` 不动 | **逐字遵守** | V55-012 | AC-SELF-021 |
| N-SELF-014 | 不碰 `main` / 不 force push / path-limited `git add` / 无新依赖 / 不合 main 不发布 | **逐字遵守** | V55-012 | §8 |
| N-SELF-015 | `F-29`（A2A）区段一字不动 / 字节相等 | **不动** | V55-012 | §8 |
| N-SELF-016 | v5 产物零改写（父 + 三叶 `validated` 终态 / pin / 台账 / state 零触碰） | **不动** | V55-012 | AC-SELF-026 |
| N-SELF-017 | `KL-N-10` 处置纪律（隔离复跑 ≥2、日志全量、仍红如实登记不阻塞收口） | **逐字遵守** | V55-012 | AC-SELF-021 |
| N-SELF-018 | 取代台账 `knownGap` 一致性（`complete-steps-1-8` ⇒ 空或仅声明闭环） | **逐字遵守** | V55-012 | AC-SELF-019 |
| N-SELF-019 | 法七不退化（5 类阻塞必有可达 next，死端 = 0） | **只扩张不削弱** | V55-003 | AC-SELF-003/022 |
| N-SELF-020 | 开放点不得在 spec 前被顺手定下 | spec 已全裁决；plan 只在其边界内选策略 | 全部 | §5 遗留策略表 |
| K-N-SELF-021 | 特权 op 恒 `gesture`（AI 不可发起、不可代答 consent） | **固化在派生式清分**（`layer==='sw' ⇒ gesture`，改写即红） | V55-008 | AC-SELF-005 |
| N-SELF-022 | 驱动者集合 ≡ 注册表 provider 集合；驱动者不得自带调用点 | **双向包含机核 + 调用点不增** | V55-001 | AC-SELF-002 |
| N-SELF-023 | 「答案必产生驱动」：不得以计数 / 留痕 / dispatch 为唯一副作用 | **I2 不变量** | V55-004 | AC-SELF-003/010/011 |
| N-SELF-024 | 主题① **零 LLM 调用 / 零 token** | **判据落 SW 前置 + 引导流全数据化** | V55-006/007 | AC-SELF-007 |
| N-SELF-025 | AI 主动不得改档 / 不得新增真值源 / 不得新增静态权限 | **派生式清分 + 加法式 ctx（登记映射）+ 零权限** | V55-008/009 | AC-SELF-005 |
| N-SELF-026 | 护栏不可静默取消（未落地须显式登记） | **六项单源 + 越限抑制 + 未落地登记二态** | V55-009 | AC-SELF-006 |

### 2.7 明确「不动面」清单（**逐项**）

| # | 不动面 | 守线方式 |
|:-:|---|---|
| T1 | `src/content/**` / `dist/content.js` / `dist/pick-layer.js` | 零改动（`git diff` 零行）；新消息只加 `chat-result` payload 键 |
| T2 | `KIND_SET` 集合字面量（`messaging.ts:111-153`，**40 项**） | 逐字零新增（payload `variant` **不是 kind**）；union 类型扩成员 = 运行时零字节 |
| T3 | 判定链（`policy.ts` / `auto-authorize.ts`） | 内容哈希 pin 不动（`zeroDiffFiles` 9 项） |
| T4 | `manifest.json` | **零 diff**（权限面零变化） |
| T5 | `docs/v3-supersession-ledger.json` | 零 diff（冻结历史，不得解冻） |
| T6 | 12 kind / `BORN_FROZEN_KINDS` / `STREAM_TERMINALS` 6 / `MAX_OPEN_ASKS=2` / `ASK_CANCEL_REASONS` 4 / `REF_ROUND_PREFIX` | 逐字不动（`DRIVER_TERMINALS` **另立单源**，不改既有常量） |
| T7 | 三区法则（工具栏 ≤5 可点 / 流 = 唯一交互面 / 状态栏永不折叠） | 逐字不动（主动性载体全在流内既有面） |
| T8 | `F-29` ROADMAP 区段 / `ROADMAP.md` 全文件 | 零 diff（F-33 / v0.11.0 登记留收口） |
| T9 | `packages/web-cli-base/**` | 零改动 |
| T10 | `design/**`（F 双 + G 双 sha） | 零改动（若确需改，须走设计稿五件套，且不得替换 F） |
| T11 | v5 的 9 op 清单 / `OPS_BY_ID` 键集 / `MOUNT_MODE` / `NEXT_SERVICES` 6 / `NEXT_MODES` 2 | **零新增 op / 零新增服务 / 零新增模式**（tier 是既有字段的派生） |
| T12 | v5 已建 8 个新门禁 + 既有门禁 | 只允许**追加**与**等价重锚**（`V55_NEW_GATE_FILES` 下界只增；`CHROMIUM_GATES === 9` 不动） |

---

## 3. 方案对比

> 12 条 ADR 各自的「选项 / 裁决 / 后果」见 `ADR-V55-001~012-*.md`。此处只做**总体方案**的取舍对比。

| 维度 | **方案 A：注册表内等价扩张 + 三层承接（推荐）** | 方案 B：新增「主动性层」+ 新回合入口 | 方案 C：只修 ask 答案路径（最小修复） |
|---|---|---|---|
| 描述 | 驱动者 = 注册表 provider + 声明表；时机源 4→5；答案驱动化；SW 前置判据；三档清分派生；护栏单源；S0 双分支机器化 | 新增 `proactive/` 层与**第二个回合入口**（`requestTurn` 计数放宽为「具名入口集」）；主动性独立调度器 | 只把 `applyRefAction` 接到 `op.turn`；不扩时机源、不做主题①② |
| 优点 | 主流程 **diff = 0 可机核**（I3）；零新 op / 零新 kind / 零新权限；体积 Σ 17,800 B 可控；S0 与 v5 之 S2 同地位 | 概念边界最直观；主动性可独立演进 | 改动最小、风险最低；1 叶即可交付 |
| 缺点 | 需 5 个门禁等价重锚 + 声明单源机核（**工作量集中在判据**） | **破 X-SELF-1**（`requestTurn` 计数放宽）⇒ 治理价值降一个量级；第二份半驱动者风险（NG-SELF-018）；新层 = 新真值源风险 | **作者主题①② 未交付**；`RecommendTrigger` 恰 4 项未动 ⇒ 「答完静默」仍可能复现；G-SELF-003/004 无承载 |
| 风险 | R-SELF-002/003/007 + 体积（V55-011 已量化） | R-SELF-001（安全边界）/ R-SELF-003（半驱动者）+ N-SELF-022 破 | 主题级需求落空（本 Feature 立项原因未解决） |
| 工作量 | 3 叶 / ~14 波 / ~52 任务（串行） | 4 叶 / ~20 波（**越界**：新增层需新门禁与台账面） | 1 叶 / ~5 波，**不达标** |

## 4. 推荐方案

**推荐：方案 A**。

**理由**：

1. **唯一能机核「扩张性」的形态**：只有「注册表内等价扩张」才能让「新增驱动者 = 声明 + 谓词 + 测试，主流程 diff = 0」成为**静态事实**（I3 / AC-SELF-002 / N-SELF-022）；方案 B 一旦放宽 `requestTurn` 计数，「唯一回合入口」的治理价值即被削掉一个量级（X-SELF-1 只作**兜底**读法）。
2. **作者两条主题都在既有面内可交付**：主题① 的载体是 v5 已造好的 `op.llm-config` + op-driven `llm.unconfigured` provider（**新增的只是时机与被识别的判据**）；主题② 的载体是 v5 为「chips 即指令」而设的 `op.turn` 槽（**零新增调用点**）。
3. **安全与体积可控且已量化**：三档清分**派生**自既有 `layer`/`consent` ⇒ 与 `IMPL` 声明不可能脱钩（R-SELF-906 结构性消除）；Σ 预算 17,800 B 对余量 27,480 B（ADR-V55-011），且跨档位有**显式升档**预案而非静默。
4. **验证诚实**：S0（真机 22:49 序列）以 v5 之 S2 同地位机器化（样本单源 + node/Chromium 双面），失败面（真机观感）入人工面清单，**不冒充 PASS**。

---

## 5. 聚合文件影响分析

> 操作含义：**NEW** 新增 / **MODIFY** 修改 / **DELETE** 删除 / **NOOP** 显式零改动（登记）。共 **≈57 项**（src 11 / test 30 / docs+config 3 / SDDU 13）。

### 5.1 `src/**`（11 项）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/drivers.ts` | 驱动者声明单源（`DRIVER_TIMINGS` 5 / `PROACTIVE_MOMENTS` 7 / `driverClass` / 四元组抽取 / 去重键 / `CTX_FIELD_SERVICE` / `timingOfSettle`） | v55-1 |
| NEW | `.../next-registry/terminals.ts` | 驱动者终态词汇 4（正交单源） | v55-1 |
| NEW | `.../next-registry/suspension.ts` | 悬置任务单源（登记 / `MAX_SUSPENSIONS=1` / 有效性重校验 / 续接） | v55-2 |
| NEW | `.../next-registry/onboarding-flow.ts` | 确定性引导流步骤单源（4 步）+ 文案 + `op.llm-config` op-direct chip | v55-2 |
| NEW | `.../next-registry/guard.ts` | 护栏三件套常量 + 链深度 / 去重 / 静默 / 冷却状态 + 关断偏好读写 | v55-3 |
| NEW | `.../next-registry/ai-drive.ts` | 主动性按下策略（`auto` 档唯一自动按下点 + 留痕三要素 + `pressCandidate` 单源） | v55-3 |
| MODIFY | `src/llm/status.ts` | `+ isLlmConfigured()`（3 字段确定性判据；双侧可导入，零 LLM） | v55-2 |
| MODIFY | `src/shared/op-table.ts` | `+ tier` 字段与 `tierOf()`（**派生式**，9 行） | v55-3 |
| MODIFY | `.../next-registry/{definition,providers,ops,pipeline}.ts` | `NextCtx` 加法字段 + `reachableNext → nextAfterSettle` + `when` 逐字不动 + 驱动者声明接线 | v55-1/2/3 |
| MODIFY | `src/ui/sidepanel/{sidepanel,recommend}.ts` | `RecommendTrigger` 外移 re-export / `nextAfterSettle` / 答案驱动化 / 仲裁续传 / 引导 + 续接 / 否决 | v55-1/2/3 |
| MODIFY | `src/ui/settings/panel.ts` | 主动性开关（既有分区内，零新增分区） | v55-3 |
| MODIFY | `src/background/{service-worker,messaging}.ts` | `runChat` 前置判据（SW 产物，零 sidepanel 字节）/ 有界仲裁队列 / `askBridge` 迟到固化 / union type-only + payload `variant` | v55-2/3 |
| **NOOP** | `manifest.json` / `KIND_SET` / `src/content/**` | **零 diff**（显式登记） | 各叶 |

### 5.2 `test/**`（30 项）

| 操作 | 文件路径 | 说明 | 叶 |
|:--:|---|---|:--:|
| NEW | `test/driver-timings.test.ts` | 时机源单源（恰 5 / 含 `'answered'` / 旧 4 逐字 / 散落字面量零命中 / 求值入口恰 1） | v55-1 |
| NEW | `test/driver-quadruple.test.ts` | 四元组机核（**双向包含** + 悬空 chips + 越源字段 loud）+ 三类注入反证 | v55-1 |
| NEW | `test/driver-terminals.test.ts` | 终态词汇单源 + 与 `STREAM_TERMINALS` 正交 + **三段控制**（禁恒真） | v55-1 |
| NEW | `test/s0-self-driven-chain.test.ts` | S0 全链 node 判（样本单源 + ③⑥⑧ 逐环节 + 两段证伪） | v55-1（v55-2 增分支 B） |
| NEW | `test/ui/fixtures/s0-chain.mjs` | **S0 机器化样本**（纯数据 + 注入式依赖，`s2-chain.mjs` 同形） | v55-1 |
| NEW | `test/ui/s0-self-driven.mjs` | S0 Chromium 面（真面板：绑定→拾取→作答→**驱动**→双分支→终局） | v55-1（v55-2 增） |
| NEW | `test/ui/law7x-ext.test.ts` | 法七扩展门禁（4 类已答 / 已交描述逐类 + 双向反证 + 禁恒真） | v55-1 |
| NEW | `test/onboarding-deterministic.test.ts` | 主题① 场景门禁（首装 / 已装未配 / 零 LLM / 零视图切换 / 自动续接 + 失效重校验） | v55-2 |
| NEW | `test/op-three-tier.test.ts` | 三档清分机核（派生式 5/2/2 + 与 `IMPL` 一致 + 新 op 未归档 ⇒ FAIL + 逐档注入反证） | v55-3 |
| NEW | `test/proactivity-guard.test.ts` | 护栏三件套（六常量单源 + 越限抑制 + 关断 + 链深度截断 + 预算耗尽非死端） | v55-3 |
| NEW | `test/turn-arbitration.test.ts` | 并发仲裁（用户输入零丢失 / 留痕 / 有界 / AI 撞车不发起） | v55-3 |
| MODIFY | `test/op-wiring.test.ts` | **原判据不改**（`requestTurn` 恰 2）；增「主流程 diff = 0」复合读数（`maybeRecommend` 1/7 · `nextAfterSettle` 1） | v55-1/3 |
| MODIFY | `test/recommendation-sources.test.ts` | 时机集 ≥5 含 `'answered'`；旧 4 逐字；防抖三常量逐字 | v55-1 |
| MODIFY | `test/ui/no-dead-end.mjs`（39） | 五类阻塞**不减** + 增 4 类已表达意图终态（计数增）+ 双向反证 | v55-1/2 |
| MODIFY | `test/ui/recommendation.mjs`（65） | `answered` 时机面（答完恰一次求值内产出 next）+ 计数增 | v55-1 |
| MODIFY | `test/ui/ask-auth-inflow.mjs`（71） | describe 驱动 + 迟到作答固化 + 计数增 | v55-1/2 |
| MODIFY | `test/ui/l1.mjs` / `page-input.mjs`（108） | `applyRefAction` 有效 ⇒ 驱动的等价重锚（旧计数断言保留为新语义的一部分） | v55-1 |
| MODIFY | `test/l1-ref-validity.test.ts` | 「裁决 + 驱动」+ `commandSends` 消费面登记断言 | v55-1 |
| MODIFY | `test/ask-bridge.test.ts` | 迟到作答 `settle=false` 路径（固化 + 可达 next；不裸 errorResponse） | v55-1 |
| MODIFY | `test/blocked-terminals.test.ts`（9） | 5 类逐字不变 + `OPS_RECOVERY_ROWS`/`BLOCKED_RECOVERY_TRIGGER` 零改写 | v55-1/2 |
| MODIFY | `test/next-registry.test.ts`（16） | `onboarding` provider 语义零改写（扩张不取代）+ 驱动者行登记 | v55-1/2 |
| MODIFY | `test/ui/law8-plaintext.mjs`（25） | 引导路径零明文 + 留痕三要素零明文（计数增） | v55-1/2 |
| MODIFY | `test/ui/journey.mjs`（171） | **保段优先**（`#composer/#input/#send` 不变）；段外逐行登记；计数只增 | v55-3 |
| MODIFY | `test/ui/binding.mjs`（192） | **保段**（段内零字节）；段外逐行登记 | v55-3 |
| MODIFY | `test/ui/stream.mjs`（73）/ `l0.mjs`（248）/ `density.mjs`（242） | 系统行 / 留痕 / 关断面断言（计数增，阈值逐字不动） | v55-2/3 |
| MODIFY | `test/capability-wiring.test.ts`（`.request(` 语义）/ `sw-op-mirror.test.ts`（5）/ `op-protocol.test.ts`（6） | 三档清分加固 + `KIND_SET` 40 逐字 | v55-3 |
| MODIFY | `test/supersession-ledger.test.ts`（36） | X-SELF-2/3/4/5/6/7 条目 + `knownGap` 一致性 + 保护段处置 | 各叶 |
| MODIFY | `test/gate-integrity.test.ts`（15） | `+ V55_NEW_GATE_FILES`（≥6）+ 受审集合只增 + `CHROMIUM_GATES === 9` 逐字 | 各叶 |
| MODIFY | `test/size-baseline.ts` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3`（12） | 五要素重登记（时间线只追加）+ 三值同源 + 跨档位显式登记 | 各叶 |

### 5.3 `docs/**` 与配置（3 项）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `modifiedRanges[]`（X-SELF-2~7 落点）+ `redlineRemap[]`（若保护段取代）+ `protectedRanges[]`（**保段**或新 pin）+ `v3Vol3Closeout` 三值同源 + `validateFindings` 追加 |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | 若体积越档位 ⇒ `volume` 段显式升档登记（31 格与阈值**逐字不动**） |
| MODIFY | `packages/web-cli-plugin/package.json` | `test:v3` 串行链追加新门禁（**串行**，不并发）；**无新依赖** |
| **NOOP** | `.sddu/specs-tree-root/ROADMAP.md` / `manifest.json` / `docs/v3-supersession-ledger.json` | 零 diff（F-33 / v0.11.0 登记留收口） |

### 5.4 SDDU 本 Feature 目录（13 项）

| 操作 | 文件路径 |
|:--:|---|
| NEW | `plan.md`（本文件） |
| NEW | `ADR-V55-001-driver-registry-timing-source.md` ~ `ADR-V55-012-supersession-ledger-and-leafs.md`（12 项） |
| NEW | `specs-tree-v55-1-driver-layer/plan.md` |
| NEW | `specs-tree-v55-2-deterministic-onboarding/plan.md` |
| NEW | `specs-tree-v55-3-ai-driven-orchestration/plan.md` |
| MODIFY | `state.json`（父）+ 3 叶 `state.json`（phase → `planned`） |
| MODIFY | `TREE.md`（父 + 3 叶，由 `sddu-tree` 定向更新） |

---

## 6. 风险评估

### 6.1 继承风险（discovery R-SELF-001~012 + spec R-SELF-901~910）

| # | 风险 | 等级 | 缓解（⇒ 承载 ADR） |
|---|---|:--:|---|
| R-SELF-001 | **安全边界被「主动性」侵蚀（最高危）**：AI 主动可能撞特权 op / 代答 consent / 降档 | 高 | 派生式三档清分（改 `layer`/`consent` ⇒ 清分同步变 ⇒ 不可能脱钩）+ 特权恒 `gesture` + 逐档注入反证（V55-008） |
| R-SELF-002 | **门禁取代面**（`requestTurn` 恰 2 / `RecommendTrigger` 恰 4） | 高 | **默认读法①**：`requestTurn` **未发生取代**（diff = 0）；时机源扩张走**值集扩张 + 单源 + 求值入口不增**（V55-001/002） |
| R-SELF-003 | **半驱动者堆积 / 时机语义散落**（第 8 个 `maybeRecommend`） | 中高 | 调用点计数机核（1 定义 / 7 调用）+ `nextAfterSettle` 单入口 + 驱动者集合 ≡ provider 集合（V55-001） |
| R-SELF-004 | **token 成本 / 自触发环无判据** | 中高 | 护栏六项单源 + 越限被抑制 + 链深度截断 + 计数口径显式登记（V55-009） |
| R-SELF-005 | `content.js` / `pick-layer.js` 零容差 + `KIND_SET` 40 逐字 | 高 | 零 `src/content/**`；新数据只加 `chat-result` **payload**（非 kind）（V55-010/012） |
| R-SELF-006 | **体积余量 27,480 B**（v5 段曾低估 2.8×） | 中高 | Σ 17,800 B（上界 22,900）⇒ ×1.15 = 20,470（上界 26,335）≤ 27,480；**上界表 + 减体积优先级 + 跨档位显式预案**（V55-011） |
| R-SELF-007 | **法七扩展判据真空**（「已答」被判成恒真） | 中高 | 4 口径 + **三段控制**（正常/移除驱动者必红/端态不存在不要求）+ 两段证伪（V55-003） |
| R-SELF-008 | **`askBridge` 生命周期耦合**（后台 ask 结算依赖在飞回合） | 中 | 迟到路径**固化事实 + 可达 next**，不伪造「接住」，不裸 `errorResponse`（V55-004） |
| R-SELF-009 | 零宿主判据 / 12 kind 契约 | 中 | 载体全复用（`system` 行 + `nextstep` 卡）；`REGISTERED_STRUCTURAL_HOSTS` 断言不减（V55-009） |
| R-SELF-010 | 门禁严格串行 + `KL-N-10` 环境 flake 被误读为回归 | 低 | 串行 + 隔离复跑 ≥2 + 如实登记（V55-012） |
| R-SELF-011 | 断言只增的门禁规模（现 `npm test` 1181） | 中 | 等价重锚替代删除；`gate-integrity` 受审集合只增（V55-012） |
| R-SELF-012 | 方案先行风险（触发时机 / 安全边界 / 打扰控制在 spec 前被顺手定下） | 中高 | O-SELF-001~007 已全裁决；plan 只在 §5.2 列出的**显式边界内**选策略（V55-012 §5） |
| R-SELF-901 | 驱动者声明 ↔ 注册表漂移 | 中高 | **双向包含** + 三类注入反证（多一行 / 少一行 / 悬空）（V55-001） |
| R-SELF-902 | 时机源扩张被实现为「第二个推荐器」 | 中高 | 求值入口恰 1 定义 + 调用点不增机核（V55-002） |
| R-SELF-903 | 「已答」判据恒真 | 中高 | 取消 / 空 / 迟到三类**必不成立**（V55-003） |
| R-SELF-904 | 悬置任务成为第二条事实通路（双写） | 中高 | **单源登记 + MAX=1 + 有效性重校验**；流内事实仍是唯一事实面（V55-007） |
| R-SELF-905 | 主题① 引导「跳走」（打开设置页） | 中 | 零视图切换 / 零 `#open-settings` 断言 + 反证（V55-007） |
| R-SELF-906 | 三档清分表与实际 `IMPL` 声明脱钩 ⇒ 清分纸面化 | 中高 | **派生式**（tier 由既有字段计算）⇒ 结构性不可能脱钩（V55-008） |
| R-SELF-907 | 护栏常量「只写不判」⇒ 护栏空转 | 中高 | 越限抑制断言 + 反证；未落地须显式登记（V55-009） |
| R-SELF-908 | S0 被写成「场景脚本绿」而非「链路可判」 | 中高 | 逐环节可判 + 样本单源 + 两段证伪（V55-005） |
| R-SELF-909 | 主题①② 互相掩盖（未配置仍走 AI 主动） | 中 | 配置判据 = **唯一分流依据** + 互斥完备断言（V55-006） |
| R-SELF-910 | 体积评估被跳过 | 中高 | 预算前移为纪律；越限预案先登记（V55-011） |

### 6.2 plan 新增风险（R-V55-101~112）

| # | 风险 | 等级 | 缓解 |
|---|---|:--:|---|
| R-V55-101 | **`'answered'` 时机的触发点被实现为第 8 个 `maybeRecommend` 调用点**（最易犯的实现走偏） | 中高 | `nextAfterSettle` 单入口（定义恰 1）+ 源码扫描判据（`maybeRecommend(` 计数 == 7）+ 反证：新增调用点 ⇒ FAIL |
| R-V55-102 | **`ref-action` 的 `when` 被「顺手」改宽**（例如把 `openAsks===0` 改成 `unanswered===0`），使 X-SELF-2 变成隐性放宽 | 中高 | **裁决为时机侧读法①**（`when` 逐字不动）；门禁断言 `providers.ts` 该行字节不变（等价重锚 = 只在时机侧增，不碰 `when`） |
| R-V55-103 | **`DRIVER_TERMINALS` 与 `STREAM_TERMINALS` 被混用**（把「已答」写成流终态，改既有 6 项） | 中高 | 两表**正交**机核：`STREAM_TERMINALS` 6 逐字 + 交集为空 + `DRIVER_TERMINALS` 单源扫描（第二声明 ⇒ FAIL） |
| R-V55-104 | **自动按下越档**（`confirm`/`gesture` 档被 AI 按下；例如让 AI 启动 `op.llm-config` 并「代答」consent） | 高 | 按下点唯一 + `tierOf(chip) === 'auto'` 硬判 + 反证：把 `confirm` 档 op 交给 `pressCandidate` ⇒ FAIL（AC-SELF-005） |
| R-V55-105 | **`NextCtx` 扩字段绕过服务面登记**（`when` 读了未映射字段 ⇒ 新真值源） | 中 | `CTX_FIELD_SERVICE` 单源 + 注册校验 loud（EC-SELF-003）+ 反证：加一个未登记字段 ⇒ FAIL |
| R-V55-106 | **仲裁队列退化为无界**（并发压力下队列自动扩容） | 中 | 队列**硬上限 1**（常量单源）+ 溢出路径 = 明确拒绝 + **草稿恢复**（不静默）+ 有界断言 |
| R-V55-107 | **「草稿恢复」路径未真正把用户输入还给用户**（面板已清空输入 ⇒ 文本看似丢失） | 中高 | 断言：拒绝后 `#input.value === 被拒文本` **且** 存在可读行；反证：删掉回填 ⇒ FAIL |
| R-V55-108 | **关断偏好成为第二个配置面**（新增一套设置读写路径） | 中 | 复用既有 settings 存储与分区（**零新增分区 / 零新增必需 id**）；键名单源；偏读 = 一个函数 |
| R-V55-109 | **护栏常量与 `NEXTSTEP_MIN_INTERVAL_MS` 双声明**（冷却被另写一个 10 s） | 中 | 冷却值 **re-export**（零新字面量）+ 单源扫描（`guard.ts` 外出现第二个 10_000 ⇒ FAIL） |
| R-V55-110 | **跨档位时静默改 `authorConfirmation`** | 中高 | `status` 枚举合法性机核 + 文书不得出现「档位已确认」类表述（`size-ruling-vol3` ≥12 不减）；本计划 §1.2 已预登记 |
| R-V55-111 | **S0 的 branch A 在 v55-1 与 v55-3 被断言两次（双重计数掩盖）** | 中 | 分层声明：v55-1 = **机制侧**（答案 ⇒ 悬置/回合输入可判命中 + 可达 next），v55-3 = **端到端**（无需用户按键 ⇒ 自动成回合）；两侧独立计数（禁互相掩盖） |
| R-V55-112 | **新门禁未纳入 `gate-integrity` 受审集合** | 中 | `V55_NEW_GATE_FILES` 下界声明 + `NODE_GATE_MARKER` 目录扫描双命中；未纳入 ⇒ FAIL |

### 6.3 风险 Top5（按「阻塞程度 × 影响面」）

| 序 | 风险 | 为什么是 Top5 |
|:-:|---|---|
| 1 | **R-SELF-003 + R-V55-101** 半驱动者复辟 | 决定 v5.5 是「注册表扩张」还是「第 8 个散落调用点」；ADR-V55-001/002 的调用点计数是**总开关** |
| 2 | **R-SELF-001 + R-V55-104** 主动性越档 | 唯一「不可让渡」红线（特权 op 恒手势）；三档清分的**派生式**形态是结构性防线 |
| 3 | **R-SELF-006 + R-V55-110** 体积与档位 | 余量 27,480 对 Σ 17,800（上界 22,900）；跨档位须**显式**升档，`pending-author-line` 不得伪称确认 |
| 4 | **R-SELF-007 + R-SELF-903** 法七扩展判据真空 | 「已答」是本 Feature 的题眼，判据写成恒真则整条验收失效 ⇒ 三段控制是唯一解 |
| 5 | **R-SELF-908 + R-V55-111** S0 失真 / 双计数 | S0 = 本 Feature 的验收锚（对位 v5 之 S2）；脚本绿 ≠ 链路可判 |

---

## 7. 生成的 ADR

### 7.1 ADR 索引（**ADR-V55-001~012，全部 ACCEPTED**；正文见同目录 `ADR-V55-0xx-*.md`）

| ADR | 标题 | 状态 | 一句话主张 | 主责叶 |
|---|---|---|---|:--:|
| **ADR-V55-001** | 驱动者 = 注册表 + 声明表（`drivers.ts`）；主流程 diff = 0 机核 | ACCEPTED | `NextProvider` 接口**不扩**、另立 `DRIVERS` 声明表 + **双向包含**机核；`requestTurn(` 仍恰 2 / `maybeRecommend(` 定义 1 调用点 7 / `nextAfterSettle(` 定义 1 | v55-1 |
| **ADR-V55-002** | `'answered'` 时机源扩张 + `ref-action` 抑制的**时机侧**等价重锚（X-SELF-2 读法①） | ACCEPTED | 时机值集 4→5（旧 4 逐字）；`ref-action.when` **零改字节**；防抖三常量逐字；`firstRun` 至多一次语义**不复用** | v55-1 |
| **ADR-V55-003** | 驱动者终态词汇（法七扩展）+ 「必有下一个驱动者」三段控制门禁 | ACCEPTED | `STREAM_TERMINALS` 6 逐字；新 `DRIVER_TERMINALS` 4 **正交单源**；4 口径「已答」判据；**禁恒真** = 每条判据三段控制 | v55-1 |
| **ADR-V55-004** | 答案驱动化（`applyRefAction`/`describe`/迟到后台 ask）+ `commandSends` 消费面登记 | ACCEPTED | 裁决 + **驱动**；调用点仍恰 1；`commandSends` **保留 + 显式登记**（1 只读投影 + 3 测试、零驱动语义）；迟到答案固化不裸 `errorResponse` | v55-1 |
| **ADR-V55-005** | S0 全链机器化（样本单源 + node/Chromium 双面 + A/B 双分支分层） | ACCEPTED | `test/ui/fixtures/s0-chain.mjs` 单样本两面判；「答案不被丢弃 ∧ 静默窗口 = 0 ∧ 死端 = 0」；branch A 机制侧 v55-1 / 必判项 v55-2 / 端到端 v55-3 | v55-1/2/3 |
| **ADR-V55-006** | 配置探测判据（3 字段确定性组合）+ `runChat` 前置判据落 SW | ACCEPTED | `isLlmConfigured = hasKey ∧ providerId ∈ PROVIDERS ∧ model 非空`（后二者由 key-store 读归一化**结构性保证**）⇒ 零 LLM/零网络；前置判据**先于** `providerChat`，未配置 ⇒ `variant:'llm-unconfigured'`（**非** LLM 错误事件） | v55-2 |
| **ADR-V55-007** | 确定性引导流（步骤单源）+ 悬置任务单源 + 配置完成自动续接 | ACCEPTED | 4 步（识别→引导→采集→完成）单源；采集**复用** `op.llm-config` 既有 params 序列；悬置 `MAX=1` + 有效期重校验；失败 ⇒ 回滚 + 悬置**保留**；零视图切换 | v55-2 |
| **ADR-V55-008** | op 三档清分的**派生式单源**（`tierOf`）+ 新 op 归档机核 | ACCEPTED | `tier` 由既有 `layer`/`consent` 派生 ⇒ 自动 5/2/2、**漂移不可能**；特权恒 `gesture`；`auto` 档零三表写入；**不加第 10 个 op**（会破 5/2/2） | v55-3 |
| **ADR-V55-009** | 护栏三件套（六常量单源）+ 关断/否决 + 载体零新增 | ACCEPTED | 频次 6/10min · 同因不重复 · 静默 60 s · 冷却（= 既有 10 s re-export）· 链深度 2 · 回合预算 8（**口径 = 主动回合数**）；越限 ⇒ 抑制 + 留痕；关断 = 唯一新增持久偏好（默认 **ON**，显式登记）；载体复用 12 kind | v55-3 |
| **ADR-V55-010** | 并发仲裁（有界队列 1 + 明确告知 + 草稿恢复）与 SW/panel 分工 | ACCEPTED | 用户输入**永不静默丢失**（排队 / 明确拒绝 + **草稿回填**）；AI 主动撞车 ⇒ **不发起 + 留痕**（不入队）；仲裁结果 ∈ 闭集 4 项；SW 侧实现 ⇒ **零 sidepanel 字节** | v55-3 |
| **ADR-V55-011** | 体积预算（三叶分列 + 15% 缓冲）+ 跨档位显式升档预案 | ACCEPTED | Σ 预算 **17,800 B** ⇒ ×1.15 = **20,470 ≤ 27,480** ✅（上界 22,900 ⇒ 26,335 ✅）；累计投影 **567,409 > 档位 563,200** ⇒ **显式升档登记**（614,400 / 675,840），`pending-author-line` **不伪称确认** | 各叶 |
| **ADR-V55-012** | X-SELF-1~7 取代台账 + 门禁等价重锚 + **每叶验收门禁清单** + 保护段/波次 | ACCEPTED | 7 项逐条（X-SELF-1 **未发生取代**）；`V55_NEW_GATE_FILES` ≥6 只增；journey **保段优先** / binding **保段**；3 叶 4/5/5 波串行 | 各叶 |

### 7.2 体积预算表（**硬要求**：Σ × 1.15 ≤ 27,480）

| 叶 | 主增量构成（sidepanel.js） | 预算 | 上界 | 依据（v4/v4.5/v5 实测校准） |
|---|---|--:|--:|---|
| **v55-1**（驱动者层） | `drivers.ts` 2,600 + `terminals.ts` 700 + `providers.ts` 900 + `sidepanel.ts` 2,400 + `recommend.ts` 200 + `definition/pipeline/dispatch` 200 | **7,000** | **9,000** | v5-1（5 新模块 + 迁移）实测 **+8,794**；本叶模块数与接线面 **<** v5-1（1 个大模块 + 2 个小模块 + 面板接线） |
| **v55-2**（系统流 + 悬置续接） | `suspension.ts` 1,300 + `onboarding-flow.ts` 1,100 + `llm/status.ts` 120 + `sidepanel.ts` 2,300 | **4,900** | **6,300** | v5-3（chip + data-narrow + error 出生 + 门禁，7 文件）实测 **+4,306**；本叶 SW 侧（`runChat` 前置判据）**零计账** |
| **v55-3**（AI 编排 + 护栏 + consent + 仲裁 + 收口） | `guard.ts` 1,700 + `ai-drive.ts` 1,400 + `op-table.ts` 300 + `sidepanel.ts` 2,000 + `settings/panel.ts` 350 + 其余 150 | **5,900** | **7,600** | v5-3 review R1 **+1,188** / v5-3 R2 **+4,306**；本叶最大块（护栏状态机）仍小于 v5-2 R1 的 `ops.ts` 单项（+3,918）量级 |
| **Σ** | — | **17,800** | **22,900** | — |
| **Σ × 1.15（缓冲）** | 要求 ≤ **27,480** | **20,470** ✅（余量 **7,010**） | **26,335** ✅（余量 **1,145**） | — |

**累计投影与档位**：

| 阶段 | 基线 | 累计 | 档位 563,200 | 生效上限（重登记后） |
|---|--:|--:|:--:|--:|
| 起点 | 549,609 | 549,609 | 未越 | 577,089 |
| v55-1 收口 | 556,609 | +7,000 | **未越** ✅ | `floor(556,609×1.05)` = 584,439 |
| v55-2 收口 | 561,509 | +4,900 | **未越**（余 1,691）⚠️ 紧 | `floor(561,509×1.05)` = 589,584 |
| v55-3 收口 | **567,409** | +5,900 | **越档位 +4,209** ⇒ **显式升档** | `ceilTo50KB(567,409)` = **614,400**；绝对上限 → **675,840**；生效上限 = `min(675,840, 595,779)` = **595,779** |

**减体积优先级（越预算时按序执行；均**不**触碰断言 / 容差 / 档位口径）**：
1. 把纯记账/计数的逻辑下移到 `background.js`（SW 产物，**不计账**）——仲裁队列、护栏计数、活跃度判定天然属 SW 面；
2. 用 v5 的**元组行**手法压缩声明数据（`ops.ts#IMPL` 先例：命名对象字面量每字段约 10 B 格式开销）；
3. 复用既有系统行文案 / 既有 receipt 文案，零新字符串；
4. 合并驱动者声明行（同 `when` 的驱动者共用一个行）；
5. **显式登记**未落地项（护栏某控制 / 某驱动者）为未闭合义务 —— **绝不以删除判据 / 放宽容差 / 静默下调档位实现**。

### 7.3 波次与任务数估算（供 `@sddu-tasks` 参考，**非需求**）

| 叶 | 波数 | 任务数（估） | 工作量集中区 |
|---|:--:|:--:|---|
| v55-1（驱动者层 + 法七扩展 + S0 骨架） | **4**（W1~W4） | **~24** | 声明单源 + 四元组机核 + 时机源扩张 + 答案驱动化 + S0 双面门禁 + 3 个新门禁 |
| v55-2（主题① 系统流 + 悬置续接） | **5**（W1~W5） | **~16** | SW 前置判据 + 引导流步骤单源 + 悬置/续接 + 两场景 + S0 分支 B |
| v55-3（主题② + 三档清分 + 护栏 + 收口） | **5**（W1~W5） | **~20** | 派生式清分 + 按下策略 + 护栏状态机 + 仲裁 + 共享面收口（台账 / 保护段 / 体积 / 计数对账） |
| **合计** | **14** | **~60** | — |

> 口径：任务数 = 可原子执行单元（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数；3 叶**串行**（v55-1 → v55-2 → v55-3）。

### 7.4 体积可行性结论（对应任务书硬要求）

**可行，不停机**：Σ 预算 17,800 B（上界 22,900 B）⇒ 加 15% 缓冲 20,470 B（上界 26,335 B）**均落在现行生效上限 577,089 B 的余量 27,480 B 之内**。**但**累计投影 **预计跨过已登记档位 563,200 B**（v55-3 收口轮，约 +4,209 B）⇒ 按 **V3-VOL-3** 走**显式升档**（档位 → `ceilTo50KB(实测)` = 614,400 / 绝对上限 → 675,840），五要素重登记 + `pending-author-line` **保持占位、不得伪称已确认**。**不静默**。

---

## 8. 遗留策略选择（spec §8 三条留 plan 的项 → 本计划裁决）

| # | spec 边界 | 本计划裁决 | 落点 |
|---|---|---|---|
| 1 | 并发仲裁的**具体策略**（排队 / 合并 / 明确拒绝；限「用户输入永不静默丢失 + 留痕 + 有界」） | **有界排队（1）+ 溢出即明确拒绝 + 草稿回填**；AI 主动撞车 ⇒ **不发起 + 留痕**（不入队） | ADR-V55-010 |
| 2 | 配置判据的**具体字段组合**（限「确定性 + 可机核 + 零 LLM」） | `hasKey ∧ providerId ∈ PROVIDERS ∧ model 非空`（后二者由 key-store 读归一化结构性保证） | ADR-V55-006 |
| 3 | 「同类不再主动」的**持久范围**（限「可判」） | **持久**（`chrome.storage.local` 单一偏好键，复用既有设置存储）+ 「本次」由静默期 + 去重保证；否决载体 = 既有 consent `reject` / 中断（**零新 op / 零新协议动作**） | ADR-V55-009 |

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-33 父 `plan.md` + 3 叶 `plan.md` + **ADR-V55-001~012** 全 12 条正文）：§1 前置检查 + 偏差登记 + 两条硬性约束结论；§2 架构分析（六条设计任务定案 / X-SELF-1~7 逐条处置 / N-SELF-001~026 红线继承 / T1~T12 不动面）；§3~4 方案对比与推荐（方案 A：注册表内等价扩张 + 三层承接）；§5 聚合文件影响 **≈57 项**（src 11 / test 30 / docs+config 3 / SDDU 13）；§6 风险（继承 R-SELF-001~012 + R-SELF-901~910 + plan 新增 **R-V55-101~112** + Top5）；§7 ADR 索引（12 条 ACCEPTED）+ **体积预算表（Σ 17,800 B ⇒ ×1.15 = 20,470 ≤ 27,480 ✅；上界 22,900 ⇒ 26,335 ✅）** + 累计投影与**跨档位显式升档预案** + 波次估算（3 叶 **14 波 / ~60 任务**）+ 体积可行性结论；§8 遗留策略选择三条裁决。**本轮只做 plan**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动，零门禁 / 构建 / Chromium，未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-22 | SDDU Plan Agent |
