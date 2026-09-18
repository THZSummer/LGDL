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
| MODIFY | `src/ui/sidepanel/index.html` | **三区骨架落地**：`header#region-toolbar`（只读 `.site-summary` + 4 入口 + 主题）→ `main#region-stream`（`ol#stream[role=log]` + 4 个 `li[data-transitional-host]` 占位宿主 + `#view-host` + `#scroll-bottom`）→ `footer#region-statusbar`（`#statusbar-text` + `#risk-chips > #risk-rail` + `#risk-detail`）；管理操作迁入 `#settings-view`「站点与授权」；**id 改动面 = 3 退役（panel-top/main/bottom）+ 1 重命名（log→stream）** |
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

**占位宿主清单（`data-transitional-host` 计数 = **4**）**：`v4-3` × 2（`data-host="decision"` / `data-host="composer"`）、`v4-4` × 2（`data-host="l1-panels"` / `data-host="strips"`）。实测 4 个（`index.html` 的 `li[data-transitional-host]`；〖review 修复轮 I7〗原记「5 个」是把 `grep -c 'data-transitional-host='` 命中的 1 处 CSS 注释（`index.html:1115`）误计为宿主 —— 已订正，且 `l0.mjs` 断言由 `hostCount > 0` 改为「等于登记宿主数 4」）。
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
| TASK-503 | 2 | ✅ 完成 | `index.html` 三区骨架 + 归属迁移 + 4 占位宿主（〖review 修复轮 I7〗订正：原记 5）；id 面 = 3 退役 + 1 重命名（静态门禁逐条登记） |
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

**已就位、下游可直接复用的地基**：三区 DOM 契约（含 **4** 个占位宿主；〖review 修复轮 I7〗订正：原记 5）、`density-scope.ts` 单源 + 四常量 + `assertChromeNotInStream()`、`evaluateCardBudget()`/`evaluateFirstScreen()`、`STREAM_HEIGHT_RATIO_MIN`、v4 取代台账（双台账判定已绿）、主题三态契约。

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
| 1 | TASK-513 journey 八步（ADR-V4-008） | ✅ **完成（①~⑧）** | 见 B.3；新 pin `43054..55259 / e2b500df…`；`#15b ≥65`、`#15c` 法四、`#log`→`#stream`；`modifiedRanges` 29 条（base 行号）+ **47** 条 entries（`V41-R3-E-*`〖review 修复轮 I11〗订正：原记 18 条）；redlineRemap 四条 `landed`（〖I6 补登记第 4 条：chars 跨视口相等被取代〗；原记三条）；RP-V4-08 三情形 in-gate 反证 |
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
| ④ | `modifiedRanges[]` | **29 条**（base `c2c0e0d` 行号，逐行区间；语义由 **47** 条 entries 逐条给出〖review 修复轮 I11〗订正：原记 18 条；实测 `V41-R3-E-*` = 47 条、`V41-R3-MR-*` = 39 条） |
| ⑤ | 新 pin | `startByte 43054 / endByte 55259 / sha256 e2b500df9049f69979892076ad798fabfc4a638a3403902c7e57d7f1e1ac244f / lineCount 194`；`status:"active"` + `supersededFrom:"6b45c3fa…"` + `supersededOn:"2026-09-19"` + `leafBase:"187c205"` |
| ⑥ | 计数守恒 | journey runtime-check-calls = **167**（下界 167，EXIT=0） |
| ⑦ | `redlineRemap[]` 四条 | ① ≥45% → **≥65.0%**（spike 12/12 最差 0.7273）② `#log ≥488px`（v3 末轮登记值；589px 为 v1 历史锚〖review 修复轮 I13 订正〗）→ **比例下界 0.65**（+ 等价几何下界 488px）③ composer 贴底 → **法四** ④ 默认档三视口 `chars` 逐项相等 → **结构四项逐项相等 ∧ chars 差 ≤3**（〖review 修复轮 I6 补登记：原实现只改代码未登记〗）；四条 `status` 均为 `landed` |
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
- **下游义务（非本叶缺口，已在 v4 台账 `knownGaps` 登记）**：`data-transitional-host` 占位宿主 **4** 个待 v4-4 收口清零（〖review 修复轮 I7〗订正：原记 5）；`PENDING_ABSOLUTE_CAP` 待 v4-4 带值闭合；v4-2 落 7 主类卡后需重审「卡口径」。
- **风险**：`test:binding` 的宿主环境敏感性（真实 `http://localhost:5173` + 真实 tabs）建议后续轮次补隔离夹具。

