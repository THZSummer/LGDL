import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPageEvalToolEntry, executePageEval, pageEvalHelp, summarizeCode, PAGE_EVAL_DEFAULTS } from './page-eval.js';
import type { PlatformDomOps, PlatformEnv, PlatformEvaluateOptions } from './platform.js';
import { nodeEnv } from './platform.js';
import { createMemoryAudit } from './audit.js';
import type { AuditSink } from './audit.js';
import { createCommandRouter } from './router.js';
import type { ToolContext, ToolResult } from './router.js';
import type { WebCliToolCall } from './llm.js';

/** 记录型 evaluate 间谍桩（page-eval 只触碰 ops.evaluate）。 */
function evalOps(impl?: (code: string, opts?: PlatformEvaluateOptions) => Promise<{ ok: boolean; output: string; error?: string }>) {
  const calls: Array<{ code: string; opts?: PlatformEvaluateOptions }> = [];
  const ops = {
    evaluate: async (code: string, opts?: PlatformEvaluateOptions) => {
      calls.push({ code, opts });
      if (impl) return impl(code, opts);
      return { ok: true, output: JSON.stringify({ title: 'demo', ok: true }) };
    },
  } as unknown as PlatformDomOps;
  return { ops, calls };
}

/** 带审计的 ctx（services.audit 注入；与场景组装点一致）。 */
function auditCtx(audit: AuditSink): ToolContext {
  return { services: { audit } };
}

/** env 构造：nodeEnv + dom.ops.evaluate 注入。 */
function evalEnv(ops: PlatformDomOps): PlatformEnv {
  return {
    ...nodeEnv(),
    dom: { ops, state: { snapshot: async () => ({ injected: true }) } },
  };
}

function tc(name: string, args: Record<string, string> = {}, subcommand = ''): WebCliToolCall {
  return { id: 'call-1', name, subcommand, args, rawArguments: JSON.stringify(args) };
}

function run(entry: ReturnType<typeof createPageEvalToolEntry>, args: Record<string, string>, ctx: ToolContext = {}): Promise<ToolResult> {
  return Promise.resolve(entry.executor({ subcommand: '', args }, ctx));
}

// ================= 基础形态 / 元数据 =================

test('page-eval: entry.risk=evaluate（最高档）— 无 subcommandRisks 单动词工具 + 元数据', async () => {
  const { ops } = evalOps();
  const entry = createPageEvalToolEntry(evalEnv(ops));
  assert.equal(entry.name, 'page-eval');
  assert.equal(entry.risk, 'evaluate');
  assert.equal(entry.subcommandRisks, undefined); // 单动词场景：risk 即子命令级
  assert.equal(entry.group, 'exec');
  // 注册后派生 schema/help/dispatch 三链一致
  const router = createCommandRouter({ builtins: false });
  router.register(entry);
  assert.deepEqual(router.deriveTools().map((t) => t.name), ['page-eval']);
  assert.ok(router.helpFor('page-eval')?.includes('宿主页同源 evaluate'));
});

// ================= 门禁：executor 层 untrusted 双闸（EC-003/FR-008） =================

test('page-eval: untrusted 拒执行 — 无 --trusted true → 可读错误 + ops.evaluate 未被调用（间谍）', async () => {
  const { ops, calls } = evalOps();
  const audit = createMemoryAudit();
  const r = await executePageEval(ops, { code: 'document.querySelector("h1").textContent' }, auditCtx(audit));
  assert.equal(r.ok, false);
  assert.match(r.output, /拒绝执行/);
  assert.match(r.output, /untrusted/);
  assert.match(r.output, /--trusted true/); // trusted 声明路径说明（不静默降级/截断执行）
  assert.equal(r.error, 'untrusted code rejected');
  assert.equal(calls.length, 0); // 间谍断言：拒执行时 ops.evaluate 未被调用
  // 审计：untrusted 裁决 + 代码摘要（NFR-008/EC-003 入审计）
  const ev = audit.events.find((e) => e.type === 'tool-call' && e.tool === 'page-eval');
  assert.ok(ev, 'untrusted 拒执行应入审计');
  assert.match(ev.detail ?? '', /decision=untrusted-reject/);
  assert.match(ev.detail ?? '', /document\.querySelector\("h1"\)/); // 含代码摘要
  assert.equal(ev.ok, false);
});

// ================= 执行：trusted + 预算转发 + 结果回传 =================

