/**
 * V5-1 TASK-V5-105 (ADR-V5-001 §replace) — the 4 built-in providers that replace
 * `recommend.ts`'s hand-written rule table: 5 × P0 recovery (one per recovery
 * trigger) + `onboarding` (1) + `ref-action` (2) + `capability-discovery` (3).
 *
 * The rule **predicates / priorities / chip order** move here; the constants
 * (`NEXTSTEP_PRIORITY` / `RECOVERY_CHIP_ORDER` / …) stay verbatim in `recommend.ts`
 * and are the single source this module reads.
 *
 * @module ui/sidepanel/next-registry/providers
 */
import { RECOVERY_CHIP_ORDER, RECOVERY_CHIP_TEXT, type NextstepAct, type RecoveryTrigger } from '../recommend.js';
import { ACT_TO_OP } from './dispatch.js';
import { BLOCKED_RECOVERY_TRIGGER, type BlockedTerminal, type NextCtx, type NextProvider } from './definition.js';
import { registerNextProvider } from './registry.js';

/** The 5 P0 recovery providers ↔ their 5 triggers (逐条, registration order = precedence). */
export const RECOVERY_PROVIDER_TRIGGERS: Readonly<Record<string, RecoveryTrigger>> = Object.freeze({
  'ref.stale': 'refInvalid',
  'declaration.invalid': 'declarationInvalid',
  // The blocked terminal whose recovery provider id IS the terminal. This file is the ONE
  // registered **bijection site**: a blocked-terminal literal may only appear here (as a
  // provider id) besides its declaration (`test/blocked-terminals.test.ts` BT-1).
  'binding.stale': 'hardFloor',
  'site.unauthorized': 'site',
  'probe.unsettled': 'probe',
});
export const RECOVERY_PROVIDER_IDS = Object.freeze(Object.keys(RECOVERY_PROVIDER_TRIGGERS));

/**
 * V5-2 review R1 **BLOCK-03** (ADR-V5-009 §3 · FR-ALLN-013 · AC-ALLN-024) — the two
 * **op-driven** recovery providers.
 *
 * `llm.unconfigured` / `perm.missing` are the two blocked terminals whose repair is a
 * first-class op (`op.llm-config` / `op.perm.request`), so their provider's chips are
 * **op-direct**: the chip's `act` IS the opId and `dispatchChipAction` resolves it through
 * `OPS_BY_ID` (`src/ui/sidepanel/next-registry/dispatch.ts`) — never through a second act
 * table, and never as a turn.
 *
 * ── The fact source (不新增真值源) ────────────────────────────────────────────
 *
 * `when(ctx)` reads the **existing `risk` source only**: the panel folds the *derived*
 * block fact into it (`llmBlocked` = the key-store is empty, measured from the live LLM
 * status; `permBlocked` = at least one `OPTIONAL_CAPABILITIES` entry is provably **not**
 * granted, measured through `chrome.permissions.contains`). The recommendation therefore
 * keeps exactly its 7 truth sources (`NEXT_SOURCE_NAMES`) and no new ctx field.
 */
export const LLM_BLOCKED_RISK = 'llmBlocked';
export const PERM_BLOCKED_RISK = 'permBlocked';

export const OPS_RECOVERY_ROWS: readonly {
  readonly blocked: string;
  readonly risk: string;
  readonly op: string;
  readonly text: string;
}[] = Object.freeze([
  { blocked: 'llm.unconfigured', risk: LLM_BLOCKED_RISK, op: 'op.llm-config', text: '配置 LLM 凭据（写入本机 · 掩码）' },
  { blocked: 'perm.missing', risk: PERM_BLOCKED_RISK, op: 'op.perm.request', text: '申请浏览器权限（可选能力）' },
]);
export const OPS_RECOVERY_PROVIDER_IDS: readonly string[] = Object.freeze(OPS_RECOVERY_ROWS.map((r) => r.blocked));

// V5-3 TASK-V5-156 (ADR-V5-002 §3): the born recovery chips of a blocked terminal.
// Derived from the ONE registry (OPS_RECOVERY_ROWS + RECOVERY_CHIP_ORDER through ACT_TO_OP);
// keys are BLOCKED_TERMINALS entries, so the single-source scan BT-1 stays green.
export function blockedRecovery(blocked: string): { readonly text: string; readonly opId: string }[] {
  const row = OPS_RECOVERY_ROWS.find((r) => r.blocked === blocked);
  if (row) return [{ text: row.text, opId: row.op }];
  // V5-3 review R1 **I-05**: the terminal → trigger pairing is an **object keyed by the
  // terminal** (`definition.ts#BLOCKED_RECOVERY_TRIGGER`, compile-time exhaustive) — the
  // old positional array silently mis-paired on any `BLOCKED_TERMINALS` reorder.
  const t = BLOCKED_RECOVERY_TRIGGER[blocked as BlockedTerminal];
  const acts = t ? RECOVERY_CHIP_ORDER[t] : undefined;
  return acts ? acts.slice(0, 3).map((a) => ({ text: RECOVERY_CHIP_TEXT[a], opId: ACT_TO_OP[a] })) : [];
}

