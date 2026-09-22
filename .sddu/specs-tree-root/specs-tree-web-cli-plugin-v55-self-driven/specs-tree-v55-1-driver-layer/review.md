# 审查策略：specs-tree-v55-1-driver-layer

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 review-report.md
> **前置依赖**: spec.md（需求规范）、plan.md（技术方案）、父 ADR-V55-001/002/003/005（+ 001~012 概览）、build.md（构建产物，R1+R2）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（C1~C38 审查清单；四维度覆盖；43 条本叶 FR 全覆盖矩阵）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 18 个（源码 7 / 门禁 8 / fixture·台账 3） |
| 审查项（Cx）总数 | 38 |
| 覆盖 FR | 43 / 43 |
| 阻塞问题 | 结论见 review-report.md |

**审查对象来源**
- `spec.md`：本叶 43 条 FR / NFR-SELF-001·004·005·006·007·009·010·011 / EC-SELF-001~008·020 → 逐项核验
- `plan.md` + 父 `ADR-V55-001/002/003/005`：架构遵循性、文件影响分析、体积预算
- `build.md`（R1 v1.0 + R2 v2.0）：文件变更清单、门禁读值、反证留证、遗留登记
- `src/**` + `test/**`：代码质量与测试质量

**前置校验**
1. ✅ `src/` 已实现（`next-registry/drivers.ts` / `terminals.ts` 新增；`sidepanel.ts` / `providers.ts` / `definition.ts` / `recommend.ts` / `ask-bridge.ts` / `service-worker.ts` 修改）
2. ✅ `tasks.md` 25/25 任务 `completed`（tasks.json：W1~W4 全 closed）
3. ✅ `build.md` v2.0 存在，`dist/sidepanel.js` = 557,761 B（实测）

## 2. 自主审查清单（C1~C38）

