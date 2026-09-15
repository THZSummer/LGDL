# 任务分解（**总览与叶子映射，不承接执行**）：specs-tree-web-cli-plugin-v3-ui

> **文档定位**: SDDU 任务清单 — **聚合导航文档**。本文件只做**总览与叶子映射**：不列可执行任务、不承接 build / review / validate。全部可执行任务落在 4 个叶子 `tasks.md` / `tasks.json`。  
> **前置依赖**: 父 `spec.md` v1.0（权威条文）+ 父 `plan.md` v1.0（ADR-V3-001~012）+ 4 叶 `plan.md`（ADR-V3-013~036）+ discovery.md v1.0  
> **创建人**: SDDU Tasks Agent  
> **创建时间**: 2026-09-16  
> **版本**: v1.0  
> **更新人**: SDDU Tasks Agent  
> **更新时间**: 2026-09-16  
> **更新说明**: 初始创建（父层总览与叶子映射；**偏差登记 3** 见 §0.2）

---

## 0. 定位与偏差登记

### 0.1 父 Feature 定位（复核）

| 项 | 结论 |
|---|---|
| 父 Feature 角色 | **轻量规范容器 + 聚合报告承载者**（父 spec FR-V3-002 / §11） |
| 父承 | 父 `discovery.md` / 父 `spec.md` / 父 `plan.md`（本批，含偏差登记 1）+ **本文件（总览与叶子映射）** |
| 父**不**承 | **不产出可执行任务**、**不产出 `tasks.json`**、**不承接** build / review / validate（实施由 4 个叶子承载） |
| 4 叶推进 | 4 叶 `state.json` 均已推进到 **`phase = tasked`** |

### 0.2 ⚠️ 偏差登记 3（**必须显式，不静默**）

- **事实**：父 spec **FR-V3-002** 规定父 Feature「只承载 `spec.md`（+ 下游聚合报告），**不产出** `plan.md` / `tasks.md` / `tasks.json`」；父 `plan.md` ADR-V3-002 已就此登记**偏差登记 1**（父产出 `plan.md`，但明确「**不产出** `tasks.md` / `tasks.json`」）。
- **本轮编排器指令**：明确要求「**若父级也有一份，则父 `tasks.md` 只做总览与叶子映射，不承接执行**」。
- **本任务的处理**：
  1. **执行编排器指令**：产出父 `tasks.md`（**总览与叶子映射**），因为 4 个叶子需要一个跨叶次的**导航与顺序总览**（叶间依赖、串行门禁清单、阻断级任务、关键任务索引）——这在父层一次性给全，比 4 叶各自重复更省、更不易漂移；
  2. **登记为偏差**（本节 + ADR-V3-002 的延伸），并**明确 FR-V3-002 的可操作内核仍被完全遵守**：父**不产出** `tasks.json`（机器可读任务只在 4 叶）、**不列任何可执行 TASK-###**、**不承接** build / review / validate；
  3. 本文件**不是 phase 产物**（不参与 tasks 阶段的执行流），仅为**聚合导航**；4 叶 `tasks.md` / `tasks.json` 才是 build 的输入。
- **供 review / validate 核验**：本文件**零任务定义**（**不定义**任何 TASK 的复杂度 / 依赖 / 涉及文件 / 验收标准 / 验证命令）、**零可执行验证命令**、**零文件操作**；文中出现的 `TASK-xxx` **仅作索引引用**（阻断分析 / 关键任务定位 / 必含项对照），其权威定义一律在 4 叶 `tasks.md` / `tasks.json`。机器可读任务数 = **0**（父无 `tasks.json`）。

---

## 1. 叶子映射（**唯一权威 = 各叶 `tasks.md` / `tasks.json`**）

