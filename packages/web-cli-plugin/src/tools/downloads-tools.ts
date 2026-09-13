/**
 * Downloads tool (`downloads`) — FR-054 (author ruling 2026-09-13).
 *
 * The author approved **read-only** access to the download history, declared as
 * an **`optional_permissions`** capability (`permissions` stays unchanged).
 * Subcommand surface is deliberately minimal:
 *
 *   list   → read (allow)  list recent downloads (bounded, privacy-projected)
 *   search → read (allow)  search downloads by filename/URL fragment
 *
 * **NOT implemented on purpose** (author ruling: 「不做取消/删除」): `cancel`,
 * `pause`, `resume`, `erase`, `removeFile`, `open`, `show`. Those are readable
 * refusals naming the reason — never a silent no-op.
 *
 * Hard rules:
 *   - plugin-level capability (`group: 'plugin'`), permission-gated (not
 *     origin-gated) — available with no site bound;
 *   - unauthorized never silently disappears: every subcommand returns the
 *     readable「未开启：去『⚙ 设置 → 能力与隐私』点『开启下载记录访问』」;
 *   - privacy: only the **basename** of the local path is shown (never the full
 *     directory tree) and the source URL is reduced to origin+path by default;
 *   - every subcommand is audited (zero plaintext).
 *
 * The chrome API is injected (`DownloadsToolDeps`) so this module stays
 * node-testable; the background service worker owns the real `chrome.downloads`
 * calls (see `service-worker.ts`).
 */
import type { ToolEntry, ToolResult, ToolRisk } from '@lgdl/web-cli-base';
import type { PluginAuditSink } from '../security/audit-sink.js';
import { redactTabUrl } from './tabs-tools.js';

/** Flat, dot-free LLM function name. */
export const DOWNLOADS_TOOL_NAME = 'downloads';
/** Help-group key (plugin-level capability). */
export const DOWNLOADS_GROUP = 'plugin';

export const DOWNLOADS_SUBCOMMANDS = ['list', 'search'] as const;
export type DownloadsSubcommand = (typeof DOWNLOADS_SUBCOMMANDS)[number];

/** Deliberately-not-implemented verbs (readable refusal, never a silent no-op). */
export const DOWNLOADS_UNSUPPORTED_SUBCOMMANDS = [
  'cancel',
  'pause',
  'resume',
  'erase',
  'remove',
  'removefile',
  'open',
  'show',
  'delete',
] as const;

/** Per-subcommand risk (both read → allow). */
export const DOWNLOADS_SUBCOMMAND_RISKS: Record<DownloadsSubcommand, ToolRisk> = {
  list: 'read',
  search: 'read',
};

/** Readable, actionable copy shown whenever the capability permission is absent. */
export const DOWNLOADS_NOT_ENABLED_TEXT =
  '✖ downloads 未开启：去「⚙ 设置 → 能力与隐私」点「开启下载记录访问」（需要授予下载记录读取权限；未授权时不会静默失败）。';

/** Readable copy when the read privacy toggle is off. */
export const DOWNLOADS_READ_DISABLED_TEXT =
  '✖ downloads 已关闭：下载记录读取在「⚙ 设置 → 能力与隐私」被关闭。请在设置中重新开启。';

/** One raw download as seen by the background (`chrome.downloads.search`). */
export interface DownloadRecord {
  id: number;
  filename?: string;
  url?: string;
  /** `in_progress` | `interrupted` | `complete`. */
  state?: string;
  bytesReceived?: number;
  totalBytes?: number;
  mime?: string;
  paused?: boolean;
  danger?: string;
  /** `file` | `url`. */
  downloadType?: string;
}

/** Injected chrome-side operations + capability state. */
export interface DownloadsToolDeps {
  /** Whether the `downloads` optional permission is currently granted. */
  hasPermission(): boolean | Promise<boolean>;
  /** Privacy toggle: the read-only tool is exposed. */
  readEnabled(): boolean;
  /** Recent downloads (`chrome.downloads.search({})`). */
  listDownloads(): Promise<DownloadRecord[]>;
  /** Search downloads by filename/URL fragment. */
  searchDownloads(query: string): Promise<DownloadRecord[]>;
  audit: PluginAuditSink;
}

/** Maximum downloads rendered in one reply (bounded; truncation disclosed). */
export const DOWNLOADS_MAX_ROWS = 100;

