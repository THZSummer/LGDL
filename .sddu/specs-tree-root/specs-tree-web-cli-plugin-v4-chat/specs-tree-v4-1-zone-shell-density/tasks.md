# 任务分解：specs-tree-v4-1-zone-shell-density（V4-1 三区骨架与密度重定标）

> **文档定位**: SDDU 任务清单 — 本叶 15 个原子任务（TASK-501~515 / 叶内别名 V41-01~15）；**权威跨叶契约见父 `../plan.md` + 父 `../tasks.md`**
> **前置依赖**: 本叶 `plan.md` v1.0（ADR-V4-017~023）+ 父 `plan.md` v1.0（ADR-V4-001~016）+ 本叶/父 `spec.md` v1.0 + `discovery.md` v1.0
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-18
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-18
> **更新说明**: 初始创建（15 任务 / 8 波；**第一任务 = S 级 spike 闸门**；门禁集合按 ADR-V4-011 第 2 条**增补 l0/l1/l2**；含 D-005 测试守恒账）

## 0. 红线与纪律（本叶）

| # | 红线 | 守线任务 |
|---|------|---------|
| 1 | **spike 闸门**：TASK-501 任一格 < 65.0% ⇒ **停工上报编排器**，TASK-502~515 全部冻结 | TASK-501 |
| 2 | `#log` → `#stream` 是**唯一** id 重命名；其余 108 个 id 零重命名 | TASK-503 |
| 3 | 工具栏可点 == **5**（只读摘要不计 + 4 入口 + 主题）；静默第 6 个可点 ⇒ FAIL | TASK-504 |
| 4 | `DENSITY_EXCLUDED_SUBTREES` **单源**（`density-scope.ts`）+ 门禁字面量再断言；`#stream` 子树零 `[data-chrome-control]` | TASK-502 / TASK-511 |
| 5 | 容忍边界**只认 `hidden`**；CSS 隐身不豁免（RP-V4-04） | TASK-502 / TASK-511 |
| 6 | journey 保护段 `42766..54004` **禁静默改写**（八步 + old→new 台账） | TASK-513 |
| 7 | `content.js` 177,076（无容差）/ `pick-layer.js` 33,900 / `KIND_SET` 零 diff / manifest 零 diff | TASK-515 |
| 8 | `PENDING_ABSOLUTE_CAP` 本叶**保持 `resolved:false` 且不预填** | TASK-515 |
| 9 | 门禁**严格串行**（一次一个 Chromium）；日志落盘 `/tmp/opencode/v4-gate-logs/v4-1/`，**禁 tail 截断** | TASK-515 |
| 10 | 占位宿主必须带 `data-transitional-host`（本叶**只建不销**；销在 v4-3/v4-4；v4-4 收口断言计数 = 0） | TASK-503 |

## 1. 依赖拓扑总览

```
Wave 1 ── (无依赖；**闸门**)
  TASK-501 [S] 三宽度 × 双主题 × 风险 chips 展开态 12 格实测（流区 ≥65% 可达性）  ← 未过 ⇒ 全部冻结

Wave 2 ── (依赖 501 通过)
  TASK-502 [M] 密度口径单源与判定器扩展（density-scope.ts + density-metrics.mjs + 静态门禁）
  TASK-503 [L] index.html 三区骨架 + 归属迁移 + 占位宿主（唯一 id 重命名 #log→#stream）

Wave 3 ── (依赖 503 的 DOM 契约)
  TASK-504 [M] toolbar.ts + theme.ts（4 入口计数徽标 + 只读摘要 + 主题三态 + 置换登记）
  TASK-505 [M] statusbar.ts + l0/risk-rail.ts chip 形态 + J1~J4 永不折叠判据
  TASK-506 [M] l0/shell.ts + l0/status-bar.ts 重写 + disclosure.ts 重定标 + l2/view-host.ts 绑定迁移

Wave 4 ── (依赖 504/505/506)
  TASK-507 [M] sidepanel.ts + view-model.ts 三区接线与 #log→#stream 选择器迁移 + 法四骨架层核验

Wave 5 ── (门禁重定标；写入可并行，运行严格串行)
  TASK-508 [M] test/ui/l0.mjs 整文件重写（≥164 只增）
  TASK-509 [M] test/ui/l1.mjs 入口机制重写（≥103 只增）
  TASK-510 [M] test/ui/l2.mjs 入口迁移（≥71 只增）+ test/sidepanel-view.test.ts 4 契约等价改写（≥38）
  TASK-511 [L] test/ui/density.mjs 换口径 + 31 格 + 阶段 F → v4 基线 + in-gate RP-V4-01~07（≥127）

Wave 6 ── (实测登记与保护段)
  TASK-512 [M] docs/v4-density-baseline.json/.md 首轮实测登记 + designCaliber 分列 + streamRatioSpike
  TASK-513 [L] test/ui/journey.mjs 保护段八步 + 新 pin + redlineRemap（≥167）

Wave 7 ── (台账与元门禁)
  TASK-514 [M] v4 取代台账新建 + 双台账判定 + gate-integrity 追加 + design-contract.test.ts（shim 60 门禁化）

Wave 8 ── (收口)
  TASK-515 [L] 全门禁串行（含 test:l0/l1/l2）+ RP-V4-01~08 反证实跑 + 五要素中间重登记
```

