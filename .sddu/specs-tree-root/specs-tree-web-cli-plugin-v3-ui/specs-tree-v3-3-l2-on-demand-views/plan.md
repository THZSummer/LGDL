# 技术计划：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: 本叶 `spec.md` v1.0 + 父 `../spec.md`（权威条文 §5.4 / §8.3 / §8.4 / §10）+ 父 `../plan.md`（承接 **ADR-V3-007 / 008 / 009 / 010 / 011**）+ **叶子 V3-1**（`../specs-tree-v3-1-l0-shell-density/plan.md`：`#l0-statusbar` 入口面板骨架 / 计数占位 / `disclosure.ts` 契约）+ 设计基准 `design/ui-redesign/option-e-progressive.html`（L2 = ≤2 次交互、视图替换 + 「← 返回」、默认一个都不出现）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（L2 四类视图默认零占用 + 「计数 + 入口」+ 视图替换与返回 + 命令目录口径分列 + 审计零明文 + 设置归属 + 树 ARIA 保留 + **取代台账最大战场**；ADR-V3-025~029）。**只做 plan**：不写 tasks、不写代码、不改源码/测试/设计稿、不跑门禁与 Chromium。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 本叶 `spec.md` 存在（14,021 B） | ✅ |
| 父 `spec.md` / `discovery.md` / `plan.md` 存在 | ✅ |
| **V3-1 契约可承接**（`#l0-statusbar` 入口面板骨架 + 计数占位 + `disclosure` 白名单可追加） | ✅（设计已定） |
| 可复用的既有资产：`src/ui/tree/{tree-drawer,tree-view,tree-ops,tree-receipt}.ts`、`src/insight/{command-catalog,capability-catalog,project-tree,ownership-tree}.ts`、`#settings-view` 家族、`#audit` / `#audit-count` | ✅（只读复用，**不重写**） |
| **外部 API 文档缓存** | ⚠️ **N/A** —— 本叶无外部服务 API（真值全部来自既有进程内投影 + `chrome.storage`） |
| 红线基线（`main` 未动；`manifest.json` / `src/security/**` / `src/content/**` 零改动） | ✅ |
| 本叶不新增权限 / 依赖；不引入 `contextMenus`；不改 `options.html` 与设置项语义 | ✅（NG-V3-014） |
| 零明文纪律（审计视图） | ✅（NFR-V3-016） |

**本叶承接的父 plan 约束（不重新讨论）**：

| 父 ADR | 对本叶的直接约束 |
|--------|----------------|
| ADR-V3-007 | 本叶是**取代台账最大战场**：`insight.mjs` 树 / 回执 / 确认断言 + `sidepanel-view.test.ts` 4 项布局契约；台账**只追加条目**；union 口径（`insight + l1 + l2 ≥ 108`）在本叶补齐 `l2.mjs` 计数 |
| ADR-V3-008 | L2 入口必须带**非空文字 + 计数**；`aria-controls` 成对；长路径 / 长命令名的 320px 截断策略 |
| ADR-V3-009 | id 零重命名（含 `#tree-fab` / `#tree-drawer` / `#settings-view` 家族）；`#log` 保持唯一面板级滚动容器 |
| ADR-V3-010 | 本叶提供 L2 视图宿主契约 + 计数派生契约（供 v3-2 的「查看全局树 / 审计出口」指向） |
| ADR-V3-011 | `sidepanel.js` 改动最大 → 本叶内显式重登记概率**最高**（前后值 + 日期 + 来源 + 理由 + 历史保留） |

---

## 2. 架构分析

### 2.1 本叶的输入真值（现状，只读实测）

| 事实 | 值 | 对本叶的含义 |
|------|-----|-------------|
| v2 树入口 | `#tree-fab`（`#panel-main` 内 absolute，`aria-haspopup="dialog"`）+ `#tree-drawer`（`role="dialog"` `aria-modal="false"`，覆盖式抽屉） | 归属迁移：从「覆盖式抽屉」改为「L2 视图替换」；`role="dialog"` 语义需迁移（见 ADR-V3-028） |
| v2 树渲染 | `tree-view.ts`（真层级 + `role=tree/treeitem` + `aria-expanded`/`aria-level` + 键盘 + 面包屑 + 每层 allow/ask/deny 控件） | **保留**：ARIA / 键盘 / 面包屑 / 9 动作白名单固定序**不得改动**（只在归属层改） |
| 命令档案 | `src/insight/command-catalog.ts`（逐条 action/risk/source/delayMs/抑制/clamp 原因）+ `catalog-reconcile.ts`（与 parity 基线对账） | `delay` = `deny` 的**唯一措辞源**（沿用 v2 `TREE_NO_ESCALATION_NOTE` 的 pin 机制） |
| 命令目录口径 | 实时面（`host.deriveTools()` + `router.query`）vs 对账基线（`test/parity/baseline-catalog.json`）在 v2 已**分列**（实时 28/94 = 122 vs 基线 34/142） | 本叶**必须继续分列**（EC-V3-016），**不得**合并为一个数字或复用设计稿 122 当验收值 |
| 审计 | `#audit` / `#audit-count` + `admin_audit-export`（既有出口） | L2 审计视图消费既有审计数据；**零明文**字段白名单 |
| 设置 | `#settings-view` + `#settings-{llm,auto-auth,tabs,sessions,diagnostics,compliance,migration}` + `#settings-back` | 只改**默认可见性**（进入 L2 视图）；**项语义零改**、`options.html` 零 diff |
| `#log` | 面板级唯一滚动容器 | L2 打开期间**不得**再引入第二个面板级滚动容器（视图替换：`#log` 与 `#view-host` 二选一可见） |
| 测试基线 | `sidepanel-view.test.ts` 38 用例含 4 项布局契约；`insight.mjs` 108 | 取代台账最大战场（本叶预留取代工作量） |

