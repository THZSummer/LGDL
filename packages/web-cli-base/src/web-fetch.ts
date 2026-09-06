/**
 * web-fetch：独立基础工具（web 获取，F-13 ② 自 web 归位 base 并中性化改名，
 * ADR-007——唯一命名例外：旧工具名中性化为 web-fetch）。
 *
 * **不属于任何 CLI 子命令**，是一个平台级能力：获取同源相对路径或完整 URL
 * 的原始文本。文本格式：`web-fetch --path <path>`（如 guide.md）。
 *
 * v2 升级（FR-018/010/043，additive）：schema 追加可选参数 clean/maxBytes/timeoutMs，
 * 缺省行为与现 web-fetch 逐字节兼容——新增独立执行入口 executeWebFetchWithOptions
 * （fetch 注入供测试），executeWebFetch(path) 保持原契约不变（F-23 用例零回归）。
 * 新能力：HTML→MD 清洗（默认关，内置最小零依赖转换器 P-03）、大小/时长护栏截断 +
 * 输出元信息、错误分类（网络/CORS/HTTP 状态 → 可读 NG-009）、外部结果 untrusted
 * 标记（ToolResult.trust，FR-010：清洗/截断后不丢失）。
 *
 * （自 packages/web/src/ai/web-fetch.ts 迁入，前缀中性化改名；
 * tokenizeCli/parseArgs 自本包 protocol.ts 导入。）
 */
import { tokenizeCli, parseArgs } from './protocol.js';
import { webFetchHelp } from './help.js';

export type ParsedWebFetch =
  | { ok: true; kind: 'fetch'; path: string }
  | { ok: true; kind: 'help' }
  | { ok: false; error: string };

export function parseWebFetchCommand(line: string): ParsedWebFetch {
  const tokens = tokenizeCli(line);
  if (tokens.length === 0) {
    return { ok: false, error: '空命令' };
  }
  if (tokens[0] !== 'web-fetch') {
    return {
      ok: false,
      error: `缺少前缀 "web-fetch"（独立基础工具：web-fetch --path <path>，如 guide.md）`,
    };
  }
  // --help 优先级最高：显示用法，无需 --path
  if (tokens.includes('--help')) {
    return { ok: true, kind: 'help' };
  }
  try {
    const args = parseArgs(tokens.slice(1));
    const path = args.path;
    if (!path) {
      return { ok: false, error: '缺少必填参数 --path <path>（web-fetch 必须显式传 path，无默认文档；如 --path guide.md；--help 查看用法）' };
    }
    return { ok: true, kind: 'fetch', path };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** v2：web-fetch 可选护栏参数（FR-018 additive；缺省 = 原文返回）。 */
export interface WebFetchOptions {
  /** HTML→MD 清洗开关（缺省 false = 原文逐字节返回）。 */
  clean?: boolean;
  /** 输出字节上限（缺省 512KB；超限截断 + 输出元信息，EC-011）。 */
  maxBytes?: number;
  /** 请求超时 ms（缺省 20000；0 = 不限）。 */
  timeoutMs?: number;
  /** fetch 注入（测试 mock；缺省 globalThis.fetch）。 */
  fetchImpl?: typeof fetch;
}

/** v2：错误分类（FR-018：网络/CORS/HTTP → 可读；NG-009 SOP/CORS 友好转译）。 */
export type FetchErrorCategory = 'network' | 'cors' | 'http' | 'timeout' | 'unknown';

export function classifyWebFetchError(err: unknown): { category: FetchErrorCategory; message: string } {
  if (err instanceof Error && err.name === 'TimeoutError') {
    return { category: 'timeout', message: '获取超时（超过设置的上限时长）——请重试或改用同源资源' };
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(msg)) {
    return {
      category: 'network',
      message:
        '网络请求失败 —— 可能原因：跨源请求被 CORS 拦截（同源优先，NG-009）、网络不通、或目标服务不可达。' +
        '可尝试：① 改用同源相对路径；② 确认目标站点允许跨源（CORS 头）；③ 稍后重试。',
    };
  }
  return { category: 'unknown', message: msg };
}

/** 错误结果构造（统一 ok:false + 可读文案；异常明细仅 error）。 */
function fail(lines: string[], error: string): { ok: false; source: string; lines: string[]; changed: boolean; error: string } {
  lines.push(`✖ ${error}`);
  return { ok: false, source: '', lines, changed: false, error };
}

/**
 * 内置最小 HTML→MD 转换器（P-03：零依赖，仅基础语义，非完整 DOM 解析）。
 * 仅在输入明显为 HTML 时做降级转换；非 HTML 文本原样返回（缺省 clean=false 不受影响）。
 */
export function htmlToMarkdown(html: string): string {
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  let s = html;
  // 去除 script/style/head 块
  s = s.replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // 标题
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, inner: string) => `${'#'.repeat(Number(level))} ${inner.replace(/<[^>]+>/g, '').trim()}\n\n`);
  // 链接
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => `[${text.replace(/<[^>]+>/g, '').trim()}](${href})`);
  // 段落
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner: string) => `${inner.replace(/<[^>]+>/g, '').trim()}\n\n`);
  // 行内/列表
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) => `- ${inner.replace(/<[^>]+>/g, '').trim()}\n`);
  s = s.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  // 剥除残留标签
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

