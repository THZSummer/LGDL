# 验证报告：specs-tree-v45-1-single-write-chronology（V4.5-1 单写化 + 宿主时间序化）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V10 场景矩阵 + 五维度指引）
> **前置依赖**: 本叶 `spec.md` v1.0、`plan.md` v1.1（ADR-V45-001~012）、`build.md` v1.3（§8 = review R1 修复轮；本轮追加 §8.0 现场差异）、`review-report.md` v2.0（**R2 ⚠️ 有条件通过 / 0 阻塞 / 显式声明可进 validate**）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-21
> **验证轮次**: V1（R1）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-21
> **更新说明**: 初始创建（独立动态验证 R1：24 门禁独立复跑 + 字节级独立复算 + 纯函数/文件层注入反证 + 22 AC 逐条判定 + I-07/I-08 零字节订正）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 10（V1~V10；含 24 门禁 / 6 组对抗注入 / 22 AC / 字节复算） |
| 通过 | 10（V1~V10 全部通过；其中 V1 含 1 项首轮环境性 flake 经隔离复跑 2/2 绿） |
| 失败 | 0 |
| 无法执行 | 1（人工面三项 `⏳ 未执行`，见 §7；属人工验收面，非自动验证项） |
| 阻塞问题 | **0** |
| 门禁 | **24/24 绿**（计数逐项 ≥ 基线且 == 自报） |
| 独立注入探针 | 46 断言全绿（+ V5 文件层 1 byte 注入红/还原绿） |
| 结论 | **✅ 通过** |

**基线**：分支 `feature/web-cli-plugin` / HEAD **`9e85783`** / 工作树起点干净。**工作树终点**：仅 2 处「零字节订正」（`build.md §8.0` 现场差异 / `test/size-baseline.ts:1284` `l0 227→244`）+ 新增 `validate.md`；无产物 `src/**` 改动。

## 2. 逐项验证结果（V1~V10）

