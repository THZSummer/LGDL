# F-30 web-cli-plugin v4「聊天流统一承载」——全 Feature 总账（父收口）

> **Feature**: `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/`（父 = 轻量规范容器）
> **收口轮次**: v4-chat 父收口（整体收口，第 1 轮）
> **日期**: 2026-09-20 ｜ **授权**: 编排器代作者决策 ｜ **代行**: sddu-build
> **分支 / HEAD**: `feature/web-cli-plugin` @ `b18c70b`（`main` = `2ddc922`，未动）
> **口径**: 本文件的数字**一律取自四叶 build/validate 产物**（不重跑门禁、不编造）；本轮为**纯文档/状态收口**，零 `src/`、零 `test/`、零四叶产物改动；抽查 3 个数字与源文件核对（见 §4 脚注 / §5）。

---

## 1. 一句话结论

**v4-chat 完成**：父 + 四叶全部收口，**四叶 phase 全部 `validated`**（`status=completed`/`tracked`），**全门禁绿**（末轮实测：npm test **992** · supersession 33 · l0 221 · l1 111 · l2 73 · density 175 · journey 167 · insight 116 · binding 192 · hardening 24 · e2e PASS · gate-integrity 12 · design-contract 6 · zero-injection 27 · page-input 106 · stream 63 · ask-auth 61 · recommendation 49 · ref-pick-wiring 11 · size-ruling-vol3 10 · l1-reverse 9 · l2-reverse 10）。主题「把过程交互变成可回看的事实」达成——**三区布局**（工具栏 ≤5 可点 / 聊天流唯一交互面 / 状态栏风险 chips 永不折叠）+ **一切过程交互皆消息**（7 主类 + 过程卡族 12 kind，只追加只固化、带时间戳）。**附带硬义务 V3-VOL-3 已带值闭合**（新基线 **479,021** / 绝对上限 **563,200** / 生效 **502,972**），**绝对上限待作者一行确认/否决**。**不合 main、不发布**（v1/v2/v3/v4 均在 `feature/web-cli-plugin`，合入/发布由作者决定）。

---

## 2. 交付了什么（面向使用者的三句话）

1. **三区布局**：`工具栏`（站点摘要只读 + 4 视图入口 + 主题切换，**可点 ≤5**，机器断言超限即抛错）/ `聊天流`（`ol#stream[role=log]`，**唯一交互面**，追加式）/ `状态栏`（连接状态 + 风险 chips，**永不折叠**；零风险 ⇒ 0 可点 chip）。原「L0/L1/L2 分区 + 浮层 + 独占决策槽 + 底部 6 条瞬时提示条 + 顶部风险带 + 3 处引用投影」的散落形态被收拢。
2. **一切过程交互皆消息**：7 主类（`ai` / `user` / `nextstep` / `askuser` / `auth` / `system` / `ref`）+ **过程卡族 12 kind**（工具 / 命令行 / 思考 / 错误 / 通知等既有形态**零丢失**）；**已答 / 已批准 / 已失效只固化不撤销**（撤销 = 新的系统事件行），每条带 `.ts` 时间戳；ask-user 与授权卡从独占槽**迁入流内**，60 s 超时 / 主动取消 / `supersededAsk` 全部留痕（**不代填、无假超时**）；引用生命周期（有效 / 失效 / 新序号）入流，6+ 系统事件通道**归并到唯一通道**，下一步推荐卡（真值白名单 + chips 即指令）从 0 到有。
3. **密度新口径 + 防滥用**：测量根 = 三区外壳（`#stream` 子树**不计入**），豁免只认 `hidden`；**防滥用**：单卡 ≤6 可点 / 首屏 ≤2 卡 / 合计 ≤8 / 欢迎卡 ≤1；阈值哲学 **7/15 · 9/20 · 17/35 逐字保留**，登记格重算且有可 FAIL 反证（RP-V4-09）。

---

## 3. 四叶一览表

