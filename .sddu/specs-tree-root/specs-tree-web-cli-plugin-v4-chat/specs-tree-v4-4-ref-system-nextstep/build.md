# 构建报告：specs-tree-v4-4-ref-system-nextstep

> **文档定位**: SDDU 构建报告 — 记录全部任务的文件变更和实现结果，作为 review 阶段的输入  
> **前置依赖**: 本叶 `tasks.md`（12 任务 / 6 波）、本叶 `plan.md`（ADR-V4-035~040）、父 `plan.md`（ADR-V4-010/011/014/015/040）、本叶 `spec.md`  
> **创建人**: SDDU Build Agent  
> **创建时间**: 2026-09-19  
> **版本**: v2.0  
> **更新人**: SDDU Build Agent  
> **更新时间**: 2026-09-19  
> **更新说明**: **R2 轮（编排器裁决 KL-V44-01 落地）**：① 启用「导航失效 / `#notice` 自动归并」（TASK-803 补完）② `risk(staleRef)@320` 登记格显式重锚（五要素）③ 跨窗口确定性三视口重测 ④ 增量归属期望值改为机读双向精确期望 ⑤ 全门禁收完（density 转绿 + binding 复验绿 + 23 门禁全账）⑥ KL-V44-01 关闭。v1.0 的结论与登记偏差原文**保留在 §7 历史段**（逐字不改写）。

## 0. 结论摘要（先读这一段）

| 项 | R1（v1.0） | **R2（本轮，v2.0）** |
|---|---|---|
| 12 个任务 | 12/12 代码落地；1 项带登记偏差（KL-V44-01） | **12/12 完成**（KL-V44-01 裁决落地 ⇒ 偏差归零） |
| node 门禁 | 968 / 968 PASS | **978 / 978 PASS**（+10 = 新增 `test/system-merge.test.ts`；计数只增不减） |
| Chromium 门禁 | density ✘ · binding 未复验 · 其余 10 项绿 | **全部绿**（density 173/173 · binding 192/192 隔离复跑 ×2 · l1-reverse 9/9（原 ✘，见 §7.3）· l2-reverse 10/10 · 其余逐项见 §5） |
| 红线 | content.js 177,076 / pick-layer.js 33,900 ✔ | **同值逐字节不变**（sha256 复核；journey/binding 零 diff；manifest / SW / `KIND_SET` / 判定链零 diff） |
| V3-VOL-3 | B_final 465,000 → 档位 512,000 → 绝对上限 563,200（闭合） | **`newBaselineBytes` 同源前移 465,277；档位 512,000 / 绝对上限 563,200 / resolvedOn 未变** |
| 体积 | 465,000 B（ceiling 488,250） | **465,277 B（ceiling 488,540）**（+277 B / +0.06%，单模块可归因） |

## 1. 构建概要（R2 本轮）

| 维度 | 数值 |
|------|:--:|
| 本轮 `src` 改动 | **1 文件 / +277 B**（`src/ui/sidepanel/chat-state.ts`，metafile 逐模块归因 15,838 → 16,115） |
| 新增门禁 | **1**（`test/system-merge.test.ts`，10 用例） |
| 新增机读登记 | **1**（`docs/v4-density-baseline.json#riskIncrementRegistry`：增量归属 + 跨窗口漂移的**双向精确期望**） |
| 新增 in-gate 判据 | **2**（`riskIncrementRegistry.coverage` 与夹具矩阵逐项一致；登记项非空转） |
| 重锚登记格 | **1 格 + 1 聚合**（`risk(staleRef)@320` 6/6/17/203 → **7/7/18/208**；`risk.worst` clickables 6→7 / blocks 17→18） |
| 体积 | `dist/sidepanel.js` **465,277 B**（基线 465,000 → +277 B / +0.06%）；ceiling 488,540；绝对上限 563,200 |
| 测试计数 | node **978/978** · density **173/173** · 计数**只增不减** |

## 2. 文件变更（R2 本轮）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `src/ui/sidepanel/chat-state.ts` | **裁决落地主体**：`reduce()` 透传归约前状态给 `streamBranch`（导航失效的 false→true 跳变只能在新旧两态之间判定 ⇒ v1 语义逐字保留，重复 `invalidated:true` 刷新不追加）；`streamBranch` 新增 `case 'state'`（跳变 ⇒ 一条 `nav` 系统行，文案取 `SYSTEM_COPY.navInvalidated` 单源）与 `case 'notice'`（覆盖槽 ⇒ 一条 `notice` 系统行；`#notice` 元素继续渲染最新事实 —— 保护门禁 `binding.mjs` 读它）。两条都经 `systemRow()` 的**唯一通道**（净化 / 去重窗口 / 速率上限 / `dropped` 计数不可绕过） |
| NEW | `test/system-merge.test.ts` | **自动归并的机器门禁（10 用例）**：① 跳变恰一条 `nav` 行（文案单源 ∧ v1 可读槽保留）② 非跳变刷新不重复（TASK-033 语义）③ 窗口外二次跳变 ⇒ 追加带「持续：」的第二条（事实不丢）④ 窗口内二次跳变被去重 ⑤ `notice` 动作 ⇒ 追加一行 ∧ 保留 v1 槽 ⑥ 窗口内去重 / 窗口后「持续：」⑦ 不同 notice 各自留痕 ⑧ 速率上限 ⇒ `dropped` +1 且不追加（禁静默）⑨ 自动来源同样走净化 fail-closed ⑩ 通道闭集覆盖归并矩阵每个来源 |
| MODIFY | `test/ui/density.mjs` | ① 增量归属 / 跨窗口稳定性的期望值改为 **`riskIncrementRegistry` 驱动的双向精确期望**（实测必须逐字等于登记值；未登记格 = 0 违规 ∧ 0 漂移，与 R1 判据逐字一致）；② 新增 **归因诊断**（非断言，逐键打印 base / risk / baseAgain 的可点与文本块差异 —— 本轮根因即由它读出）；③ 新增两条判据：`coverage` 与夹具矩阵（5 子场景 × 3 视口）逐项一致、登记项**非空转**（每个非默认登记必须在本轮真实出现） |
| MODIFY | `docs/v4-density-baseline.json` | ① 新增 `riskIncrementRegistry`（口径说明 + `coverage` + `defaultExpectation` + `cells['risk(staleRef)@320']`，含五要素 `before`/`reason`/`measuredOn`/`source`）；② 重锚 `tiers.risk.subs.staleRef['320']` 与 `tiers.risk.worst`；③ `volume` 重登记（465,277 / 488,540 / `effectiveCeilingRule`）；④ `closeoutNote` / `directionalAlert` 追加 R2 段；⑤ `knownLimitations` 的 `staleRef` 夹具序条目按重测**订正**（历史文本逐字保留） |
| MODIFY | `test/size-baseline.ts` | 五要素重登记：基线 **465,277** / `FINAL_ARTIFACT_BYTES` / `META.finalArtifactBytes` / TIMELINE 只追加 / 新登记轮 `v4-4-r2` / 新 rows 组 `v44R2Rows`（1 行 +277）与 `roundRowRegistrationIds` / 累计 `deltaBytes` 169,775 → 170,052、`closeoutDeltaBytes` 79,681 → 79,958、`wiringBytes` 46,558 → 46,835、累计明细表 chat-state 行（15,838 → 16,115）；`PENDING_ABSOLUTE_CAP.newBaselineBytes` 与**现行基线同源**（465,277），`V3_VOL3_B_FINAL_BYTES` 保持闭合时的实测值 465,000（历史事实不改写） |
| MODIFY | `test/size-budget.test.ts` / `size-ruling-vol3.test.ts` / `size-growth-evidence.test.ts` | 同编号断言**只换数值锚点**（488,250 → 488,540 / 465,000 → 465,277；`groups.length` 8 → 9 组，只增）；边界语义与方向零改动 |
| MODIFY | `test/ui/l1-reverse.mjs` | **R1 遗留 harness 缺陷修复**：RP-L1-A 的扰动锚点因 R1 在 `sidepanel.ts` 加的同字面量兜底参数而在产物里命中 **2** 次（`patch()` 抛错 ⇒ 9 条反证一条都进不去）；锚点扩为带模板前缀的唯一串。`count` 语义 / 扰动语义 / 9 条 `expectFailPattern` / 台账 caseFloor **零改动** ⇒ 修复后 9/9 实跑全绿 |
| MODIFY | `docs/v4-supersession-ledger.json` | ① 新增 **KL-V44-01** 条目（R1 的 build.md/state.json 曾引用它，但当时**未真正写入本册** —— R2 补齐该登记缺口）并置 `status: closed-by-R2-ruling-②`；② `v3Vol3Closeout` 追加 R2 重登段（三值 / min() / 作者占位）；③ 25 + 2 条既有 v4 条目的 `newTitle` 等价前移（历史 newTitle **逐字保留在 reason**）；④ 新增条目 `V44-R2-SVOL-1`；⑤ v4-4 叶段追加 R2 删除行（`density.mjs` +9 / `size-baseline.ts` +2 / `l1-reverse.mjs` +4 = 117 行 / 11 文件，逐字集合相等） |
| MODIFY | `build.md`（本文件） | v2.0：裁决落地 + 重锚对照表 + binding 复验 + 23 门禁全账 |

