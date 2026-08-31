/**
 * --help 自文档：每个命令按需查询用法（CLI 习惯），AI 不需要反复读完整文档。
 *
 * - lgdl-web-cli：webCliHelp(topic?) —— 已迁入 @lgdl/web-cli-base（新包 help.ts，
 *   COMMANDS 单一数据源闭环 R-009）
 * - lgdl-web-op-cli：webOpHelp(topic?) —— UI 操作命令（留 web，工具定义在 web）
 * - lgdl-web-fetch：webFetchHelp() —— 基础 web 获取（留 web，平台能力）
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

/** lgdl-web-op-cli 命令元数据（UI 操作，与手动点击等效）。 */
const WEB_OP_ENTRIES: Record<string, HelpEntry> = {
  'copy-source': { summary: '复制当前图源码到剪贴板', example: 'lgdl-web-op-cli copy-source' },
  'toggle-editor': { summary: '切换编辑器收缩/展开', example: 'lgdl-web-op-cli toggle-editor' },
  'collapse-editor': { summary: '收缩编辑器', example: 'lgdl-web-op-cli collapse-editor' },
  'expand-editor': { summary: '展开编辑器', example: 'lgdl-web-op-cli expand-editor' },
  'export-svg': { summary: '导出当前图为 SVG 文件', example: 'lgdl-web-op-cli export-svg' },
  'export-png': { summary: '导出当前图为 PNG 文件', example: 'lgdl-web-op-cli export-png' },
  export: {
    summary: '导出当前图（别名：--format svg|png）',
    args: [{ key: 'format', desc: '导出格式：svg（默认）或 png' }],
    example: 'lgdl-web-op-cli export --format png',
    note: 'export-svg / export-png 的别名。',
  },
  'preview-zoom': {
    summary: '缩放预览：按倍率或方向+增量',
    args: [
      { key: 'factor', desc: '倍率（如 1.2 / 0.8）' },
      { key: 'direction', desc: '方向：1 或 in 放大，-1 或 out 缩小' },
      { key: 'delta', desc: '增量（默认 200，范围 50-800）' },
      { key: 'anchorX', desc: '缩放锚点 x' },
      { key: 'anchorY', desc: '缩放锚点 y' },
    ],
    example: 'lgdl-web-op-cli preview-zoom --factor 1.2',
  },
  'preview-pan': {
    summary: '平移预览',
    args: [
      { key: 'dx', desc: '水平位移' },
      { key: 'dy', desc: '垂直位移' },
    ],
    example: 'lgdl-web-op-cli preview-pan --dx 100 --dy 0',
  },
  'preview-reset': { summary: '重置预览为整图适配', example: 'lgdl-web-op-cli preview-reset' },
  'preview-click': {
    summary: '在预览中点击定位元素（编辑器同步跳转）',
    args: [{ key: 'loc', desc: '位置，如 nodes[3] / edges[1] / groups[0]', required: true }],
    example: 'lgdl-web-op-cli preview-click --loc nodes[3]',
  },
  'preview-hover': {
    summary: '预览中悬浮元素（高亮 + 显示锚点；--loc none 取消）',
    args: [{ key: 'loc', desc: '位置（nodes[i]/edges[i]/groups[i]）或 none', required: true }],
    example: 'lgdl-web-op-cli preview-hover --loc nodes[3]',
  },
  'switch-example': {
    summary: '切换工作台示例图',
    args: [{ key: 'id', desc: '示例 id（list-examples 可查）', required: true }],
    example: 'lgdl-web-op-cli switch-example --id login-flow',
  },
  'list-examples': { summary: '列出工作台全部示例图（id/标签/类型/规模）', example: 'lgdl-web-op-cli list-examples' },
  'list-diagram-types': { summary: '列出全部图类型（core 单一数据源）', example: 'lgdl-web-op-cli list-diagram-types' },
  'next-actions': {
    summary: '推荐下一步动作：以可点击胶囊卡片展示在聊天框',
    args: [
      {
        key: 'actions',
        desc: 'JSON 数组字符串：[{"label":"短文案","prompt":"完整指令"}]（2-4 个；点击胶囊把 prompt 发给 AI）',
        required: true,
      },
    ],
    example: 'lgdl-web-op-cli next-actions --actions \'[{"label":"增加配色分组","prompt":"给当前图增加配色分组"}]\'',
    note: '只影响聊天 UI，不改图。',
  },
};

function webOpHelpOne(cmd: string): string {
  const e = WEB_OP_ENTRIES[cmd];
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
  for (const [cmd, e] of Object.entries(WEB_OP_ENTRIES)) {
    lines.push(`  ${cmd.padEnd(20)} ${e.summary}`);
  }
  lines.push('', '注意：不存在 apply-source —— 图内容一律用 lgdl-web-cli 增量命令修改。');
  lines.push('', '做事流程/原则等方法论问题：lgdl-web-fetch --path lgdl/web/workbench/README-CLI.md 获取使用指南（会话内读一次即可）。');
  return lines.join('\n');
}

/** lgdl-web-fetch 帮助（单命令工具）。 */
export function webFetchHelp(): string {
  return [
    'lgdl-web-fetch —— 基础 web 获取（独立工具，不属于任何 CLI）',
    '用法：lgdl-web-fetch --path <path>',
    '',
    '参数：',
    '  必填 --path <path>  同源相对路径或完整 URL（无默认值，省略报错）',
    '',
    '示例：lgdl-web-fetch --path lgdl/web/workbench/README-CLI.md',
    '说明：获取资源原文返回给调用方；不改文档。',
  ].join('\n');
}
