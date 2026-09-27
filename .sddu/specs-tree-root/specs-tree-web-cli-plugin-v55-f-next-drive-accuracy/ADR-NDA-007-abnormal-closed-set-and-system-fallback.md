# ADR-NDA-007: LLM 异常判定闭集 + 系统兜底 `llm.abnormal` provider（复用 `op.llm-config`，词表分相）

## 状态
PROPOSED

## 背景

作者口径①逐字：「如果 LLM **始终无法给你 next（LLM 坏了等情况）**，那就应该由**系统给出兜底的推荐，推荐用户配置新的 LLM 等操作**」。

现状**完全没有**这条链：
- `onFinish` 只「校验 + 装配」（`service-worker.ts:1027-1043`）；
- LLM 连续失败 ⇒ `handleLlmError` ⇒ `finish('llm-failed')`（`runner.ts:107-119`）⇒ 面板收到 `variant:'error'`（`chat-events.ts:76-81`）后只 `maybeRecommend('idle')`（`sidepanel.ts:4147-4152`）；
- `llm.unconfigured` 修复行**只覆盖「未配置」**（`providers.ts:58` + `when: ctx.risk.includes(row.risk)` `:138`）——**不覆盖「配置了但坏了」**（D-4）。

同时有两条硬约束：
1. **词表不得漂移**：`BLOCKED_TERMINALS` **恰 5**（`definition.ts:34-40`，`blocked-terminals.test.ts:342` 钉死）、`OPS_RECOVERY_ROWS` / `OPS_RECOVERY_PROVIDER_IDS` **恰 2**（`providers.ts:52-61`；`blocked-terminals.test.ts:259,392`）、`RECOVERY_PROVIDER_IDS` **恰 5**（`:384`）—— **不得**新增第 6 个 blocked terminal、不得新增第 3 个 op-driven 行；
2. **未配置 ≠ 异常**（N-NDA-026 为可失败红线）：把二者混同会让「从未配置」的用户被推荐「配置**新的** LLM」（荒谬），也会让「配置了但坏了」被当成「未配置」（丢掉「切换 / 重配」的语义）。

## 决策

### ① 闭集三情（判定**单源在 SW**，纯函数）

**NEW** `src/background/next-drive-policy.ts`（与 nudge 同模块，**同一单源**）：

```ts
// 闭集常量 / 类型**单源在 `definition.ts`**（见 §②）；本模块只 import 同一常量与类型（零第二份字面量）：
import { AI_ABNORMAL_CODES, type AiAbnormalCode } from '../ui/sidepanel/next-registry/definition.js';

export interface AbnormalFacts {
  readonly outcome: 'completed' | 'max-rounds' | 'stopped' | 'llm-failed' | 'empty';  // = runner 的 RunOutcome
  readonly accepted: number;   // 过 5 道链的候选数
  readonly blocked: number;    // 被拦码数
}
/** 异常判定闭集（**恰 3 情**；正常（有 accepted）⇒ null）。顺序即语义优先级。 */
export function abnormalVerdict(f: AbnormalFacts): AiAbnormalCode | null {
  if (f.accepted > 0) return null;                        // 有合法候选 ⇒ 非异常
  if (f.outcome === 'llm-failed') return 'llm-failed';    // ① LLM 坏（含 nudge 轮失败）
  if (f.outcome === 'stopped') return null;               // 用户主动停 ⇒ 不是异常（不推荐修复）
  if (f.blocked > 0) return 'all-blocked';                // ② 候选全被 5 道链拦
  return 'no-tool-call';                                  // ③ 正常结束但无 next 调用（nudge 已用尽）
}
```

