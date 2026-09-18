# 验证报告：specs-tree-v4-1-zone-shell-density

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V8 验证场景 + 五维度指引；**独立复算 + 对抗优先**）
> **前置依赖**: `validate.md`、本叶 `spec.md` v1.0、`build.md`（R1~R3 + review 修复轮）、`review-report.md` R1（⚠️ 有条件通过 / **0 阻塞** / 13 改进项，passed）、父 `../spec.md` §12、`docs/v4-density-baseline.{json,md}`、`docs/v4-supersession-ledger.json`
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-19
> **验证轮次**: R1（首轮）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-19
> **更新说明**: 初始创建（R1 全量执行：19 门禁独立串行复跑 + 10 条自写对抗探针 + 3 条真门禁静态注入（红→还原→绿）+ pin/体积/清单独立复算 + I1~I13 抽验；发现 0 阻塞、8 项观察项）

---

## 0. 关键结论摘要（先读这一段）

| # | 被验证方声称 | 我的独立复现 | 结论 |
|---|------|------|:--:|
| 1 | 19 项门禁严格串行全绿（build.md §B.6） | 19 项独立串行复跑：**18 项退出码 0**；`test:page-input` 首轮 98/4 → **隔离复跑 2 次均 102/0 全绿**（并发残留 Chromium 的 flake，非产品缺陷） | ✅（含 1 项 flake，已如实登记 N-07） |
| 2 | 密度新口径「豁免 `#stream` + 单卡 ≤6 + 首屏 ≤2」（FR-CHAT-070~073） | 自写探针 10 条逐条「注入→红→还原→绿」；**但**「6 个常驻入口塞入流内卡」**无门禁变红**（7 个才红）—— 见 N-03 | ⚠️ 见 N-03 |
| 3 | journey 保护段显式取代（新 pin / 门槛 45→65 / 法四） | Python 独立切片复算：新 pin `43054..55259 / 194 行 / e2b500df…`、old `42766..54004 / 185 行 / 6b45c3fa…` **逐字一致**；段内 `check(` 22==22、全文件 170==170；注入 0.60 比例布局 ⇒ `#15b` 真红（46.4%）；注入常驻可见输入框 ⇒ `#15c` 真红 | ✅ |
| 4 | 体积真值 385,319 B + 逐模块归因 + cap 未预填 | 直读 `dist/` 与真实 metafile：**385,319 B**；11 行 `v41RoundRows` 的 `afterBytes` **逐条命中** metafile；Σ+glue = 10,075+142 = **10,217** = 385,319−375,102；ceiling = floor(×1.05) = **404,584**；`resolved:false` 且未预填 | ✅ |
| 5 | review 修复轮 I1~I13 全处置 | 逐条抽验：台账/基线订正可核、5 处新增可 FAIL 断言实跑（含 `injected = "toolbar: 工具栏可点 6 > 5 …"`、`violations(during)=["l0-aria-reverse-probe"]`）、`theme.test.ts` 含 3 条 EC-CHAT-014 降级用例、chars 容差 8→3（注入差 4 必红） | ✅（3 处登记保真残差见 N-04/05/06） |
| 6 | 红线零改动（content.js / pick-layer.js / 判定链 / manifest） | `git diff 187c205..HEAD` 对不动面**全空**；`content.js` 177,076 B sha `52a82620…`、`pick-layer.js` 33,900 B sha `5f567d7e…` **逐字节不变** | ✅ |
| 7 | 对抗问题「换口径 = 放松？」 | **未发现门禁放宽**：阈值 `7/15 · 9/20 · 17/35` 逐字不变；default 恰 7 → 恰 5 是收紧；chars 容差 8→3 是收紧；豁免子树的滥用被 guard/基线拦住（P1/P1b/A2-1 实测）。**残余面**：流内卡 ≤6 的预算（×2 首屏卡 = 12 常驻入口）是**口径自身的边界**，已登记 `knownLimitations` | ⚠️ 见 N-03 |
| 8 | 本次独立发现的新问题 | **0 阻塞 / 8 项观察项**（1 项中severity = 流内卡 6 入口不被拦；7 项低：断言强度、guard 属性依赖、台账计数残差、round rows 自洽、build.md 数字、sidepanel sha 随构建戳、page-input flake） | ⚠️ |

**结论：✅ 通过（0 阻塞，8 项非阻塞观察项）** —— 全部 15 个 FR 有机器证据且通过；19 项门禁绿（1 项 flake 经隔离复跑与历史 9 次全绿证伪为环境因素）；红线零改动；对抗探针未发现任何「换口径 = 放松」；8 项观察项均属登记保真 / 断言强度 / 已知口径边界，不改变验收锚点是否达标的事实判定。

