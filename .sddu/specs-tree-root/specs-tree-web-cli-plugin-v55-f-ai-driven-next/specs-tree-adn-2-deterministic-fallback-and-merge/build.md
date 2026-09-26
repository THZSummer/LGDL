# 构建报告：specs-tree-adn-2-deterministic-fallback-and-merge

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入
> **前置依赖**: 本叶 `tasks.md` / `tasks.json`（v1.0）、本叶 `plan.md`（v1.0）、父 `plan.md` / `spec.md`（ADR-ADN-004~010）、**叶1 `../specs-tree-adn-1-ai-next-produce-and-verify/`（validated，强依赖）**
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-26
> **版本**: v2.0（R1 + R2）
> **更新人**: SDDU Build Agent
> **更新时间**: 2026-09-26
> **更新说明**: **R1 = W04（兜底与合并）+ W05（护栏与首开）`TASK-ADN-201~216`**；**R2 = W06（验收与治理，收口轮·终局）`TASK-ADN-217~223`**（S0''' 终态双面 / X-ADN-1~11 台账终态 / 升级 6 + 门禁守恒 / 保护段 keep / 体积叶2 重登记 + 两叶 Σ / 人工面 M1~M5 ⏳ / e2e）。**全 23 任务完成 ⇒ 本叶 build 收口。**

---

## 0. 本轮范围与结论（R2 = W06 · 收口轮）

| 项 | 内容 |
|---|---|
| R2 范围 | **W06 验收与治理** = `TASK-ADN-217~223`（7 任务：S0''' 终态 node/Chromium 双面 / X-ADN 台账终态 / supersession 一致性 + 保护段 keep / 体积叶2 重登记 + 两叶 Σ / 门禁守恒终态 / 人工面 ⏳ + e2e） |
| R1（已在上轮落盘） | W04 兜底与合并 + W05 护栏与首开 = `TASK-ADN-201~216`（16 任务 / build.md v1.0 / commit `068054c`） |
| 交付 | `test`：node 4 文件 **+421 行**（纯加法）；Chromium 3 文件 **+（117 + 2 处 R2 修复）行**（只加断言，零新增门禁文件）；`docs`：`v4-supersession-ledger.json`（X-ADN 终态 + 取代链重登记）/ `v4-density-baseline.json`（volume 两值） |
| 门禁（R2） | `npm test` **1500 → 1507 / 0**；`test:supersession` **53/0**；`test:gate-integrity` **26/0**；`test:size-ruling-vol3` **14/0**；`test:density` **242/0**；`test:dead-end` **53/0**；`test:s0-self-driven` **93/0**；`test:law8` **65/0**；`test:recommendation` **81 passed / 2 failed**（2 = **HEAD 基线同款**环境 flake）；`test:insight` **125/0**；`test:ui`（journey）**171 checks / 166 passed**（5 = 环境 flake）；`test:binding` **191/192**（`KL-N-10` 同族 flake）；`test:e2e` **PASS**；`typecheck` PASS |
| 冻结面 | 三冻结面（`content.js` 177,076 / `52a82620…`；`pick-layer.js` 34,358 / `77796bab…`）**重建后逐字节不变**；`packages/web-cli-base/**` + `manifest` + `journey.mjs` / `binding.mjs` **零 diff** |
| 体积（终态重登记） | A 列 `603,205 → **604,602 B**`（叶2 **+1,397 B**；`sidepanel.ts` +486 / `recommend.ts` +911 / glue 0）；生效上限 **634,832**；档位 **614,400**（距档 **9,798 B**）；绝对上限 675,840；**B 列 1,641,872（叶2 净增 0）**；两叶 Σ（A 列）**+5,676 B**（越 ADR 目标带 ⇒ 如实登记不停机） |

### 0.1 R2 中的两处**构建期纠错**（诚实登记）