- `no-tool-call` **只在 nudge 用尽后**可能到达：`onFinish` 于回合结束后才求值，而 nudge 在回合内（ADR-NDA-006）⇒ 「提醒已用尽」**结构性成立**（不需第二个布尔）；
- `llm-failed` 需要的 `outcome` **已被基座提供**：`onFinish` 当前签名忽略参数（`service-worker.ts:1027` `onFinish: () => {...}`），改为 `onFinish: (outcome) => {...}` ⇒ `RunOutcome` 直接可用（`runner.ts:27,102`）；
- `all-blocked` 由 `aiNext.payload` 直接可判（`accepted.length === 0 && blocked.length > 0`）；
- 纯函数、零 IO ⇒ node 门禁可直接调用（`FR-NDA-106`）。

### ② 承载：`AiNextPayload.abnormal?`（**加法可选字段**，type-only）

```ts
// ui/sidepanel/next-registry/definition.ts（type-only 词汇**单源**；∉ KIND_SET）
export const AI_ABNORMAL_CODES = Object.freeze(['no-tool-call', 'llm-failed', 'all-blocked'] as const);   // ★ 唯一声明处（**恰一处**）
export type AiAbnormalCode = (typeof AI_ABNORMAL_CODES)[number];
export interface AiNextPayload {
  readonly accepted: readonly AiNextCandidate[];
  readonly blocked: readonly AiNextBlockedCode[];
  /** ★ 新增（加法，可选）：本回合的 LLM 异常判定（闭集 3 情）；缺席 ⇒ 现状逐字（N-NDA-029）。 */
  readonly abnormal?: AiAbnormalCode;
}
```

- **闭集常量放哪儿**：为避免两处声明，plan 裁决 = **声明在 `definition.ts`**（面板侧 type-only 词汇单源，已被 SW `import type` 依赖，`ai-next.ts:28`），SW 的 `next-drive-policy.ts` `import type` + 值导入同一常量 ⇒ 单源；`recommendation-sources` 模块白名单**只约束 `recommend.ts`**（`recommend.ts` 不 import 它）⇒ 白名单仍 5；
- **传输面**：`chat-result{done, aiNext:{accepted, blocked, abnormal}}`（既有加法载荷字段内加一个可选子字段 ⇒ **零新 kind / 零新 variant**；`ChatResultEvent.aiNext?: AiNextPayload` 逐字不改）；
- **缺席 ⇒ 现状逐字**：`abnormal` 不在场时面板行为与今天完全一致（N-NDA-029）。SW 只在 `abnormalVerdict !== null` 时附加该字段（且此时 `accepted` 恰为空数组）。

### ③ 系统兜底推荐 = **新 provider `llm.abnormal`**（复用 `op.llm-config`）

```ts
// providers.ts（第 13 行 provider）
{
  id: 'llm.abnormal',
  deps: ['snapshot'],
  priority: 0,
  mode: 'waterfall',
  fail: 'card-boundary',
  rule: 'risk-recovery',                                   // 与 llm.unconfigured 同档 ⇒ 压过一切建议
  when: (ctx) => ctx.risk.includes(LLM_ABNORMAL_RISK),     // 新 risk 项 'llmAbnormal'（单源常量）
  chips: ['op.llm-config'],                                // ★ 复用既有修复 op（零新增 op / 动作）
  textOf: () => ['配置新的 LLM（切换 / 重配）'],            // ★ 文案分相：强调「新的」
}
```