## 2. 任务列表

### TASK-501（V41-01）: **≥65% 流区占比可达性 12 格 spike（闸门，不可跳过/不可后置）**
| 属性 | 值 |
|------|-----|
| **复杂度** | S（spike 型；不写生产代码） |
| **前置依赖** | 无（**本叶第一任务**） |
| **执行波次** | 1 |
| **对应 FR / AC** | FR-CHAT-082 · AC-CHAT-017 |
| **ADR / 风险** | ADR-V4-016 · ADR-V4-023 第 4 条 · 父 spec §12 裁决 7 · R41-03 / R4-01 |

**描述**: 在临时目录（**不入版本库**）用三区骨架原型做 12 格实测：`3 宽度（320/400/520，视口高 900）× 2 主题（明/暗）× 2 风险态（无风险 / `#risk-detail` 详情展开）`，逐格测 `#region-stream.getBoundingClientRect().height / window.innerHeight`；同时记录 `#region-toolbar` / `#region-statusbar` / `#scroll-bottom` 的占用高度与归因。测量载体二选一并记录 sha256：① 本叶临时原型 `/tmp/opencode/v4-spike/`（最小三区骨架）② 设计稿 `design/ui-redesign/option-f-chat-stream.html`。**测量前不得改任何生产文件**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW（**临时，不入版本库**） | `/tmp/opencode/v4-spike/`（原型 + spike 脚本） |
| NEW（**临时，不入版本库**） | `/tmp/opencode/v4-gate-logs/v4-1/spike-stream-ratio.log` |
| MODIFY（Wave 6 落登记） | `packages/web-cli-plugin/docs/v4-density-baseline.json#streamRatioSpike` · `docs/v4-supersession-ledger.json#entries[id=V41-SPIKE-401]` |

**验收标准**:
- [ ] 12 格实测表齐备（每格含载体 sha256、主题、宽度、风险态、`streamRatio`、工具栏/状态栏/chips 详情占用 px、最差格标记）
- [ ] **12 格全部 ≥ 0.650** ⇒ PASS，且 spike 结论**先于** TASK-513 的 `#15b` 落断言（`≥65.0%`）与 Wave 2 开工
- [ ] **任一格 < 0.650 ⇒ 立即停工上报编排器**：TASK-502~515 全部冻结、不得开工下游叶；上报附 ① 12 格实测表 ② 占用归因 ③ 两个可选项（A 显式取代该红线并登记 old→new + 理由；B 参数微调：状态栏压单行 / chips 详情默认不占位），由编排器裁决
- [ ] 明令禁止项逐条自证未发生：① 静默下调阈值 ② 用「内容高度」替代 rect 高度 ③ 删除该断言 ④ 把 `#region-stream` 之外元素算入分子 ⑤ 把 spike 后置到实现之后
- [ ] `git status` 干净（spike 产物全部在 `/tmp`，零版本库改动）；日志全量落盘（禁 tail 截断）

**验证命令**:
```bash
mkdir -p /tmp/opencode/v4-gate-logs/v4-1 && node /tmp/opencode/v4-spike/spike-stream-ratio.mjs 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/spike-stream-ratio.log
git diff --numstat -- packages/web-cli-plugin/src packages/web-cli-plugin/dist packages/web-cli-plugin/test
```

### TASK-502（V41-02）: 密度口径单源与判定器扩展
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-501 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-070 / 071 / 072 / 075 · AC-CHAT-009 |
| **ADR / 风险** | ADR-V4-020 · ADR-V4-006/007 · R41-04 / R4-03 |

**描述**: 新建 `density-scope.ts`（**豁免子树唯一声明点** + 三区外壳常量 + 四个防滥用常量 + `assertChromeNotInStream()`）；扩展 `density-metrics.mjs`（**从该文件导入**排除子树 + 新增 `excludedRoot(el)` 祖先链跳过 + `DENSITY_SHELL_ROOTS` + `evaluateCardBudget()` / `evaluateFirstScreen()`）；扩展 `test/density-thresholds.test.ts`（`DENSITY_EXCLUDED_SUBTREES` 字面量再断言 + 工具栏 ≤5 静态断言 + S1 归属互斥 + 旧 v3 基线 schema 保真**保留**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/density-scope.ts` |
| MODIFY | `packages/web-cli-plugin/test/ui/density-metrics.mjs`（+ `.d.mts`） |
| MODIFY | `packages/web-cli-plugin/test/density-thresholds.test.ts` |

**验收标准**:
- [ ] `DENSITY_EXCLUDED_SUBTREES` 只在 `density-scope.ts` 声明；门禁内**再断言**其字面量 == `['#stream']`（另写一处 ⇒ 反证 FAIL）
- [ ] `BANNED_MEASURE_APIS` 零命中；预算口径内 `visibleIn` 唯一且**只判 `hidden`**
- [ ] `assertChromeNotInStream()` 断言：`#stream` 子树零 `[data-chrome-control]` ∧ `#region-toolbar`/`#region-statusbar` 非 `#stream` 后代
- [ ] 四个常量齐备：`MAX_CLICKABLES_PER_CARD=6` / `MAX_FIRST_SCREEN_CARDS=2` / `MAX_WELCOME_CARDS=1` / `MAX_WELCOME_LINES=8`；`evaluateFirstScreen` **只对 default 档**生效
- [ ] `test/density-thresholds.test.ts` 用例数**只增**；`docs/v3-density-baseline.json` 的 schema 保真断言**逐字保留**

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/node.log
```

### TASK-503（V41-03）: `index.html` 三区骨架 + 归属迁移 + 占位宿主
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-501 |
| **执行波次** | 2 |
| **对应 FR / AC** | FR-CHAT-010 / 011 / 012 / 013 / 016 / 017 · AC-CHAT-004 / 006 / 008 |
| **ADR / 风险** | ADR-V4-017 / 018 / 019 · ADR-V4-005 · R41-01 / R4-02 / R4-18 |

**描述**: 按父 ADR-V4-005 迁移总表落地：`header#region-toolbar`（`.site-summary` 只读 + 4 个 `#l2-entry-*` + `#theme-toggle`）→ `main#region-stream > ol#stream[role=log]` + `#view-host` + `#scroll-bottom` → `footer#region-statusbar`（`#statusbar-text` + 嵌套 `#risk-chips > #risk-rail` + `#risk-detail`）；`#topbar` 15 个管理 id 迁入 `#settings-view`「站点与授权」分区；被取代容器同构迁入 `#stream` 内 `<li data-transitional-host="v4-3|v4-4">`（id/类名/ARIA 对全保留）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` |

