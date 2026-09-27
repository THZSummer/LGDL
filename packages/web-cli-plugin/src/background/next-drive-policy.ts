/**
 * ★ NDA-2 **TASK-NDA-202 / 208**（ADR-NDA-006 §②/§③ · ADR-NDA-007 §① · ADR-NDA-201 §① ·
 * FR-NDA-060~066 / 070~076 / 105 / 106 · AC-NDA-008/009）—— **AI next 驱动的两条纯判据**
 * （B 列：`dist/background.js`，**不计入 sidepanel 账本**，ADR-NDA-008 §①）。
 *
 * ── 为什么是独立模块（而非塞进 `ai-next.ts` 或面板）────────────────────────────
 *
 *   · **判定单源**（NFR-NDA-013 / R-NDA-915）：`abnormalVerdict` 只在 SW 求值一次；
 *     面板**只消费** `aiNext.abnormal`（`sidepanel.ts#noteLlmAbnormalFact`），零第二分类器；
 *   · **语义边界**（R1 修复轮 I-1 · FR-NDA-070 字面）：`abnormalVerdict` 以 `captured`
 *     区分「调用过 `next` 但空候选」（合法「无建议」⇒ `null`，**不**推「配置新的 LLM」）
 *     与「真未调用 `next`」（⇒ `no-tool-call`，走提醒 → 兜底）；
 *   · `ai-next.ts` 是「解析 + 5 道校验链」的职责面 ⇒ 本条策略不污染它（ADR-NDA-201 §备选 C）；
 *   · **纯函数**（零 `chrome` / DOM / 时钟 / `fetch` / IO）⇒ node 门禁可直接调用，
 *     反证可注入、可 FAIL（FR-NDA-105 / 106）。
 *
 * ── 与 spec 字面的时点偏差（如实登记 `PD-NDA-016`）──────────────────────────────
 *
 * 提醒在「**本轮无 `toolCalls`（模型正在收尾）**」处求值 —— 比 `finish('completed')`
 * **早一步**（基座 `runner.ts:188-193` 立即收尾）。等价性：无 `toolCalls` ⇒ 基座唯一去路是
 * `finish('completed')` 或 `finish('empty')`（`hasReply` 收窄排除后者）；`stop()` 窗口内
 * **至多多发 1 次**（有界）。见 ADR-NDA-006 §④。
 *
 * @module background/next-drive-policy
 */
import type { RunOutcome } from '@lgdl/web-cli-base';
// ★ 闭集词汇**恰一处**声明在 `definition.ts`（type-only 词汇单源，ADR-NDA-201 §②）；
// 本模块只**值导入**该常量（零第二份字面量 / 零第二词表，FR-NDA-071 / 075）。
import { AI_ABNORMAL_CODES, type AiAbnormalCode } from '../ui/sidepanel/next-registry/definition.js';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. 提醒补一次（ADR-NDA-006 §②/§③ · FR-NDA-060~063）
 * ──────────────────────────────────────────────────────────────────────────── */

/** 提醒判定的事实面（五条件；`configured` 显式入参 ⇒ `FR-NDA-060` 的三条条件可判、可 FAIL）。 */
export interface NudgeFacts {
  /** `isLlmConfigured(...)`（SW 在 `runChat` 入口已算 ⇒ 提为 `const configured`，单源）。 */
  readonly configured: boolean;
  /** 本轮 `res.toolCalls.length`（≠0 ⇒ 回合未收尾，不提醒）。 */
  readonly toolCalls: number;
  /** `res.content.trim().length > 0`（排除 `empty` 路径误提醒）。 */
  readonly hasReply: boolean;
  /** 本回合 `hooks.intercept` 是否捕获过 `next` 调用（`capture.captured`）。 */
  readonly captured: boolean;
  /** 本回合是否**已**提醒过（`nudgeUsed` 单布尔 ⇒ 有界恰一次）。 */
  readonly nudgeUsed: boolean;
}

/**
 * **有界恰一次 + 防环**：五条件齐（缺一即 `false`）。顺序即语义优先级。
 *
 * 反证（AI-N-16 落地）：忽略 `nudgeUsed` ⇒ 二阶提醒 ⇒ 必红；删 `hasReply` ⇒ `empty`
 * 路径误提醒 ⇒ 必红；`!configured` ⇒ 未配置相不提醒（零 token 语义不破）。
 */
export function shouldNudge(f: NudgeFacts): boolean {
  if (f.nudgeUsed) return false; // ① 有界（防环：提醒轮不再提醒）
  if (!f.configured) return false; // ② 已配置相（未配置 ⇒ 零 token 路径，不提醒）
  if (f.captured) return false; // ③ 本回合已捕获 next ⇒ 不提醒
  if (f.toolCalls !== 0) return false; // ④ 本轮仍有工具调用 ⇒ 回合未收尾
  return f.hasReply; // ⑤ 有非空回复（排除 empty / 事故路径）
}

