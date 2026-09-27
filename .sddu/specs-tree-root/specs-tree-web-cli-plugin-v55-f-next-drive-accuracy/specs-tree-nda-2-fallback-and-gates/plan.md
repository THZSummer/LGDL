# 技术计划：specs-tree-nda-2-fallback-and-gates（NDA-2 未配置确定性引导 + 自由输入分相 + 提醒补一次 + LLM 异常兜底链 + 首开边界 + 门禁/体积重锚：兜底与判据叶）

> **文档定位**: SDDU 技术方案（**叶级切片**）— 父 `plan.md`（v1.0）与父级 9 个 ADR 在**本叶**的落地设计；作为本叶 tasks 阶段的输入
> **前置依赖**: 父 `../spec.md` + `../plan.md` + `../ADR-NDA-001~009` + 本叶 `spec.md` + **叶1 `../specs-tree-nda-1-next-tool-channel/`（硬前置：工具通道 + `intercept` 捕获 + 5 道校验链接入 + 围栏块替换）** + F-35 / R8 产物（free-input / floor / 首开入口）
> **创建人**: SDDU Plan Agent
> **创建时间**: 2026-09-27
> **版本**: v1.0
> **更新人**: SDDU Plan Agent
> **更新时间**: 2026-09-27
> **更新说明**: 初始创建（本叶 = 末叶 / 兜底与判据叶：未配置 ⇒ 确定性「去配置 LLM」引导 + 自由输入分相（`configured` 单源）+ 提醒补一次（回调内续呼、有界防环）+ LLM 异常判定闭集 + 系统兜底 `llm.abnormal` provider + 首开保持确定性 + S0'''' 支线 C/D/E 终态 + 体积/门禁/X-NDA 台账终态。**叶内新增 2 个 ADR**（ADR-NDA-201 / 202）；**零改基座**；**零运行时验证**）

---

## 1. 前置检查

| 检查项 | 状态 |
|--------|:--:|
| 本叶 `spec.md` 存在 | ✅ 285 行（承载父 FR ≈42 条切片；交付 10 项；执行序 8 步） |
| 父 `spec.md` / `plan.md` / ADR-NDA-001~009 存在 | ✅ |
| **叶1 已完成（硬前置）** | ⏳ **本叶 plan 完成时叶1 尚未 build**（两叶串行：`nda-1 → nda-2`）⇒ 本叶 **tasks 起点必须在叶1 收口后**；本叶 plan 的接口假设逐条取自叶1 plan（工具名 / `captured` 语义 / 装配点 / 规则位） |
| 未配置底座可读 | ✅ `service-worker.ts:945-956`（零 token）+ `sidepanel.ts:4167-4194`（主动识别 + 悬置 + `noteLlmBlockedFact`）+ `providers.ts:52-61,131-141`（`OPS_RECOVERY_ROWS` / op-driven provider） |
| 分相判据可读 | ✅ `sidepanel.ts:1484-1486`（`observedBlocked` 唯一写入点）+ `:2059-2062`（折进 `risk`）；`providers.ts:49`（`LLM_BLOCKED_RISK`）、`:138`（既有消费） |
| 首开 / R8 判据可读 | ✅ `sidepanel.ts:2324-2330`（`maybeRecommendOpenEntry` 复用 `'idle'`）+ `test/r8-open-next-entry.test.ts` R8-1~6 |
| 异常面基线可读 | ✅ `runner.ts:27,99-119,188-195`（`RunOutcome` / `finish` / `llm-failed`）+ `service-worker.ts:1027-1043`（`onFinish` 忽略参数）+ `sidepanel.ts:4147-4152`（`error` → `maybeRecommend('idle')`） |
| 门禁成本已定位 | ✅ `driver-quadruple.test.ts:233-235`（恰 12）/ `next-registry.test.ts:264,315`（恰 12）⇒ **12→13**；`blocked-terminals.test.ts:259,342,384`（恰 2 / 恰 5 / 恰 5）**不动**（`COR-NDA-15`） |
| 外部 API 文档缓存 | ⚠️ 不适用（零外部服务 / 零新依赖） |

## 2. 架构分析（本叶）

### 2.1 本叶要证明的四件事

1. **两相可判、互不误伤**：未配置 ⇒ 无自由输入终端 ∧ `op.llm-config` 引导可达；已配置 ⇒ 终端恒常驻（R8 / F-35 不回归）—— 双向反证各能 FAIL；
2. **有界可达**：nudge **恰一次**（`nudgeUsed` 单布尔、纯函数判据），越限直接进系统兜底；防环（nudge 轮不再 nudge）；
3. **闭集可分相**：`no-tool-call` / `llm-failed` / `all-blocked` 三情 + 与 `llm.unconfigured` **不混同**（词表分相，两文案相异）；
4. **治理不失血**：体积（A 列从紧）+ 门禁计数只增 + X-NDA 台账终态 + 保护段 `keep`。

### 2.2 关键契约与数据流（本叶）

```
[A] 未配置相（既有链，本叶只做分相 + 不再显示终端）
  用户提交 → SW :945-956 isLlmConfigured 假 ⇒ variant:'llm-unconfigured'（零 token / 零网络 / 零工具面）
  → 面板 :4167-4194：detect 行 + 悬置 + noteLlmBlockedFact(false, ruled) + nextAfterSettle({kind:'answered'})
  → risk 含 'llmBlocked' → llm.unconfigured provider → chips:['op.llm-config']（op-direct chip）
  → 分相：free-input.when 为假 ⇒ 推荐卡**无** .next-terminal；floor 也**不**铸终端卡（不死端由引导 chip 保证）

[B] 已配置相 · 主线（叶1 建立）+ 提醒支线（本叶）
  回合内 chat 回调（每轮）：
    res = providerChat(...)
    ├─ 有 toolCalls（含 next）⇒ 叶1 intercept 捕获 ⇒ turnState.captured = true
    └─ 无 toolCalls ∧ configured ∧ !captured ∧ !nudgeUsed ∧ hasReply
        ⇒ nudgeUsed = true；res = providerChat([...turns, NUDGE_TEXT])   ★ 恰一次（同回合）
  回合结束 onFinish(outcome)：
    候选 = validateAiNext(turnState.lastCandidates, {refs})（叶1）
    verdict = abnormalVerdict({outcome, accepted, blocked})
    ⇒ chat-result{done, aiNext:{accepted, blocked, abnormal?}}

[C] 异常相 ⇒ 系统兜底
  面板消费 abnormal → noteLlmAbnormalFact → risk 含 'llmAbnormal'
  → provider llm.abnormal（rule:'risk-recovery'，priority:0）→ chips:['op.llm-config'] + 文案「配置新的 LLM（切换 / 重配）」
  → 已配置 ⇒ 终端恒常驻 ⇒ 卡必有可达 next（零死端）

[D] 首开相（保持确定性，本叶零改行为）
  maybeRecommendOpenEntry（复用 'idle'）→ 确定性路径（capability-discovery / 零死端 floor + 终端）
  让位 firstRun（零双卡）；零 LLM 往返依赖
```

### 2.3 组件与依赖（本叶）

| 组件 | 类型 | 说明 |
|---|:--:|---|
| `background/next-drive-policy.ts` | **NEW** | `shouldNudge` / `abnormalVerdict` / `NUDGE_TEXT` / `LLM_ABNORMAL_RISK`（纯函数；SW + node 门禁共用） |
| `ui/sidepanel/next-registry/definition.ts` | MODIFY | `AI_ABNORMAL_CODES` + `AiAbnormalCode` + `AiNextPayload.abnormal?`（type-only 单源） |
| `background/service-worker.ts` | MODIFY | `chat` 回调 nudge + `onFinish(outcome)` 消费 + `abnormal` 装配 + `configured` 单源提升 |
| `ui/sidepanel/next-registry/providers.ts` | MODIFY | `free-input.when` 分相 + `llm.abnormal` provider（第 13 行）+ `DRIVER_DECLS_SRC` 13 行 |
| `ui/sidepanel/sidepanel.ts` | MODIFY | `noteLlmAbnormalFact`（折进 `risk`）+ `consumeAiNext` 内消费 |
| `test/free-input-next.test.ts` / `driver-quadruple.test.ts` / `next-registry.test.ts` | 改写 / 重锚 | 分相判据 / 12→13 / 12→13 |
| `test/ui/{s0-self-driven.mjs,recommendation.mjs}` | MODIFY | 支线 C/D/E 终态 + 等价重锚（只加断言） |
| `docs/v4-supersession-ledger.json` / `test/supersession-ledger.test.ts` | MODIFY | `xNdaLedger*` 终态 + 保护段决策 |

## 3. 方案对比（本叶两个关键形态点）

> 父 plan §3.3~3.6 已给全局结论（nudge 通道 / 分相判据 / 兜底落点 / 体积）；本叶补两个**叶内**形态点。

### 3.1 闭集三情的判定落点

| 维度 | 方案 A：判定放面板（读 `error` 变体 + `aiNext.blocked`） | 方案 B：**判定放 SW，纯函数，面板只消费**（推荐） | 方案 C：判定放 `ai-next.ts`（与 5 道链同模块） |
|------|:--|:--|:--|
| 优点 | 面板已有 `error` / `done` 分支 | **B 列（不计账）**；`outcome` 在 SW 原生可得；node 可判；面板零第二分类器（N-NDA-022/NFR-NDA-013） | 与校验链同处，少一次传递 |
| 缺点 | 面板拿不到 `outcome`（`llm-failed` 不可辨）；A 列增量；**两处判定**（SW 装配 + 面板分类） | `onFinish` 需接收 `outcome`（签名改一处，既有忽略） | `ai-next.ts` 变成「校验 + 策略」双责；且 `abnormalVerdict` 与 nudge 判定分离 ⇒ 两份策略模块 |
| 风险 | 中高（R-NDA-915 双判） | 低 | 中 |
| 工作量 | 小 | 小 | 小 |

### 3.2 分相判据的读取面（叶内细化）

| 维度 | 方案 A：读 `ctx.risk.includes(LLM_BLOCKED_RISK)` | 方案 B：读新增 `ctx.session.configured` | 方案 C：读 `ctx.onboarding` |
|------|:--|:--|:--|
| 优点 | **零新源**；与修复 provider **同一事实**（`providers.ts:138` 同常量）；幂等 | 语义直白 | 零改动 |
| 缺点 | 派生读（须在 ADR 写明口径） | ❌ 破 7 源白名单 + 第二「是否配置」声明面 | ❌ 语义不等价（首装 ≠ 未配置） |
| 风险 | 低 | 中高 | 高（错判） |
| 工作量 | 极小 | 中 | 0 |

## 4. 本叶设计定案（父 ADR 的叶内落地）

| 项 | 定案 | 依据 |
|---|---|---|
| 分相判据 | `free-input.when = (ctx) => !ctx.risk.includes(LLM_BLOCKED_RISK) && (ctx.session.busy === true \|\| ctx.session.busy === false)`（**保留 `session.busy` 读向** ⇒ DQ-3 同源） | **ADR-NDA-005** |
| 未配置引导 | **零新增面**：复用 `llm.unconfigured` → `OPS_RECOVERY_ROWS` → `op.llm-config` op-direct chip（既有链逐字） | ADR-NDA-005 §② |
| nudge 通道 | SW `chat` 回调内续呼；`turnState.nudgeUsed`（恰一次）；nudge turn **不进会话** | **ADR-NDA-006** |
| nudge 判据 | `shouldNudge({configured, toolCalls, hasReply, captured, nudgeUsed})`（五条件，纯函数；`nudgeUsed` 首闸） | ADR-NDA-006 §② |
| 异常闭集 | `abnormalVerdict({outcome, accepted, blocked, captured})` ⇒ `null` / `llm-failed` / `all-blocked` / `no-tool-call`（`stopped` ⇒ null；**`captured`（调用过 next）∧ 空候选 ⇒ null**，R1 修复轮 I-1）；**SW 单源** | **ADR-NDA-007** / **ADR-NDA-201** |
| 承载 | `AiNextPayload.abnormal?`（加法可选子字段；缺席 ⇒ 现状逐字） | ADR-NDA-201 |
| 系统兜底 | 新 provider `llm.abnormal`（`rule:'risk-recovery'`，`priority:0`，`chips:['op.llm-config']`，文案「配置新的 LLM（切换 / 重配）」） | ADR-NDA-007 §③ |
| 面板 | `noteLlmAbnormalFact`（`observedAbnormal` → 折进 `risk`）；**只消费不判定** | ADR-NDA-007 §④ |
| 首开 | **零行为改动**（`maybeRecommendOpenEntry` / `firstRunCard` 不碰）；`PD-ADN-001` 不转正 ⇒ 登记 `PD-NDA-001` | ADR-NDA-202 §③ |
| 门禁 | `driver-quadruple` 12→13 / `next-registry` NR-10 12→13 / `free-input-next` 分相重锚 / `AI-N-15` 新增 | ADR-NDA-007 §⑤ / ADR-NDA-202 |
| 体积 | 叶2：**A 列 +0.6~1.4 KB**（分相 / 兜底 / 重锚）；**B 列 +1.9~3.6 KB**（不计账）；两叶 Σ 与 EC 三态终态 | **ADR-NDA-008 §②⑤** |
| 台账 | `xNdaLedger` 终态（X-NDA-3/4/10/11 + 全 12 条三态齐）+ `xNdaGateReconciliation` 25 行 + `xNdaLedgerFull` | **ADR-NDA-009 §①④** / ADR-NDA-202 §④ |

## 5. 文件影响分析（本叶）

### 5.1 源码

| 操作 | 文件 | 列 | 预算 | 说明 |
|:--:|---|:--:|--:|---|
| NEW | `packages/web-cli-plugin/src/background/next-drive-policy.ts` | B | +1.2~2.2 KB | `shouldNudge` / `abnormalVerdict` / `NUDGE_TEXT` / `LLM_ABNORMAL_RISK`（纯函数） |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/definition.ts` | A | +120~300 B | 闭集常量 + `AiAbnormalCode` + `AiNextPayload.abnormal?` |
| MODIFY | `packages/web-cli-plugin/src/background/service-worker.ts` | B | +700~1.4 KB | `configured` 提升为 const（`:945` 单源）+ `chat` 回调 nudge + `onFinish(outcome)` + `abnormal` 附加 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/next-registry/providers.ts` | A | +250~600 B | `free-input.when` 分相 + `llm.abnormal` 第 13 行 + `DRIVER_DECLS_SRC` 13 行 |
| MODIFY | `packages/web-cli-plugin/src/ui/sidepanel/sidepanel.ts` | A | +200~500 B | `noteLlmAbnormalFact` + `risk` 折叠 + `consumeAiNext` 消费（同一函数内） |
| 复核 | `packages/web-cli-plugin/src/background/chat-events.ts` | B | 0（预期） | 异常码走 `aiNext.abnormal` ⇒ 本文件零改（若改为独立字段 ⇒ 加法登记） |
| 复核 | `packages/web-cli-plugin/src/ui/sidepanel/cards/nextstep.ts` | A | 0（预期） | 兜底 chip / 终端渲染复用既有 |

### 5.2 测试 / 台账 / 文档

| 操作 | 文件 | 说明 |
|:--:|---|---|
| MODIFY | `packages/web-cli-plugin/test/free-input-next.test.ts` | 恒真 → `configured` 分相（两相各可判 + 双向反证；已配置相恒常驻保持） |
| MODIFY | `packages/web-cli-plugin/test/driver-quadruple.test.ts` | 12↔12 → **13↔13**（逐项同集 + 幽灵行必红）；`llm.abnormal` 声明行与 `when` 实读同源（DQ-3） |
| MODIFY | `packages/web-cli-plugin/test/next-registry.test.ts` | NR-10 声明行 12 → **13**（只增） |
| MODIFY | `packages/web-cli-plugin/test/ai-next-candidate.test.ts` | **AI-N-15**（`shouldNudge` 有界 + `abnormalVerdict` 三情 + 两文案相异 + 分相非恒真） |
| MODIFY（复核） | `test/driver-terminals.test.ts` / `blocked-terminals.test.ts` | **零改**（恰 4 / 恰 5 / 恰 2 / 恰 5 均未变） |
| MODIFY | `test/ui/s0-self-driven.mjs` + `fixtures/s0-chain.mjs` | 支线 C（提醒用尽 → 系统兜底）/ D（未配置确定性引导且无终端）/ E（首开确定性）终态断言 |
| MODIFY | `test/ui/recommendation.mjs` | 等价重锚（分相终端 / 兜底 chip） |
| MODIFY（复核） | `test/ui/no-dead-end.mjs` / `test/law8-plaintext.mjs` | 零死端**新增未配置相与异常相覆盖**（只增）；法八零降级 |
| MODIFY | `packages/web-cli-plugin/test/size-baseline.ts` | 叶2 收口重登记（五要素 + 三值 + `nda2Rows` + 两叶 Σ + EC-NDA-016 三态） |
| MODIFY | `packages/web-cli-plugin/test/gate-integrity.test.ts` | 下界只增；`CHROMIUM_GATES === 9` 不动 |
| MODIFY | `packages/web-cli-plugin/docs/v4-supersession-ledger.json` | `xNdaLedger` 终态 + `xNdaLedgerFull` + `xNdaGateReconciliation` 全 25 行 |
| MODIFY | `packages/web-cli-plugin/test/supersession-ledger.test.ts` | `xNdaLedger*` 判据（三态 + 未发生登记 + 非空理由）+ 保护段决策判据 |
| MODIFY | `.sddu/.../specs-tree-nda-2-fallback-and-gates/{plan.md,ADR-NDA-201,ADR-NDA-202,state.json,TREE.md}` | 本叶产物 |

## 6. 风险评估（本叶）

| 风险 | 概率 | 影响 | 缓解 |
|---|:--:|:--:|---|
| **R-NDA-003 / R-NDA-904**（分相误伤已配置 / 未配置被判成异常） | 中 | 高 | 分相单源（`risk.llmBlocked`）+ **双向反证**；`r8-open-next-entry` / `free-input-next` 必须绿；`abnormalVerdict` 的 `configured` 前置（未配置根本到不了 nudge / 异常相） |
| **R-NDA-002 / R-NDA-903**（nudge 无界 / 成环） | 中 | 高 | `shouldNudge` `nudgeUsed` 首闸 + 置位先于调用 + 每轮只求值一次 + 纯函数判据可 FAIL |
| **R-NDA-005 / R-NDA-908**（门禁重锚静默删断言） | 中 | 高 | 12→13 逐项同集 + 幽灵行反证；`free-input-next` 分相重锚保留 FIN-0~9（只增）；`assertionsRemoved = 0` |
| **R-NDA-010**（词表漂移） | 中 | 中 | 复用 `op.llm-config` + `opDescriptor`；**不新增** blocked terminal / op / kind；两文案相异判据 |
| **R-NDA-006 / R-NDA-906**（体积越档） | 中 | 中高 | A 列从紧（+0.6~1.4 KB）；两叶 Σ 与 2.8× 最坏核算；EC-NDA-016 三分支 + 作者一行 |
| **R-NDA-914**（12→13 静默放宽） | 中 | 中高 | 显式重锚 + 台账 + 反证「13 行含幽灵 ⇒ 必红」 |
| **R-NDA-915**（异常判定双判） | 中 | 中高 | 判定单源在 SW；面板只消费；反证「面板写第二判定 ⇒ 必红」 |
| **R-NDA-007**（计数漂移：`op-wiring` / `driver-timings`） | 低 | 中高 | ADR-NDA-006 的回调内 nudge ⇒ **零新增调用点**（X-NDA-11 = `no-supersession`）；若实测有漂移 ⇒ 只增 + 说明 |
| **R-NDA-011**（判据依赖真实 LLM） | 中 | 中 | `shouldNudge` / `abnormalVerdict` 纯函数可直接机核；注入反证 |
| **R-NDA-012**（`KL-N-10` flake） | 中 | 低—中 | 串行 + 隔离复跑 ≥2 + 如实记录不阻塞 |
| **R-NDA-013 / R-NDA-014**（方案先行） | 低 | 中高 | 父 §11 全部 `ruled`；本叶只落已裁决口径；`PD-NDA-016`（nudge 时点偏差）显式登记 |

## 7. 生成的 ADR

| ADR | 标题 | 状态 | 说明 |
|-----|------|:--:|------|
| ADR-NDA-005（父） | `configured` 单源判据与自由输入分相 | PROPOSED | 本叶落地：`when` 分相 + DQ 对账 |
| ADR-NDA-006（父） | 提醒补一次：`chat` 回调内续呼 + 有界 + 防环 + 零计数漂移 | PROPOSED | 本叶落地：nudge 接线 |
| ADR-NDA-007（父） | LLM 异常判定闭集 + 系统兜底 `llm.abnormal` provider | PROPOSED | 本叶落地：闭集 + provider + 文案分相 |
| ADR-NDA-008（父） | 体积分列预算与升档预案 | PROPOSED | 本叶：A 列从紧 + 两叶 Σ + EC 三态 |
| ADR-NDA-009（父） | 取代台账 / 零改基座 / 保护段 | PROPOSED | 本叶：台账终态 + 保护段 `keep` |
| **ADR-NDA-201**（叶） | 异常事实的承载与传输（`AiNextPayload.abnormal?` + SW 单源判定） | PROPOSED | 本叶新增 |
| **ADR-NDA-202**（叶） | 门禁计数等价重锚的具体数值与首开/保护段处置（含 12→13） | PROPOSED | 本叶新增 |

## 8. 交付物与执行序（供 tasks 参考，**非需求**）

**交付物**（= 本叶 `spec.md` §8.3 的 10 项）：① 未配置确定性引导（+ 零 token 保持）→ ② 自由输入分相（单源判据 + 两相断言 + 双向反证）→ ③ 提醒补一次（判定 + 续呼 + 有界 + 防环 + 计数重锚）→ ④ 异常判定闭集（三情）→ ⑤ 系统兜底推荐（`op.llm-config` + 文案分相 + 必可达 + 不代答）→ ⑥ 首开边界（保持确定性 + `PD-NDA-001` 登记）→ ⑦ S0'''' 支线 C/D/E 终态（Chromium 只加断言 + 人工面 `⏳`）→ ⑧ 门禁逐条等价重锚 + 保护段逐段决策 + 台账终态 → ⑨ 体积分列预算终态 + 逐叶重登记 + EC 路径 → ⑩ 本叶 plan/tasks/build/review/validate 产物。

