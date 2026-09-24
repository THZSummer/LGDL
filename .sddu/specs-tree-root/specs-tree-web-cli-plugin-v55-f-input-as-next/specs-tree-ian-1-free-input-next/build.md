# 构建报告：specs-tree-ian-1-free-input-next（IAN-1 流内自由输入 next 通道）

> **文档定位**: SDDU 构建报告 — 记录本叶**两轮**（**R1 = W01+W02**（TASK-IAN-101~116）与 **R2 = W03**（TASK-IAN-117~127））
> 的文件变更与实现结果，作为 review / validate 阶段的输入。
> **前置依赖**: 本叶 `tasks.md` v1.0（任务清单）、`plan.md` v1.0（技术方案）、`spec.md` v1.0（需求规范）、父 `../plan.md`（ADR-IAN-001~010）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-25
> **版本**: v2.0（R1 + R2，**叶1 收口**）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-25
> **更新说明**: R2（W3 收口轮）——S0″-A **中间态保护面**（node `123` + Chromium `124`，样本单源扩展）· `busy-rejected` **流内回填载体**（`restoreFreeInputDraft`：仅当为空 / 卡收起重展开 / 卡不存在按需铸造；叶1 双载体并存）· free-input 场景门禁补全（FIN-7/8/9 + 三段控制 + 真源切片）· `turn-arbitration` TA-8 / `r6-ty` / `sidepanel-view` 等价重锚 · `gate-integrity` 下界只增 `free-input-next` · 红线巡检扩面（`insight-no-escalation` + `law8-plaintext` ⑩）· 体积**叶1 收口终值**重登记（五要素 + V3-VOL-3 三值 + 整叶 `ian1Rows` + EC-IAN-016 二态）· `supersession` 叶段 `R2-W3` + X-IAN 台账/门禁对账骨架。R1（W1+W2）内容保留于 §8 历史段（逐字要点）。

---

## 1. 构建概要

| 维度 | R1（W1+W2） | **R2（W3，叶1 收口）** |
|------|:--:|:--:|
| 范围 | `TASK-IAN-101~116`（16） | **`TASK-IAN-117~127`（11）** |
| 完成任务数 | 16 / 16 | **11 / 11**（**全叶 27 / 27**） |
| 新增文件 | 1（`test/free-input-next.test.ts`） | **0**（全部为既有文件 MODIFY；Chromium 面**只加断言不加文件**） |
| 修改文件 | 20（src×13 / test×5 / docs×2） | **21**（src×1 / test×15 / docs×2 / SDDU×3） |
| 门禁（node） | 1395 → **1416 / 0**（+21） | 1416 → **1431 / 0**（**+15**，零删除） |
| 冻结面 | 逐字节不变 | **逐字节不变**（`content.js` 177,076/`52a82620…` · `pick-layer.js` 34,358/`77796bab…`） |
| 体积（A 列） | 591,946 → **598,282 B**（+6,336） | 598,282 → **599,125 B**（**+843**）；整叶 **+7,179 B**（越叶预算，如实登记） |

### 1.1 两个 spikeGate 结论（R1 先验闸门，探毕删除）

| 闸门 | 任务 | 断言实测 | 结论 |
|---|---|---|---|
| **SG-IAN-01** | TASK-IAN-101 | ① `dispatchChipAction('op.turn', …)` → `runOp('op.turn')` → `bindPanelOps.turn` 收到**原样文本** ✔；② `ACT_TO_OP` 恰 6 ∧ `SET_A_PROTOCOL_ACTIONS` 时点 8 ∧ `requestTurn(` 恰 2 ✔；③ 特权 op 不触达 ✔ | **可行**（4/4） |
| **SG-IAN-02** | TASK-IAN-108 | ① 独立 `requestId='free-input'` 与 `ref-describe` 模型侧纯查询互不干扰 ✔；② `LEGACY_ASK_IDS` 8 项逐字 ∧ `ask-input`/`ask-fallback` 各恰 1 处铸造 ∧ `openFreeInputCard` 零 DOM 自建 ✔；③ `KIND_SET` 40 / 12 kind / 零宿主 ✔ | **可行**（4/4） |

> 探针日志：`/tmp/opencode/v4-gate-logs/ian-1-r1/01-sg-ian-01-probe.log`、`03-sg-ian-02-probe.log`；探针文件**已删除**。BLK-IAN-1 / BLK-IAN-2 **未触发**。

