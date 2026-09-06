/**
 * AuditSink —— 框架级审计事件面（FR-009/010，NFR-003/009）。
 *
 * 记录五类事件：权限裁决 / 工具调用 / 扩展注册（与卸载）/ 上下文压缩。
 * ask 裁决不设独立事件类型——其 decision/超时 deny 已随权限裁决经
 * permission 事件记录（router dispatch step3，EC-002 可追溯）。
 * 实现：memory（测试/观察：events 可读）+ console（调试/生产可观测）双轨，
 * createAudit 工厂按需装配。审计记录与 session 恢复数据可关联（NFR-009：ts + tool + type）。
 *
 * 本文件零 LGDL/react import（NFR-001）。审计为可选横切：未装配 sink 时零开销。
 */

/** 外部内容可信标记（FR-010：来源/时间/可信级；网络工具输出携带）。 */
export interface ContentTrust {
  /** 来源说明（URL/端点/资源名）。 */
  source: string;
  /** 抓取/产生时间（epoch ms）。 */
  fetchedAt: number;
  /** 可信级：trusted=框架/场景可信源；untrusted=外部来源；unknown=未声明。 */
  level: 'trusted' | 'untrusted' | 'unknown';
}

export type AuditEventType =
  | 'permission'
  | 'tool-call'
  | 'extension-register'
  | 'extension-unregister'
  | 'context-compact';

/** 审计事件（宽松字段：按事件类型取用相关位）。 */
export interface AuditEvent {
  type: AuditEventType;
  /** epoch ms（时间戳）。 */
  ts: number;
  /** 相关工具全限定名（permission/tool-call）。 */
  tool?: string;
  /** 权限裁决 action（permission；含 ask 命中后的 decision）。 */
  decision?: string;
  /** 裁决 reason（permission）。 */
  reason?: string;
  /** 裁决来源（rule/strategy/default/allowed-tools…）。 */
  by?: string;
  /** 工具调用结果 ok。 */
  ok?: boolean;
  /** 工具调用耗时 ms。 */
  durationMs?: number;
  /** 输出字符数（上下文预算观测）。 */
  outputChars?: number;
  /** 输出可信标记（FR-010；网络工具）。 */
  trust?: ContentTrust;
  /** 动态源标识（extension-register：skill:/mcp:/ext:…）。 */
  source?: string;
  /** 命名空间（extension-register/context-compact）。 */
  namespace?: string;
  /** 注册工具名（extension-register；全限定名）。 */
  name?: string;
  /** 上下文压缩前后 turns 数（context-compact）。 */
  beforeTurns?: number;
  afterTurns?: number;
  /** 自由说明。 */
  detail?: string;
}

/** 审计接收器契约。 */
export interface AuditSink {
  record(event: AuditEvent): void;
}

/** memory 实现（events 可读：测试/观察）。 */
export interface MemoryAuditSink extends AuditSink {
  readonly events: AuditEvent[];
  clear(): void;
}

export function createMemoryAudit(): MemoryAuditSink {
  const events: AuditEvent[] = [];
  return {
    events,
    record(ev: AuditEvent) {
      events.push(ev);
    },
    clear() {
      events.length = 0;
    },
  };
}

export interface ConsoleAuditSink extends AuditSink {
  readonly console: Console;
}

/** console 实现（生产可观测；每事件一行稳定前缀）。 */
export function createConsoleAudit(out: Pick<Console, 'info'> = console): ConsoleAuditSink {
  return {
    console: out as Console,
    record(ev: AuditEvent) {
      out.info(`[audit:${ev.type}]`, ev);
    },
  };
}

export interface CreateAuditOptions {
  /** 'memory'（缺省：测试/观察）| 'console' | 自定义 sink。 */
  sink?: 'memory' | 'console' | AuditSink;
}

/** 审计工厂：默认 memory。 */
export function createAudit(opts: CreateAuditOptions = {}): AuditSink {
  if (opts.sink === 'console') return createConsoleAudit();
  if (opts.sink && typeof opts.sink === 'object' && 'record' in opts.sink) return opts.sink;
  return createMemoryAudit();
}
