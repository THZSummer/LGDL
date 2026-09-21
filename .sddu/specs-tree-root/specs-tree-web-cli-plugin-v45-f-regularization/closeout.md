# F-31 web-cli-plugin v4.5「F 还原度转正」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v45-f-regularization/`（父 = 轻量规范容器）
> **收口轮次**: v4.5 父收口（整体收口，第 1 轮）
> **日期**: 2026-09-21 ｜ **授权**: 编排器代作者决策 ｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin`（本 Feature 起点 HEAD = `f2b434b`；叶收口轮 = `2877ea4`；父收口 = 本 commit）｜ **`main` = `2ddc922`（未动）**
> **口径**: 本文件的数字**一律取自唯一叶 build/validate 产物**（不重跑门禁、不编造）；本轮为**纯文档 / 状态收口**，零 `src/`、零 `test/`、零叶产物实义改动；抽查 3 个数字与源文件核对（见 §3 脚注）。

---

## 1. 一句话结论

**F-31 完成**：父（轻量规范容器）+ **唯一叶** `specs-tree-v45-1-single-write-chronology` 收口，叶 **phase = `validated` / status = `completed`**（7 阶段全闭环；validate R1 **✅ 通过 / 0 阻塞**），**24 门禁独立复跑 24/24 全绿且逐项 == 自报**。主题「把 F 方案（聊天流统一承载）的结构性收尾从 deferred 转为可验收的纯形」达成 —— **F 还原度转正**：**流纯时间序 + 事实单写**（首屏每个事实恰出现一次），终评 **9.5 / 10**（剩 0.5 = 人工观感待真机）。附带硬义务与登记两项均已落：**FIX-5 空态噪音消解** + **`options/index.html` 授权文案显式解冻**；**N-05 关闭**（`ref` 卡卡内恢复区可达）。**不合 main、不发布**（v1 / v2 / v3 / v4 / v4.5 均在 `feature/web-cli-plugin`，合入 / 发布由作者决定）。

---

## 2. 交付了什么（面向使用者）

1. **首屏每个事实恰出现一次** —— `#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` 5 条提示带的**可见投影真退役**（DOM 移除，**不是 `hidden`**），事实的**唯一可见载体** = **流内系统事件行或流内卡**；`#send-reason` 保留在状态栏（不在退役面）。`host-registry` 中「同时保留可读投影 + 已事件化」的双写理由**已从注册表移除**。
2. **聊天流 = 纯时间序卡列表** —— 4 个固定位置宿主（`decision` / `composer` / `l1-panels` / `strips`）**清零**，`ol#stream` 的直接子节点全部是追加式正序消息卡（任意深度零 `[data-host]`）；`#composer` 出流（迁 `body` 尾并**保持 `hidden`**，`#composer` / `#input` / `#send` 的 id 与 ARIA 全保留 ⇒ journey / binding 读取契约不变）。拖放落点 / 回执 / 引用证据 / 恢复按钮**全部卡内化或视图化**。
3. **恢复动作直达** —— `risk-recovery` 卡扩展至 `site` / `probe` 触发，卡内 chips **即动作**：授权 / 重新绑定当前标签页 / 了解手势 / 重新拾取 / 改用描述（`NEXTSTEP_ACTS` 6 项闭集；本地动作**零回合**、不受 `pending` 门控，复用单一生产入口）。
4. **手势说明迁设置视图「帮助」分区** —— 6 个页面手势表行内容由 `L1_GESTURE_LABELS` / `GESTURE_EFFECTS` **单源**渲染、计入 `SETTINGS_SECTION_IDS`（设置入口计数随之派生）；分区**只读、零可点控件**。

> **附带**：**FIX-5 消解**（0 计数控件不再恒驻首屏；登记为「已由核心 2 覆盖而消解」，非独立成条）+ **`options/index.html` 授权文案显式解冻**（唯一纯文案单行订正，走一次显式解冻登记 + 范围门禁）。

---

## 3. 数字总账

