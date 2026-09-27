# ADR-NDA-201: 异常事实的承载与传输（`AiNextPayload.abnormal?` + SW 单源判定）

## 状态
PROPOSED

## 背景

系统兜底需要面板知道「本回合 LLM 异常」这一事实。可用信号有三处，但**都不完整**：

| 信号 | 来源 | 缺口 |
|---|---|---|
| `variant:'error'`（`chat-events.ts:76-81`） | `onLLMError(msg, willRetry=false)` | 只表示「最终失败」；且**不能**区分「LLM 坏」与「其它调用错误」（对兜底而言等价，但无法表达 `no-tool-call` / `all-blocked`） |
| `RunOutcome`（`runner.ts:27`） | `onFinish(outcome)` | **SW 可见、面板不可见**；当前 `onFinish` 忽略参数（`service-worker.ts:1027`） |
| `aiNext`（`chat-events.ts:72` / `definition.ts:108-113`） | SW → 面板（既有加法字段） | 只有 `accepted` / `blocked`；`accepted=[] ∧ blocked=[]` **既可能是「未产出」也可能是「字段缺席」**（`hasAiNext` 判断使空载荷不下发） |

同时有两条硬约束：① **不得**新增 kind / variant（`KIND_SET` 40 / `ARBITRATION_RESULTS` 四值逐字）；② **判定必须单源**（`NFR-NDA-013`：第二分类器 ⇒ FAIL；`R-NDA-915`）。

## 决策

### ① 判定**单源在 SW**，纯函数（`background/next-drive-policy.ts`）

见 ADR-NDA-007 §①（`abnormalVerdict({outcome, accepted, blocked, captured})`）。关键点：

- `outcome` 由基座**原生**提供：`onFinish` 从忽略参数改为 `onFinish: (outcome) => {…}`（`runner.ts:102` 传入）⇒ **零改基座**；
- `accepted` / `blocked` 来自叶1 装配的 `AiNextPayload`；
- `captured`（`capture.captured`）来自叶1 的 `next` 捕获态 ⇒ 用于区分「调用过 `next` 但空候选」（合法「无建议」⇒ `null`）与「真未调用」（⇒ `no-tool-call`）；**R1 修复轮 I-1**：无此信号时前者被误并入 `no-tool-call`，健康 LLM「没有下一步」会被误呈现「配置新的 LLM」；
- `stopped` ⇒ `null`（用户主动停不是异常，不推「去配置新 LLM」——避免无意义打扰）；
- 输出**闭集三情**；有 `accepted` 或「调用过且空候选」⇒ `null`。

### ② 承载 = `AiNextPayload.abnormal?`（**加法可选子字段**，type-only 单源）

```ts
// ui/sidepanel/next-registry/definition.ts（面板侧 type-only 词汇单源；已被 SW import type 依赖，ai-next.ts:28）
export const AI_ABNORMAL_CODES = Object.freeze(['no-tool-call', 'llm-failed', 'all-blocked'] as const);
export type AiAbnormalCode = (typeof AI_ABNORMAL_CODES)[number];

export interface AiNextPayload {
  readonly accepted: readonly AiNextCandidate[];
  readonly blocked: readonly AiNextBlockedCode[];
  /** ★ F-37 加法（可选）：本回合 LLM 异常判定（闭集 3 情）；缺席 ⇒ 面板行为与现状逐字（N-NDA-029）。 */
  readonly abnormal?: AiAbnormalCode;
}
```

| 设计点 | 口径 | 理由 |
|---|---|---|
| 放在 `aiNext` 内（而非新顶层字段 / 新 variant） | 复用**既有**加法载荷通道 | 零新 kind / 零新 variant（`KIND_SET` 40 不动）；与 `aiNext` 的既有语义（「本回合 AI next 事实」）同域 |
| 闭集常量声明在 `definition.ts` | **恰一处**（SW `import type` + 值导入同一常量） | 避免 SW / 面板两处字面量（第二词表）；`recommendation-sources` 只约束 `recommend.ts` ⇒ 模块白名单仍 5 |
| `abnormal` **只在非 null 时附加** | 且此时 `accepted` 恰为空数组（由 `abnormalVerdict` 前置保证） | 语义自洽（异常 ⇔ 无合法候选）；反证「有 accepted 却带 abnormal ⇒ 必红」 |
| **缺席 ⇒ 现状逐字** | `service-worker.ts` 的 `hasAiNext` 判据扩展为「`accepted.length > 0 \|\| blocked.length > 0 \|\| abnormal !== undefined`」 | 正常回合（有新候选）路径完全不变；`N-NDA-029` 可判 |
| 面板**只消费** | `consumeAiNext(aiNext)` 内 `if (aiNext?.abnormal) noteLlmAbnormalFact(aiNext.abnormal)` | 判定单源；面板零第二分类器 |

### ③ 面板消费 = 折进**既有 `risk` 源**（零新 ctx 字段）

```ts
// sidepanel.ts（与 observedBlocked 同构；事件作用域）
const observedAbnormal = new Set<string>();
function noteLlmAbnormalFact(): void { observedAbnormal.add(LLM_ABNORMAL_RISK); }
// maybeRecommend 内（:2059-2062 同构处）：
for (const id of observedAbnormal) risks.push(id);
```

