/**
 * page-eval.ts —— page-eval 工具（FR-037/ADR-002：宿主页同源 evaluate，F12 console 等效）。
 *
 * 生态位（discovery Q-003/Q-006，作者裁决 O-002/R-04）：宿主页**同源 DOM/JS 上下文**
 * 执行任意 JS 表达式/脚本 —— 等效 F12 console 对该页的权限（可读同源 DOM/存储、可改
 * DOM、可调页面函数；跨域仍受 SOP，NG-002/F-14）。执行面 = PlatformDomOps.evaluate
 * （TASK-004 浏览器面真实现/注入桩），本模块只做参数解析/预算/门禁语义/序列化回传
 * （ADR-008 executor 分工）。
 *
 * 与 eval-js 的语义区分（NG-010，**eval-tools.ts 零改动**）：
 *   - eval-js / eval-wasm = worker 沙箱纯计算（无 DOM 面；可中断、不阻塞主线程）
 *   - page-eval         = 宿主页主线程同 realm 执行（有完整 DOM 面；等效 F12 console）
 *   两者互不替代，help/schema 显式公开区分（见 pageEvalHelp）。
 *
 * 门禁（ADR-002/FR-008，四道）：
 *   ① ToolRisk 'evaluate' 最高档 —— entry.risk='evaluate'，缺省裁决 deny
 *      （permission.ts defaultActionForRisk；TASK-001 机制，本工具声明接入）
 *   ② router 无策略宿主 fail-closed —— effectiveRisk==='evaluate' 且无 policyGate
 *      → 直接 deny、执行器不被调用（router.ts:570，TASK-001 已实现）
 *   ③ executor 层 untrusted 拒（本文件，双闸执行器面）：代码默认视为 untrusted，
 *      须显式 `--trusted true`（v2 eval-js EC-007 同源模式；不降级执行、不截断执行 EC-003）
 *   ④ 执行全程审计（NFR-008）：代码摘要/来源/裁决/结果摘要入 ctx.services.audit
 *      （router 层 permission/tool-call 事件之外，执行器面补充代码摘要明细）
 *
 * 执行预算（ADR-002/P-01，作者确认默认）：
 *   - 代码长度上限（--codeMax，缺省 10000 字符）：超出**拒执行**（绝不截断半段代码去执行）
 *   - 异步超时中止（--timeoutMs，缺省 10000ms）：async Promise 超时中止由 ops.evaluate
 *     实现面承担（PlatformEvaluateOptions.timeoutMs，TASK-004）
 *   - 结果序列化预算（--maxLength，缺省 20000）：截断标记由 ops 输出面回传（FR-037/EC-010）
 *   - ★ 同步死循环**不可中断** = 主线程同 realm 平台硬约束（Chrome DevTools console
 *     同限）：本工具诚实公开、不承诺假中断（P-01 默认，帮助面工程公开）
 *
 * 本文件零 LGDL/react import（NFR-001）；零 DOM 触碰（DOM 全收敛 platform-dom.ts）。
 */
import type { PlatformDomOps, PlatformDomOpResult, PlatformEnv } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { AuditSink } from './audit.js';
import type { ToolContext, ToolEntry, ToolResult } from './router.js';

/** page-eval 执行预算缺省（帮助面/审计可见单一数据源；ops 面实现缺省应与此一致）。 */
export const PAGE_EVAL_DEFAULTS = {
  /** 代码长度上限（字符）。超出拒执行（不截断执行半段代码）。 */
  codeMax: 10000,
  /** 异步执行超时 ms（async Promise 超时中止；同步死循环不可中断 = P-01 平台硬约束）。 */
  timeoutMs: 10000,
  /** 结果序列化预算字符上限（超限 ops 输出面带截断标记，EC-010）。 */
  maxLength: 20000,
} as const;

/** 代码摘要：压平空白 + 截断预算内（审计/ask 呈现用，不回显整段代码全文）。 */
export function summarizeCode(code: string, budget = 120): string {
  const flat = code.replace(/\s+/g, ' ').trim();
  if (flat.length <= budget) return flat;
  return `${flat.slice(0, budget)}…（截断，原文 ${code.length} 字符）`;
}

/** 审计裁决来源（执行器面；router 层 permission 事件的裁决来源另见 router.ts）。 */
export type PageEvalDecision = 'untrusted-reject' | 'budget-reject' | 'not-injected' | 'run' | 'capability-error';

/** 执行器审计事件（NFR-008：代码摘要/来源/裁决/结果摘要；随 tool-call 事件面记录）。 */
export interface PageEvalAuditInfo {
  decision: PageEvalDecision;
  ok: boolean;
  codeChars: number;
  summary: string;
  detail?: string;
}

