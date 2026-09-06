/**
 * worker-session.ts —— 持久执行上下文（FR-028/EC-009，P2 试点）。
 *
 * 生态位（discovery §3.3 B 组 ◐）：持久 shell（PTY 状态跨调用）→ **持久 Worker**
 * （状态跨消息存活）；无 PTY/ANSI/终端语义（NG-005：help 显式声明）；页面卸载即失
 * （worker 生命周期随页面）。worker 崩溃 → 自动重建，主会话不中断（EC-009：
 * 崩溃调用返回 ok:false + 已重建，后续调用可在新会话继续）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformWorkerFactory, PlatformWorkerHandle } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

interface SessionRequest {
  id: string;
  code: string;
}
interface SessionResponse {
  id: string;
  ok: boolean;
  result?: string;
  error?: string;
}

/** 持久 worker 会话（状态跨调用存活；崩溃自动重建）。 */
export class WorkerSession {
  private handle: PlatformWorkerHandle<SessionRequest, SessionResponse> | null = null;
  private dead = false;
  private runs = 0;

  constructor(
    private factory: PlatformWorkerFactory,
    private timeoutMs = 15000,
  ) {
    this.spawn();
  }

  private spawn(): void {
    this.handle = this.factory.create<SessionRequest, SessionResponse>();
    this.dead = false;
  }

  get stats(): { runs: number; alive: boolean } {
    return { runs: this.runs, alive: this.handle !== null && !this.dead };
  }

  /** 在同一 worker 会话内执行代码（状态跨调用存活；NG-005 无 PTY 语义）。 */
  async exec(code: string): Promise<{ ok: boolean; result?: string; error?: string }> {
    if (!this.handle || this.dead) this.spawn(); // 崩溃/已重置 → 重建会话
    const worker = this.handle!;
    this.runs += 1;
    const outcome = await new Promise<{ ok: boolean; result?: string; error?: string }>((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate();
        this.dead = true;
        resolve({ ok: false, error: 'worker-session 执行超时（会话已终止，下次调用自动重建）' });
      }, this.timeoutMs);
      worker.onmessage = (ev) => {
        clearTimeout(timer);
        const resp = ev.data;
        resolve(resp?.ok ? { ok: true, result: resp.result ?? '' } : { ok: false, error: resp?.error ?? 'worker 执行失败' });
      };
      worker.onerror = (ev) => {
        clearTimeout(timer);
        // EC-009：worker 崩溃 → 标记 dead（下条自动重建），本次 ok:false 不中断主会话
        this.dead = true;
        resolve({ ok: false, error: `worker 崩溃：${String((ev as { message?: string })?.message ?? ev)}（已重建，后续调用可继续）` });
      };
      try {
        worker.post({ id: `ws-${Date.now()}`, code });
      } catch (err) {
        clearTimeout(timer);
        this.dead = true;
        resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });
    return outcome;
  }

  /** 重建会话（丢弃旧状态）。 */
  reset(): void {
    try {
      this.handle?.terminate();
    } catch {
      // 忽略
    }
    this.spawn();
  }
}

export function createWorkerSession(factory: PlatformWorkerFactory): WorkerSession {
  return new WorkerSession(factory);
}

// ---------- ToolEntry ----------

export interface WorkerSessionToolDeps {
  factory: PlatformWorkerFactory;
}

const WORKER_SESSION_DESC =
  'worker-session：持久执行上下文（变量/状态跨调用存活于同一 worker 会话；无 PTY/终端语义 NG-005；页面卸载即失）。' +
  ' 子命令 exec --code（会话内执行）/ reset（重建会话）/ status。' +
  ' 参数进 args 对象：{"subcommand":"exec","args":{"code":"state = (state ?? 0) + 1"}}。';

const WORKER_SESSION_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['exec', 'reset', 'status'], description: 'worker-session 子命令。' },
    args: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'exec 的 JS 代码。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function workerSessionHelp(): string {
  return [
    'worker-session —— 持久执行上下文（状态跨调用存活；P2 试点）',
    '用法：worker-session exec --code <JS> / reset / status',
    '',
    '示例：worker-session exec --code "let n = (globalThis.n ?? 0) + 1; globalThis.n = n"',
    '边界声明（NG-005）：无 PTY/ANSI/终端 TTY 语义（浏览器无承载）；worker 生命周期随页面（卸载即失）；' +
      '崩溃自动重建、主会话不中断（EC-009）。',
  ].join('\n');
}

/** 创建 worker-session 工具条目（每条目持有一个持久会话）。 */
export function createWorkerSessionToolEntry(deps: WorkerSessionToolDeps): ToolEntry {
  const session = new WorkerSession(deps.factory);
  return {
    name: 'worker-session',
    summary: '持久执行上下文（worker 会话；状态跨调用；无 PTY 语义）',
    schema: { name: 'worker-session', description: WORKER_SESSION_DESC, parameters: WORKER_SESSION_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'exec',
    executor: async (tc) => {
      switch (tc.subcommand) {
        case 'exec': {
          const code = tc.args.code ?? '';
          if (!code.trim()) return { ok: false, output: '✖ worker-session exec 缺少 --code' };
          const r = await session.exec(code);
          return r.ok ? { ok: true, output: String(r.result ?? '') } : { ok: false, output: `✖ ${r.error}`, error: r.error };
        }
        case 'reset': {
          session.reset();
          return { ok: true, output: '✓ worker 会话已重建（旧状态丢弃）' };
        }
        case 'status': {
          const st = session.stats;
          return { ok: true, output: `worker 会话 ${st.alive ? '存活' : '已死（下次调用重建）'}（runs=${st.runs}）` };
        }
        default:
          return { ok: false, output: `✖ worker-session 未知子命令 "${tc.subcommand}"（可用：exec/reset/status）` };
      }
    },
    help: workerSessionHelp,
  };
}