> 质量门槛：每个 FR ≥ 1 个 Cx（见 §4 覆盖矩阵）；四维度各 ≥ 1 条。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | 驱动者集合 ≡ provider 集合（双向包含，两个手写源） | FR-SELF-010 / AC-SELF-002 / ADR-V55-001 §1 | 规范符合性 | 代码走查 + `driver-quadruple` 门禁实跑 + 注入反证复核 |
| C2 | 四元组（driverId/timing/evidence/ops）+ chips ⊆ 9 opId | FR-SELF-011 / 016 | 规范符合性 | 代码走查 + `OP_IDS` 比对 |
| C3 | 七类「已表达意图」时刻（恰 7）+ 逐类 ≥1 驱动者 | FR-SELF-012 / AC-SELF-015 | 规范符合性 | 源文本走查 + `driver-quadruple#DQ-5` |
| C4 | 「必有下一个驱动者」判据（N=0）+ 双向注入反证 | FR-SELF-013 | 测试质量 | `driver-terminals#DTM-3` + `law7x-ext#L7X-2` |
| C5 | 驱动者去重（driverId + ctx 摘要）幂等 | FR-SELF-014 / NFR-SELF-010 | 规范符合性 | 源走查 + `l1-ref-validity` 幂等断言 |
| C6 | 求值入口恰一处定义；`requestTurn(` 恰 2；无第 8 散落调用点 | FR-SELF-015 / 033 / 100 / ADR-001 §4 | 架构一致性 | grep 计数 + `op-wiring#OP-W-6` |
| C7 | `driverClass` 单源（恰两类；本叶不落 ai-driven 消费分支） | FR-SELF-017 | 规范符合性 | 源走查 + `driver-quadruple#DQ-4/6` |
| C8 | 驱动者 `priority` 必填 + 位置置换测试 | FR-SELF-018 | 测试质量 | 源走查 + 门禁反证 |
| C9 | 四声明单源（时机/时刻/driverClass/声明表）恰一处 | FR-SELF-019 / NFR-SELF-004 | 规范符合性 | `driver-quadruple#DQ-6` 源文本扫描 |
| C10 | 驱动者终态词汇单源（恰 4；与 `STREAM_TERMINALS` 6 正交） | FR-SELF-020 / 103 / LNG-V55-1-003 | 规范符合性 | 源走查 + `driver-terminals#DTM-1/2` |
| C11 | 三型 ask 逐型「必有可达 next」+ 双向反证 | FR-SELF-021 / AC-SELF-003 | 测试质量 | `law7x-ext#L7X-1/2` |
| C12 | `ref-round-<refId>` 作答 ⇒ 可判驱动；「`sends` 递增不足」断言 | FR-SELF-022 / AC-SELF-010 | 规范符合性 | `l1-ref-validity` 计数 vs 输入 |
| C13 | 「已答」四口径（非取消+非空 / 取消另记 / 4 reasons / 迟到不记）**在生产路径**成立 | FR-SELF-023 / EC-SELF-005 / R-SELF-903 | 规范符合性 | 纯函数核验 + **全生产结算路径逐条走查** |
| C14 | 每条新/改终态判据可 FAIL（两段证伪 / 禁恒真） | FR-SELF-024 / 111 / NFR-SELF-007 | 测试质量 | 逐门禁反证段走查 + **真源注入实跑复核** |
| C15 | `applyRefAction` = 裁决 + 驱动；驱动严格在 `allowed` 之后 | FR-SELF-025 / X-SELF-5 / EC-SELF-006 | 规范符合性 | 源码序走查 + `l1-ref-validity` 顺序判据 |
| C16 | `commandSends` 消费面显式登记（COR-1）或退役 | FR-SELF-026 | 架构一致性 | 全仓 grep 消费面 |
| C17 | `submitDescribe` 补齐驱动；空描述零副作用且不入终态 | FR-SELF-027 / EC-SELF-007 / X-SELF-6 | 规范符合性 | 源码序走查 + `ask-auth-inflow`⑮ |
| C18 | 后台 ask 迟到作答：固化 + 可达 next；**不裸 `errorResponse`** | FR-SELF-028 / EC-SELF-008 / R-SELF-008 | 规范符合性 | SW 分支走查 + `ask-bridge` 门禁 |
| C19 | `RecommendTrigger` 含 `'answered'`；旧 4 逐字 | FR-SELF-030 / 101 / X-SELF-2 / ADR-002 §1 | 规范符合性 | 源走查 + `driver-timings#DT-2/3` |
| C20 | `ref-action` 抑制 = 时机侧重锚；`when` 行零改字节 | FR-SELF-031 / R-V55-102 | 架构一致性 | `when` 行逐字比对（`openAsks === 0` 保留，无第二声明） |
| C21 | 时机源闭集单源 + 计数 ≥5 + 散落时机字面量零命中 | FR-SELF-032 | 规范符合性 | `driver-timings#DT-1/4` |
| C22 | 防抖三常量（10 s / ≤3 chip / ≤1 卡）逐字不动 | FR-SELF-034 | 规范符合性 | `recommendation-sources` 门禁 |
| C23 | 新时机不复用 `firstRun`「至多一次」语义 | FR-SELF-035 | 规范符合性 | `recommendation.mjs`⑯ + 源走查 |
| C24 | 时机 ↔ 驱动者映射表机核（答完恰 ≥1 驱动者） | FR-SELF-036 / AC-SELF-015 | 规范符合性 | `driver-quadruple#DQ-4` |
| C25 | `BLOCKED_TERMINALS` 5 逐字不变 + 终态词汇**新增**（正交不混入） | FR-SELF-103 / X-SELF-4 | 规范符合性 | `blocked-terminals#BT-5` + 源走查 |
| C26 | X-SELF-5：语义重定义 + 台账条目 | FR-SELF-104 | 架构一致性 | `l1-ref-validity` + **ledger 走查** |
| C27 | X-SELF-6：`submitDescribe` 台账条目 | FR-SELF-105 | 架构一致性 | **ledger 走查** |
| C28 | 取代台账条目（X-SELF-2/4/5/6 + X-SELF-1「未发生取代」） | FR-SELF-107 / AC-SELF-004 / spec §8.3-8 / TASK-V55-125 ② | 架构一致性 | `docs/v4-supersession-ledger.json` 逐项检索 |
| C29 | 门禁等价重锚清单（`op-wiring` / `recommendation-sources` / `l1-ref-validity` / `ask-bridge` / `blocked-terminals` / `next-registry` / `no-dead-end` / `law8` / `recommendation` / `ask-auth-inflow`） | FR-SELF-110 / AC-SELF-016 | 测试质量 | 改动清单 + 计数对账（只增） |
| C30 | 新门禁纳入 `gate-integrity` 受审集合；`CHROMIUM_GATES === 9` 不动 | FR-SELF-115 | 架构一致性 | `gate-integrity` 实跑 |
| C31 | 本叶面计数只增（node / Chromium 逐门禁） | FR-SELF-116 / AC-SELF-020 | 测试质量 | 基线 vs R2 逐项对账 |
| C32 | 体积五要素 + 预算诚实登记 + 红线逐字节（content / pick-layer / KIND_SET / 12 kind / 零宿主 / manifest / design / ROADMAP） | FR-SELF-120 / 123 / NFR-SELF-005 | 架构一致性 | `stat` + `sha256sum` + metafile 归因 + `git diff --stat` |
| C33 | S0 全链骨架（①~⑩ 逐环节可判） | FR-SELF-130 / AC-SELF-001 | 测试质量 | `s0-chain.mjs` 单源 + 双面实跑 |
| C34 | S0 分支 A 机制侧 + 分支 B 识别侧（A/B 独立计数） | FR-SELF-131 / ADR-V55-005 §3 | 规范符合性 | `s0-self-driven.mjs` 实跑复核 |
| C35 | 「答案不被丢弃」（命中 + 计数不足 + 悬置） | FR-SELF-132 | 规范符合性 | `answerNotDropped` + `law8`⑤ + 双面 |
| C36 | 「静默窗口 = 0」机核（窗口定义单源） | FR-SELF-133 | 测试质量 | `silentWindowReading` ⇔ `s0SilentWindow` 16 组合 |
| C37 | 归因可读 + 零明文（悬置输入不落 digest / 迟到文案静态零明文） | NFR-SELF-011 / FR-SELF-111 | 测试质量 | `law8-plaintext`⑤⑥ |
| C38 | 代码质量：命名/职责单一/错误处理 loud/无硬编码/无冗余；测试断言有效性（弱断言） | §5.1 / §5.4 方法论 | 代码质量 | 逐文件走查 + 全仓恒真断言扫描 |

