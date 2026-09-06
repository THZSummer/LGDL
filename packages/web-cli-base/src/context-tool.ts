/**
 * context-tool.ts —— 上下文膨胀管理（FR-035/NFR-009）。
 *
 * 生态位（Q-010/FR-035）：对 turns/工具输出做摘要压缩（summarizer 场景注入），
 * 控制上下文体量；**原始记录保留可检索**（压缩前全量存档至后端
 * `context:archive:<id>:<ts>`，可经 storage/检索域取回）；压缩动作入审计
 * （ctx.services.audit，NFR-009）。与 runner 集成面 = chat 闭包/场景触发
 * （ADR-007：runner 主体零改动）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { ChatTurn } from './llm.js';
import type { AuditSink } from './audit.js';
import type { ToolContext, ToolEntry, ToolResult } from './router.js';
import type { SessionStore, SessionRecord } from './session-store.js';

/** 摘要器（场景注入：可经 LLM 或规则压缩）。 */
export type Summarizer = (turns: ChatTurn[]) => string | Promise<string>;

export interface ContextToolDeps {
  store: SessionStore;
  summarizer?: Summarizer;
  /** 审计 sink（缺省读 ctx.services.audit）。 */
  audit?: AuditSink;
  sessionId?: () => string | null;
}

/** 上下文压缩（纯逻辑：摘要 + 截尾保留）。返回新记录 turns 与摘要。 */
export async function compactSessionRecord(
  rec: SessionRecord,
  summarizer: Summarizer,
  keepRecent = 4,
): Promise<{ summary: string; turns: ChatTurn[]; dropped: number }> {
  const summary = await summarizer(rec.turns);
  const keep = Math.max(1, Math.min(keepRecent, rec.turns.length));
  const recent = rec.turns.slice(-keep);
  const turns: ChatTurn[] = [
    { role: 'user', content: `（上下文已压缩。前情摘要：${summary}。原始记录已存档可检索。）` },
    ...recent,
  ];
  return { summary, turns, dropped: rec.turns.length - turns.length };
}

/** context 工具执行器（compact 子命令）。 */
export async function executeContextTool(
  deps: ContextToolDeps,
  subcommand: string,
  args: Record<string, string>,
  ctx: ToolContext,
): Promise<ToolResult> {
  switch (subcommand) {
    case 'compact': {
      const summarizer = deps.summarizer;
      if (!summarizer) {
        return { ok: false, output: '✖ 未注入摘要器（summarizer）—— 场景需提供压缩能力（可经 LLM/规则）', error: 'summarizer not injected' };
      }
      const id = args.id ?? deps.sessionId?.() ?? (typeof ctx.sessionId === 'string' ? ctx.sessionId : null) ?? null;
      if (!id) return { ok: false, output: '✖ context compact 缺少会话 id（--id 或场景注入）', error: 'missing session id' };
      const rec = await deps.store.load(id);
      if (!rec) return { ok: false, output: `✖ 会话 ${id} 未持久化（先 session persist）`, error: 'session not persisted' };
      if (rec.turns.length <= 4) {
        return { ok: true, output: `会话 ${id} turns 仅 ${rec.turns.length} 条，无需压缩` };
      }
      const keepRecent = /^\d+$/.test(args.keep ?? '') ? Number(args.keep) : 4;
      const beforeTurns = rec.turns.length;
      // 1 原始记录保留可检索：全量存档（store aux 面，listAux 可列）
      const archiveKey = `archive:${id}:${Date.now()}`;
      await deps.store.writeAux(archiveKey, JSON.stringify(rec.turns));
      // 2 摘要压缩
      const { summary, turns, dropped } = await compactSessionRecord(rec, summarizer, keepRecent);
      const updated: SessionRecord = { ...rec, turns, summary, updatedAt: Date.now() };
      await deps.store.save(updated);
      // 3 压缩动作入审计（NFR-009）
      const audit = deps.audit ?? (ctx.services?.audit as AuditSink | undefined);
      audit?.record({
        type: 'context-compact',
        ts: Date.now(),
        tool: 'context',
        beforeTurns,
        afterTurns: turns.length,
        detail: `dropped=${dropped} archive=${archiveKey} summary=${summary.slice(0, 120)}`,
      });
      return {
        ok: true,
        output: `✓ 上下文已压缩：${beforeTurns} turns → ${turns.length} turns（摘要已置顶）。原始记录存档 "${archiveKey}" 可检索。`,
      };
    }
    default:
      return { ok: false, output: `✖ context 未知子命令 "${subcommand}"（可用：compact）` };
  }
}

// ---------- ToolEntry 工厂 ----------

const CONTEXT_DESC =
  'context：上下文膨胀管理。子命令：compact（对持久化会话 turns 做摘要压缩——摘要器由场景注入；压缩前原始记录全量存档可检索；压缩动作入审计）。' +
  ' 参数进 args 对象：{"subcommand":"compact","args":{"id":"demo","keep":"4"}}。';

const CONTEXT_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: ['compact'],
      description: 'context 子命令：compact。',
    },
    args: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '会话 id（缺省取当前会话）。' },
        keep: { type: 'string', description: '保留最近 turns 数（缺省 4）。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function contextHelp(): string {
  return [
    'context —— 上下文膨胀管理（摘要压缩，原始记录保留可检索）',
    '用法：context compact --id <会话 id> [--keep <最近 turns 数>]',
    '',
    '示例：context compact --id demo-1 --keep 6',
    '说明：压缩动作入审计（NFR-009）；原始记录存档后可经存储/检索域找回。',
  ].join('\n');
}

/** 创建 context 工具条目。 */
export function createContextToolEntry(deps: ContextToolDeps): ToolEntry {
  return {
    name: 'context',
    summary: '上下文压缩（turns 摘要 + 原始存档可检索 + 审计）',
    schema: { name: 'context', description: CONTEXT_DESC, parameters: CONTEXT_SCHEMA as unknown as Record<string, unknown> },
    risk: 'state',
    group: 'session',
    executor: async (tc, ctx) => executeContextTool(deps, tc.subcommand, tc.args, ctx),
    help: contextHelp,
  };
}
