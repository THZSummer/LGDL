# 任务分解：specs-tree-v3-3-l2-on-demand-views（V3-3 L2 按需视图：树 / 命令 / 审计 / 设置）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入  
> **前置依赖**: `plan.md`（本叶 v1.0，ADR-V3-025~029）+ 父 `plan.md` v1.0（ADR-V3-001~012）+ 父 `spec.md` v1.0 + 本叶 `spec.md` v1.0  
> **创建人**: SDDU Tasks Agent  
> **创建时间**: 2026-09-16  
> **版本**: v1.0  
> **更新人**: SDDU Tasks Agent  
> **更新时间**: 2026-09-16  
> **更新说明**: 初始创建（本叶 9 任务 / 5 波；含四视图默认零占用、计数从真值派生、`≤2` 次交互、返回复位、能力集等价、取代台账最大战场）

---

## 0. 跨叶定位与执行序（**本文件 = V3-3，4 叶第三环**）

| 项 | 内容 |
|---|---|
| 叶间顺序 | `v3-1` → **`{v3-2, v3-3}`** → `v3-4` |
| 本叶前置 | **v3-1 全门禁绿**（状态栏入口 + 折叠器契约 + 密度门禁/基线 + 取代台账）；与 v3-2 **可并行分解**、**门禁执行严格串行** |
| 本叶定位 | **取代台账最大战场**（`insight.mjs` 树/回执/确认 + `sidepanel-view.test.ts` 4 布局契约 + 可能的 `binding.mjs`）——取代工作**必须在本叶内闭合**（EC-V3-013） |
| 本叶主轴 | 主要为「改归属 + 补计数入口」，**复用**既有 `tree-drawer` / 命令档案 / 审计 / 设置实现（不重写） |
| 本叶收尾要求 | **全门禁绿且严格串行**；**禁止**把红灯留给 v3-4 |
| 门禁纪律 | 一次只跑一个（本机 ~1.5GB、曾 OOM）；日志 `tee` 落盘 `/tmp/opencode/v3-gate-logs/*.log`，**禁 tail 截断** |
| 红线 | 不改 `manifest.json`（零 diff）· 不改 `src/security/**` · 不改 `src/content/**` · 不改 `src/insight/**`（只读复用）· 不改 `packages/web-cli-base/**` · 不改 `options.html`（零 diff）· 不改 `design/**` · 零新增依赖 |

---

## 1. 依赖拓扑总览

### 1.1 任务总览表

| ID | 名称 | 复杂度 | 前置依赖 | 波次 | 类型 |
|----|------|:--:|------|:--:|:--:|
| TASK-301 | 计数真值派生 `l2/counts.ts` + `test/l2-counts.test.ts`（四类计数 + 分列不退化为合并数字） | M | 无 | 1 | implementation |
| TASK-302 | L2 视图宿主 `l2/view-host.ts`（`#log` ↔ `#view-host` 二选一 + 「← 返回」+ 展开态复原 + 焦点管理） | S | 无 | 1 | implementation |
| TASK-303 | 命令目录视图 `l2/command-catalog.ts`（只读投影 + `{live,baseline}` 分列 + `delay` 单源措辞 + 硬底线零控件） | M | 无 | 1 | implementation |
| TASK-304 | 审计视图 `l2/audit.ts`（条目列表 + 零明文字段白名单 + 既有导出出口） | S | 无 | 1 | implementation |
| TASK-305 | **L2 归属迁移与接线**（`index.html` `#view-host` + 4 个 `[data-l2-view]` + `#tree-fab` 默认 `hidden` + `tree-drawer.ts` 归属迁移 + `sidepanel.ts` 入口面板 + `view-model.ts` + `disclosure` 白名单） | L | 301, 302, 303, 304 | 2 | implementation |
| TASK-306 | L2 运行时门禁 `test/ui/l2.mjs`（四视图默认零占用 + ≤2 次 + 计数同源 + 返回复位 + 单滚动 + L2 期间风险位可见 + 树 ARIA/9 动作固定序 + 零提权 + 零明文 + **能力集等价 AC-V3-026**） | M | 305 | 3 | gate |
| TASK-307 | **取代台账最大战场**（`insight.mjs` 批量入口路径改写 + `sidepanel-view.test.ts` **4 契约增强式迁移** + `binding.mjs` 同编号最小改写 + 台账追加 + union 计数更新） | M | 305 | 3 | implementation |
| TASK-308 | 体积守卫核对 + `sidepanel.js` **显式重登记**（本叶最可能触发；披露要求见 §4.3） | S | 306, 307 | 4 | gate |
| TASK-309 | **收口：全门禁绿串行验证 + 密度复位复测 + 人工面如实登记** | M | 308 | 5 | gate |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
Wave 1 ── 无依赖，4 路并行写入（纯函数/纯数据/独立视图模块，文件不相交）
  TASK-301 [M] l2/counts.ts + l2-counts.test.ts        ← 关键路径起点
  TASK-302 [S] l2/view-host.ts                          ← 关键路径起点（视图替换宿主）
  TASK-303 [M] l2/command-catalog.ts
  TASK-304 [S] l2/audit.ts

