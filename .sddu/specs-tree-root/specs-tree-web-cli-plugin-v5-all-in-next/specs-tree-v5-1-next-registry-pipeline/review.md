# 审查策略：specs-tree-v5-1-next-registry-pipeline

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md` v1.0、`plan.md` v1.0（ADR-V5-001 / 002机制侧 / 008）、父 `../spec.md` v1.0（FR-ALLN-030~038 / 055~059 / 010·011·013 / 100~103 / 112·113·115 / 120~125 / 130·133）、`build.md` v1.1（R1 101~113 / R2 114~122）、`tasks.md` v1.0
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建（本叶 = 依赖链首叶；审查策略 C1~C34 自主定义，覆盖 33 条承载 FR × 4 维度；策略与 R1 报告同轮产出——用户指令直接驱动 R1 执行，故策略确认并入本轮）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | **30 个**（产品 `src/**` 12 + 门禁 / 测试 12 + 台账 2 + 叶 SDDU 文档 4） |
| 审查清单项 | **C1~C34**（覆盖 33 条承载 FR，四维度 ≥1 条） |
| 独立复跑门禁 | **9 项**（`npm test` / `design-contract` / `next-registry`+`next-pipeline` / `next-dispatch-diff0` / `next-obligation-table` / `blocked-terminals` / `gate-integrity` / `supersession` / `test:recommendation`） |
| 独立 grep 对账 | 瘦分发 3 项 / 单源 5 项 / 冻结面 4 项 / 预算 2 项 |

## 2. 审查对象提取（spec + plan + build + 产物）

- **spec.md**：33 条承载 FR（§4）+ 7 条 NFR（§5）+ 8 条 EC（§6）+ 10 条 AC 锚点（§7）→ 逐项在产物中找对应实现。
- **plan.md**：ADR-V5-001（Definition / Provider / Consumer 三件套 + 两集模型 + 迁移表）、ADR-V5-002（机制侧四态管线 / 快照语义位）、ADR-V5-008（双稿双 shim）→ 逐条架构遵循性。
- **build.md**：§2 文件变更（R1 20 / R2 15 文件）+ §4 SG-1 + §5 门禁复跑 + §6 **五条未闭合项** → 覆盖完整性 + 未闭合项正当性。
- **产物**：`src/ui/sidepanel/next-registry/{definition,registry,providers,pipeline,dispatch,obligation-table}.ts`、`recommend.ts`、`sidepanel.ts`、`cards/nextstep.ts`、`test/{next-registry,next-pipeline,next-dispatch-diff0,next-obligation-table,blocked-terminals,g-design-map,design-contract,gate-integrity,recommendation-sources,local-act-wiring,authorize-chip-wiring}.ts`、`test/ui/recommendation.mjs`、`docs/v4-supersession-ledger.json`、`docs/v4-density-baseline.json`。

## 3. 自主审查清单（C1~C34）

**四维度指引**：① 代码质量 ② 规范符合性 ③ 架构一致性 ④ 测试质量。每条 Cx 标注维度；覆盖矩阵见 §5。

| # | 审查对象 | 审查基准 | 维度 | 审查方法 |
|---|---------|---------|:--:|---------|
| C1 | Definition 常量（6/2/5/MOUNT_MODE/BLOCKED_TERMINALS/NextCtx 7 源） | FR-030/031/033/035 · ADR-V5-001 | 规范 | 读 definition.ts + 常量逐字对账 |
| C2 | `validateNextProvider` loud（未知 deps / 非法 mode / 挂载点不符 / priority / chips） | FR-031/033/035 · EC-001/002/003 | 规范 | 读 registry.ts + 独立复跑 next-registry |
| C3 | `resolveOrder` = `(priority asc, prepend desc, seq asc)`；顺序不来自数组位置 | FR-031/032 · R-ALLN-902 | 架构 | 读 registry.ts + 置换测试 + 反证 |
| C4 | `registerNextProvider` 可逆幂等 unregister / overwrite 整行替换 / 单点写入 | FR-030/032 · EC-020 · NFR-010 | 规范 | 读 registry.ts + NR-3/4/5/8 + grep push/splice |
| C5 | 内置 provider 迁移等价（4 规则 / 5 触发 / chips 文案 / 抑制 / 间隔 / 上限） | FR-030~038/013 · ADR-V5-001 迁移表 | 规范 | 新旧 `recommend.ts` diff 逐条对账 |
| C6 | `recommend.ts` 常量逐字保留 + `RECOMMEND_MODULE_WHITELIST` 扩项记录 | FR-013 · T-d | 规范 | diff + grep 常量 |
| C7 | R5② 注册失败 loud（拒绝 + 红显语义位） | FR-034 · EC-001/002/003/004 | 规范 | 读 registry.ts + NR-1/2/9 |
| C8 | R5③ 快照 / 回滚语义位（多表、改状态 op、失败整体回滚） | FR-034 · EC-005/011 | 测试 | 读 pipeline.ts + NP-5 注入驱动 |
| C9 | `runOp` 四态（params? / consent? / execute / receipt）+ 缺省语义 | FR-055 | 规范 | 读 pipeline.ts + NP-1/2 |
| C10 | `pendingOps` FIFO + `MAX_OPEN_ASKS` 仲裁 + 本地回合不入队 | FR-055 · EC-017 | 规范 | 读 pipeline.ts + NP-4 |
| C11 | `ACT_TO_OP` 恰 6 行、双向可查、`OP_TO_ACT` 派生 | FR-056 | 规范 | 读 dispatch.ts + NP-6 |
| C12 | chip `data-op` 绑定；`data-act` 降渲染别名；分发依据 | FR-057 · LNG-V5-1-003 | 规范 | 读 cards/nextstep.ts + sidepanel.ts + grep 回读 |
| C13 | 瘦分发：零 per-op 分支 + 唯一分发入口 + 四操作哈希不变 | FR-058 · AC-ALLN-005 · N22 | 架构 | 读 sidepanel.ts + 独立复跑 next-dispatch-diff0 + grep 调用点 |
| C14 | 本地 op 语义对齐（零 `requestTurn` / 单一生产入口 / 不受 pending 门控） | FR-059 · R-ALLN-905 | 规范 | 读 sidepanel.ts bindPanelOps + 复跑 local-act-wiring |
| C15 | `BLOCKED_TERMINALS` 恰 5 项单源（唯一例外点正当性） | FR-010 · NFR-004 | 规范 | 全仓 grep 字面量 + blocked-terminals 复跑 |
| C16 | 阻塞终态必有可达 next 的**机制基础**（候选由注册表产出） | FR-011 · AC-ALLN-002(机制) | 架构 | 读 providers/pipeline + 义务表 chips 无悬空 |
| C17 | `site.unauthorized` 常驻候选（`when` 与 firstRun 无关；chips 含 `op.authorize`） | FR-013 · P0 | 规范 | 读 providers.ts + blocked-terminals 复跑 + 抽 provider |
| C18 | 双契约 F 冻结不替换（4 常量 + 60 行逐字） | FR-100/103 · N21 | 架构 | `git diff` design-contract 删除行 = 0 |
| C19 | G 稿 + 127 断言入册（4 常量 + 127 行映射 + id 集相等） | FR-101 · ADR-V5-008 | 规范 | 抽 shim 断言 ↔ `G_ASSERTION_MAP` 全量比对 |
| C20 | `designContractChanges` 五要素登记（空 → G 条目） | FR-102 · AC-ALLN-017 | 规范 | 读 ledger + 复跑 design-contract |
| C21 | X3：act 闭集 → opId 集等价重锚（判据力只升不降） | FR-112 · FR-120 | 规范 | 读 recommendation-sources + 复跑 |
| C22 | X4：G 入契约；F 不静默替换 | FR-113 | 架构 | design-contract G 块 + 反证 |
| C23 | X6（chip 侧）：`data-op` + 注册表候选 + 统一管线 | FR-115 | 规范 | 读 nextstep/dispatch + 复跑 recommendation.mjs ⑮ |
| C24 | 取代一律等价重锚（`modifiedRanges[]` 4 条 equivalent-rewrite） | FR-116 | 规范 | 读 ledger 4 条目字段 |
| C25 | 断言零删除零降级、计数只增（本叶面） | FR-003 | 测试 | R1..R2 test diff 删除行 + 门禁计数对账 |
| C26 | 共享面恰一次登记（design-contract / 台账） | FR-004 | 架构 | ledger `designContractChanges` 恰 1 条 |
| C27 | 门禁等价重锚清单逐项（recommendation-sources / local-act-wiring / authorize-chip-wiring / recommendation.mjs / design-contract / supersession） | FR-120 | 规范 | 读三处 X3 对账 + subscription |
| C28 | 反证不空转（每条新 / 改判据两段证伪） | FR-121 · NFR-007 | 测试 | 读 `expectFailPattern` + 复跑注入 |
| C29 | `knownGap` 一致性机核 | FR-123 · EC-018 | 测试 | 复跑 supersession |
| C30 | 新门禁纳入 `gate-integrity` 受审集合 | FR-125 | 测试 | 读 gate-integrity diff + 复跑 |
| C31 | 体积五要素（本叶增量）+ 归因算术自洽 | FR-130 · NFR-005 | 规范 | 读 size-baseline + 实测 sidepanel bytes |
| C32 | 红线逐字节（content / pick-layer / 判定链 / v3 台账 / design） | FR-133 · AC-ALLN-022 | 架构 | sha256 独立复算 + git diff 面 |
| C33 | 证明义务表 9 行四要素 + 表尾明示义务 | FR-036 | 规范 | 读 obligation-table.ts |
| C34 | 证明义务表静态机核（行数 / opId 集 / 无悬空 / 三类注入） | FR-037 · FR-038 | 测试 | 复跑 next-obligation-table |

## 4. 重点风险审查口径（用户 brief §1）

1. **迁移等价性（X3 核心）**：以 `git show 036ad03~1:recommend.ts` 为基线，逐条重算旧 4 规则（`activeRecoveryTrigger` 首命中序、`candidateRules` 谓词、`RECOVERY_CHIP_ORDER` 序、`RECOVERY_CHIP_TEXT` 文案、`recommendNextStep` 4 抑制原因、`MAX_*` / 间隔上限）与新内置 provider 的等价性；把 `site` 触发（旧谓词本就无 `firstRun`）单列为「Δ=0」事实，扫描**其余**隐性漂移（兜底 notice 退役、无 `value` 路径）。
2. **瘦分发真实性**：独立 grep `handleCardAction` 体、`dispatchChipAction(` 调用点、`ACT_TO_OP` 声明处、`getAttribute('data-act')`、`data-op` 读写面——不采信 R1 自报。
3. **双契约诚实性**：`design-contract.test.ts` R1..R2 diff 删除行必须为 0；`G_ASSERTION_MAP` 127 行与 `option-g-shim.mjs` 实测断言（id + clause + 序）全量程序比对；F∩G 交集独立复算 = 51；尾锚 117 偏差登记核实。
4. **预算边界**：`dist/sidepanel.js` 实测 bytes vs 8,800 B 预算与 532,680 ceiling；R2 `src/**` 变更面；对照 build §6 五条未闭合项判断「体积原因」 vs 「本该本轮」。
5. **注册表契约 v2 七点**：R1~R7 逐点定位；R5 的「注册 loud」与「快照回滚位」是否**真实可触发**（存在反证 / 注入驱动）。
6. **BLOCKED_TERMINALS 单源**：独立扫描 5 字面量在 `src/**` 的全部出现点；例外点登记正当性。
7. **门禁质量**：5 条新门禁是否锁实义（防恒真）；各条 `expectFailPattern` + 反证；独立抽跑对账。
8. **红线独立复验**：冻结面 / 保护段 / 阈值 / 台账逐字节。
9. **spec FR↔产物收敛**：抽 6 条 FR 定位实现。

## 5. 覆盖矩阵（FR → Cx）

| FR 族 | 覆盖 Cx |
|---|---|
| FR-ALLN-030~038（CONTRACT） | C1/C2/C3/C4/C5/C7/C8/C33/C34 |
| FR-ALLN-055~059（PIPE） | C9/C10/C11/C12/C13/C14/C23 |
| FR-ALLN-010/011/013（LAW7 机制） | C15/C16/C17 |
| FR-ALLN-100~103（DESIGN） | C18/C19/C20/C22 |
| FR-ALLN-112/113/115/116（SUPERSEDE） | C21/C22/C23/C24 |
| FR-ALLN-003/004（治理） | C25/C26 |
| FR-ALLN-120/121/123/125（GATE） | C27/C28/C29/C30 |
| FR-ALLN-130/133（VOL） | C31/C32 |
| 代码质量（跨切） | C5/C9/C14/C16 |

> **质量门槛**：33 FR 全覆盖（每条 ≥1 Cx）；四维度各 ≥1 Cx；Cx 总数 34 ≥ max(33, 4)。不适用项（本叶无）显式标注。

## 6. 结论判定口径

| 条件 | 要求 |
|------|------|
| 阻塞问题 | 0 |
| 改进项 | < 5 |
| 规范符合率 | 100% |

- ✅ 通过 = 阻塞 0 ∧ 改进 <5 ∧ 规范偏差 0；
- ⚠️ 有条件通过 = 阻塞 0，但存在登记订正 / 规范部分符合 / 改进 ≥5；
- ❌ 不通过 = 存在阻塞（须重新实现）。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（C1~C34 自主审查清单；覆盖 33 条承载 FR × 四维度；重点风险口径 = 用户 brief §1 九项） | 2026-09-22 | SDDU Review Agent |
