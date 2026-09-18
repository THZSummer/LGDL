# 技术计划：specs-tree-v4-1-zone-shell-density（V4-1 三区骨架与密度重定标）

> **文档定位**: SDDU 技术方案（叶子切片） — 本叶技术方案与 ADR；**权威跨叶契约见父 `../plan.md`**
> **前置依赖**: 父 `../spec.md` v1.0 + 父 `../plan.md` v1.0（ADR-V4-001~016 跨叶裁决）+ `../discovery.md` v1.0 + 本叶 `spec.md` v1.0 + 设计契约 `design/ui-redesign/option-f-shim.mjs`（60 断言）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（V4-1 叶子技术方案：三区骨架 + 工具栏准入 + 状态栏与风险 chips + 密度新口径与防滥用 + **门禁重定标与 journey 保护段新 pin**；ADR-V4-017~023；含 §1 偏差登记：门禁集合增补 l0/l1/l2）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**

本叶 = v4 的**首个开工叶子**与全部兄弟叶的**共同承载基线**：立「工具栏 / 聊天流 / 状态栏」三区骨架、工具栏准入（≤5 可点）、状态栏常驻与风险 chips（永不折叠的新机器判据）、密度**新口径 + 三条防滥用 + 反证**，并在**同叶内**完成 l0/l1/l2/density/journey 五个门禁的重定标与取代台账登记。本叶只做**骨架与口径**：流内容模型归 v4-2、ask/授权卡业务归 v4-3、引用/系统/推荐卡归 v4-4。

---

## 1. 前置检查

| 检查项 | 状态 | 证据 / 说明 |
|--------|:--:|------|
| 父 `spec.md` / 父 `plan.md` / `discovery.md` / 本叶 `spec.md` 存在 | ✅ | 87,082 B / 1,039 行 / 94,715 B / 182 行 |
| 设计契约可读（shim 60 断言） | ✅ | `option-f-shim.mjs`（A1~A6 · B1~B4 · C1~C11 · D1~D7 · E1~E5 · F1~F7 · G1~G7 · H1~H12 · I1） |
| **外部 API 文档缓存** | ⚠️ **N/A（0 个外部服务 API）** | 同父 plan §1；**未调用任何受管 Provider**（`local_or_compute → none`） |
| 红线基线核对 | ✅ | `feature/web-cli-plugin` @ `187c205`；`content.js` 177,076 / `pick-layer.js` 33,900 / `sidepanel.js` 375,102（只读 `stat`） |
| 本叶改动面自检 | ✅ | **仅侧栏侧**：`src/ui/sidepanel/**` + `index.html` + `test/**` + `docs/**` + `package.json#scripts`；SW / content / 判定链 / `KIND_SET` **零触碰** |

### ⚠️ 偏差登记（本叶）：门禁集合必须增补 `test:l0` / `test:l1` / `test:l2`（**收紧而非放松**）

本叶 `spec.md` §8「门禁集合（串行）」**未列** `test:l0` / `test:l1` / `test:l2`。但本叶落定三区骨架必然取代 `#l0-status-band` / `#l0-decision`（含 `#ask`/`#confirm` 宿主）/ `#l0-pick` / `#l0-more` / `#l0-ref-toggle` / `#risk-rail` / `#l0-statusbar` / `#l2-entries` / `#log` / `#composer` —— 三者（叶下界 73 / 64 / 68）的断言绝大多数落在这些被取代面上（discovery §7.3）。**若照抄 spec 的集合，本叶收尾时这三个门禁不是「绿灯」而是「未跑」**，直接违反父 spec §10.3 / EC-CHAT-013「每叶收尾全门禁绿、禁留红灯」。

**本叶裁决（父 plan ADR-V4-011 第 2 条授权）**：本叶收尾门禁清单 = 叶子 spec §8 原清单 **∪ `test:l0` ∪ `test:l1` ∪ `test:l2`**，并在**同叶内**完成三者与 `test:density` / `journey` 的等价改写 + 台账登记。这是**多跑 3 个门禁、多做 3 份等价改写**，属收紧。

---

## 2. 架构分析

### 2.1 本叶切片（做 / 不做）

**做**：三区骨架（`header#region-toolbar` → `main#region-stream > ol#stream[role=log]` → `footer#region-statusbar`）· 工具栏准入 ≤5（站点摘要只读 + 4 视图入口带计数徽标 + 主题三态）· 状态栏常驻（连接状态一行 + 风险 chips）· 风险永不折叠**新机器判据** · 法一静态核验 · 法四骨架层核验 · 四视图入口迁移与 `view-host` 同构替换 · **密度新口径 + 三条防滥用 + 反证** · **v4 密度基线新文件 + 31 登记格** · **l0/l1/l2/density/journey 门禁重定标 + 取代台账新建** · journey 保护段新 pin · **V3-VOL-3 中间重登记** · 管理操作入设置视图（法则六）。

**不做**：流内卡渲染与事件模型（v4-2）· ask/授权业务（v4-3）· 引用/系统/推荐卡内容（v4-4；本叶只提供 `#risk-chips` 容器与占位宿主）· 体积绝对上限闭合（父收口锚，v4-4 执行）。

### 2.2 DOM 迁移落地（**同构迁入 + 占位宿主**；父 plan ADR-V4-005 的叶内执行）

| 现状 | 本叶落地 | 关键约束 |
|---|---|---|
| `#panel-top`(header) / `#l0-status-band` | → `#region-toolbar`(header) + `.site-summary`(只读 `role=status`) | `#status`/`#llm-status`/`#session-label` **id 零重命名**（文本迁入 `.site-summary`，不再是 button） |
| `#topbar`(L1) 全量管理控件 | → `#settings-view` 内「站点与授权」分区 | **法则六**；15 个既有 id 零重命名，只改归属容器 |
| `#panel-main` / `#log`(div) | → `#region-stream`(main) / `ol#stream[role=log]` | **`#log` 是本叶唯一 id 重命名**（→ `#stream`）；`#log` 的 `.empty` 空态语义迁 `#stream` |
| `#l0-decision` + `#ask*` + `#confirm*` | → `#stream` 内 `li` **占位宿主** `data-transitional-host="v4-3"` | 内容 / id / ARIA 对全保留；`#l0-decision` 的「唯一决策卡」契约 → 台账登记 |
| `#l0-more` / `#l1-more` / `#l1-consequences` / `#l1-ref`（证据层）/ `#l0-ref-toggle` / `#l0-ref-badge` | → `#stream` 内 `li` 占位宿主 `data-transitional-host="v4-4"` | 同上 |
| `#l1-history` / `#l1-receipt` / `#l1-local-tree` / `#l1-gestures` | → 占位宿主（`v4-3`/`v4-4`）与 `#settings-view` 分区 | `#l1-receipt-audit` 的「审计出口」保留 |
| `#l0-statusbar` + `#l2-entries` | → `#region-toolbar` 的 4 入口（`#l2-entry-*` id 零重命名） | `#l2-entry-summary` 文本迁 `.site-summary`；per-target `aria-expanded` 配对保留 |
| `#risk-rail`(section, body 直挂) | → `#region-statusbar` 内**嵌套** `#risk-chips`（**设计契约 id**，外层）> `#risk-rail`（**v3 id 保留**，内层风险行容器） | 两层容器同时满足 shim H5/H8（逐字断言 `#risk-chips`）与 v3 探针 / `isRiskClassSource`（`#risk-rail` 选择器）⇒ **门禁判定逻辑零改动**；行 → chip（文字 + 徽标 + 图标三通道保留） |
| `#panel-bottom` / 6 strips | → **本叶只搬空**（`#env-guard`/`#site-hint`/`#onboarding`/`#discovery-notice`/`#notice` 容器挂到 `#region-stream` 内的占位宿主 `data-transitional-host="v4-4"`；`#send-reason` 保留在原逻辑位置但归属 `#region-statusbar`） | 语义归并由 v4-4 落；本叶保证**断言仍可解析**（选择器重锚） |
| `#composer` / `#input` / `#send` | → `#region-stream` 内 `li` 占位宿主 `data-transitional-host="v4-3"`（保持 `hidden`） | **法四**：`#composer` 不再有常驻语义；`journey#15c` 随之取代（ADR-V4-008） |
| `#view-host` + `[data-l2-view]` | `#region-stream` 内（与 `#stream` 互斥） | 复用 `l2/view-host.ts`，只把 `#log` 绑定改为 `#stream` |

