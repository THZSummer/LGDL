/**
 * lgdl-web-op-cli 命令元数据注册表（F-13 ② 自 web/help.ts WEB_OP_ENTRIES 迁出）。
 *
 * OP_COMMANDS 为 op 协议单一数据源（FR-016/ADR-008）：子命令枚举/参数 schema/
 * help 文案全部由此派生（OP_SUBCOMMANDS = Object.keys(OP_COMMANDS) 保序）。
 * 零 UI 框架引用（NFR-004）。
 */
import type { HelpEntry } from '@lgdl/web-cli-base';

/** UI 操作命令元数据（与迁移前 web/help.ts WEB_OP_ENTRIES 逐字节一致）。 */
export const OP_COMMANDS: Record<string, HelpEntry> = {
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
    example: 'lgdl-web-op-cli switch-example --id ecommerce-flow',
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

/**
 * 子命令枚举（单一数据源派生，保序 → WEB_OP_TOOL schema 与迁移前逐字节一致，
 * ADR-008/R13）。
 *
 * 注意两点收敛规则（复现迁移前工具 schema）：
 *   - export 是 export-svg/export-png 的文档化别名（help 元数据含，但迁移前
 *     工具 enum 未暴露给模型，保持现状不列入）；
 *   - help 是受支持子命令（App 分发 default → webOpHelp），迁移前工具 enum
 *     已含，须保留。
 */
export const OP_SUBCOMMANDS: string[] = [
  ...Object.keys(OP_COMMANDS).filter((k) => k !== 'export'),
  'help',
];