**验收标准**:
- [ ] 三区文档序 = `#region-toolbar` → `#region-stream` → `#region-statusbar`，且**三区为 `body` 直挂**（状态栏**不是** `#region-stream` 后代 ⇒ S7 结构成立）
- [ ] `#log` → `ol#stream[role=log]` 是**唯一** id 重命名；其余 id **零重命名**（含 `#risk-rail` 保留为内层容器、`#l2-entry-*`、`#ask*`/`#confirm*`/`#l1-*`）
- [ ] 工具栏可点**恰 5**（只读 `.site-summary` 不计 + 4 入口 + 主题）；`#region-toolbar`/`#region-statusbar` 内零 `[data-msg-type="askuser"|"auth"|"nextstep"]`（法一）
- [ ] 全部占位宿主带 `data-transitional-host="v4-3"` 或 `"v4-4"`；本叶**不销**（销在 TASK-707 / TASK-812）
- [ ] 红线零 diff：`manifest.json` / `src/content/**` / `src/background/messaging.ts` / `src/security/**`

**验证命令**:
```bash
git diff --numstat -- packages/web-cli-plugin/manifest.json packages/web-cli-plugin/src/content packages/web-cli-plugin/src/security packages/web-cli-plugin/src/background/messaging.ts
node -e "const h=require('fs').readFileSync('packages/web-cli-plugin/src/ui/sidepanel/index.html','utf8');const n=(h.match(/data-transitional-host=/g)||[]).length;if(n<1)throw new Error('no transitional host');console.log('transitional hosts:',n)"
```

### TASK-504（V41-04）: `toolbar.ts` + `theme.ts`（准入 ≤5 + 计数徽标同源 + 主题三态）
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-503 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-011 / 015 / 016 · AC-CHAT-008 · NFR-CHAT-004/008 |
| **ADR / 风险** | ADR-V4-018 · ADR-V4-022 · EC-CHAT-014 · R41-07 / R4-10 |

**描述**: 工具栏渲染（4 入口 `.badge` 用 `l2/counts.ts#deriveCounts()` **同一单源**，不新建计数实现；`.site-summary` 只读 `role=status`）+ 主题三态（`auto → light → dark → auto`；`documentElement[data-theme]`；`web-cli/theme` 用**已有** `storage` 权限；读写失败降级 `auto` 且不阻断界面）+ 准入/置换登记（`toolbarAdmissions[]`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/toolbar.ts` |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/theme.ts` |
| MODIFY | `packages/web-cli-plugin/test/density-thresholds.test.ts`（`data-toolbar-slot` ∈ {view,theme} 断言） |

**验收标准**:
- [ ] 工具栏可点计数 == 5；每项带 `data-toolbar-slot ∈ {view,theme}`；`.site-summary` 非 `button`/`a`/`input`
- [ ] 4 入口徽标数值与视图标题计数**同源**（`l2EntryCount()`），`l2/counts.ts` **零改动**
- [ ] `aria-expanded`/`aria-controls` per-target 配对（`#l2-entry-settings` → `#settings-view`；其余 → `#view-host`）
- [ ] 主题三态：读/写 storage 失败 ⇒ 降级 `auto` 且主流程不阻断；当前态不靠颜色单通道（`data-theme-state` + `aria-pressed`）
- [ ] 满额 5 时新增必须显式置换并登记 `{added, removed, reason, date, leaf}`（禁静默第 6 个）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/node.log
```

### TASK-505（V41-05）: `statusbar.ts` + `l0/risk-rail.ts` chip 形态与 J1~J4 永不折叠判据
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-503 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-004 / 013 / 017 · AC-CHAT-007 |
| **ADR / 风险** | ADR-V4-019 · S6/S7 · R41-05 / R4-04 |

**描述**: 状态栏渲染（连接状态一行 + `#risk-chips` 外层容器 + `#risk-rail` 内层 chip 行 + `#risk-detail` 默认 `hidden`）；`l0/risk-rail.ts` 行模板 → chip 模板（文字 + 徽标 + 图标**三通道**，空文本抛错），写入目标保持 `#risk-rail`（**探针/归属判据零逻辑改动**）；chip 点击 → 展开详情 + `scrollIntoView` 到流内 `li[data-card-key]` + 披露语「本阶段不发命令、不改授权」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/statusbar.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l0/risk-rail.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts`（`NEVER_FOLDABLE` 扩展 + `assertFoldable` 抛错保留） |

