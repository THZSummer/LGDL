# 任务分解（**总览与叶子映射，不承接执行**）：specs-tree-web-cli-plugin-v4-chat

> **文档定位**: SDDU 任务清单 — 父 Feature **总览**（四叶任务总账 / 跨叶波次总图 / 跨叶检查点 / 测试守恒总账）；**执行权威 = 各叶 `tasks.md` + `tasks.json`**
> **前置依赖**: 父 `plan.md` v1.0（ADR-V4-001~016）+ 父 `spec.md` v1.0 + 4 叶 `plan.md`/`spec.md` v1.0 + `discovery.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（50 任务 / 27 波 / 4 叶；**v4-1 第一任务 = S 级 spike 闸门**；子叶顺序 `v4-1 → v4-2 → {v4-3, v4-4}` 可并行分解、门禁串行；V3-VOL-3 收口锚在 v4-4 末任务）

## 0. 定位与偏差登记

### 0.1 父 Feature 定位（复核）

| 项 | 结论 |
|----|------|
| 父 spec §11 / v2·v3 先例 | 父 = **轻量规范容器 + 聚合报告承载者**（不承接 build / review / validate） |
| 本阶段偏差（承接父 ADR-V4-001） | 编排器指令要求「父 `tasks.md`/`tasks.json` + 四叶各一套」⇒ 父**产出**总览型 tasks（**不排可执行原子任务、不写代码**）；执行全部由 4 叶承载 |
| 是否违反「父不承接 tasks」 | **是字面、非实质**：父文档只有**索引与总账**（叶子映射 / 波次总图 / 检查点 / 守恒账），**无一条可执行任务**；偏差显式登记，供 `@sddu-review` / `@sddu-validate` 独立核验 |
| 可整篇作废性 | 4 叶 `tasks.md` 对父的引用均为「父 ADR 编号 + 契约名」，不依赖父文件物理存在 |

### 0.2 TASK 编号占用**实测**（本轮先测量后编排）

| 来源 | 实测占用 | 证据 |
|------|---------|------|
| 全仓 `TASK-0xx` | `TASK-001` ~ `TASK-040`（其他 Feature） | `grep -roh "TASK-[0-9]\{3\}" .sddu/` |
| v3-1 `tasks.json` | `TASK-101` ~ `TASK-115`（15） | `specs-tree-v3-1-l0-shell-density/tasks.json` |
| v3-2 `tasks.json` | `TASK-201` ~ `TASK-210`（10） | 同上 |
| v3-3 `tasks.json` | `TASK-301` ~ `TASK-309`（9） | 同上 |
| v3-4 `tasks.json` | `TASK-401` ~ `TASK-414`（14，JSON 为 v1.0 口径） | 同上 |
| **v3-4 `tasks.md`（v1.1 收口轮）** | **新增 `TASK-415`（JSON 未同步，属 v3 自身 stale）** | `specs-tree-v3-4-page-as-input/tasks.md:58/630` |
| **全局已分配最大编号** | **`TASK-415`** | 实测 |

**本轮编号方案（v4）**：
- **叶独立百位段**（沿用 v3 先例）：v4-1 = `TASK-501~515`、v4-2 = `TASK-601~612`、v4-3 = `TASK-701~711`、v4-4 = `TASK-801~812`；与已占用区间（`0xx` / `1xx~4xx` / `415`）**零冲突**。
- **叶内别名**：`V41-01~15` / `V42-01~12` / `V43-01~11` / `V44-01~12`（文档内可读标识）。
- **台账登记 id**：`V41-SPIKE-401`（spike 证据在 v4 台账 `entries[]` 的登记键，**非任务 id**）。
- **偏差如实登记**：编排器建议「全局 `TASK-4xx` 序列」——实测 `4xx` 已被 v3 用至 `415`，若续用会与 v3 收口产物撞号 ⇒ 改用 `5xx~8xx`（更保守，零冲突）；此偏离已在回报中说明。

## 1. 叶子映射（唯一权威 = 各叶 `tasks.md` / `tasks.json`）

| 顺序 | 叶子 | 任务区间 | 任务数 | 波次 | 复杂度（S/M/L） | 交付定位 |
|:--:|------|:--:|:--:|:--:|:--:|------|
| 1 | `specs-tree-v4-1-zone-shell-density` | `TASK-501~515` | 15 | 8 | 1 / 10 / 4 | 三区骨架 + 密度新口径 + **门禁重定标与共同基线** |
| 2 | `specs-tree-v4-2-chat-stream-model` | `TASK-601~612` | 12 | 7 | 0 / 7 / 5 | append-only 事件模型 + 卡渲染地基 |
| 3 | `specs-tree-v4-3-ask-auth-inflow` | `TASK-701~711` | 11 | 6 | 1 / 7 / 3 | ask/授权流内化 + **AC-CHAT-016 唯一验收叶** |
| 4 | `specs-tree-v4-4-ref-system-nextstep` | `TASK-801~812` | 12 | 6 | 0 / 5 / 7 | 引用/系统/推荐 + **V3-VOL-3 父级收口锚** |
| — | **合计** | `TASK-501~812` | **50** | **27** | **S 2 / M 29 / L 19** | — |

### 1.1 各叶主要产出（一句话）

| 叶子 | 一句话产出 |
|------|-----------|
| v4-1 | 三区骨架（工具栏 ≤5 / `ol#stream[role=log]` / 状态栏 + 风险 chips 永不折叠）+ 密度单源口径与 31 登记格 + l0/l1/l2/density/journey **五门禁同叶重定标**（含 journey 保护段新 pin） |
| v4-2 | `StreamEvent` 不可变 + `project()` 纯投影 + keyed 增量渲染（永不清空）+ 7 主类 + 过程卡族 + 摘要落库（零明文） |
| v4-3 | ask/授权卡完整业务态 + 全终态留痕（含超时/取消/取代）+ `MAX_OPEN_ASKS=2` + 回合语义解耦 + 零明文 |
| v4-4 | ref/system/nextstep 三卡 + `appendSystem` 单通道 + 推荐白名单生产者 + `requestPick()` 单一入口 + **V3-VOL-3 带值闭合** |