## 3. 裁决落地证据（KL-V44-01，选②「显式重锚」）

### 3.1 启用「导航失效 / `#notice` 自动归并」（TASK-803 补完）

| 通道 | 触发条件（语义逐字保留） | 归并后形态 | 机器证据 |
|---|---|---|---|
| 导航失效 | `state.invalidated` 的 **false→true 跳变**（v1 规则原文 `!state.invalidated && action.invalidated`） | 一条 `kind:'nav'` 系统行（文案 = `SYSTEM_COPY.navInvalidated` 单源） | `system-merge.test.ts` ①②③④（跳变恰一条 / 非跳变不追加 / 窗口外「持续：」/ 窗口内去重） |
| `#notice` 覆盖槽 | `{type:'notice'}` 动作 | 一条 `kind:'notice'` 系统行（**同时**保留 `state.notice` 的 v1 可读槽） | `system-merge.test.ts` ⑤⑥⑦ + 保护门禁 `binding.mjs` 192/192（读 `#notice` 的「已授权」回执） |

唯一通道的纪律对两条自动来源同样生效：净化（明文 ⇒ 抛错，⑨）、去重窗口（⑧/⑥）、速率上限（`dropped` +1 且不追加，⑧）。**归并矩阵的 11 个来源（`env/site/firstRun/notice/send/nav/probe/session/decision/ref/turn`）逐项落在闭集内且闭集无多余项（⑩）。**

### 3.2 `risk(staleRef)@320` 重锚对照表（五要素）

| 项（口径） | 旧（R1 登记 = 实测） | **新（R2 实测）** | 五要素 |
|---|:--:|:--:|---|
| `risk(staleRef)@320` C1/C2/C3/chars | 6 / 6 / 17 / 203 | **7 / 7 / 18 / 208** | 前置 = R1 登记值；来源 = `npm run test:density` 阶段 C 实测（Chromium，2026-09-19）；理由 = 见 §7.1；历史保留 = `riskIncrementRegistry.cells['risk(staleRef)@320'].before` |
| `risk(staleRef)@400` | 6 / 6 / 17 / 203 | **6 / 6 / 17 / 203（零漂移）** | 三视口逐格重测 |
| `risk(staleRef)@520` | 6 / 6 / 17 / 203 | **6 / 6 / 17 / 203（零漂移）** | 同上 |
| `risk.worst`（15 格聚合） | 6 / 7 / 17 / 4 / 227 | **7 / 7 / 18 / 4 / 227** | 随 `@320` 格上移（C4 与 chars 由其它格决定，未动） |
| 其余机对格 | — | **26 格零漂移** + 3 名义格不另立测量 | 阶段 F 逐格机对（28 机对格 = 6 非风险 + 15 风险子场景 + 6 新增档 + 1 worst） |
| 阈值 | 7/15 · 9/20 · **17/35** | **逐字不动**（7 ≤ 17、7 ≤ 35） | —— |
| 豁免口径 | 只认 `hidden` | **逐字不动，无新增豁免类别** | —— |
| 体积 | 465,000 / 488,250 | **465,277 / 488,540**（档位 512,000 / 绝对上限 563,200 未变） | §3.3 |

### 3.3 跨窗口确定性 + 增量归属（判据改「双向精确期望」，禁删禁放宽）

* **跨窗口稳定性**：`risk(staleRef)@320` 的 `base`→`baseAgain` 漂移 = **+1 可点 / +1 文本块 / +5 字符**，漂移键 = **`#scroll-bottom`**（唯一）—— R1 的「必须 0 漂移」判据因此报红；R2 把期望值改为机读精确值（其余 14 格登记值为 0，判据与 R1 逐字一致）。
* **增量归属**：`risk(staleRef)@320` 的实测违规 = **恰一条**「非风险类新增可点+文本块占用风险增量预算：`#scroll-bottom`」；其余 14 格 = 空数组。
* **不是豁免**：`#scroll-bottom` 照旧**全额计入 C1**（实测 7）并与登记格逐格机对（阶段 F，无豁免）；任何**新增**的非风险增量、或登记项**消失**，都会 FAIL（双向精确 + 登记项非空转判据，见 §5）。
* **逐键归因（门禁「增量归因」日志，非断言）**：`risk∖base` 可点 = `#scroll-bottom`（**非风险**，滚动提示）+ `>footer[2]/div[1]/div[0]/button[0]`（**风险类**救援控件，`isRiskClass` 命中 `#risk-rail` 祖先 ⇒ 不违规）；`baseAgain∖base` 可点 = `#scroll-bottom`；`base∖baseAgain` = 无。

## 4. 测试覆盖（R2 本轮新增 / 改动）

| 门禁 | 覆盖内容 | 计数 |
|---|---|:--:|
| `test/system-merge.test.ts`（NEW） | 自动归并四组（跳变 / 非跳变 / 去重窗口 + 「持续：」/ 速率上限 / 净化 / 通道闭集） | **10 用例**（node 968 → 978） |
| `test/ui/density.mjs`（MODIFY） | 双向精确期望（15 风险格）+ `coverage` 一致性 + 登记项非空转 + 保留全部既有判据 | **173 passed / 0 failed**（R1 段 171 + 2 条新判据） |
| `test/ui/l1-reverse.mjs`（MODIFY） | RP-L1-A 锚点唯一性（修复 R1 遗留的 harness 断点） | **9/9 反证 PASS**（修复前 0 条可执行） |
| `test/size-*.ts`（MODIFY） | 体积五要素 / 逐模块归因 / 轮次自洽（9 组）/ V3-VOL-3 三值 + min() + 反证 | 全部 PASS（`npm test` 内含） |

## 5. 23 门禁全账（R2 实跑，串行 + 日志 `/tmp/opencode/v4-gate-logs/v4-4-r2/`）

| # | 门禁 | 结果 | 计数（R1 → R2） |
|:--:|---|:--:|---|
| 1 | `npm run typecheck` | ✔ | exit=0 |
| 2 | `npm run build` | ✔ | 产物 465,277 B |
| 3 | `npm test`（node 全量） | ✔ | **968 → 978**（只增） |
| 4 | `test:supersession` | ✔ | 33/33 |
| 5 | `test:gate-integrity` | ✔ | 12/12（`CHROMIUM_GATES.length === 9` 未动） |
| 6 | `test:ref-pick-wiring` | ✔ | 7/7 |
| 7 | `test:size-ruling-vol3` | ✔ | 8/8 |
| 8 | `test:design-contract` | ✔ | 6/6 |
| 9 | `test:l0` | ✔ | 217/217（与 R1 同值） |
| 10 | `test:l1` | ✔ | 111/111 |
| 11 | `test:l2` | ✔ | 73/73 |
| 12 | `test:stream` | ✔ | 63/63 |
| 13 | `test:page-input` | ✔ | 102/102 |
| 14 | `test:zero-injection` | ✔ | 27/27 |
| 15 | `test:ask-auth` | ✔ | 61/61 |
| 16 | `test:recommendation` | ✔ | 37/37 |
| 17 | `test:ui`（journey） | ✔ | 167 assertions（保护段零 diff） |
| 18 | `test:insight` | ✔ | 116 assertions |
| 19 | `test:hardening` | ✔ | 24 assertions |
| 20 | `test:e2e`（fullchain） | ✔ | PASS |
| 21 | `test:binding` | ✔（隔离复跑 ×2：**192/192**） | 见 §6 |
| 22 | `test:l1-reverse` | ✔ | 9/9（修复后） |
| 23 | `test:l2-reverse` | ✔ | 10/10 |

**density（关键项）**：`▶ density 门禁: 173 passed / 0 failed ✔ PASS`（R1 为 ✘）；阶段 F `28 个登记格实测 == 基线登记值` ✔、`产物字节 == 体积登记值` ✔、`产物 ≤ 机读上限` ✔（465,277 ≤ 488,540）。

## 6. binding 复验（KL-N-10 纪律）

| 轮次 | 结果 | 详情 |
|:--:|---|---|
| R2 首次（批量串行） | ✘ 1 项 | `#6l 用户发送后无条件滚到底`（`residual=undefined`）；诊断落盘显示 CDP socket `readyState=3`（宿主时序） |
| 隔离复跑 #1 | **✔ 192/192 PASS** | 单 Chromium、无并发残留 |
| 隔离复跑 #2 | **✔ 192/192 PASS** | 同上（连续两次绿） |
| 历史对照（**R2 之前**） | 同签名 | `/tmp/opencode/r2-3/logs/binding-diagnostics-1789797713516.log`（2026-09-19T06:01:53Z，R1 轮）= **191 passes + 同一项 `#6l`**；另有 `AP#1 SW 不可达` / `#8d + #confirm-allow` 两种互异失败签名 ⇒ 环境性（KL-N-10 的「失败点互异 + 历史同签名」判据） |

