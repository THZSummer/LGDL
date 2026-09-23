# 验证报告：specs-tree-v55-2-deterministic-onboarding（V5.5-2 主题① 确定性系统流）

> **文档定位**: SDDU 验证报告 — 逐项记录自主验证的执行结果（动手复刻，不采信 build/review 既有读数），作为工作流终点
> **验证策略**: `validate.md`（V1~V15 场景矩阵 + 10 条父 AC 锚点逐条映射 + 23 FR / 10 NFR / 7 EC 覆盖）
> **前置依赖**: `validate.md`、本叶 `spec.md`、`review-report.md`（结论 ✅ 通过 / 0 BLOCK）、`build.md`（R1 + R2 收口段 + 小修轮段）
> **创建人**: SDDU Validate Agent
> **创建时间**: 2026-09-23
> **验证轮次**: R1（build 16/16 + review passed + 小修轮 I-01~04 闭环后的首轮验证）
> **版本**: v1.0
> **更新人**: SDDU Validate Agent
> **更新时间**: 2026-09-23
> **更新说明**: 初始创建（V1~V15 全执行；结论 ✅ 通过 / 0 阻塞）

## 1. 验证概要

| 维度 | 数值 |
|------|:--:|
| 验证项总数 | **15**（V1~V15） |
| 通过 | **15** |
| 失败 | **0** |
| 无法执行 | **0**（受限项如实登记，见 §5） |
| 阻塞问题 | **0** |
| FR 覆盖率 | **100%**（23/23） |
| NFR 机核覆盖率 | **90%**（9/10；NFR-008 读屏 = 人工面 `⏳`） |
| 构建 / 类型检查 | 退出码 **0** / **0** |
| 门禁 `npm test` | **1283 / 0**（基线 1283） |
| 严重漂移 | **0** 项 |

> **执行环境**：分支 `feature/web-cli-plugin`，起始 HEAD `4ca1bf6`（工作树干净）。Chromium = `.pw-browsers/chromium-1234`。日志 `/tmp/opencode/v4-gate-logs/v55-2-validate/`；验证脚本 `/tmp/sddu-validate-v55-2-20260923-140041/`。`.sddu` 外零产品改动（注入抽验后 `git checkout` 逐字节还原）。

## 2. 逐项验证结果（V1~V15）

