/**
 * PermissionGate —— 框架级权限门禁（FR-005~008/EC-001/002/014，ADR-002 挂点）。
 *
 * 生态位（discovery §3.3 D 组）：浏览器无工具级权限原生等价 → 应用级工具权限门禁
 * 是横切机制而非工具。opencode 三元组骨架（规则集）+ dsh 可插拔策略对象 +
 * WorkBuddy 技能级 allowed-tools 三者组合（作者裁决 A-03），挂 router.dispatch
 * 框架级钩子（与 delay gate 同层、先于执行器），ask UI 归场景、裁决契约归 base。
 *
 * 裁决管线（优先级自高向低，可预测）：
 *   ① allowed-tools 白名单（扩展源注册时已校验，此处为冗余护栏）→ deny
 *   ② 三元组规则集（顺序敏感；EC-014 deny 优先：任一条 deny 命中即 deny）
 *   ③ dsh 可插拔策略对象（依序首个非 null 结果覆盖规则集裁决）
 *   ④ 缺省取向（defaultAction 或按 risk 的 riskDefaults 取向表）
 *   → ask 命中：分发挂起，等场景 onAsk 裁决（FR-007）；取消/超时 → deny + reason
 *
 * 默认取向：只读（read/未声明）→ allow；敏感面（write/external/ui/state）→ ask；
 * 「危险=deny」由场景经规则/riskDefaults 显式声明（默认安全：deny 优先 EC-014）。
 *
 * 本文件零 LGDL/react import（NFR-001）；无策略配置时 check() 零额外开销（NFR-005）。
 */
import type { Clock } from './delay.js';

/** 工具敏感面分类（ToolEntry.risk 声明；供 PRM 默认取向参考，非裁决本身）。 */
export type ToolRisk = 'read' | 'write' | 'external' | 'ui' | 'state';

/** 权限裁决三态。 */
export type PolicyAction = 'allow' | 'ask' | 'deny';

/**
 * 三元组规则（opencode 骨架生态位）：{pattern/group/namespace/risk 匹配 → action}。
 * 任一过滤面缺省 = 不限制；全部过滤面缺省 = 全局规则（匹配一切）。
 */
export interface PolicyRule {
  /** 匹配目标全限定名（glob：* 任意串、? 单字符）；缺省不限。 */
  pattern?: string;
  /** 按目录分组匹配（group 字段）；缺省不限。 */
  group?: string;
  /** 按命名空间匹配（如 'skill'）；缺省不限。 */
  namespace?: string;
  /** 按敏感面匹配（risk 字段）；缺省不限。 */
  risk?: ToolRisk;
  action: PolicyAction;
  /** 规则说明（审计/ask 呈现）。 */
  note?: string;
}

/** 规则集裁决上下文。 */
export interface RuleCheckContext {
  /** 全限定名（ns.name；namespace 空 = name）。 */
  tool: string;
  namespace?: string;
  group?: string;
  risk?: ToolRisk;
}

/** dsh 可插拔策略对象（部署方注入；如 read-before-edit）。 */
export interface PolicyStrategy {
  /** 策略名（审计可见）。 */
  name: string;
  /**
   * 返回 action 覆盖当前裁决；返回 null = 不表态（交给后续策略/缺省取向）。
   * 依序执行，首个非 null 结果生效。
   */
  check(input: StrategyCheckContext): PolicyAction | null | Promise<PolicyAction | null>;
}

export interface StrategyCheckContext extends RuleCheckContext {
  /** 子命令 + 平面参数（工具内部分层策略可据此判断读/写子命令）。 */
  subcommand: string;
  args: Record<string, string>;
  /** 分发上下文（docId/source/services…；场景注入）。 */
  ctx: Record<string, unknown>;
  /** 规则集已给出的裁决（无规则命中 = null）。 */
  ruleDecision: PolicyAction | null;
}

/** ask 问题结构（场景 UI 呈现）。 */
export interface AskQuestion {
  tool: string;
  reason: string;
  risk?: ToolRisk;
  group?: string;
  namespace?: string;
  subcommand?: string;
  args?: Record<string, string>;
}

/** 场景裁决结果。 */
export interface AskResolution {
  action: 'allow' | 'deny';
  /** 记住本次选择（场景侧可缓存；base 不强制持久化语义）。 */
  remember?: boolean;
}

/** ask 挂起句柄：分发挂起期间场景经 settle 裁决（FR-007 挂起/恢复契约）。 */
export interface AskHandle {
  readonly question: AskQuestion;
  readonly settled: Promise<AskResolution>;
  settle(resolution: AskResolution): void;
}

/** 创建 ask 挂起句柄（场景 AskDialog 等持有；允许在裁决前挂起展示）。 */
export function createAskHandle(question: AskQuestion): AskHandle {
  let settle!: (r: AskResolution) => void;
  const settled = new Promise<AskResolution>((res) => {
    settle = res;
  });
  return { question, settled, settle };
}