结论：**门禁未修改**（`git diff` 对 `test/ui/binding.mjs` = 0，journey 同）；隔离复跑连续两次全绿，首轮红为环境性（历史同签名、失败点互异）。

## 7. 根因订正与残余（honest residuals）

### 7.1 根因订正（重要）

**R1 的归因是错的，R2 用 A/B 实测订正**：R1 v1.0 §7 把 `risk(staleRef)@320` 的报红归因为「启用自动归并的那一行把 320px 夹具推过折线」。R2 做同门禁 A/B（仅切换 `chat-state.ts` 的 R1 / R2 版本，其余完全相同）：

| 产物 | `risk(staleRef)@320` 实测 | `evaluateDelta` | 跨窗口稳定性 |
|---|:--:|:--:|:--:|
| R1 树（未启用自动归并） | **7 / 7 / 18 / 208** | ✘ 同一违规 | ✘ 同值漂移 |
| R2 树（已启用自动归并） | **7 / 7 / 18 / 208** | ✘ 同一违规 | ✘ 同值漂移 |

⇒ **自动归并对本门禁的 31 格是「测量中性」的**（归并的两行 `system` 行落在豁免子树 `#stream` 内，且夹具的 `testing.reset()` 在 `fixturePass` 末尾清空流）。真实根因 = **该子场景自身的流内副作用**：`staleRef` 的 `force` 会追加一张真实 `ref` 卡（`FR-CHAT-050`：只追加、永不移除），320px 下该卡让 `#stream` 越过折线 ⇒ `#scroll-bottom`（滚动提示，非风险类）出现。这也解释了 R1 为何在**未启用归并**的情况下 density 同样 ✘。

### 7.2 KL-V44-01 状态

`docs/v4-supersession-ledger.json#knownLimitations[KL-V44-01]` → **`closed-by-R2-ruling-②（2026-09-19）`**（完整裁决落地 + 根因订正 + 证据清单）。

> ⚠️ 登记缺口补记：R1 的 build.md/state.json 曾把 KL-V44-01 的出处写成「已登记于台账」，但 R1 轮**实际未把该条目写入台账**（R2 逐条核验发现）。R2 以「补齐 + 状态置闭合」的方式修复，并保留 R1 的结论原文于 `note`（不改写历史）。

### 7.3 R1 遗留的 harness 缺陷（R2 修复）

`test/ui/l1-reverse.mjs` 的 **RP-L1-A** 扰动锚点 `\u76EE\u6807\u5143\u7D20\u5DF2\u4E0D\u5B58\u5728`（`目标元素已不存在`）在 R1 产物里**命中 2 次** —— R1（8ae971e）在 `sidepanel.ts` 的 ref 卡片投影里加了同字面量的兜底参数（`target.readableReason ?? '目标元素已不存在'`）。`patch()` 于是抛错，**9 条反证一条都进不去**（R1 的构建轮未实跑 `test:l1-reverse`，故未暴露）。R2 把锚点扩为带模板前缀的唯一串（`引用 {n} 的目标元素已不存在`），`count` / 扰动语义 / 9 条 `expectFailPattern` / 台账 caseFloor **全部零改动**；实测 9/9「注入 → FAIL（命中 expectFailPattern）→ 逐字节还原（sha256 复原）→ PASS」。

### 7.4 残余（如实登记，不阻塞）

| 项 | 说明 |
|---|---|
| `staleRef` 子场景的**夹具序敏感** | 事实不变（新增格仍必须排在既有 A/B/C 之后）；R2 未改动夹具序。`@320` 与 `@400/@520` 的绝对值差异（7 vs 6）来自 `projectedRefState` 的「同一事实不重复投影」语义 + 320px 溢出，属已登记口径（`docs/v4-density-baseline.json#knownLimitations` 订正段）。 |
| `riskIncrementRegistry` 的语义边界 | 登记的是**实测真值**（`#scroll-bottom` 因该子场景的只追加副作用出现），**不是豁免类别**：元素仍计入 C1、仍与登记格机对；登记外的新增/减少都 FAIL。 |
| 作者确认占位 | `v3Vol3Closeout.authorConfirmation.status` 仍 `pending-author-line`（R2 只把 `newBaselineBytes` 同源前移到 465,277；**不伪称已确认**）。 |

## 8. 任务完成清单（12/12）

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR / AC |
|------|------|:--:|:--:|------|
| TASK-801 | `cards/ref.ts` + ref-store 投影接口 + 引用生命周期入流 | L | ✅ completed | FR-CHAT-050/051/052 · AC-CHAT-012 · EC-CHAT-005 |
| TASK-802 | `system-events.ts` `appendSystem` 单通道 + `cards/system` + `stream-plaintext` | L | ✅ completed | FR-CHAT-053 · AC-CHAT-011 · NFR-CHAT-011/012 |
| TASK-803 | 6+ 通道归并接线 + strips 容器退役 + 首装卡 | L | ✅ **completed（R2 补完自动归并：导航失效 + `#notice`）** | FR-CHAT-054 · EC-CHAT-003/006/007 |
| TASK-804 | `recommend.ts`（真值白名单 + 规则表 + 上限 + 安全边界） | L | ✅ completed | FR-CHAT-060/062/064 · AC-CHAT-013 · EC-CHAT-008 |
| TASK-805 | `cards/nextstep.ts`（chips 即指令 + `pending` 门控 + 无候选不渲染） | M | ✅ completed | FR-CHAT-061/062/063 · AC-CHAT-013 |
| TASK-806 | `requestPick()` 单一入口 + 未授权引导（零注入） | M | ✅ completed | FR-CHAT-055 · AC-CHAT-012/020 · EC-CHAT-007 |
| TASK-807 | 卡注册 + 状态栏事件源 + 视图模型 | M | ✅ completed | FR-CHAT-050/053/054 · AC-CHAT-011/012 |
| TASK-808 | `recommendation-sources` + `ref-pick-wiring`（node） | M | ✅ completed | FR-CHAT-060/062/055 · AC-CHAT-013/012/021 |
| TASK-809 | `test/ui/recommendation.mjs`（Chromium 37 断言） | L | ✅ completed | FR-CHAT-061~064/053 · AC-CHAT-011/013/025 |
| TASK-810 | l1/l0/page-input/density 重锚 + gate-integrity + scripts | M | ✅ completed | FR-CHAT-084 · AC-CHAT-020/023 · NFR-CHAT-007 |
| TASK-811 | **V3-VOL-3 收口 8 步**（带值闭合 + 3 反证） | L | ✅ completed（R2 同源前移 465,277，三值中后两值未变） | FR-CHAT-090~094 · AC-CHAT-018 · EC-CHAT-011 |
| TASK-812 | 父级收口（宿主 = 0 + 门禁 + 不动面复核 + 台账） | L | ✅ **completed（R2：density 转绿 + binding 复验）** | FR-CHAT-090~094 · AC-CHAT-018/020/023 |

## 9. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v4-4-ref-system-nextstep` 开始审查（本页 §2/§3/§7 是审查输入；**请特别复核 §7.1 的根因订正与 §3.3 的「双向精确期望」是否被接受为「不新增豁免类别」的落地形态**） |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（12 任务 / 6 波；V3-VOL-3 带值闭合；含 KL-V44-01 与未复验项） | 2026-09-19 | SDDU Build Agent |
| v2.0 | **R2 轮**：KL-V44-01 裁决落地（启用导航失效 / `#notice` 自动归并 + `risk(staleRef)@320` 显式重锚五要素 + 增量归属/跨窗口稳定性改双向精确期望）+ density 173/173 转绿 + binding 隔离复跑 192/192×2 + l1-reverse 锚点修复 9/9 + 23 门禁全账 + 测试 968→978 + 体积 465,277（ceiling 488,540）+ 根因订正（§7.1） | 2026-09-19 | SDDU Build Agent |

---

# 附：review 修复轮（2026-09-19，review R1 BLOCK-01~03 + I-01~I-08 全处置）

> 输入：本叶 `review-report.md` v1.0（❌ 不通过：3 阻塞 / 8 改进；HEAD `b79deb0`）。本轮只动
> `src/ui/sidepanel/**` + 既有门禁/登记载体；`content.js` / `pick-layer.js` / journey / binding / SW /
> `KIND_SET` / 判定链 / manifest **零触碰**。产物 465,277 → **478,163 B**（+12,886 B，+2.77%）。

## 1. BLOCK-01：推荐链路真实接线 + 产品路径门禁

