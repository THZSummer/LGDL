# 技术计划：specs-tree-v3-1-l0-shell-density（V3-1 L0 骨架与密度门禁）

> **文档定位**: SDDU 技术方案 — 记录架构设计、方案对比和 ADR，作为 tasks 阶段的输入
> **前置依赖**: 本叶 `spec.md` v1.0（叶子切片）+ 父 `../spec.md`（权威条文 §5.2 / §8.1~8.2 / §9 / §10）+ 父 `../plan.md`（**统领性技术方案；本叶承接 ADR-V3-001 / 003 / 004 / 005 / 006 / 007 / 008 / 009 / 010 / 011**）+ 设计基准 `design/ui-redesign/option-e-progressive.html`
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（L0 常驻骨架 + 五类风险位 + **密度口径机器门禁与反证** + 首轮真实产物基线登记；ADR-V3-013~019）。**只做 plan**：不写 tasks、不写代码、不改源码/测试/设计稿、不跑门禁与 Chromium。

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 本叶 `spec.md` 存在（14,116 B） | ✅ |
| 父 `spec.md` / `discovery.md` / `plan.md` 存在 | ✅ |
| 设计基准 `option-e-progressive.html` 存在（209,373 B，本轮零改动） | ✅ |
| **外部 API 文档缓存** | ⚠️ **N/A** —— 本叶无外部服务 API（数据源全部为进程内状态 + Chrome 扩展 API + 设计稿 HTML）；父 plan §1 已逐条举证，本叶不重复 |
| 前置叶子 | **无**（deliveryOrder = 1；本叶产出是其余三叶的共同基线） |
| 既有 v1/v2 实现只读复用（`src/ui/sidepanel/**` 三区布局 / 设置面板 / v2 树 / 覆盖层） | ✅ |
| 红线基线（`main` = `2ddc922` 未动；`manifest.json` / `src/security/**` / `src/content/**` 本轮零改动） | ✅ |
| 本叶不新增权限 / 依赖 / 静态注入；不引入 `contextMenus` | ✅（NFR-V3-006 / NG-V3-001~017） |

**本叶不涉及「外部 API 文档缓存」的说明**：本叶范围只到侧栏 DOM / 视图模型 / 门禁脚本，零外部调用；父 plan §1 的适用性举证（0 个外部 API、6 个 LLM 域零改动、O-UI-001 非阻塞）在本叶完全适用。

**⚠️ 本叶承接的父 plan 偏差与口径登记（必须遵守，不重新讨论）**：

| 父 ADR | 对本叶的直接约束 |
|--------|----------------|
| ADR-V3-001 | 密度**测量根 = `document.body`**（不新增 `#panel` 包裹层）；口径适配必须写进门禁注释与基线文档 |
| ADR-V3-003 | 密度口径**唯一实现源** = `test/ui/density-metrics.mjs`；门禁落 `test/ui/density.mjs` + `test/density-thresholds.test.ts`；**不抽共享 helper**（自带 `test/ui/_v3-helpers.mjs`） |
| ADR-V3-004 | 三档 × 三视口 = 9 强制格 + 5 风险子场景（15 格登记）；RP-V3-01~04 在本叶实跑（RP-V3-05 由台账门禁、RP-V3-06 由体积门禁承担） |
| ADR-V3-005 | C1~C4 逐条实现 + 反作弊（仅 `hidden` 豁免）+ 风险增量归属判定（`isRiskClass`）+ 无稳定键元素直接 FAIL |
| ADR-V3-006 | 风险位**三层结构保证** + AC-V3-008/009 祖先链断言；`disclosure.ts` 目标白名单**抛错** |
| ADR-V3-007 | 台账 `docs/v3-supersession-ledger.json` **在本叶建立**；门禁 `test/supersession-ledger.test.ts`；journey `#15c` 同编号改写 |
| ADR-V3-008 | 主题 / 320px / 无障碍统一约定（复用 `:root` tokens、`hidden` + ARIA 成对、数字键 1~5） |
| ADR-V3-009 | **id 零重命名** + 54 id 归属映射；`#composer` 默认 `hidden`；`#log ≥589px` 增强式迁移 |
| ADR-V3-010 | 本叶提供 `window.__v3.disclosure` / 摘要计数契约 / 选择题契约（复用 `#ask` 家族） |
| ADR-V3-011 | `sidepanel.js` 若超 ceiling → **本叶内**完成显式重登记（前后值 + 日期 + 来源 + 理由 + 历史保留） |

---

## 2. 架构分析

### 2.1 本叶的输入真值（现状，只读实测）

| 事实 | 值 | 对本叶的含义 |
|------|-----|-------------|
| `src/ui/sidepanel/index.html` | 909 行 / **54 个 `id`** / `<body>` 直接子元素 4 个 | 全部 id 保留；新增 3~4 个容器 |
| `#panel-top` 内容 | `#status` / `#llm-status` / `#session-label` / `#topbar`（`#open-settings` / `#authorize` / `#more-actions` / `#revoke` / `#rebind` / `#audit` / `#audit-count` / `#session-box` / `#session-list` / `#group-name` / `#group-create` / `#group-select` / `#group-add`）+ `#llm-test-result` | **默认态可点 ≥12** → 必须整体收窄为「状态带」（1 个可点 = 展开入口），其余迁入 L1 |
| 既有问答卡 | `#ask` / `#ask-prompt` / `#ask-options` / `#ask-input` / `#ask-submit` / `#ask-cancel` | **决策卡直接复用**（免新造输入框、免新 id） |
| 既有确认卡 | `#confirm` / `#confirm-summary` / `#confirm-allow` / `#confirm-deny` | 迁到 `#l0-decision` 直系、**不参与折叠** |
| 既有提示位 | `#env-guard` / `#site-hint` / `#onboarding` / `#discovery-notice` / `#notice` / `#send-reason` / `#consent-slot` | 全部留在 `#panel-bottom`，**归属不变**（首装态可见） |
| `#composer` / `#input` / `#send` | `#panel-bottom` 末元素 | 默认 `hidden`；由末项「其他…（我来描述）」展开 |
| tokens | `:root` 内 `--*` 引用 249 处 + 暗色 `@media` 覆盖 | 复用；新增 token 必须双主题对称 |
| 体积 | sidepanel ~~266,500~~ → **295,225** / ceiling ~~279,825~~ → **306,099**（5% 容差）；content 177,076（无容差）（**收口轮订正 2026-09-16，validate R1 F8 + 编排器裁决**：`~~279,825~~ → 306,099`、`~~266,500~~ → 295,225`（经显式重登记订正；容差 5% 未变、`SIDEPANEL_CEILING_CAP` 只降不升、断言零删减、历史值逐字保留）。原文如下） | 本叶**不碰** `content.js`；`sidepanel.js` 增量见表 §2.6 |
| 既有门禁 helper | `test/ui/*.mjs` 各自内联（无共享模块） | v3 门禁自带 `_v3-helpers.mjs`（ADR-V3-003 第 5 条） |
| 计数下界守卫 | `test/insight-tree-hierarchy.test.ts#currentNodeTestCount()` ≥ 646 | 本叶新增 node 测试只增不减 |

### 2.2 目标：L0 常驻骨架（**可点元素预算的逐项配平**）

> 默认档预算 = **≤7 可点 / ≤15 行**（320 / 400 / 520）。E 稿的 7 个可点及其配平：