Wave 2 ── 串行（归属迁移 + 接线；index.html / sidepanel.ts / view-model.ts / tree-drawer.ts 单所有者）
  TASK-305 [L] 4 个 [data-l2-view] + #tree-fab hidden + tree-drawer 归属迁移 + 入口面板接线  （dep 301,302,303,304）

Wave 3 ── 并行组 ①（运行时门禁 ∥ 既有断言取代；文件不相交）
  TASK-306 [M] test/ui/l2.mjs                                  （dep 305）
  TASK-307 [M] insight.mjs + sidepanel-view.test.ts + binding.mjs + 台账  （dep 305）

Wave 4 ── 串行
  TASK-308 [S] 体积核对 / 显式重登记（dep 306,307）

Wave 5 ── 串行收口
  TASK-309 [M] 全门禁绿 + 密度复位复测 + 人工面登记（dep 308）
```

### 1.3 并行分组（执行波次）

| 波次 | 任务 | 并行性 | 必须串行的部分 |
|:--:|------|------|------|
| 1 | 301, 302, 303, 304 | **可并行**（4 文件不相交） | — |
| 2 | 305 | 串行（DOM/接线单所有者） | 本波全部 |
| 3 | 306, 307 | **可并行写入**（新门禁文件 ∥ 既有测试文件） | ⚠️ **门禁执行严格串行**：`test:l2` / `test:ui` / `test:insight` / `test:binding` 一次只跑一个 |
| 4 | 308 | 串行 | 本波全部 |
| 5 | 309 | 串行（单条链式命令） | 本波全部 |

---

## 2. 任务列表

### TASK-301: 计数真值派生 `l2/counts.ts` + `test/l2-counts.test.ts`
> FR-V3-046 的唯一实现源；**硬编码即 FAIL**

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（纯函数） |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-046 / FR-V3-049 · EC-V3-016 · AC-V3-026 · ADR-V3-026 |

**描述**: 新建单一计数模块：`deriveCounts(snapshot, auditEntries, settingsSections)` → 入口面板与视图标题**共用**同一结果。四类计数**全部从真值派生**：① 连接树节点数 = `ownership-tree` 快照节点集合大小；② 命令目录 = **`{live, baseline}` 两个数字分列**（实时面 `command-catalog` 枚举 vs 对账基线 `catalog-reconcile` 读取的 parity 基线）——**禁止**合并为一个数字或复用设计稿 122 当验收值；③ 审计条数 = 既有审计读取通道返回条目数；④ 设置分区数 = 既有 `#settings-*` 分区集合大小。同步新建纯单测，断言「改真值 → 计数变」及「分列不得退化为合并数字」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/counts.ts` |
| NEW | `packages/web-cli-plugin/test/l2-counts.test.ts` |

**验收标准**:
- [ ] 四类计数均有唯一真值源；`counts.commands = { live, baseline }` **两个数字**分别可读
- [ ] 单测：改真值（绑定 origin / 追加会话命令 / 注入审计记录 / 分区集合）→ 计数**变化量与真值变化量相等**
- [ ] 硬编码常量 → 测试 FAIL（判定为硬编码）
- [ ] `l2-counts.test.ts` 断言不得退化为合并数字（显式断言 `'live' in counts.commands ∧ 'baseline' in counts.commands`）
- [ ] 纯函数（node 可测）；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-v33-w1.log
```

---

### TASK-302: L2 视图宿主 `l2/view-host.ts`
> FR-V3-047 / FR-V3-048 的宿主实现；**单一面板级滚动容器**

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无（消费 v3-1 `disclosure` 契约） |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-047 / FR-V3-048 / FR-V3-054 · NFR-V3-011 · AC-V3-021 · ADR-V3-025 |

**描述**: 新建视图宿主：`#view-host` 作为 `#log` 的**兄弟**（`#panel-main` 内）；打开视图时 `#log` 设 `hidden`、`#view-host` 及目标视图可见；顶部「← 返回」。返回时：`#view-host` 隐藏 + `#log` 恢复可见 + `disclosure.restore(snapshot)`（**进入前的展开态复原**）+ 焦点回焦入口项（`tabindex="-1"` 的视图标题接收进入焦点）。**不新增第二个面板级滚动容器**（长内容用视图内局部滚动块）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/view-host.ts` |

