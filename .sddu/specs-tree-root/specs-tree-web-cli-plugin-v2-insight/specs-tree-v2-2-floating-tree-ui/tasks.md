# 任务分解：specs-tree-v2-2-floating-tree-ui（V2-2 悬浮连接树 UI 与交互）

> **文档定位**: SDDU 任务清单（**叶子子 Feature**，P0，P0 闭环第二环：可见）— 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入
> **前置依赖**: V2-2 `plan.md` v1.0（`#panel-main` 内 absolute FAB + 覆盖式抽屉 + 纯渲染模型 + 量化口径 + 体积守卫 + 文件影响 + 交付门槛）+ 父 `plan.md` v1.0（ADR-V2-004/005/006/007/011/015）+ V2-2 `spec.md` v1.0（FR-V2-020~025 / NFR-V22-001~006 / EC-V22-001~005 / AC-V22-001~007）+ **V2-1 产出**（`ConnectTreeSnapshot` + `insight-tree`/`insight-changed` 通路）
> **创建人**: SDDU Tasks Agent
> **创建时间**: 2026-09-13
> **版本**: v1.0
> **更新人**: SDDU Tasks Agent
> **更新时间**: 2026-09-13
> **更新说明**: 初始创建。V2-2 plan §3.1~3.7（append-only 标记与样式 + 纯渲染模型 + 惰性 DOM 挂载 + sidepanel 挂载 + 布局量化 + 体积守卫 + additive 消息）→ 整合为 **11 个原子任务 / 4 个执行波次**（跨叶子 Wave 6~9）。门禁矩阵：`test/ui/insight.mjs`（新文件承载，**不改 v1 `journey.mjs`**）+ `tree-view` 纯测 + `size-budget`（新基线文件）。**断言只增不减**：新断言落在新文件 `test/ui/insight.mjs`，v1 `journey.mjs` 与既有断言零删改。

---

## 0. 跨叶子定位与执行序（本文件 = V2-2，P0 第二环）

| 叶子 | 文件 | 跨叶子执行序 | 依赖 |
|------|------|:--:|------|
| V2-1 连接树数据模型与状态投影 | `specs-tree-v2-1-connect-tree-model/tasks.md` | Wave 1~5（先行） | — |
| **V2-2 悬浮连接树 UI 与交互**（本文件） | `specs-tree-v2-2-floating-tree-ui/tasks.md` | **Wave 6~9** | V2-1 TASK-003（快照）/ V2-1 TASK-005（`insight-tree` + `insight-changed` + `state.insight?` 通路） |
| V2-3 撤销与取消授权操作面 | `specs-tree-v2-3-revoke-ops/tasks.md` | Wave 10~13 | 同 V2-1 依赖 + 本叶子 TASK-002（`tree-view.ts`）/ TASK-004（`tree-drawer.ts`）（V2-3 对其 MODIFY） |

**门禁串行纪律（NFR-V2-009）**：`npm run build` → `npm test` → `npm run test:ui`（v1 journey 回归）→ `npm run test:insight`（本叶子新增）→ `npm run test:binding` → `npm run test:hardening` → `npm run test:e2e`，**逐条串行、绝不并发**（本仓库 OOM 前科）。

---

## 1. 依赖拓扑总览

> 红线贯穿：**append-only**（既有 DOM id / `.entry-*` / `.msg-*` / `.tool-*` 零重命名）；**不注入页面**；**不放进设置面板**；**不改 `options.html`**；**不改 v1 `test/ui/journey.mjs`**；抽屉是 `#panel-main` 的 absolute 子元素（**不参与 flex 流 → 结构上不可能遮挡 composer / 挤压 `#log`**）；渲染零 `innerHTML`（防 XSS）。

### 1.1 任务总览表

