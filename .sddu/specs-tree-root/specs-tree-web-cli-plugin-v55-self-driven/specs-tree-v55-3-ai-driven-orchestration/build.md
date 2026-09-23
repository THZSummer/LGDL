# 构建报告：specs-tree-v55-3-ai-driven-orchestration（V5.5-3 主题② AI 驱动编排 · **R1 = W1+W2 · R2 = W3+W4 · R3 = W5 收口**）

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review / validate 阶段的输入  
> **前置依赖**: `tasks.md`（20 任务 / 5 波）、`tasks.json`、本叶 `plan.md` v1.0、父 `../plan.md` + `ADR-V55-008/009/010/011/012`、前置叶 `v55-1` / `v55-2`（全绿）  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-23  
> **版本**: v1.2（**R1 = W1+W2** + **R2 = W3+W4** + **R3 = W5 收口**（TASK-V55-316~320：S0 分支 A 端到端 + 关断复核 + 红线终核 + 体积定稿 + 父移交））  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-23  
> **更新说明**: R2 增量——SW 有界仲裁（`TURN_QUEUE_MAX = 1`）+ 溢出明确拒绝 + 草稿回填 · 护栏六常量单源（`guard.ts`）+ 越限真抑制 + 关断偏好 · 不可达用户输入为零（三路径）· 载体零新增保持 · 体积重登记 566,535 → **573,424 B**（R2 单轮 +6,889，仍 < 单轮上界 7,600，产物在旧生效上限内）
>
> **R3 增量（W5 收口轮）**——① **S0 分支 A 端到端收口**（已配置 ⇒ 答案后**零按键** ⇒ `pressCandidate` 经**既有** `op.turn` 槽成回合 ⇒ 思考/命令 ⇒ 续流）：样本单源扩展（`s0-chain.mjs#S0_A_BEATS/s0BranchAProblems`，**node + Chromium 双面共用一份**）+ node 面 4 用例 + Chromium 面 **59 check**；② **护栏在链路上真实可判**（频次 / 链深 / 预算沿链穷举 + 真面板抑制可读 ∧ 真不发）；③ **关断偏好设置面接线复核**（唯一新增持久偏好 · 默认 ON · 关断 ⇒ `suppressed=disabled` ∧ **主题① 仍放行**）；④ **红线终核 12 项**（`test:supersession` 新增判据，按当前产物重判）；⑤ **体积收口定稿**（Δ **0**，五要素 = **573,424 / 602,095 / 614,400 / 675,840 / `pending-author-line`**，**未跨档位**）；⑥ **SG-V55-05 = 保段可得**（journey `43054..58287` / binding `107780..115930` sha 双命中，两文件零 diff）；⑦ 本叶 3 枚 node 门禁正式纳入 `EXPECTED_AUDITED_FILES`。

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

## 8. R3（W5 收口轮）—— S0 分支 A 端到端 / 关断复核 / 红线终核 / 体积定稿 / 父移交

> **范围**：`TASK-V55-316~320`。**`src/**` 零字节改动**（全部落在 `test/**` / `docs/**` / `.sddu/**`）⇒ 体积 Δ = **0**。

### 8.1 W5 任务 ↔ 交付映射（**含范围口径的诚实登记**）

| W5 任务（tasks.md 原文） | R3 实际交付 | 说明 |
|---|---|---|
| **TASK-V55-316** SG-V55-05 保护段探针（先验闸门） | **SG-V55-05 = 保段可得**（见 §8.5） | 只读探针；结论 = 两保护段 sha 双命中 ∧ 两文件零 diff ⇒ **无需八步取代** |
| **TASK-V55-317** `journey.mjs` 保段优先 + 段外登记 | **保段成立 ⇒ 零改动**（段内零字节 ∧ 段外零改写） | 保段优先路径下**无段外改写**，逐行登记为空集（如实登记「未改写」） |
| **TASK-V55-318** `binding.mjs` 保段 + 段外登记 | **保段成立 ⇒ 零改动**（`decision = keep`） | 同上；`binding` 的运行时 FAIL 为**环境性 flake**（见 §8.8） |
| **TASK-V55-319** 体积终轮（三叶合计）+ 跨档位显式升档登记 | ✅ **体积收口定稿**（Δ 0 / **未跨档位** / 五要素终值） | 二态显式：**未跨档位** ⇒ 如实登记「无需升档」 |
| **TASK-V55-320** 共享面收口（台账 / `knownGap` / 人工面 / 全门禁 + e2e） | ✅ 收口（§8.6 / §8.7 / §8.8） | 三叶恰一次收口 + 父移交清单 |
| **R3 追加（编排器指令）**：316′ S0 分支 A **端到端收口** | ✅ **node + Chromium 双面**（§8.2） | 补上 v55-1 门禁显式留白（`s0-self-driven.mjs` 原注「A 续 = v55-3，不在本门禁」） |
| **R3 追加**：317′ **关断偏好设置面接线复核** | ✅ node + Chromium 双面（§8.3） | settings 唯一新增持久偏好 · 默认 ON · 关断 ⇒ 主题① 仍放行 |
| **R3 追加**：318′ **红线终核 12 项** | ✅ `test:supersession` 新判据（§8.4） | 按**当前产物**重判（不是再抄常量） |

> **口径诚实登记（不得静默）**：R3 的启动指令把 W5 表述为「316 S0-A 端到端 / 317 关断复核 / 318 红线终核 / 319 体积定稿 / 320 父移交」；仓库内 `tasks.md` / `tasks.json` 的 W5 原文为「316 SG-V55-05 探针 / 317 journey 保段 / 318 binding 保段 / 319 体积终轮 / 320 收口」。
> 两者**并不冲突**而是**互补**：SG-V55-05 探针的结论是「保段可得 ⇒ 317/318 零改动」（因此 317/318 的产出就是**保段证据**而非文件改写），而 S0-A 端到端 / 关断复核 / 红线终核 属 **320「共享面收口」的追加交付**（`tasks.md` §5 的共享面义务 ②④ + AC-SELF-001/026）。
> 本表逐项并列两者，**既未静默改规范，也未漏交指令**。

### 8.2 S0 分支 A 端到端（零按键自动成回合）—— **双面证据**

**样本单源**（`test/ui/fixtures/s0-chain.mjs`，`node` 与 `Chromium` **同一份文件**）：
- `S0_A_BEATS`（六拍：`configured → pressed → slot → stream → guarded → continuation`）；
- `S0_A_SLOT = 'op.turn'`（唯一允许的槽）；`S0_A_GUARD_REASONS`（护栏原因闭集）；
  `S0_A_ON_CHAIN_REASONS = ['frequency','chain-depth','budget']`（**必须在链路上可判**的三项）；
- `s0BranchAProblems(reading)`（**判据本体**：`presses ≠ 1` ⇒ 必红「删 pressCandidate 门」；`keypresses ≠ 0` ⇒ 必红；`guardReasons` 缺项 ⇒ 必红「删护栏缝」；`suppressedReadable === false` ⇒ 必红）。

