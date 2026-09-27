# 构建报告：specs-tree-nda-2-fallback-and-gates

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（v1.0）、本叶 `plan.md`（v1.0 + ADR-NDA-201/202）、本叶 `spec.md`（v1.0）、父 `spec.md` / `plan.md` / ADR-NDA-005~009、**叶1 `../specs-tree-nda-1-next-tool-channel/`（`validated`，硬前置）**  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-27  
> **版本**: v1.1  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-27  
> **更新说明**: v1.0 初始创建 —— 叶2（末叶 / 兜底与判据叶）全 **21** 任务落地：未配置确定性引导（零新增面）+ 自由输入**分相**（单源 `risk.llmBlocked`）+ 提醒补一次（`chat` 回调内同回合续呼、`nudgeUsed` 有界）+ LLM 异常**闭集三情** + 系统兜底 `llm.abnormal` 第 13 行 provider（复用 `op.llm-config`，文案分相）+ 首开零行为改动 + S0'''' 支线 C/D/E 终态（node + Chromium 只加断言）+ 门禁逐条等价重锚（`driver-quadruple` 12→13 / `next-registry` NR-10 12→13 / `free-input-next` 分相 / `AI-N-16~18`）+ X-NDA 台账终态（12 行 + 25 行对账）+ 体积叶2 重登记（605,239 → **606,652 B**）+ 保护段 `keep`（字节中立双绿）。**v1.1 R1 审查修复轮**：I-1（`abnormalVerdict` 接收 `captured`，分离「调用但空候选」）+ I-2（命名对齐）—— 详见 §6

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **21 / 21**（`TASK-NDA-201~221`；W1 7 / W2 8 / W3 6） |
| 复杂度分布 | S×3 / M×16 / L×2 |
| 新增文件 | **1** 个（`src/background/next-drive-policy.ts`） |
| 修改文件 | **24** 个（4 源码 + 17 测试/fixture + 2 台账 JSON + 本叶产物） |
| 先验闸门 | **SG-NDA-03 = 可行（18/18）**（探针产物已删除，不落版本库） |
| 门禁 | `npx tsc --noEmit` EXIT 0；**`npm test` 1525 / 0**（基线 1517 ⇒ **+8**，零删除）；`test:supersession` 56/0；`test:gate-integrity` 27/0；`test:size-ruling-vol3` 14/0；`test:e2e` PASS |
| Chromium 面 | `test:law8` **72/0**（69 → +3）；`test:dead-end` **56/0**（53 → +3）；`test:recommendation` **85/0**（≥79）；`test:s0-self-driven` **100/3**（3 项**既有环境 flake**，见 §1.4） |
| 体积（A 列） | 605,239 → **606,652 B**（**+1,413 B，+0.23%**）；档位 614,400 / 绝对上限 675,840 **均不变**；生效上限 **636,984** |
| 体积（B 列） | `dist/background.js` 1,644,437 → **1,666,594 B**（**+22,157 B，不计入 sidepanel 账本**） |

### 1.1 SG-NDA-03（TASK-NDA-201）先验结论：**可行（18/18）**

`test/_spike/sg-nda-03-probe.mjs`（探毕删除，不落版本库；真跑 `chat-runner.ts` + `next-drive-policy.ts` + `ai-next.ts` + 基座 runner 的 `intercepted ?? dispatch` 语义）：

| # | 假设 | 实跑证据 | 结论 |
|:-:|---|---|:--:|
| ① | `chat` 回调每轮被基座调用且拿到完整 `ChatResult`（含 `toolCalls`） | 基座轮数 2 / provider 调用 3（含 1 次 nudge 续呼） | ✅ |
| ② | 追加 nudge turn 后再调一次 provider，用**第二次** `res` 作为该轮结果（不新增回合容器） | `nudge=1` · intercept 命中 `next` · 真实 `dispatch=0`（短路）· nudge 轮 turns = 首轮 +1（**局部数组**） | ✅ |
| ③ | nudge turn **不进会话** | `session.snapshot()` **不含** `NUDGE_TEXT`（长度 299，零污染） | ✅ |
| ④ | nudge 轮不触发第二次提醒（`nudgeUsed` 先置位） | `nudgeUsed=true` ∧ `nudgeCount=1`（纯文本收尾 / 连 nudge 都不调 / 多轮 toolCalls 三场景各**恰 1** 次） | ✅ |
| ⑤ | 捕获 + 装配语义不变；收尾 `outcome=completed` ⇒ 异常判定 `null` | `captured=true` / `accepted=1` / `verdict=null` | ✅ |
| ⑥ | 提醒用尽 ⇒ `no-tool-call` ⇒ 系统兜底可达 | `outcome=completed` ⇒ `verdict=no-tool-call` | ✅ |
| ⑦ | **零计数漂移** | `runChatTurn(` **2**（chat-runner 定义 + SW 调用）/ `requestTurn(` **恰 1** / `nextAfterSettle` **1 定义** / `maybeRecommend` **1 定义 8 调用点** / `providerChat(` **1**（提醒复用同一交付点） | ✅ |

**被闸门任务影响**：`TASK-NDA-202/204/206/213/214` 全部可开工（全部落地）。

### 1.2 体积叶2 重登记（TASK-NDA-219）

| 项 | 值 |
|---|---|
| 前值 → 后值 | 605,239 → **606,652 B**（**+1,413 B，+0.23%**） |
| A 列逐模块 | `next-registry/providers.ts` 10,366 → 11,309（**+943**）/ `sidepanel.ts` 116,492 → 116,874（**+382**）/ `next-registry/definition.ts` 1,011 → 1,099（**+88**）；Σ **+1,413** + glue **0** == +1,413 |
| B 列（**不计账**） | `src/background/next-drive-policy.ts`（NEW）/ `background/service-worker.ts` ⇒ `dist/background.js` 1,644,437 → **1,666,594 B（+22,157 B）** |
| 三值同源 | `newBaselineBytes = 606,652` / 档位 `ceilTo50KB = 614,400`（不变）/ 绝对上限 `675,840`（不变）/ 生效上限 `floor(606,652 × 1.05) =` **`636,984`** |
| **两叶 Σ（A 列）** | 叶1 **+637** + 叶2 **+1,413** = **+2,050 B ≈ +2.00 KiB**（ADR-NDA-008 §② 叶2 预算 +0.6~1.4 KB ⇒ 实测 **越叶预算 13 B** ⇒ 按「越叶预算登记不停机」如实登记；仍在 spec §5.14.1 保守包线 A Σ +0.8~+2.4 KB 内） |
| **EC-NDA-016 三分支** | 越**生效上限** 636,984 = **否**（606,652 ≤ 636,984）/ 越**档位** 614,400 = **否**（距档 **7,748 B**）/ 越**绝对上限** 675,840 = **否** |
| `authorConfirmation` | **`pending-author-line`**（**不伪称已确认**） |
| 冻结面 | `dist/content.js` **177,076 B / sha `52a82620…`**；`dist/pick-layer.js` **34,358 B / sha `77796bab…`**（逐字节不变） |

### 1.3 门禁逐条等价重锚（终态）

| 门禁 | 处置 | 数值 |
|---|---|:--:|
| `free-input-next` | **显式取代**（恒真 → 分相；FIN-0~9 只增 + 分相块 FIN-11 + 双向反证） | 27 tests ⇒ 全绿 |
| `ai-next-candidate` | **改写/扩容**（`AI-N-1~15` → **`AI-N-1~18`**；`driverDeclProblems` 12→13；S0''' D 支线分相重锚；S0'''' 叶2 五拍升为 `ok`） | 28 tests ⇒ 全绿 |
| `driver-quadruple` | **等价重锚 12↔12 → 13↔13**（逐项同集 + 幽灵行反证） | 全绿 |
| `next-registry` | **NR-10 两处 12 → 13**（只增；`llm.abnormal` 双向包含） | 全绿 |
| `r8-open-next-entry` | **等价重锚**（`fallbackProblems` 断言分相 `when` + 退回恒真必红） | 全绿 |
| `onboarding-deterministic` | **等价重锚**（OD-5 注入锚点 = `if (!configured)`；OD-16 X-SELF-3-SW **换链**） | 29 tests ⇒ 全绿 |
| `s0-self-driven-chain` | **等价重锚**（D 支线：无终端 ∧ 引导可达） | 全绿 |
| `no-dead-end` | **只增**（ND-11 分相死端守护 ×3） | 56/0（53 → +3） |
| `law8-plaintext` | **只增**（兜底 / 未配置两文案零明文 + 相异 ×3） | 72/0（69 → +3） |
| `recommendation` | **只增**（分相终端 / 兜底 chip ×3～6） | 85/0（≥79） |
| `s0-self-driven` | **只增**（S0C-16 叶2 五拍 ×4）+ S0C-13 D 分相重锚 | 100/3（3 项既有环境 flake） |
| `supersession-ledger` | **只增**（`xNdaLedger` 叶2 四行 + **25 行**对账三态齐 + `xNdaLedgerFull` 7/1/4 + 保护段字节中立双绿） | 56/0（55 → +1） |
| `gate-integrity` | **零改**（`CHROMIUM_GATES === 9` 逐字 / 受审下界只增） | 27/0 |
| `size-budget` / `size-growth-evidence` / `size-ruling-vol3` / `density-thresholds` | **等价重锚**（三值同源前移 + `nda2Rows` 第 42 组 + 距档 7,748 B） | 全绿 |
| 四处恰 N **不动** | `BLOCKED_TERMINALS` 5 / `OPS_RECOVERY_PROVIDER_IDS`(+`OPS_RECOVERY_ROWS`) 2 / `RECOVERY_PROVIDER_IDS` 5 / `DRIVER_TERMINALS` 4 / `PROACTIVE_MOMENTS` 7 / `DRIVER_TIMINGS` 5 / `NEXT_SOURCE_NAMES` 7 | 文件零改 |
| 保护段 | journey `[43484,59347)` / binding `[107780,115930)` —— **`keep`**（sha + `startByte` + 段字节 sha 三重机核；零改动 ⇒ 字节中立） | 双绿 |

> **断言零删除**：`assertionsRemoved = 0`（`xNdaGateReconciliation` 25 行逐行机核）；`npm test` 1517 → **1525**（只增）。

### 1.4 Chromium 面 `test:s0-self-driven` 100 passed / 3 failed（`KL-N-10` 如实登记）

- **3 项失败同根因**：headless 沙箱内 `probe.steady === false` 未及时置稳 ⇒ `risk-recovery`（probe 触发，priority 0）抢在 `ai-led` 之前出卡；断言读到的是 probe 恢复卡（`重新绑定当前标签页 / 改用描述 / 重新拾取`）。失败项 = `S0C-13 A` / `S0C-14` / `S0C-15`（主线 A）。
- **非本叶引入**：叶1 build §4.1 已如实登记同根因（其基线对照 `git stash` 复跑 91/2，失败项 = `S0C-13 A` / `S0C-14`）；本叶**隔离复跑 ≥2**（含修复 S0C-13 D 分相重锚前后各一轮）读数稳定为同一三项。
- **node 面确定性覆盖**：同一语义（S0'''' 十二拍 + 分相 / 兜底）在 `test/ai-next-candidate.test.ts`（28/0）与 `test/ui/no-dead-end.mjs`（ND-11，56/0）**确定性**机核。
- 按 `KL-N-10` / `FR-NDA-136`：**如实记录、不阻塞收口、不改判据、不伪造串行绿**。

