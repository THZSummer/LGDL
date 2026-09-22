# ADR-V5-011: 体积预算（24,926 B 分配 + 越限预案）

## 状态
ACCEPTED

## 背景

现状实测（本轮只读复核，引自已入库产物）：

| 量 | 值 | 来源 |
|---|---|---|
| `dist/sidepanel.js` 基线 | **498,521 B** | `test/size-baseline.ts:301 SIDEPANEL_BASELINE_BYTES` |
| 生效上限（公式） | **523,447 B** = `floor(498,521 × 1.05)` | `test/size-budget.test.ts:53` |
| **余量（单轮容差 5%）** | **24,926 B（+5.00%）** | F1 |
| 距档位 | **13,479 B**（档位 **512,000 B**） | `docs/v4-supersession-ledger.json#v3Vol3Closeout` |
| 绝对上限 | **563,200 B**（= 档位 × 1.10） | 同上 |
| `SIDEPANEL_CEILING_CAP` | `record-only`（**不设自缚装置**） | `size-baseline.ts:355` |
| `authorConfirmation.status` | `pending-author-line`（**不得伪称已确认**） | 同上 |
| `dist/content.js` / `dist/pick-layer.js` | 177,076 B / 33,900 B | 红线，零容差 |

本 Feature 新增面（注册表 + 管线 + 9 op + 掩码 / 表单扩形 + 状态栏 chip + `data-narrow` + 双门禁）**可能越限**（R-ALLN-001 / R-ALLN-910）。FR-ALLN-130~134 要求先评估后落地。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 先给分配预算表 + 越限分级预案，再排落地**（选） | 预算前移；越限路径口径明确；不做自缚 cap | 与 V3-VOL-3 纪律一致；可回退边界清楚 | 预算是估计（实测可能偏离） |
| B 先实现，越限再登记 | 迭代快 | 违「禁止在预算未评估前排全量落地」（FR-ALLN-134）；越限时已无可回退 |
| C 本轮就把档位上调到 563,200 | 「一劳永逸」 | 静默放宽上限（NG-ALLN-009 / N4）；且无实测依据（V3-VOL-3 要求实测值驱动） |

## 决策

**采用 A**。三部分：

### 1. 净增分配预算表（**仅 `sidepanel.js`**；SW-only 模块为 0）

| # | 项目 | 载体 | 预算 (B) | 归属叶 |
|---|---|---:|---|
| 1 | Definition（接口 / `NEXT_SERVICES` / `NEXT_MODES` / `MOUNT_MODE` / `BLOCKED_TERMINALS`） | `next-registry/definition.ts` | 600 | v5-1 |
| 2 | Provider（`validate` / `topoByDeps` / `resolveOrder` / `register`/`unregister`/`overwrite`） | `next-registry/registry.ts` | 2,400 | v5-1 |
| 3 | Consumer + 管线（`runOp` / `pendingOps` 队列 / 快照回滚）+ `handleCardAction` 瘦身**净变化** | `pipeline.ts` + `dispatch.ts` + `sidepanel.ts` | 3,100 | v5-1 |
| 4 | 9 op 执行体（**净**：主体复用既有单一入口调用） | `next-registry/ops.ts` | 3,400 | v5-2 |
| 5 | 证明义务表 + 一致性校验 | `next-registry/obligation-table.ts` | 900 | v5-1 |
| 6 | 4 内置 provider 迁移（`recommend.ts` 重构**净**） | `next-registry/providers.ts` + `recommend.ts` | 1,400 | v5-1 |
| 7 | `askuser` 扩形（`secret` / `form` 渲染 + 提交） | `cards/askuser.ts` + `sidepanel.ts` | 1,800 | v5-2 |
| 8 | `error` 出生恢复区 | `cards/error.ts` + `stream-model.ts` | 700 | v5-3 |
| 9 | 授权态下移（`#auth-state` 写入 + 两态 + 管理详情 view；**净**） | `statusbar.ts` + `view-model.ts` + `index.html` + `risk-rail.ts` | 1,600 | v5-3 |
| 10 | `data-narrow`（`ResizeObserver` + 样式块） | `sidepanel.ts` + 样式 | 500 | v5-3 |
| 11 | 密度台账 / 等价重锚（运行时净） | 各模块 | 200 | v5-3 |
| 12 | 胶水 / 未归因（`Σ 逐模块 Δ + 未归因 == 登记增量` 的右侧项） | — | 1,000 | 各叶 |
| | **Σ 预算** | | **17,600** | |
| | **预留下界余量** | | **7,326** | |

- 结论：**预算 Σ 17,600 B < 余量 24,926 B**，且 < 距档位 13,479 B 的**组合边界**（24,926）⇒ **预期不触发档位上调**（但仍须实测复核）。
- **不进 `sidepanel.js` 的模块**：`src/background/op-protocol.ts` / `op-executors.ts`（SW bundle）、`src/shared/op-table.ts`（被 SW 与 panel 双方 import ⇒ 计入 panel，已在 #3 内）、全部测试文件（`test/**` 编译进 `dist-test`，不进产物）。
- **零增长红线**：`dist/content.js` 177,076 B / `dist/pick-layer.js` 33,900 B 逐字节（ADR-V5-003）。

