/**
 * CommandRouter —— 顶层工具级路由（ADR-001）：注册表单一数据源 + 统一分发契约。
 *
 * v2 注册表（FR-001~004/038/043，additive 零回归）：在 F-23 单 Map + 内建固定序
 * 之上扩展命名空间/分组/开关/动态注册——注册键 = 全限定名 ns.name（namespace 空 =
 * name，与 F-23 完全一致）；schema.function.name / dispatch 键 / help 查询键三链一致
 * 使用全限定名；同基名不同命名空间可共存；派生顺序契约（业务注册序 + 内建置末）以
 * 「命名空间首次注册序 + 组内注册序」单点延续（router.test.ts:153 零回归，AC-005）。
 *
 * dispatch（FR-002/003/005）统一分发入口，v2 五步链：
 *   1 查条目（全限定名）→ 未注册显式报错（F-23 EC-001 文案保持）
 *   2 enabled 检查 → 已禁用显式错误（EC-001「已禁用」文案互异）
 *   3 ★ PermissionGate.check（框架级；deny → 「权限被拒」，执行器不被调用，
 *     不产生 delay 等待；ask 经 onAsk 桥消化，取消/超时 → deny，FR-005/007）
 *     v3（ADR-001/FR-005）：传入 risk = effectiveRisk（subcommandRisks?.[subcommand]
 *     ?? entry.risk；缺省回退 = v2 行为逐字节一致）；evaluate 档且 policyGate 未装配
 *     → 直接 deny fail-closed（FR-008/ADR-002）；permission/tool-call 审计含 subcommand
 *   4 delay gate（既有钳制语义保持）
 *   5 executor（零改动）→ 异常转 ok:false + 稳定文案（EC-012）
 *   + PostToolUse 审计（audit sink：tc/decision/result/duration/trust，FR-009）
 *
 * 内建自动注册（FR-020）：createCommandRouter() 构造即注册 web-fetch / sleep /
 * web-cli-help 三内建（sleep 条目 delayMs:0 免除前置间隔 ADR-003；web-cli-help
 * listed:false 保持旧一览语义 EC-010）。
 *
 * 本文件零 react/LGDL import（NFR-001/NFR-008）；无业务包时自足可用（AC-001）。
 */
import { clampDelayMs, DelayGate, realClock } from './delay.js';
import type { Clock } from './delay.js';
import { executeWebFetchArgs } from './web-fetch.js';
import { executeSleepFromArgs } from './sleep.js';
import { WEB_FETCH_TOOL, SLEEP_TOOL, WEB_CLI_HELP_TOOL } from './tools.js';
import { webFetchHelp, webSleepHelp } from './help.js';
import type { LlmToolDef, WebCliToolCall } from './llm.js';
import type { ContentTrust, AuditSink } from './audit.js';
import { PermissionGate, createPermissionGate } from './permission.js';
import type { PolicyConfig, PolicyAction, AskQuestion, AskResolution, ToolRisk } from './permission.js';

/** function-calling schema（name+description+parameters 完整函数定义）。 */
export interface ToolFunctionDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** v2 追加：跨工具状态访问面（FR-044：文档态 → 状态态；场景组装注入）。 */
export interface ToolServices {
  /** 会话存储（SessionStore；TASK-006 契约，此处宽松引用防前向依赖）。 */
  session?: unknown;
  /** 跨会话目标存储（GoalStore；TASK-010）。 */
  goals?: unknown;
  /** 后台任务存储（JobStore；TASK-010）。 */
  jobs?: unknown;
  /** 审计接收器（NFR-009）。 */
  audit?: AuditSink;
  [k: string]: unknown;
}

/**
 * 工具注册条目 —— 一个工具的全部路由知识只存在于此处（FR-001）。
 * F-23 既有 9 字段逐字节保持；v2 仅追加可选字段（缺省 = 与旧行为完全一致，FR-043）。
 */