| # | 可点元素（id / 描述） | 归属容器 | 角色 |
|:--:|---------------------|---------|------|
| 1 | `#l0-status-band`（状态带，**唯一入口**：origin + 站点名 + 状态点 + 策略档徽标 + LLM 徽标） | `#panel-top` | 我在哪 + 谁在管我（点开 = L1 状态与连接详情） |
| 2 | `#l0-pick`（「从页面拾取」入口） | `#l0-decision` | 替代输入框（未授权 / 探测中禁用 + 风险位明示零注入） |
| 3 | 决策卡推荐选项 1（复用 `#ask-options` 内按钮） | `#l0-decision` | 下一步做什么 |
| 4 | 决策卡推荐选项 2 | `#l0-decision` | 同上 |
| 5 | `#l0-more`（「更多选项（还有 N 个）」） | `#l0-decision` | 其余选项（N 从真值派生） |
| 6 | `#l0-ref-toggle`（引用条展开，含计数） | `#l0-decision`（引用条） | 引用 chip 摘要 → 证据（L1） |
| 7 | `#l0-statusbar`（一行状态栏，含 L2 计数摘要） | `body` 直挂 | L2 入口面板（≤4 个入口，各带计数） |
| — | `#risk-rail` 内风险行 | `body` 直挂 | **默认档风险静态 0 可点**（只有「为什么」入口在风险态记入增量预算） |

**配平规则（机器可判定）**：默认档 C1 = 7；「更多选项」展开后新增的选项属于 L1 内容（必须位于 `[data-l1-panel]` 内）→ **不进入默认档计数**；末项兜底输入展开后的 `#ask-input` / `#ask-submit` / `#ask-cancel` 属于「兜底态」→ `test/ui/l0.mjs` 单独断言其出现，`test/ui/density.mjs` 的默认档测量**不包含**该态（档位定义见 §2.4）。

### 2.3 目标：五类风险位（`#risk-rail`）

| 类 | 触发状态 | 行内容（三通道） | 常驻保证 |
|----|---------|----------------|---------|
| (a) 未授权 | `authorized === false`（S1 fail-closed deny） | 文本「未授权：授权前所有命令按 S1 判定 fail-closed deny（不执行、不静默失败）。**页面侧零注入**。」+ 徽标「未授权」+ 图标 | 独立分区、祖先闭包无 `hidden`/`[aria-expanded]` |
| (b) 探测中 | 声明读取中（不发命令） | 文本「探测中：正在读取站点声明（`web-cli/x.y`）；本阶段不发命令、不改授权。」+ 徽标「探测中」+ 图标 | 同上 |
| (c) 硬底线被拦 | `evaluate` / 未授权 origin / 未知 risk | 文本「硬底线拦下 N 条：`evaluate` 永不执行、永不自动放行，**不提供「允许」选项**」+ 徽标「被拦」+ 图标 + **零允许控件** | 同上 + FR-V3-019 断言 |
| (d) 破坏性待确认 | 有 `ask` 级破坏性子命令待确认 | 文本「破坏性待确认：`bookmarks.remove` 将删除书签「…」，不可撤销 —— 确认选项**不折叠**，全部可见」+ 徽标 + 图标 | 同上 + `#confirm-*` 锚定在 `#l0-decision` 直系 |
| (e) 引用失效 | `ref-validity` 判定非 `valid`（v3-2 提供；本叶用**注入事件**构造） | 文本「引用已失效：引用 ② 的目标元素已被页面重渲染移除；请重新拾取」+ 徽标 + 图标 | 同上 |

**结构机制（父 ADR-V3-006 的落地）**：
1. `l0/risk-rail.ts` 是 `#risk-rail` 的**唯一写入者**（不接收父节点参数）；
2. `disclosure.ts` 的 `COLLAPSIBLE_TARGETS` 白名单**不含** `#risk-rail`，`assertFoldable()` 对其抛错；
3. 决策卡「更多选项」池按 `kind !== 'destructive'` 过滤；
4. `renderRiskRow()` 单一模板产出三通道；文本为空即抛错。

### 2.4 目标：密度门禁的 L0 侧实现（本叶核心产出）

**（1）唯一实现源 `test/ui/density-metrics.mjs`**（父 ADR-V3-003）：

| 导出 | 内容 |
|------|------|
| `DENSITY_MEASURE_SOURCE` | 字符串形式的 in-page 测量表达式（C1~C4 一次算完，返回 `{clickables, chars, lines, blocks, regions, elementsWithKeys}`） |
| `DENSITY_LIMITS` | `default{7,15}` / `firstRun{9,20}` / `risk{17,35}` |
| `DENSITY_VIEWPORTS` | `[320, 400, 520]`（高 900） |
| `DENSITY_TIERS` | `default` / `firstRun` / `risk` 的状态定义与夹具步骤 |
| `RISK_SUBSCENARIOS` | 5 类风险的构造步骤（见 §2.5） |
| `isRiskClassSource` | 字符串形式的归属判定（`#risk-rail` 归属 ∨ `#l0-decision` 内 `[data-destructive-option]`） |
| `evaluateDensity(measured, tier, limitsOverride?)` | 纯判定函数（返回 `ok` / `exceeds[]` / `message`） |
| `evaluateDelta(defaultMeasured, riskMeasured)` | 增量归属判定（返回 `violations[]`） |

**（2）门禁 `test/ui/density.mjs`**（`npm run test:density`）：

```
阶段 A 稿件同源对账（父 ADR-V3-003 第 4 条）
  A1 打开 option-e-progressive.html → 用 DENSITY_MEASURE_SOURCE 测 #panel
     → 断言 {clickables:7, lines:10, blocks:47, regions:6}
  A2 调稿件 window.__density() → 与 A1 逐项相等
  A3 打开 option-d-choice-guided.html → 断言 {80,144,391,5}
  （任一不等 → FAIL：证明「同源」；数字若与 index.html 公布值不一致须如实登记）
阶段 B 真实产物三档 × 三视口（9 强制格）
  for tier of ['default','firstRun','risk']:
    for vp of [320,400,520]:
      resetFixture() → applyTier(tier) → setViewport(vp) → measure()
      → evaluateDensity(...) 断言 C1/C2 ≤ 上限
阶段 C 风险子场景（5 × 3 视口 = 15 格登记；取最差值参与强制判定）
  逐类 applyRiskSubscenario(cls) → 测量 → 断言 ≤ 风险档上限
  → evaluateDelta(默认档, 风险态) 断言 violations 为空（AC-V3-003）
阶段 D 反作弊（RP-V3-03 的常驻部分）
  断言测量源码不含 getComputedStyle / offsetParent / getBoundingClientRect（字符串零命中）
阶段 E 汇总表（档位/视口/口径/实测/上限 五元组）+ 落盘日志
```

**（3）无 Chromium 门禁 `test/density-thresholds.test.ts`**（纳入 `npm test`）：阈值逐字、矩阵规模 9、C1 选择器集合、测量源码禁用函数零命中、`index.html` 静态结构（L0↔L1/L2 不互串 / 54 id 保留 / `#risk-rail` 祖先闭包 / `#composer` 默认 `hidden` / `body` 仍是 flex 容器）。**RP-V3-02(a) 纯函数反证**也在此跑（无需 Chromium）。