| # | 叶子 | 目录 | 任务数 | 波次 | S / M / L | 承载 ADR | 执行序 |
|:--:|------|------|:--:|:--:|:--:|------|:--:|
| 1 | **V3-1 L0 骨架与密度门禁** | `specs-tree-v3-1-l0-shell-density` | **15** | 7 | 5 / 8 / 2 | ADR-V3-013~019 | **1（首个）** |
| 2 | **V3-2 L1 就地展开与引用 / 回执** | `specs-tree-v3-2-l1-disclosure-refs` | **10** | 6 | 4 / 6 / 0 | ADR-V3-020~024 | 2（与 V3-3 可并行分解） |
| 3 | **V3-3 L2 按需视图（树 / 命令 / 审计 / 设置）** | `specs-tree-v3-3-l2-on-demand-views` | **9** | 5 | 3 / 5 / 1 | ADR-V3-025~029 | 3（与 V3-2 可并行分解） |
| 4 | **V3-4 页面即输入** | `specs-tree-v3-4-page-as-input` | **14** | 8 | 2 / 11 / 1 | ADR-V3-030~036 | **4（最后）** |
| | **合计** | | **48** | **26（叶内）** | **14 / 30 / 4** | ADR-V3-013~036 | — |

**叶子任务 ID 段（跨叶唯一）**：V3-1 = `TASK-1xx` · V3-2 = `TASK-2xx` · V3-3 = `TASK-3xx` · V3-4 = `TASK-4xx`（便于跨叶引用与阻断分析）。

### 1.1 各叶主要产出（一句话）

| 叶子 | 主要产出 |
|------|---------|
| V3-1 | L0 常驻骨架（三件事三区）+ 五类风险位独立常驻（永不折叠）+ **密度口径唯一实现源 + 门禁三段式（9 强制格 + 15 登记格）+ RP-V3-01~06 + 首轮密度基线** + **取代台账与台账门禁** + 折叠器 / 摘要计数 / 展开态记忆契约 |
| V3-2 | L1 八类**就地展开**（≤1 次交互）+ 引用失效 **fail-closed 五维判定**（唯一放行点 + `unknown` 必阻断）+ **两条恢复路径** + **回执三件套**（摘要 L0 / 证据 L1 / 审计出口） |
| V3-3 | 四个 L2 视图**默认零占用**（只有「计数 + 入口」，**计数从真值派生**）+ `≤2` 次交互 + 「← 返回」复位 + 单滚动容器 + **能力集等价 8 项** + 取代台账**最大战场**（`sidepanel-view.test.ts` 4 契约增强式迁移） |
| V3-4 | **A-UI-004 spike（硬前置）** + 第 5 bundle `dist/pick-layer.js`（**独立无容差上限**）+ 双触发 / 幂等 / teardown / 失败降级 + 右键自绘菜单（**三退让 + 零新增权限**）+ 四项交互 + 双向联动 + 执行可视化 + **未授权零注入**（含反证） |

---

## 2. 跨叶执行序与串行门禁

### 2.1 叶间顺序（**不可颠倒**）

```
V3-1（无前置，首个开工）
   │  产出契约：disclosure（折叠器 / 摘要计数 / 展开态记忆）+ L0 区域与 id 归属 + 密度门禁与基线 + 取代台账
   ├──────────────┬──────────────────────┐
   ▼              ▼                      │
V3-2（L1）     V3-3（L2）                 │  ← 可并行分解；门禁执行严格串行
   │              │                      │
   └──────┬───────┘                      │
          ▼                              │
      V3-4（页面即输入）  ←───────────────┘  ← 最后开工；**前置 spike（TASK-401）通过后才动实现**
```

**强制约束**：
- **每叶结束时全部门禁必须绿**（AC-V3-013 / EC-V3-013）：**禁止**把红灯中间态留给下一叶；
- 叶顺序 `v3-1 → {v3-2, v3-3} → v3-4`（ADR-V3-010 第 1 条）；
- **V3-4 的 TASK-401 spike（S1~S4）未全过 → 不得进入 V3-4 的任何实现任务**。

