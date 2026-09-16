# 构建报告：specs-tree-v3-3-l2-on-demand-views

> **文档定位**: SDDU 实施构建报告 — 记录本叶实际落地的代码 / 门禁 / 体积 / 反证证据，作为 review 与 validate 阶段的输入
> **前置依赖**: 本叶 `spec.md` / `plan.md` / `tasks.md`（9 任务 / 5 波）+ 父 `spec.md`（FR-V3-045~054 / AC-V3-005/010/019/021/026/027）+ 父 `plan.md`（ADR-V3-001~012）+ 本叶 ADR-V3-025~029 + v3-1 / v3-2 落地先例
> **创建人**: SDDU Build Agent
> **创建时间**: 2026-09-16
> **版本**: v1.0
> **更新说明**: 初始创建（逐任务实施 + 逐门禁串行实跑 + 体积**显式重登记**（含增量归因表）+ 本叶新反证 5 条；**含两条必须回报的披露**，见 §1.2 与 §5.3）

---

## 1. 构建概要

| 维度 | 数值 |
|------|------|
| 完成任务数 | **9 / 9**（TASK-301~309；Wave 1→5 按序） |
| 复杂度分布 | S×3（302 / 304 / 308）/ M×5（301 / 303 / 306 / 307 / 309）/ L×1（305） |
| 新增文件 | **6**（5 src：`l2/{counts,view-host,command-catalog,audit}.ts` + `settings/sections.ts`；2 test：`test/l2-counts.test.ts`、`test/ui/l2.mjs`；另 `test/l2-counts.test.ts` 与 `test/ui/l2.mjs` 见 §2.1） |
| 修改文件 | **15**（见 §2.2；口径 = `git status --porcelain`，**逐文件 `git add`**，未用 `git add -A`） |
| 波次 | 5 波按序完成；门禁**严格串行**（一次一个，绝无两个 Chromium 并发） |

### 1.1 门禁结果（逐条串行，日志 `/tmp/opencode/v3-gate-logs/v3-3/f-*.log`）

| 门禁 | 结果 | 计数 / 说明 |
|------|:--:|------|
| `npm run typecheck` | ✅ 0 error | 日志 `f-typecheck.log` |
| `npm run build` | ✅ | `content.js` **177,076 B**（零改动 = 无容差上限）· `sidepanel.js` **349,880 B** |
| `npm test` | ✅ **772 / 772 passed / 0 failed** | 764 → **772**（新增 `test/l2-counts.test.ts` 8 例）；静态口径三读法 905 / 783 / 772 |
| `npm run test:supersession` | ✅ **11 / 11 passed** | 逐行台账判定全命中；本叶 `V33-S1~S14` + `V33-MR-01~06` + 计数复算（772 / 783 / 905）+ `v3GateFloors` 增 `l2.mjs: 68`、`l0.mjs: 68 → 72`；`log` 输出「计数核对：l0 72≥72 / density 60≥60 / l1 64≥64 / l2 68≥68」 |
| `npm run test:density` | ✅ **127 passed / 0 failed** | 三档三视口全过；默认档 **C1=7 / C2=7 / C3=19 / C4=6**（阈值 7/15 未动）；22 登记格机器比对 ✅；`chars` 22 格**逐格 −3**（tighten-only 方向，见 §5.3） |
| `npm run test:l0` | ✅ **160 passed / 0 failed** | 157 → **160**（豁免清空改断「L2 目标默认 hidden」×4、反证真值非零 ×1、常驻一行无数字 +1、摘要带计数 +1、豁免断言本身 −1） |
| `npm run test:l1` | ✅ **103 passed / 0 failed** | 未修改该门禁（零取代） |
| `npm run test:l2`（**本叶新门禁**） | ✅ **71 passed / 0 failed** | 四视图默认零占用 / ≤2 次交互 / 计数同源 / 返回复位 / 单滚动 / 风险位可见 / 树 ARIA+9 动作 / 零提权+clamp / 零明文 / 能力集等价 8 项 |
| `npm run test:ui`（journey） | ✅ **167** assertions | 未修改该门禁（零取代） |
| `npm run test:insight` | ✅ **116** assertions | 108 → **116**（同编号迁移 + 8 条新增，见 §2.2 与 §4） |
| `npm run test:binding` | ✅ **192** assertions | **未修改**（树相关断言为 `getElementById().click()` / DOM 查询，归属迁移不破坏；受保护区段 hash 不变） |
| `npm run test:hardening` | ✅ **24** assertions | 未修改 |
| `npm run test:e2e` | ✅ **PASS**（exit=0） | 全链路（fixture + LGDL Workbench） |
| `npm run test:gate-integrity` | ✅ **9 / 9 passed** | 受审集合 8 → **9**（`l2.mjs` 自动纳入且通过 R1a/R1b/R2/R3） |
| `npm run test:l1-reverse` | ✅ PASS | v3-2 的 RP-L1-A~H + RP-L1-C2（FAIL 段 exit=1 + sha256 复原） |
| 体积三线 | ✅（**本叶触发显式重登记**） | `content.js` 177,076 ≤ 177,076 ✅；`sidepanel.js` **349,880** == 登记基线；ceiling = floor(349,880×1.05) = **367,374**（公式，cap 仍 record-only） |
| 零改动核对 | ✅ | `manifest.json` / `src/content/**` 三 hash / `src/security/{policy,auto-authorize}.ts` / `packages/web-cli-base/**` / `src/ui/options/index.html` / `design/**` / `test/sidepanel-view.test.ts` / `test/perf-budget.test.ts` 全 **0 diff**；`main` 未动（`2ddc922`） |
| 反证（本叶新增 5 条 + 沿用全套） | ✅ 全部 FAIL→还原→PASS | 见 §6（每条附日志路径与 sha256 复原） |
| 人工面（树逐层展开观感 / 窄栏长路径 / 键盘体感 / 明暗观感） | ⏳ **未执行** | 如实登记，**不冒充 PASS** |

