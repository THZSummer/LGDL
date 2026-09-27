# 审查报告：specs-tree-nda-1-next-tool-channel（审查执行报告）

> **文档定位**: SDDU 审查报告 — 逐项记录自主审查的执行结果，作为 validate 阶段的输入
> **审查策略**: `review.md`（v1.0，C1~C28 审查清单 + 四维度指引）
> **前置依赖**: `review.md`（v1.0）、叶 `spec.md`（v1.0）、`plan.md`（v1.0 + ADR-NDA-101/102）、`build.md`（v1.0）
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

**审查方式**：静态分析（读代码 / 对比规范 / 切片哈希 / 真源复算 / 源码 grep）。**不跑测试、不调接口、不测性能**（那属 validate）。

**结论摘要**：**⚠️ 有条件通过**（0 阻塞 / 4 改进项）。生产实现层面未发现规范偏差：`admitCandidate` 与 `onToolDone` 函数体 **sha256 逐字节相同**；围栏块五符号在 `src/**` **零命中**；`enum` 独立复算 = `OP_IDS` − `gesture` = **7** 枚；`KIND_SET`=40 亲验；冻结面 sha 双重命中；基座零 diff。发现 4 处**不影响生产正确性但削弱判据强度/文档准确性**的改进项，其中 **I-1（law8 ⑫ 运行面判据空转 + 机制陈述错误）** 建议 validate 优先复核。

## 2. 逐项审查结果（C1~C28）

