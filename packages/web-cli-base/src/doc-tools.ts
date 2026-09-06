/**
 * doc-tools.ts —— doc-read / doc-edit 内容对象读写原语（FR-011/012）。
 *
 * 生态位（discovery §3.3 A 组 ◐ + §3.4 内容/文档域）：fs read/write/edit 的生态位，
 * **对象 = 内容对象（文档句柄/卷条目），非文件路径**（D-5：无路径遍历语义）。
 * 内容对象来源（三选一，可注入）：
 *   ① deps.resolve(docId) —— 场景注册的文档对象解析器（lgdl-web source 等）
 *   ② ToolContext.source —— 当前文档对象文本（F-23 文档态契约保留，FR-044）
 *   ③ ctx.services 下的对象面（会话/存储中的可及对象；经场景注入）
 * 无可用上下文 → 友好错误 + 列出可读对象（deps.listReadable）。
 *
 * doc-edit：str_replace / insert / create 文本编辑原语（内容层操作，非文件系统形态）；
 * 返回沿 F-23 ToolResult 契约（ok/output/changed/source）——场景/会话组装点
 * 依据 changed+source 推进 run-local 文档（与 lgdl-web-cli 变更语义一致）。
 * 「先读后改」由 PRM 策略承载（read-before-edit 生态位，FR-012 不内建于工具）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { ToolContext, ToolEntry, ToolResult } from './router.js';

/** 可读内容对象元信息（无上下文错误时列出）。 */
export interface DocReadableMeta {
  id: string;
  label?: string;
  kind?: 'context' | 'storage' | 'session';
}

/** 文档对象解析依赖（场景注入）。 */
export interface DocToolDeps {
  /** 按 docId 取内容对象；无此对象 → null。 */
  resolve?: (docId: string, ctx: ToolContext) => Promise<string | null> | string | null;
  /** 可读对象列表（错误提示用）。 */
  listReadable?: (ctx: ToolContext) => Promise<DocReadableMeta[]> | DocReadableMeta[];
  /** 编辑写回（可选；场景文档注册表持久化；缺省由会话 run-local source 承接）。 */
  apply?: (docId: string, content: string, ctx: ToolContext) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}

/** 当前内容对象获取（resolve → ctx.source → null）。 */
export async function resolveDocContent(deps: DocToolDeps, ctx: ToolContext): Promise<{ id: string; content: string } | null> {
  const docId = ctx.docId ?? '';
  if (deps.resolve && docId) {
    const content = await deps.resolve(docId, ctx);
    if (content !== null) return { id: docId, content };
  }
  if (typeof ctx.source === 'string' && ctx.source.length > 0) {
    return { id: docId || 'current', content: ctx.source };
  }
  return null;
}

/** 可读对象列表文案（无上下文友好错误共用）。 */
async function readableHint(deps: DocToolDeps, ctx: ToolContext): Promise<string> {
  const metas = deps.listReadable ? await deps.listReadable(ctx) : [];
  const lines = ['✖ 当前无可用内容对象（doc-read 需要 --doc 指向的文档对象，或分发上下文 source）'];
  if (metas.length === 0) {
    lines.push('（暂无可读对象：场景未注入 doc 解析器/上下文 source）');
  } else {
    lines.push('可读对象：');
    for (const m of metas) lines.push(`- ${m.id}${m.label ? `（${m.label}）` : ''}${m.kind ? ` [${m.kind}]` : ''}`);
  }
  lines.push('提示：请先经 doc-read 读取内容对象，再执行编辑（先读后改策略由权限门禁承载）。');
  return lines.join('\n');
}

export interface DocReadArgs {
  doc?: string;
}

