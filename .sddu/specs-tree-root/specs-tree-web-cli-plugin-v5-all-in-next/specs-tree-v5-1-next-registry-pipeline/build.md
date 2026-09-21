# 构建报告：specs-tree-v5-1-next-registry-pipeline（R1 = TASK-V5-101~113 · R2 = TASK-V5-114~122）

> **文档定位**: SDDU 构建报告 — 记录本轮任务的文件变更、实现结果与门禁读值，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md`（22 任务 / 5 波）、`plan.md`（ADR-V5-001/002/008）、父 `spec.md`（FR-ALLN-030~038 / 055~059 / 010·011·013 / 100~103 / X3·X4·X6-chip）
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-22
> **版本**: v1.1（R1 + R2 全量）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-22
> **更新说明**: R2 收口 —— 追加 TASK-V5-114~122（diff0 门禁 / X3 三处重锚对账与前移 / 义务表 9 行 + 机核 / 双契约 G 127 入册 / `BLOCKED_TERMINALS` 单源与常驻候选 / 体积 Δ=0 / 全门禁串行收口）；R1（101~113）内容逐字保留

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **22 / 22**（R1 = 101~113 共 13 项；R2 = 114~122 共 9 项） |
| 复杂度分布 | S×2（106 spike / 112） / M×15（101~104 / 107~111 / 114 / 116 / 117 / 119 / 120 / 121） / L×5（105 / 113 / 115 / 118 / 122） |
| 新增文件 | 6 源码（`next-registry/`） + 6 测试/口径模块 = **12 个** |
| 修改文件 | **12 个**（3 源码 + 6 测试 + 测试底座 1 + 2 台账） |
| 体积 | `dist/sidepanel.js` **507,315 B**（R1 Δ = **+8,794 B**；**R2 Δ = 0**；本叶预算 8,800 B，余 6 B） |
| 红线冻结面 | `content.js` 177,076 B / `52a82620…`、`pick-layer.js` 33,900 B / `5f567d7e…` **逐字节不变** |
| 产品 `src/**` 修改面 | R2 = **零修改**（仅新增 `obligation-table.ts`，且**不在 bundle graph 内** ⇒ 产物零字节） |

---

## 2. 文件变更

### 2.1 R1（TASK-V5-101~113）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/next-registry/definition.ts` | 101 | Definition（`NEXT_SERVICES`/`NEXT_MODES`/`NEXT_MOUNT_POINTS`/`MOUNT_MODE`/`BLOCKED_TERMINALS`(5)/`NextCtx`(7 源)/`NextProvider`/`NextOp`） |
| NEW | `src/ui/sidepanel/next-registry/registry.ts` | 102/103/104 | `validateNextProvider`（loud）+ `topoByDeps`/`resolveOrder`（列表位置置换不变）+ `registerNextProvider`（幂等 unregister / overwrite 整行替换 / `REGISTRY` 单点写入） |
| NEW | `src/ui/sidepanel/next-registry/providers.ts` | 105 | 4 内置 provider（5 P0 恢复 + onboarding/ref-action/capability-discovery），旧 `recommend.ts` 规则表等价迁移 |
| NEW | `src/ui/sidepanel/next-registry/pipeline.ts` | 107/108/109/110 | `runOp` 四态 + `pendingOps` FIFO 仲裁 + 快照/回滚语义位 + R5 失败三级 + `OPS_BY_ID`(6) + `bindPanelOps` |
| NEW | `src/ui/sidepanel/next-registry/dispatch.ts` | 111 | `ACT_TO_OP`(6) + `OP_TO_ACT` + `SET_A_PROTOCOL_ACTIONS`(8) + `dispatchChipAction`（一次查表零 per-op 分支） |
| NEW | `test/next-registry.test.ts` | 102/103/104 | R1~R7 单测骨架 + 置换/幂等/覆盖/loud + 反证（16 用例） |
| NEW | `test/next-pipeline.test.ts` | 107~113 | 管线四态 / FIFO / 快照回滚 + `ACT_TO_OP`/两集 + per-op 分支=0 + `op.execute(` 恰 1 调用点 + `data-op`（15 用例） |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 105 | 常量逐字保留；规则求值委托注册表；`RECOMMEND_MODULE_WHITELIST` 纳入 4 个注册表模块 |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 113 | `handleCardAction` 两集改造（集 A 8 项保留 / 集 B 7→1 次 `dispatchChipAction`）+ `bindPanelOps` 接线 |
| MODIFY | `src/ui/sidepanel/cards/nextstep.ts` | 112 | chip 增 `data-op`（= `ACT_TO_OP[act]`）；`data-act` 降渲染别名 |
| MODIFY | `test/local-act-wiring.test.ts` | 113（预迁移 115） | 本地 act 判据从「`if (action === 'x')` 分支体」等价重锚为「`bindPanelOps` op 槽 → 单一入口」 |
| MODIFY | `test/authorize-chip-wiring.test.ts` | 113（预迁移 115/148） | 授权 chip 判据等价重锚为 op 槽 + `ACT_TO_OP.authorize` 同源 |
| MODIFY | `test/size-baseline.ts` / `test/size-budget.test.ts` / `test/size-growth-evidence.test.ts` / `test/size-ruling-vol3.test.ts` | 121（中间轮） | 五要素重登记 498,521 → **507,315**；ceiling 523,447 → **532,680**；`groups.length` 15→16；`FR-ALLN-*` regex |
| MODIFY | `docs/v4-density-baseline.json` / `docs/v4-supersession-ledger.json` | 121 / 台账 | 体积基线同源前移 + 活指针 `newTitle` 前移（39 处）+ 各叶段 `registeredUncoveredLines` 复算 |

### 2.2 R2（TASK-V5-114~122）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/next-registry/obligation-table.ts` | 116 | 证明义务表：`OP_SPECS`（9 op × 四要素，**单一常量对象**）+ `OBLIGATION_ROWS`（派生）+ 表尾明示义务（`diff = 0`）+ `unmappedOpIds`/`assertObligationCoverage` 校验钩子。**不在 bundle graph 内**（只被门禁与 v5-2 读）⇒ 产物零字节 |
| NEW | `test/next-dispatch-diff0.test.ts` | 114 | 集 B 零 per-op 分支 + 唯一分发入口 + `ACT_TO_OP` 单源 + 四操作哈希不变 + 集 A/B 互斥 + 不得回读 `data-act`；6 条 judgement / 14 用例 / 6 组反证 |
| NEW | `test/next-obligation-table.test.ts` | 117 | 五项一致性（行数·opId 集 / 四要素非空 / 模式派生 / chips 无悬空 / 表尾义务）+ 三类注入反证（多一行 / 多一 op / chips 悬空）+ 零重复字面量；5 条 judgement / 10 用例 |
| NEW | `test/blocked-terminals.test.ts` | 120 | `BLOCKED_TERMINALS`「声明恰一次」跨源扫描（含唯一双射点例外）+ `site.unauthorized` `when` 去 `firstRun`（静态 + 动态双证）+ 阻塞类 ↔ P0 provider 完备单射 + 未闭合项登记自紧；4 条 judgement / 8 用例 / 4 组反证 |
| NEW | `test/g-design-map.ts` | 118/119 | G 契约数据模块：`G_SHIM_SHA256` / `G_DRAFT_SHA256` / `G_SHIM_CHECK_CALLS = 127` / `G_SHIM_CHECK_DECLARATIONS = 1` / `G_ASSERTION_GROUPS`(A~N 14) / **`G_ASSERTION_MAP`（127 行，clause 取自 shim 断言原文，owner 按组归属）** |
| MODIFY | `test/design-contract.test.ts` | 118/119 | **纯追加**：共享 helper `draftContractProblems()` + `F_CONTRACT`（复用 R1 冻结的 4 常量 / 60 行映射，**F 侧零改**）+ `G_CONTRACT` + 8 个 G/F 新 test 块（实跑 / sha / 计数口径 / 127 行映射 / 卡分类学 / 混池防御）+ `designContractChanges` 五要素机核（6 → **19** 用例） |
| MODIFY | `test/recommendation-sources.test.ts` | 115 | X3 形态①：act 闭集 → **opId 集**等价重锚（加严，零降级）+ 源白名单 7 项零扩项 + `NextCtx` 键集 == 白名单 + 双采集等价；+3 用例 |
| MODIFY | `test/local-act-wiring.test.ts` | 115 | X3 形态③④：`X3_RECONCILIATION`（旧→新判据 4 条逐条登记，`leaf: v5-1`）+ act → opId → op 槽 → 单一入口 → 义务表**同源链**判据 + 反证；+2 用例 |
| MODIFY | `test/authorize-chip-wiring.test.ts` | 115 | X3 形态④：authorize 的 opId 同源链 + 三条反证（映射缺失 / 槽离开单一入口 / 权限请求多一处）；+2 用例 |
| MODIFY | `test/gate-integrity.test.ts` | 114/117/119/120 | 受审集合**只追加** 4 条新 node 门禁路径 + `V51_NODE_GATE_FILES` + 新 test 块（marker 自动发现 + `CHROMIUM_GATES === 9` 不动）；13 → **14** 用例 |
| MODIFY | `test/ui/recommendation.mjs` | 115 | ⑮ 新段（**纯追加**）：chip `data-op`（opId）与 `data-act`（渲染别名）**双采集一致** + 零悬空 opId（∈ 首批 9 op）+ `#stream [data-op]` 选择器锚 + 门禁映射表同源；运行期 59 → **66** |
| MODIFY | `docs/v4-supersession-ledger.json` | 115 / 119 | `designContract.designContractChanges`：`[] → [G 条目五要素]`；`modifiedRanges[]`：追加 4 条 **equivalent-rewrite** 登记（`oldId` / `reason ≥40` / `leaf: v5-1` / `deletedLines: 0`） |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V5-101 | `definition.ts` 三件套 + 常量单源 | M | ✅ completed | FR-ALLN-030/031/033/035 |
| TASK-V5-102 | `validateNextProvider` + loud + 单测骨架 | M | ✅ completed | FR-ALLN-031/033/035 |
| TASK-V5-103 | `topoByDeps` + `resolveOrder` | M | ✅ completed | FR-ALLN-031/032 |
| TASK-V5-104 | 可逆注册（幂等 / 覆盖 / 单点写入） | M | ✅ completed | FR-ALLN-030/032 |
| TASK-V5-105 | 4 内置 provider（规则等价迁移） | L | ✅ completed | FR-ALLN-030~038/013 |
| TASK-V5-106 | **spikeGate-1**（G shim 127 抽取 + 混池防御预证） | S | ✅ completed（结论入 §4） | FR-ALLN-100/101 |
| TASK-V5-107 | `runOp` 四态骨架 | M | ✅ completed | FR-ALLN-055/034① |
| TASK-V5-108 | `pendingOps` FIFO + `MAX_OPEN_ASKS` 仲裁 | M | ✅ completed | FR-ALLN-055 / EC-ALLN-010 |
| TASK-V5-109 | 快照 · 回滚语义位（多表） | M | ✅ completed | FR-ALLN-034③ / EC-ALLN-011 |
| TASK-V5-110 | R5 失败三级 + `op.execute(` 恰 1 调用点 | M | ✅ completed | FR-ALLN-034/035 |
| TASK-V5-111 | `ACT_TO_OP`(6) + `dispatchChipAction` | M | ✅ completed | FR-ALLN-056/057/058 |
| TASK-V5-112 | chip `data-op`（`data-act` 降别名） | S | ✅ completed | FR-ALLN-057 |
| TASK-V5-113 | `handleCardAction` 两集改造（集 B 7→1） | L | ✅ completed | FR-ALLN-058/059 |
| TASK-V5-114 | `next-dispatch-diff0`（零 per-op 分支 + 四操作哈希不变） | M | ✅ completed | FR-ALLN-058 / AC-ALLN-005 |
| TASK-V5-115 | X3 三处门禁等价重锚 + 对账 + 反证 | L | ✅ completed | FR-ALLN-112 / 120 / 121 |
| TASK-V5-116 | `obligation-table.ts` 9 行四要素 + 表尾义务 | M | ✅ completed | FR-ALLN-036 |
| TASK-V5-117 | 义务表一致性机核 + 三类注入反证 | M | ✅ completed | FR-ALLN-037 / 036 |
| TASK-V5-118 | 双契约：F 逐字保留 + G 4 常量 + 127 行映射 | L | ✅ completed | FR-ALLN-100 / 101 |
| TASK-V5-119 | G 侧 test 块 + `designContractChanges` 登记 | M | ✅ completed | FR-ALLN-101 / 102 / 103 |
| TASK-V5-120 | `BLOCKED_TERMINALS` 单源 + `site.unauthorized` 去 `firstRun` | M | ✅ completed（chip 缺口见 §7-①） | FR-ALLN-010 / 011 / 013 |
| TASK-V5-121 | 体积五要素（本叶增量）+ 红线逐字节复核 | M | ✅ completed（Δ = 0） | FR-ALLN-130 / 131 / 133 |
| TASK-V5-122 | 本叶收尾：全门禁串行 + 计数只增对账 + TREE/state | L | ✅ completed | FR-ALLN-003 / 004 / 120~125 |

---

## 4. SG-1 结论（TASK-V5-106，只读探针，未落版本库）

探针脚本 `/tmp/opencode/v5-spike/g-shim-probe.mjs`，日志 `/tmp/opencode/v4-gate-logs/v5-1-r1/w1-spike-g-shim.log`。

- **sha 双命中**：`option-g-shim.mjs` = `d0107ecbbd56edfe19592e256a66d27fb3d1c5c1a2d87c1773364f4520e609ce` ✓；`option-g-all-in-next.html` = `a7c0a77ac6253e32d1ccef894f32eb8d0dc2d10c99f145261a69ebc699cc83c9` ✓。
- **实跑**：`node option-g-shim.mjs` 退出码 0，输出 `127 passed / 0 failed`（共 127 条）。
- **计数口径**：`check(` 子串 **128** / 声明 **1** ⇒ 调用 **127** ✓。
- **id 抽取**：`/check\('([A-Z]\d+)/g` ⇒ **127** 项 / **14** 组（A6 B5 C8 D6 E7 F11 G8 H7 **I17** J5 K3 L4 **M23** N17）✓；118 的 `G_ASSERTION_MAP` 即按此序列落表。
  - ⚠️ **登记偏差（已由 118/119 按 SG-1 处置）**：`ADR-V5-008` 给的 `^check\('([A-Z]\d+)\s` 正则带 `\s` 尾锚，会漏掉 10 条无尾空白调用 ⇒ 只得 **117**（分组 I9/M21）。118 落地时**采用不带 `\s` 的抽取**，并在门禁内把它变成**可红的事实**（断言带尾锚正则仍只得 117 —— 防后人「顺手」改回草案形态）。
- **R-ALLN-909 混池防御关键发现**：F id 集（60，`A1`~`I1`）∩ G id 集（127，`A1`~`N17`）= **51 项，非空**。⇒ 混池防御**不得**依赖「id 集互斥」，落地形态 = **两侧各自独立计数 + 各自 `test` 块 + 共享 helper 各调用一次**（118 已实跑：注入一侧 ⇒ 只红该侧，另一侧仍绿）。

---

## 5. 门禁复跑 vs 基线（R2 全量串行；日志 `/tmp/opencode/v4-gate-logs/v5-1-r2/`）

| 门禁 | 基线 | R1 | **R2 实测** | 结论 |
|------|:--:|:--:|:--:|:--:|
| `npm test`（node，含全部 node 门禁） | 1045 | 1076 | **1129** | ✅ 只增（+84 vs 基线） |
| `test:supersession` | 35 | 未跑 | **35** | ✅ 持平（`designContractChanges` + `modifiedRanges` 追加后仍绿） |
| `test:gate-integrity` | 13 | 未跑 | **14** | ✅ 只增（受审集合只追加 4 条新门禁） |
| `test:design-contract` | 6 | 未跑 | **19** | ✅ 只增（F 6 逐字保留 + G 侧 13） |
| `test:size-ruling-vol3` | 12 | 未跑 | **12** | ✅（cap record-only / 档位 512,000 / 绝对上限 563,200 / `authorConfirmation` 未动） |
| `size-budget` | 16 | 未跑 | **16** | ✅ |
| `size-growth-evidence` | 17 | 未跑 | **17** | ✅ |
| `test:l0` | 244 | 244 | **244** | ✅ |
| `test:l1` | 116 | 116 | **116** | ✅ |
| `test:l2` | 74 | 74 | **74** | ✅ |
| `test:density` | 232 | 232 | **232** | ✅（28 格 + 几何下界 488px 面未动） |
| `test:ui`（journey） | 171 | 171 | **171** | ✅（journey 保护段 pin `cc79f413…` 未改） |
| `test:binding` | 192 | 192（flake） | **192** | ✅（本轮 1 次实跑即绿；保护段 `be9ad0e9…` 未改） |
| `test:recommendation` | 59 | 59 | **66** | ✅ 只增（⑮ 新段 +7） |
| `test:stream` | 63 | 63 | **63** | ✅ |
| `test:ask-auth` | 61 | 61 | **61** | ✅ |
| `test:insight` | 116 | 未跑 | **116** | ✅ |
| `test:hardening` | 24 | 未跑 | **24** | ✅ |
| `test:page-input` | 108 | 未跑 | **108** | ✅ |
| `test:zero-injection` | 27 | 未跑 | **27** | ✅ |
| `test:ref-pick-wiring` | 11 | 未跑 | **11** | ✅ |
| `test:l1-reverse` | 9 | 未跑 | **9** | ✅（注入 → FAIL → 逐字节还原 → PASS） |
| `test:l2-reverse` | 10 | 未跑 | **10** | ✅（同上） |
| `test:e2e` | PASS | 未跑 | **PASS** | ✅ |

- **体积**：`dist/sidepanel.js` **507,315 B** ≤ 生效上限 **532,680 B**；**R2 Δ = 0**（`src/**` 零修改面 + 新模块不在 bundle graph 内）。
- **红线逐字节**：`content.js` 177,076 B / `52a82620…` ✓；`pick-layer.js` 33,900 B / `5f567d7e…` ✓；`src/content/**` 零 diff ✓；`design/**` 零 diff ✓。
- **零宿主**：`REGISTERED_STRUCTURAL_HOSTS = []` 未动；`test:recommendation` ⑧ 段 `[data-host]` 任意深度计数 = 0 ✓。

### 5.1 体积五要素终轮（TASK-V5-121）

| 要素 | 值 |
|------|-----|
| previousBaselineBytes → newBaselineBytes | 498,521 → **507,315**（R1 登记；R2 **无变化**，故不重复重登记） |
| 登记日期 | 2026-09-22 |
| 来源 | `npm run build` → `stat -c %s dist/sidepanel.js`（R2 复跑确认 507,315） |
| 理由 | R1 = 注册表三件套 + 管线 + 两集分发（+8,794 B，本叶预算 8,800 B，余 **6 B**）；R2 = 门禁 / 义务表 / 契约入册（**Δ = 0**） |
| 历史保留 | `SIDEPANEL_BASELINE_BYTES_HISTORY` / `_TIMELINE` **只追加**（`size-budget` / `growth-evidence` 门禁逐项判） |
| 逐模块归因（R2） | `Σ 逐模块 Δ + 未归因 = 0`：本轮**无新增 bundle 模块**（`obligation-table.ts` 只被门禁与 v5-2 引用；`g-design-map.ts` 属 `test/`）；登记增量 = 0 故归因表为空且算术自洽 |
| 越限判断 | Δ = 0 < 24,926 B 余量；`SIDEPANEL_CEILING_CAP_ROLE === 'record-only'` ∧ 档位 512,000 未变 ∧ `authorConfirmation.status === 'pending-author-line'`（`test:size-ruling-vol3` 逐项判） |

### 5.2 反证（本轮新 / 改判据两段证据，逐条实跑）

| 判据 | 反证注入 | 结果 |
|---|---|---|
| D0-1 集 B 零 per-op 分支 | 注入 `if (action === 'rebind')` / `if (action === 'help')` | FAIL → 还原 PASS |
| D0-2 唯一分发入口 | 追加第二处 `dispatchChipAction(` | FAIL（计数 2） |
| D0-3 `ACT_TO_OP` 单源 | 复制声明 / 删除声明 | FAIL / 计数 0 |
| D0-4 四操作哈希不变 | 追加 1 字节 | 哈希不等 ⇒ FAIL → 还原复原 |
| D0-5 集 A/B 互斥 | 把 `audit` 塞进 `ACT_TO_OP` | FAIL（交集 `audit`） |
| D0-6 不得回读 `data-act` | 注入 `getAttribute('data-act')` | FAIL（计数 1） |
| OT-1 行数 / opId 集 | 义务表多一行 / 注册表多一 op | FAIL（另存 temp 副本，仓库文件 sha 不变）/ `obligation-rows-missing` |
| OT-4 chips 无悬空 | 注入 `op.ghost` | FAIL（逐条指名） |
| OT-5 表尾义务 | 删掉 `diff = 0` 字面 | FAIL（temp 副本，仓库文件 sha 不变） |
| BT-1 声明恰一次 | 第三文件写 `site.unauthorized` / 双射点多写字面量 | FAIL |
| BT-2 `when` 去 `firstRun` | 动态：`when = firstRun && !authorized`；静态：分支塞 `firstRun` | FAIL（同一 judge 两半） |
| BT-3 阻塞类 ↔ P0 映射 | 注入第 6 类（无 provider 无登记）/ 删一行 | FAIL（`reason ≥40` / 完备性） |
| BT-4 登记自紧 | 缺 reason / status 非法 | FAIL；且 chips 一旦补上 `op.authorize` 即要求翻转登记 |
| DC G shim 冻结 | G shim **改 1 byte**（temp 副本） | FAIL（sha）→ 原样 PASS |
| DC F/G 常量互换 | F 用 G 常量 / G 用 F 常量 | 两侧各自 FAIL（冻结面不可静默替换） |
| DC 映射表 | G 映射删一行 / 调序 / owner 留空 | FAIL |
| DC 混池防御 | 一侧计数注入 | **只红该侧**，另一侧仍绿（F ∩ G = 51） |
| DC `designContractChanges` | 五要素缺一 / `before` 非 null / 多一条 / `assertions` 脱钩 | FAIL |
| X3 源白名单 | 删一条 / 增一条（`settings`） | 均 FAIL |
| X3 opId 集 | 注册表多 `op.rogue` | FAIL（无义务表行） |
| X3 同源链 | opId 映射缺失 / op 槽离开单一入口 / 权限请求多一处 | FAIL |

---

## 6. 未闭合项与偏差登记（登记，不静默）

> 本叶体积预算**已尽**（余 6 B），R2 的红线为「产品 `src/**` 零增字节」。因此下列三项**不是**「已完成」也不是「放弃」，而是**显式登记 + 机器可核的自紧条目**：任何一项在后续叶补上时，登记必须同步翻转，否则门禁红。

| # | 项 | 状态 | 机核位置 | owner |
|:--:|---|---|---|---|
| ① | **FR-ALLN-013 的 `chips 含 op.authorize`** | `pending-v5-2` | `test/blocked-terminals.test.ts` → `PENDING_ITEMS['FR-ALLN-013-chips']`（断言 reason ≥40 + 当前 chips 确实不含 ⇒ 补上即要求翻转） | `specs-tree-v5-2-ops-first-batch`（9 op 注册时 `RECOVERY_CHIP_ORDER.site` 增 `authorize` 并重登记体积） |
| ② | **`BLOCKED_TERMINALS`「声明恰一次」的唯一例外点** | 已登记例外 | `test/blocked-terminals.test.ts` → `PROVIDER_ID_LITERAL_EXCEPTION`（`providers.ts` 的两个 P0 provider id 字面量；第三处即 FAIL） | ADR-V5-009 §1 的严格形态（`providers.ts` 用 `BLOCKED_TERMINALS[i]` 派生）随 v5-2 体积重登记一并完成 |
| ③ | **`llm.unconfigured` / `perm.missing` 的修复 provider** | `pending-v5-2` | `BLOCKED_P0_MAP` 两行（`reason ≥40` 逐条） | v5-2（`op.llm-config` / `op.perm.request` 注册时补 provider，双射即 5↔5） |
| ④ | **义务表校验钩子的运行期接线** | 钩子已交付、运行期接线延后 | `obligation-table.ts#assertObligationCoverage`（门禁调用；注册表侧调用随 v5-2） | v5-2 |
| ⑤ | **`F ∩ G = 51`（id 集非空交集）** | 已按 SG-1 处置 | 门禁内断言「交集 = 51」+ 两侧独立计数 | — （不是缺口，是**必须记住的事实**：混池防御不得依赖互斥） |

**未触碰面（逐条复核）**：`src/content/**` / `KIND_SET` / `manifest.json`（零 diff）/ 判定链（`policy.ts` / `auto-authorize.ts`）/ 12 卡类型学 / 三区法则 / `design/**`（零 diff）/ ROADMAP.md（零 diff）/ `SIDEPANEL_CEILING_CAP` 语义 / 档位 512,000 / 绝对上限 563,200。

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| 本叶 build 完成 | 运行 `@sddu-review specs-tree-v5-1-next-registry-pipeline` 开始代码审查 |
| 审查 + 验证通过后 | 进入 `specs-tree-v5-2-ops-first-batch`（v5-1 的注册表 / 管线接口是它的前置；同时承接 §6-①③④ 三项 pending） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = 波 A~C：101~113；含 SG-1 结论与门禁复跑） | 2026-09-22 | SDDU Build Agent |
| v1.1 | R2 收口（114~122）：diff0 门禁 / X3 三处重锚对账 / 义务表 9 行 + 机核 / 双契约 G 127 入册 + `designContractChanges` / `BLOCKED_TERMINALS` 单源与常驻候选 / 体积 **Δ = 0** / 全门禁串行 24 项全绿；未闭合项 5 条显式登记（§6） | 2026-09-22 | SDDU Build Agent |
