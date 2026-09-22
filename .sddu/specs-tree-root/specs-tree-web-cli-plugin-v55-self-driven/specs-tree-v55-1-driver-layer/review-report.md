# 审查报告：specs-tree-v55-1-driver-layer

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C38 审查清单）
> **前置依赖**: review.md、spec.md（43 FR）、plan.md、父 ADR-V55-001/002/003/005、build.md（R1+R2）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-23
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建 —— 静态审查 + 动手复核（S0 双面 / no-dead-end 真源注入 / 冻结面 sha）

## 0. 审查范围与执行

| 项 | 值 |
|---|---|
| Feature | specs-tree-v55-1-driver-layer |
| 分支 / HEAD | `feature/web-cli-plugin` / `1b7b300`（R1 `e198e57` + R2 `1b7b300`，25/25 任务） |
| 审查方式 | 静态分析为主 + 用户点名的 4 组动手复核（S0 双面 / no-dead-end 注入 / 冻结面 sha / 计数） |
| 亲跑门禁 | `npm test` **1244/0** · `test:supersession` **36/0** · `test:gate-integrity` **16/0** · `test:dead-end` **49/0** · `test:s0-self-driven` **22/0** |
| 亲跑复核（注入） | `terminals.ts` 真删 `'answered-bg'` ⇒ `no-dead-end` **46 passed / 3 failed** ⇒ `git checkout` 还原（sha 相同）⇒ 49/0 |
| 冻结面实测 | `content.js` 177,076 B / `sha256 52a82620…b5f6` · `pick-layer.js` 34,358 B / `sha256 77796bab…575e` · `sidepanel.js` 557,761 B |

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 38 |
| 通过（✅） | 32 |
| 警告（⚠️） | 2（C14 / C38，触发 I-01） |
| 失败（❌） | 4（C13 / C26 / C27 / C28） |
| 阻塞问题 | **2**（BLOCK-01 = C13；BLOCK-02 = C26+C27+C28 三 Cx 同一缺口） |
| 改进项（I） | 3（I-01 / I-02 / I-03） |
| 观察项（O） | 4（O-01~O-04） |

> 结论 = ❌ 不通过（2 个 BLOCK 未修）。失败 Cx 归并为 2 个阻塞问题。

