# 技术计划：specs-tree-web-cli-plugin-v3-ui（web-cli-plugin v3「UI 渐进式披露升级」；父 Feature 统领性技术方案）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: 父 `spec.md` v1.0（**权威条文单一事实源**：65 FR-V3 / 18 NFR-V3 / 17 EC-V3 / 27 AC-V3 / 17 NG-V3）+ `discovery.md` v1.0（Q-UI-001~012 / R-UI-001~014 / A-UI-001~010 / O-UI-001~006）+ 4 个叶子子 spec（v3-1 / v3-2 / v3-3 / v3-4）；设计基准 `packages/web-cli-plugin/design/ui-redesign/option-e-progressive.html`（209,373 B，untracked，本轮零改动）；先例 = v2 `plan.md`（ADR-V2-001~033 + 断言取代策略 S1~S20）与 `docs/r2-supersession-ledger.json`（台账 schema）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（v3「UI 渐进式披露升级」统领性技术方案：父 `plan.md` + 4 个叶子 `plan.md` 同批产出；覆盖编排器指定 11 项议题；ADR-V3-001~036）。**本任务只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`manifest.json`·`design/**`、不改 v1/v2 SDDU 目录、不改 ROADMAP（只登记）、不动 `main`、不 commit/push、**不跑门禁/构建/Chromium**。

web-cli-plugin v3 技术方案 —— 把侧栏默认首屏从「全部能力平铺」改为「随用随取」的三层披露（L0 常驻 / L1 就地展开 / L2 按需视图），以**风险与状态永不折叠**为铁律。核心工程难点 = ① 在三元组硬约束（`content.js` **177,076 B 余量 0 无容差** / manifest 静态权限零新增且不引入 `contextMenus` / 安全判定链 sha256 pin 不得变）下落地；② 把密度从「设计稿观感」变成**可机器复算且能真 FAIL 的门禁**；③ 在 `journey.mjs` / `insight.mjs` / `binding.mjs` / `sidepanel-view.test.ts` 大量直接钉住当前 DOM 的前提下，做到**零删除、零降级、计数不减**的取代迁移。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 父 `spec.md` 存在（`.sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/spec.md`，80,022 B） | ✅ |
| 4 个叶子 `spec.md` 存在（v3-1 14,116 B / v3-2 13,989 B / v3-3 14,021 B / v3-4 15,650 B） | ✅ |
| `discovery.md` 存在（48,245 B；含 R-UI-001~014 与 §7.2 断言耦合台账） | ✅ |
| 设计基准存在（`design/ui-redesign/option-e-progressive.html` 209,373 B；`index.html`（密度口径出处）26,905 B；D 稿（高密度参照物）266,133 B） | ✅ |
| 先例可读（v2 `plan.md` 128,963 B / `docs/r2-supersession-ledger.json` 8,864 B） | ✅ |
| **外部 API 文档缓存** | ⚠️ **N/A（0 个外部服务 API）** —— 见下方说明 |
| 红线基线核对（`main` = `2ddc922` 未动；分支 `feature/web-cli-plugin` @ `c2c0e0d`） | ✅ |
| v1 `specs-tree-web-cli-plugin/**`、v2 `specs-tree-web-cli-plugin-v2-insight/**` 只读参与 | ✅ |
| `packages/web-cli-base/**` / `manifest.json` / `design/**` 本轮零改动 | ✅ |
| 编排器定论已收录为设计约束（设计基准 = E 稿 · 风险位绝对常驻 · 内核三条 · 三元组约束 · 页面侧首选按需注入 · ROADMAP 方案 A · 密度三档 · 取代策略四项 · 计数下界 ≥646） | ✅ |

**「外部 API 文档缓存」检查的适用性说明**（本 Feature 与 v2 同形，但需逐条举证）：

| 问题 | 结论 |
|------|------|
| spec 是否引用外部服务 API？ | **否**。扫描父 spec 全文：**0 个待新增的外部 HTTP API 调用**。唯一出现的外部域 = `manifest.json#host_permissions` 的 6 个 LLM 供应商域（`api.deepseek.com` / `dashscope.aliyuncs.com` / `ark.cn-beijing.volces.com` / `api.hunyuan.cloud.tencent.com` / `api.openai.com` / `api.anthropic.com`）——**v1 已实现且本 Feature 零改动（NG-V3-003 / AC-V3-017 零 diff）**，不存在「未缓存的外部 API 契约」。 |
| 本 Feature 的真值来源是什么？ | **进程内状态源 + Chrome 扩展 API**（`chrome.storage` / `chrome.permissions` / `chrome.tabs` / `chrome.scripting`）+ 设计基准 HTML + 既有构建产物。**不需要 `.sddu/api-docs/` 缓存**。 |
| O-UI-001（外部竞品调研未完成）是否阻塞本 plan？ | **不阻塞**。该 Provider 在**发出业务请求之前**因本地配置/脚本缺陷失败（未定义常量 `AGENT_PLAN_URL`，line 485 / line 281 两处 `NameError`；环境无 `WEB_SEARCH_API_KEY`），原始错误逐字保留于 discovery §4.1。父 spec §12.1 已裁决「非阻塞、保持开放」，且**本 Feature 不依赖任何外部竞品结论**（设计基准 = E 稿，D1）。**本 plan 未据此编造任何竞品事实**，亦未调用任何受管 Provider。 |
| 设计稿是否需要「缓存」？ | 设计基准与 4 稿对照物**均在仓库内**（`design/ui-redesign/**`，untracked、本轮零改动），不需要外部缓存；其**纳入版本库**由 FR-V3-005 规定、提交由编排器统一执行（本 plan 只登记，ADR-V3-012）。 |

**⚠️ 偏差登记 1（必须显式，不静默）**：父 spec **FR-V3-002** 规定「父 Feature 为轻量规范容器：只承载 `spec.md`（+ 下游聚合报告），**不产出** `plan.md` / `tasks.md` / `tasks.json`，不承接 build / review / validate 操作」。**本轮编排器指令明确要求「产出父 `plan.md` + 4 个叶子各自的 `plan.md`」**。本 plan 的处理：

1. **执行编排器指令**（产出父 `plan.md`），因为它是本 Feature 的**统领性技术方案**——11 项跨叶议题（三层边界 / 密度门禁 / 风险位机制 / 引用失效 fail-closed / 按需注入与体积核算 / 右键自绘 / 取代台账 / 主题与无障碍 / tokens·DOM 迁移边界 / 叶子顺序与 spike / 体积重登记流程）只能在父层一次性定稿，否则 4 个叶子会各自发明一套并漂移；
2. **登记为偏差**（ADR-V3-002 + 本节），并**明确 FR-V3-002 的可操作内核仍被遵守**：父**不产出** `tasks.md` / `tasks.json`，**不承接** build / review / validate，实施仍由 4 个叶子承载；
3. 父 plan 的定位 = **接口与契约的定义者**（ADRs 与门禁口径），**不是实施载体**（不排任务、不写代码）。此偏差如实登记，供编排器 / review 阶段核验。

**⚠️ 偏差登记 2（spec 未决点在本 plan 的裁决，逐条可追溯）**：

| 来源 | 未决点 | 本 plan 裁决 | 落点 |
|------|--------|-------------|------|
| 父 §12.2 #1 | 页面侧交互层的具体实现形态（落点与触发、隔离策略、定位算法） | 第 5 个 esbuild entry `dist/pick-layer.js` + `chrome.scripting.executeScript` 按需注入（**面板在场** + 「从页面拾取」点击**双触发**、幂等）+ Shadow DOM 隔离 | ADR-V3-030 / ADR-V3-033（v3-4） |
| 父 §12.2 #2 | 密度门禁的实现载体 | 三段式：Chromium 门禁 `test/ui/density.mjs` + 口径单源 `test/ui/density-metrics.mjs` + 无 Chromium 常量门禁 `test/density-thresholds.test.ts`；**不触碰既有 4 个 `test/ui/*.mjs`** | ADR-V3-003 / ADR-V3-004（父）+ ADR-V3-015（v3-1） |
| 父 §12.2 #3 | 「首装态 9 / 20」首轮实测校准 | 首轮实测登记为基线（只允许收紧）；档位定义与夹具在 v3-1 落地 | ADR-V3-018（v3-1） |
| 父 §12.2 #4 | 取代台账文件名与门禁挂载点 | `packages/web-cli-plugin/docs/v3-supersession-ledger.json` + 门禁 `test/supersession-ledger.test.ts` | ADR-V3-007（父） |
| 父 §12.2 #5 | L1 局部树与 L2 全局树的边界与数据复用 | 局部树复用 v2 `ownership-tree` 的主归属链裁剪（≤3 节点）；全局树 = L2 视图（同一快照、不同归属） | ADR-V3-022（v3-2）/ ADR-V3-025（v3-3） |
| 父 §12.2 #6 | 「风险增量预算只能被风险类元素占用」的归属判定 | `data-risk-class` / `#risk-rail` 归属 + 档位差值集合（风险态 − 默认态）逐元素判定 | ADR-V3-005（父）+ ADR-V3-015（v3-1） |
| V31-O-1~4 / V32-O-1~4 / V33-O-1~4 / V34-O-1~5 | 各叶开放点 | 逐叶在对应叶子 `plan.md` 裁决并登记 | 各叶 plan §4 |
| discovery §7.4 O-UI-003 | 「按需注入」的实现细节 | 见 ADR-V3-030；**明确定义「按需」的语义边界**（不进 `content.js` ∧ 未授权站点零注入 ∧ 面板在场期间注入 ∧ 面板关闭即卸载） | ADR-V3-030（v3-4） |

---

## 2. 架构分析

### 2.1 现状基线（**本轮只读实测，逐文件核实**）

| 事实 | 值 | 来源 |
|------|-----|------|
| 侧栏 DOM | `src/ui/sidepanel/index.html` = **909 行** / **54 个 `id`** / 4 个 `<body>` 直接子元素（`#panel-top` / `#panel-main` / `#panel-bottom` / `#settings-view`） | 本轮实测 |
| 三区几何 | `body{display:flex;overflow:hidden}`；`#log` 唯一滚动容器（`flex:1 1 auto`）；`#panel-bottom{flex:0 0 auto}`，`#composer` 为其末元素（`#consent-slot` 之上） | `index.html` + `test/sidepanel-view.test.ts:601-619` |
| 主题 tokens | `:root` 内 **249 处 `--*` 引用**，`@media (prefers-color-scheme: dark)` 提供暗色覆盖，`color-scheme: light dark` | `index.html:20-56` |
| 既有「选择题」基建 | **已存在** `#ask`（`#ask-prompt` / `#ask-options` / `#ask-input` / `#ask-submit` / `#ask-cancel`）——v1 的问答卡（含兜底输入 + 提交/取消） | `index.html:878-887` |
| 既有确认卡基建 | `#confirm` / `#confirm-summary` / `#confirm-allow` / `#confirm-deny` | `index.html:869-876` |
| 既有风险/提示位 | `#env-guard`(role=alert) / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` / `#send-reason` / `#consent-slot` | `index.html:855-891` |
| 既有 v2 树入口 | `#tree-fab`（`aria-controls="tree-drawer"` `aria-expanded="false"` `aria-haspopup="dialog"`）+ `#tree-drawer`（`role="dialog"` `aria-modal="false"`，`#panel-main` 内 absolute 覆盖式抽屉） | `index.html:849-850` |
| 构建形 | `build.mjs`：**4 个 entryPoint**（background ESM / content IIFE / sidepanel IIFE / options IIFE），**无 `minify`**（产物为未压缩 IIFE） | `build.mjs` |
| 体积（硬） | `dist/content.js` = **177,076 B = `CONTENT_MAX_BYTES`**（无容差）；`dist/sidepanel.js` = **266,500 B**（基线 266,500 / ceiling 279,825，容差 5%，`targetBudgetBytes`/`targetMet` = `null`） | `test/size-baseline.ts` |
| 内容冻结 | `CONTENT_SOURCE_SHA256` 冻结 `src/content/{content-script,dom-agent,page-bridge}.ts`（**三文件内容 hash，含空白**） | `test/size-baseline.ts` |
| 注入现实 | **登记式零注入**：绑定 + 站点权限授予后 `registerContentScripts({persistAcrossSessions:true})` 按 origin 登记 `js:['content.js']`；**无静态 `content_scripts`** | `src/background/content-script-registry.ts:98-100` |
| **既有执行注入通路** | `chrome.scripting.executeScript({target:{tabId}, files:['content.js']})` **已在用**（图标点击路径，`service-worker.ts:920`）→ 「第 N 个按需文件」是既有机制的延伸，**零新增权限** | `service-worker.ts:920` |
| 权限面 | 静态 `activeTab/scripting/storage/sidePanel/tabs`；可选 `bookmarks/downloads/notifications/clipboardRead/clipboardWrite`；`optional_host_permissions: http://*/* · https://*/*`；host_permissions 6 LLM 域；**无 `contextMenus`** | `manifest.json` |
| 测试基线（全绿） | 插件单测 **696** · base 490 · 全仓 **1686（1 skip）** · `test:insight` **108** · `test:ui` journey **167** · `test:hardening` **24** · `test:binding` **192** · `test:e2e` PASS | 编排器给定 + discovery §7.1 |
| 既有断言的 DOM 耦合 | journey `querySelector` 32 / `getElementById` 134；insight 118 / 42；binding 25 / 63；`sidepanel-view.test.ts` **38 用例含 4 项布局契约** | discovery §7.2 |
| 计数下界守卫 | `test/insight-tree-hierarchy.test.ts#currentNodeTestCount()` 要求 `current ≥ 646` | discovery §7.2 |
| 现有门禁的「测量口径」先例 | `test/ui/insight.mjs:247-305` 的 `MEASURE` / `RAW_MEASURE`（CDP 注入 IIFE 字符串）+ `checkLayout()`（`logFlexGrow==='1'` / `logClientHeight ≥ 589` / `logRatio ≥ 65.0` / `composerGapToBottom ∈ [0,8]` / `fab∩composer = 0` / 零水平溢出） | 本轮实测 |
| 既有 helper 的事实 | `test/ui/{journey,insight,binding,hardening}.mjs` **各自内联**自己的 `connectCdp/evaluate/check/realClick/waitFor`（无共享模块） | 本轮实测 |
| 设计稿的密度钩子 | E 稿 `window.__density = measureDensity`（line 3384）；`visibleIn()` 仅以 `n.hidden === true` 判不可见（line 3123-3127）；E 默认态 `{可点 7 / 字符 321 / 行 10 / 块 47 / 分区 6}`，D 稿 `{80 / 4,870 / 144 / 391 / 5}` | `design/ui-redesign/{option-e,option-d}*.html` |

### 2.2 目标架构总览（三层披露的 DOM / 模块边界）