| # | 审查对象 | 审查基准 | 评估 | 发现 | 严重程度 |
|---|---------|---------|:--:|------|:--:|
| C1 | `tools/next-tool.ts` 模块质量 | FR-NDA-010~014 · ADR-NDA-001 §① | ✅ | 单源声明齐备（`NEXT_TOOL_NAME`/`MAX_CANDIDATES`/`SCHEMA`/`DESCRIPTION`/`ALLOWED_OP_IDS`/`ACK`）；零 `chrome`/DOM/IO/时钟；`executor` fail-closed（`ok:false` + 可读文案）；与 `src/tools/*-tools.ts` 惯例一致；模块头逐条登记「软约束 vs 权威」。 | — |
| C2 | `ai-next.ts` 解析/校验分层 | FR-NDA-022/030 · ADR-NDA-101 §① | ✅ | 三段职责分明（解析 `:75-87` / 单条判定 `:128-166` / 批量 `:176-185`）；五层筛法与旧 `parseAiNextItems` 逐层等价；解析/校验**不抛**；`Object.freeze` 防外层篡改。 | — |
| C3 | `service-worker.ts` 接线质量 | FR-NDA-021~028 · ADR-NDA-002/102 | ✅ | `capture` 与 `toolStartedAt`/`lastTool` 同居事件作用域（`:985`）；`intercept` 闭包单处（`:1066-1070`）；装配点 `:1047-1054` 解析 → 校验 → `slice(≤3)` 三步分明；`onToolDone` **函数体 sha256 与 HEAD 逐字节相同**（`20c6b7d8…`）。 | — |
| C4 | `providers.ts` / `recommend.ts` 改动质量 | FR-NDA-042/114 · ADR-NDA-003 | ⚠️ | 改动最小且语义集中；但 `providers.ts:88` 注释「the 5 `NEXTSTEP_PRIORITY` rules」与数组仅 4 项（`risk-recovery` 不在其内）计数口径不一致（沿用旧注释模式），易被误读为「规则表=该数组」。 | 低 |
| C5 | `next` 工具注册 + schema 单源 | FR-NDA-010~014 · AC-NDA-002 | ✅ | `enum` 独立 re-derive（`OP_IDS` 9 − `gesture` 2 = **7**）与 `NEXT_TOOL_ALLOWED_OP_IDS` 逐项相同；`params:{type:'string'}` 与运行时 `AiNextCandidate.params: string` 同构（plan `COR-NDA-7` 对 spec `{type:'object'}` 的订正**已在 plan 登记**）；`maxItems=3`；`description` 含四约束句且零标记；`listed:false`；注册点 `host.ts:342`（always-registered 段）。 | — |
| C6 | schema 软约束、运行时 5 道链权威 | FR-NDA-012/027 · R-NDA-901 | ✅ | 模块头显式声明「schema 是软约束，`admitCandidate` 是权威」；`admitCandidate` 对 schema 允许范围内、但 param 与该 op `ask` 不相容者 ⇒ `blocked='param'`（schema 不校验此语义）。 | — |
| C7 | 触发无条件 + 未配置不下发 + 时机恰 5 | FR-NDA-015/018/040/041/043 | ✅ | 注册不经任何 refs 条件（`host.ts:342`）；`ai-next.when` 在 diff 中**零命中**（逐字保留）；`DRIVER_TIMINGS` 恰 5（`idle` 复用）；未配置 ⇒ SW `:944-956` 在 `providerChat` 之前 early-return（`deriveTools()` 仅在 `:998` 之后可达）⇒ 结构性成立。 | — |
| C8 | 零新增载体 / 载荷只增不改 | FR-NDA-016/019 · EC-NDA-017 | ✅ | `messaging.ts` / `cards-shared` / `host-registry` 均**不在改动集**；`KIND_SET` 独立计数 = **40**；`ACT_TO_OP` 6 行；`hasAiNext` 仅在有 accepted/blocked 时附加 `aiNext`（缺席 ⇒ 现状逐字）。 | — |
| C9 | `parity` 新 `pluginExtra` | FR-NDA-020/117 · AC-NDA-016 | ✅ | `waivers.json#pluginExtras['next']` 的 `reason`/`basis` 非空；旧条目逐行逐字保留（diff 仅追加一行 + 上一行补逗号）；`baseline-catalog.json` 零改；`parity.test.ts` 双向约束（`names.includes('next')` ⇒ 反向机核 `next ∈ deriveTools()`）。 | — |
| C10 | `hooks.intercept` 捕获 + 合成 `ToolResult` + 短路 dispatch | FR-NDA-021~024 · AC-NDA-003 | ✅ | 基座契约只读复核：`runner.ts:162` `result = intercepted ?? (await options.dispatch(tc))` ⇒ 返回非 `null` **必然短路**；实现返回 `{ ok:true, output:NEXT_TOOL_ACK }`（常量、零回显）；位置在 SW（B 列）。**永久回归门禁缺失**见 C25 / I-3。 | — |
| C11 | `rawArguments` 严格 JSON + 失败=未产出不抛 | FR-NDA-022 · EC-NDA-015 | ✅ | 五层：非串/空 ⇒ `[]`；`JSON.parse` 失败 ⇒ `[]`（catch 不抛）；顶层非对象/数组/`null` ⇒ `[]`；`candidates` 非数组 ⇒ `[]`；项非对象 ⇒ 丢弃。与 `validateAiNext` 空数组 ⇒ `{accepted:[],blocked:[]}`（不写 `blocked`，与旧支线 C 口径一致）。 | — |
| C12 | 多次调用取最后一次 + `≤3` 在装配层 | FR-NDA-025 · EC-NDA-014 | ✅ | `captureNextCall` 返回仅取决于本次 `raw`（覆盖式，非并集）；截断 `verdict.accepted.slice(0, NEXT_TOOL_MAX_CANDIDATES)` 在 `service-worker.ts:1050-1053`（不在解析层，单责）。 | — |
| C13 | 5 道校验链整体保留（顺序即优先级） | FR-NDA-030~036 · ADR-NDA-004 §① | ✅ | `admitCandidate` **函数体切片 sha256 HEAD vs 工作树完全相同**（`a9a67eb2…`）；顺序①→⑤不可交换；未知 op 短路（不对未知 op 续判 ref）。 | — |
| C14 | 判定分层保持 | FR-NDA-033/036 · NFR-NDA-014 | ✅ | `confirm` ⇒ `admitCandidate.ok=true` ∧ `pressDecision` ⇒ `blocked='tier'`；`gesture` ⇒ `admit=false`；`pressDecision` / `ai-drive.ts` **不在改动集**（diff=0 结构性成立）。 | — |
| C15 | 留痕三要素 + 零明文 | FR-NDA-028 · NFR-NDA-016 | ✅ | `DRIVER_DECLS_SRC` 逐字未改（diff 零命中）；`evidence=['session.aiNext']` 与 provider `when`-scope 同源；`blocked=` 只含码值。**注**：与父 FR-NDA-028 字面「工具参数字段名」有措辞差异（叶 plan 已定案「逐字保留」）→ 见 O-2。 | — |
| C16 | 围栏块通道替换 | FR-NDA-080~083/121 · EC-NDA-020 | ✅ | `NEXT_CONTRACT_GUIDANCE` / `AI_NEXT_FENCE_INFO` / `FENCE` / `lastNextFenceBody` / `parseAiNextItems` / `AI_NEXT_FENCE` 在 `src/**` **全部零命中**（函数级删除）；`refContextSegment` 仅拼 `REF_SCOPE_GUIDANCE`，无引用 ⇒ `''` 逐字。 | — |
| C17 | `ai-led` 规则位等价重锚 | FR-NDA-042/114 · NFR-NDA-013 | ✅ | `NEXTSTEP_PRIORITY = ['risk-recovery','ai-led','ref-action','onboarding','capability-discovery']`（恰 5，`ai-led` 索引 1 < `ref-action` 索引 2 ⇒ 有引用时 AI 仍优先；`risk-recovery` 仍索引 0）；卡片优先级由 `priorityOf`（规则表位置）派生，provider `priority 2→1` 仅影响 `resolveOrder` 遍历序（`ai-led` 组内仅 1 个 provider ⇒ 行为惰性）。 | — |
| C18 | 无死端 | FR-NDA-044/045 · EC-NDA-001~006/019 | ✅ | `ai-next.when` 要求 `aiNext.length>0` ⇒ 零接受（全被拦/未产出）时 provider 关闭 ⇒ 确定性 `ref-action` / `risk-recovery` 接管；零候选 ⇒ 终端恒在（floor）。 | — |
| C19 | 特权恒 `gesture` + AI 不代答 consent | NFR-NDA-002/003 · EC-NDA-002/003/018 | ✅ | `enum` **不含** `gesture` 档（比 spec 字面更强的 fail-closed）；运行时 `tier` 恒拒；`confirm` 可提案不可按下；`pressDecision` 零改动。 | — |
| C20 | 法八四面零明文（含工具参数/description/留痕） | NFR-NDA-004 · EC-NDA-022 | ⚠️ | 生产面零明文成立（`description` 无 `< > \`` / 无 URL query / 无密钥形；`NEXT_TOOL_ACK` 为常量零回显；留痕只含字段名）。但 law8 **★ NDA-1 ⑫ 运行面**判据与注释不符：文案称「哨兵形 label 被第 5 道链丢弃」，实际 `window.__v3.testing.aiNext` **绕过 5 道链**且该分支因 `NEXTSTEP_MIN_INTERVAL_MS`（`lastProducedAt` 未复位）**被 anti-flicker 短路**，故 `label()` 从未被调用 ⇒ 该面**空转通过**；若短路消失则会**抛错**（`label()` 对密钥形 fail-closed）导致门禁崩溃而非判红。 | 中 |
| C21 | ADR/文件影响对齐 | ADR-NDA-001/004 · plan §5 | ✅ | 1 NEW（`src/tools/next-tool.ts`）+ 6 MODIFY src + 18 test/台账/文档，与 plan §5 逐行一致；无多余/遗漏文件；方案 B（独立 tools 模块 / 改签名 + 上游解析分离）按定案落地。 | — |
| C22 | ADR-NDA-101 / 102 落地 | ADR-NDA-101/102 | ⚠️ | `rawArguments` 唯一输入面（`tc.args` 在 `ai-next.ts` / intercept 体零命中）✅；`onCommandLine`/`onToolOutput` 早退锚点存在 ✅；`onToolDone` 逐字 ✅。**但** ADR-NDA-102 §① 的判据理由不准确：`next` **已注册** ⇒ `deriveCommand` 返回 `'next'`（前缀）而非「未注册返回 `null` ⇒ 回落 `tc.name`」；且 `text === NEXT_TOOL_NAME` 对「模型附带 `subcommand`/`args`」不鲁棒（该情形 `commandText` 变 `next …` ⇒ 过滤失效）。结论（判据稳定）不变。 | 低 |
| C23 | 红线（基座/冻结面/保护段/判定链/ROADMAP） | FR-NDA-001~006/142 · NFR-NDA-005 | ✅ | `packages/web-cli-base/**` 零 diff；`dist/content.js` = **177,076 B** sha **`52a82620…`**；`dist/pick-layer.js` = **34,358 B** sha **`77796bab…`**（均与 `build.md` 双锚一致）；`journey.mjs` / `binding` 保护段不在改动集；`policy.ts` / `auto-authorize.ts` / `manifest.json` 零 diff；`.sddu` 外零触碰（ROADMAP 零 diff）；`dist/sidepanel.js` = **605,239 B**、`dist/background.js` = **1,644,437 B** 与登记一致。 | — |
| C24 | 门禁改写 / 台账 / 体积 | FR-NDA-082/116/130~145 · ADR-NDA-008/009 | ⚠️ | 判据只增：`JUDGEMENTS` 11→**14**（旧 11 id 逐字保留）；`gate-integrity` 纯追加元门禁（`EXPECTED_AUDITED_FILES===48` ∧ `CHROMIUM_GATES===9` ∧ 判据行 ≥14 + 反证）；`recommendation-sources` ③ 恰 4→5 并**新增**反向判据；体积 A 列 `459+178=637` 与 `SIDEPANEL_BASELINE_BYTES=605,239` / ceiling `635,500` 复算一致；`xNdaLedger` 8 行五要素齐、`xNdaGateReconciliation` 12 行三态齐 + 悬空 gate 必红。**但** NDA-1 段对账行**未携带/未机核 `assertionsRemoved` 字段**（X-ADN / X-IIAN 同构段均有该字段与「`removed≠0` ⇒ 必红」反证）⇒ 父 FR-NDA-082/116 的 `assertionsRemoved = 0` 在本叶**无机器强制**。 | 中 |
| C25 | 测试存在性与判据增量 | FR-NDA-082/100~106/130/131 | ⚠️ | 门禁文件存在且**判据表只增**；测试块 16→25（旧测试名全部保留并按新机制扩展）；四类/五类注入反证族齐备；三段控制（`ok`/`violated`/`n/a`）逐态可达且 `n/a` 不冒充 `ok`；真源切片（生产模块实跑，零桩）。**但** FR-NDA-021/023 的**最高风险事实**（命中 `next` ⇒ 返回合成 `ToolResult` ⇒ dispatch 永不发生）**无永久回归门禁**：AI-N-13/14 的源切片只判「早退存在 / 走 `rawArguments` / `tc.args` 零使用」，不判 intercept 返回形状与短路效果；证据仅来自已删除的 SG-NDA-01 一次性 spike + 基座契约定性复核。 | 中 |
| C26 | S0'''' node 面 + Chromium 面 | FR-NDA-100~103/105/106 · AC-NDA-001 | ✅ | 样本/判据**单源**（`test/ui/fixtures/s0-chain.mjs#S0PPPP_*`，node 与 Chromium 两面共用同一 import）；node 面 12 环节 / 12 必判项 + 四类非法注入 + `s0ppppProblems` 可判；Chromium 面**只加断言不加文件**（`CHROMIUM_GATES===9` 不动）；叶2 步骤如实记 `n/a`。 | — |
| C27 | 断言有效性（非恒真 / 无弱判据） | FR-NDA-105/106 · R-NDA-911/912 | ⚠️ | 绝大多数判据带独立反证（注入 ⇒ 必红）；但抽检到两处**弱/空转**：(a) law8 ⑫ 运行面（见 C20）；(b) `s0ppppReading` 的 `unconditional` 与 `unconfiguredToolSent` 为**常量**（`createNextToolEntry().name === NEXT_TOOL_NAME` / 硬编码 `false`），不对生产路径取数 ⇒ 该两条读数不可 FAIL（实质保障位于 `parity.test.ts` 与 SW early-return 结构，见 O-1）。 | 中 |
| C28 | `KL-N-10` flake 处置 | EC-NDA-025 · FR-NDA-136 · R-NDA-012 | ✅ | `build.md §4.1` 如实登记 `test:s0-self-driven` 95/98（3 项同根因：headless 沙箱 `probe.steady===false` ⇒ `risk-recovery`（priority 1）抢 `ai-led`（priority 2）槽）；并以 `git stash` 到本叶前 HEAD 复跑得 91/2、同两项同形态失败 ⇒ 归因「既有环境 flake、非本叶引入」；未改判据、未阻塞。静态复核支持该归因（`ai-led` 占据 F-36 `ref-action` 原有的 priority-2 位次）。**≥2 次工作树独立复跑**留 validate（见 O-4）。 | — |

## 3. 审查维度汇总

| 审查维度 | 审查项数 | 通过 | 警告 | 失败 | 通过率 |
|---------|:--:|:--:|:--:|:--:|:--:|
| 代码质量 | 4（C1~C4） | 3 | 1 | 0 | 75% |
| 规范符合性 | 16（C5~C20） | 15 | 1 | 0 | 94% |
| 架构一致性 | 4（C21~C24） | 3 | 1 | 0 | 75% |
| 测试质量 | 4（C25~C28） | 2 | 2 | 0 | 50% |
| **合计** | **28** | **22** | **6** | **0** | **79%** |

> 规范符合性偏差 = **0**（C20 的 ⚠️ 属**门禁判据**（测试面）缺陷，不构成生产实现偏离 spec；C4/C22/C24 的 ⚠️ 分别属文档口径 / ADR 陈述 / 台账机核强度）。

## 4. 阻塞问题

| # | 位置 | 问题 | 对应 Cx | 修复建议 |
|---|------|------|:--:|---------|
| — | — | **无**（0 个） | — | — |

> 说明：C20 / C25 / C27 的缺陷均为**判据强度**问题而非生产行为问题；对应安全属性另有覆盖（`label()` 对密钥形的 fail-closed 抛出、`admitCandidate` 第 ⑤ 道链 + AI-N-6 注入判据、基座 `runner.ts` 缝契约 + 机核零改），故不计入阻塞。

## 5. 改进建议

| # | 位置 | 问题 | 对应 Cx | 建议 |
|---|------|------|:--:|------|
| I-1 | `test/ui/law8-plaintext.mjs:650-679`（law8 ★ NDA-1 ⑫ 运行面） | **判据空转 + 机制陈述错误 + 潜在崩溃**：`testing.aiNext` **绕过 5 道链**；调用点紧接上一单元（未 `reset()`）⇒ `recommendNextStep` 被 `NEXTSTEP_MIN_INTERVAL_MS`（`lastProducedAt`）短路 ⇒ `label()` 从未执行 ⇒ 「三面零哨兵」恒真。若短路消失，密钥形 label 会触发 `label()` 抛错 ⇒ `evaluate` 抛 ⇒ 门禁**崩溃**（`main().catch` ⇒ exit 1）而非判红。 | C20 / C27 | 三选一并登记理由：(a) 若坚持 Chromium 运行面 ⇒ 前置 `window.__v3.testing.reset()` 并**改走真实 SW 路径**（`chat-result{done}` + 工具捕获），此时须预期「第 5 道链丢弃」由 **node 面**证明；(b) 删除该运行面，改为纯静态（`NEXT_TOOL_DESCRIPTION` / `NEXT_TOOL_ACK` 零明文）+ 保留 node 面 AI-N-6；(c) 保留但**显式登记为「静态面 + 直驱 node 面」**，注释中删除「由第 5 道链丢弃」的错误机制描述。 |
| I-2 | `test/supersession-ledger.test.ts:3432-3520` + `docs/v4-supersession-ledger.json#xNdaGateReconciliation` | NDA-1 段对账行**无 `assertionsRemoved` 字段**、`xNdaReconProblems` 也**不判**该值 ⇒ 父 FR-NDA-082/116 的「`assertionsRemoved = 0`（断言零删除零降级）」在本叶无机器强制（X-ADN / X-IIAN 同构段均有字段 + 「`removed≠0` ⇒ 必红」反证）。 | C24 | 在 `XNdaReconRow` 增 `assertionsRemoved: number`，`xNdaReconProblems` 增 `!== 0 ⇒ problems.push`，并补一条注入反证（`rows.map(r => ({...r, assertionsRemoved: 1}))` ⇒ 必红）；台账 12 行逐行补该字段（全 0）。 |
| I-3 | `src/background/service-worker.ts:1066-1070`（intercept 命中路径） | **最高风险事实无永久回归门禁**：FR-NDA-021/023（命中 ⇒ 合成 `ToolResult` ⇒ dispatch 永不发生 / R-NDA-905「不得成为第二产出内核」）目前只由已删除的 SG-NDA-01 spike + 基座契约只读复核支撑；AI-N-13/14 的源切片不判返回形状。 | C25 / C10 | 在 `ai-next-candidate.test.ts` 增一条源切片判据（新增 AI-N-15 或并入 AI-N-13）：`blockAfter(swSrc,'intercept: (tc) =>')` 必须含 `return { ok: true, output: NEXT_TOOL_ACK }`（命中路径）且**在命中分支不得 `return null`**；反证：把返回改为 `null` / 改为 `{ok:false}` ⇒ 必红。（可选更强：以 `createWebCliHost` + `runChatTurn` 注入同一 hook 形状做最小集成断言。） |
| I-4 | `ADR-NDA-102 §①` / `src/background/service-worker.ts:1018` / `providers.ts:88` | 三处**文档/判据稳健性**（低）：① ADR-NDA-102 §① 判据理由不准确（`next` 已注册 ⇒ `deriveCommand` 返回 `'next'`，非「未注册 ⇒ 回落 `tc.name`」）；② `text === NEXT_TOOL_NAME` 对模型附带 `subcommand`/`args` 不鲁棒（应 `text === NEXT_TOOL_NAME \|\| text.startsWith(NEXT_TOOL_NAME + ' ')`，或改以 `lastTool` 身份判，与 `onToolOutput` 口径对齐）；③ `RULE_PROVIDER_IDS` 注释「the 5 `NEXTSTEP_PRIORITY` rules」与数组 4 项不一致。 | C4 / C22 | 逐处订正注释/判据（不改行为）：修正 ADR §① 的机制描述；为 `onCommandLine` 过滤补「附带 subcommand/args」的鲁棒判据并加反证；`RULE_PROVIDER_IDS` 注释改为「规则表 5 项中的 4 个注册表 provider id（`risk-recovery` 为插件级规则，不在注册表规则组内）」。 |

## 6. 观察项（不构成改进项；转 validate / 叶2 / 作者）

| # | 项 | 说明 |
|:-:|---|---|
| O-1 | `S0''''-2` 的两条读数为常量 | `unconditional`（`createNextToolEntry().name === NEXT_TOOL_NAME`）与 `unconfiguredToolSent=false` 均为常量，不能 FAIL；实质保障分别位于 `parity.test.ts`（`pluginExtras` 反向要求 `next ∈ deriveTools()`）与 SW `:944-956` early-return 结构。FR-NDA-018 的**终态**断言属叶2（S0''''-4）。 |
| O-2 | `evidence=session.aiNext` vs 父 FR-NDA-028 字面 | 父 FR 写「`evidence=<工具参数字段名>`」，实现为 `session.aiNext`（叶 plan §4 定案「`DRIVER_DECLS_SRC['ai-next']` 逐字保留」；叶 spec 口径为「与工具同源」）。建议作者/叶2 确认口径或登记为 PD。 |
| O-3 | `next` 调用后多一轮 agent step 的助手文本会上流 | 工具调用使基座多跑一轮（同回合内），该轮 assistant 文本经 `onAssistantText` 发面板；ADR-NDA-102 只过滤 `command`/`tool`，未覆盖此面。可能产生一条额外助手气泡（或 `empty` 结算）。validate 应在真实面板观察是否出现该可见面。 |
| O-4 | `KL-N-10` 的「≥2 次独立复跑」 | `build.md §4.1` 做了 1 次 `git stash` 基线对照；validate 需按 `KL-N-10` 对本叶工作树再做 **≥2 次**独立隔离复跑并如实记录（3 项失败中含本叶新增的 S0C-15 主线 A 断言，同根因）。 |
| O-5 | `authorConfirmation` 仍 `pending-author-line` | 与 `build.md §4.3 U-3` 一致；不得伪称已确认。 |
| O-6 | `U-4`：A 列实测 +637 B 略超 `ADR-NDA-008 §②` 叶1 估（+0.1~0.5 KB，实测 +0.62 KB） | 已如实登记，未跨档位（距档 9,161 B），不搬列规避 ⇒ 符合 ADR-NDA-008 §③ 纪律。 |

## 7. 结论

**结论**: ⚠️ **有条件通过**

| 指标 | 结果 |
|------|------|
| 审查通过率 | 22 / 28 = **79%**（警告 6 / 失败 0） |
| 阻塞问题数 | **0** |
| 规范符合性偏差 | **0 项**（生产实现逐项对齐 spec/plan；`admitCandidate` 与 `onToolDone` 切片哈希逐字节相同） |
| 可进入 validate | **是**（建议优先复核 I-1，并在 S0'''' 支线断言上按 O-4 做 ≥2 次独立复跑） |

