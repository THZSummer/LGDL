/**
 * Plugin-side controlled `web-fetch` seam (FR-050 / EC-023).
 *
 * ── Why this exists (real defect, user-reported) ─────────────────────────────
 * The upstream base builtin `web-fetch` (`packages/web-cli-base/src/web-fetch.ts`)
 * calls `globalThis.fetch` from inside the MV3 service worker. An extension page
 * is its own origin (`chrome-extension://<id>`), so any fetch of a site that is
 * not covered by the extension's `host_permissions` is cross-origin and Chrome
 * blocks it with:
 *
 *   Access to fetch at 'https://www.baidu.com/' from origin
 *   'chrome-extension://<id>' has been blocked by CORS policy …
 *
 * The failure is logged by the network stack to `chrome://extensions`
 * (unavoidable once the request is *sent*), and the base error text is a bare
 * transport string that the model could gloss over.
 *
 * This seam performs a **pre-flight gate before any fetch is attempted**:
 *   1. relative path → resolved against the currently bound site origin; if that
 *      origin is host-permission-covered → allowed, otherwise **no request** is
 *      sent and a readable refusal + actionable guidance is returned;
 *   2. absolute http(s) URL → `hasHostPermission(origin)` (backed by
 *      `chrome.permissions.contains`) must be true, otherwise **no request**;
 *   3. covered → the base executor runs normally (no CORS at this point);
 *   4. non-http(s) schemes (`file:`/`data:`/`javascript:`/`chrome:` …) → readable
 *      refusal, **no request**.
 *
 * Same-origin reads prefer the **page context** (content script) when available:
 * the content script fetches its own origin, so the resource is read with the
 * page's own network context instead of an extension cross-origin fetch. That
 * path is folded into the base executor through the injectable `fetchImpl`, so
 * HTML→Markdown cleaning / size guards / untrusted marking stay single-sourced
 * in base (zero duplication).
 *
 * Red lines honoured: base `packages/web-cli-base/**` is untouched; no new
 * permissions / dependencies; every refusal is readable (never silent).
 */
import {
  executeWebFetchWithOptions,
  WEB_FETCH_TOOL,
  webFetchHelp,
  type ToolEntry,
  type ToolResult,
} from '@lgdl/web-cli-base';
import { originPermissionPattern } from '../platform/extension-env.js';

/** Flat, dot-free LLM function name (same as the base builtin it replaces). */
export const WEB_FETCH_TOOL_NAME = 'web-fetch';

/** A resolved fetch target that passed URL/scheme parsing (permission not yet checked). */
export interface WebFetchTarget {
  ok: true;
  /** Absolute http(s) URL handed to the executor. */
  url: string;
  /** Target origin (`https://host[:port]`). */
  origin: string;
  /** True when the target origin equals the currently bound site origin. */
  sameOrigin: boolean;
}

/** A readable pre-flight refusal (no request was sent). */
export interface WebFetchRejection {
  ok: false;
  output: string;
  error: string;
}

export type WebFetchResolution = WebFetchTarget | WebFetchRejection;

/** Whether a path carries an explicit URL scheme (`https:`, `data:`, `file:` …). */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Parse a `--path` into an absolute fetch target **without any network access**.
 * Pure and node-testable. Never throws.
 */
export function resolveWebFetchTarget(rawPath: string, boundOrigin?: string): WebFetchResolution {
  const raw = (rawPath ?? '').trim();
  if (!raw) {
    return {
      ok: false,
      output:
        '✖ web-fetch 缺少必填参数 --path：调用时必须显式传 --path（无默认文档）。' +
        '正确示例：web-fetch --path guide.md（同源相对路径）或 --path https://<已授权域名>/doc.md（完整 URL）。',
      error: 'web-fetch-missing-path',
    };
  }

  if (SCHEME_RE.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { ok: false, output: `✖ web-fetch 的 --path 不是合法 URL：${raw}`, error: 'web-fetch-invalid-url' };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        ok: false,
        output:
          `✖ web-fetch 仅允许 http(s) URL 或同源相对路径，拒绝 ${url.protocol}// scheme` +
          `（file:/data:/javascript:/chrome:/about: 等一律拒绝）：${raw}`,
        error: 'web-fetch-scheme-rejected',
      };
    }
    return {
      ok: true,
      url: url.toString(),
      origin: url.origin,
      sameOrigin: Boolean(boundOrigin) && url.origin === boundOrigin,
    };
  }

  // Relative path: needs a bound site origin as the base (extension pages have no
  // meaningful default base, and one would silently resolve to chrome-extension://).
  if (!boundOrigin) {
    return {
      ok: false,
      output:
        `✖ web-fetch 相对路径「${raw}」无法解析：当前没有已绑定站点（相对路径需要一个绑定 origin 作为基准）。\n` +
        '可执行指引：① 先在目标站点标签页点击插件图标绑定站点，再重试本命令；' +
        '② 或直接传完整 http(s) URL（该域名需已授权给本插件）。',
      error: 'web-fetch-no-bound-origin',
    };
  }

  let url: URL;
  try {
    url = new URL(raw, boundOrigin);
  } catch {
    return {
      ok: false,
      output: `✖ web-fetch 相对路径无法解析为绝对 URL：${raw}（基准 ${boundOrigin}）`,
      error: 'web-fetch-invalid-relative',
    };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      output: `✖ web-fetch 相对路径解析出非 http(s) scheme（${url.protocol}//），已拒绝：${raw}`,
      error: 'web-fetch-scheme-rejected',
    };
  }
  return { ok: true, url: url.toString(), origin: url.origin, sameOrigin: true };
}