/** 记录 page-eval 执行审计（ctx.services.audit 注入；缺省不记录 = 零开销）。 */
export function recordPageEvalAudit(audit: AuditSink | undefined, info: PageEvalAuditInfo): void {
  if (!audit) return;
  const detail =
    `evaluate:decision=${info.decision} codeChars=${info.codeChars} ` +
    `code="${info.summary}" source=page-eval:args` +
    (info.detail ? ` ${info.detail}` : '');
  audit.record({ type: 'tool-call', ts: Date.now(), tool: 'page-eval', ok: info.ok, detail });
}

/** 解析预算参数（仅接受非负整数串；非法/缺省 → PAGE_EVAL_DEFAULTS，dom-tools 数字解析先例）。 */
function budgetArg(raw: string | undefined, fallback: number): number {
  return /^\d+$/.test(raw ?? '') ? Number(raw) : fallback;
}

/**
 * page-eval 执行器：门禁语义（untrusted 拒/代码预算）+ ops.evaluate 调用 + 结果回传。
 * ops = env.dom.ops（可缺省 undefined → 「未注入」可读错误）。
 */
export async function executePageEval(
  ops: PlatformDomOps | undefined,
  args: Record<string, string>,
  ctx: ToolContext = {},
): Promise<ToolResult> {
  const audit = ctx.services?.audit;
  const code = args.code ?? '';
  const summary = summarizeCode(code);

  // 0 必填参数
  if (!code.trim()) {
    return { ok: false, output: '✖ page-eval 缺少必填参数 --code <JS 表达式/脚本>' };
  }

  const codeMax = budgetArg(args.codeMax, PAGE_EVAL_DEFAULTS.codeMax);
  const timeoutMs = budgetArg(args.timeoutMs, PAGE_EVAL_DEFAULTS.timeoutMs);
  const maxLength = budgetArg(args.maxLength, PAGE_EVAL_DEFAULTS.maxLength);

  // 1 执行形态声明（非法值显式报错：不静默降级为 expression）
  const as = args.as ?? 'expression';
  if (as !== 'expression' && as !== 'script') {
    return { ok: false, output: `✖ page-eval --as 仅支持 expression|script（收到 "${as}"）`, error: 'invalid as' };
  }

  // 2 代码长度预算（EC-004 预算面）：超出拒执行 —— 不截断半段代码去执行（与 EC-003 不截断语义一致）
  if (code.length > codeMax) {
    recordPageEvalAudit(audit, { decision: 'budget-reject', ok: false, codeChars: code.length, summary });
    return {
      ok: false,
      output:
        `✖ page-eval 代码超预算：${code.length} > ${codeMax} 字符上限（--codeMax 可上调；` +
        `执行预算收敛 evaluate 暴露面，FR-037/ADR-002）。`,
      error: 'code exceeds budget',
    };
  }

  // 3 ★ untrusted 双闸（FR-008/EC-003，ADR-002 ③）：代码默认视为 untrusted，
  //   须显式 --trusted true（真可信面 = 场景策略 ask 人审，FR-045 白名单规则）。
  //   拒执行 = 不降级执行、不截断执行；入审计。
  const trusted = args.trusted === 'true';
  if (!trusted) {
    recordPageEvalAudit(audit, { decision: 'untrusted-reject', ok: false, codeChars: code.length, summary });
    return {
      ok: false,
      output:
        '✖ page-eval 拒绝执行：代码默认视为 untrusted 来源（来自网络/采集/外部内容的代码引用缺省拒执行，' +
        'FR-008/EC-003）。若代码由可信上下文产生，请显式声明 --trusted true' +
        '（且须先经场景策略门禁放行——evaluate 最高档缺省 deny）。',
      error: 'untrusted code rejected',
    };
  }

  // 4 执行面注入检查（TASK-003 additive：新方法缺省 undefined → 沿用「未注入」可读错误语义）
  if (!ops || typeof ops.evaluate !== 'function') {
    recordPageEvalAudit(audit, { decision: 'not-injected', ok: false, codeChars: code.length, summary });
    return {
      ok: false,
      output:
        '✖ page-eval 执行面未注入（env.dom.ops.evaluate 缺省）—— 宿主页 evaluate 仅在浏览器场景可用' +
        '（F12 console 等效；DOM 触碰收敛 platform-dom.ts，TASK-004 装配）。',
      error: 'evaluate op not injected',
    };
  }

  // 5 执行：ops.evaluate 承担宿主页同源执行 + 异步超时中止 + 结果序列化/截断标记；
  //   返回 ok:false（运行时异常/超时 → 可读错误 + 页面存活语义 EC-004）由执行器透传。
  let r: PlatformDomOpResult;
  try {
    r = await ops.evaluate(code, { as, timeoutMs, maxLength });
  } catch (err) {
    // 授权/能力失败统一转译（EC-008）；会话不中断
    const t = translateCapabilityError(err, 'page-eval');
    recordPageEvalAudit(audit, { decision: 'capability-error', ok: false, codeChars: code.length, summary, detail: t.error });
    return { ok: false, output: t.output, error: t.error };
  }
  recordPageEvalAudit(audit, {
    decision: 'run',
    ok: r.ok,
    codeChars: code.length,
    summary,
    detail: r.ok ? `resultChars=${r.output.length}` : `run-error=${r.error ?? ''}`,
  });
  return r.ok ? { ok: true, output: r.output } : { ok: false, output: r.output, error: r.error };
}