### 1.2 ⚠️ 必须回报编排器的两条披露

1. **体积累计增幅越线（>30%）**：从 `266,500 B` 起算，本叶后累计 **349,880 / 266,500 = 1.3129 → +31.29%**（>30%）。
   逐轮：v3-1 `266,500 → 295,225`（+10.77%）→ v3-2 `295,225 → 327,679`（+11.0%）→ v3-2 收口 `328,476` → **v3-3 `328,476 → 349,880`（+6.52%）**。
   ④ 方向性守卫口径（连续两个**功能轮**）：`(349,880 − 295,225) / 295,225 = +18.51% > 15%` → 告警文本已升级并由门禁断言存在。
   **本叶不阻塞**，但按编排器指令**显式列出**：全部增量逐模块可归因（§5.2），无重复实现、无未解释膨胀（必需增量占比 **98.7%**）。
2. **密度登记格 `chars` 收紧 −3（22 格）**：常驻一行状态栏不再承载计数（计数移入入口面板 `#l2-entry-summary` + 四个入口标签），
   逐格 `chars` 由 223 → 220（default）/ 387 → 384（firstRun）/ 各风险格 −3（worst 428 → 425）。
   方向 = **tighten-only**（低于已登记值），按 `docs/v3-density-baseline.json#direction` 的流程**显式重登记**（前值逐格保留在 `previous`）。
   理由：`审计` 计数来自既有 ring buffer，会随面板使用**单调增长**；把它放进被测量的常驻文本会使「同一稳态 ⇒ 三视口逐项相等」不再成立（阶段 A 判据）。

## 2. 文件变更

### 2.1 新增（6）

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| NEW | `src/ui/sidepanel/l2/counts.ts` | TASK-301 | **唯一计数派生点**：`deriveCounts({insightCounts, catalogMeta, auditEntries, settingsSections})` → `{tree, commands:{live,baseline}, audit, settings}`；未知真值 = `null` → 渲染 `…`（**不冒充 0**）；`commandCountText` / `l2EntryLabel` / `l2EntryCount` / `l2StatusBarText` / `L2_VIEW_TITLES` 全部同源 |
| NEW | `src/ui/sidepanel/l2/view-host.ts` | TASK-302 | 视图替换宿主：`#log` ↔ `#view-host` 二选一（`hidden` 属性，**非** CSS 隐身）+ 恰一 `[data-l2-view]` 可见 + 顶部「← 返回」+ 进入时 `disclosure.snapshot()` / 返回时 `restore()` + 焦点进出（标题 `tabindex=-1`）+ 逐目标 aria 对 + Esc（内层组件优先） |
| NEW | `src/ui/sidepanel/l2/command-catalog.ts` | TASK-303 | 命令目录**只读投影**：复用 `archive-catalog#buildArchiveModel`（逐条 `allow/ask/deny` + 来源 + 默认/覆盖/生效分列 + clamp 原因 + delayMs）；`delay` 文案**直取** `TREE_NO_ESCALATION_NOTE`（不另写）；`{live,baseline}` 分列 + `NO_EXAGGERATION_NOTE`；**零控件**（无 button/input/select/textarea）；9 动作白名单只读展示（固定序） |
| NEW | `src/ui/sidepanel/l2/audit.ts` | TASK-304 | 审计视图：**严格字段白名单**（只 pick `tool/subcommand/type/decision/ok/durationMs/ts/origin`，其余字段（`argsSummary` / `detail` / `reason` / args 袋）**构造性丢弃**）+ `stripUrlParams`（URL 去参）+ 零明文声明；渲染七列（id/命令名/动作 id/结果/耗时/时间/站点）；零控件 |
| NEW | `src/ui/settings/sections.ts` | TASK-301/305 | 设置分区**登记表**（7 个 `.wc-section` id，零依赖）：让设置入口的计数**可派生**，从而**删除** v3-1 的 `settings-count` 豁免（见 §4 与台账 `v3SkeletonExemptions._removedInV33`） |
| NEW | `test/l2-counts.test.ts` | TASK-301 | 8 个纯 Node 用例：真值双向派生（Δ 相等）/ 未知 ≠ 0 / `{live,baseline}` 不得退化为单值或合并 / 入口标签 ≡ data-count ≡ 摘要三处同源 / 设置登记表与 `panel.ts` 漂移守卫 / delay 单源 + 9 动作固定序 / 审计白名单 + URL 去参 |
| NEW | `test/ui/l2.mjs` | TASK-306 | L2 运行时门禁（71 断言；单 Chromium 实例、单 page target、日志全量落盘、共享 `_v3-helpers.mjs` 底座 → 元门禁自动纳入） |

