/**
 * notify.ts —— notify 工具（FR-024/FR-009；Notification API 提醒，P2 试点）。
 *
 * 生态位（discovery §3.3 E 组 ◐）：通知/提醒 → Notification API。授权两路转译
 * （FR-009/EC-003）：denied → 降级路径提示（不抛错：页面内提示等价物由场景
 * 呈现）；unsupported → 可读错误。配合 jobs 完成提醒（FR-031 S-03）：场景在
 * job 完成回调里调本工具/notify 能力即可，base 不耦合。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformNotify, PlatformEnv } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

export interface NotifyArgs {
  title?: string;
  body?: string;
}

/** notify 执行器（send 子命令语义）。 */
export async function executeNotify(notify: PlatformNotify | undefined, args: NotifyArgs): Promise<ToolResult> {
  if (!notify) {
    return { ok: false, output: '✖ 通知能力未注入（env.notify 缺省）—— 浏览器 Notification 需场景提供', error: 'notify not injected' };
  }
  const title = args.title ?? '';
  if (!title.trim()) {
    return { ok: false, output: '✖ notify 缺少必填参数 --title <通知标题>' };
  }
  try {
    const perm = await notify.permission();
    if (perm === 'unsupported') {
      return { ok: false, output: '✖ 通知不可用：系统通知不受当前环境支持（能力降级）—— 可在页面内提示', error: 'notify unsupported' };
    }
    if (perm === 'denied') {
      // FR-024 授权拒绝 → 降级路径提示（会话不中断；不当作执行错误）
      return {
        ok: true,
        output: `（通知授权已被拒绝，未展示系统通知 —— 请在浏览器地址栏权限设置允许通知，或改用页面内提示）`,
      };
    }
    const shown = await notify.show(title.trim(), args.body ? { body: args.body } : undefined);
    return { ok: true, output: shown ? `✓ 已发送通知：${title}` : '（通知未展示）' };
  } catch (err) {
    const t = translateCapabilityError(err, '通知');
    return { ok: false, output: t.output, error: t.error };
  }
}

// ---------- ToolEntry ----------

const NOTIFY_DESC =
  'notify：系统通知提醒（Notification API）。子命令 send --title [--body]；授权被拒 → 降级路径提示（浏览器地址栏权限设置允许通知）。' +
  ' 参数进 args 对象：{"subcommand":"send","args":{"title":"任务完成","body":"导出已就绪"}}。';

const NOTIFY_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['send'], description: 'notify 子命令：send。' },
    args: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '通知标题（必填）。' },
        body: { type: 'string', description: '通知正文（可选）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function notifyHelp(): string {
  return [
    'notify —— 系统通知提醒（Notification API；授权两路转译）',
    '用法：notify send --title <标题> [--body <正文>]',
    '',
    '示例：notify send --title "任务完成" --body "导出 SVG 已就绪"',
    '说明：授权被拒 → 降级路径提示（地址栏允许通知）；unsupported → 可读错误；配合 jobs 完成提醒（场景侧）。',
  ].join('\n');
}

export function createNotifyToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'notify',
    summary: '系统通知提醒（Notification API；授权拒绝降级提示）',
    schema: { name: 'notify', description: NOTIFY_DESC, parameters: NOTIFY_SCHEMA as unknown as Record<string, unknown> },
    risk: 'ui',
    group: 'ui',
    executor: async (tc) => executeNotify(env.notify, { title: tc.args.title, body: tc.args.body }),
    help: notifyHelp,
  };
}