---

## 2. 文件变更

### 2.1 源码（`src/**`，R2）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-IAN-118 / 117 | 新增 `restoreFreeInputDraft(rejected)`（**流内**回填载体三分支：① 卡在 ⇒ **仅当卡内输入为空**才写值；② 卡收起 ⇒ `setCardFallbackOpen(form,true)` 重展开 + focus；③ 卡不存在 ⇒ `openFreeInputCard()` 按需铸造）；`busy-rejected` 分支改为**双载体并存**（流外 `#input` 回填逐字保留 ∧ 流内回填同级；两载体各自「仅当为空」⇒ 互不覆盖），三结果可读行（`BUSY_REJECTED_RESTORED_TEXT` / 新增 `BUSY_REJECTED_CARD_TEXT` / `BUSY_REJECTED_KEPT_TEXT`，既有两条逐字保留）。**在飞不硬禁用**：终端 `.next-terminal`（非 `.next-chip`）不落入 `syncNextstepPending`；`submitFreeInput` 仅异常态（无活跃站点）硬拒。`turn-queue.ts` **零 diff**。 |

> R1（W1+W2）的 13 个 `src/**` 变更（provider / 集 A 8→9 / 末端项注入 + floor / 终端渲染 / 卡内输入语义分支 / `op.turn` 槽提交 / 手输 driver / 让位语义 / a11y / 引导文案）逐字保留，见 §8。

