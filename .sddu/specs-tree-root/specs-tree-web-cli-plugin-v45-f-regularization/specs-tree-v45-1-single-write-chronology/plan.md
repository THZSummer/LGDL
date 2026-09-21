# 技术计划：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化；实施承载叶）

> **文档定位**: SDDU 技术方案（**实施承载叶**）—— 记录架构设计、方案对比、12 条 ADR、文件影响与风险缓解，作为 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md` v1.0（44 FR / 8 NFR / 13 EC / 22 AC / 17 NG / §11 37 条元素去向 / §14 风险）+ 父 `../discovery.md` v1.0（Q-REG-001~012 / R-REG-001~015 / O-REG-001~009 已全裁决）+ 本叶 `spec.md` v1.0
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-21
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（V4.5-1 实施技术方案：**ADR-V45-001~012** 全部正文 + 五波实施序 + 63 项文件影响 + 风险登记（继承 R-REG-001~015 / R-REG-901~906 + plan 新增 R-V45-101~109））。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`、不改 v1/v2/v3/v4 SDDU 目录、不改 ROADMAP、不动 `main`、**不跑门禁/构建/Chromium**、**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 |
|--------|:--:|------|
| 父 `spec.md` 存在 | ✅ | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v45-f-regularization/spec.md`（602 行，v1.0） |
| 叶 `spec.md` 存在 | ✅ | 同目录 `specs-tree-v45-1-single-write-chronology/spec.md`（236 行，v1.0） |
| 父 `discovery.md` 存在 | ✅ | 506 行 v1.0（Q-REG-001~012 / A-REG-001~008 / R-REG-001~015 / O-REG-001~009 全裁决） |
| 外部 API 文档缓存 | ✅ N/A | 本 Feature **零外部 API / 零新依赖 / 零新权限**（NG-V45-004 / NG-V45-015）；无 `api-docs` 需求 |
| 设计基准冻结 | ✅ | `design/ui-redesign/option-f-chat-stream.html` sha `49ce27fc…` + `option-f-shim.mjs` sha `8ca5db6f…`（`test/design-contract.test.ts:70` 常量，**本 Feature 零触碰**） |
| 保护段台账可读 | ✅ | `docs/v4-supersession-ledger.json`（journey active pin `43054..55259` / `e2b500df…` / `supersededFrom 6b45c3fa…`；binding keep 段 `107780..115930` / `be9ad0e9…`） |
| 体积基线可读 | ✅ | `test/size-baseline.ts:301` `SIDEPANEL_BASELINE_BYTES = 480_026`；`SIDEPANEL_CEILING = floor(480_026 × 1.05) = 504_027`；`SIDEPANEL_CEILING_CAP_ROLE = 'record-only'` |
| 前一叶 plan 先例可读 | ✅ | `specs-tree-web-cli-plugin-v4-chat/plan.md`（ADR-V4-008 八步 / ADR-V4-009 台账 schema / ADR-V4-010 五要素）：编号体例、显式取代八步、台账条目格式**逐项继承** |
| 分支 / HEAD / 工作区干净 | ✅ | `feature/web-cli-plugin` / `269a0c5` / `git status --short` 空 |
| `.sddu/**` 写入范围 | ✅ | 本 Feature 目录（父 + 本叶）内 `plan.md` / `state.json` / `TREE.md` |

### 1.1 偏差登记（与父 spec「轻量规范容器」的关系）

父 `../spec.md` §12.1 把父 Feature 定义为**轻量规范容器**（不承接 tasks/build/review/validate，不产出 `tasks.json`）。本阶段按编排器指令产出**父子两份 `plan.md`**：与 v4 先例（`ADR-V4-001`）同口径登记为偏差 —— ① 父 `plan.md` = **跨切契约与索引**（不动面 / 红线 / 台账与体积策略 / 实施波次 / ADR 索引）；② 本叶 `plan.md` = **实施承载**（12 条 ADR 全文 + 文件影响 + 风险）；③ 父**仍不产出** `tasks.md` / `tasks.json`，**仍不承接** build/review/validate；实施仍全部由本叶（唯一叶）承载；父 `state.json` 的 `depth=1` / `childrens` 结构不变。本偏差**不消耗 ADR 编号**（ADR-V45-001~012 已由编排器逐项指派）。

### 1.2 编排器指派的技术设计必答 → ADR 索引（**逐项对照，不漏**）

| # | 必答 | ADR | 状态 |
|:-:|---|---|:--:|
| 1 | 单写机制：5 通道可见投影**真退役**实现路径 + 15 门禁 44 处 id 引用断言重写策略 | **ADR-V45-001** | ✅ |
| 2 | 流纯时间序：4 宿主退役渲染架构 + decision 壳元素去向的 DOM/数据流设计 | **ADR-V45-002** | ✅ |
| 3 | composer 出流：body 尾 hidden + journey/binding 兼容证明 + `requestTurn` 零变化证明 | **ADR-V45-003** | ✅ |
| 4 | journey 第二次八步显式取代：新 pin 计算/登记流程 | **ADR-V45-004** | ✅ |
| 5 | binding 保段策略：保护段 sha 不变的实现约束（改码避让字节区间）+ 段外迁移清单 | **ADR-V45-005** | ✅ |
| 6 | density 31 格重算：测量流程 + 台账显式取代条目 + 反证重写 | **ADR-V45-006** | ✅ |
| 7 | risk-recovery 扩展：site/probe 触发 + rebind/help 恢复动作 + act 闭集 6 项 | **ADR-V45-007** | ✅ |
| 8 | 手势 → 设置帮助分区：`SETTINGS_SECTION_IDS` 单源派生 | **ADR-V45-008** | ✅ |
| 9 | options 解冻：`zeroDiffFiles` 缩窄的台账操作 + zero-injection 复跑 | **ADR-V45-009** | ✅ |
| 10 | host-registry 零宿主断言：注册表降级 + `RETIRED_HOST_IDS` 扩容 | **ADR-V45-010** | ✅ |
| 11 | 体积军规：净减双向登记 + V3-VOL-3 生效上限硬约束 | **ADR-V45-011** | ✅ |
| 12 | W4 分层实施序：单叶内 wave 设计 | **ADR-V45-012** | ✅ |

---

## 2. 架构分析

### 2.1 现状基线（本轮**只读实测**，逐文件核实）

| # | 事实 | 证据（`file:line`，本轮实测） |
|:-:|---|---|
| A1 | `ol#stream` 有 **4 个** `li[data-host]` 直接子节点：`decision` / `composer` / `l1-panels` / `strips`；子节点全序 = `[decision][卡…][composer][l1-panels][strips]` | `src/ui/sidepanel/index.html:1239-1348` |
| A2 | 卡由 `stream-render.ts` 的 keyed 增量渲染器插入；插入锚 = `container.querySelector(':scope > li[data-host="composer"]')`（`messageAnchor()`），倒序 `insertBefore` | `stream-render.ts:69-71` / `:130-140` |
| A3 | 非卡子节点：空态占位 `<p class="log-empty-text">`（`setEmpty()` 在 `messageAnchor` 之前插入） | `stream-render.ts:78-93` |
| A4 | `decision` 壳内容 = `#l0-kicker` / `#l0-more` / `#l0-receipt-summary` / `#l0-ref-toggle` / `#l0-ref-badge` / `#l1-more`(+`-options`) / `#l1-consequences-toggle` / `#l1-consequences` / `#l1-ref`(+`-summary`/`-rows`/`-actions`/`-repick`/`-describe`/`-rescue`/`-reason`) / `#l1-consequence-tpl` | `index.html:1244-1284` |
| A5 | `l1-panels` 宿主内容 = `#l1-group` + 4 触发器（`l1-local-tree-toggle` / `l1-history-toggle` / `l1-receipt-toggle` / `l1-gestures-toggle`）+ 各自 `hidden` 面板 | `index.html:1297-1333` |
| A6 | `strips` 宿主内容 = `#env-guard` / `#site-hint`(`sh-title`/`sh-detail`/`sh-action`) / `#onboarding` / `#discovery-notice`(`dn-title`/`dn-detail`) / `#notice`；**`#send-reason` 不在 strips 内**（在 `#region-statusbar` 的 `.status-line`） | `index.html:1335-1345` + `index.html:1381-1389` |
| A7 | `#composer`(form, `hidden`) > `#input` + `#send`；现居 `li[data-host="composer"]` 内 | `index.html:1287-1292` |
| A8 | `#view-host` 是 `#stream` 的 **sibling**（`#region-stream` 内，`hidden`），含恰好一个可见 `[data-l2-view]` + `#l2-title` / `#l2-count` / `#l2-back` | `index.html:1353-1379` |
| A9 | `STRIP_CHANNEL_KINDS` **6 条**绑定；`strips` 宿主 `reason` 逐字承认「keep their readable **status projection** … every fact is **ALSO append-recorded**」 | `host-registry.ts:107-114` / `:74-76` |
| A10 | `REGISTERED_STRUCTURAL_HOSTS` = 4 条全部 `transitional:false`，模块注释逐字「Each is a **permanent structural home now**」；`RETIRED_HOST_IDS` 仅 2 项（`l0-pick` / `l0-status-band`） | `host-registry.ts:46-77` / `:89-92` |
| A11 | `evaluateHostRegistry` = **5 类问题串**（登记缺失 / 未登记新增 / `transitional!==false` / 过渡标记非 0 / 已退役容器仍在）纯函数单一判据 | `host-registry.ts:132-152` |
| A12 | `disclosure.ts` 三份声明：`COLLAPSIBLE_TARGETS`（7）/ `DISCLOSURE_WIRING`（7 对）/ `NEVER_FOLDABLE`（12，含 `l0-decision` / `confirm` / `ask` / `composer`） | `disclosure.ts:66-106` |
| A13 | `l0.mjs` ⑧ `EXPECTED_TRIGGERS` 12 条 + 逐条判据（存在 / 非空文字 / ARIA 成对 / 目标含摘要或计数）+ `SKELETON_EXEMPT_TARGETS = ['view-host','settings-view']` | `test/ui/l0.mjs:647-690` |
| A14 | `l0.mjs` ⑩ 三视口常驻集合判据硬编码含 `'l0-decision'`（与 `l2-entries`） | `test/ui/l0.mjs:874-875` |
| A15 | `recommend.ts`：`NEXTSTEP_ACTS = ['next','repick','describe','authorize']`（4）；`MAX_CHIPS_PER_CARD = 3`；`RECOVERY_RISK_CLASSES = ['refInvalid','declarationInvalid','hardFloor']`；`NEXTSTEP_SOURCE_WHITELIST` 7 项**已含 `site` / `probe`**；`passesSafety` 仅对 `act==='next'` 做 deny 判定 | `recommend.ts:124-125` / `:46` / `:77` / `:59-67` / `:239-241` |
| A16 | onboarding 规则 chip「了解 6 个页面手势」当前 `act:'next'`；authorize chip 已 `act:'authorize'`（FIX-1 先例） | `recommend.ts:206-211` |
| A17 | `cards/nextstep.ts` 的 `data-act` 渲染 = `view.payload.nextstepActs ?? []` **纯透传**（新 act 值零改动） | `cards/nextstep.ts:44-60` |
| A18 | `SETTINGS_SECTION_IDS` = **7 项**；`deriveCounts().settings` / 入口 `data-count` / `#settings-root > .wc-section` 三方同源 | `src/ui/settings/sections.ts:28-36` |
| A19 | `L1_GESTURE_LABELS` / `GESTURE_EFFECTS` 单源在 `view-model.ts`；手势表 6 行 | `view-model.ts:982-992` |
| A20 | 密度唯一豁免声明点 = `DENSITY_EXCLUDED_SUBTREES = ['#stream']`；阈值 `7/15 · 9/20 · 17/35`；31 登记格（28 机对 + 3 名义） | `density-scope.ts:35` / `docs/v4-density-baseline.json#thresholds` / `#registeredCells` |
| A21 | 密度夹具稳态锚 = `#notice` 存在且非 `hidden`（`settledProbe` / `assertFixtureSettled` 逐 cell 断言） | `test/ui/density.mjs:313-364, 546, 705, 744` |
| A22 | journey 保护段：`#15a~#15q`（锚 `    const layout = await evaluate(sp, \`(() => {` … `#15q`）；段外 `#11c~#11e` 读 `#site-hint` | `test/ui/journey.mjs:841-1038` / `:658-670`；`docs/v4-supersession-ledger.json#protectedRanges[0]` |
| A23 | binding 段外读退役面：`binding.mjs:896` 读 `#notice` 文本（`#4b/#4c` 授权回执）；`binding.mjs:2256` 读 `#discovery-notice`（`AP#4b`）；`panelNotice`（`:880`）为**事件语义**读取点 | `test/ui/binding.mjs:896` / `:2256` / `:880` |
| A24 | 台账 `test/supersession-ledger.test.ts` 的 v3 段「superseder」查找 = `status==='active' && supersededFrom === range.sha256`（**严格等值**）；复算 v3 旧 pin 用 `superseder.leafBase` 的 `git show` 版本 | `test/supersession-ledger.test.ts:699-740` |
| A25 | 台账已有 **`unfrozenZeroDiffFiles[]`** 显式解冻机制（`{file, reason≥40}`），供 v3 `zeroDiffFiles` 解冻 | `test/supersession-ledger.test.ts:824-840` |
| A26 | `dist/` 与 `dist-test/` 均 **gitignore**（不提交）⇒ 体积登记是「常量 + 台账」行为，`dist/sidepanel.js` 由收口轮本地实测 | `.gitignore:8,43` |
| A27 | 布线门禁先例：`test/authorize-chip-wiring.test.ts`（唯一调用点 + 调用点集合 + 分支零 `requestTurn` + 导出判据函数供伪造源码反证） | `test/authorize-chip-wiring.test.ts:1-60` |
| A28 | 元门禁：`CHROMIUM_GATES.length === 9`（等值）；`EXPECTED_AUDITED_FILES`（下界，可追加）；反证走 in-gate 形态 | `test/gate-integrity.test.ts:130-158, 549` |
| A29 | 门禁基线计数（f-fidelity-fix §2 / v4-chat closeout §4）：`npm test ≥1001` / `l0 ≥223` / `l1 ≥111` / `l2 ≥74` / `density ≥175` / `journey ≥167` / `insight ≥116` / `binding ≥192` / `hardening ≥24` / `page-input ≥106` / `stream ≥63` / `ask-auth ≥61` / `recommendation ≥56` / `supersession ≥33` / `gate-integrity ≥12` / `zero-injection ≥27` / `size-ruling-vol3 ≥10` / `design-contract ≥6` | 父 `state.json#domainBaseline.gateCountsAfterFFidelityFix` |
| A30 | 保护段迁移量（discovery §7.3 静态引用规模）：strips 6 id / **15 门禁文件 / 44 处引用**；decision 壳 7 id / 9 文件 / 58 处；l1-panels 4 id / 4 文件 / 6 处 | `../state.json#riskPreRegistration.protectionGateMigrationEstimate` |

> **门禁引用实测补充（本轮 grep 计数，作为迁移清单）**：`env-guard` 24 处 / 9 文件；`site-hint` 18 处 / 5 文件；`onboarding` 68 处 / 10 文件；`discovery-notice` 17 处 / 9 文件；`notice` 182 处 / 26 文件（**含大量同名词**——仅 `#notice` 元素读取点需迁移，其余为事件/会话 `notice` 语义，**不动**）；`l0-decision` 25 处 / 8 文件；`l1-ref` 35 处 / 7 文件；`l1-history-toggle` 7 处 / 2 文件。这条补充解释了为什么迁移必须**逐点判定**而非按名批量替换（否则会误伤 `notice` 事件语义，见 R-V45-104）。

### 2.2 目标架构（**F 纯形 + 零宿主**）

```
body
├── header#region-toolbar             （不变：只读摘要 + 4 视图入口 + 主题；≤5 可点）
├── main#region-stream                （不变：唯一交互区）
│   ├── ol#stream[role=log]           ← 纯时间序卡列表：子节点 = 卡 li[data-msg-type]（∪ 空态 p.log-empty-text）
│   └── div#view-host[hidden]         （不变 + 新增只读承载块）
│        ├── [data-l2-view=tree]      + #l2-tree-attribution（局部树归因块）
│        ├── [data-l2-view=commands]  （零改动）
│        └── [data-l2-view=audit]     + #l2-audit-evidence + #l2-audit-count（回执证据区 + 已决步数计数）
├── footer#region-statusbar           （不变：#statusbar-text + #send-reason + #risk-chips > #risk-rail + #risk-detail）
├── form#composer[hidden]             ← 新增位置：body 尾、id/ARIA 全保留（> #input + #send）
└── div#settings-view[hidden]         （不变 + 新增「帮助」分区 #settings-help）
```

**四条结构性不变量（本 Feature 的验收骨架）**：

1. **零宿主**：`#stream` 子树内 `[data-host]` / `[data-transitional-host]` 计数 == 0（任意深度）。
2. **纯卡序**：`#stream` 的每个 `li` 都带 `data-msg-type`；唯一允许的非卡子节点 = 空态 `<p.log-empty-text>`（**显式登记 + 反证**）。
3. **事实唯一**：首屏三事实（env / site / probe）各恰 **1** 个可见载体（流内系统行或卡）；5 个退役 id 在 DOM 中为 `null`。
4. **恢复链不断**：`ref` 卡卡内恢复区（重拾 / 描述 / 唯一匹配重锚）+ 推荐卡 `risk-recovery` chips（含 `rebind`）+ 设置视图站点详情 = 三处呼应且**无第 4 处投影**。

### 2.3 数据流变更

| 面 | 现状 | 目标 | 机制 |
|---|---|---|---|
| strips 事实 | DOM 投影 + `appendSystem(kind,text)` **双写** | `appendSystem` **单写**（唯一可见面） | `STRIP_CHANNEL_KINDS` 从「legacy id + kind」重构为「channel → kind + emitter 唯一调用点 + 载体数 == 1」 |
| 决策壳元素 | 静态 DOM（常驻，`hidden` 切换） | 卡内承载（卡渲染时铸造） | `project()` → `CardView.payload` 增字段；卡工厂按「唯一活跃卡铸造 id」先例（`#ask*`/`#confirm*`） |
| L2 迁入块 | 无 | `#view-host` 内只读承载块 | 复用 `l2/view-host.ts` 视图替换（零新机制） |
| 手势表 | L1 面板 `#l1-gestures`（流内） | 设置视图「帮助」分区 | `L1_GESTURE_LABELS` 单源 + `SETTINGS_SECTION_IDS` 派生 |
| composer | 流内宿主（`hidden` 常驻） | `body` 尾（`hidden` 常驻） | 仅 `parentElement` 变化；`#input`/`#send`/`requestTurn` 通路零变化 |
| 密度测量 | 31 格（`#stream` 豁免） | 31 格**重算**（迁移内容进被测量面） | 口径不变；台账显式取代 |

### 2.4 依赖关系图

```
spec/plan（本文件）
   ▼
W1 门禁脚手架（新 node 门禁 + 断言预迁移骨架）
   ▼
W2 strips 单写（emitter 唯一 → DOM 退役 → 归并判据重写）      ← 独立于宿主退役
   ▼
W3 宿主退役 + 元素迁移（decision 壳 / l1-panels / composer 出流 / strips 包裹层）
   ▼
W4 门禁重算（density 31 格 + journey 二次八步 + binding 段外 + 11 处等价重锚）  ← 共享收口面
   ▼
W5 收尾（体积五要素 + V3-VOL-3 三值同源 + 红线逐字节 + 全门禁串行 + 人工面清单）
```

**硬约束**：W4 与 W5 作用于**同一终态 DOM**，中间态不得单独提交（否则产生「中间态取代」：多余台账条目 + 二次新 pin）。W2/W3 完成前不得跑 journey/density 收口判据。

### 2.5 不动面硬约束（落地位置，**逐条指到文件与门禁**）

| # | 不动面 | 守线方式 | 门禁 |
|:-:|---|---|---|
| T1 | `src/content/**` / `dist/content.js`（177,076 B / `52a82620…`） | 零改动（`git diff` 零行） | `test:design-contract` + 红线逐字节 |
| T2 | `dist/pick-layer.js`（33,900 B / `5f567d7e…`） | 零改动 | 同上 |
| T3 | SW / `KIND_SET` / 判定链（`policy.ts` / `auto-authorize.ts` 内容哈希 pin）/ `manifest.json` | 零改动 | `test:supersession` 的 `zeroDiffFiles` 段 + 内容哈希 |
| T4 | `design/**` + `option-f-shim.mjs`（双 sha256 + 60 断言） | 零触碰 | `test:design-contract ≥6` |
| T5 | `docs/v3-supersession-ledger.json` | **零 diff**（冻结历史） | `test/supersession-ledger.test.ts` 双台账判定 |
| T6 | `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / `F-29` 区段 | 零改动 | `git diff --quiet` |
| T7 | 12 卡类型学（`cards/index.ts#CARD_TYPES`）与三区法则本身 | 零改动 | `test:design-contract` + `test/ui/l0.mjs` |
| T8 | L2 视图既有内容（tree / commands / audit 内部） | 仅**新增承载块**，不改既有内容 | `test/ui/l2.mjs` + NG-V45-014 |
| T9 | `KIND_SET` / `system-events.ts` 4 规则常量（5000 / 20 / `持续：` / 净化） | 逐字不变 | 常量机核 + 反证 |
| T10 | `authorConfirmation.status = 'pending-author-line'` / `SIDEPANEL_CEILING_CAP = 'record-only'` | 不得伪称已确认 / 不得接回判定 | `test/size-ruling-vol3` + `test/size-budget` |

---

## 3. 方案对比

### 3.1 P-V45-01：退役实现路径（ADR-V45-001 的候选）

| 维度 | 方案 A：**DOM 真退役 + 单写事件化** | 方案 B：hidden 保数据（投影 `hidden` 常驻） | 方案 C：保留空壳 id（容器移除，`<div id="notice" hidden>` 留桩） |
|---|---|---|---|
| 描述 | 5 条提示带的节点与包裹层从 DOM 移除；事实只由流内系统行/卡承载；门禁改写为「读流内行/卡」 | 保留节点与 id，仅加 `hidden`；门禁几乎零改 | 退役可见结构，但保留 5 个 id 空壳供门禁读取 |
| 优点 | 达成 G-V45-001「事实唯一」；让 Q-REG-003 的过渡态真正清零；BLOCK-02 复辟路径被结构性封死 | 门禁改动最小；回滚最易 | 门禁改动小；视觉上达成纯形 |
| 缺点 | 门禁迁移量大（15 文件 / 44 处 + 9 文件 / 58 处） | **违反 NG-V45-001**；「双写」制度痕迹保留；实存 id 仍可被读 ⇒ 事实面不唯一 | **违反 FR-V45-010 验收**（`getElementById` 必须 `null`）；空壳 = 隐形宿主，与「零宿主」正面冲突 |
| 风险 | 断言改写不当会「降级」（须数量不减 + 反证） | 直接判 BLOCK-02 同类（删属性/隐藏充数） | 自我裁决（用留桩冒充退役） |
| 工作量 | 高（W2/W3 主要成本） | 低 | 中 |

### 3.2 P-V45-02：卡内元素的承载方式（ADR-V45-002 的候选）

| 维度 | 方案 A：**卡内作用域 + 唯一活跃卡 id 铸造** | 方案 B：保留全局 id（只出现在「当前卡」） | 方案 C：全量新 id 命名空间（`ref-*` / `ask-*`） |
|---|---|---|---|
| 描述 | 迁移元素进卡；**仅唯一活跃/最新卡铸造稳定 id**（沿用 `#ask*`/`#confirm*` 先例），历史卡以 `data-*` + `[data-card-key]` 作用域承载 | 全局 id 只出现在「当前卡」，历史卡无控件 | 全部换新 id（`ref-repick` / `ask-more`…） |
| 优点 | 零新机制；门禁作用域查询更精确（可断言「卡内可达」）；历史卡不产生 id 冲突 | 门禁 `getElementById` 改动最小 | 命名清晰 |
| 缺点 | 门禁需从全局 id 改为作用域查询（改写量中） | 历史卡恢复动作不可达（违反「恢复链不断」）；多卡并存时悬空 | id 大量重命名 ⇒ 台账条目暴增、与 NFR-V45-006 兼容面冲突 |
| 风险 | 「唯一活跃」边界需显式登记（`MAX_OPEN_ASKS = 2` 双卡场景） | 语义缺口 | 取代面过大（R4-14 教训） |
| 工作量 | 中高 | 低 | 高 |

### 3.3 P-V45-03：binding 保段手段（ADR-V45-005 的候选）

| 维度 | 方案 A：**保段 + 字节中立避让** | 方案 B：显式取代 binding pin | 方案 C：不动段外断言，靠新载体沿用同 id |
|---|---|---|---|
| 描述 | 段前（行 896）改写必须**保持累计字节增量归零**；段后（行 2256）自由改写 | 走链式取代 + 等价八步，允许字节偏移变化 | 让流内行继续用 `#notice` id |
| 优点 | 保护段 sha 与 `startByte` 双不变（最强保护）；binding 高存活面零触碰 | 实现自由 | 门禁零改 |
| 缺点 | 段前改写受限（须等长补偿） | 削弱保护（大段换锚），且 binding 语义与本次改动无关 | **ID 复用即隐性宿主复辟**；违反 FR-V45-010 |
| 风险 | 等长补偿可能加注释噪点；须门禁判据 `startByte === 107780` 兜底 | 审查面变大 | BLOCK-02 同类 |
| 工作量 | 中 | 中高 | 低 |

### 3.4 P-V45-04：密度夹具稳态锚（ADR-V45-006 的候选）

| 维度 | 方案 A：**三重构造判据** | 方案 B：改用另一常驻元素（如 `#risk-rail`） | 方案 C：显式 sleep / 固定等待 |
|---|---|---|---|
| 描述 | 稳态 = 流内系统行 `[data-kind="notice"]` 存在 ∧ 无未终态卡 ∧ `#stream` 卡数 == 期望 | 把锚换成迁移后仍常驻的某元素 | 固定延时后测量 |
| 优点 | 由**构造**保证（不依赖运行顺序）；判据可 FAIL（延后一步 ⇒ 红）；与 EC-V45-013 双角色迁移一致 | 实现省事 | 实现省事 |
| 缺点 | 需定义「期望卡数」（须登记，禁硬编码散落） | 锚仍在「元素存在性」上，未来同样会再遇到退役 | **静默回退** closeout 轮 F2/K-1 的确定性修复（明文禁止） |
| 工作量 | 中 | 低 | 极低 |

### 3.5 P-V45-05：台账扩展方式（ADR-V45-004 的候选）

| 维度 | 方案 A：**`supersessionChain[]` 链式** | 方案 B：新增第二条 journey range（旧条标 superseded） | 方案 C：只改 v3 台账 |
|---|---|---|---|
| 描述 | `protectedRanges[0]` 新增链字段；`supersededFrom` 指直接前驱；v3 段判据升级为链式查找 | 两条同文件 range，一条 active 一条 superseded | 直接把 v3 台账的 `supersededFrom` 改向新 sha |
| 优点 | 同时满足「v3 历史可逐字节复算」「链式前驱语义」「当前字节被新 pin 锁死」 | 不改判据结构 | 改动最小 |
| 缺点 | 需扩展 schema + 门禁判据（只增） | v4 段判据要求「每条 range 都是 active」⇒ 必须改判据且产生同段落歧义 | **违反 T5**（v3 台账冻结历史零 diff） |
| 工作量 | 中 | 中 | 低 |

---

## 4. 推荐方案

| 决策 | 选中 | 理由（一句话） |
|---|:--:|---|
| D-P-V45-01 退役路径 | **A（真退役）** | 唯一满足 NG-V45-001 + FR-V45-010 + G-V45-003 的路径；BLOCK-02 教训要求判据能区分「过渡关闭」与「标记被删」 |
| D-P-V45-02 卡内承载 | **A（卡内作用域 + 唯一活跃卡铸造）** | 零新机制（复用 `#ask*` 先例）、恢复链不断、id 冲突无解 |
| D-P-V45-03 binding | **A（保段 + 字节中立避让）** | 保护段最强形态；B 作为**上报后的兜底**，不得先行 |
| D-P-V45-04 夹具锚 | **A（三重构造判据）** | 不让 closeout 轮的确定性修复被静默回退（父 §15 第 6 条） |
| D-P-V45-05 台账扩展 | **A（`supersessionChain[]` 链式）** | 唯一同时满足 v3 段严格判据与链式语义的方案（ADR-V45-004 详述） |
| D-P-V45-06 门禁策略 | **等价重锚 + 只增不减 + 逐条反证** | 父 §15 第 5/6 条；保护段显式取代是唯一例外 |
| D-P-V45-07 体积 | **净减也登记 + 档位不下移**；若净减 > 19,225 B ⇒ **停下上报** | V3-VOL-3 三值同源硬约束（ADR-V45-011 给出算术） |
| D-P-V45-08 实施序 | **五波（W1~W5）**，W4+W5 对同一终态 | 避免「中间态取代」（本叶 spec §8.4） |

---

## 5. 文件影响分析（**逐路径**）

> 口径：`NEW` = 新建；`MODIFY` = 修改；`DELETE` = 删除文件（本 Feature **无整文件删除**；「删除」均为**文件内 DOM/代码行**的退役，逐行登记于台账）。变更清单 = **63 项**（src 21 / test 34 / docs 2 / SDDU 6）。

### 5.1 `src/`（21 项：20 MODIFY + 1 NEW）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 移除 4 个 `li[data-host]` 与 `#l0-decision` 壳 / `#l1-group` / `.strips`；`#composer` 迁 `body` 尾；`#view-host` 内新增 3 个只读承载块（`#l2-tree-attribution` / `#l2-audit-evidence` / `#l2-audit-count`） |
| MODIFY | `.../src/ui/sidepanel/host-registry.ts` | 注册表降级为**零宿主反向判据**；`RETIRED_HOST_ATTRS` + `RETIRED_CONTAINER_IDS` 扩容；`STRIP_CHANNEL_KINDS` 重构（channel → kind + emitter 唯一 + 载体数 1）；`evaluateHostRegistry` 问题串升级为 6 类 |
| MODIFY | `.../src/ui/sidepanel/disclosure.ts` | 三份声明重写（`COLLAPSIBLE_TARGETS` 7 项保持不变、`DISCLOSURE_WIRING` 7 对、`NEVER_FOLDABLE` 12 → 14）+ 新增 `RETIRED_FOLDABLE_IDS` / `RETIRED_NEVER_FOLDABLE_IDS`；新增 `#composer.parentElement === body` 双判据 |
| MODIFY | `.../src/ui/sidepanel/stream-render.ts` | `messageAnchor()` 迁移（不再查 `li[data-host="composer"]`）；空态占位保持唯一非卡子节点 |
| MODIFY | `.../src/ui/sidepanel/sidepanel.ts` | strips 生产单源化收口 + 决策壳元素读写迁移到卡作用域 + `#composer` 迁挂 + `rounds` 计数入审计标题 + 本地 `rebind`/`help` 单入口分支 + `title` 净化入口调用 |
| MODIFY | `.../src/ui/sidepanel/view-model.ts` | `firstRunCard` 承载 onboarding/probe 事实（`terminable` 谓词保持）；导出 `L1_GESTURE_LABELS`/`GESTURE_EFFECTS` 供帮助分区单源；停止渲染 0 计数控件 |
| MODIFY | `.../src/ui/sidepanel/recommend.ts` | 恢复触发集扩展（site / probe）；`NEXTSTEP_ACTS` → 6 项；`RECOVERY_CHIP_ORDER` 规则表（触发 → 动作优先序，取 ≤3）；`MAX_CHIPS_PER_CARD = 3` 不变 |
| MODIFY | `.../src/ui/sidepanel/cards/ref.ts` | 证据区 + 恢复区卡内化（`#l1-ref*` 家族在最新引用卡铸造 + `data-ref-action` 作用域） |
| MODIFY | `.../src/ui/sidepanel/cards/askuser.ts` | 选项池（`#l1-more*`）+ 后果预演（`#l1-consequences*` + `#l1-consequence-tpl`）卡内化 |
| MODIFY | `.../src/ui/sidepanel/cards/auth.ts` | 后果预演 + 回执固化区卡内化（`#l0-receipt-summary` 等价物 → 卡固定区） |
| MODIFY | `.../src/ui/sidepanel/cards/nextstep.ts` | **预期零改动**（`data-act` 纯透传，A17）；仅当需补 `data-act` 白名单断言时改 |
| MODIFY | `.../src/ui/sidepanel/cards/shared.ts` | 如固化区契约需登记新 `data-*`（仅登记，不新增视觉面） |
| MODIFY | `.../src/ui/sidepanel/l1/panels.ts` | 4 个开关的去向落地（历史退役 / 手势→设置 / 局部树→树视图 / 回执→审计视图）；触发器集合重写 |
| MODIFY | `.../src/ui/sidepanel/l1/receipt.ts` | 回执证据行渲染迁 L2 审计视图承载块 |
| MODIFY | `.../src/ui/sidepanel/l1/local-tree.ts` | 局部树归因渲染迁 L2 树视图承载块 |
| MODIFY | `.../src/ui/sidepanel/l2/audit.ts` | 新增 `#l2-audit-evidence` + 标题区 `#l2-audit-count`（已决步数，全仓唯一） |
| MODIFY | `.../src/ui/sidepanel/l2/view-host.ts` | 视图挂载表登记新承载块（预期小幅） |
| MODIFY | `.../src/ui/settings/sections.ts` | `SETTINGS_SECTION_IDS` 追加 `'settings-help'`（7 → 8，单源派生） |
| MODIFY | `.../src/ui/settings/panel.ts` | 挂载「帮助」分区（`id:'settings-help'` + `class:'wc-section'`，只读） |
| NEW | `.../src/ui/settings/help.ts` | 帮助分区渲染器（6 行手势表，`L1_GESTURE_LABELS` 单源；零可点控件） |
| MODIFY | `.../src/ui/options/index.html` | **纯文案行**订正（授权指引 → 「设置 → 站点与授权」），显式解冻登记（ADR-V45-009） |

> 注：`system-events.ts` / `density-scope.ts` / `cards/index.ts` **预期零改动**（常量面只读）；若 build 发现必须新增 `title` 净化函数（NFR-V45-003），则 `system-events.ts` 计入 MODIFY（**登记为超预期触碰**）。

#### 5.1.1 实现轮实况（review R1 I-01 回写，2026-09-21）

> 口径：**计划 → 实际落点**逐项映射（实测来源 = `a04e677..HEAD` 的 `git diff --name-only` + review R1 修复轮工作树；LNG-V45-004「取代 / 登记与实现同轮」）。**结论：实现形态达成 ADR 语义，但有 4 项计划内 MODIFY 未触碰 + 7 项计划外文件被触碰**——两者都如实登记，不改写计划历史。

**① 计划内但未触碰的 4 项 `src` MODIFY（L2 承载块改由静态声明 + 单写入者绘制）**

| 计划文件 | 计划职责 | 实际落点 | 判定 |
|---|---|---|---|
| `l1/receipt.ts` | 回执证据行渲染迁 L2 审计视图承载块 | 承载块容器改由 `index.html` **静态声明**（`#l2-audit-evidence`），内容仍由 `l1/panels.ts` 的**单写入者**绘制 ⇒ 本文件零改动 | 等价达成（DC-V45-011） |
| `l1/local-tree.ts` | 局部树归因渲染迁 L2 树视图承载块 | 同上（`#l2-tree-attribution` 静态声明 + 单写入者） | 等价达成（DC-V45-011） |
| `l2/audit.ts` | 新增 `#l2-audit-evidence` + 标题区 `#l2-audit-count` | 两个 id 与标题区计数由 `index.html` 静态声明 + `l2/counts.ts` 单源派生；`#l2-audit-count` 的唯一声明点由门禁机核 | 等价达成（DC-V45-002） |
| `l2/view-host.ts` | 视图挂载表登记新承载块 | 挂载表**无需扩项**（承载块是视图内的静态只读块，不是新视图） | 等价达成（零机制新增） |

**② 计划外被触碰的 7 项 `src` 文件（逐项给出「计划 → 实际落点」）**

| 计划外文件 | 触碰性质 | 为什么必须碰（实测理由） |
|---|---|---|
| `cards/decision-region.ts`（**NEW**） | 新增模块 | ADR-V45-002 §3「决策区卡内化」的实现载体：选项池 / 后果预演 / 三段模板只有在**卡内**渲染才成立；plan §5.1 未单列该文件（计划把职责挂在 `cards/askuser.ts` / `cards/auth.ts` 上），实际拆出独立模块以保持「唯一活跃卡铸造」边界可读 |
| `stream-plaintext.ts` | 新增 `plaintextTitle()` | NFR-V45-003 / R-REG-901：`title` 长文案的 fail-closed 净化（strip-then-scan）——plan §5.1 已在注里预告「若 build 发现必须新增 `title` 净化函数则计入 MODIFY」，本条即该预告的落点（**非静默扩张**） |
| `cards/system.ts` | 渲染 `data-kind` / 行 `title` | 单写化的**渲染面**：事实只以流内系统事件行承载（ADR-V45-001），行必须带机器可读 `data-kind` 以便载体读数按 kind 计数（BLOCK-03 的 live 判据消费该属性） |
| `chat-state.ts` | `systemRow` 落 `systemKind` + 净化后的 `systemTitle` | 同上：`data-kind` / `title` 的数据源（唯一通道 `appendSystem(kind, text)` 的既有位置） |
| `stream-model.ts` | 类型面扩展（kind / title 字段） | 上两项的类型契约；零新增渲染面 |
| `density-scope.ts` | 常量面复核（实测触碰，语义未变） | 退役 4 宿主后豁免子树 / 三区常量 / 防滥用常量的**引用面**复核；阈值 7/15·9/20·17/35 与豁免口径逐字未动（`#stream` 单源不变） |
| `l0/shell.ts` | 决策壳退役后的挂载路径收敛 | ADR-V45-002 §4：`#l0-decision` 壳退役后 `mountL0` 不再挂载壳节点；`revealFallback()` 走卡内同一转换函数（I-03 既有语义不变）。review R1 BLOCK-01 又补注：`#l0-receipt-summary` 是**迁移容器**，不是退役容器 |

> **修复轮追加触碰（本次，同一叶）**：`pick-input.ts`（BLOCK-02：拖放高亮写点由退役 `#l0-decision` 迁到真实落点面 `#stream`）——同为**计划外**文件，随本节一并登记；`host-registry.ts` / `sidepanel.ts` / `l0/shell.ts` / `l1/panels.ts` 为计划内文件的重登记触碰。
> **未触碰的零改动声明**：`system-events.ts` / `cards/index.ts` 实测零改动（与计划一致）；`cards/nextstep.ts` / `cards/shared.ts` 被触碰但均为纯登记 / 类型面（`data-act` 透传语义零变化，A17 成立）。

### 5.2 `test/`（34 项：31 MODIFY + 3 NEW）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `test/ui/journey.mjs` | 保护段**第二次八步显式取代**（`#15a~#15q` 同编号等价改写 + 新 pin + `supersessionChain`）；段外 `#11c~#11e` 等价改写；`#15b` ≥65.0% 只上调 |
| MODIFY | `test/ui/binding.mjs` | 段前 `:896` 字节中立改写；段后 `:2256` 等价改写；写入 `modifiedRanges[]`；`:880` `panelNotice` **零触碰** |
| MODIFY | `test/ui/density.mjs` | 夹具稳态锚三重构造判据；31 格重算；RP 注入点重写；阶段 F 指向新台账 |
| MODIFY | `test/ui/l0.mjs` | ⑧ `EXPECTED_TRIGGERS` 与逐条判据重锚；⑩ 结构集合去 `l0-decision` 并补新常驻面；零宿主结构性判据（原 `REGISTERED_TRANSITIONAL_HOSTS = 0` 升级） |
| MODIFY | `test/ui/l1.mjs` | ②⑫ 展开几何 / openAll-closeAll 往返重锚（目标改卡内/视图内） |
| MODIFY | `test/ui/l2.mjs` | 审计证据区 / 帮助分区三方同源；树视图归因块可达 |
| MODIFY | `test/ui/page-input.mjs` | L1 面板引用 → 卡作用域 / 视图承载块等价改写 |
| MODIFY | `test/ui/hardening.mjs` | `#env-guard` `hasGuard`/`guardShown`/`guardText` 三断言 → 流内行断言 |
| MODIFY | `test/ui/insight.mjs` | `#discovery-notice` / `#env-guard` 文本读取点 → 流内行 / firstRun 卡 |
| MODIFY | `test/ui/recommendation.mjs` | ⑬⑭ 家族重锚；chip `act:'help'` 零回合 / 零输入框写入；site/probe 恢复卡 |
| MODIFY | `test/ui/stream.mjs` | `#stream` 纯卡序判据（含唯一非卡子节点显式登记） |
| MODIFY | `test/ui/ask-auth-inflow.mjs` | askuser / auth 卡内选项池 / 后果预演 / 固化区新锚点 |
| MODIFY | `test/ui/l1-reverse.mjs` | 注入点重写（目标已搬迁） |
| MODIFY | `test/ui/l2-reverse.mjs` | 注入点重写（审计证据区 / 帮助分区） |
| MODIFY | `test/system-merge.test.ts` | 「`#notice` 仍读到同一事实」→ 流内行单源 |
| MODIFY | `test/env-guard.test.ts` | 环境守卫事实载体改流内行 |
| MODIFY | `test/density-thresholds.test.ts` | `:715` 归并矩阵判据重写（新语义，非放宽）；豁免单源；结构集合 |
| MODIFY | `test/l0-disclosure.test.ts` | 三份声明同源机核；退役 id 零残留；`#composer` 父节点断言 |
| MODIFY | `test/l1-ref-validity.test.ts` | ref 卡内恢复区等价改写 |
| MODIFY | `test/supersession-ledger.test.ts` | v3-段 superseder 查找**链式化** + `supersessionChain` schema + `unfrozenZeroDiffFiles` 字段扩展 + 新断言（只增） |
| MODIFY | `test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 追加 3 个新 node 门禁；`CHROMIUM_GATES` **保持 9**；例外说明文本追加 |
| MODIFY | `test/size-baseline.ts` | 五要素**双向**登记（净减方向）+ 历史/时间线保留 + `SIDEPANEL_CEILING` 重算 |
| MODIFY | `test/size-budget.test.ts` | 方向 = `lowered` 的判定支持 |
| MODIFY | `test/size-growth-evidence.test.ts` | I-10 披露算术机核支持负 Δ |
| MODIFY | `test/size-ruling-vol3.test.ts` | 三值同源前移；档位不下移闸门（净减 > 19,225 B ⇒ FAIL 提示上报） |
| MODIFY | `test/sidepanel-view.test.ts` | 布局契约 4 项等价改写（含 `#composer` 出流） |
| MODIFY | `test/recommendation-sources.test.ts` | 白名单**零扩项**；act 闭集 6 项同源 |
| MODIFY | `test/authorize-chip-wiring.test.ts` | 与 act 闭集同源（闭集改一处，本门禁同步红/绿） |
| MODIFY | `test/settings.test.ts` | 分区数 7 → 8 派生断言 |
| MODIFY | `test/l2-counts.test.ts` | `deriveCounts().settings` 随 `SETTINGS_SECTION_IDS` 派生 |
| MODIFY | `test/ref-pick-wiring.test.ts` | ref 卡内恢复区唯一调用点（条件触碰，视 build 实现面） |
| NEW | `test/host-registry.test.ts` | 零宿主判据 + `RETIRED_*` 扩容 + **5 组伪造 reading 反证**（仿 BLOCK-02 修法） |
| NEW | `test/local-act-wiring.test.ts` | 本地 act（`authorize`/`rebind`/`help`）布线门禁（唯一调用点 + 单一入口 + 零 `requestTurn` + ≥3 伪造反证 + 与闭集同源） |
| NEW | `test/settings-help.test.ts` | 帮助分区单源（6 行 == `L1_GESTURE_LABELS.length`）+ 零可点 + 键盘可达 |

### 5.3 `docs/`（2 项，均 MODIFY）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | journey `protectedRanges[0]` 新 pin + `supersessionChain[]`；`protectedSupersession` 更新 + `history[]`；`modifiedRanges[]` 追加（journey / binding / 各文件）；`redlineRemap[]` 追加；`entries[]` 追加（DOM 退役 / 新承载块 / 解冻）；`leafBases[]` 追加 v4.5-1 段；`unfrozenZeroDiffFiles[]` 追加 options；`v3Vol3Closeout` 三值同源前移 |
| MODIFY | `packages/web-cli-plugin/docs/v4-density-baseline.json` | v4.5 台账（31 格前后值 / 日期 / 来源 / 理由 / 历史保留）；`riskIncrementRegistry` 重锚（溯源门槛字段 `rulingId`/`rulingDate`/`approvedBy`/`reason`）；夹具稳态锚说明更新；阈值零 diff |

> **不改**：`docs/v3-supersession-ledger.json`（冻结历史，零 diff）、`docs/f-fidelity-fix-2026-09-20.md`（成本文档；FIX-5 消解在 v4.5 收口文档重述）、`design/**`、ROADMAP。

### 5.4 SDDU（6 项）

| 操作 | 文件路径 | 说明 |
|:--:|---|---|
| NEW | `.../specs-tree-web-cli-plugin-v45-f-regularization/plan.md` | 父 plan.md（跨切契约与索引） |
| NEW | `.../specs-tree-v45-1-single-write-chronology/plan.md` | **本文件**（12 ADR 全文） |
| MODIFY | 父 `state.json` | `phase: specified → planned`；`files.plan`；`phaseHistory`；`planCounts`；`notes` |
| MODIFY | 叶 `state.json` | 同上 + `workflow: 3.plan`；`planCounts`；`notes` |
| MODIFY | 父 `TREE.md` | 目录导航（新增 `plan.md`） |
| MODIFY | 叶 `TREE.md` | 目录导航（新增 `plan.md`） |

### 5.5 变更面汇总

| 维度 | 数值 |
|---|---|
| 新增文件 | 4（`settings/help.ts` + 3 个新 node 门禁；**零新增宿主**） |
| 修改文件 | 59 |
| 删除文件 | 0（退役均在文件内，逐行登记台账） |
| `#stream` 宿主 | 4 → **0** |
| 退役 DOM 元素（父 §11） | 19 项 + 承载容器 |
| 迁移 DOM 元素（父 §11） | 13 项 |
| 消解 / 保留（父 §11） | 3 / 2 项 |
| 保护段 | 1 段二次取代（journey）+ 1 段保段（binding） |
| 台账新增条目 | 估 ≈ 40~55 `entries` + ≈ 25~35 `modifiedRanges`（**实测后填值，禁预填**） |

---

## 6. 风险评估

### 6.1 继承风险（discovery R-REG-001~015 + spec R-REG-901~906，逐条带缓解）

| # | 风险 | 概率 | 影响 | 缓解措施（本 plan 落点） |
|---|---|:--:|:--:|---|
| R-REG-001 | journey 保护段需二次八步取代 | 高 | 高 | **ADR-V45-004**：`supersessionChain[]` + 链式 superseder 查找 + 新 pin + `modifiedRanges` + `redlineRemap` + 计数守恒 ≥167 + RP-V4-08 复用；`#15b` 只上调 |
| R-REG-002 | binding 段外 `#notice` / `#discovery-notice` 断言需改写 + 逐行登记 | 高 | 中高 | **ADR-V45-005**：段前**字节中立避让**（`startByte === 107780` 门禁兜底）+ 段后自由改 + 两处 `modifiedRanges` 逐行登记 |
| R-REG-003 | `l0.mjs` `EXPECTED_TRIGGERS` 12 条与 `disclosure.ts` 三份声明同源耦合，断言零删除 | 高 | 中高 | **ADR-V45-002/010**：同源常量重构（触发器集合/白名单从源导出后机核）+ 逐条等价重锚 + 计数不减 |
| R-REG-004 | `l1.mjs` ②⑫ + `page-input` 依赖 4 触发器可见性；「非空文字标签」判据冲突 | 中 | 中 | 触发器随其目标搬迁重锚（设置/视图/卡内）；「非空文字」判据改为登记触发器的**新归属面**作用域断言 |
| R-REG-005 | `hardening` / `env-guard` 单测 / `journey #11c~#11e` 是「投影存在」正面断言 | 高 | 中高 | **ADR-V45-001**：逐条改为「流内行存在 / 文案同源」；每处配可 FAIL 反证 |
| R-REG-006 | 密度夹具稳态锚 = `#notice`；不得静默回退 closeout 轮修复 | 中 | 中 | **ADR-V45-006**：三重构造判据（源行存在 ∧ 无未终态卡 ∧ 卡数 == 期望）；反证「延后一步 ⇒ 红」 |
| R-REG-007 | 体积五要素 + 算术机核 + V3-VOL-3 三值前移 + `authorConfirmation` 占位 | 中 | 中 | **ADR-V45-011**：双向登记（净减也登记）+ I-10 负 Δ 支持 + 三值同源 + `pending-author-line` 保持 |
| R-REG-008 | 密度 31 格分歧口径导致工作量误估 | 中 | 中 | DC-V45-006：**只认 Chromium 实测**；V45-P-012 保持 `pending-measurement`（禁预填） |
| R-REG-009 | RP 反证 / 探针不再 FAIL 即判据空转（BLOCK-02 同类） | 中高 | 高 | **ADR-V45-006/012**：注入点被搬走必须**重写注入点**；每处反证实跑「注入 FAIL → 逐字节 sha256 还原 → PASS」；声明 `expectFailPattern` |
| R-REG-010 | `host-registry.ts` 「判据即结构」耦合体；「id 仍在 DOM」判据与退役直接矛盾 | 高 | 中高 | **ADR-V45-001/010**：判据**重写**（不是放宽）；注册表降级为反向判据；`STRIP_CHANNEL_KINDS` 新语义 |
| R-REG-011 | 门禁自身形态漂移抬高元门禁成本；串行纪律 | 中 | 低 | `CHROMIUM_GATES` 保持 9；`EXPECTED_AUDITED_FILES` 只追加；严格串行（一次一个 Chromium） |
| R-REG-012 | `KL-N-10` binding 环境性 flake 被误读为回归 | 中 | 低 | 父 §15 第 4 条：首轮异常**隔离复跑 ≥2**、日志全量、仍红如实登记**不阻塞收口** |
| R-REG-013 | options 解冻是治理动作，可能打开更大面 | 中 | 低 | **ADR-V45-009**：范围钉死「单文件纯文案行」+ 静态范围门禁（diff 仅文案）+ `unfrozenZeroDiffFiles.reason ≥40` + `test:zero-injection ≥27` 复跑 |
| R-REG-014 | `STREAM_HEIGHT_RATIO_MIN = 0.65` 只允许上调；结构集合可能需重锚 | 中 | 中 | **ADR-V45-004/002**：`#15b` ≥65.0% 只上调；`l0.mjs:874-875` 集合去 `l0-decision` 并等价补新常驻面 |
| R-REG-015 | 净增超 24,001 B 直接 FAIL；净减亦触发重登记 | 中 | 中 | **ADR-V45-011**：净减方向登记 + 若净减过界（见 R-V45-101）上报 |
| R-REG-901 | `title` 属性成为新零明文缺口 | 中高 | 高 | **ADR-V45-001/007**：`title` 同过 `assertStreamPlaintext` 等价校验 + 注入 secret/URL query 反证必抛错 |
| R-REG-902 | `#view-host` 不豁免 ⇒ 迁入内容进被测量面，可能越阈值 | 中 | 中 | **ADR-V45-006**：阈值零放宽；实测越限 ⇒ 停下上报（不得静默放宽） |
| R-REG-903 | 设置分区数变化引发连锁派生（7 → 8） | 中 | 中 | **ADR-V45-008**：`SETTINGS_SECTION_IDS` 单源派生 + 三方同源（源 / 渲染 / `data-count`） |
| R-REG-904 | act 闭集扩容误伤 deny 集安全边界 | 中 | 中 | **ADR-V45-007**：deny 集只作用于 `act==='next'`（既有 `passesSafety` 口径）；新增断言「本地 act 永不入 deny 集」 |
| R-REG-905 | `#rebind` 双入口（设置 + 推荐 chip）漂移 | 中 | 中 | **ADR-V45-007**：单一生产入口 + 唯一调用点机核（`test/local-act-wiring.test.ts`） |
| R-REG-906 | 「零宿主」判据被空转绕过（改名 / 塞进卡内） | 中高 | 中高 | **ADR-V45-010**：任意深度 + `[data-host]`/`[data-transitional-host]` 全捕获；反证「注入即红」；`assertChromeNotInStream` 继续成立 |

### 6.2 plan 新增风险（R-V45-101~109）

| # | 风险 | 概率 | 影响 | 缓解措施 |
|---|---|:--:|:--:|---|
| **R-V45-101** | **净减过界导致 V3-VOL-3 档位下移**：`ceilTo50KB(newBaselineBytes)` 由 512,000 掉到 460,800 ⇒ 绝对上限 563,200 → 506,880，与 FR-V45-092「档位与绝对上限不变」冲突 | 低 | 高 | 算术前提：档位保持 512,000 ⟺ `newBaselineBytes ≥ 460,801` ⟹ **净减不得超过 19,225 B**；`test/size-ruling-vol3.test.ts` 增闸门；越界 ⇒ **停下上报编排器**（不得静默改三值，NG-V45-010） |
| **R-V45-102** | **binding 段前「字节中立避让」不可行**（无可删白/注释可补偿，或改后语义不清） | 中 | 中高 | 首选等长改写 + 同前置区等量删白；门禁判据 `byteOffsetOf(startAnchor) === 107780` ∧ 段 sha `be9ad0e9…` 双绿；**不可行 ⇒ 上报编排器**，走 binding pin 显式取代（链式 + 等价八步），**不得静默改 pin** |
| **R-V45-103** | **多卡并存时 id 铸造语义歧义**（`MAX_OPEN_ASKS = 2`；多个 ref 卡） | 中 | 中 | 显式规则：仅**唯一活跃/最新**卡铸造稳定 id；历史卡以 `data-*` + `[data-card-key]` 作用域承载；新增断言「文档内 `#l1-more` / `#l1-ref` 计数 ≤ 1」+ 作用域可达断言（反证：伪造第二张卡 ⇒ 红） |
| **R-V45-104** | **`notice` 同名语义误伤**：全仓 182 处 `notice` 中大量是**事件/会话 `notice` 语义**（非 `#notice` 元素），按名批量替换会破坏 `chat-events` / `protocol` 等门禁 | 中高 | 中高 | 迁移**逐点判定**（以 `getElementById('notice')` / `#notice` 选择器为唯一判据）；`test/chat-events.test.ts` / `test/protocol.test.ts` / `test/notify-tools.test.ts` / `test/bookmarks-tools.test.ts` / `test/downloads-tools.test.ts` / `test/fullpage-screenshot.test.ts` / `test/session-follow.test.ts` / `binding.mjs:880` 的 `panelNotice` **零触碰**（列白名单） |
| **R-V45-105** | **`#composer` 出流后 flex 布局参与**：若任一代码路径解除 `hidden`，body 尾表单元件会挤占 flex 高度（三区比例断言连带红） | 中 | 中 | 新增断言「`#composer.hidden === true` 恒真（除 ask 卡文本输入外无解除路径）」；`journey #15b` 占比护栏兜底 |
| **R-V45-106** | **反证注入点搬迁后遗漏**：`l1-reverse` / `l2-reverse` / RP-V4-* 的注入目标被迁到卡内/视图内，旧注入点恒绿 | 中高 | 高 | EC-V45-012 落地：每个被改动判据**逐条重写注入点**；`test/gate-integrity.test.ts` 的 `expectFailPattern` 声明数**只增**；「无不再 FAIL 的判据」为收口硬条件 |
| **R-V45-107** | **密度 31 格实测越阈**（迁移内容进入被测量面 ⇒ default/firstRun/risk 档 C1/C2 上升） | 中 | 中高 | 阈值零放宽（NG-V45-007）；若越限 ⇒ **停下上报编排器**（显式取代或结构调整由编排器裁决，禁静默放宽/静默删格） |
| **R-V45-108** | **台账橡皮图章化**：新增 40~55 条 `entries` + 25~35 条 `modifiedRanges` 的 `newTitle` 不可定位 / `reason < 40` 字符 | 中 | 中 | 继承 v4 ADR-V4-009：`newTitle` 必须可在目标文件定位（机器判）；`reason ≥ 40`；每条删除/改写 hunk 必须命中台账 |
| **R-V45-109** | **收口面被拆成两次提交**（W4 与 W5 之间产生中间态取代） | 中 | 高 | **ADR-V45-012**：W4+W5 的终态判据**同一 commit 区间**完成；体积重登记与 journey 新 pin 同轮；失败即回滚整个区间 |

### 6.3 风险 Top5（按「概率 × 影响」排序）

| 排名 | 风险 | 触发信号 | 停机规则 |
|:-:|---|---|---|
| 1 | **R-REG-001 journey 二次取代失控** | 新 pin 无法命中 / v3 段判据因 `supersededFrom` 链断而红 | 立刻回到八步 ①~④，不得改 v3 台账 |
| 2 | **R-V45-101 / R-REG-015 体积过界** | `newBaselineBytes < 460,801` 或 `size > ceiling` | **停下上报**（禁静默改三值 / 禁自缚装置） |
| 3 | **R-V45-106 反证空转** | 某判据注入后仍绿 | 重写注入点；仍不能红 ⇒ 该判据视为无效并上报 |
| 4 | **R-REG-009 / R-V45-108 台账与反证形式化** | `newTitle` 定位失败 / hunk 未命中 | 补齐台账；不得先删后补 |
| 5 | **R-V45-107 密度越阈** | 任一登记格 C1/C2 > 阈值 | **停下上报**（阈值零放宽） |

---

## 7. 生成的 ADR（**ADR-V45-001~012，全部 ACCEPTED**）

> 与 v1 `ADR-001~018`、v2 `ADR-V2-001~033`、v3 `ADR-V3-001~036`、v4 `ADR-V4-001~040` **零编号冲突**。状态 = **ACCEPTED**（编排器代作者决策；作者已授权编排器代行决策、全流程自行调度）。每条 ADR 含 **背景 / 选项 / 裁决 / 后果 / 回滚** 与 **FR/AC 映射**；「回滚」一律指「同一 commit 区间内 `git revert` + 台账回退 + 门禁复跑」的**原子回滚**。

| ADR | 标题 | 状态 | 覆盖必答 |
|-----|------|:--:|:--:|
| ADR-V45-001 | 单写机制：5 通道可见投影**真退役** + 门禁读流内行/卡的断言重写策略 | ACCEPTED | ① |
| ADR-V45-002 | 流纯时间序：4 宿主退役渲染架构 + decision 壳元素去向的 DOM/数据流设计 | ACCEPTED | ② |
| ADR-V45-003 | `#composer` 出流：body 尾 hidden + journey/binding 兼容证明 + `requestTurn` 零变化 | ACCEPTED | ③ |
| ADR-V45-004 | journey 第二次八步显式取代：`supersessionChain` 链式新 pin 流程 | ACCEPTED（含 schema 扩展登记） | ④ |
| ADR-V45-005 | binding 保段策略：段前字节中立避让 + 段外逐行登记 | ACCEPTED（含兜底上报规则） | ⑤ |
| ADR-V45-006 | density 31 格重算：实测流程 + v4.5 台账显式取代 + 夹具锚三重构造判据 | ACCEPTED | ⑥ |
| ADR-V45-007 | `risk-recovery` 扩展：site/probe 触发 + chips 规则表 + act 闭集 6 项 + 本地 act 布线门禁 | ACCEPTED | ⑦ |
| ADR-V45-008 | 手势 → 设置「帮助」分区：`SETTINGS_SECTION_IDS` 单源派生 | ACCEPTED | ⑧ |
| ADR-V45-009 | `options/index.html` 解冻：`unfrozenZeroDiffFiles` 字段扩展 + 范围门禁 + zero-injection 复跑 | ACCEPTED | ⑨ |
| ADR-V45-010 | host-registry 零宿主断言：注册表降级为反向判据 + `RETIRED_*` 扩容 | ACCEPTED | ⑩ |
| ADR-V45-011 | 体积军规：净减双向登记 + V3-VOL-3 档位不下移硬约束 | ACCEPTED（含停机规则） | ⑪ |
| ADR-V45-012 | W4 分层实施序：单叶五波 + 共享收口面原子性 | ACCEPTED | ⑫ |

---

### ADR-V45-001: 单写机制（5 通道可见投影真退役 + 断言读流内行/卡）

**状态**: ACCEPTED
**影响**: FR-V45-010 / 011 / 012 / 013 / 014 / 015 · AC-V45-001 / 003 / 004 / 016 · G-V45-001 / 006 · NG-V45-001 / 017 · NFR-V45-004 / 007 / 008 · R-REG-005 / 010 / 901

#### 背景

5 条提示带（`#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice`）的事实**已**由唯一系统事件通道 `appendSystem(kind, text)` 承载（v4-4 落地：去重 5000 ms / 限速 20 行·分钟 / `持续：` 前缀 / `dropped` 不静默 / 净化），但 DOM 投影仍在：`host-registry.ts:74-76` 逐字承认「keep their readable **status projection** … **ALSO append-recorded**」。这使「事实面唯一」不成立（同一事实 2 份可见投影）。同时 `STRIP_CHANNEL_KINDS` 的判据之一是「legacy id **仍在 DOM**」（`test/density-thresholds.test.ts:715`），与退役**正面矛盾**。BLOCK-02 的教训要求：判据必须能区分「过渡关闭」与「删属性充数」。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **DOM 真退役**（节点 + `li[data-host="strips"]` + `.strips` 移除）；事实面 = 流内行/卡；门禁改写为「读流内行/卡」 | ✅ **选中** |
| B | `hidden` 保数据（节点保留） | ❌ 违反 NG-V45-001；双写制度痕迹保留 |
| C | 保留 id 空壳（`<div id="notice" hidden>` 留桩） | ❌ 违反 FR-V45-010（`getElementById` 必须 `null`）；空壳 = 隐形宿主 |

#### 裁决

1. **退役面**（真移除，非 `hidden`）：`#env-guard` / `#site-hint`（含 `sh-title`/`sh-detail`/`sh-action`）/ `#onboarding` / `#discovery-notice`（含 `dn-title`/`dn-detail`）/ `#notice` + `li[data-host="strips"]` + `.strips`。
2. **`#send-reason` 不在退役面**（在 `#region-statusbar` 内；法三「状态栏只放常驻状态与风险」不变）。
3. **事实载体**：`kind='env'` / `'site'` / `'probe'` / `'firstRun'` / `'notice'` 的单行系统事件行（或 `firstRunCard`）；**载体数 == 1**（首屏三事实 env / site / probe 逐条断言）。
4. **富内容承载**：`site` / `probe` 的长文案（含退避策略全文）→ 行的 `title`（**同过净化**）+ 设置视图站点分区详情（**同源**：同一常量/派生函数）。
5. **`onboarding` / `discovery-notice`** 沿用 `view-model.ts#firstRunCard` 归并先例（`terminable` 的 `!open` 谓词**不得丢失**）。
6. **门禁迁移策略**（15 文件 / 44 处 strips 引用的改写口径）：
   - `getElementById('notice')` → `querySelector('#stream [data-msg-type="system"][data-kind="notice"]')`（选择器重锚，**语义不变**）；
   - 「节点存在」类正面断言 → 「**节点为 `null`** + 流内载体恰 1」**双断言**（数量**只增**）；
   - `#site-hint` 可见性/原因/动作（`journey #11c~#11e`）→ 流内行 + 行 `title` + 推荐卡 chips；
   - `#env-guard`（`hardening.mjs` ×3 + `env-guard.test.ts`）→ 流内行断言；
   - `#onboarding`（`recommendation.mjs ⑬` / `density.mjs`）→ `firstRunCard` / state 读取；
   - `#discovery-notice`（`binding.mjs AP#4b` / `insight.mjs` / `hardening.mjs`）→ 流内行；
   - 归并矩阵（`density-thresholds.test.ts:715`）→ **新语义**：① 每 kind 有**唯一 emitter 调用点**（源文本机核）② 该 kind 可见载体数 == 1 ③ `#send-reason` id 仍在 `#region-statusbar` 内；
   - **`notice` 同名语义白名单**（R-V45-104）：`test/chat-events.test.ts` / `test/protocol.test.ts` / `test/notify-tools.test.ts` / `test/bookmarks-tools.test.ts` / `test/downloads-tools.test.ts` / `test/fullpage-screenshot.test.ts` / `test/session-follow.test.ts` / `test/sidepanel.test.ts` 的 `notice` 为**事件/会话语义**，**零触碰**。
7. **`STRIP_CHANNEL_KINDS` 重构**（`src/ui/sidepanel/host-registry.ts`）：`{channel, kind, emitterSite, carrierCount: 1, reason}`；`emitterSite` 由源文本抽取机核（唯一调用点）。
8. **反证**（每处可 FAIL）：① 向 `#stream` 注入第二条同 kind 行 ⇒ 「载体数 == 1」红；② 恢复一个 `#notice` 节点 ⇒ 「节点为 `null`」红；③ 删掉某 kind 的唯一 emitter ⇒ emitter 唯一性红；④ 向行 `title` 注入 `?token=…` ⇒ 净化反证抛错。

#### 后果

- 「事实面唯一」由**节点不存在 + 载体恰 1** 双判据锁死（不是约定）；BLOCK-02 的复辟路径（隐藏/留桩）被结构性封死。
- 门禁从「描述旧形态」迁移为「描述新形态」，断言数**只增**（每条退役断言换来 ≥1 条新断言 + 反证）。
- 代价：15 文件 / 44 处引用的迁移是本 Feature 最大单点工作量（W2 主要成本）；`title` 引入新的零明文面（NFR-V45-003 已配反证）。

#### 回滚

移除的 DOM 结构可由 `git revert` 一键还原（同一 commit 区间）；`STRIP_CHANNEL_KINDS` 重构与门禁改写同区间回滚；台账 `entries[]`/`modifiedRanges[]` 的追加条目同区间撤回。**禁止**「保留 hidden 作为临时回滚态」提交。

---

### ADR-V45-002: 流纯时间序（4 宿主退役渲染架构 + decision 壳元素去向）

**状态**: ACCEPTED
**影响**: FR-V45-020 / 021 / 022 / 024 / 025 / 026 · AC-V45-002 / 006 / 007 / 008 / 009 · G-V45-002 / 005 · NG-V45-002 / 014 / 017 · DC-V45-010 / 011 · R-REG-003 / 004 / 014 · R-V45-103

#### 背景

`ol#stream` 现有 **4 个固定位置宿主**（`decision` / `composer` / `l1-panels` / `strips`）把时间序切段：DOM 全序 = `[decision][卡…][composer][l1-panels][strips]`。卡插入锚 = composer 宿主（`stream-render.ts:69-71`），**宿主必须存在**才能插入 ⇒ 宿主退役必然连带渲染器锚迁移。宿主内 37 条元素需逐条去向（父 §11：退役 19 / 迁移 13 / 消解 3 / 保留 2）。核心难点：迁移元素若**保留全局 id**，多卡并存会产生重复 id（v4-3 曾因 `#ask*` 重复被 review 判 I-07）；若**全部换新 id**，取代面暴增且与 NFR-V45-006 兼容面冲突。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **卡内作用域 + 唯一活跃卡铸造**：迁移元素进卡；仅唯一活跃/最新卡铸造稳定 id；历史卡以 `data-*` + `[data-card-key]` 作用域承载 | ✅ **选中** |
| B | 保留全局 id，仅出现在「当前卡」 | ❌ 历史卡恢复动作不可达 ⇒ 恢复链断裂 |
| C | 全量新 id 命名空间（`ref-*` / `ask-*`） | ❌ 取代面过大 + 兼容面冲突（R4-14 教训） |

#### 裁决

1. **`#stream` = 纯时间序卡列表**：4 个 `li[data-host]` 全部移除；`messageAnchor()` 改为返回 `null`（卡追加到 `#stream` 尾部；`insertBefore(node, null)` 语义），源码不再查询 `li[data-host="composer"]`。
2. **唯一允许的非卡子节点** = 空态占位 `<p class="log-empty-text">`（`setEmpty()` 口径不变）；判据 = `#stream` 子节点集合 == 卡 `li[data-msg-type]` 集合 ∪（空态时恰 1 个 `p.log-empty-text`）；**反证**：注入任一其他子节点 ⇒ 红。
3. **`decision` 壳去向**（父 §11.1 逐条）：

| 元素 | 去向 | 承载方式 |
|---|---|---|
| `li[data-host="decision"]` / `#l0-decision` | **退役** | 节点移除 |
| `#l0-kicker` / `#l0-ref-badge` / `#l0-ref-toggle` / `#l0-more` / `#l0-receipt-summary` | **退役** | 角色名 / 失效标记由卡自身 `data-*` + 卡内徽标承载；回执摘要 → 卡固化区 + 审计视图 |
| `#l1-more` / `#l1-more-options` / `#l1-consequences-toggle` / `#l1-consequences` / `#l1-consequence-tpl` | **迁移** → `askuser` / `auth` 卡内选项池与后果预演区 | **唯一活跃决策卡铸造**（沿用 `#ask*`/`#confirm*` 先例）；历史卡以 `data-ask-options` 作用域承载；三段模板文案**逐字不变** |
| `#l1-ref` / `#l1-ref-summary` / `#l1-ref-rows` / `#l1-ref-actions` / `#l1-ref-repick` / `#l1-ref-describe` / `#l1-ref-rescue` / `#l1-ref-reason` | **迁移** → `ref` 卡卡内证据区 + 恢复区 | **最新引用卡铸造**稳定 id；历史引用卡以 `data-ref-action` + `[data-card-key]` 作用域承载；`#l1-ref-rescue` 可见性谓词（唯一文本匹配）**逐字不变**（EC-V45-005） |

4. **`l1-panels` 组去向**（父 §11.2 逐条）：

| 元素 | 去向 | 承载方式 |
|---|---|---|
| `li[data-host="l1-panels"]` / `#l1-group` + 4 触发器 | **退役** | 节点移除 |
| `#l1-history-toggle` / `#l1-history` / `#l1-history-rows` | **退役**（DC-V45-002：历史 = 流本身；`rounds[]` 已由 `project()` 派生） | 已决步数计数 → `#l2-audit-count`（审计视图标题区，**全仓唯一**） |
| `#l1-gestures-toggle` / `#l1-gestures` / `#l1-gestures-rows` | **迁移** → 设置视图「帮助」分区（ADR-V45-008） | 表结构与 6 行逐字不变；只读零可点 |
| `#l1-local-tree-toggle` / `#l1-local-tree` / `-rows` / `-hint` | **迁移** → 树视图（L2）只读归因块 `#l2-tree-attribution`（DC-V45-011） | `#view-host` 内；不引入第二滚动容器 |
| `#l1-local-tree-global`（查看全局树） | **消解** | 已在树视图内；控件移除且零悬空引用 |
| `#l1-receipt-toggle` / `#l1-receipt` / `-rows` / `-audit-summary` | **迁移** → 审计视图（L2）证据区 `#l2-audit-evidence` | 行数与摘要语义不变 |
| `#l1-receipt-audit`（查看审计） | **消解** | 已在审计视图内 |

5. **`disclosure.ts` 三份声明重写**（FR-V45-026 / DC-V45-010）：
   - `COLLAPSIBLE_TARGETS` = **7 → 7（零缩减）**：`l1-more` / `l1-consequences` / `l1-local-tree` / `l1-receipt` / `l1-gestures` / `l2-tree-attribution` / `l2-audit-evidence`（后两项为新增视图块；前 5 项为迁移后仍由单一控制器折叠的面）；
   - `DISCLOSURE_WIRING` = 对应 7 对（`l1-more` / `l1-consequences` 的触发器改由卡内 `[data-disclose]` 承担；`l1-history` / `l1-ref` 对**退役**并收入新增 `RETIRED_FOLDABLE_IDS`，带「重新引入即红」反证）；
   - `NEVER_FOLDABLE` = 保留全部不可折叠语义 + **删除 `'l0-decision'`（已退役）并收入新增 `RETIRED_NEVER_FOLDABLE_IDS`**（带反证）+ **新增迁移面 `'l2-tree-attribution'` / `'l2-audit-evidence'` / `'settings-help'`** ⇒ 12 − 1 + 3 = **14（只增）**；`'composer'` **保留**（DC-V45-010：永不折叠 = 禁止折叠，与是否在流内无关）；
     - **〖D-W3-1 注记（review R1 I-02 回写，2026-09-21）〗** 上一句「新增迁移面」**逐字保留为计划口径的历史**，但该字面把 `'l2-tree-attribution'` / `'l2-audit-evidence'` 两项同时写进 `NEVER_FOLDABLE` 与 `COLLAPSIBLE_TARGETS` —— 两张表**互斥**（门禁有「同一 id 不得同时在两表」判据），故该字面**不可实现**。build 的裁决（`build.md §6.7` / `§4.7` **D-W3-1**，技术上必要且正确，本注记将其回写进 ADR）为：新增的三项是 **`'region-stream'` / `'settings-root'` / `'settings-help'`**；`l2-*` 两项**只留在 `COLLAPSIBLE_TARGETS`**（可折叠白名单，迁移后的只读承载块仍需可折叠）；`NEVER_FOLDABLE` 长度仍 **14**（12 − 1 + 3），`'composer'` 保留。**实现与 ADR 正文以本注记口径为准**（实测 `src/ui/sidepanel/disclosure.ts`：`NEVER_FOLDABLE` = 14 项含 `region-stream` / `settings-root` / `settings-help`；`l2-tree-attribution` / `l2-audit-evidence` 仅在 `COLLAPSIBLE_TARGETS` 的 7 项内）。
   - 新增双判据：`#composer.parentElement === document.body` ∧ `#composer.hidden === true`。
6. **FIX-5 消解**（FR-V45-025）：0 计数控件停渲染（其恒驻性来源正是 4 宿主与决策壳）；不单列 AC；收口文档登记「已由 v4.5-1 覆盖」。
7. **L2 迁入方向性**：迁入 `#view-host` 的内容**不豁免**（R-REG-902）；`assertChromeNotInStream()`（`[data-chrome-control]` / `[data-toolbar-slot]` / `.view-btn` 不得在 `#stream` 内）继续成立并被反证；迁入块不引入第二个滚动容器。
8. **反证**：① 注入 `li[data-host="x"]` ⇒ 零宿主红；② 注入第二个 `#l1-more` ⇒ 「文档内计数 ≤ 1」红；③ 移除某迁移元素 ⇒ 卡内可达断言红；④ 向 `#stream` 注入 `.view-btn` ⇒ `assertChromeNotInStream` 抛错；⑤ 注入非卡子节点 ⇒ 纯卡序红。

#### 后果

- F 变化点 1「对话历史 = 流本身」达成；「对话被固定结构夹住」的不可滚动到达问题（历史 −511px 实测）在结构上不再可能。
- 渲染层收敛为「append / patch / remove(bound)」三件事（`messageAnchor = null` 使追加路径更简单）。
- 代价：迁移元素的**作用域查询**替代全局 id ⇒ 门禁改写量中高（9 文件 / 58 处引用，父 §7.3）；「唯一活跃卡」边界成为新的判据面（R-V45-103）。

#### 回滚

宿主与壳元素可由 `git revert` 恢复（同区间）；卡内化的元素与 `disclosure.ts` 三份声明同区间回滚；`COLLAPSIBLE_TARGETS` / `NEVER_FOLDABLE` 的旧值保留在台账 `entries[]` 与 git 历史。**禁止**以「保留 hidden 壳」作为中间回滚态提交。

---

### ADR-V45-003: `#composer` 出流（body 尾 hidden + 兼容证明）

**状态**: ACCEPTED
**影响**: FR-V45-023 / 024 · AC-V45-005 · NFR-V45-006 · NG-V45-006 · DC-V45-010 · R-V45-105

#### 背景

`#composer`（`<form hidden>#input + #send`）现居 `li[data-host="composer"]` 内；法四要求它**非常驻**（默认屏无可见输入框），因此它长期 `hidden`。同时 journey / binding / `requestTurn` 都读 `#input` / `#send`；它也是 `messageAnchor()` 的锚点（ADR-V45-002）。宿主退役后必须给它一个新物理位置，且**不动 id / ARIA / 读取路径**。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **迁 `body` 尾 + 保持 `hidden`** | ✅ **选中** |
| B | 留在流内但 `hidden`（宿主保留） | ❌ 违反零宿主（NG-V45-002） |
| C | 迁工具栏 / 状态栏 | ❌ 违反法三 / 法四（三区各司其职） |

#### 裁决

1. `li[data-host="composer"]` 移除；`<form id="composer" hidden>` 作为 `body` 的**最后一个子节点**（`#settings-view` 之后）。
2. **id / ARIA / 结构零变化**：`#composer` / `#input` / `#send` 全保留；`#input` 的 `placeholder` / `autocomplete` 与 `#send` 的 `type="submit"` 不变。
3. **`requestTurn` 链路零变化证明**：`#composer` 的 submit 监听与 `requestTurn()` 实现**不改**；`requestTurn` 的输入来源仍是 `#input.value` 与卡内动作（`onCardAction`）——迁移只改 `parentElement`。证明手段：① `#input` / `#send` 的 `getElementById` 命中且 `value` 可读写；② journey / binding 的读取面断言**零改动**（计数不减）；③ 反向断言：遍历 `requestTurn` 调用点集合 == 基线，集合变化即红。
4. **兼容断言**（新增，只增）：`#composer.parentElement === document.body` ∧ `#composer.hidden === true` ∧ `#stream` 子树不含 `#composer` / `#input` / `#send`。
5. **布局护栏**（R-V45-105）：断言「除 ask 卡文本输入外**无解除 `#composer.hidden` 的路径**」（源文本机核：`composer.hidden = false` 零命中）；若 build 发现存在解除路径 ⇒ 停止并评估 `flex: 0 0 auto` / `position` 约束。
6. **反证**：① 把 `#composer` 移回 `#stream` ⇒ 零宿主 + 兼容断言双红；② 改 `#input` id ⇒ 兼容面红；③ 删除 `#composer` 的 submit 监听 ⇒ `requestTurn` 调用点集合红。

#### 后果

- 法四「无常驻输入框」与零宿主同时满足；`#composer` 的 id/ARIA 兼容契约零破坏（NFR-V45-006）。
- 代价：`body` 尾多一个 `hidden` 表单（不参与布局，除非被解除 hidden ⇒ 由护栏看住）。

#### 回滚

把 `#composer` 移回 `#stream` 并恢复宿主 `li`（`git revert` 同区间即可）；`hidden` 常驻语义不变。

---

### ADR-V45-004: journey 第二次八步显式取代（`supersessionChain` 链式新 pin 流程）

**状态**: ACCEPTED（**含 schema 扩展登记**）
**影响**: FR-V45-080 / 083 / 084 · AC-V45-014 / 016 / 017 · NFR-V45-001 · R-REG-001 / 014 · R-V45-108

#### 背景

`docs/v4-supersession-ledger.json#protectedRanges[0]` 当前 = journey 的 **active pin** `43054..55259` / sha `e2b500df…` / `supersededFrom 6b45c3fa…`（v3 pin）/ `leafBase 187c205`。宿主清零与 strips 退役改变 `#stream` 的子节点集合与顺序 ⇒ `#15a~#15q` **必须第二次显式取代**。两个约束同时成立：

- **约束 ①（v3 段判据，不能放宽）**：`test/supersession-ledger.test.ts:699-740` 对 **v3 台账**的 journey pin 查找 superseder 时用 **严格等值** `status==='active' && supersededFrom === '6b45c3fa…'`，并用 `superseder.leafBase` 的 `git show` 版本**逐字节复算 v3 旧 pin**（`startByte` 也要复算）。
- **约束 ②（链式保留）**：新 pin 的 `supersededFrom` 应指向**直接前驱**（`e2b500df…`），且「旧 pin 可机核」要求 v4.5 之前的 pin 链全部可复算。

若直接把 `supersededFrom` 改成 `e2b500df…`，约束 ① 的查找落空 ⇒ v3 pin 必须命中当前字节（必然 FAIL）。若保留 `supersededFrom = 6b45c3fa…`，则链式语义失真。**故需显式扩展 schema + 等价改写判据。**

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **`protectedRanges[0]` 新增 `supersessionChain[]`**（每链节含 `sha256` / `supersededFrom` / `supersededOn` / `leafBase` / `note`）；`supersededFrom` 指向直接前驱；v3 段判据升级为**链式查找** | ✅ **选中** |
| B | 新增第二条 journey `protectedRanges` 条目（旧条目标 `status:'superseded'`） | ❌ v4 段判据要求「每条 range 都是 `active`」⇒ 必须改判据且产生同文件同段落歧义 |
| C | 把 binding 式「保段」照搬到 journey（不改字节） | ❌ 语义上不可能（段内逐字读退役面） |
| D | 只改 v3 台账（写 `supersededFrom` 指向新 sha） | ❌ v3 台账**冻结历史，零 diff**（FR-V45-052 / T5） |

#### 裁决

**八步流程（每步产出可机核证据；沿用 v4 ADR-V4-008 体例）**：

1. **记录 old**：把当前 active pin `{file, startAnchor, endAnchor, startByte: 43054, endByte: 55259, sha256: e2b500df…, lineCount, supersededFrom: 6b45c3fa…, leafBase: 187c205}` **先写入 `protectedSupersession.history[]`**（v4-1 段逐字保留），再更新顶层字段。
2. **逐段决策**：journey → `decision:"supersede"`，理由 = 「4 宿主退役改变 `#stream` 直接子节点集合与顺序；`#15a~#15q` 逐字读 `#stream`/`#l0-decision`/`#l1-*` 与流区几何，字节不变在语义上不可能」；binding → `decision:"keep"`（见 ADR-V45-005）。
3. **`#15a~#15q` 同编号等价改写（强度不降）**：

| 编号 | 现状断言 | v4.5 等价断言 | 强度 |
|---|---|---|---|
| `#15a` | `#region-stream` flexGrow === '1' | 不变（`#stream` 仍为唯一滚动区） | 同等 |
| `#15b` | `#region-stream` / innerHeight **≥ 65%** | **不变（只允许上调）**；`STREAM_HEIGHT_RATIO_MIN = 0.65` 逐字不动 | 同等/更强 |
| `#15c` | 默认屏无可见常驻输入框 ∧ `#composer` 存在必须 `hidden` | **加严**：`#composer.parentElement === body` ∧ `hidden === true` | 更强 |
| `#15d` | 文档级零水平溢出 | 不变 | 同等 |
| `#15e` | 三区结构 + 回到底部 | 不变 + `#stream` 子节点全为卡（零宿主） | 更强 |
| `#15f~#15q` | 消息卡 / 工具卡 / 滚动 / 320px | 选择器重锚；新增「卡序不被宿主切段」判据（`#stream > li` 全 `data-msg-type`） | 更强 |
| 段外 `#11c~#11e` | `#site-hint` 可见性 + 原因 + 动作 | 流内行 + 行 `title` + 推荐卡 chips（三处呼应） | 同等 |

4. **登记 `modifiedRanges[]`**：`journey.mjs` 的改写区间逐条写入（`{file, range/lines, oldId:"#15a~#15q", decision, reason, leaf:"specs-tree-v45-1-single-write-chronology"}`）。
5. **计算并写入新 pin**：
   - `protectedRanges[0]`：`sha256` = **新 pin**（重算）；`startByte`/`endByte` 重算；`status:"active"`；`supersededFrom:"e2b500df…"`（直接前驱）；`supersededOn` = 实测日期；`leafBase` = v4.5-1 build 起点 commit；`oldPin` = `{e2b500df…, startByte:43054, endByte:55259, verifiedAgainstRevision: <v4.5-1 leafBase>}`；
   - **新增 `supersessionChain[]`**：

```json
[
  {"sha256":"6b45c3fa…","supersededFrom":null,"supersededOn":"2026-09-19","leafBase":"187c205","note":"v3 pin（原始）"},
  {"sha256":"e2b500df…","supersededFrom":"6b45c3fa…","supersededOn":"2026-09-19","leafBase":"187c205","note":"v4-1 第一次取代"},
  {"sha256":"<新 pin>","supersededFrom":"e2b500df…","supersededOn":"<v4.5 日期>","leafBase":"<v4.5-1 leafBase>","note":"v4.5-1 第二次取代"}
]
```

   - `protectedSupersession`：`old` = e2b500df…；`newPin` = 新 pin；`eightSteps` = v4.5-1 八步证据；`countEvidence` = journey ≥167 实测；`rpV408.status = "landed"`；`status = "complete-steps-1-8"`；`knownGap` = 「V4.5-1 第二次取代闭环（残余：无）」（满足一致性机核的「闭环 / 残余：无」字面要求）；`knownGapHistory` **追加**（v4-1 原文保留）；新增 `history[]` 保存 v4-1 段逐字记录。
6. **计数守恒**：journey 运行时 check 数 **≥167**（同编号改写不减；新增判据只增）；`countMethod = "runtime-check-calls"`。
7. **`redlineRemap[]` 追加**：`#15b` ≥65% 语义保留（门槛不动，锚点已换）；`#15c` composer 贴底 → 「出流 + hidden + 父节点 == body」显式取代；`logClientHeightFloor`（`docs/v4-density-baseline.json`）不变。
8. **反证 RP-V4-08 复用**（实跑）：① 段内改 1 byte ⇒ 台账/占位门禁 **FAIL**；② 段外改 1 byte ⇒ **不红**；③ 删 1 条断言 ⇒ 计数下界 FAIL；④ 逐字节还原（sha256 前后相同）⇒ PASS。日志全量落盘（禁截断）。

**门禁判据的等价升级（`test/supersession-ledger.test.ts`，只增）**：

- v3-段 superseder 查找改为 **链式**：`(r) => r.file === range.file && r.status === 'active' && (r.supersededFrom === range.sha256 || (r.supersessionChain ?? []).some(l => l.sha256 === range.sha256))`；
- v3 旧 pin 复算改用**命中链节的 `leafBase`**（而非顶层 `leafBase`）；
- 新增断言：链长 ≥2；链节连续性 `chain[i].supersededFrom === chain[i-1].sha256`（首节为 `null`）；链覆盖 v3 pin 与 v4-1 pin；`protectedRanges[0].supersededFrom === chain.at(-2).sha256`；`protectedSupersession.newPin.sha256 === protectedRanges[0].sha256`（同源）；`protectedSupersession.history` 保留 v4-1 段（`old.sha256 === '6b45c3fa…'`）。
- **计数只增**：`test:supersession ≥33`。

#### 后果

- 同一份台账同时满足「v3 历史可逐字节复算」「链式前驱语义」「当前字节被新 pin 锁死」三约束；`supersession` 门禁从单段判据升级为**链式判据**（更强）。
- 代价：台账 schema 扩展（`supersessionChain` / `history` / `unfrozenZeroDiffFiles` 字段扩展）必须与门禁改写同区间完成；后续任何对该段的改动都要走第三次取代。

#### 回滚

`protectedRanges[0]` / `protectedSupersession` / `supersessionChain` / `modifiedRanges` / `redlineRemap` 的改动与 `journey.mjs` 的改写**同一 commit 区间**，`git revert` 整体回退；**禁止**只回退台账或只回退测试。

---

### ADR-V45-005: binding 保段策略（段前字节中立避让 + 段外逐行登记）

**状态**: ACCEPTED（**含兜底上报规则**）
**影响**: FR-V45-081 · AC-V45-015 · EC-V45-013 · R-REG-002 / 006 · R-V45-102 / R-V45-104

#### 背景

`docs/v4-supersession-ledger.json#protectedRanges[1]` = binding 保护段 `107780..115930` / sha `be9ad0e9…`，`decision:"keep"`，`supersededFrom: null`，`status:"active"`。由于**没有 superseder**，v3 段判据对 binding 走「严格路径」：当前 chunk 的 sha **必须**等于 `be9ad0e9…` **且** `byteOffsetOf(startAnchor)` 必须等于 `107780`。binding 段外有 3 处读退役面：`binding.mjs:896`（`#4b/#4c` 读 `#notice` 文本）在**段前**；`binding.mjs:2256`（`AP#4b` 读 `#discovery-notice`）在**段后**；`binding.mjs:880` 的 `panelNotice` 为事件语义（**零触碰**）。**段前的任何字节长度变化都会平移 `startByte` ⇒ FAIL**。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **保段 + 段前字节中立避让**（等长改写 + 同前置区等量删白/补白）+ 段后自由改写 | ✅ **选中（首选）** |
| B | 显式取代 binding pin（链式 + 等价八步） | ⚠️ **兜底**：仅在 A 不可行且**上报编排器后**启用 |
| C | 让流内行沿用 `#notice` id（不改 binding 断言） | ❌ id 复用 = 隐性宿主复辟（违反 FR-V45-010 / ADR-V45-001） |

#### 裁决

1. **保段（首选）**：`be9ad0e9…` 与本段字节**零 diff**；`startByte` 仍为 `107780`。
2. **段前改写（`:896`）字节中立**：把 `document.getElementById('notice').textContent` 改为读**流内系统行**的等价表达式；新表达式与旧表达式的 `Buffer.byteLength` 差必须由**同一前置区**（偏移 < 107780 的注释 / 空行）的等量删白或补白补偿，使 `byteOffsetOf(startAnchor) === 107780` **逐字节成立**。
3. **段后改写（`:2256`）自由**：`AP#4b` 的 `#discovery-notice` 读取改为流内行 / state 读取；不影响 `startByte`；段本体未动。
4. **逐行登记**：两处改写写入 `modifiedRanges[]`（`{file, lines, oldId:"#4b/#4c" | "AP#4b", decision:"equivalent-rewrite", reason, leaf}`）+ `entries[]`（`oldTitle` 为原表达式、`newTitle` 必须可在目标文件定位）。
5. **`#notice` 双角色同时迁移**（EC-V45-013）：授权回执事实 → 流内行 `kind='notice'` / 卡固化区 + 审计视图；密度夹具锚 → 构造判据（ADR-V45-006）。**不得只迁一处留下悬空**。
6. **门禁判据（新增，只增）**：① `protectedPinFailures(bindingRange, currentText) === []`（sha + 双字节偏移）；② `byteOffsetOf(startAnchor) === 107780` 显式断言；③ `modifiedRanges` 中 binding 的两条登记可定位。
7. **兜底（A 不可行时）**：**停下上报编排器**，附「等长补偿不可行」的证据（可删白区已耗尽 / 改写后语义不完整）；获批后走 binding pin 显式取代：`supersededFrom = be9ad0e9…` + `supersessionChain[]` 追加 + 等价八步证据 + `redlineRemap`（若涉及红线）。**禁止静默改 pin**。
8. **`notice` 同名语义白名单**（R-V45-104）：`binding.mjs` 内仅 `getElementById('notice')` / `#notice` 选择器为迁移判据；`panelNotice`（`:880`）等事件语义读取**零触碰**。
9. **反证**：① 段内改 1 byte ⇒ sha 红；② 段前多加 1 byte 且不补偿 ⇒ `startByte` 红；③ 该文件 diff 未登记 ⇒ hunk↔台账红。

#### 后果

- binding 段保持「v4 以来零 diff」的最强保护形态；迁移代价被限制在**两行级**改写 + 字节补偿。
- 代价：段前实现的自由度受限（R-V45-102）；补偿可能引入注释噪点，但换来保护段完整性。

#### 回滚

两处改写 + `modifiedRanges`/`entries` 追加同区间 `git revert`；binding 段本体与 sha 从未变更。

---

### ADR-V45-006: density 31 格重算（实测流程 + v4.5 台账显式取代 + 夹具锚三重构造判据）

**状态**: ACCEPTED
**影响**: FR-V45-070 / 071 / 072 / 073 / 074 · AC-V45-006 / 018 · NFR-V45-001 / 007 · DC-V45-006 · R-REG-006 / 008 / 009 / 902 · R-V45-106 / 107

#### 背景

口径 = 「`document.body` 表达式根 + `DENSITY_EXCLUDED_SUBTREES = ['#stream']` 单源排除」；阈值 `default 7/15` · `firstRun 9/20` · `risk 17/35`；31 登记格（28 机对 + 3 名义）。宿主退役 + 内容迁入 `#view-host`（**不豁免**）+ 设置视图 + `#composer` 出流 ⇒ 登记格必然变化；夹具稳态锚 = `#notice` 存在且非 `hidden`（`density.mjs:346-364`）**必然失效**。且迁移内容进被测量面可能**推过阈值**（阈值不得放宽）。

#### 选项

| 选项 | 夹具锚 | 结论 |
|---|---|---|
| A | **三重构造判据**：流内 `[data-kind="notice"]` 行存在 ∧ 无未终态卡 ∧ `#stream` 卡数 == 期望值 | ✅ **选中** |
| B | 换用另一常驻元素（如 `#risk-rail`） | ❌ 锚仍在「元素存在性」上，未来同遇；且语义不对应稳态 |
| C | 固定等待 / sleep | ❌ **静默回退** closeout 轮 F2/K-1 的确定性修复（明文禁止） |

#### 裁决

1. **口径零放宽**（逐字不动）：`DENSITY_EXCLUDED_SUBTREES = ['#stream']`（全仓唯一声明）；豁免**只认 `hidden`**；阈值 `7/15 · 9/20 · 17/35`；防滥用 单卡 ≤6 / 首屏 ≤2 / 合计 ≤8 / 欢迎卡 ≤1 / 欢迎文案 ≤8 行；`assertChromeNotInStream()` 双判据方向不变。
2. **测量流程（收口轮 W4，严格串行）**：
   a. `npm run build` → `stat -c %s dist/sidepanel.js`（体积先记，供 ADR-V45-011）；
   b. `npm run test:density` **首轮实测** → 记录 31 格三视口读数（C1/C2/归属/chars）；
   c. 与基线逐格 diff → 全部写入 `docs/v4-density-baseline.json` 新增 **`v45Ledger`** 块：`{cell, tier, vp, before, after, delta, measuredOn, source, reason, historyRetained}`（**每格留痕，无静默改写**）；
   d. `thresholds` / `streamHeightRatioMin` / `logClientHeightFloor` / `registeredCells` / `perCardBudget` **零 diff**；
   e. `riskIncrementRegistry` 双向精确期望按新面重锚，溯源门槛字段 `rulingId` / `rulingDate` / `approvedBy` / `reason` **缺任一字段即 FAIL**；
   f. 复跑 `npm run test:density` → 阶段 F 机器比对全绿（≥175）。
3. **夹具稳态锚（三重构造判据）**：
   - `settledProbe` 重写为读「流内系统行 `[data-msg-type="system"][data-kind="notice"]` 存在」+「`#stream > li[data-msg-type]` 中无未终态卡」+「`#stream > li[data-msg-type]` 计数 == 登记期望」；
   - `assertFixtureSettled()` 逐 cell 断言三项；**反证**：把构造序列的最后一步延后（少跑一步）⇒ 三项之一必红；
   - **不依赖运行顺序**：跨夹具顺序置换不产生新红（沿用 closeout 口径）。
4. **反证不空转**：RP-V4-01~09 复跑；注入点若因形态迁移被搬走（如 `#l0-decision` 注入点不存在了）**必须重写注入点**（改注入到新承载面：卡内 / `#view-host` 内）；流程 = 注入 → FAIL（声明 `expectFailPattern`）→ 逐字节 sha256 还原 → PASS；日志全量。
5. **迁出/迁入方向性**：内容迁出 `#stream` 时不得把常驻控件带入流内（`assertChromeNotInStream()` 继续成立并被反证）；迁入 `#view-host` 的内容**进被测量面**。
6. **越限停机规则**：若任一登记格 C1/C2 > 阈值 ⇒ **停下上报编排器**（可选项：结构调整 / 显式取代阈值并留痕）；**禁止**静默放宽、静默删格、把内容挪回 `#stream` 蹭豁免。
7. **V45-P-012 保持 `pending-measurement`**：具体格数与差值在 build/收口轮实测填入，**禁止预填**。

#### 后果

- 密度门禁从「描述旧形态」迁移为「描述新形态」；夹具确定性由**构造**保证（不回退 F2/K-1）。
- 迁移内容进被测量面这一事实被显式登记（EC-V45-011 / R-REG-902），不再有「借豁免降密度」的口子。
- 代价：收口轮需 2 次全量 Chromium 密度实测 + 1 次架构级 diff 复算（串行，耗时占 W4 主要部分）。

#### 回滚

`docs/v4-density-baseline.json` 的 `v45Ledger` 与 `riskIncrementRegistry` 改动 + `density.mjs` 的锚/注入点改写同区间 `git revert`；阈值从未改动。

---

### ADR-V45-007: `risk-recovery` 扩展 + chips 规则表 + act 闭集 6 项 + 本地 act 布线门禁

**状态**: ACCEPTED
**影响**: FR-V45-030 / 031 / 032 / 033 · AC-V45-011 / 012 · NG-V45-015 · DC-V45-003 · R-REG-904 / 905 · R-V45-103

#### 背景

`recommend.ts` 现状：`NEXTSTEP_ACTS = ['next','repick','describe','authorize']`（4 项）；`RECOVERY_RISK_CLASSES = ['refInvalid','declarationInvalid','hardFloor']`（3 类，**不含 site / probe**）；`NEXTSTEP_SOURCE_WHITELIST` 7 项**已含 `site` / `probe`**；`passesSafety` 仅对 `act==='next'` 做 deny 判定（本地动作默认不在 deny 集）；`MAX_CHIPS_PER_CARD = 3`；`cards/nextstep.ts` 的 `data-act` 纯透传（A17）。退役 strips 后，`site`（无活跃站点 / 绑定失效）与 `probe`（探测态异常）的可行动恢复必须落到推荐卡；且需要「重新绑定当前标签页」——恰好是设置视图 `#rebind` 的既有能力。FIX-1 已立「本地动作 ≠ 聊天消息」先例（`authorize`），`help` 同口径扩容。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **恢复触发集扩展**（site / probe 并入 priority 1）+ **chips 规则表**（触发 → 动作优先序，取 ≤3）+ **act 闭集 6 项** + **本地 act 布线门禁** | ✅ **选中** |
| B | 为「重新绑定」新增旁路入口（第 5 张规则 / 卡外按钮） | ❌ 旁路 = 双实现漂移（R-REG-905） |
| C | 把 rebind 做成 `act:'next'`（把文本发给 LLM） | ❌ 与 FIX-1 同类缺陷（浏览器权限流不是聊天消息） |

#### 裁决

1. **恢复触发集扩展**（priority 1，与 `refInvalid` / `declarationInvalid` / `hardFloor` 同级）：
   - `site`：`input.site.authorized === false`（无活跃站点 / 绑定失效）；
   - `probe`：**「可行动的未就绪」** = `input.probe.phase !== undefined ∧ input.probe.steady === false ∧ phase ∉ {'ready','probing'}`（即：相位**已报出**、且**未稳态**、且不是 `ready` / 正在 `probing` 的进行态）；
     - **〖D-W3-2 注记（review R1 I-03 回写，2026-09-21）〗** 本条原字面为「`input.probe.steady === false || input.probe.phase !== 'ready'`」，实现**收窄**为上式（`build.md §6.7` / `§4.7` **D-W3-2**）。收窄理由（充分）：原字面的 `phase !== 'ready'` 分支在**从未探测过**的首屏（`phase === undefined`、`steady` 默认 `false`）恒真 ⇒ 首屏会被永久挤进恢复卡，与 ADR-V45-002 §2 的「空态去噪」/ FR-V45-025 直接冲突；收窄后只有「**有相位可行动线索的**未就绪」才进恢复集，`ready` / `probing` 两个**进行态**不触发（避免把正常探测当异常）。**需求面不构成偏差**：父 spec 只说「触发集扩展（site / probe）」未定谓词，故本注记为 ADR 口径同步（谓词收窄须登记）；数据源零扩项（仍只用 `probe` 一项，`NEXTSTEP_SOURCE_WHITELIST` 7 项不变）；
   - **数据源零扩项**：`NEXTSTEP_SOURCE_WHITELIST` 保持 7 项（`site` / `probe` 已在其中）；`RECOMMEND_MODULE_WHITELIST` 保持 `['./stream-plaintext.js']`；
   - `test/recommendation-sources.test.ts` 白名单**零扩项**断言保持绿。
2. **chips 规则表（解决本叶开放问题 V45-P-015 的定值）**：新增 `RECOVERY_CHIP_ORDER`（触发 → 候选动作有序表），渲染前取 `≤ MAX_CHIPS_PER_CARD`：

| 触发 | 候选动作（序） | 取 ≤3 结果 |
|---|---|---|
| `refInvalid` / `declarationInvalid` / `hardFloor` | `repick` → `describe` → `rebind` | 重新拾取 / 改用描述 / 重新绑定当前标签页 |
| `site` | `rebind` → `repick` → `describe` | **重新绑定当前标签页** / 重新拾取 / 改用描述 |
| `probe` | `rebind` → `describe` → `repick` | **重新绑定当前标签页** / 改用描述 / 重新拾取 |

   ⇒ FR-V45-031「site / probe 触发下卡内出现『重新绑定当前标签页』chip」由**规则表首项**保证。
3. **act 闭集终态**：`NEXTSTEP_ACTS = ['next','repick','describe','authorize','rebind','help']`（**逐字该序**，6 项）；`type NextstepAct` 同步；`data-act` 渲染零改动（A17）。
4. **本地动作语义**（逐字继承 FIX-1 口径）：`authorize` / `rebind` / `help` **不经 `requestTurn`**、**不受 `pending` 门控**（沿用 `passesSafety` 只判 `next` 的既有口径；新增断言「本地 act 永不入 deny 集」）；每个本地动作复用**单一生产入口**：
   - `authorize` → `authorizeCurrentSite()`（既有，FIX-1）；
   - `rebind` → `rebindCurrentTab()`（设置视图 `#rebind` 的同一入口）；
   - `help` → `openSettingsSection('settings-help')`（ADR-V45-008 的分区）。
5. **onboarding chip 改动**（FR-V45-041）：`{ text: '了解 6 个页面手势', act: 'next' }` → `act: 'help'`；文案**逐字不变**；点击 **零 user 回合 / 零输入框写入**。
6. **布线门禁**（`test/local-act-wiring.test.ts`，新；仿 `authorize-chip-wiring.test.ts`）：每个本地 act 判据 —— ① 该能力的唯一调用点（`rebindCurrentTab` / `openSettingsSection` / `authorizeCurrentSite` 各恰 1 调用点，且位于单一入口函数内）② 单一入口的调用点集合显式登记（如 `#rebind` 监听器 + `handleCardAction` 的 `'rebind'` 分支 = 2）③ 该 `handleCardAction` 分支**无 `requestTurn(`** ④ ≥3 组伪造源码反证可 FAIL ⑤ 与 `NEXTSTEP_ACTS` **同源**（闭集改一处，本门禁同步红/绿）。
7. **反证**：① 删除 `site` 触发 ⇒ `recommendation.mjs` 恢复卡断言红；② 把 `rebind` chip 改成 `act:'next'` ⇒ 布线门禁 + 「零回合」断言红；③ 新增第 7 个 act 值 ⇒ 闭集同源断言红；④ 删掉 `#rebind` 的单一入口 ⇒ 调用点集合红。

#### 后果

- 退役 strips 后「可行动恢复」不丢语义（G-V45-004）：推荐卡 chips（含 rebind）+ 设置详情 + 行 `title` 三件套。
- `authorize` / `rebind` / `help` 三类本地动作有**统一的结构判据**（零回合 + 单入口 + 闭集同源），杜绝「推荐被拦动作」与「本地动作被丢弃」两个方向（R-REG-904）。
- 代价：`handleCardAction` 新增 2 个分支；`recommend.ts` 规则表成为恢复语义的单源（须注释写清与 `RECOVERY_RISK_CLASSES` 的关系）。

#### 回滚

`recommend.ts` 的闭集/规则表 + `sidepanel.ts` 的 2 个分支 + 新门禁 + `recommendation.mjs` 改写同区间 `git revert`；`NEXTSTEP_ACTS` 旧值（4 项）保留在台账与 git 历史。

---

### ADR-V45-008: 手势 → 设置「帮助」分区（`SETTINGS_SECTION_IDS` 单源派生）

**状态**: ACCEPTED
**影响**: FR-V45-040 / 041 / 042 · AC-V45-010 / 012 · NG-V45-014 / 016 · DC-V45-003 · R-REG-903

#### 背景

`#l1-gestures`（6 手势表）是流内 L1 面板；F 纯形要求 4 宿主清零 ⇒ 该表必须有确定归属。法则六「管理入视图」+ v3 先例（`SETTINGS_SECTION_IDS` 单源、`deriveCounts().settings` 派生、`test/l2-counts` + `test/ui/l2.mjs` 三方同源）给出自然落点。风险：分区数 7 → 8 会连锁改 `deriveCounts().settings` / 入口 `data-count` / 两处门禁（R-REG-903）。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **设置视图「帮助」分区 + `SETTINGS_SECTION_IDS` 单源派生** | ✅ **选中** |
| B | 空态隐藏（无站点时藏起手势表） | ❌ DC-V45-011 已否决（仍是固定位置思维：把噪音挪成「有时出现」） |
| C | 帮助内容独立浮层 / 新视图 | ❌ 新增交互面（违反法一：一次性交互不得出现在流外） |

#### 裁决

1. `src/ui/settings/sections.ts`：`SETTINGS_SECTION_IDS` 追加 `'settings-help'`（**8 项**）；计数仍由 `settingsSectionCount()` / `deriveCounts()` 派生（**禁止硬编码**）。
2. 新建 `src/ui/settings/help.ts`：渲染 `#settings-help`（`class: 'wc-section'`，`id: 'settings-help'`）；表结构「手势 / 作用」保持；6 行由 `view-model.ts#L1_GESTURE_LABELS` + `GESTURE_EFFECTS` **单源**渲染；**只读、零可点控件**。
3. `src/ui/settings/panel.ts`：挂载该分区（不改既有分区内容，NG-V45-014）。
4. `disclosure.ts#NEVER_FOLDABLE` 追加 `'settings-help'`（分区不可折叠）。
5. onboarding 推荐卡 chip `act:'help'` → 打开设置视图并定位到该分区（零回合 / 零输入框写入），见 ADR-V45-007 第 5 条。
6. **三方同源机核**（只增）：① `SETTINGS_SECTION_IDS.length` == `#settings-root > .wc-section` 实测计数 == 设置入口 `data-count`；② 行数 == `L1_GESTURE_LABELS.length`（== 6）；③ 分区内 `button` / `a` / `input` 计数 == 0；④ 键盘可达（`#settings-view` 既有断言保持）。
7. **反证**：① 硬编码计数（改 `data-count` 而不改注册表）⇒ 三方同源红；② 分区内注入 1 个按钮 ⇒ 零可点红；③ 删 1 行手势 ⇒ 行数同源红。

#### 后果

- 静态帮助内容有确定归属（不占首屏、不占流），法则六成立；分区计数继续**派生**，无第二真值。
- 代价：`l2-counts` / `ui/l2` / 入口 badge 的联动机核必须在同区间完成（R-REG-903）。

#### 回滚

`sections.ts` / `panel.ts` / `help.ts` / `NEVER_FOLDABLE` 改动与两处门禁断言同区间 `git revert`。

---

### ADR-V45-009: `options/index.html` 解冻（`unfrozenZeroDiffFiles` 字段扩展 + 范围门禁 + zero-injection 复跑）

**状态**: ACCEPTED
**影响**: FR-V45-050 / 051 / 052 · AC-V45-013 · EC-V45-010 · NG-V45-005 / 013 · DC-V45-004 · R-REG-013

#### 背景

`docs/v3-supersession-ledger.json#zeroDiffFiles` 含 `src/ui/options/index.html`（v3 冻结面）；`docs/v3-supersession-ledger.json` 为**冻结历史，不得解冻**（T5）。v4 台账已有 **`unfrozenZeroDiffFiles[]`** 机制（`{file, reason ≥40}`，`test/supersession-ledger.test.ts:824-840`），但字段不足以表达「范围 = 纯文案行 + 前后文案 + 日期 + 操作者」。FIX-2 已订正其余 4 处指引，唯 options 因冻结遗留 ⇒ 文档-实现不一致是**真实缺陷**。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **解冻单文件纯文案行**（`unfrozenZeroDiffFiles` 字段扩展 + 静态范围门禁 + 复跑） | ✅ **选中** |
| B | 不解冻（保持 deferred） | ❌ 文档-实现不一致继续存在；discovery Q-REG-007 已登记为真实缺陷 |
| C | 解冻并顺带改结构 / 脚本 | ❌ 触碰零注入 / 零权限 / 零依赖红线（R-REG-013） |
| D | 改 v3 台账的 `zeroDiffFiles` | ❌ 违反 T5（冻结历史零 diff） |

#### 裁决

1. **解冻落点 = `docs/v4-supersession-ledger.json#unfrozenZeroDiffFiles[]`**（v3 台账零 diff）；条目 schema 扩展为：

```json
{"file":"packages/web-cli-plugin/src/ui/options/index.html",
 "scope":"copy-only-lines",
 "reason":"<≥40 字符：FIX-2 deferred 关闭，授权指引与实现不一致>",
 "textBefore":"在侧栏『授权当前站点』…",
 "textAfter":"设置 → 站点与授权 …",
 "date":"<实测日期>","operator":"SDDU v4.5-1 build round",
 "frozenBy":"docs/v3-supersession-ledger.json#zeroDiffFiles",
 "reintroductionGate":"test:zero-injection ≥27 ∧ 范围门禁"}
```

2. **文案订正**（FR-V45-051）：授权指引改为「设置 → 站点与授权」口径（或推荐卡中的「授权当前站点」），与 FIX-2 的 4 处订正**逐字一致**；全仓 `grep 「侧栏『授权当前站点』」` 零命中（`tree-ops.ts` 未声称具体位置者除外）。
3. **范围门禁（新增，只增）**：对该文件的 `git diff -U0` 逐 hunk 判定 —— ① 只允许出现在文案区域（不含 `<script>` / `<link>` / `import` / `permissions` / DOM 属性 / 结构标签变更）② 变更行不新增 `href` / `src` / `on*` 属性 ③ 文件字节数变化 ≤ 登记阈值。任一条不满足 ⇒ FAIL。
4. **复跑不回归**（FR-V45-052）：`npm run test:zero-injection ≥27` 全绿且计数不减；`docs/v3-supersession-ledger.json` 零 diff。
5. **反证**：① 在解冻文件中加一个 `<script>` ⇒ 范围门禁红；② 删掉 `unfrozenZeroDiffFiles` 条目 ⇒ `zeroDiffFiles` 段红（未解冻不得改动）；③ `reason < 40` ⇒ 字段门禁红。

#### 后果

- FIX-2 的最后一处 deferred 被关闭（治理面收口，G-V45-006）；零注入 / 零权限 / 零依赖红线由**范围门禁**守住。
- 代价：解冻是治理动作，须在收口文档与台账**双留痕**（范围 / 理由 / 前后文案 / 日期 / 操作者）。

#### 回滚

回退文案行 + 撤回 `unfrozenZeroDiffFiles` 条目（同区间 `git revert`）；v3 台账从未改动。

---

### ADR-V45-010: host-registry 零宿主断言（注册表降级 + `RETIRED_*` 扩容）

**状态**: ACCEPTED
**影响**: FR-V45-060 / 061 / 062 · AC-V45-002 / 016 · G-V45-003 · NG-V45-001 / 002 / 017 · DC-V45-007 · R-REG-010 / 906

#### 背景

`host-registry.ts` 现状把 4 个宿主登记为「permanent structural home now」，理由是「its content is pinned by protection gates」——即**由门禁反推出形态的永久性**（v4.5 的题眼）。`evaluateHostRegistry` 是「登记集合 == 实存集合」双向判据；`RETIRED_HOST_IDS` 仅 2 项。宿主清零后，旧判据的「登记缺失」分支会失效，且「未登记的 `li[data-host]` ⇒ 红」不足以表达「零宿主」（新增宿主**任何**存在即红，无需先登记再比对）。BLOCK-02 教训：判据必须能区分「过渡关闭」与「标记被删」；且必须防「宿主改名 / 塞进卡内」的绕过（R-REG-906）。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **注册表降级为反向判据**：`REGISTERED_STRUCTURAL_HOSTS = []`；`RETIRED_HOST_ATTRS` + `RETIRED_CONTAINER_IDS` 扩容；`evaluateHostRegistry` 升级为「实存集合 == ∅」+ 退役残留 + 过渡标记 + 双写理由移除 | ✅ **选中** |
| B | 保留 4 条登记并标 `transitional:true` | ❌ 违反 DC-V45-007（以登记代替形态收口） |
| C | 只加「任意深度 `[data-host]` 计数 == 0」一条，保留旧注册表与双写理由 | ❌ 双写理由残留（FR-V45-011）；注册表仍暗示「可登记新宿主」 |

#### 裁决

1. `REGISTERED_STRUCTURAL_HOSTS` **清空为 `[]`**（注册表降级为反向判据：「任何新增宿主必须走裁决」= 任何 `li[data-host]` 存在即红，**无需先登记再比对**）。
2. 新增/扩容常量：
   - `RETIRED_HOST_ATTRS = ['decision','composer','l1-panels','strips']`（4 个退役宿主值）；
   - `RETIRED_CONTAINER_IDS` = `['l0-decision','l0-pick','l0-status-band','l0-kicker','l0-more','l0-ref-toggle','l0-receipt-summary','l1-group','l1-history-toggle','l1-history','l1-history-rows','l1-local-tree-toggle','l1-receipt-toggle','l1-gestures-toggle']`（旧容器 id 零残留；`#composer` / `#input` / `#send` / `#send-reason` / `#rebind` **不在此列**——它们保留）；
   - `RETIRED_HOST_IDS` 保留为**并集别名**（兼容既有引用），注释说明已拆分。
3. `evaluateHostRegistry` 升级为 **6 类问题串**（纯函数单一判据，panel / Chromium gate / node gate 同一实现）：
   - ① 任意深度存在 `li[data-host]` ⇒ 红（含 `[data-transitional-host]` 与改名前的等价形态）；
   - ② `RETIRED_HOST_ATTRS` 中任一 `data-host` 值存在 ⇒ 红；
   - ③ `RETIRED_CONTAINER_IDS` 中任一 id 存在 ⇒ 红；
   - ④ `[data-transitional-host]` 计数 ≠ 0 ⇒ 红；
   - ⑤ 退役项反证元数据齐备（每项有「重新引入即红」的反证登记）；
   - ⑥ 注册表源文本不含双写理由（`ALSO append-recorded` 等字面零命中）——FR-V45-011 的机器判据。
4. `STRIP_CHANNEL_KINDS` 重构（ADR-V45-001 第 7 条）后，`test/ui/l0.mjs:71-83` 的 `REGISTERED_TRANSITIONAL_HOSTS = 0` **升级**为「零宿主」结构性判据（不再数注册表，而判 `presentHosts.length === 0`）。
5. `test/host-registry.test.ts`（新）：6 类问题串逐条可 FAIL + **5 组伪造 reading 反证**（仿 v4-4 BLOCK-02 修法：伪造「删属性 / 改名 / 塞进卡 / 只删标记 / 空注册表但仍留 DOM」五种 reading，判据必须逐组红）。
6. **反证**（实跑）：向 `#stream` 注入 1 个 `li[data-host="x"]` ⇒ 门禁 FAIL；移除 ⇒ PASS（逐字节 sha256 还原）。

#### 后果

- 「过渡态清零」（R4-18 / ADR-V4-005 §6）从「制度上不可达」变为**可达且已达成**（G-V45-003）；下次重构面对的是「零宿主」判据。
- 「由门禁反推形态永久性」的推理链被推翻（题眼）：先让实现服从 F 纯形，再让门禁描述新形态。
- 代价：`host-registry.ts` 从「登记契约」变为「反向判据 + 退役真相册」，注释与模块文档需重写；`l0.mjs` 的结构判据重锚。

#### 回滚

`host-registry.ts` + `l0.mjs` + 新门禁同区间 `git revert`；原 4 条登记记录保留在台账 `entries[]` 与 git 历史。

---

### ADR-V45-011: 体积军规（净减双向登记 + V3-VOL-3 档位不下移硬约束）

**状态**: ACCEPTED（**含停机规则**）
**影响**: FR-V45-090 / 091 / 092 / 093 · AC-V45-019 / 020 · NFR-V45-005 · NG-V45-007 / 009 / 010 · R-REG-007 / 015 · R-V45-101

#### 背景

`SIDEPANEL_BASELINE_BYTES = 480_026`；`SIDEPANEL_CEILING = floor(480_026 × 1.05) = 504_027`；`SIDEPANEL_CEILING_CAP_ROLE = 'record-only'`（不设自缚装置）。V3-VOL-3 收口三值：`newBaselineBytes` / `absoluteCeilingBytes = ceilTo50KB(B_final) × 1.10 = 512_000 × 1.10 = 563_200`；`authorConfirmation.status = 'pending-author-line'`（**未闭合义务，不得伪称已确认**）。本 Feature 是**可能净减**的重构（退役 > 新增），而 FR-V45-092 要求「档位 512,000 与绝对上限 563,200 不变」⇒ 存在一个**必须前置计算的算术边界**。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **净减也强制五要素登记**；档位不下移（`newBaselineBytes ≥ 460,801`）；越界 ⇒ 停下上报 | ✅ **选中** |
| B | 净减时跳过登记（「没有增重就没有义务」） | ❌ 违反 FR-V45-090 / 091（任何 byte 变化 ⇒ 强制登记）；且基线失同步 |
| C | 净减越界时静默改档位 / 绝对上限 | ❌ 违反 NG-V45-010 / FR-V45-092；三值必须同源 |
| D | 引入新 cap 兜住 | ❌ NG-V45-009（不设自缚装置，V3-VOL-1 ② 教训） |

#### 裁决

1. **生效上限**（逐字不变）：`effectiveCeiling = min(563_200, floor(SIDEPANEL_BASELINE_BYTES × 1.05))`；`SIDEPANEL_CEILING_CAP` **保持 `record-only`**、**不得被读取**。
2. **任何 byte 变化 ⇒ 五要素重登记（双向）**：`{measuredOn, newBaselineBytes, previousBaselineBytes, previousCeilingBytes, source(dist/sidepanel.js), buildCommand, reason, measuredBy, reRegisteredFrom, direction: 'raised' | 'lowered'}`；净减方向 `reason` 必须写明「有意的结构净减（退役 4 宿主 + 5 条提示带投影）」；旧值进 `SIDEPANEL_BASELINE_BYTES_HISTORY` + `_TIMELINE` + `SIDEPANEL_RE_REGISTRATIONS`（**历史保留**）。
3. **逐模块 metafile 归因**：`Σ 逐模块 Δ + 未归因胶水 == 登记增量`（**允许负 Δ**；`SIDEPANEL_GROWTH_BREAKDOWN.rows` 同步支持负值）。
4. **披露算术机核（I-10）**：`validateReRegistrationDisclosure` 的元组前后值 / Δ / % 与登记字段**逐项相等**（**支持负 Δ**：`Δ = new − prev < 0`、`% = Δ / prev × 100 < 0`）；`META.measuredBy` 与末条登记同源。
5. **V3-VOL-3 三值同源前移**：
   - `PENDING_ABSOLUTE_CAP.newBaselineBytes = SIDEPANEL_BASELINE_BYTES`（**新值**）；
   - 档位 `ceilTo50KB(newBaselineBytes)` **必须仍等于 512,000**；
   - `absoluteCeilingBytes = 563_200`（**不变**）；
   - `resolvedOn` 保持原实测日期（格式 `YYYY-MM-DD`）；
   - `authorConfirmation.status` **保持 `pending-author-line`**（不得伪称已确认）。
6. **档位不下移硬约束（算术，前置）**：`ceilTo50KB(b) = 512_000 ⟺ 460_801 ≤ b ≤ 512_000`（`ceilTo50KB(b) = ⌈b / 51_200⌉ × 51_200`）。当前 `b = 480_026` ⇒ **净减不得超过 19,225 B**（`480_026 − 460_801`）。`test/size-ruling-vol3.test.ts` 新增闸门断言：`newBaselineBytes ≥ 460_801` ∧ `ceilTo50KB(newBaselineBytes) === 512_000`；越界 ⇒ FAIL 并提示「**停下上报编排器**」。
7. **越界处置（R-V45-101）**：若净减 > 19,225 B ⇒ **停下上报**（附实测值 + 归因），由编排器裁决；**禁止**静默改三值、禁止为凑档位而**故意增重**（本末倒置，须显式上报）。
8. **红线逐字节复核**：`dist/content.js = 177,076 B` / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`；`dist/pick-layer.js = 33,900 B` / sha `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59`；`design/**` 与 shim 双 sha；`manifest.json` / 判定链内容哈希；`docs/v3-supersession-ledger.json` 零 diff。
9. **反证**：① `SIDEPANEL_CEILING` 上用旧基线算 ⇒ 「严格等于 `floor(baseline × 1.05)`」红；② 登记增量与 metafile Σ 不等 ⇒ 归因红；③ 把 `direction` 写成 `raised` 而 Δ < 0 ⇒ 算术机核红；④ 把 `SIDEPANEL_CEILING_CAP` 接回判定 ⇒ `record-only` 断言红。

#### 后果

- 净减也留下可复算的登记（历史不失同步）；V3-VOL-3 三值保持同源，档位与绝对上限不变（FR-V45-092）。
- 「不设自缚装置」的纪律继续成立（`record-only` 不被读取）。
- 代价：收口轮需 metafile 逐模块归因（负 Δ）与 I-10 负值算术支持；若净减过界须停机上报（低概率、高影响的硬边界）。

#### 回滚

`test/size-baseline.ts` 常量/历史 + `docs/v4-supersession-ledger.json#v3Vol3Closeout` + 三门禁断言同区间 `git revert`；旧基线值从未丢失（历史数组保留）。

---

### ADR-V45-012: W4 分层实施序（单叶五波 + 共享收口面原子性）

**状态**: ACCEPTED
**影响**: FR-V45-003 / 004 · AC-V45-021 / 022 · NG-V45-008 · 本叶 spec §8.4 · R-V45-109

#### 背景

本叶是唯一叶，但变更面横跨「实现 + 门禁 + 台账 + 体积」四类资产，且存在**顺序依赖**：① 门禁改写依赖终态 DOM；② 体积重登记与 journey 取代依赖**同一终态**；③ 反证注入点随形态迁移而变（旧注入点会恒绿，R-V45-106）。若把收口面拆成两次提交，会产生「中间态取代」（多余台账条目 + 二次新 pin），并把同一保护区改两遍（违背取代台账「同编号等价改写」守恒口径）。故需在单叶内定义 wave 与**原子边界**。

#### 选项

| 选项 | 内容 | 结论 |
|---|---|---|
| A | **五波（W1 门禁脚手架/断言预迁移 → W2 strips 单写 → W3 宿主退役+元素迁移 → W4 门禁重算+journey 取代+密度重算 → W5 收尾）**；W4+W5 对同一终态，中间态不提交 | ✅ **选中** |
| B | 按「文件」分波（每个文件一轮全绿） | ❌ 门禁跨文件耦合（同一条 journey/density 依赖多个文件终态）⇒ 每轮都会产生中间态取代 |
| C | 单波一把梭（不分层） | ❌ 反证注入点无法分层重写；失败回滚粒度太大（无法定位是退役还是台账问题） |

#### 裁决

1. **W1 门禁脚手架 / 断言预迁移**（~8 任务）：新建 3 个 node 门禁（`host-registry.test.ts` / `local-act-wiring.test.ts` / `settings-help.test.ts`）的骨架；把「将失效的断言」先**改写为新形态判据**（此时实现未动 ⇒ 允许红，但**必须先声明 `expectFailPattern`**）；登记 `EXPECTED_AUDITED_FILES` 追加；确认 `CHROMIUM_GATES` 保持 9。
2. **W2 strips 单写**（~10 任务）：emitter 唯一化 → 5 条提示带的 DOM 退役 → `STRIP_CHANNEL_KINDS` 重构 → 归并矩阵判据重写 → 首屏三事实「载体数 == 1」断言 + 4 组反证；`#send-reason` 保留验证。
3. **W3 宿主退役 + 元素迁移**（~14 任务）：`stream-render.ts#messageAnchor` 迁移 → 4 宿主 DOM 移除 → decision 壳元素卡内化（ref / askuser / auth 卡）→ `#composer` 出流 → L1 组去向（历史退役 / 手势→设置 / 局部树→树视图 / 回执→审计视图）→ `disclosure.ts` 三份声明重写 → `host-registry.ts` 零宿主判据重写。
4. **W4 门禁重算 + journey 取代 + 密度重算**（~12 任务，**共享收口面，一次做完**）：11 处门禁等价重锚（l0/l1/l2/page-input/hardening/insight/recommendation/stream/ask-auth/system-merge/env-guard/density-thresholds/l0-disclosure/l1-ref-validity/sidepanel-view）→ journey 第二次八步取代（`supersessionChain` 新 pin）→ binding 段外改写 + 逐行登记 → density 31 格实测重算 + `v45Ledger`（`docs/v4-density-baseline.json`）→ `test/supersession-ledger.test.ts` 链式判据升级。
5. **W5 收尾**（~10 任务）：体积五要素**双向**重登记（`test/size-baseline.ts` + `docs/v4-supersession-ledger.json#v3Vol3Closeout` 三值同源前移）→ `test/size-ruling-vol3.test.ts` 档位闸门 → 红线逐字节复核 → 24 门禁**严格串行**全量复跑（日志全量落盘）→ 人工面清单逐项标注 → 收口文档（FIX-5 消解重述 / N-05 关闭登记 / `options` 解冻留痕 / `direction=lowered` 归因）。
6. **原子边界**：W4+W5 的产物（终态 DOM + 新 pin + 密度台账 + 体积登记）**必须落在同一 commit 区间**；中间态（改了实现但未重算/未登记）**不得单独提交**（R-V45-109）。失败 ⇒ 回滚整个区间并重跑。
7. **门禁纪律**（父 §15）：`test` / `test:ui` / `test:binding` **绝不并发**（一次一个 Chromium，`finally` 自清 profile）；日志 `tee` 全量（禁截断）；`KL-N-10` 首轮异常隔离复跑 ≥2、仍红如实登记不阻塞收口；人工面逐项标注**不得冒充 PASS**。
8. **收口硬条件**：① 各门禁计数 ≥ 基线（FR-V45-004 清单）；② 无「不再 FAIL 的判据」遗留（R-V45-106）；③ 台账 hunk↔条目全命中 + `newTitle` 可定位；④ 保护段判据全绿（journey 新 pin / binding 保段）；⑤ 密度台账逐格留痕；⑥ 体积五要素与三值同源。

#### 后果

- 失败可定位到波次；收口面保持原子性（无中间态取代）；反证注入点按波次重写，消除恒绿风险。
- 代价：波次间实现处于「部分完成」状态，**不跑收口判据**（只跑该波次可判定的子集）；最终一次性全绿。

#### 回滚

按波次回滚（每波一个 commit 区间）；W4+W5 视为**单一原子区间**，不可拆分回滚；任何回滚都必须重跑受影响门禁。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V4.5-1 实施技术方案）：**ADR-V45-001~012** 全部正文（每条含 背景 / 选项 / 裁决 / 后果 / 回滚 + FR/AC 映射）；§2 现状基线 A1~A30（本轮只读实测 `file:line`）+ 目标架构 + 四条结构性不变量 + 数据流 + 依赖图 + T1~T10 不动面；§3 五组方案对比（退役路径 / 卡内承载 / binding 保段 / 夹具锚 / 台账扩展）；§5 文件影响 **63 项**（src 21 / test 34 / docs 2 / SDDU 6）；§6 风险（继承 R-REG-001~015 + R-REG-901~906 + plan 新增 R-V45-101~109，逐条带缓解）+ Top5；§7 ADR 索引与正文；§8 修订记录。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`docs/**`·`design/**`·ROADMAP、不动 `main`、不 commit/push、**未跑任何门禁 / 构建 / Chromium**、**未调用任何受管 Provider**（routing.v1 = `local_or_compute → none`）。 | 2026-09-21 | SDDU Plan Agent |