---

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证场景总数 | **8**（V1~V8）+ **13 条对抗探针**（P1~P10 + A2-1~A2-4 中的注入/还原对） |
| 通过 | **8 / 8**（其中 V1 含 1 项 flake，隔离复跑通过） |
| 失败（非阻塞偏差） | **0** |
| 无法执行 | **0**（人工面 0 项；本叶无 headless 不可合成的验收面） |
| 阻塞问题 | **0** |
| 新发现观察项 | **8**（中 1 / 低 7） |

---

## 2. 逐项验证结果（V1~V8）

| # | 验证对象 | 验证步骤摘要 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | 19 项门禁 + 7 条 RP-V4 反证 | 自写 `run-gates.sh` 严格串行（一次一个 Chromium，日志全量落盘） | 全绿、计数与报账一致 | **18/19 exit=0**；`page-input` 首轮 98/4 → 隔离复跑 **102/0 ×2**；RP-V4-01~07 **exit=0 ×7**；计数见 §3.3 | ✅ |
| **V2** | 密度防滥用与豁免口径 | 自写 Chromium 探针 P1~P10 逐条注入/还原；A2-1~A2-4 用**真门禁**做静态注入 | 每条必红→还原必绿 | 13 条全按预期；**唯一例外 P6 的 6 入口形态不红**（见 N-03） | ✅（含 1 项残余面） |
| **V3** | journey 取代完整性 | `verify-pins.py`（Python 切片+sha256）+ 真 journey 静态注入 ×2 | pin 一致 / 计数零降 / 注入必红 | pin 逐字一致；`check(` 22/22、170/170；`#15b` 注入 46.4% 红；`#15c` 注入可见 input 红；还原后 167 PASS | ✅ |
| **V4** | 体积真值 + 归因 + cap | `verify-size.py`（直读 dist + metafile + 源常量） | 逐项与登记一致 | 385,319 B；11/11 行命中；Σ+glue=10,217；ceiling 404,584；cap `resolved:false` 未预填；inputs 57 | ✅ |
| **V5** | review 修复落地 I1~I13 | 逐条抽验 + 源文件实跑（`supersession` 24/24、`theme.test.ts` 19/19）+ 探针 P9 | 修法可核、反证可红、断言只增 | 13/13 处置可核；5 处新增 FAIL 段实测可红；3 处登记保真残差（N-04/05/06） | ✅ |
| **V6** | 三区行为（含 320/400/520） | 探针 P8/P10 + 真门禁日志 | ≤5 可点、零溢出、展开态 ≥0.65、宿主 ==4、双主题可读 | 三视口可点 **5/5/5**、overflowX **0/0/0**；chip 展开态占比 **0.715/0.745/0.793 ≥ 0.65**；宿主 **4**；明暗双主题 + 三通道 PASS | ✅ |
| **V7** | 规范符合性（9 条 AC） | 逐条 AC 找机器证据 | 全部满足 | 9/9 满足（AC-CHAT-005 为「骨架层满足 + 无专断言」的间接覆盖，见 §3.5） | ✅ |
| **V8** | 红线与守恒终核 | `git diff --stat 187c205..HEAD` 全量 + sha256 + 阈值字面量 + 门禁集合 + 计数 | 零 diff / 逐字 / 未缩 / 只增 | 不动面**零 diff**；阈值逐字；`CHROMIUM_GATES.length==9` 与 `EXPECTED_AUDITED_FILES` 未动；计数只增（见 §3.3） | ✅ |

### 2.1 对抗探针结果表（本轮核心交付）

**A 组 · 自写 Chromium 探针（`probe-driver.mjs`，共用门禁的 `density-metrics.mjs` 纯函数口径）**

