# 审查报告：specs-tree-v55-2-deterministic-onboarding

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C40 审查清单及四维度指引）
> **前置依赖**: `review.md`、本叶 `spec.md`（23 承载 FR / 12 NFR / 7 EC）、本叶 `plan.md`、父 `ADR-V55-005/006/007/010/011/012`、本叶 `build.md`（R1 + R2 收口段）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-23
> **审查轮次**: **R1**（收口叶 16/16 任务完成后的首轮审查）
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（40 Cx 逐项；0 BLOCK / 4 I / 6 O；S0 双面 + 运行期断点注入 + 冻结面 sha 亲跑复核）

## 0. 审查范围与执行

| 项 | 值 |
|---|---|
| Feature | specs-tree-v55-2-deterministic-onboarding（V5.5-2 主题① 确定性系统流） |
| 分支 / HEAD | `feature/web-cli-plugin` / `a91d4b7`（R1 `9781e41` + R2 `a91d4b7`，**16/16 任务 completed**） |
| 被审成品 | `dist/sidepanel.js` = **563,145 B**（实测 `stat -c %s`，与 R2 登记同源） |
| 审查方式 | 静态分析为主 + 用户点名的 5 组动手复核（S0 双面 / 运行期断点注入 / 冻结面 sha / 计数 / 台账） |
| 亲跑 node 门禁 | `npm test` **1277/0** · `test:onboarding` **23/0** · `test:s0-self-driven-chain` **11/0** · `test:supersession` **36/0** · `test:gate-integrity` **18/0** · `test:size-ruling-vol3` **12/0** · `test:design-contract` **19/0** |
| 亲跑 Chromium 门禁 | `s0-self-driven` **42/0** · `law8` **36/0** · `stream` **76/0** · `dead-end` **49/0** · `ask-auth` **78/0** · `recommendation` **72/0** · `journey` **171 PASS** · `binding` **环境性 FAIL**（见 O-04） |
| 运行期断点注入 | 回退 R2 resolver 归属修复 ⇒ `test:s0-self-driven` **38 passed / 4 failed**（复现 R1 断链）⇒ `git checkout` 还原（sha 逐字节相同）⇒ 重建 ⇒ **42/0** |
| 冻结面实测 | `content.js` **177,076 B** / sha `52a82620…b5f6` · `pick-layer.js` **34,358 B** / sha `77796bab…575e` · `sidepanel.js` **563,145 B** |

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 40 |
| 通过（✅） | **36** |
| 警告（⚠️） | **4**（C2 / C6 / C7 / C20，对应 I-01~I-04） |
| 失败（❌） | **0** |
| 阻塞问题 | **0** |
| 改进项（I） | **4**（I-01 / I-02 / I-03 / I-04） |
| 观察项（O） | **6**（O-01~O-06） |

> 结论 = ✅ **通过**（0 BLOCK；4 个 I 均为非阻塞口径 / 登记项，可在 validate 期间或后续轮订正）。

