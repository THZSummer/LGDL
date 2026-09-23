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
import {
  BATCH_ACTION_TYPE,
  admitEntry,
  planEntryOf,
  type BatchConsent,
  type PlanRef,
} from '../background/batch-plan.js';

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
  /**
   * V5.5F-2 **TASK-V55F-210** (ADR-SGO-004 §3/§4/§5 · FR-SGO-042/044/046/049) — the
   * **计划感知桥**（batch-aware）。Absent ⇒ 单条路径**逐字不变**（零回归）。
   *
   * 计划内条目由**一次真实用户手势**覆盖：首次写触发**一次**计划卡；批准后同计划内
   * 后续写直接放行（`admitted`，不再出卡）。计划外 ⇒ 回落逐条确认。
   */
  plan?: ConfirmPlanDeps;
}

/** 计划感知桥的依赖（B 列；holder 单源由 `service-worker.ts` 注入）。 */
export interface ConfirmPlanDeps {
  /** 计划 holder 单源（审批状态**只由面板真实点击**推进 —— ADR-SGO-004 §4）。 */
  readonly consent: BatchConsent;
  /** 批准时重校验用的当前回合引用集合（漂移检测；缺省 ⇒ 空集合 ⇒ 不误判漂移）。 */
  readonly refs?: () => readonly PlanRef[];
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
    // ★ V5.5F-2 **TASK-V55F-210**（ADR-SGO-004 §3/§4/§5 · FR-SGO-042/044/046/049）——
    // **计划感知准入**：只识别 `dom set-text`；计划内条目由**一次真实用户手势**覆盖。
    //   · 已批准 ∧ 未漂移 ⇒ **放行**（不再出第二张卡）；
    //   · 被拒 / 中止 ⇒ **拒绝**（计划内全部不执行；理由可读）；
    //   · 批准前漂移 ⇒ **显式失败**（不静默按旧指纹放行）；
    //   · 待批准（首次写）⇒ 本次照常出卡，但卡上带**计划**（渲染用字段）。
    // 审计**只**记字段名 / 条目数 / 指纹**摘要**（零明文，N-SGO-026）。
    let planGate: BatchConsent | null = null;
    // 计划卡出账用的**机器事实**（指纹摘要 + 条目数）；缺省 ⇒ 未走计划卡。
    let planFingerprintDigest: string | undefined;
    let planEntryTotal = 0;
    if (opts.plan) {
      const consent = opts.plan.consent;
      const plan = consent.plan();
      if (plan && shown.tool === 'dom' && shown.subcommand === BATCH_ACTION_TYPE) {
        const refs = opts.plan.refs?.() ?? [];
        const entry = planEntryOf({ name: shown.tool, subcommand: shown.subcommand, args: shown.args }, refs);
        if (entry) {
          const verdict = consent.admit(entry, refs);
          if (verdict.kind === 'admitted') {
            opts.audit?.recordPlugin({
              type: 'confirm',
              ts: now(),
              tool: 'dom',
              subcommand: BATCH_ACTION_TYPE,
              origin,
              decision: 'allow',
              fingerprintDigest: plan.fingerprint,
              batchEntries: plan.entries.length,
              detail: '批量计划内条目放行（一次真实手势已覆盖计划指纹）',
            });
            return { action: 'allow' };
          }
          if (verdict.kind === 'rejected' || verdict.kind === 'drift') {
            opts.audit?.recordPlugin({
              type: 'confirm',
              ts: now(),
              tool: 'dom',
              subcommand: BATCH_ACTION_TYPE,
              origin,
              decision: 'deny',
              fingerprintDigest: plan.fingerprint,
              batchEntries: plan.entries.length,
              detail: verdict.kind === 'drift' ? '批量计划批准前漂移，显式失败（deny）' : '批量计划已被拒绝 / 中止（deny）',
            });
            return { action: 'deny' };
          }
          if (verdict.kind === 'fallback') {
            // I-02（v55f-2 review）：计划外回落走**独立分支**，与主（单条）路径同口径 ——
            //   ① 不挂计划渲染数据（计划外卡不再沿用「本批将写入」计划行）；
            //   ② 不置 `planGate`（对该卡的同意 / 拒绝**不推进**整批计划的审批状态）；
            //   ③ 把可读回落理由并入上屏文案（deny 面不再只有通用理由）。
            // 判据本体不改：`admitEntry` 仍返回 `fallback`（计划外不自动放行）。
            shown = { ...shown, reason: `${shown.reason}；${verdict.message}` };
          } else {
            // `plan-consent`：本次为**首次写** ⇒ 出一次计划卡（带计划渲染数据）。
            shown = {
              ...shown,
              plan: { fingerprint: plan.fingerprint, entries: plan.entries },
            } as AskQuestion;
            planGate = consent;
            planFingerprintDigest = plan.fingerprint;
            planEntryTotal = plan.entries.length;
          }
        }
      }
    }
    const summary = buildOperationSummary({
      origin,
      tool: shown.tool,
      subcommand: shown.subcommand,
      args: shown.args,
      risk: shown.risk,
      reason: shown.reason,
    });
    opts.audit?.recordPlugin(
      planGate
        ? {
            // ★ V5.5F-2（ADR-SGO-004 §7 · N-SGO-026）：计划卡的 `ask` 出账**只记机器事实**
            // （指纹摘要 / 条目数）—— 计划正文 / 译文**不进审计值**（法八四面之③）。
            type: 'confirm',
            ts: now(),
            tool: shown.tool,
            subcommand: shown.subcommand,
            origin,
            decision: 'ask',
            fingerprintDigest: planFingerprintDigest,
            batchEntries: planEntryTotal,
            detail: '批量计划卡：一次真实手势覆盖计划指纹（计划正文不入审计）',
          }
        : {
            type: 'confirm',
            ts: now(),
            tool: shown.tool,
            subcommand: shown.subcommand,
            risk: shown.risk,
            origin,
            decision: 'ask',
            reason: summary,
          },
    );
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
      // ★ V5.5F-2（ADR-SGO-004 §4）：计划审批状态**只**在这里（面板真实点击的回传）
      // 推进 —— AI / LLM 侧无任何写入面（RL-06 扩批量变体机核）。
      if (planGate) {
        if (action === 'allow') planGate.markApproved();
        else planGate.markRejected();
      }
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