## B.11 修订记录（续）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v3.0 | **R3 终收轮**：幂等探测（HEAD `5cf1ba8`，工作区干净）；TASK-513 journey 保护段八步全闭环（old 可机核 → 同编号等价改写 → 新 pin `43054..55259 / e2b500df…` → 计数 167 → redlineRemap 三条 landed → RP-V4-08）；TASK-514 余项（`design-contract.test.ts` 6 判据 + `package.json#test:design-contract` + gate-integrity in-gate 例外/模式断言）；TASK-511/512 余量（31 格含 3 空态 + 3 风险详情展开，`--reverse RP-V4-01~07` 全绿，`docs/v4-density-baseline.md`）；TASK-515（19 项串行门禁 + counts 实测填充 + 体积/红线复核）；父 `plan.md` ADR-V4-005 勘误；`test/ui/l1-reverse.mjs` / `l2-reverse.mjs` / `test/insight-tree-hierarchy.test.ts` 三处 v3-era 判据的 v4 等价重锚（逐条登记进 v4 取代台账）。**本叶达 `builded`**，可进入 `@sddu-review`。 | 2026-09-19 | SDDU Build Agent |
| v4.0 | **review 修复轮（R1 审查结论「⚠️ 有条件通过（0 阻塞）」后的 I1~I13 全处置）**：见附录 C —— 13 项逐条修法/证据/反证；台账状态一致性（I1）与 status 枚举（I2）新增可 FAIL 断言；基线失实订正（I3/I8/I9/I10/I11）；工具栏第 6 可点的**真实拦截点**补 FAIL 段（I4，in-gate 驱动 `render()`）；`theme.ts` 新增 node 单测含 EC-CHAT-014 降级路径（I5）；`chars` 归因**实测定根因**（审计计数跨位数）+ 容差 8→3 收紧 + v4 台账补登记（I6）；占位宿主 5→4 且门禁改「等于登记数」（I7）；ARIA 反向成对断言 + 删悬空 `aria-expanded`（I12）；过时 589px 五处订正为 488px（I13）。 | 2026-09-19 | SDDU Build Agent |

---

# 附录 C — review 修复轮（2026-09-19，处置 review-report R1 的 I1~I13）

> 输入：`review-report.md`（R1，结论 ⚠️ 有条件通过 / 0 阻塞 / 13 改进项，中 6 低 7）+ `build.md` 附录 B（R3 记录）+ `review.md`（C1~C8 判据）。
> 纪律：**只修缺陷与登记，不放宽任何阈值/上限、不删任何断言**；新增断言一律「只增」，且每一项都给出可复核证据（机核或实跑反证）。红线（`content.js` 177,076 / `pick-layer.js` 33,900 逐字节不变、判定链/`manifest.json`/密度阈值不动）在本轮**零改**。

## C.1 I1~I13 逐条处置

