# 审查报告：specs-tree-v5-3-chrome-face

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: review.md（C1~C39 审查清单及四维度指引）
> **前置依赖**: review.md、spec.md、plan.md、build.md（R1/R2）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-22
> **审查轮次**: R1（静态审查）
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-22
> **更新说明**: 初始创建。审查对象 = HEAD `f8e50e8`（v5-3 R2 终轮，builded）；叶基线 = leafBase `9b262ae`。**结论 ❌ 不通过（1 阻塞）**：FR-ALLN-086⑤ / AC-ALLN-012 / ADR-V5-006 §2⑤「L2 树视图站点行指向 chip（不复制状态）」未落地且 build 声明为已完成；另有 5 项改进建议与 3 项观察。

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 39（C1~C39） |
| 通过 | 33 |
| 警告（改进） | 5 |
| 失败（阻塞） | 1 |
| 阻塞问题 | **1** |
| 规范符合率 | 33 / 39 = 84.6% |

**审查范围**：源码 13 个（`cards/error.ts` / `statusbar.ts` / `view-model.ts` / `l0/risk-rail.ts` / `stream-model.ts` / `stream-plaintext.ts` / `chat-state.ts` / `sidepanel.ts` / `index.html` / `next-registry/providers.ts` / `l2/audit.ts` / `security/audit-sink.ts` / `background/service-worker.ts`）+ 反查 `src/insight/**` · `src/ui/tree/**`；门禁 12 个；台账 3 个（`docs/v4-supersession-ledger.json` / `docs/v4-density-baseline.json` / `test/size-baseline.ts`）。

**独立复跑（门禁抽跑 13 项）**

| 门禁 | build 声明 | 本轮独立复跑 | 判定 |
|---|---|:--:|:--:|
| `npm test` | 1181 / 0 | **1181 / 0** | ✅ |
| `test:law8`（新） | 25 / 0 | **25 / 0** | ✅ |
| `test:dead-end`（新） | 29 / 0 | **29 / 0** | ✅ |
| `test:auth-chip`（新） | 30 / 0 | **30 / 0** | ✅ |
| `test:density` | 242 / 0 | **242 / 0** | ✅ |
| `test:l0` | 248 / 0 | **248 / 0** | ✅ |
| `test:zero-injection` | 28 / 0 | **28 / 0** | ✅ |
| `test:stream` | 73 / 0 | **73 / 0** | ✅ |
| `test:ask-auth` | 71 / 0 | **71 / 0** | ✅ |
| `test:l2` | 74 / 0 | **74 / 0** | ✅ |
| `test:ui`（journey） | 171 PASS | **171 PASS** | ✅ |
| `test:binding` | 192 PASS | **192 PASS**（首轮 CDP socket 环境性 flake，隔离复跑通过） | ✅ |
| `test:insight` | 116 PASS | **116 PASS**（其中 `#I-20a` 钉死树站点行「已授权」——见 BLOCK-01） | ⚠️ 见 BLOCK-01 |

**红线复验（逐字节）**：`dist/content.js` **177,076 B** / sha `52a82620…`；`dist/pick-layer.js` **33,900 B** / sha `5f567d7e…`；`design/**` · `manifest.json` · `KIND_SET` · `docs/v3-supersession-ledger.json` · `ROADMAP.md` · 判定链（`policy.ts` / `auto-authorize.ts`）`git diff 9b262ae..f8e50e8` = **零 diff**。`dist/sidepanel.js` 实测 **546,370 B** == 登记值。

**保护段独立复算（锚点切片 + sha256）**：journey `startByte 43054 / endByte 58287 / sha cc79f413… / 240 行` **三项 MATCH**；binding `startByte 107780 / endByte 115930 / sha be9ad0e9…` **MATCH**（`decision = keep`）。