### 3.1 门禁（唯一叶末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`1045 / 0`** | **v4.5 起点 1001 → 1045**（W1/W2 + W3 + 修复轮只增） |
| `test:supersession` | **35 / 0** | 起点 33 → 35（链式取代判据 `supersessionChain`） |
| `test:gate-integrity`（元门禁） | **13 / 0** | 起点 12 → 13（判定器 selftest **15**） |
| `test:zero-injection` | **27 / 0** | 未授权站点零注入（options 解冻后复跑仍绿） |
| `test:design-contract` | **6 / 0** | shim **60 / 60**、双 sha 冻结未动 |
| `test:ref-pick-wiring` | **11 / 0** | 拾取单一入口 / 禁止产品直呼纯模型 API |
| `test:size-ruling-vol3` | **12 / 0** | 闭合三值 + `min()` + 披露算术机核 |
| `test:l0` | **244 / 0** | 起点 223 → 244（BLOCK-03 段 + I-05 对账 + raw 计数） |
| `test:l1` | **116 / 0** | 起点 111 → 116（⑩ 时点无关判据②） |
| `test:l2` | **74 / 0** | 不变 |
| `test:density` | **232 / 0** | 起点 175 → 232（31 格台账 + 无可点残留判据） |
| `test:ui`（journey） | **171 / 0** | 保护段**第二次八步取代**（新 pin），断言数不减；首轮 `#54g` flake 隔离复跑 **2/2 绿** |
| `test:insight` | **116 / 0** | 不变 |
| `test:binding` | **192 / 0** | 保护段**保段**（零 diff）；环境性 flake 首轮即绿（KL-N-10 未复现） |
| `test:hardening` | **24 / 0** | 不变 |
| `test:e2e` | **PASS** | fixture + LGDL Workbench 全链 |
| `test:stream` | **63 / 0** | 12 型卡 / 固化 / 回放 / 滚动 |
| `test:ask-auth` | **61 / 0** | 终态机 / 留痕 / 零明文 |
| `test:recommendation` | **59 / 0** | 真实产品路径（⑬ rebind chip / ⑭ help chip） |
| `test:page-input` | **108 / 0** | 起点 106 → 108（⑤ 两条真断言） |
| `test:l1-reverse` / `test:l2-reverse` | **9 / 0** · **10 / 0** | 全部「注入 → FAIL（命中 `expectFailPattern`）→ sha256 逐字节还原 → PASS」 |
| `npm run typecheck` / `npm run build` | **0 error / EXIT=0** | 体积见 §3.2 |

**规律**：**24 / 24 独立复跑全绿，逐项 == self-report**；**断言零删除零降级、计数只增不减**（唯一例外 = journey 保护段按 ADR-V45-008 **第二次八步显式取代**并留链式台账，**不是静默删除**）。

### 3.2 体积与保护段

| 项 | 末轮登记值 | 说明 |
|------|:--:|------|
| `dist/content.js` | **177,076 B** | sha256 `52a82620…` 逐字节不变；v4.5 全程**零触碰** |
| `dist/pick-layer.js` | **33,900 B** | sha256 `5f567d7e…` 逐字节不变 |
| `dist/sidepanel.js` | **493,501 → 498,521 B** | 显式五要素重登记（修正轮 +5,020 B / +1.02%；终轮 `direction=unchanged` Δ=0） |
| 生效上限（公式） | **523,447 B** | `floor(498,521 × 1.05)`；容差 **5% 未动** |
| 档位 `ceilTo50KB(498,521)` | **512,000 B** | **未下移** |
| 绝对上限 | **563,200 B** | **未变**（= 档位 × 1.10） |
| `authorConfirmation.status` | **`pending-author-line`** | 保持（未伪称已确认；作者一行可否决改值） |
| journey 保护段 | `43054..58287` / `cc79f413…` / **240 行** | **第二次八步显式取代**；`supersessionChain` 3 链节 `6b45c3fa…` → `e2b500df…` → `cc79f413…` |
| binding 保护段 | `107780..115930` / `be9ad0e9…` / 183 行 | **保段**（`decision = keep`；段外改写逐行入账） |

