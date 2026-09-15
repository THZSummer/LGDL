# 技术计划：specs-tree-v3-4-page-as-input（V3-4 页面即输入）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: 本叶 `spec.md` v1.0 + 父 `../spec.md`（§5.5 / §8.4 / §6 NFR-V3-003~007）+ 父 `../plan.md`（承接 **ADR-V3-005 / 006 / 007 / 008 / 009 / 010 / 011**；本叶独承 **ADR-V3-030~036**）+ **叶子 V3-1**（选择题 / 引用 chip / 折叠器契约）+ **叶子 V3-2**（引用证据与失效呈现契约 / 事实字段集）+ 设计基准 `design/ui-redesign/option-e-progressive.html`
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（页面即输入四项交互 + 右键自绘菜单三退让 + 双向联动 + **页面侧按需注入与体积核算** + 前置 spike 定义；ADR-V3-030~036）。**只做 plan**：不写 tasks、不写代码、不改源码/测试/设计稿、不跑门禁与 Chromium。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 本叶 `spec.md` 存在（15,650 B） | ✅ |
| 父 `spec.md` / `discovery.md` / `plan.md` 存在 | ✅ |
| **V3-1 / V3-2 契约可承接**（选择题 `#ask` 家族 / 引用 chip `ref_<n>` 单源 / 事实字段集 / 失效呈现位） | ✅（设计已定） |
| 设计基准 `option-e-progressive.html`（P1~P6 / G1~G2 页面侧交互；`window.__density` 与稿件自绘菜单实现） | ✅ |
| **既有执行注入通路可用**（`chrome.scripting.executeScript({target:{tabId}, files:['content.js']})` 已在 `service-worker.ts:920` 使用；静态 `scripting` 权限已在 manifest） | ✅（零新增权限） |
| **外部 API 文档缓存** | ⚠️ **N/A** —— 本叶无外部服务 API；页面侧只做 DOM 事实采集与 UI，不发起网络请求 |
| 红线基线（`main` 未动；`manifest.json` / `src/security/**` 零改动） | ✅ |
| **`content.js` 余量 0**：`dist/content.js` = 177,076 B = `CONTENT_MAX_BYTES`（无容差）；`CONTENT_SOURCE_SHA256` 冻结三文件 | ✅（本叶**必须**保持三者不变） |
| ⚠️ **前置 spike（A-UI-004）必须先做** | ⏳ **待执行**（见 ADR-V3-035；spike 未通过前不得进入实现） |

**本叶承接的父 plan 约束（不重新讨论）**：

| 父 ADR | 对本叶的直接约束 |
|--------|----------------|
| ADR-V3-005 / 006 | 引用失效的**页面侧职责 = 只上报事实**（不做判定）；失效呈现仍在 `#risk-rail`（本叶负责产生真实失效事件并上报） |
| ADR-V3-007 | 取代台账：本叶**只追加** `entries[]`（binding 页面侧条目为主）；`#21*`/`#22*` 区域字节零改 |
| ADR-V3-008 | 自绘 UI 的可读性（明暗主题）+ `Esc` 关闭 + `:focus-visible` |
| ADR-V3-009 | id 零重命名（`#ask` 家族由本叶喂数据，不重建 DOM） |
| ADR-V3-010 | 本叶消费 V3-1（选择题 / chip / 折叠器）与 V3-2（事实字段集 / 失效呈现）契约；**唯一**触碰 `src/content/**`（新增文件）的叶子 |
| ADR-V3-011 | `pick-layer.js` 建**独立硬上限**（无容差）；`content.js` 不可重登记 |

---

## 2. 架构分析

### 2.1 现状基线（只读实测）

| 事实 | 值 | 对本叶的含义 |
|------|-----|-------------|
| `dist/content.js` | **177,076 B = `CONTENT_MAX_BYTES`**（+1 B 即 FAIL） | 页面侧新代码**一律不得**进入 `content.js` |
| `CONTENT_SOURCE_SHA256` | 冻结 `src/content/{content-script,dom-agent,page-bridge}.ts`（**逐文件内容 hash**） | 新增 `src/content/*.ts` **不改变**这三个文件的 hash（pin 不变）；**不得**修改这三个文件 |
| 注入机制（既有） | ① 登记式：`registerContentScripts({persistAcrossSessions:true})`，`js:['content.js']`，绑定后按 origin 注册；② 执行式：`executeScript({target:{tabId}, files:['content.js']})`（图标点击路径） | 本叶复用**执行式**注入第 5 个 bundle（`files:['pick-layer.js']`），**零新增权限** |
| 未授权零注入 | `registerContentScripts` 对无 host permission 的 origin 直接失败；未授权站点不注册、不注入 | 本叶新注入路径**同样**只在已授权 origin 生效（`executeScript` 需 host permission） |
| `content.js` 既有 DOM 能力 | `dom-op` 通道（`content-script.ts` 的 `onMessage` case）+ `page-bridge.ts` 的页面事件桥 | 本叶的拾取层**独立**采集（不复用 `content.js` 内部函数，避免改动冻结文件）；但**语义路径 / 选择器口径**必须与 v3-2 证据层一致（共享 `ref-capture.ts`） |
| 构建形 | `build.mjs` 4 个 entryPoint，**无 minify**（未压缩 IIFE） | 新增第 5 个 entryPoint；体积按未压缩估算（§2.4） |
| host_permissions | 6 个 LLM 域（**不含站点**）；站点经 `optional_host_permissions` 在绑定时授予 | 右键/拾取**不**需要任何新权限（DOM 事件 + 自绘 UI 即可） |
| `contextMenus` | **不存在**（也不在 optional 列表） | 右键菜单只能**自绘**（路线 1）+ 三退让 |

### 2.2 目标：页面侧交互层 = `dist/pick-layer.js`（按需注入）

**（1）形态与触发（本叶核心决策，ADR-V3-030）**

| 项 | 设计 |
|---|---|
| 产物 | `dist/pick-layer.js`（第 5 个 esbuild entry，IIFE，isolated world） |
| 注入方式 | `chrome.scripting.executeScript({ target: { tabId }, files: ['pick-layer.js'] })` |
| **触发 1（面板在场）** | 侧栏（side panel）在**已授权 origin** 上打开时，向 SW 发 `pick-layer-inject`；SW 对当前 tab 执行注入 → 保证「右键随时可用」 |
| **触发 2（拾取点击）** | 用户点 L0「从页面拾取」→ 同一 `pick-layer-inject`（**幂等**：层内 `window.__wcliPickLayer` 已存在则直接返回并置拾取态）→ 覆盖「面板先于授权打开」「SW 重启」「页面重载」等竞态 |
| 生命周期结束 | ① 面板关闭 / 卸载 → 侧栏发 `pick-layer-teardown` → 层的 `chrome.runtime.onMessage` 收到 → 自卸载（移除全部监听 + 移除 Shadow host + `delete window.__wcliPickLayer`）；② origin 撤销授权 → SW 在既有 revoke 流程后追加 teardown；③ 页面导航 → 层随文档卸载（无需处理） |
| 幂等键 | `window.__wcliPickLayer`（含 `{ version, state, unmount() }`） |
| **「按需」的语义边界（显式登记）** | 「按需」= **不打进常驻 `content.js`** ∧ **未授权站点零注入** ∧ **面板在场期间才注入** ∧ **面板关闭即卸载**。**代价（如实登记）**：若侧栏从未打开，则页面**不**拦截右键（交回原生菜单）——这与 v1 的「页面侧零注入」哲学一致（**有面板才有页面侧交互**） |
| 失败降级 | 注入失败（无 host permission / tab 不可注入 / `chrome://` 等受限页）→ SW 回报可读原因 → 侧栏在 `#risk-rail`（或 L1 状态详情）明示「页面侧不可用（原因）」，且「从页面拾取」入口**禁用**（不静默失败） |

