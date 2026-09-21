# 构建报告：specs-tree-v5-2-ops-first-batch（R1 = TASK-V5-123~137 · 波 A~D 前段）

> **文档定位**: SDDU 构建报告 — 记录本轮任务的文件变更、实现结果与门禁读值，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md`（30 任务 / 7 波）、`plan.md`（ADR-V5-002/003/005）、父 `spec.md`（FR-ALLN-040~049 OPS 族 / 065~069 SW 族 / 020~024 法八族 / X1·X2）、父 `ADR-V5-001~012`
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0（R1 = 123~137）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（R1：9 op 前五落地 + `op-table` 双侧同源 + `op-*` type-only 通路（SG-3）+ SW 执行器 + `op.authorize` 两段握手与 N-04 断流修复 + 掩码 `secret` 卡与值直达 key-store + `op.llm-config` 凭据回滚；**体积越限停机上报**见 §6）

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **15 / 15**（R1 = `TASK-V5-123~137`；剩余 `138~152` 归 R2） |
| 复杂度分布 | S×1（129 SG-3） / M×12（123~128 / 130~132 / 134~136） / L×2（133 / 137） |
| 新增文件 | **4 源码** + **2 node 门禁** = **6 个** |
| 修改文件 | **14 个**（9 源码 + 4 测试 + 1 台账 v4-supersession-ledger） |
| 体积 | `dist/sidepanel.js` **518,329 B**（基线 507,315 ⇒ **Δ = +11,014 B**，**越限停机**：见 §6） |
| 红线冻结面 | `content.js` 177,076 B / `52a82620…`、`pick-layer.js` 33,900 B / `5f567d7e…` **逐字节不变**（SG-3 实跑） |
| `KIND_SET` | **逐字零新增**（union 仅加 3 个 type 成员；反证：加进 `KIND_SET` ⇒ `content.js` +53 B 实测） |
| 测试计数 | `npm test` **1130 → 1141**（+11；**1136 pass / 5 fail**，5 项全为体积登记面）；Chromium：recommendation **65/0**、stream **63/0**、ask-auth **61/0**、l0 **244/0**、density **231/1**（唯一红 = 体积登记）、journey **171**、binding **192** |

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/shared/op-table.ts` | 123 | 9 行描述符 `{id, layer, mode, fail, audit}`（纯数据、零 chrome、零运行时依赖：`definition.js` 仅 `import type` ⇒ 双侧 bundle 不互拉）；`SW_OP_DESCRIPTORS` = `filter(layer==='sw')` 恰 2 项 |
| NEW | `src/ui/sidepanel/next-registry/ops.ts` | 123~128 / 133 / 137 | **9 个 `NextOp` 执行体**（由 `OP_DESCRIPTORS` 派生 ⇒ layer 单源）+ `bindPanelOps` 缝 + `swExec` 缝 + `OP_PARAM_SEQUENCE` + `reachableOpIds`（`op.help` 的派生，禁硬编码）+ 生产 `params`/`consent` collector 缝 |
| NEW | `src/background/op-protocol.ts` | 130 | `isOpMessage`（本族**唯一**运行时校验）+ `opExecRequestProblems`（缺 consentToken / commit 缺 gestureResult ⇒ loud 拒绝） |
| NEW | `src/background/op-executors.ts` | 132 / 133 | `SW_OPS` **由 `OP_DESCRIPTORS.filter(layer==='sw')` 派生**（镜像字段集恰 `{mode,fail,audit}`）+ `execSwOp`（probe 只读 / commit 唯一提交点 / 未注册 opId loud） |
| NEW | `test/op-protocol.test.ts` | 130 | `KIND_SET` 逐字零新增 + `content.js` pin + 独立校验模块 + 零 import 边 + 反证（6 用例） |
| NEW | `test/sw-op-mirror.test.ts` | 132 | 镜像字段集 / 特权恰 2 / 「恰一处声明」扫描 / 漂移反证 / 执行器 loud 语义（5 用例） |
| MODIFY | `src/background/messaging.ts` | 130 | **union type-only** 扩 `op-exec`/`op-exec-result`/`op-audit`（运行时零字节；`KIND_SET` 逐字不动） |
| MODIFY | `src/background/service-worker.ts` | 131 / 133 | 入口闸门并列 `!isOpMessage(raw)`；`handleMessage` 增 `case 'op-exec'`；把 `authorize` 分支体抽成**唯一** `authorizeOrigin(s, origin, granted)`（legacy 消息与 op 握手**共用一个授权体**） |
| MODIFY | `src/ui/sidepanel/next-registry/pipeline.ts` | 123~128 / 137 | op 表迁至 `ops.ts`（re-export 保持既有导入面）；生产默认缝合线（collectors / `swExec` / receipt `settle` / 非死端行 / 错误卡恢复）；`params` 结果并入执行上下文（`op.describe` 读它） |
| MODIFY | `src/ui/sidepanel/next-registry/obligation-table.ts` | 123 | 3 行 `pending-v5-2` **翻转为 `registered`**（9 行与注册表双向相等；C-6） |
| MODIFY | `src/ui/sidepanel/recommend.ts` | 133（N-04） | `RECOVERY_CHIP_ORDER.site = [rebind, authorize, repick, describe]` ⇒ `site.unauthorized` 的 chips **含 `op.authorize`**（首槽位仍 `rebind`）；`ctxOf` → **导出** `recommendCtx`（`op.help` 与推荐共用同一 ctx 派生） |
| MODIFY | `src/ui/sidepanel/stream-model.ts` | 134 | `askKind` **扩值** `+secret +form`（**不加 kind**：`CARD_TYPES` 12 项不动）+ `payload` 增 `secretLabel?` / `formOptions?` / `maskedLength?`（可选 ⇒ 缺省渲染零变化） |
| MODIFY | `src/ui/sidepanel/chat-state.ts` | 134 | `AskState.kind` 改为**由模型派生**（`NonNullable<StreamPayload['askKind']>`，零第二份字面量）；`ask-resolved` 增可选 `maskedLength`（只落事实） |
| MODIFY | `src/ui/sidepanel/cards/askuser.ts` | 135 | `secret` 扩形：**复用**同一 `input/submit/cancel` 三元组（`type=password` + `data-secret=true` + `aria-label`）⇒ 卡内可点控件 **3**（≤6）、单一构造零第二条 DOM 路径；固化文案 = 「已写入（掩码 · 零明文 · 类别位）」**只含事实**（值/前缀零出现） |
| MODIFY | `src/ui/sidepanel/cards/nextstep.ts` | 128（附带修复） | chip 值仅在 `act==='next'` 时透传（`chips 即指令`）；本地 act 的 chip 文案**不再**被当作输入（否则「改用描述」标签会被当成用户的描述提交） |
| MODIFY | `src/ui/sidepanel/stream-plaintext.ts` | 135 | `ASK_COPY.secretWritten`（掩码固化文案单源，经既有 `assertStreamPlaintext` 面） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 133~137 | `authorizeCurrentSite` → **两段握手**（probe → 页面手势 → commit，返回 `OpOutcome`；`requestOriginPermissionDetailed` 仍**恰 1 调用点**、`authorizeCurrentSite` 仍**恰 2 调用点** ⇒ 既有门禁逐字保留）；模块级 **`keyStore`**（单一值汇聚点）+ `submitSecret`（值直达存储、只 `dispatch` 事实）；生产 `params`/`consent` collector（流内卡 + `opAskResolvers`/`opConsentResolvers`）；`op.llm-config` 执行体（测试连接 → 失败**快照回滚**）；`bindPanelOps` 增 `ctx`/`collectParams`/`collectConsent`/`llmConfig` 槽 |
| MODIFY | `test/insight-protocol.test.ts` | 130 | 入口守卫判据**等价重锚**为五校验面 + 新增 op-* 反证（`isPluginMessage({'op-exec'})===false`） |
| MODIFY | `test/blocked-terminals.test.ts` | 133（N-04） | `PENDING_ITEMS['FR-ALLN-013-chips']` 按约定**翻转为 `landed`** + 判据改**双向**（pending ⇒ 不含 / landed ⇒ 必含）+ 反证改非法枚举值 |
| MODIFY | `test/next-obligation-table.test.ts` | 123 | OT-1 的 pending 断言**等价重锚**（`[]` + 义务表 landed 集 == 注册表 opId 集，双向） |
| MODIFY | `test/gate-integrity.test.ts` | 130 / 132 | `EXPECTED_AUDITED_FILES` 追加两个 node 门禁（只追加；node 扫描按 `JUDGEMENTS` 标记自动纳入） |
| MODIFY | `test/ui/recommendation.mjs` | 133（N-04） | ⑭ 的本地 act 闭集扩为 5 项（`repick/describe/rebind/authorize/help`，仍禁 `next`）；判据力只升 |
| MODIFY | `docs/v4-supersession-ledger.json` | 130（L-a） | 新增 v5-2 叶段（`leafBase 8526ef8`，删除面 4 文件 / 13 行**逐字登记** + summary 自洽）+ V52R1-E-01 接管条目（v3 段 V34-S3/S3c/DR3-S9 的 newTitle 换链到五校验面） |
| — | **未触碰** | — | `manifest.json`（**零 diff**）/ `src/content/**` / `KIND_SET` / 判定链 / `design/**` / `docs/v3-supersession-ledger.json` / `packages/web-cli-base/**` / `ROADMAP.md` |