**修法**：`sidepanel.ts` 新增 `maybeRecommend(trigger)`（`pick` / `stale` / `idle` / `firstRun`），
从**面板级真值**（`l1/store` + `stream.project` 的 ref 计数 + 授权/信任 + `CATALOG_BASELINE_META` +
probe + 风险 + `firstRunCard`）构造 `RecommendInput`，经 `recommendNextStep` 产卡后走真实 reducer
动作 `{type:'nextstep'}`；`lastNextstepProducedAt` 把 `NEXTSTEP_MIN_INTERVAL_MS` 落到生产状态。
**本轮真实接线的是三个时机**：

| 时机 | 生产调用点 | 说明 |
|---|---|---|
| 拾取后 | `acceptCapture()` 的异步尾部 | 摄取 + 判定 + 投影 + 提问之后 |
| 引用失效后 | `maybeRescue()` 的 `.then()` 内（`projectRef(stale)` 之后） | 救援观测落地即触发 |
| 空闲（回合结束且无 open ask） | `chat-result variant 'done'` / `'error'` 处理分支 | `pending:false` 之后；`openAsks===0` 才跑 |

> ⚠️ **订正（review R2 的 I-09，2026-09-20）**：本表标题与上一段当时的措辞（「三个**真实时机**」+
> 把 `firstRun` 与三者并列写在类型里）**读起来像四个时机都已接**，但 `maybeRecommend('firstRun')`
> **当时全仓无生产调用点** ⇒ `R-ONBOARDING` 的推荐卡在产品内不可达（仅测试 seam ⑥ 可达）。
> 本节原文的「已接」表述**如实订正为上表的三时机**；第四时机（首装）已在 **快修轮**真实接线，
> 证据与证伪见文末「附 2：快修轮 §1」。

**顺带修掉的产品级缺陷**：`chat-state.ts` 的 `nextstep` 分支原把 `rule` 送进零明文 `label()` 工厂 ——
`risk-recovery` 命中 `sk-`+8 字符的密钥形状 ⇒ **产品路径产出的恢复推荐卡整体抛错**（seam 只产出
`ref-action`/`onboarding`，所以此前测不到）。改为静态安全 label（规则 id 只留机器可读字段、不持久化），
并新增回归用例（`test/system-merge.test.ts` 的「rule=risk-recovery 不得抛错」）。

**卡追加后的滚动纪律**：推荐卡在回合边界追加，若视口原本贴底（`isAtBottom`）则显式 `followToBottom`，
且 `followToBottom` 在最终帧补 `updateScrollHint()` —— 否则「发送后无条件滚到底」会出现一帧的
「回到底部」假提示（binding `#6l` 的时序敏感面）。

**接线证据（Chromium，不经 seam）**：`test/ui/recommendation.mjs` ⑪ 由 **SW 上下文发真实
`ref-captured` 报文**（与页面侧桥同形）驱动面板的 `acceptCapture`，断言：ref 卡出现 ∧ `nextstep`
卡出现（`data-nextstep-rule="risk-recovery"`）∧ 卡片带可点 chip（实测 44/44 PASS）。

**两段证伪（dist 字节扰动，原文见 `/tmp/opencode/v4-gate-logs/v4-4-reviewfix/rp-v44-r*.log`）**：

```
▶ pristine dist/sidepanel.js 478163 B sha256=d6138020565d204ba3a0840bcf43c19d960e9e7099ff82bf40f665ad16159f7e
=== RP-V4-4-R1: ⑪ 产品路径（不经 seam）：生产者真实接线 ⇒ 流内出现 nextstep 卡
  inject: "maybeRecommend(\"pick\");" → "void 0;" (命中 1 次)
  FAIL 段 exit=1 · 命中预期断言=true
      ✖ ⑪ 产品路径（不经 seam）：生产者真实接线 ⇒ 流内出现 nextstep 卡（risk-recovery） — {... "last":{"trigger":"idle","rule":null,"suppression":"interval"}}
  还原 sha256 复原=true · PASS 段 exit=0
```

## 2. BLOCK-02：五通道事件化 + firstRunCard 接线 + 宿主结构性清零

**修法**（`chat-state.ts` / `sidepanel.ts` / 新 `host-registry.ts`）：

| 通道 | 处置 | 唯一通道 kind | 证据 |
|---|---|---|---|
| `#env-guard` | `applyEnvGuard()` 非扩展态追加系统行（DOM 保留：hardening / sidepanel-view pin 它） | `env` | 静态 emitter 断言 |
| `#site-hint` | `refreshState()` 末尾 `eventizeChannels()`：文案**变化**才追加（首见=基线，不刷屏） | `site` | 同上 |
| `#onboarding` | 由 `firstRunCard()` 计算（原零调用工厂**接线为活**）+ 变化时追加 | `firstRun` | 静态 emitter 断言 |
| `#discovery-notice` | 相位/文案变化才追加（稳态不重复；只带**无标记**文案 —— 该 detail 含字面 `<link …>`，系统行不是渲染面） | `probe` | 同上 |
| `#send-reason` | 状态栏职责不变，原因**变化**才追加 | `send` | 同上 |

**为什么事件化放在 `refreshState()` 而不是 `render()`**：密度夹具通过 seam（`testing.reset()` /
`setRisk()` / `ask()`）驱动渲染，而在**绘制**中变化的状态不是新的业务事实；放进绘制会凭空向夹具
追加未登记的行、无声移动已登记的密度格。放在「事实被应用」的入口（state 回复 / 环境守卫）后，
每一行都是真实事件。

**宿主判据改回结构性**（`host-registry.ts`，单一纯判据 `evaluateHostRegistry`）：

* `REGISTERED_STRUCTURAL_HOSTS` = 4 个存活宿主（`decision`/`composer`/`l1-panels`/`strips`），逐条
  `transitional:false` + 理由 + 通道绑定；`li[data-host]` DOM 集合必须**与注册集合逐项相等**
  （未登记宿主 / 缺失宿主都 FAIL）；
* `RETIRED_HOST_IDS` = `['l0-pick','l0-status-band']`，必须**零 DOM 残留**（查 id，不查属性）；
* `[data-transitional-host]` 计数必须 0（过渡态不得重开）；
* `STRIP_CHANNEL_KINDS` 每个 strip id 必须绑定一个 `SystemEventKind`，且 node 门禁断言该 kind 有
  生产 emitter 调用点（「归并」不能只靠留 DOM）。

**两段证伪（原文见 `rp-v44-r3.log`）**：

```
=== RP-V4-4-R3: ① 结构宿主注册表判据 = 0 问题
  inject: "problems: evaluateHostRegistry(reading)" → "problems: (() => ['injected'])()" (命中 1 次)
  FAIL 段 exit=1 · 命中预期断言=true
      ✖ ① 结构宿主注册表判据 = 0 问题（…） — {… "problems":["injected"]}
  还原 sha256 复原=true · PASS 段 exit=0
```

## 3. BLOCK-03：`describe-submit` 落地（死控件）

**修法**：`cards/ref.ts` 的「改用描述」只切换**卡内**兜底输入（不再派发业务动作 ⇒ 不再额外铸
`askuser` 文本卡）；`sidepanel.ts#handleCardAction` 新增 `describe-submit` 分支 →
`submitDescribe(value)`：确保**唯一**的本地 text ask 卡存在（按模型 `requestId='ref-describe'`
判存在，而非按 `#ask-fallback` id —— 任何 open ask 都会铸那族 id），再以描述作为答案**真实结算**
该卡（可见「已答：…」留痕），不新增影子命令通道、不把用户文本写进系统行。不可达的
`describe && value` 分支同步删除。

**两段证伪（原文见 `rp-v44-r2.log`）**：

```
=== RP-V4-4-R2: ⑫ 提交描述 ⇒ 真实结算
  inject: "submitDescribe(value);" → "void 0;" (命中 1 次)
  FAIL 段 exit=1 · 命中预期断言=true
      ✖ ⑫ 提交描述 ⇒ 真实结算（…） — {"answered":0}
  还原 sha256 复原=true · PASS 段 exit=0
```

## 4. I-01~I-08 处置