## 2. 逐项审查结果（C1~C38）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 驱动者集合 ≡ provider 集合（双向包含） | FR-SELF-010 / AC-SELF-002 | ✅ | `providers.ts#DRIVER_DECLS_SRC`（10 行）↔ `builtinProviders()`（5 恢复 + 2 op 恢复 + 3 规则 = 10）逐 id 相等；`driver-quadruple#DQ-1` 多/少一行反证实跑 | 低 |
| C2 | 四元组 + chips ⊆ 9 opId | FR-SELF-011 / 016 | ✅ | `DriverQuadruple`/`driverQuadruples`；`DQ-2` 悬空 chips（`op.ghost`）⇒ FAIL | 低 |
| C3 | 七类时刻恰 7 + 逐类驱动者 | FR-SELF-012 / AC-SELF-015 | ✅ | `PROACTIVE_MOMENTS` 恰 7；`DQ-5` 覆盖缺口反证实跑 | 低 |
| C4 | 「必有下一个驱动者」N=0 + 双向反证 | FR-SELF-013 | ✅ | `driverTerminalReading` 三态；`DTM-3`/`L7X-2` 可 FAIL | 低 |
| C5 | 去重（driverId + ctx 摘要）幂等 | FR-SELF-014 / NFR-SELF-010 | ✅ | `dedupeKey` 单源；`l1-ref-validity` 同因重复 ⇒ 不产生第二条 | 低 |
| C6 | 求值入口恰一处定义 / `requestTurn(` 恰 2 | FR-SELF-015 / 033 / 100 | ✅ | 实测 `function maybeRecommend(` 1 · 调用点 7；`requestTurn(` 定义 1（`:283`）+ 调用点 2（`:3322`/`:3346`）；`nextAfterSettle` 定义 1 / 调用点 7；`op-wiring#OP-W-6` 与 build 读数一致 | 低 |
| C7 | `driverClass` 单源 | FR-SELF-017 | ✅ | `DRIVER_CLASSES` 恰 2；`ref-action` = `'ai-driven'`（供 v55-3 消费），生产零消费（符合「本叶只落 deterministic 分支」读法，见 O-04） | 低 |
| C8 | `priority` 必填 | FR-SELF-018 | ✅ | `DriverDecl.priority` 必填 + `validateDriverDecl` 范围校验 | 低 |
| C9 | 四声明单源恰一处 | FR-SELF-019 / NFR-SELF-004 | ✅ | `DQ-6` 源文本扫描（第二声明 ⇒ FAIL 实跑） | 低 |
| C10 | 终态词汇单源（4，与流终态 6 正交） | FR-SELF-020 / 103 | ✅ | `DRIVER_TERMINALS` 4 项，交集 ∅；`STREAM_TERMINALS` 未改（git diff 无 `stream-model.ts`） | 低 |
| C11 | 三型 ask 逐型可达 next | FR-SELF-021 | ✅ | `L7X-1` 四来源五段断言；`readingOf` 正常段 `ok` | 低 |
| C12 | `ref-round` 作答可判驱动 + sends 不足 | FR-SELF-022 / AC-SELF-010 | ✅ | `applyRefAction` 驱动分支 + `registerSuspension`；`commandSends()===1` 时 `answerNotDropped([],…)===false` | 低 |
| C13 | 「已答」四口径**在生产路径**成立 | FR-SELF-023 / EC-SELF-005 | ❌ | **BLOCK-01**：后台 ask「取消」路径仍登记 `kind:'answered'` 并驱动 `'answered'`（取消未被口径②拦截） | **阻塞** |
| C14 | 每条判据可 FAIL / 禁恒真 | FR-SELF-024 / 111 | ⚠️ | 真源注入复核通过（见 §3.4）；但 `driver-quadruple.test.ts:273` 含恒真断言 `… \|\| true`（**I-01**） | 中 |
| C15 | `applyRefAction` = 裁决 + 驱动，顺序正确 | FR-SELF-025 / X-SELF-5 | ✅ | 驱动分支（`registerSuspension`/`nextAfterSettle`）严格在 `!outcome.allowed` 之后；`l1-ref-validity` 顺序反证实跑 | 低 |
| C16 | `commandSends` 消费面登记 | FR-SELF-026 | ✅ | 唯一生产消费 = `l1/panels.ts:451` 只读投影；无驱动语义（`commandSends[\s\S]{0,40}nextAfterSettle` 负断言） | 低 |
| C17 | `submitDescribe` 补齐驱动 + 空描述零副作用 | FR-SELF-027 / EC-SELF-007 | ✅ | `if (!text) return` 早退逐字保留；非空 ⇒ `registerSuspension(source:'describe')` + `nextAfterSettle({kind:'answered'})` | 低 |
| C18 | 后台 ask 迟到非死端 | FR-SELF-028 / EC-SELF-008 | ✅ | SW `ask-user-response` 未命中 ⇒ `{settled:false, late:true}`（无裸 `errorResponse`）；面板侧固化 `LATE_ASK_TEXT` + 稳态驱动 | 低 |
| C19 | `RecommendTrigger` 含 `'answered'`，旧 4 逐字 | FR-SELF-030 / 101 / X-SELF-2 | ✅ | `DRIVER_TIMINGS` 恰 5；`DT-2/DT-3` 实跑；`sidepanel.ts`/`recommend.ts` 均 re-export | 低 |
| C20 | `ref-action` 抑制时机侧重锚，`when` 零改 | FR-SELF-031 / R-V55-102 | ✅ | `providers.ts:143` 仍为 `… && ctx.session.openAsks === 0 && …`（逐字）；`unanswered` 全仓零命中 | 低 |
| C21 | 时机源闭集单源 + 无散落字面量 | FR-SELF-032 | ✅ | `DT-1/DT-4`；合法白名单仅 `drivers.ts` 单源 + 驱动者 `timings:` 行 + 7 个调用点 | 低 |
| C22 | 防抖三常量逐字 | FR-SELF-034 | ✅ | `recommendation-sources` 门禁绿；`10_000`/`≤3`/`≤1` 未改 | 低 |
| C23 | 新时机不复用 firstRun 语义 | FR-SELF-035 | ✅ | `recommendation.mjs`⑯ 断言 firstRun 入口不含 `kind:'answered'`；`timingOfSettle` 只映射 answered⇒answered | 低 |
| C24 | 时机↔驱动者映射表机核 | FR-SELF-036 / AC-SELF-015 | ✅ | `DQ-4`：`driversForTiming('answered') === ['ref-action']` | 低 |
| C25 | `BLOCKED_TERMINALS` 5 逐字 + 终态新增不混入 | FR-SELF-103 / X-SELF-4 | ✅ | `blocked-terminals#BT-5`（9→11）；`definition.ts` 5 字面量未改 | 低 |
| C26 | X-SELF-5 语义重定义 + 台账条目 | FR-SELF-104 | ❌ | 语义重定义 ✅（C15）；**台账条目缺失**（并入 BLOCK-02） | **阻塞** |
| C27 | X-SELF-6 台账条目 | FR-SELF-105 | ❌ | 代码 ✅（C17）；**台账条目缺失**（并入 BLOCK-02） | **阻塞** |
| C28 | 取代台账 X-SELF-2/4/5/6 + X-SELF-1「未发生取代」 | FR-SELF-107 / AC-SELF-004 / spec §8.3-8 / TASK-V55-125 ② | ❌ | **BLOCK-02**：`docs/v4-supersession-ledger.json` 内 `X-SELF` 命中 **0**；v55-1 仅 2 条体积 `entries`、`modifiedRanges` **0** 条 | **阻塞** |
| C29 | 门禁等价重锚清单（只增） | FR-SELF-110 / AC-SELF-016 / NFR-SELF-001 | ✅ | 10 个既有门禁全部 +N/0 或数值换锚；无断言行删除；`journey`/`binding` 保护段经 `test:supersession` 双绿 | 低 |
| C30 | 新门禁入受审集合 + `CHROMIUM_GATES===9` | FR-SELF-115 | ✅ | `V551_NODE_GATE_FILES` 3→5（+`s0-self-driven-chain`/`law7x-ext`）；`gate-integrity` 16/0 | 低 |
| C31 | 本叶面计数只增 | FR-SELF-116 / AC-SELF-020 | ✅ | node 1186→1244；`dead-end` 39→49；`recommendation` 65→72；`ask-auth` 71→78；`law8` 25→33；`blocked-terminals` 9→11；`next-registry` 16→18；`gate-integrity` 15→16；新 S0 node 8 / Chromium 22 | 低 |
| C32 | 体积五要素 + 预算 + 红线逐字节 | FR-SELF-120 / 123 / NFR-SELF-005 | ✅ | 557,761 B 实测 = 登记；Δ +8,152 = R1 +4,967 + R2 +3,185；ceiling `floor(557761×1.05)=585,649`；档位 `ceilTo50KB=563,200` 未动；超叶预算 7,000（+1,152）已如实登记、未越上界 9,000；content/pick-layer sha 与字节逐字节不变；`manifest.json`/`KIND_SET`/12 kind/`REGISTERED_STRUCTURAL_HOSTS=[]`/`design/**`/`ROADMAP` 零 diff | 低 |
| C33 | S0 全链骨架逐环节 | FR-SELF-130 / AC-SELF-001 | ✅ | 共享样本 `s0-chain.mjs` 10 环节；node 面 `S0N-1~6` 8 用例（亲跑）；双面共用同一文件（`S0C-6` 断言） | 低 |
| C34 | 分支 A 机制侧 + 分支 B 识别侧（A/B 独立计数） | FR-SELF-131 / ADR-V55-005 §3 | ✅ | Chromium 22/0 亲跑：⑦A 三条（trigger=answered ∧ 可达 next ∧ ref-action 可达）+ ⑦B 三条（`op.llm-config` ∧ 零用户回合）分别计 check | 低 |
| C35 | 「答案不被丢弃」 | FR-SELF-132 | ✅ | `answerNotDropped` 只认输入；悬置登记；`law8`⑤ 悬置逐字持有且不落 digest；双面实测 | 低 |
| C36 | 「静默窗口 = 0」单源 | FR-SELF-133 | ✅ | 定义等价 16 组合 ✅；node 面 `driverAttribution` 与 ctx 无关（登记为 **O-01**，可留后续叶强化） | 低 |
| C37 | 归因可读 + 零明文 | NFR-SELF-011 / FR-SELF-111 | ✅ | `law8` 25→33；⑤ 悬置输入零落盘 + ⑥ 迟到文案静态零明文（含 `?q=` 注入反证） | 低 |
| C38 | 代码质量 + 测试断言有效性 | §5.1 / §5.4 | ⚠️ | 命名清晰、职责单一、loud 错误处理、无硬编码/魔法值；唯一弱断言 = `driver-quadruple:273`（I-01） | 中 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 1 | 0 | 1 | 0 | 0%（C38，唯一 Cx；发现 1 处弱断言） |
| 规范符合性 | 20 | 19 | 0 | 1 | 95%（失败 = C13） |
| 架构一致性 | 8 | 5 | 0 | 3 | 62.5%（失败 = C26/C27/C28，同一台账缺口） |
| 测试质量 | 9 | 8 | 1 | 0 | 88.9%（警告 = C14） |
| **合计** | **38** | **32** | **2** | **4** | **84.2%** |