**sidepanel 增长链（v4.5 段，逐轮实测）**：
`480,026`（v4.5 起点 = f-fidelity-fix 收口）→ `480,896`（W2 五通道单写化）→ `493,501`（W3 宿主退役 + 元素迁移）→ `493,501`（W4+W5 终轮 Δ=0）→ **`498,521`**（review 修复轮 BLOCK-01~04）。**轮内 ceiling 链**：504,027 → 518,176 → **523,447**。

### 3.3 母体口径与附带

- **编号**：44 FR / 8 NFR / 13 EC / 22 AC / 17 NG / 6 US / 6 G；ADR-V45-001~012（12 条）；**元素去向 37 条**（退役 19 / 迁移 13 / 消解 3 / 保留 2，**新增宿主 0**）。
- **任务**：**19 任务 / 5 波（W1~W5）/ S×2 · M×6 · L×11 / 2 spikeGate / 4 提交区间**（A = W1 · B = W2 · C = W3 · **D = W4+W5 原子**）。
- **N-05 关闭**（`ref` 卡卡内恢复区可达）· **FIX-5 消解**（登记为「已由核心 2 覆盖」）· **options 解冻**（纯文案单行 + 范围门禁 + 零注入复跑 27/0）。

> **抽查 3 个数字与源核对（本轮）**：① `npm test` **1045** ↔ 唯一叶 `state.json#validate.gates.npmTest` / `build.md §8.7` / `validate-report.md §3.3` **一致**；② `sidepanel.js` **498,521** 与 ceiling **523,447** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts:301`（`SIDEPANEL_BASELINE_BYTES = 498_521`）与 `:1288`（`ceilingAfterBytes: 523_447`）**一致**；③ journey 保护段 **240 行** ↔ 源 `packages/web-cli-plugin/docs/v4-supersession-ledger.json#protectedRanges[0].lineCount = 240`（sha `cc79f413…`）**一致**。

---

## 4. 过程中抓到的真问题（本流程的价值证明）

