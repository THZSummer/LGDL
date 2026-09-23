/**
 * V5.5-3 **TASK-V55-305 / 306 / 313** (ADR-V55-009 §3/§5 · ADR-V55-010 §3 · FR-SELF-063/064/065 ·
 * AC-SELF-008 · R-V55-104 / LNG-V55-3-003) — the **按下策略单源**（`pressCandidate`）+
 * `driverClass` 权限矩阵 + 留痕三要素（`driverTraceLine`）.
 *
 * ── 三条铁律（每处守卫都 loud，零第二处）─────────────────────────────────────
 *
 *   ① **候选恒由注册表产出**：`opId` 未命中描述符表 ⇒ `blocked:unknown-op`（AI 不得自造 chip /
 *      opId —— FR-SELF-065 / LNG-V55-3-003）；
 *   ② **只有 `ai-driven` 驱动者 + `auto` 档**才可能自动按下：`confirm` / `gesture` 档一律
 *      `blocked:tier`（ADR-V55-008 §3 —— 特权 op 连「产出可见 next」都只走既有手势路径）；
 *   ③ **自动按下点恰 1 处**：本模块只此一个 `dispatchChipAction(`，回合仍经**既有** `op.turn`
 *      槽 ⇒ `requestTurn(` 调用点计数不变（`test/op-wiring.test.ts` 钉死恰 2）。
 *
 * ── 与 `guard.ts`（W4）/ 仲裁（W3）的关系 ────────────────────────────────────
 *
 * `guardAllowed` 与 `busy` 都是**注入判据**（不是本模块的常量）：W3 的仲裁结果与 W4 的六常量
 * 经此二缝接入，本模块不新增第二份阈值（ADR-V55-009 §1 的单源纪律）。
 *
 * @module ui/sidepanel/next-registry/ai-drive
 */
import { opDescriptor, tierOf } from '../../../shared/op-table.js';
import { dispatchChipAction } from './dispatch.js';
import type { DriverClass } from './drivers.js';
import { panelNotice } from './ops.js';

/** 谁在按下（`ai` = 主动性；`deterministic` = 主题① 的确定性流，**无自动按下权**）。 */
export const PRESS_ACTORS = Object.freeze(['ai', 'deterministic'] as const);
export type PressActor = (typeof PRESS_ACTORS)[number];

/**
 * `driverClass` 权限矩阵（**恰一处**）：只有 `ai-driven` 驱动者有权自动按下。
 * 确定性驱动者的回合恒经既有 `dispatchOp('op.turn')`（主题① 流程），不经本模块
 * —— FR-SELF-065「确定性驱动者无自动按下权」因此是可判事实。
 */
export const DRIVER_CLASS_CAN_PRESS: Readonly<Record<DriverClass, boolean>> = Object.freeze({
  deterministic: false,
  'ai-driven': true,
});

/** 拒绝原因（闭集；`blocked:` 前缀由调用方拼装）。 */
export type PressBlocked = 'unknown-op' | 'tier' | 'driver-class' | 'unconfigured' | 'not-armed' | 'busy' | 'guard';

/** 一次按下的上下文（判据**全部**来自调用方注入，本模块零第二份阈值）。 */
export interface PressContext {
  readonly actor: PressActor;
  /** 产出该候选的驱动者 id（留痕三要素之一「谁发起」；⊆ `listDriverDecls()` 的 id 集）。 */
  readonly driverId: string;
  /** 产出该候选的驱动者的类（⊆ `DRIVER_CLASSES`）。 */
  readonly driverClass: DriverClass;
  /** 主题② 前提：已配置（配置判据 = v55-2 的唯一分流依据，FR-SELF-070）。 */
  readonly configured: boolean;
  /** 本次结算事件已武装（一次结算至多一次自动按下 —— 事件作用域的有界性）。 */
  readonly armed: boolean;
  /** 在飞回合（W3 仲裁注入：AI 撞车一律**不发起**，ADR-V55-010 §3）。 */
  readonly busy?: boolean;
  /** W4 护栏六常量缝（缺席 ⇒ 本模块不叠加任何阈值）。 */
  readonly guardAllowed?: () => boolean;
}

