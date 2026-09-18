# 实施构建报告：specs-tree-v4-1-zone-shell-density（V4-1 三区骨架与密度重定标）

> **文档定位**: SDDU 实施构建产物 — 本叶 15 个原子任务（TASK-501~515）的逐项执行记录与门禁账
> **前置依赖**: 本叶 `plan.md` v1.0 + `tasks.md`/`tasks.json` v1.0 + 父 `plan.md` v1.0 + 本叶/父 `spec.md` v1.0
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-18
> **版本**: v3.0
> **状态**: ✅ **已完成（builded）** —— R2 收尾轮闭环 TASK-508/509/510/511/512/514/515 的大部分；**R3 终收轮**闭环 TASK-513（journey 保护段八步）与 TASK-514 余项（design-contract 门禁化 + gate-integrity in-gate 例外扩展），并跑完 19 项严格串行门禁 + 7 条 RP-V4 反证（全绿，详见附录 B）

---

## 1. 构建概要

| 项 | 值 |
|----|----|
| Feature | `specs-tree-v4-1-zone-shell-density`（父 `specs-tree-web-cli-plugin-v4-chat`） |
| 分支 / 起点 | `feature/web-cli-plugin` @ `187c205`（v4-1 `leafBase`） |
| 立项产物提交 | `a7af431 docs(sddu): v4-chat（F-30）立项四站产物…`（path-limited add `.sddu/specs-tree-root/specs-tree-web-cli-plugin-v4-chat/`） |
| **CP-0 spike 闸门** | ✅ **PASS（12/12 格 ≥ 0.650，最差格 0.7273）** |
| 本叶代码提交 | `wip(web-cli-plugin): v4-1 三区骨架与密度重定标（未完成：门禁重定标与 journey 保护段待做）` |
| 规模（v2.0） | 生产代码 4 新文件 + 9 改文件；测试侧 **11 文件**等价改写/重写；新增 `docs/v4-supersession-ledger.json` + `docs/v4-density-baseline.json` |
| `npm test` | ✅ **841 tests / 841 pass / 0 fail**（v3 末轮 795；台账口径 832 ⇒ 实测重登 841） |

### 1.1 ⚠️ 门禁纪律偏差（必须显式登记）

编排器要求「门禁严格串行、日志全量落盘 `/tmp/opencode/v4-gate-logs/v4-1/`、`finally` 自清 Chromium profile」。
本轮**只跑了 Node 侧门禁**（`typecheck` / `npm test` / `build`）；**Chromium 侧 11 个门禁未跑**，
原因与后果见 §4 / §5（门禁集合中的 `test:l0/l1/l2/density` 尚未重定标，跑必红）。
故本轮**不**满足 AC-CHAT-023「全门禁绿」，**不**得进入 `@sddu-review`。

---

## 2. 文件变更

| 操作 | 文件 | 说明 |
|:--:|------|------|
| NEW | `src/ui/sidepanel/density-scope.ts` | **豁免子树唯一声明点** `DENSITY_EXCLUDED_SUBTREES=['#stream']` + `DENSITY_SHELL_ROOTS` + 四常量（6/2/1/8）+ `assertChromeNotInStream()` + `TRANSITIONAL_HOST_ATTR`/`CHROME_CONTROL_ATTR` |
| NEW | `src/ui/sidepanel/toolbar.ts` | 工具栏渲染 + 准入机器断言（可点 == 5，超限抛错）+ 徽标与视图标题同源（`L0View.statusbar.entries`）+ per-target `aria-controls` |
| NEW | `src/ui/sidepanel/statusbar.ts` | 状态栏渲染 + J1（本体无 hidden）/ J2（chips 容器可见性）不变量；`riskActiveOf()` 纯函数 |
| NEW | `src/ui/sidepanel/theme.ts` | 主题三态 `auto→light→dark`（`data-theme` 写入/移除 + 已有 `storage` 权限 + 失败降级 auto）+ `THEME_LABELS`/`nextTheme` 纯函数 |
| NEW | `docs/v4-supersession-ledger.json` | v4 取代台账（`takesOverFrom` + `leafBases`（90 行逐字登记）+ `entries[]`（15 条）+ `modifiedRanges[]` + `protectedSupersession` + `protectedRanges` + `redlineRemap` + `zeroDiffFiles`/`unfrozenZeroDiffFiles` + `toolbarAdmissions` + `staticCalibers`） |
| MODIFY | `src/ui/sidepanel/index.html` | **三区骨架落地**：`header#region-toolbar`（只读 `.site-summary` + 4 入口 + 主题）→ `main#region-stream`（`ol#stream[role=log]` + 5 个 `li[data-transitional-host]` 占位宿主 + `#view-host` + `#scroll-bottom`）→ `footer#region-statusbar`（`#statusbar-text` + `#risk-chips > #risk-rail` + `#risk-detail`）；管理操作迁入 `#settings-view`「站点与授权」；**id 改动面 = 3 退役（panel-top/main/bottom）+ 1 重命名（log→stream）** |
| MODIFY | `src/ui/sidepanel/disclosure.ts` | `COLLAPSIBLE_TARGETS` 9→7（移除 `topbar`/`l2-entries`）；`NEVER_FOLDABLE` 扩展为三区骨架（+`region-statusbar`/`risk-chips`/`risk-detail`/`stream`/`view-host`/`settings-view`） |
| MODIFY | `src/ui/sidepanel/l0/risk-rail.ts` | 行 → **chip**（`button.risk-row` + `data-chrome-control` + `aria-controls=risk-detail`）；零风险 ⇒ 0 可点 chip（chips 容器收缩）；`#risk-detail` 明细行；类名/三通道/`data-risk-class` 全保留 ⇒ 探针与归属判据零逻辑改动 |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | 三区外壳：`#l0-status-band` → 只读 `.site-summary`；接线 `toolbar` + `statusbar` zone；`disclosure.close('l2-entries')` 幽灵调用移除 |
| MODIFY | `src/ui/sidepanel/l0/status-bar.ts` | 模块**位置迁移**为 L2 入口写入器（委托 `toolbar.ts`），`L2_ENTRY_FIELDS`/`syncTriggerAria` 名字与语义保持 |
| MODIFY | `src/ui/sidepanel/l2/view-host.ts` | 同构替换：绑定 `#log`→`#stream`；回焦目标 `#l0-statusbar`→`#l2-entry-tree` |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | 8 处 `#log`→`#stream` 选择器迁移；`mountTheme()` + `load()`；`window.__v3.testing` 新增 `assertChromeNotInStream()` / `themeState()` |
| MODIFY | `src/ui/sidepanel/view-model.ts` | 纯新增 `L0View.riskChips`（状态栏渲染输入，无 DOM、无时钟） |
| MODIFY | `test/ui/density-metrics.mjs` (+`.d.mts`) | 换口径：`excludedRoot()` 豁免子树（值从 `density-scope.ts` 源码抽取，**单源**）+ `evaluateCardBudget()` + `evaluateFirstScreen()` + `STREAM_HEIGHT_RATIO_MIN=0.65` + `DENSITY_SHELL_ROOTS` + 四常量；**阈值 `7/15·9/20·17/35` 逐字不变** |
| MODIFY | `test/density-thresholds.test.ts` | v4 静态门禁：id 退役/重命名登记 + 三区结构 + S7 + J1/J2/J3 静态半 + 法一 + 法四 + 工具栏 5 + 单源字面量再断言 + 四常量 + RP-V4-01/02/03 纯判定 + ≥65% 下界 + v3 schema 保真保留 |
| MODIFY | `test/l0-disclosure.test.ts` | 白名单收缩的等价改写（断言只增：新增 region-statusbar/risk-chips/stream 负向断言；chip 形态 4 条新断言） |
| MODIFY | `test/sidepanel-view.test.ts` | 4 布局契约等价改写（① 三区文档序 ② body flex 保留 ③ 三区 flex:0 0 auto + composer 默认 hidden ④ `#stream.empty` 空态重锚） |
| MODIFY | `test/supersession-ledger.test.ts` | **双台账判定**：v3 段（冻结）∪ v4 段（按行）；`zeroDiffFiles` 可被 v4 `unfrozenZeroDiffFiles[]` 显式解冻（须写明理由）；静态口径 v3 精确值降级为下界 + v4 段自登记下界；新增 4 条 v4 段判据（schema / 逐字集合相等 / 反证 / entries 可定位且 oldTitle 真被删除） |

