# 审查报告：specs-tree-v4-2-chat-stream-model

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C8 审查清单 + FR→Cx 覆盖矩阵 + 四维度判据）
> **前置依赖**: `review.md`、本叶 `spec.md`/`plan.md`/`tasks.md`/`build.md`、父 `../spec.md`/`../plan.md`、`docs/v4-supersession-ledger.json`、`docs/v4-density-baseline.json`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-19
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（R1 全量静态审查 + 既有门禁只读复跑：C1~C8 逐项结论 + I-01~I-12 改进项 + 红线零改动核验 + 复跑证据）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **8**（C1~C8） |
| 通过 | **3**（C1 / C2 / C6） |
| 警告 | **5**（C3 / C4 / C5 / C7 / C8） |
| 失败 | **0** |
| 阻塞问题 | **0** |
| 改进项 | **12**（I-01~I-12；中 5 / 低 7） |

**被审基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `611afdd` · diff 基线 `203261e`（v4-1 收口轮）· `main` 未动。`git status --porcelain` 在本轮审查前后除本报告/策略/`state.json`/`TREE.md` 外为空。

**纪律声明**：本轮**未修改**任何源码/测试/配置/既有文档；仅新增/更新 `review.md`、`review-report.md`、`state.json`（完成协议）与 `TREE.md`（导航同步）。复跑门禁不改动源码产物（`dist/**`、`dist-test/**` 为 gitignored 构建产物；`test:density --reverse RP-V4-09` 不触发 `pick-layer` 重写路径，故红线产物未被扰动）。

**本轮复跑过的门禁（真实执行，非引用）**：
- `npm test` → **918 / 0 / skipped 0**（node 全量，含新增 `stream-model.test.ts`/`stream-persistence.test.ts`）
- `npm run test:supersession` → **28 / 0**；`npm run test:gate-integrity` → **12 / 0**；`npm run test:design-contract` → **6 / 0**；`node design/ui-redesign/option-f-shim.mjs` → **60 / 0**
- `npm run test:stream`（Chromium）→ **63 / 0**（floor 61）
- `npm run test:density`（Chromium）→ **171 / 0**（阶段 F 28 格 + 产物 425,442 ≤ 446,714）
- `npm run test:density -- --reverse RP-V4-09`（Chromium）→ **9 / 0**
- `npm run test:l0`（Chromium）→ **212 / 0**
- 独立只读复算：真实 `dist/build-meta.json` 逐模块 `bytesInOutput`（v42RoundRows 16 行逐条）、`inputs` 计数（=69）、`stat`/`sha256sum` 红线产物、`python3` 复算台账 `counts`/`knownLimitations`。

---

## 2. 逐项审查结果（C1~C8）