**（2）四项交互（FR-V3-060~066，逐项落位）**

| # | 交互 | 页面侧实现 | 侧栏侧结果 |
|:--:|------|-----------|-----------|
| ① | **Alt 悬停拾取** | `keydown/keyup` 监听 Alt（**只监听修饰键状态，不 `preventDefault` 宿主行为**）+ `pointerover` 命中元素 → 唯一描边 + 浮动标签（语义路径 › 极短选择器 › 文本摘要） | `ref-captured` → chip `ref_<n>` + **一道选择题**（`#ask`） |
| ② | **Alt 拖动到侧栏** | 拾取态下 `pointerdown` 接管 → 跟随胶囊 + `pointermove` 更新落点；落到侧栏区域 → `drop` 事件（侧栏侧监听 `drop`）→ 引用；未落到 → 「已取消引用」**零副作用** | 落点高亮（侧栏 `dragover`）→ 松手生成 chip + 选择题 |
| ③ | **右键自绘菜单** | `contextmenu` 拦截（**仅层在场时**）→ 自绘菜单（Shadow DOM 内，`role="menu"` + `role="menuitem"`） | 菜单项：纳入引用 / 作为操作目标 / 引用选中文本 / 在此处拾取 / **交给页面原生菜单** |
| ④ | **拖选文本气泡** | `mouseup` 后读 `selection`（**只读选区，不读剪贴板**）→ 选区右下 12px 气泡「引用选中内容（N 字）」→ 1.8s 自动淡出 | 点击气泡 → 文本引用 chip + 选择题 |
| （加法） | **双向高亮联动**（P4） | 收到「高亮 ref_n」→ 页面元素描边闪动 + 滚动到可见 + 角标 `①②③`；hover 角标 → 通知侧栏高亮 chip | chip ↔ 角标 **同序号**（同一 `ref_<n>`） |

**（3）宿主兼容与隔离策略（ADR-V3-033）**

| 约束 | 实现 |
|---|---|
| 样式污染 | 自绘 UI 全部在 **open Shadow DOM**（`host.attachShadow({mode:'open'})`）内；host 元素用**唯一属性选择器**（`[data-wcli-pick-root]`）+ `all: initial` 基线 + 高 `z-index`（`2147483000`）；SVG 图内联（无外链） |
| 不吞宿主事件 | ① Alt 监听**不** `preventDefault`（只读 `event.altKey` 状态）；② 非拾取态**不**接管 `pointerdown/move`；③ 仅对**当前目标元素**在拾取态 `preventDefault`；④ 自绘菜单仅拦截 `contextmenu` 且**只在自己打开时**；⑤ 气泡不阻止选区默认行为（点击气泡才 `stopPropagation`） |
| 可关闭 | `Esc` 关闭菜单 / 撤销高亮 / 退出拾取态；点击空白关闭菜单；`Shift+Alt`（或点击「交给页面原生菜单」）恢复下一次原生右键 |
| 全屏 / 高 z-index 冲突 | 若宿主存在更高层级全屏元素导致自绘 UI 不可读 → 退让到菜单项「交给页面原生菜单」（EC-V3-017 的兑现路径） |

**（4）`content.js` 冻结与被改动内容的处理（FR-V3-072 / NFR-V3-003）**

| 项 | 处理 |
|---|---|
| `src/content/{content-script,dom-agent,page-bridge}.ts` | **零改动**（字节）；`CONTENT_SOURCE_SHA256` 三项 pin **不变** |
| 新增 `src/content/{pick-layer,ref-capture,pick-overlay,pick-menu,pick-bridge}.ts` | 新增文件（不改冻结文件 → pin 不变） |
| `build.mjs` | **追加**第 5 个 entryPoint（既有两个 content 相关 entry 零改动） |
| `manifest.json` | **零改动**（`executeScript({files})` 不需要 manifest 声明、不需要 `web_accessible_resources`） |
| 若未来必须改冻结文件（**本叶不允许**） | 唯一合法路径 = 显式更新 `CONTENT_SOURCE_SHA256`（带**日期 + 理由 + 前后值**）并**同时**证明 `content.js` ≤ 177,076 B；本叶**禁止**走此路径（改冻结文件的动机在本叶不存在——拾取层是独立 bundle） |

### 2.3 体积核算（页面侧）

| 组成 | 预估源码 | 说明 |
|---|---|---|
| `ref-capture.ts` | ~4 KB | 选择器 / 语义路径 / `textDigest` / 事实快照（纯函数；**与 v3-2 证据层同源口径**；可被 node 单测） |
| `pick-overlay.ts` | ~10 KB | Shadow DOM 宿主 + 描边 / 浮动标签 / 跟随胶囊 / 气泡 / 角标 + 内联 CSS（无外链） |
| `pick-menu.ts` | ~5 KB | 自绘菜单 + 三退让 + 键盘 / `role="menu"` |
| `pick-bridge.ts` | ~4 KB | `chrome.runtime` 消息（capture / highlight / teardown）+ 幂等 + 宿主事件不吞 |
| `pick-layer.ts` | ~5 KB | 组装 + Alt/pick 状态机 + 拖动 / 拖选绑定 |
| esbuild/IIFE 包装 | ~2~3 KB | 未 minify（与既有产物同形） |
| **合计** | **~30~33 KB 源码 → 产物预估 ~42,000~58,000 B** | 参照：`src/content/**` 33,424 B 源码 → `content.js` 177,076 B（**含 base LLM/SDK 依赖**）；本层**不依赖 base SDK** → 膨胀比远低 |

**守卫设计（ADR-V3-031）**：`PICK_LAYER_BASELINE_BYTES` = 首轮构建实测值；`PICK_LAYER_CEILING` **= 该值（无容差）**（新 artifact，无历史包袱 → 采用与 `content.js` 同级的「不增长」口径）；反证：+1 B → FAIL；**不与 `content.js` 合并计数**（合并会互相掩盖）。

### 2.4 与 V3-1 / V3-2 / v3-3 的边界

