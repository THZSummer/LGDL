# 审查报告：specs-tree-v5-1-next-registry-pipeline

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C34 审查清单 + 四维度指引；本轮同轮产出）
> **前置依赖**: `review.md`、本叶 `spec.md` v1.0、`plan.md` v1.0（ADR-V5-001 / 002机制侧 / 008）、父 `../spec.md`、`build.md` v1.1（R1+R2）、`tasks.md` v1.0
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **审查轮次**: **R1（静态审查：读码 / 对账 / 独立 grep + 门禁抽跑）**
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（HEAD `4d96f6b`，工作树干净；审查范围 = `036ad03^..4d96f6b` 本叶 30 文件；独立复跑 9 项门禁 + 4 类独立 grep 对账）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **34** |
| 通过 | **29** |
| 警告 | **5** |
| 失败 | **0** |
| **阻塞问题** | **0** |
| 改进项 | **5**（I-01~I-05，非阻塞） |
| 观察项 | **3**（O-01~O-03） |

**审查基线**：分支 `feature/web-cli-plugin`，HEAD **`4d96f6b`**，工作树干净（`git status --porcelain` 空）。门禁日志：`/tmp/opencode/v4-gate-logs/v5-1-r2/`（build 侧）+ 本轮独立复跑（下述）。

**独立复跑对账（9 项，全部与 build 自报相等，唯 1 项例外见 I-01）**

| 门禁 | build 自报 | 本轮独立复跑 | 结论 |
|---|:--:|:--:|:--:|
| `npm test`（node 全量） | 1129 | **1129 / 0 failed** | ✅ |
| `test:design-contract` | 19 | **19 / 0** | ✅ |
| `next-registry` + `next-pipeline` | 63（合并抄跑） | **63 / 0** | ✅ |
| `next-dispatch-diff0` | 14 | **（含于 63）14 / 0** | ✅ |
| `next-obligation-table` | 10 | **（含于 63）10 / 0** | ✅ |
| `blocked-terminals` | 8 | **（含于 63）8 / 0** | ✅ |
| `test:gate-integrity` | 14 | **14 / 0** | ✅ |
| `test:supersession` | 35 | **35 / 0** | ✅ |
| `test:recommendation`（Chromium） | **66** | **65 / 0** | ⚠️ **登记偏差（I-01）** |