| # | 叶子 Feature | 范围（一句话） | 关键产出 | 验证（实测） | 收口 commit |
|:-:|--------------|----------------|----------|--------------|-------------|
| 1 | `specs-tree-v4-1-zone-shell-density`（V4-1，15 任务 / 8 波） | 三区骨架落定 + 风险 chips 永不折叠 + 密度新口径与防滥用（含反证）+ 登记格重算 | `src/ui/sidepanel/{density-scope,toolbar,statusbar,theme}.ts` + `index.html` 三区重构 + `test/ui/density.mjs`（口径换根 + RP-V4-09）+ `docs/v4-supersession-ledger.json`（新建） | **✅ 通过（0 阻塞 / 8 观察项）**；19 门禁串行（18 绿 + `page-input` 首轮 flake 隔离复跑 2×102/0）；**13 条密度对抗探针**（10 自写 + 3 真门禁注入）红→还原→绿；journey 保护段显式取代（新 pin `43054..55259` / 194 行 / `e2b500df…`）+ `#15b` 46.4% 真红 + `#15c` 可见 input 真红 | `203261e`（收口轮；处置 N-01~N-08：修 4 / 登记 3 / 移交 1） |
| 2 | `specs-tree-v4-2-chat-stream-model`（V4-2，12 任务 / 7 波，+跨叶 TASK-613） | append-only 事件模型（不可变 / 单调 / 可回放）+ 7 主类 + 过程卡族渲染 + 统一固化契约 + 卡预算收紧（TASK-613） | `src/ui/sidepanel/{stream-model,stream-digest,stream-render}.ts` + `src/ui/sidepanel/cards/{index,shared,ai,user,system,tool,thinking,error,notice}.ts` + `chat-state.ts`（`stream` 分支追加）+ `test/ui/stream.mjs`（新门禁 `test:stream`）+ `test/stream-*.test.ts` | **⚠️ 有条件通过（0 阻塞；F-01~F-03 + N-01~N-03 收取口轮处置）**；20 门禁 + RP-V4-09；**62 条独立探针断言**；暴露 **F-01 `payload` 浅冻结**（append-only 缺口）/ F-02 `seq` 回退可逆序 / F-03 `sanitizeLabel` 截断夹带密钥前 9 字符 | `0f8a1fb`（收口轮；F-01 深冻结 / F-02 seq 严格单调 / F-03 扫描先行 + N-01 `KL-N-10` / N-02 / N-03） |
| 3 | `specs-tree-v4-3-ask-auth-inflow`（V4-3，11 任务 / 6 波） | ask-user（choice/text）与破坏性确认从独占槽迁入流内 + 固化不可逆 + 60 s 超时 / 取消 / `supersededAsk` 留痕 + 授权记录流内可回看 + 零明文边界 | `src/ui/sidepanel/cards/{askuser,auth}.ts` + `stream-model.ts`（`MAX_OPEN_ASKS=2` / `AskCancelReason` / `closeOpenAsks`）+ `view-model.ts#askFlowView` + `test/ask-auth-inflow.test.ts` + `test/ui/ask-auth-inflow.mjs`（新门禁 `test:ask-auth`） | **✅ 通过（0 阻塞 / 3 非阻塞登记）**；22 门禁 + RP-V4-09；**240,802 对抗探针断言 0 失败**（假留痕四攻全败 / 终态机 **10,000 序列 · 240,748 断言 0 漏洞** / 零明文注入 / 展开态预算自注入必红）；review R1 **4 阻塞**（假批准 / 假超时 / 答案源断裂 / 审计死链）**全部无法复现** | `eb879bb`（收口轮；N-01 台账 `leafBases[].summary` 复算订正 + 机核 / N-02 宿主计数 / N-03 `KL-V43CL-01`） |
| 4 | `specs-tree-v4-4-ref-system-nextstep`（V4-4，12 任务 / 6 波，最后完成） | 引用卡 / 系统事件行（6+ 通道归并）/ 推荐卡（真值派生 + chips 即指令）+ 拾取入口迁移（`requestPick()` 单一入口）+ **V3-VOL-3 父级收口锚** | `src/ui/sidepanel/recommend.ts` + `stream-plaintext.ts` + `host-registry.ts` + `chat-state.ts`（`state`/`notice` 跳变事件化）+ `test/system-merge.test.ts` + `test/ui/recommendation.mjs` + `test/ref-pick-wiring.test.ts`（新门禁 `test:recommendation` / `test:ref-pick-wiring`）+ `test/size-ruling-vol3.test.ts`（V3-VOL-3 闭合） | **✅ 通过（0 阻塞；F-01 + N-01~N-05 收取口轮处置）**；23 门禁 + design-contract 全绿、计数对账 0 差异；**86 条独立探针断言**（node 49 + Chromium 37）；review R1 **3 阻塞**（推荐链路 seam-only / 通道只归并 2 条 + 判据空转 / 描述死控件）闭环 → R2 ✅ 通过；V3-VOL-3 三值独立复算 + 越限/伪造 Δ **必红** | `b18c70b`（收口轮；F-01 同序号重复投影修复 + N-01~N-05 登记，含 N-05 口径裁决） |

