/**
 * Tab-management tool (`tabs`) — author decision ③ (2026-09-12) + author
 * **reversal** (2026-09-13): the "no close" constraint was explicitly revoked.
 *
 * The author approved the `tabs` permission (accepting Chrome's install warning
 * 「读取您的浏览记录」). Subcommand surface:
 *
 *   list   → read   (default allow)  list open tabs (privacy-default URL redaction)
 *   switch → ui     (ask)            activate a tab, auto-bind it and adopt its session
 *   open   → write  (ask)            open a new http(s) tab, best-effort auto-bind
 *   mute   → write  (ask)            mute/unmute one tab (`--muted true|false`)
 *   pin    → write  (ask)            pin/unpin one tab (`--pinned true|false`)
 *   move   → write  (ask)            move one tab to `--index <n>` / `--window <id>`
 *   close  → write  (ask)            close ONE tab (`--id`/`--match`); irreversible
 *
 * **Author reversal (2026-09-13) — `close` is now supported.** The earlier
 * "close is deliberately out of scope" statement (source, `docs/dev.md` §12.4,
 * `docs/compliance.md` §9, spec FR-049) was an explicit author constraint that
 * the author has now explicitly revoked: 「标签页读写」包含 close,「完全放开 close」.
 * This is a **requirement change**, not a test downgrade. Safety handling of the
 * newly-allowed destructive op:
 *   - risk档 `write` (never downgraded) → default `ask` via `subcommandRisks`;
 *   - the confirm summary MUST show the target tab's **title + URL with
 *     query/fragment stripped** and state that closing is **irreversible** (and
 *     that closing the side panel's own page closes the panel with it);
 *   - **one tab at a time**: `--all` / any batch intent is rejected readably;
 *   - ambiguous `--match` (≥2 hits) is rejected with the candidate list — never
 *     auto-picked — so a stray substring cannot close the wrong tab;
 *   - restricted pages (`chrome://`, `file:`, …) and unknown `--id` are readable
 *     refusals (never silent);
 *   - every subcommand is audited (zero plaintext; URLs redacted to origin+path).
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
 *     per-subcommand risk still goes through the plugin policy (every mutating
 *     subcommand needs confirmation; `list` is the only allow tier).
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

/**
 * The supported subcommands.
 *
 * `close` is present by **author reversal (2026-09-13)**: 标签页读写包含 close，
 * 完全放开 close（撤销此前「明确不做 close」的约束）。
 */
export const TABS_SUBCOMMANDS = ['list', 'switch', 'open', 'mute', 'pin', 'move', 'close'] as const;
export type TabsSubcommand = (typeof TABS_SUBCOMMANDS)[number];

/** Subcommands that change browser state (all ask; `list` is the only read tier). */
export const TABS_WRITE_SUBCOMMANDS = ['open', 'mute', 'pin', 'move', 'close'] as const;

/** Per-subcommand risk (effective risk for dispatch; never widened). */
export const TABS_SUBCOMMAND_RISKS: Record<TabsSubcommand, ToolRisk> = {
  list: 'read',
  switch: 'ui',
  open: 'write',
  mute: 'write',
  pin: 'write',
  move: 'write',
  // Author reversal (2026-09-13): close is allowed but stays `write` → ask.
  close: 'write',
};

