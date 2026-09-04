/**
 * sleep：通用时序等待原语（domain-neutral，像 web-fetch 一样独立于任何 CLI）。
 *
 * **不属于任何 CLI 子命令**，是一个平台级能力：暂停指定时长，用于命令间的时序控制。
 * 文本格式：`sleep --ms <毫秒>`（如 `sleep --ms 5000`）或 `sleep --seconds <秒>`。
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