## 2. 逐项审查结果（C1~C40）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `runChat` 前置判据源码序 + early return + 零 provider 调用 | FR-SELF-040 | ✅ | `service-worker.ts:891-909`：`isLlmConfigured(...)`（`:898`）< `chatBusy = true;`（`:910`）< `providerChat(`（`:926`）；未配置 ⇒ `chat-result{variant:'llm-unconfigured'}` + `return`，**零 provider 调用 / 零 token / 无 `llmErrorEvent`**。`OD-5` 亲跑绿；删判据 / early return 后移两类注入必红 | 低 |
| C2 | 双源并存（被动保留 + 主动新增）幂等、同一终态词汇、恢复链零改写 | FR-SELF-041 / 102 | ⚠️ | 被动侧 `noteLlmBlockedFact` **4 生产调用点逐字保留**（`:3462/:3473/:3477` + 状态路径），主动侧折叠 `noteLlmBlockedFact(false)`（`:3581`）⇒ 同一 `observedBlocked: Set` ⇒ 幂等；`OPS_RECOVERY_ROWS` 2 行逐字（`BT-6`）。**但**：主动识别经 `noteLlmBlockedFact` 的门 `llmLoaded && !llmSummary?.configured`（`:1340`）⇒ 双源**不完全独立**（见 I-04） | 中 |
| C3 | 引导流**恰 4 步**单源 + 复用既有 params 序列 | FR-SELF-042 | ✅ | `ONBOARD_STEPS` 恰 4（`detect→guide→collect→complete`，`Object.freeze`）单处声明；`ONBOARD_COLLECT_STEPS` 读 `OP_PARAM_SEQUENCE['op.llm-config']`（第二份序列 ⇒ FAIL）。`OD-8`（删步 / 乱序 / 第二序列反证）+ `stream` ⑯（`carrier:` 恰 4）亲跑绿 | 低 |
| C4 | 首装 / 已装未配两场景；已装未配不依赖 `firstRun` | FR-SELF-043 | ✅ | `ONBOARD_SCENARIOS` 恰 2（`first-install` / `installed-unconfigured`）；`llm.unconfigured` provider 的 `when` 只读 `ctx.risk`（`NR-11`/`BT-6` 源文本 + 行为实跑）；已配置（无 `llmBlocked`）⇒ 零配置引导（`OD-14` 亲跑）；注入 `firstRun=false` 仍产出 | 低 |
| C5 | 配置执行体唯一（`op.llm-config`）+ 无第二写入路径 | FR-SELF-044 / EC-SELF-022 | ✅ | `ONBOARD_CHIP_OP` 单源；`settings/ops.ts#saveLlm` 经 `viaOp('op.llm-config', …)`（同执行体）；`law8` ⑦「不绕开掩码卡」+ sink 恰 1 亲跑绿；本叶 `git diff` **不含** `settings/**`（不新造配置面） | 低 |
| C6 | 悬置任务单源登记 + `MAX = 1` + 三要素 | FR-SELF-045 | ⚠️ | `suspension.ts` 是 `registerSuspension` 在「等待配置」语境的唯一调用点（`OD-10` 第二处 ⇒ FAIL）；`MAX=1` 由 `pendingSuspension()` 判定；三要素齐（`driverId`/`source`/`instruction` + `evidence`）。**但**：`registerConfigSuspension` 的 `over-capacity` 返回值被调用方**丢弃**（`sidepanel.ts:3577`）⇒ 与模块自述「由调用方固化『原任务已被新的意图取代』…不静默丢」（`suspension.ts:14-16`）不符（见 I-02） | 中 |
| C7 | 取消 / 放弃非死端 + 同因不重复 | FR-SELF-046 | ⚠️ | `declinedOnboardCauses`（per-fixture 复位）+ `maybeRecommend` 只压**同因**的 `llmBlocked`（`:1867`）；取消走 `nextAfterSettle({kind:'op-…',force:true})` ⇒ 可达 next（`OD-15` 亲跑）。**但**：`nextAfterSettle` seam 把 `cancelled/rejected/**failed**` 一并记入去重键（`:3450`）⇒ 配置**失败**后同因引导被永久压掉（见 I-03） | 中 |
| C8 | 确定性可核（零 LLM 调用 + 同输入同路径） | FR-SELF-047 / NFR-SELF-009 | ✅ | `status.ts` 纯函数（零 import 除本文件；`OD-4` 扫描零 LLM / 零网络 / 零 chrome）；引导四步全由既有确定性机制承载（无 LLM 文案生成）；SW 判据零 provider 调用（C1） | 低 |
| C9 | 不跳走（零视图切换 / 零 `#open-settings` / 零 `location`） | FR-SELF-048 | ✅ | `OD-9` + `stream` ⑯ 亲跑：`onboarding-flow.ts` 无 `openSettingsSection(` / `location.`；`sidepanel.ts` 主动识别分支仅 `dispatch` + `nextAfterSettle`；跳走注入 ⇒ 必红 | 低 |
| C10 | 掩码 secret 卡复用 + 法八四面不退化 | FR-SELF-049 | ✅ | `test:law8` 亲跑 **36/0**（基线 33，只增）；⑦ 三条（文案零明文 / 悬置模块零落盘 / 不绕开掩码卡）；S0C-7 实测 `secret` 步为 `type=password` 掩码卡 | 低 |
| C11 | 回执→续接顺序可判；失败回滚 + 错误卡 + 可达 next + 悬置保留 | FR-SELF-050 | ✅ | `pipeline.ts:197-200`：`await settle(op_,'completed',…)` **之后**才 `panelOpSettled(op_,'completed')` ⇒ 回执在前、续接在后（`OD-13` 顺序反证必红）；失败分支（`:208` + `defaultSettle('failed')` `:114-118`）写失败行 + `panelNextAfterSettle` ⇒ 可达 next，**不经 `completed`** ⇒ 悬置保留。失败回滚沿用既有 `defaultRollback` | 低 |
| C12 | 既有 `onboarding` provider 扩张不取代 | FR-SELF-051 | ✅ | `git diff` 未见 `onboarding` provider 的 `when`/`chips`/`textOf` 改写；`BT-6` 断言引导 chip 恒 `['op.llm-config']` ∧ 干净态不触发；`blocked-terminals` **9 → 11**（只增，`BT-6` 两条） | 低 |
| C13 | 配置探测判据单源（凭据 ∧ `providerId` ∧ `model`） | FR-SELF-052 | ✅ | `LLM_CONFIGURED_FIELDS` 恰 3 单源 + `isLlmConfigured`（`status.ts:59-64`）；`OD-1`（函数体多读字段 ⇒ 红）/`OD-2`（真值表假阴假阳）/`OD-3`（`key-store#load` 归一化：`isProviderId` 回落 + `model` 回落 default）亲跑绿 | 低 |
| C14 | X-SELF-3 等价重锚：双源 + 恢复链逐条不变 | FR-SELF-102 | ✅ | `OD-16` 亲跑：`OPS_RECOVERY_ROWS` = `[['llm.unconfigured','op.llm-config'],['perm.missing','op.perm.request']]` 逐字；`Object.keys(BLOCKED_RECOVERY_TRIGGER)` ≡ `BLOCKED_TERMINALS`（按终态键控形态不变） | 低 |
| C15 | 取代等价重锚 + 未发生取代如实登记（X-SELF-3 双条目） | FR-SELF-107 | ✅ | 台账 `entries` 命中 `X-SELF-3`（面板半，`newTitle` = `else if (variant === 'llm-unconfigured') {`，**逐字可定位**）与 `X-SELF-3-SW`（SW 半，`newTitle` = `if (!isLlmConfigured({ hasKey: …`）；两条 `modificationType: 'pure-addition'` ∧ `oldTitle: null`（不伪称取代）；v55-1 的 `xSelfLedger` 把 X-SELF-3 记为 `handed-over → v55-2`，本轮**接管并落账**，链条闭合 | 低 |
| C16 | 门禁等价重锚清单 + 只增 | FR-SELF-110 | ✅ | `blocked-terminals` 9→11 · `next-registry` 16→18 · `law8` 33→36 · `stream` 73→76 · `ask-auth` 71→78 · `gate-integrity` 16→18 · 新 `onboarding-deterministic`；`stream` ⑯ 由 `/id: '/` 重锚为 `/carrier: '/`（新增场景表含 `id:` ⇒ 原模式过宽），**等价非放宽**，且按台账逐行登记（build E3） | 低 |
| C17 | 反证不空转（禁恒真） | FR-SELF-111 | ✅ | 新门禁 4 文件全文 `\|\| true` / `assert.ok(true` / `=== 0 \|\|` 扫描**零命中**；`OD` 元判据强制每条 `expectFailPattern` 非占位；亲注入（resolver 归属）实测必红（§3.4②） | 低 |
| C18 | `knownGap` 一致性机核 | FR-SELF-113 | ✅ | `test:supersession` 亲跑 **36/0**（含 `status ↔ knownGap` 一致性断言）；本叶 X-SELF-3 落账未破该断言 | 低 |
| C19 | 新门禁纳入受审集合 + `CHROMIUM_GATES === 9` | FR-SELF-115 | ✅ | `V552_NODE_GATE_FILES`（含 `onboarding-deterministic`）+ `V552_W5_AUDITED_FILES`（R2）+ 下界只增；`test:gate-integrity` 亲跑 **18/0**；`CHROMIUM_GATES.length === 9` 逐字（`:721/:738`） | 低 |
| C20 | 计数只增 + **登记读数与实测一致** | FR-SELF-116 | ⚠️ | 逐门禁实测只增 ✅（node 1246→**1277**、`dead-end` 39→49、`recommendation` 65→72、`ask-auth` 71→78、`law8` 25→36、`blocked-terminals` 9→11、`next-registry` 16→18、`gate-integrity` 15→18、S0 node 8→11 / Chromium 24→42、新 `onboarding-deterministic` 0→23）。**但** build.md §5b 的逐门禁登记与实测不符：`onboarding-deterministic` 记 **30/0**（实测 **23/0**）、`s0-self-driven-chain` 记 **10/0**（实测 **11/0**）（见 I-01） | 中 |
| C21 | 体积五要素 + 预算诚实登记 + 红线逐字节 | FR-SELF-120 / 123 | ✅ | `dist/sidepanel.js` **563,145 B** = `SIDEPANEL_BASELINE_BYTES` 同源；`B_before` 557,883 → `B_final` 563,145（本叶 +5,262 = R1 +4,390 + R2 +872；Σ 模块 +872 + glue 0）；叶预算 4,900 ⇒ **超 362 B（已显式登记）**、叶上界 6,300 未越；档位 `ceilTo50KB(563,145) = 563,200`（**距 55 B**）、绝对上限 619,520（`size-baseline.ts:307`）、生效上限 591,302 = `min(619,520, floor(563,145×1.05))`；时间线只追加；三冻结面逐字节不变 | 低 |
| C22 | **S0 分支 B 必判项**（自动续接；双面 + A/B 独立计数） | FR-SELF-131 / AC-SELF-001 | ✅ | node `S0N-7`（样本 `S0_B_STEPS` ⇔ 产物 `ONBOARD_STEP_IDS` 逐序 / `S0_B_PARAM_KINDS` ⇔ `OP_PARAM_SEQUENCE` 逐序；`s0BranchBProblems` 读**从产物源码派生**的 reading）+ `S0N-8`（A/B 独立，改 B 不动 A）；Chromium ⑰ `S0C-7` **真产品路径**（未配置 ⇒ detect 系统行 + 悬置 ⇒ `op-direct chip` ⇒ 三段 params（`secret` = password 掩码卡）⇒ 回执 ⇒ **自动续接** ⇒ 留痕逐字为原话）。亲跑 node **11/0**、Chromium **42/0**；回退 resolver 修复 ⇒ **38/4**（见 §3.4②） | 低 |
| C23 | 人工面如实 `⏳` / `PASS` | FR-SELF-134 | ✅ | `s0-self-driven.mjs` 末行显式 `S0 人工面：… = ⏳ 未执行（headless 不可合成，不得冒充 PASS）`；未见伪造 PASS | 低 |
| C24 | 确定性双向断言（零 provider 调用 + 可重复） | NFR-SELF-009 | ✅ | `OD-4`：`status.ts` 无 LLM / 网络 / chrome import；主动识别分支无 provider 调用；`stream` ⑯ 续接经 `op.turn` 槽（同一查表执行体，`requestTurn(` 计数不变） | 低 |
| C25 | 安全：法八 / 判定链零触碰 / 净化面不变 | NFR-SELF-003 | ✅ | `law8` 36/0；`zeroDiffFiles` 9 项未被本叶改动（`git diff 39c1fb0..HEAD` 不含 `src/content/**` / `manifest.json` / `v3-supersession-ledger.json` / `ROADMAP.md` / `design/**` / `stream-model.ts`）；`zero-injection` 28/0 | 低 |
| C26 | 单源 + 机核（步骤集合 / 悬置登记 / 配置判据各恰一处） | NFR-SELF-004 | ✅ | `OD-8`（`const ONBOARD_STEPS` 全仓恰 1）/ `OD-10`（第二处登记 ⇒ FAIL）/ `OD-1`（判据 3 字段单源）三类「声明恰一次」扫描亲跑绿；反证齐 | 低 |
| C27 | 每条判据可 FAIL + `expectFailPattern` | NFR-SELF-007 | ✅ | `OD`/`S0N`/`BT`/`NR` 判据表 + 元判据（`expectFailPattern` 非占位）；`s0BranchBProblems` / `runChatOrderProblems` / `scenarioProblems` / `cancelProblems` / `xSelf3Problems` 均以真源派生 reading，注入必红 | 低 |
| C28 | 可逆性（失败快照回滚 + 悬置保留） | NFR-SELF-010 | ✅ | 失败走 `settle('failed')` ⇒ 不经 `opSettled('completed')` ⇒ 悬置保留（不丢用户原话）；回滚沿用 `defaultRollback`（`op.llm-config` 既有快照）；`OD-12`/`OD-13` 亲跑 | 低 |
| C29 | 打扰可控（不重复引导 + 静默期 + 三纪律） | NFR-SELF-013 | ✅ | 同因不重复（`suppressOnboardCause`）只压同因；防抖三常量（10 s / ≤3 chip / ≤1 卡）未改；取消走 `force` 求值（不被防抖吞掉，`OD-15` 反证必红） | 低 |
| C30 | 可用性 / 无障碍 | NFR-SELF-002 / 008 | ✅ | `density` 242 / `l0` 248 / `l1` 120 / `l2` 74 全 0 fail（含 320px / `#stream[role=log]`）；引导步骤复用既有 nextstep 卡与掩码卡机制（键盘可达性继承）；读屏面如实列入人工 `⏳` | 低 |
| C31 | `sidepanel.js` ≤ 生效上限 + 五要素重登记 | NFR-SELF-005 | ✅ | 563,145 ≤ 591,302（生效上限）；`size-budget` / `size-growth-evidence` / `size-ruling-vol3`（12/0）亲跑绿；`SIDEPANEL_RE_REGISTRATIONS['v55-2-r1'/'v55-2-r2']` 五要素齐备、方向 / Δ / ceiling 同源 | 低 |
| C32 | 兼容读取面不破 | NFR-SELF-006 | ✅ | 引导不新增必需 DOM id（复用既有 `[data-op]` / 掩码卡 / 系统行）；`l0`/`l1`/`l2`/`journey` 171 PASS 亲跑绿；`#open-settings` 未在引导路径出现 | 低 |
| C33 | EC-SELF-009：取消 ⇒ 固化 + 可达 next；不重复；后续可**重新**引导 | EC-SELF-009 | ✅ | `declinedOnboardCauses` 记「因」= 用户原话（`onboardCauseKey` trim）；新的一句话 = 新因 ⇒ 照旧引导（`OD-15`「新因不压 / 一律压掉 ⇒ 红」）；取消后 `nextAfterSettle(force)` ⇒ 可达 next（`OD-15` `nextAfterCancel.length ≥ 1`） | 低 |
| C34 | EC-SELF-010：外部完成 ⇒ 识别已配置 ⇒ 收敛 + 悬置仍须续接 | EC-SELF-010 | ✅ | 面板内设置视图（管理面）`saveLlm` 经 `deps.dispatchOp('op.llm-config')` ⇒ 走面板管线 ⇒ `opSettled('completed')` ⇒ 续接（**配置来源无关**在面板内成立）；已配置后 `maybeRecommend` 的 `configured` 由 `llmSummary` 事实派生 ⇒ 引导收敛。跨页（独立 `options.html`）口径未显式登记（见 O-05） | 低 |
| C35 | EC-SELF-011：续接先校验（失效 ⇒ 不续接 + 固化 + 可达 next） | EC-SELF-011 | ✅ | `resumeSuspension`：`intentStillValid === false` ∨ `digestMatches` 失败（`origin`/`sessionId` 变）⇒ `invalidated`，**不交付旧输入**；调用方 `dispatch(ONBOARD_INVALIDATED_TEXT)` + `nextAfterSettle`（`OD-12` 亲跑，去重校验 `validityProblems` 注入必红） | 低 |
| C36 | EC-SELF-012：悬置为空 ⇒ 非死端 | EC-SELF-012 | ✅ | `resumeSuspension` 返回显式 `{status:'empty'}`；`resumeAfterConfig` 对 `empty`/`invalidated` 一律落到 `nextAfterSettle({kind:'answered'})` ⇒ 可达 next（不静默结束） | 低 |
| C37 | EC-SELF-022：配置面双套风险 ⇒ 执行体唯一 + 设置页同调 op | EC-SELF-022 | ✅ | `ONBOARD_CHIP_OP = 'op.llm-config'` 恰 1；设置面 `saveLlm` 同调 `op.llm-config`；第二配置执行体注入（`BT-6`）必红；`law8` sink 恰 1 | 低 |
| C38 | EC-SELF-004：双命中 ⇒ 事实幂等 | EC-SELF-004 | ✅ | 被动 + 主动均写同一 `observedBlocked: Set`（同键 `llmBlocked`）⇒ 天然幂等，不产第二条阻塞事实 / 第二条引导；`OD-7`（删被动路径 ⇒ 红）亲跑 | 低 |
| C39 | 代码质量（命名 / 职责 / 错误处理 / 无硬编码 / 无死代码） | §5.1 | ⚠️ | 命名与职责清晰（`isLlmConfigured` 纯函数、`resumeAfterConfig` 单一入口、`registerConfigSuspension` 单职责）；错误路径 loud（`invalidated`/`empty` 显式读数）；无魔法值（常量单源）。**但**存在生产零消费导出（`onboardScenario` / `ONBOARD_SCENARIOS` / `onboardStepIndex` / `MAX_SUSPENSIONS` / `ONBOARD_COLLECT_STEPS`），见 O-01 | 低 |
| C40 | 测试质量（存在性 / 核心路径 / 边界 / 断言有效性） | §5.4 | ✅ | 门禁存在且核心路径：node `OD-1~OD-16` + `S0N-1~S0N-8` + `BT-6` + `NR-11`；Chromium `S0C-1~S0C-7` + ⑯ + ⑦；边界 / 错误场景（删步 / 乱序 / 删续接 / 顺序错 / 失效 / 空悬置 / 越 MAX / 假阴假阳 / 第二登记点）齐备；弱断言零命中；反证段以真源派生 reading，非恒真 | 低 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 1 | 0 | 1 | 0 | 0%（C39，触发 O-01） |
| 规范符合性 | 19 | 17 | 2 | 0 | 89%（警告 = C6 / C7） |
| 架构一致性 | 10 | 9 | 1 | 0 | 90%（警告 = C2） |
| 测试质量 | 10 | 9 | 1 | 0 | 90%（警告 = C20） |
| **合计** | **40** | **36** | **4** | **0** | **90%** |

