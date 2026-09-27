# 审查报告：specs-tree-nda-2-fallback-and-gates（审查策略）

> **文档定位**: SDDU 审查策略 — 指导 review Agent 执行自主审查的清单和方法；审查结果见 `review-report.md`
> **前置依赖**: 本叶 `spec.md`（v1.0）/ `plan.md`（v1.0 + ADR-NDA-201 / ADR-NDA-202）/ `tasks.md`（v1.0，21/21）/ `build.md`（v1.0）；父 `spec.md`（v1.0）/ `plan.md` / `ADR-NDA-005~009`；叶1 `../specs-tree-nda-1-next-tool-channel/`（validated）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（NDA-2 兜底与判据叶自主审查清单 C1~C28；四维度：代码质量 / 规范符合性 / 架构一致性 / 测试质量；审查对象 = 工作树未提交产物；routing.v1 = `local_or_compute → none`）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查文件数 | 24 个（1 NEW src + 4 MODIFY src + 17 test/fixture + 2 台账 JSON；另只读复核基座 `runner.ts` / `chat-runner.ts` + 冻结面 + 保护段） |
| 通过项 | 22 |
| 改进建议 | 6（归并自若干 ⚠️） |
| 阻塞问题 | 0 |

> 上表为 R1 执行结果摘要（逐项见 `review-report.md`）。

**本叶性质**：末叶 / **兜底与判据叶** —— 在叶1 已建成的「`next` 工具 + `intercept` 捕获 + 5 道校验链」之上，落地四条可判链：① **自由输入分相**（未配置 ⇒ 不显示终端 / 已配置 ⇒ 恒常驻；判据单源 `risk.llmBlocked`）；② **提醒补一次**（`shouldNudge` 五条件纯函数 + SW `chat` 回调内同回合续呼 + `nudgeUsed` 有界 + 防环 + 零计数漂移）；③ **LLM 异常判定闭集**（`abnormalVerdict` 三情 + SW 单源 + `AiNextPayload.abnormal?` 加法承载 + 面板只消费）；④ **系统兜底推荐**（`llm.abnormal` 第 13 行 provider，复用 `op.llm-config`，文案分相）。审查重点是「两相不互相误伤」「提醒有界且不成环」「异常与未配置分相不混同」三条可 FAIL 事实，以及门禁逐条**等价重锚**下的断言语义守恒。