**验收标准**:
- [ ] J1 `#region-statusbar` 本体 `hidden !== true`；J2 任一类风险 ⇒ `#risk-chips` 无 `hidden` ∧ `#risk-rail` ≥1 可见 chip；零风险 ⇒ 收缩一行 0 可点 chip
- [ ] J3 chip 祖先闭包无 `hidden` 元素 / 无折叠容器 / 无 `[aria-expanded]` 触发器；J4 打开任意视图后 chips 仍可见
- [ ] chip 计入状态栏 C1（`button`）；`#risk-detail` 默认 `hidden` ⇒ **不计入**默认密度
- [ ] `isRiskClassSource` / `riskVisibilityProbeSource` 的选择器（`#risk-rail` / `.risk-row[data-risk-class]`）**零改动**
- [ ] `assertFoldable('#region-statusbar')` **必须抛错**（负向断言）

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && npm test --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/node.log
```

### TASK-506（V41-06）: `l0/shell.ts` + `l0/status-bar.ts` 重写 + `disclosure.ts` 重定标 + `l2/view-host.ts` 绑定迁移
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-503 |
| **执行波次** | 3 |
| **对应 FR / AC** | FR-CHAT-014 / 015 / 016 · AC-CHAT-005 / 006 / 007 |
| **ADR / 风险** | ADR-V4-017 / 019 / 022 · R41-01 |

**描述**: `l0/shell.ts` 重写为三区外壳（`#l0-decision` 决策卡挂载迁入流内占位宿主）；`l0/status-bar.ts` 写入目标改为工具栏 4 入口 + `.site-summary` 摘要；`l2/view-host.ts` 只改绑定（`#log`→`#stream`）与返回回焦（`#l2-entry-*`）；管理操作入口落 `#settings-view`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l0/shell.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l0/status-bar.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l2/view-host.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` |

**验收标准**:
- [ ] `#stream` ↔ `#view-host` 互斥：打开视图 ⇒ `#stream.hidden = true` ∧ 恰一个 `[data-l2-view]` 可见 ∧ 焦点入 `#l2-title`；返回 ⇒ 复原 + 回焦工具栏入口
- [ ] `l2/counts.ts` **零改动**；`syncTriggerAria()` 的 per-target 语义不回退
- [ ] `COLLAPSIBLE_TARGETS` 移除退役目标（`topbar`/`l1-*`）且**不新增**对 `#stream` 子树的折叠（风险位/流本体不可折叠）
- [ ] 法四骨架层核验：默认屏 `#region-toolbar`/`#region-statusbar`/`#stream` 内无可见常驻输入框；`#composer` 存在时 `hidden === true`

**验证命令**:
```bash
npm run typecheck --workspace @lgdl/web-cli-plugin && git diff --stat -- packages/web-cli-plugin/src/ui/sidepanel/l2/counts.ts
```

### TASK-507（V41-07）: `sidepanel.ts` + `view-model.ts` 三区接线与选择器迁移
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-504 / TASK-505 / TASK-506 |
| **执行波次** | 4 |
| **对应 FR / AC** | FR-CHAT-014 / 010 · AC-CHAT-007 |
| **ADR / 风险** | ADR-V4-017 · R41-01 |

**描述**: 三区挂载与接线（toolbar/statusbar/theme/viewHost）；`#log` → `#stream` 的**全部选择器迁移**（逐处走台账，语义不变）；`#l0-pick` 移除后保留占位宿主内既有调用（`requestPick()` 由 v4-4 提供）；`view-model.ts` 新增 `toolbarViewModel()` / `statusbarViewModel()` / `riskChips()` 纯函数。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` |

**验收标准**:
- [ ] 全仓 `getElementById('log')` / `querySelector('#log')` 命中数为 **0**（例外：v4 台账已登记的等价改写行）
- [ ] 三区在新骨架下正常渲染（空态 + 有消息态 + 风险态各一次手测截图/日志）
- [ ] 新增视图模型函数为**纯函数**（无 DOM、无 `Date.now()`）
- [ ] `sendDisabledReason` 文本与来源**不改**（本叶不动回合语义）

**验证命令**:
```bash
grep -rn "getElementById('log')\|#log\b" packages/web-cli-plugin/src/ui/sidepanel/ | grep -v "v4-supersession-ledger" | tee /tmp/opencode/v4-gate-logs/v4-1/log-id-residual.log
npm run typecheck --workspace @lgdl/web-cli-plugin
```

### TASK-508（V41-08）: `test/ui/l0.mjs` 整文件重写
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-507 |
| **执行波次** | 5 |
| **对应 FR / AC** | AC-CHAT-004 / 007 / 008 / 023 · FR-CHAT-004/011/013 |
| **ADR / 风险** | ADR-V4-011 第 3 条 · ADR-V4-023 · R41-02 |

**描述**: 整文件重写为三区骨架门禁：三区结构/文档序 + 工具栏 ≤5 + 状态栏常驻 + 风险 chips 永不折叠（J1~J4 + 祖先闭包探针）+ 可点预算 + 豁免清单 + 可发现性 + 三宽度/双主题。**保留文件名**（`v3GateFloors` 同名叠加）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/l0.mjs` |