> 无 ❌ / 无 BLOCK。规范符合性**偏差 = 0**（无承载 FR 缺失 / 矛盾；4 个警告均为口径 / 登记 / 边界语义的**改进项**，不改需求成立性）。

## 3.4 动手复核证据（用户点名）

### ① S0 双面亲跑

- **node 面**：`node --test dist-test/test/s0-self-driven-chain.test.js` ⇒ **11 tests / 11 pass / 0 fail**（`S0N-1~S0N-8` + 元判据）。`S0N-7` 断言「样本 4 步 ⇔ 产物 `ONBOARD_STEP_IDS` 逐序」「样本三段 kind ⇔ `OP_PARAM_SEQUENCE['op.llm-config']` 逐序」；`S0N-8` 断言 A/B 独立计数。
- **Chromium 面**：`npm run test:s0-self-driven` ⇒ **42 passed / 0 failed**。⑰ 段（`S0C-7`）逐环节真面板读数：`[B:detect]` 系统行 + 悬置（`source=llm-config`、instruction 逐字）、`[B:guide]` `[data-op="op.llm-config"]` chip、`[B:collect]` 三段 params 且 `secret` 为 **password 掩码卡**、`[B:complete]` **成功回执** + **自动续接**（`ONBOARD_RESUME_TEXT` 行）+ **留痕**（新增 user 条目逐字为原话）+ 无残留开口 ask；A/B 环节集不相交；拍读数 4/4。