| 面 | 门禁 | 读数 | 证据 |
|---|---|---|---|
| **node** | `test/s0-self-driven-chain.test.ts`（`S0N-9` / `S0N-9 反证` / `S0N-10` / 元判据，11 → **15 用例**） | ✅ 15/15 | 真管线：`bindPanelOps` + `pressCandidate` ⇒ 答案原样交到面板回合入口（**零按键**，node 面无按键概念 ⇒ `keypresses: 0` 为构造事实）；三要素留痕逐字 ∧ **零明文**（不回显答案全文）；护栏三项沿**链序**穷举（`frequency` @ 第 7 次 / `chain-depth` @ 第 3 次无交互 / `budget` @ 第 9 次） |
| **Chromium** | `test/ui/s0-self-driven.mjs` §⑱（`S0C-8` / `S0C-9`；总 check **45 → 59**） | ✅ **59 passed / 0 failed** | 真面板真路径：`llm-status` 夹具（真获焦回读路径）⇒ `LLM：Key ✅`；真点击作答 ⇒ **恰 1 条 `chat`**（`user = 原地翻译为中文`）∧ **作答后候选 chip 点击 = 0（零按键量具）**；三要素留痕**独立成行**；`chat-result{command}` ⇒ 命令行进流；`chat-result{done}` ⇒ 回合收口（无开口 ask ∧ 无阻塞裸奔） |

**「零按键」量具**：`document.addEventListener('click', …, true)` 统计作答之后落在 `#stream [data-op]` 上的点击 ⇒ 实测 **0**（AI 的按下**不经 DOM 点击**，是 `pressCandidate → dispatchChipAction('op.turn')` 的程序化路径）。

### 8.3 护栏在链路上真实可判 + 关断偏好复核（`TASK-V55-317`）

| 面 | 判据 | 结果 |
|---|---|---|
| node | 六常量单源（`guard.ts`）∧ 频次 / 链深 / 预算沿**链序**穷举 ⇒ 各得 `'frequency'` / `'chain-depth'` / `'budget'`，且**窗口滚动 / 用户交互后可恢复**（非恒真） | ✅ |
| node | 关断复核：`AI_PROACTIVE_ENABLED_DEFAULT === true`；`AI_PROACTIVE_PREF_KEY === 'web-cli:proactive'`（**≠** `web-cli:llm`）；无 storage ⇒ 降级默认 ON；**关断 ⇒ `ai` 恒拒 ∧ `deterministic` 恒放行**；假 `chrome.storage.local` 读写同键 ∧ 非布尔残留 ⇒ 降级默认（不伪造「已关断」） | ✅ |
| Chromium | 越限 ⇒ 流内出现 `suppressed=<reason>`（可读）∧ **`chat` 计数不增**（真抑制）；设置面切 `#settings-proactive-enabled` ⇒ `suppressed=disabled` ∧ 真不发 ∧ **`recommend()` 照常产出**（主题① 不受总开关控制） | ✅ |

> **口径拆分（诚实登记）**：Chromium 面可达的链上抑制是**代表性**的一项（`cooldown` / `disabled` —— 真 `Date.now` 时钟下 `frequency` 需 6 次 × 10 s 冷却窗口，headless 不可压缩）；**频次 / 链深 / 预算**三项由 node 面用**可注入时钟的护栏工厂**沿同一链序穷举证明。两面**判据同源**（同一 `s0BranchAProblems` + 同一 `guard.ts`）。

### 8.4 红线终核 12 项（`TASK-V55-318`）

新增于 `test/supersession-ledger.test.ts`（`test:supersession` 36 → **37**，只增）：`V553_REDLINE_ITEMS` 12 条 + 逐项判定 + 逐项反证（坏一项 ⇒ 恰一条问题）。

| # | 红线 | 终值（按当前产物重判） |
|---|---|---|
| RL-01 | `dist/content.js` 冻结 | **177,076 B** ✅ |
| RL-02 | `dist/pick-layer.js` 冻结 | **34,358 B** ✅ |
| RL-03 | `dist/sidepanel.js` = 登记基线（三冻结面之三） | **573,424 B** ✅ |
| RL-04 | `KIND_SET` 逐字 40 ∧ 三个新变体（`llm-unconfigured` / `queued` / `busy-rejected`）**均不在**其中（type-only） | **40** ✅ |
| RL-05 | 特权恒手势（`op.authorize` / `op.perm.request` ⇒ `tierOfId === 'gesture'`；物化表在册） | ✅ |
| RL-06 | consent 不代答（`op.llm-config` / `op.revoke` 恒 `confirm` ∧ AI 对 confirm+gesture 一律 `blocked:tier`） | ✅ |
| RL-07 | `requestTurn(` 调用点 **恰 2**（AI 经既有 `op.turn` 槽） | **2** ✅ |
| RL-08 | 法八零明文门禁在册 | ✅ |
| RL-09 | 12 kind **零宿主**（`REGISTERED_STRUCTURAL_HOSTS.length === 0` ∧ 退役容器 / 句柄非空） | ✅ |
| RL-10 | 判定链 `zeroDiffFiles` **9 项**（含 `policy.ts` / `auto-authorize.ts`） | ✅ |
| RL-11 | `manifest.json` 在零 diff 冻结面内 | ✅ |
| RL-12 | `pending-author-line` **未伪称已确认** ∧ `CEILING_CAP_ROLE === 'record-only'` ∧ 档位 = `ceilTo50KB(基线)` | ✅ |

### 8.5 **SG-V55-05** 结论（先验闸门 · `TASK-V55-316`）

**结论 = 保段可得**（只读探针；日志 `/tmp/opencode/v4-gate-logs/v55-3-r3/SG-V55-05.log`，五要素报告）：

```
① 结论：保段可得（两保护段 sha 双命中 + 两文件零 diff ⇒ 无需八步取代）
② 片段清单：journey.mjs 43054..58287  sha cc79f413fa289ad6de3124602c21640edd36c6af51e8f12f0ebe4ce39d620da7（= 登记 pin）
             binding.mjs 107780..115930 sha be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936（= 登记 pin，decision = keep）
③ 反证（缺一即不可得）：（无）  ④ 取代路径：不需要（journey 保段成立 / binding keep 成立）
⑤ problems：（空）  ⑥ 等长补偿预算：0 B（两文件本轮零改动）
```

⇒ `TASK-V55-317/318` 走**保段优先**路径（**零文件改写**），`BLK-V55-5` **未触发**。保护段凭据另有 `test:supersession`（37/0，含保护段判据）独立机核。

### 8.6 体积收口定稿（`TASK-V55-319`）—— 五要素终值

| 要素 | 终值 |
|---|---|
| 实测（`stat -c %s dist/sidepanel.js`） | **573,424 B**（R2 终值；R3 Δ **0**） |
| 逐模块归因 | `SIDEPANEL_GROWTH_BREAKDOWN.v553R3Rows` = **[]**（空集）+ 未归因胶水 **0** == Δ **0**；真实 metafile 与 R2 轮**逐模块逐值相等** |
| 输入模块数 | 92（未动） |
| 生效上限 / 档位 / 绝对上限 | **602,095**（= `floor(573,424 × 1.05)`）/ **614,400** / **675,840**；基线 573,424 **<** 档位 614,400 ⇒ **未跨档位**（二态显式：**无需升档**） |
| 披露 / 占位 | `SIDEPANEL_V553_FINAL_ROUND`（`direction: 'unchanged'`）+ `docs/v4-density-baseline.json#volume.v553FinalRound` 五要素齐备；`SIDEPANEL_CEILING_CAP_ROLE === 'record-only'`；`authorConfirmation` 保持 **`pending-author-line`**（**未伪称已确认**） |
| 红线 | `content.js` **177,076 B** / `pick-layer.js` **34,358 B** 逐字节不变 |