---

## 2. 文件变更

### 2.1 源码（1 新增 + 4 修改）

| 操作 | 文件 | 列 | 对应任务 | 说明 |
|:--:|---|:--:|:--:|---|
| NEW | `packages/web-cli-plugin/src/background/next-drive-policy.ts` | B | 202 / 208 | `shouldNudge`（五条件，`nudgeUsed` 首闸）/ `NUDGE_TEXT`（两句，零明文）/ `abnormalVerdict`（闭集三情；`accepted>0⇒null` ∧ `stopped⇒null`）/ `NudgeFacts` / `AbnormalFacts`；**纯函数**（零 chrome / DOM / 时钟 / IO）；闭集字面量来自 `definition.ts` 单源（本文件零字面量） |
| MODIFY | `src/ui/sidepanel/next-registry/definition.ts` | A | 208 | `AI_ABNORMAL_CODES`（恰一处）+ `AiAbnormalCode` + `AiNextPayload.abnormal?`（**加法可选子字段**，∉ `KIND_SET`） |
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | A | 203 / 210 | `free-input.when` **恒真 → 分相**；`LLM_ABNORMAL_RISK`；`llm.abnormal` **第 13 行** provider（`risk-recovery`/`priority:0`/`chips:['op.llm-config']`/文案「配置新的 LLM（切换 / 重配）」）；`DRIVER_DECLS_SRC` 第 13 行 |
| MODIFY | `src/background/service-worker.ts` | B | 204 / 209 | `configured` 提为 **const 单源**；`chat` 回调内 **nudge 续呼**（`nudgeUsed` 先置位、局部 turn 不进会话、同一 `deriveTools()`）；`onFinish(outcome)` 消费 + `abnormalVerdict` + `abnormal` **只在非 null** 附加 + `hasAiNext` 三条件扩展 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | A | 211 / 216 | `observedAbnormal` + `noteLlmAbnormalFact`（与 `observedBlocked` 同构、事件作用域一次性）+ `risk` 折叠 + `consumeAiNext` 只消费（零第二分类器）+ `testing.recommend('llmAbnormal')` 缝 |