```
┌──────────────────────────── 侧栏扩展页面 sidepanel.html（唯一文档） ────────────────────────────┐
│ body（= 密度测量根，ADR-V3-001 方案 B）                                                          │
│                                                                                                 │
│  ①#panel-top         ── 改归属：收窄为「状态带」= 我在哪 + 谁在管我（1 个可点：展开 L1 状态详情） │
│  ②#risk-rail  [NEW]  ── 五类风险独立常驻分区（永不折叠；不在任何折叠容器内） ← D3 铁律           │
│  ③#l0-decision[NEW]  ── 下一步做什么：唯一一张决策卡（复用 #ask 家族 id）+「从页面拾取」入口     │
│  ④#panel-main        ── 保留三区契约：#log（唯一滚动容器）= 当前回合；历史回合整体 hidden         │
│        └ src/ui/sidepanel/l0/{shell,decision-card,risk-rail,status-bar}.ts              ← v3-1   │
│        └ src/ui/sidepanel/disclosure.ts（折叠器单一控制器 + 展开态记忆 + 目标白名单）    ← v3-1   │
│        └ src/ui/sidepanel/l1/{panels,ref-store,ref-validity,receipt,local-tree}.ts      ← v3-2   │
│        └ src/ui/sidepanel/l2/{view-host,counts,command-catalog,audit}.ts                ← v3-3   │
│  ⑤#panel-bottom      ── 保留：提示条 + #composer（**默认 hidden**，末项兜底输入；末元素契约保持）│
│  ⑥#view-host  [NEW]  ── L2 视图宿主：同一内容区的**视图替换**（单滚动容器 + 「← 返回」）        │
│  ⑦#settings-view     ── 保留（默认 hidden）→ v3-3 起作为 L2「设置」视图目标                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
             │ chip / 失效事件 / 选择题                 ▲ 引用/角标/拾取事件
             ▼                                          │
┌──────────────────────────── background（薄 case，追加不删改既有） ─────────────────────────────┐
│ 既有：registerContentScripts 登记式零注入 · executeScript(files:['content.js'])（图标点击）      │
│ v3-4 追加：case 'pick-layer-inject' / 'pick-layer-teardown'（executeScript files:['pick-layer.js']）│
│ 既有：安全判定链（policy.ts / auto-authorize.ts）**零 diff**；clamp 仍在 SW 侧强制              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
             │ executeScript（按需，仅已授权站点）
             ▼
┌──────────────────────────── 页面侧（宿主页面 isolated world） ─────────────────────────────────┐
│  [NEW] dist/pick-layer.js  ← 第 5 个 esbuild entry（**不并入 content.js**）                     │
│    src/content/{pick-layer,ref-capture,pick-overlay,pick-menu,pick-bridge}.ts                   │
│    · Shadow DOM 隔离（宿主样式污染）· Alt 悬停/Alt 拖动/拖选气泡/双击(G1)/悬停⊕(G2)              │
│    · 右键自绘菜单（路线 1，零新增权限，三退让）· 角标 ↔ 侧栏 chip 同序号（P4 双向联动）           │
│  [不变] dist/content.js（177,076 B，字节冻结）· CONTENT_SOURCE_SHA256 三文件 pin 不变            │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 「L0 不被 L1 / L2 反向污染」的**结构保证**（不是约定）

> 这是本 Feature 最容易被实现腐化的一条：只要有一个 L1 元素被渲染在 L0 的常驻容器里，密度预算就会被静默侵蚀。因此用**结构 + 门禁**双向锁死。

| # | 结构保证 | 强制手段 |
|---|---------|---------|
| S1 | **常驻区与披露区分属不同 DOM 容器**：L0 常驻元素只能出现在 `#panel-top` / `#risk-rail` / `#l0-decision` / `#l0-statusbar` 内；L1 内容只能出现在 `[data-l1-panel]` 内；L2 内容只能出现在 `#view-host > [data-l2-view]` 内 | 静态门禁（`test/density-thresholds.test.ts`）：解析 `index.html`，断言 `data-region="l1"` / `data-region="l2"` 容器不在 L0 容器子树内，反之亦然 |
| S2 | **L1 / L2 容器默认 `hidden = true`**，且只能由 `disclosure.ts` / `view-host.ts` 打开（改 `hidden` **属性**，非 CSS） | 运行时门禁：默认档断言所有 `[data-l1-panel]` / `[data-l2-view]` 的 `hidden === true`；面板内零 `display:none` 式折叠 |
| S3 | **折叠器目标白名单**：`COLLAPSIBLE_TARGETS` 是常量数组（`#risk-rail` **不在其中**）；`assertFoldable(node)` 对白名单外节点**抛错** | 运行时负向断言：`disclosure.toggle('#risk-rail')` → 期望抛错；把 destructive 选项塞进折叠池 → 期望抛错（ADR-V3-006） |
| S4 | **密度门禁以「差值归属」封口**：风险态相对默认态的**增量元素集合**必须 100% 命中 `isRiskClass(el)`，任何非风险类增量 → FAIL | 门禁（AC-V3-003 / ADR-V3-005） |
| S5 | **id 零重命名**：54 个既有 `id` 全部保留（只改归属与可见性）→ 既有门禁的 `getElementById` 全部继续可用，取代面从「选择器重写」降级为「前置展开步骤」 | 静态门禁：`index.html` 的 id 集合 ⊇ v1 的 54 id 集合 |

### 2.4 数据流变更（全部 additive）

**披露流**：状态推送（既有 `state` / `probe-changed` / `capability-changed` / `session-changed`）→ `view-model.ts` 产出 L0 视图模型（三件事 + 决策卡 + 风险行 + 计数占位）→ `l0/shell.ts` 渲染 → 用户点折叠入口 → `disclosure.ts` 打开 `[data-l1-panel]`（写 `hidden` + `aria-expanded`）→ 内容由 `l1/panels.ts` 渲染 → 点状态栏入口 → `l2/view-host.ts` 视图替换（**L0 常驻区保持可见**，`#log` / `#view-host` 切换）→ 「← 返回」→ 恢复进入前的展开态（`expand-memory`）。

**引用流（v3-2 ↔ v3-4）**：页面侧 `pick-layer.js` 捕获**原始事实**（`selector` / `semanticPath` / `textDigest` / `origin` / `documentId` / `declarationHash` / `capturedAt`）→ `chrome.runtime.sendMessage('ref-captured')` → 侧栏 `l1/ref-store.ts` 建 chip（**单一 id 源** `ref_<n>`，四处贯穿）→ `l1/ref-validity.ts#isRefUsable(ref)` 是**唯一放行点**：非 `'valid'` 一律阻断并发起「重新拾取」。**页面侧不做判定**（只上报事实），判定权威唯一在侧栏（v3-2 可独立验证）。

**注入流（v3-4）**：侧栏打开（已授权 origin）→ 侧栏发 `pick-layer-inject` → SW `executeScript({target:{tabId}, files:['pick-layer.js']})`（幂等：层内 `window.__wcliPickLayer` 已存在则直接返回）→ 页面侧注册监听；「从页面拾取」点击 → 同一 case 再注入（覆盖 SW 重启 / 面板先于授权打开的竞态）；侧栏卸载 → `pick-layer-teardown` → 层自卸载（移除监听 + 移除 Shadow host）。**未授权 origin：不注册 content script、不注入、不拦截右键**（既有登记式零注入 + `executeScript` 需站点 host permission）。

### 2.5 依赖关系图

```
v3-1（L0 骨架 + 风险位 + 密度门禁 + 首轮基线）      ← 首个开工，无前置
   │  产出契约：disclosure（折叠器 / 摘要计数 / 展开态记忆）+ L0 区域与 id 归属 + 密度门禁与基线
   ├───────────────┬───────────────────────────┐
   ▼               ▼                           │
v3-2（L1）      v3-3（L2）                     │  ← 两者都只依赖 v3-1 契约；可并行**分解**，
   │               │                           │     但门禁执行必须**严格串行**
   └───────┬───────┘                           │
           ▼                                   │
        v3-4（页面即输入）  ←───────────────────┘  ← 最后开工：R-UI-001/R-UI-004/R-UI-008 三险集中，
                                                     前置 spike 通过后才动；不得放宽体积上限换功能
外部依赖：**零新增**（零依赖 / 零权限 / 不改 base / 不改 v1·v2 已验收行为）
```

### 2.6 与 v1 / v2 的边界（不越界清单）

- **不**改 `src/security/policy.ts` / `src/security/auto-authorize.ts`（sha256 pin 不变）；硬底线（`evaluate` / 未授权 origin / 未知 risk）**不可覆盖**；`ui`/`state`/`external` **只可收紧（无 allow）**；`dom` 三档语义不变；破坏性子命令**保底 ask**；**clamp 仍在 SW 侧强制**；树内动作白名单 **9 个（固定序）**。
- **不**改 `manifest.json`（静态权限 5 项 / 6 域 / 无 `contextMenus` / **无静态 `content_scripts`**）；**不**新增 `web_accessible_resources`（`executeScript({files})` 不需要）。
- **不**改 `packages/web-cli-base/**`；**不**改 `options.html`（v3 只改设置的**归属方式**）；**不**新增依赖。
- **不**推翻 v1 三区 flex 布局（`#panel-top` → `#panel-main` → `#panel-bottom` 文档序 + `#log` 唯一滚动 + `#composer` 为底区末元素）；**不**推翻 v2 真层级树 / 9 动作白名单固定序 / 命令级覆盖层与 SW 侧 clamp / 取代台账机制。
- **不**改 v1 / v2 SDDU 目录（`state.json` / 追加内容 / phase 一律不动）；**不**改 ROADMAP 文本（只登记方案 A）。
- **不**动 `main`；**不** commit / push；**禁** `git add -A`；**不**提交 `.opencode/opencode.json`。

### 2.7 三元组硬约束的落地位置（**逐条指到文件与门禁**）

| # | 约束 | 落地位置 | 守线机制 |
|---|------|---------|---------|
| T1 | `content.js` **≤ 177,076 B（余量 0、无容差）** | **唯一触碰点 = v3-4**。`content.js` 的 entry（`src/content/content-script.ts`）与三个冻结源文件**零改动**；页面侧拾取层落在**第 5 个 bundle** `dist/pick-layer.js` | 既有 `evaluateContentCeiling`（无容差）+ 新 `PICK_LAYER_BASELINE_BYTES`（新 artifact 独立守卫）+ 反证 +1B（RP-V3-06） |
| T2 | manifest **静态权限零新增**、**不引入 `contextMenus`**，右键走 **content script 自绘 + 三退让** | `pick-menu.ts`（自绘）+ `manifest.json` **零 diff**；不新增 `web_accessible_resources` | `manifest.json` 字节零 diff 断言（AC-V3-017）+ 自绘菜单三退让断言（AC-V3-022） |
| T3 | 安全判定链 **sha256 pin 不得变**；硬底线 / 只可收紧 / clamp 在 SW 侧全部不变 | `src/security/**`、SW 侧 clamp 代码 **零 diff**；UI 层新增展示一律**只读投影** | sha256 pin 核对（`policy.ts` / `auto-authorize.ts`）+ 提权控件计数 = 0 + 伪造 `sendMessage` 不能突破 clamp 的负向断言 |

### 2.8 编排器指定的 11 项议题 → 设计落点与 ADR 索引（**逐项对照，不漏**）

| # | 议题 | 设计落点（一句话结论） | 承载 ADR |
|:--:|------|---------------------|---------|
| ① | **三层模型的落地结构**（L0/L1/L2 的 DOM/模块边界、避免 L0 被反向污染） | L0 常驻区 = `#panel-top`（收窄）+ `#risk-rail` + `#l0-decision` + `#l0-statusbar`；L1 = `[data-l1-panel]`（默认 `hidden`）；L2 = `#view-host > [data-l2-view]`（视图替换）；模块落 `src/ui/sidepanel/{l0,l1,l2}/**` + `disclosure.ts`；反向污染由 S1~S5 五条结构保证 + 门禁封口 | **ADR-V3-001** · ADR-V3-009（父）· ADR-V3-013 / ADR-V3-017（v3-1） |
| ② | **密度门禁的机器实现**（口径单源 / 落点 / 反证 / 反作弊 / 三档×三视口） | 口径单源 = `test/ui/density-metrics.mjs`；Chromium 门禁 = `test/ui/density.mjs` + 无 Chromium 常量门禁 = `test/density-thresholds.test.ts`；三档 × 三视口 = 9 强制格 + 5 风险子场景；反证 RP-V3-01~06 由 `--reverse` 定向驱动；反作弊 = 仅 `hidden` 豁免 + 测量源码禁用函数零命中 | **ADR-V3-003 / ADR-V3-004 / ADR-V3-005**（父）· ADR-V3-015 / ADR-V3-018（v3-1） |
| ③ | **风险位的机制**（五类如何被强制留在 L0；AC-V3-008/009 的祖先链断言） | 三层结构保证：`#risk-rail` 为 `body` 直挂独立分区（祖先闭包无 `hidden` / `[aria-expanded]`）+ 折叠器目标白名单**抛错**（`#risk-rail` 不在其中）+ destructive 选项被过滤式折叠池结构性排除；AC-V3-008 = 5 类 × 2 场景（默认 / 全部折叠）的 `assertRiskVisible`；AC-V3-009 = 祖先闭包不含 `[data-l1-panel]`/`[data-l2-view]` | **ADR-V3-006**（父）· ADR-V3-013 / ADR-V3-016（v3-1） |
| ④ | **引用失效的 fail-closed 判定**（判定维度 / 数据来源 / 不确定即失效的实现位置 / 可读原因） | 五维（DOM 消失 / origin 变更 / 页面导航 / 声明版本变化 / 授权撤销）；数据来源 = 页面侧只上报**原始事实**，判定权威唯一在侧栏；`evaluateRefValidity()` 返回三态，`isRefUsable(ref) = verdict === 'valid'` 是**唯一放行点**（默认拒绝 ⇒ fail-closed 结构必然）；可读原因按维模板化并 pin 文案 | **ADR-V3-020**（v3-2）· 数据来源侧 ADR-V3-034（v3-4） |
| ⑤ | **页面侧交互层的按需注入形态**（时机/方式/生命周期/失败降级 + 体积核算 + 零注入 + `CONTENT_SOURCE_SHA256`） | 第 5 个 esbuild entry `dist/pick-layer.js`；`executeScript({files:['pick-layer.js']})` 双触发（面板在场 + 拾取点击）+ 幂等 + teardown 自卸载；**`content.js` 字节与三文件 pin 完全不变**；体积核算见 §2.9 与 ADR-V3-031；未授权站点零注入不变；失败降级 = 注入失败 → L0 风险位明示「页面侧不可用」+ 拾取入口禁用 | **ADR-V3-030 / ADR-V3-031**（v3-4）· ADR-V3-011（父） |
| ⑥ | **右键自绘菜单**（三条退让 / 键盘与 `role="menu"` / 与 `content.js` 体积的关系） | 路线 1（content script 自绘，**零新增权限**，不引入 `contextMenus`）；三退让：仅已授权站点生效（层不在场则完全不拦截）/ 菜单首项保留「交给页面原生菜单」出口（下 1 次右键不再拦截）/ `Esc` 与点击空白即关；`role="menu"` + `role="menuitem"` + roving `tabindex` + 方向键/`Home`/`End`/`Enter`；代码位于**按需层**（`dist/pick-layer.js`），**不占 `content.js` 字节** | **ADR-V3-032**（v3-4） |
| ⑦ | **既有断言的取代机制**（台账文件名/schema / 门禁如何强制 / 5 个门禁各自策略） | 台账 = `docs/v3-supersession-ledger.json`（r2 schema + `counts.countMethod` + `entries` + `modifiedRanges` + `protectedRanges` + `zeroDiffFiles`）；门禁 = `test/supersession-ledger.test.ts` 做 **diff hunk ↔ 台账映射**，未命中即 FAIL；5 个门禁策略逐条见 ADR-V3-007 第 5 条 | **ADR-V3-007**（父）· ADR-V3-019 / ADR-V3-024 / ADR-V3-029 / ADR-V3-036（各叶） |
| ⑧ | **主题 / 320px / 无障碍策略** | 复用既有 `:root` tokens（新增 token 必须双主题对称）；折叠统一 = `hidden` + `aria-expanded`/`aria-controls` 成对 + 入口非空文字 + `aria-controls` 目标含摘要/计数；数字键 `1`~`5` 选题；320px 零水平溢出 + **不删常驻元素**（320 与 400 常驻 id 集合相等） | **ADR-V3-008**（父）· ADR-V3-014 / ADR-V3-016（v3-1） |
| ⑨ | **既有 tokens / DOM 的迁移边界**（哪些 v1 已验收元素必须保留、在新布局中的归属） | **54 个 id 零重命名**；必须保留清单与归属映射逐项见 ADR-V3-009 第 2 条（onboarding / discovery-notice / env-guard / site-hint / confirm 卡 / ask 家族 / composer 家族 / tree-fab·drawer / settings 家族）；`#log ≥589px` 契约为**增强式**迁移 | **ADR-V3-009**（父）· ADR-V3-017（v3-1）· ADR-V3-028（v3-3） |
| ⑩ | **叶子分解与顺序**（`v3-1 → {v3-2, v3-3} → v3-4`；各叶技术前置与可独立全绿理由；v3-4 的 spike） | 顺序与前置见 §2.5；叶间契约 = `disclosure` / 摘要计数 / 展开态记忆 / 引用 chip / 选择题（四项 id 命名空间化，见 ADR-V3-010 第 3 条）；**v3-4 前置 spike** = A-UI-004（按需注入形态与体积），验收标准与失败降级见 ADR-V3-035 | **ADR-V3-010**（父）· ADR-V3-035（v3-4） |
| ⑪ | **体积基线重登记流程**（前后值 + 日期 + 来源 + 理由 + 历史保留的落点） | 落点 = `test/size-baseline.ts`（`SIDEPANEL_BASELINE_BYTES` / `_HISTORY` / `_META` + 新增 `PICK_LAYER_*`）+ `docs/v3-density-baseline.*`（密度基线，与体积基线分开登记）；`content.js` 无容差**不可**重登记（唯一路径 = 让它不变） | **ADR-V3-011**（父）· ADR-V3-031（v3-4）· ADR-V3-018（v3-1） |

