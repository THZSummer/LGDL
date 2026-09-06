/**
 * eval-tools.ts —— eval-js（FR-026/EC-007，页内沙箱计算 js 面；P2 扩展 wasm 面）。
 *
 * 生态位（discovery §3.3 B 组 ◐ / §3.4 EXE 域）：shell 生态位 → **页内 JS 计算**
 * （浏览器「进程」替代位）；非 shell、无文件系统/OS 面（NG-001）；副作用受 PRM
 * 门禁与 untrusted 约束。执行器经 PlatformEnv.workerFactory 注入：worker 天然无
 * DOM/UI 面（可中断、主线程不卡）；本文件定义「worker 会话协议」——post
 * {id, code, trusted} → 回复 {id, ok, result|error, blocked}。
 *
 * untrusted 拒执行（EC-007/FR-010）：eval 输入默认视为 untrusted 来源代码，
 * 除非显式 --trusted true（策略/调用方声明可信）→ 默认拒执行。
 *
 * 边界声明（help）：worker 非 OS 沙箱（无 seccomp/VM 语义，NG-001）；CSP worker-src
 * 约束记录（worker 代码需过 worker-src/script-src）；真实 worker 会话由场景经
 * PlatformEnv.workerFactory 提供（node 面注入双端消息桩测试）。
 *
 * 本文件零 LGDL/react import（NFR-001）。
 */
import type { PlatformWorkerFactory, PlatformWorkerHandle } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';

/** worker 会话协议消息。 */
export interface EvalRequest {
  id: string;
  code: string;
  trusted: boolean;
  /** P2 wasm 面：kind='wasm' 时 code 视为 base64 wasm 二进制。 */
  kind?: 'js' | 'wasm';
  /** wasm：调用导出函数名（缺省 = 仅实例化，报告 exports）。 */
  function?: string;
  /** wasm：调用参数 JSON（函数名给出时）。 */
  argsJson?: string;
}
export interface EvalResponse {
  id: string;
  ok: boolean;
  result?: string;
  error?: string;
  /** 副作用尝试被 worker 端拦截（DOM/网络/存储访问）。 */
  blocked?: string;
}

export interface EvalOutcome {
  ok: boolean;
  result?: string;
  error?: string;
  blocked?: string;
}

/** 执行器：worker 会话（场景注入可运行的 worker；node 测试注入消息桩）。 */
export type EvalExecutor = (code: string, opts: { trusted: boolean }) => Promise<EvalOutcome>;

/** wasm 执行器（P2：base64 二进制在 worker 内实例化，不阻塞 UI）。 */
export type WasmExecutor = (
  bytesBase64: string,
  opts: { function?: string; argsJson?: string; trusted?: boolean },
) => Promise<EvalOutcome>;

function resolveWorkerOutcome(resp: EvalResponse | undefined): EvalOutcome {
  if (!resp || resp.ok === undefined) return { ok: false, error: 'worker 返回非法协议消息' };
  if (resp.blocked) return { ok: false, error: resp.blocked, blocked: resp.blocked };
  return resp.ok ? { ok: true, result: resp.result ?? '' } : { ok: false, error: resp.error ?? 'eval 执行失败' };
}

/**
 * 基于 PlatformWorkerHandle 的通用执行器：post 请求并等待应答（带超时/中断）。
 * 会话 worker 须实现 EvalRequest/EvalResponse 协议（场景提供 blob worker 代码；
 * CSP worker-src 约束记录于 help）。
 */
export function createWorkerEvalExecutor(factory: PlatformWorkerFactory, opts: { timeoutMs?: number } = {}): EvalExecutor {
  const timeoutMs = opts.timeoutMs ?? 15000;
  return async (code, { trusted }) => {
    const worker = factory.create<EvalRequest, EvalResponse>();
    const outcome = await new Promise<EvalOutcome>((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate();
        resolve({ ok: false, error: 'eval 执行超时（已中断 worker）' });
      }, timeoutMs);
      worker.onmessage = (ev) => {
        clearTimeout(timer);
        resolve(resolveWorkerOutcome(ev.data));
      };
      worker.onerror = (ev) => {
        clearTimeout(timer);
        resolve({ ok: false, error: `worker 异常：${String((ev as { message?: string })?.message ?? ev)}` });
      };
      try {
        worker.post({ id: cryptoId(), code, trusted });
      } catch (err) {
        clearTimeout(timer);
        resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });
    worker.terminate();
    return outcome;
  };
}

/**
 * P2 wasm 执行器：同一 worker 协议（kind='wasm'，code=base64 二进制）——
 * wasm 实例化在 worker 内完成（不阻塞 UI）；untrusted 缺省拒在工具层执行。
 */