| # | 验证对象 | 验证步骤摘要 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | 24 项门禁 + 计数对账 | typecheck/build → npm test → 6 node 单跑 → 15 Chromium 串行 | 24/24 绿 + 计数 ≥ 基线 | 24/24 绿；1045/244/232/108/116/171/192/… 逐项 ≥ 基线且 == 自报（详见 §3.3） | ✅ |
| **V2** | 单写对抗 | ① 复活退役节点 ② 同 kind 第二行 ③ firstRun 双载体 ④ `title` 注入 ⑤ 五通道恰 1 | ①②③ 红；④ 抛错；⑤ 恰 1 | ① env/site/probe/notice/firstRun 第二载体面**全红**；② raw 行=2 必红（l0 反证 B）；③ firstRun 双载体**红**；④ `?token=`/密钥**抛错**、`<link>` 剥标记正例；⑤ 6 通道 carrierCount 全为 1 | ✅ |
| **V3** | 纯时间序对抗 | ① 注入 `li[data-host]` ② `#composer` 双护栏 ③ 产品自断言真跑 | ① 红 ② 契约成立 ③ 通过 | ① decision/composer/l1-panels/strips/改名宿主**全红**；退役容器复活全红；② `#composer` 父=body ∧ 非流后代 ∧ body 尾 ∧ hidden（journey `#15c`）+ 静态核查；③ `assertStreamPureCardOrder()` 真跑通过（`#15e-2`） | ✅ |
| **V4** | journey 链诚实性 | ① 三链节字节复算 ② legacy 严格 MISS/链式 HIT ③ `#15b` ④ `#15c` | 三链 sha 命中；MISS/HIT；65% 逐字 | ① `6b45c3fa`@187c205[42766,54004) / `e2b500df`@a04e677[43054,55259) / `cc79f413`@current[43054,58287) 逐字节命中；② 严格 MISS（active pin `supersededFrom=e2b500df`）/ 链式 HIT；③ `STREAM_HEIGHT_RATIO_MIN=0.65` 逐字；④ 契约在位 | ✅ |
| **V5** | binding 保段 | ① sha+startByte 双绿复算 ② 段内 1 byte 注入 | 双绿；注入必红 | ① `[107780,115930)` sha=`be9ad0e9…` 逐字节命中；② 注入 1 byte@108000 → `test:supersession` **29/6 红**（sha 1f527bbf ≠ be9ad0e9）→ 逐字节还原 → **35/0 绿** | ✅ |
| **V6** | density 非放宽 | ① 31 格同源 ② 唯一变更格方向 ③ 越阈注入 ④ 阈值零 diff | 31 格齐备；tighten-only；越阈红；阈值零 diff | ① `v45Ledger.cells` 31 格，`counts = {total:31, machineCompared:28, nominal:3, changed:1}`；② 唯一真变更格 `risk(staleRef)@400` 7/7/18/237 → 6/7/17/232（**逐项下降**）；③ `evaluateDensity` clickables+1 / lines+1 / 阈值-1 注入**全红**（另密度门禁内 RP-V3-01/02 实跑）；④ `thresholds` 与 `volume` 外零 diff（7/15·9/20·17/35 逐字） | ✅ |
| **V7** | act 布线 | ① help/rebind/authorize 真实驱动 ② `NEXTSTEP_ACTS` 6 项 ③ 帮助分区 6 行 | 唯一入口 + 零回合；6 项；6 行单源 | ① `local-act-wiring` 13/0（LA-5 rebind / LA-6 help 均 `landed`，唯一调用点+分支零 `requestTurn`）、`recommendation` 59/0（⑬ rebind chip / ① 本地 chip 零回合 / ⑭ help chip）；② `['next','repick','describe','authorize','rebind','help']` 逐字；③ `settings-help` 10/0、`L1_GESTURE_LABELS.length=6` | ✅ |
| **V8** | 体积三值 | ① 四值同源 ② 档位不下移 ③ `pending-author-line` ④ 越限红测 | 同源；不下移；保持；必红 | ① 498,521 / 523,447=floor(×1.05) / 512,000 / 563,200 逐值命中；② `ceilTo50KB(498521)=512000` 未下移；③ 账本 `authorConfirmation.status='pending-author-line'`；④ ×1.06 / 523,448 / 563,201 注入**全红**，恰在上限 523,447 绿 | ✅ |
| **V9** | 规范 + 红线 | ① 22 AC 逐条 ② 不动面 diff ③ 保护段 ④ 零注入 ⑤ spec 漂移 | 逐条有判据；红线零 diff；保护段逐字节；27/0；零漂移 | ① 22/22 有实测判据（见 §3.1）；② `src/content/**`/`manifest.json`/`design/**`/web-cli-base/opencode.json/ROADMAP/v3 台账**零命中**；③ 两段 sha 命中；④ zero-injection 27/0；⑤ 叶子 spec 仅 269a0c5 创建、零漂移 | ✅ |
| **V10** | 修复落地抽检 | BLOCK-01~04 / I-01~08 / O-04~O-08 | 逐项真实落地；I-07/08 本轮订正 | BLOCK 全闭环（§3.6）；I-01~06 落地抽检通过、I-07/08 本轮零字节订正并复跑绿；O-04 证实、O-05~O-08 如实登记 | ✅ |

## 3. 验证详细信息

### 3.1 测试覆盖（FR 44 / NFR 8 / AC 22）

**功能需求覆盖率 = 44/44 = 100%**（按 12 组承载面逐组实测）；**非功能需求覆盖率 = 8/8 = 100%**（NFR-V45-008 机器面绿 + 人工读屏面 `⏳`）。

| FR 组 | 承载门禁（实测） | 结果 |
|---------|----------|:--:|
| FR-V45-001~004 | `npm test` 1045/0 | ✅ |
| FR-V45-010 | `l0` 244/0 · `hardening` 24/0 · `journey` 171/0 | ✅ |
| FR-V45-011~015 | `l0` 244/0 · `stream` 63/0 · `system-merge` 17/0 | ✅ |
| FR-V45-020~026 | `l0` 244/0 · `journey` 171/0 · `l1` 116/0 · `l2` 74/0 | ✅ |
| FR-V45-030~033 | `recommendation` 59/0 · `local-act-wiring` 13/0 | ✅ |
| FR-V45-040~042 | `settings-help` 10/0 · `recommendation` 59/0 | ✅ |
| FR-V45-050~052 | `zero-injection` 27/0 + 解冻范围门禁（copy-only-lines） | ✅ |
| FR-V45-060~062 | `host-registry` 10/0 · `l0` 244/0 | ✅ |
| FR-V45-070~074 | `density` 232/0 · `density-thresholds`（npm test 内） | ✅ |
| FR-V45-080~084 | `supersession` 35/0 · `journey` 171/0 · `binding` 192/0 | ✅ |
| FR-V45-090~093 | `size-ruling-vol3` 12/0 · `size-budget`/`size-growth-evidence`（npm test 内） | ✅ |