> 「失败」= BLOCK 所在 Cx；4 个失败 Cx 按用户口径归并为 **2 个 BLOCK**（BLOCK-01 / BLOCK-02）。

## 3.4 动手复核证据（用户点名 4 组）

### ① S0 双面复核（实跑）

- `npm test`（node 面）：`tests 1244 / pass 1244 / fail 0`；其中 `S0N-1~S0N-6` 8 用例全绿，`S0N-2` 实测 `silentWindows=0 ∧ silentOk=6 ∧ deadEnds=0 ∧ answerNotDropped=true`。
- `node test/ui/s0-self-driven.mjs`（Chromium 面）：**22 passed / 0 failed**；A/B 两侧分别落在 `S0C-3`（3 check）与 `S0C-4`（3 check），无互相掩盖；⑤ 真点击作答 ⇒ 悬置逐字持有 `原地翻译为中文`，`lastRecommend().trigger === 'answered'`。

### ② `no-dead-end` 39→49 判据升级「真源注入」亲测

- 基线亲跑：**49 passed / 0 failed**（=`39 + 10`，新增 ND-8（7 check）+ ND-9（3 check））。
- **真源注入**（不是门禁自带的 in-memory 变换）：在 `src/ui/sidepanel/next-registry/terminals.ts` 真删一行 `'answered-bg',` ⇒ 亲跑 `node test/ui/no-dead-end.mjs` ⇒ **46 passed / 3 failed**：
  - `✖ ND-8 驱动者终态词汇恰 4（单源…）`
  - `✖ ND-8 (PASS 段) 还原后单源恰 4 …`
  - `✖ ND-9 (FAIL 段) 引用意图作答必须产生悬置登记 + 可达 next`