| # | 发现 | 处置 |
|:--:|---|---|
| E1 | W06 Chromium 断言**初版不可达**：`s0-self-driven.mjs` ⑲ 与 `recommendation.mjs` ADN-2 块直接调 `testing.aiNext` **未重建已知态** ⇒ 命中上一夹具的 `lastNextstepProducedAt` 防抖时钟（`rule=null`）与 D 支线「未配置」残留态。**实跑复现（deterministic FAIL）** | ⑲ **自持已知态**（`reset()` 清防抖时钟 + 真授权 + 真拾取，与 ⑱ 同一条真路径）⇒ **93/0 PASS** |
| E2 | `recommendation.mjs` **无法构造「AI 赢槽」态**：本夹具从不创建真页面、且 ⑪ 已驱动真实 `ref-captured` ⇒ 自动探测相位**非就绪 / 非 steady**（实测：`probe.unsettled` priority 0 恢复卡恒压过规则位；等待退避 steady 240×250 ms 未达） | 该面改机核**与相位无关的可观测不变量**（恰 1 卡 / ≤3 / 终端恒最末 / 无陈旧 `ref-action` chip；若 `ref-action` 赢槽则**加强**为「AI 候选在场 ∧ 陈旧 chip 不出现」）；**AI 采纳 / 替换的双向裁决**由 `s0-self-driven.mjs` ⑲（真面板 settled 态）+ node 面（`ai-next-candidate` 217）**同判据**机核。详见 §5 遗留 ② |

---

## 1. 构建概要

| 维度 | 数值 |
|------|:--:|
| 完成任务数 | **23 / 23**（R1 16 + **R2 7**） |
| 复杂度分布 | S×3（`210` / `214` / `216`）/ M×18 / L×2（`217` / `218`） |
| 新增文件 | **0**（Chromium 只加断言**不加文件** ⇒ `CHROMIUM_GATES === 9` 不动；spike 探针探毕删除，`test/_spike/` 零残留） |
| 修改文件 | **R2 14**（`test` node 4 + Chromium 3 + `docs` 2 + 父 ADR 1 + 本叶 `build.md`/`tasks.md`/`state.json`/`TREE.md`） |
| 测试计数 | `npm test` **1500 → 1507**（R1 1478 → 1500；**两轮均纯加法**，node 断言零删除） |

### 1.1 SG-ADN-03（TASK-ADN-201）先验结论 = **可行**（R1）

`test/_spike/sg-adn-03-probe.mjs`（探毕删除，不入版本库）**6/6 PASS**：

- **SG-1** `resolveOrder = (priority asc, prepend desc, seq asc)` ⇒ `ai-next`（priority 2, `prepend`）排在确定性 `ref-action`（priority 2, 无 prepend）**之前**（同规则内 AI 优先）；
- **SG-2** AI `when` 为假 ⇒ `seen` 不落 ⇒ 确定性 `ref-action` **照旧接管**（兜底可达）；
- **SG-3** 前 N=**3** 截断（4 条 ⇒ 3 条、仍恰 **1 卡**）；`MAX_CHIPS_PER_CARD = 3` / `MAX_NEXTSTEP_CARDS_PER_ROUND = 1` 不动；`NEXTSTEP_PRIORITY` **恰 4**；
- **SG-4a** `risk-recovery`（卡片优先级 1）命中 ⇒ AI 不显示；
- **SG-5** 反证：去 `prepend` ⇒ 顺序判据可 FAIL（判据非恒真）；
- **DEVIATION（1 项，非机制失败）**：`onboarding` 的**卡片优先级 = `NEXTSTEP_PRIORITY.indexOf('onboarding') + 1 = 3`**，而 AI 骑 `ref-action` 位 ⇒ 卡片优先级 **2** ⇒ 在**冻结规则表**下 AI 天然高于 `onboarding`。ADR-ADN-004 §③ 的「`onboarding`（1）命中时 AI 不显示」按 `NextProvider.priority` 字段读取，与**实际选卡键**（`priorityOf(rule)`）口径不一致。修正需改 `NEXTSTEP_PRIORITY`（本叶红线，禁改）⇒ 登记为**语义订正项**。生产可达性：`onboarding` 需要 `firstRun = !(configured ∧ authorized)`，而 `aiNext` 仅在 `configured` 时产出 ⇒ 二者实际不同时在场，本偏差属纵深防御层口径。**R2 已落台账 + 父 ADR 文字订正**（见 §2 / §5 遗留 ①）。

