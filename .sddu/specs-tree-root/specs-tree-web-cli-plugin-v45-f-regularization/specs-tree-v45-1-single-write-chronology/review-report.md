# 审查报告：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C20 审查清单及四维度指引；本轮沿用，不重设计）
> **前置依赖**: `review.md`、本叶 `spec.md` v1.0、`plan.md` v1.1（ADR-V45-001~012）、`build.md` v1.3（§8 = review R1 修复轮）、`tasks.md`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-21
> **审查轮次**: **R2（轻量复审：R1 四阻塞闭环确认 + I 项抽检 + 修复轮新引入风险扫描）**
> **版本**: **v2.0**
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-21
> **更新说明**: R2 复审（HEAD `2c1fcf8`，R1 判定 ❌ → 修复轮已处置）：R1 四阻塞逐条 **closed**；I-01/I-03/I-06 抽检落地；`8ea1c46..2c1fcf8` 全量扫描（3 项额外缺陷修法正确 / sidepanel 体积增量归因机核 / 无夹带）；6 项门禁独立复跑 + 额外 `test:l1`；保护段与红线字节独立复算；结论 **⚠️ 有条件通过**（0 阻塞 / 2 改进 / 5 观察）。**R1 原文（v1.0）逐字保留于文末「附录 A」。**

## 1. R2 审查概要

| 维度 | 数值 |
|------|:--:|
| 复审清单项（本 brief §1.1~§1.8） | **8** |
| 通过 | **7** |
| 警告 | **1**（新风险扫描：无夹带，但发现 2 项文档/台账不一致） |
| 失败 | **0** |
| **阻塞问题** | **0** |
| 改进项 | **2**（I-07 / I-08，均非阻塞） |
| 观察项 | **5**（O-04~O-08） |

**复审基线**：分支 `feature/web-cli-plugin`，HEAD **`2c1fcf8`**（修复轮提交），工作树干净（`git status --short` 空）。审查范围 = R1 四阻塞的闭环证据 + `git diff 8ea1c46..2c1fcf8`（23 文件 / +1,043 −155）。

**R1 四阻塞闭环判定（本轮结论核心）**

| R1 阻塞 | 闭环判定 | 独立证据 |
|---|:--:|---|
| **BLOCK-01**（`l0-receipt-summary` 退役清单自相矛盾 / 判据时点依赖） | ✅ **closed** | `RETIRED_CONTAINER_IDS` 14 → **13**（逐字核对）；新增 `MIGRATED_CONTAINER_IDS`（**5**：`l0-receipt-summary` / `l1-more` / `l1-consequences` / `l1-ref` / `l1-gestures`）+ 判别规则注释 + 两清单互斥机核（`host-registry.test.ts`）；**时点无关判据两条**：无回执态（`l0.mjs` ⑧）与有回执态（`l1.mjs` ⑩）—— 本轮独立复跑双绿；13 项真退役逐项负向 **13/13** |
| **BLOCK-02**（悬空 `#l0-decision` 写点 + 虚假迁移注释 + 读后即弃） | ✅ **closed** | `pick-input.ts` 3 个写点 → `dropSurface() = #stream`；`page-input.mjs` ⑤ 改为 2 条真断言；本轮独立复跑 **108 passed / 0 failed**，两条断言均 ✔；两段证伪日志（`F1` 断开写点 ⇒ 107/1 红；`F2` 旧空心形态 ⇒ 同一断开态仍 106/0 全绿）原文与报告引用一致 |
| **BLOCK-03**（「载体数 == 1」无 live 判据 / AC-V45-001 锚点缺失） | ✅ **closed** | live 供给链接入（`stripCarrierReading` / `stripChannelReading` / `stripCarrierCounts` / `stripChannelProblems`），**单一实现** `evaluateStripChannels` 被 node 门与面板 live 共用（全仓仅 1 份实现，grep 复核）；载体半边「缺失即红 ∧ >上限即红」；本轮独立复跑 l0 段（env/site/probe/notice 各「载体面恰 1 + raw 节点恰 1」+ 判据 0 问题 + firstRun「卡在⇒行不在」+ 2 组注入反证）**全绿** |
| **BLOCK-04**（`plaintextTitle` 零反证） | ✅ **closed** | `system-merge.test.ts` 追加 4 条反证 + `TITLE_PLAINTEXT_JUDGEMENTS`（3 条，各声明可产出的 `expectFailPattern`）；**本轮独立探针**（直接 import 编译产物）确认：`?token=` **真抛错** / 经唯一写入点 `reduce({type:'notice'})` **真抛错且 `systemRows === []`（零半成品行）** / `<link rel="web-cli">正常文案` **返回剥离后文本** ⇒ 判据可 FAIL，非空心 |

## 2. R2 复审清单逐项结果