**叶预算口径诚实登记**：叶预算 **5,900 B** / 上界 **7,600 B**；R1 +2,755 + R2 +6,889 + **R3 +0** = **+9,644 B** ⇒ **本叶累计越叶预算（超 3,744 B）**（超额全部在 R1/R2，根因 = 计划侧低估 `guard.ts` ×1.8 / `settings/panel.ts` ×5.4）；未跨档位、无红线变化 ⇒ 按 ADR-V55-011 §4「登记不停机」；R3 零增重。新增判据 `test/size-growth-evidence.test.ts`（+1，18 用例）+ `size-ruling-vol3`（12 未动）。

### 8.7 共享面收口与父移交清单（`TASK-V55-320`）

**① 取代台账 X-SELF-1~7 逐项对账终态**（新增 `docs/v4-supersession-ledger.json#xSelfLedgerCloseout`，三叶逐项 + owner + 可机核证据）：

| id | 终态 | owner（落地叶） | 可机核证据 |
|---|---|---|---|
| X-SELF-1 | **未发生取代**（如实登记） | 末叶终核 | `op-wiring`（`requestTurn(` 恰 2）+ 红线终核 RL-07 |
| X-SELF-2 | superseded | v55-1 | `driver-timings` / `driver-quadruple#DQ-3` |
| X-SELF-3 | superseded | v55-2 | `blocked-terminals` / `onboarding-deterministic#OD-7` + RL-04 |
| X-SELF-4 | superseded | v55-1 | `no-dead-end` / `driver-terminals` |
| X-SELF-5 | superseded | v55-1 | `l1-ref-validity#applyRefDriveProblems` |
| X-SELF-6 | superseded | v55-1 | `s0-self-driven-chain` |
| X-SELF-7 | **superseded（本叶落地）** | **v55-3** | `turn-arbitration`（闭集 4 / 队列 ≤1 / 零丢失）+ `op-three-tier#OT-11` |

**② `knownGap` 一致性**：`protectedSupersession.status === 'complete-steps-1-8'` ∧ `knownGap = 「V4.5-1 第二次取代闭环（残余：无）…」`（**闭环声明，无未竟表述**）—— 由 `protectedSupersessionConflicts` 机核（矛盾即 FAIL）✅。

**③ 人工面汇总（**不得冒充 PASS**）**：v5 人工面 **9 项零改写**；本 Feature 人工面 **3 项** = `⏳ 未执行`（主动接手体感 / 打断感 / 引导文案可读性；headless 不可合成）。

**④ 新增门禁入受审集合**：本叶 3 枚 node 门禁（`op-three-tier` / `turn-arbitration` / `proactivity-guard`）正式纳入 `EXPECTED_AUDITED_FILES` 下界（`test:gate-integrity` 18 → **19**，只增）；`CHROMIUM_GATES === 9` **逐字不动**（零新增 Chromium 门禁文件，S0-A 面走既有 `s0-self-driven.mjs`）。

**⑤ 父移交清单（v55-1 / v55-2 / v55-3 全部未闭环项，owner 收敛为「父收口」/「人工面」）**：

| 来源 | 项 | 移交去向 | 状态 / 依据 |
|---|---|---|---|
| v55-1 | N-01 `nextAfterSettle` 调用点钉死 | v55-3 → **已闭环** | `op-wiring#OP-W-⑧` 钉 `NEXT_AFTER_SETTLE_CALLSITES = 10`（R1） |
| v55-1 | N-02 「sidepanel 红线 = **字节数**（非 sha）」口径 | **父收口** | R3 红线终核 RL-03 按**字节数**执行（sha 不可跨重建复现，内嵌 `BUILD_STAMP`） |
| v55-1 | N-03 O-01/O-02（`judgeBeat` 常量归因 · `PROACTIVE_MOMENTS` 伞名） | **父收口** | 登记为「不影响判据的设计重叠」 |
| v55-1 | N-04 ADR/plan 文本「调用点恰 1」↔ 门禁口径（生产 1 + seam 1） | **父收口** | 以门禁 `applyRefCallSiteProblems` 为准 |
| v55-1 | N-06 人工面（S0 体感 / 打断感 / 引导文案） | **人工面** | `⏳` 未执行 |
| v55-1 | N-07/N-08 环境性 flake（binding / recommendation 首跑） | **父收口** | 同族 KL-N-10；保段凭据 = `test:supersession` |
| v55-1 | N-09 `driver-timings` DT-2/DT-3 读编译常量 | **父收口** | 本 Feature 未落地（DT-1/DT-4 已读真源 ⇒ 判据不破）；显式移交 |
| v55-2 | N-01 零生产消费导出（`ONBOARD_SCENARIOS` / `onboardStepIndex` 死代码 …） | **父收口** | 登记为「门禁契约层单源」；validate 已判**非漂移** |
| v55-2 | N-02 续接成功不清空悬置（可能重放旧原话） | **父收口** | 风险低（仅面板 `op.llm-config`）；R3 S0-A 端到端后**悬置键去重**已使重放不可达（`lastAutoDrivenKey`）—— 登记为**已缓解** |
| v55-2 | N-04/N-07 环境性 flake（binding，与 v55-1 N-07 同族） | **父收口**（并入） | 同上 |
| v55-2 | N-05 跨 `options.html` 页完成配置不触发续接 | **父收口** | 明确**不属本 Feature**（跨页续接）；口径由父收口登记 |
| v55-2 | N-08 人工面（引导文案可读性 / 掩码卡读屏 NFR-SELF-008） | **人工面** | `⏳` 未执行 |
| v55-2 | N-10 **作者行确认**（体积升档 614,400 / 675,840） | **父收口（作者行）** | `authorConfirmation` 保持 `pending-author-line`（**零伪称**） |
| v55-3 | N-V55-3-R2-01 binding 环境性 FAIL | **父收口 / 环境登记** | 见 §8.8 |
| v55-3 | N-V55-3-R2-02 体积越叶预算 | **已闭环**（T319 定稿） | §8.6（+9,644 / 超 3,744，未跨档位） |
| v55-3 | N-V55-3-R2-03 token 预算口径 = 主动回合数（等价口径） | **父收口** | ADR-V55-009 §2；已知限制（`guard.ts` 模块头登记） |
| v55-3 | N-V55-3-R2-04 `auto` 档一次性否决无专用按钮 | **人工面 / 父收口** | 走「中断 + 静默期」；列入人工面体感走查 |
| v55-3 | N-V55-3-R2-05 关断偏好 = 唯一新增持久偏好 | **已闭环**（R3 复核） | §8.3（键单源 / 默认 ON / 关断 ⇒ 主题① 放行） |
| v55-3 | N-V55-3-R2-06 W5 未落地 | **已闭环**（R3） | §8.1~§8.7 |
| v55-3 | N-V55-3-R2-07 `state.json.phase` 中间态 | **已闭环**（R3） | 收口轮按终态再登记 `builded` |

**⑥ 全 Feature 计数对账（只增不减）**：见 §8.9。

### 8.8 已知限制 / 显式登记（R3）

