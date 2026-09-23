/**
 * V4-4 TASK-804 (leaf `specs-tree-v4-4-ref-system-nextstep`) — the **next-step
 * recommendation producer** (本叶 ADR-V4-037 · 父 ADR-V4-015 裁决 5 / O-CHAT-006 /
 * FR-CHAT-060~064 / AC-CHAT-013 / EC-CHAT-008).
 *
 * ── The truth-source whitelist（canonical, 7 items） ─────────────────────────
 *
 * The recommendation is the **only content type this Feature adds a producer for**.
 * It is deliberately restricted to facts the panel already owns at panel level —
 * never a settings-section render count, never a「视图有 N 项」derivation (that is the
 * exact trap the v3 F6 exemption fell into), and never a new LLM product (FR-CHAT-060:
 * zero new network / privacy / cost surface).
 *
 *   {@link NEXTSTEP_SOURCE_WHITELIST}
 *     ① `ref`       引用状态（有效 / 失效 / 最近重锚）
 *     ② `session`   会话状态（活跃 sessionId / 未答卡数 / 当前段是否为空）
 *     ③ `site`      站点授权与信任态
 *     ④ `catalog`   命令档案**静态面**（`toolCount` / `subcommandCount`）
 *     ⑤ `probe`     探测状态
 *     ⑥ `risk`      五类风险态
 *     ⑦ `onboarding` onboarding 步骤（首装态专用）
 *
 * **明确排除**：`deriveCounts().settings`（设置分区渲染计数）、任何「某视图有 N 项
 * 所以推荐它」的派生、任何需要新 LLM 调用的内容。`test/recommendation-sources.test.ts`
 * asserts the import set ⊆ {@link RECOMMEND_MODULE_WHITELIST} and that the source text
 * contains **zero** `settings` / `deriveCounts` references.
 *
 * ── Pure ─────────────────────────────────────────────────────────────────────
 *
 * No DOM, no clock (the caller injects `now`), no IO, no chrome surface. The input is
 * a plain data record, so the producer cannot reach a store the caller did not hand
 * it — the whitelist is enforced by the **shape of the input**, not only by a comment.
 *
 * @module ui/sidepanel/recommend
 */
import { label } from './stream-plaintext.js';
import type { NextCtx } from './next-registry/definition.js';
import { OP_TO_ACT } from './next-registry/dispatch.js';
import { registerBuiltinProviders } from './next-registry/providers.js';
import { resolveOrder } from './next-registry/registry.js';

// V5.5-1 TASK-V55-103 (ADR-V55-002 §1) — `RecommendTrigger` 的唯一类型定义在
// `next-registry/drivers.ts`；本模块只保留 re-export（`export type` 零字节，不产生第二声明）。
export type { RecommendTrigger } from './next-registry/drivers.js';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Rule table + limits (constants so a gate can recompute every one of them)
 * ──────────────────────────────────────────────────────────────────────────── */

/** At most one recommendation card per round (it is guidance, not a list). */
export const MAX_NEXTSTEP_CARDS_PER_ROUND = 1;

/** At most three chips on that card (⇒ single-card clickables ≤ 6 with the fallback). */
export const MAX_CHIPS_PER_CARD = 3;

/**
 * Recovery first, discovery last. The order is the rule table's tie-break: a lower
 * index is a higher priority.
 */
export const NEXTSTEP_PRIORITY = Object.freeze(['risk-recovery', 'ref-action', 'onboarding', 'capability-discovery'] as const);
export type NextstepRuleId = (typeof NEXTSTEP_PRIORITY)[number];

/** The idle-state minimum interval (anti-flicker; also enforced while `pending`). */
export const NEXTSTEP_MIN_INTERVAL_MS = 10_000;

