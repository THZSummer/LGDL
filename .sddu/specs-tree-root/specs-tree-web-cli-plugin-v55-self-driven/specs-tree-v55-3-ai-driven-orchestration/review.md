# 审查策略：specs-tree-v55-3-ai-driven-orchestration

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0（42 条承载父 FR / 15 NFR / 6 EC 重点）、本叶 `plan.md` v1.0、父 `../spec.md` + `../plan.md`、父 `ADR-V55-008/009/010/011/012`、本叶 `tasks.md`/`tasks.json`（20/20）、本叶 `build.md` v1.2（R1 `§1~§7` + R3 收口段 `§8`）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-23
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（C1~C45 审查清单；四维度覆盖；42 承载父 FR + 15 NFR + 6 EC 全覆盖矩阵；安全为本：R-SELF-001 最高危）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 30 个（源码 8 / 新门禁 3 / 既有门禁·fixture 9 / 台账·基线 4 / 父 ADR 5 / build·tasks 2） |
| 审查项（Cx）总数 | 45 |
| 覆盖承载父 FR | 42 / 42 |
| 覆盖 NFR | 15（spec §5 全部） |
| 覆盖 EC | 10（spec §6 本叶执行要点全部） |
| 阻塞问题 | 结论见 `review-report.md` |

**审查对象来源**
- `spec.md`：本叶 42 条承载父 FR（§4）+ 15 条 NFR（§5）+ 6 条「本叶重点验」EC（§6）+ 16 个验收锚点（§7）
- `plan.md` + 父 `ADR-V55-008`（派生式三档清分）· `ADR-V55-009`（护栏六常量 + 关断否决 + 载体零新增）· `ADR-V55-010`（并发仲裁 + SW/panel 分工）· `ADR-V55-011`（体积与跨档位）· `ADR-V55-012`（台账 / 保护段 / 每叶门禁清单）
- `build.md` v1.2（R1 + R2 + R3 收口段）：文件变更清单、门禁读值、注入反证、口径拆分 / 越限 / 未落地登记（N-V55-3-R2-01~07 / R3-01~06）、SG-V55-03/04/05 五要素报告
- `src/**` + `test/**`：代码质量与测试质量

**前置校验**
1. ✅ `src/` 已实现（NEW `background/turn-queue.ts` / `next-registry/guard.ts` / `next-registry/ai-drive.ts`；MODIFY `shared/op-table.ts` / `background/{service-worker,chat-events,messaging}.ts` / `ui/sidepanel/sidepanel.ts` / `ui/settings/panel.ts`）
2. ✅ `tasks.md` **20/20** 任务 `completed`（`state.json#phase = builded`；W1~W5 全绿）
3. ✅ `build.md` v1.2（R1 + R2 + R3 段）存在；`dist/sidepanel.js` = **573,424 B**（实测，与登记基线同源）

## 2. 自主审查清单（C1~C45）

