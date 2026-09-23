# 审查报告：specs-tree-v55f-2-batch-consent

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（C1~C36 审查清单及四维度指引）
> **前置依赖**: `review.md`、本叶 `spec.md` v1.0（承载父 FR ≈21 条切片 / 11 NFR 面 / 10 EC 面 / 12 AC 锚点）、本叶 `plan.md` v1.0、父 `ADR-SGO-004/005`（另读 006/007/008）、本叶 `build.md` v2.0（R1+R2 全叶收口，16/16）、叶1 `specs-tree-v55f-1-ref-context-and-anchor`（**validated**）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-24
> **审查轮次**: **R1**（全叶 16/16 任务完成后的首轮审查）
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-24
> **更新说明**: 初始创建（36 Cx 逐项；**0 BLOCK / 4 I / 5 O**；红线⑥亲注入承重 + 法八批量面 + WIDEN 唯一写入面 + S0′ 双面 + npm/Chromium 亲跑；结论 ✅ 通过）

---

## 0. 审查范围与执行

| 项 | 值 |
|---|---|
| Feature | `specs-tree-v55f-2-batch-consent`（V5.5F-2 任务级批量授权：写入计划 + 计划指纹 + 一次用户手势 + 计划外逐条回落 + 零明文 + 可中止 + 特权不入批 + WIDEN 二择；父 `specs-tree-web-cli-plugin-v55-f-scope-governance`；**末叶**） |
| 分支 / HEAD | `feature/web-cli-plugin` / `8ebd533`（R1 `0492e89`（W1+W2）+ R1 build 记录 `37e4e28` + R2 `8ebd533`（W3），**16/16 completed**，`state.phase = builded`） |
| 被审成品 | `dist/sidepanel.js` = **591,946 B**（A 列，实测 `stat -c %s`，与 `SIDEPANEL_BASELINE_BYTES` 同源）· `dist/background.js` = **1,635,675 B**（B 列，不计账）· `dist/content.js` **177,076 B** / sha `52a82620…` · `dist/pick-layer.js` **34,358 B** / sha `77796bab…`（逐字节冻结） |
| 亲跑 node 门禁 | `npm test` **1394 pass / 0 fail**（基线 1394 复核）· `supersession` **42/0** · `batch-consent` **7/0** · `law9-scope-reading` **14/0** · `op-three-tier` **11/0** · `capability-wiring` **11/0** · `s0-self-driven-chain` **27/0**（含 S0P-B1~B3） · `op-wiring` **14/0** · `ref-context-in-turn` **9/0** · `gate-integrity` **22/0** · `host-registry` **11/0** |
| 亲跑 Chromium 门禁（串行） | `s0-self-driven` **70/0**（含 S0C-11 / S0P-C4 / S0P-C6）· `law8` **52/0**（⑧⑨ 段逐条 + 反证）· `no-dead-end` **53/0**（含 ND-10 WIDEN 拒绝零死端） |
| 亲跑构建 / 体积 | `dist/sidepanel.js` **591,946** == 登记基线；`content.js` 177,076（sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6`）；`pick-layer.js` 34,358（sha `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e`） |
| **亲注入复核（`.sddu` 外零残留）** | 见 §0.1；5 处注入全部「FAIL ⇒ `git checkout` 逐字节还原 ⇒ sha256 前后相同 ⇒ 复绿」，`git status` 终态干净 |
| 冻结面 / 不动面实测 | `git diff 0492e89^..HEAD -- packages/web-cli-base packages/web-cli-plugin/manifest.json packages/web-cli-plugin/src/content packages/web-cli-plugin/src/security/policy.ts packages/web-cli-plugin/src/security/auto-authorize.ts packages/web-cli-plugin/src/shared/op-table.ts` = **零行**；`KIND_SET` **40 逐字**；`requestTurn(` **恰 2**；`CARD_TYPES` **12** 且 `REGISTERED_STRUCTURAL_HOSTS === []`；`MAX_OPEN_ASKS = 2` |
| 审查方式 | 静态分析为主 + 编排任务书点名的「亲注入 / 亲跑」复核；所有注入**逐字节还原**（`git checkout` + sha256 复核） |

> **审查判定**：**0 BLOCK**；4 个 I（1 处代码整洁回归 + 1 处回落分支健壮性 + 1 处死常量/双声明 + 1 处 `build.md` R2 终值登记精度两小点，均**不触红线 / 不改判据**）；5 个 O（估算口径 / 列表式判据 / 未上屏文案 / 桥侧无端到端用例 / 单位口径）。结论 = ✅ **通过**，可进入 validate。

### 0.1 亲注入承重复核（R-SGO-001 优先）

| # | 注入点（on-disk） | 期望 FAIL | 实测 | 还原 |
|:--:|---|---|---|:--:|
| ① | `src/ui/sidepanel/next-registry/ai-drive.ts` 注入审批写入点（`batchConsent.markApproved(`） | `RL-06 扩批量变体`「AI 代答了计划审批」 | ✅ **1 红**（`supersession` 41/1，命中 `ai-drive.ts:markApproved(` + `:batchConsent`） | sha `28e7e49a…` 前后**相同** ⇒ 42/0 |
| ② | `src/background/batch-plan.ts` 注入 `op.authorize` 标识 | `特权 op 不入批` | ✅ **1 红**（`capability-wiring` 10/1） | sha `dd4fefdf…` 前后**相同** ⇒ 11/0 |
| ③ | `planEntryKey` 对文本对做 `trim()`（归一化） | `BC-2`「归一化后判相等即红」 | ✅ **1 红**（`batch-consent` 6/1） | sha `dd4fefdf…` 前后**相同** ⇒ 7/0 |
| ④ | `admitEntry` 计划外分支改 `admitted` | `BC-3`「计划外被放行即红」 | ✅ **1 红**（实测 `期望 fallback 实测 admitted`） | sha `dd4fefdf…` 前后**相同** ⇒ 7/0 |
| ⑤ | `sidepanel.ts` 去掉「整页」真实点击守卫（`if (isWidenWholePage(choice))` → `if (true)`） | `L9-9`「扩围授权必须被真实点击值守卫」 | ✅ **2 红**（`law9` 12/2） | sha `cf33cb7b…` 前后**相同** ⇒ 14/0 |

> 5 处注入**逐字节还原**（`sha256sum` 与注入前 `.orig-sha` 逐一相同），`git status --porcelain` 终态**空**；npm 全量 1394/0 复绿。**R-SGO-001 的两个关键面（AI 代答 / WIDEN 唯一写入面）判据确认承重，非恒真。**

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | **36** |
| 通过（✅） | **33** |
| 警告（⚠️） | **3**（C3 / C6 / C27，对应 I-02 / I-01·I-03 / I-04） |
| 失败（❌） | **0** |
| 阻塞问题 | **0** |
| 改进项（I） | **4**（I-01~I-04） |
| 观察项（O） | **5**（O-01~O-05） |

---

## 2. 逐项审查结果（C1~C36）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `batch-plan.ts` 纯逻辑 / 零 `chrome.*` / 职责切分可读性 | plan §5.1 / ADR-SGO-004 §1 | ✅ | 5 组职责（`planEntryOf` 成员过滤 / `buildPlan` 聚合 / `planFingerprint` / `admitEntry` / `createBatchConsent`）各自单职责；模块头注释写死「系统聚合 vs AI 独立出计划」与三条边界；零 `chrome.*`（node 可测） | 低 |
| C2 | `batch-plan.ts` 指纹与准入（逐字节 / 键集 / 漂移 / fail-closed） | ADR-SGO-004 §3 / R-SGO-906/916 | ✅ | `planEntryKey` 四元组 canonical JSON（字符串字段不归一化）；准入判据 = `approvedEntryKeys(plan).has(key)`（**条目键集**，不是总哈希）；`planDriftProblems` 批准前重校验；全路径 fail-closed | 低 |
| C3 | `confirm.ts` 计划感知桥分支清晰度 / 单条路径零回归 | FR-SGO-046/049/050 | ⚠️ | `plan` 缺省 ⇒ 既有 `summary` 审计路径**逐字不变**（零回归）；`admitted`/`rejected`/`drift` 显式分支；但 **`fallback` 未显式分支**（与 `plan-consent` 合流 ⇒ `BATCH_FALLBACK_TEXT` 未上屏、fallback 卡沿用计划行、`planGate` 在 fallback 时会推进审批状态）。见 **I-02** / **O-03** / **O-04** | 低 |
| C4 | `cards/auth.ts` 计划行：`textContent`-only / 掩码单一口径 / 8 行 + 诚实计数 + 中止交代 | FR-SGO-050/047 / R-SGO-914 | ✅ | `authPlanRows` 逐行 `maskRefDigest`（复用 `ref-scope.ts` 单一口径，禁第二份实现）；`planBlock` 零 `setAttribute`（BC-6 机核）；`entries > 8` ⇒ 诚实计数行；`patchAuthCard` 在 `cancelled ∧ plan` 追加 `AUTH_PLAN_ABORT_TEXT`（不谎报整批成功 + 可达下一步） | 低 |
| C5 | `sidepanel.ts` `handleConfirmRequest` / `presentScopeWidenAsk` / `emitConfirmCard` 具名提级 | plan §5.1 / ADR-SGO-005 §1 | ✅ | handler 从 listener 闭包提为具名函数，listener（`wire()`）与测试 seam（`__v3.testing.confirmRequest`）**走同一生产路径**（无第二实现）；`in-scope` / `no-ref` ⇒ 既有路径逐字不变 | 低 |
| C6 | 常量单源 / 无死常量 / 无意外格式回归 | 项目宪法；N-SGO-028 | ⚠️ | `BATCH_ACTION_TYPE` / `BATCH_MIN_ENTRIES` / `SCOPE_WIDEN_*` / 留痕字段名各单源；但 `cards/index.ts:56` 有**两条 import 并到一行**的格式回归（I-01），且 `batch-plan.ts` 的 `BATCH_RENDER_MAX = 8` **未被使用**且与 `AUTH_PLAN_RENDER_MAX = 8` 重复（I-03） | 低 |
| C7 | **FR-SGO-040** 计划生成（系统聚合 / 单条消息 / 三分支 / 空计划不空弹） | spec §4；EC-SGO-013 | ✅ | `buildPlan(calls, refs)` 只取单条 assistant 消息的 in-scope `dom set-text`；`planMode` `N≥2`/`N==1`/`N==0`；`setPlan` 在唯一入口把 `N<2` 归一为「无批次」；`BC-1` 7/0 含三分支与范围外注入 | 低 |
| C8 | **FR-SGO-041** + N-SGO-009/010 载体零新增 | spec §4；父 NG-SGO-007~009 | ✅ | `question.plan` = 既有 `confirm-request` 的 type-only 扩展字段（`ConfirmPlanQuestionExt`，编译器擦除）；`KIND_SET` 抽取 = **40 逐字**；`CARD_TYPES` = **12**；`REGISTERED_STRUCTURAL_HOSTS === []`；`MAX_OPEN_ASKS = 2`（亲跑 `host-registry` 11/0） | 低 |
| C9 | **FR-SGO-042** 指纹 = 目标集合 ∧ 动作类型 ∧ 文本对；放行仅指纹内 | spec §4；R-SGO-906 | ✅ | `planEntryKey` 四元组（`selector` ∧ `actionType` ∧ `fromDigest` ∧ `toText`）；亲跑 `BC-2`（同输入同指纹 / 尾随空格·中间空白·原文摘要改动均变 / 归一化反证）；`BC-3` 放行仅限键集内 | 低 |
| C10 | **FR-SGO-043** 一次真实手势（不代答/代填/自动放行/自动展开） | spec §4；R-SGO-001 | ✅ | 审批状态唯一写入点 = `confirm.ts` 的 `planGate.markApproved/markRejected`（`await opts.ask` 之后，即面板真实点击回传）；**亲注入①** AI 侧写入点 ⇒ `RL-06 扩批量` 必红；`bulkConsentProxyProblems` 三类变体判据在册 | 低 |
| C11 | **FR-SGO-044** 计划外回落逐条确认 | spec §4；EC-SGO-012 | ✅ | `admitEntry` 对计划外返回 `fallback`（**不是** `admitted`）；**亲注入④** 改 `admitted` ⇒ `BC-3` 必红（实测「期望 fallback 实测 admitted」）；桥侧对 fallback 仍走「出一张卡 → 需真实点击」⇒ 一次点击不放开无限写 | 低 |
| C12 | **FR-SGO-045** 特权 op 恒不入批 | spec §4；NFR-SGO-002 | ✅ | `batch-plan.ts` 只识别 `name==='dom' && subcommand==='set-text'`；模块内零特权标识 / 零 `.request(`（`capability-wiring` 机核）；`tierOf` 单源不改（`op-three-tier` 11/0，`tierOf` 逐 op 不变）；**亲注入②** `op.authorize` 标识入模块 ⇒ 必红 | 低 |
| C13 | **FR-SGO-046 / 050** 审计零明文（正文/译文不进四面） | spec §4；N-SGO-026/R-SGO-905/914 | ✅ | `CardView.plan` 与 `payload` **同级**（`stream-model.ts` 切片机核「计划字段不得进入 `StreamPayload`」）；`plan` 不在 `DIGEST_FIELDS`（不持久化）；审计只记 `fingerprintDigest` / `batchEntries`；计划行仅 `textContent` + `maskRefDigest`；亲跑 `law8` ⑨（52/0，含注入 ⇒ 命中 ⇒ 还原零命中） | 低 |
| C14 | **FR-SGO-047** 中止 + 部分完成如实 + `cancelled` 语义 | spec §4；EC-SGO-011 | ✅ | `markCancelled` 只在 `pending|approved` 生效；`admitEntry` 对 `cancelled` 返回 `rejected`；`BC-7` 机核 `cancelled ≠ approved` 且 `authFixedText` 6 终态逐字；介入文案 `AUTH_PLAN_ABORT_TEXT` 渲染于 `patchAuthCard` | 低 |
| C15 | **FR-SGO-048** 非批次仍逐条（单条路径逐字不变） | spec §4 | ✅ | `confirm.ts` 无 `plan` ⇒ 原 `summary` 审计 + 既有卡路径逐字不变；`ask-auth` 流入链路 78/0 未动（build R2 门禁终值） | 低 |
| C16 | **FR-SGO-049 / 103** 红线⑥ 扩覆盖批量 | spec §4；AC-SGO-005 | ✅ | `supersession`（`RL-06` 扩批量三类变体 + 原判据不改）亲跑 42/0；`op-three-tier`（OT-⑩ 扩批量 `bulkAdmitProblems`，特权恒 gesture）11/0；台账 `redlineRemap[]` 三条（RL-06 / OT-⑩ / law8）齐备且 `to` 写明「扩覆盖」 | 低 |
| C17 | **FR-SGO-060~063** WIDEN 二择 / 唯一写入面 / 零死端 | spec §4；R-SGO-907 | ✅ | `ref-scope.ts` 单源（`SCOPE_WIDEN_PROMPT/OPTIONS/WHOLE_PAGE` / `isWidenWholePage` / `isWidenAuthorizedReading`）零状态；`scopeWidenAuthorized = true` **恰一处**写入且被 `isWidenWholePage(choice)` 守卫；**亲注入⑤** 去守卫 ⇒ `L9-9` 2 红；AI/SW 侧零写入面（L9-9 反向扫描）；亲跑 `ND-10` 53/0（拒绝 ⇒ fail-closed + 可读理由 + 零死端）；复用既有 `askuser`（`type:'ask'`，零新 kind） | 低 |
| C18 | **FR-SGO-081 / 082** 批量留痕（指纹摘要 + 计数 + 手势 + 逐条结果，零明文） | spec §4；R-SGO-917 | ✅ | `batchTraceLine` 格式 `batch.plan=sha256:… \| batch.entries=N \| batch.gesture=user\|none \| batch.results=k/N`；`law8` ⑨-④ / `s0pBProblems`（含「留痕含用户内容值 ⇒ 必红」）双面机核；`gesture` 由真实点击回传（allow⇒user / deny⇒none）驱动 | 低 |
| C19 | **FR-SGO-093** S0′ 批量段双面（只加断言不加文件） | spec §4；AC-SGO-013/014 | ✅ | 样本单源 `test/ui/fixtures/s0-chain.mjs`（`S0P_B_BEATS`/`S0P_B_ITEMS`/`s0pBProblems`/`s0pBChain`，node+Chromium 共用）；node 判官 27/0（含 6 条注入反证）；Chromium `S0C-11`（70/0 ⇒ S0P-C4/C6）；`CHROMIUM_GATES === 9` 未动 | 低 |
| C20 | **FR-SGO-105 / 107** 台账（4 已发生 / 6 读数承载 / 7 未发生）+ `modifiedRanges` | spec §4；AC-SGO-004 | ✅ | `xSgoLedgerLeaf2.rows` = X-SGO-4 `superseded` + X-SGO-6/7 `no-supersession`；`redlineRemap[]` 3 条；`counterCheck` 指向真实门禁文件（`exists` 机核）；叶2 段 `leafBase = 37e4e28`；`modifiedRanges` 14 项同步面逐项（`supersession` 叶2 判据 2 用例机核） | 低 |
| C21 | **NFR-SGO-004** 法八四面零降级 | spec §5 | ✅ | `law8` 亲跑 **52/0**（R1 46 + R2 ⑨ 段 6 条，**36 段断言零删减**）；⑨ 段覆盖「计划行仅 textContent + 凭据形渲染前掩码 + 四面零命中 + 留痕零明文 + 注入非恒真」 | 低 |
| C22 | **NFR-SGO-006 / 007 / 013 / 014** fail-closed / 零新载体 / 串行 / 扩展点固定 | spec §5 | ✅ | 全路径 fail-closed（scrub 异常 ⇒ deny / 无应答 ⇒ deny）；零新 kind / 宿主 / 卡类型；Chromium 门禁逐个人工串行亲跑；扩展点固定（指纹 + type-only 字段 + `auth` 静态模板 + `isWidenWholePage`） | 低 |
| C23 | **EC-SGO-005/006/009/010/012/013/014/021/022** 逐条有实现且非静默 | spec §6 | ✅ | EC-014 漂移 ⇒ `drift`（`BC-4` 含反证 + 不误判中性输入）；EC-011 中止 ⇒ `cancelled`；EC-012 计划外 ⇒ `fallback`；EC-013 空计划 ⇒ `none` 不空弹；EC-005/006 ⇒ `ND-10`（选「整页」转值 + 拒绝零死端）；EC-022 ⇒ 三分支未触发的显式二态 | 低 |
| C24 | **AC-SGO-014 / 024** 完成交代如实 + 分列预算 | spec §7 | ✅ | 诚实计数行（`共 N 条（仅显示前 8）—— 一次批准覆盖全部 N 条`）与「一次批准覆盖全部」语义一致（显示上限不改变授权范围）；A/B 分列（A 计账 / B 不计账）明示 | 低 |
| C25 | **ADR-SGO-004** 逐条落地（系统聚合 / 指纹 / 一次手势 / 特权不入批 / 零明文 / holder 单源） | ADR-SGO-004 §1~§11 | ✅ | 计划 = 真实 `toolCalls`（同源不漂移，R-SGO-906 结构性消除）；`buildPlan` 每条消息覆盖 + `finally clear()`（跨轮不累积，R-SGO-915）；`batchConsent` 生产单例由 SW 与 `confirm.ts` 同源取用（无第二实例） | 低 |
| C26 | **ADR-SGO-005**（扩围）与 **ADR-SGO-006**（S0′ 双面）落地 | ADR-SGO-005/006 | ✅ | 扩围转值单源在面板（`ref-scope.ts` 只持文案与判据，零状态）；S0′ 样本单源 + 双面只加断言 + `CHROMIUM_GATES === 9`；人工面 M2/M3 显式 `⏳ 未执行`（不冒充 PASS） | 低 |
| C27 | **ADR-SGO-007** 体积预算 + 逐叶重登记 + EC-SGO-022 二态诚实性 | ADR-SGO-007；FR-SGO-120~125 | ⚠️ | A 列实测 **+6,214 B**（6,214 > 预算基线上界 5.5 KB，< +15% 上界 6.3 KB）**已显式越限登记**（不删判据 / 不放宽容差）；`build-meta` 逐模块 Σ = `sidepanel.ts +2,829` / `cards/auth.ts +2,113` / `l1/ref-scope.ts +532` / `stream-model.ts +455` / `chat-state.ts +285` = +6,214（glue 0）；三值同源 591,946 / 621,543 / 675,840；`authorConfirmation = pending-author-line`。**但** `build.md` §9.2/§9.3 两处终值与实测不符（见 **I-04**） | 低 |
| C28 | 红线结构（三冻结面 / base / 判定链 / `KIND_SET` 40 / `requestTurn(` 2 / 12 kind / 特权恒 gesture） | 父 §13；N-SGO-001~011 | ✅ | `content.js` 177,076 / sha `52a82620…` ∧ `pick-layer.js` 34,358 / sha `77796bab…` 亲测；base + `manifest.json` + `src/content/**` + `policy.ts` + `auto-authorize.ts` + `op-table.ts` **零 diff**；`KIND_SET` 40；`requestTurn(` 2；12 kind 零宿主；特权恰 2 恒 gesture | 低 |
| C29 | `plan.md` §5 文件影响对齐 + NOOP 真零 diff | plan §5.1~§5.3 | ✅ | NOOP 清单实测成立（base / content / manifest / `policy.ts` / `auto-authorize.ts` / `op-table.ts` / `l1/ref-scope.ts` 四值单源 / `chat-runner.ts` 零 diff）；`plan.md` 与实产的落点口径一致。文件清单为「≈11 项」估算，实产项数更多（见 **O-01**），属估算口径而非架构偏离 | 低 |
| C30 | 目录 / 模块落点（A 列面板 / B 列 SW；读数单列不破） | 项目宪法；ADR-SGO-002 §1 | ✅ | `batch-plan.ts` 落 `background/`（B 列）；计划行 / 二择落 `ui/sidepanel/**`（A 列）；SW 侧 `batch-plan.ts` **不 import** 面板读数模块（`planTargetInRefs` 承载同口径，由 `BC-1` 逐例等价机核），保持叶1「读数单列」 | 低 |
| C31 | `batch-consent.test.ts`（BC-1~7）覆盖 + 反证非恒真 | tasks §review 策略 | ✅ | 7 用例逐条 `expectFailPattern` 非占位；BC-1 含「范围外入计划 ⇒ 红」、BC-2 含归一化反证、BC-3/4/7 用伪造 `AdmitFn` 注入、BC-6 含四面临界 + 注入命中；真源切片读生产模块（`batch-plan.ts` / `stream-model.ts` / `cards/auth.ts`）。桥侧 fallback 无端到端用例（见 **O-04**） | 低 |
| C32 | RL-06 / OT-⑩ / 特权不入批**扩批量**判据承重 | FR-SGO-049/103 | ✅ | `BULK_CONSENT_VARIANTS` 三类 + `bulkConsentWriteSites`（扫 AI/LLM 模块）在册；`bulkAdmitProblems` / `batchPrivilegedProblems` 各含注入；亲注入①②实测必红。AI 模块集合为**列表式**（见 **O-02**） | 低 |
| C33 | `law8` ⑨ / `no-dead-end` ND-10 / S0′ 双面 断言只增 + 反证 | N-SGO-015/016 | ✅ | 亲跑 `law8` **52/0**（46→52，+6）· `dead-end` **53/0**（49→53，+4）· `s0-self-driven` **70/0**（65→70，+5）；三处均含 FAIL 段（判据非恒真）；`CHROMIUM_GATES === 9` | 低 |
| C34 | `gate-integrity`：新 node 门禁入受审集合 + `CHROMIUM_GATES` 不动 | FR-SGO-077/115 | ✅ | 亲跑 `gate-integrity` **22/0**（含 `V55F2_NODE_GATE_FILES` / `V55F2_W3_AUDITED_FILES` 下界声明 + 反证）；`CHROMIUM_GATES` 逐项仍 9 | 低 |
| C35 | 体积登记判据（Σ+glue==Δ / 三值同源 / 越 1 B 即 FAIL / 最新一轮定向） | FR-SGO-120~125 | ✅ | 亲跑 `size-*` 全绿（6 项 R1 红一次闭环）：`SIDEPANEL_BASELINE_BYTES = 591,946`、`ceil = floor(591946×1.05) = 621,543`、组数 33→34、最新一轮 rows 定向 `v55f2R1R2Rows`；越 `ceiling + 1` 必 FAIL | 低 |
| C36 | 判据非恒真（注入 ⇒ FAIL ⇒ 逐字节还原）+ 反证完整性 | FR-SGO-111；AC-SGO-018 | ✅ | 亲注入 **5 处**全部「红 ⇒ `git checkout` ⇒ sha 前后相同 ⇒ 复绿」（§0.1）；`git status` 终态干净（`.sddu` 外零残留）；门禁内亦含大量注入反证段 | 低 |

---

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量（Q，C1~C6） | 6 | 4 | 2 | 0 | 66.7% |
| 规范符合性（S，C7~C24） | 18 | 18 | 0 | 0 | 100% |
| 架构一致性（A，C25~C30） | 6 | 5 | 1 | 0 | 83.3% |
| 测试质量（T，C31~C36） | 6 | 6 | 0 | 0 | 100% |
| **合计** | **36** | **33** | **3** | **0** | **91.7%** |

> 3 条警告均为**代码整洁 / 健壮性 / 报告数值精度**层面（I-01~I-04），**零条**涉及 FR/NFR/EC 的实现符合性、红线强度或门禁有效性；**规范符合性偏差 = 0 项**。

---

## 4. 阻塞问题

**无（0 个）。** 未发现红线⑥（AI 代答 consent）被侵蚀、特权 op 入批、法八零明文破、载体新增（`KIND_SET`/kind/宿主）、判据恒真、base 或冻结面被撞、体积上限越界或欺瞒性登记。

---

## 5. 改进建议（I）与观察项（O）

### 5.1 改进建议（非阻塞）

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| **I-01** | `src/ui/sidepanel/cards/index.ts:56` | R1 改动把两条 import **并到一行**：`import { createAuthCard, decisionState, patchAuthCard } from './auth.js';import { createRefCard } from './ref.js';`（语法合法、类型检查通过，但为**意外格式回归**，与文件其余单行单语句风格不一致） | C6 | 拆回两行（纯格式，零行为变更）。 |
| **I-02** | `src/security/confirm.ts:174`（`// plan-consent` 分支） | `admitEntry` 的 `fallback` 结论**未显式分支** ⇒ 与 `plan-consent` 合流：① `BATCH_FALLBACK_TEXT`（及 `BATCH_REJECTED_TEXT` / `BATCH_DRIFT_TEXT`）的**可读文案未上屏**（deny 面只给通用理由）；② 计划外回落卡沿用「本批将写入」计划行展示，未标注「计划外」；③ fallback 写会把 `planGate` 置上 ⇒ 若此时仍在 `pending`，对该 fallback 卡的同意/拒绝会**推进整批计划**的审批状态。判据本体（计划外不自动放行）**未破**（亲注入④ + `BC-3` 承重），属健壮性/可读性 | C3 | 显式判 `verdict.kind === 'plan-consent'` 才挂计划渲染数据与 `planGate`；对 `fallback` 走独立分支并上屏 `BATCH_FALLBACK_TEXT`（`drift` / `rejected` 同理把 `.message` 落为可读理由）。 |
| **I-03** | `src/background/batch-plan.ts:41` | `BATCH_RENDER_MAX = 8` **未被任何代码引用**（死导出），而真实展示上限单源在 `cards/auth.ts` 的 `AUTH_PLAN_RENDER_MAX = 8` ⇒ 同值**双声明**（PD-SGO-007 的显示策略存在两处可漂移来源） | C6 | 删除 `BATCH_RENDER_MAX`（或让卡侧从单源导入），保证「展示上限」单一来源。 |
| **I-04** | `build.md` R2 §9.2 / §9.3（**同一文件、同一类「R2 终值登记精度」，两小点合并计一项**） | (a) §9.2 `test:supersession` R2 终值登记为 **40/0**，实测 **42/0**（R2 新增叶2 台账 + `modifiedRanges` 两用例；`grep -c '^test('` 实测 39→40→**42**，门禁实跑 `ℹ pass 42`）——**少记 2**；(b) §9.3「EC-SGO-022 二态」行沿用**旧**生效上限 `615,018`（baseline 585,732 时代），与同表公式值 **621,543** 及 §9.3「生效上限」行不一致（两值均 > 591,946 ⇒ 「三分支未触发」结论不变） | C27 | (a) 把 §9.2 的 `40/0` 订正为 `42/0`（或补注 R2 新增 2 用例）；(b) 把 §9.3 EC-SGO-022 行的生效上限统一为 `621,543`。**零代码 / 零门禁改动**（`size-*` 判据实测 621,543 已正确）。 |

### 5.2 观察项（O，非缺陷）

| # | 位置 | 观察 | 对应 Cx |
|---|------|------|:--:|
| **O-01** | `plan.md` §5.1/§5.2 | 文件影响清单为「≈11 项」估算；实产含清单未列的 `messaging.ts`（type-only wire）/ `audit-sink.ts`（审计字段）/ `stream-model.ts`（`CardView.plan`）/ `cards/index.ts`（导出）/ `law9-scope-reading.test.ts` / `s0-self-driven-chain.test.ts`。均为 plan 已声明的意图面（type-only 载体 / 渲染字段 / 断言只增），属**估算口径**，非架构偏离。 | C29 |
| **O-02** | `test/supersession-ledger.test.ts` `BULK_CONSENT_AI_MODULES` | RL-06 扩批量的「AI/SW 零写入面」判据为**列表式**（恰 4 个 AI/LLM 模块）；新增 AI 模块不会自动纳入。当前由「`markApproved/markRejected` 在全仓**唯一**调用点为 `confirm.ts`」的结构事实兜底 ⇒ 风险可控。 | C32 |
| **O-03** | `src/security/confirm.ts` | `BATCH_REJECTED_TEXT` / `BATCH_DRIFT_TEXT` / `BATCH_FALLBACK_TEXT` 三个可读文案**未上屏**（deny 面仅通用理由）；`EC-SGO-014`「显式失败」由 `deny` 满足（非静默放行），但用户看不到「漂移 / 已拒绝 / 计划外」的具体原因。 | C3 |
| **O-04** | `test/batch-consent.test.ts` | fallback **经 `confirm.ts` 桥的端到端路径**无专用用例（`BC-3` 只直测 `admitEntry`；桥侧 fallback 由 Chromium S0P-C6 的「一条 confirm-request{plan}」间接覆盖）。建议补一条「计划外写经桥 ⇒ 出一张卡且不复用已批准」用例。 | C31 |
| **O-05** | `build.md` §1 / §5 / §9.3 | 体积单位口径混用（预算用十进制 KB：3.5~5.5 / 4.0~6.3；增量描述用 KiB：+3.22 / +6.07 KiB）——数值与结论自洽（6,214 B < 5.5×1.15 KB = 6,325 B），仅建议在登记处注明单位口径。 | C27 |

---

## 6. 结论

**结论**: ✅ **通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 91.7%（33/36；规范符合性维度 100%） |
| 阻塞问题数 | 0 |
| 规范符合性偏差 | **0** 项 |
| 改进项（I） | 4（均非阻塞，零红线影响） |
| 可进入 validate | **是** |

**理由**：本叶承载**唯一红线级风险 R-SGO-001**（批量授权被误用为「AI 代答 consent」的外衣），其两个关键面均经**亲注入**确认承重——① AI 侧出现审批写入点 ⇒ `RL-06 扩批量` 必红；⑤ 去掉「整页」真实点击守卫 ⇒ `L9-9` 必红；且 `out-of-scope-authorized` 的唯一写入面 = 用户点击（AI/SW 零写入面反向扫描）。特权 op 恒不入批（亲注入② 必红 + `tierOf` 单源不改）、计划指纹逐字节不可归一化绕过（亲注入③ ⇒ `BC-2` 必红）、计划外逐条回落（亲注入④ ⇒ `BC-3` 必红）亦全部承重。法八批量面零明文（`law8` 52/0，`plan` 与 `payload` 同级且不入 `DIGEST_FIELDS`）、零新增载体（`KIND_SET` 40 / 12 kind / 零宿主 / `MAX_OPEN_ASKS = 2`）、拒答零死端（`ND-10` 53/0）、S0′ 批量段双面（node 27/0 + Chromium 70/0）均闭环；`npm test` 1394/0、三冻结面 sha 与 base / 判定链零 diff、体积五要素同源（591,946 / 621,543 / 675,840，越预算基线上界但未越 +15% 上界且已**显式诚实登记**）。4 项改进（1 处 import 格式回归、1 处 fallback 分支健壮性、1 处死常量、1 处 `build.md` R2 终值登记精度）**不阻塞、不触红线、不改判据**，建议随 validate 或收口一并微修。故判定 **✅ 通过**，可进入 `@sddu-validate`。

> **文件关联提醒（§8.2）**：本叶 `state.json` 的 `files` 本次已补入 `review.md` / `review-report.md`；若状态机未自动识别，请手动确认 `files.review` / `files.reviewReport` 指向本目录两文件。

---

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（36 Cx 逐项；0 BLOCK / 4 I / 5 O；红线⑥ 亲注入 5 处承重 + 法八批量面 + WIDEN 唯一写入面 + S0′ 双面 + npm/Chromium 亲跑；结论 ✅ 通过） | 2026-09-24 | SDDU Review Agent |