- **零新增 op / 零新增动作**：chip 是 `op.llm-config`（`op-table.ts:120`，`confirm` 档，`ask:'choice'`）⇒ `confirm` 档恒由**用户作答**（`pressDecision` 的 `tier` 闸 `ai-drive.ts:70`）⇒ **AI 不代答 / 不自动按下**（FR-NDA-076 / N-NDA-017）；
- **与未配置引导共享 op、文案分相**：未配置 = `OPS_RECOVERY_ROWS[0].text`「配置 LLM 凭据（写入本机 · 掩码）」；异常 = 「配置新的 LLM（切换 / 重配）」（两句可区分，门禁同时断言两文案**不相同**且各自在场）；
- **不新增 blocked terminal**：`llm.abnormal` **不是** blocked terminal（`BLOCKED_TERMINALS` 仍恰 5），它是**风险驱动的 recovery provider**；`OPS_RECOVERY_ROWS` / `OPS_RECOVERY_PROVIDER_IDS` **不动**（仍恰 2）；`RECOVERY_PROVIDER_IDS` 仍恰 5（它是 trigger 集，不含本行）；
- **优先级位置**：与 `llm.unconfigured` 同 `priority: 0` + `rule:'risk-recovery'` ⇒ 在 `risk-recovery` 档内；`risk-recovery` 是 `NEXTSTEP_PRIORITY` 第 1 档（ADR-NDA-003）⇒ 兜底推荐**压过** AI 建议（异常时不该再推建议）；
- **零死端**：异常相推荐卡 = 兜底 chip + **已配置 ⇒ free-input 终端恒常驻**（ADR-NDA-005 §③）⇒ 卡必有可达 next（FR-NDA-074）。

### ④ 面板：**只消费，不判定**（判定单源在 SW）

```ts
// sidepanel.ts（consumeAiNext 内，既有单槽旁）
if (aiNext?.abnormal) noteLlmAbnormalFact(aiNext.abnormal);   // 折进既有 risk 源（与 noteLlmBlockedFact 同构）
```

- `noteLlmAbnormalFact` 的实现 = `observedAbnormal.add(LLM_ABNORMAL_RISK)`（事件作用域单布尔/单值；与 `observedBlocked` 同构，`sidepanel.ts:1484-1486`）；
- `maybeRecommend`（`:2059-2062` 的同构处）把 `observedAbnormal` 折进 `risks` ⇒ ctx 的 `risk` 源；
- **两步都在既有函数内**，不新增 `maybeRecommend` 调用点（`consumeAiNext` 尾部的 `maybeRecommend('idle')` 已存在，`:4404`）；
- **面板零第二分类器**（反证：面板出现 `abnormalVerdict` 的第二实现 ⇒ 必红）。

### ⑤ 门禁重锚（**12 → 13，只增**）

| 门禁 | 现状 | 重锚 |
|---|---|---|
| `test/driver-quadruple.test.ts:233-235,376-378` | 声明表恰 12 ∧ 注册表恰 12 ∧ 逐项同集 | **恰 13**（旧 12 行逐字保留 + `llm.abnormal` 第 13 行）；`DRIVER_DECLS_SRC['llm.abnormal'] = { driverId:'llm.abnormal', timings:['idle'], moments:['turn-end'], driverClass:'deterministic', priority:0, evidence:['risk'] }`（`evidence` 与 `when` 实读**同源**，DQ-3 机核） |
| `test/next-registry.test.ts:264,315` | 声明行恰 12 | **恰 13**（只增） |
| `test/blocked-terminals.test.ts:342,259,384,392` | `BLOCKED_TERMINALS` 恰 5 / `OPS_RECOVERY_PROVIDER_IDS` 恰 2 / `RECOVERY_PROVIDER_IDS` 恰 5 | **零改**（本行不入这三个集合；BT-1「阻塞态字面量恰一次」不受影响——`llm.abnormal` 不是阻塞态字面量，也不写 `llm.unconfigured`） |
| `test/driver-terminals.test.ts`（DTM-1~4） | `DRIVER_TERMINALS` 恰 4 + `PROACTIVE_MOMENTS` 恰 7 | **零改**（`'turn-end'` 是既有 moment；`timings:['idle']` 既有） |
| `test/ai-next-candidate.test.ts` AI-N-15（新增） | — | `abnormalVerdict` 三情真值表 + `llm.abnormal.when` 只读 `risk` + 两文案相异 |

### ⑥ 台账（X-NDA-4）