| # | 复审项（brief 口径） | 评估 | 发现 |
|---|---|:--:|---|
| RB-1 | BLOCK-01 迁移容器口径 + 时点无关双断言 + 13 项逐项负向复跑 | ✅ | 13/13 逐项负向（本轮实跑日志）；`MIGRATED` 5 项与退役并集互斥（npm test 内机核）；无回执态 / 有回执态两断言本轮实跑双绿；`RETIRED_HOST_IDS` = 4 + 13 = 17 与 `RETIRED_HOST_DISPOSITIONS` 派生同源（无手工第二清单） |
| RB-2 | BLOCK-02 `#stream` 落点真断言 + 两段证伪独立复跑 | ✅ | 写点 = 读点 = `ol#stream`（`dropSurface()`）；本轮 `test:page-input` 108/0；注释与实现一致；`[data-drop-active]` 唯一写点 3 处（`pick-input.ts`）无第三处 |
| RB-3 | BLOCK-03 live 读数供给链单一实现 + 4 通道恰 1 + firstRun 口径 | ✅ | `stripChannelProblems()` → `evaluateStripChannels()`（同一实现）；缺失读数 / 第二载体面逐通道可红（`density-thresholds.test.ts` ⑤b/⑤c）；`STRIP_CHANNEL_LEGACY_IDS` 6 通道一一对应；firstRun「卡在 ⇒ 行不在」由产品抑制谓词 `firstRun.visible \|\| firstRunCardPresent` 机核（⑤d 源文本断言） |
| RB-4 | BLOCK-04 `plaintextTitle` 4 反证真实且可红 | ✅ | 4 条反证在 `system-merge.test.ts`（含只测唯一写入点的产品路径）；独立探针复现全部 3 种行为（见 §1 表）；`expectFailPattern` 字面由 ①②③ 真实产出（防空声明段） |
| RB-5 | I-01 / I-03 / I-06 抽检 | ✅ | I-01：`plan.md` **§5.1.1 实现轮实况**（4 项计划内未触碰 + 7 项计划外触碰逐项「计划 → 实际落点」+ 修复轮追加 `pick-input.ts`）；I-03：`plan.md:772-773` `probe` 谓词改写为「可行动的未就绪」+ **D-W3-2 注记**；I-06：`host-registry.ts:124-148` 判别规则注释（真退役 vs 迁移容器）+ `MIGRATED_CONTAINER_IDS` + `build.md §8.6` 13 项逐项复核表（1 项移出）。顺带核 I-02（`plan.md:531` D-W3-1 注记）/ I-04（父 `spec.md:310` 记录 vs 断言口径）/ I-05（`l0.mjs` ⑧ 两条显式等价性对账）均在位 |
| RB-6 | 修复轮新引入风险（全量 diff / 3 项额外缺陷 / 归因 / 夹带） | ⚠️ | ① **3 项额外缺陷修法正确**：`node --check test/ui/*.mjs` = **0 BROKEN**；全仓注入不再用 `insertAdjacentHTML`（仅注释提及），改 `createElement + appendChild` 且注入返回值纳入断言；density stageB 改**互斥式** + live `face` 读数（232/0）。② **体积归因机核**：`dist/build-meta.json` 实测 `host-registry.ts` = 9,273 / `sidepanel.ts` = 83,904 / 输出 = 498,521；Σ (+2,145 +2,875) = **+5,020** = 498,521 − 493,501，与 W3 轮 `afterBytes`（7,128 / 81,029）链式自洽。③ **无夹带**：`wt.diff`（20:56 中间态，18 文件）⊂ 最终代码 diff；23 个变更文件逐项可归因到 `build.md §8.1/§8.8/§8.9/§8.10`。④ 但发现 **I-07 / I-08** 两项文档/台账不一致（非代码）。见 §4 |
| RB-7 | 门禁抽跑 6 项（+ 额外 `test:l1`） | ✅ | **7/7 全绿且与 build 自报逐项相等**：`npm test` 1045/0 · `test:l0` 244/0 · `test:density` 232/0 · `test:page-input` 108/0 · `test:size-ruling-vol3` 12/0 · `test:supersession` 35/0 ·（额外）`test:l1` 116/0。日志 `/tmp/opencode/v45-review-r2/` |
| RB-8 | 红线快验（冻结面 / 保护段 / 阈值） | ✅ | `8ea1c46..2c1fcf8` **不含** `src/content/**` / `manifest.json` / `design/**` / `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / `docs/v3-supersession-ledger.json` / `journey.mjs` / `binding.mjs`；保护段 **逐字节复算命中**（journey `cc79f413…` / binding `be9ad0e9…`）；`dist/content.js` 177,076 B / `52a82620…`、`dist/pick-layer.js` 33,900 B / `5f567d7e…` 实测一致；密度阈值（7/15 · 9/20 · 17/35 · 0.65 · 488 · 31 格）**零 diff** |

## 3. 审查维度汇总（R2）

| 审查维度 | 复审项 | 通过 | 警告 | 失败 |
|---------|:--:|:--:|:--:|:--:|
| 代码质量 | RB-6 | 0 | 1 | 0 |
| 规范符合性 | RB-1·RB-2·RB-3·RB-4·RB-5 | 5 | 0 | 0 |
| 架构一致性 | RB-8 | 1 | 0 | 0 |
| 测试质量 | RB-4·RB-7 | 2 | 0 | 0 |
| **合计** | **8** | **7** | **1** | **0** |

> R1 的 4 处「规范符合性失败」在本轮全部转为通过（FR-V45-010~015 / AC-V45-001 / NFR-V45-003 / NFR-V45-007 的验收锚点均已交付且本轮独立复跑）。

## 4. 阻塞问题

**无。** R1 的 BLOCK-01~04 已全部闭合（§1 表逐条证据）。

## 5. 改进建议与观察项

### 5.1 改进项（非阻塞）

| # | 位置 | 问题 | 对应 | 建议 |
|---|------|------|:--:|------|
| **I-07** | `build.md §8`（**缺**「现场差异」小节） | brief 所指的 §8「**现场差异**：上轮中断遗留的半成品实现被复核后接续」**在本仓不存在**：`grep 现场/工作树/未提交/接续/中断` 对工作树与**全部 git 历史**（`git log -S`）**零命中**；§8 仅 §8.1~§8.12。承接该语境的是 §8.10「修复轮额外发现与处置（3 项 + 1 项口径澄清）」，但它把 3 项缺陷的成因笼统归为「本轮首次真实执行 / 前轮只跑过 node 面」，**未登记「上轮中断遗留 → 本轮复核接续」这一过程**。交叉证据（`/tmp/opencode/wt.diff`，20:56，18 文件 = 最终代码 diff 的严格子集；`F1`~`F5` 证伪日志与 `fix-*.log` 时间戳 21:10~21:52 连续）表明该轮确实存在**中间态工作树被接续**，且 3 项缺陷（模板字面量反引号 / `insertAdjacentHTML` / density 断言口径）恰好都诞生于被接续的文件内 | RB-6 | （文档，零字节）在 `build.md §8` 追加一小节（或并入 §8.10 引言）**登记现场差异**：「接续轮起点 = `2c1fcf8` 之前的工作树中间态（可复算快照 `/tmp/opencode/wt.diff`）；§8 只登记最终态，继承项 / 新写项 / 缺陷归因在 §8.10 逐条给出」，使该轮的过程披露与产物一致。**代码与门禁无需改动** |
| **I-08** | `test/size-baseline.ts:1284`（`SIDEPANEL_RE_REGISTRATIONS['v45-1-reviewfix'].reason`） | 体积重登记理由写 `test:l0` **227 → 234**，与 `build.md §8.7`、本叶 `state.json`（`reviewR1Fix.gates.l0` = `227 → **244**`）**不符**。方向仍为「只增」（不构成判据放宽/掩盖），但审计数字失真 | RB-6 | 订正为 `227 → 244`（其余门禁数字 `1044→1045 / 115→116 / 229→232 / 106→108` 已核对一致） |

### 5.2 观察项（非阻塞，不参与结论）

| # | 项 | 说明 |
|---|---|---|
| O-04 | `build.md §8.12` 的提交清单把 `TREE.md` 列入 `git add` 路径，但修复轮提交 `2c1fcf8` **未触碰** `TREE.md`（TREE.md 在上一提交 `8ea1c46` 更新；本轮由 R2 的 sddu-tree 收口更新）。属清单**多声明**，非产物问题 |
| O-05 | `test/density-thresholds.test.ts` 的静态清单 `V4_RETIRED_IDS` 仍含 `l0-receipt-summary`，且注释归入「真退役」。该清单只做 **`index.html` 静态零残留**判据（不读 live DOM），故**不产生** BLOCK-01 式假阳性；但与产品侧「迁移容器」口径并存，属同一根因（两套「退役」语义未显式区分）。建议补一行注释：「本表 = 静态 id 从 `index.html` 退役（≠ 运行时迁移容器）」 |
| O-06 | `[data-drop-active]` 全仓（`src` + `index.html`）**无任何 CSS 消费者** ⇒ 名为「高亮」的状态在产品内仍**不可视**（写点已真实、门禁真断言已成立；R1 允许的路径已满足）。若期望用户可见的落点高亮，需补一条 CSS 规则；属界面打磨面，留 validate / 后续轮 |
| O-07 | `SIDEPANEL_GROWTH_BREAKDOWN.measuredOn` 仍为 `'2026-09-20'`（本轮追加了 2026-09-21 轮次行）；该字段**无门禁机核**（被机核的是 `SIDEPANEL_BASELINE_META.measuredOn = '2026-09-21'`，`size-budget.test.ts:381`）。属陈旧字段，建议随任一轮更新 |
| O-08 | 载体判据口径由「== 1」改为「**≤ 1 且缺失即红**」（`count === 0` 合法 = 事实当前不可见）。AC-V45-001 的「首屏三事实各恰出现一次」由此分解为：**存在性**（journey `#594` probe 行 / `#661` site 行 · hardening env / probe 行）+ **唯一性**（l0 raw 恰 1 + 判据 ≤1）。建议在 ADR-V45-001 注记里显式登记「0 = 事实不可见合法」以免后续误读 |

## 6. 门禁与字节级独立复跑对账（自报 vs 本轮实测）

**门禁（严格串行，一次一个 Chromium；日志 `/tmp/opencode/v45-review-r2/`）**

| # | 门禁 | build 自报（修复轮） | **本轮实测** | 判定 |
|:--:|---|:--:|:--:|:--:|
| 1 | `npm test`（node） | 1045 | **1045 passed / 0 failed** | ✅ |
| 2 | `test:l0` | 244 | **244 passed / 0 failed** | ✅ |
| 3 | `test:density` | 232 | **232 passed / 0 failed** | ✅ |
| 4 | `test:page-input` | 108 | **108 passed / 0 failed** | ✅ |
| 5 | `test:size-ruling-vol3` | 12 | **12 passed / 0 failed** | ✅ |
| 6 | `test:supersession` | 35 | **35 passed / 0 failed** | ✅ |
| 7 | `test:l1`（额外） | 116 | **116 passed / 0 failed** | ✅ |

> 未复跑（如实登记，留给 validate）：`typecheck` / `test:e2e` / `test:ui(journey)` / `test:binding` / `test:insight` / `test:hardening` / `test:stream` / `test:ask-auth` / `test:recommendation` / `test:ref-pick-wiring` / `test:gate-integrity`（node，已被 `npm test` 1045 覆盖）/ `test:zero-injection`（node）/ `test:l2` / `test:l1-reverse` / `test:l2-reverse` / `test:design-contract`。修复轮自报 24/24 且日志齐备（`/tmp/opencode/v4-gate-logs/v45-reviewfix/`，含 `fix-summary.txt` **如实记录** density 首轮 `rc=1`）。

**字节级独立复算**

