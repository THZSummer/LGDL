/**
 * wait-tools.ts —— wait 条件等待工具（FR-025/ADR-005，WT 横切；与 sleep 固定延时语义区分）。
 *
 * 生态位：SPA 动态渲染 / 无限滚动加载场景的时序原语 —— 不是「等固定时长」而是「等到条件满足」：
 * 等待元素出现（element）/ 可见（visible，几何非零 + 非 display:none）/ 可交互
 * （interactable，可见且非 disabled）/ 消失（gone）/ 文本出现（text，text= 语法面）——
 * 命中即返；超时返回 ok:false + 最后观察状态摘要（各条件当前满足与否），**不中断会话**。
 * 采集翻页组合（FR-039：click 下一页 → wait 新内容 → 增量 extract）以本原语保证时序稳定。
 *
 * 分层（ADR-008：DOM 触碰收敛 platform-dom.ts，本文件零 document 假设）：
 *   ① 条件解析 —— kind/selector/text= 定位语法统一经 locator（FR-015/ADR-007/O-011）校验，
 *      非法条件 → 可读错误 + 语法指引（EC-002，绝不把 role=/xpath= 静默当 CSS）；
 *   ② 委托执行 —— 调 PlatformDomOps.waitFor（TASK-004 真实实现 = MutationObserver 驱动 +
 *      轮询降级 + 统一超时含最后状态，ADR-005；observer/轮询策略在 help 面工程声明）；
 *   ③ 结果映射 —— 命中/超时均透传 ops 状态摘要；超时 ok:false 不抛异常 = 会话不中断。
 * 工具 risk:'read'（只读观察，PRM 缺省 allow 免 ask，IMP-4 语义与只读 dom 子命令一致）；
 * env.dom.ops.waitFor 未注入 → 「该能力在当前环境未注入」可读错误（additive 契约，FR-002）。
 *
 * 与 sleep 语义区分（FR-025）：sleep = 固定延时（sleep.ts 独立原语，**零改动**）；
 * wait = 条件驱动（MutationObserver 优先低开销 NFR-007：观察期外零常驻轮询，命中/超时即止，
 * 本工具自身不做忙等轮询 —— 单次委托 ops.waitFor）。
 *
 * 本文件零 DOM/lgdl/react import（NFR-001）；node 面注入桩全链可测（NFR-005）。
 */
import type { PlatformDomOps, PlatformWaitCondition, PlatformWaitForOptions, PlatformWaitKind, PlatformEnv } from './platform.js';
import { translateCapabilityError } from './platform.js';
import type { ToolEntry, ToolResult } from './router.js';
import { parseLocator, locatorSyntaxHelp } from './locator.js';
import type { TextLocatorQuery } from './locator.js';

/** wait 条件 kind 全集（= PlatformWaitKind，FR-025）。 */
export const WAIT_KINDS: readonly PlatformWaitKind[] = ['element', 'visible', 'interactable', 'gone', 'text'];

/** 多条件缺省 mode：any = 任一命中即返（FR-025 可配）。 */
export const WAIT_MODE_DEFAULT = 'any';

/** 超时缺省值（ms；FR-025「默认值可配」，工具面每调用 --timeout 可覆盖）。 */
export const WAIT_TIMEOUT_DEFAULT_MS = 10000;

/** 统一超时上限（ms；超过自动钳制，防误用/长挂起，ADR-005/FR-025）。 */
export const WAIT_TIMEOUT_MAX_MS = 30000;

/** 轮询降级间隔缺省值（ms；MutationObserver 通道不受此限，NFR-007）。 */
export const WAIT_INTERVAL_DEFAULT_MS = 200;

/** 解析结果（ok → 直接可得 ops.waitFor 入参；!ok → 可读 output + error 供执行器返回）。 */
export type ParsedWaitArgs =
  | { ok: true; options: PlatformWaitForOptions }
  | { ok: false; output: string; error: string };

/** 单条件入参形态（flat args 或 --conditions JSON 数组项共用的事实形状）。 */
export interface WaitConditionSource {
  kind?: string;
  selector?: string;
  text?: string;
}

/** 解析失败统一形态（✖ 前缀输出 + 短 error 码；与既有工具错误面一致）。 */
export interface WaitFailure {
  ok: false;
  output: string;
  error: string;
}