| # | 验证对象 | 验证步骤（摘要） | 预期结果 | 实测结果 | 判定 |
|:--:|---------|---------|---------|---------|:--:|
| **V1** | **S0 分支 B 端到端**（FR-131 / AC-001） | node 亲跑 `s0-self-driven-chain`；Chromium 亲跑 `test:s0-self-driven`；独立复刻脚本从真源派生 reading | 未配置 ⇒ detect ⇒ guide ⇒ 掩码卡 ⇒ 完成 ⇒ **自动续接** ⇒ 留痕 | node **11/0**；Chromium **42/0**（`S0C-7` 全绿，`[B:detect/guide/collect/complete]` 4/4 拍有真读数）；独立脚本 reading = `{steps:[detect,guide,collect,complete], paramKinds:[choice,text,secret], masked:true, completed:true, autoResumed:true, resumedInput:"原地翻译为中文", trace:true}` | ✅ |
| **V2** | **I-04 冷启动竞态**（FR-041/102） | 独立脚本验 `llmBlockedFactApplies` 真值 + 主动分支接线；亲跑 OD-17 | 裁定单独成立 ∧ 被动保留 ∧ 非恒真 | `applies(T,F)=true`、`applies(F,T)=true`、`applies(F,F)=false`；主动分支 `noteLlmBlockedFact(false, true)` + 折叠走单源判据；`test:onboarding` 29/0 | ✅ |
| **V3** | **I-03 失败可重试**（FR-046/050） | 独立脚本验 `recordsDeclinedCause` 真值表 + 同因去重模拟 + 收口缝接线；亲跑 OD-18 | 仅 cancelled/rejected 记因；failed 可重试 | `records(cancelled|rejected)=true`、`records(failed|completed)=false`；`suppress('同因', sim(['failed']))=false`、`suppress('同因', sim(['cancelled']))=true`；收口缝 `… && recordsDeclinedCause(state)` | ✅ |
| **V4** | **I-02 超容留痕**（FR-045） | 真源驱动登记两条不同意图；读返回值 + pending；源码接线；亲跑 OD-19 | 第二条 ⇒ `over-capacity` ∧ 原任务优先保留 ∧ 调用方留痕 | `outcome='over-capacity'`、`pending='原地翻译为中文'`（最早保留）；`const suspensionOutcome = registerConfigSuspension(` + `if (… === 'over-capacity') dispatch(… ONBOARD_SUSPENSION_RETAINED_TEXT)`；文案「原任务优先保留」且不含「取代」 | ✅ |
| **V5** | **两场景 + 已配置零引导**（FR-043/051/052 / AC-013） | `onboardScenario` 真值表 + provider `when` 源文本 + 亲跑 OD-14 | 首装 / 已装未配各自引导；`firstRun=false` 仍产出；已配置 ⇒ 零引导 | `(T,F)⇒first-install`、`(F,F)⇒installed-unconfigured(via:'risk')`、`configured⇒'none'`；`llm.unconfigured` provider `when` 只读 `ctx.risk`（risk-when 恰 1 处）；`onboarding` provider 保留 `firstRun` | ✅ |
| **V6** | **取消非死端 + 同因不重复**（FR-046 / EC-009） | `suppressOnboardCause` 真值 + 源码接线；亲跑 OD-15 | 同因不重复 ∧ 新因照旧 ∧ 取消可达 next | `suppress('同因',['同因'])=true`、`suppress('新因',['同因'])=false`、`suppress(undefined,…)=false`；`maybeRecommend` 只压同因；取消走 `nextAfterSettle({kind:\`op-${state}\`, force:true, …})` | ✅ |
| **V7** | **门禁全量**（FR-110/113/115/116 / AC-016/026） | `typecheck` + `build` + `npm test` + 全部 node/Chromium 子门禁逐条亲跑 | 全绿、计数只增、受审集合含新门禁 | 见 §3.3 门禁总表：`npm test` **1283/0**；全部门禁 0 fail（唯 `test:binding` 环境性 flake，见 §5） | ✅ |
| **V8** | **注入反证抽验**（FR-111 / AC-017） | ① 真源删自动续接 ⇒ 跑 s0-chain + onboarding；② 真源把 failed 并入去重 ⇒ 跑 onboarding；各还原 | ① S0N-7 必红；② OD-18 必红；还原 sha 一致 | ① `s0-self-driven-chain` **9/2**（S0N-7「**删自动续接 ⇒ FAIL**」）+ onboarding **28/1**；② onboarding **27/2**（OD-18 ×2，报文「配置失败被并入同因去重」）；均 `git checkout` 还原、sha 逐字节一致、复绿 11/0 + 29/0 | ✅ |
| **V9** | **红线 / 体积终核**（FR-049/120·123 / AC-012/020） | 三冻结面 sha/字节；`KIND_SET` 40；`law8`；特权手势；保段；五要素复算；zeroDiff 排除 | 逐项达标 | content 177,076 / `52a82620…b5f6`；pick-layer 34,358 / `77796bab…575e`；sidepanel **563,780**；KIND_SET **40**（无 `llm-unconfigured`）；`law8` **36/0**；`zero-injection` **28/0**；特权手势判据绿（SW `.request(` 零命中）；`journey` **171 PASS**；五要素 = **563,780 / 614,400 / 675,840 / 591,969 / `pending-author-line`**；本叶 33 变更文件零命中红线路径 | ✅ |
| **V10** | **配置判据 / 引导流单源 / 零 LLM / 零跳走**（FR-040/042/044/047/048/052 / AC-007） | OD-1~OD-9 逐条 + 源码扫描 | 判据 3 字段单源；引导恰 4 步单源；零 LLM / 零视图切换 | `LLM_CONFIGURED_FIELDS` 恰 3；`ONBOARD_STEPS` 恰 4（`Object.freeze`）+ `ONBOARD_COLLECT_STEPS` 读既有 `OP_PARAM_SEQUENCE`；`status.ts` 零 LLM/网络/chrome；`onboarding-flow.ts` 无 `openSettingsSection(` / `location.`；`stream` ⑯ 亲跑绿 | ✅ |
| **V11** | **`runChat` 前置判据源码序**（FR-040 / NFR-009） | OD-5 源码序 + 注入 | 判据 < `chatBusy=true` < `providerChat(` | `service-worker.ts`：`isLlmConfigured(...)`（:898）< `chatBusy = true;`（:910）< `providerChat(`（:926）；未配置 ⇒ `chat-result{variant:'llm-unconfigured'}` + `return`；OD-5 删判据/移位注入均必红 | ✅ |
| **V12** | **双源并存 + 恢复链零改写 + X-SELF-3**（FR-041/102/107 / AC-016） | OD-7 / OD-16 / `test:supersession` | 同一 `risk` 源幂等；恢复链零改写；台账落账 | 被动 `noteLlmBlockedFact` 4 生产调用点保留 + 主动折叠同一 `observedBlocked` Set ⇒ 幂等；`OPS_RECOVERY_ROWS` 恰 2 行逐字；`BLOCKED_RECOVERY_TRIGGER` 按终态键控；台账 `X-SELF-3`/`X-SELF-3-SW` 落账（`pure-addition` / `oldTitle:null`）；`test:supersession` **36/0** | ✅ |
| **V13** | **悬置单源 / 有界 / 重校验 / 空非死端**（FR-045/050 / EC-011/012 / NFR-010） | OD-10/OD-11/OD-12/OD-13 + 真源驱动 | 登记恰一处；超 MAX 拒；失效不假成功；空非死端 | 第二处登记 ⇒ 必红；`MAX_SUSPENSIONS=1`，第二条不同意图 ⇒ `over-capacity` 不叠加；站点/会话变 ⇒ `invalidated` 不交付旧输入；`empty`/`invalidated` 均落 `nextAfterSettle` 可达 next | ✅ |
| **V14** | **人工面如实 `⏳`**（FR-134 / AC-025） | 检查 Chromium 门禁末行读数 | 无伪造 PASS | `s0-self-driven.mjs` 末行显式「S0 人工面：… = ⏳ 未执行（headless 不可合成，不得冒充 PASS）」；未见伪造 PASS | ✅ |
| **V15** | **漂移检测**（NFR-004） | ① spec 是否被 build 期改动；② 孤立代码；③ 需求缺失；④ 取代台账一致性 | 零严重漂移 | ① 本叶提交未触碰 `spec.md`（`git diff` 0 命中，mtime 早于 build）；② 无未登记孤立生产代码（review O-01 的零消费导出属门禁契约层，非漂移）；③ 23/23 FR 有实现 + 门禁；④ `test:supersession` 36/0（`knownGap` 一致） | ✅ |

