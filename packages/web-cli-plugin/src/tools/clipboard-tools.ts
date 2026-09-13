/**
 * Clipboard tool (`clipboard`) — FR-055 (author ruling 2026-09-13, TASK-039).
 *
 * The author approved **read + write** clipboard access, declared as the
 * **optional permissions** `clipboardRead` / `clipboardWrite` (`permissions`
 * stays unchanged). The write half is default ON; the **read half is default
 * OFF** (privacy-sensitive, heavy prompt — the user must opt in explicitly).
 *
 * ── Implementation path (which one, and why)
 * The service worker has **no `navigator.clipboard`** (verified 2026-09-13: a
 * SW probe reports `typeof navigator.clipboard === 'undefined'`), and Chrome
 * exposes no host clipboard API for MV3 extensions. So the text read/write runs
 * in the **extension page** (the side panel document, where the chat lives) via
 * `navigator.clipboard` — which the granted `clipboardRead`/`clipboardWrite`
 * permissions make prompt-free — with a `document.execCommand` fallback that
 * also works in extension pages. The background forwards the request through the
 * injected `readText` / `writeText` seams; the panel reports which path ran.
 * Consequence (documented, never silent): a clipboard call needs the side panel
 * open; otherwise the tool returns a readable「请保持侧栏打开」refusal.
 *
 * ── Subcommand surface
 *   read        → state (ask; **never auto-authorized**)  read clipboard text
 *   write       → write (ask)                              write clipboard text
 *   write-html  → write (ask)  **NOT implemented** (readable crop refusal)
 *   write-image → write (ask)  **NOT implemented** (readable crop refusal)
 *   paste-read  → state        **NOT implemented** (readable crop refusal)
 *
 * The three cropped subcommands stay visible in the schema (so the baseline
 * parity gate keeps its subcommand-level check) but always return a readable
 * 「插件裁剪：未实现」 — they never perform clipboard work and never pretend.
 *
 * ── Hard rules
 *   - plugin-level capability (`group: 'plugin'`): permission-gated, not
 *     origin-gated; available with no site bound;
 *   - `read` is risky-tier `state` and is **never** eligible for
 *     auto-authorization: even with「读操作自动」on it still asks (the host's
 *     auto-authorize path only ever allows non-destructive `site`-group
 *     read/write — `state`, plugin group, and unknown risk all stay `ask`/`deny`);
 *   - the clipboard **content must never enter the audit trail or a log**: only
 *     the character count is recorded (FR-006 / NFR-001);
 *   - unauthorized / toggle-off never silently disappears: readable refusals.
 *
 * The chrome/panel seams are injected (`ClipboardToolDeps`) so this module stays
 * node-testable; the background service worker owns the real forwarding + audit.
 */
import type { ToolEntry, ToolResult, ToolRisk } from '@lgdl/web-cli-base';
import type { PluginAuditSink } from '../security/audit-sink.js';

/** Flat, dot-free LLM function name (`^[a-zA-Z0-9_-]+$`). */
export const CLIPBOARD_TOOL_NAME = 'clipboard';
/** Help-group key (plugin-level capability — NOT the site-tool group). */
export const CLIPBOARD_GROUP = 'plugin';

/**
 * Full base-compatible subcommand set (the parity gate checks every baseline
 * subcommand). `read` / `write` are implemented; the three rich subcommands are
 * deliberately cropped and return a readable refusal.
 */
export const CLIPBOARD_SUBCOMMANDS = ['read', 'write', 'write-html', 'write-image', 'paste-read'] as const;
export type ClipboardSubcommand = (typeof CLIPBOARD_SUBCOMMANDS)[number];

/** Implemented subcommands. */
export const CLIPBOARD_IMPLEMENTED_SUBCOMMANDS = ['read', 'write'] as const;

/** Deliberately-cropped subcommands (readable「未实现」refusal, never a no-op). */
export const CLIPBOARD_CROPPED_SUBCOMMANDS = ['write-html', 'write-image', 'paste-read'] as const;

/**
 * Per-subcommand risk (never widened from the base semantics).
 *
 * `read` is `state` — the privacy-sensitive tier that is excluded from
 * auto-authorization by design (see `security/auto-authorize.ts` hard floor 5).
 */
export const CLIPBOARD_SUBCOMMAND_RISKS: Record<ClipboardSubcommand, ToolRisk> = {
  read: 'state',
  write: 'write',
  'write-html': 'write',
  'write-image': 'write',
  'paste-read': 'state',
};

/** Readable, actionable copy shown whenever the clipboard permission is absent. */
export const CLIPBOARD_NOT_ENABLED_TEXT =
  '✖ clipboard 未开启：去「⚙ 设置 → 能力与隐私」点「开启剪贴板访问」（需要授予剪贴板读/写权限；未授权时不会静默失败）。';

