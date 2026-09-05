/**
 * CommandRouter —— 顶层工具级路由（ADR-001）：注册表单一数据源 + 统一分发契约。
 *
 * bash 类比下的「shell」：{tool, args} → 注册执行器。lgdl-web 现 5 工具
 * （lgdl-web-cli / lgdl-web-op-cli / web-fetch / sleep / web-cli-help）全部以
 * ToolEntry 表达——schema / 文本前缀 / 执行器 / help / delay 声明 / 注册顺序
 * 只存在于注册条目（FR-001/NFR-004，唯一工具名集合 FR-021）。
 *
 * 派生（FR-004/FR-007/FR-010）：
 *   - deriveTools()：schema 数组 = [业务工具（注册序）] + [内建（固定置末）]（FR-005/AC-006）
 *   - deriveCommand()：文本命令前缀派生（引号规则逐字节对齐 AiPanel 旧 toolCallToCommand）
 *   - listHelp()/helpFor()：web-cli-help 一览/详情注册即得（FR-010；内建先、业务后贴近旧一览文本 FR-024）
 *
 * dispatch（FR-002/FR-003）统一分发入口：未注册名显式报错（不落入任何执行器）；
 * 执行器抛异常 → 转 ok:false + 稳定文案（EC-012）；delay gate 挂此入口（FR-013）。
 *
 * 内建自动注册（FR-020）：createCommandRouter() 构造即注册 web-fetch / sleep /
 * web-cli-help 三内建（sleep 条目 delayMs:0 免除前置间隔 ADR-003；web-cli-help
 * listed:false 保持旧一览语义 EC-010）。
 *
 * 本文件零 react/LGDL import（NFR-001/NFR-008）；无业务包时自足可用（AC-001）。
 */
import { clampDelayMs, DelayGate, realClock } from './delay.js';
import type { Clock } from './delay.js';
import { executeWebFetch } from './web-fetch.js';
import { executeSleepFromArgs } from './sleep.js';
import { WEB_FETCH_TOOL, SLEEP_TOOL, WEB_CLI_HELP_TOOL } from './tools.js';
import { webFetchHelp, webSleepHelp } from './help.js';
import type { LlmToolDef, WebCliToolCall } from './llm.js';

/** function-calling schema（name+description+parameters 完整函数定义）。 */
export interface ToolFunctionDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** 工具注册条目 —— 一个工具的全部路由知识只存在于此处（FR-001）。 */
export interface ToolEntry {
  /** 工具名（= schema function.name，路由键；5 工具名保持现状）。 */
  name: string;
  /** 一句话用途（help 一览 summary；缺省取 schema description 首句）。 */
  summary?: string;
  /** function-calling schema（name+description+parameters）。 */
  schema: ToolFunctionDef;
  /** 文本命令前缀；缺省 = name（现 5 工具 name===前缀）。 */
  prefix?: string;
  /** 执行器：{subcommand,args} → ToolResult（异步允许）。 */
  executor: ToolExecutor;
  /** help 详情渲染（web-cli-help <tool>）；缺省 = 仅一览。 */
  help?: () => string;
  /** delay 覆盖声明（FR-016）：缺省继承全局；0 = 该工具免除命令间间隔。 */
  delayMs?: number;
  /** 是否出现在 web-cli-help 一览/查询（缺省 true；web-cli-help 自身 false）。 */
  listed?: boolean;
}

/** 统一分发执行契约（FR-002）——对 {tool, args}，不绑 React。 */
export interface ToolResult {
  ok: boolean;
  /** 输出文本（AI 反馈 + 回填 turns 的唯一文本源）。 */
  output: string;
  /** 文档变更标记 + 变更后文档（仅文档变更类工具；场景侧决定如何应用自身状态）。 */
  changed?: boolean;
  source?: string;
  /** 失败原因（!ok 时存在；供调试/日志，进 output 与否由执行器决定）。 */
  error?: string;
}

/** 分发上下文（场景注入：docId/source 等）。 */
export interface ToolContext {
  docId?: string;
  source?: string;
  [k: string]: unknown;
}

/** 执行器入参（子命令 + 平面参数）。 */
export interface ToolCallArgs {
  subcommand: string;
  args: Record<string, string>;
}

export type ToolExecutor = (tc: ToolCallArgs, ctx: ToolContext) => ToolResult | Promise<ToolResult>;

/** 内建工具名（FR-020）。 */
export type BuiltinName = 'web-fetch' | 'sleep' | 'web-cli-help';