| 编号 | 模块/落点 | 类型 | 复杂度 | 依赖 | 执行波次 | 可并行 | 一句话目标 |
|------|----------|:--:|:--:|------|:--:|:--:|------|
| TASK-001 | `src/ui/sidepanel/index.html` | 🛠 | M | V2-1-TASK-005 | Wave 6 | ∥ 002/006 | **追加** `#tree-fab` + `#tree-drawer` 标记与样式（append-only；零几何影响） |
| TASK-002 | `src/ui/tree/tree-view.ts` | 🛠 | M | V2-1-TASK-003 | Wave 6 | ∥ 001/006 | 纯渲染模型（rows/badges/controls/filter/`needsConfirmation`；deny→`controls:[]`；静态权限无 revoke；文案钉死） |
| TASK-003 | `test/tree-view.test.ts` | ⚖️ | S | 002 | Wave 7 | ∥ 004 | `tree-view` 纯测门禁（142 子命令遍历 deny 无开关 / 静态权限无撤销 / 文案 / 过滤只读） |
| TASK-004 | `src/ui/tree/tree-drawer.ts` | 🛠 | M | 001/002 | Wave 7 | ∥ 003 | DOM 挂载（惰性 mount / open·close·toggle·refresh / Esc / 焦点回归 / `textContent` 零 innerHTML） |
| TASK-005 | `src/ui/sidepanel/sidepanel.ts` + `package.json` | 🛠 | M | 004 | Wave 8 | — | **追加**挂载/订阅（既有 handler 零改动）+ `applyEnvGuard` 禁用 `#tree-fab` + `test:insight` script |
| TASK-006 | `test/size-baseline.ts` + `test/size-budget.test.ts` | ⚖️ | M | 无 | Wave 6 | ∥ 001/002 | 体积守卫（**只吞 ENOENT** + 反证自测 + 基线≠目标预算 + `content.js` 不增长） |
| TASK-007 | `test/ui/insight.mjs` | ⚖️ | L | 005 | Wave 9 | ⚠️ 串行执行 | `test:insight` 门禁：FAB/抽屉 + `#log` flex-grow=1 / ≥589px / ≥65.0% / composer∈[0,+8] / FAB∩composer=0 / 400·320px 溢出=0 / 开·关两态 |
| TASK-008 | `test/size-baseline.ts`（build 后实测登记） | ⚖️ | S | 005 | Wave 9 | ∥ 007/010 | build 后实测 `sidepanel.js` 并登记基线（含测量日期/来源）；`content.js` 不增长核验 |
| TASK-009 | 门禁串行 + v1 断言零删减核验 | ⚖️ | M | 007/008/010 | Wave 9 | 串行收口 | 串行跑全套 + 核验 v1 `journey.mjs` 断言零删减 + `tsc` 0 error + base 483 零回归 |
| TASK-010 | grep/契约门禁（无 innerHTML / id 类零重命名 / options 零 diff） | ⚖️ | S | 005 | Wave 9 | ∥ 007/008 | 契约 grep 门禁（`#tree-*` 内无 `innerHTML`；既有 id/类零重命名；`options.html` 零 diff） |
| TASK-011 | `docs/smoke-checklist.md`（v2 §）+ 人工面 H-A~H-D | 📄 | M | 007 | Wave 9 | 人工面 | 落点人工面检查清单 + 执行登记（H-A 观感/动画/明暗；H-B 长站点名/320px 拥挤；H-C 高 DPI；H-D 键盘焦点） |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
Wave 6（并行组 ①：均依赖 V2-1 TASK-005；文件不相交）：
  TASK-001 [M] 🛠 index.html FAB+抽屉标记/样式
  TASK-002 [M] 🛠 tree-view.ts 纯渲染模型
  TASK-006 [M] ⚖️ size-baseline.ts + size-budget.test.ts（体积守卫基建，无依赖）

Wave 7（并行组 ②：文件不相交）：
  TASK-003 [S] ⚖️ tree-view.test.ts（dep 002）
  TASK-004 [M] 🛠 tree-drawer.ts（dep 001/002）

Wave 8（串行）：
  TASK-005 [M] 🛠 sidepanel.ts 挂载/订阅 + package.json test:insight（dep 004）

Wave 9（门禁/收口；⚠️ 执行串行，绝不并发）：
  TASK-007 [L] ⚖️ test/ui/insight.mjs（AC-V2-002 量化；dep 005）
  TASK-008 [S] ⚖️ 体积基线实测登记 + content.js 不增长（dep 005）
  TASK-009 [M] ⚖️ 门禁串行 + v1 断言零删减核验（dep 007/008/010）
  TASK-010 [S] ⚖️ grep/契约门禁（dep 005）
  TASK-011 [M] 📄 人工面清单落点 + H-A~H-D 执行登记（dep 007）
```

### 1.3 并行分组（执行波次）

```
Wave 6 ─── (并行组 ①)
  TASK-001 [M] 🛠 index.html（FAB + 覆盖式抽屉）
  TASK-002 [M] 🛠 tree-view.ts（纯渲染模型）
  TASK-006 [M] ⚖️ 体积守卫基建

Wave 7 ─── (并行组 ②)
  TASK-003 [S] ⚖️ tree-view 纯测
  TASK-004 [M] 🛠 tree-drawer.ts（惰性 DOM 挂载）

Wave 8 ─── (串行)
  TASK-005 [M] 🛠 sidepanel 挂载/订阅 + test:insight script