| NFR | spec 要求 | 承载判据（实测） | 结果 |
|-----|----------|---------|:--:|
| NFR-V45-001 | 流区占比 ≥65.0%（只上调） | `journey #15b`（65% 门槛逐字） | ✅ |
| NFR-V45-002 | 320px 零溢出 / role=log / aria-live | `journey #15q`·`#15d` / `l0` ⑩ / `index.html`（role=log 8 处） | ✅ |
| NFR-V45-003 | `title` 同过净化 | `system-merge` `TITLE_PLAINTEXT_JUDGEMENTS`(3) + `zero-injection ≥27` | ✅ |
| NFR-V45-004 | 各单源恰一处声明 | 各单源门禁 + `gate-integrity` 13/0 | ✅ |
| NFR-V45-005 | ≤ floor(baseline×1.05)=523,447 | `size-budget` / `size-growth-evidence` | ✅ |
| NFR-V45-006 | 兼容读取面 ids | `journey`/`binding` 读取面断言 | ✅ |
| NFR-V45-007 | 判据可 FAIL + `expectFailPattern` | 各判据表反证（`gate-integrity` 元门禁 13/0） | ✅ |
| NFR-V45-008 | 长文案不退化为仅 `title` | 新增可读文本载体断言 + **人工读屏面 ⏳** | ✅（机器）/ ⏳（人工） |

**22 AC 逐条判定（AC-V45-001~022）**

| AC | 判据要点 | 实测证据 | 判定 |
|---|---|---|---|
| AC-V45-001 | 首屏三事实各恰 1 | `l0` BLOCK-03：env/site/probe/notice 各「载体面恰 1 + raw 节点恰 1」+ 判据 0 问题 + 3 段注入反证；`journey #594/#661` | ✅ |
| AC-V45-002 | `#stream` 全时间序卡 | `l0` ③ 零宿主 + `journey #15e-1/#15e-2` + 静态 `index.html` `data-host`=0 / 退役 id 全 0 | ✅ |
| AC-V45-003 | 5 条提示带真退役（非 hidden） | `l0` ③ · `hardening` 24/0 · `insight` 116/0 · `journey #15b-0`；静态 id 全 0 | ✅ |
| AC-V45-004 | 单通道 4 规则逐字不变 | `system-merge` 17/0（含 5000/20/`持续：`/净化 + 4 条 `title` 反证） | ✅ |
| AC-V45-005 | `#composer` body 尾 hidden + 通路不变 | `journey #15c`（父=body ∧ 非流后代 ∧ body 尾 ∧ hidden）+ `binding` 192/0 读取面 | ✅ |
| AC-V45-006 | 空态无 0 计数控件恒驻（FIX-5） | `density` 空态档 + `l0` 改写后触发器 | ✅ |
| AC-V45-007 | `ref` 卡卡内恢复区可达（N-05 关闭） | `ref-pick-wiring` 11/0 · `ask-auth` 61/0 · `page-input` 108/0 | ✅ |
| AC-V45-008 | 选项池 + 后果预演 + 回执固化在卡内 | `ask-auth` 61/0 · `stream` 63/0 · `l2` 74/0 | ✅ |
| AC-V45-009 | 归因块/证据区在 `#view-host`；计数入审计标题唯一 | `l1` 116/0 · `l2` 74/0 · `page-input` 108/0 | ✅ |
| AC-V45-010 | 手势 6 行 + 分区计数三方同源 | `settings-help` 10/0（SH-3 单源）· `l2-counts` 9/0 · `l0` ⑨ 计数同源 | ✅ |
| AC-V45-011 | risk-recovery site/probe 触发 + act 闭集 6 + 零回合 | `recommendation` 59/0（⑬ rebind）· `local-act-wiring` 13/0 | ✅ |
| AC-V45-012 | onboarding chip `act:'help'` 零回合 | `recommendation` ⑭（help chip + 零回合） | ✅ |
| AC-V45-013 | options 仅纯文案解冻 + 登记 + 零注入复跑 | `git diff` 单行文案 + 解冻范围门禁 + `zero-injection` 27/0 | ✅ |
| **AC-V45-014** | journey 第二次八步取代 + 计数 ≥167 + RP-V4-08 | `supersession` 35/0（3 链节）· `journey` 171/0 · §V4 字节复算 | ✅ |
| **AC-V45-015** | binding 保段或显式取代 + 段外逐行登记 + 计数不减 | §V5 sha+startByte 双绿 · 1 byte 注入红/还原绿 · `binding` 192/0 | ✅ |
| **AC-V45-016** | l0/l1/disclosure/density/system-merge 重写为新语义，数量不减 | l0 227→244 · l1 115→116 · density 229→232 · system-merge 17（只增） | ✅ |
| **AC-V45-017** | 测试总数只增 + 零断言删除/降级 | npm test 1044→1045；24 门禁逐项 ≥ 基线（§3.3） | ✅ |
| AC-V45-018 | 密度重算 + 逐格留痕 + 反证 | §V6（31 格 / tighten-only / 越阈红 / 阈值零 diff） | ✅ |
| AC-V45-019 | 体积五要素 + 三值同源 + 状态未伪称 | §V8（四值同源 + 越限红 + `pending-author-line`） | ✅ |
| AC-V45-020 | 红线逐字节 | content.js 177,076/`52a82620…` · pick-layer 33,900/`5f567d7e…` · `design-contract` 6/0 | ✅ |
| AC-V45-021 | 门禁严格串行 + KL-N-10 纪律 | 本轮手序串行（一次一个 Chromium）；首轮 journey flake 隔离复跑 2/2 绿（§5 N-01） | ✅ |
| AC-V45-022 | 人工面逐项标注、不冒充 PASS | build.md §6.6 + 本报告 §7：三项 `⏳ 未执行` | ✅ |

