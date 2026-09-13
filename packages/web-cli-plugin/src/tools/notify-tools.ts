/**
 * Notify tool (`notify`) — FR-055 (author ruling 2026-09-13, TASK-039).
 *
 * The author approved **read + write** system-notification access, declared as
 * the **optional permission** `notifications` (`permissions` stays unchanged).
 * The tool is implemented **plugin-side** with `chrome.notifications` because the
 * base `notify` entry (and the browser `Notification` constructor) is a
 * **page-context** face: the service worker has no DOM and `new Notification()`
 * is not available there. Reusing the base entry would therefore register a tool
 * that can never run — the plugin implementation uses the host API instead.
 *
 * Subcommand surface:
 *
 *   list  → read  (allow)  list the ids of currently-shown notifications +
 *                          the system notification permission level (no content)
 *   send  → write (ask)    create ONE notification (`--title`, optional `--body`)
 *   clear → write (ask)    clear ONE notification by `--id` (never batch)
 *
 * Hard rules:
 *   - the tool is registered as a **plugin-level** capability (`group: 'plugin'`),
 *     so it is available with no site bound / no origin authorized; it is
 *     permission-gated, not origin-gated;
 *   - **unauthorized** never silently disappears or pretends success: every
 *     subcommand returns the readable「未开启：去『⚙ 设置 → 能力与隐私』点『开启通知』」;
 *   - the privacy toggle gates the whole tool; a disabled tool leaves
 *     `deriveTools()` entirely (see `host.ts`) and a direct dispatch is rejected;
 *   - notification **content (title/body) must never enter the audit trail or a
 *     log** — only lengths are recorded (FR-006 / NFR-001);
 *   - `clear` accepts exactly one `--id`; `--all` / batch intent is rejected
 *     readably (a stray flag can never clear every notification);
 *   - `send` requires a non-empty `--title`; a failure from `chrome.notifications`
 *     is translated readably (never a silent no-op).
 *
 * The chrome API is injected (`NotifyToolDeps`) so this module stays
 * node-testable; the background service worker owns the real `chrome.notifications`
 * calls (see `service-worker.ts`).
 */
import type { ToolEntry, ToolResult, ToolRisk } from '@lgdl/web-cli-base';
import type { PluginAuditSink } from '../security/audit-sink.js';

/** Flat, dot-free LLM function name (`^[a-zA-Z0-9_-]+$`). */
export const NOTIFY_TOOL_NAME = 'notify';
/** Help-group key (plugin-level capability — NOT the site-tool group). */
export const NOTIFY_GROUP = 'plugin';

export const NOTIFY_SUBCOMMANDS = ['list', 'send', 'clear'] as const;
export type NotifySubcommand = (typeof NOTIFY_SUBCOMMANDS)[number];

/** Per-subcommand risk (effective risk for dispatch; never widened). */
export const NOTIFY_SUBCOMMAND_RISKS: Record<NotifySubcommand, ToolRisk> = {
  list: 'read',
  send: 'write',
  clear: 'write',
};

/** Readable, actionable copy shown whenever the capability permission is absent. */
export const NOTIFY_NOT_ENABLED_TEXT =
  '✖ notify 未开启：去「⚙ 设置 → 能力与隐私」点「开启通知」（需要授予系统通知权限；未授权时不会静默失败）。';

/** Readable copy when the user turned the notify privacy toggle off. */
export const NOTIFY_DISABLED_TEXT =
  '✖ notify 已关闭：系统通知能力在「⚙ 设置 → 能力与隐私」被关闭。请在设置中重新开启。';

/** One listing row (id + whether Chrome still shows it). */
export interface NotifyListEntry {
  id: string;
  /** True when the notification id is still tracked by the browser. */
  shown: boolean;
}

/** Result of `chrome.notifications.getAll` + `getPermissionLevel`. */
export interface NotifyListing {
  entries: NotifyListEntry[];
  /** `granted` | `denied` (Chrome's OS-level notification permission). */
  permissionLevel: string;
}

/** Result of a notification mutation. */
export interface NotifyOperationResult {
  ok: boolean;
  output: string;
  error?: string;
  id?: string;
}

