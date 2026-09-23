/**
 * V5.5-2 **TASK-V55-210 / 211** (ADR-V55-007 §2/§3 · FR-SELF-045/046/050 · AC-SELF-007 ·
 * R-SELF-904 · EC-SELF-011/012) — the **配置悬置任务**：谁在等 / 等什么 / 依据什么事实，
 * 以及它的**有界性**（`MAX = 1`）、**有效期重校验**与**续接决策**。
 *
 * ── 单源（不新开真值源）──────────────────────────────────────────────────────
 *
 * 登记**不新造第二个事实通路**：它经 v55-1 的**唯一**登记入口
 * `drivers.ts#registerSuspension` 落进同一份 `SUSPENSIONS`。本模块是该入口在
 * **「等待配置」语境**下的**唯一**调用点（`CONFIG_SUSPENSION_SOURCE` 在 `src/**`
 * 只出现一次 ⇒ 门禁机核；第二处登记 ⇒ FAIL）。
 *
 * 本模块只加**策略**，不加**载体**：
 *   · `MAX_SUSPENSIONS = 1` —— 有界可判（同 MAX_OPEN_ASKS 的诚实有界口径）。新来者
 *     **不叠加**：已有一条**不同**意图时返回 `over-capacity`，**由调用方留痕**（固化一行
 *     「原任务优先保留、本条新意图未叠加」的事实行，**不静默丢**）；同一意图重复 ⇒ `deduped`
 *     （幂等，NFR-SELF-010）。口径订正（review R1 I-02）：旧任务**并未**被新意图取代 ——
 *     保留的是**最早**的那条意图，因此注释与实现同口径（不伪称「已被取代」）。
 *   · **有效期重校验** —— 续接**先校验**再交付：站点已变 ∨ 会话已切换 ∨ 引用已失效
 *     ⇒ `invalidated`（**不制造假成功**），且**不复用**旧输入。
 *   · **空悬置非死端** —— `empty` 是一个显式读数，调用方仍产出可达 next（EC-SELF-012）。
 *
 * ── 口径（诚实登记）──────────────────────────────────────────────────────────
 *
 *   · 悬置活在本会话（内存单源）⇒「跨会话 / 重启后续接」**不在本 Feature**，这也正是
 *     「会话切换 ⇒ 失效」天然成立的原因（ADR-V55-007 §后果）；
 *   · `instruction` 是用户原话，**只在内存**里（不进流内文案 / 不进 digest / 不进审计，
 *     法八不破）；`evidence` 装的是**上下文摘要**（站点 origin / 会话 id —— 非凭据值）。
 *
 * @module ui/sidepanel/next-registry/suspension
 */
import { listSuspensions, registerSuspension, type Suspension } from './drivers.js';
import { ONBOARD_CHIP_OP } from './onboarding-flow.js';
import { blockedTerminalOf } from './providers.js';

/** 上界 = 1（有界可判；见模块头 §单源）。 */
export const MAX_SUSPENSIONS = 1;

/** 「等待配置」语境的来源键（= 悬置任务三要素之「等什么」）。 */
export const CONFIG_SUSPENSION_SOURCE = 'llm-config';

/**
 * 等待的正是「LLM 配好」这件事：driverId = 该 op 所修复的阻塞终态（**从唯一双射行反查**
 * —— 阻塞态字面量零第二处，BT-1 红线）。
 */
export const CONFIG_SUSPENSION_DRIVER = blockedTerminalOf(ONBOARD_CHIP_OP) ?? '';

/** 上下文摘要的键（`evidence` 单源；值 = 站点 origin / 会话 id，**非凭据**）。 */
const ORIGIN_PREFIX = 'origin:';
const SESSION_PREFIX = 'session:';

/** 登记 / 续接判据用的上下文读数（零明文：只放非凭据的既有事实）。 */
export interface SuspensionContext {
  readonly origin?: string;
  readonly sessionId?: string;
}

export type RegisterOutcome = 'registered' | 'deduped' | 'over-capacity';

const digestOf = (ctx: SuspensionContext): readonly string[] =>
  Object.freeze([`${ORIGIN_PREFIX}${ctx.origin ?? ''}`, `${SESSION_PREFIX}${ctx.sessionId ?? ''}`]);

/** 有效期：上下文摘要逐项命中（站点未变 ∧ 会话未切换）。 */
const digestMatches = (evidence: readonly string[], ctx: SuspensionContext): boolean =>
  evidence.includes(`${ORIGIN_PREFIX}${ctx.origin ?? ''}`) && evidence.includes(`${SESSION_PREFIX}${ctx.sessionId ?? ''}`);

/** 当前**唯一**的「等待配置」悬置任务（单源查询：读 v55-1 的同一份登记）。 */
export function pendingSuspension(): Suspension | undefined {
  return listSuspensions()
    .filter((s) => s.source === CONFIG_SUSPENSION_SOURCE)
    .slice(-1)[0];
}

/**
 * 登记一条「等待配置」悬置任务 —— **本模块是 `registerSuspension` 在配置语境下的唯一
 * 调用点**。空意图**不占位**（不制造假悬置）；同因 ⇒ `deduped`；已有不同意图 ⇒
 * `over-capacity`（**不叠加**，`MAX_SUSPENSIONS = 1` 因此是可判事实）——该返回值是**契约**：
 * 调用方必须**消费**它并留痕（review R1 I-02：不得静默丢弃）。
 */
export function registerConfigSuspension(instruction: string, ctx: SuspensionContext): RegisterOutcome {
  const trimmed = instruction.trim();
  if (!trimmed) return 'over-capacity';
  const live = pendingSuspension();
  if (live) return live.instruction === trimmed ? 'deduped' : 'over-capacity';
  registerSuspension({
    driverId: CONFIG_SUSPENSION_DRIVER,
    source: CONFIG_SUSPENSION_SOURCE,
    kind: 'answered',
    late: false,
    instruction: trimmed,
    evidence: [...digestOf(ctx)],
  });
  return 'registered';
}

export type ResumeStatus = 'resumed' | 'invalidated' | 'empty';
export interface ResumeOutcome {
  readonly status: ResumeStatus;
  /** 仅 `resumed` 时给出（其余状态**不交付**旧输入，防假成功）。 */
  readonly instruction?: string;
}
export interface ResumeFacts extends SuspensionContext {
  /** 「那句话」本身是否仍然有效（既有 L1 判定）；显式 `false` ⇒ 失效。 */
  readonly intentStillValid?: boolean;
}

/**
 * **续接（唯一续接点）**：先做有效期重校验，再交付输入。
 * `empty` / `invalidated` 都**不是死端**——调用方仍产出可达 next（EC-SELF-011/012）。
 */
export function resumeSuspension(facts: ResumeFacts): ResumeOutcome {
  const live = pendingSuspension();
  if (!live) return { status: 'empty' };
  if (facts.intentStillValid === false || !digestMatches(live.evidence, facts)) return { status: 'invalidated' };
  return { status: 'resumed', instruction: live.instruction };
}