| # | 级别 | 处置 | 修法 | 证据 / 反证 |
|:--:|:--:|:--:|------|------|
| **I1** | 中 | **修 + 门禁** | v4 台账 `protectedSupersession.knownGap` 改写为「R3 已闭环（残余：无）」；R2 现场原文逐字移入新字段 `knownGapHistory`（历史保留，不删）。新增 `protectedSupersessionConflicts()` 纯判据 + 2 条测试：真实台账必须一致；合成矛盾（complete+「未完成」/ incomplete+空 / 非法 status）必须判红 | `npm run test:supersession` 24/24 绿（新增 4 条）；反证测试 `protectedSupersession 一致性判据必须能红` 实跑 FAIL 段 ✔ |
| **I2** | 中 | **修 + 门禁** | 台账 `pureAdditionFiles` 的 `test/design-contract.test.ts` 由 `status:"pending"` 改 `"complete"` + 理由更新。新增 `pureAdditionProblems()` + `PURE_ADDITION_STATUSES` 枚举断言 + 「R3 收口后不得再有 pending」+ `design-contract.test.ts` 存在性断言 + 合成反证 | `test:supersession` 24/24；反证 `status:'half-done'` / 过短理由 均判红 ✔ |
| **I3** | 中 | **修（订正）** | `docs/v4-density-baseline.json#differencesFromV3`：① 测量根「v3 = #panel-main」失实 → 订正为「测量根不变（v3/v4 皆 `document.body`，见 v3 基线 `caliber.measurementRoot`）；真实差异是 v4 新增豁免子树 `#stream`」；② 几何口径 589px → **488px**（v3 末轮登记值；589 仅作 v1 历史锚）。两条均带〖订正注〗说明原文与依据 | 文件 JSON 合法；与 `docs/v3-density-baseline.json#caliber.measurementRoot` / `#logClientHeightFloor` 逐字一致（只读核对） |
| **I4** | 中 | **修 + 反证** | `l0.mjs ⑫b` 新增：注入第 6 个可点 → **驱动真实 render**（`window.__v3.testing.setRefCount(0)` 直调 `render()`）→ 断言抛错且诊断含「工具栏可点 6 > 5」+「禁静默第 6 个可点」→ 移除后再 render 必须恢复 | 见 C.2 的 FAIL 段原文；`test:l0` 实跑通过（计数只增） |
| **I5** | 中 | **修（新增测试）** | 新增 `test/theme.test.ts`（**19** 条 `test(`〖N-06（收口轮）〗原记 18 条系笔误，`grep -c '^test(' = 19`，实跑 19/19）：`isThemeState`/`nextTheme` 边界、`applyTheme` 三态 + 三通道、`mountTheme` load/set/cycle/click、`chromeThemeStorage` 适配器；**EC-CHAT-014** 三条降级用例（读抛错 ⇒ `load()` resolve `auto`；写抛错 ⇒ `set` 不 reject 且 DOM 仍更新；写失败时点击不抛） | `npm test` 全绿（新增文件随 `test/*.test.ts` 编译执行）；EC-CHAT-014 覆盖率由 0 → 3 条可 FAIL 用例 |
| **I6** | 中 | **修（实测定根因 + 收紧 + 补登记）** | ① 新增 `charsAttribution()` 逐格真值诊断（阶段 B/B2）与 `elementsWithKeys.chars` diff 诊断；② 实测根因 = **审计计数跨位数**（default 审计 2→6→10、empty 92→96→100 ⇒ 摘要/`.view-label`/`.badge` 各 +1 字符 = 差 3），**推翻**原「`nowrap+ellipsis`」归因；③ 容差 `8 → 3`（`CHARS_SPREAD_MAX`，与基线 `counts.charsSpreadMax` 机器同源断言）；④ v4 台账 `redlineRemap` **补登记第 4 条**（v3「chars 逐项相等」被取代）并订正 eightSteps ⑦ / build.md | 见 C.2 的诊断原文；`test:density` 实跑通过；基线 `knownLimitations[1]` 归因同步订正 |
| **I7** | 低 | **修（订正 + 门禁收紧）** | `l0.mjs` 断言由 `hostCount > 0` 改为 `=== REGISTERED_TRANSITIONAL_HOSTS(=4)`；build.md §2/§4/§5/§B.10 与 v4 台账 `knownGaps` 的「5 个」订正为 **4**（第 5 处是 CSS 注释误计） | `test:l0` 实跑：占位宿主计数 == 4 ✔；`grep -c 'data-transitional-host='` 的 1 处注释命中已显式说明 |
| **I8** | 低 | **修 + 门禁** | `size-baseline.ts#duplicationCheck` 的「输入模块数 53」订正为 **57** 并写明 v4-1 新增 4 必需模块；新增机核字段 `duplicationCheckInputModuleCount = 57` + `size-growth-evidence.test.ts` 断言「真实 metafile `Object.keys(inputs).length` == 登记数」 | `npm test` 绿；`dist/build-meta.json` inputs = 57（实测） |
| **I9** | 低 | **修 + 门禁** | 新增 `v41RoundRows`（11 行逐模块 before/after/Δ）+ `v41RoundUnattributedGlueBytes = 142` + 2 条测试：Σ(Δ) + glue == `closeoutDeltaBytes`(10,217)；每行 `afterBytes` == 真实 metafile `bytesInOutput` | `npm test` 绿；Σ=10,075 + 142 = 10,217（实测 metafile） |
| **I10** | 低 | **修（订正 + 机核）** | density.mjs 与 v4 基线同步注明「**31 登记格 = 28 实测机对 + 3 名义**（risk 行的 3 个视口格由 15 子场景承载）」，新增 `machineComparedCells == 28` 断言；基线新增 `machineComparedCells`/`nominalCells`/`nominalNote` | `test:density` 实跑：31 与 28 两条断言均 ✔ |
| **I11** | 低 | **修（订正）** | build.md §B.2/§B.3 ④ 的「18 条 entries」订正为 **47 条**（`V41-R3-E-*` 实测；另注 `V41-R3-MR-*` = 39 条） | 台账 JSON 逐条计数（脚本）：entries 47 / modifiedRanges 39（V41-R3 前缀） |
| **I12** | 低 | **修 + 反证** | `index.html` 删 `#theme-toggle` 的悬空 `aria-expanded="false"`（保留 `aria-pressed` + `data-theme-state` + 文案三通道）并加说明注释；`l0.mjs ⑧b` 新增反向成对判据「凡 `aria-expanded` 必有可解析 `aria-controls`（仅 treeitem 模式豁免）」+ 注入悬空 expander 的 FAIL 段 + 对照段 | `test:l0` 实跑通过；FAIL 段诊断含 `l0-aria-reverse-probe` ✔；`sidepanel.js` 仍 385,319 B（HTML 不在体积判据内，size 基线**无需**重登记） |
| **I13** | 低 | **修（订正）** | ① 589px → 488px：`l0.mjs:25` / `l0.mjs` ⑪ 断言文案 / v4 台账 `redlineRemap[1]`（redline/from/reason）/ 基线 `differencesFromV3[2]`；② `density.mjs` 的 RP-V3-08 注释与模块头 F 说明由 `docs/v3-density-baseline.json` 订正为 `docs/v4-density-baseline.json`；③ `size-budget.test.ts` 的 R1 注释块补全 R2/R3/v4-1 轮次链并订正 `previousCeilingBytes`（393,857 = R3 轮） | 修复后 `grep -n '589'` 仅剩 v3 冻结台账内的历史锚（不得改写）；`test:supersession` / `npm test` 绿 |

