# 审查报告：specs-tree-v3-1-l0-shell-density

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C38 审查清单及四维度指引）
> **前置依赖**: `review.md`、本叶 `spec.md` / `plan.md` / `tasks.md` / `build.md`、父 `../spec.md` / `../plan.md`、`docs/v3-supersession-ledger.json`、`docs/v3-density-baseline.{md,json}`
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-16
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-16
> **更新说明**: 初始创建（R1 全量静态审查：C1~C38 逐项结论 + 6 个打假面判定 + 虚绿扫描 + 零改动核验）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **38**（C1~C38） |
| 通过 | **22** |
| 警告 | **16** |
| 失败 | **0** |
| 阻塞问题 | **0** |

**被审基线**：仓库 `/home/usb/wks/gits/GitHub/LGDL` · 分支 `feature/web-cli-plugin` · HEAD `65af737` · 本轮 diff 基线 `c2c0e0d` · `main = 2ddc922`（未动，`git rev-parse main` 复核）。

**纪律声明**：本轮审查**未修改**任何源码/测试/文档/配置，**未** `git add`/`commit`/`push`（`git status --porcelain` 在审查前后均为空，本审查仅新增 `review.md` / `review-report.md` 两份 SDDU 产物）。**未运行** Chromium 类门禁（内存约束）；所有运行期结论均引用已落盘日志 `/tmp/opencode/v3-gate-logs/*.log`。

---

## 2. 逐项审查结果（C1~C38）