| 探针 | 注入 | 期望 | 实测（注入态） | 还原态 | 判定 |
|:--:|------|------|------|------|:--:|
| P1 | `#theme-toggle`（带 `data-chrome-control`）移入 `#stream` | guard 红 + 密度 C1 降 | `throw: …#stream 子树内含 1 个 [data-chrome-control]（theme-toggle）…`；**密度 C1 5→4** | guard `pass`，C1 回 **5** | ✅ 红 |
| P1b | **抹掉标记**后把 `#l2-entry-audit` 移入 `#stream` | guard 不红（属性依赖）→ 交给基线 | guard `pass`；密度 C1 **5→4** | C1 回 5，工具栏可点 5 | ⚠️ guard 未拦（N-02）；由 A2-1 证明基线兜底 |
| P2 | 单卡注入第 7 个可点 | 单卡预算红 | `["v4val-card-7: 卡内可点 7 > 6"]` | `budgetOk=true` | ✅ 红 |
| P3 | 工具栏按钮依次 `display:none`/`visibility:hidden`/`opacity:0`/`pointer-events:none` | 密度 C1 **不降** | 5/5/5/5 | 清除后 5；`hidden=true` ⇒ **4** | ✅ 红（按口径不降=正确） |
| P4 | 空态首屏注入到第 3 张卡 | 首屏预算红 | `["首屏可见卡 3 > 2"]` | `firstScreenOk=true` | ✅ 红 |
| P5 | 第 2 张欢迎卡 / 欢迎文本 300 字（9 行） | 双半红 | a) `["欢迎卡 3 > 1"]`；b) `["welcome: 文本行 9 > 8"]` | 卡数回 1 | ✅ 红 |
| **P6** | **法五滥用形态**：常驻入口塞入流内卡（6 个 / 7 个） | 应收紧拦截 | **6 个：guard 不抛、单卡预算 PASS、首屏预算 PASS、密度 C1 不变（5）⇒ 全绿**；7 个：`["…卡内可点 7 > 6"]` | C1 回 5 | ⚠️ **6 入口形态不被拦**（N-03） |
| P7 | 工具栏注入第 6 个可点 → 驱动真实 `render()` | 产品拦截点抛错 | `toolbar: 工具栏可点 6 > 5 —— 新增入口必须显式置换并在 v4 台账 toolbarAdmissions[] 登记（禁静默第 6 个可点）` | `NO-THROW`，可点回 5 | ✅ 红 |
| P8 | 三视口读数 | 可点恰 5 + 零溢出 | `320/400/520 → toolbar=5, overflowX=0, C1=5, regions=4` | — | ✅ |
| P9 | chars 跨视口差注入 +4 | 容差 3 必被击穿 | spread **4 > 3** ⇒ `check(spread<=3)` 必红 | 容差与基线 `charsSpreadMax` 同源（3） | ✅ 红 |
| P10 | 风险 chip 详情展开态流区占比（3 格） | ≥0.65 | `320/400/520 = 0.715 / 0.745 / 0.793`（chips 可见、detail 可见、visibleChips ≥1） | — | ✅（spike 最差 0.7273 独立复现） |

**A2 组 · 真门禁静态注入（改 `dist/sidepanel.html`，产物级注入）**

| 编号 | 注入 | 期望 | 实测 | 还原 | 判定 |
|:--:|------|------|------|------|:--:|
| **A2-1** | 抹掉 `#l2-entry-audit` 的 `data-chrome-control` 并移入 `#stream` | density 必红 | `test:density` **167 passed / 4 failed**（`default@320/400/520 可点实测 4 ≠ 5`；阶段 F：`clickables 4≠5`、`blocks 13≠15`、`chars 176≠181`） | sha256 复原 `22771907…` → **171/0 全绿** | ✅ 红→绿 |
| **A2-2** | `#region-statusbar{min-height:40vh}`（比例 ~0.46） | journey `#15b` 必红 | `✖ #15b … — 46.4%`（exit=1） | sha256 复原 | ✅ 红→绿 |
| **A2-3** | 工具栏注入常驻可见 `<input>` | journey `#15c` 必红 | `✖ #15c … — {"visibleInputs":["v4val-visible-input"]}`（exit=1） | sha256 复原 | ✅ 红→绿 |
| **A2-4** | （A2-2/A2-3 还原后）journey 复跑 | 必绿 | `UI journey PASS — 167 assertions`（exit=0） | — | ✅ 绿 |

---

## 3. 验证详细信息

### 3.1 测试覆盖（FR / NFR）

> 覆盖方式 = 门禁/单测断言 + 本轮实测证据。全部 15 个 FR 均有可 FAIL 的机器证据且通过。

| FR | spec 描述（切片） | 机器证据 | 执行结果 | 覆盖率 |
|----|------|------|:--:|:--:|
| FR-CHAT-004 | 风险永不折叠新机器判据（状态栏无 hidden + chips 可见 + 视图打开仍可见） | `l0` ④ J1~J4 + EC-CHAT-010 | ✅ | 已覆盖 |
| FR-CHAT-010 | 三区结构/顺序/语义 | `density-thresholds.test.ts` 三区静态 + `l0` ① | ✅ | 已覆盖 |
| FR-CHAT-011 | 工具栏准入 ≤5 + 4 徽标 + 只读摘要 | `l0` ②/⑨ + 探针 P7/P8 + 单测 | ✅ | 已覆盖 |
| FR-CHAT-012 | 法一（工具栏/状态栏无一次性交互） | 静态半（`descendants(zone)` 零 `data-msg-type∈{askuser,auth,nextstep}`） | ✅ | 已覆盖 |
| FR-CHAT-013 | 状态栏常驻（一行 + chips 收缩） | `l0` ④ J1/J2 | ✅ | 已覆盖 |
| FR-CHAT-014 | 法四（默认屏无可见常驻输入框） | `l0` ③/⑪ + journey `#15c`（A2-3 注入实测可红） | ✅ | 已覆盖 |
| FR-CHAT-015 | L2 视图替换（打开/返回） | `test:l2` 73/0 + `l1` ① | ✅ | 已覆盖 |
| FR-CHAT-016 | 法则六（管理操作入设置/审计视图） | `#authorize/#revoke` 静态归属 `#settings-view` + `l1` ① 四件可见 | ✅ | 已覆盖 |
| FR-CHAT-017 | 风险 chip 形态（三通道 + 点击展开） | `l0` ④/⑤/⑥ | ✅ | 已覆盖 |
| FR-CHAT-070 | 新测量根 + 豁免单源 | `density` 171/0 + 阶段 F 28 格 + 单源字面量仅一处 | ✅ | 已覆盖 |
| FR-CHAT-071 | 豁免只认 hidden | 探针 P3（CSS 隐身 5/5/5/5 不降；`hidden` ⇒ 4） | ✅ | 已覆盖 |
| FR-CHAT-072 | 单卡可点 ≤6 | 探针 P2/P6 + RP-V4-01 | ✅ | 已覆盖 |
| FR-CHAT-073 | 首屏卡 ≤2（欢迎 ≤1 且 ≤8 行） | 探针 P4/P5 + RP-V4-02/03 | ✅ | 已覆盖 |
| FR-CHAT-074 | 阈值 7/15·9/20·17/35 保留 + 登记格重算 | `density`（阈值字面量逐字 + 31 登记格 = 28 机对 + 3 名义） | ✅ | 已覆盖 |
| FR-CHAT-075 | 可 FAIL 反证（含滥用反证） | RP-V4-01~07 全绿 + A2-1 真门禁注入 + P1 | ✅ | 已覆盖 |