### ② 运行期断点注入（R2 修复的**载荷性**亲核）

- **注入**：把 `sidepanel.ts#submitAskFor` 的 resolver 归属**回退到 R1 形态**（将 `opAskResolvers.delete(rid);` 从 `SECRET_ASKS` 分支之后**提前**到分支之前）——即复现 R1 的「掩码 ask 先删 resolver ⇒ `submitSecret` 取不到 ⇒ 参数 promise 永挂」断链。
- **实测**：`npm run build`（`dist/sidepanel.js` 仍 **563,145 B**）⇒ `npm run test:s0-self-driven` ⇒ **38 passed / 4 failed**，失败项逐字：
  - `✖ [B:complete] ④ complete：配置成功回执（✓ 已配置 LLM · 掩码 · 零明文）`
  - `✖ [B:complete] ⑤ resume：自动续接（无需用户重说）⇒ 流内出现续接事实行`
  - `✖ [B:complete] ⑤ resume：续接后回合留痕（新增一条 user 条目且逐字为原话）`
  - `✖ S0C-7 分支 B 必判项（共享样本判据）：配置必须真的完成（成功回执）… / **删自动续接 ⇒ FAIL** … / 续接后必须留痕`（reading 实测 `completed:false, autoResumed:false, trace:false`）
- **还原**：`git checkout -- src/ui/sidepanel/sidepanel.ts` ⇒ sha `5b8a0a56…e903` **与注入前逐字节相同** ⇒ 重建（563,145 B）⇒ `test:s0-self-driven` **42/0**。
- ⇒ 结论：R2 的运行期修复**是载荷性的**（真删即复现 R1 断链），`S0C-7` 是**真运行期必判项**（非源码序口号）；`submitSecret` 的 resolver 消费契约与掩码卡路径闭环。