## 2. 逐项审查结果（C1~C34）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | Definition 常量 | FR-030/031/033/035 | ✅ | 6 services / 2 modes / 5 mount / `receipt=emit` 其余 `waterfall` / `BLOCKED_TERMINALS=5` / `NextCtx` 字段集逐字 == 旧 7 源白名单；全 `Object.freeze` | — |
| C2 | `validateNextProvider` loud | FR-031/033/035 · EC-001/002/003 | ✅ | 未知 deps / 非法 mode / 挂载点不符 / priority 越域 / 空 chips 全部 `{ok:false,error}`；NR-1 实跑 | — |
| C3 | `resolveOrder` 定序 | FR-031/032 · R-ALLN-902 | ✅ | `topoByDeps` 恒等（deps 名服务非 provider）+ `(priority, prepend, seq)` 排序；置换测试 + 反证实跑 | — |
| C4 | 可逆注册 / 覆盖 / 单点写入 | FR-030/032 · EC-020 | ✅ | `removeRowById` 唯一 splice；`{overwrite:true}` 原位整行替换计数不变；`REGISTRY.push`/`splice` 各恰 1 | — |
| C5 | 内置 provider 迁移等价 | FR-030~038/013 | ✅ | 旧 4 规则逐条等价（详见 §3.1）；**旧 `site` 谓词本就无 `firstRun` ⇒ 该处 Δ=0**（见 O-01） | — |
| C6 | `recommend.ts` 常量保留 | FR-013 · T-d | ✅ | `NEXTSTEP_PRIORITY` / `NEXTSTEP_ACTS` / `RECOVERY_CHIP_ORDER` / `RECOVERY_CHIP_TEXT` / `RECOVERY_TRIGGERS` / `MAX_*` / 间隔 10,000 逐字保留；模块白名单从 1 → 5 项为迁移必需且于 `sourceWhitelistProblems` 下维持 7 源零扩项 | — |
| C7 | R5② 注册失败 loud | FR-034 · EC-001/002/003/004 | ⚠️ | loud = `{ok:false,error}` 返回式（可机核）；「红显 `data-state=fail`」为**设计稿侧**（G shim N4），产品运行时无 UI 红显（本叶纯 TS 机制，合理）。见 O-03 | 低 |
| C8 | R5③ 快照 / 回滚语义位 | FR-034 · EC-005/011 | ✅ | `isMutating = risk!=='low'`；多表 `OpSnapshot{tables[]}`；`rollback` 整体回滚；NP-5 注入驱动（三表 + 抛错 → 回滚 1 次）实跑 | — |
| C9 | `runOp` 四态 | FR-055 | ✅ | `params?→consent?→snapshot?→execute→receipt`；无 params/consent ⇒ 零插卡（NP-2）；拒绝 → cancelled/rejected（NP-1） | — |
| C10 | `pendingOps` FIFO | FR-055 · EC-017 | ✅ | 达 `MAX_OPEN_ASKS` 不新开 ask、入队 + `PANEL.notice` 系统行（不静默丢弃）；`ref-round-*` 本地回合不入队；NP-4 实跑 | — |
| C11 | `ACT_TO_OP` 6 行双向 | FR-056 | ✅ | 恰 6 行逐字；`OP_TO_ACT` 由 `Object.fromEntries` 派生（非第二手写表）；NP-6 + D0-3 实跑 | — |
| C12 | chip `data-op` / `data-act` 别名 | FR-057 · LNG-V5-1-003 | ⚠️ | 渲染写 `data-op`（`nextstep.ts:64`，由 `ACT_TO_OP` 派生）；**分发运行时不读 `data-op`，而用内存 `act → ACT_TO_OP` 桥接**（`data-act` 属性零回读已 grep 证实）。spec 字面「分发只读 `data-op`」未逐字落地（等价语义成立）。见 I-02 | 低 |
| C13 | 瘦分发 diff=0 | FR-058 · AC-ALLN-005 · N22 | ✅ | `handleCardAction` 体零集 B 字面量；`dispatchChipAction(` 全 `src/**` 恰 1 调用点（`sidepanel.ts:232`）；`ACT_TO_OP` 唯一声明于 `dispatch.ts`；四操作下四源文件 sha 不变；I 独立 grep + D0-1~D0-6 复跑 | — |
| C14 | 本地 op 语义对齐 | FR-059 · R-ALLN-905 | ✅ | `bindPanelOps` 7 槽 → 既有单一入口；`op.turn` 走 `requestTurn`（回合）、`op.pick/authorize/rebind/help` 零 `requestTurn`；不受 pending 门控；复跑 local-act-wiring | — |
| C15 | `BLOCKED_TERMINALS` 单源 | FR-010 · NFR-004 | ✅ | 5 字面量在 `src/**` 仅 `definition.ts`（5）+ `providers.ts`（2，登记例外）；`obligation-table.ts` 由 `BLOCKED_TERMINALS[i]` 派生；第三处即 FAIL（BT-1 + 反证实跑） | — |
| C16 | 阻塞终态可达 next 机制基础 | FR-011 · AC-ALLN-002(机制) | ✅ | 候选由注册表产出（5 P0 + 3 规则）；义务表 **chips 无悬空**（OT-4 实跑）；可达性由管线唯一入口保证（守护门禁本体在 v5-3，登记） | — |
| C17 | `site.unauthorized` 常驻候选 | FR-013 · P0 | ⚠️ | `when(ctx)=!authorized` 与 `firstRun` 无关（静态 + 动态双证，BT-2 实跑）；**但 chips = `[op.rebind,op.pick,op.describe]`，不含 `op.authorize`** ⇒ 父 FR-ALLN-013 验收后半「chips 含 `op.authorize`」未落地，登记 `pending-v5-2`（B §6-①）。`op.authorize` chip 目前仍仅首装 onboarding 产出。见 I-03 | 中 |
| C18 | F 契约冻结不替换 | FR-100/103 · N21 | ✅ | `git diff 036ad03^..4d96f6b -- test/design-contract.test.ts` 删除行 = **0**；F 4 常量、60 行映射、6 个 test 名逐字在位 | — |
| C19 | G 127 断言入册 | FR-101 · ADR-V5-008 | ✅ | 程序化比对：`option-g-shim.mjs` 的 127 条 `check('ID clause'` 与 `G_ASSERTION_MAP` 127 行的 **id + clause + 序完全一致，mismatch=0**；唯一 id 118（I2×8 / M17×2 / M20×2 为 shim 事实）；14 组 A~N | — |
| C20 | `designContractChanges` 登记 | FR-102 · AC-ALLN-017 | ✅ | ledger `designContractChanges = []→[{object,before:null,after{draftSha,shimSha,assertions:127,groups:14},date,reason,leaf}]`；F 侧 `assertions/mappingRows` 仍 60 未被覆盖 | — |
| C21 | X3 等价重锚（act 闭集→opId 集） | FR-112 · FR-120 | ✅ | 旧闭集判据保留为渲染别名一致性；新权威 `ACT_TO_OP` 6 行 + 义务表 9 opId；源白名单 7 项零扩项；反证（删/增白名单、多 op）实跑 | — |
| C22 | X4 G 入契约 / F 不替换 | FR-113 | ✅ | G 块纯追加；F/G 常量互换反证两侧各自 FAIL；混池防御独立计数 | — |
| C23 | X6（chip 侧） | FR-115 | ⚠️ | `data-op` 渲染 + 门禁 ⑮ 双采集一致 + 零悬空 + `#stream [data-op]` 锚（Chromium 实跑 ✅）；分发读 `data-op` 同 C12 口径。见 I-02 | 低 |
| C24 | 等价重锚台账 | FR-116 | ✅ | `modifiedRanges[]` 4 条 `equivalent-rewrite`（`oldId` / `reason≥40` / `leaf:v5-1` / `deletedLines:0`）逐条在位 | — |
| C25 | 断言零删除 / 计数只增 | FR-003 | ✅ | R1..R2 `test/**` 删除行 = **0**；`npm test` 1045→1129；各门禁只增（唯 `test:recommendation` 登记数偏差见 I-01，方向仍只增） | — |
| C26 | 共享面恰一次登记 | FR-004 | ✅ | design-contract 仅 1 条 G 登记；体积登记 1 条（v5-1-r1）；台账活指针前移 + 历史逐字保留 | — |
| C27 | 门禁等价重锚清单 | FR-120 | ✅ | `recommendation-sources`（闭集→opId 集）/ `local-act-wiring`（分支体→op 槽→单一入口，含 `X3_RECONCILIATION` 对账表）/ `authorize-chip-wiring`（同源链）/ `recommendation.mjs` ⑮（+6 断言）/ `design-contract` G / `supersession` 逐项落地 | — |
| C28 | 反证不空转 | FR-121 · NFR-007 | ✅ | 5 条新门禁各含 `JUDGEMENTS` + `expectFailPattern` + 注入反证（D0-6 组 / OT-3 类 / BT-4 组 / DC 多组 / X3 多组），本轮复跑注入路径全绿 | — |
| C29 | `knownGap` 一致性 | FR-123 · EC-018 | ✅ | `test:supersession` 35/0（含 `knownGaps` / `modifiedRanges` / 体积活指针复算） | — |
| C30 | 新门禁入 `gate-integrity` | FR-125 | ✅ | `EXPECTED_AUDITED_FILES` 只追加 4 条；`V51_NODE_GATE_FILES` 标记自动发现；`CHROMIUM_GATES===9` 不动；13→14 实跑 | — |
| C31 | 体积五要素 + 归因 | FR-130 · NFR-005 | ✅ | 实测 `dist/sidepanel.js = 507,315 B`（498,521→507,315，+8,794 ≤ 8,800，余 6 B）；ceiling = floor(507,315×1.05)=**532,680**；档位 512,000 未下移、绝对上限 563,200 未动；R2 Δ=0；五要素 + 历史只追加 | — |
| C32 | 红线逐字节 | FR-133 · AC-ALLN-022 | ✅ | `content.js` 177,076 / `52a82620…`、`pick-layer.js` 33,900 / `5f567d7e…` 实测命中；`src/content/**`/`manifest.json`/`policy.ts`/`auto-authorize.ts`/`messaging.ts`/`design/**`/`v3-supersession-ledger.json` 本叶零 diff；密度阈值 7/15·9/20·17/35·0.65·488 零 diff | — |
| C33 | 义务表 9 行四要素 | FR-036 | ✅ | `OP_SPECS` 单常量对象（9 op）→ `OBLIGATION_ROWS` 派生；`mode` 由 `MOUNT_MODE` 派生不重写；表尾 `OBLIGATION_TAIL` 明示 `diff = 0` 义务 | — |
| C34 | 义务表静态机核 | FR-037/038 | ✅ | 五项一致性 + **shim/temp 副本三类注入反证**（仓库文件 sha 前后不变）；`OT-6` 功能名在源文本中恰 1 次；复跑 10/0 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 5（C5/C9/C14/C16/C33） | 5 | 0 | 0 | 100% |
| 规范符合性 | 19（C1/C2/C4/C6/C7/C10/C11/C12/C15/C17/C19/C20/C21/C23/C24/C27/C31/C33/C34） | 16 | 3 | 0 | 84% |
| 架构一致性 | 6（C3/C13/C16/C18/C22/C26/C32） | 6 | 0 | 0 | 100% |
| 测试质量 | 4（C8/C25/C28/C29/C30） | 4 | 0 | 0 | 100% |
| **合计** | **34** | **29** | **5** | **0** | **85.3%** |