### 2.9 体积核算（预估 + 守住 177,076 B 的方案 + 需重登记时的流程）

**A. `dist/content.js`（177,076 B，无容差）**

| 项 | 结论 |
|---|---|
| v3 是否触碰？ | **否**。`src/content/content-script.ts` / `dom-agent.ts` / `page-bridge.ts` **零改动**；`build.mjs` 的 `content` entry 定义不变 → 产物字节不变、`CONTENT_SOURCE_SHA256` 三项 hash 不变 |
| 页面侧新代码去哪？ | `dist/pick-layer.js`（新 artifact，独立 entry）——**与 `content.js` 完全解耦** |
| 守线门禁 | 既有 `evaluateContentCeiling`（无容差）+ RP-V3-06（+1B → FAIL）；v3-4 另对 `pick-layer.js` 建独立硬上限 |
| 若「按需注入」被 spike 否决 | 唯一合法退路 = 方案 C（第二个登记式 content script，`js:['content.js','pick-layer.js']`）→ 仍**不增加** `content.js` 字节；**禁止**把代码塞进 `content.js` 或放宽 `CONTENT_MAX_BYTES`（ADR-V3-030 / NG-V3-010） |

**B. `dist/pick-layer.js`（新 artifact，预估）**

| 组成 | 预估源码量 | 说明 |
|---|---|---|
| `ref-capture.ts`（选择器 / 语义路径 / 文本摘要 / 事实快照） | ~4 KB | 与 v3-2 证据层同源口径（纯函数，可被 node 单测） |
| `pick-overlay.ts`（Shadow DOM 宿主 + 描边 / 标签 / 胶囊 / 气泡 / 角标 + 内联 CSS） | ~10 KB | 隔离用 Shadow DOM；CSS 以字符串内联（**无外链**，CSP 安全） |
| `pick-menu.ts`（自绘菜单 + 三退让 + 键盘 + ARIA） | ~5 KB | 零权限路线 |
| `pick-bridge.ts`（消息 / 生命周期 / 幂等注入 / teardown / 事件不吞） | ~4 KB | 与 SW / 侧栏的唯一通道 |
| `pick-layer.ts`（组装 + 事件绑定：Alt 悬停 / Alt 拖动 / 拖选 / G1 / G2） | ~5 KB | 无框架（沿用 `content.js` 的裸 DOM 风格） |
| esbuild 运行时/包装（IIFE，**未 minify**） | ~2~3 KB | 与既有产物同形（`build.mjs` 未开 minify） |
| **合计预估** | **~30~33 KB 源码 → ~42,000~58,000 B 产物** | 参照：`src/content/**` 源码 33,424 B → `content.js` 产物 177,076 B（含 base 依赖）；**本层不依赖 base LLM/SDK**，故膨胀比远低于 content.js |

| 守卫设计 | 值 |
|---|---|
| `PICK_LAYER_BASELINE_BYTES` | 首轮 `npm run build` 后**实测登记**（前后值 + 日期 + 来源 + 理由 + 历史保留） |
| `PICK_LAYER_CEILING` | **= 首轮实测值（无容差）**：新 artifact 无历史包袱，采用与 `content.js` 同级的「不增长」口径，anti-cheat 更强 |
| 反证 | `dist/pick-layer.js` +1 B → 守卫**必须** FAIL（`test/pick-layer-budget.test.ts`） |
| 超限处置 | **只能改实现**（拆 CSS / 去重复 / 复用已有纯函数）；**不得**放宽上限（不与 `CONTENT_MAX_BYTES` 合并计数） |

**C. `dist/sidepanel.js`（基线 266,500 / ceiling 279,825，容差 5%）**

| 项 | 结论 |
|---|---|
| 预估增量 | v3-1 +8~12 KB（L0 骨架 + 风险位 + 折叠器 + 状态栏）、v3-2 +6~9 KB（L1 八类 + 引用模型）、v3-3 +4~6 KB（视图宿主 + 计数，主要复用既有实现）、v3-4 +3~5 KB（chip / 角标联动）→ **合计 +21~32 KB → 预计 287,500~298,500 B，很可能 > ceiling 279,825**（如实登记为**高概率**事件） |
| 降重杠杆（先用尽） | ① 静态骨架/模板落 `sidepanel.html`（**不在 js 守卫口径**）且位于 `hidden` 子树（不污染密度）；② 复用既有 `view-model` / render 路径与 `src/insight/**` 纯投影，不新建重复渲染层；③ 引用模型单一模块被 v3-2 / v3-4 共用；④ 不引入任何新依赖（NG-V3-008） |
| 若仍超限 | 按 **ADR-V3-011** 走**显式重登记**：`test/size-baseline.ts` 更新 `SIDEPANEL_BASELINE_BYTES` 为新实测值、旧值进 `SIDEPANEL_BASELINE_BYTES_HISTORY`、`SIDEPANEL_BASELINE_META` 记录 `measuredOn` / `source` / `buildCommand` / `direction` / `previousBaselineBytes` / `reRegisteredFrom` / 理由；**容差 5% 不变、断言零删减、`targetBudgetBytes`/`targetMet` 保持 `null`** |
| 禁止 | 放宽容差 / 删断言 / 把 `targetBudgetBytes` 改成目标值（即 v1 D31 的「目标达成」叙述回潮，ADR-V2-007 已禁止） |

---

## 3. 方案对比



> 每个开放点给出 2~3 个可行方案；**结论集中在 §4**；ADR 编号见 §7。

### 3.1 P-V3-01 三层披露的 DOM 形态（密度测量根）

| 维度 | 方案 A：新增 `#panel` 包裹层 | **方案 B：以 `body` 为测量根 + L0 常驻分区直挂 `body`** | 方案 C：L1/L2 用 `dialog` / portal 浮层 |
|------|:--|:--|:--|
| 描述 | 在 `body` 内新增 `#panel` 包住三区 + `#settings-view`，测量根 = `#panel`（与设计稿**完全同名同义**） | 不新增包裹层；测量根 = `document.body`（真实产物的「面板根」）；`#risk-rail` / `#l0-statusbar` 作为新的 `body` 直接子区 | L1/L2 挂在 `<dialog>` / 独立 portal 容器，L0 三区不动 |
| 优点 | 与设计稿口径**字面同源**；C4 分区口径与 E 稿逐字对齐 | **不动 v1 三区 DOM 结构**（`body{display:flex}` + 三区文档序 + `#composer` 末元素契约全部零改）；id 零重命名最大化；取代面最小 | L0 完全不受影响；隔离强 |
| 缺点 | 需改动 `body` 的 flex 归属（`html,body{height:100%}` + `#panel{flex:1;display:flex;column}`），**必然扰动 4 项布局契约**（三分区 / flex / `#log` 高度 / composer 末元素），且 `#log ≥589px` 基线需重测 | 测量根由 `#panel` 改为 `body` → 必须在门禁与文档中**显式登记口径适配**（同义不同名）；C4 分区数会包含 `#settings-view` 的可见性影响 | 「浮层」违反 FR-V3-047（**不引入第二个滚动容器**、不做浮层）；`role="dialog"` / `aria-modal` 与 v2 树抽屉语义冲突 |
| 风险 | 高（布局契约连带面大） | 低（口径适配可机器断言：`body` 一级子元素 ≡ 设计稿 `#panel` 一级子元素语义） | 高（直接违反需求条文） |
| 工作量 | 中 | **低** | 中（但方案本身不可采） |

### 3.2 P-V3-02 密度门禁的实现载体

| 维度 | **方案 A：三段式（Chromium 门禁 + 口径单源 + 无 Chromium 常量门禁）** | 方案 B：Node 静态分析 `index.html` + 渲染模型 | 方案 C：扩展既有 `test/ui/insight.mjs` |
|------|:--|:--|:--|
| 描述 | `test/ui/density.mjs`（Chromium/CDP；三档×三视口 + 稿件同源 + 反证）+ `test/ui/density-metrics.mjs`（**唯一口径实现源**）+ `test/density-thresholds.test.ts`（无 Chromium：常量 / 口径集合 / 静态结构） | 纯 Node：解析 HTML + 跑渲染模型计算元素数 | 在 `insight.mjs` 内追加 density 检查 |
| 优点 | 测的是**真实构建产物**（`dist/sidepanel.html` + 真 `chrome.*`）；口径单源可被「设计稿 DOM 同输入同输出」双向验证；反证可实跑；无 Chromium 的一半在 1.5GB 机器上随时可跑 | 快、无 OOM 风险 | 不新增文件 |
| 缺点 | 需要 Chromium（串行、日志落盘）；helper 需自带（不抽共享模块，见 ADR-V3-003） | **测不到真实可见性**（`hidden` 与 CSS 的真实交互、浏览器默认样式、真实布局溢出）→ 与 AC-V3-001~004 的「实测」不符 | 违反 FR-V3-004（不修改既有门禁文件的既有断言）与 AC-V3-011；`insight.mjs` 已是取代最大战场，再叠密度会失控 |
| 风险 | 低（纪律已有先例） | 高（假绿） | 高（纪律违规） |
| 工作量 | 中 | 低 | 低 |

### 3.3 P-V3-03 「口径同源」的证明方式（反双实现漂移）

| 维度 | **方案 A：在设计稿 DOM 上做「同输入同输出」双向对账** | 方案 B：源码字符串相等 | 方案 C：文档约定 + 人工核对 |
|------|:--|:--|:--|
| 描述 | 门禁加载 `option-e-progressive.html` / `option-d-choice-guided.html`，用**我们的** `DENSITY_MEASURE_SOURCE` 测其 `#panel`，断言得到稿件公布值（E `{7 / 10 / 47 / 6}`、D `{80 / 144 / 391 / 5}` 的可点 / 行 / 块 / 分区）；同时断言稿件自带 `window.__density()`（E 稿 line 3384）与我们的结果**逐项相等** | 把稿件函数体与我们的实现做文本/正则比对 | 文档声明「口径同源」，人工 review |
| 优点 | 证明的是**语义等价**（最能反映双实现漂移的实际危害）；顺带把「设计稿口径 ≠ 真实产物口径」两列数字分开复算（A-UI-001 / 父 §9.4） | 实现简单 | 零成本 |
| 缺点 | 需加载稿件（Chromium 已在门禁里，近零成本）；稿件数字若与 `index.html` 公布值不一致须如实登记 | 过脆（注释/变量名差异即失败，改法不同 ≠ 语义不同） | **不可验证** |
| 风险 | 低 | 中（假 FAIL / 假绿都有） | 高 |
| 工作量 | 低 | 低 | 零 |

### 3.4 P-V3-04 页面侧交互层在 `content.js` 余量 0 下的形态

| 维度 | **方案 A：第 5 个 bundle `dist/pick-layer.js` + `executeScript` 按需注入** | 方案 B：并入 `content.js` | 方案 C：第二个**登记式** content script（`js:['content.js','pick-layer.js']`） |
|------|:--|:--|:--|
| 描述 | 新增 entry `src/content/pick-layer.ts` → `dist/pick-layer.js`；SW 用既有 `executeScript` 机制按需注入（面板在场 + 拾取点击双触发，幂等；卸载走 teardown 消息） | 把拾取层代码放进现有 `content.js` | 在 `registerSiteContentScript` 的 `js` 数组里再加一个文件，随站点授权常驻注入 |
| 优点 | `content.js` 字节与 `CONTENT_SOURCE_SHA256` **完全不变**（T1 守线）；未授权站点零注入不变；面板关闭即可卸载；零新增权限（`scripting` 已在静态权限内）；是既有机制（`service-worker.ts:920`）的延伸 | 无需新 entry | 授权站点天然常驻，右键立即可用 |
| 缺点 | 需新增 entry + 消息 case + 生命周期编排；**右键拦截仅在层在场时生效**（面板不在场则右键交回原生）→ 如实登记为语义边界 | **必然超 177,076 B（余量 0）** → 只能放宽上限或改冻结源 → 违反 T1 / NG-V3-010 | 页面侧层**常驻**于所有已授权站点（即使侧栏从未打开）→ 与「按需」语义相悖；常驻资源占用更高 |
| 风险 | 低（机制既有 + 可回退到 C） | **不可接受** | 中（语义边界 + 常驻占用） |
| 工作量 | 中 | 小但方向错 | 小 |

### 3.5 P-V3-05 取代台账门禁的强制方式

| 维度 | **方案 A：`git diff` hunk ↔ 台账映射 + 计数口径显式化** | 方案 B：只比断言总数（计数不减） | 方案 C：人工核对 + 文档清单 |
|------|:--|:--|:--|
| 描述 | 门禁对**受保护文件**跑 `git diff -U0` / `--numstat`，把每一处删除或修改 hunk 映射到台账 `entries[].oldTitle` 或 `modifiedRanges` 声明的区间与 `oldId`；未命中即 FAIL；同时校验各门禁运行时断言数 ≥ 下界（`passes+failures` 口径） | 只断言总数不减 | 人工 |
| 优点 | 真正实现「**删除行必须命中台账否则 FAIL**」（AC-V3-011）；hunk 级粒度可定位；`counts.countMethod` 显式消灭 r2 的「646/690/693」跨口径歧义 | 实现简单 | 零成本 |
| 缺点 | 需在台账维护行区间（区间随行号漂移会被感知 → 这正是想要的：漂移触发复核） | **删 1 条 + 加 2 条也能过**（正是 NFR-V3-014 要禁止的「弱化断言让它变绿」） | 不可验证 |
| 风险 | 低 | 高 | 高 |
| 工作量 | 中 | 低 | 零 |