| # | 审查对象 | 审查基准 | 评估 | 发现（证据） | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `disclosure.ts` 单一控制器 | ADR-V3-016 | ✅ | 白名单 `COLLAPSIBLE_TARGETS=['topbar','l1-more','l1-ref','l2-entries']`（:55），`assertFoldable()` 对白名单外**抛错**（:91-100）；`#risk-rail`/`#confirm`/`#l0-decision` 在 `NEVER_FOLDABLE`（:66）；收起只写 `target.hidden`（:153），源码零 `display:none`（单测 :185-188 断言）；ARIA 缺一即抛（:146-150）。职责单一、无 `chrome.*`、可在 node 单测 | 低 |
| C2 | `l0/*` 模块边界与唯一实现源 | ADR-V3-003 / 013 / 014 | ⚠️ | **同一规则两份实现且语义冲突**：产品走 `view-model.ts:600-607`（`L0_VISIBLE_RECOMMENDED = 2`），而 `l0/risk-rail.ts:231-255` 另有一份 `partitionDecisionOptions` + `MAX_VISIBLE_RECOMMENDED = 1`，**仅被单测引用、产品零引用**（`grep -rn partitionDecisionOptions src test` 只命中 risk-rail.ts 与 `test/l0-disclosure.test.ts:284,292,296`）。其注释称「V3-1 shows one recommended … keeps the default tier at exactly 7 clickables」与算术矛盾（1 推荐 → 6 可点），也与实测「2 个推荐选项」不符（`density.log:19` 可点明细 = `#l0-status-band｜@ask-option:查看站点声明｜@ask-option:列出可用命令｜#l0-pick｜#l0-more｜#l0-ref-toggle｜#l0-statusbar`） | 低 |
| C3 | 错误处理 / 空 catch 扫描 | NFR-V3-018 | ✅ | `grep -rn "catch\s*{\s*}\|catch\s*(\w*)\s*{\s*}"` 在新代码 **0 命中**；`disclosure.ts:134` catch 只用于 `querySelector` 兜底并 `return null`；`:201` 的 catch 注释明示「白名单违规不可从 click 到达」（该 catch 不包断言）。所有测试侧 catch 均不包 `check()`/`assert` | 低 |
| C4 | 命名与注释一致性（注释≠常量≠运行时） | §5.1 | ⚠️ | ① `view-model.ts:551` 注释「V3-1 shows one (see risk-rail)」但同文件常量 :552 = **2**；② `insight.mjs:1514` 的 PASS 摘要仍打印「`#log ≥589px`」，而同文件 :78-79 实际断言 **488 / 54.0**（输出文案漂移，非断言漂移）；③ `shell.ts:97-98` 在 `card.render()` 之后无条件写 `更多选项（还有 1 个）`，与 `decision-card.ts:140` 的「无卡时 (还有 0 个)」互相覆盖 | 低 |
| C5 | 死代码 / 冗余 | §5.1 | ⚠️ | ① `insight-tree-hierarchy.test.ts:538` 的 `hasDiff()` 已被 V31-S9 取代后**无任何调用**（`grep hasDiff(` 只命中定义）；② `l0.mjs:294-302` 有一处 `const confirm = await evaluate(...setRisk('confirm','force'))` 后 `void confirm`，紧接着 :302 又重复调用一次；③ `risk-rail.ts:174` `RISK_DETAIL_ENTRY_LABEL` 零引用 | 低 |
| C6 | 虚绿模式扫描 | P5 | ⚠️ | 见 §5「虚绿门禁扫描结果」原文。要点：`test/l0-disclosure.test.ts:237` `assert.ok(hooks.disclosure.targets instanceof Array \|\| true)` = **恒真断言**；`test/ui/density.mjs:247` `authorized: ... \|\| true`（诊断字段，非断言）；`test/density-thresholds.test.ts:329` `if (!existsSync(BASELINE_JSON)) return;` = 基线缺失时整段 AC-V3-007 校验**静默跳过**。`assert.ok(true)` / 提前 `process.exit(0)` **0 命中** | 低 |
| C7 | FR-V3-010 三件事三区 | 父 FR-V3-010 | ✅ | `l0.mjs` ① 5 条断言全绿（`l0.log:5-8`）；`index.html:991-1104` 体一级子元素三方区 + 状态栏齐备；band 含 `#status`（origin）、`#llm-status`、`#session-label`、策略徽标 `l0-policy-badge`（`shell.ts:73`）；长串全文经 `title` + L1 详情可达（`shell.ts:89`） | 低 |
| C8 | FR-V3-011 决策卡唯一 / N 真值 | 父 FR-V3-011 | ✅ | `l0.mjs` ② 5 条（含**改真值→N 变**：4 选项 N=3，5 选项 N=4；`l0.log:9-14,18`）；`foldedCount = foldedOptions.length + 1`（`view-model.ts:607`）无硬编码；同一时刻仅一张卡（`#ask` 唯一节点 + 视图模型派生） | 低 |
| C9 | FR-V3-012 末项文案逐字 + 兜底就地展开 | 父 FR-V3-012 | ⚠️ | **「逐字」只在非产品常量上验证**：单测 `l0-disclosure.test.ts:298` 断言的是 **`l0/risk-rail.ts:222`** 的 `OTHER_OPTION_LABEL`；产品渲染用的是 **`view-model.ts:549`** 的同名常量（`decision-card.ts:21` 从 `view-model.js` 导入）。**两常量无相等断言、也无运行时 DOM 文本断言** → 两者漂移不会被任何门禁发现。兜底态可见/回收到 `hidden` 有断言（`l0.log:77-79,87-88`） | 中 |
| C10 | FR-V3-013 默认态零输入框 | 父 FR-V3-013 | ✅ | `l0.mjs` ③ 三条（含 `input:not([type])`/`textarea` 全量选择器）：可见计数 0；`#ask-fallback`/`#composer` 默认 `hidden`（`index.html:1053,1129`）；静态门禁 `density-thresholds.test.ts:257-261` 逐个断言默认 `hidden` 属性 | 低 |
| C11 | FR-V3-014 拾取入口 | 父 FR-V3-014 | ✅ | `density.mjs:450-467` 三条实跑断言：未授权禁用 + 风险位含「页面侧零注入」；探测中禁用（`density.log` 阶段 C 尾部）；`l0.mjs` ① 断言入口存在 | 低 |
| C12 | FR-V3-015 一行状态栏 + ≤4 L2 入口各带计数 | 父 FR-V3-015 | ⚠️ | 状态栏存在/可点开有断言，`≤4` 只体现为常量 `L2_ENTRY_FIELDS`（`status-bar.ts:22`）**无任何数量断言**；且「设置」入口 `count = -1` → `data-count="n/a"`（`status-bar.ts:45`），不满足「各带计数」的字面 | 低 |
| C13 | FR-V3-016/017 风险位独立分区 + 三通道 | 父 FR-V3-016/017、D3 | ✅ | 静态：`index.html:991` `#risk-rail` 为 `body` **首个**子元素、祖先无 `hidden`/`aria-expanded`（`density-thresholds.test.ts:231-246` 实测通过）；运行期：`l0.log:20-29` 5 类 ×（默认可见 + 全折叠后仍可见）10 条 + 三通道齐备；单测逐类断言 `['risk-icon','risk-text','risk-badge']`（`l0-disclosure.test.ts:250-259`）；文本空即抛错 | 低 |
| C14 | FR-V3-018 破坏性确认不折叠 | 父 FR-V3-018、EC-V3-015 | ✅ | 结构：`#confirm` 落在 `#l0-decision` 直系（`index.html:1075`）；运行期 4 条（`l0.log:30-33`）：卡可见且在直系、祖先链无折叠容器、带 `data-destructive-option`、不入 `#l1-more-options` 池；`index.html:1082` 明示「超时/取消 = 拒绝」 | 低 |
| C15 | FR-V3-019 零允许控件 | 父 FR-V3-019 | ✅ | `l0.log:34-35` 两条：可见按钮标签集合中零 `允许/放行/…`；风险行文本含 `evaluate` + `不提供「允许」选项`。单测另对 `assertNoAllowControls` 正反断言（`l0-disclosure.test.ts:302-309`） | 低 |
| C16 | FR-V3-020 / AC-V3-010 遍历**所有**折叠入口 | 父 FR-V3-020、AC-V3-010 | ⚠️ | 门禁 `l0.mjs:379` 先取全部 `[aria-controls]`，随后 `wired = entries.filter(trigger ∈ 4 个 L0 触发器)`（:379-380），**只校验 4 条**。未被遍历者至少有 **4 个 `#l2-entry-*`**：它们带 `aria-controls="view-host"`（`index.html:1105-1108`；`status-bar.ts:46`）但**无 `aria-expanded`**（「成对」不成立），且 `aria-controls` 目标 `#view-host` 为空（`<div id="view-host">` 骨架无内容）→ 按 AC 三条件会 FAIL，但被白名单过滤掉。`#ask-other`/`#tree-fab` 有成对属性（合规） | 中 |
| C17 | FR-V3-021 披露可达性 | 父 FR-V3-021 | ✅ | `l0.log:55-56`：L1 一次点击展开/再点收起；L2 两次（状态栏 → 入口）后 `#view-host`/`#tree-fab` 可见；静态门禁断言默认态 L1/L2 容器带 `hidden`（`density-thresholds.test.ts:257-261`） | 低 |
| C18 | FR-V3-022 / AC-V3-001~004 三档×三视口 + **几何下界迁移** | 父 §9.2、AC-V3-001-004 | ⚠️ | 密度本身 ✅：9 强制格 + 15 登记格全 PASS，阈值逐字未动（`density-thresholds.test.ts:168-176`），default 320/400/520 = 7/6、7/7、7/7（`density.log:20,27,34`），firstRun 7/12/25/6，risk 最差 9/13/25/6。⚠️ 见 §3 P2 判定：几何锚点 589/65.0% → 488/54.0% 属**合法跟随新布局但实质性放松**，且**余量比登记的更薄**（登记依据「实测 498 − 10」，实际最坏档实测 **495**（`l0.log:76` `log h=495`；`density.log:27` `ch=495`）→ 实余量 **7px**） | 中 |
| C19 | FR-V3-023 展开态记忆契约 | 父 FR-V3-023 | ✅ | 单测往返（`l0-disclosure.test.ts:207-224`：`snapshot → collapseAll → restore → snapshot 相等`）；`window.__v3.disclosure` 暴露 `toggle/collapseAll/expandMemory`（幂等安装单测）。运行期仅以 `snapshot()` 作指纹（`density.mjs:253`），未做 L2 往返的运行期断言（本叶只承诺「契约」，可接受） | 低 |
| C20 | FR-V3-024 hidden + ARIA 成对 | 父 FR-V3-024、NFR-V3-011 | ✅ | `sidepanel.ts` 把 `notice/site-hint/send-reason/onboarding/discovery-notice/settings-view/scroll-bottom` 的 `style.display` 切换**全部改为 `hidden`**（diff :576,666,678,692,719 等）；静态门禁断言 `[hidden]{display:none!important}` 存在（:287）+ 12 个容器默认 `hidden`；RP-V3-03 证明 CSS 隐身不算豁免 | 低 |
| C21 | FR-V3-026 / AC-V3-020 双主题可读 | 父 FR-V3-026 | ⚠️ | `l0.mjs:473-498` 双主题 6 条断言**偏弱**：只断言风险行文本非空、徽标+图标齐备、`getComputedStyle` 的 `color`/`backgroundColor` **字符串非空**——不判对比度、不判两主题确实不同、不判「不只靠颜色」的语义（无颜色→仍可读的负例） | 低 |
| C22 | NFR-V3-001/002 + AC-V3-005 口径与同源 | 父 §9.1、AC-V3-005 | ✅ | 口径逐条与 §9.1 一致（C1 仅 `hidden` 豁免 + 标签集 + `tabindex≠-1`；C2 `⌈Σ自身直接文本/34⌉`，34 pinned；C3/C4 只登记）；阈值 `7/15·9/20·17/35` 逐字断言；**同源硬证明**：`density.log:7-8` 「我们的口径 C1=7 C2=12 C3=51 C4=6 chars=375 ｜ 稿件自带 clickables=7 lines=12 blocks=51 regions=6 → 逐项相等」；公布值落差（E +0/+2/+4/0、D −1/+1/+1）如实登记 | 低 |
| C23 | ADR-V3-001/003/004/005 三段式门禁 | 父 ADR-V3-003~005 | ✅ | 单源 `density-metrics.mjs`（384 行，含阈值/视口/档位/子场景/归属判定/纯判定）；Chromium 门禁 `density.mjs`（阶段 A~E）；静态门禁 `density-thresholds.test.ts`；自带 helper `_v3-helpers.mjs`（不抽共享，既有 4 门禁零字节改动，已登记代价）；测量根 = `document.body` 且口径适配写入注释与基线文档 | 低 |
| C24 | **P1** 反证独立性 RP-V3-01~06 | 父 §9.3、NFR-V3-013 | ⚠️ | 逐条见 §2 P1。结论：**RP-01/05/06 独立性强**（真 DOM / 真产物 / sha256 复原核验）；**RP-02(b)/03/04 打了折扣**（副本或内联副本作「读取侧」，RP-04 只驱动 density 侧探针而非 l0 门禁探针）；无「扰动加在门禁不读的地方」的零证明力情形 | 中 |
| C25 | **P4** 风险位结构保证 | 父 ADR-V3-006 | ✅ | 三重：① `risk-rail.ts` 为 `#risk-rail` **唯一写入者**且**不接受父节点参数**（`renderRiskRail(doc, active)` 自行 `getElementById`，:182-184）；② `disclosure.ts` 白名单不含它且抛错（:91-100 + 单测 :152-174 `collapseAll()` 后 `rail.hidden === false`）；③ 运行期祖先链断言（`l0.log:20-29`，`collapseAll()` 后仍可见）。**遗留面（如实登记）**：该保证是「**经折叠控制器**不可折叠 + index.html 静态契约 + 门禁兜底」，并非代码级禁止 `#risk-rail.hidden = true` 这类直接赋值——但静态门禁（祖先闭包）+ 运行期 5×2 + RP-V3-04 三重会捕获 | 低 |
| C26 | ADR-V3-007/019 取代策略实质 | 父 ADR-V3-007 | ✅ | 真实 diff：`journey.mjs +27/-0`、`binding.mjs +45/-0`（**纯新增**），`insight.mjs +36/-2`（几何三连同编号重 pin），既有 4 门禁计数零降（167/108/192/38）；`insight-tree-hierarchy` 把 r2「journey 零 diff」禁令换为「零删除 + 新增行逐条归属」（V31-S9，见 C27 的放宽标注） | 低 |
| C27 | **P3** 台账字段保真 | AC-V3-011/012、NFR-V3-018 | ⚠️ | ① `protectedRanges` **独立复算通过**：journey `6b45c3fa…` / binding `be9ad0e9…`，byte 偏移 42062 / 105871 与行数 185/184 全等（我另用 Python 重算）；`newTitle` 全部可在目标文件定位（抽查 V31-S1/S2/S3/S5/S7/S9 全命中）。② **hunk ↔ 台账对 journey/binding 实为「空转」**：两文件 0 删除行 ⇒ 无 hunk 可覆盖，V31-S1/S2 的 `oldTitle` 从未被消费；且 **V31-S2 的 `oldTitle`（`await sp.send('Emulation.setDeviceMetricsOverride', { width: 400, height: 900, …})`）在目标文件 `binding.mjs` 中 0 命中**（binding 用的是 `await ext.send(…, height: 1000, …)` @:1560）→ 该字段失真、无门禁校验（`supersession-ledger.test.ts` 只校验 `newTitle`）。V31-S1 的 `oldTitle` 虽存在但**未被删除**（`grep -c` journey=1）。③ `counts.nodeTestLowerBound`：`countMethod` 声明 `runtime-check-calls`，`note` 却写「node `test(` 计数」，且 `646（静态口径）→ 725（运行期）` **跨口径不可比**（我复算：静态 `\btest(` = **814**；排除点号前缀 = **729**；`npm test` 运行期 = **725**）——r2 台账曾显式警告该字段「跨口径混用、不可直接相减」，v3 台账用统一 `countMethod` 的**声明**覆盖掉了该警告 | 中 |
| C28 | ADR-V3-009/017 DOM/id 归属 | 父 ADR-V3-009 | ✅ | 54 id 零重命名（静态门禁 :223-229 断言 54 项全在且 id 不重复）；L0/L1/L2 三分与「谁进 L1」清单落地（`index.html:996-1038` 工具栏入 `#topbar[data-l1-panel]`；`#composer` 仍为 `#panel-bottom` **末元素**，:265）；`body{display:flex}` + `overflow:hidden` 保留（:275-276）；我独立解析 body 一级子元素序 = `risk-rail, panel-top, panel-main, l0-statusbar, l2-entries(hidden), panel-bottom, settings-view(hidden), script` → C4=6 与登记一致 | 低 |
| C29 | ADR-V3-011 / AC-V3-016 体积重登记 | NFR-V3-005、AC-V3-016、NG-V3-010 | ⚠️ | 流程合规：显式 + 前后值（266,500→291,523）+ 日期 + `source`/`buildCommand`/`measuredBy` + 理由 + `_HISTORY` 保留 + 容差 5% 未动 + `targetBudgetBytes/targetMet` 仍 `null` + 断言零删减（V31-S6/S7/S8 登记）+ 方向敏感张力证明；`content.js` 零容差零改动（177,076 B，sha256 `52a82620…`）。⚠️ 两点：① **登记后值 ≠ 最终产物**：`size-baseline.ts:108` = **291,523**，而 `dist/sidepanel.js` 实测 **294,874**（+3,351 / +1.15%，源于登记后的 3 处回归修复；`size.log` 与 `build.md` 表格均记 294,874）→ `note` 里「实测 291,523 B」对最终产物失真（未静默上调 ceiling，ceiling 306,099 覆盖得住）。② **越出父 spec 字面数字**：父 AC-V3-016 写「≤ **279,825**（基线 266,500）」，实发产物 294,874 已超该数；有效上限改为 306,099。该路径由父 plan §2.9 C + ADR-V3-011 **预先授权**，故非违程，但「spec 级数字已被超越」需作者/编排器显式裁决留痕 | 中 |
| C30 | ADR-V3-018 密度基线登记与「只允许收紧」 | 父 §9.4、本叶 ADR-V3-018 | ⚠️ | 登记载体齐备（json 机读 + md 人读 + 与设计稿口径**分列** + `designCaliber.sameSourceProof`）；静态门禁**确实读取并断言**每格 ≤ 上限 + `direction === 'tighten-only'`（`density-thresholds.test.ts:328-362`）。⚠️ 但 ADR-V3-018 决策 2 的后半段**未实现**：Chromium 门禁**不读基线做比对**（`density.mjs` 只在 :656 打印「基线文件：已存在」）→「实测高于已登记基线但仍在阈值内须 warning 登记 / 低于基线须收紧」这条**漂移发现机制缺失**（这正是 C18/C4 中两处来源数字滞后的成因）。另 `logClientHeightFloor` 的来源叙述「实测 498 − 10」与最终实测 495 有 3px 差 | 中 |
| C31 | 断言有效性 | §5.4 | ⚠️ | 主体为**行为断言**（改真值→N 变；阈值 ±1 翻转；`hidden=true` 必降 1；注入可点必修 FAIL）。弱/恒真项：C6 的 `\|\| true`；C21 的双主题「字符串非空」；`l0-disclosure.test.ts:237` 的 `for` 循环里未使用 `id` 的恒真断言；`l0.mjs:440` `panelScrollers.length <= 1 && (panelScrollers[0] ?? 'log') === 'log'` 在 `length===0` 时也通过（真空 PASS） | 低 |
| C32 | 计数只增不减与口径可比性 | AC-V3-012 | ⚠️ | 运行期计数与事实表一致（`npm test` 725/0、`skipped 0`；journey 167、insight 108、binding 192、hardening 24、`test:density` 97、`test:l0` 74、`test:supersession` 8、e2e PASS；均取自日志）。⚠️ 可比性：见 C27③（646 与 725 非同口径；实际静态口径 814/729）。**方向安全**：下界守卫用 646，任一取值均 ≥ 646，故「只增不减」结论成立，但台账宣称的「跨口径歧义已消灭」不成立 | 中 |
| C33 | 边界与错误场景覆盖 | 父 EC-V3-002~015 | ✅ | EC-V3-008（320px）：`l0.log:59-62` 零水平溢出 + 320/400 **可见 id 集合相等** + 五个常驻分区仍在；EC-V3-009（主题切换）：`l0.mjs:473-499` 双主题 + 展开态不重置（`collapseAll` 语义）；EC-V3-015（破坏性期间全折叠）：`l0.log:20-33` 覆盖；EC-V3-010（超预算只能改披露）：RP-V3-01/03 证明；EC-V3-013（不遗留红灯）：全门禁绿 | 低 |
| C34 | 新门禁工程纪律 | NFR-V3-012/018 | ✅ | `check()` 记录失败但不吞（`_v3-helpers.mjs:50-63`），`finish()` 有失败即 `exit(1)`（:74-84）；单 Chromium 实例 + 单 page target（`launch()`/`openSidePanel()`）；日志全量落盘（21 份，最早 02:42 最晚 03:27，无 tail 截断）；`npm run test:v3` 为 `&&` 串行链 | 低 |
| C35 | 门禁覆盖盲区 | §5.4 | ⚠️ | ① **重复渲染的无卡态**未被覆盖：`decision-card.ts:128-133` 的 early-return 分支把 `nodes.more.hidden = decision.foldedCount <= 0`（恒 `false`，因 `foldedCount ≥ 1`），而「无卡」首绘走 :135-144 硬置 `hidden = true` → **同一状态第二次 render 会让 `#l0-more`（"更多选项（还有 1 个）"）重新出现**（`l0.mjs:240-241` 只在 clearAsk 后读一次，恰好通过）；② 基线文件缺失即跳过校验（C6）；③ `l0.mjs:440` 的空集合真空 PASS（C31） | 中 |
| C36 | `build.md` 与实际一致 | §5.4、NFR-V3-015 | ⚠️ | ① 文件计数不符：`build.md §1`「新增文件 **13** 个（4 src + 4 test/ui + 2 test + 3 docs）」，实际 `git diff --name-status` = **22 A / 11 M**（剔除 6 份设计稿归档后新增 **16**：5 src + 5 test/ui + 3 test + 3 docs），且与自身 §2.1 表（15 行/16 文件）矛盾；「修改 12 个」vs 实际 **11**。② 偏差与人工面登记**如实**（§3.2 六项 ⏳ 未执行；§4 六条偏差含 3 处受控重 pin 与几何迁移自述）；③ `build.md §1` 的体积表同时给出 294,874（门禁表）与 291,523（重登记段）而未点明差异来源 | 低 |
| C37 | `docs/**` 同步 | ADR-V3-018 | ✅ | `v3-density-baseline.json`（机读，245 行）+ `.md`（人读）齐备；`json` 与 `density.log` 阶段 B/C 实测逐格一致（default 7/6·7/7·7/7、firstRun 7/12、risk worst 9/13、regions 6）；与设计稿口径分列且含 `sameSourceProof`；`65af737` 的「收敛实测值」只改了 `chars` 与 `measuredBy`（`clickables/lines/blocks/regions/logClientHeightFloor` 未动，如实说明）；台账与代码同源（ledger 的 `v3GateFloors` 与门禁 `check(` 计数一致：l0=50、density=40，我复算相同） | 低 |
| C38 | 人工面登记 + 红线零改动 | NFR-V3-015、AC-V3-017/027 | ✅ | 人工面 6 项全部 `⏳ 未执行`（未冒充 PASS）。红线独立核验见 §6：`manifest.json` / `options.html` / `src/content/**`（3 源 + 产物）/ `src/security/{policy,auto-authorize}.ts` / `web-cli-base/**` / 依赖段 全部零 diff，sha256 与 pin 一致 | 低 |