**（4）反证驱动**（`node test/ui/density.mjs --reverse RP-V3-01..04`）：实现细则见父 ADR-V3-004 第 3 条；**RP-V3-03 的完整判据**在本叶落地：CSS 隐身 4 变体计数不降（下降即 FAIL）+ `hidden = true` 计数必降 1。

### 2.5 密度夹具（hermetic，三档可复现）

| 档 | 构造步骤（全部经既有通路 / 既有 storage key） |
|----|---------------------------------------------|
| `default` | 绑定 fixture origin + 站点 host permission 打桩授予 + 探测完成（声明有效）+ 无待确认 + `onboarding` / `discovery-notice` 已终结（写既有 storage 键） |
| `firstRun` | 清空首装相关 storage 键（或保留 onboarding 未完成态）→ 使 `#onboarding` 或 `#discovery-notice` 生效；**其余同 default** |
| `risk` | 基座同 default，逐子场景施加：**(a)** 清 origin store（未授权）；**(b)** 置探测中（声明读取挂起）；**(c)** 触发一次被拦的 `evaluate` 回执（走既有通道，非伪造 UI 文案）；**(d)** 走既有 `#confirm` 路径生成破坏性待确认；**(e)** 注入失效引用事件（`window.__v3.testing.staleRef(refId, dim)`，**仅测试用命名空间**，与 v3-2 的真实判定入口分离，避免测试后门污染生产代码） |

**幂等**：每格前 `resetFixture()`（重载侧栏 target + 清桩）→ 保证格间无串扰（父 ADR-V3-004 第 2 条）。

### 2.6 体积与取代面（本叶）

| 项 | 预估 / 事实 |
|---|---|
| `src/ui/sidepanel/index.html` 增量 | 静态骨架（L0 分区 + 风险位 + 状态栏 + 入口面板 + 样式）→ **~+6~9 KB**（html 不在 js 守卫口径） |
| `src/ui/sidepanel/{l0/*,disclosure.ts,status-bar.ts}` | 逻辑 ~+8~12 KB 源码 → `sidepanel.js` 增量预估 **+8~12 KB**（~~266,500 → ~274,500~278,500，贴近 ceiling 279,825~~ → 实际重登记为 **295,225 ≤ 306,099**，见 spec.md §5/§7 订正说明；原文按下不删） |
| 是否触发重登记 | **可能**（贴合度太近）→ 按父 ADR-V3-011 在**本叶内**完成显式重登记与反证复跑 |
| 既有断言取代量 | **最小**：journey `#15c` 同编号改写（1 条）；binding 自由文本相关（`#6a`/`#6`/`#6l`，同编号前置展开）；insight 几何 3 条按 union 口径迁移到 `test/ui/l0.mjs`。台账由本叶建立 |

---

## 3. 方案对比

### 3.1 P-V31-01 决策卡与「末项兜底输入」的实现形态

| 维度 | **方案 A：复用既有 `#ask` 家族（迁移到 `#l0-decision`）** | 方案 B：新造决策卡组件（新 id） | 方案 C：保留 `#ask` 在 `#panel-bottom`，决策卡另建 |
|------|:--|:--|:--|
| 描述 | 把 `#ask` / `#ask-prompt` / `#ask-options` / `#ask-input` / `#ask-submit` / `#ask-cancel` 整体迁入 `#l0-decision` 直系；渲染逻辑复用既有 view-model | 新建 `#l0-q-card` 等一族 id | `#ask` 留在底区；`#l0-decision` 另建一套卡片 |
| 优点 | **54 id 零重命名**目标最省（不新增 id）；「选项 + 末项兜底输入 + 提交/取消」语义**已存在且已验收**；`#composer` 仍可作兜底输入的**备选**（`#ask-input` 与 `#input` 二者取一，见 ADR-V3-014）；取代面最小 | 结构最干净 | 底区语义不变 |
| 缺点 | `#ask` 从底区迁到主区 → 其既有断言（若有）需台账；两处输入框（`#ask-input` 与 `#input`）需明确「谁是兜底」 | 新增 id 破坏「id 零重命名」的收敛性；重复实现 | **两套卡片**→ 密度翻倍、语义分裂；违反「同一时刻只呈现一张卡」 |
| 风险 | 低 | 中（重复实现 + 密度失控） | 高 |
| 工作量 | 小 | 中 | 中（但方向错） |

### 3.2 P-V31-02 密度夹具的载体

| 维度 | **方案 A：真实产物 + hermetic 夹具（CDP 加载 `dist/`）** | 方案 B：加载设计稿 HTML 当夹具 | 方案 C：Node 静态分析 |
|------|:--|:--|:--|
| 描述 | Chromium `--load-extension=dist`，经既有 storage key 与既有通道构造三档状态 | 直接测 `design/ui-redesign/option-e-progressive.html` | 解析 `src/ui/sidepanel/index.html` |
| 优点 | 测真实可见性（`hidden` + 真布局）；满足 AC-V3-001~004「实测」 | 与稿件数字一致性天然达成 | 快 |
| 缺点 | 需串行 Chromium（纪律已有） | **测的不是交付物**（设计稿 ≠ 真实产物，R-UI-005）；无法证明真实产物达标 | 假绿（测不到可见性） |
| 风险 | 低 | 高（验收对象错位） | 高 |
| 工作量 | 中 | 低 | 低 |

> 说明：设计稿**仍要测**，但只用于**口径同源对账**（阶段 A），**不作为**验收依据。

### 3.3 P-V31-03 「首装态」与「风险态」的档位边界（spec 未覆盖的细节）

| 维度 | **方案 A：首装态 = onboarding ∨ discovery-notice 生效；风险态 = 五类任一；二者叠加时取「风险态」** | 方案 B：另立「首装 + 风险」第四档 | 方案 C：叠加时取「较宽者之和」 |
|------|:--|:--|:--|
| 描述 | 档位互斥的**优先级**：风险 > 首装 > 默认 | 新档 `firstRun+risk` | 上限相加 |
| 优点 | 档位数 = spec 的 3 档（不发明新档）；最坏情形（首装 + 风险）落到风险档（更宽）→ **不会假 FAIL** | 语义最精确 | 宽松 |
| 缺点 | 首装 + 风险叠加时的余量被风险档吸收（需在基线文档登记该判定） | **发明 spec 未定义的档**（需征得作者/编排器） | 会掩盖问题（上限虚高） |
| 风险 | 低 | 中（越权造需求） | 中 |
| 工作量 | 低 | 中 | 低 |

---

## 4. 推荐方案

| 开放点 | 推荐 | 理由 |
|--------|------|------|
| P-V31-01 决策卡 | **方案 A**（复用 `#ask` 家族并迁入 `#l0-decision`） | 唯一能同时保住「id 零重命名」「无常驻输入框」「末项兜底输入」三条的做法；详见 ADR-V3-014 |
| P-V31-02 夹具 | **方案 A**（真实产物 + hermetic 夹具） | AC-V3-001~004 要求「实测」；设计稿只用于口径同源对账 |
| P-V31-03 档位边界 | **方案 A**（风险 > 首装 > 默认 的优先级） | 不发明 spec 未定义的档；最坏情形落到更宽的档 → 不假 FAIL |

**本叶开放点裁决（V31-O-1~4，逐条落定）**：