---

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-V5-123 | `shared/op-table.ts` 9 行描述符 + `ops.ts` 脚手架与注册接线 | M | ✅ completed | FR-ALLN-065/068/040~048 · AC-007/010 |
| TASK-V5-124 | `op.pick` —— 复用既有拾取单一入口 | M | ✅ completed | FR-ALLN-045/059 |
| TASK-V5-125 | `op.describe` —— 复用 `submitDescribe` 单一入口 | M | ✅ completed（**`params` 声明偏差见 §6-④**） | FR-ALLN-046/059 · EC-009 |
| TASK-V5-126 | `op.rebind` —— 复用 `#rebind` 单一入口 + 幂等 | M | ✅ completed | FR-ALLN-041/059 |
| TASK-V5-127 | `op.help` —— 可达 op **由 `when(ctx)` 派生** | M | ✅ completed | FR-ALLN-047 |
| TASK-V5-128 | `op.turn` —— **唯一**经 `requestTurn` 的 op（N25） | M | ✅ completed | FR-ALLN-048/056 · N25 |
| TASK-V5-129 | **SG-3**：`op-*` type-only 通路探针 | S | ✅ completed（结论 `type-only-feasible`，见 §4） | FR-ALLN-067/069/111 |
| TASK-V5-130 | `op-protocol.ts` + union type-only + 门禁 | M | ✅ completed | FR-ALLN-067/111 · X2 |
| TASK-V5-131 | SW `case 'op-exec'` + 入口闸门 | M | ✅ completed | FR-ALLN-065/067 |
| TASK-V5-132 | `op-executors.ts` SW 镜像 + 门禁 | M | ✅ completed | FR-ALLN-068 |
| TASK-V5-133 | `op.authorize` 两段握手 + **N-04 断流修复** | L | ✅ completed | FR-ALLN-040/065/066 · FR-ALLN-013 |
| TASK-V5-134 | `stream-model.ts` `askKind` 扩值 + `payload` 扩字段 | M | ✅ completed | FR-ALLN-020/022 |
| TASK-V5-135 | `cards/askuser.ts` `secret` 扩形 + 掩码固化文案 | M | ✅ completed | FR-ALLN-020/022 |
| TASK-V5-136 | `sidepanel.ts#submitSecret` 值直达 key-store（恰 1 调用点） | M | ✅ completed | FR-ALLN-021/022 · N24 |
| TASK-V5-137 | `op.llm-config` 执行体 + 凭据表快照回滚 | L | ✅ completed | FR-ALLN-042/021 |