> **任务总量**：15 + 12 + 11 + 12 = **50 任务 / 27 波（S2·M29·L19）**；叶间顺序 `v4-1 → v4-2 → v4-3 → v4-4`（v4-2/v4-3/v4-4 门禁可并行分解、**执行严格串行**）；跨叶检查点 CP-0（spike 闸门 TASK-501）~ CP-4（V3-VOL-3 收口锚 TASK-811/812）；每叶收尾**全门禁必须绿**（AC-CHAT-023 / EC-CHAT-013）。

---

## 4. 门禁总账（末轮实测原文，计数只增不减）

| 门禁 | 末轮实测 | 备注 |
|------|:--:|------|
| `npm test`（node 全量） | **`tests 992 / pass 992 / fail 0`** | v4 起点 875 → 992（v4-1 881 → v4-2 924 → v4-3 947 → v4-4 992） |
| `test:supersession` | **33 / 0** | v3 末 14 → V4-1 24 → V4-2 30 → V4-3 31 → **33** |
| `test:l0` | **221** | v3 末 164 → V4-1 210 → V4-2 212 → V4-3 216 → **221** |
| `test:l1` | **111** | v3 末 103 → 111 |
| `test:l2` | **73** | v3 末 71 → 73 |
| `test:density` | **175** | v3 末 127 → V4-1 171 → V4-4 175（31 登记格机对零漂移） |
| `test:ui`（journey） | **167** | 保护段显式取代（新 pin），断言数不变 |
| `test:insight` | **116** | 不变 |
| `test:binding` | **192** | 保护段零 diff；环境性 flake 隔离复跑（见 §7） |
| `test:hardening` | **24** | 不变 |
| `test:e2e` | **PASS** | fixture + LGDL Workbench 全链 |
| `test:gate-integrity`（元门禁） | **12 / 12** | `CHROMIUM_GATES.length === 9` 未动；受审文件集合扩至新门禁 |
| `test:design-contract` | **6 / 6** | shim 逐条 **60 / 60** |
| `test:zero-injection` | **27 / 0** | 未授权站点零注入 |
| `test:page-input` | **106 / 0** | V4-1 102 → **106**（v4-4 收口轮新增 ⑯ 四条：同序号引用卡恰 1 张 + 被抑制投影仍写系统行） |
| `test:stream`（V4-2 新增） | **63 / 0** | 12 型卡 / 固化 / 回放 / 滚动 |
| `test:ask-auth`（V4-3 新增） | **61 / 0** | 终态机 / 留痕 / 零明文 |
| `test:recommendation`（V4-4 新增） | **49 / 0** | 真实产品路径（不经 seam） |
| `test:ref-pick-wiring`（V4-4 新增） | **11 / 11** | 拾取单一入口 / 禁止产品直呼纯模型 API |
| `test:size-ruling-vol3`（V4-4） | **10 / 10** | 闭合三值 + `min()` + 披露算术机核 |
| `test:l1-reverse` / `test:l2-reverse` | **9 条 / 10 条** | 全部「注入 → FAIL（命中 `expectFailPattern`）→ sha256 逐字节还原 → PASS」 |
| `npm run typecheck` / `npm run build` | **0 error / EXIT=0** | 体积见 §5 |

**纪律**：门禁**严格串行**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量落盘；计数**只增不减**、断言**零删除零降级**（唯一例外：journey 保护段按 ADR-V4-008 **显式取代**并留台账，不是静默删除）。

> **抽查 3 个数字与源核对（本轮）**：① `npm test` **992** ↔ 四叶产物（v4-4 `build.md` §收口轮门禁表 / `validate-report.md` §3.3）**一致**；② `sidepanel.js` **479,021** ↔ 源 `packages/web-cli-plugin/test/size-baseline.ts:301 SIDEPANEL_BASELINE_BYTES = 479_021` **一致**；③ 绝对上限 **563,200** ↔ 源 `size-baseline.ts#PENDING_ABSOLUTE_CAP.absoluteCeilingBytes = round(512,000 × 1.10) = 563,200` **一致**（`V3_VOL3_TIER_BYTES = ceilTo50KB(465,000) = 512,000`）。

---

## 5. 体积总账 + V3-VOL-3 闭合