/** 解析失败构造（供 parse/normalize 返回；非联合类型 → 可安全赋给各 ok:false 联合成员）。 */
function waitError(message: string, code: string): WaitFailure {
  return { ok: false, output: `✖ ${message}`, error: code };
}

function nonEmpty(v: string | undefined): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/** 把 text 定位查询重铸为规范 text= / text*= 语法串（kind=text 的 condition.text 载体）。 */
function canonicalTextSpec(q: TextLocatorQuery): string {
  return `${q.mode === 'exact' ? 'text=' : 'text*='}${q.text}`;
}

/** 条件位置标签（单条件无标签；--conditions 数组项带序号，报错可定位）。 */
function whereLabel(idx: number | undefined): string {
  return idx === undefined ? '' : `（--conditions 第 ${idx + 1} 项）`;
}

/** kind=text 文本目标解析：容器 CSS（可选）+ 文本定位串（必得其一）。 */
function resolveTextCondition(
  src: WaitConditionSource,
  where: string,
): { ok: true; condition: PlatformWaitCondition } | { ok: false; message: string } {
  const hasText = nonEmpty(src.text);
  const hasSel = nonEmpty(src.selector);
  if (!hasText && !hasSel) {
    return {
      ok: false,
      message: `kind=text 需要文本目标${where}：--text <文本>（缺省精确匹配）或 --selector "text=<文本>" / "text*=<子串>"（也可 --selector <容器 CSS> + --text 组合，等待容器内出现该文本）`,
    };
  }
  let container: string | undefined;
  let spec: string | undefined;
  if (hasSel) {
    const parsed = parseLocator(src.selector!);
    if (parsed.ok === false) {
      return { ok: false, message: `kind=text 的 --selector 非法${where}：${parsed.error}` };
    }
    if (parsed.query.type === 'css') {
      if (!hasText) {
        return {
          ok: false,
          message: `kind=text 且 --selector 为 CSS 容器时${where}还需要 --text <文本>（等待容器内出现该文本）`,
        };
      }
      container = parsed.query.css;
    } else {
      if (hasText) {
        return {
          ok: false,
          message: `kind=text 的文本目标重复指定${where}：--selector 已含 text= 语法，请去掉 --text（或改用 --selector <容器 CSS> + --text 组合）`,
        };
      }
      spec = canonicalTextSpec(parsed.query);
    }
  }
  if (spec === undefined) {
    const t = src.text!.trim();
    if (t === '') return { ok: false, message: `kind=text 的 --text 为空${where}` };
    const parsed = parseLocator(src.text!);
    if (parsed.ok === true) {
      if (parsed.query.type === 'text') spec = canonicalTextSpec(parsed.query);
    } else if (/^text\*?=/i.test(t)) {
      // 显式 text=/text*= 前缀但语法非法（如 text= 空文本）→ 报语法错误而非当裸文本包裹
      return { ok: false, message: `kind=text 的 --text 含 text= 前缀但语法非法${where}：${parsed.error}` };
    }
    if (spec === undefined) spec = `text=${t}`; // 裸文本 = 精确匹配（trim 后包裹为规范 text= 语法）
  }
  const condition: PlatformWaitCondition = { kind: 'text' };
  if (container !== undefined) condition.selector = container;
  condition.text = spec;
  return { ok: true, condition };
}

/** 单个条件源归一（kind 校验 + selector/text 定位语法校验；非法 → 可读错误）。 */
function normalizeCondition(
  src: WaitConditionSource,
  idx?: number,
): { ok: true; condition: PlatformWaitCondition; output?: never } | { ok: false; output: string; error: string } {
  const where = whereLabel(idx);
  if (!nonEmpty(src.kind)) {
    return waitError(`wait 条件缺少 kind${where}（element/visible/interactable/gone/text）`, 'missing kind');
  }
  if (!(WAIT_KINDS as readonly string[]).includes(src.kind!)) {
    return waitError(
      `未知 wait 条件 kind "${src.kind}"${where}（支持：element/visible/interactable/gone/text）`,
      'unknown kind',
    );
  }
  const kind = src.kind as PlatformWaitKind;
  if (kind === 'text') {
    const r = resolveTextCondition(src, where);
    if (r.ok === false) return waitError(r.message, 'invalid text condition');
    return { ok: true, condition: r.condition };
  }
  if (!nonEmpty(src.selector)) {
    return waitError(
      `wait 条件 kind=${kind}${where}需要 --selector <定位>（目标元素；支持 CSS 裸串 / css: / text= / text*= 定位语法）`,
      'missing selector',
    );
  }
  const parsed = parseLocator(src.selector!);
  if (parsed.ok === false) {
    return waitError(`wait 条件${where}的 --selector 非法：${parsed.error}`, 'invalid selector');
  }
  return { ok: true, condition: { kind, selector: src.selector!.trim() } };
}