> 质量门槛：每条承载父 FR ≥ 1 个 Cx（见 §4 覆盖矩阵）；四维度（代码质量 / 规范符合性 / 架构一致性 / 测试质量）各 ≥ 1 条。
> **安全为本**：`R-SELF-001`（安全边界被主动性侵蚀，最高危）为主轴 —— 特权恒 `gesture` / `consent` 不代答 / `auto` 零三表写入 / 判定链零触碰 / `requestTurn` 恰 2 为**逐项亲核**对象。

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | AI 经**既有** `op.turn` 槽启动回合；`requestTurn(` 调用点仍恰 2（diff = 0） | FR-SELF-060 / 100 / X-SELF-1 | 规范符合性 | 源码走查 + `grep -n requestTurn(` 亲算 + `test/op-wiring#requestTurnProblems` 实跑 |
| C2 | 并发仲裁**可判**：有界队列 1（单源）+ 溢出明确拒绝 + 会话切换显式拒绝 | FR-SELF-061 / 106 / EC-SELF-013 | 规范符合性 | `turn-arbitration#TA①②③` 实跑 + `service-worker.ts` drain 位置走查 |
| C3 | 用户输入**永不静默丢失**三重保障（流内 user 行 / 排队 drain / 草稿回填） | FR-SELF-061 / 096 | 规范符合性 | `TA③/④`（`panelRestoreProblems` 删回填反证）+ 面板 `busy-rejected` 分支走查 |
| C4 | AI 撞车**不排队**（`blocked:busy` + 留痕；不重试） | FR-SELF-061 / 064 | 架构一致性 | `TA④` + `pressDecision(busy:true)` 亲注入 + `ADR-V55-010 §3` 对照 |
| C5 | AI 主动**失败非死端**（单卡边界 + 固化 + 可达 next；重试有界） | FR-SELF-066 | 规范符合性 | 继承 v5 R5 走查 + `no-dead-end`（49/0）实跑 |
| C6 | AI 主动留痕**三要素**（driverId / 何时 / 依据摘要）可读 + **独立成行** + 零明文 | FR-SELF-063 / NFR-SELF-011 | 规范符合性 | `driverTraceLine` 源走查 + Chromium §⑱ `S0C-8` 真面板行走查 + `law8` 亲跑 |
| C7 | 载体零新增：12 kind / `REGISTERED_STRUCTURAL_HOSTS === []` / `KIND_SET` 40 逐字 | FR-SELF-062 / 095 / EC-SELF-006 | 架构一致性 | `proactivity-guard#PG⑦` 实跑（含 `KIND_SET` 注入 41 反证） |
| C8 | **候选恒由注册表产出**（AI 不自造 opId）+ `driverClass` 权限矩阵 | FR-SELF-065 / LNG-V55-3-003 | 架构一致性 | `pressDecision` unknown-op 反证 + `DRIVER_CLASS_CAN_PRESS` 走查 + `OT⑨` 实跑 |
| C9 | AI 主动有界：冷却 + 链深上限；达界停发（非死端） | FR-SELF-064 / EC-SELF-014 | 规范符合性 | `PG③/④` 实跑 + node `S0N-9` 链序穷举 + `driveAnsweredTurn` 接线走查 |
| C10 | 用户**否决权**：本次不复发 + 「同类不再主动」可判登记 + 非死端 | FR-SELF-068 | 规范符合性 | `noteVeto` 接线走查（`rejected`/`cancelled`）+ `ADR-V55-009 §4` 对照 |
| C11 | **总开关可关断**（默认 ON 显式登记）+ 关断后零发起 + **主题① 不受控** + 可逆 | FR-SELF-069 / 094 / NFR-SELF-010 / EC-SELF-016 | 规范符合性 | `PG⑥` + `S0N-10` + Chromium §⑱ 关断复核（`suppressed=disabled` ∧ 真不发 ∧ `recommend()` 照常） |
| C12 | 主题②**前提 = 已配置**（配置判据 = v55-2 唯一分流依据）；未配置 ⇒ 零主动 | FR-SELF-070 / R-SELF-909 | 规范符合性 | `driveAnsweredTurn` configured 早退走查 + Chromium `llm-status` 夹具 + 分支 B 复核 |
| C13 | 三档清分**单源 + 机核**：计数 5 / 2 / 2 + 成员集逐字 + 「恰一档」 | FR-SELF-080 / AC-SELF-005 | 规范符合性 | `op-three-tier#OT①②⑦` 实跑 + `OP_TIER_TABLE` 物化表走查 |
| C14 | **特权 op 恒 `gesture`**（恰 2）；「SW 永不 `.request(`」语义等价保留 | FR-SELF-081 / N-SELF-021 | 规范符合性 | `OT③⑩` 实跑 + `grep '.request('` 亲算（SW 零命中）+ `RL-05` 实跑 |
| C15 | `confirm` 档：**consent 不得被 AI 代答** + AI 发起 ⇒ 必须产出可见 confirm next | FR-SELF-082 / NG-SELF-017 | 规范符合性 | `OT⑨⑩` 实跑（`aiInitiateProblems` / `aiConsentAnswerProblems`）+ `ai-drive.ts` 零 consent 通道扫描 |
| C16 | `auto` 档**零三表写入**（授权 / 权限 / 凭据）；写入点只允许 `confirm`/`gesture` | FR-SELF-083 | 规范符合性 | `OT⑤` 实跑（合成表必红）+ `op-wiring` 写符号调用点计数（各恰 1）走查 |
| C17 | **新 op 必须归档**（清分表 opId 集 ≡ 注册表 opId 集；未归档 / 第四档 ⇒ FAIL） | FR-SELF-084 / EC-SELF-018 | 测试质量 | `OT⑥⑦` 实跑（注入 ghost / 第四档反证） |
| C18 | **AI 不得降档**；`gesture` 档发起方 = 用户手势 | FR-SELF-085 / N-SELF-025 | 规范符合性 | `pressDecision` 档位硬判走查 + `OT③⑨` 实跑 |
| C19 | 清分表与 `ops.ts#IMPL` 的 `riskLevel`/`consent`/`layer` **逐 op 一致** | FR-SELF-086 / R-SELF-906 | 规范符合性 | `OT④` 实跑（`implConsistencyProblems`）+ `tierOf` 派生式走查 |
| C20 | **打扰控制**：频次上限（6 / 10min）+ 同因不重复 + 静默期（60 s）+ 继承 10 s 防抖不改 | FR-SELF-090 / NFR-SELF-013 | 规范符合性 | `PG①②③` 实跑 + 单源扫描（散落零命中） |
| C21 | **token 预算**：预算上限（单源常量 8）+ 达界停发 + 非死端 | FR-SELF-091 / EC-SELF-015 | 规范符合性 | `PG⑤` 实跑 + `guard.ts` 模块头口径登记走查 |
| C22 | **防环**：链深度上限（2）+ 冷却；达界强制转用户手势 | FR-SELF-092 | 规范符合性 | `PG③④` 实跑 + node `S0N-9` 链序穷举 |
| C23 | 三组护栏常量**各恰一处**声明 + 从源文本抽取 + 散落零命中 | FR-SELF-093 / NFR-SELF-004 | 架构一致性 | `PG①` 实跑（`declarationCount` / `literalCount` + 注入第二份反证） |
| C24 | 护栏**越限如实降级**（未落地须显式登记，不得静默放宽） | FR-SELF-097 / N-SELF-026 | 架构一致性 | build §6 / §8.8 逐条登记走查（N-03 token 口径 / N-04 否决口径） |
| C25 | X-SELF-1 读法①（未发生取代**如实登记**）+ X-SELF-7 落账 | FR-SELF-100 / 106 / 107 | 架构一致性 | `op-wiring` 实跑 + `docs/v4-supersession-ledger.json#xSelfLedgerCloseout` 走查 |
| C26 | 取代一律**等价重锚**；未发生取代如实登记 | FR-SELF-107 | 架构一致性 | 台账逐项对账（X-SELF-1~7 终态 + owner + 可机核证据）走查 |
| C27 | 门禁等价重锚清单（本叶主责 11 项 + 共享面对账） | FR-SELF-110 / AC-SELF-016 | 架构一致性 | `git diff` 逐门禁对账 + 计数只增 |
| C28 | 反证**不空转**（两段证据；禁恒真断言） | FR-SELF-111 / NFR-SELF-007 / AC-SELF-017 | 测试质量 | 新门禁全文恒真断言扫描 + 各 `expectFailPattern` 走查 + 亲注入复核 |
| C29 | **保护段处置**（journey `43054..58287` / binding `107780..115930` 保段优先） | FR-SELF-112 / AC-SELF-018 | 架构一致性 | `test:supersession` 亲跑（37/0）+ SG-V55-05 sha 双命中 + `git diff` 零命中 |
| C30 | `knownGap` 一致性机核（`status = complete-steps-1-8` ⇒ 闭环声明） | FR-SELF-113 / AC-SELF-019 | 架构一致性 | `test:supersession#protectedSupersessionConflicts` 亲跑 |
| C31 | 门禁**严格串行** + `KL-N-10` 纪律（隔离复跑 ≥2、如实记录不阻塞收口） | FR-SELF-114 / EC-SELF-021 | 测试质量 | build §8.8 环境性 flake 登记走查（N-01 / N-05 / N-06） |
| C32 | 新门禁纳入 `gate-integrity` 受审集合；**`CHROMIUM_GATES === 9` 不动** | FR-SELF-115 / AC-SELF-021 | 架构一致性 | `test:gate-integrity` 亲跑（19/0）+ 源码常量走查 |
| C33 | **全 Feature 计数只增基线**（末叶对账）+ 登记读数与实测一致 | FR-SELF-116 / AC-SELF-020 | 测试质量 | 逐门禁亲跑 + build/tasks 登记值对账 |
| C34 | 体积五要素（终值）+ 生效上限与 cap 纪律 | FR-SELF-120~122 / NFR-SELF-005 | 架构一致性 | `stat` 亲测 + `size-budget` / `size-ruling-vol3` 实跑 + `SIDEPANEL_CEILING_CAP_ROLE === 'record-only'` 走查 |
| C35 | V3-VOL-3 三值同源 + 档位 / 绝对上限 + **`pending-author-line` 未伪称确认** | FR-SELF-122 / AC-SELF-023 | 架构一致性 | `RL-12` 实跑 + 台账 `v3Vol3Closeout.authorConfirmation` 走查 |
| C36 | **红线逐字节**（content 177,076 / pick-layer 34,358 / sidepanel 573,424） | FR-SELF-123 / AC-SELF-022 | 规范符合性 | `stat` 亲测 + `RL-01/02/03` 实跑 + 冻结三源 hash 走查 |
| C37 | 体积**预算前移评估** + 越限路径登记口径（显式升档 / 如实登记「未跨档位」二态） | FR-SELF-124 / AC-SELF-024 / R-SELF-910 | 架构一致性 | `ADR-V55-011 §4` 对照 + build §4.2 / §8.6 越预算登记走查（+9,644 / 超上界 2,044） |
| C38 | R3 **「真的没变」等式**（metafile 逐模块逐值 == R2 登记 + glue 0 == Δ 0）真实性 | FR-SELF-120 / 124 | 测试质量 | `size-growth-evidence` R3 用例走查 + 真实 `dist/build-meta.json` 逐模块抽核 |
| C39 | **S0 人工面汇总**（三叶面逐项 `⏳`/`PASS`；**v5 人工面 9 项零改写**） | FR-SELF-134 / AC-SELF-025 | 规范符合性 | `s0-self-driven.mjs` 输出走查 + 台账 `manualFaces` 走查 |
| C40 | **S0 分支 A 端到端**：已配置 ⇒ 答案后**零按键** ⇒ 经 `op.turn` 槽成回合 ⇒ 续流 | FR-SELF-131 分支 A / AC-SELF-001 | 规范符合性 | **Chromium §⑱ 亲跑（59/0）**：恰 1 条 `chat` ∧ 作答后 `[data-op]` 点击 = 0 ∧ 真发；node `S0N-9` 真管线 |
| C41 | 护栏**在链路上真实可判**：频次 / 链深 / 预算 + 抑制留痕可读 ∧ 真不发 | FR-SELF-090~092 / 096 | 测试质量 | node `S0N-9` 可注入时钟穷举 + Chromium §⑱ 真面板 `suppressed=` 可读 ∧ `chat` 计数不增 |
| C42 | 判定链零触碰（`zeroDiffFiles` 9 项零 diff；`policy.ts`/`auto-authorize.ts` 永不可解冻） | FR-SELF-067 / LNG-V55-3-006 | 规范符合性 | `OT⑪` 实跑 + `git diff --numstat c2c0e0d` 逐项亲算 + `RL-10` 实跑 |
| C43 | 代码质量：命名 / 职责单一 / 错误处理 loud / 无硬编码 / 无冗余 / 死代码 / 文档与实现一致 | §5.1 方法论 | 代码质量 | 逐文件走查 + 全仓死导出扫描 + 注释引用核对 |
| C44 | 测试质量：测试存在性 / 核心路径 / 边界与错误场景 / 断言有效性（弱断言 / 构造值自证） | §5.4 方法论 | 测试质量 | 门禁走查 + 恒真断言扫描 + 亲注入复核 + reading 来源核对 |
| C45 | 架构一致性：plan.md §3 文件影响分析对齐（NEW/MODIFY/NOOP）+ 零新增 op / 零新增依赖 / 零新增权限 | plan.md §2/§3 + ADR-V55-008 §4 / LNG-V55-3-005 | 架构一致性 | `git diff --name-status` 逐文件对账 + `package.json` / `manifest.json` 亲核 |

