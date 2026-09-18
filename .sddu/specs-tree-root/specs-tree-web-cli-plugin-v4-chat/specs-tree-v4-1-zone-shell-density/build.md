# 实施构建报告：specs-tree-v4-1-zone-shell-density（V4-1 三区骨架与密度重定标）

> **文档定位**: SDDU 实施构建产物 — 本叶 15 个原子任务（TASK-501~515）的逐项执行记录与门禁账
> **前置依赖**: 本叶 `plan.md` v1.0 + `tasks.md`/`tasks.json` v1.0 + 父 `plan.md` v1.0 + 本叶/父 `spec.md` v1.0
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-18
> **版本**: v2.0
> **状态**: ⚠️ **未完成（不得视为 builded）** —— R2 收尾轮闭环 TASK-508/509/510/511(部分)/512/514(部分)/515(部分)；**TASK-513（journey 保护段八步）与 TASK-514 的 `design-contract.test.ts` 未完成**，18 门禁串行链未跑完（详见 §7）

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
