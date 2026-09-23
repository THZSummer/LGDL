# 验证报告：specs-tree-v55-1-driver-layer（V5.5-1 驱动者层 + 法七扩展底座）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果，作为工作流终点
> **验证策略**: `validate.md`（V1~V9 场景矩阵；对照 spec §7 的 11 条 AC 锚点逐条映射）
> **前置依赖**: `validate.md`、`spec.md`、`plan.md`、`review-report.md`（R1+R2，**状态 passed**，0 阻塞）、`build.md`（R1+R2+R3）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-23
> **验证轮次**: V1（首轮）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建 —— 亲跑复刻（S0 双面独立复刻 + BLOCK-01 行为级验证 + 全门禁 + 真源注入抽验 + 红线终核）；结论 ✅ 通过

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | 9（V1~V9） |
| 通过 | 9（含 1 项「通过 + 环境 flake 登记」） |
| 失败 | 0 |
| 无法执行 | 0（人工面 1 项如实标 ⏳，不占总计） |
| 阻塞问题 | **0** |

> 裁判口径：`npm test` **1246/0**（起始亲跑 + 全部注入还原后各一次）；决定性 Chromium 面 `s0-self-driven` **24/0**、`dead-end` **49/0**、`law8` **33/0**、`ask-auth` **78/0**、`recommendation` **72/0**、`journey` **171 PASS**；`test:binding` 触发已登记环境性 flake（见 §5 N-R1-01），其保护段由 `test:supersession` 独立机核双绿。

## 2. 逐项验证结果（V1~V9）