> 3 条规范符合性警告（C12 / C17 / C23）全部为**登记在案**的部分落地（B §6）或等价语义偏差，无隐性漂移。

### 3.1 迁移等价性逐条对账（C5，X3 核心）

| 旧对象（`036ad03^`） | 新内置 provider | 等价判定 |
|---|---|---|
| `RECOVERY_TRIGGERS` 首命中序 `refInvalid > declarationInvalid > hardFloor > site > probe` | 5 P0 provider 注册序（`RECOVERY_PROVIDER_TRIGGERS` 键序）+ 同 `priority:0` + `seq` 升序 | ✅ 逐条同序 |
| `activeRecoveryTrigger` site/probe/refInvalid/risk 谓词 | `triggerMatch` 同式（`refInvalid = staleCount≥1 ∨ risk∋refInvalid`；`site = !authorized`；`probe = steady=false ∧ phase∉{ready,probing}`） | ✅ 逐式等价 |
| `ref-action`：`validCount≥1 ∧ openAsks===0 ∧ latestRefNum!==undefined` | 同名 provider `when` | ✅ |
| `onboarding`：`firstRun ∧ pendingSteps>0` | 同名 provider `when` | ✅ |
| `capability`：`authorized ∧ phase==='ready' ∧ !busy` | 同名 provider `when` | ✅ |
| `RECOVERY_CHIP_ORDER[t].slice(0,3)` + `RECOVERY_CHIP_TEXT` | `chips = acts.map(ACT_TO_OP)` + `textOf` | ✅ 文案/序逐条等价（经 `OP_TO_ACT` 回路） |
| `candidate()` 输出 `{rule,priority,chips,label}`；`out` 顺序 1→4 | `candidateRules` 遍历 `resolveOrder` 后 `sort(priority)` | ✅ 最终序同为 recovery/ref-action/onboarding/capability |
| 4 抑制原因 `pending/interval/empty/safety` + `MAX_*` + 间隔 | `recommendNextStep` 逐字保留 | ✅ |
| `NEXTSTEP_ACTS` 6 act | `ACT_TO_OP` 6 行 | ✅ |
| `handleCardAction` 16 分支 | 两集模型（A 8 保留 / B 7→1 查表） | ✅ per-op 分支 0 |

