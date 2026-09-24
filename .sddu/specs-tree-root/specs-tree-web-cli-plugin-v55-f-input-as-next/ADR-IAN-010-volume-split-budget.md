# ADR-IAN-010: 体积分列预算（逐叶分列 + 逐模块归因 + 距档 22,454 + EC-IAN-016 预置）

## 状态
ACCEPTED（承父 spec §5.11 / §5.11.1 / FR-IAN-110~115 / DC-IAN-009 / ADR-V55-011 口径）

## 背景

**统一前提（承 F-34 closeout / spec §2.5B，本轮只读复核）**：

| 项 | 值 |
|---|---|
| A 列基线（`dist/sidepanel.js`） | **591,946 B**（`test/size-baseline.ts:363` `SIDEPANEL_BASELINE_BYTES`） |
| 生效上限（公式唯一） | `floor(591,946 × 1.05) = `**`621,543`** B（余量 **29,597 B**）；容差 5% 未动；`SIDEPANEL_CEILING_CAP` = `record-only` |
| 档位 | **614,400 B**（`ceilTo50KB(591,946)` ⇒ **距档 22,454 B**） |
| 绝对上限 | **675,840 B** |
| `authorConfirmation` | **`pending-author-line`**（**未闭合义务，不得伪称已确认**） |
| B 列（`dist/background.js`） | **不计入** sidepanel 账本 |
| C 列（`content.js` / `pick-layer.js`） | **零容差**（177,076 B / `52a82620…`；34,358 B / `77796bab…`） |

**校准依据（实测增量，逐轮；承 ADR-V55-011 §1）**：

| 先例轮 | 实测 A 列 | 与本 Feature 对照 |
|---|--:|---|
| R6 快修轮（6 文件） | **+5,199** | ian-1 面板侧新增面 + 通道 + 回填迁移，量级同档 |
| v5.5-1 R1（3 新模块 + 接线） | **+2,755** | ian-1 无新模块，仅 5 个既有文件改动 ⇒ 偏小 |
| v5.5-3 R2（护栏 + 仲裁 + 面板接线） | **+6,889** | ian-1 接线量级参照上界 |
| **F-34 叶1 R1+R2**（实测） | **+7,109** | 4 波 / 新模块多 ⇒ ian-1 应显著小于此 |
| **F-34 叶2 R1+R2**（实测） | **+6,214** | ⚠️ **计划 3.5~5.5 KB、实测 +6,214 ⇒ 上界低估约 1.13×**；ian-2 的「净负」目标须**先判后登记** |

## 决策

### ① 分列预算表（**逐叶分列，禁跨叶混算**）

| 列 | 产物 | 叶1（ian-1 新面）落地项 | 叶2（ian-2 废面）落地项 | 计账 |
|:-:|---|---|---|:-:|
| **A** | `dist/sidepanel.js` | provider `free-input` + 末端项注入 + 零死端 floor · 卡内输入语义分支 + `op.turn` 槽接线 · 手输 driver + 让位 · 流内回填支持 + focus | 删 `syncComposerVisibility` / `fallbackOpen` / `#send` writer / shell 流外写点 · 四处兜底停引 · `#send-reason`/`sendDisabled`/draft/引导重锚 · `RETIRED_CONTAINER_IDS`/`NEVER_FOLDABLE` 登记 · `requestTurn(` 重锚 | ✅ |
| **B** | `dist/background.js` | （无 —— `turn-queue.ts` 零 diff） | （无） | ❌ |
| **C** | `content.js` / `pick-layer.js` | **零触碰** | **零触碰** | 零容差 |