- `git checkout` 还原后 sha256 `4ddc3411…21cde` 与注入前逐字节相同，复跑 49/0。
- ⇒ 结论：ND-8 的单源判据**确实读真源文件**、可 FAIL，不是恒真；判据升级真实有效。⚠️ 但 ND-8 的两个「FAIL 段」本身使用 `replace()` 在内存里伪造（非文件注入），判据力弱于 ND-5/ND-6 的实跑注入（登记见 I-01 备注）。

### ③ 冻结面 sha / 字节

| 文件 | 字节 | sha256（前 8 / 后 4） | 判定 |
|---|--:|---|---|
| `dist/content.js` | 177,076 | `52a82620…b5f6` | ✅ 与 build 声明一致 |
| `dist/pick-layer.js` | 34,358 | `77796bab…575e` | ✅ 与 build 声明一致 |
| `dist/sidepanel.js` | 557,761 | `3d1e3f8c…db1b` | ✅ = 登记基线 |

`git diff --stat ace3033..HEAD` = 38 文件，**不含** `src/content/**`、`manifest.json`、`docs/v3-supersession-ledger.json`、`ROADMAP.md`、`design/**`、`stream-model.ts`；`build-meta.json#outputs['dist/sidepanel.js']` 输入模块 88（87→88），`drivers.ts` bytesInOutput 3,307、`sidepanel.ts` 99,566（与五要素归因同源），`terminals.ts` **不在输入表**（= build §17.4「不进 bundle」属实）。

