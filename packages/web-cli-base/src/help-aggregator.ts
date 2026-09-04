/**
 * 顶层工具帮助聚合器（domain-neutral，工具发现机制）。
 * base 提供聚合机制 + 自带通用工具（web-fetch/sleep）；场景方注册自己的业务工具。
 */
import { webFetchHelp, webSleepHelp } from './help.js';

export interface ToolHelpEntry {
  name: string;
  summary: string;
  /** 渲染该工具完整帮助（用于 web-cli-help <tool>）；缺省则该工具仅一览。 */
  render?: () => string;
}

export class HelpAggregator {
  private entries = new Map<string, ToolHelpEntry>();
  register(entry: ToolHelpEntry): void {
    this.entries.set(entry.name, entry);
  }
  names(): string[] {
    return [...this.entries.keys()];
  }
  /** 全部工具一览（顶层 help）。 */
  listAll(): string {
    const names = this.names();
    const lines = ['可用工具（' + names.length + ' 个）：'];
    for (const n of names) lines.push(`- ${n}：${this.entries.get(n)!.summary}`);
    lines.push('');
    lines.push('了解某工具：web-cli-help <tool>，如 web-cli-help lgdl-web-cli');
    return lines.join('\n');
  }
  /** 某工具详情（未注册返回 null）。 */
  getTool(name: string): string | null {
    const e = this.entries.get(name);
    if (!e) return null;
    return e.render ? `${name} —— ${e.summary}\n\n${e.render()}` : `${name} —— ${e.summary}`;
  }
}

/** 创建聚合器（预注册 base 自带通用工具 web-fetch/sleep）。 */
export function createHelpAggregator(): HelpAggregator {
  const agg = new HelpAggregator();
  agg.register({ name: 'web-fetch', summary: '基础 web 获取（独立工具，不属于任何 CLI）', render: webFetchHelp });
  agg.register({ name: 'sleep', summary: '通用时序等待（独立工具）', render: webSleepHelp });
  return agg;
}