/**
 * The readable refusal for a target whose origin is not host-permission-covered.
 * The reason + two actionable paths are always included (FR-050 / EC-023).
 */
export function untrustedOriginGuidance(origin: string, url: string): string {
  const pattern = originPermissionPattern(origin) ?? `${origin}/*`;
  return [
    `✖ web-fetch 拒绝访问 ${origin}：该域名未授权给本插件。`,
    '原因：扩展页面（chrome-extension://）与站点是不同源，Chrome 对未授予 host 权限的域名会以 CORS 拦截扩展发出的跨源请求。' +
      '因此本次「未发出任何网络请求」——不会在 chrome://extensions 产生 CORS 错误条目。',
    '可执行指引：',
    `① 在该站点标签页点击浏览器工具栏的插件图标 → 点「授权当前站点」（写入站点权限 ${pattern}）→ 返回侧栏重试本命令；`,
    `② 或先用 \`tabs open --url ${url}\` 打开该站点并授权，再由站点工具/页面上下文读取其内容（同源相对路径优先走页面上下文）。`,
  ].join('\n');
}

/** Result of a page-context (content script) same-origin read. */
export interface PageFetchResult {
  ok: boolean;
  text?: string;
  status?: number;
  error?: string;
}

/** Injected dependencies (chrome-free module; the background owns the real APIs). */
export interface WebFetchToolDeps {
  /** Currently bound site origin (undefined when unbound). */
  currentOrigin(): string | undefined;
  /** Whether the extension holds the host permission for an origin. */
  hasHostPermission(origin: string): Promise<boolean>;
  /** Host fetch implementation (defaults to `globalThis.fetch`). */
  fetchImpl?: typeof fetch;
  /** Optional same-origin read through the bound tab's page context (content script). */
  fetchViaPage?(url: string, origin: string): Promise<PageFetchResult>;
}

/** Materialise a `Response` from a page-context read so base guards stay reused. */
function buildPageFetch(
  fetchViaPage: NonNullable<WebFetchToolDeps['fetchViaPage']>,
  origin: string,
  fallback: typeof fetch | undefined,
): typeof fetch {
  const pageFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    let page: PageFetchResult;
    try {
      page = await fetchViaPage(url, origin);
    } catch (err) {
      page = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    if (page.ok) {
      return new Response(page.text ?? '', {
        status: page.status && page.status > 0 ? page.status : 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    if (typeof page.status === 'number' && page.status > 0) {
      // A definite HTTP status is a real answer (e.g. 404) — report it as-is.
      return new Response(page.text ?? '', { status: page.status });
    }
    // Transport failure (no bound tab / content script unreachable): fall back to
    // the host fetch, which is safe because the origin is already permission-covered.
    if (fallback) return fallback(input, init);
    throw new Error(page.error ?? '页面上下文读取失败');
  };
  return pageFetch as typeof fetch;
}

/**
 * Build the plugin `web-fetch` `ToolEntry` (registered in place of the base
 * builtin so the controlled seam is the single execution path).
 */
export function createWebFetchToolEntry(deps: WebFetchToolDeps): ToolEntry {
  return {
    name: WEB_FETCH_TOOL_NAME,
    summary: '基础 web 获取（受控预校验：同源/已授权域名；未授权域名零请求 + 可读拒绝）',
    schema: WEB_FETCH_TOOL.function,
    help: webFetchHelp,
    executor: async (tc): Promise<ToolResult> => {
      const args = tc.args ?? {};
      const target = resolveWebFetchTarget(args.path ?? '', deps.currentOrigin());
      if (!target.ok) return { ok: false, output: target.output, error: target.error };

      const permitted = await deps.hasHostPermission(target.origin);
      if (!permitted) {
        return {
          ok: false,
          output: untrustedOriginGuidance(target.origin, target.url),
          error: 'web-fetch-origin-not-authorized',
        };
      }

      const clean = args.clean === 'true' || args.clean === '1';
      const maxBytes = /^\d+$/.test(args.maxBytes ?? '') ? Number(args.maxBytes) : undefined;
      const timeoutMs = /^\d+$/.test(args.timeoutMs ?? '') ? Number(args.timeoutMs) : undefined;

      const sameOriginPageFetch =
        target.sameOrigin && deps.fetchViaPage
          ? buildPageFetch(deps.fetchViaPage, target.origin, deps.fetchImpl)
          : undefined;
      const fetchImpl = sameOriginPageFetch ?? deps.fetchImpl;

      const r = await executeWebFetchWithOptions(target.url, {
        ...(clean ? { clean: true } : {}),
        ...(maxBytes !== undefined ? { maxBytes } : {}),
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(fetchImpl ? { fetchImpl } : {}),
      });
      return {
        ok: r.ok,
        output: r.lines.join('\n') || '(无输出)',
        changed: r.changed,
        source: r.source,
        ...(r.error ? { error: r.error } : {}),
        ...(r.trust ? { trust: r.trust } : {}),
      };
    },
  };
}