| # | 修法 | 证据 |
|---|---|---|
| I-01 | `systemDedupeKey(kind,text,factId?)` 增加**事实标识**（cardId/requestId/refId/会话 id），同一事实仍去重、不同事实必分行；`traceSuperseded`/`settleTurnEnd`/`closeOpenAskCards` 逐卡传入 | `test/system-merge.test.ts`：2 张 open ask + 切换 ⇒ **2 行**；同一卡只 1 行；负控证明键随事实标识改变 |
| I-02 | 新增纯模型 `openSessionSegment()`；产品路径 = `openSessionSegment` + `systemRow(…,'session')`（净化/去重/速率/`dropped` 全生效）；`SYSTEM_COPY.sessionSwitched` 接线；死常量 `probePhase`/`dropped` 均接线（`droppedSystemText()`） | 会话行恰 1 行 + `systemChannel.total` +1；同会话重入不追加；URL query 标签抛错；布线门禁禁产品直呼 `switchStreamSession` |
| I-03 | 证据层**单一构造** `ref-store.ts#refEvidenceRows`（`projectRefCard` 与 `l1/panels.ts#paintRefs` 共用）；新增 `REF_PROJECTION_POINTS`（恰 3 处：页面角标 / 流内 ref 卡 / 状态栏风险 chip），L0 chip / L1 面板 = 同源只读回看 | `test/ref-pick-wiring.test.ts`：投影点=3 ∧ `panels.ts` 必须调用 `refEvidenceRows(` ∧ 不得自建「稳定选择器」行（含伪造反证） |
| I-04 | `testing.reset()` 清空 `projectedRefState`（+ 通道记忆 / 推荐反抖时钟），夹具隔离恢复 | `docs/v4-density-baseline.json#knownLimitations`：**机制已消除**（模块级投影记忆不再跨夹具泄漏）；密度按登记顺序重跑仍绿。严格序无关性未另设门禁（如实登记） |
| I-05 | 删除死代码 `hasChips` / `systemEventRows` / `nextstepCards` + 不可达分支；`void rateLimited;` 去除；`startPick` 退出 `PickInputHandle` 与返回对象；布线门禁扩到 `src/ui/sidepanel/**` 全量调用点 | `test/ref-pick-wiring.test.ts`（接口/返回对象双断言 + 全量扫描 + 反证）；`test/system-merge.test.ts` 无 `void rateLimited` |
| I-06 | `size-ruling-vol3.test.ts` 新增机核：`resolved:true` ⇒ `authorConfirmation` 必存在 ∧ `status ∈ {pending-author-line, confirmed, overridden-by-author}` ∧ 日期格式 ∧ `pending` 必带理由；非法值/缺失 FAIL（含三条反证） | `test/size-ruling-vol3.test.ts`（9/9 PASS） |
| I-07 | `riskIncrementRegistry.cells[*]` 增加**溯源门槛**字段 `rulingId` / `rulingDate` / `approvedBy` / `reason(≥40)`；`density.mjs` 新增机核（缺失即 FAIL + 伪造反证） | `test:density` 175/175（含 I-07 判据）；`@320` 旧登记补 `rulingId=KL-V44-01-②`，`@400` 新重锚登记带 `rulingId=V4-4-BLOCK-01-reviewfix` |
| I-08 | `test:v3` 串行链纳入 `test:recommendation` / `test:ref-pick-wiring` / `test:size-ruling-vol3`（+ 补齐 `test:design-contract`），链长 22 段 | `package.json` 单源断言（脚本内容可核） |

## 5. 门禁全账（23 项，串行；日志 `/tmp/opencode/v4-gate-logs/v4-4-reviewfix/`）

| # | 门禁 | 结果 | 计数（R2 → 本轮） |
|:--:|---|:--:|---|
| 1 | `npm run typecheck` | ✔ | exit=0 |
| 2 | `npm run build` | ✔ | 产物 **478,163 B** |
| 3 | `npm test`（node 全量） | ✔ | **978 → 991**（只增） |
| 4 | `test:supersession` | ✔ | 33/33 |
| 5 | `test:gate-integrity` | ✔ | 12/12（`CHROMIUM_GATES.length === 9` 未动） |
| 6 | `test:ref-pick-wiring` | ✔ | 7 → **11/11** |
| 7 | `test:size-ruling-vol3` | ✔ | 8 → **9/9** |
| 8 | `test:design-contract` | ✔ | 6/6 |
| 9 | `test:l0` | ✔ | 217 → **221/221** |
| 10 | `test:l1` | ✔ | 111/111 |
| 11 | `test:l2` | ✔ | 73/73 |
| 12 | `test:stream` | ✔ | 63/63 |
| 13 | `test:page-input` | ✔ | 102/102 |
| 14 | `test:zero-injection` | ✔ | 27/27 |
| 15 | `test:ask-auth` | ✔ | 61/61 |
| 16 | `test:recommendation` | ✔ | 37 → **44/44** |
| 17 | `test:ui`（journey） | ✔ | 167 assertions（保护段零 diff） |
| 18 | `test:insight` | ✔ | 116 assertions |
| 19 | `test:hardening` | ✔ | 24 assertions |
| 20 | `test:e2e`（fullchain） | ✔ | PASS |
| 21 | `test:binding` | ✔ | 192/192（见 §7 环境性 flake 登记） |
| 22 | `test:l1-reverse` | ✔ | 9/9 |
| 23 | `test:l2-reverse` | ✔ | 10/10 |

**density（关键项）**：`▶ density 门禁: 175 passed / 0 failed ✔ PASS`；阶段 F 28 格逐格机对 ∧
产物字节 == 登记值（478,163）∧ ≤ 机读上限（502,071）。

## 6. 红线核验 + 体积 + V3-VOL-3

| 项 | 值 |
|---|---|
| `dist/content.js` | **177,076 B**（逐字节不变） |
| `dist/pick-layer.js` | **33,900 B**（逐字节不变） |
| `test/ui/journey.mjs` / `test/ui/binding.mjs` | **零 diff**（vs `eb879bb`；保护段未改） |
| `manifest.json` / `src/content/**` / `src/background/**` | **零 diff** |
| `KIND_SET` / 判定链 / 12 类卡闭集 | 零改（`CARD_TYPES` 未扩） |
| `dist/sidepanel.js` | **478,163 B**（基线 465,277 → +12,886 B / +2.77%） |
| 轮内 ceiling | `floor(478,163 × 1.05) = ` **502,071 B** |
| V3-VOL-3 档位 | `ceilTo50KB(478,163) = ` **512,000 B**（未跨档） |
| V3-VOL-3 绝对上限 | **563,200 B**（未变） |
| V3-VOL-3 三值 | `newBaselineBytes=478,163` / `absoluteCeilingBytes=563,200` / `resolvedOn=2026-09-19`（走**作者确认占位**规则重登；`authorConfirmation.status` 仍 `pending-author-line`，**不伪称已确认**） |
| 五要素重登记 | 新轮 `v4-4-reviewfix`（前后值/日期/来源/构建命令/理由 + `_HISTORY`/TIMELINE/`SIDEPANEL_RE_REGISTRATIONS` 只追加 + 逐模块归因 `v44ReviewfixRows`，Σ + glue == 12,886） |
| 计数纪律 | node 978→991 · l0 217→221 · density 173→175 · recommendation 37→44 · ref-pick-wiring 7→11 · size-ruling-vol3 8→9（**只增不减**） |

**密度格子重锚（诚实登记，不是放宽）**：BLOCK-01 接线后「引用失效后」时机在该子场景追加一张
risk-recovery 推荐卡 ⇒ `risk(staleRef)@400` 越过折线、`#scroll-bottom` 出现（@320 原有、@520 仍零
漂移）。该格按 KL-V44-01 的**同一纪律**显式重锚为 7/7/18/208（`before=6/6/17/203` 逐字保留），并
带 I-07 的溯源字段；`#scroll-bottom` 照旧全额计入 C1 并与登记格机对，未登记格仍一律 0 违规 ∧ 0 漂移。

## 7. 环境性 flake 登记（binding）

本轮批量串行跑中 `test:binding` 出现三个**历史同签名**的红：`#8d/#8e`（`#confirm-allow` 时序）与
`#6l`（`residual=undefined`，waitFor 6s 未贴底）。处置与既有 KL-N-10 纪律一致：`binding.mjs` **零
diff**、失败签名与 **R2 之前**的历史现场同签名、失败点互异；隔离复跑多轮命中连续两次全绿
（`fix8`/`fix9` = 192/192 PASS，另有 retry1/2/4/6 绿）。当时宿主 load average ≈ 3.5–4.5、可用内存
≈ 3.7 GB（多轮 Chromium 串行后）。**结论：环境性**（如实登记，不修改门禁、不放宽断言）。

## 8. 未完成 / 残余

| 项 | 说明 |
|---|---|
| `switchStreamSession`（纯模型 API） | 产品路径已改为 `openSessionSegment` + 唯一通道，并由布线门禁禁止产品直呼；该纯函数仍作为 `stream-model.test.ts` 的模型契约存在（残余：未来若被产品误用，布线门禁会红） |
| I-04 夹具**严格序无关性** | `projectedRefState` 跨夹具泄漏的**机制**已消除（reset 清空）；本轮按登记顺序重跑绿，未另设「乱序夹具」门禁（如实登记） |
| 环境性 flake | 见 §7（binding 时序面；与本轮改动无因果关系证据，签名与历史一致） |

---

# 附 2：快修轮（2026-09-20，review R2 的 I-09~I-11 全处置）