| # | 验证对象 | 验证步骤 | 预期结果 | 实测结果 | 判定 |
|---|---------|---------|---------|---------|:--:|
| **V1** | S0 双面独立复刻 | self node 探针 + 反证 + 亲跑 Chromium `s0-self-driven` | 三总判据成立 ∧ 反证可红 ∧ 双面绿 | node **`silentWindows=0 ∧ silentOk=6 ∧ deadEnds=0 ∧ answerNotDropped=true`**；反证 `silentWindows=6` / `answerNotDropped=false`；node 门禁 **8/0**；Chromium **24/0**（A 3 check / B 3 check 独立计） | ✅ |
| **V2** | 法七扩展四类终态逐类有驱动者 + 可达 next | `law7x-ext` + `driver-terminals` + 真面板（S0 ⑥ / rec ⑫ / ask-auth ⑮ / V3 探针 bg·late） | 四类逐类五段全过 | `law7x-ext` **5/0**（L7X-1~4）、`driver-terminals` **8/0**（DTM-1~4）；real 面板 answered-ref（S0 ⑥ `source:'ref'`）· describe-submitted（rec ⑫「提交描述 ⇒ 真实结算」）· bg/late（V3） | ✅ |
| **V3** | 取消后台 ask ⇒ 不登记 answered（BLOCK-01 行为级） | 自写真面板探针（SW 投递 `ask-user-request` → A 点 `#ask-cancel`；B 填文本点 `#ask-submit`） | A 不登记 ∧ 非死端；B 登记（对照） | **A：`suspensions=[]`、`lastRecommend={trigger:'idle',rule:'risk-recovery'}`、流内 `[data-op]≥1`**；**B：`suspensions=[{source:'late',kind:'answered-late',instruction:'正对照作答'}]`** ⇒ 守卫区分「取消 vs 作答」，非恒真 | ✅ |
| **V4** | 驱动者四元组 + 时机源 | `driver-quadruple`/`driver-timings`/`op-wiring` + 静态计数 | 集合 ≡ provider；闭集恰 5；主流程 diff=0 | `driver-quadruple` **14/0**、`driver-timings` **11/0**、`op-wiring` **9/0**、`recommendation-sources` **21/0**；`requestTurn(` = **3**（1 def + 2 调用）、`maybeRecommend(` = **10**（1 def + 7 调用 + 2 注释）、`nextAfterSettle(` = **9**（1 def + 8 调用） | ✅ |
| **V5** | applyRefAction 驱动化 + submitDescribe 补齐 | `l1-ref-validity` + `ask-auth` ⑮ + `recommendation` ⑫ + 静态调用点 | 生产恰 1；sends 不足；describe 零副作用 + 驱动 | `l1-ref-validity` **20/0**（「生产恰 1 + seam 1」/「sends 递增不足以满足」/「裁决+驱动顺序」）；`ask-auth` ⑮ **78/0**；`recommendation` ⑫/⑯ **72/0**；`applyRefAction(` 三处 = seam `:1166` / def `:2217` / **生产 `:2684`** | ✅ |
| **V6** | 门禁全量亲跑 + 关键注入抽验 | `npm test` ×2 + 真源注入 2 组 + 还原复跑 | 1246/0 不减；注入必红；还原逐字节一致 | `npm test` **1246/0**（起始）、**1246/0**（还原后）；注入 1：真删 `'answered-bg'` ⇒ `no-dead-end` **45/4 红**（ND-8/ND-9）⇒ 还原 sha `4ddc3411…` 一致 ⇒ **49/0**；注入 2：真删取消守卫 ⇒ `law7x-ext` **4/1 红**（L7X-4「取消守卫缺失」）⇒ 还原 sha `51df03bb…` 一致 ⇒ **5/0** | ✅ |
| **V7** | 构建 + 类型 + 体积五要素 | `npm run typecheck` + `npm run build` + size 门禁 ×3 | 退出码全 0；四值一致 | typecheck **exit 0**、build **exit 0**（build stamp 2026-09-23T01:49:53Z）；`size-ruling-vol3` **12/0**、`size-budget` **16/0**、`size-growth-evidence` **17/0**；五要素 **557,883 / 585,777 / 563,200 / 619,520** | ✅ |
| **V8** | 红线 / 冻结面 / 保护段终核 | `stat`+`sha256sum`+`grep`+门禁 | 冻结面逐字节；KIND_SET 40；特权手势；law8/journey/binding | content.js **177,076 B** / sha `52a826205553b46a…b5f6`；pick-layer.js **34,358 B** / sha `77796bab…575e`；sidepanel **557,883 B**；`KIND_SET` **40**；`permissions.request` 句法上仅在 `platform/extension-env.ts` 手势助手内（SW 仅注释）；`law8` **33/0**；`journey` **171 PASS**；`binding` 保护段经 `supersession` **36/0** 双绿（sha `be9ad0e9…` + startByte 107780） | ✅ |
| **V9** | 漂移 / 台账 / 孤代码 | 台账检索 + `git diff` + `git log` | 台账齐备；零 diff；spec 未漂移 | `X-SELF` 命中 **49**；`xSelfLedger.rows` **恰 7**（4 superseded + 2 handed-over + 1 no-supersession）；`modifiedRanges` 4 条 `V551-MR-X-SELF-2/4/5/6`；冻结面/判定链/`manifest.json`/`v3-*-ledger`/`ROADMAP`/`design`/`stream-model.ts` 零 diff；leaf+parent `spec.md` 自 `b075c01` 后零改 | ✅ |

> **人工面（⏳ 不冒充 PASS）**：S0 主动接手**体感** / 打断感 / 引导文案可读性 = **未执行**（headless 不可合成，并列 v5 人工面 9 项）。

## 3. 验证详细信息

### 3.1 测试覆盖（node）