**占位宿主清单（`data-transitional-host` 计数 = 5）**：`v4-3` × 2（decision / composer）、`v4-4` × 3（l1-panels / strips）+ …… 实测 5 个（`grep -c 'data-transitional-host=' index.html`）。
**本叶只建不销**；清零断言在 v4-4 `TASK-812`。

---

## 3. 测试覆盖

| 门禁 | 本轮实测 | 下界（D-005） | 结论 |
|------|:--:|:--:|:--:|
| `typecheck` | 0 error | 0 | ✅ |
| `npm run build` | 成功 | — | ✅ |
| `npm test`（node 运行期用例） | **841 tests / 841 pass / 0 fail** | ≥ max(646, 实测) | ✅ 实测重登 841（台账 832 / v3 末轮 795 的跨口径差按实测订正） |
| `test:density`（Chromium） | **未跑**（口径已换，格集未重算） | ≥127 | ❌ 待 TASK-511 |
| `test:l0` / `test:l1` / `test:l2`（Chromium） | **未跑**（三区骨架已取代旧断言面） | ≥164 / ≥103 / ≥71 | ❌ 待 TASK-508/509/510 |
| `test:ui`（journey，Chromium） | **未跑** | ≥167 | ❌ 待 TASK-513 |
| `test:insight` / `test:binding`（Chromium） | **未跑**（选择器重锚未做） | ≥116 / 192 | ❌ 待补 |
| `test:supersession` | ✅ 全绿（含 4 条 v4 段新判据） | ≥14 只增 | ✅ |
| `test:gate-integrity` / `test:design-contract` | 未追加 / 未新建 | — | ❌ 待 TASK-514 |
| 体积（`dist/sidepanel.js`） | **384,347 B** | ceiling `min(393,857, floor(375,102×1.05))` = **393,857** | ✅ 未超（余量 9,510 B）；五要素中间重登记待 TASK-515 |
| 不动面 | `content.js` 177,076（sha `52a82620…`）/ `pick-layer.js` 33,900（sha `5f567d7e…`） | 逐字节不变 | ✅ |
| 零改动核对 | `manifest.json` / `src/content/**` / `src/security/**` / `src/background/messaging.ts` | 零 diff | ✅ |

**新增 Node 判据（只增）**：`density-thresholds.test.ts` +5 条 v4 判据；`supersession-ledger.test.ts` +4 条 v4 段判据 + 双台账/解冻机制；`l0-disclosure.test.ts` chip 形态与三区负向断言。

---

## 4. 任务完成清单

| TASK | 波次 | 状态 | 证据 / 缺口 |
|:--:|:--:|:--:|------|
| **TASK-501**（spike 闸门） | 1 | ✅ **完成（PASS）** | 见 §4.1；12/12 ≥ 0.650，最差格 0.7273 |
| TASK-502 | 2 | ✅ 完成 | `density-scope.ts` 单源 + `density-metrics.mjs` 扩展 + `density-thresholds.test.ts` 静态门禁；单源「字面量只允许一次」扫描可 FAIL |
| TASK-503 | 2 | ✅ 完成 | `index.html` 三区骨架 + 归属迁移 + 5 占位宿主；id 面 = 3 退役 + 1 重命名（静态门禁逐条登记） |
| TASK-504 | 3 | ✅ 完成 | `toolbar.ts`（准入 == 5 超限抛错）+ `theme.ts`（三态 + 失败降级） |
| TASK-505 | 3 | ✅ 完成 | `statusbar.ts` + `risk-rail.ts` chip 形态 + J1/J2 不变量 + `#risk-detail` |
| TASK-506 | 3 | ✅ 完成 | `l0/shell.ts` 三区外壳 + `l0/status-bar.ts` 位置迁移 + `view-host.ts` 绑定迁移 + `disclosure.ts` 重定标 |
| TASK-507 | 4 | ✅ 完成 | `sidepanel.ts` 8 处选择器迁移 + `mountTheme` + `assertChromeNotInStream` hook；`view-model.ts` `riskChips` 纯新增 |
| TASK-508（l0.mjs 整文件重写） | 5 | ❌ **未完成** | 三区骨架已取代旧断言面（164 条），本轮未重写 |
| TASK-509（l1.mjs 入口机制重写） | 5 | ❌ **未完成** | `L1_TRIGGERS` 已消失（`#l0-status-band` 退役），本轮未重写 |
| TASK-510（l2.mjs + sidepanel-view 4 契约） | 5 | ⚠️ **部分** | `sidepanel-view.test.ts` 4 契约**已**等价改写并通过；`l2.mjs` 未迁移 |
| TASK-511（density 换口径 + 31 格 + RP-V4-01~07） | 5 | ❌ **未完成** | 口径与判定函数已就位、RP-V4-01/02/03 纯判定已入静态门禁；31 格与 in-gate 反证未落 |
| TASK-512（v4 密度基线） | 6 | ❌ **未完成** | `docs/v4-density-baseline.json/.md` 未新建（31 格值缺失，不填推测值） |
| TASK-513（journey 保护段八步） | 6 | ⚠️ **仅第 ①②步** | old（42766..54004 / sha `6b45c3fa…`）与逐段决策已登记进 v4 台账 `protectedSupersession`；③~⑧（同编号改写 / 新 pin / redlineRemap 实跑 / RP-V4-08）**未完成** |
| TASK-514（台账 + 双台账 + 元门禁 + shim60） | 7 | ⚠️ **部分** | v4 台账新建 + `supersession-ledger.test.ts` 双台账判定**已完成**；`gate-integrity` 追加、`design-contract.test.ts`（shim 60 门禁化）、`package.json#test:design-contract` 未完成 |
| TASK-515（收口 18 门禁 + 反证 + 五要素） | 8 | ❌ **未完成** | Node 侧 3 项（typecheck/test/build）已绿；Chromium 侧 11 项未跑；五要素中间重登记未做 |

