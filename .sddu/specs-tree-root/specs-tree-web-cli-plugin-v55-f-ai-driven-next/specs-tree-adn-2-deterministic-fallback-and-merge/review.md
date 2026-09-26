# 审查报告：specs-tree-adn-2-deterministic-fallback-and-merge（审查策略）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md`（v1.0）/ `plan.md`（v1.0）/ `tasks.md`（v1.2）/ `build.md`（v2.0，R1+R2）；父 `spec.md` / `plan.md`（ADR-ADN-004~010）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（ADN-2 兜底 / 合并 / 护栏 / 首开边界 / 门禁重锚叶自主审查清单 C1~C32；四维度：代码质量 / 规范符合性 / 架构一致性 / 测试质量）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | **15 个主审**（2 `src/**` 生产 + 11 `test/**` 本轮改动 + 2 `docs/**` 台账/体积）+ **8 个基准/横切**（`providers.ts` / `registry.ts` / `dispatch.ts` / `definition.ts` / `guard.ts` / `ai-drive.ts` / `op-table.ts` / `test/ui/fixtures/s0-chain.mjs`）+ 1 `.sddu` 父 ADR |
| 通过项 | 27 |
| 改进建议 | 7（**0 阻塞**） |
| 阻塞问题 | 0 |

**本叶性质**：**末叶 / 回归与判据叶** —— 在叶1 已建成的通道与 5 道校验链之上，把确定性注册表退为**兜底与安全闸**，并立**合并 / 优先级 / 去重 / 上限**（同单卡位 + 前 N ≤3 + R6 扩展 + 替换）与**门禁强度不降**（升级 6 等价重锚 + X-ADN 台账终态 + 保护段 keep + 体积逐叶重登记）。核心风险 = R-ADN-003（兜底失守 ⇒ R8 零死端回归）/ R-ADN-004（门禁静默降强度）。

**审查对象 = 未提交工作树 + R1 提交 `068054c`**：`git status` 18 文件（11 `test/**` + 2 `docs/**` + 4 `.sddu/**` + 1 父 ADR 未改）；`src/**` / `packages/web-cli-base/**` / `manifest` / `journey.mjs` / `binding.mjs` **零 diff**（已 `git diff --name-only` 逐项确认）。

---

## 2. 自主审查清单（C1~C32）

