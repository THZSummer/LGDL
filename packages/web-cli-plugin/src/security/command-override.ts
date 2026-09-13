/**
 * V2-3 R2 —— 命令级用户覆盖层（FR-V2-074/075/076；ADR-V2-024 / 025 / 026 / 027）。
 *
 * 本模块是**新增的独立层**，在既有判定链**之后**以 clamp 方式生效：
 *   - **不 import / 不修改** `security/policy.ts` / `security/auto-authorize.ts`（判定链
 *     源码 sha256 恒为 P0 pin）；`withCommandOverride` 接收 `createPluginPolicyConfig(...)`
 *     的**返回值对象**，返回**新对象**（仅重排 `strategies` + 追加 clamp 策略）。
 *   - 策略链顺序 `[S1, S3, override, S2]`（按 name 定位，缺一即抛错 FAIL）：S1/S3 先于覆盖
 *     短路 → 未授权 origin / 未知非法 risk 永不被覆盖放宽。
 *   - 优先级 = **硬底线（不可覆盖）> 用户覆盖 > 默认 risk 档**；只可收紧、不可放宽越界。
 *
 * 纯逻辑 + kv 注入（与 `auto-authorize.ts` 同款纪律）：本模块**零 `chrome.*`**、零明文。
 */
import type { PolicyAction, PolicyStrategy, RouterPolicy, ToolRisk } from '@lgdl/web-cli-base';
import { isToolRisk } from '../protocol/descriptor.js';
import { DESTRUCTIVE_VERBS } from '../tools/declared-tools.js';
import { STABLE_KEY } from '../insight/tree-model.js';
import type { PluginAuditSink } from './audit-sink.js';

// ---------------------------------------------------------------------------
// 命令键（与 STABLE_KEY.command 单源同形）+ 覆盖数据形状
// ---------------------------------------------------------------------------

/** `chrome.storage.local` 单键（`storage` 权限已有 → **不新增权限**）。 */
export const COMMAND_POLICY_STORAGE_KEY = 'web-cli:command-policy';

/** 覆盖文档结构版本（additive 演进预留）。 */
export const COMMAND_POLICY_VERSION = 1;

export type CommandPolicyAction = PolicyAction;

export interface CommandPolicyEntry {
  action: CommandPolicyAction;
  updatedAt: number;
}

export interface CommandPolicyDocument {
  version: typeof COMMAND_POLICY_VERSION;
  entries: Record<string, CommandPolicyEntry>;
}

