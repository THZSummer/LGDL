# 技术计划：specs-tree-v2-2-floating-tree-ui（V2-2 悬浮连接树 UI 与交互）

> **文档定位**: SDDU 技术方案（**叶子子 Feature**，P0）——记录 V2-2 的架构设计、方案对比与 ADR，作为 tasks 阶段的输入
> **前置依赖**: 父 `spec.md` §5.3（FR-V2-020~025 权威条文）+ 本目录 `spec.md`（含量化阈值）+ **V2-1 的树模型**（`src/insight/*`）+ 父 `plan.md`（ADR-V2-001~015）
> **创建人**: SDDU Plan Agent · **创建时间**: 2026-09-13 · **版本**: v1.0 · **更新人/时间**: SDDU Plan Agent / 2026-09-13
> **更新说明**: 初始创建。侧栏常驻悬浮入口（FAB）+ 树抽屉；四维度导航 / 状态徽标 / 检索过滤 / 空态可读；**不注入页面**、**不放进设置面板**、**不遮挡 composer / 消息区不回退 / 窄侧栏零水平溢出**；体积守卫。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 父 `spec.md`（FR-V2-020~025）与本目录 `spec.md` 存在 | ✅ |
| 外部 API 文档缓存 | ⚠️ N/A |
| V2-1 树模型接口已定义（`ConnectTreeSnapshot`） | ✅（V2-1 plan §3.1） |
| v1 侧栏三区布局与 `scroll-policy` 基线已核实（589px / +8px / 0 溢出） | ✅（父 plan §2.1） |

---

## 2. 架构分析

### 2.1 现状约束（必须共存、不得回退）

- `#panel-main` 已 `position: relative`，是 `#log` 的父容器；`#panel-top` / `#panel-bottom` 为固定区；`#composer` 是 `#panel-bottom` 的**末元素**（D-079 前科修复结果）。
- `#scroll-bottom` 定位 `right:12px; bottom:12px`（`#panel-main` 内 absolute）。
- `#settings-view` 是并列 section，`body.settings-open` 时隐藏三区（V2-2 **不复用**该机制）。
- `#log` 稳态 589px、composer 贴底 +8px、水平溢出 0（父 plan §2.1）。

### 2.2 目标：覆盖式抽屉 + 常驻 FAB（结构上不动三区几何）

```
#panel-main (position:relative)
├── #log                  (flex:1 1 auto；唯一滚动区) —— 不变
├── #scroll-bottom        (absolute right:12px bottom:12px) —— 不变
├── #tree-fab             (absolute left:12px bottom:12px) —— 新增，与 #scroll-bottom 左右分居
└── #tree-drawer          (absolute inset:0 0 0 auto；覆盖在 #log 之上) —— 新增，独立滚动
```

抽屉是 `#panel-main` 的 **absolute 子元素**（不参与 flex 流）→ **在结构上不可能挤压 `#log` 高度或把 `#composer` 挤出视口**。

### 2.3 与消息面的关系（open point 3 裁决）

**覆盖层（overlay）**，非内联展开、非视图切换：

| 形态 | 是否采用 | 理由 |
|------|:--:|------|
| 覆盖层（overlay，`#panel-main` 内 absolute） | ✅ | 三区几何零变化；关闭态 `display:none` 零开销；可随时开合 |
| 内联展开（写进 `#log`） | ❌ | 污染消息流与滚动跟随；撤销回执混入对话 |
| 视图切换（复用 `body.settings-open`） | ❌ | 需隐藏三区 + 同步滚动锚点/草稿 → 既有旅程回归面大 |

### 2.4 数据流

```
#tree-fab click ─► tree-drawer.open()
     ├─ 首开：sendMessage('insight-tree') → ConnectTreeSnapshot（V2-1）
     ├─ buildTreeRows(snapshot, filter)  （纯渲染模型）
     └─ render（惰性 mount；关闭态 [hidden] 零渲染）
订阅：'insight-changed' / 'capability-changed' / 'session-changed' / 'probe-changed' → 重投影（EC-V2-013）
过滤：只改 buildTreeRows 的展示集合，不触 snapshot / 授权状态（FR-V2-022）
```

- `state.insight?`（可选小摘要）用于 FAB 徽标（如「N 个站点已授权」）与首屏提示，**不**承载全量快照。

---

## 3. 分模块技术方案

### 3.1 `src/ui/sidepanel/index.html`（标记 + 样式，append-only）