**验收标准**:
- [ ] 运行期 `check` 计数 **≥ 164**（v3 末轮实测基线，只增）；`countMethod = runtime-check-calls`
- [ ] 三区结构 / 工具栏 == 5 / J1~J4 / 祖先闭包 / 豁免清单 / 320px 零溢出 全部有断言
- [ ] 零删除既有语义断言（整文件重写属**登记型取代**，逐条命中 v4 台账 `entries[]`）
- [ ] `hidden` 之外的隐身（`display:none`/`visibility`/`opacity`）**不豁免**（与 density 同口径）

**验证命令**:
```bash
npm run test:l0 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/l0.log
```

### TASK-509（V41-09）: `test/ui/l1.mjs` 入口机制重写
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-507 |
| **执行波次** | 5 |
| **对应 FR / AC** | FR-CHAT-016 · AC-CHAT-006 / 023 |
| **ADR / 风险** | ADR-V4-011 第 3 条 · R41-02 |

**描述**: `L1_TRIGGERS`（三个 L0 触发器全部消失）→ 工具栏 / 设置视图 / 流内占位宿主的入口机制；**内容契约保留**（引用判定 / 回执 / 局部树 / 手势数据语义逐条迁移为「前置展开 + 重锚」）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/l1.mjs` |

**验收标准**:
- [ ] 运行期计数 **≥ 103**（v3 末轮实测基线）；下界同时 ≥ `v3GateFloors` 的 64（同名叠加）
- [ ] 引用判定 / 回执 / 局部树 / 手势四组内容契约**语义不变**（只改入口与前置展开）
- [ ] `#l1-ref-repick` 等复用点：断言改为「经 `requestPick()` 可达」的过渡形态（v4-4 换实现后不回退）
- [ ] 零删除断言；改写逐条命中 v4 台账

**验证命令**:
```bash
npm run test:l1 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/l1.log
```

### TASK-510（V41-10）: `test/ui/l2.mjs` 入口迁移 + `test/sidepanel-view.test.ts` 4 契约等价改写
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-507 |
| **执行波次** | 5 |
| **对应 FR / AC** | AC-CHAT-023 · FR-CHAT-015 |
| **ADR / 风险** | ADR-V4-011 第 3 条 · ADR-V4-022 · R41-02 |

**描述**: `l2.mjs` 断言从「底部面板入口」重锚到「工具栏入口 + `#stream`↔`#view-host` 互斥 + 计数同源」；`sidepanel-view.test.ts` 4 项布局契约逐项等价或更强改写（① 三区文档序 ② `body{display:flex}` 保留 ③ `#panel-bottom`/`#composer` → 法四 ④ `#log.empty` → `#stream` 空态）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/l2.mjs` |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` |

**验收标准**:
- [ ] `l2.mjs` 运行期计数 **≥ 71**（v3 末轮实测基线；≥ `v3GateFloors` 68）
- [ ] `sidepanel-view.test.ts` 用例数 **≥ 38**；4 契约逐条有等价/更强论证（写在测试注释 + v4 台账 `entries[]`）
- [ ] ② 契约中 `body{display:flex}` 保留；③ 契约断言「默认屏无可见常驻输入框」
- [ ] 零删除既有断言；等价改写逐条命中台账

**验证命令**:
```bash
npm run test:l2 --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/l2.log
npm test --workspace @lgdl/web-cli-plugin 2>&1 | grep -E "sidepanel-view|^ℹ (tests|pass|fail)" | tee /tmp/opencode/v4-gate-logs/v4-1/node-sidepanel-view.log
```

### TASK-511（V41-11）: `test/ui/density.mjs` 换口径 + 31 格 + 阶段 F → v4 基线 + in-gate RP-V4-01~07
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-502 / TASK-507 |
| **执行波次** | 5 |
| **对应 FR / AC** | FR-CHAT-074 / 075 / 070 / 071 · AC-CHAT-009 |
| **ADR / 风险** | ADR-V4-020 / 021 · R41-04 / R4-03 |

