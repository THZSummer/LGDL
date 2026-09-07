/**
 * event-bus.ts —— 事件 push 通道纯机制核心（EVT FR-008/013/014，ADR-002/003/004）。
 *
 * 生态位（spec §5.3 EVT + plan §2.3）：v4 新增「订阅 → 缓冲 → 拉取」通道的纯逻辑
 * Hub —— 与平台/浏览器完全解耦（node 可测，零 DOM import）。观察源（platform-events.ts
 * 浏览器面）在事件到达时**同步** append（ingest），AI 侧经 `pull {lastId}` **异步**取回
 * 增量；事件流不自动进 LLM 上下文（NFR-003：取回侧只拿摘要/计数，明细经敏感通道）。
 *
 * 机制要点（ADR-002/003/004）：
 *   - 订阅注册表：唯一 subId；每订阅**独立**缓冲/游标/预算；多订阅并发互不干扰。
 *   - 缓冲模型：bufferLimit（缺省 200，上限 1000）满 → 最旧丢弃 + dropped 计数；
 *     单事件负载 4KB 超限截断 + truncated 标记；事件入缓冲即冻结（不可变负载）。
 *   - lastId：订阅本地单调游标（= 已拉最大 seq）；pull{lastId} 返回 seq>lastId 全部
 *     → 增量无重复无遗漏（AC-002 断言点）。
 *   - 合并窗口（ADR-003）：仅抖动类（scroll/resize/mousemove/mouseover）同类型 + 同目标
 *     + 窗口内（缺省 800ms，0=关）合并为单条 count 事件（ts=窗口首事件 ts）；
 *     非抖动类保真不合并。
 *   - 预算护栏（ADR-004/D-001）：DEFAULT_BUDGETS 为**单一数据源**（测试断言/工具层
 *     引用不硬编码）：缓冲 200（可配至 1000）/ 累计 2000 自动暂停 / 并发 8 / 速率
 *     200 条/s / 合并窗口 800ms / 摘要 N=10 / 负载 4KB。
 *   - 全局开关（NFR-007）：enabled 缺省 false = 关闭态；纯逻辑 Hub 无常驻定时器
 *     （合并窗口惰性判定 —— 只在后续 ingest 时推进窗口），浏览器源装配另负责
 *     「无订阅零监听器」。开启后订阅事件才入缓冲。
 *   - 审计钩子（FR-007 窄接口）：subscribe/unsubscribe/delivery-summary 经窄事件面外发
 *     （subId/kind/计数，无敏感明文）；不直接 import audit 类型新值（TASK-002 并行收口）。
 *
 * 本文件零 LGDL/react/DOM import（NFR-001/002），纯数据逻辑 node 可测。
 */

// ---------- 预算常量单一数据源（ADR-004/D-001：工具层/测试只引用，不硬编码） ----------

export const DEFAULT_BUDGETS = {
  /** 每订阅缓冲上限（条）。 */
  bufferLimit: 200,
  /** 缓冲上限可配最大值。 */
  bufferLimitMax: 1000,
  /** 每订阅累计事件预算（超限自动暂停 + 提示，可 resume）。 */
  cumulativeBudget: 2000,
  /** 全通道并发订阅上限（超限拒注册 + 提示）。 */
  maxSubscriptions: 8,
  /** 全通道事件速率护栏（条/s；超限丢弃 + 计数）。 */
  ratePerSec: 200,
  /** 抖动类合并窗口 ms（0 = 关）。 */
  mergeWindowMs: 800,
  /** 投递摘要条数 N（pull/上下文只见摘要 + 计数）。 */
  summaryN: 10,
  /** 单事件负载预算（字符；超限截断 + truncated 标记）。 */
  payloadBudgetChars: 4096,
  /** 敏感明细侧库存留上限（条；超出最旧逐出，防无界增长）。 */
  sensitiveDetailLimit: 200,
} as const;

/** 观察源 kind（platform.ts PlatformObserveKind 值域对齐面）。 */
export type BusEventKind = 'dom' | 'lifecycle' | 'console' | 'network' | 'paste' | 'dialog';

/** 事件来源标记（FR-015：合成派发 vs 页面真实事件）。 */
export type BusEventSource = 'page' | 'synthetic';

