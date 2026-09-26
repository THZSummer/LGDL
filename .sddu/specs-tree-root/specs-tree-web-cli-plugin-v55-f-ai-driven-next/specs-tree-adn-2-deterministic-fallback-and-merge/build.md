# 构建报告：specs-tree-adn-2-deterministic-fallback-and-merge

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（v1.0）、本叶 `plan.md`（v1.0）、父 `plan.md` / `spec.md`（ADR-ADN-004~010）、**叶1 `../specs-tree-adn-1-ai-next-produce-and-verify/`（validated，强依赖）**
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-26
> **版本**: v1.0（R1）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-26
> **更新说明**: 初始创建 —— **R1 = W04（兜底与合并）+ W05（护栏与首开）**，`TASK-ADN-201~216`（16 任务）；**W06（`TASK-ADN-217~223`）留 R2**

---

## 0. 本轮范围与结论（R1 = W04 + W05）

| 项 | 内容 |
|---|---|
| R1 范围 | **W04 兜底与合并** + **W05 护栏与首开** = `TASK-ADN-201~216`（16 任务） |
| **留 R2** | **W06 验收与治理** = `TASK-ADN-217~223`（S0''' 终态双面 / 体积收口重登记 / 门禁重锚对账 / X-ADN-1~11 台账终态 / 保护段 keep 双绿 / e2e） |
| spikeGate | **SG-ADN-03 = 可行**（6/6 硬判据 + **1 偏差登记**，详见 §1.1） |
| 交付 | `src`：`recommend.ts`（+66/−5）· `sidepanel.ts`（+5/−1）；`test`：9 文件 **756 行纯加法（0 删除行）**；`_spike` 探针探毕删除（不入提交） |
| 门禁 | `npm test` **1478 → 1500 / 0**（+22）；`test:density` **242/0**；`test:dead-end` **53/0**；`typecheck` PASS；`test:binding` 隔离复跑 ×3 命中 **KL-N-10 同族环境 flake**（如实登记，不阻塞） |
| 冻结面 | 三冻结面（`content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`）+ `packages/web-cli-base/**` + `manifest.json` + `journey.mjs` / `binding.mjs` **零 diff** |
| 体积 | A 列 `603,205 → 604,583 B`（**+1,378 B / +1.35 KB**，临时构建测量，未改 `dist/`）；B 列 ≈ 0；**W06 收口重登记** |

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **16 / 16**（R1；叶内总 23 ⇒ W06 7 项留 R2） |
| 复杂度分布（R1） | S×2（`210` / `214`）/ M×14 |
| 新增文件 | **0**（spike 探针探毕删除，`test/_spike/` 零残留） |
| 修改文件 | **13**（`src` 2 + `test` 9 + 本叶 `state.json` / `tasks.md` + 本 `build.md`） |
| 测试计数 | `npm test` **1478 → 1500**（纯加法；测试文件 **0 删除行**） |

### 1.1 SG-ADN-03（TASK-ADN-201）先验结论 = **可行**

`test/_spike/sg-adn-03-probe.mjs`（探毕删除，不入版本库）**6/6 PASS**：

- **SG-1** `resolveOrder = (priority asc, prepend desc, seq asc)` ⇒ `ai-next`（priority 2, `prepend`）排在确定性 `ref-action`（priority 2, 无 prepend）**之前**（同规则内 AI 优先）；
- **SG-2** AI `when` 为假 ⇒ `seen` 不落 ⇒ 确定性 `ref-action` **照旧接管**（兜底可达）；
- **SG-3** 前 N=**3** 截断（4 条 ⇒ 3 条、仍恰 **1 卡**）；`MAX_CHIPS_PER_CARD = 3` / `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` 不动；`NEXTSTEP_PRIORITY` **恰 4**；
- **SG-4a** `risk-recovery`（卡片优先级 1）命中 ⇒ AI 不显示；
- **SG-5** 反证：去 `prepend` ⇒ 顺序判据可 FAIL（判据非恒真）；
- **DEVIATION（1 项，非机制失败）**：`onboarding` 的**卡片优先级 = `NEXTSTEP_PRIORITY.indexOf('onboarding') + 1 = 3`**，而 AI 骑 `ref-action` 位 ⇒ 卡片优先级 **2** ⇒ 在**冻结规则表**下 AI 天然高于 `onboarding`。ADR-ADN-004 §③ 的「`onboarding`（1）命中时 AI 不显示」按 `NextProvider.priority` 字段读取，与**实际选卡键**（`priorityOf(rule)`）口径不一致。修正需改 `NEXTSTEP_PRIORITY`（本叶红线，禁改）⇒ 登记为**语义订正项**。生产可达性：`onboarding` 需要 `firstRun = !(configured ∧ authorized)`，而 `aiNext` 仅在 `configured` 时产出 ⇒ 二者实际不同时在场，本偏差属纵深防御层口径。

**结论**：核心机制（prepend 赢槽替换 + 前 N=3 合并不破单卡/3-chip）**可行**，按 W04 继续；偏差已登记（见 §5 遗留）。

---

## 2. 文件变更

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | TASK-ADN-204 / 206 | ① `chipDedupKey(opId, text)` = `opId#意图摘要`（复用 `intentDigest` 家系）⇒ `candidateRules` 列表内去重（同项不占第二个槽；既有确定性候选两两不同 ⇒ 逐字同前）；② `aiNextAfterCompleted(candidates, input)` + `aiGatedInput(input)` ⇒ **R6 同因去重扩展覆盖 AI**：构造 ctx **之前**按 `refActionDigest(candidate.ref ?? 'ref_${latestRefNum}', candidate.label)` 预过滤 `session.aiNext`；命中 `input.completedActions` ⇒ 压掉该条。**
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | TASK-ADN-208 | `maybeRecommend` 注入 `session.aiNext` 前追加 `proactivity.enabled()` **显示相关断门**（OFF ⇒ 不注入 ⇒ AI 候选不显示；主题① 确定性 / 手输不受影响）；一处偏好两相（显示相本处 + 按下相既有 `guardAllowed`），**零第二偏好键 / 零第二阈值** |
| MODIFY | `test/recommendation-sources.test.ts` | TASK-ADN-204 / 205 / 206 / 207 / 213 | +169 行纯加法：替换口径双向 / 前 N=3 截断 / 列表内去重 / R6 扩展（含「无预过滤 ⇒ AI 赢槽」反证）/ 规则表恰 4 / ④ 零新 LLM / 升级 6 终态台账 cross-file 判据 |
| MODIFY | `test/proactivity-guard.test.ts` | TASK-ADN-209 / 213 / 214 | +170 行纯加法：提案不耗预算双向 / 关断两相 / 零第二阈值源码扫描 / 显示上限登记 / PG 终态 |
| MODIFY | `test/r8-open-next-entry.test.ts` | TASK-ADN-211 / 212 | +125 行纯加法：首开确定性（结构上无 AI 初始 next）/ 兜底反证（删恒真 `when` / 删 floor / `safety` 走 floor ⇒ 各必红）/ `sha256` 逐字节还原 / 三段控制 |
| MODIFY | `test/free-input-next.test.ts` | TASK-ADN-203 / 216 | +46 行纯加法：AI 候选不进 floor（在场 ⇒ AI 卡；被压 ⇒ floor 只含终端）/ 声明集下界 ≥12（旧 `>=11` 逐字保留） |
| MODIFY | `test/turn-arbitration.test.ts` | TASK-ADN-210 / 216 | +45 行纯加法：AI 撞车 `blocked:busy` / 四值逐字 / `pending` 硬门源码逐字 / 队列语义 diff=0 复跑 |
| MODIFY | `test/density-thresholds.test.ts` | TASK-ADN-215 | +40 行纯加法：三档阈值逐字 + AI 多候选 ≤3 chip / 单卡位 + 320px 在矩阵内 + 截断单源承重 |
| MODIFY | `test/driver-timings.test.ts` / `test/driver-quadruple.test.ts` / `test/op-wiring.test.ts` / `test/op-three-tier.test.ts` | TASK-ADN-213 | 各 +9~11 行纯加法：升级 6（DT 恰 5 / DQ 12↔12 / OW 计数 / O3 `tierOf` 单源）终态对账块 |
| MODIFY | 本叶 `state.json` / `tasks.md` | 收口登记 | phase `tasked → building`（R1 完成 / W06 留 R2）+ tasks.md §6 R1 执行状态 |
| SPIKE（已删除） | `test/_spike/sg-adn-03-probe.mjs` | TASK-ADN-201 | 探毕删除，**不入提交**（`test/_spike/` 零残留） |

**零改动（R1）**：`test/ui/journey.mjs` / `test/ui/binding.mjs`（保护段 keep）；`packages/web-cli-base/**`；`manifest.json`；`src/background/**`（B 列）；`docs/**`（台账终态属 W06）。

---

## 3. 测试覆盖

| 门禁 / 命令 | 基线 | R1 实测 | 判据 |
|------|:--:|:--:|------|
| `npm run typecheck` | PASS | **PASS** | 全量 `tsc --noEmit` |
| `npm test` | 1478 / 0 | **1500 / 0** | 测试文件 **0 删除行**（`git diff --numstat` 佐证）；新增断言集中于 AI 合并 / 兜底 / 护栏 |
| `npm run test:density` | 242 | **242 / 0** | 三档阈值 7/15 · 9/20 · 17/35 逐字；AI 多候选不越显示上界 |
| `npm run test:dead-end` | 53 | **53 / 0** | 5 类阻塞逐类可达 next；删兜底反证仍在 |
| `npm run test:binding` | 192 | 191/192 ×3（**KL-N-10 同族 flake**） | 失败项互异（`#54B7` / `#6l residual=undefined` / `#confirm-allow not found`），与 `docs/v4-supersession-ledger.json` 已登记变体逐条一致；`test/ui/binding.mjs` **零 diff**；保护段 pin 由 `supersession-ledger`（npm test 内）独立机核绿 |

### 3.1 反证摘要（重点 5 条，全部实跑）

| # | 注入 | 判据（必红） | 还原 |
|:--:|------|------|------|
| 1 | 删 `free-input` 恒真 `when`（改恒假） | `r8-open-next-entry` `fallbackProblems` | `sha256` 前后相同 ⇒ PASS |
| 2 | 删零死端 floor（`cards: []`）/ 让 `safety` 走 floor | 同上 | 同上 |
| 3 | 去掉 AI 预过滤（R6 扩展） | `recommendation-sources` 206：AI 仍赢槽 ⇒ 陈旧候选被替换的判据失真 | 真实源码逐字复用 |
| 4 | 关断后仍注入 AI（去掉 `proactivity.enabled()`） | `proactivity-guard` `displayPhaseGateProblems` | 还原 ⇒ PASS |
| 5 | 把 `noteProactive` 塞进产出路径 / 在 `ai-next.ts`·`providers.ts` 写频次常量 | `budgetAccountingProblems` / `secondThresholdProblems` | 各必红 ⇒ 还原 PASS |

**AI 赢槽后终端仍最末**：`free-input-next` FIN-1（`.next-chips` 之后的结构序）+ FIN-10（AI 卡 `terminal === true`；floor 铸造点源码零 `aiNext` 读取）。
**多候选 >3 溢出**：4/5 条 AI 候选 ⇒ `candidate()` 截断到 3 ∧ `recommendNextStep` 仍恰 1 卡。

---

## 4. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR |
|------|------|:--:|:--:|------|
| TASK-ADN-201 | SG-ADN-03 先验（prepend 替换 + 前 N=3 合并不破单卡/3chip） | M | ✅ completed（可行 6/6 + 1 偏差登记） | FR-ADN-050/051/052/055 |
| TASK-ADN-202 | 三情形兜底接线（未配 / 未产出 / 全被拦） | M | ✅ completed | FR-ADN-040/043/046 |
| TASK-ADN-203 | `free-input` 终端恒常驻 + floor 语义 | M | ✅ completed | FR-ADN-041/042/044/045 |
| TASK-ADN-204 | 合并口径（同单卡位 + 前 N=3 + 截断 + 列表内去重） | M | ✅ completed | FR-ADN-050/051/054 |
| TASK-ADN-205 | 替换口径（AI 赢槽 ⇒ 无陈旧 chip）+ 渲染零 per-op 分支 | M | ✅ completed | FR-ADN-055/056 |
| TASK-ADN-206 | R6 同因去重扩展覆盖 AI（`refActionDigest` 家系逐字复用） | M | ✅ completed | FR-ADN-053 |
| TASK-ADN-207 | `recommendation-sources` 替换口径 / 规则表恰 4 / 单卡 / ④ 保持 | M | ✅ completed | FR-ADN-052/055/098 |
| TASK-ADN-208 | 关断门（显示相 `proactivity.enabled()` 注入前检查） | M | ✅ completed | FR-ADN-062 |
| TASK-ADN-209 | `proactivity-guard` 加严（提案不耗预算双向 + 关断两相） | M | ✅ completed | FR-ADN-061/062/063 |
| TASK-ADN-210 | 在飞语义保持（`pending` + `blocked:busy` + 四值） | S | ✅ completed | FR-ADN-046/065 |
| TASK-ADN-211 | 首开保持确定性（逐字 + 零 LLM 往返 + 让位 firstRun） | M | ✅ completed | FR-ADN-070~073 |
| TASK-ADN-212 | 兜底反证（删兜底 / 删终端 ⇒ 必红）+ 逐字节还原 | M | ✅ completed | FR-ADN-044/045 |
| TASK-ADN-213 | 升级 6 重锚终态对账（三态齐 / `assertionsRemoved=0`） | M | ✅ completed | FR-ADN-110~117 |
| TASK-ADN-214 | 六常量同过 + 零第二阈值（源码扫描） | S | ✅ completed | FR-ADN-060/063 |
| TASK-ADN-215 | 窄视口 / 密度（7/15 · 9/20 · 17/35 逐字） | M | ✅ completed | FR-ADN-054 |
| TASK-ADN-216 | `turn-arbitration` + `free-input-next` 保留（下界只增） | S | ✅ completed | FR-ADN-041/046 |
| TASK-ADN-217~223 | W06 验收与治理（S0''' 终态 / 体积重登记 / 台账终态 / 保护段 / e2e） | L/M | ⏳ **留 R2** | FR-ADN-080~085 / 090~101 / 121~125 |

