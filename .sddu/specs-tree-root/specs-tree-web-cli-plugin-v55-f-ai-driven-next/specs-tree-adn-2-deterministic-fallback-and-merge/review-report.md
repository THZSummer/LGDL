# 审查报告：specs-tree-adn-2-deterministic-fallback-and-merge

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（v1.0，C1~C32 审查清单及四维度指引）
> **前置依赖**: `review.md` / `spec.md`（v1.0）/ `plan.md`（v1.0）/ `tasks.md`（v1.2）/ `build.md`（v2.0，R1+R2）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-27
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（ADN-2 末叶 R1 执行审查：32 项 → 27 ✅ / 5 ⚠️ / 0 ❌ / **0 阻塞**；含 build 移交的 **SG-ADN-03 语义订正裁决**（已落实：父 ADR-ADN-004 §③ 文字订正）与 **E2 夹具能力边界评估**）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 32 |
| 通过 | 27 |
| 警告 | 5 |
| 失败 | 0 |
| 阻塞问题 | **0** |

**审查方式**：静态分析（读代码 / 读门禁 / 读台账 / 读产物字节与 metafile / 读 ADR），**不动手跑门禁**（属 validate）。工作树 18 文件未提交，直接读文件；`dist/` 为构建产物（`.gitignore` 忽略，本轮以 **字节 / sha256 / `build-meta.json`** 亲测作「体积与冻结面登记同源」证据）。

---