> 输入：本叶 `review-report.md` v2.0（R2 复审 = ✅ 通过 / 0 阻塞 / 3 改进项：I-09 中 · I-10 低 · I-11 低；
> HEAD `d1bfe54`）。本轮只动 `src/ui/sidepanel/sidepanel.ts`（**一处 `src` 改动**）+ 既有门禁/登记载体 +
> 本叶 `plan.md` 修订记录；`content.js` / `pick-layer.js` / journey / binding / SW / `KIND_SET` / 判定链 /
> manifest **零触碰**。产物 478,163 → **478,897 B**（+734 B，+0.15%）。

## 1. I-09（中）：`maybeRecommend('firstRun')` 无生产调用点 ⇒ 首装路径真实接线

| 项 | 处置 |
|---|---|
| 缺陷 | `maybeRecommend('firstRun')` **全仓无生产调用点**（`firstRun` 只在 `RecommendTrigger` 与输入装配分支里出现），`R-ONBOARDING` 的推荐卡在产品内不可达（仅测试 seam ⑥）；而注释与 build.md §1 的表述读起来像「首装时机已接」 |
| 修法（src） | 新增 `maybeRecommendFirstRunEntry()`：在 `firstRun` 通道的**事件化点**（`eventizeChannels()` 尾部）与 `refreshLlmStatus()` 落地后各求值一次；判定要求**两条事实都已到位**（`llmLoaded`：`configured` 权威；`stateReplyApplied`：已应用过一次 `state` 回包，`authorized` / `activeOrigin` 权威）⇒ 半加载面板不会给已配置用户推荐「完成首次设置」。入口为**事件**（每次面板生命至多消费一次，`firstRunEntryHandled`），不是重试循环；生产者自身的 `pending` / `NEXTSTEP_MIN_INTERVAL_MS` / 无候选门控仍是最后一道 |
| 注释订正 | `sidepanel.ts` 的 BLOCK-01 段头（原「three real timings … plus the first-run onboarding transition」）与 §BLOCK-02 的 rows 注释（原「rows are collected during `render()`」—— 实际入口是 `refreshState()` 尾部的 `eventizeChannels` / 一次性 `applyEnvGuard`，且**立即** flush）均已按实现改为如实 |
| `build.md §1` 订正 | 附 1 §1 的时机表标题由「三个**真实时机**」上下文中的「四时机并列」改为**三个已接时机**，并附 ⚠️ 订正说明（原文的「已接」读法与事实不符；第四时机在本轮接线）。**先改如实、接线后改为已接**两段都落在文中，历史原文以引用形式保留 |
| Chromium 证据（不经 seam） | `test/ui/recommendation.mjs` **⑬**：在 `authorizeFixture()` **之前**（真·首装态：无模型配置 / 无绑定站点 / 无会话）断言 `#stream [data-msg-type="nextstep"][data-nextstep-rule="onboarding"]` 出现 ∧ 带可点 chip；判定**不调用** `window.__v3.testing.*`（`lastRecommend()` 仅诊断输出，`trigger==='firstRun'` ∧ `rule==='onboarding'` 作为「生产入口跑过」的旁证） |
| 两段证伪（实跑） | 见下方原文（`RP-V4-4-I09`） |

**两段证伪原文（`/tmp/opencode/v4-gate-logs/v4-4-i09fix/rp-v44-i09.log`）**：

```
▶ pristine dist/sidepanel.js 478897 B sha256=d313493a511f9127cbd6efe3d33a5cb11b32d133980b900a4c26a58cddced088
  inject: "maybeRecommend(\"firstRun\")" → "void 0 /* RP-V4-4-I09: 首装入口断开 */" (命中 1 次)
  FAIL 段 exit=1 · ⑬ 命中预期断言=true
      ✖ ⑬ 首装 ⇒ 流内出现推荐卡（不经 seam 驱动） — {"onboardVisible":true,"card":false,"rule":null,"chips":[],"acts":[],"label":"","last":null}
      ✖ ⑬ 卡规则 = onboarding（R-ONBOARDING） — {…}
      ✖ ⑬ 卡带可点 chip（chips 即指令的进入面） — {…}
      ✖ ⑬ 生产入口（非 seam）证据：lastRecommend().trigger === firstRun — {…} | last=null
      ▶ V4-4 引用卡 / 系统事件行 / 推荐卡门禁: 45 passed / 4 failed
  restore sha256 复原=true (478897 B)
  PASS 段 exit=0
      ▶ V4-4 引用卡 / 系统事件行 / 推荐卡门禁: 49 passed / 0 failed
```

**接线后的真实性旁证**（`/tmp/opencode/v4-gate-logs/v4-4-i09fix/test-recommendation.log`）：
⑬ 五条判据全绿（`onboardVisible=true` ∧ `rule=onboarding` ∧ chips ≥1 ∧ `last.trigger=firstRun`）。

## 2. I-10（低）：体积披露文案算术不一致 ⇒ 订正 + **算术机核**

| 项 | 处置 |
|---|---|
| 缺陷 | `v4-4-reviewfix` 的 reason / `META.measuredBy` 写「465,277 → 478,163 B（**+12,683 B，+2.73%**）」而登记字段与实测均为 **+12,886 B / +2.77%**；同轮 glue 注释写「12,723 − 12,683」（实测 Σ 逐模块 12,846 + glue 40 = 12,886）。旧判据只查「非空 ∧ before < after」⇒ 机核发现不了 |
| 订正（三处） | ① `SIDEPANEL_RE_REGISTRATIONS['v4-4-reviewfix'].reason`：+12,683 → **+12,886**、+2.73% → **+2.77%**；② `META.measuredBy` 同轮段：同上；③ `v44ReviewfixUnattributedGlueBytes` 注释：「12,723 − 12,683」→「12,886 − Σ 12,846」 |
| 机核（新增判据） | `validateReRegistrationDisclosure` 新增 **canonical 披露元组**（`<before> → <after> B（+Δ B，+P%）`，接受 ASCII 括号/逗号、先剥 `*`）的**算术判据**：`before`/`after`/`Δ`/`P` 必须与登记字段逐项相等（`Δ == after − before` ∧ `P == round(Δ/before×100, 2)`），违规字段 = `reasonArithmetic`。未采用该元组的历史轮次无对象可判（**覆盖口径如实声明**，元组内部零容忍） |
| 同源扩展 | 同一 helper 以 `firstTupleOnly` 驱动 `META.measuredBy` 的**首个**元组（= 最新一轮）与**末条登记**逐项同源（同一事实不得有两个版本） |
| 反证（实跑） | 见下方原文（`RP-V4-4-I10`）：真实登记册零违规；把缺陷文本还原 ⇒ Δ 与百分比双双判红；`META` 元组改错 ⇒ 判红 |

```
▶ /tmp/opencode/v4-gate-logs/v4-4-i09fix/rp-v44-i10.log
  ✔ 段 1：真实登记册的披露算术零违规
  ✔ 段 2 前置：v4-4-reviewfix 条目存在 / 缺陷文本确实被注入
      · 披露元组的 Δ 12683 ≠ 登记字段 Δ 12886（465,277 → 478,163 B（+12,683 B，+2.73%））
      · 披露元组的百分比 2.73% ≠ 登记字段复算 2.77%（…）
  ✔ 段 2：还原原缺陷文本 ⇒ Δ 与百分比都必须判违规（判据非恒真）
  ✔ 段 3：META.measuredBy 最新一轮披露与末条登记同源
  ✔ 段 3 反证：把 META 元组改错 ⇒ 必须报违规
▶ RP-V4-4-I10：两段证伪全绿（判据可 FAIL ∧ 真实数据零违规）
```

## 3. I-11（低）：ADR 口径 / 注释漂移 ⇒ 修订记录订正注（ADR 正文零改写）

| 项 | 处置 |
|---|---|
| ① ADR-V4-036「6 strips 容器移除」 | 实现保留 5 条 strips 容器本体（注册为**永久结构宿主** + 理由 + 通道绑定，因为 journey / binding 的保护门禁确实读这些 id）⇒ 与 ADR §后果 的「移除」口径不一致。**不改写 ADR 正文**（plan 属已完成产物），在 `plan.md` 修订记录追加 **v1.1 订正注**（显式登记「取代/收窄」：容器保留为只读投影 + 事件化，宿主注册表为判据） |
| ② ADR-V4-035 决策 1「L0 chip / L1 面板**吸入** ref 卡」 | 实现里 `#l0-ref-toggle` / `#l0-ref-badge` / `#l1-ref` 仍在（由 `paintRefs` 重绘，归类「同源只读回看」），`REF_PROJECTION_POINTS` 为**自声明 3 点** ⇒ 口径较 ADR 更窄。同上：`plan.md` 修订记录追加订正注（`REF_PROJECTION_POINTS` 为自声明常量，未对 DOM 做投影点计数） |
| ③ `sidepanel.ts:1170` 陈旧注释 | 原文「The rows are collected during `render()` and flushed AFTER it, so a channel that changes as a consequence of a render cannot re-enter the renderer.」与实现不符（入口是 `refreshState()` 尾部的 `eventizeChannels()` 与一次性 `applyEnvGuard()`，且在同一函数内立即 flush）⇒ 已改为如实描述 |
| 字节影响 | **零字节**（仅注释与 `plan.md`/`build.md` 文档） |

