/**
 * save-file.ts —— save/download 工具（FR-020/FR-009；P2 完整：FSA + 下载链两路径）。
 *
 * 生态位（discovery §3.3 C 组 ○ / A 组 ◐）：下载/上传生态位 → File System Access
 * 存用户文件（需用户手势授权）+ blob `<a download>` 下载链两路径。授权桩：
 * 用户拒绝/取消 → 可读结果（授权失败转译 FR-009/EC-003），会话不中断。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformFilePicker, PlatformEnv } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

export interface SaveFileArgs {
  filename?: string;
  content?: string;
}

/** save/download 执行器。 */
export async function executeSaveFile(fp: PlatformFilePicker | undefined, subcommand: string, args: SaveFileArgs): Promise<ToolResult> {
  if (!fp) {
    return { ok: false, output: '✖ 文件保存能力未注入（env.filePicker 缺省）—— 浏览器 File System Access 由场景提供', error: 'filePicker not injected' };
  }
  const filename = args.filename ?? '';
  const content = args.content ?? '';
  if (!filename) return { ok: false, output: `✖ save ${subcommand} 缺少必填参数 --filename <文件名>` };
  if (subcommand === 'save') {
    try {
      const r = await fp.save({ suggestedName: filename, data: content });
      if (!r.ok) {
        if (r.canceled) return { ok: false, output: `（用户取消保存：未写入文件 "${filename}"）`, error: 'user canceled save' };
        return { ok: false, output: `✖ 保存失败：${r.error ?? '未知错误'}`, error: r.error };
      }
      return { ok: true, output: `✓ 已保存到用户文件 "${filename}"（${content.length} 字符）` };
    } catch (err) {
      const t = translateCapabilityError(err, '文件保存');
      return { ok: false, output: t.output, error: t.error };
    }
  }
  if (subcommand === 'download') {
    try {
      await fp.download({ filename, data: content });
      return { ok: true, output: `✓ 已触发下载 "${filename}"（${content.length} 字符；blob 下载链）` };
    } catch (err) {
      const t = translateCapabilityError(err, '文件下载');
      return { ok: false, output: t.output, error: t.error };
    }
  }
  return { ok: false, output: `✖ save 未知子命令 "${subcommand}"（可用：save/download）` };
}

// ---------- ToolEntry ----------

const SAVE_DESC =
  'save：把内容保存为文件。子命令 save --filename --content（File System Access 存用户文件，需手势授权；取消/拒绝 → 可读结果）' +
  ' / download --filename --content（blob 下载链）。参数进 args 对象：{"subcommand":"save","args":{"filename":"out.lgdl","content":"title: t"}}。';

const SAVE_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['save', 'download'], description: 'save 子命令。' },
    args: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: '文件名（必填）。' },
        content: { type: 'string', description: '文件内容（可空）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function saveFileHelp(): string {
  return [
    'save —— 把内容保存为文件（用户文件 / 下载链两路径）',
    '用法：save save --filename <文件> --content <内容>；save download --filename <文件> --content <内容>',
    '',
    '示例：save download --filename out.svg --content "<svg…>"',
    '说明：save = File System Access（需用户手势授权；取消 → 可读结果）；download = blob 下载链。',
  ].join('\n');
}

export function createSaveFileToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'save',
    summary: '内容存为文件（File System Access + 下载链两路径）',
    schema: { name: 'save', description: SAVE_DESC, parameters: SAVE_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'net',
    executor: async (tc) => executeSaveFile(env.filePicker, tc.subcommand, { filename: tc.args.filename, content: tc.args.content }),
    help: saveFileHelp,
  };
}