### ③ 冻结面 sha / 字节

| 文件 | 字节 | sha256 | 判定 |
|---|--:|---|---|
| `dist/content.js` | 177,076 | `52a82620…b5f6` | ✅ 与 build 声明一致（注入重建后同） |
| `dist/pick-layer.js` | 34,358 | `77796bab…575e` | ✅ 与 build 声明一致 |
| `dist/sidepanel.js` | 563,145 | （含 `BUILD_STAMP`，跨重建不可复现 —— 口径为**字节数**） | ✅ = 登记基线 |

- `KIND_SET` 实测 **40** 逐字；`git diff 39c1fb0..HEAD --stat` = 30 文件，**不含** `src/content/**`、`manifest.json`、`ROADMAP.md`、`design/**`、`docs/v3-supersession-ledger.json`、`stream-model.ts`、`settings/**`；`REGISTERED_STRUCTURAL_HOSTS === []`；`design-contract` 19/19。

### ④ 计数与台账对账

- `npm test` 亲跑 **1277 / 0**（基线 1246，只增 +31：R1 +22 / R2 +9）；`test:supersession` **36/0**；`test:gate-integrity` **18/0**；`test:size-ruling-vol3` **12/0**；`test:design-contract` **19/0**。
- 台账：`docs/v4-supersession-ledger.json` 命中 `X-SELF-3` 9 次、`specs-tree-v55-2-*` 18 次；`entries` 内本叶 16 条；`X-SELF-3` / `X-SELF-3-SW` 两条以 `pure-addition` / `oldTitle:null` 落账且 `newTitle` 逐字可定位（`OD-16` 以 `readFileSync` 真核）。
- 体积：Δ = 563,145 − 557,883 = **+5,262** = R1 +4,390 + R2 +872；`v552R2Rows` Σ 模块 +872 + glue 0 == +872。

