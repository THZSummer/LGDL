/**
 * --help 机制类型（F-13 ② 纯化后：LGDL 文案面已随迁 web-cli 业务包/src/help.ts）。
 *
 * 本文件仅保留中性 HelpArg/HelpEntry 契约；webFetchHelp（web-fetch 工具帮助面）
 * 由 TASK-013 归位本包（ADR-007）。
 */

export interface HelpArg {
  key: string;
  required?: boolean;
  desc: string;
}

export interface HelpEntry {
  /** 一句话说明 */
  summary: string;
  /** 参数（--key，required 标注必填） */
  args?: HelpArg[];
  /** CLI 形式示例（无需含 --doc，说明里注明 doc 隐式） */
  example?: string;
  /** 额外说明（no-change 校验、特殊行为等） */
  note?: string;
}

/** web-fetch 帮助（单命令工具，F-13 ② 自 web 归位并中性化改名 ADR-007）。 */
export function webFetchHelp(): string {
  return [
    'web-fetch —— 基础 web 获取（独立工具，不属于任何 CLI）',
    '用法：web-fetch --path <path>',
    '',
    '参数：',
    '  必填 --path <path>  同源相对路径或完整 URL（无默认值，省略报错）',
    '',
    '示例：web-fetch --path guide.md',
    '说明：获取资源原文返回给调用方；不改文档。',
  ].join('\n');
}

/** sleep 帮助（单命令工具，通用时序原语，与 web-fetch 同级中性工具）。 */
export function webSleepHelp(): string {
  return [
    'sleep —— 通用时序等待（独立工具，不属于任何 CLI）',
    '用法：sleep --ms <毫秒> 或 sleep --seconds <秒>',
    '',
    '参数：',
    '  --ms <毫秒>      等待毫秒数（与 seconds 二选一）',
    '  --seconds <秒>   等待秒数（与 ms 二选一）',
    '',
    '示例：sleep --ms 5000',
    '说明：暂停指定时长，用于命令间的时序控制；上限 10 分钟。',
  ].join('\n');
}