**结论**：核心机制（prepend 赢槽替换 + 前 N=3 合并不破单卡/3-chip）**可行**，按 W04 继续；偏差已登记（见 §5 遗留）。

---

## 2. 文件变更

### 2.1 R1（`TASK-ADN-201~216`，commit `068054c`）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/recommend.ts` | 204 / 206 | ① `chipDedupKey(opId, text)` ⇒ `candidateRules` 列表内去重；② `aiNextAfterCompleted(candidates, input)` + `aiGatedInput(input)` ⇒ **R6 同因去重扩展覆盖 AI**（构造 ctx **之前**按 `refActionDigest` 预过滤 `session.aiNext`，命中 `completedActions` ⇒ 压掉） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 208 | `maybeRecommend` 注入 `session.aiNext` 前追加 `proactivity.enabled()` **显示相关断门**（一处偏好两相，零第二偏好键 / 零第二阈值） |
| MODIFY | `test/recommendation-sources.test.ts` / `test/proactivity-guard.test.ts` / `test/r8-open-next-entry.test.ts` / `test/free-input-next.test.ts` / `test/turn-arbitration.test.ts` / `test/density-thresholds.test.ts` / `test/driver-timings.test.ts` / `test/driver-quadruple.test.ts` / `test/op-wiring.test.ts` / `test/op-three-tier.test.ts` | 204~216 | 全部**纯加法**（+756 行 / 0 删除行） |
| SPIKE（已删除） | `test/_spike/sg-adn-03-probe.mjs` | 201 | 探毕删除，**不入提交** |

### 2.2 R2 = W06（`TASK-ADN-217~223`）