| 面 | 亲跑读数 | 面 | 亲跑读数 |
|---|---|---|---|
| `npm test`（全量，起始） | **1246 / 0** | `npm test`（全部还原后） | **1246 / 0** |
| `s0-self-driven-chain`（node 面） | **8 / 0** | `law7x-ext` | **5 / 0** |
| `driver-quadruple` | **14 / 0** | `driver-timings` | **11 / 0** |
| `driver-terminals` | **8 / 0** | `l1-ref-validity` | **20 / 0** |
| `op-wiring` | **9 / 0** | `blocked-terminals` | **11 / 0** |
| `next-registry` | **18 / 0** | `recommendation-sources` | **21 / 0** |
| `ask-bridge` | **6 / 0** | `gate-integrity` | **16 / 0** |
| `supersession-ledger` | **36 / 0** | `size-ruling-vol3` | **12 / 0** |
| `size-budget` | **16 / 0** | `size-growth-evidence` | **17 / 0** |
| `op-protocol`（KIND_SET 逐字） | **6 / 0** | `capability-wiring` | **9 / 0** |
| `capability-revoke` | **5 / 0** | `design-contract`（12 kind 契约） | **19 / 0** |
| `ref-pick-wiring` | **11 / 0** | | |

### 3.2 测试覆盖（Chromium / 真面板）

| 面 | 亲跑读数 | 备注 |
|---|---|---|
| `s0-self-driven` | **24 / 0** | A/B 两侧独立计数（A 3 check / B 3 check） |
| `no-dead-end` | **49 / 0** | 5 类阻塞逐条保留 + 4 类已表达意图终态新增（不减 39） |
| `law8` | **33 / 0** | 含悬置输入不落 digest + 迟到文案静态零明文 + `?q=` 注入反证 |
| `ask-auth` | **78 / 0** | 含 ⑮ `submitDescribe` 补齐驱动（两个 FAIL 段 + 还原 PASS） |
| `recommendation` | **72 / 0**（首跑 70/3 环境 flake → 同产物重跑 72/0） | 含 ⑯ `answered` 时机 + ⑫ 描述真实结算 |
| `journey`（保护段） | **171 PASS** | 全新 profile 真实 dist |
| `binding`（保护段） | **环境性 flake**（见 §5 N-R1-01） | 最好一次 **191/192**（仅 `#6l` 滚动时序 flake）；另一轮 `#8d/#8e` 确认卡等待 + CDP socket 关闭；保护段由 `supersession` 双绿兜底 |

### 3.3 接口与数据实测（驱动者层）

| 检查项 | spec 要求 | 实测结果 | 一致？ |
|--------|----------|---------|:--:|
| 驱动者集合 ≡ provider 集合 | 双向包含 | `driver-quadruple#DQ-1` 多/少一行反证各红 | ✅ |
| 四元组 `driverId/timing/evidence/ops` | 可机核 ∧ chips ⊆ 9 opId | `DQ-2` 悬空 chips 必红；`OBLIGATION_OP_IDS = 9` | ✅ |
| 时机闭集 | 恰 5 含 `'answered'`，旧 4 逐字 | `DRIVER_TIMINGS = ['pick','stale','idle','firstRun','answered']` | ✅ |
| 时机 ↔ 驱动者映射 | 答完恰 ≥1 | `driversForTiming('answered') = ['ref-action']` | ✅ |
| 终态词汇 | 恰 4 与 `STREAM_TERMINALS` 6 正交 | `terminalOfSource('ref'/'op'/'bg'/'describe')` ⇒ `answered-ref/op/bg/describe-submitted`；`'late'⇒null`、`'ghost'⇒undefined` | ✅ |
| 后台 ask 载荷（取消） | 取消 ⇒ 不记「已答」 | 真面板 A：`suspensions=[]` | ✅ |
| 后台 ask 载荷（作答） | 作答 ⇒ 驱动 | 真面板 B：`suspensions=[{source:'late',kind:'answered-late'}]` | ✅ |
| `requestTurn(` 调用点 | 恰 2（diff=0） | 1 def + 2 调用 | ✅ |
| `maybeRecommend(` / `nextAfterSettle(` | 定义恰 1 | 1 def + 7 / 1 def + 8 调用 | ✅ |
| `applyRefAction` 生产调用点 | 恰 1 | 生产 1（`:2684`）+ seam 1（`:1166`）+ def 1（`:2217`） | ✅ |
| `commandSends` 消费面 | 1 处只读投影、零驱动语义 | `l1-ref-validity` 负断言绿 | ✅ |