export interface ToolEntry {
  /** 工具基名（= 路由键基名；注册键 = 全限定名 namespace 空时 name 本身）。 */
  name: string;
  /** 一句话用途（help 一览 summary；缺省取 schema description 首句）。 */
  summary?: string;
  /** function-calling schema（name+description+parameters）。 */
  schema: ToolFunctionDef;
  /** 文本命令前缀；缺省 = 全限定名（ns-less = name，现 5 工具 name===前缀）。 */
  prefix?: string;
  /** 执行器：{subcommand,args} → ToolResult（异步允许）。 */
  executor: ToolExecutor;
  /** help 详情渲染（web-cli-help <tool>）；缺省 = 仅一览。 */
  help?: () => string;
  /** delay 覆盖声明（FR-016）：缺省继承全局；0 = 该工具免除命令间间隔。 */
  delayMs?: number;
  /** 是否出现在 web-cli-help 一览/查询（缺省 true；web-cli-help 自身 false）。 */
  listed?: boolean;
  // ---- v2 追加（FR-001/002/004/043；缺省 = 旧行为逐字节一致） ----
  /** 目录分组（help 一览按组分节；缺省按命名空间归组 → 再缺省 'general'）。 */
  group?: string;
  /** 命名空间（'' 顶层业务/内建；skill:/mcp:/ext: 动态源）；缺省 ''（顶层）。 */
  namespace?: string;
  /** 工具开关声明（缺省 true；FR-004；另有路由级 enabledTools 白名单）。 */
  enabled?: boolean;
  /** 敏感面分类提示（'read'|'write'|'external'|'ui'|'state'|'evaluate'；供 PRM 默认取向参考）。 */
  risk?: ToolRisk;
  /**
   * v3（FR-005/ADR-001）：子命令级 risk 声明（子命令 → risk）。
   * 缺省回退 entry.risk（无 subcommandRisks 时行为与 v2 逐字节一致，FR-001 零回归）。
   * dispatch 计算 effectiveRisk = subcommandRisks?.[subcommand] ?? entry.risk，
   * 规则匹配与缺省取向共用该值（只读子命令落 'read' → 缺省 allow 免 ask = IMP-4 修复）。
   */
  subcommandRisks?: Record<string, ToolRisk>;
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
  /** v2 追加（FR-010/043）：外部内容可信标记（网络/外部来源工具携带；不因清洗丢失）。 */
  trust?: ContentTrust;
}

/** 分发上下文（场景注入：docId/source/services 等）。 */
export interface ToolContext {
  docId?: string;
  source?: string;
  /** v2 追加（FR-044）：跨工具状态访问面（场景组装注入 SessionStore/GoalStore/JobStore/audit）。 */
  services?: ToolServices;
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

/** v2：RouterOptions 追加 policy（PermissionGate 配置 + onAsk 桥）与 audit。 */
export interface RouterPolicy extends PolicyConfig {
  /** 场景裁决桥（FR-007）：ask 命中时调用；取消/超时 → deny（EC-002）。 */
  onAsk?: (question: AskQuestion) => AskResolution | Promise<AskResolution>;
}

/** v2：动态注册选项（FR-038/FR-008：来源入审计 + allowed-tools 授权门禁）。 */
export interface RegisterOptions {
  /** 动态源标识（skill:/mcp:/ext:…）；入 audit（FR-038）。 */
  source?: string;
  /** 技能级 allowed-tools（FR-008）：声明该源允许注册/使用的工具全限定名集；越权注册被拒。 */
  allowedTools?: string[];
}

/** 查询过滤（FR-003：按命名空间/名/组/开关）。 */
export interface RouterQuery {
  namespace?: string;
  group?: string;
  /** 工具基名（支持 glob：* 任意串、? 单字符）。 */
  name?: string;
  /** true=仅启用；false=仅禁用；缺省不过滤。 */
  enabled?: boolean;
}

export interface RouterOptions {
  /** 全局命令间最小间隔 ms；默认 0（关闭）；非法值（<0 或 >5000）钳制 + 一次警告（EC-009）。 */
  delayMs?: number;
  /** 时钟注入（FR-017 观测/测试）；默认真实时钟。 */
  clock?: Clock;
  /** 内建自动注册（FR-020）：默认 ['web-fetch','sleep','web-cli-help']；false = 全部不注册。 */
  builtins?: boolean | BuiltinName[];
  /** delay 生效观测钩子（可选；每笔补齐等待回调一次）。 */
  onDelay?: (waitedMs: number, tool: string) => void;
  /** v2（FR-005/007）：框架级权限门禁配置 + ask 桥；缺省不装 = F-23 行为零开销。 */
  policy?: RouterPolicy;
  /** v2（FR-009/038，NFR-009）：审计接收器；缺省不记录。 */
  audit?: AuditSink;
}

/** 组键派生：group → namespace → 'general'（FR-001 缺省归组）。 */
function groupKeyOf(e: ToolEntry): string {
  return e.group ?? e.namespace ?? 'general';
}

/** 全限定名派生（namespace 空 = name，F-23 一致）。 */
export function fqNameOf(e: Pick<ToolEntry, 'name' | 'namespace'>): string {
  return e.namespace ? `${e.namespace}.${e.name}` : e.name;
}

function globMatchTool(text: string, pattern: string): boolean {
  if (pattern === '*') return true;
  const esc = (seg: string): string => seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `^${pattern
      .split('*')
      .map((seg) => seg.split('?').map(esc).join('.'))
      .join('.*')}$`,
  );
  return re.test(text);
}