---

## 3. §1 六个重点的逐条判定

### P1 反证独立性（RP-V3-01~06）
| 反证 | 扰动施加点 | 读取侧 | FAIL→还原→PASS | 独立证明力 |
|---|---|---|---|---|
| RP-01 | 真 DOM（`document.body.appendChild(button#rp01)`，`density.mjs:511`） | **真** `DENSITY_MEASURE_SOURCE` + **真** `evaluateDensity`（:513-521） | 两段实跑 ✔（`RP-V3-01.log` 4 条，诊断含 `C1 8 > 7`） | **强** |
| RP-02(a) | 纯函数 `limitsOverride={6}` | 真判定函数 | — | 中（参数级，等价于静态断言） |
| RP-02(b) | **`/tmp` 副本**改 `7→6`（:531-537） | 真测量源 + **副本**判定函数 | 两段实跑 ✔；原文件 sha256 未变 ✔（`RP-V3-02.log`） | 中（副本驱动；「门禁自身是否消费阈值」由静态逐字断言 + RP-01 补足） |
| RP-03 | 真 DOM（对 `#l0-ref-toggle` 施加 4 种 CSS 隐身） | **门禁内联副本** `c1Probe`（:105-115），非口径单源 | 两段实跑 ✔（不下降；`hidden=true` 必降 1；还原回 7） | 中（规则一致但实现是第二份） |
| RP-04 | 真 DOM（把风险行搬进 `hidden` + `[data-l1-panel]` 容器） | `riskVisibleExpr`（**density.mjs 的副本**，该副本确实被阶段 C 使用 :445） | 两段实跑 ✔ | 中（命中的是密度门禁的探针，**不是 `l0.mjs` 自己的 `riskProbe`**——即 AC-V3-008/009 的运行期门禁探针未被该反证直接驱动） |
| RP-05 | `/tmp/rp05/l0.mjs` **删 1 条 `check`** | 真台账门禁 `--files-override`（:243-262） | FAIL 段：`运行时 check 计数 49 < 台账下界 50` ✔；还原段 8/8 PASS ✔；`l0.mjs` sha256 = `e9e40131…`（我复算与日志一致，说明还原真实） | **强** |
| RP-06 | 真产物 `dist/content.js +1B` | 真体积门禁（2 个用例 FAIL） | FAIL 段 exit=1 ✔；还原后 177,076 B、sha256 `52a82620…` 复原 ✔（我复算一致） | **强** |