### 3.4 构建与脚本

| 命令 | 退出码 | 输出摘要 | 结果 |
|------|:--:|---------|:--:|
| `npm run typecheck` | **0** | `tsc --noEmit` 无错 | ✅ |
| `npm run build` | **0** | `build complete → dist/`（stamp 2026-09-23T01:49:53Z） | ✅ |
| `npm test`（含 tsc 编译） | **0** | `tests 1246 / pass 1246 / fail 0` | ✅ |
| 构建后冻结面 | — | content.js **177,076 B** sha 不变；pick-layer.js **34,358 B** sha 不变；sidepanel **557,883 B** | ✅ |

### 3.5 性能与边界

| NFR / EC | spec 要求 | 实测数据 | 达标？ |
|-----|----------|---------|:--:|
| NFR-SELF-001（首屏 / 滚动不退化） | journey 不退化 | `journey` **171 PASS** | ✅ |
| NFR-SELF-005（体积） | ≤ 577,089 → 生效上限 585,777 | sidepanel **557,883 B**（ceiling 585,777 / 档 563,200 / 绝对上限 619,520） | ✅ |
| NFR-SELF-009（识别侧零 LLM 调用） | 零 provider | S0C ⑦B「零 LLM 调用」绿 | ✅ |
| NFR-SELF-010（幂等：同因不重复驱动） | 不重复 | `l1-ref-validity` 幂等；`registerSuspension` 恰 1 条 | ✅ |
| EC-SELF-005（取消 / 空 / 迟到） | 取消不记「已答」 | V3 A：`[]`；`answeredCaliber` 取消/or 空 ⇒ `cancelled`，迟到 ⇒ `late` | ✅ |
| EC-SELF-008（后台 ask 迟到非死端） | 固化 + 可达 next，不裸 `errorResponse` | `ask-bridge` **6/0**；V3 A 取消后 `[data-op]≥1` | ✅ |
| EC-SELF-007（空描述零副作用） | 不入终态 | `ask-auth` ⑮「空描述零副作用」+ FAIL 段绿 | ✅ |

### 3.6 漂移检测

| 漂移类型 | 检测命令/方法 | 结果 |
|---------|-------------|------|
| 孤立代码（有代码无需求） | 新增 `drivers.ts`/`terminals.ts` ↔ FR-SELF-010~036 | **✅ 无**（逐条映射，见 validate.md §3） |
| 需求缺失（有需求无代码） | 40 条父 FR 切片 ↔ 门禁/源码 | **✅ 无**（review 43/43；V1~V9 逐条实测） |
| 规格漂移（spec 被修改） | `git log -- <spec.md>` + `git diff ace3033..HEAD` | **✅ 无**（leaf+parent spec.md 自 `b075c01` 后零改） |
| 冻结面漂移 | `git diff --name-only ace3033..HEAD` | **✅ 无**（`src/content/**`、`manifest.json`、`v3-*-ledger.json`、`ROADMAP.md`、`design/**`、`stream-model.ts`、`policy.ts`、`auto-authorize.ts`、`messaging.ts` 全 0） |
| 取代台账漂移 | `docs/v4-supersession-ledger.json` 检索 | **✅ 无**（X-SELF-1~7 齐备；X-SELF-1 = no-supersession 如实） |

## 4. 验证脚本执行记录