### 3.6 P-V3-06 父 `plan.md` 的产出与否

| 维度 | **方案 A：产出父 `plan.md`（编排器指令）并登记偏差** | 方案 B：严格照 FR-V3-002 不产出父 plan |
|------|:--|:--|
| 描述 | 产出父 plan 作为统领性技术方案（11 项跨叶议题 + ADR-V3-001~012），显式登记为对 FR-V3-002 的偏差（ADR-V3-002），保持父不产出 tasks / 不承接 build·review·validate | 父目录只有 `spec.md` / `discovery.md` / `state.json` / `TREE.md` |
| 优点 | 跨叶契约与门禁口径有**唯一权威落点**，防 4 叶各自发明；编排器可一处 review | 严格符合 FR-V3-002 字面 |
| 缺点 | 与 FR-V3-002 字面冲突（已显式登记为偏差，供 review 核验） | 跨叶契约只能靠 4 叶互相引用 → 漂移风险高；编排器要求不可满足 |
| 风险 | 低（偏差已登记 + 可追溯） | 中高（工程风险） |
| 工作量 | 中 | 低 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V3-01 DOM 形态 | **方案 B**（`body` 为测量根 + L0 常驻分区直挂） | 唯一能保住 v1 三区契约（4 项布局契约中 3 项零改）与 `#composer` 末元素契约的形态；「测量根适配」以门禁断言 + 文档口径备注显式登记（ADR-V3-001） |
| P-V3-02 门禁载体 | **方案 A**（三段式） | 只有真实产物实测能满足 AC-V3-001~004 的「实测」字面；「新文件、不改既有门禁」满足 FR-V3-004；常量门禁让 1.5GB 机器随时可跑一半 |
| P-V3-03 同源证明 | **方案 A**（设计稿 DOM 双向对账） | 唯一能真证「双实现漂移」的方式，且顺带复算 A-UI-001 要求的「设计稿口径 vs 真实产物口径」两列 |
| P-V3-04 页面侧形态 | **方案 A**（第 5 bundle + 按需注入） | 唯一同时满足 T1（`content.js` 零增长 + pin 不变）、T2（零权限）、NFR-V3-007（未授权零注入）的方案；机制是既有 `executeScript` 的延伸 |
| P-V3-05 台账门禁 | **方案 A**（hunk ↔ 台账映射 + 计数口径显式化） | 唯一能兑现 AC-V3-011「未命中即 FAIL」的方案；口径显式化消除 r2 台账的跨口径歧义 |
| P-V3-06 父 plan | **方案 A**（产出 + 登记偏差） | 编排器指令优先 + 偏差显式登记（FR-V3-002 的可操作内核仍被遵守：父不产出 tasks / 不承接 build·review·validate） |

**编排器决策登记（本轮定论，作为设计约束，不重新讨论）**：

| # | 事项 | 裁决 | 在本 plan 的承载体 |
|---|------|------|------------------|
| D-P-V3-01 | 设计基准 | **E 稿**（`option-e-progressive.html`）；A~D + `index.html` 为对照/存档；**D 为高密度参照物（不删除）** | ADR-V3-001 / ADR-V3-003 |
| D-P-V3-02 | 风险位 | **绝对常驻、永不折叠**（五类）；**结构保证**而非约定 | ADR-V3-006 |
| D-P-V3-03 | 内核三条 | 无常驻输入框 / 每回合一道选择题（末项固定「其他…（我来描述）」）/ 页面即输入 | ADR-V3-009（父）/ ADR-V3-014（v3-1）/ ADR-V3-030（v3-4） |
| D-P-V3-04 | 三元组约束 | `content.js` 177,076 B 无容差 · manifest 静态权限零新增且无 `contextMenus` · 安全判定链 pin 不变 | ADR-V3-011（父）/ ADR-V3-031（v3-4） |
| D-P-V3-05 | 页面侧形态 | **首选按需注入**；不可行才允许**显式重登记**（前后值 + 日期 + 来源 + 理由 + 历史保留）；**禁止放宽上限换功能** | ADR-V3-030 / ADR-V3-031（v3-4）/ ADR-V3-011（父） |
| D-P-V3-06 | ROADMAP 版本位 | **方案 A 最小消解**（v0.9.0 扩写为双主题并列；历史叙述逐字保留、不顺延）；**plan 只登记，执行放收口阶段** | ADR-V3-012 |
| D-P-V3-07 | 密度分档 | 默认态 ≤7 可点 / ≤15 行 · 首装态 ≤9 / ≤20 · 风险态 ≤17 / ≤35；三档均需在 320/400/520 成立；风险增量只能被风险类元素占用 | ADR-V3-004 / ADR-V3-005 |
| D-P-V3-08 | 取代策略 | journey 167（zero-diff 优先）· insight 108（新断言落新文件）· binding 192（既有编号零删改）· `sidepanel-view.test.ts` 38（含 4 布局契约，逐条登记）；计数下界守卫 ≥646 只增不减；**每叶结束全部门禁必须绿** | ADR-V3-007（父）+ 各叶取代 ADR |
| D-P-V3-09 | 父 plan 产出 | 产出父 `plan.md`（编排器指令）并显式登记对 FR-V3-002 的偏差 | ADR-V3-002 / §1 偏差登记 1 |
| D-P-V3-10 | 密度测量根 | `document.body`（真实产物无 `#panel` 包裹层）；口径适配以语义等价断言机器化 | ADR-V3-001 |
| D-P-V3-11 | 密度门禁落点 | 新文件三段式；**不触碰既有 4 个 `test/ui/*.mjs` 的既有断言**；v3 门禁自带 helper | ADR-V3-003 |
| D-P-V3-12 | 风险位描述符 | 五类风险的 DOM 描述符（`data-risk-class` + `#risk-rail` 归属）由 v3-1 定义，v3-2/v3-3/v3-4 复用，不得另立一套 | ADR-V3-005 / ADR-V3-006 |

---

## 5. 文件影响分析（聚合；叶子级明细见各叶 `plan.md` §5）

> 全部为**新增 + 追加**型改动；**零删除**（唯一允许的「改写」= 既有门禁文件里的**同编号前置展开步骤**，且必须命中台账）。路径相对仓库根。

| 操作 | 文件路径 | 说明 | 叶子 |
|:--:|------|------|:--:|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/shell.ts` | L0 骨架渲染（我在哪 / 谁在管我 / 下一步做什么） | v3-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/decision-card.ts` | 唯一决策卡（≤2 推荐 + 「更多选项（还有 N 个）」真值计数 + 末项兜底输入复用） | v3-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/risk-rail.ts` | 五类风险行**单一模板**（文字 + 徽标 + 图标三通道；只读投影） | v3-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/status-bar.ts` | 一行状态栏 + L2 入口面板骨架（计数占位，v3-3 填真值） | v3-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` | 折叠器**单一控制器**（`hidden` + ARIA 成对 + 目标白名单排斥 `#risk-rail` + 展开态记忆） | v3-1 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/panels.ts` | L1 八类就地展开内容（≤1 次交互） | v3-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-validity.ts` | 引用失效 **fail-closed** 判定（五维 + 三态 + 唯一放行点 + 可读原因） | v3-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/ref-store.ts` | 引用 id 单源（`ref_<n>`）+ 四处贯穿的视图状态 | v3-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/receipt.ts` | 回执三件套（摘要 / 完整证据 / 审计出口） | v3-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l1/local-tree.ts` | 局部树（当前对象所在 ≤3 节点 + 归属链 + 「查看全局树」入口） | v3-2 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/view-host.ts` | L2 视图宿主（**单滚动容器** + 视图替换 + 「← 返回」+ 展开态复原） | v3-3 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/counts.ts` | 四类底账计数**从真值派生**（改真值计数变；硬编码即 FAIL） | v3-3 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/command-catalog.ts` | 命令目录视图（复用 `src/insight/command-catalog.ts` 只读投影；`delay`=deny 措辞单源） | v3-3 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l2/audit.ts` | 审计视图（条目列表 + 零明文纪律） | v3-3 |
| NEW | `packages/web-cli-plugin/src/content/pick-layer.ts` | 页面侧拾取层入口（第 5 bundle 的 entryPoint） | v3-4 |
| NEW | `packages/web-cli-plugin/src/content/ref-capture.ts` | 原始引用事实捕获（选择器 / 语义路径 / 文本摘要 / `documentId` / 声明 hash）——与 v3-2 证据层**同源口径** | v3-4 |
| NEW | `packages/web-cli-plugin/src/content/pick-overlay.ts` | Shadow DOM 隔离宿主 + 描边 / 标签 / 胶囊 / 气泡 / 角标 | v3-4 |
| NEW | `packages/web-cli-plugin/src/content/pick-menu.ts` | 右键自绘菜单（路线 1 + 三退让 + `role="menu"` + 键盘） | v3-4 |
| NEW | `packages/web-cli-plugin/src/content/pick-bridge.ts` | 与 SW / 侧栏消息 + 生命周期（注入幂等 / 卸载）+ 宿主事件不吞 | v3-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 追加 L0 常驻分区（`#risk-rail` / `#l0-decision` / `#l0-statusbar` / `#view-host`）标记与样式；**54 个既有 `id` 零重命名**；`#composer` 默认 `hidden`；**保留** `body{display:flex}` / 三区文档序 / `#panel-bottom{flex:0 0 auto}` / `#composer` 末元素 | v3-1→v3-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 追加 L0/L1/L2 挂载与订阅（**既有 render / handler 零删改**） | v3-1→v3-4 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | 追加 L0/L1/L2 视图模型（纯函数，node 可测） | v3-1→v3-3 |
| MODIFY | `packages/web-cli-plugin/src/ui/tree/tree-drawer.ts` | 归属迁移：absolute 覆盖抽屉 → L2 视图替换（**保留** `role=tree/treeitem` + 键盘 + 面包屑 + 9 动作白名单固定序） | v3-3 |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | **追加** `case 'pick-layer-inject'` / `'pick-layer-teardown'`（既有 case 零改动） | v3-4 |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` | `PluginMessageKind` **追加**拾取层相关 kind | v3-4 |
| MODIFY | `packages/web-cli-plugin/build.mjs` | **追加**第 5 个 entryPoint（`pick-layer` → `dist/pick-layer.js`）；既有 4 个 entry 零改动 | v3-4 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | **仅追加**：`PICK_LAYER_BASELINE_BYTES` / ceiling / meta（既有常量与断言零改动；`sidepanel` 若触发重登记则显式更新 + 历史保留） | v3-1 / v3-4 |
| MODIFY | `packages/web-cli-plugin/package.json` | **追加** scripts：`test:density` / `test:l0` / `test:l1` / `test:l2` / `test:page-input` / `test:supersession` / `test:v3`（**依赖零新增**） | v3-1 |
| NEW | `packages/web-cli-plugin/test/ui/density-metrics.mjs` | **密度口径唯一实现源**（C1~C4 测量源码 + 三档阈值 + 三视口 + 纯判定函数 + 增量归属判定） | v3-1 |
| NEW | `packages/web-cli-plugin/test/ui/density.mjs` | 密度门禁（Chromium/CDP；三档 × 三视口 + 稿件同源对账 + `--reverse RP-V3-0x` 反证驱动） | v3-1 |
| NEW | `packages/web-cli-plugin/test/ui/_v3-helpers.mjs` | v3 门禁自带 helper（`connectCdp` / `evaluate` / `waitFor` / `realClick` / `check` 最小实现）——**不抽共享模块**，以保 4 个既有门禁文件零删改 | v3-1 |
| NEW | `packages/web-cli-plugin/test/ui/l0.mjs` | L0 骨架 + 风险位（AC-V3-008/009）+ 可发现性（AC-V3-010）运行时门禁 | v3-1 |
| NEW | `packages/web-cli-plugin/test/density-thresholds.test.ts` | 无 Chromium：阈值常量 / C1~C4 口径集合 / 静态结构（L0↔L1/L2 分区不互串 + 54 id 保留 + `#risk-rail` 祖先闭包 + 测量源码禁用函数零命中） | v3-1 |
| NEW | `packages/web-cli-plugin/test/supersession-ledger.test.ts` | 取代台账门禁（hunk ↔ 台账映射 + `protectedRanges` hash + 计数下界 + `countMethod` 校验） | v3-1 |
| NEW | `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | **取代台账**（r2 schema + `counts.countMethod` + `entries` + `modifiedRanges` / `protectedRanges` / `zeroDiffFiles`） | v3-1 建，逐叶追加 |
| NEW | `packages/web-cli-plugin/docs/v3-density-baseline.md` + `docs/v3-density-baseline.json` | 首轮真实产物密度基线登记（三档 × 三视口实测值 + 日期 + 来源 + 与设计稿口径**分列**） | v3-1 |
| NEW | `packages/web-cli-plugin/test/ui/l1.mjs` | L1 门禁（8 类 ≤1 次可达 + 不遮挡 + 引用失效 5 维注入 + 两条恢复 + 回执三件套 + 可发现性） | v3-2 |
| NEW | `packages/web-cli-plugin/test/l1-ref-validity.test.ts` | 纯单测：五维判定表 + 三态 + **fail-closed 默认拒绝** + 可读原因文案 pin | v3-2 |
| NEW | `packages/web-cli-plugin/test/ui/l2.mjs` | L2 门禁（四视图默认零占用 + 计数同源 + ≤2 次可达 + 返回复位 + 能力集等价 AC-V3-026） | v3-3 |
| NEW | `packages/web-cli-plugin/test/ui/page-input.mjs` | 页面即输入门禁（四项交互 + 三退让 + 零注入 + 同序号 + 拾取期间零命令发送） | v3-4 |
| NEW | `packages/web-cli-plugin/test/pick-layer-budget.test.ts` | 新 artifact 体积守卫 + 反证（+1B → FAIL）+ `content.js` 无容差复核 | v3-4 |
| MODIFY | `packages/web-cli-plugin/test/ui/journey.mjs` | **最小同编号改写**：`#15c`（composer 贴底）→ 兜底展开态下的同义断言。其余 **零 diff** | v3-1 |
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs` | 既有条目**最小前置展开步骤** + 几何断言按台账迁移到新文件；逐条 `old→new` 登记 | v3-2 / v3-3 |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` | 自由文本入口相关（`#6a` / `#6` / `#6l`）**同编号前置展开**；`#21*` / `#22*` 区域**字节零改**（`protectedRanges` hash pin） | v3-1 / v3-4 |
| MODIFY | `packages/web-cli-plugin/test/sidepanel-view.test.ts` | 4 项布局契约**逐项迁移为等价或更强断言**（不删）+ 逐条台账 | v3-3 |
| NEW | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/{plan.md}` + 4 叶 `plan.md` | 本阶段产物 | plan |
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/state.json` + 4 叶 `state.json` | `phase: specified → planned`；`phaseHistory` 追加；`artifacts` / `files` 追加 `plan.md` | plan |