Wave 9 ─── (门禁/收口；⚠️ 串行执行)
  TASK-007 [L] ⚖️ test/ui/insight.mjs（#I-01…）
  TASK-008 [S] ⚖️ 体积基线实测登记
  TASK-009 [M] ⚖️ 全套串行门禁 + v1 断言零删减核验
  TASK-010 [S] ⚖️ grep/契约门禁
  TASK-011 [M] 📄 人工面清单落点 + H-A~H-D 登记
```

---

## 2. 任务列表

> 缩写：V22 = 本叶子；ADR-NN = 父 `plan.md` §8；FR/NFR/EC/AC = 父 `spec.md`；NFR-V22 / EC-V22 / AC-V22 = 本叶子 `spec.md`。
> **量化口径（ADR-V2-006，编排器代作者决策）**：`#log` 稳态 `clientHeight` **≥589px（主断言）** + 占比 **≥65.0%（次断言）**；v1 基线 `589/900 = 65.44%`（父 spec `AC-V2-002` 已按本口径订正）。

### TASK-001: `index.html` 追加 FAB + 覆盖式抽屉标记与样式（append-only）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施 |
| **前置依赖** | V2-1-TASK-005 |
| **执行波次** | Wave 6 |
| **对应 FR** | FR-V2-020/023/024（+ FR-V2-004 树≠设置面板） |
| **承接 ADR** | ADR-V2-005（`#panel-main` 内 absolute FAB + 覆盖式抽屉） |

**描述**: 在 `src/ui/sidepanel/index.html` 的 `#panel-main` 内、`#log`/`#scroll-bottom` **之后**追加（append-only）：`#tree-fab`（`position:absolute; left:12px; bottom:12px; z-index:6`，与 `#scroll-bottom` 左右分居）+ `#tree-drawer`（`position:absolute; inset:0 0 0 auto; width:min(340px,100%); max-height:100%; overflow-y:auto; overflow-x:hidden; min-width:0; z-index:7`；`[hidden]{display:none}`）+ 抽屉头/过滤/分组/行/徽标/控件样式。沿用 v1 design tokens（明暗自动适配）。**既有 id / `.entry-*` / `.msg-*` / `.tool-*` 零重命名**；**不改 `options.html`**；**不使用 `body.settings-open` 视图切换机制**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html`（追加 FAB + 抽屉标记与样式；既有标记零改名） |

**验收标准**:
- [ ] `#tree-fab` 位于 `#panel-main` DOM 内（非页面注入）；`aria-controls="tree-drawer"` + `aria-expanded="false"`
- [ ] `#tree-drawer` 为 `#panel-main` 的 absolute 子元素，默认 `hidden`；不参与 flex 流
- [ ] 既有元素 id / 类**零重命名**（grep 断言：`#panel-top`/`#panel-main`/`#panel-bottom`/`#log`/`#composer`/`#scroll-bottom`/`#settings-view` 及 `.entry-*`/`.msg-*`/`.tool-*` 全部保留）
- [ ] `options.html` git diff 为空
- [ ] `npm run build` 成功

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build
grep -q 'id="tree-fab"' src/ui/sidepanel/index.html
grep -q 'id="tree-drawer"' src/ui/sidepanel/index.html
git -C ../.. diff --quiet -- packages/web-cli-plugin/src/ui/options/index.html || echo "❌ options.html 被改动"
```

### TASK-002: `tree-view.ts` 纯渲染模型

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（纯函数，node 可测） |
| **前置依赖** | V2-1-TASK-003 |
| **执行波次** | Wave 6 |
| **对应 FR** | FR-V2-021/022/025 |
| **承接 ADR** | ADR-V2-011（deny 无开关 / 静态权限不可撤销）、ADR-V2-013（`needsConfirmation`） |

**描述**: `src/ui/tree/tree-view.ts`：`buildTreeRows(snapshot, filter?)` → `TreeRenderModel`（`header.modelNote` + `header.noEscalationNote` + 四分组 rows + `filter`）。**结构保证**：命令 `action==='deny'` → 该行 `controls === []`；静态权限节点 `controls` **不含** `revoke` 且带 `revokeHint`；`needsConfirmation(actionId)` 纯函数（不可逆/高影响→`true`；开关翻转→`false`）。`TreeFilter = { dimension?, query?, action?, sourceKind? }` **纯只读**，不改 snapshot。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-view.ts` |

