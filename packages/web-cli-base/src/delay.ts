/**
 * 全局 delay 机制（ADR-003）：路由层「命令间最小间隔」。
 *
 * 语义（FR-014）：
 *   - 挂 CommandRouter 统一分发入口，跨所有已注册工具生效（FR-013）
 *   - 间隔 = 相邻分发**执行起点**之间的最小间距：距上一 delay-eligible 命令
 *     的执行起点不足 delayMs 则补齐（连续两普通命令起点间隔 = max(delayMs, 执行耗时)）
 *   - 首个分发（无上一命令起点记录）不等待
 *   - 与显式 sleep 不叠加：sleep 工具条目声明 delayMs:0 免除（FR-016），
 *     sleep 自身执行时长即计入间隔——机制层零特判、零领域知识（ADR-003）
 *   - delay 静默生效：不注入 tool 结果文本、不产生额外消息（FR-017）
 *
 * 观测（FR-017）：stats（waitCount/waitedMs）+ onDelay 钩子 + 时钟注入供测试/调试。
 * 本文件零 LGDL import/文案（NFR-001）。
 */
export interface Clock {
  /** 时间源（真实 = Date.now；测试 = 手动推进的记账时钟）。 */
  now(): number;
  /** 等待原语（真实 = setTimeout；测试 = 记账零等待）。 */
  sleep(ms: number): Promise<void>;
}

/** 真实时钟（默认）。 */
export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * 非法配置钳制（EC-009）：<0 或 >5000 → 钳制到 [0,5000]；
 * NaN/非数字 → 0（关闭）。不静默产生意外长等待。
 */
export function clampDelayMs(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v > 5000) return 5000;
  return v;
}

export interface DelayStats {
  /** 实际发生补齐等待的次数（首个分发/免除/无需补齐不计） */
  waitCount: number;
  /** 累计补齐等待的毫秒数 */
  waitedMs: number;
}

/**
 * 命令间最小间隔闸门。
 *
 * 语义实现（FR-014 验收「连续两分发间隔 = max(delayMs, 执行耗时)」）：
 * gate 记录最近一个 delay-eligible 命令的**执行起点**（= 经受 gate 后
 * 实际开始执行的时刻）。下一次 before(delayMs) 若距该起点不足 delayMs
 * 则补齐等待；delayMs<=0（关闭/单工具免除）直接返回且**不更新**起点——
 * 免除命令自身执行时长自然计入间隔（与显式 sleep 不叠加的机制基础）。
 *
 * 机制零领域知识：不认识任何工具名；delayMs<=0 时路径零额外开销（NFR-006）。
 */
export class DelayGate {
  /** 最近一个 delay-eligible 命令的执行起点（null = 尚无 → 首个分发不等待）。 */
  private lastSlotStart: number | null = null;
  private waitCount = 0;
  private waitedMs = 0;

  constructor(
    private clock: Clock,
    private onDelay?: (waitedMs: number, tool: string) => void,
  ) {}

  get stats(): DelayStats {
    return { waitCount: this.waitCount, waitedMs: this.waitedMs };
  }

  /**
   * 分发前置补齐：距上一命令执行起点 < delayMs → 等待补齐。
   * 返回时该命令执行起点已记账（供下一命令计算间隔）。
   */
  async before(delayMs: number, tool: string): Promise<void> {
    if (delayMs <= 0) return; // 关闭/单工具免除：零开销且不更新起点
    const now = this.clock.now();
    let start = now;
    if (this.lastSlotStart !== null) {
      const need = delayMs - (now - this.lastSlotStart);
      if (need > 0) {
        this.waitCount += 1;
        this.waitedMs += need;
        this.onDelay?.(need, tool);
        await this.clock.sleep(need);
        start = this.clock.now(); // sleep 后时钟可能已推进（真实时钟即自然流逝）
      }
    }
    this.lastSlotStart = start;
  }
}