| 项 | 登记值 | 本轮独立计算 | 判定 |
|---|---|---|---|
| journey 保护段 | `test/ui/journey.mjs` `43054..58287` / `cc79f413…` | sha256 = `cc79f413fa289ad6de3124602c21640edd36c6af51e8f12f0ebe4ce39d620da7` | ✅ **未动** |
| binding 保护段 | `test/ui/binding.mjs` `107780..115930` / `be9ad0e9…` | sha256 = `be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936` | ✅ **未动** |
| 冻结产物 | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 33,900 / `5f567d7e…` | `stat` + `sha256sum` 逐字节一致 | ✅ |
| 体积 | `dist/sidepanel.js` = 498,521 B；ceiling = floor(498,521×1.05) = 523,447；档位 512,000 / 绝对上限 563,200 | 实测 498,521；`build-meta` 归因 Σ +5,020；阈值三值同源 | ✅ |
| 密度台账 | 阈值 7/15 · 9/20 · 17/35 · 0.65 · 488 · 31 格 | 新旧 JSON 全量 diff：仅 `volume` 字段 + `reviewfixR1Note` 变更；阈值零 diff | ✅ |
| 取代台账 | 186 entries / protectedRanges / protectedSupersession / zeroDiffFiles 不变；`v3Vol3Closeout.⑤.newBaselineBytes` 493,501 → 498,521 | 逐字段比对：结构零增删；变更为 40 entries + 1 同源指针 + `leafBases[4]`（+1 组 / +1 行，584 == Σ 组和） | ✅ |
| 红线面 | T1~T10 / v3 台账 / manifest / design | `git diff --name-status` **不含**任一；`git status` 复跑后仍空 | ✅ |

## 7. 结论

**结论**: ⚠️ **有条件通过**

| 指标 | 结果 |
|------|------|
| R1 四阻塞闭环 | **4/4 closed**（0 阻塞） |
| 审查通过率（R2 复审项） | **87.5%**（7 / 8；唯一警告 = RB-6 的两项文档/台账不一致） |
| 阻塞问题数 | **0** |
| 改进项 | **2**（I-07 现场差异未登记 / I-08 台账 `l0` 计数失真，均非阻塞） |
| 规范符合性偏差 | **0**（R1 的 2 项 AC/NFR 锚点缺失已交付并经本轮独立复跑验证） |
| 可进入 validate | **是** |

**理由**：

1. **R1 四个阻塞全部真实闭合，且每条都有本轮独立证据**（不是采信 build 自报）：BLOCK-01 的 13 项逐项负向 + 时点无关双断言、BLOCK-02 的两条落点真断言、BLOCK-03 的 live 载体读数接入与 4 通道恰 1 + 注入反证、BLOCK-04 的 4 条反证（本轮另用独立探针复现三种行为）。6 项指定门禁 + 额外 `test:l1` **逐项与自报相等**。
2. **修复轮新引入风险扫描：无夹带、无回归**。23 个变更文件逐项可归因；体积增量由真实 metafile 逐模块机核（Σ +5,020 == 登记增量）；3 项额外缺陷的修法正确（`node --check` 0 BROKEN、无残留 `insertAdjacentHTML`、density 互斥式断言）；未发现 debug 残留 / `.only` / `.skip` / TODO。
3. **两项非阻塞缺陷均为「记录面」**：I-07（brief 所指的 build.md §8「现场差异」小节**不存在** —— 中断半成品的**代码处置完整且诚实**（缺陷被真实发现并修复、日志与报告一致、`fix-summary.txt` 如实保留首轮 density `rc=1`），但**过程披露缺失**）；I-08（体积重登记理由里的 `test:l0` 计数 234 与实测 244 不符，方向仍只增，不构成放宽）。
4. **建议流程**：I-07 / I-08 建议在 `@sddu-validate` 轮同批作零字节订正（或收口轮），**不阻塞 validate**。`@sddu-validate specs-tree-v45-1-single-write-chronology` 可直接开始动手验证；人工面三项（`title` 读屏 / 三主题 + 高 DPI 迁入块 / 320px 迁入块）仍 `⏳ 未执行`，须由 validate 显式承接、不得冒充 PASS。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| **v2.0** | **R2 复审**（HEAD `2c1fcf8`）：R1 四阻塞逐条 **closed**（0 阻塞）；I-01/I-03/I-06 抽检落地；修复轮 diff 全量扫描（3 项额外缺陷修法正确 / 体积归因机核 / 无夹带）⇒ **新发现 I-07**（brief 所指「现场差异」小节不存在、中断半成品的过程披露缺失）与 **I-08**（`size-baseline.ts:1284` 的 `test:l0` 227→234 与实测 227→244 不符）+ O-04~O-08；7 项门禁独立复跑与自报逐项相等；保护段 / 冻结产物 / 阈值字节独立复算全部命中。结论 **⚠️ 有条件通过 / 可进 validate**。R1 原文（v1.0）逐字保留于附录 A | 2026-09-21 | SDDU Review Agent |
| v1.0 | 初始创建（**R1：❌ 不通过**；C1~C20 逐项结果 13✅/4⚠️/3❌；**4 阻塞**：`l0-receipt-summary` 退役清单自相矛盾 / `#l0-decision` 悬空选择器 + 虚假迁移注释 / 「载体数==1」无 live 判据 + AC-V45-001 锚点缺失 / `plaintextTitle` 零反证；6 改进 I-01~I-06 + 3 观察 O-01~O-03；13 项门禁独立复跑与 build 自报逐项相等；4 段保护段 pin 与体积/红线字节独立复算全部命中） | 2026-09-21 | SDDU Review Agent |

---

## 附录 A：R1 审查报告原文（v1.0，逐字保留，不参与本轮结论）

> 说明：仅将原 H1 标题行改为本附录标题（文档结构需要）；**正文（含 R1 的审查概要 / C1~C20 逐项结果 / 四维度汇总 / 4 阻塞 / 6 改进 / 3 观察 / 门禁对账 / 结论）逐字保留，未做任何改写**。

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C20 审查清单及四维度指引）
> **前置依赖**: `review.md`、本叶 `spec.md` v1.0、`plan.md` v1.0（ADR-V45-001~012）、`build.md` v1.2、`tasks.md`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-21
> **审查轮次**: **R1**
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（R1 静态审查：C1~C20 逐项结果 / 20 项 × 区块 4 阻塞 + 6 改进 + 3 观察；13 项门禁与字节级检查独立复跑对账；结论 ❌ 不通过）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **20**（C1~C20） |
| 通过 | **13** |
| 警告 | **4** |
| 失败 | **3** |
| 阻塞问题 | **4**（BLOCK-01 / 02 / 03 / 04） |
| 改进项 | **6**（I-01~I-06） |
| 观察项 | **3**（O-01~O-03） |

**审查范围**：`git diff 8a7e930..23050b1 -- packages/web-cli-plugin`（53 文件 / +15,067 −8,455，含新增 3 个 node 门禁 + 2 个 src 模块），HEAD `23050b1`，分支 `feature/web-cli-plugin`，工作树干净（`git status --short` 空）。`dist/` 为构建产物（gitignore），实测 `dist/sidepanel.js` = **493,501 B**（= 登记值）、`content.js` / `pick-layer.js` sha 与登记值**逐字节相同** ⇒ 产物对应当前提交源码。

**本轮独立复核（只读、严格串行、一次一个 Chromium）**：

| 类别 | 项 | 结果 |
|---|---|---|
| 门禁复跑 | `typecheck` / `npm test` / `l0` / `density` / `ui(journey)` / `binding` / `l1` / `recommendation` / `supersession` / `gate-integrity` / `size-ruling-vol3` / `ref-pick-wiring` / `design-contract` | 13/13 **与自报逐项相等**（详 §7） |
| 字节复算 | journey 三段 pin（新 `cc79f413` / v4-1 `e2b500df` / v3 `6b45c3fa`）＋ binding 保段 `be9ad0e9` + `startByte` | **4/4 逐字节命中**（§5 详证） |
| 台账复算 | `docs/v4-density-baseline.json` 新旧全量 diff（逐格）+ `v45Ledger.after` ↔ `tiers` 同源 | 31 格齐备；**仅 1 格变更**；28 机对格 `after` 与登记值 100% 同源 |
| 红线复验 | `dist/content.js` / `dist/pick-layer.js` sha；`design/**` / `manifest.json` / `src/content/**` / ROADMAP / v3 台账 | **零 diff / 逐字节不变** |
| 未复跑（如实登记，留给 validate） | `l2` / `insight` / `hardening` / `ask-auth` / `page-input` / `stream` / `e2e` / `l1-reverse` / `l2-reverse` / `zero-injection(node)` | 其中 6 项为 node 门禁、已被 `npm test`(1044) 整体覆盖；Chromium 项按抽跑口径留 validate |