### 2.2 串行门禁清单与顺序（**一次只跑一个**）

> 本机内存 ~1.5GB、曾 OOM（父 plan R3-10）。**任何两个 Chromium 门禁绝不并发**。所有门禁日志全量 `tee` 到 `/tmp/opencode/v3-gate-logs/<gate>.log`，**禁 tail 截断**（NFR-V3-012 / AC-V3-024 / FR-V3-086）。

**必须严格串行的门禁（一次一个）**：

| 序 | 门禁 | 命令 | 引入叶 | 说明 |
|:--:|------|------|:--:|------|
| 1 | 类型 | `npm run typecheck` | — | 快速反馈 |
| 2 | 构建 | `npm run build` | — | 产出 `dist/**`（含 V3-4 起新增的 `pick-layer.js`） |
| 3 | 单测 | `npm test` | — | Node 测试（含 v3 新增 node 门禁）；**内存重** |
| 4 | 取代台账 | `npm run test:supersession` | V3-1 | 无 Chromium；hunk ↔ 台账映射 |
| 5 | 零注入 | `npm run test:zero-injection` | V3-4 | Chromium + node 段 |
| 6 | 页面即输入 | `npm run test:page-input` | V3-4 | Chromium（页面侧） |
| 7 | 密度 | `npm run test:density` | V3-1 | Chromium（**9 强制格 + 15 登记格**） |
| 8 | L0 | `npm run test:l0` | V3-1 | Chromium |
| 9 | L1 | `npm run test:l1` | V3-2 | Chromium |
| 10 | L2 | `npm run test:l2` | V3-3 | Chromium |
| 11 | journey | `npm run test:ui` | — | Chromium；断言 ≥167 |
| 12 | insight | `npm run test:insight` | — | Chromium；union ≥108 |
| 13 | binding | `npm run test:binding` | — | Chromium；断言 ≥192 |
| 14 | hardening | `npm run test:hardening` | — | Chromium；24 |
| 15 | 端到端 | `npm run test:e2e` | — | Chromium（全链路） |
| 16 | 体积三线 + 反证 | `size-baseline` / `pick-layer-budget.test.ts` | V3-1 / V3-4 | `content.js` ≤177,076（无容差）· `sidepanel.js` ≤ceiling · `pick-layer.js` ≤独立上限；**RP-V3-06 两段** |
| 17 | 零改动核对 | `git diff --numstat` | — | `manifest.json`（含**无 `contextMenus`**）/ `src/security/**` / 冻结三文件 / `base` / `options.html` / `design/**` |
| 18 | 反证实跑 | `node test/ui/density.mjs --reverse RP-V3-01..04` + RP-V3-05 + RP-V3-06 | V3-1 / V3-4 | **每叶收尾必跑**（FAIL → 还原 → PASS） |

> **`test:v3`** 一旦在 V3-1 建立即为上述串行链的**链式驱动入口**（`&&` 串联，任一步 fail 即停，修复后从头串行重跑）。
> 具体每叶的串行顺序见各叶 `tasks.md` 的「执行策略 §4.1」（V3-1 14 步 / V3-2 13 步 / V3-3 13 步 / V3-4 15 步）。

### 2.3 计数下界（**只增不减**，每叶收尾核验）

| 门禁 | 基线 | v3 口径 |
|------|:--:|------|
| `test:ui`（journey） | **167** | `currentRuntime ≥ 167`（零 diff 优先，唯一改写 `#15c`） |
| `test:insight` | **108** | **union 口径**：`runtime(insight) + runtime(l1) + runtime(l2) ≥ 108`（必须写进 `counts.insight.note`） |
| `test:binding` | **192** | `currentRuntime ≥ 192`（`#21*`/`#22*` 字节零改） |
| `sidepanel-view.test.ts` | **38**（含 **4** 布局契约） | 用例数 ≥38；**4 契约逐项仍被断言**（增强式或等价替代） |
| Node `test(` 计数下界守卫 | **≥646** | `current ≥ 646`（本 Feature 不得下调） |
| 安全 / 硬底线类断言 | 分散 | **只增不减**（含零提权控件 / 伪造 `sendMessage` 不能突破 clamp / 零明文） |

