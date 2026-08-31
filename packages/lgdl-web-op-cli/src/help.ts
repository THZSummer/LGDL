/**
 * lgdl-web-op-cli --help 自文档（F-13 ② 自 web/help.ts webOpHelp 面迁出，逐字节）。
 *
 * HelpArg/HelpEntry 机制类型自 @lgdl/web-cli-base 导入（FR-014 统一重复定义）；
 * 命令元数据引用本包 OP_COMMANDS（单一数据源 ADR-008）。
 */
import { OP_COMMANDS } from './ops.js';
import type { HelpEntry } from '@lgdl/web-cli-base';

export type { HelpEntry } from '@lgdl/web-cli-base';

function webOpHelpOne(cmd: string): string {
  const e = OP_COMMANDS[cmd];
  if (!e) return `✖ 未知操作 "${cmd}"（用 lgdl-web-op-cli --help 查看全部）`;
  const lines: string[] = [`${cmd} —— ${e.summary}`, ''];
  if (e.args && e.args.length > 0) {
    lines.push('参数：');
    for (const a of e.args) {
      lines.push(`  ${a.required ? '必填' : '可选'} --${a.key} <${a.key}>  ${a.desc}`);
    }
    lines.push('');
  }
  if (e.example) lines.push(`示例：${e.example}`, '');
  if (e.note) lines.push(`说明：${e.note}`, '');
  return lines.join('\n');
}

/** lgdl-web-op-cli 顶层 help。 */
export function webOpHelp(topic?: string): string {
  if (topic) return webOpHelpOne(topic);
  const lines = [
    'lgdl-web-op-cli —— Web 工作台 UI 操作（效果与用户手动点击完全一致）',
    '用法：lgdl-web-op-cli <子命令> [--key value ...] [--help]',
    '用 lgdl-web-op-cli <子命令> --help 查看单个操作详情。',
    '',
    '子命令：',
  ];
  for (const [cmd, e] of Object.entries(OP_COMMANDS)) {
    lines.push(`  ${cmd.padEnd(20)} ${e.summary}`);
  }
  lines.push('', '注意：不存在 apply-source —— 图内容一律用 lgdl-web-cli 增量命令修改。');
  lines.push('', '做事流程/原则等方法论问题：web-fetch --path lgdl/web/workbench/README-CLI.md 获取使用指南（会话内读一次即可）。');
  return lines.join('\n');
}