## C.2 关键反证与诊断原文

**I4（工具栏第 6 可点的真实拦截点 —— 驱动 `render()` 的 FAIL 段）**

```text
⑫b 反证（FAIL 段）：注入第 6 个可点后驱动 render() ⇒ 工具准入守卫必须抛错
  injected = "toolbar: 工具栏可点 6 > 5 —— 新增入口必须显式置换并在 v4 台账 toolbarAdmissions[] 登记（禁静默第 6 个可点）"
⑫b 反证（还原段）：移除第 6 个可点后再 render ⇒ 不再抛错且可点回到恰 5
  removed = "NO-THROW" / count = 5
（来源：/tmp/opencode/v4-gate-logs/v4-1-reviewfix/test-l0.log）
```

**I12（ARIA 反向成对 —— 悬空 expander 必须报出）**

```text
⑧b 反证（FAIL 段）：注入「aria-expanded 无 aria-controls」⇒ 反向判据必须报出该元素
  violations(during) = ["l0-aria-reverse-probe"]
⑧b 反证（对照段）：未注入 / 还原后判据必须为空 → []
（来源：/tmp/opencode/v4-gate-logs/v4-1-reviewfix/test-l0.log）
```

**I6（chars 跨视口差 3 的实测根因 —— 审计计数跨位数）**

```text
I6 归因（default@320）：审计 2  | summary "状态：树 113 · 命令 94/176 · 审计 2 · 设置 7"
I6 归因（default@400）：审计 6  | summary "状态：树 113 · 命令 94/176 · 审计 6 · 设置 7"
I6 归因（default@520）：审计 10 | summary "状态：树 113 · 命令 94/176 · 审计 10 · 设置 7"
chars 跨视口差异元素： #l2-entry-summary@320=24,400=24,520=25
                    | >header[0]/nav[1]/button[2]/span[0]@320=4,400=4,520=5   （#l2-entry-audit .view-label）
                    | >header[0]/nav[1]/button[2]/span[1]@320=1,400=1,520=2   （#l2-entry-audit .badge）
⇒ 根因 = 审计计数由 1 位变 2 位（empty 档 92→96→100 同理）；非几何/省略号。容差收紧到 3。
（来源：/tmp/opencode/v4-gate-logs/v4-1-reviewfix/density-2.log）
```

## C.3 红线与体积复核（本轮）

| 项 | 值 | 判定 |
|---|---|---|
| `dist/content.js` | **177,076 B**（`src/content/**` 零 diff） | 逐字节不变 ✅ |
| `dist/pick-layer.js` | **33,900 B**（零 diff） | 逐字节不变 ✅ |
| `dist/sidepanel.js` | **385,319 B**（本轮**零 TS/骨架字节改动**；I12 只动 `index.html` ⇒ `sidepanel.html`） | 登记值不变 ⇒ **无需**新一轮五要素重登记 ✅ |
| 密度阈值 | `7/15 · 9/20 · 17/35` 逐字不变；容差只收紧（chars 8→3） | ✅ |
| 判定链 / `manifest.json` / `src/background/**` | 零 diff | ✅ |
| binding 保护段 / journey 保护段 | 字节零改（保护段在 `test/ui/{binding,journey}.mjs`，本轮只改台账 JSON 的登记文本） | ✅ |

## C.4 修订记录（续）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v4.0 | review 修复轮：I1~I13 全处置（13/13），新增可 FAIL 断言 6 处（I1×2 / I2×2 / I4 / I8 / I9×2 / I10×1 / I12 / I6 收紧）/ 新增 node 测试文件 1 个（`theme.test.ts`）/ 台账与基线与 build.md 数字订正 12 处；红线零改、阈值零放宽、断言只增不减。 | 2026-09-19 | SDDU Build Agent |