/** 最终裁决（含 reason 供审计/错误输出）。 */
export interface PermissionDecision {
  action: PolicyAction;
  /** 人类可读裁决原因（deny 时含「权限被拒」前缀；ask 挂起失败含取消/超时语义）。 */
  reason: string;
  /** 决定性来源（'allowed-tools' | 'rule' | 'strategy:<name>' | 'default' | 'ask'）。 */
  by?: string;
  /** 命中的规则索引（规则集裁决时）。 */
  ruleIndex?: number;
}

/** 门禁 hooks（场景注入 ask 裁决桥 + 测试时钟）。 */
export interface PermissionGateHooks {
  /** 场景裁决桥：返回 allow/deny；不返回 = 挂起（Promise pending 直到 UI 裁决）。 */
  onAsk?: (question: AskQuestion) => AskResolution | Promise<AskResolution>;
  /** 时钟注入（超时计时；测试用手动时钟）。 */
  clock?: Clock;
  /** 本次 check 的 ask 超时覆盖（ms；缺省用 config.askTimeoutMs）。 */
  askTimeoutMs?: number;
}

/** 门禁配置（RouterOptions.policy 承接）。 */
export interface PolicyConfig {
  /** 三元组规则集（顺序敏感；deny 优先见 denyPriority）。 */
  rules?: PolicyRule[];
  /** dsh 可插拔策略对象（依序；首个非 null 覆盖规则集）。 */
  strategies?: PolicyStrategy[];
  /** 技能级 allowed-tools 白名单（全限定名；运行时冗余护栏 FR-008）。 */
  allowedTools?: Iterable<string>;
  /** 规则/策略均未命中时的缺省动作；缺省 = 按 riskDefaults（无 risk/read → allow）。 */
  defaultAction?: PolicyAction;
  /** 按敏感面的缺省取向表；缺省 read/未声明=allow，write/external/ui/state=ask。 */
  riskDefaults?: Partial<Record<ToolRisk, PolicyAction>>;
  /** EC-014 deny 优先：allow 与 deny 冲突时 deny 胜（缺省 true = 默认安全）。 */
  denyPriority?: boolean;
  /** ask 超时 ms（EC-002；缺省 20000；0 = 永不超时，永久等待场景裁决）。 */
  askTimeoutMs?: number;
}

/** 缺省取向：只读 allow / 敏感 ask / 危险 deny（后两者经 config.riskDefaults 声明）。 */
export function defaultActionForRisk(risk?: ToolRisk): PolicyAction {
  return risk && risk !== 'read' ? 'ask' : 'allow';
}