### 2.2 目标：L2 四类视图（默认一个都不出现）

| 视图 | 宿主 | 默认态 | 入口（L0 状态栏 → 入口面板） | 数据源（只读复用） |
|------|------|--------|---------------------------|------------------|
| 全局连接树（四维度） | `#view-host > [data-l2-view="tree"]` | `hidden` | 「连接树 · N 节点」 | v2 `buildInsightSnapshot` → `project-tree` / `ownership-tree` |
| 命令目录（含 L1/L2/L3 归档） | `#view-host > [data-l2-view="commands"]` | `hidden` | 「命令目录 · 实时 X / 基线 Y」 | `command-catalog` + `catalog-reconcile` |
| 审计 | `#view-host > [data-l2-view="audit"]` | `hidden` | 「审计 · N 条」 | 既有审计读取通道 |
| 设置 | `#view-host > [data-l2-view="settings"]`（承载既有 `#settings-view` 语义） | `hidden` | 「设置」 | v1 设置面板既有实现与项语义 |

**入口形态**：`#l0-statusbar`（一行，v3-1 提供）→ 点开 = **入口面板**（≤4 个 L2 入口，各带**计数**）→ 点某个入口 = **视图替换**（`#log` `hidden`、`#view-host` 及目标视图可见；顶部「← 返回」）。**交互步数**：状态栏（1）→ 入口（2）= **≤2 次**（FR-V3-048）。

**默认零占用**：四视图内容均在 `hidden` 子树内（可见计数 = 0）；**禁止**用 CSS 隐身或移出视口假装不出现（与 C1 反作弊同规则，AC-V3-005 的同一实现源断言）。

**L2 打开期间风险位仍常驻可见**（FR-V3-048）：`#risk-rail` 是 `body` 直挂独立分区（v3-1），**视图替换只发生在 `#panel-main` 内** → 风险位**不被替换掉**；门禁断言 L2 打开态下风险行仍可见且祖先闭包无 `hidden` / `[data-l2-view]`。

**返回复位**：`#view-host` 隐藏 + `#log` 恢复可见 + `disclosure.restore(snapshot)`（进入前展开态）+ 密度复测回默认档（FR-V3-054）。

### 2.3 目标：计数**从真值派生**（禁止硬编码）

| 计数 | 真值源（唯一） | 派生方式 | 门禁如何证明「同源」 |
|------|--------------|---------|-------------------|
| 连接树节点数 | `ownership-tree` 快照的节点集合 | `counts.tree = nodes.length` | 改动 fixture 的绑定 / 命令面 → 计数**随之变化**；硬编码则 FAIL |
| 命令目录 | **分列**：实时面（`command-catalog` 实时枚举）/ 对账基线（`catalog-reconcile` 读取的 parity 基线） | `counts.commands = { live, baseline }` | 两个数字**分别**展示；断言二者与各自真值逐项相等且**不相等时如实呈现**（EC-V3-016） |
| 审计条数 | 既有审计读取通道返回的条目数 | `counts.audit = entries.length` | 注入一条审计记录 → 计数 +1（门禁双向断言） |
| 设置分区数 | 既有 `#settings-*` 分区集合（v1 语义） | `counts.settings = sections.length` | 与 v1 项集合等价断言（FR-V3-051） |

**硬编码即 FAIL 的机制**：门禁在**同一夹具**下 ① 记录计数，② 通过既有通路改变真值（例如切换绑定 origin / 追加一条会话命令），③ 重读计数并断言**变化量与真值变化量相等**；若计数不变 → FAIL（判定为硬编码）。

### 2.4 目标：命令目录口径分列与 `delay` 消歧

1. **分列呈现**（EC-V3-016）：实时面与对账基线**两个数字**并列，各带标签（「实时面（当前工具面枚举）」「对账基线（parity 基线）」）；**禁止**写「已全部渲染」之类夸大表述；差异**不得**合并掩盖；若发现口径差异 → 登记（`notes`）。
2. **逐条有档**：每条命令呈现 `allow` / `ask` / `deny` + 来源（默认档 / 用户覆盖 / clamp 导致）+ 生效值；**硬底线不可覆盖档零控件 + 原因可读**（v2 语义保留）；`ui` / `state` / `external` 只可收紧（**无 allow 控件**）。
3. **`delay` 消歧沿用 v2 单源措辞**：`delay`（= `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）——**措辞来源于单一常量**（复用/扩展 v2 的 `TREE_NO_ESCALATION_NOTE` 机制），门禁逐字断言；**不得**在新视图里另写一份措辞。
4. **提权控件 = 0**：L2 视图内不得出现「放宽 / 提权 / 放行」控件；仅 v2 既有覆盖控件（其 clamp **仍在 SW 侧强制**）；负向断言：伪造 `sendMessage` 不能突破 clamp（复用 v2 既有负向断言）。
5. **9 动作白名单（固定序）**：树视图内的 9 个动作**保留固定序**，断言「9 个 + 顺序」；新增 UI 不得增删动作。

### 2.5 `#tree-fab` / `#tree-drawer` 的兼容处置（V33-O-3 的关键）

