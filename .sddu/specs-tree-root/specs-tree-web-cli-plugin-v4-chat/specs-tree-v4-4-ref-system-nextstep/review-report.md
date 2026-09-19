# 审查报告：specs-tree-v4-4-ref-system-nextstep（V4-4 引用卡 / 系统事件行 / 推荐卡 + 拾取入口迁移）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入  
> **审查策略**: review.md（C1~C15 审查清单及四维度指引）  
> **前置依赖**: review.md、spec.md、plan.md（ADR-V4-035~040）、build.md v2.0、tasks.md  
> **创建人**: SDDU Review Agent  
> **创建时间**: 2026-09-19  
> **审查轮次**: R1  
> **版本**: v1.0  
> **更新人**: SDDU Review Agent  
> **更新时间**: 2026-09-19  
> **更新说明**: 初始创建（R1：❌ 不通过 — 3 阻塞 / 8 改进；静态审查 + 8 项门禁复跑 + KL-V44-01 独立 A/B 复现）

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 15 |
| 通过 | 5 |
| 警告 | 7 |
| 失败 | 3 |
| 阻塞问题 | 3 |

**审查范围**：`git diff eb879bb..2be59e5 -- packages/web-cli-plugin`（33 文件 / +3,106 −348），HEAD `2be59e5`（R2），分支 `feature/web-cli-plugin`。

**本轮复跑（只读、严格串行、一次一个 Chromium）**：

| 命令 | 结果 |
|---|---|
| `npm test` | **978 / 978 PASS**（与 build.md 一致） |
| `npm run test:recommendation` | **37 / 37 PASS** |
| `npm run test:density` | **173 / 173 PASS**（产物 465,277 B ≤ 488,540 B） |
| `npm run test:l0` | **217 / 217 PASS** |
| `npm run test:zero-injection` | **27 / 27 PASS** |
| `npm run test:l1-reverse` | **9 / 9 PASS**（含 sha256 逐字节还原） |
| `npm run test:size-ruling-vol3` | **8 / 8 PASS** |
| `npm run test:ref-pick-wiring` | **7 / 7 PASS** |
| `npm run test:supersession` | **33 / 33 PASS** |
| `npm run test:gate-integrity` | **12 / 12 PASS** |
| `npm run test:design-contract` | **6 / 6 PASS** |
| `stat -c %s dist/sidepanel.js` | **465,277**（== 登记基线；`content.js` 177,076 / `pick-layer.js` 33,900 未变） |
| **KL-V44-01 独立 A/B**：`git worktree add /tmp/opencode/v44-r1 8ae971e` → 重构建 → 重跑 `test/ui/density.mjs` | R1 树 `risk(staleRef)@320` = **7/7/18/208**（同一条违规 `#scroll-bottom`）；400/520 = 6/6/17/203 ⇒ **A/B「测量中性」结论独立复现成立** |

> 未复跑项（如实登记，留给 validate）：`test:ui`(journey) · `test:insight` · `test:hardening` · `test:e2e` · `test:binding` · `test:l1` · `test:l2` · `test:stream` · `test:ask-auth` · `test:page-input` · `test:l2-reverse`。