## 2. 跨叶执行序与串行门禁

### 2.1 叶间顺序（**不可颠倒**）

```
CP-0 [spike 闸门] TASK-501（v4-1 第一任务，不可跳过/不可后置）
   │  12 格全 ≥65.0% ⇒ 放行；任一 <65.0% ⇒ 停工上报编排器 + 全部 50 任务冻结
   ▼
v4-1（TASK-501~515）── CP-1 交接：全 18 门禁绿 + 台账/基线存在 + density-scope 单源 + 宿主 >0
   ▼
v4-2（TASK-601~612）── CP-2 交接：全 17 门禁绿 + StreamEvent/project/CARD_TYPES/render 契约冻结
   ├──────────────────────────────┐
   ▼                              ▼
v4-3（TASK-701~711）          v4-4（TASK-801~812）
   │  CP-3 门禁串行：v4-3 先 ◄──────────┘  （**可并行分解、门禁执行串行：v4-3 先、v4-4 后**）
   ▼
CP-4 [收口锚] TASK-811（V3-VOL-3 八步带值闭合）+ TASK-812（宿主计数 = 0 + 21 门禁）
```

### 2.2 跨叶检查点（**怎么卡**）

| 检查点 | 卡点内容 | 通过条件 | 未通过的处置 |
|:--:|------|------|------|
| **CP-0 spike 闸门** | `TASK-501`（v4-1 第一任务） | 3 宽度 × 2 主题 × 风险 chips 展开态 **12 格全部 ≥0.650** | **立即停工上报编排器**；后续 `TASK-502~812`（49 个）与 v4-2/3/4 全部冻结；五条禁止项（静默下调 / 内容高度凑数 / 删断言 / 流外入分子 / spike 后置）任一出现即视为失败 |
| **CP-1 叶间交接（v4-1→v4-2）** | `TASK-515` 收口 | 18 项门禁全绿（**含增补的 `test:l0/l1/l2`**）+ `docs/v4-supersession-ledger.json`/`docs/v4-density-baseline.json` 存在 + `density-scope.ts` 单源 + `data-transitional-host` 计数 > 0 | 未绿 ⇒ v4-2 `TASK-601` **不得开工**（EC-CHAT-013 禁留红灯） |
| **CP-2 叶间交接（v4-2→{v4-3,v4-4}）** | `TASK-612` 收口 | 17 项门禁全绿 + `StreamEvent`/`project()`/`CARD_TYPES(12)`/`stream-render` 契约冻结 + `KIND_SET` 零 diff | 未绿 ⇒ v4-3 `TASK-701` / v4-4 `TASK-801` 不得开工 |
| **CP-3 v4-3/v4-4 门禁串行** | `TASK-711` 先、`TASK-811/812` 后 | v4-3 收口绿（含 `test:ask-auth`）后才执行 v4-4 的门禁链（同机一次一个 Chromium） | 违序（并发 Chromium）⇒ 视为流程违规，须重跑（R4-15 OOM 风险） |
| **CP-4 收口锚（V3-VOL-3）** | `TASK-811` + `TASK-812`（v4-4 末任务） | `PENDING_ABSOLUTE_CAP` 三值齐备 + 作者确认 + `min()` 判定 + 3 反证 + **宿主计数 = 0** + 21 门禁绿 | 作者未确认 ⇒ 保持 `resolved:false` 并如实登记（**禁伪闭合**）；宿主 ≠ 0 ⇒ 不得收口（R4-18） |

