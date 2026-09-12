/**
 * Tab-management tool (`tabs`) — author decision ③ (2026-09-12).
 *
 * The author **approved** the `tabs` permission (accepting Chrome's install
 * warning「读取您的浏览记录」). The tool is deliberately minimal:
 *
 *   list   → read   (default allow)  list open tabs (privacy-default URL redaction)
 *   switch → ui     (ask)            activate a tab, auto-bind it and adopt its session
 *   open   → write  (ask)            open a new http(s) tab, best-effort auto-bind
 *
 * **No `close`** — closing tabs is explicitly out of scope (author decision).
 *
 * Hard rules enforced here:
 *   - only `http:`/`https:` URLs are accepted for `open`; `javascript:`/`data:`/
 *     `file:`/`chrome:`/`about:` … are rejected readably (never silently);
 *   - `list` returns **origin + path only** by default (query + fragment removed)
 *     so a user's search string never rides into the LLM context; `--full` is an
 *     explicit opt-in and its privacy impact is disclosed in the output;
 *   - every subcommand is audited readably with no plaintext secrets;
 *   - the tool is registered as a **plugin-level** capability (`group: 'plugin'`),
 *     so it is available with no site bound / no origin authorized. Its
 *     per-subcommand risk still goes through the plugin policy (`open`/`switch`
 *     need confirmation).
 *
 * The chrome API is injected (`TabsToolDeps`) so this module stays node-testable;
 * the background service worker owns the real `chrome.tabs` calls (see
 * `service-worker.ts`).
 */
import type { ToolEntry, ToolResult, ToolRisk } from '@lgdl/web-cli-base';
import type { PluginAuditSink } from '../security/audit-sink.js';

/** Flat, dot-free LLM function name (`^[a-zA-Z0-9_-]+$`). */
export const TABS_TOOL_NAME = 'tabs';
/** Help-group key (plugin-level capability — NOT the site-tool group). */
export const TABS_GROUP = 'plugin';

/** The three supported subcommands. `close` is deliberately absent. */
export const TABS_SUBCOMMANDS = ['list', 'switch', 'open'] as const;
export type TabsSubcommand = (typeof TABS_SUBCOMMANDS)[number];

/** Per-subcommand risk (effective risk for dispatch; never widened). */
export const TABS_SUBCOMMAND_RISKS: Record<TabsSubcommand, ToolRisk> = {
  list: 'read',
  switch: 'ui',
  open: 'write',
};

/** One raw tab as seen by the background (`chrome.tabs.query`). */
export interface TabRecord {
  id: number;
  title?: string;
  url?: string;
  active: boolean;
}

/** Readable receipt of a tab operation. */
export interface TabOperationResult {
  ok: boolean;
  output: string;
  error?: string;
  origin?: string;
  sessionId?: string;
  tabId?: number;
}

/** Injected chrome-side operations (background owns the real API). */
export interface TabsToolDeps {
  /** All open tabs (raw URLs; this module applies privacy redaction). */
  listTabs(): Promise<TabRecord[]>;
  /** Activate + auto-bind + adopt the origin session for an already-resolved tab. */
  switchToTab(tab: TabRecord): Promise<TabOperationResult>;
  /** Create a new tab for an already-validated http(s) URL (best-effort auto-bind). */
  openTab(url: string): Promise<TabOperationResult>;
  isAuthorized(origin: string): boolean | Promise<boolean>;
  sessionIdForOrigin(origin: string): string;
  audit: PluginAuditSink;
}

function ok(output: string, extra: Partial<TabOperationResult> = {}): TabOperationResult {
  return { ok: true, output, ...extra };
}

function fail(output: string, error = 'tabs-error'): TabOperationResult {
  return { ok: false, output, error };
}

/** The http(s) origin of a URL, or null when it is not an operable web page. */
export function httpOriginOf(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin;
  } catch {
    /* unparseable */
  }
  return null;
}

/** Whether a URL is an operable web page (http/https only). */
export function isAllowedTabUrl(raw: string | undefined): boolean {
  return httpOriginOf(raw) !== null;
}