/**
 * v2 执行入口（护栏/清洗/错误分类/untrusted 标记）。缺省（无任何可选参数）行为与
 * executeWebFetch 逐字节兼容（FR-018 AC/FR-043）。
 */
export async function executeWebFetchWithOptions(
  path: string,
  opts: WebFetchOptions = {},
): Promise<{
  ok: boolean;
  source: string;
  lines: string[];
  changed: boolean;
  error?: string;
  trust?: { source: string; fetchedAt: number; level: 'untrusted' };
  truncated?: boolean;
  status?: number;
}> {
  const lines: string[] = [];
  if (!path) {
    lines.push('✖ web-fetch 缺少必填参数 --path：调用时必须显式传 --path（无默认文档）。正确示例：web-fetch --path guide.md');
    return { ok: false, source: '', lines, changed: false, error: 'missing --path' };
  }
  const maxBytes = opts.maxBytes ?? 512 * 1024;
  const timeoutMs = opts.timeoutMs ?? 20000;
  const fetcher = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const trust = { source: path, fetchedAt: Date.now(), level: 'untrusted' as const };
  const controller = timeoutMs > 0 ? new AbortController() : undefined;
  const timer = controller && timeoutMs > 0 ? setTimeout(() => controller.abort(new Error('web-fetch timeout')), timeoutMs) : undefined;
  try {
    const res = await fetcher(path, { cache: 'no-store', signal: controller?.signal });
    if (!res.ok) {
      const readable =
        res.status >= 500
          ? `获取失败（HTTP ${res.status} 服务端错误）：${path}`
          : res.status === 404
            ? `获取失败（HTTP 404 不存在）：${path}`
            : res.status === 401 || res.status === 403
              ? `获取失败（HTTP ${res.status} 无权访问）：${path}`
              : `获取失败（HTTP ${res.status}）：${path}`;
      lines.push(`✖ ${readable}`);
      return { ok: false, source: '', lines, changed: false, error: `fetch failed: ${res.status}`, status: res.status };
    }
    const text = await res.text();
    let body = text;
    let truncated = false;
    if (opts.clean) body = htmlToMarkdown(body);
    const bytes = new TextEncoder().encode(body).length;
    if (bytes > maxBytes) {
      const cut = Math.max(0, maxBytes - 40);
      body = body.slice(0, cut) + '\n…（输出截断）';
      truncated = true;
    }
    lines.push(body);
    if (truncated) lines.push(`（输出元信息：原文 ${bytes} 字节 > 上限 ${maxBytes}，已截断，EC-011）`);
    return { ok: true, source: '', lines, changed: false, trust, truncated };
  } catch (err) {
    if (timer) clearTimeout(timer);
    const cls = classifyWebFetchError(err);
    return fail(lines, `${cls.category === 'timeout' ? cls.message : `${cls.message}（${path}）`}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 平面参数入口（router 内建 executor 用）：args → WebFetchOptions（clean 布尔解析、
 * maxBytes/timeoutMs 数字解析；非法值忽略走缺省）。
 */
export async function executeWebFetchArgs(args: Record<string, string>): Promise<{
  ok: boolean;
  source: string;
  lines: string[];
  changed: boolean;
  error?: string;
  trust?: { source: string; fetchedAt: number; level: 'untrusted' };
}> {
  const clean = args.clean === 'true' || args.clean === '1';
  const maxBytes = /^\d+$/.test(args.maxBytes ?? '') ? Number(args.maxBytes) : undefined;
  const timeoutMs = /^\d+$/.test(args.timeoutMs ?? '') ? Number(args.timeoutMs) : undefined;
  return executeWebFetchWithOptions(args.path ?? '', {
    ...(clean ? { clean: true } : {}),
    ...(maxBytes !== undefined ? { maxBytes } : {}),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
}

/**
 * web-fetch：基础 web 获取工具，**独立于图内容/UI 操作 CLI 工具**。
 * 获取同源相对路径或完整 URL，返回原始文本（F-23 原契约；v2 经 WithOptions 入口升级）。
 * 典型用途：读取同源的 guide/说明文档（如 guide.md）。
 * 不改文档（changed 恒为 false，source 恒为空）。
 *
 * （自 packages/web/src/ai/web-fetch.ts 迁入，错误文案前缀同步改名。）
 */
export async function executeWebFetch(path: string): Promise<{
  ok: boolean;
  source: string;
  lines: string[];
  changed: boolean;
  error?: string;
}> {
  // 缺省路径逐字节兼容（FR-043）：以无选项方式调用升级入口（信任/护栏语义叠加为 additive）
  const r = await executeWebFetchWithOptions(path, {});
  const { ok, source, lines, changed, error } = r;
  return { ok, source, lines, changed, error };
}