**理由**：
1. **换轨是真换轨**：`next` 工具进入 `deriveTools()`（`host.ts:342`，`parity.test.ts` 反向机核）⇒ `hooks.intercept` 命中即返回合成 `ToolResult` ⇒ 基座 `runner.ts:162` 的 `intercepted ?? dispatch` 保证 **dispatch 永不发生**；围栏块五符号与 `NEXT_CONTRACT_GUIDANCE` 在 `src/**` **结构性零命中**（单一产出通道，非「不调用」）。**零改基座**（`web-cli-base/**` 零 diff）。
2. **换机制 ≠ 换安全闸**：`admitCandidate` 函数体 **sha256 逐字节相同**；5 道链顺序、`gesture` 恒拒、`confirm` 可提案不可按下、`pressDecision` diff=0 全部保持；`enum` 更以「不含 `gesture` 档」实现比 spec 字面**更强**的 fail-closed。
3. **可判事实**：触发无条件（注册无条件 + `when` 逐字不读 refs + 未配置结构性 early-return）；`ai-led` 独立规则位与 F-36 `prepend` **行为等价**（索引 1 < 2；`risk-recovery` 仍最高）；红线（零改基座 / 冻结面双锚 / 保护段 / `KIND_SET` 40 / 零新 kind 零宿主 / 法八）逐条亲验通过。
4. **4 项改进均不影响生产正确性**，但其中 I-1（law8 ⑫ 空转 + 机制陈述错误 + 潜在崩溃）与 I-2（`assertionsRemoved = 0` 未机核）直接影响「判据强度/可审计性」，建议在 validate 前或与 validate 并行修复；I-3（intercept 短路无永久门禁）建议在本叶或叶2 补判据。

