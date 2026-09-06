import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvalJsToolEntry, executeEvalJs, createFnEvalExecutor, createWorkerEvalExecutor, createWorkerWasmExecutor, executeEvalWasm, createEvalWasmToolEntry } from './eval-tools.js';
import type { EvalExecutor, EvalRequest, EvalResponse } from './eval-tools.js';
import type { PlatformWorkerFactory, PlatformWorkerHandle } from './platform.js';
import { createCommandRouter } from './router.js';
import { createMemoryAudit } from './audit.js';
import type { WebCliToolCall } from './llm.js';
import { parseSkillMd, createSkillPrompt, installSkill, fetchRemoteSkill } from './skill-loader.js';

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

// ================= eval-tools（js 面） =================

test('eval-js: 注入执行器纯计算正确（trusted 放行）', async () => {
  const executor: EvalExecutor = async (code) => {
    // 假 worker 端：纯 Function 求值（测试用；真实端为 worker 会话）
    if (code.includes('document') || code.includes('fetch(')) {
      return { ok: false, error: 'side-effect blocked', blocked: 'DOM/网络访问被 worker 会话拦截' };
    }
    const value = new Function(`"use strict"; return (${code});`)();
    return { ok: true, result: String(value) };
  };
  const r = await executeEvalJs(executor, { code: '2 ** 10', trusted: true });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.output, '1024');
  const str = await executeEvalJs(executor, { code: '"ab" + "cd"', trusted: true });
  assert.equal(str.output, 'abcd');
});

