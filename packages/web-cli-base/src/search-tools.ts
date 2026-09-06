/**
 * search-tools.ts —— search-content / list-resources（FR-016/017；EC-011 预算护栏）。
 *
 * 生态位（discovery §3.3 F 组 ◐）：grep/glob 的生态位 → **可及内容集全文搜索**
 * （语义对象 = 内容集/文档对象/卷条目/会话记录，非文件路径；D-5：grep/glob 的 OS
 * 路径语义不进入 v2）。工具不内置索引：无索引实现 = 线性扫描（结果与有索引一致，
 * 简化为同一条路径）；索引预算受控（EC-011：--max-bytes 扫描预算 + 命中数上限，
 * 超限输出截断标注，上下文预算受控 NFR-005）。
 *
 * list-resources = **资源目录**（文档对象 id/卷条目/会话资源），与 web-cli-help 的
 * **工具目录**语义区分（FR-017：help 文本显式声明）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { ToolContext, ToolEntry, ToolResult } from './router.js';

/** 可及资源种类。 */
export type ResourceKind = 'doc' | 'volume' | 'session';

/** 资源元信息（list-resources 输出面）。 */
export interface SearchResourceMeta {
  id: string;
  kind: ResourceKind;
  label?: string;
}

/** 内容集提供者（场景注入：文档注册表/storage 卷/session store 适配）。 */
export interface SearchResourceProvider {
  list(ctx: ToolContext): SearchResourceMeta[] | Promise<SearchResourceMeta[]>;
  read(meta: SearchResourceMeta, ctx: ToolContext): string | null | Promise<string | null>;
}

export interface SearchToolDeps {
  /** 可及资源提供者；缺省 = 仅当前文档对象（ctx.source）。 */
  provider?: SearchResourceProvider;
}

/** 缺省资源派生：ctx.source 作为当前文档对象（无 provider 时的最小可及集）。 */
export function defaultResources(ctx: ToolContext): SearchResourceMeta[] {
  const out: SearchResourceMeta[] = [];
  if (typeof ctx.source === 'string' && ctx.source.length > 0) {
    out.push({ id: ctx.docId && ctx.docId !== 'current' ? ctx.docId : 'current', kind: 'doc', label: '当前文档对象' });
  }
  return out;
}

/** 模式匹配（子串；可选正则；大小写可配）。 */
export interface SearchPattern {
  text: string;
  regex?: boolean;
  caseInsensitive?: boolean;
}

export function compileSearchPattern(p: SearchPattern): (line: string) => { ok: boolean; col: number } {
  if (p.regex) {
    try {
      const re = new RegExp(p.text, p.caseInsensitive ? 'gi' : 'g');
      return (line: string) => {
        re.lastIndex = 0;
        const m = re.exec(line);
        return m ? { ok: true, col: m.index + 1 } : { ok: false, col: 0 };
      };
    } catch (err) {
      // 非法正则 → 恒不匹配（错误在 executeSearchContent 上游已拦截；此处兜底）
      return () => ({ ok: false, col: 0 });
    }
  }
  const needle = p.caseInsensitive ? p.text.toLowerCase() : p.text;
  return (line: string) => {
    const hay = p.caseInsensitive ? line.toLowerCase() : line;
    const idx = hay.indexOf(needle);
    return idx >= 0 ? { ok: true, col: idx + 1 } : { ok: false, col: 0 };
  };
}

/** 命中结果（含上下文行与位置：资源 id + 行号 + 列）。 */
export interface SearchHit {
  resourceId: string;
  kind: ResourceKind;
  line: number;
  col: number;
  text: string;
}

export interface SearchContentArgs {
  pattern?: string;
  resource?: string;
  kind?: ResourceKind;
  regex?: boolean;
  caseInsensitive?: boolean;
  /** 扫描预算（字节；缺省 200KB，EC-011）。 */
  maxBytes?: number;
  /** 命中上限（缺省 50）。 */
  maxHits?: number;
}

const DEFAULT_MAX_BYTES = 200_000;
const DEFAULT_MAX_HITS = 50;