**仅有的行为变化**：① 未知 action 不再派发 v4-3/v4-4 兜底 notice（`dispatchChipAction` 返回 false 被忽略，静默）；② 无 `value` 的 `next` / `describe-submit` 由「兜底 notice」改为走 `op.turn('')` / `runOp→describe(null)→revealAskFallback`（实际调用永远带 value，不可观测）。**未登记的隐性行为漂移 = 0**。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题** | — | — |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-01 | `build.md §5` / `state.json#v5-1.r2Gates.recommendation` / `/tmp/opencode/v4-gate-logs/v5-1-r2/w3-recommendation.log` | **计数登记偏差**：登记 `test:recommendation` 66，本轮对 HEAD `4d96f6b` 实跑 = **65**（R1..R2 该文件 `check(` 净增 **+6**，非 +7；pre-R2 实跑 59 ⇒ 59+6=65）。方向仍「只增」，但登记值与产物不符 | C25/C27 | 把 build/state/R2 日志的 66 订正为 **65**（或补足第 7 条断言后复跑）；门禁计数必须与**已提交产物**同源重测 |
| I-02 | `src/ui/sidepanel/next-registry/dispatch.ts:49` / `sidepanel.ts:232` | **`data-op` 非运行时读取源**：分发用内存 `act → ACT_TO_OP` 桥接（`getAttribute('data-act')` 零回读已证），但 spec FR-ALLN-057 字面「分发只读 `data-op`」未逐字落地（`data-op` 仅渲染 + 门禁采集） | C12/C23 | 二选一并澄清 spec 用词：① 让 chip click 传 `data-op` 作为唯一 key；② 在 spec/ADR 明确「`data-op` 为对外词汇锚、进程内以 `act→opId` 桥接」 |
| I-03 | `src/ui/sidepanel/next-registry/providers.ts:40-53` / 父 `spec.md:258` | **FR-ALLN-013 仅部分符合**：`when` 侧达标（与 `firstRun` 无关），`chips 含 op.authorize` 侧未落地，登记 `pending-v5-2`（体积余 6 B，加 `authorize` 会增字节）。当前未授权非首装会话的候选仍无「授权当前站点」入口 | C17/C16 | v5-2 注册 9 op 时给 `RECOVERY_CHIP_ORDER.site` 补 `authorize` 并翻登记；同时在父 spec §14.3 与 FR-ALLN-013 验收文之间消除「机制 vs chips」的口径不一致 |
| I-04 | `src/ui/sidepanel/next-registry/definition.ts:44` + `:47` | **重复单源**：`NEXTSTEP_MIN_INTERVAL_MS` 在 `definition.ts` 与 `recommend.ts` 各声明一次（前者产品内**无引用**）；`NEXT_SOURCE_NAMES` 与 `recommend.ts#NEXTSTEP_SOURCE_WHITELIST` 为两份独立 7 源列表，门禁**未做跨表相等断言** ⇒ 可独立漂移 | C1/C6 | 删 `definition.ts` 的重复常量改为 re-export；新增一条「两处 7 源列表逐字相等」的机核（或合并为单一常量源） |
| I-05 | `src/ui/sidepanel/next-registry/registry.ts:34` + `pipeline.ts#assertObligationCoverage` | **EC-ALLN-004 注册期悬空 chips 拒绝未接线**：`setKnownOpIds` 产品内无调用点（`KNOWN_OPS` 恒 `null`），`validateNextProvider` 的 `dangling-chip` 分支在运行时不可触发；现仅由静态门禁 `OT-4` 覆盖 | C7/C34 | v5-2 注册表接线时调用 `setKnownOpIds(Object.keys(OPS_BY_ID))` 与 `assertObligationCoverage`（B §6-④ 已登记义务表钩子，本项补登 `setKnownOpIds`） |