## 8. R1 修复轮记录（sddu-build，保留 `reviewed` 相位，未推进 validate）

> **范围纪律**：改动仅落在 `packages/web-cli-plugin/test/**` 与叶 `.sddu/**`（+ `docs/v4-supersession-ledger.json`）；生产 `src/**` **仅 1 处注释订正**（I-4，零行为 / 零输出字节）。红线逐条复验：零改基座 / 冻结面逐字节 / 保护段 / 零新 kind 零宿主 / **测试只增不减**（`JUDGEMENTS` 14→15、law8 判据 67→69、`npm test` 断言 1516→1517，零删除）。
>
> **⚠️ 相位不变**：`state.json.phase` 仍为 `reviewed`；本节只登记修复轮，`validate` 仍由后续 `@sddu-validate` 承接。

### 8.1 I-1（最高优先）—— law8 ★NDA-1 ⑫ 由「空转恒真」改为「真实判红」

**根因（R1 §5 I-1 判定，本轮以探针实测复核确认）**：`test/ui/law8-plaintext.mjs` 的 ⑫ 运行面直接调 `window.__v3.testing.aiNext`，该缝是**面板侧已结构化载荷缝**、**绕开** SW 的 5 道校验链；且调用点紧接上一单元而**未 `reset()`** ⇒ `lastNextstepProducedAt` 未复位 ⇒ `recommendNextStep` 被 `NEXTSTEP_MIN_INTERVAL_MS` 短路（探针实测 `suppression:'interval'`、`produced:null`）⇒ `label()` **从未执行** ⇒「三面零哨兵」恒真。若短路消失，密钥形 label 会触发 `label()` 抛错 ⇒ `evaluate` 抛 ⇒ 门禁**崩溃**（exit 1）而非判红。