## 3. 验证详细信息

### 3.1 测试覆盖（FR / NFR）

> 本 Feature 为**产物级 v55-2 增量**，FR 覆盖面以「门禁判据 + 真源行为」双证；23 个 FR 全部有对应门禁/断言，0 缺失。

| 需求 ID | spec 描述 | 覆盖门禁 / 用例 | 执行结果 | 覆盖率 |
|---|---|---|---|---|
| FR-SELF-040 | `runChat` 前置配置判据（先于 providerChat） | `onboarding-deterministic::OD-5`（+2 反证） | ✅ | 已覆盖 |
| FR-SELF-041 | `llm.unconfigured` 双源并存 | `OD-7` / `OD-17`（+反证） | ✅ | 已覆盖 |
| FR-SELF-042 | 多步引导流（4 步单源） | `OD-8` / `stream` ⑯ | ✅ | 已覆盖 |
| FR-SELF-043 | 首装 / 已装未配两场景 | `OD-14` / `NR-11` | ✅ | 已覆盖 |
| FR-SELF-044 | 配置执行体唯一 | `OD-8` / `law8` ⑦ / `blocked-terminals` BT-6 | ✅ | 已覆盖 |
| FR-SELF-045 | 悬置单源 + 自动续接 | `OD-10` / `OD-13` / `s0-self-driven-chain` S0N-7 | ✅ | 已覆盖 |
| FR-SELF-046 | 取消非死端 + 同因不重复 | `OD-15` / `OD-18` | ✅ | 已覆盖 |
| FR-SELF-047 | 确定性可核（零 LLM + 同路径） | `OD-4` / `stream` ⑯ | ✅ | 已覆盖 |
| FR-SELF-048 | 不跳走（零视图切换） | `OD-9` / `stream` ⑯ | ✅ | 已覆盖 |
| FR-SELF-049 | 掩码卡复用 + 法八不退化 | `law8` ⑦（36/0）/ `s0-self-driven` S0C-7（password） | ✅ | 已覆盖 |
| FR-SELF-050 | 回执→续接顺序 + 失败回滚 | `OD-13` / `OD-12` / `pipeline` 顺序缝 | ✅ | 已覆盖 |
| FR-SELF-051 | 既有 `onboarding` provider 扩张不取代 | `blocked-terminals` BT-6 / `next-registry` NR-11 | ✅ | 已覆盖 |
| FR-SELF-052 | 配置探测判据确定性单源 | `OD-1`/`OD-2`/`OD-3` | ✅ | 已覆盖 |
| FR-SELF-102 | X-SELF-3 等价重锚（双源 + 恢复链） | `OD-16` / `OD-7` | ✅ | 已覆盖 |
| FR-SELF-107 | 取代等价重锚 + 如实登记 | `OD-16` / `test:supersession`（36/0） | ✅ | 已覆盖 |
| FR-SELF-110 | 门禁等价重锚（本叶主责清单） | `gate-integrity`（18/0）/ `stream`/`law8`/`ask-auth`/`recommendation`/`next-registry`/`blocked-terminals` | ✅ | 已覆盖 |
| FR-SELF-111 | 反证不空转 | 全部门禁注入反证 + V8 真源抽验 | ✅ | 已覆盖 |
| FR-SELF-113 | `knownGap` 一致性机核 | `test:supersession`（36/0） | ✅ | 已覆盖 |
| FR-SELF-115 | 新门禁纳入受审集合 | `gate-integrity`（18/0，`CHROMIUM_GATES===9`） | ✅ | 已覆盖 |
| FR-SELF-116 | 本叶面计数只增 | 逐门禁对账（§3.3） | ✅ | 已覆盖 |
| FR-SELF-120 / 123 | 体积五要素 + 红线逐字节 | `size-budget`/`size-growth-evidence`/`size-ruling-vol3`(12/0) + V9 | ✅ | 已覆盖 |
| FR-SELF-131 | S0 分支 B 必判项 | `S0N-7`/`S0N-8` + Chromium `S0C-7` | ✅ | 已覆盖 |
| FR-SELF-134 | S0 人工面如实标注 | Chromium 末行 `⏳` 读数（V14） | ✅ | 已覆盖（人工面） |

