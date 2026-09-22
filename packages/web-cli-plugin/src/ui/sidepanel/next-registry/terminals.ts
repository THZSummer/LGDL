/**
 * V5.5-1 **TASK-V55-102** (ADR-V55-003 §1/§4/§5 · FR-SELF-020 / 023 · AC-SELF-003 ·
 * R-V55-103) — the **driver terminal vocabulary** (法七扩展的终态词表).
 *
 * ── 两表**正交**（本模块存在理由）─────────────────────────────────────────────
 *
 * `stream-model.ts#STREAM_TERMINALS`（6 项，**零改动**）= **卡的生命周期**
 * （`answered` / `cancelled` / `approved` / `rejected` / `invalidated` / `completed`）。
 * 本模块的 `DRIVER_TERMINALS`（**恰 4**）= **「用户已表达意图」的可判事件**：
 *
 *   | 终态 | 含义 |
 *   |---|---|
 *   | `answered-ref` | ① 引用回合 ask（`ref-round-<refId>`）已答 |
 *   | `answered-op`  | ① 面板 op `params` ask 已答 |
 *   | `answered-bg`  | ① 后台 ask 已答（**在飞回合内**；迟到 **不记**） |
 *   | `describe-submitted` | ②「改用描述」已交 |
 *
 * 两者**不得混用**（R-V55-103）：交集为 ∅ ∧ `STREAM_TERMINALS` 6 逐字 ∧ 本表恰一处声明。
 *
 * ── 「已答」四口径（FR-SELF-023 / EC-SELF-005）——每条都可注入违反面 ─────────────
 *
 *   ① 已答 = `canceled === false` ∧ `trimmed !== ''`；
 *   ② 已取消 = `canceled === true` ∨ `trimmed === ''` ⇒ **不记「已答」**（另记，且仍必有可达 next）；
 *   ③ `ASK_CANCEL_REASONS` **4 项逐字**（`user`/`timeout`/`superseded`/`aborted`）；
 *   ④ 后台 ask **迟到**（回合已结束）⇒ **不记「已答」**（固化事实 + 可达 next，见 ADR-V55-004 §3）。
 *
 * ── 禁恒真：三段控制读数（ADR-V55-003 §5）────────────────────────────────────
 *
 * {@link driverTerminalReading} 返回 `'ok' | 'violated' | 'n/a'` **三态**而不是布尔：
 * ① 正常段 ⇒ `ok`；② 反证段（终态在但驱动者被移除）⇒ `violated`；③ 对照段（终态不存在）
 * ⇒ `n/a`（**既非 PASS 也非 FAIL**，单独计数，不与 PASS 混池）。
 *
 * @module ui/sidepanel/next-registry/terminals
 */
import { ASK_CANCEL_REASONS, STREAM_TERMINALS } from '../stream-model.js';

/**
 * 驱动者终态词汇（**恰 4**，第二声明 ⇒ FAIL）。这是本 Feature 里这些字面量的**唯一**
 * 声明处：`src/**` 的其它文件不得再写一份（`test/driver-terminals.test.ts` 机核）。
 */
export const DRIVER_TERMINALS = Object.freeze([
  'answered-ref',
  'answered-op',
  'answered-bg',
  'describe-submitted',
] as const);
export type DriverTerminal = (typeof DRIVER_TERMINALS)[number];

/**
 * 正交判据：`STREAM_TERMINALS`（6 逐字）∩ `DRIVER_TERMINALS`（4）=== ∅。
 * 参数可注入（门禁用注入副本实跑反证；默认读真实两表）。
 */
export function orthogonalityProblems(
  streamTerminals: readonly string[] = STREAM_TERMINALS,
  driverTerminals: readonly string[] = DRIVER_TERMINALS,
): string[] {
  const problems: string[] = [];
  if (driverTerminals.length !== 4) problems.push(`驱动者终态词汇恰 4：实测 ${driverTerminals.length} 项`);
  if (streamTerminals.length !== 6) problems.push(`STREAM_TERMINALS 恰 6（逐字不动）：实测 ${streamTerminals.length} 项`);
  const inter = driverTerminals.filter((t) => streamTerminals.includes(t));
  if (inter.length > 0) problems.push(`两表必须正交（流终态 = 卡生命周期；驱动者终态 = 已表达意图）：交集 ${inter.join(', ')}`);
  const dup = driverTerminals.filter((t, i) => driverTerminals.indexOf(t) !== i);
  if (dup.length > 0) problems.push(`驱动者终态词汇不得重复：${dup.join(', ')}`);
  return problems;
}