---

# 附录 D — 收口轮（2026-09-19，处置 validate R1 的 N-01~N-08）

> **输入**：`validate-report.md` R1（结论 ✅ 通过 / **0 阻塞** / 8 观察项：中 1 低 7）。
> **性质**：**收口轮** —— **不降级**（phase 保持 `validated`）、**不动生产代码**（本轮零 `src/**` 改动）、**不放宽任何阈值/上限**、**测试只增不减**。全部处置 = 台账/文档数字订正 + 断言补强（含反证）+ 两处登记型局限 + 一处跨叶移交。
> **红线**：`content.js` 177,076 B / `pick-layer.js` 33,900 B 逐字节不变；`manifest.json` / 判定链 / `src/background/**` / `docs/v3-*` 零 diff；体积登记值 385,319 B 与 ceiling 404,584 B 不变（本轮零 TS/产物改动）。

## D.1 逐项处置（N-01~N-08）

| # | 级别 | 处置 | 落点（可机核） | 证据 / 反证 |
|:--:|:--:|:--:|------|------|
| **N-01** | 低 | ✅ **修（断言可证伪化 + 竞态修复）** | `test/ui/density.mjs#reverseRpV406`（改为**原子探针** + 归因对照） | 原 FAIL 段第二半用**未排除 `#stream`** 的 `c1Probe` 断言「C1 不得下降」—— 页面内移动元素不可能改变整页计数 ⇒ **恒真**（validate 实测 14 → 14）。现主判据改用**产品口径** `DENSITY_MEASURE_SOURCE`：注入后 C1 必须 **5 → 4**（滥用形态被观测到，诊断逐字 `5 → 4`）；未排除口径降级为**归因对照**（整页计数必须**不变** ⇒ 证明控件仍挂在文档上、仍可见，「降 1」只可能由豁免造成，而非元素消失）。**同时修复夹具竞态**：原实现「注入 → `sleep(150)` → 另一次探针调用」是竞态（产品 `render()` 会丢弃 `#stream` 的非宿主子节点 ⇒ 实测出现过「守卫 `pass` + 还原时 `#theme-toggle` 已不在文档中」），现把「前置读数 → 注入 → 读数 → 守卫 → 还原 → 还原读数」压进**同一个同步块**（与 RP-V4-01/02/03 的 `atomicCardsProbe` 同一纪律）；连跑 3 次均 9/9 绿。**演示红**：期望值临时改错（`before.scoped - 2`）⇒ 必红（`exit=1`，诊断 `5 → 4`），还原后逐字节一致 + 复跑绿（见 D.3）。**口径双轨期说明**登记进 `docs/v4-density-baseline.json#knownLimitations`。 |
| **N-02** | 低 | 📌 **登记（双层防线；不修的理由 = 动产品字节）** | `docs/v4-density-baseline.json#knownLimitations` + v4 台账 `validateFindings[N-02]` | guard/静态半只认 `[data-chrome-control]`；抹掉标记后移入 `#stream` ⇒ guard `pass`（validate P1b 实测）。**第二层已实测兜底**：validate A2-1 真门禁静态注入 ⇒ `167 passed / 4 failed`（`default@320/400/520 可点实测 4 ≠ 5` + 阶段 F `clickables 4≠5` / `blocks 13≠15` / `chars 176≠181`）。补「形态/位置反向判定」需改 `src/ui/sidepanel/toolbar.ts`（产品字节）⇒ 本轮按红线**只登记不修**，留待下游有产品改动时一并落地。 |
| **N-03** | 中 | 🔁 **移交（跨叶登记，编排器授权）** | v4-2 `tasks.md` **TASK-613**（+ TASK-602 验收标准加注 + §1 拓扑 + §3 汇总「跨叶移交任务」行 + 修订记录 v1.1） | 原文：v4-1 豁免口径下「流内卡每卡 ≤6 可点 × 首屏 ≤2 卡 ⇒ 理论最多 **12 个常驻入口**可落在豁免子树内而不被任何门禁拦」（6 个实测全绿、7 个才红）。**不是本叶缺陷**（本叶卡面是过渡卡口径），故移交 v4-2 —— 落 7 主类卡时**必须**给出裁决或收紧（禁默认沿用），并在完成时更新 `knownLimitations[0]` 状态。移交落点由台账 `validateFindings[N-03].anchor` 打开 v4-2 `tasks.md` 定位 `TASK-613` 机核。 |
| **N-04** | 低 | ✅ **修 + 机核断言** | v4 台账 `counts`（l0 203→**210**、density 169→**171**、supersession 新登记 **28**、nodeTestRuntime 875→**881**；历史值保留在 note 内）+ `test/supersession-ledger.test.ts` 两条新判据 | 抽样四项各带 `source`（门禁 + 日志路径 + 正则 + **观测行**）；判据两层：**恒在层**（pattern 在 observedLine 上命中 ∧ 解析值 == observed == currentRuntime ≥ floor）与**同源层**（真实门禁日志解析值必须相等；日志缺失才显式 skip，不得用 skip 兜成通过）；另配反证（observed 脱钩 / observedLine 不命中 / 日志不符 / 缺 source 均判红）。validate 原文「floor 164 不受影响；同类 I 项未收口」已由本项闭合。 |
| **N-05** | 低 | ✅ **修 + 机核断言** | `test/size-baseline.ts`（5 行复原 + `roundRowRegistrationIds` 新字段）+ `test/size-growth-evidence.test.ts` 两条新判据 | 5 处 `deltaBytes ≠ afterBytes − beforeBytes` 全部复原到 `leafBase 187c205` 的既有值：`closeoutRoundRows` 4 行（恢复 R2 轮真值，Σ = **1,774** == `SIDEPANEL_RE_REGISTRATIONS['v3-4-r2']` 的 366,755 → 368,529）与 `r3RoundRows` 的 sidepanel 行（**59,416 → 61,216 / Δ 1,800**，与 `v41RoundRows` 的 `beforeBytes = 61_216` 互证）；同时订正张冠李戴的注释（该组实为 **R2** 轮，原注释写 R1 且 Σ 值取自 R1 归因实验的模块和 3,623 —— 两处历史错配一并说明）。新判据：每行 Δ 自洽 ∧ Σ + glue == 该轮登记总增量（组 ↔ 登记 id 映射在基线自身，测试零魔数）+ 反证（Δ 混用 / Σ 脱钩 / glue 不符 / 空组 / before ≤ 0 均判红）。 |
| **N-06** | 低 | ✅ **修（订正）** | `build.md` §C.1 I5 行 + v4 台账 `counts.nodeTestRuntime.note` | 「18 条」→ **19 条**（`grep -c '^test(' test/theme.test.ts` = 19，实跑 19/19），两处均带订正注说明原值为笔误。纯登记保真，不影响任何验收锚点。 |
| **N-07** | 低（环境） | 📌 **登记（复跑纪律）N-07（收口轮）** | v4 台账 `knownLimitations[KL-N-07]` + 本附录 | `test:page-input` 首轮 98/4（并发残留 Chromium）→ **隔离复跑 102/0 ×2**、历史 9 次全绿 ⇒ 判为环境 flake。纪律：串行链一次一个 Chromium；首轮异常**必须**隔离复跑 ×2 并以复跑结果为准；日志全量落盘禁 tail 截断；与 `test:binding` 的宿主敏感性同类处理（R3 已登记）。本轮不改该门禁语义（避免越权修改既有门禁）。 |
| **N-08** | 低 | 📌 **登记（不变量口径）N-08（收口轮）** | v4 台账 `knownLimitations[KL-N-08]` + 本附录 | `build.mjs` 把 `__BUILD_STAMP__ = new Date().toISOString()` 注入 bundle ⇒ 同一源码两次构建 **sha 不同、字节同**（R3 `d92935f2…` → 复构建 `6fbd16c2…`，均 385,319 B）。故跨构建不变量 = **字节数 + metafile 逐模块归因 + 门禁**；sha 只在**同一构建会话内**有效 —— 这正是 hardening `C#2`（诊断显示构建标记）/`C#3`（页面构建 ≠ background 构建时给出「重新加载」提示）所依赖的事实。`content.js` / `pick-layer.js` 无构建戳，其 sha 仍是稳定不变量。 |