| 产物 | 末轮登记值 | v4 段变化 | 说明 |
|------|:--:|:--:|------|
| `dist/content.js` | **177,076 B** | **0（零容差，全程未动）** | sha256 `52a82620…` 逐字节不变；v4 全程**零触碰** |
| `dist/pick-layer.js` | **33,900 B** | **0（零容差，全程未动）** | sha256 `5f567d7e…` 逐字节不变；页面侧拾取层零改动 |
| `dist/sidepanel.js` | **479,021 B** | **+212,521 B / +79.75%** | v4 段**显式五要素重登记 10 轮**（`v4-1` / `v4-2` / `v4-2-closeout` / `v4-3` / `v4-3-reviewfix` / `v4-4` / `v4-4-r2` / `v4-4-reviewfix` / `v4-4-i09fix` / `v4-4-closeout`），每轮均披露前后值 / 日期 / 来源 / 构建命令 / 理由 / 历史保留 + 逐模块 metafile 归因 |
| 轮内 ceiling（公式） | **502,972 B** | — | `floor(479,021 × 1.05)`；容差 **5% 未动** |
| **Feature 累计增幅** | **+79.75%** | — | `(479,021 − 266,500) ÷ 266,500`；**最差相邻对 +10.41%**（v4-1 → v4-2，<15% 告警线，仍如实登记） |

**sidepanel 增长链（v4 段，逐轮实测）**：
`375,102`（v3 末）→ **385,319**（v4-1 三区骨架）→ **425,442 / 425,094**（v4-2 build / review 修复轮）→ **426,487**（v4-2 收口）→ **440,698**（v4-3 流内化）→ **445,300**（v4-3 review 修复轮）→ **465,000**（v4-4 build，**V3-VOL-3 八步带值闭合**）→ **465,277**（v4-4 R2 裁决落地）→ **478,163**（v4-4 review 修复轮）→ **478,897**（v4-4 快修轮 I-09）→ **479,021**（v4-4 收口轮 F-01）。
> 说明：v4 是**净增** Feature（三区骨架 + 事件模型 + 卡族 + 流内化），增长来自**新必需模块 + 接线**，每轮都机器核对「Σ 逐模块 Δ + 未归因胶水 == 登记增量」（真实 `dist/build-meta.json`），**不是**以放宽上限换功能。

### V3-VOL-3 闭合（v3 收口时留下的显式硬义务）

> **义务原文（v3 closeout §9 B-补 8）**：「方案 F 重构（聊天流统一承载）落地收口时，必须重新定 `sidepanel` 体积基线并设置绝对值上限」。

| 项 | 值 |
|---|---|
| `B_final`（闭合时实测） | **465,000 B**（`stat -c %s dist/sidepanel.js`，v4-4 build 轮；`V3_VOL3_B_FINAL_BYTES` 保持该历史实测值**不改写**） |
| 档位 `ceilTo50KB(B_final)` | **512,000 B**（50 KB 档） |
| **绝对上限** `absoluteCeilingBytes` | **563,200 B** = 512,000 × 1.10 |
| 新基线 `newBaselineBytes` | **479,021 B**（随现行基线**同源前移**，走「作者确认占位」规则重登） |
| 生效上限 | `effectiveCeiling = min(563,200, floor(479,021 × 1.05) = 502,972) = ` **502,972 B** |
| `PENDING_ABSOLUTE_CAP` | **`resolved: true`**，三值齐备（`newBaselineBytes` / `absoluteCeilingBytes` / `resolvedOn` = 2026-09-19）；`evaluatePendingAbsoluteCap()` 通过；**未静默删除标记、未预填** |
| `SIDEPANEL_CEILING_CAP` | 保持 **`record-only`**（V3-VOL-1 ② 的「不设自缚装置」教训） |
| **`authorConfirmation`** | **`status: "pending-author-line"`（⏳ 待作者一行确认/否决）**——**作者可一行否决改值**；本文件与台账**均未伪称已确认**（`test/size-ruling-vol3.test.ts` 有机器判据：`resolved:true` ⇒ `authorConfirmation` 必存在 ∧ `status ∈ {pending-author-line, confirmed, overridden-by-author}` ∧ `date` 为 `YYYY-MM-DD` ∧ `pending` 必带理由） |

> **给作者的一句话（显著提示）**：**绝对上限 563,200 B（档位 512,000 × 1.10）是新设的分级红旗，作者一行可否决改值**；当前产物 479,021 B，距绝对上限余量 **84,179 B（+17.57%）**，距公式生效上限 502,972 B 余量 **23,951 B（+5.00%）**。