### 2.3 编排器 10 条硬要求 → 承载任务映射（**逐项对照，不漏**）

| # | 编排器硬要求 | 承载任务 | 落点证据 |
|:--:|------|------|------|
| 1 | v4-1 第一任务 = **S 级 spike**（不可跳过、不可后置）；不可达 ⇒ 停工上报 | **TASK-501** | `spikeGate`（tasks.json）+ 8 条验收 + 五条禁止项 |
| 2 | 叶间依赖 `v4-1 → v4-2 → {v4-3, v4-4}`；后两叶可并行分解、门禁串行（v4-3 先） | TASK-515 / 612 / 711 / 811 | §2.1 总图 + CP-1/2/3 |
| 3 | 每叶收尾全门禁绿（R4-17 修正：v4-1 集合必须含 `test:l0/l1/l2`） | TASK-515（v4-1）+ 各叶收口（612/711/812） | 各叶 `serialGates.order`；v4-1 增补项显式登记 |
| 4 | **v4-4 末任务 = V3-VOL-3 闭合**（重定基线 + 绝对上限带值 + 作者确认推导值） | **TASK-811 + TASK-812** | 8 步序列 + AC-CHAT-018 + `v3Vol3Closeout` |
| 5 | journey 保护段八步取代流程（ADR-V4-008）拆成 v4-1 内有序任务链 | **TASK-513**（八步单任务内有序 8 步）+ TASK-501（`#15b` 前置）+ TASK-514（台账/新 pin 门禁） | TASK-513 验收 6 条 |
| 6 | 密度 31 格重定标（ADR-V4-007）= v4-1 登记任务 + RP-V4-01~07 反证任务 | **TASK-511**（31 格 + RP-V4-01~07）+ **TASK-512**（基线登记） | 31 格构成逐项 + 7 条反证 |
| 7 | 测试守恒 D-005 式记录（每叶标注新增/取代/重写计数账） | 各叶 `testConservation` + 本文 §3 总账 | 每叶 tasks.md 的「D-005 测试守恒账」表 |
| 8 | 占位宿主（R4-18）：v4-1 建带 `data-transitional-host`；退役在 v4-3/v4-4；v4-4 收口含**宿主计数 = 0** | **TASK-503**（建）/ TASK-707（v4-3 清零）/ **TASK-810 + TASK-812**（断言 = 0） | TASK-810 验收第 1 条 + TASK-812 验收第 2 条 |
| 9 | 新 Chromium 门禁加入 `EXPECTED_AUDITED_FILES` 落 v4-2/3/4（R4-19：保留门禁文件名使 `v3GateFloors` 同名叠加；`nodeTestRuntime ≥ max(646, 实测)`） | TASK-611（stream）/ TASK-710（ask-auth）/ TASK-810（recommendation） | 三处验收 + `CHROMIUM_GATES.length === 9` 不动 |
| 10 | shim 60 断言门禁化（`test/design-contract.test.ts`）落 v4-1；真实产物等价断言落各叶 Chromium 门禁（R4-20 双列分登） | **TASK-514**（v4-1 门禁化）/ TASK-610 · 709 · 809（真实产物等价） | 各叶验收 + `designCaliber` 分列 |