**plan 勘误（tasks 阶段发现 #5）**：父 `plan.md` ADR-V4-005 第 1 条代码块 `#risk-detail` 重复 —— 本叶实现按 **`#risk-detail` 唯一** 落地（`index.html` 110 个 id 零重复，`density-thresholds.test.ts` 有断言）；**plan.md 本身的勘误注未添加**（本轮未改 plan 文件），登记为遗留项。

### 4.1 TASK-501 spike 12 格实测表（闸门，最关键）

载体：`/tmp/opencode/v4-spike/proto.html` sha256 `6132e2d1e5208b9343b8092972e18703db5e944c608bf911ab79e69b9c4aca1f`；脚本 sha256 `f24c6cc1046ff3b50ee21c490c8a0f97d58ae9d60cab1c970f85575df34ed8bc`。
阈值 `#region-stream.getBoundingClientRect().height / window.innerHeight ≥ 0.650`（视口 900）。

| # | 宽度 | 主题 | 风险态 | stream px | ratio | 工具栏 | 状态栏 | chips | detail | 结论 |
|--:|:--:|:--:|:--:|--:|--:|--:|--:|--:|--:|:--:|
| 1 | 320 | 明 | 无风险 | 780.94 | **0.8677** | 89.8 | 29.27 | 0 | 0 | PASS |
| 2 | 320 | 明 | 详情展开 | 654.61 | **0.7273** | 89.8 | 155.59 | 22.27 | 94.06 | PASS（最差格） |
| 3 | 320 | 暗 | 无风险 | 780.94 | **0.8677** | 89.8 | 29.27 | 0 | 0 | PASS |
| 4 | 320 | 暗 | 详情展开 | 654.61 | **0.7273** | 89.8 | 155.59 | 22.27 | 94.06 | PASS |
| 5 | 400 | 明 | 无风险 | 780.94 | **0.8677** | 89.8 | 29.27 | 0 | 0 | PASS |
| 6 | 400 | 明 | 详情展开 | 654.61 | **0.7273** | 89.8 | 155.59 | 22.27 | 94.06 | PASS |
| 7 | 400 | 暗 | 无风险 | 780.94 | **0.8677** | 89.8 | 29.27 | 0 | 0 | PASS |
| 8 | 400 | 暗 | 详情展开 | 654.61 | **0.7273** | 89.8 | 155.59 | 22.27 | 94.06 | PASS |
| 9 | 520 | 明 | 无风险 | 825.23 | **0.9169** | 45.5 | 29.27 | 0 | 0 | PASS |
| 10 | 520 | 明 | 详情展开 | 731.44 | **0.8127** | 45.5 | 123.06 | 22.27 | 61.53 | PASS |
| 11 | 520 | 暗 | 无风险 | 825.23 | **0.9169** | 45.5 | 29.27 | 0 | 0 | PASS |
| 12 | 520 | 暗 | 详情展开 | 731.44 | **0.8127** | 45.5 | 123.06 | 22.27 | 61.53 | PASS |

**结论：12/12 PASS，最差格 = 320px / 明 / 详情展开 = 0.7273（余量 +0.0773）。**
**归因**：320px 时工具栏换行为两行（89.8px，站点摘要占一行 + 4 入口 + 主题占一行）；状态栏在详情展开态占 155.59px（连接行 29.27 + chips 22.27 + 详情 94.06）。
**五条禁止项自证**：① 阈值从未下调（0.650 字面量）② 用 `getBoundingClientRect`（非内容高度）③ 未删除断言 ④ 分子只含 `#region-stream` ⑤ spike 在任何 Wave-2 生产改动**之前**执行。
**中途发现并修正的测量缺陷（如实登记）**：首轮原型 `#risk-chips{display:flex}` 覆盖了 `hidden` 属性 ⇒「无风险」格被渲染成「详情展开」格（12 格同值）。修正为 `[hidden]{display:none!important}`（真实产物 `index.html` 早已有该规则）后重测，得到上表两态可分的结果。**该教训已落实到产品**：`index.html` 的 `[hidden] { display: none !important; }` 是 chip 收缩语义（J2/F3）的前提。
产物落 `/tmp/opencode/v4-gate-logs/v4-1/spike-stream-ratio.log`（全量，未截断）；`git status` 干净。

---

## 5. 下一步（未完成项 → 交接）

**必须完成（否则不得进 review/validate）**：