---

## 3. 阻断级任务（blocker）索引

> 下列任务**不完成则后续全卡住**（跨叶 + 叶内）：

| 阻断任务 | 所在叶 | 阻断范围 |
|------|:--:|------|
| **TASK-102**（密度口径唯一实现源） | V3-1 | `TASK-107` / `TASK-109` / `TASK-111` / `TASK-112` + 后三叶「密度不回归复测」 |
| **TASK-103**（L0 容器与 54 id 归属） | V3-1 | `TASK-105` / `TASK-106` / `TASK-107` / `TASK-109` / `TASK-110` |
| **TASK-106**（L0 骨架接线） | V3-1 | `TASK-109` / `TASK-110` / `TASK-113`（未接线则默认档 7 不可实测） |
| **TASK-108**（取代台账 + 台账门禁） | V3-1 | `TASK-111`（RP-V3-05）+ **V3-2 / V3-3 / V3-4 的全部台账追加与取代门禁** |
| **TASK-109**（密度门禁 + 9/15 格） | V3-1 | `TASK-112` / `TASK-111` + 后三叶密度不回归 |
| **TASK-201**（引用失效判定） | V3-2 | `TASK-206` / `TASK-207`（fail-closed 唯一放行点） |
| **TASK-205**（L1 八类接线） | V3-2 | `TASK-206` / `TASK-207` / `TASK-208` |
| **TASK-305**（L2 归属迁移） | V3-3 | `TASK-306` / `TASK-307` / `TASK-308` / `TASK-309` |
| **TASK-307**（取代最大战场） | V3-3 | `TASK-308` / `TASK-309`（取代未闭合则台账门禁红） |
| **TASK-401**（**A-UI-004 spike**） | V3-4 | **`TASK-402~TASK-414` 全部**（spike 未过不得进入实现） |
| **TASK-403**（第 5 bundle + 注入通路） | V3-4 | `TASK-404` / `TASK-405` / `TASK-406` / `TASK-411` |
| **TASK-407**（四项交互集成） | V3-4 | `TASK-408` / `TASK-409` |
| **TASK-411**（`pick-layer.js` 独立守卫） | V3-4 | `TASK-414`（新 artifact 无守卫则体积红线无机器判据） |

---

## 4. 三条关键任务的编号与验收锚点（跨叶索引）

| 关键面 | 任务编号 | 验收锚点 |
|------|------|------|
| **取代台账** | **V3-1 `TASK-108`**（建台账 + 门禁，V3-1 叶内）<br>追加：V3-2 `TASK-208` · V3-3 `TASK-307` · V3-4 `TASK-412` | **AC-V3-011**（删除 hunk 未命中台账即 FAIL）· **AC-V3-012**（计数不减）· **AC-V3-014**（RP-V3-05 反证）· NFR-V3-014 · FR-V3-004 · EC-V3-013 · ADR-V3-007 · ADR-V3-019 / 024 / 029 / 036 |
| **密度反证** | **V3-1 `TASK-111`**（RP-V3-01~06 六条实跑）<br>驱动：V3-1 `TASK-109`（`--reverse` 分支）· V3-1 `TASK-107`（RP-V3-02(a)）· V3-4 `TASK-411`（RP-V3-06 的 pick-layer 段） | **AC-V3-006**（RP-V3-01~03 必须真 FAIL）· **AC-V3-014**（RP-V3-05）· **AC-V3-015**（RP-V3-06）· NFR-V3-013 · EC-V3-010 · ADR-V3-003 / ADR-V3-004（第 3 条逐条判据）· ADR-V3-007（第 4 条） |
| **体积重登记** | **V3-1 `TASK-114`**（`sidepanel.js`，条件触发）· **V3-3 `TASK-308`**（`sidepanel.js`，**本叶最可能触发**）· **V3-4 `TASK-413`**（`sidepanel.js`，条件触发）· **V3-4 `TASK-411`**（**`pick-layer.js` 独立基线登记**，新 artifact） | **AC-V3-015**（`content.js` ≤177,076 + RP-V3-06）· **AC-V3-016**（`sidepanel.js` ≤ceiling；重登记显式）· NFR-V3-003 / NFR-V3-004 / NFR-V3-005 · EC-V3-012 · ADR-V3-011 · ADR-V3-031 · ADR-V3-035 |