`xNdaLedger` 一行：`X-NDA-4 old = "无 LLM 异常兜底（service-worker.ts:1027-1043；sidepanel.ts:4147-4152）"` → `new = "abnormalVerdict 闭集三情 + nudge 一次 + llm.abnormal 兜底 provider（复用 op.llm-config）"`；**标注为「新增（非删除既有）」**（`counterCheck` = 三情真值表 + 兜底 chip 可达 + 反证「无兜底 ⇒ 必红」）。

## 备选方案

| 方案 | 处置 |
|---|---|
| 复用 `llm.unconfigured` 行 + ctx 敏感文案（provider 数仍 12） | ⚠️ 零门禁代价；但把「未配置」与「配置了但坏了」压进**同一 provider 行**，使 spec 花整节建立的分相在**结构上**被抹平（一个 `id` 两个语义）⇒ 违反 N-NDA-026 精神；且 `OPS_RECOVERY_ROWS` 的 `blocked↔op` 双射会变成「一 blocked 两义」 |
| 新增第 6 个 blocked terminal `llm.abnormal` | ❌ `BLOCKED_TERMINALS` 恰 5（`:342`）+ BT-1 字面量恰一次双门禁 ⇒ 破红线；且「LLM 坏」不是「阻塞终态」而是**风险态**（语义不符） |
| 新增 op（如 `op.llm-switch`） | ❌ 零新增 op 纪律（N-NDA-003 精神 / NFR-NDA-013）；`op.llm-config` 的 `choice` 已能表达「切换 / 重配」 |
| 不加 provider，只在既有确定性候选上加一行文案 | ❌ 「推荐」必须可点（chip）；纯文案不满足 FR-NDA-072/073 的「兜底推荐可达」 |
| 异常时把 `llm.unconfigured` 的 risk 也点亮（复用行 + 复用文案） | ❌ 文字撒谎（用户已配置却被告知「配置凭据」）⇒ 直接违反 FR-NDA-072「文案强调配置**新的** LLM」 |

## 后果

**正向**：
- 「LLM 坏了 ⇒ 系统明确告诉我该做什么」落地（作者口径①的后半）；
- 词表分相干净（未配置 vs 异常各自可判、文案相异）；
- 零新增 op / 零新增 blocked terminal / 零新增 kind / 零新增宿主；
- `confirm` 档由用户作答 ⇒ AI 代答红线**结构性**保持。

**代价**：
- **破「恰 12」两处**（`driver-quadruple` / `next-registry` NR-10）⇒ 12→13 等价重锚 + 台账（**已知、已定位、只增**）；
- A 列增量 ≈ +0.3~0.6 KB（provider 行 + `risk` 折叠 + 文案）；
- `AiNextPayload` 加一个可选字段 ⇒ 需在门禁对「缺席 ⇒ 现状逐字」再确认一次（N-NDA-029）。

## 落地判据（供 tasks/build）

1. `abnormalVerdict` 三情真值表（`no-tool-call` / `llm-failed` / `all-blocked`）+ 「有 accepted ⇒ null」+ 「`stopped` ⇒ null」；
2. 反证：删 `llm.abnormal` provider ⇒ 「异常相无兜底 chip」判据**必红**；把未配置 ctx 判成异常 ⇒ **必红**；
3. 两文案相异且各自在场（未配置「配置 LLM 凭据…」/ 异常「配置新的 LLM（切换 / 重配）」）；
4. `op.llm-config` **恰一处**（chip 集合里不新增 op）；`confirm` 档候选 `admit=true ∧ press=blocked:tier`；
5. `driver-quadruple` / `next-registry` 恰 13（逐项同集 + 幽灵行必红）；`BLOCKED_TERMINALS` 恰 5 / `OPS_RECOVERY_PROVIDER_IDS` 恰 2 / `RECOVERY_PROVIDER_IDS` 恰 5 **均未变**；
6. 缺席 `abnormal` ⇒ 面板行为与现状逐字（N-NDA-029 判据）。
