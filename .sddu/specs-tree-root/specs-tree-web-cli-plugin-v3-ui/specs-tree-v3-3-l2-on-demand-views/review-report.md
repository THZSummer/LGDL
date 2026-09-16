# 审查报告：specs-tree-v3-3-l2-on-demand-views

> **文档定位**: SDDU 审查报告（R1）— 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C44 审查清单及四维度 + 证据保真指引）
> **前置依赖**: `review.md` / `spec.md` / `plan.md` / `tasks.md` / `build.md`（HEAD `42e409d`，改动 `a1b9a4f` / `57828f6` / `42e409d`）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-16
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（15 门禁串行实跑 + 体积归因实跑复现 + 1 次受控 ARIA 探针 + RP-V33-03 两形态对照实验；§1 六项重点打假逐条定案 + 新增 §2.7；**1 阻塞（F-01，证据缺陷）/ 8 警告 / 35 通过 / 1 失败**）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 44（C1~C44） |
| 通过 | 35 |
| 警告 | 8（归并为 **5 项可执行改进**，§6） |
| 失败 | **1**（C39：`RP-V33-03` 反证无效 → §2.7） |
| 阻塞问题 | **1**（F-01，**证据缺陷**；实现/AC/红线 0 缺陷） |
| 独立复跑门禁 | **15/15 `exit=0`**（772 / 11 / 127 / 160 / 103 / 71 / 167 / 116 / 192 / 24 / e2e PASS / 9 / l1-reverse PASS + typecheck/build） |
| 独立复现实验 | `npm run size:attribution -- --rev cf2af32 --rev WORKTREE`（Δ=54,655 逐模块全等）+ 1 次受控 ARIA 探针（Chromium）+ **`--files-override` 反证的两种调用形态对照实验**（§2.7） |

### 🔴 一句话结论

**❌ 不通过（1 阻塞：F-01 —— 证据缺陷，非实现缺陷）**：本叶的**实质交付**（真值计数、视图替换与返回复位、树归属迁移、取代台账最大战场、体积显式重登记）经**独立复跑 + 复现实验 + 受控探针**全部成立，无虚绿、无红线破损、无断言删除；**但 `build.md §6/§6.1` 记的 `RP-V33-03`「删 1 条断言 → 台账下界 FAIL」反证经复核为无效**（FAIL 由副本被 `node --test` 当测试文件执行导致的 `ERR_MODULE_NOT_FOUND` 产生，`--files-override` 判据在该调用形态下**完全未生效**），而该反证是本叶 spec 明文要求「**必须实跑**」的锚点（NFR-V3-013 / AC-V3-011/012）。我已用**正确调用形态**独立复现出该反证的真实 FAIL/还原 PASS 原文（§2.7），故修复只需「改 RP 脚本调用 + 重跑落盘 + 订正 build.md」，**实现无需返工**。

## 2. 🎯 §1 六项重点打假逐条判定

### 2.1 ① 计数真值派生是否真 —— **✅ 真（1 项口径限缩如实登记）**

| 计数 | 生产环境数据来源（真实代码位置） | 是否可能退化为常量/缓存 | 证据 |
|---|---|---|---|
| `tree` | `state.insight.counts`（SW 每次 `state` 回包重投影：`src/background/service-worker.ts` → `project-tree.ts:307` 由真实 `sites/capabilities/commands/subcommands/llms/sessions` 计算）；回包不带时回退 `insight-tree` 快照 `meta.counts`（`sidepanel.ts` `pullInsightSnapshot`） | **否**：每次 `refreshState()` 覆盖 `l2Truth.insightCounts` 并 `refreshL2Counts()`；无 `catch` 回退常量 | RP-V33-02 实跑：把 `tree` 改成常量 → 运行期 ③ 红（`before=113 after=113`，`FAIL_SEG_EXIT=1`）；还原 sha256 后 71/0 PASS |
| `commands.live` | 同一 `insightCounts` 的 `commands + subcommands` | 否（同一真值对象） | `test/l2-counts.test.ts` ①（+2 子命令 → Δ=+2）；运行期 ③ 断言 `derived.commands.live` 为数字且随入口标签同源 |
| `commands.baseline` | `CATALOG_BASELINE_META`（`catalog-meta.ts`，**纯常量**） | **是常量，但属「已登记基线」**：与 SW 注入 `snapshot.catalogMeta` 同一常量；由 A7 漂移门禁 `assert CATALOG_BASELINE_META === loadBaseline()`（含 40 位 provenance）钉住；`archive-catalog.ts:415` 亦以它兜底 | `insight-archive.test.ts` A7 + 独立比对 `34/142 + provenance commit`；运行期 ③ 断言 `{live:94, baseline:176}` 两值分列 |
| `audit` | 既有 `audit-export` 回包长度（`refreshAuditView`），启动即读一次 | 否（每次读通道都刷新） | 运行期 ⑨：`listCount === derived.audit`；③：`audit` 为数字 |
| `settings` | `SETTINGS_SECTION_IDS`（`settings/sections.ts`，**本次新增的静态登记表**，7 项） | **是登记表常量**，但有三重守卫：① 单测断言 `deriveCounts(..., settingsSections)` 随注入长度变化（+1 → 8）；② 单测逐 id 反查 `panel.ts` 的 `h(doc,'section',{id,class:'wc-section'})`（重命名即 FAIL）；③ `l2.mjs` ⑩ 断言渲染出的 `#settings-root > .wc-section` 集合 == 登记表 == 入口 `data-count` | 三处证据均实跑通过；`v3SkeletonExemptions.settings-count.removalCondition`（v3-1 登记）正是「给出可派生的设置项数」→ 满足后删除 |

**判定**：四类计数**无一来自字面量**；「改真值 → 计数变」在**运行期**对 `tree` 有真 FAIL 能力（RP-V33-02 原文见 §2.1 证据列），对其余三类在**单测层**有 Δ 双向断言 + 常量漂移门禁。**口径限缩（如实登记）**：`settings` 的生产计数本质是「静态登记表 + 运行期 DOM 等值守卫」，不是会随运行期变化的真值——这与另三类不同；因设置分区集合本身是编译期静态的，且 `removalCondition` 要求的正是「可派生来源」，判定为可接受，记入 C2 脚注。

### 2.2 ② 语义迁移是否削弱 —— **✅ 未削弱（ARIA 目标真伪另有 1 处缺陷，见 I-01）**

1. **属性/语义迁移**：`#tree-fab` 默认 `hidden`（`index.html:1320`）、`#tree-drawer` `role="dialog"`+`aria-modal="false"` → `role="region"` + `aria-label="连接树"`、`position:absolute` → `static`、`aria-haspopup="dialog"` 删除——与 ADR-V3-028 §2/§3 逐条一致；`git diff bf5773d..HEAD -- src/ui/tree/tree-drawer.ts src/ui/sidepanel/disclosure.ts` = **0 行**（渲染逻辑与折叠器白名单未被改）。
2. **迁移后语义仍被断言（不是只剩 id）**：
   - `l2.mjs` ⑦：`ul[role=tree]` + 每个 `li[role=treeitem]` 带 `aria-level` + `aria-expanded` 存在 + 面包屑（`role=navigation/.tree-breadcrumb`）+ roving tabindex 恰 1 且可聚焦 + 四维度分组集合恰 `{capability,command,llm,site}` + 动作 id ⊂ 9 白名单 + 硬底线 `tree-control` = 0；
   - `insight.mjs` 迁移后：v2 树断言（键盘 Enter 下钻 / 面包屑 / deny 分层三态控件 / 覆盖即时生效 / 档案分层分列）**原样全过**（116/0）；
   - `#I-01e2/#I-01e3` 新增「归属容器可回读 == `tree`」+「`role=region` 且 `aria-modal` 移除」两条机器判据。