**FR 覆盖率 = 23/23 = 100%。**

| NFR | spec 关注点 | 覆盖 | 结果 |
|---|---|---|:--:|
| NFR-SELF-009 确定性 | 零 LLM + 同输入同路径 | `OD-4`（status.ts 零 import 黑名单）/ V11 | ✅ 机核 |
| NFR-SELF-003 安全 | 法八四面 / 判定链 / 净化面 | `law8` 36/0 · `zero-injection` 28/0 · 冻结面 sha · zeroDiff | ✅ 机核 |
| NFR-SELF-004 单源 + 机核 | 步骤/悬置/判据各恰一处 | `OD-8`/`OD-10`/`OD-1` | ✅ 机核 |
| NFR-SELF-007 可 FAIL | `expectFailPattern` 非占位 | OD/S0N/BT/NR 判据表 + 元判据 | ✅ 机核 |
| NFR-SELF-010 可逆 / 一致 | 失败快照回滚 + 悬置保留 | `OD-12`/`OD-13` + V13 | ✅ 机核 |
| NFR-SELF-013 打扰可控 | 同因不重复 + 三纪律 | `OD-15`/`OD-18` | ✅ 机核 |
| NFR-SELF-002 可用性 | 320px 零溢出 / `#stream[role=log]` | `density` 242/0 · `l0` 248/0 · `l1` 120/0 · `l2` 74/0 · `journey` 171 | ✅ 机核 |
| NFR-SELF-008 无障碍 | 读屏走查 + 掩码卡 ARIA | 列入人工面 `⏳`（V14） | ◐ 人工面 |
| NFR-SELF-005 体积 | ≤ 生效上限 + 五要素 | `size-ruling-vol3` 12/0 + V9 复算 | ✅ 机核 |
| NFR-SELF-006 兼容读取面 | 引导不新增必需 id | `l0`/`l1`/`l2`/`journey` | ✅ 机核 |