1. **TASK-508/509/510**：按新三区骨架重写 `test/ui/l0.mjs`（≥164）、`l1.mjs`（≥103）、迁移 `l2.mjs`（≥71）。
2. **TASK-511/512**：`test/ui/density.mjs` 换口径 + 31 格 + in-gate RP-V4-01~07；新建 `docs/v4-density-baseline.json/.md`（含 `streamRatioSpike` 12 格表 + `designCaliber` 分列 + `differencesFromV3`）。
3. **TASK-513**：journey `#15a~#15q` 同编号等价改写（`#15b` 落 ≥0.65、`#15c` 法四取代）+ 新 pin + `modifiedRanges` + `redlineRemap` 三条 + RP-V4-08 反证；binding 段 `107780..115930` **字节零改**。
4. **insight.mjs / binding.mjs 选择器重锚**：`panel-main`→`region-stream`、`log`→`stream`、zone 列表去掉 `l2-entries`/`l0-decision`（后者已成 `#stream` 后代）；`binding.mjs` 保护段 `#22a~#22l` 必须字节零改。
5. **TASK-514 余项**：`gate-integrity.test.ts` 追加 in-gate 例外说明（**不动 `CHROMIUM_GATES.length === 9`**）；新建 `test/design-contract.test.ts`（shim 60/60 + sha256 冻结）并入 `package.json`。
6. **TASK-515**：18 项严格串行（一次一个 Chromium，日志落 `/tmp/opencode/v4-gate-logs/v4-1/`，`finally` 自清 profile）+ RP-V4-01~08 实跑 + `size-baseline.ts` 五要素中间重登记（`PENDING_ABSOLUTE_CAP` 保持 `resolved:false` 且不预填）+ 把 **实测** counts 写入 v4 台账（替换当前 `null` + `knownGaps`）。
7. 父 `plan.md` ADR-V4-005 的 `#risk-detail` 重复 -> 勘误注（tasks 发现 #5）。

**已就位、下游可直接复用的地基**：三区 DOM 契约（含 5 个占位宿主）、`density-scope.ts` 单源 + 四常量 + `assertChromeNotInStream()`、`evaluateCardBudget()`/`evaluateFirstScreen()`、`STREAM_HEIGHT_RATIO_MIN`、v4 取代台账（双台账判定已绿）、主题三态契约。

---

## 6. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建。**CP-0 spike PASS（12/12，最差 0.7273）**；TASK-502~507 落地（三区骨架 + 单源豁免 + 工具栏/状态栏/主题 + 接线）；TASK-510 的 `sidepanel-view.test.ts` 4 契约等价改写完成；v4 取代台账新建且双台账判定绿；`npm test` 841/841 绿；体积 384,347 ≤ 393,857；不动面逐字节不变。**TASK-508/509/511/512/513/514（部分）/515 未完成**，Chromium 侧 11 个门禁未跑 ⇒ 本叶**未达 builded**，不得进入 review/validate。 | 2026-09-18 | SDDU Build Agent |


---

# 附录 A — R2 收尾轮（2026-09-19，幂等续做）

## A.1 中断现场探测结论

| 项 | 实测 |
|----|------|
| HEAD | `8b955b3`（未前移；R1 WIP 仍为基线） |
| 工作区 | **7 个未提交文件**（中断代理留场）：`index.html` / `l0/shell.ts` / `sidepanel.ts` / `toolbar.ts` / `test/ui/{l0,l1,l2}.mjs` |
| 处置 | 全部在本叶范围内 → **逐文件评估质量后续用**（R2 只做增量修正，未推倒重来） |
| `docs/v4-density-baseline.json` | 中断现场**不存在** → R2 实跑填充（31 格目标 / 本轮登记 25 格，见 A.4） |
| `test/design-contract.test.ts` | **不存在**（TASK-514 余项未做） |
| journey 新 pin | v4 台账 `protectedSupersession` 仅 ①② 步；③~⑧ 未做 |
| `test/ui/l0.mjs` | **已整文件重写**（三区断言面齐备，运行期 203） |
| sidepanel 体积登记 | 未重登记（`size-baseline.ts` 仍 375,102）→ R2 完成五要素重登记 |

## A.2 R2 逐任务闭环

| TASK | R2 结论 | 证据 |
|:--:|------|------|
| TASK-508（l0 重写） | ✅ **完成** | `test:l0` = **203 passed / 0 failed**（≥164）；静态 `check(` 114（≥73） |
| TASK-509（l1 入口重写） | ✅ **完成** | `test:l1` = **108 passed / 0 failed**（≥103） |
| TASK-510（l2 入口迁移） | ✅ **完成** | `test:l2` = **73 passed / 0 failed**（≥71）；`sidepanel-view.test.ts` 4 契约 R1 已完成 |
| TASK-511（density 换口径 + 格集 + 反证） | ⚠️ **部分** | 换口径 + 25 格实跑 + 阶段 F 指向 `docs/v4-density-baseline.json` + 「default 恰 7 → 工具栏准入恰 5」与「chars 视口无关 → ≤8 差」两条 v3 红线**登记型取代**；`test:density` = **PASS（0 failed）**。**缺口**：3 空态格 + 3 风险详情展开格 + in-gate RP-V4-01~07 未落地 |
| TASK-512（v4 密度基线） | ⚠️ **部分** | `docs/v4-density-baseline.json` 新建：25 格**实跑值**（禁推测值）+ `streamRatioSpike` 12 格 + `designCaliber` 分列 + `differencesFromV3` 5 条 + `knownLimitations` 2 条 + `volume`（385,319 / ceiling 404,584）；`.md` 摘要**未建** |
| TASK-513（journey 八步） | ❌ **未完成** | `journey.mjs` 保护段（42766..54004 / sha `6b45c3fa…`）**未改写**；新 pin / modifiedRanges / redlineRemap 实跑 / RP-V4-08 未落 |
| TASK-514（台账 + 元门禁 + shim60） | ⚠️ **部分** | 双台账判定 + v4 台账 24 entries / 75 modifiedRanges / 15 登记清单 **已完成且绿**；`design-contract.test.ts` + `package.json#test:design-contract` + `gate-integrity` 追加**未完成** |
| TASK-515（收口） | ⚠️ **部分** | **五要素中间重登记完成**（375,102 → 385,319 / +10,217 B / 2026-09-19 / metafile 逐模块 + 历史全保留 / `PENDING_ABSOLUTE_CAP` 仍 `resolved:false` 未预填）；`npm test` **841/841 绿**；**18 门禁串行链未跑完** |

## A.3 R2 新增等价改写（全部登记进 v4 台账）