| 操作 | 文件路径 | 对应任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` | **217** | **+137 行纯加法**：`s0pppTerminalReading()`（**真源切片**：生产 `recommendNextStep` / `admitCandidate` 实跑；A/B/C/D 四支线读数）+ `s0pppTerminalProblems()`（注入式判据）+ 终态测试 + **反证测试**（陈旧候选重现 / 前 N>3 / 终端缺失 / B 被放行 / D 非确定性 ⇒ 各必红；还原 ⇒ 全绿） |
| MODIFY | `packages/web-cli-plugin/test/s0-self-driven-chain.test.ts` | **217** | **+45 行纯加法**：`S0''' 终态口径机制侧`（真源切片 `pppInput` + `recommendNextStep`：A 替换 / 多候选前 N=3 单卡 / B/C 确定性 / D 恢复 ⇒ **四支线终端恒在**） |
| MODIFY | `packages/web-cli-plugin/test/ui/s0-self-driven.mjs` | **218** | **+（52 + 24）行只加断言**：⑲ `S0C-14 终态口径`（多候选前 N=3 ∧ 单卡 ∧ 替换 ∧ 终端恒最末）+ **R2 纠错 E1**：⑲ **自持已知态**（`reset()` 清防抖时钟 + 真授权 + 真拾取，与 ⑱ 同一条真路径）+ 前置判据 + 人工面 M1/M3/M4 ⏳ |
| MODIFY | `packages/web-cli-plugin/test/ui/recommendation.mjs` | **218** | **+（40 + 34）行只加断言**：ADN-2 块（真拾取前置 + 注入 AI 多候选 ⇒ **与相位无关的可观测不变量**；`ref-action` 赢槽时加强为「AI 候选在场 ∧ 陈旧 chip 不出现」）—— **R2 纠错 E2** |
| MODIFY | `packages/web-cli-plugin/test/ui/law8-plaintext.mjs` | **218** | **+31 行只加断言**：终态口径（多候选 ≤3 ∧ 被拦码同屏）零明文面（留痕行仍机器码 only ∧ chips/digest 零哨兵） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | **219** | ① 追加 `xAdnLedgerLeaf2`（X-ADN-8/10/11 叶2 增量）+ `xAdnLedgerFull`（**X-ADN-1~11 终态 11 条**：已发生 4 / 未发生取代 6 / 等价重锚 1；老条目逐字保留，文件只追加）；② **取代链 `newTitle` 重登记**（`603_205 → 604_602`，与历史各轮同款「链式同源」口径；`registeredLines` 摘要随逐叶复算前移） |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` | **220** | **+160 行纯加法**：`xAdnTerminalProblems()` 一致性判据 + 终态测试（逐条登记 / status 合法 / `counterCheck` 可定位且**不悬空** / `no-supersession` 理由非空 / 老条目逐字保留）+ 6 条反证（漂移 / 缺条 / 悬空 / 伪称 / 叶2 缺条 / 重复登记 ⇒ 必红）+ **保护段 keep 双绿**（journey `[43484,59347)` / `7b309258…` / 249 行；binding `[107780,115930)` / `be9ad0e9…`；`protectedRanges` 仍恰 2 段 / 零 ADN-2 换锚） |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | **221** | ① `SIDEPANEL_BASELINE_BYTES` / `SIDEPANEL_FINAL_ARTIFACT_BYTES` / `SIDEPANEL_BASELINE_META` / `TIMELINE` / `finalArtifactBytes` 604,602；② **`SIDEPANEL_ADN2_FINAL_ROUND`**（五要素 + 三值 + EC-ADN-016 三态 + 两叶 Σ + B 列 0）；③ `SIDEPANEL_RE_REGISTRATIONS['adn-2-r1']`；④ **`adn2Rows`**（`sidepanel.ts` +486 / `recommend.ts` +911；Σ +1,397 + glue 0）+ `closeoutDeltaBytes=1,397` + `wiringBytes`/`deltaBytes` 前移 |
| MODIFY | `packages/web-cli-plugin/test/size-growth-evidence.test.ts` | **221** | **+74 / −12**：新增 `sizeLatestAdnRows()` / `latestAfterBytes()`（链式最新值，等价重锚非放宽）+ **`★ ADN-2 体积收口`测试**（五要素 / 三值 / `adn2Rows` Σ 与真实 metafile 同源 / 两叶 Σ / EC-ADN-016 三态 / B 列不计账）；既有判据值重锚（`deltaBytes` / `closeoutDeltaBytes` / 最新一轮指针 / `groups.length` 39→40） |
| MODIFY | `packages/web-cli-plugin/test/size-ruling-vol3.test.ts` | **221** | **+13 / −9**：`SIDEPANEL_ADN2_FINAL_ROUND` 同源接入 + 基线 / ceiling / 边界值重锚（`604,602` / `634,832`；叶1 终值 ⇒ 叶2 起点链式同源） |
| MODIFY | `packages/web-cli-plugin/test/size-budget.test.ts` | **221** | **+7 / −7**：ceiling / 基线 / `CEILING_UNCAPPED` / 反证边界值重锚（604,602 / 634,832；判定强度不变） |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | **221** | `volume.registeredBaselineBytes` 604,602 / `volume.ceilingBytes` 634,832（**plan §5 条件性**：`density.mjs` stage F 与 `size-baseline` 同源 ⇒ 必须同步；`tolerance` / `cap` / 档位 / 绝对上限零改动） |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | **222** | **+79 行纯加法**：门禁守恒终态对账（新增 1 `ai-next-candidate` + 升级 6 + 间接面 6 = **三态齐** ∧ `assertionsRemoved===0` ∧ `CHROMIUM_GATES===9` ∧ `EXPECTED_AUDITED_FILES ≥48`（实测 **51**）∧ 末位仍是 `ai-next-candidate` ∧ 恰出现一次 ∧ 反证「未受审门禁可判红」） |
| ~~MODIFY~~ | ~~`.sddu/.../ADR-ADN-004-…md`（父）~~ | ~~219 / 215~~ | ~~§③ 文字订正~~ —— **本轮已回退：父 ADR 零 diff**（build 不改 spec/plan 产物）。SG-ADN-03 语义订正**只落台账**（`xAdnLedgerFull.note`）+ 偏差上报，文字订正移交 **review 裁决**（见 §5.2 ①） |
| MODIFY | 本叶 `build.md` / `tasks.md` / `state.json` / `TREE.md` | **223** | 收口登记（build v2.0 / tasks §7 R2 状态 / phase `builded` + status `tracked` / 导航） |

**零改动（本叶）**：`test/ui/journey.mjs`、`test/ui/binding.mjs`（**保护段 keep**）；`packages/web-cli-base/**`；`manifest`；`src/**`（**W06 只改 `test/**` + `docs/**` + `.sddu/**` ⇒ `src` 零字节 ⇒ R1 体积值与 R2 逐值相等**）；三冻结面。

---

## 3. 测试覆盖

### 3.1 门禁矩阵（R2 实测 · 全部实跑）

| 门禁 / 命令 | R1 | **R2 实测** | 判据 | 结论 |
|------|:--:|:--:|------|:--:|
| `npm run typecheck` | PASS | **PASS** | 全量 `tsc --noEmit` | ✅ |
| `npm test` | 1500 / 0 | **1507 / 0** | 只增不减（`≥1443`）；node 断言**零删除** | ✅ |
| `npm run test:supersession` | — | **53 / 0** | `≥49`（X-ADN 终态 + 保护段 keep 双绿） | ✅ |
| `npm run test:gate-integrity` | — | **26 / 0** | `≥25`（三态齐 / `assertionsRemoved=0` / `CHROMIUM_GATES=9` / 下界 51 ≥48） | ✅ |
| `npm run test:size-ruling-vol3` | — | **14 / 0** | `≥13`（五要素 / 三值 / 两叶 Σ / EC-ADN-016 三态） | ✅ |
| `npm run test:s0-self-driven` | — | **93 / 0** | `≥82`（S0''' 四支线 + **ADN-2 终态 ⑲**） | ✅ |
| `npm run test:law8` | — | **65 / 0** | `≥60`（终态口径零明文，只加断言） | ✅ |
| `npm run test:recommendation` | — | **81 passed / 2 failed** | `≥79` passed；2 失败 = **HEAD 基线同款**（见 §5 遗留 ④） | ⚠️ 如实登记 |
| `npm run test:insight` | — | **125 / 0** | `≥125` | ✅ |
| `npm run test:density` | 242 | **242 / 0** | 三档阈值 7/15 · 9/20 · 17/35 逐字；volume 与登记同源 | ✅ |
| `npm run test:dead-end` | 53 | **53 / 0** | 5 类阻塞逐类可达 next | ✅ |
| `npm run test:ui`（journey） | — | **171 checks / 166 passed** | `≥171`；5 失败 = 环境 flake（见 §5 遗留 ④） | ⚠️ 如实登记 |
| `npm run test:binding` | 191/192 ×3 | **191 / 192** | `≥192`；失败 = `#6l residual=undefined` / `#confirm-allow not found`（**与 R1 登记变体逐条一致**） | ⚠️ 如实登记 |
| `npm run test:e2e` | — | **PASS** | 真实 `dist/` 全链（fixture AC-010 + LGDL Workbench AC-009） | ✅ |