**重登记披露要求（三叶一致，缺一即违规）**：前后值 + 日期 + 来源（`dist/sidepanel.js` / `dist/pick-layer.js`）+ `buildCommand` + `measuredBy` + **理由** + **历史保留**（`SIDEPANEL_BASELINE_BYTES_HISTORY`）+ **容差 5% 不变** + `targetBudgetBytes` / `targetMet` **保持 `null`** + **断言零删减** + **反证在新值上重新驱动**；**`content.js` 无容差不可重登记**（唯一路径 = 让它字节不变）。

---

## 5. 编排器必含项 → 承载任务映射（**逐项对照，不漏**）

| 编排器要求 | 承载任务 |
|------|------|
| V3-1 ① 密度门禁唯一实现源 + 三段式落点 | `TASK-102`（`density-metrics.mjs`）· `TASK-109`（`density.mjs`）· `TASK-107`（`density-thresholds.test.ts`）· `TASK-101`（`_v3-helpers.mjs`） |
| V3-1 ② 9 强制格 + 15 登记格参数化 | `TASK-109` |
| V3-1 ③ RP-V3-01~06 六条反证（每条可真 FAIL） | `TASK-111`（+ `TASK-107` / `TASK-109` / `TASK-411` 的驱动分支） |
| V3-1 ④ 反作弊静态断言（测量源码零命中三函数） | `TASK-102` / `TASK-107` |
| V3-1 ⑤ L0 骨架 + `#risk-rail` 结构保证（AC-V3-008/009） | `TASK-103` / `TASK-105` / `TASK-110` |
| V3-1 ⑥ 取代台账 + `supersession-ledger.test.ts` | `TASK-108` |
| V3-1 ⑦ 首轮真实产物密度基线登记（三档视口） | `TASK-112` |
| V3-1 ⑧ 主题 / 320px / a11y 基建 | `TASK-103` / `TASK-104` / `TASK-110` |
| V3-2 就地展开 8 类 | `TASK-205` / `TASK-207` |
| V3-2 引用失效 fail-closed（五维） | `TASK-201` / `TASK-206` / `TASK-207` |
| V3-2 两条恢复路径 | `TASK-206` / `TASK-207` |
| V3-2 回执三件套 | `TASK-204` / `TASK-207` |
| V3-3 四视图默认零占用（计数从真值派生） | `TASK-301` / `TASK-305` / `TASK-306` |
| V3-3 ≤2 次交互 + 返回 | `TASK-302` / `TASK-305` / `TASK-306` |
| V3-4 先跑 A-UI-004 spike（S1~S4） | **`TASK-401`**（Wave 1 硬前置） |
| V3-4 第 5 bundle `pick-layer.js`（独立无容差上限） | `TASK-403` / **`TASK-411`** |
| V3-4 双触发 / teardown / 失败降级 | `TASK-403` / `TASK-404` / `TASK-407` |
| V3-4 右键自绘菜单（三退让） | `TASK-406` / `TASK-409` |
| V3-4 引用 / 双向联动 / 执行可视化 | `TASK-407`（P4 双向联动）/ `TASK-408`（P5 执行可视化 + G1 / G2）/ `TASK-409` |
| 体积任务（`pick-layer.js` 独立基线 + `sidepanel.js` 重登记显式） | `TASK-411` / `TASK-114` / `TASK-209` / `TASK-308` / `TASK-413` |
| 收口任务（每叶全门禁绿 + 串行清单） | `TASK-115` / `TASK-210` / `TASK-309` / `TASK-414` |