// ---------- ToolEntry ----------

const PAGE_EVAL_DESC =
  'page-eval：宿主页同源 JS 上下文 evaluate（F12 console 等效，FR-037）。' +
  ' --code 必填（JS 表达式/脚本，跨域仍受 SOP）；默认 untrusted 拒执行，可信代码须显式 --trusted true；' +
  ' --as expression|script（缺省 expression）；预算：--codeMax（代码长度上限）/ --timeoutMs（异步超时）/' +
  ' --maxLength（结果截断预算）。' +
  ' 与 eval-js（worker 沙箱无 DOM 面）语义区分（NG-010）：本工具在宿主页主线程执行、可读写同源 DOM。' +
  ' 执行受 evaluate 最高档门禁（缺省 deny + 无策略 fail-closed，FR-008）。' +
  ' 参数进 args 对象：{"args":{"code":"document.title","trusted":"true"}}。';

const PAGE_EVAL_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JS 表达式/脚本（必填；宿主页同源上下文执行）。' },
        trusted: { type: 'string', description: '"true" = 可信代码放行（缺省 untrusted 拒执行）。' },
        as: { type: 'string', description: '执行形态：expression=求值表达式 / script=语句序列（缺省 expression）。' },
        codeMax: { type: 'string', description: `代码长度上限（缺省 ${PAGE_EVAL_DEFAULTS.codeMax} 字符；超出拒执行）。` },
        timeoutMs: { type: 'string', description: `异步执行超时 ms（缺省 ${PAGE_EVAL_DEFAULTS.timeoutMs}；同步死循环不可中断）。` },
        maxLength: { type: 'string', description: `结果序列化预算字符上限（缺省 ${PAGE_EVAL_DEFAULTS.maxLength}；超限截断标记）。` },
      },
    },
  },
} as const;

export function pageEvalHelp(): string {
  return [
    'page-eval —— 宿主页同源 evaluate（F12 console 等效；最高档门禁）',
    '用法：page-eval --code <JS 表达式/脚本> --trusted true [--as expression|script] [--codeMax N] [--timeoutMs N] [--maxLength N]',
    '',
    '示例：page-eval --code "document.querySelector(\'h1\').textContent" --trusted true',
    '示例：page-eval --code "document.title = \'新标题\'" --as script --trusted true',
    '',
    '安全（FR-008/ADR-002）：evaluate 最高档门禁 —— ①缺省裁决 deny（无策略/规则不静默 allow）；',
    '②无策略宿主 fail-closed（须场景显式装配门禁才可执行）；③untrusted 拒执行（缺省视为 untrusted，须显式 --trusted true，FR-045 白名单规则）；',
    '④ask 人审呈现代码摘要（FR-044）；⑤执行全程入审计（代码摘要/来源/裁决，NFR-008）。',
    '同步死循环（P-01 工程公开）：主线程同 realm 执行，同步死循环**无法中断**（Chrome DevTools console 同限）；',
    '本工具不承诺假中断 —— 以 异常可捕获 / 异步 Promise 超时中止 / 代码预算 / 门禁审计 收敛暴露面。请勿提交含 while(true) 等同步死循环代码。',
    'CSP 约束：页面 Content-Security-Policy 缺 unsafe-eval 时 new Function/eval 被禁 → ops 返回可读失败（页面存活）。',
    '与 eval-js 区分（NG-010）：eval-js/eval-wasm = worker 沙箱纯计算（无 DOM 面，可中断）；page-eval = 宿主页同源主线程（有 DOM 面，F12 等效）；两工具互不替代。',
    '边界（NG-002）：执行目标 = 宿主应用自身同源页面；跨域仍受 SOP（同源策略），第三方/跨域 = F-14 插件线边界。',
  ].join('\n');
}

/** 创建 page-eval 工具条目（env.dom.ops 注入；risk='evaluate' 最高档）。 */
export function createPageEvalToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'page-eval',
    summary: '宿主页 evaluate（F12 console 等效；untrusted 默认拒 + evaluate 最高档门禁）',
    schema: { name: 'page-eval', description: PAGE_EVAL_DESC, parameters: PAGE_EVAL_SCHEMA as unknown as Record<string, unknown> },
    risk: 'evaluate',
    group: 'exec',
    executor: async (tc, ctx) => executePageEval(env.dom?.ops, tc.args, ctx),
    help: pageEvalHelp,
  };
}