| # | 开放点 | 裁决 | 落点 |
|---|--------|------|------|
| V31-O-1 | 「首装态 ≤9 / ≤20」为 spec 新建档，需首轮实测校准（只允许收紧） | 首轮实测后写入 `docs/v3-density-baseline.json`（三视口逐格值 + 日期 + 来源）；**校准只允许下调**（更严）；若实测超 9/20 → **改披露策略**（把 onboarding / discovery-notice 的说明文案收进 L1，只留摘要/计数 + 入口），**不得**放宽阈值 | ADR-V3-015 / ADR-V3-018 |
| V31-O-2 | 密度门禁的实现载体 | **三段式**（父 ADR-V3-003 + 本叶 ADR-V3-015 的落地细化）：口径单源 + Chromium 门禁 + 无 Chromium 常量门禁 | ADR-V3-015 |
| V31-O-3 | L0 骨架与 v1 三区 flex 布局的最小改动路径 | **不新增包裹层**（父 ADR-V3-001 方案 B）：`#l0-decision` 作为 `#panel-main` 内 `#log` 的兄弟（`flex:0 0 auto`）；`#risk-rail` / `#l0-statusbar` 直挂 `body`；`#composer` 仅改为默认 `hidden`（末元素契约保持） | ADR-V3-013 / ADR-V3-017 |
| V31-O-4 | 风险位「独立分区」与既有 54 个 `id` 的归属映射 | 逐项映射见父 ADR-V3-009 第 2 条 + 本叶 ADR-V3-017（含 `l0` 区域归属表与「谁进 L1」清单） | ADR-V3-017 |

---

## 5. 文件影响分析

| 操作 | 文件路径 | 说明 |
|:--:|------|------|
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/shell.ts` | L0 骨架渲染：状态带 + 决策卡挂载 + 引用条 + 状态栏（三件事三区） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/decision-card.ts` | 唯一决策卡：`#ask` 家族复用 + ≤2 推荐 + 「更多选项（还有 N 个）」真值计数 + 末项兜底展开 |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/risk-rail.ts` | 五类风险行唯一模板（三通道 + 只读投影 + 文本非空校验 + `#risk-rail` 唯一写入者） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/l0/status-bar.ts` | 一行状态栏 + L2 入口面板骨架（≤4 入口 + 计数占位，v3-3 填真值） |
| NEW | `packages/web-cli-plugin/src/ui/sidepanel/disclosure.ts` | 折叠器单一控制器：`hidden` + `aria-expanded`/`aria-controls` 成对 + `COLLAPSIBLE_TARGETS` 白名单（`assertFoldable` 抛错）+ 展开态记忆（`Map`）+ `window.__v3.disclosure` |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/index.html` | 追加 `#risk-rail` / `#l0-decision` / `#l0-statusbar` / `#view-host`（占位）标记与样式；`#ask` 家族迁入 `#l0-decision`；`#composer` 加 `hidden`；`#topbar` 家族保留 id 但默认收进 `[data-l1-panel]`；**保留** `body{display:flex}` / 三区文档序 / `#panel-bottom{flex:0 0 auto}` / `#composer` 末元素 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | 追加 `l0/*` 与 `disclosure` 的挂载与状态联动（**既有 render / handler 零删改**） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/view-model.ts` | 追加 L0 视图模型（三件事 + 决策卡 + 风险行 + 计数占位；纯函数，node 可测） |
| NEW | `packages/web-cli-plugin/test/ui/density-metrics.mjs` | **密度口径唯一实现源**（C1~C4 测量源码 + 阈值 + 视口 + 档位 + 归属判定 + 纯判定函数） |
| NEW | `packages/web-cli-plugin/test/ui/density.mjs` | 密度门禁（Chromium；阶段 A 稿件同源 / B 九格 / C 风险子场景 / D 反作弊 / E 汇总表；`--reverse RP-V3-01..04`） |
| NEW | `packages/web-cli-plugin/test/ui/_v3-helpers.mjs` | v3 门禁自带 helper（`connectCdp` / `evaluate` / `waitFor` / `realBox` / `realClick` / `check` / `launch`） |
| NEW | `packages/web-cli-plugin/test/ui/l0.mjs` | L0 门禁：骨架三件事可见 + 决策卡唯一 + 「更多选项」计数同源 + 无常驻输入框 + 风险位 5×2（AC-V3-008/009）+ 可发现性（AC-V3-010）+ 320/400 常驻元素集合相等（AC-V3-021）+ L0 四区互不遮挡 + `#log` 唯一滚动容器 + 展开态 composer 贴底 |
| NEW | `packages/web-cli-plugin/test/density-thresholds.test.ts` | 无 Chromium：阈值逐字 / 矩阵规模 9 / C1 选择器集合 / 测量源码禁用函数零命中 / `index.html` 静态结构（分区不互串 + 54 id 保留 + `#risk-rail` 祖先闭包）/ RP-V3-02(a) 纯函数反证 |
| NEW | `packages/web-cli-plugin/test/supersession-ledger.test.ts` | 取代台账门禁：hunk ↔ 台账映射 + `protectedRanges` hash + `countMethod` 校验 + `gateFloors` 下界 + `--files-override`（供 RP-V3-05） |
| NEW | `packages/web-cli-plugin/test/l0-disclosure.test.ts` | 纯单测：`disclosure` 白名单抛错（`#risk-rail` 被拒）+ ARIA 成对 + 展开态记忆往返 + 破坏性选项进折叠池被拒 |
| NEW | `packages/web-cli-plugin/docs/v3-supersession-ledger.json` | 取代台账（本叶建立：`counts` / `gateFloors` / `protectedRanges` / `modifiedRanges` / `entries` / `zeroDiffFiles`） |
| NEW | `packages/web-cli-plugin/docs/v3-density-baseline.md` | 首轮真实产物密度基线（人读：三档 × 三视口实测值 + 日期 + 来源 + 与设计稿口径**分列**） |
| NEW | `packages/web-cli-plugin/docs/v3-density-baseline.json` | 同上的机器可读版本（门禁读取并断言「实测 ≤ 阈值」且「基线只允许收紧」） |
| MODIFY | `packages/web-cli-plugin/package.json` | 追加 scripts：`test:density` / `test:l0` / `test:supersession` / `test:v3`（**依赖零新增**） |
| MODIFY | `packages/web-cli-plugin/test/ui/journey.mjs` | **仅 1 处**：`#15c`（composer 贴底）→ 兜底展开态下的同义断言（同编号 + `modifiedRanges` 声明）；其余字节零改 |
| MODIFY | `packages/web-cli-plugin/test/ui/binding.mjs` | 自由文本入口相关（`#6a` / `#6` / `#6l`）**同编号前置展开步骤**（`await revealFallbackInput()`）；`#21*`/`#22*` 区域字节零改（`protectedRanges` hash pin） |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | 若 `sidepanel.js` 超 ceiling → 显式重登记（前后值 + 日期 + 来源 + 理由 + 历史保留）；否则**零改动** |