### 2.2 修改（15）

| 操作 | 文件路径 | 任务 | 说明 |
|:--:|------|:--:|------|
| MODIFY | `src/ui/sidepanel/index.html` | TASK-305 | ① `#view-host` 填充真实内容：共享 `.l2-header`（`#l2-back` / `#l2-title[tabindex=-1]` / `#l2-count[data-count]`）+ `.l2-views` + 三个 `[data-l2-view]`（`tree`/`commands`/`audit`，默认 `hidden`，`role=region`）；② `#tree-fab` + `#tree-drawer` **原样迁入** `[data-l2-view="tree"]`（id 零重命名；`role="dialog"`+`aria-modal` → `role="region"`；FAB 由 absolute 悬浮改为视图内工具条控件，默认仍 `hidden`）；③ `#settings-view` 加 `data-l2-view="settings"`（**唯一**改动 = 归属标记，v1 视图开关 / `body.settings-open` / `#settings-back` 语义零改）；④ `#l2-entries` 增 `#l2-entry-summary`（承载四类计数）；⑤ `#l0-statusbar-text` 改为**无数字**稳定文案；⑥ 新增 L2 视图 CSS + `#tree-drawer * { scroll-margin-block-start: 72px }`（修 sticky 头部遮挡 scrollIntoView 目标的真实可用性缺陷） |
| MODIFY | `src/ui/sidepanel/sidepanel.ts` | TASK-305 | L2 接线（+215/−3）：`l2Truth` 真值读入（`state.insight.counts` + `audit-export` 回包长度）+ `refreshL2Counts` + `openL2View`（产品路径 2 次交互即出内容；**入口菜单先折叠**再取展开态快照）+ `refreshCatalogView`（每次打开强制重拉，反映当前真值）+ `refreshAuditView` + view-host 挂载（**在 tree drawer 之后**，让抽屉的 Esc 先赢）+ 测试钩子（`openL2View/closeL2View/l2Counts/refreshAudit`）；既有 handler **零删改** |
| MODIFY | `src/ui/sidepanel/view-model.ts` | TASK-305 | `L0Input.counts`（v3-1 占位形状）→ `l2Counts?: L2Counts \| null`；`statusbar` 拆分「无数字 bar 文案」+「带计数面板摘要」；`StateMessageView.insight`（SW 一直在发、此前未声明） |
| MODIFY | `src/ui/sidepanel/l0/shell.ts` | TASK-305 | `openL2` 由「v3-1 骨架直显 `#view-host`」改为「路由到 `l2/view-host.ts`」；**净减 76 B**（临时逻辑被真实实现取代）；风险位仍不参与折叠 |
| MODIFY | `src/ui/sidepanel/l0/status-bar.ts` | TASK-305 | 写 `#l2-entry-summary`；`syncTriggerAria` 改为**逐目标**（三个 entry 跟 `#view-host`，settings entry 跟 `#settings-view`——此前四处共用一个值，对 settings 是假对） |
| MODIFY | `test/ui/l0.mjs` | TASK-307 | ⑥ 的**两个骨架期豁免按登记条件删除**：`SKELETON_EXEMPT_TARGETS` → `[]`（并断言为空）、`L2_COUNT_EXEMPT` → `[]`；settings 纳入「三处同源」；新增「L2 视图目标默认 hidden」×4、「常驻一行无数字」×2、「摘要带四类计数」×1；反证还原段改为**回读原值**（v3-1 写死 `'0'` 在真值计数下会变成第二次篡改） |
| MODIFY | `test/ui/insight.mjs` | TASK-307 | L2 契约迁移（+238/−25，逐条台账 `V33-S1~S9` / `V33-MR-01~06`）：`#I-01e` 改 `position=static` + 归属/语义三连；`#I-20i/#I-20j/#I-20k×2/#I-05~10(开)/#I-19h` 由 `checkLayout` 迁移为 `checkL2OpenLayout`（7 条视图替换判据，同编号同条数）；`#I-14b` 仅订正标签订正；`#I-14c` 升级为「**进入前 == 返回后**逐字段复原」+ 新增 `#I-14c0/#I-14d`；新增 `#I-13a0/a1/a2`、`#I-19a1` 真实点击前置条件；`v3CloseTreeView` + `settleDrawer` + 兜底展开**有界重试**；PASS 摘要文案同步 |
| MODIFY | `package.json` | TASK-306 | 追加 `test:l2`；`test:v3` 串行链插入 `test:l2`；**依赖段零 diff** |
| MODIFY | `test/gate-integrity.test.ts` | TASK-306 | `CHROMIUM_GATES` / `STATIC_ONLY_GATES` 增 `test/ui/l2.mjs`；「必须恰好 8 个」→ **9 个**（集合可增不可缩的口径不变） |
| MODIFY | `test/size-baseline.ts` | TASK-308 | **显式重登记**：`SIDEPANEL_BASELINE_BYTES` 328,476 → **349,880**；`_TIMELINE` 追加；`FINAL_ARTIFACT_BYTES` → 349,880；`_META`（measuredOn / measuredBy / previousCeilingBytes 344,899 / reRegisteredFrom / reason / note / 告警文本）；`_RE_REGISTRATIONS` 追加 `v3-3`（feature-round，含前后值 / 日期 / 来源 / buildCommand / measuredBy / 理由 / 台账条目 / 历史保留）；`SIDEPANEL_GROWTH_BREAKDOWN` 全量重算（27 行 + 四类小计 = 54,655 B）+ 新增 `closeoutRoundRows`（v3-3 自身 9 行） |
| MODIFY | `test/size-budget.test.ts` | TASK-308 | 方向敏感断言按新实测值重新 pin（4 处：#53 ceiling / #239 基线 / #240 previousCeilingBytes / #270-273 ceiling+uncapped）——**同一条断言，仅数值重 pin，零删减** |
| MODIFY | `test/size-growth-evidence.test.ts` | TASK-308 | `deltaBytes` pin 33,251 → **54,655**（同一条断言，仅数值重 pin） |
| MODIFY | `test/size-attribution.mjs` | TASK-308 | **新增 `--worktree` / `WORKTREE`**：让未提交的工作树也能做逐模块归因（纯新增，rev 路径行为不变） |
| MODIFY | `docs/v3-supersession-ledger.json` | TASK-307 | **只追加**：`V33-S1~S14` entries + `V33-MR-01~06` modifiedRanges + `V33-S10~S13`（体积重登记）+ 计数复算 + `v3GateFloors` 增/改 + `v3SkeletonExemptions` 改为 `_removedInV33`（历史值逐字保留）+ 两处「被本叶再次改写」的旧条目 `newTitle` 重钉（`V31-S13` / `V31-S6` / `V31-S10` / `V32-S1` / `V31-S7`，理由逐字保留 + `supersededBy` 指针） |
| MODIFY | `docs/v3-density-baseline.json` | TASK-308 | 22 个登记格 `chars` **逐格 −3**（tighten-only，前值保留在各格 `previous` + `reRegistrationReason`）；`volume` 跟随真实产物（baseline 349,880 / ceiling 367,374 / 前值 328,476 / 344,899）；方向性告警文本更新（+18.51% > 15%、Feature 累计 +31.29% > 30%） |