/** One raw tab as seen by the background (`chrome.tabs.query`). */
export interface TabRecord {
  id: number;
  title?: string;
  url?: string;
  active: boolean;
  muted?: boolean;
  pinned?: boolean;
  windowId?: number;
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
  /**
   * Author reversal (2026-09-13): mute/unmute one resolved tab. Optional only so
   * minimal node hosts stay constructible; a missing implementation is a readable
   * refusal, never a silent no-op.
   */
  muteTab?(tab: TabRecord, muted: boolean): Promise<TabOperationResult>;
  /** Author reversal (2026-09-13): pin/unpin one resolved tab. */
  pinTab?(tab: TabRecord, pinned: boolean): Promise<TabOperationResult>;
  /** Author reversal (2026-09-13): move one resolved tab to an index/window. */
  moveTab?(tab: TabRecord, dest: { index?: number; windowId?: number }): Promise<TabOperationResult>;
  /** Author reversal (2026-09-13): close ONE resolved tab (irreversible). */
  closeTab?(tab: TabRecord): Promise<TabOperationResult>;
  /**
   * Readable「将作用于哪个标签页」摘要 for the confirmation dialog (title +
   * query/fragment-stripped URL + irreversibility note for `close`). Resolved
   * *before* the user decides, so the ask shows exactly which tab is at stake.
   */
  describeTarget?(args: Record<string, string>, subcommand: string): Promise<string | undefined>;
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

/**
 * Privacy redaction for a tab **title**.
 *
 * Browsers fall back to the tab's URL as its title for pages without a
 * `<title>` (plain text / error pages). Those titles therefore contain the full
 * URL — including query/fragment — and Chrome may even drop the scheme
 * (`127.0.0.1:port/page?q=…`). Whenever a title looks like a URL we project it to
 * `origin+path` so the confirm summary, tool output and audit trail never leak a
 * user's query string. Non-URL titles are returned verbatim.
 */
export function redactTabTitle(raw: string | undefined): string {
  const title = (raw ?? '').trim();
  if (!title) return '(无标题)';
  // A URL-like title: explicit scheme, or scheme-less `host[:port]/…` as Chrome
  // shows it (e.g. `127.0.0.1:39525/page?secretmarker=…`).
  const urlLike =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(title) ||
    /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|[a-z0-9-]+(?:\.[a-z0-9-]+)+)(?::\d+)?(?:\/|$)/i.test(title);
  if (!urlLike) return raw ?? '';
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(title) ? title : `http://${title}`;
  try {
    const u = new URL(withScheme);
    return `${u.origin}${u.pathname}`;
  } catch {
    return title.split(/[?#]/)[0] ?? '(无标题)';
  }
}

/** Parsed tab target reference (`--id` / `--match`). */
export interface TabRef {
  id?: number;
  match?: string;
  error?: string;
}

/** Parse `--id` / `--match`: exactly one is required. */
export function parseTabRef(args: Record<string, string>, subcommand = 'switch'): TabRef {
  const rawId = (args.id ?? '').trim();
  const match = (args.match ?? '').trim();
  if (rawId && match) return { error: `✖ tabs ${subcommand} 的 --id 与 --match 互斥，请只提供一个` };
  if (!rawId && !match) return { error: `✖ tabs ${subcommand} 需要 --id <tabId> 或 --match <域名/URL 片段>` };
  if (rawId) {
    if (!/^\d+$/.test(rawId)) return { error: `✖ tabs ${subcommand} 的 --id 必须是数字，收到「${rawId}」` };
    return { id: Number(rawId) };
  }
  return { match };
}

/** Parse a boolean flag (`true|false|1|0`); missing/invalid is a readable error. */
export function parseBoolArg(
  args: Record<string, string>,
  name: string,
  subcommand: string,
): { value?: boolean; error?: string } {
  const raw = (args[name] ?? '').trim().toLowerCase();
  if (!raw) return { error: `✖ tabs ${subcommand} 需要 --${name} true|false` };
  if (raw === 'true' || raw === '1') return { value: true };
  if (raw === 'false' || raw === '0') return { value: false };
  return { error: `✖ tabs ${subcommand} 的 --${name} 只接受 true|false，收到「${raw}」` };
}

/** Parse a non-negative integer flag; missing = undefined; invalid = readable error. */
export function parseNonNegativeIntArg(
  args: Record<string, string>,
  name: string,
  subcommand: string,
): { value?: number; error?: string } {
  const raw = (args[name] ?? '').trim();
  if (!raw) return {};
  if (!/^\d+$/.test(raw)) return { error: `✖ tabs ${subcommand} 的 --${name} 必须是非负整数，收到「${raw}」` };
  return { value: Number(raw) };
}

/** A resolved tab target, or a readable reason why it could not be resolved. */
export interface TabTargetResolution {
  target?: TabRecord;
  error?: string;
}

/**
 * Resolve `--id` / `--match` against the current tab set.
 *
 * `preferActive` (only `switch`) may pick the active tab among several matches;
 * every **mutating** subcommand passes `false` so an ambiguous match becomes a
 * readable refusal with the candidate list — never a guessed target.
 */
export function resolveTabTarget(
  rows: readonly TabRecord[],
  ref: TabRef,
  preferActive: boolean,
): TabTargetResolution {
  if (ref.id !== undefined) {
    const target = rows.find((t) => t.id === ref.id);
    if (!target) return { error: `✖ 未找到 id=${ref.id} 的标签页（可用 tabs list 查看）` };
    return { target };
  }
  const needle = (ref.match ?? '').toLowerCase();
  const matches = rows.filter(
    (t) => (t.url ?? '').toLowerCase().includes(needle) || (t.title ?? '').toLowerCase().includes(needle),
  );
  if (matches.length === 0) return { error: `✖ 未找到匹配「${ref.match}」的标签页（可用 tabs list 查看）` };
  if (matches.length > 1) {
    if (preferActive) {
      const active = matches.find((t) => t.active);
      if (active) return { target: active };
    }
    const listing = matches.map((t) => `  [${t.id}] ${redactTabUrl(t.url, false)}`).join('\n');
    return { error: `✖ 「${ref.match}」匹配到 ${matches.length} 个标签页，请用 --id 指定：\n${listing}` };
  }
  return { target: matches[0] };
}

/** A privacy-safe projection of one tab for display/an (audited) list. */
export interface TabListView {
  id: number;
  title: string;
  url: string;
  active: boolean;
  authorized: boolean;
  restricted: boolean;
  muted?: boolean;
  pinned?: boolean;
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
    const flags = [r.active ? '当前激活' : '非激活', r.authorized ? '已授权' : '未授权'];
    if (r.muted) flags.push('已静音');
    if (r.pinned) flags.push('已固定');
    const session = r.sessionId ? `会话=${r.sessionId}` : '会话=（受限页/不可用）';
    lines.push(`- [${r.id}] ${r.title || '(无标题)'} — ${r.url} — ${flags.join(' · ')} — ${session}`);
  }
  lines.push(
    '提示：切换用 tabs switch --id <id>；打开用 tabs open --url <http(s) URL>；静音/固定用 tabs mute/pin --muted|--pinned true|false；移动用 tabs move --index/--window；关闭用 tabs close --id <id>（需二次确认，一次只关一个，不可逆）。',
  );
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
    '  mute  (--id|--match) --muted true|false    静音 / 取消静音（单个标签页）',
    '  pin   (--id|--match) --pinned true|false   固定 / 取消固定（单个标签页）',
    '  move  (--id|--match) [--index <n>] [--window <id>]  移动单个标签页到指定位置/窗口',
    '  close (--id <tabId> | --match <域名/URL 片段>)  关闭单个标签页（不可逆，需二次确认）',
    '风险档位：list=read（放行）/ switch=ui（需确认）/ open·mute·pin·move·close=write（需确认）。',
    'close 专项约束：一次只关一个（**禁止批量**，无 --all）；确认摘要含目标标签页标题 + 去 query/fragment 的 URL；',
    '关闭不可逆——若它是当前侧栏所在页面，侧栏也会一并关闭；受限页/未知 id 一律可读拒绝，不静默。',
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
    '"open" opens a new http(s) URL tab (non-http(s) schemes are rejected); ' +
    '"mute"/"pin" toggle mute/pin for one tab; "move" moves one tab to an index/window; ' +
    '"close" closes ONE tab by id or match (irreversible; requires confirmation; batch/--all is rejected).';

  /**
   * Shared, fail-closed preamble for the mutating subcommands: reject batch
   * intent, parse/resolve the single target, refuse restricted pages readably,
   * then invoke the injected op. Returns either a finished ToolResult (refusal)
   * or the resolved target for the caller to execute.
   */
  const auditFail = (sub: string, output: string, error: string, detail: string): ToolResult => {
    const res = fail(output, error);
    auditSubcommand(deps, sub, res, detail);
    return { ok: false, output: res.output, error: res.error };
  };

  const resolveSingleTarget = async (
    sub: string,
    args: Record<string, string>,
    actionLabel: string,
  ): Promise<{ target?: TabRecord; refusal?: ToolResult }> => {
    if (args.all !== undefined) {
      return {
        refusal: auditFail(
          sub,
          `✖ tabs ${sub} 禁止批量操作：一次只能作用于一个标签页（不支持 --all）`,
          'tabs-batch-rejected',
          '收到 --all，按「禁止批量」拒绝',
        ),
      };
    }
    const ref = parseTabRef(args, sub);
    if (ref.error) return { refusal: auditFail(sub, ref.error, 'tabs-invalid-args', '参数非法') };
    let rows: TabRecord[];
    try {
      rows = await deps.listTabs();
    } catch (err) {
      return {
        refusal: auditFail(
          sub,
          `✖ 无法读取标签页：${err instanceof Error ? err.message : String(err)}`,
          'tabs-list-failed',
          'listTabs 异常',
        ),
      };
    }
    const resolved = resolveTabTarget(rows, ref, false);
    if (!resolved.target) {
      return {
        refusal: auditFail(
          sub,
          resolved.error ?? '✖ 无法解析目标标签页',
          ref.id !== undefined ? 'tabs-not-found' : 'tabs-ambiguous',
          `目标未解析（${ref.id !== undefined ? `id=${ref.id}` : `match=${ref.match}`}）`,
        ),
      };
    }
    const target = resolved.target;
    if (!isAllowedTabUrl(target.url)) {
      return {
        refusal: auditFail(
          sub,
          `✖ 目标标签页是受限页面（${redactTabUrl(target.url, false)}），无法${actionLabel}；请选择 http(s) 页面`,
          'tabs-restricted',
          `受限页 id=${target.id}`,
        ),
      };
    }
    return { target };
  };

  const finishOp = (
    sub: string,
    target: TabRecord,
    res: TabOperationResult,
    detail: string,
  ): ToolResult => {
    auditSubcommand(deps, sub, res, `${detail} target=${target.id} url=${redactTabUrl(target.url, false)}`);
    return { ok: res.ok, output: res.output, ...(res.error ? { error: res.error } : {}) };
  };

  return {
    name: TABS_TOOL_NAME,
    namespace: '',
    summary: '标签页管理（list / switch / open / mute / pin / move / close）',
    risk: 'write',
    subcommandRisks: { ...TABS_SUBCOMMAND_RISKS },
    group: TABS_GROUP,
    schema: {
      name: TABS_TOOL_NAME,
      description: schemaDescription,
      parameters: {
        type: 'object',
        properties: {
          subcommand: {
            type: 'string',
            description: '子命令：list / switch / open / mute / pin / move / close',
            enum: [...TABS_SUBCOMMANDS],
          },
          args: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'switch/mute/pin/move/close：目标标签页数字 id（与 match 二选一）' },
              match: { type: 'string', description: 'switch/mute/pin/move/close：按域名/URL/标题片段匹配（与 id 二选一）' },
              url: { type: 'string', description: 'open：要打开的 http(s) URL（其他 scheme 一律拒绝）' },
              full: {
                type: 'string',
                description: 'list：传 "true" 返回含 query/fragment 的完整 URL（默认仅 origin+path，保护隐私）',
              },
              muted: { type: 'string', description: 'mute：传 "true" 静音 / "false" 取消静音' },
              pinned: { type: 'string', description: 'pin：传 "true" 固定 / "false" 取消固定' },
              index: { type: 'string', description: 'move：目标位置索引（非负整数）' },
              window: { type: 'string', description: 'move：目标窗口 id（正整数）' },
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
              title: redactTabTitle(t.title),
              url: redactTabUrl(t.url, full),
              active: t.active === true,
              authorized,
              restricted: origin === null,
              ...(t.muted ? { muted: true } : {}),
              ...(t.pinned ? { pinned: true } : {}),
              ...(sessionId ? { sessionId } : {}),
            });
          }
          const output = formatTabList(view, full);
          const res = ok(output);
          auditSubcommand(deps, 'list', res, `count=${view.length}${full ? ' full=true' : ''}`);
          return { ok: true, output };
        }