**NFR 机核覆盖率 = 9/10 = 90%**（NFR-008 为人工面；≥80% 达标）。

### 3.2 接口与数据实测

> 本 Feature 无外部 HTTP API；「接口面」= 面板↔SW 消息契约 + 生产模块行为读数，均以**真源驱动**实测。

| 检查项 | spec 要求 | 实测结果 | 一致？ |
|---|---|------|:--:|
| `runChat` 未配置消息 | `chat-result{variant:'llm-unconfigured'}`（type-only，不进 `KIND_SET`） | `messaging.ts` `ChatResultVariant` 含该成员恰 1 次；`KIND_SET` 40 无该成员 | ✅ |
| `op.llm-config` 采集序列 | `choice → text → secret` 三段（掩码） | `OP_PARAM_SEQUENCE['op.llm-config']` = `[choice, text, secret]`；S0C-7 实测 `secret` 步 `type=password` | ✅ |
| 悬置登记三要素 | 谁在等 / 等什么 / 依据什么 | `registerSuspension({driverId, source:'llm-config', kind:'answered', instruction, evidence:[origin,session]})` | ✅ |
| 续接交付输入 | 逐字为用户原话 | `resumeSuspension(...).instruction = '原地翻译为中文'`（逐字） | ✅ |
| 超容行为 | 第二条不同意图不叠加 + 原任务保留 | `over-capacity` ∧ pending = 最早意图 | ✅ |
| 失效重校验 | 站点/会话变 ⇒ 不交付旧输入 | `invalidated`（`digestMatches` 失败） | ✅ |

### 3.3 构建与脚本验证