**事实**：`#tree-fab` 是 `#panel-main` 内 absolute 悬浮入口，`#tree-drawer` 是 `role="dialog"` `aria-modal="false"` 覆盖式抽屉；`insight.mjs` 有大量断言钉住「FAB 存在 + `aria-controls`/`aria-expanded` 同步 + 点 FAB 开抽屉 + 抽屉内树结构 / 键盘 / 面包屑 / 控件分层」。

**处置（保留 v2 已验收行为，只改归属）**：
1. **`#tree-fab` 保留 id 与按钮语义**，但**默认 `hidden`**（不再常驻悬浮）——其可点预算让位给 L0 的 7 个可点；进入 L2 连接树视图时，FAB 作为**视图内的「展开/收起树详情」次级入口**复用（或视图内直接渲染树主体，FAB 仅在「紧凑模式」下出现）。
2. **`#tree-drawer` 保留 id 与 `role="tree"` 内容渲染**，但宿主从「absolute 覆盖抽屉（`role="dialog"`）」改为「`#view-host > [data-l2-view="tree"]` 内的**视图主体**」→ `role="dialog"` / `aria-modal` / `aria-haspopup="dialog"` 三个属性迁移（见 ADR-V3-028 的台账条目）。
3. **ARIA / 键盘 / 面包屑 / 9 动作 / 覆盖控件**：**全部保留**（`role=tree/treeitem` + `aria-expanded`/`aria-level` + roving tabindex + 面包屑 + 分层控件）。
4. **`insight.mjs` 的连带**：凡「点 FAB 开抽屉 → 断言抽屉内 X」的条目 → 改为「进入 L2 连接树视图（状态栏 → 入口）→ 断言视图内 X」；**逐条台账登记**（不能就地前置展开的部分）。

### 2.6 能力集等价（AC-V3-026）与「不做项守卫」

| 项 | v3 全展开态必须与改造前**逐项等价** | 断言方式 |
|---|---|---|
| 命令集合 | 工具面枚举集合 | 集合相等 + 双向对账（复用 v2 `catalog-reconcile`） |
| 处置档位 | `allow`/`ask`/`deny` 三档 + clamp 语义 | 逐条档位表相等 |
| 四维连接树 | 四维度一级分组 + 真层级 | 节点集合相等 |
| 命令目录 | 122 卡口径**分列**（实时 / 基线） | 两个数字分别与真值相等 |
| 审计 | 条目数与字段白名单 | 条目数相等 + 零明文扫描 |
| 设置项 | v1 设置分区与项集合 | 集合相等；`options.html` 零 diff |
| 9 动作白名单 | 9 个 + 固定序 | 逐个 + 顺序断言 |
| 回执三件套 | v3-2 契约（本叶提供审计出口目标） | 三件可达断言 |

**不做项守卫**：`manifest.json` 零 diff；`packages/web-cli-base/**` 零 diff；`package.json` 依赖零新增；`policy.ts` / `auto-authorize.ts` sha256 = pin；`options.html` 零 diff（AC-V3-027）。

---

## 3. 方案对比

### 3.1 P-V33-01 L2 视图替换的形态

| 维度 | **方案 A：`#panel-main` 内 `#log` ↔ `#view-host` 二选一（视图替换）** | 方案 B：新增独立 `<section>` 与三区并列（`body` 直挂） | 方案 C：继续用 `#tree-drawer` 覆盖式抽屉（v2 形态） |
|------|:--|:--|:--|
| 描述 | `#view-host` 作为 `#log` 的兄弟；打开视图时 `#log` `hidden`、`#view-host` 可见；顶部「← 返回」 | 在 `body` 下新增 `#l2-view` 全屏分区，打开时隐藏三区 | 保留覆盖式抽屉（absolute + `role="dialog"`） |
| 优点 | 单面板级滚动容器（`#log` 或视图内部滚动）；`#composer` / 三区契约不受影响；风险位（`body` 直挂）不被替换；返回后展开态易复原 | 视图与主区完全隔离 | 改动最小（v2 原样） |
| 缺点 | `#log` 在视图打开期间需 `hidden`（其既有「滚动位置 / 草稿保留」语义要断言保留） | **会隐藏三区** → `#composer` 也隐藏（但 `#composer` 本就默认 `hidden`）+ 状态栏 / 风险位若不在该分区内会被盖住 → 需额外保证风险位可见 | **违反 FR-V3-047**（不引入第二个滚动容器 / 不做浮层）；且 `role="dialog"` 与「视图」语义不符 |
| 风险 | 低 | 中（三区语义被临时隐藏，连带断言多） | 高（需求违规 + v2 语义纠缠） |
| 工作量 | 中 | 中 | 低 |

### 3.2 P-V33-02 `#tree-fab` / `#tree-drawer` 的处置

| 维度 | **方案 A：保留 id 与内容渲染，归属改为 L2 视图主体；FAB 默认 `hidden`** | 方案 B：移除 FAB，仅保留状态栏入口 | 方案 C：双入口（FAB 常驻 + 状态栏入口） |
|------|:--|:--|:--|
| 描述 | FAB 保留（默认 `hidden`，L2 视图内可作次级入口）；`#tree-drawer` 内容迁入 `[data-l2-view="tree"]` | 删除 FAB 元素 | FAB 常驻 + 状态栏入口并存 |
| 优点 | ① id 零重命名（S5）；② `insight.mjs` 断言只需改「入口路径」而非「元素存在性」；③ v2 树内容 / ARIA / 键盘 / 面包屑 / 9 动作全保留 | 默认态可点最少 | 两种习惯都可用 |
| 缺点 | FAB 在 L2 视图内的角色需明确（否则成死代码）；`role="dialog"` 迁移需台账 | **删元素**违反零删除纪律（且 `insight.mjs` 大量 `getElementById('tree-fab')` 直接失败） | **默认态 +1 可点** → 直接打破 ≤7 预算（除非再收窄别处） |
| 风险 | 低 | 高（纪律违规 + 断言大面积失败） | 高（密度违规） |
| 工作量 | 中 | 中 | 低 |

