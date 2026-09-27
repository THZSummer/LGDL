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
import { ACT_TO_OP, FREE_INPUT_LABEL } from './dispatch.js';
import { BLOCKED_RECOVERY_TRIGGER, type BlockedTerminal, type NextCtx, type NextProvider } from './definition.js';
import { registerNextProvider } from './registry.js';
import { registerDriverDecl, type DriverDecl } from './drivers.js';

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

/** ★ NDA-2 TASK-NDA-210（ADR-NDA-007 §③ · FR-NDA-071/072）—— LLM **异常相**的 risk 项
 *（单源；不许与 `llmBlocked` 混同，N-NDA-026）。真值源仍既有 `risk`（恰 7 源不动）。 */
export const LLM_ABNORMAL_RISK = 'llmAbnormal';

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
/**
 * V5.5-2 **TASK-V55-210** — reverse lookup through the SAME bijection row
 * (`OPS_RECOVERY_ROWS`):「修这个 op 的阻塞终态是什么」。Deriving keeps the blocked-terminal
 * literal at its two legal sites (declaration + bijection) — a consumer that needs the
 * vocabulary never writes a third literal (BT-1 红线).
 */
export function blockedTerminalOf(opId: string): string | undefined {
  return OPS_RECOVERY_ROWS.find((r) => r.op === opId)?.blocked;
}

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

/**
 * The **registry rule-group provider ids** — `NEXTSTEP_PRIORITY` 的 5 项规则中，由**注册表规则组
 * provider** 承担的那 **4** 个（`onboarding` / `ref-action` / `capability-discovery` / `ai-led`；
 * ★ NDA-1 TASK-NDA-110 追加 `ai-led`）。第 5 项 `risk-recovery` **不在本数组内** —— 它由
 * `RECOVERY_PROVIDER_IDS` + `OPS_RECOVERY_ROWS` 的恢复类 provider（`rule: 'risk-recovery'`）
 * 承担，属**插件级规则**而非注册表规则组，故 `RULE_PROVIDER_IDS.length === 4 ≠ NEXTSTEP_PRIORITY.length === 5`。
 * ★ 叶1 review R1 **I-4** 订正（注释-only，零行为 / 零输出字节变化）：原注释「the 5 rules」与
 * 数组 4 项计数口径不符。
 */
export const RULE_PROVIDER_IDS = Object.freeze(['onboarding', 'ref-action', 'capability-discovery', 'ai-led']);

/**
 * ★ IAN-1（ADR-IAN-001 §①）：末端「自由输入…」终端的 **provider id**（存在性**单源** ——
 * `recommendNextStep` 读它的 `when(ctx)`，恒真 ⇒ 零死端；与 `ADR-IAN-002` 的
 * `requestId='free-input'` 同字面但**不同面**：那里是卡内输入的语义身份）。
 */
export const FREE_INPUT_PROVIDER_ID = 'free-input';


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