> ADR-003 落地：validate Agent 自主编写并直接执行的验证脚本。本次验证脚本存放于 `/tmp/sddu-validate-v55-1-driver-layer-20260923-085619/`；门禁日志全量落盘 `/tmp/opencode/v4-gate-logs/v55-1-validate/`。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `s0-node-probe.mjs` | 直连共享样本 `s0-chain.mjs` + 编译产物，独立复刻 S0 三总判据并跑 2 组反证 | V1 | **0** | `silentWindows=0 · silentOk=6 · deadEnds=0 · answerNotDropped=true`；反证 `silentWindows=6` / `answerNotDropped=false` |
| `bg-cancel-probe.mjs` | 真面板真链路：SW 投递后台 `ask-user-request`，A 取消 / B 作答对照读 `suspensions` | V3 | **0** | `A: []`；`B: [{source:'late',kind:'answered-late'}]`；4 passed / 0 failed |

> 说明：注入抽验（V6）为「真源注入 → 实跑 → `git checkout` 逐字节还原 → 复跑」两段证据，日志：`41-inject-nodeadend.log` / `43-inject-law7x.log` / `42-restore-nodeadend.log` / `44-restore-law7x.log`。

## 5. 阻塞问题与残留登记

**阻塞问题：0 项。**

| # | 类型 | 内容 | 严重度 |
|---|------|------|:--:|
| **N-R1-01** | 环境性 flake（登记，不阻塞） | `test:binding` 在本机多次亲跑无稳定 PASS：一次 `191/192`（仅 `#6l 滚动到底 residual=undefined` 时序 flake）、一次 `#8d/#8e` 确认卡等待 + `#6l`、一次阶段 1 `#confirm-allow` 等待后 CDP socket 关闭（passes 104~191）。`binding.mjs` **不在 v55-1 变更面**，且保护段 107780..115930 由 `test:supersession` **独立机核双绿**（sha `be9ad0e9…` + startByte 107780 + 保护段字节区间 hash 不变 + 3 反证实跑）⇒ 判为**环境性 flake**（与 build.md §16 / review-report N-R2-06 的既有登记同源 K L-N-10），非 v55-1 回归 | 低 |
| **N-R1-02** | 观察（登记） | `test:recommendation` 首跑 `70/3`（④ settled 空卡 + ⑭ 授权 chip 权限请求 OBSERVED 空）⇒ 同产物重跑 `72/0` ⇒ 环境性 flake（headless 探测相位 / 权限探针），非 v55-1 回归 | 低 |
| **N-R1-03** | 观察（继承） | `driver-timings` 的 DT-2/DT-3 读取的是**编译后常量**（`dist-test/src`），对「仅改 `src` 未重编译」的注入无感；本叶 DT-1 声明点与 DT-4 散落字面量扫描读真源，故时机源单源仍有源文本机核。建议后续叶在 DT-2/DT-3 增加源文本抽取（与 `law7x-ext#L7X-4` 同口径） | 低 |
| **N-R1-04** | 继承（N-R2-01~06） | `nextAfterSettle(` 调用点 8（无门禁钉死具体数值，语义正确）；sidepanel.js sha 跨重建不可复现（红线口径 = 字节数 557,883）；O-01~O-04 未处置；supersession `counts` 部分同源层依赖外部日志（本次 l0/density 因日志不在本机 skip，nodeTestRuntime/supersession 真核验）；S0 人工面 ⏳ | 低 |
| **⏳** | 人工面 | S0 主动接手体感 / 打断感 / 引导文案可读性 = **未执行**（headless 不可合成，**不冒充 PASS**） | — |

### 5.1 真源注入抽验明细（V6）