## 3. D-005 测试守恒总账（跨叶）

> 基线 = **v3 末轮实测**（v3-4 `build.md`/`validate-report.md` 日志：`l0 164 / l1 103 / l2 71 / density 127 / journey 167 / insight 116 / binding 192 / hardening 24 / gate-integrity 12 / supersession 14 / page-input 61 / zero-injection 27 / npm test ℹ tests 795`）+ **v3 台账**（`docs/v3-supersession-ledger.json#counts`：journey 167 / insight 116 / binding 192 / sidepanelView 38 / nodeTestRuntime 832 / floors l0 73 · l1 64 · l2 68 · density 60）。

| 门禁/计数 | v3 末轮实测 | v3 台账口径 | 处置类型 | 承载叶 | v4 预期（只增不减） |
|------|:--:|:--:|------|:--:|:--:|
| `test/ui/l0.mjs` | **164** | floor 73 | **整文件重写**（登记型取代） | v4-1（+v4-2/3/4 追加） | **≥164** |
| `test/ui/l1.mjs` | **103** | floor 64 | **入口机制重写**（同编号重锚） | v4-1（+v4-3/4 追加） | **≥103** |
| `test/ui/l2.mjs` | **71** | floor 68 | 入口位置迁移（同编号重锚） | v4-1 | **≥71** |
| `test/ui/density.mjs` | **127** | floor 60 | **换口径重定标** + 31 格 + RP-V4-01~07 | v4-1（31 格 + 反证） | **≥127** |
| `test/ui/journey.mjs` | **167** | 167 | 保护段 `#15a~#15q` **同编号改写 + 新 pin** | v4-1 | **≥167** |
| `test/ui/insight.mjs` | **116** | 116 / floor 108 | 同编号重锚 | v4-1 | **≥116** |
| `test/ui/binding.mjs` | **192** | 192 | **零改动**（保护段 2 keep） | — | **192** |
| `test/ui/page-input.mjs` | **61** | (27/102 段) | 页面侧可达断言只增 | v4-4 | **≥61** |
| `test/ui/zero-injection.mjs` | **27** | — | 零改动 | — | **27** |
| `test/ui/hardening.mjs` | **24** | — | 零改动 | — | **24** |
| `test/sidepanel-view.test.ts` | **38** | 38 | 4 契约等价/更强改写 | v4-1（①②③）+ v4-2（④） | **≥38** |
| `test/gate-integrity.test.ts` | **12** | — | 追加期望集合条目（`CHROMIUM_GATES.length === 9` 不动） | v4-1 / v4-2 / v4-3 / v4-4 | **只增** |
| `test:supersession` | **14** | — | 双台账判定（v3 冻结 + v4 按行） | v4-1 | **只增** |
| `npm test`（node 运行期） | **795**（v3-4 日志） | **832**（台账 `currentRuntime`） | 新增 6 个 node 文件 | 四叶 | **≥ max(646, 实测)**（**跨口径差须实测订正**，见 §5 问题 1） |
| `test/ui/stream.mjs` | — | — | **新增**（Chromium） | v4-2 | 首轮实测登记 |
| `test/ui/ask-auth-inflow.mjs` | — | — | **新增**（Chromium） | v4-3 | 首轮实测登记 |
| `test/ui/recommendation.mjs` | — | — | **新增**（Chromium） | v4-4 | 首轮实测登记 |
| `test/stream-model.test.ts` | — | — | **新增**（node） | v4-2 | 新增用例 |
| `test/stream-persistence.test.ts` | — | — | **新增**（node） | v4-2 | 新增用例 |
| `test/ask-auth-inflow.test.ts` | — | — | **新增**（node） | v4-3 | 新增用例 |
| `test/recommendation-sources.test.ts` | — | — | **新增**（node） | v4-4 | 新增用例 |
| `test/ref-pick-wiring.test.ts` | — | — | **新增**（node） | v4-4 | 新增用例 |
| `test/design-contract.test.ts` | — | — | **新增**（node；shim 60 断言门禁化） | v4-1 | 首轮实测登记 |
| `test/size-ruling-vol3.test.ts` | — | — | **只增**（`min()` 优先级 + 3 反证） | v4-4 | 只增 |