### 3.3 P-V33-03 计数真值的派生方式

| 维度 | **方案 A：单一计数模块 `l2/counts.ts` 统一从既有投影派生** | 方案 B：各视图各自计算并各自渲染 | 方案 C：接受由 SW 下发的计数（`state` 消息扩展） |
|------|:--|:--|:--|
| 描述 | 一个纯函数 `deriveCounts(snapshot, auditEntries, settingsSections)` → 入口面板与视图标题共用 | 每个视图文件自己算 | 扩展 `state` 消息携带计数 |
| 优点 | ① 同源（入口面板与视图标题不可能不一致）；② node 可测（纯函数）；③ 门禁「改真值 → 计数变」只测一处 | 就近实现 | 无需在侧栏重算 |
| 缺点 | 需一次投影调用（v2 已有 `insight-tree` 拉取，成本既定） | **两处计数可能不一致**（作者立刻会发现） | 扩展消息面（v2 已定 `state.insight?`，再加计数会扩大面）+ 侧栏仍需渲染 |
| 风险 | 低 | 中（不一致） | 中（消息面扩散） |
| 工作量 | 低 | 低 | 中 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V33-01 视图替换 | **方案 A**（`#log` ↔ `#view-host` 二选一） | 唯一保持「单一面板级滚动容器」且风险位（`body` 直挂）不被替换的形态（ADR-V3-025） |
| P-V33-02 树入口处置 | **方案 A**（保留 id/内容，归属迁移；FAB 默认 `hidden`） | 同时满足 id 零重命名、v2 内容保留、默认态 ≤7 预算（ADR-V3-028） |
| P-V33-03 计数派生 | **方案 A**（单一 `counts.ts` 纯函数） | 同源 + node 可测 + 门禁可双向证明（ADR-V3-026） |

**本叶开放点裁决（V33-O-1~4，逐条落定）**：

| # | 开放点 | 裁决 | 落点 |
|---|--------|------|------|
| V33-O-1 | 「计数从真值派生」的真值源（命令目录实时面 vs parity 基线；树节点口径） | **分列**：命令目录 = `{live, baseline}` 两个数字（各自真值，如实呈现差异，EC-V3-016）；树节点数 = `ownership-tree` 快照节点集合大小；审计 = 既有审计条目数；设置 = v1 设置分区集合大小 | ADR-V3-026 |
| V33-O-2 | L2 视图替换的挂载方式（与三区 flex 的关系） | `#view-host` 作为 `#log` 的**兄弟**（`#panel-main` 内）；打开时 `#log` `hidden`；不新增面板级滚动容器、不改三区文档序 | ADR-V3-025 |
| V33-O-3 | `#tree-fab` / `#tree-drawer` 是「保留为 L2 入口」还是「改为状态栏入口」 | **两者都保留数据/语义，但默认可见性归 L2**：FAB 默认 `hidden`（L2 视图内的次级入口）；`#tree-drawer` 内容迁入 `[data-l2-view="tree"]`；状态栏入口面板为主入口。**不推翻 v2 已验收行为**（ARIA / 键盘 / 面包屑 / 9 动作 / 覆盖控件全保留），取舍理由显式登记（ADR-V3-028） | ADR-V3-028 |
| V33-O-4 | `sidepanel.js` 体积重登记的预期增量与是否需要拆分 | 预估 **+4~6 KB**（主要复用既有实现）；若超 ceiling → 本叶内显式重登记（ADR-V3-011）。**不拆分模块**（拆分只影响可读性，不降产物字节；且拆分会动更多文件、扩大取代面） | §5 / §6 |

---

## 5. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/view-host.ts` | L2 视图宿主：`#log` ↔ `#view-host` 替换 + 「← 返回」+ 展开态复原 + 焦点管理 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/counts.ts` | **计数真值派生**（纯函数：树节点 / 命令目录 `{live,baseline}` / 审计 / 设置分区） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/command-catalog.ts` | 命令目录视图（复用 `src/insight/command-catalog.ts` 只读投影；分列实时/基线；`delay` 措辞取单源；硬底线零控件） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/audit.ts` | 审计视图（条目列表 + 零明文字段白名单 + 既有导出出口） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 追加 `#view-host` 与四个 `[data-l2-view]` 容器（默认 `hidden`）标记与样式；`#tree-fab` 加 `hidden`；`#settings-view` 归属调整（迁入 `[data-l2-view="settings"]` 或作为其内容宿主）；`#tree-drawer` 的 `role`/`aria-*` 调整需台账 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 追加 L2 入口面板接线 / 视图替换 / 返回（既有 handler 零删改） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | 追加 L2 视图模型（入口面板 + 四视图数据 + 计数） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` | 白名单追加 L2 入口面板 id（仍不含 `#risk-rail`） |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | 宿主从 absolute 覆盖抽屉改为 `#view-host` 内视图主体（**渲染逻辑 / ARIA / 键盘 / 面包屑 / 分层控件零改动**） |
| NEW | `packages/web-cli-plugin/test/ui/l2.mjs` | L2 门禁：四视图默认零占用 + ≤2 次交互 + 计数同源（改真值 → 计数变）+ 返回复位 + 单滚动容器 + L2 期间风险位可见 + 树 ARIA / 9 动作固定序 + 零提权控件 + 零明文 + 能力集等价（AC-V3-026） |
| NEW | `packages/web-cli-plugin/test/l2-counts.test.ts` | 纯单测：`deriveCounts` 与真值同源（含增量）+ 分列口径不退化为合并数字 |
| MODIFY | `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | **追加**本叶 `entries[]`（**最大批量**）+ 更新 `counts.insight.currentRuntime`（含 `l2.mjs`） |
| MODIFY | `packages/web-cli-plugin/package.json` | 追加 script `test:l2`；`test:v3` 串行链追加（依赖零新增） |
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs` | 树 / 回执 / 确认相关断言的入口路径改写（状态栏 → 入口 → 视图）+ 逐条台账 |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` | 4 项布局契约**逐项迁移为等价或更强断言**（不删）；其余静态断言按 DOM 契约迁移 + 逐条台账 |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` | 若 `#tree-*` 相关条目必须改 → 同编号最小改写 + 台账；`#21*`/`#22*` 区域字节零改 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | **本叶最可能触发**显式重登记（前后值 + 日期 + 来源 + 理由 + 历史保留） |

