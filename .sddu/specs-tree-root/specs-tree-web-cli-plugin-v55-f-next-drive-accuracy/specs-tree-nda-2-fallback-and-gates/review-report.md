# 审查报告：specs-tree-nda-2-fallback-and-gates（审查执行报告）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（v1.0，C1~C28 审查清单 + 四维度指引）
> **前置依赖**: `review.md`（v1.0）、本叶 `spec.md`（v1.0）、`plan.md`（v1.0 + ADR-NDA-201/202）、`build.md`（v1.0，21/21）
> **创建人**: SDDU Review Agent
> **创建时间**: 2026-09-27
> **审查轮次**: R1
> **版本**: v1.0
> **更新人**: SDDU Review Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（R1 全量静态审查：C1~C28 逐项；**工作树未提交产物**直接阅读；零运行时验证 —— routing.v1 = `local_or_compute → none`）

---

## 1. 审查概要

| 维度 | 数值 |
|------|:--:|
| 审查项总数 | 28 |
| 通过 | 22 |
| 警告 | 6 |
| 失败 | 0 |
| 阻塞问题 | 0 |

**审查方式**：静态分析（读代码 / 对比规范 / 源切片计数 / 真源复算 / sha256 与字节量值亲验 / `git show HEAD:` 基线对照）。**不跑测试、不调接口、不测性能**（那属 validate）。

**结论摘要**：**⚠️ 有条件通过**（0 阻塞 / 6 改进项）。实现层面未发现规范偏差：`configured` 单源（`service-worker.ts:933`）与 `!configured` 早退（`:957`）语义与旧内联判据逐字等价；nudge 五条件纯函数 + 置位先于续呼；`abnormal` **只在非 null** 附加 + `hasAiNext` 三条件扩展；面板 `abnormalVerdict`/`AI_ABNORMAL_CODES` **零实现**（注释剥离后零命中）；五类关键计数（`runChatTurn(`/`requestTurn(`/`nextAfterSettle`/`maybeRecommend`/`providerChat(`）与 HEAD 基线**逐一相同**；体积 `dist/sidepanel.js = 606,652 B`、`dist/background.js = 1,666,594 B`、三冻结面 sha 双锚、保护段分段 sha 双双命中；`KIND_SET`=40 / `ACT_TO_OP`=6 / `REGISTERED_STRUCTURAL_HOSTS=[]` / `xNdaLedger`=12 / `xNdaGateReconciliation`=25 全部亲验。发现 6 处**不影响红线但削弱判据语义精度 / 文档准确性**的改进项，其中 **I-1（`abnormalVerdict` 把「调用 next 且空 candidates」并入 `no-tool-call`）** 建议 validate 优先核对（详见 §5）。