**取代/重写记账方式（逐叶）**：① 整文件重写型（`l0.mjs`）⇒ v4 台账 `entries[]` 逐条登记 old→new + 理由；② 同编号重锚型（`l1`/`l2`/`insight`/`journey` 保护段）⇒ `modifiedRanges[]`；③ 换口径型（`density.mjs`）⇒ `docs/v4-density-baseline.json#differencesFromV3`（声明「换口径重定标，非放宽」）；④ 零改动型（`binding.mjs`）⇒ `zeroDiffFiles[]`。

## 4. 任务汇总（跨叶）

| 统计项 | v4-1 | v4-2 | v4-3 | v4-4 | 合计 |
|--------|:--:|:--:|:--:|:--:|:--:|
| 任务数 | 15 | 12 | 11 | 12 | **50** |
| S 级 | 1 | 0 | 1 | 0 | **2** |
| M 级 | 10 | 7 | 7 | 5 | **29** |
| L 级 | 4 | 5 | 3 | 7 | **19** |
| 波次 | 8 | 7 | 6 | 6 | **27** |
| 收口任务 | TASK-515 | TASK-612 | TASK-711 | TASK-812 | 4 |
| 闸门任务 | **TASK-501（spike）** | — | — | **TASK-811（V3-VOL-3）** | 2 |

### 4.1 门禁矩阵（跨叶，一次一个 Chromium）

| 门禁 | 类型 | 承载叶（首次纳入） | 计数下界（只增） |
|------|:--:|:--:|:--:|
| `typecheck` / `build` / `npm test` | Node | v4-1 | node ≥ max(646, 实测) |
| `test:supersession` | Node | v4-1 | ≥14（只增） |
| `test:gate-integrity` | Node | v4-1 | ≥12（只增） |
| `test:design-contract` | Node | v4-1（TASK-514） | 新增（60 断言门禁） |
| `test:size-ruling-vol3` | Node | v4-4（TASK-811） | 只增 |
| `test:zero-injection` | Chromium | 既有 | 27（零改） |
| `test:page-input` | Chromium | 既有（v4-4 追加） | ≥61 |
| `test:l0` / `test:l1` / `test:l2` | Chromium | v4-1（**R4-17 增补**） | ≥164 / ≥103 / ≥71 |
| `test:density` | Chromium | v4-1 | ≥127 |
| `test:ui`（journey） | Chromium | v4-1 | ≥167 |
| `test:insight` / `test:binding` / `test:hardening` / `test:e2e` | Chromium | 既有 | ≥116 / 192 / 24 / PASS |
| `test:stream` | Chromium | v4-2（TASK-610） | 新增 |
| `test:ask-auth` | Chromium | v4-3（TASK-709） | 新增 |
| `test:recommendation` | Chromium | v4-4（TASK-809） | 新增 |