**判定**：**不存在「证明力为零」**；6 条均有实跑日志且 FAIL/还原两段齐备（清单要求的 01/02/03/04 达标，05/06 达 AC-V3-014/015）。但 **RP-02(b)/03/04 的读取侧是副本/内联副本**，「扰动施加在门禁读取的同一路径」这条只对 RP-01/05/06 完全成立 → 定为**中severity 改进项**（建议 RP-03/04 复用 `DENSITY_MEASURE_SOURCE` / `l0.mjs` 的 `riskProbe`，RP-02(b) 改为驱动 `npm run test:density` 的一次真实运行）。

### P2 几何锚点 589px/65.0% → 488px/54.0%：合法跟随还是变相削弱？
- **① 旧值性质**：589px 是 **dev.md §11.3 记录的 v1 实测值**（`insight.mjs:261-265`：「dev.md §11.3 records the v1 `#log` 589px/65.5% *before* the FR-052 chrome landed」）；`65.0%` 是 `589/900=65.44%` 的**保守下取整**（旧注释原文 `conservative lower bound`）。即旧对是「实测基线 + 保守取整」，**不是**刻意留裕量的低门槛——但它原本是在**去掉 5 处镀铬**（`MEASURE` 里 `display:none` 掉 site-hint/onboarding/discovery-notice/consent-slot/send-reason）的稳态上断言的。
- **② 新值性质**：488 = **新布局首轮实测 498 − 10**（登记口径见 `density-metrics.mjs:198-216` 与 baseline json 的 `logClientHeightFloorNote`），`54.0` = `488/900=54.2%` 的保守下取整。**不是把上限抬高，而是把下界钉到新布局的实测下界**（且规则写死「只允许上调」）。但我在最终产物上复核到的最坏档实测是 **495**（不是 498）→ 实余量 **7px（1.4%）**，即「钉死实测下界、余量很薄」，未来轻微字形/滚动条抖动（≥8px）即会变红。
- **③ 契约语义是否仍被断言**：**是，且更直接**。迁移后的同一批编号（`#I-05~10 / #I-20i / #I-20k / #I-19h`）仍断言 `flex-grow === '1'`、硬 `≥ floor`、`composer ∈ [0,+8]`（`insight.log:12-13,55-56,63-64,72-73,97-98,21` 全绿），并在 **`l0.mjs` ⑧** 新增更强结构断言：四区两两交面积 = 0（6 组）、`#log` 唯一面板级滚动容器、兜底态 `#composer` 贴底（gap∈[0,+12]）且不被常驻区遮挡、与 `#log` 不重叠、`fallback/composer` 成对回 `hidden`（`l0.log:76-88`）。
- **判定**：**合法跟随新布局（非变相放宽上限）**——阈值（7/15·9/20·17/35）与口径零改动，迁移有父 ADR-V3-009「增强式迁移」+ 本叶 ADR-V3-019 V31-S3 授权、有登记、语义保留并增强、下界只允许上调。**但**它是**实质性放松**（消息区可接受高度 −17.1%），且**披露的余量与最终产物不符**（498 vs 495）→ 计 1 项中severity 改进（只登记、不动下界）。