/** 内建工具固定顺序（schema 派生置末 / help 一览前置共用）。 */
const BUILTIN_ORDER: BuiltinName[] = ['web-fetch', 'sleep', 'web-cli-help'];

export interface RouterOptions {
  /** 全局命令间最小间隔 ms；默认 0（关闭）；非法值（<0 或 >5000）钳制 + 一次警告（EC-009）。 */
  delayMs?: number;
  /** 时钟注入（FR-017 观测/测试）；默认真实时钟。 */
  clock?: Clock;
  /** 内建自动注册（FR-020）：默认 ['web-fetch','sleep','web-cli-help']；false = 全部不注册。 */
  builtins?: boolean | BuiltinName[];
  /** delay 生效观测钩子（可选；每笔补齐等待回调一次）。 */
  onDelay?: (waitedMs: number, tool: string) => void;
}

export class CommandRouter {
  /** 业务工具注册表（Map 保序 = 注册序）。 */
  private business = new Map<string, ToolEntry>();
  /** 内建工具注册表（固定序）。 */
  private builtins = new Map<string, ToolEntry>();
  /** 钳制等配置告警（EC-009：仅记录一次）。 */
  readonly warnings: string[] = [];
  /** 全局命令间最小间隔（已钳制 [0,5000]；默认 0 = 关闭）。 */
  readonly delayMs: number;
  private gate: DelayGate;

  constructor(options: RouterOptions = {}) {
    const rawDelay = typeof options.delayMs === 'number' ? options.delayMs : 0;
    const clamped = clampDelayMs(rawDelay);
    // 仅有限值超界告警（EC-009）；NaN/±Infinity 走静默关闭分支（=0），
    // 避免「delayMs=NaN 超出合法域」这类非数字告警噪音（IMP-4，与 clampDelayMs 语义对齐）
    if (Number.isFinite(rawDelay) && clamped !== rawDelay) {
      this.warnings.push(`delayMs=${rawDelay} 超出合法域 [0,5000]，已钳制为 ${clamped}（仅警告一次）`);
      console.warn(`[web-cli-base] CommandRouter: ${this.warnings[this.warnings.length - 1]}`);
    }
    this.delayMs = clamped;
    this.gate = new DelayGate(options.clock ?? realClock, options.onDelay);
    // 内建自动注册（FR-020）：构造即注册，一次登记 → schema+前缀+执行+help 四得
    const wantBuiltins =
      options.builtins === false
        ? []
        : Array.isArray(options.builtins)
          ? options.builtins
          : BUILTIN_ORDER;
    for (const name of BUILTIN_ORDER) {
      if (!wantBuiltins.includes(name)) continue;
      this.builtins.set(name, this.buildBuiltinEntry(name));
    }
  }

  private buildBuiltinEntry(name: BuiltinName): ToolEntry {
    switch (name) {
      case 'web-fetch':
        return {
          name,
          summary: '基础 web 获取（独立工具，不属于任何 CLI）',
          schema: WEB_FETCH_TOOL.function,
          executor: async (tc) => {
            const r = await executeWebFetch(tc.args.path ?? '');
            return { ok: r.ok, output: r.lines.join('\n') || '(无输出)', changed: r.changed, source: r.source, error: r.error };
          },
          help: webFetchHelp,
        };
      case 'sleep':
        return {
          name,
          summary: '通用时序等待（独立工具）',
          schema: SLEEP_TOOL.function,
          // delayMs:0 = 免除前置间隔：sleep 自带显式时长即间隔来源（ADR-003/FR-016）
          delayMs: 0,
          executor: async (tc) => {
            const r = await executeSleepFromArgs(tc.args);
            return { ok: r.ok, output: r.lines.join('\n') || '(无输出)', error: r.error };
          },
          help: webSleepHelp,
        };
      case 'web-cli-help':
        return {
          name,
          summary: '顶层工具发现（列出全部可用工具）',
          schema: WEB_CLI_HELP_TOOL.function,
          // listed:false —— 不自列、自查返回未知（EC-010，旧一览 4 工具语义不变）
          listed: false,
          executor: async (tc) => {
            const tool = tc.args.tool ?? '';
            const output = tool
              ? this.helpFor(tool) ?? `✖ 未知工具 "${tool}"（web-cli-help 列出全部可用工具）`
              : this.listHelp();
            return { ok: true, output };
          },
        };
    }
  }

