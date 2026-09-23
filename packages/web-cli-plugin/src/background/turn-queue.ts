/**
 * V5.5-3 **TASK-V55-309 / 311** (ADR-V55-010 §1/§2/§4 · FR-SELF-061 · AC-SELF-014 ·
 * X-SELF-7 · R-V55-106/107) — the **bounded turn-arbitration queue**.
 *
 * ── 为什么有这个模块 ──────────────────────────────────────────────────────────
 *
 * 现状（C5 / X-SELF-7）：`chatBusy` 单飞 —— 并发第二条**被丢弃**并回错误。主题② 让
 * AI 也能发起回合后，撞车成为常态，用户输入**可能被静默吞掉**（US-SELF-009 /
 * EC-SELF-013 的母缺陷）。ADR-V55-010 的裁决：**有界排队（1）+ 溢出明确拒绝 + 草稿回填**。
 *
 * 本模块只放**纯逻辑**（常量 + 队列 + 裁决函数），落点在 `background/`（SW bundle）⇒
 * **零 sidepanel 字节**（ADR-V55-010 §4）；面板侧只负责「可见留痕 + 草稿回填」。
 *
 * 队列本体与「一个在飞回合」是**同一生命周期**的两种状态，所以它与 `chatBusy` 同居 SW：
 * 队列**硬上限 1**（`TURN_QUEUE_MAX`，单源）、**FIFO**、**永不无界**、**永不静默**。
 *
 * @module background/turn-queue
 */
import { ARBITRATION_RESULTS, type ArbitrationResult } from './chat-events.js';
import type { ChatRefFact } from './messaging.js';

/**
 * 队列**硬上限**（ADR-V55-010 §2 判据：队列长度恒 ≤ 1）。**单源** ——
 * `service-worker.ts` 与门禁都从这里取；散落第二份字面量即 FAIL（R-V55-106）。
 */
export const TURN_QUEUE_MAX = 1;

/**
 * 仲裁闭集（4 项）与 {@link ARBITRATION_RESULTS} 同源 —— 本模块**不**另写一份联合，
 * 只把闭集宽度给门禁做穷举断言用。
 */
export const ARBITRATION_RESULT_COUNT = ARBITRATION_RESULTS.length;

/** 一条被排队的回合：**绑定入队时的 session**（ADR-V55-010 §后果：session 语义二选一显式）。 */
export interface QueuedTurn {
  readonly user: string;
  readonly sessionId: string | null;
  readonly at: number;
  /**
   * V5.5F-1 **TASK-V55F-107** (ADR-SGO-001 §3 · FR-SGO-019) — 入队时的**引用快照**。
   * 排队回合**自带快照** ⇒ drain 出的回合用**入队时**的事实，**零跨回合漂移**。
   * 缺省（零引用）⇒ 字段缺席 ⇒ 行为与现状逐字相同。
   */
  readonly refs?: readonly ChatRefFact[];
}

/**
 * 纯裁决（把 ADR-V55-010 §2 的三条路径写成**一条可穷举**的函数；反证从它实跑）：
 *
 *   · 非在飞 ⇒ `executed`（既有单飞路径）；
 *   · 在飞 ∧ 队列有余量 ⇒ `queued`（FIFO）；
 *   · 在飞 ∧ 队列已满 ⇒ `busy-rejected`（**明确拒绝**，不是静默丢弃）。
 */
export function classifyChatRequest(
  busy: boolean,
  queueLength: number,
  max: number = TURN_QUEUE_MAX,
): ArbitrationResult {
  if (!busy) return 'executed';
  return queueLength < max ? 'queued' : 'busy-rejected';
}

export interface TurnQueue {
  /** 当前排队条目数（**恒 ≤ `TURN_QUEUE_MAX`**）。 */
  size(): number;
  /** 入队裁决：`queued`（已入队）/ `busy-rejected`（满，拒绝且不入队）。 */
  enqueue(turn: QueuedTurn): 'queued' | 'busy-rejected';
  /** 取出队首（FIFO）；空 ⇒ `undefined`。 */
  drain(): QueuedTurn | undefined;
  /** 清空（测试 seam / 会话收口）。 */
  clear(): void;
}

/**
 * 有界 FIFO 队列（**恰一份实现**）。`max` 默认取单源常量 —— 测试可注入更小的值来
 * 证明「溢出被拒绝」而不是「先无界后截断」。
 */
export function createTurnQueue(max: number = TURN_QUEUE_MAX): TurnQueue {
  const items: QueuedTurn[] = [];
  return {
    size: () => items.length,
    enqueue(turn) {
      if (items.length >= max) return 'busy-rejected';
      items.push(turn);
      return 'queued';
    },
    drain: () => items.shift(),
    clear() {
      items.length = 0;
    },
  };
}
