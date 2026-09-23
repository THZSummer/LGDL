# 审查报告：specs-tree-v55-1-driver-layer

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C38 审查清单）
> **前置依赖**: review.md、spec.md（43 FR）、plan.md、父 ADR-V55-001/002/003/005、build.md（R1+R2）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-23
> **审查轮次**: R1 → **R2（复审）**
> **版本**: v1.1
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-23
> **更新说明**: R1 初版（静态审查 + 动手复核）→ **R2 复审段追加**：逐 BLOCK 亲注入闭环 + I-01~03 复核 + 全量复扫 + 红线终核 + `npm test` 全量亲跑（1246/0）

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

---

# 审查报告 R2（复审：BLOCK 闭环 + I 项复核 + 全量复扫 + 红线终核）

> **文档定位**: 对 R1 结论（❌ 2 BLOCK / 3 I / 4 O）的**复审轮**——验证修复提交 `c69650e` 的闭环真实性，并做全量复扫与红线终核
> **被审对象**: 分支 `feature/web-cli-plugin` / HEAD `b9eb9fa`；修复提交 `c69650e`（= R1 报告 `19a602f` 的处置轮）；`build.md` v3.0（修复轮记录）
> **审查方式**: 逐 BLOCK **真源注入亲测** + I 项复核（含 2 组注入） + 全量复扫（R1 通过项抽核 + 新引入风险分析） + 红线终核 + `npm test` 全量亲跑
> **日志**: `/tmp/opencode/v4-gate-logs/v55-1-review-r2/`（`10-*` … `80-*`，逐门禁串行）

## R2-0. 复审执行读数总览

| 项 | 读数 |
|---|---|
| `npm test`（node 全量，**两次亲跑**：复审起始 + 全部注入还原后） | **1246 / 0**（= R1 基线 1246，不减） |
| BLOCK-01 亲注入（真删守卫） | `law7x-ext` **4 pass / 1 fail**（`L7X-4` 逐字命中）⇒ 还原（sha 一致）⇒ **5/5 PASS** |
| BLOCK-01 行为对照（真链路 SW→面板→真点击取消） | 有守卫：`suspensions=[]` ∧ `nextOps=6` ∧ `lastTrigger=idle/risk-recovery`；删守卫：`suspensions=[{source:'late',kind:'answered-late',…}]`（漏口复现） |
| BLOCK-02 台账 | `grep -c X-SELF` in `docs/v4-supersession-ledger.json` = **41**；X-SELF-1~7 全在；`test:supersession` **36/0** |
| I-01 / I-02 / I-03 | 全部闭环（见 R2-2，各带注入/抽核证据） |
| 红线终核 | 三冻结面 / `KIND_SET` 40 / 特权手势 / 法八 / journey·binding 保段 / 体积五要素 —— **全部满足**（见 R2-4） |

> **状态登记（SDDU §8.2）**：R1 报告曾提示 `state.json` 缺 `files.review` 登记；修复轮 `c69650e` 已把 `review.md` 与 `review-report.md` 写入本叶 `state.json#files`（复审实测存在）⇒ 策略/报告双文件均已登记，R1 的提醒**已闭环**（本 Agent 不直接改 `state.json`）。

## R2-1. 逐 BLOCK 闭环验证

### BLOCK-01（FR-SELF-023 口径② / EC-SELF-005 生产漏口）— ✅ 闭环

**① 真源注入反证（判据侧）**

- 注入：**真删** `src/ui/sidepanel/sidepanel.ts` 的取消守卫块（4 行 `if (isCanceled) { nextAfterSettle({ kind: 'settle', force: true }); return; }`，非 in-memory 变换）⇒ sha `51df03bb…` → `d54eea5b…`。
- 实跑 `node --test dist-test/test/law7x-ext.test.js` ⇒ **4 passed / 1 failed**，失败项 = `L7X-4`，诊断逐字：「取消守卫缺失（isCanceled ⇒ 不记「已答」，不得驱动 answered）」。
- 还原 `git checkout` ⇒ sha `51df03bb…a21d41` **与注入前逐字节相同**（= build.md §19 登记值）⇒ 复跑 **5/5 PASS**。
- ⇒ `L7X-4` 读真源文件（`sidepanel.ts` 切片），**可 FAIL、非恒真**。

**② 行为对照反证（真链路侧，R2 新增亲测）**

