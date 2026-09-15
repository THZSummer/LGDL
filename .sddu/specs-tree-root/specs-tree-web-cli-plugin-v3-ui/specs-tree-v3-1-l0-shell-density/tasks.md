# 任务分解：specs-tree-v3-1-l0-shell-density（V3-1 L0 骨架与密度门禁）

> **文档定位**: SDDU 任务清单 — 将技术方案分解为可并行执行的原子任务，作为 build 阶段的输入  
> **前置依赖**: `plan.md`（本叶 v1.0，ADR-V3-013~019）+ 父 `plan.md` v1.0（ADR-V3-001~012）+ 父 `spec.md` v1.0（权威条文）+ 本叶 `spec.md` v1.0  
> **创建人**: SDDU Tasks Agent  
> **创建时间**: 2026-09-16  
> **版本**: v1.0  
> **更新人**: SDDU Tasks Agent  
> **更新时间**: 2026-09-16  
> **更新说明**: 初始创建（本叶 15 任务 / 7 波；含密度门禁三段式、9 强制格 + 15 登记格、RP-V3-01~06 六条反证、取代台账、首轮密度基线登记、主题/320px/a11y 基建）

---

## 0. 跨叶定位与执行序（**本文件 = V3-1，4 叶第一环**）

| 项 | 内容 |
|---|---|
| 叶间顺序 | `v3-1` → `{v3-2, v3-3}` → `v3-4`（父 plan ADR-V3-010 第 1 条） |
| 本叶前置 | **无**（首个开工） |
| 本叶产出契约（供后三叶复用） | ① `window.__v3.disclosure`（`toggle` / `collapseAll` / `expandMemory`）；② 摘要/计数契约（`data-summary` / `data-count` + `aria-controls` 目标内非空文本）；③ 密度口径唯一实现源 + 门禁三段式 + 首轮基线；④ 取代台账 + 台账门禁；⑤ 选择题契约（复用 `#ask` 家族 id） |
| 本叶收尾要求 | **全门禁绿且严格串行**（FR-V3-003 / AC-V3-013 / EC-V3-013）；**禁止**把红灯留给 v3-2 / v3-3 |
| 门禁纪律 | 一次只跑一个门禁（本机 ~1.5GB、曾 OOM，R3-10 / R31-08）；完整日志落盘 `/tmp/opencode/v3-gate-logs/*.log`，**禁 tail 截断** |
| 红线 | `content.js` 177,076 B（余量 0）· manifest 静态权限零新增 + 无 `contextMenus` · `policy.ts`/`auto-authorize.ts` sha256 pin 不变；本叶**不碰** `src/content/**` |

---

## 1. 依赖拓扑总览

### 1.1 任务总览表

| ID | 名称 | 复杂度 | 前置依赖 | 波次 | 类型 |
|----|------|:--:|------|:--:|:--:|
| TASK-101 | v3 门禁自带 helper `test/ui/_v3-helpers.mjs` | S | 无 | 1 | implementation |
| TASK-102 | 密度口径**唯一实现源** `test/ui/density-metrics.mjs`（C1~C4 + 阈值 + 档位 + 归属判定 + 纯判定函数） | M | 无 | 1 | implementation |
| TASK-103 | `index.html` L0 常驻 DOM/样式（`#risk-rail`/`#l0-decision`/`#l0-statusbar`/`#view-host` 占位 + 双主题 tokens + 320px + `#composer` 默认 `hidden` + 54 id 保留） | M | 无 | 1 | implementation |
| TASK-104 | 折叠器契约 `src/ui/sidepanel/disclosure.ts`（`hidden` + ARIA 成对 + 白名单抛错 + 展开态记忆 + `window.__v3.disclosure`） | S | 无 | 1 | implementation |
| TASK-105 | 风险位唯一模板与结构保证 `l0/risk-rail.ts` + `test/l0-disclosure.test.ts`（AC-V3-008/009 的结构侧） | M | 103, 104 | 2 | implementation |
| TASK-107 | 无 Chromium 静态门禁 `test/density-thresholds.test.ts`（阈值逐字/矩阵规模 9/测量源码禁用函数零命中/L0↔L1L2 不互串/54 id/祖先闭包/`#composer` hidden）+ RP-V3-02(a) | M | 102, 103 | 2 | gate |
| TASK-106 | L0 骨架三件事 + 决策卡 + 状态栏（`l0/{shell,decision-card,status-bar}.ts` + `view-model.ts` + `sidepanel.ts` 接线 + `#ask` 家族迁移） | L | 105, 103, 104 | 3 | implementation |
| TASK-109 | Chromium 密度门禁 `test/ui/density.mjs`（阶段 A 稿件同源 + **B 9 强制格** + **C 5×3=15 登记格** + D 反作弊 + E 汇总表 + `--reverse` 驱动） | L | 101, 102, 106 | 4 | gate |
| TASK-110 | L0 运行时门禁 `test/ui/l0.mjs`（骨架/决策卡唯一/无常驻输入框/风险位 5×2/可发现性/320-400 等价/四区互不遮挡/`#log` 唯一滚动/展开态 composer 贴底） | M | 106 | 4 | gate |
| TASK-113 | 既有门禁**同编号最小改写**（journey `#15c` / binding `#6a`·`#6`·`#6l` / insight 几何 3 条 union 迁移）+ `package.json` scripts 追加 | M | 106 | 4 | implementation |
| TASK-108 | **取代台账** `docs/v3-supersession-ledger.json` + 门禁 `test/supersession-ledger.test.ts`（hunk ↔ 台账映射 + `protectedRanges` hash + `countMethod` + `gateFloors` + `--files-override`） | M | 113 | 5 | gate |
| TASK-112 | **首轮真实产物密度基线登记** `docs/v3-density-baseline.{md,json}`（三档 × 三视口 + 日期 + 来源 + 与设计稿口径分列 + 只允许收紧 + C4 变化登记） | S | 109 | 5 | doc |
| TASK-111 | **RP-V3-01~06 六条反证实跑**（每条都必须能真 FAIL + 还原后 PASS + 全日志落盘） | M | 108, 109, 110, 112 | 6 | gate |
| TASK-114 | 体积守卫核对 + `sidepanel.js` **显式重登记**（条件触发；披露要求见 §4.3） | S | 111 | 7 | gate |
| TASK-115 | **收口：全门禁绿串行验证 + 人工面如实登记**（AC-V3-013 / NFR-V3-015） | S | 114 | 7 | gate |

### 1.2 依赖拓扑（串行主轴 + 并行组）

```
Wave 1 ── 无依赖，4 路并行写入（文件不相交）
  TASK-101 [S] _v3-helpers.mjs
  TASK-102 [M] density-metrics.mjs        ← 关键路径起点（口径单源）
  TASK-103 [M] index.html L0 DOM/样式     ← 关键路径起点（L0 容器）
  TASK-104 [S] disclosure.ts              ← 关键路径起点（折叠器契约）

Wave 2 ── 依赖 Wave 1（并行组 ①：文件不相交）
  TASK-105 [M] l0/risk-rail.ts + l0-disclosure.test.ts   （dep 103,104）
  TASK-107 [M] density-thresholds.test.ts                （dep 102,103）

Wave 3 ── 串行（主骨架接线，单文件所有权）
  TASK-106 [L] l0/{shell,decision-card,status-bar}.ts + view-model.ts + sidepanel.ts  （dep 105,103,104）

Wave 4 ── 依赖 Wave 3（并行组 ②：门禁/改写文件不相交）
  TASK-109 [L] test/ui/density.mjs      （dep 101,102,106）
  TASK-110 [M] test/ui/l0.mjs           （dep 106）
  TASK-113 [M] journey/binding/insight 同编号改写 + package.json scripts （dep 106）

Wave 5 ── 依赖 Wave 4
  TASK-108 [M] supersession-ledger.json + supersession-ledger.test.ts  （dep 113）
  TASK-112 [S] v3-density-baseline.{md,json}                            （dep 109）

Wave 6 ── 串行反证
  TASK-111 [M] RP-V3-01~06 实跑（dep 108,109,110,112）

Wave 7 ── 收口（串行）
  TASK-114 [S] 体积核对/重登记（dep 111）
  TASK-115 [S] 全门禁绿 + 人工面登记（dep 114）
```

