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
import type { NextCtx, NextProvider } from './definition.js';
import { registerNextProvider } from './registry.js';

/** The 5 P0 recovery providers ↔ their 5 triggers (逐条, registration order = precedence). */
export const RECOVERY_PROVIDER_TRIGGERS: Readonly<Record<string, RecoveryTrigger>> = Object.freeze({
  'ref.stale': 'refInvalid',
  'declaration.invalid': 'declarationInvalid',
  'binding.stale': 'hardFloor',
  'site.unauthorized': 'site',
  'probe.unsettled': 'probe',
});
export const RECOVERY_PROVIDER_IDS = Object.freeze(Object.keys(RECOVERY_PROVIDER_TRIGGERS));

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

/** The 8 built-in providers (5 recovery + 3 rules). Built lazily (see module note). */
export function builtinProviders(): readonly NextProvider[] {
  const recovery = RECOVERY_PROVIDER_IDS.map((id) =>
    recoveryProvider(id, RECOVERY_PROVIDER_TRIGGERS[id] as RecoveryTrigger),
  );
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
  return [...recovery, ...rules];
}

let REGISTERED = false;
/** Register the built-ins once (idempotent; called from `recommend.ts`). */
export function registerBuiltinProviders(): void {
  if (REGISTERED) return;
  REGISTERED = true;
  for (const p of builtinProviders()) registerNextProvider(p);
}