- **追加** `#tree-fab` 与 `#tree-drawer`（位于 `#panel-main` 内、`#log`/`#scroll-bottom` 之后）。
- **追加** CSS（沿用 v1 design tokens `--accent`/`--border`/`--bg-elevated`/`--radius` 等，明暗自动适配）：
  - `#tree-fab { position:absolute; left:12px; bottom:12px; z-index:6; border-radius:999px; padding:6px 12px; box-shadow:var(--shadow); }`
  - `#tree-drawer { position:absolute; inset:0 0 0 auto; width:min(340px,100%); max-height:100%; overflow-y:auto; overflow-x:hidden; min-width:0; z-index:7; background:var(--bg-elevated); border-left:1px solid var(--border); }`
  - `#tree-drawer[hidden] { display:none; }`
  - 抽屉头/过滤/分组/行/徽标/控件样式；`overflow-wrap:anywhere`（继承 body，窄栏可读）。
- **零重命名**既有 id / `.entry-*` / `.msg-*` / `.tool-*`（FR-V2-024，grep 门禁）。

### 3.2 `src/ui/tree/tree-view.ts`（纯渲染模型，node 可测）

```ts
export interface TreeRow { id: string; depth: 0|1|2; label: string; sublabel?: string;
  badges: Badge[]; controls: ControlDescriptor[]; emptyHint?: string; crossRefs: string[]; }
export interface TreeRenderModel { header: { modelNote: string; noEscalationNote: string };
  groups: { dimension: Dimension; label: string; count: number; rows: TreeRow[] }[];
  filter: { query: string; matches: number }; }
export function buildTreeRows(snapshot: ConnectTreeSnapshot, filter?: TreeFilter): TreeRenderModel;
export function needsConfirmation(actionId: TreeActionId): boolean;   // ADR-V2-013
```

**结构保证（ADR-V2-011）**：
- 命令 `action==='deny'` → 该行 `controls === []`（无开关、无覆盖）；
- 静态权限节点 → `controls` **不含** `revoke`，并携带 `revokeHint`（如实披露不可逐项撤销）；
- `header.modelNote` 恒含「四维度分组视图（森林），非严格树」；`header.noEscalationNote` 恒含「撤销/关断 = 回到更保守，**不放宽**任何门禁；`delay` = `deny`（fail-closed）」。
- 过滤：`TreeFilter = { dimension?: Dimension; query?: string; action?: 'allow'|'ask'|'deny'; sourceKind?: SourceKind }`；**纯函数、不改真值**。

### 3.3 `src/ui/tree/tree-drawer.ts`（DOM 挂载，惰性）

- `mountTreeDrawer({ root, doc, ops, onNotice })` → `handle { open(), close(), toggle(), refresh(), setFilter(f) }`。
- **惰性**：`#tree-fab` 首次点击才 `sendMessage('insight-tree')` + 建 DOM；关闭态 `hidden`（无渲染、无轮询）。
- 订阅：`sidepanel.ts` 的既有 `onMessage` 中**追加**分支 → `handle.refresh()`（既有分支零改动）。
- 键盘可达：FAB `aria-expanded`/`aria-controls`；Esc 关闭；关闭后焦点回 FAB。
- 渲染用 `textContent`/`createElement`（**零 `innerHTML`**，防 XSS；与 v1 消息渲染一致）。

### 3.4 `src/ui/sidepanel/sidepanel.ts`（挂载，append-only）

- 在 `wire()` 末尾**追加** `mountTreeDrawer(...)` 与 `visibilitychange`/`focus` 侧的必要刷新挂接（既有 handler 不改）。
- `applyEnvGuard` 的禁用列表**追加** `#tree-fab`（非扩展环境禁用，与既有按钮一致）。
- **不改** `render()` / `#log` 重建逻辑 / `scrollFollow` / 既有 `#revoke` / `#audit`。

### 3.5 布局量化口径（ADR-V2-006）

| 指标 | 断言 | 备注 |
|------|------|------|
| `#log` `flex-grow` | `=== '1'` | 非 45vh |
| `#log` 稳态 `clientHeight` | **≥ 589px**（主） | v1 基线，绝对量 |
| `#log` 稳态占比 | **≥ 65.0%**（次） | 589/900 = 65.44%；spec「65.5%」为进位（见 ADR-V2-006） |
| `#composer` 底边 − 视口底 | **∈ [0, +8px]** | 不得为负（D-079） |
| `#tree-fab` ∩ `#composer` | boundingRect 交面积 **= 0** | 结构保证（不同 flex 区） |
| 文档 / `#log` / 抽屉水平溢出（400px、320px） | **= 0** | |
| 抽屉**开/关两态** | 上表全部复用 | 证明开抽屉不挤压消息区 |
| v1 `#15a~#15q` | **零删减** | `test:ui` 原文件不改 |