## 2. 逐项审查结果（C1~C28）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `next-drive-policy.ts` 模块质量 | FR-NDA-060~076/105/106 · ADR-NDA-006 §② | ✅ | `shouldNudge`（`:52-58`）五条件顺序即优先级、纯函数零 IO；`abnormalVerdict`（`:100-105`）纯函数；`NUDGE_TEXT`（`:66-68`）两句常量；闭集值经 `AI_ABNORMAL_CODES` 解构（`:86`）⇒ 三情字面量在本文件**零出现**；模块头逐条登记职责边界与 `PD-NDA-016` 时点偏差。 | — |
| C2 | `providers.ts` 改动质量 | FR-NDA-051~055/071/072/075 · ADR-NDA-005 §① | ⚠️ | 改动最小且集中：`free-input.when` 仅加 `!ctx.risk.includes(LLM_BLOCKED_RISK)` 前缀（`:246`）；`LLM_ABNORMAL_RISK`（`:54`）与 `LLM_BLOCKED_RISK` 同居单源；`llm.abnormal` 行（`:156-168`）与 `DRIVER_DECLS_SRC` 第 13 行（`:298`）成对，`evidence:['risk']` 与 `when` 实读同源。**注**：`when` 的 `(ctx.session.busy === true \|\| ctx.session.busy === false)` 对布尔域恒真（空转合取），系 ADR-NDA-005 §① 为保 DQ-3 evidence 同源而**显式裁决保留**（非本叶引入）⇒ 判据层面对「busy 读向」无实际约束力（见 I-4）。 | 低 |
| C3 | `service-worker.ts` 接线质量 | FR-NDA-050/053/060~066/070/073/074 · ADR-NDA-006 §① · ADR-NDA-201 §①② | ✅ | `const configured`（`:933`）在 `chatBusy = true` 之前、与 `!configured` 早退（`:957`）同块 ⇒ 单源；nudge 用**同一** `call`（`:1018`）、同一 `deriveTools()`；`nudgeUsed` 置位（`:1027`）先于续呼（`:1028`）；续呼数组 `[...turns, NUDGE_TEXT]` 为**局部**；`onFinish(outcome)`（`:1069`）消费基座原生 outcome；`abnormal` 只在非 null 附加（`:1092`）、`hasAiNext` 三条件（`:1094`）。计数复算：`runChatTurn(`=1 调用（`chat-runner.ts` 1 定义）/ `providerChat(`=1 交付点 / `isLlmConfigured(`=1 真调用（`:933`，`:930` 为注释）⇒ 与 HEAD 基线一致。 | — |
| C4 | `sidepanel.ts` 改动质量 | FR-NDA-073/074 · ADR-NDA-201 §③④ | ✅ | `observedAbnormal`（`:1494`）与 `observedBlocked`（`:1462`）同构；`noteLlmAbnormalFact`（`:1495-1498`）每次 done 重设（有 ⇒ 点亮 / 无 ⇒ 熄灭 ⇒ 事件作用域一次性）；折进既有 `risk`（`:2076`，且不做同因压制 ⇒ 异常相每次可达）；`consumeAiNext` 只消费（`:4420`）。`abnormalVerdict`/`AI_ABNORMAL_CODES` 在面板注释剥离后**零命中**。 | — |
| C5 | `definition.ts` 词汇质量 | FR-NDA-070/071/075 · NFR-NDA-007 · ADR-NDA-201 §② | ⚠️ | `AI_ABNORMAL_CODES` 恰一处（`:110`）+ `AiAbnormalCode`（`:111`）+ `AiNextPayload.abnormal?`（`:121`）加法可选、type-only、∉ `KIND_SET`；`KIND_SET` 40 逐字。**命名漂移**：`plan.md §2.3` 与 `ADR-NDA-201 §③` 写 `LLM_ABNORMAL_CODES` / `AiNextAbnormalCode`，实现与 `ADR-NDA-201 §①②` 用 `AI_ABNORMAL_CODES` / `AiAbnormalCode` ⇒ 文档应统一（见 I-2）。 | 低 |
| C6 | 未配置确定性引导（零新增面） | FR-NDA-050/054/055/056 · AC-NDA-006/017/018 | ✅ | SW 未配置分支（`:957-968`）只发 `variant:'llm-unconfigured'`（零 provider / 零 token / 零网络）；面板 `:4181-4207` 走既有链（detect 行 + 悬置 + `noteLlmBlockedFact(false,true)` + `nextAfterSettle`）；chip 由 `OPS_RECOVERY_ROWS[0]`（`op.llm-config`）产出。`OPS_RECOVERY_ROWS`/`OPS_RECOVERY_PROVIDER_IDS` 仍恰 2；零新增 provider / op / 引导面。 | — |
| C7 | 自由输入分相（两相可判） | FR-NDA-051/052 · AC-NDA-007/018 · EC-NDA-010/011 | ✅ | `free-input.when` 分相（`providers.ts:246`）：`risk:['llmBlocked']` ⇒ `false`；`risk:[]` ⇒ `true`；仅 `permBlocked` ⇒ `true`（分相只看 `llmBlocked`）。生产卡两相：未配置 ⇒ `terminal === undefined` 且 `chips` 含 `op.llm-config`；已配置 ⇒ `terminal === true`（FIN-11 判据真源实跑）。已配置相终端恒常驻 ⇒ R8 / F-35 不回归。 | — |
| C8 | 分相判据单源 | FR-NDA-053 · NFR-NDA-013 · ADR-NDA-005 §① | ✅ | `llmBlocked` 唯一写入点 `noteLlmBlockedFact`（`:1485-1488`）；折进 `risk`（`:2070-2073`）；与 `llm.unconfigured` 修复 provider 的 `when` **共享同一常量**（`OPS_RECOVERY_ROWS[0].risk === LLM_BLOCKED_RISK`，FIN-11 零新源判据机核）；`NEXT_SOURCE_NAMES` 仍恰 7；`providers.ts` 代码面无 `chrome.`/`storage.`（零第二偏好键）。 | — |
| C9 | 提醒判定 + 文本 | FR-NDA-060/061 · ADR-NDA-006 §②③ | ✅ | `shouldNudge` 五条件（`nudgeUsed`/`!configured`/`captured`/`toolCalls!==0`/`hasReply`），`configured` 显式入参 ⇒ FR-060 三条件在判据内可判；`NUDGE_TEXT` 含「调用一次」与「空 `candidates` 数组」两句；零 URL / 凭据形（AI-N-16 文本抽核）。 | — |
| C10 | 有界恰一次 + 防环 | FR-NDA-062/063 · NFR-NDA-014 · AC-NDA-008/021 | ✅ | `nudgeUsed` 单布尔（`runChat` 局部 ⇒ 每回合重开，含 drain 回合）；`shouldNudge` 首闸 `if (f.nudgeUsed) return false`；SW 源文本序 `nudgeUsed = true`（`:1027`）< `content: NUDGE_TEXT`（`:1028`）；续呼在 `if (shouldNudge(...))` 内，**每轮只求值一次**；nudge 不碰结算链（`nextAfterSettle` 10 调用点零改）⇒ 防环结构性成立。 | — |
| C11 | 计数等价重锚 | FR-NDA-064 · AC-NDA-020 · ADR-NDA-006 §⑥ · X-NDA-11 | ✅ | `HEAD` vs 工作树复算：`sidepanel.ts` 的 `maybeRecommend(`=14 / `nextAfterSettle(`=13 / `requestTurn(`=8 **三处相同**；`service-worker.ts` 的 `runChatTurn(`=1 / `providerChat(`=2 **相同**；`isLlmConfigured(` 由内联实参提为 `const configured`（1 真调用不变）。`X-NDA-11 = no-supersession` 与实测一致。 | — |
| C12 | 提醒轮失败进兜底 + 不第二产出通道 | FR-NDA-065/066 · EC-NDA-007 · ADR-NDA-006 §⑦ | ⚠️ | nudge 续呼**未包裹 try/catch** ⇒ 异常冒泡至基座 `handleLlmError` ⇒ 首次重试 / 连续失败 `llm-failed`；此时 `nudgeUsed=true` ⇒ 不再提醒 ⇒ `onFinish` 落 `llm-failed` ⇒ 系统兜底可达（结构性成立）。同一 `call`/`deriveTools()`/5 道链 ⇒ 无第二产出通道。**注**：nudge 触发的 UX 副作用（原始回答不进会话、nudge 回合消息面不含首答 ⇒ 可能重答）属人工面 M3（`build.md §4 U-2/§3.1`：`PD-NDA-016` + `⏳` 未执行），建议 validate 优先人验（见 I-6）。 | 低 |
| C13 | 异常判定闭集三情 | FR-NDA-070/071/075 · AC-NDA-009 · ADR-NDA-007 §① | ⚠️ | `abnormalVerdict`（`:100-105`）真值表：`accepted>0⇒null` / `llm-failed` / `stopped⇒null` / `blocked>0⇒all-blocked` / 否则 `no-tool-call`；`stopped` 分支存在且顺序正确。**语义边界**：`no-tool-call` 的 spec 字面（FR-070「回合正常结束但**无 `next` 工具调用**」）比实现窄 —— 实现按 `accepted=0 ∧ blocked=0` 判，**无法区分「未调用 next」与「调用 next 且 `candidates:[]`」**（`capture.captured` 未入 `AbnormalFacts`）⇒ 后者（合法「无建议」，恰是 `next` 工具 description 与 `NUDGE_TEXT` 明确指示的路径）会被判 `no-tool-call` 并呈现「配置新的 LLM（切换 / 重配）」（见 I-1）。触发结果本身与 EC-NDA-008「提醒用尽仍无合法候选 ⇒ 系统兜底」一致 ⇒ **非阻塞**。 | 中 |
| C14 | 系统兜底复用 op + 文案分相 | FR-NDA-072/073 · AC-NDA-009 · ADR-NDA-007 §③ | ✅ | `llm.abnormal`：`rule:'risk-recovery'`（压过 AI 建议）/ `priority:0` / `chips:['op.llm-config']` / 文案「配置新的 LLM（切换 / 重配）」；未配置文案「配置 LLM 凭据（写入本机 · 掩码）」；两文案相异且各自在场（AI-N-18 实读）。零新增 op（`ACT_TO_OP` 6 / `OP_IDS` 零新增）。 | — |
| C15 | 兜底必可达 + 不代答 consent | FR-NDA-074/076 · NFR-NDA-002/003/010 · EC-NDA-018/019 | ✅ | 异常 ctx ⇒ `when===true` ∧ chip `op.llm-config` 可达；已配置 ⇒ 终端恒常驻 ⇒ 卡必有可达 next（ND-11 异常相判据机核）；`opDescriptor('op.llm-config')` 恒 `confirm` ⇒ `pressDecision(..., AI_PRESS)` = `{ok:false, blocked:'tier'}`（AI 不代答）。 | — |
| C16 | 零第二阈值 / 零第二词表 | FR-NDA-075 · NFR-NDA-007/013 · AC-NDA-026 | ✅ | 三情字面量在 `src` 内恰一处（`definition.ts:110`，`grep -v definition.ts` 零命中；SW 亦不含 `'no-tool-call'`）；七集合逐字未变：`KIND_SET` 40 / `ACT_TO_OP` 6 / `REGISTERED_STRUCTURAL_HOSTS` `[]` / `BLOCKED_TERMINALS` 5 / `OPS_RECOVERY_PROVIDER_IDS`(+`OPS_RECOVERY_ROWS`) 2 / `RECOVERY_PROVIDER_IDS` 5 / `DRIVER_TERMINALS` 4 / `PROACTIVE_MOMENTS` 7 / `DRIVER_TIMINGS` 5 / `NEXT_SOURCE_NAMES` 7。 | — |
| C17 | 首开确定性 | FR-NDA-090~093 · AC-NDA-011 · EC-NDA-024 · ADR-NDA-202 §③ | ✅ | `maybeRecommendOpenEntry` / `firstRunCard` 未在改动集（R8-1~6 判据绿且语义零改）；首开入口体内零 provider/网络（S0PPPP-11 读数）；未配置首开由 C6 分相自动承接；`PD-NDA-001` 登记（`PD-ADN-001` 不转正）。 | — |
| C18 | S0'''' 支线 C/D/E 终态 | FR-NDA-100/103/104 · AC-NDA-001/019/032 | ✅ | `S0PPPP_LEAF2_STEPS`（`fixtures/s0-chain.mjs:951`）= `['S0PPPP-3','S0PPPP-4','S0PPPP-5','S0PPPP-7','S0PPPP-11']`；两叶并集（叶1 7 + 叶2 5）= 全十二拍（AI-N 断言机核）；Chromium 面只加断言（`CHROMIUM_GATES===9`，`:888/909/930` 三处断言）；人工面 M1~M6 `⏳ 未执行` 如实登记。 | — |
| C19 | X-NDA 台账终态 | FR-NDA-112/113/119/120/122/130~137 · AC-NDA-022/023 · ADR-NDA-202 §④ | ✅ | `xNdaLedger`=12 行（叶2 四行 X-NDA-3/4 `superseded`、X-NDA-10/11 `no-supersession`），八字段（id/status/old/new/reason/date/landing/counterCheck）**全齐**；`xNdaGateReconciliation`=25 行 `disposition` 齐（rewritten/equivalent-rewrite/upgraded/new/kept），**无「未处置」**；`xNdaLedgerFull` = 7 / 1（keep，9 子项）/ 4；25 行 `assertionsRemoved` **全 0**。 | — |
| C20 | NFR / EC 面 | NFR-NDA-004/008/011/015/016 · EC-NDA-012/013/022 | ✅ | `NUDGE_TEXT`/兜底文案为编译期常量、零明文；留痕只含字段名 + `blocked=` 码值；`recommendNextStep` 保持 pure（`recommend.ts` 零新导入 / 零触达 LLM）；提醒不触发 `driveAnsweredTurn`（护栏零改）⇒ 不抢回合、不破在飞硬门；主链零新 LLM，nudge = 唯一有界新增往返（≤1）。 | — |
| C21 | ADR 落地一致性 | ADR-NDA-005~009 · ADR-NDA-201/202 | ⚠️ | ADR-005 §①（`risk.llmBlocked` 分相 + 保留 `session.busy`）、006 §①②③⑤⑦（回调内续呼 / 有界 / 防环 / 失败进兜底）、007 §①③④（闭集 / provider / 面板只消费）、201 §②③（`abnormal?` 加法 + SW 单源 + 折进 risk）、202 §①②④⑤⑥（12→13 / 四处恰 N 不动 / 首开零改 / 保护段 keep / `KL-N-10`）**逐条与生产事实相符**。**文档瑕疵**：ADR-NDA-202 §③落地判据 #4 字面「`r8-open-next-entry.test.ts` 文件**零改**」，实际该文件 `fallbackProblems`（R8-8）被等价重锚（恒真→分相；`R8-1~6` 确零改）⇒ 措辞应精确为「R8-1~6 判据零改」（见 I-3）。 | 低 |
| C22 | 文件影响对齐 | plan §5 · ADR-NDA-201 §② | ✅ | 工作树改动集 = plan §5：1 NEW（`next-drive-policy.ts`）+ 4 MODIFY src（`definition.ts`/`providers.ts`/`service-worker.ts`/`sidepanel.ts`）+ 17 test/fixture + 2 台账 JSON；复核面 `chat-events.ts` / `cards/nextstep.ts` **均不在改动集**（`chat-events.ts` 只 `import type { AiNextPayload }`，加字段无需改）；无遗漏 / 无多余。（注：`ai-next.ts`/`host.ts`/`ref-context.ts`/`recommend.ts`/`insight-*`/`parity` 等改动属**叶1**，见 C23。） | — |
| C23 | 红线（基座/冻结面/保护段/载体/判定链） | FR-NDA-001~006/142 · NFR-NDA-005/007 · NG-NDA-005/007/008/019 | ✅ | `packages/web-cli-base/**`、`ROADMAP.md`、`.opencode/opencode.json`、`test/ui/journey.mjs`+`binding.mjs`、`turn-queue.ts`/`chat-runner.ts`/`ai-drive.ts`/`host-registry.ts`/`op-table.ts` 的 `git diff` **全为空**；`dist/sidepanel.js`=**606,652 B**、`dist/background.js`=**1,666,594 B**；`dist/content.js`=**177,076 B** sha `52a82620…`、`dist/pick-layer.js`=**34,358 B** sha `77796bab…`（与 build 双锚一致）；保护段 journey `[43484,59347)` 分段 sha = `7b309258…`、binding `[107780,115930)` = `be9ad0e9…`（**独立复算命中**）；`KIND_SET` 40 / `ACT_TO_OP` 6 / `REGISTERED_STRUCTURAL_HOSTS=[]` 亲验。 | — |
| C24 | 门禁等价重锚 + 体积 | FR-NDA-130~137/140~145 · AC-NDA-024/026/027/028 · ADR-NDA-008/202 | ✅ | `driver-quadruple` 两处 `13` ∧ 逐项同集（含幽灵行反证）；`next-registry` NR-10 两处 `13`（含第 13 行双向包含）；`free-input-next` FIN-11 分相块（双向反证 + 逐字节还原）；`AI-N-16~18`（判据表 15→18）；四处恰 N 不动（`blocked-terminals`/`driver-terminals`/`driver-timings`/`op-wiring` 零改）。体积复算：606,652 / `ceilTo50KB`=614,400（不变）/ 绝对上限 675,840（不变）/ 生效上限 `floor(606652×1.05)`=**636,984**（size-budget 重 pin）/ 距档 **7,748** / 两叶 Σ = 637+1,413 = **2,050**（与 `size-baseline.ts` 逐值一致）；`v4-density-baseline.json` = 606652 / 636984。 | — |
| C25 | 判据增量与存在性 | FR-NDA-082/100~106/130/131 · NFR-NDA-009 | ✅ | `AI-N-16`（有界：五条件 + 忽略 `nudgeUsed`/删 `hasReply`/置位后移三反证）/ `AI-N-17`（闭集：三情 + `stopped` 缺分支反证 + 总是附加反证 + 单源 + 面板零第二分类器）/ `AI-N-18`（兜底：chip 可达 + 两文案相异 + 不入三集合 + 不代答 + 删 provider/when 不读风险反证）；`FIN-11` 分相块；`R8-8` 重锚；`ND-11` ×3（未配置/异常/溯源）；`S0C-16` 叶2 五拍 ×4。旧判据（AI-N-1~15 / FIN-0~9 / R8-1~6）逐条保留。 | — |
| C26 | 双向反证真实性 | FR-NDA-105/106 · NFR-NDA-009 · R-NDA-911/912 | ✅ | 分相：`registerNextProvider(forged,{overwrite:true})` 注入恒真 / 恒假 ⇒ 各自必红 + **逐字节还原**（`free-input-next.test.ts:675-706`）；`r8` 分相退回恒真 ⇒ 必红（`r8:319-322`）；nudge：forged SW 后移置位 ⇒ 必红；异常：缺 `stopped` / 总是附加 ⇒ 必红；兜底：filter 删 provider / `when:()=>false` ⇒ 必红。反证打在**生产模块**（真源切片，零打桩）。 | — |
| C27 | 断言有效性（弱读数 / 三段控制） | FR-NDA-105/106 · NFR-NDA-009 · DC-NDA-014 | ⚠️ | 绝大多数读数为真源实跑；三段控制（`ok`/`violated`/`n/a`）逐态可达且 `n/a` 不冒充 `ok`。**弱读数**：`s0ppppReading().nudgeRounds = 1`（`ai-next-candidate.test.ts:1327`）为**硬编码常量**，`s0ppppProblems` 对其 `!== 1` 的检查**结构性不可 FAIL**；`unconfiguredZeroToken`（`:1337`）以「SW 源码含 `variant:'llm-unconfigured'`」为**代理**，非「零 token/零网络」的直接读数。实质保障位于 `AI-N-16`（forged SW 反证）与 `onboarding-deterministic` OD-5 ⇒ 见 I-5。 | 低 |
| C28 | `KL-N-10` flake 处置 + 人工面 | EC-NDA-025 · FR-NDA-136 · R-NDA-012 · AC-NDA-019/032 | ✅ | `build.md §1.4` 如实登记 `test:s0-self-driven` 100/3（3 项同根因：headless 沙箱 `probe.steady===false` ⇒ `probe.unsettled`（priority 0）抢槽），并说明**非本叶引入**（与叶1 同根因、基线对照）且 node 面确定性覆盖；未改判据、未伪造串行绿；人工面 M1~M6 `⏳` 如实。**≥2 次工作树独立复跑**留 validate。 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 5（C1~C5） | 4 | 1 | 0 | 80% |
| 规范符合性 | 15（C6~C20） | 13 | 2 | 0 | 87% |
| 架构一致性 | 4（C21~C24） | 3 | 1 | 0 | 75% |
| 测试质量 | 4（C25~C28） | 2 | 2 | 0 | 50% |
| **合计** | **28** | **22** | **6** | **0** | **78.6%** |

> 规范符合率（按 spec 定义满足、排除文档性瑕疵）= **100%**（15/15 FR/NFR/EC 组全部有对应实现，见 §6）。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无阻塞问题（0）** | — | — |

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-1 | `next-drive-policy.ts:100-105` + `service-worker.ts:1088` | **`abnormalVerdict` 无法区分「未调用 next」与「调用 next 且 `candidates:[]`」**：`capture.captured` 未入 `AbnormalFacts`，两者都落 `no-tool-call`。而 `candidates:[]` 恰是 `next` 工具 description（`next-tool.ts:88`）与 `NUDGE_TEXT` 第②句**明确指示**的合法「无建议」路径 ⇒ 健康 LLM 被呈现「配置新的 LLM（切换 / 重配）」。触发结果与 EC-NDA-008 一致（非阻塞），但 `no-tool-call` 的字面语义与 FR-070 定义（「无 `next` 工具调用」）出现偏差。 | C13 | 二选一：**(a)** 把 `captured` 纳入 `AbnormalFacts`，`captured ∧ accepted=0 ∧ blocked=0` ⇒ 返回 `null`（不推兜底，终端已保证零死端）；**(b)** 若维持合并语义，则在 ADR-NDA-007/201 与 spec FR-070 显式登记「captured-empty ⇒ 并入 no-tool-call」，并把判据文本从「无 next 工具调用」改精确。**建议 validate 优先核对本项的实际观感。** |
| I-2 | `plan.md §2.3` / `ADR-NDA-201 §③` | 命名漂移：`LLM_ABNORMAL_CODES` / `AiNextAbnormalCode`（计划 / ADR 局部）vs 实现与 `ADR-NDA-201 §①②` 的 `AI_ABNORMAL_CODES` / `AiAbnormalCode`。 | C5 | 统一为 `AI_ABNORMAL_CODES` / `AiAbnormalCode`（实现口径），修订 plan.md §2.3 与 ADR-NDA-201 §③。 |
| I-3 | `ADR-NDA-202 §③` 落地判据 #4 | 字面「`test/r8-open-next-entry.test.ts` **文件零改**」与实现不符（`fallbackProblems`/R8-8 被等价重锚）。 | C21 | 改为「`R8-1~6` 判据零改；R8-8 因分相等价重锚」（`R8-1~6` 确实逐字保留）。 |
| I-4 | `providers.ts:246` | `(ctx.session.busy === true \|\| ctx.session.busy === false)` 对布尔域**恒真**（空转合取），仅为满足 DQ-3 `evidence:['session.busy']` 同源而保留（ADR-NDA-005 §① 已显式裁决；非本叶引入）。 | C2 / C7 | 属「设计内」；后续若 DQ-3 抽取器可解析 `ctx.risk` 读面，可删除该空转合取以恢复判据约束力。本轮**无需改**。 |
| I-5 | `ai-next-candidate.test.ts:1327,1337` | 弱读数：`nudgeRounds = 1` 硬编码 ⇒ 其 `!== 1` 检查结构性不可 FAIL；`unconfiguredZeroToken` 为「源码含某字符串」的代理读数。 | C27 | 有界性/零 token 的强判据已在 AI-N-16（forged SW 反证）与 OD-5；建议将 `nudgeRounds` 改为从 `shouldNudge` 真值表 + SW 计数派生，或显式标注「结构性常量，非运行读数」。 |
| I-6 | nudge 触发的会话/回答语义 | nudge 续呼使用的消息面**不含首答**（基座尚未落首答），且基座提交的是**最终**（nudge）`res` ⇒ 首答既不上流也不入会话；若 nudge 轮仍为纯文本，用户看到的是「回应提醒」的那一版回答（可能重答）。属人工面 M3（`PD-NDA-016` 已登记时点偏差；`build.md §4 U-2`）。 | C12 | 建议 validate 优先人工验证「提醒是否让回答显得重复 / 首答是否被合理保留」，并据实登记；必要时评估把首答纳入 nudge 消息面。 |

## 6. 结论

**结论**: ⚠️ **有条件通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 78.6%（22/28；警告 6 均为判据语义 / 文档精度层面，非实现偏差） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0**（15 组 FR/NFR/EC 全部有对应实现；`no-tool-call` 边界见 I-1，属语义精度非功能缺失） |
| 可进入 validate | **是** |

**理由**：本叶是「兜底与判据叶」，其价值全在**可判性**。静态审查确认四条链均已落地且**可 FAIL**：分相双向反证（注入恒真 / 恒假 + 逐字节还原）、nudge 有界（五条件 + 置位先于续呼 + 忽略 `nudgeUsed` 必红）、异常闭集（三情真值表 + `stopped` 缺分支必红 + 面板零第二分类器）、系统兜底（chip 可达 + 两文案相异 + 删 provider 必红）。五类计数与 HEAD 基线逐一相同（零漂移），`assertionsRemoved = 0`（25 行机核），体积与冻结面/保护段量值**独立复算命中**。发现的 6 项改进均**不触及红线、不改变功能正确性**；其中 **I-1** 是唯一具有用户可见影响的语义边界（把合法「空 candidates」并入异常兜底），建议 validate 优先核对（并决定采 (a) 还是 (b)）。据此结论为 ⚠️ 有条件通过，可进入 validate 动手验证。

**证据边界（如实声明）**：本报告为**静态分析**，未运行 `npm test` / Chromium 门禁（`1525/0`、`law8 72/0`、`dead-end 56/0`、`recommendation 85/0`、`s0-self-driven 100/3` 等数值取自 `build.md`，**本轮未复跑**）；`nudge` 真实 LLM 观感 / `KL-N-10` 隔离复跑 / 人工面 M1~M6 属 validate 与人工验证职责。

## 7. 附：R1 静态复核证据清单（可机核）

| 证据 | 值 | 复核方式 |
|---|---|---|
| `dist/sidepanel.js` | 606,652 B | `ls -l`（= build 登记） |
| `dist/background.js` | 1,666,594 B | `ls -l`（= build 登记） |
| `dist/content.js` | 177,076 B / sha `52a82620…` | `sha256sum`（命中冻结锚） |
| `dist/pick-layer.js` | 34,358 B / sha `77796bab…` | `sha256sum`（命中冻结锚） |
| journey 保护段 `[43484,59347)` | sha `7b309258…` | 分段 `sha256` 独立复算（命中） |
| binding 保护段 `[107780,115930)` | sha `be9ad0e9…` | 分段 `sha256` 独立复算（命中） |
| `KIND_SET` | 40 | 正则解析 `messaging.ts` 独立计数 |
| `ACT_TO_OP` | 6 | 源读（`dispatch.ts:11-18`） |
| `REGISTERED_STRUCTURAL_HOSTS` | `[]` | 源读（`host-registry.ts:105`） |
| 计数漂移（`maybeRecommend(`/`nextAfterSettle`/`requestTurn(`/`runChatTurn(`/`providerChat(`） | HEAD ≡ 工作树 | `git show HEAD:` + `grep -c` 双向对照 |
| `xNdaLedger` / `xNdaGateReconciliation` / `xNdaLedgerFull` | 12 / 25 / 7-1-4 | JSON 结构化机核 + 字段完整性 + `assertionsRemoved` 全 0 |
| 体积三值同源 | 606652 / 614400 / 675840 / 636984 / 距档 7748 | 独立复算 + `size-budget.test.ts` pin 对照 |
| 基座/ROADMAP/opencode/保护段/判定链 diff | 空 | `git diff --stat` |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 全量静态审查：C1~C28 逐项；通过 22 / 警告 6 / 失败 0 / 阻塞 0；结论 ⚠️ 有条件通过；6 改进项 I-1~I-6；关键量值与保护段分段 sha 独立复算命中；`npm test` 等运行面数值取自 build 未复跑，留 validate） | 2026-09-27 | SDDU Review Agent |
