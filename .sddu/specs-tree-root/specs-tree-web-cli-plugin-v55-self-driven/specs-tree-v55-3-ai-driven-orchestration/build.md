# 构建报告：specs-tree-v55-3-ai-driven-orchestration（V5.5-3 主题② AI 驱动编排 · **R1 = W1+W2 · R2 = W3+W4**）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review / validate 阶段的输入  
> **前置依赖**: `tasks.md`（20 任务 / 5 波）、`tasks.json`、本叶 `plan.md` v1.0、父 `../plan.md` + `ADR-V55-008/009/010/011/012`、前置叶 `v55-1` / `v55-2`（全绿）  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-23  
> **版本**: v1.1（**R1 = W1+W2**（TASK-V55-301~307）+ **R2 = W3+W4**（TASK-V55-308~315）；W5 = TASK-V55-316~320 留 R3）  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-23  
> **更新说明**: R2 增量——SW 有界仲裁（`TURN_QUEUE_MAX = 1`）+ 溢出明确拒绝 + 草稿回填 · 护栏六常量单源（`guard.ts`）+ 越限真抑制 + 关断偏好 · 不可达用户输入为零（三路径）· 载体零新增保持 · 体积重登记 566,535 → **573,424 B**（R2 单轮 +6,889，仍 < 单轮上界 7,600，产物在旧生效上限内）

---

## 0. 范围与基线

| 项 | R1（W1+W2） | R2（W3+W4） |
|---|---|---|
| 本轮范围 | `TASK-V55-301`（SG-V55-03）· `302`（`tierOf` + 物化表）· `303`（三档清分门禁）· `304`（`capability-wiring`/`sw-op-mirror` 等价重锚）· `305`（`ai-drive.ts`）· `306`（`op.turn` 槽复用 + 分支 A e2e）· `307`（逐档反证 + 判定链零触碰） | `TASK-V55-308`（SG-V55-04）· `309`（SW 有界仲裁队列）· `310`（留痕 + 草稿回填）· `311`（`turn-arbitration` 门禁）· `312`（`guard.ts` 六常量单源）· `313`（越限抑制 + 链深截断 + `driverSuppressedLine`）· `314`（主动性开关 + 关断否决）· `315`（`proactivity-guard` 门禁 + 载体零新增） |
| 未做（留 R3） | — | W5：`TASK-V55-316~320`（保护段 `journey`/`binding` · 台账收口 · **体积终轮（三叶合计）** · 全门禁 + e2e 收口） |
| 起点 | 分支 `feature/web-cli-plugin`，HEAD `69133ad`（v55-2 收口） | 同分支，HEAD `5d0c489`（v55-3 R1） |
| 入线基线 | `npm test` 1283 / 0；`dist/sidepanel.js` 563,780 B | `npm test` 1299 / 0；`dist/sidepanel.js` 566,535 B；生效上限 594,861 |
| 出线 | `npm test` **1299 / 0**（+16）；`sidepanel.js` **566,535 B** | `npm test` **1312 / 0**（+13）；`sidepanel.js` **573,424 B** |

---

## 1. 构建概要

| 维度 | 数值（R1 + R2 累计） |
|------|:--:|
| 完成任务数 | **15 / 20**（R1 7 + R2 8；W5 5 项留 R3） |
| 复杂度分布（R2） | S×1（308） / M×5（309 / 310 / 312 / 313 / 315） / L×2（311 / 314） |
| 新增文件（R2） | **4**（`src/background/turn-queue.ts` / `src/ui/sidepanel/next-registry/guard.ts` / `test/turn-arbitration.test.ts` / `test/proactivity-guard.test.ts`） |
| 修改文件（R2） | **12**（src 6 / test 4 / docs 2；见 §2.1） |
| 新增判据（node 用例） | R1 **+16**（1283 → 1299）；R2 **+13**（1299 → **1312**） |
| 新增门禁文件 | R1 1（`op-three-tier`） + R2 2（`turn-arbitration` / `proactivity-guard`） = **3**（W5 T320 纳入受审集合） |

---

## 2. 文件变更

