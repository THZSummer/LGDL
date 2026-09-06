import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage } from './storage-mem.js';
import { createSessionStore } from './session-store.js';
import type { SessionRecord } from './session-store.js';
import { executeSessionTool } from './session-tool.js';
import type { SessionToolDeps } from './session-tool.js';
import { executeContextTool } from './context-tool.js';
import type { ContextToolDeps, Summarizer } from './context-tool.js';
import { createMemoryAudit } from './audit.js';
import type { ChatTurn } from './llm.js';

/**
 * task-state.test.ts —— 任务/状态域 node 专项（TASK-006 段：session/context；
 * todo/goal/jobs/subagent 段由 TASK-010 扩展）。载体 = memory fake 后端
 * （浏览器 IDB/OPFS 真持久冒烟见 storage-tools.test.ts 预留清单，validate 承接）。
 * 红线核验：runner 主体零改动 —— 本域只经 SessionStore/chat 闭包承接（ADR-007）。
 */

function turnsOf(n: number): ChatTurn[] {
  const turns: ChatTurn[] = [{ role: 'user', content: 'init' }];
  for (let i = 1; i <= n; i++) {
    turns.push({ role: 'assistant', content: `assistant ${i}` });
    turns.push({ role: 'tool', content: `tool-result-${i} KEY=${i * 7}`, toolCallId: `call-${i}` });
  }
  return turns;
}

const sessDeps = (store: ReturnType<typeof createSessionStore>, over: Partial<SessionToolDeps> = {}): SessionToolDeps => ({
  store,
  sessionId: () => 'demo-1',
  turnsOf: () => turnsOf(3),
  ...over,
});

test('session-store: 持久 → 恢复 turns 等价 + list/remove（FR-034）', async () => {
  const store = createSessionStore(createMemoryStorage());
  const rec: SessionRecord = { id: 's1', createdAt: 1, updatedAt: 1, turns: turnsOf(3) };
  const saved = await store.save(rec);
  assert.equal(saved.ok, true);
  assert.ok(saved.rev >= 1);
  const loaded = await store.load('s1');
  assert.ok(loaded);
  assert.deepEqual(loaded.turns, rec.turns);
  assert.equal(loaded.createdAt, 1);
  // 恢复点
  const rp = await store.addResumePoint('s1', 'before-write');
  assert.ok(rp);
  assert.equal(rp.atTurn, 7); // init + 3*(assistant+tool)
  const rps = await store.resumePoints('s1');
  assert.equal(rps.length, 1);
  assert.equal(rps[0].label, 'before-write');
  // list/remove
  assert.deepEqual(await store.list(), ['s1']);
  assert.equal(await store.remove('s1'), true);
  assert.equal(await store.load('s1'), null);
});

test('session-store: EC-013 冲突标记 — expectedRev 不匹配 → conflict 不覆盖；last-write 覆盖', async () => {
  const store = createSessionStore(createMemoryStorage());
  await store.save({ id: 'c1', createdAt: 0, updatedAt: 0, turns: [{ role: 'user', content: 'v1' }] });
  // A 以 rev1 更新成功
  const a = await store.save({ id: 'c1', createdAt: 0, updatedAt: 0, turns: [{ role: 'user', content: 'v2' }] }, { expectedRev: 1 });
  assert.equal(a.ok, true);
  // B 持旧 rev1 → conflict
  const b = await store.save({ id: 'c1', createdAt: 0, updatedAt: 0, turns: [{ role: 'user', content: 'v3' }] }, { expectedRev: 1 });
  assert.equal(b.ok, false);
  assert.equal(b.conflict, true);
  const loaded = await store.load('c1');
  assert.equal(loaded?.turns[0].content, 'v2'); // 未被静默覆盖
  // last-write（无 expectedRev）覆盖
  const lw = await store.save({ id: 'c1', createdAt: 0, updatedAt: 0, turns: [{ role: 'user', content: 'v4' }] });
  assert.equal(lw.ok, true);
  assert.equal((await store.load('c1'))?.turns[0].content, 'v4');
});