**明确不改**：`manifest.json` · `src/security/**` · `src/content/**` · `src/insight/**`（只读复用） · `packages/web-cli-base/**` · `options.html` · `design/**` · v1/v2 SDDU 目录 · `ROADMAP.md` · 依赖段 · L0 骨架与风险位（归 v3-1）· L1 内容（归 v3-2）。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R33-01 取代量失控**（`insight.mjs` 树/回执/确认 + `sidepanel-view.test.ts` 4 契约 + 可能的 `binding.mjs`） | **高** | **极高** | ① 优先「入口路径改写」而非「重写选择器」（id 零重命名）；② 台账 hunk 映射门禁强制逐条命中；③ 4 项布局契约**增强式**迁移（父 ADR-V3-007 第 6 条）；④ **本叶内闭合**（不得留红灯给 v3-4）；⑤ 预留取代工作量（本叶是最大战场，如实登记工期风险） |
| **R33-02 L2 打开期间风险位被盖住 / 被替换** | 中 | 极高 | 视图替换只发生在 `#panel-main` 内；`#risk-rail` 为 `body` 直挂；门禁断言 L2 打开态风险行可见 + 祖先闭包无 `hidden`/`[data-l2-view]`（FR-V3-048） |
| **R33-03 计数硬编码或口径合并** | 中 | 高 | 单一 `counts.ts` + 门禁「改真值 → 计数变」双向断言；命令目录 `{live,baseline}` **分列**（EC-V3-016）；`l2-counts.test.ts` 断言不得退化为合并数字 |
| **R33-04 引第二个滚动容器（破坏单滚动契约）** | 中 | 中 | `#log` 与视图互斥可见；长内容用视图内局部滚动块；门禁断言「面板级滚动容器计数 = 1」 |
| **R33-05 提权 / 放宽控件泄漏进 L2** | 低 | 极高 | 只读投影 + 硬底线零控件 + `ui`/`state`/`external` 无 allow + 伪造 `sendMessage` 不能突破 clamp（复用 v2 负向断言）；门禁计数断言 |
| **R33-06 零明文泄漏（审计视图）** | 低 | 高 | 字段白名单 {命令名, 动作 id, 结果, 耗时, 时间, 审计 id} + 反例扫描（URL 去参；通知/剪贴板/书签正文零命中） |
| **R33-07 `sidepanel.js` 超 ceiling** | 中 | 中 | 复用既有实现（不重写树/档案/审计/设置）；静态结构落 html；超限则本叶内显式重登记（ADR-V3-011） |
| **R33-08 320px 长路径 / 长命令名 / 面包屑溢出** | 中 | 中 | 截断 + 内部横向不滚动（用换行 + 缩进步长 8px）；门禁 320 视口零水平溢出断言 |
| **R33-09 能力集被静默削减**（为压密度真的「少功能」） | 中 | 高 | AC-V3-026 逐项等价断言（8 项）+ 差异必须显式登记 |
| **R33-10 门禁并发 OOM** | 中 | 高 | `test:v3` 串行链；日志全量落盘（禁 tail） |

### 交付门槛（本叶，收尾必须全绿且串行）

| 门禁 | 断言要点 |
|------|---------|
| `npm run typecheck` / `npm test`（含 `l2-counts.test.ts`） | 0 error / 全绿；`test(` 计数只增 |
| `npm run test:l2` | 四视图默认零占用 / ≤2 次交互 / 计数同源 / 返回复位 / 单滚动容器 / L2 期间风险位可见 / 树 ARIA + 9 动作固定序 / 零提权 / 零明文 / 能力集等价 |
| `node test/ui/density.mjs`（复用） | 返回后 L0 密度复位默认档（三档 × 三视口） |
| `npm run test:supersession` | 本叶 hunk（**批量**）全部命中台账；union 计数 ≥108（含 `l1.mjs` + `l2.mjs`）；`protectedRanges` hash 不变 |
| `npm run test:ui` / `test:insight` / `test:binding` / `test:hardening` | journey ≥167；insight union ≥108；binding ≥192；hardening 24 |
| `npm run test:e2e` | PASS |
| 体积 / 零改动 | `content.js` ≤177,076（无容差）；`sidepanel.js` ≤ ceiling（超则本叶内显式重登记）；`manifest.json` / `src/security/**` / `src/content/**` / `base` / `options.html` / `design/**` 零 diff |
| 人工面 | 树逐层展开观感 / 窄栏长路径 / 键盘体感 / 明暗观感 → 登记「**未执行**」 |