| # | 项 | 处置 |
|---|---|---|
| N-V55-3-R3-01 | **`test:binding` 环境性 FAIL（KL-N-10 家族）** | `binding.mjs` **不在本叶变更面**（`git diff` 零命中）；保护段由 `test:supersession` 37/0 与 SG-V55-05 探针 sha 双命中**独立机核**双绿。**R3 串行复跑 = `exit=0`（PASS）** ⇒ 与 R1（192 全绿）/ R2（同机复现 FAIL）并列，**证实环境性 flake**（同族）；不改判据、不伪造串行绿 |
| N-V55-3-R3-02 | **体积越叶预算（+9,644 > 5,900）** | §8.6 逐条登记；**未跨档位** ⇒ 不停机；R3 零增重 |
| N-V55-3-R3-03 | **Chromium 面链上抑制为代表性一项**（cooldown / disabled） | 真时钟下 `frequency`（6×10 s 冷却窗）headless 不可压缩 ⇒ 三项由 node 面**可注入时钟**穷举；两面**判据同源**（§8.3 口径拆分） |
| N-V55-3-R3-04 | **人工面 3 项 = `⏳` 未执行** | 不冒充 PASS；并列 v5 人工面 9 项 |
| N-V55-3-R3-05 | **`test:l2-reverse` 需独立会话（>570 s）+ 中途被杀会留注入残留** | 该门禁为**历史反向证明套件**（RP-V33-01~10：逐条注入 → 复跑 → 逐字节还原），单机串行耗时超单命令窗口；**进程被强杀**时会留下注入痕迹（本轮实测：`test/ui/l0.mjs` 少 1 行 ⇒ 后续 RP-V33-06 锚点命中 0）。**处置**：逐字节还原 `l0.mjs`（`git checkout --`）后以**独立会话**复跑 ⇒ **`exit=0` 全绿**（selftest 15/0 · `test:l2` 74/0 · RP-V33-01~10 全绿）。**本叶变更面零命中**（`git diff` 未含该文件） |
| N-V55-3-R3-06 | **`test:ui`（journey）首跑 2 项环境性 FAIL**（`#54g` 书签权限拒绝回执 / `#33n` 返回后 DOM 重建） | **`git diff` 显示 `journey.mjs` 零命中**（保护段 `43054..58287` sha 双命中）⇒ 非本轮改动；**连续两次独立会话复跑 = `UI journey PASS — 171 assertions`（两次均 171/171，且 `#54g` / `#33n` 均 ✔）** ⇒ **环境性 flake**（同族 KL-N-10：headless 权限桩 / DOM 复用时序）。如实登记，不改判据 |

### 8.9 测试与门禁对账（R3）

| 门禁 | R2 出线 | R3 出线 | 结论 |
|---|--:|--:|---|
| `npm test`（node） | 1312 | **1319**（+7） | ✅ 只增 / 0 fail（`s0-self-driven-chain` +4 · `supersession-ledger` +1 · `size-growth-evidence` +1 · `gate-integrity` +1） |
| `test:s0-self-driven`（Chromium） | 45 check | **59 check** | ✅ 只增 / 0 failed（§⑱ 分支 A 端到端 + 关断复核 + 反证） |
| `test:supersession` | 36 | **37** | ✅ 红线终核 12 项 |
| `test:gate-integrity` | 18 | **19** | ✅ V5.5-3 受审集合（`CHROMIUM_GATES === 9` 逐字不动） |
| `test:size-ruling-vol3` | 12 | 12 | ✅ 三值同源 + `pending-author-line` |
| `test:l0`/`l1`/`l2`/`density`/`stream`/`ask-auth`/`law8`/`dead-end`/`auth-chip`/`zero-injection`/`page-input`/`onboarding`/`design-contract`/`ref-pick-wiring`/`l1-reverse`/`insight`/`recommendation`/`hardening`/`e2e` | 保段 | **逐项复跑（日志见下）** | ✅/⚠️ 见 §8.8 |
| `journey`（保护段 43054..58287） | 171 | **171**（零 diff；首跑 2 项环境性 FAIL ⇒ 连续两次复跑 **171/171 PASS**） | ✅ 保段（§8.8 N-06） |
| `binding`（保护段 107780..115930） | 环境性 FAIL | **`exit=0` PASS**（本轮复跑） | ✅ 环境性 flake 证实（§8.8 N-01） |
| `test:l2-reverse`（历史反向证明套件） | 10（RP-V33-01~10） | **`exit=0` 全绿**（独立会话；selftest 15/0） | ✅（§8.8 N-05） |

门禁串行日志：`/tmp/opencode/v4-gate-logs/v55-3-r3/`（`test-v3.log` + 逐门禁独立日志 + `SG-V55-05.log`）。

### 8.10 R3 反证摘要（注入反证，禁恒真）

| # | 反证形态 | 结果 |
|---|---|---|
| 1 | **删 `pressCandidate` 门** ⇒ 答案后零按键端到端必红 | `s0BranchAProblems({presses:0})` ⇒ 命中「删 pressCandidate 门」（node + Chromium **双面**各实跑一次） |
| 2 | **作答后又敲键** ⇒ 必红 | `{keypresses:1}` ⇒ 命中「零按键」（双面） |
| 3 | **不经既有 `op.turn` 槽**（自造第二入口）⇒ 必红 | `{slot:'op.ghost'}` ⇒ 必红 |
| 4 | **删护栏缝**（链上频次/链深/预算缺项）⇒ 必红 | `{guardReasons:[]}` ⇒ 命中「删护栏缝」（双面） |
| 5 | **越限静默**（抑制不留痕）⇒ 必红 | `{suppressedReadable:false}` ⇒ 必红 |
| 6 | **越界护栏原因** ⇒ 必红 | `{guardReasons:['ghost']}` ⇒ 闭集判据必红 |
| 7 | **关断 ⇒ 主题① 仍放行**（反向：`deterministic` 恒放行） | node `verdict('deterministic') === allowed` ∧ Chromium `recommend()` 照常产出 |
| 8 | **红线终核逐项可判**：坏任一项 ⇒ 恰一条问题 | `forged` 表实跑（只改一项 ⇒ 恰 1 条问题） |
| 9 | **体积「真的没变」**：任一模块偷动 ⇒ metafile 逐值判据必红 | `size-growth-evidence` 终轮用例对真实 metafile 逐值复核（Σ([]) + glue 0 == Δ 0） |
| 10 | **受审集合只增**：拿掉任一在册门禁 ⇒ 必红 | `V553_W5_AUDITED_FILES` 逐项反证 |

### 8.11 下一步

| 场景 | 操作 |
|------|------|
| 本叶 | 收敛为 **`builded` → 待 review / validate**（`TASK-V55-316~320` 全部落地） |
| 后续 | `@sddu-review specs-tree-v55-3-ai-driven-orchestration`（重点：S0-A 零按键判据本体 / 链上护栏口径拆分 / 体积「真的没变」等式 / 红线终核 12 项 / X-SELF 三叶对账） |

---

## 9. review 微修（R1 审查 I-01 / I-02）—— 零行为变化

> 触发：`review-report.md` R1 的 2 个**非阻塞**改进项（I-01 注释失实 / I-02 构造值标注）。改动面 = **注释 + 测试标注**，`src/**` 无行为变化、判据本体零改动。