| # | 审查对象 | 审查基准 | 评估 | 发现（证据） | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | **append-only 纯度** | ADR-V4-024 · 父 ADR-V4-002/003/012 · FR-CHAT-020/025 | ✅ | **不可变全链成立**：`appendEvent` 对事件 `Object.freeze`（`stream-model.ts:239`）、载荷 `Object.freeze({...})`（:245）、事件数组 `Object.freeze`（:251）、state `Object.freeze`（:249）；`createStreamState` 冻结空数组（:217-223）；`test/stream-model.test.ts` ① 运行期写入断言（:72-76）。**无改写已入列事件/seq 的路径**：全仓 `grep` 仅 `boundStreamEvents:292` 的 `kept.splice`（作用在 `[...state.events]` 副本上，原数组不动）；`stream-merge`（`chat-state.ts:377-392`）spread 新数组。**终态冻结是投影不变式**：`project` 对已有 terminal 或生来冻结 kind 直接 `continue`（`stream-model.ts:423`），后续事件既不改 `terminal`/`terminalSeq` 也不折叠进 payload；无删除 `terminal`/`data-frozen` 的路径（`stream-render.ts` 仅在 `reset()` 清节点）。**bound 淘汰语义诚实**：只淘汰**非当前段**的 `system`/`notice`（`stream-model.ts:270/290`），`dropped` 计数可见（`:299`）；DOM 侧 `render()` 对不在 `live` 集合的节点真 `remove`+`delete`（`stream-render.ts:119-126`），对仍 live 但非当前段的节点 `detach` 保留（:127）——「内存淘汰 + DOM 同步移除」与「段投影 detach」两口径分明。**唯一 seq 重置路径**是测试 seam `streamReset()`/`reset()`（`sidepanel.ts:614-618/634-659`），注释明示「product never clears」；产品路径 `switchStreamSession` 不重置（`stream-model.ts:319-331`，`test/stream-model.test.ts:90-104` 断言）。 | — |
| C2 | **零明文边界** | ADR-V4-028 · NFR-CHAT-012 · FR-CHAT-024 | ✅ | **白名单唯一出口成立**：`DIGEST_FIELDS` 11 字段（`stream-digest.ts:54-66`）；`digestEntryOf` **不读 `payload.text`**（:176-193 只读 `label`/`tool`/`ok`/`ms`/`refNum`/`requestId`；全仓 grep 确认 `stream-digest.ts` 无 `payload.text` 读点）；无 label 的卡不落任何文本（`test/stream-persistence.test.ts:91-101`）。**落库路径唯一**：`upsertDigest` 仅被 `sidepanel.ts#persistStreamDigest` 调用（:198-212），后者对每 entry 走 `assertDigestSafe`；读回 `parseEnvelope` 再校验（`stream-digest.ts:234-250`，篡改含 URL query ⇒ 抛错，测试 :247-251）。**截断不夹带**：`sanitizeLabel` 先取首行 trim、`slice(0,80)` **再** `assertNoPlaintext`（:129-134）——敏感触发子在 80 字符内即抛错，在 80 之外则被截掉（无泄漏）；新行/空白剥离。**结构保证**：`DigestEntry` 类型层无自由文本字段；`label`/`tool`/`cardId`/`askRequestId` 全部过 `assertNoPlaintext` 四类形态（URL query/密钥/命令参数体/原始标记）。 | — |
| C3 | **迁移完整性** | ADR-V4-024/025 · TASK-607 · FR-CHAT-020/022/026 | ⚠️ | **12 既有 action 零删除**：`reduceChat`（`chat-state.ts:177-251`）保留 `203261e` 全部 14 个 case（`user/assistant/tool/command/error/pending/state/confirm/confirm-resolved/ask/ask-resolved/audit-count/history/notice`，逐 case 比对）；action 联合由 14 增到 16（仅追加 `stream-session`/`stream-merge`，`ask-resolved` 追加可选字段 `answer?/canceled?`，`history` 追加 `sessionId?/sessionLabel?`，均回溯兼容）。**`render()` 全路径切换**：`render()` 的流段只调用 `streamRenderer().render(project(state.stream), liveCardIds(...))`（`sidepanel.ts:889-891`），`#stream` 无 `textContent=''`/`replaceChildren`/`innerHTML=` 残留（grep 命中的 `textContent=''` 均落在 `#session-list`/`#session-select`/`#discovery` 等非流容器：:968/989/1045）；`cards/*` 承接 v1 渲染器。**`toolOpenState` 键迁移**：模块级 `Map` 键由 entry id 改为 `cardId`（`sidepanel.ts:129/142-143`），从不持久化 ⇒ 旧会话恢复不炸（digest 恢复面只含 ask/auth，不涉 toolOpen）。**缺陷**：plan §5 点名的 `MODIFY view-model.ts`（ADR-V4-026 dec.3 `cardViewModel()` 消费 `CARD_KIND_LAYER`）实测 **零 diff**，且 TASK-602 验收点名的 `appendSystem()`（plan §2.5「v4-4 唯一通道入口」）在全仓 **`grep` 0 命中** —— 两处计划交付物未落地，build.md §11 六项偏差**均未登记**（见 I-03）。 | 低 |
| C4 | **六项登记偏差合法性** | build.md §11 · 父 ADR-V4-003/005 · plan ADR-V4-024~029 | ⚠️ | **①切换=段投影非销毁**：合法且登记（`stream-render.ts` 头注释 + build §11 偏差 1）——`project()` 按当前段过滤满足 journey #16e/#16g「不串台」硬约束，非当前段 detach 但留 `nodes` map（切回重挂同一节点，冻结/折叠零损）。**caveat**：父 ADR-V4-003 的「旧段内存 ⇒ 可上滚回看」被收窄为「切回该段后可看」，**当前段视图内上滚看不到旧段**——已在 §11 偏差 1 明写，属诚实登记。**②降级重建收敛为终态 ask/auth**：登记（`sidepanel.ts:220-240` 注释 + build §11 偏差 2）；ADR-V4-028 §5 动机「授权记录可回看」，全量重放会撞冻结的 `l0` ⑩/空态契约（实测 209/1）；全 kind 能力由 TASK-609 覆盖。合法，但**弱于 ADR-V4-028 §5 的「全量重放」字面**，须在 v4-3 复算（已登记）。**③ask/auth 骨架化**：与 spec §2.2「不做流内化，只提供骨架与固化契约」**逐字一致**；`streamBranch` 对 live `ask`/`confirm` 刻意不 append（`chat-state.ts` case 'ask'/'confirm' 返回 state）。合法。**④未解释字节 1000→1500 + 新增 <2%**：绝对值**放松**（实测累计未解释 = 265 属性位移 + 1,060 胶水 = 1,325 > 1000，故必须抬），理由（esbuild 共享胶水随输入模块 57→69 增长）成立；**同时新增更严的相对口径 <2%**（`size-growth-evidence.test.ts` 新增断言，实测 1,325/130,217 = 1.02%）。方向 = 净非纯放宽，登记诚实。**⑤RP-V4-09**：v4 保护段反证已占 `RP-V4-08`，新增用 09 合法；但处理函数名误写 `reverseRpV408`（`density.mjs:1473`，见 I-09）。**⑥第 9 个 cards 文件 `shared.ts`**：合法（避免 `cards/*` ↔ 注册表 ESM 循环）；但 plan 清单里的 `cards/command.ts` 实际并入 `cards/system.ts`（`createCommandCard` 在 `system.ts:28`），**未登记**（见 I-03）。 | 低 |
| C5 | **卡预算裁决（TASK-613）** | TASK-613 · FR-CHAT-072/073/075 · 父 ADR-V4-020 | ⚠️ | **裁决显式且方向=收紧**：单卡 ≤6 保留 + 新增首屏合计 ≤8（`density-scope.ts:71` 单源 + `CARD_BUDGET_LIMITS`）+ 形态判据 `RESIDENT_NAV_ATTRS`/`RESIDENT_NAV_CLASSES`（:84-90）+ `assertChromeNotInStream` 双判据（:116-137）。**主门禁真判合计**：`evaluateFirstScreen` 已纳入 `evaluateStreamResidentBudget`（`density-metrics.mjs`），default 档（`density.mjs:581-586`）与 empty 档（:715-717）均跑；我复跑 `test:density` 171/0。**RP-V4-09 两段反证真实**：我复跑 `--reverse RP-V4-09` → 9/0，日志「前置 PASS ∧ 两卡各 5 可点 ⇒ 首屏 FAIL（诊断含『流内卡合计可点 10 > 8』）∧ 单卡预算仍 PASS ∧ 工具栏形态控件入 #stream ⇒ 守卫抛『常驻导航入口』∧ 还原后双绿」，与 build §7.2 逐行一致；`gate-integrity` R4b 机器核对两条 FAIL 段模式已存在于源码（复跑 12/0）。**`knownLimitations[0]` 已更新为「已重审 + 结论」**（v4-1 历史原文保留）。**caveat（I-05）**：「合法最坏首屏 = 8」推导取的是**一个特定组合**（ask 5 + nextstep 3）；若两张卡都是 askuser（5+5=10）则每卡合规但合计超 8——v4-2 未把 ask 流入 stream 故不触发，但该组合的合法性边界未写入 `knownLimitations`（`knownLimitations` 其余条目仍留 v4-1「过渡口径」余绪）。**caveat（I-12）**：形态判据是**标记+形态启发式**（`data-chrome-control`/`data-toolbar-slot`/`.view-btn`），非结构判定；用全新 class 造的常驻入口可绕过 guard（靠合计上限兜底），build 未声明该残余面。 | 中 |
| C6 | **渲染正确性** | ADR-V4-025/026 · FR-CHAT-022/023/037 · NFR-CHAT-003/011 | ✅ | **keyed 三操作 + 冻结成立（复跑证）**：`render()` 对已有非冻结卡才 `patchCardNode`（`stream-render.ts:112`），新卡不 patch；卡变为终态时先 patch 一次写固化区、再 `data-frozen="true"`（:113）——`test:stream` ④ 断言终态卡 `outerHTML` 逐字不变 ∧ 节点引用 `===` ∧ `children == project()`；③ 断言 `.card-fixed` 显隐 + `.ts` + 无撤销。**freeze 后属性不变**：渲染循环对 `data-frozen==='true'` 的卡完全跳过 patch（:108/112），detach（非当前段）只 `removeChild` 不改属性 ⇒ 切回重挂后属性/折叠零损。**滚动**：`render()` 仅 `appended>0 && follow` 才 `followToBottom`（`sidepanel.ts:894`，`follow` 取自 `scrollFollow.shouldFollow()`），复跑 ⑤ 断言上滚追加 `scrollTop` 不变、回到底部 48px 内、hidden 收起。**320/400/520 零溢出 + ≈320 卡不整层重建**：复跑 ⑥⑧ 通过；`test:stream` 63/0（floor 61）、`test/perf-budget` 320 卡投影 <250ms 且回放稳定。**caveat（I-07/I-08）**：空态判据用 `state.entries.length`（v1 派生视图）而非 `project(state.stream)`（`sidepanel.ts:892`）——digest 恢复（有决策卡、无 entries）会同时显示空态占位；`patchAiCard` 用 `removeChild` 循环重建 markdown（`cards/ai.ts:31-32`），字面未用禁用 API 但语义是内容重建，且 `ai` 生来冻结 ⇒ 产品不可达（死防御路径）。 | 低 |
| C7 | **体积五要素** | 父 ADR-V4-010 · AC-CHAT-023 · FR-CHAT-094 | ⚠️ | **五要素齐备 + metafile 同源**：① `dist/sidepanel.js` `stat` = **425,442 B**；② 385,319 → 425,442（+40,123 / +10.41%）；③ 日期/命令/测量人齐；④ 理由逐模块；⑤ `SIDEPANEL_BASELINE_BYTES_TIMELINE` 追加 + `SIDEPANEL_RE_REGISTRATIONS['v4-2']`（`assertionNonRemovalEntries` V42-E-SVP-1/2、CARDS-1、STREAM-1）。**独立读真实 `dist/build-meta.json`**：v42RoundRows 16 行 `bytesInOutput` **逐条相等**（stream-model 5,998 / stream-digest 6,253 / stream-render 2,495 / cards index 9,679 / shared 2,172 / ai 733 / user 419 / system 1,035 / tool 2,784 / thinking 1,636 / error 445 / notice 395 / sidepanel 62,726 / chat-state 9,304 / density-scope 2,284 / l1/receipt 2,835）；`inputs` 计数 = **69**（== `duplicationCheckInputModuleCount`）；Σ 新模块 34,044 + 接线 5,617 = 39,661。ceiling = `floor(425,442 × 1.05)` = **446,714**（复算一致，容差 5% 未动、cap 仍 record-only）；`PENDING_ABSOLUTE_CAP` 仍 `resolved:false` 未预填。**缺陷（I-02）**：build.md §9 ④ 把**累计口径**胶水 1,060 塞进**本轮**等式（「+ 未归因胶水 1,060 B（= 累计增量的 0.81%）== 40,123 B」），本轮胶水实为 **462**（39,661 + 462 = 40,123；§14 修订记录与 `size-baseline.ts:994 v42RoundUnattributedGlueBytes` 均为 462）。**缺陷（I-10）**：`size-baseline.ts:862` 的 `closeoutDeltaBytes` 注释仍写「v4-1 三区骨架自身（375,102 → 385,319，Σ+10,075+142）」，与字段现值（v4-2 的 40,123）脱节。 | 中 |
| C8 | **门禁账与规范** | spec §7 · tasks 验收 · 父 ADR-V4-004/011/029 · plan §2.5/ADR-V4-028 dec.5 | ⚠️ | **计数同源**：我复跑与 build §8 / 台账 `counts` 逐项一致（node 918/0·skipped 0、supersession 28、gate-integrity 12、design-contract 6 + shim 60、stream 63、density 171、l0 212、RP-V4-09 9）；台账 `counts.currentRuntime` 12 项（l0 212 / l1 108 / l2 73 / density 171 / journey 167 / insight 116 / binding 192 / hardening 24 / sidepanelView 38 / nodeTestRuntime 918 / supersession 28 / stream 63）与门禁日志同源；`v4GateFloors` 含 `stream.mjs: 61`。**AC 逐条证据**：见 §2.1（AC-CHAT-001/002/003/005/011/022 由 `test:stream` 复跑覆盖；010 由 `test:stream-model`；020 由全量 diff；023 由门禁；025 由 design-contract）。**红线独立复核**：`git diff --stat 203261e..611afdd` 对 `src/content/**`/`src/background/**`/`manifest.json`/`design/**`/`src/security/**`/`src/ui/options/**`/`hardening.mjs`/`page-input.mjs`/`zero-injection.mjs` **全空**；`stat`/`sha256sum`：`content.js` 177,076 B / sha `52a826205553b4…`、`pick-layer.js` 33,900 B / sha `5f567d7ededc…`（= v4-1 pin，逐字节未变）；`CHROMIUM_GATES.length === 9` 未改（`gate-integrity.test.ts:542`，复跑 12/0），`EXPECTED_AUDITED_FILES` 仅追加 `test/ui/stream.mjs`（:148-156）。**缺陷（I-01）**：plan ADR-V4-028 dec.5 + TASK-605/606 验收要求把**降级重建截断规则**登记进 `docs/v4-supersession-ledger.json#truncationRules`（`{scope:'panel-reopen', kept, degraded:['body'], reason, registeredOn}`）；实测该 ledger **无 `truncationRules` 字段、无 `panel-reopen`/`历史摘要` 条目**（grep 0 命中），build.md §5 与 §11 偏差 2 声称「登记于台账」**不实**（实际只在 `sidepanel.ts:220-240` 注释 + build.md 正文）。**缺陷（I-04）**：supersession ledger `knownLimitations` KL-N-02 仍称「补齐形态/位置反向判定需改产品代码（`toolbar.ts`）…留待下游」，而 v4-2 TASK-613 已在 `density-scope.ts` 落地形态判据、且 density-baseline 的 N-02 条目与之口径分裂。**缺陷（I-03）**：`appendSystem()`/`cardViewModel()`/`view-model.ts` 未落地且未登记（见 C3）。 | 中 |

