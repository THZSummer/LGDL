/**
 * jobs.ts —— 后台任务句柄（FR-031，S-03：页面存活期执行 + interrupted + EC-015 即时返回）。
 *
 * 生态位（discovery §3.3 B 组 ◐）：后台作业生态位 → **任务句柄**：submit → jobId；
 * status/result/log/cancel。生命周期 = **页面存活期执行** + 状态与结果落 IDB +
 * 页面卸载标记 interrupted（可查/可重试，EC-008）；跨页面存活/服务端常驻守护 = out
 * （A-02 代理原则）。完成通知授权两路降级由场景经 notify 承接（FR-024 P2）。
 *
 * EC-015：jobs submit 条目 delayMs:0 —— 启动命令即时返回 jobId，不阻塞轮次、不叠
 * delay 等待（F-23 sleep 语义不变）。执行体 = 注入 runner（页面内异步函数；浏览器
 * 可包装 worker 长任务）；result/log 持久化。cancel 为协作式（无法强杀页内函数）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { StorageBackend, StorageWriteResult } from './storage-mem.js';
import type { ToolEntry, ToolResult } from './router.js';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled' | 'interrupted';

/** 是否已处于取消/中断终态（cancel 后 runner 完成不得覆盖，EC-008 语义）。 */
export function isJobTerminal(status: JobStatus): boolean {
  return status === 'canceled' || status === 'interrupted';
}

export interface JobRecord {
  id: string;
  label?: string;
  payload: Record<string, string>;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  result?: string;
  error?: string;
  logs: string[];
}

/** 页面卸载标记（beforeunload：场景调用 markAllInterrupted —— 在途任务可查/可重试 EC-008）。 */
export async function markJobsInterrupted(store: JobStore): Promise<number> {
  const jobs = await store.list('running');
  let n = 0;
  for (const j of jobs) {
    j.status = 'interrupted';
    j.finishedAt = Date.now();
    j.logs.push('（页面卸载：任务标记 interrupted，可查询/重试）');
    await store.writeRecord(j);
    n += 1;
  }
  return n;
}

export class JobStore {
  /** 在途任务规范对象（submit 注册；cancel/interrupted/runner 共享同一引用，终态不被覆盖）。 */
  private live = new Map<string, JobRecord>();

  constructor(
    private backend: StorageBackend,
    private keyPrefix = 'job',
  ) {}

  /** 注册在途任务对象（submitJob 调用；此后 get/list 返回规范引用）。 */
  registerLive(job: JobRecord): void {
    this.live.set(this.normalizeId(job.id), job);
  }

  private keyOf(id: string): string {
    return `${this.keyPrefix}:${id}`;
  }

  private normalizeId(id: string): string {
    if (!/^[\w.-]{1,120}$/.test(id)) throw new Error(`非法 job id "${id}"`);
    return id;
  }

  async writeRecord(job: JobRecord): Promise<StorageWriteResult> {
    return this.backend.write(this.keyOf(this.normalizeId(job.id)), JSON.stringify(job));
  }

  async get(id: string): Promise<JobRecord | null> {
    const nid = this.normalizeId(id);
    const live = this.live.get(nid);
    if (live) return live; // 在途任务返回规范引用（状态一致）
    const raw = await this.backend.read(this.keyOf(nid));
    if (raw === null) return null;
    try {
      const j = JSON.parse(raw) as JobRecord;
      return j.id ? j : null;
    } catch {
      return null;
    }
  }