**验收标准**:
- [ ] `header.modelNote` 恒含「四维度分组视图（森林），非严格树」
- [ ] `header.noEscalationNote` 恒含「撤销/关断 = 回到更保守，不放宽任何门禁；`delay` = `deny`（fail-closed）」
- [ ] 命令 `action==='deny'` → `controls === []`（结构保证，ADR-V2-011）
- [ ] 静态权限节点 `controls` 不含 `revoke` + `revokeHint` 如实披露「不可逐项撤销（需停用/卸载扩展）」
- [ ] 可选能力仅 `granted===true` 给 `revoke` 控件
- [ ] `needsConfirmation` 对 7 个动作的取值正确（不可逆/高影响为 `true`；`set-capability-toggle`/`set-tabs-toggle` 为 `false`）
- [ ] 过滤只读（纯函数、不 mutate snapshot）；无 `innerHTML`；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck
! grep -n "innerHTML" src/ui/tree/tree-view.ts
```

### TASK-003: 门禁 `tree-view` 纯测

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | ⚖️ 门禁（node 单测） |
| **前置依赖** | TASK-002 |
| **执行波次** | Wave 7 |
| **对应 FR** | FR-V2-021/022/025（+ AC-V22-001/005/006） |

**描述**: **新文件** `test/tree-view.test.ts`：遍历全量 **142 子命令**断言 `deny ⇒ controls:[]`；静态权限无 `revoke`；`header` 两条声明文案；`needsConfirmation` 7 动作；过滤只读（前后 snapshot deep-equal）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/tree-view.test.ts` |

**验收标准**:
- [ ] 142 子命令逐个断言 `action==='deny' ⇒ controls.length===0`
- [ ] 静态权限节点 `controls` 全部不含 `revoke`
- [ ] `modelNote` / `noEscalationNote` 文案断言
- [ ] `needsConfirmation` 7/7 动作断言
- [ ] 过滤前后 snapshot `deep-equal`（只读）
- [ ] `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
```

### TASK-004: `tree-drawer.ts` DOM 挂载（惰性）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施 |
| **前置依赖** | TASK-001/002 |
| **执行波次** | Wave 7 |
| **对应 FR** | FR-V2-020/021/022/024 |
| **承接 ADR** | ADR-V2-004（additive 消息）、ADR-V2-005 |

**描述**: `src/ui/tree/tree-drawer.ts`：`mountTreeDrawer({root, doc, ops, onNotice})` → `{open, close, toggle, refresh, setFilter}`。**惰性**：`#tree-fab` 首次点击才 `sendMessage('insight-tree')` + 建 DOM；关闭态 `[hidden]` **零渲染/零轮询**（NFR-V22-005）。渲染用 `textContent`/`createElement`（**零 `innerHTML`**）。键盘可达：FAB `aria-expanded` 同步；Esc 关闭；关闭后焦点回 FAB。订阅 `insight-changed` / 既有 `capability-changed`/`session-changed`/`probe-changed` → `refresh()`（EC-V22-002）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` |

**验收标准**:
- [ ] `#tree-fab` 首开触发 `insight-tree`；再开不重复首拉，但 `refresh()` 可重拉
- [ ] 关闭态 `[hidden]` 且无渲染/无定时器
- [ ] Esc 关闭；关闭后焦点回 FAB；`aria-expanded` 同步
- [ ] 零 `innerHTML`（grep）；无 bare `catch`
- [ ] 过滤 `setFilter` 只重渲染，不改真值（EC-V22-005 / AC-V22-005）
- [ ] `npm run build` + `typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run typecheck
! grep -rnE "innerHTML|catch\s*\([^)]*\)\s*\{\s*\}" src/ui/tree/tree-drawer.ts
```

### TASK-005: `sidepanel.ts` 挂载/订阅 + `package.json` `test:insight`

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 🛠 实施（append-only） |
| **前置依赖** | TASK-004 |
| **执行波次** | Wave 8 |
| **对应 FR** | FR-V2-020/024（+ FR-V2-002） |

**描述**: (1) `sidepanel.ts`：在 `wire()` 末尾**追加** `mountTreeDrawer(...)` 与 `visibilitychange`/`focus` 刷新挂接（既有 handler **零改动**）；`applyEnvGuard` 禁用列表**追加** `#tree-fab`（非扩展环境禁用，与既有按钮一致）；**不改** `render()` / `#log` 重建 / `scrollFollow` / 既有 `#revoke`/`#audit`。(2) `package.json`：**追加** `"test:insight": "node test/ui/insight.mjs"`（依赖零新增）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts`（追加挂载/订阅/环境守卫项） |
| MODIFY | `packages/web-cli-plugin/package.json`（追加 `test:insight` script） |

**验收标准**:
- [ ] `sidepanel.ts` 既有 hook / handler **零删改**（`git diff` 仅新增行）
- [ ] `applyEnvGuard` 禁用列表含 `#tree-fab`
- [ ] `package.json` 追加 `test:insight`；`dependencies` / `devDependencies` 零新增
- [ ] `#settings-view` 与树互不嵌套、可分别打开（AC-V22-004 / AC-V2-008）
- [ ] `npm run build` + `typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run typecheck
node -e "const p=require('./package.json'); if(!p.scripts['test:insight']) throw new Error('missing test:insight'); if(Object.keys(p.dependencies).length!==1) throw new Error('dep新增'); console.log('script ok')"
git -C ../.. diff --unified=0 -- packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts | grep -E "^-[^-]" || echo "append-only ok"
```