export class CommandRouter {
  /** 业务/域工具注册表（fqn → 条目；Map 保序 = 注册序）。 */
  private business = new Map<string, ToolEntry>();
  /** 内建工具注册表（固定序）。 */
  private builtins = new Map<string, ToolEntry>();
  /** 命名空间首次注册序（业务/域工具；'' 缺省顶层）。 */
  private nsSeen: string[] = [];
  /** 命名空间内 fqn 注册序。 */
  private nsFqns = new Map<string, string[]>();
  /** 命名空间次序覆盖（setNamespaceOrder；缺省 = 首次注册序）。 */
  private nsOrderOverride: string[] | null = null;
  /** 动态源注册来源（fqn → source；FR-038 审计/卸载联动）。 */
  private sourceByFqn = new Map<string, string>();
  /** 路由级启用白名单（enabledTools；null = 全启用缺省）。 */
  private enabledWhitelist: Set<string> | null = null;
  /** 钳制等配置告警（EC-009：仅记录一次）。 */
  readonly warnings: string[] = [];
  /** 全局命令间最小间隔（已钳制 [0,5000]；默认 0 = 关闭）。 */
  readonly delayMs: number;
  /** v2：框架级权限门禁（RouterOptions.policy 装配；缺省 null = F-23 零开销）。 */
  readonly policyGate: PermissionGate | null;
  private readonly policyOnAsk: RouterPolicy['onAsk'];
  /** v2：审计接收器（缺省 null = 不记录）。 */
  readonly auditSink: AuditSink | null;
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
    this.policyGate = options.policy ? new PermissionGate(options.policy) : null;
    this.policyOnAsk = options.policy?.onAsk;
    this.auditSink = options.audit ?? null;
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
            const r = await executeWebFetchArgs(tc.args);
            return { ok: r.ok, output: r.lines.join('\n') || '(无输出)', changed: r.changed, source: r.source, error: r.error, trust: r.trust };
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

  /**
   * 注册业务/域工具（v2：注册键 = 全限定名；重复同命名空间同名 → 抛错 EC-003/EC-010）。
   * 动态源（opts.source）全流程入 audit（FR-038）；opts.allowedTools 越权 → 注册被拒（FR-008）。
   */
  register(entry: ToolEntry, opts?: RegisterOptions): this {
    const ns = entry.namespace ?? '';
    if (!ns && entry.name.includes('.')) {
      throw new Error(
        `工具名 "${entry.name}" 含 "." 但未声明 namespace —— 命名空间内工具请显式声明 namespace（EC-010 命名空间纪律）`,
      );
    }
    const fqn = fqNameOf(entry);
    if (this.business.has(fqn) || this.builtins.has(fqn)) {
      throw new Error(`工具 "${fqn}" 已注册（CommandRouter 拒绝重复注册）`);
    }
    // FR-008：allowed-tools 授权校验（扩展源注册时校验；默认被拒 + 审计）
    if (opts?.allowedTools && opts.allowedTools.length > 0 && !opts.allowedTools.includes(fqn)) {
      this.recordAudit({
        type: 'extension-register',
        tool: fqn,
        source: opts.source,
        namespace: ns || undefined,
        name: fqn,
        detail: `rejected: ${fqn} 不在 allowed-tools 授权集`,
      });
      throw new Error(`工具 "${fqn}" 不在该源的 allowed-tools 授权集（注册被拒，FR-008）`);
    }
    this.business.set(fqn, entry);
    if (!this.nsSeen.includes(ns)) this.nsSeen.push(ns);
    const list = this.nsFqns.get(ns) ?? [];
    list.push(fqn);
    this.nsFqns.set(ns, list);
    if (opts?.source) {
      this.sourceByFqn.set(fqn, opts.source);
      this.recordAudit({
        type: 'extension-register',
        ts: Date.now(),
        tool: fqn,
        source: opts.source,
        namespace: ns || undefined,
        name: fqn,
      });
    }
    return this;
  }