---

## 6. 过程中抓到的真问题（本流程的价值证明）

| # | 问题 | 级别 | 处置 |
|:-:|------|:--:|------|
| 1 | **假授权留痕**（v4-3 BLOCK-01）：`auth` 卡的 `cancelled` 终态在 3 条真实路径上都会被造出（会话切换 / 被新 ask 取代 / 回合结束），而渲染层把它映射为**「已批准」+ `data-decision="pending"`** —— 用户从未批准，界面与留痕却显示已批准 + 时间戳 + 审计入口 | **高（安全语义）** | 修：`authFixedText` 增 `cancelled` 分支 + `decisionState` 增 `cancelled` + 门禁「任一 `cancelled` 终态不得出现『已批准』、`data-decision` 不得为 `pending`」；validate 独立对抗确认三路径只渲染「已取消（未授权，不执行）」 |
| 2 | **假超时事实**（v4-3 BLOCK-02）：回合结束被当成 **60 s 超时**，把面板自有引用回合 ask（`ref-round-*`，本地发起、无计时器）结算为 `cancelled(timeout)` ⇒ 拾取→选用途链路可间歇性断掉，且留痕写下**从未发生的**「提问超时未答」 | **高** | 修：拆「回合结束」与「60 s 超时」两个 `AskCancelReason`；面板自有 ask 不随回合结束结算；门禁「`ask → pick → ref-round ask → done` 链上引用回合仍可答、不得出现超时系统行」 |
| 3 | **答案源断裂**（v4-3 BLOCK-03）：`rounds[]` 未按 ADR 退役（仍是 `input.ask` 差分推断），其唯一答案来源（`data-key="ask-option:*"`）随 `decision-card.ts` 删除而消失 ⇒ **所有**正常回答路径在 L1「已决策历史」记成**回落值**（上一条用户消息 /「（无回答）」） | **高** | 修：`rounds[]` 改由 `project()` 的已终态 `askuser`/`auth` 卡**事件派生** + 删死分支 + 门禁「从流内卡回答后 `rounds[].chosen` 必须等于真实答案」 |
| 4 | **审计入口死链**（v4-3 BLOCK-04）：刚决策的 `auth` 卡审计入口点击无反应（`patchAuthCard` 造 d 尾无 `onCardAction`，且回调先 `preventDefault()` 拦掉 `href="#audit"`）；门禁只断言文案含「审计」 | **高** | 修：`patchAuthCard` 透传真实 deps（或渲染器统一追加）+ 门禁「点击后 `[data-l2-view="audit"]` 必须可见」 |
| 5 | **推荐链路只在测试 seam 活着**（v4-4 BLOCK-01）：`maybeRecommend` 仅 seam 一个调用点 ⇒ 生产中 `nextstep` 卡**恒 0 张**（功能声称有、产品不可达） | **高** | 修：三处真实时机接线（拾取后 / 引用失效后 / 空闲=回合结束且 `openAsks===0`）+ 产品路径门禁（经 SW 的真实 `ref-captured` → 面板真实 `onMessage`，**不经 seam**）；顺带修掉 `label()` 密钥形状抛错；快修轮再补「首装」时机（I-09：新增 `maybeRecommendFirstRunEntry()` 于 `firstRun` 事件化点） |
| 6 | **通道归并 2/7 + 宿主判据空转**（v4-4 BLOCK-02）：FR-CHAT-054 的 6+ 通道只归并 nav/notice 两条；「过渡宿主清零」靠**移除 `data-transitional-host` 属性**达成 ⇒ 判据可被「删属性充数」绕过 | **高** | 修：剩余 5 通道（`#env-guard`/`#site-hint`/`#onboarding`/`#discovery-notice`/`#send-reason`）经 `systemRow()` 事件化 + 新增 `host-registry.ts` **结构性**判据（登记集合 == 实存宿主集合 ∧ 过渡计数 0 ∧ 退役容器零 DOM 残留）+ 5 组 forged reading 判红 |
| 7 | **死控件**（v4-4 BLOCK-03）：失效卡「改用描述」的兜底提交 `describe-submit` 无处理分支（点击落占位） | **高** | 修：`handleCardAction` 落地 `submitDescribe`（卡侧不再双铸兜底输入）+ 断言「兜底唯一 + 提交即留痕 + 无占位」 |
| 8 | **`payload` 浅冻结**（v4-2 F-01，append-only 缺口）：事件本体冻结但 `payload.options` 数组未冻结 ⇒ 事件 / `CardView` / caller **三处均可改写**，`project()` 结果随之改变 | 中 | 修：`deepFreeze` 入/出口，三条改写路径全堵死 + 2 条反证用例 |
| 9 | **`seq` 回退可逆序**（v4-2 F-02）：`stream-merge` 接纳「小于当前最大值且未占用」的 seq ⇒ 事件数组可逆序 | 中 | 修：只接纳 `seq > 已知最大值` + `mergeSkipped` 计数 |
| 10 | **密钥形状夹带**（v4-2 F-03）：`sanitizeLabel` 先截断后扫描 ⇒ 71 位处截断后落库含 `sk-ABCDEF`（密钥前 9 字符） | 中 | 修：顺序反转为「先全串扫描再截断」 |
| 11 | **同序号引用卡重复投影**（v4-4 F-01，低）：`dom-gone` 救援观察落地时同一事实投影两次（`data-ref-num = ["1","1"]` 两张失效卡）；旧守卫让「顺带写可读系统行」绕过抑制 | 低 | 修：投影唯一性键 = `refNum + 状态`；被抑制时**仍照写可读系统行**（事实不静默丢弃），真实状态迁移照旧投影新卡；两段证伪（回退 ⇒ `page-input` 104/2 rc=1；还原 ⇒ 106/0 rc=0） |
| 12 | **产品级假提示帧**：回合边界追加推荐卡后「发送后无条件滚到底」出现一帧「回到底部」假提示 | 低 | 修：终帧补 `updateScrollHint()` |
| 13 | **门禁/清单真实性**：v4-4 的 `v4-4-reviewfix` 披露元组写「+12,683 B / +2.73%」而登记字段实测 **+12,886 / +2.77%**（旧判据只查「非空 ∧ before < after」） | 中 | 修：新增 `validateReRegistrationDisclosure` **披露算术机核**（元组前后值/Δ/百分比必须与登记字段逐项相等）+ `META.measuredBy` 与末条登记同源机核 |
| 14 | **导出仅测试可见的纯模型旁路**（v4-4 N-01）：`switchStreamSession` 仍能构造绕过唯一通道的 `kind:'system'` 事件（无净化/去重/速率） | 低 | 登记：产品路径**零调用**由 `test:ref-pick-wiring` I-02 机核（扫描 `src/ui/sidepanel/**` 禁止产品侧直呼）；已有 doc-comment 逐字声明「PRODUCT must not call this」 |
| 15 | **验证面（价值证明）**：终态机 **10,000 序列 · 240,748 断言 0 漏洞**（10 操作字母表长度 4 全排列 × 每步 5 类不变量）；v4-1 **13 条密度对抗探针**（10 自写 + 3 真门禁注入）全部红→还原→绿；v4-4 **86 条独立探针断言**（node 49 + Chromium 37）全绿；v4-2 **62 条独立探针断言** | — | 对抗优先，未采信 build/review 自报数值；「换口径 = 放松」这一最大风险经对抗探针证伪（阈值逐字不变，default 恰 7 → 恰 5、chars 容差 8→3 均为**收紧**） |