### 9.1 逐项处置

| # | 位置 | 处置 | 验证 |
|---|---|---|---|
| I-01 | `src/ui/sidepanel/next-registry/ai-drive.ts:94-95` | 注释由**失实**引用 `guard.ts#GUARD_BLOCK_REASONS`（该导出不存在）订正为**真实符号**：`guard.ts` 的 `GuardBlockReason` 闭集（经 `GuardVerdict.reason` 透出）—— 语义不变（抑制原因仍「词表单源」），**零行为变化** | `npx tsc --noEmit` = 0；`npm test` 1319/0 |
| I-02 | `test/s0-self-driven-chain.test.ts`（node `S0N-9`） | 对 `guardReasons` / `suppressedReadable` / `continuation` 三项**构造值**加显式标注：注明其为占位真值（本面不驱动链式护栏 / 不读抑制行 / 不收口），**真实读数**在 **Chromium 面**（`s0-self-driven.mjs#aReading`，抑制行 / 收口由真面板派生）与 **`runChain`**（沿链序穷举 `frequency` / `chain-depth` / `budget`）—— **不得冒充真实链读数**；判据本体（`s0BranchAProblems`）零改动 | `npm test` 1319/0（`S0N-9` 正例 + 反证均绿） |

### 9.2 复跑与体积

| 项 | 结果 |
|---|---|
| `npx tsc --noEmit` | **0**（绿） |
| 相关门禁 | `s0-self-driven-chain`（S0N-9 正/反证）· `op-three-tier`（OT①~⑪）· `proactivity-guard`（PG①~⑦）**均绿** |
| `npm test`（node 全量） | **1319 / 0**（= R3 基线，**只增不减**；无新增 / 无删除用例） |
| 体积五要素 | **不变**：`sidepanel.js` **573,424 B**（I-01 注释被 esbuild 擦除 ⇒ 零字节；`dist` 重建后逐字节同值）/ `content.js` **177,076** / `pick-layer.js` **34,358**；生效上限 602,095 / 档位 614,400 / 绝对上限 675,840 / `pending-author-line` 均不动 ⇒ **无需重登记** |

日志：`/tmp/opencode/v4-gate-logs/v55-3-fix/`（`tsc-noemit.log` / `build.log` / `npm-test.log`）。

### 9.3 下一步

I-01 / I-02 已在 review → validate 之间闭环，均为**非阻塞**项；零行为变化、体积零变 ⇒ 不触发新轮次，直接交 validate。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.3 | **review 微修（R1 审查 I-01 / I-02）**：I-01 `ai-drive.ts:94-95` 注释失实引用订正为真实符号（`GuardBlockReason` + `GuardVerdict.reason`）；I-02 node `S0N-9` 对 `guardReasons`/`suppressedReadable`/`continuation` 三项构造值加显式标注（真实读数在 Chromium 面 + `runChain`，不得冒充链读数）。**零行为变化 / 判据本体零改动**；`npx tsc --noEmit`=0 · `npm test` **1319/0**（不减）· 体积五要素**不变**（573,424 / 177,076 / 34,358 / 602,095 / pending-author-line） | 2026-09-23 | SDDU Fast Agent |
| v1.0 | R1 = W1+W2 / 7 任务；SG-V55-03 = 可得；`npm test` 1283 → 1299 / 0；体积 563,780 → 566,535 B（+0.49%） | 2026-09-23 | SDDU Build Agent |
| v1.2 | **R3 = W5 收口轮**：S0 分支 A 端到端（样本单源 + node/Chromium 双面，零按键）· 护栏链上可判（频次/链深/预算穷举 + 真面板抑制可读）· 关断偏好复核（主题① 放行）· 红线终核 12 项 · 体积定稿（Δ 0 / 未跨档位 / 五要素 = 573,424/602,095/614,400/675,840/pending-author-line）· SG-V55-05 = 保段可得（journey/binding sha 双命中，零 diff）· 3 新门禁入受审集合；`npm test` 1312 → **1319/0**，`test:s0-self-driven` 45 → **59/0**；`src/**` 零字节改动 | 2026-09-23 | SDDU Build Agent |
| v1.1 | **R2 = W3+W4 / 8 任务**：SG-V55-04 = 可得；SW 有界仲裁（队列 1 + 溢出明确拒绝 + 草稿回填）+ 护栏六常量单源 + 越限真抑制 + 关断（主题① 不受控）+ `driverSuppressedLine`；`npm test` 1299 → **1312 / 0**；体积 566,535 → **573,424 B**（R2 +6,889，Σ+glue=6,843+46；未跨档位，生效上限 → 602,095）；`binding` 环境性 FAIL（基线复现）；W5 留 R3 | 2026-09-23 | SDDU Build Agent |

---

# 构建报告 v1.4（v55-3 **收口段**：N 项归并 + 终态对账）

> **文档定位**: SDDU 收口记录 —— 本叶 7 阶段流水线（build → review → validate 全通过）之后的**收口轮**：N 项归并登记 + 终态对账 + 交付物清单 + 移交项。**零产品代码改动**（`.sddu` 外零触碰）。
> **输入**: `review-report.md` v1.0（R1；45 Cx / **0 BLOCK** / 2 I / O-01~O-08）+ `validate-report.md` v1.0（R1；V1~V9 全绿 / 0 阻塞 / 1 无法执行 / O-1~O-7）+ 本叶 build.md v1.0~v1.3（N-V55-3-R2-01~07 / R3-01~06）+ 父 `spec.md` §12 映射表 / 父 `state.json` + `ADR-V55-011`（体积档位与越档升档）
> **版本**: v1.4（本叶 **close 终态**）
> **更新时间**: 2026-09-23
> **更新说明**: 收口轮 —— review **O-01~O-08**（8 项）+ validate **O-1~O-7**（7 项）+ 本叶 build **N-V55-3-R2-01~07 / R3-01~06** 归并为 **N-01~N-16** 并逐条标注 owner（**本叶已闭环 / 父收口 / 人工面**）；终态对账（任务 **20/20** · `npm test` **1283 → 1319 / 0** · 体积 **563,780 → 573,424 B（+9,644）** · 三冻结面零 diff · **SG-V55-03/04/05 全可行**）

## 17. 终态快照（close 基线）