3. **有无「静默去掉 v2 断言」**：以 `#I-*` 断言标识做**集合差**——`bf5773d` 73 个 → HEAD 81 个，**LOST = []**，NEW = 8（`01e2/01e3/13a0/13a1/13a2/14c0/14d/19a1`）。删除行 27 条（vs 台账 `base=c2c0e0d`）逐行落在已登记 `modifiedRanges` 或 `oldTitle` 上（`test:supersession` 逐行判据实跑 11/11）。
4. **`sidepanel-view.test.ts`「零 diff」属实**：`git diff --numstat bf5773d..HEAD` = 0 行；其 4 项布局契约（分区文档序 top→main→bottom / `body{display:flex;overflow:hidden}` / `#panel-bottom{flex:0 0 auto}`+composer 末位 / `#log{flex:1 1 auto;min-height:0;overflow-y:auto}` + `#log.empty:not(:has(> *))`）在 `index.html` 中**逐字未动**（本叶 HTML diff 只触及 `#tree-*`/`#view-host`/`#l2-*`/`#settings-view`）；`npm test` 56 用例全过。
5. **⚠️ 唯一瑕疵（I-01）**：`status-bar.ts#render()` 对**四个**入口无条件 `setAttribute('aria-controls','view-host')`，而 `syncTriggerAria()` 已按目标区分 `aria-expanded`（settings → `#settings-view`）。受控探针实测：设置视图**打开**时 `#l2-entry-settings` 为 `aria-controls="view-host"`（其目标 `hidden=true`）而 `aria-expanded="true"` —— 与 `index.html` 声明值（`settings-view`）及 `build.md §2.2`「逐目标」声明不符；`l0.mjs ⑥` 只断「目标存在」（`view-host` 存在）故不拦截。

### 2.3 ③ `insight.mjs` 108→116 同编号迁移是否**增强式** —— **✅ 增强（7↔7 同数、5 条升级 + 8 条新增、无阈值放宽）**

| 旧（v2） | 新（v3-3） | 语义对照 |
|---|---|---|
| `#I-01e` `position === 'absolute'` | `#I-01e` `=== 'static'` **+ `#I-01e2` 归属 == `tree` + `#I-01e3` `role=region`/`aria-modal=null`** | 由「浮层不挤压 #log」升级为「归属迁移三连」，**更强**（1 条 → 3 条） |
| `checkLayout`（7 条：`logFlexGrow`/`logClientHeight`/`logRatio`/`composerGap`/`fabComposerArea`/`docOverflowX`/`logOverflowX`） | `checkL2OpenLayout`（7 条：`logHidden`/`viewHostHidden`/`openViewCount===1`/`viewOverflow===0`/`panelScrollerCount===1`/`composerGap`/`docOverflowX`） | **条数不变（7↔7）**；开态 `#log` 的几何在视图替换下无定义（隐藏=0），故改为断言替换契约本身；`composerGap` 与 `docOverflowX` 原样保留；`fabComposerArea`（浮层↔composer 交面积）在开态不再有意义（FAB 已为视图内文档流控件）——v2 的该项仍由**关态** `checkLayout(closedLayout)` 保留 |
| `#I-20j/#I-20k` drift 参照物 = 关态 `closedLayout`（6 字段含 `logFlexGrow/logClientHeight/logRatio`） | 参照物 = L2 开态 `l2OpenLayout`（6 字段：`composerGapToBottom/docOverflowX/logOverflowX/viewHostHeight/openViewCount/panelScrollerCount`） | 隐藏容器的 flex/高度字段不可测，换成**开态可测且更贴近契约**的三项（视图高度 / 恰一视图 / 单滚动容器）；deep-drill 稳定性声明强度不降 |
| `#I-14c` 「开/关逐字段相等」 | `#I-14c` 「**进入前 == 返回后**逐字段复原」+ **`#I-14c0`** `#log` 重新可见 + **`#I-14d`** 重入布局逐字段相等 | **严格更强**：额外证明替换**可逆**与**可重复**（+2 条） |
| `#I-14b` 条件不变（`drawerHidden === false`），仅括号语义订正 | 同 | 等价 |
| — | **新增前置条件** `#I-13a0`（过滤输入框唯一/已布局/无 hidden 祖先）、`#I-13a1`（真实点击后焦点落位）、`#I-13a2`（`elementFromPoint` 命中自身）、`#I-19a1`（档案开关未被遮挡） | **新增**，把「点击到隐藏/被覆盖目标」这类假红/假绿排除 |
| — | `settleDrawer`（MutationObserver + 1500ms 硬上限）、`v3RevealComposer` **有界重试（6×250ms）** | 均为**状态前置**等待，不改任何断言阈值 |

**阈值核对**：`LOG_MIN_HEIGHT`/`LOG_MIN_RATIO`/`COMPOSER_GAP` 常量本次**零改动**（diff 未触及；PASS 摘要仍打印「#log ≥488px（来源 488 单源）」）。**无悄悄放宽阈值**。

**§1-⑥ `v3RevealComposer` 有界重试专项**：
- 理由可核：本叶新增开机读通路（`void refreshAuditView()` → `audit-count` → `render()`）会重绘并在「无卡」时清掉 fallback 展开态；重试只是**把产品自身的 `revealFallback()` 重新落到目标状态**，不是重试某条断言。
- 上限：**6 次 × 250ms ≈ 1.5s**（`settleDrawer` 另 1500ms 硬上限）；超时行为 = 循环自然结束、**不再断言**。
- 是否会「把本该 FAIL 的重试到 PASS」：**不会掩盖真缺陷**——其后紧随的 `checkLayout`/`checkL2OpenLayout` 含 `composerGapToBottom ∈ [0,8]`；若 composer 始终未展开，其 `rect.bottom = 0` → gap ≈ 900 → 立即 FAIL。即：该重试**没有 FAIL 能力**，但它的失败会被下游几何断言接住（已用源码路径核对）。
- **但**：该改动属「改写既有（v3-1 加入的）测试代码」，`review.md C39/§5.1` 要求的台账条目**缺失**（见 I-04）。

### 2.4 ④ 密度 `chars` 逐格 −3 的重登记是否合规 —— **✅ 合规（且 `DENSITY_MEASURE_SOURCE` 未被改动）**

| 打假问 | 判定 | 证据 |
|---|---|---|
| ① 是否收紧方向 | **是** | `docs/v3-density-baseline.json#direction = "tighten-only"`；22 个产品登记格 `chars` 实测新值 = 旧值 −3；`test:density` 阶段 F 逐格机器比对（实测 vs 登记）+ 产物 ≤ ceiling 实跑 **127/0** |
| ② `previous` 前值是否逐格保留 | **是（22/22）** | 脚本遍历：22 格全部含 `previous.chars` 且 `previous − current === 3`（default 223→220、firstRun 387→384、risk.worst 428→425、5 个风险子场景各自 −3；另 2 个 `designCaliber` 格非产品格，本就不带 previous） |
| ③ 理由是否成立 | **是** | 旧常驻文本 `状态：树 0 · 命令 0 · 审计 0 · 设置` 去空白 = **16** 字符；新 `L2_BAR_TEXT = '状态：按需视图 · 点开看计数'` 去空白 = **13** 字符 → **恰好 −3**（`node` 独立复算；22 格增量**完全一致为 −3** 这一事实本身即证认旧文本中的计数均为单字符——否则 audit 为多位数的格增量会 >3）。计数（含会单调增长的 audit ring 值）确实被移出**被测量的常驻文本**，移入默认 `hidden` 的 `#l2-entries`（`#l2-entry-summary` + 四个入口标签） |
| ④ 是否借此掩盖真实密度回升 | **否** | 关键复核：`git diff cf2af32..HEAD -- test/ui/density-metrics.mjs` = **0 行**（`DENSITY_MEASURE_SOURCE` 与阈值口径**未被改动**）；C1（可点）与 C2（行）**逐项未动**（默认档仍 7/7，实测 C1=7）；把登记值**下调**只会让未来任何真实增长立刻 `实测 > 登记` → 更严 |
| ⑤ 登记形式 | 部分 | 7 格（default×3 / firstRun×3 / worst）带 v3-3 `reRegisteredOn/By/Reason`；其余 15 格仅以 `previous` 记前后值（v3-3 理由由文件级 `measuredBy` + `directionNote` 承载）——记入 I-03 附带项，非违规 |