### 2.3 结构保证（本叶负责 S1 / S2 / S5 / S6 / S7）

| # | 保证 | 本叶实现 |
|---|---|---|
| **S1** | 归属互斥（静态） | `#stream` 子树内**零** `[data-chrome-control]`；`#region-toolbar`/`#region-statusbar` **不得**是 `#stream` 后代；`assertChromeNotInStream()` |
| **S2** | 豁免子树单源冻结 | `density-scope.ts` 的唯一常量 + 门禁内字面量再断言 |
| **S5** | 防滥用三道 | `MAX_CLICKABLES_PER_CARD=6` / `MAX_FIRST_SCREEN_CARDS=2` / `MAX_WELCOME_CARDS=1` + `MAX_WELCOME_LINES=8` |
| **S6** | 风险永不折叠（语义新判据） | 状态栏本体无 `hidden` + chips 容器无 `hidden` + 祖先闭包无折叠容器 + 视图打开后仍可见 + chip 详情不占默认密度 + chip → 滚动定位流内卡 |
| **S7** | 视图替换不改风险位 | `#region-statusbar` 是 `body` 直挂（非 `#region-stream` 后代） |

### 2.4 数据流（本叶新增/改动的接线）

```text
state / probe / capability / session 消息（既有）
   └→ view-model(l0ViewModel → toolbarViewModel / statusbarViewModel / riskChips)
        └→ toolbar.render(counts, siteSummary, theme)         # 4 入口 + 摘要 + 主题
        └→ statusbar.render(connectionLine, riskChips)        # 一行 + chips + 详情
        └→ viewHost(open/close)  ← 4 入口（#l2-entry-*）
        └→ disclosure（白名单重定标后的卡内/视图内展开）
   └→ stream（本叶只保证 #stream 存在且为 ol[role=log]；内容由占位宿主承载）
```

**主题流（新）**：`#theme-toggle` 点击 → 三态循环（跟随系统 → 浅色 → 深色 → 跟随系统）→ `documentElement[data-theme]` 写入/移除 + `chrome.storage.local`（key `web-cli` 下 `theme`）持久化；读失败 ⇒ 降级「跟随系统」且**不阻断界面**（EC-CHAT-014）。

### 2.5 依赖与波次衔接

```text
前置：无（首个开工叶）
本叶产出（兄弟叶的契约）：
  · #region-toolbar / #region-stream / #stream / #region-statusbar / #risk-chips 的 DOM 契约
  · DENSITY_EXCLUDED_SUBTREES=['#stream'] 单源 + 全套密度常量
  · CARD_TYPES 占位宿主（data-transitional-host 标记 + 退役叶）
  · view-host 同构替换（#stream ↔ #view-host）
  · 主题三态契约（data-theme + storage key）
  · l0/l1/l2/density/journey 重写后的门禁与计数下界
  · docs/v4-supersession-ledger.json（新建）/ docs/v4-density-baseline.json（新建）
下游：v4-2（事件模型与卡渲染，把占位宿主换为卡）
```

---

## 3. 方案对比（本叶开放点）

### 3.1 P-V41-01 三区改造的最小改动路径（`#log` / `#composer` 契约不外溢）

| 维度 | **方案 A：`body` 保持三区直挂 + `#log`(div)→`ol#stream` 唯一重命名 + 其余 id 零重命名** | 方案 B：新增 `#panel` 包裹层（与设计稿同名同义） | 方案 C：保留 `#log` id 并把 `ol` 当作 `#log` 的子元素 |
|------|:--|:--|:--|
| 描述 | `body{display:flex;flex-direction:column}`，三区为 `body` 直挂；`#log` → `#stream`（`ol[role=log]`）；`#panel-top`/`#panel-main`/`#panel-bottom` id 退役但**容器元素复用**；其余 108 个 id 零重命名 | 新增 `<div id="panel">` 包住三区 + `#settings-view` | `<div id="log"><ol id="stream" role="log">…</ol></div>` |
| 优点 | ① 与 v3 `ADR-V3-001` 的「不新增包裹层」结论一致（`body` flex 归属零扰动）② 取代面收敛为「1 个 id 重命名 + 归属迁移」③ `#region-statusbar` 天然 body 直挂 ⇒ **S7 由结构保证** | 与设计稿口径字面同源 | 保住全部 134 处 `getElementById('log')` |
| 缺点 | `#log` 的 134 处引用必须迁移（本叶最大工作量，走台账） | 改变 `body` flex 归属 ⇒ 连带扰动三区文档序 / `#stream` 高度 / `view-host` 互斥，取代面反而更大 | **双源真相**：`#log` 与 `#stream` 两个「流根」会让「唯一滚动容器 / 高度占比 / 祖先闭包探针」出现歧义（与 R-CHAT-003 正面冲突） |
| 风险 | 中（集中在 journey 保护段，已由 ADR-V4-008 显式处置） | 中高 | **高**（口径歧义） |
| 工作量 | 中 | 中大 | 中但方向错 |

### 3.2 P-V41-02 风险位新形态（body 直挂 `#risk-rail` → 状态栏内嵌套 `#risk-chips` > `#risk-rail`）的「永不折叠」机器判据

| 维度 | **方案 A：嵌套双层容器（`#risk-chips` 设计契约 id 外层 + `#risk-rail` v3 id 内层）+ 形态改 chip + 四条机器判据** | 方案 B：只用新 id `#risk-chips`、废弃 `#risk-rail` | 方案 C：保留顶部 rail，状态栏只放摘要 |
|------|:--|:--|:--|
| 描述 | `#region-statusbar` 内：外层 `#risk-chips`（设计契约 id，其 `hidden` 表达零风险收缩）+ 内层 `#risk-rail`（v3 id，`aria-live`，风险行容器）；chip = 文字 + 徽标 + 图标；判据 = ① 状态栏本体无 `hidden` ② `#risk-chips` 无 `hidden`（有风险时）③ `#risk-rail` 祖先闭包无折叠容器 / 无 `[aria-expanded]` ④ 打开任意视图后 chips 仍可见 | 只用 `#risk-chips`，`#risk-rail` 退役 | 风险仍在顶部，状态栏只显示计数 |
| 优点 | ① **同时**满足设计契约（`#risk-chips`）与 v3 探针/归属判据（`#risk-rail`）⇒ `isRiskClassSource` / 祖先闭包探针 / 密度风险类归属 **零逻辑改动** ② 与 shim H5/H8（「状态栏本体无 hidden / chip 容器可见」）逐条对应 ③ 取代台账条目最少（HTML 归属变更 + CSS） | id 语义更干净 | 「永不折叠」最省事 |
| 缺点 | 多一层 DOM 容器（约 1 个 `div`，不影响 C4 分区计数，因为嵌在状态栏内） | 探针 / `isRiskClassSource` / `riskVisibilityProbeSource` 全部要改选择器（取代面扩大） | **违反 D-P-V4-02 与 shim H4/H5**（状态栏必须显示 chips），且与作者「状态栏」主张冲突 |
| 风险 | 低 | 中 | **不可接受** |
| 工作量 | 低 | 中 | 零 |