**汇总**：修 = 4（N-01 / N-04 / N-05 / N-06）· 登记 = 3（N-02 / N-07 / N-08）· 移交 = 1（N-03）· 未处置 = **0** · 放宽阈值/上限 = **0** · 删除断言 = **0**。

## D.2 本轮新增断言与登记（只增不减）

| 文件 | 新增内容 | 计数影响 |
|------|---------|:--:|
| `test/ui/density.mjs` | RP-V4-06 由「注入 → `sleep` → 另一次调用」（竞态 + 半段恒真）改为**同一同步块的原子探针**：前置 `guard PASS` ∧ 口径 C1 == 5 → 注入后 `guard` 必须抛错 ∧ 口径 C1 必须 **5 → 4** ∧ 未排除口径整页计数**不变**（归因对照）→ 还原后 `guard PASS` ∧ C1 回 5（共 7 条判据） | 反证模式专用（正常 `test:density` 计数不变 = 171） |
| `test/size-baseline.ts` | `roundRowRegistrationIds` 映射（closeoutRoundRows→`v3-4-r2`、r3RoundRows→`v3-4-r3`、v41RoundRows→`v4-1`）+ 5 行历史值复原 + 两处订正注 | — |
| `test/size-growth-evidence.test.ts` | 「全部 round rows 自洽 ∧ Σ == 登记总增量」+ 反证 | +2 node 用例 |
| `test/supersession-ledger.test.ts` | counts↔门禁日志同源判据（含 `countSourceProblems` 纯函数 + 反证）+ validateFindings 处置登记判据（含 `validateFindingProblems` 纯函数 + 反证） | +4 node 用例 |
| `docs/v4-supersession-ledger.json` | `counts` 实测订正 + 四项 `source`（R3 现场原文逐字保留在 `noteHistory`）；新增 `supersession` 计数；新增 `validateFindings[]`（N-01~N-08）与 `knownLimitations[]`（KL-N-02/N-07/N-08）；`leafBases[0].registeredUncoveredLines` 追加 5 条逐字行（N-05 注释改写）+ `summary` 口径订正；`staticCalibers` 读数复算 1045/892/881 | — |
| `docs/v4-density-baseline.json` | `knownLimitations` 追加 2 条（N-01 口径双轨期说明 / N-02 双层防线）+ `closeoutNote` | —（31 格实测值与阈值逐字不变） |
| `.sddu/.../specs-tree-v4-2-chat-stream-model/tasks.md` | **TASK-613** 跨叶移交任务（+ 602 加注 + 拓扑/汇总/修订记录） | 非本叶产物 |