/**
 * Privacy redaction for tab URLs.
 *
 * Default (`full === false`) keeps **origin + path only** and drops the query
 * string and fragment, so user search terms / tokens never enter the LLM
 * context. `--full` is an explicit opt-in. Non-http(s) pages never expose their
 * path/query — only the scheme is shown readably.
 */
export function redactTabUrl(raw: string | undefined, full: boolean): string {
  if (!raw) return '（无地址 / 受限页）';
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return '（地址无法解析）';
  }
  if (u.protocol === 'http:' || u.protocol === 'https:') {
    return full ? raw : `${u.origin}${u.pathname}`;
  }
  return full ? raw : `${u.protocol}//…（${u.protocol.replace(/:$/, '')} 页面，不可操作）`;
}

/** Parsed `switch` target reference. */
export interface TabRef {
  id?: number;
  match?: string;
  error?: string;
}

/** Parse `switch` args: exactly one of `--id` / `--match` is required. */
export function parseTabRef(args: Record<string, string>): TabRef {
  const rawId = (args.id ?? '').trim();
  const match = (args.match ?? '').trim();
  if (rawId && match) return { error: '✖ tabs switch 的 --id 与 --match 互斥，请只提供一个' };
  if (!rawId && !match) return { error: '✖ tabs switch 需要 --id <tabId> 或 --match <域名/URL 片段>' };
  if (rawId) {
    if (!/^\d+$/.test(rawId)) return { error: `✖ tabs switch 的 --id 必须是数字，收到「${rawId}」` };
    return { id: Number(rawId) };
  }
  return { match };
}

/** A privacy-safe projection of one tab for display/an (audited) list. */
export interface TabListView {
  id: number;
  title: string;
  url: string;
  active: boolean;
  authorized: boolean;
  restricted: boolean;
  sessionId?: string;
}

/** Human-readable list rendering (query/fragment already stripped unless `full`). */
export function formatTabList(rows: readonly TabListView[], full: boolean): string {
  if (rows.length === 0) return '（没有打开的标签页）';
  const lines = [
    `标签页（${rows.length} 个）｜${
      full ? '⚠ --full 模式：URL 含 query/fragment（可能携带敏感串），已进入上下文' : '隐私默认：仅 origin+path（已去除 query/fragment）'
    }`,
  ];
  for (const r of rows) {
    const flags = [r.active ? '当前激活' : '非激活', r.authorized ? '已授权' : '未授权'].join(' · ');
    const session = r.sessionId ? `会话=${r.sessionId}` : '会话=（受限页/不可用）';
    lines.push(`- [${r.id}] ${r.title || '(无标题)'} — ${r.url} — ${flags} — ${session}`);
  }
  lines.push('提示：切换用 tabs switch --id <id>（或 --match <域名片段>）；打开用 tabs open --url <http(s) URL>。本工具不支持关闭标签页。');
  return lines.join('\n');
}

function auditSubcommand(
  deps: TabsToolDeps,
  subcommand: string,
  result: TabOperationResult,
  detail: string,
): void {
  deps.audit.recordPlugin({
    type: 'tabs',
    ts: Date.now(),
    tool: TABS_TOOL_NAME,
    subcommand,
    decision: result.ok ? 'ok' : 'fail',
    ...(result.origin ? { origin: result.origin } : {}),
    detail,
  });
}

/** The `tabs` tool help text (self-documenting). */
export function tabsToolHelp(): string {
  return [
    'tabs —— 标签页管理（插件级能力，无需站点授权即可用）',
    '子命令：',
    '  list  [--full true]        列出打开的标签页（默认仅 origin+path，去 query/fragment）',
    '  switch (--id <tabId> | --match <域名/URL 片段>)  激活标签页，自动绑定并切到该站点会话',
    '  open  --url <http(s) URL>  打开新标签页（仅 http(s)，拒绝 javascript:/data:/file:/chrome:/about: 等）',
    '风险档位：list=read（放行）/ switch=ui（需确认）/ open=write（需确认）。',
    '明确不支持：close（不关闭任何标签页）。',
  ].join('\n');
}