用真实面板走完整链路（临时探针，不入库）：SW `chrome.runtime.sendMessage({kind:'ask-user-request'})` → 面板 `onMessage`（`bgAskIds` 命中，检出 `askuser` 卡 `data-card-key=q3`）→ 真点击 `[data-act="cancel"]`：

| 变体 | 取消后 `suspensions` | 取消后流内可达 `[data-op]` | `lastRecommend` |
|---|---|---|---|
| **有守卫**（HEAD / 557,883 B） | **`[]`**（不记「已答」族） | `op.rebind, op.authorize, op.pick ×2`（**6**） | `{trigger:'idle', rule:'risk-recovery'}` |
| **删守卫**（重建 dist / 557,761 B） | `[{source:'late', kind:'answered-late', late:true, instruction:''}]` | 同上（6） | 同上 |

- ⇒ ① 漏口**真实可复现**（删守卫后取消被登记为 `answered-*`「已答」族）；② 守卫**不引入死端**（两变体均可达 next；守卫走 `nextAfterSettle({kind:'settle',force:true})` = 稳态驱动集，与 op 路 `:2644` / ref 路 `:2685` 同口径）。
- 还原后重建 ⇒ `dist/sidepanel.js` **557,883 B**、`content.js` sha `52a82620…b5f6` / `pick-layer.js` sha `77796bab…575e` **逐字不变**。

### BLOCK-02（X-SELF-1~7 取代台账）— ✅ 闭环

| 判据 | 实测 |
|---|---|
| `grep -c "X-SELF"` | **41**（R1 = 0） |
| 7 个 id 齐备 | X-SELF-1×3 / 2×10 / 3×3 / 4×11 / 5×11 / 6×10 / 7×1 |
| `entries`（双落点之一） | **X-SELF-2 / 4 / 5 / 6** 各含 `file` / `oldTitle→newTitle` / `modificationType:equivalent-rewrite` / `reason` / `leaf:specs-tree-v55-1-driver-layer` |
| `modifiedRanges`（双落点之二） | **V551-MR-X-SELF-2 / 4 / 5 / 6**（`oldId` 承载 id，含 `range` / `deletedLines` / `addedLinesText` / `leaf`） |
| `xSelfLedger.rows` | **恰 7 行**：4 × `superseded` + 1 × `no-supersession`（X-SELF-1） + 2 × `handed-over`（X-SELF-3 → v55-2 / X-SELF-7 → v55-3，**未伪称已取代**） |
| X-SELF-1「未发生取代」**如实性机核** | `requestTurn(` **定义恰 1**（`sidepanel.ts:283`）+ **调用点恰 2**（`:3330` / `:3354`，`grep -c` = 3 = 1 定义 + 2 调用）；`git diff ace3033..HEAD -- src/ui/sidepanel/sidepanel.ts \| grep -c "requestTurn("` = **0** ⇒ 与台账「diff = 0」逐字相符（注：R1 记 `:3322/:3346`，修复轮 +8 行后平移为 `:3330/:3354`，台账取**修复后**行号，一致） |
| 锚点抽核（防橡皮图章） | X-SELF-2 `newTitle` = `export type { RecommendTrigger } from './next-registry/drivers.js';` 在 `sidepanel.ts:45` **逐字存在**；X-SELF-5 `range 2217-2245` ↔ `function applyRefAction` 实测 `:2217`；X-SELF-6 `range 2596-2610` ↔ `submitDescribe` 尾部 `nextAfterSettle({kind:'answered'})` 实测 `:2609` |
| 门禁 | `test:supersession` **36/0** 亲跑；`counts` 同源层日志目录 `/tmp/opencode/v4-gate-logs/v55-1-fix/registry/` **存在** ⇒ 真核验（非 skip）；`zeroDiffFiles`(9) / `protectedRanges` / `protectedSupersession` / `redlineRemap` 四个冻结键**未被修复提交改动**（`git show` 逐行核） |

## R2-2. I 项闭环复核

