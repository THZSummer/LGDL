# v4 密度基线（31 登记格）— 说明摘要

> **载体**: `docs/v4-density-baseline.json`（机读，唯一判定来源）· 本文件是**可读摘要**，不参与判定
> **口径**: v4-1 换口径重定标（父 ADR-V4-006 / 007 / 020 / 021）——**换口径，非放宽**
> **实测**: 2026-09-19 · `npm run build --workspace @lgdl/web-cli-plugin` → `npm run test:density`
> **登记口径**: `countMethod = runtime-check-calls`

## 1. 口径（单源）

| 项 | 值 | 单一来源 |
|---|---|---|
| 测量根 | `document.body` | `test/ui/density-metrics.mjs#DENSITY_MEASURE_SOURCE` |
| 豁免子树 | `['#stream']` | `src/ui/sidepanel/density-scope.ts#DENSITY_EXCLUDED_SUBTREES`（门禁经 `density-metrics.mjs` 读取并**再断言字面量**） |
| 三区外壳 | `['#region-toolbar','#region-stream','#region-statusbar']` | `density-scope.ts#DENSITY_SHELL_ROOTS` |
| 可见性 | **只认 `hidden`**（`display:none` / `visibility:hidden` / `opacity:0` / `pointer-events:none` / 出视口 / `aria-hidden` 一律不豁免） | `DENSITY_MEASURE_TEMPLATE#visibleIn` |
| C1/C2 | 可点元素 / 可见正文行（`⌈Σ自身直接文本去空白 ÷ 34⌉`） | 同上 |
| 阈值 | `default 7/15` · `firstRun 9/20` · `risk 17/35` | `DENSITY_LIMITS`（**逐字不变**） |
| 防滥用 | 单卡可点 ≤6 · 首屏卡 ≤2 · 欢迎卡 ≤1 且 ≤8 行 | `density-scope.ts` 四常量（门禁读取后判定） |

## 2. 31 登记格（全部实跑，禁推测值）

`9 强制（3 档 × 3 视口；risk 档那一行由 15 个风险子场景格承载）+ 15 风险 + 3 空态 + 3 风险详情展开 + 1 worst = 31`；其中 **28 格由阶段 F 逐格实测机对**，另 3 格（`risk@320/400/520`）是登记口径的**名义格**（由 15 个风险子场景承载，不另立测量）。

| 档 | 320 | 400 | 520 |
|---|---|---|---|
| `default` | C1=5 C2=6 C3=15 C4=4 chars=181 | 同 320 | C1=5 C2=6 C3=15 C4=4 chars=184 |
| `firstRun` | C1=5 C2=6 C3=15 C4=4 chars=184 | 同 | 同 |
| `risk`（5 子场景 × 3 视口） | C1=6 C2=6~7 C3=17 C4=4 chars=203~227 | 同 | 同 |
| `risk.worst` | **C1=6 C2=7 C3=17 C4=4 chars=227** | — | — |
| **`empty`（新增，空态）** | C1=5 C2=6 C3=15 C4=4 **chars=184** | **chars=184** | **chars=187** |
| **`riskDetailOpen`（新增，详情展开）** | C1=6 C2=8 C3=18 C4=4 **chars=239** | **chars=239** | **chars=239** |

- `empty` 档 = `#stream.empty` + `.log-empty-text` 欢迎占位（1 张欢迎卡 / 1 行 ≤ 8 行上限）；
- `riskDetailOpen` 档 = 风险 chip 点击后 `#risk-detail` 可见（`#risk` 上限适用，增量真实存在）；
- `chars` 的 3 字跨视口差 = **审计计数跨位数**（`default` 审计 2→6→10；`empty` 92→96→100 ⇒ 摘要 / `#l2-entry-audit .view-label` / `.badge` 各 +1 字符），〖review 修复轮 I6 实测根因〗**不是**站点摘要 `nowrap + ellipsis`（CSS ellipsis 不改 `textContent`）。容差登记为**实测上界 3**（原 8 已收紧），证据 = `density.mjs#charsAttribution()` 日志 + 机读 `counts.charsSpreadRootCause`。

## 3. 几何与流区占比

| 项 | 值 | 来源 |
|---|---|---|
| `#stream.clientHeight` 最差格 | 748px | `default@400`（含待决决策卡）实测 |
| 登记下界（只允许上调） | 488px | `LOG_CLIENT_HEIGHT_FLOOR` |
| `#region-stream` 高度占比下界 | ≥ 0.65 | `STREAM_HEIGHT_RATIO_MIN`（TASK-501 spike **12/12 PASS**，最差格 320/明/详情展开 = **0.7273**） |
| journey `#15b` 实测 | PASS（≥65.0%） | `test/ui/journey.mjs` 保护段等价改写 |

## 4. 设计契约分列（设计稿 ≠ 验收依据）

| 面 | 数字来源 | 说明 |
|---|---|---|
| 设计稿公布值 | `design/ui-redesign/index.html`（E=7 / D=80 可点） | 仅阶段 A 同源对账 |
| 我们的口径（同 DOM） | `designCaliber.measuredByOurs` + `deltas` | 设计稿偏差**登记不平滑** |
| 真实产物 | 本文件 §2 的 31 格 | **唯一验收依据** |
| 设计契约（F 稿 + shim） | `test/design-contract.test.ts`（shim 60/60 + sha256 冻结 + 60 行映射表） | 只校验设计稿；与真实产物**分列**（R4-20） |

## 5. 反证（in-gate，`test/ui/density.mjs --reverse`）

| 编号 | 注入 | 期望 |
|---|---|---|
| RP-V4-01 | 卡内第 7 个可点 | 单卡预算 FAIL → 还原 PASS |
| RP-V4-02 | 空态首屏第 3 张卡 | 首屏预算 FAIL → 还原 PASS |
| RP-V4-03 | 第 2 张欢迎卡 / 欢迎文本 >8 行 | FAIL（两半）→ 还原 PASS |
| RP-V4-04 | `display:none`/`visibility`/`opacity`/`pointer-events` | C1 **不降**；`hidden=true` 必降 1 |
| RP-V4-05 | `dist/pick-layer.js` **+1 B** | 无容差上限 FAIL → 逐字节还原 + sha256 复核 |
| RP-V4-06 | `#theme-toggle` 移入 `#stream` | `assertChromeNotInStream()` 抛错 ∧ C1 不降 → 还原 PASS |
| RP-V4-07 | 风险 chip 移入 `hidden` 容器 | J3 探针 FAIL → 还原 PASS |
| RP-V4-08 | 取代台账：保护段内改 1 字节 / 段外改 1 字节 | 内必红、外不红 → 逐字节还原 + sha256 |

既有 v3 反证（RP-V3-01/04/08/09）保留；RP-V3-01 与 RP-V3-03 的靶子/注入量按三区骨架**等价重锚**（台账登记，见 `docs/v4-supersession-ledger.json`）。

## 6. 与 v3 的差异（逐条，方向 = 换口径重定标）

见机读文件 `differencesFromV3`（6 条）：测量根 / 豁免子树 + 防滥用 / 几何口径 / 格集 22→31 / composer 法四 / 方向声明。
`docs/v3-density-baseline.json` **逐字冻结**（`git diff` 为空），仅由 `test/density-thresholds.test.ts` 保留 schema 保真断言。

## 7. 未测边界（显式登记）

见机读文件 `knownLimitations`（3 条）：过渡形态的卡口径（`#l0-decision` 不计为卡，v4-2 落 7 主类卡后重审）/ `empty` 档 chars 视口差 / 风险格对夹具序敏感。
