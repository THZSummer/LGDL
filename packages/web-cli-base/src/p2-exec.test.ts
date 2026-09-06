import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExecRemoteToolEntry, executeExecRemote, execRemoteHelp } from './exec-remote.js';
import type { RemoteExecBridge } from './exec-remote.js';
import { WorkerSession, createWorkerSessionToolEntry, workerSessionHelp } from './worker-session.js';
import type { PlatformEnv, PlatformWorkerFactory, PlatformWorkerHandle } from './platform.js';
import { nodeEnv } from './platform.js';
import { createCommandRouter } from './router.js';
import type { WebCliToolCall } from './llm.js';

/** D-005 记录：TASK-014 exec-remote/worker-session 单测平铺本文件（base 通配自动纳入）。 */

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

// ================= exec-remote（FR-027/NG-004：代理桥预留契约） =================

test('exec-remote: 桥注入 → 命令转发 + 结果回填；argsJson 解析', async () => {
  const calls: Array<{ command: string; args: Record<string, string> }> = [];
  const bridge: RemoteExecBridge = async (req) => {
    calls.push(req);
    return { ok: true, output: `ran:${req.command}` };
  };
  const env: PlatformEnv = { ...nodeEnv(), remoteExec: bridge };
  const entry = createExecRemoteToolEntry(env);
  const r = await entry.executor({ subcommand: '', args: { command: 'ls -la', argsJson: '{"dir":"/tmp"}' } }, {});
  assert.equal(r.ok, true, r.error);
  assert.equal(r.output, 'ran:ls -la');
  assert.equal(r.trust?.level, 'untrusted'); // FR-010：远程执行结果为外部来源（IMP-5）
  assert.deepEqual(calls[0], { command: 'ls -la', args: { dir: '/tmp' } });
});

test('exec-remote: 未配置 → 禁用态 + 指引（NG-004/EC-006）；缺参/argsJson 非法', async () => {
  const bare = createExecRemoteToolEntry(nodeEnv()); // 无 remoteExec
  const r = await bare.executor({ subcommand: '', args: { command: 'ls' } }, {});
  assert.equal(r.ok, false);
  assert.match(r.output, /未配置/);
  assert.match(r.output, /代理 OS 能力|非本框架实现/);
  const env: PlatformEnv = { ...nodeEnv(), remoteExec: async () => ({ ok: true, output: 'x' }) };
  const entry = createExecRemoteToolEntry(env);
  assert.match((await entry.executor({ subcommand: '', args: {} }, {})).output, /--command/);
  const bad = await entry.executor({ subcommand: '', args: { command: 'x', argsJson: 'not-json' } }, {});
  assert.equal(bad.ok, false);
  assert.match(bad.output, /argsJson/);
  // help 显式声明代理声明（NG-004）
  assert.match(execRemoteHelp(), /代理「OS 能力」|代理 OS 能力/);
  assert.match(execRemoteHelp(), /非本框架实现/);
});

// ================= worker-session（FR-028/EC-009：状态跨调用 + 崩溃重建） =================

/** 带状态 & 崩溃注入的 fake worker 工厂。 */
function statefulWorkerFactory(opts: { crashOn?: string } = {}) {
  const factory: PlatformWorkerFactory = {
    create: <I, O>() => {
      // 状态在「每个 worker 会话」闭包内（跨调用存活；重建 = 新会话归零）
      let state = 0;
      const handle: PlatformWorkerHandle<I, O> = {
        post: (input) => {
          const code = (input as { code: string }).code;
          if (opts.crashOn && code.includes(opts.crashOn)) {
            setTimeout(() => handle.onerror?.({ message: 'simulated worker crash' }), 0);
            return;
          }
          // 状态在 worker 侧闭包（同一会话跨调用存活）
          state += 1;
          setTimeout(() => {
            const reply = { id: (input as { id: string }).id, ok: true, result: code.includes('read-state') ? `state=${state}` : `run#${state}` };
            handle.onmessage?.({ data: reply } as { data: O });
          }, 0);
        },
        onmessage: null,
        onerror: null,
        terminate: () => {},
      };
      return handle;
    },
  };
  return { factory };
}

test('worker-session: 状态跨调用存活（同一会话计数）', async () => {
  const session = new WorkerSession(statefulWorkerFactory().factory);
  const r1 = await session.exec('x');
  assert.equal(r1.ok, true);
  assert.equal(r1.result, 'run#1');
  const r2 = await session.exec('x');
  assert.equal(r2.result, 'run#2');
  const r3 = await session.exec('read-state');
  assert.equal(r3.result, 'state=3'); // 跨调用状态保持
});

test('worker-session: 崩溃 → ok:false + 下一条自动重建（EC-009 主会话不中断）', async () => {
  const session = new WorkerSession(statefulWorkerFactory({ crashOn: 'boom' }).factory);
  const crash = await session.exec('boom');
  assert.equal(crash.ok, false);
  assert.match(crash.error ?? '', /worker 崩溃/);
  const next = await session.exec('ok');
  assert.equal(next.ok, true, next.error);
  assert.equal(next.result, 'run#1'); // 重建后新会话状态归零计数
});

test('worker-session: 工具 exec/reset/status 子命令 + help 无 PTY 声明（NG-005）', async () => {
  const router = createCommandRouter({ builtins: false });
  const entry = createWorkerSessionToolEntry({ factory: statefulWorkerFactory().factory });
  router.register(entry);
  const e1 = await router.dispatch(tc('worker-session', { code: 'a' }, 'exec'));
  assert.equal(e1.ok, true, e1.error);
  assert.equal(e1.output, 'run#1');
  const st = await router.dispatch(tc('worker-session', {}, 'status'));
  assert.match(st.output, /存活/);
  const rs = await router.dispatch(tc('worker-session', {}, 'reset'));
  assert.match(rs.output, /已重建/);
  const e2 = await router.dispatch(tc('worker-session', { code: 'b' }, 'exec'));
  assert.equal(e2.output, 'run#1'); // reset 后计数重置
  assert.match(workerSessionHelp(), /无 PTY|PTY\/ANSI|无终端/);
});