| NFR | spec 描述 | 机器证据 | 执行结果 | 覆盖率 |
|-----|------|------|:--:|:--:|
| NFR-CHAT-002 | 320–560px 零水平溢出；320 常驻集合 = 400 | `l0` ⑩ + 探针 P8（overflowX 0/0/0） | ✅ | 已覆盖 |
| NFR-CHAT-004 | 无障碍（aria 成对/收起 hidden/focus-visible/不靠颜色） | `l0` ⑥/⑧/⑧b（含反向悬空 expander 反证）+ ⑬ | ✅ | 已覆盖 |
| NFR-CHAT-008 | 明暗双主题 + 跟随系统三态 + 已有 storage | `theme.test.ts` **19/19**（含 3 条 EC-CHAT-014）+ `l0` ⑬ | ✅ | 已覆盖 |
| NFR-CHAT-009 | 门禁严格串行 + 日志完整 + 反证实跑 | V1 自写串行链（19 项 + 7 反证，日志全量落盘）+ A2 注入实跑 | ✅ | 已覆盖 |
| NFR-CHAT-010 | 口径同源可交叉复算 + 设计稿/产物数字分列 | 探针与门禁共用 `density-metrics.mjs`；`design-contract` 6/6（shim 实跑 60/60，只判设计稿） | ✅ | 已覆盖 |

**FR 覆盖率 = 15/15 = 100%；NFR 覆盖率 = 5/5 = 100%。**

**EC 覆盖**：EC-CHAT-004（`l0` ⑩）✅ · EC-CHAT-007（`density` 阶段 C 尾部 + `test:zero-injection` 27/0）✅ · EC-CHAT-010（`l0` ④ J4）✅ · EC-CHAT-013（19 门禁绿 + TASK-501 前置闸门）✅ · EC-CHAT-014（`theme.test.ts` 3 条降级用例，I5 修复后由 0 → 3 条）✅

### 3.2 接口与数据（产物级数据契约；本叶无服务端 API / DB）