### ④ 计数与台账对账

- `test:supersession` 36/0、`test:gate-integrity` 16/0（亲跑）。
- 体积：Δ `557761 − 549609 = 8,152` = R1 `4,967` + R2 `3,185`；R2 归因 `drivers +645` + `sidepanel +2,530`（Σ +3,175 + glue +10）实测 metafile 同源。
- 红线：`KIND_SET` 未改（`messaging.ts` 零 diff）、`REGISTERED_STRUCTURAL_HOSTS === []`、12 kind 未改。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| 1 | `src/ui/sidepanel/sidepanel.ts:2647-2668`（登记在 `:2657-2667`，触发在 `:2665`） | **后台 ask「取消」仍被记成「已答」**：`submitAskFor` 的 `rid && !isRef` 分支在 `send(...).then()` 内**未判 `isCanceled`**，对任意 `bgAskIds` 命中（SW 真实投递）的后台 ask 一律 `registerSuspension({source: late?'late':'bg', kind: late?'answered-late':'answered', …})` 并 `nextAfterSettle({kind: late?'answered-late':'answered'})`。用户在后台 ask 卡点「取消」（`cards/askuser.ts:208-214/287-292` 的 `data-act="cancel"` ⇒ `handleCardAction('cancel')` ⇒ `submitAskFor(rid, undefined, true)`）时，该 ask 被登记为 `answered-bg` 终态并触发 `'answered'` 驱动 —— 直接违反 FR-SELF-023 口径②（取消 ⇒ 不记「已答」）与 EC-SELF-005，且是 ref/op 两条同类路径（均已正确守卫）之外唯一的漏口。根因：`terminals.ts#answeredCaliber` 的判定侧不进 bundle（build §17.4），生产的「终态」只由 `source` 约定，此路径没有应用口径。 | C13 / FR-SELF-023 | 在 `.then()` 内加取消守卫：`if (isCanceled) { nextAfterSettle({ kind: 'settle', force: true }); return; }`（与 op 路径 `:2644` 同口径「取消 ⇒ 稳态驱动集」），或用 `answeredCaliber({canceled:isCanceled, value:trimmed, late})` 统一裁决后再登记/驱动；并补一条「取消后台 ask 不得登记 `answered`」的门禁反证。 |
| 2 | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | **取代台账本叶条目缺失**：`X-SELF` 字符串在该台账命中 **0** 次；v55-1 只有 2 条体积 `entries`（`V551-R1-SVOL-1` / `V551-R2-SVOL-1`），`modifiedRanges` 中 `v55-1-driver-layer` **0 条**。而 spec §8.3 交付物 #8、父 ADR-V55-012 §1（「X-SELF-1~7 的取代台账，落点 = `docs/v4-supersession-ledger.json`」）、本叶 plan §5 共享面义务、tasks.md TASK-V55-125 ② 均要求：**X-SELF-2 / 4 / 5 / 6 条目** + **X-SELF-1「未发生取代」如实登记**（不得留空）。任务被标记 `completed` 但该交付物未落地，build.md 亦未把它作为「未做」登记。 | C26 / C27 / C28 / FR-SELF-104/105/107 | 按 ADR-V55-012 §1 逐条补台账：X-SELF-2（`sidepanel.ts:1791` 类型外移 re-export + `providers.ts` 注释级、`when` 零改；`modifiedRanges[]` 落 `:1791` 1 行）；X-SELF-4（`no-dead-end.mjs` 段外逐行登记 + `stream-model.ts` 零改对照）；X-SELF-5（`sidepanel.ts` 该函数体逐行 + `l1/ref-store.ts` 消费面登记）；X-SELF-6（该函数体逐行）；X-SELF-1（无条目，但在台账/登记面写明「未发生取代：`requestTurn(` 仍恰 2，diff=0」）。补后复跑 `test:supersession`。 |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| 1 | `test/driver-quadruple.test.ts:273` | 恒真断言 `assert.ok(timingMappingProblems([...DECLS, {…ghost…}]).length === 0 \|\| true, …)` —— 该行**永远通过**，而所在用例名与注释声称「映射多一行 ⇒ FAIL」。违反 FR-SELF-111「反证不空转」；虽然「多一行」确实由 DQ-1 承担，但本行的断言是空转（弱断言）。 | C14 / C38 | 删除该行，或改为对「驱动者集合多一行」的实际判据（`bidirectionalProblems`）断言 FAIL；若确需登记「映射表只看闭集」，移出断言改为注释。 |
| 2 | ADR-V55-004 §1 / leaf plan §2/§6 / tasks.md TASK-115「`applyRefAction` 调用点恰 1」 | 与源码不符：实际文本调用点 **2** 处 —— 生产 1（`:2676`）+ 既有 `testing` seam 1（`:1166`，注释自述「calls the production entry point itself」）。该口径**无任何门禁覆盖**（`l1-ref-validity` 只判函数体）。 | C15 / AC-SELF-010 / C12 | 二选一显式化：① 把口径改写为「生产调用点恰 1（`submitAskFor`）+ 既有测试 seam 1」；② 补一条带白名单的调用点计数门禁（seam 显式登记），避免「恰 1」成为不可复核的口号。 |
| 3 | `test/ui/s0-self-driven.mjs` | `JUDGEMENTS` 声明了 `S0C-1-per-beat`（「十环节必须逐环节可判」），但文件内**无任何 check 引用 S0C-1**；Chromium 面的 ①~⑩ 只把「10」当常量（`S0C-6` 查 `S0_CHAIN.length===10`），未像 `no-dead-end` 的 S2 段那样逐拍与样本 `S0_CHAIN` 的 **id / 顺序** 机核 —— 样本被改名/换序时 Chromium 面无感。 | C33 | 把 Chromium 面 10 拍读数组按 `S0_CHAIN.map(b=>b.id)` 逐序断言（对齐 `no-dead-end.mjs` 的 `s2Beats.every((b,i)=>b.id===S2_CHAIN[i].id)`），并让 `S0C-1` 成为真实 check。 |