## 2. 逐项审查结果（C1~C32）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | 确定性兜底三情形 | FR-ADN-040/043 | ✅ | `candidateRules` 中 `chipsFor(ctx)` 空 ⇒ `continue`（不落 `seen`）⇒ 同规则下一行（确定性）接管（`recommend.ts:513-515`）；node S0PPP 四支线读数 B/C/D 全落确定性 | 低 |
| C2 | 终端恒常驻 | FR-ADN-041 | ✅ | 终端存在性单源 = `free-input` provider `when(ctx)`（读 `session.busy` 两条穷尽分支 ⇒ 恒真）；`terminal:true` 由 `recommendNextStep:598` 附加；非 `.next-chip`、不进 `MAX_CHIPS_PER_CARD` | 低 |
| C3 | floor 语义（safety 不走 floor） | FR-ADN-042 | ✅ | `recommendNextStep:585-596`：`raw.length===0` ⇒ 终端在场铸「仅含终端」最小卡，否则 `suppression:'empty'`；全被安全拦 ⇒ `suppression:'safety'`（**不铸卡**）逐字 | 低 |
| C4 | 未配 ⇒ 纯确定性 | FR-ADN-043 · EC-007/008/013 | ✅ | node D 支线 `risk-recovery`（`OPS_RECOVERY_ROWS` 的 `llmBlocked ⇒ op.llm-config` 走查命中）；`ai-next.ts` 零 fetch/chrome/时钟（`proactivity-guard` 扫描 + `ai-next-candidate` AI-N-10） | 低 |
| C5 | 零死端 | FR-ADN-044 | ✅ | 终端恒真 `when` + floor 两处兜底完整；`test:dead-end`（53）登记在册、`no-dead-end.mjs` 未改 | 低 |
| C6 | 兜底判据非恒真 | FR-ADN-045 | ✅ | `fallbackProblems` 三条存在性判据（恒真 when / floor / 终端条件）+ 反证「改恒假 / 删 floor」各必红 + sha256 前后相同还原 | 低 |
| C7 | 在飞不产卡 | FR-ADN-046 | ✅ | 首门 `input.session.busy ⇒ suppression:'pending'` 逐字；`turn-arbitration` + `turn-queue.ts` 零 diff | 低 |
| C8 | 同单卡位 | FR-ADN-050 | ✅ | `sorted.slice(0, MAX_NEXTSTEP_CARDS_PER_ROUND)`（=1）逐字；常量未改 | 低 |
| C9 | 前 N ≤3 + 截断 | FR-ADN-051 | ✅ | `candidate()` 内 `chips.slice(0, MAX_CHIPS_PER_CARD)`；node 4 候选 ⇒ `mChipCount===3` ∧ `mCardCount===1`；反证 `mChipCount:4 ⇒ 必红` | 低 |
| C10 | 规则表恰 4 + AI 骑位 | FR-ADN-052 | ✅ | `NEXTSTEP_PRIORITY` 4 元素逐字；`providers.ts:162-175` 第 12 行 `rule:'ref-action'` + `prepend:true` + `priority:2`（同 `ref-action` provider）| 低 |
| C11 | R6 去重扩展覆盖 AI | FR-ADN-053 | ✅ | `aiNextAfterCompleted` 用**同一** `refActionDigest(refId, label)` 家系 pre-ctx 预过滤；键不可构成 ⇒ **不压**（fail-open 到确定性兜底面，零静默丢弃）；既有 post-filter（`completedActionKey`）逐字保留 | 低 |
| C12 | 单卡/3-chip/密度逐字 | FR-ADN-054 | ✅ | 常量与 7/15·9/20·17/35 未动；`density-thresholds`（+40）与 `v4-density-baseline.json` 的 `tolerance`/`cap`/档位/绝对上限零改（仅 volume 两值同源前移） | 低 |
| C13 | 替换口径双向可判 | FR-ADN-055 | ⚠️ | 双向**判据齐**：AI 在场 ⇒ 无陈旧 chip（node `aReplaced` + s0-⑲）；缺席 ⇒ 陈旧 chip 照旧（node B/C + s0-⑬C）。**但**真面板「AI 赢槽」裁决**单点**压在 s0-⑲（`recommendation.mjs` 因夹具相位边界已改核不变量）⇒ 见 **I-7**（结论：门禁强度**充分**，非降级） | 中 |
| C14 | 渲染零 per-op 分支 | FR-ADN-056 | ✅ | `ACT_TO_OP` 恰 6 行；`OP_TO_ACT[opId] ?? opId` 单点映射（op-direct 不误映 `'next'`）；`next-dispatch-diff0` 零改 | 低 |
| C15 | 六常量同过 | FR-ADN-060 | ✅ | `GUARD_CONSTANT_NAMES` 六名各恰一处（`declarationCount===1`）；AI 候选走**同一** `guard.ts` 判定（`pressDecision` 复用 `tierOf`/`guardAllowed`） | 低 |
| C16 | 提案不耗预算 | FR-ADN-061 | ✅ | 判据层 `verdict('ai', …)` 反复求值零副作用（2×预算轮仍 `allowed`）；记账层唯一点 = `driveAnsweredTurn` 内 `if (out.ok)` 后 `noteProactive(` 恰 1；产出/显示路径（`maybeRecommend` / `consumeAiNext`）零记账；反证「塞进产出路径 ⇒ 必红」+ 还原 | 低 |
| C17 | 关断两相 | FR-ADN-062 | ✅ | 显示相 `sidepanel.ts:2067-2072`（`… && proactivity.enabled()`）；按下相 `pressDecision({guardAllowed:()=>false}) ⇒ blocked:'guard'`；偏好键 `'web-cli:proactive'` 全仓恰一处（零第二偏好键） | 低 |
| C18 | 零第二阈值 | FR-ADN-063 | ✅ | `secondThresholdProblems` 双向扫描（六常量名 + `600_000`/`60_000`/`10_000`/`AI_PROACTIVE` 形状）+ 反证；`AI_NEXT_LABEL_MAX=48` / `AI_NEXT_PARAM_MAX=128` 登记为**显示/结构上限**且不进 `guard.ts` | 低 |
| C19 | 自动按下 diff=0 | FR-ADN-064 | ✅ | `src/ui/sidepanel/next-registry/ai-drive.ts` **零 diff**（本叶未触碰）；`op-wiring` 承重（`dispatchChipAction` 恰 1 / 自动按下点恰 1 / `requestTurn(` 恰 1） | 低 |
| C20 | 在飞仲裁四值 | FR-ADN-065 | ✅ | `ARBITRATION_RESULTS` 未改；`turn-arbitration`（+45 纯加法）逐值断言；`blocked:busy` 不排队语义零改 | 低 |
| C21 | 首开确定性 + 零 LLM 往返 | FR-ADN-070/071 | ✅ | `openDeterministicProblems`（入口体禁 `aiNext`/`pendingAiNext`/`proactivity`）+ `openSteadyInput` 结构事实（`'aiNext' in session === false`）+ 反证；首开卡 label 不含「AI」 | 低 |
| C22 | 让位 firstRun + AI 初始 next 明列 | FR-ADN-072/073 | ✅ | `firstRunEntryHandled` / `openEntryHandled` 面板寿命有界（逐字保留）；R8-1~6 断言零改；`onboarding.firstRun` 仅 `trigger==='firstRun'` 置位（`sidepanel.ts:2080-2083`） | 低 |
| C23 | S0''' 四支线双面 + 人工面 | FR-ADN-083/084 | ⚠️ | node 面 = **真源切片**（生产 `recommendNextStep`/`admitCandidate`，禁桩）+ 6 条反证；Chromium 面**只加断言不加文件**（`CHROMIUM_GATES===9`）；人工面 M1~M5 **四处** `⏳ 未执行`（不冒充 PASS）。**但** ⑲ 的严格规则断言与同文件 ⑦A 口径不一致，存在与 adn-1 I-1 同源 flake ⇒ **I-1**；`s0-self-driven-chain` 的「B」标签名实不符 ⇒ **I-6** | 中 |
| C24 | X-ADN 台账终态 | FR-ADN-090~101 | ⚠️ | 三段齐（`xAdnLedger` 8 行逐字 / `xAdnLedgerLeaf2` 3 行 / `xAdnLedgerFull` **11 行** = 已发生 4 + 未发生取代 6 + `reanchored-keep` 1）；`counterCheck` 逐条可定位不悬空；6 条反证各必红。**但** 台账 `xAdnLedgerFull.note` 的「父 ADR 文字本轮不改 ⇒ 移交 review 裁决」与本 R1 的**已订正**事实需衔接 ⇒ **I-2** | 中 |
| C25 | 升级 6 门禁等价重锚 | FR-ADN-110~117 | ⚠️ | `git show --numstat` 逐文件核：R1 五个升级门禁**零删除行**（纯加法）；R2 的 size 类删除行 = 判据值**等价重锚** + 指针前移；`assertionsRemoved===0` / `EXPECTED_AUDITED_FILES` 51（≥48）/ 末位 `ai-next-candidate` 恰一次 / `CHROMIUM_GATES===9` / 串行纪律（一次一个 Chromium + `finally` 清 profile）**全部对账成立**。**但**「升级 6 存在性」判据仅 `/ADN-2/.test(text)`（注释即可满足）⇒ **I-5** | 中 |
| C26 | 体积重登记 + EC-ADN-016 + 跨列 | FR-ADN-121~125 | ✅ | `dist/sidepanel.js` **604,602 B**（亲测）== `SIDEPANEL_BASELINE_BYTES`；`build-meta.json` 逐模块 `bytesInOutput` = `adn2Rows`（`sidepanel.ts` 116,492 / `recommend.ts` 7,833）**逐值相等**；Σ 1,397 + glue 0 == 登记 Δ；`deltaBytes`/`wiringBytes`/`closeoutDeltaBytes` 链式前移自洽；生效上限 634,832 = `floor(604,602×1.05)`（公式，cap 仍 record-only）；距档 9,798 / 绝对上限 675,840 未越 ⇒ 三态皆否；两叶 Σ +5,676 **越 ADR 目标带**已如实登记（不删判据 / 不放宽容差 / 不搬列，`R-ADN-908` 反证在册）；`authorConfirmation=pending-author-line` 未伪称；B 列 1,641,872 净增 0 不计账 | 低 |
| C27 | NFR 面 | NFR-ADN-002~016 | ✅ | `git diff --name-only` 对 `packages/web-cli-base/**` / `manifest` **零命中**；`KIND_SET` 40 / 12 kind / 零宿主 / `ACT_TO_OP` 6 未动；`recommend.ts` 仍 pure（`aiGatedInput` 纯函数，零 fetch/chrome/时钟）；零新增 provider 入口 / 第二校验器；`law8-plaintext` 终态零明文（留痕行机器码 only ∧ chips/digest 零哨兵） | 低 |
| C28 | EC 面 | spec §6 | ✅ | EC-006→C9 / 007→C4 / 009→C7 / 010→C20 / 011→C17 / 012→C11 / 013→C4·C21 / 015→C12 / 016→C26 / 019→C3·C6 逐条有落点；EC-020（`KL-N-10`）由 build 隔离复跑 3 次 + 与历史登记变体逐条一致如实记录（保护段 pin 由 `supersession-ledger` 独立机核） | 低 |
| C29 | 代码质量（`src`） | §5.1 | ✅ | `chipDedupKey`（`opId#intentDigest`）职责单一、命名自明；`aiNextAfterCompleted` 早退分支齐（空列表 / 无 `completed` / 键不可构成 ⇒ 原样返回）；`aiGatedInput` 在**无实际压减时逐字返回原 input**（既有 11 行 provider 行为零变化）；无魔法数（`AI_NEXT_*` 显式命名并注明「显示上限非护栏」）；注释含 FR/ADR 锚点；`sidepanel.ts` 仅 1 行显示相关断门（最小侵入） | 低 |
| C30 | 代码质量（`test`） | §5.1 | ⚠️ | 判据函数命名/注释质量高、反证齐。**但**两处瑕疵：`latestAfterBytes(rows, row)` 死参（`void rows;`）⇒ **I-4**；R6 定稿测试 ④ 用 `adn2Rows` Σ 却加 `adn1R1UnattributedGlueBytes`（当前双 0 故不显，轴混用为潜在缺陷）⇒ **I-3** | 低 |
| C31 | 架构一致性（ADR 逐项） | plan §4 / ADR-004~010 | ⚠️ | §4 18 项定案逐条对到代码/门禁落点，**17 项一致**；唯一偏离 = `ADR-ADN-004 §③`「上层规则仍优先」措辞 ⇒ **SG-ADN-03**（见 §7；**已由本 R1 订正 ADR 文字，机制零改动**）。`plan §3` 两形态点（合并 A / 关断 A）与实现一致 | 中 |
| C32 | 文件影响 + 保护段 + 冻结面 | plan §5 / ADR-010 §③ | ✅ | plan §5 13 项 ↔ 实际 18 文件：新增 5 项 = `ai-next-candidate` / `gate-integrity` / `s0-self-driven-chain` / `size-*` 4 文件 + `v4-density-baseline.json`（plan §5 已标「条件性」，且 `density.mjs` stage F 与 `size-baseline` 同源 ⇒ **必需同步**，理由成立）；保护段 journey `[43484,59347)`/`7b309258…`/249 行 ∧ binding `[107780,115930)`/`be9ad0e9…` **双绿**、`protectedRanges` 恰 2 段零换锚；三冻结面 `content.js` 177,076/`52a82620…` ∧ `pick-layer.js` 34,358/`77796bab…`（亲测 sha）逐字节不变 | 低 |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 2 | 1 | 1 | 0 | 50.0% |
| 规范符合性 | 21 | 20 | 1 | 0 | 95.2% |
| 架构一致性 | 6 | 5 | 1 | 0 | 83.3% |
| 测试质量 | 3 | 1 | 2 | 0 | 33.3% |
| **合计** | **32** | **27** | **5** | **0** | **84.4%** |

> 「警告」= **非阻塞**的强度/可读性/整洁度问题（无一条为 FR/NFR/EC 规范偏离）；失败 = 0。

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题（0 项）** —— 无 FR/NFR/EC 规范偏离、无红线破（测试零删除 / 断言零降级 / 体积与门禁守恒 / 保护段与三冻结面零 diff 全部成立） | — | 可直接进入 validate |

---

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| **I-1** | `test/ui/s0-self-driven.mjs:1562-1571`（S0C-14 ⑲） | 严格断言 `pppTerminal.rule === 'ref-action'`（不容忍 priority-0 `risk-recovery` 抢槽），与同文件 ⑦A 的闭集口径不一致；adn-1 已实证同 setup 的 ⑬A 在 validate 复现 `rule=risk-recovery` flake（89/1 ×2） | C23 | **不放宽**（放宽会使命中 **E2** 移交的「AI 赢槽」裁决面落空）；改**加固**：⑲ 注入前显式轮询/断言 probe 已 steady（或 `force` 到 `ref-action` 槽可用），仅当确证稳态后再打严格断言；validate 按 ADR-ADN-009 §⑤ 对 `test:s0-self-driven` **隔离复跑 ≥2** 取干净轮并如实记录 |
| **I-2** | `build.md:53`（§1.1 末句）+ `docs/v4-supersession-ledger.json#xAdnLedgerFull.note` | §1.1 末句「**R2 已落台账 + 父 ADR 文字订正**」与 §2/§5.2① 及台账 note（「父 ADR 文字本轮不改 ⇒ 移交 review 裁决」）**互相矛盾**；`git diff --name-only` 证父 ADR 当时**零 diff**（build 未改，措辞失准）。本 R1 已实际订正 ADR ⇒ §1.1 该句仍不准 | C24 | ① `build.md` 该句改为「已落台账 + 偏差上报；**父 ADR 文字由 review R1 订正**」（措辞订正）；② 台账 note 的「移交 review 裁决」建议在**下一轮 build / 收口**时补记裁决结果（台账属 build 产物，review **不代改**） |
| **I-3** | `test/size-growth-evidence.test.ts`（R6 缺陷快修轮定稿测试 ④） | `rows` 改用 `adn2Rows`，但 Σ 仍加 `SIDEPANEL_GROWTH_BREAKDOWN.adn1R1UnattributedGlueBytes`（当前两 glue 皆 0 ⇒ 不显）；属**归因轴混用**（潜在缺陷） | C30 | 改加 `adn2UnattributedGlueBytes`（与 `rows` 同轮次同源）；或显式断言两值均为 0 并注明为何可互换 |
| **I-4** | `test/size-growth-evidence.test.ts:64-68` | `latestAfterBytes(rows, row)` 形参 `rows` 未被使用（`void rows;`）—— 死参 + 抑制提示 | C30 | 删除 `rows` 形参（同步 3 处调用点），或改签名表达「链式覆盖无需本行所属轮次」 |
| **I-5** | `test/gate-integrity.test.ts`（ADN-2 元门禁 ② 循环） | 「升级 6」存在性判据仅 `/ADN-2/.test(text)` —— 文件里**一句注释**即可满足，强度偏弱（非恒真但过弱） | C25 | 锚到 `JUDGEMENTS` 中确含 ADN-2 条目的 id（如要求 `PG-8`~`PG-11` / `R8-7~9` 出现在对应文件的 `JUDGEMENTS`），与 `V_ADN2_TERMINAL_UPGRADED` 同源 |
| **I-6** | `test/s0-self-driven-chain.test.ts`（ADN-2 终态机制侧） | B 分支用 `branch({})`（实为 **C 未产出**路径），标题却写「B：被拦候选不注入 ⇒ 确定性接管」—— 名实不符，易误读为覆盖了「非法候选」路径（真 B 由 `ai-next-candidate` 的 `op.ghost ⇒ blocked==='unknown-op'` 覆盖） | C23 | 改标题为「C 未产出」或补注入一个被拦候选走真 B 路径（与 node 面同判据）；避免覆盖度误读 |
| **I-7** | `test/ui/recommendation.mjs`（ADN-2 块）+ `test/ui/s0-self-driven.mjs` ⑲ | 该夹具**从不创建真页面** ⇒ 自动探测相位非就绪（`probe.unsettled` priority 0 恒压过规则位），无法构造「AI 赢槽」态，故该面改核**与相位无关的可观测不变量**；AI 采纳/替换裁决压到 s0-⑲ + node 面（**E2**，build 主动移交） | C13 | **结论：门禁强度充分、非降级**（详 §8）——① 采纳现方案（node **真源切片**已确定性覆盖替换**双向**，真面渲染由 ⑲ 补足）；② **不新增真页面夹具**（会动门禁运行时窗口 / `CHROMIUM_GATES`，非本叶必要）；③ 按 I-1 **加固 ⑲**（避免单点裁决面失稳）；④ 若后继确需真页面夹具，另立轮次评估 |

---

## 6. 结论

**结论**: ⚠️ **有条件通过**（**0 阻塞**，7 项非阻塞改进）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 84.4%（27 / 32；**0 FAIL**） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0** 项（FR/NFR/EC 逐条符合；1 项 **ADR 文字**订正已由本 R1 落实 ⇒ §7） |
| 可进入 validate | **是**（0 阻塞；改进项建议在下一轮 build/收口一并处理） |

**理由**：
1. **兜底 / 终端 / floor / 零死端 / 在飞**（FR-ADN-040~046）实现完整，判据**非恒真**且反证逐条实跑 + 逐字节还原；
2. **合并 / 优先级 / 去重 / 上限 / 替换**（FR-ADN-050~056）全部落在**冻结常量的既有轴**上（单卡 / 3-chip / 规则表恰 4 / 渲染零分支），R6 去重家系**逐字复用**（非放宽），替换双向判据齐；
3. **护栏**（FR-ADN-060~065）分列清楚：提案不耗预算**双向**、关断**两相**、零第二阈值、六常量单源、自动按下路径 diff=0；
4. **首开**（FR-ADN-070~073）结构上无 AI 注入面（零 LLM 往返依赖），让位 firstRun 零双卡；
5. **判据强度不降**：测试**零删除断言**、`assertionsRemoved=0`、`CHROMIUM_GATES=9`、保护段双绿、三冻结面 sha 逐字节不变、体积登记与真实产物/metafile **逐值同源**、B 列不计账、`authorConfirmation` 未伪称；
6. 遗留均为**非阻塞**：2 项测试强度/可读性（I-1 / I-5）、2 项测试代码整洁（I-3 / I-4）、1 项命名精确（I-6）、2 项文档口径衔接（I-2 / I-7 结论采纳）。
   ⇒ 按流程标准（阻塞 0 但改进项 ≥ 5）判 **⚠️ 有条件通过**（`review.md` §2 门槛）；**不影响**进入 validate。

---

## 7. 移交项裁决：SG-ADN-03（ADR-ADN-004 §③ 语义订正）

### 7.1 争议事实（复核确认）

| 面 | 读数 | 证据 |
|---|---|---|
| **实际选卡键** | `priorityOf(rule) = NEXTSTEP_PRIORITY.indexOf(rule) + 1` ⇒ `risk-recovery`(**1**) / `ref-action`(**2**) / `onboarding`(**3**) / `capability-discovery`(**4**) | `src/ui/sidepanel/recommend.ts:435-437`（逐字）；选卡排序 `sorted.sort((a,b) => a.priority - b.priority)`（`:597`） |
| **AI 候选的选卡键** | 骑 `ref-action` 位 ⇒ **2** | `providers.ts:169` `rule:'ref-action'` |
| **ADR 原文口径** | 「`risk-recovery`（**0**）/ `onboarding`（**1**）命中时 AI 候选**不显示**」 | `ADR-ADN-004 §③`（原文）；其括号值是 `NextProvider.priority` **字段**（recovery 行 0 / `onboarding` 行 1 / `ai-next` 行 2，`providers.ts:113,146,165`）—— **与选卡键不是同一轴** |
| **结论（实测口径）** | **仅 `risk-recovery`（1 < 2）真优先**；`onboarding`（3 > 2）命中时 **AI 胜出**单个卡片槽 | 两规则在不同 `rule` 组 ⇒ `seen` 不互斥，两卡皆入候选，再按选卡键取单卡位 |
| **生产可达性** | 二者**实际不并现**：`onboarding.when` 需 `onboarding.firstRun`，而该字段仅 `trigger==='firstRun'` 时置位（`sidepanel.ts:2080-2083`）；AI 候选需 `configured` 且回合刚结束 | ⇒ 属**纵深防御层口径**，非在生产路径上的行为缺陷 |

### 7.2 裁决

| 项 | 裁决 |
|---|---|
| **是否需要订正 ADR 文字** | **需要**。§③ 该条把「`NextProvider.priority` 字段轴」当作「选卡键轴」读，且据此断言「`onboarding` 命中 ⇒ AI 不显示」——**与实现不符**（事实性错述），会使后继读者以错误口径审「高风险优先」；且这是本 Feature 的立法性 ADR，文字即判据依据 |
| **如何订正** | **只改 `.sddu` 内文档文字、零机制改动**：按实际选卡键重述「上层规则仍优先」的**适用域**（仅 `risk-recovery`），显式厘清两条轴的区别，并写明「生产不并现」的可达性事实；**不得**触碰冻结 `NEXTSTEP_PRIORITY`（红线）/ 不得改 `src/**` |
| **不订正的另一选项（驳回）** | 若维持原文不改，则 §③ 继续与代码矛盾 ⇒ 后继轮会以错误前提复审（且 §④「AI 赢 ⇒ 整槽归 AI」更与 §③ 自相矛盾） |

### 7.3 落实情况

- ✅ **已订正**：`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v55-f-ai-driven-next/ADR-ADN-004-injection-and-merge-caliber.md` §③「上层规则仍优先」条 → 按 `priorityOf(rule)` 重述 + ★SG-ADN-03 标注 + 轴区别说明 + 可达性事实；并在文末**新增 `## 修订记录`**（v1.0.1 行）留可判痕迹。
- ✅ **红线遵守**：`NEXTSTEP_PRIORITY` **未改**（仍恰 4）；`src/**` **零字节改动**（父 ADR 之外的代码面无触碰）；订正**仅文字**，不改变任何判据语义 ⇒ 既有门禁（`recommendation-sources` 恰 4 / `driver-quadruple` / `next-registry`）**零影响**。
- ⚠️ **未代改 build 产物**：`docs/v4-supersession-ledger.json#xAdnLedgerFull.note`（build 侧「移交 review 裁决」的登记）属**构建产物**，review 不代改 ⇒ 建议下一轮 build / 收口补记裁决结果（见 **I-2**）。
- 📌 **SG-ADN-03 的机制结论保留**：AI 骑 `ref-action` 位 + `prepend` 赢槽**替换**陈旧候选（FR-ADN-055）**成立**——本订正**不影响**替换口径与「高风险真正优先」的安全语义。

---

## 8. 移交项评估：E2（`recommendation.mjs` 夹具能力边界）门禁强度

### 8.1 事实链（复核确认）

| # | 事实 | 证据 |
|---|---|---|
| 1 | 该夹具**从不创建真页面** + ⑪ 已驱动真实 `ref-captured` ⇒ 自动探测相位**非就绪 / 非 steady**；priority-0 `probe.unsettled` 恢复卡**恒压过**规则位 ⇒ **无法构造「AI 赢槽」态** | `build.md §0.1 E2`；`recommendation.mjs` ADN-2 块注释（逐字） |
| 2 | 该面改核**与相位无关的可观测不变量**（恰 1 卡 / chip ≤3 / 终端恒最末 / 无陈旧 `ref-action` chip）；**若** `ref-action` 赢槽则**加强**为「AI 候选在场 ∧ 陈旧 chip 不出现」 | `recommendation.mjs` 新块：`adn2Adopted ? (chips.includes(ACCEPTED.label) && chipCount===3) : rule==='risk-recovery'` |
| 3 | AI **采纳 / 替换双向**裁决由 `s0-self-driven.mjs` ⑲（真面板 settled）+ **node 面** `ai-next-candidate` 217 **同判据**承接 | `ai-next-candidate.test.ts`（`aReplaced` / B / C + 6 反证）；`s0-self-driven.mjs` ⑲ |
| 4 | node 面为**真源切片**：生产 `recommendNextStep` + `admitCandidate` 实跑（**禁假 provider / 桩**） | `ai-next-candidate.test.ts` 新块（`s0pppTerminalReading`） |

### 8.2 评估结论 = **门禁强度充分（非降级）；本叶无需补真页面夹具**

| 判据 | 结论 | 理由 |
|---|:--:|---|
| 「AI 在场 ⇒ 无陈旧 chip」（替换）是否仍**确定性可判**？ | ✅ **是** | node 面真源切片逐次断言 `aReplaced===true`（并要求 `ACCEPTED.label` 在场 ∧ `STALE_LABEL` 不在场）+ **反证**「`aReplaced:false` ⇒ 必红」；与相位**无关**（纯函数输入直接构造 `session.aiNext`） |
| 「AI 缺席 ⇒ 陈旧 chip 照旧」是否可判？ | ✅ **是** | node B/C 双读数 + s0-⑬C 真面板 |
| 「前 N=3 截断 ∧ 仍单卡 ∧ 终端恒在」是否可判？ | ✅ **是** | node `mChipCount===3` / `mCardCount===1` / `mTerminal` + 反证「`mChipCount:4` ⇒ 必红」；Chromium 三面同判 |
| `recommendation.mjs` 面**是否构成门禁降级**？ | ❌ **不构成** | 该面仍是**非恒真**判据（破坏 `cards`/`chipCount`/`staleAbsent`/`terminalLast` 任一 ⇒ 必红），只是把「替换裁决」**改由同判据的 node 真源切片承担**（判据本体零删除零放宽） |
| 是否需要新增**真页面夹具**？ | ❌ **本叶不必要** | 会触及门禁**运行时窗口**（一次一个 Chromium + `CHROMIUM_GATES===9` 的守恒面）与相位治理成本，而**替换双向已由确定性 node 面覆盖**；真面渲染已由 s0-⑲ 补足 |

**风险与条件**：⑲ 成为**真面「AI 赢槽」的单点裁决面**，而其严格规则断言存在与 ⑬A 同源的 flake 隐患 ⇒ 若 ⑲ 翻红，真面裁决面**暂时**失稳；**但** node 面（真源切片）独立仍成立 ⇒ **安全语义与替换双向判据不受影响**。⇒ 处置 = 按 **I-1 加固 ⑲**（**加固而非放宽**），并把「该面核与相位无关不变量」的**范围边界**留存（`recommendation.mjs` docstring 已有 + 本报告 §8 已存）。若后继确需真页面夹具，**另立轮次**评估（非本叶范围）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 执行审查）：C1~C32 逐项（27 ✅ / 5 ⚠️ / 0 ❌ / **0 阻塞**）；四维度汇总；0 阻塞；7 改进（I-1~I-7）；**SG-ADN-03 裁决 + 落实**（父 ADR-ADN-004 §③ 文字订正，机制零改）；**E2 门禁强度评估**（充分 / 非降级 / 无需真页面夹具） | 2026-09-27 | SDDU Review Agent |