**明确不改（门禁断言 diff 为空）**：`packages/web-cli-plugin/manifest.json` · `src/security/policy.ts` · `src/security/auto-authorize.ts` · `src/content/{content-script,dom-agent,page-bridge}.ts`（内容 hash pin 不变） · `packages/web-cli-base/**` · `src/ui/options/index.html`（`options.html`） · `packages/web-cli-plugin/design/**` · `package.json` 的 `dependencies` / `devDependencies` · v1 SDDU 目录 `specs-tree-web-cli-plugin/**` · v2 SDDU 目录 `specs-tree-web-cli-plugin-v2-insight/**` · `.sddu/specs-tree-root/ROADMAP.md`（只登记，ADR-V3-012） · `.opencode/opencode.json` · `main` 分支。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R3-01 密度门禁「假绿」**（只测设计稿 / 只测静态 HTML / 只比数字不测可见性） | 中 | 极高 | 三段式门禁（ADR-V3-003）：Chromium 真产物实测 + 口径单源 + 无 Chromium 常量门禁；**RP-V3-01~06 必须实跑并留 FAIL→还原→PASS 全日志**（禁 tail 截断）；反证判据写死在 driver（「注入后必须 FAIL 且还原后必须 PASS」缺一即判反证无效） |
| **R3-02 密度口径双实现漂移** | 中 | 高 | 口径单源 `density-metrics.mjs`（测量源码 + 阈值 + 判定同文件）；**在 E/D 稿 DOM 上做同输入同输出对账**（ADR-V3-003 第 4 条）；静态断言测量源码**不含** `getComputedStyle` / `offsetParent` / `getBoundingClientRect`（堵死「CSS 隐身即豁免」后门） |
| **R3-03 既有断言取代面失控**（`#log` 几何 / `#composer` 默认隐藏 / `#tree-fab`·`#tree-drawer` 归属迁移 / `#ask` 家族迁移） | **高** | **极高** | ① **id 零重命名**（S5）把取代面从「选择器重写」降为「前置展开步骤」；② 台账 hunk 映射门禁（ADR-V3-007）；③ 每叶收尾必须全门禁绿（不得留红灯给下一叶）；④ 4 项布局契约**逐项迁移为等价或更强断言**（`#log ≥589px` → 「L0 常驻区互不遮挡 + `#log` 仍为唯一滚动容器 + 展开态 composer 贴底」，理由见 ADR-V3-009）；⑤ `#21*`/`#22*` 与 journey 主体用**区间 hash pin** 锁死字节不变 |
| **R3-04 `sidepanel.js` 超 ceiling（279,825 B）** | 高 | 中 | ① 静态骨架/模板落 `sidepanel.html`（**不在 `sidepanel.js` 守卫口径**）且在 `hidden` 子树内（不污染密度）；② 逻辑复用既有 `view-model` / render 路径，不新建重复渲染层；③ 若首轮实测仍超 → 按 ADR-V3-011 走**显式重登记**（前后值 + 日期 + 来源 + 理由 + 历史保留，容差 5% 不变），**不得**删断言或放宽容差 |
| **R3-05 页面侧按需注入与「右键随时可用」的语义张力** | 中 | 中 | ADR-V3-030 显式定义「按需」边界（面板在场期间注入 / 面板关闭卸载 / 未授权零注入）；**双触发**消除竞态；不可行时唯一退路 = 方案 C 并显式登记取舍，**不得**改 `content.js` 或放宽上限 |
| **R3-06 `pick-layer.js` 体积失控** | 中 | 中 | 新 artifact **独立硬上限**（首轮实测值，无容差）+ 反证 +1B；隔离用 Shadow DOM 但**共享** `ref-capture.ts`（v3-2/v3-4 单源，避免两套捕获实现）；不使用设计稿演示代码；与 177,076 B 守卫**完全解耦** |
| **R3-07 风险位被实现腐化**（某处把风险行塞进折叠层） | 中 | 极高 | 结构保证 S1~S3（分区容器归属 + 折叠器白名单**抛错** + destructive 不可进折叠池）+ AC-V3-008 的 5×2 断言 + RP-V3-04 反证 |
| **R3-08 引用失效的「不确定」分支被写成「视为有效」** | 中 | 高 | 三态 `'valid' | 'invalid' | 'unknown'` + `isRefUsable(ref) = verdict === 'valid'` 的**唯一放行点**（默认拒绝）；负向单测：任一捕获事实缺失 → `unknown` → 阻断 |
| **R3-09 首装态 ≤9/≤20（spec 新建档）实测不达标** | 中 | 中 | 首轮实测登记为基线（只允许收紧）；若超限 → **改披露策略**（onboarding / discovery-notice 说明文案收进 L1，只留摘要/计数 + 入口），**不得**放宽阈值（NG-V3-010 / EC-V3-010） |
| **R3-10 门禁并发导致 OOM（本机 ~1.5GB，曾 OOM）** | 中 | 高 | `test:v3` **严格串行**链式驱动（`&&` 串联，无并发）；完整日志落盘 `/tmp/opencode/v3-gate-logs/*.log`（禁 tail 截断）；**本 plan 阶段不跑任何门禁 / 构建 / Chromium** |
| **R3-11 54 个 id 迁移期「漏 id」** | 中 | 高 | 静态门禁：`index.html` 的 id 集合 ⊇ v1 的 54 id 集合（机器比对）；每叶收尾全门禁绿；逐叶小步推进 |
| **R3-12 台账变成「先删后补理由」的橡皮图章** | 中 | 高 | 台账 `newTitle` 必须**在目标文件中可定位**（门禁校验）；`reason` 必填；反证 RP-V3-05（删 1 条 → 必须 FAIL） |
| **R3-13 ROADMAP 消解被误当成「改 ROADMAP」** | 低 | 低 | 本 plan **只登记方案 A**（ADR-V3-012），不修改 `ROADMAP.md`；执行放收口阶段且必须「历史叙述逐字保留、不顺延」（FR-V3-006） |
| **R3-14 与 spec 的偏差（父 plan 产出 / 测量根口径 / `#log` 几何契约迁移 / v3 门禁自带 helper）被 review 当作未登记偏差** | 中 | 中 | 全部偏差集中在 §1「偏差登记 1/2」+ ADR-V3-001 / ADR-V3-002 / ADR-V3-003 / ADR-V3-009 显式登记并给出可核验理由，**不静默** |

**最大技术风险（按影响排序，三条）**：

1. **R3-03 既有断言取代面失控**（概率高 × 影响极高）：`insight.mjs` 的 `checkLayout()`（`logFlexGrow==='1'` / `logClientHeight ≥ 589` / `logRatio ≥ 65.0` / `composerGapToBottom ∈ [0,8]` / `fab∩composer === 0` / 零水平溢出）直接钉住 v1 三区几何，而 v3 默认态**必然**让 `#composer` 隐藏、L0 常驻区占据主视觉。缓解 = id 零重命名 + 契约**增强式**迁移 + hunk 级台账门禁 + 区间 hash pin + 每叶全绿。
2. **R3-01 + R3-02 密度门禁假绿 / 口径漂移**（概率中 × 影响极高）：这是本 Feature 的核心验收（D7）。缓解 = 三段式 + 稿上双向对账 + 6 条反证实跑 + 静态堵死 `getComputedStyle` 后门。
3. **R3-05 / R3-06 页面侧按需注入的语义张力与体积**（概率中 × 影响中高）：`content.js` 余量 0 不可谈判，页面侧功能全部压在「新 artifact + 运行时注入」上。缓解 = 唯一形态（第 5 bundle）+ 独立硬上限 + 双触发 + teardown + 回退方案显式登记，**任何情况下不放宽 `CONTENT_MAX_BYTES`**。

---

## 7. 生成的 ADR

> 本阶段共产出 **36 个 ADR（ADR-V3-001~036）**，与 v1 `ADR-001~018`、v2 `ADR-V2-001~033` **零编号冲突**。父 Feature 承 **ADR-V3-001~012**（统领性/跨叶），4 个叶子承 **ADR-V3-013~019 / 020~024 / 025~029 / 030~036**（正文见各叶 `plan.md` §7）。状态 = **ACCEPTED**（编排器代作者决策；设计基准、三元组约束、密度分档、取代策略为定论），其中 ADR-V3-001 / ADR-V3-002 / ADR-V3-003 / ADR-V3-009 含**显式偏差或取舍登记**。

| ADR | 标题 | 状态 | 覆盖议题 |
|-----|------|:--:|------|
| ADR-V3-001 | 三层披露的 DOM/模块边界 = `body` 为测量根 + L0 常驻分区直挂；测量根口径适配显式登记 | ACCEPTED | ① |
| ADR-V3-002 | 父 `plan.md` 的定位与 FR-V3-002 偏差登记（编排器指令优先；父仍不产出 tasks / 不承接 build·review·validate） | ACCEPTED（含偏差登记） | ⑩（治理） |
| ADR-V3-003 | 密度口径**唯一实现源** + 门禁三段式落点 + 「不抽共享 helper」取舍 | ACCEPTED（含取舍登记） | ② |
| ADR-V3-004 | 三档 × 三视口参数化 + 阈值/判定单源 + 反证驱动（RP-V3-01~06 实跑 FAIL→还原→PASS） | ACCEPTED | ②③ |
| ADR-V3-005 | C1~C4 逐条实现与**反作弊**（仅 `hidden` 豁免）+ 风险增量归属判定 | ACCEPTED | ②④ |
| ADR-V3-006 | 风险位永不折叠 = **结构保证**（分区归属 + 折叠器白名单抛错 + destructive 不可进折叠池 + 三通道模板）+ AC-V3-008/009 祖先链断言 | ACCEPTED | ③ |
| ADR-V3-007 | 取代机制 = 台账 schema（`counts.countMethod` 口径显式化 + `protectedRanges`）+ hunk ↔ 台账映射门禁 + 5 门禁逐条策略 | ACCEPTED | ⑦ |
| ADR-V3-008 | 主题 / 320px / 无障碍统一约定（复用 `:root` tokens；`hidden` + ARIA 成对；数字键 1~5） | ACCEPTED | ⑧ |
| ADR-V3-009 | 既有 tokens / DOM 迁移边界 = **id 零重命名** + 必须保留元素与归属映射 + `#log ≥589px` 的增强式迁移 | ACCEPTED（含偏差登记） | ⑨ |
| ADR-V3-010 | 叶子分解与顺序 + 叶间契约接口（disclosure / summary / expand-memory / ref / chip）+ v3-4 前置 spike | ACCEPTED | ⑩ |
| ADR-V3-011 | 体积基线重登记流程（前后值 + 日期 + 来源 + 理由 + 历史保留）+ 新 artifact 独立硬上限 | ACCEPTED | ⑤⑪ |
| ADR-V3-012 | ROADMAP 版本位 = **方案 A 最小消解**（v0.9.0 双主题并列；历史叙述逐字保留、不顺延）；plan 只登记，执行放收口阶段 | ACCEPTED（登记） | ⑪（治理） |

### ADR-V3-001: 三层披露的 DOM/模块边界 = `body` 为测量根 + L0 常驻分区直挂；测量根口径适配显式登记

## 状态
ACCEPTED（承编排器 D-P-V3-01 / D-P-V3-10；替代方案见 §3.1）

## 背景
E 稿的三层披露以 `#panel` 为面板根（稿内一级子元素实测 6 个常驻分区）。真实产物 `src/ui/sidepanel/index.html` **没有** `#panel` 包裹层：`<body>` 的直接子元素是 `#panel-top` / `#panel-main` / `#panel-bottom` / `#settings-view`，且 `body{display:flex;overflow:hidden}`、`#log` 为唯一滚动容器、`#composer` 为 `#panel-bottom` 末元素 —— 这三条正是 `test/sidepanel-view.test.ts` 的布局契约与 `journey.mjs` `#15a/#15b/#15d/#15e` 依赖的几何基础。密度口径（父 spec §9.1）要求「测量根 = 面板根元素」，但**没有**规定测量根必须叫 `#panel`。

## 决策
1. **测量根 = `document.body`**（侧栏文档的面板根容器）；C4「常驻分区数」= `body` 一级子元素中非 `hidden` 的个数。
2. **不新增 `#panel` 包裹层**（§3.1 方案 A 被否）：新增包裹层会改变 `body` 的 flex 归属，连带扰动三区文档序 / `#log` 高度 / `#composer` 末元素 / `#panel-bottom{flex:0 0 auto}` 四条契约与其对应断言，收益（口径字面同名）远小于代价。
3. **L0 常驻分区直挂 `body`**：`#risk-rail`（风险位，**独立分区**）与 `#l0-statusbar`（一行状态栏）为新的 `body` 直接子区；`#l0-decision` 落在 `#panel-main` 内（`#log` 的兄弟，`flex:0 0 auto`），保持三区文档序与 `#composer` 末元素契约不变。
4. **口径适配显式登记**：门禁与文档必须写明「设计稿口径 `#panel` ≙ 真实产物口径 `document.body`」，并给出**机器可核验的语义等价断言**：`body` 一级子元素的语义分区集合 ⊇ {状态带, 风险位, 决策区, 消息/视图区, 提示/兜底区}，且**不存在仅用于包裹、自身无 aria 语义的一级子元素**（设计稿 `#panel` 同样满足该性质 → **语义等价**而非同名等价）。
5. **C4 变化登记**：真实产物默认态分区数在 v3-1 首轮实测后登记（预期 3 → 5~6），按 AC-V3-007 只做「变化登记 + 反作弊」，**不设上限、不得作为密度达标证据或放宽理由**。

## 后果
- v1 三区 DOM 结构与 3/4 项布局契约**零改动**（`#composer` 末元素契约保留，只是默认 `hidden`）→ 取代面显著收窄。
- 口径从「同名同义」变为「同义不同名」，**必须**在门禁注释与 `docs/v3-density-baseline.md` 显式登记，否则 review 会视为口径漂移；已用第 4 条机器化。
- `#settings-view` 作为 `body` 一级子元素默认 `hidden`，不占常驻分区计数。

### ADR-V3-002: 父 `plan.md` 的定位与 FR-V3-002 偏差登记

## 状态
ACCEPTED（**含偏差登记**；依据 = 本轮编排器指令「按模板产出父 plan.md + 4 个叶子各自的 plan.md」）

## 背景
父 spec FR-V3-002 规定父 Feature 为轻量规范容器，**不产出** `plan.md` / `tasks.md` / `tasks.json`，不承接 build / review / validate。v2 先例是父只承载 spec 与聚合报告。但 v3 的 11 项议题（见 §2.8）**全部跨叶**：密度门禁被三叶复用、取代台账四叶共用同一文件、三元组守线约束来自全局、叶间契约（disclosure / ref / chip）若分散在 4 个叶子文档定义必然产生 4 套口径。

## 决策
1. **产出父 `plan.md`**（本文件），定位 = **接口与契约的定义者**（ADRs + 门禁口径 + 三元组守线 + 叶子边界），**不是**实施载体（不排任务、不写代码）。
2. **FR-V3-002 的可操作内核仍严格遵守**：父**不产出** `tasks.md` / `tasks.json`；父**不承接** build / review / validate；实施仍全部由 4 个叶子承载；父 `state.json` 的 `childrens` / `proposedChildren` 结构与 `depth=1` 不变；父**不进入** tasks 之后的工作流。
3. 本偏差**显式登记**于 §1「偏差登记 1」与本节，供 `@sddu-review` / `@sddu-validate` 独立核验；如编排器 / 作者裁定应回归字面（不产出父 plan），本文件可整篇作废而**不牵连** 4 个叶子 plan（叶子对父的引用均为「父 ADR 编号 + 契约名」，不依赖父文件的物理存在性）。