### 2.5 ⑤ 体积累计 +31.29% 的正当性 —— **✅ 可信（归因表逐模块实跑复现全等，冗余仅 1 处零字节死代码）**

- **独立复现**：`npm run size:attribution -- --rev cf2af32 --rev WORKTREE` → `base 295,510 B · head 350,165 B · Δ = 54,655 B`，`Σ per-module = 54,236`，`unattributed runtime glue Δ = 419 B`，表 **52 行**。与 `SIDEPANEL_GROWTH_BREAKDOWN` 登记的 `deltaBytes 54,655 / newRequired 43,528 / wiring 10,443 / shift 265 / glue 419` **逐值相等**。
- **模块级后值逐一核对**：用真实 `dist/build-meta.json`（`outputs['dist/sidepanel.js'].inputs[*].bytesInOutput`）比对归因表 19 个模块的 `afterBytes` —— **19/19 逐字节相等**（`l2/counts 2,932` / `view-host 3,206` / `command-catalog 6,106` / `audit 4,145` / `sections 226` / `sidepanel.ts 53,390` / `view-model 17,666` / `status-bar 1,649` / `shell 3,275` / `tree-drawer 39,893` …）。
- **「必需占比 98.7%」**：(43,528 + 10,443) / 54,655 = **98.75%**；未解释 265 + 419 = **684 B < 1,000 B** —— 算术成立。
- **方向性告警**：(349,880 − 295,225) / 295,225 = **+18.51% > 15%**（已升级为可读告警并由 `size-growth-evidence` 断言）；349,880 / 266,500 − 1 = **+31.29% > 30%**（已在 `build.md §1.2` 与 `test/size-baseline.ts#_META` 显式列出）✅。
- **是否有可轻易移除的冗余**：`src/ui/sidepanel/l2/command-catalog.ts#catalogCounts()` **无任何调用点**（`grep` 全仓仅定义处；`dist/sidepanel.js` 中 0 出现 = 已被树摇）→ **零字节成本**，但属死代码；未发现重复实现（`tree-receipt.ts` Δ=0 B、`archive-catalog` 仅 +4 B 位移 → 复用而非复制）。记 I-05。
- **微小不严格**：`closeoutRoundRows` 9 行合计 **21,170 B** vs 登记 `closeoutDeltaBytes = 21,404 B`（差 234 B 为 esbuild 位移/胶水，未拆分）；`build.md §5.2` 的「21,404 B 的构成」实际列出的是这 9 行（21,170）。记 I-03。

### 2.6 ⑥ `v3RevealComposer` 改为有界重试 —— **✅ 理由成立、不掩盖断言级缺陷（但台账缺登记，I-04）**

见 §2.3 末段专项：理由（L2 读通路新增重绘清掉「无卡」fallback 状态）与代码路径一致；有界（6×250ms）且失败会被下游几何断言接住；不属于「把本该 FAIL 的状态重试到 PASS」（重试对象是产品自身的状态前置调用，不是判据）。唯一问题：该改写是「既有测试文本的改写」，**未进台账**（`insight.mjs` 不在 `protectedRanges`，而删除行判据以 `base=c2c0e0d` 为基准，看不到 v3-1 之后加入的行）→ I-04。

### 2.7 ⑦（新增打假项）`RP-V33-03` 反证有效性 —— **❌ 无效（本叶唯一阻塞项 F-01）**

**声称**（`build.md §6`）：「RP-V33-03 | `l2.mjs` 副本删掉 1 条断言（`--files-override`）| `test:supersession` 红：`运行时 check 计数 < 台账下界 68`，exit=1 | 真文件 `check(` = 68 ≥ 68 PASS」。

**实测（读构建轮落盘日志 `/tmp/opencode/v3-gate-logs/v3-3/rp/rp-v33-03-fail.log`）——与声称不符**：

```text
$ sed -n '1,10p' rp-v33-03-fail.log
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/tmp/opencode/v3-gate-logs/v3-3/rp/_v3-helpers.mjs'
       imported from /tmp/opencode/v3-gate-logs/v3-3/rp/l2-deleted-one-check.mjs
$ grep -n "override ok\|删除断言未登记\|计数核对" rp-v33-03-fail.log
  ℹ 计数核对：… l2.mjs: 68 ≥ 68            ← 输出形态是**非 override 分支**（真文件计数），
                                            ← 全文**没有** "运行时 check 计数 67 < 台账下界 68" 这一句
$ grep -cE "^✔|^✖" …
  ✔ ×11（11 条台账判据**全部通过**，含 `--files-override` 那条）
  ✖ ×1  = 「l2-deleted-one-check.mjs」本身
ℹ tests 12 / pass 11 / fail 1
FAIL_SEG_EXIT=1
```

**根因（两种调用形态对照实验，我独立复跑）**：

```text
# 形态 A（RP-V33-03 脚本实际用法：node --test <testfile> --files-override <copy>）
$ node --test dist-test/test/supersession-ledger.test.js --files-override /tmp/…/rp-redo/l2.mjs
  → ①「--files-override <copy>」在 `--test` 形态下**不进入测试进程的 process.argv**
       （`FILES_OVERRIDE = null` → 判据走非 override 分支，实测真文件 "68 ≥ 68" 通过）
     ② 末尾位置参数被 node 当作**额外测试文件**执行 → 副本 `import './_v3-helpers.mjs'` 失败
       → `ERR_MODULE_NOT_FOUND`（3 处）→ `tests 12 / pass 11 / fail 1 / EXIT=1`
  ⇒ **FAIL 的原因与「计数 < 下界」无关；被引用的 FAIL 段是假象（副本删除后照样会 FAIL）**

# 形态 B（正确用法：直接执行测试文件，不带 --test）
$ node dist-test/test/supersession-ledger.test.js --files-override /tmp/…/rp-redo/l2.mjs
  → ℹ tests 11 / pass 10 / fail 1 / VALID_FAIL_EXIT=1
    AssertionError: --files-override …/l2.mjs: 运行时 check 计数 67 < 台账下界 68 —— 删除断言未登记
$ node dist-test/test/supersession-ledger.test.js          （还原段：真文件）
  → ℹ tests 11 / pass 11 / fail 0 / VALID_PASS_EXIT=0
```

**结论**：
1. **被要求的能力本身成立**（NFR-V3-013「门禁必须能真 FAIL」）：形态 B 下「删 1 条 `check(` → 67 < 68 → `ERR_ASSERTION` → exit=1」**真实发生**，还原后 11/11 PASS；且**非 override 分支本身就是常开判据**（`test/supersession-ledger.test.ts:418-439` 对真文件逐个 `countChecks ≥ floor` 断言），故门的**强制力未被削弱**（`l2.mjs` 静态 `check(` 实测 68 == `v3GateFloors` 68）。
2. **但 `build.md` 记录的该反证无效且理由误归因**：日志里从未出现所声称的失败文本；`V33-S14` 式的「反证实跑」证据链在本条上断裂。这与本项目既往纪律（v3-1 I7「PASS 摘要数字漂移」、v3-2 F-01「门禁退出码不可传播」均被列为缺陷）同类。
3. 同类反证（`RP-V33-01/02/04/05`）经读日志核对**均有效**：01（去 `hidden` → l2 70/1，还原 71/0）、02（计数常量 → ③ 两条红 + sha256 还原）、04（元门禁 R1a 命中 `test/ui/l2.mjs:653 … await dumpDiagnostics(cdp);`，还原 9/9）、05（+1 B → 体积 FAIL，还原 772 PASS）。另：早前轮次的同一 RP 用**形态 B** 调用，日志中出现过正确的 `67 < 台账下界 68` 断言（`/tmp/opencode/v3-gate-logs/v3-2-fix2/15-RP-V3-05-fail.log:25`）→ 说明这是**本轮脚本调用形态的回归**，非机制缺陷。