/** 抖动类事件类型集合（仅此类可合并，ADR-003）。 */
export const JITTER_EVENT_TYPES: readonly string[] = ['scroll', 'resize', 'mousemove', 'mouseover'];

/** 抖动类判定。 */
export function isJitterType(type: string | undefined): boolean {
  return type !== undefined && (JITTER_EVENT_TYPES as readonly string[]).includes(type);
}

// ---------- 事件与订阅类型面 ----------

/**
 * 观察源入缓冲事件（ingest 输入；seq/ts/冻结由 hub 分配）。
 * text = 已按 FR-006 脱敏后的摘要；sensitiveDetail = 敏感订阅的明文明细（仅
 * 至少一个 sensitive 订阅存在时才保留，进 pull-sensitive 通道，不入普通缓冲）。
 */
export interface IngestEvent {
  kind: BusEventKind;
  /** 事件类型（dom: click/keydown/…；lifecycle: hashchange/…；console: log/error/…）。 */
  type?: string;
  /** target 摘要（selector 或 标签+文本前缀；dom）。 */
  target?: string;
  /** 脱敏后文本摘要（console/对话框/paste 等）。 */
  text?: string;
  /** kind 相关元数据（network: method/url/status/durationMs/level…）。 */
  meta?: Record<string, unknown>;
  /** 来源标记（FR-015：合成派发 synthetic / 页面 page）。 */
  source?: BusEventSource;
  /** 敏感明细（明文；可选 —— 无 sensitive 订阅时 hub 不保留）。 */
  sensitiveDetail?: string;
}

/** 入缓冲即冻结的不可变事件（统一事件面，ADR-005：{seq,ts,kind,type,target,text,meta}）。 */
export interface BusEvent {
  /** 全局单调 seq（hub 入口分配，跨源总序）。 */
  seq: number;
  /** 入缓冲时间（epoch ms；合并事件 = 窗口首事件 ts）。 */
  ts: number;
  kind: BusEventKind;
  type?: string;
  target?: string;
  text?: string;
  meta?: Record<string, unknown>;
  source?: BusEventSource;
  /** 合并计数（>1 = 抖动窗口内合并条数；单条事件缺省）。 */
  count?: number;
  /** 合并窗口末事件时间（count>1 时存在）。 */
  lastTs?: number;
  /** 文本超负载预算被截断标记。 */
  truncated?: boolean;
}

/** 订阅级过滤器（hub 入口按订阅执行；ADR-005：类型 ∩ 目标 ∩ URL ∩ level）。 */
export interface BusSubscriptionFilter {
  /** 事件类型白名单（csv 精确名；缺省不限）。 */
  types?: string[];
  /** console level 白名单（log/warn/error/info/debug；缺省不限）。 */
  levels?: string[];
  /** URL 模式（network/lifecycle 用；glob：* 任意串、? 单字符）。 */
  urlPattern?: string;
  /** selector 目标（dom 用，css:/text= 语法面；对 target 摘要 best-effort 匹配）。 */
  selector?: string;
}

/** 订阅注册选项。 */
export interface SubscribeBusOptions {
  kind: BusEventKind;
  filter?: BusSubscriptionFilter;
  /** 订阅级预算覆盖（缺省 = 通道默认 DEFAULT_BUDGETS）。 */
  budget?: { bufferLimit?: number; autoPauseAt?: number };
  /** 声明观察敏感面（console/键入等）→ 明细进 pull-sensitive 通道 + 审计。 */
  sensitive?: boolean;
  /** 订阅描述标签（list/审计展示；可选）。 */
  label?: string;
}

/** 订阅清单项（list/status 输出面）。 */
export interface BusSubSummary {
  subId: string;
  kind: BusEventKind;
  /** 过滤器人类可读摘要。 */
  filterLabel: string;
  sensitive: boolean;
  label?: string;
  paused: boolean;
  /** true = 累计超限被自动暂停（可 resume 恢复）。 */
  autoPaused: boolean;
  bufferSize: number;
  bufferLimit: number;
  /** 缓冲满最旧丢弃计数。 */
  dropped: number;
  /** 累计已投递事件计数。 */
  delivered: number;
  /** 本地游标 = 已拉最大 seq。 */
  lastId: number;
}