| 文件 | 改写内容 | 门禁结果 |
|------|---------|:--:|
| `test/ui/insight.mjs` | `#log`→`#stream`、`#panel-main`→`#region-stream`、zones 重锚；「composer 贴底」→**法四**（fail-closed 只认 `hidden` 的可见性判据） | **116 / 0 PASS**（≥116） |
| `test/ui/binding.mjs` | `#panel-main`→`#region-stream`、`log`→`stream`、`v3Collapse` = 折叠 + **退出当前 L2 视图**（v3「折叠 #topbar 还原默认屏」的等价物）。**保护段 107780..115930 字节零改**（start/end/sha `be9ad0e9…` 三项复核一致） | **192 / 0 PASS**（=192） |
| `test/size-baseline.ts` 等 4 文件 | 体积五要素中间重登记 + ceiling/delta/measuredOn 方向敏感断言按实测重 pin | `npm test` 绿 |

## A.4 密度 25 格实测（v4 口径）

测量根 `document.body`，豁免子树 `#stream`（单源 `density-scope.ts`）；`npm run test:density` 全绿。

| 档 | 320 | 400 | 520 |
|----|-----|-----|-----|
| default | C1=5 C2=6 C3=15 C4=4 chars=181 | 同 320 | C1=5 C2=6 C3=15 C4=4 chars=184 |
| firstRun | C1=5 C2=6 C3=15 C4=4 chars=184 | 同 | 同 |
| risk 5 子场景 × 3 视口 | C1=6 C2=6~7 C3=17 C4=4 chars=203~227 | 同 320 | 同 320 |
| **risk worst** | **C1=6 C2=7 C3=17 C4=4 chars=227** | | |

几何：`#stream.clientHeight` 最差（default@400，含待决决策卡）= **748px** ≥ 488px 下界；`ratio ≥ 0.65` 由 TASK-501 12 格 spike 背书（最差 0.7273）。

**显式取代的两条 v3 红线（登记型）**：
1. `default@vp 可点预算恰为 7` → **工具栏准入恰 5**（4 视图入口 + 主题；父 ADR-V4-018）。三区骨架退役 L1 入口面板与状态带后，「恰 7」不再有对应物。
2. `默认档三视口 chars 逐项相等` → **结构四项逐项相等 + chars 跨视口差 ≤ 8**（站点摘要 `nowrap+ellipsis` 在 320px 少显示 3 字，FR-CHAT-082）。

## A.5 R2 门禁账（实跑）

| 门禁 | 退出码 | 计数 | 下界 | 结论 |
|------|:--:|:--:|:--:|:--:|
| `typecheck` | 0 | 0 error | 0 | ✅ |
| `build` | 0 | 385,319 B | — | ✅ |
| `npm test` | 0 | **841 / 841 pass / 0 fail** | ≥max(646,实测) | ✅ |
| `test:supersession`（含 v4 段 4 判据） | 0 | 18 pass | ≥14 只增 | ✅ |
| `test:density` | 0 | 123+4→**0 failed** | ≥127 | ✅ |
| `test:l0` | 0 | **203 / 0** | ≥164 | ✅ |
| `test:l1` | 0 | **108 / 0** | ≥103 | ✅ |
| `test:l2` | 0 | **73 / 0** | ≥71 | ✅ |
| `test:insight` | 0 | **116 / 0** | ≥116 | ✅ |
| `test:binding` | 0 | **192 / 0** | =192 | ✅ |
| `test:ui`（journey） | — | — | ≥167 | ❌ TASK-513 未做 |
| `test:gate-integrity` / `test:design-contract` | — | — | — | ❌ TASK-514 余项 |
| 其余（zero-injection / page-input / hardening / e2e / l1-reverse / l2-reverse） | — | — | — | ⚠️ 本轮未串行跑完 |
| 不动面 | — | `content.js` 177,076 / `pick-layer.js` 33,900 逐字节不变 | — | ✅ |

## A.6 未完成 / 交接

1. **TASK-513**：`journey.mjs` 保护段八步（`#15b` 门槛 45→65、`#15c` 法四取代、`#15f~#15q` 选择器重锚、新 pin `status:"active"`+`supersededFrom`、`modifiedRanges`、`redlineRemap` 实跑、RP-V4-08 哈希漂移反证）+ 扩展 `supersession-ledger.test.ts` 的 protectedRanges 判据以接受 v4 显式取代。
2. **TASK-511/512 余量**：3 空态格 + 3 风险详情展开格实跑登记 + in-gate RP-V4-01~07 + `docs/v4-density-baseline.md`。
3. **TASK-514 余项**：`test/design-contract.test.ts`（shim 60/60 + 设计稿 sha256 冻结 + CARD_TYPES 映射）+ `package.json#test:design-contract` + `gate-integrity.test.ts` 的 in-gate 例外说明（**不动 `CHROMIUM_GATES.length === 9`**）。
4. **TASK-515 余量**：18 门禁**严格串行**全跑 + 日志落 `/tmp/opencode/v4-gate-logs/v4-1-r2/`（本轮已落 11 份）+ RP-V4-01~08 全实跑 + 把实测 counts 写入 v4 台账 `counts`（现仍为 `null` + note）。
5. **plan.md 勘误**：父 `plan.md` ADR-V4-005 的 `#risk-detail` 重复 id（本叶实现已按唯一 id 落地并有静态断言，plan 文件本身的勘误注仍未加）。

## A.7 修订记录（续）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v2.0 | R2 收尾轮：探测中断现场（7 文件留场，全部续用）；TASK-508/509/510 实跑确认（l0 203 / l1 108 / l2 73，全绿）；insight/binding 选择器重锚（116 / 192 全绿，binding 保护段字节零改）；`test:density` 换口径重定标 + `docs/v4-density-baseline.json` 25 格实跑登记（PASS）；体积五要素中间重登记（375,102 → 385,319 B；ceiling 404,584）；v4 台账补全（24 entries / 75 modifiedRanges / 15 逐字登记清单 / counts 口径）；`npm test` 841/841 绿。**TASK-513 与 TASK-514 余项未完成 ⇒ 本叶仍未达 builded**，不得进入 review/validate。 | 2026-09-19 | SDDU Build Agent |


---

# 附录 B — R3 终收轮（2026-09-19，幂等式收口）

## B.1 中断现场探测结论（幂等第一步）

| 项 | 实测 |
|----|------|
| HEAD | `5cf1ba8`（R2 收尾轮提交；`git log --oneline -3` 复核） |
| 工作区 | **干净**（`git status --porcelain` 空）—— R2 的六门禁绿 + 体积五要素已落盘 |
| 分支 | `feature/web-cli-plugin`（ahead 3 of `origin/feature/web-cli-plugin`） |
| R2 报告 §9 的 5 项未完成 | **R3 逐项闭环**（见 B.2） |
| 既有现场改动 | 无（R3 全部改动为本轮新增） |

