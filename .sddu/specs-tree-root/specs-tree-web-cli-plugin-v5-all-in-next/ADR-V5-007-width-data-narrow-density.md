# ADR-V5-007: 可拖动宽度的**产品侧落点** + 密度登记格口径解耦（X5）

## 状态
ACCEPTED

## 背景

G 稿把侧栏宽度从「三档（320 / 400 / 520）」改为**连续可拖动 280–640**（ARIA `role="separator"` + `aria-orientation` + `aria-valuenow/min/max`、键盘 `←/→` ±10 · `Home`/`End` · 双击复位 400、clamp、`pointermove` 经 `requestAnimationFrame` 合并），窄屏兜底改 `#panel[data-narrow="true"]`（≤360px）。**本轮实测事实**（决定产品侧落点）：

- `grep -rn "data-width|'320'|panel-w|WIDTH_MIN|三档" src/ui/sidepanel/*.ts src/ui/sidepanel/index.html` = **0 命中** ⇒ **产品侧根本没有宽度切换控件 / 三档 radio**（F 稿的三档切换只存在于设计稿）。
- Chrome 侧栏宽度由**浏览器**控制（用户拖浏览器边缘）；扩展页面无法设置自身宽度。

父 spec §5.9 FR-ALLN-089 是**设计稿契约**（G 127 断言冻结 → `design-contract` 门禁，ADR-V5-008），不是产品 UI 需求；FR-ALLN-090/091 才是产品侧：`data-narrow` 兜底 + 密度登记格口径与宽度解耦（320px 仍为锚点，阈值逐字不动）。R-ALLN-009 / R-ALLN-908。

## 选项

| 选项 | 形态 | 优点 | 缺点 |
|---|---|---|---|
| **A 产品侧 = `data-narrow` + 密度解耦；280–640 拖动作为设计稿契约（不实现产品拖拽）**（选） | 产品只响应真机宽度；`ResizeObserver` 置 `data-narrow` | 与 Chrome 真实行为一致；阈值与 31 登记格逐字/逐格不动；不引入假控件 | 需诚实登记「产品无拖动」 |
| B 产品侧实现 280–640 拖动（面板内拖动手柄改自身宽度） | 「照做设计稿」 | 表面贴合 G 稿 | **Chrome 侧栏宽度不受页面控制** ⇒ 手柄最多改内容宽度（非侧栏宽度）⇒ 假控件 + 与设计稿语义不符；多一套 ARIA/键盘/密度联动 |
| C 产品侧实现三档切换控件 | 可枚举易断言 | — | 产品侧本无此控件（实测 0 命中）；且 X5 是「**删**三档」而非「加」 |

## 决策

**采用 A**。三支落点：

### 1. `data-narrow`（FR-ALLN-090）——产品侧窄屏兜底

- 通过 `ResizeObserver` 监听 `#panel` 实际宽度，置 `panel[data-narrow]`：宽度 **≤360 → `"true"`**、**≥361 → `"false"`**（边界 360/361 逐值断言，EC-ALLN-014/015）。
- 窄屏样式（照 G 稿，仅样式层）：`[data-narrow="true"] .view-btn .view-label { display:none }`；`.site-summary .site-origin { max-width:96px }`；`.site-summary .site-session { display:none }`。
- 320px 零水平溢出 + Tab 序 / `:focus-visible` 不退化（NFR-ALLN-002）。
- **三档 radio 零残留**：产品侧**本就零 radio**（实测）；判据 = 「产品侧零宽度切换控件」扫描（新增断言）+ 设计稿侧由 G 契约断言（ADR-V5-008）。

### 2. 密度登记格口径与宽度解耦（FR-ALLN-091 / 114 / O-007）

- **口径 = 控件计数**（`#panel` 内非 `[hidden]` 子树的 `button/a/input/select/textarea/[tabindex≠-1]`），与视口 / 面板宽度**解耦**：宽度变化只改变**哪些样式生效**，不改变控件数。
- **320px 仍为验收锚点**（不变量测量点，逐格断言保留）；400 / 520 档按等价口径保留或**显式重锚 + 逐格留痕**（`docs/v4-density-baseline.json#tiers`：不删格、不改数值，只追加「宽度 → 控件计数不变」的等价说明 + `v5Ledger`）。
- 阈值 `default 7/15 · firstRun 9/20 · risk 17/35` **逐字不动**；豁免**只认 `hidden`**；`DENSITY_EXCLUDED_SUBTREES = ['#stream']` 单源不动；31 登记格（28 机对 + 3 名义）计数**只增不减**（`registeredCells: 31` 保留，新增 `data-narrow` 边界 2 格与宽度不变性 1 组）。
- `STREAM_HEIGHT_RATIO_MIN = 0.65` **只允许上调**（N6 / NFR-ALLN-001）。

### 3. 诚实登记：280–640 拖动 = 设计稿契约，不是产品 UI

- 280–640 / ARIA separator / 键盘 / clamp / 双击复位 / rAF 合并 = **G 稿契约**（`design-contract` 门禁冻结 127 断言），产品侧**不实现**；
- 在收口文档 / `knownLimitations` 邻域**显式登记**：「产品侧宽度由 Chrome 控制；G 稿拖动手柄为设计演示，产品侧承接的是 `data-narrow` 兜底与密度口径解耦」（避免被误读为「实现偏离设计稿」）。

## 后果

**正面**：产品侧与 Chrome 真实行为一致；阈值 / 31 格 / 高度比**逐字逐格不动**（X5 = **等价重锚**，不是放宽）；不引入假控件（守「法四：无可见常驻输入框」精神）。

**代价 / 风险**：G 稿的拖动交互在产品侧无对应物 ⇒ **必须在文档显式登记**（否则 review/validate 会判「089 未实现」）；`density.mjs`（232）/ `l0.mjs`（244）/ `journey`（171）需等价重锚并按 320/360/361 边界**增**断言。R-ALLN-908（`data-narrow` 与 clamp 边界不一致）由 360/361 双值断言覆盖。

## 影响 FR

FR-ALLN-089（设计稿契约侧）/ 090 / 091 / 114 / 120；NFR-ALLN-001 / 002 / 004；X5；AC-ALLN-013 / 014。

## 回滚

`data-narrow` 的 `ResizeObserver` + 样式块为新增 ⇒ 回滚 = 删除观测器与样式块（`#panel` 回到无 `data-narrow` 状态）；密度台账的 `v5Ledger` 追加留痕（按纪律**只追加不重写**）⇒ 回滚 = 追加一条 `reverted` 说明（不改历史值）。阈值 / 31 格 / 高度比**从未改动**。