### 2. 越限分级预案（V3-VOL-3 纪律）

| 情形 | 动作 |
|---|---|
| 实测 Δ ≤ 24,926 B（≤5%） | **五要素重登记**：`previousBaselineBytes`→`newBaselineBytes`、日期、来源、理由、历史保留（`SIDEPANEL_BASELINE_BYTES_TIMELINE` 只追加）+ metafile 逐模块归因；档位 512,000 / 绝对上限 563,200 **不变**；`authorConfirmation.status` 保持 `pending-author-line` |
| 24,926 < Δ ≤ 38,405（越 5% 但新基线仍 < 512,000） | 同上重登记 + **显式登记「越 5% 轮内软纪律」**（说明原因）；**禁止**静默放宽上限 / **禁止**引入新 cap |
| newBaseline > 512,000（越档位） | 触发**档位上调义务**：显式登记 + `authorConfirmation` 走**占位规则**（**不得伪称已确认**）；绝对上限 563,200 不变 |
| newBaseline > 563,200（越绝对上限） | **停机上报**（硬墙）；不得自行放宽 |
| 任意情形 | `SIDEPANEL_CEILING_CAP === 'record-only'` 保持不变；**不设自缚装置**（NG-ALLN-009） |

### 3. 若实测逼近预算的**减体积优先级**（不新增依赖）

1. `op.help` 的可达 op 列表复用既有 `notice` / 系统行文案构造，**不新建字符串表**；
2. 确认注册表**视察器**（设计稿 `#reg-inspector` 为**非交付 UI**）**不进产品**（若误引入即移除）；
3. op 描述与义务表**共用同一常量对象**（避免两份字符串）；
4. `data-narrow` 样式复用既有窄屏样式块（不新建样式语言）；
5. 最后手段：把 `op.help` 的候选列表降级为「按注册表 `when(ctx)` 派生的计数 + 既有帮助分区入口」（仍在流内闭环，但更省字节）——**须先回父规范登记**。

## 后果

**正面**：预算前移（纪律 §16 第 9 条）；越限路径口径明确；不做自缚 cap；回退边界清晰。

**代价 / 风险**：预算是**估计**（Σ 逐模块 Δ + glue 的实测才是权威）；若某项超预算，按「越限分级预案」处理；R-ALLN-910（体积评估被跳过）由本 ADR 机制化阻断。

## 影响 FR

FR-ALLN-130 / 131 / 132 / 133 / 134；NFR-ALLN-005；N3 / N4；AC-ALLN-022 / 023。

## 回滚

预算表与预案本身**零字节**（纯文档）。若实测证明预算严重失真，则**修订本 ADR**（新增 `v5.1` 修订行）并追加新预算，**不删除**旧预算（历史只追加）。

## 修订注（v5.1 · 订正注，2026-09-22）

> **性质**：本节是**加注**，不改写上方正文（§2 越限分级预案第 3 行「绝对上限 563,200 不变」逐字保留，历史只追加）。

**订正对象**：§2 第 3 行「`newBaseline > 512,000`（越档位）⇒ … 绝对上限 563,200 不变」。
**实测事实**：本叶（`specs-tree-v5-2-ops-first-batch`）两轮实测把基线推至 535,821 B，越过 512,000 档位 ⇒ 触发档位上调义务；实现把**档位**升至 `ceilTo50KB(535,821) = 563,200`，并把**绝对上限**由档位同源推导为 `563,200 × 1.10 = 619,520`（生效上限 = `min(619,520, floor(535,821 × 1.05)) = 562,612`）。

**派生关系（订正口径，本文为准）**：

| 量 | 值 | 派生式 |
|---|---|---|
| 档位 `tierBytes` | 563,200 | `ceilTo50KB(newBaselineBytes)` |
| **绝对上限** `absoluteCeilingBytes` | **619,520** | `tierBytes × 1.10`（**由档位派生，不独立于档位**） |
| 生效上限 `ceilingBytes` | 562,612 | `min(absoluteCeilingBytes, floor(newBaselineBytes × 1.05))` |

**为何先前的「绝对上限不变」不再自洽**：旧文把绝对上限写成 563,200（= 旧档位的 1.10× 之半）而非「档位的函数」，于是「档位上移而绝对上限不动」会让新档位（563,200）**恰好等于**绝对上限 —— 生效上限被压回档位本身，`×1.10` 的硬墙失去意义。订正后的口径保持 §2 的本意（档位上调**不得**顺势解除硬墙）：绝对上限始终是**档位 × 1.10**，随档位上移而派生上移，且 `SIDEPANEL_CEILING_CAP === 'record-only'` 与「不设自缚装置」（NG-ALLN-009）均未变。

**机核**：`test/size-ruling-vol3.test.ts` 逐条复算三值同源（`newBaselineBytes === SIDEPANEL_BASELINE_BYTES`、`tierBytes === ceilTo50KB(newBaseline)`、`absoluteCeilingBytes === round(tier × 1.1)`），`authorConfirmation.status` 保持 `pending-author-line`（**占位，不伪称已确认**）。