## 2. 逐项审查结果（C1~C20）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 5 提示带 + 4 宿主 + `decision` 壳的 DOM 真消失 | FR-V45-010 / 020 / 021 / 022 · AC-V45-001/002 · NG-V45-001 | ✅ | `index.html` 内 `data-host` / `data-transitional-host` **0 命中**；`#env-guard` / `#site-hint*` / `#onboarding` / `#discovery-notice*` / `#notice` / `#l0-decision` / `#l0-kicker` / `#l0-more` / `#l0-ref-toggle` / `#l1-group` 全部 **0 命中**；`ol#stream` 静态子节点为空；l0/l1 门禁逐 id 负向（`l0.mjs:277-292,726-727`、`l1.mjs:205`）＋ 独立复跑全绿；ARIA 语义由 `#stream[role=log][aria-live=polite]` + 行/card 等价承载（`index.html:1223`） | — |
| C2 | **防复辟**：隐藏充数 / 空壳 / id 复用 / 改名 / **悬空 id 选择器** | NG-V45-001/002/017 · R-REG-906 · BLOCK-02 教训 | ❌ | ① **`l0-receipt-summary` id 复用**（→ BLOCK-01）；② **`pick-input.ts` 悬空 `#l0-decision` 写点**（→ BLOCK-02）。隐藏/空壳/改名三条**未发现**（退役面无 `hidden` 存活、无空壳 id、无改名等价形态） | 阻塞 |
| C3 | 单写语义：`systemRow()` 唯一构造 + emitter 唯一 + `firstRunCard` 归并 + `title` 净化代码 | FR-V45-011~015 · ADR-V45-001 · NFR-V45-003 | ⚠️ | 代码侧**成立**：`chat-state.ts:346` 是唯一 `kind:'system'` payload 构造点（全仓 `dispatch({type:'system'})` 仅 `sidepanel.ts` 5 处均为同通道投递）；5 通道 `emitterSite` 源文本计数 == 1（`density-thresholds.test.ts` 逐通道断言，复跑绿）；`firstRunCard` 为唯一首装卡工厂（`sidepanel.ts:1421/1494/1716`）；`plaintextTitle`（`stream-plaintext.ts:89-93`）在**唯一写入点** `chat-state.ts:363` 执行 fail-closed 净化。⚠️ **但该新净化面**无任何反证（→ BLOCK-04）；且 `firstRun` 事实族在产品态有 2 个载体（通道行 + 卡，见 BLOCK-03） | 中 |
| C4 | **事实面唯一**「每 kind 可见载体数 == 1」是否有 live 判据 | FR-V45-011/015 · **AC-V45-001（核心验收）** · NFR-V45-004/007 | ❌ | `carrierCount: 1` 是**自声明常量**；`evaluateStripChannels` 的 `observedCarriers` **全仓无 live 供给点**（唯一实参是 node 门的 `[]`，`density-thresholds.test.ts:823/830/844`，注释 `:804` 自承「运行时 live 读数在 W4/TASK-V45-116 接入」而 TASK-V45-116 **未接入**）；AC-V45-001「首屏三事实各恰出现一次」**无任何 live 断言**（→ BLOCK-03） | 阻塞 |
| C5 | journey 链式取代诚实性 | FR-V45-080/083/084 · ADR-V45-004 · R-REG-001 | ✅ | 台账 `supersessionChain` **3 链节真链**：`supersededFrom` 首节 `null`、链连续性成立、`protectedRanges[0].supersededFrom === chain.at(-2)`、`newPin` 同源；**独立字节复算 3/3 命中**（新 pin `cc79f413…` @43054..58287；v4-1 `e2b500df…` @`a04e677` 同区间；v3 `6b45c3fa…` @`187c205` 区间）⇒ 链非装饰；v3 pin 已不能由 legacy 等值命中（`supersededFrom` 现指直接前驱）⇒ 链式查找是**唯一**入口；`#15b` 门槛 `65` 逐字未动 + 新增 `#15b-0` 把「前置是 no-op」机核化（`journey.mjs:915,931,934`）；`#15c` 加严为「出流 + hidden + 父节点==body」（`:885`）；复跑 171/171 | — |
| C6 | binding 字节中立避让 | FR-V45-081 · AC-V45-015 · EC-V45-013 · ADR-V45-005 · R-V45-102 | ✅ | `git diff` 仅 **3 处 hunk**：`:896`（段前等价改写）+ `:2256`（段后改写）+ `:749`（**补偿删白**：`── phase 1…` 前导与尾部装饰连线裁减，17×3 + 1 = **52 B** = 段前表达式 Δ 的精确等长）；段本体 sha `be9ad0e9…` 与 `startByte` **107780** 独立复算双绿；`:880 panelNotice`（事件语义白名单）**零触碰**（diff 该行零变化）；`binding` 复跑 **192/0 首轮即绿**（本轮未复现 KL-N-10 flake） | — |
| C7 | density 新基线非放宽 | FR-V45-070~074 · AC-V45-018 · ADR-V45-006 · NG-V45-007 | ✅ | 新旧基线 JSON **逐格全量 diff**：`tiers` 28 格中**仅 `risk(staleRef)@400` 变更**（`7/7/18/237 → 6/7/17/232`，逐项下降 = `tighten-only`），`thresholds`（7/15·9/20·17/35）/ `streamHeightRatioMin` 0.65 / `logClientHeightFloor` 488 / `registeredCells` 31 / `perCardBudget` **全部零 diff**；`v45Ledger.cells` 31 格齐备、`after` 与登记 `tiers` 值 **28/28 同源**（独立复算）；夹具稳态锚 = **三重构造判据**（源行恰 1 ∧ 无未终态过程卡 ∧ 卡数 == 登记期望，`density.mjs:398-440`）且由构造保证（无 sleep）；`RP-V4-10` 反证实跑（移除构造末步 ⇒ ①/③ 必红，补回 ⇒ 全绿）；复跑 **229/0** | — |
| C8 | 断言重写质量（数量不减 ∧ 非空心） | FR-V45-004/082 · AC-V45-017 · NFR-V45-007 | ⚠️ | 绝大多数重写**实质有效**：`EXPECTED_TRIGGERS` 由「节点存在」升级为「节点 `null` + 流内载体在」双断言（`sidepanel-view.test.ts` 逐条）；l0 ③ 新增「卡内触发器 / N 值真值派生 / 选项池无重复投影」；system-merge 由「三者之一存在」升级为 **emitter 恰 1 次**（可区分单写与双写）；l1 ①/⑪ 退役面逐项负向。⚠️ 但 `page-input.mjs` ⑤ 的「拖放落点」重写为**读后即弃**（值未被断言，且读错载体 ⇒ 声称的迁移未发生，→ BLOCK-02） | 中 |
| C9 | act 闭集 6 项 + 本地 act 布线真实性 | FR-V45-030~033 · AC-V45-011/012 · ADR-V45-007 · R-REG-904/905 | ✅ | `NEXTSTEP_ACTS = ['next','repick','describe','authorize','rebind','help']`（逐字 6 项，`recommend.ts:194`）；`RECOVERY_CHIP_ORDER` 规则表使 `site`/`probe` 触发**首项 = `rebind`**（`recommend.ts:208-214`）；三个本地 act 各有**产品路径**分支（`sidepanel.ts:244`/`:251`/`:264`）且唯一入口 `rebindCurrentTab()` / `openSettingsSection()` / `authorizeCurrentSite()` 无 `requestTurn`；`LOCAL_ACT_SLOTS` 全部 `landed`；白名单**零扩项**（`NEXTSTEP_SOURCE_WHITELIST` 7 项不变）；复跑 `recommendation` **59/59**，其中 ⑬/⑭ 由真实 SW 触发（非 seam）产出 `risk-recovery` 卡且「chips 全为本地动作、零 user 回合」 | — |
| C10 | 手势 → 设置「帮助」分区 | FR-V45-040~042 · ADR-V45-008 · R-REG-903 | ✅ | `SETTINGS_SECTION_IDS` 7 → **8**（追加 `settings-help`，`sections.ts:35-44`），计数仍由 `settingsSectionCount()` 派生（无第二真值）；新增 `settings/help.ts`（6 行由 `view-model#gestureRows()` 单源渲染、**只读零可点**、沿用 `#l1-gestures` 容器 id 承载迁移面）；`NEVER_FOLDABLE` 追加 `settings-help`；chip `act:'help'` 走 `openSettingsSection('settings-help')`（零回合 / 零输入框写入，`recommendation.mjs:301` + `local-act-wiring.test.ts:283`） | — |
| C11 | `options` 解冻（纯文案 + 范围门禁） | FR-V45-050~052 · AC-V45-013 · EC-V45-010 · ADR-V45-009 · NG-V45-005 | ✅ | 单文件 diff **恰 1 行文案**（`在侧栏「授权当前站点」…` → `在侧栏「设置 → 站点与授权」点「授权当前站点」…`），零结构 / 零属性 / 零脚本；`unfrozenZeroDiffFiles[2]` 九字段 + `maxByteDelta: 256` + `scopeGate`；范围门禁逐 hunk 机核（纯文案 / 零 `script|link|import|href|src|on*` / 字节差 ≤ 阈值）+ **2 条反证**（注入 `<script>` 必红、字段缺失 / `reason<40` 必红）实跑于 `npm test`；v3 台账零 diff；`zero-injection` 27 不退 | — |
| C12 | 零宿主判据 + `RETIRED_*` 扩容 + 5 组伪造反证 | FR-V45-060~062 · ADR-V45-010 · G-V45-003 · R-REG-010/906 | ⚠️ | 判据本身**真实可 FAIL**：`REGISTERED_STRUCTURAL_HOSTS = []`（反向判据）、6 类问题串纯函数（`host-registry.ts:349-397`）、`host-registry.test.ts` **5 组 forged reading**（删属性 / 改名 / 塞进卡 / 只删标记 / 空注册表仍留 DOM）逐组判红 + 双写理由字面零命中；`RETIRED_HOST_ATTRS` 4 + `RETIRED_CONTAINER_IDS` 14 + 逐项反证元数据。⚠️ 但 `RETIRED_CONTAINER_IDS` 含 `l0-receipt-summary`，而该 id 在产品态被**重新铸造**（迁移容器与「真退役容器」口径混淆 ⇒ 判据时点依赖，→ BLOCK-01） | 中 |
| C13 | `#composer` 出流 + 出流护栏 | FR-V45-023/024 · AC-V45-005 · NFR-V45-006 · ADR-V45-003 · R-V45-105 | ✅ | `index.html:1358` 为 `body` 尾**最后一个布局元素**（`<script>` 之前）且 `hidden`；id / ARIA / `#input` placeholder / `#send` type **零变化**；`#stream` 子树不含 `#composer`/`#input`/`#send`（l0/journey 断言）；`syncComposerVisibility()`（`sidepanel.ts:2050-2057`）是 `#composer.hidden` 的**唯一派生点**（全仓 `composer.hidden =` 仅此 1 处），派生式 = `兜底开启 ∧ 聊天面可见`，视图打开态不会浮出输入框 | — |
| C14 | 体积三值同步 + 档位不下移 + `pending-author-line` | FR-V45-090~093 · AC-V45-019/020 · NFR-V45-005 · ADR-V45-011 · R-V45-101 | ✅ | `SIDEPANEL_BASELINE_BYTES = 493_501`；`SIDEPANEL_CEILING = floor(493,501×1.05) = 518_176`；档位 `ceilTo50KB(493,501) = 512_000`；绝对上限 `563_200`；`SIDEPANEL_TIER_FLOOR_BYTES = 460_801` 且线性闸门断言 `ceilTo50KB(460,801)=512_000 ∧ ceilTo50KB(460,800)≠512_000`（边界不宽松）；`authorConfirmation.status` 保持 **`pending-author-line`**（未伪称已确认）；台账 `v3Vol3Closeout` 字段同源前移 493,501；`direction` 闭集（`raised`/`lowered`/`unchanged`）+ 每轮声明覆盖判定 + 终轮 `Δ=0/unchanged`；实测产物 493,501 B = 登记值（`density` 阶段 F 亦断言）；净减 0 ≤ 19,225 ⇒ 停机规则未触发 | — |
| C15 | 红线全表零 diff 独立复验 | FR-V45-093 · EC-V45-010 · T1~T10 | ✅ | `git diff --name-status 8a7e930..HEAD` 中**不含** `src/content/**` / `manifest.json` / `design/**` / `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / `docs/v3-supersession-ledger.json`；实测 `dist/content.js` **177,076 B / sha `52a82620…`**、`dist/pick-layer.js` **33,900 B / sha `5f567d7e…`** 与登记值逐字节相同；阈值 5/0.65/488/cap `record-only` 未动 | — |
| C16 | 37 条元素去向 + L2 承载块 + 零悬空引用 | FR-V45-021/022/025/026 · AC-V45-007/008/009 · EC-V45-005/013 | ✅ | 退役 19：`#l0-kicker`/`#l0-ref-badge`（卡内 `data-*` 徽标）· `#l1-history*`（→ `#l2-audit-count`）· `#l1-local-tree-global`/`#l1-receipt-audit`（**消解**，grep 零悬空）…；迁移 13：`#l1-more*`/`#l1-consequences*` → `cards/decision-region.ts` 卡内、`#l1-ref*` → 最新 ref 卡（`#l1-ref-rescue` 可见性谓词 `canReanchor` 逐字不变 ⇒ EC-V45-005/N-05 关闭）、手势表 → `settings/help.ts`、局部树/回执 → `#view-host` 两个只读块（静态声明于 `index.html:1245,1264`，非第二滚动容器）；`#l0-receipt-summary` 迁卡固化区（**id 复用 ⇒ BLOCK-01**）；`rounds` 计数**唯一**声明点 `#l2-audit-count` | 低 |
| C17 | 代码质量（可读性 / 职责 / 死码 / 注释真实性） | §5.1 · LNG-V45-001~004 | ⚠️ | 新增模块**可读性良好**（模块文档交代「为什么」与替代关系；`assertStreamPureCardOrder` 抛错而非返回 false；`evaluateStripChannels` / `evaluateHostRegistry` 纯函数单源）。⚠️ 但 ① `pick-input.ts:290/293/296` 是**写后不读的死写**（目标 id 已不存在）；② `page-input.mjs:265-276` 注释声称的「落点改为 `#stream`」与实现不符（**注释失真**，→ BLOCK-02）；③ `plan.md §5.1` 文件影响与实现实况不符（→ I-01） | 中 |
| C18 | 收敛性（FR/AC ↔ tasks ↔ build 三方追溯 + 门禁账） | FR-V45-001~004 · AC-V45-017 · NG-V45-008 | ✅ | 父 spec 实为 **44 条 FR**（`FR-V45-005~008` 系 `NFR-V45-005~008` 的子串误匹配，非独立 FR），与叶 `covers` 44 项**逐条一致**；`acceptanceAnchors` **22 项** = 父 §9 的 22 条 AC；19 任务 ↔ 44 FR 覆盖矩阵（tasks.json `coverageMap`）逐项可追；`gate-integrity` 元门禁 13/13（`CHROMIUM_GATES` 保持 9、`EXPECTED_AUDITED_FILES` 只追加）；13 项门禁独立复跑**与自报逐项相等**（§7） | — |
| C19 | 反证不空转（RP 全集 / 注入点重写 / 新判据反证） | FR-V45-073/074/084 · AC-V45-012/016 · NFR-V45-007 · EC-V45-012 · R-V45-106 | ❌ | 既有反证**真实**：`RP-V3-01~04/08/09` + `RP-V4-01~07/09/10` 逐条实跑（`density.mjs:1280-1900`，含**恒绿修复**：RP-V3-02 注入量动态化 + 副本落点改 `test/ui/`；RP-V4-02/03 靶面改空态档；RP-V4-08 于 `test:supersession` 内 + 逐字节还原）；注入点随形态搬迁已重写（`l1-reverse` RP-L1-E/H、`l2-reverse`）。❌ **但本轮新增的安全判据 `plaintextTitle` 零反证 / 零测试**（grep：`test/**` 无任何引用）⇒ NFR-V45-003 的验收锚点「注入 secret / URL query 反证必抛错」与 ADR-V45-001 §8④、`tasks.md:282` 验收项**均未交付**（→ BLOCK-04） | 阻塞 |
| C20 | 人工面与纪律诚实性（flake / 串行 / 不冒充 PASS） | AC-V45-021/022 · 父 §5.3/§15 | ✅ | `KL-N-10` / `K-R3-1` / `K-R3-2` **如实登记**（隔离复跑记录 + 逐次不同的失败项 + 不阻塞收口裁定），本轮 binding 首轮即绿、未观察到新 flake；人工面三项（`title` 读屏 / 三主题 + 高 DPI 迁入块 / 320px 迁入块）**全部标注 `⏳ 未执行`**、未以自动判据冒充（`build.md §6.6`）；门禁日志目录 `/tmp/opencode/v4-gate-logs/v45-r1|r2|r3` 齐备 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 1（C17） | 0 | 1 | 0 | 0% |
| 规范符合性 | 12（C1·C2·C3·C4·C7·C9·C10·C11·C13·C14·C16·C20） | 9 | 1 | 2 | 75.0% |
| 架构一致性 | 4（C5·C6·C12·C15） | 3 | 1 | 0 | 75.0% |
| 测试质量 | 3（C8·C18·C19） | 1 | 1 | 1 | 33.3% |
| **合计** | **20** | **13** | **4** | **3** | **65.0%** |