### 3.3 P-V41-03 风险 chip 的密度归属与详情展开

| 维度 | **方案 A：chip 计入状态栏预算；详情在 `hidden` 容器内（不占默认密度）** | 方案 B：chip 也不计入（视为「状态」而非控件） | 方案 C：详情常驻展开 |
|------|:--|:--|:--|
| 描述 | `#risk-chips` 内的 chip 是 `button` ⇒ 计入 C1；`#risk-detail` 默认 `hidden` ⇒ 不计入；风险档上限 `17/35` 容纳 chip 增量 | chip 用 `role=status` 非 button | `#risk-detail` 常驻 |
| 优点 | ① 与 shim F3（无风险时 0 chip）/ H4（2 chip 且合计 ≤7）一致 ② 详情不占默认密度（H6）③ 桶子归属判据（`isRiskClass`）自然成立 | 默认密度更低 | 无需展开交互 |
| 缺点 | 风险态可点接近上限（实测需登记） | **与 shim fs/H4 的 chip 可点性冲突**；且「chip 点击 → 展开 + 滚动定位」需要可点 | **直接导致默认档爆表**（违反法五） |
| 风险 | 低 | 中高 | **不可接受** |
| 工作量 | 低 | 低 | 零 |

### 3.4 P-V41-04 密度新口径的实现载体

| 维度 | **方案 A：扩展 `test/ui/density-metrics.mjs`（口径单源）+ 重写 `test/ui/density.mjs` + 追加 `test/density-thresholds.test.ts`** | 方案 B：新建 `test/ui/density-v4-metrics.mjs` 与 v3 并存 | 方案 C：把口径写进 `density.mjs`（单一文件） |
|------|:--|:--|:--|
| 描述 | 口径单源仍是 `density-metrics.mjs`（**扩展**：排除子树 + 新常量 + 新档 + 逐卡/首屏判定）；Chromium 门禁 `density.mjs` 重定标（31 格 + 阶段 F 指向 v4 基线 + in-gate RP-V4）；无 Chromium 常量/静态门禁追加 v4 断言并**保留** v3 基线 schema 保真 | 新文件承载 v4 口径，v3 文件冻结 | 取消「口径单源 + 门禁」分层 |
| 优点 | ① 满足父 spec §9.4「复用密度门禁的实现骨架与反证判定器」② 口径**仍单源**（一处声明、门禁读取）③ `NON_GATE_FILES` 无需改动（`density-metrics.mjs` 已在白名单） | v3 口径完全冻结可审计 | 文件最少 |
| 缺点 | `density-metrics.mjs` 与其 `.d.mts` 需同步更新（v3 `NON_GATE_FILES` 已豁免其被当门禁扫描） | **口径出现两个单源** ⇒ 双实现漂移风险（v3 `ADR-V3-003` 明确否定的形态） | 违反 ADR-V3-003 的分层取舍；常量门禁失去快速反馈价值 |
| 风险 | 低 | 中高（漂移） | 中 |
| 工作量 | 中 | 中 | 低 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V41-01 三区改造 | **方案 A** | 唯一与 v3「不新增包裹层」结论一致、且把取代面收敛为「1 个 id 重命名 + 归属迁移」的形态；S7 由「状态栏 body 直挂」**结构保证** |
| P-V41-02 风险位形态 | **方案 A** | id 保留使探针 / 归属判据 / 既有断言只需重锚容器；与 shim H5/H8 逐条对应 |
| P-V41-03 chip 密度归属 | **方案 A** | 与 shim F3/H4/H6 三条断言同时一致；详情不占默认密度 |
| P-V41-04 口径载体 | **方案 A** | 唯一保持「口径单源 + 门禁分层」的形态（FR-CHAT-070 / NFR-CHAT-010） |

**本叶编排器决策承接（不重新讨论）**：D-P-V4-01（F 稿为基准）· D-P-V4-02（三区模型）· D-P-V4-04（不动面）· D-P-V4-05（密度新口径）· D-P-V4-06（叶子顺序）· D-P-V4-07（取代与体积纪律）+ 父 §12 裁决 3（firstRun 独立格）· 裁决 4（空态独立格 + 欢迎卡 ≤1 且 ≤8 行）· 裁决 7（≥65% spike 前置验证）。

---

## 5. 文件影响分析（本叶）

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/toolbar.ts` | 工具栏渲染（`.site-summary` 只读 + 4 入口带计数徽标 + `#theme-toggle`；准入 ≤5 断言入口） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/statusbar.ts` | 状态栏渲染（连接状态一行 + `#risk-chips` + `#risk-detail` + chip→滚动定位流内卡） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/theme.ts` | 主题三态控制器（`data-theme` + `web-cli/theme` storage + 失败降级） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/density-scope.ts` | **豁免子树单源** `DENSITY_EXCLUDED_SUBTREES=['#stream']` + 三区外壳常量 + `MAX_CLICKABLES_PER_CARD` / `MAX_FIRST_SCREEN_CARDS` / `MAX_WELCOME_CARDS` / `MAX_WELCOME_LINES` + `assertChromeNotInStream()` |
| NEW | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | **v4 取代台账**（`takesOverFrom` + `protectedSupersession` + `redlineRemap` + `entries` + `modifiedRanges` + `protectedRanges` + `counts` + `gateFloors` + `v4GateFloors` + `leafBases`） |
| NEW | `packages/web-cli-plugin/docs/v4-density-baseline.json` + `docs/v4-density-baseline.md` | **新密度基线**（新口径 + 31 登记格 + `designCaliber` 分列 + `streamRatioSpike` + 与 v3 的差异与理由） |
| NEW | `packages/web-cli-plugin/test/design-contract.test.ts` | **AC-CHAT-025 门禁化**（实跑 shim 60/60 + sha256 冻结 + 计数 60 + 60 行映射表） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 三区骨架重构 + 全部归属迁移 + 占位宿主（`data-transitional-host`） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 三区挂载与接线（toolbar/statusbar/theme/view-host）；`#log`→`#stream` 选择器迁移；`#l0-pick` 移除后的接线（`requestPick()` 由 v4-4 提供，本叶保留占位宿主内的既有调用） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | `toolbarViewModel()` / `statusbarViewModel()` / `riskChips()` 纯函数 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l0/shell.ts` | 重写为三区外壳（`#l0-decision` 决策卡挂载迁入流内占位宿主） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l0/risk-rail.ts` | 行模板 → chip 模板（三通道保留）；写入目标 `#risk-rail`（内层容器，选择器零改动） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l0/status-bar.ts` | 写入目标 → 工具栏 4 入口（`#l2-entry-*`）+ `.site-summary` 摘要 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` | `COLLAPSIBLE_TARGETS` 重定标；`NEVER_FOLDABLE` 扩展；保留 `assertFoldable` 抛错 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l2/view-host.ts` | `#log`→`#stream` 绑定；入口归工具栏；返回回焦 `#l2-entry-*` |
| MODIFY | `packages/web-cli-plugin/test/ui/l0.mjs` | **整文件重写**（三区骨架 + 工具栏 ≤5 + 状态栏 + 风险 chips 永不折叠 + 豁免清单 + 可发现性），`≥ 73` |
| MODIFY | `packages/web-cli-plugin/test/ui/l1.mjs` | **入口机制重写**（`L1_TRIGGERS` → 工具栏/设置视图/占位宿主），`≥ 64` |
| MODIFY | `packages/web-cli-plugin/test/ui/l2.mjs` | 入口位置迁移 + `#stream ↔ #view-host` 互斥 + 计数同源，`≥ 68` |
| MODIFY | `packages/web-cli-plugin/test/ui/density.mjs` | 换口径 + 31 格 + 阶段 F → v4 基线 + in-gate RP-V4-01~07，`≥ 60` |
| MODIFY | `packages/web-cli-plugin/test/ui/density-metrics.mjs` (+ `.d.mts`) | 排除子树 + 新常量/新档 + `evaluateCardBudget()` / `evaluateFirstScreen()` |
| MODIFY | `packages/web-cli-plugin/test/ui/journey.mjs` | 保护段 `#15a~#15q` 同编号改写 + 新 pin；其余选择器重锚；`≥ 167` |
| MODIFY | `packages/web-cli-plugin/test/density-thresholds.test.ts` | 工具栏 ≤5 静态断言 + S1/S2 静态断言 + v3 基线 schema 保真（保留）+ v4 常量 |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` | 4 项布局契约等价或更强改写（`≥ 38`） |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | `EXPECTED_AUDITED_FILES` 追加（**不动 `CHROMIUM_GATES.length === 9`**）+ in-gate 例外追加 RP-V4 说明 |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` | 双台账判定（v3 冻结 + v4 按行） |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | 本叶**五要素中间重登记** |
| MODIFY | `packages/web-cli-plugin/package.json` | scripts 追加 `test:design-contract`（依赖零新增） |
| NEW | `.sddu/.../specs-tree-v4-1-zone-shell-density/plan.md` | 本文件 |
| MODIFY | `.sddu/.../specs-tree-v4-1-zone-shell-density/state.json` | `phase: specified → planned` |