### 3.2 接口数据（内部合约 / DOM 形态；本 Feature 无外部 API）

| 检查项 | spec 要求 | 实测结果 | 一致？ |
|--------|---------|---------|:--:|
| `evaluateStripChannels` | 载体面 ≤1 ∧ 缺失即红 ∧ emitter 恰 1 | 6 通道第二载体面**全红**；缺失读数**红**；emitter=2 **红**；合法读数 0 问题 | ✅ |
| `evaluateHostRegistry` | 任意深度零宿主 + 退役项负向 + 5/6 类问题串 | `li[data-host]`×5 形态**全红**；退役容器复活×4 **全红**；`[data-transitional-host]`=1 **红**；双写理由字面**红** | ✅ |
| `plaintextTitle` | `?token=`/密钥抛错 + `<link>` 剥标记 | ① 抛错 ② 抛错（唯一写入点零半成品行，`system-merge`）③ 返回 `'正常文案'` | ✅ |
| `index.html` DOM 形态 | `data-host`=0 · 退役 id=null · `#composer` body 尾 hidden · `#send-reason` 保留 | `data-host`=0；8 个退役 id 全 0；`#composer@body尾 hidden`；`#send-reason` 在状态栏 | ✅ |
| 保护段 | journey/binding sha + 偏移 | 逐字节命中（§V4/V5） | ✅ |

### 3.3 构建脚本（24 门禁独立复跑对账）