/**
 * 解析 wait 工具平面参数 → ops.waitFor 结构化选项（FR-025/ADR-005）。
 * 单条件形态：kind + selector(/text)；多条件形态：--conditions JSON 数组字符串（二选一）。
 * timeout 缺省 10000 / 上限 30000 钳制；interval 缺省 200；mode 缺省 any。
 * 条件定位统一经 locator 校验（text= 语法面一致，O-011）；非法条件 → 可读错误 + 语法指引。
 */
export function parseWaitArgs(args: Record<string, string>): ParsedWaitArgs {
  const hasConditions = nonEmpty(args.conditions);
  const hasKind = nonEmpty(args.kind);
  if (hasConditions && hasKind) {
    return waitError(
      'wait 的 --conditions（多条件数组）与单条件 --kind 只能二选一；传 --conditions 时请去掉 --kind/--selector/--text',
      'ambiguous condition source',
    );
  }

  let conditions: PlatformWaitCondition[];
  if (hasConditions) {
    let arr: unknown;
    try {
      arr = JSON.parse(args.conditions!);
    } catch {
      return waitError(
        '--conditions 需为 JSON 数组字符串（每项条件对象 {kind, selector?, text?}），如 [{"kind":"element","selector":"#toast"},{"kind":"gone","selector":"#spinner"}]；当前 JSON 解析失败',
        'conditions not json',
      );
    }
    if (!Array.isArray(arr) || arr.length === 0) {
      return waitError(
        '--conditions 需为非空 JSON 数组字符串（空数组无法等待任何条件）；每项 {kind, selector?, text?}',
        'conditions not array',
      );
    }
    conditions = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] as unknown;
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return waitError(`--conditions 第 ${i + 1} 项不是条件对象（需为 {kind, selector?, text?}）`, 'conditions item not object');
      }
      const raw = item as Record<string, unknown>;
      const src: WaitConditionSource = {
        kind: typeof raw.kind === 'string' ? raw.kind : undefined,
        selector: typeof raw.selector === 'string' ? raw.selector : undefined,
        text: typeof raw.text === 'string' ? raw.text : undefined,
      };
      const r = normalizeCondition(src, i);
      if (r.ok === false) return { ok: false, output: r.output, error: r.error };
      conditions.push(r.condition);
    }
  } else {
    if (!hasKind) {
      return waitError(
        'wait 需要一个等待条件：--kind element|visible|interactable|gone|text + --selector <定位>；或 --conditions <JSON 数组字符串> 等待多条件任一/全部',
        'missing kind',
      );
    }
    const r = normalizeCondition({ kind: args.kind, selector: args.selector, text: args.text });
    if (r.ok === false) return { ok: false, output: r.output, error: r.error };
    conditions = [r.condition];
  }

  // mode：any = 任一命中即返 / all = 全部满足（缺省 any）
  const modeRaw = nonEmpty(args.mode) ? args.mode! : WAIT_MODE_DEFAULT;
  if (modeRaw !== 'any' && modeRaw !== 'all') {
    return waitError(`wait --mode 需为 any（任一命中即返）或 all（全部满足）；当前 "${modeRaw}"`, 'invalid mode');
  }

  // timeout：缺省 10000；非负；上限 30000 钳制（防误用/长挂起）
  const timeoutRaw = nonEmpty(args.timeout) ? args.timeout! : String(WAIT_TIMEOUT_DEFAULT_MS);
  const timeoutNum = Number(timeoutRaw);
  if (!Number.isFinite(timeoutNum) || timeoutNum < 0) {
    return waitError('wait --timeout 需为非负毫秒数（缺省 10000；上限 30000 自动钳制）', 'invalid timeout');
  }
  const timeout = Math.min(timeoutNum, WAIT_TIMEOUT_MAX_MS);

  // interval：轮询降级间隔，缺省 200；须为正数（observer 通道不受此限）
  const intervalRaw = nonEmpty(args.interval) ? args.interval! : String(WAIT_INTERVAL_DEFAULT_MS);
  const intervalNum = Number(intervalRaw);
  if (!Number.isFinite(intervalNum) || intervalNum <= 0) {
    return waitError('wait --interval 需为正毫秒数（轮询降级间隔，缺省 200；MutationObserver 通道不受此限）', 'invalid interval');
  }

  return { ok: true, options: { conditions, mode: modeRaw, timeout, interval: intervalNum } };
}