---

## 6. 风险评估（本叶）

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R41-01 `#log`→`#stream` 的 134 处引用迁移失控** | **高** | **极高** | ① 唯一 id 重命名，冲击集中在 journey（本叶重写）与 `sidepanel-view.test.ts`（2 条静态契约）；② 其余门禁的 `getElementById('log')` **同编号重锚**（不改语义）；③ 逐条台账登记；④ journey 保护段走 ADR-V4-008 八步流程 |
| **R41-02 l0/l1 门禁整层重写导致计数下界跌破** | **高** | **极高** | ① **门禁集合增补 l0/l1/l2**（本叶 §1 偏差登记）⇒ 红灯在本叶内消掉；② 保留文件名 ⇒ `v3GateFloors` 同名叠加；③ `≥ 73 / ≥ 64 / ≥ 68` 只增；④ 反证 RP-V4-08（删 1 条 → FAIL） |
| **R41-03 journey ≥65% 占比不可达** | 中 | 高 | **ADR-V4-016 / ADR-V4-023**：本叶**第一任务** = 12 格 spike；不可达 ⇒ **停下上报编排器**（禁静默弱化） |
| **R41-04 密度豁免被用来把工具栏控件藏进 `#stream`** | 中 | 极高 | S1/S2 + RP-V4-06 + 静态 `assertChromeNotInStream()` + 豁免单源字面量再断言 |
| **R41-05 风险 chips 被实现成「藏在展开里」** | 中 | 极高 | S6/S7 + 四条判据 + RP-V4-07 + `disclosure` 白名单排除 `region-statusbar`/`risk-chips`/`risk-rail` |
| **R41-06 占位宿主永久化（过渡态遗留）** | 中 | 中 | 每个宿主带 `data-transitional-host`；v4 台账登记退役叶；**收口门禁断言「v4 收口时宿主数 = 0」**（R4-18） |
| **R41-07 主题三态引入新的密度/可点预算超支** | 中 | 中 | `#theme-toggle` **计入**工具栏 ≤5（4 入口 + 1 主题 = 5）；三宽度静态 + 运行时双测 |
| **R41-08 门禁轮次/内存（3 个新 Chromium 门禁在后续叶，本叶为 0 新增 Chromium）** | 低 | 中 | 本叶**不新增 Chromium 门禁**；新增的 node 门禁（`design-contract.test.ts`）零 Chromium；`test:v4` 串行 |

---

## 7. 生成的 ADR（本叶：ADR-V4-017~023）

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V4-017 | 三区骨架的 `index.html` 改造与最小改动路径（`#log`→`#stream` 唯一重命名 + 归属迁移总表） | ACCEPTED |
| ADR-V4-018 | 工具栏准入 ≤5 的实现与**置换登记**机制（站点摘要只读 + 4 视图入口带计数徽标 + 主题三态） | ACCEPTED |
| ADR-V4-019 | 状态栏与风险 chips 形态 + 「永不折叠」四条机器判据 + chip 详情密度归属 | ACCEPTED |
| ADR-V4-020 | 密度新口径实现（单源排除子树 + 逐卡/首屏判定）+ 三条防滥用反证 | ACCEPTED |
| ADR-V4-021 | v4 密度基线：31 登记格重算 + 首轮真实产物登记 + 设计稿/真产物分列 + 旧 22 格冻结 | ACCEPTED |
| ADR-V4-022 | 四视图入口迁移：`l2/view-host.ts` 同构替换 + `l2/counts.ts` 计数单源复用 | ACCEPTED |
| ADR-V4-023 | 本叶门禁清单（**增补 l0/l1/l2**）+ journey 保护段新 pin 执行规程 + ≥65% S 级 spike 规程 | ACCEPTED（含偏差登记） |

### ADR-V4-017: 三区骨架的 `index.html` 改造与最小改动路径

## 状态
ACCEPTED（承父 ADR-V4-005 / D-P-V4-02；替代方案见 §3.1）

## 背景
真实产物 `index.html`（1,414 行 / 109 个 `id`）的 `<body>` 直接子元素是 `#risk-rail` / `#panel-top` / `#panel-main` / `#l0-statusbar` / `#l2-entries` / `#panel-bottom` / `#settings-view` / `<script>`；`body{display:flex}`（列向）+ `#log` 唯一滚动 + `#composer` 为 `#panel-bottom` 末元素（默认 `hidden`）。v3 `ADR-V3-001` 已明确**否决**新增 `#panel` 包裹层（会扰动 4 条布局契约）。F 稿与 shim A1~A6 要求三区规范 id。设计稿的 `#panel` 在真实产物**无对应物**（与 v3 同形的口径适配问题）。