## 2. 逐项审查结果（C1~C15）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 引用生命周期 | FR-CHAT-050/051/052 · AC-CHAT-012 · shim E2~E5 | ⚠️ | 拾取/失效/重锚三条主干**真实接线**（`acceptCapture`→`projectRef`、`maybeRescue`→失效行+失效卡、`reanchorRef`→新卡）；但「改用描述」**卡内兜底输入的提交是死控件**（见 I-01/BLOCK-03）；判定由 valid→stale 时实现选择「追加新卡」而非 plan §2.2 表所写「patch 卡到 stale」，同 `refNum` 会同时存在两张状态不同的卡（无门禁覆盖该差异） | 中 |
| C2 | 系统事件单通道 | FR-CHAT-053/054 · ADR-V4-036 §5 · AC-CHAT-011 | ❌ | ①「唯一构造点」不成立：`stream-model.ts#switchStreamSession` 直接 `appendEvent({kind:'system'})`（会话分隔行绕过净化/去重/速率/`dropped`）；② 6+ 通道归并**未落地**——`#env-guard`/`#site-hint`/`#onboarding`/`#discovery-notice`/`#send-reason` 仍各自渲染（无一处调用 `appendSystem`），`firstRunCard()` 零调用；③ 去重窗口把 N 张卡的同一文案合并为 1 行（留痕回归） | 阻塞 |
| C3 | 推荐生产者真值 | FR-CHAT-060/062/064 · AC-CHAT-013 · 裁决 5 | ❌ | 白名单 7 项与 import 白名单机核**真实**（`recommend.ts` 只 import `stream-plaintext`，零 `settings`/`deriveCounts`/网络面）；但 `recommendNextStep` **无生产调用点**（`dist/sidepanel.js` 中定义 2339 行、唯一调用 9020 行 = 测试 seam `sidepanel.ts:851`），`{type:'nextstep'}` 亦只由 seam 触发 ⇒ 推荐能力在真实产品中不可达；且安全边界是**候选级**（`passesSafety` 用 `some`），被拦 chip 仍会随卡渲染 | 阻塞 |
| C4 | V3-VOL-3 闭合合法性 | FR-CHAT-090/091/092 · AC-CHAT-018 · ADR-V4-039 | ✅ | 三值复算通过：`newBaselineBytes=465,277 == SIDEPANEL_BASELINE_BYTES`、`ceilTo50KB(465,277)=512,000`（与闭合值 465,000 同档）、`Math.round(512,000×1.1)=563,200`、`resolvedOn=2026-09-19`；`min(563,200, floor(465,277×1.05)=488,540)=488,540` 与实跑门禁一致；R2 重登只前移 `newBaselineBytes` 且**未跨档**，`resolved` 仍由 5 元素披露判据（`validateReRegistrationDisclosure`）覆盖，未绕过闭合判据。**残余**：`authorConfirmation.status` 仍 `pending-author-line`（占位**诚实**、未伪称已确认），但「作者确认占位」规则本身无机器判据（见 I-06） | 低 |
| C5 | `riskIncrementRegistry` 形态 | KL-V44-01 裁决② · build.md §3.3 自请复核 | ⚠️ | **可接受为「不新增豁免类别」的落地**：元素仍全额计入 C1（实测 7）并与登记格逐格机对；期望值双向精确（多/少/键不符都 FAIL）、未登记格走 `defaultExpectation`（0 违规 ∧ 0 漂移，与 R1 判据逐字一致）、`coverage` 与夹具矩阵逐项一致、登记项非空转；阈值 7/15·9/20·17/35 与「只认 hidden」逐字未动（本轮实跑复现）。**口子**：登记表条目无**溯源门槛**（无 ruling-id / 审批字段），机制上「把任意新增控件登记进 cells 即可过」；当前条目理由充分（引 KL-V44-01 ②），属机制建议（I-07） | 中 |
| C6 | KL-V44-01 裁决执行质量 | build.md §3.1/§7.1/§7.4 · AC-CHAT-023 | ✅ | **独立 A/B 复现成功**（见 §1 表末行）：R1 树（未启用自动归并）与 R2 树同为 `7/7/18/208` + 同一条违规 ⇒ 「自动归并测量中性、真实根因 = `staleRef` 风险步自身的只追加流内副作用」的订正是**诚实且有证据**的；R1 当时登记值 6/6/17/203 与实测不符（独立复跑时 R1 的 stage F 报 `实测 7 ≠ 登记 6`），R2 重锚把真值登记进 `before`/`cells` 并保留历史；重锚五要素齐备；400/520 零漂移复现。裁决落地的两条通道（nav/notice）经唯一通道并各有正反双向用例 | 低 |
| C7 | 退役与迁移完整性 | FR-CHAT-055 · spec §8 取代负载 · ADR-V4-040 §3 | ❌ | `#l0-pick` 退役**彻底**（index.html 无该 id、`src/ui/sidepanel/**` 无 DOM 引用、7/7 布线门禁含反证）；但 ① 底部 strips 容器**未退役**：`index.html:1336-1350` 的 `#env-guard`/`#site-hint`/`#onboarding`/`#discovery-notice`/`#notice` 全在且仍被渲染；② 「过渡宿主清零」由**移除 `data-transitional-host` 属性**达成（`index.html:1297`/`1335`），容器本体与占位债务原样保留 ⇒ `l0.mjs`（`querySelectorAll('[data-transitional-host]').length===0`）与 `density-thresholds.test.ts`（`hosts.length===0`）**空转**，且新判据 `structuralHosts ≥ 1` 反而要求这些宿主**留下**；③ `#l0-ref-toggle`/`#l0-ref-badge`/`#l1-ref` **未吸入** `ref` 卡，仍在 `l1/panels.ts#paintRefs` 独立投影 ⇒ 投影点由 ADR-V4-035 的「三处」变为 ≥4（含流内卡），与「不新增第四处」相反 | 阻塞 |
| C8 | 门禁账与 AC 对照 | build.md §5 · spec §7 · NFR-CHAT-009 | ⚠️ | 11 项门禁复跑全绿且计数与 build.md 逐项一致（978 / 173 / 217 / 27 / 9 / 8 / 7 / 33 / 12 / 6）；红线独立复核：`content.js` 177,076 / `pick-layer.js` 33,900，`manifest.json`/`src/content/**`/`src/background/**`/`journey.mjs`/`binding.mjs` `git diff` **零 diff** ✔；AC-CHAT-020/021/023 成立。**偏差**：AC-CHAT-013 因 C3 不成立；AC-CHAT-018 的作者确认仍为占位；`test:v3` 组合门禁未纳入 3 个新脚本（`test:recommendation`/`test:ref-pick-wiring`/`test:size-ruling-vol3`），跑 `test:v3` 不会执行新 Chromium 门禁 | 中 |
| C9 | 推荐卡渲染与门控 | FR-CHAT-061/063 · EC-CHAT-008 · shim B4 | ⚠️ | 卡工厂/门控/上限实现正确（`chips.slice(0,3)`、`pending` 双门控在 reducer、`disabled`+`aria-disabled` 不隐藏、无 chip 不铸卡、`syncNextstepPending` 走渲染路径）；`test:recommendation` 37/37 复跑通过。**但**：这些能力经 C3 的 seam-only 通路验证，真实产品内 `nextstep` 卡恒为 0 张 ⇒ 断言覆盖的是「库 + seam」而非「产品可达路径」 | 中 |
| C10 | `ref-store` 只追加投影 | ADR-V4-035 §决策 5 · plan §5 | ✅ | `git diff` 对 `l1/ref-store.ts` 为**纯追加**（`RefCardProjection`/`refOrdinal`/`projectRefCard`/`cardProjection`）；`records`/`retired`/`seq`/判定的写入路径零改动；既有 `test/l1-ref-validity.test.ts`、`test/ref-wiring.test.ts` 零 diff 且随 `npm test` 全绿 ⇒ 「判定/序号/退役语义零变更」有静态 + 既有断言双重证明 | 低 |
| C11 | 零注入 / 零明文 / 持久化边界 | NFR-CHAT-005/012 · AC-CHAT-020/021 · EC-CHAT-007 | ✅ | `test:zero-injection` 27/27 复跑（含带路径页零注入 + 强制注入翻正反证）；`pick-guidance` 是纯文案（`index.html:1421`）+ 一个委托监听（`sidepanel.ts:2196`），不注入；系统行/卡的持久化 label 走 `label()`/`assertStreamPlaintext`，明文（URL query/secret/标记）在构造期抛错（`system-events.ts:144`、`:238` 载入期扫描） | 低 |
| C12 | 体积五要素与中间重登记 | NFR-CHAT-006 · FR-CHAT-094 · 父 §10.4 | ✅ | `SIDEPANEL_BASELINE_BYTES=465,277` == 实测产物 ✔；`SIDEPANEL_RE_REGISTRATIONS` 新增 `v4-4`/`v4-4-r2` 两轮五要素（前后值/日期/来源/理由/历史保留）且 `validateReRegistrationDisclosure` 零违规（8/8 门禁复跑）；TIMELINE/HISTORY 只追加；`record-only` cap 仍 306,099 且判定器不读（`evaluateSidepanelSize(306,100).ok=true`） | 低 |
| C13 | 测试质量 | NFR-CHAT-007 · AC-CHAT-023 | ⚠️ | 新增门禁真实驱动产品（`system-merge` 10 例含正反双向；`recommendation-sources` 含伪造导入反证；`ref-pick-wiring` 含伪造调用反证；`test:recommendation` 经真实 `reduce`/`render`）；R2 还修好了 R1 遗留的 `l1-reverse` harness 断点（9/9 实跑，含 sha256 还原）。**未覆盖切面**：① `describe-submit` 提交路径无任何断言（死控件因此逃逸）；② 去重窗口 N→1 的留痕合并无断言；③ 「判定变化」是否有唯一卡（append vs patch）无断言；④ `projectedRefState` 跨夹具隔离无断言 | 中 |
| C14 | 代码质量 | 项目宪法 · §5.1 | ⚠️ | 大部分模块职责单一、注释可读、常量集中（规则表可复算）；`appendSystem` 的净化 fail-closed 与「速率先于去重」有明确理由注释。**问题**：死代码/死常量若干（`SYSTEM_COPY.sessionSwitched`/`probePhase`/`dropped`、`hasChips`、`systemEventRows`、`firstRunCard`、`nextstepCards`、`handleCardAction` 的 `describe && value` 分支）；`systemRow` 里 `void rateLimited;` 属无意义语句；失效原因兜底文案三处不一致（`projectRefCard` / `cards/ref.ts` / `sidepanel.ts:1427` 各一份）；`PickInputHandle` 仍对外暴露 `startPick()`（布线门禁只扫 `pick-input.ts` 内部，外部 `pickInput.startPick()` 属未拦旁路） | 中 |
| C15 | 设计契约与长会话纪律 | NFR-CHAT-010/011 · AC-CHAT-025 | ⚠️ | `test:design-contract` 6/6 复跑（设计稿 sha256 冻结、60 行映射、7 主类顺序）；系统行实现为单行 + `HH:MM:SS`（`cards/system` 路径）符合 NFR-CHAT-011 的轻量化方向。**未实证**：≈320 卡长会话的可读性/折叠未在本轮复跑门禁覆盖（依赖未复跑的 journey/hardening）；去重窗口的 N→1 合并（I-02）与长会话留痕完备性（NFR-CHAT-001）存在张力 | 低 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 2（C13·C14→C14 / C10） | 1 | 1 | 0 | 50% |
| 规范符合性 | 8（C1·C2·C3·C4·C9·C11·C12·C15） | 3 | 3 | 2 | 37.5% |
| 架构一致性 | 4（C5·C6·C7·C10） | 2 | 1 | 1 | 50% |
| 测试质量 | 2（C8·C13） | 0 | 2 | 0 | 0% |
| **合计** | **15** | **5** | **7** | **3** | **33.3%** |