| # | 门禁 | 下界 | 实测 | 退出码 | 结果 |
|:--:|---|--:|:--:|:--:|:--:|
| 1 | `typecheck` | PASS | rc=0 | 0 | ✅ |
| 2 | `build` | PASS | rc=0（产物 498,521 B） | 0 | ✅ |
| 3 | `npm test`（node） | ≥1001 | **1045**/0 | 0 | ✅ |
| 4 | `test:supersession` | ≥33 | **35**/0 | 0 | ✅ |
| 5 | `test:gate-integrity` | ≥12 | **13**/0 | 0 | ✅ |
| 6 | `test:zero-injection` | ≥27 | **27**/0 | 0 | ✅ |
| 7 | `test:design-contract` | ≥6 | **6**/0 | 0 | ✅ |
| 8 | `test:ref-pick-wiring` | ≥11 | **11**/0 | 0 | ✅ |
| 9 | `test:size-ruling-vol3` | ≥10 | **12**/0 | 0 | ✅ |
| 10 | `test:l0` | ≥223 | **244**/0 | 0 | ✅ |
| 11 | `test:l1` | ≥111 | **116**/0 | 0 | ✅ |
| 12 | `test:l2` | ≥74 | **74**/0 | 0 | ✅ |
| 13 | `test:density` | ≥175 | **232**/0 | 0 | ✅ |
| 14 | `test:ui`（journey） | ≥167 | **171**/0（首轮 170/1 flake；隔离复跑 2/2 绿） | 0 | ✅（N-01） |
| 15 | `test:insight` | ≥116 | **116**/0 | 0 | ✅ |
| 16 | `test:binding` | ≥192 | **192**/0 | 0 | ✅ |
| 17 | `test:hardening` | ≥24 | **24**/0 | 0 | ✅ |
| 18 | `test:stream` | ≥63 | **63**/0 | 0 | ✅ |
| 19 | `test:ask-auth` | ≥61 | **61**/0 | 0 | ✅ |
| 20 | `test:recommendation` | ≥56 | **59**/0 | 0 | ✅ |
| 21 | `test:page-input` | ≥106 | **108**/0 | 0 | ✅ |
| 22 | `test:l1-reverse` | ≥9 | **9**/0 | 0 | ✅ |
| 23 | `test:l2-reverse` | ≥10 | **10**/0 | 0 | ✅ |
| 24 | `test:e2e` | PASS | `R8 E2E PASS` | 0 | ✅ |

**计数对账**：**24/24 绿，逐项 == build/review 自报**。唯一差异：build.md §8.7 表格把 `test:l2-reverse` 写成 74（实为 **10**，与 `state.json#buildR3` 及 spec §8.3 下界 ≥10 一致）—— 见 §5 **N-02**（文档复制错误，非产物问题）。

### 3.4 性能与边界（独立注入红/绿）

| NFR/EC | spec 要求 | 注入方式 | 实测 | 达标？ |
|-----|----------|---------|-------|---|:--:|
| NFR-V45-001 | 流区占比 ≥65.0% | `journey #15b` live 实跑 | `pct ≥ 65` + `#15b-0` 前置机核 | ✅ |
| AC-V45-018 越阈 | +1 格必红 | `evaluateDensity` clickables+1 / lines+1 | **FAIL** | ✅ |
| AC-V45-018 阈值 | 阈值 -1 必红 | `evaluateDensity(...,{clickables:6})` | **FAIL** | ✅ |
| AC-V45-019 ×1.06 | 必红 | `evaluateSidepanelSize(floor(498521×1.06))` | **FAIL** | ✅ |
| AC-V45-019 上限+1 | 必红 | `evaluateSidepanelSize(523448)` | **FAIL** | ✅ |
| AC-V45-019 绝对上限+1 | 必红 | `evaluateSidepanelSize(563201)` | **FAIL** | ✅ |
| AC-V45-015 段内 1 byte | 必红 | 注入 `binding.mjs@108000` | `test:supersession` **29/6 红** → 还原 **35/0 绿** | ✅ |
| EC-V45-001 空态 | 0 计数控件零渲染 | `density` 空态档 + `l0` | ✅ | ✅ |

> **NFR 覆盖声明**：本 Feature 为 UI/门禁形态重构，性能面以「流区高度占比 + 体积上限 + 密度阈值」承载；`title` 读屏可访问性（NFR-V45-008）为唯一 headless 不可合成项 → 人工面 `⏳`（§7）。