**明确不改**：`manifest.json` · `src/security/**` · `src/content/**`（三文件内容 hash 不变） · `packages/web-cli-base/**` · `options.html` · `design/**` · v1/v2 SDDU 目录 · `ROADMAP.md` · 依赖段。

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|----------|
| **R31-01 默认档实测 > 7 可点**（L0 收窄不彻底，尤其 `#panel-top` 家族与状态栏入口） | 中 | 高 | 按 §2.2 逐项配平表实现；`test/ui/density.mjs` 阶段 B 首格即 FAIL 暴露；修复方向**只能是改披露策略**（把元素收进 L1/L2 或合并摘要），**禁止**放宽上限 / CSS 隐身（EC-V3-010） |
| **R31-02 决策卡迁移打破既有断言**（`#ask` 家族与 `#composer` 默认 `hidden`） | 中 | 高 | id 零重命名（S5）；binding 自由文本相关**同编号前置展开**；journey `#15c` 同编号改写 + 台账；`test/supersession-ledger.test.ts` 强制 hunk 命中 |
| **R31-03 风险位被折叠（腐化）** | 中 | 极高 | 父 ADR-V3-006 的三层结构保证 + AC-V3-008 5×2 断言 + RP-V3-04 反证；`l0-disclosure.test.ts` 的白名单抛错单测 |
| **R31-04 密度门禁假绿 / 口径漂移** | 中 | 极高 | 父 ADR-V3-003/004/005 全量落地；阶段 A 稿件同源对账；RP-V3-01~04 实跑（FAIL→还原→PASS 全日志）；`density-thresholds.test.ts` 静态堵后门 |
| **R31-05 `sidepanel.js` 超 ceiling** | 高 | 中 | 静态骨架落 html；逻辑复用既有 view-model；如实测超限 → 本叶内显式重登记（ADR-V3-011）；**禁止**放宽容差 / 删断言 |
| **R31-06 首装态 ≤9/≤20 不达标** | 中 | 中 | 首轮实测登记（只允许收紧）；超限则把说明文案收进 L1（保留摘要/计数 + 入口）；**禁止**放宽档位 |
| **R31-07 夹具不幂等导致格间串扰（假 FAIL / 假绿）** | 中 | 中 | 每格 `resetFixture()`（重载 + 清桩）；driver 打印每格状态指纹（授权态 / 探测态 / 展开态）便于复核 |
| **R31-08 门禁并发 OOM（本机 ~1.5GB）** | 中 | 高 | `test:v3` 串行链；单 Chromium 实例、单 page target、逐格顺序执行；日志全量落盘（禁 tail） |
| **R31-09 台账在 v3-1 建立时误把 v1/v2 的历史行计入 diff** | 中 | 中 | `base` 明确为 `c2c0e0d`（本轮起点）；`protectedRanges` 以**字节 hash** 而非行号锚定；创建台账时只登记本叶改动 |

### 交付门槛（本叶，收尾必须全绿且串行）

| 门禁 | 断言要点 |
|------|---------|
| `npm run typecheck`（tsc） | 0 error |
| `npm test`（插件单测，含新增 3 个 node 测试） | 全绿；`test(` 计数 ≥ 既有下界 646（只增） |
| `npm run test:density` | 阶段 A~E 全绿；9 强制格 + 15 登记格达标；增量归属 0 违规 |
| `node test/ui/density.mjs --reverse RP-V3-01/02/03/04` | 每条 FAIL → 还原 → PASS，日志完整 |
| `npm run test:l0` | L0 骨架 / 决策卡 / 无常驻输入框 / 风险位 5×2 / 可发现性 / 320-400 等价 / 几何契约全绿 |
| `npm run test:supersession` | hunk 全部命中台账；`protectedRanges` hash 不变；计数下界满足；**RP-V3-05 实跑 FAIL** |
| `npm run test:ui` / `test:insight` / `test:binding` / `test:hardening` | journey ≥167（`#15c` 同编号改写已登记）；insight union ≥108；binding ≥192；hardening 24 |
| `npm run test:e2e` | PASS |
| 体积 | `content.js` ≤ 177,076（无容差）；`sidepanel.js` ≤ ceiling（超则本叶内显式重登记 + 反证复跑） |
| 零改动核对 | `manifest.json` / `src/security/**` / `src/content/**`（三 hash）/ `packages/web-cli-base/**` / `options.html` / `design/**` 零 diff |
| 人工面 | 主题观感 / 动画体感 / 窄栏真实体感 → 登记「**未执行**」（不冒充 PASS） |

---

## 7. 生成的 ADR

> 本叶产出 **ADR-V3-013~019**（7 个），与父 `ADR-V3-001~012` / 其余三叶 `ADR-V3-020~036` / v1 `ADR-001~018` / v2 `ADR-V2-001~033` **零编号冲突**。状态 = ACCEPTED。

| ADR | 标题 | 状态 |
|-----|------|:--:|
| ADR-V3-013 | L0 常驻骨架 = 三件事三区 + 逐项可点预算配平 + 常驻分区（C4）登记 | ACCEPTED |
| ADR-V3-014 | 决策卡 = 复用 `#ask` 家族（唯一一张卡）+ ≤2 推荐 + 「更多选项（还有 N 个）」真值计数 + 末项兜底输入（`#ask-input` 与 `#composer` 的取舍） | ACCEPTED |
| ADR-V3-015 | 密度门禁在 L0 侧的落地：口径单源三段式 + 夹具矩阵（9 强制格 + 15 登记格）+ 反证与反作弊驱动 | ACCEPTED |
| ADR-V3-016 | 折叠器契约 = `disclosure.ts` 单一控制器（白名单抛错 + `hidden` + ARIA 成对 + 展开态记忆 + `window.__v3.disclosure`） | ACCEPTED |
| ADR-V3-017 | 54 个 `id` 的归属映射表（L0 / L1 / L2 三分 + 「谁进 L1」清单）与 `#panel-top` 收窄路径 | ACCEPTED |
| ADR-V3-018 | 首轮真实产物密度基线登记（三档 × 三视口 + 与设计稿口径分列 + 只允许收紧 + C4 变化登记） | ACCEPTED |
| ADR-V3-019 | 本叶取代策略（journey `#15c` 同编号改写 / binding 自由文本同编号前置展开 / insight 几何 3 条 union 迁移 / 台账建立） | ACCEPTED |

### ADR-V3-013: L0 常驻骨架 = 三件事三区 + 逐项可点预算配平 + 常驻分区（C4）登记

## 状态
ACCEPTED（承编排器 D5 三层模型 + 父 ADR-V3-001 / ADR-V3-005）

## 背景
现状默认首屏 `#panel-top` 一个区就有 **≥12 个可点元素**；若只做「折叠其余区」而不收窄顶部，默认档 ≤7 永远不成立。同时 v1 三区 flex 契约（文档序 / `#log` 唯一滚动 / `#composer` 末元素 / `#panel-bottom{flex:0 0 auto}`）不得破坏。

## 决策
1. **三件事三区**（默认态同时可见）：
   - ①**我在哪** + ②**谁在管我** → `#panel-top` 收窄为**状态带**（`#l0-status-band` **唯一可点**，内含 origin / 站点名 / 状态点 / 策略档徽标 / LLM 徽标，均为**只读文本**）；点开 = L1 状态与连接详情（承载原 `#topbar` 家族）。
   - ③**下一步做什么** → `#l0-decision`（`#panel-main` 内 `#log` 的兄弟，`flex:0 0 auto`）：唯一一张决策卡（`#ask` 家族）+ 「从页面拾取」入口 + 引用条（`#l0-ref-toggle`）。
   - 另加：`#l0-statusbar`（`body` 直挂，一行，含 L2 计数摘要，点开 = 入口面板）；`#risk-rail`（`body` 直挂，独立分区，**永不折叠**）。