test('session-tool: persist/status/query/list/add-checkpoint（base 契约面）', async () => {
  const store = createSessionStore(createMemoryStorage());
  const deps = sessDeps(store);
  // 未持久化 status
  const st0 = await executeSessionTool(deps, 'status', {}, {});
  assert.equal(st0.ok, true);
  assert.match(st0.output, /尚未持久化/);
  // persist
  const p = await executeSessionTool(deps, 'persist', {}, {});
  assert.equal(p.ok, true, p.error);
  assert.match(p.output, /已持久化/);
  // status 显示 turns
  const st = await executeSessionTool(deps, 'status', {}, {});
  assert.match(st.output, /turns: 7/); // init + 3*(assistant+tool)
  // query --id
  const q = await executeSessionTool(deps, 'query', { id: 'demo-1' }, {});
  assert.equal(q.ok, true);
  assert.match(q.output, /会话 demo-1/);
  const qMiss = await executeSessionTool(deps, 'query', { id: 'nope' }, {});
  assert.equal(qMiss.ok, false);
  assert.match(qMiss.output, /未找到已持久化会话/);
  // list
  const l = await executeSessionTool(deps, 'list', {}, {});
  assert.match(l.output, /demo-1/);
  // add-checkpoint
  const cp = await executeSessionTool(deps, 'add-checkpoint', { label: 'before big edit' }, {});
  assert.equal(cp.ok, true);
  assert.match(cp.output, /已添加恢复点/);
  assert.match((await executeSessionTool(deps, 'status', {}, {})).output, /before big edit/);
});

test('session-tool: 无当前会话上下文 → 友好错误（persist/status）', async () => {
  const store = createSessionStore(createMemoryStorage());
  const noSession: SessionToolDeps = { store };
  const p = await executeSessionTool(noSession, 'persist', {}, {});
  assert.equal(p.ok, false);
  assert.match(p.output, /无当前会话 id/);
  // 经 ctx.sessionId 可用
  const viaCtx = await executeSessionTool({ store, turnsOf: () => turnsOf(1) }, 'persist', {}, { sessionId: 'ctx-sess' });
  assert.equal(viaCtx.ok, true);
  assert.ok(await store.load('ctx-sess'));
});

test('context-tool: 摘要压缩后体量下降 + 关键结果可检索 + 原始存档 + 审计（FR-035/NFR-009）', async () => {
  const store = createSessionStore(createMemoryStorage());
  const audit = createMemoryAudit();
  const summarizer: Summarizer = async (turns) => {
    const toolLines = turns.filter((t) => t.role === 'tool').map((t) => t.content);
    return `摘要（含全部工具结果）：${toolLines.join(' | ')}`;
  };
  const deps: ContextToolDeps = { store, summarizer, audit, sessionId: () => 'ctx-1' };
  await store.save({ id: 'ctx-1', createdAt: 1, updatedAt: 1, turns: turnsOf(10) });
  const r = await executeContextTool(deps, 'compact', { id: 'ctx-1' }, {});
  assert.equal(r.ok, true, r.error);
  const rec = await store.load('ctx-1');
  assert.ok(rec);
  // 体量下降
  assert.ok(rec.turns.length < turnsOf(10).length);
  assert.equal(rec.turns.length, 5); // 1 summary + keep 4
  // 关键结果经摘要可检索
  assert.ok(rec.summary?.includes('KEY=70')); // 第 10 轮工具结果 10*7
  assert.match(rec.turns[0].content, /前情摘要/);
  // 原始记录保留可检索（aux 存档）
  const aux = await store.listAux();
  assert.equal(aux.length, 1);
  const raw = await store.readAux(aux[0]);
  const rawTurns = JSON.parse(raw ?? '[]') as ChatTurn[];
  assert.equal(rawTurns.length, 21); // init + 10*(a+t)
  // 压缩动作入审计（NFR-009）
  const ev = audit.events.find((e) => e.type === 'context-compact');
  assert.ok(ev);
  assert.equal(ev.beforeTurns, 21);
  assert.equal(ev.afterTurns, 5);
  assert.match(ev.detail ?? '', /archive=/);
});

test('context-tool: 未注入摘要器 / 会话未持久化 / turns 少不需压缩', async () => {
  const store = createSessionStore(createMemoryStorage());
  const noSum: ContextToolDeps = { store, sessionId: () => 'x' };
  const e1 = await executeContextTool(noSum, 'compact', {}, {});
  assert.equal(e1.ok, false);
  assert.match(e1.output, /未注入摘要器/);
  const withSum: ContextToolDeps = { store, summarizer: async () => 's', sessionId: () => 'miss' };
  const e2 = await executeContextTool(withSum, 'compact', {}, {});
  assert.equal(e2.ok, false);
  assert.match(e2.output, /未持久化/);
  await store.save({ id: 'small', createdAt: 1, updatedAt: 1, turns: turnsOf(1) });
  const e3 = await executeContextTool({ ...withSum, sessionId: () => 'small' }, 'compact', {}, {});
  assert.equal(e3.ok, true);
  assert.match(e3.output, /无需压缩/);
});