### 2.1 AC 映射（build.md / 门禁证据 → AC）

| AC | 机器证据 | 判定 |
|----|---------|:--:|
| AC-CHAT-001（`ol#stream[role=log]` 正序追加） | `test/ui/stream.mjs` ⑦「流本体为 ol#stream[role=log]」+ ① `li[role=listitem]`；复跑 63/0 | ✅ |
| AC-CHAT-002（7 主类 + 过程族全覆盖） | `test/ui/stream.mjs` ①12 卡型逐型存在 + ②过程族 5 形态字段零丢失；`test/stream-model.test.ts` taxonomy | ✅ |
| AC-CHAT-003（固化契约统一） | `test/ui/stream.mjs` ③ 操作前→后（`data-answered`/`data-decision` + form hidden + `.card-fixed` + `.ts` HH:MM:SS + aria-live） | ✅ |
| AC-CHAT-005（只固化不撤销；无撤销控件） | `test/ui/stream.mjs` ③「卡内零『撤销』控件」（`/撤销/.test(c.textContent) === false`）；`cards/index.ts` 无 undo 控件 | ✅ |
| AC-CHAT-010（留痕完备 + 回放 + 无置 null 消失） | `test/stream-model.test.ts` ③回放等价（双向）+ ⑤取消/取代后原卡仍在 + ④终态冻结；`test/stream-persistence.test.ts` ④ | ✅ |
| AC-CHAT-011（system 单行 + 时间戳 + 只追加 + 不被覆盖） | `test/stream-model.test.ts` ④「system/notice 无终态但生来冻结」+ `test/ui/stream.mjs` ①`.card-head .ts`、②`.msg-notice` 存在 | ✅ |
| AC-CHAT-020（`KIND_SET` 零 diff；独立校验器） | `git diff` `messaging.ts`/`manifest.json`/`src/background/**` 空；零新增 kind（`STREAM_EVENT_KINDS` 12 项无扩展） | ✅ |
| AC-CHAT-022（无障碍） | `test/ui/stream.mjs` ⑦ role=log / listitem / `.ts` 可读 / aria-live=polite / 收起用 hidden | ✅ |
| AC-CHAT-023（全门禁绿 + 反证实跑 + 日志落盘） | 本轮复跑 node 918 / stream 63 / density 171 / l0 212 / RP-V4-09 9 + build §8 20 项 + 日志 `/tmp/opencode/v4-gate-logs/v4-2/` | ✅ |
| AC-CHAT-025（设计契约条款化） | `test:design-contract` 6/0 + shim 60/0；`CARD_TYPES` 7 主类顺序敏感（`test/stream-model.test.ts`） | ✅ |
| EC-CHAT-003（切换过程元数据不丢或截断显式登记） | 切换不丢：`stream-model.ts:319-342` + `test/stream-model.test.ts:90-119`；**截断显式登记 = 缺（I-01）** | ⚠️ |
| EC-CHAT-004（320px 零水平溢出） | `test/ui/stream.mjs` ⑥（含长 URL 卡） | ✅ |
| EC-CHAT-006（长会话 ≈40 轮） | `test/ui/stream.mjs` ⑧（300 批量 ≈320 卡不整层重建）+ `test/perf-budget` 320 卡有界 | ✅ |
| EC-CHAT-009（固化卡键盘/读屏可达） | `aria-live=polite` + `role=listitem` + `li` 天然可达；`test/ui/stream.mjs` ⑦ | ✅ |
| EC-CHAT-013（不留红灯） | 0 阻塞；20 项门禁绿；红线零 diff | ✅ |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C1 / C6 / C7） | 8* | 3 | 5 | 0 | 37.5% |
| 规范符合性（C2·C3·C4·C5·C8） | 8* | 3 | 5 | 0 | 37.5% |
| 架构一致性（C1·C3·C4·C7） | 8* | 3 | 5 | 0 | 37.5% |
| 测试质量（C5·C6·C8） | 8* | 3 | 5 | 0 | 37.5% |
| **合计（去重）** | **8** | **3** | **5** | **0** | **37.5%** |

