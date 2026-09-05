/**
 * web-fetch：独立基础工具（web 获取，F-13 ② 自 web 归位 base 并中性化改名，
 * ADR-007——唯一命名例外：旧工具名中性化为 web-fetch）。
 *
 * **不属于任何 CLI 子命令**，是一个平台级能力：获取同源相对路径或完整 URL
 * 的原始文本。文本格式：`web-fetch --path <path>`（如 guide.md）。
 *
 * （自 packages/web/src/ai/web-fetch.ts 迁入，前缀中性化改名；
 * tokenizeCli/parseArgs 自本包 protocol.ts 导入。）
 */
import { tokenizeCli, parseArgs } from './protocol.js';
import { webFetchHelp } from './help.js';

export type ParsedWebFetch =
  | { ok: true; kind: 'fetch'; path: string }
  | { ok: true; kind: 'help' }
  | { ok: false; error: string };

export function parseWebFetchCommand(line: string): ParsedWebFetch {
  const tokens = tokenizeCli(line);
  if (tokens.length === 0) {
    return { ok: false, error: '空命令' };
  }
  if (tokens[0] !== 'web-fetch') {
    return {
      ok: false,
      error: `缺少前缀 "web-fetch"（独立基础工具：web-fetch --path <path>，如 guide.md）`,
    };
  }
  // --help 优先级最高：显示用法，无需 --path
  if (tokens.includes('--help')) {
    return { ok: true, kind: 'help' };
  }
  try {
    const args = parseArgs(tokens.slice(1));
    const path = args.path;
    if (!path) {
      return { ok: false, error: '缺少必填参数 --path <path>（web-fetch 必须显式传 path，无默认文档；如 --path guide.md；--help 查看用法）' };
    }
    return { ok: true, kind: 'fetch', path };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * web-fetch：基础 web 获取工具，**独立于图内容/UI 操作 CLI 工具**。
 * 获取同源相对路径或完整 URL，返回原始文本。
 * 典型用途：读取同源的 guide/说明文档（如 guide.md）。
 * 不改文档（changed 恒为 false，source 恒为空）。
 *
 * （自 packages/web/src/ai/web-fetch.ts 迁入，错误文案前缀同步改名。）
 */
export async function executeWebFetch(path: string): Promise<{
  ok: boolean;
  source: string;
  lines: string[];
  changed: boolean;
  error?: string;
}> {
  const lines: string[] = [];
  if (!path) {
    lines.push('✖ web-fetch 缺少必填参数 --path：调用时必须显式传 --path（无默认文档）。正确示例：web-fetch --path guide.md');
    return { ok: false, source: '', lines, changed: false, error: 'missing --path' };
  }
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) {
      lines.push(`✖ 获取失败（HTTP ${res.status}）：${path}`);
      return { ok: false, source: '', lines, changed: false, error: `fetch failed: ${res.status}` };
    }
    const text = await res.text();
    lines.push(text);
    return { ok: true, source: '', lines, changed: false };
  } catch (err) {
    lines.push(`✖ 获取失败：${(err as Error).message}`);
    return { ok: false, source: '', lines, changed: false, error: (err as Error).message };
  }
}