- `LLM_ABNORMAL_RISK = 'llmAbnormal'`（常量**单源**放在 `providers.ts`，与 `LLM_BLOCKED_RISK` / `PERM_BLOCKED_RISK` 同处，`:49-50` 旁）；
- `llm.abnormal` provider 的 `when: (ctx) => ctx.risk.includes(LLM_ABNORMAL_RISK)`；
- **真值源仍恰 7**（`NEXT_SOURCE_NAMES` 不动）；`recommend.ts` **零新导入**（只在 `sidepanel.ts` 折叠，`providers.ts` 读）；
- 事件作用域：不持久化（`abnormal` 是「本回合」事实；下一次正常回合不应继续推荐「配置新的 LLM」）⇒ 与 `pendingAiNext` 单槽同寿命（喂一次即清 / 或在下一正常回合清除——build 时按「一次性」实现，门禁断言「第二次正常回合不再出现兜底 chip」）。

### ④ 反证与判据（AI-N-15 扩容）

| 判据 | 反证 |
|---|---|
| `abnormalVerdict` 三情真值表（`llm-failed` / `all-blocked` / `no-tool-call`）+ `stopped ⇒ null` + `accepted>0 ⇒ null` | 注入任一分支错序 ⇒ 必红 |
| **「调用但空候选」边界**（R1 修复轮 I-1）：`captured ∧ accepted=0 ∧ blocked=0 ⇒ null`（合法「无建议」，**不**推「配置新的 LLM」）；`captured=false ∧ accepted=0 ∧ blocked=0 ⇒ no-tool-call`（才触发提醒 → 兜底） | 忽略 `captured`（旧实现）或 SW 不传 `capture.captured` ⇒ 必红 |
| `abnormal` 只在非 null 时下发；`accepted.length > 0 ∧ abnormal !== undefined` **不可能** | 注入 ⇒ 必红 |
| 「缺席 ⇒ 现状逐字」：正常回合（有候选）的 `chat-result` 字段集合与今天**逐字一致** | 注入「总是附加空 abnormal」⇒ 必红 |
| 面板**零第二分类器**：`abnormalVerdict` / `AI_ABNORMAL_CODES` 在 `sidepanel.ts` **零实现**（只 import `LLM_ABNORMAL_RISK`） | 注入 ⇒ 必红 |
| `KIND_SET` 40 / `ARBITRATION_RESULTS` 4 值逐字 | 注入新 kind / 新 variant ⇒ 必红 |
| 兜底 chip 可达：异常相 ctx ⇒ `llm.abnormal.when === true` 且 chips === `['op.llm-config']` | 删 provider ⇒ 必红 |

## 备选方案

| 方案 | 处置 |
|---|---|
| 新顶层字段 `ChatResultEvent.llmAbnormal?` | ⚠️ 可行（加法字段），但把「AI next 事实」拆到两个通道（`aiNext` + `llmAbnormal`）⇒ 面板需两处消费 + 「缺席 ⇒ 逐字」的判据也要两次；一致性更差 |
| 新 `variant:'llm-abnormal'` | ❌ 破 `ARBITRATION_RESULTS` / `ChatResultVariant` 的闭集纪律（四值逐字）+ 面板分支膨胀；且「变体」语义是**回合结果**，异常是**附带事实** |
| 面板侧自行判定（读 `error` 变体 + `aiNext.blocked`） | ❌ 面板拿不到 `outcome` ⇒ `llm-failed` 不可辨；且**双判**（R-NDA-915） |
| 复用 `llm.unconfigured` 的 risk 项表达异常 | ❌ 分相被抹平（`N-NDA-026` 红线）；未配置用户会被推荐「配置**新的** LLM」 |
| 用 `blocked.length > 0 ∧ accepted === 0` 在面板直接判 `all-blocked` | ⚠️ 对 `all-blocked` 可行，但 `no-tool-call` / `llm-failed` 仍需 SW ⇒ 会形成「一半 SW 判、一半面板判」的**分裂**⇒ 口径不单源 |

## 后果

**正向**：
- 异常事实经**既有**加法载荷通道传输 ⇒ 零新 kind / 零新 variant / 零新宿主；
- 判定单源（SW 纯函数）⇒ node 可判、可注入反证、可 FAIL；
- 面板零第二分类器（`NFR-NDA-013` 的「第二份 ⇒ FAIL」可判）。

**代价 / 风险**：
- `AiNextPayload` 加一个可选字段 ⇒ 需在门禁对「缺席 ⇒ 现状逐字」再判一次（N-NDA-029）；
- 「`abnormal` 是否应在本会话内保留」是**语义自由度**：本 ADR 裁决 = **一次**（事件作用域；第二次正常回合不再提示）⇒ 门禁需断言「第二次正常回合无兜底 chip」；若 author 要求持续提示 ⇒ 走加法（不改判据口径）。

## 落地判据（供 tasks/build）

1. `AI_ABNORMAL_CODES` **恰一处**声明（`definition.ts`）；SW / 面板均无第二份字面量；
2. `abnormalVerdict` 真值表（4 行）+ `abnormal` 附加条件（仅非 null）+ `accepted>0 ⇒ null`；
3. 「缺席 ⇒ 现状逐字」判据（正常回合字段集合与今天一致）；
4. `KIND_SET` 40 / `ARBITRATION_RESULTS` 四值 / `NEXT_SOURCE_NAMES` 恰 7 逐字不动；
5. 事件作用域一次性（第二次正常回合无 `llmAbnormal` 风险项、无兜底 chip）。