/** Local path → basename only (never leak the directory tree). */
export function basenameOf(filePath: string | undefined): string {
  const p = (filePath ?? '').trim();
  if (!p) return '(未知文件)';
  const parts = p.split(/[\\/]+/).filter(Boolean);
  return parts.length ? (parts[parts.length - 1] as string) : p;
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** A privacy-safe projection of one download. */
export interface DownloadView {
  id: number;
  name: string;
  url: string;
  state: string;
  size: string;
  mime?: string;
  paused?: boolean;
  danger?: string;
}

/** Project one raw download into a privacy-safe view. */
export function toDownloadView(rec: DownloadRecord, full: boolean): DownloadView {
  const size =
    rec.totalBytes && rec.totalBytes > 0
      ? `${formatBytes(rec.bytesReceived ?? 0)} / ${formatBytes(rec.totalBytes)}`
      : formatBytes(rec.bytesReceived ?? 0);
  return {
    id: rec.id,
    name: basenameOf(rec.filename),
    url: redactTabUrl(rec.url, full),
    state: rec.state ?? '(未知状态)',
    size,
    ...(rec.mime ? { mime: rec.mime } : {}),
    ...(rec.paused ? { paused: true } : {}),
    ...(rec.danger ? { danger: rec.danger } : {}),
  };
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Render a download list readably (bounded + explicit truncation). */
export function formatDownloadList(views: readonly DownloadView[], full: boolean, header = '下载记录'): string {
  if (views.length === 0) return `（${header}：无结果）`;
  const lines = [
    `${header}（${views.length} 项）｜${
      full ? '⚠ --full 模式：来源 URL 含 query/fragment（可能携带敏感串），已进入上下文' : '隐私默认：文件名仅 basename、来源 URL 仅 origin+path'
    }`,
  ];
  for (const v of views) {
    const flags = [v.state];
    if (v.paused) flags.push('已暂停');
    if (v.danger) flags.push(`⚠${v.danger}`);
    lines.push(`- [${v.id}] ${v.name} — ${v.url} — ${flags.join(' · ')} — ${v.size}${v.mime ? ` — ${v.mime}` : ''}`);
  }
  lines.push('说明：本工具只读（list/search）；取消/暂停/删除/打开等操作未实现（作者裁决不做），不会静默执行。');
  return lines.join('\n');
}

function auditSubcommand(deps: DownloadsToolDeps, subcommand: string, ok: boolean, detail: string): void {
  deps.audit.recordPlugin({
    type: 'downloads',
    ts: Date.now(),
    tool: DOWNLOADS_TOOL_NAME,
    subcommand,
    decision: ok ? 'ok' : 'fail',
    detail,
  });
}

/** The `downloads` tool help text (self-documenting). */
export function downloadsToolHelp(): string {
  return [
    'downloads —— 浏览器下载记录（只读，可选权限能力；需在「⚙ 设置 → 能力与隐私」开启）',
    '子命令：',
    '  list   [--full true] [--limit <n>]   列出下载记录（默认 basename + origin+path）',
    '  search --query <片段>                 按文件名/来源 URL 片段搜索',
    '明确不实现：cancel / pause / resume / erase / removeFile / open / show（只读能力，不做取消或删除）。',
    '风险档位：list/search=read（放行）。',
    '未授权时不会静默失败：返回可读的「去设置开启下载记录访问」提示。',
    '隐私：文件名仅 basename（不暴露目录树）；来源 URL 默认去 query/fragment；审计零明文。',
  ].join('\n');
}

/**
 * Build the single `downloads` `ToolEntry`.
 *
 * Top-level `risk: 'read'` — there is no mutating subcommand by design. A call
 * for a not-implemented verb (cancel/erase/…) is a readable refusal.
 */
export function createDownloadsToolEntry(deps: DownloadsToolDeps): ToolEntry {
  const schemaDescription =
    'Read the browser download history (optional permission, read-only). "list" lists recent downloads; ' +
    '"search" searches by filename/URL fragment. cancel/pause/erase/open are intentionally NOT implemented. ' +
    'When the permission is not granted the tool returns a readable "open Settings" notice instead of failing silently.';

  const auditFail = (sub: string, output: string, error: string, detail: string): ToolResult => {
    auditSubcommand(deps, sub, false, detail);
    return { ok: false, output, error };
  };

  return {
    name: DOWNLOADS_TOOL_NAME,
    namespace: '',
    summary: '下载记录（只读：list / search）',
    risk: 'read',
    subcommandRisks: { ...DOWNLOADS_SUBCOMMAND_RISKS },
    group: DOWNLOADS_GROUP,
    schema: {
      name: DOWNLOADS_TOOL_NAME,
      description: schemaDescription,
      parameters: {
        type: 'object',
        properties: {
          subcommand: {
            type: 'string',
            description: '子命令：list / search',
            enum: [...DOWNLOADS_SUBCOMMANDS],
          },
          args: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'search：按文件名/来源 URL 片段搜索' },
              full: { type: 'string', description: 'list/search：传 "true" 返回含 query/fragment 的完整来源 URL（默认仅 origin+path）' },
              limit: { type: 'string', description: `list：最多返回条数（默认 ${DOWNLOADS_MAX_ROWS}，上限 ${DOWNLOADS_MAX_ROWS}）` },
            },
          },
        },
        required: ['subcommand'],
      },
    },
    help: downloadsToolHelp,
    executor: async (tc): Promise<ToolResult> => {
      const sub = (tc.subcommand ?? '').trim().toLowerCase();
      const args = tc.args ?? {};

      if ((DOWNLOADS_UNSUPPORTED_SUBCOMMANDS as readonly string[]).includes(sub)) {
        return auditFail(
          sub,
          `✖ downloads ${sub} 未实现：本能力为只读（作者裁决不做取消/删除/打开）；仅支持 list / search`,
          'downloads-unsupported-subcommand',
          `明确不实现的子命令 ${sub}（可读拒绝）`,
        );
      }
      if (!(DOWNLOADS_SUBCOMMANDS as readonly string[]).includes(sub)) {
        return auditFail(
          sub || '(空)',
          `✖ 未知子命令「${sub || '(空)'}」；downloads 支持：${DOWNLOADS_SUBCOMMANDS.join(' / ')}`,
          'downloads-unknown-subcommand',
          '未知子命令',
        );
      }

      // GATE 1: optional permission. Never silently disappear / never pretend.
      let permitted = false;
      try {
        permitted = (await deps.hasPermission()) === true;
      } catch {
        permitted = false;
      }
      if (!permitted) {
        return auditFail(sub, DOWNLOADS_NOT_ENABLED_TEXT, 'downloads-permission-missing', '下载记录权限未授予（可读拒绝）');
      }

      // GATE 2: privacy toggle (read default on).
      if (!deps.readEnabled()) {
        return auditFail(sub, DOWNLOADS_READ_DISABLED_TEXT, 'downloads-read-disabled', '读开关关闭（可读拒绝）');
      }

      const full = args.full === 'true' || args.full === '1';
      try {
        if (sub === 'list') {
          const limit = (() => {
            const raw = (args.limit ?? '').trim();
            if (!raw) return DOWNLOADS_MAX_ROWS;
            if (!/^\d+$/.test(raw)) return undefined;
            return Math.min(Number(raw), DOWNLOADS_MAX_ROWS);
          })();
          if (limit === undefined) {
            return auditFail('list', `✖ downloads list 的 --limit 必须是非负整数，收到「${args.limit}」`, 'downloads-invalid-args', '参数非法（--limit）');
          }
          let rows: DownloadRecord[];
          try {
            rows = await deps.listDownloads();
          } catch (err) {
            return auditFail('list', `✖ 读取下载记录失败：${errText(err)}`, 'downloads-list-failed', 'listDownloads 异常');
          }
          const total = rows.length;
          const shown = rows.slice(0, limit).map((r) => toDownloadView(r, full));
          const output =
            formatDownloadList(shown, full) +
            (total > shown.length ? `\n（已截断：共 ${total} 条，仅显示前 ${shown.length} 条；可用 --limit 调整或 search 缩小范围）` : '');
          auditSubcommand(deps, 'list', true, `total=${total} shown=${shown.length}${full ? ' full=true' : ''}`);
          return { ok: true, output };
        }

        const query = (args.query ?? '').trim();
        if (!query) {
          return auditFail('search', '✖ downloads search 需要 --query <文件名/URL 片段>', 'downloads-invalid-args', '缺 --query');
        }
        let rows: DownloadRecord[];
        try {
          rows = await deps.searchDownloads(query);
        } catch (err) {
          return auditFail('search', `✖ 搜索下载记录失败：${errText(err)}`, 'downloads-search-failed', 'searchDownloads 异常');
        }
        const views = rows.slice(0, DOWNLOADS_MAX_ROWS).map((r) => toDownloadView(r, full));
        const output =
          formatDownloadList(views, full, `搜索下载「${query}」`) +
          (rows.length > views.length ? `\n（已截断：共 ${rows.length} 条，仅显示前 ${views.length} 条）` : '');
        auditSubcommand(deps, 'search', true, `queryLen=${query.length} count=${views.length}`);
        return { ok: true, output };
      } catch (err) {
        return auditFail(sub, `✖ downloads ${sub} 失败：${errText(err)}`, 'downloads-unexpected', '未预期异常');
      }
    },
  };
}