/** search-content 执行器（模式 + 全文；线性扫描一致；预算受控）。 */
export async function executeSearchContent(deps: SearchToolDeps, args: SearchContentArgs, ctx: ToolContext): Promise<ToolResult> {
  const patternText = args.pattern ?? '';
  if (!patternText) {
    return { ok: false, output: '✖ search-content 缺少必填参数 --pattern <搜索模式>', error: 'missing pattern' };
  }
  if (args.regex) {
    try {
      new RegExp(patternText, args.caseInsensitive ? 'i' : '');
    } catch (err) {
      return { ok: false, output: `✖ 非法正则 --pattern "${patternText}"：${(err as Error).message}`, error: 'invalid regex' };
    }
  }
  const metas = deps.provider ? await deps.provider.list(ctx) : defaultResources(ctx);
  const filtered = metas.filter((m) => {
    if (args.resource && m.id !== args.resource) return false;
    if (args.kind && m.kind !== args.kind) return false;
    return true;
  });
  if (filtered.length === 0) {
    return { ok: false, output: '✖ 无可搜索内容集（list-resources 可查看可及资源；或注入文档对象/卷条目/会话记录）', error: 'no searchable resources' };
  }
  const matcher = compileSearchPattern({ text: patternText, regex: args.regex, caseInsensitive: args.caseInsensitive });
  const maxBytes = args.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxHits = args.maxHits ?? DEFAULT_MAX_HITS;
  const hits: SearchHit[] = [];
  let scannedBytes = 0;
  let budgetExceeded = false;
  outer: for (const meta of filtered) {
    // 无 provider → 缺省派生资源（doc/current）经 ctx.source 读取
    const content =
      deps.provider != null ? await deps.provider.read(meta, ctx) : meta.kind === 'doc' ? (typeof ctx.source === 'string' ? ctx.source : null) : null;
    if (content === null || content === undefined) continue;
    if (scannedBytes + content.length > maxBytes) {
      budgetExceeded = true;
      break; // EC-011：扫描预算受控，截断
    }
    scannedBytes += content.length;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = matcher(lines[i]);
      if (m.ok) {
        hits.push({ resourceId: meta.id, kind: meta.kind, line: i + 1, col: m.col, text: lines[i].trim().slice(0, 160) });
        if (hits.length >= maxHits) break outer; // 命中数上限
      }
    }
  }
  if (hits.length === 0) {
    const note = budgetExceeded ? '（扫描预算达上限，部分内容未扫描——可增大 --max-bytes）' : '';
    return { ok: true, output: `（未命中 "${patternText}"）${note}` };
  }
  const lines: string[] = [`命中 ${hits.length} 处（模式 "${patternText}"${args.regex ? '，正则' : ''}）：`];
  for (const h of hits) {
    lines.push(`- ${h.resourceId} [${h.kind}] 行 ${h.line} 列 ${h.col}: ${h.text}`);
  }
  if (budgetExceeded) lines.push('（输出元信息：扫描预算达上限，结果可能不完整——可增大 --max-bytes）');
  return { ok: true, output: lines.join('\n') };
}

/** list-resources 执行器（资源目录；与 web-cli-help 工具目录语义区分 FR-017）。 */
export async function executeListResources(deps: SearchToolDeps, ctx: ToolContext): Promise<ToolResult> {
  const metas = deps.provider ? await deps.provider.list(ctx) : defaultResources(ctx);
  if (metas.length === 0) {
    return {
      ok: true,
      output:
        '（当前无可及资源）\n说明：本工具列出「资源目录」（文档对象/卷条目/会话记录）；' +
        '「工具目录」请用 web-cli-help（列出全部可用工具）——两者语义不同。',
    };
  }
  const lines = [`可及资源（${metas.length} 个）——资源目录（区别于 web-cli-help 的工具目录）：`];
  for (const m of metas) {
    lines.push(`- ${m.id}（${m.kind}）${m.label ? `${m.label}` : ''}`);
  }
  return { ok: true, output: lines.join('\n') };
}

// ---------- ToolEntry 工厂 ----------