/** The built-in provider rows: 5 + 2 + 1 abnormal recovery + 3 rules + 1 terminal = **13 行**。 */
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
  // ★ NDA-2 TASK-NDA-210（ADR-NDA-007 §③⑤ · FR-NDA-072~076）—— 第 13 行 provider：异常相兜底。
  // risk-recovery 档 ⇒ 压过 AI 建议；chip 复用 op.llm-config（confirm ⇒ AI 不代答）；文案分相。
  const abnormalRecovery: NextProvider[] = [
    {
      id: 'llm.abnormal',
      deps: ['snapshot'],
      priority: 0,
      mode: 'waterfall',
      fail: 'card-boundary',
      rule: 'risk-recovery',
      when: (ctx) => ctx.risk.includes(LLM_ABNORMAL_RISK),
      chips: ['op.llm-config'],
      textOf: () => ['配置新的 LLM（切换 / 重配）'],
    },
  ];
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
    // ★ NDA-1 **TASK-NDA-110**（ADR-NDA-003 §② · FR-NDA-042/114 · AC-NDA-005）—— 第 **12** 行
    // provider：AI 结构化产出的 next 候选（`next` 工具驱动）。
    //   · **独立规则位 `ai-led`**（原 `ref-action` → `ai-led`）：与 `NEXTSTEP_PRIORITY` 恰 5 的
    //     第 2 位一致 ⇒ 有引用时 AI 仍优先于 `ref-action`（行为与 F-36 的 `prepend` 等价）；
    //   · `priority: 2 → 1`（相对位次随规则表前移；仅影响 `resolveOrder` 内部排序）；
    //     `prepend:true` 保留（同 priority 内的显式优先）；
    //   · `when` **逐字不变**（**从不读 refs** = 无条件触发的可判事实）；
    //   · `chips` 是**静态下界**（`['op.turn']`；`empty-chips` 判据不删）；`chipsFor` 是**权威
    //     动态面**（在场 ⇒ 覆盖 `chips`；既有 11 行无此字段 ⇒ 逐字同前）；
    //   · 零新增 op / 动作（`ACT_TO_OP` 仍恰 6）。
    {
      id: 'ai-next',
      deps: ['session'],
      priority: 1,
      prepend: true,
      mode: 'waterfall',
      fail: 'card-boundary',
      rule: 'ai-led',
      label: '下一步推荐：AI 建议',
      when: (ctx) => (ctx.session.aiNext?.length ?? 0) > 0 && ctx.session.openAsks === 0,
      chips: [ACT_TO_OP.next],
      chipsFor: (ctx) => (ctx.session.aiNext ?? []).map((c) => c.opId),
      textOf: (ctx) => (ctx.session.aiNext ?? []).map((c) => c.label),
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
  // ★ IAN-1（ADR-IAN-001 §①）：末端「自由输入…」终端的**存在性声明**（恒真 ⇒ 零死端）。
  // `rule`（缺省 = id）不在 `NEXTSTEP_PRIORITY` ⇒ `candidateRules` 恒跳过它（不是第 5 条规则、
  // 不争两张卡的位）；终端由 `recommendNextStep` 单点注入到选中卡末端并只以集 A 动作渲染。
  const terminal: NextProvider[] = [
    {
      id: FREE_INPUT_PROVIDER_ID,
      deps: ['session'],
      priority: 0,
      mode: 'waterfall',
      fail: 'card-boundary',
      // ★ NDA-2 TASK-NDA-203（ADR-NDA-005 §①③ · FR-NDA-051~053）—— 恒真 → 分相：未配置
      // （risk 含 llmBlocked）⇒ false；已配置 ⇒ true（恒常驻）。两读同在 ⇒ DQ-3 同源。
      when: (ctx) => !ctx.risk.includes(LLM_BLOCKED_RISK) && (ctx.session.busy === true || ctx.session.busy === false),
      chips: [FREE_INPUT_PROVIDER_ID],
      textOf: () => [FREE_INPUT_LABEL],
    },
  ];
  return [...recovery, ...opRecovery, ...abnormalRecovery, ...rules, ...terminal];
}

let REGISTERED = false;
/** Register the built-ins once (idempotent; called from `recommend.ts`). */
export function registerBuiltinProviders(): void {
  if (REGISTERED) return;
  REGISTERED = true;
  for (const p of builtinProviders()) registerNextProvider(p);
  // V5.5-1 TASK-V55-107 — 驱动者**声明行**与 provider 行是**两个源**（故意保留的可见
  // 漂移面，由 `test/driver-quadruple.test.ts` 的双向包含 + 三类注入反证兜底）。
  for (const decl of Object.values(DRIVER_DECLS_SRC)) registerDriverDecl(decl);
}

/* ────────────────────────────────────────────────────────────────────────────
 * V5.5-1 **TASK-V55-107** (ADR-V55-001 §1 · FR-SELF-010/012/017/036 · AC-SELF-002/015) —
 * 驱动者声明行（**手写第二源**，与注册表 provider 集合互为双向包含判据）。
 *
 * 刻意**不**从 `builtinProviders()` 派生：那样「驱动者集合 ≡ provider 集合」会退化为
 * 恒真（同源对象不可能漂移），机核空转。这里每一行的 `evidence` 必须与该 provider 的
 * `when(ctx)` 实际读取的字段一致（门禁从 `providers.ts` 源文本的 when-scope 抽取比对）。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 13 行 = 5 触发器恢复 + 2 op 驱动恢复 + 3 规则 + IAN-1 终端 + `ai-next`（第 12）+ `llm.abnormal`（第 13）。 */