> 警告项（C3 / C8 / C12 / C17）均为**同一批根因的旁证或文档面**：C3 与 C4 同源（载体唯一性）、C8 与 C2 同源（⑤ 空心断言）、C12 与 C2 同源（清单口径）、C17 与 C2/I-01 同源。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| **BLOCK-01** | `src/ui/sidepanel/host-registry.ts:133-148`（清单）· `:349-397`（判据 ③）· `src/ui/sidepanel/sidepanel.ts:989-996`（live 读数）· `src/ui/sidepanel/l1/panels.ts:267,288`（铸造点）· `test/ui/l0.mjs:277-292,726-727` · `test/ui/l1.mjs:97,205,704-723` | **`l0-receipt-summary` id 被登记为「退役容器」却仍在产品态被重新铸造** —— 判据自相矛盾且**时点依赖**：`RETIRED_CONTAINER_IDS` 含 `l0-receipt-summary`，判据 ③ 与面板 live 读数（`RETIRED_CONTAINER_IDS.filter(id => getElementById(id) !== null)`）要求它**零 DOM 存在**；但 `paintReceiptSummary()` 在**收到第一条真实回执后**把 `<div id="l0-receipt-summary">` 铸进最新卡的 `.card-fixed`（`panels.ts:288`）。因此：`l0.mjs:277-292` 的「0 问题 / 零残留」只在**夹具尚未产生回执**的时点成立；一旦有回执，产品 `testing.hosts().problems` 会报「已退役容器 #l0-receipt-summary 仍在 DOM」的**假阳性**；且同一门禁内部 `l1.mjs:205`（零残留）与 `l1.mjs:723`（断言它在 `.card-fixed` 内）对**同一 id** 给出相反要求 | C2 / C12 | 二选一（建议后者，最小改动）：① 铸造点改名（`node.id = 'card-receipt-summary'`，与 `className='card-receipt-summary'` 对齐）并从 `RETIRED_CONTAINER_IDS` / `l0.mjs:721` / `l1.mjs:97` 同步；② 承认它是**迁移容器**（与 `#l1-more` / `#l1-ref` / `#l1-gestures` 同口径，那些**故意不在清单**）⇒ 从 `RETIRED_CONTAINER_IDS` 移除该 id 与两处测试清单，并在 `host-registry.ts` 注释补一条「保留 id 的迁移容器 vs 真退役容器」判别规则。**并补一条时点无关判据**：在已有回执的夹具状态下再读一次 `hosts().problems === []`（反证：把 id 加回清单 ⇒ 必红） |
| **BLOCK-02** | `src/ui/sidepanel/pick-input.ts:290,293,296` · `test/ui/page-input.mjs:265-276` | **悬空 id 选择器 + 虚假迁移注释 + 读后即弃断言**：拖放高亮的 3 个写点仍打在 `doc.getElementById('l0-decision')`（该容器已随 W3 真退役，`?.` 使其成为**静默 no-op**；全仓该属性仅这 3 处 + 1 处测试读，且**无任何 CSS 规则**，故该状态在产品态不可观测）。同处测试注释声称「拖放落点从退役的 `#l0-decision` 壳改为**流内决策面**（`#stream`）」，但产品从不写 `#stream` 的 `data-drop-active`，且 `const active = zone2.getAttribute(...)` 的返回值**未被任何断言使用** ⇒ 注释失真 + 判据空心（`pick-input` 的 drop 监听在 `document` 上，落点功能本身仍由「引用数 +1」断言覆盖，故**用户可见功能未坏**，坏的是「真退役」的完整性与该判据的可信度） | C2 / C8 / C17 | 把 3 个写点迁到真实落点面（`document.getElementById('stream')?.setAttribute('data-drop-active','true')` 或 body 级 zone），并在 `page-input` ⑤ 把丢弃的读改为**真断言**（`check('⑤ 落点高亮落在流面', active === 'true')`）；若决定废弃该状态，则删除 3 个写点 + 修正注释 + 删除无效读。任一路径都要让注释与实现一致 |
| **BLOCK-03** | `src/ui/sidepanel/host-registry.ts:199-209,287-306` · `test/density-thresholds.test.ts:804,823,830,844` · `src/ui/sidepanel/sidepanel.ts:989-1007`（`hosts()`）· `src/ui/sidepanel/sidepanel.ts:1711-1725`（firstRun 双载体）· `test/ui/{journey,hardening,recommendation}.mjs` | **「可见载体数 == 1」只有声明、没有 live 判据**（判据空转）：`carrierCount: 1` 是自声明常量；`evaluateStripChannels` 的载体半边在 `observedCarriers` 为空/缺失时**直接跳过**（`:297`），而全仓**没有任何 live 供给点**（唯一实参是 node 门硬编码的 `[]`；注释 `:804` 自承「live 读数在 W4/TASK-V45-116 接入」，但 TASK-V45-116 **未接入**，build §3.5/§4.5 却声明「载体数 == 1 + 4 组反证」已落地）。后果：**AC-V45-001（核心验收「真机首屏三事实各恰出现一次」）无任何 live 断言** —— 所有 live 读取都用 `querySelector`（只取首个命中：`journey.mjs:594/661`、`hardening.mjs:356`、`recommendation.mjs:100`），第二条同 kind 投影**不可能被看见**；仅 `notice` 通道被 live 计数（`density.mjs:402-431` 恰 1 行）。具体反例：`firstRun` 事实族产品态有 **2 个载体**（`observeChannel('firstRun', …)` 变化时追加行 + `firstRunCard` 常驻卡），登记却为 1。ADR-V45-001 §8① 要求的反证（「注入第二条同 kind 行 ⇒ 载体数 == 1 红」）因此**不可实跑** | C4 / C3 | ① 把 live 读数接入判据：在面板侧由 `hosts()` 或新 `stripChannelReading()` 输出 `observedCarriers`（按 `#stream [data-msg-type="system"][data-kind="<kind>"]` 计数 + `firstRunCard` 计入同一事实族），并让 `l0`/`journey` 门禁断言 `evaluateStripChannels(realReading) === []`；② 为 `env`/`site`/`probe`/`firstRun` 各补一条**恰 1** 断言（`querySelectorAll(...).length === 1`）；③ 实跑 ADR 的注入反证（插入第二条同 kind 行 ⇒ 红 ⇒ 逐字节还原 ⇒ 绿）；④ 若确认 `firstRun` 双载体是设计（行记「步骤迁移」、卡记「当前引导」），须把 `carrierCount` 改为 `{streamRow:1, card:1, note}` 之类的显式口径，不能继续用 `1` 一词两义 |
| **BLOCK-04** | `src/ui/sidepanel/stream-plaintext.ts:89-93` · `src/ui/sidepanel/chat-state.ts:363` · `plan.md:355,443`（R-REG-901 / ADR-V45-001 §8④）· `tasks.md:282` · `test/env-guard.test.ts`（未改动） | **本轮新增的安全判据 `plaintextTitle` 无任何反证 / 无任何测试**：新 `title` 净化面是**页面事实可达**的渲染面（`site.detail` → 行 `title`），NFR-V45-003 的验收锚点明确要求「新增断言：`title` 内容经 `assertStreamPlaintext` 等价校验（**注入 secret / URL query 反证必抛错**）」；plan ADR-V45-001 §8④、`tasks.md:282`「`title` 净化反证：注入 `?token=…` / 页面文本 ⇒ 抛错」同。实测：`test/**` 对 `plaintextTitle` / `systemTitle` **零引用**（grep 仅命中 `size-baseline.ts` 的说明文字）；`test/env-guard.test.ts` 本轮**未改动**且无 title/token/plaintext 用例；仅既有的 `assertStreamPlaintext` 自身被覆盖（`ask-auth-inflow.test.ts:183-186`，v4-3 遗留）。⇒ 该新判据**不可 FAIL**（违反 NFR-V45-007「每条新 / 改判据可 FAIL 并声明 `expectFailPattern`」），AC 锚点未交付；且实现采用 **strip-then-scan** 顺序（先 `replace(/<[^>]*>/g,' ')` 再扫），正是最需要反证兜底的形态 | C19 / C3 | 在 `test/system-merge.test.ts`（或新建 `test/stream-title-plaintext.test.ts`）补 4 条：① `plaintextTitle('https://a.test/x?token=abc')` **抛错**；② `dispatch({type:'notice', text, title:'…sk-ABCDEFGHIJKL'})` 抛错（走**唯一写入点**的产品路径，非只测函数）；③ `plaintextTitle('<link rel="web-cli">正常文案')` 返回剥标记后的文本（锁 strip-then-scan 顺序）；④ 声明的 `expectFailPattern` 字面 + `gate-integrity` 的 `EXPECTED_AUDITED_FILES`/反证计数同步（只增） |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-01 | `plan.md §5.1` vs 实现实况 / `build.md §2,§4` | **文件影响表与实现实况不符**：计划内 4 个 `src` MODIFY **未触碰**（`l1/receipt.ts` / `l1/local-tree.ts` / `l2/audit.ts` / `l2/view-host.ts`，L2 承载块改由 `index.html` 静态声明 + `l1/panels.ts` 单写入者画），另有 **7 个未计划文件被改**（`cards/decision-region.ts` NEW / `density-scope.ts` / `l0/shell.ts` / `chat-state.ts` / `cards/system.ts` / `stream-model.ts` / `stream-plaintext.ts`）。LNG-V45-004 要求「取代 / 登记与实现同轮」，计划侧未回写 | C17 | 在 `plan.md §5.1` 追加「实现轮实况」小节（或在 `build.md §2` 显式登记为偏差），逐项给出「计划 → 实际落点」映射；无需改代码 |
| I-02 | `plan.md` ADR-V45-002 §5（第 502 行）· `build.md §4.7/§6.7 D-W3-1` | **D-W3-1 偏差未回写 ADR**：ADR 字面把 `l2-tree-attribution` / `l2-audit-evidence` 同时列入 `NEVER_FOLDABLE` 与 `COLLAPSIBLE_TARGETS` ⇒ 与「两表互斥」断言自相矛盾（build 的裁决在技术上**必要且正确**），但 ADR 正文仍是错的口径，形成「实现已裁决、ADR 仍矛盾」的漂移 | C5 / C12 | 在 ADR-V45-002 §5 追加一行注记：三项新增为 `region-stream` / `settings-root` / `settings-help`（长度仍 14），`l2-*` 留在白名单；标注裁决来源 `build.md §6.7` |
| I-03 | `plan.md` ADR-V45-007 §1（第 743 行）· `build.md §4.7/§6.7 D-W3-2` · 父 `spec.md` FR-V45-030 | **D-W3-2 偏差未回写 ADR / 需求口径**：ADR 字面 `probe` 触发 = `steady === false ∨ phase !== 'ready'`，实现收窄为「相位存在 ∧ `steady === false` ∧ 相位 ∉ {`ready`,`probing`}」（理由充分：避免未探测过的首屏永久退化到恢复卡）。父 spec 只说「触发集扩展（site / probe）」未定谓词，故**不构成需求偏差**，但 ADR 口径需同步 | C9 | ADR-V45-007 §1 改写 `probe` 谓词为「可行动的未就绪」并注明与 FR-V45-025（空态去噪）的取舍；`tasks.md` 停机规则表可加一行「触发集谓词收窄须登记」 |
| I-04 | 父 `spec.md` NFR-V45-001 验收锚点「`test:density` 的 `streamRatioSpike`（12/12，最差 0.7273）不回退」 | **锚点口径把「记录」当「断言」**：`streamRatioSpike` 只存在于 `docs/v4-density-baseline.json`（v4-1 spike 记录），`test/ui/density.mjs` **无引用 / 无断言**；实际 live 护栏是 `journey #15b` ≥65%（`STREAM_HEIGHT_RATIO_MIN` 未动，复跑 171/171 通过） | C7 / C14 | 在 NFR-V45-001 的验收锚点里区分「记录（spike）vs 断言（`#15b`）」，或把 `streamRatioSpike` 的阈值面做成 density 门禁的一条 live 断言（可选） |
| I-05 | `test/ui/l0.mjs` ⑧（`EXPECTED_TRIGGERS` 12 → 8） | **正面触发器集合收窄 4 条**（`l0-more` / `l0-ref-toggle` / 4 个 L1 开关 → 退役负向），等价性由「6 退役触发器 + 14 退役容器负向 + 2 卡内成对」补偿，门禁总数 223 → **227 不减**（判定**可接受**）；但「正面集合收窄 ↔ 新增负向」的等价性论证只散见于注释 | C8 | 在门禁内加一条显式对账断言/注释块：`退役触发器 6 + 退役容器 14 + 卡内成对 2 ≥ 收窄的 4 条正面契约`，使等价性成为可读结论而非散注 |
| I-06 | `src/ui/sidepanel/host-registry.ts:110-158`（清单与注释） | **退役清单缺「判别规则」**：`#l1-more` / `#l1-ref` / `#l1-gestures` 等**迁移容器保留原 id 且故意不在清单**，而 `#l0-receipt-summary`（同为迁移容器）却在清单里 —— 注释只列了「Deliberately absent」的例子，没有给出**规则**，这正是 BLOCK-01 的成因 | C12 | 补一条规则注释：「真退役 = 该 id 的**角色**（触发器 / 宿主 / 决策壳）随宿主消失且无产品写点；迁移容器（内容 id 随载体搬迁）**保留 id、不入清单**」，并按规则逐项复核 14 项清单 |