---

## 3. 逐项审查结果（C1~C44）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---|:--:|:--:|---|:--:|
| C1 | 四视图默认零占用 | FR-V3-045 | ✅ | `occupancyProbe` 仅用 `hidden` 祖先链（无 `getComputedStyle`）；运行期 ① 全过（`openViews=[]`、`#view-host` hidden、四视图内含文字可见元素 = 0、可见 id 集合不含四个内容宿主）；RP-V33-01 证明可 FAIL | — |
| C2 | 计数真值派生 | FR-V3-046 | ✅ | 四类计数无字面量；RP-V33-02 运行期真 FAIL；`settings` 为静态登记表 + 三重守卫（口径限缩已登记，见 §2.1） | 低（限缩） |
| C3 | `{live,baseline}` 分列 | EC-V3-016 | ✅ | 入口标签「实时 94 卡 / 基线 176 行」、视图标题同源；`commands` 为对象且单测禁止 `total/merged/avg`；无「已全部渲染」 | — |
| C4 | 视图替换 / 单滚动 / 返回 | FR-V3-047 | ✅ | `#view-host` 为 `#log` 兄弟；开态 `#log.hidden=true` + 恰一 `[data-l2-view]`；面板级滚动容器恰 1；顶部 `#l2-back` | — |
| C5 | 返回后展开态复原 | FR-V3-047 | ✅ | `open()` 进入时 `disclosure.snapshot()`、`close()` `restore()`；运行期 ④ 前后 snapshot 串相等；`insight #I-14c` 六字段复原 + `#I-14d` 重入一致 | — |
| C6 | ≤2 次交互（含返回） | FR-V3-048 | ✅ | 真实点击 `#l0-statusbar`(1) → `#l2-entry-*`(2) 即出内容；返回 = 1 次 `#l2-back`；进入前先折叠入口菜单以保证快照可复原 | — |
| C7 | L2 期间风险位可见 | FR-V3-048 | ✅ | `#risk-rail`/`#l0-statusbar` 为 `body` 直挂；运行期 ⑥ `railVisible=true` + 祖先闭包无 `[data-l2-view]` | — |
| C8 | 命令目录逐条有档 | FR-V3-049 | ✅ | 逐卡 `data-action`/`data-effective-action`/`data-policy-options` + 四行文本（档/来源/默认·覆盖·生效/成因）；运行期 ⑧ 缺项 = 0 | — |
| C9 | delay 单源 + 硬底线零控件 | FR-V3-049 | ✅ | `buildCatalogView().noEscalationNote === TREE_NO_ESCALATION_NOTE`（同一常量，直取不另写）；硬底线卡 `policyOptions=''`；tighten-only 卡永不含 `allow` | — |
| C10 | 审计零明文 + URL 去参 | FR-V3-050 | ✅ | `toAuditRow` 逐字段 **pick**（非 spread）；单测注入 `apiKey/sk-live/剪贴板/原因/args` 零泄漏；`stripUrlParams` 去 query+fragment；运行期 ⑨ 字段集合恰 7 列 | — |
| C11 | 设置等价 + options.html 零 diff | FR-V3-051 | ✅ | `data-l2-view="settings"` 唯一改动；7 个 v1 id + `settings-migration` 全在；`#settings-back` 语义未改；`options.html` 0 行 diff | — |
| C12 | 树 ARIA/键盘/面包屑仍被断言 | FR-V3-052 | ✅ | 见 §2.2-2；`tree-drawer.ts` 0 行 diff；`#I-*` 标识零丢失 | — |
| C13 | 9 动作 + 固定序 | FR-V3-052 | ✅ | 目录只读列表逐字序断言；常量 `TREE_ACTION_IDS` 由 A8 sha256 pin（改一值即 FAIL）+ `tree-ops.test.ts` 顺序断言；树内实测 ⊆ 白名单 | — |
| C14 | 零提权 + clamp | FR-V3-053 | ✅ | 目录/审计视图控件 = 0（运行期计数）；伪造 `command-policy-set`（硬底线→allow）后 `effective=deny`/`overridable=false`/选项空；树内控件仍为 v2 既有覆盖控件（SW 侧 clamp） | — |
| C15 | 返回后密度复位 | FR-V3-054 | ✅ | 运行期 ④ 用 `DENSITY_MEASURE_SOURCE` 单源实测默认档 `C1 ≤ 7 · C2 ≤ 15` PASS；`test:density` 三档三视口 127/0 | — |
| C16 | 体积 | NFR-V3-005 | ✅ | `dist/sidepanel.js` 实测 **349,880** == 登记；ceiling `floor(349,880×1.05)=367,374`；容差 5% 未动、cap 仍 record-only、`targetBudgetBytes/targetMet` 仍 `null`；历史值全保留（`_TIMELINE`/`_RE_REGISTRATIONS` 追加 `v3-3`） | — |
| C17 | 权限零新增 | NFR-V3-006 | ✅ | `manifest.json` 0 行 diff、`grep -c contextMenus = 0`；`package.json` 依赖段 diff 仅 scripts 两行 | — |
| C18 | 320px / 主题 / 无障碍 | NFR-V3-009~011 | ⚠️ | 320px 零溢出仅覆盖**连接树 + 命令目录**两个视图（审计/设置视图无独立 320px 探针）；明暗主题无 L2 独立探针（沿用 v3-1/insight 的既有守卫）；焦点管理（标题 `tabindex=-1` + 返回回焦入口）已实现但未断言 `activeElement` | 低 |
| C19 | EC 落点 | spec §6 | ✅ | EC-V3-016（分列+无夸大）、EC-V3-008（320px 视图内零溢出）、EC-V3-011（入口带非空计数）、EC-V3-013（本叶内台账+新断言闭合）、EC-V3-014（`openL2View('tree'/'commands')` 每次强制重拉 → 反映当前 origin）、EC-V3-002/003（硬底线成因可读 + 零放宽控件）逐条有实现或门禁 | — |
| C20 | AC-V3-026 八项等价 | AC-V3-026 | ⚠️ | 七项有具体判据（设置项集合 / 审计条目 / 四维度 / `{live,baseline}` 标签 / 9 动作逐字序 / 设置分区 == DOM / 零占用）；**第八项「回执三件套」只出现在 ⑩ 的断言标题里，判据本身不涉及回执**（回执三件套的真断言在 v3-2 的 `l1.mjs`，本叶未复验）→ I-02 | 低 |
| C21 | 取代台账 | AC-V3-011/012/014 | ✅ | 实跑 `test:supersession` 11/11；独立用 `git diff base(c2c0e0d)` 重算 insight.mjs 删除行 **27 条**并逐行定位（13/17/56/57 命中 V31-MR-I7 与 V31-MR；458/1034-1041/1047-1054/1063-1072/1320/1480 命中 V33-MR-01~06）；计数不减（772/127/160/103/71/167/116/192/24/9）；`l2.mjs` 静态 `check(` 68 == `v3GateFloors` 68 且常开判据 `countChecks ≥ floor` 对真文件生效（反证的记录有效性另见 §2.7 / F-01） | — |
| C22 | 入口文字 + 计数 + ARIA 真目标 | AC-V3-010 | ⚠️ | 三处同源（标签 ≡ `data-count` ≡ 面板摘要）实跑成立、`n/a` 豁免已删除；**但 `#l2-entry-settings` 的 `aria-controls` 被 `render()` 改回 `view-host`**（受控探针原文见 §2.2-5）→ I-01 | 中 |
| C23 | ADR-V3-025 遵循 | ADR-V3-025 | ✅ | 宿主为 `#log` 兄弟；`hidden` 属性切换（非 CSS）；单滚动；风险位天然不被替换；`#log` 仅隐藏不重建（滚动/草稿保留语义） | — |
| C24 | ADR-V3-026 遵循 | ADR-V3-026 | ✅ | `deriveCounts` 单点（入口面板 / 状态栏 / 视图标题 / 入口 `data-count` 全部读 `currentL2Counts()`）；默认档 C1 仍恰 7（未为计数新增 L0 常驻可点） | — |
| C25 | ADR-V3-027 遵循 | ADR-V3-027 | ✅ | 只读复用 `archive-catalog#buildArchiveModel`（不重算策略）；措辞单源；零控件；9 动作只读展示 | — |
| C26 | ADR-V3-028 全 6 条 | ADR-V3-028 | ✅ | id 零重命名 / 内容零改动 / 归属迁移 / `role=dialog→region`+`aria-modal` 移除+`aria-haspopup` 删除（台账 V33-S1 reason + `index.html` 注释登记）/ ARIA·键盘·面包屑·9 动作零改动 / FAB 默认 `hidden` 且仍在视图内作树体开关（非死代码）/ 取舍登记在 ADR §3.2+§6 | — |
| C27 | ADR-V3-029 遵循 | ADR-V3-029 | ✅ | 三类改动按同编号迁移登记；`sidepanel-view.test.ts` 零迁移零删用例（38 用例 ≥38）；union 口径 `insight 116 ≥ 108`；**但**「改写既有测试文本」的 1 处（`v3RevealComposer`）未登记 → I-04 | 低 |
| C28 | plan §5 文件影响对齐 | plan §5 | ✅ | 计划 15 项 vs 实际：新增 5 src + 2 test 全对；计划中的 `disclosure.ts`/`tree/tree-drawer.ts` **实际未改**（v3-1 折叠器白名单已含 `l2-entries`、抽屉 root 由调用方注入 → 无需改）＝「计划多余」；计划未列但实际修改的 `l0/{shell,status-bar}.ts`、`size-*.ts`、`gate-integrity.test.ts` ＝「计划遗漏」，两者均由 `build.md §2` 如实列出（信息性，非偏差） | 低（信息） |
| C29 | 边界不越 | 父 §2.2 | ✅ | 变更集仅 25 文件（全部在 `packages/web-cli-plugin/**` + 本叶 `.sddu/**`）；`git rev-parse main = 2ddc922…` 未动；无 v1/v2 SDDU、无其它叶 | — |
| C30 | 可读性 / 命名 / 职责单一 | §5.1 | ✅ | 四模块各自单责（派生 / 宿主 / 目录投影 / 审计投影）+ `settings/sections` 登记表；模块头注释写明「为什么」（硬规则 / 分列 / 未知≠0）；导出面克制 | — |
| C31 | 错误处理 | §5.1 | ✅ | `forced()` 缺 DOM 即抛（不静默）；`pullInsightSnapshot`/`refreshAuditView` 的 `catch` 返回 `null` 且**有可见降级**（目录视图显示「不可用…不显示陈旧状态」、计数 `…`）；无 `catch {}` 空吞；`stripUrlParams` 失败方向安全（降级为空串） | — |
| C32 | 无魔法值 | §5.1 | ✅ | 计数/文案/标题全部常量单源（`L2_BAR_TEXT`/`L2_VIEW_TITLES`/`commandCountText`）；`72px` scroll-margin 有注释说明来源（sticky 头最坏高度 + 间隙）；测试侧 6×250ms / 1500ms 为有界等待常数 | — |
| C33 | 无冗余 / 死代码 | NFR-V3-014 | ⚠️ | `l2/command-catalog.ts#catalogCounts()` 无调用点（dist 已树摇，0 字节）；`audit.ts#AUDIT_FIELD_WHITELIST` 仅被单测读取、**未参与实现**（实现靠 `toAuditRow` 手工 pick，白名单常量与实际字段可漂移）→ I-05 | 低 |
| C34 | 纯函数 / 可测性 | ADR-V3-026 | ✅ | `counts.ts` 零 DOM/零 `chrome.*`/零 IO（可 node 直测，8 用例）；`audit.ts` 白名单为**构造性丢弃**（pick 而非过滤后 spread） | — |
| C35 | 测试存在 + 核心路径 | §5.4 | ✅ | 新增 `l2.mjs`(71) + `l2-counts.test.ts`(8)；10 个 FR 均有可执行断言（build §4 映射逐条回代码定位成功） | — |
| C36 | 边界 / 错误场景覆盖 | §5.4 | ⚠️ | 已覆盖：未知真值 `…`、空审计列表、clamp 伪造、明文反例、320px（两视图）、无卡态前置重试、`n/a` 删除；**未覆盖**：audit/settings 视图 320px、L2 视图明暗主题、`activeElement` 回焦断言、`#l2-entries` 展开态的密度（非登记档）→ I-05 | 低 |
| C37 | 断言有效性 | §5.4 | ⚠️ | 71 条逐条走查：**2 处标题↔判据不一致 + 1 处恒真合取**——⑦`aria-expanded 只出现在可展开节点上` 实际只断 `expandedCount > 0`；⑦硬底线判据含 `hardFloorCount >= 0`（恒真，实际只有 `hardFloorWithControl === 0` 在起作用，且未断 `hardFloorCount > 0` 反空转）；⑩标题含「回执三件套」而判据不涉及 → I-02 | 低 |
| C38 | 虚绿扫描 | NFR-V3-013 | ✅ | 空吞 / `assert.ok(true)` / `\|\| true` / 只 log 不断言 / try-catch 包断言 / 过宽 skip / 提前 `exit(0)`：本叶改动面 **0 命中**（原文见 §7） | — |
| C39 | 反证独立性与真 FAIL | NFR-V3-013 | ❌ | 逐份读 `rp/*.log`：RP-V33-01（去 `hidden` → 70/1 FAIL，还原 71/0）**有效**；RP-V33-02（计数常量 → ③ 两条红 `before=113 after=113`，sha256 还原）**有效**；RP-V33-04（元门禁 R1a 命中 `l2.mjs:653`，还原 9/9）**有效**；RP-V33-05（+1 B → 体积 FAIL，还原 772 PASS）**有效**；**RP-V33-03 无效**（FAIL 来自副本被 `node --test` 当测试文件执行的 `ERR_MODULE_NOT_FOUND`，`--files-override` 判据未生效）→ **F-01（阻塞）**；我已经正确调用形态独立复现真反证（§2.7） | **阻塞** |
| C40 | 计数只增不减 + 元门禁自动纳入 | AC-V3-012 | ✅ | 实测：772/11/127/160/103/71/167/116/192/24/9；`gate-integrity` 受审集合 8→9 且**目录扫推导**断言「新门禁必须被纳入」（`l2.mjs` 已同时进 `CHROMIUM_GATES`/`STATIC_ONLY_GATES`）；`test:v3` 串行链已插 `test:l2` | — |
| C41 | 文档数字保真（build.md） | §6 | ⚠️ | 12 个关键数字**逐一对上实测**（772/127/160/103/71/167/116/192/24/9/349,880/367,374/177,076/+31.29%/98.7%/21,404/16,615/684）；**4 处不实**：① 「新增文件 **6**」实为 **7**（§2.1 表内即 7 行）；② l0 `157 → 160` 的构成括号（`+4+1+1+1−1`）算术不成立——豁免分支本就每条 2 断（与新的「摘要 + hidden」2 断同数），实际增量为 **+3**（`+1 无数字 / +1 摘要带计数 / +1 反证真值非零`）；③ `closeoutRoundRows` 合计 21,170 ≠ 登记的 21,404（差 234 B 未拆分）；④ 「输入模块数 51」实测 **52** 行（`size:attribution` 输出） → I-03 | 低 |
| C42 | 机读登记册保真 | ADR-V3-011 | ⚠️ | `size-baseline.ts` 与 `size-budget/size-growth-evidence` pin 一致（`349,880`/`367,374`/`54,655`/`previousCeiling 344,899`）✅；台账 `staticCalibers.readings` 905/783/772 由门禁机器复算 ✅；`v3SkeletonExemptions` 两个豁免均按 v3-1 登记的 `removalCondition` 删除并留 `why/history` ✅；**但** `docs/v3-density-baseline.json#volume.growthBreakdown` **未随重算同步**（仍是 v3-2 值 33,251/26,913/5,888/220/230 + `--rev 615bd0f` + 「输入模块 41 → 47」），且 `volume.reRegistrations` 缺 `v3-3` 条目（`crossRef` 却声明「与 size-baseline.ts 同源（机器比对）」）→ I-03 | 中 |
| C43 | 红线零改动 | 父 plan 红线 | ✅ | 原文见 §8：`content.js 177,076` + sha256 `52a82620…`；`src/content/**` 三 hash 与 pin 逐字相等；`policy.ts bfcb2ede…`/`auto-authorize.ts 1096d065…`；`manifest.json`/`options.html`/`sidepanel-view.test.ts`/`perf-budget.test.ts`/`design/**`/`web-cli-base/**`/`src/insight/**` 0 行 diff；阈值 `7/15·9/20·17/35` 逐字；依赖零新增；无新增常驻输入框；风险位不可折叠（`disclosure.ts` 0 diff） | — |
| C44 | 审查纪律 | 本轮边界 | ✅ | 见 §9：`git status --porcelain` 空；`main` 未动；未 commit/未 `git add`；实验脚本仅落 `/tmp/opencode/v3-3-review/`；只读运行门禁（仅生成 gitignore 的 `dist-test/`） | — |