/* ────────────────────────────────────────────────────────────────────────────
 * R6（2026-09-23）—— 「**完成后同动作去重**」的摘要口径（真机 `ty.md` 21:32:26 复推缺陷）。
 *
 * 缺陷：一次「原地翻译」回合完成后，下一步推荐又推了同一件事（「用引用 1 做原地翻译」）。
 * 去重键 = `refId + 意图摘要`。意图摘要把**同一意图的两种表述**归一到一句话：
 *   · 推荐 chip：「用引用 1 做原地翻译」  →  去掉引用模板前缀 → `原地翻译`
 *   · 用户/AI 动作：「原地翻译为中文」    →  去掉语言后缀     → `原地翻译`
 * 两侧由**同一函数**产出（见 `intentDigest`），因此「同 digest ⟺ 同意图」是可判事实，
 * 而不是两处各自近似。
 * ──────────────────────────────────────────────────────────────────────────── */

/** 推荐 chip 的引用模板前缀（`用引用 <n> 做…`）—— 摘要时剥掉，只留「意图」。**单源**。 */
const REF_ACTION_TEXT = /^用引用\s*(\d+)\s*做/;
/** 语言修饰后缀（`…为中文` / `…成中文` / `…至中文`）—— 同一意图的不同表述。 */
const LANG_SUFFIX = /[为成至]中文$/;

/**
 * R6 —— **意图摘要**（单源）。归一化 = 去空白 + 去引用模板前缀 + 去语言后缀。
 *
 * 两处（推荐 chip 文本 / 已执行动作原话）都经本函数 ⇒ 「同 digest」两侧可对拍。
 */
export function intentDigest(text: string): string {
  return (text ?? '').replace(/\s+/g, '').replace(REF_ACTION_TEXT, '').replace(LANG_SUFFIX, '');
}

/** R6 —— 去重键 = `refId#意图摘要`（`refId` 形如 `ref_3` / `ref_${latestRefNum}`）。 */
export function refActionDigest(refId: string, text: string): string {
  return `${refId}#${intentDigest(text)}`;
}

/** R6 —— 引用动作的**文本模板**（`用引用 <n> 做…`）→ 去重键；非该模板 ⇒ `undefined`。 */
export function refActionTextKey(text: string): string | undefined {
  const m = REF_ACTION_TEXT.exec((text ?? '').trim());
  return m ? refActionDigest(`ref_${m[1]}`, text) : undefined;
}

/** The chips copy the ref-action provider proposes (matching {@link REF_ACTION_TEMPLATE}). */
function isRefActionRule(rule: string): boolean {
  return rule === 'ref-action';
}

/**
 * R6 —— 该候选是否是「刚被完成的同 digest 动作」。判据 = 其 chip 文本经**同一**
 * `refActionDigest` 后的键 ∈ 已完成集（`input.completedActions`）。
 */
export function completedActionKey(
  rule: string,
  chips: readonly NextstepChip[],
  latestRefNum: number | undefined,
): string | undefined {
  if (!isRefActionRule(rule) || latestRefNum === undefined) return undefined;
  return refActionDigest(`ref_${latestRefNum}`, chips[0]?.text ?? '');
}

/** The 7 allowed truth sources (asserted verbatim by the source gate). */
export const NEXTSTEP_SOURCE_WHITELIST = Object.freeze([
  'ref',
  'session',
  'site',
  'catalog',
  'probe',
  'risk',
  'onboarding',
] as const);

/**
 * The modules `recommend.ts` may import. V5-1 (TASK-V5-105 / ADR-V5-001): the rule
 * table moved into the `next-registry` built-in providers, so those modules join —
 * **the exclusion invariant is unchanged**: none of them can reach a settings/count
 * projection (the gate still scans for `settings` / `deriveCounts`), and
 * `NEXTSTEP_SOURCE_WHITELIST` stays at the same 7 truth sources.
 */
export const RECOMMEND_MODULE_WHITELIST = Object.freeze([
  './stream-plaintext.js',
  './next-registry/definition.js',
  './next-registry/dispatch.js',
  './next-registry/providers.js',
  './next-registry/registry.js',
] as const);

/**
 * The **risk classes** that used to be the whole recovery trigger set (parent ADR/V4-1
 * caliber). Unchanged — it is the risk-rail subset, not the recovery rule table.
 */
export const RECOVERY_RISK_CLASSES = Object.freeze(['refInvalid', 'declarationInvalid', 'hardFloor'] as const);