## 6. 观察项（非阻塞，不参与结论）

| # | 项 | 说明 |
|---|---|---|
| O-01 | 人工面三项仍未执行（`title` 读屏体验 / 三主题 + 高 DPI 迁入块 / 320px 迁入块可读性） | `build.md §6.6` 全部 `⏳ 未执行`，**未冒充 PASS**（判定诚实）。属 validate 的人工验收面（AC-V45-022 / EC-V45-009），建议 validate 报告显式承接 |
| O-02 | `KL-N-10` binding 环境性 flake | build 自报首轮 1 项红 + 隔离复跑 2 次（1 绿 1 红 `#8d/#8e`）；**本轮独立复跑首轮即 192/0 绿**，未复现。维持「环境性、不阻塞收口」的既有裁定；`validate` 建议再复跑 1 次留证 |
| O-03 | `index.html:1154` 仍保留 `#l0-receipt-summary` CSS 规则 | 该规则现被**卡内**同名节点复用（视觉一致），属可接受；若按 BLOCK-01 方案 ① 改名，须同步该 CSS 选择器 |

## 7. 门禁与字节级独立复跑对账（自报 vs 复跑）

**门禁（严格串行，一次一个 Chromium；日志 `/tmp/opencode/v45-review-r1/`）**

| # | 门禁 | build 自报 | **本轮复跑** | 判定 |
|:--:|---|:--:|:--:|:--:|
| 1 | `typecheck` | PASS | **PASS**（0 error） | ✅ |
| 2 | `npm test`（node） | 1044 | **1044 passed / 0 failed** | ✅ |
| 3 | `test:l0` | 227 | **227 passed / 0 failed** | ✅ |
| 4 | `test:density` | 229 | **229 passed / 0 failed** | ✅ |
| 5 | `test:ui`（journey） | 171 | **171 assertions / PASS** | ✅ |
| 6 | `test:binding` | 192（KL-N-10 首轮 1 红） | **192 passed / 0 failed（首轮即绿）** | ✅ |
| 7 | `test:l1` | 115 | **115 passed / 0 failed** | ✅ |
| 8 | `test:recommendation` | 59 | **59 passed / 0 failed** | ✅ |
| 9 | `test:supersession` | 35 | **35 passed / 0 failed** | ✅ |
| 10 | `test:gate-integrity` | 13 | **13 passed / 0 failed** | ✅ |
| 11 | `test:size-ruling-vol3` | 12 | **12 passed / 0 failed** | ✅ |
| 12 | `test:ref-pick-wiring` | 11 | **11 passed / 0 failed** | ✅ |
| 13 | `test:design-contract` | 6 | **6 passed / 0 failed** | ✅ |