/** doc-read 执行器（FR-011）。 */
export async function executeDocRead(deps: DocToolDeps, tc: { args: Record<string, string> }, ctx: ToolContext): Promise<ToolResult> {
  const useDocId = tc.args.doc ?? ctx.docId;
  const resolved = await resolveDocContent(deps, ctx);
  if (!resolved) {
    return { ok: false, output: await readableHint(deps, ctx), error: 'no readable document context' };
  }
  // 显式 --doc 与当前上下文不一致 → 友好提示（防误读）
  if (useDocId && resolved.id !== 'current' && useDocId !== resolved.id) {
    return {
      ok: false,
      output: `✖ 找不到文档对象 "${useDocId}"（当前上下文对象为 "${resolved.id}"）——doc-read --doc <id> 需指向可及内容对象`,
      error: 'doc object not found',
    };
  }
  return { ok: true, output: resolved.content };
}

export type DocEditOp = 'str_replace' | 'insert' | 'create';

export interface DocEditSpec {
  op: DocEditOp;
  doc?: string;
  old?: string;
  new?: string;
  text?: string;
  after?: string;
}

export interface ApplyDocEditResult {
  ok: boolean;
  output?: string;
  content?: string;
  error?: string;
}

/** 文本编辑原语应用（纯函数：str_replace/insert/create）。 */
export function applyDocEdit(content: string, spec: DocEditSpec): ApplyDocEditResult {
  switch (spec.op) {
    case 'create':
      return { ok: true, output: '已创建（整篇替换为 --text）', content: spec.text ?? '' };
    case 'str_replace': {
      const oldText = spec.old ?? '';
      if (!oldText) return { ok: false, error: 'str_replace 缺少 --old' };
      const idx = content.indexOf(oldText);
      if (idx < 0) return { ok: false, error: `str_replace 未找到目标文本 "${oldText}"（请先 doc-read 确认当前内容）` };
      const next = content.slice(0, idx) + (spec.new ?? '') + content.slice(idx + oldText.length);
      return { ok: true, output: `已替换 1 处（${oldText.length} 字符 → ${(spec.new ?? '').length} 字符）`, content: next };
    }
    case 'insert': {
      const text = spec.text ?? '';
      if (text === '') return { ok: false, error: 'insert 缺少 --text' };
      if (spec.after === undefined) return { ok: false, error: 'insert 缺少 --after <定位文本>' };
      const pos = content.indexOf(spec.after);
      if (pos < 0) return { ok: false, error: `insert 未找到定位文本 "${spec.after}"` };
      const at = pos + spec.after.length;
      const next = content.slice(0, at) + text + content.slice(at);
      return { ok: true, output: `已在 "${spec.after}" 后插入 ${text.length} 字符`, content: next };
    }
    default:
      return { ok: false, error: `未知编辑原语 "${String(spec.op)}"（可用：str_replace/insert/create）` };
  }
}

/** doc-edit 执行器（FR-012）：先取当前对象 → 应用原语 → changed+source 推进（可选 apply 写回）。 */
export async function executeDocEdit(deps: DocToolDeps, tc: { subcommand: string; args: Record<string, string> }, ctx: ToolContext): Promise<ToolResult> {
  const resolved = await resolveDocContent(deps, ctx);
  if (!resolved) {
    return { ok: false, output: await readableHint(deps, ctx), error: 'no editable document context' };
  }
  const spec: DocEditSpec = {
    op: (tc.subcommand as DocEditOp) || (tc.args.op as DocEditOp),
    doc: tc.args.doc ?? resolved.id,
    old: tc.args.old,
    new: tc.args.new,
    text: tc.args.text,
    after: tc.args.after,
  };
  if (!spec.op) {
    return { ok: false, output: '✖ doc-edit 缺少编辑原语（--subcommand str_replace|insert|create）', error: 'missing edit op' };
  }
  const applied = applyDocEdit(resolved.content, spec);
  if (!applied.ok) {
    const err = applied.error ?? '编辑失败';
    return { ok: false, output: `✖ ${err}`, error: err };
  }
  if (applied.content === undefined) {
    return { ok: false, output: '✖ 编辑原语未返回内容（内部错误）', error: 'edit produced no content' };
  }
  if (deps.apply && spec.doc) {
    const w = await deps.apply(spec.doc, applied.content, ctx);
    if (!w.ok) {
      return { ok: false, output: `✖ 编辑结果写回失败：${w.error ?? '未知错误'}`, error: w.error ?? 'apply failed' };
    }
  }
  return {
    ok: true,
    output: applied.output ?? '已编辑',
    changed: true,
    source: applied.content,
  };
}