**描述**: 换口径（`document.body` 根 + `#stream` 子树跳过）+ **31 登记格**（9 强制 + 15 风险 + 3 空态 + 3 风险详情展开 + worst 1）+ 阶段 F 机器比对指向 `docs/v4-density-baseline.json` + 逐卡动态格 + **in-gate 反证 RP-V4-01~07**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/density.mjs` |

**验收标准**:
- [ ] 运行期计数 **≥ 127**（v3 末轮实测基线；≥ `v3GateFloors` 60）；阈值 `7/15 · 9/20 · 17/35` **逐字不变**
- [ ] 31 格逐格 3 条判定（C1 ≤ 上限 / C2 ≤ 上限 / 增量归属）；档位互斥 `risk > firstRun > default`；空态/风险详情展开**独立成格**不与 default 混算
- [ ] `--reverse RP-V4-01..07` 七条**逐个实跑 FAIL → 还原 → PASS**（`expectFailPattern` 逐条声明）：01 单卡第 7 可点 / 02 空态第 3 卡 / 03 第 2 欢迎卡或 >8 行 / 04 CSS 隐身 C1 不降 + `hidden` 必须降 1 / 05 content.js 或 pick-layer.js +1 B / 06 工具栏控件移入 `#stream` / 07 chip 移入 `hidden` 容器
- [ ] 阶段 F 读 v4 基线；v3 基线**不参与判定**（schema 保真断言仍在 `density-thresholds.test.ts`）
- [ ] `evaluateDelta` 稳定键在新布局下成立（缺键 ⇒ FAIL）

**验证命令**:
```bash
npm run test:density --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/density.log
for r in 01 02 03 04 05 06 07; do node test/ui/density.mjs --reverse RP-V4-$r 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/density-reverse-RP-V4-$r.log; done
```

### TASK-512（V41-12）: `docs/v4-density-baseline.json` + `.md` 首轮实测登记
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-511 |
| **执行波次** | 6 |
| **对应 FR / AC** | FR-CHAT-074 · AC-CHAT-009 / 022 |
| **ADR / 风险** | ADR-V4-021 · R4-19 |

**描述**: 新建 v4 密度基线（`version:"v4"` + 31 格 + `designCaliber` 设计稿/真产物**分列** + `streamRatioSpike`（TASK-501 的 12 格表）+ `logClientHeightFloor`（v4 等价下界，只允许上调）+ `differencesFromV3` 逐条口径差异与理由 + `knownLimitations[]`）；`.md` 摘要。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/docs/v4-density-baseline.json` |
| NEW | `packages/web-cli-plugin/docs/v4-density-baseline.md` |

**验收标准**:
- [ ] 31 格首轮实测值登记（`measuredOn` / `source` / `buildCommand` / `measuredBy`）+ 最差格
- [ ] `designCaliber.published` 与 `designCaliber.measuredByOurs` **分列** + `deltas`（设计稿不作验收依据）
- [ ] `differencesFromV3` 逐条列出并声明方向 = 「**换口径重定标，非放宽**」
- [ ] `docs/v3-density-baseline.json` **零 diff**（逐字冻结为历史）
- [ ] 计数登记口径显式：`countMethod = runtime-check-calls`

**验证命令**:
```bash
git diff --stat -- packages/web-cli-plugin/docs/v3-density-baseline.json
node -e "const d=require('./packages/web-cli-plugin/docs/v4-density-baseline.json');if(d.version!=='v4')throw new Error('version');console.log('cells:',Object.keys(d.tiers||{}).length)"
```

### TASK-513（V41-13）: `test/ui/journey.mjs` 保护段显式取代 + 新 pin（父 ADR-V4-008 八步）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-501 / TASK-507 / TASK-511 |
| **执行波次** | 6 |
| **对应 FR / AC** | FR-CHAT-081 / 082 · AC-CHAT-017 · EC-CHAT-012 |
| **ADR / 风险** | ADR-V4-008 · ADR-V4-016 · R4-01 / R41-03 |

**描述**: 严格八步：① 记录 old（`{file, 42766..54004, sha 6b45c3fa…, 185 行, startAnchor, endAnchor}`）写入 v4 台账 `protectedSupersession`（v3 台账**不动**）② 逐段决策（journey `supersede` / binding `keep`）③ `#15a~#15q` **同编号等价改写**（`#15b` ≥65.0% 语义保留且门槛 45 → 65；`#15c` 法四显式取代；`#15f~#15q` 选择器重锚）④ 登记 `modifiedRanges[]` ⑤ 计算并写入新 pin（`status:"active"` + `supersededFrom`）⑥ 计数守恒 ≥167 ⑦ `redlineRemap[]` 三条（≥65% / ≥589px / composer 贴底）⑧ RP-V4-08 反证。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/journey.mjs` |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（`protectedSupersession` / `modifiedRanges` / `protectedRanges` / `redlineRemap`） |

**验收标准**:
- [ ] `#15a~#15q` **同编号**（不拆不删）；`#15b` 新断言 `#region-stream` rect 高度 / `innerHeight ≥ 0.65`（取自 TASK-501 结论）
- [ ] `#15c` = 「默认屏无可见常驻输入框 ∧ `#composer` 若存在必须 `hidden`」（法四）
- [ ] 运行期计数 **≥ 167**；`countMethod = runtime-check-calls`
- [ ] 保护段新 pin 写入且 `status:"active"`；人为改 1 字节 ⇒ 台账门禁 FAIL（RP-V4-08 第 ③ 项）
- [ ] binding 段 `107780..115930` **字节零改**（`decision:"keep"`）
- [ ] `journey.mjs` 删除行逐条命中 `modifiedRanges` / `entries`（未命中 ⇒ FAIL）

**验证命令**:
```bash
npm run test:ui --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/journey.log
npm run test:supersession --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/supersession.log
```