**验收标准**:
- [ ] `#log` 与 `#view-host` **互斥可见**（二选一）；打开期间 `#log` `hidden === true`
- [ ] 面板级滚动容器计数 = **1**（长内容用视图内局部滚动块，不引第二个面板级滚动容器）
- [ ] 返回后展开态与进入前**相等**（`disclosure.restore`）；焦点回焦入口项
- [ ] 打开时焦点移入视图标题（`tabindex="-1"`）
- [ ] 焦点管理与 ARIA 成对；无 `chrome.*` 调用；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck 2>&1 | tee /tmp/opencode/v3-gate-logs/typecheck-v33-w1.log
```

---

### TASK-303: 命令目录视图 `l2/command-catalog.ts`
> 「逐条有档 + `delay` 单源措辞 + 硬底线零控件 + 零提权」

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无（`src/insight/**` 只读复用） |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-049 / FR-V3-052 / FR-V3-053 · EC-V3-016 · AC-V3-019 / AC-V3-026 · ADR-V3-027 |

**描述**: 新建命令目录视图：**只读投影** `src/insight/command-catalog.ts`；每条命令呈现 `allow` / `ask` / `deny` + 来源（默认档 / 用户覆盖 / clamp 导致）+ 生效值。**硬底线不可覆盖档零控件 + 原因可读**（v2 语义保留）；`ui` / `state` / `external` **只可收紧（无 allow 控件）**。**`delay` 消歧沿用 v2 单源措辞**（`delay` = `deny`，fail-closed，非可配置档位；与命令间 `delayMs` 无关）——措辞来自**单一常量**（复用/扩展 v2 `TREE_NO_ESCALATION_NOTE` 机制），**不得**另写一份。**分列呈现**：实时面与对账基线**两个数字并列**，各带标签；**禁止**「已全部渲染」类夸大表述；差异**登记**不合并。树内 **9 个动作白名单（固定序）** 保留。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/command-catalog.ts` |

**验收标准**:
- [ ] 逐条有档（`allow`/`ask`/`deny`）+ 来源 + 生效值；硬底线档控件计数 = **0**
- [ ] `delay` 文案取自**单一常量**且与 v2 单源逐字一致（门禁逐字断言）
- [ ] `{live, baseline}` **分列**呈现（各带标签）；无「已全部渲染」类表述
- [ ] 提权 / 放宽控件计数 = **0**；仅 v2 既有覆盖控件（clamp 仍在 SW 侧强制）
- [ ] 9 个树内动作白名单 + **固定序**保留（断言 9 个 + 顺序）
- [ ] 不修改 `src/insight/**`（只读复用）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck 2>&1 | tee /tmp/opencode/v3-gate-logs/typecheck-v33-w1b.log
git diff --numstat -- packages/web-cli-plugin/src/insight/
```

---

### TASK-304: 审计视图 `l2/audit.ts`
> FR-V3-050；**零明文纪律**

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-050 · NFR-V3-016 · AC-V3-019 · ADR-V3-026 |

**描述**: 新建审计视图：条目列表（消费既有审计读取通道）+ **既有导出出口**（`admin_audit-export` 复用）+ **零明文字段白名单**（{命令名, 动作 id, 结果, 耗时, 时间, 审计 id}）+ URL 去参。与 v3-2 回执的「审计出口」形成同一目标（v3-2 指向本视图）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/audit.ts` |

**验收标准**:
- [ ] 条目列表渲染 + 既有导出出口可达
- [ ] 字段白名单严格：白名单外字段不渲染；反例扫描（`apiKey` / 剪贴板正文 / 通知正文 / 书签正文零命中；URL 去参）
- [ ] 静态权限零新增（不申请任何权限）
- [ ] `npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck 2>&1 | tee /tmp/opencode/v3-gate-logs/typecheck-v33-w1c.log
```

---

### TASK-305: **L2 归属迁移与接线**（四视图默认零占用 + `≤2` 次交互 + 返回复位）
> 本叶主任务；ADR-V3-025 / ADR-V3-028 的落地

| 属性 | 值 |
|-----|-----|
| **复杂度** | L |
| **前置依赖** | TASK-301, TASK-302, TASK-303, TASK-304 |
| **执行波次** | Wave 2（**串行**） |
| **对应 FR / AC / ADR** | FR-V3-045 / FR-V3-047 / FR-V3-048 / FR-V3-051 / FR-V3-052 / FR-V3-054 / FR-V3-015 · NFR-V3-006 · EC-V3-005 / EC-V3-014 · AC-V3-005 / AC-V3-010 / AC-V3-021 / AC-V3-026 / AC-V3-027 · ADR-V3-025 · ADR-V3-028 |

**描述**: ① `index.html` **追加** `#view-host` 与四个 `[data-l2-view="tree|commands|audit|settings"]`（**默认 `hidden`**）标记与样式；`#tree-fab` 加 **`hidden`**（默认不再常驻悬浮）；`#settings-view` 归属调整为 `[data-l2-view="settings"]` 的内容宿主。② `src/ui/tree/tree-drawer.ts` **归属迁移**：宿主从「absolute 覆盖式抽屉（`role="dialog"`）」改为「`#view-host > [data-l2-view="tree"]` 内的**视图主体**」——`role="tree"` 内容渲染 / `aria-expanded` / `aria-level` / roving tabindex / 键盘 / 面包屑 / 每层 allow-ask-deny 控件 / **9 动作固定序** **全部保留**（只改归属与 `role="dialog"`/`aria-modal`/`aria-haspopup="dialog"` 迁移，须台账）。③ `sidepanel.ts` 追加 L2 入口面板接线 / 视图替换 / 返回（**既有 handler 零删改**）。④ `view-model.ts` 追加 L2 视图模型（入口面板 + 四视图数据 + 计数）。⑤ `disclosure.ts` 白名单追加 **L2 入口面板 id**（**仍不含** `#risk-rail`）。**入口形态**：`#l0-statusbar`（一行）→ 入口面板（≤4 入口，各带计数）→ 视图替换；**≤2 次交互**（FR-V3-048）。**默认零占用**：四视图内容均在 `hidden` 子树内（可见计数 = 0），**禁止**用 CSS 隐身或移出视口假装不出现。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（`#view-host` + 4 个 `[data-l2-view]` + `#tree-fab` hidden + `#settings-view` 归属） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（入口面板 / 视图替换 / 返回） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts`（L2 视图模型） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts`（仅追加 L2 入口面板 id） |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts`（归属迁移；渲染/ARIA/键盘/面包屑/分层控件零改动） |

**验收标准**:
- [ ] 四类视图内容默认全部在 `hidden` 子树内（可见计数 = 0）；不得 CSS 隐身或移出视口
- [ ] `≤2` 次交互可达（状态栏 1 → 入口 2）；入口面板 **≤4** 个入口且**各带计数**
- [ ] **L2 打开期间 `#risk-rail` 仍可见**（视图替换只发生在 `#panel-main` 内；祖先闭包无 `hidden` / `[data-l2-view]`）
- [ ] **返回复位**：`#view-host` 隐藏 + `#log` 恢复 + 进入前展开态复原 + 密度回默认档
- [ ] 树视图：`role=tree/treeitem` + `aria-expanded`/`aria-level` + 键盘 + 面包屑**全部保留**；**9 动作白名单固定序**断言通过
- [ ] `#tree-fab` 保留 id 与按钮语义但默认 `hidden`；`#tree-drawer` 的 `role`/`aria-*` 迁移**逐条台账登记**
- [ ] 设置视图项集合与 v1 **等价**；`options.html` **零 diff**
- [ ] `#risk-rail` 仍**不在** `disclosure` 白名单；`index.html` 54 id 仍全保留
- [ ] 320px 长路径 / 长命令名 / 面包屑**零水平溢出**

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-v33-w2.log
git diff --numstat -- packages/web-cli-plugin/src/ui/options/index.html
```

---

### TASK-306: L2 运行时门禁 `test/ui/l2.mjs`
> 本叶验收的唯一实跑载体（含 **AC-V3-026 能力集等价**）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-305 |
| **执行波次** | Wave 3 |
| **对应 FR / AC / ADR** | FR-V3-045~054 · NFR-V3-001 / NFR-V3-006 · AC-V3-005 / AC-V3-010 / AC-V3-019 / AC-V3-021 / AC-V3-026 / AC-V3-027 · EC-V3-005 / EC-V3-016 · ADR-V3-025 · ADR-V3-026 · ADR-V3-027 |

**描述**: 新建 L2 Chromium 门禁（`npm run test:l2`）：① 四视图**默认零占用**（可见计数 = 0）；② **≤2 次交互**可达；③ **计数同源**（记录计数 → 经既有通路改真值 → 重读计数断言**变化量相等**；计数不变即判定硬编码 → FAIL）；④ **返回复位**（展开态相等 + 密度回默认档）；⑤ **单滚动容器**（面板级滚动容器计数 = 1）；⑥ **L2 期间风险位可见**（祖先闭包无 `hidden` / `[data-l2-view]`）；⑦ 树 ARIA / 键盘 / 面包屑 / **9 动作固定序**；⑧ **零提权控件** + 伪造 `sendMessage` 不能突破 clamp（复用 v2 负向断言）；⑨ **零明文**扫描（URL 去参；通知/剪贴板/书签正文零命中）；⑩ **能力集等价 AC-V3-026**（命令集合 / 处置档位 / 四维连接树 / 命令目录 `{live,baseline}` 分列 / 审计条目数 / 设置项集合 / 9 动作 / 回执三件套，**逐项等价**，差异必须显式登记）。含 `--files-override` 无关；本叶需密度复位复测（复用 v3-1 `test:density`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/l2.mjs` |
| MODIFY | `packages/web-cli-plugin/package.json`（追加 `test:l2`；`test:v3` 追加） |

**验收标准**:
- [ ] 四视图默认可见计数 = 0；`≤2` 次交互可达断言成立
- [ ] 计数同源双向断言（改真值 → 计数变）；`{live, baseline}` **分列**且各自与真值相等
- [ ] 返回复位：展开态相等 + 密度回默认档（三档 × 三视口）
- [ ] 单滚动容器计数 = 1；L2 期间风险位可见
- [ ] 树 ARIA / 9 动作固定序；零提权控件；伪造 `sendMessage` 仍 FAIL
- [ ] 零明文扫描通过；AC-V3-026 八项逐项等价断言落地
- [ ] 单 Chromium 实例、单 page target；日志全量 `tee` 落盘禁 tail；不触碰既有 4 个 `test/ui/*.mjs`

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:l2 2>&1 | tee /tmp/opencode/v3-gate-logs/l2.log
npm run test:density 2>&1 | tee /tmp/opencode/v3-gate-logs/density-v33.log
```

---

### TASK-307: **取代台账最大战场**（4 契约增强式迁移 + 批量入口路径改写）
> EC-V3-013 的最强约束点；取代工作量**必须在本叶内闭合**

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-305 |
| **执行波次** | Wave 3 |
| **对应 FR / AC / ADR** | FR-V3-004 · NFR-V3-014 · AC-V3-011 / AC-V3-012 · EC-V3-013 · ADR-V3-007（第 6 条增强式替代）· ADR-V3-029 |

**描述**: ① `test/ui/insight.mjs`——树 / 回执 / 确认相关断言的**入口路径改写**（「点 FAB 开抽屉 → 断言抽屉内 X」改为「进入 L2 连接树视图（状态栏 → 入口）→ 断言视图内 X」）；**不能就前置展开的部分逐条台账登记**（`oldId → newId` + `reason`）；既有条目**零删除**。② `test/sidepanel-view.test.ts`——**4 项布局契约逐项迁移为等价或更强的替代断言（不得删除契约）**；逐条 `old→new` 台账。**增强式替代映射**（父 ADR-V3-007 第 6 条）：三分区文档序 / `body{display:flex;overflow:hidden}` / `#log.empty:not(:has(> *))` **保留零 diff**；`#panel-bottom{flex:0 0 auto}` + `#composer` 末元素**保留** + **新增**兜底展开态 `#composer` 贴底（`gap ∈ [0,+12]`）且不与常驻区交叠；`insight.mjs#checkLayout` 的 3 条几何断言由 `test/ui/l0.mjs`（v3-1）的「互不遮挡 + 唯一滚动 + 展开态贴底」承接（union 口径）。③ `test/ui/binding.mjs`——若 `#tree-*` 相关条目必须改 → **同编号最小改写** + 台账；`#21*`/`#22*` 区域**字节零改**。④ `docs/v3-supersession-ledger.json` **追加**本叶 `entries[]`（**最大批量**）+ 更新 `counts.insight.currentRuntime`（含 `l2.mjs`）与 `counts.sidepanelView`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs` |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs`（**仅必要时**；`#21*`/`#22*` 字节零改） |
| MODIFY | `packages/web-cli-plugin/docs/v3-supersession-ledger.json`（仅追加 `entries[]` + 更新 counts） |

**验收标准**:
- [ ] `sidepanel-view.test.ts` **4 项布局契约逐项仍被断言**（等价或更强）；用例数 **≥38**
- [ ] `insight.mjs` 既有条目**零删除**；入口路径改写逐条台账登记
- [ ] `binding.mjs` 的 `#21*`/`#22*` 区段字节 hash **不变**；断言计数 ≥192
- [ ] 台账**只追加**（schema 未改、他叶条目未改）；本叶 hunk **全部命中**（`npm run test:supersession` 通过）
- [ ] union 口径计数 ≥108（含 `l1.mjs` + `l2.mjs`）
- [ ] **不得**因「DOM 变了」删除任何契约；**不得**弱化既有断言

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:supersession 2>&1 | tee /tmp/opencode/v3-gate-logs/supersession-v33.log
git diff --numstat -- test/sidepanel-view.test.ts test/ui/insight.mjs test/ui/binding.mjs
```

---

### TASK-308: 体积守卫核对 + `sidepanel.js` **显式重登记**
> **本叶最可能触发**（ADR-V3-011 第 5 条：同叶内完成，不得留给下一叶）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-306, TASK-307 |
| **执行波次** | Wave 4 |
| **对应 FR / AC / ADR** | NFR-V3-005 · AC-V3-015 / AC-V3-016 · EC-V3-012 · ADR-V3-011 · ADR-V3-029 |

**描述**: 跑 `npm run build` 后核对：`dist/content.js` ≤ **177,076 B**（无容差；本叶零改动，仅复核）；`dist/sidepanel.js` ≤ ceiling **279,825 B**（基线 266,500，容差 5%）。本叶预估 `+4~6 KB`，但因是**取代最大战场**，**最可能触发**重登记。若触发，**在本叶内**完成（不得留给 v3-4）：`SIDEPANEL_BASELINE_BYTES` 更新为新实测值；旧值**必须**加入 `SIDEPANEL_BASELINE_BYTES_HISTORY`；`SIDEPANEL_BASELINE_META` 补全 `measuredOn` / `source` / `buildCommand` / `measuredBy`（`v3-3 + 轮次`）/ `previousBaselineBytes` / `previousCeilingBytes` / `direction`（`raised` 时写明**有意增重的功能理由**）/ `reRegisteredFrom`；**容差 5% 不变**；`targetBudgetBytes` / `targetMet` **保持 `null`**；**断言零删减**；反证（+1 B → FAIL）在**新值上重新驱动**并留日志。若未超 → 零改动并登记「未触发」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` |

**验收标准**:
- [ ] `content.js` ≤ 177,076 B；`CONTENT_SOURCE_SHA256` 三项 pin 不变
- [ ] `sidepanel.js` 实测值与 ceiling 比较结果如实记录（本叶预计触发）
- [ ] 触发时五要素齐备（前后值 + 日期 + 来源 + 理由 + `_HISTORY` 历史保留）；`_META` 8 字段补全
- [ ] 容差 5% 不变；`targetBudgetBytes` / `targetMet` 保持 `null`；断言零删减
- [ ] 反证（+1 B → FAIL）在新值上**重新驱动**并留完整日志
- [ ] 本叶内完成（EC-V3-013）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && node -e "const fs=require('fs');const c=fs.statSync('dist/content.js').size,s=fs.statSync('dist/sidepanel.js').size;console.log({content:c,sidepanel:s});if(c>177076)process.exit(1);if(s>279825)console.error('CEILING EXCEEDED -> 走显式重登记');" | tee /tmp/opencode/v3-gate-logs/size-v33.log
```

---

### TASK-309: **收口：全门禁绿串行验证 + 密度复位复测 + 人工面如实登记**
> AC-V3-013 / NFR-V3-015

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-308 |
| **执行波次** | Wave 5（串行收口） |
| **对应 FR / AC / ADR** | FR-V3-003 / FR-V3-086 / FR-V3-087 · NFR-V3-012 / NFR-V3-014 / NFR-V3-015 · AC-V3-013 / AC-V3-024 / AC-V3-025 / AC-V3-027 · EC-V3-013 · ADR-V3-010 |

**描述**: 严格串行跑完本叶全部门禁（一次只跑一个，`&&` 串联，日志全量 `tee` 落盘）。**特定项**：L2 往返后**密度复位复测**必须回默认档（三档 × 三视口，复用 v3-1 门禁与基线）。另：① 零改动核对（`manifest.json` / `src/security/**` / `src/content/**` 三 hash / `src/insight/**` / `packages/web-cli-base/**` / `options.html` / `design/**` 零 diff）；② **人工面如实登记为「未执行」**（树逐层展开观感 / 窄栏长路径 / 键盘体感 / 明暗观感），**不得冒充 PASS**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `/tmp/opencode/v3-gate-logs/*.log`（证据，不入版本库） |

**验收标准**:
- [ ] 全门禁绿（§4.1 顺序，逐条串行）；日志完整落盘、禁 tail 截断
- [ ] 断言计数 ≥ 下界：journey ≥167 / insight union ≥108（含 l1 + l2）/ binding ≥192 / `sidepanel-view` **≥38（含 4 契约）** / node ≥646
- [ ] L2 往返后密度复位复测 = 默认档阈值
- [ ] 零改动核对全部通过（7 类文件零 diff）
- [ ] 人工面逐项标注「未执行 / PASS」
- [ ] **无红灯遗漏**给 v3-4

**验证命令**:
```bash
cd packages/web-cli-plugin && bash -c '
set -e
run(){ echo "=== $1 ==="; eval "$2" 2>&1 | tee /tmp/opencode/v3-gate-logs/$1.log; }
run typecheck "npm run typecheck"
run build "npm run build"
run npm-test "npm test"
run supersession "npm run test:supersession"
run l2 "npm run test:l2"
run density "npm run test:density"
run ui "npm run test:ui"
run insight "npm run test:insight"
run binding "npm run test:binding"
run hardening "npm run test:hardening"
run e2e "npm run test:e2e"
echo ALL-GREEN
'
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **9** |
| S 级 (简单) | 3（302 / 304 / 308） |
| M 级 (中等) | 5（301 / 303 / 306 / 307 / 309） |
| L 级 (复杂) | 1（305） |
| 执行波次 | **5** |

### 3.1 需求条目 → 任务映射

| 需求 | 承载任务 |
|------|---------|
| FR-V3-045（四视图默认一个都不出现） | TASK-305 / 306 |
| FR-V3-046（计数从真值派生） | TASK-301 / 306 |
| FR-V3-047（视图替换 / 单滚动 / 返回复位） | TASK-302 / 305 / 306 |
| FR-V3-048（≤2 次交互 + L2 期间风险位可见） | TASK-305 / 306 |
| FR-V3-049（命令目录逐条有档 + delay 单源 + 硬底线零控件） | TASK-303 / 306 |
| FR-V3-050（审计零明文） | TASK-304 / 306 |
| FR-V3-051（设置项等价 + `options.html` 零 diff） | TASK-305 / 306 |
| FR-V3-052（树 ARIA / 键盘 / 面包屑 / 9 动作固定序） | TASK-305 / 306 |
| FR-V3-053（零提权 + clamp 在 SW 侧） | TASK-303 / 306 |
| FR-V3-054（返回后密度复位） | TASK-305 / 306 / 309 |
| NFR-V3-005（体积，本叶最可能触发重登记） | TASK-308 |
| NFR-V3-006（manifest 零新增） | TASK-309 |
| NFR-V3-012 / 013 / 014（串行 / 能真 FAIL / 计数不减） | TASK-306 / 307 / 309 |
| AC-V3-026（能力集等价 8 项） | TASK-306 |
| AC-V3-011 / 012 / 013（台账 / 计数 / 全绿） | TASK-307 / 309 |
| AC-V3-027（不做项守卫） | TASK-305 / 309 |

### 3.2 交付门槛矩阵（本叶）

| 门禁 | 命令 | 承载任务 | 断言要点 |
|------|------|:--:|------|
| 类型 | `npm run typecheck` | 301~305 | 0 error |
| 单测 | `npm test`（含 `l2-counts.test.ts`） | 301 | 计数同源 + 分列不退化 |
| L2（Chromium） | `npm run test:l2` | 306 | 零占用 / ≤2 次 / 计数同源 / 返回复位 / 单滚动 / 风险位可见 / ARIA / 9 动作 / 零提权 / 零明文 / 能力集等价 |
| 密度（复用） | `npm run test:density` | 306 / 309 | 返回后密度复位默认档 |
| 台账 | `npm run test:supersession` | 307 | 本叶 hunk（批量）全命中；union ≥108；`protectedRanges` hash 不变 |
| 静态契约 | `npm test`（`sidepanel-view.test.ts`） | 307 | 用例 ≥38；**4 契约逐项被断言** |
| 既有三门禁 | `test:ui` / `test:insight` / `test:binding` / `test:hardening` | 309 | ≥167 / union ≥108 / ≥192 / 24 |
| 端到端 | `npm run test:e2e` | 309 | PASS |
| 体积 | `size-baseline` | 308 | `content.js` ≤177,076；`sidepanel.js` ≤ceiling（最可能触发重登记） |

### 3.3 断言只增不减（具体保证方式）

| 保证 | 方式 |
|------|------|
| 新断言落**新文件** | `test/ui/l2.mjs` / `test/l2-counts.test.ts` |
| 既有门禁零删除 | `insight.mjs` 入口路径改写逐条台账；`sidepanel-view.test.ts` 4 契约**增强式替代**（不删契约） |
| 受保护区段 | `binding.mjs` 的 `#21*`/`#22*` 用**字节区间 hash** pin |
| 计数下界 | journey ≥167 / insight union ≥108 / binding ≥192 / sidepanelView ≥38 / node ≥646 |
| 安全断言 | 零提权控件 + 伪造 `sendMessage` 不能突破 clamp + 零明文（只增） |

---

## 4. 执行策略

### 4.1 门禁串行纪律（**一次只跑一个**）

> 本机 ~1.5GB、曾 OOM（R3-10 / R33-10）。**任何两个 Chromium 门禁绝不并发**；日志 `tee` 到 `/tmp/opencode/v3-gate-logs/<gate>.log`，**禁 tail 截断**。

**严格串行顺序**：

```
① npm run typecheck
② npm run build
③ npm test                            ← Node 单测（含 l2-counts.test.ts + sidepanel-view.test.ts）
④ npm run test:supersession
⑤ npm run test:l2                     ← Chromium（L2 门禁，含能力集等价）
⑥ npm run test:density                ← Chromium（L2 往返后密度复位复测）
⑦ npm run test:ui                     ← Chromium（journey ≥167）
⑧ npm run test:insight                ← Chromium（union ≥108）
⑨ npm run test:binding                ← Chromium（≥192）
⑩ npm run test:hardening              ← Chromium（24）
⑪ npm run test:e2e                    ← Chromium（全链路）
⑫ 体积守卫核对（本叶最可能触发重登记 + 反证复跑）
⑬ 零改动核对
```

### 4.2 文件所有权（防并行冲突）

| 文件 | 唯一所有者（本叶） |
|------|------|
| `src/ui/sidepanel/l2/counts.ts` + `test/l2-counts.test.ts` | TASK-301 |
| `src/ui/sidepanel/l2/view-host.ts` | TASK-302 |
| `src/ui/sidepanel/l2/command-catalog.ts` | TASK-303 |
| `src/ui/sidepanel/l2/audit.ts` | TASK-304 |
| `src/ui/sidepanel/index.html` / `sidepanel.ts` / `view-model.ts` / `disclosure.ts` / `src/ui/tree/tree-drawer.ts` | TASK-305（Wave 2 独占） |
| `test/ui/l2.mjs` + `package.json`（scripts） | TASK-306 |
| `test/ui/insight.mjs` / `test/sidepanel-view.test.ts` / `test/ui/binding.mjs` / `docs/v3-supersession-ledger.json` | TASK-307 |
| `test/size-baseline.ts` | TASK-308 |

### 4.3 体积 / 取代 / 归属纪律

1. **`content.js` 无容差不可重登记**：本叶不碰 `src/content/**`。
2. **`sidepanel.js` 重登记（本叶最可能触发）**：TASK-308 的 5 条披露要求（前后值 / 日期 / 来源 / 理由 / 历史保留 + 容差 5% 不变 + `null` 保持 + 断言零删减 + 反证复跑），**禁止**放宽容差。
3. **4 契约不得删除**：`sidepanel-view.test.ts` 的 4 项布局契约**逐项**迁移为等价或更强断言（父 ADR-V3-007 第 6 条），`newTitle` 必须可定位。
4. **`#tree-fab` 保留 id 但默认 `hidden`**：v2 已验收内容 / ARIA / 键盘 / 面包屑 / 9 动作固定序**全保留**，仅改归属（ADR-V3-028 含取舍登记）。
5. **台账只追加**：本叶为**最大批量**，但 schema 与他叶条目不动。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V3-3 任务分解（9 任务 / 5 波；S×3 / M×5 / L×1）。**覆盖编排器必含项**：①四个 L2 视图**默认零占用**（只有「计数 + 入口」，计数从**真值派生**，硬编码即 FAIL）；②**≤2 次交互**可达 + 「← 返回」（返回后展开态与密度复位）；③L2 打开期间**风险位仍常驻可见**；④命令目录 `{live, baseline}` **分列** + `delay`=deny 单源措辞 + 硬底线零控件 + 9 动作固定序；⑤审计零明文；⑥设置项等价且 `options.html` 零 diff；⑦**AC-V3-026 能力集等价 8 项**；⑧取代台账**最大战场**（`insight.mjs` 批量入口路径改写 + `sidepanel-view.test.ts` **4 契约增强式迁移**）在本叶内闭合。**门禁严格串行**（13 步链式，一次一个）。**只做 tasks**：未写代码、未改 `src/**`·`test/**`·`manifest.json`·`design/**`·`ROADMAP.md`、未动 `main`、未 commit、**未跑门禁/构建/Chromium**。 | 2026-09-16 | SDDU Tasks Agent |