**明确未改**：`manifest.json` · `src/security/**`（判定链 sha256 不变）· `src/content/**`（三 hash 不变）· `src/insight/**`（**只读复用**，0 diff）· `packages/web-cli-base/**` · `src/ui/options/index.html` · `design/**` · `test/sidepanel-view.test.ts`（**零 diff**，4 项布局契约原样保留）· `test/perf-budget.test.ts` · `main` · 依赖段 · `.opencode/opencode.json`。

## 3. 任务完成清单

| 任务 | 名称 | 复杂度 | 状态 | 对应 FR / AC |
|------|------|:--:|:--:|------|
| TASK-301 | 计数真值派生 `l2/counts.ts` + 单测 | M | ✅ completed | FR-V3-046 / FR-V3-049 · EC-V3-016 · AC-V3-026 · ADR-V3-026 |
| TASK-302 | L2 视图宿主 `l2/view-host.ts` | S | ✅ completed | FR-V3-047 / 048 / 054 · NFR-V3-011 · ADR-V3-025 |
| TASK-303 | 命令目录视图 `l2/command-catalog.ts` | M | ✅ completed | FR-V3-049 / 052 / 053 · AC-V3-019 / 026 · ADR-V3-027 |
| TASK-304 | 审计视图 `l2/audit.ts` | S | ✅ completed | FR-V3-050 · NFR-V3-016 · AC-V3-019 · ADR-V3-026 |
| TASK-305 | **L2 归属迁移与接线**（四视图默认零占用 + ≤2 次 + 返回复位） | L | ✅ completed | FR-V3-045 / 047 / 048 / 051 / 052 / 054 / 015 · AC-V3-005/010/021/026/027 · ADR-V3-025/028 |
| TASK-306 | L2 运行时门禁 `test/ui/l2.mjs`（含 AC-V3-026 八项） | M | ✅ completed | FR-V3-045~054 · AC-V3-005/010/019/021/026/027 |
| TASK-307 | **取代台账最大战场**（insight 入口路径 + 4 契约 + 台账） | M | ✅ completed | FR-V3-004 · AC-V3-011/012 · EC-V3-013 · ADR-V3-007/029 |
| TASK-308 | 体积守卫核对 + **显式重登记** | S | ✅ completed | NFR-V3-005 · AC-V3-015/016 · EC-V3-012 · ADR-V3-011 |
| TASK-309 | 收口：全门禁绿串行 + 密度复位复测 + 人工面如实登记 | M | ✅ completed | FR-V3-003 / 086 / 087 · AC-V3-013/024/025/027 |

