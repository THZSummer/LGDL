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
  /**
   * Optional pre-ask enricher: returns a readable「本次将作用于……」
   * detail (title + query/fragment-stripped URL, irreversibility note, …) that is
   * appended to the question's reason **before** the user sees/decides it.
   *
   * Author reversal (2026-09-13): `tabs close` uses this so the confirmation
   * summary names the exact tab being closed and states that closing is
   * irreversible. A failure here must never block the fail-closed ask path — the
   * enricher is best-effort and any throw is swallowed (the plain summary is
   * still shown).
   */
  describe?: (question: AskQuestion) => Promise<string | undefined> | string | undefined;
}

/**
 * Tools whose argument values are **content** (clipboard text / notification
 * title+body). `summarizeArgs` masks only sensitive-looking KEYS, so these
 * values would otherwise be copied verbatim into the confirmation summary →
 * the `confirm` audit event. TASK-039 / FR-055: scrub them to a length-only
 * placeholder before the summary is built and before the question is sent.
 */
export const CONTENT_ARG_TOOLS: ReadonlySet<string> = new Set(['clipboard', 'notify']);

/** Arg keys carrying user content for the tools above. */
const CONTENT_ARG_KEY_RE = /^(text|html|dataurl|data|title|body|message)$/i;

/**
 * Replace content-bearing arg values of `clipboard` / `notify` with a length-only
 * placeholder. Every other tool is returned unchanged. Pure + exported so the
 * zero-plaintext guarantee is unit-testable.
 */
export function scrubContentArgs(tool: string, args?: Record<string, string>): Record<string, string> | undefined {
  if (!args || !CONTENT_ARG_TOOLS.has(tool)) return args;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    out[k] = CONTENT_ARG_KEY_RE.test(k) ? `<已省略 ${String(v ?? '').length} 字符>` : v;
  }
  return out;
}

/**
 * Create the `onAsk` bridge for the plugin router policy.
 * Any failure (no responder / thrown error / non-allow) → deny.
 */
export function createConfirmBridge(opts: ConfirmBridgeOptions): (question: AskQuestion) => Promise<AskResolution> {
  const now = opts.now ?? (() => Date.now());
  return async (question: AskQuestion): Promise<AskResolution> => {
    const origin = opts.currentOrigin?.();
    // Author reversal (2026-09-13): enrich the question with the concrete target
    // (title + redacted URL + irreversibility) before it is shown. Best-effort:
    // a describe failure must not weaken fail-closed semantics.
    let shown: AskQuestion = question;
    if (opts.describe) {
      try {
        const extra = await opts.describe(question);
        if (extra) shown = { ...question, reason: `${question.reason}；${extra}` };
      } catch {
        /* keep the plain question; the ask still happens */
      }
    }
    // FR-055: never let clipboard/notification CONTENT reach the summary (→ the
    // `confirm` audit event) or the confirm-request message sent to the panel.
    const safeArgs = scrubContentArgs(shown.tool, shown.args);
    shown = safeArgs === shown.args ? shown : { ...shown, args: safeArgs ?? {} };
    const summary = buildOperationSummary({
      origin,
      tool: shown.tool,
      subcommand: shown.subcommand,
      args: shown.args,
      risk: shown.risk,
      reason: shown.reason,
    });
    opts.audit?.recordPlugin({
      type: 'confirm',
      ts: now(),
      tool: shown.tool,
      subcommand: shown.subcommand,
      risk: shown.risk,
      origin,
      decision: 'ask',
      reason: summary,
    });
    if (!opts.ask) {
      opts.audit?.recordPlugin({
        type: 'confirm',
        ts: now(),
        tool: shown.tool,
        decision: 'deny',
        origin,
        detail: '无二次确认应答器（side panel 未连接），按 deny 处理',
      });
      return { action: 'deny' };
    }
    try {
      const resolution = await opts.ask(shown);
      const action = resolution?.action === 'allow' ? 'allow' : 'deny';
      opts.audit?.recordPlugin({
        type: 'confirm',
        ts: now(),
        tool: shown.tool,
        decision: action,
        origin,
        detail: action === 'allow' ? '用户确认放行' : '用户取消/拒绝',
      });
      return { action };
    } catch (err) {
      opts.audit?.recordPlugin({
        type: 'confirm',
        ts: now(),
        tool: shown.tool,
        decision: 'deny',
        origin,
        detail: `确认桥异常，按 deny 处理：${err instanceof Error ? err.message : String(err)}`,
      });
      return { action: 'deny' };
    }
  };
}
