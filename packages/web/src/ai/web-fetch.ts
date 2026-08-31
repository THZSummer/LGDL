/**
 * lgdl-web-fetch：独立基础工具（web 获取），**不属于 lgdl-web-cli 子命令**。
 * 与 lgdl-web-cli（图内容操作）/ lgdl-web-op-cli（UI 操作）平级，
 * 是一个平台级能力：获取同源相对路径或完整 URL 的原始文本。
 * 文本格式：`lgdl-web-fetch --path <path>`（如 lgdl/web/workbench/README-CLI.md）。
 *
 * （自 packages/web/src/ai/web-cli.ts:291-327 parseWebFetchCommand 拆分留 web——
 * web fetch 为平台能力，ADR-007；tokenizeCli/parseArgs 自 @lgdl/web-cli-base
 * protocol.ts 导入。）
 */
import { tokenizeCli, parseArgs } from '@lgdl/web-cli-base';
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
  if (tokens[0] !== 'lgdl-web-fetch') {
    return {
      ok: false,
      error: `缺少前缀 "lgdl-web-fetch"（独立基础工具：lgdl-web-fetch --path <path>，如 lgdl/web/workbench/README-CLI.md）`,
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
      return { ok: false, error: '缺少必填参数 --path <path>（lgdl-web-fetch 必须显式传 path，无默认文档；如 --path lgdl/web/workbench/README-CLI.md；--help 查看用法）' };
    }
    return { ok: true, kind: 'fetch', path };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * lgdl-web-fetch：基础 web 获取工具，**独立于 lgdl-web-cli / lgdl-web-op-cli**。
 * 获取同源相对路径或完整 URL，返回原始文本。
 * 典型用途：读取工作台 skill 文档 lgdl/web/workbench/README-CLI.md（AI 第一步必读）。
 * 不改文档（changed 恒为 false，source 恒为空）。
 *
 * （自 packages/web/src/ai/ops.ts:52-71 拆分留 web——平台 fetch 能力，ADR-007。）
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
    lines.push('✖ lgdl-web-fetch 缺少必填参数 --path：调用时必须显式传 --path（无默认文档）。正确示例：lgdl-web-fetch --path lgdl/web/workbench/README-CLI.md');
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