2. **可点预算配平（默认档 = 7，逐项固定）**：`#l0-status-band` / `#l0-pick` / 推荐选项 ×2 / `#l0-more` / `#l0-ref-toggle` / `#l0-statusbar` = **7**。任何新增常驻可点 → 密度门禁 FAIL（**只能改披露策略**，不得放宽上限）。
3. **`#panel-main` 内布局**：`#l0-decision`（`flex:0 0 auto`）+ `#log`（`flex:1 1 auto`，唯一滚动容器）+ `#scroll-bottom` / `#tree-fab` / `#tree-drawer` 保留；`#view-host`（v3-3 使用）作为 `#log` 的**兄弟**默认 `hidden`。
4. **C4（常驻分区数）登记**：默认态预期 `body` 一级子元素非 `hidden` 数 = **5**（`#panel-top` / `#risk-rail` / `#panel-main` / `#panel-bottom` / `#l0-statusbar`；`#view-host` 与 `#settings-view` 默认 `hidden` 不计）。**不设上限**，只登记 + 反作弊；注释必须写明「真实产物分区数可能高于 D 稿，因风险位独立成区」。
5. **320px**：`#panel-top` / `#risk-rail` / `#l0-statusbar` 允许 `flex-wrap`；origin 省略号截断（`title` + 点击可看全文，经 `#l0-status-band` 展开）；**不删任何常驻元素**（320 与 400 的常驻 id 集合相等）。

## 后果
- 默认档 7 可点有了「逐项可追溯」的配平依据；任何第七条之外的可点都会被门禁抓住。
- 三区文档序与 `#composer` 末元素契约保留 → 布局类取代面最小。
- `#l0-decision` 占据主视觉必然压缩 `#log` 高度 → 触发 ADR-V3-019 的几何契约迁移（父 ADR-V3-009 第 3 条的落地）。

### ADR-V3-014: 决策卡 = 复用 `#ask` 家族（唯一一张卡）+ 真值计数 + 末项兜底输入取舍

## 状态
ACCEPTED

## 背景
D4② 要求「每回合 = **一道选择题**，选项数 ∈[2,5]，**末项固定「其他…（我来描述）」**」；FR-V3-013 要求默认态**无常驻输入框**；FR-V3-012 要求选中末项后**就地展开兜底输入框**，提交/取消后回 `hidden`。v1 已存在 `#ask`（`#ask-prompt` / `#ask-options` / `#ask-input` / `#ask-submit` / `#ask-cancel`）与 `#composer` / `#input` 两套输入相关 DOM。

## 决策
1. **决策卡 = `#ask` 家族**（迁入 `#l0-decision` 直系）：`#ask` 为卡容器、`#ask-prompt` 为问题、`#ask-options` 内渲染 **2~5 个选项**（其中 ≤2 为推荐、其余进「更多选项」）、`#ask-input` 为**末项兜底输入**、`#ask-submit` / `#ask-cancel` 为提交/取消。**不新造 id**。
2. **同一时刻只呈现一张卡**：`view-model` 保证当前回合唯一（上一回合整体 `hidden` 并进入「已决策 N 步」的 L1 历史位）；门禁断言默认态决策卡数 = 1。
3. **推荐选项 ≤2 + 「更多选项（还有 N 个）」**：非推荐选项数 N **从真值派生**（`options.filter(o => !o.recommended).length`，`kind='destructive'` 的先剔除到不可折叠位）；门禁双向断言（改真值 → N 变；硬编码即 FAIL）。
4. **末项文案逐字**「其他…（我来描述）」；选中后 `#ask-input` 所在容器移除 `hidden`、`#ask` 的对应触发器置 `aria-expanded="true"`；提交/取消后回 `hidden` 并把 `aria-expanded` 复位（与 E 稿 `sendInline` / `cancelInline` 行为一致）。
5. **`#composer` / `#input` 的处置（关键取舍）**：`#composer` **默认 `hidden`**（满足 FR-V3-013），且**不再承担**「末项兜底输入」角色；`#input` 保留为**长文本/多行兜底的备用通道**（由 `#ask-cancel` 旁的次级入口在**兜底态内**提供，语义为「改用完整输入」）。取舍理由：① 复用 `#ask-input` 语义最贴近 FR-V3-012（就地展开、就地收起）；② `#composer` 作为底区末元素必须保留（布局契约），若同时承担兜底输入会让「兜底」出现在底区而非**就地**，违反 FR-V3-012 的「就地展开」字面。**代价**：binding 的 `#6a`/`#6`/`#6l`（真实键入 `#input` 跑通一轮）需**同编号前置展开**（先展开兜底态 → `#input` 可见）→ 逐条台账（ADR-V3-019）。
6. **`#confirm` 家族** 落在 `#l0-decision` 直系、**不参与折叠**；破坏性确认选项数全部直接可见（FR-V3-018 / EC-V3-015）。

## 后果
- 「无常驻输入框」与「兜底输入可用」同时成立，且不新增 id / 不新增组件。
- 「更多选项」计数与真值同源，可被门禁双向验证。
- binding 的 4 条自由文本断言成为**受控改写**（同编号 + 台账），并在 `protectedRanges` 之外。

### ADR-V3-015: 密度门禁在 L0 侧的落地（口径单源三段式 + 夹具矩阵 + 反证与反作弊）

## 状态
ACCEPTED（承父 ADR-V3-003 / 004 / 005，本叶负责落地）

## 背景
父 plan 已定「唯一实现源 + 三段落点 + 反证驱动」的总原则；本叶是密度门禁的**唯一实现与首次落地叶**（v3-2/v3-3/v3-4 复用同一门禁与基线）。

## 决策
1. **文件与脚本**：`test/ui/density-metrics.mjs`（口径单源）+ `test/ui/density.mjs`（Chromium，`npm run test:density`）+ `test/density-thresholds.test.ts`（无 Chromium，纳入 `npm test`）+ `test/ui/_v3-helpers.mjs`（自带 helper）。`npm run test:v3` = 串行链（`&&`），日志全量 `tee` 到 `/tmp/opencode/v3-gate-logs/`。
2. **测量根与口径注释**：`document.body`；`density-metrics.mjs` 头部注释必须写明「设计稿 `#panel` ≙ 真实产物 `document.body`（语义等价断言见 `density-thresholds.test.ts`）+ 反直觉事实（分区数可能高于 D 稿）」。
3. **矩阵**：阶段 B（`default` / `firstRun` / `risk` × 320/400/520 = 9 强制格，每格 C1 + C2 + 稳定键存在性）；阶段 C（5 风险子场景 × 3 视口 = 15 登记格 + 增量归属强制判定）。
4. **反证**：`--reverse RP-V3-01`（注入 +1 可点 → 必 FAIL → 还原 → 必 PASS）；`--reverse RP-V3-02`（(a) 纯函数层在 `density-thresholds.test.ts`；(b) 临时副本改 `7→6` → 必 FAIL → 校验原文件 sha256 未变）；`--reverse RP-V3-03`（CSS 隐身 4 变体计数不降 + `hidden=true` 必降 1）；`--reverse RP-V3-04`（风险行移入 `hidden` 容器 → AC-V3-008 必 FAIL）。**四条都必须实跑并留 FAIL→还原→PASS 全日志**（禁 tail 截断）。
5. **反作弊**：`visibleIn()` 单点实现（仅 `hidden` 豁免）；静态断言测量源码零命中 `getComputedStyle` / `offsetParent` / `getBoundingClientRect`；无稳定键（无 `id` 且无 `data-key`）的可见元素 → **直接 FAIL**（强制实现约定）。
6. **基线登记**：首轮实测写入 `docs/v3-density-baseline.{md,json}`（三档 × 三视口 + 日期 + 来源 + 与设计稿口径分列）；后续任何变更只允许**收紧**（放宽必须由作者/编排器裁决 + 显式登记 + 历史保留，NG-V3-010）。

