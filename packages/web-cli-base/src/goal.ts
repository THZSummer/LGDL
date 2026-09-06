/**
 * goal.ts —— 跨会话持久目标（FR-030，S-01/S-02：宿主 = IDB origin 级）。
 *
 * 生态位（§3.4 TSK 域 / discovery §3.3 F 组）：跨会话目标（create/get/update/
 * archive + 进度记录），origin 级持久 —— 刷新/重开可恢复；同源多标签**共享读** +
 * EC-013 写冲突标记（rev + expectedRev 乐观并发，不静默覆盖丢失）。载体 = 注入
 * StorageBackend（浏览器 = createIdbStorage；node 测试/降级 = memory）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { StorageBackend, StorageWriteResult } from './storage-mem.js';
import type { ToolEntry, ToolResult } from './router.js';

export type GoalStatus = 'active' | 'archived';

export interface GoalRecord {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  /** 进度（如 done/total 子目标计数）。 */
  progress?: { done: number; total: number };
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_PREFIX = 'goal';

export class GoalStore {
  constructor(
    private backend: StorageBackend,
    private keyPrefix = DEFAULT_PREFIX,
  ) {}

  private keyOf(id: string): string {
    return `${this.keyPrefix}:${id}`;
  }

  private normalizeId(id: string): string {
    if (!/^[\w.-]{1,120}$/.test(id)) throw new Error(`非法 goal id "${id}"`);
    return id;
  }

  async create(rec: Omit<GoalRecord, 'createdAt' | 'updatedAt' | 'status'> & { status?: GoalStatus }): Promise<GoalRecord> {
    const id = this.normalizeId(rec.id);
    const now = Date.now();
    const goal: GoalRecord = { ...rec, id, status: rec.status ?? 'active', createdAt: now, updatedAt: now };
    const r = await this.backend.write(this.keyOf(id), JSON.stringify(goal));
    if (!r.ok) throw new Error(r.error ?? 'goal 创建失败');
    return goal;
  }

  async get(id: string): Promise<GoalRecord | null> {
    const raw = await this.backend.read(this.keyOf(this.normalizeId(id)));
    if (raw === null) return null;
    try {
      const g = JSON.parse(raw) as GoalRecord;
      return g.id ? g : null;
    } catch {
      return null;
    }
  }