| 边界 | 归属 |
|------|------|
| L0 骨架 / 风险位 / 密度门禁 | v3-1（本叶只**消费**「从页面拾取」入口与其禁用态语义） |
| 引用失效**判定**与呈现 | **v3-2**（本叶只**产生真实失效事件**并上报事实：元素消失 / 导航 / 声明变化 / origin 变更） |
| L2 四类视图 | v3-3（本叶不涉及） |
| 页面侧采集 / 自绘 UI / 右键 / 角标 / 双向联动 | **本叶** |
| 手势表条目数 | v3-2 落基础 4 项；本叶补齐（Alt 悬停 / Alt 拖动 / 右键 / 拖选 + G1 双击 / G2 悬停 ⊕）并做**双向相等**断言（FR-V3-070） |

---

## 3. 方案对比

### 3.1 P-V34-01 注入触发形态

| 维度 | **方案 A：双触发（面板在场 + 拾取点击），幂等，面板关闭即卸载** | 方案 B：仅「拾取点击」时注入 | 方案 C：第二个**登记式** content script（`js:['content.js','pick-layer.js']`，随授权常驻） |
|------|:--|:--|:--|
| 描述 | 侧栏在已授权 origin 打开 → 注入；「从页面拾取」点击 → 再注入（幂等）；teardown 消息 → 自卸载 | 只在用户点拾取时注入 | 在 `registerSiteContentScript` 的 `js` 数组追加文件，授权期内常驻 |
| 优点 | ① 右键菜单**随时可用**（满足 FR-V3-064 的四项交互之一）；② 未授权仍零注入；③ 面板关闭即卸载（资源占用更低）；④ 零新增权限（`executeScript` 既有用法） | 注入时机最少 | 天然常驻（无需 teardown 编排） |
| 缺点 | 需 SW 侧 2 个 case + teardown 编排（薄） | **右键菜单在用户未进入拾取态前不可用** → FR-V3-064 的「右键自绘菜单」在一段真实使用路径上缺失（需在 spec 层降级，本叶无权重定义需求） | ① 页面侧层**常驻**于所有已授权站点（**即使侧栏从未打开**）→ 与「按需」语义相悖、常驻占用更高；② 需改 `content-script-registry.ts` 的 `js` 数组（扩大改动面）；③ 卸载只能靠「撤销授权」 |
| 风险 | 低 | 中（需求覆盖不足） | 中（语义边界 + 常驻占用） |
| 工作量 | 中 | 低 | 低 |

### 3.2 P-V34-02 自绘 UI 的隔离策略

| 维度 | **方案 A：open Shadow DOM + `all: initial` 基线 + 最高 `z-index`** | 方案 B：普通 DOM + 命名空间类名前缀 + 高 `z-index` | 方案 C：`<iframe>` 叠层 |
|------|:--|:--|:--|
| 描述 | 单一 host 元素 `[data-wcli-pick-root]`，内部 Shadow root 承载全部 UI 与内联 CSS | 直接插 DOM，类名一律 `wcli-` 前缀 + `!important` 关键属性 | 注入 iframe 承载 UI |
| 优点 | ① 宿主 CSS 无法污染（`all: initial` + Shadow 边界）；② 我方 CSS 不泄漏到宿主（不破坏宿主样式）；③ DOM 结构可断言（`shadowRoot` 内查询） | 实现简单、调试直观 | 隔离最强 |
| 缺点 | 门禁查询需进 `shadowRoot`（helper 支持即可）；老浏览器需 `attachShadow` 支持（Chrome ≥116 已满足，`minimum_chrome_version: 116`） | 仍可能被宿主 `!important` / 全屏元素污染；**且我方样式会泄漏到宿主**（破坏宿主） | iframe 有独立文档 → 事件/选区/坐标同步复杂，且可能触发宿主 CSP/`frame-src` 限制 |
| 风险 | 低 | 中（双向污染） | 中高（CSP + 坐标/选区同步） |
| 工作量 | 中 | 低 | 高 |

### 3.3 P-V34-03 引用捕获口径的归属

| 维度 | **方案 A：共享模块 `src/content/ref-capture.ts`（页面侧采集）+ v3-2 侧栏消费同一口径** | 方案 B：页面侧各自实现选择器/路径生成 | 方案 C：复用 `content.js` 内部函数（改动冻结文件） |
|------|:--|:--|:--|
| 描述 | 一个纯函数模块产出 `{selector, semanticPath, textDigest, ...}`；页面侧与（若需）侧栏证据层共用 | 每个交互各自生成 | 从 `content-script.ts` 导出既有逻辑 |
| 优点 | ① 口径单源（证据层与页面角标描述同一目标）；② 纯函数 → node 单测（选择器稳定性 / 截断口径）；③ **不改冻结文件** | 无耦合 | 复用成熟实现 |
| 缺点 | 新增模块（~4 KB 产物） | **两套口径** → 证据层与页面描述不一致（作者一眼可见） | **必须修改 `content-script.ts`** → 违反 `CONTENT_SOURCE_SHA256` 冻结 + 影响 `content.js` 字节 → **红线违规** |
| 风险 | 低 | 中 | **不可接受** |
| 工作量 | 低 | 低 | 低但方向错 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V34-01 注入触发 | **方案 A**（双触发 + 幂等 + teardown） | 唯一同时满足「右键随时可用」「未授权零注入」「按需（不进 `content.js`）」的形态；机制是既有 `executeScript` 的延伸（ADR-V3-030） |
| P-V34-02 隔离 | **方案 A**（open Shadow DOM） | 双向隔离（宿主污染不进、我方样式不漏），且 `minimum_chrome_version: 116` 已满足（ADR-V3-033） |
| P-V34-03 捕获口径 | **方案 A**（共享 `ref-capture.ts`） | 口径单源 + node 可测 + **不碰冻结文件**（ADR-V3-034） |

**本叶开放点裁决（V34-O-1~5，逐条落定）**：

| # | 开放点 | 裁决 | 落点 |
|---|--------|------|------|
| V34-O-1 | **按需注入的可行性与形态**（A-UI-004 前置 spike 必须先做） | 形态 = 第 5 bundle + `executeScript` 双触发（ADR-V3-030）；**spike 定义与验收标准见 ADR-V3-035**；spike 未通过 → **走降级方案 C**（第二个登记式 content script）并显式登记取舍；**禁止**把代码塞进 `content.js` 或放宽 `CONTENT_MAX_BYTES` | ADR-V3-035 / ADR-V3-030 |
| V34-O-2 | 自绘菜单与气泡的隔离策略 | **open Shadow DOM**（`attachShadow`）+ host 唯一属性选择器 + `all: initial` + 最高 `z-index`；图内联 SVG（ADR-V3-033） | ADR-V3-033 |
| V34-O-3 | 「语义路径」的生成算法与稳定性（供证据与失效判定复用） | 采**稳定优先**策略：`id` → `data-*` 稳定键 → 结构性路径（`tagName` + `nth-of-type` 逐级，**最多 6 级**）→ 截断 120 字符；**同时**在目标上写 `data-wcli-ref="ref_<n>"` 标记（供 D1 身份判定）；纯函数 + node 单测（同一 DOM 两次生成结果相等） | ADR-V3-034 |
| V34-O-4 | 拖选的**最小触发长度**与是否在输入框 / 可编辑区域内禁用 | 最小 **2 个字符**（去空白后）；**在 `input` / `textarea` / `[contenteditable]` 内禁用**（不干扰宿主输入行为）；气泡 1.8s 自动淡出；点击气泡才生成引用 | ADR-V3-030 / ADR-V3-033 |
| V34-O-5 | 若按需注入不可行：重登记的体积前后值与拆分方案 | **不接受放宽 `CONTENT_MAX_BYTES`**（无容差项）；降级 = 方案 C（仍不改 `content.js` 字节）；若降级仍不可行 → **回报编排器**，不在叶内自行放宽（EC-V3-012） | ADR-V3-035 |