## 4. 门禁全账（本轮受影响全量 + 一次 `npm test`，严格串行、一次一个 Chromium；日志目录 `/tmp/opencode/v4-gate-logs/v4-4-i09fix/`）

| # | 门禁 | 结果 | 计数（上一轮 → 本轮） |
|:--:|---|:--:|---|
| 1 | `npm run typecheck` | ✔ | exit=0 |
| 2 | `npm run build` | ✔ | 产物 **478,897 B** |
| 3 | `npm test`（node 全量） | ✔ | 991 → **992/992**（只增；新增披露算术用例） |
| 4 | `test:supersession` | ✔ | 33/33（台账换锚 30 条 + 2 条新条目；`v4 entries 可定位性：160 条逐条命中`） |
| 5 | `test:ref-pick-wiring` | ✔ | 11/11 |
| 6 | `test:size-ruling-vol3` | ✔ | 9 → **10/10**（新增披露算术用例） |
| 7 | `test:l0` | ✔ | 221/221（与上一轮同值；首装卡在 l0 夹具被 `reset()` 清空 ⇒ 零漂移） |
| 8 | `test:recommendation` | ✔ | 44 → **49/49**（新增 ⑬ 五条） |
| 9 | `test:density` | ✔ | 175/175（31 格逐格机对，**零漂移**；产物 478,897 == 登记值 ≤ 上限 502,841） |
| 10 | `test:stream` | ✔ | 63/63（引导期的首装卡被夹具 `streamReset()` 清空 ⇒ 零影响） |
| 11 | `test:ask-auth` | ✔ | 61/61 |
| 12 | `test:ui`（journey，保护段） | ✔ | 167 assertions（`journey.mjs` 零 diff） |
| 13 | `test:insight` | ✔ | 116 assertions |
| 14 | `test:binding`（保护段） | ✔ | **192/192**（本轮一次通过，未复现历史环境性 flake；`binding.mjs` 零 diff） |
| — | `test:gate-integrity` / `test:design-contract` / `test:system-merge` / `test:density-thresholds` 等 | ✔ | 均已含在 `npm test`（992/992）内 |

## 5. 红线核验 + 体积 + V3-VOL-3（本轮）

| 项 | 值 |
|---|---|
| `dist/content.js` | **177,076 B**（逐字节不变） |
| `dist/pick-layer.js` | **33,900 B**（逐字节不变） |
| `test/ui/journey.mjs` / `test/ui/binding.mjs` | **零 diff**（vs `d1bfe54`；保护段未改） |
| `manifest.json` / `src/content/**` / `src/background/**` / `KIND_SET` / 判定链 | **零 diff**（本轮唯一 `src` 改动 = `src/ui/sidepanel/sidepanel.ts`） |
| `dist/sidepanel.js` | **478,897 B**（基线 478,163 → +734 B / +0.15%） |
| 轮内 ceiling | `floor(478,897 × 1.05) = ` **502,841 B**（≤ 绝对上限 563,200） |
| V3-VOL-3 档位 / 绝对上限 | `ceilTo50KB(478,897) = ` **512,000 B**（未跨档） / **563,200 B**（未变） |
| V3-VOL-3 三值 | `newBaselineBytes=478,897`（随现行基线**同源前移**）/ `absoluteCeilingBytes=563,200` / `resolvedOn=2026-09-19`（走**作者确认占位**规则重登；`authorConfirmation.status` 仍 `pending-author-line`，**不伪称已确认**） |
| 五要素重登记 | 新轮 `v4-4-i09fix`（前后值/日期/来源/构建命令/理由 + TIMELINE 只追加 + 逐模块归因 `v44I09fixRows`：`sidepanel.ts` 78,892 → 79,626，Σ 734 + glue 0 == 登记增量） |
| 计数纪律 | node 991→992 · recommendation 44→49 · size-ruling-vol3 9→10 · l0 221 · density 175 · ref-pick-wiring 11（**只增不减**） |

## 6. 残余（如实登记）

| 项 | 说明 |
|---|---|
| 首装入口的**时序面** | 入口在「`llm-status` ∧ `state` 双落地」后求值一次；若面板在双落地前即进入首装（真·首装路径），两处求值点可覆盖两种情况，但未另设「半加载面板不得产卡」的独立 Chromium 断言（本轮以代码前置判据 + ⑬ 的真实首装断言覆盖） |
| I-10 判据的**覆盖边界** | 只对写了 canonical 披露元组的轮次生效（v4 起的各轮）；v3-x 及更早的 reason 无元组 ⇒ 无对象可判（已在判据注释与 build.md 显式声明，未伪称「全册覆盖」） |
| I-11 | ADR 正文按其「已完成产物」纪律**未改写**，只在 `plan.md` 修订记录订正注；若后续轮次要正式重述 ADR，应由 spec/plan 阶段处理 |

# 附 3：收口轮（2026-09-20，validate R1 的 F-01 + N-01~N-05）

> 起点 HEAD `4a1be39`（validate R1 产物已提交；`phase=validated`）。本轮是**收口轮**：修 F-01（低，唯一功能观察项）+ 登记 N-01~N-05 + 补 state closeout 记录。
> 红线不变：`content.js` 177,076 / `pick-layer.js` 33,900 逐字节不变；SW / `KIND_SET` / 判定链 / manifest / journey / binding 零触碰；测试**只增不减**；禁 `git add -A`。
> 日志：`/tmp/opencode/v4-gate-logs/v4-4-closeout/`（24 项串行 + `summary.txt` + 两段证伪两段日志）。

## 1. F-01（低）：同序号引用卡重复投影 ⇒ 修复（唯一 `src` 改动）

**现场（validate R1 独立探针实测）**：`dom-gone` 引用的**只读救援观察**落地时，同一事实被投影两次 —— 捕获时 `acceptCapture` 一次、救援落地 `maybeRescue().then` 一次；`projectRef` 的「同一事实不重复投影」抑制被 `if (!systemText && projectedRefState.get(refId) === marker) return;` **绕过**（`systemText` 只是「顺带要写一行可读系统行」，不是新事实），于是流内出现两张同序号失效卡（`data-ref-num = ["1","1"]`）。

**修法**（`src/ui/sidepanel/sidepanel.ts#projectRef`）：投影唯一性的键 = **`refNum + 状态`**。

- `const marker = ${projection.refNum}:${projection.refState};`（序号在前、状态在后）；
- 同一 `(序号, 状态)` **只允许一张活卡**：命中既有 marker 时不再 `dispatch({type:'ref'})`；
- 但被抑制的投影**仍然照写可读系统行**（改走 `dispatch({ type:'system', kind:'ref', text })` —— 唯一系统通道，去重/限速/`dropped` 记账不变），事实**不静默丢弃**；
- **真正的状态迁移**（`refNum:valid` → `refNum:stale`，即引用在原位失效）键不同 ⇒ 照旧投影新卡。抑制只针对**完全相同的** `(序号, 状态)` 事实。

**两段证伪（Chromium，真实产品路径；脚本 `/tmp/opencode/v4-gate-logs/v4-4-closeout/f01-falsify.sh`）**

| 段 | 动作 | 实测 |
|---|---|---|
| A（红侧） | 把 `projectRef` 回退成旧守卫（`if (!systemText && …) return`）+ 重建（产物 **478,897 B** == 回退前的登记基线，证明差异只来自本修复） | `test:page-input` **rc=1 / 104 passed · 2 failed**，逐字：`{"refId":"ref_10","ordinal":10,"dom":{"cards":2,"nums":["10","10"],"states":["stale","stale"],"thisOrdinal":2,"staleCards":2,"staleRows":1}}` ⇒ 复现 validate 的重复投影 |
| B（绿侧） | 逐字节还原 `sidepanel.ts`（sha256 `03af7188…` 注入前后**相同**）+ 重建（产物 **479,021 B**） | `test:page-input` **rc=0 / 106 passed · 0 failed**，F-01 四断言全绿 |

**新断言（`test/ui/page-input.mjs` ⑯，纯新增）**：① 前置负控「只读救援观察**真的**经 SW→页面→面板往返落地（`candidates=1 ∧ unique=true`）」；② 前置负控「救援事实在面板可读（失效原因含『文本唯一匹配』）」；③ **「救援观察落地后同序号引用卡恰 1 张」**（唯一性键 = `refNum + 状态`）；④ 「被抑制的第二次投影仍然照写系统行（流内『已失效』行 ≥1，事实不静默丢弃）」。夹具只用真实产品路径：真实 `pick-layer-state` 上线消息给面板定页面事实（`acceptCapture` 会把 env 交回生产来源）、SW→面板的真实 `ref-captured`、真实 `ref-rescue` 往返（SW 侧同源归一化文本搜索 + 页面侧文字唯一匹配）。