### TASK-006: 门禁 `size-budget`（体积守卫基建：基线 ≠ 目标预算 + 反证自测 + 只吞 ENOENT）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 门禁（node 单测） |
| **前置依赖** | 无（不依赖 UI 实现） |
| **执行波次** | Wave 6 |
| **对应 FR** | NFR-V2-001/002、AC-V2-006 |
| **承接 ADR** | ADR-V2-007（体积守卫，**复用 v1 `readArtifactSize` 只吞 ENOENT**；**不重构 v1 `perf-baseline.ts` / `perf-budget.test.ts`**） |

**描述**: **新文件** `test/size-baseline.ts`：`SIDEPANEL_BASELINE_BYTES = 1_068_165`（v1 实测，**build 后由 TASK-008 重新实测登记**）；`SIDEPANEL_BASELINE_TOLERANCE = 0.05`；`SIDEPANEL_CEILING = floor(1_068_165 × 1.05) = 1_121_573`；`SIDEPANEL_BASELINE_META = { kind:'regression-baseline-only', targetBudgetBytes: null, targetMet: null, measuredOn, source, buildCommand }`（**基线 ≠ 目标预算**）；`CONTENT_MAX_BYTES = 1_073_453`（**不增长**，无容差）。复用 v1 `test/perf-baseline.ts` 的 `readArtifactSize`（**只吞 `ENOENT`**，其余错误必须抛）。**新文件** `test/size-budget.test.ts`：① sidepanel ≤ ceiling；② `content.js` ≤ `1_073_453`；③ **反证自测**（`ceiling+1` → FAIL；`1_073_454` → FAIL）；④ 仅吞 ENOENT（EACCES/裸 Error 必须抛）；⑤ `targetBudgetBytes===null` 且 `targetMet===null`（禁「目标达成」话术）；⑥ 与 v1 `CONTENT_BUNDLE_TARGET_BYTES===64*1024` 且 `targetMet===false` 一致（**不覆盖 v1 未达成项 D31**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/size-baseline.ts` |
| NEW | `packages/web-cli-plugin/test/size-budget.test.ts` |

**验收标准**:
- [ ] 守卫**只吞 `ENOENT`**；`EACCES` / 裸 `Error` 必须抛出（反证测试）
- [ ] **反证自测**：`ceiling+1` 与 `1_073_454` 均触发 FAIL
- [ ] `SIDEPANEL_BASELINE_META.targetBudgetBytes===null` 且 `targetMet===null`
- [ ] `content.js` 上限 `1_073_453`（无容差）
- [ ] **不修改** v1 `test/perf-baseline.ts` / `test/perf-budget.test.ts`
- [ ] `npm test` 全绿

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test
git -C ../.. diff --quiet -- packages/web-cli-plugin/test/perf-baseline.ts packages/web-cli-plugin/test/perf-budget.test.ts
```

### TASK-007: 门禁 `test:insight`（`test/ui/insight.mjs`，AC-V2-002 量化）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **类型** | ⚖️ 门禁（真实 dist + CDP；**串行执行**） |
| **前置依赖** | TASK-005 |
| **执行波次** | Wave 9 |
| **对应 FR** | FR-V2-020~025、NFR-V2-004/007、AC-V2-002/008 |
| **承接 ADR** | ADR-V2-005/006/011 |