## 后果
- 密度从「观感」变成「可复算 + 可 FAIL」的事实（本 Feature 的核心验收 D7 / AC-V3-001~007 落地）。
- 常数级反证（RP-V3-02a）无需 Chromium 即可跑 → 1.5GB 机器上的快速反馈通道。
- v3-2/v3-3/v3-4 无需重复实现口径，只需调用同一门禁（复用入口在 `_v3-helpers.mjs` 里以 `runDensityMatrix({tiers})` 形式提供）。

### ADR-V3-016: 折叠器契约 = `disclosure.ts` 单一控制器

## 状态
ACCEPTED（承父 ADR-V3-006 / ADR-V3-008）

## 背景
L1/L2 的展开必须「同一套语言」（E 稿法则 6）、收起必须用 `hidden`（FR-V3-024）、`aria-expanded`/`aria-controls` 必须成对、展开态要有记忆（FR-V3-023）、风险位**绝不能**被折叠（D3）。若把折叠逻辑散落到各处（`sidepanel.ts` 里到处写 `el.hidden = !el.hidden`），上述四条必然被腐化。

## 决策
1. **唯一入口**：`disclosure.ts` 导出 `createDisclosure({ targets, memory })`，提供 `toggle(id)` / `open(id)` / `close(id)` / `collapseAll()` / `isOpen(id)`；所有折叠触发器（`[data-disclose]` 属性标记）只经此控制器。
2. **目标白名单**：`COLLAPSIBLE_TARGETS` = 常量数组（L1 面板 + L2 入口面板 + 更多选项池 + 历史位），**不含** `#risk-rail`；`assertFoldable(node)` 对白名单外节点**抛错**（`#risk-rail` / `#confirm` / `#l0-decision` 本体）。
3. **状态表达**：收起 = 目标 `hidden = true` + 触发器 `aria-expanded="false"`；展开 = 反之。**成对校验**：控制器每次操作后断言 `triggers[id]` 与 `targets[id]` 的 ARIA 一致性（不一致即抛错）。
4. **展开态记忆**：内存 `Map<string, boolean>`（不落盘；EC-V3-007 允许在扩展重载/SW 休眠后重置，但**必须**在状态栏/回执中可见，不静默）；`snapshot()` / `restore(map)` 供 L2 往返（FR-V3-023 / FR-V3-047）与 v3-2 / v3-3 复用。
5. **测试钩子**：`window.__v3.disclosure` 暴露上述 API（供 v3 门禁驱动 `collapseAll()` 等；**只读语义**，不暴露内部可变结构）。
6. **单测**：`test/l0-disclosure.test.ts`（纯 node）断言白名单抛错、ARIA 成对、记忆往返、`collapseAll()` 后风险位不受影响（与 `#risk-rail` 无关）。

## 后果
- 「风险位永不折叠」获得运行时结构性保证（父 ADR-V3-006 第 2 条的落地）。
- L1/L2 与 v3-4 的展开语言统一（叶间契约之一，父 ADR-V3-010 第 3 条）。
- 代价：控制器是 L0 的关键路径，必须最先落地且单测充分（v3-2/v3-3 强依赖）。

### ADR-V3-017: 54 个 `id` 的归属映射表与 `#panel-top` 收窄路径

## 状态
ACCEPTED（父 ADR-V3-009 的落地细化）

## 背景
`#panel-top` 一个区就有 ≥12 个可点；54 个 id 必须全部保留；「谁进 L1、谁留 L0、谁进 L2」若不逐项列表，实现期必然出现「临时留在 L0 的元素」把密度预算吃掉。

## 决策
1. **三分归属表（逐项，实现期不得偏离）**：

| 层 | 容器 | id 清单 |
|----|------|--------|
| **L0（常驻）** | `#panel-top` | `#panel-top` · `#status` · `#llm-status` · `#session-label` · `#llm-test-result` |
| **L0（常驻）** | `#l0-decision` | `#ask` · `#ask-prompt` · `#ask-options` · `#ask-input` · `#ask-submit` · `#ask-cancel` · `#confirm` · `#confirm-summary` · `#confirm-allow` · `#confirm-deny` · 新增 `#l0-pick` / `#l0-more` / `#l0-ref-toggle` |
| **L0（常驻）** | `#panel-main` | `#panel-main` · `#log` · `#scroll-bottom` |
| **L0（常驻）** | `#panel-bottom` | `#panel-bottom` · `#env-guard` · `#site-hint` · `#site-hint-title` · `#site-hint-detail` · `#site-hint-action` · `#onboarding` · `#discovery-notice` · `#discovery-title` · `#discovery-detail` · `#notice` · `#send-reason` · `#consent-slot` · `#composer` · `#input` · `#send` |
| **L1（就地展开）** | `[data-l1-panel="l1-status"]` | `#topbar` · `#open-settings` · `#authorize` · `#more-actions` · `#revoke` · `#rebind` · `#audit` · `#audit-count` · `#session-box` · `#session-list` · `#group-name` · `#group-create` · `#group-select` · `#group-add` |
| **L1（就地展开）** | `[data-l1-panel="l1-more"]` 等（v3-2 扩展） | 「更多选项」其余项 / 后果说明 / 引用证据 / 局部树 / 已决策历史 / 回执证据 / 手势表（v3-2 落位） |
| **L2（按需视图）** | `#view-host` | `#tree-fab` · `#tree-drawer`（全局连接树视图）· `#settings-view` 家族（设置视图）（v3-3 落位） |
| **新增（L0 容器）** | `body` 直挂 | `#risk-rail` · `#l0-statusbar` |
| **新增（L2 宿主）** | `#panel-main` 内 | `#view-host`（默认 `hidden`） |

2. **`#panel-top` 收窄路径（三步，可逐步验证）**：① 新增 `#l0-status-band`（唯一可点）并保留原文本节点；② `#topbar` 整体迁入 `[data-l1-panel="l1-status"]`（默认 `hidden`）；③ 门禁断言默认档 `#panel-top` 子树内可点 = 1。
3. **`id` 零重命名硬规则**：任何 `id="…"` 的值不得变化（`density-thresholds.test.ts` 断言 `index.html` 的 id 集合 ⊇ v1 的 54 id 集合；改名即 FAIL）。
4. **`#session-list` / `#group-select` 等原生控件**：迁入 L1 后仍为 `select` / `input`（**不得**替换为自绘控件，避免语义与既有断言漂移）；其可点身份只在 L1 展开态计入。

## 后果
- 「谁进哪一层」成为可核验清单，避免实现期的临时妥协吃预算。
- 密度预算的逐项配平（ADR-V3-013）由本表支撑：默认档 L0 可点 = 7。
- `#session-box` 等 L1 内控件在展开态被计入（属「L1 展开态」而非默认档，不违反默认档预算）。