---

## 7. deferred / 已知限制清单（逐条，如实登记，不冒充已修）

1. **N-05 重锚按钮不在流内卡内**（v4-4，**口径裁决**，编排器 2026-09-20）：spec FR-CHAT-052 的「卡内」按「**恢复路径可达即可**（L1 面板与卡内二选一）」读 —— 一键重锚按钮 `#l1-ref-rescue` 位于 **L1 引用证据面板**（唯一文本匹配时可见），失效卡引导至该面板 ⇒ 功能等价。**登记为已知偏差**（不改实现：搬进卡内会新增可点控件，须重审卡预算/密度登记格）。升级条件：真机反馈需要卡内按钮 ⇒ 小改进项。
2. **`test:binding` 环境性 flake**（v4-2 N-01 / v4-4 N-03，`docs/v4-supersession-ledger.json#knownLimitations` **`KL-N-10`** 同源）：串行链首轮偶发红且**每次失败项不同**（如 `#6l residual=undefined` / `#8d/#8e no confirm`），`binding.mjs` 对基线**零 diff**、隔离复跑即绿（v4-4 收口轮：首轮红 → retry2/retry3 **192/192**）。**纪律**：串行 / 首轮异常隔离复跑 ≥2 / 日志全量 / 仍红如实记录不阻塞收口；建议三处时序断言加就绪等待或有界重试（本轮未做）。
3. **`BUILD_STAMP` ⇒ 产物 sha 非不变量**（v4-4 N-02，`KL-N-08` 同源）：`sidepanel.js` 的 sha 随构建戳变化，**字节数恒定**；登记的不变量是**字节（+ metafile 归因 + 门禁）**，**不是 sha**。红线产物（`content.js` / `pick-layer.js`）无构建戳 ⇒ sha 仍是稳定不变量（本轮复核 `52a82620…` / `5f567d7e…`）。
4. **纯模型旁路 `switchStreamSession`**（v4-4 N-01）：产品路径零调用（布线门禁 `test:ref-pick-wiring` I-02 拦截 + doc-comment 声明），但跨包直接 import 纯模型 API 仍可构造绕过唯一通道的系统事件；**未**新增注释说明（esbuild 未 minify ⇒ 注释会进产物字节 ⇒ 同一轮会触发第二次五要素重登记）——按「既有声明 + 机核门禁」口径处置。
5. **`staleRef` 夹具序敏感（机制已消除，未设独立门禁）**（v4-4 N-04 / I-04）：`testing.reset()` 已清空 `projectedRefState`（机制面消除；登记顺序下 density 175/175 ∧ l1 111/111 绿）；**跨夹具顺序置换的独立门禁属增量可选**，本轮未新增（与 F-01 新断言重叠同一机制）。
6. **未解释胶水口径**（v4-2 §11 偏差 4）：`sidepanel.js` 的 esbuild 共享胶水自检口径从绝对 `< 1,000 B` 调整为 `< 1,500 B`（随输入模块数 57→69 自然增长）**并新增更严的相对口径 `< 2%`**（实测 0.76%）；**该值不是产品阈值而是归因自检**，已登记（`test/size-growth-evidence.test.ts` 注释 + v4 台账 `V42-E-VOL-1`），**不是纯放宽**。
7. **首装入口的时序面**（v4-4 残余）：首装推荐入口在「`llm-status` ∧ `state` 双落地」后求值一次；若面板在双落地前即进入首装，两处求值点覆盖两种情况，但**未另设**「半加载面板不得产卡」的独立 Chromium 断言（以代码前置判据 + ⑬ 的真实首装断言覆盖）。
8. **V3-VOL-3 绝对上限的作者确认仍挂起**：`authorConfirmation.status = pending-author-line`（见 §5）——**属未闭合义务，不是已完成项**。
9. **密度打开态类残余**（承 v3 口径）：v3 留下的「L2 入口面板打开态未测」等密度口径边界随 v4 重定标延续，登记在 `docs/v4-density-baseline.json#knownLimitations`；v4-1 起密度基线改为 31 登记格 + RP-V4-09，**打开态未新增登记格**。
10. **元门禁对部分门禁仅静态覆盖**（承 v3）：`STATIC_ONLY_GATES` 机制不变；v4 新门禁（`stream` / `ask-auth` / `recommendation` / `ref-pick-wiring`）均纳入受审集合与 `test:v3` 链，但未做「逐门禁强制变红」的全量 Chromium 实跑。
11. **A2A（F-29）未立项**（ROADMAP 保持原样不动）：`F-29` = A2A 双向互通候选，**未立项未排期**，不因 v4 收口变更状态（v4 父收口对 ROADMAP 的 F-29 区段**一字未动**，见 §9 C）。
12. **人工面未执行**：见 §8（**不得冒充 PASS**）。