> 未复跑（如实登记，留给 validate）：`test:l2` / `test:insight` / `test:hardening` / `test:ask-auth` / `test:page-input` / `test:stream` / `test:e2e` / `test:l1-reverse` / `test:l2-reverse`；其中 `zero-injection` / `env-guard` / `system-merge` / `l0-disclosure` / `host-registry` / `local-act-wiring` / `settings-help` / `recommendation-sources` / `size-*` / `l2-counts` / `sidepanel-view` / `l1-ref-validity` / `density-thresholds` 等 node 门禁已由 `npm test`（1044/0）整体覆盖。

**字节级独立复算**

| 项 | 台账/登记值 | **本轮独立计算** | 判定 |
|---|---|---|---|
| journey 新 pin（`protectedRanges[0]`） | `cc79f413…` / 43054..58287 / 240 行 | sha256 = **`cc79f413fa289ad6de3124602c21640edd36c6af51e8f12f0ebe4ce39d620da7`**；`startAnchor` 偏移 = **43054**；239 `\n` + 无尾换行 = 240 行 | ✅ |
| journey 链节 v4-1 | `e2b500df…` @ `a04e677` / 43054..55259 | `git show a04e677:journey.mjs` slice sha = **`e2b500df…`** | ✅ |
| journey 链节 v3 | `6b45c3fa…` @ `187c205` / 42766..54004 | `git show 187c205:journey.mjs` slice sha = **`6b45c3fa…`** | ✅ |
| binding 保段 | `be9ad0e9…` / 107780..115930 | HEAD slice sha = **`be9ad0e9…`** | ✅ |
| 段前补偿量 | Δ = 52 B（等长删白） | `git diff` 唯一补偿 hunk（`:749`）裁减 17 个 `─`（51 B）+ 1 个注释内空白（1 B） = **52 B** | ✅ |
| 体积 | 493,501 B / ceiling 518,176 B | `stat -c %s` = **493501**；`floor(493501×1.05)` = **518176**；`ceilTo50KB(493501)` = 512,000 | ✅ |
| 红线 | `content.js` 177,076 / `52a82620…`；`pick-layer.js` 33,900 / `5f567d7e…` | 实测 **逐字节相同** | ✅ |
| density 台账 | 31 格 / `changed = 1` | 新旧 JSON 全量 diff：`tiers` 仅 `risk(staleRef)@400` 变（`7/7/18/237 → 6/7/17/232`）；`v45Ledger` 31 格齐备、`after` ↔ 登记值 28/28 同源 | ✅ |
| 零 diff 面 | T1~T10 / v3 台账 / manifest / design | `git diff --name-status` **不含**任一；`git status --short` 复跑后仍空 | ✅ |