| # | R1 问题 | R2 复核结论 | 证据 |
|---|---|---|---|
| **I-01** | `driver-quadruple.test.ts:273` 恒真断言 `… \|\| true` | ✅ **已除**（全文件 `\|\| true` 零命中；原行改为真实断言「时机闭集多一行 ⇒ 必判悬空」+ 注释写明「驱动者表多一行」由 DQ-1 承担） | 亲注入：**真删** `timingMappingProblems` 的闭集校验段 ⇒ `driver-quadruple` **13 pass / 1 fail**（DQ-4 反证必红）；还原 ⇒ sha `0febc986…f27a4657` **逐字节一致**（= build §19 登记值）⇒ 复跑 **14/14 PASS** |
| **I-02** | 「`applyRefAction` 调用点恰 1」与源码不符（实测 2）且无门禁 | ✅ **口径显式化 + 静态门禁**：`APPLY_REF_CALL_SITE_WHITELIST`（生产 1 + seam 1 + 逐字锚点）+ `applyRefCallSites` / `applyRefCallSiteProblems`（三段注入反证：第 2 处生产调用 / seam 被删 / 锚点漂移） | 源码抽核：`applyRefAction(` 三处 = `:1166` testing-seam / `:2217` 定义 / `:2684` 生产 ⇒ 归类 `['testing-seam','definition','production']` 与断言一致；`l1-ref-validity` **20/0**；ADR-V55-004 / leaf plan / tasks.md **冻结未改**（修复提交 diff 不含） |
| **I-03** | `S0C-1` 只在 `JUDGEMENTS` 声明、无 check；Chromium 面对样本改名/换序无感 | ✅ **成为两个真 check**：`PANEL_BEATS`（本面实际驱动的十拍）+ `beatCheck()` 唯一入口（未登记 id ⇒ loud 抛错）+ 收尾逐拍 ≥1 真面板读数机核 | 亲跑 `test:s0-self-driven` ⇒ `S0C-1 十环节逐序与共享样本一致` ∧ `实测 10/10 拍有读数` ⇒ **24/0**；亲注入：共享样本首拍 `bind`→`bind-x` ⇒ **23 pass / 1 fail**（`S0C-1` 必红，逐字打出 panel vs sample 序列）；还原 ⇒ sha `d8c3839b…ea2f9d` **逐字节一致**（= build §19 登记值）⇒ 24/0 PASS |

## R2-3. 全量复扫

### ① R1 通过项抽核（亲跑，全 0 fail）

| 面 | 读数 | 面 | 读数 |
|---|---|---|---|
| `op-protocol`（KIND_SET 逐字） | 6/6 | `gate-integrity`（受审集合 + `CHROMIUM_GATES===9`） | 16/16 |
| `capability-wiring` | 9/9 | `op-wiring`（`requestTurn` 2 / `maybeRecommend` 1·7 / 入口定义 1） | 9/9 |
| `capability-revoke` | 5/5 | `law7x-ext`（L7X-1~4） | 5/5 |
| `capabilities` + `local-act-wiring` + `sw-op-mirror` | 32/32 | `l1-ref-validity` | 20/20 |
| `next-registry` | 18/18 | `driver-quadruple` | 14/14 |
| `driver-terminals` | 8/8 | `design-contract`（12 kind 契约） | 19/19 |
| `driver-timings` | 11/11 | `size-ruling-vol3` / `size-budget` / `size-growth-evidence` | 12/12 · 16/16 · 17/17 |
| `blocked-terminals` | 11/11 | `s0-self-driven-chain`（node 面） | 8/8 |

Chromium 面：`s0-self-driven` **24/0** · `dead-end` **49/0（不减）** · `law8` **33/0** · `recommendation` **72/0** · `ask-auth` **78/0** · `journey` **171 PASS（保段）** · `binding` **192 PASS（保段，一次跑通）**。

### ② 新引入风险分析