### 3.6 体积守卫（ADR-V2-007）

- `test/size-baseline.ts`：`SIDEPANEL_BASELINE_BYTES=1_068_165`、容差 **5%**、`SIDEPANEL_CEILING=1_121_573`；`SIDEPANEL_BASELINE_META = { kind:'regression-baseline-only', targetBudgetBytes:null, targetMet:null }`；`CONTENT_MAX_BYTES=1_073_453`（**不增长**）。
- `test/size-budget.test.ts`：sidepanel ≤ ceiling；content ≤ 1,073,453；反证（ceiling+1 / 1,073,454 → FAIL）；只吞 ENOENT；基线≠目标预算。
- 基线在 **build 之后实测登记**；无意增重不得改容差或删断言。

### 3.7 additive 消息（ADR-V2-004）

- `insight-tree`（pull，抽屉首开/刷新）；`insight-changed`（push，触发重投影）；`state.insight?`（可选摘要，FAB 徽标）。
- `messaging.ts` 仅追加 kind；既有消费者零破坏。

---

## 4. 方案对比（P-V2-02）

| 维度 | 方案 A：`#panel-main` 内 absolute FAB + 覆盖式抽屉 | 方案 B：`position:fixed` 视口悬浮 | 方案 C：复用 v1 视图切换（隐藏三区） |
|------|:--|:--|:--|
| 描述 | FAB/抽屉相对 `#panel-main`（已 relative）定位 | 相对视口 `fixed` | `body.tree-open` 隐藏三区，全屏抽屉 |
| 优点 | **结构上不可能遮挡 composer**；零几何影响；关闭零开销 | 实现直观、视觉不受裁剪 | 与设置一致 |
| 缺点 | 抽屉视觉受 `#panel-main` 裁剪 | 与 composer 同层；需额外断言/补偿（D-079 风险） | 需同步滚动锚点/草稿；改变既有旅程 |
| 风险 | 低 | 中 | 中高 |
| 工作量 | 低 | 低 | 中 |

**补充对比（消息面，P-V2-03）**：A（覆盖层 + 新 `insight-tree` pull）vs B（全量塞 `state`）vs C（抽屉直连 `chrome.storage`）。A 胜出：additive 最强、按需拉取、无越权读（详见父 plan §4.3 / ADR-V2-004）。

---

## 5. 推荐方案

**推荐方案 A（4.2）+ 消息面 A（4.3）**。理由：以**结构**而非补偿手段保证「不遮挡 composer / 消息区不回退」（D-079 前科不再可能）；覆盖层关闭态零开销满足 NFR-V2-005；不与 v1 设置视图机制耦合，既有旅程零回归。（对应父 plan ADR-V2-004/005/006/007。）

---