## 2. 逐项审查结果（C1~C39）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `cards/error.ts` 出生铸造恢复区 | FR-ALLN-012 | ✅ | 恢复区与气泡同一 `createErrorCard` 调用内完成；`recovery ?? []` 缺省零 chip（test:stream ⑩「非阻塞零 chip / 出生后不 patch」绿） | — |
| C2 | `providers.ts#blockedRecovery` 派生 | FR-ALLN-015 | ⚠️ | 顺序耦合（见 I-05） | 低 |
| C3 | `statusbar.ts` 唯一写入者 + 两态 | FR-ALLN-085/092 | ✅ | `data-auth ∈ {yellow,green}`、逐字文案、`if (auth.hidden) auth.hidden = false`；两态恒显其一 | — |
| C4 | `sidepanel.ts` 点击 / 管理详情 / 窄屏观测器 | FR-ALLN-087/088/090 | ✅ | 黄→dispatch nextstep（act=authorize）+ notice；绿→折叠切换 + `aria-expanded` 同步；`installNarrowObserver` 用 `ResizeObserver(panel.clientWidth)` 非 `matchMedia` | — |
| C5 | `l2/audit.ts` + `audit-sink.ts` + SW `maskedLength` | NFR-ALLN-011 | ✅ | 两处（`toAuditRow` / SW `llm-config`）均只接受 `'8+' \| '8-'` 字面量，其他形状丢弃 ⇒ 不构成长度侧信道 | — |
| C6 | `view-model.ts` / `risk-rail.ts` 载体重锚 | FR-ALLN-086 | ✅ | `toolbarDigest` 去 auth 段；`renderRiskRail` 由 `RAIL_RISK_CLASSES` 过滤 ⇒ `unauthorized` 零渲染 | — |
| C7 | 工具栏摘要 `data-status-dot` 颜色通道 | FR-ALLN-085/086 | ⚠️ | `statusDot = authorized ? 'ok' : 'warn'`（见 I-02） | 低 |
| C8 | `#auth-state` 两态恒显逐字 | FR-ALLN-085 | ✅ | 实测 `yellow：未授权 · 零注入` / `green：已授权 · supported`；`hidden === false` | — |
| C9 | 零双写 ①③④ | FR-ALLN-086①②③④ | ✅ | 工具栏 digest 只 `origin · 会话`；rail 授权类 0；状态栏第一行 `L2_BAR_TEXT` 无授权态 | — |
| C10 | 零双写 ② 四词扫描口径 | FR-ALLN-086② | ⚠️ | `supported` 未按裸词扫描（见 I-01） | 中 |
| C11 | 零双写 ⑤ L2 树视图站点行 | FR-ALLN-086⑤ / AC-ALLN-012 | ❌ | **BLOCK-01**：树站点行仍渲染「已授权 / 未授权」徽标；"指向 chip"的静态 note 运行期被 `tree-drawer.ts:215 root.replaceChildren()` 清除 | **阻塞** |
| C12 | 黄点击 → `op.authorize` next + 系统行 | FR-ALLN-087 | ✅ | test:auth-chip ③ 绿；点击前后 `#view-host`/`#settings-view` 可见性不变（不跳走） | — |
| C13 | 绿点击管理详情 | FR-ALLN-088 | ✅ | 默认 `hidden` + `data-density-exempt`；展开 6+1=7 ≤7；`<select>` 含 `op.revoke`/`op.rebind`；键盘可达 | — |
| C14 | 280–640 拖动（设计稿契约）+ 诚实登记 | FR-ALLN-089 | ✅ | 产品侧零宽度控件（W3 扫描 7 模式零命中）；`knownLimitations[7]` 显式登记「产品侧不实现」 | — |
| C15 | `data-narrow` + 三档 radio 零残留 | FR-ALLN-090 / EC-ALLN-014 | ✅ | 实测 360→`true` / 361→`false`；R-V5-106 反证（宽视口+窄面板）绿 | — |
| C16 | 登记格 = 控件计数（宽度解耦） | FR-ALLN-091 | ✅ | W4（测量口径零宽度通道）+ density ⑯「320 vs 520 逐项相等」；31 格不删 | — |
| C17 | 单写者 + J1~J4 + 6 ≤ 7 | FR-ALLN-092 | ✅ | J1~J4 四条绿；默认可点 6、展开 7 | — |
| C18 | `error` 出生恢复（含冻结集不动） | FR-ALLN-012 | ✅ | `BORN_FROZEN_KINDS` 逐字未改（diff 仅新增 `recovery?` 类型位）；非阻塞零 chip | — |
| C19 | 死端守护门禁 | FR-ALLN-015 / AC-ALLN-002 | ✅ | 5 类逐类 deadEnd=false；同屏 5 载体死端 0；双注入 FAIL→还原 PASS；单源 5 字面量第三处即红 | — |
| C20 | 法八四面 + 四注入 + key 直写 | FR-ALLN-023 / AC-ALLN-003 | ✅ | 四面零命中；四注入逐条 FAIL→还原 PASS；`sidepanel.ts#keyStore.save(` == 1；哨兵只落 key-store | — |
| C21 | 存储侧边界口径 | FR-ALLN-024 | ✅ | build.md §8.5.3 明示 out-of-scope；全文无「存储已加密」类声明 | — |
| C22 | X5 等价重锚 | FR-ALLN-114/116 | ✅ | `tiers` 31 格重锚 + `v5Ledger`（`registeredCells 31` / `machineCompared 28` / `nominal 3`）；阈值 `7/15 · 9/20 · 17/35` 逐字 | — |
| C23 | 计数只增 + 共享面恰一次 | FR-ALLN-003/004 | ✅ | 各门禁计数 ≥ 基线（见 §1）；`s2-chain.mjs` 被 node 侧与 Chromium 侧**导入不复制** | — |
| C24 | 门禁等价重锚 | FR-ALLN-120 | ✅ | `modifiedRanges[]` 含 `V53-MR-binding-*` 五要素；13 条载体重锚后四门禁全绿 | — |
| C25 | 反证两段证伪 | FR-ALLN-121 | ✅ | 三门禁注入段日志核验：FAIL 段文本 == `expectFailPattern`，还原后 PASS | — |
| C26 | journey 保护段 | FR-ALLN-122 / AC-ALLN-018 | ✅ | 三值独立复算 MATCH；保段「显式二选一」在 build §6.2/§8.1 登记 | — |
| C27 | `knownGap` / 台账链式 | FR-ALLN-123 | ✅ | `test:supersession`（含 `protectedPinFailures` + RP-V4-08）在 `npm test` 内绿（1181/0） | — |
| C28 | 串行纪律 + `KL-N-10` | FR-ALLN-124 | ✅ | 本轮 binding 首轮 `CDP socket not open` → 隔离复跑 192 PASS，属环境性 flake（R-ALLN-015 纪律） | — |
| C29 | 新门禁入 `gate-integrity` | FR-ALLN-125 | ✅ | `EXPECTED_AUDITED_FILES` 追加三新门禁；`gate-integrity` 15/0 | — |
| C30 | 体积五要素 / 档位 / 绝对上限 / 占位 | FR-ALLN-130~134 | ✅ | 542,064 → **546,370 B**（Δ +4,306，Σ 模块 +4,306 + glue 0）；档位 563,200 / 绝对上限 619,520 / `pending-author-line` 三不动；超行预算**显式登记**（§8.5.1） | — |
| C31 | ADR-V5-006 五条遵循性 | ADR-V5-006 §2 | ❌ | 同 C11（⑤ 未落地） | **阻塞** |
| C32 | ADR-V5-007/009/010 落地 | plan §2.3~2.4 | ✅ | 观测器 / `nextOf` 双形态 / 四面判据与 ADR 逐条对应 | — |
| C33 | ADR-V5-012 收口侧 | plan §2.5 | ✅ | 保护段保段 + `leafBases['v5-3' leafBase 9b262ae]` + `v3Vol3Closeout.⑤.newBaselineBytes → 546,370` | — |
| C34 | 红线零 diff | tasks.md §0 | ✅ | 见 §1「红线复验」 | — |
| C35 | 三新门禁存在 + 核心覆盖 | FR-ALLN-125 | ✅ | `law8-plaintext.mjs` / `no-dead-end.mjs` / `auth-chip.mjs` 实跑 25/29/30 | — |
| C36 | 边界 / 负面覆盖 | EC 组 | ✅ | 360/361、非阻塞零 chip、第 6 类注入、chips hidden↔可见、空/零风险 | — |
| C37 | 注入反证有效性 | FR-ALLN-121 | ✅ | 4（法八）+ 2（死端）+ 3（auth-chip）逐条实跑 FAIL / 还原 PASS | — |
| C38 | 断言有效性 + 「S2 全链」口径 | FR-ALLN-011/016 | ⚠️ | Chromium 侧「S2 全链主验收」实际覆盖面窄（见 I-03） | 低 |
| C39 | v5-2 移交 N-04~N-09 | build §8.5 | ⚠️ | 零登记（见 I-04） | 中 |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C1~C7） | 7 | 5 | 2 | 0 | 71.4% |
| 规范符合性（C8~C30） | 23 | 21 | 1 | 1 | 91.3% |
| 架构一致性（C31~C34） | 4 | 3 | 0 | 1 | 75.0% |
| 测试质量（C35~C39） | 5 | 3 | 2 | 0 | 60.0% |

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| BLOCK-01 | `src/insight/project-tree.ts:99-107` → `src/insight/ownership-tree.ts:327` → `src/ui/tree/tree-drawer.ts:622-630`；`src/ui/sidepanel/index.html:1275` | **FR-ALLN-086⑤ / AC-ALLN-012 / ADR-V5-006 §2⑤「L2 树视图站点行改指向 chip（台账不复制状态）」未落地**：① L2 树视图（`[data-l2-view="tree"]` 内 `#tree-drawer`）的站点行仍渲染授权态徽标「已授权 / 未授权」（`siteBadges` → 站点节点 `badges` → `.tree-badge`）；② 唯一的「指向 chip」静态文案写在 `#tree-drawer` 的 `.tree-note`，而 `tree-drawer.ts:215 root.replaceChildren()` 在首次打开时清除该节点 ⇒ 该文案运行期不可见；③ `test/ui/insight.mjs:1739` 的 `#I-20a` 仍**断言**站点行 `siteAuthorized === '已授权'`（本轮独立复跑 116 PASS）⇒ 第二投影被门禁钉死。build.md §2/§3 却称「L2 树视图站点行改指向 chip（不复制状态值）」且 TASK-V5-165 标 ✅ completed —— 声明与产物不符 | C11 / C31 | 二选一：(a) **修**——把站点节点徽标里的授权态值移除或改为「授权状态见状态栏 chip」指针，并同步**等价重锚** `test/ui/insight.mjs#I-20a`（读数面改 `#auth-state`，注入反证 + `modifiedRanges[]` 逐行登记）；或 (b) **显式登记偏离**——若决定保留（须先回父 `spec.md` / ADR-V5-006 说明树视图台账豁免 ⑤ 的理由），并在 build.md 撤销「已完成 / 不复制状态值」的声明。禁止维持现状 + 伪称完成 |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-01 | `test/ui/auth-chip.mjs:44-50` + `src/ui/sidepanel/view-model.ts:904-906` | FR-ALLN-086② 字面要求「四词（未授权/已授权/零注入/**supported**）工具栏区零出现」，而 gate 仅以 3 裸词 + 2 短语（`已授权 · supported`）扫描；supported 站点下工具栏 `#status` = `站点 <origin> · 发现=supported` 含裸词 `supported`，本轮该场景 gate 仍 PASS（扫描不覆盖）。build.md §3 已登记此口径，但 spec/ADR 权威条文未回写 | C10 | 把「supported 以授权短语为准 / `发现=` 为无关事实」的口径登记进父 spec 或 ADR-V5-006（当前仅在 build.md），使判据与条文对齐；或把 `发现=<state>` 作为显式允许出现项列出（白名单式，非静默扩口径） |
| I-02 | `src/ui/sidepanel/view-model.ts:894` + `src/ui/sidepanel/l0/shell.ts:123-127` | 工具栏摘要 `data-status-dot` 仍随 `authorized` 取 `ok`/`warn` ⇒ 工具栏区存在授权态的**颜色通道**第二投影；四词（词面）扫描不覆盖 | C7 | 登记该口径，或令 dot 只反映连接/无 origin 等非授权信号 |
| I-03 | `test/ui/no-dead-end.mjs:205-214` | 「S2 全链 10 环节主验收」实为 `S2_CHAIN.length === 10` + `form2 > 0`，未逐环节驱动 ⑥⑦⑧⑨⑩；逐类/逐环节判据实际在 node 侧 `test/s2-deadend-chain.test.ts` | C38 | 更名（如「S2 链共享样本导入 + 阻塞段死端 0」）或补足环节驱动，避免措辞强于判据 |
| I-04 | `build.md` / `tasks.md` / `state.json` / 台账 | v5-2 移交观察项 **N-04~N-09**（N-08 明示「建议登记给 v5-3 / 后续波次统一」）在本叶**零登记**；末叶 / 收口叶未做显式处置 | C39 | 在 build.md 收口节逐项处置（闭环 / 转 N 登记 / 明确范围外+owner），保持 F/N 账连续 |
| I-05 | `src/ui/sidepanel/next-registry/providers.ts:68` | `blockedRecovery` 以 `['site','','','hardFloor','refInvalid'][BLOCKED_TERMINALS.indexOf(blocked)]` 做**顺序耦合**映射，无编译期保护；枚举顺序一变即静默错配 | C2 | 改为显式 `Readonly<Record<BlockedTerminal, RecoveryTrigger>>`，或从 `OPS_RECOVERY_ROWS` + 触发器单源派生 |

**观察项（不阻塞，不计入改进数）**：O-1 台账 `counts`（l0 216 / density 171 / journey 167）滞后于本轮实测（248 / 242 / 171），floor 为下界故未红；O-2 `RISK_COPY.unauthorized` / `RISK_CLASSES` 5 值仍保留但零渲染（历史派生源，非双写），建议注释标注「只可派生、禁止渲染」；O-3 `riskIncrementRegistry.reanchorV5.previousExpectation.reason` 叙述值（`7/7/18/208`）与 `v45Ledger` 实际前值（`chars 237`）不一致（历史叙述笔误）。

## 6. spec ↔ 产物收敛（抽 6 FR）

| FR | spec 要求 | 代码 / 判据落点 | 收敛 |
|---|---|---|---|
| FR-ALLN-085 | `#auth-state` 常显两态、逐字、状态 ≡ `site.authorized` | `index.html:1333` + `statusbar.ts:58-65` + `l0/risk-rail.ts:44-46#AUTH_STATES` + `test:auth-chip` ① | ✅ |
| FR-ALLN-086 | 唯一常显载体 + 零双写五条 | ①`view-model.ts:829-834` ②四条扫描（**②口径见 I-01**）③`risk-rail.ts:37/238` ④`view-model.ts:759` ⑤**未落地（BLOCK-01）** | ⚠️ 4/5 |
| FR-ALLN-087 / 088 | 黄点击产 next + 系统行；绿点击管理详情 | `sidepanel.ts:3283-3305` + `index.html:1343-1351` + `test:auth-chip` ③ | ✅ |
| FR-ALLN-090 | `data-narrow` ≤360；三档 radio 零残留 | `sidepanel.ts:3485-3494` + `index.html:167` 样式块 + `test:density` ⑯ / W2/W3 | ✅ |
| FR-ALLN-012 | `error` 出生带恢复区（阻塞带 / 非阻塞不带） | `cards/error.ts:25-40` + `stream-model.ts:242` + `chat-state.ts:559-567` + `test:stream` ⑩ | ✅ |
| FR-ALLN-023 | 法八四面零明文 + 全属性 + 哨兵反证 | `law8-plaintext.mjs`（`SCAN_1..4` + 四注入）+ `stream-plaintext.ts#DIGEST_MASK` + `l2/audit.ts#maskedLength` | ✅ |

## 7. 结论

**结论**: ❌ **不通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 84.6%（33 / 39） |
| 阻塞问题数 | **1** |
| 规范符合性偏差 | 6 项（1 阻塞 + 5 改进） |
| 可进入 validate | **否**（须先闭环 BLOCK-01 / 至少修 I-01、I-04） |

**理由**: 本叶三条主轴（死端守护门禁 / 法八四面机核 / 授权 chip 两态与黄绿点击）+ 密度连续口径解耦（X5）+ 体积收口 + 红线冻结面均在源码与门禁中**真实落地且可独立复现**（13 项门禁复跑全绿、体积 546,370 B 与登记一致、保护段三值独立复算 MATCH、红线零 diff）。但 **FR-ALLN-086⑤ 这一 P0 明文条款未落地**（L2 树视图站点行仍渲染授权态词、被 `test:insight #I-20a` 钉死，而 build.md 声明已完成），构成规范符合性阻塞；另有四词扫描口径（I-01）与 v5-2 移交项处置（I-04）两项需在 validate 前显式登记或修复。故判定 ❌ 不通过，需返回 `@sddu-build` 做定向修复轮。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 静态审查，对象 HEAD `f8e50e8` / 基线 `9b262ae`）：C1~C39 逐项；独立复跑 13 项门禁；红线/保护段逐字节复验；结论 ❌ 不通过（BLOCK-01 = FR-ALLN-086⑤ 未落地；5 改进 + 3 观察） | 2026-09-22 | SDDU Review Agent |
