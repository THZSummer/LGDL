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
 * The modules `recommend.ts` may import. Kept to the zero-plaintext copy factory:
 * the producer must not be able to reach a settings/count projection even by
 * accident (a future import is a gate failure, not a review finding).
 */
export const RECOMMEND_MODULE_WHITELIST = Object.freeze(['./stream-plaintext.js'] as const);

/** The five risk classes (parent ADR/V4-1 caliber) — the recovery trigger subset. */
export const RECOVERY_RISK_CLASSES = Object.freeze(['refInvalid', 'declarationInvalid', 'hardFloor'] as const);

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
  /** The one clock the caller injects (the producer never reads `Date.now()`). */
  readonly now: number;
}

/**
 * What a chip does when clicked. `'next'` = **issue a turn** through the same
 * production entry as the composer (`requestTurn`); `'repick'` = the local page-side
 * pick (`requestPick`); `'describe'` = reveal the card's free-text fallback. The two
 * local acts are NOT turn commands (ADR-V4-038 §5) — keeping them in one closed
 * vocabulary is what lets the wiring gate assert「chips 即指令」without pretending a
 * pick is a chat message.
 */
export const NEXTSTEP_ACTS = Object.freeze(['next', 'repick', 'describe'] as const);
export type NextstepAct = (typeof NEXTSTEP_ACTS)[number];

export interface NextstepChip {
  readonly text: string;
  readonly act: NextstepAct;
}

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

/** The four rule predicates, in priority order (the rule table, recomputable). */
export function candidateRules(input: RecommendInput): readonly NextstepCandidate[] {
  const out: NextstepCandidate[] = [];
  const risks = new Set(input.risks);

  // R-RISK-RECOVERY (priority 1): an unusable reference, an invalid declaration or a
  // hard-floor intervention must be recoverable from the stream itself.
  if (input.ref.staleCount >= 1 || RECOVERY_RISK_CLASSES.some((c) => risks.has(c))) {
    out.push(
      candidate('risk-recovery', [
        { text: '重新拾取', act: 'repick' },
        { text: '改用描述', act: 'describe' },
      ]),
    );
  }

  // R-REF-ACTION (priority 2): a usable reference exists and no decision card is
  // open (a recommendation must never compete with an open question).
  if (input.ref.validCount >= 1 && input.session.openAsks === 0 && input.ref.latestRefNum !== undefined) {
    out.push(
      candidate('ref-action', [
        { text: `用引用 ${input.ref.latestRefNum} 做原地翻译`, act: 'next' },
        { text: '查看引用证据（选择器 / 语义路径 / 文本摘要）', act: 'next' },
      ]),
    );
  }

  // R-ONBOARDING (priority 3): first-run only, and only while steps remain.
  if (input.onboarding.firstRun && input.onboarding.pendingSteps.length > 0) {
    out.push(
      candidate('onboarding', [
        { text: '授权当前站点', act: 'next' },
        { text: '了解 6 个页面手势', act: 'next' },
      ]),
    );
  }

  // R-CAPABILITY (priority 4): authorized ∧ probe settled ∧ idle. The count used is
  // the command catalog's STATIC face (allowed ④), never a rendered settings count.
  if (input.site.authorized && input.probe.phase === 'ready' && !input.session.busy) {
    out.push(
      candidate('capability-discovery', [
        { text: `看看这页能做什么（命令目录 ${input.catalog.toolCount} 条）`, act: 'next' },
        { text: '打开审计查看已授权记录', act: 'next' },
      ]),
    );
  }
  return Object.freeze(out);
}

/** Drop a candidate every chip of which the policy layer would deny. */
function passesSafety(c: NextstepCandidate, denied: ReadonlySet<string>): boolean {
  if (denied.size === 0) return true;
  return c.chips.some((chip) => chip.act !== 'next' || !denied.has(chip.text));
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
  const rules = candidateRules(input).filter((c) => passesSafety(c, denied));
  if (rules.length === 0) {
    const raw = candidateRules(input);
    return Object.freeze({ cards: Object.freeze([]), suppression: raw.length === 0 ? 'empty' : 'safety' });
  }
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  return Object.freeze({ cards: Object.freeze(sorted.slice(0, MAX_NEXTSTEP_CARDS_PER_ROUND)) });
}