**R1 承接的四项（v5-1 `build.md §6` + `§8`）**：

| # | 项 | 处置 |
|:--:|---|---|
| **N-04** | FR-ALLN-013 `chips 含 op.authorize` | ✅ **落地并翻转登记**：`RECOVERY_CHIP_ORDER.site` 第二槽位 = `authorize` ⇒ `site.unauthorized.chips = [op.rebind, op.authorize, op.repick]`；`PENDING_ITEMS` 翻 `landed`（门禁双向自紧） |
| **N-05** | `setKnownOpIds` 运行期接线缺失 | ✅ **接线**：`ops.ts#OPS_BY_ID` 由 `OP_DESCRIPTORS` 派生且 `op-impl-missing` loud；注册期悬空 chips 由既有 `registry.validateNextProvider` + `assertObligationCoverage` 面承担（静态门禁 `sw-op-mirror` / `next-obligation-table` 机核） |
| §6-① / ③ | `llm.unconfigured` / `perm.missing` 的修复 provider | ⏳ **仍 pending-v5-2**（`BLOCKED_P0_MAP` 两行保持 `pending-v5-2`）：双射 5↔5 需**两个** provider 同时落地（`op.llm-config` R1 / `op.perm.request` R2）⇒ 单一原子编辑随 R2 的 TASK-V5-139 一并完成（登记，不静默） |
| §6-④ | 义务表校验钩子的运行期接线 | ✅ 注册期由 `ops.ts` 的派生表 + 门禁机核覆盖（`assertObligationCoverage` 在门禁内调用） |

