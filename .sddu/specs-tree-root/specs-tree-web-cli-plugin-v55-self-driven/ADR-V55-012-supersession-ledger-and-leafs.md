# ADR-V55-012: X-SELF-1~7 取代台账 + 门禁等价重锚 + **每叶验收门禁清单** + 保护段与波次

## 状态
ACCEPTED

## 背景

本 Feature 触碰 7 条被门禁**逐字钉住**的既有红线（X-SELF-1~7），且新增 ≥6 个门禁。spec 纪律（FR-SELF-107 / 110~116 / §12）
要求：每项取代**判据等价重锚**（断言力不降、计数只增、≥1 注入反证、台账留痕）、**未发生取代者如实登记**、
保护段（journey / binding）**优先保段**、门禁受审集合**只增**且 `CHROMIUM_GATES === 9` **不动**。

## 决策

### 1. X-SELF-1~7 的取代台账（**逐条**；落点 = `docs/v4-supersession-ledger.json`）

| # | 台账动作 | `modifiedRanges[]` 落点 | 判据对账（力不降） | 注入反证（≥1） |
|---|---|---|---|---|
| **X-SELF-1** | **无条目**（如实登记「**未发生取代**」：AI 经既有 `op.turn` 槽 ⇒ `requestTurn(` 仍恰 2，diff = 0） | — | `test/op-wiring.test.ts` 的 `callSites: 2` + `requestTurnProblems` **一字不改** | 新增第 3 处 `requestTurn(` ⇒ FAIL（**既有反证保留**） |
| **X-SELF-2** | 条目：`sidepanel.ts:1791`（类型外移 re-export）+ `next-registry/providers.ts`（注释级；`when` **零改**） | `:1791` 1 行（类型 → re-export） | 时机集 ≥5 含 `'answered'` ∧ 旧 4 逐字 ∧ 求值入口恰 1 ∧ 防抖三常量逐字 | 删 `'answered'` ⇒ FAIL（复现静默）；改 `ref-action.when` ⇒ FAIL（`when` 零改判据） |
| **X-SELF-3** | 条目：`service-worker.ts`（`runChat` 前置判据 + 新 payload 变体）+ `sidepanel.ts`（fold 进既有 `risk`） | `service-worker.ts:878-941` 邻域；`sidepanel.ts:1290-1302` 邻域（**逐行登记**） | 双源并存（被动保留 + 主动新增）；`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` **逐条不变**（含按终态键控形态） | 删前置判据 ⇒ FAIL（复现 R5）；删被动路径 ⇒ FAIL |
| **X-SELF-4** | 条目：`stream-model.ts`（**零改**，作为「逐字不变」的对照）+ 新 `next-registry/terminals.ts` + `no-dead-end.mjs` | `test/ui/no-dead-end.mjs` 段外逐行登记（**保护段不在此文件**） | `BLOCKED_TERMINALS` 5 逐字 ∧ 新词汇 4 正交 ∧ 5 类判据不减 ∧ `test:dead-end` ≥39（增） | 删任一阻塞类判据 ⇒ FAIL；新终态无 next ⇒ FAIL |
| **X-SELF-5** | 条目：`sidepanel.ts:2177-2189`（裁决 + 驱动）+ `l1/ref-store.ts`（**零改**，仅消费面登记） | `sidepanel.ts` 该函数体逐行；`docs` 侧消费面登记条目 | `applyRefAction` 调用点仍恰 1；「有效 ⇒ 驱动」新增；「无效 ⇒ 既有阻塞终态」保留；`commandSends` 消费面显式登记（1 只读 + 3 测试、零驱动语义） | 恢复「只计数」⇒ FAIL；让无效引用也驱动 ⇒ FAIL |
| **X-SELF-6** | 条目：`sidepanel.ts:2541-2546`（+ 驱动） | 该函数体逐行 | 空描述零副作用 + 不入终态（逐字保留）；非空 ⇒ 驱动 | 恢复「只 dispatch」⇒ FAIL |
| **X-SELF-7** | 条目：`service-worker.ts:879-885`（丢弃 → 有界仲裁）+ `sidepanel.ts`（留痕 + 草稿回填） | 两文件对应段逐行 | 单飞保留；用户输入零丢失；仲裁闭集 4 项；有界（`TURN_QUEUE_MAX = 1`） | 用户输入静默丢失 ⇒ FAIL；队列无界 ⇒ FAIL |

**纪律**：① 无「放宽 / 删除 / 静默改常量 / 静默替换冻结对象」；② 每项「注入 ⇒ 实跑 FAIL（`expectFailPattern`）⇒ **逐字节还原**（sha256 相同）⇒ PASS」两段证据，日志全量；
③ `test/supersession-ledger.test.ts` 的 `status ↔ knownGap` 一致性保持绿（`complete-steps-1-8` ⇒ 空或仅声明闭环）；④ 取代与实现**同轮完成**，不得拆到下一轮补。