test('eval-js: 副作用尝试默认拦截（DOM/网络间谍）+ untrusted 默认拒执行（EC-007）', async () => {
  let domTouched = 0;
  const executor: EvalExecutor = async (code) => {
    if (/document\.|fetch\(|localStorage/.test(code)) {
      domTouched += 1;
      return { ok: false, error: 'blocked', blocked: 'DOM/网络/存储访问被 worker 会话拦截' };
    }
    return { ok: true, result: 'ok' };
  };
  const blocked = await executeEvalJs(executor, { code: 'document.title = "x"', trusted: true });
  assert.equal(blocked.ok, false);
  assert.match(blocked.output, /副作用尝试被拦截/);
  assert.equal(domTouched, 1);
  // untrusted：未声明 trusted → 拒执行（执行器不被触碰）
  let executed = 0;
  const spyExec: EvalExecutor = async () => {
    executed += 1;
    return { ok: true, result: 'x' };
  };
  const untrusted = await executeEvalJs(spyExec, { code: '1+1' });
  assert.equal(untrusted.ok, false);
  assert.match(untrusted.output, /untrusted/);
  assert.equal(executed, 0);
  // 缺 code
  const noCode = await executeEvalJs(spyExec, { code: '' });
  assert.equal(noCode.ok, false);
  assert.match(noCode.output, /--code/);
});

test('eval-js: createWorkerEvalExecutor 双端消息协议（worker 桩执行 + 超时中断）', async () => {
  const pairs: Array<PlatformWorkerHandle<EvalRequest, EvalResponse>> = [];
  const workerStub = (handler: (code: string, trusted: boolean) => Promise<{ ok: boolean; result?: string; error?: string }>): PlatformWorkerHandle<EvalRequest, EvalResponse> => {
    const handle: PlatformWorkerHandle<EvalRequest, EvalResponse> = {
      post: (input) => {
        void (async () => {
          const out = await handler(input.code, input.trusted);
          handle.onmessage?.({ data: { id: input.id, ok: out.ok, result: out.result, error: out.error } });
        })();
      },
      onmessage: null,
      onerror: null,
      terminate: () => {},
    };
    return handle;
  };
  const factory: PlatformWorkerFactory = {
    create: <I, O>() => {
      const h = workerStub(async (code) => {
        if (code.includes('fetch(')) return { ok: false, error: 'blocked' };
        return { ok: true, result: `worker-eval:${code.length}` };
      });
      pairs.push(h);
      return h as unknown as PlatformWorkerHandle<I, O>;
    },
  };
  const executor = createWorkerEvalExecutor(factory);
  const r = await executor('1+1', { trusted: true });
  assert.equal(r.ok, true);
  assert.equal(r.result, 'worker-eval:3');
});

test('eval-js: ToolEntry 注册 + 元数据 + help 边界声明（worker 非 OS 沙箱 / CSP worker-src）', async () => {
  const executor: EvalExecutor = async (code) => ({ ok: true, result: `=${code}` });
  const router = createCommandRouter({ builtins: false });
  router.register(createEvalJsToolEntry(factoryFromExecutor(executor)));
  const r = await router.dispatch(tc('eval-js', { code: '1', trusted: 'true' }));
  assert.equal(r.ok, true);
  assert.equal(r.output, '=1');
  const entry = router.query({ name: 'eval-js' })[0];
  assert.equal(entry.group, 'exec');
  assert.equal(entry.risk, 'write');
  const help = evalJsHelp();
  assert.match(help, /非 OS 沙箱/);
  assert.match(help, /worker-src/);
});

// ================= skill-loader =================

const DEMO_SKILL_MD = `---
name: demo-helper
description: 演示技能：帮助做节点统计
allowed-tools:
  - skill.sum
  - skill.list-nodes
---

1. 收到统计任务时用白名单工具执行
2. 汇报简洁结果
`;

test('skill-loader: 解析 SKILL.md frontmatter + 正文提示注入', () => {
  const skill = parseSkillMd(DEMO_SKILL_MD);
  assert.ok(skill);
  assert.equal(skill?.name, 'demo-helper');
  assert.match(skill?.description ?? '', /演示技能/);
  assert.deepEqual(skill?.allowedTools, ['skill.sum', 'skill.list-nodes']);
  assert.match(skill?.body ?? '', /白名单工具/);
  const prompt = createSkillPrompt(skill!);
  assert.match(prompt, /\[Skill:demo-helper\]/);
  assert.match(prompt, /白名单：skill\.sum, skill\.list-nodes/);
  // 非法 md → null
  assert.equal(parseSkillMd('no frontmatter'), null);
});

test('skill-loader: 经 router 注册 skill:* 命名空间（FR-038 审计）；越权注册被拒（FR-008/AC-012）', () => {
  const audit = createMemoryAudit();
  const router = createCommandRouter({ builtins: false, audit });
  const skill = parseSkillMd(DEMO_SKILL_MD)!;
  const sumEntry = {
    name: 'sum',
    summary: '求和',
    schema: { name: 'sum', description: 'Sum numbers.', parameters: {} },
    executor: async () => ({ ok: true, output: '3' }),
  } satisfies import('./router.js').ToolEntry;
  installSkill(router, skill, {
    source: 'skill:demo-helper',
    registerTools: [sumEntry],
  });
  // skill.sum 注册成功：全限定名派生 + schema/派发三链
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['skill.sum']);
  assert.ok(router.has('skill.sum'));
  assert.match(router.listHelp(), /skill\.sum/);
  // 注册审计（FR-038）
  const reg = audit.events.find((e) => e.type === 'extension-register');
  assert.ok(reg && reg.source === 'skill:demo-helper');
  assert.equal(reg.namespace, 'skill');
  assert.equal(reg.name, 'skill.sum');
  // 越权工具注册被拒（不在 allowed-tools）
  const evilEntry: import('./router.js').ToolEntry = {
    name: 'delete-all',
    schema: { name: 'delete-all', description: '', parameters: {} },
    executor: async () => ({ ok: true, output: 'x' }),
  };
  assert.throws(() => installSkill(router, skill, { source: 'skill:demo-helper', registerTools: [evilEntry] }), /不在其 allowed-tools/);
  assert.equal(router.has('skill.delete-all'), false);
});

test('skill-loader: fetchRemoteSkill 运行时接口（CSP connect-src 约束文档化于注释）', async () => {
  const skill = await fetchRemoteSkill('https://example.com/SKILL.md', {
    fetchImpl: async () => new Response(DEMO_SKILL_MD, { status: 200 }),
  });
  assert.equal(skill?.name, 'demo-helper');
  await assert.rejects(() => fetchRemoteSkill('https://e.com/x', { fetchImpl: async () => new Response('no', { status: 404 }) }), /HTTP 404/);
});