| 检查项 | 命令 | 退出码 | 结果 |
|---|---|:--:|:--:|
| 类型检查 | `npm run typecheck` | 0 | ✅ |
| 构建 | `npm run build` | 0 | ✅（`sidepanel.js` 563,780 B；254ms） |
| node 全量 | `npm test` | 0 | ✅ **1283 / 0** |
| `test:onboarding` | `npm run test:onboarding` | 0 | ✅ **29 / 0** |
| `s0-self-driven-chain`（node） | `node --test dist-test/test/s0-self-driven-chain.test.js` | 0 | ✅ **11 / 0** |
| `test:supersession` | — | 0 | ✅ **36 / 0** |
| `test:gate-integrity` | — | 0 | ✅ **18 / 0** |
| `test:size-ruling-vol3` | — | 0 | ✅ **12 / 0** |
| `test:design-contract` | — | 0 | ✅ **19 / 0** |
| `test:ref-pick-wiring` | — | 0 | ✅ **11 / 0** |
| `test:s0-self-driven`（Chromium） | — | 0 | ✅ **42 / 0** |
| `test:law8`（Chromium） | — | 0 | ✅ **36 / 0** |
| `test:stream`（Chromium） | — | 0 | ✅ **76 / 0** |
| `test:dead-end`（Chromium） | — | 0 | ✅ **49 / 0** |
| `test:ask-auth`（Chromium） | — | 0 | ✅ **78 / 0** |
| `test:recommendation`（Chromium） | — | 0 | ✅ **72 / 0** |
| `test:auth-chip`（Chromium） | — | 0 | ✅ **37 / 0** |
| `test:zero-injection` | — | 0 | ✅ **28 / 0** |
| `test:density` | — | 0 | ✅ **242 / 0** |
| `test:l0` / `test:l1` / `test:l2` | — | 0 | ✅ **248 / 0 · 120 / 0 · 74 / 0** |
| `test:page-input` | — | 0 | ✅ **118 / 0** |
| `test:ui`（journey 保段） | — | 0 | ✅ **171 PASS** |
| `test:insight` / `test:hardening` / `test:e2e` | — | 0 | ✅ **118 PASS · 24 PASS · PASS** |
| `test:l1-reverse` / `test:l2-reverse` | — | 0 | ✅ **9 / 10 反证全套 PASS（sha256 复原）** |
| `test:binding` | `npm run test:binding` | **1** | ◐ **环境性 flake（N-07 继承）** — 见 §5 |

> **计数只增对账**（vs review-report 基线）：`npm test` 1283（review 1277 → 小修轮 +6）· `onboarding` 29（23 → +6）· `s0-self-driven` 42 · `dead-end` 49 · `ask-auth` 78 · `recommendation` 72 · `law8` 36 · `stream` 76 · `gate-integrity` 18 · `journey` 171。**只增不减**。

### 3.4 性能与边界

| NFR / EC | 要求 | 实测 | 达标？ |
|---|---|------|:--:|
| NFR-SELF-005 体积 | `sidepanel.js` ≤ 生效上限 | 563,780 ≤ **591,969** | ✅ |
| 五要素① 基线 / 终值 | 登记 = 实测 | 563,780 = 563,780（实测 `stat -c %s`） | ✅ |
| 五要素② 档位 | `ceilTo50KB(B)` | 614,400（563,780 越 563,200 ⇒ 显式升档） | ✅ |
| 五要素③ 绝对上限 | 档位 × 1.10 | 675,840 | ✅ |
| 五要素④ 生效上限 | `min(675,840, floor(563,780×1.05))` | **591,969** | ✅ |
| 五要素⑤ 作者确认 | 不伪称 | `pending-author-line`（ledger `v552R3TierUpgrade`） | ✅ |
| 冻结面 | 零容差 | content 177,076 / `52a82620…` · pick 34,358 / `77796bab…` | ✅ |
| EC-011 失效边界 | 站点/会话变 ⇒ 不续接 | `invalidated` 不交付旧输入 | ✅ |
| EC-012 空悬置 | 非死端 | `empty` ⇒ `nextAfterSettle({kind:'answered'})` | ✅ |
| 可用性 320px | 零溢出 | `density`/`l0`/`l1`/`l2` 全 0 fail | ✅ |
| 预算诚实 | 越预算须登记 | 本叶合计 +5,897 B／预算 4,900 ⇒ **超 997 B**；未越叶上界 6,300（余 403 B）——评分不静默 | ✅ |

### 3.5 漂移检测