  /** v2：卸载（FR-003）：schema/help/dispatch 三链即时消失；内建不可卸载；成功返回 true。 */
  unregister(fqn: string): boolean {
    const entry = this.business.get(fqn);
    if (!entry) return false;
    const ns = entry.namespace ?? '';
    this.business.delete(fqn);
    const list = this.nsFqns.get(ns);
    if (list) {
      const idx = list.indexOf(fqn);
      if (idx >= 0) list.splice(idx, 1);
      if (list.length === 0) {
        this.nsFqns.delete(ns);
        const seenIdx = this.nsSeen.indexOf(ns);
        if (seenIdx >= 0) this.nsSeen.splice(seenIdx, 1);
      }
    }
    const source = this.sourceByFqn.get(fqn);
    if (source) {
      this.sourceByFqn.delete(fqn);
      this.recordAudit({
        type: 'extension-unregister',
        ts: Date.now(),
        tool: fqn,
        source,
        namespace: ns || undefined,
        name: fqn,
      });
    }
    return true;
  }

  /** v2：查询（FR-003：按命名空间/组/名（glob）/启用态）。返回注册序排列的条目。 */
  query(filter: RouterQuery = {}): ToolEntry[] {
    return this.orderedBusinessFqns()
      .map((fqn) => this.business.get(fqn)!)
      .filter((e) => {
        const fqn = fqNameOf(e);
        if (filter.namespace !== undefined && (e.namespace ?? '') !== filter.namespace) return false;
        if (filter.group !== undefined && groupKeyOf(e) !== filter.group) return false;
        if (filter.name !== undefined && !globMatchTool(e.name, filter.name)) return false;
        if (filter.enabled !== undefined && this.isEnabled(fqn) !== filter.enabled) return false;
        return true;
      });
  }

  /** v2：路由级启用白名单（FR-004）：只启用集合内工具（含内建）；空集合 = 全启用。 */
  enabledTools(names: Iterable<string>): this {
    this.enabledWhitelist = new Set(names);
    return this;
  }

  /** 清空启用白名单（恢复全启用）。 */
  enableAllTools(): this {
    this.enabledWhitelist = null;
    return this;
  }

  /** 工具是否在当前启用态（FR-004：entry.enabled 声明 && 白名单）。 */
  isEnabled(fqn: string): boolean {
    const e = this.entry(fqn);
    if (!e) return false;
    if (e.enabled === false) return false;
    if (this.enabledWhitelist !== null && !this.enabledWhitelist.has(fqn)) return false;
    return true;
  }

  /** v2：命名空间次序配置（FR-002）；缺省 = 首次注册序。 */
  setNamespaceOrder(namespaces: string[]): this {
    this.nsOrderOverride = [...namespaces];
    return this;
  }

  /** 命名空间展开次序（配置优先；未配置的命名空间按首次注册序置后）。 */
  private orderedNamespaces(): string[] {
    if (!this.nsOrderOverride) return [...this.nsSeen];
    const rest = this.nsSeen.filter((ns) => !this.nsOrderOverride!.includes(ns));
    return [...this.nsOrderOverride, ...rest];
  }

  /** 业务/域工具全限定名（按命名空间次序 + 组内注册序）。 */
  private orderedBusinessFqns(): string[] {
    const out: string[] = [];
    for (const ns of this.orderedNamespaces()) {
      const list = this.nsFqns.get(ns);
      if (list) out.push(...list);
    }
    return out;
  }

  has(name: string): boolean {
    return this.business.has(name) || this.builtins.has(name);
  }

  /** 工具名集合 = [业务/域（命名空间次序 + 注册序）] + [内建（固定序）]（FR-005）。 */
  names(): string[] {
    return [...this.orderedBusinessFqns(), ...this.builtins.keys()];
  }