> **说明**：本清单由用户指定为 C1~C8（每条**跨维度**），故上表按四维度各自统计 8 条（同一 Cx 计入其覆盖的每个维度），「合计（去重）」才是真实条目数。警告项全部为「登记保真 / 断言覆盖强度 / 计划交付物落地」类，**无一项表现为门禁虚绿、安全语义被破或红线被破**（见 §6 零改动核验与 §2 C1/C2）。

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无（0 个阻塞）** | — | — |

> **判定说明**：`truncationRules` 登记缺失（I-01）与计划交付物缺失（I-03）虽属规范符合性问题，但：① 规则本身已在 `restoreStreamDigest` 注释与 build.md 正文逐字记录（非静默）；② 无门禁因之虚绿；③ 不影响「append-only / 零明文 / 红线 / 门禁绿」的事实判定。故按 v4-1 review 先例（登记保真类记改进不记阻塞）处理。

---

## 5. 改进建议

> 分级：**中** = 建议在 validate 前/随下轮修复处理；**低** = 可随 v4-3 顺手处理。全部附可执行修复方向。

| # | 级别 | 位置 | 问题 | 对应 Cx | 建议 |
|---|:--:|------|------|:--:|------|
| **I-01** | 中 | `docs/v4-supersession-ledger.json`（缺 `truncationRules`）vs `build.md §5/§11-2` | plan ADR-V4-028 dec.5 + TASK-605/606 要求登记 `{scope:'panel-reopen', kept, degraded:['body'], reason, registeredOn}`；实测 ledger 无此字段/条目，build.md 声称「登记于台账」不实 | C8 | 在 ledger 新增 `truncationRules`（或 `knownLimitations`）条目：`scope:'panel-reopen'`、`kept:[seq,ts,kind,cardId,terminal,tool,ok,ms,refNum,askRequestId]`、`degraded:['body']`、reason=「自动重放仅已终态 ask/auth；全量重放撞冻结 l0 ⑩/空态契约」、registeredOn；并给账加「存在则须含 scope」断言 |
| **I-02** | 中 | `build.md §9` ④（行 251） | 本轮等式误用累计胶水 1,060（应为 462；39,661 + 462 = 40,123）；「0.81%」是累计比而非本轮比 | C7 | 改为「未归因胶水 462 B（本轮；累计口径 1,060 B / 0.81% 另列）」，与 §14 及 `v42RoundUnattributedGlueBytes: 462` 对齐 |
| **I-03** | 中 | plan §5 / §2.5 vs 实际产物 | 计划交付物未落地且未登记：`MODIFY view-model.ts`（`cardViewModel()` 消费 `CARD_KIND_LAYER`）零 diff；`appendSystem()` 全仓 0 命中；`cards/command.ts` 并入 `cards/system.ts` | C3·C4·C8 | 二选一：① 补实现 `appendSystem`（v4-4 通道入口）与 `cardViewModel`（或在 build §11 追加「改名/内联」偏差登记）；② 明确「由 `CardView`+`systemRowPayload`+`cards/system.ts` 取代」并逐条登记（禁静默） |
| **I-04** | 中 | ledger `knownLimitations` KL-N-02 vs `density-baseline` N-02 | 前者仍称形态/位置判据「需改 toolbar.ts…留待下游」，后者/实现已在 `density-scope.ts` 落地形态判据（TASK-613）——两册口径分裂 | C5·C8 | 更新 KL-N-02 为「形态判据已由 v4-2 TASK-613 落地；残余面=绕过形态标记的常驻入口，由首屏合计 ≤8 兜底」，或标注为历史文本并指向 density-baseline 的 N-02 终态 |
| **I-05** | 中 | `docs/v4-density-baseline.json#knownLimitations` + build §11-② | v4-3 落 ask/auth 流内化时必须复算「首屏合计可点 ≤8」的**前提**（当前 8 的推导假设首屏 = ask 5 + nextstep 3；两张 askuser 合法组合 = 10 会超限）未登记为下游义务 | C5 | 在 `knownLimitations` 增「v4-3 复算 = 前置」条目；或把合计判据按「首屏可见卡型的最大单卡可点之和」形式化（而非固定 8），并在 v4-3 重跑 RP |
| **I-06** | 低 | `chat-state.ts:377-392`（`stream-merge`） | 按 `cardId` 去重、**不按 `seq` 去重**、不重算 `openAsks`；若在非空流上派发，可与既有事件产生重复 `seq`（破坏「单调不复用」不变式） | C1 | 合并时 `known` 同时收 `seq` 与 `cardId` 并跳过冲突项（或断言 `stream-merge` 仅在 `events.length===0` 时可达）；补一条 node 负例 |
| **I-07** | 低 | `sidepanel.ts:892` | 空态用 `isLogEmpty(state.entries.length)`（v1 派生视图）判定，而卡来自 `project(state.stream)` —— digest 恢复（有决策卡、无 entries）会同时显示空态占位并保留卡 | C3·C6 | 改为 `const empty = project(state.stream).length === 0 && !state.pending;`（或 `views.length===0`），单一投影源 |
| **I-08** | 低 | `cards/ai.ts:27-33` / `cards/tool.ts:87-99` | `patchAiCard` 用 `removeChild` 循环重建 markdown（字面合规、语义=内容重建），且 `ai` 生来冻结 ⇒ 产品不可达死防御路径；`patchToolCard` 每帧重写 `body.textContent`（无脏检查） | C6 | 给 `patchAiCard` 加「非冻结才可达」注释或删除（不可达）；或在冻结前用一次 patch 而非每次 render 全量重写；保持 `test:stream` ④ 断言不变 |
| **I-09** | 低 | `test/ui/density.mjs:1473` | RP-V4-09 的处理函数误名 `reverseRpV408`（编号 08 已属 journey pin 反证） | C4 | 重命名为 `reverseRpV409` 并与 case 分派一致（`gate-integrity` R4b 只核 FAIL 段模式文本，不受影响） |
| **I-10** | 低 | `test/size-baseline.ts:862` | `closeoutDeltaBytes` 的 doc-comment 仍写「最近一轮（v4-1）375,102 → 385,319，Σ+10,075+142」，与字段现值（v4-2 的 40,123）脱节 | C7 | 更新为「最新一轮（v4-2，385,319 → 425,442，Σ+39,661+462）」，并保留 v4-1 历史于 `v41RoundRows` 注释 |
| **I-11** | 低 | `stream-digest.ts:111-126` vs `l1/receipt.ts:71-77` | 存在**两份** `assertNoPlaintext` 实现（前者为超集，非共享单源）；`askRequestId` 作为白名单字段**未截断**（仅扫描） | C2 | 抽出共享谓词或至少交叉引用注释；`askRequestId` 增加 `slice(0, N)` 或明确「业务键、非自由文本」并在 ADR 登记 |
| **I-12** | 低 | `test/ui/density.mjs:583` / `index.html` | default 档 check 文案仍写「单卡可点 ≤6 ∧ 首屏卡 ≤2」而实际已含合计 ≤8（`evaluateFirstScreen` 内）；`.ask-choices`/`.ref-chip.mono` 为新契约样式中的未使用类（死 CSS） | C5·C6 | check 文案补「∧ 首屏合计 ≤8」；删除或接线死 CSS（避免「样式存在=能力存在」的误读） |