## B.2 逐项闭环（R2 报告 §9 原文 → R3 结论）

| # | R2 遗留项 | R3 结论 | 证据 |
|:--:|------|:--:|------|
| 1 | TASK-513 journey 八步（ADR-V4-008） | ✅ **完成（①~⑧）** | 见 B.3；新 pin `43054..55259 / e2b500df…`；`#15b ≥65`、`#15c` 法四、`#log`→`#stream`；`modifiedRanges` 29 条（base 行号）+ 18 条 entries（`V41-R3-E-*`）；redlineRemap 三条 `landed`；RP-V4-08 三情形 in-gate 反证 |
| 2 | TASK-514 余量（design-contract + gate-integrity） | ✅ **完成** | `test/design-contract.test.ts`（6 条判据 / shim 实跑 60/60 / sha256 冻结 / 60 行映射表 / CARD_TYPES）+ `package.json#test:design-contract`；gate-integrity **in-gate 例外 +1 条 + R4b 模式断言 8 条**（`CHROMIUM_GATES.length === 9` 与 `EXPECTED_AUDITED_FILES` **均未动**，见 B.7 登记差异） |
| 3 | TASK-511/512 余量（3 空态 + 3 风险详情 + RP-V4-01~07 + `.md`） | ✅ **完成** | density 31 格（阶段 B2 新增 6 格）；RP-V4-01~07 七条驱动（`--reverse` 全绿）；`docs/v4-density-baseline.md` 新建；`perCardBudget` 口径登记 |
| 4 | TASK-515（19 门禁串行 + counts 实测） | ✅ **完成** | B.6 门禁账（19/19 绿）；counts 全部实测填充（B.8） |
| 5 | plan.md 勘误（ADR-V4-005 `#risk-detail` 重复） | ✅ **完成** | 父 `plan.md` 删除重复行 + 就地勘误注 + 修订记录 v1.0.1 一行 |

## B.3 TASK-513 journey 保护段八步（old → new）

| 步 | 内容 | 结果 |
|:--:|------|------|
| ① | 记录 old | `test/ui/journey.mjs` `42766..54004` / sha `6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63` / 185 行；**可机核**：`git show 187c205:test/ui/journey.mjs` 按同一锚点复算 == old sha ∧ old startByte（`supersession-ledger.test.ts` 新判据逐条实跑） |
| ② | 逐段决策 | journey `supersede` / binding `keep` |
| ③ | `#15a~#15q` 同编号等价改写 | 见下表 |
| ④ | `modifiedRanges[]` | **29 条**（base `c2c0e0d` 行号，逐行区间；语义由 18 条 entries 逐条给出） |
| ⑤ | 新 pin | `startByte 43054 / endByte 55259 / sha256 e2b500df9049f69979892076ad798fabfc4a638a3403902c7e57d7f1e1ac244f / lineCount 194`；`status:"active"` + `supersededFrom:"6b45c3fa…"` + `supersededOn:"2026-09-19"` + `leafBase:"187c205"` |
| ⑥ | 计数守恒 | journey runtime-check-calls = **167**（下界 167，EXIT=0） |
| ⑦ | `redlineRemap[]` 三条 | ① ≥45% → **≥65.0%**（spike 12/12 最差 0.7273）② `#log ≥589px` → **比例下界 0.65**（+ 等价几何下界 488px）③ composer 贴底 → **法四**；三条 `status` 均为 `landed` |
| ⑧ | RP-V4-08 反证 | 段内改 1 字节 ⇒ **FAIL**；段外改 1 字节 ⇒ **不红**；还原后逐字节 sha256 复核（in-gate，`supersession-ledger.test.ts`） |

**同编号等价改写表（`#15a~#15q`）**

| 编号 | v3 原判据 | v4 等价改写 | 强度 |
|:--:|------|------|:--:|
| `#15a` | `logFlexGrow === '1'`（`#log`） | `regionStreamFlexGrow === '1'`（`#region-stream`） | 等价 |
| `#15b` | 稳态消息区占比 `> 45vh` | 稳态**聊天流**（`#region-stream`）占比 **`≥ 65.0%`** | **收紧** |
| `#15c` | composer 贴底 `gap ∈ [0,12]` | **法四**：默认屏无可见常驻输入框 ∧ `#composer` 存在时必须 `hidden` ∧ 全文档零可见 `input/textarea/select/[contenteditable]` | **提高** |
| `#15d` | 文档级无水平溢出 | 不变 | = |
| `#15e` | `#panel-top`/`#panel-bottom` 存在 | `#region-toolbar`/`#region-statusbar` 存在（三区结构） | 等价 |
| `#15f~#15w` | 工具卡片族 | 逐条不变，仅 `logOverflowX` 读数目标 `#log`→`#stream` | = |
| `#15p/#15r/#15s/#15t` | 滚动跟随策略 | 逐条不变，仅滚动容器 `#log`→`#stream` | = |
| `#15q` | 320px 无水平溢出 | 读数目标 `#log`→`#stream` | = |

**保护段外等价改写（同样逐条登记）**：`#14b~#14i`（Markdown 渲染）`#log`→`#stream`；`#33f/#33l/#33n/#33o` `#panel-main`→`#region-stream` 且 **`#33n` 改测「消息条目（`.entry`）文本总长」**（v4 把提示带/占位宿主同构迁入 `#stream`，整段 `textContent` 不再是 v3 的量）；`#16d~#16g` 补「坐标点击 miss 时回落元素自身 click()」前置（会话切换器现在落在可滚动的设置视图内）；`#16p~#16t` 补「先 `#settings-back` 切回聊天」前置（`openStatusDetails()` 在 v4 = 进入设置视图）。

**binding 保护段**：`test/ui/binding.mjs` 本轮**零改动**（`git diff 187c205` 只包含 R2 已登记的选择器重锚），保护段 `107780..115930` sha `be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936` **逐字节不变**（R3 复核）。

## B.4 密度 31 格全表（实测 2026-09-19）

`9 强制（3 档 × 3 视口；risk 档那一行由 15 个风险子场景格承载）+ 15 风险 + 3 空态 + 3 风险详情展开 + 1 worst = 31`