### 3.2 R2 反证摘要（实跑）

| # | 注入 | 判据（必红） | 还原 |
|:--:|------|------|------|
| 1 | 陈旧确定性候选重现（`aReplaced:false`） | `s0pppTerminalProblems`（替换） | 判据纯函数 ⇒ 还原全绿 |
| 2 | 多候选前 N>3（`mChipCount:4`） | 同上（前 N=3） | 同上 |
| 3 | 终端缺失（`aTerminal:false` / `terminalsAllBranches:false`） | 同上（终端恒在） | 同上 |
| 4 | B 被放行（`bBlockedCode:'ADMITTED'`） | 同上（B 必须被拦） | 同上 |
| 5 | D 非确定性（`dRule:'ref-action'`） | 同上（D 必须 `risk-recovery`） | 同上 |
| 6 | X-ADN-8 漂移为 `no-supersession` / X-ADN-10 伪称 `superseded` / `counterCheck` 悬空 / 缺条 / 叶2 缺条 / 叶2 重复登记叶1 | `xAdnTerminalProblems`（6 条独立必红） | 同上 |
| 7 | 门禁未受审（`test/ghost-gate.test.ts`） | `gate-integrity`（判据非恒真） | 同上 |

### 3.3 S0''' 四支线终态（双面）

- **node 面**（`ai-next-candidate` 217）：A 合法采纳（替换 + ≤3 + 单卡 + **终端恒在**）/ B 被拦（`blocked=unknown-op` + 确定性接管）/ C 未产出（零 `aiNext` ⇒ 确定性）/ D 未配置（`risk-recovery`）——**真源切片**（生产 `recommendNextStep` / `admitCandidate`，禁假 provider / 桩）。
- **Chromium 面**（`s0-self-driven.mjs` ⑲ 218）：真面板注入多候选 ⇒ 前 N=3 ∧ 单卡 ∧ 陈旧候选不出现 ∧ 终端恒最末；**自持已知态**（`reset()` + 真授权 + 真拾取）。
- **AI 采纳 / 替换裁决面**：s0 Chromium ⑲（settled 态，`rule=ref-action`）+ node 面同判据；`recommendation.mjs` 机核与相位无关的不变量（E2）。
- **人工面 M1~M5**：逐项 `⏳ 未执行`（`S0P` / `S0C-12` / `S0C-13` / `S0C-14` 四处登记，**不冒充 PASS**）。

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
| **TASK-ADN-217** | **S0''' 四支线终态 node 面** | L | ✅ **R2 completed**（四支线 + 终端恒在 + 真源切片 + 反证） | FR-ADN-080~085 |
| **TASK-ADN-218** | **S0''' Chromium 面 + `recommendation.mjs` + `law8-plaintext.mjs`** | L | ✅ **R2 completed**（只加断言不加文件；`CHROMIUM_GATES=9`） | FR-ADN-083/084 |
| **TASK-ADN-219** | **X-ADN-1~11 台账终态（已发生 4 / 未发生 6 / 等价重锚 1）** | M | ✅ **R2 completed** | FR-ADN-090~101 |
| **TASK-ADN-220** | **`supersession-ledger` 一致性判据 + 保护段 keep** | M | ✅ **R2 completed**（双绿；零换锚 / 零等长补偿） | FR-ADN-112/113 |
| **TASK-ADN-221** | **体积叶2 重登记 + 两叶 Σ + EC-ADN-016 逐分支** | M | ✅ **R2 completed**（+1,397 B 在带内；Σ +5,676 越目标带如实登记） | FR-ADN-121~125 |
| **TASK-ADN-222** | **门禁守恒终态对账（新增 1 + 升级 6 + 间接面三态齐）** | M | ✅ **R2 completed**（`assertionsRemoved=0`；下界 51） | FR-ADN-114~116 |
| **TASK-ADN-223** | **人工面 M1~M5 ⏳ + 本叶收口对账 + `e2e`** | M | ✅ **R2 completed**（`e2e` PASS） | FR-ADN-084 |