export type PressDecision = { readonly ok: true } | { readonly ok: false; readonly blocked: PressBlocked };

/**
 * **唯一**的按下判定（纯函数；反证从它实跑）。顺序即语义优先级：
 * 未注册 ⇒ 档位 ⇒ 驱动者类（仅 `ai`）⇒ 已配置 ⇒ 在飞 ⇒ 武装 ⇒ 护栏。
 */
export function pressDecision(opId: string, ctx: PressContext): PressDecision {
  const d = opDescriptor(opId);
  if (!d) return { ok: false, blocked: 'unknown-op' };
  if (tierOf(d) !== 'auto') return { ok: false, blocked: 'tier' };
  if (ctx.actor === 'deterministic') return opId === 'op.turn' ? { ok: true } : { ok: false, blocked: 'tier' };
  if (DRIVER_CLASS_CAN_PRESS[ctx.driverClass] !== true) return { ok: false, blocked: 'driver-class' };
  if (!ctx.configured) return { ok: false, blocked: 'unconfigured' };
  if (ctx.busy === true) return { ok: false, blocked: 'busy' };
  if (!ctx.armed) return { ok: false, blocked: 'not-armed' };
  if (ctx.guardAllowed && !ctx.guardAllowed()) return { ok: false, blocked: 'guard' };
  return { ok: true };
}

/**
 * 留痕三要素（**单源**，FR-SELF-063 / ADR-V55-009 §5）：`driver=<id> | timing=<时机> |
 * evidence=<ctx 字段名集>` —— 只含**字段名**，**不含任何值**（零明文：Key / 答案全文 /
 * URL query 都不进摘要）。`ts` 由流内行自身承载（行的 `at` 即时刻），本行不重复时间戳。
 */
export function driverTraceLine(driverId: string, timing: string, evidence: readonly string[]): string {
  return `driver=${driverId} | timing=${timing} | evidence=${evidence.join(',')}`;
}

/**
 * V5.5-3 **TASK-V55-313** (ADR-V55-009 §5 · FR-SELF-096 · AC-SELF-006) — 抑制**留痕**
 * 的单源行：`driver=… | timing=… | evidence=… | suppressed=<reason>`。
 *
 * 「被抑制」与「没反应」必须**可判**（用户能看到刚才是被频次 / 静默 / 预算还是链深挡住），
 * 所以抑制走**可读行**而不是静默 return（FR-SELF-096 的判据）。`reason` 取自
 * `guard.ts#GUARD_BLOCK_REASONS`（词表单源），本函数只做拼装。
 */
export function driverSuppressedLine(driverId: string, timing: string, evidence: readonly string[], reason: string): string {
  return `${driverTraceLine(driverId, timing, evidence)} | suppressed=${reason}`;
}

export interface PressOutcome {
  readonly ok: boolean;
  readonly blocked?: PressBlocked;
  readonly trace: string;
}

/**
 * 按下一次候选 —— **唯一自动按下点**（`dispatchChipAction` 在本模块恰 1 处）。
 *
 * 拒绝**不是死端**：`confirm` 档被拒 ⇒ 可见 next 仍由既有推荐器产出（用户可点）；`gesture` 档
 * 被拒 ⇒ 既有手势 chip 仍在流内。AI 路径的拒绝写一行可读留痕（含被拒原因，零明文）。
 */
export function pressCandidate(
  opId: string,
  value: string,
  ctx: PressContext,
  evidence: readonly string[] = [],
  timing = 'answered',
): PressOutcome {
  const trace = driverTraceLine(ctx.driverId, timing, evidence);
  const decided = pressDecision(opId, ctx);
  if (!decided.ok) {
    if (ctx.actor === 'ai') panelNotice(`${trace} | blocked=${decided.blocked}`);
    return { ok: false, blocked: decided.blocked, trace };
  }
  panelNotice(trace);
  dispatchChipAction(opId, value);
  return { ok: true, trace };
}