## 后果
- 好处：跨叶契约单点定义，避免 4 套口径漂移；review 可一处核验三元组守线与门禁设计。
- 代价：与 FR-V3-002 字面冲突（已登记）；父目录多一份文档，需在 `state.json` 的 `files` / `artifacts` 中如实登记。
- 边界：本决策**不**改变「父不承接 tasks/build/review/validate」的实质，也不改变「每叶独立全绿」要求。

### ADR-V3-003: 密度口径唯一实现源 + 门禁三段式落点 + 「不抽共享 helper」取舍

## 状态
ACCEPTED（含**取舍登记**）

## 背景
D7 要求密度「可机器复算且门禁必须能真 FAIL」（父 §9 / NFR-V3-002 / NFR-V3-013）。两个最大失败模式：① **双实现漂移**（设计稿演示代码一套、门禁一套，悄悄分叉）；② **假绿**（测静态 HTML 或只比数字，测不到真实可见性）。既有事实：`test/ui/insight.mjs:247-305` 已用「CDP 注入 IIFE 字符串」测量几何（先例可循）；4 个既有 `test/ui/*.mjs` **各自内联** helper、无共享模块；本机 ~1.5GB 内存，Chromium 门禁必须串行。

## 决策
**三段式，全部落在新增文件，不触碰既有门禁文件的既有断言**（FR-V3-004）：

1. **唯一实现源 = `test/ui/density-metrics.mjs`**（ESM，零依赖）。导出：
   - `DENSITY_MEASURE_SOURCE`：**一个字符串**，内容是 C1~C4 的完整 in-page 测量表达式（由 CDP `Runtime.evaluate` 注入执行）——任何调用方**只能**用它，不得另写一份；
   - `DENSITY_LIMITS`：`{ default: {clickables:7, lines:15}, firstRun: {clickables:9, lines:20}, risk: {clickables:17, lines:35} }`；
   - `DENSITY_VIEWPORTS = [320, 400, 520]`（均 × 900 高，与既有门禁视口口径一致）；
   - `DENSITY_TIERS`（档位 → 夹具状态描述）与 `RISK_SUBSCENARIOS`（5 类）；
   - `isRiskClassDescriptor`（风险增量归属判定）；
   - `evaluateDensity(measured, tier, limitsOverride?)`：**纯判定函数**，返回 `{ok, tier, viewport, measured, limits, exceeds[], message}`，`message` 必含「实测值 vs 上限 vs 口径」。
2. **Chromium 门禁 = `test/ui/density.mjs`**（`npm run test:density`）：启动 Chromium（沿用既有门禁的启动参数与 `--load-extension=dist` 方式）→ 构造夹具 → 三档 × 三视口测量 → 调 `evaluateDensity` 判定 → 稿件同源对账（第 4 条）→ `--reverse RP-V3-0x` 反证模式。
3. **无 Chromium 门禁 = `test/density-thresholds.test.ts`**（纳入 `npm test`）：阈值常量 == 父 §9.2 逐字值；矩阵规模 == 9；C1 元素选择器集合 == 父 §9.1 定义；`DENSITY_MEASURE_SOURCE` **不含** `getComputedStyle` / `offsetParent` / `getBoundingClientRect`（静态堵死「CSS 隐身即豁免」后门）；`index.html` 静态结构断言（L0 ↔ L1/L2 容器不互串 + 54 id 保留 + `#risk-rail` 祖先闭包无 `hidden`/`[aria-expanded]`）。
4. **稿件同源 = 「同输入同输出」双向对账**（§3.3 方案 A）：门禁加载 `option-e-progressive.html`，用**我们的** `DENSITY_MEASURE_SOURCE` 测其 `#panel`，断言得到 E 默认态公布值（可点 7 / 行 10 / 块 47 / 分区 6）；再调稿件自带 `window.__density()`（E 稿 line 3384）断言**与我们的结果逐项相等**；D 稿同法断言（80 / 144 / 391 / 5）。**任一项不等 → FAIL**（这就是「同源」的机器判据）。设计稿口径数字与真实产物口径数字**必须分列登记**（A-UI-001 / 父 §9.4）。
5. **不抽共享 helper**：v3 门禁自带 `test/ui/_v3-helpers.mjs`（`connectCdp` / `evaluate` / `waitFor` / `realBox` / `realClick` / `check` 的最小实现）。**理由**：把 `journey/insight/binding/hardening.mjs` 的 helper 抽成共享模块必然改动 4 个既有门禁文件（大面积删改，直接违反 FR-V3-004 / AC-V3-011，并给台账制造无谓条目）。**代价**：约 100 行重复代码，如实登记为「为保既有门禁零删改而接受的重复」。

## 后果
- 口径单源 → 「稿内一套、门禁一套」的漂移在结构上不可能（任何口径变更必须改 `density-metrics.mjs`，而该文件被三项门禁同时消费）。
- 反证可定向驱动；常量层反证（RP-V3-02）在无 Chromium 环境即可跑。
- 新增 3 个文件 + 1 个 helper；helper 重复为显式登记的代价。若将来 v4 要抽共享 helper，须以「既有门禁零删改」为前提另立 ADR。

### ADR-V3-004: 三档 × 三视口参数化与反证驱动（RP-V3-01~06）

## 状态
ACCEPTED

## 背景
父 §9.2 定义三档阈值（默认 ≤7/≤15 · 首装 ≤9/≤20 · 风险 ≤17/≤35），三档均须在 320/400/520 成立；§9.3 要求 6 条反证**必须实跑**且日志完整落盘。反证若只写在文档里，等于没有防线。

## 决策
1. **参数化矩阵**：`TIERS = ['default','firstRun','risk']` × `VIEWPORTS = [320,400,520]`（×900 高）→ **9 个强制格**；`risk` 档再展开 **5 个子场景**（未授权 / 探测中 / 硬底线被拦 / 破坏性待确认 / 引用失效）→ 每子场景 3 视口（**15 格登记 + 取 3 视口最差值参与强制判定**）。每格 3 条判定：C1 ≤ 上限、C2 ≤ 上限、**增量归属**（ADR-V3-005 第 6 条）。
2. **夹具幂等**：`applyTier(tier, sub?)` 每次先 `resetFixture()`（重载侧栏 target）再施加状态，保证格与格无串扰；`risk` 子场景用**既有通路构造**（清 origin store / 置探测态 / 触发被拦的 `evaluate` 回执 / 走既有 `#confirm` 路径 / 注入失效引用事件——最后一个在 v3-1 用注入事件，v3-4 起用真实页面侧事件）。
3. **反证驱动**（`node test/ui/density.mjs --reverse RP-V3-01..06`，逐条可单独跑）：
   - **RP-V3-01**（+1 可点元素）：默认档下向测量根注入 `<button id="rp01">` → 判定**必须** `ok === false` 且 `exceeds` 含 `C1 8 > 7`；`remove()` 后重测**必须** `ok === true`。判据 = 两段都成立，日志同时含 FAIL 段与还原后 PASS 段。
   - **RP-V3-02**（阈值 -1）：(a) 纯函数层（无 Chromium）：`evaluateDensity({clickables:7}, 'default', {clickables:6, lines:15})` → **必须** `ok === false`（证明上限真参与判定）；(b) 源码层：把 `density-metrics.mjs` 复制到临时路径、仅把默认档 `clickables: 7` 改为 `6`、用该副本驱动同一测量 → **必须** FAIL；`try/finally` 内**必须**校验原文件 sha256 未变（防忘记还原）。
   - **RP-V3-03**（CSS 隐身不算豁免）：取默认档一个已被计入的可点元素，依次设 `style.display='none'` → `visibility='hidden'` → `opacity='0'` → `pointerEvents='none'`，每次重测 **C1 不得下降**（下降即反证失败 = 判据 FAIL）；随后设 `el.hidden = true`，C1 **必须下降 1**（证明唯一豁免通道生效）→ 还原。
   - **RP-V3-04**（风险位被折叠）：把某一风险行移入 `#l1-status`（`hidden === true`）→ 跑 AC-V3-008 断言 → **必须 FAIL**（祖先链命中 `hidden`）→ 还原后 PASS。
   - **RP-V3-05**（删 1 条断言）：复制 `test/ui/l0.mjs` 到临时路径并删 1 条 `check(...)` → 以该副本为输入跑台账门禁（门禁支持 `--files-override <path>`）→ **必须 FAIL**（删除行未命中台账）→ 还原。
   - **RP-V3-06**（+1 B）：`dist/content.js` 追加 1 字节 → 既有体积守卫**必须** FAIL；`dist/pick-layer.js` +1 B → v3-4 新增守卫**必须** FAIL；两者分别留日志。
4. **纪律写进 driver**：`test:v3` 串行链式驱动；每脚本 stdout+stderr 全量 `tee` 到 `/tmp/opencode/v3-gate-logs/<gate>.log`（**禁 tail 截断**）；driver 结尾打印「档位 / 视口 / 口径 / 实测 / 上限」五元组汇总表。

## 后果
- 9 格 + 5 子场景全部可复算；反证 6 条均有机器判据与日志证据。
- `test:density` 是 Chromium 门禁（串行、数十秒级），故常量与静态部分单独由 `test/density-thresholds.test.ts` 承担（快速反馈）。
- 首装态档为 spec 新建档（设计稿未覆盖），其夹具构造与首轮实测校准见 ADR-V3-018（v3-1）。

### ADR-V3-005: C1~C4 逐条实现与反作弊；风险增量归属判定

## 状态
ACCEPTED

## 背景
父 §9.1 的四项口径必须在真实产物上可复算，且必须堵死三类「刷低计数」的后门：CSS 隐身（`display:none` / `visibility:hidden` / `opacity:0` / `pointer-events:none`）、把元素移出视口、用 `aria-hidden` 假装不可见。同时 AC-V3-003 要求「风险增量预算**只能**被风险类元素占用」——需要一个可机器判定的**归属**定义，否则无法 FAIL。

## 决策
1. **C1 可点元素**：元素满足 ① 不在任何 `hidden === true` 的祖先子树中；② `tagName ∈ {BUTTON, A, INPUT, SELECT, TEXTAREA}` ∨ （`hasAttribute('tabindex')` ∧ `getAttribute('tabindex') !== '-1'`）。**唯一豁免 = `hidden` 属性**；`display` / `visibility` / `opacity` / `pointer-events` / `aria-hidden` / 视口位置**一律不豁免**。
2. **C2 可见正文行**：`⌈ Σ(可见元素自身直接文本去空白后字符数) ÷ 34 ⌉`；「自身直接文本」= 直接子文本节点（`nodeType === 3`）拼接，**每个元素只计一次**；`{{…}}` 模板占位符剔除；`34` 为常量并 pin 在 `density-metrics.mjs`。
3. **C3 可见文本块**：自身直接文本去空白非空的**可见**元素个数；只计数、**不设上限**（跨版本对照 + 反作弊交叉验证）。
4. **C4 常驻分区**：测量根（`document.body`，ADR-V3-001）一级子元素中非 `hidden` 的个数；**不设上限**，只做「变化登记 + 反作弊」；注释必须写明反直觉事实（真实产物分区数可能**高于** D 稿，因风险位独立成区）。
5. **反作弊的实现方式（结构性，不靠自觉）**：测量源码里**只有一处**可见性判定 `visibleIn(el)`，实现为「逐 `parentElement`，仅当 `n.hidden === true` 返回 false」；**禁止**出现 `getComputedStyle` / `offsetParent` / `getBoundingClientRect` / `aria-hidden` 判定（由 `test/density-thresholds.test.ts` 对 `DENSITY_MEASURE_SOURCE` 做**字符串零命中**断言）。→ CSS 隐身无法进入豁免通道，因此 RP-V3-03 的「计数不下降」是**结构必然**而非约定。
6. **风险增量归属**：`Δ = 风险态测量元素集合 − 默认态测量元素集合`（稳定键：`id` → `data-key` → 结构性路径）；对 `Δ` 中每个元素断言 `isRiskClass(el) === true`，其中
   `isRiskClass(el) = el.closest('#risk-rail') !== null ∨ (el.closest('#l0-decision') !== null ∧ el.hasAttribute('data-destructive-option'))`。
   任何 `Δ` 元素不满足 → FAIL（AC-V3-003）。无稳定键的元素**直接 FAIL**（强制 v3-1 的实现约定）。
7. **口径变更纪律**：C1~C4 与三档阈值只允许**收紧**；任何修改必须走「需求修订 + 前后口径对照 + 与设计稿同源性说明」（父 §9.4），并在 `density-metrics.mjs` 头部注释登记前后值与理由。

## 后果
- 反作弊从「文档规则」变为「单点实现 + 静态零命中断言 + 反证三件」。
- 风险增量归属成为 AC-V3-003 的可执行判据，也可复用于「L1/L2 不得污染 L0」的回归。
- 门禁对缺失稳定键的新增元素直接 FAIL → v3-1 必须在实现约定中强制 `id` 或 `data-key`。

### ADR-V3-006: 风险位永不折叠 = 结构保证 + AC-V3-008/009 的祖先链断言

## 状态
ACCEPTED（承编排器 D-P-V3-02 / spec D3 铁律）

## 背景
D3 是硬底线：「未授权 / 探测中 / 硬底线被拦 / 破坏性待确认 / 引用失效」五类信息**绝对常驻最上层、永不折叠**，不得用 tooltip / 仅颜色 / 仅图标表达。若靠「约定 + 代码评审」，实现腐化（某处把风险行塞进某个折叠容器）几乎必然发生。

## 决策
1. **分区容器归属（静态）**：`#risk-rail` 是 `document.body` 的**直接子区**；其祖先闭包中**不得**出现 `hidden` 属性或 `[aria-expanded]`（静态断言解析 `index.html`）。风险行**只能**渲染进 `#risk-rail`（`l0/risk-rail.ts` 是唯一写入者，不接收任意父节点参数）。
2. **折叠器目标白名单（运行时抛错）**：`disclosure.ts` 的 `COLLAPSIBLE_TARGETS` 是常量数组（仅 L1 面板与 L2 入口面板），`assertFoldable(node)` 对白名单外节点**抛错**；`#risk-rail` 不在白名单 → 任何试图折叠风险位的代码路径**直接失败**（负向断言：`disclosure.toggle('#risk-rail')` 期望抛错）。
3. **破坏性选项不可进折叠池（结构）**：决策卡渲染器构造「更多选项」池时按 `kind !== 'destructive'` 过滤 → `kind === 'destructive'` 的选项**结构上**永远出现在 `#l0-decision` 的直系位置（负向断言：构造池时注入 destructive → 期望抛错 / 被过滤且断言其可见性不受折叠影响）。
4. **三通道单一模板**：`renderRiskRow()` 是唯一风险行模板，产出 `<span class="risk-text">`（非空文本）+ `<span class="risk-badge">`（徽标）+ 内联 `<svg class="risk-icon">`（图标）；文本为空 → 渲染器抛错（禁止「仅图标」与「仅颜色」）。
5. **AC-V3-008 实现（5 类 × 2 场景 = 10 断言 + 祖先链）**：`for cls of 5 类` × `for scenario of ['default','allCollapsed']`：
   `assertRiskVisible(cls)` ≜ 元素存在 ∧ `el.hidden !== true` ∧ 祖先闭包无 `hidden === true` 元素 ∧ 祖先闭包不匹配 `[data-l1-panel], [data-l2-view], [data-disclose-panel]` ∧ `rect.height > 0` ∧ 位于默认视口内（`rect.top < innerHeight ∧ rect.bottom > 0`）。
   `allCollapsed` = 调 `window.__v3.disclosure.collapseAll()`（全部 L1/L2 收起）后重跑。