| # | 问题 | 级别 | 处置 |
|:-:|------|:--:|------|
| 1 | **退役清单与产品铸造点自相矛盾**（review R1 BLOCK-01）：`#l0-receipt-summary` 被登记为「已退役容器」，而 `l1/panels.ts#paintReceiptSummary` 是它的**唯一产品写点** ⇒ 判据只在夹具的「无回执时点」成立（**时点依赖**），且产品在收到第一条真实回执后**必然**报 live 假阳性 | **高（判据失真）** | 修：采用「**迁移容器**」口径（`RETIRED_CONTAINER_IDS` 14 → **13**，新增 `MIGRATED_CONTAINER_IDS` 5 项 + 判别规则注释）+ **时点无关判据两条**（无回执态零残留 / 有回执态恰 1 ∧ `hosts().problems === []`）；假阳性**实跑复现**（`F5b-block01-l1.log`）后闭合 |
| 2 | **死写点 + 空心断言**（review R1 BLOCK-02）：`pick-input.ts` 3 个拖放高亮写点仍指向已退役 `#l0-decision`（`?.` **静默 no-op** ⇒ 产品从未写落点），而门禁 ⑤ 是「读后即弃」的**非断言**（断开态仍全绿） | **高** | 修：写点迁真实落点 `ol#stream`（`dropSurface()`）；门禁 ⑤ 转 2 条**真断言**（`dragover` 后 `data-drop-active=true` ∧ `drop` 后清除）。两段证伪：回退写点 ⇒ 红；退回旧形态 ⇒ 断开态仍全绿（证明旧判据空心） |
| 3 | **「可见载体数 == 1」无 live 判据**（review R1 BLOCK-03）：`observedCarriers` 没有 live 供给点、载体半边「缺失即跳过」⇒ 判据可**空转**（事实双见/消失都不红） | **高** | 修：面板侧 live 读数（`stripChannelReading` / `stripCarrierCounts` / `stripChannelProblems`，与 node 门禁**共用同一** `evaluateStripChannels`）+ 「**缺失即红** ∧ 载体面 >1 即红」+ firstRun 口径裁决（卡在 ⇒ 行抑制）+ **三段注入反证** |
| 4 | **`title` 净化面零反证**（review R1 BLOCK-04）：`title` 规则 4 声称「同过净化」，但无任何对抗证据 | **中** | 修：`system-merge.test.ts` 追加判据表 `TITLE_PLAINTEXT_JUDGEMENTS`（3 条）+ **4 条反证**（`?token=` 抛错 / 经唯一写入点抛错且**零半成品行** / `<link>` 剥标记正例 / 判据表自检可产出） |
| 5 | **中断半成品无夹带复核（过程事实）**：修复轮起点不是干净的 `8ea1c46`，而是上一次派发中断遗留的**半成品工作树**（快照 `wt.diff`，**18 文件**）——若不登记，将无法区分「接续」与「夹带」 | 中（过程治理） | 处置：逐文件复核后接续；**证明 `wt.diff ⊂ 最终代码 diff`**（严格子集、无反向夹带）；登记入 `build.md §8.0 现场差异`；接续中**真实修正 3 项缺陷**（见 #6） |
| 6 | **3 项门禁缺陷（前轮只跑 node 面 ⇒ 从未被编译/实跑）**：① `test/ui/l1.mjs` 与 `page-input.mjs` 在 `evaluate()` **模板字面量内部**写了未转义反引号 ⇒ `SyntaxError`；② `insertAdjacentHTML` 注入在面板页 **Trusted Types** 下静默落空 ⇒ 反证**恒绿**；③ density stageB firstRun 断言口径过窄 ⇒ 首装档**假红** | **中（反证有效性）** | 修：去除模板内反引号（`node --check` 全量 0 BROKEN）/ 改 `createElement` + `appendChild` 且**注入返回值入断言** / 改互斥式 + 消费 live `face` 读数 ⇒ 232/0 |
| 7 | **binding 段内 1 字节注入必红（对抗证据）**：注入 `binding.mjs@108000` ⇒ `test:supersession` **29/6 红**（sha `1f527bbf` ≠ `be9ad0e9`）→ 逐字节还原 ⇒ **35/0 绿** | — | 结论：保护段**不可伪造**（可 FAIL 非空转）；守护偏移与 sha 双绿 |
| 8 | **验证面（价值证明）**：24 门禁**独立复跑**逐项 == 自报；**46 条独立对抗探针断言**全绿；密度 31 格 **tighten-only**（唯一真变更格 `risk(staleRef)@400` 逐项下降 7/7/18/237 → 6/7/17/232）；体积越限注入（×1.06 / 523,448 / 563,201）**全红**、恰在上限 523,447 绿；`li[data-host]` 注入 ×5 形态 **全红**、退役容器复活 ×4 **全红** | — | 未采信 build/review 自报数值；「换口径 = 放松」这一最大风险经对抗探针证伪 |

---

## 5. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