**修复**（`test/ui/law8-plaintext.mjs`，净 +2 判据；机制注释同步订正）：

| 段 | 内容 | 实测读数（本环境 headless） |
|:--:|---|---|
| ① **正控** | `reset()` 清防抖时钟 ⇒ 同一注入真跑生产者；反证：不清时钟 ⇒ 必被 anti-flicker 短路 | `liveOutcome.suppression === null` ∧ `gatedOutcome.suppression === 'interval'` ∧ `again === null` |
| ② **负控** | `reset()` 后注入哨兵形 label ⇒ 抛错**就地捕获**（崩溃 → 可判事实）∧ 三面零哨兵 | `threw:true`（`流摘要出现疑似密钥 / 令牌…`）∧ `chips:[]` ∧ 三面哨兵 `false` |
| ③ **反证** | `streamSeed` 直注哨兵 chip ⇒ 三面读数必命中（证明读数非盲） | `textHasSentinel/chipsHaveSentinel/digestHasSentinel` 全 `true`（随后 `streamReset()` 还原） |

**机制陈述订正**：运行面的真实承载机制 = **面板侧第二道闸** `stream-plaintext.ts#label()` 构造期 fail-closed；「第 5 道链丢弃」属 **SW 面**，由 node 门禁 **AI-N-6** 承载（`testing.aiNext` 缝本就绕开它）。原注释「哨兵形 label 被第 5 道链丢弃」已删除。