test('page-eval: trusted 执行 — ops.evaluate 被调 + 缺省预算透传 + 序列化结果回传', async () => {
  const { ops, calls } = evalOps();
  const audit = createMemoryAudit();
  const r = await executePageEval(
    ops,
    { code: '({ title: document.title, items: 3 })', trusted: 'true' },
    auditCtx(audit),
  );
  assert.equal(r.ok, true);
  assert.equal(calls.length, 1);
  // 预算缺省透传（as=expression 缺省 + codeMax 不越界 + timeoutMs/maxLength 缺省）
  assert.equal(calls[0].code, '({ title: document.title, items: 3 })');
  assert.equal(calls[0].opts?.as, 'expression');
  assert.equal(calls[0].opts?.timeoutMs, PAGE_EVAL_DEFAULTS.timeoutMs);
  assert.equal(calls[0].opts?.maxLength, PAGE_EVAL_DEFAULTS.maxLength);
  assert.ok(JSON.parse(r.output).ok === true); // JSON 可解析回传
  // 审计：run 裁决 + 结果摘要
  const ev = audit.events.find((e) => e.type === 'tool-call' && e.tool === 'page-eval');
  assert.ok(ev);
  assert.match(ev.detail ?? '', /decision=run/);
  assert.match(ev.detail ?? '', /resultChars=/);
  assert.equal(ev.ok, true);
});

test('page-eval: as=script + 显式预算参数转发 + 结果截断标记透传（EC-010）', async () => {
  const { ops, calls } = evalOps(async () => ({ ok: true, output: '执行完成（结果过长已截断…）' }));
  const r = await executePageEval(
    ops,
    { code: 'window.__marker = 1', trusted: 'true', as: 'script', timeoutMs: '3000', maxLength: '500', codeMax: '2000' },
  );
  assert.equal(r.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts?.as, 'script');
  assert.equal(calls[0].opts?.timeoutMs, 3000);
  assert.equal(calls[0].opts?.maxLength, 500);
  // ops 输出的截断标记原样透传（预算截断实现归 ops 面，executor 只回传）
  assert.match(r.output, /截断/);
});

// ================= 边界：异常 / 超时 / 未注入 / 预算 / 缺参 =================

test('page-eval: 运行时异常/超时 → ops ok:false 透传可读错误 + 页面存活语义（EC-004）', async () => {
  // ops 返回 ok:false（实现面已捕获运行时异常/异步超时中止 → 可读错误 + 页面存活）
  const { ops } = evalOps(async () => ({ ok: false, output: '✖ 执行异常：ReferenceError: foo is not defined（页面存活）', error: 'eval runtime error' }));
  const r = await executePageEval(ops, { code: 'foo.bar()', trusted: 'true' });
  assert.equal(r.ok, false);
  assert.match(r.output, /执行异常|页面存活/);
  assert.equal(r.error, 'eval runtime error');
  // 异步超时形态：ops 超时中止返回可读错误（不 hang）
  const { ops: ops2 } = evalOps(async () => ({ ok: false, output: '✖ 异步执行超时（已中止，页面存活）', error: 'eval timeout' }));
  const t = await executePageEval(ops2, { code: 'new Promise(()=>{})', trusted: 'true', timeoutMs: '100' });
  assert.equal(t.ok, false);
  assert.match(t.output, /超时/);
});

test('page-eval: ops 抛授权/能力异常 → 统一转译可读错误（EC-008），审计含 capability-error', async () => {
  const { ops } = evalOps(async () => {
    const e = new Error('CSP unsafe-eval 缺失');
    e.name = 'SecurityError';
    throw e;
  });
  const audit = createMemoryAudit();
  const r = await executePageEval(ops, { code: '1+1', trusted: 'true' }, auditCtx(audit));
  assert.equal(r.ok, false);
  assert.match(r.output, /不可用|安全上下文|unsafe-eval|安全/);
  const ev = audit.events.find((e) => e.type === 'tool-call' && e.tool === 'page-eval');
  assert.ok(ev);
  assert.match(ev.detail ?? '', /decision=capability-error/);
});

test('page-eval: 执行面未注入（ops 缺省/无 evaluate）→ 可读错误（FR-002 未注入语义）', async () => {
  const r1 = await executePageEval(undefined, { code: '1+1', trusted: 'true' });
  assert.equal(r1.ok, false);
  assert.match(r1.output, /执行面未注入|未注入/);
  // env.dom.ops 存在但 evaluate 方法未预置（nodeEnv/TASK-003 additive 缺省 undefined）
  const bare = createPageEvalToolEntry({ ...nodeEnv(), dom: undefined });
  const r2 = await run(bare, { code: '1+1', trusted: 'true' });
  assert.equal(r2.ok, false);
  assert.match(r2.output, /未注入/);
});

test('page-eval: 代码超预算 → 拒执行（不截断半段代码）+ 缺 code / 非法 as → 可读错误', async () => {
  const { ops, calls } = evalOps();
  const audit = createMemoryAudit();
  const longCode = 'x'.repeat(PAGE_EVAL_DEFAULTS.codeMax + 1);
  const over = await executePageEval(ops, { code: longCode, trusted: 'true' }, auditCtx(audit));
  assert.equal(over.ok, false);
  assert.match(over.output, /代码超预算/);
  assert.equal(calls.length, 0); // 预算拒：不执行
  const ev = audit.events.find((e) => e.type === 'tool-call' && e.tool === 'page-eval');
  assert.ok(ev);
  assert.match(ev.detail ?? '', /decision=budget-reject/);
  // 缺 code
  const noCode = await executePageEval(ops, { trusted: 'true' });
  assert.equal(noCode.ok, false);
  assert.match(noCode.output, /--code/);
  assert.equal(calls.length, 0);
  // as 非法值 → 显式报错（不静默降级为 expression）
  const badAs = await executePageEval(ops, { code: '1+1', trusted: 'true', as: 'function' });
  assert.equal(badAs.ok, false);
  assert.match(badAs.output, /expression\|script/);
  assert.equal(calls.length, 0);
});