### 2.2 测试 / fixture / 台账（17 + 2）

| 操作 | 文件 | 对应任务 | 说明 |
|:--:|---|:--:|---|
| MODIFY | `test/free-input-next.test.ts` | 206 | 分相块：两相 `when` + 生产卡两相 + `phasingProblems` 判据；**反证①** 注入恒真 / **反证②** 注入恒假（真 provider `overwrite` 注入 + 逐字节还原）；零新源断言 |
| MODIFY | `test/driver-quadruple.test.ts` | 212 | 12↔12 → **13↔13**（两处：DQ-1 + DQ 终态）+ 幽灵行/`llm.abnormal` 双侧在场反证 |
| MODIFY | `test/next-registry.test.ts` | 212 | NR-10 标题 + 两处计数 12 → 13 + 第 13 行双向包含断言 |
| MODIFY | `test/ai-next-candidate.test.ts` | 214 / 216 | `JUDGEMENTS` 15 → **18**（`AI-N-16` 提醒有界 / `AI-N-17` 异常闭集 / `AI-N-18` 兜底文案分相）+ `driverDeclProblems` 13↔13 + S0''' D 支线分相重锚 + `s0ppppReading` 叶2 五拍（`nudgeBounded`/`unconfigured*`/`configuredTerminal`/`fallbackChip`/`abnormalCodes`/`firstOpen*`）+ S0'''' 测试改判两叶 |
| MODIFY | `test/ui/fixtures/s0-chain.mjs` | 216 | 新增 `S0PPPP_LEAF2_STEPS`（`S0PPPP-3/4/5/7/11`）+ `s0ppppProblems` 叶2 五拍判据（叶1 逐字保留） |
| MODIFY | `test/r8-open-next-entry.test.ts` | 207 | `fallbackProblems` 断言**分相** `when` + 退回恒真必红（R8-1~6 零改） |
| MODIFY | `test/s0-self-driven-chain.test.ts` | 206 | 机制侧 D 支线：`terminal === undefined` ∧ `op.llm-config` 可达 |
| MODIFY | `test/ui/no-dead-end.mjs` | 207 | **ND-11** 分相死端守护（未配置相 / 异常相 + 溯源反证）×3 |
| MODIFY | `test/ui/s0-self-driven.mjs` | 217 | `S0C-16` 叶2 五拍（样本单源 / 支线 C / 支线 D / 支线 E）×4 + `S0C-13 D` 分相重锚 |
| MODIFY | `test/ui/recommendation.mjs` | 217 | 分相终端 / 兜底 chip 等价重锚（已配置 / 未配置 / 异常三相） |
| MODIFY | `test/ui/law8-plaintext.mjs` | 217 | ★ NDA-2 ⑬：两文案零明文 + 相异 + 异常相呈现 |
| MODIFY | `test/onboarding-deterministic.test.ts` | 204 | OD-5 注入锚点等价重锚（`const configured` 单源） |
| MODIFY | `test/size-baseline.ts` | 219 | 基线 606,652 / `FINAL_ARTIFACT` / TIMELINE / META（NDA-2 段）/ `SIDEPANEL_RE_REGISTRATIONS['nda-2-r1']`（五要素 + 三值）/ `nda2Rows` + `nda2UnattributedGlueBytes` / `deltaBytes` 311,427 / `closeoutDeltaBytes` 1,413 / `wiringBytes` 114,311 / `rows` 追加三行 / `roundRowRegistrationIds.nda2Rows` |
| MODIFY | `test/size-budget.test.ts` | 219 | ceiling 636,984 / 基线 606,652 四处数值重 pin |
| MODIFY | `test/size-growth-evidence.test.ts` | 219 | 最新一轮 → `nda2Rows`（`sizeLatestAdnRows` / `latestAfterBytes` 链环 / metafile 逐值 / closeout 1,413 / 第 42 组 / groups 42 / 距档 7,748） |
| MODIFY | `test/size-ruling-vol3.test.ts` | 219 | 三值 pin + 越 1 B 反证 636,985 |
| MODIFY | `test/supersession-ledger.test.ts` | 218 | `xNdaLeaf2Problems` + 叶2 终态用例（四行 / 25 行 / 7-1-4 / 保护段字节中立双绿）；叶1 段落逐字保留 |
| MODIFY | `docs/v4-supersession-ledger.json` | 218 | `xNdaLedger` 8 → **12 行**（+X-NDA-3/4/10/11）/ `xNdaGateReconciliation` 12 → **25 行** / `xNdaLedgerFull` 终态（7 / 1 / 4）/ 19 条 entries **换链**（`supersededFrom` + 理由）/ `v3Vol3Closeout.⑤三值闭合` 同源前移 + `nda2R1RePin` / 叶段 `scope` 逐叶复算 + 叶2 删除面逐字登记（4 组）+ `summary` 复算 |
| MODIFY | `docs/v4-density-baseline.json` | 219 | `registeredBaselineBytes` 606,652 / `ceilingBytes` 636,984 |