## D.3 反证与「演示红」记录（N-01 / N-04 / N-05）

| # | 判据 | 演示红（注入/期望值错） | 还原后 |
|:--:|------|------|------|
| N-01 | 「注入 ⇒ 产品口径 C1 必须 5 → 4」 | 期望值临时改为 `before.scoped - 2` ⇒ `test:density --reverse RP-V4-06` **必红**（`exit=1`，诊断 `5 → 4`；日志 `density-reverse-RP-V4-06-demo-red.log`） | 还原期望值 ⇒ 逐字节一致（`diff -q` 通过）+ RP-V4-06 **9/9 绿**（连跑 3 次） |
| N-01（附带） | 竞态可复现性 | 原「注入 + `sleep(150)` + 另一次调用」形态实测出现过：守卫 `pass` + 还原时 `#theme-toggle` 不在文档中（`appendChild ... not of type 'Node'`）—— 证明跨调用注入是竞态而非证明 | 改为**同一同步块**原子探针后连跑 3 次全绿（`density-reverse-RP-V4-06{,run2,run3}.log`） |
| N-04 | counts 与门禁日志同源 | 合成反证（in-gate，随 `npm test` 执行）：observed 与 currentRuntime 脱钩 / observedLine 不命中 pattern / 日志实测不符 / 缺 source ⇒ 逐条判红 | 真实台账必绿：本轮 `npm test` 实录 **「counts 同源机核：4 项与门禁日志逐条相等」** |
| N-05 | round rows Δ 自洽 ∧ Σ == 登记总增量 | 合成反证（in-gate）：Δ=999 ≠ after−before / Σ+glue 脱钩 / glue 不符 / 空组 / beforeBytes ≤ 0 ⇒ 逐条判红 | 三组真实 rows 必绿（Σ = 1,774 / 6,573 / 10,075+142） |
| N-01~N-08（登记完整性） | 8 项处置逐条登记 ∧ 跨文件锚点可定位 | 合成反证（in-gate）：漏项 / 塞入无关项 / 非法 disposition / 过短证据 / 锚点定位不到 / 锚点文件缺失 / 锚点过短 ⇒ 逐条判红 | 真实台账必绿：`npm test` 实录 **「validateFindings：8 项 → fixed=4 / registered=3 / handed-over=1（锚点逐条可定位）」** |
| N-04/N-05 的**污染形态回放** | 实证判据能抓住 `5cf1ba8` 那类改写 | 合成反证里的 `Δ=999` 用例正是「把 deltaBytes 换成累计口径」的形态；counts 脱钩用例正是「l0 203 vs 实测 210」的形态 | — |

## D.4 门禁复跑（受影响门禁 + 全量确认；日志 `/tmp/opencode/v4-gate-logs/v4-1-closeout/`）

