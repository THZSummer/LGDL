# 构建报告：specs-tree-v55-2-deterministic-onboarding（V5.5-2 主题① 确定性系统流）

> **文档定位**: SDDU 构建报告 — 记录本轮（**R1 = W1~W4，TASK-V55-201~212**）的文件变更、实现结果与门禁读值，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md`（16 任务 / 5 波）、`tasks.json`（波次 + blockers）、本叶 `plan.md` v1.0、父 `plan.md` + `ADR-V55-006`（配置判据 / `runChat` 前置判据落 SW）· `ADR-V55-007`（引导 4 步单源 / 悬置单源 / 自动续接）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0（R1 = W1~W4；**R2 = W5 收口段见文末**）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-23
> **更新说明**: R1 落地：配置探测判据（3 字段）+ `runChat` 前置判据（SW bundle，零 sidepanel 字节）+ `chat-result` variant **type-only** + 双源并存 + 引导流 4 步单源 + 悬置任务单源（`MAX=1` + 有效期重校验）+ 配置完成自动续接（回执在前 / 续接在后）+ 新 node 门禁 `onboarding-deterministic` + 受审集合追加 + 体积五要素**中间登记**（档位 `563,200` 未变，**余量仅 927 B**）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **12 / 16**（本轮范围 = TASK-V55-201~212，W1~W4）；W5 的 213~216（两场景 / S0 分支 B 必判项 / 取消非死端 / 体积收口）**未开工** |
| 复杂度分布 | S×0 / M×11（201/203/204/205/206/207/208/209/210/212） / L×1（211） |
| 新增文件 | **3 个**（源码 2：`next-registry/onboarding-flow.ts` / `next-registry/suspension.ts`；门禁 1：`test/onboarding-deterministic.test.ts`） |
| 修改文件 | **11 个**（源码 7：`llm/status.ts` / `background/service-worker.ts` / `background/messaging.ts` / `background/chat-events.ts` / `ui/sidepanel/sidepanel.ts` / `next-registry/{ops,pipeline,providers}.ts`；门禁 5：`blocked-terminals` / `next-registry` / `gate-integrity` / `ui/law8-plaintext.mjs` / `ui/stream.mjs`；体积面 4：`size-baseline` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3`；台账 1：`docs/v4-supersession-ledger.json`；台账 1：`docs/v4-density-baseline.json`） |
| 体积 | `dist/sidepanel.js` **562,273 B**（本叶 R1 增量 **+4,390 B**；叶预算 4,900 / 上界 6,300 ⇒ **未越预算、未越上界、未越档位**） |
| 红线冻结面 | `dist/content.js` 177,076 B / sha `52a82620…`、`dist/pick-layer.js` 34,358 B / sha `77796bab…` **逐字节不变**；`KIND_SET` 40 逐字；`manifest.json` / `ROADMAP.md` / `design/**` 零 diff |
| 保护段 | journey **171 PASS**；binding 保段由 `test:supersession` 独立机核双绿（sha + startByte 107780）—— `test/ui/binding.mjs` 本机为**已登记环境性 flake**（N-07 继承，见 §9） |
| 测试计数 | `npm test` **1246 → 1268 / 0 fail**（+22 用例，**只增不减**）；`law8` 33 → **36 / 0**；`stream` 73 → **76 / 0** |

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/llm/status.ts` | 201 | `LLM_CONFIGURED_FIELDS`（恰 3）+ `isLlmConfigured()`（`hasKey ∧ providerId 非空 ∧ model 非空`；零依赖 / 零 LLM / 零网络 ⇒ **sidepanel 零字节**，SW 侧 +120 B 级） |
| NEW | `test/onboarding-deterministic.test.ts` | 202 / 206 / 209 / 212 | 主题① 场景门禁 OD-1~OD-13（**18 用例**，含删判据 / 位置错 / 进 `KIND_SET` / 删任一步 / 第二份登记表 / 删自动续接 等注入反证） |
| MODIFY | `src/background/service-worker.ts` | 203 | `runChat` 前置配置判据：key-store 读数**上提到忙检查之前**（保持「忙检查 + 判据 + 置位」同一同步块，单飞语义零放宽）⇒ 未配置则 `chat-result{variant:'llm-unconfigured'}` + `return`，**不调 provider / 零 token / 无 LLM 错误事件**；判据早于 `providerChat(` 且早于 `chatBusy = true` |
| MODIFY | `src/background/messaging.ts` | 204 | `ChatResultVariant` 联合 **type-only** 扩成员（含 `'llm-unconfigured'`）；`KIND_SET` **40 逐字不动**（该集合随 `content.js` 注入 = 冻结面） |
| MODIFY | `src/background/chat-events.ts` | 204 | 变体词表改为**单一来源**（`import type` + `export type` 自 `messaging.ts`），消灭第二份手写联合 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 205 / 208 / 210 / 211 | ① 主动识别分支（`variant === 'llm-unconfigured'` ⇒ 系统行 + 悬置登记 + `noteLlmBlockedFact(false)` + `nextAfterSettle({kind:'answered'})`）；② `resumeAfterConfig()`（有效期重校验 → 经 **`op.turn` 槽**续接 / 失效或空悬置 ⇒ 固化 + 可达 next）；③ `PanelOps.opSettled` 接线（`completed` + `op.llm-config` ⇒ 续接） |
| MODIFY | `src/ui/sidepanel/next-registry/ops.ts` | 211 | 新增面板缝 `opSettled` + `panelOpSettled()`（结算**收口之后**的回调；`op.execute(` 恰 1 调用点不变） |
| MODIFY | `src/ui/sidepanel/next-registry/pipeline.ts` | 211 | `await settle(op_, 'completed', …)` **之后**才 `panelOpSettled(op_, 'completed')` —— 「**回执在前、续接在后**」的源码序锚点 |
| MODIFY | `src/ui/sidepanel/next-registry/providers.ts` | 205 / 210 | 新增 `blockedTerminalOf(opId)`（自**唯一双射行**反查阻塞终态 ⇒ 消费方**零第二字面量**，BT-1 红线不破）。`OPS_RECOVERY_ROWS` / 恢复链**零改写** |
| NEW | `src/ui/sidepanel/next-registry/onboarding-flow.ts` | 207 / 208 | 引导流 **恰 4 步单源**（`detect → guide → collect → complete`）+ 零明文文案（detect / resume / invalidated）+ 采集段复用 `OP_PARAM_SEQUENCE['op.llm-config']`（第二份序列 ⇒ FAIL） |
| NEW | `src/ui/sidepanel/next-registry/suspension.ts` | 210 / 211 | 配置悬置任务单源：`MAX_SUSPENSIONS = 1` + 三要素（谁在等 / 等什么 / 依据什么）+ 上下文摘要 `evidence` + `registerConfigSuspension`（唯一配置登记点；同因 `deduped` / 不同意图 `over-capacity`）+ `resumeSuspension`（**先校验后交付**；`empty` / `invalidated` 均非死端） |
| MODIFY | `test/blocked-terminals.test.ts` | 206 | 新增 **BT-6**（双源并存零改写阻塞枚举 ∧ 已装未配仍产出 `op.llm-config` chip）+ BT-6 反证（第二配置执行体 ⇒ 红） |
| MODIFY | `test/next-registry.test.ts` | 206 | 新增 **NR-11**（引导 provider 由既有 `risk` 源驱动 ∧ 与 `firstRun` 无关 ⇒ 已装未配可达；真值源仍恰 7） |
| MODIFY | `test/ui/law8-plaintext.mjs` | 209 | 新增 ⑦ 引导路径零明文 3 断言（引导文案零明文 / 悬置模块零落盘 / 不绕开掩码卡） |
| MODIFY | `test/ui/stream.mjs` | 209 | 新增 ⑯ 引导流内闭环 3 断言（detect 系统行 / guide op-direct chip 恰 4 步 / 续接经 `op.turn` 槽） |
| MODIFY | `test/gate-integrity.test.ts` | 216① | 新增 `V552_NODE_GATE_FILES`（含 `onboarding-deterministic`）+ 受审集合下界追加 + 新用例（只增不减 + 反证 + `CHROMIUM_GATES === 9` 逐字） |
| MODIFY | `test/size-baseline.ts` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3` + `docs/v4-density-baseline.json` / `docs/v4-supersession-ledger.json` | 216① | 体积五要素**中间登记**：`SIDEPANEL_BASELINE_BYTES` 557,883 → **562,273**；ceiling 585,777 → **590,386**；`v552R1Rows`（Σ +4,293 + glue 97 == +4,390）+ 累计归因表前移 + `v55-2-r1` 登记条目 + 16 条台账换锚 + `V552-R1-SVOL-1~4` / 3 条行位移登记 |

> **未触碰（显式 NOOP）**：`src/content/**` / `dist/content.js` / `dist/pick-layer.js` / `manifest.json` / `KIND_SET`（40 逐字）/ `docs/v3-supersession-ledger.json` / `ROADMAP.md` / `design/**` / journey·binding 保护段内容。

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55-201 | `isLlmConfigured` 配置探测判据（3 字段） | M | ✅ completed | FR-SELF-052 |
| TASK-V55-202 | `onboarding-deterministic.test.ts` 判据机核 | S | ✅ completed | FR-SELF-052 |
| TASK-V55-203 | `runChat` 前置配置判据 | M | ✅ completed | FR-SELF-040 / 041 |
| TASK-V55-204 | `messaging.ts` union type-only + `chat-result` payload variant | M | ✅ completed | FR-SELF-095 |
| TASK-V55-205 | 双源并存（`llm.unconfigured`） | M | ✅ completed | FR-SELF-041 |
| TASK-V55-206 | `blocked-terminals`(9 不变) + `next-registry`(≥16 增) | M | ✅ completed | FR-SELF-051 / 102 / 110 |
| TASK-V55-207 | `onboarding-flow.ts` 引导流 4 步单源 | M | ✅ completed | FR-SELF-042 |
| TASK-V55-208 | `op.llm-config` op-direct chip + 零视图切换 | M | ✅ completed | FR-SELF-044 / 048 |
| TASK-V55-209 | `law8`(25 增) + `stream`(73 增) | M | ✅ completed | FR-SELF-049 |
| TASK-V55-210 | `suspension.ts` 悬置任务单源 | M | ✅ completed | FR-SELF-045 / 046 |
| TASK-V55-211 | 配置完成自动续接 + 失败回滚 | L | ✅ completed | FR-SELF-045 / 050 |
| TASK-V55-212 | 悬置单源扫描 + 失效重校验 + 空悬置非死端 | M | ✅ completed | FR-SELF-045 / 046 |
| TASK-V55-213 | 首装 / 已装未配两场景 | M | ⏳ **未开工（R2）** | FR-SELF-043 |
| TASK-V55-214 | S0 分支 B 必判项（自动续接） | L | ⏳ **未开工（R2）** | FR-SELF-131 |
| TASK-V55-215 | 取消非死端 + 同因不重复 | M | ⏳ **未开工（R2）** | FR-SELF-046 |
| TASK-V55-216 | 体积五要素（收口）+ X-SELF-3 台账 + 本叶收尾 | L | ◐ **①（体积中间登记）已完成；②③ 留 R2** | FR-SELF-003 / 102 / 110 |

## 4. 配置判据 / 识别判据的落点与字节拆分

| 面 | 落点 | 产物字节 |
|---|---|---|
| 判据本体 | `src/llm/status.ts#isLlmConfigured`（既有依赖零模块；面板仅 `import type` ⇒ 被擦除） | `sidepanel.js` **+0 B**；`background.js` 侧 +~120 B（不在本叶体积口径内） |
| 「意图需要 LLM」主动识别 | `service-worker.ts#runChat` 前置判据（key-store 读数派生 `hasKey = apiKey.length > 0`） | `background.js`（SW bundle） |
| 事实折叠（双源） | 面板 `variant === 'llm-unconfigured'` ⇒ `noteLlmBlockedFact(false)` ⇒ 既有 `risk: llmBlocked` ⇒ 既有 `llm.unconfigured` provider 产 `op.llm-config` **op-direct chip** | `sidepanel.js` 计入 `v552R1Rows`（+1,354） |
| 引导流 / 悬置 | `onboarding-flow.ts`（+1,280）/ `suspension.ts`（+1,421）NEW | 计入 `v552R1Rows` |
| 顺序缝 | `ops.ts` +83 / `pipeline.ts` +48 / `providers.ts` +107 | 计入 `v552R1Rows` |

## 5. 门禁对账

| 门禁 | 基线 | 本轮 | 判定 |
|---|---|:--:|:--:|
| `npm test`（node 全量） | 1246 / 0 | **1268 / 0**（+22） | ✅ 只增 |
| — 其中新门禁 `onboarding-deterministic` | — | **18 / 0**（OD-1~OD-13） | ✅ 新增 |
| `typecheck` | 绿 | 绿 | ✅ |
| `test:supersession` | 36 / 0 | **36 / 0** | ✅（含保护段双绿） |
| `test:gate-integrity` | 绿 | 绿（+1 用例） | ✅ |
| `test:size-ruling-vol3` | 12 | 绿 | ✅ |
| `test:law8`（Chromium） | 33 / 0 | **36 / 0** | ✅ 只增 |
| `test:stream`（Chromium） | 73 / 0 | **76 / 0** | ✅ 只增 |
| `test:dead-end`（Chromium） | 49 / 0 | **49 / 0** | ✅ 保段 |
| `test:s0-self-driven`（Chromium，S0 双面之一） | 24 / 0 | **24 / 0** | ✅ 保段 |
| `test:ask-auth`（Chromium） | 71+ | **78 / 0** | ✅ 只增 |
| `test:recommendation`（Chromium） | 72 / 0 | 71/1 首跑 → **72 / 0 复跑** | ◐ 环境性 flake（继承 N-08） |
| `test:ui`（journey 保护段） | 171 | **171 PASS** | ✅ 保段 |
| `test:binding`（Chromium） | 192 | **FAIL（harness `#confirm-allow` 未找到）** | ◐ 继承 N-07 环境性 flake；保段凭据 = `supersession` 双绿 |
| 冻结面 | content 177,076 / pick-layer 34,358 | **逐字节不变**（sha 复核） | ✅ |
| 门禁日志 | — | `/tmp/opencode/v4-gate-logs/v55-2-r1/` | ✅ |

## 6. 体积五要素（本叶 R1 中间登记）

| 要素 | 值 |
|---|---|
| `B_before` | 557,883 B（v55-1 收口基线） |
| `B_final` | **562,273 B**（`stat -c %s dist/sidepanel.js`） |
| 本叶 R1 增量 | **+4,390 B**（+0.79%）；叶预算 4,900 / 上界 6,300 ⇒ **未越预算、未越上界** |
| 逐模块归因（真实 metafile） | `sidepanel.ts` 99,688 → **101,042（+1,354）** · NEW `onboarding-flow.ts` **1,280** · NEW `suspension.ts` **1,421** · `ops.ts` +83 · `pipeline.ts` +48 · `providers.ts` **+107**（Σ +4,293 + 未归因胶水 **97** == +4,390） |
| 档位 | `ceilTo50KB(562,273) = 563,200` **未变** ⚠️ **距档位仅 927 B**；绝对上限 619,520 未变；生效上限 = `min(619,520, floor(562,273 × 1.05) = 590,386) = 590,386` |
| 时间线 | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 562,273（只追加）；`SIDEPANEL_RE_REGISTRATIONS['v55-2-r1']` 五要素齐备 |
| 跨档位预案 | 本叶 W5（TASK-V55-216）收口登记时若再增 928 B 即**越档位** ⇒ 按 ADR-V55-011 §4 **显式升档（不停机）**，`authorConfirmation` 保持 `pending-author-line` |

## 7. 注入反证摘要（TDD 反证，全部真源零触碰）

| # | 反证 | 判据 | 结果 |
|:--:|---|---|:--:|
| 1 | **删前置判据** | `runChatOrderProblems(无判据源码)` ⇒ 必红（复现 R5「撞一次错误才知道要配置」） | ✅ FAIL→还原 PASS |
| 2 | **early return 放到 `chatBusy = true` 之后** | 必红（第二次回合被误判忙） | ✅ FAIL→还原 PASS |
| 3 | 判据函数体多读一个字段（如 `apiKeyMasked`） | `predicateFieldProblems` 必红（假阴 / 假阳面） | ✅ FAIL→还原 PASS |
| 4 | 只认 `hasKey`（假阳）/ 要求特定 model（假阴） | 真值表必红 | ✅ 两类注入各红 |
| 5 | `'llm-unconfigured'` 进 `KIND_SET` | 必红（`content.js` 红线） | ✅ FAIL→还原 PASS |
| 6 | **删被动观测路径** | 双源判据必红（合法降级场景丢失） | ✅ FAIL→还原 PASS |
| 7 | 删引导任一步 / 步骤乱序 | 流判据必红 | ✅ FAIL→还原 PASS |
| 8 | 把引导实现为 `openSettingsSection(...)`（跳走） | 零视图切换判据必红（R-SELF-905） | ✅ FAIL→还原 PASS |
| 9 | **第二份悬置登记表 / 第二处配置登记** | 单源扫描必红 | ✅ FAIL→还原 PASS |
| 10 | **悬置超 `MAX = 1`**（第二条不同意图） | `registerConfigSuspension` ⇒ `over-capacity`（不叠加） | ✅ 必红 |
| 11 | 去掉有效期重校验（站点变 / 会话切换仍续接） | `validityProblems` 必红（不制造假成功） | ✅ FAIL→还原 PASS |
| 12 | **删自动续接**（`completed` 分支不调 `resumeAfterConfig`） | `resumeOrderProblems` 必红（复现「配完还要重说一遍」） | ✅ FAIL→还原 PASS |
| 13 | 把续接通知移到 `settle` **之前** | 顺序判据必红（回执在前、续接在后） | ✅ FAIL→还原 PASS |
| 14 | 主动识别被实现为「第 6 类阻塞」/ 第二配置执行体 | BT-6 反证必红 | ✅ FAIL→还原 PASS |
| 15 | 引导 `when` 挂上 `firstRun` | NR-11 必红（已装未配丢失） | ✅ FAIL→还原 PASS |

## 8. 与 ADR 的口径差异（登记不静默）

| # | 差异 | 处置 |
|:--:|---|---|
| D1 | ADR-V55-006 §3 的 payload 示例含 `blocked: 'llm.unconfigured'`；实现只发 `variant` | **如实登记**：SW 侧重复写入阻塞态字面量会**破 BT-1 红线**（阻塞态字符串只允许出现在 `definition.ts` 声明 + `providers.ts` 唯一双射点）。面板经 `noteLlmBlockedFact(false)` 折叠进既有 `risk: llmBlocked` ⇒ **同一终态词汇**、同一恢复行、`op.llm-config` chip，语义等价 |
| D2 | ADR-V55-006 §3 伪代码把 `settings = await s.keys.load()` 放在忙检查**之后** | 实现把该读数**上提到忙检查之前**（判据块仍是「忙检查 → 判据 → `chatBusy = true`」同一同步块）。理由：若在两者之间 await，两条并发 `chat` 会**都通过忙检查**（单飞语义被放宽）。判据的源码序判据（判据 < `chatBusy = true` < `providerChat(`）**逐字满足**，且 `hasKey` 明确由 `apiKey.length > 0` 派生 |
| D3 | ADR-V55-007 §3 的续接载体写作 `pressCandidate('op.turn', …)`（ADR-V55-009/010 的 v55-3 API，**本仓尚不存在**） | 实现经**既有 `op.turn` 槽**（`dispatchOp('op.turn', { value })` ⇒ 同一 `PANEL.turn` ⇒ `requestTurn`）—— `requestTurn(` 调用点计数不变、面板 `dispatchChipAction` 仍恰 1 处、零第二回合入口。待 v55-3 落地 `pressCandidate` 后可等价替换（**遗留 W5/R2 复核**） |
| D4 | ADR-V55-007 §2 的 `Suspension` 形状（含 `validity()` 闭包 / `terminal` 字段）与 v55-1 `drivers.ts#Suspension` 不同 | 实现**不新开登记表**：`suspension.ts` 把既有入口作为「等待配置」语境的**唯一**调用点，`MAX=1` / 有效期 / 续接作为**策略层**；上下文摘要（origin / sessionId）落在既有 `evidence` 字段（零明文 / 非凭据） |

## 9. 遗留项（移交 R2 / review）

| # | 项 | 归属 |
|:--:|---|---|
| R2-1 | **TASK-V55-213 / 214 / 215**：首装 / 已装未配两场景 → S0 分支 B 必判项（**必判**：删自动续接 ⇒ FAIL）→ 取消非死端 + 同因不重复 | **R2（W5）** |
| R2-2 | **TASK-V55-216 ②③**：X-SELF-3 台账条目（取代形态「加源不取代」）+ `knownGap` 一致 + 本叶体积**收口**登记（**距档位仅 927 B**：再增 928 B 即越档位 ⇒ ADR-V55-011 §4 显式升档）+ 全门禁串行 + 红线巡检终核 | **R2（W5）** |
| R2-3 | 台账换锚以「就地替换 `oldTitle` → 新文本 + 单条 `V552-R1-SVOL-*` 登记」完成（v55-1 用「接管条目」形态）；两种形态等价（`newTitle` 可定位性判据均绿），如需「历史条目文本逐字不改」的更强口径，R2 可补接管链条目 | **R2 复核** |
| R2-4 | `test:binding` 本机 harness error（`#confirm-allow` 未找到）—— 继承 v55-1 N-07 的**环境性 flake**；`binding.mjs` 不在本叶变更面，保护段由 `supersession` 双绿独立机核 | **父收口登记**（同 N-07） |
| R2-5 | `test:recommendation` 首跑 71/1 → 复跑 72/0（同 v55-1 N-08 环境性 flake） | **父收口登记**（同 N-08） |
| R2-6 | ADR-V55-007 §5「同因不重复 / 静默期」生产侧只落了「悬置 `MAX=1` + 幂等」；「同会话内不再弹同一条引导」的**面板侧去重键**落在 W5（TASK-V55-215），本轮**未实现** | **R2（W5）** |

## 10. 下一步

| 场景 | 操作 |
|------|------|
| 本轮（R1 = W1~W4）已完成 | 运行 `@sddu-review specs-tree-v55-2-deterministic-onboarding` 开始审查 |
| 审查通过后 | 进入 R2：`@sddu-build TASK-V55-213`（两场景）→ 214（S0 分支 B 必判项）→ 215 → 216（体积收口） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = W1~W4 = TASK-V55-201~212：配置判据 3 字段 / `runChat` 前置判据 / variant type-only / 双源并存 / 引导 4 步单源 / 悬置单源 `MAX=1` + 有效期重校验 / 自动续接（回执在前、续接在后）；新门禁 `onboarding-deterministic` 18 用例；`npm test` 1268/0；`law8` 36/0、`stream` 76/0；体积中间登记 557,883 → **562,273**（+4,390，未越档位，余 927 B）；冻结面逐字节不变；遗留 6 项移交 R2/父收口） | 2026-09-23 | SDDU Build Agent |
---

# R2 收口段（W5 = TASK-V55-213~216；2026-09-23）

> **本轮范围**：`TASK-V55-213`（首装 / 已装未配两场景门禁）→ `214`（**S0 分支 B 必判项**：自动续接）→ `215`（取消非死端 + 同因不重复）→ `216`（体积五要素收口 + X-SELF-3 台账落账 + 红线巡检）。
> **R2 结束时本叶 16/16 任务全部完成**（`phase: builded`，`status: tracked`）。

## 1b. 构建概要（R2）

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **4 / 4**（本轮）⇒ **本叶 16 / 16 全部完成** |
| 复杂度分布 | M×2（213 / 215） / L×2（214 / 216） |
| 新增文件 | **0 个**（本轮全部落在既有源码 / 既有门禁上，**只增不改语义**） |
| 修改文件 | **13 个**（源码 2：`next-registry/onboarding-flow.ts` / `ui/sidepanel/sidepanel.ts`；门禁 7：`test/onboarding-deterministic.test.ts` / `test/s0-self-driven-chain.test.ts` / `test/ui/s0-self-driven.mjs` / `test/ui/fixtures/s0-chain.mjs` / `test/ui/stream.mjs` / `test/gate-integrity.test.ts` / `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts`；体积面 2：`test/size-baseline.ts` / `docs/v4-density-baseline.json`；台账 1：`docs/v4-supersession-ledger.json`；链 1：`package.json`） |
| 体积 | `dist/sidepanel.js` **563,145 B**（R2 增量 **+872 B**；Σ 模块 +872 + glue **0**） |
| 红线冻结面 | `dist/content.js` 177,076 B / sha `52a82620…`、`dist/pick-layer.js` 34,358 B / sha `77796bab…` **逐字节不变**；`KIND_SET` 40 逐字；`manifest.json` / `ROADMAP.md` / `design/**` / `docs/v3-*` 零 diff |
| 保护段 | journey **171 PASS**；binding **192 PASS**（本机本次全绿，N-07 环境性 flake 未复现） |
| 测试计数 | `npm test` **1268 → 1277 / 0**（+9）；`law8` 36 / 0；`stream` 76 / 0；`dead-end` **49 / 0**；`s0-self-driven` **24 → 42 / 0**；`ask-auth` 78 / 0；`recommendation` 72 / 0 |

## 2b. 文件变更（R2）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/next-registry/onboarding-flow.ts` | 213 / 215 | `ONBOARD_SCENARIOS`（**恰 2 行**：`first-install` / `installed-unconfigured`）+ `onboardScenario()`（已配置 ⇒ `'none'`；未配置 ⇒ 按 `firstRun` 分流）+ `onboardCauseKey()` / `suppressOnboardCause()`（同因去重纯判据）。**「已装未配」行 `via: 'risk'`**：其判据不读 `onboarding` 源 ⇒ 不依赖 `firstRun` |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 215 / 214 | ① 新增 `onboardGuideCause` + `declinedOnboardCauses`（同因去重键，per-fixture 复位）∧ `maybeRecommend` 只压**同因**的 `llmBlocked` ⇒「取消后不重复弹同一条」；② **掩码参数 ask 的 resolver 归属修正**（`submitAskFor` 的 op 分支不再先 `delete` resolver ⇒ `submitSecret` 才能取到它并交付值）⇒ `op.llm-config` 首次能走到 consent / complete |
| MODIFY | `test/ui/fixtures/s0-chain.mjs` | 214 | **只增**：`S0_B_STEPS`（引导 4 步）/ `S0_B_PARAM_KINDS`（三段 params）/ `S0_B_RESUME_MARK` / `s0BranchBProblems()`（**必判项判据本体：删自动续接 ⇒ FAIL**）/ `s0BranchBeats()`（A/B 独立计数）。既有 10 拍样本逐字未动 |
| MODIFY | `test/s0-self-driven-chain.test.ts` | 214 | **只增** S0N-7（分支 B 必判项：步与产物单源对齐 / 掩码卡 / 完成 / 自动续接 / 留痕 + 4 类反证）+ S0N-8（A/B 独立计数：改动 B 夹具不得移动 A 读数） |
| MODIFY | `test/ui/s0-self-driven.mjs` | 214 / 215 | **只增** ⑰ 段（`S0C-7`）：真产品路径驱动 `chat-result{llm-unconfigured}` ⇒ detect 系统行 + 悬置登记 ⇒ guide op-direct chip ⇒ 三段 params（`secret` = password 掩码卡）⇒ 确认为 `op.llm-config` ⇒ 回执 ⇒ **自动续接** ⇒ 留痕（新增 user 条目 = 原话）+ 分支 B 逐环节覆盖机核 + 两份反证 |
| MODIFY | `test/onboarding-deterministic.test.ts` | 213 / 215 | **只增** OD-14（两场景 + 真值表 + 注入 `firstRun=false` 仍须产出 + 已配置 ⇒ 零引导）+ OD-15（同因去重真值表 + 取消非死端 + 源码接线 + 反证） |
| MODIFY | `test/ui/stream.mjs` | 209 兼容 | ⑯ 步数判据**等价重锚**：`/id: '/g` 计数 → `/carrier: '/g` 计数（新场景表也有 `id:` ⇒ 原模式过宽；语义仍是「引导流恰 4 步」） |
| MODIFY | `test/gate-integrity.test.ts` | 216③ | **只增** `V552_W5_AUDITED_FILES` + 元门禁（本轮两枚承载新判据的门禁仍在受审集合内 + 反证 + `CHROMIUM_GATES === 9` 逐字） |
| MODIFY | `package.json` | 216③ | 新增 `test:onboarding`（node 主题① 门禁）并追加进 `test:v3` **串行链**（无新依赖） |
| MODIFY | `test/size-baseline.ts` + `test/size-budget` / `size-growth-evidence` / `size-ruling-vol3` + `docs/v4-density-baseline.json` + `docs/v4-supersession-ledger.json` | 216① | 体积五要素**最终登记**：`SIDEPANEL_BASELINE_BYTES` 562,273 → **563,145**；生效上限 590,386 → **591,302**；`v552R2Rows`（Σ +872 + glue 0）+ `closeoutDeltaBytes` 872 + `deltaBytes` 267,920 + 桶和；台账：51 条 v4 条目**就地换锚** + `V552-R2-SVOL-1` / 两条 `V552-R2-CHAIN-*` / **X-SELF-3 + X-SELF-3-SW** 落账 + v4 叶段逐行登记 + summary 同源复算 |

> **未触碰（显式 NOOP）**：`src/content/**` / `dist/content.js` / `dist/pick-layer.js` / `manifest.json` / `KIND_SET`（40 逐字）/ `docs/v3-supersession-ledger.json`（v3 段登记集）/ `docs/v3-density-baseline.json` / `ROADMAP.md` / `design/**` / journey·binding 保护段内容 / `OPS_RECOVERY_ROWS` / `BLOCKED_RECOVERY_TRIGGER`。

## 3b. 任务完成清单（补全 16/16）

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55-213 | 首装 / 已装未配两场景 | M | ✅ completed（R2） | FR-SELF-043 |
| TASK-V55-214 | **S0 分支 B 必判项**（自动续接） | L | ✅ completed（R2） | FR-SELF-131 |
| TASK-V55-215 | 取消非死端 + 同因不重复 | M | ✅ completed（R2） | FR-SELF-046 |
| TASK-V55-216 | 体积五要素（收口）+ X-SELF-3 台账 + 本叶收尾 | L | ✅ completed（R2） | FR-SELF-003 / 102 / 110 |

## 4b. S0 分支 B 双面证据（TASK-V55-214）

| 面 | 判据 | 读数 |
|---|---|---|
| **node**（`test/s0-self-driven-chain.test.ts`） | S0N-7：`S0_B_STEPS` ⇔ 产物 `ONBOARD_STEP_IDS` 逐序同源 ∧ `S0_B_PARAM_KINDS` ⇔ `OP_PARAM_SEQUENCE['op.llm-config']` 逐序同源 ∧ `s0BranchBProblems` 读**从产物源码派生**的 reading（`autoResumed` = `opSettled` completed 分支真调 `resumeAfterConfig()`；`trace` = 函数体内 `ONBOARD_RESUME_TEXT` + `dispatchOp('op.turn')`；`resumedInput` = 真源模块「登记 → 续接」原样交付） | ✅ **全绿**；S0N-7 反证（**删自动续接** ⇒ 红 / 续接通知挪到回执前 ⇒ 红 / 无掩码 ⇒ 红 / 第二份 params 序列 ⇒ 红 / 续接输入不逐字 ⇒ 红）逐条 FAIL→还原 PASS |
| **Chromium**（`test/ui/s0-self-driven.mjs` ⑰） | 真产品路径：真实用户回合 ⇒ SW `chat-result{variant:'llm-unconfigured'}` ⇒ detect 系统行 + 悬置（`source=llm-config`，instruction 逐字）⇒ `[data-op="op.llm-config"]` chip ⇒ 三段 params（`choice → text → secret`，secret 为 `type=password` 掩码卡）⇒ 确认 ⇒ 回执 ⇒ **自动续接留痕**（`ONBOARD_RESUME_TEXT` 行 + 新增 user 条目逐字为原话）⇒ 无残留开口 ask | ✅ **42 passed / 0 failed**（`S0C-7` 全绿 + 两份反证 + 分支 B 4/4 拍有真读数 + A/B 环节集不相交） |

**分支 A/B 独立计数**：`PANEL_BEATS`（10 拍）与 `PANEL_B_BEATS`（4 步）**id 集不相交**、各自独立命中登记；node 面 `s0BranchBeats()` 计数 A=5 / B=1（合计 = 6 = 有分支标记的拍数），并断言「改动 B 夹具 ⇒ A 读数逐拍不变」。

## 5b. 门禁对账（R1 → R2）

| 门禁 | R1 | R2 | 判定 |
|---|---|:--:|:--:|
| `npm test`（node 全量） | 1268 / 0 | **1277 / 0**（+9） | ✅ 只增 |
| — 其中 `onboarding-deterministic` | 18 / 0 | **30 / 0**（OD-14 / OD-15 / OD-16） | ✅ 只增 |
| — 其中 `s0-self-driven-chain` | 7 / 0 | **10 / 0**（S0N-7 / S0N-8） | ✅ 只增 |
| `typecheck` | 绿 | 绿 | ✅ |
| `test:supersession` | 36 / 0 | **36 / 0** | ✅（含保护段双绿） |
| `test:gate-integrity` | 绿 | **18 / 0**（+1 元门禁） | ✅ 只增 |
| `test:size-ruling-vol3` | 12 | **12 / 0** | ✅ |
| `test:design-contract` | 19 | **19 / 0** | ✅ |
| `test:law8`（Chromium） | 36 / 0 | **36 / 0** | ✅ |
| `test:stream`（Chromium） | 76 / 0 | **76 / 0**（⑯ 等价重锚） | ✅ |
| `test:dead-end`（Chromium） | 49 / 0 | **49 / 0** | ✅ |
| `test:s0-self-driven`（Chromium） | 24 / 0 | **42 / 0** | ✅ 只增 |
| `test:ask-auth`（Chromium） | 78 / 0 | **78 / 0** | ✅ |
| `test:recommendation`（Chromium） | 72 / 0 | **72 / 0** | ✅ |
| `test:auth-chip` / `zero-injection` / `page-input` / `l0` / `l1` / `l2` | — | 37 / 28 / 118 / 248 / 120 / 74 全 0 fail | ✅ |
| `test:density` / `insight` / `hardening` / `e2e` | — | 242 / 0 · 118 PASS · 24 PASS · PASS | ✅ |
| `test:ui`（journey 保护段） | 171 | **171 PASS** | ✅ 保段 |
| `test:binding` | FAIL（N-07 环境性 flake） | **192 PASS** | ✅ 保段（本轮全绿） |
| 冻结面 | content 177,076 / pick-layer 34,358 | **逐字节不变**（sha 复核） | ✅ |
| 门禁日志 | `/tmp/opencode/v4-gate-logs/v55-2-r1/` | `/tmp/opencode/v4-gate-logs/v55-2-r2/` | ✅ |

## 6b. 体积五要素（本叶**最终登记**）

| 要素 | 值 |
|---|---|
| `B_before` | 557,883 B（v55-1 收口基线） |
| `B_final` | **563,145 B**（`stat -c %s dist/sidepanel.js`） |
| 本轮（R2）增量 | **+872 B**（+0.16%）；逐模块：`onboarding-flow.ts` 1,280 → **1,722（+442）** · `sidepanel.ts` 101,042 → **101,472（+430）**（Σ +872 + glue **0**） |
| 本叶合计增量 | **+5,262 B**（R1 +4,390 + R2 +872）—— 叶预算 4,900 B ⇒ **超出 362 B**；叶**上界 6,300 B 未越**（余 1,038 B） |
| 档位 / 绝对上限 | `ceilTo50KB(563,145) = 563,200`（**未变**，距档位 **55 B**）；绝对上限 619,520（未变）；生效上限 = `min(619,520, floor(563,145 × 1.05) = 591,302) = 591,302` |
| **越档处理（本轮判定）** | **未越档位**（563,145 ≤ 563,200）⇒ **不触发** ADR-V55-011 §4 的显式升档；预案档位 614,400 / 绝对上限 675,840 **未被占用**；`authorConfirmation` 保持 `pending-author-line`（不伪称已确认） |
| 时间线 / 登记册 | `SIDEPANEL_BASELINE_BYTES_TIMELINE` **追加** 563,145（只追加）；`SIDEPANEL_RE_REGISTRATIONS['v55-2-r2']` 五要素齐备（direction=raised，Δ=+872，ceiling 591,302 = 公式值） |

## 7b. 注入反证摘要（R2，全部真源零触碰）

| # | 反证 | 判据 | 结果 |
|:--:|---|---|:--:|
| 1 | **删自动续接**（`opSettled` completed 分支不调 `resumeAfterConfig`） | node `s0BranchBProblems` 必红（`autoResumed`）∧ Chromium 同判据必红 | ✅ FAIL→还原 PASS |
| 2 | 续接通知挪到回执**之前** | `s0BranchBProblems.completed` 必红（事件序） | ✅ FAIL→还原 PASS |
| 3 | 去掉掩码卡 / 换成两段 params | node + Chromium 必红 | ✅ FAIL→还原 PASS |
| 4 | 续接输入不逐字 | 必红（逐字判据非恒真） | ✅ FAIL→还原 PASS |
| 5 | **取消后立刻重复弹同一条引导**（删同因去重） | OD-15 源码判据必红 | ✅ FAIL→还原 PASS |
| 6 | 取消路径去掉 `force` 求值 | OD-15 必红（可达 next 被防抖吞掉 = 死端） | ✅ FAIL→还原 PASS |
| 7 | 「一律压掉」（新因也压） | OD-15 必红 | ✅ FAIL→还原 PASS |
| 8 | 让「已装未配」挂上 `firstRun` / 只认 `firstRun` | OD-14 必红 | ✅ FAIL→还原 PASS |
| 9 | 已配置仍凭 `firstRun` 触发配置引导 | OD-14 必红（零引导） | ✅ FAIL→还原 PASS |
| 10 | 从受审集合拿掉本轮承载新判据的门禁 | `gate-integrity` 元门禁必红 | ✅ FAIL→还原 PASS |
| 11 | **X-SELF-3 台账缺**（删条目）／把「加源不取代」伪称成取代 | OD-16 `xSelf3Problems` 必红 | ✅ 必红（判据非恒真） |

## 8b. 与 ADR 的口径差异 / 诚实登记（R2 新增）

| # | 差异 / 事实 | 处置 |
|:--:|---|---|
| E1 | **R1 的自动续接在运行期是断的**：`submitAskFor` 的 op 分支在掩码 ask 上先 `delete` resolver，`submitSecret` 取不到 ⇒ 参数 promise 永挂 ⇒ `op.llm-config` 到不了 consent / complete（引导永远「配不完」）。R1 只机核了源码序（OD-13），运行期这条链无人判 | **本轮修（1 处归属修正）+ 新增运行期必判项**（S0 双面）；如实登记为 R1 的**机核盲区**，不伪称「一直可用」 |
| E2 | 本叶**预算超支**：预算 4,900 B，实际 5,262 B（超 362 B） | **显式登记**（未越叶上界 6,300、未越档位）；不静默、不放宽任何阈值 |
| E3 | `test/ui/stream.mjs` ⑯ 的「恰 4 步」判据原用 `/id: '/g` 计数（新场景表也含 `id:` ⇒ 过宽） | **等价重锚**为 `/carrier: '/g`（仍恰 4，语义不变，非放宽）；删除行按 supersession 台账逐行登记 |
| E4 | 台账 51 条 v4 条目 `newTitle` **就地换锚**（v4 值 → v5.5-2 最终值） | 沿用 R1 既定形态（R1 build.md §9 R2-3 已登记「两形态等价」）；本轮同时补两条 `V552-R2-CHAIN-*` **接管链条目**（更强口径） |
| E5 | `closeoutDeltaBytes` 语义订正为「**最新一轮**登记增量」 | 断言同步为 `SIDEPANEL_BASELINE_BYTES − 562,273`；R1 的中间登记值逐字保留在 `SIDEPANEL_RE_REGISTRATIONS['v55-2-r1']` 与 TIMELINE |

## 9b. 移交项（→ review / validate）

| # | 项 | 归属 |
|:--:|---|---|
| H1 | **X-SELF-3 双源一致性**（主动识别 ∧ 被动观测折叠进同一 `risk` 源、幂等、恢复链零改写）由 review 独立复核（本轮已落账 `X-SELF-3` / `X-SELF-3-SW` 两条 + 逐行证据） | review |
| H2 | **零 LLM 调用审计**（未配置 ⇒ 零 token / 无 LLM 错误事件）与**零视图切换**（引导全程流内）由 review 复核 | review |
| H3 | validate：S0 分支 B **真机/真面板必判项**实跑 + 两场景实跑（`firstRun=false`）+ `law8`/`stream`/`ask-auth` 计数对账 | validate |
| H4 | `test:recommendation` / `test:binding` 的历史环境性 flake（N-07/N-08 族）本轮**未复现**；如后续复现仍按父收口登记处理 | 父收口 |
| H5 | 引导 chip 的**环境事实**：headless 无夹具站点 ⇒ 探测相位可能停在等待态，`probe` 恢复类会正确地抢走 `risk-recovery` 槽；因此 Chromium 面的 guide 步用受控 ctx 驱动**真生产者**（与既有 ⑦A 同一口径），已在门禁注释内登记 | review / validate |

## 10b. 下一步

| 场景 | 操作 |
|------|------|
| 本叶（R2 = W5）已完成 | 运行 `@sddu-review specs-tree-v55-2-deterministic-onboarding`（16/16 任务已完成） |
| 审查通过后 | 进入 validate（收口）：S0 分支 B 必判项实跑 + 两场景实跑 + 计数对账 |

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.1 | R2 收口段（W5 = TASK-V55-213~216）：两场景门禁 / S0 分支 B 必判项（双面 + 反证）/ 取消非死端同因去重 / 体积最终登记 563,145（未越档 563,200）+ X-SELF-3 落账；`npm test` 1277/0；s0-self-driven 42/0；**发现并修复 R1 的「掩码 ask resolver 误删 ⇒ 引导永远配不完」运行期断链** | 2026-09-23 | SDDU Build Agent |