**描述**: **新文件** `test/ui/insight.mjs`（`test:insight`）承载 AC-V2-002 全量量化断言（新编号 `#I-01…`，**不改 v1 `test/ui/journey.mjs`**）：① `#tree-fab` 存在且可开合；② 抽屉四维度可见 + 状态徽标；③ 空态/降级可读；④ `#log` 计算 `flex-grow === '1'`；⑤ `#log` 稳态 `clientHeight ≥ 589px`（主）+ 占比 `≥ 65.0%`（次）；⑥ `#composer` 底边 − 视口底 `∈ [0, +8px]`；⑦ `#tree-fab` ∩ `#composer` boundingRect 交面积 `= 0`；⑧ 文档级水平溢出（**400px 与 320px**）`= 0`；⑨ 抽屉**开/关两态**全部复用；⑩ 「撤销≠放宽」文案 + `delay` 消歧句；⑪ `deny` 节点无开关控件。真实 dist + 视口 **400×900**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/insight.mjs` |
| MODIFY | `packages/web-cli-plugin/package.json`（`test:insight` script，见 TASK-005） |

**验收标准**:
- [ ] ①~⑪ 全绿；新断言编号 `#I-01…`
- [ ] `#log` ≥589px（主）且 ≥65.0%（次）；composer ∈[0,+8px]
- [ ] `#tree-fab` ∩ `#composer` = 0（开/关两态）
- [ ] 400px / 320px 文档级水平溢出 = 0
- [ ] 文案含「撤销/关断 = 回到更保守，不放宽」+「`delay`（= `deny`，fail-closed…）」消歧句
- [ ] **不修改** v1 `test/ui/journey.mjs`（`git diff` 断言零变更）
- [ ] 串行执行（**绝不与 `test:ui` / `test:binding` 并发**）

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run build
npm run test:insight   # 串行；测试内自起 headless Chromium，绝不并发其它 Chromium 门禁
git -C ../.. diff --quiet -- packages/web-cli-plugin/test/ui/journey.mjs
```

### TASK-008: build 后实测登记 `sidepanel.js` 基线 + `content.js` 不增长

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | ⚖️ 门禁（实测登记） |
| **前置依赖** | TASK-005（UI 代码定型） |
| **执行波次** | Wave 9 |
| **对应 FR** | NFR-V2-001/002、AC-V2-006 |
| **承接 ADR** | ADR-V2-007 |

**描述**: `npm run build` 后实测 `dist/sidepanel.js` 字节数，**显式更新** `test/size-baseline.ts` 的 `SIDEPANEL_BASELINE_BYTES` / `SIDEPANEL_CEILING` / `SIDEPANEL_BASELINE_META`（含**测量日期 / 来源 / buildCommand**），并在文件头注明「增重为 V2-2 UI 有意引入」。同时实测 `dist/content.js`，断言 **≤ 1_073_453 B**（不增长）。**不得改容差或删断言来掩盖**；**基线 ≠ 目标预算**（`targetBudgetBytes`/`targetMet` 恒 `null`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts`（登记实测基线 + 日期/来源） |

**验收标准**:
- [ ] build 后实测值写入 `SIDEPANEL_BASELINE_BYTES`，`SIDEPANEL_CEILING` 随之重算
- [ ] `SIDEPANEL_BASELINE_META` 含 `measuredOn` / `source` / `buildCommand`；`targetBudgetBytes===null`、`targetMet===null`
- [ ] `content.js` 实测 ≤ `1_073_453` B（**不增长**，NFR-V2-002）
- [ ] 文件头注明测量日期 + 来源 + 「V2-2 UI 有意增重」
- [ ] `npm test` 全绿；未改容差/未删断言

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build
node -e "const s=require('node:fs').statSync('dist/sidepanel.js').size; const c=require('node:fs').statSync('dist/content.js').size; console.log('sidepanel',s,'content',c); if(c>1073453) throw new Error('content.js 增长')"
npm test
```

### TASK-009: 门禁串行 + v1 断言零删减核验（收口）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | ⚖️ 验证收口（**串行**） |
| **前置依赖** | TASK-007/008/010 |
| **执行波次** | Wave 9 |
| **对应 FR** | NFR-V22-001/006、AC-V22-003、AC-V2-011 |

**描述**: 逐条**串行**执行全套门禁并核验回归：`npm run build` → `npm test` → `npm run test:ui`（v1 journey 回归，**断言零删减**）→ `npm run test:insight` → `npm run test:binding` → `npm run test:hardening` → `npm run test:e2e` → `tsc --noEmit`。核验 v1 `test/ui/journey.mjs` 的 `#15a~#15q`（及既有全部断言）**只增不减**；`web-cli-base` **483 零回归**；全仓 0 fail。**绝不并发**。

**涉及文件**: 无（执行记录；结果回填 build.md）

**验收标准**:
- [ ] 全套门禁逐条串行通过，全仓 0 fail
- [ ] v1 `test/ui/journey.mjs` 既有断言**零删减**（断言计数只增不减）；文件本身零改动
- [ ] `web-cli-base` 483 零回归；`tsc --noEmit` 0 error
- [ ] 串行执行记录可追溯（命令顺序 + 时间）

**验证命令**:
```bash
cd packages/web-cli-plugin
npm run build
npm test
npm run test:ui        # 串行
npm run test:insight   # 串行
npm run test:binding   # 串行
npm run test:hardening
npm run test:e2e
npm run typecheck
```

### TASK-010: grep/契约门禁（无 innerHTML / id 类零重命名 / options 零 diff）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **类型** | ⚖️ 门禁（grep） |
| **前置依赖** | TASK-005 |
| **执行波次** | Wave 9 |
| **对应 FR** | FR-V2-024、NFR-V22-006、AC-V22-004/007、AC-V2-007/008 |