---

## 4. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 规范符合性（C1~C22） | 22 | 19 | 3（C18 / C20 / C22） | 0 | 86.4% |
| 架构一致性（C23~C29） | 7 | 7 | 0 | 0 | 100% |
| 代码质量（C30~C34） | 5 | 4 | 1（C33） | 0 | 80% |
| 测试质量（C35~C40） | 6 | 3 | 2（C36 / C37） | 1（C39） | 50% |
| 证据/文档保真（C41~C44） | 4 | 2 | 2（C41 / C42） | 0 | 50% |
| **合计** | **44** | **35** | **8** | **1（C39 → F-01）** | **79.5%** |

> 通过率按「审查项」计；8 条警告已归并为 **5 项可执行改进**（§6）；1 条失败 = **F-01（阻塞，证据缺陷）**（§5）。**规范符合性偏差 = 0**（无 FR/NFR/EC **实现**偏差）——但 F-01 使 NFR-V3-013 的「反证必须实跑」在**证据层**未兑现，故判定不通过。

---

## 5. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| **F-01** | `test/ui/l2.mjs` 反证脚本 `/tmp/opencode/v3-gate-logs/v3-3/rp/rp-v33-03.sh` + `build.md §6 / §6.1`（RP-V33-03 行） | **必做反证的记录无效（证据缺陷）**：脚本用 `node --test dist-test/test/supersession-ledger.test.js --files-override <copy>` 调用 —— ① `--files-override` 在 `--test` 形态下**不进入测试进程 `process.argv`**，判据退化为「对真文件计数」（实测输出 `l2.mjs: 68 ≥ 68`，override 分支从未执行）；② 末尾位置参数被 node 当作**额外测试文件**执行 → 副本 `ERR_MODULE_NOT_FOUND: _v3-helpers.mjs` → 这才是 `FAIL_SEG_EXIT=1` 的真因。`build.md` 把该 FAIL 归因为「`运行时 check 计数 < 台账下界 68`」，而日志中**从未出现**这句话（本叶 spec §5 NFR-V3-012/013/014 与 §7 AC-V3-011/012 明文要求「反证必须实跑」） | C39 | ① 脚本改为**形态 B**：`node dist-test/test/supersession-ledger.test.js --files-override <copy>`（直接执行测试文件、不带 `--test`；副本须与台账同 basename，如 `l2.mjs`）；② 或保留 `--test` 但把副本放入**带 `_v3-helpers.mjs` 的目录**，并**显式断言 override 分支真的生效**（如断言输出出现 `override ok (` 形态、或断言 `FILES_OVERRIDE` 非空——本次失效正是「override 未生效却未被任何断言发现」）；③ 重跑并落盘 FAIL/PASS 两段日志（FAIL 段必须含 `运行时 check 计数 67 < 台账下界 68 —— 删除断言未登记`，PASS 段 `11/11 exit=0`）；④ 订正 `build.md §6/§6.1` 的 RP-V33-03 行文字（现文与日志不符）；⑤ 可选加固：把 RP 脚本纳入元门禁（断言 FAIL 段必须命中**预期失败文本**，防此类「因错而红」再次冒充反证） |