### TASK-514（V41-14）: v4 取代台账新建 + 双台账判定 + 元门禁追加 + shim 60 断言门禁化
| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-503 / TASK-513 |
| **执行波次** | 7 |
| **对应 FR / AC** | FR-CHAT-080 / 083 / 084 / 085 / 036 · AC-CHAT-023 / 025 |
| **ADR / 风险** | ADR-V4-009 / 011 · R4-14 / R4-16 / R4-20 |

**描述**: 新建 `docs/v4-supersession-ledger.json`（`takesOverFrom` 接管声明 + `entries[]` + `modifiedRanges[]` + `protectedRanges[]` + `counts` + `gateFloors` + `v4GateFloors` + `leafBases` + `toolbarAdmissions[]`）；`supersession-ledger.test.ts` 扩展为**双台账判定**（v3 段冻结 / v4 段按行）；`gate-integrity.test.ts` 追加 in-gate 例外说明文本（**不动 `CHROMIUM_GATES.length === 9`**）；新建 `test/design-contract.test.ts`（实跑 shim 60/60 + sha256 冻结 + `check(` == 60 + 60 行映射表）；`package.json` 追加 `test:design-contract`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` |
| NEW | `packages/web-cli-plugin/test/design-contract.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json`（scripts 追加，依赖零新增） |

**验收标准**:
- [ ] 台账字段齐备且 `countMethod` 唯一合法值 `runtime-check-calls`；`entries[].newTitle` **可在目标文件定位**
- [ ] v3 台账**逐字冻结**（`protectedRanges` 2 段 hash + counts 快照只读）；`git diff` 对 `docs/v3-supersession-ledger.json` 为空
- [ ] `CHROMIUM_GATES.length === 9` **不动**；`EXPECTED_AUDITED_FILES` 本叶**不追加**（本叶零新增 Chromium 门禁）；in-gate 例外文本追加 RP-V4 说明且 `expectFailPattern` 声明数**只增**
- [ ] `design-contract.test.ts`：shim 退出码 0 ∧ 输出含 `60 passed` / `0 failed` ∧ `check(` == 60 ∧ 60 行映射表（A1~I1 全覆盖）∧ shim sha256 == 常量
- [ ] 反证 RP-V4-08 三情形实跑 FAIL → 还原 → PASS（日志落盘）

**验证命令**:
```bash
npm run test:supersession --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/supersession.log
npm run test:gate-integrity --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/gate-integrity.log
npm run test:design-contract --workspace @lgdl/web-cli-plugin 2>&1 | tee /tmp/opencode/v4-gate-logs/v4-1/design-contract.log
```

### TASK-515（V41-15）: 本叶收口（全门禁串行 + 反证 + 五要素中间重登记）
| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-508 / 509 / 510 / 511 / 512 / 513 / 514 |
| **执行波次** | 8 |
| **对应 FR / AC** | AC-CHAT-023 · NFR-CHAT-007 / 009 / 006 · FR-CHAT-094 |
| **ADR / 风险** | ADR-V4-023 · ADR-V4-010 · AC-CHAT-018（中间态） · R41-02 / R4-09 / R4-15 |

**描述**: 按 ADR-V4-023 第 1 条**严格串行**跑完整门禁链（**含增补的 `test:l0` / `test:l1` / `test:l2`**），逐项落盘；跑反证 RP-V4-01~08；按父 ADR-V4-010 第 2 条做 `sidepanel.js` **五要素中间重登记**（`PENDING_ABSOLUTE_CAP` **保持 `resolved:false` 且不预填**）；把 counts（l0/l1/l2/density/journey/sidepanel-view/nodeTestRuntime）写入 v4 台账。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts`（五要素中间重登记 + `_HISTORY`/`_TIMELINE`/`_RE_REGISTRATIONS`） |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json`（`counts` / `leafBases`） |
| NEW（临时日志，不入版本库） | `/tmp/opencode/v4-gate-logs/v4-1/*.log` |

**验收标准**:
- [ ] 18 项门禁全绿（`typecheck` → `build` → `npm test` → `supersession` → `gate-integrity` → `zero-injection` → `page-input` → **`l0`** → **`l1`** → **`l2`** → `density` → `ui`(journey) → `insight` → `binding` → `hardening` → `e2e` → `design-contract`），日志全量落盘（禁 tail 截断）
- [ ] 计数只增：journey ≥167 · insight ≥116 · binding 192 · **l0 ≥164** · **l1 ≥103** · **l2 ≥71** · density ≥127 · sidepanel-view ≥38 · nodeTestRuntime ≥ max(646, 832 台账值/795 末轮实测值，取实测重登)
- [ ] 五要素齐备（前值/新值/日期/来源+构建命令/理由+历史保留）；容差 5% 不变；`targetBudgetBytes`/`targetMet` = `null`
- [ ] 不动面核对：`content.js` = 177,076（无容差）· `pick-layer.js` = 33,900 · `KIND_SET` 零 diff · manifest 零 diff · 判定链 pin 不变
- [ ] `test:l0` 内已含 `data-transitional-host` **存在性**断言（>0；清零断言在 v4-4 TASK-812）

**验证命令**:
```bash
mkdir -p /tmp/opencode/v4-gate-logs/v4-1
for s in typecheck build test test:supersession test:gate-integrity test:zero-injection test:page-input test:l0 test:l1 test:l2 test:density test:ui test:insight test:binding test:hardening test:e2e test:design-contract; do npm run $s --workspace @lgdl/web-cli-plugin 2>&1 | tee "/tmp/opencode/v4-gate-logs/v4-1/${s//:/-}.log" || exit 1; done
stat -c %s packages/web-cli-plugin/dist/sidepanel.js
```

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **15**（TASK-501~515 / V41-01~15） |
| S 级 | 1（TASK-501 spike） |
| M 级 | 11 |
| L 级 | 3（TASK-503 / 511 / 513；TASK-515 计入 M/L 见下） |
| 执行波次 | **8** |

> 复杂度修正说明：TASK-515（收口）实际为 L 级（18 项串行门禁 + 8 条反证 + 重登记），故本叶 L = 4（503 / 511 / 513 / 515）、M = 10、S = 1，合计 15。

## 4. 执行策略

| 波次 | 任务 | 策略 |
|:--:|------|------|
| 1 | TASK-501 | **串行闸门**：12 格全 ≥65.0% 才放行；任一 <65.0% ⇒ 停工上报，全部冻结 |
| 2 | TASK-502, TASK-503 | 并行（文件不相交：测试口径 ∥ DOM 骨架）；503 是后续全部 DOM 断言的唯一前置 |
| 3 | TASK-504, TASK-505, TASK-506 | 并行（toolbar / statusbar / shell·view-host 三组文件不相交） |
| 4 | TASK-507 | 串行（三区接线汇聚单点，避免并行写 `sidepanel.ts`） |
| 5 | TASK-508, TASK-509, TASK-510, TASK-511 | 写入可并行；**门禁运行严格串行**（`test:l0` → `l1` → `l2` → `density`） |
| 6 | TASK-512, TASK-513 | 并行（基线登记 ∥ journey 保护段）；513 依赖 501 结论 |
| 7 | TASK-514 | 串行（台账汇聚 + 元门禁；须在全部改写落定后） |
| 8 | TASK-515 | 串行收口（唯一收口点） |

**D-005 测试守恒账（本叶）**：

| 门禁 | v3 末轮实测基线 | 本叶处置 | 本叶预期 | 记账方式 |
|------|:--:|------|:--:|------|
| `test/ui/l0.mjs` | **164** | **整文件重写**（三区/J1~J4/预算/豁免/可发现性） | **≥164** | 台账 `entries[]` 逐条登记（整文件重写型取代） |
| `test/ui/l1.mjs` | **103** | **入口机制重写**（内容契约保留） | **≥103** | 同编号重锚 + 前置展开，逐条登记 |
| `test/ui/l2.mjs` | **71** | 入口位置迁移 + 互斥复核 | **≥71** | 同编号重锚，逐条登记 |
| `test/ui/density.mjs` | **127** | **换口径重定标** + 31 格 + in-gate RP-V4-01~07 | **≥127** | 新旧格差异登记于 v4 基线 `differencesFromV3` |
| `test/ui/journey.mjs` | **167** | 保护段 `#15a~#15q` **同编号**改写 + 新 pin | **≥167** | `modifiedRanges` + `protectedRanges` + `redlineRemap` |
| `test/sidepanel-view.test.ts` | **38** | 4 契约等价/更强改写 | **≥38** | 台账 `entries[]`（4 条） |
| `test/insight.mjs` | **116** | 入口位置少量取代 | **≥116** | 同编号重锚 |
| `test/binding.mjs` | **192** | **零改动**（保护段 2 keep） | **192** | `zeroDiffFiles` |
| `npm test`（node 运行期用例） | 台账 **832** / v3-4 末轮日志 **795** | 新增 `test/design-contract.test.ts` | **≥ max(646, 实测)** | `nodeTestRuntime`（**跨口径差须实测订正**，见 §5） |
| 新增（本叶） | — | `test/design-contract.test.ts` | 新增（首轮实测登记） | `pureAdditionFiles` |

## 5. 跨叶检查点（本叶承担）

| 检查点 | 内容 | 卡点 |
|--------|------|------|
| **CP-0 spike 闸门** | TASK-501 12 格全 ≥65.0% | 未过 ⇒ 本叶 TASK-502~515 与 v4-2/3/4 全部冻结 + 上报编排器 |
| **CP-1 v4-1→v4-2 交接** | TASK-515 全 18 门禁绿 + v4 台账/基线存在 + `density-scope.ts` 单源 + 占位宿主 >0 | 未绿 ⇒ v4-2 TASK-601 不得开工 |
| **跨口径差（须订正）** | 台账 `nodeTestRuntime.currentRuntime = 832` vs v3-4 末轮日志 `ℹ tests 795` | 本叶收口轮以**实测值**重登（`countMethod` 显式），不得直接沿用 832 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。15 任务 / 8 波；TASK-501 = **S 级 spike 闸门**（不可跳过/不可后置，未过即停工上报）；门禁集合按父 ADR-V4-011 第 2 条**增补 `test:l0`/`l1`/`l2`**；含 D-005 测试守恒账（l0 164→≥164 整文件重写 / l1 103 / l2 71 / density 127 / journey 167 / sidepanel-view 38）与跨叶检查点 CP-0/CP-1。 | 2026-09-18 | SDDU Tasks Agent |