## 3. 审查详情（方法）

### 3.1 代码质量
- 逐文件阅读 `drivers.ts` / `terminals.ts` / `ask-bridge.ts` 新代码 + `sidepanel.ts` 改点，检查命名清晰度、函数职责单一性、异常路径（loud 返回）、魔法值提取。
- 全仓 `|| true` / `assert.ok(true` / `=== 0 || ` 扫描，识别恒真（空转）断言。

### 3.2 规范符合性
- 43 条本叶 FR 逐条映射到 Cx（§4 矩阵），在代码/门禁中定位实现位置。
- **重点**：FR-SELF-023 的「已答」四口径必须逐条落在**生产结算路径**（不只是纯函数）；FR-SELF-107 / AC-SELF-004 的取代台账必须在 `docs/v4-supersession-ledger.json` 可检索。

### 3.3 架构一致性
- 对照 ADR-V55-001（注册表形态 + diff=0 判据集）、ADR-V55-002（时机侧重锚）、ADR-V55-003（正交终态 + 三段控制）、ADR-V55-005（S0 双面分层）。
- 对照 plan.md §3 文件影响分析：逐文件核对「有遗漏 / 有多余」。
- 对照台账与体积预算：五要素同源、诚实登记。

### 3.4 测试质量
- 门禁存在性 + 判据数 + `expectFailPattern` 声明；反证段是否真的能 FAIL。
- **动手复核**（用户点名）：S0 双面亲跑、`no-dead-end` 判据升级真源注入亲测、冻结面 sha 实测。