/**
 * V4.5-1 W3 (TASK-V45-112 / ADR-V45-007 §1) — the **recovery trigger set**.
 *
 * Retiring the five strips removed the visible「无活跃站点 / 探测未就绪」guidance, so a
 * site/probe fact must now be recoverable from the recommendation card itself:
 *
 *   · `refInvalid` / `declarationInvalid` / `hardFloor` — the v4 risk classes;
 *   · `site`  — `input.site.authorized === false`（无活跃站点 / 绑定失效）;
 *   · `probe` — **可行动的未就绪**：已报出相位且 `steady === false` 且相位 ∉ {`ready`,
 *     `probing`}（如 `waiting` 退避等待 / `idle` 未开跑）。相位**未知**不算异常 ——
 *     否则每个未探测过的首屏都会退化到恢复卡，把同一条 ADR 要求的 ref-action /
 *     capability-discovery 永久挤掉（登记为 build 偏差；数据源仍只用 `probe` 一项）。
 *
 * The **data sources are not extended**: `site` / `probe` are already two of the seven
 * {@link NEXTSTEP_SOURCE_WHITELIST} entries and the input shape is unchanged.
 */
export const RECOVERY_TRIGGERS = Object.freeze([
  'refInvalid',
  'declarationInvalid',
  'hardFloor',
  'site',
  'probe',
] as const);
export type RecoveryTrigger = (typeof RECOVERY_TRIGGERS)[number];

/**
 * Which recovery trigger is active right now — the FIRST match in
 * {@link RECOVERY_TRIGGERS} order (a stable, recomputable tie-break: the risk classes
 * outrank the site/probe state). `null` ⇒ no recovery candidate.
 */
export function activeRecoveryTrigger(input: RecommendInput): RecoveryTrigger | null {
  const risks = new Set(input.risks);
  for (const trigger of RECOVERY_TRIGGERS) {
    if (trigger === 'site') {
      if (input.site.authorized === false) return trigger;
      continue;
    }
    if (trigger === 'probe') {
      // 「探测态异常」= 已报出相位，且该相位是**可行动的未就绪**（如 `waiting` 退避等待 /
      // `idle` 未开跑）。**相位未知不是异常** —— 否则每个未探测过的首屏都会退化到恢复卡，
      // 把同一条 ADR 要求的 ref-action / capability-discovery 永久挤掉（`phase === undefined`
      // 时上面两条 `steady=false` 默认值同样不构成异常，故这里显式要求相位存在）。
      const phase = input.probe.phase;
      if (input.probe.steady === false && phase !== undefined && phase !== 'ready' && phase !== 'probing') {
        return trigger;
      }
      continue;
    }
    if (input.ref.staleCount >= 1 && trigger === 'refInvalid') return trigger;
    if (risks.has(trigger)) return trigger;
  }
  return null;
}