### 3.5 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | `git diff --name-status 08e3932..HEAD`：非 SDDU 文件 **54**（5 新增 / 49 修改）逐项归因到 FR 组 | ✅ 无（`help.ts`/`decision-region.ts` + 3 node 门禁均为 FR 显式承载） |
| 需求缺失（有需求无代码） | 44 FR × 承载门禁矩阵（§3.1） | ✅ 无 |
| 规格漂移（spec 被修改） | 叶子 `spec.md`：`git log` 仅 269a0c5（创建）+ `git status` 干净 | ✅ 无（**零漂移**） |
| 红线漂移 | `src/content/**` / `manifest.json` / `design/**` / `packages/web-cli-base/**` / `.opencode/opencode.json` / `ROADMAP.md` / `docs/v3-supersession-ledger.json` | ✅ 零命中 |
| 冻结产物 | `content.js` 177,076 B/`52a82620…`；`pick-layer.js` 33,900 B/`5f567d7e…` | ✅ 逐字节一致 |
| 父 spec 变更 | 父 `spec.md` 在 `2c1fcf8` 修改（review I-04 回写：NFR-V45-001「记录 vs 断言」区分） | ⚠️ 已登记（I-04，非未受控漂移） |

### 3.6 修复落地抽检（V10）

| 项 | 抽检结论 |
|---|---|
| BLOCK-01 迁移容器口径 | ✅ `RETIRED_CONTAINER_IDS`=13 ∩ `MIGRATED_CONTAINER_IDS`=5=∅；`l0-receipt-summary` 在迁移清单；`RETIRED_HOST_IDS`=17；时点无关判据①（l0 ⑧）②（l1 ⑩ 116/0）双绿 |
| BLOCK-02 死写点迁移 | ✅ `pick-input.ts` `dropSurface()=#stream` 3 写点；`page-input` ⑤ 两条真断言（108/0） |
| BLOCK-03 live 载体读数 | ✅ `stripChannelReading→evaluateStripChannels` 全仓唯一实现；4 通道 live「恰 1」+ raw「恰 1」+ 3 段注入反证（l0 244/0） |
| BLOCK-04 `title` 反证 | ✅ `TITLE_PLAINTEXT_JUDGEMENTS` 3 条 + 4 反证；独立探针复现抛错/剥标记 |
| I-01~I-06 | ✅ `plan.md §5.1.1` / `D-W3-1` / `D-W3-2` / 父 spec I-04 注 / `l0` ⑧ 对账 / `host-registry` 判别规则注释 均在位 |
| **I-07** | ✅ **本轮订正**：`build.md` 新增 **§8.0 现场差异**（登记「上轮派发中断遗留半成品 → 复核接续 + 修正 3 缺陷」；`wt.diff` 18 文件 ⊂ 最终 diff） |
| **I-08** | ✅ **本轮订正**：`test/size-baseline.ts:1284` `test:l0` `227→234` 改为 **`227→244`**（与 §8.7/state.json 同源）；复跑 `size-ruling-vol3` 12/0 + `l0` 244/0 |
| O-04 TREE.md 多声明 | ✅ 证实（`2c1fcf8` 未触碰 `TREE.md`，§8.12 `git add` 清单多列）；非阻塞 |
| O-05 静态退役清单口径 | ⚠️ 仍存（`density-thresholds.test.ts` `V4_RETIRED_IDS` 含 `l0-receipt-summary`，无「静态退役≠迁移容器」注释）；非阻塞 |
| O-06 `data-drop-active` 无 CSS | ⚠️ 仍存（全仓无 CSS 消费者，落点高亮不可视）；非阻塞 |
| O-07 `measuredOn` 陈旧 | ⚠️ 仍存（`SIDEPANEL_GROWTH_BREAKDOWN.measuredOn='2026-09-20'`，`2026-09-21` 有新增轮次行）；非阻塞 |
| O-08 载体判据 ≤1 口径 | ✅ 已在 `host-registry.ts` 注释显式登记「0 = 事实不可见合法」；建议 ADR-V45-001 补注（非阻塞） |

## 4. 验证脚本执行记录

> ADR-003：validate Agent 自主编写并直接执行。本轮脚本与日志目录 = `/tmp/opencode/v45-validate/R1/`（brief 指定探针根；等价于 `/tmp/sddu-validate-<feature>-<ts>/` 约定）。