## 2. N-01~N-05 处置（全部零字节 + 台账登记）

| # | 处置 | 落地 |
|:--:|---|---|
| N-01 | **登记终态说明**（未新增注释 —— 见下） | `knownLimitations[KL-V44CL-N01]`：产品路径**零调用**由 `test:ref-pick-wiring` I-02 机核（扫描 `src/ui/sidepanel/**`，禁止产品侧 `switchStreamSession(`）；「导出仅测试可见」语义**已由既有 doc-comment 逐字承载**（`stream-model.ts#switchStreamSession`：「Legacy model API (pure unit tests)」+「⚠️ The PRODUCT must not call this」）。**未再加一行注释的理由（本构建的可复现事实）**：esbuild 未 minify ⇒ **注释会进产物字节**（实测产物内可见 `//` 注释），新增一行会改变体积登记值并在同一轮内触发第二次五要素重登记；收益纯注释、代价登记面漂移 ⇒ 按「既有声明 + 机核门禁」口径处置。残余面（跨包直接 import 纯模型 API）如实登记 |
| N-02 | **登记**（与 **KL-N-08 同源既有事实**，引用即可） | `knownLimitations[KL-V44CL-N02]`：`BUILD_STAMP` ⇒ sha 变、**字节数恒定**（本轮 479,021 B == 登记值）；红线产物无构建戳 ⇒ sha 仍是稳定不变量（本轮复核 `52a82620…` / `5f567d7e…`） |
| N-03 | **登记**（与 **KL-N-10 同源**） | `knownLimitations[KL-V44CL-N03]`：本轮三次实测 —— 串行链首轮 `#6l residual=undefined`（红）→ 隔离 retry1 `#8d/#8e no confirm` + harness `selector not found: #confirm-allow`（红）→ 隔离 **retry2 / retry3 均 192/192 绿**；`binding.mjs` 零 diff、失败项互异 ⇒ 环境性时序抖动 |
| N-04 | **登记**（I-04 严格序无关性无独立门禁） | `knownLimitations[KL-V44CL-N04]`：机制面**已消除**（`testing.reset()` 清空 `projectedRefState`；登记顺序下 density 175/175 ∧ l1 111/111 绿）；**独立门禁属增量可选**（需跨夹具顺序置换断言，本轮不新增 —— 与 F-01 新断言重叠同一机制），升级条件写明 |
| N-05 | **口径裁决登记**（编排器裁决，2026-09-20） | `knownLimitations[KL-V44CL-N05]`：spec FR-CHAT-052 的「卡内」按「**恢复路径可达即可**（L1 面板与卡内二选一）」读 —— 一键重锚按钮 `#l1-ref-rescue` 在 L1 引用证据面板（唯一文本匹配时可见），失效卡引导至该面板 ⇒ **功能等价**，**登记为已知偏差**（不改实现：搬进卡内会新增可点控件，须重审卡预算/密度登记格）。升级条件：真机反馈需要卡内按钮 ⇒ 小改进项 |

## 3. 门禁全账（24 项严格串行 + 一次全量确认；日志 `/tmp/opencode/v4-gate-logs/v4-4-closeout/`）

| # | 门禁 | 结果 | 计数（validate R1 → 本轮） |
|:--:|---|:--:|---|
| 1 | `npm run typecheck` | ✔ | exit=0 |
| 2 | `npm run build` | ✔ | 产物 **479,021 B** |
| 3 | `npm test`（node 全量） | ✔ | 992 → **992/992**（本叶只加 Chromium 断言；node 计数不变） |
| 4 | `test:supersession` | ✔ | 33/33（换锚 30 条 + 新条目 2 条 + KL ×5） |
| 5 | `test:gate-integrity` | ✔ | 12/12 |
| 6 | `test:design-contract` | ✔ | 6/6 |
| 7 | `test:ref-pick-wiring` | ✔ | 11/11（I-02 禁止产品直呼 `switchStreamSession` 仍在判） |
| 8 | `test:size-ruling-vol3` | ✔ | 10/10（ceiling 502,841 → 502,972 重 pin；档位/绝对上限未变） |
| 9 | `test:stream` | ✔ | 63/63 |
| 10 | `test:ask-auth` | ✔ | 61/61 |
| 11 | `test:l0` | ✔ | 221/221 |
| 12 | `test:l1` | ✔ | 111/111 |
| 13 | `test:l2` | ✔ | 73/73 |
| 14 | `test:density` | ✔ | 175/175（31 格机对零漂移；产物 479,021 == 登记 ≤ 502,972） |
| 15 | `test:page-input` | ✔ | 102 → **106/106**（新增 ⑯ 四条） |
| 16 | `test:zero-injection` | ✔ | 27/27 |
| 17 | `test:recommendation` | ✔ | 49/49 |
| 18 | `test:ui`（journey，保护段） | ✔ | 167 assertions（零 diff） |
| 19 | `test:insight` | ✔ | 116 assertions |
| 20 | `test:hardening` | ✔ | 24 assertions |
| 21 | `test:binding`（保护段） | ✔ | 串行链首轮红（`#6l`）→ 隔离 retry2/retry3 **192/192**（见 N-03） |
| 22 | `test:e2e` | ✔ | PASS |
| 23 | `test:l1-reverse` | ✔ | 9/9（注入 → FAIL → sha256 复原 → PASS，全套） |
| 24 | `test:l2-reverse` | ✔ | 10/10 |

**计数纪律（只增不减）**：npm 992（不变）· page-input 102 → **106** · recommendation 49 · l0 221 · density 175 · supersession 33 · ref-pick-wiring 11 · size-ruling-vol3 10 · l1 111 · l2 73 · stream 63 · ask-auth 61 · zero-injection 27 · journey 167 · insight 116 · hardening 24 · binding 192 · l1-reverse 9 · l2-reverse 10 —— **无一项下降，无一条断言被删除或放宽**。

## 4. 红线核验 + 体积 + V3-VOL-3（本轮）

| 项 | 值 |
|---|---|
| `dist/content.js` | **177,076 B** · sha256 `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`（逐字节不变） |
| `dist/pick-layer.js` | **33,900 B** · sha256 `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59`（逐字节不变） |
| `src/content/**` / `src/background/**` / `manifest.json` / `KIND_SET` / 判定链（`l1/ref-validity.ts`）/ `test/ref-wiring.test.ts` | **零 diff**（`git diff --stat` 空） |
| `test/ui/journey.mjs` / `test/ui/binding.mjs` | **零 diff**（保护段未改） |
| 唯一 `src` 改动 | `src/ui/sidepanel/sidepanel.ts`（`projectRef`，F-01） |
| `dist/sidepanel.js` | **479,021 B**（基线 478,897 → **+124 B / +0.03%**；逐模块归因 `sidepanel.ts` 79,626 → 79,750，Σ 124 + glue 0） |
| 轮内 ceiling | `floor(479,021 × 1.05) = ` **502,972 B**（≤ 绝对上限 563,200） |
| V3-VOL-3 档位 / 绝对上限 | `ceilTo50KB(479,021) = ` **512,000 B**（未跨档） / **563,200 B**（未变） |
| V3-VOL-3 三值 | `newBaselineBytes=479,021`（随现行基线**同源前移**）/ `absoluteCeilingBytes=563,200` / `resolvedOn=2026-09-19`（走**作者确认占位**规则重登；`authorConfirmation.status` 仍 `pending-author-line`，**不伪称已确认**；台账 ⑤/⑥ 字段本轮与注**同步订正**，消除上一轮「字段 478,163 vs 注 478,897」的同事实两版本） |
| 五要素重登记 | 新轮 `v4-4-closeout`（前后值 / 日期 / 来源 / 构建命令 / 理由 + TIMELINE 只追加 `479_021` + 逐模块归因 `v44CloseoutRows`） |
| 变更文件面 | 8 个：`src/ui/sidepanel/sidepanel.ts` + `test/ui/page-input.mjs` + `test/size-{baseline,budget,size-growth-evidence,ruling-vol3}.ts` + `docs/v4-density-baseline.json` + `docs/v4-supersession-ledger.json`（**无 `git add -A`**） |

## 5. 收尾

- 提交：`fix(web-cli-plugin): v4-4 收口轮——F-01 同序号重复投影修复 + N-01~N-05 登记（含 N-05 重锚按钮位置口径裁决）`
- state：`state.json` 补 `closeoutRounds` 记录 + `phaseNote` 追加收口轮段；父 state `childrens[3].note` 同步「_validated + 收口完成_」。
- 本叶终态：**validated（保持）+ 收口完成**（四叶全闭环，可进父收口）。