---

## 4. SG-3 结论（TASK-V5-129，只读探针）

**结论：`type-only-feasible`** —— 判定 `TASK-V5-130` / `131` **可直落**（已直落）。日志 `/tmp/opencode/v4-gate-logs/v5-2-r1/w2-spike-op-typeonly.log`，探针 `/tmp/opencode/v5-spike/op-type-only-probe.mjs`。

| 探针判据 | 实测 |
|---|---|
| `dist/content.js` == **177,076 B** ∧ sha `52a82620…` | ✅ 命中 |
| `dist/pick-layer.js` == 33,900 B ∧ `5f567d7e…` | ✅ 命中 |
| `src/content/**` 的 `op-*` import 边数 | ✅ **0 命中** |
| union 确实含 3 个 type 成员（判据非空转） | ✅ 命中 |
| `KIND_SET` 块内**零** op-* 字面量 | ✅ 命中 |
| **反证**：把 3 个字面量追加进 `KIND_SET` ⇒ `content.js` 增长 | ✅ `177,433 → 177,486`（**+53 B**，worktree 副本实跑；注：+53 非历史「+307」——后者是 6 个更长字符串的成本，判据方向一致） |
| 控制组逐字节还原 + 仓库 `git status` 只含本轮实现改动 | ✅ 探针自身零仓库写入（`dist/**` 已 gitignore） |

---

## 5. 门禁复跑 vs 基线（日志 `/tmp/opencode/v4-gate-logs/v5-2-r1/`）

| 门禁 | 基线 | 本轮 | 判定 |
|---|:--:|:--:|:--:|
| `npm test`（tsc + node --test） | 1130 / 0 | **1141 / 1136 pass / 5 fail** | ⚠️ 5 项**全为体积登记面**（见 §6） |
| `test:recommendation`（Chromium） | 65 / 0 | **65 / 0** | ✅ |
| `test:stream` | 63 | **63 / 0** | ✅ |
| `test:ask-auth` | 61 | **61 / 0** | ✅ |
| `test:l0` | 244 | **244 / 0** | ✅ |
| `test:density` | 232 | **231 / 1** | ⚠️ 唯一红 = 「F 产物字节 == 体积登记值」（§6 同一根因） |
| `test:ui`（journey） | 171 | **171** | ✅ |
| `test:binding` | 192 | **192** | ✅ |
| **保护段** `binding.mjs[107780..115930]` | sha `be9ad0e9…` | **`be9ad0e9…` 逐字节不变** | ✅ |
| `manifest.json` / `src/content/**` / `design/**` / `v3-supersession-ledger.json` | — | **零 diff** | ✅ |
| `supersession-ledger`（含 V4 段） | 35 / 0 | **35 / 0** | ✅（新增 v5-2 叶段 + 接管条目） |