  /**
   * 更新（含进度/归档）。opts.expectedRev 提供 = 乐观并发（EC-013）：
   * 版本不匹配 → {conflict}（调用方读取当前版本合并后重试）；不带 = last-write。
   */
  async update(id: string, patch: Partial<Omit<GoalRecord, 'id' | 'createdAt'>>, opts?: { expectedRev?: number }): Promise<{ ok: boolean; goal?: GoalRecord; conflict?: boolean; error?: string }> {
    const nid = this.normalizeId(id);
    const cur = await this.get(nid);
    if (!cur) return { ok: false, error: 'goal not found' };
    if (opts?.expectedRev !== undefined) {
      const currentRev = (await this.backend.revOf(this.keyOf(nid))) ?? 0;
      if (currentRev !== opts.expectedRev) {
        return { ok: false, conflict: true, error: `goal 写入冲突：期望 rev=${opts.expectedRev} 实际=${currentRev}（多标签并发，EC-013）` };
      }
    }
    const merged: GoalRecord = { ...cur, ...patch, id: nid, updatedAt: Date.now() };
    const r: StorageWriteResult = await this.backend.write(this.keyOf(nid), JSON.stringify(merged));
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, goal: merged };
  }

  async archive(id: string): Promise<boolean> {
    const r = await this.update(id, { status: 'archived' });
    return r.ok;
  }

  /** 列目标（可选 status 过滤；共享读：多标签均见同一 origin 数据）。 */
  async list(status?: GoalStatus): Promise<GoalRecord[]> {
    const entries = await this.backend.list(`${this.keyPrefix}:`);
    const out: GoalRecord[] = [];
    for (const e of entries) {
      const raw = await this.backend.read(e.name);
      if (raw === null) continue;
      try {
        const g = JSON.parse(raw) as GoalRecord;
        if (g.id && (!status || g.status === status)) out.push(g);
      } catch {
        // 损坏记录跳过
      }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async revOf(id: string): Promise<number | null> {
    return this.backend.revOf(this.keyOf(this.normalizeId(id)));
  }
}

export function createGoalStore(backend: StorageBackend): GoalStore {
  return new GoalStore(backend);
}

// ---------- 工具 ----------

export interface GoalToolDeps {
  store: GoalStore;
}

function fmtGoal(g: GoalRecord): string {
  const prog = g.progress ? ` 进度 ${g.progress.done}/${g.progress.total}` : '';
  return `- ${g.id} [${g.status}] ${g.title}${prog}${g.description ? `\n  ${g.description}` : ''}`;
}

/** goal 工具执行器（create/get/update/archive/list + 进度）。 */
export async function executeGoalTool(deps: GoalToolDeps, subcommand: string, args: Record<string, string>): Promise<ToolResult> {
  const store = deps.store;
  try {
    switch (subcommand) {
      case 'create': {
        const id = args.id ?? '';
        const title = args.title ?? '';
        if (!id || !title) return { ok: false, output: '✖ goal create 缺少 --id 与 --title' };
        const total = /^\d+$/.test(args.total ?? '') ? Number(args.total) : 0;
        const goal = await store.create({ id, title, description: args.description, ...(total > 0 ? { progress: { done: 0, total } } : {}) });
        return { ok: true, output: `✓ 已创建目标 ${fmtGoal(goal)}` };
      }
      case 'get': {
        const id = args.id ?? '';
        if (!id) return { ok: false, output: '✖ goal get 缺少 --id' };
        const g = await store.get(id);
        return g ? { ok: true, output: fmtGoal(g) } : { ok: false, output: `✖ 目标 "${id}" 不存在` };
      }
      case 'update': {
        const id = args.id ?? '';
        if (!id) return { ok: false, output: '✖ goal update 缺少 --id' };
        const patch: Partial<Omit<GoalRecord, 'id' | 'createdAt'>> = {};
        if (args.title) patch.title = args.title;
        if (args.description !== undefined) patch.description = args.description;
        if (args.done !== undefined && args.total !== undefined && /^\d+$/.test(args.done) && /^\d+$/.test(args.total)) {
          patch.progress = { done: Number(args.done), total: Number(args.total) };
        }
        const r = await store.update(id, patch);
        if (!r.ok) {
          return r.conflict
            ? { ok: false, output: `✖ ${r.error ?? '写入冲突'}（goal get 取最新版本后重试，EC-013）`, error: r.error }
            : { ok: false, output: `✖ 目标 "${id}" 不存在` };
        }
        return { ok: true, output: `✓ 已更新目标 ${fmtGoal(r.goal!)}` };
      }
      case 'archive': {
        const id = args.id ?? '';
        if (!id) return { ok: false, output: '✖ goal archive 缺少 --id' };
        const ok = await store.archive(id);
        return ok ? { ok: true, output: `✓ 目标 "${id}" 已归档` } : { ok: false, output: `✖ 目标 "${id}" 不存在` };
      }
      case 'list': {
        const status = args.status === 'archived' ? 'archived' : args.status === 'all' ? undefined : 'active';
        const goals = await store.list(status as GoalStatus | undefined);
        if (goals.length === 0) return { ok: true, output: '（无匹配目标）' };
        const label = status === 'archived' ? '已归档目标' : status === undefined ? '全部目标' : '进行中目标';
        return { ok: true, output: `${label}（${goals.length} 个）：\n${goals.map(fmtGoal).join('\n')}` };
      }
      default:
        return { ok: false, output: `✖ goal 未知子命令 "${subcommand}"（可用：create/get/update/archive/list）` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, output: `✖ goal 执行失败：${msg}`, error: msg };
  }
}

// ---------- ToolEntry ----------

const GOAL_DESC =
  'goal：跨会话持久目标（IDB origin 级，刷新/重开可恢复；同源多标签共享读 + 写冲突标记 EC-013）。' +
  ' 子命令：create --id --title [--description] / get --id / update --id [--title] [--done N --total N] / archive --id / list [--status active|archived|all]。' +
  ' 参数进 args 对象：{"subcommand":"create","args":{"id":"g1","title":"完成流程图"}}。';

const GOAL_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['create', 'get', 'update', 'archive', 'list'], description: 'goal 子命令。' },
    args: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '目标 id。' },
        title: { type: 'string', description: '目标标题。' },
        description: { type: 'string', description: '目标说明。' },
        done: { type: 'string', description: 'update 进度 done 数。' },
        total: { type: 'string', description: 'update 进度 total 数。' },
        status: { type: 'string', description: 'list 过滤 active/archived/all。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function goalHelp(): string {
  return [
    'goal —— 跨会话持久目标（origin 级；多标签共享读 + 写冲突标记）',
    '用法：goal <create|get|update|archive|list> ...',
    '',
    '示例：goal create --id improve-graph --title "让连线更清晰"',
    '说明：宿主 = IDB（刷新/重开可恢复）；todo 是会话级清单，goal 是跨会话目标（FR-029/030）。',
  ].join('\n');
}

export function createGoalToolEntry(deps: GoalToolDeps): ToolEntry {
  return {
    name: 'goal',
    summary: '跨会话持久目标（create/get/update/archive/进度；IDB origin 级）',
    schema: { name: 'goal', description: GOAL_DESC, parameters: GOAL_SCHEMA as unknown as Record<string, unknown> },
    risk: 'state',
    group: 'task',
    executor: async (tc) => executeGoalTool(deps, tc.subcommand, tc.args),
    help: goalHelp,
  };
}
