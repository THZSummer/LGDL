/**
 * V5-1 TASK-V5-111/112 (ADR-V5-001) — the **Consumer**: the single-lookup chip
 * dispatcher. `ACT_TO_OP` (恰 6 行) is the only act→opId authority; a chip is
 * dispatched by `dispatchChipAction` with **一次查表、零 per-op 分支**.
 *
 * @module ui/sidepanel/next-registry/dispatch
 */
import { OPS_BY_ID, runOp } from './pipeline.js';

/** FR-ALLN-056 — the **6** equivalent act→opId mappings (唯一权威、双向可查). */
export const ACT_TO_OP = Object.freeze({
  next: 'op.turn',
  repick: 'op.pick',
  describe: 'op.describe',
  authorize: 'op.authorize',
  rebind: 'op.rebind',
  help: 'op.help',
} as const);
export type NextstepAct = keyof typeof ACT_TO_OP;

/** The reverse lookup (`opId → act`) — derived, never a second hand-written table. */
export const OP_TO_ACT: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(ACT_TO_OP).map(([act, opId]) => [opId, act])),
);

/**
 * 集 A — the card-protocol actions (`askuser` / `auth` / `ref` / `nextstep` card
 * families) that never carry `data-op`; they stay in `handleCardAction` and are
 * **not** op fan-out.
 *
 * ★ IAN-1（ADR-IAN-001 §②）：`free-input` 为**第九**项 —— 推荐卡末端终端以
 * `data-act='free-input'` 分发（与 `choose-other` / `reanchor` 同构），不进 `ACT_TO_OP`
 * （仍恰 6 行）；提交经唯一生产输入点 `op.turn` 槽。
 */
export const SET_A_PROTOCOL_ACTIONS = Object.freeze([
  'answer',
  'choose',
  'cancel',
  'approve',
  'reject',
  'audit',
  'hover',
  'reanchor',
  'free-input',
] as const);

/** ★ IAN-1（ADR-IAN-001 §①）：终端文案**唯一源**（provider `textOf` + 渲染层共读）。
 * 终端**不是** `.next-chip`（不被 pending 禁用）也不进 `MAX_CHIPS_PER_CARD` 预算。 */
export const FREE_INPUT_LABEL = '自由输入…';


/**
 * A non-chip alias: the `ref` card's「改用描述」fallback submit is the *same* op as
 * the `describe` chip, distinguished by the payload value (`op.describe` branches on
 * it). Keeping it out of `ACT_TO_OP` preserves the「恰 6 行」authority.
 */
export const CHIP_ACTION_ALIASES = Object.freeze({ 'describe-submit': 'op.describe' } as const);

/** FR-ALLN-057/058 — chip dispatch: one lookup, one `runOp` call, zero per-op branch. */
export function dispatchChipAction(action: string, value?: string): boolean {
  const opId =
    ACT_TO_OP[action as NextstepAct] ??
    CHIP_ACTION_ALIASES[action as keyof typeof CHIP_ACTION_ALIASES] ??
    (OPS_BY_ID[action] ? action : undefined);
  if (!opId) return false;
  void runOp(opId, { value });
  return true;
}
