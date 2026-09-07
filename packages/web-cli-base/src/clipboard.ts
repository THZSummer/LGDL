/**
 * clipboard.ts —— clipboard 工具（FR-025/FR-009；剪贴板读写，P2 试点）。
 *
 * 生态位（discovery §3.3 E 组 ◐）：剪贴板 → Clipboard API（navigator.clipboard，
 * 需用户手势/权限）。失败转译（NotAllowedError/SecurityError → 可读 + 手势指引，
 * FR-009/EC-003），会话不中断。
 *
 * v4（TASK-008/FR-021/022/ADR-009，additive 尾部追加）：富内容写（write-html/write-image
 * 经 env.clipboardRich 新缝：ClipboardItem text/html+image/png+text/plain 并存，文本 read/write
 * 既有语义零回归）+ paste-read（读 platform-events pasteCapture 槽：用户主动粘贴富内容；
 * 无手势系统剪贴板读 → 不支持说明 NG-012）。富写/读 = ask（risk ui/write 面）+ FR-006 脱敏。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformClipboard, PlatformEnv } from './platform.js';
import { translateCapabilityError } from './platform.js';
import { maskTextPayload, RICH_CLIPBOARD_TEXT_POLICY } from './sensitive.js';
import { attributionHelpLines } from './ext-attribution.js';
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

// ---------- v4 富剪贴板子命令（TASK-008/FR-021/022：write-html/write-image/paste-read） ----------

/** v4 富子命令集合（路由到 executeClipboardRich；文本 read/write 既有路径零改动）。 */
export const CLIPBOARD_RICH_SUBCOMMANDS = ['write-html', 'write-image', 'paste-read'] as const;

export type ClipboardRichSubcommand = (typeof CLIPBOARD_RICH_SUBCOMMANDS)[number];