### ADR-V3-018: 首轮真实产物密度基线登记（三档 × 三视口 + 分列 + 只允许收紧）

## 状态
ACCEPTED（承父 spec §9.4 + A-UI-001 + 父 ADR-V3-011 第 4 条）

## 背景
A-UI-001 明确：设计稿数字（80→7 / 4,870→321）出自自包含单文件模拟，**不等于**真实产物口径；spec 要求「首轮真实产物复测必须把实测值登记为基线，并与设计稿口径数字**分开记录**」。首装态档（≤9/≤20）还是 spec 新建档（设计稿未覆盖）。

## 决策
1. **登记载体（两份，机器可读 + 人读）**：
   - `docs/v3-density-baseline.json`：`{ measuredOn, source（dist/sidepanel.html + 构建命令）, tiers: { default: {320:{clickables,lines,blocks,regions}, 400:{…}, 520:{…}}, firstRun: {…}, risk: {…, subs: {unauthorized:{…}, probing:{…}, hardline:{…}, confirm:{…}, staleRef:{…}}}}, designDraft: { e: {7,10,47,6}, d: {80,144,391,5} }, notes }`；
   - `docs/v3-density-baseline.md`：同内容的人读版 + 口径说明 + **两条硬规则**（只允许收紧；放宽需作者/编排器裁决 + 显式登记 + 历史保留）。
2. **门禁读取基线**：`test/ui/density.mjs` 读 `docs/v3-density-baseline.json` 并断言 ① 每格实测 ≤ 对应档上限；② 若某格实测值**低于**已登记基线，**必须**更新基线（收紧）并留痕；若**高于**已登记基线但仍在阈值内，则**允许但必须登记**（`warning` 级，记入日志报告）。
3. **C4 变化登记**：记录 `regions`（默认 / 首装 / 风险三档各自值），只登记不上限；报告中必须打印「分区数变化 ≠ 密度变差」的说明（防止误用）。
4. **首装态首轮校准**：首次实测若超 ≤9/≤20 → **必须改披露策略**（把说明文案收进 L1，保留摘要/计数 + 入口）后重测；**不得**改阈值。若实测显著低于阈值（如 7/14）→ 只登记，不反向放宽。
5. **与父 plan §2.9 的体积基线分开**：密度基线落 `docs/v3-density-baseline.*`；体积基线落 `test/size-baseline.ts`；**不得混写**。

## 后果
- 「设计稿口径」与「真实产物口径」两列数字永久分列，可交叉复算（A-UI-001 闭合）。
- 基线成为后续三叶的**共同判据**（任何回归立即 FAIL）。
- 首装态档的实测校准有据可查（V31-O-1 闭合）。

### ADR-V3-019: 本叶取代策略（同编号改写 / 前置展开 / union 迁移 / 台账建立）

## 状态
ACCEPTED（承父 ADR-V3-007）

## 背景
本叶改动面 = 侧栏侧 + 新增门禁；取代量在本 Feature 中**最小**，但 `#composer` 默认 `hidden` 与 `#l0-decision` 挤占主视觉**必然**打破 3 类既有断言（journey `#15c`、binding 自由文本、insight 几何）。

## 决策
1. **台账在本叶建立**：`docs/v3-supersession-ledger.json` 首次写入 `counts`（journey 167 / insight 108 / binding 192 / sidepanelView 38 / nodeTestLowerBound 646，`countMethod = 'runtime-check-calls'`）、`gateFloors`、`zeroDiffFiles`（暂无）、`protectedRanges`（`binding.mjs` 的 `#21*`/`#22*` 区段、`journey.mjs` 的 `#15a~#15q` 区段）与 `entries[]`（本叶条目见下表）。
2. **本叶逐条处置**：

| # | 文件 | 旧 | 新 | 方式 |
|---|------|----|----|------|
| V31-S1 | `test/ui/journey.mjs` | `#15c`：`#composer` 贴底（默认态） | `#15c`：**兜底展开态**下 `#composer` 贴底（`gap ∈ [0,+12]`）且未被常驻区遮挡 | **同编号改写**（行区间入 `modifiedRanges`） |
| V31-S2 | `test/ui/binding.mjs` | `#6a` / `#6` / `#6l`：`realClick('#input')` → 键入 → 发送 | 前置 `await revealFallbackComposer()`（末项兜底展开）后**同断言不变** | 同编号**前置展开** |
| V31-S3 | `test/ui/insight.mjs` | `checkLayout()` 的 `logFlexGrow==='1'` / `logClientHeight ≥ 589` / `logRatio ≥ 65.0` | 迁移为 `test/ui/l0.mjs` 的：L0 四区两两交面积 = 0（6 组）/ `#log` 唯一滚动容器 / `#log` clientHeight ≥ **首轮实测下界** / 兜底展开态 composer 贴底 | old→new 逐条登记 + **union 计数**（insight 108 口径） |
| V31-S4 | 新增 | — | `test/ui/l0.mjs` / `test/ui/density.mjs` / `test/density-thresholds.test.ts` / `test/l0-disclosure.test.ts` / `test/supersession-ledger.test.ts` | 新断言（计数只增） |
| V31-S5 | 安全 / 硬底线 | 既有 | **保持不变**（本叶不碰判定链；新增只读投影的反向断言：`#risk-rail` 内「允许 / 放行」控件计数 = 0） | 只增 |

3. **`journey.mjs` 其余部分**：**字节零改**（`zeroDiffFiles` 不列入，因为已有 1 处受控改写；但 `protectedRanges` 覆盖 `#15a`~`#15q` 区段，除 `#15c` 那一行外的字节 hash 必须不变）。
4. **反证**：RP-V3-05（复制 `test/ui/l0.mjs` 删 1 条 `check` → 门禁必须 FAIL）在本叶收尾实跑。

## 后果
- 取代全部可追溯（hunk ↔ 台账），「零删除、零降级」可机器核验。
- insight 的几何契约迁移采用**增强式替代**（父 ADR-V3-009 第 3 条），比原公式更直接约束「不被挤压 / 无遮挡」。
- 台账自本叶起成为跨叶共享资产（v3-2/v3-3/v3-4 只追加条目，不改 schema）。

---

## 8. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V3-1「L0 骨架与密度门禁」技术方案，ADR-V3-013~019）。**范围**：L0 三件事三区 + 可点预算逐项配平（默认档 7）+ `#panel-top` 收窄路径 + 五类风险位（结构保证 + AC-V3-008/009 实现）+ 决策卡（复用 `#ask` 家族 + 末项兜底输入 + 真值计数）+ `disclosure.ts` 单一控制器 + **密度口径单源与三段式门禁（9 强制格 + 15 登记格 + RP-V3-01~04）** + **本叶建立取代台账** + 首轮真实产物密度基线登记（三档 × 三视口，与设计稿口径分列）。**裁决**：V31-O-1（首装态首轮校准只允许收紧）/ V31-O-2（三段式载体）/ V31-O-3（不新增包裹层，最小改动路径）/ V31-O-4（54 id 归属映射表）。**不做**：L1/L2 内容、页面侧交互、放宽任何上限、改 `src/content/**`·`manifest.json`·`src/security/**`。**只做 plan**：未写 tasks/代码、未改源码与测试、未跑门禁/构建/Chromium、未 commit。 | 2026-09-16 | SDDU Plan Agent |