## 决策
1. **不新增 `#panel` 包裹层**：三区为 `body` 直挂；`body{display:flex;flex-direction:column}` 保留；密度表达式的根仍是 `document.body`（父 ADR-V4-006）。
2. **`#log` → `#stream` 是本叶唯一 id 重命名**（`div#log` → `ol#stream[role=log]`）；其余 108 个 id **零重命名**（含 `#risk-rail` **保留**为状态栏内的内层风险行容器；新增 `#risk-chips` 为设计契约 id 的外层容器）。
3. **容器元素复用**：`#panel-top` 的 `<header>` 元素**复用**为 `#region-toolbar`；`#panel-main` 的 `<div>` **复用**为 `<main id="region-stream">`；`#panel-bottom` 的 `<div>` 退役（其 strips 挂到流内占位宿主）。
4. **`#composer` 常驻语义退役**（法四）：`#composer` / `#input` / `#send` id 保留但挂到流内占位宿主并保持 `hidden`；`journey#15c` 的贴底断言按 ADR-V4-008 显式取代。
5. **`#region-statusbar` 必须是 `body` 直挂**（**不**在 `#region-stream` 内）——这是 S7（视图替换不改风险位）的**结构保证**，而不是约定。
6. **`.site-summary` 是只读**：`<div class="site-summary" role="status">`（非 `button`/`a`/`input`）⇒ 不计入可点预算（shim F5）；`#status` / `#llm-status` / `#session-label` 的 id 保留（既有断言读 `textContent`，不读可见性）。
7. **占位宿主**：被取代但尚未换实现的容器一律挂到 `#stream` 内 `<li data-transitional-host="<退役叶>">`，**内容 / id / ARIA 对全保留**（父 ADR-V4-005 第 6 条的叶内执行）。

## 后果
- 取代面收敛为「1 个 id 重命名 + 归属迁移」；l0/l1/l2 的断言改动是**选择器重锚 + 前置展开**，语义不变（强度不降）。
- `#log` 的 134 处引用必须迁移（集中在 journey / insight / l0 / l1 / sidepanel-view），逐条走 v4 台账。
- 代价：过渡期存在 `data-transitional-host` 宿主；v4 收口门禁强制清零。

### ADR-V4-018: 工具栏准入 ≤5 的实现与置换登记机制

## 状态
ACCEPTED（承 D-P-V4-02 / O-CHAT-003 / FR-CHAT-011 / FR-CHAT-012 / FR-CHAT-016 / R-CHAT-011）

## 背景
现状 `#panel-top` 的 L1 面板含 8+ 个控件（设置 / 授权 / 更多（撤销·重新绑定·审计·会话盒·分组）/ LLM 测试 / 同意与自动授权开关），远超 5；且「谁有资格常驻」的规则与置换流程**不存在**；主题切换是**新控件**（现状只跟随系统）。F 稿工具栏 = 站点摘要（只读）+ 4 视图入口 + 1 主题 = 5（满额）。

## 决策
1. **构成（可点 = 5）**：`.site-summary`（只读，**不计**） + `#l2-entry-tree` / `#l2-entry-commands` / `#l2-entry-audit` / `#l2-entry-settings`（4，带 `.badge` 计数徽标） + `#theme-toggle`（1） = **5**。
2. **准入规则（机器可核验）**：常驻入口必须**同时**满足 ①「**与单次会话无关**」（不得依赖 `sessionId` / 未答卡 / 当前引用状态来决定是否显示）② 属于「**四视图 / 主题 / 站点摘要**」三类之一。`test/density-thresholds.test.ts` 静态断言 `#region-toolbar` 内可点元素 == 5 且每一项带 `data-toolbar-slot` ∈ `{view,theme}`。
3. **置换登记机制**：满额 5 时新增入口**必须显式置换** —— 在 v4 台账 `toolbarAdmissions[]` 登记 `{added, removed, reason, date, leaf}`，并在 `index.html` 注释保留 old→new；**禁止**静默出现第 6 个可点。
4. **法一静态核验**：`#region-toolbar` 与 `#region-statusbar` 内**零** `[data-msg-type="askuser"|"auth"|"nextstep"]`（shim F6）；一次性交互只允许在 `#stream` 内。
5. **计数徽标同源**：4 入口的徽标数值取自 `l2/counts.ts#deriveCounts()`（**复用 v3 单源**，不新建计数实现）；`data-count` 与视图标题计数同源（ADR-V4-022）。
6. **主题三态**：`#theme-toggle` 点击循环 `auto → light → dark → auto`；`documentElement[data-theme]` 写入/移除（`auto` = 移除属性，跟随系统）；持久化用**已有** `storage` 权限（`web-cli/theme`）；读/写失败 ⇒ 降级 `auto` 且**不阻断界面**（EC-CHAT-014）；按钮 `aria-label` 与可见文案自洽，`aria-pressed`/`data-theme-state` 表达当前态（不靠颜色单通道）。
7. **站点摘要只读**：`role="status"`，非 `button`/`a`/`input` ⇒ 不计入 C1（shim F5）；summary 文本承载站点 / 授权 / 信任 / LLM / 会话 / L2 计数摘要（原 `#l2-entry-summary` 的语义）。
8. **法则六（管理入视图）**：`#authorize` / `#revoke` / `#rebind` / `#session-*` / `#group-*` / 隐私与知情同意 / 自动授权开关 **全部**迁入 `#settings-view` 的「站点与授权」分区（id 零重命名），工具栏**不**承载管理操作。

## 后果
- 预算语义从「花在一次性交互」反转为「花在常驻导航」而总数仍 ≤7（A-CHAT-003 落地）。
- 「静默第 6 个可点」在**静态 + 运行时**双门禁下不可能（可点计数 == 5 + `data-toolbar-slot` 约束 + `toolbarAdmissions` 登记）。
- 代价：管理操作进入设置视图后，多一次打开视图的交互（法则六的既定代价，D-P-V4-02 已裁决）。

### ADR-V4-019: 状态栏与风险 chips + 「永不折叠」四条机器判据

## 状态
ACCEPTED（承 D-P-V4-02 / O-CHAT-007 / FR-CHAT-004 / FR-CHAT-013 / FR-CHAT-017 / R-CHAT-005；替代方案见 §3.2/§3.3）

## 背景
现状「永不折叠」有三重结构化实现：`disclosure.ts#NEVER_FOLDABLE` 含 `risk-rail` + `assertFoldable()` 抛错 + `#risk-rail` 是 **body 直挂独立 section**；另有 `test/ui/l0.mjs` 的祖先闭包探针与 `density.mjs#isRiskClassSource` 的风险类增量归属。F 稿把风险迁到**状态栏 chips**（位置/形态/交互全变）⇒ 机器表达必须重写，且**不得**放宽为「风险可以藏在展开里」。

## 决策
1. **形态（嵌套容器，同时满足设计契约与零重写探针）**：
   ```html
   <footer id="region-statusbar" data-region="statusbar" role="contentinfo" aria-label="状态栏（常驻，永不折叠）">
     <span id="statusbar-text">…连接状态一行…</span>
     <div id="risk-chips" hidden>          <!-- 设计契约 id（shim H5/H8）+ 密度/count 的 chips 根 -->
       <div id="risk-rail" aria-live="polite">  <!-- v3 id 保留：风险行容器（探针/归属判据沿用） -->
         <!-- chips：<button class="risk-row" data-risk-class="…">文字 + 徽标 + 图标</button> -->
       </div>
     </div>
     <div id="risk-detail" hidden>…chip 详情 + 「本阶段不发命令、不改授权」披露语…</div>
   </footer>
   ```
   **理由**：shim H5/H8 逐字断言 `#risk-chips`（外层容器）可见且含 ≥2 个可见 `[data-risk]`；而 v3 的 `density-metrics.mjs#isRiskClassSource` 用 `getElementById('risk-rail')` + `closest('#risk-rail')`、`riskVisibilityProbeSource` 用 `#risk-rail .risk-row[data-risk-class=…]`。**嵌套一层即可让两套选择器同时命中**，把取代面从「探针 + 归属判据 + 两条既有断言全部重写」降为「零逻辑改动」（只把 HTML 从 `body` 直挂 section 改为状态栏内嵌容器）。