// ================= 摘要工具 =================

test('page-eval: summarizeCode 压平空白 + 预算截断标记（审计不回显整段代码）', () => {
  assert.equal(summarizeCode('a\n  b\t c'), 'a b c');
  const s = summarizeCode('y'.repeat(500), 120);
  assert.ok(s.length > 120 && s.length < 160); // 预算内摘要 + 截断说明（不回显整段）
  assert.match(s, /截断/);
  assert.match(s, /500/);
});

// ================= 门禁端到端（router dispatch，AC-007） =================

test('page-eval: dispatch 门禁端到端 — 无策略 fail-closed deny / 缺省 deny / 显式 allow 放行', async () => {
  // ① 无 policyGate → fail-closed deny（执行器不被调用；router.ts TASK-001 已实现）
  const { ops, calls } = evalOps();
  const bare = createCommandRouter({ builtins: false });
  bare.register(createPageEvalToolEntry(evalEnv(ops)));
  const d1 = await bare.dispatch(tc('page-eval', { code: '1+1', trusted: 'true' }));
  assert.equal(d1.ok, false);
  assert.match(d1.output, /evaluate 风险档调用被拒绝|门禁装配/);
  assert.equal(d1.error, 'permission denied (evaluate fail-closed)');
  assert.equal(calls.length, 0); // 间谍断言：deny 时执行器(ops.evaluate)未被调用
  // ② policyGate 已装配但无 evaluate 规则 → 缺省 deny（defaultActionForRisk(evaluate)=deny）
  const { ops: ops2, calls: calls2 } = evalOps();
  const gated = createCommandRouter({ builtins: false, policy: { rules: [{ risk: 'read', action: 'allow' }] } });
  gated.register(createPageEvalToolEntry(evalEnv(ops2)));
  const d2 = await gated.dispatch(tc('page-eval', { code: '1+1', trusted: 'true' }));
  assert.equal(d2.ok, false);
  assert.match(d2.output, /命中缺省 deny 取向/);
  assert.equal(calls2.length, 0);
  // ③ 显式 evaluate allow 规则 → 门禁放行执行（trusted 声明后 executor 调 ops.evaluate）
  const { ops: ops3, calls: calls3 } = evalOps(async () => ({ ok: true, output: '✓ 2' }));
  const open = createCommandRouter({ builtins: false, policy: { rules: [{ risk: 'evaluate', action: 'allow' }] } });
  open.register(createPageEvalToolEntry(evalEnv(ops3)));
  const d3 = await open.dispatch(tc('page-eval', { code: '1+1', trusted: 'true' }));
  assert.equal(d3.ok, true);
  assert.equal(calls3.length, 1);
  // ④ 门禁放行但 untrusted（无 --trusted true）→ executor 双闸拒执行（FR-008 ③）
  const { ops: ops4, calls: calls4 } = evalOps();
  const d4 = await open.dispatch(tc('page-eval', { code: '1+1' }));
  assert.equal(d4.ok, false);
  assert.match(d4.output, /拒绝执行/);
  assert.equal(calls4.length, 0);
  // permission 审计含 evaluate 档裁决（决策来源 rule/default/fail-closed）
  const audit = createMemoryAudit();
  const audited = createCommandRouter({ builtins: false, audit, policy: { rules: [{ risk: 'evaluate', action: 'allow' }] } });
  audited.register(createPageEvalToolEntry(evalEnv(evalOps().ops)));
  await audited.dispatch(tc('page-eval', { code: '1', trusted: 'true' }));
  const perm = audit.events.find((e) => e.type === 'permission');
  assert.ok(perm && perm.decision === 'allow');
});

// ================= 帮助面公开（P-01 / CSP / NG-010） =================

test('page-eval: 帮助面工程公开 — P-01 死循环不可中断 / CSP unsafe-eval / 与 eval-js 语义区分（NG-010）', () => {
  const help = pageEvalHelp();
  assert.match(help, /死循环/);
  assert.match(help, /无法中断|不可中断/);
  assert.match(help, /不承诺假中断|不承诺/);
  assert.match(help, /unsafe-eval|CSP/);
  assert.match(help, /worker 沙箱/);
  assert.match(help, /eval-js/);
  assert.match(help, /untrusted|--trusted true/);
  assert.match(help, /同源|SOP/);
  assert.match(help, /F12 console/);
});