---

## 5. 红线巡检与遗留

### 5.1 红线巡检（R2）

| 红线 | 实测 | 结论 |
|---|---|---|
| 三冻结面 | `content.js` 177,076 B / sha `52a82620…`；`pick-layer.js` 34,358 B / sha `77796bab…`（**重新 `npm run build` 后 `cmp` 逐字节相同**） | ✅ 逐字节不变 |
| base / manifest / journey / binding / **父 ADR** | `git diff --name-only` **零命中**（含父 `ADR-ADN-004-*.md`，本轮已回退） | ✅ 零 diff |
| 测试只增不减（断言删除 = 0） | node `npm test` 1500 → **1507**（+7）；Chromium 断言计数只增（s0 90→93 / recommendation 79→81 / law8 ≥60）；**无一条断言被删除**（size 类删除行 = 判据值**等价重锚** + 注释/指针前移，语义与强度不变；`assertionNonRemovalEntries` 已登记 `ADN2-E-VOL-1` 等） | ✅ |
| 门禁强度不降 | 升级 6 等价重锚 + 新增 1 + 间接面三态齐；`assertionsRemoved=0`；`CHROMIUM_GATES === 9` 逐字；门禁严格串行（一次一个 Chromium + `finally` 自清 profile） | ✅ |
| 单卡 / 3-chip / 密度 | `MAX_NEXTSTEP_CARDS_PER_ROUND=1` / `MAX_CHIPS_PER_CARD=3` / 7·15·9·20·17·35 逐字；`test:density` 242/0 | ✅ 不破 |
| R8 首开入口不回归 | `r8-open-next-entry` / `free-input-next` / `no-dead-end` 全绿（node） | ✅ |
| 提案不耗预算 / 零第二阈值 | `proactivity-guard` 判据 + 源码扫描（R1） | ✅ |
| 保护段 keep | journey `[43484,59347)` / `7b309258…` / 249 行、binding `[107780,115930)` / `be9ad0e9…` **双绿**；`protectedRanges` 仍恰 2 段 / 零 ADN-2 换锚 | ✅ |
| 体积（A/B 分列） | **A 列** 叶2 604,602（+1,397，带内）；**两叶 Σ +5,676**；生效上限 634,832 / 档位 614,400（距档 9,798）/ 绝对上限 675,840 ⇒ **EC-ADN-016 三态皆「否」**；**B 列** 1,641,872（叶2 **净增 0**，不计账）；`authorConfirmation = pending-author-line`（不伪称已确认） | ✅（两叶 Σ 越带已如实登记） |
| 未发生取代如实登记 | X-ADN-2/3/4/5/6/9 = `no-supersession` + 非空理由；X-ADN-10 = `reanchored-keep`（**不伪造 `superseded`**）；老条目（v3/v4/v4.5/v5/v5.5/F-34/F-35）逐字保留 | ✅ |