## 5. 排布中发现的问题（如实登记，不静默）

| # | 问题 | 证据 | 影响 | 处置（已写入任务的位置） |
|:--:|------|------|------|------|
| **1** | **`nodeTestRuntime` 跨口径差**：v3 台账 `counts.nodeTestRuntime.currentRuntime = 832`，而 v3-4 末轮实测日志为 `ℹ tests 795` | `docs/v3-supersession-ledger.json#counts` vs `specs-tree-v3-4-page-as-input/build.md:51` 与 `validate-report.md:37` | 若直接沿用 832 作 v4 下界，可能**高于实测**导致 v4 全叶收口假红 | 各叶收口（TASK-515 / 612 / 711 / 812）**以实测值重登** `countMethod = runtime-check-calls`；v4-2 BLK 与 v4-1 §5 显式登记 |
| **2** | **v3-4 `tasks.json` 落后于 `tasks.md`**：JSON 为 v1.0（`taskCount: 14`、无 `TASK-415`），`tasks.md` 已 v1.1（15 任务） | `specs-tree-v3-4-page-as-input/tasks.json` meta vs `tasks.md:58/630` | 编号占用**必须按 `tasks.md` 口径**取 `TASK-415`，否则 v4 可能撞号 | 本文 §0.2 按「全局最大 = 415」编排（v4 用 5xx~8xx，保守规避） |
| **3** | 编排器建议的「全局 `TASK-4xx` 序列」**不可用**（4xx 已用至 415） | 同 #2 | 编号冲突风险 | 改用 `5xx~8xx` 百位段（本文 §0.2 偏差登记） |
| **4** | **ADR-V4-040 第 2 条记「收尾门禁 20 项」，实际清单为 21 项**（未把 `size-ruling-vol3` 计入） | `specs-tree-v4-4-.../plan.md:426` 逐项计数 | 若按 20 执行会**少跑 1 项**（V3-VOL-3 收口门禁） | v4-4 TASK-812 按 **21 项实测清单**执行，并在 §0 注与验收里显式登记差异（只增不减） |
| **5** | 父 `plan.md` ADR-V4-005 第 1 条代码块中 `#risk-detail` 被**重复写了两遍**（疑似笔误） | `plan.md:678-679` | 实现者可能按字面复制出两个 id（HTML 重复 id ⇒ 选择器歧义） | v4-1 TASK-503/505 明确「`#risk-detail` **唯一**」；建议由编排器在 plan 勘误（本阶段不改 plan） |
| **6** | v4-1 叶子 spec §8 门禁集合**缺 l0/l1/l2**（父 plan §1 偏差登记 2 已裁决增补） | 本叶 spec §8 vs 父 plan ADR-V4-011 第 2 条 | 照抄 spec 会导致收尾「未跑」而非「绿灯」 | TASK-508/509/510 承载 + TASK-515 收口链显式含三者（R4-17 处置） |
| **7** | `test:v3` 脚本链**不含** `test:supersession` 之外的台账门禁、也**不含** `test:gate-integrity` 之外新项；v4 需自建 `test:v4` 链 | `packages/web-cli-plugin/package.json#scripts.test:v3` | 无 `test:v4` 链则「每叶全门禁绿」依赖手工命令 | 各叶收口任务的 `verify` 提供**串行命令清单**；建议 build 阶段新增 `test:v4`（本阶段不改 `package.json`：属实施面） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。父总览：4 叶 / **50 任务** / **27 波** / S2·M29·L19；跨叶检查点 CP-0（spike 闸门）~ CP-4（V3-VOL-3 收口锚）；编排器 10 条硬要求逐项映射；D-005 测试守恒总账（21 个计数项）；TASK 编号占用实测与 `5xx~8xx` 方案；7 条排布发现如实登记。 | 2026-09-18 | SDDU Tasks Agent |