/**
 * wait 工具执行器：解析条件 → 单次委托 ops.waitFor（NFR-007 工具层零空转）→ 结果映射。
 * 命中 = ok + ops 状态摘要；超时 = ok:false + 最后观察状态摘要（透传，不抛异常 = 会话不中断）；
 * ops.waitFor 未注入 → 「未注入」可读错误；授权/能力异常 → 统一转译（FR-009/EC-003）。
 */
export async function executeWaitTool(ops: PlatformDomOps | undefined, args: Record<string, string>): Promise<ToolResult> {
  const parsed = parseWaitArgs(args);
  if (parsed.ok === false) return { ok: false, output: parsed.output, error: parsed.error };
  if (!ops || typeof ops.waitFor !== 'function') {
    return {
      ok: false,
      output:
        '✖ wait 条件等待能力未注入（env.dom.ops.waitFor 缺省）—— 宿主页条件等待仅在浏览器场景可用；固定延时请用 sleep（语义区分：wait = 条件驱动，sleep = 固定时长）',
      error: 'waitFor not injected',
    };
  }
  try {
    const r = await ops.waitFor(parsed.options);
    if (r.ok) return { ok: true, output: r.output };
    const fallback =
      r.output.trim() !== ''
        ? r.output
        : `✖ wait 条件未在 ${parsed.options.timeout}ms 内满足（统一超时；最后观察状态摘要应由运行环境返回）`;
    return { ok: false, output: fallback, error: r.error ?? 'wait condition not met within timeout' };
  } catch (err) {
    const t = translateCapabilityError(err, '条件等待');
    return { ok: false, output: t.output, error: t.error };
  }
}

// ---------- ToolEntry 工厂（schema + help；wait = 独立单动词工具，无 subcommandRisks） ----------

const WAIT_DESC =
  'wait：条件等待（SPA 动态渲染时序原语 —— 与 sleep 固定延时区分：等待条件满足而非等固定时长）。' +
  ' 条件 --kind：element=selector 匹配出现 / visible=可见（几何非零 + 非 display:none）/ interactable=可见且非 disabled / gone=消失 / text=文本出现（text= 语法）。' +
  ' 目标定位（--selector，FR-015）：CSS 裸串 / css: / text=精确文本 / text*=包含文本（role=/xpath= 不支持）。' +
  ' --mode any|all（缺省 any：多条件任一命中即返；all = 全部满足）；多条件用 --conditions 传 JSON 数组字符串（与单条件字段二选一）。' +
  ' --timeout 超时毫秒（缺省 10000，上限 30000 钳制）；--interval 轮询降级间隔毫秒（缺省 200；MutationObserver 通道不受此限）。' +
  ' 返回：命中 ok + 当前状态摘要；超时 ok:false + 最后观察状态摘要（各条件当前满足与否/匹配数），不中断会话。' +
  ' 只读观察（risk:read，PRM 缺省 allow 免 ask）。参数进 args 对象：{"args":{"kind":"gone","selector":"#spinner","timeout":"5000"}}。';