  async list(status?: JobStatus): Promise<JobRecord[]> {
    const entries = await this.backend.list(`${this.keyPrefix}:`);
    const out: JobRecord[] = [];
    for (const e of entries) {
      const j = await this.get(e.name.slice(this.keyPrefix.length + 1));
      if (j && (!status || j.status === status)) out.push(j);
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }

  async newId(label?: string): Promise<string> {
    return `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${label ? `-${label.slice(0, 20).replace(/[^\w.-]/g, '')}` : ''}`;
  }
}

/** 任务执行上下文（runner 可 log / 报进度）。 */
export interface JobRunContext {
  log(line: string): Promise<void>;
}

/** 页面内任务执行体（注入；接收 payload，返回结果文本）。 */
export type JobRunner = (ctx: JobRunContext, payload: Record<string, string>) => Promise<string>;

export interface JobsToolDeps {
  store: JobStore;
  /** 任务执行体（注入：页面内异步函数/worker 包装；未注入 submit 报错）。 */
  runner?: JobRunner;
  /** 通知回调（完成提醒授权两路降级由场景承载，FR-024 P2；可选）。 */
  onDone?: (job: JobRecord) => void | Promise<void>;
}

/** 提交并启动任务（fire-and-forget：页面存活期执行，状态/结果落库）。 */
export async function submitJob(deps: JobsToolDeps, payload: Record<string, string>, label?: string): Promise<JobRecord> {
  const store = deps.store;
  const id = await store.newId(label);
  const now = Date.now();
  const job: JobRecord = {
    id,
    label,
    payload,
    status: 'queued',
    createdAt: now,
    logs: [],
  };
  store.registerLive(job);
  await store.writeRecord(job);
  if (!deps.runner) {
    job.status = 'failed';
    job.error = 'runner not injected';
    job.finishedAt = Date.now();
    job.logs.push('✖ 未注入任务执行体（jobs runner）');
    await store.writeRecord(job);
    return job;
  }
  const ctx: JobRunContext = {
    log: async (line) => {
      job.logs.push(line);
      await store.writeRecord(job);
    },
  };
  // 页面存活期执行（不阻塞调用方，EC-015）
  void (async () => {
    job.status = 'running';
    job.startedAt = Date.now();
    await store.writeRecord(job);
    try {
      const result = await deps.runner!(ctx, payload);
      if (isJobTerminal(job.status)) return; // 终态不被覆盖（cancel/interrupted 优先）
      job.status = 'completed';
      job.result = result;
      job.finishedAt = Date.now();
      job.logs.push('✓ 任务完成');
      await store.writeRecord(job);
      await deps.onDone?.(job);
    } catch (err) {
      if (isJobTerminal(job.status)) return;
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      job.finishedAt = Date.now();
      job.logs.push(`✖ 任务失败：${job.error}`);
      await store.writeRecord(job);
      await deps.onDone?.(job);
    }
  })();
  return job;
}

function fmtJob(j: JobRecord): string {
  const lines = [
    `job ${j.id} [${j.status}]${j.label ? `（${j.label}）` : ''}`,
    `created: ${new Date(j.createdAt).toISOString()}`,
  ];
  if (j.startedAt) lines.push(`started: ${new Date(j.startedAt).toISOString()}`);
  if (j.finishedAt) lines.push(`finished: ${new Date(j.finishedAt).toISOString()}`);
  if (j.result !== undefined) lines.push(`result: ${j.result.slice(0, 500)}`);
  if (j.error) lines.push(`error: ${j.error}`);
  if (j.logs.length > 0) lines.push(`log（${j.logs.length} 条）: ${j.logs.slice(-3).join(' | ')}`);
  return lines.join('\n');
}

export async function executeJobsTool(deps: JobsToolDeps, subcommand: string, args: Record<string, string>): Promise<ToolResult> {
  const store = deps.store;
  switch (subcommand) {
    case 'submit': {
      const label = args.label;
      const payload = { ...args };
      delete payload.label;
      const job = await submitJob(deps, payload, label);
      const failedEarly = job.status === 'failed';
      return {
        ok: !failedEarly,
        output: failedEarly
          ? `✖ ${job.error ?? '任务提交失败'}（jobs 需注入任务执行体）`
          : `✓ 已提交 job ${job.id}（${job.status}）——即时返回，进度用 jobs status 查询`,
        error: failedEarly ? job.error : undefined,
      };
    }
    case 'status': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ jobs status 缺少 --id <jobId>' };
      const j = await store.get(id);
      return j ? { ok: true, output: fmtJob(j) } : { ok: false, output: `✖ job "${id}" 不存在（jobs list 可查）` };
    }
    case 'result': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ jobs result 缺少 --id <jobId>' };
      const j = await store.get(id);
      if (!j) return { ok: false, output: `✖ job "${id}" 不存在` };
      if (j.status !== 'completed') return { ok: false, output: `job ${id} 状态为 ${j.status}，暂无结果` };
      return { ok: true, output: j.result ?? '' };
    }
    case 'log': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ jobs log 缺少 --id <jobId>' };
      const j = await store.get(id);
      if (!j) return { ok: false, output: `✖ job "${id}" 不存在` };
      return { ok: true, output: j.logs.join('\n') || '（无日志）' };
    }
    case 'cancel': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ jobs cancel 缺少 --id <jobId>' };
      const j = await store.get(id);
      if (!j) return { ok: false, output: `✖ job "${id}" 不存在` };
      if (j.status === 'completed' || j.status === 'failed' || j.status === 'canceled') {
        return { ok: true, output: `job ${id} 已处于终态（${j.status}），无需取消` };
      }
      j.status = 'canceled';
      j.finishedAt = Date.now();
      j.logs.push('（用户取消）');
      await store.writeRecord(j);
      return { ok: true, output: `✓ job ${id} 已取消` };
    }
    case 'retry': {
      const id = args.id ?? '';
      if (!id) return { ok: false, output: '✖ jobs retry 缺少 --id <jobId>' };
      const j = await store.get(id);
      if (!j) return { ok: false, output: `✖ job "${id}" 不存在` };
      if (j.status !== 'interrupted' && j.status !== 'failed') {
        return { ok: false, output: `仅 interrupted/failed 任务可重试（当前 ${j.status}）` };
      }
      const nj = await submitJob(deps, j.payload, `${j.label ?? ''}${j.label ? ' ' : ''}retry`);
      return { ok: true, output: `✓ 已重试为 job ${nj.id}（原 ${j.status} 记录保留可查）` };
    }
    case 'list': {
      const status = (args.status as JobStatus | undefined) ?? undefined;
      const jobs = await store.list(status);
      if (jobs.length === 0) return { ok: true, output: `（无${status ? ` ${status}` : ''}任务）` };
      return { ok: true, output: `jobs（${jobs.length} 个）：\n${jobs.map((j) => `- ${j.id} [${j.status}]${j.label ? ` ${j.label}` : ''}`).join('\n')}` };
    }
    default:
      return { ok: false, output: `✖ jobs 未知子命令 "${subcommand}"（可用：submit/status/result/log/cancel/retry/list）` };
  }
}