/**
 * Build the single `tabs` `ToolEntry`.
 *
 * `subcommandRisks` drives the upstream effective-risk resolution; a conservative
 * top-level `risk: 'write'` is the fallback for an empty/unknown subcommand so a
 * malformed call can never fall below confirmation.
 */
export function createTabsToolEntry(deps: TabsToolDeps): ToolEntry {
  const schemaDescription =
    'Manage browser tabs: "list" lists open tabs (privacy default: origin+path only, no query/fragment); ' +
    '"switch" activates a tab by id or match, auto-binds it and adopts that site\'s session; ' +
    '"open" opens a new http(s) URL tab (non-http(s) schemes are rejected). ' +
    'Closing tabs ("close") is NOT supported.';

  return {
    name: TABS_TOOL_NAME,
    namespace: '',
    summary: '标签页管理（list / switch / open；不含 close）',
    risk: 'write',
    subcommandRisks: { ...TABS_SUBCOMMAND_RISKS },
    group: TABS_GROUP,
    schema: {
      name: TABS_TOOL_NAME,
      description: schemaDescription,
      parameters: {
        type: 'object',
        properties: {
          subcommand: { type: 'string', description: '子命令：list / switch / open' },
          args: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'switch：目标标签页数字 id（与 match 二选一）' },
              match: { type: 'string', description: 'switch：按域名/URL/标题片段匹配（与 id 二选一）' },
              url: { type: 'string', description: 'open：要打开的 http(s) URL（其他 scheme 一律拒绝）' },
              full: {
                type: 'string',
                description: 'list：传 "true" 返回含 query/fragment 的完整 URL（默认仅 origin+path，保护隐私）',
              },
            },
          },
        },
        required: ['subcommand'],
      },
    },
    help: tabsToolHelp,
    executor: async (tc): Promise<ToolResult> => {
      const sub = (tc.subcommand ?? '').trim();
      const args = tc.args ?? {};

      switch (sub) {
        case 'list': {
          const full = args.full === 'true' || args.full === '1';
          let raw: TabRecord[];
          try {
            raw = await deps.listTabs();
          } catch (err) {
            const res = fail(`✖ 无法读取标签页：${err instanceof Error ? err.message : String(err)}`, 'tabs-list-failed');
            auditSubcommand(deps, 'list', res, 'listTabs 异常');
            return { ok: false, output: res.output, error: res.error };
          }
          const view: TabListView[] = [];
          for (const t of raw) {
            const origin = httpOriginOf(t.url);
            let authorized = false;
            let sessionId: string | undefined;
            if (origin) {
              try {
                authorized = await deps.isAuthorized(origin);
              } catch {
                authorized = false;
              }
              try {
                sessionId = deps.sessionIdForOrigin(origin);
              } catch {
                sessionId = undefined;
              }
            }
            view.push({
              id: t.id,
              title: t.title ?? '',
              url: redactTabUrl(t.url, full),
              active: t.active === true,
              authorized,
              restricted: origin === null,
              ...(sessionId ? { sessionId } : {}),
            });
          }
          const output = formatTabList(view, full);
          const res = ok(output);
          auditSubcommand(deps, 'list', res, `count=${view.length}${full ? ' full=true' : ''}`);
          return { ok: true, output };
        }

        case 'switch': {
          const ref = parseTabRef(args);
          if (ref.error) {
            const res = fail(ref.error, 'tabs-invalid-args');
            auditSubcommand(deps, 'switch', res, '参数非法');
            return { ok: false, output: res.output, error: res.error };
          }
          let rows: TabRecord[];
          try {
            rows = await deps.listTabs();
          } catch (err) {
            const res = fail(`✖ 无法读取标签页：${err instanceof Error ? err.message : String(err)}`, 'tabs-list-failed');
            auditSubcommand(deps, 'switch', res, 'listTabs 异常');
            return { ok: false, output: res.output, error: res.error };
          }
          let target: TabRecord | undefined;
          if (ref.id !== undefined) {
            target = rows.find((t) => t.id === ref.id);
            if (!target) {
              const res = fail(`✖ 未找到 id=${ref.id} 的标签页（可用 tabs list 查看）`, 'tabs-not-found');
              auditSubcommand(deps, 'switch', res, `id=${ref.id} 未找到`);
              return { ok: false, output: res.output, error: res.error };
            }
          } else {
            const needle = (ref.match ?? '').toLowerCase();
            const matches = rows.filter(
              (t) => (t.url ?? '').toLowerCase().includes(needle) || (t.title ?? '').toLowerCase().includes(needle),
            );
            if (matches.length === 0) {
              const res = fail(`✖ 未找到匹配「${ref.match}」的标签页（可用 tabs list 查看）`, 'tabs-not-found');
              auditSubcommand(deps, 'switch', res, `match=${ref.match} 无命中`);
              return { ok: false, output: res.output, error: res.error };
            }
            if (matches.length > 1) {
              const active = matches.find((t) => t.active);
              if (active) {
                target = active;
              } else {
                const listing = matches.map((t) => `  [${t.id}] ${redactTabUrl(t.url, false)}`).join('\n');
                const res = fail(
                  `✖ 「${ref.match}」匹配到 ${matches.length} 个标签页，请用 --id 指定：\n${listing}`,
                  'tabs-ambiguous',
                );
                auditSubcommand(deps, 'switch', res, `match=${ref.match} 命中 ${matches.length} 个（歧义，未切换）`);
                return { ok: false, output: res.output, error: res.error };
              }
            } else {
              target = matches[0];
            }
          }
          if (!isAllowedTabUrl(target.url)) {
            const res = fail(
              `✖ 目标标签页是受限页面（${redactTabUrl(target.url, false)}），无法切换/绑定；请选择 http(s) 页面`,
              'tabs-restricted',
            );
            auditSubcommand(deps, 'switch', res, `受限页 id=${target.id}`);
            return { ok: false, output: res.output, error: res.error };
          }
          let res: TabOperationResult;
          try {
            res = await deps.switchToTab(target);
          } catch (err) {
            res = fail(`✖ 切换标签页失败：${err instanceof Error ? err.message : String(err)}`, 'tabs-switch-failed');
          }
          const detail = `target=${target.id} origin=${httpOriginOf(target.url) ?? '?'} session=${res.sessionId ?? '?'}`;
          auditSubcommand(deps, 'switch', res, detail);
          return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
        }

        case 'open': {
          const url = (args.url ?? '').trim();
          if (!url) {
            const res = fail('✖ tabs open 需要 --url <http(s) URL>', 'tabs-invalid-args');
            auditSubcommand(deps, 'open', res, '缺 --url');
            return { ok: false, output: res.output, error: res.error };
          }
          let scheme = '';
          try {
            scheme = new URL(url).protocol;
          } catch {
            const res = fail(`✖ tabs open 的 --url 不是合法 URL：${url}`, 'tabs-invalid-url');
            auditSubcommand(deps, 'open', res, 'URL 无法解析');
            return { ok: false, output: res.output, error: res.error };
          }
          if (scheme !== 'http:' && scheme !== 'https:') {
            const res = fail(
              `✖ tabs open 仅允许 http(s) URL，拒绝 ${scheme}// scheme（javascript:/data:/file:/chrome:/about: 等一律拒绝）`,
              'tabs-scheme-rejected',
            );
            auditSubcommand(deps, 'open', res, `scheme=${scheme} 拒绝`);
            return { ok: false, output: res.output, error: res.error };
          }
          let res: TabOperationResult;
          try {
            res = await deps.openTab(url);
          } catch (err) {
            res = fail(`✖ 打开标签页失败：${err instanceof Error ? err.message : String(err)}`, 'tabs-open-failed');
          }
          auditSubcommand(deps, 'open', res, `url=${redactTabUrl(url, false)}`);
          return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
        }

        default: {
          const res = fail(
            `✖ 未知子命令「${sub || '(空)'}」；tabs 支持：${TABS_SUBCOMMANDS.join(' / ')}（不支持 close）`,
            'tabs-unknown-subcommand',
          );
          auditSubcommand(deps, sub || '(空)', res, '未知子命令');
          return { ok: false, output: res.output, error: res.error };
        }
      }
    },
  };
}