## 6. 观察项（O，可留后续叶）

| # | 位置 | 内容 |
|---|------|------|
| O-01 | `test/ui/fixtures/s0-chain.mjs#judgeBeat` | 静默窗口的 `driverAttribution` 对**所有** settled 拍取常量 `driversForTiming('answered')[0]`，与 `beat.ctx` 无关 ⇒ 干净态下窗口判据实际由 `next !== null` 单项承担（驱动者/终态两项是冗余 OR）。建议按拍 ctx 抽取驱动者归因。 |
| O-02 | `drivers.ts#PROACTIVE_MOMENTS` vs ADR-V55-003 §3 | 行① 以伞名 `answered-ask` 代替 ADR 逐字的 `answered-ref-ask`/`answered-op-ask`/`answered-bg-ask` 三型，`describe-submitted` 同时是终态词与时刻 —— 已在 build §9.3 显式登记为设计重叠（终态词 4 与之对应关系由 `DRIVER_TERMINAL_MOMENT` 机核）。 |
| O-03 | `drivers.ts:216` `SettleSource.terminal?` | 该字段生产侧零消费（终态由 `source` 判定，见 build §17.4）；属死字段，可随 v55-3 收口清理或显式注明保留理由。 |
| O-04 | `providers.ts:199` | `ref-action` 标注 `driverClass:'ai-driven'`，而 spec FR-SELF-017 括注「本叶只落 `'deterministic'` 分支」；本叶生产侧零 `driverClass` 消费（该字段为 v55-3 的 `pressCandidate` 准备），标注正确即可，无实际偏离。 |