| 档 | 320 | 400 | 520 |
|---|---|---|---|
| `default` | C1=5 C2=6 C3=15 C4=4 chars=181 | 同 320 | C1=5 C2=6 C3=15 C4=4 chars=184 |
| `firstRun` | C1=5 C2=6 C3=15 C4=4 chars=184 | 同 | 同 |
| `risk`（5 子场景） | C1=6 C2=6~7 C3=17 C4=4 chars=203~227 | 同 | 同 |
| `risk.worst` | **C1=6 C2=7 C3=17 C4=4 chars=227** | — | — |
| **`empty`（R3 补齐 3 格）** | C1=5 C2=6 C3=15 C4=4 **chars=184** | **chars=184** | **chars=187** |
| **`riskDetailOpen`（R3 补齐 3 格）** | C1=6 C2=8 C3=18 C4=4 **chars=239** | **chars=239** | **chars=239** |

- 补齐的 6 格为**实跑值**（禁推测值）；`empty` 的 chars 跨视口差 3（站点摘要 `nowrap+ellipsis`，与 default 同因）。
- **夹具序纪律（R3 发现并修正）**：两组新增格必须在既有 A/B/C **之后**执行 —— 首次把它们插在 B 与 C 之间时，`risk(staleRef)@400/520` 的 `chars` 从登记值 203 漂到 206（宽度敏感的站点摘要 + 夹具序），阶段 F 立即报漂移。移到 C 之后，既有 25 格**逐格复现**。该纪律已登记进 `knownLimitations`。

## B.5 RP-V4-01~07 反证（in-gate，逐条实跑）

| 编号 | 注入 | FAIL 段诊断断言 | EXIT | 还原 |
|:--:|------|------|:--:|:--:|
| RP-V4-01 | 卡内注入第 7 个可点（`atomicCardsProbe`，注入→读数→还原同一同步块） | 含「卡内可点 7 > 6」 | 0 | 移除后 PASS |
| RP-V4-02 | 空态首屏注入到 3 张卡 | 含「首屏可见卡 3 > 2」 | 0 | 移除后 PASS |
| RP-V4-03 | a) 第 2 张欢迎卡；b) 欢迎文本 >8 行（300 字符 ⇒ 9 行） | a)「欢迎卡 2 > 1」b)「文本行 9 > 8」 | 0 | 两半均还原后 PASS |
| RP-V4-04 | `display:none`/`visibility:hidden`/`opacity:0`/`pointer-events:none` ⇒ C1 不降；`hidden=true` ⇒ C1 必须降 1 | 断言名逐字 | 0 | 还原后 C1 回基线 |
| RP-V4-05 | `dist/pick-layer.js` **+1 B** | 含「超出 1 B」（无容差上限 33,900） | 0 | **逐字节 sha256 复核复原** |
| RP-V4-06 | `#theme-toggle` 移入 `#stream` | `assertChromeNotInStream()` 抛错 ∧ C1 不降 | 0 | 还原后 guard PASS ∧ C1 回基线 |
| RP-V4-07 | 风险 chip 移入 `hidden` 容器 | J3 可见性探针 FAIL | 0 | 还原后 PASS |

**既有 v3 反证的同编号等价重锚（登记）**：`RP-V3-01` 注入量 1→3（v4 默认档 5 可点，5+1=6 不越界；5+3=8 > 7 ⇒ FAIL 诊断文本「C1 8 > 7」逐字不变）；`RP-V3-03` 靶子 `#l0-ref-toggle`（已落入豁免子树）→ `#theme-toggle`；两者的前置基线随之改为「口径值 / 非空」。`RP-V3-04/08/09` 未见变化。
**RP-V4-08**（取代台账）：见 B.3 步⑧。

## B.6 R3 门禁账（19 项严格串行 + 7 条反证；日志 `/tmp/opencode/v4-gate-logs/v4-1-r3/`）

| # | 门禁 | 退出码 | 计数 | 下界 | 结论 |
|:--:|------|:--:|:--:|:--:|:--:|
| 1 | `typecheck` | 0 | 0 error | 0 | ✅ |
| 2 | `build` | 0 | sidepanel 385,319 B | — | ✅ |
| 3 | `npm test` | 0 | **849 / 849 pass / 0 fail** | ≥ max(646, 832) | ✅ |
| 4 | `test:supersession` | 0 | 20 / 20 | ≥14 只增 | ✅ |
| 5 | `test:gate-integrity` | 0 | 12 / 12 | 12 | ✅ |
| 6 | `test:zero-injection` | 0 | 全绿 | — | ✅ |
| 7 | `test:page-input` | 0 | 全绿 | 92 | ✅ |
| 8 | `test:l0` | 0 | **203 / 0** | ≥164 | ✅ |
| 9 | `test:l1` | 0 | **108 / 0** | ≥103 | ✅ |
| 10 | `test:l2` | 0 | **73 / 0** | ≥71 | ✅ |
| 11 | `test:density` | 0 | **169 / 0** | ≥127 | ✅ |
| 12 | `test:ui`（journey） | 0 | **167 / 0** | ≥167 | ✅ |
| 13 | `test:insight` | 0 | **116 / 0** | ≥116 | ✅ |
| 14 | `test:binding` | 1 → **0（复跑）** | 192 / 0 | =192 | ⚠️→✅ 见下 |
| 15 | `test:hardening` | 0 | 24 / 0 | 24 | ✅ |
| 16 | `test:e2e` | 0 | 全绿 | — | ✅ |
| 17 | `test:design-contract` | 0 | 6 / 6（shim 实跑 60/60） | 6 | ✅ |
| 18 | `test:l1-reverse` | 0 | 9 / 9 条反证 | 9 | ✅ |
| 19 | `test:l2-reverse` | 0 | 10 / 10 条反证 | 10 | ✅ |
| + | RP-V4-01~07（`density.mjs --reverse`） | 0 ×7 | 见 B.5 | 7 | ✅ |

**⚠️ 如实登记：`test:binding` 的环境相关抖动。** 首轮串行（R3）第 14 项 exit=1（`#7d/#7e`：「`tabs list --full` 显式返回完整 URL / query 可见」），复跑即 **192/0 EXIT=0**。该门禁依赖**真实 `http://localhost:5173` 页面**与真实 tabs 环境，抖动点在标签页集合（首轮列表里出现了 `LGDL Workbench — http://localhost:5173/`）。**非本叶改动引入**（本叶零 `src/**` 改动；binding.mjs 本轮零改动），但如实记录：门禁本身对宿主环境敏感，**建议后续轮次为该用例加隔离夹具**（未在本叶自行改动，避免越权修改既有门禁语义）。