export interface CommandPolicyKv {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

/** `commandId` = `cmd:<name>` / `cmd:<name>#<sub>`（与 `STABLE_KEY.command` 同源锚定）。 */
export function commandIdOf(name: string, subcommand?: string): string {
  return STABLE_KEY.command(name, subcommand);
}

/** 运行时判定合法处置档（伪造消息的防御；非法值一律拒绝）。 */
export function isCommandPolicyAction(value: unknown): value is CommandPolicyAction {
  return value === 'allow' || value === 'ask' || value === 'deny';
}

const COMMAND_ID_RE = /^cmd:[^#]+(?:#.+)?$/;

/** 运行时判定合法命令键（拒绝任何非 `cmd:` 形状的伪造键）。 */
export function isCommandId(value: unknown): value is string {
  return typeof value === 'string' && COMMAND_ID_RE.test(value);
}

/**
 * 被调用 (tool, subcommand) 是否属**破坏性写**（FR-V2-076 ④ 保底 `ask`）。
 *
 * 判据（ADR-V2-025）：`risk === 'write' && DESTRUCTIVE_VERBS.has(<调用子命令>)`。
 * **不使用** `isPluginDestructiveInvocation` 的「未知 → true」默认（否则会把
 * `dom read-state` 误判为破坏性、破坏作者示例）。fail-closed 方向：写档但缺子命令
 * 视为不可判定的破坏性（更保守）。
 */
export function isCommandDestructive(risk: ToolRisk | undefined, subcommand?: string): boolean {
  if (risk !== 'write') return false;
  const sub = (subcommand ?? '').trim();
  if (!sub) return true;
  return DESTRUCTIVE_VERBS.has(sub.toLowerCase());
}

// ---------------------------------------------------------------------------
// clamp（服务端强制；逐档单测）
// ---------------------------------------------------------------------------

/** 覆盖被硬底线拒绝/降级的原因（可读映射见渲染层）。 */
export type ClampReason =
  | 'evaluate'
  | 's1-unauthorized'
  | 's3-unknown-risk'
  | 'destructive-floor'
  | 'ui-no-widen'
  | 'state-no-widen'
  | 'external-no-widen';

/** 判定链侧 clamp：返回要**返回给门禁的 action**，或 `null`（不表态 → 落回基线）。 */
export function clampActionForRisk(
  desired: CommandPolicyAction,
  risk: ToolRisk | undefined,
  destructive: boolean,
): PolicyAction | null {
  if (risk === 'evaluate') return null; // evaluate 首行硬拒绝（覆盖永不表态）
  if (risk === undefined || !isToolRisk(risk)) {
    // 未知/非法 risk：fail-closed。允许覆盖为 allow 会放宽 → 直接 deny（更保守）；
    // ask/deny 属收紧方向，保留。
    return desired === 'allow' ? 'deny' : desired;
  }
  if (risk === 'ui' || risk === 'state' || risk === 'external') {
    return desired === 'allow' ? null : desired; // ❌ 不得放宽为 allow；ask/deny 收紧可用
  }
  if (risk === 'write' && destructive) {
    return desired === 'allow' ? null : desired; // 破坏性保底 ask
  }
  return desired; // read / 非破坏性 write：覆盖生效
}

export interface CommandPolicyResolution {
  /** 经 clamp 后的实际生效档。 */
  effectiveAction: PolicyAction;
  /** 是否可被用户覆盖（硬底线 `false`）。 */
  overridable: boolean;
  /** 不可覆盖原因（`overridable===false` 时）。 */
  clampReason?: ClampReason;
}

/**
 * 模型侧 clamp（默认档 / 覆盖生效档分列 + 可覆盖性 + 原因）。
 *
 * `hardFloor` 由投影侧已知的硬底线成因传入（S1 未授权 / S3 未知 risk / evaluate）；
 * `ui`/`state`/`external`/破坏性写由 risk + destructive 判据得出。
 */
export function resolveCommandPolicy(input: {
  defaultAction: PolicyAction;
  override?: PolicyAction;
  risk?: ToolRisk;
  destructive?: boolean;
  hardFloor?: 's1-unauthorized' | 's3-unknown-risk' | 'evaluate';
}): CommandPolicyResolution {
  const { defaultAction, override, risk, destructive } = input;
  let clampReason: ClampReason | undefined;
  if (input.hardFloor === 's1-unauthorized') clampReason = 's1-unauthorized';
  else if (input.hardFloor === 's3-unknown-risk' || risk === undefined || !isToolRisk(risk)) clampReason = 's3-unknown-risk';
  else if (input.hardFloor === 'evaluate' || risk === 'evaluate') clampReason = 'evaluate';
  else if (risk === 'ui') clampReason = 'ui-no-widen';
  else if (risk === 'state') clampReason = 'state-no-widen';
  else if (risk === 'external') clampReason = 'external-no-widen';
  else if (destructive === true) clampReason = 'destructive-floor';

  if (clampReason === undefined) {
    return { effectiveAction: override ?? defaultAction, overridable: true };
  }
  // S1/S3/evaluate 为不可覆盖（override 一律不生效）；ui/state/external/破坏性只允许收紧。
  const tightenOnly =
    clampReason === 'ui-no-widen' || clampReason === 'state-no-widen' || clampReason === 'external-no-widen' || clampReason === 'destructive-floor';
  const effectiveAction =
    tightenOnly && override !== undefined && override !== 'allow' ? override : defaultAction;
  return { effectiveAction, overridable: false, clampReason };
}

// ---------------------------------------------------------------------------
// 策略链组合（不改冻结文件）
// ---------------------------------------------------------------------------

/** 覆盖策略名（anchoring 断言用）。 */
export const COMMAND_OVERRIDE_STRATEGY_NAME = 'command-override';

/**
 * 期望的策略链顺序（R2，ADR-V2-024/025）：S1/S3 先于覆盖（短路 deny）→ 覆盖 → S2。
 *
 * 被否决的 `append 到 [S1,S2,S3] 之后` 会让 S2 的 untrusted ask 先短路，用户覆盖**无法
 * 收紧**（违背 clamp 表「可覆盖为 deny」）——故必须重排。
 */
export const COMMAND_OVERRIDE_STRATEGY_ORDER: readonly string[] = [
  'S1-origin-authorization',
  'S3-fail-closed',
  COMMAND_OVERRIDE_STRATEGY_NAME,
  'S2-untrusted-declared',
];

const REQUIRED_BASE_STRATEGIES: readonly string[] = [
  'S1-origin-authorization',
  'S2-untrusted-declared',
  'S3-fail-closed',
];

export interface CommandOverrideStrategyDeps {
  /** 纯读：解析 (name, sub) 的用户覆盖（`undefined` = 无覆盖 → 不表态）。 */
  resolveOverride(name: string, subcommand?: string): CommandPolicyAction | undefined;
  /** 破坏性判据（默认 `isCommandDestructive`）。 */
  isDestructive?(name: string, subcommand: string | undefined, risk: ToolRisk | undefined): boolean;
}

/** 覆盖策略对象：读内存覆盖 → clamp → 返回 desired / null（无覆盖 → null，零行为变化）。 */
export function createCommandOverrideStrategy(deps: CommandOverrideStrategyDeps): PolicyStrategy {
  return {
    name: COMMAND_OVERRIDE_STRATEGY_NAME,
    check(input): PolicyAction | null {
      const desired = deps.resolveOverride(input.tool, input.subcommand || undefined);
      if (desired === undefined) return null;
      const isDestructive = deps.isDestructive ?? ((_n, sub, risk) => isCommandDestructive(risk, sub));
      return clampActionForRisk(desired, (input as { risk?: ToolRisk }).risk, isDestructive(input.tool, input.subcommand || undefined, (input as { risk?: ToolRisk }).risk));
    },
  };
}

/**
 * 组合覆盖层：接收 `createPluginPolicyConfig(...)` 的返回值，返回**新对象**。
 *
 * `strategies` 重排为 `[S1, S3, override, S2]`；其余字段（riskDefaults / denyPriority /
 * askTimeoutMs / onAsk / rules / defaultAction…）原样保留。**缺任一既有策略即抛错**（锚定
 * 断言：base 改名必须 FAIL，而不是静默退化）。无覆盖时策略返回 `null` → 行为与现状
 * 逐字节一致。
 */
export function withCommandOverride(base: RouterPolicy, deps: CommandOverrideStrategyDeps): RouterPolicy {
  const byName = new Map<string, PolicyStrategy>();
  for (const s of base.strategies ?? []) byName.set(s.name, s);
  const missing = REQUIRED_BASE_STRATEGIES.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(
      `withCommandOverride：基础策略缺失 ${missing.join('、')} —— 策略链锚定失败（base 改名/被替换），拒绝静默退化。`,
    );
  }
  const override = createCommandOverrideStrategy(deps);
  const reordered: PolicyStrategy[] = [
    byName.get('S1-origin-authorization')!,
    byName.get('S3-fail-closed')!,
    override,
    byName.get('S2-untrusted-declared')!,
  ];
  return { ...base, strategies: reordered };
}

// ---------------------------------------------------------------------------
// 覆盖存储 / 生命周期（ADR-V2-026）
// ---------------------------------------------------------------------------

export interface CommandPolicyEntryView {
  commandId: string;
  action: CommandPolicyAction;
  updatedAt: number;
}

export interface CommandPolicyMutationResult {
  ok: boolean;
  /** 是否真的改动（幂等：同值 → `false` + 「已生效（无变化）」）。 */
  changed: boolean;
  /** 可读回执（成功/失败原因）。 */
  text: string;
  entry?: CommandPolicyEntryView | undefined;
}

export interface CommandOverrideStore {
  /** 启动水化（读失败 → 视为「无覆盖」并标记降级；绝不因失败而放宽）。 */
  load(): Promise<void>;
  /** 解析 (name, sub)：`cmd:name#sub` > `cmd:name` > 默认（`undefined`）。 */
  get(name: string, subcommand?: string): PolicyAction | undefined;
  /** 是否存在显式覆盖（任一层级）。 */
  isExplicit(name: string, subcommand?: string): boolean;
  /** 全部覆盖（按 commandId 排序）。 */
  list(): CommandPolicyEntryView[];
  /** 读失败降级标记（EC-V2-018：可读披露「覆盖暂不可读」）。 */
  isDegraded(): boolean;
  /** 降级原因（可读）；未降级时 `undefined`。 */
  degradedReason(): string | undefined;
  /** 单条设置（整对象原子写 + 串行队列 + 写成功才提交内存 + 同值幂等）。 */
  set(commandId: string, action: CommandPolicyAction): Promise<CommandPolicyMutationResult>;
  /** 恢复单条默认（幂等）；`all` 时清空全部。 */
  reset(commandId: string): Promise<CommandPolicyMutationResult>;
  resetAll(): Promise<CommandPolicyMutationResult>;
}

function normalizeDocument(stored: unknown): Map<string, CommandPolicyEntry> {
  const out = new Map<string, CommandPolicyEntry>();
  if (!stored || typeof stored !== 'object') return out;
  const doc = stored as Partial<CommandPolicyDocument>;
  if (doc.version !== COMMAND_POLICY_VERSION) return out;
  const entries = doc.entries;
  if (!entries || typeof entries !== 'object') return out;
  for (const [commandId, raw] of Object.entries(entries)) {
    if (!isCommandId(commandId)) continue;
    if (!raw || typeof raw !== 'object') continue;
    const rec = raw as Partial<CommandPolicyEntry>;
    if (!isCommandPolicyAction(rec.action)) continue;
    out.set(commandId, { action: rec.action, updatedAt: typeof rec.updatedAt === 'number' ? rec.updatedAt : 0 });
  }
  return out;
}

function toDocument(entries: ReadonlyMap<string, CommandPolicyEntry>): CommandPolicyDocument {
  const out: Record<string, CommandPolicyEntry> = {};
  for (const commandId of [...entries.keys()].sort()) out[commandId] = { ...entries.get(commandId)! };
  return { version: COMMAND_POLICY_VERSION, entries: out };
}

/**
 * 覆盖 store（kv 注入，零 `chrome.*`）。
 *
 * 无半写：① 单键整对象 `set`（原子）；② **写成功后才提交内存**（失败 → 内存与旧值一致）；
 * ③ 串行 promise 队列（并发 `set` 不交叠、不丢更新）。审计类型 `command-policy`（零明文）。
 */
export function createCommandOverrideStore(
  kv: CommandPolicyKv,
  opts: { now?: () => number; audit?: PluginAuditSink } = {},
): CommandOverrideStore {
  const now = opts.now ?? (() => Date.now());
  const audit = opts.audit;
  let entries = new Map<string, CommandPolicyEntry>();
  let degraded = false;
  let degradedReasonText: string | undefined;

  /** 串行队列：每一步串行执行（失败不阻塞后续步骤）。 */
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const entryView = (commandId: string): CommandPolicyEntryView => {
    const rec = entries.get(commandId)!;
    return { commandId, action: rec.action, updatedAt: rec.updatedAt };
  };

  const persist = async (next: Map<string, CommandPolicyEntry>): Promise<void> => {
    await kv.set(COMMAND_POLICY_STORAGE_KEY, toDocument(next));
  };

  return {
    async load() {
      degraded = false;
      degradedReasonText = undefined;
      try {
        const stored = await kv.get<CommandPolicyDocument>(COMMAND_POLICY_STORAGE_KEY);
        entries = normalizeDocument(stored);
      } catch (err) {
        // EC-V2-018：读失败 → 视为「无覆盖」（默认 risk 档，更保守），可读披露；绝不放宽。
        entries = new Map();
        degraded = true;
        degradedReasonText = `覆盖暂不可读（${err instanceof Error ? err.message : String(err)}）：已按无覆盖（默认档）处理，不会放宽任何门禁。`;
      }
    },
    get(name, subcommand) {
      if (subcommand) {
        const sub = entries.get(commandIdOf(name, subcommand));
        if (sub) return sub.action;
      }
      return entries.get(commandIdOf(name))?.action;
    },
    isExplicit(name, subcommand) {
      if (subcommand && entries.has(commandIdOf(name, subcommand))) return true;
      return entries.has(commandIdOf(name));
    },
    list() {
      return [...entries.keys()].sort().map(entryView);
    },
    isDegraded: () => degraded,
    degradedReason: () => degradedReasonText,
    async set(commandId, action) {
      if (!isCommandId(commandId)) {
        return { ok: false, changed: false, text: `✖ 命令键非法「${String(commandId)}」：仅接受 cmd:<工具>[#<子命令>] 形状；零操作。` };
      }
      if (!isCommandPolicyAction(action)) {
        return { ok: false, changed: false, text: `✖ 处置档非法「${String(action)}」：仅接受 allow / ask / deny；零操作。` };
      }
      return enqueue(async () => {
        const prev = entries.get(commandId);
        if (prev?.action === action) {
          return { ok: true, changed: false, text: `已生效（无变化）：${commandId} 已是 ${action}（幂等，不写存储、不新增审计）。`, entry: entryView(commandId) };
        }
        const ts = now();
        const next = new Map(entries);
        next.set(commandId, { action, updatedAt: ts });
        try {
          await persist(next);
        } catch (err) {
          // 写失败：内存态与旧值一致（绝不半写/绝不「一半生效」）；可读原因。
          return { ok: false, changed: false, text: `✖ 保存失败（未改动）：${err instanceof Error ? err.message : String(err)}；请重试。` };
        }
        entries = next; // 写成功后才提交内存
        audit?.recordPlugin({
          type: 'command-policy',
          ts,
          decision: 'set',
          reason: `命令级覆盖（用户设置）：${commandId} → ${action}`,
          detail: `commandId=${commandId}；action=${action}；prevAction=${prev?.action ?? '（无）'}（设置变更，非放行记录）`,
        });
        return { ok: true, changed: true, text: `✓ 已设置 ${commandId} → ${action}（下一次同档调用即时生效；硬底线仍不可覆盖）。`, entry: entryView(commandId) };
      });
    },
    async reset(commandId) {
      if (!isCommandId(commandId)) {
        return { ok: false, changed: false, text: `✖ 命令键非法「${String(commandId)}」；零操作。` };
      }
      return enqueue(async () => {
        if (!entries.has(commandId)) {
          return { ok: true, changed: false, text: `已生效（无变化）：${commandId} 本就无覆盖（幂等恢复默认）。` };
        }
        const ts = now();
        const prev = entries.get(commandId)!;
        const next = new Map(entries);
        next.delete(commandId);
        try {
          await persist(next);
        } catch (err) {
          return { ok: false, changed: false, text: `✖ 恢复默认失败（未改动）：${err instanceof Error ? err.message : String(err)}；请重试。` };
        }
        entries = next;
        audit?.recordPlugin({
          type: 'command-policy',
          ts,
          decision: 'reset',
          reason: `命令级覆盖恢复默认（单条）：${commandId}`,
          detail: `commandId=${commandId}；prevAction=${prev.action}（恢复为默认档，可逆）`,
        });
        return { ok: true, changed: true, text: `✓ 已恢复默认：${commandId}（回到默认 risk 档）。` };
      });
    },
    async resetAll() {
      return enqueue(async () => {
        if (entries.size === 0) {
          return { ok: true, changed: false, text: '已生效（无变化）：当前没有命令级覆盖（幂等恢复默认）。' };
        }
        const ts = now();
        const removed = entries.size;
        const previous = [...entries.keys()];
        const next = new Map<string, CommandPolicyEntry>();
        try {
          await persist(next);
        } catch (err) {
          return { ok: false, changed: false, text: `✖ 全部恢复默认失败（未改动）：${err instanceof Error ? err.message : String(err)}；请重试。` };
        }
        entries = next;
        audit?.recordPlugin({
          type: 'command-policy',
          ts,
          decision: 'reset-all',
          reason: `命令级覆盖全部恢复默认（${removed} 条）`,
          detail: `removed=${removed}；commandIds=${previous.join(',')}（恢复为默认档，可逆）`,
        });
        return { ok: true, changed: true, text: `✓ 已全部恢复默认（清除 ${removed} 条命令级覆盖）。` };
      });
    },
  };
}