| 脚本 / 文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `probe-v45.mjs` | 独立对抗探针：`evaluateStripChannels`/`evaluateHostRegistry`/`plaintextTitle`/`evaluateDensity`/`evaluateSidepanelSize` 纯函数注入 | V2 / V3 / V6 / V8 | **0** | `46 passed / 0 failed`（注入全红、对照全绿） |
| `v-typecheck.log` · `v-build.log` | 类型检查 + 构建 | V1 | 0 / 0 | rc=0；`dist/sidepanel.js`=498,521 B |
| `v-npmtest.log` · `v-npmtest-after.log` | node 全套（修订前后各一次） | V1 | 0 / 0 | `1045 passed / 0 failed` |
| `v-node-{supersession,gate-integrity,zero-injection,design-contract,size-ruling-vol3,ref-pick-wiring}.log` | node 门禁单项 | V1 | 0 | 35 / 13 / 27 / 6 / 12 / 11 |
| `v-{l0,l1,l2,density,ui,insight,binding,hardening,stream,ask-auth,recommendation,page-input,l1-reverse,l2-reverse,e2e}.log` | Chromium 串行门禁 | V1 | 0 | 244 / 116 / 74 / 232 / 171 / 116 / 192 / 24 / 63 / 61 / 59 / 108 / 9 / 10 / PASS |
| `v-ui.log` · `v-ui-rerun{1,2}.log` | journey 首轮 flake 与隔离复跑 | V1 / AC-V45-021 | 1 / 0 / 0 | 首轮 `170/1`（`#54g`）→ 隔离复跑 `171/0` ×2 |
| `v-supersession-inject.log` · `v-supersession-restore.log` | binding 段内 1 byte 注入 / 还原 | V5 | 1 / 0 | `29/6 红`（sha 1f527bbf）→ 还原 `35/0 绿` |
| （内联 dd/sha256sum）| 保护段 + 冻结产物字节复算；三链节 `git show` 复算 | V4 / V5 / V9 | 0 | journey `cc79f413…` / binding `be9ad0e9…` / content `52a82620…` / pick-layer `5f567d7e…` 逐字节命中 |
| （内联 python/git）| 密度账本 31 格解析 / 阈值零 diff / 红线 diff | V6 / V9 | 0 | `changed:1`（tighten-only）；红线零命中 |

## 5. 阻塞问题与发现分级

**阻塞问题：无（0 项）。** 以下为**非阻塞**发现（N）与观察项（O）。

| 编号 | 级别 | 位置 | 问题 | 对应 Vx | 建议 |
|:--:|:--:|---|---|:--:|---|
| **N-01** | 非阻塞（环境性 flake） | `test/ui/journey.mjs #54g` | 首轮隔离复跑前 1 项红：bookmarks 权限拒绝路径的持久回执回显断言；**隔离复跑 2/2 全绿** ⇒ 环境性 flake（新标签，性质同 `KL-N-10`） | V1 | 登记入 flake 台账（隔离 ≥2 复跑、日志全量）；后续轮沿用纪律 |
| **N-02** | 非阻塞（文档） | `build.md §8.7` | `test:l2-reverse` 行记为 74/74（下界 ≥10），实测 **10**；与 `state.json#buildR3`（10）及 spec §8.3（≥10）矛盾 | V1 | 订正为 `10` |
| **N-03** | 非阻塞（文档口径） | `build.md §8.11` vs 账本 | journey 保护段记「239 行」，账本 `protectedRanges[0].lineCount`=**240**（该字节区间 `splitlines()`=240）；机核字段为 sha+偏移（已绿） | V4 | 统一行数口径（240） |
| **N-04** | 非阻塞（文档措辞） | `build.md §8.11` | 把 `test/sidepanel-view.test.ts` 列入「v3 零改动面 …`git status` 零输出」，但该文件在 W2（`adcfdaf`）被改（+24/−11，含退役双断言）；§6.5 红线 T1~T10 实际干净 | V9 | 明确该行为「修复轮内未触碰」或移出零改动面清单 |
| O-04 | 观察 | `build.md §8.12` | `git add` 清单多列 `TREE.md`（该提交未触碰）；多声明 | V10 | 已有 R2 登记，可保留 |
| O-05 | 观察 | `test/density-thresholds.test.ts` | 静态 `V4_RETIRED_IDS` 仍含 `l0-receipt-summary` 且无「静态退役 ≠ 迁移容器」注释 | V10 | 补注释（不产生假阳性） |
| O-06 | 观察 | `[data-drop-active]` | 全仓无 CSS 消费者 ⇒ 落点高亮不可视 | V10 | 补 CSS 或明确登记为「非可视状态」 |
| O-07 | 观察 | `size-baseline.ts` | `SIDEPANEL_GROWTH_BREAKDOWN.measuredOn` 仍 `2026-09-20`（已有 09-21 轮次行） | V10 | 随任一轮更新 |
| O-08 | 观察 | `host-registry.ts` | 载体判据「≤1 且缺失即红」已在源码注释登记；ADR-V45-001 未显式注记「0 = 事实不可见合法」 | V10 | 建议 ADR 补注 |