### 2. 门禁等价重锚清单（**改写 ≠ 删除**；本 Feature 主责面）

`op-wiring`（`requestTurn` 恰 2 / 本地 op 槽）· `recommendation-sources`（时机集 / 源白名单 7 逐字 / 防抖三常量）· `local-act-wiring` ·
`authorize-chip-wiring` · `capability-wiring`（`.request(` 语义等价保留）· `sw-op-mirror`（5 增）· `op-protocol`（6，`KIND_SET` 40 逐字）·
`blocked-terminals`（9 不变）· `next-registry`（16）/ `next-obligation-table`（10）/ `next-dispatch-diff0`（14，**不变**）/ `next-pipeline`（20）·
`test/ui/no-dead-end.mjs`（39 → 增）· `test/ui/recommendation.mjs`（65 → 增）· `test/ui/ask-auth-inflow.mjs`（71 → 增）·
`test/ui/stream.mjs`（73 → 增）· `test/ui/l0.mjs`（248）/ `density.mjs`（242，阈值逐字）· `test/ui/journey.mjs`（171，**保段优先**）·
`test/ui/binding.mjs`（192，**保段**）· `test/ui/law8-plaintext.mjs`（25 → 增）· `test/l1-ref-validity.test.ts` / `test/ui/l1.mjs` / `test/ui/page-input.mjs`（108）·
`test/ask-bridge.test.ts` · `test/supersession-ledger.test.ts`（36 → 增）· `test/size-*` + `size-ruling-vol3`（12）·
`test/design-contract.test.ts`（19，**F 逐字 + G 逐字不动**）· `test/gate-integrity.test.ts`（15 → 增）。

### 3. 新门禁与受审集合（`V55_NEW_GATE_FILES`，**只增**）

| 新门禁 | 面 | 属叶 | 判据要点 |
|---|---|:--:|---|
| `test/driver-quadruple.test.ts` | node | v55-1 | 驱动者 ≡ provider（双向包含）+ 四元组 + 三类注入反证 |
| `test/driver-timings.test.ts` | node | v55-1 | 时机集恰 5 含 `'answered'` + 旧 4 逐字 + 求值入口恰 1 + 映射表三类反证 |
| `test/driver-terminals.test.ts` | node | v55-1 | 终态词汇 4 单源 + 与 `STREAM_TERMINALS` 6 **正交** + **三段控制** |
| `test/s0-self-driven-chain.test.ts` + `test/ui/s0-self-driven.mjs` | node + Chromium | v55-1（v55-2 增分支 B） | S0 全链（答案不被丢弃 ∧ 静默窗口 = 0 ∧ 死端 = 0）+ 两段证伪 |
| `test/onboarding-deterministic.test.ts` | node | v55-2 | 判据 3 字段 + 前置判据源码序 + 两场景 + 零 LLM + 零视图切换 + 自动续接 + 失效重校验 |
| `test/op-three-tier.test.ts` | node | v55-3 | 派生式 5/2/2 + 与 `IMPL` 一致 + 新 op 未归档 ⇒ FAIL + 逐档反证 |
| `test/proactivity-guard.test.ts` | node | v55-3 | 六常量单源 + 越限抑制 + 关断 + 链深度截断 + 预算耗尽非死端 |
| `test/turn-arbitration.test.ts` | node | v55-3 | 用户输入零丢失 / 留痕 / 有界 / 闭集 4 项 / AI 撞车不发起 |

⇒ `V55_NEW_GATE_FILES`（下界声明，**只增**）+ `NODE_GATE_MARKER` 目录扫描**双命中**；**`CHROMIUM_GATES === 9` 不动**
（v5 先例：新 Chromium 门禁只追加，计数常量不改）；`test:string` 串行链在 `package.json` 的 `test:v3` 中按既有顺序追加。

### 4. 保护段处置（**优先保段**；本轮只读复算**双绿**）

| 段 | 现行 pin（**本轮只读复算命中**） | 处置 | 判据 |
|---|---|---|---|
| journey `43054..58287` | sha `cc79f413…` / `startByte 43054` / `endByte 58287` / 240 行（v5 口径） | **保段优先**（本 Feature 不触碰 `#composer` / `#input` / `#send` / 流结构 ⇒ 保段可行） | `test:supersession` 双绿（sha + 两侧字节偏移） |
| binding `107780..115930` | sha `be9ad0e9…` / `startByte 107780` / `endByte 115930`（`decision = keep`） | **保段**（段内零字节） | 同上 + `test:binding` ≥192 |
| （若必须改 journey） | — | **八步显式取代**：① 记录 old ② 逐段决策 ③ 同编号等价改写 ④ `modifiedRanges[]` ⑤ 新 pin ⑥ **计数守恒 ≥171** ⑦ `redlineRemap[]` 追加 ⑧ RP-V4-08 反证（段内 1 byte 必红 / 段外不红 / 逐字节还原） | 台账 + 实跑 |