---

## 6. 零改动 / 复跑核验原文

### 6.1 零改动核验（红线）

```text
$ git diff --stat 203261e..611afdd -- \
    packages/web-cli-plugin/src/content packages/web-cli-plugin/src/background \
    packages/web-cli-plugin/manifest.json packages/web-cli-plugin/design \
    packages/web-cli-plugin/src/security packages/web-cli-plugin/src/ui/options \
    packages/web-cli-plugin/test/ui/hardening.mjs packages/web-cli-plugin/test/ui/page-input.mjs \
    packages/web-cli-plugin/test/ui/zero-injection.mjs
（空 = 零 diff）

$ stat -c '%n %s' dist/content.js dist/pick-layer.js dist/sidepanel.js
dist/content.js    177076   (= v4-1 pin，无容差)
dist/pick-layer.js  33900
dist/sidepanel.js  425442   (= v4-2 登记基线)

$ sha256sum dist/content.js dist/pick-layer.js
52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6  dist/content.js
5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59  dist/pick-layer.js
（与 v4-1 review-report §6.1 逐字相同 ⇒ 判定链/内容脚本零扰动）

$ grep CHROMIUM_GATES.length test/gate-integrity.test.ts
assert.equal(CHROMIUM_GATES.length, 9, ...)   # 字面量未改；EXPECTED_AUDITED_FILES 仅 +stream.mjs
```