**审查对象来源**：
- `spec.md` §4 FR 表 **30 行**（FALLBACK 040~046 / MERGE 050~056 / GUARD 060~065 / OPEN 070~073 / S0''' 083·084 / SUPERSEDE 090~095·097~101 / GATE 110~117 / VOL 121~125）、§5 NFR-ADN-001~016、§6 EC-ADN-006~020、§7 验收锚点、§9 风险
- `plan.md`：§3 两形态点（合并 / 关断，均推荐 A）、§4 **18 项设计定案**、§5 文件影响 13 项、§6 风险 11 条（含新增 R-ADN-912）
- `build.md` v2.0：R1（`TASK-ADN-201~216`）+ R2（`TASK-ADN-217~223`）文件变更与门禁对账、§0.1 两处构建期纠错、§5.2 遗留 ①~⑥
- 产物：`src/ui/sidepanel/recommend.ts`（R1 改动）+ `sidepanel.ts`（R1 改动）+ `test/**` 11 文件 + `docs/v4-supersession-ledger.json` + `docs/v4-density-baseline.json`

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | **确定性兜底三情形**（未配 / AI 未产出 / 非法被拦 ⇒ 确定性产卡） | FR-ADN-040/043 · ADR-ADN-005 §① | 规范符合性 | `candidateRules` → `chipsFor` 空即不占规则位（`recommend.ts:513-515`）走查 + `ai-next-candidate` S0PPP 四支线读数 + `r8` 兜底判据 |
| C2 | **free-input 终端恒常驻**（恒最末；非 `.next-chip`；不进 `MAX_CHIPS_PER_CARD`） | FR-ADN-041 · ADR-005 §② | 规范符合性 | `freeInputTerminal` / `freeInputOnlyCard` / `terminal:true` 传播走查 + Chromium `terminal.parentElement.lastElementChild === terminal` 三面断言 |
| C3 | **floor 语义保持**（`empty` + 终端 ⇒ 最小卡；`safety` **不走** floor） | FR-ADN-042 · EC-ADN-019 | 规范符合性 | `recommendNextStep:585-596` 四道门走查 + `r8-open-next-entry#fallbackProblems`（含 `safety` 分支）+ `free-input-next` |
| C4 | **未配 LLM ⇒ 纯确定性（现状逐字 / 零网络）** | FR-ADN-043 · EC-ADN-008/013 · EC-ADN-007 | 规范符合性 | node D 支线（`risks:['llmBlocked']`）+ `providers.ts#OPS_RECOVERY_ROWS` 走查 + `ai-next.ts` 零 fetch/chrome/时钟扫描 |
| C5 | **零死端**（任何路径均有可达 next） | FR-ADN-044 · NFR-ADN-010 | 规范符合性 | 终端恒真 `when` + floor 铸造点走查 + `test:dead-end` 登记（53） |
| C6 | **兜底判据可判（非恒真）**：删兜底 / 删终端 ⇒ 必红 | FR-ADN-045 · AC-ADN-019 | 测试质量 | `r8-open-next-entry#fallbackProblems` 反证（恒真 when → 恒假 / 删 floor / 删终端条件）+ sha256 逐字节还原 |
| C7 | **在飞（`pending`）语义不变**（不产卡） | FR-ADN-046 · NFR-ADN-011 | 规范符合性 | `recommendNextStep` 首门 `busy ⇒ suppression:'pending'` 走查 + `turn-arbitration` / `turn-queue` 零 diff |
| C8 | **同台竞争同一单卡位**（`MAX_NEXTSTEP_CARDS_PER_ROUND = 1` 不动） | FR-ADN-050 · X-ADN-3 | 规范符合性 | `recommend.ts:597-598` `slice(0, …)` 走查 + `recommendation-sources` 常量断言 + `ai-next-candidate` 单卡读数 |
| C9 | **多候选取前 N（≤3）+ 截断**（不溢出 / 不新增卡） | FR-ADN-051 · EC-ADN-006 | 规范符合性 | `candidate()` 的 `chips.slice(0, MAX_CHIPS_PER_CARD)` + node 4 候选 ⇒ `mChipCount===3` / `mCardCount===1` |
| C10 | **`NEXTSTEP_PRIORITY` 恰 4 不动（AI 骑 `ref-action` 位）** | FR-ADN-052 · ADR-004 §③ · X-ADN-4 | 规范符合性 | `recommend.ts:60` 逐字 + `providers.ts` 第 12 行 `rule:'ref-action'` + `recommendation-sources` 恰 4 |
| C11 | **R6 同因去重扩展覆盖 AI**（`refActionDigest` 家系**逐字复用**） | FR-ADN-053 · EC-ADN-012 · ADR-004 §⑤ | 规范符合性 | `aiNextAfterCompleted` / `aiGatedInput` 逐行走查（pre-ctx 预过滤）+ `recommendation-sources` R6 扩展判据 + 反证 |
| C12 | **单卡 / 3-chip / 密度阈值 7/15·9/20·17/35 逐字不动** | FR-ADN-054 · EC-ADN-015 | 规范符合性 | 常量逐字 + `test:density`（242）登记 + `density-thresholds` 窄视口断言 + `v4-density-baseline.json` tolerance/cap/档位零改 |
| C13 | **替换口径双向可判**（AI 在场 ⇒ 无陈旧 `ref-action` chip；缺席 ⇒ 照旧） | FR-ADN-055 · R-ADN-907 · ADR-004 §⑥ | 规范符合性 | node `aReplaced` / B / C 三向读数 + s0-⑲ / ⑬C 真面板 + **E2 移交裁决**（见报告 I-7） |
| C14 | **渲染零 per-op 分支**（`data-op` 经 `ACT_TO_OP`/`OP_TO_ACT` 单源） | FR-ADN-056 · ADR-004 §⑦ | 架构一致性 | `dispatch.ts#ACT_TO_OP` 恰 6 行走查 + `next-dispatch-diff0` 门禁零改 + `OP_TO_ACT[opId] ?? opId` 单点 |
| C15 | **六常量同过**（AI 候选复用 `guard.ts` 单源） | FR-ADN-060 · ADR-006 §⑤ | 规范符合性 | `proactivity-guard#GUARD_CONSTANT_NAMES` 各恰一处 + `secondThresholdProblems` 双向扫描 |
| C16 | **提案不耗回合预算**（产出不记账；自动成回合才 −1） | FR-ADN-061 · R-ADN-906 · ADR-006 §③ | 规范符合性 | `budgetAccountingProblems`（`noteProactive` 恰 1 ∧ 门在 `if (out.ok)` 内 ∧ 产出路径零记账）+ 反证 + 预算耗尽真抑制 |
| C17 | **关断偏好两相**（显示相注入前检查 + 按下相 `guardAllowed`） | FR-ADN-062 · EC-ADN-011 · X-ADN-11 | 规范符合性 | 显示相：`sidepanel.ts:2067-2072` + `displayPhaseGateProblems` + 反证；按下相：`pressDecision(guardAllowed:false) ⇒ blocked:'guard'` |
| C18 | **零第二阈值**（越限经注入判据；显示上限不得作语义阈值） | FR-ADN-063 · ADR-006 §⑤ | 规范符合性 | `secondThresholdProblems`（六常量名 / 阈值形状字面量双向扫描，含反证）+ `AI_NEXT_LABEL_MAX=48` / `AI_NEXT_PARAM_MAX=128` 登记为显示/结构上限 |
| C19 | **自动按下路径 diff = 0**（`pressCandidate` → `dispatchChipAction` 恰 1 → `op.turn` 槽） | FR-ADN-064 · ADR-003 | 架构一致性 | `src` 零 diff（`ai-drive.ts` 未改）+ `op-wiring`（`dispatchChipAction` 恰 1 / 自动按下点恰 1） |
| C20 | **在飞仲裁四值逐字**（`blocked:busy` / `ai-deferred` …） | FR-ADN-065 · EC-ADN-010 | 规范符合性 | `turn-arbitration` 四值断言（R1 +45 行纯加法）+ `ARBITRATION_RESULTS` 未改 |
| C21 | **首开保持确定性 + 首屏零 LLM 往返依赖** | FR-ADN-070/071 · EC-ADN-013 | 规范符合性 | `openDeterministicProblems`（入口体禁 `aiNext`/`pendingAiNext`/`proactivity`）+ `openSteadyInput` 结构事实 + 反证 |
| C22 | **让位 firstRun 语义保持（零双卡）+ AI 初始 next 明列后续轮** | FR-ADN-072/073 · NG-ADN-014 / PD-ADN-001 | 规范符合性 | `firstRunEntryHandled` / `openEntryHandled` 走查 + R8-6 逐字保留 + `sidepanel.ts:2080-2083`（`onboarding.firstRun` 仅 `trigger==='firstRun'` 置位） |
| C23 | **S0''' 四支线双面**（node 真源切片 + Chromium 只加断言）+ **人工面如实登记** | FR-ADN-083/084 · ADR-007 · AC-ADN-017/030 | 测试质量 | `ai-next-candidate#s0pppTerminalReading`（生产 `recommendNextStep`/`admitCandidate` 实跑）+ s0-⑬/⑲ 真面板 + M1~M5 四处 `⏳ 未执行` |
| C24 | **X-ADN-1~11 台账终态**（已发生 4 / 未发生取代 6 / 等价重锚 1；老条目逐字保留） | FR-ADN-090~095 / 097~101 · ADR-010 §①② | 架构一致性 | `xAdnLedgerFull` / `xAdnLedgerLeaf2` / `xAdnLedger` 三段落逐行走查 + `xAdnTerminalProblems` 一致性判据 + 老条目 8 行逐字 |
| C25 | **升级 6 门禁等价重锚**（`assertionsRemoved=0` / 反证必实跑 / 下界只增 / `CHROMIUM_GATES=9` / 严格串行） | FR-ADN-110~117 · ADR-009 · AC-ADN-018/022/023/024 | 测试质量 | `gate-integrity` 三态齐对账 + `git show --numstat` 逐文件判「零删除 vs 等价重锚」+ `supersession-ledger#保护段 keep 双绿` |
| C26 | **体积逐叶重登记 + EC-ADN-016 三态 + 跨列不混算** | FR-ADN-121~125 · NFR-ADN-001 · ADR-008 · R-ADN-908 | 架构一致性 | `dist/` 产物字节 / sha 亲测 + `build-meta.json` 逐模块 `bytesInOutput` 对比 `adn2Rows` + `SIDEPANEL_ADN2_FINAL_ROUND` 五要素/三值/两叶 Σ + `v4-density-baseline.json` 同源 |
| C27 | **NFR 面**（base 零 diff / 零新增载体 / `recommend.ts` pure / 零第二 provider / 零新增 LLM 往返 / 法八零明文） | NFR-ADN-002~016 · EC-ADN-014 | 规范符合性 | `git diff --name-only` 零命中（`web-cli-base`/`manifest`）+ `KIND_SET` 40 / 12 kind / `ACT_TO_OP` 6 走查 + `law8-plaintext` 终态零明文断言 |
| C28 | **EC 面**（006/007/009/010/011/012/013/015/016/019/020） | spec §6 · ADR-005~009 | 规范符合性 | 逐条映射到 C4/C7/C9/C11/C12/C17/C20/C21/C26/C6；`KL-N-10` flake 处置（隔离复跑 ≥2 如实记录）走查 |
| C29 | **代码质量（`src` 改动）**：命名 / 职责单一 / 错误处理 / 无硬编码 / 无冗余 | §5.1 方法论 · 项目宪法 | 代码质量 | `recommend.ts` R1 diff 逐行走查（`chipDedupKey` / `aiNextAfterCompleted` / `aiGatedInput`）+ `sidepanel.ts` 1 行显示相关断门走查 |
| C30 | **代码质量（`test` 改动）**：判据可读性 / 无死参 / 无轴混用 / 标签与语义一致 | §5.1 方法论 | 代码质量 | 11 文件 diff 逐行走查（`void rows` 死参 / `adn1R1UnattributedGlueBytes` 混用 / s0-chain「B」标签） |
| C31 | **架构一致性（ADR 逐项 + 单源）** | plan §4 18 项 · ADR-ADN-004~010 | 架构一致性 | §4 定案表 18 行逐项对代码/门禁落点；`ADR-004 §③` 偏差 → **SG-ADN-03 归本审查裁决**（见报告 §4/§7） |
| C32 | **文件影响对齐 + 保护段 keep + 冻结面** | plan §5 · NFR-ADN-005 · ADR-010 §③ | 架构一致性 | plan §5 13 项 ↔ 实际 18 文件逐项（多出项须有理由）+ journey `[43484,59347)`/`7b309258…`/249 行 ∧ binding `[107780,115930)`/`be9ad0e9…` 双绿 + 三冻结面 sha |

> **质量门槛（数量基线法）**：spec §4 共 **30 个 FR 行** → C1~C26 覆盖（组内多 FR 共用 1 Cx 时以「行」为单位不减配）；NFR / EC 各 1 条（C27 / C28）；代码质量 2 条（C29 / C30）；架构一致性 6 条（C14 / C19 / C24 / C26 / C31 / C32）；测试质量 3 条（C6 / C23 / C25）。**Cx 总数 32 ≥ max(30, 4×1)** ⇒ 清单合格。

---

## 3. 审查详情

> 逐项结果见 `review-report.md`（本文档为策略，不定结果）。

---

## 4. 改进建议

> 见 `review-report.md` §5（I-1~I-7）。

---

## 5. 阻塞问题

> 见 `review-report.md` §4（R1：**0 项**）。

---

## 6. 结论

**结论**: 由 `review-report.md` 给出。

---

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（ADN-2 叶 C1~C32 自主审查清单；四维度覆盖；spec §4 30 个 FR 行 ≥1 Cx；ADR-ADN-004~010 逐项落点；含「SG-ADN-03 语义订正」与「E2 夹具能力边界」两条 build 移交项的裁决口径） | 2026-09-27 | SDDU Review Agent |