const SEARCH_DESC =
  'search-content：对可及内容集（文档对象/卷条目/会话记录，非文件路径）做模式+全文搜索。' +
  ' --pattern 必填（子串；--regex true 切换正则；--caseInsensitive true 忽略大小写）；' +
  ' --resource <id> / --kind doc|volume|session 过滤；--max-bytes 扫描预算（缺省 200000）、--max-hits 命中上限（缺省 50）。' +
  ' 参数进 args 对象：{"args":{"pattern":"label"}}。';

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '搜索模式（子串；--regex true 为正则）。' },
        resource: { type: 'string', description: '限定资源 id（list-resources 可查）。' },
        kind: { type: 'string', description: '限定资源种类 doc/volume/session。' },
        regex: { type: 'string', description: '"true" 按正则匹配。' },
        caseInsensitive: { type: 'string', description: '"true" 忽略大小写。' },
        maxBytes: { type: 'string', description: '扫描预算字节数（EC-011，缺省 200000）。' },
        maxHits: { type: 'string', description: '命中数上限（缺省 50）。' },
      },
    },
  },
} as const;

const LIST_RES_DESC =
  'list-resources：列出可及资源（文档对象 id/卷条目/会话记录）——资源目录；' +
  ' 与 web-cli-help（工具目录，列出全部可用工具）语义区分。参数进 args 对象：{}。';

const LIST_RES_SCHEMA = {
  type: 'object',
  properties: {},
} as const;

export function searchContentHelp(): string {
  return [
    'search-content —— 内容集全文/模式搜索（文档对象/卷条目/会话记录；非文件路径）',
    '用法：search-content --pattern <模式> [--regex true] [--resource <id>] [--kind <doc|volume|session>] [--max-bytes N]',
    '',
    '示例：search-content --pattern "label:" --kind doc',
    '说明：无索引实现 = 线性扫描（结果一致）；扫描预算受控（EC-011）。',
  ].join('\n');
}

export function listResourcesHelp(): string {
  return [
    'list-resources —— 资源目录（列出可及内容集）',
    '用法：list-resources',
    '',
    '说明：列出文档对象/卷条目/会话记录等「资源」；web-cli-help 列出的是「工具目录」——两者语义不同（FR-017）。',
  ].join('\n');
}

/** 创建 search-content 工具条目。 */
export function createSearchContentToolEntry(deps: SearchToolDeps = {}): ToolEntry {
  return {
    name: 'search-content',
    summary: '内容集全文/模式搜索（文档对象/卷条目/会话；非文件路径）',
    schema: { name: 'search-content', description: SEARCH_DESC, parameters: SEARCH_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'search',
    executor: async (tc, ctx) =>
      executeSearchContent(deps, {
        pattern: tc.args.pattern,
        resource: tc.args.resource,
        kind: tc.args.kind as ResourceKind | undefined,
        regex: tc.args.regex === 'true',
        caseInsensitive: tc.args.caseInsensitive === 'true',
        maxBytes: /^\d+$/.test(tc.args.maxBytes ?? '') ? Number(tc.args.maxBytes) : undefined,
        maxHits: /^\d+$/.test(tc.args.maxHits ?? '') ? Number(tc.args.maxHits) : undefined,
      }, ctx),
    help: searchContentHelp,
  };
}

/** 创建 list-resources 工具条目。 */
export function createListResourcesToolEntry(deps: SearchToolDeps = {}): ToolEntry {
  return {
    name: 'list-resources',
    summary: '资源目录（文档对象/卷条目/会话记录；区别于 web-cli-help 工具目录）',
    schema: { name: 'list-resources', description: LIST_RES_DESC, parameters: LIST_RES_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'search',
    executor: async (_tc, ctx) => executeListResources(deps, ctx),
    help: listResourcesHelp,
  };
}

/** 便捷：一次创建检索域两工具条目。 */
export function createSearchTools(deps: SearchToolDeps = {}): ToolEntry[] {
  return [createSearchContentToolEntry(deps), createListResourcesToolEntry(deps)];
}
