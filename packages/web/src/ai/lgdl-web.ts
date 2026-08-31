/**
 * LGDL web 侧接线组装（ADR-007：fetch 行处理器留 web，经 handleLine 注入 exec 扩展点）。
 *
 * - handleFetchLine：executeCommands 的 fetch 行处理（ops.ts:271-293 逻辑逐字节）
 * - describeFetchLine：describeCommandLine 的 fetch 行描述（同步）
 * - lgdlExecutor：LGDL 执行器单例（注入上述处理器；AiPanel 经 './lgdl-web' 消费）
 *
 * 依赖方向：web → @lgdl/web-cli-base（lgdlDomain/createExecutor）→ @lgdl/core。
 */
import { createExecutor, lgdlDomain } from '@lgdl/web-cli-base';
import type { LineHandleResult } from '@lgdl/web-cli-base';
import { parseWebFetchCommand, executeWebFetch } from './web-fetch.js';
import { webFetchHelp } from './help.js';

/** fetch 行处理器（ADR-007：ops.ts:271-293 逐字节逻辑，web 侧注入 exec 扩展点）。 */
export async function handleFetchLine(line: string): Promise<LineHandleResult | null> {
  if (!line.startsWith('lgdl-web-fetch')) return null;
  const parsed = parseWebFetchCommand(line);
  // 注意：非 strict 编译下 `!parsed.ok` 反向收窄失效，须用显式判别
  if (parsed.ok === false) {
    return { ok: false, lines: [`✖ ${parsed.error}`, `  → ${line}`], error: parsed.error };
  }
  if (parsed.kind === 'help') {
    return { ok: true, lines: [webFetchHelp()] };
  }
  const r = await executeWebFetch(parsed.path);
  return { ok: r.ok, lines: r.lines, error: r.error };
}

/** describeCommandLine 的 fetch 行描述（同步；返回 null 表示非 fetch 行）。 */
export function describeFetchLine(line: string): string | null {
  if (!line.startsWith('lgdl-web-fetch')) return null;
  const parsed = parseWebFetchCommand(line);
  if (parsed.ok === false) return `✖ ${parsed.error}`;
  if (parsed.kind === 'help') return 'lgdl-web-fetch --help — 查看用法';
  return `lgdl-web-fetch --path ${parsed.path} — 获取 web 资源`;
}

/** LGDL 执行器单例（注入 fetch 行处理器；AiPanel 经 './lgdl-web' 消费 executeSubcommand）。 */
export const lgdlExecutor = createExecutor(lgdlDomain, {
  handleLine: handleFetchLine,
  describeFetchLine,
});