export const DRIVER_DECLS_SRC: Readonly<Record<string, DriverDecl>> = Object.freeze({
  'ref.stale': { driverId: 'ref.stale', timings: ['stale', 'idle'], moments: ['pick-complete'], driverClass: 'deterministic', priority: 0, evidence: ['ref.staleCount', 'risk'] },
  'declaration.invalid': { driverId: 'declaration.invalid', timings: ['idle', 'stale'], moments: ['bind-complete'], driverClass: 'deterministic', priority: 0, evidence: ['risk'] },
  'binding.stale': { driverId: 'binding.stale', timings: ['idle'], moments: ['bind-complete'], driverClass: 'deterministic', priority: 0, evidence: ['risk'] },
  'site.unauthorized': { driverId: 'site.unauthorized', timings: ['idle', 'pick'], moments: ['bind-complete', 'auth-receipt'], driverClass: 'deterministic', priority: 0, evidence: ['site.authorized'] },
  'probe.unsettled': { driverId: 'probe.unsettled', timings: ['idle'], moments: ['probe-steady'], driverClass: 'deterministic', priority: 0, evidence: ['probe.steady', 'probe.phase'] },
  'llm.unconfigured': { driverId: 'llm.unconfigured', timings: ['idle', 'pick'], moments: ['turn-end'], driverClass: 'deterministic', priority: 0, evidence: ['risk'] },
  'perm.missing': { driverId: 'perm.missing', timings: ['idle', 'pick'], moments: ['auth-receipt'], driverClass: 'deterministic', priority: 0, evidence: ['risk'] },
  onboarding: { driverId: 'onboarding', timings: ['firstRun', 'pick'], moments: ['pick-complete'], driverClass: 'deterministic', priority: 1, evidence: ['onboarding.firstRun', 'onboarding.pendingSteps'] },
  // 「答完之后谁接手」的**唯一**声明处：`ref-action` 的 timing 含 `'answered'`（本叶题眼）。
  'ref-action': { driverId: 'ref-action', timings: ['pick', 'stale', 'idle', 'answered'], moments: ['answered-ask', 'describe-submitted', 'pick-complete', 'turn-end'], driverClass: 'ai-driven', priority: 2, evidence: ['ref.validCount', 'session.openAsks', 'ref.latestRefNum'] },
  'capability-discovery': { driverId: 'capability-discovery', timings: ['idle'], moments: ['bind-complete', 'probe-steady', 'auth-receipt', 'turn-end'], driverClass: 'deterministic', priority: 3, evidence: ['site.authorized', 'probe.phase', 'session.busy'] },
  // ★ IAN-1：末端「自由输入…」终端。`deterministic` ⇒ **无**自动按下权（AI 不得代填手输）。
  // 手输留痕另用 `MANUAL_DRIVER_ID`（∉ 本表键集）。
  'free-input': { driverId: 'free-input', timings: ['idle'], moments: ['turn-end'], driverClass: 'deterministic', priority: 0, evidence: ['session.busy'] },
  // ★ F-36 / ADN-1 **TASK-ADN-110**（ADR-ADN-006 §① · FR-ADN-013/096）—— 第 **12** 行声明：
  // `driverId` = provider id（DQ-1 双向包含 12↔12 零额外桥接）；`timing='idle'`（复用既有第 3
  // 时机 ⇒ `DRIVER_TIMINGS` 恰 5 不动）；`evidence=['session.aiNext']` 与 `ai-next.when` 的
  // when-scope **同源**（DQ-3）；`driverClass='ai-driven'` ⇒ 具自动按下权（受 `pressDecision`
  // 档位约束：仅 `auto` 档）。旧 11 行**逐字保留**。
  'ai-next': { driverId: 'ai-next', timings: ['idle'], moments: ['turn-end'], driverClass: 'ai-driven', priority: 2, evidence: ['session.aiNext'] },
  // ★ NDA-2 TASK-NDA-210（ADR-NDA-202 §① · FR-NDA-075/130）—— 第 13 行声明：13↔13；复用既有
  // timings/moments（恰 5 / 恰 7 不动）；deterministic ⇒ 无自动按下权；evidence 与 when 同源。
  'llm.abnormal': { driverId: 'llm.abnormal', timings: ['idle'], moments: ['turn-end'], driverClass: 'deterministic', priority: 0, evidence: ['risk'] },
});