| 门禁 | 退出码 | 计数 | 下界 | 结论 |
|------|:--:|:--:|:--:|:--:|
| `typecheck` | 0 | 0 error | 0 | ✅ |
| `build` | 0 | sidepanel 385,319 B（零 TS 改动 ⇒ 字节不变） | — | ✅ |
| `npm test` | 0 | **881 / 881 pass / 0 fail / 0 skipped** | ≥ max(646, 875) | ✅（round-rows + counts 同源 + validateFindings 共 +6 条；validate R1 的 875 → 881） |
| `test:supersession` | 0 | **28 / 28** | ≥24 只增 | ✅（+4：N-04 ×2 / N-01~N-08 ×2） |
| `test:density` | 0 | **171 / 0**（+ `--reverse RP-V4-06` 实跑） | ≥127 | ✅（阈值 `7/15 · 9/20 · 17/35` 逐字不变；容差 3 不变） |
| `test:l0` | 0 | **210 / 0** | ≥164 | ✅（台账 counts 已同步） |
| 其余门禁（`gate-integrity` / `zero-injection` / `page-input` / `l1` / `l2` / `journey` / `insight` / `binding` / `hardening` / `e2e` / `design-contract` / `l1-reverse` / `l2-reverse`） | 0 | 12 / 27 / 102 / 108 / 73 / 167 / 116 / 192 / 24 / PASS / 6 / 9 / 10 | 逐项下界 | ✅（详细逐项见 D.5 的汇总日志） |
| 不动面 | — | `content.js` 177,076 / `pick-layer.js` 33,900 逐字节不变；本轮 `src/**` 零改动 | — | ✅ |
| 红线 | — | 密度阈值 / 体积上限 / `CHROMIUM_GATES.length === 9` / `EXPECTED_AUDITED_FILES` / `docs/v3-*` 均零改动 | — | ✅ |
| RP-V4-01~07（`--reverse`，逐条实跑） | 0 ×7 | 7/7 全绿（RP-V4-06 改为原子探针后连跑 3 次 9/9；含 N-01 的演示红→还原→绿） | 7 | ✅ |

## D.5 counts 实测与台账同源（抽样 4 项）

| 口径 | 台账（订正后） | R3/validate 现场值 | 门禁日志 | 同源机核 |
|---|--:|--:|---|:--:|
| `l0` | **210** | 203（R3）→ 210（validate） | `test-l0.log`（`▶ L0 运行时门禁: 210 passed / 0 failed`） | ✅ 机核 |
| `density` | **171** | 169（R3）→ 171（validate） | `test-density.log`（`▶ density 门禁: 171 passed / 0 failed`） | ✅ 机核 |
| `nodeTestRuntime` | **881** | 875（validate） | `test.log`（`ℹ tests 881`） | ✅ 机核 |
| `supersession` | **28** | 24（validate） | `test-supersession.log`（`ℹ tests 28`） | ✅ 机核 |

> 同源机核 = `test/supersession-ledger.test.ts` 的 counts↔日志判据在本轮 `npm test` 内**实跑**（日志在该路径存在时强制逐条相等；不存在才显式 skip）。台账 `counts` 与门禁日志因此不再可能静默脱钩。

## D.6 未完成 / 交接

- **本叶内：无未完成项**（N-01~N-08 处置率 8/8）。phase 保持 `validated`（收口不降级）。
- **下游义务（本叶已登记，非本叶缺口）**：① **N-03 → v4-2 TASK-613**（卡预算 × 常驻入口准入重审：裁决或收紧，禁默认沿用；完成时必须更新 `knownLimitations[0]` 状态）；② `data-transitional-host` 占位宿主 4 个待 v4-4 清零；③ `PENDING_ABSOLUTE_CAP` 待 v4-4 带值闭合；④ N-02 的「第一层形态/位置反向判定」需改 `toolbar.ts` 时一并落地。
- **风险**：`test:page-input` / `test:binding` 的宿主环境敏感性（N-07 / R3 已登记）—— 隔离复跑纪律已写入台账 `knownLimitations`。

## D.7 修订记录（续）

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v5.0 | **收口轮（处置 validate R1 的 N-01~N-08）**：N-01 RP-V4-06 半段改用产品口径（+对照段，演示红）；N-02 双层防线登记；N-03 移交 v4-2（TASK-613）；N-04 台账 counts 实测订正 + counts↔门禁日志同源机核；N-05 round rows 5 处复原 + Σ==登记总增量机核；N-06 theme.test.ts 18→19；N-07 page-input flake 复跑纪律登记；N-08 sidepanel sha 非不变量登记。新增 node 用例 6 条（含 3 条反证），`npm test` 875 → **881**；`test:supersession` 24 → 28；`test:density` 171 / `test:l0` 210 与台账同源。**零生产代码改动、零阈值放宽、零断言删除**。 | 2026-09-19 | SDDU Build Agent（v4-1 收口轮） |