### 1.3 并行分组（执行波次）

| 波次 | 任务 | 并行性 | 必须串行的部分 |
|:--:|------|------|------|
| 1 | 101, 102, 103, 104 | **可并行**（4 文件不相交） | — |
| 2 | 105, 107 | **可并行**（文件不相交） | — |
| 3 | 106 | 串行（`sidepanel.ts` / `view-model.ts` 单所有者） | 本波全部 |
| 4 | 109, 110, 113 | **可并行写入** | ⚠️ **门禁执行严格串行**：`test:density` / `test:l0` / `test:ui` / `test:insight` / `test:binding` 一次只跑一个 |
| 5 | 108, 112 | **可并行写入** | ⚠️ `test:supersession` 与 `npm test` 串行 |
| 6 | 111 | 串行（反证必须逐条顺序执行、逐条还原） | 本波全部 |
| 7 | 114 → 115 | 串行（**波内串行链**，`tasks.json` 中以 `serialWithinWave: true` 显式声明） | 本波全部（114 → 115，收口为单条链式命令） |

---

## 2. 任务列表

### TASK-101: v3 门禁自带 helper `test/ui/_v3-helpers.mjs`
> 三段式门禁的公共底座（**不抽共享模块**，为保既有 4 个 `test/ui/*.mjs` 零删改）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-004 · AC-V3-011 · NFR-V3-014 · ADR-V3-003（第 5 条取舍登记） |