/**
 * 提醒文本（口径逐字，ADR-NDA-006 §③）：**两句** —— ① 请现在调用一次 `next` 工具
 * （最多 3 条）；② 若无建议调用 `next` 并给空 `candidates` 数组。
 *
 * **零明文**：不携带用户正文 / 凭据 / 站点事实 ⇒ 法八四面不破（NFR-NDA-004）。
 */
export const NUDGE_TEXT =
  '你还没有调用 `next` 工具。请现在调用一次 `next` 工具，给出下一步候选（最多 3 条）；' +
  '如果确实没有建议，调用 `next` 并给空 `candidates` 数组。不要重复上面的答案。';

/* ────────────────────────────────────────────────────────────────────────────
 * 2. LLM 异常判定闭集（ADR-NDA-007 §① · ADR-NDA-201 §① · FR-NDA-070/071/075）
 * ──────────────────────────────────────────────────────────────────────────── */

/** 异常判定的事实面（`outcome` 由基座 `RunOutcome` **原生**提供，零改基座）。 */
export interface AbnormalFacts {
  /** 基座 `runner.ts` 的终结读数（`onFinish(outcome)` 的原生参数）。 */
  readonly outcome: RunOutcome;
  /** 过 5 道链的候选数（`aiNext.accepted.length`）。 */
  readonly accepted: number;
  /** 被拦码数（`aiNext.blocked.length`）。 */
  readonly blocked: number;
  /**
   * ★ R1 修复轮 **I-1**（`capture.captured` —— 本回合 `hooks.intercept` 是否**真的**
   * 调用过 `next` 工具）。**必需**，用于把「未调用 `next`」与「调用了 `next` 但
   * `candidates:[]`」**区分**开（`FR-NDA-070` 字面 = 「无 `next` 工具**调用**」）：
   *
   *   · `captured=false` ⇒ 真没调用 ⇒ `no-tool-call`（提醒补一次 → 仍失败 → 兜底「配置新 LLM」）；
   *   · `captured=true ∧ accepted=0 ∧ blocked=0` ⇒ **合法「无建议」**（恰是 `next` 工具
   *     description 第 5 句与 `NUDGE_TEXT` 第②句**明确指示**的健康路径）⇒ 返回 `null`
   *     （**不**触发「配置新的 LLM」；零死端由确定性兜底 / free-input 终端保证）。
   *
   * 注：捕获面只能给出「调用过 ∧ 解析后零候选」⇒「调用但空数组」与「调用但解析失败」
   * 在**本面等价**（`next-tool.ts` 解析失败记零候选、不抛错）——两者都**不是**「LLM 坏」
   * 或「候选全被拦」，故同判「无建议」；更细的解析失败读数不在本判据面（`AI-N-1`）。
   */
  readonly captured: boolean;
}

// ★ 闭集三情**值**来自单源常量（`definition.ts#AI_ABNORMAL_CODES`）；此处只解构 ⇒
// 三个字面量在本文件**零出现**（单源扫描 `grep -v definition.ts` 必须零命中）。
const [NO_TOOL_CALL, LLM_FAILED, ALL_BLOCKED] = AI_ABNORMAL_CODES;

/**
 * **异常判定闭集**（恰 3 情；正常（有 `accepted` 或无建议）⇒ `null`）。顺序即语义优先级。
 *
 *   · `accepted > 0` ⇒ `null`（有合法候选 ⇒ 非异常；此时 `abnormal` 必不附加）；
 *   · `llm-failed` ⇒ ①LLM 坏（含**提醒轮**失败：`nudgeUsed=true ⇒ 不再提醒`，ADR-NDA-006 §⑦）；
 *   · `stopped` ⇒ `null`（用户主动停不是异常 —— 不推「配置新的 LLM」，避免无意义打扰）；
 *   · `blocked > 0` ⇒ ②候选**全被** 5 道链拦（不是「未产出」）；
 *   · `captured` ⇒ `null`（③ **合法「无建议」**：**调用过** `next` 但 `candidates:[]` ——
 *     `next` 工具 description 第 5 句 / `NUDGE_TEXT` 第②句明确指示的**健康路径**；
 *     R1 修复轮 **I-1**：此相**不得**并入 `no-tool-call`、**不得**呈现「配置新的 LLM」）；
 *   · 否则 ⇒ ④正常结束且**真未调用** `next`（**提醒已用尽**：`onFinish` 在回合后求值、
 *     nudge 在回合内 ⇒ 结构性成立，ADR-NDA-007 §①）。
 *
 * 纯函数、零 IO ⇒ node 门禁可直接调用（FR-NDA-106）。
 */
export function abnormalVerdict(f: AbnormalFacts): AiAbnormalCode | null {
  if (f.accepted > 0) return null;
  if (f.outcome === 'llm-failed') return LLM_FAILED;
  if (f.outcome === 'stopped') return null;
  if (f.blocked > 0) return ALL_BLOCKED;
  if (f.captured) return null;
  return NO_TOOL_CALL;
}