**反证 harness 的 v4 等价重锚（登记）**：
- `l1-reverse.mjs` RP-L1-H：`[data-l1-panel]` 基数 **8 → 7**（`l1-status` 随 `#l0-status-band` 退役；`l1.mjs` 已断言 7）；注入次数与期望失败文本随之改写，语义（属性改名 ⇒ 枚举断言必须红）不变。
- `l2-reverse.mjs` RP-V33-03：删 1 条 `check(` 在 v4 计数（72）下不再低于 v3 台账下界（68）⇒ 注入量 **1 → 5 条**（72→67 < 68），**期望失败文本逐字不变**；锚点改为按行取前 5 条 `check(` 调用行（消除「断言文本一改写即失效」的脆弱性）。
- `l2-reverse.mjs` RP-V33-06：叶段注入锚点替换为仍满足全部锚点条件（当前存在 ∧ bf5773d 存在 ∧ 不在 base ∧ 不在任何台账登记集合）的一行。

## B.7 登记差异（如实报告，非静默处理）

编排器 R3 指令第 1.2 项写「gate-integrity `EXPECTED_AUDITED_FILES` 追加新 Chromium 门禁文件（不动 `CHROMIUM_GATES.length===9`）」。实际执行：
- **本叶零新增 Chromium 门禁文件**（父 ADR-V4-023 第 7 条与 tasks.md TASK-514 验收明令本叶**不**追加 `EXPECTED_AUDITED_FILES`）⇒ 无文件可追加；
- 实际追加的是 **in-gate 例外说明 1 条**（`in-gate-RP-V4-01~07 · density.mjs`）+ **R4b 模式断言 8 条**（RP-V4-01/02/03a/03b/04/05/06/07 各一条）；
- `CHROMIUM_GATES.length === 9` **未动**；`REVERSE_PROOF_EXCEPTIONS` 条数 **只增**（4 → 5）。
- 另：`test/design-contract.test.ts` 是 **node 门禁**（不在 `test/ui` / `test/e2e` 的 `discoverGateFiles()` 扫描面内），故不影响 `EXPECTED_AUDITED_FILES`；其 `npm test` 归属已登记为「随 `test/*.test.ts` 编译被 `node --test dist-test/test/*.test.js` 执行」+ 独立脚本 `test:design-contract` 两处（见 v4 台账 `designContract`）。

## B.8 counts 实测填充（v4 台账，全部为实测）

| 口径 | 实测 | 下界 | 命令 | 日志 |
|---|--:|--:|---|---|
| `l0` | 203 | 164 | `npm run test:l0` | `test-l0.log` |
| `l1` | 108 | 103 | `npm run test:l1` | `test-l1.log` |
| `l2` | 73 | 71 | `npm run test:l2` | `test-l2.log` |
| `density` | 169 | 127 | `npm run test:density` | `test-density.log` |
| `journey` | **167** | 167 | `npm run test:ui` | `test-ui.log` |
| `insight` | 116 | 116 | `npm run test:insight` | `test-insight.log` |
| `binding` | 192 | 192 | `npm run test:binding` | `test-binding-rerun.log` |
| `hardening` | 24 | 24 | `npm run test:hardening` | `test-hardening.log` |
| `sidepanelView` | 38 | 38 | `npm test` | `test.log` |
| `nodeTestRuntime` | **849** | 832 | `npm test` | `test.log` |

## B.9 体积与红线核验（R3 复测）

| 项 | 值 | 判定 |
|---|---|---|
| `dist/sidepanel.js` | **385,319 B** | ≤ ceiling 404,584 = `floor(385,319 × 1.05)` ✅（五要素中间重登记已在 R2 完成；R3 零产物改动 ⇒ 无需再次重登记） |
| `dist/content.js` | **177,076 B**（`src/content/**` 零 diff） | 逐字节不变 ✅（无容差） |
| `dist/pick-layer.js` | **33,900 B** | 逐字节不变 ✅（无容差） |
| `manifest.json` / `src/background/**`（KIND_SET）/ 判定链 | 零 diff | ✅ |
| `docs/v3-density-baseline.json` / `docs/v3-supersession-ledger.json` | 零 diff（逐字冻结） | ✅ |
| binding 保护段 `107780..115930` | sha `be9ad0e9…` 逐字节不变 | ✅ |
| journey 保护段新 pin | `43054..55259` / sha `e2b500df…` | ✅（台账机核） |
| `PENDING_ABSOLUTE_CAP` | `resolved:false` 且未预填 | ✅（下游 v4-4 收口） |
| 密度阈值 | `7/15 · 9/20 · 17/35` 逐字不变 | ✅ |

## B.10 未完成 / 风险

- **本叶内：无未完成项。** 15 个原子任务（TASK-501~515）全部闭环；19 项串行门禁 + 7 条 RP-V4 反证全绿（`test:binding` 首轮抖动的如实登记见 B.6）。
- **下游义务（非本叶缺口，已在 v4 台账 `knownGaps` 登记）**：`data-transitional-host` 占位宿主 5 个待 v4-4 收口清零；`PENDING_ABSOLUTE_CAP` 待 v4-4 带值闭合；v4-2 落 7 主类卡后需重审「卡口径」。
- **风险**：`test:binding` 的宿主环境敏感性（真实 `http://localhost:5173` + 真实 tabs）建议后续轮次补隔离夹具。

## B.11 修订记录（续）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v3.0 | **R3 终收轮**：幂等探测（HEAD `5cf1ba8`，工作区干净）；TASK-513 journey 保护段八步全闭环（old 可机核 → 同编号等价改写 → 新 pin `43054..55259 / e2b500df…` → 计数 167 → redlineRemap 三条 landed → RP-V4-08）；TASK-514 余项（`design-contract.test.ts` 6 判据 + `package.json#test:design-contract` + gate-integrity in-gate 例外/模式断言）；TASK-511/512 余量（31 格含 3 空态 + 3 风险详情展开，`--reverse RP-V4-01~07` 全绿，`docs/v4-density-baseline.md`）；TASK-515（19 项串行门禁 + counts 实测填充 + 体积/红线复核）；父 `plan.md` ADR-V4-005 勘误；`test/ui/l1-reverse.mjs` / `l2-reverse.mjs` / `test/insight-tree-hierarchy.test.ts` 三处 v3-era 判据的 v4 等价重锚（逐条登记进 v4 取代台账）。**本叶达 `builded`**，可进入 `@sddu-review`。 | 2026-09-19 | SDDU Build Agent |