## 4. 阻塞问题

**无。** 0 个阻塞问题。

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| **I-01** | `build.md` §5b（R2 收口段） | **逐门禁登记读数与实测不符**：`onboarding-deterministic` 记 **30/0**（实测 `npm run test:onboarding` = **23/0**，R1 `18 → 23`，+5 = OD-14(2)+OD-15(2)+OD-16(1)）；`s0-self-driven-chain` 记 **10/0**（实测 **11/0**，含元判据）。总读数 `npm test 1277/0` **经亲跑核对无误**，故非「门槛被掩盖」，但按 R2 段落口吻「18 → 30」会误导对账 | C20 | 把 §5b 两行订正为 `18 → **23**`、`7/8 → **11**`；或统一「用例」口径（是否含元判据）并在 build 内注明 |
| **I-02** | `src/ui/sidepanel/sidepanel.ts:3577` ↔ `src/ui/sidepanel/next-registry/suspension.ts:14-16/77-91` | `registerConfigSuspension` 明确设计为「返回 `over-capacity`，**由调用方固化**『原任务已被新的意图取代』事实（留痕，**不静默丢**）」，但调用方**丢弃返回值** ⇒ 第二条不同意图被**静默拒绝**（旧悬置保留，用户新原话不落任何事实行）；且实际语义与注释相反（旧任务**未被**新意图取代） | C6 | 二选一：① 消费返回值 —— `over-capacity` 时 `dispatch` 一行取代事实（或替换旧悬置为最新意图 + 固化「原任务已被取代」）；② 若确认「保留最早意图」是有意取舍，把 `suspension.ts` 注释改为与实现一致的诚实口径，并在门禁里登记「`over-capacity` 属**预期静默**」 |
| **I-03** | `src/ui/sidepanel/sidepanel.ts:3450-3453` | `nextAfterSettle` seam 把 `cancelled / rejected / **failed**` 一并写入 `declinedOnboardCauses` ⇒ 配置**失败**（如写入 / 校验出错）后，**同因**的 `llmBlocked` 风险被压掉，`op.llm-config` chip 不再出现（引导不可重试）。FR-SELF-046 只覆盖「取消 / 放弃」，FR-SELF-050 对失败要求「可达 next」（其余 chip 仍在，故非死端），但「配置重试」这一最自然的 next 恰好被压掉 | C7 | 把去重键的写入限定在 `cancelled` / `rejected`（放弃语义）；`failed` 单独走「保留可重试」——或显式登记「失败亦视为放弃」的口径并补一条门禁断言（含理由） |
| **I-04** | `src/ui/sidepanel/sidepanel.ts:1340` / `:3581` | 主动识别经 `noteLlmBlockedFact(false)` 折叠，而该 fold 的门是 **`llmLoaded && !llmSummary?.configured`**（被动状态快照）⇒ 双源**不完全独立**：冷启动竞态（面板 `llm-status` 未回而用户已发消息）下，主动分支会写 detect 系统行 + 登记悬置，但 `llmBlocked` 不入 risk ⇒ **guide chip 不出现**（detect 行宣告「由系统流程带你完成配置」却没有可点的下一步），且此后无任何路径回调 `noteLlmBlockedFact` 补齐 | C2 | ① 主动分支在 SW 已裁定「未配置」后直接 `observedBlocked.add(LLM_BLOCKED_RISK)`（仍同一 Set、同一终态词汇，不破幂等），或在 `noteLlmBlockedFact` 增加「显式否定事实」入参；② 至少在门禁中登记该竞态与窗口口径 |

