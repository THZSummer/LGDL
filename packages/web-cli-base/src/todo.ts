/**
 * todo.ts —— 会话级任务清单（FR-029，S-01：宿主 = session store 随会话持久化）。
 *
 * 生态位（§3.4 TSK 域）：dsh 三层任务体系「会话任务」的浏览器载体 —— todo 随
 * 当前会话（session store）持久化：会话恢复后清单仍在；不跨会话独立（goal 域才
 * 跨会话，FR-030）。语义 = 会话待办清单（非 OS todo 命令照搬，D-6 重表达）。
 *
 * 本文件零 LGDL/react import（NFR-001）；载体注入（node 测试 memory / 浏览器 IDB）。
 */
import type { ToolContext, ToolEntry, ToolResult } from './router.js';
import type { SessionStore, SessionRecord } from './session-store.js';

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

/** SessionRecord 内嵌的 todo 状态（运行时以扩展键持久化，随会话）。 */
export interface TodoSessionState {
  todos: TodoItem[];
}

export class TodoStore {
  constructor(
    private store: SessionStore,
    private sessionId: string,
  ) {}

  private async loadState(): Promise<SessionRecord & Partial<TodoSessionState>> {
    return (await this.store.load(this.sessionId)) ?? {
      id: this.sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      turns: [],
    };
  }

  private async persist(rec: SessionRecord & Partial<TodoSessionState>): Promise<void> {
    const r = await this.store.save({ ...rec, updatedAt: Date.now() });
    if (!r.ok) throw new Error(r.error ?? 'todo 持久化失败');
  }

  private async withTodos<T>(fn: (todos: TodoItem[]) => T): Promise<T> {
    const rec = await this.loadState();
    const todos = rec.todos ?? [];
    const out = fn(todos);
    await this.persist({ ...rec, todos });
    return out;
  }

  async list(): Promise<TodoItem[]> {
    const rec = await this.loadState();
    return rec.todos ?? [];
  }

  async add(text: string): Promise<TodoItem> {
    const item: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.withTodos((todos) => {
      todos.push(item);
    });
    return item;
  }

  async update(id: string, patch: Partial<Pick<TodoItem, 'text' | 'done'>>): Promise<TodoItem | null> {
    return this.withTodos((todos) => {
      const item = todos.find((t) => t.id === id);
      if (!item) return null;
      if (patch.text !== undefined) item.text = patch.text;
      if (patch.done !== undefined) item.done = patch.done;
      item.updatedAt = Date.now();
      return item;
    }).then((r) => (r === null ? null : r));
  }

  async markDone(id: string, done: boolean): Promise<TodoItem | null> {
    return this.update(id, { done });
  }

  async remove(id: string): Promise<boolean> {
    return this.withTodos((todos) => {
      const idx = todos.findIndex((t) => t.id === id);
      if (idx < 0) return false;
      todos.splice(idx, 1);
      return true;
    });
  }
}

export function createTodoStore(store: SessionStore, sessionId: string): TodoStore {
  return new TodoStore(store, sessionId);
}

// ---------- 工具 ----------

export interface TodoToolDeps {
  store: SessionStore;
  sessionId?: () => string | null;
}

function resolveId(deps: TodoToolDeps, ctx: ToolContext): string | null {
  return (
    deps.sessionId?.() ??
    (typeof ctx.sessionId === 'string' ? ctx.sessionId : null) ??
    (typeof ctx.services?.sessionId === 'string' ? (ctx.services.sessionId as string) : null)
  );
}

/** todo 工具执行器（add/list/update/mark-done/remove）。 */
export async function executeTodoTool(deps: TodoToolDeps, subcommand: string, args: Record<string, string>, ctx: ToolContext): Promise<ToolResult> {
  const sessionId = resolveId(deps, ctx);
  if (!sessionId) {
    return { ok: false, output: '✖ todo 需要当前会话 id（场景注入 sessionId）——todo 随会话持久化（FR-029 S-01）', error: 'missing session id' };
  }
  const ts = createTodoStore(deps.store, sessionId);
  switch (subcommand) {
    case 'add': {
      const text = args.text ?? '';
      if (!text.trim()) return { ok: false, output: '✖ todo add 缺少 --text <任务文本>' };
      const item = await ts.add(text.trim());
      return { ok: true, output: `✓ 已添加 todo ${item.id}: ${item.text}` };
    }
    case 'list': {
      const todos = await ts.list();
      if (todos.length === 0) return { ok: true, output: '（会话内无 todo）' };
      const lines = [`会话 todo（${todos.length} 个）：`];
      for (const t of todos) {
        lines.push(`- [${t.done ? 'x' : ' '}] ${t.id} ${t.text}`);
      }
      return { ok: true, output: lines.join('\n') };
    }
    case 'mark-done': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ todo mark-done 缺少 --id' };
      const done = args.done === 'true';
      const item = await ts.markDone(id, done);
      return item
        ? { ok: true, output: `✓ todo ${id} 已${done ? '完成' : '重开'}` }
        : { ok: false, output: `✖ todo ${id} 不存在` };
    }
    case 'update': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ todo update 缺少 --id' };
      const item = await ts.update(id, { text: args.text ?? undefined, done: args.done === 'true' ? true : undefined });
      return item
        ? { ok: true, output: `✓ todo ${id} 已更新: ${item.text}` }
        : { ok: false, output: `✖ todo ${id} 不存在` };
    }
    case 'remove': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ todo remove 缺少 --id' };
      const removed = await ts.remove(id);
      return removed ? { ok: true, output: `✓ todo ${id} 已删除` } : { ok: false, output: `✖ todo ${id} 不存在` };
    }
    default:
      return { ok: false, output: `✖ todo 未知子命令 "${subcommand}"（可用：add/list/update/mark-done/remove）` };
  }
}

// ---------- ToolEntry ----------

const TODO_DESC =
  'todo：会话级任务清单（随会话持久化，非跨会话）。子命令：add --text / list / mark-done --id --done true|false / update --id [--text] / remove --id。' +
  ' 参数进 args 对象：{"subcommand":"add","args":{"text":"画图"}}。';

const TODO_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['add', 'list', 'mark-done', 'update', 'remove'], description: 'todo 子命令。' },
    args: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'add/update 的任务文本。' },
        id: { type: 'string', description: 'mark-done/update/remove 的 todo id。' },
        done: { type: 'string', description: 'mark-done 的 "true"/"false"。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function todoHelp(): string {
  return [
    'todo —— 会话级任务清单（随会话持久化；跨会话目标用 goal）',
    '用法：todo <add|list|mark-done|update|remove> ...',
    '',
    '示例：todo add --text "检查节点 a 的连线"',
    '说明：宿主 = session store（S-01）：会话恢复后清单仍在；不跨会话独立。',
  ].join('\n');
}

export function createTodoToolEntry(deps: TodoToolDeps): ToolEntry {
  return {
    name: 'todo',
    summary: '会话级任务清单（add/list/mark-done/update/remove；随会话持久化）',
    schema: { name: 'todo', description: TODO_DESC, parameters: TODO_SCHEMA as unknown as Record<string, unknown> },
    risk: 'state',
    group: 'task',
    executor: async (tc, ctx) => executeTodoTool(deps, tc.subcommand, tc.args, ctx),
    help: todoHelp,
  };
}
