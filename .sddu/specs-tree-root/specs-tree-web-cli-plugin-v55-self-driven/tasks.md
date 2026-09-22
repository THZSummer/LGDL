# 任务分解：specs-tree-web-cli-plugin-v55-self-driven（web-cli-plugin v5.5「self / ai-driven：让助手像助手」；父 Feature 统领性任务总览）

> **文档定位**: SDDU 任务清单（**父 / 跨切总览与索引**）— 记录 **14 波总表**、**3 叶 61 任务索引**、跨切红线（`N-SELF-001~026` / `T1~T12` / `X-SELF-1~7` / 共享面）→ 任务映射、**体积预算逐叶分摊对照表（Σ 17,800 B / 上界 22,900 B）**、共享面「恰一次」登记、S0 双分支分层接线、spikeGate 结论义务、新增/升级门禁清单与 26 门禁守恒总表、停机规则、以及 build/review/validate 二维时序。**本文件不含可执行任务正文**（父为轻量规范容器，不承接 build/review/validate；任务正文见 3 叶 `tasks.md` / `tasks.json`）
> **前置依赖**: 本目录 `plan.md` v1.0（跨切契约 + `ADR-V55-001~012` 正文索引 + 体积预算表 + 14 波骨架 + 每叶验收门禁清单）+ `spec.md` v1.0（**95 FR / 14 NFR / 22 EC / 26 AC / 22 NG / §12 X-SELF-1~7 / §13 N-SELF-001~026 / §14 3 叶拆分**）+ `discovery.md` v1.0（R-SELF-001~012 / R-SELF-901~910 / §7.1 基线 A~E）+ 3 叶 `plan.md` v1.0 + 3 叶 `spec.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（父总览：**3 叶 × 14 波 × 61 任务**（`TASK-V55-101~125` / `201~216` / `301~320`，三叶连续编号）+ 跨切红线 → 任务映射 + **体积预算逐叶分摊（Σ 17,800 B ≤ 27,480 B）+ 波内登记点** + 共享面「恰一次」登记 + **S0 三层接线落点表** + 5 个 spikeGate + **新增 10 门禁 / 升级 22 门禁清单** + 26 门禁守恒总表 + 停机规则 10 条 + 二维时序）

---

## 0. 结构登记（**3 叶 Feature**）

| 项 | 内容 |
|---|---|
| 父 Feature 定位 | **轻量规范容器**（父 `spec.md §14.1`）：`depth=1`；**不承接** build/review/validate；`childrens` 结构不变 |
| 叶数量 | **3 叶**（`depth=2` / `leaf:true` / `deliveryOrder` 1..3 / 链式 `dependsOn`） |
| 交付顺序 | `specs-tree-v55-1-driver-layer` → `specs-tree-v55-2-deterministic-onboarding` → `specs-tree-v55-3-ai-driven-orchestration`（**串行**，叶间不可并行，父 §14.2） |
| 为何 4 波 + 5 波 + 5 波 | 沿用父 `plan.md §7.3` 骨架：v55-1 = **4**（声明单源→机核→时机/答案→S0/门禁/收尾）；v55-2 = **5**（判据→前置→双源/引导→悬置/续接→两场景/收尾）；v55-3 = **5**（清分→按下→仲裁→护栏→共享面收口） |
| 本轮父产物偏差 | 父产出 `tasks.md` / `tasks.json`（**总览型：0 条可执行任务**）—— 父 `spec.md §14.1` 未列出父 `tasks.json`；与 v4 / v4.5 / v5 先例同口径**显式登记**，可整篇作废而不牵连叶（叶对父的引用 = 「父 FR/AC + `ADR-V55-0xx` 编号」，不依赖父 `tasks` 物理存在性） |
| ADR 所有权 | `ADR-V55-001/002/003/004/005` → v55-1；`006/007` → v55-2；`008/009/010/011/012` → v55-3（011 三叶各自增量 + v55-3 收口合计；012 各叶各登各的条目 + v55-3 收口对账） |
| 编号空间 | `TASK-V55-1xx`（叶 1 `101~125`）/ `TASK-V55-2xx`（叶 2 `201~216`）/ `TASK-V55-3xx`（叶 3 `301~320`）；与 v1 `TASK-001~040` / v2 `2xx~3xx` / v3 `4xx` / v4 `5xx~8xx` / v4.5 `TASK-V45-1xx` / v5 `TASK-V5-1xx~1xx` **零冲突** |
| 波次 | **14 波**（`W01~W14` 全局波序）；叶内 v55-1 `W1~W4` / v55-2 `W1~W5` / v55-3 `W1~W5` |

### 0.1 模板偏差登记（**任务数 > 15**）

| 项 | 内容 |
|---|---|
| 模板建议 | agent 模板 §5.4 / §8「任务数量控制在 5~15 个之间」 |
| 本轮实际 | **61**（25 / 16 / 20），分落 3 叶；每叶任务数 16~25（**均 > 15**） |
| 理由 | ① 编排器任务书明定「按 plan 的 **14 波骨架**分配」，`ADR-V55-012` 已逐波钉死内容；② 过并会破坏「**每任务独立可验证**」（agent 模板 §8 规则 1）；③ 与 v5 父先例（**76 任务**）同口径显式登记；④ 61 = **可原子执行单元**（≈1 文件内 1 项可验证改动 + 其判据），**不是** LLM 调用数 |

---

## 1. 波次总表（14 波 · 3 叶串行）

| 全局波 | 叶 | 叶内波 | 名称 | 任务 | 任务数 | 规模 |
|:--:|:--:|:--:|---|---|:--:|---|
| **W01** | v55-1 | W1 | 声明单源 + **SG-V55-01**（注册表内扩张可行性） | `101`–`106` | 6 | S×1 / M×5 |
| **W02** | v55-1 | W2 | 四元组 / 双向包含 / 终态词汇 + 受审集合 | `107`–`112` | 6 | S×1 / M×5 |
| **W03** | v55-1 | W3 | `nextAfterSettle` + `'answered'` + 答案驱动化 | `113`–`118` | 6 | M×6 |
| **W04** | v55-1 | W4 | S0 双面 + **SG-V55-02**（真链 seam）+ 法七门禁 + 体积/收尾 | `119`–`125` | 7 | M×5 / L×2 |
| **W05** | v55-2 | W1 | 配置判据 3 字段 + `runChat` 前置判据 | `201`–`203` | 3 | S×1 / M×2 |
| **W06** | v55-2 | W2 | 消息变体 type-only + 双源并存 | `204`–`206` | 3 | M×3 |
| **W07** | v55-2 | W3 | 引导流 4 步单源 + 零视图切换 + 法八 | `207`–`209` | 3 | M×3 |
| **W08** | v55-2 | W4 | 悬置任务单源 + 自动续接 | `210`–`212` | 3 | M×2 / L×1 |
| **W09** | v55-2 | W5 | 两场景 + **S0 分支 B 必判项** + 体积/收尾 | `213`–`216` | 4 | M×3 / L×1 |
| **W10** | v55-3 | W1 | 派生式三档清分 + **SG-V55-03** | `301`–`304` | 4 | S×1 / M×2 / L×1 |
| **W11** | v55-3 | W2 | `pressCandidate` + `op.turn` 槽复用（`requestTurn` 仍恰 2） | `305`–`307` | 3 | M×2 / L×1 |
| **W12** | v55-3 | W3 | 并发仲裁（**SG-V55-04** + SW 有界队列 + 草稿回填） | `308`–`311` | 4 | S×1 / M×2 / L×1 |
| **W13** | v55-3 | W4 | 护栏三件套单源 + 留痕 + 关断否决 | `312`–`315` | 4 | M×3 / L×1 |
| **W14** | v55-3 | W5 | 共享面收口（**SG-V55-05** + 保护段 / 体积终轮 / 台账 / 全门禁 + e2e） | `316`–`320` | 5 | M×1 / L×4 |
| **合计** | 3 叶 | — | — | `TASK-V55-101~320` | **61** | **S×4 / M×41 / L×16** |

**跨叶次序**：`W01~W04`（v55-1 全绿）→ `W05~W09`（v55-2 全绿）→ `W10~W14`（v55-3 全绿）。叶间**硬串行**（v55-2 依赖 v55-1 的时机源 / 终态词汇 / 驱动者四元组 / 悬置登记入口；v55-3 依赖 v55-1 底座 + v55-2 的确定性对照面与配置判据）。

---

## 2. 三叶任务索引（61 条；正文见各叶 `tasks.md`）

> 规模：S（单文件 <50 行 / 无外部依赖）/ M（多文件 <200 行 / 简单依赖）/ L（复杂变更 >200 行 / 多依赖）。`*` = **spikeGate（先验闸门）**。

### 2.1 v55-1 `specs-tree-v55-1-driver-layer`（25 · `TASK-V55-101~125` · 4 波）

| # | 任务 ID | 波 | 规模 | 标题 | 主 ADR | 验收锚 |
|:--:|---|:--:|:--:|---|---|---|
| 1 | `TASK-V55-101` | W1 | M | `drivers.ts` —— 驱动者声明单源（`DRIVER_TIMINGS` 5 含 `'answered'` / `PROACTIVE_MOMENTS` 7 / `driverClass` / `CTX_FIELD_SERVICE` / 四元组抽取 / 去重键 / `timingOfSettle`） | 001/002 | AC-002/009/015 |
| 2 | `TASK-V55-102` | W1 | M | `terminals.ts` —— 驱动者终态词汇单源 4（与 `STREAM_TERMINALS` 6 正交） | 003 | AC-003 |
| 3 | `TASK-V55-103` | W1 | S | `RecommendTrigger` 类型**外移 re-export**（单源；零第二声明） | 002 | AC-009 |
| 4 | `TASK-V55-104` | W1 | S | **SG-V55-01** —— 注册表内等价扩张三断言探针（`requestTurn` 仍 2 / timer 4→5 / `nextAfterSettle` 单入口） | 001/002 | AC-002/004 |
| 5 | `TASK-V55-105` | W1 | M | `test/driver-timings.test.ts` —— 时机源单源门禁（恰 5 / 旧 4 逐字 / 散落零命中 / 求值入口恰 1） | 002 | AC-009 |
| 6 | `TASK-V55-106` | W1 | M | `definition.ts` —— `NextCtx` 加法字段 `session.proactive` + `CTX_FIELD_SERVICE` 登记 + 未登记 loud | 001 | AC-002/015 |
| 7 | `TASK-V55-107` | W2 | M | `providers.ts` —— 驱动者行登记 + `ref-action` 时机声明（`when` **零改字节**） | 001/002 | AC-002/009 |
| 8 | `TASK-V55-108` | W2 | M | `test/driver-quadruple.test.ts` —— 四元组抽取机核（`ops ⊆ 9 opId` / `evidence ⊆ NEXT_SERVICES`） | 001 | AC-015 |
| 9 | `TASK-V55-109` | W2 | M | **双向包含**（`listProviders()` ↔ `DRIVERS` 键集）+ 悬空 chips + 三类注入反证（多行/少行/悬空） | 001 | AC-002/015 |
| 10 | `TASK-V55-110` | W2 | M | `test/driver-terminals.test.ts` —— 终态词汇门禁（恰 4 / 正交交集空 / 第二声明 FAIL / **三段控制**禁恒真） | 003 | AC-003 |
| 11 | `TASK-V55-111` | W2 | M | 时机 ↔ 驱动者映射表 + 「答完之后恰 ≥1 驱动者」+ 七类时刻**逐类** ≥1 | 001/002 | AC-002/009 |
| 12 | `TASK-V55-112` | W2 | S | `gate-integrity` 受审集合追加（`NODE_GATE_MARKER` 双命中 + `V55_NEW_GATE_FILES` 下界只增） | 012 | AC-021 |
| 13 | `TASK-V55-113` | W3 | M | `nextAfterSettle` **单入口**（`reachableNext → nextAfterSettle`；定义恰 1；`maybeRecommend(` 1 定义 / 7 调用不增） | 001 | AC-002 |
| 14 | `TASK-V55-114` | W3 | M | `'answered'` 触发通路（答完恰在一次求值内产出 next）+ `recommendation.mjs` 65→增 | 002 | AC-009 |
| 15 | `TASK-V55-115` | W3 | M | `applyRefAction` = 裁决 + **驱动**（调用点恰 1）+ `commandSends` 消费面登记（COR-1） | 004 | AC-010 |
| 16 | `TASK-V55-116` | W3 | M | `submitDescribe` 补齐驱动（空描述卡内校验零副作用**逐字保留**） | 004 | AC-011 |
| 17 | `TASK-V55-117` | W3 | M | 后台 ask 迟到作答 → `{settled:false, late:true}` 固化 + 可达 next（**不裸 `errorResponse`**） | 004 | AC-011 |
| 18 | `TASK-V55-118` | W3 | M | X-SELF-4/5/6 等价重锚 + `blocked-terminals`(9) / `next-registry`(16) / `law8`(25) 只增 | 003/004 | AC-016/017 |
| 19 | `TASK-V55-119` | W4 | S | **SG-V55-02** —— S0 真链 seam 探针（22:49 序列经真实驱动路径可达；**不假 provider**） | 005 | AC-001 |
| 20 | `TASK-V55-120` | W4 | L | `test/ui/fixtures/s0-chain.mjs` —— **S0 样本单源**（纯数据 + 注入式依赖；A/B 双分支） | 005 | AC-001 |
| 21 | `TASK-V55-121` | W4 | L | `test/s0-self-driven-chain.test.ts` —— S0 **node 面**（①~⑧ 逐环节 + 三条总判据 + 两段证伪） | 005 | AC-001 |
| 22 | `TASK-V55-122` | W4 | L | `test/ui/s0-self-driven.mjs` —— S0 **Chromium 面**（分支 A **机制侧** + 分支 B **识别侧**） | 005 | AC-001 |
| 23 | `TASK-V55-123` | W4 | M | `test/ui/law7x-ext.test.ts` —— 法七扩展门禁（4 类已答逐类 + 已交描述 + 双向反证 + 禁恒真） | 003 | AC-003 |
| 24 | `TASK-V55-124` | W4 | M | `test/ui/no-dead-end.mjs` —— **判据升级**（5 类阻塞不减 + 4 类已表达意图终态，39→增，双向反证） | 003 | AC-003 |
| 25 | `TASK-V55-125` | W4 | M | 体积五要素（本叶 +7,000）+ 取代台账本叶条目 + X-SELF-1「未发生取代」+ 本叶收尾全门禁 | 011/012 | AC-020/026 |

### 2.2 v55-2 `specs-tree-v55-2-deterministic-onboarding`（16 · `TASK-V55-201~216` · 5 波）

| # | 任务 ID | 波 | 规模 | 标题 | 主 ADR | 验收锚 |
|:--:|---|:--:|:--:|---|---|---|
| 1 | `TASK-V55-201` | W1 | M | `llm/status.ts` —— `+ isLlmConfigured()`（**3 字段** `hasKey ∧ providerId ∈ PROVIDERS ∧ model 非空`；零依赖） | 006 | AC-007 |
| 2 | `TASK-V55-202` | W1 | S | `test/onboarding-deterministic.test.ts` —— 判据机核（3 字段扫描 + 归一化不变量 + 假阴/假阳注入必红） | 006 | AC-007 |
| 3 | `TASK-V55-203` | W1 | M | `runChat` **前置配置判据**（先于 `providerChat`；early return 在 `chatBusy = true` **之前**） | 006 | AC-007 |
| 4 | `TASK-V55-204` | W2 | M | `messaging.ts` union **type-only** 扩成员 + `chat-result` payload `variant`（`KIND_SET` 40 **不动**） | 006/010 | AC-006 |
| 5 | `TASK-V55-205` | W2 | M | **双源并存**（被动保留 + 主动识别 fold 既有 `risk`）+ 幂等 + 恢复链零改写 | 006 | AC-007/012 |
| 6 | `TASK-V55-206` | W2 | M | `blocked-terminals`(9 不变) + `next-registry`(16 增，`onboarding` provider 语义零改写) | 006/012 | AC-013 |
| 7 | `TASK-V55-207` | W3 | M | `onboarding-flow.ts` —— 引导流 **4 步单源** + 复用 `OP_PARAM_SEQUENCE['op.llm-config']` + 文案 | 007 | AC-007 |
| 8 | `TASK-V55-208` | W3 | M | 引导 `op.llm-config` op-direct chip + **零视图切换** / 零 `#open-settings` 断言 + 反证 | 007 | AC-007 |
| 9 | `TASK-V55-209` | W3 | M | `law8-plaintext.mjs`（25 **增**：引导路径零明文）+ `stream.mjs`（73 增） | 007/010 | AC-012 |
| 10 | `TASK-V55-210` | W4 | M | `suspension.ts` —— 悬置任务**单源**（登记 / `MAX_SUSPENSIONS=1` / 三要素 / **有效期重校验**） | 007 | AC-007 |
| 11 | `TASK-V55-211` | W4 | L | 配置完成 **自动续接**（顺序机核「回执在前续接在后」）+ 失败回滚且**悬置保留** | 007 | AC-007 |
| 12 | `TASK-V55-212` | W4 | M | 悬置**单源扫描**（第二处 ⇒ FAIL）+ 失效重校验反证 + 空悬置非死端 | 007 | AC-007 |
| 13 | `TASK-V55-213` | W5 | M | **首装 / 已装未配两场景**（`firstRun=false` 注入仍产出；`R-ONBOARDING` 判据不减） | 007 | AC-013 |
| 14 | `TASK-V55-214` | W5 | L | **S0 分支 B 必判项**（未配置 ⇒ 引导 ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接** ⇒ 留痕；删续接 ⇒ FAIL） | 005/007 | AC-001 |
| 15 | `TASK-V55-215` | W5 | M | 取消非死端 + 同因不重复（`maybeRecommendFirstRunEntry` 三纪律保留） | 007 | AC-007 |
| 16 | `TASK-V55-216` | W5 | L | 体积五要素（本叶 +4,900）+ X-SELF-3 台账 + `supersession` ≥36 + 本叶收尾全门禁 | 011/012 | AC-020/026 |

### 2.3 v55-3 `specs-tree-v55-3-ai-driven-orchestration`（20 · `TASK-V55-301~320` · 5 波）

| # | 任务 ID | 波 | 规模 | 标题 | 主 ADR | 验收锚 |
|:--:|---|:--:|:--:|---|---|---|
| 1 | `TASK-V55-301` | W1 | S | **SG-V55-03** —— 三档清分**派生式**可得性探针（`layer`/`consent` 自动得 5/2/2） | 008 | AC-005 |
| 2 | `TASK-V55-302` | W1 | M | `shared/op-table.ts` —— `+ hasConsent` / `tierOf()` / 物化 `OP_TIER_TABLE`（**派生式**） | 008 | AC-005 |
| 3 | `TASK-V55-303` | W1 | L | `test/op-three-tier.test.ts` —— 5/2/2 + 成员集逐字 + 与 `IMPL` 一致 + 新 op 未归档 ⇒ FAIL + 特权恒 `gesture` | 008 | AC-005 |
| 4 | `TASK-V55-304` | W1 | M | `capability-wiring`（`.request(` 语义等价保留）/ `sw-op-mirror`(≥5) 等价重锚 | 008 | AC-005 |
| 5 | `TASK-V55-305` | W2 | M | `ai-drive.ts` —— `pressCandidate` 单源 + `driverClass` 权限矩阵 + `auto` 档**唯一**自动按下点 | 010 | AC-008 |
| 6 | `TASK-V55-306` | W2 | L | `op.turn` 槽复用（→ `PANEL.turn` → `requestTurn`；**`requestTurn(` 仍恰 2**）+ `op-wiring` 复合读数 | 010 | AC-008 |
| 7 | `TASK-V55-307` | W2 | M | 逐档反证：`confirm`/`gesture` **不可自动按下** + AI 不自造候选 | 008/010 | AC-005/008 |
| 8 | `TASK-V55-308` | W3 | S | **SG-V55-04** —— 仲裁落 SW 零 sidepanel 字节 + 草稿回填 seam 探针 | 010 | AC-014 |
| 9 | `TASK-V55-309` | W3 | M | `service-worker.ts` —— 有界仲裁队列（`TURN_QUEUE_MAX = 1` + 入队/drain/溢出**明确拒绝**） | 010 | AC-014 |
| 10 | `TASK-V55-310` | W3 | M | 留痕 + **草稿回填**（拒绝后 `#input.value === 被拒文本` + 可读行；AI 撞车**不发起**） | 010 | AC-014 |
| 11 | `TASK-V55-311` | W3 | L | `test/turn-arbitration.test.ts` —— 用户输入**零丢失**三路径 + 队列恒 ≤1 + 闭集 4 项 | 010 | AC-014 |
| 12 | `TASK-V55-312` | W4 | M | `guard.ts` —— 护栏**六常量单源**（频次 6/10min · 同因 · 静默 60 s · 冷却 re-export · 链深度 2 · 回合预算 8） | 009 | AC-006 |
| 13 | `TASK-V55-313` | W4 | M | 越限抑制 + 链深度截断 + 预算耗尽**非死端** + `driverTraceLine` 留痕三要素（**零明文**） | 009/010 | AC-006/008 |
| 14 | `TASK-V55-314` | W4 | L | `settings/panel.ts` —— 主动性开关（既有分区内 / **零新增分区** / 零新增必需 id；默认 **ON** 显式登记）+ 关断否决 | 009 | AC-006 |
| 15 | `TASK-V55-315` | W4 | M | `test/proactivity-guard.test.ts` —— 六常量单源 + 散落零命中 + 越限抑制 + 关断 + **载体零新增** | 009 | AC-006 |
| 16 | `TASK-V55-316` | W5 | S | **SG-V55-05** —— journey / binding 保护段**保段**字节中立可行性探针 | 012 | AC-018 |
| 17 | `TASK-V55-317` | W5 | L | `journey.mjs` —— **保段优先**（段内零字节 / 段外逐行登记 / 计数 ≥171 + RP-V4-08 反证） | 012 | AC-018 |
| 18 | `TASK-V55-318` | W5 | M | `binding.mjs` —— **保段**（`decision=keep`）+ 段外逐行登记 + `test:binding` ≥192 | 012 | AC-018 |
| 19 | `TASK-V55-319` | W5 | L | **体积终轮**（三叶合计）+ `size-baseline.ts` 五要素 + V3-VOL-3 三值同源 + **跨档位显式升档登记** | 011 | AC-023/024 |
| 20 | `TASK-V55-320` | W5 | L | 共享面收口 —— 取代台账逐项对账 + `knownGap` + 人工面汇总 + 全 Feature 计数对账 + 全门禁串行 + e2e | 012 | AC-019/020/025/026 |

---

## 3. 跨切红线 → 任务映射

### 3.1 spec 新增红线 `N-SELF-021~026`

| # | 红线（逐字要点） | 承载任务 | 判据锚点 |
|---|---|---|---|
| **N-SELF-021** | 特权 op 恒 `gesture`（AI 不可发起 / 不可代答 consent） | `303` / `304` / `307` | `tierOf(d) = d.layer === 'sw' ? 'gesture' : …`；特权清单恰 2；逐档注入 ⇒ FAIL |
| **N-SELF-022** | 驱动者集合 ≡ 注册表 provider 集合；驱动者不得自带调用点 | `101` / `107` / `109` / `113` | 双向包含机核 + 三类注入反证 + `maybeRecommend(` 1/7 不增 |
| **N-SELF-023** | 「答案必须产生驱动」（不得以计数 / 留痕 / dispatch 为唯一副作用） | `115` / `116` / `117` / `121` | 「有效 ⇒ 驱动」+ 双向注入必红 |
| **N-SELF-024** | 主题① **零 LLM 调用 / 零 token** | `201` / `203` / `207` / `213` | 判据落 SW 前置 + 引导流全数据化 + 零 provider 调用断言 |
| **N-SELF-025** | AI 主动不得改档 / 不得新增真值源 / 不得新增静态权限 | `302` / `305` / `307` / `315` | 派生式清分 + `CTX_FIELD_SERVICE` 登记 + 零权限（`manifest` 零 diff） |
| **N-SELF-026** | 护栏不可静默取消（未落地须显式登记） | `312` / `315` / `319` / `320` | 六常量单源 + 越限被抑制 + 「已落地 / 显式登记未落地」二态 |

### 3.2 `X-SELF-1~7` 显式取代 → 任务映射（**等价重锚，不是放宽**）

| # | 取代内容 | 承载任务 | 台账落点 |
|---|---|---|---|
| **X-SELF-1** | `requestTurn(` 恰 2 处 | `104`(SG) / `113` / `306`（**未发生取代**，如实登记） | `modifiedRanges[]` **零新增**；文书登记「未发生取代」 |
| **X-SELF-2** | `RecommendTrigger` 恰 4 项 + `ref-action` 抑制 | `103` / `105` / `107` / `114` | `modifiedRanges[]`（类型外移 + `providers.ts` 注释级）+ 计数只增 |
| **X-SELF-3** | `llm.unconfigured` 仅被观测 | `205` / `216` | `modifiedRanges[]`（SW + 面板 fold 面逐行）+ 主题① 门禁计数对账 |
| **X-SELF-4** | 死端判据只判 5 类阻塞 | `110` / `118` / `124` | `modifiedRanges[]` + `test:dead-end` 计数对账（≥39，增） |
| **X-SELF-5** | `applyRefAction` 唯一副作用 = `sends += 1` | `115` / `118` | `modifiedRanges[]` + `l1` / `page-input` 计数对账 |
| **X-SELF-6** | `submitDescribe` 只 `dispatch` | `116` / `118` | `modifiedRanges[]` + `test:ask-auth` 计数对账（≥71 增） |
| **X-SELF-7** | `chatBusy` 丢弃第二条 | `309` / `310` / `311` / `320` | `modifiedRanges[]` + `journey` / `ask-auth` 计数对账 |

### 3.3 不动面 `T1~T12` → 巡检任务

| # | 不动面 | 巡检任务（逐字节 / 零 diff） |
|---|---|---|
| T1 | `src/content/**` / `dist/content.js`(177,076) / `dist/pick-layer.js`(34,358) | `125`（本叶）/ `216` / `319` / `320` |
| T2 | `KIND_SET` 40 项逐字 | `204`（v55-2）/ `315`（v55-3）/ `319` / `320` |
| T3 | 判定链（`policy.ts` / `auto-authorize.ts`，`zeroDiffFiles` 9 项） | `307` / `319` / `320` |
| T4 | `manifest.json` 零 diff | `216` / `319` / `320` |
| T5 | `docs/v3-supersession-ledger.json` 零 diff | `319` / `320` |
| T6 | 12 kind / `BORN_FROZEN_KINDS` / `STREAM_TERMINALS` 6 / `MAX_OPEN_ASKS=2` / `ASK_CANCEL_REASONS` 4 / `REF_ROUND_PREFIX` | `102` / `110` / `315` |
| T7 | 三区法则 | `315` / `317` |
| T8 | `ROADMAP.md` 全文件零 diff（F-33 / v0.11.0 留收口） | `320` |
| T9 | `packages/web-cli-base/**` 零改动 | `320` |
| T10 | `design/**`（F 双 + G 双 sha） | `320`（收口巡检） |
| T11 | 9 op 清单 / `OPS_BY_ID` 键集 / `MOUNT_MODE` / `NEXT_SERVICES` 6 / `NEXT_MODES` 2 | `302` / `303`（零新增 op） |
| T12 | v5 已建 8 新门禁 + 既有门禁（只允许追加 / 等价重锚） | `112` / `125` / `216` / `320` |

---

## 4. 共享面「恰一次」登记（`FR-SELF-004`）

> **口径**：四类共享面被 ≥2 叶触碰 ⇒ **必须恰一次做完**；禁止「两叶各改一次同一条目」。

| 共享面 | 登记叶 | 承载任务 | 校验 |
|---|---|---|---|
| **体积五要素** | 各叶登记自身增量；**收口合计在 v55-3** | `125` / `216` / `319`（三叶合计） | `SIDEPANEL_BASELINE_BYTES_TIMELINE` **只追加** + metafile 归因（Σ 逐模块 Δ + 未归因 == 登记增量） |
| **journey 保护段** `43054..58287` / `cc79f413…` | **v55-3** | `316`(SG) / `317` | 保段（sha + startByte **双不变**）或八步显式取代（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒 ≥171 + RP-V4-08 反证） |
| **binding 保护段** `107780..115930` / `be9ad0e9…` | **v55-3** | `318` | 保段（`decision = keep`）+ 段外逐行登记 + `test:binding` ≥192 |
| **取代台账** | **各叶各登各的条目（文件只追加）**；v55-3 逐项对账 | `118` / `125` / `216` / `320` | `test:supersession` ≥36 + `status ↔ knownGap` 一致性 + X-SELF-1「未发生取代」如实登记 |
| **`knownGap` 一致性** | **v55-3**（末叶收口） | `320` | `status = complete-steps-1-8` ⇒ 该字段为空或仅声明闭环 |
| **人工面清单** | **v55-3**（汇总三叶面） | `320` | 逐项 `⏳ 未执行` / `PASS`；**v5 人工面 9 项零改写（并列不覆盖）**；不得冒充 PASS |

---

## 5. 体积预算逐叶分摊与波内登记点

> 权威：`plan.md §7.2` + `ADR-V55-011`。`sidepanel.js` 是**唯一**带字节预算的产物；`background.js` / `options.js` / `test/**` **不计入**该账本。

| 叶 | 主增量构成（sidepanel.js） | 预算 | 上界 | 五要素登记任务（波内） | 累计投影 |
|---|---|--:|--:|---|---|
| **v55-1** | `drivers.ts` 2,600 + `terminals.ts` 700 + `providers.ts` 900 + `sidepanel.ts` 2,400 + `recommend.ts` 200 + `definition/pipeline/dispatch` 200 | **7,000** | **9,000** | `TASK-V55-125`（W4 收口轮） | 549,609 → **556,609**（未越档位 563,200） |
| **v55-2** | `suspension.ts` 1,300 + `onboarding-flow.ts` 1,100 + `llm/status.ts` 120 + `sidepanel.ts` 2,300 | **4,900** | **6,300** | `TASK-V55-216`（W5 收口轮） | 556,609 → **561,509**（距档位 **1,691 ⚠️ 紧**） |
| **v55-3** | `guard.ts` 1,700 + `ai-drive.ts` 1,400 + `op-table.ts` 300 + `sidepanel.ts` 2,000 + `settings/panel.ts` 350 + 其余 150 | **5,900** | **7,600** | `TASK-V55-319`（W5 收口轮，**三叶合计**） | 561,509 → **567,409** ⇒ **越档位 +4,209** ⇒ **显式升档** |
| **Σ** | — | **17,800** | **22,900** | — | ×1.15 = **20,470** ✅（余 7,010）/ 上界 **26,335** ✅（余 1,145） |

**跨档位显式升档预案（ADR-V55-011 §4）**：档位 → `ceilTo50KB(567,409)` = **614,400**；绝对上限 → **675,840**；生效上限 = `min(675,840, 595,779)` = **595,779**；`newBaselineBytes` **同源前移**；`authorConfirmation.status` 保持 **`pending-author-line`**（**不得伪称已确认**）。若实测**未**越档位 ⇒ **如实登记「未跨档位」**（二态显式，不制造升档条目）。

**波内中间登记点**：W1/W2/W3 各波若出现 >300 B 单模块偏离，须在该波**收口任务**的 build 记录中登记「偏离值 + 依据」（不新增 cap / 不改容差 / 不删判据）；三叶各自收口轮（`125` / `216` / `319`）做**五要素正式重登记**。

**减体积优先级（越预算时按序执行；均不触碰断言 / 容差 / 档位口径）**：① 纯记账 / 计数逻辑下移 `background.js`（SW 产物，不计账）；② 元组行手法压缩声明数据；③ 复用既有系统行 / receipt 文案；④ 合并同 `when` 的驱动者声明行；⑤ **显式登记**未落地项为未闭合义务。

---

## 6. spikeGate 清单与结论义务

| 代码 | 任务 | 叶/波 | 假设（被验证者） | 被闸门任务 | 结论义务 / 停止规则 |
|---|---|---|---|---|---|
| **SG-V55-01** | `TASK-V55-104` | v55-1 / W1 | **注册表内等价扩张可行**：① `requestTurn(` 仍恰 2（AI 经既有 `op.turn` 槽无用户按键可达）② `RecommendTrigger` 值集 4→5 且旧 4 逐字、求值入口仍恰 1 ③ `nextAfterSettle` 单入口可承接 `'answered'` | `113` / `114` / `306` | **任一不可行** ⇒ 暂停上报，**触发 X-SELF-1/2 显式放宽路径**（读法②：具名入口集 + 等价重锚判据 + 台账留痕）；**禁**静默放宽计数 |
| **SG-V55-02** | `TASK-V55-119` | v55-1 / W4 | **S0 真链 seam 可得**：绑定→探测→拾取→ask→作答→**驱动**→双分支在 headless 下可经**真实驱动路径**复刻（**不假 provider**） | `120` / `121` / `122` / `214` | seam 不足 ⇒ 回 v55-1 补可注入 `when(ctx)`；**禁**以场景脚本假绿替代链路可判（R-SELF-908） |
| **SG-V55-03** | `TASK-V55-301` | v55-3 / W1 | **三档清分派生式可得**：`tierOf(d)` 由既有 `layer`/`consent` 自动得 **5/2/2** 且与 `ops.ts#IMPL` 逐字段一致（含 `op.turn` 归 `auto` 理由） | `302` / `303` | 不可得（需手写第二份表 / 与 `IMPL` 冲突）⇒ 暂停上报；**禁**引入手写清分清单（R-SELF-906） |
| **SG-V55-04** | `TASK-V55-308` | v55-3 / W3 | **仲裁落 SW 零 sidepanel 字节 + 草稿回填 seam 可得**（溢出明确拒绝且用户输入可还给用户） | `309` / `310` / `311` | 不可得 ⇒ 暂停上报；**禁**把有界队列退化为无界 / 静默丢弃（R-V55-106/107） |
| **SG-V55-05** | `TASK-V55-316` | v55-3 / W5 | **保护段保段字节中立可行**：journey `43054..58287` / binding `107780..115930` 在 `sidepanel.ts` 改动下可保段（段前偏移等长补偿预算） | `317` / `318` | 不可行 ⇒ 走 **八步显式取代**（journey）或暂停上报（binding `decision=keep`）；**禁**静默改 pin |

**结论义务（全部 5 个）**：spike 结论须以「假设 / 探针方法 / 实跑证据 / 结论（可行 / 不可行）/ 对下游的影响」五要素写入对应叶的 build 记录；**结论 = 不可行** ⇒ 对应「被闸门任务」**不得开工**，且按停止规则上报（`blockers`）。

---

## 7. 门禁守恒总表与新增 / 升级门禁清单

### 7.1 新增门禁（**10 门**，`V55_NEW_GATE_FILES ≥6` 下界只增）

| # | 门禁文件 | 名 | 叶 | 承载任务 | 关键判据 |
|:--:|---|---|:--:|---|---|
| 1 | `test/driver-timings.test.ts` | 时机源单源 | v55-1 | `105` | 恰 5 含 `'answered'` / 旧 4 逐字 / 散落零命中 / 求值入口恰 1 |
| 2 | `test/driver-quadruple.test.ts` | **driver-quadruple（含 drivers-table 双向包含）** | v55-1 | `108` / `109` | 四元组可抽 + **双向包含** + 悬空 ⇒ FAIL + 三类注入 |
| 3 | `test/driver-terminals.test.ts` | **driver-terminals（三段控制）** | v55-1 | `110` | 恰 4 / 与 `STREAM_TERMINALS` 6 正交 / 第二声明 FAIL / **正常绿 · 移除驱动者必红 · 端态不存在不要求** |
| 4 | `test/s0-self-driven-chain.test.ts` | **S0 node 面（s0-chain 双面之一）** | v55-1（v55-2 增分支 B） | `121` / `214` | ①~⑧ 逐环节 + 「答案不被丢弃 ∧ 静默窗口 = 0 ∧ 死端 = 0」+ 两段证伪 |
| 5 | `test/ui/s0-self-driven.mjs` | **S0 Chromium 面（s0-chain 双面之二）** | v55-1（v55-2 增） | `122` / `214` | 真面板：绑定→拾取→作答→驱动→A/B 双分支→终局 |
| 6 | `test/ui/law7x-ext.test.ts` | 法七扩展 | v55-1 | `123` | 4 类已答逐类 + 已交描述 + 双向反证 + 禁恒真 |
| 7 | `test/onboarding-deterministic.test.ts` | 主题① 场景 | v55-2 | `202` / `213` | 3 字段判据 / 源码序 / 两场景 / 零 LLM / 零视图切换 / 自动续接 / 失效重校验 |
| 8 | `test/op-three-tier.test.ts` | **op-tier 派生** | v55-3 | `303` | 派生式 5/2/2 + 与 `IMPL` 一致 + 新 op 未归档 ⇒ FAIL + 逐档注入 |
| 9 | `test/proactivity-guard.test.ts` | **guardrails 常量单源** | v55-3 | `315` | 六常量单源 + 越限抑制 + 关断 + 链深度截断 + 预算非死端 |
| 10 | `test/turn-arbitration.test.ts` | 并发仲裁 | v55-3 | `311` | 用户输入零丢失 / 留痕 / 有界 / AI 撞车不发起 |

> 全部 10 门禁须由 `test/gate-integrity.test.ts` 的 `NODE_GATE_MARKER` 自动纳入 + `V55_NEW_GATE_FILES` 下界声明（`TASK-V55-112` / `216` / `320`）；`CHROMIUM_GATES === 9` **逐字不动**。

### 7.2 既有门禁升级清单（**22 项**，改写 ≠ 删除；详见 3 叶 `tasks.md`）

| # | 既有门禁 | 基线 | 升级内容 | 任务 |
|:--:|---|--:|---|---|
| 1 | `op-wiring`（node） | 7 | **原判据不改**（`requestTurn(` 恰 2）+ 增「主流程 diff = 0」复合读数（`maybeRecommend` 1/7 · `nextAfterSettle` 1） | `113` / `306` |
| 2 | `test/ui/no-dead-end.mjs` | 39 | **判据升级**：5 类阻塞不减 + 4 类已表达意图终态 + 双向反证 | `124` / `214` |
| 3 | `recommendation-sources` | — | 时机集 ≥5 含 `'answered'`；旧 4 逐字；防抖三常量逐字 | `114` |
| 4 | `test:recommendation` | 65 | `answered` 时机面（答完恰一次求值内产出 next） | `114` |
| 5 | `blocked-terminals` | 9 | 5 类逐字不变 + `OPS_RECOVERY_ROWS`/`BLOCKED_RECOVERY_TRIGGER` 零改写 | `118` / `206` |
| 6 | `next-registry` | 16 | 驱动者行登记 + `onboarding` provider 语义零改写 | `118` / `206` |
| 7 | `test:ask-auth` | 71 | describe 驱动 + 迟到作答固化 | `118` |
| 8 | `l1-ref-validity` | — | 「裁决 + 驱动」+ `commandSends` 消费面登记 | `115` |
| 9 | `test:l1` / `test:page-input` | 116 / 108 | `applyRefAction` 有效 ⇒ 驱动的等价重锚 | `115` / `118` |
| 10 | `ask-bridge` | — | 迟到作答 `{settled:false, late:true}` 路径 | `117` |
| 11 | `test:law8` | 25 | 引导路径零明文 + 留痕三要素零明文 | `118` / `209` / `313` |
| 12 | `test:stream` | 73 | 系统行 / 留痕 / 关断面断言 | `209` |
| 13 | `capability-wiring` | — | `.request(` 语义等价保留（计数不减） | `304` |
| 14 | `sw-op-mirror` | 5 | 三档清分加固 | `304` |
| 15 | `op-protocol` | 6 | `KIND_SET` 40 逐字 | `315` |
| 16 | `host-registry` | — | 零宿主（`REGISTERED_STRUCTURAL_HOSTS === []`）不变 | `315` |
| 17 | `test:journey` | 171 | **保段优先**（段内零字节 / 段外逐行登记） | `317` |
| 18 | `test:binding` | 192 | **保段**（`decision=keep`）+ 段外逐行登记 | `318` |
| 19 | `test:l0` / `test:density` | 248 / 242 | 数显 / 阈值逐字不动 | `317` / `319` |
| 20 | `test:supersession` | 36 | X-SELF-1~7 条目 + `knownGap` 一致性 + 保护段处置 | `118` / `125` / `216` / `320` |
| 21 | `test:gate-integrity` | 15 | `+ V55_NEW_GATE_FILES`（≥6）+ 受审集合只增 + `CHROMIUM_GATES === 9` 逐字 | `112` / `216` / `320` |
| 22 | `size-*` / `test:size-ruling-vol3` | 12 | 五要素重登记（时间线只追加）+ 三值同源 + 跨档位显式登记 | `125` / `216` / `319` |

### 7.3 26 门禁基线守恒（**只增不减**，`npm test ≥1181`）

`npm test` 1181 · `law8` 25 · `dead-end` 39 · `auth-chip` 37 · `l0` 248 · `density` 242 · `journey` 171 · `binding` 192 · `stream` 73 · `ask-auth` 71 · `recommendation` 65 · `page-input` 108 · `zero-injection` 28 · `supersession` 36 · `gate-integrity` 15 · `design-contract` 19 · `size-ruling-vol3` 12 · `insight` 118 · `hardening` 24 · `l1` 116 · `l2` 74 · `l1-reverse` 9 · `l2-reverse` 10 · `ref-pick-wiring` 11 · `CHROMIUM_GATES` **=== 9** · `e2e` PASS。**唯一例外** = 保护段按台账**显式取代**并留痕（`modifiedRanges[]` + `redlineRemap[]` + 计数守恒 ≥171 + RP-V4-08 反证）。

---

## 8. 停机规则（**10 条**）

| # | 触发 | 动作 |
|:--:|---|---|
| 1 | `dist/content.js` ≠ **177,076 B** / `52a82620…` 或 `dist/pick-layer.js` ≠ **34,358 B** / `77796bab…` | **立即停机**（N-SELF-001/002 零容差） |
| 2 | `manifest.json` 出现任何 diff | 停机（N-SELF-007 / T4） |
| 3 | `KIND_SET` 内容新增任一字符串 | 停机（N-SELF-008；改走 `chat-result` payload `variant`） |
| 4 | 12 kind 常量被扩展 / `REGISTERED_STRUCTURAL_HOSTS ≠ []` | 停机（N-SELF-009） |
| 5 | 判定链（`policy.ts`/`auto-authorize.ts`）内容哈希变化 | 停机（N-SELF-006 / T3） |
| 6 | `SG-V55-01` 结论 = 不可行且未获批 X-SELF-1/2 显式放宽 | **停机上报**（禁静默放宽 `requestTurn(` 计数 / `RecommendTrigger` 判据） |
| 7 | 反证恒绿（注入后仍 PASS） | 停机；重写注入点（FR-SELF-111） |
| 8 | 体积越**绝对上限**或静默改档位 / `authorConfirmation` | 停机（硬墙）；升档须**显式**登记（ADR-V55-011） |
| 9 | 任一门禁计数 < 基线（除保护段显式取代且已留痕） | 停机；还原并重锚 |
| 10 | `SG-V55-02/03/04/05` 结论 = 不可行 / 需上报 | 被闸门任务**不得开工**（见 `blockers`） |

---

## 9. 二维时序：build / review / validate 策略（**设计在 build 前可启动**）

> 编排器要求：review / validate 策略**在 build 前**即设计完成（不等到实施后补），形成「叶内波次（横轴） × 三阶段（纵轴）」二维时序。

### 9.1 三阶段在每叶的时序

| 叶 | build（波内） | review（叶收口前） | validate（叶收口） |
|---|---|---|---|
| **v55-1** | `W01`(声明单源+SG-01) → `W02`(机核) → `W03`(时机/答案) → `W04`(S0/门禁/收尾) | 判据真空审查（法七扩展**禁恒真**三段控制）+ 半驱动者复辟审计（`maybeRecommend` 1/7）+ 注入反证完整性 | S0 node/Chromium 双面实跑 + 26 门禁守恒对账 + 保护段双绿 + 漂移检测 |
| **v55-2** | `W05` → `W06` → `W07` → `W08` → `W09` | 双源一致性（`llm.unconfigured`）+ 悬置单源（第二处 ⇒ FAIL）+ 零 LLM 调用审计 + 零视图切换 | 两场景实跑 + S0 分支 B 必判项实跑 + `law8`/`stream`/`ask-auth` 计数对账 |
| **v55-3** | `W10`(清分+SG-03) → `W11`(按下) → `W12`(仲裁+SG-04) → `W13`(护栏) → `W14`(收口+SG-05) | 安全边界审查（R-SELF-001 最高危：越档 / 代答 consent）+ 护栏空转审计（越限真抑制）+ 仲裁有界性 | 全 Feature 全门禁串行 + `e2e` PASS + 体积终轮 + 保护段 + 台账 + 人工面逐项标注 |

### 9.2 review 前置判据（build 前已钉死）

1. **禁恒真**：每条新判据必须可注入违反面（法七扩展「已答」四口径 + 三段控制）。
2. **禁空转**：护栏六常量必须「既声明又被判」（越限抑制断言 + 反证）。
3. **禁纸面**：三档清分必须**派生式**（改 `layer`/`consent` ⇒ 清分同步变，结构性不可能脱钩）。
4. **禁假绿**：S0 必须逐环节可判（不得用假 provider 跳过真实驱动路径）。

### 9.3 validate 前置判据（build 前已钉死）

| 判据 | 检查 |
|---|---|
| EXIST | 产物存在 + 无 TODO / 桩 |
| SUBSTANCE | 非空实现 + 长度阈值 + 关键路径覆盖 |
| ANTI-PATTERN | 反模式检测 + 反证恒绿检测 |
| WIRING | 接线真实（无孤岛）+ 门禁受审集合 + 计数只增 |
| DRIFT | 契约漂移检测（含 `IMPL` ↔ 清分、`providers` ↔ `DRIVERS`、保护段 pin） |

---

## 10. 每叶验收门禁清单（摘要；逐项见各叶 `tasks.md §5`）

- **v55-1**（W4 收口 `125`）：`typecheck` · `build` · `npm test ≥1181` · `op-wiring`（`requestTurn(` 恰 2）· `next-dispatch-diff0`(14) · `blocked-terminals`(9) · `recommendation-sources` · `l1-ref-validity` · `ask-bridge` · `test:dead-end ≥39` · `test:recommendation ≥65` · `test:ask-auth ≥71` · `test:l1`(116) / `test:page-input`(108) · `test:law8 ≥25` · `test:stream ≥73` · `test:supersession ≥36` · `test:gate-integrity ≥15` · `size-*` + `test:size-ruling-vol3`(12) · **新 6 门禁**（时机源 / 四元组 / 终态词汇 / S0 双面 / 法七扩展）· `design-contract`(19)
- **v55-2**（W5 收口 `216`）：`typecheck` · `build` · `npm test ≥1181` · `blocked-terminals`(9) · `next-registry ≥16` · `ask-bridge` · `test:ask-auth ≥71` · `test:stream ≥73` · `test:law8 ≥25` · `test:recommendation ≥65` · `test:dead-end ≥39` · `s2-deadend-chain`(6) · **S0 双面（分支 B 必判项）** · **新主题① 门禁** · `test:supersession ≥36` · `test:gate-integrity ≥15` · `size-*` + `test:size-ruling-vol3`(12)
- **v55-3**（W5 收口 `320`）：`typecheck` · `build` · `npm test ≥1181` · `op-wiring`（仍恰 2）· `local-act-wiring` · `authorize-chip-wiring` · `capability-wiring` · `sw-op-mirror ≥5` · `op-protocol ≥6` · `test:auth-chip ≥37` · `test:l0 ≥248` / `test:density ≥242` · `test:journey ≥171`（保段优先）· `test:binding ≥192`（保段）· `test:stream ≥73` · `test:ask-auth ≥71` · `test:dead-end ≥39` · `test:insight`(118) / `hardening`(24) / `l1`(116) / `l2`(74) / `l1-reverse`(9) / `l2-reverse`(10) / `ref-pick-wiring`(11) / `page-input`(108) / `zero-injection`(28) / `design-contract`(19) · `e2e` PASS · **新 3 门禁**（三档清分 / 护栏 / 仲裁）· `test:gate-integrity ≥15`（`CHROMIUM_GATES === 9`）· `size-*` + `test:size-ruling-vol3`(12) · `test:supersession ≥36`

---

## 11. 未落地 / 待测点（禁预填）

| # | 主题 | 状态 | 归属任务 | 规则 |
|:--:|---|---|---|---|
| V55-P-001 | 体积净增最终值 + 是否触发档位上调 | `pending-measurement` | `319` | 禁预填（FR-SELF-124）；二态显式（越档位 ⇒ 升档登记 / 未越 ⇒ 如实登记） |
| V55-P-002 | journey 保护段「保段 or 八步取代」实际结论 | `pending-measurement` | `317` | 禁预填；须显式二选一（保段优先） |
| V55-P-003 | 人工面清单（主动接手体感 / 是否被打断 / 引导文案可读性 / 主动回合等待感 / 读屏 / 双主题 / 320px / 键盘 / 真机 S0 走查） | `pending-human` | `320` | 逐项 `⏳` / `PASS`，不得冒充 PASS（AC-SELF-025）；**v5 人工面 9 项零改写** |
| V55-P-004 | V3-VOL-3 档位升档的作者一句外部确认 | `pending-author-line` | `319` | 不得伪称已确认（N-SELF-004） |
| V55-P-005 | `commandSends` 保留登记 vs 退役 | `resolved-plan`（保留 + 显式登记，COR-1 口径） | `115` | 二选一显式，无第三态 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（F-33 父任务总览：**3 叶 × 14 波 × 61 任务**（`TASK-V55-101~125` / `201~216` / `301~320`）+ 波次总表 + 三叶任务索引 + 跨切红线（`N-SELF-021~026` / `X-SELF-1~7` / `T1~T12`）→ 任务映射 + **体积预算逐叶分摊（Σ 17,800 / 上界 22,900 ≤ 27,480）+ 波内登记点** + 共享面「恰一次」登记 + **S0 三层接线落点** + 5 个 spikeGate + **新增 10 门禁 / 升级 22 门禁清单** + 26 门禁守恒 + 停机规则 10 条 + build/review/validate 二维时序。**本轮只做 tasks**：零 `src`/`test`/`dist`/`docs`/`design`/ROADMAP 改动；未跑门禁 / 构建 / Chromium；未调用任何受管 Provider（routing.v1 = `local_or_compute → none`） | 2026-09-22 | SDDU Tasks Agent |