/** The rule-group ids (the 4 `NEXTSTEP_PRIORITY` rules). */
export const RULE_PROVIDER_IDS = Object.freeze(['onboarding', 'ref-action', 'capability-discovery']);

function triggerMatch(t: RecoveryTrigger, ctx: NextCtx): boolean {
  if (t === 'site') return ctx.site.authorized === false;
  if (t === 'probe') {
    const phase = ctx.probe.phase;
    return ctx.probe.steady === false && phase !== undefined && phase !== 'ready' && phase !== 'probing';
  }
  if (t === 'refInvalid') return ctx.ref.staleCount >= 1 || ctx.risk.includes('refInvalid');
  return ctx.risk.includes(t);
}

function recoveryProvider(id: string, trigger: RecoveryTrigger): NextProvider {
  const acts = RECOVERY_CHIP_ORDER[trigger].slice(0, 3) as readonly NextstepAct[];
  return {
    id,
    deps: ['snapshot'],
    priority: 0,
    mode: 'waterfall',
    fail: 'card-boundary',
    rule: 'risk-recovery',
    when: (ctx) => triggerMatch(trigger, ctx),
    chips: acts.map((a) => ACT_TO_OP[a]),
    textOf: () => acts.map((a) => RECOVERY_CHIP_TEXT[a] ?? a),
  };
}

/** The 8 built-in providers (5 recovery + 2 op-driven recovery + 3 rules). Lazy (see module note). */
export function builtinProviders(): readonly NextProvider[] {
  const recovery = RECOVERY_PROVIDER_IDS.map((id) =>
    recoveryProvider(id, RECOVERY_PROVIDER_TRIGGERS[id] as RecoveryTrigger),
  );
  // review R1 BLOCK-03: the op-driven two sit **after** the five trigger providers (so a
  // site / probe / risk block still wins the `risk-recovery` slot deterministically) and
  // **before** the rule providers (a blocked terminal outranks a suggestion).
  const opRecovery: NextProvider[] = OPS_RECOVERY_ROWS.map((row) => ({
    id: row.blocked,
    deps: ['snapshot', 'permissions'],
    priority: 0,
    mode: 'waterfall',
    fail: 'card-boundary',
    rule: 'risk-recovery',
    when: (ctx) => ctx.risk.includes(row.risk),
    chips: [row.op],
    textOf: () => [row.text],
  }));
  const rules: NextProvider[] = [
    {
      id: 'onboarding',
      deps: ['credentials'],
      priority: 1,
      mode: 'waterfall',
      fail: 'card-boundary',
      rule: 'onboarding',
      when: (ctx) => ctx.onboarding.firstRun && ctx.onboarding.pendingSteps.length > 0,
      chips: [ACT_TO_OP.authorize, ACT_TO_OP.help],
      textOf: () => ['授权当前站点', '了解 6 个页面手势'],
    },
    {
      id: 'ref-action',
      deps: ['snapshot'],
      priority: 2,
      mode: 'waterfall',
      fail: 'card-boundary',
      rule: 'ref-action',
      when: (ctx) => ctx.ref.validCount >= 1 && ctx.session.openAsks === 0 && ctx.ref.latestRefNum !== undefined,
      chips: [ACT_TO_OP.next, ACT_TO_OP.next],
      textOf: (ctx) => [
        `用引用 ${ctx.ref.latestRefNum} 做原地翻译`,
        '查看引用证据（选择器 / 语义路径 / 文本摘要）',
      ],
    },
    {
      id: 'capability-discovery',
      deps: ['pageSide'],
      priority: 3,
      mode: 'waterfall',
      fail: 'card-boundary',
      rule: 'capability-discovery',
      when: (ctx) => ctx.site.authorized && ctx.probe.phase === 'ready' && !ctx.session.busy,
      chips: [ACT_TO_OP.next, ACT_TO_OP.next],
      textOf: (ctx) => [
        `看看这页能做什么（命令目录 ${ctx.catalog.toolCount} 条）`,
        '打开审计查看已授权记录',
      ],
    },
  ];
  return [...recovery, ...opRecovery, ...rules];
}

let REGISTERED = false;
/** Register the built-ins once (idempotent; called from `recommend.ts`). */
export function registerBuiltinProviders(): void {
  if (REGISTERED) return;
  REGISTERED = true;
  for (const p of builtinProviders()) registerNextProvider(p);
}