### P3 取代台账是否橡皮图章（9 entries / 26 modifiedRanges）
- **① `newTitle` 能否定位**：能。抽查 V31-S1 `await v3RevealComposer(sp);`（journey）、V31-S2 `const revealFallbackInput = async (page) => {`（binding）、V31-S3 `import { LOG_CLIENT_HEIGHT_FLOOR } from './density-metrics.mjs';`（insight）、V31-S5「FR-V3-019 …」、V31-S6/S7/S8/S9 全部命中；门禁用例 :225-238 实测通过（`supersession.log`）。
- **② 被登记为「取代」的 hunk 是否语义等价**：**journey/binding 根本没有被删除/改写的 hunk**（`+27/-0`、`+45/-0`）→ V31-S1/S2 是「**纯新增前置展开**」的登记，其 `oldTitle` 字段**失真**（V31-S2 的 oldTitle 在 binding.mjs 0 命中；V31-S1 的 oldTitle 仍在 journey.mjs 且未被删除）。insight 的 2 行删除（`LOG_MIN_HEIGHT=589 / LOG_MIN_RATIO=65.0`）→ 换成 `LOG_CLIENT_HEIGHT_FLOOR=488 / 54.0`：**等价性成立**（同编号、同结构、仍硬 ≥），但数值确实放松（见 P2）。`size-*` / `insight-archive` / `insight-tree-hierarchy` 的 24 条 modifiedRanges 逐条核对**与真实 deleted 行一一对应**（我按 `-U0` 行文本比对，未发现错配）。
- **③ 有无未登记却被修改的受保护文件/区间**：**无**。受保护测试文件集合的实际改动全部落在 `modifiedRanges ∪ entries ∪ protectedRanges ∪ zeroDiffFiles` 内；`hardening.mjs` / `sidepanel-view.test.ts` / `perf-budget.test.ts` / `e2e/fullchain.mjs` 零 diff（我逐条 `numstat` 复核为空）。**唯一越界**：`package.json` 有 `-2` 行（改写 `test` 脚本行）不在台账覆盖集合内（非受保护文件，低severity）。
- **④ `protectedRanges` 字节 hash 是否真不变**：**真**。我用 Python 独立复算两段区间的 sha256 与起始字节偏移，**四项全等**（journey `6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63` @42062 / 185 行；binding `be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936` @105871 / 184 行）。
- **判定**：**不是全面橡皮图章，但存在两处失效字段与一处空转**：`oldTitle` 无门禁校验（已实际失真）、journey/binding 的 hunk↔台账检查**空转**（0 删除⇒恒真）、`counts.nodeTestLowerBound` **跨口径**（646 静态 vs 725 运行期；静态实为 729/814）。**实质纪律成立**（既有断言零删除有独立证据：`insight-tree-hierarchy.test.ts:600-601` 的 `deletedLines('HEAD'/'R2_BASE', journey) == []` + 真实 diff 纯新增 + 四门禁计数零降）。

### P4 风险位「风险永不折叠」是否结构性保证
- 直挂 `body`：`index.html:991` 为 body **第一个**子元素；运行期 `l0.log:24`「风险位是 body 直接子元素（独立分区）」✔。
- 祖先闭包无 `hidden`：静态（`density-thresholds.test.ts:231-246`，逐个祖先断言无 `hidden`/`aria-expanded`）+ 运行期（`l0.log:20-29`，5 类 ×2 场景，含 `collapseAll()` 后）。
- `disclosure.ts` 白名单**确实排除**且**确实抛错**：`NEVER_FOLDABLE` 含 `risk-rail/confirm/l0-decision/ask/log/composer`（:66）；`assertFoldable('#risk-rail')` → `DisclosureError`（单测 :152-155、:174）；`collapseAll()` 后 `rail.hidden === false`（单测 :172 实测）。
- 唯一写入者：`renderRiskRail()` 自行 `getElementById('risk-rail')`，**不接受父节点参数**（:182-184）→ 无调用方可把风险行嫁接到折叠容器。
- AC-V3-008/009 是否真覆盖 5×2：**是**（`l0.log:20-29` 10 条 + `:30-33` 4 条祖先链 + `:34-35` 硬底线 2 条）。反证 RP-04 实跑 FAIL→还原→PASS ✔（但驱动的是 density 侧探针，见 P1）。
- **遗留（如实登记，非阻塞）**：保障的边界是「经控制器不可折叠 + 静态契约 + 门禁兜底」，代码层**未禁止**直接 `#risk-rail.hidden = true`；当前三重门禁会捕获此类腐化，故判 ✅。

### P5 虚绿门禁扫描
见 §5 原文（`0 命中` 项与命中项逐条列出）。