---

## 6. 改进建议（非阻塞，分级）

| # | 位置 | 问题 | 对应 Cx | 级别 | 建议 |
|---|---|---|:--:|:--:|---|
| **I-01** | `src/ui/sidepanel/l0/status-bar.ts#render()`（`btn.setAttribute('aria-controls','view-host')`，对四个入口无条件写入） | **设置入口的 ARIA 目标失真**：实测（受控探针）设置视图打开时 `#l2-entry-settings` 为 `aria-controls="view-host"`（目标 `hidden=true`）+ `aria-expanded="true"` —— 与 `index.html` 声明值 `settings-view`、与 `build.md §2.2`「逐目标」声明矛盾；`l0.mjs ⑥` 只断「目标存在」故不拦截 | C22 | **中** | 把该行改为逐目标：`btn.setAttribute('aria-controls', entry.key === 'settings' ? 'settings-view' : 'view-host')`（或删除该行，交给 `index.html` 的声明值）；并在 `l0.mjs ⑥` 增一条「`#l2-entry-settings` 的 `aria-controls` 必须为 `settings-view` 且与其 `aria-expanded` 同源」断言 |
| **I-02** | `test/ui/l2.mjs` ⑩（:620-631）、⑦（:335、:355-359） | **断言标题超范围/恒真合取**：① ⑩ 标题含「回执三件套」，判据只做类型检查；② ⑦ `aria-expanded 只出现在可展开节点上` 实断 `expandedCount > 0`；③ ⑦ 硬底线判据含 `hardFloorCount >= 0`（恒真），未断 `hardFloorCount > 0` 反空转 | C20 / C37 | **低-中** | ① 标题去掉「回执三件套」或补判据（`#tree-receipt` 三件可达 / 或显式引用 v3-2 `l1.mjs` 的断言位置）；② 改断「每个带 `aria-expanded` 的 treeitem 均有可展开子节点」（`aria-expanded` 与子 `ul` 存在性同源）；③ 改为 `hardFloorCount > 0 && hardFloorWithControl === 0` |
| **I-03** | `build.md` §1/§5.2/§1.1 · `docs/v3-density-baseline.json#volume` | **文档/登记册数字保真 5 处**：① `build.md` 「新增文件 6」→ 实为 7；② l0 `157→160` 的增量构成括号算术不成立（实为 +3，豁免分支与新分支均为 2 断/条）；③ `closeoutRoundRows` 合计 21,170 ≠ `closeoutDeltaBytes` 21,404（234 B 未拆分）；④ `duplicationCheck` 「输入模块数 51」实测 52 行；⑤ **`docs/v3-density-baseline.json#volume.growthBreakdown` 未随本轮重算同步**（仍 v3-2 值 + `--rev 615bd0f`）且 `volume.reRegistrations` 缺 `v3-3` 条目，而 `crossRef` 声称与 `size-baseline.ts` 同源 | C41 / C42 | **低**（⑤ 中） | 逐处订正；⑤ 二选一：(a) 把 `volume.growthBreakdown` 更新为 54,655/43,528/10,443/265/419 + `--rev cf2af32 --rev WORKTREE`，并追加 `reRegistrations.v3-3`；或 (b) 删除该重复副本，只留 `crossRef` 指针（避免同一事实两处登记再次漂移），并在 `test:density` 阶段 F 增一条「volume 只允许来自单一源」的断言 |
| **I-04** | `test/ui/insight.mjs`（`v3RevealComposer` 6×250ms 有界重试）· `docs/v3-supersession-ledger.json` | **台账盲区**：该改动删除/改写了 v3-1 加入的既有测试文本（2 行），但 `insight.mjs` 不在 `protectedRanges`，且删除行判据以 `base=c2c0e0d` 为基准 —— v3-1 之后加入的行即使被删除也**不可见**，故本次改写没有任何台账条目（`V33-S14` 只覆盖三条**新增** helper） | C27 / C39 | **低-中** | ① 补一条 `entries[]`（`oldTitle` = 原 `revealFallback` 两行原文，`newTitle` = 有界重试首行，`reason` = L2 读通路重绘导致 fallback 状态被清、重试为状态前置且有界）；② 在台账 `note` 或元门禁中**明写该口径局限**（删除判定为 `base`-relative，post-base 行不在覆盖内），供后续叶参考；③ 可选加固：元门禁增一条「新增门禁文件的删除行必须相对**上一叶收口 commit** 逐行命中」的双基准判定 |
| **I-05** | `src/ui/sidepanel/l2/command-catalog.ts#catalogCounts()`（:139-146）· `src/ui/sidepanel/l2/audit.ts#AUDIT_FIELD_WHITELIST` · `test/ui/l2.mjs` 320px 段 | **死代码 / 未接线常量 / 覆盖缺口**：① `catalogCounts()` 无调用点（0 字节成本但为死代码，且是「第二套计数派生」，与 ADR-V3-026「单一派生点」精神相悖）；② `AUDIT_FIELD_WHITELIST` 未被实现消费（`toAuditRow` 手工 pick）→ 常量与实际字段可漂移；③ 320px 零溢出仅覆盖 tree/commands 两视图，audit/settings 无探针；L2 视图无独立明暗主题探针；`panelScrollerCount` 判据不含「`overflow:auto` 但未溢出」的容器 | C33 / C36 | **低** | ① 删除 `catalogCounts()`（或改为 `counts.ts` 的唯一来源并让入口计数改读它，二者留一）；② 让 `toAuditRow` 从此常量派生 pick 列表（`Object.fromEntries(AUDIT_FIELD_WHITELIST.map(...))`）或删掉该常量只保留 `AUDIT_RENDERED_FIELDS`；③ 把 320px 段扩到四个视图 + 增 `activeElement` 回焦断言；④ 单滚动判据改为「`overflowY ∈ {auto,scroll}` 的元素计数 = 1」（不看是否已溢出） |