1. **`test:ui` / `test:binding` 环境性 flake**（叶 N-01 / **`KL-N-10`** 同源）：`journey.mjs #54g`（bookmarks 权限拒绝路径的持久回执回显）首轮 1 项红 → **隔离复跑 2/2 绿**；`binding` 串行链首轮偶发红且**每次失败项不同**（`binding.mjs` 对基线**零 diff**，隔离复跑即绿）。**纪律**：串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞收口（**不伪造串行全绿**）；建议三处时序断言加就绪等待或有界重试（本轮未做）。
2. **O-05**：`test/density-thresholds.test.ts` 静态 `V4_RETIRED_IDS` 仍含 `l0-receipt-summary`，且无「**静态退役 ≠ 迁移容器**」注释（低危；补注释即可，不产生假阳性）。
3. **O-06**：`[data-drop-active]` 全仓**无 CSS 消费者** ⇒ 落点高亮不可视（低危；已登记为「非可视状态」——注：产品写点已按 BLOCK-02 迁至真实落点，仅视觉未实现）。
4. **O-07**：`test/size-baseline.ts#SIDEPANEL_GROWTH_BREAKDOWN.measuredOn` 仍 `2026-09-20`（已有 09-21 轮次行）——本轮为零产物文档轮、无新一轮体积登记，故未更新（低危）。
5. **O-08**：`ADR-V45-001` 未显式注记「**0 = 事实不可见合法**」（源码注释 `host-registry.ts` 已登记；建议 ADR 补注，低危）。
6. **O-04**：`build.md §8.12` 的 `git add` 清单多列 `TREE.md`（该提交未触碰）——作为历史登记保留（review R2 已登记，非阻塞）。
7. **父 spec 受控回写**：父 `spec.md` 在 `2c1fcf8` 被修改（review I-04 回写：NFR-V45-001「记录 vs 断言」口径区分）——已登记，非未受控漂移；叶子 `spec.md` **零漂移**。
8. **未闭合义务（不得伪称已确认）**：`authorConfirmation.status = pending-author-line`（档位 512,000 / 绝对上限 563,200 不变）——**作者一行可否决改值**。
9. **A2A（F-29）未立项未排期**——本轮 ROADMAP 对该区段**一字未动**（`## 未来方向候选（未立项）` → `## 修订记录` 整区间**前后字节相等**，已核验）。
10. **人工面未执行**：见 §6（**不得冒充 PASS**）。

---

## 6. 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

> **口径说明（如实）**：唯一叶 `validate-report.md §7` 显式承接 **3 项人工面**并登记为 `⏳ 未执行`，**未以任何自动判据冒充人工验收**（AC-V45-022）；其中 `title` 读屏面同时是 `NFR-V45-008` 的唯一 headless 不可合成项。父 spec / 编排器要求「人工面逐项标注未执行或 PASS」——本节按 Feature 的验收面（观感 / 体感 / 真实读屏）**原样承接**，**全部 `⏳ 未执行`**（未跑门禁的原因 = 本轮为纯文档 / 状态收口，零代码 / 测试改动；headless 不可合成）。

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | `title` 承载长文案的读屏体验 | `V45-P-014`：屏幕阅读器是否朗读 / 粒度（长文案降为行的 `title` 属性 + 设置站点详情） | ⏳ 未执行（无读屏环境；需真机 + 读屏软件） |
| 2 | 三主题 + 高 DPI 下迁入块可读性 | `EC-V45-009`：`light` / `dark` / `auto` × 高 DPI（≥2×）下 `#l2-tree-attribution` / `#l2-audit-evidence` / 卡内 `ref` 恢复区 | ⏳ 未执行（需真机目视） |
| 3 | 320px 窄侧栏下迁入块可读性 | `EC-V45-009`：窄侧栏下迁入块可读性 | ⏳ 未执行（需真机目视） |

---

## 7. 建议的下一步

**A. 真机人工面验收（headless 无法替代，重点见 §6）**
1. 对照 `packages/web-cli-plugin/docs/f-fidelity-fix-2026-09-20.md` 的偏差清单，做一次**真机目视**：**首屏单写**（每个事实恰出现一次，无同义第二投影）/ **纯时间序**（聊天流除卡无别的 `li` 宿主；上滚回看不被结构打断）/ **恢复直达**（失效 `ref` 卡内「重新拾取 / 改用描述」可达；`site` / `probe` 触发下卡内「重新绑定当前标签页」可用且零回合）。
2. 三项人工面走查（§6）：`title` 读屏粒度 / 三主题 + 高 DPI 迁入块 / 320px 窄侧栏迁入块。

**B. 作者一行决策（体积义务）**
3. **`authorConfirmation.status = pending-author-line`**：档位 **512,000 B** / 绝对上限 **563,200 B**（= 档位 × 1.10）/ 生效上限 **523,447 B**。作者可一行否决改值；确认后该占位义务才算真正闭合（现为「带值闭合 + 作者占位」）。