### P6 是否偷偷放宽阈值/安全语义
| 检查点 | 结论 | 证据 |
|---|---|---|
| 密度阈值恒为 7/15·9/20·17/35 | ✅ 未被改 | `density-metrics.mjs:191-195`；`density-thresholds.test.ts:168-176` 逐字 `deepEqual` |
| 无靠 `display:none`/`opacity`/`visibility` 规避计数 | ✅ | 口径仅豁免 `hidden`；测量源码零命中 4 个禁用 API（阶段 D + 静态双断言）；RP-V3-03 4 变体计数不降 |
| `getComputedStyle` 后门是否堵死 | ✅（对密度口径） | `DENSITY_MEASURE_TEMPLATE` 内零命中（`density-thresholds.test.ts:209-220` 对**表达式本体**再断言一次）；`visibleIn` 只有 1 处实现（:201-202）。注：`l0.mjs`/`insight.mjs` 的**几何**探针合法使用 `getComputedStyle`（与密度口径无关） |
| 安全判定链 sha256 仍等于 pin | ✅ | `policy.ts = bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8`、`auto-authorize.ts = 1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b`（与 spec §NFR-V3-008 的 pin 一致） |
| `manifest.json` 零 diff | ✅ | `git diff --numstat c2c0e0d -- …/manifest.json` **空** |
| `src/content/**` 三冻结文件零改动 | ✅ | 三 sha256 = pin（`a7290031…` / `7df782b3…` / `5737c40a…`）；`numstat` 空 |
| `content.js` 仍 177,076 B（无容差） | ✅ | `stat` = 177,076；sha256 `52a82620…`（与 RP-06 复原值一致）；`CONTENT_MAX_BYTES = 177_076` 未动 |
| **另发现 2 处「数字级」变动（非阈值）** | ⚠️ 需裁决留痕 | ① 体积：ceiling 279,825 → 306,099（父 plan 预授权，但父 AC-V3-016 字面数字已被超越）；② 几何下界：589px/65.0% → 488px/54.0%（父 ADR-V3-009 预授权） |

---

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无**（0 个阻塞） | — | — |

## 5. 改进建议

> 分级：**中**=建议在 validate 前处理；**低**=可随 v3-2/v3-3 顺手处理。全部附可执行修复方向。

| # | 级别 | 位置 | 问题 | 修复建议 |
|---|:--:|------|------|---------|
| I1 | 中 | `src/ui/sidepanel/l0/decision-card.ts:128-133` vs `:141`/`:172` | 无卡态第二次 render 会让 `#l0-more` 从 `hidden` 变可见（early-return 用 `foldedCount <= 0`，而 `foldedCount = folded + 1 ≥ 1` 恒真；首绘走硬置 `true`）→ 出现「更多选项（还有 1 个）」悬空按钮，且与 shell.ts「density budget cannot drift with render count」注释矛盾。**门禁盲区**：`l0.mjs:240-241` 只读一次 | early-return 分支改为 `nodes.more.hidden = !decision.visible \|\| decision.foldedCount <= 0`；并在 `l0.mjs` 补一条「无卡态连续两次 render 后 `#l0-more.hidden === true`」断言 |
| I2 | 中 | `view-model.ts:549` / `l0/risk-rail.ts:222` / `l0-disclosure.test.ts:33,298` | FR-V3-012 的「末项文案逐字」只验证了**非产品**那份常量；两份同名常量无相等断言、无运行时 DOM 文本断言 | 单测加 `assert.equal(OTHER_OPTION_LABEL_from_view_model, OTHER_OPTION_LABEL_from_risk_rail)`；`l0.mjs` 加一条对 `#l1-more-options` 末按钮 `textContent === '其他…（我来描述）'` 的断言（或让两模块共用一个常量） |
| I3 | 中 | `src/ui/sidepanel/l0/risk-rail.ts:231-255` | 死代码 + 与产品语义冲突（`MAX_VISIBLE_RECOMMENDED=1` vs `view-model.L0_VISIBLE_RECOMMENDED=2`），注释算术自相矛盾；单测在为一个产品不使用的实现背书 | 删除 `partitionDecisionOptions`/`MAX_VISIBLE_RECOMMENDED`（或其注释/常量与产品对齐），把「推荐位数/折叠位 N」收敛为**唯一实现源**（ADR-V3-003 的唯一源原则） |
| I4 | 中 | `docs/v3-supersession-ledger.json`（`counts.nodeTestLowerBound`、`entries.V31-S1/S2`） | ① 计数跨口径（`countMethod: runtime-check-calls` vs note「node `test(` 计数」，646 静态 / 725 运行期；静态实为 729（含注释 814））；② journey/binding 无删除行 ⇒ hunk↔台账检查空转；③ V31-S2 的 `oldTitle` 在目标文件 **0 命中**（V31-S1 的 oldTitle 未被删除） | ① 拆成两个字段（`staticTestCalls` / `runtimeTests`）或统一用静态口径重算 before/after；② 给 `oldTitle` 加一条「必须存在于目标文件」的门禁断言（`text.includes(oldTitle)`），对纯新增条目改为显式 `modificationType: 'pure-addition'` 并允许 `oldTitle: null`；③ 修正 V31-S2 的 oldTitle（binding 实际为 `await ext.send('Emulation.setDeviceMetricsOverride', … height: 1000 …)`） |
| I5 | 中 | `test/ui/l0.mjs:379-380` + `index.html:1105-1108` | AC-V3-010「遍历**所有**折叠入口」被白名单缩到 4 条；`#l2-entry-*`（4 个）有 `aria-controls` **无** `aria-expanded`，且目标 `#view-host` 为空 → 按 AC 三条件应 FAIL 却不可见 | 给 4 个 L2 入口补 `aria-expanded`（或去掉其 `aria-controls`）；把 ⑥ 改为遍历**全部** `[aria-controls]` 元素（对 `#view-host` 骨架期可显式登记豁免并写明 v3-3 补齐） |
| I6 | 中 | `test/size-baseline.ts:108,134,141` | 登记「后值」291,523 ≠ 最终产物 294,874（+3,351；源于登记后的 3 处回归修复）→ `note` 里「实测 291,523 B」对产物失真；父 AC-V3-016 的 279,825 字面已被超越 | 不抬高 ceiling，仅**登记保真**：在 `SIDEPANEL_BASELINE_META` 增 `finalArtifactBytes: 294_874`（或改写 `note`/`measuredBy` 说明「重登记时 291,523，最终产物 294,874，仍在 ceiling 内，差值来自登记后的门禁回归修复」）；并由作者/编排器对 AC-V3-016 数字作显式裁决留痕 |
| I7 | 中 | `density-metrics.mjs:198-216`、`docs/v3-density-baseline.json:logClientHeightFloorNote` | 下界来源叙述「实测 498 − 10」与最终实测 **495** 差 3px（实余量 7px）；insight.mjs 输出文案仍打印「`#log ≥589px`」 | 只登记：把 498 改为最终产物实测值并写明实余量；把 `insight.mjs:1514` 的 PASS 摘要改为读 `LOG_CLIENT_HEIGHT_FLOOR`（避免文案漂移） |
| I8 | 中 | `test/ui/density.mjs:648-656`（阶段 E 后） | ADR-V3-018 决策 2 的「门禁读取基线并比对（低于基线须收紧 / 高于基线须 warning 登记）」**未实现** → 基线漂移不会被发现（I6/I7 即其后果） | 在阶段 B/C 后增加「实测 vs `docs/v3-density-baseline.json` 逐格比对」：低于基线→提示更新基线；高于基线但未超阈值→ `warning` 行并计入日志 |
| I9 | 低 | `test/l0-disclosure.test.ts:237`、`test/ui/density.mjs:247` | `… \|\| true` 恒真（前者是断言 ⇒ 虚绿；后者是诊断字段） | 删除该行或改为真断言（`assert.ok(Array.isArray(hooks.disclosure.targets))`） |
| I10 | 低 | `test/density-thresholds.test.ts:329` | 基线文件缺失即 `return` → AC-V3-007/C4 校验静默跳过（TASK-112 之前的引导期遗留） | 改为 `assert.ok(existsSync(BASELINE_JSON), '密度基线必须存在')`（或仅在显式 env 引导模式下允许跳过并打印 SKIP） |
| I11 | 低 | `test/insight-tree-hierarchy.test.ts:595-627`（V31-S9） | r2「journey 零 diff」被替换为「零删除 + 新增行白名单」，白名单正则 `/__v3\|v3RevealComposer\|v3OpenStatusDetails\|v3Collapse/` 过宽：任何**含 `__v3` 的新增 `check(...)` 行**都会通过 | 白名单改为「首 token 必须是 `await` + helper 名」并显式 `assert(!/check\(/.test(line))`；在注释里把「等价或更强」改为「在『零删除』维度更强、在『零新增』维度放宽（已登记）」 |
| I12 | 低 | `test/ui/l0.mjs:493-495` | 双主题断言只判「文本非空 + 颜色/背景字符串非空」，不判对比度/两主题差异/「不只靠颜色」的负例 | 加：两主题下同一元素的 `color` **不相等**且 `backgroundColor` **不相等**；风险行文本在去掉 `color` 后仍可读（三通道断言已有）；可选加 WCAG 对比度下限（≥3:1） |
| I13 | 低 | `test/ui/l0.mjs:440` | `panelScrollers.length <= 1 && (panelScrollers[0] ?? 'log') === 'log'` 在**空数组**时真空 PASS（唯一滚动容器不复存在也算过） | 改为 `assert(panelScrollers.length === 1 && panelScrollers[0] === 'log')`（或显式断言 `#log` 可滚动） |
| I14 | 低 | `test/insight-tree-hierarchy.test.ts:538`、`test/ui/l0.mjs:294-302`、`src/ui/sidepanel/l0/risk-rail.ts:174` | 死代码/冗余：`hasDiff()` 无调用；`l0.mjs` 重复 `setRisk('confirm','force')` + `void confirm`；`RISK_DETAIL_ENTRY_LABEL` 零引用 | 删除无调用函数与重复调用块；`RISK_DETAIL_ENTRY_LABEL` 要么接上「为什么」入口（FR-V3-019 的解释入口），要么删除 |
| I15 | 低 | `test/ui/density.mjs:469-476,653` | 阶段 E 汇总表 `risk worst` 行 `C3` 打印 `undefined`（`worst` 未聚合 `blocks`） | 在 `worst` 聚合里加 `blocks: Math.max(...)` |
| I16 | 低 | `build.md §1` / `§2.1` | 文件计数与真实不符（新增 13 vs 实际 16；修改 12 vs 实际 11；与自身 §2.1 表也不一致） | 按 `git diff --name-status` 重算并订正（或改为「以 §2.1 表为准，§1 计数仅供概览」）；同时点明体积表 294,874 与重登记 291,523 的差异来源 |
| I17 | 低 | `docs/v3-supersession-ledger.json:v3GateFloors` | `density-metrics.mjs: 0`（永不失败的登记项）意义有限 | 要么移除该项，要么为其登记「导出符号/阈值快照 hash」类真断言 |