/** The chips of one recovery trigger: the rule table's acts, named, ≤ MAX_CHIPS_PER_CARD. */
export function recoveryChips(trigger: RecoveryTrigger): readonly NextstepChip[] {
  return RECOVERY_CHIP_ORDER[trigger]
    .slice(0, MAX_CHIPS_PER_CARD)
    .map((act) => Object.freeze({ text: RECOVERY_CHIP_TEXT[act] ?? act, act }));
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Input / output shapes
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RecommendInput {
  /** ① 引用状态 — from `l1/ref-store.ts` (`stale()` / `all()`). */
  readonly ref: { readonly validCount: number; readonly staleCount: number; readonly latestRefNum?: number };
  /** ② 会话状态 — `pending` (busy) + the open ask count. */
  readonly session: { readonly openAsks: number; readonly busy: boolean };
  /** ③ 站点授权与信任态. */
  readonly site: { readonly authorized: boolean; readonly trust?: 'trusted' | 'untrusted' };
  /** ④ 命令档案静态面 — the runtime parity constant, never a rendered count. */
  readonly catalog: { readonly toolCount: number; readonly subcommandCount: number };
  /** ⑤ 探测状态. */
  readonly probe: { readonly phase?: string; readonly steady: boolean };
  /** ⑥ 五类风险态（class ids）. */
  readonly risks: readonly string[];
  /** ⑦ onboarding 步骤（首装态专用）. */
  readonly onboarding: { readonly firstRun: boolean; readonly pendingSteps: readonly string[] };
  /**
   * 安全边界：the commands the policy layer denies. A chip whose command is deniable
   * is **dropped** (uncertainty ⇒ no recommendation, fail-closed).
   */
  readonly deniedCommands?: readonly string[];
  /** When the previous card was produced (the idle interval is measured against it). */
  readonly lastProducedAt?: number;
  /**
   * R6（2026-09-23）—— **刚被完成的同 digest 动作**去重集（键 = `refId#意图摘要`）。
   *
   * 一次任务完成后，下一步推荐不得再推同一件事。本集由面板在「回合完成」时登记
   * （`refActionDigest(...)` 产出同一键），生产器据此**压掉**同 digest 的 `ref-action`
   * 候选；其他规则（如 `capability-discovery`）照旧可达 ⇒ 不是死端。
   */
  readonly completedActions?: readonly string[];
  /** The one clock the caller injects (the producer never reads `Date.now()`). */
  readonly now: number;
}

/**
 * What a chip does when clicked. `'next'` = **issue a turn** through the same
 * production entry as the composer (`requestTurn`); `'repick'` = the local page-side
 * pick (`requestPick`); `'describe'` = reveal the card's free-text fallback;
 * `'authorize'` = the local browser-permission flow (`authorizeCurrentSite`).
 *
 * The three local acts are NOT turn commands (ADR-V4-038 §5) — keeping them in one
 * closed vocabulary is what lets the wiring gate assert「chips 即指令」without
 * pretending a pick / an authorization is a chat message.
 *
 * F 还原度快修轮 (2026-09-20): `'authorize'` was added because the onboarding rule's
 * 「授权当前站点」chip used to be `'next'`, i.e. the string was sent to the LLM as a
 * chat message while authorization is really a browser-permission flow. The chip now
 * reaches the ONE panel-side authorize entry (the same one `#authorize` calls).
 *
 * V4.5-1 W3 (TASK-V45-112 / ADR-V45-007 §3): the closed set reaches its **terminal six**
 * — `'rebind'` (the settings-view `#rebind` entry: re-binding the current tab is a
 * browser flow, not a turn) and `'help'` (open the settings「帮助」section: the retired
 * onboarding guidance) join. Every local act has ONE production entry and NEVER calls
 * `requestTurn` (asserted by `test/local-act-wiring.test.ts`).
 */
export const NEXTSTEP_ACTS = Object.freeze(['next', 'repick', 'describe', 'authorize', 'rebind', 'help'] as const);
export type NextstepAct = (typeof NEXTSTEP_ACTS)[number];

/**
 * V5-2 review R1 **BLOCK-03** — an **op-direct** act: the chip's `act` IS the opId.
 *
 * Seven of the nine first-batch ops are turn commands or one of the six local acts, so the
 * act table (`ACT_TO_OP`) maps them. The remaining two (`op.llm-config` /
 * `op.perm.request`) repair a **blocked terminal** directly: their chip carries the opId as
 * its act and `dispatchChipAction` resolves it through `OPS_BY_ID` (the same single lookup,
 * zero per-op branch) — never a second act table, and never a turn.
 */
export type OpDirectAct = `op.${string}`;
export type ChipAct = NextstepAct | OpDirectAct;

export interface NextstepChip {
  readonly text: string;
  readonly act: ChipAct;
}

/**
 * The **chip rule table** (FR-V45-031 定值) — trigger → candidate acts, in priority
 * order. The renderer keeps at most `MAX_CHIPS_PER_CARD`, so the table's *first* item is
 * the guarantee: `site` / `probe` therefore always lead with「重新绑定当前标签页」
 * (`rebind`), while an invalid reference leads with `repick`.
 */
export const RECOVERY_CHIP_ORDER: Readonly<Record<RecoveryTrigger, readonly NextstepAct[]>> = Object.freeze({
  refInvalid: Object.freeze(['repick', 'describe', 'rebind'] as NextstepAct[]),
  declarationInvalid: Object.freeze(['repick', 'describe', 'rebind'] as NextstepAct[]),
  hardFloor: Object.freeze(['repick', 'describe', 'rebind'] as NextstepAct[]),
  // V5-2 TASK-V5-133 / N-04 (FR-ALLN-013): the **second** slot of the `site` trigger is
  // now `authorize` — a non-first-run unauthorized session (the real-device dead-end
  // this leaf repairs) must be offered the one-click `op.authorize` chip. The FIRST slot
  // stays `rebind`: the renderer keeps at most `MAX_CHIPS_PER_CARD` and the leading chip
  // is the guaranteed one (`test/ui/recommendation.mjs` ⑭ drives exactly that lead chip).
  site: Object.freeze(['rebind', 'authorize', 'repick', 'describe'] as NextstepAct[]),
  probe: Object.freeze(['rebind', 'describe', 'repick'] as NextstepAct[]),
});

/** The single chip copy per act (the rule table chooses the act; this names it). */
export const RECOVERY_CHIP_TEXT: Readonly<Record<string, string>> = Object.freeze({
  next: '继续',
  repick: '重新拾取',
  describe: '改用描述',
  authorize: '授权当前站点',
  rebind: '重新绑定当前标签页',
  help: '了解 6 个页面手势',
});


export interface NextstepCandidate {
  readonly rule: NextstepRuleId;
  /** 1 = highest (index in {@link NEXTSTEP_PRIORITY} + 1). */
  readonly priority: number;
  readonly chips: readonly NextstepChip[];
  /** The digest-safe label persisted with the card (never a body). */
  readonly label: string;
}

/** Why nothing was produced (`undefined` when a card was produced). */
export type RecommendSuppression = 'pending' | 'interval' | 'empty' | 'safety';

export interface RecommendResult {
  /** 0 or 1 card ({@link MAX_NEXTSTEP_CARDS_PER_ROUND}). Empty ⇒ render nothing. */
  readonly cards: readonly NextstepCandidate[];
  readonly suppression?: RecommendSuppression;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. The producer
 * ──────────────────────────────────────────────────────────────────────────── */

/** The user-facing label of each rule (the id is machine-readable, never persisted). */
const NEXTSTEP_LABELS: Readonly<Record<NextstepRuleId, string>> = Object.freeze({
  'risk-recovery': '下一步推荐：先处理风险',
  'ref-action': '下一步推荐：用这条引用',
  onboarding: '下一步推荐：完成首次设置',
  'capability-discovery': '下一步推荐：看看能做什么',
});

function priorityOf(rule: NextstepRuleId): number {
  return NEXTSTEP_PRIORITY.indexOf(rule) + 1;
}

function candidate(rule: NextstepRuleId, chips: readonly NextstepChip[]): NextstepCandidate {
  const kept = Object.freeze(
    chips.slice(0, MAX_CHIPS_PER_CARD).map((c) => Object.freeze({ text: label([c.text]), act: c.act })),
  );
  // ⚠️ The rule id itself must NOT go through `label`: `risk-recovery` contains the
  // `sk-` + 8-char shape the secret scanner flags (`sk-recovery`), and the label is a
  // user-facing string anyway. The machine-readable id stays in `rule` (never persisted).
  return Object.freeze({ rule, priority: priorityOf(rule), chips: kept, label: label([NEXTSTEP_LABELS[rule]]) });
}

/**
 * The 7-source pure context the registered providers read (V5-1, ADR-V5-001).
 *
 * V5-2 (FR-ALLN-047): exported so `op.help` derives its reachable-op list from the SAME
 * context the recommendation producer uses — one derivation, no second truth.
 */
export function recommendCtx(input: RecommendInput): NextCtx {
  return {
    ref: input.ref,
    session: input.session,
    site: input.site,
    catalog: input.catalog,
    probe: input.probe,
    risk: input.risks,
    onboarding: input.onboarding,
  };
}

/**
 * The four rule predicates, in priority order. V5-1 (TASK-V5-105 / ADR-V5-001):
 * the predicates / priorities / chip order now live in the **registry** (built-in
 * providers); this function is the equivalent re-anchor of the old hand-written
 * table — the output shape and ordering are byte-for-byte the previous ones.
 */
export function candidateRules(input: RecommendInput): readonly NextstepCandidate[] {
  registerBuiltinProviders();
  const ctx = recommendCtx(input);
  const out: NextstepCandidate[] = [];
  const seen = new Set<string>();
  for (const p of resolveOrder()) {
    const rule = p.rule ?? p.id;
    if (seen.has(rule) || !(NEXTSTEP_PRIORITY as readonly string[]).includes(rule)) continue;
    if (!p.when(ctx)) continue;
    seen.add(rule);
    const texts = p.textOf ? p.textOf(ctx) : p.chips;
    const chips: NextstepChip[] = p.chips.map((opId, i) => ({
      text: texts[i] ?? opId,
      // review R1 BLOCK-03: an op **outside** the 6-act table is op-direct — the act IS the
      // opId (resolved by `dispatchChipAction` via `OPS_BY_ID`). Mapping it to `'next'`
      // would dispatch `op.turn` instead (a wrong-op clip) — the exact lie this fixes.
      act: (OP_TO_ACT[opId] ?? opId) as ChipAct,
    }));
    out.push(candidate(rule as NextstepRuleId, chips));
  }
  return Object.freeze(out.sort((a, b) => a.priority - b.priority));
}

/**
 * Drop a candidate that carries **any** denied `next` chip.
 *
 * FR-CHAT-064 / C3 (v4-4 review): the old predicate used `some`, i.e. a candidate
 * survived as long as ONE chip was allowed — the denied chip still shipped and
 * rendered, which is exactly the「推荐被拦动作」the requirement forbids. The
 * judgement is now **per candidate, fail-closed**: one deniable turn-command
 * invalidates the whole card (a partial card would still guide the user into the
 * denied command). Local acts (`repick` / `describe`) are not turn commands and are
 * never in the deny set by construction.
 */
function passesSafety(c: NextstepCandidate, denied: ReadonlySet<string>): boolean {
  return c.chips.every((chip) => chip.act !== 'next' || !denied.has(chip.text));
}

/**
 * Produce the recommendation.
 *
 * Order of the gates (each one is a hard stop, never a fallback to a weaker card):
 *   ① `pending` ⇒ produce nothing (FR-CHAT-063: 不生成新卡);
 *   ② idle interval not elapsed ⇒ nothing (anti-flicker);
 *   ③ no candidate survives the rules ⇒ nothing (EC-CHAT-008: 无候选不渲染);
 *   ④ every candidate is safety-filtered ⇒ nothing (fail-closed).
 */
export function recommendNextStep(input: RecommendInput): RecommendResult {
  if (input.session.busy) return Object.freeze({ cards: Object.freeze([]), suppression: 'pending' });
  if (
    input.lastProducedAt !== undefined &&
    input.now - input.lastProducedAt < NEXTSTEP_MIN_INTERVAL_MS
  ) {
    return Object.freeze({ cards: Object.freeze([]), suppression: 'interval' });
  }
  const denied = new Set(input.deniedCommands ?? []);
  const completed = new Set(input.completedActions ?? []);
  const rules = candidateRules(input)
    .filter((c) => passesSafety(c, denied))
    // ★ R6：完成后不得再推「刚被完成的同 digest 动作」（refId + 意图摘要）。
    .filter((c) => {
      const key = completedActionKey(c.rule, c.chips, input.ref.latestRefNum);
      return key === undefined || !completed.has(key);
    });
  if (rules.length === 0) {
    const raw = candidateRules(input);
    return Object.freeze({ cards: Object.freeze([]), suppression: raw.length === 0 ? 'empty' : 'safety' });
  }
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  return Object.freeze({ cards: Object.freeze(sorted.slice(0, MAX_NEXTSTEP_CARDS_PER_ROUND)) });
}
