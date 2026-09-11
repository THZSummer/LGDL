/**
 * Second confirmation bridge (FR-024 / EC-005).
 *
 * `onAsk` from the upstream `PermissionGate` is forwarded to the side panel.
 * Timeout / cancel / missing responder all resolve to `deny` (fail-closed);
 * a readable operation summary (masked args) is presented and audited.
 */
import type { AskQuestion, AskResolution } from '@lgdl/web-cli-base';
import type { PluginAuditSink } from './audit-sink.js';
import { summarizeArgs } from './redact.js';

export interface ConfirmContext {
  origin?: string;
  tool: string;
  subcommand?: string;
  args?: Record<string, string>;
  risk?: string;
  reason: string;
}

/** Build the readable operation summary shown in the side panel. */
export function buildOperationSummary(req: ConfirmContext): string {
  const parts = [
    `站点 ${req.origin ?? '未知'}`,
    `工具 ${req.tool}${req.subcommand ? ` ${req.subcommand}` : ''}`,
    `风险档位 ${req.risk ?? '未知'}`,
  ];
  const args = summarizeArgs(req.args);
  if (args) parts.push(`参数 ${args}`);
  return `${parts.join(' · ')} —— ${req.reason}`;
}

/** Mask a question's args for audit (never store plaintext). */
export interface ConfirmBridgeOptions {
  /** Side-panel responder; absent → deny. */
  ask?: (question: AskQuestion) => Promise<AskResolution>;
  currentOrigin?: () => string | undefined;
  audit?: PluginAuditSink;
  now?: () => number;
}

/**
 * Create the `onAsk` bridge for the plugin router policy.
 * Any failure (no responder / thrown error / non-allow) → deny.
 */
export function createConfirmBridge(opts: ConfirmBridgeOptions): (question: AskQuestion) => Promise<AskResolution> {
  const now = opts.now ?? (() => Date.now());
  return async (question: AskQuestion): Promise<AskResolution> => {
    const origin = opts.currentOrigin?.();
    const summary = buildOperationSummary({
      origin,
      tool: question.tool,
      subcommand: question.subcommand,
      args: question.args,
      risk: question.risk,
      reason: question.reason,
    });
    opts.audit?.recordPlugin({
      type: 'confirm',
      ts: now(),
      tool: question.tool,
      subcommand: question.subcommand,
      risk: question.risk,
      origin,
      decision: 'ask',
      reason: summary,
    });
    if (!opts.ask) {
      opts.audit?.recordPlugin({
        type: 'confirm',
        ts: now(),
        tool: question.tool,
        decision: 'deny',
        origin,
        detail: '无二次确认应答器（side panel 未连接），按 deny 处理',
      });
      return { action: 'deny' };
    }
    try {
      const resolution = await opts.ask(question);
      const action = resolution?.action === 'allow' ? 'allow' : 'deny';
      opts.audit?.recordPlugin({
        type: 'confirm',
        ts: now(),
        tool: question.tool,
        decision: action,
        origin,
        detail: action === 'allow' ? '用户确认放行' : '用户取消/拒绝',
      });
      return { action };
    } catch (err) {
      opts.audit?.recordPlugin({
        type: 'confirm',
        ts: now(),
        tool: question.tool,
        decision: 'deny',
        origin,
        detail: `确认桥异常，按 deny 处理：${err instanceof Error ? err.message : String(err)}`,
      });
      return { action: 'deny' };
    }
  };
}