// ---------- ToolEntry ----------

const JOBS_DESC =
  'jobs：后台任务句柄。子命令：submit [--label] （启动任务，即时返回 jobId）/ status --id / result --id / log --id / cancel --id / retry --id（interrupted 后可重试）/ list [--status]。' +
  ' 生命周期：页面存活期执行 + 状态/结果落库 + 卸载标记 interrupted（可查/可重试）。' +
  ' 参数进 args 对象：{"subcommand":"submit","args":{"label":"导出 svg"}}。';

const JOBS_SCHEMA = {
  type: 'object',
  properties: {
    subcommand: { type: 'string', enum: ['submit', 'status', 'result', 'log', 'cancel', 'retry', 'list'], description: 'jobs 子命令。' },
    args: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'jobId。' },
        label: { type: 'string', description: 'submit 的标签。' },
        status: { type: 'string', description: 'list 过滤状态。' },
      },
    },
  },
  required: ['subcommand'],
} as const;

export function jobsHelp(): string {
  return [
    'jobs —— 后台任务句柄（页面存活期执行；卸载标记 interrupted 可查/可重试）',
    '用法：jobs <submit|status|result|log|cancel|retry|list> ...',
    '',
    '示例：jobs submit --label 长任务；jobs status --id job-xxx',
    '说明：submit 即时返回 jobId（不阻塞轮次，EC-015）；状态/结果落 IDB；跨页面存活/服务端守护不做（代理原则）。',
  ].join('\n');
}

/** 创建 jobs 工具条目（delayMs:0 = 启动类命令即时返回不叠 delay，EC-015）。 */
export function createJobsToolEntry(deps: JobsToolDeps): ToolEntry {
  return {
    name: 'jobs',
    summary: '后台任务句柄（submit→jobId / status/result/log/cancel/retry/list；interrupted 可重试）',
    schema: { name: 'jobs', description: JOBS_DESC, parameters: JOBS_SCHEMA as unknown as Record<string, unknown> },
    risk: 'state',
    group: 'task',
    delayMs: 0,
    executor: async (tc) => executeJobsTool(deps, tc.subcommand, tc.args),
    help: jobsHelp,
  };
}
