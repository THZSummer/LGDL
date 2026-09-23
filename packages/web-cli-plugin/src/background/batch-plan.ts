/**
 * V5.5F-2 **TASK-V55F-206 / 207 / 208** (ADR-SGO-004 §1~§5 · FR-SGO-040~045 ·
 * AC-SGO-015 · N-SGO-005/025 · R-SGO-001/906/915/916) — the **写入计划 + 计划指纹 +
 * 准入裁决**（B 列：纯逻辑 + 零 `chrome.*` ⇒ node 可测）。
 *
 * ── 为什么是「系统聚合」而不是「AI 独立出计划」（PD-SGO-005 裁决）──────────────
 *
 * 计划 = 从**单条 assistant 消息**的 `toolCalls` 聚合出的「范围内 `dom set-text`」集合。
 * 计划与真实写入**同一源**（同一 `toolCalls`）⇒ 计划与实际写入**结构性不可漂移**
 * （R-SGO-906 消除）。跨轮**不累积**：每条 assistant 消息各自成计划（R-SGO-915）。
 *
 * ── 三条边界（本模块的全部职责）──────────────────────────────────────────────
 *
 *   ① `buildPlan`      计划边界 = 单条消息的 in-scope `set-text`；`N≥2` 出卡 /
 *                      `N==1` 逐条 / `N==0` 不出（`planMode`）；空计划**不空弹**。
 *   ② `planFingerprint` `sha256:` + `sha256Hex(canonical(selector ∧ actionType ∧
 *                      fromDigest ∧ toText))` —— **逐字节入哈希**（文本对不归一化；
 *                      空白改动 ⇒ 指纹变）+ **摘要出账**（零明文，PD-SGO-006）。
 *   ③ `admitEntry`     条目键 ∈ 已批准计划 ⇒ 放行；**计划外 ⇒ 逐条回落**；
 *                      批准前目标集合**漂移 ⇒ 显式失败**（R-SGO-916 / EC-SGO-014）。
 *
 * ── 红线（本模块的「不许」）────────────────────────────────────────────────────
 *
 *   · **特权 op 恒不入批**：本模块只识别 `dom` + `set-text`；特权 op（授权 / 权限请求两面）
 *     无任何入口（N-SGO-005 / FR-SGO-045；机核见 `test/capability-wiring.test.ts`）。
 *   · **一次点击不放开无限写**：放行判据是**确定性条目键集**（含文本对），
 *     不是「同形状」的开放集合。
 *   · **零明文**：审计 / 出账只允许**指纹摘要**与**计数**，正文 / 译文不进任何面。
 *
 * @module background/batch-plan
 */
import { sha256Hex } from '../protocol/trust.js';

/** 本阶段唯一动作类型（新增动作类型属另一个决策单元，不在本叶）。 */
export const BATCH_ACTION_TYPE = 'set-text' as const;

/** 出计划卡的下界（`N ≥ 2`；`N == 1` 逐条、`N == 0` 不出 —— ADR-SGO-004 §1）。 */
export const BATCH_MIN_ENTRIES = 2;

/** 一条 `toolCall` 的计划视图（结构子集：`WebCliToolCall` / `AskQuestion` 均可赋值）。 */
export interface PlanToolCall {
  readonly name: string;
  readonly subcommand?: string;
  readonly args?: Readonly<Record<string, string>>;
}

/**
 * 一条**回合范围引用**的计划视图（结构子集：`ChatRefFact` 可直接赋值，无需别名）。
 * `textDigest` 已是面板投影处的**掩码后**摘要（EC-SGO-019）—— 本模块不做二次掩码。
 */
export interface PlanRef {
  readonly refNum: number;
  readonly refId: string;
  readonly selector: string;
  readonly textDigest: string;
}

/** 计划的一条（目标 ∧ 动作类型 ∧ 文本对）。 */
export interface BatchPlanEntry {
  /** `--ref` 命中时的引用序号（**入选指纹的不是它** —— 见 §3 的四元组）。 */
  readonly refNum?: number;
  /** 目标选择器（命中引用的**规范选择器**，非调用方原样字符串）。 */
  readonly selector: string;
  readonly actionType: typeof BATCH_ACTION_TYPE;
  /** 原文（匹配引用的冻结 `textDigest`）。 */
  readonly fromDigest: string;
  /** 译文（`set-text` 的 `--text` **逐字节**）。 */
  readonly toText: string;
}