---

## 7. 生成的 ADR

> 本叶产出 **ADR-V3-025~029**（5 个），与父 `ADR-V3-001~012` / v3-1 `ADR-V3-013~019` / v3-2 `ADR-V3-020~024` / v3-4 `ADR-V3-030~036` **零编号冲突**。状态 = ACCEPTED。

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V3-025 | L2 视图替换 = `#panel-main` 内 `#log` ↔ `#view-host` 二选一（单面板级滚动容器 + 返回复位 + 风险位不被替换） | ACCEPTED |
| ADR-V3-026 | 计数**从真值派生**（单一 `l2/counts.ts` 纯函数 + 命令目录 `{live,baseline}` 分列 + 「改真值 → 计数变」门禁） | ACCEPTED |
| ADR-V3-027 | 命令目录逐条有档 + `delay`=deny 措辞单源 + 硬底线零控件 + 零提权 + 9 动作固定序 | ACCEPTED |
| ADR-V3-028 | `#tree-fab` / `#tree-drawer` 兼容处置（保留 id/内容/ARIA/键盘/面包屑/9 动作；归属改为 L2 视图主体；FAB 默认 `hidden`；`role="dialog"` 迁移台账） | ACCEPTED（含取舍登记） |
| ADR-V3-029 | 本叶取代策略（取代台账**最大战场**：insight 树/回执/确认 + `sidepanel-view.test.ts` 4 契约的增强式迁移 + union 计数补齐） | ACCEPTED |

### ADR-V3-025: L2 视图替换 = `#panel-main` 内 `#log` ↔ `#view-host` 二选一

## 状态
ACCEPTED（承父 FR-V3-045 / 047 / 048 / 054 + 父 ADR-V3-001 / 009）

## 背景
FR-V3-047 明确：L2 是**同一内容区的视图替换**（不是浮层、不引入第二个滚动容器），顶部有「← 返回」；FR-V3-048 要求 L2 打开期间**风险位仍常驻可见**；FR-V3-054 要求返回后 L0 密度回默认档。既有 `#tree-drawer` 是覆盖式抽屉（v2 形态），与上述要求不符。同时 v1 三区 flex 契约（`#log` 唯一滚动容器 / `#composer` 末元素 / 文档序）不得破坏。

## 决策
1. **宿主位置**：`#view-host` 作为 **`#log` 的兄弟**（`#panel-main` 内，`flex:1 1 auto`，默认 `hidden`）。
2. **替换规则**：打开 L2 视图 = `#log` 设 `hidden` + `#view-host` 移除 `hidden` + 目标 `[data-l2-view]` 可见（其余视图 `hidden`）；返回 = 反向。**同一时刻只有一个可见主区** → **面板级滚动容器计数 = 1**（`#log` 或视图内部滚动块）。
3. **风险位不被替换**：`#risk-rail` 与 `#l0-statusbar` 是 `body` 直挂分区，**不在 `#panel-main` 内** → 视图替换不影响；门禁断言 L2 打开态下五类风险行可见（祖先闭包无 `hidden` / 无 `[data-l2-view]`）。
4. **≤2 次交互**：`#l0-statusbar`（1）→ 入口面板中的目标入口（2）；门禁逐视图断言步数。
5. **返回复位**：`#log` 恢复可见（**保留其既有滚动位置 / 草稿**，与 v1「设置视图往返保留草稿」同语义）→ `disclosure.restore(snapshot)`（进入前展开态）→ 密度复测回默认档。
6. **焦点管理**：打开时焦点移入视图标题（`tabindex="-1"`），返回后回焦入口项；`Esc` 在视图内等同「← 返回」（不吞宿主页面事件——视图在扩展页内，无宿主问题）。
7. **不做**：不新增面板级滚动容器；不用 `dialog` / `aria-modal`；不改三区文档序。

## 后果
- 满足 FR-V3-047 / 048 / 054 的字面要求；风险位天然不被替换（结构使然）。
- `#log` 在视图打开期间 `hidden` → 需断言「返回后滚动位置与草稿保留」（这是 v1 已验收语义的延续，不算新增负担）。
- v2 抽屉的 `role="dialog"` / `aria-modal` / `aria-haspopup="dialog"` 迁移需台账（ADR-V3-028）。

### ADR-V3-026: 计数从真值派生（单一模块 + 分列 + 双向门禁）

## 状态
ACCEPTED（承父 FR-V3-046 / EC-V3-016）

## 背景
FR-V3-046 要求「计数必须从真值派生（不得硬编码常量），并与真值逐项相等」；EC-V3-016 要求命令目录的实时面与对账基线**分列如实呈现**，不得合并为一个数字掩盖差异。若入口面板与视图标题各自计算，还会产生「两处数字不一致」的低级矛盾。

## 决策
1. **单一派生点**：`l2/counts.ts` 导出纯函数
   `deriveCounts({ treeNodes, commandLive, commandBaseline, auditEntries, settingsSections }) → { tree, commands: { live, baseline }, audit, settings }`；
   入口面板与各视图标题**共用**该结果（**禁止**任何视图自算）。