### 2.1 R2（W3 + W4）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/background/turn-queue.ts` | TASK-V55-309 | **有界仲裁队列**（纯逻辑，落 background ⇒ 零 sidepanel 字节）：`TURN_QUEUE_MAX = 1` 单源 + `classifyChatRequest(busy, len)` 三路径 + 有界 FIFO `createTurnQueue`（溢出 = `busy-rejected`，非无界 / 非静默） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/guard.ts` | TASK-V55-312/313/314 | **护栏六常量单源**：`AI_PROACTIVE_MAX_PER_WINDOW = 6` / `AI_PROACTIVE_WINDOW_MS = 600_000` / `AI_PROACTIVE_SILENCE_MS = 60_000` / `AI_PROACTIVE_COOLDOWN_MS = NEXTSTEP_MIN_INTERVAL_MS`（**re-export，零第二份 10_000**）/ `AI_CHAIN_DEPTH_MAX = 2` / `AI_TURN_BUDGET_PER_SESSION = 8` + `AI_PROACTIVE_ENABLED_DEFAULT = true` + `AI_PROACTIVE_PREF_KEY`（单源）+ `AI_PROACTIVE_SAME_CAUSE_KEY = dedupeKey`；`createProactivityGuard(now)` 工厂 + `proactivity` 单例 + `loadProactivePref` / `saveProactivePref`（既有 `chrome.storage.local`，独立键） |
| NEW | `packages/web-cli-plugin/test/turn-arbitration.test.ts` | TASK-V55-311 | 仲裁门禁 **6 用例**：闭集 4 项穷举 / 队列恒 ≤1 单源 / 零丢失三路径 / 草稿回填源码事实 / AI 撞车 `blocked:busy` / type-only（`KIND_SET` 40）+ 跨 bundle；含注入反证 |
| NEW | `packages/web-cli-plugin/test/proactivity-guard.test.ts` | TASK-V55-315 | 护栏门禁 **7 用例**：六常量单源扫描（含注释剥离）/ 频次 / 同因 + 静默 + 冷却 / 链深截断 / 预算非死端 / 关断 + 主题① / 载体零新增（12 kind / 零宿主 / `KIND_SET` 40）；含散落第二份注入反证 |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | TASK-V55-309 | `runChat` 的 busy 分支重锚为**可判仲裁**（非在飞 ⇒ `executed`；在飞 ∧ 有余量 ⇒ 入队 + `queued`；在飞 ∧ 已满 ⇒ `busy-rejected` + `text`）；`try/finally` **之外** drain（`finally` 内 `return` 会吞异常）；排队条目绑定入队 session，切换 ⇒ 明确拒绝 + 留痕（二选一显式） |
| MODIFY | `packages/web-cli-plugin/src/background/chat-events.ts` | TASK-V55-309 | `ARBITRATION_RESULTS`（**闭集 4 项**，type-only）单源声明 |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` | TASK-V55-309 | `ChatResultVariant` 追加 `'queued' \| 'busy-rejected'`（payload 字段，**非** `KIND_SET` 成员）；`KIND_SET` 仍逐字 40 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-V55-310/313/314 | chat-result 新分支：`queued` ⇒ 可读留痕行；`busy-rejected` ⇒ 留痕 + **草稿回填 `#input`**（仅空输入时，不覆盖新输入）；`driveAnsweredTurn` 护栏**前置判定**（越限 ⇒ `driverSuppressedLine` 留痕，非静默）+ `guardAllowed` 纵深缝 + 成功记账；`nextAfterSettle` 的 `answered` ⇒ 链断；composer 提交 ⇒ `noteUserTurn`；`op-*` rejected/cancelled ⇒ `noteVeto`；启动读持久偏好 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/ai-drive.ts` | TASK-V55-313 | `driverSuppressedLine(driverId, timing, evidence, reason)` —— 抑制留痕的**单源**行（`… | suppressed=<reason>`） |
| MODIFY | `packages/web-cli-plugin/src/ui/settings/panel.ts` | TASK-V55-314 | 既有 `settings-llm` 分区内的**主动性总开关**（零新增分区 / 零新增必需 id）；键名与默认值取自 `guard.ts` 单源；切换即时生效 + 持久化；`refreshProactive()` 回读 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` · `size-budget.test.ts` · `size-growth-evidence.test.ts` · `size-ruling-vol3.test.ts` · `docs/v4-density-baseline.json` · `docs/v4-supersession-ledger.json` | R2 体积重登记 | 基线 566,535 → **573,424**；生效上限 594,861 → **602,095**（公式派生）；`v553R2Rows` + glue 46；round rows 组 30 → 31；输入模块数 91 → 92；档位 / 绝对上限 / `pending-author-line` 未动；v4 条目 `newTitle` 换锚 + 2 叶段删除行追补（断言零删减） |

### 2.2 R1（W1 + W2，逐字保留）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/next-registry/ai-drive.ts` | 305/306 | `pressCandidate` **唯一自动按下点** + `pressDecision` + `driverClass` 矩阵 + `driverTraceLine` |
| NEW | `test/op-three-tier.test.ts` | 303/307 | 三档清分机核 10 用例 |
| MODIFY | `src/shared/op-table.ts` | 302 | `hasConsent` + `tierOf`（派生式）+ 物化 `OP_TIER_TABLE` + `tierOfId`；零新增 op |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` · `test/op-wiring.test.ts` · `test/capability-wiring.test.ts` · `test/sw-op-mirror.test.ts` · `test/size-baseline.ts` · `size-budget.test.ts` · `size-growth-evidence.test.ts` · `size-ruling-vol3.test.ts` · `docs/v4-density-baseline.json` · `docs/v4-supersession-ledger.json` | 304/306 | 接线 + 等价重锚 + R1 体积中间登记 |

**红线复核（R2）**：`dist/content.js` **177,076 B** 与 `dist/pick-layer.js` **34,358 B** **逐字节不变**；`manifest.json` / `KIND_SET`（40） / `src/content/**` / `ROADMAP.md` / `design/**` 零 diff。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55-301 | **SG-V55-03** 派生式清分可得性探针 | S | ✅ completed（探针已删除） | FR-SELF-080/086 |
| TASK-V55-302 | `op-table.ts` `tierOf` + 物化 `OP_TIER_TABLE` | M | ✅ completed | FR-SELF-080 |
| TASK-V55-303 | `op-three-tier.test.ts` 三档清分机核 | L | ✅ completed | FR-SELF-080/081/083/084/086 |
| TASK-V55-304 | `capability-wiring` / `sw-op-mirror` 等价重锚 | M | ✅ completed | FR-SELF-081/086 |
| TASK-V55-305 | `ai-drive.ts` `pressCandidate` 单源 + `driverClass` 矩阵 | M | ✅ completed | FR-SELF-063/065 |
| TASK-V55-306 | `op.turn` 槽复用（`requestTurn` 仍恰 2）+ 分支 A e2e | L | ✅ completed | FR-SELF-060/064/070 |
| TASK-V55-307 | 逐档反证 + 判定链零触碰 | M | ✅ completed | FR-SELF-067/082/085 |
| TASK-V55-308 | **SG-V55-04** 仲裁 SW 零字节 + 草稿回填 seam 探针 | S | ✅ completed（探针已删除） | FR-SELF-061 |
| TASK-V55-309 | `service-worker.ts` 有界仲裁队列 | M | ✅ completed | FR-SELF-061 |
| TASK-V55-310 | 留痕 + 草稿回填 | M | ✅ completed | FR-SELF-061/063 |
| TASK-V55-311 | `turn-arbitration.test.ts` 仲裁门禁 | L | ✅ completed | FR-SELF-061 |
| TASK-V55-312 | `guard.ts` 护栏六常量单源 | M | ✅ completed | FR-SELF-090~093 |
| TASK-V55-313 | 越限抑制 + 链深截断 + `driverTraceLine` 留痕 | M | ✅ completed | FR-SELF-090~092/063 |
| TASK-V55-314 | `settings/panel.ts` 主动性开关 + 关断否决 | L | ✅ completed | FR-SELF-068/069/094 |
| TASK-V55-315 | `proactivity-guard.test.ts` 护栏门禁 + 载体零新增 | M | ✅ completed | FR-SELF-090~097 |
| TASK-V55-316~320 | W5：保护段 / 台账收口 / 体积终轮 / 全门禁 + e2e | — | ⏳ **pending（R3）** | — |

### 3.1 SG-V55-04 结论（R2 先验闸门）

**结论 = 可得**（探针 `/tmp/opencode/v4-gate-logs/v55-3-r2/SG-V55-04.log`，五要素报告）：

```
① 结论：可得
② seam 清单：S1 chatBusy 单飞本体 / S2 chat 入口 / S3 busy 分支 / S4 finally 收口 / S5 sessionIdAtStart
   / S6 仲裁类型宿主（type-only）/ S7 面板 chat-result 分派 / S8 #input 可写 / S9 既有系统行 / S10 KIND_SET 未新增 —— 10/10 ✔
③ 反例（缺一即不可得）：（无）   ⑤ problems：（空）
```

⇒ `TASK-V55-309/310/311` 可开工（`BLK-V55-4` 未触发）。

### 3.2 护栏六常量表（ADR-V55-009 §1 单源）

| 常量 | 值 | 语义 | 落点 / 关系 |
|---|---|------|------|
| `AI_PROACTIVE_MAX_PER_WINDOW` | **6** | 打扰控制：滚动窗内主动发起上限 | `guard.ts` 单源；窗口 `AI_PROACTIVE_WINDOW_MS` |
| `AI_PROACTIVE_WINDOW_MS` | **600_000**（10 min） | 频次上限的滚动窗宽 | 同处声明（全仓字面量恰 1 处） |
| `AI_PROACTIVE_SAME_CAUSE_KEY` | `dedupeKey(driverId, ctxDigest)` | 同因不重复 | **函数单源** = `drivers.ts#dedupeKey`（零第二份拼接） |
| `AI_PROACTIVE_SILENCE_MS` | **60_000** | 静默期（否决 / 手输后） | `guard.ts` 单源 |
| `AI_PROACTIVE_COOLDOWN_MS` | = `NEXTSTEP_MIN_INTERVAL_MS`（**10_000**） | 两次自动发起最小间隔 | **re-export**（`guard.ts` 内**零** `10_000` 字面量；R-V55-109 防线） |
| `AI_CHAIN_DEPTH_MAX` | **2** | 连续自动链深度上限 | 达界 ⇒ 截断 + 转用户手势（非死端） |
| `AI_TURN_BUDGET_PER_SESSION` | **8** | 回合预算（口径 = 主动回合数，等价口径已登记） | 达界 ⇒ 停发 AI 主动、确定性面不受影响 |
| `AI_PROACTIVE_ENABLED_DEFAULT` | **`true`** | 关断偏好默认值 | 显式登记；实现与文书同源 |
| `AI_PROACTIVE_PREF_KEY` | `'web-cli:proactive'` | 持久偏好键名单源 | 与 `web-cli:llm`（Key）/ `web-cli:theme` 不同键；键内无 `apiKey` 形状 |

### 3.3 仲裁行为证据（草稿回填端到端）

| 路径 | 触发 | 结果 | 判据 |
|---|---|---|---|
| ① 正常 | `chatBusy === false` | `executed`（既有单飞执行） | `classifyChatRequest(false, n) === 'executed'` |
| ② 排队 | 在飞 ∧ 队列余量 ≥1 | 入队（FIFO，硬上限 1）⇒ `queued`；面板「已排队」可读行 | 队列 `size() === 1`；drain 取出**同一条文本** |
| ③ 明确拒绝 | 在飞 ∧ 队列已满 | `busy-rejected`（`text` = 用户原话）⇒ 面板**回填 `#input`**（仅空输入）+ 可读行 | 源码事实：`draftInput.value = rejected` ∧ `draftInput.value.length === 0` 前置；反证：删回填 ⇒ `panelRestoreProblems` 必红 |
| ④ AI 撞车 | AI 主动 ∧ 在飞 | `pressCandidate` ⇒ `blocked:busy` + 留痕（**不排队、不重试**） | `pressDecision('op.turn', {busy:true}) === {ok:false, blocked:'busy'}`；面板 `busy: state.pending` |

**「用户输入永不静默丢失」三重保障**：① 流内 `user` 行在 `requestTurn` 内即写出（不被仲裁回滚）；② 排队条目在 drain 时以**同一起点 session** 执行（切换 ⇒ 明确拒绝，仍回填草稿）；③ 拒绝时把原话放回 `#input`。空输入**不覆盖**用户新输入（ADR-V55-010 §后果）。

---

## 4. 测试与门禁对账

### 4.1 计数（只增不减）

| 门禁 | 入线 | 出线（R2） | 结论 |
|---|--:|--:|---|
| `npm test`（node） | 1299 | **1312** | ✅ +13 / 0 fail |
| ↳ 新增 `turn-arbitration` | — | **6** | ✅ 新门禁 |
| ↳ 新增 `proactivity-guard` | — | **7** | ✅ 新门禁 |
| `test:journey` | 171 | **171** | ✅ 保段（零 diff） |
| `test:binding` | 192 | **环境性 FAIL（KL-N-10）** | ⚠️ 见 §6 N-V55-3-R2-01（**基线复现同一失败**，非本轮改动） |
| `test:l0` / `test:density` | 248 / 242 | 248 / 242 | ✅ |
| `test:l1` / `test:l2` | 120 / 74 | 120 / 74 | ✅ |
| `test:insight` / `test:stream` / `test:ask-auth` | 118 / 76 / 78 | 118 / 76 / 78 | ✅ |
| `test:s0-self-driven` / `test:dead-end` | 42 / 49 | 42 / 49 | ✅ |
| `test:auth-chip` / `test:law8` / `test:hardening` | 37 / 36 / 24 | 37 / 36 / 24 | ✅ |
| `test:page-input` / `test:zero-injection` | 118 / 28 | 118 / 28 | ✅ |
| `test:recommendation` / `test:ref-pick-wiring` | 72 / 11 | 72 / 11 | ✅ |
| `test:supersession` | 36 | 36 | ✅ |
| `test:gate-integrity` | 15 | **18** | ✅ 只增（新 node 门禁自动入受审集合）；`CHROMIUM_GATES === 9` 逐字不动 |
| `test:size-ruling-vol3` | 12 | 12 | ✅ 三值同源 + `pending-author-line` 未伪称 |
| `test:onboarding` / `test:design-contract` | 29 / 19 | 29 / 19 | ✅ |
| `test:l1-reverse` / `test:l2-reverse` | 9 / 10 | 9 / 10 | ✅ |
| `test:e2e` | PASS | **PASS** | ✅ |

门禁串行复跑日志：`/tmp/opencode/v4-gate-logs/v55-3-r2/`（`test-v3.log` + 各门禁逐份）。

### 4.2 体积五要素（R2 **中间登记**，TASK-V55-319 终轮在 R3）

| 要素 | 值 |
|---|---|
| 实测（`stat -c %s dist/sidepanel.js`） | **573,424 B**（R1 566,535，**R2 Δ +6,889 / +1.22%**） |
| 逐模块归因（真实 `dist/build-meta.json`） | `next-registry/guard.ts` **NEW 3,016** · `settings/panel.ts` 37,358 → 39,252（**+1,894**）· `sidepanel.ts` 102,426 → 104,201（**+1,775**）· `next-registry/ai-drive.ts` 1,511 → 1,669（**+158**）；Σ **+6,843** + 未归因胶水 **+46** == **+6,889**（`SIDEPANEL_GROWTH_BREAKDOWN.v553R2Rows` / `v553R2UnattributedGlueBytes`） |
| 输入模块数 | 91 → **92**（`turn-queue.ts` 落 background 不计入；`guard.ts` 新增 1 个 sidepanel 必需模块） |
| 生效上限 / 档位 / 绝对上限 | 生效上限 594,861 → **602,095**（= `floor(573,424 × 1.05)`，公式派生）；**档位 614,400 与绝对上限 675,840 均未动**（573,424 < 614,400 ⇒ **未跨档位**，无需升档） |
| 披露与占位 | `SIDEPANEL_RE_REGISTRATIONS['v55-3-r2']` 五要素齐备（direction `raised`）；`docs/v4-density-baseline.json#volume` 同源；`SIDEPANEL_CEILING_CAP_ROLE === 'record-only'`；`authorConfirmation` 保持 **`pending-author-line`**（**未伪称确认**） |
| 红线 | `content.js` 177,076 B / `pick-layer.js` 34,358 B **逐字节不变** |

**口径诚实登记（不得静默）**：
- 本叶预算 **5,900 B** / 上界 **7,600 B**；R1 +2,755 + **R2 +6,889 = +9,644 B** ⇒ **本叶累计越叶预算（超 3,744 B）**；
- R2 **单轮 +6,889 B < 单轮上界 7,600 B**，且产物 573,424 B 仍在**旧生效上限 594,861 B** 之内（"生效上限内优先"）；**未跨档位 / 无红线变化** ⇒ 按 ADR-V55-011 §4「登记不停机」处置，并在 `SIDEPANEL_RE_REGISTRATIONS['v55-3-r2'].reason` / `docs/v4-density-baseline.json#volume.directionalAlert` 逐条如实登记；
- **超额根因（计划侧严重低估）**：`guard.ts` 计划 1,700 → 实测 **3,016**（×1.8）；`settings/panel.ts` 计划 350 → 实测 **1,894**（×5.4，含分区内开关渲染 + 读回）；`sidepanel.ts` 计划 2,000 → 实测 **1,775**（在预算内）。R3（TASK-V55-319）按三叶合计终态再登记并显式升档/如实登记二态。

---

## 5. 反证摘要（每条判据两段证据，禁恒真）

### 5.1 R2 注入反证（硬性纪律逐条）

| # | 反证形态（本轮纪律） | 结果 |
|---|---|---|
| 1 | **超频次 ⇒ 抑制必红** | 滚动窗内第 7 次主动 ⇒ `{allowed:false, reason:'frequency'}`；窗口滚动后恢复 ⇒ 判据非恒真 |
| 2 | **链深 3 ⇒ 红** | 连续 2 次后第 3 次 ⇒ `chain-depth`；用户交互 ⇒ 重置 + 放行（可逆） |
| 3 | **关断 ⇒ 零主动必红** | `setEnabled(false)` ⇒ `disabled`；**主题① 仍放行**（`verdict('deterministic') === allowed`）；恢复 ⇒ 放行 |
| 4 | **仲裁丢弃用户输入 ⇒ 红** | 删掉回填 ⇒ `panelRestoreProblems` 必红；空输入不覆盖断言 |
| 5 | **AI 撞车发起 ⇒ 红** | `pressDecision(busy)` ⇒ `blocked:busy`；对照（非在飞）⇒ 放行 |
| 6 | **无界队列 ⇒ 红** | 上限 2 的对照实现接纳第二条（说明上限承重）；真判据上限 1 ⇒ 第二条 `busy-rejected` |
| 7 | **常量散落第二份 ⇒ 红** | 注入 `export const AI_CHAIN_DEPTH_MAX = 9;` ⇒ 声明计数 2；`guard.ts` 内 `10_000` 零命中 |
| 8 | **同因 / 静默 / 冷却 ⇒ 各必红** | 同 cause 第二次 ⇒ `same-cause`；手输后 <60 s ⇒ `silence`；间隔 <10 s ⇒ `cooldown`；期满均恢复 |
| 9 | **预算耗尽 ⇒ 非死端** | 第 9 个主动回合 ⇒ `budget`；确定性面仍放行（可达 next 不被阻断） |
| 10 | **载体新增 ⇒ 红** | `KIND_SET` 注入 `'ghost'` ⇒ 41 项；12 kind / 零宿主逐字断言 |

### 5.2 R1 注入反证（逐字保留，见 R1 段）

删 `tierOf` 派生 ⇒ 清分 6/1/2 红 · 特权归 `auto` ⇒ 红 · AI 按下 `confirm` 档 ⇒ `blocked:tier` · AI 代答 consent ⇒ 红 · AI 自造 `opId` ⇒ `unknown-op` · 新 op 未归档 ⇒ 红 · 第三个 `requestTurn(` ⇒ 红 · `auto` 档写三表 ⇒ 红 · 判定链改动 ⇒ `zeroDiffProblems` 必红（9 项）。

---

## 6. 已知限制 / 显式登记（R2）

| # | 项 | 处置 |
|---|---|---|
| N-V55-3-R2-01 | **`test:binding` 环境性 FAIL（KL-N-10 家族）**：`阶段 1 harness error: selector not found: #confirm-allow` + CDP socket 早断 | **非本轮改动**：`git stash` 去掉 R2 全部改动后**同机复跑同样失败**（`test-binding-baseline.log`，3 项失败含同一 selector）；R1 时 binding 192 全绿。**如实登记，不伪造串行绿**；R3 收口轮按 KL-N-10 隔离复跑纪律再判（若仍红则按环境 flake 单列，不改判据） |
| N-V55-3-R2-02 | **体积越叶预算（+9,644 > 5,900）** | 逐条如实登记于 §4.2 + `SIDEPANEL_RE_REGISTRATIONS['v55-3-r2']` + `docs/v4-density-baseline.json#volume`；**未跨档位**（573,424 < 614,400）、`pending-author-line` 保持 ⇒ 不停机；R3 T319 按三叶合计终态定稿 |
| N-V55-3-R2-03 | **token 预算口径 = 主动回合数**（非 token 计数） | ADR-V55-009 §2 等价口径：本 Feature 不新增真值源（无 usage 回报面）；单回合 token 量不可控 = **已知限制**（已在 `guard.ts` 模块头显式登记） |
| N-V55-3-R2-04 | **一次性否决在 `auto` 档无专用按钮** | 走「中断 + 静默期」；零新 op / 零新协议动作 / 零新 kind 的代价换取；登记为已知口径限制，列入 R3 人工面体感走查项 |
| N-V55-3-R2-05 | **关断偏好 = 本 Feature 唯一新增持久偏好** | 落既有 `chrome.storage.local`，键 `web-cli:proactive`（**独立于** `web-cli:llm`）；持久化失败时降级默认 ON（不伪造「已关断」），失败路径如实告知 |
| N-V55-3-R2-06 | **W5 未落地**（保护段 / 台账收口 / 体积终轮 / 全门禁） | 显式登记为 **R3 范围**（TASK-V55-316~320） |
| N-V55-3-R2-07 | **`state.json.phase` = `builded`（R2 中间态）** | W5 T320 收口时按三叶合计终态再登记 |

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| 本轮（R2） | 已完成 W3+W4；建议先跑 `@sddu-review specs-tree-v55-3-ai-driven-orchestration`（重点：仲裁有界性 / 护栏真抑制 / 关断口径 / 骨架体积） |
| 后续轮次 | **R3 = W5**（`TASK-V55-316~320`）：`journey`/`binding` 保护段 · 取代台账 X-SELF-1~7 对账 · `knownGap` · 人工面汇总 · 体积终轮（三叶合计 + 显式升档/如实登记）· 全门禁串行 + `e2e` |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 = W1+W2 / 7 任务；SG-V55-03 = 可得；`npm test` 1283 → 1299 / 0；体积 563,780 → 566,535 B（+0.49%） | 2026-09-23 | SDDU Build Agent |
| v1.1 | **R2 = W3+W4 / 8 任务**：SG-V55-04 = 可得；SW 有界仲裁（队列 1 + 溢出明确拒绝 + 草稿回填）+ 护栏六常量单源 + 越限真抑制 + 关断（主题① 不受控）+ `driverSuppressedLine`；`npm test` 1299 → **1312 / 0**；体积 566,535 → **573,424 B**（R2 +6,889，Σ+glue=6,843+46；未跨档位，生效上限 → 602,095）；`binding` 环境性 FAIL（基线复现）；W5 留 R3 | 2026-09-23 | SDDU Build Agent |