## 4. 需求 → 证据（本叶重点逐条）

| 需求 | 落地证据（可复现命令） |
|------|------|
| **FR-V3-045 四视图默认零占用** | `npm run test:l2` ①：`openViews.length === 0`、`#view-host` 默认 hidden、四视图**含内容**的 hidden 链齐备（不用 CSS 隐身）、四视图内「可见且有文字」的元素数 = 0；`test:l0` ⑥ 新增「L2 视图目标默认 hidden」×4；`test/density` 默认档 C1 仍恰为 7（未新增可点） |
| **FR-V3-046 计数真值派生** | `npm run test:l2` ③：记录计数 → 经既有通道**真实新增一个已授权站点** → 重读断言 `tree` 计数 **+1**（计数不动 = 硬编码 → FAIL）；`after.derived.tree === Number(data-count)`；`commands` 分列可见（`实时 N 卡 / 基线 N 行`）；`settings` 计数 == `settings/sections.ts` 登记表长度 == 渲染出的 `.wc-section` 集合；`test/l2-counts.test.ts` 逐类双向 Δ 断言 + `null ≠ 0` |
| **FR-V3-047 视图替换 / 单滚动 / 返回复位** | `test:l2` ②（`#log.hidden === true` + `#view-host` 可见 + 恰一视图）/ ⑤（面板级滚动容器**恰 1**）/ ④（返回后 `#log` 恢复 + 展开态逐项相等 + 默认档密度复测 PASS）；`test:insight` `#I-14c`「进入前 == 返回后逐字段复原」+ `#I-14c0`（`#log` 重新可见） |
| **FR-V3-048 ≤2 次交互 + 风险位可见** | `test:l2` ②：真实点击 `#l0-statusbar`（1）→ `#l2-entry-tree`（2）⇒ 视图 + 树主体就位；⑥：L2 打开期间 `#risk-rail` 高度 > 0 且**祖先闭包无 `hidden` / 无 `[data-l2-view]`** |
| **FR-V3-049 命令目录逐条有档 + delay 单源 + 硬底线零控件** | `test:l2` ⑧：每卡含处置档 / 来源 / 默认·覆盖·生效分列（缺项 = 0）；`delay` 文案逐字含 `fail-closed` + `非可配置档位` 且取自**同一常量**（`l2-counts.test.ts` 断言 `buildCatalogView().noEscalationNote === TREE_NO_ESCALATION_NOTE`）；硬底线卡可选项集合 = **空**；只可收紧卡永不含 `allow`；目录内控件计数 = **0** |
| **FR-V3-050 审计零明文** | `test:l2` ⑨：渲染行字段集合**恰为** `{action,command,id,ms,origin,result,time}`；文本中 `?k=v` 形式零命中（URL 去参）；`apiKey / sk-live / 剪贴板 / 通知正文 / 书签正文` 反例扫描零命中；`test/l2-counts.test.ts` 逐字段白名单 + 注入 `argsSummary: 'apiKey=…'` / `detail: '剪贴板正文…'` 断言零泄漏 |
| **FR-V3-051 设置项等价 + options.html 零 diff** | `test:l2` ⑩：`#settings-view` 带 `data-l2-view="settings"`、`#settings-root > .wc-section` 集合 == 登记表、7 个 v1 id + `settings-migration` 全在、退出后重回默认零占用；`git diff` `options.html` = 0 |
| **FR-V3-052 树 ARIA / 键盘 / 面包屑 / 9 动作** | `test:l2` ⑦：`ul[role=tree]` + 每 `li[role=treeitem]` 带 `aria-level` + `aria-expanded` 仅出现在可展开节点 + 面包屑（`role=navigation`）+ roving tabindex（恰一个 `tabindex=0` 且可聚焦）+ 9 动作**全部落在封闭白名单内**（固定序由 `l2-counts.test.ts` 与目录只读列表双重断言）；`test:insight` 的 v2 树断言全部原样通过（键盘 Enter 下钻 / 面包屑 / 三态控件） |
| **FR-V3-053 零提权 + clamp 在 SW 侧** | `test:l2` ⑧：目录 + 审计视图**零控件**；伪造 `command-policy-set`（硬底线 → `allow`）后，真实重投影的卡仍 `effective=deny` / `overridable=false` / 可选项为空（SW 侧 clamp 未被突破）；`test:l2` ④ 断言 `#l2-back` 返回后不可见 |
| **FR-V3-054 返回后密度复位** | `test:l2` ④：返回后用**单源口径**（`DENSITY_MEASURE_SOURCE`）实测默认档 `C1 ≤ 7 / C2 ≤ 15` PASS；`test:density` 三档三视口全过 |
| **AC-V3-026 能力集等价 8 项** | `test:l2` ⑩：命令集合（`{live,baseline}` 两个真值）/ 处置档位（逐卡分列）/ 四维连接树（4 面集合）/ 命令目录分列 / 审计条目数（== 入口 data-count == 视图条目数）/ 设置项集合（登记表 == DOM）/ 9 动作（固定序）/ 回执三件套可达 逐项等价 |
| **AC-V3-027 不做项守卫** | 零新增权限（manifest 0 diff）/ 零新增依赖 / `policy.ts`+`auto-authorize.ts` sha256 不变 / `options.html` 0 diff / 9 动作白名单**零增删**（新增 UI 未引入任何动作） |
| **NFR-V3-012/013/014 串行 / 能真 FAIL / 计数不减** | 门禁严格串行（§1.1）；本叶 5 条新反证全部实跑（§6）；计数只增不减（nit 772 ≥ 764 / l0 158 ≥ 157 / insight 116 ≥ 108 / density 127 / l1 103 / binding 192 / journey 167 / gate-integrity 9） |

