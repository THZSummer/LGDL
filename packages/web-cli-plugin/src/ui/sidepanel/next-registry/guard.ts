/**
 * V5.5-3 **TASK-V55-312 / 313 / 314** (ADR-V55-009 §1/§2/§4 · FR-SELF-090~094 ·
 * AC-SELF-006 · R-SELF-907 / R-V55-109) — 护栏三件套的**六常量单源** + 越限抑制 + 关断偏好。
 *
 * 三条铁律：① 越限**真抑制**（不是「只写不判」）；② **主题① 不受总开关控制**（`verdict` 对
 * `deterministic` 恒放行）；③ 抑制 / 预算耗尽**留痕可判**（`driverSuppressedLine`）且**非死端**。
 *
 * token 预算口径 = **主动回合数**（`AI_TURN_BUDGET_PER_SESSION`，不是 token 计数）：本 Feature
 * 不新增真值源（无 usage 回报面）；一次主动回合 ≈ 一次 LLM 调用 ⇒ 回合数是成本的**上界代理**，
 * 单回合 token 量不可控 = **已知限制**（ADR-V55-009 §2）。
 *
 * @module ui/sidepanel/next-registry/guard
 */
import { NEXTSTEP_MIN_INTERVAL_MS } from '../recommend.js';
import { dedupeKey } from './drivers.js';

/** 打扰控制：滚动窗内的主动发起上限。 */
export const AI_PROACTIVE_MAX_PER_WINDOW = 6;
/** 打扰控制：频次上限的滚动窗宽（10 min）。 */
export const AI_PROACTIVE_WINDOW_MS = 600_000;
/** 打扰控制：静默期 —— 用户刚否决 / 刚手输后不主动。 */
export const AI_PROACTIVE_SILENCE_MS = 60_000;
/** 防环：两次自动发起的最小间隔 —— **re-export** 既有 10 s 防抖常量（本文件零新字面量）。 */
export const AI_PROACTIVE_COOLDOWN_MS = NEXTSTEP_MIN_INTERVAL_MS;
/** 防环：连续自动链深度上限（达界 ⇒ 强制转用户手势）。 */
export const AI_CHAIN_DEPTH_MAX = 2;
/** token 成本：本会话内主动回合上限（口径 = 主动回合数，见模块头）。 */
export const AI_TURN_BUDGET_PER_SESSION = 8;
/** 关断偏好默认值（**显式登记**：默认 ON）。 */
export const AI_PROACTIVE_ENABLED_DEFAULT = true;
/** 关断持久偏好键名单源（与 LLM Key `web-cli:llm` / 主题 `web-cli:theme` 不同键）。 */
export const AI_PROACTIVE_PREF_KEY = 'web-cli:proactive';
/** 打扰控制：**同因不重复**的去重键 —— 复用驱动者层 `dedupeKey`（函数单源，零第二份拼接）。 */
export const AI_PROACTIVE_SAME_CAUSE_KEY = dedupeKey;

export type GuardActor = 'ai' | 'deterministic';
export type GuardBlockReason =
  | 'disabled'
  | 'frequency'
  | 'same-cause'
  | 'silence'
  | 'cooldown'
  | 'chain-depth'
  | 'budget';
export type GuardVerdict = { readonly allowed: true } | { readonly allowed: false; readonly reason: GuardBlockReason };

export interface ProactivityGuard {
  /** 放行 / 抑制（纯判据，不改状态）。 */
  verdict(actor: GuardActor, sameCause?: string, at?: number): GuardVerdict;
  /** 记录一次**真的发生**的主动回合（成功按下后才调用 —— 失败不消耗预算）。 */
  noteProactive(sameCause: string, at?: number): void;
  /** 用户**手输**回合：重置自动链 + 静默期。 */
  noteUserTurn(at?: number): void;
  /** 用户**其它交互**（点击作答 / 手势）：只重置自动链。 */
  noteUserInteraction(): void;
  /** 用户**否决**（consent reject / 中断）：重置自动链 + 静默期。 */
  noteVeto(at?: number): void;
  setEnabled(value: boolean): void;
  enabled(): boolean;
}