export function createWorkerWasmExecutor(factory: PlatformWorkerFactory, opts: { timeoutMs?: number } = {}): WasmExecutor {
  const timeoutMs = opts.timeoutMs ?? 15000;
  return async (bytesBase64, wopts) => {
    const worker = factory.create<EvalRequest, EvalResponse>();
    const outcome = await new Promise<EvalOutcome>((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate();
        resolve({ ok: false, error: 'wasm 执行超时（已中断 worker）' });
      }, timeoutMs);
      worker.onmessage = (ev) => {
        clearTimeout(timer);
        resolve(resolveWorkerOutcome(ev.data));
      };
      worker.onerror = (ev) => {
        clearTimeout(timer);
        resolve({ ok: false, error: `worker 异常：${String((ev as { message?: string })?.message ?? ev)}` });
      };
      try {
        worker.post({ id: cryptoId(), code: bytesBase64, trusted: wopts.trusted === true, kind: 'wasm', function: wopts.function, argsJson: wopts.argsJson });
      } catch (err) {
        clearTimeout(timer);
        resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });
    worker.terminate();
    return outcome;
  };
}

function cryptoId(): string {
  return `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 纯计算执行器（Node 测试注入：同步/异步函数；无 DOM 面）。 */
export function createFnEvalExecutor(fn: (code: string) => unknown): EvalExecutor {
  return async (code, { trusted }) => {
    if (!trusted) return { ok: false, error: 'untrusted 输入默认拒执行（EC-007）' };
    try {
      const value = await fn(code);
      return { ok: true, result: String(value) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

export interface EvalArgs {
  code?: string;
  trusted?: boolean;
}

/** eval-js 执行器：untrusted 缺省拒；trusted 走执行器。 */
export async function executeEvalJs(executor: EvalExecutor, args: EvalArgs): Promise<ToolResult> {
  const code = args.code ?? '';
  if (!code.trim()) {
    return { ok: false, output: '✖ eval-js 缺少必填参数 --code <JS 表达式/脚本>' };
  }
  const trusted = args.trusted === true;
  if (!trusted) {
    return {
      ok: false,
      output:
        '✖ eval-js 拒绝执行：输入默认视为 untrusted 来源代码（EC-007/FR-010）。' +
        '若代码由可信上下文产生，请显式声明 --trusted true（由策略/调用方放行）。',
      error: 'untrusted code rejected',
    };
  }
  const outcome = await executor(code, { trusted });
  if (outcome.blocked) {
    return { ok: false, output: `✖ 副作用尝试被拦截：${outcome.blocked}（eval 仅纯计算；DOM/网络/存储副作用受 PRM，FR-026）`, error: outcome.error };
  }
  if (!outcome.ok) {
    return { ok: false, output: `✖ eval-js 失败：${outcome.error ?? '未知错误'}`, error: outcome.error };
  }
  return { ok: true, output: String(outcome.result ?? '') };
}

// ---------- ToolEntry ----------

const EVAL_JS_DESC =
  'eval-js：页内沙箱计算（JS 表达式/脚本；纯计算语义，worker 无 DOM 面）。' +
  ' --code 必填；默认 untrusted 拒执行（EC-007），可信代码须显式 --trusted true。' +
  ' 副作用（DOM/网络/存储）尝试在 worker 端被拦截并报告。' +
  ' 参数进 args 对象：{"args":{"code":"1+2","trusted":"true"}}。';

const EVAL_JS_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JS 表达式/脚本（必填）。' },
        trusted: { type: 'string', description: '"true" = 可信代码放行（缺省 untrusted 拒执行）。' },
      },
    },
  },
} as const;

export function evalJsHelp(): string {
  return [
    'eval-js —— 页内沙箱计算（浏览器「进程」替代位；纯计算）',
    '用法：eval-js --code <JS> [--trusted true]',
    '',
    '示例：eval-js --code "2 ** 10" --trusted true',
    '安全边界（NG-001）：worker 非 OS 沙箱（无 seccomp/VM 语义）；非 shell、无文件系统/OS 面。',
    'CSP 约束（NFR-008）：worker 执行需过 worker-src/script-src；真实 worker 会话由场景经 PlatformEnv.workerFactory 注入。',
    'untrusted（EC-007/FR-010）：eval 输入默认视为 untrusted 来源代码，除非显式 --trusted true（策略放行）。',
  ].join('\n');
}

/** 创建 eval-js 工具条目（workerFactory 注入执行器）。 */
export function createEvalJsToolEntry(factory: PlatformWorkerFactory, opts: { timeoutMs?: number } = {}): ToolEntry {
  const executor = createWorkerEvalExecutor(factory, opts);
  return {
    name: 'eval-js',
    summary: '页内沙箱 JS 计算（worker 执行器；untrusted 默认拒）',
    schema: { name: 'eval-js', description: EVAL_JS_DESC, parameters: EVAL_JS_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'exec',
    executor: async (tc) =>
      executeEvalJs(executor, { code: tc.args.code, trusted: tc.args.trusted === 'true' }),
    help: evalJsHelp,
  };
}

// ---------- P2 wasm 面（FR-026：eval-wasm 页内沙箱计算；worker 内实例化不阻塞 UI） ----------

export interface WasmArgs {
  bytes?: string;
  fn?: string;
  argsJson?: string;
  trusted?: boolean;
}

/** eval-wasm 执行器：untrusted 缺省拒（与 eval-js 同语义 EC-007/FR-010，review IMP-1 补闸门）。 */
export async function executeEvalWasm(executor: WasmExecutor, args: WasmArgs): Promise<ToolResult> {
  const bytes = args.bytes ?? '';
  if (!bytes) {
    return { ok: false, output: '✖ eval-wasm 缺少必填参数 --bytes <wasm 二进制 base64>' };
  }
  const trusted = args.trusted === true;
  if (!trusted) {
    return {
      ok: false,
      output:
        '✖ eval-wasm 拒绝执行：输入默认视为 untrusted 来源代码（EC-007/FR-010）。' +
        '若 wasm 由可信上下文产生，请显式声明 --trusted true（由策略/调用方放行）。',
      error: 'untrusted wasm rejected',
    };
  }
  const outcome = await executor(bytes, { function: args.fn, argsJson: args.argsJson, trusted });
  if (outcome.blocked) {
    return { ok: false, output: `✖ wasm 执行被拦截：${outcome.blocked}`, error: outcome.error };
  }
  if (!outcome.ok) {
    return { ok: false, output: `✖ eval-wasm 失败：${outcome.error ?? '未知错误'}`, error: outcome.error };
  }
  return { ok: true, output: String(outcome.result ?? '') };
}

const EVAL_WASM_DESC =
  'eval-wasm：页内沙箱 WASM 计算（worker 内实例化，不阻塞 UI）。--bytes 必填（wasm 二进制 base64）；' +
  ' --fn <导出函数名> + --argsJson 调用导出（缺省仅实例化并报告 exports）。' +
  ' 默认 untrusted 拒执行（EC-007/FR-010），可信 wasm 须显式 --trusted true。' +
  ' 参数进 args 对象：{"args":{"bytes":"AGFzbQ…","fn":"add","argsJson":"[1,2]","trusted":"true"}}。';

const EVAL_WASM_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        bytes: { type: 'string', description: 'wasm 二进制 base64（必填）。' },
        fn: { type: 'string', description: '要调用的导出函数名（可选）。' },
        argsJson: { type: 'string', description: '调用参数 JSON（可选）。' },
        trusted: { type: 'string', description: '"true" = 可信 wasm 放行（缺省 untrusted 拒执行）。' },
      },
    },
  },
} as const;

export function evalWasmHelp(): string {
  return [
    'eval-wasm —— 页内沙箱 WASM 计算（P2 试点）',
    '用法：eval-wasm --bytes <base64> [--fn <导出> --argsJson "[...]"] [--trusted true]',
    '',
    '示例：eval-wasm --bytes "AGFzbQ…" --fn add --argsJson "[1,2]" --trusted true',
    '说明：wasm 实例化在 worker 内完成（不阻塞 UI）；worker 非 OS 沙箱（NG-001）；CSP worker-src 约束记录。',
    'untrusted（EC-007/FR-010）：eval-wasm 输入默认视为 untrusted 来源代码，除非显式 --trusted true（策略放行）。',
  ].join('\n');
}

/** 创建 eval-wasm 工具条目（workerFactory 注入 wasm 执行器）。 */
export function createEvalWasmToolEntry(factory: PlatformWorkerFactory, opts: { timeoutMs?: number } = {}): ToolEntry {
  const executor = createWorkerWasmExecutor(factory, opts);
  return {
    name: 'eval-wasm',
    summary: '页内沙箱 WASM 计算（worker 内实例化；P2 试点）',
    schema: { name: 'eval-wasm', description: EVAL_WASM_DESC, parameters: EVAL_WASM_SCHEMA as unknown as Record<string, unknown> },
    risk: 'write',
    group: 'exec',
    executor: async (tc) =>
      executeEvalWasm(executor, {
        bytes: tc.args.bytes,
        fn: tc.args.fn,
        argsJson: tc.args.argsJson,
        trusted: tc.args.trusted === 'true',
      }),
    help: evalWasmHelp,
  };
}