/** Readable copy when the user turned the clipboard read toggle off (default OFF). */
export const CLIPBOARD_READ_DISABLED_TEXT =
  '✖ clipboard 读操作已关闭：读取剪贴板默认关（隐私敏感），需在「⚙ 设置 → 能力与隐私」显式开启「允许读取剪贴板」。写入不受影响。';

/** Readable copy when the user turned the clipboard write toggle off. */
export const CLIPBOARD_WRITE_DISABLED_TEXT =
  '✖ clipboard 写操作已关闭：写入剪贴板在「⚙ 设置 → 能力与隐私」被关闭。请在设置中重新开启。';

/** Result of one extension-page clipboard operation. */
export interface ClipboardIoResult {
  ok: boolean;
  /** Read result (present for `read`). */
  text?: string;
  /** Number of characters read/written (audit-safe). */
  chars?: number;
  /** Honest path label (`navigator.clipboard` / `document.execCommand`). */
  path?: string;
  error?: string;
}

/** Injected seams + capability state. */
export interface ClipboardToolDeps {
  /** Whether the optional `clipboardRead` permission is currently granted. */
  hasReadPermission(): boolean | Promise<boolean>;
  /** Whether the optional `clipboardWrite` permission is currently granted. */
  hasWritePermission(): boolean | Promise<boolean>;
  /** Privacy toggle for the read subcommand (default OFF). */
  readEnabled(): boolean;
  /** Privacy toggle for the write subcommand (default ON). */
  writeEnabled(): boolean;
  /** Read the clipboard text in the extension page (never in this SW). */
  readText(): Promise<ClipboardIoResult>;
  /** Write the clipboard text in the extension page (never in this SW). */
  writeText(text: string): Promise<ClipboardIoResult>;
  audit: PluginAuditSink;
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Readable refusal for the deliberately-cropped rich subcommands. */
export const CLIPBOARD_CROPPED_TEXT =
  '✖ clipboard 该子命令未实现（插件裁剪）：本插件只做纯文本 read / write；write-html / write-image / paste-read 未实现（不会静默执行，也不会假装成功）。';

function auditSubcommand(deps: ClipboardToolDeps, subcommand: string, ok: boolean, detail: string): void {
  deps.audit.recordPlugin({
    type: 'clipboard',
    ts: Date.now(),
    tool: CLIPBOARD_TOOL_NAME,
    subcommand,
    decision: ok ? 'ok' : 'fail',
    // `detail` carries ONLY lengths/paths — never clipboard plaintext.
    detail,
  });
}

/** The `clipboard` tool help text (self-documenting). */
export function clipboardToolHelp(): string {
  return [
    'clipboard —— 剪贴板纯文本读/写（可选权限能力；需在「⚙ 设置 → 能力与隐私」开启剪贴板访问）',
    '子命令：',
    '  read                      读取剪贴板文本（风险档 state；默认关，需显式开启「允许读取剪贴板」；永不自动放行）',
    '  write --text <内容>        写入剪贴板文本（风险档 write，需确认）',
    '明确不实现（插件裁剪）：write-html / write-image / paste-read → 返回可读「未实现」，不静默、不假装成功。',
    '实现路径：纯文本读/写经侧栏扩展页 navigator.clipboard（可用时）或 document.execCommand 回退；',
    '  需保持侧栏打开（service worker 无 navigator.clipboard，且扩展无宿主剪贴板 API）。',
    '风险档位：read=state（state/evaluate 永不纳入自动授权；即使「读操作自动」开启，剪贴板读仍然 ask）/ write=write（ask）。',
    '隐私：剪贴板内容绝不进入审计或日志（只记字符数）；未授权/开关关闭时返回可读提示，不静默失败。',
  ].join('\n');
}

/**
 * Build the single `clipboard` `ToolEntry`.
 *
 * Top-level `risk: 'state'` is the conservative fallback (the read tier) so a
 * malformed/unknown call can never fall below an ask. The unknown-subcommand
 * branch still returns a readable refusal.
 */
export function createClipboardToolEntry(deps: ClipboardToolDeps): ToolEntry {
  const schemaDescription =
    'Read/write the clipboard as plain text (optional permissions clipboardRead/clipboardWrite). "read" returns ' +
    'the clipboard text (risk tier state — never auto-authorized; privacy toggle defaults OFF); "write" sets the ' +
    'clipboard text (risk tier write; confirmation). write-html / write-image / paste-read are intentionally NOT ' +
    'implemented (readable refusal). When the permission is not granted the tool returns a readable "open Settings" notice.';

  const auditFail = (sub: string, output: string, error: string, detail: string): ToolResult => {
    auditSubcommand(deps, sub, false, detail);
    return { ok: false, output, error };
  };

  return {
    name: CLIPBOARD_TOOL_NAME,
    namespace: '',
    summary: '剪贴板纯文本（read / write；读默认关且永不自动放行）',
    risk: 'state',
    subcommandRisks: { ...CLIPBOARD_SUBCOMMAND_RISKS },
    group: CLIPBOARD_GROUP,
    schema: {
      name: CLIPBOARD_TOOL_NAME,
      description: schemaDescription,
      parameters: {
        type: 'object',
        properties: {
          subcommand: {
            type: 'string',
            description: '子命令：read / write（write-html / write-image / paste-read 未实现）',
            enum: [...CLIPBOARD_SUBCOMMANDS],
          },
          args: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'write：要写入剪贴板的文本' },
            },
          },
        },
        required: ['subcommand'],
      },
    },
    help: clipboardToolHelp,
    executor: async (tc): Promise<ToolResult> => {
      const sub = (tc.subcommand ?? '').trim().toLowerCase();
      const args = tc.args ?? {};

      if (!(CLIPBOARD_SUBCOMMANDS as readonly string[]).includes(sub)) {
        return auditFail(
          sub || '(空)',
          `✖ 未知子命令「${sub || '(空)'}」；clipboard 支持：${CLIPBOARD_SUBCOMMANDS.join(' / ')}`,
          'clipboard-unknown-subcommand',
          '未知子命令',
        );
      }

      // Deliberate crop: refused before any permission/IO. Readable, never silent.
      if ((CLIPBOARD_CROPPED_SUBCOMMANDS as readonly string[]).includes(sub)) {
        return auditFail(sub, CLIPBOARD_CROPPED_TEXT, 'clipboard-not-implemented', `插件裁剪：${sub} 未实现（可读拒绝）`);
      }

      const isRead = sub === 'read';

      // GATE 1: the matching optional permission. Never silently disappear.
      let permitted = false;
      try {
        permitted = isRead ? (await deps.hasReadPermission()) === true : (await deps.hasWritePermission()) === true;
      } catch {
        permitted = false;
      }
      if (!permitted) {
        return auditFail(sub, CLIPBOARD_NOT_ENABLED_TEXT, 'clipboard-permission-missing', `剪贴板${isRead ? '读' : '写'}权限未授予（可读拒绝）`);
      }

      // GATE 2: privacy toggle (read default off / write default on).
      if (isRead && !deps.readEnabled()) {
        return auditFail('read', CLIPBOARD_READ_DISABLED_TEXT, 'clipboard-read-disabled', '读开关关闭（默认为关；可读拒绝）');
      }
      if (!isRead && !deps.writeEnabled()) {
        return auditFail('write', CLIPBOARD_WRITE_DISABLED_TEXT, 'clipboard-write-disabled', '写开关关闭（可读拒绝）');
      }

      try {
        if (isRead) {
          let res: ClipboardIoResult;
          try {
            res = await deps.readText();
          } catch (err) {
            res = { ok: false, error: errText(err) };
          }
          if (!res.ok) {
            return auditFail('read', `✖ 读取剪贴板失败：${res.error ?? '未知原因'}`, 'clipboard-read-failed', `路径=${res.path ?? '-'} 失败`);
          }
          const text = res.text ?? '';
          // Audit carries the length only — never the clipboard content.
          auditSubcommand(deps, 'read', true, `chars=${text.length} path=${res.path ?? '-'}`);
          return { ok: true, output: text === '' ? '（剪贴板为空）' : text };
        }

        const text = args.text ?? '';
        if (text === '') {
          return auditFail('write', '✖ clipboard write 需要 --text <内容>', 'clipboard-invalid-args', '缺 --text');
        }
        let res: ClipboardIoResult;
        try {
          res = await deps.writeText(text);
        } catch (err) {
          res = { ok: false, error: errText(err) };
        }
        if (!res.ok) {
          return auditFail('write', `✖ 写入剪贴板失败：${res.error ?? '未知原因'}`, 'clipboard-write-failed', `路径=${res.path ?? '-'} 失败`);
        }
        // Audit carries the length only — never the clipboard content.
        auditSubcommand(deps, 'write', true, `chars=${text.length} path=${res.path ?? '-'}`);
        return { ok: true, output: `✓ 已写入剪贴板（${text.length} 字符；路径 ${res.path ?? '未知'}）` };
      } catch (err) {
        return auditFail(sub, `✖ clipboard ${sub} 失败：${errText(err)}`, 'clipboard-unexpected', '未预期异常');
      }
    },
  };
}