## 4. FR → Cx 覆盖矩阵（43/43）

| FR | Cx | FR | Cx | FR | Cx |
|---|---|---|---|---|---|
| FR-SELF-010 | C1 | FR-SELF-025 | C15 | FR-SELF-107 | C28 |
| FR-SELF-011 | C2 | FR-SELF-026 | C16 | FR-SELF-110 | C29 |
| FR-SELF-012 | C3 | FR-SELF-027 | C17 | FR-SELF-111 | C14/C37 |
| FR-SELF-013 | C4 | FR-SELF-028 | C18 | FR-SELF-113 | C28 |
| FR-SELF-014 | C5 | FR-SELF-030 | C19 | FR-SELF-115 | C30 |
| FR-SELF-015 | C6 | FR-SELF-031 | C20 | FR-SELF-116 | C31 |
| FR-SELF-016 | C2 | FR-SELF-032 | C21 | FR-SELF-120 | C32 |
| FR-SELF-017 | C7 | FR-SELF-033 | C6 | FR-SELF-123 | C32 |
| FR-SELF-018 | C8 | FR-SELF-034 | C22 | FR-SELF-130 | C33 |
| FR-SELF-019 | C9 | FR-SELF-035 | C23 | FR-SELF-131 | C34 |
| FR-SELF-020 | C10 | FR-SELF-036 | C24 | FR-SELF-132 | C35 |
| FR-SELF-021 | C11 | FR-SELF-100 | C6 | FR-SELF-133 | C36 |
| FR-SELF-022 | C12 | FR-SELF-101 | C19 | NFR-SELF-001 | C29 |
| FR-SELF-023 | C13 | FR-SELF-103 | C25 | NFR-SELF-004 | C9 |
| FR-SELF-024 | C14 | FR-SELF-104 | C26 | NFR-SELF-005 | C32 |
| FR-SELF-003 | C31 | FR-SELF-105 | C27 | NFR-SELF-007 | C14 |

> 边界情况（EC-SELF-001~008 / 020）分别并入 C1（EC-001）、C21（EC-002）、C2（EC-003）、C23（EC-004）、C13（EC-005）、C15（EC-006）、C17（EC-007）、C18（EC-008）、C32（EC-020）。

## 5. 审查方法（门禁与动手复核）

| 类别 | 方法 |
|---|---|
| 静态 | 读码 + grep 计数（`requestTurn(` / `maybeRecommend(` / `nextAfterSettle(` / `DRIVER_TERMINALS`） |
| 门禁实跑 | `npm test`（1244）· `test:supersession`（36）· `test:gate-integrity`（16）· `test:dead-end`（49）· `test:s0-self-driven`（22） |
| **真源注入复核** | 对 `terminals.ts` 注入真实删除 ⇒ 亲跑 `no-dead-end.mjs` 期望 FAIL ⇒ `git checkout` 逐字节还原 ⇒ PASS |
| 冻结面实测 | `sha256sum` / `stat -c %s`：`content.js` / `pick-layer.js` / `sidepanel.js`；metafile `bytesInOutput` 归因 |
| 台账检索 | `docs/v4-supersession-ledger.json` 逐关键词检索（X-SELF / nextAfterSettle / DRIVER_TERMINALS / modifiedRanges） |

## 6. 结论分级口径

- **BLOCK**（必须修）：规范明文交付物缺失 / P0 FR 在生产路径不成立 → 阻塞 validate。
- **I**（应改进，可登记）：判据力不足、口径不精确、弱断言；可留 N 登记。
- **O**（可留后续叶）：已登记偏差 / 命名口径 / 设计取舍 / 死字段。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（C1~C38；43 FR 全覆盖；四维度齐备；含动手复核方法） | 2026-09-23 | SDDU Review Agent |