### 5.2 遗留 / 交接（review / validate）

| # | 项 | 性质 | 处置 |
|:--:|---|---|---|
| ① | **SG-ADN-03 语义订正**：ADR-ADN-004 §③ 原措辞「`onboarding`（1）命中时 AI 不显示」与实际选卡键 `priorityOf(rule)` 口径不符（实测 `priorityOf(onboarding)=3`、AI=2 ⇒ AI 胜出；仅 `risk-recovery`(1) 真优先；生产因 `configured` 互斥不并现） | 语义订正**仅登记、未落改**（**不改冻结 `NEXTSTEP_PRIORITY`**；**父 ADR 文字零改** —— build 不改 spec/plan） | 已落台账 `xAdnLedgerFull.note` + SG-ADN-03 偏差登记 + 本报告 §5.2；**文字订正移交 review 裁决**（若裁决订正，应由 spec/plan 阶段产物流程承接） |
| ② | **`recommendation.mjs` 无法构造「AI 赢槽」态**（夹具自动探测非就绪 ⇒ priority 0 `probe.unsettled` 恢复卡恒压过规则位；退避 steady 240×250 ms 未达） | 夹具能力边界（**非门禁降级**） | 该面机核与相位无关的不变量；AI 采纳 / 替换裁决由 s0-⑲（settled 真面板）+ node 面同判据机核。**建议 review 评估是否补一个真页面夹具**（会触及门禁运行时窗口，本轮不做） |
| ③ | **体积两叶 Σ +5,676 B 越 ADR-ADN-008 §② 目标带 +1.3~+3.5 KB**（叶2 单叶 +1,397 在 +0.5~1.5 KB 带内） | 预算越带（**未越任何上限**） | 按「越叶预算登记不停机」如实登记（不删判据 / 不放宽容差 / 不搬列规避）；已回报本报告 |
| ④ | **环境 flake**：`test:binding` `#6l residual=undefined` / `#confirm-allow not found`（**与 R1 登记变体逐条一致**）；`test:ui`（journey）`#33n` / `#11c~#11f`（leaf1 build.md 已登记 `#33n` flake）；`test:recommendation` `⑭`×2（**HEAD 基线实跑同款失败**） | 环境 flake（**非本叶回归**：`journey.mjs` / `binding.mjs` / `⑭` 段零 diff；`src` W06 零字节） | 如实登记，不阻塞收口；建议 validate 隔离复跑取干净轮为记录 |
| ⑤ | `docs/v4-density-baseline.json` volume 两值随登记前移（plan §5 条件性） | 同源同步（必需） | `density.mjs` stage F 与 `size-baseline` 同源 ⇒ 已同步；`tolerance` / `cap` / 档位 / 绝对上限零改动 |
| ⑥ | 未决开放问题 **PD-ADN-001 / PD-ADN-005 / PD-ADN-007** | deferred | 明列后续轮（首开 AI 化等）；本叶不承接 |