---

## 8. 人工面清单（全部 `⏳ 未执行`，不冒充 PASS）

> **口径说明（如实）**：四叶 validate 报告的人工面登记为 **0 项**（v4-1 `validate-report.md` §1 明写「人工面 0 项；本叶无 headless 不可合成的验收面」；v4-2/v4-3/v4-4 同口径登记 0 / 0 / 0，v4-4 另登记 1 项「重锚新卡序号的端到端 DOM 复现」为**无法执行**）。父 spec **AC-CHAT-024** 要求「人工面清单逐项标注未执行或 PASS，不得冒充 PASS」——本节由**父收口**按 Feature 的验收面（观感 / 体感 / 真实权限弹窗）**补齐为父级清单**，全部 `⏳ 未执行`（headless 不可合成真实手势 / 权限弹窗 / 人工观感），**未跑门禁的原因 = 本轮为纯文档/状态收口（零代码/测试改动）**。

| # | 人工面 | 说明 | 状态 |
|:-:|--------|------|:--:|
| 1 | 三区布局真机观感 | 工具栏 / 聊天流 / 状态栏在真实侧栏（非 tab 打开）下的观感与「一眼看懂在哪 / 谁在管 / 下一步做什么」 | ⏳ 未执行 |
| 2 | 聊天流滚动与固化观感 | 追加式滚动（用户上滚不抢滚动）/ 卡片固化前后观感 / `.ts` 时间戳可读性 / 冻结卡不跳动 | ⏳ 未执行 |
| 3 | 明暗双主题观感 | `auto→light→dark` 三态在真实站点的观感与跟随系统 | ⏳ 未执行 |
| 4 | 320px 窄栏真实体感 | 真实侧栏拖到 320px：三区布局 / 风险 chips 收缩 / 卡内控件可点性 | ⏳ 未执行 |
| 5 | 拾取 → 推荐卡真机链 | Alt 悬停 / 拖动 / 右键菜单 / 拖选气泡 → 引用卡 → 下一步推荐卡（chips 即指令）在真实站点的端到端观感与可用性 | ⏳ 未执行 |
| 6 | 授权卡真实弹窗体感 | 破坏性确认 / 站点授权在真实权限弹窗下的体感 + 后果预演可读性 + 批准/拒绝固化观感 | ⏳ 未执行 |
| 7 | 系统事件行观感 | 6+ 通道归并后的稳态降噪效果（是否会刷屏 / 「持续：」行是否可读） | ⏳ 未执行 |
| 8 | 键盘真实体感 | 真机 Tab 序 / `:focus-visible` / 固化后焦点落点 | ⏳ 未执行 |
| 9 | 读屏真实体感 | `role=log` / `aria-live` 固化播报粒度（逐卡 / 汇总） | ⏳ 未执行 |
| 10 | 多显示器 / 高 DPI | 高 DPI 下的字号、描边、图标清晰度 | ⏳ 未执行 |
| 11 | 重锚救援真机体感 | deepseek 类站点构造「文字可见但选择器断链」→ 失效卡 → L1 面板一键重锚（N-05 口径：按钮在 L1 面板而非卡内）| ⏳ 未执行 |
| 12 | 引用角标 ↔ 卡片双向高亮真机 | 页面侧角标与流内 `ref` 卡的同序号对应观感 | ⏳ 未执行 |