/** 工厂（**测试 seam**：时钟可注入 ⇒ 六项上限逐条可穷举，无需真等待）。 */
export function createProactivityGuard(now: () => number = Date.now, enabled = AI_PROACTIVE_ENABLED_DEFAULT): ProactivityGuard {
  let on = enabled;
  let windowTimes: number[] = [];
  const sameCauseAt = new Map<string, number>();
  let lastProactiveAt = 0;
  let lastUserTurnAt = 0;
  let chainDepth = 0;
  let budgetUsed = 0;
  const prune = (at: number): void => {
    windowTimes = windowTimes.filter((t) => at - t < AI_PROACTIVE_WINDOW_MS);
    for (const [k, t] of sameCauseAt) if (at - t >= AI_PROACTIVE_WINDOW_MS) sameCauseAt.delete(k);
  };
  return {
    verdict(actor, sameCause, at = now()) {
      // ② 主题① 零 token / 确定性 ⇒ **不受总开关控制**（FR-SELF-069 显式裁决）。
      if (actor === 'deterministic') return { allowed: true };
      if (!on) return { allowed: false, reason: 'disabled' };
      if (budgetUsed >= AI_TURN_BUDGET_PER_SESSION) return { allowed: false, reason: 'budget' };
      if (chainDepth >= AI_CHAIN_DEPTH_MAX) return { allowed: false, reason: 'chain-depth' };
      if (lastUserTurnAt > 0 && at - lastUserTurnAt < AI_PROACTIVE_SILENCE_MS) return { allowed: false, reason: 'silence' };
      if (lastProactiveAt > 0 && at - lastProactiveAt < AI_PROACTIVE_COOLDOWN_MS) return { allowed: false, reason: 'cooldown' };
      prune(at);
      if (sameCause !== undefined && sameCauseAt.has(sameCause)) return { allowed: false, reason: 'same-cause' };
      if (windowTimes.length >= AI_PROACTIVE_MAX_PER_WINDOW) return { allowed: false, reason: 'frequency' };
      return { allowed: true };
    },
    noteProactive(sameCause, at = now()) {
      prune(at);
      windowTimes.push(at);
      sameCauseAt.set(sameCause, at);
      lastProactiveAt = at;
      chainDepth += 1;
      budgetUsed += 1;
    },
    noteUserTurn(at = now()) {
      chainDepth = 0;
      lastUserTurnAt = at;
    },
    noteUserInteraction() {
      chainDepth = 0;
    },
    noteVeto(at = now()) {
      chainDepth = 0;
      lastUserTurnAt = at;
    },
    setEnabled(value) {
      on = value === true;
    },
    enabled: () => on,
  };
}

/** 模块单例（生产路径消费；门禁用上面的工厂做隔离）。 */
export const proactivity = createProactivityGuard();

type PrefArea = { get(k: string): Promise<Record<string, unknown>>; set(i: Record<string, unknown>): Promise<void> };
const prefArea = (): PrefArea | undefined =>
  (globalThis as unknown as { chrome?: { storage?: { local?: PrefArea } } }).chrome?.storage?.local;

/** 读持久关断偏好；任何失败都降级到**单源默认值**（不伪造「已关断」）。 */
export async function loadProactivePref(): Promise<boolean> {
  try {
    const area = prefArea();
    if (!area) return AI_PROACTIVE_ENABLED_DEFAULT;
    const raw = (await area.get(AI_PROACTIVE_PREF_KEY))[AI_PROACTIVE_PREF_KEY];
    return typeof raw === 'boolean' ? raw : AI_PROACTIVE_ENABLED_DEFAULT;
  } catch {
    return AI_PROACTIVE_ENABLED_DEFAULT;
  }
}

/** 写持久关断偏好（与 LLM Key 不同键）。 */
export async function saveProactivePref(value: boolean): Promise<void> {
  const area = prefArea();
  if (!area) throw new Error('chrome.storage.local unavailable');
  await area.set({ [AI_PROACTIVE_PREF_KEY]: value === true });
}