| 检查项 | spec/登记要求 | 实测 | 一致？ |
|--------|----------|---------|:--:|
| `dist/sidepanel.js` 字节 | 385,319 | **385,319** | ✅ |
| `dist/content.js` 字节 + sha | 177,076 / `52a82620…`（无容差） | **177,076** / `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | ✅ |
| `dist/pick-layer.js` 字节 + sha | 33,900 / `5f567d7e…`（无容差） | **33,900** / `5f567d7ededc58183afe4ce45e3293b68204dfbe788dc6b9fb09bdc6e0d13e59` | ✅ |
| 真实 metafile 输出字节 | == 登记基线 | `outputs['dist/sidepanel.js'].bytes = 385319` | ✅ |
| 11 行 `v41RoundRows.afterBytes` | 逐行 == metafile `bytesInOutput` | **11/11 命中**（toolbar 3111 / theme 2937 / density-scope 1783 / statusbar 976 / sidepanel 62393 / view-model 19654 / risk-rail 7698 / shell 4158 / view-host 3207 / disclosure 5188 / status-bar 67） | ✅ |
| Σ(round Δ) + glue | == `closeoutDeltaBytes` = 385,319−375,102 = 10,217 | **10,075 + 142 = 10,217** | ✅ |
| ceiling 公式 | `floor(385,319 × 1.05)` = 404,584 | **404,584** | ✅ |
| `PENDING_ABSOLUTE_CAP` | `resolved:false` 且不预填 | `resolved:false`，`newBaselineBytes/absoluteCeilingBytes/resolvedOn = null` | ✅ |
| 输入模块数 | `duplicationCheckInputModuleCount` == metafile inputs | **57 == 57**（注：metafile 顶层 `inputs` = 381 是全部产物口径；sidepanel 输出的 `inputs` = 57） | ✅ |
| journey 保护段 pin | `43054..55259 / 194 / e2b500df…` | 完全一致（Python 独立复算） | ✅ |
| binding 保护段 sha | `be9ad0e9…` 逐字节不变 | 187c205 ↔ HEAD **字节相同** | ✅ |
| 密度登记格 | 28 机对 + 3 名义 = 31 | 阶段 F 断言 `machineComparedCells===28`；基线 `nominalCells=3` | ✅ |
| 阈值 | `7/15 · 9/20 · 17/35` 逐字 | `density-metrics.mjs:348-350` 逐字一致 | ✅ |
| 台账 counts | 见 §3.3 | `l0` 项有残差（N-04） | ⚠️ |

### 3.3 构建与门禁账（V1 独立串行复跑，日志 `/tmp/opencode/v4-validate-v4-1/gates/`）

| # | 门禁 | 退出码 | 我的实测计数 | build.md 报账 | 差异 |
|:--:|------|:--:|:--:|:--:|------|
| 1 | `typecheck` | 0 | 0 error | 0 | — |
| 2 | `build` | 0 | sidepanel 385,319 B | 385,319 | — |
| 3 | `npm test` | 0 | **875 / 875 / 0 fail / 0 skipped** | 849（R3）/ 875（修复轮台账） | +26（修复轮新增，与台账一致） |
| 4 | `test:supersession` | 0 | **24 / 24** | 20（R3）| +4（I1/I2 反证） |
| 5 | `test:gate-integrity` | 0 | **12 / 12** | 12 | — |
| 6 | `test:zero-injection` | 0 | **27 / 0** | 27 | — |
| 7 | `test:page-input` | **1 → 0（复跑）** | **98/4 → 102/0（复跑 2 次）** | 102/0 | flake（N-07） |
| 8 | `test:l0` | 0 | **210 / 0** | 203（R3）；台账 counts 仍 203 | +7（I4/I7/I12 新增）；台账未同步（N-04） |
| 9 | `test:l1` | 0 | **108 / 0** | 108 | — |
| 10 | `test:l2` | 0 | **73 / 0** | 73 | — |
| 11 | `test:density` | 0 | **171 / 0** | 169（R3） | +2（I6/I10） |
| 12 | `test:ui`（journey） | 0 | **167 assertions** | 167 | — |
| 13 | `test:insight` | 0 | **116 / 0** | 116 | — |
| 14 | `test:binding` | 0 | **192 / 0** | 192（R3 首轮 1 → 复跑 0） | 本次首轮即绿 |
| 15 | `test:hardening` | 0 | **24 / 0** | 24 | — |
| 16 | `test:e2e` | 0 | PASS | PASS | — |
| 17 | `test:design-contract` | 0 | **6 / 6**（shim 实跑 **60/60**） | 6 / 60 | — |
| 18 | `test:l1-reverse` | 0 | **9 / 9** 条反证 | 9 | — |
| 19 | `test:l2-reverse` | 0 | **10 / 10** 条反证 | 10 | — |
| + | RP-V4-01~07（`density.mjs --reverse`） | 0 ×7 | 7/7 全绿 | 7 | — |

**守恒账终核**：journey 全文件静态 `check(` = **170**（v3 也是 170，零删减）；保护段内 22 == 22；`npm test` **skipped 0**（体积归因 metafile 断言确实执行）；`test/` 新增文件 `theme.test.ts`（19 条）+ `design-contract.test.ts`（6 条）。

### 3.4 性能与边界

| NFR / EC | 要求 | 实测 | 达标？ |
|-----|------|------|:--:|
| NFR-CHAT-002 窄屏零溢出 | 320/400/520 文档级 `scrollWidth−clientWidth == 0` | **0 / 0 / 0**（探针 P8） | ✅ |
| 流区高度占比（默认态） | ≥0.65 | l0 ⑪ PASS（我的门禁日志） | ✅ |
| 流区高度占比（**chip 详情展开态**） | ≥0.65 | **0.715 / 0.745 / 0.793**（P10，最差 0.715 > spike 最差 0.7273 同量级） | ✅ |
| chars 跨视口差 | ≤3（收緊后） | 门禁夹具 = 3；注入 +4 ⇒ spread **4** > 3 ⇒ 断言必红（P9） | ✅ |
| 单卡可点预算 | ≤6 | 6 合规 / 7 红（P2、P6） | ✅（边界见 N-03） |
| 首屏卡预算 | ≤2（欢迎 ≤1、≤8 行） | 3 张红 / 2 欢迎红 / 9 行红（P4/P5） | ✅ |
| 体积 | ≤ ceiling 404,584 | 385,319 | ✅ |
| 320px 常驻元素集合 = 400px | 集合相等 | `l0` ⑩ PASS | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 红线零改动 | `git diff 187c205..HEAD -- manifest.json src/content src/security src/background src/ui/options test/ui/{hardening,page-input}.mjs test/zero-injection.mjs design docs/v3-*` | ✅ **全空** |
| 孤立代码（有代码无需求） | 本叶新增/改动文件逐一溯源（`git diff --name-only` × `build.md §2` × FR/ADR） | ✅ 无（新增 5 模块 toolbar/theme/density-scope/statusbar/design-contract 均引到 FR-CHAT-010/011/016/070~075 + ADR-V4-017~023） |
| 需求缺失（有需求无代码） | 15 FR × 15 AC × 5 EC 逐条找机器证据 | ✅ 无（§3.1；AC-CHAT-005 为间接覆盖，见下） |
| 规格漂移（spec 被改） | `git log -- spec.md`（仅立项提交 `a7af431`，之后零修改）+ spec/plan/tasks 在 build 期内无改动 | ✅ 无 |
| 门禁集合漂移 | `CHROMIUM_GATES.length==9`、`EXPECTED_AUDITED_FILES` 未动、`REVERSE_PROOF_EXCEPTIONS` 只增（4→5） | ✅ 无 |
| 密度阈值漂移 | 字面量 `7/15 · 9/20 · 17/35` 逐字 | ✅ 无 |
| 台账计数漂移 | `counts.l0` 仍 203 而实测 210 | ⚠️ 1 项（N-04） |

---

## 4. 验证脚本执行记录（ADR-003）

> 脚本由 validate Agent 自主编写并直接执行，存放于 `/tmp/opencode/v4-validate-v4-1/`（不污染项目源码目录；所有落盘扰动已 sha256 复原）。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `run-gates.sh` + `run-gates2.sh` | 19 项门禁 + RP-V4-01~07 严格串行复跑（一次一个 Chromium，日志全量落盘 `gates/*.log`） | V1 | 0（除 page-input 首轮 1） | `gates/SUMMARY.txt`；875 / 24 / 12 / 210 / 108 / 73 / 171 / 167 / 116 / 192 / 24 / 6 / 9 / 10 |
| `probe-driver.mjs` | 自写 Chromium 对抗探针 P1~P10（共用 `density-metrics.mjs` 单源口径 + 产品 `assertChromeNotInStream`），注入→读→还原三步 | V2 / V6 | 0 | `probe-report.json`（10 探针结构化读数） |
| `verify-pins.py` | journey/binding 保护段 pin 独立复算（byte/sha256/行数）+ `check(` 守恒 | V3 | 0 | `V3-PINS OK`；`e2b500df…`/`6b45c3fa…`/`be9ad0e9…` 三 sha 全 MATCH |
| `verify-size.py` | 产物字节 + metafile 逐模块归因 + ceiling + cap + inputs 复算 | V4 | 0 | `V4-SIZE OK`；11 行全命中；Σ+glue=10,217；ceiling 404,584 |
| A2 注入脚本（内联 Python，日志留档） | 真门禁静态注入：A2-1（未标记控件移入流内）/ A2-2（比例 0.46）/ A2-3（可见 input），每条注入→跑真门禁→还原→sha256 复核→复跑 | V2 / V3 | 注入 1 / 还原 0 | `A2-1-density-injected.log`（167/4）、`A2-2-journey-15b-injected.log`（46.4% ✖）、`A2-3-journey-15c-injected.log`（✖）、`A2-1-density-restored.log` + `A2-4-journey-restored.log`（171/0、167 PASS） |
| `page-input-rerun{,2}.log` | `test:page-input` 隔离复跑 ×2 | V1 | 0 ×2 | `102 passed / 0 failed` ×2 |
| `sidepanel.html.bak` | `dist/sidepanel.html` 注入前备份（sha256 `22771907…`，逐字节复原复核） | V2 / V3 | — | 注入前 = 还原后 sha 完全一致 |

---

## 5. Findings（F / N）

**真缺陷（F）**：**0 项**（未发现「换口径 = 放松」、门禁虚绿、红线被破或需求缺失）。

**观察项（N）**：

| # | 级别 | 位置 | 性质与证据 | 对应 Vx | 建议 |
|---|:--:|------|------|:--:|------|
| **N-01** | 低 | `test/ui/density.mjs` RP-V4-06 | 「C1 不得下降」半段用**未排除 `#stream`** 的 `c1Probe` 测量 —— 把元素在页面内移动不可能改变该计数，故该半段**恒真、不可证伪**（实测 14→14）。真正的拦截来自 guard throw（P1 实测）+ 阶段 F（A2-1 实测）。 | V2 | 该半段改用密度口径（5→4）或删除，避免「看起来覆盖、实际恒真」 |
| **N-02** | 低 | `src/ui/sidepanel/density-scope.ts#assertChromeNotInStream` + `density-thresholds.test.ts` 静态半 | guard 与静态半都只认 `[data-chrome-control]`；**抹掉标记**后移入 `#stream` ⇒ guard 不抛错（P1b 实测 `pass`，密度 C1 仍 5→4）。兜底是阶段 F 基线逐格比对（A2-1 真门禁实测 4 处红：`clickables 4≠5` / `blocks 13≠15` / `chars 176≠181`）。 | V2 | 报告已把它记成「有兜底」；建议补一条基于形态（`data-toolbar-slot` / `.view-btn`）或位置（三区外壳）的反向判定 |
| **N-03** | 中 | 密度豁免口径边界（FR-CHAT-070 vs 072/073） | **法五滥用形态实测**：一张流内 `[data-msg-type]` 卡装 **6 个**常驻入口时 **guard 不抛、单卡预算 PASS、首屏预算 PASS、密度 C1 不变** ⇒ **无门禁变红**；7 个才红。理论上首屏 2 卡 × 6 = **12 个常驻入口**可落在豁免子树内（v3 全局面板上限为 7）。缓解：`knownLimitations[0]` 已登记「过渡卡口径，v4-2 落 7 主类卡后必须重审」；「把工具栏控件移入流内**降密度**」这一滥用形态被 guard / 基线拦住（P1/P1b/A2-1 实测）。 | V2 / V7 | **v4-2 必须重审**：为「流内常驻导航入口」引入可判定标记 + 首屏可点总量上限，或明确「卡内可点即内容交互、非导航常驻」的判定 |
| **N-04** | 低 | `docs/v4-supersession-ledger.json#counts.l0` | `currentRuntime` 仍 **203**（R3 值）而 review 修复轮实测 **210**（我复跑一致 210）。floor 164 不受影响；同类 I 项未收口。 | V1 / V8 | 同步为 210 并补注（可顺带加「counts 必须 == 门禁实测」断言） |
| **N-05** | 低 | `test/size-baseline.ts#closeoutRoundRows`（4 行）与 `#r3RoundRows`（sidepanel 行） | 5 处 `deltaBytes ≠ afterBytes − beforeBytes`（如 sidepanel R3 行 `59416→62393` 却记 `deltaBytes: 17548`——那是累计口径的值）。本轮新增的 `v41RoundRows` 有 I9 自洽断言，**这两组历史 round rows 无任何断言覆盖**。 | V4 | 把 I9 的「Δ 自洽 + Σ == closeoutDelta」断言扩展到全部 round rows |
| **N-06** | 低 | `build.md §C.1 I5 / §C.4` | 记 `theme.test.ts`「18 条」，实测 `^test(` = **19 条**（实跑 19/19）。纯登记保真。 | V5 | 订正为 19 |
| **N-07** | 低（环境） | `test:page-input` | 首轮 98/4（F5 + R3 重锚 3 条）→ **隔离复跑 2 次 102/0**，历史 9 次亦全绿。时间线与「validate 自身 chunk 切换残留 Chromium」重合 ⇒ 判为环境/并发 flake。 | V1 | 与 build.md 已登记的 `test:binding` 抖动同类处理：为该用例加隔离夹具 |
| **N-08** | 低 | `dist/sidepanel.js` 的 sha256 | `BUILD_STAMP`（`new Date().toISOString()`）注入每个 sidepanel bundle ⇒ **同一源码两次构建 sha 不同、字节同**（R3: `d92935f2…` → 本次重构建 `6fbd16c2…`，均 385,319 B）。build/review 文本引用的 sha 不可作跨构建 pin（`content.js`/`pick-layer.js` 无 stamp，sha 稳定）。 | V4 | 文本只登记字节数，或注明「sha 随构建戳变化」 |

**修复轮 I1~I13 抽验结果**：13/13 处置可核（详见 §0 第 5 行与下述证据）——
I1 `knownGap` = 「R3 已闭环（残余：无）」+ `knownGapHistory` 逐字保留 + `protectedSupersessionConflicts()` 与 2 条测试（含「判据必须能红」反证，`supersession` 24/24）；I2 `design-contract.test.ts` `status:"complete"` + 枚举/无 pending 断言 + 反证；I3 基线 `differencesFromV3` 订正为「测量根不变（皆 `document.body`）+ 新增豁免子树」与 488px；I4 `l0` ⑫b 驱动真实 `render()` 得 `injected = "toolbar: 工具栏可点 6 > 5 …（禁静默第 6 个可点）"`；I5 `theme.test.ts` 19 条含 3 条 EC-CHAT-014 降级用例；I6 根因实测（审计计数跨位数 2→6→10）+ 容差 8→3 + `redlineRemap[3]` 补登记 + P9 注入差 4 必红；I7 宿主断言 `== 4`（我的 `l0` 日志「占位宿主计数 == 登记值 4」）；I8 `duplicationCheckInputModuleCount = 57` == metafile 57；I9 `v41RoundRows` 11 行 + glue 142 + 2 条断言（我逐行命中 metafile）；I10 「31 = 28 实测 + 3 名义」双处注明 + `machineComparedCells==28`；I11 `V41-R3-E-*` = **47** 条、`V41-R3-MR-*` = **39** 条；I12 删除悬空 `aria-expanded` + `l0` ⑧b 反向判据（我的日志 `violations(during) = ["l0-aria-reverse-probe"]`）；I13 589px → 488px 五处订正（残余 589 仅在历史注释/冻结台账）。

---

## 6. 阻塞问题

| # | 位置 | 问题 | 对应 Vx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无（0 个阻塞）** | — | — |

---

## 7. 结论

**结论**: ✅ **通过**（0 阻塞；8 项非阻塞观察项）

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100%（15/15） | **15/15 有机器证据且通过** | ✅ |
| NFR 测试覆盖 | ≥80%（5 条） | **5/5 = 100%** | ✅ |
| EC 覆盖 | 逐条 | **5/5** | ✅ |
| 构建退出码 | 0 | `typecheck` 0 · `build` 0 | ✅ |
| 门禁绿 | 19/19 | **19/19**（`page-input` 首轮 flake → 隔离复跑 102/0 ×2） | ✅ |
| 反证实跑 | 红→还原→绿 | RP-V4-01~07 ×7 + 自写 13 条（含 A2 真门禁 3 条） | ✅ |
| 红线零改动 | 0 diff | **0 diff**（content/pick-layer 字节与 sha 均不变） | ✅ |
| 严重漂移 | 0 | **0**（1 项低severity 台账计数残差 N-04） | ✅ |
| 阻塞问题 | 0 | **0** | ✅ |

**理由**：
1. **全部验收锚点（AC-CHAT-004~009 / 022 / 023 / 025）经独立复现达标**：三区骨架、工具栏恰 5、状态栏风险 chips 永不折叠、法四、密度新口径与两条防滥用、双主题与窄屏零溢出、19 门禁串行、设计契约条款化。
2. **取代型变更经独立复算而非引用**：journey 新/旧 pin 与 binding 保护段由 Python 独立切片复算，三 sha 全 MATCH，`check(` 22/22 与 170/170 零降；`#15b`/`#15c` 的**新判据经注入实证可红**（46.4% 红、可见 input 红），门槛 45→65 是收紧。
3. **「换口径 = 放松」这一最大风险经对抗探针证伪**：阈值逐字不变；default 恰 7 → 恰 5、chars 容差 8→3 均为收紧；豁免子树的滥用形态（带标记/不带标记地把常驻控件移入流内）分别被 guard 与阶段 F 基线判红（A2-1 真门禁 4 处红）。
4. **残余面已如实登记**：N-03（流内卡 6 入口在 ≤6 预算内不被拦）是**口径自身的边界**而非隐藏缺陷 —— 它由 spec 的 FR-CHAT-072/073 明确定义、在 `knownLimitations` 登记为「v4-2 必须重审」，且本轮以实测复现方式交付给下游；N-01/02/04~08 为断言强度与登记保真类，不改变任何验收锚点的判定。
5. 因此判定为 **✅ 通过**（而非「有条件通过」）：0 阻塞、0 严重漂移、无未覆盖 FR、无放宽，且所有观察项均有可执行的收口建议。

---

## 8. 未能验证 / 未执行的项（如实列出，未用推断填坑）

1. **本轮未复跑 RP-V3-01~09 的既有 v3 反证**（仅 RP-V4-01~07）：其 in-gate 存在性由 `gate-integrity` 12/12 的 R4a/R4b 模式断言覆盖，运行期结论引用 build.md §B.5 与 `/tmp/opencode/v4-gate-logs/v4-1-r3/`。
2. **未复跑 `npm test` 内全部 875 条单测的逐条语义**：只核总数/跳过数（875/0/0）与本次相关的 `supersession` / `theme` / `size-growth-evidence` / `design-contract` 分项。
3. **未在第二台宿主/不同 Chromium 版本上复现**：`test:binding`（真实 `localhost:5173` + 真实 tabs）与 `test:page-input` 的宿主敏感性未做跨环境矩阵（N-07 给了同环境内的隔离复跑证据）。
4. **未对 `dist/sidepanel.js` 做除字节/归因之外的反混淆审计**：本轮口径为「登记不变量 = 字节 + metafile 归因 + 门禁」，未做源码级映射。
5. **未验证下游叶（v4-2/3/4）的义务**：`data-transitional-host` 清零、`PENDING_ABSOLUTE_CAP` 闭合、卡口径重审均属下游（本叶已在台账登记）。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 全量执行）：19 门禁独立串行复跑（18 绿 + `page-input` 首轮 flake 经隔离复跑 2×102/0 证伪）；10 条自写对抗探针 + 3 条真门禁静态注入（红→还原→绿，sha256 复原）；pin/体积/metafile/台账独立复算；I1~I13 逐条抽验；红线零 diff；结论 ✅ 通过（0 阻塞 / 8 观察项，其中 N-03 为需 v4-2 重审的口径边界） | 2026-09-19 | SDDU Validate Agent |
