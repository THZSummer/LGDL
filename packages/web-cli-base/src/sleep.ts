/**
 * sleep：通用时序等待原语（domain-neutral，像 web-fetch 一样独立于任何 CLI）。
 *
 * **不属于任何 CLI 子命令**，是一个平台级能力：暂停指定时长，用于命令间的时序控制。
 * 文本格式：`sleep --ms <毫秒>`（如 `sleep --ms 5000`）或 `sleep --seconds <秒>`。
 *
 * function-calling 形态：executeSleepFromArgs(args) 从 fc args 直调（FR-009），
 * ms/seconds 归一 + 缺参友好文案 + clamp（EC-011）——执行器自身职责，
 * 不依赖消费方特判，也不经「文本重建→二次 parse」间接层。
 *
 * （tokenizeCli/parseArgs 自本包 protocol.ts 导入，与 web-fetch.ts 同构。）
 */
import { tokenizeCli, parseArgs } from './protocol.js';
import { webSleepHelp } from './help.js';

export type ParsedSleep =
  | { ok: true; kind: 'sleep'; ms: number }
  | { ok: true; kind: 'help' }
  | { ok: false; error: string };

export function parseSleepCommand(line: string): ParsedSleep {
  const tokens = tokenizeCli(line);
  if (tokens.length === 0) {
    return { ok: false, error: '空命令' };
  }
  if (tokens[0] !== 'sleep') {
    return {
      ok: false,
      error: `缺少前缀 "sleep"（独立通用原语：sleep --ms <毫秒>，如 sleep --ms 5000）`,
    };
  }
  // --help 优先级最高：显示用法，无需 ms/seconds
  if (tokens.includes('--help')) {
    return { ok: true, kind: 'help' };
  }
  try {
    const args = parseArgs(tokens.slice(1));
    const argMs = args.ms !== undefined ? Number(args.ms) : undefined;
    const argSec = args.seconds !== undefined ? Number(args.seconds) : undefined;
    const ms =
      argMs !== undefined && !Number.isNaN(argMs)
        ? argMs
        : argSec !== undefined && !Number.isNaN(argSec)
          ? argSec * 1000
          : NaN;
    if (Number.isNaN(ms) || ms < 0) {
      return { ok: false, error: 'sleep 需要 --ms <毫秒> 或 --seconds <秒>（非负数字）' };
    }
    // 上限 10 分钟，防溢出/误用（setTimeout 32 位溢出上限约 2^31-1）
    return { ok: true, kind: 'sleep', ms: Math.min(ms, 600000) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * sleep：通用时序等待，**独立于图内容/UI 操作 CLI 工具**。
 * 等待 clamped 毫秒后返回成功（结果仅用于反馈，无副作用、不改文档）。
 */
export async function executeSleep(ms: number): Promise<{ ok: boolean; lines: string[]; error?: string }> {
  const clamped = ms;
  await new Promise((resolve) => setTimeout(resolve, clamped));
  return { ok: true, lines: [`✓ 已等待 ${clamped}ms`] };
}

/** sleep fc args 归一结果（EC-011：ms/seconds 归一 + 缺参/非法识别 + clamp 保留）。 */
export type NormalizedSleep =
  | { ok: true; ms: number }
  | { ok: false; lines: string[]; error: string };

/**
 * 把 function-calling args（{ms?, seconds?}，字符串）归一为毫秒数。
 * 语义与 AiPanel 特判块逐字等价（R-008）：
 *   - ms 与 seconds 都缺（或空串）→ 缺参友好提示（含 --ms/--seconds 用法）
 *   - 非数字 / 负数 → 非法提示（文案与 parseSleepCommand 一致）
 *   - 上限 10 分钟 clamp 保留（sleep.ts:46 语义）
 * 纯计算不等待——便于 router 内建注册直调与测试（clamp 用例零真实等待）。
 */
export function normalizeSleepArgs(args: Record<string, string>): NormalizedSleep {
  const hasMs = args.ms !== undefined && args.ms !== '';
  const hasSec = args.seconds !== undefined && args.seconds !== '';
  if (!hasMs && !hasSec) {
    return {
      ok: false,
      lines: ['✖ sleep 需要一个时长参数：sleep --ms <毫秒> 或 --seconds <秒>，如 sleep --ms 5000'],
      error: 'missing duration',
    };
  }
  const raw = hasMs ? args.ms! : args.seconds!;
  const ms = hasMs ? Number(raw) : Number(raw) * 1000;
  if (Number.isNaN(ms) || ms < 0) {
    return { ok: false, lines: ['✖ sleep 需要 --ms <毫秒> 或 --seconds <秒>（非负数字）'], error: 'invalid duration' };
  }
  // 上限 10 分钟，防溢出/误用（setTimeout 32 位溢出上限约 2^31-1）
  return { ok: true, ms: Math.min(ms, 600000) };
}

/**
 * sleep function-calling 执行器（FR-009）：从 fc args 直调，
 * 归一（normalizeSleepArgs）→ 执行等待。供 router 内建条目 executor 引用。
 */
export async function executeSleepFromArgs(
  args: Record<string, string>,
): Promise<{ ok: boolean; lines: string[]; error?: string }> {
  const norm = normalizeSleepArgs(args);
  // 注：非 strict 编译下 `!norm.ok` 反向收窄失效，须用显式判别
  if (norm.ok === false) return { ok: false, lines: norm.lines, error: norm.error };
  return executeSleep(norm.ms);
}