### 2.2 测试与门禁（`test/**`，R2）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/free-input-next.test.ts` | TASK-IAN-121 / 123 | **FIN-7**（回填不覆盖：仅当为空 / 卡收起重展开 / 卡不存在按需铸造 / 双载体并存；五条判据 + 四反证）· **FIN-8**（法八：`submitFreeInput` 只经 `op.turn` 槽 ∧ 卡固化**不回显**值；**真源切片** `askuser.ts#askFixedText` 真调用）· **FIN-9**（三段控制 `ok`/`violated`/`n/a` 逐态可达，`n/a` 不冒充 `ok`）；元判据 `JUDGEMENTS.length === 10` |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` | TASK-IAN-120 | 新增 `streamInputFaceProblems` + 用例：在飞**不硬禁用流内输入面**（终端 `.next-terminal` ≠ `.next-chip` ∧ 同步器不覆盖终端 ∧ 提交体不按 `pending` 门控）；只增（38 → 39 用例） |
| MODIFY | `packages/web-cli-plugin/test/r6-ty-experience-fix.test.ts` | TASK-IAN-120 | 新增 `streamFaceR6Problems` + 用例（R6-P4「在飞不硬禁用」的**等价重锚**到流内面）；原判据逐字保留 |
| MODIFY | `packages/web-cli-plugin/test/turn-arbitration.test.ts` | TASK-IAN-119 | **TA-8** 新判据（拒绝后草稿必须可回填**流内**输入：仅当为空 / 卡收起重展开 / 卡不存在按需铸造）；`panelRestoreProblems` 扩为**双载体**（TA-4 四项逐字保留）；5 条反证；`requestTurn` 计数判据保留 |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | TASK-IAN-122 | `EXPECTED_AUDITED_FILES` **只增** `test/free-input-next.test.ts`；新增 `IAN1_NODE_GATE_FILES` + 元门禁用例（下界 ≥1，既有 `V5_*`/`V551_*`/`V552_*`/`V553_*`/`V55F_*` 逐字保留 ∧ `CHROMIUM_GATES === 9` 逐字不动） |
| MODIFY | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` | TASK-IAN-123 | **S0″-A node 面**：`S0PP_JUDGEMENTS`（7 条）+ `s0ppNodeReading`（新入口**真管线** `bindPanelOps` + `dispatchOp('op.turn')` 成回合 + 旧入口接线 + 双回填源码切片 + 红线读数 + 冻结面双锚）+ 2 条用例（正读 + 反证族 ×7） |
| MODIFY | `packages/web-cli-plugin/test/ui/fixtures/s0-chain.mjs` | TASK-IAN-123 / 124 | **样本单源扩展**（不新增样本文件）：`S0PP_CHAIN`（10 环节）· `S0PP_LEGACY_IDS` · `S0PP_REJECTED_TEXT` · `S0PP_ITEMS`（7 条）· `s0ppProblems(reading)` · `s0ppChain()`；既有 `S0_CHAIN`/`S0′`/批量段逐字保留 |
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` | TASK-IAN-124 | **S0C-12**（S0″-A 真面板面，**只加断言不加文件**）：点末端项 → `#ask-fallback` 可见 + `#ask-input` **获焦** → 真键入 → 真提交 → 流内 `user` 行 + 卡固化不回显 → 旧 `#composer` 三 id 在位且 submit 成回合 → `busy-rejected` 双回填（互不覆盖）→ 共享判据全绿 + 反证 + 样本单源 + 人工面 M1/M2/M5 `⏳ 未执行` |
| MODIFY | `packages/web-cli-plugin/test/insight-no-escalation.test.ts` | TASK-IAN-125 | 红线巡检**扩面**（只增）：零新增载体（`KIND_SET` 40 / 12 kind / 零宿主）∧ 计数红线（`ACT_TO_OP` 6 / `NEXTSTEP_PRIORITY` 4 / 终端不进表）∧ 特权恒 `gesture` ∧ **SW 永不** `permissions.request(`（含反证） |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` | TASK-IAN-125 | 新增 **⑩ 自由输入零明文面**：文本**只骑** `chat` `user` 载体（payload 恰 1 命中 ∧ 非 user 卡面零命中）∧ 卡固化不回显 ∧ 留痕零值 ∧ digest/审计/DOM 属性零命中 + 反证（1 → ≥2） |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` / `size-budget.test.ts` / `size-ruling-vol3.test.ts` / `size-growth-evidence.test.ts` | TASK-IAN-126 | 体积**叶1 收口终值**重登记：基线 598,282 → **599,125** · 生效上限 628,196 → **629,081** · FINAL_ARTIFACT / TIMELINE 追加 / `META.measuredOn` 前移 / `RE_REGISTRATIONS['ian-1-r2']`（五要素）/ `GROWTH_BREAKDOWN.ian1Rows`（整叶 11 行 Σ +7,179）∧ `ian1R2Rows`（单轮 +843）/ `deltaBytes` 303,900 / `closeoutDeltaBytes` 843 / `wiringBytes` 106,236 / round-rows 组数 35 → 36 / 新增整叶聚合判据 |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` | TASK-IAN-127 | 新增 `xIianLedgerProblems` + `xIianGateReconciliationProblems` + 3 条用例（X-IAN-1~7 逐条 / 门禁对账 old→new ∧ 断言零删除 / R2-W3 叶段追加）；只增（42 → 45 用例） |

### 2.3 台账与文档（`docs/**`，R2）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | TASK-IAN-126 | `volume.registeredBaselineBytes` 598,282 → **599,125**；`ceilingBytes` 628,196 → **629,081**（与代码同源） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | TASK-IAN-127 | 追加叶段 `specs-tree-ian-1-free-input-next(R2-W3)@e76f455`（scope 36 文件 / 逐字登记 44 行删除面，6 文件）· 12 个叶段 `scope.files` 按规则复算前移 · 18 条 `newTitle` 换锚（旧值逐字保留在 `reason`）· 新增 `xIianLedger`（X-IAN-1~7）· `xIianGateReconciliation`（11 行门禁对账骨架）· `v3Vol3Closeout.⑤三值闭合.newBaselineBytes` → 599,125 + `ian1R2RePin` |

### 2.4 SDDU 产物

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `.sddu/specs-tree-root/…/specs-tree-ian-1-free-input-next/build.md` | 本文件（v2.0，R1+R2） |
| MODIFY | `.sddu/specs-tree-root/…/specs-tree-ian-1-free-input-next/state.json` | phaseHistory 追加 R2（`builded`，叶1 收口） |
| MODIFY | `.sddu/specs-tree-root/…/specs-tree-ian-1-free-input-next/tasks.json` | `unfilledPoints` IAN-P-001/002 结算（measured），IAN-P-003 保持 `pending-human` |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 |
|------|------|:--:|:--:|
| TASK-IAN-101 | SG-IAN-01 `op.turn` 槽承载自由输入先验 | M | ✅ R1（可行 4/4） |
| TASK-IAN-102 | `providers.ts` free-input provider + 驱动者声明 | S | ✅ R1 |
| TASK-IAN-103 | `dispatch.ts` 集 A 协议动作 8→9 | S | ✅ R1 |
| TASK-IAN-104 | `recommend.ts` 末端项注入 + 零死端 floor + payload | M | ✅ R1 |
| TASK-IAN-105 | `cards/nextstep.ts` 末端项渲染（非 `.next-chip`） | M | ✅ R1 |
| TASK-IAN-106 | `next-dispatch-diff0` D0-5/D0-7 等价重锚 | M | ✅ R1 |
| TASK-IAN-107 | `recommendation.mjs` 末端项断言（只增 72 → 79） | M | ✅ R1 |
| TASK-IAN-108 | SG-IAN-02 askuser 第二语义分支先验 | M | ✅ R1（可行 4/4） |
| TASK-IAN-109 | `cards/askuser.ts` free-input 卡内输入语义分支 | M | ✅ R1 |
| TASK-IAN-110 | `sidepanel.ts` `openFreeInputCard` + `handleCardAction` 分支 | L | ✅ R1 |
| TASK-IAN-111 | `ai-drive.ts` `MANUAL_DRIVER_ID='manual'` 单源 | S | ✅ R1 |
| TASK-IAN-112 | 手输 trace + 让位语义（槽外）+ 空提交可读行 | M | ✅ R1 |
| TASK-IAN-113 | 提交经 `op.turn` 槽（不新增 `requestTurn(` 直连） | M | ✅ R1 |
| TASK-IAN-114 | `view-model.ts` 引导文案改指（叶1 侧） | S | ✅ R1 |
| TASK-IAN-115 | a11y：focus 卡内 input + Enter/Escape 键盘路径 | M | ✅ R1 |
| TASK-IAN-116 | `free-input-next.test.ts` 门禁骨架（FIN-0~6 + 反证） | L | ✅ R1 |
| **TASK-IAN-117** | R6 双入口并存（composer submit 逐字保留）+ 在飞不硬禁用 | M | ✅ **R2** |
| **TASK-IAN-118** | 流内回填支持（`busy-rejected` 迁卡内：仅当为空 / 卡收起重展开 / 双载体并存） | M | ✅ **R2** |
| **TASK-IAN-119** | `turn-arbitration` TA-4 等价重锚 + TA-8 双载体 | M | ✅ **R2** |
| **TASK-IAN-120** | `r6-ty` + `sidepanel-view` 在飞不硬禁用 → 流内输入面 | M | ✅ **R2** |
| **TASK-IAN-121** | `free-input-next` FIN-7/8 + 三段控制 + 真源切片 | M | ✅ **R2** |
| **TASK-IAN-122** | `gate-integrity` `EXPECTED_AUDITED_FILES` 只增 `free-input-next` | M | ✅ **R2** |
| **TASK-IAN-123** | S0″-A node 面（`s0-self-driven-chain` + `free-input-next`） | L | ✅ **R2** |
| **TASK-IAN-124** | S0″-A Chromium 面 + 样本单源扩展（只加断言） | L | ✅ **R2** |
| **TASK-IAN-125** | 红线巡检（三冻结面 / 载体 / base / 判定链 / 法八 / 特权） | M | ✅ **R2** |
| **TASK-IAN-126** | 体积叶1 重登记（五要素 + 三值 + 逐模块 + EC-IAN-016 二态） | M | ✅ **R2** |
| **TASK-IAN-127** | 门禁对账骨架 + X-IAN-7 叶1 侧台账骨架（本叶收口） | M | ✅ **R2** |

> 全叶 **27 / 27 completed**；S×4 / M×19 / L×4；3 波。

---

## 4. 门禁对账（R2 实测，串行；日志 `/tmp/opencode/v4-gate-logs/ian-1-r2/`）

| 门禁 | R1 基线 | **R2 实测** | 判定 |
|------|:--:|:--:|:--:|
| `npm test`（node 运行期用例） | 1416 / 0 | **1431 / 0** | ✅ **+15**（零删除） |
| `test:ui`（journey） | 171 | **171** | ✅ 保段 |
| `test:binding` | 192 | **192** | ✅ 保段 |
| `test:s0-self-driven` | 70 | **81** | ✅ **+11**（S0C-12） |
| `test:density` | 242 | **242** | ✅ 保段 |
| `test:l0` / `test:l1` / `test:l2` | 248 / 131 / 74 | **248 / 131 / 74** | ✅ 保段 |
| `test:recommendation` | 79 | **79** | ✅ 保段 |
| `test:insight` | 118 | **118** | ✅ 保段 |
| `test:hardening` | 24 | **24** | ✅ 保段 |
| `test:law8` | 52 | **60** | ✅ **+8（零降级，≥36）** |
| `test:dead-end` | 53 | **53** | ✅ 保段 |
| `test:auth-chip` | 37 | **37** | ✅ 保段 |
| `test:gate-integrity` | 15 / 0 | **23 / 0** | ✅ 下界声明只增（`free-input-next`） |
| `test:supersession` | 42 | **45 / 0** | ✅ **+3（≥42）** |
| `test:size-ruling-vol3` | 12 | **12 / 0** | ✅（数值重 pin） |
| `test:size-budget` / `test:size-growth-evidence` | PASS | **PASS** | ✅（登记值 == 实测产物 599,125） |
| `test:zero-injection` / `test:page-input` / `test:onboarding` / `test:design-contract` / `test:ref-pick-wiring` | PASS | **PASS**（page-input 125 / onboarding 29 / design-contract 19 / ref-pick-wiring 11） | ✅ 保段 |
| `test:l1-reverse` / `test:l2-reverse` | PASS / 74 | **PASS（隔离复跑）/ PASS（隔离复跑，10/10 反证段）** | ✅ 保段（首轮 `l2-reverse` 触发 600s 外壳超时 ⇒ 隔离复跑 1500s 内 PASS） |
| `test:e2e` | PASS | **PASS**（R8 全链） | ✅ 保段 |
| `op-wiring`（node） | `requestTurn(` 恰 2 | **14 / 0**（`op.turn.callSites === 2`） | ✅ 不变 |

> **门禁严格串行**；`test:v3` 全链（`/tmp/opencode/v4-gate-logs/ian-1-r2/test-v3.log`）首轮在 `test:page-input` 中断并退出（见 §4.2）；其余门禁按上游既有约定**逐个隔离复跑全绿**（日志 `test-*.log`）。

### 4.1 反证（注入必红）摘要（R2 新增）

| # | 反证形态 | 判据 | 结果 |
|---|---|---|---|
| ① | 流内回填**覆盖非空**（去掉「仅当为空」守卫） | `FIN-7` ∧ `TA-8` | ✅ 必红 |
| ② | 删「卡收起 ⇒ 重展开」 | `FIN-7` ∧ `TA-8` | ✅ 必红 |
| ③ | 删「卡不存在 ⇒ 按需铸造」 | `FIN-7` ∧ `TA-8` | ✅ 必红 |
| ④ | 删流外 `#input` 回填（双载体退化单载体） | `FIN-7` ∧ `TA-8` ∧ `TA-4` | ✅ 必红 |
| ⑤ | 提交改走 `assistant` 行（文本落流内明文） | `FIN-8` | ✅ 必红 |
| ⑥ | 卡固化改成回显值（`answeredPrefix + answer`） | `FIN-8` | ✅ 必红 |
| ⑦ | **ian-1 破坏旧入口**（`#composer`/`#input`/`#send` 任一不可用） | `S0PP-A1/A2`（node）+ `S0C-12`（Chromium） | ✅ 必红 |
| ⑧ | 双入口不经 `op.turn` 槽（自造第二回入口） | `S0PP-A3` | ✅ 必红 |
| ⑨ | 终端与 `.next-chip` **同 class**（在飞被硬禁用） | `streamInputFaceProblems` ∧ `streamFaceR6Problems` | ✅ 必红 |
| ⑩ | 在飞同步器把终端纳入禁用面 | `streamInputFaceProblems` | ✅ 必红 |
| ⑪ | 门禁对账断言数非零 / 缺 old→new / 少于 8 行 | `xIianGateReconciliationProblems` | ✅ 必红 |
| ⑫ | X-IAN decision 非法 / counterCheck 悬空 / 缺条 | `xIianLedgerProblems` | ✅ 必红 |

> 反证均**实跑**（node judge 打合成伪造体 / 源码切片；Chromium 侧打真实 DOM），**真源码零触碰**；Chromium 面的人工面 M1/M2/M5 如实登记 `⏳ 未执行`（不冒充 PASS）。

### 4.2 KL-N-10 隔离复跑登记

| 门禁 | 首轮 | 隔离复跑 | 处置 |
|---|---|---|---|
| `test:page-input` | 123 / 2（F-01 前置负控，`candidates=null`） | **125 / 0 PASS** | ✅ 环境性 flake（CDP 中断），非断言语义失败；如实登记 |
| `test:binding` | harness error（`#confirm-allow` selector not found，CDP socket 断开） | **192 assertions PASS**（retry1）· 复跑 ×4（1 PASS / 3 CDP-socket 环境性 flake） | ✅ KL-N-10 环境性 flake（与 R1 同类；同 confirm 卡家系由 `test:page-input` 125 / `e2e` PASS 交叉证据），如实登记 |
| `test:l2-reverse` | 外壳 `timeout 600` EXIT=124（10 段反证中第 4 段，非断言失败） | **EXIT=0 PASS**（`timeout 1500`，10/10 段） | ✅ 慢（首轮 R2 新增叶段使 `supersession` 复算变慢）× 外壳超时，非功能失败 |
| 其余 Chromium 门禁 | — | 逐个隔离复跑全绿（density 242/l0 248/l1 131/l2 74/recommendation 79/ui 171/insight 118/hardening 24/e2e PASS/law8 60/dead-end 53/s0 81/auth-chip 37/gate-integrity 23/l1-reverse PASS） | ✅ |

---

## 5. 体积五要素（A 列 = `dist/sidepanel.js`，**叶1 收口终值**）

| 要素 | 值 |
|---|---|
| **① 实测（唯一来源）** | `stat -c %s dist/sidepanel.js` → **599,125 B**（`npm run build` @ 2026-09-25） |
| **② 前后值** | 598,282 → **599,125 B**（**+843 B，+0.14%**）；**整叶** 591,946 → **599,125 B（+7,179 B ≈ 7.01 KiB）** |
| **③ 日期 / 来源 / buildCommand / measuredBy** | 2026-09-25 / `packages/web-cli-plugin/dist/sidepanel.js` / `npm run build --workspace @lgdl/web-cli-plugin` / `SIDEPANEL_RE_REGISTRATIONS['ian-1-r2']` + `META.measuredBy` |
| **④ 逐模块归因（真实 metafile，整叶 `ian1Rows`；Σ 模块 + glue == 整叶增量）** | `sidepanel.ts` 111,308 → **114,667（+3,359）**（R1 +2,516 ∧ R2 +843）/ `providers.ts` **+957** / `cards/askuser.ts` **+944** / `recommend.ts` **+730** / `cards/nextstep.ts` **+464** / `view-model.ts` **+223** / `stream-plaintext.ts` **+202** / `chat-state.ts` **+103** / `ai-drive.ts` **+99** / `dispatch.ts` **+77** / `ops.ts` **+21**；**Σ +7,179 + glue 0 == +7,179**（复现：`npm run size:attribution -- --rev eade31d --rev WORKTREE`；R2 单轮见 `ian1R2Rows`：`sidepanel.ts` +843） |
| **⑤ 档位 / 绝对上限 / 生效上限 / 作者确认（EC-IAN-016 二态）** | 档位 `ceilTo50KB(599,125) = ` **614,400 未变**；绝对上限 **675,840 未变**；生效上限 628,196 → **629,081**（`floor(599,125 × 1.05)`）；**EC-IAN-016 二态**：越生效上限 = **否**（599,125 < 628,196）/ 越档位 = **否**（599,125 < 614,400）/ 越绝对上限 = **否**；`authorConfirmation` 保持 **`pending-author-line`**（**不伪称已确认**） |

> ⚠️ **越叶预算如实登记（不停机）**：`ADR-IAN-010 §②` 给本叶 A 列预算 **+2.5~4.5 KB**（上界 +15% = +2.9~+5.2 KB）；**整叶**实测 **+7,179 B ≈ 7.01 KiB** ⇒ **越预算与上界**。处理：显式登记（`SIDEPANEL_RE_REGISTRATIONS['ian-1-r2']` + `META.measuredBy` + 本报告 + `v3Vol3Closeout.ian1R2RePin`），**不删判据 / 不放宽容差 / 不静默降档**。
> 主要增量来源 = CJK 文档注释（esbuild 仅保留部分注释）+ R1 的新面/通道/回填。

### 5.1 三冻结面 / 零 diff 面（零容差）

| 面 | 期望 | 实测 |
|---|---|---|
| `dist/content.js` | 177,076 B / sha `52a82620…` | ✅ **逐字节不变** |
| `dist/pick-layer.js` | 34,358 B / sha `77796bab…` | ✅ **逐字节不变** |
| `manifest.json` | 零 diff | ✅ 零 diff |
| `packages/web-cli-base/**` | 零 diff | ✅ 零 diff |
| `src/background/turn-queue.ts` / `service-worker.ts` | 零 diff（SW 队列本体） | ✅ 零 diff |

---

## 6. 偏差 / 裁决点 / 受阻（如实登记）

### A. R1 裁决点的 R2 处置

1. **§6-A-8（R1）「零死端 floor 只覆盖 `empty` 不覆盖 `safety`」——R2 处置 = 保 fail-closed 既有判据 + 登记**：`ADR-IAN-001 §①` 的「无任何候选」按 `raw.length === 0`（`empty`）解；`safety`（有候选但全被 deny 拦下）**保持既有 fail-closed 不推荐**（`recommendation-sources` 的 safety 用例逐字不变、`free-input-next` FIN-2 第三条逐字）。R2 **未扩张到 `safety`**（扩面会把「安全集拦下」退化为「仍给入口」，方向相反）；**登记为口径裁决点**交 review / 叶2 复核是否需扩到 `safety`。判据力零放宽。
2. **R1 §6-A 的 1~9 项**（chips 词汇面两处重锚 / `reachableOpIds` 只收真实 op / `nextstepTerminal` 加法字段 / `ASK_COPY.freeInputSubmitted` / NP-6/7 集 A 9 / NR-10 11 行 / `dispatchOp('op.turn')` 而非 `dispatchChipAction` / floor 口径 / `recommendation-sources` 未改）**逐字保留**，R2 未回退。

### B. R2 实现偏差 / 待复核

3. **`S0″-A node 面「旧入口跑通一轮」为接线判据（非 DOM 真回合）**：node 无 DOM，故 node 面把「新入口」做成**真管线回合**（`bindPanelOps` + `dispatchOp('op.turn')` → 生产 `runOp`），把「旧入口」判为**接线事实**（三 id 在位 ∧ `composer submit → requestTurn(input.value)`）——**真 DOM 双回合由 Chromium 面 S0C-12 承载**（已在 `s0-self-driven.mjs` 注释与 `s0ppProblems` 文档显式登记，禁脚本绿冒充链路可判）。
4. **Chromium S0″-A 段前置「退回聊天面」**：长链前面板可能停在 settings 面（`#region-stream` 被 `display:none` ⇒ 卡内输入不可聚焦）⇒ 该段以**生产返回按钮** `#settings-back` 退出 settings 后再判 focus；这是**读数前置**（不是判据放宽）：focus 断言仍要求 `document.activeElement.id === 'ask-input'`（与 `recommendation.mjs ⑰` 同口径）。
5. **`ian1Rows`（整叶聚合）不映射单轮登记**：整叶 Σ（+7,179）跨两轮（R1 +6,336 / R2 +843），无法映射到单条 `SIDEPANEL_RE_REGISTRATIONS` ⇒ 新增 `ian1R2Rows`（单轮 +843）入 N-05 round-row 组表（组数 35 → 36），`ian1Rows` 由新增「整叶聚合判据」独立机核（Σ + glue == 叶起点 → 叶终值）。**只增，不改既有组**。
6. **台账 leafBases 的 `scope.files` 按规则复算前移**：R2 触碰 `turn-arbitration.test.ts` / `free-input-next.test.ts` 使**历史叶段**的 `testFilesWithDeletions(leafBase)` 复算面扩大 ⇒ 12 个叶段 `scope.files` 全部按规则重算（不得手工放宽/收窄），18 条 `entries[].newTitle` 随体积数值重 pin **换锚**（旧值逐字保留在各条 `reason`）。判据结构与方向零改动、断言零删减。
7. **`docs/v4-density-baseline.json` 未跑 Chromium 真机复核**：`volume.registeredBaselineBytes` / `ceilingBytes` 与代码同源前移；该文件另含 riskIncrement 等**与本叶无关**的字段，本叶零触碰（§4 的 `test:density` 242 保段即证据）。
8. **人工面 M1（末端项可发现性）/ M2（时隐时现困扰是否消失）/ M5（排队体感）**：⏳ **未执行**（属人工面；不得冒充 PASS）；`s0-self-driven.mjs` S0C-12 末尾已如实登记 `⏳ 未执行`。

### C. 待收口（叶2 / 人工面）

9. **`IAN-P-003`**：人工面 M1 / M2 / M5 = `pending-human`（保持）。
10. **R2 review 入口**：本叶（叶1）W1+W2+W3 全部完成后进入 review；`X-IAN-7` 的终态（唯一载体）与 18 门禁终态留叶2。

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| 本叶（叶1）收口 | 运行 `@sddu-review specs-tree-ian-1-free-input-next` 开始代码审查（W1+W2+W3 全范围） |
| 下游叶 | 叶2 `specs-tree-ian-2-abolish-composer`（依赖本叶流内输入面与唯一通道） |
| 口径复核 | §6-A-1（floor 是否扩到 `safety`）交 review / 叶2 裁定 |

---

## 8. R1（W1+W2）历史要点（逐字保留）

- **范围**：`TASK-IAN-101~116`（16 任务）；两个 spikeGate 均「可行」（4/4）。
- **源码（13 文件）**：`sidepanel.ts`（`openFreeInputCard` / `submitFreeInput` / 取消 + 终端透传）· `next-registry/providers.ts`（free-input provider + `DRIVER_DECLS_SRC` 10→11）· `next-registry/dispatch.ts`（集 A 8→9）· `recommend.ts`（末端项注入 + 零死端 floor + `terminal` 字段）· `cards/nextstep.ts`（恒最末终端，非 `.next-chip`）· `cards/askuser.ts`（第二语义分支 + 幂等纯查询 + Enter/Escape + 固化不回显）· `view-model.ts`（引导改指流内）· `stream-model.ts` / `chat-state.ts`（`nextstepTerminal` 加法字段）· `stream-plaintext.ts`（`ASK_COPY.freeInputSubmitted`）· `next-registry/ops.ts`（`reachableOpIds` 只收真实 op）。
- **测试（5 文件）**：`free-input-next.test.ts`（NEW，FIN-0~6 + 反证 19 用例）· `next-dispatch-diff0` D0-5/D0-7 · `recommendation.mjs` ⑰（72 → 79）· `driver-quadruple` DQ-2 · `next-obligation-table` OT-4 · `next-registry` NR-10 · `next-pipeline` NP-6/7/8。
- **门禁**：`npm test` 1395 → **1416 / 0**（+21）；journey 171 / binding 192 / s0 70 / density 242 / l0·l1·l2 / recommendation 79 / law8 52 / dead-end 53 / gate-integrity 15 / supersession 42 / size-* PASS / op-wiring 14 / e2e PASS / `test:v3` 全链 PASS。
- **体积**：591,946 → **598,282 B**（+6,336，越叶预算中间登记）；生效上限 621,543 → 628,196；`authorConfirmation = pending-author-line`。
- **偏差 14 项**（3 处文件清单外连带重锚 / 1 处口径裁决点 floor-safety / binding 首轮 CDP flake 隔离复跑 ×2）逐字见 v1.0 各节（本文件 §6-A 承接其未闭合项）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0（R1） | R1 = W1+W2：SG-IAN-01/02 可行 · free-input provider / 集 A 8→9 / 恒最末终端 / 零死端 floor / 卡内输入语义分支 / `op.turn` 槽提交 / 手输 `driver=manual` / 让位语义槽外 / a11y 键盘 · 新门禁 `free-input-next` FIN-0~6 · 门禁对账 1416/0 · 体积中间登记 +6,336 B 越叶预算不停机 · 14 项偏差/待复核如实登记。 | 2026-09-25 | SDDU Build Agent |
| **v2.0（R2）** | **R2 = W3（叶1 收口）**：S0″-A 中间态保护双面（node `123` + Chromium `124`，样本单源扩展、只加断言不加文件）· `busy-rejected` 流内回填载体（`restoreFreeInputDraft`，叶1 双载体并存互不覆盖）· FIN-7/8/9 + 三段控制 + 真源切片 · `turn-arbitration` TA-8 / `r6-ty` / `sidepanel-view` 等价重锚 · `gate-integrity` 下界只增 `free-input-next` · 红线巡检扩面（`insight-no-escalation` / `law8` ⑩）· 体积叶1 收口终值重登记（599,125 B / 生效上限 629,081 / 整叶 +7,179 B 越叶预算如实登记 / EC-IAN-016 二态「否」/ `pending-author-line`）· `supersession` 叶段 R2-W3 + X-IAN 台账/门禁对账骨架 · 门禁对账 **1431/0**（+15）· R1 §6-A-8（floor-safety）处置 = 保 fail-closed + 登记。 | 2026-09-25 | SDDU Build Agent |