---

## 7. 虚绿扫描原文（C38）

```text
# 扫描面 = 本叶新增/修改的全部源与测试文件（19 个）
$ grep -nE "catch\s*\{\s*\}"  <19 files>                     → 0 命中
$ grep -nE "assert\.ok\(true|assert\.ok\(1" <19 files>        → 0 命中
$ grep -nE "\|\|\s*true" <19 files>                           → 0 命中
$ grep -nE "xit\(|xdescribe\(" <19 files>                     → 0 命中
$ grep -nE "process\.exit\(0\)" <19 files>                    → 0 命中
   （L2/insight/l0 的 process.exit(1) 均为失败分支/前置缺失分支，方向正确）
$ grep -nE "\.skip\b" <19 files>
   test/size-budget.test.ts:75   t.skip('dist/sidepanel.js not present — build first …')   ← 既有，非本叶新增
   test/size-budget.test.ts:97   t.skip('dist/content.js not present — build first …')     ← 既有，非本叶新增
   test/size-growth-evidence.test.ts:228  t.skip('dist/build-meta.json not present …')     ← 既有，非本叶新增
   ⇒ 实跑 `ℹ skipped 0`（三例本次均真跑并通过）→ 非过宽 skip
$ grep -nE "console\.log" test/ui/l2.mjs                      → 12 命中，均为段落标题日志；
   紧随其后的断言全部是 check(...)（0 处「只 log 不断言」）
$ 本叶新代码的 catch：stripUrlParams / pullInsightSnapshot / refreshAuditView —— 均 return 安全值
  （'' / null），且 null 路径在 UI 上有可见降级（「命令目录不可用…不显示陈旧状态」/ 计数 `…`），
  非空吞、非失败伪装成功。

# 断言标题↔判据一致性（C37 专项）
$ l2.mjs:335  '⑦ aria-expanded 只出现在可展开节点上（树的分层语义保留）' → 判据 = tree.expandedCount > 0      ⚠️
$ l2.mjs:357  check('⑦ 硬底线节点零控件…', tree.hardFloorCount >= 0 && tree.hardFloorWithControl === 0)      ⚠️ 恒真合取
$ l2.mjs:622  '⑩ … / 回执三件套 —— 八项均由真值可读' → 判据不含任何回执相关断言                          ⚠️ 标题超范围
   ⇒ 3 处（归入 I-02）；其余 68 条判据均与标题一致且可 FAIL

# RP 反证脚本层面（新增，见 §2.7）
$ node --test dist-test/test/supersession-ledger.test.js --files-override <copy-删1条>
  → ✖ 1（副本 ERR_MODULE_NOT_FOUND）/ ✔ 11（含 override 判据）/ EXIT=1   ← 「因错而红」的假反证
$ node dist-test/test/supersession-ledger.test.js --files-override <copy-删1条>
  → AssertionError: 运行时 check 计数 67 < 台账下界 68 —— 删除断言未登记 / EXIT=1  ← 真反证
$ node dist-test/test/supersession-ledger.test.js            （还原段）
  → 11/11 pass, fail 0 / EXIT=0
```

**结论**：本叶**新代码/新门禁**不存在空吞异常、`assert.ok(true)`、`|| true`、只 log 不断言、被 try/catch 包住的断言、过宽 skip、提前 `exit(0)`；虚绿风险集中在 **3 处标题/判据强度**（I-02），非「假绿」。

---

## 8. 零改动核验原文（C43）

```text
$ stat -c '%s %n' packages/web-cli-plugin/dist/{content.js,sidepanel.js}
177076 packages/web-cli-plugin/dist/content.js          ← 与登记上限 177,076 逐字节相等
349880 packages/web-cli-plugin/dist/sidepanel.js        ← == SIDEPANEL_BASELINE_BYTES；≤ ceiling 367,374

$ sha256sum packages/web-cli-plugin/dist/content.js
52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6  dist/content.js   ← 与声明前 8 位一致

$ sha256sum src/content/{content-script,dom-agent,page-bridge}.ts   （前 16 位）
a72900313ab77c01 / 7df782b349b32839 / 5737c40a2014e7ad   ← 与 CONTENT_SOURCE_SHA256 pin 逐字相等（test/size-baseline.ts:630-634）

$ sha256sum src/security/{policy,auto-authorize}.ts
bfcb2edeceae19a2… / 1096d065dac63d56…   ← 与 insight-no-escalation.test.ts:293/296 的 pin 一致

$ git diff --numstat bf5773d..HEAD -- <红线文件>            → all 0 lines
manifest.json · src/ui/options/index.html · test/sidepanel-view.test.ts · test/perf-budget.test.ts ·
src/security/** · src/content/** · src/insight/** (只读复用) · packages/web-cli-base/** · design/** ·
test/ui/{l1,journey,binding,hardening}.mjs · test/ui/density-metrics.mjs

$ grep -c contextMenus packages/web-cli-plugin/manifest.json    → 0
$ git diff bf5773d..HEAD -- packages/web-cli-plugin/package.json → 仅 +"test:l2" 与 test:v3 链插入（依赖段 0 行）
$ DENSITY_LIMITS = {"default":{"clickables":7,"lines":15},"firstRun":{"clickables":9,"lines":20},"risk":{"clickables":17,"lines":35}}  ← 逐字 7/15·9/20·17/35
$ git diff cf2af32..HEAD --stat -- test/ui/density-metrics.mjs  → 空（口径单源未改）
$ git rev-parse main → 2ddc92299ad10cfe0ea2b65403243a45ce7fb041（未动，== build.md 声明）
```

---

## 9. 审查纪律核验（C44）