| 预算口径 | 叶1（ian-1） | 叶2（ian-2） | Σ | +15% 缓冲 | 结论 |
|---|--:|--:|--:|--:|---|
| **A 列（目标口径，承 spec）** | **+2.5 ~ +4.5 KB** | **−2.5 ~ −1.0 KB**（**目标净负**） | **−0.0 ~ +3.5 KB** | **−0.0 ~ +4.0 KB** | 距档余量 **22,454 B** ⇒ **不触发升档**（远未越生效上限余量 29,597 B） |
| **A 列（严格口径，见 ③）** | **+2.5 ~ +4.5 KB** | **−1.2 ~ +0.3 KB** | **+1.3 ~ +4.8 KB** | **+1.5 ~ +5.5 KB** | 仍 < 22,454 B ⇒ **两种口径均不触发升档** |
| **B 列（不计账）** | 0 KB | 0 KB | 0 KB | — | 不改 SW 面 |
| **v55 历史低估系数 2.8× 最坏（A 列 Σ 上界 4.8 KB）** | — | — | **≈13.4 KB** | **≈15.4 KB** | **仍 < 22,454 B ⇒ 即使 2.8× 低估也不触发升档**（**预置 EC-IAN-016 显式升档路径 + 作者一行**以防实测越界） |

### ② 逐模块归因（ian-1，A 列；禁跨叶混算）

| 模块 | 归因项 | 预估 |
|---|---|--:|
| `next-registry/providers.ts` | `free-input` provider 行 + `DRIVER_DECLS_SRC` 一条 + 文案 | +250 ~ +550 B |
| `next-registry/dispatch.ts` | `SET_A_PROTOCOL_ACTIONS` +`'free-input'`（1 字面量） | +30 ~ +60 B |
| `recommend.ts` | 末端项注入 + 零死端 floor（单源）+ payload 布尔字段 | +550 ~ +950 B |
| `cards/nextstep.ts` | 末端项渲染（`.next-chips` 之后，非 `.next-chip`） | +300 ~ +600 B |
| `next-registry/ai-drive.ts` | `MANUAL_DRIVER_ID` 单源常量 | +40 ~ +80 B |
| `sidepanel.ts` | `openFreeInputCard`/`freeInputCardId` + `handleCardAction` 分支 + 手输 trace/让位 + 流内回填支持 + focus | +1,150 ~ +1,950 B |
| `view-model.ts` | 引导文案改指 + `AskFlowView` 语义锚 | +100 ~ +250 B |
| 未归因胶水（估） | — | +80 ~ +160 B |
| **Σ（ian-1）** | — | **+2,500 ~ +4,600 B** |

### ③ 逐模块归因（ian-2，A 列；**两种口径显式**）

> **决定性事实（本轮实测）**：`src/ui/sidepanel/index.html` 被构建 **复制为 `dist/sidepanel.html`**（`build.mjs:95`），**不内联进 `dist/sidepanel.js`**。因此「删 DOM + 6 条 CSS」**不计入** `SIDEPANEL_BASELINE_BYTES` 账本（承 `size-baseline.ts:814,2812` 既有口径：「`index.html` 的纯文案行…**不进** `sidepanel.js`」）。
> ⇒ spec §5.11.1 A 列把「删 DOM + CSS」列为 ian-2 落地项属**直觉口径**；**严格 A 列只算 JS 删面**。本 ADR **两种口径并列**，build 以**严格口径实测登记**为准。

| 模块 | 删（A 列） | 增（A 列） | 净 |
|---|--:|--:|--:|
| `sidepanel.ts`（`syncComposerVisibility` + `fallbackOpen` + 读写 + `#send` writer + 注释） | −450 ~ −750 | +150 ~ +400（收敛接线：answer 分支终态化 / requestTurn 重锚辅助） | **−300 ~ −600** |
| `l0/shell.ts`（流外 `composer.hidden` 写点 + 注释） | −180 ~ −280 | +30 ~ +80 | **−150 ~ −200** |
| `disclosure.ts`（`'composer'` 项 + 注释算术） | −40 ~ −80 | 0 | **−40 ~ −80** |
| `host-registry.ts`（PRESERVED 注释 + 容器册 +3 + dispositions） | −60 ~ −100 | +120 ~ +220（3 条 dispositions） | **+60 ~ +120** |
| `view-model.ts`（引导文案 + `sendDisabled` 锚） | −20 ~ −50 | +40 ~ +90 | **+20 ~ +40** |
| `cards/askuser.ts`（按 requestId 纯查询，若需） | 0 | +40 ~ +90 | **+40 ~ +90** |
| 未归因胶水（估） | −60 ~ −120 | +20 ~ +60 | **−100 ~ −60** |
| **Σ（ian-2，严格 A 列）** | **−810 ~ −1,380** | **+400 ~ +940** | **−980 ~ +130 B（≈ −1.0 KB ~ +0.1 KB）** |
| **Σ（ian-2，目标口径含 DOM/CSS 直觉）** | — | — | **−2.5 ~ −1.0 KB**（**目标**） |