---

## 5. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/content/pick-layer.ts` | 拾取层入口（组装 + Alt 状态机 + 拖动 / 拖选绑定 + 幂等标记 + unmount） |
| NEW | `packages/web-cli-plugin/src/content/ref-capture.ts` | 原始事实捕获（`selector` / `semanticPath` / `textDigest` / `documentId` / `navSeq` / `declarationHash` / `capturedAt`；纯函数） |
| NEW | `packages/web-cli-plugin/src/content/pick-overlay.ts` | Shadow DOM 宿主 + 描边 / 浮动标签 / 跟随胶囊 / 气泡 / 角标 + 内联 CSS |
| NEW | `packages/web-cli-plugin/src/content/pick-menu.ts` | 右键自绘菜单（三退让 + `role="menu"` + 键盘 + `Esc`/点空白关闭） |
| NEW | `packages/web-cli-plugin/src/content/pick-bridge.ts` | 与 SW / 侧栏消息（`ref-captured` / `highlight` / `teardown`）+ 宿主事件不吞 |
| MODIFY | `packages/web-cli-plugin/build.mjs` | **追加**第 5 个 entryPoint（`src/content/pick-layer.ts` → `dist/pick-layer.js`，IIFE）；既有 4 个 entry 零改动 |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | **追加** `case 'pick-layer-inject'` / `'pick-layer-teardown'`（复用既有 `executeScript` 通路；既有 case 零改动） |
| MODIFY | `packages/web-cli-plugin/src/background/messaging.ts` | `PluginMessageKind` **追加**拾取层相关 kind |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 追加：面板在场注入触发 / teardown / 引用事件订阅 / 角标联动 / 拾取入口接线（既有 handler 零删改） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/l1/*.ts` | 手势表条目补齐（与实现双向相等）；引用证据层消费同一 `ref-capture` 口径 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 引用 chip / 角标联动相关标记与样式（**复用 `:root` tokens**） |
| NEW | `packages/web-cli-plugin/test/ui/page-input.mjs` | 页面即输入门禁（在**已授权 fixture 站点**上）：四项交互各生成 1 引用 + 1 选择题 / 唯一高亮可撤销 / 拾取期间命令发送 = 0 / 拖动两路径 / 右键三退让 / 气泡 / 双向同序号 / 宿主交互零影响 / 手势表条目数双向相等 |
| NEW | `packages/web-cli-plugin/test/zero-injection.test.ts` + `test/ui/zero-injection.mjs` | **未授权站点零注入**：无注册 / 无注入 / 无监听 / 无拾取 UI / 无右键拦截（含反证：故意注入 → FAIL） |
| NEW | `packages/web-cli-plugin/test/pick-layer-budget.test.ts` | `dist/pick-layer.js` 独立硬上限 + 反证（+1 B → FAIL）+ `content.js` ≤177,076 复核 + `CONTENT_SOURCE_SHA256` 三项 pin 不变 |
| NEW | `packages/web-cli-plugin/test/ref-capture.test.ts` | 纯单测：选择器 / 语义路径稳定性（同 DOM 两次结果相等）/ 截断口径（80 / 120）/ 事实字段齐备 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | **仅追加** `PICK_LAYER_BASELINE_BYTES` / ceiling / meta（既有常量与断言零改动） |
| MODIFY | `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | **追加**本叶 `entries[]`（binding 页面侧条目为主） |
| MODIFY | `packages/web-cli-plugin/package.json` | 追加 scripts：`test:page-input` / `test:zero-injection`；`test:v3` 串行链追加（依赖零新增） |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` | 页面侧相关断言**同编号最小改写** + 台账；`#21*`/`#22*` 区域**字节零改** |
| SPIKE（不写产品代码） | `/tmp/opencode/v3-spike/`（临时目录） | A-UI-004 spike 证据（注入验证 + 体积实测 + 零注入验证 + 三退让验证的日志与数据）；**不入版本库**，结论摘要写入本叶 build 报告 |

**明确不改（红线）**：`src/content/{content-script,dom-agent,page-bridge}.ts`（**冻结，字节零改**） · `manifest.json`（零 diff，含**无 `contextMenus`**、无 `web_accessible_resources`） · `src/security/**` · `packages/web-cli-base/**` · `options.html` · `design/**` · v1/v2 SDDU 目录 · `ROADMAP.md` · 依赖段 · `CONTENT_MAX_BYTES`（**禁止**修改）。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R34-01 `content.js` 被间接撑大** | 中 | **极高** | 页面侧代码**全部**在 `dist/pick-layer.js`（独立 entry）；`CONTENT_SOURCE_SHA256` 三文件零改；`build.mjs` 只追加 entry；门禁：`content.js` ≤177,076（无容差）+ 三 pin 不变 + 反证 +1 B；**任何**需要改冻结文件的方案一律否决（ADR-V3-031） |
| **R34-02 按需注入不可行（spike 否决）** | 中 | 高 | spike **先行**（ADR-V3-035，4 条验收 + 2 条降级）；降级 = 方案 C（第二个登记式 content script，仍不改 `content.js` 字节），并**显式登记取舍**；若降级也不可行 → 回报编排器（**禁止**放宽上限） |
| **R34-03 右键劫持引发用户/宿主冲突（路线 1 的真实代价）** | 中 | 高 | 三退让逐条实现 + 门禁断言：① 仅已授权站点生效（未授权零注入）；② 菜单首项「**交给页面原生菜单**」（下 1 次右键不拦截）；③ `Esc` 与点击空白即关；④ 未授权 / 层不在场 → **完全不拦截** |
| **R34-04 自绘 UI 被宿主样式污染或污染宿主** | 中 | 中 | open Shadow DOM + `all: initial` + 唯一 host 属性选择器 + 内联 SVG；门禁：注入「宿主全局 `* { … !important }` + 高 z-index 全屏元素」的污染夹具 → 自绘 UI 仍可读且可关（EC-V3-017） |
| **R34-05 吞掉宿主事件（破坏宿主交互）** | 中 | 中 | 非拾取态不接管 `pointerdown/move`；Alt 监听不 `preventDefault`；仅目标元素在拾取态接管；拖选在输入框 / 可编辑区禁用；门禁：宿主 fixture 上的点击 / 拖动 / 输入 / 选区行为**零影响**断言 |
| **R34-06 拾取期间误发命令** | 低 | 极高 | 拾取路径**只产出引用素材**（`ref-captured`），**不进入**动作派发；门禁：拾取全过程命令发送计数 = 0（监听既有消息通道） |
| **R34-07 引用失效事件未上报（页面侧目标消失后侧栏无感）** | 中 | 高 | 层内监听 DOM 变化（对已引用目标用 `MutationObserver` 局部观察 + 导航事件）→ 立即上报「事实变化」；侧栏 v3-2 重判 → `unknown`/`invalid` → 风险位；门禁：注入目标移除 → 风险行出现（v3-2 契约联动） |
| **R34-08 未授权站点被注入** | 低 | 极高 | `executeScript` 需 host permission（未授权即失败）；SW 在注入前**再次**校验授权集合；门禁：未授权 fixture 上断言「无注册 / 无注入 / 无 UI / 无右键拦截」+ 反证（强行注入 → FAIL） |
| **R34-09 `pick-layer.js` 体积失控** | 中 | 中 | 独立硬上限（无容差）+ 反证；CSS 内联但精简；不使用设计稿演示代码；与 v3-2 共享 `ref-capture` 口径（避免重复实现） |
| **R34-10 门禁并发 OOM / 页面侧门禁不稳（flake）** | 中 | 中 | `test:v3` 串行链；页面侧门禁用**确定性夹具**（无网络、无定时器依赖）+ `waitFor` 带超时与可读失败原因；flake 若出现**如实登记**并加确定性等待（不掩盖） |

### 交付门槛（本叶，收尾必须全绿且串行）

| 门禁 | 断言要点 |
|------|---------|
| **spike（前置）** | 4 条验收全过（注入 / 体积 / 零注入 / 三退让）；否则走降级并登记 |
| `npm run typecheck` / `npm test`（含 `ref-capture.test.ts` / `pick-layer-budget.test.ts` / `zero-injection.test.ts`） | 0 error / 全绿；`test(` 计数只增 |
| `npm run test:page-input` | 四项交互各 1 引用 + 1 选择题；唯一高亮可撤销；拾取期间命令发送 = 0；拖动两路径；右键三退让；气泡；双向同序号；宿主交互零影响；手势表双向相等 |
| `npm run test:zero-injection` | 未授权站点零注入（+ 反证） |
| 体积 | `pick-layer.js` ≤ 独立上限（无容差）；`content.js` ≤177,076（无容差）；`CONTENT_SOURCE_SHA256` 三项 **pin 不变**；反证 +1 B 实跑 |
| `node test/ui/density.mjs`（复用） | 拾取 / 联动后 L0 密度不回归（三档 × 三视口） |
| `npm run test:supersession` | 本叶 hunk 全部命中台账；`protectedRanges` hash 不变；union 计数 ≥108 |
| `npm run test:ui` / `test:insight` / `test:binding` / `test:hardening` / `test:e2e` | journey ≥167；insight union ≥108；binding ≥192（页面侧条目已登记）；hardening 24；e2e PASS |
| 零改动 | `manifest.json` / `src/security/**` / 冻结三文件 / `base` / `options.html` / `design/**` 零 diff |
| 人工面 | 拾取观感 / 拖动体感 / 右键菜单观感 / 真实宿主兼容 → 登记「**未执行**」 |

---

## 7. 生成的 ADR

> 本叶产出 **ADR-V3-030~036**（7 个），与父 `ADR-V3-001~012` / v3-1 `ADR-V3-013~019` / v3-2 `ADR-V3-020~024` / v3-3 `ADR-V3-025~029` **零编号冲突**。状态 = ACCEPTED（ADR-V3-035 为 spike 前置，状态 = ACCEPTED（待 spike 结论确认））。

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V3-030 | 页面侧交互层 = 第 5 个 bundle `dist/pick-layer.js` + `executeScript` **按需注入**（双触发 / 幂等 / teardown / 失败降级）+「按需」语义边界登记 | ACCEPTED |
| ADR-V3-031 | `content.js` 字节冻结守线 = 新增文件 + 独立 entry + 新 artifact 独立硬上限；`CONTENT_SOURCE_SHA256` 与 `CONTENT_MAX_BYTES` 均不变 | ACCEPTED |
| ADR-V3-032 | 右键自绘菜单 = 路线 1（零新增权限）+ 三退让 + `role="menu"` 键盘语义 + 与 `content.js` 体积无关 | ACCEPTED |
| ADR-V3-033 | 隔离策略 = open Shadow DOM + `all: initial` + 唯一 host 选择器 + 最高 z-index；宿主事件不吞的五条规则 | ACCEPTED |
| ADR-V3-034 | 引用捕获口径 = 共享 `ref-capture.ts`（稳定优先的语义路径 + `data-wcli-ref` 身份标记 + 截断 80/120）+ 手势表双向一致 | ACCEPTED |
| ADR-V3-035 | A-UI-004 前置 spike 定义（4 条验收 + 2 条降级）与失败处置（**禁止**放宽上限换功能） | ACCEPTED（待 spike 结论） |
| ADR-V3-036 | 本叶取代策略（binding 页面侧条目同编号最小改写 + 新增零注入 / 体积 / 交互门禁） | ACCEPTED |

### ADR-V3-030: 页面侧交互层 = 第 5 个 bundle + 按需注入（含「按需」语义边界登记）

## 状态
ACCEPTED（承父 ADR-V3-011 + 编排器 D-P-V3-05 + O-UI-003 裁决）

## 背景
`dist/content.js` = 177,076 B = `CONTENT_MAX_BYTES`（**余量 0、无容差**），且 `CONTENT_SOURCE_SHA256` 冻结 `src/content/` 三个文件。页面即输入的四项交互本质上都是**页面侧**代码，还必须满足「未授权站点零注入」与「不新增权限」。既有事实：`chrome.scripting.executeScript({target:{tabId}, files:['content.js']})` 已在图标点击路径使用（`service-worker.ts:920`），静态 `scripting` 权限已在 manifest。

## 决策
1. **产物与形态**：新增第 5 个 esbuild entryPoint（`src/content/pick-layer.ts` → `dist/pick-layer.js`，IIFE，isolated world）。**不并入 `content.js`**（否则必然超上限）。
2. **注入方式**：`chrome.scripting.executeScript({ target: { tabId }, files: ['pick-layer.js'] })`——**零新增权限**（`scripting` + 站点 host permission 已具备）。
3. **双触发（幂等）**：
   - **触发 1（面板在场）**：侧栏在已授权 origin 打开时发 `pick-layer-inject` → SW 注入（保证**右键随时可用**）；
   - **触发 2（拾取点击）**：点「从页面拾取」→ 同一 case（幂等：`window.__wcliPickLayer` 存在则只置拾取态）；
   - 幂等键 `window.__wcliPickLayer = { version, state, unmount }`。
4. **生命周期**：teardown 消息（面板关闭 / 卸载）→ 层自卸载（移除全部监听 + 移除 Shadow host + `delete window.__wcliPickLayer`）；origin 撤销授权 → SW 在既有 revoke 流程后追加 teardown；页面导航 → 随文档卸载。
5. **失败降级（不静默）**：注入失败（无 host permission / 受限页 / tab 不可注入）→ SW 回报**可读原因** → 侧栏在 `#risk-rail`（或 L1 状态详情）明示「页面侧不可用（原因）」+ 「从页面拾取」入口**禁用**。
6. **「按需」语义边界（显式登记，供 review 核验）**：「按需」= ① 不打进常驻 `content.js` ∧ ② 未授权站点零注入 ∧ ③ **面板在场期间**才注入 ∧ ④ 面板关闭即卸载。**代价**：侧栏从未打开时页面**不**拦截右键（交回原生菜单）。该代价与 v1「页面侧零注入」哲学一致（**有面板才有页面侧交互**），并已如实登记；若作者/编排器要求「无面板也拦截右键」，唯一合法路径 = 方案 C（第二个登记式 content script）并**另立 ADR** + 显式登记取舍，**不得**改 `content.js`。
7. **判定的边界**：层内**不做**引用失效判定（那是 v3-2 的唯一权威）；层只上报**原始事实**与**事实变化事件**（元素消失 / 导航 / 声明变化）。

## 后果
- `content.js` 字节与三文件 pin **完全不变**（T1 守线），页面侧功能全部落在新 artifact。
- 右键可用性由「面板在场」保证；这是**有意取舍**（已在 §3.1 与本节登记）。
- 新增 SW 2 个 case + 幂等/卸载编排（薄层），既有 case 零改动。

### ADR-V3-031: `content.js` 字节冻结守线 + 新 artifact 独立硬上限

## 状态
ACCEPTED（承父 ADR-V3-011 / NFR-V3-003 / AC-V3-015）

## 背景
三元组之一：`dist/content.js ≤ 177,076 B`（**无容差**）+ `CONTENT_SOURCE_SHA256` 冻结三文件。本叶是**唯一**触碰 `src/content/**` 的叶子，也是最容易「顺手把拾取层塞进 content.js」的地方。

## 决策
1. **守线手段（加法式）**：① 新增 `src/content/{pick-layer,ref-capture,pick-overlay,pick-menu,pick-bridge}.ts`（**新文件**，不改冻结三文件 → 三 hash 不变）；② `build.mjs` **只追加**第 5 个 entryPoint；③ `manifest.json` **零改动**（`executeScript({files})` 无需声明、无需 `web_accessible_resources`）。
2. **`CONTENT_MAX_BYTES` 不可改**（含「先调高再做、后收紧」）；**`CONTENT_SOURCE_SHA256` 不可更新**（本叶无合法动机）；若未来确需改冻结文件 → 必须显式更新 pin（日期 + 理由 + 前后值）**并同时**证明 `content.js` ≤177,076 B，且**另立 ADR**。
3. **新 artifact 独立守卫**：`test/size-baseline.ts` **仅追加**
   - `PICK_LAYER_BASELINE_BYTES`（首轮构建实测值）
   - `PICK_LAYER_CEILING = PICK_LAYER_BASELINE_BYTES`（**无容差**：新 artifact 无历史包袱，采用与 `content.js` 同级的「不增长」口径）
   - `PICK_LAYER_BASELINE_META`（`measuredOn` / `source` / `buildCommand` / `measuredBy` / `direction`）
4. **反证**：`test/pick-layer-budget.test.ts` 驱动 ① `pick-layer.js` +1 B → **FAIL**；② `content.js` +1 B → **FAIL**（复核既有守卫）；③ 三文件 hash 任一变更 → **FAIL**。
5. **不合并计数**：`pick-layer.js` 与 `content.js` **各自独立**上限（合并会互相掩盖）。
6. **若超限**：**只能改实现**（精简 CSS / 去重复 / 复用纯函数）；**不得**放宽上限、不得合并计数、不得把代码迁进 `content.js`。

## 后果
- 三重红线（字节 / 三 hash / 无新权限）同时可机器核验，且**不需要**改任何冻结资产。
- 新 artifact 获得自己的「不增长」守卫，避免「新产物无守卫」的空白。
- 若 spike 发现 `pick-layer.js` 过大 → 触发 ADR-V3-035 的降级讨论（仍不改 `content.js`）。

### ADR-V3-032: 右键自绘菜单（路线 1 + 三退让 + 键盘语义）

## 状态
ACCEPTED（承父 FR-V3-064 / NG-V3-002 / R-UI-004）

## 背景
`manifest.json` **没有 `contextMenus`**（也不在 `optional_permissions`），因此无法使用平台右键菜单 API；若为此新增权限即破 T2 红线。E 稿与 D 稿均已定「路线 1：content script 自绘 + 三退让」。

## 决策
1. **零新增权限**：自绘菜单在页面侧（`dist/pick-layer.js`）用 DOM 实现；**不引入** `contextMenus`、**不**扩 `host_permissions`；`manifest.json` 零 diff。
2. **三退让（逐条可断言）**：
   - **① 仅已授权站点生效**：层只在已授权 origin 注入；未授权站点**零注入** → `contextmenu` 完全不被拦截（交回原生）；
   - **② 保留「交给页面原生菜单」出口**：菜单首部提供该项；选择后 **下一次** `contextmenu` **不**拦截（`nativeOnce` 语义），并给可读提示；之后恢复拦截；
   - **③ `Esc` 与点击空白即关**：`Esc` 关闭并回焦；文档级 `click`（目标不在 Shadow host 内）关闭；两者都**不执行任何动作**。
3. **键盘与 ARIA 语义**：菜单容器在 Shadow DOM 内，`role="menu"` + 每项 `role="menuitem"`；roving `tabindex`（仅当前项 `tabindex="0"`）；`ArrowDown`/`ArrowUp`/`Home`/`End` 移动、`Enter`/`Space` 激活、`Esc` 关闭；不可用项 `aria-disabled="true"` 且**跳过**（方向键只在可用项间移动）。
4. **菜单项集合（与 E 稿一致，逐项可用性可断言）**：① 引用到 web-cli（纳入引用）② 用这里作为操作目标 ③ 引用选中文本（无选区时 `aria-disabled`）④ 在此处拾取 ⑤ **交给页面原生菜单**。**不提供**「复制选择器」（E 稿中该项因 `clipboard.write` 撤销而禁用；本叶同样**不提供**，避免引入剪贴板权限路径）。
5. **与 `content.js` 体积的关系**：菜单代码位于**按需层**（`dist/pick-layer.js`），**不占** `content.js` 字节；`#21*`/`#22*` 区域的 binding 断言字节零改（ADR-V3-036）。
6. **定位**：菜单定位 = 指针坐标 → 视口内钳制（`min(x, vw - menuW - 8)` / `min(y, vh - menuH - 8)`）；`resize`/`scroll` 时关闭（避免错位）。

## 后果
- 右键菜单在**零新增权限**下可用；其真实代价（劫持右键）由三退让兜底，并**如实登记**（R-UI-004 中风险）。
- 键盘与 ARIA 语义完整，满足 NFR-V3-011 与 FR-V3-084。
- 未授权站点「零注入 → 零拦截」是**结构性**的（不是「注入后不响应」），满足 NFR-V3-007。

### ADR-V3-033: 隔离策略 = open Shadow DOM + 宿主事件不吞

## 状态
ACCEPTED（承父 FR-V3-069 / EC-V3-017 / ADR-V3-008）

## 背景
宿主页面的全局 CSS（含 `!important`）、高 z-index 全屏元素、以及宿主自身的键盘 / 拖放 / 选区行为，都可能让自绘 UI 不可读或反过来破坏宿主。EC-V3-017 要求「自绘 UI 仍可读且 `Esc` / 点空白可关；若遮挡不可解，保留『交给页面原生菜单』出口」。

## 决策
1. **隔离载体**：单一 host 元素（属性选择器 `[data-wcli-pick-root]`，唯一）+ `host.attachShadow({mode:'open'})`；全部 UI 与 CSS 在 Shadow root 内；bundle 内**不引入任何外部样式表 / 字体 / 图标请求**（SVG 内联）。
2. **基线样式**：Shadow 内根节点 `all: initial` + 显式重设（`font` / `line-height` / `color` / `box-sizing`）；`z-index: 2147483000`；`position: fixed`。
3. **明暗主题**：Shadow 内自带 `@media (prefers-color-scheme: dark)` 分支（**不依赖宿主 token**，因宿主无我方 token）；两主题下均可读（NFR-V3-009）。
4. **宿主事件不吞（五条规则，可断言）**：
   - ① Alt 只作为**修饰键状态**读取，**不** `preventDefault` 任何宿主行为（Windows 上 Alt 聚焦浏览器菜单栏属已知行为，E 稿已列为固有限制，如实登记为**未执行人工面**）；
   - ② 非拾取态**不**接管 `pointerdown` / `pointermove`（零监听副作用）；
   - ③ 拾取态仅对**当前目标元素**`preventDefault`；
   - ④ 自绘菜单只在自己打开时拦截 `contextmenu`；「交给原生菜单」出口保证可恢复；
   - ⑤ 拖选在 `input` / `textarea` / `[contenteditable]` 内**禁用**；气泡不阻断选区默认行为（仅点击气泡时 `stopPropagation`）。
5. **可关闭**：`Esc` + 点击空白 + 「交给原生菜单」；三者任一都可让用户回到宿主原生体验。
6. **门禁**：污染夹具（宿主全局 `* { … !important }` + 一个更高 z-index 全屏元素）→ 断言自绘 UI 仍可读（文本节点非空 + 可见）且 `Esc` / 点空白可关；宿主行为夹具 → 断言点击 / 拖动 / 输入 / 选区零影响。

## 后果
- 双向隔离（宿主污染不进、我方样式不漏），且不需要 `!important` 军备竞赛。
- 「宿主事件不吞」成为可断言的**五条具体规则**，不是笼统承诺。
- Alt 在 Windows 上的浏览器菜单栏行为属**真实限制**，登记为人工面「未执行」，不冒充 PASS。

### ADR-V3-034: 引用捕获口径（共享 `ref-capture.ts`）+ 手势表双向一致

## 状态
ACCEPTED（承父 FR-V3-070 / FR-V3-071 + ADR-V3-023 的事实字段集）

## 背景
FR-V3-071 要求引用 id 四处贯穿；v3-2 的 ADR-V3-023 已定 id 单源（侧栏 `ref_<n>`）与事实字段集。页面侧必须产出**与证据层同口径**的选择器 / 语义路径 / 摘要，否则「页面上描述的」与「证据层显示的」会不一致；FR-V3-070 要求手势表条目数 = 实际实现数（不得多列未实现手势）。

## 决策
1. **共享模块**：`src/content/ref-capture.ts` 为唯一捕获实现（纯函数，node 可测）；页面侧所有交互路径（Alt 悬停 / 拖动 / 右键 / 拖选 / G1 / G2）**共用**同一函数。
2. **语义路径生成（稳定优先）**：`id` → `data-*` 稳定键（`data-testid` / `data-key` / `data-name` 等）→ 结构性路径（`tagName` + `:nth-of-type(k)` 逐级，**最多 6 级**，超出即截断并在末尾标注 `…`）→ 全串截断 **120 字符**。
3. **身份标记**：捕获时在目标元素上写 `data-wcli-ref="ref_<n>"`（**由侧栏确认后回填**，避免页面侧自行编号）；v3-2 的 D1 维（元素从 DOM 消失 / 被替换）以该标记 + `documentId` 作为身份判定依据。
4. **摘要截断**：`textDigest` = 去空白后截断 **80 字符** + `…`（与 v3-2 ADR-V3-023 第 4 条**同一口径**，常量来源同一处语义；门禁逐字断言两侧一致）。
5. **事实字段集**（与 v3-2 契约逐字一致）：`{ origin, documentId, navSeq, declarationHash, declarationVersion?, selector, semanticPath, textDigest, capturedAt }`；**不含**任何判定结论字段（判定归 v3-2）。
6. **手势表双向一致**：L1 手势表列出的条目 = 实际实现并验证的条目，集合**相等**（不许多列）；本叶补齐至 **6 项**（Alt 悬停拾取 / Alt 拖动入侧栏 / 右键引用 / 拖选文本 / 双击即引用 G1 / 悬停 ⊕ 引用 G2），并把 G3~G5（长按 500ms / 滚动候选 / Alt+数字绑定）明确标为**规格未实现**（不列入）。
7. **拾取零命令**：捕获路径**只**产生 `ref-captured` 素材消息；不触发任何动作派发通道（门禁断言命令发送计数 = 0）。

## 后果
- 「页面上看到的」与「证据层显示的」口径一致（同一函数 + 同一截断常量）。
- `data-wcli-ref` 身份标记使「元素被替换为同类新元素」可被判为失效（不再依赖模糊选择器比较）。
- 手势表不再有「多列未实现」的风险（双向相等门禁）。

### ADR-V3-035: A-UI-004 前置 spike 定义与失败处置

## 状态
ACCEPTED（**待 spike 结论确认**；A-UI-004 + O-UI-003 + V34-O-1/V34-O-5）

## 背景
A-UI-004 要求先验证「页面侧交互层能在 `content.js` 0 字节余量下落地」；O-UI-003 已裁决「首选按需注入；不可行才允许显式重登记；**禁止**放宽上限换功能」。spike 属**可行性验证**，不写产品代码（可在 `/tmp/opencode/v3-spike/` 做最小实验）。

## 决策
1. **spike 目标（4 条验收，全部必须通过）**：
   - **S1 注入可行**：在已授权 fixture 站点上，用 `executeScript({target:{tabId}, files:['<最小实验产物>']})` 成功注入并注册监听；**未授权** origin 上同一调用**失败且报可读原因**（证明零注入红线可由机制保证）。
   - **S2 体积可控**：把「描边 + 标签 + 胶囊 + 气泡 + 菜单 + 消息桥」的最小骨架打包，实测产物字节数 ≤ **预估上限 60,000 B**（若超 → 记录实测值并给出精简方案；**不得**通过合并进 `content.js` 解决）。
   - **S3 零注入可验证**：未授权 origin 上断言「无 `registerContentScripts` 注册 / 无注入 / 无监听 / 无 Shadow host / 右键未被拦截」全部成立（可在 spike 脚本中以计数与 DOM 探针方式验证）。
   - **S4 三退让可实现**：最小实验中验证 ① 仅已授权站点拦截；② 「交给原生菜单」出口可用（下一次右键不被拦截）；③ `Esc` 与点击空白可关。
2. **spike 产物与证据**：临时目录内脚本 + 完整日志（注入结果 / 实测字节 / 零注入探针输出 / 三退让行为日志）；**结论摘要**（通过 / 不通过 + 实测值）写入 v3-4 的 build 报告；临时文件**不入版本库**。
3. **失败处置（两条降级，逐级）**：
   - **D1（形态降级）**：按需注入不可行（例如 `executeScript` 在真实夹具上受策略限制）→ 采用**方案 C**：第二个**登记式** content script（`registerSiteContentScript` 的 `js` 追加 `pick-layer.js`），仍**不改变** `content.js` 字节、仍满足未授权零注入；**显式登记取舍**（页面侧层在授权期内常驻、右键始终可用）→ 需在账本/报告登记并回报编排器。
   - **D2（范围降级）**：若 D1 也不可行（例如体积不可控到合理范围）→ **不自行扩权/放宽**；把结论与实测数据**回报编排器**，由编排器裁决是否缩小本叶范围（例如仅保留「拖选文本气泡 + 右键引用」两项，或推迟）——**本叶无权**修改 spec 需求或放宽 `CONTENT_MAX_BYTES`。
4. **红线（任何降级路径都不得触碰）**：① 不放宽 `CONTENT_MAX_BYTES`（无容差）；② 不引入 `contextMenus`；③ 不静态注入 / 不扩 `host_permissions`；④ 不修改冻结三文件而不更新 pin（本叶**不**更新 pin）；⑤ 不静默沿用失效引用。
5. **spike 未通过前不得进入实现**（本叶实现任务的**硬前置**）。

## 后果
- 可行性风险在动产品代码之前被消解（或被发现），避免「做到一半发现形态不可行」而被迫放宽上限。
- 两条降级路径都**不改红线**，且都必须显式登记 + 回报编排器。
- spike 结论（含实测体积）成为 `PICK_LAYER_BASELINE_BYTES` 的**来源依据**。

### ADR-V3-036: 本叶取代策略（binding 页面侧条目 + 新增门禁）

## 状态
ACCEPTED（承父 ADR-V3-007）

## 背景
`test/ui/binding.mjs`（192 断言）含页面侧 / 树相关条目（如 `realClick('#tree-fab')` / `#tree-drawer` / `#tree-receipt` / `#input` 键入）；本叶新增页面侧能力，同时 `#composer` 默认 `hidden` 已在 v3-1 处理了 `#6a`/`#6`/`#6l`。本叶需追加页面侧断言，并把受影响条目按台账迁移。`#21*` / `#22*` 区域按父 ADR-V3-007 必须**字节零改**。

## 决策
1. **优先「同编号最小改写」**：页面侧相关条目**编号不变**，只在必要时插入「前置条件」（如先打开面板使其在场 / 先进入拾取态）；逐条进台账（`oldId == newId`，`reason` 具体）。
2. **tree 相关条目的处理归 v3-3**（本叶不改，避免两叶同时改同一区域导致冲突）；若本叶发现必须改 → **先在台账登记 + 回报编排器**，不改动 `#21*`/`#22*` 区域。
3. **新增断言落新文件**（计数只增）：`test/ui/page-input.mjs`（四项交互 / 三退让 / 零命令 / 双向同序号 / 宿主零影响）、`test/ui/zero-injection.mjs`（零注入 + 反证）、`test/ref-capture.test.ts`（捕获口径）、`test/pick-layer-budget.test.ts`（新 artifact 体积 + 反证）。
4. **台账只追加**：本叶在 `docs/v3-supersession-ledger.json` 追加 `entries[]`；**不改** schema / 不改其他叶的条目；`counts.binding.currentRuntime ≥ 192` 与 union 口径（insight）保持不变。
5. **安全断言只增**：新增「未授权零注入（反证）」「拾取期间命令发送 = 0」「picker 不产生判定路径」三条；不删任何既有安全断言。
6. **禁止**：为让新门禁变绿而弱化既有断言、删除断言、或把 `#21*`/`#22*` 区域「顺手重构」。

## 后果
- 页面侧取代可逐条追溯；`#21*`/`#22*` 区域字节零改可用区间 hash 证明。
- 新门禁（4 个文件）使「零注入 / 体积 / 交互 / 捕获口径」四类风险都有机器判据。
- 本叶收尾必须全门禁绿（含台账门禁与体积门禁），不得留给收口阶段（EC-V3-013）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V3-4「页面即输入」技术方案，ADR-V3-030~036）。**范围**：四项交互（Alt 悬停拾取 / Alt 拖动入侧栏 / 右键自绘菜单 / 拖选文本气泡）+ 拾取即选择题 + 唯一高亮可撤销 + 拾取期间零命令 + 双向高亮联动（同序号）+ **页面侧按需注入（第 5 bundle + `executeScript` 双触发 + 幂等 + teardown + 失败降级）** + **未授权站点零注入** + 零新增权限 + 宿主兼容（Shadow DOM 双向隔离 + 事件不吞五规则）+ 手势表双向一致 + 引用捕获口径共享（`ref-capture.ts`）。**裁决**：V34-O-1（按需注入形态 + spike 前置）/ V34-O-2（Shadow DOM 隔离）/ V34-O-3（稳定优先语义路径 + `data-wcli-ref` 身份标记 + 截断 120）/ V34-O-4（拖选最小 2 字符、输入区禁用、1.8s 淡出）/ V34-O-5（**不接受**放宽 `CONTENT_MAX_BYTES`；降级 = 方案 C 或回报编排器）。**红线**：`content.js` 字节 / `CONTENT_SOURCE_SHA256` 三 hash / `manifest.json` 零 diff（含无 `contextMenus`）/ 安全判定链 pin / 零新增依赖，**全部不变**。**只做 plan**：未写 tasks/代码、未改源码与测试、未跑门禁/构建/Chromium、未 commit。 | 2026-09-16 | SDDU Plan Agent |