---

## 5. 红线巡检与遗留

| 红线 | 实测 | 结论 |
|---|---|---|
| 三冻结面 | `content.js` 177,076 B / `52a82620…`；`pick-layer.js` 34,358 B / `77796bab…` | ✅ 逐字节不变 |
| base / manifest / journey / binding | `git diff` **零 diff** | ✅ |
| 单卡 / 3-chip / 密度 | `MAX_NEXTSTEP_CARDS_PER_ROUND=1` / `MAX_CHIPS_PER_CARD=3` / 7·15·9·20·17·35 逐字；density 242/0 | ✅ 不破 |
| `NEXTSTEP_PRIORITY` 恰 4 / 12 kind / `KIND_SET` 40 / `ACT_TO_OP` 6 / 零宿主 | 各判据在 `npm test` 内绿 | ✅ |
| R8 首开入口不回归 | `r8-open-next-entry` / `free-input-next` / `no-dead-end` 全绿 | ✅ |
| 提案不耗预算 / 零第二阈值 | `proactivity-guard` 新增判据 + 源码扫描 | ✅ |
| 测试只增 | 测试文件 **0 删除行**（`git diff --numstat`） | ✅ |
| 体积五要素 | 登记 603,205 / 实测 604,583 / Δ +1,378 B / 生效上限 633,365 / 距档 9,817 B；`dist/` 未重建 ⇒ 体积类门禁仍绿 | ✅（W06 重登记） |
| `KL-N-10` | `test:binding` ×3 flake（失败项互异 + 零 diff + 历史同族） | ⚠️ 如实登记，不阻塞 |