/** 四条「已答」口径的**显式登记**（每条都在门禁里有可注入的违反面）。 */
export const ANSWERED_CALIBERS = Object.freeze([
  { id: 'answered', rule: 'canceled === false ∧ trimmed !== ""（非取消 + 非空）' },
  { id: 'cancelled', rule: 'canceled === true ∨ trimmed === "" ⇒ 不记「已答」（另记，仍必有可达 next）' },
  { id: 'cancel-reasons', rule: `ASK_CANCEL_REASONS 逐字不变（${ASK_CANCEL_REASONS.join('/')}）` },
  { id: 'late-background', rule: '后台 ask 迟到（回合已结束）⇒ 不记「已答」（固化事实 + 可达 next）' },
] as const);
export type AnsweredCaliberId = (typeof ANSWERED_CALIBERS)[number]['id'];

/** 一次作答的四口径读数（`'n/a'` = 判据前提不成立，单独计数）。 */
export type AnswerVerdict = 'answered' | 'cancelled' | 'late' | 'n/a';
export interface AnswerFacts {
  readonly canceled?: boolean;
  readonly value?: string;
  /** 回合已结束（`askBridge.settle` 返回 `false`）⇒ 迟到。 */
  readonly late?: boolean;
}

/**
 * 四口径判定（**纯函数**）。迟到优先于其余口径 —— 迟到作答**永不**成立「已答」，
 * 即便文本非空且未取消（ADR-V55-003 §4 ④）。
 */
export function answeredCaliber(input: AnswerFacts): AnswerVerdict {
  if (input.canceled === undefined && input.value === undefined && input.late === undefined) return 'n/a';
  if (input.late === true) return 'late';
  const trimmed = (input.value ?? '').trim();
  if (input.canceled === true || trimmed === '') return 'cancelled';
  return 'answered';
}

/** 终态 → 归属的「已表达意图」时刻（时刻词表在 `drivers.ts#PROACTIVE_MOMENTS` 单源）。 */
export const DRIVER_TERMINAL_MOMENT: Readonly<Record<DriverTerminal, string>> = Object.freeze({
  'answered-ref': 'answered-ask',
  'answered-op': 'answered-ask',
  'answered-bg': 'answered-ask',
  'describe-submitted': 'describe-submitted',
});

/** 需要口径①为真才允许入终态的三型（`describe-submitted` 不要求非空文本——空描述根本不入终态）。 */
export const DRIVER_TERMINAL_REQUIRES_ANSWER: readonly DriverTerminal[] = Object.freeze([
  'answered-ref',
  'answered-op',
  'answered-bg',
]);

/** 三段控制读数（ADR-V55-003 §5）。 */
export interface DriverTerminalVerdict {
  readonly status: 'ok' | 'violated' | 'n/a';
  readonly terminal?: DriverTerminal;
  readonly moment?: string;
  readonly driver?: string;
  readonly next?: string | null;
}

/** 门禁注入面：驱动者查找 + 可达 next 查找（两者都可被反证注入替换）。 */
export interface DriverTerminalFacts {
  readonly terminal?: DriverTerminal;
  readonly canceled?: boolean;
  readonly value?: string;
  readonly late?: boolean;
  readonly driversForMoment: (moment: string) => readonly string[];
  readonly nextOf: () => string | null;
}

/**
 * 「必有下一个驱动者」的**单条判据读数**（`N = 0`；紧随状态派发之后，零新等待窗口）。
 *
 * 三段控制：终态不存在 ⇒ `n/a`；终态在但驱动者集为空 / 无可达 next / 口径①不成立
 * ⇒ `violated`；否则 `ok`。
 */
export function driverTerminalReading(f: DriverTerminalFacts): DriverTerminalVerdict {
  const terminal = f.terminal;
  if (!terminal) return { status: 'n/a' };
  if (DRIVER_TERMINAL_REQUIRES_ANSWER.includes(terminal)) {
    const verdict = answeredCaliber({ canceled: f.canceled, value: f.value, late: f.late });
    if (verdict !== 'answered') return { status: 'violated', terminal };
  } else if (f.late === true) {
    // 迟到作答对任何终态都不成立（`describe-submitted` 亦然：它由用户主动提交）。
    return { status: 'violated', terminal };
  }
  const moment = DRIVER_TERMINAL_MOMENT[terminal];
  const drivers = f.driversForMoment(moment);
  if (drivers.length === 0) return { status: 'violated', terminal, moment };
  const next = f.nextOf();
  if (next === null || next === undefined) return { status: 'violated', terminal, moment, driver: drivers[0] };
  return { status: 'ok', terminal, moment, driver: drivers[0], next };
}