**审查对象来源**：
- `spec.md`：承载父 FR ≈42 条切片（UNCONF 050~056 · NUDGE 060~066 · ABNORMAL 070~076 · OPEN 090~093 · S0'''' 100/103/104 终态侧 · SUPERSEDE 112/113/119/120/122 · GATE 130~137 · VOL 141~145）+ NFR-NDA-001~016 + EC-NDA-007~025 + 交付物 10 项
- `plan.md`：§4 叶内设计定案 / §5 文件影响（A/B 列 + 预算）/ §3 两组方案对比 / 父 ADR 落点 + 叶内 ADR-NDA-201 / ADR-NDA-202
- `build.md`：21/21 任务（TASK-NDA-201~221）、SG-NDA-03 18/18、门禁结果、体积叶2 重登记 606,652 B、台账终态、未决项 U-1~U-6
- 产物（**工作树**，未提交）：`packages/web-cli-plugin/src/**`（5）+ `test/**`（17）+ `docs/v4-supersession-ledger.json` + `docs/v4-density-baseline.json`（+ `dist/` 只读量值复核 + 保护段分段 sha 复核）

## 2. 自主审查清单（C1~C28）

| # | 审查对象 | 审查基准 | 审查维度 | 审查方法 |
|---|---------|---------|---------|---------|
| C1 | `background/next-drive-policy.ts`（NEW）模块质量：纯函数（零 `chrome`/DOM/IO/时钟）/ 命名 / 文档 / 无魔法数 / `shouldNudge`·`abnormalVerdict`·`NUDGE_TEXT` 单源 | FR-NDA-060~066/070~076/105/106 · NFR-NDA-009 · ADR-NDA-006 §② · ADR-NDA-007 §① | 代码质量 | 全文走查 + 纯度正则抽核 + 与 `ai-next.ts` 职责面边界对照 |
| C2 | `next-registry/providers.ts` 改动质量：`free-input.when` 分相 / `LLM_ABNORMAL_RISK` / `llm.abnormal` 第 13 行 / `DRIVER_DECLS_SRC` 第 13 行 / 注释口径一致 | FR-NDA-051~055/071/072/075 · ADR-NDA-005 §① · ADR-NDA-007 §③ | 代码质量 | diff 走查 + 既有 12 行逐字对比 + 计数口径核对 |
| C3 | `background/service-worker.ts` 接线质量：`configured` 单源提升 / nudge 续呼（先置位 + 局部 turn）/ `onFinish(outcome)` 消费 / `abnormal` 附加 / `hasAiNext` 扩展 | FR-NDA-050/053/060~066/070/073/074 · ADR-NDA-006 §① · ADR-NDA-201 §①② | 代码质量 | 闭包走查 + 计数 grep（`runChatTurn(`/`providerChat(`/`isLlmConfigured(`）+ 与基座 `runner.ts` 契约对照 |
| C4 | `ui/sidepanel/sidepanel.ts` 改动质量：`observedAbnormal` 与 `observedBlocked` 同构 / `noteLlmAbnormalFact` 事件作用域一次性 / `risk` 折叠 / `consumeAiNext` 只消费零第二分类器 | FR-NDA-073/074 · ADR-NDA-201 §③④ | 代码质量 | 走查 + 注释剥离后 `abnormalVerdict`/`AI_ABNORMAL_CODES` 零命中复算 + `maybeRecommend` 调用点计数 |
| C5 | `next-registry/definition.ts` 词汇质量：`AI_ABNORMAL_CODES` 恰一处 / `AiAbnormalCode` / `AiNextPayload.abnormal?`（加法可选、type-only、∉ `KIND_SET`）/ 命名与兄弟叶一致 | FR-NDA-070/071/075 · NFR-NDA-007 · ADR-NDA-201 §② | 代码质量 | 源走查 + `.sddu` 文档命名交叉核对（计划/ADR vs 实现） |
| C6 | **未配置确定性引导**（复用 `llm.unconfigured` → `OPS_RECOVERY_ROWS` → `op.llm-config` op-direct chip）；零新增面；零 token 路径语义不变 | FR-NDA-050/054/055/056 · AC-NDA-006/017/018 | 规范符合性 | 既有链只读复核 + `OPS_RECOVERY_ROWS`/`OPS_RECOVERY_PROVIDER_IDS` 计数（恰 2）+ SW `:957-968` 走查 |
| C7 | **自由输入分相**：未配置 ⇒ 卡无 `.next-terminal` ∧ 引导可达；已配置 ⇒ 终端恒常驻（恒最末） | FR-NDA-051/052 · AC-NDA-007/018 · EC-NDA-010/011 | 规范符合性 | `free-input.when` 走查 + 生产卡两相实读（`recommendNextStep`）+ `R8`/`FIN` 判据对照 |
| C8 | **分相判据单源**：读既有 `risk.llmBlocked`（与修复 provider 同常量）；零新真值源 / 零第二偏好键 / 零新 ctx 字段 | FR-NDA-053 · NFR-NDA-013 · ADR-NDA-005 §① | 规范符合性 | `noteLlmBlockedFact` 唯一写入点 + `for (const id of observedBlocked) risks.push(id)` 折进面 + `NEXT_SOURCE_NAMES` 恰 7 |
| C9 | **提醒判定 + 文本**：`shouldNudge` 五条件（`configured` 显式入参）；`NUDGE_TEXT` 两句且零明文 | FR-NDA-060/061 · ADR-NDA-006 §②③ | 规范符合性 | 纯函数走查 + 文本常量抽核（URL/凭据形正则） |
| C10 | **有界恰一次 + 防环**：`nudgeUsed` 单布尔首闸；置位先于续呼；提醒轮不再提醒；不新增 `nextAfterSettle` 调用点 | FR-NDA-062/063 · NFR-NDA-014 · AC-NDA-008/021 · EC-NDA-021 | 规范符合性 | 源文本锚点序（置位 < 续呼）+ 反证形态审读 + `op-wiring` 计数对照 |
| C11 | **计数等价重锚**：`runChatTurn(` / `requestTurn(` / `nextAfterSettle` / `maybeRecommend` / `providerChat(` 计数与 HEAD 基线一致 | FR-NDA-064 · AC-NDA-020 · ADR-NDA-006 §⑥ · X-NDA-11 | 规范符合性 | `git show HEAD:` 与工作树双向 grep 计数复算 |
| C12 | **提醒轮失败进兜底 + 不第二产出通道**：nudge 报错冒泡至基座 ⇒ `llm-failed` ⇒ 兜底；同一 `deriveTools()` / 同一 cfg / 同一校验链 | FR-NDA-065/066 · EC-NDA-007 · ADR-NDA-006 §⑦ | 规范符合性 | `chat` 回调走查 + `dispatch` 单点复核 + nudge turn 局部性 |
| C13 | **异常判定闭集三情**：`no-tool-call` / `llm-failed` / `all-blocked`；`accepted>0 ⇒ null` ∧ `stopped ⇒ null`；与 `llm.unconfigured` **分相** | FR-NDA-070/071/075 · AC-NDA-009 · ADR-NDA-007 §① · EC-NDA-009 | 规范符合性 | `abnormalVerdict` 真值表复算 + 三情语义与 spec 字面（FR-070「无 next 工具调用」）逐条比对 |
| C14 | **系统兜底复用 `op.llm-config` + 文案分相**：`chips:['op.llm-config']`；`rule:'risk-recovery'` `priority:0`；文案「配置新的 LLM（切换 / 重配）」≠ 未配置文案 | FR-NDA-072/073 · AC-NDA-009 · ADR-NDA-007 §③ | 规范符合性 | provider 行走查 + 两文案相异实读 + `ACT_TO_OP` 恰 6 / `OP_IDS` 零新增 |
| C15 | **兜底必可达 + 不代答 consent**：异常相 ctx ⇒ `when===true` ∧ chip 可达；已配置 ⇒ 终端恒常驻（零死端）；`confirm` 档 `pressDecision` 恒 `blocked:tier` | FR-NDA-074/076 · NFR-NDA-002/003/010 · EC-NDA-018/019 | 规范符合性 | `opDescriptor('op.llm-config')` + `pressDecision` 真值复算 + `no-dead-end` ND-11 判据读判 |
| C16 | **零第二阈值 / 零第二词表**：三情字面量 `src` 内恰一处（`definition.ts`）；`DRIVER_TIMINGS`/`PROACTIVE_MOMENTS`/`BLOCKED_TERMINALS`/`RECOVERY_PROVIDER_IDS`/`OPS_RECOVERY_*`/`DRIVER_TERMINALS`/`NEXT_SOURCE_NAMES` 逐字未变 | FR-NDA-075 · NFR-NDA-007/013 · AC-NDA-026 | 规范符合性 | 单源扫描（`grep -v definition.ts`）+ 七集合真源计数 |
| C17 | **首开确定性**：`maybeRecommendOpenEntry` / `firstRunCard` 零行为改动；未配置首开由 C6 分相承接；零 LLM 往返；零双卡；`PD-NDA-001` 登记 | FR-NDA-090~093 · AC-NDA-011 · EC-NDA-024 · ADR-NDA-202 §③ | 规范符合性 | `git diff` 零命中复核 + R8-1~6 判据 + 首开入口函数体只读走查 |
| C18 | **S0'''' 支线 C / D / E 终态**：node 面 + Chromium 面**只加断言不加文件**（`CHROMIUM_GATES===9`）；人工面 `⏳` 如实 | FR-NDA-100/103/104 · AC-NDA-001/019/032 | 规范符合性 | `S0PPPP_LEAF2_STEPS` 单源核对 + 两叶并集覆盖全十二拍 + Chromium 门禁文件集计数 |
| C19 | **X-NDA 台账终态**：`xNdaLedger` 12 行（叶2 四行 X-NDA-3/4/10/11）五要素齐 / `xNdaGateReconciliation` 25 行三态齐无「未处置」/ `xNdaLedgerFull` 7/1（9 子项）/4；`assertionsRemoved===0` | FR-NDA-112/113/119/120/122/130~137 · AC-NDA-022/023 · ADR-NDA-202 §④ | 规范符合性 | 台账 JSON 结构化机核 + 字段完整性复算 + 逐行 `assertionsRemoved` 检查 |
| C20 | **NFR / EC 面**：法八四面零明文（NUDGE_TEXT/兜底文案/留痕只含字段名）；`recommendNextStep` 仍 pure；在飞不产卡（提醒不抢回合）；主链零新 LLM（提醒轮 = 唯一有界新增往返）；`EC-NDA-012/013/025` | NFR-NDA-004/008/011/015/016 · EC-NDA-012/013/022 | 规范符合性 | 文案 / 留痕静态抽核 + `recommend.ts` 导入面 + `pending` 硬门与 `driveAnsweredTurn` 零改 |
| C21 | **ADR 落地**：ADR-NDA-005（分相单源）/ 006（nudge 通道与有界）/ 007（闭集 + `llm.abnormal`）/ 201（`abnormal?` 承载 + SW 单源）/ 202（12→13 重锚 + 首开 + 保护段）逐条陈述与生产事实一致 | ADR-NDA-005~009 · ADR-NDA-201/202 | 架构一致性 | 源切片走查 + ADR 判据条目逐条比对 + 文档与实现一致性核对 |
| C22 | **文件影响对齐**：plan §5 = 1 NEW + 4 MODIFY src + 17 test/fixture + 2 JSON；无遗漏 / 无多余；`chat-events.ts` / `cards/nextstep.ts` 预期零改 | plan §5 · ADR-NDA-201 §② | 架构一致性 | `git status`/`git diff --stat` 与 plan §5 逐行比对 + 复核文件零改核验 |
| C23 | **红线**：零改基座（`packages/web-cli-base/**` 零 diff）/ 三冻结面逐字节（sha 双锚）/ 保护段 journey+binding `keep`（分段 sha 复算）/ 零新 kind（`KIND_SET` 40）/ 零新宿主（`REGISTERED_STRUCTURAL_HOSTS=[]`）/ 零新 op（`ACT_TO_OP` 6）/ 判定链 + `turn-queue` / `chat-runner` 零 diff / ROADMAP 零 diff | FR-NDA-001~006/142 · NFR-NDA-005/007 · NG-NDA-005/007/008/019 | 架构一致性 | `git status` + sha256/dist 字节亲验 + 保护段分段 sha256 复算 + 集合计数复算 |
| C24 | **门禁等价重锚 + 体积**：`driver-quadruple` 13↔13 / `next-registry` NR-10 13 / `free-input-next` 分相 / `AI-N-16~18` / 四处恰 N 不动 / `assertionsRemoved===0`；体积叶2 重登记五要素 + 三值同源 + 两叶 Σ + EC 三态 | FR-NDA-130~137/140~145 · AC-NDA-024/026/027/028 · ADR-NDA-008/202 | 架构一致性 | 门禁 diff 走查 + 计数复算 + 体积数值独立复算（606,652 / floor×1.05 / 距档）+ 台账数值对账 |
| C25 | **判据增量与存在性**：`AI-N-16~18`（判据表 15→18）/ `FIN-11` 分相块 / `R8-8` 重锚 / `ND-11` ×3 / `S0C-16` 叶2 五拍；旧判据逐条保留 | FR-NDA-082/100~106/130/131 · NFR-NDA-009 | 测试质量 | 判据 id / 测试名集合 diff（旧 ⊂ 新）+ 文件存在性与真源 import 面核对 |
| C26 | **双向反证真实性**：分相注入恒真 / 恒假各必红 + 逐字节还原；nudge 忽略 `nudgeUsed` / 删 `hasReply` / 置位后移必红；异常缺 `stopped` 分支 / 总是附加必红；删 `llm.abnormal` provider / `when` 不读风险必红 | FR-NDA-105/106 · NFR-NDA-009 · R-NDA-911/912 | 测试质量 | 反证段逐条读判 + 注入形态与还原锚点核对 + 真源切片（生产模块实跑，零桩） |
| C27 | **断言有效性**：无恒真判据 / 无「常量冒充读数」/ 无弱代理读数；三段控制 `ok`/`violated`/`n/a` 逐态可达且 `n/a` 不冒充 `ok` | FR-NDA-105/106 · NFR-NDA-009 · DC-NDA-014 | 测试质量 | `S0PPPP-3` / `S0PPPP-4` 读数来源抽检 + `s0ppppProblems` 可失败性推演 |
| C28 | **`KL-N-10` flake 处置 + 人工面**：`test:s0-self-driven` 3 项既有环境 flake 如实登记、隔离复跑 ≥2、不伪造串行绿；人工面 M1~M6 / M3 `⏳` 不冒充 PASS | EC-NDA-025 · FR-NDA-136 · R-NDA-012 · AC-NDA-019/032 | 测试质量 | `build.md §1.4` 记录走查 + 与叶1 基线复跑口径对照 + 人工面清单核验 |