## 8. 结论

**结论**: ❌ **不通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | **65.0%**（13 / 20） |
| 阻塞问题数 | **4**（BLOCK-01 / 02 / 03 / 04） |
| 改进项 | 6（I-01~I-06，均非阻塞） |
| 规范符合性偏差 | spec FR/NFR/EC 层面 **2 项未交付**（AC-V45-001 的「三事实各恰 1」live 判据 → BLOCK-03；NFR-V45-003 的「`title` 注入反证」→ BLOCK-04）；实现层 **2 项自相矛盾/残留**（→ BLOCK-01 / 02）；ADR 口径漂移 3 项（I-01/I-02/I-03，已登记裁决） |
| 可进入 validate | **否**（须先闭合 4 个阻塞项 —— BLOCK-01/02/04 建议在修复轮落地，BLOCK-03 需接 live 读数并实跑注入反证） |

**理由**：

1. **本轮审查的「好的一半」经独立证据确认成立**：真退役的**主体**是真的（`index.html` 零残留 + 门禁逐 id 负向 + 独立复跑）、单写通道唯一（`systemRow` 单构造点 + emitter 源文本恰 1）、保护段取代**诚实且可逐字节复算**（journey 3 链节 + binding 保段 + 补偿算术 52 B 精确等长）、密度**只收紧不放宽**（28 格仅 1 格下降、阈值全零 diff）、体积三值同源且档位不下移（493,501 / 518,176 / 512,000 / 563,200 + `pending-author-line` 未被伪称）、红线逐字节不变、本地 act 与恢复规则的**产品路径**真实可达（`recommendation` 59/59 由真实 SW 驱动）。13 项门禁独立复跑与 build 自报**逐项相等**，未发现自报虚高。

2. **但 4 个阻塞项落在本 Feature 的题眼上**（「真退役」与「判据不得空转」）：
   - **BLOCK-01** 是**产品数据自相矛盾**：被登记为「零残留」的退役容器 id 由产品自己在收到回执后重新铸造 ⇒ 该判据只在夹具时点成立、产品态会报假阳性，且同一门禁对同一 id 给出相反要求（`l1.mjs:205` vs `:723`）。这正是 v4-4 BLOCK-02「判据必须能区分…」教训的同型复发。
   - **BLOCK-02** 是**真退役的残留面**：退役容器的 id 选择器仍在产品源里被使用（静默 no-op），配套测试注释声称已迁到 `#stream` 而实现没有 ⇒ 注释失真 + 读后即弃的空心判据（功能未坏，但「零残留」与「判据可信」两条都不成立）。
   - **BLOCK-03** 是**核心验收锚点缺失**：AC-V45-001 的「首屏三事实各恰出现一次」没有任何 live 断言，「可见载体数 == 1」退化为自声明常量（`observedCarriers` 无 live 供给点，TASK-V45-116 承诺的接入未兑现，ADR 要求的注入反证因此不可实跑），全部 live 读取使用 `querySelector`（只取首个）⇒ 第二条同 kind 投影在架构上**不可能被现有判据发现**；`firstRun` 的「行 + 卡」双载体与登记 `1` 也未被解释。
   - **BLOCK-04** 是**新安全面零反证**：`title` 成为新的零明文边界，NFR-V45-003 明文要求「注入 secret / URL query 反证必抛错」，而 `plaintextTitle` 在 `test/**` **零引用** ⇒ 违反 NFR-V45-007，且 strip-then-scan 顺序最需要反证兜底。

3. **修复路径明确且都不涉及重新设计**：BLOCK-01 二选一（改名 / 移出退役清单 + 补时点无关判据）、BLOCK-02 迁写点 + 把丢弃读改为真断言、BLOCK-03 接 live 读数 + 补恰 1 断言 + 实跑注入反证、BLOCK-04 补 4 条 node 用例。预计改动集中在 3 个 `src` 文件 + 5 个测试文件，**不动**保护段 / 台账 / 体积三值（BLOCK-04/02 为零字节测试面，BLOCK-01 若选「移出清单」为零字节，BLOCK-03 若仅加断言亦零字节）。

4. **建议流程**：`@sddu-build` 修复轮（BLOCK-01~04）→ `@sddu-review` R2 复审（聚焦 4 阻塞闭环 + 抽检 I 项）→ `@sddu-validate`。I-01~I-03 为文档/ADR 口径回写，可与修复轮同批；I-04~I-06 为门禁可读性增强，可与任一修改轮同批。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（**R1：❌ 不通过**；C1~C20 逐项结果 13✅/4⚠️/3❌；**4 阻塞**（`l0-receipt-summary` 退役清单自相矛盾 / `#l0-decision` 悬空选择器 + 虚假迁移注释 / 「载体数==1」无 live 判据 + AC-V45-001 锚点缺失 / `plaintextTitle` 零反证）+ 6 改进 + 3 观察；13 项门禁独立复跑与 build 自报逐项相等；4 段保护段 pin 与体积/红线字节独立复算全部命中） | 2026-09-21 | SDDU Review Agent |