2. **id 归属澄清（唯一口径，供 tasks/build 与台账直接引用）**：`#risk-chips` = 外层 chips 容器（**设计契约 id**，其 `hidden` 表达「零风险收缩为一行」）；`#risk-rail` = 内层风险行容器（**v3 id 保留**，`aria-live="polite"`，探针与归属判据的选择器入口）。`#region-statusbar` 本体**永不带 `hidden`**。

3. **「永不折叠」四条机器判据（全部可 FAIL）**：
   - **J1** `#region-statusbar` 本体 `hidden !== true`；
   - **J2** `#risk-chips`（外层容器）在**任一类风险生效时** `hidden === false`，且 `#risk-rail`（内层）含 ≥1 可见 chip；零风险时收缩为一行且 **0 个可点 chip**（shim F3）；
   - **J3** chip 的**祖先闭包**：不含任何 `hidden === true` 元素、不含任何折叠容器（`data-l1-panel` / `data-l2-view` / `data-disclose-panel`）、不含 `[aria-expanded]` 触发器；
   - **J4** **打开任意视图后**（`#view-host` 可见 / `#settings-view` 可见）chips 仍可见（shim H8；由 S7 结构保证）。
4. **chip 语义**：三通道（`.risk-text` 非空文本 + `.risk-badge` 徽标 + `.risk-icon` 图标）；空文本 ⇒ 渲染器**抛错**（禁「仅图标」「仅颜色」）；`data-risk-class` 五类枚举保留（探针按类查）。
5. **chip 交互**：点击 → 展开 `#risk-detail`（**默认收起，不占默认密度**）+ 滚动定位到流内相关卡（`scrollIntoView` 到 `li[data-card-key]`）；详情内含披露语「本阶段不发命令、不改授权」；`aria-expanded`/`aria-controls` 成对（指向 `#risk-detail`）。
6. **密度归属**：chip（`button`）**计入**状态栏 C1（风险档上限 `17/35` 容纳）；`#risk-detail` 默认 `hidden` ⇒ 不计入默认密度；详情展开态单独登记为 `riskDetailOpen` 格（ADR-V4-021）。
7. **`disclosure.ts` 重定标**：`NEVER_FOLDABLE` = `['region-statusbar','risk-chips','risk-rail','risk-detail','stream','view-host','settings-view']`；`COLLAPSIBLE_TARGETS` **移除** `topbar`/`l1-*`（移动端归属变更）并**新增**卡内目标（v4-2/3/4 追加）；`assertFoldable('#region-statusbar')` **必须抛错**（负向断言）。

## 后果
- 「永不折叠」从**位置约束**（必须在顶部 rail）转为**语义约束 + 四条判据**（O-CHAT-007 的裁决落地），且 chip 形态与法五预算同时成立。
- 嵌套双层容器使 v3 的探针（`#risk-rail .risk-row[data-risk-class=…]`）与 `isRiskClassSource`（`closest('#risk-rail')`）**零逻辑改动**（只改 HTML 归属 + CSS + 行模板 ⇒ chip），显著压小取代面。
- 代价：`#risk-detail` 引入第三层展开；必须由 `disclosure` 白名单排除 + J3/J4 判据保证它不被用来隐藏风险。

### ADR-V4-020: 密度新口径实现 + 三条防滥用反证

## 状态
ACCEPTED（承父 ADR-V4-006/007 / FR-CHAT-070~075 / NFR-CHAT-010 / R-CHAT-004；替代方案见 §3.4）

## 背景
现行口径单源 = `test/ui/density-metrics.mjs`（`DENSITY_MEASURE_TEMPLATE` 带 `__V3_ROOT__` 占位 + `DENSITY_LIMITS` + `evaluateDensity` + `evaluateDelta` + `compareBaselineCells` + `BANNED_MEASURE_APIS`）。v4 需要在**不破坏骨架**的前提下新增「排除子树」语义与三条防滥用。

## 决策
1. **单源扩展（`density-metrics.mjs`）**：
   - 新增 `DENSITY_EXCLUDED_SUBTREES`：**从 `src/ui/sidepanel/density-scope.ts` 导入**（唯一声明点）；门禁内**再断言**其字面量 == `['#stream']`（防静态漂移）。
   - 测量算法新增一步：`excludedRoot(el)` = 祖先链（含自身）中是否存在 `matches(排除选择器)` 的元素；命中则**整个元素跳过**（C1/C2/C3 与 `elementsWithKeys`）。
   - 新增 `DENSITY_SHELL_ROOTS = ['#region-toolbar','#region-statusbar','#region-stream']`（C4 与归属判据用）。
   - 新增常量：`MAX_CLICKABLES_PER_CARD = 6` / `MAX_FIRST_SCREEN_CARDS = 2` / `MAX_WELCOME_CARDS = 1` / `MAX_WELCOME_LINES = 8`（`320px ⇒ 8 × 34 = 272 字符`）。
   - 新增纯判定：`evaluateCardBudget(cards) → {ok, violations[]}`（每张卡 `clickables ≤ 6`）、`evaluateFirstScreen(cards, tier) → {ok, count, welcomeCards, welcomeLines, violations[]}`（**只对 `default` 档空流首屏**生效）。
2. **静态防作弊（`test/density-thresholds.test.ts`）**：
   - `DENSITY_MEASURE_SOURCE` 内 `BANNED_MEASURE_APIS` **零命中**（继承）；
   - 预算口径内 `visibleIn` **只有一处**且只判 `hidden`；
   - `assertChromeNotInStream()`：`#stream` 子树内零 `[data-chrome-control]`；`#region-toolbar`/`#region-statusbar` 不是 `#stream` 后代；
   - `DENSITY_EXCLUDED_SUBTREES` 字面量再断言。
3. **防滥用反证（in-gate，`density.mjs --reverse RP-V4-0X`，逐条 `expectFailPattern`）**：
   - **RP-V4-01**（单卡 ≤6）：在默认档某卡内注入第 7 个可点元素 → **必须 FAIL**；移除后 **PASS**；
   - **RP-V4-02**（首屏 ≤2）：空态注入第 3 张卡 → **必须 FAIL**；移除后 PASS；
   - **RP-V4-03**（欢迎卡 ≤1 且 ≤8 行）：注入第 2 张欢迎卡 / 使文本 > 8 行 → **必须 FAIL**；还原后 PASS；
   - **RP-V4-04**（CSS 隐身不豁免）：对登记在册的可点元素依次设 `display:none`/`visibility:hidden`/`opacity:0`/`pointer-events:none` → **C1 不得下降**；再设 `hidden = true` → **C1 必须下降 1**；
   - **RP-V4-05**（不动面体积）：`dist/content.js` 或 `dist/pick-layer.js` +1 B → 既有守卫 **必须 FAIL**；
   - **RP-V4-06**（流豁免不可滥用）：把 `#theme-toggle` 移入 `#stream` 子树 → `assertChromeNotInStream()` **必须 FAIL** 且 C1 **不得下降**；还原后 PASS；
   - **RP-V4-07**（风险不被藏）：把某风险 chip 移入 `hidden === true` 容器 → J3 探针 **必须 FAIL**；还原后 PASS。