const WAIT_SCHEMA = {
  type: 'object',
  properties: {
    args: {
      type: 'object',
      description:
        'wait 参数（单条件形态：kind + selector(/text)；多条件形态：conditions JSON 数组字符串，二选一）。',
      properties: {
        kind: {
          type: 'string',
          enum: [...WAIT_KINDS],
          description: '等待条件类型：element=元素出现 / visible=可见 / interactable=可交互 / gone=消失 / text=文本出现。',
        },
        selector: {
          type: 'string',
          description:
            '目标定位（CSS 裸串 / css: / text=精确文本 / text*=包含文本；role=/xpath= 不支持）。element/visible/interactable/gone 的目标；kind=text 时可作文本定位或 CSS 容器。',
        },
        text: {
          type: 'string',
          description:
            'kind=text 的目标文本（裸文本 = 精确匹配；或 text= / text*= 语法带模式）。与 kind=text 搭配使用。',
        },
        mode: {
          type: 'string',
          enum: ['any', 'all'],
          description: '多条件语义：any=任一命中即返（缺省）/ all=全部满足。',
        },
        timeout: {
          type: 'string',
          description: '超时毫秒（缺省 10000；上限 30000 自动钳制）。',
        },
        interval: {
          type: 'string',
          description: '轮询降级间隔毫秒（缺省 200；MutationObserver 通道不受此限，低开销 NFR-007）。',
        },
        conditions: {
          type: 'string',
          description:
            '多条件 JSON 数组字符串（与单条件 kind/selector/text 二选一）：[{"kind":"element","selector":"#toast"},{"kind":"gone","selector":"#spinner"}]。',
        },
      },
    },
  },
  required: ['args'],
} as const;

/** wait 帮助面：与 sleep 语义显式区分 + observer/轮询策略工程声明（ADR-005/NFR-007）。 */
export function waitHelp(): string {
  return [
    'wait —— 条件等待（动态渲染时序原语；与 sleep 固定延时语义区分）',
    '用法：wait --kind <element|visible|interactable|gone|text> --selector <定位> [--text <文本>] [--mode any|all] [--timeout ms] [--interval ms]',
    '      wait --conditions \'<JSON 条件数组字符串>\'',
    '',
    '条件 kind：',
    '  element        目标元素出现（--selector：CSS 裸串 / css: / text=精确 / text*=包含）',
    '  visible        可见（几何非零 + 非 display:none）',
    '  interactable   可见且非 disabled（可交互）',
    '  gone           目标元素消失 / 不存在',
    '  text           文本出现（--text <文本> 缺省精确匹配；或 --selector "text=..." / "text*=..."；',
    '                  亦可 --selector <容器 CSS> + --text 组合，等待容器内出现该文本）',
    '',
    '参数：',
    '  --mode any|all   多条件任一命中即返 / 全部满足（缺省 any）',
    '  --timeout        超时毫秒（缺省 10000；上限 30000 钳制，防长挂起）',
    '  --interval       轮询降级间隔毫秒（缺省 200；MutationObserver 通道不受此限）',
    '  --conditions     多条件 JSON 数组字符串（与单条件字段二选一），如 \'[{"kind":"gone","selector":"#spinner"}]\'',
    '',
    '实现（ADR-005）：MutationObserver 驱动结构/内容变化即时重判 + interval 轮询兜底几何/可见/文本类条件；',
    '  命中即返（低开销 NFR-007：观察期外零常驻轮询，本工具单次委托 ops.waitFor 不自身忙等）；',
    '  超时返回 ok:false + 最后观察状态摘要（各条件当前满足与否/匹配数），不中断会话（AI 可据最后状态调整，EC-014 联动）。',
    '与 sleep 区分：sleep = 固定延时（sleep --ms <毫秒>，独立原语语义不变，两者并存零回归）；',
    '  SPA 时序/等元素/采集翻页等「等条件」场景用 wait，固定节拍才用 sleep。',
    '边界：执行目标 = 宿主应用自身同源页面；DOM 观察依赖 env.dom.ops.waitFor 注入（浏览器场景）。',
    '安全：只读观察（risk:read），PRM 缺省 allow 免 ask；不含任何页面写入。',
    '',
    '定位语法（--selector）：',
    locatorSyntaxHelp(),
  ].join('\n');
}

/** 创建 wait 工具条目（env.dom.ops.waitFor 注入；risk:'read' 只读观察免 ask）。 */
export function createWaitToolEntry(env: PlatformEnv): ToolEntry {
  return {
    name: 'wait',
    summary: '条件等待（元素出现/可见/可交互/消失/文本出现；MutationObserver + 轮询 + 统一超时；与 sleep 固定延时区分）',
    schema: { name: 'wait', description: WAIT_DESC, parameters: WAIT_SCHEMA as unknown as Record<string, unknown> },
    risk: 'read',
    group: 'ui',
    executor: async (tc) => executeWaitTool(env.dom?.ops, tc.args),
    help: waitHelp,
  };
}