  /**
   * schema 派生（FR-004/FR-008）：[业务/域（注册序，enabled 过滤）] + [内建置末]；
   * 幂等。v2 选项：group/namespace 切片 + enabled 开关（缺省只含启用工具）。
   * 缺省全量顺序 = 原 F-23 顺序契约（router.test.ts:153 零回归，AC-005）。
   */
  deriveTools(opts: { group?: string; namespace?: string; enabled?: boolean } = {}): LlmToolDef[] {
    const want = opts.enabled ?? true; // 缺省只含启用工具（FR-004 禁用不入 schema）
    const names = this.names().filter((fqn) => {
      const e = this.entry(fqn)!;
      if (opts.group !== undefined && groupKeyOf(e) !== opts.group) return false;
      if (opts.namespace !== undefined && (e.namespace ?? '') !== opts.namespace) return false;
      if (this.isEnabled(fqn) !== want) return false;
      return true;
    });
    return names.map((fqn) => {
      const e = this.entry(fqn)!;
      return { name: fqn, description: e.schema.description, parameters: e.schema.parameters };
    });
  }

  /**
   * 文本命令前缀派生（FR-007）：`${prefix} ${subcommand}`（无子命令仅前缀）+
   * 逐 args `--${k} ${含空白/引号则引号包裹}`（引号规则逐字节对齐旧 toolCallToCommand）。
   * 未注册工具名 → null。v2：prefix 缺省 = 全限定名（可逆解析回 {namespace, name}）。
   */
  deriveCommand(tc: WebCliToolCall): string | null {
    const e = this.entry(tc.name);
    if (!e) return null;
    const prefix = e.prefix ?? tc.name;
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

  /**
   * web-cli-help 一览（注册即得 FR-010）：内建先、业务后贴近旧一览文本（FR-024）；
   * v2 按组分节（≥2 组时插 `[group]` 头；单组 = 旧文本逐字节一致）；已禁用条目标注。
   */
  listHelp(): string {
    const builtinList = [...this.builtins.values()];
    const businessList = this.orderedBusinessFqns().map((fqn) => this.business.get(fqn)!);
    const display = [...builtinList, ...businessList].filter((e) => e.listed !== false);
    const groups = new Map<string, ToolEntry[]>();
    for (const e of display) {
      const g = groupKeyOf(e);
      const arr = groups.get(g) ?? [];
      arr.push(e);
      groups.set(g, arr);
    }
    const lines = [`可用工具（${display.length} 个）：`];
    const multiple = groups.size > 1;
    for (const [g, entries] of groups) {
      if (multiple) lines.push(`[${g}]`);
      for (const e of entries) {
        const fqn = fqNameOf(e);
        const disabled = this.isEnabled(fqn) ? '' : '（已禁用）';
        lines.push(`- ${fqn}：${this.summaryOf(e)}${disabled}`);
      }
    }
    lines.push('');
    lines.push('了解某工具：web-cli-help <tool>（列出全部可用工具）');
    return lines.join('\n');
  }

  /** 某工具详情（注册即得）；未知/未列（listed:false）→ null（EC-010 语义）。 */
  helpFor(name: string): string | null {
    const e = this.entry(name);
    if (!e || e.listed === false) return null;
    const fqn = fqNameOf(e);
    const disabled = this.isEnabled(fqn) ? '' : '\n\n（该工具当前已禁用：不在启用集或声明 enabled:false）';
    const head = `${fqn} —— ${this.summaryOf(e)}`;
    return e.help ? `${head}\n\n${e.help()}${disabled}` : `${head}${disabled}`;
  }

  /**
   * 统一分发入口（FR-002/003/005/013）v2 五步链：
   *   未注册名 → ok:false 显式报错（不等待、不落入执行器）；
   *   已禁用 → ok:false「已禁用」显式错误（EC-001 文案互异）；
   *   权限门禁 deny → ok:false「权限被拒」，执行器不被调用、不产生 delay 等待；
   *   delay gate 前置补齐（entry.delayMs ?? 全局）→ 执行器 → 统一结果；
   *   执行器抛异常 → 转 ok:false + 稳定文案，异常明细仅 error 字段（EC-012）；
   *   PostToolUse 审计（tool-call：ok/duration/outputChars/trust）。
   */
  async dispatch(tc: WebCliToolCall, ctx?: ToolContext): Promise<ToolResult> {
    const fqn = tc.name;
    const e = this.entry(fqn);
    if (!e) {
      return { ok: false, output: `✖ 未注册工具 "${fqn}"`, error: 'unregistered tool' };
    }
    // 2 enabled 检查（EC-001「已禁用」文案互异于「未注册」/「权限被拒」）
    if (!this.isEnabled(fqn)) {
      return { ok: false, output: `✖ 工具 "${fqn}" 已禁用（不在当前启用集或声明 enabled:false）`, error: 'tool disabled' };
    }
    const callCtx = ctx ?? {};
    // 3 权限门禁（FR-005：与 delay gate 同层、先于执行器；deny 短路不产生 delay）
    // v3（ADR-001/FR-005）：effectiveRisk = subcommandRisks?.[subcommand] ?? entry.risk，
    // 规则匹配（risk 过滤面）与缺省取向共用同一 effectiveRisk。
    const effectiveRisk = e.subcommandRisks?.[tc.subcommand] ?? e.risk;
    if (this.policyGate) {
      const decision = await this.policyGate.check(
        {
          tool: fqn,
          namespace: e.namespace,
          group: e.group,
          risk: effectiveRisk,
          subcommand: tc.subcommand,
          args: tc.args,
          ctx: callCtx as Record<string, unknown>,
        },
        this.policyOnAsk ? { onAsk: this.policyOnAsk } : {},
      );
      this.recordAudit({
        type: 'permission',
        ts: Date.now(),
        tool: fqn,
        subcommand: tc.subcommand,
        decision: decision.action,
        reason: decision.reason,
        by: decision.by,
        detail: `ruleIndex=${decision.ruleIndex ?? '-'}`,
      });
      if (decision.action === 'deny') {
        return { ok: false, output: decision.reason, error: 'permission denied' };
      }
    } else if (effectiveRisk === 'evaluate') {
      // v3 fail-closed（FR-008/ADR-002）：evaluate 最高档且 policyGate 未装配 → 直接 deny
      // （无策略宿主绝不静默执行；page-eval 需场景策略显式开启 + 门禁装配），执行器不被调用
      const reason = `✖ 工具 "${fqn}" 的 evaluate 风险档调用被拒绝：page-eval 需场景策略显式开启 + 门禁装配`;
      this.recordAudit({
        type: 'permission',
        ts: Date.now(),
        tool: fqn,
        subcommand: tc.subcommand,
        decision: 'deny',
        reason,
        by: 'fail-closed',
        detail: 'effectiveRisk=evaluate 且 policyGate 未装配（无策略宿主 fail-closed，FR-008）',
      });
      return { ok: false, output: reason, error: 'permission denied (evaluate fail-closed)' };
    }
    // 4 delay gate（既有；effDelay 钳制语义保持）
    const effDelay = e.delayMs ?? this.delayMs;
    if (effDelay > 0) await this.gate.before(effDelay, fqn);
    // 5 executor（零改动）
    const t0 = Date.now();
    try {
      const result = await e.executor({ subcommand: tc.subcommand, args: tc.args }, callCtx);
      this.recordAudit({
        type: 'tool-call',
        ts: Date.now(),
        tool: fqn,
        subcommand: tc.subcommand,
        ok: result.ok,
        durationMs: Date.now() - t0,
        outputChars: result.output.length,
        trust: result.trust,
      });
      return result;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.recordAudit({
        type: 'tool-call',
        ts: Date.now(),
        tool: fqn,
        subcommand: tc.subcommand,
        ok: false,
        durationMs: Date.now() - t0,
        detail,
      });
      return { ok: false, output: `✖ 工具 "${fqn}" 执行异常`, error: detail };
    }
  }

  /** delay 观测（FR-017）。 */
  get stats() {
    return this.gate.stats;
  }

  private recordAudit(ev: {
    type: 'permission' | 'tool-call' | 'extension-register' | 'extension-unregister';
    ts?: number;
    tool?: string;
    source?: string;
    namespace?: string;
    name?: string;
    decision?: string;
    reason?: string;
    by?: string;
    /** v3（NFR-008）：子命令（permission/tool-call 裁决与调用均带子命令，供回放）。 */
    subcommand?: string;
    ok?: boolean;
    durationMs?: number;
    outputChars?: number;
    trust?: ContentTrust;
    detail?: string;
  }): void {
    if (!this.auditSink) return;
    this.auditSink.record({ ...ev, ts: ev.ts ?? Date.now() });
  }

  private entry(name: string): ToolEntry | undefined {
    return this.business.get(name) ?? this.builtins.get(name);
  }
}

/** 创建 CommandRouter（构造即自动注册 3 内建：web-fetch/sleep/web-cli-help）。 */
export function createCommandRouter(options?: RouterOptions): CommandRouter {
  return new CommandRouter(options);
}