  /** 注册业务工具（重复同名 → 抛错，EC-003）。 */
  register(entry: ToolEntry): this {
    if (this.business.has(entry.name) || this.builtins.has(entry.name)) {
      throw new Error(`工具 "${entry.name}" 已注册（CommandRouter 拒绝重复注册）`);
    }
    this.business.set(entry.name, entry);
    return this;
  }

  has(name: string): boolean {
    return this.business.has(name) || this.builtins.has(name);
  }

  /** 工具名集合 = [业务（注册序）] + [内建（固定序）]（FR-005）。 */
  names(): string[] {
    return [...this.business.keys(), ...this.builtins.keys()];
  }

  /** schema 派生（FR-004/FR-008）：[业务（注册序）] + [内建置末 web-fetch→sleep→web-cli-help]；幂等。 */
  deriveTools(): LlmToolDef[] {
    return this.names().map((n) => {
      const e = this.entry(n)!;
      return { name: e.schema.name, description: e.schema.description, parameters: e.schema.parameters };
    });
  }

  /**
   * 文本命令前缀派生（FR-007）：`${prefix} ${subcommand}`（无子命令仅前缀）+
   * 逐 args `--${k} ${含空白/引号则引号包裹}`（引号规则逐字节对齐旧 toolCallToCommand）。
   * 未注册工具名 → null。
   */
  deriveCommand(tc: WebCliToolCall): string | null {
    const e = this.entry(tc.name);
    if (!e) return null;
    const prefix = e.prefix ?? e.name;
    const parts = tc.subcommand ? [`${prefix} ${tc.subcommand}`] : [prefix];
    for (const [k, v] of Object.entries(tc.args)) {
      parts.push(`--${k} ${/[\s"]/.test(v) ? `"${v}"` : v}`);
    }
    return parts.join(' ');
  }

  /** 一览摘要（条目 summary 缺省取 schema description 首句）。 */
  private summaryOf(e: ToolEntry): string {
    if (e.summary) return e.summary;
    const first = e.schema.description.split('\n')[0].trim();
    return first.length > 0 ? first : e.name;
  }

  /** web-cli-help 一览（注册即得 FR-010）：内建先、业务后贴近旧一览文本（FR-024）。 */
  listHelp(): string {
    const listedEntries = [
      ...this.builtins.values(),
      ...this.business.values(),
    ].filter((e) => e.listed !== false);
    const lines = [`可用工具（${listedEntries.length} 个）：`];
    for (const e of listedEntries) {
      lines.push(`- ${e.name}：${this.summaryOf(e)}`);
    }
    lines.push('');
    lines.push('了解某工具：web-cli-help <tool>（列出全部可用工具）');
    return lines.join('\n');
  }

  /** 某工具详情（注册即得）；未知/未列（listed:false）→ null（EC-010 语义）。 */
  helpFor(name: string): string | null {
    const e = this.entry(name);
    if (!e || e.listed === false) return null;
    const head = `${name} —— ${this.summaryOf(e)}`;
    return e.help ? `${head}\n\n${e.help()}` : head;
  }

  /**
   * 统一分发入口（FR-002/FR-003/FR-013）：
   *   未注册名 → ok:false 显式报错（不等待、不落入执行器）；
   *   已注册名 → delay gate 前置补齐（entry.delayMs ?? 全局）→ 执行器 → 统一结果；
   *   执行器抛异常 → 转 ok:false + 稳定文案，异常明细仅 error 字段（EC-012）。
   */
  async dispatch(tc: WebCliToolCall, ctx?: ToolContext): Promise<ToolResult> {
    const e = this.entry(tc.name);
    if (!e) {
      return { ok: false, output: `✖ 未注册工具 "${tc.name}"`, error: 'unregistered tool' };
    }
    const effDelay = e.delayMs ?? this.delayMs;
    if (effDelay > 0) await this.gate.before(effDelay, e.name);
    try {
      return await e.executor({ subcommand: tc.subcommand, args: tc.args }, ctx ?? {});
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { ok: false, output: `✖ 工具 "${e.name}" 执行异常`, error: detail };
    }
  }

  /** delay 观测（FR-017）。 */
  get stats() {
    return this.gate.stats;
  }

  private entry(name: string): ToolEntry | undefined {
    return this.business.get(name) ?? this.builtins.get(name);
  }
}

/** 创建 CommandRouter（构造即自动注册 3 内建：web-fetch/sleep/web-cli-help）。 */
export function createCommandRouter(options?: RouterOptions): CommandRouter {
  return new CommandRouter(options);
}