// ---------- ToolEntry 工厂 ----------

const DOC_READ_DESC =
  'doc-read：读取当前内容对象（--doc 文档对象 id，或分发上下文 source）并返回其文本。内容对象 = 文档句柄/卷条目，非文件路径。' +
  ' 参数进 args 对象：{"args":{"doc":"main"}}（可省：无 --doc 时读当前上下文对象）。';

const DOC_READ_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        doc: { type: 'string', description: '文档对象 id（场景可及对象；缺省 = 当前上下文对象）。' },
      },
    },
  },
} as const;

const DOC_EDIT_DESC =
  'doc-edit：对当前内容对象执行文本编辑原语。原语 = 子命令：str_replace（--old 精确文本 → --new 替换首次出现）/ insert（--after 定位文本后插入 --text）/ create（整篇替换为 --text）。' +
  ' 返回 changed+source（场景据此推进文档）。参数进 args 对象：{"subcommand":"str_replace","args":{"old":"A","new":"B"}}。';

const DOC_EDIT_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: ['str_replace', 'insert', 'create'],
      description: '编辑原语：str_replace / insert / create。',
    },
    args: {
      type: 'object',
      properties: {
        old: { type: 'string', description: 'str_replace 目标文本。' },
        new: { type: 'string', description: 'str_replace 替换文本。' },
        text: { type: 'string', description: 'insert 的插入文本 / create 的整篇内容。' },
        after: { type: 'string', description: 'insert 的定位文本（插到其后）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function docReadHelp(): string {
  return [
    'doc-read —— 读当前内容对象（文档句柄/卷条目，非文件路径）',
    '用法：doc-read [--doc <文档对象 id>]',
    '',
    '示例：doc-read --doc main',
    '说明：无可用上下文（缺 --doc 且无 source）→ 列出可读对象；对象模型无路径遍历语义。',
  ].join('\n');
}

export function docEditHelp(): string {
  return [
    'doc-edit —— 内容对象文本编辑原语（str_replace/insert/create）',
    '用法：doc-edit <str_replace|insert|create> --old <文本> --new <文本> | --after <定位> --text <内容>',
    '',
    '示例：doc-edit str_replace --old "a -> b" --new "a -> c"',
    '说明：返回 changed+source 供场景推进文档；先读后改由权限策略（PRM read-before-edit）承载。',
  ].join('\n');
}

/** 创建 doc-read 工具条目。 */
export function createDocReadToolEntry(deps: DocToolDeps = {}): ToolEntry {
  return {
    name: 'doc-read',
    summary: '读当前内容对象（文档句柄/卷条目语义，非文件路径）',
    schema: { name: 'doc-read', description: DOC_READ_DESC, parameters: DOC_READ_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'doc',
    executor: async (tc, ctx) => executeDocRead(deps, tc, ctx),
    help: docReadHelp,
  };
}

/** 创建 doc-edit 工具条目。 */
export function createDocEditToolEntry(deps: DocToolDeps = {}): ToolEntry {
  return {
    name: 'doc-edit',
    summary: '内容对象文本编辑原语（str_replace/insert/create；changed+source）',
    schema: { name: 'doc-edit', description: DOC_EDIT_DESC, parameters: DOC_EDIT_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'doc',
    executor: async (tc, ctx) => executeDocEdit(deps, tc, ctx),
    help: docEditHelp,
  };
}

/** 便捷：一次创建 doc 域两工具条目。 */
export function createDocTools(deps: DocToolDeps = {}): ToolEntry[] {
  return [createDocReadToolEntry(deps), createDocEditToolEntry(deps)];
}
