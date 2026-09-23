/**
 * V5.5F-1 **TASK-V55F-105** (ADR-SGO-001 §3 · ADR-SGO-003 §3 · FR-SGO-019/038 ·
 * NFR-SGO-008 · NG-SGO-013 · R-SGO-912/913) — the **当前回合活跃引用单源**.
 *
 * ── 为什么是「回合快照」而不是「面板→SW 引用表通道」─────────────────────────────
 *
 * SW 的引用事实**唯一来源 = 回合载荷**（FR-SGO-019）：快照由面板在**回合发起时**读取，
 * 随 `chat` 消息下发。本模块只在 SW 侧**持有一份本回合的只读副本**——
 *   ① **零新建面板→SW 通道**（无第二真值源，根因 E 结构性消除）；
 *   ② **零每回合页面探测**（NG-SGO-013 / NFR-SGO-008）——回合用**已有事实**判范围，
 *      唯一的 live 只读观测是 `--ref` 的**每写一次**单节点闸（ADR-SGO-003 §5，R-SGO-913）；
 *   ③ 每回合 `set` / `finally` `clear` ⇒ **零跨回合漂移**（排队回合自带快照，见
 *      `turn-queue.ts#QueuedTurn.refs`）。
 *
 * holder 一并持有 `refs` + `tabId` + `observe` 缝：`--ref` 的 live 单节点闸与
 * 「作为范围锚」的解析读数**同源取用**（ADR-SGO-003 §3），不需要第二条通道。
 *
 * @module background/ref-turn
 */
import type { ChatRefFact } from './messaging.js';

/**
 * 只读身份观测的形状（与 `observeIdentity` 的返回**同形**；R6 只读面复用）。
 * 只含事实，**不写页面**（`querySelectorAll` / `getAttribute` / `textContent`）。
 */
export interface RefObservation {
  readonly status: 'resolved' | 'missing' | 'ambiguous' | 'invalid-selector';
  readonly refMark?: string;
  readonly nodeCount?: number;
  readonly textDigest?: string;
}

/** 只读观测缝（SW 注入 `observeIdentity`；W3 抽为 `background/ref-observe.ts` 单一实现）。 */
export type RefObserver = (tabId: number, selector: string) => Promise<RefObservation | undefined>;

/** 一个回合的引用快照（入队时定格 ⇒ drain 出的回合用它自己的快照）。 */
export interface RefTurnSnapshot {
  readonly refs: readonly ChatRefFact[];
  /** 本回合的注入目标标签页（`--ref` live 闸同源取用）。 */
  readonly tabId?: number;
  /** 只读观测缝（每写一次的单节点闸；缺省 ⇒ 该回合不做 live 闸）。 */
  readonly observe?: RefObserver;
}

export interface RefTurnHolder {
  /** 回合开始：把本回合快照定格（覆盖上一回合的残留）。 */
  set(snapshot: RefTurnSnapshot): void;
  /** 回合结束（`finally`）：清空 ⇒ 下一个回合不会看到上一个回合的引用。 */
  clear(): void;
  /** 本回合的活跃引用（只读副本；无回合 ⇒ 空数组）。 */
  refs(): readonly ChatRefFact[];
  /** 按稳定业务序号取一条本回合引用（`--ref n` 解析路 A）。 */
  refOf(refNum: number): ChatRefFact | undefined;
  /** `--ref` live 闸的取用面（`tabId` + 只读观测缝）。 */
  observeTarget(): { readonly tabId?: number; readonly observe?: RefObserver } | undefined;
}

/**
 * **恰一份**实现。纯数据 + 无 `chrome.*`（node 可测）；状态只有「当前回合」一档 ⇒
 * 不存在跨回合漂移面。
 */
export function createRefTurnHolder(): RefTurnHolder {
  let current: RefTurnSnapshot | null = null;
  return {
    set(snapshot) {
      current = { refs: Object.freeze([...snapshot.refs]), ...(snapshot.tabId !== undefined ? { tabId: snapshot.tabId } : {}), ...(snapshot.observe ? { observe: snapshot.observe } : {}) };
    },
    clear() {
      current = null;
    },
    refs: () => current?.refs ?? [],
    refOf: (refNum) => current?.refs.find((r) => r.refNum === refNum),
    observeTarget() {
      if (!current) return undefined;
      return {
        ...(current.tabId !== undefined ? { tabId: current.tabId } : {}),
        ...(current.observe ? { observe: current.observe } : {}),
      };
    },
  };
}