| 项 | 终态读值（收口轮实测 / 取自 build+review+validate 产物） |
|---|---|
| 分支 / HEAD | `feature/web-cli-plugin` / **`456458f`**（本叶最后提交 = validate） |
| 任务 | **20 / 20 completed**（W1~W5；TASK-V55-301~320） |
| 门禁 | 新增 **3 枚 node 门禁**（`op-three-tier` **10/0** · `proactivity-guard` **7/0** · `turn-arbitration` **6/0**）+ **`s0-self-driven` Chromium 面扩张**（45 → **59/0**，§⑱ 分支 A 端到端 + 关断复核）；`s0-self-driven-chain` 升级 **15/0**；三枚 node 门禁正式纳入 `EXPECTED_AUDITED_FILES`（`test:gate-integrity` 18 → **19**）；**`CHROMIUM_GATES === 9` 逐字不动** |
| `npm test`（node） | **1283 → 1319 / 0**（+36，只增不减；R1 +16 / R2 +13 / R3 +7） |
| 体积 | `dist/sidepanel.js` **563,780 → 573,424 B（+9,644）**（R1 +2,755 / R2 +6,889 / R3 **Δ0**）；叶预算 **5,900** ⇒ **超 3,744 B**；叶上界 **7,600** ⇒ **超 2,044 B**（ADR-V55-011 §4「登记不停机」）；**未跨档位**（573,424 < 614,400）⇒ 二态显式「**无需升档**」 |
| 生效上限 / 档位 / 绝对上限 | 生效上限 = `min(675,840, floor(573,424 × 1.05) = 602,095)` = **602,095 B**；档位 **614,400 B**；绝对上限 **675,840 B**；`authorConfirmation` = **`pending-author-line`**（**不伪称已确认**） |
| 冻结面（dist） | `dist/content.js` **177,076 B / sha `52a82620…b5f6`**、`dist/pick-layer.js` **34,358 B / sha `77796bab…575e`** —— **逐字节零 diff**；`dist/sidepanel.js` = 登记基线 **573,424 B**（本叶**登记增长**，非零 diff；红线口径 = **字节数**，非 sha ⇒ 见 N-11 同族口径） |
| 源码 / 文档冻结面 | `src/content/**` · `manifest.json` · `docs/v3-*-ledger.json` · `ROADMAP.md` · `design/**` · `stream-model.ts` · `settings/**` · 判定链（`policy.ts` / `auto-authorize.ts` 等 `zeroDiffFiles` 9 项） —— **全零 diff** |
| 取代台账 | `X-SELF-1` = **未发生取代**（`requestTurn(` 仍恰 2，如实登记，非空白）；`X-SELF-7` = **superseded（本叶落地）**；`X-SELF-2/4/5/6` = v55-1 落地；`X-SELF-3` = v55-2 落地；三叶对账终态落 `docs/v4-supersession-ledger.json#xSelfLedgerCloseout`；`test:supersession` **37/0**（红线终核 **12/12**） |
| S0 | node `s0-self-driven-chain` **15/0** · Chromium `s0-self-driven` **59/0**（**S0-A 零按键**：已配置 ⇒ 作答后 `[data-op]` 点击 = 0 ∧ 恰 1 条 chat 原文 ∧ 留痕三要素独立成行 ∧ `command` ∧ `done`；关断 ⇒ `suppressed=disabled` ∧ **主题① 仍放行**） |
| 保护段 | `journey` **171 PASS**（`43054..58287` sha `cc79f413…`）· `binding` **192 PASS**（`107780..115930` sha `be9ad0e9…`）—— **保段**（SG-V55-05 sha 双命中 ∧ 两文件 `git diff` 零命中；未发生八步取代） |
| SG 闸门 | **SG-V55-03 = 可得**（R1）· **SG-V55-04 = 可得**（R2）· **SG-V55-05 = 保段可得**（R3） —— **三闸门全可行** |
| 流水线结论 | review **✅ 通过**（R1：45 Cx / 0 BLOCK / 2 I → `fdcbae8` 微修闭环 / 8 O）· validate **✅ 通过**（V1~V9 全绿；**0 阻塞 / 1 无法执行（l2-reverse 独立会话）**；受限项 O-1~O-7 如实登记；FR 覆盖 **45/45**） |

## 18. 交付物清单（本叶足迹；`git diff 69133ad..456458f` 实测）

**源文件（新增 3 / 修改 6）**

| 操作 | 文件 | 任务 |
|:--:|---|:--:|
| NEW | `src/background/turn-queue.ts`（SW 有界仲裁队列，`TURN_QUEUE_MAX = 1`） | 309 |
| NEW | `src/ui/sidepanel/next-registry/guard.ts`（护栏六常量单源） | 312 / 313 |
| NEW | `src/ui/sidepanel/next-registry/ai-drive.ts`（三档清分 + `pressCandidate` + 留痕） | 302 / 305 / 306 |
| MODIFY | `src/background/service-worker.ts` · `src/background/messaging.ts` · `src/background/chat-events.ts` | 309 / 310 |
| MODIFY | `src/shared/op-table.ts`（仲裁闭集 4 项 type-only） | 309 |
| MODIFY | `src/ui/settings/panel.ts`（关断偏好接线）· `src/ui/sidepanel/sidepanel.ts`（续流 / 仲裁 / 草稿回填 / 留痕 / 关断） | 310 / 313 / 314 |

**门禁 / fixture（新增 3 / 修改 12）**

| 操作 | 文件 |
|:--:|---|
| NEW（node） | `test/op-three-tier.test.ts`(10) · `test/proactivity-guard.test.ts`(7) · `test/turn-arbitration.test.ts`(6) |
| MODIFY（node） | `test/{capability-wiring,gate-integrity,op-wiring,s0-self-driven-chain,size-baseline,size-budget,size-growth-evidence,size-ruling-vol3,supersession-ledger,sw-op-mirror}.test.ts` |
| MODIFY（Chromium / fixture） | `test/ui/s0-self-driven.mjs`（45 → 59）· `test/ui/fixtures/s0-chain.mjs`（`S0_A_BEATS` / `s0BranchAProblems` 单源扩展） |

**台账（2）**：`docs/v4-supersession-ledger.json`（`xSelfLedgerCloseout`）· `docs/v4-density-baseline.json`（`volume.v553FinalRound`）
**SDDU 产物（本 diff 内 8）**：`tasks.md` · `build.md` · `review.md` · `review-report.md` · `validate.md` · `validate-report.md` · `state.json` · `TREE.md`

> 统计口径：非 `.sddu` 变更面 = **26 个文件**（**6 NEW + 20 MODIFY**）；`.sddu` 变更面 = **8 个产物文件**（含本收口段）；`git diff --name-only` 合计 **34**。

## 19. N 项归并登记（review O-01~O-08 + validate O-1~O-7 + build R2/R3 登记 → N-01~N-16）

> **归并口径**：review **O 8 项**（O-01~O-08）→ 主体；validate **O 7 项**（O-1~O-7）→ 主体；本叶 build **N-V55-3-R2-01~07 / R3-01~06** 去重并入（同源合并为一行）。**来源覆盖 = 全部逐条可回溯**（O-04 ≡ validate O-1 ≡ R2-01 ≡ R3-01 同源；O-05 ≡ R2-02 ≡ R3-02 同源；validate O-5 ≡ R2-03 同源；validate O-3 ≡ R3-04 同源；validate O-6 ≡ R3-03 同源；validate O-7 ≡ R3-05 同源；R3-06 单独并入 N-16）。