export type EventSubscribeResult = { ok: true; subId: string } | { ok: false; error: string };
export type EventOpOutcome = { ok: true } | { ok: false; error: string };

export interface EventPullResult {
  ok: boolean;
  /** 增量事件（seq > lastId；冻结不可变）。 */
  events: BusEvent[];
  /** 本次拉取后的本地游标（= 已拉最大 seq；无事件 = 不变）。 */
  lastId: number;
  /** 订阅累计 dropped（缓冲满最旧丢弃）。 */
  dropped: number;
  /** 订阅累计 delivered。 */
  delivered: number;
  bufferSize: number;
  /** 累计超限自动暂停标记（提示可 resume）。 */
  autoPaused: boolean;
  /** 上下文预算提示（NFR-003）。 */
  note?: string;
  /** 失败原因（ok:false；EC-001/012 可读）。 */
  error?: string;
}

export interface ChannelStatus {
  enabled: boolean;
  subscriptionCount: number;
  /** 全通道缓冲中事件总数。 */
  totalBuffered: number;
  /** 全通道开关关闭态丢弃计数。 */
  disabledDropped: number;
  /** 全通道速率护栏丢弃计数。 */
  rateDropped: number;
  /** 预算常量快照（ADR-004 单一数据源引用）。 */
  budgets: typeof DEFAULT_BUDGETS;
  subscriptions: BusSubSummary[];
}

/** 审计钩子窄事件面（FR-007：subId/kind/计数，无敏感明文）。 */
export type EventBusAuditEvent =
  | { hook: 'subscribe'; subId: string; kind: BusEventKind; sensitive: boolean; ts: number }
  | { hook: 'unsubscribe'; subId: string; kind: BusEventKind; delivered: number; dropped: number; ts: number }
  | { hook: 'delivery-summary'; subId: string; kind: BusEventKind; delivered: number; dropped: number; bufferSize: number; ts: number };

export type EventBusAuditHook = (ev: EventBusAuditEvent) => void;

export interface EventBusOptions {
  /** 时钟注入（测试确定性；缺省 Date.now）。 */
  now?: () => number;
  /** 合并窗口覆盖（ms；缺省 DEFAULT_BUDGETS.mergeWindowMs；0 = 关）。 */
  mergeWindowMs?: number;
  /** 审计钩子（可选；窄接口外发）。 */
  auditHook?: EventBusAuditHook;
}

// ---------- 内部订阅记录 ----------

interface SubscriptionRecord {
  subId: string;
  kind: BusEventKind;
  filter?: BusSubscriptionFilter;
  filterLabel: string;
  label?: string;
  sensitive: boolean;
  bufferLimit: number;
  autoPauseAt: number;
  paused: boolean;
  autoPaused: boolean;
  buffer: BusEvent[];
  dropped: number;
  delivered: number;
  lastId: number;
}

/** 订阅不存在错误（EC-001/012：可读失效错误不中断）。 */
function notFound(subId: string): EventOpOutcome {
  return {
    ok: false,
    error: `✖ 订阅不存在或已失效（${subId}）—— 整页导航/reload 后订阅随文档销毁，需重新 read-state + 订阅（EC-001）`,
  };
}

/** 文本超预算截断（4KB；返回截断后文本，截断标记由调用方判定）。 */
function truncateText(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  if (text.length <= DEFAULT_BUDGETS.payloadBudgetChars) return text;
  return text.slice(0, DEFAULT_BUDGETS.payloadBudgetChars);
}

/** 冻结事件克隆（pull 边界：消费者拿到的不可变；内部缓冲条目保留可变供合并簿记）。 */
function freezeEventClone(e: BusEvent): BusEvent {
  const copy: BusEvent = { ...e };
  if (copy.meta && typeof copy.meta === 'object') Object.freeze(copy.meta);
  return Object.freeze(copy);
}

/** 过滤器人类可读摘要（list/status 展示；不含过滤值之外的敏感信息）。 */
function describeFilter(kind: BusEventKind, filter: BusSubscriptionFilter | undefined): string {
  if (!filter) return `kind=${kind} · 全量`;
  const parts: string[] = [`kind=${kind}`];
  if (filter.types?.length) parts.push(`类型=${filter.types.join(',')}`);
  if (filter.levels?.length) parts.push(`level=${filter.levels.join(',')}`);
  if (filter.urlPattern) parts.push(`URL=${filter.urlPattern}`);
  if (filter.selector) parts.push(`selector=${filter.selector}`);
  return parts.join(' · ');
}

