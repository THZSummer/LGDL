# 审查策略（review.md）：specs-tree-ian-2-abolish-composer

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md`（v1.0 · 263 行）· `plan.md`（v1.0 · 151 行）· `tasks.md`（v1.0 · 25 任务）· `build.md`（v2.0 · R1+R2 · 25/25 终态）· 父 `../spec.md` + `../plan.md`（`ADR-IAN-004~010`）+ 上游叶 `../specs-tree-ian-1-free-input-next/`（validated）
> **审查对象范围**: 叶2 = `feature/web-cli-plugin` @ `5ad5e91`（R1 `58967e3` + R2 `796a7af` / TREE `5ad5e91`；25/25；叶基 `0d0fd85` / R2 基 `cea2922`）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-25
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-25
> **更新说明**: 初始创建（叶2 = 拆除叶 / 法四修订叶的自主审查清单：C1~C31，覆盖 ABOL / CONV / 重锚 / LAW4 / X-IAN SUPERSEDE / 通道唯一化 / S0'' / GATE / 保护段 / VOL 全部父 FR 切片 + 四维度）
> **说明**: 本叶此前无 `review.md`（ADR-004 §8.1 策略文档）——本轮由 review Agent 依 §1「审查策略自主定义」一次性补齐策略 + 报告（编排器指令即授权，未另行停机确认）。

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查对象 | 叶2 全范围（R1 W04+W05+W06 核心 + R2 W06 收口轮） |
| 审查文件 | 源码 14（MODIFY；R2 对 `src/**` 零改动）· 测试 20+（含 1 NEW `law4-input-as-next`）· 台账 2（`v4-supersession-ledger.json` / `v4-density-baseline.json`）· SDDU 5（含 `v4-chat/spec.md` 三处修订） |
| 通过项 | 27 |
| 改进建议 | 4 |
| 阻塞问题 | 2 |
| 审查项总数 | 31 |

---

## 2. 自主审查清单（C1~C31）

> **审查对象来源**：`spec.md` §4（父 FR 切片 ≈40 条，按 §4 表分组）/ §5（NFR）/ §6（EC）→ 逐组核验；`plan.md` §4 十七项设计定案 + §5 文件影响 + 父 `ADR-IAN-004~010` → 架构遵循；`build.md` 文件变更清单 / 门禁对账 / 体积五要素 / 偏差登记 → 覆盖与诚实性；`src/**` + `test/**` + `docs/*.json` → 代码质量 / 测试质量 / 台账完整性。
> **质量门槛**：spec §4 的每个 FR 分组 ≥ 1 Cx（ABOL / CONV 终态 / 重锚 / LAW4 / R6Q+SUPERSEDE / S0'' / GATE / 保护段 / VOL 全覆盖）· 四维度各 ≥ 1 Cx。

| # | 审查对象 | 审查基准 | 维度 | 审查方法 |
|---|---------|---------|------|---------|
| C1 | DOM/CSS 真退役（三 id 元素不存在，非 `hidden`；6 条 CSS 无死规则） | FR-IAN-040 / 041 / 049 · 父 ADR-IAN-004 §①步2 | 规范符合性 | 源码走查（`index.html`）+ `law4-input-as-next` L4-1 / `density-thresholds` ③ + 亲跑 |
| C2 | 双写者 / `fallbackOpen` 锁存 / 设置态漏调护栏消解 | FR-IAN-042 / 043 / 044 | 代码质量 | `src/**` 标识符零命中核 + 注释走查 |
| C3 | 测试钩子 `revealFallback`/`hideFallback` 重锚（只操作卡内，无死写点） | FR-IAN-045 · ADR-IAN-005 §① | 代码质量 | `sidepanel.ts` 钩子切片 + `l0/shell.ts` 写入面核 |
| C4 | 登记退役（`NEVER_FOLDABLE` 14→13 ∧ `RETIRED_CONTAINER_IDS` 13→16 ∧ PRESERVED 移三项） | FR-IAN-046 / 047 | 规范符合性 | 生产常量直读 + `l0-disclosure` / `host-registry` / `density-thresholds` 亲跑 |
| C5 | 陈旧注释同步（`FR-IAN-048` 四处） | FR-IAN-048 | 代码质量 | `grep` 全 `src/**` 残留面走查 |
| C6 | 四处兜底入口收敛终态（去「双 reveal」；卡内唯一载体；`op.describe` 有值相不变） | FR-IAN-050 / 051 / 052 | 规范符合性 | `revealAskFallback` 调用链切片 + `S0C-12` 真面板 |
| C7 | `#send-reason` 保留（状态提示 ≠ 输入面）+ `sendDisabled` 仅异常态（在飞不硬禁用） | FR-IAN-053 / 054 · ADR-IAN-005 §②③ | 规范符合性 | `view-model.ts#sendDisabledReason` 切片 + journey `#11g` |
| C8 | draft 重锚流内 `#ask-input`（空安全）+ 引导改指流内 next 项 | FR-IAN-055 / 056 · EC-IAN-011 | 规范符合性 | `sidepanel.ts#getDraft/setDraft` 走查 + `ONBOARDING_TEXTS[4]` |
| C9 | 法四三处一致（`v4-chat/spec.md:116/:225/:385` 逐字核心句） | FR-IAN-061 · AC-IAN-008 | 规范符合性 | 三行原文逐字比对 |
| C10 | 法四 old→new 逐字台账（`old/new/理由/日期/落点 file:line`）∧ 「半修即红」判据载体 | FR-IAN-060 / 062 · ADR-IAN-006 §①②③ · AC-IAN-008 | 规范符合性 | 台账 JSON 全字段检索 + 门禁读源面检索 |
| C11 | 法四机核门禁 `law4-input-as-next.test.ts`（L4-1~6 + 双向反证 + 禁恒真 + 真源切片） | FR-IAN-064 | 测试质量 | 门禁全文走查 + 亲跑（含注入必红） |
| C12 | `redlineRemap` 追加 + 老条目逐字保留（6→7→8） | FR-IAN-062 · ADR-IAN-006 §①步4 | 架构一致性 | 台账直读（8 条 + 老条目内容核） |
| C13 | X-IAN-1~11 台账编号与逐条登记（父 §12 语义；ID 不冲突） | FR-IAN-080~091 / 102 · AC-IAN-010 / 020 | 架构一致性 | `xIianLedger` / `xIianLedgerLeaf2` 直读 + 父 §12 映射比对 + tasks `215` 验收比对 |
| C14 | X-IAN-8~11 终态登记（draft / NEVER_FOLDABLE / 引导 / binding） | FR-IAN-087~090 / 102 | 架构一致性 | 台账直读 + `xIianLeaf2Problems` 亲跑 |
| C15 | `requestTurn(` 恰 1（唯一生产输入提交点）+ `op-wiring` 重锚 + 反证 | FR-IAN-021 / 085 · O-IAN-008 | 规范符合性 | 调用点亲数 + `op-wiring` 亲跑 |
| C16 | R6 入口 / 回填载体唯一化 + TA-4 重锚（删回填仍必红） | FR-IAN-031 / 032 / 086 | 规范符合性 | `restoreFreeInputDraft` 切片 + `turn-arbitration` 亲跑 |
| C17 | `ACT_TO_OP` 恰 6 / 集 A 9 / 零新增载体（`KIND_SET` 40 ∧ 12 kind ∧ 零宿主） | FR-IAN-017 / NFR-IAN-007 | 规范符合性 | 生产常量直读 + `insight-no-escalation` 亲跑 |
| C18 | S0''-B 终态（node + Chromium；流外零输入面 + 旧面零可达） | FR-IAN-070 / 072 / 073 / 074 · ADR-IAN-009 | 测试质量 | `test:s0-self-driven` 亲跑 + `s0-chain.mjs` 单源核 |
| C19 | 反证非恒真（注入 `<form id=composer hidden>` / 三 id 回流 ⇒ 必红） | EC-IAN-017 · R-IAN-902 | 测试质量 | law4 反证① / S0C-12 反证 / journey `#15c` 亲跑 |
| C20 | 人工面 M3 / M4 如实登记（不冒充 PASS） | AC-IAN-027 · R-IAN-910 | 测试质量 | `xIianGateReconciliationLeaf2.manualFaces` 直读 |
| C21 | 18 门禁三态对账（保留 / 等价重锚 / 显式取代）+ `assertionsRemoved=0` | FR-IAN-100~106 | 测试质量 | `xIianGateReconciliationLeaf2`（20 行）直读 + `xIianLeaf2GateProblems` 亲跑 |
| C22 | T220 三 Chromium 门禁法四等价重锚（`redlineRemap` 8 / 不在 `zeroDiffFiles` / 断言只升不降） | FR-IAN-085 / 103 / 104 · ADR-IAN-008 §③ | 架构一致性 | 三文件 diff 走查 + 断言计数核 + 登记载体核 |
| C23 | `gate-integrity` 下界只增（`law4-input-as-next`）+ `CHROMIUM_GATES === 9` 不动 | FR-IAN-105 | 测试质量 | 门禁常量直读 + 亲跑 |
| C24 | journey 保护段八步显式取代（新 pin 逐字节复算） | FR-IAN-080~091 · ADR-IAN-007 §① | 测试质量 | `sha256`/起止字节亲算 + `test:supersession` 亲跑 |
| C25 | binding 保护段 keep 字节中立（sha + `startByte` 双绿） | FR-IAN-083 / 090 · ADR-IAN-007 §② | 测试质量 | `sha256`/起始字节亲算 + `test:binding` 亲跑 |
| C26 | 体积叶2 净负收口重登记（−548 B；A 列目标带未达如实登记；两叶 Σ +6,631） | FR-IAN-112~115 · NFR-IAN-001 · ADR-IAN-010 | 规范符合性 | `stat` 亲测 + `size-ruling-vol3` 亲跑 + 台账五要素直读 |
| C27 | 冻结面零容差 + 载体红线（`content.js`/`pick-layer.js` sha；`KIND_SET` 40 / 12 kind / 零宿主 / 特权恒 gesture） | NFR-IAN-005 / 007 · NFR-IAN-002/003 | 代码质量 | `sha256` 亲测 + `insight-no-escalation` 亲跑 |
| C28 | 代码质量（可读性 / 职责单一 / 错误处理 / 硬编码 / 冗余） | §5.1 | 代码质量 | `git diff` 全量走查（14 源文件） |
| C29 | 测试质量（判据有效性 / 反证实跑 / 元判据 / 双面单源 / 弱断言） | §5.4 | 测试质量 | 新老门禁全文走查 + 亲跑 |
| C30 | 架构一致性（plan §5 文件影响对齐；零改上游 `turn-queue.ts`/base/判定链；ADR 遵循） | plan §5 · NG-IAN-003~006 | 架构一致性 | `git diff --stat` 全量对照 |
| C31 | 台账完整性（`counts` 前移 / `knownLimitations` / 叶段 scope 复算 / `modifiedRanges`） | FR-IAN-102 / 114 | 架构一致性 | 台账直读 + `test:supersession` 亲跑 |

> **质量门槛核对**：spec §4 各分组全部 ≥ 1 Cx —— ABOL C1~C5 · CONV C6 · 重锚 C7~C8 · LAW4 C9~C12 · R6Q/SUPERSEDE C13~C16 · S0'' C18~C20 · GATE C21~C23 · 保护段 C24~C25 · VOL C26~C27 · 通道唯一化 C15~C17。四维度各 ≥ 1 Cx（代码质量 C2/C3/C5/C27/C28 · 规范符合性 C1/C4/C6~C10/C15~C17/C26 · 架构一致性 C12~C14/C22/C30/C31 · 测试质量 C11/C18~C21/C23~C25/C29）。✅ 满足。

---

## 3. 审查详情（方法学索引）

| 维度 | 方法 |
|------|------|
| 代码质量 | 逐文件走查（命名 / 职责 / 错误路径 / 硬编码 / 冗余）；对照 §5.1 |
| 规范符合性 | spec FR/NFR/EC 逐组对照实现位置；`grep` + 源码切片 + 亲跑门禁证据 |
| 架构一致性 | 对照 plan §4/§5 + 父 `ADR-IAN-004~010`；`git diff` 全量；常量直读；台账 JSON 全字段检索 |
| 测试质量 | 判据/反证/元判据走查；亲跑 node + Chromium；覆盖缺口评估 |

## 4. 改进建议 / 5. 阻塞问题 / 6. 结论

见 `review-report.md`（每轮执行独立产出；策略文档不变时可多轮迭代）。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（叶2 自主审查策略 C1~C31；四维度 + 九个 FR 分组覆盖；亲跑 node + Chromium 全量门禁与体积/冻结面终核方法） | 2026-09-25 | SDDU Review Agent |