**KIND_SET 零新增反证**（逐字）：`op-protocol.test.ts` OP-P ① 逐字比对 40 个字面量 + OP-P ④ 注入反证；`insight-protocol` 新增第五面反证。

---

## 6. 未闭合项与偏差登记（登记，不静默）

### 6.1 ⛔ 体积越限 —— **停机上报**

| 量 | 值 |
|---|---|
| 基线 | **507,315 B** |
| 本轮实测 | **518,329 B**（`stat -c %s dist/sidepanel.js`） |
| **Δ** | **+11,014 B**（+2.17%） |
| R1 预算上限（编排器指令） | **512,865 B**（507,315 + 本叶 5,550） |
| **越限** | **+5,464 B** |
| 档位影响 | `ceilTo50KB(518,329) = 563,200` ⇒ **越过 512,000 档位**（触发 `ADR-V5-011 §2` 第 3 行的**档位上调义务**） |

**逐模块归因**（真实 `dist/build-meta.json` bytesInOutput；同路径对照由 `8526ef8` 干净树 worktree 构建取得）：

| 模块 | 基线 | 本轮 | Δ |
|---|---:|---:|---:|
| `src/ui/sidepanel/next-registry/ops.ts` | —（新） | 3,918 | **+3,918** |
| `src/ui/sidepanel/sidepanel.ts` | 83,601 | 88,322 | **+4,721** |
| `src/shared/op-table.ts` | —（新） | 831 | **+831** |
| `src/ui/sidepanel/cards/askuser.ts` | 6,804 | 7,315 | +511 |
| `src/ui/sidepanel/recommend.ts` | 4,313 | 4,798 | +485 |
| `src/ui/sidepanel/stream-plaintext.ts` | 4,140 | 4,567 | +427 |
| `src/ui/sidepanel/chat-state.ts` | 17,200 | 17,385 | +185 |
| `src/ui/sidepanel/cards/nextstep.ts` | 1,436 | 1,464 | +28 |
| `src/ui/sidepanel/next-registry/pipeline.ts` | 3,135 | 2,979 | **−156** |
| 归因位移（`clipboard-page.ts`） | 2,612 | 2,603 | −9 |
| **Σ 逐模块** | | | **+10,941** |
| 未归因胶水 | | | **+73** |
| **登记增量（权威值）** | | | **+11,014** |

> **权威值 = 制品实测 `518,329 − 507,315 = +11,014`**，且 `Σ 逐模块 +10,941 + 胶水 +73 == +11,014`（算术闭合）。逐模块 Δ 说明**构成**：`ops.ts`（新 op 表 + 五要素文案）+ `sidepanel.ts`（生产缝：collectors / 两段握手 / 掩码提交 / `op.llm-config` 回滚）合计 **+8,639（78%）**；掩码卡 +1,426 段中 `cards/askuser` 净 +511（复用同一 DOM 构造后）。

> 注：上表 = 干净树对照（同路径规则）；**制品实测 Δ = +11,014** 与对照 Σ +11,863 相差 849 B，来自干净树与工作树的 `dist/` 构建噪声（前者含注入控制组的还原构建，模块路径注释长度不同）。**权威值 = 制品实测 `518,329 − 507,315 = +11,014`**；逐模块 Δ 用于说明**构成**（ops 表 + 面板接线 + 掩码卡 ≈ 85%）。

**未执行的重登记（需裁决）**：`size-budget` 要求「登记基线 == 实测产物」，`size-ruling-vol3` 的档位不下移闸门要求 `ceilTo50KB(登记基线) === 512,000`。二者在 518,329 下**不可同时满足** —— 重登记必须伴随**档位上调**（512,000 → 563,200，`ADR-V5-011 §2` 第 3 行：**显式登记 + `authorConfirmation` 占位规则（不得伪称已确认）**）。因此本轮：
- **未**改 `SIDEPANEL_BASELINE_BYTES` / `SIDEPANEL_CEILING` / 档位 / 绝对上限（绝对上限 563,200 不变）；
- **未**放宽容差、**未**删除任何断言；
- 5 项体积门禁如实判红（`npm test` 5 fail + `test:density` 1 fail），**不伪装全绿**。

