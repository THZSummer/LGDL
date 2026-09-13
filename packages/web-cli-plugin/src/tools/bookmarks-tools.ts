/**
 * Bookmark tool (`bookmarks`) — FR-054 (author ruling 2026-09-13).
 *
 * The author approved **read + write** access to bookmarks, declared as an
 * **`optional_permissions`** capability (`permissions` stays unchanged). The
 * write side is `ask`; `remove` is additionally **destructive** and must never be
 * auto-authorized even when「写操作自动」is on (FR-052 / ADR-017 hard floor 4).
 *
 * Subcommand surface:
 *
 *   list   → read   (allow)  list bookmarks (privacy default: origin+path, no query/fragment)
 *   search → read   (allow)  search bookmarks by title/URL fragment
 *   tree   → read   (allow)  hierarchical view (folders + items), bounded
 *   add    → write  (ask)    add a bookmark (`--url` http(s) only)
 *   remove → write  (ask, **destructive**)  delete ONE bookmark by `--id`
 *   move   → write  (ask)    move ONE bookmark to `--parent` / `--index`
 *
 * Hard rules:
 *   - the tool is registered as a **plugin-level** capability (`group: 'plugin'`),
 *     so it is available with no site bound / no origin authorized; it is
 *     permission-gated, not origin-gated;
 *   - **unauthorized** never silently disappears or pretends success: every
 *     subcommand returns the readable「未开启：去『⚙ 设置 → 能力与隐私』点『开启书签访问』」;
 *   - the read/write privacy toggles gate subcommand *groups*; a disabled group
 *     returns a readable refusal (the tool leaves the surface entirely only when
 *     **both** are off — see `host.ts`);
 *   - `remove` accepts exactly one `--id`; `--all` / batch intent is rejected
 *     readably (a stray match can never delete the wrong bookmark);
 *   - only `http:`/`https:` URLs are accepted for `add`; `javascript:`/`data:`/
 *     `file:`/`chrome:`/`about:` … are rejected readably;
 *   - every subcommand is audited (zero plaintext; URLs reduced to origin+path).
 *
 * The chrome API is injected (`BookmarksToolDeps`) so this module stays
 * node-testable; the background service worker owns the real `chrome.bookmarks`
 * calls (see `service-worker.ts`).
 */
import type { ToolEntry, ToolResult, ToolRisk } from '@lgdl/web-cli-base';
import type { PluginAuditSink } from '../security/audit-sink.js';
import { redactTabUrl } from './tabs-tools.js';

/** Flat, dot-free LLM function name (`^[a-zA-Z0-9_-]+$`). */
export const BOOKMARKS_TOOL_NAME = 'bookmarks';
/** Help-group key (plugin-level capability — NOT the site-tool group). */
export const BOOKMARKS_GROUP = 'plugin';

export const BOOKMARKS_SUBCOMMANDS = ['list', 'search', 'tree', 'add', 'remove', 'move'] as const;
export type BookmarksSubcommand = (typeof BOOKMARKS_SUBCOMMANDS)[number];

/** Read-only subcommands (privacy default ON). */
export const BOOKMARKS_READ_SUBCOMMANDS = ['list', 'search', 'tree'] as const;
/** Mutating subcommands (privacy default OFF; all `write` → ask). */
export const BOOKMARKS_WRITE_SUBCOMMANDS = ['add', 'remove', 'move'] as const;

/**
 * Destructive subcommands — never auto-authorized (hard floor 4). `remove`
 * deletes user data irreversibly, so it stays on the manual confirmation path
 * even when「写操作自动」is enabled.
 */
export const BOOKMARKS_DESTRUCTIVE_SUBCOMMANDS: ReadonlySet<string> = new Set(['remove']);

/** Whether a concrete bookmarks subcommand is destructive (fail-closed unknown). */
export function isBookmarksDestructive(subcommand?: string): boolean {
  return BOOKMARKS_DESTRUCTIVE_SUBCOMMANDS.has((subcommand ?? '').trim().toLowerCase());
}

/** Per-subcommand risk (effective risk for dispatch; never widened). */
export const BOOKMARKS_SUBCOMMAND_RISKS: Record<BookmarksSubcommand, ToolRisk> = {
  list: 'read',
  search: 'read',
  tree: 'read',
  add: 'write',
  remove: 'write',
  move: 'write',
};

/** Readable, actionable copy shown whenever the capability permission is absent. */
export const BOOKMARKS_NOT_ENABLED_TEXT =
  '✖ bookmarks 未开启：去「⚙ 设置 → 能力与隐私」点「开启书签访问」（需要授予书签读取/写入权限；未授权时不会静默失败）。';