**处置（诚实登记，承 FR-IAN-115 / R-IAN-908）**：
- **目标 = 净负**；若 build 实测严格 A 列为**非负（>0）** ⇒ **必须显式登记「为什么删面没有净负」+ 实际归因 + 重新校准**（承 F-34 叶2 `+6,214` 越预算上界的诚实登记先例），**不得**只报 Σ、**不得**为凑净负把逻辑搬进/搬出 sidepanel 规避（FR-IAN-115 反证：把 A 列改动搬 B 列 ⇒ 必红）。
- 「删 DOM/CSS 不计账」这一口径**在本轮显式登记**，供收口与后续轮引用（否则「删面必净负」会成为恒真的错误假设）。

### ④ 结论与越限路径（EC-IAN-016 预置）

- **正常口径不触发升档**：A 列 Σ（严格）上界 **+4.8 KB** × 1.15 = **+5.5 KB** ≤ 距档余量 **22,454 B** 且 ≤ 生效上限余量 **29,597 B**。
- **2.8× 最坏**（A 列 Σ 上界 4.8 KB × 2.8 ≈ **13.4 KB**；×1.15 ≈ **15.4 KB**）**仍 < 22,454 B** ⇒ 即使按 v5 历史低估系数**也不触发升档**（预置，不静默）。
- **越限三分支（EC-IAN-016，逐分支 + 判据）**：
  1. 越**生效上限**（`> 621,543`）⇒ **显式重登记基线**（`SIDEPANEL_BASELINE_BYTES` 同源前移 + 五要素 + V3-VOL-3 三值），**不触发档位**；
  2. 越**档位 614,400** ⇒ 走 **EC 显式升档路径**（档位 → `ceilTo50KB(实测)`，绝对上限 → 档位 × 1.10）+ **作者一行**；
  3. 越**绝对上限 675,840** ⇒ **停止并请示作者**。
  - `authorConfirmation.status = pending-author-line` **保持占位、不得伪称已确认**（N-IAN-013）。
- **每叶收口实测重登记（不等两叶合计，FR-IAN-114）**：五要素（前后值 / 日期 / 来源 / 理由 / 历史保留）+ V3-VOL-3 三值（`newBaselineBytes` / `absoluteCeilingBytes` / 生效上限）同源前移；**ian-1 正增量如实登记**，**ian-2 净负如实登记为负值**（若非负 ⇒ 按 §③ 显式说明）。
- **冻结面零容差**：`content.js` 177,076 B / `pick-layer.js` 34,358 B / `KIND_SET` 40 —— 量值 + sha 双锚，构建后 `stat` + sha256 前后一致（FR-IAN-112）。

## 后果

- 正面：体积**先预算后落地**（NG-IAN-019）；两叶方向相反量级分列 ⇒ 归因可定位；距档结论在正常与 2.8× 最坏口径下均**不触发升档**。
- 代价 / 风险：ian-2 的「净负」**依赖 JS 侧删面量**（DOM/CSS 不计账，§③）；若删面不足则净负目标落空 ⇒ 预置「如实登记非负」的 EC 路径（不阻塞收口，但历史诚实）。
- 反证：把 A 列改动搬 B 列 ⇒ 归因判据必红；ian-2 非负却谎报净负 ⇒ 登记一致性判据必红；伪称 `authorConfirmation` 已确认 ⇒ 读值断言必红。

## 影响文件（预估）

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `test/size-baseline.ts` | 逐叶五要素重登记 + V3-VOL-3 三值前移 + `SIDEPANEL_GROWTH_BREAKDOWN` 逐模块行（`ian1Rows` / `ian2Rows`）+ 旧条目逐字保留 |
| MODIFY | `test/size-ruling-vol3.test.ts` / `test/size-budget.test.ts` | 数值重 pin（算术机核；结构零删减） |
| NOOP | `dist/content.js` / `dist/pick-layer.js` / `manifest.json` / `KIND_SET` | 零容差 / 零 diff |