/** dataURL → Blob（image/png 富写载体；非法前缀 → 可读错误）。 */
function dataUrlToBlob(dataUrl: string): { blob?: Blob; error?: string } {
  const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/s.exec(dataUrl.trim());
  if (!m) return { error: '✖ write-image --dataurl 需为 data:image/png;base64,...（或 jpeg/webp）形态' };
  try {
    const raw = atob(m[2]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xff;
    const type = `image/${m[1] === 'jpeg' ? 'jpeg' : m[1]}`;
    return { blob: new Blob([bytes as unknown as BlobPart], { type }) };
  } catch (err) {
    return { error: `✖ write-image dataURL base64 解码失败：${err instanceof Error ? err.message : String(err)}` };
  }
}

/** html 片段 → 文本降级（text/plain 并存：去标签粗提取，供纯文本消费端）。 */
function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * v4 富剪贴板执行器（env.clipboardRich 富写缝 + env.events.sources.pasteCapture 粘贴读槽）。
 * write-html/write-image 授权失败 → v3 FR-009 转译（EC-008 两路可读）；paste-read 无捕获槽 → 不支持说明。
 */
export async function executeClipboardRich(env: PlatformEnv, subcommand: string, args: Record<string, string>): Promise<ToolResult> {
  try {
    if (subcommand === 'write-html') {
      const html = args.html ?? '';
      if (html === '') return { ok: false, output: '✖ clipboard write-html 缺少 --html <富文本/HTML 片段>' };
      const rich = env.clipboardRich;
      if (!rich) {
        return { ok: false, output: '✖ 富剪贴板能力未注入（env.clipboardRich 缺省 —— 浏览器场景自动装配）', error: 'clipboardRich not injected' };
      }
      await rich.writeItem({ textHtml: html, textPlain: htmlToPlainText(html) });
      return { ok: true, output: `✓ 富剪贴板已写入（text/html ${html.length} 字符 + text/plain 并存；ClipboardItem，FR-021）` };
    }
    if (subcommand === 'write-image') {
      const dataUrl = args.dataurl ?? '';
      if (dataUrl === '') return { ok: false, output: '✖ clipboard write-image 缺少 --dataurl <image/png dataURL>' };
      const rich = env.clipboardRich;
      if (!rich) {
        return { ok: false, output: '✖ 富剪贴板能力未注入（env.clipboardRich 缺省）', error: 'clipboardRich not injected' };
      }
      const { blob, error } = dataUrlToBlob(dataUrl);
      if (error || !blob) return { ok: false, output: error ?? 'blob 解析失败' };
      await rich.writeItem({ imagePng: blob });
      return { ok: true, output: `✓ 图片已写入剪贴板（${blob.type} · ${blob.size} B）` };
    }
    if (subcommand === 'paste-read') {
      const hub = env.events;
      const slot = hub?.sources.pasteCapture.lastCapture?.();
      if (!slot) {
        return {
          ok: false,
          output: '✖ clipboard paste-read 无最近用户主动粘贴捕获（NG-012：无用户手势的系统剪贴板读/历史不支持 —— 需用户在页面实际粘贴后读取）',
          error: 'no paste capture',
        };
      }
      const htmlMasked = slot.textHtml !== undefined ? maskTextPayload(slot.textHtml, RICH_CLIPBOARD_TEXT_POLICY) : undefined;
      const plainMasked = slot.textPlain !== undefined ? maskTextPayload(slot.textPlain, RICH_CLIPBOARD_TEXT_POLICY) : undefined;
      const lines: string[] = [`最近一次用户粘贴（${new Date(slot.ts).toISOString()}；内容已脱敏 FR-006）`];
      if (htmlMasked !== undefined) lines.push(`text/html: ${htmlMasked.length > 2000 ? `${htmlMasked.slice(0, 2000)}…（预算截断）` : htmlMasked}`);
      if (plainMasked !== undefined) lines.push(`text/plain: ${plainMasked}`);
      if (slot.files?.length) {
        lines.push(`文件项：${slot.files.map((f) => `${f.name}（${f.type} · ${f.size} B）`).join('、')}（内容不预读 —— 可经 save/export 链落盘，v3 FR-029）`);
      }
      if (lines.length === 1) lines.push('（捕获槽为空 —— 粘贴内容不可读（图片剪贴板仅文件项可列元数据））');
      return { ok: true, output: lines.join('\n') };
    }
    return { ok: false, output: `✖ clipboard 未知富子命令 "${subcommand}"（可用：${CLIPBOARD_RICH_SUBCOMMANDS.join('/')}）` };
  } catch (err) {
    const t = translateCapabilityError(err, '剪贴板富写');
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
    subcommand: { type: 'string', enum: ['read', 'write', 'write-html', 'write-image', 'paste-read'], description: 'clipboard 子命令（read/write 文本 + write-html/write-image/paste-read 富面 v4）。' },
    args: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'write 的文本。' },
        html: { type: 'string', description: 'write-html 的富文本/HTML 片段（ClipboardItem text/html；text/plain 并存）。' },
        dataurl: { type: 'string', description: 'write-image 的图片 dataURL（data:image/png;base64,...）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function clipboardHelp(): string {
  return [
    'clipboard —— 剪贴板读写（navigator.clipboard；手势/权限失败转译）',
    '用法：clipboard read / clipboard write --text <内容>',
    'v4 富剪贴板（FR-021/022，TASK-008）：clipboard write-html --html <片段> / write-image --dataurl <png dataURL> / paste-read（读最近一次用户主动粘贴捕获槽）',
    '',
    '示例：clipboard write --text "a -> b" / clipboard write-html --html "<b>hi</b>" / clipboard paste-read',
    '说明：需用户手势/授权；被拒/非安全上下文 → 可读错误（含指引），会话不中断。',
    '富写 = ClipboardItem text/html+image/png+text/plain 并存（env.clipboardRich，与文本缝互不覆盖）；读 = ask + 脱敏（FR-006）；无手势系统剪贴板读/历史 → 不支持说明（NG-012）',
    ...attributionHelpLines(),
  ].join('\n');
}

export function createClipboardToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'clipboard',
    summary: '剪贴板读写（手势/权限失败转译；v4 富写 write-html/write-image + paste-read）',
    schema: { name: 'clipboard', description: CLIPBOARD_DESC, parameters: CLIPBOARD_SCHEMA as unknown as Record<string, unknown> },
    risk: 'ui',
    group: 'ui',
    subcommandRisks: {
      'write-html': 'write',
      'write-image': 'write',
      'paste-read': 'ui',
    },
    executor: async (tc) => {
      // 富子命令路由（文本 read/write 既有 executor 零改动，零回归）
      if ((CLIPBOARD_RICH_SUBCOMMANDS as readonly string[]).includes(tc.subcommand)) {
        return executeClipboardRich(env, tc.subcommand, tc.args);
      }
      return executeClipboard(env.clipboard, tc.subcommand, { text: tc.args.text });
    },
    help: clipboardHelp,
  };
}