### 6.2 体积归因独立核对（真实 metafile）

```text
$ node -e '... dist/build-meta.json ...'
outputs sidepanel bytesInOutput = 425442（stat 一致）
inputs count = 69  == SIDEPANEL_GROWTH_BREAKDOWN.duplicationCheckInputModuleCount
v42RoundRows 16 行逐条相等（stream-model 5,998 / stream-digest 6,253 / stream-render 2,495 /
  cards/index 9,679 / shared 2,172 / ai 733 / user 419 / system 1,035 / tool 2,784 /
  thinking 1,636 / error 445 / notice 395 / sidepanel 62,726 / chat-state 9,304 /
  density-scope 2,284 / l1/receipt 2,835）
Σ 新模块 34,044 + 接线 5,617 = 39,661；+ 本轮胶水 462 = 40,123 == 425,442 − 385,319 ✔
ceiling = floor(425,442 × 1.05) = 446,714（复算一致）
⚠ build.md §9 ④ 写「胶水 1,060 == 40,123」（口径混用，见 I-02）
```

### 6.3 台账独立复算（python3）

```text
counts.currentRuntime: l0 212 / l1 108 / l2 73 / density 171 / journey 167 / insight 116 /
  binding 192 / hardening 24 / sidepanelView 38 / nodeTestRuntime 918 / supersession 28 / stream 63
v4GateFloors: 含 stream.mjs: 61
density-baseline knownLimitations[0]: 已含「V4-2 TASK-613 重审完成 + 裁决 + 反证」且 v4-1 原文保留 ✔
supersession-ledger: has truncationRules = False；panel-reopen / 历史摘要 grep 0 命中 ✘（I-01）
supersession-ledger knownLimitations: KL-N-02 仍称形态判据「留待下游」（I-04）
```