/** 订阅级过滤器匹配（hub 入口；ADR-005：类型 ∩ level ∩ URL glob ∩ selector）。 */
export function busFilterMatch(filter: BusSubscriptionFilter | undefined, ev: BusEvent): boolean {
  if (!filter) return true;
  if (filter.types?.length && !filter.types.includes(ev.type ?? '')) return false;
  if (filter.levels?.length) {
    const level = ev.meta?.level;
    if (typeof level !== 'string' || !filter.levels.includes(level)) return false;
  }
  if (filter.urlPattern) {
    const url = ev.meta?.url;
    if (typeof url !== 'string' || !globSimple(url, filter.urlPattern)) return false;
  }
  if (filter.selector) {
    if (!selectorMatch(filter.selector, ev.target)) return false;
  }
  return true;
}

/** 简单 glob（* 任意串、? 单字符；与 permission.globMatch 同语义，避免跨模块依赖）。 */
function globSimple(text: string, pattern: string): boolean {
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

/**
 * selector 目标匹配（dom 用，css:/text= 语法面；对 target 摘要 best-effort）。
 * target 摘要形态 = id 存在时 "#id" / 否则 "标签名 \"文本前缀\""。css: 与 target 摘要
 * 精确相等命中（id 定位最常见）；text= 按文本前缀包含命中；精确 DOM 侧 subtree 过滤
 * 由观察源 capture 期委托补充（help 公开局限）。
 */
function selectorMatch(selector: string, target: string | undefined): boolean {
  if (target === undefined) return false;
  const s = selector.trim();
  const low = s.toLowerCase();
  if (low.startsWith('text=')) {
    const text = s.slice('text='.length).trim().toLowerCase();
    return text !== '' && target.toLowerCase().includes(text);
  }
  if (low.startsWith('text*=')) {
    const text = s.slice('text*='.length).trim().toLowerCase();
    return text !== '' && target.toLowerCase().includes(text);
  }
  if (low.startsWith('css:')) {
    const css = s.slice('css:'.length).trim();
    return css !== '' && target === css;
  }
  return target === s;
}

// ---------- EventBus ----------

export class EventBus {
  /** 预算常量（单一数据源；测试断言/工具引用）。 */
  readonly budgets = DEFAULT_BUDGETS;

  private readonly nowFn: () => number;
  private readonly mergeWindowMs: number;
  private readonly auditHook?: EventBusAuditHook;

  /** 全局通道开关（缺省 false = 默认关；NFR-007）。 */
  private enabledFlag = false;
  /** 全局单调 seq 分配器。 */
  private seqCounter = 0;
  private subCounter = 0;

  private readonly subs = new Map<string, SubscriptionRecord>();

  /** 敏感明细侧库（seq → {kind, detail}；仅存在敏感订阅时写入，有界逐出）。 */
  private readonly sensitiveDetail = new Map<number, { kind: BusEventKind; detail: string }>();

  /** 速率护栏（固定 1s 桶）。 */
  private rateBucketStart = 0;
  private rateBucketCount = 0;
  /** 开关关闭态丢弃计数。 */
  private disabledDropped = 0;
  /** 速率超限丢弃计数。 */
  private rateDropped = 0;

  constructor(opts: EventBusOptions = {}) {
    this.nowFn = opts.now ?? Date.now;
    this.mergeWindowMs = opts.mergeWindowMs ?? DEFAULT_BUDGETS.mergeWindowMs;
    this.auditHook = opts.auditHook;
  }

  /** 全局通道开关（默认关；开启后订阅事件才入缓冲）。 */
  switch(on: boolean): EventOpOutcome {
    this.enabledFlag = on;
    return { ok: true };
  }

  get enabled(): boolean {
    return this.enabledFlag;
  }

  // ---------- 订阅生命周期（FR-008） ----------

  subscribe(opts: SubscribeBusOptions): EventSubscribeResult {
    if (this.subs.size >= DEFAULT_BUDGETS.maxSubscriptions) {
      return {
        ok: false,
        error: `✖ 事件订阅已满（并发上限 ${DEFAULT_BUDGETS.maxSubscriptions} 个；请先 unsubscribe 释放）`,
      };
    }
    const bufferLimit = this.resolveBufferLimit(opts.budget?.bufferLimit);
    if ('error' in bufferLimit) return { ok: false, error: bufferLimit.error };
    const autoPauseAt = opts.budget?.autoPauseAt ?? DEFAULT_BUDGETS.cumulativeBudget;
    if (!Number.isInteger(autoPauseAt) || autoPauseAt < 1) {
      return { ok: false, error: `✖ autoPauseAt 需为正整数（收到 ${autoPauseAt}）` };
    }
    const subId = `sub-${++this.subCounter}`;
    const rec: SubscriptionRecord = {
      subId,
      kind: opts.kind,
      filter: opts.filter,
      filterLabel: describeFilter(opts.kind, opts.filter),
      label: opts.label,
      sensitive: opts.sensitive === true,
      bufferLimit: bufferLimit.value,
      autoPauseAt,
      paused: false,
      autoPaused: false,
      buffer: [],
      dropped: 0,
      delivered: 0,
      lastId: 0,
    };
    this.subs.set(subId, rec);
    this.auditHook?.({ hook: 'subscribe', subId, kind: opts.kind, sensitive: rec.sensitive, ts: this.nowFn() });
    return { ok: true, subId };
  }

  private resolveBufferLimit(raw: number | undefined):
    | { value: number }
    | { error: string } {
    if (raw === undefined) return { value: DEFAULT_BUDGETS.bufferLimit };
    if (!Number.isInteger(raw) || raw < 1 || raw > DEFAULT_BUDGETS.bufferLimitMax) {
      return {
        error: `✖ bufferLimit 需为 1~${DEFAULT_BUDGETS.bufferLimitMax} 整数（收到 ${raw}）`,
      };
    }
    return { value: raw };
  }

  unsubscribe(subId: string): EventOpOutcome {
    const sub = this.subs.get(subId);
    if (!sub) return notFound(subId);
    this.subs.delete(subId);
    this.auditHook?.({
      hook: 'unsubscribe',
      subId,
      kind: sub.kind,
      delivered: sub.delivered,
      dropped: sub.dropped,
      ts: this.nowFn(),
    });
    return { ok: true };
  }

  pause(subId: string): EventOpOutcome {
    const sub = this.subs.get(subId);
    if (!sub) return notFound(subId);
    sub.paused = true;
    return { ok: true };
  }

  resume(subId: string): EventOpOutcome {
    const sub = this.subs.get(subId);
    if (!sub) return notFound(subId);
    sub.paused = false;
    sub.autoPaused = false;
    // 新预算周期：resume 重置累计计数（自动暂停 = 节流语义，恢复后重新计周期 FR-014）
    sub.delivered = 0;
    return { ok: true };
  }

  clear(subId: string): EventOpOutcome {
    const sub = this.subs.get(subId);
    if (!sub) return notFound(subId);
    sub.buffer.length = 0;
    return { ok: true };
  }

  list(): BusSubSummary[] {
    return [...this.subs.values()].map((s) => this.summaryOf(s));
  }

  // ---------- 预算与状态（FR-014） ----------

  status(): ChannelStatus {
    let totalBuffered = 0;
    for (const s of this.subs.values()) totalBuffered += s.buffer.length;
    return {
      enabled: this.enabledFlag,
      subscriptionCount: this.subs.size,
      totalBuffered,
      disabledDropped: this.disabledDropped,
      rateDropped: this.rateDropped,
      budgets: DEFAULT_BUDGETS,
      subscriptions: this.list(),
    };
  }

  /** 订阅级预算调整（bufferLimit / autoPauseAt）。 */
  setBudget(subId: string, budget: { bufferLimit?: number; autoPauseAt?: number }): EventOpOutcome {
    const sub = this.subs.get(subId);
    if (!sub) return notFound(subId);
    if (budget.bufferLimit !== undefined) {
      const r = this.resolveBufferLimit(budget.bufferLimit);
      if ('error' in r) return { ok: false, error: r.error };
      sub.bufferLimit = r.value;
    }
    if (budget.autoPauseAt !== undefined) {
      const n = budget.autoPauseAt;
      if (!Number.isInteger(n) || n < 1) return { ok: false, error: `✖ autoPauseAt 需为正整数（收到 ${n}）` };
      sub.autoPauseAt = n;
    }
    return { ok: true };
  }

  // ---------- 拉取（FR-008/013：全量或 lastId 增量；无重复无遗漏 AC-002） ----------

  pull(subId: string, opts: { lastId?: number; max?: number } = {}): EventPullResult {
    const sub = this.subs.get(subId);
    if (!sub) {
      return {
        ok: false,
        events: [],
        lastId: 0,
        dropped: 0,
        delivered: 0,
        bufferSize: 0,
        autoPaused: false,
        error: `✖ 订阅不存在或已失效（${subId}）—— 整页导航后订阅随文档销毁，需重新 read-state + 订阅（EC-001）`,
      };
    }
    const from = Number.isInteger(opts.lastId) ? (opts.lastId as number) : sub.lastId;
    const matched = sub.buffer.filter((e) => e.seq > from);
    let events = matched;
    if (opts.max !== undefined && opts.max >= 0) events = events.slice(0, opts.max);
    if (events.length > 0) sub.lastId = events[events.length - 1].seq;
    const overBudget = sub.autoPaused || sub.delivered >= sub.autoPauseAt;
    const note =
      overBudget
        ? `⚠ 订阅累计事件达预算（${sub.autoPauseAt} 条）已自动暂停 —— events resume <subId> 可恢复（FR-014）`
        : sub.dropped > 0
          ? `（缓冲满最旧丢弃 ${sub.dropped} 条 —— events budget --bufferLimit 可提高上限）`
          : undefined;
    this.auditHook?.({
      hook: 'delivery-summary',
      subId,
      kind: sub.kind,
      delivered: sub.delivered,
      dropped: sub.dropped,
      bufferSize: sub.buffer.length,
      ts: this.nowFn(),
    });
    return {
      ok: true,
      events: events.map((e) => freezeEventClone(e)),
      lastId: sub.lastId,
      dropped: sub.dropped,
      delivered: sub.delivered,
      bufferSize: sub.buffer.length,
      autoPaused: sub.autoPaused,
      ...(note ? { note } : {}),
    };
  }

  /** 敏感明细拉取（仅 sensitive 订阅 + 事件有保留明细时；trusted+ask 门禁由工具层承接）。 */
  pullSensitive(subId: string, seq: number): { ok: boolean; detail?: string; error?: string } {
    const sub = this.subs.get(subId);
    if (!sub) return { ok: false, error: `✖ 订阅不存在或已失效（${subId}）` };
    if (!sub.sensitive) {
      return { ok: false, error: '✖ 该订阅未声明 --sensitive true —— 明细仅对敏感订阅开放（pull-sensitive 通道，FR-006）' };    }
    const hit = this.sensitiveDetail.get(seq);
    if (!hit) return { ok: false, error: `✖ 事件 ${seq} 无保留明细（侧库容量已逐出，或该事件非敏感面）` };
    if (hit.kind !== sub.kind) return { ok: false, error: '✖ 订阅 kind 与明细事件不一致（越权访问拒，EC-012）' };
    return { ok: true, detail: hit.detail };
  }

  // ---------- 事件入口（观察源同步 ingest；ADR-002/003） ----------

  /**
   * 观察源同步入缓冲。全局关/无订阅零开销快速返回（NFR-007）；开启后：
   * 分配全局单调 seq → 截断超预算负载 → 按订阅过滤投递（合并/预算/丢弃护栏）。
   */
  ingest(ev: IngestEvent): void {
    if (!this.enabledFlag) {
      this.disabledDropped++;
      return;
    }
    const ts = this.nowFn();

    // 速率护栏（固定 1s 桶；缺省 200 条/s）
    if (ts - this.rateBucketStart >= 1000) {
      this.rateBucketStart = ts;
      this.rateBucketCount = 0;
    }
    this.rateBucketCount++;
    if (this.rateBucketCount > DEFAULT_BUDGETS.ratePerSec) {
      this.rateDropped++;
      return;
    }

    const seq = ++this.seqCounter;

    // 敏感明细侧库：至少一个同 kind 非暂停 sensitive 订阅时才保留（有界逐出）
    let hasSensitive = false;
    for (const s of this.subs.values()) {
      if (s.kind === ev.kind && s.sensitive && !s.paused) {
        hasSensitive = true;
        break;
      }
    }
    if (hasSensitive && ev.sensitiveDetail !== undefined) {
      if (this.sensitiveDetail.size >= DEFAULT_BUDGETS.sensitiveDetailLimit) {
        let oldest: number | undefined;
        for (const k of this.sensitiveDetail.keys()) {
          if (oldest === undefined || k < oldest) oldest = k;
        }
        if (oldest !== undefined) this.sensitiveDetail.delete(oldest);
      }
      this.sensitiveDetail.set(seq, { kind: ev.kind, detail: ev.sensitiveDetail });
    }

    const rawText = ev.text;
    const cutText = truncateText(rawText);
    const event: BusEvent = {
      seq,
      ts,
      kind: ev.kind,
      type: ev.type,
      target: ev.target,
      text: cutText,
      meta: ev.meta,
      source: ev.source,
      ...(rawText !== undefined && cutText !== rawText ? { truncated: true } : {}),
    };

    for (const sub of this.subs.values()) {
      if (sub.paused || sub.autoPaused) continue;
      if (sub.kind !== ev.kind) continue;
      if (!busFilterMatch(sub.filter, event)) continue;
      this.deliverTo(sub, event);
    }
  }

  /**
   * 单订阅投递：累计预算（自动暂停）→ 抖动合并窗口 → 缓冲满最旧丢弃。
   *
   * 合并边界语义（C23 改进 #2）：**已投递（pull 过）的尾部不再原地累计** —— 合并仅允许作用于
   * 尚未被 pull 暴露的尾部（tail.seq > sub.lastId）。否则已投递尾部会被后续 ingest 原地累加
   * count/lastTs，而 pull 只回 seq>lastId → 连续高频抖动流下（窗口内 AI 已拉取后仍在合并）
   * 后续 pull 恒 0 增量，AI 看不到已拉尾部的更新计数/末时间（EC-002/AC-005 洪峰语义边界）。
   * 关窗语义：投递后的同窗口抖动事件改走「新建缓冲条目」（携带新 seq）→ 下次 pull 拿到准确
   * 增量，不重复不遗漏。
   */
  private deliverTo(sub: SubscriptionRecord, event: BusEvent): void {
    // 累计预算：超限 → 自动暂停（非退订，保留可恢复性 FR-014）
    if (sub.delivered >= sub.autoPauseAt) {
      sub.autoPaused = true;
      return;
    }
    sub.delivered++;

    // 抖动合并：仅抖动类 + 同类型同目标 + 窗口内 + 尾部尚未被投递（tail 为可合并项时）
    const tail = sub.buffer[sub.buffer.length - 1];
    if (
      this.mergeWindowMs > 0 &&
      tail &&
      tail.seq > sub.lastId &&
      isJitterType(event.type) &&
      tail.type === event.type &&
      tail.target === event.target &&
      (tail.count !== undefined || isJitterType(tail.type)) &&
      event.ts - tail.ts <= this.mergeWindowMs
    ) {
      tail.count = (tail.count ?? 1) + 1;
      tail.lastTs = event.ts;
      return;
    }

    // 缓冲满 → 最旧丢弃 + dropped 计数（不静默丢，EC-002）
    if (sub.buffer.length >= sub.bufferLimit) {
      sub.buffer.shift();
      sub.dropped++;
    }
    sub.buffer.push(event);
  }

  private summaryOf(s: SubscriptionRecord): BusSubSummary {
    return {
      subId: s.subId,
      kind: s.kind,
      filterLabel: s.filterLabel,
      sensitive: s.sensitive,
      label: s.label,
      paused: s.paused,
      autoPaused: s.autoPaused,
      bufferSize: s.buffer.length,
      bufferLimit: s.bufferLimit,
      dropped: s.dropped,
      delivered: s.delivered,
      lastId: s.lastId,
    };
  }
}

export function createEventBus(opts: EventBusOptions = {}): EventBus {
  return new EventBus(opts);
}
