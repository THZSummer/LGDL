/**
 * --help 自文档：每个命令按需查询用法（CLI 习惯），AI 不需要反复读完整文档。
 *
 * - lgdl-web-cli：webCliHelp(topic?) —— 顶层列出全部子命令；带 topic 输出单个命令详情
 * - lgdl-web-op-cli：webOpHelp(topic?) —— UI 操作命令
 * - lgdl-web-fetch：webFetchHelp() —— 基础 web 获取
 *
 * 增量命令（add-node 等 9 个）的参数规格复用 core/commands.ts 的 COMMANDS
 * 注册表（required/optional/changeKeys），此处只补充中文说明与示例——单一数据源。
 */
import { COMMANDS } from '@lgdl/core';

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

/** 参数名 → 中文说明（增量命令与只读命令共用）。 */
const PARAM_DESC: Record<string, string> = {
  id: '节点/分组 id（全局唯一）',
  label: '显示名',
  kind: '节点类型（start/end/process/decision/entity/note/state/milestone，可 list-node-kinds 查全）',
  group: '所属分组 id',
  member: '成员：kind=,name=[,type=][,visibility=][,params=]（多成员用换行分隔）',
  attrs: '属性：k=v（逗号分隔；数字保留原样，加引号可含逗号）',
  from: '边的起点（已有节点/分组 id）',
  to: '边的终点（已有节点/分组 id）',
  'edge-label': '边标签（平行边用标签区分）',
  'new-id': '改后的 id',
  'new-from': '改后的起点',
  'new-to': '改后的终点',
  'cardinality-from': '起点基数（1/*/0..1/0..*/1..*）',
  'cardinality-to': '终点基数（1/*/0..1/0..*/1..*）',
  'member-add': '新增成员（kind=,name=）',
  'member-remove': '移除成员（成员名）',
  contains: '分组包含的 id 列表（逗号分隔）',
  type: '图类型（init：flowchart/mindmap/uml-class/arch/datastream/sequence/er/state/gantt）',
  q: '搜索关键词（find-node）',
};

function paramDesc(key: string): string {
  return PARAM_DESC[key] ?? key;
}

/** lgdl-web-cli 只读 + 特殊命令（增量 9 命令由 core COMMANDS 动态生成）。 */
const WEB_CLI_EXTRA: Record<string, HelpEntry> = {
  status: {
    summary: '查看当前图完整结构（读图首选：节点/边/分组）',
    example: 'lgdl-web-cli status --doc main',
    note: '只读，不改文档。',
  },
  validate: {
    summary: '校验当前图语法，列出错误/警告',
    example: 'lgdl-web-cli validate --doc main',
    note: '只读。',
  },
  init: {
    summary: '将文档初始化为指定图类型的模板骨架',
    args: [{ key: 'type', desc: paramDesc('type'), required: true }],
    example: 'lgdl-web-cli init --doc main --type er',
    note: '覆盖当前文档内容。',
  },
  convert: {
    summary: '将当前图导出为其他格式',
    args: [{ key: 'to', desc: '导出格式：mermaid / plantuml / json', required: true }],
    example: 'lgdl-web-cli convert --doc main --to mermaid',
    note: '只读，不改文档。',
  },
  'doc-info': {
    summary: '文档概览：类型/规模/节点 kind 分布',
    example: 'lgdl-web-cli doc-info --doc main',
    note: '只读。',
  },
  'get-node': {
    summary: '查看单个节点详情（成员/attrs/所属分组）',
    args: [{ key: 'id', desc: paramDesc('id'), required: true }],
    example: 'lgdl-web-cli get-node --doc main --id user',
    note: '只读。',
  },
  'get-edge': {
    summary: '按 from/to/label 查看边详情（含基数、relation）',
    args: [
      { key: 'from', desc: paramDesc('from') },
      { key: 'to', desc: paramDesc('to') },
      { key: 'label', desc: '边标签（过滤）' },
    ],
    example: 'lgdl-web-cli get-edge --doc main --from a --to b --label 依赖',
    note: '只读；from/to 至少给一个。',
  },
  'find-node': {
    summary: '按 label/id 包含匹配搜索节点',
    args: [
      { key: 'label', desc: '匹配显示名（与 --q 二选一）' },
      { key: 'q', desc: '匹配关键词' },
    ],
    example: 'lgdl-web-cli find-node --doc main --label 用户',
    note: '只读。',
  },
  'list-node-kinds': {
    summary: '列出全部节点 kind（实时查询，不要凭记忆）',
    example: 'lgdl-web-cli list-node-kinds --doc main',
    note: '只读。',
  },
  'list-diagram-types': {
    summary: '列出全部图类型（实时查询）',
    example: 'lgdl-web-cli list-diagram-types --doc main',
    note: '只读。',
  },
};