        case 'switch': {
          const ref = parseTabRef(args, 'switch');
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
          const resolved = resolveTabTarget(rows, ref, true); // switch may prefer the active match
          if (!resolved.target) {
            const res = fail(resolved.error ?? '✖ 无法解析目标标签页', 'tabs-not-found');
            auditSubcommand(
              deps,
              'switch',
              res,
              `目标未解析（${ref.id !== undefined ? `id=${ref.id}` : `match=${ref.match}`}）`,
            );
            return { ok: false, output: res.output, error: res.error };
          }
          const target = resolved.target;
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

        case 'mute': {
          const parsed = parseBoolArg(args, 'muted', 'mute');
          if (parsed.error) {
            const res = fail(parsed.error, 'tabs-invalid-args');
            auditSubcommand(deps, 'mute', res, '参数非法（缺/非法 --muted）');
            return { ok: false, output: res.output, error: res.error };
          }
          if (!deps.muteTab) {
            const res = fail('✖ tabs mute 未接线（宿主未提供 muteTab），已拒绝', 'tabs-not-wired');
            auditSubcommand(deps, 'mute', res, '未接线');
            return { ok: false, output: res.output, error: res.error };
          }
          const { target, refusal } = await resolveSingleTarget('mute', args, '静音');
          if (refusal || !target) return refusal!;
          let res: TabOperationResult;
          try {
            res = await deps.muteTab(target, parsed.value === true);
          } catch (err) {
            res = fail(`✖ 静音操作失败：${err instanceof Error ? err.message : String(err)}`, 'tabs-mute-failed');
          }
          return finishOp('mute', target, res, `muted=${parsed.value === true}`);
        }

        case 'pin': {
          const parsed = parseBoolArg(args, 'pinned', 'pin');
          if (parsed.error) {
            const res = fail(parsed.error, 'tabs-invalid-args');
            auditSubcommand(deps, 'pin', res, '参数非法（缺/非法 --pinned）');
            return { ok: false, output: res.output, error: res.error };
          }
          if (!deps.pinTab) {
            const res = fail('✖ tabs pin 未接线（宿主未提供 pinTab），已拒绝', 'tabs-not-wired');
            auditSubcommand(deps, 'pin', res, '未接线');
            return { ok: false, output: res.output, error: res.error };
          }
          const { target, refusal } = await resolveSingleTarget('pin', args, '固定');
          if (refusal || !target) return refusal!;
          let res: TabOperationResult;
          try {
            res = await deps.pinTab(target, parsed.value === true);
          } catch (err) {
            res = fail(`✖ 固定操作失败：${err instanceof Error ? err.message : String(err)}`, 'tabs-pin-failed');
          }
          return finishOp('pin', target, res, `pinned=${parsed.value === true}`);
        }

        case 'move': {
          const index = parseNonNegativeIntArg(args, 'index', 'move');
          if (index.error) {
            const res = fail(index.error, 'tabs-invalid-args');
            auditSubcommand(deps, 'move', res, '参数非法（--index）');
            return { ok: false, output: res.output, error: res.error };
          }
          const win = parseNonNegativeIntArg(args, 'window', 'move');
          if (win.error) {
            const res = fail(win.error, 'tabs-invalid-args');
            auditSubcommand(deps, 'move', res, '参数非法（--window）');
            return { ok: false, output: res.output, error: res.error };
          }
          if (index.value === undefined && win.value === undefined) {
            const res = fail('✖ tabs move 需要 --index <n> 或 --window <id>（至少一个）', 'tabs-invalid-args');
            auditSubcommand(deps, 'move', res, '缺 --index/--window');
            return { ok: false, output: res.output, error: res.error };
          }
          if (win.value === 0) {
            const res = fail('✖ tabs move 的 --window 必须是正整数（窗口 id 从 1 开始）', 'tabs-invalid-args');
            auditSubcommand(deps, 'move', res, '参数非法（--window=0）');
            return { ok: false, output: res.output, error: res.error };
          }
          if (!deps.moveTab) {
            const res = fail('✖ tabs move 未接线（宿主未提供 moveTab），已拒绝', 'tabs-not-wired');
            auditSubcommand(deps, 'move', res, '未接线');
            return { ok: false, output: res.output, error: res.error };
          }
          const { target, refusal } = await resolveSingleTarget('move', args, '移动');
          if (refusal || !target) return refusal!;
          const dest = { ...(index.value !== undefined ? { index: index.value } : {}), ...(win.value !== undefined ? { windowId: win.value } : {}) };
          let res: TabOperationResult;
          try {
            res = await deps.moveTab(target, dest);
          } catch (err) {
            res = fail(`✖ 移动标签页失败：${err instanceof Error ? err.message : String(err)}`, 'tabs-move-failed');
          }
          return finishOp('move', target, res, `index=${index.value ?? '-'} window=${win.value ?? '-'}`);
        }

        case 'close': {
          if (!deps.closeTab) {
            const res = fail('✖ tabs close 未接线（宿主未提供 closeTab），已拒绝', 'tabs-not-wired');
            auditSubcommand(deps, 'close', res, '未接线');
            return { ok: false, output: res.output, error: res.error };
          }
          const { target, refusal } = await resolveSingleTarget('close', args, '关闭');
          if (refusal || !target) return refusal!;
          let res: TabOperationResult;
          try {
            res = await deps.closeTab(target);
          } catch (err) {
            res = fail(`✖ 关闭标签页失败：${err instanceof Error ? err.message : String(err)}`, 'tabs-close-failed');
          }
          return finishOp('close', target, res, '已关闭单个标签页（不可逆）');
        }

        default: {
          const res = fail(
            `✖ 未知子命令「${sub || '(空)'}」；tabs 支持：${TABS_SUBCOMMANDS.join(' / ')}`,
            'tabs-unknown-subcommand',
          );
          auditSubcommand(deps, sub || '(空)', res, '未知子命令');
          return { ok: false, output: res.output, error: res.error };
        }
      }
    },
  };
}