// ================= TASK-010 扩展：todo / goal / jobs / subagent 段 =================

import { createTodoStore, executeTodoTool } from './todo.js';
import { createGoalStore, executeGoalTool } from './goal.js';
import { JobStore, markJobsInterrupted, submitJob, executeJobsTool, createJobsToolEntry } from './jobs.js';
import { executeSubagent } from './subagent.js';
import { createCommandRouter } from './router.js';
import type { ChatResult } from './llm.js';

async function waitUntil(cond: () => Promise<boolean>, timeoutMs = 1500): Promise<void> {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > timeoutMs) throw new Error('waitUntil 超时');
    await new Promise((r) => setTimeout(r, 5));
  }
}

// ---- todo（FR-029：宿主 = session store 随会话持久化） ----

test('todo: CRUD + 随会话持久化（恢复后清单仍在）+ turns 保留', async () => {
  const backend = createMemoryStorage();
  const sessionStore = createSessionStore(backend);
  // 先有会话 turns
  await sessionStore.save({ id: 's-todo', createdAt: 1, updatedAt: 1, turns: turnsOf(2) });
  const ts = createTodoStore(sessionStore, 's-todo');
  const a = await ts.add('画节点 a');
  const b = await ts.add('连线 a→b');
  assert.equal(a.text, '画节点 a');
  // mark-done + update
  await ts.markDone(a.id, true);
  const updated = await ts.update(b.id, { text: '连线 a→b（加标签）' });
  assert.equal(updated?.text, '连线 a→b（加标签）');
  // list 顺序
  const todos = await ts.list();
  assert.equal(todos.length, 2);
  assert.equal(todos[0].done, true);
  // 会话记录 turns 保留（todo 不破坏会话数据）
  const rec = await sessionStore.load('s-todo');
  assert.equal(rec?.turns.length, 5); // init + 2*(assistant+tool)
  // 模拟刷新：同一 backend 新建 store → 恢复
  const fresh = createTodoStore(createSessionStore(backend), 's-todo');
  const restored = await fresh.list();
  assert.equal(restored.length, 2);
  assert.equal(restored.find((t) => t.id === a.id)?.done, true);
  // remove
  assert.equal(await fresh.remove(b.id), true);
  assert.equal((await fresh.list()).length, 1);
});

test('todo-tool: add/list/mark-done/update/remove 经执行器（ctx.sessionId）', async () => {
  const sessionStore = createSessionStore(createMemoryStorage());
  const deps = { store: sessionStore };
  const ctx = { sessionId: 'sess-x' };
  const add = await executeTodoTool(deps, 'add', { text: '任务 1' }, ctx);
  assert.equal(add.ok, true);
  assert.match(add.output, /已添加 todo/);
  const list = await executeTodoTool(deps, 'list', {}, ctx);
  assert.match(list.output, /任务 1/);
  const id = (await createTodoStore(sessionStore, 'sess-x').list())[0].id;
  await executeTodoTool(deps, 'mark-done', { id, done: 'true' }, ctx);
  assert.match((await executeTodoTool(deps, 'list', {}, ctx)).output, /\[x\]/);
  await executeTodoTool(deps, 'update', { id, text: '任务 1（改）' }, ctx);
  assert.match((await executeTodoTool(deps, 'list', {}, ctx)).output, /任务 1（改）/);
  const rm = await executeTodoTool(deps, 'remove', { id }, ctx);
  assert.equal(rm.ok, true);
  assert.match((await executeTodoTool(deps, 'list', {}, ctx)).output, /无 todo/);
  // 无会话上下文 → 友好错误
  const noCtx = await executeTodoTool(deps, 'add', { text: 'x' }, {});
  assert.equal(noCtx.ok, false);
  assert.match(noCtx.output, /当前会话 id/);
});

// ---- goal（FR-030：IDB origin 级；多标签共享读 + 冲突标记 EC-013） ----