## 6. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 追加 FAB + 抽屉标记与样式（**既有 id/类零重命名**） |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-view.ts` | 纯渲染模型（rows/badges/controls/filter/确认判定） |
| NEW | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | DOM 挂载（惰性 / 开合 / 重投影 / 键盘可达） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 追加挂载与订阅（既有 handler 零改动） |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` | 追加 `insight-tree` / `insight-changed` kind |
| MODIFY | `packages/web-cli-plugin/src/background/state-message.ts` | 追加可选 `insight?: InsightSummary` |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | 追加 `case 'insight-tree'` + `insight-changed` 推送 |
| NEW | `packages/web-cli-plugin/test/size-baseline.ts` | sidepanel 回归基线 + content 上限（复用只吞-ENOENT） |
| NEW | `packages/web-cli-plugin/test/size-budget.test.ts` | 体积守卫 + 反证自测 + 基线≠目标预算 |
| NEW | `packages/web-cli-plugin/test/ui/insight.mjs` | `test:insight`：FAB/抽屉 + AC-V2-002 收紧量化 |
| MODIFY | `packages/web-cli-plugin/package.json` | 追加 `test:insight` script（依赖零新增） |

**不改**：`options.html`、`manifest.json`、`policy.ts`、`auto-authorize.ts`、`packages/web-cli-base/**`、v1 SDDU 目录、v1 `test/ui/journey.mjs`（断言零删减）。

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| 抽屉/FAB 遮挡 composer（D-079 回归） | 中 | 高 | 结构保证（不同 flex 区）+ `test:insight` 硬断言（composer ∈[0,+8]、FAB∩composer=0、开/关两态） |
| `#log` 高度占比口径矛盾（65.5% vs 65.44%） | 高（已发生） | 中 | ADR-V2-006：绝对量 589px 主 + ≥65.0% 次；登记口径修正 |
| `sidepanel.js` 体积增长 | 中 | 中 | 5% 基线守卫 + 反证自测；content 硬上限 1,073,453 |
| 既有 DOM 契约被改（id/类重命名） | 低 | 高 | append-only + grep 门禁 + v1 `#15a~#15q` 零删减 |
| 抽屉内 `innerHTML` 引入 XSS | 低 | 高 | 只 `textContent`/`createElement`；grep 断言无 `innerHTML` |
| 状态过期（EC-V2-013） | 中 | 中 | 订阅既有推送 + `insight-changed` 即时重投影；无法订阅时给刷新路径 |
| 窄栏水平溢出（320px） | 中 | 中 | `min-width:0` + `overflow-x:hidden` + `overflow-wrap:anywhere` + 320px 断言 |
| 门禁并发 OOM | 中 | 高 | 串行纪律；本设计阶段不跑 Chromium 门禁 |

---

## 8. 生成的 ADR

本叶子**不新开 ADR**，承接父 `plan.md`：

| ADR | 标题 | 与本叶子关系 |
|-----|------|-------------|
| ADR-V2-004 | 消息面 additive（`insight-tree` / `insight-changed` / `state.insight?`） | 本叶子数据通路（P-V2-03） |
| ADR-V2-005 | `#panel-main` 内 absolute FAB + 覆盖式抽屉 | **本叶子主决策**（P-V2-02） |
| ADR-V2-006 | 侧栏不回退量化口径（589px 主 / ≥65.0% 次） | 本叶子布局门禁 |
| ADR-V2-007 | 体积守卫（基线≠目标预算 / 只吞 ENOENT / 反证自测） | 本叶子体积门禁（P-V2-04） |
| ADR-V2-011 | `deny` 不可关 / 静态权限不可撤销 = 渲染模型结构保证 | 本叶子 `controls` 语义 |
| ADR-V2-013 | 二次确认范围（不可逆需确认 / 开关不需） | 本叶子 `needsConfirmation` |
| ADR-V2-015 | 来源约束（导入白名单 + 禁改面） | 本叶子门禁 |

### 交付门槛（本叶子）

**可自动化验收面**

| 门禁 | 断言要点 | 量化口径 |
|------|----------|----------|
| `test/ui/insight.mjs`（`test:insight`，真实 dist） | FAB 存在且可开合；四维度可见 + 徽标；空态可读；`#log` flex-grow=1；`#log` ≥589px / ≥65.0%；composer ∈[0,+8]；FAB∩composer=0；400/320px 溢出=0；抽屉开/关两态；「撤销≠放宽」文案；deny 无开关 | 逐条硬阈值 |
| `npm run test:ui`（回归） | v1 `#15a~#15q` 断言**零删减** | 断言计数只增不减 |
| `test/size-budget.test.ts` | sidepanel ≤1,121,573；content ≤1,073,453；反证；只吞 ENOENT | 见 ADR-V2-007 |
| `test/tree-view.test.ts`（纯，随 `npm test`） | `buildTreeRows`：deny → `controls=[]`；静态权限无 `revoke`；文案含模型声明与不放宽声明；过滤只读 | 全量 142 子命令遍历 |
| grep 门禁 | 既有 id/类零重命名；无 `innerHTML`；`options.html` 零 diff | 零命中 |

**人工面**

| # | 人工面 | 说明 |
|---|--------|------|
| H-A | 悬浮观感 / 抽屉进入退出动画 / 明暗主题观感 | 视觉与感知判断 |
| H-B | 长站点名 / 长文案 / 320px 窄栏字重与拥挤度 | 观感 |
| H-C | 多显示器 / 高 DPI 下 FAB 位置观感 | 环境相关 |
| H-D | 键盘/焦点遍历的真实体感（Tab / Esc / 焦点回归） | 需真实交互判断 |

---

## 9. R2 技术设计修订（V2-2 UI 侧；post-validate，phase 不回退；2026-09-13）

> **输入**：本叶 `spec.md` v2.0（R2，承载父 `FR-V2-072/073/077/078` 的 UI 侧）+ 父 `plan.md` §9/§10（ADR-V2-024~033）。

### 9.1 R2 目标

- 树抽屉从「分组标题 + 扁平列表」改为**真层级树**（逐层展开/收起 + 键盘可达 + `aria-expanded` + 面包屑/缩进）。
- 命令节点**逐层可操作**（allow/ask/deny 控件；硬底线零控件 + 原因可读）。
- 两通路文案 + 偏差文案清除；`delay` 消歧保留。
- **布局守卫全部保持**：AC-V2-002（`#log ≥589px` / composer ∈[0,+8] / FAB∩composer=0 / 400·320px 溢出=0 / 开·关 drift=0）**不回退**。

### 9.2 模块改动

| 文件 | R2 改动 | ADR |
|------|---------|-----|
| MODIFY `src/ui/tree/tree-view.ts` | 渲染模型改为**嵌套节点**（`groups[].nodes`）+ 命令 `command-policy` 控件 + `clampReason` 文案 + 新 `TREE_MODEL_NOTE`/`TREE_NO_ESCALATION_NOTE` | ADR-V2-028/030/032 |
| MODIFY `src/ui/tree/tree-drawer.ts` | `role="tree"/"treeitem"` + `aria-expanded`/`aria-level` + 会话 `expanded:Set` + 键盘代理 + 面包屑 + 分层控件渲染 + `#tree-clamp-reason` | ADR-V2-029/030 |
| MODIFY `src/ui/tree/tree-ops.ts` | 白名单 9 + `set/reset-command-policy` 两分支（唯一消息通路） | ADR-V2-027 |

**不改**：`#panel-main` 三区骨架、`#tree-fab`/`#tree-drawer` 的 absolute 覆盖层定位、`#scroll-bottom`、既有 id/`.entry-*`、`innerHTML` 纪律（零 `innerHTML`）。

### 9.3 关键实现约束

1. **自建 tree**（否 `<details>`）：逐层 `aria-expanded` 是 NFR-V2-011 硬要求。
2. **惰性渲染**：仅渲染祖先链 + 已展开节点；收起不建 DOM；不虚拟化。
3. **展开态会话保持**：`expanded:Set<nodeId>` 在抽屉会话内保持，重投影回放（EC-V2-006）。
4. **写路径唯一**：控件点击 → `tree-ops`（白名单）→ 既有/新增消息；UI **不做本地判定**（服务端 clamp）。
5. **布局**：树在 `#tree-body`（自身滚动，`overflow-x:hidden`、`min-width:0`、缩进上限）→ 三区几何与 AC-V2-002 全量复用（开/关 drift=0）。
6. **偏差文案清除**：`TREE_MODEL_NOTE` / `TREE_NO_ESCALATION_NOTE` 重写；`delay` 消歧句保留（单源 + pin 更新）。

### 9.4 断言取代（本叶，removed=0；对应父 §9.8 S4~S8、S13~S16）

| 旧（`tree-view.test.ts` / `insight.mjs`） | 理由 | 新 |
|----|------|----|
| `a non-deny command still gets no write control` | 命令可覆盖 | 可覆盖行有 allow/ask/deny；硬底线行零控件 |
| `pinned wording`（森林 + 撤销≠放宽） | 文案重写 | 归属层级树 + 两通路（`delay` 消歧保留） |
| `needsConfirmation … 7 actions` | 9 动作 | 9 动作 + 放宽类确认 |
| `deny rows zero controls` | 分层 | 硬底线零控件 / 非硬底线有控件（含过滤态） |
| `#I-11a` / `#I-12` / `#I-18e` / `#I-02a` | R2 | `#I-11a~c` / `#I-12a~b` / 分层 `#I-18e` / `#I-02a`（逐层展开）+ 新增 `#I-20a…`（键盘/面包屑/分层） |
| v1 `journey.mjs` / `#15a~#15q` | **不变** | 零删改 |

---

## 10. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| **v2.0** | **R2 技术设计修订（post-validate；phase 不回退；编排器代作者决策 2026-09-13 授权）**：新增 §9 —— 真层级树渲染模型（嵌套节点 + 自建 `role=tree` + 键盘 + 面包屑 + 惰性渲染）+ 命令逐层可操作控件 + 分层 deny 控件 + 两通路文案；布局守卫 AC-V2-002 全量保持；断言取代（removed=0；`journey.mjs` 零改动）。承接父 ADR-V2-027/028/029/030/031/032。 | 2026-09-13 | SDDU Plan Agent（R2） |
| v1.0 | 初始创建。V2-2 技术方案：`#panel-main` 内 absolute FAB + 覆盖式抽屉（结构上不遮挡 composer）；additive 消息；纯渲染模型结构保证 deny 无开关；侧栏不回退量化口径（589px 主 / ≥65.0% 次）；体积守卫（基线≠目标预算）；文件影响与可自动化/人工面。承接父 plan ADR-V2-004/005/006/007/011/013/015。 | 2026-09-13 | SDDU Plan Agent |