## 5. 体积与密度

### 5.1 三线

| 项 | 实测 | 登记 / 上限 | 结论 |
|----|------|------|------|
| `dist/content.js` | **177,076 B** | 177,076（**无容差**） | ✅ 逐字节相等；`CONTENT_SOURCE_SHA256` 三项 pin 不变 |
| `dist/sidepanel.js` | **349,880 B** | 基线 **349,880** / ceiling **367,374**（= floor(349,880 × 1.05)，公式，cap 仍 record-only） | ✅ 本叶**显式重登记**（前值 328,476） |
| 密度阈值 | `default 7/15` · `firstRun 9/20` · `risk 17/35` | 逐字未动 | ✅ 默认档 C1 仍恰 7 |

### 5.2 增量归因表（v3-1 树 `cf2af32` → 本叶工作树；esbuild metafile 可复现）

复现命令：`npm run size:attribution -- --rev cf2af32 --rev WORKTREE`（`--worktree` 为 v3-3 新增；`afterBytes` 取自真实 `dist/build-meta.json`）。

分类小计：**新必需模块 43,528 B / 接线 10,443 B / 归因位移 265 B / 未归因胶水 419 B = 累计 +54,655 B**（必需增量占比 **98.7%**，未解释字节 684 B < 1,000 B）。