test('goal: CRUD + 进度 + archive + 多实例共享读 + 冲突标记', async () => {
  const backend = createMemoryStorage();
  const gs = createGoalStore(backend);
  await gs.create({ id: 'g1', title: '完成流程图', description: '三节点' });
  const g = await gs.get('g1');
  assert.equal(g?.status, 'active');
  // 进度更新
  const up = await gs.update('g1', { progress: { done: 1, total: 3 } });
  assert.equal(up.ok, true);
  // 多标签共享读：第二个 store 实例见同一数据（同 backend）
  const gs2 = createGoalStore(backend);
  const seen = await gs2.get('g1');
  assert.equal(seen?.progress?.done, 1);
  // EC-013 冲突：以旧 rev 更新 → conflict
  const rev1 = (await backend.revOf('goal:g1')) ?? 0;
  await gs2.update('g1', { title: '由 B 改' }, { expectedRev: rev1 });
  const conflict = await gs.update('g1', { title: '由 A 改' }, { expectedRev: rev1 - 1 });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.conflict, true);
  assert.match(conflict.error ?? '', /写入冲突/);
  // archive + list 过滤
  assert.equal(await gs.archive('g1'), true);
  assert.deepEqual((await gs.list('active')).map((x) => x.id), []);
  assert.deepEqual((await gs.list('archived')).map((x) => x.id), ['g1']);
});

test('goal-tool: create/get/update/archive/list 经执行器', async () => {
  const store = createGoalStore(createMemoryStorage());
  const deps = { store };
  const c = await executeGoalTool(deps, 'create', { id: 'gx', title: '目标 X', total: '2' });
  assert.equal(c.ok, true);
  assert.match(c.output, /gx \[active\] 目标 X 进度 0\/2/);
  assert.match((await executeGoalTool(deps, 'update', { id: 'gx', done: '1', total: '2' })).output, /进度 1\/2/);
  assert.match((await executeGoalTool(deps, 'list', {})).output, /目标 X/);
  assert.match((await executeGoalTool(deps, 'list', { status: 'archived' })).output, /无匹配目标/);
  assert.equal((await executeGoalTool(deps, 'archive', { id: 'gx' })).ok, true);
  assert.match((await executeGoalTool(deps, 'list', { status: 'archived' })).output, /目标 X/);
  assert.equal((await executeGoalTool(deps, 'get', { id: 'nope' })).ok, false);
});


/** 延迟释放 runner（jobs 在途/取消/中断可控）。 */
function deferredJobDeps(jobStore: JobStore) {
  let release!: () => void;
  const gate = new Promise<void>((res) => {
    release = res;
  });
  const deps = { store: jobStore, runner: async () => { await gate; return 'done'; } };
  return { deps, release: () => release() };
}
// ---- jobs（FR-031/EC-008/EC-015：句柄 + interrupted + 即时返回） ----

test('jobs: submit→status/result/log/list + EC-015 即时返回', async () => {
  const jobStore = new JobStore(createMemoryStorage());
  const deps = { store: jobStore, runner: async (ctx: { log: (l: string) => Promise<void> }, payload: Record<string, string>) => {
    await ctx.log(`开始处理 ${payload.what ?? ''}`);
    return `结果:${payload.what ?? ''}`;
  } };
  const t0 = Date.now();
  const job = await submitJob(deps, { what: '导出' }, '导出任务');
  assert.ok(Date.now() - t0 < 50); // 即时返回（EC-015 不阻塞）
  await waitUntil(async () => (await jobStore.get(job.id))?.status === 'completed');
  const done = await jobStore.get(job.id);
  assert.equal(done?.status, 'completed');
  assert.equal(done?.result, '结果:导出');
  assert.ok(done?.logs.some((l) => l.includes('开始处理')));
  // status/result/log 查询经 executeJobsTool
  assert.match((await executeJobsTool(deps, 'status', { id: job.id })).output, /\[completed\]/);
  assert.equal((await executeJobsTool(deps, 'result', { id: job.id })).output, '结果:导出');
  assert.match((await executeJobsTool(deps, 'log', { id: job.id })).output, /开始处理/);
  // list
  assert.match((await executeJobsTool(deps, 'list', {})).output, /导出任务/);
  // jobs 条目 delayMs:0（EC-015）
  assert.equal(createJobsToolEntry(deps).delayMs, 0);
});

test('jobs: 页面卸载标记 interrupted → 可查/可重试（EC-008）', async () => {
  const jobStore = new JobStore(createMemoryStorage());
  const first = deferredJobDeps(jobStore);
  const job = await submitJob(first.deps, {});
  await waitUntil(async () => (await jobStore.get(job.id))?.status === 'running');
  // 模拟卸载：在途 → interrupted
  const n = await markJobsInterrupted(jobStore);
  assert.equal(n, 1);
  assert.equal((await jobStore.get(job.id))?.status, 'interrupted');
  // 释放 runner：终态不被覆盖（interrupted 保留）
  first.release();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await jobStore.get(job.id))?.status, 'interrupted');
  // 重试 → 新 job 正常运行（fresh deferred）
  const second = deferredJobDeps(jobStore);
  const r2 = await executeJobsTool(second.deps, 'retry', { id: job.id });
  assert.equal(r2.ok, true);
  const newId = /job [\w.-]+/.exec(r2.output)?.[0].slice(4) ?? '';
  assert.ok(newId);
  await waitUntil(async () => (await jobStore.get(newId))?.status === 'running');
  second.release();
  await waitUntil(async () => (await jobStore.get(newId))?.status === 'completed');
  assert.equal((await jobStore.get(newId))?.result, 'done');
});

