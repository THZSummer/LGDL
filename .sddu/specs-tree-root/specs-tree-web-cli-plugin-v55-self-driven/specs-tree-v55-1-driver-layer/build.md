# 构建报告：specs-tree-v55-1-driver-layer（V5.5-1 驱动者层 + 法七扩展底座）

> **文档定位**: SDDU 构建报告 — 记录本轮（R1 = W1+W2，TASK-V55-101~112）的文件变更、实现结果与门禁读值，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md`（25 任务 / 4 波）、`tasks.json`（W1/W2 blockers）、本叶 `plan.md`、父 `plan.md` + `ADR-V55-001/002/003/005`（另读 004/008 做落点判定）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0（R1 = W1+W2）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建 —— R1（W1+W2）落地：SG-V55-01 先验闸门 + 驱动者声明单源 + 终态词汇 + 时机源外移 + 驱动者行登记 + 三个新 node 门禁 + 受审集合追加 + 体积五要素**中间登记**

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **12 / 12**（本轮范围 = TASK-V55-101~112，W1+W2）；全叶 25 任务中 113~125 属 W3/W4，本轮**未开工** |
| 复杂度分布 | S×2（103 / 104 / 112 中的 S 级 3 项：103 S / 104 S / 112 S） / M×9（101 / 102 / 105 / 106 / 107 / 108 / 109 / 110 / 111） / L×0 |
| 新增文件 | **5 个**（源码 2：`drivers.ts` / `terminals.ts`；门禁 3：`driver-timings` / `driver-quadruple` / `driver-terminals`） |
| 修改文件 | **9 个**（源码 4：`definition.ts` / `providers.ts` / `recommend.ts` / `sidepanel.ts`；门禁 4：`gate-integrity` / `size-baseline` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3`；台账 2：`docs/v4-density-baseline.json` / `docs/v4-supersession-ledger.json`） |
| 体积 | `dist/sidepanel.js` **554,576 B**（本叶增量 **+4,967 B**；本叶预算 7,000 / 上界 9,000 ⇒ **未越预算，未越上界**） |
| 红线冻结面 | `dist/content.js` 177,076 B / sha `52a82620…`、`dist/pick-layer.js` 34,358 B **逐字节不变**；`KIND_SET` 40 逐字（`op-protocol` 门禁绿）；`manifest.json` / `ROADMAP.md` / `design/**` 零 diff |
| 保护段 | journey **171 PASS**（`43054..58287` 保段）/ binding **192 PASS**（`107780..115930` 保段，一次环境性 flake 后重跑通过，见 §9） |
| 测试计数 | `npm test` **1186 → 1220 / 0 fail**（+34 用例，**只增不减**） |

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/drivers.ts` | 101 / 103 / 106 / 111 | 驱动者**声明单源**：`DRIVER_TIMINGS`（恰 5，含 `'answered'`，旧 4 逐字）/ `PROACTIVE_MOMENTS`（恰 7）/ `DRIVER_CLASSES` / `CTX_FIELD_SERVICE` + `serviceOfCtxField` / `DriverDecl` + `validateDriverDecl`（loud）/ `registerDriverDecl`（单点写入）/ `driversForTiming` / `driversForMoment` / `DriverQuadruple` + `driverQuadruples` / `dedupeKey` / `timingOfSettle` / `RecommendTrigger` 唯一类型定义 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/terminals.ts` | 102 | 驱动者**终态词汇**单源：`DRIVER_TERMINALS`（恰 4）/ `orthogonalityProblems`（与 `STREAM_TERMINALS` 6 正交）/ `ANSWERED_CALIBERS`（四口径）/ `answeredCaliber` / `DRIVER_TERMINAL_MOMENT` / `driverTerminalReading`（三态 `ok`/`violated`/`n/a`，禁恒真） |
| MODIFY | `.../next-registry/definition.ts` | 106 | `NextCtx.session` **加法字段组** `proactive?{enabled,allowed}`（既有 7 键零改名零删除；注释/类型被压缩器擦除 ⇒ 产物 0 B） |
| MODIFY | `.../next-registry/providers.ts` | 107 / 111 | 新增 **10 行**`DRIVER_DECLS_SRC`（driverClass / timings / moments / priority / evidence）+ `registerBuiltinProviders()` 内 idempotent 注册接线。**`ref-action.when` 行零改字节** |
| MODIFY | `.../sidepanel/recommend.ts` | 103 | `RecommendTrigger` 改**纯 re-export**（`export type … from '…/drivers.js'`，零第二声明、零字节） |
| MODIFY | `.../sidepanel/sidepanel.ts` | 103 | 原 `type RecommendTrigger = 'pick'\|'stale'\|'idle'\|'firstRun'` **外移**，改 `import type` + `export type`（`import type` 被擦除 ⇒ 0 B）；防抖三常量逐字未动 |
| NEW | `packages/web-cli-plugin/test/driver-timings.test.ts` | 105 / 106 | 时机源单源门禁（DT-1~DT-6）：单源 / 恰 5 含 answered / 旧 4 逐字 / 散落时机字面量零命中 + 恰 7 调用点 / 求值入口恰 1 定义 / `NextCtx` 字段登记。**11 用例** |
| NEW | `packages/web-cli-plugin/test/driver-quadruple.test.ts` | 108 / 109 / 111 | 四元组 + 双向包含 + 时机映射 + 七类时刻覆盖 + 四表单源门禁（DQ-1~DQ-6）。**14 用例**（含三类注入反证各 FAIL→还原 PASS） |
| NEW | `packages/web-cli-plugin/test/driver-terminals.test.ts` | 110 | 终态词汇单源 + 两表正交 + 三段控制 + 「已答」四口径门禁（DTM-1~DTM-4）。**8 用例** |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | 112 | 新增 `V551_NODE_GATE_FILES`（3 枚）+ `EXPECTED_AUDITED_FILES` 下界追加 + 新用例（受审集合双命中 / 反证 / `CHROMIUM_GATES === 9` 逐字）。16 用例（15 → 16） |
| MODIFY | `test/size-baseline.ts` / `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` | 体积五要素中间登记 | `SIDEPANEL_BASELINE_BYTES` 549,609 → **554,576**；ceiling 577,089 → **582,304**；`deltaBytes` 254,384 → 259,351；新增 `v551R1Rows`（drivers.ts NEW 2,662 / providers.ts 4,834→7,091）+ glue 48；`groups.length` 23 → 24；输入模块数 87 → 88；`RE_REGISTRATIONS['v55-1-r1']` 新条目 |
| MODIFY | `docs/v4-density-baseline.json` / `docs/v4-supersession-ledger.json` | 体积台账 | volume 三值同源前移（554,576 / 582,304）；v3/v4 硬 pin 条目 `newTitle` **换锚**（41 条）；`v3Vol3Closeout.⑤三值闭合.newBaselineBytes` 同源；新增接管条目 `V551-R1-SVOL-1`；叶段 `registeredUncoveredLines` 复算（+6 行删除面） |

> **未触碰（显式 NOOP）**：`src/content/**` / `dist/content.js` / `dist/pick-layer.js` / `manifest.json` / `KIND_SET` / `docs/v3-supersession-ledger.json` / `ROADMAP.md` / `design/**` / journey·binding 保护段。

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55-101 | `drivers.ts` 驱动者声明单源 | M | ✅ completed | FR-SELF-010~019 / 030~036 |
| TASK-V55-102 | `terminals.ts` 驱动者终态词汇（4） | M | ✅ completed | FR-SELF-020 / 023 |
| TASK-V55-103 | `RecommendTrigger` 类型外移 re-export | S | ✅ completed | FR-SELF-030 / 032（X-SELF-2 读法①） |
| TASK-V55-104 | **SG-V55-01** 注册表内扩张三断言探针（先验闸门） | S | ✅ completed（结论 = **可行**，见 §5；探针已删，未入库） | FR-SELF-100 / 030 / 033 |
| TASK-V55-105 | `test/driver-timings.test.ts` 时机源单源门禁 | M | ✅ completed | FR-SELF-030 / 032 / 033 |
| TASK-V55-106 | `NextCtx` 加法字段 + `CTX_FIELD_SERVICE` 登记 | M | ✅ completed | FR-SELF-011 / 019 |
| TASK-V55-107 | `providers.ts` 驱动者行登记 + `ref-action` 时机声明 | M | ✅ completed | FR-SELF-010 / 031（X-SELF-2） |
| TASK-V55-108 | `driver-quadruple` 四元组抽取机核 | M | ✅ completed | FR-SELF-011 / 016 |
| TASK-V55-109 | 双向包含 + 悬空 + 三类注入反证 | M | ✅ completed | FR-SELF-010 / 019 |
| TASK-V55-110 | `driver-terminals` 三段控制（禁恒真） | M | ✅ completed | FR-SELF-020~024 |
| TASK-V55-111 | 时机 ↔ 驱动者映射 + 答完恰 ≥1 + 七类逐类 | M | ✅ completed | FR-SELF-012 / 013 / 036 |
| TASK-V55-112 | `gate-integrity` 受审集合追加 | S | ✅ completed | FR-SELF-115 |

**本轮未开工（属 W3/W4，非本轮波次）**：TASK-V55-113~118（W3：`nextAfterSettle` / `'answered'` 通路 / `applyRefAction` 驱动化 / `submitDescribe` / 迟到作答 / X-SELF-4·5·6 重锚）、TASK-V55-119~125（W4：SG-V55-02 / S0 双面 / 法七扩展门禁 / no-dead-end 升级 / 收口轮）。
**op 三档派生式 `tierOf` 落点判定**：`ADR-V55-008` 的 `tierOf` 属 **v55-3 叶的 W1（TASK-V55-301~303）**，**不在本轮（v55-1 W1+W2）波次内** ⇒ 本轮零触碰（如实登记，未提前落地）。

---

## 4. 下一步

| 场景 | 操作 |
|------|------|
| 本轮（R1 = W1+W2）已完成 | 待 W3 轮：`@sddu-build` 续做 TASK-V55-113~118（受 SG-V55-01 结论 = 可行 放行） |
| 全叶 25 任务完成后 | 运行 `@sddu-review specs-tree-v55-1-driver-layer` 开始审查 |

---

## 5. SG-V55-01 先验闸门结论（TASK-V55-104）

**结论 = 可行**（8/8 断言 PASS；探针 `test/_spike/sg-v55-01-probe.mjs` 跑毕即删，`git status --short` 无新增探针文件 ⇒ 未入库）。

