/**
 * dom-tools.ts —— dom 通用 DOM 操作子命令族（FR-022；NG-003 同源边界）。
 *
 * 生态位（discovery §3.3 E 组 ○ / §3.4 DOM 域）：浏览器最独特生态位 —— 通用
 * DOM 自动化（read-state/click/hover/scroll/zoom/fullscreen/snapshot），机制
 * 先例 = lgdl-web-op-cli（其 LGDL 形态 C 档不动，NG-002）。**执行目标 = 宿主
 * 应用自身同源页面**（第三方/跨域站点 = F-14 边界，NG-003：help 显式声明）。
 *
 * 分层：DOM 操作经 PlatformEnv.dom.ops 注入（无 op-cli React handler 依赖，
 * 直接 document 操作的注入桩）。写类操作（click/hover/scroll/zoom/fullscreen）
 * 工具 risk:'ui' → 走 PRM 门禁（FR-005~007）；read-state/snapshot 为只读。
 *
 * 授权失败（NotAllowedError/NotFoundError 等）→ 转译友好错误（FR-009/EC-003），
 * 会话不中断。浏览器真实 DOM 冒烟由 validate 承接（node 面注入桩全链单测）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformDomOps, PlatformDomOpResult, PlatformEnv } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

export type DomSubcommand = 'read-state' | 'click' | 'hover' | 'scroll' | 'zoom' | 'fullscreen' | 'snapshot';

const SUBCOMMANDS: DomSubcommand[] = ['read-state', 'click', 'hover', 'scroll', 'zoom', 'fullscreen', 'snapshot'];

/** dom 工具执行器：子命令 → env.dom.ops 注入桩/实现。 */
export async function executeDomTool(ops: PlatformDomOps | undefined, subcommand: string, args: Record<string, string>): Promise<ToolResult> {
  const opName = (SUBCOMMANDS as string[]).includes(subcommand) ? (subcommand as DomSubcommand) : null;
  if (!opName) {
    return { ok: false, output: `✖ dom 未知子命令 "${subcommand}"（可用：${SUBCOMMANDS.join('/')}）`, error: 'unknown subcommand' };
  }
  if (!ops) {
    return {
      ok: false,
      output: '✖ dom 操作面未注入（env.dom.ops 缺省）—— 宿主页 DOM 操作仅在浏览器场景可用；写操作受权限门禁（PRM）约束',
      error: 'dom ops not injected',
    };
  }
  try {
    let r: PlatformDomOpResult;
    switch (opName) {
      case 'read-state':
        r = await ops.readState();
        break;
      case 'click': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom click 缺少 --selector <CSS 选择器>' };
        r = await ops.click(sel);
        break;
      }
      case 'hover': {
        const sel = args.selector ?? '';
        if (!sel) return { ok: false, output: '✖ dom hover 缺少 --selector <CSS 选择器>' };
        r = await ops.hover(sel);
        break;
      }
      case 'scroll': {
        const dx = /^-?\d+$/.test(args.dx ?? '') ? Number(args.dx) : 0;
        const dy = /^-?\d+$/.test(args.dy ?? '') ? Number(args.dy) : 0;
        r = await ops.scroll(args.selector || undefined, dx, dy);
        break;
      }
      case 'zoom': {
        const percent = /^\d+$/.test(args.percent ?? '') ? Number(args.percent) : undefined;
        r = await ops.zoom(percent);
        break;
      }
      case 'fullscreen': {
        const on = args.on === 'true';
        r = await ops.fullscreen(on);
        break;
      }
      case 'snapshot':
        r = await ops.snapshot();
        break;
    }
    return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
  } catch (err) {
    // FR-009/EC-003：DOM 授权/能力失败转译（会话不中断）
    const t = translateCapabilityError(err, 'DOM 操作');
    return { ok: false, output: t.output, error: t.error };
  }
}

// ---------- ToolEntry 工厂 ----------

const DOM_DESC =
  'dom：宿主页同源 DOM 操作子命令族（仅宿主应用自身页面；第三方/跨域 = 插件边界 NG-003）。' +
  ' 子命令：read-state（读页面状态）/ snapshot（DOM 文本快照）为只读；' +
  ' click --selector / hover --selector / scroll [--selector] [--dx --dy] / zoom --percent / fullscreen --on true|false 为写（UI 副作用，受权限门禁 PRM）。' +
  ' 参数进 args 对象：{"subcommand":"click","args":{"selector":"#btn"}}。';

const DOM_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: SUBCOMMANDS,
      description: 'dom 子命令。',
    },
    args: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS 选择器（click/hover/scroll）。' },
        dx: { type: 'string', description: 'scroll 横向像素。' },
        dy: { type: 'string', description: 'scroll 纵向像素。' },
        percent: { type: 'string', description: 'zoom 百分比（100 = 100%）。' },
        on: { type: 'string', description: 'fullscreen "true"/"false"。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function domHelp(): string {
  return [
    'dom —— 宿主页同源 DOM 自动化（浏览器最独特生态位）',
    '用法：dom <read-state|click|hover|scroll|zoom|fullscreen|snapshot> [--selector ...]',
    '',
    '子命令：',
    '  read-state  读宿主页状态（url/title 等）',
    '  click       --selector <CSS 选择器> 点击元素',
    '  hover       --selector 悬停元素',
    '  scroll      [--selector] [--dx 像素] [--dy 像素] 滚动',
    '  zoom        --percent 页面缩放',
    '  fullscreen  --on true|false 全屏切换（需用户手势授权）',
    '  snapshot    DOM 文本快照（输出预算受控）',
    '',
    '边界（NG-003）：执行目标 = 宿主应用自身同源页面；第三方/跨域站点由插件运行时（F-14 线）承载，本工具不做。',
    '安全：写类子命令（UI 副作用）受权限门禁 PRM 约束（risk:ui）；机制先例 lgdl-web-op-cli 的 LGDL 形态不动（NG-002）。',
    'CSP/授权：DOM 能力受浏览器授权约束，失败按可读错误转译（FR-009）。',
  ].join('\n');
}

/** 创建 dom 工具条目（env.dom.ops 注入）。 */
export function createDomToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'dom',
    summary: '宿主页同源 DOM 操作子命令族（read-state/click/hover/scroll/zoom/fullscreen/snapshot）',
    schema: { name: 'dom', description: DOM_DESC, parameters: DOM_SCHEMA as unknown as Record<string, unknown> },
    risk: 'ui',
    group: 'ui',
    executor: async (tc) => executeDomTool(env.dom?.ops, tc.subcommand, tc.args),
    help: domHelp,
  };
}