| 风险 | 结论 |
|---|---|
| 守卫是否引入**新死端**（取消后 settle 驱动可达 next？） | **无**。R2-1② 真链路对照：有/无守卫两变体取消后 `nextOps` 均 6 个（`op.rebind/op.authorize/op.pick`），`lastRecommend = {trigger:'idle', rule:'risk-recovery'}`；守卫走的是**稳态驱动集**（`timingOfSettle('settle')='idle'`），与 op/ref 取消路同口径 |
| 守卫是否改动既有闸门行为 | 否。`dispatch({type:'ask-resolved', canceled:true})`、`bgAsk` 夹具闸门、`send` 载荷（`canceled:true`）**逐字未动**；守卫插在 `if (!bgAsk) return;` 之后、`registerSuspension` 之前 |
| 新增判据是否恒真 | 否。`L7X-4` 亲注入必红（R2-1①）；门禁自带三段注入（删守卫 / 守卫后移 / 守卫内改记 answered）常驻 |
| **N-01（新，低）**：`nextAfterSettle(` 调用点 **7 → 8**（守卫新增第 8 处），`op-wiring#OP-W-6` 只钉「定义恰 1 ∧ 调用点 ≥ 4」⇒ 不破门禁，修复轮 build/门禁未显式登记该 +1 | 登记（见 R2-5），建议 validate 或后续叶在口径中记明 |
| **N-02（新，信息）**：`dist/sidepanel.js` 的 **sha 不可跨重建复现**（内嵌 `BUILD_STAMP` 时间戳，重建后仅 9 字节差、**字节数恒为 557,883**）；`content.js` / `pick-layer.js` 的 sha **重建后逐字不变** | 登记（见 R2-5）：sidepanel 的红线口径是**字节数**，非 sha |

## R2-4. 红线终核

| 红线 | 要求 | 实测（HEAD `b9eb9fa`） | 判定 |
|---|---|---|---|
| **三冻结面** | 逐字节 | `dist/content.js` **177,076 B** / sha `52a82620…b5f6` · `dist/pick-layer.js` **34,358 B** / sha `77796bab…575e` · `dist/sidepanel.js` **557,883 B**（= 登记基线；重建后同） | ✅ |
| **KIND_SET** | 40 逐字 | `messaging.ts#KIND_SET` 实测 **40**（逐字顺序核）；`op-protocol#OP-P-1` 绿 | ✅ |
| **12 kind / 零宿主** | 零新增 | `design-contract` 19/19（B1~B5 卡类型学零新增）；`REGISTERED_STRUCTURAL_HOSTS === []` | ✅ |
| **特权手势** | SW 永不 `permissions.request`（仅手势助手内） | `capability-wiring` 9/9 + `capability-revoke` 5/5 + `capabilities` 等 32/32（「request 调用句法上只在 gesture helper 内」判据绿） | ✅ |
| **法八（零明文四面）** | 33 判据 | `test:law8` **33/0**（含悬置输入不落 digest + 迟到文案静态零明文） | ✅ |
| **journey / binding 保护段** | 171 / 192 不减 | `journey` **171 PASS** · `binding` **192 PASS** | ✅ |
| **体积五要素** | 557,883 / ceiling 585,777 / 档 563,200 | 基线 `SIDEPANEL_BASELINE_BYTES` = **557,883**（= `dist/build-meta.json#outputs['dist/sidepanel.js'].bytes` 实测）· ceiling `floor(557,883 × 1.05)` = **585,777** · 档 `ceilTo50KB(557,883)` = **563,200**（未跨档）· 绝对上限 **619,520** · 逐模块归因 `sidepanel.ts 99,566 → 99,688（+122）`（Σ +122 + glue 0）· `docs/v4-density-baseline.json#volume` 同源（`size-budget` / `size-growth-evidence` / `size-ruling-vol3` / `supersession` 全绿） | ✅ |
| **叶面足迹（不碰冻结面）** | `git diff ace3033..HEAD` 不含清单 | 不含 `src/content/**`、`manifest.json`、`ROADMAP.md`、`design/**`、`v3-supersession-ledger.json`、`stream-model.ts`、`src/background/messaging.ts`（`zeroDiffFiles` 9 项未被本轮改动）；`src/content/**` 在 `953a2ed..HEAD` 的出现属**前一叶 r4-selector-fix（`0a60740`）**，非 v55-1 足迹 | ✅ |
| **禁恒真（FR-SELF-111）** | 无空转断言 | R1 唯一弱断言（I-01）已除；新增 `L7X-4` / I-02 调用点判据 / `S0C-1` 三条均**可 FAIL**（亲注入验证） | ✅ |

## R2-5. 残留 N 项（登记，不阻塞）