/** Readable copy when the user turned the write group off (default OFF). */
export const BOOKMARKS_WRITE_DISABLED_TEXT =
  '✖ bookmarks 写操作已关闭：写子命令（add/remove/move）默认关，需在「⚙ 设置 → 能力与隐私」显式开启「书签写入」。读子命令不受影响。';

/** Readable copy when the user turned the read group off. */
export const BOOKMARKS_READ_DISABLED_TEXT =
  '✖ bookmarks 读操作已关闭：读子命令（list/search/tree）在「⚙ 设置 → 能力与隐私」被关闭。请在设置中重新开启。';

/** One raw bookmark as seen by the background (`chrome.bookmarks`). */
export interface BookmarkRecord {
  id: string;
  title?: string;
  url?: string;
  parentId?: string;
  index?: number;
  /** True for folders (no `url`). */
  folder?: boolean;
  children?: BookmarkRecord[];
}

/** Readable receipt of a bookmark operation. */
export interface BookmarkOperationResult {
  ok: boolean;
  output: string;
  error?: string;
  id?: string;
}

/**
 * Injected chrome-side operations + capability state.
 *
 * `readEnabled` / `writeEnabled` are supplied by the host from its privacy
 * state; `hasPermission` reflects `chrome.permissions.contains` for `bookmarks`.
 */
export interface BookmarksToolDeps {
  /** Whether the `bookmarks` optional permission is currently granted. */
  hasPermission(): boolean | Promise<boolean>;
  /** Privacy toggle: read subcommands exposed. */
  readEnabled(): boolean;
  /** Privacy toggle: write subcommands exposed. */
  writeEnabled(): boolean;
  /** All bookmarks (flat; folders included). */
  listBookmarks(): Promise<BookmarkRecord[]>;
  /** Search bookmarks by title/URL fragment. */
  searchBookmarks(query: string): Promise<BookmarkRecord[]>;
  /** Full bookmark tree (for `tree`). */
  getTree(): Promise<BookmarkRecord[]>;
  /** Create a bookmark (already-validated http(s) URL). */
  addBookmark(input: { url: string; title?: string; parentId?: string }): Promise<BookmarkOperationResult>;
  /** Delete ONE bookmark by id (irreversible). */
  removeBookmark(id: string): Promise<BookmarkOperationResult>;
  /** Move ONE bookmark to a parent/index. */
  moveBookmark(id: string, dest: { parentId?: string; index?: number }): Promise<BookmarkOperationResult>;
  /**
   * Readable「将删除哪个书签」summary for the confirmation dialog (title +
   * query/fragment-stripped URL). Resolved *before* the user decides.
   */
  describeTarget?(id: string): Promise<string | undefined>;
  audit: PluginAuditSink;
}

function ok(output: string, extra: Partial<BookmarkOperationResult> = {}): BookmarkOperationResult {
  return { ok: true, output, ...extra };
}

function fail(output: string, error = 'bookmarks-error'): BookmarkOperationResult {
  return { ok: false, output, error };
}

/** A privacy-safe projection of one bookmark. */
export interface BookmarkView {
  id: string;
  title: string;
  url?: string;
  folder: boolean;
}

/**
 * Privacy projection: folders show no URL; items show origin+path by default
 * (query/fragment stripped) unless `full` is an explicit opt-in. URL-like titles
 * (pages with no `<title>`) are projected the same way.
 */
export function toBookmarkView(rec: BookmarkRecord, full: boolean): BookmarkView {
  const isFolder = rec.folder === true || (rec.url === undefined && rec.folder !== false);
  const title = (rec.title ?? '').trim() || '(无标题)';
  if (isFolder) return { id: rec.id, title, folder: true };
  const url = redactTabUrl(rec.url, full);
  const urlLike = /^[a-z][a-z0-9+.-]*:\/\//i.test(title);
  return { id: rec.id, title: urlLike ? redactTabUrl(title, full) : title, url, folder: false };
}

/** Render a flat list readably. */
export function formatBookmarkList(views: readonly BookmarkView[], full: boolean, header = '书签'): string {
  if (views.length === 0) return `（${header}：无结果）`;
  const lines = [
    `${header}（${views.length} 项）｜${
      full ? '⚠ --full 模式：URL 含 query/fragment（可能携带敏感串），已进入上下文' : '隐私默认：URL 仅 origin+path（已去除 query/fragment）'
    }`,
  ];
  for (const v of views) {
    lines.push(v.folder ? `- [${v.id}] 📁 ${v.title}` : `- [${v.id}] ${v.title} — ${v.url}`);
  }
  lines.push('提示：新增用 bookmarks add --url <http(s) URL>；删除用 bookmarks remove --id <id>（需二次确认，一次只删一个）；移动用 bookmarks move --id <id> --parent <文件夹id>。');
  return lines.join('\n');
}