## 6. 观察项（O，可留后续叶 / validate）

| # | 位置 | 内容 |
|---|------|------|
| O-01 | `onboarding-flow.ts` / `suspension.ts` | 生产 `src/**` **零消费**的导出：`ONBOARD_SCENARIOS` / `onboardScenario()`（两场景为**声明层**，生产由既有 `onboarding` provider + `risk` 源两路实现）、`onboardStepIndex()`（全仓零引用，死代码）、`ONBOARD_COLLECT_STEPS` / `MAX_SUSPENSIONS`（仅门禁消费）。声明单源对机核有意义，但「单源」目前是**门禁契约层**而非生产接线层；建议在 validate / 后续叶注明，或让生产消费（如 `MAX_SUSPENSIONS` 参与 `registerConfigSuspension` 判定） |
| O-02 | `suspension.ts#resumeSuspension` / `sidepanel.ts#resumeAfterConfig` | 续接成功**不清空**悬置（`SUSPENSIONS` 内条目常驻）。会话内后续任一次 `op.llm-config` 成功（例如管理面改配置）会再次 `resumeAfterConfig` ⇒ 若悬置仍「有效」则**重放旧原话**为回合输入。当前仅面板 `op.llm-config` 触发，风险低；建议续接后标记已消费（或登记该行为为有意） |
| O-03 | `service-worker.ts:891` | `const settings = await s.keys.load()` 由原 `try {}` **内**上提到 `try` **外**（为保持「忙检查 + 判据 + 置位」同一同步块）。若 `load()` 拒绝，错误不再经 `finally`（`chatBusy` 复位 / `persistChatHistory`）；因 `chatBusy` 尚未置位、且无回合发生，实测**与改前等价**（评审已核，无回退），仅登记该错误路径作用域变化 |
| O-04 | `test/ui/binding.mjs` | 亲跑两次均 **FAIL**，两种失败面：① `/tmp/opencode/r2-3/logs/binding-diagnostics-*.log` 显示 `contexts.*: ERR:CDP socket not open (readyState=3)`（`#8f~#8i` tabs switch）；② 复跑落到 `selector not found: #confirm-allow`（= 继承的 **N-07** 环境性 flake 面）。`binding.mjs` **不在本叶变更面**（`git diff` 不含），保护段由 `test:supersession` 双绿独立机核（66 条冻结键未被本轮改动）⇒ 判为**环境性 flake，不阻塞**（与 v55-1 N-07 同族，父收口登记） |
| O-05 | `EC-SELF-010` 口径 | 「配置**来源无关**」在实现中等于「**面板内** `op.llm-config` 完成」（面板设置视图 `saveLlm` 经 `dispatchOp` ⇒ 面板管线 ⇒ `opSettled`）。独立 `options.html` 页完成配置时，面板侧只会在 focus / visibility 刷新 `llm-status`（引导收敛），**不会**触发续接（悬置活在面板内存）。建议在 validate 显式登记该边界（或补跨页信号） |
| O-06 | `docs/v4-density-baseline.json#volume.absoluteCeilingBytes` | 该字段实测 **563,200**，而 `test/size-baseline.ts:307` 与全部注释的权威口径为「档位 563,200 / 绝对上限 **619,520**」⇒ 字段**陈旧**（F 快修轮遗留，**非本叶引入**，本叶仅改 `registeredBaselineBytes` / `ceilingBytes`）。本叶距档位仅 **55 B**，该字段易误导后续轮误读 headroom；建议由后续收口轮订正（不属本叶足迹） |