| 统一编号 | 来源 | 类型 / 严重度 | 内容摘要 | owner | 处置 |
|:--:|:--:|:--:|---|---|---|
| **N-01** | review O-01 | 观察 / 低 | `guard.ts:34` 的 `AI_PROACTIVE_SAME_CAUSE_KEY` 导出后**全仓零消费**（死导出）；同因键实际由 `sidepanel.ts:1977` 内联 `dedupeKey(\`${driverId}:${source}\`, instruction)` 组合 ⇒「函数单源」成立但「常量单源」空转 | **父收口** | 登记为「门禁契约层单源 / 不影响判据」（同 **v55-2 N-01** 族）；下游引用以门禁口径为准 |
| **N-02** | review O-02 | 观察 / 低 | `test/op-three-tier.test.ts:195-200` 的 `WRITE_POINTS` 为**手写声明**（非源码 sink 扫描）⇒「`auto` 零三表写入」完备性依赖该声明；已由 `op-wiring` 对 4 个写符号调用点各恰 1 部分缓解（新写符号仍不会自动发现） | **父收口** | 登记口径（完备性边界）；不改判据 |
| **N-03** | review O-03 | 信息 / 低 | `ai-drive.ts:71` 的 `pressDecision` `deterministic` 分支直接返回 `op.turn` 放行、**绕过** `configured`/`armed`/`busy`/`guardAllowed`；生产路径未消费（唯一调用点恒 `actor:'ai'`）⇒ latent seam，非运行时缺陷 | **本叶已闭环** | 本叶：该分支由 **R3 反证 7「关断 ⇒ 主题① 仍放行」**消费并机核（`verdict('deterministic') === allowed` ∧ Chromium `recommend()` 照常产出）；生产未消费 = **有意 seam**，判据由门禁承担 |
| **N-04** | review O-04 + validate O-1 + build R2-01/R3-01 | 环境性 flake / 低 | `test/ui/binding.mjs` 亲跑 FAIL（`#confirm-allow` selector not found + CDP socket 早断）；`binding.mjs` **不在本叶变更面**；保护段由 `supersession` **37/0** + SG-V55-05 sha 双命中独立机核；validate 本次亲跑 **PASS 192/0** ⇒ **证实环境性** | **父收口** | 登记为环境性 flake（**同源 v55-1 N-07 / v55-2 N-04·N-07 / KL-N-10**）；保段凭据 = `supersession` 37/0；不阻塞 |
| **N-05** | review O-05 + build R2-02/R3-02 | 体积 / 登记 | 叶预算 **5,900** / 上界 **7,600**，实测累计 **+9,644**（超预算 **3,744** / 超上界 **2,044**）；根因 = 计划侧低估（`guard.ts` ×1.8 / `settings/panel.ts` ×5.4）；**未跨档位、无红线变化** ⇒ 按 ADR-V55-011 §4「**登记不停机**」 | **父收口**（**作者行**） | 移交：并入父通账「体积升档 / 超预算」作者行确认事项；`authorConfirmation` 保持 `pending-author-line`（**零伪称**） |
| **N-06** | review O-06 | 工具 / 低 | `npm run size:attribution` **无参**运行时 base = head = HEAD（自比较，Δ0 恒真）⇒ 其读数不足以独立证明 R3 Δ0；实质机核在 `size-growth-evidence`（对真实 metafile 逐模块逐值 vs R2 登记） | **父收口** | 登记工具口径；Δ0 轮 reproduce 命令建议显式 `--rev <R2> --rev HEAD`（本轮未改） |
| **N-07** | review O-07 | 信息 | `ai-drive.ts:85-87` 的 `driverTraceLine` 仅含 `driver`/`timing`/`evidence` 三段，**无显式 `ts` 字段**；FR-SELF-063 的「何时」由流内行自身 `<time class="ts">` 承载 + `timing` 补时机源（ADR-V55-009 §5 已如此定义）⇒ 读法差异，**非缺口** | **父收口** | 登记读法（不改判据） |
| **N-08** | review O-08 | 观察 / 低 | `sidepanel.ts:1947` 每次 `answered` 结算均 `noteUserInteraction()` 重置链深 ⇒ `chain-depth` 在 `answered` 路径结构性难达；可达性依赖**续流点**（`sidepanel.ts:3654`）在无用户交互下产生**新**意图；node `S0N-9` 以 `userInteraction:false` 序列抽象该路径（合理但为构造） | **父收口** | 登记口径（链深可达性边界）；链深由 node 可注入时钟穷举（R3 反证 4） |
| **N-09** | validate O-2 | 观察 / 低 | `dist-test/size-baseline.js` 为**陈旧重复副本**（R1 值 566,535）；活副本在 `dist-test/test/size-baseline.js`（573,424）；根级副本为历史 `tsc` 输出残留（测试构建产物，**非产品 / 非门禁输入**） | **父收口** | 登记：建议清理或统一 outDir（避免人工读数误导）；不改判据 |
| **N-10** | validate O-3 + build R3-04 | 人工面 / ⏳ | 人工面 **3 项** `⏳ 未执行`（主动接手体感 / 打断感 / 引导文案可读性；headless 不可合成）；v5 人工面 **9 项零改写**（台账 `manualFaces` + `s0-self-driven.mjs:315-316`） | **人工面** | 移交：并列 v5 人工面 9 项；待真机人工验收；**不冒充 PASS** |
| **N-11** | validate O-4 + v55-1 N-02 | 口径 / 信息 | `dist/sidepanel.js` 的 **sha 跨重建不可复现**（内嵌 `BUILD_STAMP`）⇒ 红线口径 = **字节数**；`content.js` / `pick-layer.js` 的 sha 跨重建稳定 | **父收口** | 与 **v55-1 N-02** 同条父收口口径；本叶红线终核 RL-03 按**字节数**执行 |
| **N-12** | validate O-5 + build R2-03 | 口径 / 低 | **token 预算口径 = 主动回合数**（非 token 计数）；ADR-V55-009 §2 等价口径；本 Feature 无 usage 回报面 ⇒ 已知限制（`guard.ts` 模块头已登记） | **父收口** | 移交：明确并入父 deferred（**token 口径 = 回合数代理**） |
| **N-13** | validate O-6 + build R3-03 | 口径 / 低 | Chromium 面链上抑制为**代表性一项**（`cooldown` / `disabled`）；真时钟下 `frequency`（6×10s 冷却窗）headless 不可压缩 ⇒ 频次/链深/预算由 node **可注入时钟**穷举；两面**判据同源** | **父收口** | 登记两面口径拆分（不改判据） |
| **N-14** | validate O-7 + build R3-05 | 门禁执行 / 低 | `test:l2-reverse` **未在本轮执行**（历史反向证明套件需**独立会话** >570 s，中途被杀会留注入残留）；本叶变更面**零命中**；`l1-reverse` **9/9** 已亲跑作为反向证明代表 | **父收口** | 登记为受限项（已由 build R3 §8.8 N-05 独立会话 `exit=0` 复现全绿）；不阻塞 |
| **N-15** | build R2-04 | 人工面 / ⏳ | `auto` 档**一次性否决无专用按钮**（走「中断 + 静默期」） | **人工面** | 移交：列入人工面体感走查（真机观感） |
| **N-16** | build R3-06 | 环境性 flake / 低 | `test:ui`（journey）首跑 2 项环境性 FAIL（`#54g` 书签权限拒绝回执 / `#33n` 返回后 DOM 重建）；`journey.mjs` **零命中**（保护段 sha 双命中）；**连续两次独立会话复跑 = 171/171 PASS** | **父收口** | 登记为环境性 flake（同族 KL-N-10）；保段凭据 = 保护段 sha 双命中 |

**已闭环（不入 N 编号，仅备查）**：`N-V55-3-R2-05`（关断偏好 = 唯一新增持久偏好）→ **R3 复核闭环**（§8.3）；`N-V55-3-R2-06`（W5 未落地）→ **R3 闭环**；`N-V55-3-R2-07`（`state.json.phase` 中间态）→ **R3 终态再登记**；`N-V55-3-R2-02`（体积越叶预算）→ 并入 **N-05**。