/** Maximum nodes rendered by `tree` (bounded; truncation is disclosed). */
export const BOOKMARKS_TREE_MAX_NODES = 300;

/** Render the bookmark tree with indentation (bounded + explicit truncation). */
export function formatBookmarkTree(
  roots: readonly BookmarkRecord[],
  full: boolean,
  maxNodes = BOOKMARKS_TREE_MAX_NODES,
): string {
  const lines: string[] = [
    `书签树｜${full ? '⚠ --full：URL 含 query/fragment' : '隐私默认：URL 仅 origin+path（去 query/fragment）'}`,
  ];
  let count = 0;
  let truncated = false;
  const walk = (nodes: readonly BookmarkRecord[], depth: number): void => {
    for (const node of nodes) {
      if (count >= maxNodes) {
        truncated = true;
        return;
      }
      count += 1;
      const view = toBookmarkView(node, full);
      const pad = '  '.repeat(depth);
      lines.push(view.folder ? `${pad}📁 ${view.title} [${view.id}]` : `${pad}• ${view.title} — ${view.url} [${view.id}]`);
      if (node.children?.length) walk(node.children, depth + 1);
      if (count >= maxNodes) {
        truncated = true;
        return;
      }
    }
  };
  walk(roots, 0);
  if (truncated) {
    lines.push(`（已截断：仅显示前 ${maxNodes} 项；完整内容请用 bookmarks list 或 search 缩小范围）`);
  }
  return lines.join('\n');
}

function auditSubcommand(
  deps: BookmarksToolDeps,
  subcommand: string,
  result: { ok: boolean; id?: string },
  detail: string,
  id?: string,
): void {
  const targetId = id ?? result.id;
  deps.audit.recordPlugin({
    type: 'bookmarks',
    ts: Date.now(),
    tool: BOOKMARKS_TOOL_NAME,
    subcommand,
    decision: result.ok ? 'ok' : 'fail',
    detail,
    ...(targetId ? { argsSummary: `id=${targetId}` } : {}),
  });
}

/** The `bookmarks` tool help text (self-documenting). */
export function bookmarksToolHelp(): string {
  return [
    'bookmarks —— 浏览器书签管理（可选权限能力；需在「⚙ 设置 → 能力与隐私」开启）',
    '子命令：',
    '  list   [--full true]        列出书签（默认 URL 仅 origin+path，去 query/fragment）',
    '  search --query <片段>        按标题/URL 片段搜索书签',
    '  tree   [--full true]        以树形展示书签（文件夹 + 条目；上限 300 项，超出截断并提示）',
    '  add    --url <http(s) URL> [--title <标题>] [--parent <文件夹 id>]   新增书签',
    '  remove --id <书签 id>        删除单个书签（**破坏性**：不可逆，需二次确认；禁止批量，不支持 --all）',
    '  move   --id <书签 id> [--parent <文件夹 id>] [--index <n>]           移动单个书签',
    '风险档位：list/search/tree=read（放行）/ add/remove/move=write（需确认，不受「写操作自动」放行）。',
    '未授权时不会静默失败：返回可读的「去设置开启书签访问」提示。',
    '隐私：不回显无关隐私面；URL 默认去除 query/fragment；审计零明文。',
  ].join('\n');
}

function parseNonNegativeInt(raw: string | undefined, name: string): { value?: number; error?: string } {
  const v = (raw ?? '').trim();
  if (!v) return {};
  if (!/^\d+$/.test(v)) return { error: `✖ bookmarks 的 --${name} 必须是非负整数，收到「${v}」` };
  return { value: Number(v) };
}

/**
 * Build the single `bookmarks` `ToolEntry`.
 *
 * A conservative top-level `risk: 'write'` is the fallback for an empty/unknown
 * subcommand so a malformed call can never fall below confirmation.
 */