## 3. 审查详情（方法）

### 3.1 代码质量
- 逐文件阅读 NEW `background/turn-queue.ts` / `next-registry/guard.ts` / `next-registry/ai-drive.ts` 与 MODIFY `shared/op-table.ts` / `service-worker.ts` / `chat-events.ts` / `sidepanel.ts` / `settings/panel.ts`：命名、职责单一、异常路径（storage 失败降级 / 队列溢出 / 会话切换）、魔法值提取、死导出。
- 全仓 `|| true` / `assert.ok(true` / `=== 0 ||` 扫描（识别恒真空转断言）；注释引用（如 `guard.ts#GUARD_BLOCK_REASONS`）与实际导出一致性核对。

### 3.2 规范符合性
- 42 条承载父 FR 逐条映射到 Cx（§4），在代码 / 门禁中定位实现位置与反证。
- 6 条「本叶重点验」EC 逐条落到**生产路径**：EC-013 走 `runChat` 三路径；EC-014/015 走 `guard.verdict`；EC-016 走 `proactivity.setEnabled` + 主题① 例外；EC-017 走 `pressDecision` 档位硬判；EC-018 走 `OT⑥⑦` 注入。

### 3.3 架构一致性
- 对照 `ADR-V55-008`（派生式清分 / 不加第 10 个 op）、`ADR-V55-009`（六常量单源 / 关断 / 载体零新增）、`ADR-V55-010`（有界队列 1 / SW-panel 分工 / AI 不排队）、`ADR-V55-011`（分列预算 / 跨档位二态）、`ADR-V55-012`（台账 / 保护段 / 每叶门禁清单）。
- 对照 plan.md §3 文件影响分析：逐文件核对「有遗漏 / 有多余」；NOOP 面（`src/content/**` / `manifest.json` / `KIND_SET` / `ROADMAP.md` / `design/**`）零 diff 亲核。