```text
$ git status --porcelain           → （空；仅 gitignore 内的 dist/dist-test 被门禁重建）
$ git rev-parse HEAD              → 42e409d57ef08ea2ed6cb8a13736771136b34b9c（审前审后一致）
$ 未执行 git add / commit / push / checkout / stash
$ 实验脚本落盘：/tmp/opencode/v3-3-review/{typecheck,npmtest,density,l0,l1,l2,ui,insight,binding,
  hardening,e2e,supersession,gate-integrity,l1-reverse,attribution}.log + probe-aria.mjs
$ 本报告与 review.md 为唯一新增文件（本叶目录内）；未改 v1/v2 SDDU、未改其它叶 state.json
$ Chromium 使用：串行，一次一个（15 门禁 + 1 次 ARIA 探针，无并发）
```

---

## 10. 结论

**结论**: **❌ 不通过（1 阻塞：F-01，证据缺陷）**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 35 / 44 = **79.5%**（警告 8 → 归并 5 项改进；失败 1 = C39） |
| 阻塞问题数 | **1（F-01，反证记录无效；实现/AC/红线 0 缺陷）** |
| 规范符合性偏差 | **实现偏差 0 项**；**证据层 1 项**（NFR-V3-013「反证必须实跑」未兑现 → F-01） |
| 可进入 validate | **否（修复 F-01 后即可；实现无需返工）** |

**理由**：
1. **15 门禁串行独立复跑全绿**：`typecheck 0 err` / `npm test 772` / `supersession 11` / `density 127` / `l0 160` / `l1 103` / **`l2 71（新）`** / `journey 167` / `insight 116` / `binding 192` / `hardening 24` / `e2e PASS` / `gate-integrity 9` / `l1-reverse PASS`——与 `build.md §1.1` 声称数字逐项一致。
2. **六项重点打假全部定案**：① 计数真值派生 **真**（RP-V33-02 运行期真 FAIL 原文）；② 语义迁移**未削弱**（`#I-*` 标识零丢失 + 属性迁移三连新增断言 + `sidepanel-view.test.ts` 零 diff 已逐字节核验）；③ `insight` 108→116 为**增强式**（7↔7 同数 + 往返复原/重入一致 + 8 条新前置条件；阈值零放宽）；④ 密度 `chars` −3 **合规**（22/22 有 `previous`，独立复算旧 16 → 新 13 字符恰好 −3，`DENSITY_MEASURE_SOURCE` **未被改动**）；⑤ 体积归因**可信**（`size:attribution` 实跑 Δ=54,655 / 逐模块 19/19 与 `dist/build-meta.json` 全等 / 必需占比 98.75% / 未解释 684 B）；⑥ 有界重试**理由成立且不掩盖断言级缺陷**。
3. **红线零改动原文核验通过**（`content.js` sha256、三 content hash、判定链 hash、manifest/options.html/契约测试零 diff、阈值逐字、无新依赖、`main` 未动）。
4. **但 F-01 阻塞**：本叶 spec 明文要求的「删 1 条断言 → FAIL」反证，其**记录**经复核为无效（`--files-override` 在所用调用形态下未生效，FAIL 实由副本被当作测试文件执行的 `ERR_MODULE_NOT_FOUND` 产生），且 `build.md §6/§6.1` 的归因文字与所选日志不符。我已用正确调用形态**独立复现**该反证的真实 FAIL（`AssertionError: … 67 < 台账下界 68 —— 删除断言未登记`，exit=1）与还原 PASS（11/11，exit=0）——即**能力成立、记录不成立**。修复 = 改脚本调用形态 + 重跑落盘 + 订正 build.md（无产品代码改动）。
5. 其余 5 项非阻塞改进（I-01 设置入口 `aria-controls` 失真【中】/ I-02 断言标题判据强度 / I-03 文档与密度登记册保真 5 处【含 1 中】/ I-04 台账盲区 / I-05 死代码·未接线常量·覆盖缺口）建议在修复轮随行处理。
6. **若编排器裁量**：鉴于 ❌ 的唯一依据是「反证记录」而非实现，且 review 已独立产出有效反证原文（§2.7 形态 B），可将 F-01 降级为「已由 review 独立完成」并允许本叶带账（`build.md` 订正 + 台账/登记说明）进入 validate；此时结论按 ⚠️ 有条件通过处理。**该裁量权在编排器，不在本报告单方面放宽。**

---

## 11. 未能验证项（如实列出，不用推断填坑）

1. **`RP-V33-*` 的 FAIL 段未由我「重新注入」全跑**：我复跑的是**门禁 PASS 段**（15/15 绿）+ **size 归因**（含两道 rev 的 esbuild 重建）；FAIL 段以读取构建轮落盘日志原文为准。**例外**：`RP-V33-03` 因发现记录无效，我**重新做了两种调用形态的对照实验**（副本仍在 `/tmp/opencode/v3-3-review/rp-redo/`，未触碰仓库），并落盘 `rp-v33-03-valid-{fail,pass}.log`（§2.7）；`RP-V33-01/02/04/05` 未重注入（需改 `dist/sidepanel.html` / 重建产物 / 装副本，超出「只审查」边界）→ 判定为「日志原文与失败文本逐字核对通过 + 注入路径可复核」。
2. **人工面（树逐层展开观感 / 窄栏长路径体感 / 键盘体感 / 明暗观感）**：`build.md` 登记「未执行」，我同样**未执行**（无真实阅读器/人工判断）；本报告不对其作任何 PASS 表述。
3. **明暗双主题在 L2 视图内的独立探针缺失**：仅由 `index.html` 主题变量与既有 gate 间接覆盖（C18/C36 警告）。
4. **`state.insight.counts` 的生产期多标签/origin 切换路径**：`EC-V3-014` 由「每次打开强制重拉」+ 既有 `state` 回包保证，我未做多标签真实切换实验。
5. **提交纪律的「逐文件 `git add`（未用 `git add -A`）」**：仅能从最终 diff 范围（25 文件全在本叶范围内、无杂项）间接印证；`git add` 当时行为事后不可复原。
6. **密度 22 格「-3」在不同夹具稳态下的普适性**：我复算的是「去空白字符数」这一确定量（16→13），并对 `test:density` 阶段 A 的「三视口逐项相等（220）」以门禁实跑为准；未在 320/400/520 三视口下逐格人工复测文本内容。
7. **早前轮次 RP-V3-05 的调用脚本原文**：我确认了「形态 B 可让 override 生效」并据 v3-2 日志中的 `67 < 台账下界 68` 断言推断其当时用的是形态 B；但**该轮脚本本身**是否与我推断一致未逐字核对（不在本叶范围）。

---

## 12. 交付联动提示（状态机）

- 本报告与 `review.md` 为本轮**新增产物**；本轮**未修改** `state.json`（遵循 v3-1/v3-2 先例：审查轮不改状态文件；且本会话内 `/tool sddu_update_state` 不可见，未代执行）。
- 当前 `state.json.files` 只有 `spec/state/tree/plan/tasks/tasksJson/parentSpec/discovery`，**缺** `build` / `review` / `reviewReport`。请由状态机/编排器补登记：
  `files.build = …/build.md`、`files.review = …/review.md`、`files.reviewReport = …/review-report.md`，并把 `phase` 置 **`reviewed`**（本叶当前 `phase=builded`）。
- `review.md` 为 Feature 级固定产物（策略）；若后续出现 R2，策略不变时只迭代 `review-report.md`。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | R1 初始创建：15 门禁串行独立复跑 + `size:attribution` 实跑复现 + 1 次受控 ARIA 探针 + `--files-override` 两形态对照实验；C1~C44 逐项判定（35 ✅ / 8 ⚠️ / 1 ❌）；§1 六项重点打假逐条定案（①✅真 ②✅未削弱+ARIA 1 处缺陷 ③✅增强式 ④✅合规且口径未改 ⑤✅归因可复现 ⑥✅有界且不掩盖）；**新增 §2.7：`RP-V33-03` 反证无效 → F-01（1 阻塞，证据缺陷，实现 0 缺陷）**；结论 ❌ 不通过（附编排器裁量路径）；红线与纪律核验原文见 §8/§9；未能验证项如实列于 §11 | 2026-09-16 | SDDU Review Agent |
