/**
 * clipboard.ts —— clipboard 工具（FR-025/FR-009；剪贴板读写，P2 试点）。
 *
 * 生态位（discovery §3.3 E 组 ◐）：剪贴板 → Clipboard API（navigator.clipboard，
 * 需用户手势/权限）。失败转译（NotAllowedError/SecurityError → 可读 + 手势指引，
 * FR-009/EC-003），会话不中断。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformClipboard, PlatformEnv } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

export interface ClipboardArgs {
  text?: string;
}

/** clipboard 执行器（read / write 子命令语义）。 */
export async function executeClipboard(cb: PlatformClipboard | undefined, subcommand: string, args: ClipboardArgs): Promise<ToolResult> {
  if (!cb) {
    return { ok: false, output: '✖ 剪贴板能力未注入（env.clipboard 缺省）', error: 'clipboard not injected' };
  }
  try {
    if (subcommand === 'read') {
      const text = await cb.readText();
      return { ok: true, output: text === '' ? '（剪贴板为空）' : text };
    }
    if (subcommand === 'write') {
      const text = args.text ?? '';
      if (text === '') return { ok: false, output: '✖ clipboard write 缺少 --text <内容>' };
      await cb.writeText(text);
      return { ok: true, output: `✓ 已写入剪贴板（${text.length} 字符）` };
    }
    return { ok: false, output: `✖ clipboard 未知子命令 "${subcommand}"（可用：read/write）` };
  } catch (err) {
    const t = translateCapabilityError(err, '剪贴板');
    return { ok: false, output: t.output, error: t.error };
  }
}

// ---------- ToolEntry ----------

const CLIPBOARD_DESC =
  'clipboard：剪贴板读写。子命令 read（读剪贴板文本）/ write --text（写入）。浏览器需用户手势/权限（NotAllowedError → 指引）。' +
  ' 参数进 args 对象：{"subcommand":"write","args":{"text":"hello"}}。';

const CLIPBOARD_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['read', 'write'], description: 'clipboard 子命令。' },
    args: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'write 的文本。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function clipboardHelp(): string {
  return [
    'clipboard —— 剪贴板读写（navigator.clipboard；手势/权限失败转译）',
    '用法：clipboard read / clipboard write --text <内容>',
    '',
    '示例：clipboard write --text "a -> b"',
    '说明：需用户手势/授权；被拒/非安全上下文 → 可读错误（含指引），会话不中断。',
  ].join('\n');
}

export function createClipboardToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'clipboard',
    summary: '剪贴板读写（手势/权限失败转译）',
    schema: { name: 'clipboard', description: CLIPBOARD_DESC, parameters: CLIPBOARD_SCHEMA as unknown as Record<string, unknown> },
    risk: 'ui',
    group: 'ui',
    executor: async (tc) => executeClipboard(env.clipboard, tc.subcommand, { text: tc.args.text }),
    help: clipboardHelp,
  };
}