test('jobs: cancel 在途任务 + submit 未注入 runner 报错', async () => {
  const jobStore = new JobStore(createMemoryStorage());
  const d = deferredJobDeps(jobStore);
  const job = await submitJob(d.deps, {});
  await waitUntil(async () => (await jobStore.get(job.id))?.status === 'running');
  const c = await executeJobsTool(d.deps, 'cancel', { id: job.id });
  assert.equal(c.ok, true);
  assert.equal((await jobStore.get(job.id))?.status, 'canceled');
  d.release();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await jobStore.get(job.id))?.status, 'canceled'); // 不被覆盖
  // 未注入 runner
  const noRunner = { store: new JobStore(createMemoryStorage()) };
  const failed = await executeJobsTool(noRunner, 'submit', { label: 'x' });
  assert.equal(failed.ok, false);
  assert.match(failed.output, /未注入任务执行体|runner not injected/);
});

// ---- subagent（FR-032/EC-009：嵌套 AgentRunner；白名单；失败不中断） ----

function fakeChatResult(content: string, toolCalls: ChatResult['toolCalls'] = []): ChatResult {
  return { content, toolCalls, model: 'fake' };
}

test('subagent: 嵌套 AgentRunner 子会话执行并回收结果', async () => {
  const router = createCommandRouter({ builtins: false });
  router.register({
    name: 'echo',
    schema: { name: 'echo', description: 'echo', parameters: {} },
    executor: async (t) => ({ ok: true, output: `echo:${t.args.msg ?? ''}` }),
  });
  const deps = {
    router,
    chat: async (turns: ChatTurn[], _system: string): Promise<ChatResult> => {
      // 首轮调用 echo；次轮收尾
      const hasTool = turns.some((t) => t.role === 'tool');
      return hasTool ? fakeChatResult('子任务完成') : fakeChatResult('', [{ id: 'c1', name: 'echo', subcommand: '', args: { msg: 'hi' }, rawArguments: '{}' }]);
    },
  };
  const r = await executeSubagent(deps, { prompt: '说 hi', tools: 'echo' }, {});
  assert.equal(r.ok, true, r.error);
  assert.match(r.output, /echo:hi/);
  assert.match(r.output, /子任务完成/);
});

test('subagent: 白名单裁剪 —— 越权工具被拦截且未执行（FR-032 AC）', async () => {
  let secretRan = 0;
  const router = createCommandRouter({ builtins: false });
  router.register({
    name: 'secret',
    schema: { name: 'secret', description: '', parameters: {} },
    executor: async () => {
      secretRan += 1;
      return { ok: true, output: 'secret-exec' };
    },
  });
  const deps = {
    router,
    chat: async (turns: ChatTurn[]): Promise<ChatResult> => {
      const hasTool = turns.some((t) => t.role === 'tool');
      return hasTool ? fakeChatResult('收尾') : fakeChatResult('', [{ id: 'c1', name: 'secret', subcommand: '', args: {}, rawArguments: '{}' }]);
    },
  };
  const r = await executeSubagent(deps, { prompt: 'do it', tools: 'echo' }, {});
  // secret 不在白名单 → dispatch 拒绝 → 失败聚合 → 子会话继续收尾（completed）
  assert.equal(r.ok, true);
  assert.match(r.output, /不在子会话白名单/);
  assert.equal(secretRan, 0); // 越权工具未被调用
});

test('subagent: 子会话 LLM 失败 → ok:false 主会话不中断（EC-009）', async () => {
  const router = createCommandRouter({ builtins: false });
  const deps = {
    router,
    chat: async (): Promise<ChatResult> => {
      throw new Error('fake llm down');
    },
  };
  const r = await executeSubagent(deps, { prompt: '跑不动' }, {});
  assert.equal(r.ok, false);
  assert.match(r.output, /子会话 LLM 调用失败/);
  assert.ok(r.error);
});