2. **真值源（唯一，逐项）**：树节点数 = `ownership-tree` 快照节点集合大小；命令目录 = 实时面（`command-catalog` 实时枚举）与对账基线（`catalog-reconcile` 读取的 parity 基线）**分别计数**；审计 = 既有审计条目数；设置 = v1 设置分区集合大小。
3. **硬编码 FAIL 的机器判据**：门禁在同一夹具下 ① 记录计数 → ② 经既有通路改变真值（切换绑定 / 追加审计条目）→ ③ 重读计数并断言「计数变化量 = 真值变化量」；计数不变或不等 → FAIL。
4. **分列不退化**：`commands` 必须是**对象**（`{live, baseline}`）而非单值；`l2-counts.test.ts` 断言：若实现退化为单值 / 取平均 / 只取其中一个 → FAIL；UI 上两个数字各带标签，**差异不合并**。
5. **禁止夸大表述**：不得出现「已全部渲染」「已覆盖全部命令」等措辞（EC-V3-016）；文案门禁扫描。
6. **C4 / 密度无关联**：计数只出现在入口面板与视图标题（L2 层），**不得**为了展示计数在 L0 增加常驻可点（L0 预算固定 7，v3-1）。

## 后果
- 「计数同源」成为可机器双向证明的事实（AC-V3-046 闭合），且分列口径不会被后续实现悄悄合并。
- 命令目录的两个数字（实时面 / 对账基线）长期并存；差异在 UI 与文档中如实呈现（不掩盖）。
- 计数派生是纯函数 → 可 node 单测（不依赖 Chromium）。

### ADR-V3-027: 命令目录逐条有档 + `delay` 消歧单源 + 硬底线零控件 + 零提权 + 9 动作固定序

## 状态
ACCEPTED（承父 FR-V3-049 / 052 / 053 + v2 ADR-V2-027 / 030 / 032）

## 背景
v2 已建立「逐条有档 + clamp 原因 + 硬底线零控件 + `delay`=deny 单源措辞 + 9 动作白名单固定序」。v3 只改**归属**（默认不可见 + 计数入口），不得推翻这些已验收语义（NG-V3-003 / NG-V3-005）。

## 决策
1. **逐条有档**：每条命令呈现 `allow` / `ask` / `deny` + **来源**（`default` / `override` / `clamp`）+ **生效值**；来源与生效值取自 `src/insight/command-catalog.ts` 的只读投影（**不重算策略**）。
2. **硬底线零控件**：硬底线命令（`evaluate` / 未授权 origin / 未知 risk）**零控件 + 原因可读**；`ui` / `state` / `external` 只可收紧 → **无 `allow` 控件**；仅 v2 既有覆盖控件（clamp **仍在 SW 侧强制**）。
3. **`delay` 消歧单源**：措辞常量（复用/扩展 v2 `TREE_NO_ESCALATION_NOTE` 机制）为**唯一来源**，新视图直接消费，**不得**另写；门禁逐字断言。
4. **零提权**：L2 视图内「提权 / 放宽 / 放行」控件计数 = 0（门禁断言）；伪造 `sendMessage` 不能突破 clamp（复用 v2 负向断言，只增不减）。
5. **9 动作白名单（固定序）**：树视图内 9 个动作**逐个 + 顺序**断言；不得增删。
6. **只读投影**：视图内所有策略 / 后果 / 风险徽标均为只读文本 + 徽标 + 图标（三通道），无写入控件。

## 后果
- v2 的安全语义在 v3 新归属下**逐条保留**（可机器核验）。
- 措辞单源避免了「两处文案分叉」的老问题（v2 已出现过森林偏差文案前科）。
- 命令目录的「来源 / 生效值」列使 clamp 可见（但不提供放宽入口）。

### ADR-V3-028: `#tree-fab` / `#tree-drawer` 兼容处置（含取舍登记）

## 状态
ACCEPTED（**含取舍登记**；承 NG-V3-005 不推翻 v2 已验收行为 + 父 ADR-V3-009 id 零重命名）

## 背景
v2 的树入口是 `#tree-fab`（`#panel-main` 内 absolute 悬浮按钮，`aria-haspopup="dialog"`）+ `#tree-drawer`（`role="dialog"` `aria-modal="false"` 覆盖式抽屉）。v3 要求：① 默认首屏 ≤7 可点（FAB 常驻会 +1）；② L2 为视图替换（不是浮层）；③ **不推翻** v2 已验收行为（真层级树 / ARIA / 键盘 / 面包屑 / 9 动作固定序 / 只读投影）。`insight.mjs` 中有大量 `getElementById('tree-fab')` / `#tree-drawer` 的断言。

## 决策
1. **元素与内容全保留**：`#tree-fab` / `#tree-drawer` 两个 id **不改名、不删除**；`#tree-drawer` 的**渲染逻辑与内容**（`tree-view.ts` / `tree-drawer.ts`）零改动。
2. **归属改为 L2 视图主体**：`[data-l2-view="tree"]` 成为树内容的宿主（`#tree-drawer` 元素本身迁入其中，从其 absolute 定位改为文档流内）；`#tree-fab` 默认 `hidden`，在 L2 连接树视图内作为**次级入口**（「展开/筛选」/ 紧凑模式）复用（避免死代码）。
3. **属性迁移（显式台账）**：`role="dialog"` / `aria-modal="false"` / `aria-haspopup="dialog"` **不再适用**于「视图」语义 → 迁移为视图容器语义（`role="region"` + `aria-label`）；该迁移**逐条登记台账**（`insight.mjs` 中相关断言同步改入口路径）。
4. **ARIA / 键盘 / 面包屑 / 9 动作 / 分层控件零改动**（`role=tree/treeitem` + `aria-expanded`/`aria-level` + roving tabindex + `Home/End/方向键` + 面包屑 + 硬底线零控件 / 可覆盖三档）。
5. **默认态预算**：`#tree-fab` `hidden` → 默认态不增加可点（保住 v3-1 的 7）；L2 打开后其可点计入 L2 层（L2 无密度档限制，仅登记）。
6. **取舍登记**：备选方案 B（删 FAB）被否——**删元素**违反零删除纪律且会直接打断 `insight.mjs` 的 `getElementById` 断言链（大面积失败，取代成本远超收益）；备选方案 C（FAB 常驻 + 状态栏入口）被否——默认态 +1 可点直接打破 ≤7 预算。