4. **门槛哲学保留**：`7/15 · 9/20 · 17/35` 逐字不变（FR-CHAT-074）；档位互斥优先级 `risk > firstRun > default` 保留。
5. **否决**：只测三区自身（§3.4 方案 B 会漏掉三区外常驻元素）、口径写入 `density.mjs` 单文件（方案 C 破坏分层）、把排除子树写死在门禁里（必须单源）。

## 后果
- 新口径的**单源**仍是 `density-metrics.mjs`；`density-scope.ts` 是其输入常量源（两层分工清晰）。
- 三条防滥用 + 四条继承反证全部可 FAIL 且逐条声明失败文本 ⇒ 豁免不可被滥用是**机器事实**。
- 代价：`density-metrics.mjs` + `.d.mts` 需同步更新；`evaluateDelta` 的**稳定键**要求在新布局下继续成立（缺键 ⇒ 直接 FAIL，沿用 v3 纪律）。

### ADR-V4-021: v4 密度基线（31 登记格 + 首轮实测 + 分列 + 旧 22 格冻结）

## 状态
ACCEPTED（承父 ADR-V4-007 / FR-CHAT-074 / §12 裁决 3+4 / §3.6 方案 A）

## 背景
v3 基线 `docs/v3-density-baseline.json`（589 行）登记：`caliber`（C1~C4 + measurementRoot）/ `thresholds`（三档）/ `tiers`（三档 × 3 视口 + risk worst + 15 subs）/ `logClientHeightFloor` + `MeasuredWorst` / `regions` / `designCaliber`（设计稿 vs 真产物分列）/ `volume`（与 `size-baseline.ts` 同源比对）/ `fixtureAsymmetry` / `knownLimitations`。父 spec §9.4 要求**新建 v4 基线、不改写 v3 基线**，且登记「与 v3 的差异与理由」。

## 决策
1. **新建 `docs/v4-density-baseline.json`（+ `.md`）**，`version: "v4"`；v3 文件**逐字冻结**并由 `test/density-thresholds.test.ts` 保留 **schema 保真断言**（存在性 + 关键字段逐字）。
2. **登记格集 = 31 格 + 阶段 F 比对 + 逐卡动态格**（详表见父 ADR-V4-007 第 2 条）：
   - `tiers`：`default` / `firstRun` / `risk` × `320/400/520`（**9 强制格**）；
   - `risk.subs`：5 子场景 × 3 视口（**15 格**）+ `risk.worst`（**1**）；
   - `empty`（**新增独立档**）：× 3 视口（**3 格**）—— `MAX_WELCOME_CARDS=1` + `MAX_WELCOME_LINES=8` + `MAX_FIRST_SCREEN_CARDS=2`；
   - `riskDetailOpen`（**新增**）：× 3 视口（**3 格**）—— 详情展开态；
   - `phaseFCompare`：全部格 vs 本文件（漂移 ⇒ FAIL）；
   - `perCardBudget`：**动态格**（各档可见卡逐张 ≤6，只登记违规数 0）。
3. **首轮真实产物复测必须登记为基线**：`measuredOn` / `source`（`dist/sidepanel.html` + `dist/sidepanel.js`）/ `buildCommand` / `measuredBy`；**只允许收紧**（`direction: "tighten-only"`）；放宽必须作者/编排器裁决 + 显式登记（前后值 + 日期 + 理由 + 历史保留）。
4. **设计稿/真实产物分列**：`designCaliber.published`（F 稿 shim 的 `toolbar 5 / total ≤7` 等）+ `designCaliber.measuredByOurs`（我们的 `DENSITY_MEASURE_SOURCE` 在同一 DOM 上的结果）+ `deltas`（v3 A-UI-001 教训的延续）；**设计稿仅用于阶段 A 同源对账，不作验收依据**。
5. **旧 22 格处置 = 冻结保留 + 差异登记**（§3.6 方案 A）：`docs/v3-density-baseline.json` 的 22 格**不再参与判定**；`docs/v4-density-baseline.json#differencesFromV3` 逐条登记口径变化点（测量根范围 / 排除子树 / 新增 3 组登记格 / 防滥用四道 / 阈值不变），并声明方向 = 「**换口径重定标，非放宽**」。
6. **新增登记字段**：`streamRatioSpike`（ADR-V4-023 的 12 格实测表）、`logClientHeightFloor`（v4 等价下界，只允许上调）、`welcomeCardBudget`、`knownLimitations[]`（沿用「未测边界必须显式登记」纪律）。
7. **否决**：原地改写 v3 基线（违反 FR-CHAT-074）、删除 v3 基线（历史不可删）、v3 与 v4 基线混在同一文件（口径混淆）。

## 后果
- 口径变化**可审计**：v3 的 22 格与 v4 的 31 格并存，差异逐条可读，证明「换口径不是放宽」。
- 首轮实测登记后，后续任何漂移（偏高 ⇒ 必须收紧或显式重登记；偏低 ⇒ 重登记收紧）都会被阶段 F 的 `compareBaselineCells` 报出。
- 代价：两份基线文件需同时维护 schema 保真断言；v4 文件的登记格数（31）显著多于 v3（22），首轮实测成本上升。

### ADR-V4-022: 四视图入口迁移（`view-host` 同构替换 + `counts` 单源复用）

## 状态
ACCEPTED（承 FR-CHAT-015 / FR-CHAT-016 / A-CHAT-002；v3-3 先例 `ADR-V3-025/026`）

## 背景
v3 已交付 `l2/view-host.ts`（视图替换：`#view-host` 与 `#log` 是 `#panel-main` 内兄弟；打开 ⇒ `log.hidden = true` + 恰一个 `[data-l2-view]` 可见 + 标题/计数与入口同源 + 焦点入标题；返回 ⇒ 复原 + 快照恢复 + 回焦入口）与 `l2/counts.ts`（`deriveCounts` **计数单源**，四视图标题/入口/摘要三处同源）。v4 只把**入口位置**从底部 `#l0-statusbar` + `#l2-entries` 迁到**工具栏**，视图本体与计数单源**完全复用**。

## 决策
1. **同构替换**：`mountViewHost()` 的绑定从 `#log` 改为 `#stream`；`open()` 的语义不变（隐藏流、显示宿主、恰一个视图可见、`paintHeader` 用同一 `getCounts()`、焦点入 `#l2-title`）；`close()` 的**回焦目标**从 `l2-entry-<key>`（已在工具栏，id 不变）与 `#l0-statusbar`（退役）改为 `#l2-entry-<key>`；`#l0-statusbar` 分支移除（台账登记）。
2. **计数单源复用**：`deriveCounts()` / `l2EntryLabel()` / `l2EntryCount()` / `l2ViewCountText()` **零改动**；工具栏 4 入口的 `.badge` 用 `l2EntryCount()`（与视图标题 `data-count` 同源）。**不新建**计数实现（FR-CHAT-046 的三处同源纪律）。
3. **per-target `aria-expanded`**：`#l2-entry-settings` 仍指向 `#settings-view`（其自己的视图），其余三项指向 `#view-host`；`syncTriggerAria()` 的 per-target 语义保留（v3-3 的 I5 修复不得回退）。
4. **`#stream ↔ #view-host` 互斥**：`#view-host` 与 `#stream` 是 `#region-stream` 内的兄弟（v3 的 `#log ↔ #view-host` 关系同构）；打开视图时 `#stream.hidden = true`，且**恰一个**滚动容器（`#stream` 被 `hidden` ⇒ 不参与滚动；视图自身局部滚动）。
5. **风险位不受影响**：`#region-statusbar` 是 `body` 直挂 ⇒ 视图替换无法触达（S7 / J4）。
6. **可访问性**：`#l2-title` 保持 `tabindex="-1"` 并接收焦点；`Esc` 返回保留；返回后回焦入口（工具栏按钮）；收起内容不在 tab 序（`hidden`）。