> 说明：维度归并以「该 Cx 的主审维度」计（C10 同时服务架构一致性与代码质量，计入架构一致性；C8 计入测试质量）。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| BLOCK-01 | `src/ui/sidepanel/sidepanel.ts:851-874`（唯一调用点）；`src/ui/sidepanel/recommend.ts:234`（生产者）；`src/ui/sidepanel/chat-state.ts:605`（`nextstep` reducer） | **推荐卡生产链路未接线**：`recommendNextStep` 全仓/产物中只有测试 seam 一个调用点（`dist/sidepanel.js` 定义 2339 / 调用 9020），`{type:'nextstep'}` 也只从 seam 派发 ⇒ FR-CHAT-060~064、AC-CHAT-013 在真实产品中不可达；`test:recommendation` 的 37 条断言全部走 `window.__v3.testing.recommend()`，属「库 + seam」验证而非产品验证 | C3 / C9 | 在真实事件点接线生产者（拾取后 / 引用失效后 / 回合完成且非 `pending` / 首装），把 `lastProducedAt` 与 `NEXTSTEP_MIN_INTERVAL_MS` 落到生产状态；并新增一条**不依赖 seam** 的门禁断言（例如完成一次真实拾取/失效后，流内出现 ≤1 张 `nextstep` 卡且 chip 点击走 `requestTurn`） |
| BLOCK-02 | `src/ui/sidepanel/index.html:1336-1350`（strips 仍在）/ `:1297`/`:1335`（宿主标记被移除）；`src/ui/sidepanel/sidepanel.ts:1142-1143,1267-1340,2483`（仍渲染 5 条通道）；`test/ui/l0.mjs`（`REGISTERED_TRANSITIONAL_HOSTS=0` 判据）；`test/density-thresholds.test.ts:326-333` | **FR-CHAT-054「6+ 通道归并」未落地 + 宿主清零判据空转**：仅 `#notice` 与导航失效两条自动来源接入 `appendSystem`，`#env-guard`/`#site-hint`/`#onboarding`/`#discovery-notice`/`#send-reason` 仍各自渲染（`firstRunCard()` 零调用）；且「过渡宿主清零」是通过**删掉 `data-transitional-host` 属性**而非退役被取代容器达成 —— 容器（含 6 条提示带）原样留在 `#stream` 内，`hostCount===0` 因此恒真，新判据 `structuralHosts ≥ 1` 还要求它们保留 | C2 / C7 | 二选一并如实登记：① 按计划把 5 条通道的语义真正并入 `appendSystem`（含首装卡承载 onboarding/discovery-notice）后**删除**对应 strip DOM 与宿主；② 若本轮不做，必须在 spec/plan 显式缩小范围（EC-CHAT-013）并在台账登记，同时把「过渡宿主清零」判据改回**结构性判据**（例如断言被取代容器 id 不存在，而非只看标记属性） |
| BLOCK-03 | `src/ui/sidepanel/cards/ref.ts:127`（派发 `describe-submit`）；`src/ui/sidepanel/sidepanel.ts:205-216`（无该分支，落到 :216 占位文案） | **失效卡第二条恢复路径的卡内实现在产品中不可用**：「改用描述」兜底输入提交时派发 `'describe-submit'`，`handleCardAction` 无对应分支 ⇒ 落入「该卡片的「describe-submit」交互将在 v4-3 / v4-4 落地」占位通知；同时「改用描述」点击还会**额外**触发 `revealAskFallback()`（另铸一张 `askuser` 文本卡），形成两个并存的兜底输入（其中一个提交无效）。无任何测试覆盖该提交 | C1 | 在 `handleCardAction` 增加 `'describe-submit'` 分支（复用 `submitAskFor`/`requestTurn` 的既有入口），或删掉卡的本地兜底表单只保留 `revealAskFallback()` 单一通路；并补一条「提交描述文本 ⇒ 产生可见留痕」的断言 |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-01 | `src/ui/sidepanel/chat-state.ts:355-359`、`:396-400`、`:405-410` | 去重窗口把「N 张卡各一行」合并为 1 行：`traceSuperseded`/`settleTurnEnd`/`closeOpenAskCards` 在同一 `at` 用**同一文案**循环写入 ⇒ 第 2..N 条被 `dedupeKey=kind:文本` 吞掉（v4-4 前是 N 行）。已复现：2 张 open ask + 会话切换 ⇒ 仅 1 行 `superseded` | C2 | 循环写入时把「第 n 张」纳入 key（或对同批多次调用改用不同 `kind`/附序号），保留「每卡一行」的 v4-3 留痕语义；补一条 N 卡 ⇒ N 行的断言 |
| I-02 | `src/ui/sidepanel/stream-model.ts:556-568` | `switchStreamSession` 直接 `appendEvent({kind:'system'})` 构造会话分隔行，**绕过唯一通道**（无净化/去重/速率/`dropped`），与 `chat-state.ts:336` 的「ONLY construction point」及 build.md §3.1「不可绕过」声明不符；`SYSTEM_COPY.sessionSwitched`/`probePhase` 定义了却无人使用 | C2 | 会话分隔行改走 `appendSystem(channel,'session',copy,at)`（或显式登记为「通道外构造点」并说明理由），并让 `SYSTEM_EVENT_KINDS` 的每个 kind 都有真实 emitter 或标注为 closed-vocabulary-only |
| I-03 | `src/ui/sidepanel/l1/panels.ts:227-228,285-319`；`src/ui/sidepanel/index.html:1253-1272` | ADR-V4-035 决策 1 未落实：`#l0-ref-toggle`/`#l0-ref-badge`/`#l1-ref` 仍被独立投影/重绘，实际投影点 ≥4（与「不新增第四处」相反）；证据层在 `l1/panels.ts:288-293` 与 `ref-store.ts:91-101` **两处各建一份**（非同一实现，存在漂移面） | C7 / C10 | 要么按 ADR 把 L0 chip + L1 证据面板吸入 `ref` 卡（删投影写入点），要么把 ADR 改成「三处 + 面板内两处只读回看」并登记取代债务；证据层构造抽成单一函数供两处复用 |
| I-04 | `src/ui/sidepanel/sidepanel.ts:1441`（`projectedRefState`）与 `:804-815`（`testing.reset()`） | 模块级 `projectedRefState` Map **从不清空**（`testing.reset()` 只清 stream + systemChannel）⇒ 夹具/流重置后同一 `refId`+state 的投影会被静默跳过，与 seam 注释「every fixture cell starts from the same default state」相矛盾；这很可能就是 build.md §7.4 登记的「staleRef 子场景夹具序敏感」的真实机制 | C7 / C13 | 在 `testing.reset()`（以及 store reset 路径）中 `projectedRefState.clear()`；若确属产品语义（同一事实不重复投影），把该 Map 归入受重置的状态对象而非模块全局 |
| I-05 | `system-events.ts:203-212`；`cards/nextstep.ts:87`；`view-model.ts:994,1008,1038`；`sidepanel.ts:205-210`；`pick-input.ts:58,351` | 死代码/死常量：`SYSTEM_COPY.sessionSwitched`/`probePhase`/`dropped`、`hasChips`、`systemEventRows`、`nextstepCards`、`firstRunCard` 全仓零引用；`handleCardAction` 的 `describe && value` 分支不可达；`void rateLimited;` 无意义；`PickInputHandle.startPick()` 仍对外暴露，而 `ref-pick-wiring` 只统计 `pick-input.ts` 内部出现次数 ⇒ 外部 `pickInput.startPick()` 是未拦旁路 | C14 | 删除或在台账登记为「预留接口」；`startPick` 从 `PickInputHandle` 与返回对象中移除（只留 `requestPick`），并把布线门禁扩到 `src/ui/sidepanel/**` 全量调用点 |
| I-06 | `test/size-baseline.ts:1869-1882`；`docs/v4-supersession-ledger.json#v3Vol3Closeout.authorConfirmation` | AC-CHAT-018 的「作者确认」仍是 `pending-author-line` 占位（诚实未伪称），但占位规则本身**无机器判据**：`size-ruling-vol3.test.ts` 不校验 `authorConfirmation.status`，R2 前移 `newBaselineBytes` 走「作者确认占位」重登也无门禁约束（只要不跨档即合法） | C4 | 把占位状态纳入登记册校验（例如 `status ∈ {confirmed, pending-author-line}` 且 `pending` 时禁止 `absoluteCeilingBytes` 下调/跨档重登），或由作者补一句确认后置 `confirmed` |
| I-07 | `docs/v4-density-baseline.json#riskIncrementRegistry` | 登记表无溯源门槛字段（无 ruling-id / 批准人 / 日期之外的审批），机制上「登记任意新增控件即可过」；当前条目理由充分（引 KL-V44-01 ②），但未来轮次可复制该形态自我放宽 | C5 | 给 `cells[*]` 增加必填 `ruling`（裁决/编排器指令 id + 链接）与 `approvedBy`，并在 `density.mjs` 中断言非默认登记必须带 `ruling`；否则视为未登记 |
| I-08 | `package.json`（`test:v3` 脚本） | 组合门禁 `test:v3` 未纳入 3 个新脚本 ⇒ 跑 `test:v3` 不会执行 `test:recommendation`（新 Chromium 门禁）与另两条 node 门禁（虽被 `npm test` 覆盖），「一条命令全绿」的纪律出现缺口 | C8 | 把 `test:recommendation` / `test:ref-pick-wiring` / `test:size-ruling-vol3` 追加进 `test:v3` 串行链（保持一次一个 Chromium） |