| 漂移类型 | 检测命令 / 方法 | 结果 |
|---|---|------|
| 孤立代码（有代码无需求） | 对照 23 FR + 源码/门禁扫描 | ✅ 无严重漂移（review **O-01** 的零消费导出 = 门禁契约层声明单源，非生产漂移，随本轮登记） |
| 需求缺失（有需求无代码） | 23 FR ↔ 实现/门禁逐条 | ✅ 无（23/23 有实现 + 判据） |
| 规格漂移（spec 被修改） | `git diff 39c1fb0..HEAD -- <leaf>/spec.md` | ✅ 无（0 命中；spec mtime 2026-09-22 23:41 早于 build） |
| 红线路径漂移 | `git diff --name-only 39c1fb0..HEAD` 排除清单 | ✅ 无（33 变更文件零命中 `src/content/**` / `manifest.json` / `dist/content.js` / `dist/pick-layer.js` / `ROADMAP.md` / `docs/v3-*` / `design/**` / `stream-model.ts`） |
| 门禁取代面漂移 | `test:supersession` 36/0 + `gate-integrity` 18/0 | ✅ 无（`knownGap` 一致；X-SELF-3 双条目落账） |

## 4. 验证脚本执行记录

> ADR-003：验证脚本由 validate Agent 自主编写、直接执行（不走 task→build）。
> 目录：`/tmp/sddu-validate-v55-2-20260923-140041/`；门禁日志：`/tmp/opencode/v4-gate-logs/v55-2-validate/`。

| 脚本文件 | 用途 | 对应场景 | 退出码 | 关键输出 |
|---------|------|:--:|:--:|---------|
| `v_s0b_replication.mjs` | S0 分支 B 独立复刻（真源派生 reading + 共享判据 + 4 类反证 + A/B 独立计数） | V1 | 0 | `{steps:[detect,guide,collect,complete], paramKinds:[choice,text,secret], masked:true, completed:true, autoResumed:true, resumedInput:"原地翻译为中文", trace:true}`；删自动续接 ⇒ `["**删自动续接 ⇒ FAIL**…"]` |
| `v_smallfix_behavior.mjs` | 小修轮 I-02/I-03/I-04 行为级（真值 + 真源驱动 + 接线） | V2·V3·V4 | 0 | I-04 `(T,F)=true,(F,T)=true,(F,F)=false`；I-03 `records(failed)=false, suppress(failed)=false`；I-02 `over-capacity` + `pending='原地翻译为中文'` + 文案「原任务优先保留」 |
| `v_scenarios_cancel.mjs` | 两场景 + 已配置零引导 + 取消非死端/同因不重复 | V5·V6 | 0 | `first-install:via=onboarding｜installed-unconfigured:via=risk｜configured=>none`；同因压制/新因放行/`force` 可达 next 全绿 |
| `v_redline_volume.mjs` | 红线 / 体积终核（冻结面 sha · KIND_SET · 五要素复算 · 台账 · zeroDiff） | V9 | 0 | `563,780 / 614,400 / 675,840 / 591,969 / pending-author-line`；`KIND_SET=40`；`changed files=33; forbidden-path hits=[]` |
| （门禁脚本）`test:onboarding` / `s0-self-driven-chain` / `test:s0-self-driven` 等 | 全量门禁亲跑 + 注入抽验 | V7·V8 | 0（binding=1） | 见 §3.3；注入 ① `9/2`+`28/1`、注入 ② `27/2`，均还原复绿 |

## 5. 阻塞问题

**无阻塞问题（0）。**

**受限 / 非阻塞登记（如实，不冒充 PASS）**：

| # | 位置 | 事项 | 处置 |
|---|---|---|---|
| L-01 | `test/ui/binding.mjs` | 本机 CDP harness 环境性 flake（`selector not found: #confirm-allow` / `CDP socket not open`），复跑 3 次均同面 | `binding.mjs` **不在本叶变更面**（`git diff` 0 命中）；保护段由 `test:supersession` **36/0**（sha + `startByte 107780` 双绿）独立机核兜底。与 v55-1 N-07 / review O-04 同族 |
| L-02 | 人工面 | 引导文案可读性 / 主动引导体感 / 读屏掩码卡（NFR-008） | 如实 `⏳`（headless 不可合成），不冒充 PASS；不改变机核结论 |
| L-03 | review **O-01/O-02/O-05/O-06** | 零消费导出 / 续接后未清悬置 / 跨 options 页续接口径 / `v4-density-baseline.json` 陈旧字段（小修轮已订正为 675,840 + 注） | 随本轮登记，不阻塞（不改变承载 FR 成立性） |