**遗留 / 交接 R2**：① 体积收口重登记（`size-baseline` / `size-growth-evidence` / `size-ruling-vol3` / `docs/v4-density-baseline.json`）—— 需 `npm run build` 后实测；② S0''' 四支线 Chromium 面（`s0-self-driven.mjs` / `recommendation.mjs` / `law8-plaintext.mjs` 只加断言）；③ X-ADN-1~11 台账终态 + 保护段 keep 双绿；④ 门禁守恒终态（`gate-integrity`）；⑤ SG-ADN-03 的 `onboarding` 排序**语义订正项**（不得改 `NEXTSTEP_PRIORITY`；建议 review 阶段裁决是否仅订正 ADR 文字）。

---

## 6. 下一步

| 场景 | 操作 |
|------|------|
| R1 已完成，W06 待做工 | 运行 `@sddu-build specs-tree-adn-2-deterministic-fallback-and-merge` 继续 **R2（W06 / TASK-ADN-217~223）** |
| R2 全部完成后 | 运行 `@sddu-review specs-tree-adn-2-deterministic-fallback-and-merge` 开始审查 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = W04+W05 / `TASK-ADN-201~216`）：SG-ADN-03 可行（6/6 + 1 偏差登记）；`recommend.ts` R6 同因去重扩展 + 列表内去重；`sidepanel.ts` 关断显示相；`npm test` 1478→1500/0 + density 242/0 + dead-end 53/0；三冻结面/base 零 diff；体积 A +1,378 B（临时构建）；binding 命中 KL-N-10 同族 flake；**W06 留 R2** | 2026-09-26 | SDDU Build Agent |