export interface BatchPlan {
  readonly entries: readonly BatchPlanEntry[];
  /** `sha256:<hex>` —— 唯一出账口径（零明文）。 */
  readonly fingerprint: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. 范围成员判据（与 ADR-SGO-002 §2 的两路命中**同口径**）
 *
 * 计划侧只做**成员过滤**（这条调用在不在本回合引用集合内）；写闸的**读数**仍由
 * 面板侧 `l1/ref-scope.ts` 的唯一判定函数持有（法九 L9-1 唯一声明不动）。
 * 两条口径的一致性由 `test/batch-consent.test.ts`（BC-1）以真值表**逐例机核**，
 * 防止未来漂移 —— 这是「不复制第二份判据」的机器保证，而不是靠注释约定。
 * ─────────────────────────────────────────────────────────────────────────── */

/** 目标形状（`--ref n` 与 / 或 `selector`）。 */
export interface PlanTarget {
  readonly selector: string;
  readonly refNum?: number;
}

/** 命中引用的**规范选择器**（路 A：`--ref`；路 B：存储选择器；路 B′：合成锚）。 */
export function matchPlanRef(target: PlanTarget, refs: readonly PlanRef[]): PlanRef | undefined {
  if (target.refNum !== undefined) {
    const byNum = refs.find((r) => r.refNum === target.refNum);
    if (byNum) return byNum;
  }
  const selector = target.selector;
  if (!selector) return undefined;
  return refs.find((r) => selector === r.selector || selector === `[data-wcli-ref="${r.refId}"]`);
}

/** 「目标 ∈ 引用集合」两路命中（ADR-SGO-002 §2 的计划侧同口径）。 */
export function planTargetInRefs(target: PlanTarget, refs: readonly PlanRef[]): boolean {
  return matchPlanRef(target, refs) !== undefined;
}

/**
 * a `set-text` 调用 → 计划条目；**非计划成员 ⇒ `undefined`**（范围内判据在此**唯一**收口）。
 *
 * 排除项：非 `dom` / 非 `set-text` / 无目标 / **目标不在本回合引用集合内**（越界 ⇒ 走
 * 计划外回落或 WIDEN，绝不入计划）。
 */
export function planEntryOf(call: PlanToolCall, refs: readonly PlanRef[]): BatchPlanEntry | undefined {
  if (call.name !== 'dom' || call.subcommand !== BATCH_ACTION_TYPE) return undefined;
  const args = call.args ?? {};
  const selector = String(args.selector ?? '').trim();
  const refRaw = String(args.ref ?? '').trim();
  const refNum = /^\d+$/.test(refRaw) ? Number(refRaw) : undefined;
  if (!selector && refNum === undefined) return undefined; // 无目标的写不进计划
  const ref = matchPlanRef({ selector, ...(refNum !== undefined ? { refNum } : {}) }, refs);
  if (!ref) return undefined; // 越界 / 无法判定 ⇒ 不入计划（fail-closed）
  return Object.freeze({
    refNum: ref.refNum,
    selector: ref.selector,
    actionType: BATCH_ACTION_TYPE,
    fromDigest: ref.textDigest,
    toText: String(args.text ?? ''),
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. 计划构建（系统聚合）
 * ─────────────────────────────────────────────────────────────────────────── */

export type BatchPlanMode = 'card' | 'single' | 'none';

/** `N≥2` 出卡 / `N==1` 逐条 / `N==0` 不出（**空计划不空弹**，EC-SGO-013）。 */
export function planMode(plan: BatchPlan | undefined): BatchPlanMode {
  const n = plan?.entries.length ?? 0;
  return n >= BATCH_MIN_ENTRIES ? 'card' : n === 1 ? 'single' : 'none';
}

/**
 * **系统聚合**（TASK-V55F-206）：单条 assistant 消息的全 `toolCalls` ∩ 回合引用集合。
 *
 * 确定性：同输入 ⇒ 同条目序 ⇒ 同指纹；**跨轮不累积**（调用方每条消息各调一次）。
 */
export async function buildPlan(
  calls: readonly PlanToolCall[] | undefined,
  refs: readonly PlanRef[] | undefined,
): Promise<BatchPlan> {
  const pool = refs ?? [];
  const entries: BatchPlanEntry[] = [];
  for (const call of calls ?? []) {
    const entry = planEntryOf(call, pool);
    if (entry) entries.push(entry);
  }
  const frozen = Object.freeze(entries);
  return Object.freeze({ entries: frozen, fingerprint: await planFingerprint(frozen) });
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. 指纹（TASK-V55F-207）：逐字节入哈希、摘要出账
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * 条目键 = 四元组 `(selector, actionType, fromDigest, toText)` 的 canonical JSON。
 *
 * **逐字节**：三个字符串字段**不归一化**（不 trim / 不折叠空白 / 不大小写折叠）；
 * `JSON.stringify` 对同一对象字面量给出**稳定键序 + 无多余空白**的结果 ⇒ 逐字节可复算。
 */
export function planEntryKey(entry: BatchPlanEntry): string {
  return JSON.stringify({
    selector: entry.selector,
    actionType: entry.actionType,
    fromDigest: entry.fromDigest,
    toText: entry.toText,
  });
}

/** 计划全体的 canonical 文本（条目序即入哈希序）。 */
export function canonicalPlanText(entries: readonly BatchPlanEntry[]): string {
  return `[${entries.map(planEntryKey).join(',')}]`;
}

/**
 * 计划指纹 = `'sha256:' + sha256Hex(canonicalPlanText(entries))`。
 *
 * **摘要出账**：出账 / 审计**只**记本字符串；原文 / 译文**永不**进审计（N-SGO-026）。
 */
export async function planFingerprint(entries: readonly BatchPlanEntry[]): Promise<string> {
  return `sha256:${await sha256Hex(canonicalPlanText(entries))}`;
}

/** 已批准计划的**条目键集**（逐条准入的真判据 —— 不是只比总哈希）。 */
export function approvedEntryKeys(plan: BatchPlan | undefined): ReadonlySet<string> {
  return new Set((plan?.entries ?? []).map(planEntryKey));
}

/** 计划条目数（出账用的机器计数；零明文）。 */
export function planEntryCount(plan: BatchPlan | undefined): number {
  return plan?.entries.length ?? 0;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. 准入 / 计划外回落 / 漂移（TASK-V55F-208）
 * ─────────────────────────────────────────────────────────────────────────── */

/** 计划审批状态（**只由面板真实点击路径写入** —— ADR-SGO-004 §4）。 */
export type BatchConsentState = 'none' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export type BatchAdmission =
  /** 计划内 ∧ 已批准（且未漂移）⇒ 放行，**不再要第二次手势**。 */
  | { readonly kind: 'admitted' }
  /** 计划内 ∧ 待批准 ⇒ 出**一次**计划卡（首次写触发）。 */
  | { readonly kind: 'plan-consent' }
  /** 计划外第 N+1 条 ⇒ 回落逐条确认。 */
  | { readonly kind: 'fallback'; readonly message: string }
  /** 计划已被拒绝 / 中止 ⇒ 计划内全部不执行（零死端：理由可读）。 */
  | { readonly kind: 'rejected'; readonly message: string }
  /** 批准前目标集合漂移 ⇒ 显式失败 + 重新出计划（EC-SGO-014）。 */
  | { readonly kind: 'drift'; readonly message: string };

export const BATCH_FALLBACK_TEXT =
  '该写入不在已经批准的计划内，已回落为逐条确认 —— 一次批准只覆盖计划指纹内的条目（含文本对），不放开无限写。';

export const BATCH_REJECTED_TEXT =
  '该写入所属的批量计划已被拒绝 / 中止，计划内条目不再执行；如需继续请在页面上重新拾取目标后重试。';

export const BATCH_DRIFT_TEXT =
  '计划的目标集合在批准前发生了变化（引用已漂移），已显式失败并按拒绝处理 —— 请重新出计划后重试。';

/** 漂移检测：批准时对计划条目**重校验**其目标 ∈ 当前引用解析集合。 */
export function planDriftProblems(plan: BatchPlan | undefined, refs: readonly PlanRef[]): string[] {
  const problems: string[] = [];
  for (const e of plan?.entries ?? []) {
    const target: PlanTarget = { selector: e.selector, ...(e.refNum !== undefined ? { refNum: e.refNum } : {}) };
    if (!planTargetInRefs(target, refs)) problems.push(`approvalDrift：目标 ${e.selector} 不再解析到活跃引用`);
  }
  return problems;
}

/**
 * **准入裁决（纯函数）**—— 一次手势之后的每条写都从这里过：
 *
 *   ① 条目键 ∉ 已批准集 ⇒ `fallback`（计划外回落；**不是**放行）；
 *   ② 计划被拒 / 中止 ⇒ `rejected`（计划内全部不执行）；
 *   ③ 已批准 ∧ 目标集合漂移 ⇒ `drift`（显式失败，**不静默按旧指纹放行**）；
 *   ④ 已批准 ∧ 未漂移 ⇒ `admitted`；待批准 ⇒ `plan-consent`（出一次计划卡）。
 */
export function admitEntry(
  entry: BatchPlanEntry,
  ctx: { readonly plan?: BatchPlan; readonly state: BatchConsentState },
  refs: readonly PlanRef[],
): BatchAdmission {
  const inPlan = approvedEntryKeys(ctx.plan).has(planEntryKey(entry));
  if (!inPlan) return { kind: 'fallback', message: BATCH_FALLBACK_TEXT };
  if (ctx.state === 'rejected' || ctx.state === 'cancelled') return { kind: 'rejected', message: BATCH_REJECTED_TEXT };
  if (planDriftProblems(ctx.plan, refs).length > 0) return { kind: 'drift', message: BATCH_DRIFT_TEXT };
  if (ctx.state === 'approved') return { kind: 'admitted' };
  return { kind: 'plan-consent' };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. 计划 holder（单源；每回合 `set` / `finally` `clear`）
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * 计划审批 holder —— **唯一**的审批状态写入面。
 *
 * `markApproved` / `markRejected` / `markCancelled` **只允许**由面板真实点击路径
 * （`confirm-resolved`）驱动；AI / LLM 侧模块**不得** import 本模块（BC / RL-06 扩批量
 * 变体机核）—— 「AI 代答计划」因此在结构上不可写。
 */
export interface BatchConsent {
  /** 本回合的计划（`undefined` ⇒ 无计划 ⇒ 逐条路径）。**每条 assistant 消息覆盖**。 */
  setPlan(plan: BatchPlan | undefined): void;
  plan(): BatchPlan | undefined;
  state(): BatchConsentState;
  /** 准入（读状态，不改状态 —— 状态只由面板点击推进）。 */
  admit(entry: BatchPlanEntry, refs: readonly PlanRef[]): BatchAdmission;
  markApproved(): void;
  markRejected(): void;
  markCancelled(): void;
  clear(): void;
}

export function createBatchConsent(): BatchConsent {
  let plan: BatchPlan | undefined;
  let state: BatchConsentState = 'none';
  return {
    setPlan(next) {
      // 阈值在**唯一**入口收口：`N ≥ 2` 才成为「批次」（`N == 1` 逐条、`N == 0` 不出）
      // ⇒ 单条计划**不可能**因批量机制改变语义（EC-SGO-013）。
      const usable = next && planMode(next) === 'card' ? next : undefined;
      plan = usable;
      state = usable ? 'pending' : 'none';
    },
    plan: () => plan,
    state: () => state,
    admit: (entry, refs) => admitEntry(entry, { plan, state }, refs),
    markApproved() {
      if (plan && state === 'pending') state = 'approved';
    },
    markRejected() {
      if (plan && state === 'pending') state = 'rejected';
    },
    markCancelled() {
      if (plan && (state === 'pending' || state === 'approved')) state = 'cancelled';
    },
    clear() {
      plan = undefined;
      state = 'none';
    },
  };
}

/**
 * **生产单例**（`service-worker.ts` 与 `security/confirm.ts` **同源取用**的**唯一**实例）。
 * 每个回合在 `runChat` 的 `chat` 回调里 `setPlan`，`finally` `clear()` ⇒ 零跨回合累积
 * （R-SGO-915）。
 */
export const batchConsent: BatchConsent = createBatchConsent();