| 注入 | 真源操作 | 注入后实跑 | 还原 | 复跑 |
|---|---|---|---|---|
| 注入 1 | 真删 `next-registry/terminals.ts` 的 `'answered-bg',` | `no-dead-end` **45 passed / 4 failed**（ND-8 单源恰 4 红 · 四类来源齐备红 · ND-9 红） | `git checkout` ⇒ sha `4ddc3411500cb8afc280e0687905b4a1a17370c62f54fa6deb4188e5f0d21cde` **与注入前逐字节一致** | **49 / 0** |
| 注入 2 | 真删 `sidepanel.ts` 后台 ask 取消守卫块（4 行） | `law7x-ext` **4 passed / 1 failed**（L7X-4「取消守卫缺失（isCanceled ⇒ 不记『已答』，不得驱动 answered）」） | `git checkout` ⇒ sha `51df03bbe889ba57c91187a2e61b54c1e0d476604c517033ca41ba3b39a21d41` **与注入前逐字节一致** | **5 / 0** |
| 补充观察 | 改 `drivers.ts#DRIVER_TIMINGS`（删 `'answered'`） | `driver-timings` / `driver-quadruple` **未红**（读编译常量，PASS）⇒ 见 N-R1-03；已还原 | sha `bcdcdd0599e56ba818128b31e17e299f415746b21118697381ab4f93e199dbc5` 一致 | 11/0 · 14/0 |

## 6. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | 40/40（本叶承载父 FR 切片；review 映射 43/43） | ✅ |
| NFR 测试覆盖 | ≥ 80% | 7/7 | ✅ |
| 构建退出码 | 0 | typecheck 0 + build 0 + npm test 0 | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项 | 0（严重） | 0（冻结面 / 判定链 / 台账 / spec 全零漂移） | ✅ |

**理由**：本叶为**代码类 Feature**，五维度全覆盖，全部关键数字均**亲跑复刻**（不采信 build/review 既有读数）：
1. **S0 双面独立复刻成立** —— node 面自写探针得出 `silentWindows=0 ∧ silentOk=6 ∧ deadEnds=0 ∧ answerNotDropped=true`，且反证（清空驱动者+终态+候选 ⇒ 静默窗口 6；抽掉悬置 ⇒ 答案被丢弃）可红，判据非恒真；Chromium 面 **24/0**，分支 A/B **独立计数**、互不掩盖。
2. **BLOCK-01 行为级验证闭环** —— 真面板真链路下，「取消后台 ask」`suspensions=[]`（不记「已答」、不驱动 `'answered'`、仍必有可达 next），与「作答后台 ask」`suspensions=[{source:'late',kind:'answered-late'}]` 形成对照 ⇒ 守卫是**载荷性**的，不是橡皮图章。
3. **`'answered'` 时机 / 驱动者四元组 / 终态词汇 / describe 补齐** 逐项机核 + 真面板可判；主流程 diff = 0（`requestTurn(` 恰 2、`maybeRecommend(` 定义 1、`nextAfterSettle(` 定义 1）保持。
4. **门禁全量亲跑 1246/0（两次）+ 2 组真源注入抽验**（终态词真删 ⇒ `no-dead-end` 必红；取消守卫真删 ⇒ `L7X-4` 必红）⇒ 判据真读真源、可 FAIL；还原后 sha 逐字节一致。
5. **红线终核全绿** —— 三冻结面 / `KIND_SET` 40 / 特权手势 / 法八 33 / journey 171 / 体积五要素 **557,883 / 585,777 / 563,200 / 619,520** / 取代台账 X-SELF-1~7 齐备（X-SELF-1 = **未发生取代**如实登记）；本叶门禁等价重锚逐项只增。

两项环境性 flake（`test:binding` 保护段 harness 时序 / `test:recommendation` headless 探测相位）与一项观察（DT-2/DT-3 读编译常量）已如实登记（N-R1-01~04，均低 severity、不阻塞）；保护段 binding 由 `test:supersession` 独立机核双绿兜底。**0 阻塞 / 0 严重漂移 ⇒ 通过，Feature 可关闭。**

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（V1~V9 全绿；S0 双面独立复刻 + BLOCK-01 行为级探针 + 2 组真源注入抽验 + 红线终核；npm test 1246/0 ×2；结论 ✅ 通过；N-R1-01~04 登记） | 2026-09-23 | SDDU Validate Agent |