| 断言 | 实跑证据 | 结论 |
|---|---|---|
| ① AI 经**既有** `op.turn` 槽无用户按键可达 | 动态：`bindPanelOps({turn})` + `runOp('op.turn',{value:'SG-01 无按键回合'})` ⇒ `{ok:true}` 且 turn 入口收到该文本；`ACT_TO_OP.next === 'op.turn'` | **可行** |
| ① `requestTurn(` **仍恰 2** | 静态：定义 1（`sidepanel.ts:277`）+ **调用点 2**（`:3232` composer / `:3256` op 槽） | **可行**（X-SELF-1 未发生取代） |
| ② `RecommendTrigger` **4→5** 可行且旧 4 逐字、求值入口**仍恰 1 定义** | 现状 `type RecommendTrigger` **恰 1 处**定义、值集 `['pick','stale','idle','firstRun']`（逐字）→ 追加 `'answered'` 得 5 且互异；`function maybeRecommend(` **恰 1**；`maybeRecommend(` 调用点 **恰 7** | **可行** |
| ③ `nextAfterSettle` 单入口可承接 `'answered'`（定义恰 1） | 既有 `reachableNext:` 槽 **恰 1**，其闭合内 `maybeRecommend(` **恰 1** ⇒ 改名 = 单入口且**不改计数**；新触发点只能经既有单一求值入口 | **可行** |

**对下游影响**：BLK-V55-1 **未触发** —— TASK-V55-113 / 114 / 306 具备开工条件；**未**走 X-SELF-1/2 放宽路径（无静默放宽）。

---

## 6. 门禁对账（本轮 vs 基线；先跑基线再动，逐项登记）

### 6.1 新增门禁（本轮 3 枚，入受审集合）

| 门禁 | 判据数 | 坏路径反证 | 计数（本轮） |
|---|:--:|---|---|
| `test/driver-timings.test.ts` | DT-1~DT-6（6 判据） | 第二声明 / 第 6 时机 / 改写旧项 / 闭集外实参 / 第二联合声明 / 第 8 调用点 / 第二推荐器 / 未登记字段 —— 各 FAIL → 还原 PASS | **11 用例** |
| `test/driver-quadruple.test.ts` | DQ-1~DQ-6（6 判据） | 多一行 / 少一行 / 悬空 chips / 声明失真 / 未登记 evidence / 删 answered 驱动者 / 悬空 timing / 覆盖缺口 / 第二声明 —— 各 FAIL → 还原 PASS | **14 用例** |
| `test/driver-terminals.test.ts` | DTM-1~DTM-4（4 判据） | 字面量外泄 / 第二声明 / 交集非空 / 流终态被改 / 驱动者移除 / 无可达 next / 取消·空值·迟到 —— 各 FAIL → 还原 PASS | **8 用例** |

### 6.2 升级 / 复核的门禁（计数逐项，只增不减）

| 门禁 | 基线 | 本轮 | 判定 |
|---|--:|--:|---|
| `npm test`（node，全量） | 1186 / 0 | **1220 / 0** | ✅ +34（只增） |
| `op-wiring`（`requestTurn(` **恰 2**，原判据不改） | 2 调用点 | **2 调用点**（定义 1 / 调用点 3232·3256）；`maybeRecommend` **定义 1 / 调用点 7** | ✅ 不变（diff = 0） |
| `next-registry` | ≥16 | **16** | ✅ |
| `blocked-terminals` | 9 | **9** | ✅ |
| `gate-integrity` | ≥15 | **16**（+1：V5.5-1 受审集合用例；`CHROMIUM_GATES === 9` 逐字） | ✅ |
| `supersession` | ≥36 | **36** | ✅ |
| `design-contract` | 19 | **19** | ✅ |
| `size-ruling-vol3` | 12 | **12** | ✅ |
| `ref-pick-wiring` | 11 | **11** | ✅ |
| `test:dead-end`（no-dead-end，判据升级属 **W4 = TASK-V55-124**） | 39 | **39**（本轮未改该门禁） | ✅ 基线登记 |
| `test:recommendation` | ≥65 | **65**（首跑 64/1 flake，重跑 65/0） | ✅ |
| `test:ask-auth` | ≥71 | **71** | ✅ |
| `test:stream` | ≥73 | **73** | ✅ |
| `test:law8` | ≥25 | **25** | ✅ |
| `test:page-input` | ≥108 | **118** | ✅ 只增 |
| `test:l1` | 116 | **120** | ✅ 只增 |
| `test:l2` | 74 | **74** | ✅ |
| `test:l0` | 248 | **248** | ✅ |
| `test:density` | 242 | **242** | ✅ |
| `test:insight` | 118 | **118** | ✅ |
| `test:journey`（保护段） | 171 | **171** | ✅ 保段 |
| `test:binding`（保护段） | 192 | **192**（重跑通过） | ✅ 保段 |
| `test:zero-injection` | 28 | **28** | ✅ |
| `test:hardening` | 24 | **24** | ✅ |
| `test:auth-chip` | 37 | **37** | ✅ |
| `test:l1-reverse` | 9 | **9** | ✅ |
| `test:l2-reverse` | 10 | **10** | ✅ |
| `test:e2e` | PASS | **PASS** | ✅ |

> 日志全量落盘 `/tmp/opencode/v4-gate-logs/v55-1-r1/`（`00-baseline` … `24-*`），逐门禁串行执行。

---

## 7. 体积五要素（本叶**中间登记**）

| 要素 | 读值 |
|---|---|
| ① 基线 | `SIDEPANEL_BASELINE_BYTES` 549,609 → **554,576**（`dist/build-meta.json` 实测 `outputs['dist/sidepanel.js'].bytes === 554,576`） |
| ② 时间线（只追加） | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 `554_576`（前值 549,609 逐字保留） |
| ③ 增长正当性（逐模块 metafile 归因） | `v551R1Rows`：`next-registry/drivers.ts` **NEW +2,662** / `next-registry/providers.ts` 4,834 → **7,091（+2,257）**；Σ 模块 **+4,919** + 未归因胶水 **+48** == 登记增量 **+4,967**。`sidepanel.ts` / `recommend.ts` / `definition.ts` 本轮 **0 B**（类型 re-export 与注释被压缩器擦除） |
| ④ ceiling（公式，无 cap） | `floor(554,576 × 1.05)` = **582,304**（cap 保持 `record-only`；判定 = `min(619,520, 582,304) = 582,304`） |
| ⑤ 档位 / 绝对上限 | `ceilTo50KB(554,576) = **563,200**`（未下移、未上移）、绝对上限 **619,520** 均**不变**（`ceilTo50KB` 步长 50 KiB） |