## 6. 结论

**结论**: ❌ 不通过

| 指标 | 结果 |
|------|------|
| 审查通过率 | 33.3%（5 ✅ / 15） |
| 阻塞问题数 | 3 |
| 规范符合性偏差 | 3 项（FR-CHAT-054/060~064/052 的落地偏差；另 AC-CHAT-013/018 受影响） |
| 可进入 validate | 否（需先处置 BLOCK-01~03 并重跑受影响门禁） |

**理由**：
1. **BLOCK-01**——推荐卡是本叶三大交付面之一（FR-CHAT-060~064 / AC-CHAT-013），但生产者只有测试 seam 一个调用点，真实产品不产生任何推荐卡：`test:recommendation` 的 37/37 绿不能代表功能交付。这是「门禁绿 ≠ 功能在」的典型，属阻塞。
2. **BLOCK-02**——FR-CHAT-054「6+ 瞬时通道归并」只落了 2 条（nav / notice），余下 5 条通道与首装卡仍在旧通路；更严重的是「过渡宿主清零」通过**移除标记属性**达成，使 `l0.mjs` / `density-thresholds` 的清零判据**空转**，而新判据反过来要求宿主保留 —— 这正是「自我裁决自我验收」的高危形态，属阻塞。
3. **BLOCK-03**——失效卡「改用描述」的卡内兜底输入提交无处理分支（死控件），且与 `revealAskFallback()` 形成两个并存兜底输入；FR-CHAT-052 的第二条恢复路径产品内不可靠，属阻塞。
4. 值得肯定并已独立复核的部分：`#l0-pick` 退役彻底（含反证）；`ref-store` 只追加投影有静态证明；V3-VOL-3 闭合三值/`ceilTo50KB`/`min()` 复算成立且占位诚实；**KL-V44-01 的根因订正与 A/B「测量中性」结论经 worktree 独立复现成立**；密度登记形态可接受为「不新增豁免类别」；红线文件与保护段零 diff；11 项复跑门禁计数逐项对账一致。
5. 处置建议：先修 BLOCK-01~03（核心是「把能力接到产品」与「把清零判据改回结构性」），再补 I-01~I-08 中至少 I-01/I-02/I-04（留痕与隔离），随后进入 `@sddu-validate`。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1：❌ 不通过；3 阻塞 / 8 改进；15 审查项 5✅/7⚠️/3❌；11 项门禁复跑 + KL-V44-01 独立 A/B 复现） | 2026-09-19 | SDDU Review Agent |