---

## 6. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（C1~C6） | 6 | 2 | 4 | 0 | 33.3% |
| 规范符合性（C7~C22） | 16 | 12 | 4 | 0 | 75.0% |
| 架构一致性（C23~C30） | 8 | 4 | 4 | 0 | 50.0% |
| 测试质量（C31~C35） | 5 | 2 | 3 | 0 | 40.0% |
| 文档与纪律（C36~C38） | 3 | 2 | 1 | 0 | 66.7% |
| **合计** | **38** | **22** | **16** | **0** | **57.9%** |

> 说明：警告项全部为「非阻塞改进/断言强度/披露保真」类，**无一项表现为门禁虚绿或红线被破**（红线独立核验见 §7）。

## 6.1 虚绿门禁扫描结果（原文）

```text
$ grep -rn 'catch\s*{\s*}\|catch\s*(\w*)\s*{\s*}' src/ui/sidepanel test/ui/density.mjs test/ui/l0.mjs \
      test/ui/_v3-helpers.mjs test/density-thresholds.test.ts test/l0-disclosure.test.ts test/supersession-ledger.test.ts
（0 命中）

$ grep -rn 'assert.ok(true\|assert(true\|assert.equal(true, true' test/*.ts test/ui/*.mjs
（0 命中）

$ grep -rn '|| true' test/ui/density.mjs test/ui/l0.mjs test/ui/_v3-helpers.mjs test/density-thresholds.test.ts \
      test/l0-disclosure.test.ts test/supersession-ledger.test.ts src/ui/sidepanel/*.ts src/ui/sidepanel/l0/*.ts
test/ui/density.mjs:247:      authorized: !document.getElementById('l0-pick')?.disabled || true,
test/l0-disclosure.test.ts:237:  for (const id of COLLAPSIBLE_TARGETS) assert.ok(hooks.disclosure.targets instanceof Array || true);

$ grep -rn 't\.skip\|\.skip(\|if (![a-zA-Z]* ) return\|if (.*) return;' test/density-thresholds.test.ts test/l0-disclosure.test.ts \
      test/supersession-ledger.test.ts test/ui/density.mjs test/ui/l0.mjs
test/density-thresholds.test.ts:329:  if (!existsSync(BASELINE_JSON)) return;   ← 基线缺失即静默跳过 AC-V3-007 校验
test/supersession-ledger.test.ts:278:  if (FILES_OVERRIDE) return;              ← 合理（override 模式下的分支）

$ grep -c 'console.log' test/ui/density.mjs test/ui/l0.mjs   → 25 / 10（均为汇总表与指纹输出，不代替断言）
$ 提前 process.exit(0)：仅 _v3-helpers.mjs#finish() 在**全部断言之后**调用（:74-84），无提前退出
$ npm-test.log：`ℹ skipped 0` / `todo 0`（无被跳过的用例）
```

## 6.2 零改动核验原文