export function createBookmarksToolEntry(deps: BookmarksToolDeps): ToolEntry {
  const schemaDescription =
    'Manage browser bookmarks (optional permission). "list" lists bookmarks; "search" searches by fragment; ' +
    '"tree" shows the folder tree; "add" creates an http(s) bookmark; "remove" deletes ONE bookmark by id ' +
    '(destructive + irreversible + confirmation, batch rejected); "move" moves ONE bookmark. ' +
    'When the permission is not granted the tool returns a readable "open Settings" notice instead of failing silently.';

  const auditFail = (sub: string, output: string, error: string, detail: string, id?: string): ToolResult => {
    const res = fail(output, error);
    auditSubcommand(deps, sub, { ...res, ...(id ? { id } : {}) }, detail);
    return { ok: false, output: res.output, error: res.error };
  };

  return {
    name: BOOKMARKS_TOOL_NAME,
    namespace: '',
    summary: '书签管理（list / search / tree / add / remove / move）',
    risk: 'write',
    subcommandRisks: { ...BOOKMARKS_SUBCOMMAND_RISKS },
    group: BOOKMARKS_GROUP,
    schema: {
      name: BOOKMARKS_TOOL_NAME,
      description: schemaDescription,
      parameters: {
        type: 'object',
        properties: {
          subcommand: {
            type: 'string',
            description: '子命令：list / search / tree / add / remove / move',
            enum: [...BOOKMARKS_SUBCOMMANDS],
          },
          args: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'search：按标题/URL 片段搜索' },
              url: { type: 'string', description: 'add：要收藏的 http(s) URL（其他 scheme 一律拒绝）' },
              title: { type: 'string', description: 'add：书签标题（可选）' },
              parent: { type: 'string', description: 'add/move：目标文件夹 id（可选；move 与 index 至少一个）' },
              id: { type: 'string', description: 'remove/move：目标书签 id（remove 必填，一次只删一个）' },
              index: { type: 'string', description: 'move：目标位置索引（非负整数）' },
              full: { type: 'string', description: 'list/tree：传 "true" 返回含 query/fragment 的完整 URL（默认仅 origin+path）' },
            },
          },
        },
        required: ['subcommand'],
      },
    },
    help: bookmarksToolHelp,
    executor: async (tc): Promise<ToolResult> => {
      const sub = (tc.subcommand ?? '').trim().toLowerCase();
      const args = tc.args ?? {};

      if (!(BOOKMARKS_SUBCOMMANDS as readonly string[]).includes(sub)) {
        return auditFail(
          sub || '(空)',
          `✖ 未知子命令「${sub || '(空)'}」；bookmarks 支持：${BOOKMARKS_SUBCOMMANDS.join(' / ')}`,
          'bookmarks-unknown-subcommand',
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
        return auditFail(sub, BOOKMARKS_NOT_ENABLED_TEXT, 'bookmarks-permission-missing', '书签权限未授予（可读拒绝）');
      }

      const isRead = (BOOKMARKS_READ_SUBCOMMANDS as readonly string[]).includes(sub);
      // GATE 2: privacy toggles (read default on / write default off).
      if (isRead && !deps.readEnabled()) {
        return auditFail(sub, BOOKMARKS_READ_DISABLED_TEXT, 'bookmarks-read-disabled', '读开关关闭（可读拒绝）');
      }
      if (!isRead && !deps.writeEnabled()) {
        return auditFail(sub, BOOKMARKS_WRITE_DISABLED_TEXT, 'bookmarks-write-disabled', '写开关关闭（可读拒绝）');
      }

      try {
        switch (sub as BookmarksSubcommand) {
          case 'list': {
            const full = args.full === 'true' || args.full === '1';
            let rows: BookmarkRecord[];
            try {
              rows = await deps.listBookmarks();
            } catch (err) {
              return auditFail('list', `✖ 读取书签失败：${errText(err)}`, 'bookmarks-list-failed', 'listBookmarks 异常');
            }
            const views = rows.map((r) => toBookmarkView(r, full));
            const output = formatBookmarkList(views, full);
            auditSubcommand(deps, 'list', { ok: true }, `count=${views.length}${full ? ' full=true' : ''}`);
            return { ok: true, output };
          }

          case 'search': {
            const query = (args.query ?? '').trim();
            if (!query) {
              return auditFail('search', '✖ bookmarks search 需要 --query <标题/URL 片段>', 'bookmarks-invalid-args', '缺 --query');
            }
            const full = args.full === 'true' || args.full === '1';
            let rows: BookmarkRecord[];
            try {
              rows = await deps.searchBookmarks(query);
            } catch (err) {
              return auditFail('search', `✖ 搜索书签失败：${errText(err)}`, 'bookmarks-search-failed', 'searchBookmarks 异常');
            }
            const views = rows.map((r) => toBookmarkView(r, full));
            const output = formatBookmarkList(views, full, `搜索「${query}」`);
            // Privacy: never audit the raw needle verbatim (only its length).
            auditSubcommand(deps, 'search', { ok: true }, `queryLen=${query.length} count=${views.length}`);
            return { ok: true, output };
          }

          case 'tree': {
            const full = args.full === 'true' || args.full === '1';
            let roots: BookmarkRecord[];
            try {
              roots = await deps.getTree();
            } catch (err) {
              return auditFail('tree', `✖ 读取书签树失败：${errText(err)}`, 'bookmarks-tree-failed', 'getTree 异常');
            }
            const output = formatBookmarkTree(roots, full);
            auditSubcommand(deps, 'tree', { ok: true }, `roots=${roots.length}${full ? ' full=true' : ''}`);
            return { ok: true, output };
          }

          case 'add': {
            const url = (args.url ?? '').trim();
            if (!url) {
              return auditFail('add', '✖ bookmarks add 需要 --url <http(s) URL>', 'bookmarks-invalid-args', '缺 --url');
            }
            let scheme = '';
            try {
              scheme = new URL(url).protocol;
            } catch {
              return auditFail('add', `✖ bookmarks add 的 --url 不是合法 URL：${url}`, 'bookmarks-invalid-url', 'URL 无法解析');
            }
            if (scheme !== 'http:' && scheme !== 'https:') {
              return auditFail(
                'add',
                `✖ bookmarks add 仅允许 http(s) URL，拒绝 ${scheme}// scheme（javascript:/data:/file:/chrome:/about: 等一律拒绝）`,
                'bookmarks-scheme-rejected',
                `scheme=${scheme} 拒绝`,
              );
            }
            const title = (args.title ?? '').trim();
            const parentId = (args.parent ?? '').trim();
            let res: BookmarkOperationResult;
            try {
              res = await deps.addBookmark({ url, ...(title ? { title } : {}), ...(parentId ? { parentId } : {}) });
            } catch (err) {
              res = fail(`✖ 新增书签失败：${errText(err)}`, 'bookmarks-add-failed');
            }
            auditSubcommand(deps, 'add', res, `url=${redactTabUrl(url, false)}`, res.id);
            return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
          }

          case 'remove': {
            // Destructive: single explicit id only — never a batch, never a guess.
            if (args.all !== undefined) {
              return auditFail(
                'remove',
                '✖ bookmarks remove 禁止批量删除：一次只能删除一个书签（不支持 --all）',
                'bookmarks-batch-rejected',
                '收到 --all，按「禁止批量」拒绝',
              );
            }
            const id = (args.id ?? '').trim();
            if (!id) {
              return auditFail('remove', '✖ bookmarks remove 需要 --id <书签 id>（一次只删一个）', 'bookmarks-invalid-args', '缺 --id');
            }
            let res: BookmarkOperationResult;
            try {
              res = await deps.removeBookmark(id);
            } catch (err) {
              res = fail(`✖ 删除书签失败：${errText(err)}`, 'bookmarks-remove-failed');
            }
            auditSubcommand(deps, 'remove', res, '已删除单个书签（不可逆）', id);
            return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
          }

          case 'move': {
            const id = (args.id ?? '').trim();
            if (!id) {
              return auditFail('move', '✖ bookmarks move 需要 --id <书签 id>', 'bookmarks-invalid-args', '缺 --id');
            }
            const parentId = (args.parent ?? '').trim();
            const index = parseNonNegativeInt(args.index, 'index');
            if (index.error) {
              return auditFail('move', index.error, 'bookmarks-invalid-args', '参数非法（--index）');
            }
            if (!parentId && index.value === undefined) {
              return auditFail('move', '✖ bookmarks move 需要 --parent <文件夹 id> 或 --index <n>（至少一个）', 'bookmarks-invalid-args', '缺 --parent/--index');
            }
            let res: BookmarkOperationResult;
            try {
              res = await deps.moveBookmark(id, {
                ...(parentId ? { parentId } : {}),
                ...(index.value !== undefined ? { index: index.value } : {}),
              });
            } catch (err) {
              res = fail(`✖ 移动书签失败：${errText(err)}`, 'bookmarks-move-failed');
            }
            auditSubcommand(deps, 'move', res, `parent=${parentId || '-'} index=${index.value ?? '-'}`, id);
            return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
          }
        }
      } catch (err) {
        return auditFail(sub, `✖ bookmarks ${sub} 失败：${errText(err)}`, 'bookmarks-unexpected', '未预期异常');
      }
      return auditFail(sub, `✖ 未知子命令「${sub}」`, 'bookmarks-unknown-subcommand', '未知子命令');
    },
  };
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