## 7. 结论

**结论**: ✅ **通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 90%（36/40 Cx；4 个 ⚠️ 均为非阻塞改进项） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0**（23 承载 FR + 12 NFR + 7 EC 全部有对应实现 / 机核；无缺失、无矛盾） |
| 改进项 / 观察项 | 4 / 6 |
| 可进入 validate | **是** |

**理由**：本叶的 P0 主体**质量高且经亲跑复核**——① 配置判据（3 字段）落在既有 `llm/status.ts`（面板零字节），`runChat` 前置判据源码序（判据 < `chatBusy` < `providerChat`）与「零 provider 调用 / 无 LLM 错误事件」实测成立；② `llm.unconfigured` 双源并存折叠进**同一** `risk` 源、天然幂等，`OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER` 逐条零改写；③ 引导流**恰 4 步单源**、采集复用既有 `OP_PARAM_SEQUENCE`、全程流内闭环；④ 悬置任务单源（第二处 ⇒ FAIL）+ `MAX=1` + 有效期重校验 + 空悬置非死端；⑤ **S0 分支 B 必判项**在 node（`S0N-7/8`）与 Chromium（`S0C-7`）**双面**落地，且 R2 修掉的运行期断链**真删即复现**（`38/4`）——该必判项是**载荷性**的，不是源码序口号；⑥ 两场景 / 取消非死端 / 同因不重复 / 不跳走 / 掩码卡与法八均实测成立；⑦ 体积与红线诚实自洽（563,145 B，距档位 55 B 已显式告警；叶超预算 362 B 如实登记；三冻结面逐字节不变；`KIND_SET` 40 逐字；journey 171 保段）。

4 项改进（I-01 计数登记不实 / I-02 `over-capacity` 静默 / I-03 `failed` 并入同因去重 / I-04 双源对被动门有依赖）**均不改变任何承载 FR 的成立性**，可在 validate 期间或后续轮订正；6 项观察（死导出、悬置未消费、错误路径作用域、binding 环境性 flake、EC-010 跨页口径、density 陈旧字段）建议随本轮登记。

## 8. 状态登记提醒（SDDU §8.2）

- 本叶 `state.json` 当前 **无 `files.review` / `files.reviewReport` 字段**（`files[]` 仅含 spec/plan/tasks/build）。本次产出两份文件，请由状态机 / 用户登记：
  - `files.review` → `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-self-driven/specs-tree-v55-2-deterministic-onboarding/review.md`
  - `files.reviewReport` → `.sddu/.../specs-tree-v55-2-deterministic-onboarding/review-report.md`
- 本 Agent **未直接修改** `state.json`（依 §8.2：该文件由状态机管理）。
- 策略（`review.md`）与报告（`review-report.md`）为本次同轮产出（策略文档此前缺失，已补齐 C1~C40 清单与覆盖矩阵）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1：40 Cx 逐项；0 BLOCK / 4 I / 6 O；S0 双面亲跑 + 运行期断点注入（回退 resolver 归属 ⇒ `38/4` ⇒ 还原 ⇒ 42/0）+ 冻结面 sha/字节 + 计数与台账对账） | 2026-09-23 | SDDU Review Agent |