**「真实判红」实证（注入反证必红，两轮独立实跑 + 还原）**：

| 注入的缺陷（临时，随后还原） | law8 结果 | 红点 |
|---|:--:|---|
| 禁用 `recommend.ts` 的 anti-flicker 短路（`false && …`） | **68 passed / 1 failed**（rc=1） | ★NDA-1 ⑫ **运行面正控** |
| 去掉 `stream-plaintext.ts#label()` 的 `assertStreamPlaintext` | **68 passed / 1 failed**（rc=1） | ★NDA-1 ⑫ **AI label 零明文（运行面）**（`threw:false`） |
| 还原（零残留；`git diff` 无 `stream-plaintext.ts`） | **69 passed / 0 failed**（rc=0） | — |

### 8.2 I-2 —— `xNdaGateReconciliation` 补 `assertionsRemoved` 机核

- `test/supersession-ledger.test.ts#XNdaReconRow` 增 `readonly assertionsRemoved: number`；
- `xNdaReconProblems` 增判据：`!== 0 ⇒ problems.push('…零删除零降级…')`（**缺字段**同样必红）；
- `docs/v4-supersession-ledger.json#xNdaGateReconciliation` **12 行逐行补 `assertionsRemoved: 0`**（对齐 X-ADN / X-IIAN 同构段）；
- 测试增两条注入反证：`{…r, assertionsRemoved: 1}` ⇒ 必红 ∧ `assertionsRemoved: undefined` ⇒ 必红；并增「12 行必须携带该字段」的读数断言；
- 同页文案口径订正：`ai-next-candidate` 行 `new` 更新为 AI-N-1~15、`check` 标「机核字段」；X-NDA-7 `new`/`reason`/`counterCheck` 同步登记 AI-N-15。