> **pin 口径**（避免误读）：受保护区间的 sha 是**锚点切片**（`startAnchor … endAnchor`，字符切片）的 sha256，字节偏移**另算**
> （`test/supersession-ledger.test.ts#protectedPinFailures`）。**naive 的 `[startByte..endByte]` 字节切片 sha 与登记 pin 不同**，
> 这不是差异而是口径不同 —— 本计划一律以**门禁实现的口径**为准。

### 5. **每叶验收门禁清单**（AC-SELF-026 的分叶落地）

| 叶 | 收尾必过（全绿 + 计数只增 + 反证留证） | 叶内共享面义务 |
|---|---|---|
| **v55-1** | `npm test`（≥1181 增）· `typecheck` · `build` · `op-wiring`（**恰 2**）· `next-dispatch-diff0`（14 不变）· `blocked-terminals`（9）· `recommendation-sources` · `local-act-wiring` · `l1-ref-validity` · `ask-bridge` · `test:dead-end`（≥39 增）· `test:recommendation`（≥65 增）· `test:ask-auth`（≥71 增）· `test:l1`（116）/ `page-input`（108）· `test:law8`（≥25）· **新 4 门禁**（四元组 / 时机源 / 终态词汇 / S0）· `supersession`（≥36 增）· `gate-integrity`（≥15 增）· `size-*` + `size-ruling-vol3`（12） | 体积五要素（**本叶增量**）+ 取代台账**本叶面**（X-SELF-2/4/5/6；X-SELF-1 登记「未发生取代」）+ `knownGap` 一致性 |
| **v55-2** | 同上 + `test:stream`（≥73 增）· `test:ask-auth`（本叶面增）· **新主题① 场景门禁** + S0 分支 B 必判项（`s0-*` 增量面）· `law8`（引导路径） | 体积五要素（本叶增量）+ X-SELF-3 台账条目 + 悬置任务单源登记 |
| **v55-3** | 同上 + `test:auth-chip`（≥37）· `test:l0`（≥248）/ `density`（≥242，阈值逐字）· `test:journey`（≥171，**保段**）· `test:binding`（≥192，**保段**）· `capability-wiring` · `sw-op-mirror`（≥5）· `op-protocol`（≥6）· `design-contract`（19）· **新 3 门禁**（三档清分 / 护栏 / 仲裁）· `insight`（118）/ `hardening`（24）/ `l1-reverse`（9）/ `l2-reverse`（10）/ `ref-pick-wiring`（11）/ `e2e` PASS | **三叶共享面收口**：体积五要素（含**跨档位显式升档**或如实登记「未跨」）· journey + binding 保护段 · 取代台账（X-SELF-7 + 逐项对账）· `knownGap` —— **各恰一次**登记 + 人工面清单汇总（三叶面逐项 `⏳`/`PASS`，**v5 人工面 9 项零改写**） |

### 6. 波次（3 叶**串行**）

```
v55-1（4 波）→ v55-2（5 波）→ v55-3（5 波）      合计 14 波 / ~60 任务
每叶内部收尾 = 全门禁串行复跑 + 计数对账 + 反证留证 + 体积五要素 + 台账条目
门禁严格串行：test / test:ui / test:binding 绝不并发（一次一个 Chromium，finally 自清 profile）
KL-N-10：首轮异常 ⇒ 隔离复跑 ≥2、日志全量、仍红如实记录不阻塞收口（不伪造串行绿）
```

## 后果

**正面**
- 7 条红线的取代全部有**逐条落点 + 判据对账 + 注入反证**；X-SELF-1 的「未发生取代」被**如实登记**（不给「静默不动」留空白）。
- 保护段本轮**复算双绿**，且保段路径被证明可行（本 Feature 不触碰 composer / 流结构）⇒ 大概率**不需要第三次八步取代**。
- 每叶门禁清单可直接被 `@sddu-tasks` 引用为「收尾波」的定义，避免收口轮各持一套口径。

**负面 / 代价**
- 门禁规模继续增长（新 8 个文件 + 既有 30 个文件的改写）⇒ 串行门禁的总时长上升（R-SELF-011，登记为已知成本）。
- 「每叶各自全绿」要求 v55-1 的门禁在**v55-2/v55-3 之后仍绿**（跨叶回归）⇒ 后续叶改动若触到 v55-1 的判据，必须**等价重锚**而不是改 v55-1 的门禁。