## 7. 结论

**结论**: ❌ 不通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 84%（32/38 Cx） |
| 阻塞问题数 | **2** |
| 规范符合性偏差 | 2 项（FR-SELF-023 生产口径；FR-SELF-107/AC-SELF-004 台账交付物） |
| 可进入 validate | **否**（先修 BLOCK-01/02） |

**理由**：本叶的机制主体**质量高**——驱动者注册表化（集合 ≡ provider、四元组、双向包含）、`'answered'` 时机单入口（`nextAfterSettle` 定义恰 1、`maybeRecommend` 1 定义/7 调用点、`requestTurn(` 恰 2 全保持）、法七扩展两表正交、答案驱动化（ref/op/describe 三路 + 后台迟到）、S0 双面（node 8 / Chromium 22）与 `no-dead-end` 39→49 升级**均经亲跑复核**，冻结面与体积登记诚实自洽。但有两处**必须修**：
1. **BLOCK-01** —— 「已答」四口径在**后台 ask 取消**这一条真实可达的生产路径上不成立（取消被记成 `answered-bg` 并驱动 `'answered'`），直接违反本叶 P0 的 FR-SELF-023 / EC-SELF-005；
2. **BLOCK-02** —— spec §8.3-8 / 父 ADR-V55-012 §1 / TASK-V55-125 ② 明文要求的 X-SELF-2/4/5/6 取代台账条目与 X-SELF-1「未发生取代」登记在 `docs/v4-supersession-ledger.json` **完全缺失**，且以 `completed` 状态收口而未登记遗漏。

两处均非结构性返工（改一处守卫 + 补台账条目），修复后即可进入 validate；3 项 I / 4 项 O 可登记后并行处理。

## 8. 状态登记提醒（SDDU §8.2）

- 本叶 `state.json` 当前**无 `files.review` 字段**，`files.reviewReport` 亦未登记；本次产出 `review.md`（策略）+ `review-report.md`（报告 R1）。请由状态机/用户登记：
  - `files.review` → `.sddu/.../specs-tree-v55-1-driver-layer/review.md`
  - `files.reviewReport` → `.sddu/.../specs-tree-v55-1-driver-layer/review-report.md`
- 本 Agent 未直接修改 `state.json`（依 §8.2：该文件由状态机管理）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1：38 Cx 逐项；2 BLOCK / 3 I / 4 O；S0 双面 + no-dead-end 真源注入 + 冻结面 sha 实跑复核） | 2026-09-23 | SDDU Review Agent |