### 6.4 门禁复跑（本机真实执行）

```text
$ npm test                                       → tests 918 / pass 918 / fail 0 / skipped 0   (EXIT=0)
$ npm run test:supersession                      → 28 / 0                                     (EXIT=0)
$ npm run test:gate-integrity                    → 12 / 0                                     (EXIT=0)
$ npm run test:design-contract                   → 6 / 0                                      (EXIT=0)
$ node design/ui-redesign/option-f-shim.mjs      → 60 passed / 0 failed                       (EXIT=0)
$ npm run test:stream                            → 63 passed / 0 failed                       (EXIT=0)
$ npm run test:density                           → 171 passed / 0 failed；产物 425442 ≤ 446714  (EXIT=0)
$ npm run test:density -- --reverse RP-V4-09     → 9 passed / 0 failed                        (EXIT=0)
$ npm run test:l0                                → 212 passed / 0 failed                       (EXIT=0)
```

---

## 7. 未能验证的项（如实列出，未用推断填坑）

1. **未复跑** `test:l1` / `test:l2` / `test:insight` / `test:binding` / `test:hardening` / `test:e2e` / `test:zero-injection` / `test:page-input` / `test:l1-reverse` / `test:l2-reverse` / `test:ui`(journey)（内存/时间约束，NFR-V3-012 串行纪律）：其运行期结论**引用** build.md §8 与 `/tmp/opencode/v4-gate-logs/v4-2/*.log`；其中 `journey.mjs` 在本轮 diff 中**零改动**（v4-2 未触碰），故保护段语义不变可直接采信。
2. **未逐一复跑** RP-V4-01~08（每条一次 Chromium）：只复跑了 RP-V4-09（TASK-613 新增），其余引用 build §7 与 `gate-integrity` R4b 模式断言（复跑 12/0 ⇒ 模式文本确在源码）。
3. **I-05 的 v4-3 组合**（两 askuser 卡 = 10）为**静态推演**，未构造产品态运行（v4-2 不把 ask 流入 stream，无法在现产物触发）。
4. **I-08 的 `patchAiCard` 不可达**为**静态推演**（`BORN_FROZEN_KINDS` 含 `ai` ⇒ `project().frozen===true` ⇒ 渲染永不 patch）；未在浏览器内注入非冻结 ai 卡验证（seam 无法构造该态）。
5. 未审计 `dist/sidepanel.js` 增量构成以外的其它产物（SW bundle 未动，`src/background/**` 零 diff 已核）。
6. 未核对 `designCaliber`（E/D 稿历史登记，不参与本叶验收）。