| 模块 | v3-1 B | 本叶 B | Δ B | 类别 | 要求来源 |
|---|---:|---:|---:|---|---|
| `src/ui/sidepanel/l2/command-catalog.ts` | — | 6,106 | +6,106 | 新必需 | FR-V3-049/053 |
| `src/ui/sidepanel/l2/audit.ts` | — | 4,145 | +4,145 | 新必需 | FR-V3-050 / NFR-V3-016 |
| `src/ui/sidepanel/l2/view-host.ts` | — | 3,206 | +3,206 | 新必需 | FR-V3-047/048/054 |
| `src/ui/sidepanel/l2/counts.ts` | — | 2,932 | +2,932 | 新必需 | FR-V3-046 / EC-V3-016 |
| `src/ui/settings/sections.ts` | — | 226 | +226 | 新必需 | FR-V3-051 / FR-V3-046 |
| `src/ui/sidepanel/sidepanel.ts` | 44,845 | 53,390 | +8,545 | 接线 | FR-V3-045~054（含 v3-2 的 L1 接线累计） |
| `src/ui/sidepanel/view-model.ts` | 17,123 | 17,666 | +543 | 接线 | FR-V3-046/015 |
| `src/ui/sidepanel/l0/status-bar.ts` | 1,382 | 1,649 | +267 | 接线 | FR-V3-015/046 |
| `src/ui/sidepanel/l0/shell.ts` | 3,351 | 3,275 | **−76** | 接线 | FR-V3-047（骨架期临时逻辑被真实实现取代，**净减**） |
| （v3-2 既有的 6 个必需模块：`l1/{panels,ref-validity,ref-store,receipt,local-tree}.ts` + `insight/ownership-tree.ts`） | — | 26,913 | +26,913 | 新必需 | FR-V3-030~040（v3-1 树 → 当前树的累计口径） |
| 归因位移 9 行（`tree-drawer` +114 / `settings/panel` +71 / `markdown` +37 / `build-info` +5 / `tree-view` +27 / `scroll-policy` +4 / `archive-catalog` +4 / `settings/view` +3 / `tree-receipt` 0） | — | — | +265 | 位移 | 源码未改，esbuild 分摊位移 |
| 未归因胶水 | — | — | +419 | — | esbuild 运行时 helper |

**v3-3 自身增量 21,404 B 的构成**（`closeoutRoundRows`）：新模块 16,615 B（counts 2,932 / view-host 3,206 / command-catalog 6,106 / audit 4,145 / sections 226）+ `sidepanel.ts` +4,501 + `status-bar.ts` +267 − `shell.ts` 101 − `view-model.ts` 112（后两者因 v3-1 骨架逻辑被真实实现取代而**净减**）。

### 5.3 密度登记格重登记（tighten-only）

| 登记格 | 前值 chars | 本叶 chars | 方向 | 理由 |
|---|---:|---:|---|---|
| `default@320/400/520` | 223 | **220** | 收紧 | 常驻一行状态栏不再承载计数（计数移入入口面板摘要 + 入口标签） |
| `firstRun@320/400/520` | 387 | **384** | 收紧 | 同上（同一行文案） |
| 5 个风险子场景 ×3 视口 | −3 / 格 | （逐格） | 收紧 | 同上 |
| `risk.worst` | 428 | **425** | 收紧 | 同上 |

C1/C2/C3/C4 与阈值**逐项未动**；`lines = ⌈chars/34⌉` 自洽性断言全过（`test/density-thresholds.test.ts`）。

## 6. 反证（本叶新增 5 条 + 沿用全套）

| 编号 | 注入 | FAIL 段（exit ≠ 0 + 命中） | 还原 | PASS 段 |
|:--:|------|------|------|------|
| **RP-V33-01** | `dist/sidepanel.html` 去掉 `#view-host` 的 `hidden` 属性 | `test:l2` ① 红（默认零占用被破坏），exit=1 | 从 sha256 校验过的原始副本还原 | `test:l2` 71/0 PASS（`FAIL_SEG_EXIT=1` → `PASS_SEG_EXIT=0`） |
| **RP-V33-02** | `src/ui/sidepanel/l2/counts.ts` 把 `tree` 计数改为常量（写死） | `test:l2` ③ 红（改真值后计数不动 = 硬编码），exit=1 | `git checkout` 该文件（sha256 复原） | 重建后 `test:l2` PASS |
| **RP-V33-03** | `l2.mjs` 副本删掉 1 条断言（`--files-override`） | `test:supersession` 红：`运行时 check 计数 < 台账下界 68`，exit=1 | 副本删除（真文件未动） | 真文件 `check(` = 68 ≥ 68 PASS |
| **RP-V33-04** | `l2.mjs` 副本注入元门禁缺陷形态（失败块内独立 `await` 挡在退出码前） | `test:gate-integrity`（`SDC_GATES_ROOT` 指向注入副本）红，exit=1 | 副本删除 | 真实根 9/9 PASS |
| **RP-V33-05** | `dist/sidepanel.js` **+1 B**（追加一字节） | 体积守卫红（`实测 349,881 > 上限 367,374` 的判定 + 体积登记值不等），`npm test` exit=1 | 重建产物（sha256 复原） | `npm test` 772/772 PASS + 体积登记值 == 实测 |
| 沿用 | RP-V3-01/03/05/06/08/09 + I1 + v3-2 的 RP-L1-A~H / RP-L1-C2 / F-01 + 元门禁形态 | 全部实跑（`test:l1-reverse` + `test:gate-integrity` + `test:density` 内建 RP-V3-08） | — | 全绿 |