> **质量门槛核对**：本叶承载父 FR ≈42 条切片（8 组）—— 每组 ≥1 Cx（UNCONF 050~056→C6/C7/C8 · NUDGE 060~066→C9/C10/C11/C12 · ABNORMAL 070~076→C13/C14/C15/C16 · OPEN 090~093→C17 · S0'''' 100/103/104→C18 · SUPERSEDE 112/113/119/120/122→C19 · GATE 130~137→C19/C24 · VOL 141~145→C24）；四维度均 ≥1 条（代码质量 C1~C5 / 规范符合性 C6~C20 / 架构一致性 C21~C24 / 测试质量 C25~C28）。NFR-NDA-001~016 与 EC-NDA-007~025 由 C7/C15/C16/C20/C23/C28 覆盖。

## 3. 审查详情

> 逐项结果见 `review-report.md` §2（本文档为策略，不定结果）。

## 4. 改进建议

> 见 `review-report.md` §5。

## 5. 阻塞问题

> 见 `review-report.md` §4。

## 6. 结论

**结论**: 由 `review-report.md` 给出。

## 7. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（NDA-2 兜底与判据叶 C1~C28 自主审查清单；四维度覆盖；≈42 条父 FR 切片按 8 组各 ≥1 Cx；ADR-NDA-005~009 + 叶内 ADR-NDA-201/202 逐项落点） | 2026-09-27 | SDDU Review Agent |