## 后果
- v2 树的**内容与交互全保留**，只改「入口路径 + 容器语义」→ 取代面从「重写树断言」降为「改入口路径」。
- `role="dialog"` → `role="region"` 的迁移是有意为之（视图替换 vs 覆盖抽屉），必须台账登记，**不得**静默改属性。
- 树在 L2 内成为「视图主体」后，`#tree-fab` 的既有悬浮语义不再对用户可见（默认 `hidden`）→ 属**有意取舍**，已在 §3.2 对比与本节登记。

### ADR-V3-029: 本叶取代策略（取代台账最大战场）

## 状态
ACCEPTED（承父 ADR-V3-007 / ADR-V3-009）

## 背景
本叶是 R-UI-002 的**最大战场**：既有 `insight.mjs`（108 断言，`querySelector` 118 / `getElementById` 42）大量落在树 / 回执 / 确认上；`sidepanel-view.test.ts` 38 用例含 4 项布局契约；`binding.mjs` 亦有 `#tree-*` 相关条目（如 `realClick('#tree-fab')` / `#tree-drawer` / `#tree-receipt`）。纪律 = **零删除、零降级、计数不减**。

## 决策
1. **三类改动的优先级**（从省到贵）：
   - **(a) 入口路径改写**（首选）：断言表达式不变，只把「点 FAB 开抽屉」改为「状态栏 → 入口 → 视图」；括号内断言逐条保持 → 台账登记（`oldId == newId`，reason = 入口路径改写）。
   - **(b) 同编号同义改写**：断言需换测量对象（如抽屉宽度 → 视图宽度）→ 台账登记 + 强度**不降**。
   - **(c) 迁移到 `test/ui/l2.mjs`**：语义确被取代（如 `role="dialog"` 相关）→ 以**等价或更强**断言重写；台账 `newTitle` 必须可定位。
2. **4 项布局契约的增强式迁移**（逐项，父 ADR-V3-007 第 6 条）：三分区文档序 / `body` flex / `#panel-bottom flex:0 0 auto` + `#composer` 末元素 / `#log.empty:not(:has(> *))` **全部保留原断言**（本叶不改这些结构）；`insight.mjs#checkLayout` 的 3 条几何断言由 v3-1 的 `test/ui/l0.mjs` 增强式替代承接（union 计数）。
3. **union 计数补齐**：本叶新增 `test/ui/l2.mjs` 后，台账 `counts.insight.currentRuntime` 更新为 `runtime(insight.mjs) + runtime(l1.mjs) + runtime(l2.mjs)`，并断言 `≥ 108`。
4. **`sidepanel-view.test.ts`**：用例数 **≥38**；4 契约逐项存在替代断言；其余静态断言按新 DOM 契约迁移（逐条台账）；**不得**删用例。
5. **安全断言只增**：新增「L2 零提权控件」「硬底线零控件」「伪造消息不能突破 clamp（复用）」「零明文审计」四条；**不删**任何既有安全断言。
6. **本叶红线**：若某条断言无法在本叶内完成取代 → **必须先缩小本叶范围并显式登记**，**不得**把红灯留给 v3-4（EC-V3-013）。

## 后果
- 取代可逐条追溯（hunk ↔ 台账），且「计数不减」以 union 口径客观兑现。
- 本叶工期风险最高（如实登记于 R33-01），但其工作**可在叶内闭合**（台账 + 新断言同叶完成）。
- 台账成为 v3-4 之前的**稳定基线**（v3-4 只需追加页面侧条目）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V3-3「L2 按需视图」技术方案，ADR-V3-025~029）。**范围**：四类视图（全局连接树 / 命令目录 / 审计 / 设置）默认零占用 + 「计数 + 入口」（状态栏入口面板）+ 视图替换与「← 返回」+ ≤2 次交互 + L2 期间风险位可见 + 返回密度复位 + 命令目录口径**分列**（实时面 / 对账基线）+ `delay`=deny 措辞单源 + 硬底线零控件 + 零提权 + 零明文审计 + 设置项语义复用 + 树 ARIA / 9 动作固定序保留 + **能力集等价 8 项** + **取代台账最大战场的批量登记**。**裁决**：V33-O-1（计数真值源与分列）/ V33-O-2（`#view-host` 与 `#log` 二选一）/ V33-O-3（`#tree-fab`·`#tree-drawer` 保留内容、归属迁 L2、FAB 默认 `hidden`，取舍显式登记）/ V33-O-4（不拆模块；超 ceiling 则本叶内显式重登记）。**不做**：L0 骨架本体、L1 内容、页面侧交互、任何权限 / 判定路径 / 设置语义改动、任何放宽。**只做 plan**：未写 tasks/代码、未改源码与测试、未跑门禁/构建/Chromium、未 commit。 | 2026-09-16 | SDDU Plan Agent |