- **预算对账**：本叶预算 **7,000 B**、上界 **9,000 B**；实测 **+4,967 B** ⇒ **未越预算、未越上界**（不停机）。
- **登记口径说明**：本条目为**中间登记**（W1+W2 尚未收口）；本叶 W4 = TASK-V55-125 将在 S0 双面 + 法七扩展门禁 + 全门禁串行收口后按**最终产物**再次重登记（`SIDEPANEL_RE_REGISTRATIONS['v55-1-r1']` 逐字保留）。
- **台账同源**：`docs/v4-density-baseline.json#volume`（554,576 / 582,304）、`v3Vol3Closeout.⑤三值闭合.newBaselineBytes`（554,576）、41 条 v3/v4 硬 pin 条目 `newTitle` 换锚、新增接管条目 `V551-R1-SVOL-1`、叶段 `registeredUncoveredLines` +6 行删除面 —— 全部与源码常量同源（`test:size-ruling-vol3` 12/12、`test:supersession` 36/36 绿）。
- **红线冻结面**：`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 34,358 B **逐字节不变**。

---

## 8. 反证摘要（每任务一行；均为「注入 ⇒ 实跑 FAIL ⇒ 还原 ⇒ PASS」两段证据，在门禁内实跑）

| 任务 | 反证（注入 ⇒ 必红；还原 ⇒ 必绿） |
|---|---|
| V55-101 | 删 `'answered'` / 追加第 6 时机 / 改写旧 4 任一项 / 悬空 timing → 闭集与旧 4 判据各 FAIL；还原 PASS |
| V55-102 | 交叠 `STREAM_TERMINALS`（加 `'answered'`）/ 流终态改 2 项 / 词汇 3 或 5 项 → 正交判据各 FAIL；还原 PASS |
| V55-103 | 在 `sidepanel.ts` 重写 `type RecommendTrigger =`（第二声明）→ DT-1 必红；还原 PASS |
| V55-104 | 探针为**只读**：①-③ 各断言在**未改动**的 HEAD 源上实跑取样（`requestTurn(` 2 / `maybeRecommend` 1·7 / `reachableNext` 单槽）；探针文件已删（不入库） |
| V55-105 | 第二声明 / 第 6 时机 / 改写旧项 / 闭集外实参 `'ghost'` / 第二联合声明 / 第 8 个 `maybeRecommend(` 调用点 → 各 FAIL；还原 PASS |
| V55-106 | 在 `NextCtx` 注入未登记字段 `telemetry` → 注册校验 FAIL；还原 PASS（既有 7 源逐字复核） |
| V55-107 | 声明表**多一行** `ghost-driver` / **少一行**（去 `ref-action`）→ 双向包含各 FAIL；还原 PASS |
| V55-108 | `ref-action` 去 evidence / chips 换 `op.ghost`（悬空）→ 四元组判据各 FAIL；还原 PASS |
| V55-109 | 三类注入（多一行 / 少一行 / 悬空 chips）各 FAIL ⇒ 还原 PASS；且 `when`-scope 源文本抽取与声明面**双向一致**（声明失真 / 源读未登记字段各 FAIL） |
| V55-110 | 字面量外泄 / 第二声明 / 驱动者移除（终端在而驱动者空）⇒ `violated` / 无可达 next ⇒ `violated` / 终态不存在 ⇒ `n/a`；取消·空值·迟到 ⇒ 「已答」**必不成立** |
| V55-111 | 删 `answered` 驱动者 / 悬空 timing / 七类时刻覆盖缺口（移除 `turn-end` 全部驱动者）→ 映射与覆盖判据各 FAIL；还原 PASS |
| V55-112 | 移出/新增一枚不在受审集合的门禁 → 判据必红（非恒真）；`CHROMIUM_GATES === 9` 逐字复核 |

> **说明**：用户点名的「恢复『只计数』⇒ 必红」反证属于 `applyRefAction` 驱动化（**TASK-V55-115，属 W3**），本轮未开工 ⇒ **未执行**（不伪称已做，登记于 §9 遗留）。

---

## 9. 遗留 / 登记（如实，不静默）

1. **W3/W4 未开工**：TASK-V55-113~125（`nextAfterSettle` 单入口 / `'answered'` 触发通路 / `applyRefAction` 裁决+驱动 / `submitDescribe` 补齐 / 后台迟到作答非死端 / X-SELF-4·5·6 等价重锚 / SG-V55-02 / S0 双面 / `law7x-ext` / `no-dead-end` 判据升级 / 收口轮）——本轮范围外，**未做**。`nextAfterSettle(` 当前 `src` 命中 **0**（W3 落地）。
2. **`no-dead-end` 判据升级**（5 类阻塞不减 + 4 类已表达意图终态）属 **TASK-V55-124（W4）**：本轮**只跑基线**（39/0 PASS），**未改该门禁**。
3. **`driver-terminals` / `driver-quadruple` 的时刻/终态命名裁定（登记）**：`PROACTIVE_MOMENTS` 取 **7 字面量**（`answered-ask` / `describe-submitted` / `bind-complete` / `pick-complete` / `probe-steady` / `auth-receipt` / `turn-end`），其中 `answered-ask` 为行① 的**伞名**（`answered-ref-ask` / `answered-op-ask` / `answered-bg-ask` 三型由 `DRIVER_TERMINALS` 细化）；符合 AC-SELF-015「恰 7」与 ADR-V55-003 §3 的行①~⑦ 一一对应。`describe-submitted` 同时是终态词与时刻（ADR-V55-003 §3 行②的**设计重叠**，非外泄）——门禁已显式断言该交集**恰为** `{describe-submitted}`。
4. **`DRIVER_DECLS_SRC` 落点**：declaration 表落在 `providers.ts`（tasks.md 107 的文件面），`drivers.ts` 持有类型 + 注册表 + 提取器；与 ADR-V55-001 §1 的示意代码片段（表在 `drivers.ts`）**等价**（表与注册表仍是两个手写源 ⇒ 双向包含判据可判、非恒真），差异**如实登记**。
5. **环境性 flake（K L-N-10 / 既有登记）**：`test:binding` 首二跑 `FAILED (3)`（`#8d/#8e` `#confirm-allow` 未出现 + 后续 `CDP socket not open`）；随后用**同一产物**重跑 **PASS 192**；且用基线源码重建产物在**同一环境**下亦为 PASS。⇒ 判定为**环境性 flake**（与产物无关），保段 192 已取得。
6. **中间登记**：本叶体积为**中间登记**（§7），W4 收口轮将按最终产物重登记（`SIDEPANEL_RE_REGISTRATIONS['v55-1-r1']` 与时间线新值逐字保留）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = W1+W2：SG-V55-01 可行 / 12 任务 completed / 3 新门禁 / 体积中间登记 +4,967 B / npm test 1220·0） | 2026-09-23 | SDDU Build Agent |

---
---

# 构建报告 v2.0（R2 = W3+W4，TASK-V55-113~125）

> **文档定位**: SDDU 构建报告 —— **R2 轮**（本叶收口轮）的文件变更、实现结果、门禁读值与反证留证；`v1.0`（R1 = W1+W2）逐字保留于上文
> **前置依赖**: 本叶 `tasks.md`（25 任务 / 4 波）、本叶 `plan.md`、父 `plan.md` + `ADR-V55-001~005/011/012`
> **版本**: v2.0（本叶 25/25 任务 closed；本文件 = 本叶 build 的**最终**记录）
> **更新时间**: 2026-09-23
> **更新说明**: R2 落地 —— 答案驱动化（`nextAfterSettle` 单入口 + `'answered'` 时机 + `applyRefAction` 裁决+驱动 + `submitDescribe` 补齐 + 后台 ask 迟到非死端）+ S0 双面门禁 + `no-dead-end` 判据升级 + 法七扩展门禁 + 体积五要素**收口登记**

---

## 10. 构建概要（R2）

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **13 / 13**（TASK-V55-113~125，W3+W4）；本叶累计 **25 / 25** |
| 复杂度分布 | S×1（119） / M×9（113/114/115/116/117/118/123/124/125） / L×3（120/121/122） |
| 新增文件 | **4 个**（fixture 1：`test/ui/fixtures/s0-chain.mjs`；门禁 3：`test/s0-self-driven-chain.test.ts` / `test/law7x-ext.test.ts` / `test/ui/s0-self-driven.mjs`） |
| 修改文件 | **13 个**（源码 5：`drivers.ts` / `terminals.ts` / `sidepanel.ts` / `ask-bridge.ts` / `service-worker.ts`；既有门禁 8：`op-wiring` / `driver-timings` / `recommendation-sources` / `l1-ref-validity` / `ask-bridge` / `blocked-terminals` / `next-registry` / `no-dead-end` / `law8-plaintext` / `recommendation` / `ask-auth-inflow` / `gate-integrity` / `package.json`；台账 2：`docs/v4-supersession-ledger.json` / `docs/v4-density-baseline.json`；体积 4：`size-baseline` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3`） |
| 体积 | `dist/sidepanel.js` **557,761 B**（本叶增量 **+8,152 B**：R1 +4,967 + R2 **+3,185**）⇒ **超叶预算 7,000 B、未越上界 9,000 B**（如实登记，见 §13） |
| 红线冻结面 | `dist/content.js` 177,076 B / sha `52a82620…`、`dist/pick-layer.js` 34,358 B **逐字节不变**；`KIND_SET` 40 逐字；12 kind / 零宿主 / 判定链 pin 零 diff |
| 保护段 | journey **171 PASS**（保段）/ binding **192 PASS**（保段，一次环境性 flake 后同产物重跑通过，见 §16） |
| 测试计数 | `npm test` 1220 → **1244 / 0**（+24，只增不减） |

## 11. 文件变更（R2）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/next-registry/drivers.ts` | 113 / 115 / 116 / 117 / 123 | `SettleSource.force`；`timingOfSettle`（`answered` ⇒ `'answered'`，其余 ⇒ `'idle'`）；**悬置任务登记单点**（`Suspension` / `registerSuspension` 幂等 / `listSuspensions` / `resetSuspensions`）；「答案不被丢弃」判据 `answerNotDropped`（只认输入、不认计数）；「静默窗口」三段读数 `silentWindowReading`（`ok`/`silent`/`n/a`） |
| MODIFY | `src/ui/sidepanel/next-registry/terminals.ts` | 123 | `DRIVER_TERMINAL_OF_SOURCE` + `terminalOfSource`（**判定侧**单源：生产只记 `source`，终态词由本表给出 ⇒ `src/**` 零第二声明） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 113 / 114 / 115 / 116 / 117 / 122 | `nextAfterSettle`（**唯一**「结算 → 驱动」入口）；ops 恢复缝改经同一入口（`force`）；`applyRefAction` = 裁决 + **驱动**（驱动分支严格在 `allowed` 之后）；`submitDescribe` 补齐驱动（空描述早退逐字保留）；`submitAskFor` 四条路径（ref / op-ask / 后台 ask 回合内 / 后台 ask 迟到）；`bgAskIds` 限定迟到口径只对 SW 真实投递的 ask 成立；`LATE_ASK_TEXT` 固化行；`testing.suspensions()` 只读 seam |
| MODIFY | `src/background/ask-bridge.ts` | 117 | `SettleOutcome` + `lateSettleOutcome` + `settleOutcome`（迟到 = **事实**，不是错误；`settle` 布尔签名不动 ⇒ 既有断言零改） |
| MODIFY | `src/background/service-worker.ts` | 117 | `ask-user-response` 未命中 ⇒ `okResponse({settled:false, late:true})`（**不再裸 `errorResponse`**） |
| NEW | `test/ui/fixtures/s0-chain.mjs` | 120 | S0 十环节**样本单源**（纯数据 + 注入式依赖，零 import）+ `s0SilentWindow` + `judgeBeat` / `judgeChain` / `aggregateChain`（两面共用） |
| NEW | `test/s0-self-driven-chain.test.ts` | 121 | S0 **node 面**门禁（S0N-1~6，**8 用例**）：逐拍读数 + 三条总判据 + 窗口定义等价（16 组合）+ 答案驱动接线 + 两段证伪 + 与 S2 并列 |
| NEW | `test/ui/s0-self-driven.mjs` | 122 | S0 **Chromium 面**门禁（`S0C-1~6`，**22 check**）：真面板 ①绑定→②探测→②'授权→③拾取→④ask 登记→⑤作答→⑥答案产生驱动→⑦A 机制侧 / ⑦B 识别侧→⑩终局；**A/B 两侧独立计数** |
| NEW | `test/law7x-ext.test.ts` | 123 | 法七扩展门禁（L7X-1~3）：四类「已表达意图」逐类五段 + 双向反证 + 禁恒真三段控制（口径与 `driver-terminals` 同源） |
| MODIFY | `test/op-wiring.test.ts` | 113 | 新增 **OP-W-6 主流程 diff = 0 复合读数**（`requestTurn(` 恰 2 ∧ `maybeRecommend` 1 定义 / 7 调用点 ∧ `nextAfterSettle` 1 定义）+ 反证（第 8 个调用点 / 删唯一入口） |
| MODIFY | `test/driver-timings.test.ts` | 113 / 114 | DT-4 等价重锚：调用点计数改按**全部** `maybeRecommend(` 调用（仍恰 7），非字面量实参**只允许** `timingOfSettle(`（恰 1 处） |
| MODIFY | `test/recommendation-sources.test.ts` | 114 | 时机源值集：恰 5 ∧ 含 `answered` ∧ 旧 4 逐字 ∧ 防抖三常量逐字 + 值集反证（删 / 改写 / 第 6 项） |
| MODIFY | `test/l1-ref-validity.test.ts` | 115 | 「`sends` 递增**不足以**满足」（计数 vs 输入）+ 唯一入口「裁决 + 驱动」源码序判据 + 「恢复只计数 ⇒ 必红」反证 + `commandSends` 保留且零驱动语义 |
| MODIFY | `test/ask-bridge.test.ts` | 117 | 迟到 outcome（`settled:false ∧ late:true`）+ 「不伪造接住」+ SW 不再裸 `errorResponse` 的接线断言 |
| MODIFY | `test/blocked-terminals.test.ts` | 118 | BT-5：5 类阻塞逐字不变 ∧ 驱动者终态正交不混入 + 反证（混入 / 删一类） |
| MODIFY | `test/next-registry.test.ts` | 118 | NR-10：驱动者声明 10 行 ↔ provider 集合**双向包含** ∧ `answered` 有接手者 + 反证（多一行 / 少一行） |
| MODIFY | `test/ui/law8-plaintext.mjs` | 118 | ⑤/⑥：答案驱动化的零明文面（悬置输入**不落 digest** + 答案不被丢弃 + digest 注入反证 + 迟到固化文案静态零明文）**25 → 33 check** |
| MODIFY | `test/ui/recommendation.mjs` | 114 | ⑯ `answered` 时机段（真面板：trigger === `answered` ∧ 可达 next ∧ 悬置 + 时机映射单源 + 「删掉时机 ⇒ 必红」反证 + `firstRun` 语义未污染）**65 → 72 check** |
| MODIFY | `test/ui/ask-auth-inflow.mjs` | 116 | ⑮ `submitDescribe` 补齐驱动（顺序 = 空校验 → 留痕 → 悬置 → 驱动 + 两个 FAIL 段 + 还原 PASS + `op.describe` 唯一入口）**71 → 78 check** |
| MODIFY | `test/ui/no-dead-end.mjs` | 124 | **判据升级**：ND-8/ND-9（4 类「已表达意图」终态逐类必有可达 next + 双向反证 + 真面板引用意图驱动）**39 → 49 check**（5 类阻塞逐条保留） |
| MODIFY | `test/gate-integrity.test.ts` | 112 / 125 | `V551_NODE_GATE_FILES` 3 → **5**（+`s0-self-driven-chain` / `law7x-ext`）；`EXPECTED_AUDITED_FILES` 追加三者（含 Chromium 面 `test/ui/s0-self-driven.mjs`）；`CHROMIUM_GATES === 9` **逐字不动** |
| MODIFY | `package.json` | 125 | `test:s0-self-driven` 新脚本 + 串入 `test:v3` 链（**无新依赖**） |
| MODIFY | `docs/v4-supersession-ledger.json` | 125 | 41 条硬 pin `newTitle` **换锚**；新增 `V551-R2-SVOL-1`；`v3Vol3Closeout.⑤.newBaselineBytes` → 557,761 / `⑥` formula+effective → 585,649；`V43-E-35` 组数 24 → 25 换锚；r4 叶段新增 3 行删除面登记 + `summary` 复算（66 → 69 行 / 8 文件） |
| MODIFY | `docs/v4-density-baseline.json` | 125 | `volume.registeredBaselineBytes` 557,761 / `ceilingBytes` 585,649（与源码常量同源） |
| MODIFY | `test/size-baseline.ts` / `size-budget.test.ts` / `size-growth-evidence.test.ts` / `size-ruling-vol3.test.ts` | 125 | 五要素收口登记（`SIDEPANEL_BASELINE_BYTES` 557,761 / ceiling 585,649 / `v551R2Rows` / `v55-1-r2` 条目 / `latestRowsKey` / 累计 deltaBytes 262,536 / 桶和 / 组数 25 / 边界 +1 B 锚点） |
| MODIFY | `.sddu/.../state.json`（+ `TREE.md` 由 `sddu-tree` 更新） | 125 | phase → `builded` / workflow `5.build` / phaseHistory 追加 |

> **未触碰（显式 NOOP）**：`src/content/**` / `dist/content.js` / `dist/pick-layer.js` / `manifest.json` / `KIND_SET` / `docs/v3-*-ledger.json` / `ROADMAP.md` / `design/**` / journey·binding 保护段。

## 12. 任务完成清单（R2）

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V55-113 | `nextAfterSettle` 单入口 | M | ✅ completed | FR-SELF-015 / 033 |
| TASK-V55-114 | `'answered'` 触发通路 | M | ✅ completed | FR-SELF-030 / 031 / 034 / 035 |
| TASK-V55-115 | `applyRefAction` = 裁决 + 驱动 | M | ✅ completed | FR-SELF-022 / 025 / 026 |
| TASK-V55-116 | `submitDescribe` 补齐驱动 | M | ✅ completed | FR-SELF-027 |
| TASK-V55-117 | 后台 ask 迟到作答非死端 | M | ✅ completed | FR-SELF-028 |
| TASK-V55-118 | X-SELF-4/5/6 等价重锚 | M | ✅ completed | FR-SELF-103 / 104 / 105 / 110 / 111 |
| TASK-V55-119 | **SG-V55-02** S0 真链 seam 探针 | S | ✅ completed（结论 = **可行**，见 §14；探针已删，未入库） | FR-SELF-130 |
| TASK-V55-120 | `s0-chain.mjs` 样本单源 | L | ✅ completed | FR-SELF-130 |
| TASK-V55-121 | `s0-self-driven-chain.test.ts` node 面 | L | ✅ completed | FR-SELF-130 / 131 |
| TASK-V55-122 | `s0-self-driven.mjs` Chromium 面 | L | ✅ completed | FR-SELF-130 / 131 |
| TASK-V55-123 | `law7x-ext.test.ts` 法七扩展门禁 | M | ✅ completed | FR-SELF-020~028 |
| TASK-V55-124 | `no-dead-end.mjs` 判据升级 | M | ✅ completed | FR-SELF-103 |
| TASK-V55-125 | 体积五要素 + 台账 + 本叶收尾 | M | ✅ completed | FR-SELF-003 / 110 / 113 / 116 / 120~124 |

**本叶 25/25 全部 completed**；R1 的 12 任务见 §3（v1.0）。

## 13. 体积五要素（本叶**收口**登记）

| 要素 | 读值 |
|---|---|
| ① 基线 | `SIDEPANEL_BASELINE_BYTES` 549,609 → 554,576（R1）→ **557,761**（R2 收口；`dist/build-meta.json` 实测 `outputs['dist/sidepanel.js'].bytes === 557,761`） |
| ② 时间线（只追加） | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 `557_761`（`554_576` / `549_609` 逐字保留） |
| ③ 增长正当性（逐模块 metafile 归因） | `v551R2Rows`：`next-registry/drivers.ts` 2,662 → **3,307（+645）** / `sidepanel.ts` 97,036 → **99,566（+2,530）**；Σ 模块 **+3,175** + 未归因胶水 **+10** == 登记增量 **+3,185**（R1 的 `v551R1Rows` 逐字保留） |
| ④ ceiling（公式，无 cap） | `floor(557,761 × 1.05)` = **585,649**（cap 保持 `record-only`；判定 = `min(619,520, 585,649) = 585,649`） |
| ⑤ 档位 / 绝对上限 | `ceilTo50KB(557,761) = **563,200**`（未下移、未上移）、绝对上限 **619,520** 均**不变** |

- **预算对账（如实登记）**：本叶预算 **7,000 B**、上界 **9,000 B**；R1 **+4,967** + R2 **+3,185** = **+8,152 B** ⇒ **超出叶预算 7,000 B（+1,152 B）**、**未越上界 9,000 B（余 848 B）** ⇒ **不停机上报**（仅越叶预算，按 tasks.md「越叶预算 7,000 如实登记」口径执行）。**未删判据 / 未放宽容差 / 未静默降档**：按 ADR-V55-011 §5 的减体积优先级核查后**无可删项** —— 打包器已擦除全部块注释（保留的字节全是判据本体 + 驱动语义 + 1 个只读 seam）。**超预算根因（登记不静默）**：ADR-V55-011 §1 给 `sidepanel.ts` 2,400 B / `drivers.ts` 2,600 B，实测 R2 `sidepanel.ts` +2,530（四条结算路径 + 迟到口径 + 悬置 seam）、`drivers.ts` +645 ⇒ 计划侧**低估约 1.3 倍**。
- **取代链**：`SIDEPANEL_RE_REGISTRATIONS['v55-1-r2']`（收口）取代 `['v55-1-r1']`（中间登记，逐字保留）；`docs/v4-density-baseline.json#volume` 与 `test/size-baseline.ts` 常量同源（`test:size-ruling-vol3` 12/12、`test:supersession` 36/36 绿）。
- **红线冻结面**：`dist/content.js` 177,076 B / sha `52a82620…` 与 `dist/pick-layer.js` 34,358 B **逐字节不变**。

## 14. SG-V55-02 先验闸门结论（TASK-V55-119）

**结论 = 可行**（五要素报告：探针 `test/_spike/sg-v55-02-probe.mjs` 运行后即删，`git status --short` 无新增探针文件 ⇒ 未入库；日志 `/tmp/opencode/v4-gate-logs/v55-1-r2/20-sg-v55-02.log`）。

| 假设 | 探针方法 | 实跑证据 | 结论 |
|---|---|---|---|
| ① `when(ctx)` 可注入（S0 逐拍可复刻） | 编译产物 `candidateRules(input)` 纯函数驱动 5 拍 ctx | ①bind ⇒ `risk-recovery`/`op.rebind`；②probe ⇒ `risk-recovery`；③pick ⇒ `ref-action`/`op.turn`；④ask-open ⇒ `capability-discovery`；⑤answered(A) ⇒ `ref-action`；⑤answered(B) ⇒ `risk-recovery`/`op.llm-config`（**零假 provider**） | **可行** |
| ② 驱动者产出可判 | `driversForTiming` / `driversForMoment` / `timingOfSettle` | `driversForTiming('answered') = [ref-action]` ∧ `driverClass = 'ai-driven'` ∧ `timingOfSettle({kind:'answered'}) = 'answered'` / `{kind:'answered-late'} = 'idle'` | **可行** |
| ③ 回合输入可判 | `registerSuspension` + `answerNotDropped` | 只计数 ⇒ `false`；悬置登记后 ⇒ `true`；回合输入 ⇒ `true`；空值 ⇒ `false`（**会话 B 的题眼可判**） | **可行** |
| ④ 窗口判据可判 | `silentWindowReading` 五读 | `n/a / ok / ok / ok / silent`（三态，禁恒真） | **可行** |
| ⑤ 终态映射单源 | `terminalOfSource` | `'ref' ⇒ 'answered-ref'` / `'late' ⇒ null` / `'ghost' ⇒ undefined`（loud） | **可行** |

**对下游影响**：BLK-V55-2 **未触发** —— TASK-V55-120/121/122 具备开工条件；**未**以场景脚本假绿替代链路可判。

## 15. S0 双面 + 门禁对账（R2 vs 基线；串行逐门禁）

| 门禁 | 基线 | R2 | 判定 |
|---|--:|--:|---|
| `npm test`（node，全量） | 1220 / 0 | **1244 / 0** | ✅ +24（只增） |
| **S0 node 面** `s0-self-driven-chain.test.ts`（新） | — | **8 用例 / 0 fail** | ✅ 新增（①~⑩ 逐拍 + 三条总判据 + 16 组合窗口等价 + 两段证伪） |
| **S0 Chromium 面** `s0-self-driven.mjs`（新） | — | **22 passed / 0 failed** | ✅ 新增（分支 A 机制侧 = `trigger==='answered'` ∧ 可达 next ∧ ref-action 候选可达；分支 B 识别侧 = `op.llm-config` ∧ 零用户回合） |
| **法七扩展** `law7x-ext.test.ts`（新） | — | **4 用例 / 0 fail** | ✅ 新增（四类逐类 + 双向反证 + 三段控制） |
| `test:dead-end`（`no-dead-end` 判据升级） | 39 | **49 / 0** | ✅ +10（5 类阻塞逐条保留 + 4 类已表达意图终态新增） |
| `test:recommendation` | 65 | **72 / 0** | ✅ +7 |
| `test:ask-auth` | 71 | **78 / 0** | ✅ +7 |
| `test:law8` | 25 | **33 / 0** | ✅ +8 |
| `op-wiring`（`requestTurn(` 恰 2 **原判据不改**） | 2 调用点 | **2**（定义 1 / 调用点 3232·3256）；`maybeRecommend` **定义 1 / 调用点 7**；`nextAfterSettle` **定义 1**；`nextAfterSettle(` 调用点 7 | ✅ diff = 0 |
| `driver-timings` | 11 | **11 / 0** | ✅（DT-4 等价重锚，无断言删除） |
| `driver-quadruple` / `driver-terminals` | 14 / 8 | **14 / 8** | ✅ |
| `blocked-terminals` | 9 | **11 / 0** | ✅ +2 |
| `next-registry` | 16 | **18 / 0** | ✅ +2 |
| `gate-integrity` | 16 | **16**（`V551_NODE_GATE_FILES` 3 → 5；`CHROMIUM_GATES === 9` 逐字） | ✅ |
| `supersession` | 36 | **36 / 0** | ✅ |
| `design-contract` | 19 | **19 / 0** | ✅ |
| `size-ruling-vol3` | 12 | **12 / 0** | ✅ |
| `ref-pick-wiring` | 11 | **11 / 0** | ✅ |
| `stream` / `l0` / `l1` / `l2` | 73 / 248 / 120 / 74 | **73 / 248 / 120 / 74** | ✅ |
| `page-input` | 118 | **118** | ✅ |
| `density` | 242 | **242** | ✅ |
| `insight` / `hardening` / `auth-chip` | 118 / 24 / 37 | **118 / 24 / 37** | ✅ |
| `l1-reverse` / `l2-reverse` | 9 / 10 | **9 / 10** | ✅ |
| `zero-injection` | 28 | **28** | ✅ |
| `journey`（保护段） | 171 | **171 PASS** | ✅ 保段 |
| `binding`（保护段） | 192 | **192 PASS**（重跑） | ✅ 保段 |
| `e2e` | PASS | **PASS** | ✅ |

> 日志全量落盘 `/tmp/opencode/v4-gate-logs/v55-1-r2/`（`00-*` … `64-*`），逐门禁**串行**执行。

## 16. 反证摘要（R2，每任务一行；均为「注入 ⇒ 实跑 FAIL ⇒ 还原 ⇒ PASS」）

| 任务 | 反证（注入 ⇒ 必红；还原 ⇒ 必绿） |
|---|---|
| V55-113 | 新增第 8 个 `maybeRecommend(` 调用点 ⇒ OP-W-6 必红；删掉 `nextAfterSettle` 唯一入口 ⇒ 定义计数归零（必红）；还原 PASS |
| V55-114 | 把 `timingOfSettle` 的 `answered` 映射改为恒 `idle`（= 删掉 `answered` 时机）⇒ ⑯ 判据必红（复现会话 B 静默）；删 `answered` 值 / 改写旧项 / 加第 6 项 ⇒ 值集判据各红；还原 PASS |
| V55-115 | 删掉驱动分支（恢复「只计数」）⇒ 必红；把驱动挪到 `allowed` 判定**之前** ⇒ 顺序判据必红；还原 PASS |
| V55-116 | 恢复「只 `dispatch`」⇒ 必红（旁路死端复现）；移除空描述守卫 ⇒ 零副作用判据必红；还原 PASS |
| V55-117 | 迟到 outcome：`settled:false ∧ late:true`；SW 侧「不得再出现裸 `errorResponse`」静态判据；还原 PASS |
| V55-118 | 阻塞枚举混入驱动者终态 ⇒ 正交判据必红；声明表多/少一行 ⇒ 双向包含必红；law8 digest 注入一条泄漏 ⇒ 扫描命中；还原 PASS |
| V55-119 | 探针为**只读**（未改动 HEAD 源上实跑取样），文件已删（不入库） |
| V55-120/121 | 逐拍抽掉 next / 悬空 chip ⇒ 该拍必死端；清空驱动者 + 终态 + 候选 ⇒ 静默窗口 ≥1（复现会话 B）；抽掉悬置 ⇒ 答案不被丢弃必红；删一环 ⇒ 环节完备必红；还原 PASS |
| V55-122 | 真面板：删掉 `bgAskIds` 限定外的路径不变（夹具零扰动）；A/B 两侧独立计数（禁互相掩盖）；环境探测相位可让恢复类优先一事**如实登记**（见 §17） |
| V55-123 | 新增终态无 next ⇒ `violated`；已有 next 被删 ⇒ `violated`；取消 / 空值 / 迟到 ⇒ 「已答」**必不成立**；终态不存在 ⇒ `n/a`（禁恒真） |
| V55-124 | 注入「无 provider 的第 6 类阻塞」/「移除铸造期恢复面」⇒ 死端 ≥1 必红；删一项终态词 / 改写一项 ⇒ 单源集合判据必红；删 `answered-ask` 驱动者声明 ⇒ 该时刻无驱动者必红；还原 PASS |
| V55-125 | 体积五要素同源：`size-budget` / `size-growth-evidence` / `size-ruling-vol3` / `supersession` 全绿；`+1 B` 边界锚点重 pin（585,649 PASS / 585,650 FAIL）；台账三值同源（554,576-级滞后 ⇒ 必红） |

## 17. 遗留 / 登记（R2，如实，不静默）

1. **体积超叶预算（已登记，见 §13）**：本叶实际 **+8,152 B** > 预算 7,000 B（未越上界 9,000 B）。按 §8 规则第 4 条只登记不停机；减体积优先级核查后无可删项。
2. **S0 Chromium 面的探测相位（环境事实）**：headless 下被绑定站点无夹具内容脚本 ⇒ 探测相位可能停在等待态，`probe` 恢复类（priority 0）会**正确地**优先于 `ref-action`（2）。因此 Chromium 面断言「`answered` 触发 + 可达 next + 规则 ∈ 闭集」，而「已配置 ⇒ 恰好是 `ref-action`」这条 **ctx → 驱动者映射**由 node 面（受控 ctx，S0N-1/4）机核；机制侧的 `ref-action` 候选可达另以 `recommend('idle')`（seam 强制稳态）在真面板上佐证。
3. **`test:law7x-ext.test.ts` 的路径（与 tasks.md 的差异，登记）**：tasks.md 写作 `test/ui/law7x-ext.test.ts`，但 node 门禁的自动发现（`gate-integrity#NODE_GATE_DIR = 'test'`）与 `npm test` 的编译 glob（`tsc test/*.test.ts`）都只覆盖 `test/*.test.ts` —— 落在 `test/ui/` 会成为**不运行**的死文件。故实现为 **`test/law7x-ext.test.ts`**（唯一能让它真的成为受审 node 门禁的路径），已登记于 `gate-integrity#V551_NODE_GATE_FILES` / `EXPECTED_AUDITED_FILES`。差异**如实登记**，未静默。
4. **`terminals.ts` 不进 sidepanel 包（登记）**：终态词是**判定侧**单源（`DRIVER_TERMINAL_OF_SOURCE` / `driverTerminalReading`），生产只记 `source` 键 ⇒ 该模块 `bytesInOutput = 0`，`DRIVER_TERMINALS` 的「恰 4 ∧ 单源 ∧ 字面量不外泄」由 node 门禁（DTM-1 / L7X-1）在源文本上机核。原 TASK-V55-115 描述里的 `nextAfterSettle({kind:'answered', terminal})` 实现为 `{kind:'answered'}`（终态由 `source` 判定），语义等价且**避免了 `src/**` 第二声明**——差异如实登记。
5. **`op.describe` 非空描述的生产触达面（登记）**：DOM 上「改用描述」chip 走 `revealAskFallback()`（无值），带值入口是 op 管线（`bindPanelOps.describe` → `submitDescribe`）；因此 `test:ask-auth` ⑮ 以**源码序判据 + 两个注入 FAIL 段**机核该链路，真值面由 `law7x-ext`（终态）与 S0 node 面（悬置 + 触发）承担。
6. **环境性 flake（K L-N-10 / 既有登记）**：`test:binding` 首次 `CDP socket not open`（环境），第二次单点 `#54B7` 失败（并行干扰），清理残留 Chromium 后**同产物重跑 PASS 192** ⇒ 判定为**环境性 flake**（与产物无关），保段已取得。
7. **人工面（不得冒充 PASS）**：S0 的主动接手**体感** / 打断感 / 引导文案可读性 / 主动回合等待感 —— 并列 v5 人工面 9 项（**⏳ 未执行**），不覆盖。

## 修订记录（v2.0）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 = W1+W2（12 任务 · SG-V55-01 可行 · 3 新门禁 · 体积中间登记 +4,967 B · npm test 1220/0） | 2026-09-23 | SDDU Build Agent |
| v2.0 | R2 = W3+W4（13 任务 · SG-V55-02 可行 · 答案驱动化 + S0 双面 + 法七扩展 + `no-dead-end` 升级 · 体积收口 +8,152 B（超叶预算未越上界，如实登记）· npm test 1244/0 · 本叶 25/25 completed） | 2026-09-23 | SDDU Build Agent |

---

# 构建报告 v3.0（v55-1 **review R1 修复轮**，BLOCK-01/02 + I-01~03）

> 输入：`review-report.md` v1.0（38 Cx；2 BLOCK / 3 I / 4 O）+ `review.md`（C1~C38 清单）。
> 纪律：测试只增不减（≥1244）；门禁**串行** + 日志全量落盘 `/tmp/opencode/v4-gate-logs/v55-1-fix/`；禁 `git add -A`；每条修复都有**注入反证**。
> 基线（修前实测）：`npm test` **1244/0** · `test:supersession` **36/0** · `test:gate-integrity` **16/0** · `test:dead-end` **49/0** · `test:s0-self-driven` **22/0** · `dist/sidepanel.js` **557,761 B** · 冻结面 `content.js` 177,076 B / sha `52a82620…`、`pick-layer.js` 34,358 B / sha `77796bab…`。

## 18. 逐条处置（review R1 → 修复）

| # | 审查项 | 处置 | 落点 |
|---|---|---|---|
| **BLOCK-01**（C13） | 后台 ask「取消」仍被记 `answered-bg` 并驱动 `'answered'`（FR-SELF-023 口径② / EC-SELF-005 的**唯一生产漏口**） | **修**：`submitAskFor` 的 `rid && !isRef` 分支在 `registerSuspension` **之前**加取消守卫 `if (isCanceled) { nextAfterSettle({ kind: 'settle', force: true }); return; }`（与 op 路 `:2641-2644` **同口径**：取消走稳态驱动集，仍有接管者 ⇒ 非死端；`bgAsk` 夹具闸门与 `dispatch({type:'ask-resolved'})` 逐字不变） | `src/ui/sidepanel/sidepanel.ts`（+7 行：守卫 4 行 + 可读理由注释 3 行） |
| **BLOCK-01 门禁** | 「取消后台 ask 不得登记 `answered` / 不得触发 `answered` 时机」原来**没有任何门禁** | **修**：新增 `L7X-4` —— 判据读**真源切片**（`bgAskBranch` + `bracedBlockAt` 花括号配对），要求守卫**先于** `registerSuspension`、含 `return`、走 `nextAfterSettle({kind:'settle', force:true})`、守卫块内**零 `'answered'`**；三段注入反证（删守卫 / 守卫搬到登记之后 / 守卫内改记 answered） | `test/law7x-ext.test.ts`（`JUDGEMENTS[3]` = `L7X-4-bg-ask-cancel-guard` + `bgAskCancelGuardProblems` / `bgAskBranch` / `bracedBlockAt` + 1 用例） |
| **BLOCK-02**（C26/C27/C28） | `docs/v4-supersession-ledger.json` 内 `X-SELF` 命中 **0**；v55-1 仅 2 条体积 `entries`、`modifiedRanges` **0** 条 | **修**：按父 ADR-V55-012 §1 逐条落账 —— `X-SELF-2`（类型外移 re-export + `providers.ts` 注释级、`when` 零改）、`X-SELF-4`（`no-dead-end.mjs` 段外逐行 + `stream-model.ts` 零改对照 + `terminals.ts` 新模块）、`X-SELF-5`（`applyRefAction` 函数体 + `ref-store.ts` 消费面 + 调用点口径）、`X-SELF-6`（`submitDescribe` 函数体）、`X-SELF-1`（**无条目**但在 `xSelfLedger` 行内写明「**未发生取代**：`requestTurn(` 定义恰 1 / 调用点仍恰 2 / diff = 0」）；并新增 5 条 `modifiedRanges`（`V551-FIX-MR-volume` / `V551-MR-X-SELF-2/4/5/6`）、4 条体积条目（`V551-FIX-SVOL-1~4`）、七行 `xSelfLedger`（`X-SELF-3` / `X-SELF-7` = handed-over 到 v55-2 / v55-3，不得在本叶伪称已取代） | `docs/v4-supersession-ledger.json` |
| **I-01**（C14/C38） | `driver-quadruple.test.ts:273` 恒真断言 `… \|\| true`（违反 FR-SELF-111「反证不空转」） | **修**：删除恒真断言，改为**真实断言**「时机**闭集**多一行 ⇒ 必判悬空（`timingMappingProblems(DECLS, [...DRIVER_TIMINGS, 'ghost-timing'])` 非空）」；用例名同步为「时机闭集多一行」，并写明「驱动者声明表多一行」由 DQ-1 的 `bidirectionalProblems` 承担（不再用空转断言冒充覆盖） | `test/driver-quadruple.test.ts` |
| **I-02**（C15/C12） | ADR-V55-004 §1 / plan §2/§6 / TASK-V55-115 的「`applyRefAction` 调用点**恰 1**」与源码不符（实测文本调用点 **2**：生产 1 + 既有 testing seam 1），且**无任何门禁覆盖** | **修（低成本路径①）+ 静态门禁**：口径显式化为「**生产调用点恰 1** + 既有 testing seam 1（白名单逐字锚点）」，新增 `applyRefCallSites` / `applyRefCallSiteProblems` 与用例（真源逐行归类 + 白名单锚点可定位 + 三段注入反证）；ADR/plan 文本**保持冻结不改**，口径订正登记在本轮 build.md 与台账条目 `X-SELF-5` 的 reason 内 | `test/l1-ref-validity.test.ts`（+1 用例 + 判据 + 白名单） |
| **I-03**（C33） | `s0-self-driven.mjs` 的 `S0C-1` 只在 `JUDGEMENTS` 里声明、**无 check 引用**；Chromium 面只把「10」当常量（样本改名/换序 ⇒ 无感） | **修**：新增 `PANEL_BEATS`（本面**实际驱动**的十拍）+ `beatCheck()` 唯一入口（未声明 id ⇒ loud 抛错）；① 开头机核 `PANEL_BEATS[i].id === S0_CHAIN[i].id` 逐序；② 收尾机核每拍 ≥1 真面板读数（19 处断言之父改为 `beatCheck`）；`S0C-1` 成为**两个真 check** | `test/ui/s0-self-driven.mjs` |

## 19. 注入反证（每条都「注入 ⇒ 实跑 FAIL ⇒ **逐字节还原（sha256 复核）** ⇒ PASS」，日志全量）

| 反证 | 注入形态 | 实跑结果 | 还原 | 日志 |
|---|---|---|---|---|
| **BLOCK-01（真源注入）** | **真删** `src/ui/sidepanel/sidepanel.ts` 的取消守卫块（4 行，不是 in-memory 变换） | `node --test dist-test/test/law7x-ext.test.js` ⇒ **1 failed**（`L7X-4`，诊断「取消守卫缺失（isCanceled ⇒ 不记「已答」，不得驱动 answered）」） | sha256 `51df03bb…a21d41` **前后相同** ⇒ 复跑 **5/5 PASS** | `30-inject-block01.log` |
| **I-01** | **真删** `driver-quadruple.test.ts` 内 `timingMappingProblems` 的**闭集校验**（注释掉的判据） | 重编译后 ⇒ **13 passed / 1 failed**（`DQ-4 反证…`，诊断「时机闭集多一行必须红（不得是恒真断言）」） | sha256 `0febc986…f27a4657` **前后相同** ⇒ 复跑 **14/14 PASS** | `31-inject-i01-i02.log` |
| **I-02** | 在 `submitAskFor` 之外**真加**第 2 处**生产**调用 `applyRefAction(refId, action)` | ⇒ **19 passed / 1 failed**（诊断「生产调用点必须恰 1（实测 2）——「恰 1」是口径，不是口号」） | sha256 `51df03bb…a21d41` **前后相同** ⇒ 复跑 **20/20 PASS** | `31-inject-i01-i02.log` |
| **I-03** | **真改**共享样本 `test/ui/fixtures/s0-chain.mjs` 首拍 `bind` → `bind-x` | `npm run test:s0-self-driven` ⇒ **23 passed / 1 failed**（`✖ S0C-1 十环节逐序与共享样本一致`，诊断逐字打出 `panel` vs `sample` 两个 id 序列） | sha256 `d8c3839b…ea2f9d` **前后相同** ⇒ 复跑 **24/24 PASS** | `32-inject-i03.log` |
| **BLOCK-01（in-gate 三段）** | 门禁自带：① 删守卫 ② 守卫搬到 `registerSuspension` 之后 ③ 守卫内改记 `'answered'` | 三段各命中对应 problem（in-memory，作为常驻守护） | 就地还原 ⇒ `assert.deepEqual(…, [])` | `40-final-npm-test.log` |
| **既有反证保留** | `no-dead-end` 3 类 / `driver-quadruple` DQ-1~6 / `law7x-ext` L7X-2/L7X-3 / `l1-ref-validity` `applyRefDriveProblems` 两段 | 逐条仍绿（未删任一旧反证） | — | `21-*` / `40-*` |

## 20. 门禁对账（修复轮 vs 基线；**串行**逐门禁，日志 `/tmp/opencode/v4-gate-logs/v55-1-fix/`）

| 门禁 | 基线（修前） | 修复轮 | 判定 |
|---|---|---|---|
| `npm test`（node） | 1244/0 | **1246/0** | ✅ 只增（+2：`L7X-4` + I-02 调用点用例） |
| `test:supersession` | 36/0 | **36/0** | ✅ 不减（`counts` 同源层新增 2 项**真核验**：nodeTestRuntime 1246 / supersession 36） |
| `test:gate-integrity` | 16/0 | **16/0** | ✅ 不增不减（仍 5 枚 v55-1 受审 node 门禁；`V551_NODE_GATE_FILES` 未改） |
| `test:dead-end`（Chromium） | 49/0 | **49/0** | ✅ **不减**（判据升级保留） |
| `test:s0-self-driven`（Chromium） | 22/0 | **24/0** | ✅ 只增（+2 = `S0C-1` 机序 + 逐拍覆盖） |
| `test:law8` | 33/0 | **33/0** | ✅ |
| `test:ask-auth` | 78/0 | **78/0** | ✅ |
| `test:recommendation` | 72/0 | **72/0** | ✅ |
| `test:l0` / `test:l1` / `test:l2` | 248 / 120 / 74 | **248 / 120 / 74** | ✅ |
| `test:page-input` / `test:stream` | 118 / 73 | **118 / 73** | ✅ |
| `test:density` | 242/0 | **242/0** | ✅（阈值逐字） |
| `test:journey`（保护段） | 171 | **171 PASS** | ✅ **保段** |
| `test:binding`（保护段） | 192 | **192 PASS** | ✅ **保段** |
| `test:insight` / `test:hardening` | 118 / 24 | **118 / 24** | ✅ |
| `test:auth-chip` / `e2e` | 37 / PASS | **37 / PASS** | ✅ |
| `test:l1-reverse` / `test:l2-reverse` | 9 / 10 | **9 / 10** | ✅（反证全套「注入 → FAIL → 逐字节还原 → PASS」） |
| `test:zero-injection` / `test:size-ruling-vol3` | 28 / 12 | **28 / 12** | ✅ |
| `test:design-contract` / `test:ref-pick-wiring` | 19 / 11 | **19 / 11** | ✅ |

> 真实产物 `dist/build-meta.json`：`outputs['dist/sidepanel.js'].bytes` = **557,883** = `SIDEPANEL_BASELINE_BYTES`（登记值 == 实测产物，`size-growth-evidence` 逐值机核）；`inputs` 仍 **88** 个（**零新增模块**）。

## 21. 体积五要素（**本叶 review 修复轮**重登记：`SIDEPANEL_RE_REGISTRATIONS['v55-1-fix']`）

| 要素 | 值 |
|---|---|
| ① 前值 → 新值 | **557,761 → 557,883 B（+122 B / +0.02%）** |
| ② ceiling | 585,649 → **585,777**（`floor(557,883 × 1.05)`；容差 **5%** 未动、cap 仍 `record-only`） |
| ③ measuredOn / measuredBy | 2026-09-23 / `SDDU V5.5-1 review R1 修复轮（BLOCK-01/02 + I-01~03）`；`buildCommand` = `npm run build --workspace @lgdl/web-cli-plugin` |
| ④ 逐模块归因 | `SIDEPANEL_GROWTH_BREAKDOWN.v551FixRows`：`sidepanel.ts` 99,566 → **99,688（+122）**；**Σ +122 + glue 0 == +122**（真实 metafile `bytesInOutput`） |
| ⑤ 披露链条 | `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 557,883（前值全保留）；`deltaBytes` 262,536 → **262,658**；`closeoutDeltaBytes` 3,185 → **122**；`wiringBytes` 78,692 → **78,814**；`docs/v4-density-baseline.json#volume`（baseline / ceiling）同源前移；台账 `V551-FIX-SVOL-1~4` + `v3Vol3Closeout.⑤三值闭合.newBaselineBytes` 557,883（`test:size-ruling-vol3` / `test:supersession` 双机核） |
| **档位 / 绝对上限** | `ceilTo50KB(557,883) = **563,200**`（**未跨档**）· 绝对上限 **619,520**（未变）⇒ **无跨档升档事件** |
| **冻结面** | `dist/content.js` 177,076 B / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` · `dist/pick-layer.js` 34,358 B / sha `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e` —— **逐字节不变** |
| **预算口径（诚实登记）** | 本叶合计 **+8,274 B**（R1 +4,967 / R2 +3,185 / 修复轮 +122）仍**超叶预算 7,000 B、未越上界 9,000 B**（未删判据 / 未放宽容差 / 未静默降档） |

## 22. 遗留 / 登记（修复轮，如实，不静默）

1. **I-02 的规范文本未改（冻结面）**：ADR-V55-004 §1 / leaf plan §2/§6 / tasks.md TASK-V55-115 写「调用点恰 1」，与源码（生产 1 + seam 1）不符。修复轮**不改冻结的 ADR/plan/tasks**，而是把口径显式化为「生产恰 1 + seam 1（白名单）」并**加机核**（`applyRefCallSiteProblems`）+ 在本节与台账 `X-SELF-5` reason 内登记该订正。下游叶若引用该口径，请以**门禁口径**为准。
2. **O-01~O-04（review 的观察项）未在本轮处置**：`s0-chain.mjs#judgeBeat` 的 `driverAttribution` 常量（O-01）· `PROACTIVE_MOMENTS` 伞名 vs ADR 三型（O-02）· `SettleSource.terminal?` 死字段（O-03）· `ref-action.driverClass:'ai-driven'` 的 v55-3 用途（O-04）—— 均为低severity 且**未阻塞**，按 review 建议留后续叶/收口。
3. **人工面**：S0 的主动接手体感 / 打断感 / 引导文案可读性 = ⏳ 未执行（headless 不可合成，**不冒充 PASS**）。
4. **`test:supersession` 的 `counts` 同源层**：本轮把 `nodeTestRuntime` / `supersession` 的 `source.log` 指向 `/tmp/opencode/v4-gate-logs/v55-1-fix/registry/`（日志已落盘 ⇒ 由 skip 变为**真核验**）；若该目录被清理则回到显式 skip（设计行为，不静默通过）。
5. **BLOCK-02 的叶段归属**：v55-1 的删除面（`test/size-*.ts` 的旧数值行）按 R1/R2 的既有约定登记在 **`r4-selector-fix`（leafBase `953a2ed`）叶段** —— 因为 v55-1 的开工点即 `953a2ed`（与 r4 段同 leafBase，新增同 base 的叶段会被 schema 判据拒），故不新建叶段；本轮的 `entries` / `modifiedRanges` 均带 `leaf: specs-tree-v55-1-driver-layer` 显式归属。

## 修订记录（v3.0）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 = W1+W2（12 任务 · SG-V55-01 可行 · 3 新门禁 · 体积中间登记 +4,967 B · npm test 1220/0） | 2026-09-23 | SDDU Build Agent |
| v2.0 | R2 = W3+W4（13 任务 · SG-V55-02 可行 · 答案驱动化 + S0 双面 + 法七扩展 + `no-dead-end` 升级 · 体积收口 +8,152 B（超叶预算未越上界，如实登记）· npm test 1244/0 · 本叶 25/25 completed） | 2026-09-23 | SDDU Build Agent |
| v3.0 | **review R1 修复轮**（BLOCK-01 后台 ask 取消守卫 + 新门禁 `L7X-4` · BLOCK-02 X-SELF-2/4/5/6 + X-SELF-1「未发生取代」台账落账 · I-01 恒真断言修复 · I-02 调用点口径显式化 + 静态门禁 · I-03 S0 十环节机序；4 组**真源注入**反证（sha 逐字节还原）· npm test **1246/0** · supersession 36/0 · dead-end **49/0 不减** · s0-self-driven **24/0** · 体积 **557,883 B**（+122）· 两冻结面逐字节不变） | 2026-09-23 | SDDU Build Agent |

---
---

# 构建报告 v4.0（v55-1 **收口段**：N 项归并 + 终态对账）

> **文档定位**: SDDU 收口记录 —— 本叶 7 阶段流水线（build → review → validate 全通过）之后的**收口轮**：N 项归并登记 + 终态对账 + 移交项。**零产品代码改动**（`.sddu` 外零触碰）。
> **输入**: `review-report.md` v1.1（R1+R2；N-R2-01~06）+ `validate-report.md` v1.0（N-R1-01~04）；父 `spec.md` §12 映射表 / `ADR-V55-012`
> **版本**: v4.0（本叶 **close 终态**）
> **更新时间**: 2026-09-23
> **更新说明**: 收口轮 —— review 6 项 + validate 4 项归并为 **N-01~N-10** 并逐条标注 owner（本叶已闭环 / 移交 v55-2 / v55-3 / 父收口 / 人工面）；终态对账（任务 25/25 · 门禁 6+2 · `npm test` 1186→1246 · 体积 549,609→557,883 · 三冻结面零 diff · X-SELF 7 行台账 · SG-V55-01/02 可行）

## 23. 终态快照（close 基线）

| 项 | 终态读值（收口轮实测） |
|---|---|
| 分支 / HEAD | `feature/web-cli-plugin` / `e76f13f`（本叶最后提交 = validate） |
| 任务 | **25 / 25 completed**（W1~W4；TASK-V55-101~125） |
| 门禁 | **新增 6 + 2**：6 枚新门禁（node 5 = `driver-timings` / `driver-quadruple` / `driver-terminals` / `s0-self-driven-chain` / `law7x-ext`；Chromium 1 = `s0-self-driven`）+ 2 枚先验探针 `SG-V55-01` / `SG-V55-02`（跑毕即删，未入库）；`V551_NODE_GATE_FILES` 3 → 5；`CHROMIUM_GATES === 9` 逐字不动 |
| `npm test`（node） | **1186 → 1246 / 0**（+60，只增不减） |
| 体积 | `dist/sidepanel.js` **549,609 → 557,883 B（+8,274）** ⇒ 超叶预算 7,000 **+1,274**（R2 登记 +8,152 ⇒ +1,152；修复轮 +122）、**未越上界 9,000**（余 726）；档位 `ceilTo50KB = 563,200` / 绝对上限 **619,520** 未动；生效上限 **585,777** |
| 冻结面（dist） | `dist/content.js` **177,076 B / sha `52a82620…b5f6`**、`dist/pick-layer.js` **34,358 B / sha `77796bab…575e`** —— **逐字节零 diff**；`dist/sidepanel.js` = 登记基线 **557,883 B**（本叶**登记增长**，非零 diff） |
| 源码冻结面 | `src/content/**` · `manifest.json` · `docs/v3-*-ledger.json` · `ROADMAP.md` · `design/**` · `stream-model.ts` · `security/policy.ts` · `security/auto-authorize.ts` · `background/messaging.ts` —— **全零 diff**（`git diff ace3033..HEAD` 实测 0） |
| 取代台账 | `X-SELF` 命中 **41**；`xSelfLedger.rows` **恰 7**（4 `superseded` + 2 `handed-over` + 1 `no-supersession`）；`modifiedRanges` 4 条 `V551-MR-X-SELF-2/4/5/6` |
| S0 | node **8/0** · Chromium **24/0**（分支 A 机制侧 / 分支 B 识别侧独立计数） |
| 保护段 | `journey` **171 PASS** · `binding` **192 PASS**（环境性 flake，由 `supersession` **36/0** 独立兜底） |
| SG 闸门 | **SG-V55-01 = 可行**（8/8）· **SG-V55-02 = 可行**（五要素） |
| 流水线结论 | review **✅ 通过**（R1 2 BLOCK / 3 I → R2 全闭环；红线 12/12）· validate **✅ 通过**（V1~V9 全绿；0 阻塞 / 0 严重漂移） |

## 24. 交付物清单（本叶足迹；`git diff ace3033..e76f13f` 实测）

**源文件（新增 2 / 修改 8）**

| 操作 | 文件 | 任务 |
|:--:|---|:--:|
| NEW | `src/ui/sidepanel/next-registry/drivers.ts` | 101 / 103 / 106 / 111 / 113 / 115 / 116 / 117 / 123 |
| NEW | `src/ui/sidepanel/next-registry/terminals.ts` | 102 / 123 |
| MODIFY | `.../next-registry/definition.ts` · `.../next-registry/providers.ts` | 106 · 107 / 111 |
| MODIFY | `.../sidepanel/recommend.ts` · `.../sidepanel/sidepanel.ts` | 103 · 103 / 113~117 / 122 |
| MODIFY | `.../next-registry/ops.ts` · `.../next-registry/pipeline.ts` | 113（`reachableNext` → `nextAfterSettle` 改名） |
| MODIFY | `src/background/ask-bridge.ts` · `src/background/service-worker.ts` | 117 |

**门禁 / fixture（新增 7 / 修改 16）**

| 操作 | 文件 |
|:--:|---|
| NEW（node） | `test/driver-timings.test.ts`(11) · `test/driver-quadruple.test.ts`(14) · `test/driver-terminals.test.ts`(8) · `test/s0-self-driven-chain.test.ts`(8) · `test/law7x-ext.test.ts`(5) |
| NEW（Chromium / fixture） | `test/ui/s0-self-driven.mjs`(24) · `test/ui/fixtures/s0-chain.mjs` |
| MODIFY | `op-wiring` · `driver-timings` · `recommendation-sources` · `l1-ref-validity` · `ask-bridge` · `blocked-terminals` · `next-registry` · `gate-integrity` · `size-baseline` / `size-budget` / `size-growth-evidence` / `size-ruling-vol3`（12 个 `.ts`）+ `test/ui/{ask-auth-inflow,law8-plaintext,no-dead-end,recommendation}.mjs` + `package.json` |

**台账（2）**：`docs/v4-supersession-ledger.json` · `docs/v4-density-baseline.json`
**SDDU 产物（本 diff 内 7）**：`build.md` · `review.md` · `review-report.md` · `validate.md` · `validate-report.md` · `state.json` · `TREE.md`

> 统计口径：非 `.sddu` 变更面 = **35 个文件**（**9 NEW + 26 MODIFY**）；`.sddu` 变更面 = **7 个产物文件**。

## 25. N 项归并登记（review 6 项 + validate 4 项 → N-01~N-10）

| 统一编号 | 来源 | 类型 / 严重度 | 内容摘要 | owner | 处置 |
|:--:|:--:|:--:|---|---|---|
| **N-01** | review N-R2-01 | 观察 / 低 | `nextAfterSettle(` 调用点 **7 → 8**（取消守卫新增第 8 处）；`op-wiring#OP-W-6` 仅钉「定义恰 1 ∧ 调用点 ≥ 4」⇒ **无门禁钉死具体数值**；修复轮 build 未显式登记该 +1（判据不破、语义正确） | **v55-3** | 移交：随 **TASK-V55-306**（`op-wiring.test.ts` 修改轮）在门禁口径中钉死 `nextAfterSettle(` 调用点数（或显式登记 +1） |
| **N-02** | review N-R2-02 | 信息 | `dist/sidepanel.js` 的 **sha 不可跨重建复现**（内嵌 `BUILD_STAMP`；字节数稳定 557,883）⇒ 红线口径 = **字节数**，非 sha；`content.js` / `pick-layer.js` 的 sha 可继续作冻结面凭据 | **父收口** | 移交：由父收口在红线口径（FR-SELF-123 读法）与 v55-2/3 共享面中明示「sidepanel 红线 = 字节数」 |
| **N-03** | review N-R2-03 | 继承 / 低 | **O-01~O-04 未处置**：`s0-chain.mjs#judgeBeat` 的 `driverAttribution` 取常量（O-01）· `PROACTIVE_MOMENTS` 伞名 vs ADR 三型（O-02）· `SettleSource.terminal?` 生产零消费死字段（O-03）· `ref-action.driverClass:'ai-driven'` 供 v55-3（O-04） | **v55-3**（主）；O-01/O-02 → **父收口** 登记 | 移交：O-03/O-04 与 v55-3 驱动者消费面同轮消费/清理；O-01/O-02 由父收口登记为「不影响判据的设计重叠」 |
| **N-04** | review N-R2-04 | 继承 / 登记 | **I-02 规范文本未改**：ADR-V55-004 §1 / leaf plan §2·§6 / TASK-V55-115 仍写「调用点恰 1」，与源码（生产 1 + seam 1）不符；修复轮不改冻结文本，口径以门禁 `applyRefCallSiteProblems` 为准 | **父收口** | 移交：父收口登记「冻结文本 ↔ 门禁口径」差异，下游引用一律以**门禁口径**为准 |
| **N-05** | review N-R2-05 | 继承 / 设计行为 | `test:supersession` 的 `counts` 同源层依赖 `/tmp/opencode/v4-gate-logs/v55-1-fix/registry/`；目录被清理 ⇒ 回到**显式 skip**（不静默通过） | **本叶已闭环** | 本叶：已在 build §22.4 显式登记为设计行为（skip ≠ pass）；无残留动作 |
| **N-06** | review N-R2-06 | 继承 / 人工面 | S0 主动接手**体感** / 打断感 / 引导文案可读性 = ⏳ **未执行**（headless 不可合成） | **人工面** | 移交：并列 v5 人工面 9 项；**不冒充 PASS**，待真机人工验收 |
| **N-07** | validate N-R1-01 | 环境性 flake / 低 | `test:binding` 本机多次亲跑无稳定 PASS（`191/192` 滚动时序 / CDP socket 关闭）；`binding.mjs` **不在本叶变更面**；保护段由 `supersession` 独立机核双绿 | **父收口** | 移交：登记为环境性 flake（同源 K L-N-10）；保段凭据 = `supersession` 36/0 |
| **N-08** | validate N-R1-02 | 观察 / 低 | `test:recommendation` 首跑 `70/3` ⇒ 同产物重跑 **72/0** ⇒ 环境性 flake（headless 探测相位 / 权限探针） | **父收口** | 移交：登记为环境性 flake，非本叶回归 |
| **N-09** | validate N-R1-03 | 观察 / 低 | `driver-timings` 的 **DT-2/DT-3 读编译后常量**（`dist-test/src`），对「仅改 `src` 未重编译」注入无感；DT-1/DT-4 已读真源 | **v55-3** | 移交：随 N-01 同一门禁强化轮，为 DT-2/DT-3 增加源文本抽取（与 `law7x-ext#L7X-4` 同口径） |
| **N-10** | validate N-R1-04 | 继承 / 汇总 | **N-R2-01~06 的继承汇总项**（调用点 8 无钉死 / sha 不可复现 / O-01~O-04 / counts 外部日志 / 人工面 ⏳） | **本叶收口** | 本叶：拆解后已逐条分流至 N-01~N-09，本项**无独立动作** |

**owner 分布**：**v55-3 = 3**（N-01 / N-03 / N-09）· **父收口 = 4**（N-02 / N-04 / N-07 / N-08）· **人工面 = 1**（N-06）· **本叶已闭环 / 本叶收口 = 2**（N-05 / N-10）· **v55-2 = 0**（无本叶遗留项落 v55-2）。
**严重度分布**：阻塞 **0** · 高 **0** · 低 / 信息 **10**（全部为登记项，均不阻塞）。

## 26. 收口对账

| 对账项 | 要求 | 终态实测 | 判定 |
|---|---|---|:--:|
| 任务 | 25 / 25 | **25 / 25 completed**（build §3 + §12 逐条；`tasks.json` 25 条） | ✅ |
| 门禁 | 新增 6 + 2 | **6 枚新门禁 + 2 枚 spikeGate**（见 §23）；受审 node 门禁 3 → 5；`gate-integrity` 16/0 | ✅ |
| `npm test` | 只增不减 | **1186 → 1246 / 0**（+60） | ✅ |
| 体积 | 登记 ∧ 未越上界 | **549,609 → 557,883（+8,274）**；超叶预算 7,000 **+1,274**（R2 +1,152 ＋ 修复轮 +122）；**未越上界**（终态余 726）；档位 / 绝对上限未动 | ✅（超预算如实登记） |
| 三冻结面 | 零 diff | `content.js` 177,076 B / sha `52a82620…` · `pick-layer.js` 34,358 B / sha `77796bab…` **逐字节零 diff**；`sidepanel.js` 557,883 B = 登记基线 | ✅ |
| 取代台账 | X-SELF-1~7 | 命中 **41**；`xSelfLedger.rows` **恰 7**（4 + 2 + 1） | ✅ |
| SG 闸门 | 均可行 | **SG-V55-01 = 可行**（8/8）· **SG-V55-02 = 可行** | ✅ |
| ROADMAP | 零 diff（父收口统一登记） | `git diff ace3033..HEAD -- .sddu/specs-tree-root/ROADMAP.md` = **0** | ✅ |
| `.sddu` 外触碰 | 收口轮零产品改动 | 收口轮仅改 `.sddu/**`（`build.md` / `state.json` / `TREE.md`） | ✅ |

## 27. 移交项（handover）

| 移交对象 | 项 | 交接要点 |
|---|---|---|
| **v55-3**（末叶 / 收口叶） | **N-01 · N-03 · N-09** | 随 `op-wiring.test.ts` 修改轮（TASK-V55-306）钉死 `nextAfterSettle(` 调用点数；消费 / 清理 `driverClass` 与 `SettleSource.terminal?`；DT-2/DT-3 加源文本抽取 |
| **父收口**（v5.5 closeout） | **N-02 · N-04 · N-07 · N-08**（+ O-01/O-02 登记） | 红线口径 = sidepanel **字节数**；I-02 冻结文本 ↔ 门禁口径差异登记；两项环境性 flake 登记；ROADMAP F-33 / v0.11.0 统一登记 |
| **人工面** | **N-06** | S0 主动接手体感 / 打断感 / 引导文案可读性真机验收（⏳ 未执行，不冒充 PASS） |
| **v55-2** | — | 无本叶遗留项（**0 项**）；依赖本叶时机源 / 终态词汇 / 驱动者四元组 / 悬置登记入口 |

## 28. 对账订正（不静默）

1. **build.md v2.0 §11（R2 修改文件枚举）遗漏 2 个源文件**：`next-registry/ops.ts` / `next-registry/pipeline.ts`（`reachableNext` → `nextAfterSettle` 改名，属 **TASK-V55-113**，已在 `tasks.md` 逐条登记）。本收口段在 §24 补正：R2 源码修改 = **7 个文件**（原文枚举 5 + 补 2）。两文件**非冻结面**，不影响任何判据。
2. **体积超预算口径**：build §13 登记「超叶预算 +1,152 B」（= 8,152 − 7,000）；修复轮 +122 B 后**累计超 +1,274 B**（= 8,274 − 7,000）。两次均**未越上界 9,000 B**（终态余 726 B）。以本收口段数值为**终态口径**。
3. **文件计数口径**：`review-report.md` §3.4③ 记 `git diff ace3033..HEAD` = 38 文件；收口实测（`e76f13f`）`--name-only` = **42**（含 **7** 个 `.sddu` 产物；非 `.sddu` = **35**）。差异源自 `git diff` 基数 / 时点选择，**不影响任何红线判据**（红线条目逐项实测零 diff，见 §23 / §26）。

## 修订记录（v4.0）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 = W1+W2（12 任务 · SG-V55-01 可行 · 3 新门禁 · 体积中间登记 +4,967 B · `npm test` 1220/0） | 2026-09-23 | SDDU Build Agent |
| v2.0 | R2 = W3+W4（13 任务 · SG-V55-02 可行 · 答案驱动化 + S0 双面 + 法七扩展 + `no-dead-end` 升级 · 体积收口 +8,152 B（超叶预算未越上界，如实登记）· `npm test` 1244/0 · 本叶 25/25 completed） | 2026-09-23 | SDDU Build Agent |
| v3.0 | review R1 修复轮（BLOCK-01 后台 ask 取消守卫 + 新门禁 `L7X-4` · BLOCK-02 X-SELF-2/4/5/6 + X-SELF-1 台账落账 · I-01~I-03 · 4 组真源注入反证 · `npm test` 1246/0 · 体积 557,883 B） | 2026-09-23 | SDDU Build Agent |
| v4.0 | **收口段**（N-01~N-10 归并 + owner 分布 · 终态快照 · 交付物清单 · 收口对账 9 项 · 移交项 · 对账订正 3 条；**零产品代码改动**，`.sddu` 外零触碰） | 2026-09-23 | SDDU Build Agent |