function factoryFromExecutor(exec: EvalExecutor): PlatformWorkerFactory {
  return {
    create: <I, O>() => {
      const handle: PlatformWorkerHandle<EvalRequest, EvalResponse> = {
        post: (input) => {
          void exec(input.code, { trusted: input.trusted }).then((out) => {
            handle.onmessage?.({ data: { id: input.id, ok: out.ok, result: out.result, error: out.error } });
          });
        },
        onmessage: null,
        onerror: null,
        terminate: () => {},
      };
      return handle as unknown as PlatformWorkerHandle<I, O>;
    },
  };
}

import { evalJsHelp } from './eval-tools.js';
// ================= P2 wasm 面（eval-wasm；worker 内实例化不阻塞 UI） =================

function wasmWorkerFactory(exec: (req: { bytes: string; fn?: string; argsJson?: string }) => Promise<{ ok: boolean; result?: string; error?: string }>) {
  return {
    create: <I, O>() => {
      const handle: PlatformWorkerHandle = {
        post: (input) => {
          const req = input as import('./eval-tools.js').EvalRequest;
          void exec({ bytes: req.code, fn: req.function, argsJson: req.argsJson }).then((out) => {
            handle.onmessage?.({ data: { id: req.id, ok: out.ok, result: out.result, error: out.error } });
          });
        },
        onmessage: null,
        onerror: null,
        terminate: () => {},
      };
      return handle as never;
    },
  } as PlatformWorkerFactory;
}

test('eval-wasm: worker 内实例化调用（fake worker 双端）→ 结果返回/失败可读', async () => {
  const exec = async (req: { bytes: string; fn?: string }) => {
    if (req.bytes === '!bad') return { ok: false, error: 'WebAssembly.instantiate 失败：magic header 不合法' };
    return { ok: true, result: `wasm:${req.fn ?? 'exports'}:${req.bytes.length}` };
  };
  const executor = createWorkerWasmExecutor(wasmWorkerFactory(exec));
  const ok = await executeEvalWasm(executor, { bytes: 'AGFzbQ', fn: 'add', argsJson: '[1,2]', trusted: true });
  assert.equal(ok.ok, true, ok.error);
  assert.match(ok.output, /wasm:add:/);
  const noBytes = await executeEvalWasm(executor, {});
  assert.equal(noBytes.ok, false);
  assert.match(noBytes.output, /--bytes/);
  const bad = await executeEvalWasm(executor, { bytes: '!bad', trusted: true });
  assert.equal(bad.ok, false);
  assert.match(bad.output, /instantiate 失败|实例化失败/);
});

test('eval-wasm: untrusted 默认拒执行（EC-007/FR-010，与 eval-js 同语义）', async () => {
  let touched = false;
  const executor = createWorkerWasmExecutor(
    wasmWorkerFactory(async () => {
      touched = true;
      return { ok: true, result: 'should-not-run' };
    }),
  );
  const r = await executeEvalWasm(executor, { bytes: 'AGFzbQ' }); // 未声明 trusted
  assert.equal(r.ok, false);
  assert.match(r.output, /untrusted/);
  assert.equal(touched, false); // 执行器未被触碰（闸门在工具层短路）
});

test('eval-wasm: createEvalWasmToolEntry 注册 + 派发（工具面全链）', async () => {
  const exec = async (req: { bytes: string; fn?: string }) => ({ ok: true, result: `ok:${req.fn ?? ''}` });
  const router = createCommandRouter({ builtins: false });
  router.register(createEvalWasmToolEntry(wasmWorkerFactory(exec)));
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['eval-wasm']);
  const r = await router.dispatch(tc('eval-wasm', { bytes: 'AGFzbQ', fn: 'sum', argsJson: '[1,2]', trusted: 'true' }));
  assert.equal(r.ok, true, r.error);
  assert.equal(r.output, 'ok:sum');
  const untrusted = await router.dispatch(tc('eval-wasm', { bytes: 'AGFzbQ', fn: 'sum' }));
  assert.equal(untrusted.ok, false);
  assert.match(untrusted.output, /untrusted/);
  const e = router.query({ name: 'eval-wasm' })[0];
  assert.equal(e.group, 'exec');
  assert.equal(e.risk, 'write');
});