> 影响面：父 **FR-NDA-082/116**「`assertionsRemoved = 0`（断言零删除零降级）」在本叶由**注释性**升级为**机核**。X-ADN/X-IIAN 段的既有判据与老条目**逐字未动**（只增）。

### 8.3 I-3 —— intercept 短路永久回归门禁 **AI-N-15**

`test/ai-next-candidate.test.ts` 新增判据 **AI-N-15-intercept-short-circuit**（`JUDGEMENTS` 14→15）：

1. **真跑基座**（只读 import `@lgdl/web-cli-base#createAgentRunner`，零改基座）：`chat` 给出 1 条 `next` 调用 ⇒ `hooks.intercept` 形状与 SW 命中分支逐字同构（生产 `captureNextCall` + `parseNextToolArguments` + `NEXT_TOOL_ACK`）⇒ **`dispatchCalls === 0`** ∧ `outcome === 'completed'` ∧ `failAggregates === 0` ∧ 候选由 **`tc.rawArguments`** 解析得到（`['继续']`）；
2. **源切片**（SW `intercept` 命中分支）：必须 `return { ok: true, output: NEXT_TOOL_ACK }` ∧ 命中分支**不得** `return null` ∧ 必须 `captureNextCall(capture, tc.rawArguments)`；
3. **不上流**：`onCommandLine` / `onToolOutput` 对 `next` 零发射（含 `onToolDone` 身份过滤口径）；
4. **反证（四类，各自必红）**：命中分支按 `return null` ⇒ `dispatchCalls === 1` 判红；合成改 `{ ok:false }` ⇒ `failAggregates === 1` 判红；事件不过滤 ⇒ `next` 命令行 / ACK 必上流；源切片三类篡改（`return null` / `ok:false` / `tc.args`）⇒ 各必红。