---

## 9. 建议的下一步

**A. 作者一行决策（阻塞性最低、但必须由作者给出）**
1. **V3-VOL-3 绝对上限确认/否决**：新基线 **479,021 B** / 档位 **512,000 B** / 绝对上限 **563,200 B**（= 档位 × 1.10）/ 生效上限 **502,972 B**。`authorConfirmation.status` 仍 `pending-author-line`——**作者可一行否决改值**；确认后该义务才算真正闭合（现为「带值闭合 + 作者占位」）。

**B. 真机人工面验收（headless 无法替代，重点见 §8）**
2. 重点验：**一切交互留痕**（过程性问答 / 授权记录 / 系统事件 / 引用失效是否都在流内可回看、各有时间戳）；**无浮层过程**（不再有流之上的独占决策槽、底部瞬时提示条、顶部永不折叠风险带）；**引用失效 → 重锚链**（失效卡 → L1 面板一键重锚 → 旧卡保留）。
3. 三区布局在 320 / 400 / 520px 侧栏宽度下的真实观感 + 明暗双主题 + 键盘/读屏走查 + 多显示器/高 DPI。

**C. 版本与发布**
4. **合 main / 发布时机由作者决定**：v1（F-14）/ v2（F-27）/ v3（F-28）/ v4（F-30）**均在 `feature/web-cli-plugin`，未合 main、未发布**（`main` = `2ddc922` 未动）。ROADMAP 已按 **v0.9.0 三主题并列**登记（F-28 + 工程质量 + **F-30**），文档版本 `1.26.0 → 1.27.0`。
5. **F-29（A2A 候选）**：未立项未排期，本轮一字未动；如要推进需作者立项。
6. **承前非阻塞项**（可选）：`test:binding` 时序断言加就绪等待/有界重试（`KL-N-10` 建议）· N-05 若真机需要卡内重锚按钮则作小改进项（须重审卡预算/密度登记格）· 元门禁补做静态覆盖门禁的强制变红实跑。