### 3.4 测试质量
- 门禁存在性 + 判据数 + `expectFailPattern` 声明；反证段是否真能 FAIL（禁恒真）。
- **动手复核**（用户点名 + 安全为本）：`npm test` 全量亲跑；新 3 门禁逐枚亲跑；`test:supersession` / `gate-integrity` 亲跑；**Chromium §⑱ 亲跑（S0-A 零按键 + 关断复核）**；journey / law8 / dead-end 亲跑；`stat` / metafile 逐模块抽核；`grep` 计数亲算。

## 4. FR → Cx 覆盖矩阵（42/42）

| 承载父 FR | Cx | 承载父 FR | Cx | 承载父 FR | Cx |
|---|---|---|---|---|---|
| FR-SELF-060 | C1 | FR-SELF-085 | C18 | FR-SELF-113 | C30 |
| FR-SELF-061 | C2/C3/C4 | FR-SELF-086 | C19 | FR-SELF-114 | C31 |
| FR-SELF-062 | C7 | FR-SELF-090 | C20/C41 | FR-SELF-115 | C32 |
| FR-SELF-063 | C6 | FR-SELF-091 | C21/C41 | FR-SELF-116 | C33 |
| FR-SELF-064 | C9/C41 | FR-SELF-092 | C22/C41 | FR-SELF-120 | C34/C38 |
| FR-SELF-065 | C8 | FR-SELF-093 | C23 | FR-SELF-121 | C34 |
| FR-SELF-066 | C5 | FR-SELF-094 | C11/C23 | FR-SELF-122 | C34/C35 |
| FR-SELF-067 | C42 | FR-SELF-095 | C7 | FR-SELF-123 | C36 |
| FR-SELF-068 | C10 | FR-SELF-096 | C3/C25/C41 | FR-SELF-124 | C37/C38 |
| FR-SELF-069 | C11 | FR-SELF-097 | C24 | FR-SELF-134 | C39 |
| FR-SELF-070 | C12 | FR-SELF-100 | C1/C25 | NFR-SELF-003 | C42 |
| FR-SELF-080 | C13 | FR-SELF-106 | C2/C25 | NFR-SELF-004 | C23 |
| FR-SELF-081 | C14 | FR-SELF-107 | C25/C26 | NFR-SELF-005 | C34 |
| FR-SELF-082 | C15 | FR-SELF-110 | C27 | NFR-SELF-007 | C28 |
| FR-SELF-083 | C16 | FR-SELF-111 | C28 | NFR-SELF-010 | C11 |
| FR-SELF-084 | C17 | FR-SELF-112 | C29 | NFR-SELF-011 | C6 |
| | | | | NFR-SELF-013 | C20 |