**描述**: 契约 grep 门禁：① `src/ui/tree/**` 与新增 `index.html` 段**零 `innerHTML`**；② `index.html` 既有 id / `.entry-*` / `.msg-*` / `.tool-*` **零重命名**；③ `options.html` / `manifest.json` git diff 为空；④ 无 `<all_urls>` / 无新增静态 `content_scripts`；⑤ `packages/web-cli-base/**` diff 为空。

**涉及文件**: 无（grep 记录）

**验收标准**:
- [ ] `! grep -rn "innerHTML" src/ui/tree src/ui/sidepanel/index.html`
- [ ] 既有 DOM 契约 id/类零重命名（v1 基线集合 grep 全命中）
- [ ] `options.html` / `manifest.json` / `packages/web-cli-base/**` diff 为空
- [ ] 无 `<all_urls>` / 无新增静态 `content_scripts`

**验证命令**:
```bash
cd packages/web-cli-plugin
! grep -rn "innerHTML" src/ui/tree
git -C ../.. diff --quiet -- packages/web-cli-plugin/src/ui/options/index.html packages/web-cli-plugin/manifest.json packages/web-cli-base
```

### TASK-011: 人工面清单落点（`docs/smoke-checklist.md` v2 段）+ H-A~H-D 执行登记

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **类型** | 📄 文档 + 人工验证（headless 无法覆盖） |
| **前置依赖** | TASK-007 |
| **执行波次** | Wave 9 |
| **对应 FR** | NFR-V2-008、NFR-V22-002 |

**描述**: 在 `packages/web-cli-plugin/docs/smoke-checklist.md` **追加 v2 段**（不删改既有内容），登记 V2-2 人工面检查清单：**H-A** 悬浮观感 / 抽屉进入退出动画 / 明暗主题观感；**H-B** 长站点名 / 长文案 / 320px 窄栏字重与拥挤度；**H-C** 多显示器 / 高 DPI 下 FAB 位置观感；**H-D** 键盘 / 焦点遍历真实体感（Tab / Esc / 焦点回归）。逐项给步骤 + 期望 + 执行结果栏。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/docs/smoke-checklist.md`（追加 v2 §，既有内容零删改） |

**验收标准**:
- [ ] 追加 v2 §，含 H-A~H-D 逐项（步骤 / 期望 / 本轮结论栏）
- [ ] 既有 §1 机械面 / §2 人工面 / §3 降级出口**零删改**
- [ ] 人工执行登记（无法自动化项如实标注；未执行标「⏳ 待人工」）
- [ ] v1 既有 M1~M30 / H0~H10 编号零冲突（v2 用 `V2-H-*` 前缀）

**验证命令**:
```bash
cd packages/web-cli-plugin
grep -qE "H-A|H-B|H-C|H-D" docs/smoke-checklist.md
git -C ../.. diff --stat -- packages/web-cli-plugin/docs/smoke-checklist.md
```

---

## 3. 任务汇总

| 统计项 | 数值 |
|--------|:--:|
| 总任务数 | **11** |
| S 级 | 3（TASK-003/008/010） |
| M 级 | 7（TASK-001/002/004/005/006/009/011） |
| L 级 | 1（TASK-007） |
| 执行波次 | **4**（跨叶子 Wave 6~9） |
| 实施任务（🛠） | 4（001/002/004/005） |
| 门禁任务（⚖️） | 6（003/006/007/008/009/010） |
| 文档/人工（📄） | 1（011） |
| 新建文件 | 5（`tree-view.ts`/`tree-drawer.ts`/`tree-view.test.ts`/`size-baseline.ts`/`size-budget.test.ts`/`insight.mjs`） |
| 修改文件 | 4（`index.html`/`sidepanel.ts`/`package.json`/`docs/smoke-checklist.md`） |

### 3.1 交付门槛矩阵（本叶子）

| 门禁 | 命令 | 断言要点 | 新增 vs 追加 | 承载任务 |
|------|------|----------|:--:|:--:|
| `tree-view`（纯） | `npm test` | 142 子命令 deny→`controls=[]`；静态权限无 `revoke`；文案；过滤只读 | **新增文件** `test/tree-view.test.ts` | TASK-003 |
| `size-budget` | `npm test` | `sidepanel ≤ 1_121_573`；`content ≤ 1_073_453`；**反证自测**；只吞 `ENOENT`；基线≠目标预算 | **新增文件** `test/size-baseline.ts` + `size-budget.test.ts`（**不碰 v1 `perf-*`**） | TASK-006/008 |
| `test:insight` | `npm run test:insight` | FAB/抽屉 + `#log` flex-grow=1 / **≥589px（主）** / ≥65.0%（次）/ composer∈[0,+8] / FAB∩composer=0 / 400·320px 溢出=0 / 开·关两态 / 文案 / deny 无开关 | **新增文件** `test/ui/insight.mjs`（**v1 `journey.mjs` 零改动**） | TASK-007 |
| v1 `test:ui` 回归 | `npm run test:ui` | v1 `#15a~#15q`（及全部既有）断言**零删减** | 零改动 v1 `journey.mjs` | TASK-009 |
| grep/契约 | grep + git diff | 无 `innerHTML`；id/类零重命名；`options.html`/`manifest.json`/base 零 diff | 零改动既有契约 | TASK-010 |