| # | 类型 | 内容 | 来源 |
|---|---|---|---|
| N-R2-01 | 观察（低） | `nextAfterSettle(` 调用点 **7 → 8**（取消守卫新增第 8 处）；`op-wiring#OP-W-6` 仅钉「定义恰 1 ∧ 调用点 ≥4」⇒ 无门禁钉死具体数值，修复轮 build 未显式登记该 +1。判据不破、语义正确（守卫必须经唯一入口），建议后续在口径/门禁中显式记明 | R2 新发现 |
| N-R2-02 | 信息 | `dist/sidepanel.js` 的 **sha** 因内嵌 `BUILD_STAMP` 不可跨重建复现（字节数稳定 557,883）；红线口径应以**字节数**为准。`content.js` / `pick-layer.js` 的 sha 重建后逐字不变，可继续作冻结面凭据 | R2 新发现 |
| N-R2-03 | 继承（低） | **O-01~O-04 未处置**：`s0-chain.mjs#judgeBeat` 的 `driverAttribution` 取常量（O-01）· `PROACTIVE_MOMENTS` 伞名 vs ADR 三型（O-02）· `SettleSource.terminal?` 生产零消费死字段（O-03）· `ref-action.driverClass:'ai-driven'` 供 v55-3（O-04）。四项在 HEAD 逐项复核仍成立 | build.md §22.2 |
| N-R2-04 | 继承（登记） | **I-02 的规范文本未改**：ADR-V55-004 §1 / leaf plan §2·§6 / TASK-V55-115 仍写「调用点恰 1」，与源码（生产 1 + seam 1）不符；修复轮不改冻结文本，改以**门禁口径**为准（`applyRefCallSiteProblems`）并登记 | build.md §22.1 |
| N-R2-05 | 继承（设计行为） | `test:supersession` 的 `counts` 同源层依赖 `/tmp/opencode/v4-gate-logs/v55-1-fix/registry/`；该目录被清理时回到**显式 skip**（不静默通过）。复审时目录存在 ⇒ 本轮为真核验 | build.md §22.4 |
| N-R2-06 | 继承（人工面） | S0 主动接手**体感** / 打断感 / 引导文案可读性 = ⏳ **未执行**（headless 不可合成，**不冒充 PASS**） | build.md §22.3 |

## R2-6. 结论

**结论**: ✅ **通过**（R1 的 2 个 BLOCK 均已闭环，3 个 I 均已闭环）

| 指标 | 结果 |
|------|------|
| 阻塞问题 | **0**（R1 的 BLOCK-01 / BLOCK-02 均经**亲注入/亲抽核**验证闭环） |
| 改进项 | **0**（R1 的 I-01 / I-02 / I-03 全部闭环，各带注入或抽核证据） |
| 残留 N 项 | **6**（N-R2-01/02 新发现，均为低 severity/信息；N-R2-03~06 继承登记，不阻塞） |
| 红线终核 | **12/12 全绿**（R2-4） |
| `npm test` | **1246 / 0**（不减） |
| 可进入 validate | **是** |

**理由**：修复轮 `c69650e` 对 R1 的处置**逐条可复核**——BLOCK-01 的守卫是**载荷性**的（真删 ⇒ `L7X-4` 必红；真链路对照 ⇒ 删守卫即复现「取消被记 `answered-late`」漏口），且**不引入新死端**（取消后仍必有可达 next）；BLOCK-02 的台账**双落点齐备**（`entries` + `modifiedRanges`），X-SELF-1「未发生取代」的 diff = 0 与 `requestTurn(` 恰 2 **实测相符**，X-SELF-3/7 如实 handed-over；I-01~03 的三处弱断言/口径漂移/机序缺口均已成为**可 FAIL 的真判据**。全量复扫中 R1 通过项抽核 19 面 + Chromium 7 面全绿，红线终核无一破线，体积五要素与台账同源。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1：38 Cx 逐项；2 BLOCK / 3 I / 4 O；S0 双面 + no-dead-end 真源注入 + 冻结面 sha 实跑复核） | 2026-09-23 | SDDU Review Agent |
| v1.1 | **R2 复审段追加**（对修复提交 `c69650e`）：BLOCK-01 真源注入（删守卫 ⇒ `L7X-4` 必红 ⇒ 还原绿）+ 真链路行为对照（删守卫复现「取消记 `answered-late`」漏口，两变体均非死端）；BLOCK-02 台账 41 命中 + 双落点齐备 + X-SELF-1 diff=0 如实性机核 + `supersession` 36/0；I-01~03 全部闭环（2 组注入 + 1 组抽核）；全量复扫 19 node 面 + 7 Chromium 面抽核；红线终核 12/12；`npm test` **1246/0**；残留 6 项（2 新 + 4 继承）；结论 ✅ 通过 | 2026-09-23 | SDDU Review Agent |