**执行序（承父 §14.1「再收未配置 / 异常兜底与门禁口径」）**：

| 步 | 内容 | 出口 |
|:--:|---|---|
| 1 | **分相判据**（ADR-NDA-005）：`free-input.when` 分相 + DQ 对账 | 两相可判 + 双向反证 |
| 2 | **未配置引导**（零新增面；复核既有链可达） | `op.llm-config` 可达 + 零 token 不破 |
| 3 | **nudge**（ADR-NDA-006）：`next-drive-policy.ts` + `chat` 回调接线 | 恰一次 + 防环 + 计数零漂移 |
| 4 | **异常闭集 + 系统兜底**（ADR-NDA-007/201）：`abnormalVerdict` + `abnormal` 字段 + `llm.abnormal` provider + 面板消费 | 三情真值表 + 兜底 chip 可达 |
| 5 | **首开复核**（零改动确认 + `PD-NDA-001` 登记） | R8-1~6 绿 + 零双卡 |
| 6 | **S0'''' 支线 C/D/E 终态 + 人工面** | 双面可判 + `⏳` 如实 |
| 7 | **门禁重锚 + 保护段 + 台账终态**（ADR-NDA-202） | 12→13 重锚；`assertionsRemoved = 0`；保护段双绿 |
| 8 | **体积终态 + 逐叶重登记** | 五要素 + 三值 + 两叶 Σ + EC 三态 |

> **步序纪律**：第 3 步（nudge）先落 **B 列**（`next-drive-policy.ts`）；第 4 步的 provider 是本叶唯一 A 列主体增长点 ⇒ 落完立即实测，再进第 7 步的门禁重锚（避免「先重锚后超档」）。

## 9. 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（NDA-2 叶技术方案）：前置检查（含**叶1 硬前置**）+ 本叶四件待证事项 + 四相数据流（未配置 / 已配置+提醒 / 异常兜底 / 首开）+ 组件依赖表 + 2 组叶内方案对比（闭集判定落点 / 分相读取面）+ 父 ADR 的叶内定案表 + 文件影响（A/B 列 + 预算）+ 叶内风险 11 条 + 7 个相关 ADR（父 5 + 叶 2）+ 8 步执行序（**B 列先行**）。**零运行时验证**；routing.v1 = `local_or_compute → none`。 | 2026-09-27 | SDDU Plan Agent |