**owner 分布**：**父收口 = 13**（N-01 / 02 / 04 / 05 · 作者行 / 06 / 07 / 08 / 09 / 11 / 12 / 13 / 14 / 16）· **本叶已闭环 = 1**（N-03）· **人工面 = 2**（N-10 / N-15）。
**严重度分布**：阻塞 **0** · 高 **0** · 低 / 信息 **16**（全部为登记项，**均不阻塞**）。

## 20. 终态对账

| 对账项 | 要求 | 终态实测 | 判定 |
|---|---|---|:--:|
| 任务 | 20 / 20 | **20 / 20 completed**（`tasks.json` 20 条；`build.md` §3 + §8 逐条；W1~W5） | ✅ |
| 门禁 | 新增 ∧ 只增 | **3 枚新 node 门禁**（`op-three-tier` 10/0 · `proactivity-guard` 7/0 · `turn-arbitration` 6/0）+ `s0-self-driven` Chromium 45 → **59/0**；受审集合 `V553_W5_AUDITED_FILES`（`gate-integrity` 19/0）；`CHROMIUM_GATES === 9` 逐字 | ✅ |
| `npm test` | 只增不减 | **1283 → 1319 / 0**（+36）；validate 亲跑 1319/0 | ✅ |
| 体积 | 登记 ∧ 超预算如实 ∧ 未跨档位二态显式 | **563,780 → 573,424 B（+9,644）**；超叶预算 5,900 ⇒ **超 3,744 B**；超叶上界 7,600 ⇒ **超 2,044 B**（登记不停机）；**未跨档位** ⇒ 二态显式「无需升档」；`pending-author-line` | ✅（超预算 + 超上界均显式登记） |
| 三冻结面 | 零 diff | `content.js` **177,076 B / sha `52a82620…`** · `pick-layer.js` **34,358 B / sha `77796bab…`** **逐字节零 diff**；`sidepanel.js` **573,424 B** = 登记基线 | ✅ |
| 取代台账 | X-SELF-1~7 三叶终态 | `xSelfLedgerCloseout` 三叶逐项 + owner + 可机核证据；`X-SELF-1` = **未发生取代**（`requestTurn(` 恰 2）· `X-SELF-7` = 本叶落地；`test:supersession` **37/0** | ✅ |
| S0 双面 | 必判项载荷性 | node **15/0** + Chromium **59/0**；**删 `pressCandidate` 门 / 作答后又敲键 / 不经 `op.turn` 槽 / 删护栏缝 / 越限静默 / 越界原因** 逐条注入 ⇒ **双面必红**、还原复绿（R3 §8.10 十项） | ✅ |
| SG 闸门 | 全可行 | **SG-V55-03 = 可得** · **SG-V55-04 = 可得** · **SG-V55-05 = 保段可得**（sha 双命中 + 零 diff） | ✅ |
| 保护段 | 保段 | `journey` **171 PASS** · `binding` **192 PASS**（flake 由 `supersession` 37/0 + SG-V55-05 兜底） | ✅ |
| 规格漂移 | spec 零 diff | `git diff 69133ad..HEAD -- <leaf>/spec.md` = **0 命中**（spec 未在本叶提交内改动） | ✅ |
| ROADMAP | 零 diff（父收口统一登记） | `git diff 69133ad..HEAD -- .sddu/specs-tree-root/ROADMAP.md` = **0** | ✅ |
| 红线路径 | 零命中 | 34 变更文件中 **禁令路径命中 0**（`src/content/**` / `manifest.json` / `dist/content.js` / `dist/pick-layer.js` / `ROADMAP.md` / `docs/v3-*` / `design/**` / `stream-model.ts` / `settings/**` / 判定链 9 项） | ✅ |
| `.sddu` 外触碰 | 收口轮零产品改动 | 收口轮仅改 `.sddu/**`（`build.md` / `state.json` / `TREE.md`）；产品源码零字节 | ✅ |

## 21. 移交项（handover）

| 移交对象 | 项 | 交接要点 |
|---|---|---|
| **父收口**（v5.5 closeout） | **N-01~N-14 / N-16**（除 N-03 / N-10 / N-15） | ① 死导出 / 手写声明 / 工具口径 / 读法差异 / 链深可达性 / 陈旧副本 / sha 口径 / token 口径 / 两面抑制口径 / l2-reverse 受限 —— 逐条**登记**（不改判据）；② **N-04 环境性 flake 家族**（binding / journey；保段凭据 = `supersession` 37/0 + SG-V55-05）；③ **N-05 体积**：叶累计 +9,644（超预算 3,744 / 超上界 2,044，未跨档位）+ 与 v55-2 的**两次升档**一并列为**作者行确认 / 否决事项**；④ ROADMAP F-33 / v0.11.0 统一登记 |
| **人工面** | **N-10 · N-15** | 主动接手体感 / 打断感 / 引导文案可读性 + `auto` 档一次性否决观感 = **⏳ 未执行**（headless 不可合成，**不冒充 PASS**）；并列 v5 人工面 9 项 |
| **v55-1 / v55-2** | — | 无本叶指向二叶的动作；v55-1 N-01（`op-wiring` 数值钉死）已在 R1 `OP-W-⑧` 钉死 `NEXT_AFTER_SETTLE_CALLSITES = 10` **闭环**；v55-2 N-01/N-02 由本叶消费面处置（登记非漂移） |
| **本叶（v55-3）** | — | **无遗留指向本叶的动作**；review 2 个 I 项（I-01 / I-02）已由 `fdcbae8` 微修闭环，validate V1~V9 独立复刻全绿 |

## 22. 对账订正（不静默）

1. **测试计数基线链**：`1283`（v55-2 收口终态）→ `1299`（R1）→ `1312`（R2）→ **`1319`（R3）**；收口轮不改代码 ⇒ 终态口径 = `1319/0`（validate 亲跑同源）。
2. **体积终态口径**：R1 **566,535**（+2,755）→ R2 **573,424**（+6,889）→ R3 **Δ0** ⇒ 本叶累计 **+9,644**。叶预算 / 上界的**超支**以 §17 数值为终态口径；**未跨档位**（无需升档）。
3. **W5 表述口径**（build §8.2 已登记）：启动指令 W5 表述与仓内 `tasks.md`/`tasks.json` 原文**互补非冲突** —— SG-V55-05 探针结论 = 保段可得 ⇒ 317/318 产出为**保段证据**（零文件改写），S0-A 端到端 / 关断复核 / 红线终核属 **320 共享面收口的追加交付**。
4. **`state.json` 终态确认**：本叶 `phase = validated` / `status = completed`（保持）；本轮追加 `phaseHistory` 一条**收口记录**（agent `sddu-build`，artifact = 本收口段）。父 `state.json` 的 children 终态镜像由父收口统一核对。

## 修订记录（v1.4）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.4 | **收口段**（review O-01~O-08 + validate O-1~O-7 + build R2/R3 登记 → **N-01~N-16** 归并 + owner 分布（父收口 13 / 本叶已闭环 1 / 人工面 2）· 终态快照 · 交付物清单 · 终态对账 13 项 · 移交项 · 对账订正 4 条；**零产品代码改动**，`.sddu` 外零触碰） | 2026-09-23 | SDDU Build Agent |