---

## 6. 任务汇总（跨叶）

| 统计项 | 数值 |
|--------|:--:|
| 叶子数 | **4** |
| 总任务数 | **48** |
| S 级 (简单) | 14 |
| M 级 (中等) | 30 |
| L 级 (复杂) | 4 |
| 叶内波次合计 | 26 |
| 独立 Chromium 门禁数（新增） | 6（`density` / `l0` / `l1` / `l2` / `page-input` / `zero-injection`）+ 1 复测（`density`） |
| 机器可读任务（`tasks.json`） | **4 份（仅叶子）** —— 父无 `tasks.json` |

### 6.1 执行策略（总览）

| 序 | 叶子 | 策略 |
|:--:|------|------|
| 1 | V3-1 | 7 波：helper →（口径 ∥ DOM ∥ 折叠器）→（风险位 ∥ 静态门禁）→ L0 接线 →（密度门禁 ∥ L0 门禁 ∥ 同编号改写）→（台账 ∥ 密度基线）→ 六条反证 →（体积 ∥ 收口） |
| 2 | V3-2 | 6 波：判定 + id 单源 + 局部树 + 回执（并行）→ L1 八类接线 →（失效呈现/阻断 ∥ insight 取代）→ L1 门禁 → 体积 → 收口 |
| 3 | V3-3 | 5 波：四模块并行 → L2 归属迁移接线 →（L2 门禁 ∥ 取代最大战场）→ 体积重登记 → 收口 |
| 4 | V3-4 | 8 波：**spike 门** →（捕获 ∥ 第 5 bundle）→（入口/桥 ∥ Shadow ∥ 菜单）→ 四交互集成 →（P5+G1/G2 ∥ 零注入 ∥ 体积基线）→（page-input ∥ binding 取代）→ sidepanel 体积 → 收口 |

### 6.2 门禁矩阵（跨叶，**无 Chromium** vs **Chromium**）

| 类别 | 门禁 |
|------|------|
| **无 Chromium**（可快速跑） | `npm run typecheck` · `npm test`（含 `density-thresholds.test.ts` / `supersession-ledger.test.ts` / `l0-disclosure.test.ts` / `l1-ref-validity.test.ts` / `l2-counts.test.ts` / `ref-capture.test.ts` / `zero-injection.test.ts` / `pick-layer-budget.test.ts`）· `npm run test:supersession` |
| **Chromium**（**必须严格串行**） | `test:density` · `test:l0` · `test:l1` · `test:l2` · `test:page-input` · `test:zero-injection` · `test:ui` · `test:insight` · `test:binding` · `test:hardening` · `test:e2e` |

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：**父层总览与叶子映射**（不承接执行）。内容 = 叶子映射（4 叶 / **48 任务** / 26 叶内波次 / S×14 · M×30 · L×4）+ 跨叶执行序与 18 项串行门禁清单 + 计数下界 + 阻断级任务索引 + **三条关键任务（取代台账 / 密度反证 / 体积重登记）编号与验收锚点** + 编排器必含项逐项对照。**偏差登记 3**：执行编排器指令产出父 `tasks.md`（仅总览），并明确 FR-V3-002 / ADR-V3-002 的**可操作内核仍被遵守**（父**不产出** `tasks.json`、**不列可执行任务**、**不承接** build / review / validate）。**只做 tasks**：未写代码、未改 `src/**`·`test/**`·`manifest.json`·`design/**`·`ROADMAP.md`、未动 `main`、未 commit、**未跑门禁/构建/Chromium**。 | 2026-09-16 | SDDU Tasks Agent |