### 6.1 反证实测原文（摘要；完整日志 `/tmp/opencode/v3-gate-logs/v3-3/rp/`）

| 编号 | FAIL 段命中（原文） | 还原 | PASS 段 |
|:--:|------|------|------|
| RP-V33-01 | `✖ ① #view-host 默认 hidden（视图宿主不是常驻 chrome） — false`；`FAIL_SEG_EXIT=1` | `dist/sidepanel.html: OK`（sha256 校验通过） | `▶ L2 运行时门禁: 71 passed / 0 failed` / `PASS_SEG_EXIT=0` |
| RP-V33-02 | `✖ ③ 真值（新增一个已授权站点）变化后计数确实随之变化（计数不动 = 硬编码 → FAIL） — before=113 after=113`；且 `✖ ③ 计数变化量与真值变化量相等`；`FAIL_SEG_EXIT=1` | `src/ui/sidepanel/l2/counts.ts: OK` + 重建 | `71 passed / 0 failed` / `PASS_SEG_EXIT=0` |
| RP-V33-03 | `✖ …/l2-deleted-one-check.mjs`（`运行时 check 计数 < 台账下界`）；`FAIL_SEG_EXIT=1` | （副本，真文件未动） | `11 passed / 0 failed` / `PASS_SEG_EXIT=0` |
| RP-V33-04 | `test/ui/l2.mjs:653 [R1a] 失败块（第 652 行起）内第一条独立 await 之前未定死退出码（await dumpDiagnostics(cdp);）`；`INJECTED_EXIT=1` | （注入副本，真树未动） | `9 passed / 0 failed` / `REAL_EXIT=0` |
| RP-V33-05 | `✖ V2-2 size: built sidepanel.js stays within the regression ceiling` — `登记基线 349880B ≠ 实测产物 349881B —— 必须按真实产物重登记`；`FAIL_SEG_EXIT=1` | `dist/sidepanel.js: OK`（sha256 校验通过） | `ℹ tests 772 / pass 772 / fail 0` / `PASS_SEG_EXIT=0` |

**沿用全套**（同一次串行链内全部实跑）：`test:l1-reverse`（RP-L1-A~H + RP-L1-C2，9 条「注入 → FAIL → 逐字节还原（sha256 复原）→ PASS」全过）；
`test:gate-integrity` 的 9 条（R1a/R1b/R2/R3 真实门禁 + 合成夹具反证 ×4 + 注入副本反证 + 目录推导反证）；
`test:density` 内建 RP-V3-08（基线文件篡改 → FAIL → 还原 sha256 复原）；`test:size-budget` 内建 +1 B / content 硬上限反证。

### 6.2 收尾复核（最终冻结态）

```
cd packages/web-cli-plugin && npm run build && npm test
→ dist/content.js 177,076 B · dist/sidepanel.js 349,880 B（== 体积登记值）
→ ℹ tests 772 / pass 772 / fail 0   EXIT=0
```

反证日志与 sha256 复原记录：`/tmp/opencode/v3-gate-logs/v3-3/rp/` 与 §7。

## 7. 零改动核对（红线）

| 项 | 结果 |
|----|------|
| `manifest.json` | 0 diff（零新增权限、无 `contextMenus`） |
| `src/content/{content-script,dom-agent,page-bridge}.ts` | 三 sha256 不变（`CONTENT_SOURCE_SHA256` pin 由 `npm test` 复算通过） |
| `src/security/policy.ts` / `auto-authorize.ts` | `bfcb2ede…` / `1096d065…` 不变 |
| `packages/web-cli-base/**` | 0 diff |
| `src/ui/options/index.html` | 0 diff |
| `design/**` / `.opencode/opencode.json` | 0 diff |
| `test/sidepanel-view.test.ts` / `test/perf-budget.test.ts` | 0 diff（4 项布局契约**原样保留**，零迁移） |
| `main` | 未动（`2ddc922`） |
| 依赖 | `package.json` 依赖段 0 diff |
| 提交纪律 | 逐文件 `git add`（**未用** `git add -A`） |

## 8. 下一步

| 场景 | 操作 |
|------|------|
| 全部任务已完成 | 运行 `@sddu-review specs-tree-v3-3-l2-on-demand-views` 开始审查 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建：9 任务 / 5 波逐项落地；四视图默认零占用 + 真值计数 + 视图替换与返回复位 + 树归属迁移（`role=dialog→region`、FAB 默认 hidden）+ 取代台账最大战场（`insight.mjs` 同编号迁移 + 4 契约零迁移）+ 体积**显式重登记**（328,476 → 349,880，含增量归因表）+ 本叶 5 条新反证；**两条披露**：Feature 累计 +31.29%（>30%）、密度 22 格 chars 收紧 −3 | 2026-09-16 | SDDU Build Agent |