/** 增量命令示例（参数从 core COMMANDS 注册表取，示例在此补充）。 */
const INCR_EXAMPLES: Record<string, string> = {
  'add-node': 'lgdl-web-cli add-node --doc main --id user --label 用户 --kind entity',
  'remove-node': 'lgdl-web-cli remove-node --doc main --id user',
  'update-node': 'lgdl-web-cli update-node --doc main --id user --label 新名 --attrs role=admin',
  'add-edge': 'lgdl-web-cli add-edge --doc main --from a --to b --label 依赖',
  'remove-edge': 'lgdl-web-cli remove-edge --doc main --from a --to b',
  'update-edge': 'lgdl-web-cli update-edge --doc main --from a --to b --label 新标签',
  'add-group': 'lgdl-web-cli add-group --doc main --id g1 --label 业务域 --contains a,b',
  'remove-group': 'lgdl-web-cli remove-group --doc main --id g1',
  'update-group': 'lgdl-web-cli update-group --doc main --id g1 --label 新域 --member-add c',
};

/** 增量命令中文摘要（覆盖 core COMMANDS 的英文 description）。 */
const INCR_SUMMARIES: Record<string, string> = {
  'add-node': '添加节点',
  'remove-node': '删除节点（自动清理关联边）',
  'update-node': '修改节点（label/kind/成员/attrs）',
  'add-edge': '添加边',
  'remove-edge': '删除边',
  'update-edge': '修改边（label/端点/基数/attrs）',
  'add-group': '添加分组（泳道/分区）',
  'remove-group': '删除分组',
  'update-group': '修改分组（label/成员/attrs）',
};

function webCliEntryFor(cmd: string): HelpEntry | undefined {
  if (WEB_CLI_EXTRA[cmd]) return WEB_CLI_EXTRA[cmd];
  const spec = COMMANDS[cmd];
  if (!spec) return undefined;
  return {
    summary: INCR_SUMMARIES[cmd] ?? spec.description,
    args: [
      ...spec.required.map((k) => ({ key: k, required: true as const, desc: paramDesc(k) })),
      ...spec.optional.map((k) => ({ key: k, required: false as const, desc: paramDesc(k) })),
    ],
    example: INCR_EXAMPLES[cmd],
    note:
      spec.changeKeys.length > 0
        ? `至少传一个变更参数：${spec.changeKeys.map((k) => `--${k}`).join(' / ')}（否则报 no change requested）`
        : undefined,
  };
}

/** 单个 web-cli 子命令详情。 */
function webCliHelpOne(cmd: string): string {
  const e = webCliEntryFor(cmd);
  if (!e) return `✖ 未知子命令 "${cmd}"（用 lgdl-web-cli --help 查看全部）`;
  const lines: string[] = [`${cmd} —— ${e.summary}`, ''];
  if (e.args && e.args.length > 0) {
    lines.push('参数：');
    for (const a of e.args) {
      lines.push(`  ${a.required ? '必填' : '可选'} --${a.key} <${a.key}>  ${a.desc}`);
    }
    lines.push('');
  }
  if (e.example) {
    lines.push(`示例：${e.example}`, '');
  }
  if (e.note) {
    lines.push(`说明：${e.note}`, '');
  }
  lines.push('（--doc <id> 隐式为当前文档，不需要传；--doc 是 lgdl-web-cli 的操作对象标识）');
  return lines.join('\n');
}

/** lgdl-web-cli 顶层 help：列出全部子命令。 */
export function webCliHelp(topic?: string): string {
  if (topic) return webCliHelpOne(topic);
  const incr = Object.keys(COMMANDS);
  const extra = Object.keys(WEB_CLI_EXTRA);
  const all = [...incr, ...extra].sort();
  const lines = [
    'lgdl-web-cli —— Web 工作台图内容操作（操作当前编辑器文档）',
    '用法：lgdl-web-cli <子命令> [--key value ...] [--help]',
    '用 lgdl-web-cli <子命令> --help 查看单个命令详情。',
    '',
    '子命令：',
  ];
  for (const cmd of all) {
    const e = webCliEntryFor(cmd)!;
    lines.push(`  ${cmd.padEnd(16)} ${e.summary}`);
  }
  lines.push('', '原则：读多写少——先 status/doc-info 了解图，再增量修改。');
  lines.push('', '做事流程/原则等方法论问题：lgdl-web-fetch --path lgdl/web/workbench/README-CLI.md 获取使用指南（会话内读一次即可）。');
  return lines.join('\n');
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