> 该门禁把最高风险事实 **R-NDA-905**（`next` 不得成为第二产出内核）由「已删除 spike 的一次性证据」升级为**永久回归**；同时把基座 `runner.ts` 的 `intercepted ?? dispatch` 缝契约定为可判事实。
> 连带：`test/gate-integrity.test.ts` 的 NDA-1 元门禁注释 / 用例名由「AI-N-1~14」订正为「AI-N-1~15」（**下界仍为 ≥14，只增不减**；`CHROMIUM_GATES === 9` / `EXPECTED_AUDITED_FILES === 48` 逐字不动）。

### 8.4 I-4 —— `RULE_PROVIDER_IDS` 注释计数订正（注释-only）

`src/ui/sidepanel/next-registry/providers.ts`：原注释「The rule-group ids (**the 5** `NEXTSTEP_PRIORITY` rules)」与数组 **4** 项不符 ⇒ 订正为「`NEXTSTEP_PRIORITY` 的 5 项规则中，由**注册表规则组 provider** 承担的 **4** 个；第 5 项 `risk-recovery` 由 `RECOVERY_PROVIDER_IDS` + `OPS_RECOVERY_ROWS` 的恢复类 provider 承担，属插件级规则」。

**零输出字节证明**：重建后 `dist/sidepanel.js = 605,239 B`（不变）∧ esbuild metafile 逐模块 `bytesInOutput` **零 DIFF / 零新增 / 零消失** ⇒ A 列账本与所有体积门禁不受影响。

**I-4 的另两处（如实登记，不改已完成 plan 产物字节 / 不改生产行为）**：

| 子项 | 处置 |
|---|---|
| ① `ADR-NDA-102 §①` 判据理由不准确（`next` **已注册** ⇒ `deriveCommand` 返回 `'next'` 前缀，非「未注册 ⇒ 回落 `tc.name`」） | **登记订正**：真值如左；ADR 字节不改（不改已完成 plan 产物）。结论（「不上流判据稳定且单源」）不变。 |
| ② `onCommandLine` 的 `text === NEXT_TOOL_NAME` 对「模型附带 `subcommand` / `args`」不鲁棒（应 `text === NEXT_TOOL_NAME \|\| text.startsWith(NEXT_TOOL_NAME + ' ')`，或改以 `lastTool` 身份判） | **登记残余**（转 validate / 叶2 复核）：SC-NDA-01 证据显示合规调用 `tc.args === {}` ⇒ `deriveCommand` 恒为 `'next'`，故现形判据对**合规**调用成立；本轮**不改生产行为**以免越出修复轮范围。 |

### 8.5 门禁复跑（本工作树实测）

| 门禁 | 结果 | rc | 对照（build.md 基线） |
|---|:--:|:--:|---|
| `npx tsc --noEmit` | 通过 | 0 | 0 |
| `npm test` | **1517 / 0** | 0 | 1516 / 0（**+1**：AI-N-15；零删除） |
| `npm run test:law8` | **69 / 0** | 0 | 67 / 0（**+2**：⑫ 正控 + ⑫ 反证段） |
| `npm run test:supersession` | **55 / 0** | 0 | 55 / 0 |
| `npm run test:gate-integrity` | **27 / 0** | 0 | 27 / 0 |
| `npm run test:s0-self-driven`（非要求，参考） | 95 / 3 | 1 | 95 / 3（**同 3 项既有环境 flake**，见 §4.1；非本轮引入） |

### 8.6 体积 / 红线复验（本轮）

| 项 | 值 | 结论 |
|---|---|:--:|
| A 列 `dist/sidepanel.js` | 605,239 B | **不变** |
| B 列 `dist/background.js` | 1,644,437 B | **不变** |
| 冻结面 `dist/content.js` | 177,076 B / sha `52a826205553b46a896ccad54225d63ba62f5f7fe7c969a9bc2e655448d5b5f6` | **逐字节不变** |
| 冻结面 `dist/pick-layer.js` | 34,358 B / sha `77796babd9c93893542195424d160e0877d8acca4142f8faf2232e217fbd575e` | **逐字节不变** |
| `packages/web-cli-base/**` | 零 diff | 零改基座保持 |
| 新增生产文件 | 0（仅 `providers.ts` 注释订正） | 最小改动原则 |

## 修订记录

| 版本 | 变更说明 | 日期 | 修订人 |
|------|---------|------|--------|
| v1.0 | 初始创建（R1 全量静态审查：C1~C28 逐项；工作树未提交产物；结论 ⚠️ 有条件通过 / 0 阻塞 / 4 改进；关键证据 = `admitCandidate` 与 `onToolDone` 切片 sha256 逐字节相同、围栏块五符号 `src/**` 零命中、`enum` 独立复算 7 枚、冻结面 sha 双锚命中、基座零 diff） | 2026-09-27 | SDDU Review Agent |
| v1.1 | 追加 §8 **R1 修复轮记录**（sddu-build 执行 I-1~I-4；含两次注入反证实跑与门禁复跑计数）。**R1 正文（§1~§7）逐字保留不动**。 | 2026-09-27 | SDDU Build Agent |