## 5.1 观察项（非改进，记录事实）

| # | 事项 | 说明 |
|---|------|------|
| O-01 | 「`site.unauthorized` 去 `firstRun` 是唯一行为变化」的叙述与实际不符 | 旧 `activeRecoveryTrigger` 的 `site` 谓词**本就无 `firstRun`**（`036ad03^:recommend.ts:116`），该处 Δ=0；真实缺口是 chips 无 `authorize`（R2 根因），即 I-03。建议 build/ADR 叙述订正 |
| O-02 | R5② 「注册 loud **红显**」 | 产品侧仅返回式 loud；`data-state=fail` 红显为 G 设计稿断言（G shim N4），本叶纯 TS 机制不渲染该 UI——机制侧可接受，待 v5-3 视察器落地 |
| O-03 | `tasks.md` 99 个验收 checkbox 全为 `- [ ]`、`tasks.json` 任务无 `status` 字段 | 完成态仅由 `build.md §3` 与 `state.json` 记录；不影响产物，属文档一致性（validate 前可选补记） |

## 6. 结论

**结论**: ⚠️ **有条件通过**（0 阻塞 / 5 改进 / 3 观察）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 29/34 = **85.3%** |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **3** 项（C12 / C17 / C23，均登记在案；C17 = FR-ALLN-013 部分符合） |
| 可进入 validate | **是**（附条件：I-01 计数订正；I-03 由 v5-2 承接） |

**理由**：本叶机制层质量高且自证充分——契约 v2 七点逐点可机核、瘦分发 diff=0 为静态事实、双契约 F 冻结零删除 / G 127 行与 shim 全量逐条一致、迁移等价逐条可复算、红线逐字节命中、9 项门禁独立复跑与 build 自报一致（唯 `test:recommendation` 计数偏差 65 vs 66）。**无阻塞问题**。3 项规范偏差中，C12/C23 为等价语义用词差异（非隐性漂移），C17（FR-ALLN-013 chips 侧）为 P0 FR 的**显式、机核自紧、预算受限**的部分落地（`PENDING_ITEMS['FR-ALLN-013-chips']` 补上即门禁红）——不阻塞 validate，但必须由 v5-2 闭合，并建议在父 spec 消除「机制 vs chips」口径不一致。改进项 5 项（含 1 项计数登记订正）建议修复轮处置；**代码本体零改动需求**（`src/**` / `test/**` 均不改，登记类问题归修复轮）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 静态审查：C1~C34 逐项；HEAD `4d96f6b`；独立复跑 9 项门禁 + 迁移等价对账 + 双契约程序比对 + 红线逐字节；结论 ⚠️ 有条件通过 / 0 阻塞 / 5 改进 / 3 观察） | 2026-09-22 | SDDU Review Agent |