/** glob 匹配（* 任意串、? 单字符；用于全限定名/组/命名空间）。 */
export function globMatch(text: string, pattern: string): boolean {
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

export class PermissionGate {
  readonly config: PolicyConfig;
  private readonly denyPriority: boolean;
  private readonly askTimeoutMs: number;

  constructor(config: PolicyConfig = {}) {
    this.config = config;
    this.denyPriority = config.denyPriority !== false; // EC-014 缺省 deny 优先
    this.askTimeoutMs = config.askTimeoutMs ?? 20000;
  }

  /**
   * 是否没有任何显式策略配置（rules/strategies/allowedTools/defaultAction/riskDefaults 全空）。
   * 注意：空配置 gate 仍按风险缺省取向裁决（只读放行/敏感 ask）；
   * router 层「无 policy 配置 → 不装 gate」才是 NFR-005 零额外开销路径。
   */
  get inactive(): boolean {
    const c = this.config;
    return (
      !c.rules?.length &&
      !c.strategies?.length &&
      !c.allowedTools &&
      c.defaultAction === undefined &&
      !Object.keys(c.riskDefaults ?? {}).length
    );
  }

  /** 规则是否命中输入（pattern/group/namespace/risk 任一限定匹配即命中）。 */
  ruleMatches(rule: PolicyRule, input: RuleCheckContext): boolean {
    if (rule.pattern !== undefined && !globMatch(input.tool, rule.pattern)) return false;
    if (rule.group !== undefined && rule.group !== input.group) return false;
    if (rule.namespace !== undefined && rule.namespace !== input.namespace) return false;
    if (rule.risk !== undefined && rule.risk !== input.risk) return false;
    return true;
  }

  /**
   * 执行裁决管线。返回最终 action（ask 已消化为 allow/deny）+ 人类可读 reason。
   * 空配置 gate 走风险缺省取向（无 risk/read → allow；敏感面 → ask）。
   */
  async check(input: RuleCheckContext & { subcommand?: string; args?: Record<string, string>; ctx?: Record<string, unknown> }, hooks: PermissionGateHooks = {}): Promise<PermissionDecision> {
    const call = { subcommand: input.subcommand ?? '', args: input.args ?? {}, ctx: input.ctx ?? {} };

    // ① allowed-tools 白名单（冗余护栏 FR-008）
    const allowed = this.config.allowedTools;
    if (allowed) {
      const set = allowed instanceof Set ? allowed : new Set(allowed);
      if (!set.has(input.tool)) {
        return { action: 'deny', reason: `权限被拒：工具 "${input.tool}" 不在 allowed-tools 白名单`, by: 'allowed-tools' };
      }
    }

    // ② 三元组规则集
    let ruleDecision: { action: PolicyAction; index: number; note?: string } | null = null;
    const matched: { action: PolicyAction; index: number; note?: string }[] = [];
    for (let i = 0; i < (this.config.rules?.length ?? 0); i++) {
      const rule = this.config.rules![i];
      if (this.ruleMatches(rule, input)) matched.push({ action: rule.action, index: i, note: rule.note });
    }
    if (matched.length > 0) {
      if (this.denyPriority) {
        const denyRule = matched.find((m) => m.action === 'deny');
        ruleDecision = denyRule ?? matched[0]; // deny 优先；否则顺序首个
      } else {
        ruleDecision = matched[0];
      }
    }

    // ③ dsh 策略对象（依序首个非 null 覆盖）
    let strategyName: string | undefined;
    let strategyAction: PolicyAction | null = null;
    for (const s of this.config.strategies ?? []) {
      const action = await s.check({
        tool: input.tool,
        namespace: input.namespace,
        group: input.group,
        risk: input.risk,
        subcommand: call.subcommand,
        args: call.args,
        ctx: call.ctx,
        ruleDecision: ruleDecision?.action ?? null,
      });
      if (action !== null) {
        strategyAction = action;
        strategyName = s.name;
        break;
      }
    }

    // ④ 缺省取向
    let action: PolicyAction;
    let by: string;
    if (strategyAction !== null) {
      action = strategyAction;
      by = `strategy:${strategyName}`;
    } else if (ruleDecision) {
      action = ruleDecision.action;
      by = 'rule';
    } else if (this.config.defaultAction !== undefined) {
      action = this.config.defaultAction;
      by = 'default';
    } else {
      const riskAction = this.config.riskDefaults?.[input.risk ?? ('read' as ToolRisk)] ?? defaultActionForRisk(input.risk);
      action = riskAction;
      by = 'default';
    }

    // ⑤ ask 消化（FR-007/EC-002）
    if (action !== 'ask') {
      return { action, reason: this.reasonOf(action, by, ruleDecision), by, ruleIndex: ruleDecision?.index };
    }

    return this.settleAsk(
      {
        tool: input.tool,
        reason: this.reasonOf('ask', by, ruleDecision),
        risk: input.risk,
        group: input.group,
        namespace: input.namespace,
        subcommand: call.subcommand,
        args: call.args,
      },
      hooks,
      by,
      ruleDecision?.index,
    );
  }

  private reasonOf(action: PolicyAction, by: string, rule?: { action: PolicyAction; note?: string } | null): string {
    if (by === 'rule') {
      const note = rule?.note ? `（${rule.note}）` : '';
      return action === 'deny'
        ? `权限被拒：命中规则 action=deny${note}`
        : action === 'ask'
          ? `需确认：命中规则 action=ask${note}`
          : `命中规则 action=allow${note}`;
    }
    if (by.startsWith('strategy:')) {
      return action === 'deny'
        ? `权限被拒：策略 ${by.slice('strategy:'.length)} 拒绝`
        : action === 'ask'
          ? `需确认：策略 ${by.slice('strategy:'.length)} 要求确认`
          : `策略 ${by.slice('strategy:'.length)} 放行`;
    }
    if (by === 'allowed-tools') return '权限被拒：不在 allowed-tools 白名单';
    return action === 'deny' ? '权限被拒：命中缺省 deny 取向' : action === 'ask' ? '需确认：命中缺省 ask 取向（敏感面）' : '缺省取向放行';
  }

  /** ask → 场景裁决桥（onAsk）消化；无桥/取消/超时 → deny（EC-002 语义）。 */
  private async settleAsk(
    question: AskQuestion,
    hooks: PermissionGateHooks,
    by: string,
    ruleIndex: number | undefined,
  ): Promise<PermissionDecision> {
    const onAsk = hooks.onAsk;
    if (!onAsk) {
      return { action: 'deny', reason: `权限被拒：ask 命中但未配置 onAsk 裁决桥（按 deny 处理）`, by, ruleIndex };
    }
    const timeoutMs = hooks.askTimeoutMs ?? this.askTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      const resolution = await Promise.race([
        Promise.resolve(onAsk(question)),
        new Promise<AskResolution>((resolve) => {
          if (timeoutMs <= 0) return; // 永不超时：不设定时器
          timer = setTimeout(() => {
            timedOut = true;
            resolve({ action: 'deny' });
          }, timeoutMs);
        }),
      ]);
      if (resolution.action === 'allow') {
        return { action: 'allow', reason: `用户确认放行：${question.reason}`, by: 'ask', ruleIndex };
      }
      return {
        action: 'deny',
        reason: timedOut ? '权限被拒：ask 超时未裁决（按 deny 处理，EC-002）' : '权限被拒：用户取消/拒绝（ask 裁决 deny）',
        by: 'ask',
        ruleIndex,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

/** 创建 PermissionGate（RouterOptions.policy 承接）。 */
export function createPermissionGate(config?: PolicyConfig): PermissionGate {
  return new PermissionGate(config);
}