**C. 版本与发布**
4. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）/ v4.5（F-31）**均在 `feature/web-cli-plugin`，未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.9.1 = v4 维护收尾（F-31）** 登记（单列版本位，非新主题），文档版本 **1.27.0 → 1.28.0**。
5. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。
6. **承前非阻塞项（可选）**：`test:binding` / `test:ui` 时序断言加就绪等待或有界重试（`KL-N-10` 建议）· O-05 补「静态退役 ≠ 迁移容器」注释 · O-06 补 CSS 或明确登记为「非可视状态」· O-07 `measuredOn` 随任一轮更新 · O-08 给 ADR-V45-001 补「0 = 事实不可见合法」注。

---

## 8. F 还原度终评（对照 `packages/web-cli-plugin/docs/f-fidelity-fix-2026-09-20.md` §5 deferred 逐项核销）

| 偏差项（deferred 原文） | 核销 | 证据 |
|---|---|:--:|
| **strips 单写化**（退役可读投影、事件行为唯一面） | ✅ **关闭**（v4.5） | 5 条提示带 DOM **真退役**（非 `hidden`）；首屏三事实「载体面恰 1 ∧ raw 节点恰 1」+ 3 段注入反证（`l0` 244/0）；`host-registry` 双写理由已移除 |
| **宿主时间序化**（`decision` / `l1-panels` / `strips` 并入时间序） | ✅ **关闭**（v4.5） | `li[data-host]` = **0**（任意深度零 `[data-host]` / `[data-transitional-host]`）；`assertStreamPureCardOrder()` 真跑通过；`#composer` 父 = `body` ∧ 非流后代 ∧ body 尾 ∧ `hidden` |
| 工具栏摘要回归 F 契约（FIX-3） | ✅ 前轮（f-fidelity-fix） | `f-fidelity-fix §1 FIX-3`（origin + 授权态摘要）；v4.5 未回退 |
| 决策槽 kicker 语义收敛（FIX-4） | ✅ 前轮（f-fidelity-fix） | `f-fidelity-fix §1 FIX-4`；v4.5 随 `#l0-kicker` 退役**彻底消解**（角色名由流内卡自身承载） |
| **FIX-5 空态 L1 噪音** | ✅ **关闭**（v4.5 消解） | 0 计数控件不恒驻首屏（`density` 空态档 + `l0` 改写后触发器）；登记为「已由核心 2 覆盖而消解」 |
| 授权 chip 直达授权流（FIX-1，授权语义） | ✅ 前轮（f-fidelity-fix） | `f-fidelity-fix §1 FIX-1` + `test/authorize-chip-wiring.test.ts`（单一调用点 / 零回合）；v4.5 act 闭集 6 项保持 |

**终评分：9.5 / 10**（编排器预估）。**扣 0.5 的唯一原因 = 人工观感待真机**（§6 三项：`title` 读屏 / 三主题 + 高 DPI / 320px 迁入块）—— 机器可核面（单写 / 时间序 / 恢复直达 / 门禁 / 保护段）**已全部达标且经对抗验证**；**不因未做人工项而伪称满分**。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（v4.5 父收口第 1 轮：父 + 唯一叶收口，叶 `validated` / `completed`；一句话结论 / 交付（4 条）/ 数字总账（24 门禁 + 体积与保护段 + 母体口径）/ 过程真问题 8 条（review R1 四阻塞 + 半成品夹带复核 + 3 项门禁缺陷 + binding 1 byte 注入 + 验证面）/ deferred 10 条 / 人工面 3 项 `⏳` / 下一步（真机验收 + V3-VOL 作者行 + 合 main 决策）/ F 还原度终评 **9.5/10** 逐项核销；**纯文档/状态收口，零 `src` / 零 `test`，不跑构建 / 门禁**） | 2026-09-21 | SDDU Build Agent |