### 3.2 断言只增不减（具体保证方式）

| 类别 | 文件 | 方式 |
|------|------|------|
| V2-2 新增断言 | `test/ui/insight.mjs`（`#I-01…`）/ `test/tree-view.test.ts` / `test/size-budget.test.ts` | **全部新增文件**；v1 无同名文件 |
| v1 既有断言（`test:ui`） | `test/ui/journey.mjs` | **文件零改动**；核验方式：`git diff --quiet -- test/ui/journey.mjs` + 断言计数只增不减 |
| v1 既有体积门禁 | `test/perf-baseline.ts` / `test/perf-budget.test.ts` | **零删改**（`git diff --quiet`）；V2 体积守卫另建新文件，与 D31 解耦 |
| 既有 DOM 契约 | `index.html` 既有 id/类 | append-only；grep 断言既有集合全命中 |

---

## 4. 执行策略

### 4.1 门禁串行纪律（NFR-V2-009，绝不并发）

```bash
npm run build --workspace @lgdl/web-cli-plugin
npm test --workspace @lgdl/web-cli-plugin
npm run test:ui --workspace @lgdl/web-cli-plugin        # v1 旅程回归（串行）
npm run test:insight --workspace @lgdl/web-cli-plugin   # V2-2 新增（串行）
npm run test:binding --workspace @lgdl/web-cli-plugin   # 串行
# 任何一步 fail 即停，修复后从头串行重跑；Chromium 类门禁绝不并发（OOM 前科）
```

### 4.2 文件所有权（防并行冲突）

- `src/ui/sidepanel/index.html` → TASK-001 追加（既有标记零改名），TASK-010 grep 核验；
- `src/ui/tree/tree-view.ts` → TASK-002 **建立**，V2-3-TASK-003 **MODIFY**（跨叶子串行，V2-3 在后）；
- `src/ui/tree/tree-drawer.ts` → TASK-004 **建立**，V2-3-TASK-004 **MODIFY**（跨叶子串行）；
- `src/ui/sidepanel/sidepanel.ts` → TASK-005 单任务所有权；
- `test/size-baseline.ts` → TASK-006 建立、TASK-008 登记实测值（同叶子串行）；
- `docs/smoke-checklist.md` → TASK-011 追加 v2 §，V2-3-TASK-010 追加 V2-3 人工面（跨叶子串行）。

### 4.3 编排器代作者决策登记（2026-09-13 授权）

| # | 事项 | 裁决 |
|---|------|------|
| TD-V22-01 | 布局口径 | `#log` 稳态 `clientHeight` **≥589px 主断言** + 占比 **≥65.0% 次断言**（ADR-V2-006；spec `AC-V2-002` 已订正） |
| TD-V22-02 | 门禁承载 | 新断言落 **新文件** `test/ui/insight.mjs`（`#I-01…`），v1 `journey.mjs` 零改动（只增不减） |
| TD-V22-03 | 基线登记 | `size-baseline.ts` 由 TASK-006 建（v1 基线 1_068_165）；TASK-008 **build 后实测重登**并注明日期/来源 |
| TD-V22-04 | 体积守卫 | **另建新文件**，显式与 v1 未达成项 D31 解耦；不重构 v1 `perf-baseline.ts`/`perf-budget.test.ts` |
| TD-V22-05 | 波次 | 叶内 4 波（跨叶子 Wave 6~9）；门禁执行串行 |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。V2-2 plan §3.1~3.7 → **11 个原子任务 / 4 波**（append-only 标记/样式 / 纯渲染模型 / tree-view 纯测 / 惰性 tree-drawer / sidepanel 挂载+script / 体积守卫 / test:insight 量化门禁 / 基线实测登记 / 串行收口 / grep 契约门禁 / 人工面清单）。门禁：`test/ui/insight.mjs`（新文件，不改 v1 journey.mjs）+ `tree-view` 纯测 + `size-budget`（新基线文件，与 D31 解耦）。布局口径按 ADR-V2-006（589px 主 / ≥65.0% 次）。承接父 plan ADR-V2-004/005/006/007/011/013/015。 | 2026-09-13 | SDDU Tasks Agent |