## 6. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 44/44（100%） | ✅ |
| NFR 测试覆盖 | ≥80% | 8/8（100%；含 1 项人工面 `⏳`） | ✅ |
| 构建退出码 | 0 | `typecheck` 0 / `build` 0 | ✅ |
| 24 门禁 | 全绿且计数 ≥ 基线 | 24/24 绿（1045/244/232/108/116/171/192…） | ✅ |
| 严重漂移 | 0 | 0（红线零命中；叶子 spec 零漂移） | ✅ |
| 阻塞问题 | 0 | 0 | ✅ |
| 受保护段 | 逐字节 | journey/binding 双绿 + 段内注入必红 | ✅ |
| 防造假探针 | 注入必红 | 46 断言全绿 + V5 文件注入红/还原绿 | ✅ |

**理由**：

1. **24 门禁独立复跑逐项与自报相等，计数全部 ≥ 基线且只增**（1045·244·232·108·116·171·192·27·13·12·35·11…）；`typecheck`/`build` rc=0，产物 498,521 B 与登记值同源。
2. **对抗注入全部如实红**：单写载体第二面 / 同 kind 第二行 / firstRun 双载体 / `title` 注入 / `li[data-host]` / 退役容器复活 / 密度越阈 / 体积越限 / binding 段内 1 byte —— 注入必红，还原必绿（可 FAIL 非空转）。
3. **字节级独立复算全部命中**：journey `cc79f413…`、binding `be9ad0e9…`、content.js `52a82620…`、pick-layer `5f567d7e…`；journey 3 链节可复算，v3 legacy pin 严格命中失败、链式命中（取代台账不可伪造）。
4. **规范符合性 0 偏差**：22 AC 逐条有实测判据；叶子 spec 零漂移；红线面（`src/content` / `manifest.json` / `design/**` / v3 台账 / ROOT）零 diff；options 解冻为纯文案单行。
5. **R2 两项非阻塞改进本轮已订正**（I-07 `build.md §8.0` 现场差异 / I-08 `test:l0 227→244`），复跑 `size-ruling-vol3` 12/0 + `l0` 244/0 绿。
6. **残留非阻塞项 4 项（N-01~N-04）+ 观察 5 项（O-04~O-08）**：均为文档/口径/环境 flake 面，**不阻塞收口**；其中 N-01（journey 首轮 flake）已隔离复跑 2/2 绿并按 `KL-N-10` 纪律如实登记、不冒充串行全绿。

## 7. 人工面承接（不得冒充 PASS）

| # | 项 | 状态 |
|:--:|---|:--:|
| 1 | `title` 承载长文案的读屏体验（`V45-P-014`：屏幕阅读器是否朗读 / 粒度） | **⏳ 未执行**（无读屏环境；需真机 + 读屏软件） |
| 2 | 三主题（light/dark/auto）+ 高 DPI（≥2×）下迁入块（`#l2-tree-attribution` / `#l2-audit-evidence` / 卡内 ref 恢复区）可读性（EC-V45-009） | **⏳ 未执行**（需真机目视） |
| 3 | 320px 窄侧栏下迁入块可读性（EC-V45-009） | **⏳ 未执行**（需真机目视） |

> 三项由 validate 显式承接登记为 `⏳ 未执行`，**未以任何自动判据冒充人工验收**（AC-V45-022）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（独立动态验证 R1：24 门禁独立复跑 24/24 + 字节级独立复算全命中 + 46 断言对抗探针 + binding 段内 1 byte 注入红/还原绿 + 22 AC 逐条判定 + I-07/I-08 零字节订正；结论 ✅ 通过；0 阻塞 / 4 非阻塞 N + 5 观察 O；人工面 3 项 `⏳` 承接） | 2026-09-21 | SDDU Validate Agent |