6. **AC-V3-009 实现（祖先链）**：五类风险信息元素的祖先闭包中**不得**出现任何 L1/L2 容器；`#risk-rail` 默认态可见（`body.children` 中 `hidden !== true`）；`#confirm-allow` / `#confirm-deny` 的祖先闭包无折叠容器。
7. **反证**：RP-V3-04（把风险行移入 `hidden` 容器）**必须** FAIL。

## 后果
- 「永不折叠」由 3 层结构保证（分区归属 + 白名单抛错 + 过滤式折叠池）+ 2 条运行时断言族 + 1 条反证共同锁死。
- 代价：`disclosure.ts` 必须实现白名单与抛错语义（十余行），且风险行渲染器**不能复用**通用折叠组件——这是刻意的「不可复用」，以换取结构不可折叠。
- 若未来需要折叠风险详情，只能**在风险行内部**做（行本身仍常驻可见），且必须新立 ADR 并同步修 AC-V3-008/009。

### ADR-V3-007: 取代机制 = 台账 schema + `counts` 口径显式化 + hunk ↔ 台账映射门禁

## 状态
ACCEPTED（承编排器 D-P-V3-08；沿用 `docs/r2-supersession-ledger.json` 先例）

## 背景
既有断言的 DOM 耦合极深（journey 32/134、insight 118/42、binding 25/63；`sidepanel-view.test.ts` 38 用例含 4 项布局契约），任何 UI 重设计都必然打破它们。纪律 = **零删除、零降级**。r2 台账先例已成文，但其 `counts` 出现「646 / 690 / 693」**跨口径混用**（`before` 为排除正则的静态计数、`afterR2Fix` 为运行期实测），review 必须专门写口径说明才能读懂——本 Feature 必须消灭这个歧义。

## 决策
1. **落点**：`packages/web-cli-plugin/docs/v3-supersession-ledger.json`（与 `r2-supersession-ledger.json` **并列不覆盖**），纳入版本库。
2. **schema（r2 沿用 + v3 扩展）**：
   - 顶部 `version` / `feature` / `metric` / `literalRemovedZero` / `literalRemovedZeroNote`；
   - `counts`：**每个门禁一个对象**，字段 `{ baselineRuntime, currentRuntime, countMethod, floor, note }`；**`countMethod` 必填且只能取 `runtime-check-calls`**（口径 = 门禁运行时实际执行的断言次数 = 脚本结束时的 `passes + failures`），彻底消灭静态/运行期混用；
   - `gateFloors`：`{ journey: 167, insight: 108, binding: 192, sidepanelView: 38, nodeTestLowerBound: 646 }`（**只增不减**）；
   - `protectedRanges`：受保护文件的**字节区间 hash pin**（如 `test/ui/binding.mjs` 的 `#21*`/`#22*` 区段、`journey.mjs` 的 `#15a~#15q` 区段）→ 证明这些区段**字节零改**；
   - `modifiedRanges`：允许改写的行区间 + 对应 `oldId`（如 journey `#15c`）；
   - `entries[]`：`{ id, file, oldId, oldTitle, newId, newTitle, gate, reason, replacementExists }`；
   - `zeroDiffFiles`：声明零 diff 的受保护文件清单。
3. **门禁 = `test/supersession-ledger.test.ts`**（纳入 `npm test`，无 Chromium）：
   - 对每个受保护文件跑 `git diff -U0 <base>..<worktree>`（或 `--numstat`），解析出**每一处删除或修改 hunk 的行区间**；
   - **每个 hunk 必须命中**：一条 `entries[]` 的 `oldTitle` 文本匹配 **或** 一条 `modifiedRanges` 声明的区间；**未命中 → FAIL**（AC-V3-011）；
   - `protectedRanges` 的字节 hash **必须不变**，否则 FAIL；
   - `zeroDiffFiles` 必须 diff 为 0 行，否则 FAIL；
   - `entries[].newTitle` **必须能在目标文件中定位到**（防「先删后补理由」的橡皮图章），否则 FAIL；
   - `counts.*.currentRuntime ≥ gateFloors.*`，否则 FAIL；`countMethod !== 'runtime-check-calls'` → FAIL。
4. **反证**：RP-V3-05（复制受保护文件、删 1 条断言、以副本为输入跑门禁）**必须** FAIL。
5. **逐门禁策略（承父 spec §10.1，逐条落定）**：

| 门禁 | 基线 | v3 处置 | 计入口径与下界 |
|------|:--:|------|------|
| `test/ui/journey.mjs`（`test:ui`） | 167 | **zero-diff 优先**：主体字节零改；**唯一**允许的改写 = `#15c`（`composer 贴底`）→ 兜底展开态下的同义断言（同编号 + `modifiedRanges` 声明） | `currentRuntime ≥ 167` |
| `test/ui/insight.mjs`（`test:insight`） | 108 | **新断言落新文件**：v3 等效断言落 `test/ui/l1.mjs` / `test/ui/l2.mjs`；`insight.mjs` 中被新层级取代的条目**最小前置展开步骤 + 逐条 old→new 登记**（`checkLayout()` 的几何契约按下述「增强式替代」迁移） | `runtime(insight.mjs) + runtime(l1.mjs) + runtime(l2.mjs) ≥ 108`（**union 口径，必须写进 `counts.insight.countMethod` 的 note**） |
| `test/ui/binding.mjs`（`test:binding`） | 192 | `#21*`/`#22*` 区域**字节零改**（`protectedRanges` hash pin）；自由文本入口相关（`#6a` / `#6` / `#6l`）**同编号前置展开**；新断言追加 `#23a…` | `currentRuntime ≥ 192` |
| `test/sidepanel-view.test.ts` | 38（含 4 契约） | 4 项契约**逐项迁移为等价或更强的替代断言**（**不得**因「DOM 变了」删除契约）；逐条 old→new 登记 | 用例数 ≥ 38；4 项契约逐项存在替代断言（门禁校验 `newTitle` 可定位） |
| `test/insight-tree-hierarchy.test.ts#currentNodeTestCount()` | `≥ 646` | **保留并只增不减**（本 Feature 不得下调） | `current ≥ 646` |
| 安全 / 硬底线类断言 | 分散 | **只增不减**（新增 UI 面必须补反向断言：提权控件 = 0 / 伪造 `sendMessage` 不能突破 clamp / 硬底线零允许控件） | 只增 |

6. **4 项布局契约的增强式替代（旧公式失效但目的被更强约束承接，逐条登记）**：

| 旧契约（`sidepanel-view.test.ts`） | v3 替代（落在 `test/ui/l0.mjs`） | 为何更强 |
|---|---|---|
| 三分区文档序（top → main → bottom） | **保留原断言**（v3 不破坏文档序） | 不变（零 diff） |
| `body{display:flex;...overflow:hidden}` | **保留原断言** | 不变（零 diff） |
| `#panel-bottom{flex:0 0 auto}` + `#composer` 为底区末元素（`#consent-slot` 之上） | **保留原断言** + **新增**：兜底展开态下 `#composer` 贴底（`gap ∈ [0,+12]`）且不与任何常驻区交叠 | 由「静态 CSS 契约」升级为「运行时几何契约」 |
| `#log.empty:not(:has(> *))`（空态占位居中） | **保留原断言**（`#log` 空态语义不变） | 不变（零 diff） |
| `insight.mjs#checkLayout`（`#log ≥589px` / `logRatio ≥ 65.0` / `logFlexGrow==='1'`） | **新增**：① L0 四常驻区两两交面积 = 0（6 组）；② `#log` 仍是**唯一**滚动容器（`overflowY==='auto'` ∧ 面板内滚动容器计数 = 1）；③ `#log` clientHeight ≥ **首轮实测下界**（登记值，只允许上调）；④ 展开态 composer 贴底 | 589px 的**目的**（不被挤压 / 贴底 / 无遮挡）被「互不遮挡 + 唯一滚动 + 展开态贴底」三条**直接**约束取代，且不再依赖「消息区必须占主视觉」这一被 v3 有意推翻的前提 |

## 后果
- 「删除行必须命中台账否则 FAIL」成为**机器事实**（hunk 级），不再是人工核对。
- `countMethod` 唯一合法值消除了 r2 的跨口径歧义；insight 的 union 口径必须写进台账，否则门禁 FAIL（设计成「必须显式声明」而非「默默允许」）。
- 台账从 v3-1 建立、逐叶追加；**每叶收尾必须全门禁绿**（含台账门禁）——AC-V3-013 的落地。

### ADR-V3-008: 主题 / 320px / 无障碍的统一约定

## 状态
ACCEPTED

## 背景
NFR-V3-009/010/011 + AC-V3-020/021：明暗双主题、320–560px 零水平溢出、`aria-expanded`/`aria-controls` 成对、收起用 `hidden`、`:focus-visible` 可见、数字键选择、状态不靠颜色单通道。既有资产：`index.html` 的 `:root` tokens（`--*` 引用 249 处）+ `@media (prefers-color-scheme: dark)` 覆盖 + `color-scheme: light dark`；既有门禁视口 400×900 / 320×900（`insight.mjs:54-55`）。

## 决策
1. **token 组织：复用既有 `:root`，零新增 token 体系**。新增样式只能 ① 复用既有 token；或 ② 在**同一个** `:root` 块追加新 token，并**必须**在 `@media (prefers-color-scheme: dark)` 块内给出对称覆盖（静态门禁：新增 token 名必须在两处都出现，否则 FAIL）。**不引入**第二套主题机制（不加 `data-theme` 切换、不做主题开关）。
2. **折叠语义统一约定**（全 Feature 唯一语言）：收起 = 目标容器设 **`hidden` 属性**；展开 = 移除该属性；**每个**折叠触发器必须同时具备 `aria-expanded`（`"true"|"false"`）+ `aria-controls`（指向**唯一**目标 id），**成对出现**；触发器必须有**非空文字标签**（图标型必须带 `aria-label` **且**可见摘要/计数）；`aria-controls` 指向的容器**必须**含非空摘要或计数（AC-V3-010 的机器判据）。
3. **键盘与焦点**：数字键 `1`~`5` 选择当前回合选项（`keydown` 在决策卡容器内监听，`^[1-5]$` 匹配，且仅在该容器**无 `hidden` 祖先**时响应）；末项「其他…（我来描述）」展开兜底输入后焦点移入输入框，`Esc` 取消并**回焦**触发项（与 E 稿 `cancelInline` 行为一致）；收起内容**不进入 tab 序**；`:focus-visible` 样式在**明暗两主题**下均可见（取自既有 accent token）；L2 视图打开时焦点移入视图标题（`tabindex="-1"`），「← 返回」后回焦入口项。
4. **320px 策略**：`#panel-top` / `#risk-rail` / `#l0-statusbar` 允许 `flex-wrap`；长 origin 用省略号截断（**点击仍可看全文**，不得因截断丢信息）；决策卡选项在 320px 下整行显示；树缩进步长 8px（宽屏 12px）。**320px 下不删任何常驻元素**（AC-V3-021 等价集合断言：320 与 400 的常驻元素 `id` 集合相等，只允许文案截断与字号/步长变化）。
5. **状态不靠颜色单通道**：所有状态（风险 / 策略档 / LLM / 引用有效失效）必须「文字 + 徽标 + 图标」三通道（与 ADR-V3-006 第 4 条同机制）；双主题渲染断言分别在 `prefers-color-scheme: light` / `dark` 仿真下跑。

## 后果
- 三档密度 × 三视口 × 双主题 × 320px 的组合面很大，但全部落在同一套约定（`hidden` + ARIA 成对 + token 对称）→ 门禁可批量化断言。
- 不引入主题开关，避免破坏「跟随系统主题」（EC-V3-009 要求运行中切换后状态不重置）。
- 数字键 1~5 与 v1 既有键盘行为（`#input` 内打字）**不冲突**（打字时焦点在输入框，决策卡容器不接收 `keydown`）。

### ADR-V3-009: 既有 tokens / DOM 迁移边界 = id 零重命名 + 必须保留元素清单（含 `#log` 几何契约的增强式迁移）

## 状态
ACCEPTED（**含偏差登记**：`#log` 几何契约的迁移方式）

## 背景
v1 已验收元素（onboarding / discovery-notice / 确认卡 / env-guard / ask 家族 / composer 家族 / tree 家族 / settings 家族）与新布局的归属映射，直接决定密度分档能否达成（常驻元素越多，≤7 可点越难）。同时 `insight.mjs:307-331` 的 `checkLayout()` 把 v1 三区几何**硬钉**在 6 条断言上（`logFlexGrow==='1'` / `logClientHeight ≥ 589` / `logRatio ≥ 65.0` / `composerGapToBottom ∈ [0,8]` / `fab∩composer === 0` / 零水平溢出）×（关闭 / 打开 / 320 窄）三态。v3 默认态**必然**让 `#composer` 隐藏、L0 常驻区占据主视觉 → `#log ≥ 589px` 在数学上不可能同时成立（L0 常驻区高度不可为负）。

## 决策
1. **id 零重命名（结构保证 S5）**：v1 的 **54 个 `id` 全部保留原名**；迁移只允许改变「归属容器」与「默认可见性」。静态门禁断言 `index.html` 的 id 集合 **⊇** v1 的 54 id 集合。

2. **必须保留的 v1 已验收元素与归属映射**（逐项）：

| v1 元素（id） | 默认态归属 | 展开 / L2 态归属 | 理由 |
|------|------|------|------|
| `#onboarding` / `#discovery-notice` | `#panel-bottom`（首装态可见） | 同处（不迁移） | NG-V3-005 不删已验收行为；首装态独立档 ≤9/≤20 |
| `#env-guard` | `#panel-bottom`（`.strips`，异常态可见） | 同处 | 环境守卫属安全提示，**不得下沉** |
| `#site-hint` / `#notice` / `#send-reason` / `#consent-slot` | `#panel-bottom`（`.strips`） | 同处 | v1 提示位语义保留 |
| **`#confirm` / `#confirm-summary` / `#confirm-allow` / `#confirm-deny`** | `#l0-decision` 直系（**不参与折叠**） | 同处 | D3 铁律 + FR-V3-018 + EC-V3-015 |
| **`#ask` / `#ask-prompt` / `#ask-options` / `#ask-input` / `#ask-submit` / `#ask-cancel`** | `#l0-decision` 直系（**决策卡 = 复用此家族**；`#ask-input` 仅末项选中时可见） | 同处 | 复用 v1 选择题基建，避免新造输入框（FR-V3-012/013 的最省实现） |
| **`#composer` / `#input` / `#send`** | `#panel-bottom`，**`#composer` 默认 `hidden`** | 末项兜底展开时显示 | 内核三条①；保留末元素契约（`#composer` 仍为 `#panel-bottom` 末元素） |
| `#panel-top` / `#status` / `#llm-status` / `#session-label` / `#llm-test-result` | `#panel-top`（**收窄为状态带**，共享 1 个展开入口 → L1 状态详情） | L1 状态与连接详情 | L0 可点预算 ≤7 的关键 |
| `#topbar` / `#open-settings` / `#authorize` / `#more-actions` / `#revoke` / `#rebind` / `#audit` / `#audit-count` / `#session-box` / `#session-list` / `#group-name` / `#group-create` / `#group-select` / `#group-add` | **L1**（状态详情面板内） | 默认展开 L1 即见 | 归属迁移，**不删项、不改语义** |
| `#log` / `#scroll-bottom` | `#panel-main`（保留：**唯一滚动容器**；历史回合整体 `hidden`，当前回合可见） | 「已决策 N 步」展开（L1） | 保留三区契约 |
| `#tree-fab` / `#tree-drawer` | **L2**（状态栏入口面板 → 全局连接树视图） | 视图替换 | v2 行为保留（ADR-V3-028） |
| `#settings-view` / `#settings-*` | **L2**（设置视图） | 视图替换 | NG-V3-014：不改项语义、不改 `options.html` |
| 新增（v3） | `#risk-rail` / `#l0-statusbar` / `#l0-decision` / `#view-host`（`#l0-statusbar` 与 `#risk-rail` 为 `body` 直挂） | — | ADR-V3-001 / 006 |