/** Injected chrome-side operations + capability state. */
export interface NotifyToolDeps {
  /** Whether the `notifications` optional permission is currently granted. */
  hasPermission(): boolean | Promise<boolean>;
  /** Privacy toggle: the tool is exposed. */
  enabled(): boolean;
  /** Currently-shown notification ids + the OS permission level (no content). */
  listNotifications(): Promise<NotifyListing>;
  /** Create ONE notification (already-validated title/body). */
  createNotification(input: { title: string; body?: string }): Promise<NotifyOperationResult>;
  /** Clear ONE notification by id (never batch). */
  clearNotification(id: string): Promise<NotifyOperationResult>;
  audit: PluginAuditSink;
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Render the notification id listing readably (bounded, content-free). */
export function formatNotifyList(listing: NotifyListing, maxRows = 100): string {
  const entries = Array.isArray(listing.entries) ? listing.entries : [];
  const shown = entries.filter((e) => e.shown !== false);
  const lines = [
    `通知｜系统通知权限：${listing.permissionLevel || '(未知)'}｜当前显示 ${shown.length} 条${
      entries.length > shown.length ? `（另有 ${entries.length - shown.length} 条已记录）` : ''
    }`,
  ];
  if (entries.length === 0) {
    lines.push('（当前没有由本扩展创建的通知）');
  } else {
    for (const e of entries.slice(0, maxRows)) lines.push(`- [${e.id}]${e.shown === false ? '（已消除）' : ''}`);
    if (entries.length > maxRows) lines.push(`（已截断：共 ${entries.length} 条，仅显示前 ${maxRows} 条）`);
    lines.push('提示：清除单条用 notify clear --id <id>（一次只清一个）；发送用 notify send --title <标题> [--body <正文>]。');
  }
  lines.push('隐私：本工具不回显通知正文（仅 id 与权限级别）；审计只记长度，零明文。');
  return lines.join('\n');
}

function auditSubcommand(deps: NotifyToolDeps, subcommand: string, ok: boolean, detail: string): void {
  deps.audit.recordPlugin({
    type: 'notify',
    ts: Date.now(),
    tool: NOTIFY_TOOL_NAME,
    subcommand,
    decision: ok ? 'ok' : 'fail',
    detail,
  });
}

/** The `notify` tool help text (self-documenting). */
export function notifyToolHelp(): string {
  return [
    'notify —— 系统通知（可选权限能力；需在「⚙ 设置 → 能力与隐私」开启通知）',
    '子命令：',
    '  list                       列出现有通知 id + 系统通知权限级别（不回显正文）',
    '  send   --title <标题> [--body <正文>]   创建一条系统通知',
    '  clear  --id <通知 id>       清除单条通知（禁止批量，不支持 --all）',
    '实现路径：插件侧 chrome.notifications（宿主 API）—— base notify 为页内 Notification 面，在扩展 SW 不可用。',
    '风险档位：list=read（放行）/ send、clear=write（需确认，插件级工具不纳入「写操作自动」）。',
    '未授权 / 开关关闭时不会静默失败：返回可读的「去设置开启通知」提示。',
    '隐私：通知正文（title/body）绝不进入审计或日志（只记长度）；list 不回显正文。',
  ].join('\n');
}

/**
 * Build the single `notify` `ToolEntry`.
 *
 * A conservative top-level `risk: 'write'` is the fallback for an empty/unknown
 * subcommand so a malformed call can never fall below confirmation.
 */
export function createNotifyToolEntry(deps: NotifyToolDeps): ToolEntry {
  const schemaDescription =
    'Manage system notifications via chrome.notifications (optional permission). "list" lists notification ids + ' +
    'the OS permission level; "send" creates ONE notification (--title, optional --body); "clear" removes ONE ' +
    'notification by --id (batch rejected). When the permission is not granted the tool returns a readable ' +
    '"open Settings" notice instead of failing silently. Notification content is never written to the audit log.';

  const auditFail = (sub: string, output: string, error: string, detail: string): ToolResult => {
    auditSubcommand(deps, sub, false, detail);
    return { ok: false, output, error };
  };

  return {
    name: NOTIFY_TOOL_NAME,
    namespace: '',
    summary: '系统通知（list / send / clear；chrome.notifications）',
    risk: 'write',
    subcommandRisks: { ...NOTIFY_SUBCOMMAND_RISKS },
    group: NOTIFY_GROUP,
    schema: {
      name: NOTIFY_TOOL_NAME,
      description: schemaDescription,
      parameters: {
        type: 'object',
        properties: {
          subcommand: {
            type: 'string',
            description: '子命令：list / send / clear',
            enum: [...NOTIFY_SUBCOMMANDS],
          },
          args: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'send：通知标题（必填）' },
              body: { type: 'string', description: 'send：通知正文（可选）' },
              id: { type: 'string', description: 'clear：目标通知 id（必填，一次只清一个）' },
            },
          },
        },
        required: ['subcommand'],
      },
    },
    help: notifyToolHelp,
    executor: async (tc): Promise<ToolResult> => {
      const sub = (tc.subcommand ?? '').trim().toLowerCase();
      const args = tc.args ?? {};

      if (!(NOTIFY_SUBCOMMANDS as readonly string[]).includes(sub)) {
        // `--all` on clear is a batch intent → reject readably before anything else.
        if (sub === 'clear' && args.all !== undefined) {
          return auditFail('clear', '✖ notify clear 禁止批量清除：一次只能清除一个通知（不支持 --all）', 'notify-batch-rejected', '收到 --all，按「禁止批量」拒绝');
        }
        return auditFail(
          sub || '(空)',
          `✖ 未知子命令「${sub || '(空)'}」；notify 支持：${NOTIFY_SUBCOMMANDS.join(' / ')}`,
          'notify-unknown-subcommand',
          '未知子命令',
        );
      }
      if (sub === 'clear' && args.all !== undefined) {
        return auditFail('clear', '✖ notify clear 禁止批量清除：一次只能清除一个通知（不支持 --all）', 'notify-batch-rejected', '收到 --all，按「禁止批量」拒绝');
      }

      // GATE 1: optional permission. Never silently disappear / never pretend.
      let permitted = false;
      try {
        permitted = (await deps.hasPermission()) === true;
      } catch {
        permitted = false;
      }
      if (!permitted) {
        return auditFail(sub, NOTIFY_NOT_ENABLED_TEXT, 'notify-permission-missing', '通知权限未授予（可读拒绝）');
      }

      // GATE 2: privacy toggle (default on).
      if (!deps.enabled()) {
        return auditFail(sub, NOTIFY_DISABLED_TEXT, 'notify-disabled', '通知开关关闭（可读拒绝）');
      }

      try {
        if (sub === 'list') {
          let listing: NotifyListing;
          try {
            listing = await deps.listNotifications();
          } catch (err) {
            return auditFail('list', `✖ 读取通知列表失败：${errText(err)}`, 'notify-list-failed', 'listNotifications 异常');
          }
          auditSubcommand(deps, 'list', true, `count=${Array.isArray(listing.entries) ? listing.entries.length : 0} level=${listing.permissionLevel || '-'}`);
          return { ok: true, output: formatNotifyList(listing) };
        }

        if (sub === 'send') {
          const title = (args.title ?? '').trim();
          if (!title) {
            return auditFail('send', '✖ notify send 需要 --title <通知标题>', 'notify-invalid-args', '缺 --title');
          }
          const body = (args.body ?? '').trim();
          let res: NotifyOperationResult;
          try {
            res = await deps.createNotification({ title, ...(body ? { body } : {}) });
          } catch (err) {
            res = { ok: false, output: `✖ 创建通知失败：${errText(err)}`, error: 'notify-send-failed' };
          }
          // Privacy: only lengths are audited — never the title/body text.
          auditSubcommand(deps, 'send', res.ok, `titleLen=${title.length} bodyLen=${body.length}`);
          return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
        }

        // clear
        const id = (args.id ?? '').trim();
        if (!id) {
          return auditFail('clear', '✖ notify clear 需要 --id <通知 id>（一次只清一个）', 'notify-invalid-args', '缺 --id');
        }
        let res: NotifyOperationResult;
        try {
          res = await deps.clearNotification(id);
        } catch (err) {
          res = { ok: false, output: `✖ 清除通知失败：${errText(err)}`, error: 'notify-clear-failed' };
        }
        auditSubcommand(deps, 'clear', res.ok, `id=${id}`);
        return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
      } catch (err) {
        return auditFail(sub, `✖ notify ${sub} 失败：${errText(err)}`, 'notify-unexpected', '未预期异常');
      }
    },
  };
}