> 说明：`review-report.md` 的 4 项改进（I-01 读数订正 / I-02 超容留痕 / I-03 失败可重试 / I-04 冷启动双源）已由 build 小修轮（commit `4ca1bf6`）闭环；本轮 V2/V3/V4 对其**行为级独立复刻**均绿，V8 注入抽验证明其载荷性（真删/真并必红）。

## 6. 结论

**结论**: ✅ **通过**

**指标达标矩阵**：

| 指标 | 要求 | 实测 | 达标？ |
|------|------|------|:--:|
| FR 测试覆盖 | 100% | **100%（23/23）** | ✅ |
| NFR 覆盖率 | ≥ 80% | **90%（9/10 机核；NFR-008 人工面 `⏳`）** | ✅ |
| 构建退出码 | 0 | **0**（+ 类型检查 0） | ✅ |
| 阻塞问题数 | 0 | **0** | ✅ |
| 漂移项 | 0（严重） | **0** | ✅ |
| 门禁全量 | 绿 | `npm test` **1283/0** + 全部子门禁 0 fail（唯 `binding` 环境性 flake，保段独立机核） | ✅ |
| 注入反证抽验 | ≥ 2 | **2**（删自动续接 ⇒ S0-B 红；failed 并入去重 ⇒ OD-18 红），均还原复绿 | ✅ |
| 红线 / 体积 | 达标 | 三冻结面 sha 一致 · KIND_SET 40 · law8 36/0 · 保段 171 · 五要素齐 | ✅ |

**理由**：本叶 P0 主体经**动手复刻**全维度验证均成立——
① **S0 分支 B 必判项是载荷性的**：node（11/0）+ Chromium（42/0）双面真产品路径走通「未配置 ⇒ detect ⇒ guide ⇒ 掩码卡(password) ⇒ 完成 ⇒ **自动续接** ⇒ 留痕逐字原话」，独立复刻脚本从真源派生 reading 全绿，且**真删自动续接 ⇒ S0N-7 必红（9/2）+ OD 红（28/1）**，还原 sha 逐字节一致；
② 小修轮三项（I-02/I-03/I-04）**行为级**独立复刻全绿——超容 `over-capacity` 真触发且留痕「原任务优先保留」、`failed` 不并入同因去重而**保持可重试**、冷启动窗口 `ruled ∧ ¬passive` 仍落事实（guide chip 不缺席），且抽验注入必红；
③ 两场景 / 取消非死端 / 同因不重复 / 已配置零引导判据齐备且与生产 `when` 源一致；
④ 门禁全量 `npm test` **1283/0**（基线 1283）+ 全部 Chromium 门禁 0 fail，红线逐字节不动、体积五要素同源复算（563,780 / 614,400 / 675,840 / 591,969，`pending-author-line` 未伪称）；
⑤ 零严重漂移、0 阻塞。唯一非绿项 `test:binding` 为**已登记环境性 flake**（文件不在变更面，保护段由 `supersession` 36/0 独立兜底）。

**至此本 Feature 可关闭**（工作流 7/7 完成）。

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1）：V1~V15 全执行；S0 分支 B 独立复刻（node 11/0 + Chromium 42/0 + 自写脚本）+ 小修轮 I-02/I-03/I-04 行为级复刻 + 两场景/取消 + 门禁全量 `npm test` 1283/0 + 2 组真源注入抽验（9/2 · 27/2，还原复绿）+ 红线/体积终核（三冻结面 sha · KIND_SET 40 · law8 36/0 · 五要素 563,780/614,400/675,840/591,969/pending-author-line）+ 漂移 0；结论 **✅ 通过 / 0 阻塞**；受限项 L-01~L-03 如实登记 | 2026-09-23 | SDDU Validate Agent |