**背景（计划侧偏差）**：`ADR-V5-011 §1` 给 9 op 执行体 `3,400 B`、`askuser` 扩形 `1,800 B`（本叶 5,200 + 胶水 350 = **5,550 B**）。实测：**仅 `ops.ts` 一项即 3,984 B**，而「面板接线（collectors / 握手 / 掩码提交）」未在预算表内单列，实测 +4,615 B ⇒ **预算低估约 2 倍**。本叶 R1（123~137）在任何实现形态下都无法落入 5,550 B。

### 6.2 其余登记

| # | 项 | 状态 | 机核位置 | owner |
|:--:|---|---|---|---|
| ① | R1 `op.describe.params` 未声明 | **偏差登记** | `ops.ts#IMPL['op.describe']`（`params: null`）。**原因**：声明 `params` 会让管线的 params 态在 chip/提交路径插入第二个 ask 卡，与既有「`#ask-fallback` 单所有者」判据（`test:recommendation` ⑫，实测 FAIL）冲突。FR-046 的「params = 描述文本（ask 卡 text）」由**面板既有单一 ask 卡**承担（`ensureTextAskCard` / `revealAskFallback`），执行入口仍为唯一 `submitDescribe`。**须由 R2 / 编排器裁决**是否改写既有 ask 卡机制以容纳声明式 params | R2 / 编排器 |
| ② | `op.perm.request` / `op.revoke` 执行体 | 机制预留（loud 拒绝） | `op-executors.ts#execSwOp`（非 `op.authorize` ⇒ `sw-exec-pending`）；`op.revoke` 的 `PANEL.revoke` 槽待 R2 | R2（TASK-V5-139 / 141） |
| ③ | `llm.unconfigured` / `perm.missing` 修复 provider | `pending-v5-2` 保留 | `test/blocked-terminals.test.ts#BLOCKED_P0_MAP`（两行 `reason ≥40`） | R2 |
| ④ | 法八**四面机核**（流/digest/审计/DOM 属性） | 入口侧已交付（掩码卡 + 值直达 + 流内只留事实）；**机核门禁归 v5-3** | `ADR-V5-010 §2`（`test/ui/law8-plaintext.mjs` 由 v5-3 落地） | v5-3 |
| ⑤ | `op.perm.request` 的 `form` 扩形 + 权限面 X1 重锚（`140`） | 未开始 | `tasks.md TASK-V5-138~140` | R2 |
| ⑥ | S2 断流首验收（`149/150`） | 未开始（本叶 R1 只提供上游样本） | `tasks.md TASK-V5-149/150` | R2 |

---

## 7. 下一步

| 场景 | 操作 |
|------|------|
| R1 功能面 | ✅ 123~137 全落地；功能门禁（recommendation / stream / ask-auth / l0 / journey / binding / supersession）**全绿**，保护段字节不变 |
| **阻塞** | ⛔ **体积越限停机**：`518,329 B > 512,865 B` 且越过 512,000 档位 ⇒ 须先由编排器/作者裁决（档位上调登记 or 削减 R1 范围） |
| 裁决后 | 若准予档位上调：五要素重登记（`SIDEPANEL_BASELINE_BYTES` → 518,329；`ceiling = floor(×1.05) = 544,245`；档位 563,200 显式登记 + `authorConfirmation` 占位）；随后 `@sddu-review` |
| 剩余 | `TASK-V5-138~152` 归 R2 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = 123~137：`op-table` 双侧同源 / 9 op 前五落地 / `op.turn` 唯一 `requestTurn` / SG-3 `type-only-feasible` / `op-*` type-only + SW 执行器镜像 / `op.authorize` 两段握手 + **N-04 断流修复** / 掩码 `secret` 卡 + 值直达 key-store + `op.llm-config` 快照回滚；功能门禁全绿；**体积越限停机上报** §6.1） | 2026-09-22 | SDDU Build Agent |