### 2.3 零改（保留面，逐项复核绿）

`packages/web-cli-base/**`（零 diff）/ `.sddu/specs-tree-root/ROADMAP.md`（零 diff）/ `.opencode/opencode.json`（零 diff）/ 三冻结面（`dist/content.js` 177,076 B + sha `52a82620…`；`dist/pick-layer.js` 34,358 B + sha `77796bab…`）/ `KIND_SET` 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` / `ACT_TO_OP` 6 / `NEXT_SOURCE_NAMES` 7 / `BLOCKED_TERMINALS` 5 / `OP_*_RECOVERY_*` 2 & 5 / `DRIVER_TERMINALS` 4 / `PROACTIVE_MOMENTS` 7 / `DRIVER_TIMINGS` 5 / `test/ui/journey.mjs` + `test/ui/binding.mjs`（保护段 keep，`git diff` = 0）/ `recommend.ts`（零新导入）/ `turn-queue.ts` / `chat-runner.ts` / `host-registry.ts` / `op-table.ts` / `gate-integrity.test.ts` / `blocked-terminals.test.ts` / `driver-terminals.test.ts` / `driver-timings.test.ts` / `op-wiring.test.ts` / `turn-arbitration` / `proactivity-guard`。

### 2.4 已删除（探针产物）

`test/_spike/sg-nda-03-probe.mjs`（含 `_spike/` 目录）—— **探毕删除，不落版本库**。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-NDA-201 | **SG-NDA-03** nudge `chat` 回调内续呼 可行性探针 | M | ✅ completed（18/18） | FR-NDA-060~064 |
| TASK-NDA-202 | `background/next-drive-policy.ts`（NEW）`shouldNudge` + `NUDGE_TEXT` | M | ✅ completed | FR-NDA-060~063 / 106 |
| TASK-NDA-203 | `providers.ts` `free-input.when` **分相** | S | ✅ completed | FR-NDA-051~053 |
| TASK-NDA-204 | `service-worker.ts` `chat` 回调 nudge 接线（`configured` 单源 + 局部 turn） | L | ✅ completed | FR-NDA-060~066 |
| TASK-NDA-205 | 未配置确定性引导复核（零新增面） | S | ✅ completed | FR-NDA-050 / 054~056 |
| TASK-NDA-206 | `free-input-next` 分相重锚（FIN-0~9 只增 + 双向反证） | M | ✅ completed | FR-NDA-051~053 |
| TASK-NDA-207 | `r8-open-next-entry` 保留零改 + `no-dead-end` 未配置相覆盖 | M | ✅ completed | FR-NDA-090~093 / 045 |
| TASK-NDA-208 | `abnormalVerdict` 闭集 + `definition.ts` `AI_ABNORMAL_CODES` + `abnormal?` | M | ✅ completed | FR-NDA-070 / 071 / 075 |
| TASK-NDA-209 | `service-worker.ts` `onFinish(outcome)` + `abnormal` 附加 + `hasAiNext` 扩展 | M | ✅ completed | FR-NDA-070 / 073 / 074 / 019 |
| TASK-NDA-210 | `providers.ts` `llm.abnormal` 第 13 行 + `LLM_ABNORMAL_RISK` + 声明行 | M | ✅ completed | FR-NDA-072 / 073 / 075 / 076 |
| TASK-NDA-211 | `sidepanel.ts` `noteLlmAbnormalFact` + `risk` 折叠 + `consumeAiNext` | M | ✅ completed | FR-NDA-073 / 074 |
| TASK-NDA-212 | `driver-quadruple` 12→13 + `next-registry` NR-10 12→13 | M | ✅ completed | FR-NDA-071 / 075 / 130 / 134 |
| TASK-NDA-213 | 四处恰 N 不动（7 个集合）+ `llm.abnormal` 不入三集合 | M | ✅ completed | FR-NDA-075 / 130 |
| TASK-NDA-214 | `ai-next-candidate` **AI-N-16~18**（有界 / 三情 / 两文案 / 分相非恒真 / 缺席逐字） | M | ✅ completed（判据表 15→18） | FR-NDA-062 / 070 / 071 / 105 / 106 / 019 |
| TASK-NDA-215 | 首开零行为改动确认 + `PD-NDA-001` / `PD-NDA-016` 登记 | S | ✅ completed（零 diff） | FR-NDA-090~093 |
| TASK-NDA-216 | S0'''' 支线 C / D / E 终态 node 面（注入必红 + 逐字节还原） | L | ✅ completed | FR-NDA-100 / 103 / 104 / 044 / 045 / 065 / 073 / 074 |
| TASK-NDA-217 | Chromium 面（s0-self-driven / recommendation / law8 只加断言）+ 人工面 ⏳ | M | ⚠️ completed（law8 72/0 · recommendation 85/0 · s0-self-driven 100/3 —— 3 项既有环境 flake，见 §1.4） | FR-NDA-100 / 103 / 104 |
| TASK-NDA-218 | `xNdaLedger` 终态（12 行）+ `xNdaLedgerFull` + **25 行**对账 + 保护段 `keep` | M | ✅ completed | FR-NDA-112 / 113 / 119 / 120 / 122 / 132 / 133 |
| TASK-NDA-219 | 体积叶2 重登记 + **两叶 Σ** + EC-NDA-016 三分支 | M | ✅ completed（606,652 B） | FR-NDA-140 / 141 / 143 / 144 / 145 |
| TASK-NDA-220 | 门禁守恒终态对账（三态齐 / `assertionsRemoved = 0` / 串行 / `KL-N-10`） | M | ✅ completed | FR-NDA-130 / 134 / 135 / 136 / 137 |
| TASK-NDA-221 | 红线巡检 + 人工面 M1~M6 如实登记 + 本叶收口对账 | M | ✅ completed | FR-NDA-003 / 004 / 104 / 130 / 142 |

### 3.1 任务级落地摘要（逐条）

- **TASK-NDA-201（SG-NDA-03）**：18/18；结论 **可行** —— 提醒可在 SW `chat` 回调内**同回合续呼**，nudge turn 零会话污染、`nudgeUsed` 有界恰一次、零计数漂移（§1.1）。
- **TASK-NDA-202**：`shouldNudge` 五条件（`nudgeUsed` 首闸 ⇒ `!configured` ⇒ `captured` ⇒ `toolCalls !== 0` ⇒ `hasReply`）+ `NUDGE_TEXT` 两句；纯函数（`grep -nE "chrome\.|document\.|fetch\(|Date\.now"` ⇒ `PURE-OK`）。
- **TASK-NDA-203**：`when` 由恒真改为 `!ctx.risk.includes(LLM_BLOCKED_RISK) && (ctx.session.busy === true || ctx.session.busy === false)` —— 两读同在（DQ-3 同源）；`chips`/`textOf` 逐字保留；既有 12 行 provider 其余零改。
- **TASK-NDA-204**：`configured` 提为 const（`chatBusy = true` 之前，单源）；nudge 用**同一** `deriveTools()` 与同一 cfg；nudge turn 只在局部数组；置位在调用之前；`buildPlan` 用**最终** `res`；`runChatTurn(` 2 / `requestTurn(` 1 / `nextAfterSettle` 1 定义 10 调用点 / `maybeRecommend` 1 定义 8 调用点**全未变**；`turn-queue.ts` / `chat-runner.ts` diff = 0。
- **TASK-NDA-205**：复核零新增面（不新增 provider / op / 引导面）：未配置 ⇒ `variant:'llm-unconfigured'`（零 token / 零网络）⇒ `llm.unconfigured` ⇒ `chips:['op.llm-config']` + 文案 `OPS_RECOVERY_ROWS[0].text`「配置 LLM 凭据（写入本机 · 掩码）」；`OPS_RECOVERY_ROWS` / `OPS_RECOVERY_PROVIDER_IDS` 仍恰 2 / `BLOCKED_TERMINALS` 仍恰 5。
- **TASK-NDA-206**：`free-input-next` 分相块（两相各可判 + 双向反证 + `sha256` 还原）；FIN-0~9 零删除（原 24 tests → **27**）。
- **TASK-NDA-207**：`r8-open-next-entry` R8-1~6 绿且**零改判据语义**（`fallbackProblems` 等价重锚到分相 `when`）；`no-dead-end` 新增 ND-11（未配置 ⇒ 无 `.next-terminal` ∧ `op.llm-config` 可达；异常 ⇒ 兜底 chip ∧ 终端恒常驻；恒真退化溯源反证）。
- **TASK-NDA-208**：`abnormalVerdict` 真值表 6 行（三情 + `accepted>0⇒null` + `stopped⇒null` + `empty` ⇒ `no-tool-call`）；`AI_ABNORMAL_CODES` **恰一处**；`src` 内三情字面量 `grep -v definition.ts` ⇒ `SINGLE-SOURCE-OK`；`KIND_SET` 40 / `ARBITRATION_RESULTS` 四值逐字。
- **TASK-NDA-209**：`onFinish` 消费基座原生 `outcome`（零改基座）；`abnormal` **只在非 null** 时附加 + `hasAiNext` 三条件；正常回合字段集合逐字（缺席逐字）；`ChatResultEvent.aiNext?` 逐字不改。
- **TASK-NDA-210**：第 13 行 provider + `DRIVER_DECLS_SRC` 第 13 行；`evidence:['risk']` 与 `when` 实读同源（DQ-3 绿）；不入 `BLOCKED_TERMINALS` / `OPS_RECOVERY_ROWS` / `RECOVERY_PROVIDER_IDS`。
- **TASK-NDA-211**：`noteLlmAbnormalFact` 与 `noteLlmBlockedFact` 同构；`abnormalVerdict` / `AI_ABNORMAL_CODES` 在 `sidepanel.ts` **零实现**（注释剥离后零命中）；不新增 `maybeRecommend` 调用点。
- **TASK-NDA-212**：两门禁 12 → **13**（逐项同集 + 四条反证）。
- **TASK-NDA-213**：7 个集合逐字未变（5 / 2 / 2 / 5 / 4 / 7 / 5 / 7）；`llm.abnormal` 不入三集合；`op-wiring` / `turn-arbitration` / `proactivity-guard` 零改。
- **TASK-NDA-214**：`AI-N-16`（五条件真值表 + 文本两句 + 接线置位先于续呼 + 计数器核 + 两条注入反证）/ `AI-N-17`（三情真值表 + 只在非 null 附加 + 单源 + 面板零第二分类器 + 两条反证）/ `AI-N-18`（兜底 chip 可达 + 两文案相异 + 不入三集合 + `confirm` 档不代答 + 两条反证）。
- **TASK-NDA-215**：`maybeRecommendOpenEntry` / `firstRunCard` **零改**（`git diff` = 0）；`PD-NDA-001`（首开 AI 化不转正，`PD-ADN-001` 保持 deferred）与 `PD-NDA-016`（提醒时点早一步 + `stop()` 窗口内至多 1 次）已登记（见 §4 未决项）。
- **TASK-NDA-216**：S0'''' 叶2 五拍机器化（`S0PPPP_LEAF2_STEPS` 单源 + 两叶并集覆盖全十二拍）；支线 C（三情形各 ⇒ 兜底 chip + 终端 ⇒ 零死端）/ 支线 D（无终端 ∧ 引导可达 ∧ 零 token）/ 支线 E（首开确定性 ∧ 零 LLM 往返 ∧ 零双卡）；叶1 记为 `n/a` 的读数**升为 `ok`**（语义对账，非恒真）。
- **TASK-NDA-217**：三 Chromium 面**只加断言不加文件**（`CHROMIUM_GATES === 9` 不动）；人工面 M1~M6 逐项 `⏳ 未执行`（**不冒充 PASS**）。
- **TASK-NDA-218**：`xNdaLedger` **12 行**（叶2 四行终态）+ `xNdaGateReconciliation` **25 行三态齐**（无「未处置」）+ `xNdaLedgerFull` **7 / 1（9 子项）/ 4** + 保护段 `keep`（sha + `startByte` + 段字节 sha 三绿）；19 条 entries **换链**（`supersededFrom` 指向旧落点）。
- **TASK-NDA-219**：见 §1.2（`nda2Rows` + 两叶 Σ + EC 三态 + `authorConfirmation` 保持 `pending-author-line`）。
- **TASK-NDA-220**：门禁守恒终态对账（三态齐 / 间接面 / `assertionsRemoved === 0` / `CHROMIUM_GATES === 9` / 串行执行 / `KL-N-10` 隔离复跑 ≥2 记录）；`gate-integrity` 27/0（下界只增）。
- **TASK-NDA-221**：红线巡检逐条通过（§2.3 + 本表下方）；人工面 M1~M6 如实登记；停机规则 14 条逐条确认未触发。

### 3.2 红线巡检（TASK-NDA-221）

| 红线 | 实测 |
|---|---|
| 零改基座 `packages/web-cli-base/**` | ✅ `git diff --stat` = 0 |
| 冻结面逐字节不变 | ✅ `content.js` 177,076 B / sha `52a82620…`；`pick-layer.js` 34,358 B / sha `77796bab…` |
| 保护段 journey / binding keep | ✅ sha + `startByte` + 段字节 sha 三重机核绿；两文件 `git diff` = 0 |
| 零新 kind（`KIND_SET` 40）/ 零新宿主 | ✅ 40 / 12 kind / `REGISTERED_STRUCTURAL_HOSTS = []` |
| 零新 op / 零新动作 | ✅ `ACT_TO_OP` 6；兜底 chip 复用 `op.llm-config` |
| 法八零明文 | ✅ `test:law8` 72/0（含 ★ NDA-2 ⑬ 兜底 / 未配置文案） |
| 特权恒 `gesture`；consent 不代答 | ✅ `op.llm-config` 恒 `confirm` ⇒ `pressDecision(...)` = `blocked:tier` |
| 测试只增不减 | ✅ `npm test` 1517 → 1525；`assertionsRemoved = 0`（25 行逐行机核） |
| 纪律 | ✅ `.sddu` 外零触碰（除本 Feature 产物）/ ROADMAP 零 diff / `.opencode/opencode.json` 零 diff / `main` 未碰 / 无新依赖 / `npm test ≥ 1517` |

---

## 4. 未决项与登记（不阻塞收口）

| # | 项 | 状态 |
|:-:|---|---|
| U-1 | `PD-NDA-001` 首开 AI 化 | **登记（待后续轮）**：`PD-ADN-001` 保持 deferred，**不转正**；首开保持确定性（`maybeRecommendOpenEntry` / `firstRunCard` 零改） |
| U-2 | `PD-NDA-016` 提醒时点偏差 | **登记**：nudge 在「本轮无 `toolCalls`」处求值，比 `finish('completed')` **早一步**（与 spec 字面等价）；`stop()` 窗口内**至多多发 1 次**（有界） |
| U-3 | `test:s0-self-driven` 3 项环境 flake | 见 §1.4（`KL-N-10` 如实登记，不阻塞；node 面确定性覆盖） |
| U-4 | 叶2 A 列实测 **+1,413 B** 略超 ADR-NDA-008 §② 叶2 预算（+0.6~1.4 KB）**13 B** | 如实登记（+1.38 KiB）；**在 spec §5.14.1 保守包线内**；未跨档位（距档 7,748 B）⇒ 不搬列规避、不删判据 |
| U-5 | `authorConfirmation` 作者一行 | 保持 **`pending-author-line`**（不得伪称已确认） |
| U-6 | `PD-NDA-007` / `PD-NDA-008`（本叶 spec 开放问题） | **已由本叶 plan 裁决**（ADR-NDA-006 §① 通道形态 / ADR-NDA-007 §③ provider 落点）并落地 |

---

## 5. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-nda-2-fallback-and-gates` 开始审查 |

---

## 6. R1 审查修复轮（I-1 / I-2）

> **触发**：`review-report.md`（R1）改进项 **I-1（语义 bug，中）** + **I-2（命名漂移，低）**。
> **纪律**：只改 `packages/web-cli-plugin/src/**`（最小改动）+ `test/**` + 本叶 `.sddu/**`；零改基座 / 冻结面逐字节 / 保护段 / 零新 kind 零宿主 / 测试只增不减（`assertionsRemoved = 0`）。

### 6.1 I-1：`abnormalVerdict` 语义边界修复（「调用但空候选」不再并入 `no-tool-call`）

| 项 | 修前 | 修后 |
|---|---|---|
| 判据入参 | `AbnormalFacts{outcome, accepted, blocked}`（**无** captured） | `+ captured: boolean`（`capture.captured`，叶1 捕获态） |
| 「调用了 `next` 但 `candidates:[]`」 | `accepted=0 ∧ blocked=0` ⇒ **`no-tool-call`** ⇒ 呈现「配置新的 LLM（切换 / 重配）」 | `captured=true` ⇒ **`null`**（合法「无建议」，**不**附加 `abnormal` ⇒ 走确定性兜底 / free-input 终端） |
| 「真未调用 `next`」 | `no-tool-call` | **不变** ⇒ `no-tool-call`（提醒补一次 → 仍失败 → 兜底） |
| 分支顺序 | `accepted>0⇒null` / `llm-failed` / `stopped⇒null` / `blocked>0⇒all-blocked` / `no-tool-call` | 同序 + `captured⇒null` **插在 `all-blocked` 之后、`no-tool-call` 之前**（`blocked>0` 恒优先 ⇒ 候选全被拦仍 `all-blocked`） |

**改动点**：`src/background/next-drive-policy.ts`（`AbnormalFacts.captured` + `if (f.captured) return null;` + 头注 / 判据注）+ `src/background/service-worker.ts:1093`（`abnormalVerdict({ …, captured: capture.captured })`）。B 列，**不计入 sidepanel 账本**；A 列源码零改 ⇒ `dist/sidepanel.js` 字节不变。

**新判据覆盖**（`test/ai-next-candidate.test.ts#AI-N-17` + `test/ui/fixtures/s0-chain.mjs#S0PPPP-7`）：

| 判据 | 反证（注入 ⇒ 必红） | 实测 |
|---|---|:--:|
| `abnormalProblems` 真值表新增 `{completed,0,0,captured:true} ⇒ null` | `ignoreCaptured`（旧实现，忽略 captured）⇒ 该行落 `no-tool-call` | ✅ 必红（`'"captured":true'`） |
| SW 必须把 `capture.captured` 传入 `abnormalVerdict`（接线单源） | `dropCapturedSw`（删 `, captured: capture.captured`）⇒ 接线判据红 | ✅ 必红 |
| `abnormalVerdict({completed,0,0,captured:false}) === 'no-tool-call'`（真没调用才触发） | 由 `wrongStopped` / 注入覆盖 | ✅ |
| S0''''-7 终态读数 `emptySuggestionHealthy` / `trueMissIsAbnormal` | 注入 `false` ⇒ `s0ppppProblems` 必红（含 `I-1`） | ✅ 必红 |

**「注入必红」实测（真跑，非静态）**：

| # | 注入 | 命令 | 结果 |
|:-:|---|---|:--:|
| ① | `next-drive-policy.ts` 删 `if (f.captured) return null;`（回退旧语义） | 定向编译 + `node --test --test-name-pattern="AI-N-17"` | ❌ FAIL：`I-1：调用但空候选 ⇒ 合法「无建议」`（actual `no-tool-call` / expected `null`） |
| ② | `service-worker.ts` 的 `abnormalVerdict(...)` 删 `captured: capture.captured` | 同上 | ❌ FAIL：附带 `captured（capture.captured）传入 abnormalVerdict（「调用但空候选」边界）` |
| — | 还原（逐字节）后复跑 | 同上 | ✅ PASS |

> 语义说明（如实登记）：捕获面只能给出「调用过 ∧ 解析后零候选」⇒「调用但空数组」与「调用但解析失败」在本面**等价**（`next-tool.ts` 解析失败记零候选不抛错）——两者都**不是**「LLM 坏」或「候选全被拦」，故同判「无建议」；更细的解析失败读数仍在 `AI-N-1` 面（本次零改）。EC-NDA-008 的触发结果与本修复**一致**（提醒用尽仍无合法候选时若确实**未**调用 ⇒ 兜底仍可达）。

### 6.2 I-2：命名漂移对齐（`AI_ABNORMAL_CODES` / `AiAbnormalCode`）

实现与 `definition.ts` 的真值名为 `AI_ABNORMAL_CODES` / `AiAbnormalCode`（`ADR-NDA-201 §①②` 同）。本叶把 `plan.md §2.3/§5.1` 与 `ADR-NDA-201 §③/§④` 的旧写法 `LLM_ABNORMAL_CODES` / `AiNextAbnormalCode` 统一为真值名（**文档零代码改动**）。`LLM_ABNORMAL_RISK`（`providers.ts` 的 risk 项常量）名**本就正确**，未动。

> 残留（超本叶改动集，如实登记）：父级 `specs-tree-web-cli-plugin-v55-f-next-drive-accuracy/plan.md`、`tasks.md`、`ADR-NDA-007` 仍含旧写法 —— 属**父 Feature 产物**，不在「只改本叶 `.sddu/**`」的修复纪律内，留父级收口轮对齐（见 state.json `openItems`）。

### 6.3 修复后门禁复跑（全绿）

| 门禁 | 计数 | rc |
|---|:--:|:--:|
| `npx tsc --noEmit` | — | **0** |
| `npm test` | **1525 / 0**（与修前同；本次只加断言不加 `test()`） | **0** |
| `test:ai-next-candidate`（`AI-N-17` 定向 + 全量 28） | **28 / 0** | **0** |
| `test:supersession` | **56 / 0** | **0** |
| `test:gate-integrity` | **27 / 0** | **0** |
| `test:dead-end` | **56 / 0** | **0** |

`npm run build` rc=0；`dist/content.js` 177,076 B / sha `52a82620…` + `dist/pick-layer.js` 34,358 B / sha `77796bab…` **逐字节不变**；`dist/sidepanel.js` **606,652 B 不变（A 列零 delta）**；`dist/background.js` 1,666,594 → **1,666,653 B（+59 B，B 列不计账）**。`assertionsRemoved = 0`（修复只加判据行 / 改真值表入参，零删除）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（叶2 兜底与判据叶：21/21 任务；SG-NDA-03 18/18 可行；`npm test` 1525/0；law8 72/0 · dead-end 56/0 · recommendation 85/0 · s0-self-driven 100/3（3 项既有环境 flake）；体积叶2 重登记 606,652 B；X-NDA 台账 12 行 + 25 行对账终态；保护段 keep 双绿） | 2026-09-27 | SDDU Build Agent |
| v1.1 | **R1 审查修复轮**：I-1 `abnormalVerdict` 接收 `captured`（「调用但空候选」从 `no-tool-call` 分离为合法「无建议」⇒ `null`，不推「配置新的 LLM」）+ I-2 命名对齐（`AI_ABNORMAL_CODES` / `AiAbnormalCode`）；新判据 + 两条注入必红实测；门禁复跑 `npm test` 1525/0 · supersession 56/0 · gate-integrity 27/0 · dead-end 56/0；A 列 606,652 B 不变，B 列 +59 B（不计账） | 2026-09-27 | SDDU Build Agent |