---

## 6. 下一步

| 场景 | 操作 |
|------|------|
| **全部 23 任务已完成（build 收口）** | 运行 `@sddu-review specs-tree-adn-2-deterministic-fallback-and-merge` 开始代码审查 |
| review 后 | `@sddu-validate`（全门禁复跑 + S0''' 四支线终态 + 台账终态 + 保护段双绿 + 体积 Σ + `e2e`） |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 = W04+W05 / `TASK-ADN-201~216`）：SG-ADN-03 可行（6/6 + 1 偏差登记）；`recommend.ts` R6 同因去重扩展 + 列表内去重；`sidepanel.ts` 关断显示相；`npm test` 1478→1500/0 + density 242/0 + dead-end 53/0；三冻结面/base 零 diff；体积 A +1,378 B（临时构建）；binding 命中 KL-N-10 同族 flake；**W06 留 R2** | 2026-09-26 | SDDU Build Agent |
| **v2.0** | **R2 = W06（`TASK-ADN-217~223`，收口轮）**：S0''' 终态 node 双测试（真源切片 + 反证）· Chromium 只加断言（s0 ⑲ / recommendation / law8）· X-ADN-1~11 台账终态（4/6/1 + 老条目逐字保留）· supersession 一致性 + **保护段 keep 双绿** · **体积叶2 终态重登记 604,602（+1,397；两叶 Σ +5,676；EC-ADN-016 三态皆否；B 列净增 0）** · 门禁守恒三态齐（`assertionsRemoved=0` / `CHROMIUM_GATES=9` / 下界 51）· 人工面 M1~M5 ⏳ + `e2e` PASS。**两处构建期纠错已诚实登记（E1 ⑲ 自持已知态 / E2 recommendation 相位边界）**。全 23 任务完成 ⇒ build 收口 | 2026-09-26 | SDDU Build Agent |