> 其余 NFR（001/002/006/008/012/009/014）由 C34/C36/C42/C44 共同承载（320px / 键盘 / 兼容 id / 主题① 零 token / 主流程 diff=0）。
> 边界情况：EC-SELF-013 → C2/C3 · EC-SELF-014 → C9 · EC-SELF-015 → C21 · EC-SELF-016 → C11 · EC-SELF-017 → C14/C18 · EC-SELF-018 → C17 · EC-SELF-019 → C34/C37 · EC-SELF-020 → C29 · EC-SELF-021 → C31 · EC-SELF-002（`ai-driven` 驱动者亦须合规）→ C8。

## 5. 审查方法（门禁与动手复核）

| 类别 | 方法 |
|---|---|
| 静态 | 读码 + `grep` 计数（`requestTurn(` / `dispatchChipAction(` / `.request(` / `keyStore.save` / `GUARD_BLOCK_REASONS` / `AI_PROACTIVE_SAME_CAUSE_KEY` / `consent`） |
| 门禁实跑 | `npm test`（1319）· 新 3 门禁（`op-three-tier` 10 / `proactivity-guard` 7 / `turn-arbitration` 6）· `test:supersession`（37）· `test:gate-integrity`（19） |
| Chromium 实跑 | **`test:s0-self-driven`（59）** · `test:ui` journey（171）· `test:law8`（36）· `test:dead-end`（49）· `test:binding`（环境性 flake 亲复现） |
| 冻结面实测 | `stat -c %s`：`content.js` 177,076 / `pick-layer.js` 34,358 / `sidepanel.js` 573,424 / `background.js` · 保护段 sha（`cc79f413…` / `be9ad0e9…`）逐字节命中 |
| 体积抽核 | 真实 `dist/build-meta.json` 逐模块 `bytesInOutput` vs R2 登记行（`v553R2Rows`）；Σ + glue == 登记增量；`size:attribution` 无参自比较的证明力说明 |
| 台账检索 | `docs/v4-supersession-ledger.json#xSelfLedgerCloseout` 逐项 + `docs/v4-density-baseline.json#volume.v553FinalRound` 同源 |
| 注入反证 | 逐门禁注入（删回填 / 队列上限 2 / 删 pressCandidate 门 / 护栏缺项 / `KIND_SET` 注入 ghost / 新 op 未归档 / 特权归 auto / `auto` 档写入 / 判定链塞改动文件 / 红线坏一项）亲核 |

## 6. 结论分级口径

- **BLOCK**（必须修）：规范明文交付物缺失 / P0 FR（或「重点验」EC）在**生产路径**不成立 / 红线被破 / 安全边界（`R-SELF-001`）被侵蚀 → 阻塞 validate。
- **I**（应改进，可登记）：口径不精确、证据登记不实、弱断言 / 构造值自证、文档与实现不符；可留 N 登记。
- **O**（可留后续叶 / validate）：已登记偏差、设计取舍、死导出、环境性 flake、工具读数措辞、继承项。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（C1~C45；42 承载 FR + 15 NFR + 6 EC 全覆盖；四维度齐备；安全为本：R-SELF-001 逐项亲核；含 Chromium §⑱ 亲跑与 metafile 抽核方法） | 2026-09-23 | SDDU Review Agent |