3. **`#log ≥ 589px` 契约的迁移 = 增强式替代（显式偏差登记）**：`589px` 的目的 = 「消息区不被底部叠层挤压、composer 贴底、无遮挡」。v3 默认态把主视觉让给 L0 常驻区（这正是本 Feature 的诉求），旧**公式**不再成立，但**目的**由更强的一组断言承接（落 `test/ui/l0.mjs`，逐条台账）：(a) L0 四常驻区两两交面积 = 0（6 组）；(b) `#log` 仍是**唯一**滚动容器；(c) `#log` clientHeight ≥ **首轮实测下界**（登记，只允许上调）；(d) 兜底展开态下 `#composer` 贴底（`gap ∈ [0,+12]`）且不被常驻区遮挡。**不为满足旧公式而牺牲 L0 层级**（否则 v3 的核心诉求无法实现）。

## 后果
- 既有门禁的 `getElementById` 绝大部分继续可用 → 取代面从「选择器重写」降为「前置展开步骤」（1~2 行 `await openLayer(...)`）。
- `#composer` 默认 `hidden` 会打破 `journey.mjs#15c` 与 `binding.mjs` 的自由文本入口断言 → 按 ADR-V3-007 逐条同编号改写 + 台账（**最小集**：journey `#15c`；binding `#6a` / `#6` / `#6l`；`#21*`/`#22*` 区域字节零改）。
- `insight.mjs#checkLayout()` 的 3 条几何断言被 ADR-V3-007 第 6 条的增强式替代承接（union 口径计数）。

### ADR-V3-010: 叶子分解与顺序 + 叶间契约接口 + v3-4 前置 spike

## 状态
ACCEPTED（承编排器 D-P-V3-08；父 spec §11.1）

## 背景
4 个叶子必须**各自独立做到全门禁绿**（FR-V3-003 / AC-V3-013），且不得把红灯中间态留给下一个叶子（EC-V3-013）。叶子之间共享 4 类契约（折叠器 / 摘要计数 / 展开态记忆 / 引用 chip + 选择题），若不显式定义接口，v3-2/v3-3/v3-4 会各自发明。

## 决策
1. **顺序**：`v3-1 → {v3-2, v3-3} → v3-4`。`v3-2` 与 `v3-3` 可**并行分解**（任务排布层面）但**门禁执行必须严格串行**；`v3-4` **最后开工**（R-UI-001 / R-UI-004 / R-UI-008 三险集中）。
2. **各叶技术前置与「可独立全绿」理由**：
   - **v3-1**：无前置。只改侧栏侧 + 新增门禁文件；风险 5 状态与三档密度**均不依赖页面侧**（引用失效一类用**注入事件**构造）。产出 = L0 骨架 + 风险位 + disclosure 契约 + 密度门禁 + 首轮基线（后续三叶的共同基线）。
   - **v3-2**：前置 = v3-1 的折叠器 / 摘要计数 / 展开态记忆契约。纯 L0 → L1；引用失效判定与呈现可在侧栏侧用**注入引用态**完整验证（5 维 + 不确定 → 失效 + 两条恢复路径）。不触碰 L2 视图与页面侧。
   - **v3-3**：前置 = v3-1 的状态栏入口 + 折叠器契约。主要为「改归属 + 补计数入口」，复用既有 `tree-drawer` / 命令档案 / 审计 / 设置实现；取代台账最大战场**在本叶内闭合**（台账 + 新断言同叶完成），不依赖 v3-2 / v3-4。
   - **v3-4**：前置 = v3-1（选择题 / 引用 chip 契约）+ v3-2（引用证据 / 失效呈现）+ **spike 通过**。与 L0/L1/L2 解耦（页面侧 vs 侧栏侧）；唯一触碰 `src/content/**` 新增文件的叶子，必须独立证明「`content.js` 零增长 + `CONTENT_SOURCE_SHA256` 三项不变 + 未授权零注入 + 三退让」。
3. **叶间契约（id / 命名空间化，防漂移）**：
   - `window.__v3.disclosure`（`toggle(id)` / `collapseAll()` / `expandMemory`）——v3-1 提供，v3-2/v3-3/v3-4 只读调用，**不得**绕过（门禁断言折叠只能经此入口，见 S2）；
   - **摘要/计数契约**：`data-summary` / `data-count` 属性 + `aria-controls` 目标内非空文本（v3-1 定义，v3-2/v3-3 复用）；
   - **引用契约**：引用 id 命名空间 `ref_<n>`（**单源**，v3-2 定义 `ref-store`）+ 事实字段集（v3-4 产出），四处（页面角标 / 侧栏 chip / 证据层 / 失效风险行）同 id；
   - **选择题契约**：复用 `#ask` 家族 id（v3-1 落地），v3-4 只**喂数据**不重建 DOM。
4. **父 Feature 定位复核**：父 = 接口与契约的定义者 + 聚合报告承载者；**不产出** tasks / **不承接** build·review·validate（ADR-V3-002）。
5. **v3-4 前置 spike**（A-UI-004）：见 ADR-V3-035（v3-4 正文），要点 = 验证「按需注入形态可行 + `pick-layer.js` 体积可控 + 未授权零注入 + 三退让可实现」，验收标准 4 条、失败降级 2 条（**不以放宽上限换功能**）。

## 后果
- 4 个叶子的边界与接口固定；tasks 阶段直接据此排任务（父 plan 不排任务）。
- 并行分解但串行门禁 → 本机 ~1.5GB 内存下不发生并发 Chromium（R3-10）。
- v3-4 的 spike 未通过前不得进入实现（否则 `content.js` 红线风险不可控）。

### ADR-V3-011: 体积基线重登记流程 + 新 artifact 独立硬上限

## 状态
ACCEPTED（承编排器 D-P-V3-04 / D-P-V3-05）

## 背景
三元组约束之一：`dist/content.js ≤ 177,076 B`（**无容差**）+ `CONTENT_SOURCE_SHA256` 内容冻结；`dist/sidepanel.js` 有回归基线（基线 ≠ 目标预算，5% 容差）。v3 新增页面侧交互层，且 `sidepanel.js` 大概率增长（§2.9 C）。既有先例：`test/size-baseline.ts` 的「guard-tighten 重登记」已确立「方向只能收紧、历史值全保留、`targetBudgetBytes`/`targetMet` 保持 `null`」的纪律。

## 决策
1. **`dist/content.js`（无容差）**：**不可重登记**。v3 的策略 = 让它**字节不变**（`src/content/` 三文件零改动 + entry 定义不变）。任何「改上限以容纳功能」的方案（含「先把上限调高、后来再收紧」）**一律禁止**（NG-V3-010 / EC-V3-012）。若穷尽手段仍与红线冲突 → 回报编排器（**不得**静默放宽）。
2. **新 artifact `dist/pick-layer.js`**：新建**独立硬上限** `PICK_LAYER_BASELINE_BYTES` = 首轮 `npm run build` 后的**实测值**（无容差，与 `content.js` 同级口径）；`PICK_LAYER_BASELINE_META` 记 `measuredOn` / `source` / `buildCommand` / `measuredBy` / `direction`；**不与 `content.js` 合并计数**（合并会互相掩盖）。
3. **`dist/sidepanel.js`（基线 266,500 / ceiling 279,825 / 容差 5%）**：若叶子改动导致实测超 ceiling，走**显式重登记**，落点 `test/size-baseline.ts`，必须同时满足：
   - `SIDEPANEL_BASELINE_BYTES` 更新为**新实测值**；旧值 **必须**加入 `SIDEPANEL_BASELINE_BYTES_HISTORY`；
   - `SIDEPANEL_BASELINE_META` 补全：`measuredOn` / `source`（`dist/sidepanel.js`）/ `buildCommand` / `measuredBy`（叶子 + 轮次）/ `previousBaselineBytes` / `previousCeilingBytes` / `direction`（`raised` 时必须写明「有意增重」的**功能理由**）/ `reRegisteredFrom`；
   - **容差 5% 不变**；`targetBudgetBytes` / `targetMet` 保持 `null`（禁止「目标达成」叙述回潮，ADR-V2-007）；
   - **断言零删减**；反证（+1 B → FAIL）在新值上**重新驱动**。
4. **密度基线与体积基线分开登记**：密度基线落 `docs/v3-density-baseline.{md,json}`（三档 × 三视口实测值 + 日期 + 来源 + 与设计稿口径分列）；体积基线落 `test/size-baseline.ts`。**不得**把两者混在同一份文档里（否则口径混淆）。
5. **登记时机**：每个叶子收尾时（跑完门禁后）检查是否触发重登记；触发则**同叶内**完成登记与反证复跑，**不得**留给下一叶（EC-V3-013）。

## 后果
- `content.js` 的红线通过「让它不变」而非「重登记」守住（最强形式）。
- `pick-layer.js` 获得独立、无容差的守卫，避免「新 artifact 无守卫」的空白。
- `sidepanel.js` 若增长，走**有据可查**的重登记（前后值 + 日期 + 来源 + 理由 + 历史保留），而不是悄悄放宽容差。**明确禁止**：改容差 / 删断言 / 用「基线 ≠ 目标预算」的语义偷换。

### ADR-V3-012: ROADMAP 版本位 = 方案 A 最小消解（只登记，执行放收口阶段）

## 状态
ACCEPTED（**仅登记**；承编排器 D-P-V3-06 + 父 spec §2.6）

## 背景
O-UI-005 已裁决本 Feature 版本位 = **v0.9.0（UI 渐进式披露升级）**；而 `ROADMAP.md` 现有 `v0.9.0 = 工程质量与文档对齐`（含 archify 借鉴批次 F-15~F-22、F-06/F-11 测试护栏立项首位；原 v0.7→v0.8 两次后移），且 ROADMAP 中 `specs-tree-web-cli-plugin-v3` / `渐进式披露` / `F-28` **0 命中**（R-UI-013 成立）。铁律：**不得删除既有里程碑叙述**（FR-V3-006）。

## 决策
1. 采用父 spec §2.6 **方案 A（最小消解）**：`v0.9.0` 主题**扩写为双主题并列**（「UI 渐进式披露升级」+「工程质量与文档对齐」）；**原内容不删除、不顺延**；登记方式 = ROADMAP 头部新增素材增补行 + §二 v0.9.0 小节追加「同批 Feature：`specs-tree-web-cli-plugin-v3-ui`」+ 版本总览表 v0.9.0 行追加；增补行标注**日期与依据**。
2. **本 plan 只登记，不修改 `ROADMAP.md`**（本轮零改动）。执行时机 = **收口阶段**（4 叶全绿后），由编排器统一执行。
3. **拒绝**方案 C（把 v0.9.0 现有内容顺延到 v0.10.0）：会连锁重排 v0.10 / v1.0.0 / v1.1 版本位与里程碑，违反「最小消解、不删既有叙述」的精神。方案 B（v0.8 同批第三 Feature，ROADMAP 零改动）作为**备选**保留，但需编排器确认（与 O-UI-005 的 v0.9.0 裁决不一致）。
4. **理由（为何与 v0.9「验收闭环机械化」同主题）**：本 Feature 的核心验收 = 密度门禁可机器复算 + 断言取代台账 + 体积/基线显式重登记 + **门禁必须能 FAIL**；而 v0.9 的立项首位 F-06/F-11「测试护栏」正是这些门禁的载体 → 从「两件并列的事」变为「同一件事的两面」，消解成本最低。

## 后果
- ROADMAP 现阶段零改动（本轮纪律满足）；收口阶段需一次性完成 3 处增补（头部素材行 / §二小节 / 版本总览表）。
- 历史叙述逐字保留 → review 可用「既有行零删除」机器核验。
- 若编排器最终选方案 B，本 ADR 需 supersede（另立 ADR-V3-0xx）并同步父 spec §2.6 登记。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：v3「UI 渐进式披露升级」**统领性技术方案**（父 + 4 叶同批）。**产出**：父 `plan.md`（本文件，含 §1~§8）+ 4 叶 `plan.md`；**ADR-V3-001~036**（父承 001~012，叶子承 013~036）。**覆盖编排器 11 项议题**（§2.8 逐项索引）。**关键裁决**：① 三层 DOM/模块边界 = `body` 为测量根 + L0 常驻分区直挂（ADR-V3-001，含测量根口径适配登记）；② 密度门禁三段式（口径单源 `test/ui/density-metrics.mjs` + Chromium `test/ui/density.mjs` + 无 Chromium `test/density-thresholds.test.ts`；ADR-V3-003/004/005）与 6 条反证的实跑判据；③ 风险位永不折叠的**三层结构保证** + AC-V3-008/009 祖先链断言实现（ADR-V3-006）；④ 引用失效 fail-closed 的**唯一放行点** `isRefUsable = verdict === 'valid'`（ADR-V3-020，v3-2）；⑤ 页面侧 = 第 5 bundle `dist/pick-layer.js` + `executeScript` 按需注入（双触发 / 幂等 / teardown），`content.js` 字节与三文件 pin **不变**（ADR-V3-030/031，v3-4）；⑥ 右键自绘菜单三退让 + `role="menu"` 键盘语义（ADR-V3-032）；⑦ 取代台账 `docs/v3-supersession-ledger.json` + hunk ↔ 台账映射门禁 + `countMethod` 唯一合法口径（ADR-V3-007）；⑧ 主题 / 320px / 无障碍统一约定（ADR-V3-008）；⑨ **id 零重命名** + 54 id 归属映射 + `#log ≥589px` 契约的增强式迁移（ADR-V3-009）；⑩ 叶子顺序与叶间契约（ADR-V3-010）；⑪ 体积重登记流程 + 新 artifact 独立硬上限（ADR-V3-011）+ ROADMAP 方案 A 只登记（ADR-V3-012）。**偏差显式登记**：父 plan 产出与否（ADR-V3-002）、密度测量根口径（ADR-V3-001）、`#log` 几何契约迁移（ADR-V3-009）、v3 门禁自带 helper 不抽共享模块（ADR-V3-003）。**本阶段只做 plan**：不写 tasks、不写代码、不改 `src/**`·`test/**`·`manifest.json`·`design/**`·ROADMAP、不改 v1/v2 SDDU 目录、不动 `main`、不 commit/push、**未跑任何门禁 / 构建 / Chromium**。 | 2026-09-16 | SDDU Plan Agent |