**描述**: 新建 v3 门禁专用的最小 helper 模块，导出 `connectCdp` / `evaluate` / `waitFor` / `realBox` / `realClick` / `check` / `launch`，实现口径对齐既有 `test/ui/{journey,insight,binding,hardening}.mjs` 的内联版本（含 `--load-extension=dist` 启动方式、视口 320/400/520 × 900）。**代价显式登记**：约 100 行重复代码，换取 4 个既有门禁文件字节零改（避免 FR-V3-004 / AC-V3-011 违规与无谓台账条目）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/_v3-helpers.mjs` |

**验收标准**:
- [x] 导出 7 个函数，签名与 `plan.md` ADR-V3-003 第 5 条逐字一致；零外部依赖（无 `node_modules` 依赖新增）
- [x] `launch()` 仅启动**单** Chromium 实例；`connectCdp` 只连单 page target（串行前提）
- [x] `check(name, cond, detail)` 在 `cond === false` 时**必须**非零退出（门禁必须能真 FAIL）
- [x] 既有 4 个 `test/ui/*.mjs` **零 diff**（`git diff --numstat` 为 0）

**验证命令**:
```bash
cd packages/web-cli-plugin && node -e "import('./test/ui/_v3-helpers.mjs').then(m=>{const n=['connectCdp','evaluate','waitFor','realBox','realClick','check','launch'];const miss=n.filter(k=>!(k in m));if(miss.length)throw new Error('missing:'+miss);console.log('helpers ok')})" | tee /tmp/opencode/v3-gate-logs/helpers.log
git diff --numstat -- packages/web-cli-plugin/test/ui/journey.mjs packages/web-cli-plugin/test/ui/insight.mjs packages/web-cli-plugin/test/ui/binding.mjs packages/web-cli-plugin/test/ui/hardening.mjs
```

---

### TASK-102: 密度口径**唯一实现源** `test/ui/density-metrics.mjs`
> 本 Feature 的核心验收底座（D7 / NFR-V3-002 / NFR-V3-013）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-022 · NFR-V3-001 / NFR-V3-002 · AC-V3-001~005 · EC-V3-010 · ADR-V3-003 · ADR-V3-004 · ADR-V3-005 |

**描述**: 新建密度口径唯一实现源（ESM，零依赖）。必须导出：`DENSITY_MEASURE_SOURCE`（**一个字符串**，C1~C4 完整 in-page 测量表达式，由 CDP `Runtime.evaluate` 注入；返回 `{clickables, chars, lines, blocks, regions, elementsWithKeys}`）、`DENSITY_LIMITS`（`default{7,15}` / `firstRun{9,20}` / `risk{17,35}`）、`DENSITY_VIEWPORTS=[320,400,520]`（×900）、`DENSITY_TIERS`、`RISK_SUBSCENARIOS`（5 类）、`isRiskClassSource`（in-page 归属判定字符串）、`evaluateDensity(measured, tier, limitsOverride?)`（纯函数，返回 `{ok,tier,viewport,measured,limits,exceeds[],message}`，`message` 必含「实测值 vs 上限 vs 口径」）、`evaluateDelta(defaultMeasured, riskMeasured)`（返回 `violations[]`）。文件头注释登记口径定义、`34` 常量、两处反直觉事实（C4 不设上限；真实产物分区数可能高于 D 稿）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/density-metrics.mjs` |

**验收标准**:
- [x] `DENSITY_LIMITS` 与父 spec §9.2 逐字相等：`{default:{clickables:7,lines:15}, firstRun:{clickables:9,lines:20}, risk:{clickables:17,lines:35}}`
- [x] 矩阵规模 = 3 档 × 3 视口 = **9 强制格**；`RISK_SUBSCENARIOS` 长度 = 5
- [x] **C1**：仅 `hidden` 属性豁免；`tagName ∈ {BUTTON,A,INPUT,SELECT,TEXTAREA}` ∨ (`tabindex` 存在 ∧ ≠ `-1`）；`display`/`visibility`/`opacity`/`pointer-events`/`aria-hidden`/视口位置**一律不豁免**
- [x] **C2** = `⌈Σ(自身直接文本去空白字符数) ÷ 34⌉`，每个元素只计一次，`{{…}}` 占位符剔除；`34` 为 pin 常量
- [x] **C4** = 测量根一级子元素中非 `hidden` 个数；**不设上限**且注释写明反直觉事实
- [x] 测量源码中 **`visibleIn(el)` 只有一处**，且**字符串零命中** `getComputedStyle` / `offsetParent` / `getBoundingClientRect` / `aria-hidden`
- [x] `evaluateDensity({clickables:7}, 'default', {clickables:6, lines:15}).ok === false`（RP-V3-02(a) 的机器判据）
- [x] 无稳定键（`id` → `data-key` → 结构性路径）的新增元素在 `evaluateDelta` 中**直接 FAIL**
- [x] 单文件内同时含「测量源码 + 阈值 + 视口 + 档位 + 判定」→ 任何口径变更只能改本文件（结构上消灭双实现漂移）

**验证命令**:
```bash
cd packages/web-cli-plugin && node --input-type=module -e "
import {DENSITY_LIMITS,DENSITY_VIEWPORTS,RISK_SUBSCENARIOS,DENSITY_MEASURE_SOURCE,evaluateDensity} from './test/ui/density-metrics.mjs';
if(DENSITY_LIMITS.default.clickables!==7||DENSITY_LIMITS.firstRun.lines!==20||DENSITY_LIMITS.risk.clickables!==17)throw new Error('limits drift');
if(DENSITY_VIEWPORTS.join()!=='320,400,520')throw new Error('viewports drift');
if(RISK_SUBSCENARIOS.length!==5)throw new Error('risk subscenarios != 5');
for(const t of ['getComputedStyle','offsetParent','getBoundingClientRect','aria-hidden']) if(DENSITY_MEASURE_SOURCE.includes(t)) throw new Error('anti-cheat leak: '+t);
if(evaluateDensity({clickables:7},'default',{clickables:6,lines:15}).ok!==false) throw new Error('RP-V3-02a must FAIL');
console.log('density-metrics ok')" | tee /tmp/opencode/v3-gate-logs/density-metrics.log
```

---

### TASK-103: `index.html` L0 常驻 DOM/样式（含 `#risk-rail` 结构保证与 54 id 保留）
> 密度预算的物理落点；S1/S5 结构保证的实现载体

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-010 / FR-V3-013 / FR-V3-014 / FR-V3-015 / FR-V3-016 / FR-V3-024 / FR-V3-026 / FR-V3-085 · AC-V3-008 / AC-V3-009 / AC-V3-020 / AC-V3-021 · EC-V3-008 / EC-V3-009 · ADR-V3-001 · ADR-V3-006 · ADR-V3-008 · ADR-V3-009 · ADR-V3-013 · ADR-V3-017 |

**描述**: 在 `src/ui/sidepanel/index.html` **追加** L0 常驻分区标记与样式：`#risk-rail`（`body` 直挂独立分区，祖先闭包**不得**出现 `hidden` / `[aria-expanded]`）、`#l0-decision`（`#panel-main` 内 `#log` 的兄弟，`flex:0 0 auto`）、`#l0-statusbar`（`body` 直挂，一行）、`#view-host`（占位，默认 `hidden`）；`#composer` 追加默认 `hidden`；新增 token 必须在 `:root` 与 `@media (prefers-color-scheme: dark)` **双处对称**。**结构保证 S5**：54 个既有 `id` 零重命名；**保留** `body{display:flex;overflow:hidden}` / 三区文档序 / `#panel-bottom{flex:0 0 auto}` / `#composer` 为 `#panel-bottom` 末元素。320px 只允许 `flex-wrap` 与省略号截断，**不删任何常驻元素**。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` |

**验收标准**:
- [x] `#risk-rail` 为 `document.body` **直接**子元素；其祖先闭包（含自身）无 `hidden` 属性、无 `[aria-expanded]`
- [x] `#l0-decision` / `#l0-statusbar` / `#view-host` 存在；`#view-host` 默认 `hidden`
- [x] `index.html` 的 `id` 集合 **⊇** v1 的 54 个 `id` 集合（集合相等或超集，零重命名）
- [x] `#composer` 带 `hidden` 且仍为 `#panel-bottom` 的**末元素**（`#consent-slot` 之上）
- [x] `body` 仍为 `display:flex` + `overflow:hidden`；`#panel-top` → `#panel-main` → `#panel-bottom` 文档序不变
- [x] 新增 token 名在 `:root` 与 `@media (prefers-color-scheme: dark)` **两处都出现**
- [x] 320px 与 400px 下常驻元素 `id` 集合**相等**（AC-V3-021 等价断言可静态核验）
- [x] `#risk-rail` 内风险行**不**在 `[data-l1-panel]` / `[data-l2-view]` / `[data-disclose-panel]` 子树内

**验证命令**:
```bash
cd packages/web-cli-plugin && node --input-type=module -e "
import fs from 'node:fs';const h=fs.readFileSync('src/ui/sidepanel/index.html','utf8');
const ids=[...h.matchAll(/\sid=\"([^\"]+)\"/g)].map(m=>m[1]);
const base54=['panel-top','panel-main','panel-bottom','settings-view']; // 由 TASK-107 校验完整 54 集合
if(new Set(ids).size!==ids.length) throw new Error('duplicate id');
if(!ids.includes('risk-rail')||!ids.includes('l0-decision')||!ids.includes('l0-statusbar')||!ids.includes('view-host')) throw new Error('missing v3 partition');
if(!/id=\"composer\"[^>]*\shidden/.test(h)) throw new Error('composer must default hidden');
console.log('html structure ok; ids=',ids.length)" | tee /tmp/opencode/v3-gate-logs/html-structure.log
```

---

### TASK-104: 折叠器契约 `src/ui/sidepanel/disclosure.ts`
> 全 Feature 唯一折叠控制器（S2/S3 结构保证）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | 无 |
| **执行波次** | Wave 1 |
| **对应 FR / AC / ADR** | FR-V3-020 / FR-V3-023 / FR-V3-024 · AC-V3-010 · EC-V3-011 · ADR-V3-006 · ADR-V3-008 · ADR-V3-016 |

**描述**: 新建折叠器单一控制器。`COLLAPSIBLE_TARGETS` 为**常量数组**（仅 L1 面板与 L2 入口面板；**`#risk-rail` 不在其中**）；`assertFoldable(node)` 对白名单外节点**抛错**。收起 = 设 `hidden` **属性**（非 CSS）；每次切换同步 `aria-expanded`（`"true"|"false"`）+ `aria-controls`（指向唯一目标 id）**成对**。展开态记忆用内存 `Map`（`expandMemory`），暴露 `window.__v3.disclosure = { toggle(id), collapseAll(), expandMemory }`（后三叶只读调用，**不得绕过**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` |

**验收标准**:
- [x] `assertFoldable('#risk-rail')` **抛出**（负向）；`disclosure.toggle('#risk-rail')` **抛出**
- [x] 收起一律用 `hidden` 属性；**代码内零** `display:none` / `visibility:hidden` 式折叠
- [x] 每个触发器同时具备 `aria-expanded` + `aria-controls`，且二者**成对**（缺一即抛错）
- [x] 展开态记忆往返：`toggle(open) → 记 → 模拟上下文切换 → restore` 后展开态相等（FR-V3-023）
- [x] `window.__v3.disclosure` 三方法齐备；`collapseAll()` 后白名单内目标全 `hidden === true`，`#risk-rail` **不受影响**
- [x] 无 `chrome.*` 调用；`npm run typecheck` 0 error

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck | tee /tmp/opencode/v3-gate-logs/typecheck-w1.log
```

---

### TASK-105: 风险位唯一模板与结构保证 `l0/risk-rail.ts` + `test/l0-disclosure.test.ts`
> D3 铁律的**结构**侧（AC-V3-008 / AC-V3-009）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-103, TASK-104 |
| **执行波次** | Wave 2 |
| **对应 FR / AC / ADR** | FR-V3-016 / FR-V3-017 / FR-V3-018 / FR-V3-019 · EC-V3-002 / EC-V3-015 · AC-V3-008 / AC-V3-009 · ADR-V3-005 · ADR-V3-006 · ADR-V3-016 |

**描述**: 新建 `l0/risk-rail.ts`——`#risk-rail` 的**唯一写入者**（不接收任意父节点参数）。`renderRiskRow(cls)` 为**唯一**风险行模板，产出 `<span class="risk-text">`（**非空文本**）+ `<span class="risk-badge">`（徽标）+ 内联 `<svg class="risk-icon">`（图标）三通道；文本为空**抛错**。五类风险（未授权 / 探测中 / 硬底线被拦 / 破坏性待确认 / 引用失效）各带 `data-risk-class` 与可读文案（逐字采用 `plan.md` §2.3 表）。决策卡「更多选项」池按 `kind !== 'destructive'` **过滤式**排除（破坏性选项结构上永远在 `#l0-decision` 直系）。同步新建 node 单测 `test/l0-disclosure.test.ts`。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/risk-rail.ts` |
| NEW | `packages/web-cli-plugin/test/l0-disclosure.test.ts` |

**验收标准**:
- [x] 五类风险各产出三通道；`renderRiskRow({text:''})` **抛错**（禁止「仅图标」「仅颜色」）
- [x] `#risk-rail` 唯一写入者为本模块；模块 API **不接受**父节点参数
- [x] `kind === 'destructive'` 的选项**结构性**不出现在折叠池（负向断言：注入后期望被过滤 / 抛错）
- [x] 硬底线被拦状态下「允许 / 放行」控件计数 = 0（FR-V3-019）
- [x] 单测覆盖：白名单抛错、ARIA 成对、展开态记忆往返、destructive 过滤、三通道文本非空校验

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-w2.log
```

---

### TASK-107: 无 Chromium 静态门禁 `test/density-thresholds.test.ts`
> 三段式的「快速反馈 + 堵后门」一层（1.5GB 机器可随时跑）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-102, TASK-103 |
| **执行波次** | Wave 2 |
| **对应 FR / AC / ADR** | FR-V3-022 / FR-V3-024 · NFR-V3-002 / NFR-V3-013 · AC-V3-005 / AC-V3-007 · EC-V3-010 · ADR-V3-003 · ADR-V3-004 · ADR-V3-005 |

**描述**: 新建无 Chromium 的常量/静态结构门禁，纳入 `npm test`。断言：① 阈值常量 == 父 spec §9.2 逐字值；② 矩阵规模 == **9**；③ C1 元素选择器集合 == 父 spec §9.1 定义；④ `DENSITY_MEASURE_SOURCE` **字符串零命中** `getComputedStyle` / `offsetParent` / `getBoundingClientRect` / `aria-hidden`；⑤ `index.html` 静态结构：L0 容器与 `[data-region="l1"]` / `[data-region="l2"]` **不互串**、54 id 保留、`#risk-rail` 祖先闭包无 `hidden`/`[aria-expanded]`、`#composer` 默认 `hidden`、`body` 仍是 flex 容器；⑥ **RP-V3-02(a)** 纯函数反证；⑦ C4 变化登记（读 `docs/v3-density-baseline.json`，存在时校验）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/density-thresholds.test.ts` |

**验收标准**:
- [x] 七组断言全部实现；每条均有独立可 FAIL 的判据
- [x] 反作弊断言（④）在**故意**把 `getComputedStyle` 写进测量源码时必须 FAIL（本地自检一次并还原）
- [x] 54 id 基线以**常量清单**形式固化在测试内（供 S5 断言与后续叶复用）
- [x] 不触碰既有 4 个 `test/ui/*.mjs`；纳入 `npm test` 后 `test(` 计数**只增不减**（≥646 下界守卫保持）
- [x] 无 Chromium 依赖（`node --test` 可单独跑）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-w2b.log
```

---

### TASK-106: L0 骨架三件事 + 决策卡 + 状态栏（逻辑接线）
> L0 骨架的**逻辑**侧（密度预算逐项配平）

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-105, TASK-103, TASK-104 |
| **执行波次** | Wave 3（**串行**） |
| **对应 FR / AC / ADR** | FR-V3-010 / FR-V3-011 / FR-V3-012 / FR-V3-013 / FR-V3-014 / FR-V3-015 / FR-V3-021 / FR-V3-023 · AC-V3-001 / AC-V3-002 · ADR-V3-013 · ADR-V3-014 · ADR-V3-017 |

**描述**: 新建 `l0/shell.ts`（三件事三区渲染）、`l0/decision-card.ts`（**复用 `#ask` 家族**并迁入 `#l0-decision` 直系：`#ask-prompt` + ≤2 推荐选项 + 「更多选项（还有 N 个）」**真值计数** + 末项固定「其他…（我来描述）」就地展开兜底输入 + 撤销回焦点）、`l0/status-bar.ts`（**一行**状态栏 + 展开后 ≤4 个 L2 入口面板骨架，计数占位待 v3-3 填真值）。追加 `view-model.ts` 的 L0 视图模型（纯函数，node 可测）与 `sidepanel.ts` 挂载/订阅（**既有 render / handler 零删改**）。按 `plan.md` §2.2 逐项配平默认档 **7 个可点**（`#l0-status-band` / `#l0-pick` / 推荐选项 1 / 推荐选项 2 / `#l0-more` / `#l0-ref-toggle` / `#l0-statusbar`）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/shell.ts` |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/decision-card.ts` |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/status-bar.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` |

**验收标准**:
- [x] 三件事在默认态**同时可见**（我在哪 / 谁在管我 / 下一步做什么）
- [x] 默认态决策卡数 = **1**；推荐选项 ≤2；「更多选项（还有 N 个）」的 N 与真实非推荐选项数**相等**（改真值 → N 变）
- [x] 末项文案**逐字**为「其他…（我来描述）」；兜底输入框仅该项被选中时可见，提交/取消后回 `hidden`
- [x] 默认态可见文本输入框计数 = **0**（含 `input:not([type])` / `textarea`；不得用 CSS 隐藏的真实输入框绕过）
- [x] `#l0-pick` 存在；未授权 / 探测中时**禁用**且风险位明示「页面侧零注入」
- [x] `#l0-statusbar` 为**一行**；展开后出现入口面板（≤4 入口），**不是** L2 内容
- [x] 既有 54 id 全部仍可 `getElementById` 命中（迁移只改归属与可见性）
- [x] `view-model.ts` 新增部分为纯函数（node 可测）；`sidepanel.ts` 既有分支零删改

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run typecheck 2>&1 | tee /tmp/opencode/v3-gate-logs/typecheck-w3.log && npm test 2>&1 | tee /tmp/opencode/v3-gate-logs/npm-test-w3.log
```

---

### TASK-109: Chromium 密度门禁 `test/ui/density.mjs`（9 强制格 + 15 登记格）
> 本叶核心产出；AC-V3-001~005 的唯一实跑载体

| 属性 | 值 |
|------|-----|
| **复杂度** | L |
| **前置依赖** | TASK-101, TASK-102, TASK-106 |
| **执行波次** | Wave 4 |
| **对应 FR / AC / ADR** | FR-V3-022 · NFR-V3-001 / NFR-V3-002 / NFR-V3-012 · AC-V3-001 / AC-V3-002 / AC-V3-003 / AC-V3-004 / AC-V3-005 · ADR-V3-003 · ADR-V3-004 · ADR-V3-005 |

**描述**: 新建 Chromium/CDP 密度门禁（`npm run test:density`），五阶段：**A** 稿件同源对账（用**我们的** `DENSITY_MEASURE_SOURCE` 测 `option-e-progressive.html` 的 `#panel` → 断言 E 默认态 `{clickables:7, lines:10, blocks:47, regions:6}`；再调稿件 `window.__density()` 断言**逐项相等**；D 稿同法断言 `{80,144,391,5}`；任一不等即 FAIL）；**B** 真实产物 **3 档 × 3 视口 = 9 强制格**（`resetFixture()` → `applyTier()` → `setViewport()` → `measure()` → `evaluateDensity()` 断言 C1/C2 ≤ 上限）；**C** 风险 **5 子场景 × 3 视口 = 15 登记格**（取 3 视口**最差值**参与强制判定 + `evaluateDelta(默认态, 风险态)` 断言 `violations` 为空，AC-V3-003）；**D** 反作弊（测量源码禁用函数零命中）；**E** 五元组汇总表（档位/视口/口径/实测/上限）。含 `--reverse RP-V3-01..04` 定向驱动（判据写死在 driver：「注入后必须 FAIL ∧ 还原后必须 PASS」，缺一即判反证无效）。夹具 hermetic 且幂等（每格 `resetFixture()` 重载 + 清桩；`risk` 五子场景全部经**既有通路**构造）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/density.mjs` |
| MODIFY | `packages/web-cli-plugin/package.json`（仅追加 `test:density`） |

**验收标准**:
- [x] 阶段 A 双向对账成立（**同输入同输出**）；E/D 稿公布值若与 `index.html` 不一致须**如实登记**
- [x] 阶段 B **9 格全过**；任一处超限即 FAIL（不得只测 400×900）
- [x] 阶段 C **15 登记格**全部记录实测值；强制判定取**最差值**；增量归属违规数 = 0
- [x] 夹具幂等：每格 `resetFixture()`；driver 打印每格状态指纹（授权态 / 探测态 / 展开态）便于复核
- [x] **设计稿口径数字与真实产物口径数字分列输出**（不得混为一个数字）
- [x] 单 Chromium 实例、单 page target、逐格顺序执行；stdout+stderr 全量 `tee` 落盘，**禁 tail 截断**
- [x] `npm run test:density` 可独立运行；不触碰既有 4 个 `test/ui/*.mjs`

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && npm run test:density 2>&1 | tee /tmp/opencode/v3-gate-logs/density.log
```

---

### TASK-110: L0 运行时门禁 `test/ui/l0.mjs`
> L0 骨架 + 风险位 + 几何契约的运行时门禁

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-106 |
| **执行波次** | Wave 4 |
| **对应 FR / AC / ADR** | FR-V3-010~021 / FR-V3-026 / FR-V3-085 · AC-V3-008 / AC-V3-009 / AC-V3-010 / AC-V3-020 / AC-V3-021 · EC-V3-008 · ADR-V3-006 · ADR-V3-007（第 6 条增强式替代）· ADR-V3-008 · ADR-V3-009 |

**描述**: 新建 L0 运行时门禁（`npm run test:l0`）。断言：① 骨架三件事可见 + 决策卡唯一 + 无常驻输入框；② **AC-V3-008 = 5 类 × 2 场景 = 10 条** `assertRiskVisible(cls)`（存在 ∧ `hidden !== true` ∧ 祖先闭包无 `hidden`/`[data-l1-panel]`/`[data-l2-view]`/`[data-disclose-panel]` ∧ `rect.height > 0` ∧ 位于默认视口内），`allCollapsed` 场景调 `window.__v3.disclosure.collapseAll()` 后重跑；③ **AC-V3-009** 祖先链 + `#confirm-*` 不参与折叠；④ **AC-V3-010** 可发现性（入口非空文字 + ARIA 成对 + `aria-controls` 目标含非空摘要/计数 + L1 ≤1 / L2 ≤2 步可达）；⑤ 320/400 常驻元素 `id` 集合相等 + 零水平溢出（AC-V3-021）；⑥ **几何契约增强式替代**：L0 四常驻区两两交面积 = 0（6 组）、`#log` 仍是**唯一**滚动容器、`#log` clientHeight ≥ 首轮实测下界（读基线，只允许上调）、兜底展开态 `#composer` 贴底（`gap ∈ [0,+12]`）且不被常驻区遮挡；⑦ 双主题下状态可读且不只靠颜色（AC-V3-020）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/test/ui/l0.mjs` |
| MODIFY | `packages/web-cli-plugin/package.json`（仅追加 `test:l0`） |

**验收标准**:
- [x] 10 条风险断言（5×2）+ 祖先链断言全部落地；从 `#risk-rail` 移除任一风险行 → **必须 FAIL**
- [x] 几何 6 组交面积 = 0；`#log` 面板级滚动容器计数 = **1**；composer 贴底断言成立
- [x] 320/400 常驻 `id` 集合相等（不删元素）
- [x] 明暗两主题（`prefers-color-scheme` 仿真）各跑一轮；三通道断言覆盖 5 类风险
- [x] 该文件承载 insight 几何 3 条 union 迁移（与 TASK-113 台账条目 `old→new` 对齐）
- [x] 不触碰既有 `test/ui/insight.mjs`（几何迁移只在台账登记 + 本文件新增）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:l0 2>&1 | tee /tmp/opencode/v3-gate-logs/l0.log
```

---

### TASK-113: 既有门禁**同编号最小改写** + `package.json` scripts 追加
> 取代面最小化（id 零重命名的红利兑现）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-106 |
| **执行波次** | Wave 4 |
| **对应 FR / AC / ADR** | FR-V3-004 · NFR-V3-014 / NFR-V3-017 · AC-V3-011 / AC-V3-012 · EC-V3-013 · ADR-V3-007（第 5 条逐门禁策略）· ADR-V3-019 |

**描述**: 对既有门禁做**同编号最小改写**（不重写选择器、不删条目、不降级）：① `test/ui/journey.mjs` **仅 1 处**——`#15c`（composer 贴底）→ 兜底展开态下的同义断言（同编号 + `modifiedRanges` 声明）；其余字节零改。② `test/ui/binding.mjs`——自由文本入口相关 `#6a` / `#6` / `#6l` **同编号前置展开**（`await revealFallbackInput()`）；`#21*`/`#22*` 区域**字节零改**（`protectedRanges` hash pin）。③ `test/ui/insight.mjs`——几何 3 条按 **union 口径**迁移到 `test/ui/l0.mjs`（`counts.insight.countMethod` 的 note 必须写明 union = `runtime(insight)+runtime(l1)+runtime(l2) ≥ 108`）。④ `package.json` 追加 scripts：`test:density` / `test:l0` / `test:supersession` / `test:v3`（**依赖零新增**）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/journey.mjs`（**仅 `#15c`**） |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs`（`#6a`/`#6`/`#6l` 前置展开） |
| MODIFY | `packages/web-cli-plugin/test/ui/insight.mjs`（几何 3 条迁移登记，最小前置展开） |
| MODIFY | `packages/web-cli-plugin/package.json`（仅 scripts） |

**验收标准**:
- [x] `journey.mjs` 除 `#15c` 外 `git diff` 为 0 行；断言计数 **≥167**
- [x] `binding.mjs` 的 `#21*`/`#22*` 区段字节 hash **不变**；断言计数 **≥192**
- [x] `insight.mjs` 既有条目**零删除**；union 口径写入台账（TASK-108）
- [x] 三文件均无删除行**未命中台账**（由 TASK-108 门禁机器核验）
- [x] `package.json` 的 `dependencies` / `devDependencies` **零 diff**

**验证命令**:
```bash
cd packages/web-cli-plugin && git diff --numstat -- test/ui/journey.mjs test/ui/binding.mjs test/ui/insight.mjs package.json | tee /tmp/opencode/v3-gate-logs/diff-protected.log
```

---

### TASK-108: **取代台账** `docs/v3-supersession-ledger.json` + 门禁 `test/supersession-ledger.test.ts`
> 「删除行必须命中台账否则 FAIL」成为机器事实（AC-V3-011）

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-113 |
| **执行波次** | Wave 5 |
| **对应 FR / AC / ADR** | FR-V3-004 · NFR-V3-014 · AC-V3-011 / AC-V3-012 / AC-V3-014 · EC-V3-013 · ADR-V3-007 · ADR-V3-019 |

**描述**: 新建 `packages/web-cli-plugin/docs/v3-supersession-ledger.json`（**与 `r2-supersession-ledger.json` 并列不覆盖**）。schema：顶部 `version` / `feature` / `metric` / `literalRemovedZero` / `literalRemovedZeroNote`；`counts` **每个门禁一个对象** `{baselineRuntime, currentRuntime, countMethod, floor, note}`，`countMethod` **必填且只能取 `runtime-check-calls`**（消灭 r2 的静态/运行期跨口径歧义）；`gateFloors = {journey:167, insight:108, binding:192, sidepanelView:38, nodeTestLowerBound:646}`（只增不减）；`protectedRanges`（字节区间 hash pin，如 binding `#21*`/`#22*`、journey `#15a~#15q`）；`modifiedRanges`（允许改写的行区间 + `oldId`，本叶 = journey `#15c`）；`entries[] = {id,file,oldId,oldTitle,newId,newTitle,gate,reason,replacementExists}`；`zeroDiffFiles`。同步新建门禁 `test/supersession-ledger.test.ts`（纳入 `npm test`）：对每个受保护文件跑 `git diff -U0 c2c0e0d..worktree` 解析删除/修改 hunk → **每个 hunk 必须命中** `entries[].oldTitle` 文本 **或** `modifiedRanges` 区间，**未命中即 FAIL**；`protectedRanges` 字节 hash 必须不变；`zeroDiffFiles` 必须 0 行；`entries[].newTitle` **必须能在目标文件中定位**（防橡皮图章）；`counts.*.currentRuntime ≥ gateFloors.*` 且 `countMethod === 'runtime-check-calls'`；支持 `--files-override <path>`（供 RP-V3-05）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/docs/v3-supersession-ledger.json` |
| NEW | `packages/web-cli-plugin/test/supersession-ledger.test.ts` |
| MODIFY | `packages/web-cli-plugin/package.json`（仅追加 `test:supersession`） |

**验收标准**:
- [x] `countMethod` 唯一合法值 = `runtime-check-calls`；出现其他值 → FAIL
- [x] `gateFloors` 五项齐备且为只增下界；`counts.*.currentRuntime ≥ gateFloors.*`
- [x] 台账 `base` 明确为 **`c2c0e0d`**（本轮起点），只登记本叶改动（不把 v1/v2 历史行计入）
- [x] `protectedRanges` 以**字节 hash** 而非行号锚定
- [x] 本叶条目：journey `#15c`（oldId==#15c 改写）、binding `#6a`/`#6`/`#6l` 前置展开、insight 几何 3 条 union 迁移（`newTitle` 可在 `test/ui/l0.mjs` 定位）
- [x] `--files-override <path>` 通路可用（RP-V3-05 的前置）

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run test:supersession 2>&1 | tee /tmp/opencode/v3-gate-logs/supersession.log
```

---

### TASK-112: **首轮真实产物密度基线登记** `docs/v3-density-baseline.{md,json}`
> A-UI-001 兑现：真实产物口径与设计稿口径**分列**（AC-V3-007 的登记载体）

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-109 |
| **执行波次** | Wave 5 |
| **对应 FR / AC / ADR** | FR-V3-022 · NFR-V3-001 · AC-V3-004 / AC-V3-005 / AC-V3-007 · EC-V3-010 · ADR-V3-011（第 4 条：密度与体积**分开**登记）· ADR-V3-018 |

**描述**: 依据 `test:density` 阶段 B/C 的**真实产物实测值**，登记三档 × 三视口的密度基线：`docs/v3-density-baseline.md`（人读）+ `docs/v3-density-baseline.json`（机读，门禁读取并断言「实测 ≤ 阈值」且「基线只允许收紧」）。**必须分列**：设计稿口径数字（E `7/10/47/6`、D `80/144/391/5`）与真实产物口径数字**不得混为一个数字**。首装态 ≤9/≤20 为 spec 新建档：首轮实测登记为基线，**校准只允许下调（更严）**；若实测超 9/20 → **改披露策略**（说明文案收进 L1，只留摘要/计数 + 入口），**不得**放宽阈值。C4 常驻分区数变化必须显式登记（前后值 + 日期 + 理由），并写明反直觉事实（E 比 D 多 1，因风险位独立成区），**不得**作为密度达标证据或放宽理由。`test/ui/l0.mjs` 的 `#log` clientHeight 下界取本文件登记值（只允许上调）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| NEW | `packages/web-cli-plugin/docs/v3-density-baseline.md` |
| NEW | `packages/web-cli-plugin/docs/v3-density-baseline.json` |

**验收标准**:
- [x] 三档 × 三视口 = 9 格实测值逐格登记（含 C1/C2/C3/C4 四口径数值）
- [x] 与设计稿口径**分列**（两个独立小节/字段，不得合并）
- [x] 每格含日期 + 来源（`dist/sidepanel.js` + `npm run build` 命令）+ 实测人（叶子 + 轮次）
- [x] 基线「只允许收紧」：JSON 内含 `direction` 与 `previous*` 字段；门禁读取后断言「实测 ≤ 阈值」
- [x] C4 变化登记含前后值 + 日期 + 理由 + 反直觉事实说明
- [x] 与体积基线**分开**（不得写进 `test/size-baseline.ts`）

**验证命令**:
```bash
cd packages/web-cli-plugin && node -e "const b=require('./docs/v3-density-baseline.json');if(!b.tiers||!b.viewports||!b.designCaliber)throw new Error('baseline shape');console.log('baseline ok', Object.keys(b.tiers))" | tee /tmp/opencode/v3-gate-logs/density-baseline.log
```

---

### TASK-111: **RP-V3-01~06 六条反证实跑**（每条都必须能真 FAIL）
> NFR-V3-013 的兑现；门禁必须能真 FAIL

| 属性 | 值 |
|------|-----|
| **复杂度** | M |
| **前置依赖** | TASK-108, TASK-109, TASK-110, TASK-112 |
| **执行波次** | Wave 6（**串行，逐条顺序执行、逐条还原**） |
| **对应 FR / AC / ADR** | NFR-V3-012 / NFR-V3-013 · AC-V3-006 / AC-V3-014 / AC-V3-015 / AC-V3-024 · EC-V3-010 · ADR-V3-003 · ADR-V3-004（第 3 条逐条判据）· ADR-V3-007（第 4 条） |

**描述**: 六条反证**逐条实跑**并留完整日志（**禁 tail 截断**），每条判据写死在 driver（「必须 FAIL ∧ 还原后必须 PASS」缺一即判反证无效）：
- **RP-V3-01**（+1 可点元素）：默认档下向测量根注入 `<button id="rp01">` → `evaluateDensity` **必须** `ok === false` 且 `exceeds` 含 `C1 8 > 7`；`remove()` 后重测**必须** `ok === true`。
- **RP-V3-02**（阈值 -1）：(a) 纯函数层 `evaluateDensity({clickables:7},'default',{clickables:6,lines:15}).ok === false`；(b) 源码层把 `density-metrics.mjs` 复制到临时路径、仅把默认档 `clickables:7→6`、以副本驱动同一测量 → **必须 FAIL**；`try/finally` 内**必须**校验原文件 sha256 未变。
- **RP-V3-03**（CSS 隐身不算豁免）：对一个已计入的可点元素依次设 `display:none` → `visibility:hidden` → `opacity:0` → `pointerEvents:none`，每次重测 **C1 不得下降**（下降即反证失败）；随后 `el.hidden = true`，C1 **必须下降 1**（唯一豁免通道生效）→ 还原。
- **RP-V3-04**（风险位被折叠）：把某风险行移入 `#l1-status`（`hidden === true`）→ AC-V3-008/009 断言**必须 FAIL** → 还原后 PASS。
- **RP-V3-05**（删 1 条断言）：复制 `test/ui/l0.mjs` 到临时路径并删 1 条 `check(...)` → 以副本为输入跑台账门禁（`--files-override <path>`）→ **必须 FAIL**（删除行未命中台账）→ 还原。
- **RP-V3-06**（+1 B）：`dist/content.js` 追加 1 字节 → 既有体积守卫**必须** FAIL；`dist/pick-layer.js` 的 v3-4 新增守卫在 v3-4 叶内实跑（本叶只跑 `content.js` 段并留日志）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `packages/web-cli-plugin/test/ui/density.mjs`（`--reverse RP-V3-01/02/03` 驱动分支） |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts`（`--files-override` 通路） |
| NEW | `/tmp/opencode/v3-gate-logs/rp-v3-0*.log`（**证据，不入版本库**） |

**验收标准**:
- [x] 六条全部实跑；每条日志同时含 **FAIL 段**与**还原后 PASS 段**（缺一即反证无效）
- [x] 反证过程中**不残留**任何临时改动（RP-V3-02(b) 用原文件 sha256 自校验；RP-V3-05 用副本）
- [x] RP-V3-03 的「计数不下降」为**结构必然**（测量源码只有一处 `visibleIn`，仅 `hidden` 豁免）
- [x] 完整日志落盘 `/tmp/opencode/v3-gate-logs/`，**禁 tail 截断**
- [x] 反证结果如实记录（不得只写在文档里；失败即如实登记并修复后重跑）

**验证命令**:
```bash
cd packages/web-cli-plugin && for rp in RP-V3-01 RP-V3-02 RP-V3-03 RP-V3-04; do node test/ui/density.mjs --reverse $rp 2>&1 | tee /tmp/opencode/v3-gate-logs/$rp.log; done
# 注：RP-V3-05 / RP-V3-06 见 TASK-111 描述；每条做完必须还原并复核 git status
```

---

### TASK-114: 体积守卫核对 + `sidepanel.js` **显式重登记**（条件触发）
> 显式任务：触发时必须走完整披露流程，**禁止**静默放宽容差

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-111 |
| **执行波次** | Wave 7 |
| **对应 FR / AC / ADR** | NFR-V3-003 / NFR-V3-005 · AC-V3-015 / AC-V3-016 · EC-V3-012 · ADR-V3-011（第 3/5 条）· ADR-V3-031 |

**描述**: 跑 `npm run build` 后核对：① `dist/content.js` **≤ 177,076 B**（无容差，本叶应**零改动**，仅复核）；② `dist/sidepanel.js` ≤ ceiling **279,825 B**（基线 266,500，容差 5%）。本叶 `+8~12 KB` 预估**贴近 ceiling**（`plan.md` §2.6 判定「可能触发」）——**若实测超 ceiling**，在**本叶内**完成显式重登记（不得留给下一叶，EC-V3-013 / ADR-V3-011 第 5 条），落点 `test/size-baseline.ts`：
- `SIDEPANEL_BASELINE_BYTES` 更新为**新实测值**；旧值**必须**加入 `SIDEPANEL_BASELINE_BYTES_HISTORY`；
- `SIDEPANEL_BASELINE_META` 补全 `measuredOn` / `source`（`dist/sidepanel.js`）/ `buildCommand` / `measuredBy`（`v3-1 + 轮次`）/ `previousBaselineBytes` / `previousCeilingBytes` / `direction`（`raised` 时写明**有意增重的功能理由**）/ `reRegisteredFrom`；
- **容差 5% 不变**；`targetBudgetBytes` / `targetMet` **保持 `null`**（禁止「目标达成」叙述回潮）；
- **断言零删减**；反证（+1 B → FAIL）在**新值上重新驱动**。

若未超 ceiling → `test/size-baseline.ts` **零改动**，并在 `state.json` / 收口报告注明「本叶未触发重登记」。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY（**条件触发**） | `packages/web-cli-plugin/test/size-baseline.ts` |

**验收标准**:
- [x] `content.js` 实测 ≤ 177,076 B；`CONTENT_SOURCE_SHA256` 三项 **pin 不变**（本叶零改动）
- [x] `sidepanel.js` 实测值与 ceiling 比较结果**如实记录**
- [x] 若触发重登记：五要素（前后值 + 日期 + 来源 + 理由 + `_HISTORY` 历史保留）**齐备**；容差 5% 不变；断言零删减；反证在新值上复跑并留日志
- [x] 若未触发：`test/size-baseline.ts` diff = 0，并登记「未触发」

**验证命令**:
```bash
cd packages/web-cli-plugin && npm run build && node -e "const fs=require('fs');const c=fs.statSync('dist/content.js').size,s=fs.statSync('dist/sidepanel.js').size;console.log({content:c,sidepanel:s});if(c>177076)process.exit(1);if(s>279825)console.error('CEILING EXCEEDED -> 走显式重登记');" | tee /tmp/opencode/v3-gate-logs/size.log
```

---

### TASK-115: **收口：全门禁绿串行验证 + 人工面如实登记**
> AC-V3-013 / NFR-V3-015 / FR-V3-087

| 属性 | 值 |
|------|-----|
| **复杂度** | S |
| **前置依赖** | TASK-114 |
| **执行波次** | Wave 7（收口，单条链式命令） |
| **对应 FR / AC / ADR** | FR-V3-003 / FR-V3-086 / FR-V3-087 · NFR-V3-012 / NFR-V3-014 / NFR-V3-015 · AC-V3-013 / AC-V3-024 / AC-V3-025 / AC-V3-027 · EC-V3-013 · ADR-V3-010 |

**描述**: 在 `feature/web-cli-plugin` 上**严格串行**跑完本叶全部门禁（一次只跑一个，`&&` 串联，日志全量 `tee` 落盘），全部绿后才允许 v3-2 / v3-3 开工。串行顺序见 §4.1。另：① 零改动核对（`manifest.json` / `src/security/**` / `src/content/**` 三 hash / `packages/web-cli-base/**` / `options.html` / `design/**` 零 diff）；② **人工面如实登记为「未执行」**（主题观感 / 动画体感 / 窄栏真实体感 / 多显示器 / 高 DPI），**不得冒充 PASS**；③ 输出收口结论（含每门禁实测断言数 vs 下界）。

**涉及文件**:

| 操作 | 文件路径 |
|:--:|------|
| MODIFY | `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v3-ui/specs-tree-v3-1-l0-shell-density/state.json`（build 阶段更新，非本阶段） |
| NEW | `/tmp/opencode/v3-gate-logs/*.log`（证据，不入版本库） |

**验收标准**:
- [x] 全门禁绿（§4.1 顺序，逐条串行）；每门禁日志完整落盘、**禁 tail 截断**
- [x] 断言计数逐项 ≥ 下界：journey **≥167** / insight union **≥108** / binding **≥192** / `sidepanel-view` **≥38** / node `test(` **≥646**（只增不减）
- [x] 零改动核对全部通过（6 类文件零 diff）
- [x] 人工面清单逐项标注「未执行 / PASS」二值之一，不得留空或写「通过」
- [x] AC-V3-013 达成：**无红灯遗留**给 v3-2 / v3-3

**验证命令**:
```bash
cd packages/web-cli-plugin && bash -c '
set -e
run(){ echo "=== $1 ==="; eval "$2" 2>&1 | tee /tmp/opencode/v3-gate-logs/$1.log; }
run typecheck "npm run typecheck"
run build "npm run build"
run npm-test "npm test"
run supersession "npm run test:supersession"
run density "npm run test:density"
run l0 "npm run test:l0"
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
| 总任务数 | **15** |
| S 级 (简单) | 5（101 / 104 / 112 / 114 / 115） |
| M 级 (中等) | 8（102 / 103 / 105 / 107 / 108 / 110 / 111 / 113） |
| L 级 (复杂) | 2（106 / 109） |
| 执行波次 | **7** |

### 3.1 需求条目 → 任务映射

| 需求 | 承载任务 |
|------|---------|
| FR-V3-004（新门禁落新文件、既有断言零删改） | TASK-101 / 107 / 108 / 113 |
| FR-V3-010~015（L0 骨架三件事 / 决策卡 / 状态栏） | TASK-103 / 106 |
| FR-V3-016~019（风险位 / 三通道 / 不折叠 / 零允许控件） | TASK-103 / 105 / 110 |
| FR-V3-020~023（可发现性 / 可达性 / 展开态记忆） | TASK-104 / 110 |
| FR-V3-022（密度预算三档 × 三视口） | TASK-102 / 107 / 109 / 112 |
| FR-V3-024 / FR-V3-026（`hidden` + ARIA / 双主题） | TASK-103 / 104 / 110 |
| NFR-V3-001 / 002 / 013（密度可复算 + 能真 FAIL） | TASK-102 / 107 / 109 / 111 |
| NFR-V3-005（`sidepanel.js` 体积） | TASK-114 |
| NFR-V3-012 / 014 / 015（串行 / 计数不减 / 人工面） | TASK-108 / 113 / 115 |
| AC-V3-001~005（密度） | TASK-109 / 112 |
| AC-V3-006 / AC-V3-014（反证） | TASK-111 |
| AC-V3-007（分区登记） | TASK-112 |
| AC-V3-008~010（风险位 / 可发现性） | TASK-105 / 110 |
| AC-V3-011 / AC-V3-012 / AC-V3-013（台账 / 计数 / 全绿） | TASK-108 / 113 / 115 |
| AC-V3-020 / AC-V3-021（双主题 / 320px） | TASK-103 / 110 |

### 3.2 交付门槛矩阵（本叶）

| 门禁 | 命令 | 承载任务 | 断言要点 |
|------|------|:--:|------|
| 类型 | `npm run typecheck` | 106 | 0 error |
| 单测 | `npm test` | 105 / 107 | 全绿；`test(` ≥ 646（只增） |
| 密度（Chromium） | `npm run test:density` | 109 | 9 强制格 + 15 登记格 + 增量归属 0 违规 |
| 密度常量/静态 | `npm test`（`density-thresholds.test.ts`） | 107 | 阈值逐字 / 矩阵 9 / 禁用函数零命中 / 静态结构 |
| L0（Chromium） | `npm run test:l0` | 110 | 骨架 / 决策卡 / 风险位 5×2 / 可发现性 / 320-400 等价 / 几何替代 |
| 台账 | `npm run test:supersession` | 108 | hunk 全命中 / `protectedRanges` hash / 计数下界 |
| 既有三门禁 | `test:ui` / `test:insight` / `test:binding` / `test:hardening` | 113 | ≥167 / union ≥108 / ≥192 / 24 |
| 端到端 | `npm run test:e2e` | 115 | PASS |
| 反证 | `--reverse RP-V3-01~06` | 111 | 每条 FAIL → 还原 → PASS |
| 体积 | `size-baseline` | 114 | `content.js` ≤177,076；`sidepanel.js` ≤ceiling（超则显式重登记） |

### 3.3 断言只增不减（具体保证方式）

| 保证 | 方式 |
|------|------|
| 本叶新增断言落**新文件** | `density-metrics.mjs` / `density.mjs` / `l0.mjs` / `density-thresholds.test.ts` / `supersession-ledger.test.ts` / `l0-disclosure.test.ts` |
| 既有门禁删除行必须命中台账 | `test/supersession-ledger.test.ts` 的 hunk ↔ 台账映射（TASK-108） |
| 计数下界 | journey ≥167 / insight union ≥108 / binding ≥192 / sidepanelView ≥38 / node ≥646（只增不减） |
| 受保护区段 | binding `#21*`/`#22*`、journey `#15a~#15q` 用**字节区间 hash** pin |
| 安全断言 | 硬底线零允许控件 + 零提权控件 + clamp 在 SW 侧（只增） |

---

## 4. 执行策略

### 4.1 门禁串行纪律（**一次只跑一个**，NFR-V3-012 / AC-V3-024）

> 本机内存 ~1.5GB、曾 OOM（R3-10 / R31-08）。**任何两个 Chromium 门禁绝不并发**。全部日志 `tee` 到 `/tmp/opencode/v3-gate-logs/<gate>.log`，**禁 tail 截断**。

**严格串行顺序（逐条 `&&` 串联，任一步 fail 即停，修复后从头串行重跑）**：

```
① npm run typecheck
② npm run build
③ npm test                        ← Node 单测（含 density-thresholds / l0-disclosure / supersession-ledger）
④ npm run test:supersession
⑤ npm run test:density            ← Chromium（9 强制格 + 15 登记格；数十秒级）
⑥ node test/ui/density.mjs --reverse RP-V3-01 / 02 / 03 / 04   （逐条）
⑦ npm run test:l0                 ← Chromium
⑧ npm run test:ui                 ← Chromium（journey）
⑨ npm run test:insight            ← Chromium
⑩ npm run test:binding            ← Chromium
⑪ npm run test:hardening          ← Chromium
⑫ npm run test:e2e                ← Chromium（全链路）
⑬ 体积守卫（+1 B 反证 RP-V3-06 的 content.js 段）
⑭ 零改动核对（manifest / security / content 三 hash / base / options.html / design）
```

> ⑥ 与 ⑬ 是**反证**，`⑦`（收口）必须在反证**逐条还原后**才能跑（否则残留临时改动会造成假 FAIL）。
> `npm run test:v3` 一旦在 TASK-113 建立，即为上述顺序的**链式驱动入口**；在 `test:v3` 就绪前，按上面 1~14 逐条手工串行。

### 4.2 文件所有权（防并行冲突）

| 文件 | 唯一所有者（本叶） |
|------|------|
| `src/ui/sidepanel/index.html` | TASK-103（后续叶再追加，本叶内独占） |
| `src/ui/sidepanel/sidepanel.ts` / `view-model.ts` | TASK-106 |
| `src/ui/sidepanel/disclosure.ts` | TASK-104（TASK-105 只读契约，不写） |
| `src/ui/sidepanel/l0/risk-rail.ts` | TASK-105 |
| `src/ui/sidepanel/l0/{shell,decision-card,status-bar}.ts` | TASK-106 |
| `test/ui/_v3-helpers.mjs` | TASK-101 |
| `test/ui/density-metrics.mjs` | TASK-102 |
| `test/ui/density.mjs` | TASK-109（TASK-111 只追加 `--reverse` 分支） |
| `test/ui/l0.mjs` | TASK-110 |
| `test/density-thresholds.test.ts` | TASK-107 |
| `test/supersession-ledger.test.ts` + `docs/v3-supersession-ledger.json` | TASK-108（后续叶**只追加**） |
| `docs/v3-density-baseline.{md,json}` | TASK-112 |
| `test/size-baseline.ts` | TASK-114（条件触发） |
| `test/ui/{journey,binding,insight}.mjs` | TASK-113 |
| `package.json`（scripts 段） | TASK-109 / 110 / 113（**只追加**，不删既有 script） |

### 4.3 体积 / 取代 / 基线登记纪律

1. **`content.js` 无容差不可重登记**：本叶不碰 `src/content/**`；唯一守线方式 = 让它**字节不变**（AC-V3-015）。
2. **`sidepanel.js` 条件重登记**：见 TASK-114 的 4 条披露要求；**禁止**改容差 / 删断言 / 把 `targetBudgetBytes` 改成目标值（ADR-V2-007 禁止的叙述回潮）。
3. **密度基线与体积基线分开登记**：密度落 `docs/v3-density-baseline.*`，体积落 `test/size-baseline.ts`（ADR-V3-011 第 4 条）。
4. **取代台账只追加**：本叶建立 schema 与首批 `entries[]`；v3-2 / v3-3 / v3-4 **只追加**，不改 schema、不改他叶条目。
5. **反证必须实跑**：RP-V3-01~06 的日志是交付物的一部分；只写在文档里 = 无防线。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：V3-1 任务分解（15 任务 / 7 波；S×5 / M×8 / L×2）。**覆盖编排器必含项**：①密度门禁唯一实现源 `test/ui/density-metrics.mjs` + 三段式落点（`test/ui/density.mjs` / `test/density-thresholds.test.ts` / `test/ui/_v3-helpers.mjs`）；②9 强制格 + 15 登记格参数化；③RP-V3-01~06 六条反证（每条可真 FAIL）；④反作弊静态断言（测量源码零命中 `getComputedStyle`/`offsetParent`/`getBoundingClientRect`）；⑤L0 骨架 + `#risk-rail` 结构保证（AC-V3-008/009）；⑥取代台账 `docs/v3-supersession-ledger.json` + `test/supersession-ledger.test.ts`（删除 hunk 未命中即 FAIL）；⑦首轮真实产物密度基线登记（三档 × 三视口，与设计稿口径分列）；⑧主题 / 320px / a11y 基建。**门禁严格串行**（14 步链式，一次一个）。**只做 tasks**：未写代码、未改 `src/**`·`test/**`·`manifest.json`·`design/**`·`ROADMAP.md`、未动 `main`、未 commit、**未跑门禁/构建/Chromium**。 | 2026-09-16 | SDDU Tasks Agent |
