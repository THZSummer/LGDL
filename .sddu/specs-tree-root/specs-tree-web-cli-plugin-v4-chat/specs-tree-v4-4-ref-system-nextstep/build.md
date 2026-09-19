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