---

## 8. 结论

**结论**: ⚠️ **有条件通过**（0 阻塞，12 改进项，其中 5 项中severity）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 3 / 8 = **37.5%**（警告 5，失败 0） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **3** 项（I-01 截断规则未登记 / I-03 计划交付物未落地且未登记 / I-04 台账口径分裂）+ 2 项「登记保真数字级」需订正（I-02 / I-10） |
| 可进入 validate | **是**（0 阻塞；红线零改动；append-only/零明文安全语义经静态 + 复跑双重核证；门禁与反证无虚绿） |

**理由**：
1. **两个安全语义经得起打假**：① append-only——事件/载荷/state/数组全链 `Object.freeze`，无改写已入列事件的写路径（`splice` 作用于副本），终态冻结由投影不变式强制、无解除路径，`bound` 是唯一删除且只碰非当前段 `system`/`notice`、DOM 同步移除；② 零明文——`digestEntryOf` 结构上不读 `payload.text`（grep 证），白名单 11 字段唯一出口、落库与读回双重校验、注入必抛，`label` 先截断后扫描故不夹带敏感前缀。
2. **红线与不动面零 diff**：`content.js` 177,076 B（sha 与 v4-1 逐字相同）、`pick-layer.js` 33,900 B、`manifest.json`/`src/content/**`/`src/background/**`/判定链/`KIND_SET` 全空 diff；`CHROMIUM_GATES.length===9` 未动。
3. **门禁与反证无虚绿**：我独立复跑 node 918/0（skipped 0）、stream 63/0、density 171/0、l0 212/0、RP-V4-09 9/0、supersession 28/0、gate-integrity 12/0、design-contract 6/0 + shim 60/0，全部与 build.md/台账同源；体积 metafile 16 行逐条相符；TASK-613 裁决方向确为收紧且两条判据均由真会红的反证背靠。
4. **但存在 12 项非阻塞缺陷**，集中四类：① **显式登记缺失**（`truncationRules` 未入台账、`view-model.ts`/`appendSystem`/`cards/command.ts` 计划交付物未落地且未登记、KL-N-02 口径分裂）；② **数字化保真**（build §9 胶水口径混用 1,060/462、`closeoutDeltaBytes` 注释过时）；③ **前向义务未登记**（v4-3 须复算首屏合计上限的前提）；④ **覆盖强度/死路径**（`stream-merge` seq 去重、空态 dual-source、`patchAiCard` 不可达、RP 函数误名）。它们不改变「安全语义成立、红线零破、门禁全绿」的事实判定，但按「有条件通过」处理：**建议先处理 I-01~I-05（五条中severity）再进入 `@sddu-validate`**；I-06~I-12 可随 v4-3 顺手收口。

## 9. 状态文件关联提醒（§8.2）

本叶 `state.json` 本轮由 review Agent 更新：`phase: builded → reviewed`，`workflow: 5.build → 6.review`，`agent: sddu-build → sddu-review`，`files` 补 `review`/`reviewReport`，`phaseHistory` 追加 `reviewed` 条目（`updatedAt` 同步）。**注意**：本 Agent 无 `sddu_update_state` 工具，此次为**直接编辑**该 JSON；若状态机有权威口径，请以状态机复算为准。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：C1~C8 逐项结论；AC 逐条映射；I-01~I-12 改进项（中 5 / 低 7）；0 阻塞 / 8 项中 3 通过；红线零改动复跑原文；8 项门禁本机复跑原文；metafile/台账独立复算；未验证项如实登记；结论 ⚠️ 有条件通过 | 2026-09-19 | SDDU Review Agent |