```text
$ sha256sum src/security/policy.ts src/security/auto-authorize.ts
bfcb2edeceae19a27384aef6608e9f2ae9c3a0f6c1e5d3618f277164bb3c89a8  …/policy.ts        ← = spec pin
1096d065dac63d56e36285bf499eee041acdc3e323d4c7215df3981af7d0ef4b  …/auto-authorize.ts ← = spec pin

$ sha256sum src/content/{content-script,dom-agent,page-bridge}.ts
a72900313ab77c018961aa2b8e02bb1b630a9960c1b622f2a85addf543f99e82  content-script.ts  ← = CONTENT_SOURCE_SHA256 pin
7df782b349b32839d0ec25fa515ee293441f85f75242083dae37e5ccfd601e0f  dom-agent.ts
5737c40a2014e7adf2bf4091a31a347af6600ecfea80f8882d52e9407191f4ac  page-bridge.ts

$ sha256sum dist/content.js   → 52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6
$ ls -l dist/content.js dist/sidepanel.js → 177,076 B / 294,874 B（sidepanel ceiling 306,099）

$ git diff --numstat c2c0e0d -- <每个红线文件>   （全部为空 = 零 diff）
  manifest.json / src/ui/options/index.html / src/content/*.ts / src/security/{policy,auto-authorize}.ts
  / test/ui/hardening.mjs / test/sidepanel-view.test.ts
$ git rev-parse main → 2ddc92299ad10cfe0ea2b65403243a45ce7fb041（未动，= 事实基线）

$ 台账 protectedRanges 独立复算（Python，非门禁代码）
  journey.mjs  sha256 6b45c3fa4027f75a97bb84e0f5d80446a8c316ca4cd6dd83b2fe939c0eb6ba63  match=True  startByte=42062 True  lines=185
  binding.mjs  sha256 be9ad0e983670137d4233349aede1cae0f0b6fdf26a050083761d30d52c6b936  match=True  startByte=105871 True lines=184

$ 反证日志复原核对
  RP-V3-05：l0.mjs sha256 = e9e401319d9cd414981177c119d5c3ae3e0e258eb5c51fa2a2602071ed5327c1（我复算一致）
  RP-V3-06：dist/content.js 复原 sha256 = 52a82620…（我复算一致），字节 177,076
```

---

## 7. 未能验证的项（如实列出，未用推断填坑）

1. **未运行任何 Chromium 类门禁**（`test:density` / `test:l0` / `test:ui` / `test:insight` / `test:binding` / `test:hardening` / `test:e2e`）：本报告中的运行期结论**全部引用** `/tmp/opencode/v3-gate-logs/*.log`（21 份，时间戳 02:42~03:27）与 `build.md`，未自行复跑。
2. 因此 **I1（无卡态重复渲染使 `#l0-more` 变可见）为静态代码推演结论**（`decision-card.ts:128-133/141/172` + `view-model.ts:607` 的取值分析），**未做运行时复现**；`l0.mjs:240-241` 的通过只是「只读一次」的时序巧合（此判断亦基于代码阅读，未实跑证伪）。
3. **未复算设计稿阶段 A 的同源结果**（E/D 两份 HTML 的 `window.__density()` 与公布值落差），仅引用 `density.log:7-15` 与 baseline json 的 `sameSourceProof`。
4. **未逐格复核 baseline json 的 `chars` 值**（只复核了 `clickables/lines/blocks/regions` 与 `density.log` 阶段 B/C 的一致性）。
5. **未与 v2 先例逐条对照**（`specs-tree-web-cli-plugin-v2-insight/plan.md` 的 S1~S18 取代条目）：只做了 **schema 级**对照（r2 台账字段 = `version/feature/range/metric/literalRemovedZero/counts/hardFloorPins/entries/protectedFileOldLines/note`，**无** `modifiedRanges/protectedRanges/zeroDiffFiles/gateFloors`；v3 台账为**超集**扩展，entries 字段满足 AC-V3-011 的 `oldId/oldTitle/newId/newTitle/gate/reason`）。
6. **未验证 `npm run test:supersession` 在未先跑 `npm test`（无 `dist-test/`）时的可运行性**：按 `package.json` 该脚本直接跑 `dist-test/test/supersession-ledger.test.js`，只读判断为「依赖 `npm test` 先构建」，未实测。
7. **未审计 `sidepanel.js` 的增量构成**（哪些 KB 来自 L0 骨架 / 折叠器 / 视图模型）：`build.mjs` 未开 minify 且无 bundle 分析，只有总量 294,874。
8. **未核验 `firstRun` 档「≤9/≤20」是否会被后续叶挤超**（超出本叶范围；本叶实测 7/12，余量登记为只允许收紧）。

---

## 8. 结论

**结论**: ⚠️ **有条件通过**（0 阻塞，16 改进项，其中 8 项为中severity）

| 指标 | 结果 |
|------|------|
| 审查通过率 | 22 / 38 = **57.9%**（警告 16，失败 0） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **4** 项（C9 FR-V3-012 逐字证明力、C12 FR-V3-015 ≤4/各带计数、C16 FR-V3-020 遍历范围、C21 FR-V3-026 断言强度）+ 2 项「spec 数字级」需裁决（AC-V3-016 体积、几何下界数值） |
| 可进入 validate | **是**（0 阻塞；红线零改动；反证与门禁无虚绿） |

**理由**：
1. **门禁与反证经得起打假**：阈值/口径零改动且逐字断言；6 条反证全部 FAIL→还原→PASS 实跑（RP-01/05/06 独立性强；RP-02b/03/04 读取侧为副本或旁路，已降级为改进项）；台账 `protectedRanges` 的 sha256/byte 偏移经**独立复算**全等；既有断言零删除有真实 diff + 独立断言双证；四门禁计数零降。
2. **风险位（D3 铁律）拿到结构性保证**：唯一写入者 + 白名单抛错 + 祖先闭包静态断言 + 5×2 运行期断言 + 反证，五重成立。
3. **但存在 16 项非阻塞缺陷**，其中 8 项中severity 集中在四处：① 一处**状态机缺陷 + 门禁盲区**（无卡态 `#l0-more` 复现，I1）；② **AC 条文的证明力不足**（FR-V3-012 逐字只在非产品常量上、AC-V3-010 遍历被白名单缩窄，I2/I5）；③ **台账字段保真与计数口径**（`oldTitle` 失真、hunk 检查对纯新增文件空转、646/725 跨口径，I4）；④ **披露保真与基线比对缺失**（体积后值 291,523 vs 产物 294,874、几何 498 vs 495、ADR-V3-018 决策 2 未实现，I6/I7/I8）。这些不影响「本叶验收锚点达标」的事实判定，但会削弱「机器可核验」的强度，故按「有条件通过」处理：**建议先处理 I1/I2/I4/I5/I6/I7/I8，再进入 `@sddu-validate`**。

## 9. 状态文件关联提醒（§8.2）

本叶 `state.json` 当前 `phase = "builded"`，`files` 中存在 `spec/state/tree/plan/tasks/tasksJson/parentSpec/discovery`，**缺 `build` / `review` / `reviewReport`** 三个关联字段；`phaseHistory` 为 `registered → specified → planned → tasked → builded`。建议由状态机补记：

- `phase: "reviewed"`（本 Agent 无 `sddu_update_state` 工具，未能代为执行）
- `files.build` → `.sddu/…/specs-tree-v3-1-l0-shell-density/build.md`
- `files.review` → `.sddu/…/specs-tree-v3-1-l0-shell-density/review.md`
- `files.reviewReport` → `.sddu/…/specs-tree-v3-1-l0-shell-density/review-report.md`

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：C1~C38 逐项结论；P1~P6 六面判定（含几何锚点迁移「合法但实质放松」、台账「两处失效字段 + 一处空转」）；虚绿扫描原文；零改动核验原文；0 阻塞 / 16 改进；未验证项如实登记 | 2026-09-16 | SDDU Review Agent |