## 后果
- 「入口位置迁移」的成本被压到最小：`view-host.ts` 只改**绑定与回焦**（约 5 行），`counts.ts` **零改动**；l2.mjs 的断言从「底部面板入口」重锚到「工具栏入口」，语义不变。
- 计数三处同源（入口徽标 / 视图标题 / 状态栏摘要）在 v4 下继续由**单一 `deriveCounts()`** 保证。
- 代价：`#l0-statusbar` 退役 ⇒ `view-host.close()` 的回焦分支与 `l0.mjs` 的相关断言需同叶重写。

### ADR-V4-023: 本叶门禁清单（增补 l0/l1/l2）+ journey 保护段新 pin + ≥65% spike 规程

## 状态
ACCEPTED（**含偏差登记**：门禁集合增补 l0/l1/l2；依据 = 父 plan ADR-V4-011 第 2 条 / EC-CHAT-013 / §1 偏差登记）

## 背景
本叶取代 L0/L1 宿主 ⇒ `test/ui/l0.mjs`（73）/ `l1.mjs`（64）/ `l2.mjs`（68）必然失效；而叶子 spec §8 的门禁清单未列它们。父 spec §10.3 / EC-CHAT-013 要求「每叶收尾全门禁绿、禁留红灯」。同时 journey 保护段必须显式新 pin（父 ADR-V4-008），而 `#15b` 的 ≥65% 可达性**未经实测**（§12 裁决 7）。

## 决策
1. **本叶收尾门禁清单（严格串行、一次一个 Chromium）**：
   `npm run typecheck` → `npm run build` → `npm test`（含 5 个新增 node 门禁）→ `test:supersession` → `test:gate-integrity` → `test:zero-injection` → `test:page-input` → **`test:l0`** → **`test:l1`** → **`test:l2`** → **`test:density`** → `test:ui`（journey）→ `test:insight` → `test:binding` → `test:hardening` → `test:e2e` → `test:design-contract`。
   **增补项 = `test:l0` / `test:l1` / `test:l2`**（本叶 §1 偏差登记）。
2. **计数下界（只增）**：journey `≥167` · insight `≥108` · binding `≥192` · **l0 `≥73`** · **l1 `≥64`** · **l2 `≥68`** · density `≥60` · sidepanel-view `≥38` · nodeTestRuntime `≥ max(646, 832)`。
3. **journey 保护段执行规程**：**严格按父 ADR-V4-008 的八步**；本叶的产出为 ① v4 台账 `protectedSupersession`（old sha 逐字）② `#15a~#15q` 等价改写表 ③ `modifiedRanges` 条目 ④ `protectedRanges[status=active]` 新 pin ⑤ `redlineRemap[]` 三条 ⑥ RP-V4-08 反证日志。
4. **≥65% S 级 spike 规程（本叶第一任务，不可跳过/不可后置）**：
   - **执行者**：本叶第一条任务（`tasks` 阶段的 `TASK-X01`）；
   - **矩阵**：3 宽度（320/400/520）× 2 主题（明/暗）× 2 风险态（无风险 / chips 详情展开）= **12 格**；
   - **测量**：每格记录 `#region-toolbar` / `#region-statusbar` / `#scroll-bottom` 的 `getBoundingClientRect().height`，并计算 `#region-stream` 的 `height / innerHeight`；
   - **判据**：12 格全部 `≥ 0.65`；
   - **产物**：12 格实测表 + 最差格 + 归因（工具栏/状态栏/chips 详情各占多少）→ 写入 `docs/v4-density-baseline.json#streamRatioSpike` + v4 台账 `entries[]`（`id: V41-SPIKE-401`）；
   - **不可达处置**：**立即停下并上报编排器**，附实测表 + 两个可选项（显式取代 / 参数微调）；**禁止**静默下调阈值、改用内容高度凑数、删除断言、把流外元素算进分子；
   - **顺序**：spike 结论决定 `#15b` 的最终形态 ⇒ **先于** journey 保护段改写落定。
5. **反证（实跑，FAIL → 还原 → PASS，日志落盘禁 tail 截断）**：RP-V4-01~07（in-gate，`density.mjs --reverse`）+ RP-V4-08（取代台账：删 1 条断言 → FAIL）。
6. **V3-VOL-3 中间重登记**：本叶收尾按**五要素**登记 `sidepanel.js` 实测值（容差 5% 不动；`PENDING_ABSOLUTE_CAP` **保持 `resolved:false` 不预填**）。
7. **元门禁**：`EXPECTED_AUDITED_FILES` 追加 `test/ui/stream.mjs` 等（后续叶门禁）在本叶**不**追加（本叶不新增 Chromium 门禁）；`CHROMIUM_GATES.length === 9` **不动**；in-gate 例外文本追加 RP-V4 说明。

## 后果
- 本叶收尾时 l0/l1/l2 的门禁**已重写且绿**，不把红灯留给 v4-2（EC-CHAT-013 满足）。
- ≥65% 可达性在**本叶第一任务**就有结论：通过 ⇒ `#15b` 落 ≥65.0%；不通过 ⇒ 上报编排器（不静默弱化）。
- 代价：本叶工作量显著（5 个门禁重写 + 1 个 spike + 1 个台账新建 + 1 个基线新建 + 1 个 node 门禁新建），但其产出的「三区骨架 + 密度新口径 + 门禁基线」是三个兄弟叶的共同地基。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V4-1 叶子技术方案）。**产出**：本叶 `plan.md`（含 §1~§8 + **ADR-V4-017~023**）。**关键裁决**：① 三区改造 = `body` 直挂 + `#log`→`#stream` 唯一重命名 + 其余 id 零重命名 + 容器元素复用 + 占位宿主（`data-transitional-host`）；② 工具栏 = 只读站点摘要 + 4 视图入口（计数徽标复用 `l2/counts.ts`）+ 主题三态 = **5 可点**，准入规则 + 置换登记机制；③ 风险位 = 状态栏内**嵌套双层容器**（外层 `#risk-chips` = 设计契约 id；内层 `#risk-rail` = v3 id 保留）+ **四条机器判据 J1~J4** + chip 详情默认 `hidden` 不占默认密度；④ 密度 = `density-scope.ts` 单源排除子树 + 三条防滥用常量 + `evaluateCardBudget`/`evaluateFirstScreen` + **RP-V4-01~07**（in-gate）；⑤ v4 密度基线 = 新建 `docs/v4-density-baseline.json`（**31 登记格** = 9 强制 + 15 风险 + 3 空态 + 3 风险详情展开 + worst）+ 首轮实测 + 设计稿/真产物分列 + v3 22 格冻结；⑥ 四视图 = `view-host`/`counts` 同构替换（只改绑定与回焦）；⑦ 门禁 = **增补 l0/l1/l2** + journey 保护段八步新 pin + **≥65% 12 格 S 级 spike 为第一任务**。**偏差显式登记**：门禁集合增补（§1）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`dist/**`·`manifest.json`·ROADMAP、不动 `main`、不 commit/push、**不跑门禁 / 构建 / Chromium**。 | 2026-09-18 | SDDU Plan Agent |


