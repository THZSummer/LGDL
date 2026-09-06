/**
 * session-tool.ts —— session 工具（FR-034：持久化/恢复查询/恢复点管理）。
 *
 * base 契约面：经注入 SessionStore 将当前会话 turns 落库（刷新可恢复）、查询已
 * 持久化会话信息、管理恢复点。**恢复入口 UI 归场景**（React/弹层呈现「恢复」按钮），
 * 本工具只提供持久化/查询/恢复点状态操作。
 *
 * 数据来源：会话 id 与 turns 经依赖回调（scene：当前会话 id + turns 快照）或
 * ctx 注入（ToolContext.services.session + ctx.sessionId）。无可用上下文 →
 * 友好错误。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { ChatTurn } from './llm.js';
import type { ToolContext, ToolEntry, ToolResult } from './router.js';
import type { SessionStore, SessionRecord } from './session-store.js';

export interface SessionToolDeps {
  store: SessionStore;
  /** 当前会话 id（scene 提供；可省 → 取 ctx.sessionId）。 */
  sessionId?: () => string | null;
  /** 当前 turns 快照（scene 提供；persist 用）。 */
  turnsOf?: () => ChatTurn[];
}

export function resolveSessionContext(deps: SessionToolDeps, ctx: ToolContext): { store: SessionStore; sessionId: string } {
  const sessionId =
    deps.sessionId?.() ??
    (typeof ctx.sessionId === 'string' ? ctx.sessionId : null) ??
    (ctx.services && typeof ctx.services.sessionId === 'string' ? (ctx.services.sessionId as string) : null);
  if (!sessionId) throw new Error('无当前会话 id（场景未注入 sessionId）');
  return { store: deps.store, sessionId };
}

function describe(rec: SessionRecord): string {
  const lines = [
    `会话 ${rec.id}（创建 ${new Date(rec.createdAt).toISOString()}，更新 ${new Date(rec.updatedAt).toISOString()}）`,
    `turns: ${rec.turns.length}`,
  ];
  if (rec.summary) lines.push(`summary: ${rec.summary.slice(0, 200)}`);
  const rps = rec.resumePoints ?? [];
  if (rps.length > 0) {
    lines.push('resumePoints:');
    for (const rp of rps) lines.push(`  - ${rp.id}（atTurn ${rp.atTurn}${rp.label ? `，${rp.label}` : ''}）`);
  }
  return lines.join('\n');
}

/** session 工具执行器。 */
export async function executeSessionTool(deps: SessionToolDeps, subcommand: string, args: Record<string, string>, ctx: ToolContext): Promise<ToolResult> {
  switch (subcommand) {
    case 'persist': {
      let store: SessionStore;
      let sessionId: string;
      try {
        ({ store, sessionId } = resolveSessionContext(deps, ctx));
      } catch (err) {
        return { ok: false, output: `✖ ${(err as Error).message}（persist 需要当前会话上下文）`, error: (err as Error).message };
      }
      const turns = deps.turnsOf?.() ?? [];
      if (turns.length === 0) {
        return { ok: false, output: '✖ 无可持久化的 turns（场景未提供 turns 快照）' };
      }
      const existing = await store.load(sessionId);
      const rec: SessionRecord = {
        id: sessionId,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        turns,
        resumePoints: existing?.resumePoints,
        summary: existing?.summary,
      };
      const r = await store.save(rec);
      if (!r.ok) {
        return { ok: false, output: `✖ 持久化失败：${r.error ?? (r.conflict ? '写入冲突' : '未知')}`, error: r.error };
      }
      return { ok: true, output: `✓ 会话 ${sessionId} 已持久化（${turns.length} turns，rev ${r.rev}）—— 刷新页面后可恢复` };
    }
    case 'status': {
      let store: SessionStore;
      let sessionId: string;
      try {
        ({ store, sessionId } = resolveSessionContext(deps, ctx));
      } catch (err) {
        return { ok: false, output: `✖ ${(err as Error).message}`, error: (err as Error).message };
      }
      const rec = await store.load(sessionId);
      return rec
        ? { ok: true, output: describe(rec) }
        : { ok: true, output: `会话 ${sessionId} 尚未持久化（本次运行内存态；可 session persist 落库）` };
    }
    case 'query': {
      const id = args.id;
      if (!id) return { ok: false, output: '✖ session query 缺少 --id <会话 id>' };
      const rec = await deps.store.load(id);
      return rec
        ? { ok: true, output: describe(rec) }
        : { ok: false, output: `✖ 未找到已持久化会话 "${id}"（session list 可查全部）` };
    }
    case 'list': {
      const ids = await deps.store.list();
      return ids.length === 0
        ? { ok: true, output: '（无已持久化会话）' }
        : { ok: true, output: `已持久化会话（${ids.length} 个）：\n${ids.map((i) => `- ${i}`).join('\n')}` };
    }
    case 'add-checkpoint': {
      let store: SessionStore;
      let sessionId: string;
      try {
        ({ store, sessionId } = resolveSessionContext(deps, ctx));
      } catch (err) {
        return { ok: false, output: `✖ ${(err as Error).message}`, error: (err as Error).message };
      }
      const rec = await store.load(sessionId);
      if (!rec) return { ok: false, output: `✖ 会话 ${sessionId} 未持久化（先 session persist）` };
      const point = await store.addResumePoint(sessionId, args.label ?? '');
      return point
        ? { ok: true, output: `✓ 已添加恢复点 ${point.id}（atTurn ${point.atTurn}${args.label ? `，${args.label}` : ''}）` }
        : { ok: false, output: '✖ 恢复点添加失败' };
    }
    default:
      return { ok: false, output: `✖ session 未知子命令 "${subcommand}"（可用：persist/status/query/list/add-checkpoint）` };
  }
}

// ---------- ToolEntry 工厂 ----------

const SESSION_DESC =
  'session：会话持久化/恢复查询/恢复点管理。子命令：persist（把当前 turns 落库，刷新可恢复）/ status（当前会话持久化状态）/ query --id <id>（查已持久化会话信息）/ list（列全部）/ add-checkpoint --label（当前轮次加恢复点）。' +
  ' 恢复入口 UI 由场景提供（本工具为 base 契约面）。参数进 args 对象：{"subcommand":"persist"}。';

const SESSION_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: {
      type: 'string',
      enum: ['persist', 'status', 'query', 'list', 'add-checkpoint'],
      description: 'session 子命令。',
    },
    args: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'query 的会话 id。' },
        label: { type: 'string', description: 'add-checkpoint 的恢复点标签。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function sessionHelp(): string {
  return [
    'session —— 会话持久化/恢复查询/恢复点管理',
    '用法：session <persist|status|query|list|add-checkpoint>',
    '',
    '示例：session persist（落库当前会话）；session query --id demo-1',
    '说明：恢复入口 UI 归场景；本工具提供持久化契约与状态查询。',
  ].join('\n');
}

/** 创建 session 工具条目。 */
export function createSessionToolEntry(deps: SessionToolDeps): ToolEntry {
  return {
    name: 'session',
    summary: '会话持久化/恢复查询/恢复点管理（base 契约面）',
    schema: { name: 'session', description: SESSION_DESC, parameters: SESSION_SCHEMA as unknown as Record<string, unknown> },
    risk: 'state',
    group: 'session',
    executor: async (tc, ctx) => executeSessionTool(deps, tc.subcommand, tc.args, ctx),
    help: sessionHelp,
  };
}
